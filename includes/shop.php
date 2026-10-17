<?php
declare(strict_types=1);

function epq_shop_catalog(): array {
    static $catalog;
    return $catalog ??= json_decode((string)file_get_contents(__DIR__.'/../data/shop.json'),true,512,JSON_THROW_ON_ERROR);
}

// Existing server-owned coin ledger stores purchases, consumption and selection.
// Client map saves cannot alter inventory. Caller locks the player for mutations.
function epq_shop_events(mysqli $db,int $playerId): array {
    $stmt=$db->prepare("SELECT description FROM player_coin_transactions WHERE player_id=? AND source_type='SHOP_PURCHASE'
        AND description LIKE 'EPQ:shop:%' ORDER BY coin_transaction_id");
    $stmt->bind_param('i',$playerId);$stmt->execute();$events=[];
    foreach($stmt->get_result()->fetch_all(MYSQLI_ASSOC) as $row) {
        $event=json_decode(substr($row['description'],9),true);
        if(is_array($event)) $events[]=$event;
    }
    return $events;
}
function epq_shop_inventory(array $events): array {
    $owned=['owl'];$potions=0;$hintPotions=0;$equipped='owl';$ownedEffects=['none'];$equippedEffect='none';
    foreach($events as $event) {
        $item=$event['item']??'';$action=$event['action']??'';
        if($action==='BUY' && $item==='potion') $potions++;
        elseif($action==='USE' && $item==='potion') $potions--;
        elseif($action==='BUY' && $item==='hint_potion') $hintPotions++;
        elseif($action==='USE' && $item==='hint_potion') $hintPotions--;
        elseif($action==='BUY' && (epq_shop_catalog()[$item]['kind']??null)==='companion') $owned[]=$item;
        elseif($action==='BUY' && (epq_shop_catalog()[$item]['kind']??null)==='effect') $ownedEffects[]=$item;
        elseif($action==='EQUIP' && in_array($item,$owned,true)) $equipped=$item;
        elseif($action==='EQUIP' && in_array($item,$ownedEffects,true)) $equippedEffect=$item;
    }
    return ['potions'=>max(0,$potions),'hintPotions'=>max(0,$hintPotions),'owned'=>array_values(array_unique($owned)),'equipped'=>$equipped,
        'ownedEffects'=>array_values(array_unique($ownedEffects)),'equippedEffect'=>$equippedEffect];
}
function epq_shop_view(mysqli $db,int $playerId): array {
    $stmt=$db->prepare('SELECT coins_total FROM players WHERE player_id=?');$stmt->bind_param('i',$playerId);$stmt->execute();
    $player=$stmt->get_result()->fetch_assoc();
    return epq_shop_inventory(epq_shop_events($db,$playerId))+['coins'=>(int)$player['coins_total']];
}
function epq_shop_record(mysqli $db,int $playerId,array $event,int $amount=0): void {
    $description='EPQ:shop:'.json_encode($event,JSON_THROW_ON_ERROR|JSON_UNESCAPED_SLASHES);
    $stmt=$db->prepare("INSERT INTO player_coin_transactions(player_id,amount,source_type,description) VALUES (?,?,'SHOP_PURCHASE',?)");
    $stmt->bind_param('iis',$playerId,$amount,$description);$stmt->execute();
}
function epq_shop_mutate(mysqli $db,int $playerId,string $action,string $item,string $requestId): array {
    $catalog=epq_shop_catalog();
    if(!isset($catalog[$item]) || !in_array($action,['BUY','EQUIP'],true) || !preg_match('/^[a-f0-9]{32}$/D',$requestId)) throw new InvalidArgumentException('Invalid shop request.');
    $stmt=$db->prepare('SELECT coins_total FROM players WHERE player_id=? FOR UPDATE');$stmt->bind_param('i',$playerId);$stmt->execute();
    if(!$stmt->get_result()->fetch_assoc()) throw new RuntimeException('Player missing.');
    $events=epq_shop_events($db,$playerId);
    foreach($events as $event) if(($event['id']??null)===$requestId) {
        if(($event['action']??null)!==$action || ($event['item']??null)!==$item) throw new DomainException('SHOP_REQUEST_CONFLICT');
        return epq_shop_view($db,$playerId);
    }
    $inventory=epq_shop_inventory($events);$product=$catalog[$item];$amount=0;
    $ownedItems=$product['kind']==='effect'?$inventory['ownedEffects']:$inventory['owned'];
    if($action==='EQUIP') {
        if(!in_array($product['kind'],['companion','effect'],true) || !in_array($item,$ownedItems,true)) throw new DomainException('SKIN_NOT_OWNED');
    } else {
        if(in_array($product['kind'],['companion','effect'],true) && in_array($item,$ownedItems,true)) throw new DomainException('SKIN_ALREADY_OWNED');
        if($item==='potion' && $inventory['potions']>=99) throw new DomainException('POTION_LIMIT');
        if($item==='hint_potion' && $inventory['hintPotions']>=99) throw new DomainException('POTION_LIMIT');
        $price=$product['price'];$amount=-$price;
        $pay=$db->prepare('UPDATE players SET coins_total=coins_total-? WHERE player_id=? AND coins_total>=?');
        $pay->bind_param('iii',$price,$playerId,$price);$pay->execute();
        if($pay->affected_rows!==1) throw new DomainException('NOT_ENOUGH_COINS');
    }
    epq_shop_record($db,$playerId,['id'=>$requestId,'action'=>$action,'item'=>$item],$amount);
    return epq_shop_view($db,$playerId);
}
function epq_use_potion(mysqli $db,int $playerId,string $requestId): void {
    if(epq_shop_view($db,$playerId)['potions']<1) throw new DomainException('NO_POTIONS');
    epq_shop_record($db,$playerId,['id'=>$requestId,'action'=>'USE','item'=>'potion']);
}
function epq_use_hint_potion(mysqli $db,int $playerId,string $requestId): void {
    if(epq_shop_view($db,$playerId)['hintPotions']<1) throw new DomainException('NO_HINT_POTIONS');
    epq_shop_record($db,$playerId,['id'=>$requestId,'action'=>'USE','item'=>'hint_potion']);
}
