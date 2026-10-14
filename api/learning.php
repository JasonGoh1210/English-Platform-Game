<?php
declare(strict_types=1);
require_once __DIR__.'/bootstrap.php';
require_once __DIR__.'/../includes/learning.php';
header('Cache-Control: no-store');
try {
    $method = $_SERVER['REQUEST_METHOD'];
    if (!in_array($method, ['GET','POST'], true)) epq_json(['ok'=>false,'error'=>'GET or POST required.'],405);
    $db = epq_db(); $playerId = epq_current_player_id($db);
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    if ($method === 'GET') {
        $cursor = $_GET['before'] ?? '0';
        if (!is_string($cursor) || !preg_match('/\A[0-9]{1,18}\z/', $cursor)) {
            epq_json(['ok'=>false,'error'=>'Invalid cursor.'],400);
        }
        epq_json(array_merge(['ok'=>true,'stats'=>epq_learning_stats($db,$playerId)],
            epq_learning_mistakes($db,$playerId,(int)$cursor)));
    }
    $raw = file_get_contents('php://input');
    if ($raw === false || strlen($raw)>8192) epq_json(['ok'=>false,'error'=>'Payload too large.'],413);
    $body = json_decode($raw,true,32,JSON_THROW_ON_ERROR);
    if (!is_array($body)) throw new InvalidArgumentException('Object required.');
    if (!epq_csrf_is_valid(is_string($body['csrfToken']??null)?$body['csrfToken']:null)) {
        epq_json(['ok'=>false,'error'=>'Invalid request token.'],403);
    }
    $id = $body['attemptId'] ?? null;
    if (!is_int($id) || $id<=0) throw new InvalidArgumentException('Invalid attempt.');
    epq_json(['ok'=>true,'practice'=>epq_learning_practice($db,$playerId,$id,$body['answer']??null)]);
} catch (OutOfBoundsException $e) {
    epq_json(['ok'=>false,'error'=>'Mistake not found.'],404);
} catch (InvalidArgumentException | JsonException $e) {
    epq_json(['ok'=>false,'error'=>'Invalid practice request.'],400);
} catch (Throwable $e) {
    error_log('[EPQ learning] '.$e->getMessage());
    epq_json(['ok'=>false,'error'=>'Learning records are temporarily unavailable.'],503);
}
