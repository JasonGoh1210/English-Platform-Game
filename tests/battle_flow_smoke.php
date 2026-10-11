<?php
declare(strict_types=1);
// Only run with the disposable CI database created by the workflow.
require_once __DIR__.'/../includes/battle_rules.php';
require_once __DIR__.'/../config/db.php';
if (getenv('EPQ_BATTLE_TEST_DB') !== 'isolated') throw new RuntimeException('Isolated database acknowledgement required.');
function verify(bool $condition, string $label): void { if (!$condition) throw new RuntimeException($label); }
function canonicalReceipt(mixed $value): mixed {
    if (!is_array($value)) return $value;
    foreach ($value as $key => $item) $value[$key] = canonicalReceipt($item);
    if (!array_is_list($value)) ksort($value);
    return $value;
}
function sameReceipt(array $first, array $replay): bool {
    // MySQL JSON objects normalize key order; types and all values still must match.
    return canonicalReceipt($first) === canonicalReceipt($replay);
}
function token(): string { return bin2hex(random_bytes(16)); }
function http(string $path, ?array $body, string $cookie): array {
    $curl = curl_init('http://127.0.0.1:8081/FYP/'.$path);
    curl_setopt_array($curl, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_COOKIEFILE=>$cookie, CURLOPT_COOKIEJAR=>$cookie, CURLOPT_TIMEOUT=>15]);
    if ($body !== null) {
        curl_setopt($curl, CURLOPT_POST, true);
        if (str_starts_with($path, 'api/')) {
            curl_setopt($curl, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($curl, CURLOPT_POSTFIELDS, json_encode($body));
        } else curl_setopt($curl, CURLOPT_POSTFIELDS, http_build_query($body));
    }
    $response = curl_exec($curl);
    if ($response === false) throw new RuntimeException(curl_error($curl));
    $status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);
    if (str_starts_with($path, 'api/')) {
        try { $response = json_decode($response, true, 512, JSON_THROW_ON_ERROR); }
        catch (JsonException $e) { throw new RuntimeException($path.' returned non-JSON: '.substr($response, 0, 1200), 0, $e); }
    }
    return [$status, $response];
}
function guest(string $name): array {
    $cookie = tempnam(sys_get_temp_dir(), 'epq_battle_');
    [, $page] = http('login.php', null, $cookie);
    preg_match('/name="csrf_token" value="([a-f0-9]{64})"/', $page, $match);
    verify(isset($match[1]), 'Guest CSRF');
    http('login.php', ['guest_mode'=>'1','guest_name'=>$name,'csrf_token'=>$match[1]], $cookie);
    [, $page] = http('index.php', null, $cookie);
    preg_match('/name="csrf_token" value="([a-f0-9]{64})"/', $page, $match);
    [, $player] = http('api/player.php', null, $cookie);
    return [$cookie, $match[1], $player['player']['playerId']];
}
function action(array $actor, string $battle, string $action, array $inputs = [], ?string $request = null): array {
    return http('api/battle.php', array_merge($inputs, ['action'=>$action,'battleId'=>$battle,'requestId'=>$request ?? token(),'csrfToken'=>$actor[1]]), $actor[0]);
}
function validAnswer(array $question): mixed {
    foreach (epq_question_bank() as $q) if ($q['id'] === $question['id']) return $q['type'] === 'SENTENCE_BUILDER' ? $q['answerOrder'] : $q['answer'];
    throw new RuntimeException('Unknown issued question.');
}
$db = epq_db();
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
$actor = guest('BattleSmoke'); $other = guest('OtherBattleSmoke');
[$questStatus, $quest] = http('api/save_progress.php', ['csrfToken'=>$other[1],'sourceType'=>'QUEST','xpDelta'=>20,'coinDelta'=>10,'englishPowerDelta'=>1], $other[0]);
verify($questStatus === 200 && $quest['player']['xp'] === 20 && $quest['player']['coins'] === 10, 'Shared reward writer preserves existing map QUEST flow');
$battle = token();
[$status, $start] = action($actor, $battle, 'START', ['enemyId'=>'slime-01', 'player_id'=>$other[2], 'xpDelta'=>99999]);
verify($status === 200 && $start['battle']['playerHp'] === 100 && $start['player']['xp'] === 0, 'Start ignores forged balances/player ID');
verify(action($other, $battle, 'QUESTION')[0] === 404, 'Battle ownership');
verify(http('api/battle.php', ['action'=>'QUESTION','battleId'=>$battle,'requestId'=>token()], $actor[0])[0] === 403, 'Battle CSRF');
verify(action($actor, token(), 'START', ['enemyId'=>'fake-enemy'])[0] === 400, 'Unknown enemy');
[$status, $issued] = action($actor, $battle, 'QUESTION');
verify($status === 200 && !isset($issued['battle']['question']['answer']), 'Server-issued public question');
$question = $issued['battle']['question']; $questionToken = $issued['battle']['questionToken'];
$wrong = $question['type'] === 'TRUE_FALSE' ? !validAnswer($question) : 'incorrect';
$request = token();
$wrongInputs = ['questionToken'=>$questionToken,'answer'=>$wrong,'xpDelta'=>99999,'englishPowerDelta'=>99999];
[, $miss] = action($actor, $battle, 'ANSWER', $wrongInputs, $request);
verify(!$miss['outcome']['correct'] && $miss['battle']['playerHp'] === 90 && $miss['player']['xp'] === 0, 'Wrong answer damages only player and grants no reward');
[, $replay] = action($actor, $battle, 'ANSWER', $wrongInputs, $request);
verify(sameReceipt($miss, $replay), 'Exact receipt replay');
verify(action($actor, $battle, 'ANSWER', $wrongInputs)[0] === 409, 'New request cannot claim an old question');
verify(action($actor, $battle, 'ANSWER', ['questionToken'=>$questionToken,'answer'=>validAnswer($question)], $request)[0] === 409, 'Token cannot change answer');
verify(action($actor, $battle, 'HERB')[0] === 409, 'Insufficient Coins rejects purchase');

$xp = 0; $coins = 0; $power = 0; $answers = 1;
// A correct attack preserves HP. Focus and victory use trusted server parameters.
while (true) {
    [, $issued] = action($actor, $battle, 'QUESTION');
    $q = $issued['battle']['question'];
    [, $focused] = action($actor, $battle, 'FOCUS');
    verify($focused['battle']['focusUsed'], 'Focus is server state');
    $request = token();
    $inputs = ['questionToken'=>$issued['battle']['questionToken'],'answer'=>validAnswer($q),'damage'=>99999,'xpDelta'=>99999,'coinDelta'=>99999];
    [, $hit] = action($actor, $battle, 'ANSWER', $inputs, $request);
    verify($hit['outcome']['correct'] && $hit['battle']['playerHp'] === 90 && $hit['outcome']['damage'] < 100, 'Correct answer never harms player; damage cannot be forged');
    $xp += $hit['outcome']['xp']; $coins += $hit['outcome']['coins']; $power += $hit['outcome']['power']; $answers++;
    [, $again] = action($actor, $battle, 'ANSWER', $inputs, $request);
    verify(sameReceipt($hit, $again), 'Correct answer/victory replay returns exact receipt');
    if ($hit['battle']['status'] === 'VICTORY') break;
}
verify($hit['player']['xp'] === $xp + 20 && $hit['player']['coins'] === $coins + 10 && $hit['player']['englishPowerTotal'] === $power, 'Victory grants exactly one fixed enemy reward');
verify(action($actor, $battle, 'QUESTION')[0] === 409, 'Ended battle cannot farm more questions');
[, $restored] = action($actor, $battle, 'START', ['enemyId'=>'slime-01']);
verify($restored['battle']['status'] === 'VICTORY' && $restored['player']['xp'] === $xp + 20, 'Reload cannot reset or reward victory again');
$count = $db->query("SELECT COUNT(*) AS n FROM verified_answer_attempts WHERE battle_id='$battle'")->fetch_assoc()['n'];
verify((int)$count === $answers, 'Exactly one attempt per question');
$stats = $db->query('SELECT SUM(total_attempts) AS attempts, SUM(correct_attempts) AS correct FROM player_english_stats WHERE player_id='.(int)$actor[2])->fetch_assoc();
verify((int)$stats['attempts'] === $answers && (int)$stats['correct'] === $answers-1, 'Wrong and correct answers persist learning metrics');

// Herbs, timeouts, rollback and retry all use a second real battle.
$battle2 = token();
action($actor, $battle2, 'START', ['enemyId'=>'cave-wraith-01']);
[, $issued] = action($actor, $battle2, 'QUESTION');
[, $timeout] = action($actor, $battle2, 'ANSWER', ['questionToken'=>$issued['battle']['questionToken'],'answer'=>validAnswer($issued['battle']['question']),'timedOut'=>true]);
verify($timeout['outcome']['timedOut'] && $timeout['battle']['playerHp'] === 86, 'Timeout causes existing Wraith damage');
$request = token();
[, $herb] = action($actor, $battle2, 'HERB', [], $request);
[, $herbReplay] = action($actor, $battle2, 'HERB', [], $request);
verify($herb['battle']['playerHp'] === 100 && $herb['player']['coins'] === $coins + 5 && sameReceipt($herb, $herbReplay), 'Herb heals at most 20 and charges exactly once');
verify(action($actor, $battle2, 'HERB')[0] === 409, 'Full HP rejects charge');
[, $issued] = action($actor, $battle2, 'QUESTION');
action($actor, $battle2, 'ANSWER', ['questionToken'=>$issued['battle']['questionToken'],'timedOut'=>true]);
$request = token();
$db->query("CREATE TRIGGER epq_test_verified_ledger BEFORE INSERT ON player_coin_transactions FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Isolated rollback test'");
try { verify(action($actor, $battle2, 'HERB', [], $request)[0] === 503, 'Ledger error rejects purchase'); }
finally { $db->query('DROP TRIGGER epq_test_verified_ledger'); }
[, $beforeRetry] = action($actor, $battle2, 'START', ['enemyId'=>'cave-wraith-01']);
verify($beforeRetry['battle']['playerHp'] === 86 && $beforeRetry['player']['coins'] === $coins + 5, 'Ledger failure rolls back HP and balance');
[, $retried] = action($actor, $battle2, 'HERB', [], $request);
verify($retried['battle']['playerHp'] === 100 && $retried['player']['coins'] === $coins, 'Failed transaction can safely retry');

// Purchase pauses an open question until the client confirms and resumes it.
[, $issued] = action($actor, $battle2, 'QUESTION');
action($actor, $battle2, 'ANSWER', ['questionToken'=>$issued['battle']['questionToken'],'timedOut'=>true]);
[, $issued] = action($actor, $battle2, 'QUESTION');
[, $herb] = action($actor, $battle2, 'HERB');
usleep(150000);
[, $resume] = action($actor, $battle2, 'RESUME');
verify($resume['battle']['questionToken'] === $issued['battle']['questionToken'] && abs($resume['battle']['remaining'] - $herb['battle']['remaining']) < 0.1, 'Purchase pause keeps the same question and excludes confirmation wait');
[, $escaped] = action($actor, $battle2, 'RUN');
verify($escaped['battle']['status'] === 'ESCAPED' && action($actor, $battle2, 'QUESTION')[0] === 409, 'Run ends server battle');
foreach (['QUESTION','ENEMY','SHOP_PURCHASE','ADMIN_ADJUSTMENT'] as $source) {
    verify(http('api/save_progress.php', ['csrfToken'=>$actor[1],'sourceType'=>$source,'xpDelta'=>99999,'coinDelta'=>99999], $actor[0])[0] === 400, 'Legacy combat/admin reward path blocked');
}
// Fail after the attempt/accuracy/balance writes: none may survive alone.
$rollbackBattle = token();
action($other, $rollbackBattle, 'START', ['enemyId'=>'slime-01']);
[, $issued] = action($other, $rollbackBattle, 'QUESTION');
$answerInputs = ['questionToken'=>$issued['battle']['questionToken'],'answer'=>validAnswer($issued['battle']['question'])];
$request = token();
$db->query("CREATE TRIGGER epq_test_answer_ledger BEFORE INSERT ON player_coin_transactions FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Isolated answer rollback'");
try { verify(action($other, $rollbackBattle, 'ANSWER', $answerInputs, $request)[0] === 503, 'Answer ledger failure'); }
finally { $db->query('DROP TRIGGER epq_test_answer_ledger'); }
[, $unchanged] = action($other, $rollbackBattle, 'START', ['enemyId'=>'slime-01']);
verify($unchanged['battle']['enemyHp'] === 60 && $unchanged['player']['xp'] === 20 && $unchanged['player']['coins'] === 10, 'Answer failure rolls back damage and rewards');
verify((int)$db->query("SELECT COUNT(*) AS n FROM verified_answer_attempts WHERE battle_id='$rollbackBattle'")->fetch_assoc()['n'] === 0, 'Answer failure rolls back attempt');
verify((int)$db->query('SELECT SUM(total_attempts) AS n FROM player_english_stats WHERE player_id='.(int)$other[2])->fetch_assoc()['n'] === 0, 'Answer failure rolls back accuracy');
[, $retriedAnswer] = action($other, $rollbackBattle, 'ANSWER', $answerInputs, $request);
verify($retriedAnswer['outcome']['correct'] && $retriedAnswer['player']['xp'] === 20+$retriedAnswer['outcome']['xp'], 'Atomic answer safely retries after rollback');

[, $form] = http('register.php', null, $actor[0]);
preg_match('/name="csrf_token" value="([a-f0-9]{64})"/', $form, $match);
$username = 'verified_'.substr(token(), 0, 10);
[$upgraded] = http('register.php', ['csrf_token'=>$match[1],'username'=>$username,'display_name'=>'Verified Hero',
    'password'=>'Verified-Passw0rd!','confirm_password'=>'Verified-Passw0rd!'], $actor[0]);
verify($upgraded === 302, 'Guest account upgrade');
[, $page] = http('index.php', null, $actor[0]);
preg_match('/name="csrf_token" value="([a-f0-9]{64})"/', $page, $match);
$actor[1] = $match[1];
[, $account] = http('api/player.php', null, $actor[0]);
verify($account['player']['playerId'] === $actor[2], 'Upgrade preserves battle player ID');
[, $oldBattle] = action($actor, $battle, 'START', ['enemyId'=>'slime-01']);
verify($oldBattle['battle']['status'] === 'VICTORY' && $oldBattle['player']['xp'] === $xp+20, 'Upgrade preserves battle outcome, attempts and rewards');
echo "PASS: battle ownership, CSRF, grading, combat, metrics, focus, victory, reload, replay conflicts, Herb, pause, rollback, Run, legacy rejection and guest upgrade\n";
