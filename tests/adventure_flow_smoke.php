<?php
declare(strict_types=1);
require __DIR__.'/question_progression_flow_smoke.php';
require_once __DIR__.'/../includes/adventure.php';
require_once __DIR__.'/../includes/combat_depth.php';
$depthActor=guest('DepthHero');$depthOther=guest('DepthOther');
$db->query('UPDATE players SET level_no=5,skill_points_total=18 WHERE player_id='.$depthActor[2]);
foreach(['word-strike','grammar-guard','sentence-surge'] as $branch)for($tier=1;$tier<=3;$tier++){
    [$status,$skill]=http('api/skills.php',['csrfToken'=>$depthActor[1],'skill'=>$branch,'targetLevel'=>$tier],$depthActor[0]);verify($status===200,'All skill branches unlock with trusted costs');
}
verify($skill['skills']['skillPoints']===0&&$skill['skills']['grammarGuardLevel']===3&&$skill['skills']['sentenceSurgeLevel']===3,'Three branches have independent permanent tiers and a shared budget');
verify(http('api/skills.php',['csrfToken'=>$depthActor[1],'skill'=>'grammar-guard','targetLevel'=>3],$depthActor[0])[1]['skills']['skillPoints']===0,'Replayed tier cannot charge again');
$guardBattle=token();action($depthActor,$guardBattle,'START',['enemyId'=>'bat-01']);[, $guardQ]=action($depthActor,$guardBattle,'QUESTION');
$guardReceipt=token();[, $guardReady]=action($depthActor,$guardBattle,'GUARD',[],$guardReceipt);verify($guardReady['battle']['combat']['guard']&&$guardReady['battle']['nextMistakeDamage']===5,'Guard predicts actual next damage');
verify(action($depthActor,$guardBattle,'FOCUS')[0]===409,'Guard cannot stack with Focus');
[, $guardMiss]=action($depthActor,$guardBattle,'ANSWER',['questionToken'=>$guardQ['battle']['questionToken'],'answer'=>'wrong']);verify($guardMiss['battle']['playerHp']===95&&$guardMiss['outcome']['enemyDamage']===5,'Guard halves only its question hit');
[, $guardReload]=action($depthActor,$guardBattle,'START',['enemyId'=>'bat-01']);verify(!$guardReload['battle']['combat']['guard']&&$guardReload['battle']['wrongStreak']===1,'Guard consumption and wrong streak persist');action($depthActor,$guardBattle,'RUN');

verify(claim($depthActor,'EXPLORE',['adventureId'=>'forest'])[0]===409,'Removed exploration trails cannot issue new rewards');
$retired=epq_adventure_load($db,$depthActor[2]);$retired['current']=['kind'=>'trail','id'=>'forest','token'=>token()];epq_adventure_save($db,$depthActor[2],$retired);
verify(epq_adventure_load($db,$depthActor[2])['current']===null,'Retired unfinished trail snapshots are safely discarded');

// A real wrong combat answer becomes a memory after the fight ends.
$memoryActor=guest('MemoryHero');$mb=token();action($memoryActor,$mb,'START',['enemyId'=>'slime-01']);[, $mq]=action($memoryActor,$mb,'QUESTION');$canonical=validAnswer($mq['battle']['question']);
action($memoryActor,$mb,'ANSWER',['questionToken'=>$mq['battle']['questionToken'],'answer'=>'wrong']);
verify(claim($memoryActor,'MEMORY_START')[1]['outcome']['empty'],'Active combat answers cannot appear in the memory altar');action($memoryActor,$mb,'RUN');
$beforeMemory=epq_reward_balance($db,$memoryActor[2]);
for($stage=1;$stage<=3;$stage++){
    [$status,$memory]=claim($memoryActor,'MEMORY_START');verify($status===200&&!isset($memory['outcome']['activity']['question']['answer']),'Memory issues a safe historical snapshot');
    $memoryActivity=$memory['outcome']['activity'];$qid=$memoryActivity['id'];$req=token();$currentMemory=epq_adventure_load($db,$memoryActor[2])['current']['question'];$inputs=['questionToken'=>$memoryActivity['token'],'answer'=>$currentMemory['answerOrder']??$currentMemory['answer']];
    verify($memoryActivity['context']==='transfer'&&$memoryActivity['question']['question']!==$mq['battle']['question']['question'],'Memory uses a different situation while keeping the original historical attempt');
    [, $answerMemory]=claim($memoryActor,'ACTIVITY_ANSWER',$inputs,$req);verify($answerMemory['outcome']['correct']&&$answerMemory['outcome']['masteryStage']===$stage,'Spaced successes build three mastery stages');
    verify($answerMemory['outcome']['adventure']['book']['report']['memory']['total']===$stage&&$answerMemory['outcome']['adventure']['book']['report']['memory']['correct']===$stage,'The immediate report includes this review before refreshing');
    [, $repeatMemory]=claim($memoryActor,'ACTIVITY_ANSWER',$inputs,$req);verify($repeatMemory['player']===$answerMemory['player'],'Memory receipt cannot farm rewards');
    verify(claim($memoryActor,'MEMORY_START')[1]['outcome']['empty'],'Server due time prevents immediate repeat farming');
    if($stage<3){$ms=epq_adventure_load($db,$memoryActor[2]);$ms['memory'][$qid]['due']=time()-1;epq_adventure_save($db,$memoryActor[2],$ms);}
}
verify($answerMemory['outcome']['adventure']['memory']['mastered']===1&&$answerMemory['player']['coins']===$beforeMemory['coins']+8,'Mastery lights one rune and grants its reward once');
verify(claim($memoryActor,'TYPING_ANSWER',['runId'=>epq_adventure_id($memoryActor[2]),'questionToken'=>token(),'answer'=>'x'])[0]===409,'Adventure storage cannot be used as a castle run');
verify(http('api/adventure.php',null,$memoryActor[0])[1]['adventure']['memory']['mastered']===1,'Mastery persists after a fresh read');
$publicAdventure=http('api/adventure.php',null,$memoryActor[0])[1]['adventure'];
verify(!isset($publicAdventure['specs'])&&!isset($publicAdventure['quests']),'Removed exploration specs and quest trackers are absent');
verify($publicAdventure['book']['report']['first']['total']===1&&$publicAdventure['book']['report']['first']['correct']===0&&$publicAdventure['book']['report']['memory']['correct']===3,'Successful reviews never inflate first-attempt battle accuracy');
verify($publicAdventure['book']['restoration']['maple']===3,'Mastery restores a persistent three-stage physical monument');
echo "PASS: three skill branches/shared budget, guard/reload, removed trails/retired snapshots, contextual historical mastery/due/replay, honest first/review statistics and physical restoration\n";
