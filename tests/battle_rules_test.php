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
foreach (epq_battle_enemies() as $enemy) {
    $pool = epq_question_pool($enemy, []);
    check(count($pool) > 0, 'Enemy has questions');
    foreach ($pool as $q) check(in_array($q['type'], $enemy['types'], true) && $q['difficulty'] === $enemy['difficulty'], 'Enemy question type/difficulty');
}
echo 'PASS: '.count($bank)." trusted questions, public projections, strict grading, timing, damage and encounter pools\n";
