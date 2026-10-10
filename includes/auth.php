<?php
declare(strict_types=1);

if (session_status() !== PHP_SESSION_ACTIVE) {
    $isHttps = !empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off';
    session_set_cookie_params([
        'httponly' => true,
        'secure' => $isHttps,
        'samesite' => 'Lax'
    ]);
    session_start();
}

require_once __DIR__ . '/../config/db.php';

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

function epq_h(string $value): string {
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function epq_require_login_page(): void {
    if (empty($_SESSION['user_id']) || empty($_SESSION['player_id'])) {
        header('Location: /FYP/login.php');
        exit;
    }
}

function epq_redirect_if_logged_in(): void {
    if (!empty($_SESSION['user_id']) && !empty($_SESSION['player_id'])) {
        header('Location: /FYP/index.php');
        exit;
    }
}

function epq_csrf_is_valid(?string $token): bool {
    return is_string($token)
        && isset($_SESSION['csrf_token'])
        && hash_equals((string)$_SESSION['csrf_token'], $token);
}

function epq_authenticate_session(array $row, bool $showStory): void {
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int)$row['user_id'];
    $_SESSION['player_id'] = (int)$row['player_id'];
    $_SESSION['username'] = (string)$row['username'];
    $_SESSION['display_name'] = (string)$row['display_name'];
    $_SESSION['show_story_intro'] = $showStory;
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
