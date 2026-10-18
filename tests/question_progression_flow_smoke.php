<?php
declare(strict_types=1);
require __DIR__.'/battle_supplies_flow_smoke.php';
$progressActor=guest('ProgressHero');
foreach(['slime-01','bat-01','road-guardian-01','guardian-01'] as $enemyId){
    $enemy=epq_battle_enemies()[$enemyId];$plan=epq_question_progression()[$enemy['realm']];$progressBattle=token();
    [, $startProgress]=action($progressActor,$progressBattle,'START',['enemyId'=>$enemyId,'correctAnswers'=>999,'difficulty'=>'HARD']);
    verify($startProgress['battle']['progression']['correctAnswers']===0,'Client cannot forge initial difficulty progress');
    $db->query("UPDATE verified_battles SET state_json=JSON_SET(state_json,'$.enemyHp',10000) WHERE battle_id='$progressBattle'");
    // An actual wrong answer cannot advance difficulty.
    [, $firstProgressQ]=action($progressActor,$progressBattle,'QUESTION',['difficulty'=>'HARD']);
    verify($firstProgressQ['battle']['question']['difficulty']===$plan['levels'][0],'World starts at its configured tier');
    $bad=$firstProgressQ['battle']['question']['type']==='TRUE_FALSE'?!validAnswer($firstProgressQ['battle']['question']):'wrong';
    [, $progressMiss]=action($progressActor,$progressBattle,'ANSWER',['questionToken'=>$firstProgressQ['battle']['questionToken'],'answer'=>$bad,'correctAnswers'=>999]);
    verify($progressMiss['battle']['progression']['correctAnswers']===0,'Mistakes do not increase or forge the progress count');
    for($rightCount=0;$rightCount<4;$rightCount++){
        [$status,$issuedProgress]=action($progressActor,$progressBattle,'QUESTION',['difficulty'=>'EASY','correctAnswers'=>0]);
        $expected=epq_question_stage($enemy,$rightCount)['difficulty'];
        verify($status===200&&$issuedProgress['battle']['question']['difficulty']===$expected,'Natural correct-answer sequence follows world tiers');
        $tokenProgress=$issuedProgress['battle']['questionToken'];
        [, $sameProgress]=action($progressActor,$progressBattle,'START',['enemyId'=>$enemyId]);
        verify($sameProgress['battle']['progression']['correctAnswers']===$rightCount&&$sameProgress['battle']['questionToken']===$tokenProgress,'Reload preserves counter and issued difficulty');
        $requestProgress=token();$answerProgress=['questionToken'=>$tokenProgress,'answer'=>validAnswer($issuedProgress['battle']['question'])];
        [, $hitProgress]=action($progressActor,$progressBattle,'ANSWER',$answerProgress,$requestProgress);
        [, $hitProgressReplay]=action($progressActor,$progressBattle,'ANSWER',$answerProgress,$requestProgress);
        verify($hitProgress['battle']['progression']['correctAnswers']===$rightCount+1&&sameReceipt($hitProgress,$hitProgressReplay),'Correct receipt advances once, retries never skip a tier');
        verify($hitProgress['battle']['playerHp']===$progressMiss['battle']['playerHp'],'Correct progression never harms the player');
        if($rightCount===1){
            // Simulate a pre-update unfinished battle. Its already stored
            // correct attempts must restore the exact counter automatically.
            $db->query("UPDATE verified_battles SET state_json=JSON_REMOVE(state_json,'$.correctAnswers') WHERE battle_id='$progressBattle'");
            [, $legacyProgress]=action($progressActor,$progressBattle,'START',['enemyId'=>$enemyId]);
            verify($legacyProgress['battle']['progression']['correctAnswers']===2,'Old active snapshots recover correct progress from verified attempts');
        }
    }
    action($progressActor,$progressBattle,'RUN');
}
// A revised ruins ID must not change the content or answer of a question that
// was already issued before this release.
$oldRevisionBattle=token();action($progressActor,$oldRevisionBattle,'START',['enemyId'=>'guardian-01']);$oldRevisionToken=token();
$oldOrder=['We','can','open','this','file'];
$oldRevisionQuestion=['id'=>'ruins-sentence-003','realm'=>'ruins','type'=>'SENTENCE_BUILDER','skill'=>'itEnglish','difficulty'=>'MEDIUM',
    'question'=>'Build the correct sentence.','questionZh'=>'把单词排列成正确的句子。','words'=>['file','this','open','can','We'],'answerOrder'=>$oldOrder,
    'explanation'=>'Use can followed by the base verb.','explanationZh'=>'Can 后接动词原形。','timeLimit'=>12,'timed'=>false,'xp'=>15,'coins'=>8,'englishPower'=>2];
$oldRevisionState=json_encode(['status'=>'ACTIVE','enemyHp'=>100,'playerHp'=>100,'focusUsed'=>false,'question'=>$oldRevisionQuestion,
    'questionToken'=>$oldRevisionToken,'used'=>['ruins-sentence-003'],'startedAt'=>microtime(true)],JSON_THROW_ON_ERROR);
$oldRevisionWrite=$db->prepare('UPDATE verified_battles SET state_json=? WHERE battle_id=?');$oldRevisionWrite->bind_param('ss',$oldRevisionState,$oldRevisionBattle);$oldRevisionWrite->execute();
[, $oldRevisionReload]=action($progressActor,$oldRevisionBattle,'START',['enemyId'=>'guardian-01']);
verify($oldRevisionReload['battle']['question']['words']===['file','this','open','can','We']&&$oldRevisionReload['battle']['question']['difficulty']==='MEDIUM','Revised ID still restores its old active snapshot');
[, $oldRevisionHit]=action($progressActor,$oldRevisionBattle,'ANSWER',['questionToken'=>$oldRevisionToken,'answer'=>$oldOrder]);
verify($oldRevisionHit['outcome']['correct']&&$oldRevisionHit['outcome']['xp']===15,'Old snapshot keeps its original answer and rewards');
[, $nextRevision]=action($progressActor,$oldRevisionBattle,'QUESTION');
verify($nextRevision['battle']['question']['difficulty']==='HARD','Next question adopts the new ruins tier after old snapshot settles');
action($progressActor,$oldRevisionBattle,'RUN');
echo "PASS: world Easy→Medium→Hard ordering, natural correct-count progression, mistakes stay at current tier, client forgery rejected, refresh/legacy recovery, revised-ID snapshots and exactly-once advance\n";
