<?php
declare(strict_types=1);
require_once __DIR__.'/../includes/battle_rules.php';
function check(bool $condition, string $label): void {
    if (!$condition) throw new RuntimeException($label);
}
$bank = epq_question_bank();
foreach ($bank as $q) {
    $answer = $q['type'] === 'SENTENCE_BUILDER' ? $q['answerOrder'] : $q['answer'];
    check(epq_answer_correct($q, $answer), 'Trusted answer: '.$q['id']);
    $graded = epq_grade_attack($q, $answer, false, 1, false);
    check($graded['correct'] && $graded['xp'] === $q['xp'], 'Question reward: '.$q['id']);
    check(!epq_grade_attack($q, $answer, true, 1, false)['correct'], 'Explicit timeout');
    check(!epq_grade_attack($q, $answer, false, $q['timeLimit'] + 2, false)['correct'], 'Server timeout');
    $public = epq_public_question($q);
    foreach (['answer','answerOrder','explanation','explanationZh','xp','coins','englishPower'] as $secret) check(!array_key_exists($secret, $public), 'Public question omits '.$secret);
}
$q = $bank[0];
check(!epq_answer_correct($q, 'true') && !epq_answer_correct($q, 1), 'Boolean answers require booleans');
check(epq_grade_attack($q, true, false, 1, true)['damage'] === 33, 'Focus and speed match existing gameplay');
check(epq_grade_attack($q, true, false, 4, false)['damage'] === 20, 'Normal damage');
check(epq_grade_attack($q, false, false, 1, true)['power'] === 0, 'Wrong answers grant no power');
foreach([1=>10,2=>15,3=>20,4=>25,5=>30,6=>30,100=>30] as $streak=>$damage)check(epq_mistake_damage(10,$streak)===$damage,'Consecutive mistake damage and cap');
check(epq_mistake_damage(14,2)===19&&epq_mistake_damage(14,6)===34,'Streak adds to each enemy base damage');
$selfPaced=$q; $selfPaced['timed']=false;
check(epq_grade_attack($selfPaced,true,true,600,false)['correct'], 'Ordinary battle does not expire or trust a stale client timeout');
check(epq_grade_attack($selfPaced,true,false,0.1,false)['damage']===20, 'Self-paced questions do not award a speed bonus');
check(epq_grade_attack($selfPaced,true,false,600,true,1)['damage']===34, 'Word Strike combines with Focus after a long self-paced answer');
check(epq_grade_attack($selfPaced,true,false,600,false,3)['skillBonus']===12, 'Highest Word Strike replaces earlier bonuses');
check(epq_grade_attack($selfPaced,false,false,1,false,3)['damage']===0, 'Unlocked skills cannot attack on a wrong answer');
$grammar=$selfPaced; $grammar['skill']='Grammar';
check(epq_grade_attack($grammar,true,false,1,true,3)['skillBonus']===0, 'Word Strike applies only to vocabulary');
$byId=array_column($bank,null,'id');
foreach (['maple-tf-022','maple-tf-023','maple-tf-024','maple-tf-025','maple-tf-030','forest-tf-016'] as $id) {
    $categorized=$byId[$id];$categorized['timed']=false;
    $vocabulary=$id==='forest-tf-016';
    check(epq_question_skill($categorized)===($vocabulary?'VOCABULARY':'GRAMMAR'), 'Learning category follows question content: '.$id);
    check(epq_grade_attack($categorized,$categorized['answer'],false,1,false,3)['skillBonus']===($vocabulary?12:0), 'Word Strike respects authored question category: '.$id);
}
check(epq_grade_attack($q,true,false,600,false,3)['skillBonus']===0, 'Expired cave questions cannot earn a skill bonus');
foreach (epq_battle_enemies() as $enemy) {
    $pool = epq_question_pool($enemy, []);
    check(count($pool) > 0, 'Enemy has questions');
    foreach ($pool as $q) check(in_array($q['type'], $enemy['types'], true) && $q['difficulty'] === $enemy['difficulty'], 'Enemy question type/difficulty');
}
echo 'PASS: '.count($bank)." trusted questions, public projections, strict grading, timing, damage and encounter pools\n";
