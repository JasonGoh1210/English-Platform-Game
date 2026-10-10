<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';

function epq_map_number(mixed $value, float $min, float $max, float $fallback): float {
    if (!is_numeric($value)) return $fallback;
    $number = (float)$value;
    return is_finite($number) ? max($min, min($max, $number)) : $fallback;
}

function epq_safe_map_state(array $input): array {
    $realms = ['maple' => 1800, 'forest' => 2100, 'camp' => 1950, 'ruins' => 2200];
    $realm = (string)($input['currentRealmId'] ?? 'maple');
    if (!isset($realms[$realm])) $realm = 'maple';
    $positions = [];
    $rawPositions = is_array($input['realmPositions'] ?? null) ? $input['realmPositions'] : [];
    foreach ($realms as $id => $width) {
        if (!isset($rawPositions[$id]) || !is_array($rawPositions[$id])) continue;
        $row = $rawPositions[$id];
        $positions[$id] = [
            'playerX' => epq_map_number($row['playerX'] ?? null, 70, $width - 90, 440),
            'insideCave' => $id === 'ruins' && !empty($row['insideCave']),
            'caveReturnX' => epq_map_number($row['caveReturnX'] ?? null, 0, $width, 0)
        ];
    }
    $allowedEnemies = ['slime-01','bat-01','road-guardian-01','guardian-01','cave-wraith-01'];
    $enemyIds = is_array($input['defeatedEnemyIds'] ?? null) ? $input['defeatedEnemyIds'] : [];
    $defeated = array_values(array_unique(array_filter($enemyIds, static fn($id) => is_string($id) && in_array($id, $allowedEnemies, true))));
    return [
        'storyVersion' => 1,
        'currentRealmId' => $realm,
        'realmPositions' => $positions,
        'playerX' => epq_map_number($input['playerX'] ?? null, 70, $realms[$realm] - 90, 440),
        'insideCave' => $realm === 'ruins' && !empty($input['insideCave']),
        'caveReturnX' => epq_map_number($input['caveReturnX'] ?? null, 0, $realms[$realm], 0),
        'questStep' => (int)epq_map_number($input['questStep'] ?? null, 0, 5, 0),
        'defeatedEnemyIds' => $defeated
    ];
}

try {
    $db = epq_db();
    $playerId = epq_current_player_id($db);
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $db->prepare('SELECT save_json, updated_at FROM player_game_saves WHERE player_id = ?');
        $stmt->bind_param('i', $playerId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        epq_json([
            'ok' => true,
            'state' => $row ? json_decode((string)$row['save_json'], true) : null,
            'savedAt' => $row['updated_at'] ?? null
        ]);
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        epq_json(['ok' => false, 'error' => 'Only GET and POST are supported.'], 405);
    }
    $raw = file_get_contents('php://input');
    if ($raw === false || strlen($raw) > 32768) {
        epq_json(['ok' => false, 'error' => 'Save payload exceeds 32 KB.'], 413);
    }
    $body = json_decode($raw, true);
    if (!is_array($body)) epq_json(['ok' => false, 'error' => 'Invalid JSON.'], 400);
    if (!epq_csrf_is_valid($body['csrfToken'] ?? null)) {
        epq_json(['ok' => false, 'error' => 'Invalid request token.'], 403);
    }
    if (!is_array($body['state'] ?? null)) {
        epq_json(['ok' => false, 'error' => 'State object required.'], 400);
    }
    $state = epq_safe_map_state($body['state']);
    $save = json_encode($state, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    $realmOrders = ['maple' => 1, 'forest' => 2, 'camp' => 3, 'ruins' => 4];
    $worldOrder = $realmOrders[$state['currentRealmId']];
    $lookup = $db->prepare('SELECT world_id FROM worlds WHERE world_order = ? AND is_active = 1 LIMIT 1');
    $lookup->bind_param('i', $worldOrder);
    $lookup->execute();
    $worldRow = $lookup->get_result()->fetch_assoc();
    if (!$worldRow) throw new RuntimeException('Realm is missing from the worlds table. Apply migration 004.');
    $worldId = (int)$worldRow['world_id'];

    $db->begin_transaction();
    $stmt = $db->prepare(
        'INSERT INTO player_game_saves (player_id, save_json) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE save_json = VALUES(save_json), updated_at = CURRENT_TIMESTAMP'
    );
    $stmt->bind_param('is', $playerId, $save);
    if (!$stmt->execute()) throw new RuntimeException('Failed to save game state.');
    $playerUpdate = $db->prepare('UPDATE players SET current_world_id = ? WHERE player_id = ?');
    $playerUpdate->bind_param('ii', $worldId, $playerId);
    if (!$playerUpdate->execute()) throw new RuntimeException('Failed to update current world.');
    $worldProgress = $db->prepare(
        "INSERT INTO player_world_progress (player_id, world_id, status, unlocked_at)
         VALUES (?, ?, 'UNLOCKED', CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE
           status = IF(status = 'COMPLETED', 'COMPLETED', 'UNLOCKED'),
           unlocked_at = COALESCE(unlocked_at, CURRENT_TIMESTAMP)"
    );
    $worldProgress->bind_param('ii', $playerId, $worldId);
    if (!$worldProgress->execute()) throw new RuntimeException('Failed to update world progress.');
    $db->commit();
    epq_json(['ok' => true, 'saved' => true]);
} catch (Throwable $e) {
    if (isset($db) && $db instanceof mysqli) $db->rollback();
    error_log('[English Power Quest game state] ' . $e->getMessage());
    epq_json(['ok' => false, 'error' => 'Game save is unavailable. Apply migrations 003 and 004.'], 500);
}
