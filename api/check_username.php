<?php
declare(strict_types=1);
require_once __DIR__.'/bootstrap.php';
require_once __DIR__.'/../includes/account_rules.php';
header('Cache-Control: no-store');
if($_SERVER['REQUEST_METHOD']!=='POST')epq_json(['ok'=>false,'error'=>'POST required.'],405);
$raw=file_get_contents('php://input');
if(!is_string($raw)||strlen($raw)>1024)epq_json(['ok'=>false,'error'=>'请求无效。'],400);
$body=json_decode($raw,true);
if(!is_array($body)||!epq_csrf_is_valid(epq_form_text($body,'csrfToken')))epq_json(['ok'=>false,'error'=>'页面已过期，请刷新后重试。'],403);
$username=strtolower(trim(epq_form_text($body,'username')));$error=epq_username_error($username);
if($error!=='')epq_json(['ok'=>false,'error'=>$error],400);
try{
    $conflict=epq_account_conflict(epq_db(),$username,'',epq_is_guest()?(int)$_SESSION['user_id']:null);
    epq_json(['ok'=>true,'username'=>$username,'available'=>$conflict===null]);
}catch(Throwable $e){
    error_log('[EPQ username check] '.get_class($e));
    epq_json(['ok'=>false,'error'=>'暂时无法检查，提交时将再次确认。'],503);
}
