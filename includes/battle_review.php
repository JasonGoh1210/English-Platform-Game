<?php
declare(strict_types=1);
require_once __DIR__ . '/battle_rules.php';

function epq_review_question(array $snapshot): array {
    // Historical snapshots keep their original question and correct answer. Only
    // missing explanations can use current content, after an exact content match.
    $answer = $snapshot['type'] === 'SENTENCE_BUILDER'
        ? ($snapshot['answerOrder'] ?? null) : ($snapshot['answer'] ?? null);
    $explanation = $snapshot['explanation'] ?? '';
    $explanationZh = $snapshot['explanationZh'] ?? '';
    if (!$explanation || !$explanationZh) {
        foreach (epq_question_bank() as $candidate) {
            $candidateAnswer = $candidate['type'] === 'SENTENCE_BUILDER'
                ? ($candidate['answerOrder'] ?? null) : ($candidate['answer'] ?? null);
            if (($candidate['id'] ?? null) === ($snapshot['id'] ?? null)
                && $candidate['type'] === $snapshot['type']
                && $candidate['question'] === $snapshot['question']
                && ($candidate['prompt'] ?? '') === ($snapshot['prompt'] ?? '')
                && ($candidate['words'] ?? []) === ($snapshot['words'] ?? [])
                && $candidateAnswer === $answer) {
                $explanation = $explanation ?: ($candidate['explanation'] ?? '');
                $explanationZh = $explanationZh ?: ($candidate['explanationZh'] ?? '');
                break;
            }
        }
    }
    return ['question' => array_intersect_key($snapshot, array_flip([
        'type', 'question', 'questionZh', 'prompt', 'promptZh', 'words'
    ])), 'correctAnswer' => $answer, 'explanation' => $explanation, 'explanationZh' => $explanationZh];
}

function epq_battle_review(mysqli $db, int $playerId, string $battleId, int $after): array {
    $stmt = $db->prepare('SELECT state_json FROM verified_battles WHERE battle_id = ? AND player_id = ?');
    $stmt->bind_param('si', $battleId, $playerId);
    $stmt->execute();
    $battle = $stmt->get_result()->fetch_assoc();
    if (!$battle) throw new OutOfBoundsException('Battle not found.');
    $status = json_decode($battle['state_json'], true, 512, JSON_THROW_ON_ERROR)['status'];
    if (!in_array($status, ['VICTORY', 'DEFEAT', 'ESCAPED'], true)) {
        throw new DomainException('Finish this battle before opening its review.');
    }
    $stmt = $db->prepare('SELECT COUNT(*) AS total, COALESCE(SUM(is_correct = 1), 0) AS correct,
        COALESCE(SUM(is_correct = 0 AND timed_out = 0), 0) AS wrong,
        COALESCE(SUM(timed_out = 1), 0) AS timed_out
        FROM verified_answer_attempts WHERE battle_id = ?');
    $stmt->bind_param('s', $battleId);
    $stmt->execute();
    $counts = $stmt->get_result()->fetch_assoc();
    $total = (int)$counts['total'];
    $correct = (int)$counts['correct'];
    $stmt = $db->prepare('SELECT attempt_id, question_json, answer_json, timed_out
        FROM verified_answer_attempts WHERE battle_id = ? AND is_correct = 0 AND attempt_id > ?
        ORDER BY attempt_id LIMIT 11');
    $stmt->bind_param('si', $battleId, $after);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $hasMore = count($rows) > 10;
    $mistakes = [];
    foreach (array_slice($rows, 0, 10) as $row) {
        $snapshot = json_decode($row['question_json'], true, 512, JSON_THROW_ON_ERROR);
        $mistakes[] = array_merge(epq_review_question($snapshot), [
            'attemptId' => (int)$row['attempt_id'],
            'submittedAnswer' => json_decode($row['answer_json'], true, 512, JSON_THROW_ON_ERROR),
            'timedOut' => (bool)$row['timed_out']
        ]);
    }
    return ['ok' => true, 'battleId' => $battleId, 'status' => $status,
        'stats' => ['total' => $total, 'correct' => $correct, 'wrong' => (int)$counts['wrong'],
            'timedOut' => (int)$counts['timed_out'], 'accuracy' => $total ? round(100 * $correct / $total, 1) : null],
        'mistakes' => $mistakes,
        'nextCursor' => $hasMore ? $mistakes[array_key_last($mistakes)]['attemptId'] : null];
}
