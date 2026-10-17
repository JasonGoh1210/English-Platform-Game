<?php
declare(strict_types=1);

// Hints are issued only for the authenticated player's current battle question.
// Do not include the answer, full sentence order or post-answer explanation.
function epq_question_hint(array $question): array {
    static $examples;
    $examples ??= json_decode((string)file_get_contents(__DIR__.'/../data/question_hints.json'),true,512,JSON_THROW_ON_ERROR);
    $type=$question['type'];
    if($type==='ODD_WORD_OUT') {
        $ordinary=array_values(array_filter($question['words']??[],static fn($word)=>$word!==$question['answer']));
        return ['en'=>'One word that belongs to the group has been ruled out. Compare the meanings of the remaining choices.',
            'zh'=>'已排除一个属于同类的词。比较剩下几个词的意思，找出不同类的一个。',
            'removedWord'=>count($question['words']??[])>2?($ordinary[0]??null):null];
    }
    if($type==='SENTENCE_BUILDER') {
        $order=$question['answerOrder']??[];
        return ['en'=>'Start with these words, then arrange the rest yourself. Think: who → action → what.',
            'zh'=>'可以用下面这些词开头，再自己排列剩下的词。想一想：谁 → 做什么 → 对象。',
            'leadWords'=>array_slice($order,0,max(0,min(3,count($order)-2)))];
    }
    return $examples[$question['id']]??[
        'en'=>'Read the statement in context. Check whether its meaning, direction and grammar agree with what you have learned.',
        'zh'=>'把句子放回情境中理解，检查词义、方向和语法是否与你学过的相符。'];
}
