<?php
declare(strict_types=1);

// These are the five encounters actually placed in the existing four realms.
// data/enemies.json contains older design concepts, not the current encounters.
function epq_battle_enemies(): array {
    return [
        'slime-01' => ['hp'=>60, 'damage'=>10, 'xp'=>20, 'coins'=>10, 'difficulty'=>'EASY', 'types'=>['TRUE_FALSE','ODD_WORD_OUT']],
        'bat-01' => ['hp'=>70, 'damage'=>10, 'xp'=>25, 'coins'=>12, 'difficulty'=>'EASY', 'types'=>['TRUE_FALSE','ODD_WORD_OUT']],
        'road-guardian-01' => ['hp'=>85, 'damage'=>11, 'xp'=>28, 'coins'=>14, 'difficulty'=>'MEDIUM', 'types'=>['TRUE_FALSE','SENTENCE_BUILDER']],
        'guardian-01' => ['hp'=>100, 'damage'=>12, 'xp'=>30, 'coins'=>15, 'difficulty'=>'MEDIUM', 'types'=>['TRUE_FALSE','SENTENCE_BUILDER']],
        'cave-wraith-01' => ['hp'=>110, 'damage'=>14, 'xp'=>45, 'coins'=>20, 'difficulty'=>'MEDIUM', 'types'=>['TRUE_FALSE','SENTENCE_BUILDER']]
    ];
}

function epq_question_bank(): array {
    static $bank;
    if ($bank === null) {
        $bank = json_decode((string)file_get_contents(__DIR__ . '/../data/questions.json'), true, 512, JSON_THROW_ON_ERROR);
        if (!$bank) throw new RuntimeException('Question bank is empty.');
    }
    return $bank;
}

function epq_question_pool(array $enemy, array $used): array {
    $supported = array_values(array_filter(epq_question_bank(), static fn($q) => in_array($q['type'], $enemy['types'], true)));
    $pool = array_values(array_filter($supported, static fn($q) => $q['difficulty'] === $enemy['difficulty']));
    if (!$pool) $pool = $supported;
    $fresh = array_values(array_filter($pool, static fn($q) => !in_array($q['id'], $used, true)));
    return $fresh ?: $pool;
}

function epq_public_question(array $question): array {
    // An allowlist prevents future answer/explanation fields leaking by default.
    return array_intersect_key($question, array_flip([
        'id','type','skill','difficulty','question','questionZh','prompt','promptZh','words','timeLimit'
    ]));
}

function epq_normalize_sentence(array $words): string {
    foreach ($words as $word) if (!is_string($word)) return '';
    return strtolower(trim((string)preg_replace('/\s+/', ' ', implode(' ', array_map('trim', $words)))));
}

function epq_answer_correct(array $question, mixed $answer): bool {
    return match ($question['type']) {
        'TRUE_FALSE' => is_bool($answer) && $answer === $question['answer'],
        'ODD_WORD_OUT' => is_string($answer) && strtolower($answer) === strtolower($question['answer']),
        'SENTENCE_BUILDER' => is_array($answer) && epq_normalize_sentence($answer) !== ''
            && epq_normalize_sentence($answer) === epq_normalize_sentence($question['answerOrder']),
        default => false
    };
}

function epq_question_skill(array $question): string {
    return match (strtoupper((string)($question['skill'] ?? 'VOCABULARY'))) {
        'GRAMMAR' => 'GRAMMAR', 'ITENGLISH' => 'IT_ENGLISH',
        'SENTENCECONSTRUCTION' => 'SENTENCE_CONSTRUCTION', default => 'VOCABULARY'
    };
}

function epq_grade_attack(array $question, mixed $answer, bool $timeout, float $elapsed, bool $focus): array {
    $limit = (float)($question['timeLimit'] ?? 5);
    // One second of transport tolerance; client-sent speed/reward values are ignored.
    $timedOut = $timeout || $elapsed > $limit + 1;
    $correct = !$timedOut && epq_answer_correct($question, $answer);
    $base = match ($question['difficulty']) { 'HARD' => 30, 'MEDIUM' => 25, default => 20 };
    return [
        'correct' => $correct, 'timedOut' => $timedOut,
        'damage' => $correct ? (int)round($base * ($focus ? 1.5 : 1) * ($elapsed <= $limit * 0.45 ? 1.1 : 1)) : 0,
        'xp' => $correct ? (int)($question['xp'] ?? 10) : 0,
        'coins' => $correct ? (int)($question['coins'] ?? 5) : 0,
        'power' => $correct ? (int)($question['englishPower'] ?? 1) : 0,
        'usedFocus' => $correct && $focus
    ];
}
