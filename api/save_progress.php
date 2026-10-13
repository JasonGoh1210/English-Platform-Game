<?php
declare(strict_types=1);
require_once __DIR__.'/bootstrap.php';
if ($_SERVER['REQUEST_METHOD']!=='POST') epq_json(['ok'=>false,'error'=>'POST required.'],405);
$body=epq_body();
if (!epq_csrf_is_valid(is_string($body['csrfToken']??null)?$body['csrfToken']:null)) epq_json(['ok'=>false,'error'=>'Invalid request token.'],403);
// No client-supplied currency/XP amounts have authority, including old cached clients.
epq_json(['ok'=>false,'errorCode'=>'VERIFIED_QUEST_REQUIRED','error'=>'请刷新页面，使用已验证的任务或战斗流程。'],400);
