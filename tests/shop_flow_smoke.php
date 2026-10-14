<?php
declare(strict_types=1);
require __DIR__.'/dungeons_flow_smoke.php';
require_once __DIR__.'/../includes/shop.php';
$buyer=guest('ShopHero');$stranger=guest('ShopStranger');
function shopAction(array $actor,string $action,string $item,?string $id=null,array $extra=[]): array {
    return http('api/shop.php',array_merge($extra,['csrfToken'=>$actor[1],'action'=>$action,'item'=>$item,'requestId'=>$id??token()]),$actor[0]);
}
[, $initial]=http('api/shop.php',null,$buyer[0]);
verify($initial['shop']===['potions'=>0,'owned'=>['owl'],'equipped'=>'owl','coins'=>0],'Free guide and empty inventory, no currency grant');
verify(shopAction($buyer,'BUY','potion')[0]===409,'Insufficient Coins reject purchase');
verify(shopAction($buyer,'EQUIP','fox')[0]===409,'Cannot equip unowned skin');
verify(shopAction($buyer,'BUY','admin')[0]===400,'Product allowlist');
verify(http('api/shop.php',['action'=>'BUY','item'=>'potion','requestId'=>token(),'csrfToken'=>'invalid'],$buyer[0])[0]===403,'Shop CSRF');
$db->query('UPDATE players SET coins_total=500 WHERE player_id='.(int)$buyer[2]);
$purchase=token();[, $bought]=shopAction($buyer,'BUY','potion',$purchase,['price'=>0,'quantity'=>99,'player_id'=>$stranger[2]]);
verify($bought['shop']['potions']===1 && $bought['shop']['coins']===488,'Trusted price/quantity/owner');
[, $replay]=shopAction($buyer,'BUY','potion',$purchase);verify($replay['shop']===$bought['shop'],'Lost purchase response cannot charge twice');
verify(shopAction($buyer,'BUY','fox',$purchase)[0]===409,'Request ID cannot change payload');
$expected=488;
foreach(epq_shop_catalog() as $item=>$product)if($product['kind']==='companion'&&$item!=='owl'){
    $id=token();[, $skin]=shopAction($buyer,'BUY',$item,$id);$expected-=$product['price'];
    verify($skin['shop']['coins']===$expected && in_array($item,$skin['shop']['owned'],true),'Own a different skin after its exact price');
    verify(shopAction($buyer,'BUY',$item)[0]===409,'Already-owned skin cannot charge again');
    [, $equipped]=shopAction($buyer,'EQUIP',$item);verify($equipped['shop']['equipped']===$item && $equipped['shop']['coins']===$expected,'Equip is free and durable');
}
[, $strangerView]=http('api/shop.php',null,$stranger[0]);verify($strangerView['shop']['owned']===['owl'],'Skins and stock are owned by the session player');
http('api/game_state.php',['csrfToken'=>$buyer[1],'state'=>['currentRealmId'=>'maple','playerX'=>440,'shop'=>['potions'=>99,'equipped'=>'owl']]],$buyer[0]);
[, $afterForgery]=http('api/player.php',null,$buyer[0]);verify($afterForgery['shop']['potions']===1 && $afterForgery['shop']['equipped']==='bunny','Map saves cannot forge inventory or selection');
$fight=token();action($buyer,$fight,'START',['enemyId'=>'slime-01']);
verify(action($buyer,$fight,'POTION')[0]===409,'Full HP cannot consume stock');
[, $question]=action($buyer,$fight,'QUESTION');$wrong=$question['battle']['question']['type']==='TRUE_FALSE'?!validAnswer($question['battle']['question']):'wrong';
for($i=0;$i<5;$i++){
    if($i>0)[, $question]=action($buyer,$fight,'QUESTION');
    $wrong=$question['battle']['question']['type']==='TRUE_FALSE'?!validAnswer($question['battle']['question']):'wrong';
    action($buyer,$fight,'ANSWER',['questionToken'=>$question['battle']['questionToken'],'answer'=>$wrong]);
}
[, $live]=action($buyer,$fight,'QUESTION');action($buyer,$fight,'PAUSE');
verify(action($buyer,$fight,'POTION')[0]===409,'Settings prevent item use');action($buyer,$fight,'RESUME');
$use=token();[, $healed]=action($buyer,$fight,'POTION',[], $use);
verify($healed['battle']['playerHp']===90 && $healed['shop']['potions']===0 && $healed['shop']['coins']===$expected,'Potion restores40HP once without spending more Coins');
[, $repeated]=action($buyer,$fight,'POTION',[],$use);verify(sameReceipt($healed,$repeated),'Potion replay neither consumes twice nor charges');
verify(action($stranger,$fight,'POTION')[0]===404,'Potion battle ownership');
action($buyer,$fight,'RESUME');
$wrong=$live['battle']['question']['type']==='TRUE_FALSE'?!validAnswer($live['battle']['question']):'wrong';
action($buyer,$fight,'ANSWER',['questionToken'=>$live['battle']['questionToken'],'answer'=>$wrong]);
verify(action($buyer,$fight,'POTION')[0]===409,'Empty stock prevents healing');
$beforeRollback=epq_shop_view($db,$buyer[2]);$db->begin_transaction();epq_shop_mutate($db,$buyer[2],'BUY','potion',token());$db->rollback();
verify(epq_shop_view($db,$buyer[2])===$beforeRollback,'Purchase balance and inventory roll back together');
[, $reload]=http('api/shop.php',null,$buyer[0]);verify($reload['shop']['equipped']==='bunny' && count($reload['shop']['owned'])===6,'Six skins, equip and stock persist on reload');
[, $form]=http('register.php',null,$buyer[0]);preg_match('/name="csrf_token" value="([a-f0-9]{64})"/',$form,$upgradeToken);
[$upgraded]=http('register.php',['csrf_token'=>$upgradeToken[1],'username'=>'shop_'.substr(token(),0,10),'password'=>'Shop-Passw0rd!','confirm_password'=>'Shop-Passw0rd!'],$buyer[0]);
verify($upgraded===302,'Upgrade the same guest account');[, $upgradedProfile]=http('api/player.php',null,$buyer[0]);
verify($upgradedProfile['player']['playerId']===$buyer[2] && $upgradedProfile['shop']===$reload['shop'],'Guest upgrade preserves all skins, stock, selection and Coins');
echo "PASS: shop trusted prices/quantity/owner/CSRF, six skins/equip/persistence, replay/conflict/rollback, potion HP/stock/settings/empty bag and unchanged Coin charge\n";
