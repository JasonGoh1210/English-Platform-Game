<?php
declare(strict_types=1);
require_once __DIR__.'/bootstrap.php';
require_once __DIR__.'/../includes/quests.php';
require_once __DIR__.'/../includes/adventure.php';
header('Cache-Control: no-store');
if($_SERVER['REQUEST_METHOD']!=='GET')epq_json(['ok'=>false],405);
try{$db=epq_db();$id=epq_current_player_id($db);mysqli_report(MYSQLI_REPORT_ERROR|MYSQLI_REPORT_STRICT);epq_json(['ok'=>true,'adventure'=>epq_adventure_view($db,$id)]);}
catch(Throwable $e){error_log('[EPQ adventure] '.$e->getMessage());epq_json(['ok'=>false,'error'=>'冒险记录暂时无法读取。 / Adventure unavailable.'],503);}
