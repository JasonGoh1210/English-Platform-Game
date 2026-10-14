<?php
declare(strict_types=1);
require_once __DIR__.'/bootstrap.php';
require_once __DIR__.'/../includes/skills.php';
header('Cache-Control: no-store');
try {
    $method=$_SERVER['REQUEST_METHOD'];
    if (!in_array($method,['GET','POST'],true)) epq_json(['ok'=>false,'error'=>'GET or POST required.'],405);
    $db=epq_db(); $playerId=epq_current_player_id($db);
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    if ($method==='GET') epq_json(['ok'=>true,'skills'=>epq_skills_view($db,$playerId)]);
    $raw=file_get_contents('php://input');
    if ($raw===false || strlen($raw)>2048) throw new InvalidArgumentException('Invalid payload.');
    $body=json_decode($raw,true,16,JSON_THROW_ON_ERROR);
    if (!is_array($body)) throw new InvalidArgumentException('Object required.');
    if (!epq_csrf_is_valid(is_string($body['csrfToken']??null)?$body['csrfToken']:null)) {
        epq_json(['ok'=>false,'error'=>'Invalid request token.'],403);
    }
    if (($body['skill']??null)!=='word-strike' || !is_int($body['targetLevel']??null)) throw new InvalidArgumentException('Invalid skill.');
    $db->begin_transaction();
    $changed=epq_unlock_word_strike($db,$playerId,$body['targetLevel']);
    $response=['ok'=>true,'changed'=>$changed,'skills'=>epq_skills_view($db,$playerId)];
    $db->commit(); epq_json($response);
} catch (Throwable $e) {
    if (isset($db)) { try { $db->rollback(); } catch (Throwable) {} }
    if ($e instanceof DomainException) epq_json(['ok'=>false,'errorCode'=>$e->getMessage()],409);
    if ($e instanceof InvalidArgumentException || $e instanceof JsonException) epq_json(['ok'=>false,'error'=>'Invalid skill request.'],400);
    error_log('[EPQ skills] '.$e->getMessage());
    epq_json(['ok'=>false,'errorCode'=>'SKILLS_UNAVAILABLE'],503);
}
