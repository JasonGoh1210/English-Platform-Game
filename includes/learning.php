<?php
declare(strict_types=1);
require_once __DIR__.'/battle_review.php';

function epq_learning_stats(mysqli $db, int $playerId): array {
    $stmt = $db->prepare('SELECT COUNT(*) AS total, COUNT(DISTINCT a.question_code) AS questions_seen,
        COALESCE(SUM(a.is_correct = 1), 0) AS correct,
        COALESCE(SUM(a.is_correct = 0 AND a.timed_out = 0), 0) AS wrong,
        COALESCE(SUM(a.timed_out = 1), 0) AS timed_out
        FROM verified_answer_attempts a INNER JOIN verified_battles b ON b.battle_id = a.battle_id
        WHERE b.player_id = ?');
    $stmt->bind_param('i', $playerId); $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $total = (int)$row['total']; $correct = (int)$row['correct'];
    return ['total'=>$total, 'questionsSeen'=>(int)$row['questions_seen'], 'correct'=>$correct,
        'wrong'=>(int)$row['wrong'], 'timedOut'=>(int)$row['timed_out'],
        'accuracy'=>$total ? round(100 * $correct / $total, 1) : null];
}

function epq_learning_mistakes(mysqli $db, int $playerId, int $before): array {
    $stmt = $db->prepare("SELECT a.attempt_id, a.question_json, a.answer_json, a.timed_out, b.enemy_code
        FROM verified_answer_attempts a INNER JOIN verified_battles b ON b.battle_id = a.battle_id
        WHERE b.player_id = ? AND a.is_correct = 0 AND (? = 0 OR a.attempt_id < ?)
        AND JSON_UNQUOTE(JSON_EXTRACT(b.state_json, '$.status')) IN ('VICTORY','DEFEAT','ESCAPED')
        ORDER BY a.attempt_id DESC LIMIT 11");
    $stmt->bind_param('iii', $playerId, $before, $before); $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC); $hasMore = count($rows) > 10;
    $items = [];
    foreach (array_slice($rows, 0, 10) as $row) {
        $question = json_decode($row['question_json'], true, 512, JSON_THROW_ON_ERROR);
        $items[] = array_merge(epq_review_question($question), [
            'attemptId'=>(int)$row['attempt_id'], 'enemyId'=>$row['enemy_code'],
            'submittedAnswer'=>json_decode($row['answer_json'], true, 512, JSON_THROW_ON_ERROR),
            'timedOut'=>(bool)$row['timed_out']
        ]);
    }
    return ['mistakes'=>$items, 'nextCursor'=>$hasMore ? $items[array_key_last($items)]['attemptId'] : null];
}

function epq_learning_practice(mysqli $db, int $playerId, int $attemptId, mixed $answer): array {
    $stmt = $db->prepare("SELECT a.question_json FROM verified_answer_attempts a
        INNER JOIN verified_battles b ON b.battle_id = a.battle_id
        WHERE b.player_id = ? AND a.attempt_id = ? AND a.is_correct = 0
        AND JSON_UNQUOTE(JSON_EXTRACT(b.state_json, '$.status')) IN ('VICTORY','DEFEAT','ESCAPED')");
    $stmt->bind_param('ii', $playerId, $attemptId); $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    if (!$row) throw new OutOfBoundsException('Mistake not found.');
    $question = json_decode($row['question_json'], true, 512, JSON_THROW_ON_ERROR);
    // Read-only practice: no rewards, combat damage, attempt writes or history replacement.
    return array_merge(epq_review_question($question), ['correct'=>epq_answer_correct($question, $answer)]);
}
