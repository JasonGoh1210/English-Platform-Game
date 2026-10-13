<?php
declare(strict_types=1);

function epq_character_catalog(): array {
    return [
        'shadow'=>['label'=>'暗影旅人', 'description'=>'沉静的深色斗篷', 'accent'=>'#98a2ca', 'palette'=>null],
        'forest'=>['label'=>'森林旅人', 'description'=>'森林绿的冒险装束', 'accent'=>'#8dbd95', 'palette'=>[42, 102, 71]],
        'arcane'=>['label'=>'奥术旅人', 'description'=>'紫色的星光装束', 'accent'=>'#c2a0ed', 'palette'=>[111, 64, 156]]
    ];
}

function epq_character_names(): array {
    return [
        'male'=>['Arin Vale','Rowan Ash','Finn River','Leo Flint','Kai Winter','艾登','星野','晨风','林舟','诺亚'],
        'female'=>['Luna Reed','Mira Dawn','Iris Vale','Aria Sky','Elara Moss','露娜','星澜','晴川','月棠','艾拉']
    ];
}

function epq_valid_character_name(string $name): bool {
    return preg_match("/^[\p{L}\p{N} _.'-]{2,24}$/uD", $name) === 1;
}

function epq_character_table_ready(mysqli $db): bool {
    $result = $db->query("SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE()
        AND table_name = 'player_character_profiles' LIMIT 1");
    return $result && $result->num_rows === 1;
}

function epq_character_profile(mysqli $db, int $playerId): array {
    $legacy = ['appearance'=>'shadow', 'gender'=>null, 'complete'=>true, 'palette'=>null];
    // An additive rollout never forces old accounts to create a new character.
    if (!epq_character_table_ready($db)) return $legacy;
    $stmt = $db->prepare('SELECT appearance, gender, setup_completed FROM player_character_profiles WHERE player_id = ?');
    $stmt->bind_param('i', $playerId);
    if (!$stmt->execute()) throw new RuntimeException('Character profile is unavailable.');
    $row = $stmt->get_result()->fetch_assoc();
    if (!$row) return $legacy;
    $appearance = isset(epq_character_catalog()[$row['appearance']]) ? $row['appearance'] : 'shadow';
    return ['appearance'=>$appearance, 'gender'=>$row['gender'], 'complete'=>(int)$row['setup_completed'] === 1,
        'palette'=>epq_character_catalog()[$appearance]['palette']];
}

function epq_sync_character_session(): void {
    $profile = epq_character_profile(epq_db(), (int)$_SESSION['player_id']);
    $_SESSION['character_setup_pending'] = !$profile['complete'];
    $_SESSION['character'] = $profile;
}

function epq_new_player(mysqli $db, int $userId): int {
    if (!epq_character_table_ready($db)) throw new RuntimeException('Apply migration 006 before creating new characters.');
    $worldResult = $db->query('SELECT world_id FROM worlds WHERE is_active = 1 ORDER BY world_order LIMIT 1');
    $world = $worldResult ? $worldResult->fetch_assoc() : null;
    if (!$world) throw new RuntimeException('No active starting world.');
    $worldId = (int)$world['world_id'];
    $placeholder = 'Adventurer';
    $player = $db->prepare('INSERT INTO players
        (user_id, display_name, level_no, xp_total, coins_total, skill_points_total, current_world_id, story_intro_seen)
        VALUES (?, ?, 1, 0, 0, 0, ?, 0)');
    $player->bind_param('isi', $userId, $placeholder, $worldId);
    if (!$player->execute()) throw new RuntimeException('Unable to initialize player.');
    $playerId = (int)$db->insert_id;
    $progress = $db->prepare("INSERT INTO player_world_progress (player_id, world_id, status, unlocked_at)
        VALUES (?, ?, 'UNLOCKED', CURRENT_TIMESTAMP)");
    $progress->bind_param('ii', $playerId, $worldId);
    if (!$progress->execute()) throw new RuntimeException('Unable to initialize world progress.');
    $skills = $db->prepare('INSERT INTO player_english_stats (player_id, english_skill_id)
        SELECT ?, english_skill_id FROM english_skills WHERE is_active = 1');
    $skills->bind_param('i', $playerId);
    if (!$skills->execute()) throw new RuntimeException('Unable to initialize English skills.');
    $character = $db->prepare('INSERT INTO player_character_profiles (player_id) VALUES (?)');
    $character->bind_param('i', $playerId);
    if (!$character->execute()) throw new RuntimeException('Unable to initialize character setup.');
    return $playerId;
}

function epq_complete_character(mysqli $db, int $userId, int $playerId, string $name, string $appearance, string $gender): array {
    if (!epq_valid_character_name($name) || !isset(epq_character_catalog()[$appearance]) || !in_array($gender,['male','female'],true)) {
        throw new DomainException('请选择角色和男女，名字需要 2–24 个文字或数字。');
    }
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    $db->begin_transaction();
    try {
        $lock = $db->prepare('SELECT p.display_name, c.setup_completed, c.appearance, c.gender
            FROM players p INNER JOIN player_character_profiles c ON c.player_id = p.player_id
            WHERE p.player_id = ? AND p.user_id = ? FOR UPDATE');
        $lock->bind_param('ii', $playerId, $userId);
        $lock->execute();
        $row = $lock->get_result()->fetch_assoc();
        if (!$row) throw new DomainException('当前角色无法重新创建。');
        if ((int)$row['setup_completed'] !== 1) {
            $rename = $db->prepare('UPDATE players SET display_name = ? WHERE player_id = ? AND user_id = ?');
            $rename->bind_param('sii', $name, $playerId, $userId);
            $rename->execute();
            $profile = $db->prepare('UPDATE player_character_profiles SET appearance = ?, gender = ?, setup_completed = 1 WHERE player_id = ?');
            $profile->bind_param('ssi', $appearance, $gender, $playerId);
            $profile->execute();
        } else {
            // Replays cannot rename a completed character or overwrite its choices.
            $name = (string)$row['display_name'];
            $appearance = (string)$row['appearance'];
            $gender = (string)$row['gender'];
        }
        $db->commit();
        return ['name'=>$name, 'appearance'=>$appearance, 'gender'=>$gender, 'complete'=>true,
            'palette'=>epq_character_catalog()[$appearance]['palette']];
    } catch (Throwable $e) { $db->rollback(); throw $e; }
}
