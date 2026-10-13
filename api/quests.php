<?php
declare(strict_types=1);
require_once __DIR__.'/bootstrap.php';
require_once __DIR__.'/../includes/quests.php';
header('Cache-Control: no-store');
try {
    if ($_SERVER['REQUEST_METHOD']!=='POST') epq_json(['ok'=>false,'error'=>'POST required.'],405);
    $raw=file_get_contents('php://input');
    if ($raw===false || strlen($raw)>8192) epq_json(['ok'=>false,'error'=>'Payload too large.'],413);
    $body=json_decode($raw,true,32,JSON_THROW_ON_ERROR);
    if (!is_array($body)) throw new InvalidArgumentException('Object required.');
    if (!epq_csrf_is_valid(is_string($body['csrfToken']??null)?$body['csrfToken']:null)) epq_json(['ok'=>false,'error'=>'请刷新页面后重试。'],403);
    $request=$body['requestId']??null;
    if (!is_string($request) || !preg_match('/\A[a-f0-9]{32}\z/',$request)) throw new InvalidArgumentException('Request token required.');
    $db=epq_db();$playerId=epq_current_player_id($db);mysqli_report(MYSQLI_REPORT_ERROR|MYSQLI_REPORT_STRICT);
    $db->begin_transaction();
    $lock=$db->prepare('SELECT player_id FROM players WHERE player_id=? FOR UPDATE');
    $lock->bind_param('i',$playerId);$lock->execute();$lock->get_result()->free();
    $hash=hash('sha256',json_encode([$body['action']??null,$body['npcId']??null,$body['runId']??null,
        $body['questionToken']??null,$body['answer']??null],JSON_THROW_ON_ERROR));
    $stmt=$db->prepare('SELECT payload_hash,response_json FROM verified_quest_events WHERE player_id=? AND request_id=?');
    $stmt->bind_param('is',$playerId,$request);$stmt->execute();$old=$stmt->get_result()->fetch_assoc();
    if ($old) {
        if (!hash_equals($old['payload_hash'],$hash)) throw new DomainException('领取凭证不能用于不同请求。');
        $response=json_decode($old['response_json'],true,512,JSON_THROW_ON_ERROR);
        // Preserve the outcome while reporting current balances/chapter, never stale receipt balances.
        $response['player']=epq_reward_balance($db,$playerId);$response['chapterStep']=epq_story_step($db,$playerId);
    } else {
        $response=epq_quest_action($db,$playerId,$body);
        $json=json_encode($response,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE);
        $stmt=$db->prepare('INSERT INTO verified_quest_events (player_id,request_id,payload_hash,response_json) VALUES (?,?,?,?)');
        $stmt->bind_param('isss',$playerId,$request,$hash,$json);$stmt->execute();
    }
    $db->commit();epq_json($response);
} catch (Throwable $e) {
    if (isset($db)) { try {$db->rollback();} catch(Throwable $ignored) {} }
    if ($e instanceof DomainException) epq_json(['ok'=>false,'error'=>$e->getMessage()],409);
    if ($e instanceof InvalidArgumentException || $e instanceof JsonException) epq_json(['ok'=>false,'error'=>'任务请求无效。'],400);
    error_log('[EPQ quests] '.$e->getMessage());
    epq_json(['ok'=>false,'errorCode'=>$e instanceof mysqli_sql_exception&&$e->getCode()===1146?'MIGRATION_REQUIRED':'QUEST_UNAVAILABLE',
        'error'=>'任务暂时无法确认，请稍后重试。'],503);
}
