<?php
declare(strict_types=1);

/**
 * Persistent anonymous accounts. Browser receives a random bearer token;
 * MySQL stores only its SHA-256 hash. The cookie lasts 30 days.
 */
const EPQ_GUEST_COOKIE = 'epq_guest_resume';
const EPQ_GUEST_LIFETIME = 2592000;

function epq_guest_cookie_options(int $expires): array {
    $secure = !empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off';
    return [
        'expires' => $expires, 'path' => '/FYP/', 'secure' => $secure,
        'httponly' => true, 'samesite' => 'Lax'
    ];
}

function epq_clear_guest_cookie(): void {
    setcookie(EPQ_GUEST_COOKIE, '', epq_guest_cookie_options(time() - 3600));
    unset($_COOKIE[EPQ_GUEST_COOKIE]);
}

function epq_guest_issue_token(mysqli $db, int $userId): void {
    $secret = bin2hex(random_bytes(32));
    $hash = hash('sha256', $secret);
    $stmt = $db->prepare(
        "INSERT INTO guest_login_tokens (token_hash, user_id, expires_at)
         VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 DAY))"
    );
    if (!$stmt) throw new RuntimeException('Guest token table is unavailable. Apply migration 003.');
    $stmt->bind_param('si', $hash, $userId);
    if (!$stmt->execute()) throw new RuntimeException('Could not issue guest recovery token.');
    setcookie(EPQ_GUEST_COOKIE, $secret, epq_guest_cookie_options(time() + EPQ_GUEST_LIFETIME));
    $_COOKIE[EPQ_GUEST_COOKIE] = $secret;
}

function epq_guest_revoke_tokens(mysqli $db, int $userId): void {
    $stmt = $db->prepare('DELETE FROM guest_login_tokens WHERE user_id = ?');
    if (!$stmt) throw new RuntimeException('Could not prepare guest token removal.');
    $stmt->bind_param('i', $userId);
    if (!$stmt->execute()) throw new RuntimeException('Could not revoke guest sessions.');
}

function epq_guest_start_session(array $row): void {
    session_regenerate_id(true);
    unset($_SESSION['google_request'],$_SESSION['google_requests'],$_SESSION['google_completed']);
    $_SESSION['guest_mode'] = true;
    $_SESSION['guest_id'] = 'db_' . (int)$row['user_id'];
    $_SESSION['user_id'] = (int)$row['user_id'];
    $_SESSION['player_id'] = (int)$row['player_id'];
    $_SESSION['username'] = (string)$row['username'];
    $_SESSION['display_name'] = (string)$row['display_name'];
    $_SESSION['show_story_intro'] = (int)$row['story_intro_seen'] !== 1;
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    epq_sync_character_session();
}

function epq_guest_try_resume(): void {
    if (!empty($_SESSION['user_id']) && !empty($_SESSION['player_id'])) return;
    $secret = (string)($_COOKIE[EPQ_GUEST_COOKIE] ?? '');
    if (!preg_match('/^[a-f0-9]{64}$/D', $secret)) {
        if ($secret !== '') epq_clear_guest_cookie();
        return;
    }
    try {
        $db = epq_db();
        $hash = hash('sha256', $secret);
        $stmt = $db->prepare(
            "SELECT u.user_id, u.username, p.player_id, p.display_name, p.story_intro_seen
             FROM guest_login_tokens t
             INNER JOIN users u ON u.user_id = t.user_id AND u.account_type = 'guest'
             INNER JOIN players p ON p.user_id = u.user_id
             WHERE t.token_hash = ? AND t.expires_at > UTC_TIMESTAMP()
             LIMIT 1"
        );
        if (!$stmt) throw new RuntimeException('Guest token lookup unavailable.');
        $stmt->bind_param('s', $hash);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        if ($row) {
            epq_guest_start_session($row);
        } else {
            epq_clear_guest_cookie();
        }
    } catch (Throwable $e) {
        error_log('[English Power Quest guest resume] ' . $e->getMessage());
        // Do not revoke the cookie on temporary database failure.
    }
}

/** Create a database user and an initialized player for each new guest. */
function epq_create_guest_player(mysqli $db): array {
    $username = 'guest_' . bin2hex(random_bytes(12));
    $db->begin_transaction();
    try {
        $userStmt = $db->prepare("INSERT INTO users (username, account_type) VALUES (?, 'guest')");
        $userStmt->bind_param('s', $username);
        if (!$userStmt->execute()) throw new RuntimeException('Could not create guest identity.');
        $userId = (int)$db->insert_id;
        $playerId = epq_new_player($db, $userId);
        $db->commit();
    } catch (Throwable $e) {
        $db->rollback();
        throw $e;
    }

    // A usable session is created only after the player transaction succeeds.
    epq_guest_issue_token($db, $userId);
    return [
        'user_id' => $userId, 'player_id' => $playerId, 'username' => $username,
        'display_name' => 'Adventurer', 'story_intro_seen' => 0
    ];
}
