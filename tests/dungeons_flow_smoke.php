<?php
declare(strict_types=1);
require __DIR__.'/echo_cave_flow_smoke.php';
$dungeonHero=guest('DungeonHero');$lockedHero=guest('LockedDungeonHero');
[, $fresh]=http('api/player.php',null,$dungeonHero[0]);
verify($fresh['dungeonAccess']===['maple'=>false,'forest'=>false,'camp'=>false,'ruins'=>false],'New interiors start sealed');
function defeatForDungeon(array $actor,string $enemyId): array {
    $battle=token();[$status]=action($actor,$battle,'START',['enemyId'=>$enemyId]);verify($status===200,'Start valid encounter');
    for($i=0;$i<15;$i++) {
        [, $issued]=action($actor,$battle,'QUESTION');
        [, $hit]=action($actor,$battle,'ANSWER',['questionToken'=>$issued['battle']['questionToken'],'answer'=>validAnswer($issued['battle']['question'])]);
        verify($hit['outcome']['correct'] && $hit['battle']['playerHp']===100,'Correct English answers clear the guardian');
        if($hit['battle']['status']==='VICTORY')return $hit;
    }
    throw new RuntimeException('Dungeon encounter did not finish.');
}
foreach(epq_dungeon_specs() as $realm=>$spec) {
    verify(action($dungeonHero,token(),'START',['enemyId'=>$spec['enemies'][0]['id'],'dungeonAccess'=>true,'player_id'=>$actor[2]])[0]===409,'Cannot start a sealed interior or forge unlock/owner');
    verify(http('api/game_state.php',['csrfToken'=>$dungeonHero[1],'state'=>['currentRealmId'=>$realm,'playerX'=>440,'insideCave'=>true,'defeatedEnemyIds'=>[$spec['gate']]]],$dungeonHero[0])[0]===409,'Forged browser defeat cannot save an interior entry');
    $run=token();action($dungeonHero,$run,'START',['enemyId'=>$spec['gate']]);[, $q]=action($dungeonHero,$run,'QUESTION');
    $full=$q['battle']['question'];$right=validAnswer($full);$wrong=$full['type']==='TRUE_FALSE'?!$right:'wrong';
    action($dungeonHero,$run,'ANSWER',['questionToken'=>$q['battle']['questionToken'],'answer'=>$wrong]);action($dungeonHero,$run,'RUN');
    [, $afterRun]=http('api/player.php',null,$dungeonHero[0]);verify(!$afterRun['dungeonAccess'][$realm],'Run never unlocks the interior');
    defeatForDungeon($dungeonHero,$spec['gate']);
    [, $afterWin]=http('api/player.php',null,$dungeonHero[0]);verify($afterWin['dungeonAccess'][$realm],'Graded outdoor victory unlocks its own interior');
    [, $strangerAccess]=http('api/player.php',null,$lockedHero[0]);verify(!$strangerAccess['dungeonAccess'][$realm],'Unlock belongs to the winning player');
    [$saved]=http('api/game_state.php',['csrfToken'=>$dungeonHero[1],'state'=>['currentRealmId'=>$realm,'playerX'=>530,'insideCave'=>true,'caveReturnX'=>$spec['x']+120,
        'realmPositions'=>[$realm=>['playerX'=>530,'insideCave'=>true,'caveReturnX'=>$spec['x']+120]]]],$dungeonHero[0]);
    [, $restored]=http('api/game_state.php',null,$dungeonHero[0]);
    verify($saved===200 && $restored['state']['insideCave'] && $restored['state']['realmPositions'][$realm]['insideCave'] && $restored['state']['playerX']===530,'Each world interior and position survive save/reload');
    foreach($spec['enemies'] as $creature) {
        $id=token();[, $started]=action($dungeonHero,$id,'START',['enemyId'=>$creature['id']]);[, $issued]=action($dungeonHero,$id,'QUESTION');
        verify($started['battle']['enemyHp']===$creature['hp'] && $issued['battle']['question']['realm']===$realm && $issued['battle']['question']['timed'],'Interior uses the correct themed questions and timed challenge');
        action($dungeonHero,$id,'RUN');defeatForDungeon($dungeonHero,$creature['id']);
    }
}
[$blockedTyping]=claim($lockedHero,'TYPING_START');verify($blockedTyping===409,'Typing cave also requires the outside victory');
$legacy=guest('LegacyDungeonHero');$desc=epq_dungeon_specs()['maple']['legacy'];
$ledger=$db->prepare("INSERT INTO player_xp_transactions (player_id,amount,source_type,description) VALUES (?,20,'ENEMY',?)");
$ledger->bind_param('is',$legacy[2],$desc);$ledger->execute();
verify(epq_dungeon_access($db,$legacy[2])['maple'],'Existing legacy victories retain their unlock');
$oldInterior=guest('OldInteriorHero');$id=token();$code='cave-wraith-01';
$oldState=json_encode(['status'=>'VICTORY','playerHp'=>100,'enemyHp'=>0,'focusUsed'=>false,'question'=>null,'used'=>[],'startedAt'=>0]);
$insert=$db->prepare('INSERT INTO verified_battles (battle_id,player_id,enemy_code,state_json) VALUES (?,?,?,?)');
$insert->bind_param('siss',$id,$oldInterior[2],$code,$oldState);$insert->execute();
verify(epq_dungeon_access($db,$oldInterior[2])['ruins'],'Previously cleared cave progress is preserved');
$oldActive=guest('OldActiveInterior');$id=token();
$oldState=json_encode(['status'=>'ACTIVE','playerHp'=>86,'enemyHp'=>110,'focusUsed'=>false,'question'=>null,'used'=>[],'startedAt'=>0]);
$insert->bind_param('siss',$id,$oldActive[2],$code,$oldState);$insert->execute();
[, $resumeOld]=action($oldActive,$id,'START',['enemyId'=>$code]);
verify($resumeOld['battle']['status']==='ACTIVE' && $resumeOld['battle']['playerHp']===86,'An existing unfinished interior remains resumable without resetting its HP');
verify(action($oldActive,token(),'START',['enemyId'=>$code])[0]===409,'Compatibility cannot create a new sealed encounter');
echo "PASS: four distinct interior guardians and themes; outdoor victory gates, Run/CSRF/owner/forged saves, real victories, each-world interior persistence, timed pools, typing prerequisite and legacy progress\n";
