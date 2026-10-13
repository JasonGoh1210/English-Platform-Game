<?php
declare(strict_types=1);
require __DIR__.'/themed_questions_flow_smoke.php';
$echoActor=guest('EchoSmoke');
$cleared=[];
foreach (['cave-wraith-01','echo-slime-01','echo-dragon-01'] as $enemyId) {
    $enemy=epq_battle_enemies()[$enemyId];
    $battle=token();
    [$status,$started]=action($echoActor,$battle,'START',['enemyId'=>$enemyId]);
    verify($status===200 && $started['battle']['enemyHp']===$enemy['hp'], 'Echo encounter uses trusted HP');
    $lastRequest=null;$answerInputs=null;$lastHit=null;
    for ($i=0;$i<12;$i++) {
        [, $issued]=action($echoActor,$battle,'QUESTION');
        $question=$issued['battle']['question'];
        verify($question['realm']==='ruins' && in_array($question['type'],$enemy['types'],true), 'Each Echo room has its intended quiz type');
        $lastRequest=token();
        $answerInputs=['questionToken'=>$issued['battle']['questionToken'],'answer'=>validAnswer($question)];
        [, $lastHit]=action($echoActor,$battle,'ANSWER',$answerInputs,$lastRequest);
        verify($lastHit['outcome']['correct'] && $lastHit['battle']['playerHp']===100, 'Echo answers never damage player when correct');
        if ($lastHit['battle']['status']==='VICTORY') break;
    }
    verify($lastHit['battle']['status']==='VICTORY', 'All three Echo encounters can be beaten');
    [, $replay]=action($echoActor,$battle,'ANSWER',$answerInputs,$lastRequest);
    verify(sameReceipt($lastHit,$replay), 'New Echo victory receipt is replay safe');
    [, $review]=http('api/battle_review.php?battleId='.$battle,null,$echoActor[0]);
    verify($review['ok'] && $review['stats']['correct']>0, 'Echo battles retain learning summaries');
    $cleared[]=$enemyId;
    [, $saved]=http('api/game_state.php',['csrfToken'=>$echoActor[1],
        'state'=>['currentRealmId'=>'ruins','playerX'=>$enemyId==='echo-dragon-01'?1650:1100,
            'insideCave'=>true,'caveReturnX'=>1800,'defeatedEnemyIds'=>array_merge($cleared,['not-an-enemy'])]],$echoActor[0]);
    verify($saved['ok'], 'Echo room progress saves');
    [, $restored]=http('api/game_state.php',null,$echoActor[0]);
    verify($restored['state']['insideCave'] && $restored['state']['defeatedEnemyIds']===$cleared,
        'All new enemy IDs survive safe save/reload; unknown IDs removed');
}
echo "PASS: three Echo room victories, trusted stats/types, correct HP, reward replay, learning summaries and saved new enemy IDs\n";
