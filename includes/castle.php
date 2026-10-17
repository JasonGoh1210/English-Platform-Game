<?php
declare(strict_types=1);
require_once __DIR__.'/world_layout.php';
require_once __DIR__.'/dungeons.php';

function epq_castle_progress(mysqli $db, int $playerId): array {
    $stmt=$db->prepare("SELECT enemy_code FROM verified_battles WHERE player_id=? AND enemy_code IN ('hollow-treant-01','castle-warden-01') AND JSON_UNQUOTE(JSON_EXTRACT(state_json,'$.status'))='VICTORY'");
    $stmt->bind_param('i',$playerId);$stmt->execute();
    $wins=array_column($stmt->get_result()->fetch_all(MYSQLI_ASSOC),'enemy_code');
    $stmt=$db->prepare("SELECT claim_key FROM verified_quest_claims WHERE player_id=? AND claim_key IN ('castle:gate-open','story:ending')");
    $stmt->bind_param('i',$playerId);$stmt->execute();
    $claims=array_column($stmt->get_result()->fetch_all(MYSQLI_ASSOC),'claim_key');
    // Existing completed finales remain replayable when the gate is introduced.
    $open=in_array('castle:gate-open',$claims,true)||in_array('story:ending',$claims,true);
    return ['treeCleared'=>in_array('hollow-treant-01',$wins,true),'wardenDefeated'=>in_array('castle-warden-01',$wins,true),
        'hasKey'=>in_array('castle-warden-01',$wins,true)&&!$open,'gateOpen'=>$open];
}

function epq_require_castle_encounter(mysqli $db, int $playerId, string $enemy): void {
    epq_require_dungeon_access($db,$playerId,'ruins');
    if($enemy==='castle-warden-01'&&!epq_castle_progress($db,$playerId)['treeCleared']) throw new DomainException('CASTLE_TREE_ALIVE');
    $target=epq_world_layout()[$enemy==='hollow-treant-01'?'treantX':'castleWardenX'];
    $stmt=$db->prepare('SELECT save_json FROM player_game_saves WHERE player_id=?');
    $stmt->bind_param('i',$playerId);$stmt->execute();$row=$stmt->get_result()->fetch_assoc();
    $save=$row?json_decode($row['save_json'],true):null;
    // The map saves a safe return point 220px before the encounter.
    if(!is_array($save)||($save['currentRealmId']??'')!=='ruins'||!empty($save['insideCave'])
        ||!is_numeric($save['playerX']??null)||abs((float)$save['playerX']-$target)>320) throw new DomainException('CASTLE_ENCOUNTER_TOO_FAR');
}
