<?php
declare(strict_types=1);
require_once __DIR__.'/../includes/battle_rules.php';
require_once __DIR__.'/../includes/memory_context.php';
function contextCheck(bool $ok,string $message):void{if(!$ok)throw new RuntimeException($message);}
$total=0;
foreach(epq_question_bank() as $original)for($stage=0;$stage<3;$stage++){
    $q=epq_memory_context($original,$stage);contextCheck(($q['memoryContext']??null)==='transfer','Every current concept has an authored transfer context');
    contextCheck($q['question']!==$original['question']&&$q['timed']===false&&$q['xp']===0,'Context changes, remains untimed and carries no battle reward');
    $answer=$q['answerOrder']??$q['answer'];contextCheck(epq_answer_correct($q,$answer),'Context answer grades correctly');contextCheck(!epq_answer_correct($q,'definitely wrong'),'Wrong context answers do not grade correctly');
    if($q['type']==='SENTENCE_BUILDER'){$words=$q['words'];$ordered=$q['answerOrder'];sort($words);sort($ordered);contextCheck($words===$ordered,'Sentence words exactly match the answer multiset');contextCheck($q['answerOrder']!==$original['answerOrder'],'Sentence review changes the message, not only the heading');}
    else contextCheck(count($q['words'])===4&&count(array_unique($q['words']))===4&&in_array($q['answer'],$q['words'],true),'Context choices are distinct and include the trusted answer');
    contextCheck(!isset(epq_public_question($q)['answer']),'Public context hides its answer');$total++;
}
$old=epq_question_bank()[0];$old['question']='An older explanation and word concept.';$old['answer']=false;$preserved=epq_memory_context($old,2);contextCheck($preserved['question']===$old['question']&&$preserved['answer']===false&&$preserved['memoryContext']==='historical','An altered historical concept remains its own original snapshot');
echo 'PASS: '.$total." authored contexts, strict answers, exact sentence bags, safe public projection and changed-history compatibility\n";
