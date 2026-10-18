<?php
declare(strict_types=1);
require __DIR__.'/battle_review_flow_smoke.php';
$topicActor = guest('TopicSmoke');
$seenByRealm = [];
foreach (['slime-01','bat-01','road-guardian-01','guardian-01'] as $enemyId) {
    $realm = epq_battle_enemies()[$enemyId]['realm'];
    $topicBattle = token();
    action($topicActor,$topicBattle,'START',['enemyId'=>$enemyId,'realm'=>'forged']);
    // Only this disposable battle: enough enemy HP to exercise every stage pool.
    $db->query("UPDATE verified_battles SET state_json=JSON_SET(state_json,'$.enemyHp',10000) WHERE battle_id='$topicBattle'");
    $seen = [];
    $stagePlan=epq_question_progression()[$realm];$stageDifficulty=[];
    foreach($stagePlan['levels'] as $level)foreach(epq_question_pool(epq_battle_enemies()[$enemyId],[],[],$level) as $unusedQuestion)$stageDifficulty[]=$level;
    for ($i=0;$i<count($stageDifficulty);$i++) {
        // Pin only this exhaustive content fixture to its current tier. The
        // dedicated progression flow separately tests natural correct counts.
        $correctForTier=$stageDifficulty[$i]===$stagePlan['levels'][0]?0:$stagePlan['advanceAfter'];
        $db->query("UPDATE verified_battles SET state_json=JSON_SET(state_json,'$.correctAnswers',$correctForTier) WHERE battle_id='$topicBattle'");
        $requestId = token();
        [$status,$issued] = action($topicActor,$topicBattle,'QUESTION',[],$requestId);
        $question = $issued['battle']['question'];
        verify($status===200 && $question['realm']===$realm, 'Server selects encounter realm, not client realm');
        verify($question['difficulty']===$stageDifficulty[$i],'Server selects the authoritative current stage');
        verify(!in_array($question['id'],$seen,true), 'No repeated question before this battle pool is exhausted');
        verify(!isset($question['answer']) && !isset($question['answerOrder']) && !isset($question['explanation']), 'Active themed questions omit answers/explanations');
        if ($question['type']==='SENTENCE_BUILDER') verify($question['words']!==validAnswer($question), 'Issued sentence words shuffled');
        [, $reload] = action($topicActor,$topicBattle,'START',['enemyId'=>$enemyId]);
        verify(canonicalReceipt($reload['battle']['question'])===canonicalReceipt($question), 'Reload keeps the same choices');
        [, $replayed] = action($topicActor,$topicBattle,'QUESTION',[],$requestId);
        verify(canonicalReceipt($replayed['battle']['question'])===canonicalReceipt($question) && $replayed['battle']['questionToken']===$issued['battle']['questionToken'], 'Request replay never reshuffles');
        [, $hit] = action($topicActor,$topicBattle,'ANSWER',['questionToken'=>$issued['battle']['questionToken'],'answer'=>validAnswer($question)]);
        verify($hit['outcome']['correct'] && $hit['battle']['playerHp']===100, 'Every themed answer grades correctly without player damage');
        $seen[] = $question['id'];
    }
    $seenByRealm[$realm] = $seen;
    action($topicActor,$topicBattle,'RUN');
}
verify(epq_recent_question_ids($db,$topicActor[2],'maple')===array_reverse(array_slice($seenByRealm['maple'],-8)), 'Recent history remains scoped to realm after visiting other worlds');
fixtureDungeonAccess($db,$topicActor,'ruins');
foreach (['slime-01','cave-wraith-01'] as $enemyId) {
    $realm = epq_battle_enemies()[$enemyId]['realm'];
    $recent = array_slice($seenByRealm[$realm],-8);
    $topicBattle=token(); action($topicActor,$topicBattle,'START',['enemyId'=>$enemyId]);
    [$issuedStatus, $next] = action($topicActor,$topicBattle,'QUESTION');
    verify($issuedStatus===200 && isset($next['battle']['question']), 'Shared-history encounter issues a valid question');
    verify(!in_array($next['battle']['question']['id'],$recent,true), 'New battles avoid recent history, including Guardian/Wraith shared realm');
    action($topicActor,$topicBattle,'RUN');
}
$topicOther=guest('TopicOther');
verify(epq_recent_question_ids($db,$topicOther[2],'maple')===[], 'Other players keep independent recent history');

// Only this fresh actor: emulate an already-issued legacy question at deployment.
$oldBattle=token();action($topicOther,$oldBattle,'START',['enemyId'=>'slime-01']);
$legacy = array_column(epq_question_bank(),null,'id')['dw-v-001'];
$oldToken=token();
$oldState=json_encode(['status'=>'ACTIVE','enemyHp'=>60,'playerHp'=>100,'focusUsed'=>false,
    'question'=>$legacy,'questionToken'=>$oldToken,'used'=>[$legacy['id']],'startedAt'=>microtime(true)],JSON_THROW_ON_ERROR);
$stmt=$db->prepare('UPDATE verified_battles SET state_json=? WHERE battle_id=?');
$stmt->bind_param('ss',$oldState,$oldBattle);$stmt->execute();
[, $restored] = action($topicOther,$oldBattle,'START',['enemyId'=>'slime-01']);
verify($restored['battle']['question']['id']==='dw-v-001' && !isset($restored['battle']['question']['realm']), 'Existing issued legacy question preserved');
[, $oldHit] = action($topicOther,$oldBattle,'ANSWER',['questionToken'=>$oldToken,'answer'=>true]);
verify($oldHit['outcome']['correct'] && $oldHit['outcome']['xp']===10, 'Legacy answer and reward still settle normally');
echo "PASS: all240themed questions issued/graded across stages, four server realms, no in-stage repeats, recent8across battles, Wraith shared history, independent players, stable shuffle/reload/replay and legacy active snapshot\n";
