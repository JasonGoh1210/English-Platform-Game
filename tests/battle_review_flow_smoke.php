<?php
declare(strict_types=1);
require __DIR__.'/quests_flow_smoke.php';
require_once __DIR__.'/../includes/battle_review.php';
function getReview(array $actor, string $battleId, int $after = 0): array {
    return http('api/battle_review.php?battleId='.$battleId.'&after='.$after, null, $actor[0]);
}
verify(http('api/battle_review.php?battleId='.$battle, null, '')[0] === 401, 'Review requires a session');
verify(getReview($other, $battle)[0] === 404, 'Other player cannot read answers or stats');
verify(getReview($other, $rollbackBattle)[0] === 409, 'Active battle cannot reveal its answer history');
verify(http('api/battle_review.php?battleId[]=bad', null, $actor[0])[0] === 400, 'Malformed review token');
verify(http('api/battle_review.php?battleId='.$battle.'&after=-1', null, $actor[0])[0] === 400, 'Invalid cursor');
$before = epq_reward_balance($db, $actor[2]);
[$status, $review] = getReview($actor, $battle);
verify($status === 200 && $review['stats']['total'] === $answers && $review['stats']['correct'] === $answers-1
    && $review['stats']['wrong'] === 1 && $review['stats']['timedOut'] === 0, 'Victory stats use committed attempts only');
verify(count($review['mistakes']) === 1 && !$review['mistakes'][0]['timedOut'], 'Only actual mistake is shown');
verify(getReview($actor, $battle)[1] === $review && epq_reward_balance($db, $actor[2]) === $before, 'Review/reload never rewards again');
[, $timeoutReview] = getReview($actor, $battle2);
verify($timeoutReview['status'] === 'ESCAPED' && $timeoutReview['stats']['timedOut'] === 3
    && $timeoutReview['stats']['wrong'] === 0, 'Timeouts counted separately from wrong answers');

// Only this new disposable fixture: model a long historical battle for pagination.
$reviewActor = guest('ReviewFixture'); $reviewBattle = token();
action($reviewActor, $reviewBattle, 'START', ['enemyId'=>'slime-01']);
$bank = array_column(epq_question_bank(), null, 'id');
$samples = [$bank['dw-v-001'], $bank['dw-o-001'], $bank['dw-s-001']];
$insert = $db->prepare('INSERT INTO verified_answer_attempts
    (battle_id,question_token,question_code,question_json,answer_json,is_correct,timed_out,elapsed_ms)
    VALUES (?,?,?,?,?,0,?,1000)');
for ($i=0; $i<12; $i++) {
    $snapshot = $samples[$i%3];
    if ($i===1) unset($snapshot['explanation'], $snapshot['explanationZh']);
    $timedOut = (int)($i%4===0);
    $answer = $timedOut ? null : match($snapshot['type']) {
        'TRUE_FALSE'=>false, 'ODD_WORD_OUT'=>'<img src=x onerror="alert(1)">',
        'SENTENCE_BUILDER'=>array_reverse($snapshot['answerOrder'])
    };
    $questionToken = token(); $questionCode = $snapshot['id'];
    $questionJson = json_encode($snapshot, JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE);
    $answerJson = json_encode($answer, JSON_THROW_ON_ERROR);
    $insert->bind_param('sssssi', $reviewBattle, $questionToken, $questionCode, $questionJson, $answerJson, $timedOut);
    $insert->execute();
}
$db->query("UPDATE verified_battles SET state_json=JSON_SET(state_json,'$.status','DEFEAT','$.playerHp',0) WHERE battle_id='$reviewBattle'");
[, $firstPage] = getReview($reviewActor, $reviewBattle);
[, $secondPage] = getReview($reviewActor, $reviewBattle, $firstPage['nextCursor']);
verify($firstPage['stats']['total']===12 && $firstPage['stats']['wrong']===9 && $firstPage['stats']['timedOut']===3, 'Finished defeat summary counts');
verify(count($firstPage['mistakes'])===10 && count($secondPage['mistakes'])===2 && $secondPage['nextCursor']===null, 'Bounded pagination');
$ids = array_column(array_merge($firstPage['mistakes'], $secondPage['mistakes']), 'attemptId');
verify(count(array_unique($ids))===12, 'Pages have no repeated mistakes');
verify($firstPage['mistakes'][1]['explanationZh'] !== '', 'Old missing explanation safely backfilled');
verify($firstPage['mistakes'][1]['submittedAnswer'] === '<img src=x onerror="alert(1)">', 'Submitted text stays literal');
verify($firstPage['mistakes'][2]['correctAnswer'] === $samples[2]['answerOrder'], 'Sentence review preserves canonical order');
echo "PASS: review ownership, active-answer protection, exact stats, no repeated rewards, upgrade/reload, timeout separation, pagination and historical explanations\n";
