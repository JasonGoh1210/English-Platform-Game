<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../includes/rewards.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') epq_json(['ok' => false, 'error' => 'POST required.'], 405);

    $body = epq_body();
    if (!epq_csrf_is_valid($body['csrfToken'] ?? null)) {
        epq_json(['ok' => false, 'error' => 'Invalid request token.'], 403);
    }
    $xp = max(0, (int)($body['xpDelta'] ?? 0));
    $coins = max(-100000, min(100000, (int)($body['coinDelta'] ?? 0)));
    $power = max(0, (int)($body['englishPowerDelta'] ?? 0));
    $skillCode = strtoupper(trim((string)($body['englishSkillCode'] ?? 'VOCABULARY')));
    $sourceId = isset($body['sourceId']) ? (int)$body['sourceId'] : null;
    $description = trim((string)($body['description'] ?? 'Game progress'));

    // Only the remaining map QUEST flow accepts legacy deltas.
    $requestedSource = strtoupper(trim((string)($body['sourceType'] ?? 'QUESTION')));
    // Battle rewards/purchases must go through server grading and replay protection.
    // Map/NPC/typing QUEST claims remain a separate, documented migration step.
    if ($requestedSource !== 'QUEST') {
        epq_json(['ok' => false, 'error' => 'Use the verified battle API for combat rewards and purchases.'], 400);
    }
    if ($coins < 0) {
        epq_json(['ok' => false, 'error' => 'Quest rewards cannot deduct Coins. Use verified battle purchases.'], 400);
    }

    $db = epq_db();
    $playerId = epq_current_player_id($db);
    // Failed balance/ledger statements must roll back rather than report success.
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    $db->begin_transaction();

    $result = epq_apply_reward($db, $playerId, $xp, $coins, $power, $skillCode, $requestedSource, $description, $sourceId);

    $db->commit();

    epq_json([
        'ok' => true,
        'player' => array_intersect_key($result, array_flip(['level','xp','coins','skillPoints'])),
        'levelUp' => $result['levelUp'],
        'skillPointsGained' => $result['skillPointsGained']
    ]);
} catch (Throwable $e) {
    if (isset($db) && $db instanceof mysqli) $db->rollback();
    epq_json(['ok' => false, 'error' => $e->getMessage()], $e instanceof DomainException ? 409 : 500);
}
