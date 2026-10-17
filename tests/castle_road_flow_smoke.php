<?php
declare(strict_types=1);
require __DIR__.'/quests_flow_smoke.php';
$roadHero=guest('CastleRoadHero');$roadOther=guest('CastleRoadOther');$layout=epq_world_layout();
function defeatCastleEnemy(array $actor,string $enemy): array {
    $id=token();verify(action($actor,$id,'START',['enemyId'=>$enemy])[0]===200,'Castle encounter starts at its saved road position');
    for($i=0;$i<20;$i++) {
        [, $question]=action($actor,$id,'QUESTION');
        [$status,$hit]=action($actor,$id,'ANSWER',['questionToken'=>$question['battle']['questionToken'],'answer'=>validAnswer($question['battle']['question'])]);
        verify($status===200&&$hit['outcome']['correct']&&$hit['battle']['playerHp']===100,'Castle answers damage only the enemy');
        if($hit['battle']['status']==='VICTORY')return $hit;
    }
    throw new RuntimeException('Castle encounter did not finish');
}
placeQuest($roadHero,'ruins',$layout['treantX']);
verify(action($roadHero,token(),'START',['enemyId'=>'hollow-treant-01'])[0]===409,'Original outdoor guardian still gates the final road');
fixtureDungeonAccess($db,$roadHero,'ruins');
placeQuest($roadHero,'ruins',$layout['castleWardenX']);
verify(action($roadHero,token(),'START',['enemyId'=>'castle-warden-01'])[0]===409,'Tree must fall before the warden can be challenged');
http('api/game_state.php',['csrfToken'=>$roadHero[1],'state'=>['currentRealmId'=>'ruins','playerX'=>$layout['castleGateX'],
    'defeatedEnemyIds'=>['hollow-treant-01','castle-warden-01'],'castle'=>['hasKey'=>true,'gateOpen'=>true]]],$roadHero[0]);
verify(claim($roadHero,'CASTLE_OPEN')[0]===409,'Forged browser victories and keys cannot unlock the gate');
placeQuest($roadHero,'ruins',$layout['finalCastleX']);
verify(claim($roadHero,'TYPING_START')[0]===409,'Direct final-boss requests require the gate to open');
verify(action($roadHero,token(),'START',['enemyId'=>'hollow-treant-01'])[0]===409,'Remote castle encounters are rejected');
placeQuest($roadHero,'ruins',$layout['treantX']-220);defeatCastleEnemy($roadHero,'hollow-treant-01');
placeQuest($roadHero,'ruins',$layout['castleWardenX']-220);
$run=token();action($roadHero,$run,'START',['enemyId'=>'castle-warden-01']);action($roadHero,$run,'RUN');
[, $view]=http('api/shop.php',null,$roadHero[0]);verify(!$view['shop']['castle']['hasKey'],'Running away grants no key');
defeatCastleEnemy($roadHero,'castle-warden-01');
[, $view]=http('api/shop.php',null,$roadHero[0]);verify($view['shop']['castle']['hasKey']&&!$view['shop']['castle']['gateOpen'],'Verified warden victory places one persistent key in the backpack');
verify(claim($roadHero,'CASTLE_OPEN')[0]===409,'Key must be used at the actual gate');
placeQuest($roadHero,'ruins',$layout['castleGateX']-115);
verify(http('api/quests.php',['action'=>'CASTLE_OPEN','requestId'=>token()],$roadHero[0])[0]===403,'Gate opening requires CSRF');
$request=token();[$status,$opened]=claim($roadHero,'CASTLE_OPEN',[],$request);
verify($status===200&&$opened['castle']['gateOpen']&&!$opened['castle']['hasKey'],'Using the key permanently unlocks the gate');
[, $again]=claim($roadHero,'CASTLE_OPEN',[],$request);verify($again['castle']['gateOpen'],'Lost open response can replay safely');
verify(claim($roadHero,'CASTLE_OPEN')[0]===200,'A fresh open action cannot spend another key or close the gate');
[, $other]=http('api/player.php',null,$roadOther[0]);verify(!$other['castle']['hasKey']&&!$other['castle']['gateOpen'],'Castle keys belong to the winning character');
placeQuest($roadHero,'ruins',$layout['finalCastleX']);verify(claim($roadHero,'TYPING_START')[0]===200,'Unlocked road reaches the original final spelling battle');
verify(epq_castle_progress($db,$hero[2])['gateOpen'],'Previously completed finale remains replayable');
echo "Castle road and key flow smoke checks passed.\n";
