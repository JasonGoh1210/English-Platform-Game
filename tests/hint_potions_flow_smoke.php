<?php
declare(strict_types=1);
require __DIR__.'/shop_flow_smoke.php';
require_once __DIR__.'/../includes/question_hints.php';
$hintActor=guest('HintHero');$hintOther=guest('HintOther');
$db->query('UPDATE players SET coins_total=150 WHERE player_id='.(int)$hintActor[2]);
$buyHint=token();[, $hintBought]=shopAction($hintActor,'BUY','hint_potion',$buyHint);
verify($hintBought['shop']['hintPotions']===1&&$hintBought['shop']['potions']===0&&$hintBought['shop']['coins']===135,'Hint stock has a separate trusted price and quantity');
[, $hintBuyReplay]=shopAction($hintActor,'BUY','hint_potion',$buyHint);verify($hintBuyReplay['shop']===$hintBought['shop'],'Hint purchase replay charges once');
$hintBattle=token();action($hintActor,$hintBattle,'START',['enemyId'=>'slime-01']);
verify(action($hintActor,$hintBattle,'HINT',['questionToken'=>token()])[0]===409,'Hint requires an active question');
[, $hintQuestion]=action($hintActor,$hintBattle,'QUESTION');$qt=$hintQuestion['battle']['questionToken'];
verify(!isset($hintQuestion['battle']['hint']),'A fresh question does not leak a free clue');
verify(action($hintActor,$hintBattle,'HINT',['questionToken'=>token()])[0]===409,'Stale question token cannot spend stock');
action($hintActor,$hintBattle,'PAUSE');verify(action($hintActor,$hintBattle,'HINT',['questionToken'=>$qt])[0]===409,'Settings pause blocks hints');action($hintActor,$hintBattle,'RESUME');
verify(action($hintOther,$hintBattle,'HINT',['questionToken'=>$qt])[0]===404,'Hint battle ownership');
verify(http('api/battle.php',['csrfToken'=>'invalid','action'=>'HINT','battleId'=>$hintBattle,'requestId'=>token(),'questionToken'=>$qt],$hintActor[0])[0]===403,'Hint CSRF');
$hintUse=token();[$status,$hintReceipt]=action($hintActor,$hintBattle,'HINT',['questionToken'=>$qt],$hintUse);
verify($status===200&&$hintReceipt['shop']['hintPotions']===0&&$hintReceipt['shop']['coins']===135&&$hintReceipt['battle']['playerHp']===100,'Hint works at full HP, consumes one owned bottle, no extra Coin charge');
verify(isset($hintReceipt['battle']['hint']['en'],$hintReceipt['battle']['hint']['zh'])&&!isset($hintReceipt['battle']['hint']['answer']),'Hint is bilingual and never a grading receipt');
[, $hintReplay]=action($hintActor,$hintBattle,'HINT',['questionToken'=>$qt],$hintUse);verify(sameReceipt($hintReceipt,$hintReplay),'Lost hint response replays once');
verify(action($hintActor,$hintBattle,'HINT',['questionToken'=>$qt])[0]===409,'One hint per question with different request IDs');
[, $hintReload]=action($hintActor,$hintBattle,'START',['enemyId'=>'slime-01']);
verify($hintReload['battle']['hint']===$hintReceipt['battle']['hint'],'Hint survives battle reload');
verify((int)$db->query("SELECT COUNT(*) AS n FROM verified_answer_attempts WHERE battle_id='".$hintBattle."'")->fetch_assoc()['n']===0,'Using a hint never submits an answer or grants accuracy');
action($hintActor,$hintBattle,'RESUME');
[, $gradedHint]=action($hintActor,$hintBattle,'ANSWER',['questionToken'=>$qt,'answer'=>validAnswer($hintQuestion['battle']['question'])]);
verify($gradedHint['outcome']['correct']===true&&$gradedHint['battle']['playerHp']===100,'Normal answer grading and correct-answer HP rule remain');
[, $nextHintQ]=action($hintActor,$hintBattle,'QUESTION');
verify(!isset($nextHintQ['battle']['hint']),'Clue does not carry to the next question');
verify(action($hintActor,$hintBattle,'HINT',['questionToken'=>$nextHintQ['battle']['questionToken']])[0]===409,'No bottle means no free hint');
shopAction($hintActor,'BUY','hint_potion');$beforeHintRollback=epq_shop_view($db,$hintActor[2]);
$db->begin_transaction();epq_use_hint_potion($db,$hintActor[2],token());$db->rollback();
verify(epq_shop_view($db,$hintActor[2])===$beforeHintRollback,'Hint consumption rolls back with its action');

// An already expired timed dungeon question cannot consume a potion.
fixtureDungeonAccess($db,$hintActor,'forest');$timedHintBattle=token();action($hintActor,$timedHintBattle,'START',['enemyId'=>'moss-sentinel-01']);
[, $timedHintQ]=action($hintActor,$timedHintBattle,'QUESTION');
$expired=microtime(true)-60;$expire=$db->prepare("UPDATE verified_battles SET state_json=JSON_SET(state_json,'$.startedAt',?) WHERE battle_id=?");$expire->bind_param('ds',$expired,$timedHintBattle);$expire->execute();
verify(action($hintActor,$timedHintBattle,'HINT',['questionToken'=>$timedHintQ['battle']['questionToken']])[0]===409,'Expired timed question keeps bottle');
verify(epq_shop_view($db,$hintActor[2])['hintPotions']===1,'No deduction on expired question');

foreach(epq_question_bank() as $question){
    $hint=epq_question_hint($question);verify(is_string($hint['en'])&&is_string($hint['zh']),'Every current or legacy question has a bilingual hint');
    verify(!isset(epq_public_question($question)['hint']),'Normal public question excludes potion clues');
    if($question['type']==='ODD_WORD_OUT')verify(in_array($hint['removedWord'],$question['words'],true)&&$hint['removedWord']!==$question['answer'],'Elimination never removes the correct answer');
    if($question['type']==='SENTENCE_BUILDER')verify(count($hint['leadWords'])<=count($question['answerOrder'])-2,'Sentence clue leaves at least two words for the learner');
}
[, $hintForm]=http('register.php',null,$hintActor[0]);preg_match('/name="csrf_token" value="([a-f0-9]{64})"/',$hintForm,$hintUpgradeToken);
$beforeHintUpgrade=epq_shop_view($db,$hintActor[2]);
verify(http('register.php',['csrf_token'=>$hintUpgradeToken[1],'username'=>'hints_'.substr(token(),0,10),'password'=>'Hint-Passw0rd!','confirm_password'=>'Hint-Passw0rd!'],$hintActor[0])[0]===302,'Hint owner upgrades guest account');
[, $hintUpgraded]=http('api/player.php',null,$hintActor[0]);verify($hintUpgraded['player']['playerId']===$hintActor[2]&&$hintUpgraded['shop']===$beforeHintUpgrade,'Upgrade preserves hint stock, ownership and balances');
echo "PASS: hint potion purchase/stock/replay, full HP, current-question binding, owner/CSRF/settings/expiry, one-per-question, reload, no automatic answer or reward, rollback and guest upgrade\n";
