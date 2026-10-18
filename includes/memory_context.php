<?php
declare(strict_types=1);
function epq_memory_context(array $original,int $stage): array {
    static $variants;$variants??=json_decode((string)file_get_contents(__DIR__.'/../data/memory_contexts.json'),true,512,JSON_THROW_ON_ERROR);
    $id=$original['id']??'';$canonical=null;
    foreach(epq_question_bank() as $q)if($q['id']===$id){$canonical=$q;break;}
    $oldAnswer=$original['answerOrder']??$original['answer']??null;$currentAnswer=$canonical['answerOrder']??$canonical['answer']??null;
    // Changed historical concepts retain their original snapshot, not a different lesson.
    if(!$canonical||$original['type']!==$canonical['type']||$original['question']!==$canonical['question']||$oldAnswer!==$currentAnswer||!isset($variants[$id]))return $original+['memoryContext'=>'historical'];
    $next=$variants[$id][max(0,min(2,$stage))];$next['memoryContext']='transfer';return $next;
}
