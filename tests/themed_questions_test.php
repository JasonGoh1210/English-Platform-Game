<?php
declare(strict_types=1);
require_once __DIR__.'/../includes/battle_rules.php';
function topicCheck(bool $condition, string $label): void {
    if (!$condition) throw new RuntimeException($label);
}
$bank = epq_question_bank();
$ids = [];
$fingerprints = [];
$realms = ['maple'=>0,'forest'=>0,'camp'=>0,'ruins'=>0];
foreach ($bank as $q) {
    topicCheck(!isset($ids[$q['id']]), 'Unique question ID: '.$q['id']);
    $ids[$q['id']] = true;
    if (!isset($q['realm'])) continue;
    topicCheck(isset($realms[$q['realm']]), 'Known question realm');
    $realms[$q['realm']]++;
    foreach (['question','questionZh','explanation','explanationZh'] as $key) topicCheck(is_string($q[$key]??null) && $q[$key]!=='', 'Bilingual content: '.$q['id']);
    $words = $q['words'] ?? [];
    $sorted = $words; sort($sorted);
    $fingerprint = json_encode([$q['type'], $q['question'], $sorted]);
    topicCheck(!isset($fingerprints[$fingerprint]), 'Distinct question content: '.$q['id']);
    $fingerprints[$fingerprint] = true;
    if ($q['type']==='TRUE_FALSE') topicCheck(is_bool($q['answer']), 'Typed Boolean answer');
    else {
        topicCheck(count($words)===count(array_unique($words)) && count($words)>=4, 'Unique word choices');
        if ($q['type']==='ODD_WORD_OUT') topicCheck(count($words)===4 && in_array($q['answer'],$words,true), 'Odd answer is one offered word');
        else {
            $answer = $q['answerOrder']; sort($answer);
            topicCheck($answer===$sorted, 'Sentence uses every offered word exactly once');
            topicCheck(!empty($q['prompt']) && !empty($q['promptZh']), 'Sentence target is unambiguous');
        }
    }
    $rewards=['EASY'=>[10,5,1],'MEDIUM'=>[15,8,2],'HARD'=>[20,10,3]][$q['difficulty']];
    topicCheck([$q['xp'],$q['coins'],$q['englishPower']]===$rewards, 'Trusted reward tiers preserved');
    $prepared = epq_prepare_question($q);
    topicCheck(epq_answer_correct($prepared,$q['answerOrder']??$q['answer']), 'Shuffle keeps correct grading');
    if ($q['type']==='SENTENCE_BUILDER') topicCheck($prepared['words']!==$q['answerOrder'], 'Sentence not offered in answer order');
}
foreach ($realms as $realm=>$count) topicCheck($count===60, 'Sixty questions in '.$realm);
foreach (array_keys($realms) as $realm) {
    $statements = array_values(array_filter($bank,static fn($q)=>($q['realm']??null)===$realm && $q['type']==='TRUE_FALSE'));
    topicCheck(count($statements)===30 && count(array_filter($statements,static fn($q)=>$q['answer']))===15, 'Balanced true/false statements in '.$realm);
}
$reachable = [];
foreach (epq_battle_enemies() as $enemy) {
  foreach(epq_question_progression()[$enemy['realm']]['levels'] as $difficulty){
    $pool = epq_question_pool($enemy, [],[],$difficulty);
    $expectedCount = count(array_filter($bank,static fn($q)=>($q['realm']??null)===$enemy['realm']&&$q['difficulty']===$difficulty&&in_array($q['type'],$enemy['types'],true)));
    topicCheck(count($pool)===$expectedCount && $expectedCount>=15, 'All matching themed questions reachable by stage');
    foreach ($pool as $q) {
        topicCheck($q['realm']===$enemy['realm'] && $q['difficulty']===$difficulty && in_array($q['type'],$enemy['types'],true), 'Realm/difficulty/type selection');
        $reachable[$q['id']] = true;
    }
    $recent = array_column(array_slice($pool,0,8),'id');
    foreach (epq_question_pool($enemy, [], $recent,$difficulty) as $q) topicCheck(!in_array($q['id'],$recent,true), 'Avoid last eight questions');
    $used = array_column(array_slice($pool,0,$expectedCount-1),'id');
    topicCheck(count(epq_question_pool($enemy,$used,array_column($pool,'id'),$difficulty))===1, 'Unused question preferred over history when nearly exhausted');
    $used = array_column($pool,'id');
    foreach (epq_question_pool($enemy,$used,$used,$difficulty) as $q) topicCheck($q['id']!==$used[$expectedCount-1], 'Exhausted pool never immediately repeats last question');
  }
}
topicCheck(count($reachable)===240 && count($bank)===259, '240 playable themed questions and19retained legacy questions');
foreach(epq_battle_enemies() as $enemy){
    $plan=epq_question_progression()[$enemy['realm']];
    foreach([0,1,2,9] as $correct){$stage=epq_question_stage($enemy,$correct);$expected=count($plan['levels'])>1&&$correct>=2?end($plan['levels']):$plan['levels'][0];topicCheck($stage['difficulty']===$expected,'World-ordered correct-answer progression');}
}
echo "PASS:259questions,240reachable,60perworld, bilingual explanations, balanced judgments, choices/answers, reward tiers, progressive stages, shuffled sentences and bounded repeat avoidance\n";
