<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../includes/tutorial.php';
require_once __DIR__.'/../includes/quests.php';

function epq_map_number(mixed $value, float $min, float $max, float $fallback): float {
    if (!is_numeric($value)) return $fallback;
    $number = (float)$value;
    return is_finite($number) ? max($min, min($max, $number)) : $fallback;
}

function epq_safe_map_state(array $input): array {
    $realms = epq_world_layout()['widths'];
    $realm = (string)($input['currentRealmId'] ?? 'maple');
    if (!isset($realms[$realm])) $realm = 'maple';
    $positions = [];
    $rawPositions = is_array($input['realmPositions'] ?? null) ? $input['realmPositions'] : [];
    foreach ($realms as $id => $width) {
        if (!isset($rawPositions[$id]) || !is_array($rawPositions[$id])) continue;
        $row = $rawPositions[$id];
        $positionWidth = !empty($row['insideCave']) ? epq_world_layout()['interiorWidths'][$id] : $width;
        $positions[$id] = [
            'playerX' => epq_map_number($row['playerX'] ?? null, 70, $positionWidth - 90, 440),
            'insideCave' => !empty($row['insideCave']),
            'caveReturnX' => epq_map_number($row['caveReturnX'] ?? null, 0, $width, 0)
        ];
    }
    $allowedEnemies = ['slime-01','bat-01','road-guardian-01','guardian-01','hollow-treant-01','castle-warden-01'];
    foreach (epq_dungeon_specs() as $spec) $allowedEnemies=array_merge($allowedEnemies,array_column($spec['enemies'],'id'));
    $enemyIds = is_array($input['defeatedEnemyIds'] ?? null) ? $input['defeatedEnemyIds'] : [];
    $defeated = array_values(array_unique(array_filter($enemyIds, static fn($id) => is_string($id) && in_array($id, $allowedEnemies, true))));
    $activeWidth = !empty($input['insideCave']) ? epq_world_layout()['interiorWidths'][$realm] : $realms[$realm];
    // freshStart belongs only to the server-created, never-played checkpoint.
    // A normal save consumes it; clients cannot re-arm it and reset a returner.
    return [
        'storyVersion' => 1,
        'currentRealmId' => $realm,
        'realmPositions' => $positions,
        'playerX' => epq_map_number($input['playerX'] ?? null, 70, $activeWidth - 90, 440),
        'insideCave' => !empty($input['insideCave']),
        'caveReturnX' => epq_map_number($input['caveReturnX'] ?? null, 0, $realms[$realm], 0),
        'questStep' => (int)epq_map_number($input['questStep'] ?? null, 0, 5, 0),
        'defeatedEnemyIds' => $defeated,
        'tutorial' => epq_safe_tutorial_state($input['tutorial'] ?? null)
    ];
}

try {
    $db = epq_db();
    $playerId = epq_current_player_id($db);
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $db->prepare('SELECT save_json, updated_at FROM player_game_saves WHERE player_id = ?');
        $stmt->bind_param('i', $playerId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $state=$row?json_decode((string)$row['save_json'],true):null;
        if ($state) $state['questStep']=epq_story_step($db,$playerId);
        epq_json([
            'ok' => true,
            'state' => $state,
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
    if (!is_string($body['csrfToken'] ?? null) || !epq_csrf_is_valid($body['csrfToken'])) {
        epq_json(['ok' => false, 'error' => 'Invalid request token.'], 403);
    }
    if (!is_array($body['state'] ?? null)) {
        epq_json(['ok' => false, 'error' => 'State object required.'], 400);
    }
    $state = epq_safe_map_state($body['state']);
    $realmOrders = ['maple' => 1, 'forest' => 2, 'camp' => 3, 'ruins' => 4];
    $worldOrder = $realmOrders[$state['currentRealmId']];
    $lookup = $db->prepare('SELECT world_id FROM worlds WHERE world_order = ? AND is_active = 1 LIMIT 1');
    $lookup->bind_param('i', $worldOrder);
    $lookup->execute();
    $worldRow = $lookup->get_result()->fetch_assoc();
    if (!$worldRow) throw new RuntimeException('Realm is missing from the worlds table. Apply migration 004.');
    $worldId = (int)$worldRow['world_id'];

    $db->begin_transaction();
    $playerLock=$db->prepare('SELECT player_id FROM players WHERE player_id=? FOR UPDATE');
    $playerLock->bind_param('i',$playerId);$playerLock->execute();$playerLock->get_result()->free();
    $state['questStep']=epq_story_step($db,$playerId);
    if ($state['insideCave']) epq_require_dungeon_access($db,$playerId,$state['currentRealmId']);
    if (!array_key_exists('tutorial', $body['state'])) {
        // An older cached game client must not erase a newer guide checkpoint.
        $previous = $db->prepare('SELECT save_json FROM player_game_saves WHERE player_id = ? FOR UPDATE');
        $previous->bind_param('i', $playerId);
        $previous->execute();
        $previousRow = $previous->get_result()->fetch_assoc();
        $previousState = $previousRow ? json_decode((string)$previousRow['save_json'], true) : null;
        $state['tutorial'] = epq_safe_tutorial_state($previousState['tutorial'] ?? null);
    }
    $save = json_encode($state, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
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
    if ($e instanceof DomainException && $e->getMessage()==='DUNGEON_LOCKED') {
        epq_json(['ok'=>false,'errorCode'=>'DUNGEON_LOCKED','error'=>'Defeat the outdoor guardian first.'],409);
    }
    error_log('[English Power Quest game state] ' . $e->getMessage());
    $missingMigration = $e instanceof mysqli_sql_exception && $e->getCode() === 1146;
    epq_json(['ok' => false, 'errorCode' => $missingMigration ? 'MIGRATION_REQUIRED' : 'SAVE_UNAVAILABLE',
        'error' => $missingMigration ? 'Database update required. Check migrations 003 through 007.' : 'Game save is temporarily unavailable.'], 503);
}
