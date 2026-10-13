<?php
declare(strict_types=1);
require_once __DIR__.'/bootstrap.php';
require_once __DIR__.'/../includes/google.php';
header('Cache-Control: no-store');
if ($_SERVER['REQUEST_METHOD']!=='POST') epq_json(['ok'=>false,'error'=>'POST required.'],405);
$raw=file_get_contents('php://input');
if ($raw===false || strlen($raw)>20000) epq_json(['ok'=>false,'error'=>'登录请求无效。'],400);
$body=json_decode($raw,true);
if (!is_array($body) || !epq_csrf_is_valid(is_string($body['csrfToken']??null)?$body['csrfToken']:null)) {
    epq_json(['ok'=>false,'error'=>'页面已过期，请刷新后再试。'],403);
}
$clientId=epq_google_client_id();
if ($clientId==='') epq_json(['ok'=>false,'error'=>'Google 登录暂未启用。'],503);
$request=$_SESSION['google_request']??null;
if (!is_array($request) || time()-(int)$request['created']>600
    || (int)($request['user_id']??0)!==(int)($_SESSION['user_id']??0)
    || (int)($request['player_id']??0)!==(int)($_SESSION['player_id']??0)) {
    epq_json(['ok'=>false,'error'=>'登录页面已过期，请刷新后再试。'],409);
}
unset($_SESSION['google_request']);
if (!is_string($body['credential']??null) || strlen($body['credential'])>16384
    || preg_match('/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/D',$body['credential'])!==1) {
    epq_json(['ok'=>false,'error'=>'Google 登录凭证无效，请刷新后重试。'],400);
}
try {
    $claims=epq_verify_google_token($body['credential'],epq_google_certificates(),$clientId,(string)$request['nonce']);
    $owner=$request['mode']==='link'?['user_id'=>$request['user_id'],'player_id'=>$request['player_id']]:null;
    $account=epq_google_identity_account(epq_db(),$claims,$owner);
    epq_clear_guest_cookie();
    epq_authenticate_session($account,(int)$account['story_intro_seen']!==1);
    epq_json(['ok'=>true,'redirect'=>epq_home_url()]);
} catch (DomainException $e) { epq_json(['ok'=>false,'error'=>$e->getMessage()],409); }
catch (Throwable $e) { error_log('[EPQ Google login] '.get_class($e)); epq_json(['ok'=>false,'error'=>'Google 登录暂时无法完成，请稍后再试。'],503); }
