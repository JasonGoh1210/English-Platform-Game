<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        epq_json(['ok' => false, 'error' => 'POST required.'], 405);
    }

    $body = epq_body();
    if (!epq_csrf_is_valid($body['csrfToken'] ?? null)) {
        epq_json(['ok' => false, 'error' => 'Invalid request token.'], 403);
    }

    if (empty($body['completed'])) {
        epq_json(['ok' => false, 'error' => 'Story completion is required.'], 400);
    }

    $db = epq_db();
    $playerId = epq_current_player_id($db);
    $stmt = $db->prepare("UPDATE players SET story_intro_seen = 1 WHERE player_id = ?");
    if (!$stmt) throw new RuntimeException('Unable to prepare story progress update.');
    $stmt->bind_param('i', $playerId);
    if (!$stmt->execute()) throw new RuntimeException('Unable to save story completion.');

    $_SESSION['show_story_intro'] = false;
    epq_json(['ok' => true, 'storyIntroSeen' => true]);
} catch (Throwable $e) {
    error_log('[English Power Quest story progress] ' . $e->getMessage());
    epq_json(['ok' => false, 'error' => 'Unable to save story progress. Apply database/migrations/002_auth_story_progress.sql if this is an existing database.'], 500);
}
