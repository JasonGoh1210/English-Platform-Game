<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../includes/battle_review.php';
header('Cache-Control: no-store');
try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') epq_json(['ok' => false, 'error' => 'GET required.'], 405);
    $battleId = $_GET['battleId'] ?? null;
    $cursor = $_GET['after'] ?? '0';
    if (!is_string($battleId) || !preg_match('/\A[a-f0-9]{32}\z/', $battleId)
        || !is_string($cursor) || !preg_match('/\A[0-9]{1,18}\z/', $cursor)) {
        epq_json(['ok' => false, 'error' => 'Invalid review request.'], 400);
    }
    $db = epq_db();
    $playerId = epq_current_player_id($db);
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    epq_json(epq_battle_review($db, $playerId, $battleId, (int)$cursor));
} catch (OutOfBoundsException $e) {
    epq_json(['ok' => false, 'error' => 'Battle not found.'], 404);
} catch (DomainException $e) {
    epq_json(['ok' => false, 'error' => 'Review is available after the battle.'], 409);
} catch (Throwable $e) {
    error_log('[EPQ battle review] ' . $e->getMessage());
    $missing = $e instanceof mysqli_sql_exception && $e->getCode() === 1146;
    epq_json(['ok' => false, 'errorCode' => $missing ? 'MIGRATION_REQUIRED' : 'REVIEW_UNAVAILABLE',
        'error' => 'Battle review is temporarily unavailable.'], 503);
}
