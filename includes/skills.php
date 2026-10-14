<?php
declare(strict_types=1);

// One playable GDD Word Power branch. Permanent unlocks use the existing,
// server-owned skill purchase ledger; no client save or schema update is needed.
function epq_word_strike_nodes(): array {
    return [1=>['cost'=>1,'requiredLevel'=>2,'bonus'=>4],
        2=>['cost'=>2,'requiredLevel'=>3,'bonus'=>8],
        3=>['cost'=>3,'requiredLevel'=>5,'bonus'=>12]];
}

function epq_word_strike_level(mysqli $db, int $playerId): int {
    $stmt = $db->prepare("SELECT description, amount FROM player_skill_point_transactions
        WHERE player_id=? AND source_type='SKILL_PURCHASE'
        AND description IN ('EPQ:word-strike:1','EPQ:word-strike:2','EPQ:word-strike:3')");
    $stmt->bind_param('i',$playerId); $stmt->execute();
    $owned = [];
    foreach ($stmt->get_result()->fetch_all(MYSQLI_ASSOC) as $row) {
        foreach (epq_word_strike_nodes() as $level=>$node) {
            if ($row['description']==='EPQ:word-strike:'.$level && (int)$row['amount']===-$node['cost']) $owned[$level]=true;
        }
    }
    $level=0;
    while (isset($owned[$level+1])) $level++;
    return $level;
}

function epq_word_strike_bonus(array $question, int $level): int {
    return strtoupper((string)($question['skill'] ?? 'VOCABULARY'))==='VOCABULARY' ? (epq_word_strike_nodes()[$level]['bonus'] ?? 0) : 0;
}

// Caller owns the transaction and locks the player first, like combat rewards.
function epq_unlock_word_strike(mysqli $db, int $playerId, int $target): bool {
    $node=epq_word_strike_nodes()[$target] ?? null;
    if (!$node) throw new InvalidArgumentException('Unknown skill level.');
    $stmt=$db->prepare('SELECT skill_points_total,level_no FROM players WHERE player_id=? FOR UPDATE');
    $stmt->bind_param('i',$playerId); $stmt->execute(); $player=$stmt->get_result()->fetch_assoc();
    if (!$player) throw new RuntimeException('Player not found.');
    $current=epq_word_strike_level($db,$playerId);
    // The target level is an idempotency key: a lost response cannot buy level 2.
    if ($current>=$target) return false;
    if ($target!==$current+1) throw new DomainException('PREVIOUS_SKILL_REQUIRED');
    if ((int)$player['level_no']<$node['requiredLevel']) throw new DomainException('CHARACTER_LEVEL_REQUIRED');
    if ((int)$player['skill_points_total']<$node['cost']) throw new DomainException('NOT_ENOUGH_SKILL_POINTS');
    $cost=$node['cost'];
    $update=$db->prepare('UPDATE players SET skill_points_total=skill_points_total-? WHERE player_id=?');
    $update->bind_param('ii',$cost,$playerId); $update->execute();
    $amount=-$cost; $description='EPQ:word-strike:'.$target;
    $ledger=$db->prepare("INSERT INTO player_skill_point_transactions
        (player_id,amount,source_type,source_id,description) VALUES (?,?,'SKILL_PURCHASE',?,?)");
    $ledger->bind_param('iiis',$playerId,$amount,$target,$description); $ledger->execute();
    return true;
}

function epq_skills_view(mysqli $db, int $playerId): array {
    $stmt=$db->prepare('SELECT level_no,skill_points_total FROM players WHERE player_id=?');
    $stmt->bind_param('i',$playerId); $stmt->execute(); $player=$stmt->get_result()->fetch_assoc();
    return ['characterLevel'=>(int)$player['level_no'],'skillPoints'=>(int)$player['skill_points_total'],
        'wordStrikeLevel'=>epq_word_strike_level($db,$playerId)];
}
