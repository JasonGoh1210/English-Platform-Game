<?php
declare(strict_types=1);
require_once __DIR__.'/../includes/battle_rules.php';
require_once __DIR__.'/../includes/combat_depth.php';
require_once __DIR__.'/../includes/quests.php';
function depthCheck(bool $ok,string $label):void{if(!$ok)throw new RuntimeException($label);}
$q=['skill'=>'grammar'];$state=['combat'=>epq_combat_start('castle-warden-01',['grammarGuardLevel'=>3,'sentenceSurgeLevel'=>2]),'question'=>$q,'focusUsed'=>false];
$hit=['correct'=>true,'damage'=>30];epq_combat_answer($state,$q,$hit,14);depthCheck($hit['damage']===24&&$state['combat']['barrier']===1&&$state['combat']['shield']===6,'Grammar chips barrier and gains shield');
$hit=['correct'=>true,'damage'=>30];epq_combat_answer($state,$q,$hit,14);depthCheck($state['combat']['barrier']===0&&$state['combat']['shield']===12,'Barrier breaks and shield caps');
epq_combat_choice($state,'GUARD');$miss=['correct'=>false,'damage'=>0];epq_combat_answer($state,$q,$miss,25);depthCheck($miss['enemyDamage']===1&&$state['combat']['shield']===0&&!$state['combat']['guard'],'Guard rounds up then shield absorbs, consumed once');
$state['combat']['energy']=3;epq_combat_choice($state,'SURGE');$hit=['correct'=>true,'damage'=>30];epq_combat_answer($state,['skill'=>'sentenceConstruction'],$hit,14);depthCheck($hit['damage']===42&&$state['combat']['energy']===1&&!$state['combat']['surge'],'Sentence surge consumes3 then correct sentence recharges1');
$legacy=['focusUsed'=>false];$hit=['correct'=>true,'damage'=>30];epq_combat_answer($legacy,$q,$hit,14);depthCheck($hit['damage']===30&&!isset($legacy['combat']),'Legacy active battles remain unchanged');
$state=['combat'=>epq_combat_start('bat-01',[]),'question'=>$q,'focusUsed'=>false];$state['combat']['turn']=3;$hit=['correct'=>true,'damage'=>20];epq_combat_answer($state,$q,$hit,10);depthCheck($hit['damage']===26&&in_array('dive-interrupted',$hit['combatEvents'],true),'Telegraphed dive rewards a correct interrupt');
$state['focusUsed']=true;$blocked=false;try{epq_combat_choice($state,'GUARD');}catch(DomainException $e){$blocked=true;}depthCheck($blocked,'Focus and Guard cannot be stacked');
$oldRun=['completedLevels'=>0,'seen'=>[]];
for($phase=0;$phase<3;$phase++){$oldRun['completedLevels']=$phase;epq_issue_typing_word($oldRun);depthCheck(!isset($oldRun['word']['mode']),'Old unversioned castle runs keep spelling for all three seals');}
$newRun=['challengeVersion'=>1,'completedLevels'=>0,'seen'=>[]];epq_issue_typing_word($newRun);
depthCheck($newRun['word']['mode']==='meaning'&&count(array_unique($newRun['word']['choices']))===4&&in_array($newRun['word']['answer'],$newRun['word']['choices'],true),'Meaning phase has exactly four distinct choices including the answer');
$newRun['completedLevels']=1;epq_issue_typing_word($newRun);$sentence=$newRun['word'];
depthCheck($sentence['mode']==='sentence'&&epq_typing_answer_correct($sentence,'  '.strtoupper($sentence['answer']).'  '),'Second seal grades a full normalized sentence');
depthCheck(!epq_typing_answer_correct($sentence,array_reverse($sentence['words']))&&!epq_typing_answer_correct($sentence,'wrong'),'Incorrect or non-string sentence answers are rejected');
$newRun['completedLevels']=2;epq_issue_typing_word($newRun);depthCheck($newRun['word']['mode']==='spelling','Third seal returns to spelling');
echo "PASS: barriers,grammar shield,guard rounding/cap,energy/surge,legacy snapshots,dive interrupt,mutual choices and mixed/legacy castle phases\n";
