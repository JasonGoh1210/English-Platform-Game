<?php
declare(strict_types=1);
require __DIR__.'/hint_potions_flow_smoke.php';
$effectsOwner=guest('ParticleHero');$effectsOther=guest('ParticleOther');
verify(epq_shop_view($db,$effectsOwner[2])['equippedEffect']==='none','Old and new characters default to no effect');
verify(shopAction($effectsOwner,'EQUIP','sakura_trail')[0]===409,'Cannot equip an unowned particle effect');
verify(shopAction($effectsOwner,'BUY','sakura_trail')[0]===409,'Empty wallet cannot buy particles');
verify(http('api/shop.php',['action'=>'BUY','item'=>'sakura_trail','requestId'=>token(),'csrfToken'=>'wrong'],$effectsOwner[0])[0]===403,'Effect purchase requires CSRF');
$db->query('UPDATE players SET coins_total=500 WHERE player_id='.(int)$effectsOwner[2]);
shopAction($effectsOwner,'BUY','fox');shopAction($effectsOwner,'EQUIP','fox');$effectsCoins=460;
foreach(epq_shop_catalog() as $item=>$product)if($product['kind']==='effect'&&$item!=='none'){
    $id=token();[$status,$receipt]=shopAction($effectsOwner,'BUY',$item,$id,['price'=>0,'player_id'=>$effectsOther[2]]);$effectsCoins-=$product['price'];
    verify($status===200&&$receipt['shop']['coins']===$effectsCoins&&in_array($item,$receipt['shop']['ownedEffects'],true),'Effect uses catalog price and session ownership');
    [, $again]=shopAction($effectsOwner,'BUY',$item,$id);verify($again['shop']===$receipt['shop'],'Lost effect purchase response charges once');
    verify(shopAction($effectsOwner,'BUY',$item)[0]===409,'Permanent effects cannot be purchased twice');
    verify(shopAction($effectsOwner,'EQUIP',$item,$id)[0]===409,'Effect request cannot change payload on replay');
    $equipId=token();[, $worn]=shopAction($effectsOwner,'EQUIP',$item,$equipId);[, $wornAgain]=shopAction($effectsOwner,'EQUIP',$item,$equipId);
    verify($worn['shop']['equippedEffect']===$item&&$wornAgain['shop']===$worn['shop']&&$worn['shop']['equipped']==='fox'&&$worn['shop']['coins']===$effectsCoins,'Effect equips freely, replay safe, companion remains equipped');
}
verify(epq_shop_view($db,$effectsOther[2])['ownedEffects']===['none'],'Other players cannot see owned effects');
$before=epq_shop_view($db,$effectsOwner[2]);
http('api/game_state.php',['csrfToken'=>$effectsOwner[1],'state'=>['currentRealmId'=>'maple','playerX'=>440,'shop'=>['ownedEffects'=>['none'],'equippedEffect'=>'none']]],$effectsOwner[0]);
verify(epq_shop_view($db,$effectsOwner[2])===$before,'Map save cannot forge or remove particle ownership');
$db->begin_transaction();epq_shop_mutate($db,$effectsOwner[2],'EQUIP','none',token());$db->rollback();verify(epq_shop_view($db,$effectsOwner[2])===$before,'Effect selection rolls back atomically');
$db->query('UPDATE players SET coins_total=40 WHERE player_id='.(int)$effectsOther[2]);$otherBefore=epq_shop_view($db,$effectsOther[2]);
$db->begin_transaction();epq_shop_mutate($db,$effectsOther[2],'BUY','sakura_trail',token());$db->rollback();
verify(epq_shop_view($db,$effectsOther[2])===$otherBefore,'Effect purchase and currency roll back together');
[, $reloadEffects]=http('api/shop.php',null,$effectsOwner[0]);
verify(count($reloadEffects['shop']['ownedEffects'])===7&&$reloadEffects['shop']['equippedEffect']==='rainbow_trail','Six permanent effects and active choice persist');
shopAction($effectsOwner,'EQUIP','none');
verify(epq_shop_view($db,$effectsOwner[2])['equippedEffect']==='none'&&epq_shop_view($db,$effectsOwner[2])['coins']===$effectsCoins,'Turning effects off is free');
shopAction($effectsOwner,'EQUIP','sakura_trail');$beforeEffectUpgrade=epq_shop_view($db,$effectsOwner[2]);
[, $effectForm]=http('register.php',null,$effectsOwner[0]);preg_match('/name="csrf_token" value="([a-f0-9]{64})"/',$effectForm,$effectUpgradeToken);
verify(http('register.php',['csrf_token'=>$effectUpgradeToken[1],'username'=>'effect_'.substr(token(),0,10),'password'=>'Effect-Passw0rd!','confirm_password'=>'Effect-Passw0rd!'],$effectsOwner[0])[0]===302,'Effect owner can upgrade guest');
[, $effectUpgraded]=http('api/player.php',null,$effectsOwner[0]);
verify($effectUpgraded['player']['playerId']===$effectsOwner[2]&&$effectUpgraded['shop']===$beforeEffectUpgrade,'Guest upgrade preserves particles, companion and Coins');
echo "PASS: six particle effects trusted prices/owner/CSRF, insufficient funds, duplicate/replay/conflict, independent equipment, free disable, rollback, refresh and guest upgrade\n";
