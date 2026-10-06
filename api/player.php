<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';

try {
    $db = epq_db();
    $playerId = epq_demo_player_id($db);

    $stmt = $db->prepare(
        "SELECT p.player_id, p.display_name, p.level_no, p.xp_total, p.coins_total,
                p.skill_points_total, w.world_name
         FROM players p
         LEFT JOIN worlds w ON w.world_id = p.current_world_id
         WHERE p.player_id = ?"
    );
    $stmt->bind_param('i', $playerId);
    $stmt->execute();
    $player = $stmt->get_result()->fetch_assoc();

    $statsStmt = $db->prepare(
        "SELECT es.skill_code, es.skill_name, pes.current_power,
                pes.total_attempts, pes.correct_attempts, pes.accuracy_percent
         FROM player_english_stats pes
         INNER JOIN english_skills es ON es.english_skill_id = pes.english_skill_id
         WHERE pes.player_id = ?
         ORDER BY es.sort_order"
    );
    $statsStmt->bind_param('i', $playerId);
    $statsStmt->execute();

    $stats = [];
    while ($row = $statsStmt->get_result()->fetch_assoc()) {
        $stats[$row['skill_code']] = [
            'name' => $row['skill_name'],
            'power' => (int)$row['current_power'],
            'attempts' => (int)$row['total_attempts'],
            'correct' => (int)$row['correct_attempts'],
            'accuracy' => (float)$row['accuracy_percent']
        ];
    }

    $totalPower = 0;
    foreach ($stats as $item) $totalPower += $item['power'];

    epq_json([
        'ok' => true,
        'player' => [
            'playerId' => (int)$player['player_id'],
            'displayName' => $player['display_name'],
            'level' => (int)$player['level_no'],
            'xp' => (int)$player['xp_total'],
            'coins' => (int)$player['coins_total'],
            'skillPoints' => (int)$player['skill_points_total'],
            'worldName' => $player['world_name'],
            'englishPowerTotal' => $totalPower
        ],
        'englishPower' => $stats
    ]);
} catch (Throwable $e) {
    epq_json(['ok' => false, 'error' => $e->getMessage()], 500);
}
