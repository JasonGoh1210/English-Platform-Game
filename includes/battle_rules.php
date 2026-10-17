<?php
declare(strict_types=1);
require_once __DIR__.'/skills.php';
require_once __DIR__.'/dungeons.php';

// Live encounters in the four realms, including the optional Echo Cave rooms.
// data/enemies.json contains older design concepts, not the current encounters.
function epq_battle_enemies(): array {
    $enemies = [
        'slime-01' => ['realm'=>'maple', 'hp'=>60, 'damage'=>10, 'xp'=>20, 'coins'=>10, 'difficulty'=>'EASY', 'types'=>['TRUE_FALSE','ODD_WORD_OUT']],
        'bat-01' => ['realm'=>'forest', 'hp'=>70, 'damage'=>10, 'xp'=>25, 'coins'=>12, 'difficulty'=>'EASY', 'types'=>['TRUE_FALSE','ODD_WORD_OUT']],
        'road-guardian-01' => ['realm'=>'camp', 'hp'=>85, 'damage'=>11, 'xp'=>28, 'coins'=>14, 'difficulty'=>'MEDIUM', 'types'=>['TRUE_FALSE','SENTENCE_BUILDER']],
        'guardian-01' => ['realm'=>'ruins', 'hp'=>100, 'damage'=>12, 'xp'=>30, 'coins'=>15, 'difficulty'=>'MEDIUM', 'types'=>['TRUE_FALSE','SENTENCE_BUILDER']],
        'hollow-treant-01' => ['realm'=>'ruins', 'hp'=>110, 'damage'=>12, 'xp'=>35, 'coins'=>18, 'difficulty'=>'MEDIUM', 'types'=>['TRUE_FALSE','SENTENCE_BUILDER']],
        'castle-warden-01' => ['realm'=>'ruins', 'hp'=>140, 'damage'=>14, 'xp'=>45, 'coins'=>25, 'difficulty'=>'MEDIUM', 'types'=>['TRUE_FALSE','SENTENCE_BUILDER']],
        'cave-wraith-01' => ['realm'=>'ruins', 'hp'=>110, 'damage'=>14, 'xp'=>45, 'coins'=>20, 'difficulty'=>'MEDIUM', 'types'=>['TRUE_FALSE','SENTENCE_BUILDER']],
        'echo-slime-01' => ['realm'=>'ruins', 'hp'=>80, 'damage'=>10, 'xp'=>25, 'coins'=>12, 'difficulty'=>'MEDIUM', 'types'=>['TRUE_FALSE']],
        'echo-dragon-01' => ['realm'=>'ruins', 'hp'=>135, 'damage'=>13, 'xp'=>50, 'coins'=>22, 'difficulty'=>'MEDIUM', 'types'=>['SENTENCE_BUILDER']]
    ];
    foreach (epq_dungeon_specs() as $realm=>$spec) foreach ($spec['enemies'] as $enemy) {
        $enemies[$enemy['id']]=array_merge($enemy,['realm'=>$realm,'dungeon'=>$realm]);
    }
    return $enemies;
}

function epq_question_bank(): array {
    static $bank;
    if ($bank === null) {
        $bank = json_decode((string)file_get_contents(__DIR__ . '/../data/questions.json'), true, 512, JSON_THROW_ON_ERROR);
        if (!$bank) throw new RuntimeException('Question bank is empty.');
    }
    return $bank;
}

function epq_question_pool(array $enemy, array $used, array $recent = []): array {
    $pool = array_values(array_filter(epq_question_bank(), static fn($q) =>
        ($q['realm'] ?? null) === $enemy['realm']
        && in_array($q['type'], $enemy['types'], true) && $q['difficulty'] === $enemy['difficulty']));
    if (!$pool) throw new RuntimeException('No questions configured for this realm and encounter.');
    $unused = array_values(array_filter($pool, static fn($q) => !in_array($q['id'], $used, true)));
    $fresh = array_values(array_filter($unused, static fn($q) => !in_array($q['id'], $recent, true)));
    if ($fresh) return $fresh;
    if ($unused) return $unused; // Finishing this battle's pool takes priority over recent history.
    $last = $used ? $used[array_key_last($used)] : null;
    $cycle = array_values(array_filter($pool, static fn($q) => $q['id'] !== $last && !in_array($q['id'], $recent, true)));
    return $cycle ?: array_values(array_filter($pool, static fn($q) => $q['id'] !== $last)) ?: $pool;
}

function epq_recent_question_ids(mysqli $db, int $playerId, string $realm): array {
    $codes = [];
    foreach (epq_battle_enemies() as $code => $enemy) if ($enemy['realm'] === $realm) $codes[] = $code;
    if (!$codes) return [];
    $placeholders = implode(',', array_fill(0, count($codes), '?'));
    $stmt = $db->prepare('SELECT a.question_code FROM verified_answer_attempts a
        INNER JOIN verified_battles b ON b.battle_id = a.battle_id
        WHERE b.player_id = ? AND b.enemy_code IN ('.$placeholders.') ORDER BY a.attempt_id DESC LIMIT 8');
    $parameters = array_merge([$playerId], $codes);
    $stmt->bind_param('i'.str_repeat('s', count($codes)), ...$parameters);
    $stmt->execute();
    return array_column($stmt->get_result()->fetch_all(MYSQLI_ASSOC), 'question_code');
}

function epq_prepare_question(array $question): array {
    if (isset($question['words'])) {
        shuffle($question['words']);
        if ($question['type'] === 'SENTENCE_BUILDER' && $question['words'] === $question['answerOrder']) {
            $question['words'][] = array_shift($question['words']);
        }
    }
    return $question;
}

function epq_public_question(array $question): array {
    // An allowlist prevents future answer/explanation fields leaking by default.
    return array_intersect_key($question, array_flip([
        'id','type','skill','difficulty','realm','question','questionZh','prompt','promptZh','words','timeLimit','timed'
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

function epq_grade_attack(array $question, mixed $answer, bool $timeout, float $elapsed, bool $focus, int $wordStrikeLevel = 0): array {
    $limit = (float)($question['timeLimit'] ?? 5);
    $timed = ($question['timed'] ?? true) !== false;
    // One second of transport tolerance; client-sent speed/reward values are ignored.
    $timedOut = $timed && ($timeout || $elapsed > $limit + 1);
    $correct = !$timedOut && epq_answer_correct($question, $answer);
    $base = match ($question['difficulty']) { 'HARD' => 30, 'MEDIUM' => 25, default => 20 };
    return [
        'correct' => $correct, 'timedOut' => $timedOut,
        'damage' => $correct ? (int)round($base * ($focus ? 1.5 : 1) * ($timed && $elapsed <= $limit * 0.45 ? 1.1 : 1)) + epq_word_strike_bonus($question,$wordStrikeLevel) : 0,
        'skillBonus' => $correct ? epq_word_strike_bonus($question,$wordStrikeLevel) : 0,
        'xp' => $correct ? (int)($question['xp'] ?? 10) : 0,
        'coins' => $correct ? (int)($question['coins'] ?? 5) : 0,
        'power' => $correct ? (int)($question['englishPower'] ?? 1) : 0,
        'usedFocus' => $correct && $focus
    ];
}
