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
$selfPaced=$q; $selfPaced['timed']=false;
check(epq_grade_attack($selfPaced,true,true,600,false)['correct'], 'Ordinary battle does not expire or trust a stale client timeout');
check(epq_grade_attack($selfPaced,true,false,0.1,false)['damage']===20, 'Self-paced questions do not award a speed bonus');
check(epq_grade_attack($selfPaced,true,false,600,true,1)['damage']===34, 'Word Strike combines with Focus after a long self-paced answer');
check(epq_grade_attack($selfPaced,true,false,600,false,3)['skillBonus']===12, 'Highest Word Strike replaces earlier bonuses');
check(epq_grade_attack($selfPaced,false,false,1,false,3)['damage']===0, 'Unlocked skills cannot attack on a wrong answer');
$grammar=$selfPaced; $grammar['skill']='Grammar';
check(epq_grade_attack($grammar,true,false,1,true,3)['skillBonus']===0, 'Word Strike applies only to vocabulary');
check(epq_grade_attack($q,true,false,600,false,3)['skillBonus']===0, 'Expired cave questions cannot earn a skill bonus');
foreach (epq_battle_enemies() as $enemy) {
    $pool = epq_question_pool($enemy, []);
    check(count($pool) > 0, 'Enemy has questions');
    foreach ($pool as $q) check(in_array($q['type'], $enemy['types'], true) && $q['difficulty'] === $enemy['difficulty'], 'Enemy question type/difficulty');
}
echo 'PASS: '.count($bank)." trusted questions, public projections, strict grading, timing, damage and encounter pools\n";
