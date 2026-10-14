<?php
declare(strict_types=1);
function epq_dungeon_specs(): array {
    static $specs;
    return $specs ??= json_decode((string)file_get_contents(__DIR__.'/../data/dungeons.json'),true,512,JSON_THROW_ON_ERROR);
}
function epq_enemy_dungeon(string $enemyId): ?string {
    foreach (epq_dungeon_specs() as $realm=>$spec) foreach ($spec['enemies'] as $enemy) {
        if ($enemy['id']===$enemyId) return $realm;
    }
    return null;
}
function epq_dungeon_access(mysqli $db, int $playerId): array {
    $stmt=$db->prepare("SELECT DISTINCT enemy_code FROM verified_battles
        WHERE player_id=? AND JSON_UNQUOTE(JSON_EXTRACT(state_json,'$.status'))='VICTORY'");
    $stmt->bind_param('i',$playerId);$stmt->execute();
    $wins=array_column($stmt->get_result()->fetch_all(MYSQLI_ASSOC),'enemy_code');
    // Preserve pre-verified-combat victories from the now closed legacy reward path.
    // Browser defeatedEnemyIds cannot grant access, and no save or balance is rewritten.
    $stmt=$db->prepare("SELECT DISTINCT description FROM player_xp_transactions WHERE player_id=? AND source_type='ENEMY' AND amount>0");
    $stmt->bind_param('i',$playerId);$stmt->execute();
    $legacy=array_column($stmt->get_result()->fetch_all(MYSQLI_ASSOC),'description');
    $access=[];
    foreach (epq_dungeon_specs() as $realm=>$spec) {
        $access[$realm]=in_array($spec['gate'],$wins,true) || in_array($spec['legacy'],$legacy,true)
            // Existing cleared interiors keep their unlock when this rule is introduced.
            || (bool)array_intersect(array_column($spec['enemies'],'id'),$wins);
    }
    return $access;
}
function epq_require_dungeon_access(mysqli $db, int $playerId, string $realm): void {
    if (!(epq_dungeon_access($db,$playerId)[$realm] ?? false)) throw new DomainException('DUNGEON_LOCKED');
}
