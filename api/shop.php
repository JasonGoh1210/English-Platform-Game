<?php
declare(strict_types=1);
require_once __DIR__.'/bootstrap.php';
require_once __DIR__.'/../includes/shop.php';
header('Cache-Control: no-store');
try {
    $method=$_SERVER['REQUEST_METHOD'];
    if(!in_array($method,['GET','POST'],true)) epq_json(['ok'=>false,'error'=>'GET or POST required.'],405);
    $db=epq_db();$playerId=epq_current_player_id($db);mysqli_report(MYSQLI_REPORT_ERROR|MYSQLI_REPORT_STRICT);
    if($method==='GET') {$db->begin_transaction();$shop=epq_shop_view($db,$playerId);$db->commit();epq_json(['ok'=>true,'shop'=>$shop]);}
    $raw=file_get_contents('php://input');if($raw===false || strlen($raw)>2048) throw new InvalidArgumentException();
    $body=json_decode($raw,true,16,JSON_THROW_ON_ERROR);if(!is_array($body)) throw new InvalidArgumentException();
    if(!epq_csrf_is_valid(is_string($body['csrfToken']??null)?$body['csrfToken']:null)) epq_json(['ok'=>false,'error'=>'Invalid request token.'],403);
    foreach(['action','item','requestId'] as $key) if(!is_string($body[$key]??null)) throw new InvalidArgumentException();
    $db->begin_transaction();$shop=epq_shop_mutate($db,$playerId,$body['action'],$body['item'],$body['requestId']);$db->commit();
    epq_json(['ok'=>true,'shop'=>$shop]);
} catch(Throwable $e) {
    if(isset($db)) {try{$db->rollback();}catch(Throwable){}}
    if($e instanceof DomainException) epq_json(['ok'=>false,'errorCode'=>$e->getMessage()],409);
    if($e instanceof InvalidArgumentException || $e instanceof JsonException) epq_json(['ok'=>false,'error'=>'Invalid shop request.'],400);
    error_log('[EPQ shop] '.$e->getMessage());epq_json(['ok'=>false,'errorCode'=>'SHOP_UNAVAILABLE'],503);
}
