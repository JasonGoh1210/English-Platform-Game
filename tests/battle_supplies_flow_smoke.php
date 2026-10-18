<?php
declare(strict_types=1);
require __DIR__.'/particle_effects_flow_smoke.php';
$supplyActor=guest('SupplyHero');$supplyBattle=token();
$db->query('UPDATE players SET coins_total=500 WHERE player_id='.(int)$supplyActor[2]);
for($i=0;$i<3;$i++)shopAction($supplyActor,'BUY','potion');
shopAction($supplyActor,'BUY','hint_potion');
$supplies=epq_shop_view($db,$supplyActor[2]);
verify($supplies['coins']===395&&$supplies['potions']===3&&$supplies['hintPotions']===1,'Updated healing25/hint30 prices only charge at the shop');
action($supplyActor,$supplyBattle,'START',['enemyId'=>'slime-01']);
$beforeHerb=epq_shop_view($db,$supplyActor[2]);
[$blockedStatus,$blockedHerb]=action($supplyActor,$supplyBattle,'HERB');
verify($blockedStatus===409&&$blockedHerb['errorCode']==='BATTLE_SHOP_ONLY'&&epq_shop_view($db,$supplyActor[2])===$beforeHerb,'Even a rich player cannot purchase emergency healing in battle');
[, $supplyQ]=action($supplyActor,$supplyBattle,'QUESTION');
$wrongAnswer=static fn(array $q): mixed=>$q['type']==='TRUE_FALSE'?!validAnswer($q):'incorrect';
$supplyInputs=['questionToken'=>$supplyQ['battle']['questionToken'],'answer'=>$wrongAnswer($supplyQ['battle']['question']),'wrongStreak'=>0,'enemyDamage'=>1];$supplyRequest=token();
$db->query("CREATE TRIGGER epq_test_streak_receipt BEFORE INSERT ON verified_battle_events FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Isolated streak rollback'");
try{verify(action($supplyActor,$supplyBattle,'ANSWER',$supplyInputs,$supplyRequest)[0]===503,'Failed answer receipt aborts entire streak update');}
finally{$db->query('DROP TRIGGER epq_test_streak_receipt');}
[, $rolled]=action($supplyActor,$supplyBattle,'START',['enemyId'=>'slime-01']);
verify($rolled['battle']['playerHp']===100&&$rolled['battle']['wrongStreak']===0,'Rollback keeps old HP and streak');
verify((int)$db->query("SELECT COUNT(*) AS n FROM verified_answer_attempts WHERE battle_id='$supplyBattle'")->fetch_assoc()['n']===0,'Rollback also removes the failed attempt');
[, $firstMiss]=action($supplyActor,$supplyBattle,'ANSWER',$supplyInputs,$supplyRequest);
[, $firstReplay]=action($supplyActor,$supplyBattle,'ANSWER',$supplyInputs,$supplyRequest);
verify($firstMiss['battle']['playerHp']===90&&$firstMiss['outcome']['enemyDamage']===10&&$firstMiss['battle']['wrongStreak']===1&&sameReceipt($firstMiss,$firstReplay),'First mistake base10 and lost-response replay cannot damage twice');
function supplyMiss(array $who,string $battle): array {
    [, $q]=action($who,$battle,'QUESTION');$wrong=$q['battle']['question']['type']==='TRUE_FALSE'?!validAnswer($q['battle']['question']):'incorrect';
    [$status,$result]=action($who,$battle,'ANSWER',['questionToken'=>$q['battle']['questionToken'],'answer'=>$wrong,'wrongStreak'=>0,'enemyDamage'=>1]);
    verify($status===200,'Mistake request succeeds');return $result;
}
$secondMiss=supplyMiss($supplyActor,$supplyBattle);
verify($secondMiss['battle']['playerHp']===75&&$secondMiss['outcome']['enemyDamage']===15&&$secondMiss['battle']['nextMistakeDamage']===20,'Second mistake adds5; client cannot forge its streak or damage');
[, $persistedMiss]=action($supplyActor,$supplyBattle,'START',['enemyId'=>'slime-01']);
verify($persistedMiss['battle']['wrongStreak']===2&&$persistedMiss['battle']['playerHp']===75,'Reload preserves the mistake chain');
[, $activeSupplyQ]=action($supplyActor,$supplyBattle,'QUESTION');action($supplyActor,$supplyBattle,'PAUSE');action($supplyActor,$supplyBattle,'RESUME');
[, $hintStreak]=action($supplyActor,$supplyBattle,'HINT',['questionToken'=>$activeSupplyQ['battle']['questionToken']]);
verify($hintStreak['battle']['wrongStreak']===2,'Hint use cannot clear the mistake chain');action($supplyActor,$supplyBattle,'RESUME');
$db->query('UPDATE players SET coins_total=0 WHERE player_id='.(int)$supplyActor[2]);
$supplyUse=token();[, $zeroCoinHeal]=action($supplyActor,$supplyBattle,'POTION',[],$supplyUse);
[, $zeroCoinReplay]=action($supplyActor,$supplyBattle,'POTION',[],$supplyUse);
verify($zeroCoinHeal['battle']['playerHp']===100&&$zeroCoinHeal['battle']['wrongStreak']===2&&$zeroCoinHeal['shop']['potions']===2&&$zeroCoinHeal['shop']['coins']===0&&sameReceipt($zeroCoinHeal,$zeroCoinReplay),'Healing consumes stock once at zero Coins and preserves streak');
action($supplyActor,$supplyBattle,'RESUME');
[, $resetHit]=action($supplyActor,$supplyBattle,'ANSWER',['questionToken'=>$activeSupplyQ['battle']['questionToken'],'answer'=>validAnswer($activeSupplyQ['battle']['question'])]);
verify($resetHit['battle']['wrongStreak']===0&&$resetHit['outcome']['enemyDamage']===0&&$resetHit['battle']['playerHp']===100&&$resetHit['battle']['nextMistakeDamage']===10,'Correct answer resets streak and never harms the player');
foreach([10,15,20,25] as $damage){$miss=supplyMiss($supplyActor,$supplyBattle);verify($miss['outcome']['enemyDamage']===$damage,'Mistake damage increases by5 toward the +20 cap');}
verify($miss['battle']['playerHp']===30,'Four mistakes deal10+15+20+25 damage');
action($supplyActor,$supplyBattle,'POTION');
foreach([40,10,0] as $hp){$capped=supplyMiss($supplyActor,$supplyBattle);verify($capped['outcome']['enemyDamage']===30&&$capped['battle']['playerHp']===$hp,'Damage remains capped and HP never becomes negative');}
verify($capped['battle']['status']==='DEFEAT'&&action($supplyActor,$supplyBattle,'QUESTION')[0]===409,'Losing the streak battle terminates further questions');
$emptyActor=guest('EmptyBagHero');$emptyBattle=token();$db->query('UPDATE players SET coins_total=500 WHERE player_id='.(int)$emptyActor[2]);
action($emptyActor,$emptyBattle,'START',['enemyId'=>'slime-01']);supplyMiss($emptyActor,$emptyBattle);
verify(action($emptyActor,$emptyBattle,'POTION')[0]===409&&epq_shop_view($db,$emptyActor[2])['coins']===500,'A full wallet cannot replace empty potion stock');
fixtureDungeonAccess($db,$emptyActor,'ruins');$timeoutBattle=token();action($emptyActor,$timeoutBattle,'START',['enemyId'=>'cave-wraith-01']);
foreach([14,19] as $damage){[, $q]=action($emptyActor,$timeoutBattle,'QUESTION');[, $expiredHit]=action($emptyActor,$timeoutBattle,'ANSWER',['questionToken'=>$q['battle']['questionToken'],'answer'=>validAnswer($q['battle']['question']),'timedOut'=>true]);verify($expiredHit['outcome']['timedOut']&&$expiredHit['outcome']['enemyDamage']===$damage,'Timed-out questions also increase the same mistake streak');}
echo "PASS: shop-only25/30potions, retired battle buy rejected, zero-Coin stock use, consecutive wrong/timeout damage, cap/correct reset, potion/hint/pause/reload persistence, replay and atomic rollback\n";
