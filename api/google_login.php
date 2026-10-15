<?php
declare(strict_types=1);
require_once __DIR__.'/bootstrap.php';
require_once __DIR__.'/../includes/google.php';
header('Cache-Control: no-store');
if($_SERVER['REQUEST_METHOD']==='GET'){
    $id=$_GET['requestId']??'';
    if(!is_string($id)||preg_match('/\A[a-f0-9]{32}\z/D',$id)!==1)epq_json(['ok'=>false,'error'=>'Invalid request.'],400);
    $completed=epq_google_completed_request($id);
    epq_json(['ok'=>true,'completed'=>$completed,'redirect'=>$completed?epq_home_url():null]);
}
if ($_SERVER['REQUEST_METHOD']!=='POST') epq_json(['ok'=>false,'error'=>'POST required.'],405);
$raw=file_get_contents('php://input');
if ($raw===false || strlen($raw)>20000) epq_json(['ok'=>false,'error'=>'登录请求无效。'],400);
$body=json_decode($raw,true);
if (!is_array($body) || !epq_csrf_is_valid(is_string($body['csrfToken']??null)?$body['csrfToken']:null)) {
    epq_json(['ok'=>false,'errorCode'=>'GOOGLE_PAGE_EXPIRED','error'=>'页面已过期，请刷新后再试。'],403);
}
$clientId=epq_google_client_id();
if ($clientId==='') epq_json(['ok'=>false,'errorCode'=>'GOOGLE_DISABLED','error'=>'Google 登录暂未启用。'],503);
try{
    if(isset($body['requestId'])&&!is_string($body['requestId']))throw new DomainException('GOOGLE_PAGE_EXPIRED');
    $request=epq_google_pending_request($body['requestId']??null);
}catch(DomainException $e){epq_json(['ok'=>false,'errorCode'=>'GOOGLE_PAGE_EXPIRED','error'=>'登录页面已过期，请刷新后再试。'],409);}
if (!is_string($body['credential']??null) || strlen($body['credential'])>16384
    || preg_match('/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/D',$body['credential'])!==1) {
    epq_json(['ok'=>false,'error'=>'Google 登录凭证无效，请刷新后重试。'],400);
}
try {
    $header=json_decode(epq_google_decode(explode('.',$body['credential'])[0]),true,16,JSON_THROW_ON_ERROR);
    if(!is_array($header)||($header['alg']??null)!=='RS256'||!is_string($header['kid']??null)||strlen($header['kid'])>128)throw new DomainException('Google 登录凭证无效，请重新选择账号。');
    $claims=epq_verify_google_token($body['credential'],epq_google_certificates($header['kid']),$clientId,(string)$request['nonce']);
    $owner=$request['mode']==='link'?['user_id'=>$request['user_id'],'player_id'=>$request['player_id']]:null;
    $account=epq_google_identity_account(epq_db(),$claims,$owner);
    epq_clear_guest_cookie();
    epq_authenticate_session($account,(int)$account['story_intro_seen']!==1);
    epq_google_complete_request($request);
    epq_json(['ok'=>true,'redirect'=>epq_home_url()]);
} catch (DomainException $e) { epq_json(['ok'=>false,'errorCode'=>'GOOGLE_REJECTED','error'=>$e->getMessage()],409); }
catch(JsonException $e){epq_json(['ok'=>false,'errorCode'=>'GOOGLE_REJECTED','error'=>'Google 登录凭证无效，请重新选择账号。'],400);}
catch (Throwable $e) { error_log('[EPQ Google login] '.get_class($e)); epq_json(['ok'=>false,'error'=>'Google 登录暂时无法完成，请稍后再试。'],503); }
