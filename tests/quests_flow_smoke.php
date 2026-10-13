<?php
declare(strict_types=1);
if(getenv('EPQ_BATTLE_TEST_DB')!=='isolated')throw new RuntimeException('Isolated database acknowledgement required.');
// The existing test establishes shared HTTP/session helpers and exercises combat first.
require __DIR__.'/battle_flow_smoke.php';
require_once __DIR__.'/../includes/quests.php';
function claim(array $actor,string $action,array $input=[],?string $id=null):array {
    return http('api/quests.php',array_merge($input,['action'=>$action,'requestId'=>$id??token(),'csrfToken'=>$actor[1]]),$actor[0]);
}
function placeQuest(array $actor,string $realm,int $x,int $claimedStep=5):void {
    [$status]=http('api/game_state.php',['csrfToken'=>$actor[1],'state'=>['currentRealmId'=>$realm,'playerX'=>$x,'questStep'=>$claimedStep]],$actor[0]);
    verify($status===200,'Quest test map save');
}
$hero=guest('QuestSmoke');$stranger=guest('QuestOther');
placeQuest($hero,'maple',880);
[, $snapshot]=http('api/game_state.php',null,$hero[0]);verify($snapshot['state']['questStep']===0,'Client cannot forge chapter five');
verify(http('api/quests.php',['action'=>'NPC','npcId'=>'elder','requestId'=>token()],$hero[0])[0]===403,'Quest CSRF');
verify(claim($hero,'NPC',['npcId'=>'mira'])[0]===409,'Cannot skip story order');
placeQuest($stranger,'maple',440);verify(claim($stranger,'NPC',['npcId'=>'elder','player_id'=>$hero[2]])[0]===409,'Position/owner validation');
$id=token();[$status,$earned]=claim($hero,'NPC',['npcId'=>'elder','xpDelta'=>999999,'coinDelta'=>999999],$id);
verify($status===200&&$earned['player']['xp']===25&&$earned['chapterStep']===1,'Fixed server NPC reward ignores forged amounts');
[, $replayed]=claim($hero,'NPC',['npcId'=>'elder'],$id);verify($replayed['player']['xp']===25,'Same request cannot claim twice');
verify(claim($hero,'NPC',['npcId'=>'mira'],$id)[0]===409,'Receipt inputs cannot change');
[, $again]=claim($hero,'NPC',['npcId'=>'elder']);verify(!$again['outcome']['rewardClaimed']&&$again['player']['xp']===25,'Fresh request cannot reclaim NPC');
foreach([['mira','forest',790],['tala','camp',900],['kai','ruins',870]] as [$npc,$realm,$x]) {placeQuest($hero,$realm,$x);verify(claim($hero,'NPC',['npcId'=>$npc])[0]===200,'Original NPC chapter reward');}
placeQuest($hero,'ruins',1940);[, $start]=claim($hero,'TYPING_START');$run=$start['outcome']['typing'];
verify(claim($stranger,'TYPING_ANSWER',['runId'=>$run['runId'],'questionToken'=>$run['questionToken'],'answer'=>$run['word']['answer']])[0]===409,'Typing belongs to session player');
[, $wrong]=claim($hero,'TYPING_ANSWER',['runId'=>$run['runId'],'questionToken'=>$run['questionToken'],'answer'=>'wrong']);
verify(!$wrong['outcome']['correct']&&$wrong['player']['xp']===125,'Wrong spelling has no reward');
$last=null;
for($i=0;$i<3;$i++) {
    $id=token();$input=['runId'=>$run['runId'],'questionToken'=>$run['questionToken'],'answer'=>strtoupper($run['word']['answer']),'xpDelta'=>999999];
    [$status,$last]=claim($hero,'TYPING_ANSWER',$input,$id);verify($status===200&&$last['outcome']['correct'],'Server grades canonical word');
    [, $replay]=claim($hero,'TYPING_ANSWER',$input,$id);verify($replay['player']['xp']===$last['player']['xp'],'Typing reward cannot replay');
    verify(claim($hero,'TYPING_ANSWER',$input)[0]===409,'Consumed word token cannot be reused');
    $run=$last['outcome']['typing'];
}
verify($last['chapterStep']===5&&$last['player']['xp']===205&&$last['player']['coins']===60,'Original three stage + ending rewards once');
verify($last['player']['levelProgress']['currentXp']===105&&$last['player']['levelProgress']['requiredXp']===150,'XP reflects nonlinear level thresholds');
// Replaying remains a legitimate learning activity, but the ending bonus cannot repeat.
[, $start]=claim($hero,'TYPING_START');$run=$start['outcome']['typing'];
for($i=0;$i<3;$i++){[, $practice]=claim($hero,'TYPING_ANSWER',['runId'=>$run['runId'],'questionToken'=>$run['questionToken'],'answer'=>$run['word']['answer']]);$run=$practice['outcome']['typing'];}
verify(!$practice['outcome']['storyEnding']&&$practice['player']['xp']===235,'Practice rewards preserved without repeated ending bonus');
[, $start]=claim($hero,'TYPING_START');$run=$start['outcome']['typing'];claim($hero,'TYPING_CLOSE',['runId'=>$run['runId']]);
verify(claim($hero,'TYPING_ANSWER',['runId'=>$run['runId'],'questionToken'=>$run['questionToken'],'answer'=>$run['word']['answer']])[0]===409,'Closed challenge cannot award');
[, $start]=claim($hero,'TYPING_START');$replaced=$start['outcome']['typing'];claim($hero,'TYPING_START');
verify(claim($hero,'TYPING_ANSWER',['runId'=>$replaced['runId'],'questionToken'=>$replaced['questionToken'],'answer'=>$replaced['word']['answer']])[0]===409,'Starting a new challenge closes an abandoned active run');
verify(http('api/save_progress.php',['csrfToken'=>$hero[1],'sourceType'=>'QUEST','xpDelta'=>123,'coinDelta'=>7],$hero[0])[0]===400,'Old arbitrary QUEST endpoint closed');
// New fixture only: simulate an existing chapter-three character before migration.
$legacy=guest('QuestLegacy');placeQuest($legacy,'camp',900);
$db->query('UPDATE players SET xp_total=456,coins_total=33 WHERE player_id='.$legacy[2]);
$db->query("UPDATE player_game_saves SET save_json=JSON_SET(save_json,'$.questStep',3) WHERE player_id=".$legacy[2]);
$db->query('DELETE FROM verified_story_progress WHERE player_id='.$legacy[2]);
$migration=(string)file_get_contents(__DIR__.'/../database/migrations/007_verified_quests.sql');
for($i=0;$i<2;$i++){$db->multi_query($migration);do{if($result=$db->store_result())$result->free();}while($db->more_results()&&$db->next_result());}
verify(epq_story_step($db,$legacy[2])===3,'Migration preserves old chapter');
[, $preserved]=claim($legacy,'NPC',['npcId'=>'elder']);verify($preserved['player']['xp']===456&&$preserved['player']['coins']===33,'Legacy completed chapter grants nothing');
// Only this disposable player: emulate an old successful reward followed by a stale map save.
$db->query("INSERT INTO player_xp_transactions(player_id,source_type,amount,description) VALUES (".$legacy[2].",'QUEST',40,'Story chapter completed: The Language of the Lost')");
$db->query('DELETE FROM verified_story_progress WHERE player_id='.$legacy[2]);
$db->multi_query($migration);do{if($result=$db->store_result())$result->free();}while($db->more_results()&&$db->next_result());
verify(epq_story_step($db,$legacy[2])===4,'Historical reward ledger preserves progress beyond a stale map snapshot');
[, $preserved]=claim($legacy,'NPC',['npcId'=>'kai']);verify($preserved['player']['xp']===456&&$preserved['player']['coins']===33,'Ledger backfill never adds currency or reissues an old chapter reward');
// A failed ledger insert must undo claim, story advance, balance and receipt together.
$rollback=guest('QuestRollback');placeQuest($rollback,'maple',880);$id=token();
$db->query("CREATE TRIGGER epq_quest_fail BEFORE INSERT ON player_xp_transactions FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='isolated quest rollback'");
try {verify(claim($rollback,'NPC',['npcId'=>'elder'],$id)[0]===503,'Injected ledger failure rejected');} finally {$db->query('DROP TRIGGER epq_quest_fail');}
verify(epq_story_step($db,$rollback[2])===0&&epq_reward_balance($db,$rollback[2])['xp']===0,'Failed quest leaves balances and chapter unchanged');
verify(claim($rollback,'NPC',['npcId'=>'elder'],$id)[1]['player']['xp']===25,'Same receipt succeeds once after rollback');
// Temporarily hide one NEW table on the isolated database; restore it even on failure.
$db->query('RENAME TABLE verified_story_progress TO epq_test_hidden_story_progress');
try {
    foreach (['api/player.php','api/game_state.php'] as $route) {
        [$status,$unavailable]=http($route,null,$hero[0]);
        verify($status===503&&$unavailable['errorCode']==='MIGRATION_REQUIRED','Missing quest migration has a safe public error');
    }
    [$status,$unavailable]=claim($hero,'NPC',['npcId'=>'elder']);
    verify($status===503&&$unavailable['errorCode']==='MIGRATION_REQUIRED','Missing quest tables never fall back to unverified rewards');
} finally {$db->query('RENAME TABLE epq_test_hidden_story_progress TO verified_story_progress');}
echo "PASS: fixed QUEST amounts, ownership/CSRF/location/order, NPC and typing receipts, three-stage grading, single ending, practice, legacy migration, nonlinear XP and transactional rollback\n";
