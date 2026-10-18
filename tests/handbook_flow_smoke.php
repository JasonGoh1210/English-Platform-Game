<?php
declare(strict_types=1);
require __DIR__.'/adventure_flow_smoke.php';

function book(array $actor):array {[$status,$response]=http('api/adventure.php',null,$actor[0]);verify($status===200,'Owned handbook is readable');return $response['adventure']['book'];}
$reader=guest('BookHero');$readerOther=guest('BookOther');$emptyBook=book($reader);
verify($emptyBook['report']['first']['rate']===null&&!$emptyBook['report']['comparisonReady'],'No fabricated percentages or growth from an empty history');
verify(count($emptyBook['companions'])===10&&!$emptyBook['festival'],'Ten distinct companion goals and no premature village festival');
foreach($emptyBook['monsters'] as $monster)verify(!$monster['seen']&&!$monster['defeated'],'A fresh codex has no invented sightings');
verify(claim($reader,'WORLD_COMPLETE',['realmId'=>'maple','percent'=>100])[0]===409,'A forged completion percentage earns nothing');
verify(claim($reader,'COMPANION_CLAIM',['companionId'=>'owl','ready'=>true])[0]===409,'A forged companion milestone earns nothing');
verify(claim($reader,'WORLD_COMPLETE',['realmId'=>'admin'])[0]===400,'Only real worlds can be claimed');
verify(http('api/quests.php',['action'=>'WORLD_COMPLETE','realmId'=>'maple','requestId'=>token()],$reader[0])[0]===403,'Handbook mutations require CSRF');
placeQuest($reader,'maple',880);claim($reader,'NPC',['npcId'=>'elder']);
$fight=token();action($reader,$fight,'START',['enemyId'=>'slime-01']);
$sighted=book($reader);$slime=array_values(array_filter($sighted['monsters'],fn($m)=>$m['id']==='slime-01'))[0];
verify($slime['seen']&&!$slime['defeated'],'Starting a real encounter reveals sighting, not victory');
for($turn=0;$turn<20;$turn++){
    [, $question]=action($reader,$fight,'QUESTION');
    [, $hit]=action($reader,$fight,'ANSWER',['questionToken'=>$question['battle']['questionToken'],'answer'=>validAnswer($question['battle']['question'])]);
    if($hit['battle']['status']==='VICTORY')break;
}
verify($hit['battle']['status']==='VICTORY','Maple completion uses a real won battle');
$wonBook=book($reader);verify($wonBook['worlds']['maple']['percent']===100,'Verified story, outdoor victory and learning complete Maple');
$before=epq_reward_balance($db,$reader[2]);$receipt=token();[, $complete]=claim($reader,'WORLD_COMPLETE',['realmId'=>'maple'],$receipt);
verify($complete['outcome']['rewardClaimed']&&$complete['player']['coins']===$before['coins']+15,'World completion grants the fixed reward');
[, $sameComplete]=claim($reader,'WORLD_COMPLETE',['realmId'=>'maple'],$receipt);
verify($sameComplete['player']===$complete['player'],'World receipt replay cannot duplicate currency');
verify(!claim($reader,'WORLD_COMPLETE',['realmId'=>'maple'])[1]['outcome']['rewardClaimed'],'A new request also cannot farm completion');
verify(claim($readerOther,'WORLD_COMPLETE',['realmId'=>'maple','player_id'=>$reader[2]])[0]===409,'Other characters cannot borrow completed worlds');
verify(claim($reader,'WORLD_COMPLETE',['realmId'=>'forest'],$receipt)[0]===409,'World receipt cannot be reused with changed inputs');

// Goal fixtures only affect this disposable player; ownership and purchases still use real server ledgers.
$db->query('UPDATE players SET coins_total=500 WHERE player_id='.$reader[2]);
for($n=0;$n<2;$n++)epq_shop_mutate($db,$reader[2],'BUY','potion',token());
verify(claim($reader,'COMPANION_CLAIM',['companionId'=>'fox'])[0]===409,'A ready goal cannot grant an unowned skin');
epq_shop_mutate($db,$reader[2],'BUY','fox',token());
verify(claim($reader,'COMPANION_CLAIM',['companionId'=>'fox'])[0]===409,'An owned skin must be equipped for its goal');
epq_shop_mutate($db,$reader[2],'EQUIP','fox',token());$beforeFox=epq_reward_balance($db,$reader[2]);$foxId=token();
[, $foxClaim]=claim($reader,'COMPANION_CLAIM',['companionId'=>'fox'],$foxId);
verify($foxClaim['outcome']['rewardClaimed']&&$foxClaim['player']['coins']===$beforeFox['coins']+5,'Equipped fox earns its cosmetic charm and fixed reward');
verify(claim($reader,'COMPANION_CLAIM',['companionId'=>'fox'],$foxId)[1]['player']===$foxClaim['player'],'Companion receipt replay is idempotent');
verify(!claim($reader,'COMPANION_CLAIM',['companionId'=>'fox'])[1]['outcome']['rewardClaimed'],'New requests cannot farm companion rewards');
verify(!book($readerOther)['companions']['fox']['claimed']&&book($reader)['companions']['fox']['claimed'],'Charms persist and belong to their character');

// Repeated correct attempts must not rewrite the first encounter with a concept.
$repeatedBefore=book($memoryActor)['report'];$againBattle=token();action($memoryActor,$againBattle,'START',['enemyId'=>'slime-01']);
$snapshot=json_encode($mq['battle']['question'],JSON_THROW_ON_ERROR); // Restore the original trusted source, including its canonical answer.
$originalCandidate=epq_memory_candidates($db,$memoryActor[2])[$qid]['question_json'];$original=json_decode($originalCandidate,true);
$newQuestionToken=token();$s=$db->prepare("UPDATE verified_battles SET state_json=JSON_SET(state_json,'$.question',JSON_EXTRACT(?,'$'),'$.questionToken',?) WHERE battle_id=?");$s->bind_param('sss',$originalCandidate,$newQuestionToken,$againBattle);$s->execute();
action($memoryActor,$againBattle,'ANSWER',['questionToken'=>$newQuestionToken,'answer'=>$original['answerOrder']??$original['answer']]);action($memoryActor,$againBattle,'RUN');
$reviewed=book($memoryActor)['report'];verify($reviewed['first']===$repeatedBefore['first']&&$reviewed['repeatedBattle']['correct']===1&&$reviewed['memory']['correct']===3,'Repeated battle and memory successes remain separate from first-attempt accuracy');

// Previously earned trail rewards and completed monument stages survive retirement and later mistakes.
$legacyMemory=epq_adventure_load($db,$memoryActor[2]);$legacyMemory['quests']=['forest'=>3];$legacyMemory['memory'][$qid]['bestStage']=3;$legacyMemory['memory'][$qid]['stage']=0;epq_adventure_save($db,$memoryActor[2],$legacyMemory);
$preservedBalance=epq_reward_balance($db,$memoryActor[2]);$restored=book($memoryActor);
verify($restored['restoration']['maple']===3&&epq_reward_balance($db,$memoryActor[2])===$preservedBalance,'A renewed review does not demolish restored scenery or remove earned currency');
verify(epq_adventure_load($db,$memoryActor[2])['quests']['forest']===3,'Retired history remains compatible without exposing old trail actions');
$trendActor=guest('TrendHero');$trendBattle=token();action($trendActor,$trendBattle,'START',['enemyId'=>'slime-01']);
$trendInsert=$db->prepare('INSERT INTO verified_answer_attempts(battle_id,question_token,question_code,question_json,answer_json,is_correct,timed_out,elapsed_ms) VALUES (?,?,?,?,?, ?,0,100)');
foreach(array_slice(epq_question_bank(),0,20) as $n=>$q){$questionCode=$q['id'];$questionJson=json_encode($q,JSON_THROW_ON_ERROR);$questionToken=token();$answerJson='null';$isCorrect=$n<10?($n<5?1:0):($n<18?1:0);$trendInsert->bind_param('sssssi',$trendBattle,$questionToken,$questionCode,$questionJson,$answerJson,$isCorrect);$trendInsert->execute();}
$trend=book($trendActor)['report'];verify($trend['comparisonReady']&&$trend['early']['rate']===50&&$trend['recent']['rate']===80&&$trend['first']['total']===20,'Learning trend compares two distinct chronological groups of ten first answers');
$castleReport=book($hero)['report']['castle'];verify($castleReport['total']>=6&&$castleReport['correct']>=6&&$castleReport['wins']>=2,'Castle answers and completed runs are reported separately from ordinary first attempts');
echo "PASS: codex sightings/victories, world requirements/ownership/CSRF/replay, ten companion goals/equip/ownership/charms, honest learning groups, durable scenery and retired rewards\n";
