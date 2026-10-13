<?php
declare(strict_types=1);
require_once __DIR__.'/../includes/battle_review.php';
function reviewCheck(bool $condition, string $message): void {
    if (!$condition) throw new RuntimeException($message);
}
foreach (epq_question_bank() as $question) {
    reviewCheck(!empty($question['explanation']) && !empty($question['explanationZh']), 'All questions have bilingual explanations');
    $review = epq_review_question($question);
    reviewCheck($review['correctAnswer'] === ($question['answerOrder'] ?? $question['answer']), 'Original correct answer for every type');
    reviewCheck(!isset($review['question']['answer']) && !isset($review['question']['xp']), 'Review question projection excludes amounts');
}
$old = array_column(epq_question_bank(), null, 'id')['dw-o-001'];
unset($old['explanation'], $old['explanationZh']);
reviewCheck(epq_review_question($old)['explanationZh'] !== '', 'Backfill explanation for matching historical question');
$old['answer'] = 'Changed historical answer';
reviewCheck(epq_review_question($old)['explanation'] === '', 'Changed answer never borrows a contradictory current explanation');
reviewCheck(epq_review_question($old)['correctAnswer'] === 'Changed historical answer', 'Historical answer remains intact');
$old['explanation'] = 'Original saved explanation';
reviewCheck(epq_review_question($old)['explanation'] === 'Original saved explanation', 'Existing snapshot explanation stays intact');
echo "PASS: all three review answer types, bilingual explanations, old snapshot backfill and changed history protection\n";
