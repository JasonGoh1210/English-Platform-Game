<?php
declare(strict_types=1);

// Caller owns the transaction. All balances and ledgers change atomically.
function epq_apply_reward(mysqli $db, int $playerId, int $xp, int $coins, int $power, string $skillCode, string $source, string $description, ?int $sourceId = null): array {
    $xpSource = $coinSource = $powerSource = $source;
    $lock = $db->prepare(
        "SELECT level_no, xp_total, coins_total, skill_points_total
         FROM players WHERE player_id = ? FOR UPDATE"
    );
    $lock->bind_param('i', $playerId);
    $lock->execute();
    $before = $lock->get_result()->fetch_assoc();
    if (!$before) throw new RuntimeException('Player not found.');

    $oldXp = (int)$before['xp_total'];
    $oldCoins = (int)$before['coins_total'];
    $oldLevel = (int)$before['level_no'];
    $newXp = $oldXp + $xp;
    $newCoins = $oldCoins + $coins;
    if ($newCoins < 0) {
        throw new DomainException('Not enough Coins.');
    }

    $levelStmt = $db->prepare(
        "SELECT level_no FROM levels
         WHERE required_xp_total <= ?
         ORDER BY required_xp_total DESC LIMIT 1"
    );
    $levelStmt->bind_param('i', $newXp);
    $levelStmt->execute();
    $levelRow = $levelStmt->get_result()->fetch_assoc();
    $newLevel = $levelRow ? (int)$levelRow['level_no'] : $oldLevel;

    $spGain = 0;
    if ($newLevel > $oldLevel) {
        $spStmt = $db->prepare(
            "SELECT COALESCE(SUM(skill_points_on_level_up),0) AS gained
             FROM levels WHERE level_no > ? AND level_no <= ?"
        );
        $spStmt->bind_param('ii', $oldLevel, $newLevel);
        $spStmt->execute();
        $spGain = (int)$spStmt->get_result()->fetch_assoc()['gained'];
    }

    $newSp = (int)$before['skill_points_total'] + $spGain;
    $update = $db->prepare(
        "UPDATE players
         SET xp_total = ?, coins_total = ?, skill_points_total = ?, level_no = ?
         WHERE player_id = ?"
    );
    $update->bind_param('iiiii', $newXp, $newCoins, $newSp, $newLevel, $playerId);
    $update->execute();

    if ($xp > 0) {
        $stmt = $db->prepare(
            "INSERT INTO player_xp_transactions
             (player_id, amount, source_type, source_id, description)
             VALUES (?, ?, ?, ?, ?)"
        );
        $stmt->bind_param('iisis', $playerId, $xp, $xpSource, $sourceId, $description);
        $stmt->execute();
    }

    if ($coins !== 0) {
        $stmt = $db->prepare(
            "INSERT INTO player_coin_transactions
             (player_id, amount, source_type, source_id, description)
             VALUES (?, ?, ?, ?, ?)"
        );
        $stmt->bind_param('iisis', $playerId, $coins, $coinSource, $sourceId, $description);
        $stmt->execute();
    }

    if ($spGain > 0) {
        $stmt = $db->prepare(
            "INSERT INTO player_skill_point_transactions
             (player_id, amount, source_type, source_id, description)
             VALUES (?, ?, 'LEVEL_UP', ?, ?)"
        );
        $stmt->bind_param('iiis', $playerId, $spGain, $newLevel, $description);
        $stmt->execute();
    }

    if ($power > 0) {
        $stmt = $db->prepare(
            "SELECT english_skill_id FROM english_skills
             WHERE skill_code = ? LIMIT 1"
        );
        $stmt->bind_param('s', $skillCode);
        $stmt->execute();
        $skill = $stmt->get_result()->fetch_assoc();
        if (!$skill) throw new RuntimeException('Unknown English skill: ' . $skillCode);

        $skillId = (int)$skill['english_skill_id'];

        $stmt = $db->prepare(
            "INSERT INTO player_english_stats
             (player_id, english_skill_id, current_power)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE current_power = current_power + VALUES(current_power)"
        );
        $stmt->bind_param('iii', $playerId, $skillId, $power);
        $stmt->execute();

        $stmt = $db->prepare(
            "INSERT INTO player_english_power_transactions
             (player_id, english_skill_id, amount, source_type, source_id, description)
             VALUES (?, ?, ?, ?, ?, ?)"
        );
        $stmt->bind_param('iiisis', $playerId, $skillId, $power, $powerSource, $sourceId, $description);
        $stmt->execute();
    }


    return ['level'=>$newLevel, 'xp'=>$newXp, 'coins'=>$newCoins, 'skillPoints'=>$newSp,
        'levelUp'=>$newLevel > $oldLevel, 'skillPointsGained'=>$spGain];
}

function epq_reward_balance(mysqli $db, int $playerId): array {
    $stmt = $db->prepare('SELECT level_no, xp_total, coins_total, skill_points_total FROM players WHERE player_id = ?');
    $stmt->bind_param('i', $playerId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $power = $db->prepare('SELECT COALESCE(SUM(current_power),0) AS power FROM player_english_stats WHERE player_id = ?');
    $power->bind_param('i', $playerId);
    $power->execute();
    return ['level'=>(int)$row['level_no'], 'xp'=>(int)$row['xp_total'], 'coins'=>(int)$row['coins_total'], 'skillPoints'=>(int)$row['skill_points_total'], 'englishPowerTotal'=>(int)$power->get_result()->fetch_assoc()['power']];
}
