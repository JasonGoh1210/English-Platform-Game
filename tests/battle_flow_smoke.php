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
    http('login.php', ['guest_mode'=>'1','csrf_token'=>$match[1]], $cookie);
    [, $setup] = http('character_setup.php', null, $cookie);
    preg_match('/name="csrf_token" value="([a-f0-9]{64})"/', $setup, $setupToken);
    verify(isset($setupToken[1]), 'Character setup CSRF');
    verify(http('api/player.php',null,$cookie)[0] === 409, 'New characters cannot skip setup');
    [$created] = http('character_setup.php', ['csrf_token'=>$setupToken[1], 'display_name'=>$name,'appearance'=>'shadow','gender'=>'male'], $cookie);
    verify($created===302,'Character selected before gameplay');
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
[$mapStatus] = http('api/game_state.php', ['csrfToken'=>$actor[1], 'state'=>[
    'currentRealmId'=>'maple','playerX'=>440,'questStep'=>0,
    'tutorial'=>['version'=>1,'stage'=>'MOVE','moveStartX'=>440,'xpDelta'=>99999]
]], $actor[0]);
verify($mapStatus === 200, 'Tutorial checkpoint saved');
[, $mapState] = http('api/game_state.php', null, $actor[0]);
verify($mapState['state']['tutorial']['stage'] === 'MOVE'
    && count($mapState['state']['tutorial']) === 3, 'Tutorial reload filters forged reward fields');
[$legacyMapStatus] = http('api/game_state.php', ['csrfToken'=>$actor[1], 'state'=>[
    'currentRealmId'=>'maple','playerX'=>450,'questStep'=>0
]], $actor[0]);
[, $retainedMap] = http('api/game_state.php', null, $actor[0]);
verify($legacyMapStatus === 200 && $retainedMap['state']['tutorial']['stage'] === 'MOVE',
    'Older cached clients cannot erase a tutorial checkpoint');
[, $otherMap] = http('api/game_state.php', null, $other[0]);
verify($otherMap['state'] === null, 'Tutorial checkpoints belong to the session player');
[$questStatus, $quest] = http('api/save_progress.php', ['csrfToken'=>$other[1],'sourceType'=>'QUEST','xpDelta'=>20,'coinDelta'=>10,'englishPowerDelta'=>1], $other[0]);
verify($questStatus === 400, 'Legacy client-computed QUEST rewards are rejected');
// Give this disposable rollback actor known balances without using the removed reward API.
$db->query('UPDATE players SET xp_total=20,coins_total=10 WHERE player_id='.(int)$other[2]);
$battle = token();
[$status, $start] = action($actor, $battle, 'START', ['enemyId'=>'slime-01', 'player_id'=>$other[2], 'xpDelta'=>99999]);
verify($status === 200 && $start['battle']['playerHp'] === 100 && $start['player']['xp'] === 0, 'Start ignores forged balances/player ID');
verify(action($other, $battle, 'QUESTION')[0] === 404, 'Battle ownership');
verify(http('api/battle.php', ['action'=>'QUESTION','battleId'=>$battle,'requestId'=>token()], $actor[0])[0] === 403, 'Battle CSRF');
verify(action($actor, token(), 'START', ['enemyId'=>'fake-enemy'])[0] === 400, 'Unknown enemy');
[$status, $issued] = action($actor, $battle, 'QUESTION');
verify($status === 200 && !isset($issued['battle']['question']['answer']), 'Server-issued public question');
$question = $issued['battle']['question']; $questionToken = $issued['battle']['questionToken'];
verify($issued['battle']['remaining']===null && $question['timed']===false, 'Ordinary map combat is self-paced');
// Simulate an old, already-issued timed question to verify update compatibility
// and retain the real deadline/pause checks below.
$legacyState=json_decode($db->query("SELECT state_json FROM verified_battles WHERE battle_id='$battle'")->fetch_assoc()['state_json'],true);
unset($legacyState['question']['timed']);
$legacyJson=json_encode($legacyState,JSON_THROW_ON_ERROR);
$legacyUpdate=$db->prepare('UPDATE verified_battles SET state_json=? WHERE battle_id=?');
$legacyUpdate->bind_param('ss',$legacyJson,$battle); $legacyUpdate->execute();
[, $issued]=action($actor,$battle,'QUESTION');
verify(is_numeric($issued['battle']['remaining']), 'An issued pre-update question retains its timer');
$pauseRequest = token();
[, $paused] = action($actor, $battle, 'PAUSE', [], $pauseRequest);
verify($paused['battle']['paused'] && $paused['battle']['questionToken'] === $questionToken, 'Settings pause keeps the question');
$heldState = json_decode($db->query("SELECT state_json FROM verified_battles WHERE battle_id='$battle'")->fetch_assoc()['state_json'], true);
// Simulate a long pause without adding a slow CI sleep; elapsed answering time is unchanged.
$heldState['startedAt'] -= 30; $heldState['pausedAt'] -= 30;
$heldJson = json_encode($heldState, JSON_THROW_ON_ERROR);
$hold = $db->prepare('UPDATE verified_battles SET state_json=? WHERE battle_id=?');
$hold->bind_param('ss',$heldJson,$battle); $hold->execute();
[, $pauseReplay] = action($actor,$battle,'PAUSE',[],$pauseRequest);
verify(abs($paused['battle']['remaining']-$pauseReplay['battle']['remaining'])<0.05, 'Pause replay preserves remaining time');
[, $pausedReload] = action($actor,$battle,'START',['enemyId'=>'slime-01']);
verify($pausedReload['battle']['paused'] && abs($pausedReload['battle']['remaining']-$paused['battle']['remaining'])<0.05, 'Reload does not resume settings pause');
verify(action($other,$battle,'PAUSE')[0]===404, 'Pause ownership');
verify(action($actor,$battle,'ANSWER',['questionToken'=>$questionToken,'answer'=>validAnswer($question)])[0]===409, 'Cannot answer behind settings');
verify(action($actor,$battle,'FOCUS')[0]===409 && action($actor,$battle,'HERB')[0]===409, 'Paused actions cannot consume items or skills');
[, $stillPaused] = action($actor,$battle,'QUESTION');
verify($stillPaused['battle']['paused'] && $stillPaused['battle']['questionToken']===$questionToken, 'Question requests do not unpause settings');
[, $resumedSettings] = action($actor,$battle,'RESUME');
verify(!$resumedSettings['battle']['paused'] && abs($resumedSettings['battle']['remaining']-$paused['battle']['remaining'])<0.2, 'Resume excludes a long pause');
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
[, $upgradedMap] = http('api/game_state.php', null, $actor[0]);
verify($upgradedMap['state']['tutorial']['stage'] === 'MOVE', 'Guest upgrade preserves tutorial checkpoint');
[, $oldBattle] = action($actor, $battle, 'START', ['enemyId'=>'slime-01']);
verify($oldBattle['battle']['status'] === 'VICTORY' && $oldBattle['player']['xp'] === $xp+20, 'Upgrade preserves battle outcome, attempts and rewards');
// Learning records are owned, paginated, snapshot-based and practice is read-only.
[, $journal] = http('api/learning.php',null,$actor[0]);
verify($journal['ok'] && $journal['stats']['total']>0 && $journal['stats']['questionsSeen']>0 && count($journal['mistakes'])>0, 'Persisted learning journal');
verify($account['learning']===$journal['stats'], 'Book statistics match learning journal');
[, $otherJournal] = http('api/learning.php',null,$other[0]);
verify($otherJournal['mistakes']===[], 'Other player cannot see historical mistakes');
$mistake = $journal['mistakes'][0]; $attemptId = $mistake['attemptId'];
$beforePractice = $db->query('SELECT xp_total,coins_total FROM players WHERE player_id='.(int)$actor[2])->fetch_assoc();
$attemptCount = (int)$db->query('SELECT COUNT(*) AS n FROM verified_answer_attempts')->fetch_assoc()['n'];
verify(http('api/learning.php',['attemptId'=>$attemptId,'answer'=>null],$actor[0])[0]===403, 'Practice CSRF');
verify(http('api/learning.php',['csrfToken'=>$other[1],'attemptId'=>$attemptId,'answer'=>$mistake['correctAnswer']],$other[0])[0]===404, 'Practice ownership');
for ($i=0;$i<2;$i++) {
    [, $practice] = http('api/learning.php',['csrfToken'=>$actor[1],'attemptId'=>$attemptId,'answer'=>$mistake['correctAnswer'],'xpDelta'=>99999],$actor[0]);
    verify($practice['practice']['correct'], 'Historical practice grades original answer');
}
verify($db->query('SELECT xp_total,coins_total FROM players WHERE player_id='.(int)$actor[2])->fetch_assoc()===$beforePractice, 'Practice cannot award currency or XP');
verify((int)$db->query('SELECT COUNT(*) AS n FROM verified_answer_attempts')->fetch_assoc()['n']===$attemptCount, 'Practice never overwrites or adds combat attempts');
verify(http('api/learning.php?before=invalid',null,$actor[0])[0]===400, 'Learning cursor validation');

// Skill progression is purchased once per requested level with session ownership.
[, $emptySkills]=http('api/skills.php',null,$other[0]);
verify($emptySkills['skills']['wordStrikeLevel']===0, 'Skill branch starts locked');
verify(http('api/skills.php',['skill'=>'word-strike','targetLevel'=>1],$other[0])[0]===403, 'Skill purchase CSRF');
$purchase=['csrfToken'=>$other[1],'skill'=>'word-strike','targetLevel'=>1,'player_id'=>$actor[2],'cost'=>-999];
verify(http('api/skills.php',$purchase,$other[0])[0]===409, 'Skill rejects insufficient level');
$db->query('UPDATE players SET level_no=5,skill_points_total=0 WHERE player_id='.(int)$other[2]);
verify(http('api/skills.php',$purchase,$other[0])[0]===409, 'Skill rejects insufficient points');
$db->query('UPDATE players SET skill_points_total=6 WHERE player_id='.(int)$other[2]);
verify(http('api/skills.php',array_merge($purchase,['targetLevel'=>3]),$other[0])[0]===409, 'Cannot skip the skill branch');
$activeSkillBattle=token();
action($other,$activeSkillBattle,'START',['enemyId'=>'slime-01','wordStrikeLevel'=>3]);
for($target=1;$target<=3;$target++) {
    $inputs=array_merge($purchase,['targetLevel'=>$target]);
    [, $bought]=http('api/skills.php',$inputs,$other[0]);
    [, $replayedBuy]=http('api/skills.php',$inputs,$other[0]);
    verify($bought['changed'] && !$replayedBuy['changed'] && $bought['skills']===$replayedBuy['skills'], 'Each target skill level is charged once');
}
verify($bought['skills']['skillPoints']===0 && $bought['skills']['wordStrikeLevel']===3, 'Exact server-owned skill costs');
[, $ownSkills]=http('api/skills.php',null,$actor[0]);
verify($ownSkills['skills']['wordStrikeLevel']===0, 'Forged player ID cannot purchase for another character');
[, $activeSnapshot]=action($other,$activeSkillBattle,'START',['enemyId'=>'slime-01']);
verify($activeSnapshot['battle']['wordStrikeLevel']===0, 'Existing fight retains its original skills');
$newSkillBattle=token();
[, $skillStart]=action($other,$newSkillBattle,'START',['enemyId'=>'slime-01']);
verify($skillStart['battle']['wordStrikeLevel']===3, 'New fights use the permanently unlocked skill');
[, $skillQuestion]=action($other,$newSkillBattle,'QUESTION');
if (epq_question_skill($skillQuestion['battle']['question'])!=='VOCABULARY') {
    action($other,$newSkillBattle,'ANSWER',['questionToken'=>$skillQuestion['battle']['questionToken'],'answer'=>validAnswer($skillQuestion['battle']['question'])]);
    [, $skillQuestion]=action($other,$newSkillBattle,'QUESTION');
}
$selfPacedState=json_decode($db->query("SELECT state_json FROM verified_battles WHERE battle_id='$newSkillBattle'")->fetch_assoc()['state_json'],true);
$selfPacedState['startedAt']-=600;
$selfPacedJson=json_encode($selfPacedState,JSON_THROW_ON_ERROR);
$aging=$db->prepare('UPDATE verified_battles SET state_json=? WHERE battle_id=?');
$aging->bind_param('ss',$selfPacedJson,$newSkillBattle);$aging->execute();
[, $skillHit]=action($other,$newSkillBattle,'ANSWER',['questionToken'=>$skillQuestion['battle']['questionToken'],'answer'=>validAnswer($skillQuestion['battle']['question']),'timedOut'=>true,'skillBonus'=>999]);
verify($skillHit['outcome']['correct'] && $skillHit['outcome']['damage']===32 && $skillHit['battle']['playerHp']===100, 'Self-paced correct answer adds only the trusted skill bonus after ten minutes');
// A ledger failure cannot spend points without retaining its unlock.
$db->query('UPDATE players SET level_no=2,skill_points_total=1 WHERE player_id='.(int)$actor[2]);
$db->query("CREATE TRIGGER epq_test_skill_ledger BEFORE INSERT ON player_skill_point_transactions FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Isolated skill rollback'");
$actorPurchase=['csrfToken'=>$actor[1],'skill'=>'word-strike','targetLevel'=>1];
try {verify(http('api/skills.php',$actorPurchase,$actor[0])[0]===503, 'Skill ledger failure is reported');}
finally {$db->query('DROP TRIGGER epq_test_skill_ledger');}
[, $rolledBackSkill]=http('api/skills.php',null,$actor[0]);
verify($rolledBackSkill['skills']['wordStrikeLevel']===0 && $rolledBackSkill['skills']['skillPoints']===1, 'Failed skill purchase rolls back all changes');
[, $retriedSkill]=http('api/skills.php',$actorPurchase,$actor[0]);
verify($retriedSkill['changed'] && $retriedSkill['skills']['wordStrikeLevel']===1, 'Failed skill purchase can safely retry');
echo "PASS: verified battle/guest upgrade plus settings pause/reload/replay/ownership, learning stats/history/CSRF/snapshot practice and unchanged rewards\n";
