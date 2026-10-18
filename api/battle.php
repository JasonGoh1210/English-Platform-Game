<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../includes/battle_rules.php';
require_once __DIR__ . '/../includes/rewards.php';
require_once __DIR__.'/../includes/shop.php';
require_once __DIR__.'/../includes/castle.php';
require_once __DIR__.'/../includes/question_hints.php';
require_once __DIR__.'/../includes/combat_depth.php';

function epq_battle_key(mixed $key): string {
    if (!is_string($key) || !preg_match('/\A[a-f0-9]{32}\z/', $key)) throw new InvalidArgumentException('Invalid battle/request token.');
    return $key;
}

function epq_battle_view(array $state,array $enemy): array {
    $view = array_intersect_key($state, array_flip(['status','enemyHp','playerHp','focusUsed']));
    $view['wordStrikeLevel'] = (int)($state['wordStrikeLevel'] ?? 0);
    $view['wrongStreak'] = max(0,(int)($state['wrongStreak'] ?? 0));
    $view['combat']=epq_combat_view($state);
    $view['nextMistakeDamage'] = epq_mistake_damage($enemy['damage'],$view['wrongStreak']+1);
    $view['baseMistakeDamage']=$view['nextMistakeDamage'];
    if(isset($state['combat']))$view['nextMistakeDamage']=max(0,(!empty($state['combat']['guard'])?(int)ceil($view['nextMistakeDamage']/2):$view['nextMistakeDamage'])-(int)$state['combat']['shield']);
    $view['progression']=epq_question_stage($enemy,(int)($state['correctAnswers']??0));
    if($state['question']!==null)$view['progression']['difficulty']=$state['question']['difficulty'];
    $view['paused'] = isset($state['pausedAt']) && ($state['pauseReason'] ?? null) === 'settings';
    if ($state['question'] !== null) {
        $view['question'] = epq_public_question($state['question']);
        $view['questionToken'] = $state['questionToken'];
        if(isset($state['questionHint']))$view['hint']=$state['questionHint'];
        $view['remaining'] = ($state['question']['timed'] ?? true) === false ? null
            : max(0, ($state['question']['timeLimit'] ?? 5) - (($state['pausedAt'] ?? microtime(true)) - $state['startedAt']));
    }
    return $view;
}

function epq_record_accuracy(mysqli $db, int $playerId, string $skillCode, bool $correct): void {
    $stmt = $db->prepare('SELECT english_skill_id FROM english_skills WHERE skill_code = ?');
    $stmt->bind_param('s', $skillCode);
    $stmt->execute();
    $skillId = (int)$stmt->get_result()->fetch_assoc()['english_skill_id'];
    $right = (int)$correct;
    $stmt = $db->prepare('INSERT INTO player_english_stats (player_id, english_skill_id, total_attempts, correct_attempts)
        VALUES (?, ?, 1, ?) ON DUPLICATE KEY UPDATE total_attempts = total_attempts + 1, correct_attempts = correct_attempts + VALUES(correct_attempts)');
    $stmt->bind_param('iii', $playerId, $skillId, $right);
    $stmt->execute();
    $stmt = $db->prepare('UPDATE player_english_stats SET accuracy_percent = ROUND(100.0 * correct_attempts / total_attempts, 2)
        WHERE player_id = ? AND english_skill_id = ?');
    $stmt->bind_param('ii', $playerId, $skillId);
    $stmt->execute();
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') epq_json(['ok'=>false, 'error'=>'POST required.'], 405);
    $raw = file_get_contents('php://input');
    if ($raw === false || strlen($raw) > 8192) epq_json(['ok'=>false, 'error'=>'Payload too large.'], 413);
    $body = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
    if (!is_array($body)) throw new InvalidArgumentException('Object required.');
    if (!epq_csrf_is_valid($body['csrfToken'] ?? null)) epq_json(['ok'=>false, 'error'=>'Invalid request token.'], 403);
    $action = $body['action'] ?? '';
    if (!in_array($action, ['START','QUESTION','ANSWER','FOCUS','GUARD','SURGE','HERB','POTION','HINT','PAUSE','RESUME','RUN'], true)) throw new InvalidArgumentException('Unknown action.');
    $battleId = epq_battle_key($body['battleId'] ?? null);
    $requestId = epq_battle_key($body['requestId'] ?? null);
    $db = epq_db();
    $playerId = epq_current_player_id($db);
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    $db->begin_transaction();
    // Consistent player -> battle lock order also serializes actions from different tabs.
    $lock = $db->prepare('SELECT player_id FROM players WHERE player_id = ? FOR UPDATE');
    $lock->bind_param('i', $playerId);
    $lock->execute();
    $lock->get_result()->free();
    if ($action === 'START') {
        $enemyCode = $body['enemyId'] ?? '';
        if (!is_string($enemyCode)) throw new InvalidArgumentException('Invalid enemy.');
        $enemy = epq_battle_enemies()[$enemyCode] ?? null;
        if (!$enemy) throw new InvalidArgumentException('Unknown enemy.');
        if(in_array($enemyCode,['hollow-treant-01','castle-warden-01'],true)) {
            $existing=$db->prepare('SELECT battle_id FROM verified_battles WHERE battle_id=? AND player_id=?');
            $existing->bind_param('si',$battleId,$playerId);$existing->execute();
            if(!$existing->get_result()->fetch_assoc()) epq_require_castle_encounter($db,$playerId,$enemyCode);
        }
        if (isset($enemy['dungeon'])) {
            // Keep an already-started encounter resumable across this update.
            $existingBattle=$db->prepare('SELECT battle_id FROM verified_battles WHERE battle_id=? AND player_id=?');
            $existingBattle->bind_param('si',$battleId,$playerId);$existingBattle->execute();
            if (!$existingBattle->get_result()->fetch_assoc()) epq_require_dungeon_access($db,$playerId,$enemy['dungeon']);
        }
        $initial = json_encode(['status'=>'ACTIVE', 'enemyHp'=>$enemy['hp'], 'playerHp'=>100, 'focusUsed'=>false,'wrongStreak'=>0,
            'combat'=>epq_combat_start($enemyCode,epq_skills_view($db,$playerId)),
            'wordStrikeLevel'=>epq_word_strike_level($db,$playerId),'correctAnswers'=>0,
            'question'=>null, 'used'=>[], 'startedAt'=>0], JSON_THROW_ON_ERROR);
        $stmt = $db->prepare('INSERT IGNORE INTO verified_battles (battle_id, player_id, enemy_code, state_json) VALUES (?, ?, ?, ?)');
        $stmt->bind_param('siss', $battleId, $playerId, $enemyCode, $initial);
        $stmt->execute();
    }
    $stmt = $db->prepare('SELECT enemy_code, state_json FROM verified_battles WHERE battle_id = ? AND player_id = ? FOR UPDATE');
    $stmt->bind_param('si', $battleId, $playerId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    if (!$row) { $db->rollback(); epq_json(['ok'=>false, 'error'=>'Battle not found.'], 404); }
    if ($action === 'START' && $row['enemy_code'] !== $body['enemyId']) throw new DomainException('Battle enemy cannot change.');
    $state = json_decode($row['state_json'], true, 512, JSON_THROW_ON_ERROR);
    $enemy = epq_battle_enemies()[$row['enemy_code']];
    if(!isset($state['correctAnswers'])){
        $correctCount=$db->prepare('SELECT COUNT(*) AS n FROM verified_answer_attempts WHERE battle_id=? AND is_correct=1');
        $correctCount->bind_param('s',$battleId);$correctCount->execute();
        $state['correctAnswers']=(int)$correctCount->get_result()->fetch_assoc()['n'];
    }
    // Hash only the action inputs; client reward fields and player IDs have no authority.
    $payloadHash = hash('sha256', json_encode([$action, $body['questionToken'] ?? null, $body['answer'] ?? null,
        $body['timedOut'] ?? false, $body['enemyId'] ?? null], JSON_THROW_ON_ERROR));
    $receipt = $db->prepare('SELECT payload_hash, response_json FROM verified_battle_events WHERE battle_id = ? AND request_id = ?');
    $receipt->bind_param('ss', $battleId, $requestId);
    $receipt->execute();
    $existing = $receipt->get_result()->fetch_assoc();
    if ($existing) {
        if (!hash_equals($existing['payload_hash'], $payloadHash)) throw new DomainException('Request token already used for different inputs.');
        $replayed = json_decode($existing['response_json'], true, 512, JSON_THROW_ON_ERROR);
        // A retried question response must not restart its countdown at old time.
        if (in_array($action, ['QUESTION','HINT','PAUSE','RESUME'], true) && isset($replayed['battle']['questionToken'])
            && $state['question'] !== null && $replayed['battle']['questionToken'] === $state['questionToken']) {
            $replayed['battle']['remaining'] = epq_battle_view($state,$enemy)['remaining'];
            $replayed['battle']['paused'] = epq_battle_view($state,$enemy)['paused'];
        }
        $db->commit();
        epq_json($replayed);
    }
    $outcome = null;
    // Historical successful HERB receipts can still be recovered above. New
    // battle purchases are rejected, including requests from cached old clients.
    if($action==='HERB')throw new DomainException('BATTLE_SHOP_ONLY');
    if ($action !== 'START' && $state['status'] !== 'ACTIVE') throw new DomainException('Battle has already ended.');
    $settingsPaused = isset($state['pausedAt']) && ($state['pauseReason'] ?? null) === 'settings';
    if ($settingsPaused && in_array($action, ['ANSWER','FOCUS','GUARD','SURGE','HERB','POTION','HINT'], true)) {
        throw new DomainException('Close settings before continuing the battle.');
    }
    if (isset($state['pausedAt']) && (in_array($action, ['RESUME','RUN'], true)
        || !$settingsPaused && !in_array($action, ['START','PAUSE'], true))) {
        $state['startedAt'] += microtime(true) - $state['pausedAt'];
        unset($state['pausedAt'], $state['pauseReason']);
    }
    if ($action === 'PAUSE' && $state['question'] !== null) {
        $state['pausedAt'] = $state['pausedAt'] ?? microtime(true);
        $state['pauseReason'] = 'settings';
    } elseif ($action === 'QUESTION' && $state['question'] === null) {
        $recent = epq_recent_question_ids($db, $playerId, $enemy['realm']);
        $stage=epq_question_stage($enemy,$state['correctAnswers']);
        $pool = epq_question_pool($enemy, $state['used'], $recent,$stage['difficulty']);
        $state['question'] = epq_prepare_question($pool[random_int(0, count($pool)-1)]);
        // Ordinary map fights are self-paced; unlocked realm dungeons use timed challenges.
        // An already issued old question retains its original timer across an update/reload.
        $state['question']['timed'] = isset($enemy['dungeon']);
        $state['used'][] = $state['question']['id'];
        $state['questionToken'] = bin2hex(random_bytes(16));
        $state['startedAt'] = microtime(true);
        unset($state['questionHint']);
    } elseif ($action === 'ANSWER') {
        if ($state['question'] === null || ($body['questionToken'] ?? '') !== $state['questionToken']) throw new DomainException('Question is no longer active.');
        $q = $state['question'];
        $elapsed = max(0, microtime(true) - $state['startedAt']);
        $outcome = epq_grade_attack($q, $body['answer'] ?? null, ($body['timedOut'] ?? false) === true, $elapsed, $state['focusUsed'], (int)($state['wordStrikeLevel'] ?? 0));
        $nextWrong=max(0,(int)($state['wrongStreak']??0))+1;
        epq_combat_answer($state,$q,$outcome,epq_mistake_damage($enemy['damage'],$nextWrong));
        $skill = epq_question_skill($q);
        $questionJson = json_encode($q, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
        $answerJson = json_encode($body['answer'] ?? null, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
        $right = (int)$outcome['correct']; $timeout = (int)$outcome['timedOut'];
        $elapsedMs = min(4294967295, (int)round($elapsed * 1000));
        $attempt = $db->prepare('INSERT INTO verified_answer_attempts
            (battle_id, question_token, question_code, question_json, answer_json, is_correct, timed_out, elapsed_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        $attempt->bind_param('sssssiii', $battleId, $state['questionToken'], $q['id'], $questionJson, $answerJson, $right, $timeout, $elapsedMs);
        $attempt->execute();
        epq_record_accuracy($db, $playerId, $skill, $outcome['correct']);
        if ($outcome['correct']) {
            $state['correctAnswers']++;
            $state['wrongStreak']=0;
            $outcome['enemyDamage']=0;
            $state['enemyHp'] = max(0, $state['enemyHp'] - $outcome['damage']);
            $state['focusUsed'] = false;
            epq_apply_reward($db, $playerId, $outcome['xp'], $outcome['coins'], $outcome['power'], $skill, 'QUESTION', 'Verified question: '.$q['id']);
            if ($state['enemyHp'] === 0) {
                $state['status'] = 'VICTORY';
                epq_apply_reward($db, $playerId, $enemy['xp'], $enemy['coins'], 0, 'VOCABULARY', 'ENEMY', 'Verified victory: '.$row['enemy_code']);
            }
        } else {
            $state['wrongStreak']=max(0,(int)($state['wrongStreak']??0))+1;
            $outcome['enemyDamage']=$outcome['enemyDamage']??epq_mistake_damage($enemy['damage'],$state['wrongStreak']);
            $state['playerHp'] = max(0, $state['playerHp'] - $outcome['enemyDamage']);
            if ($state['playerHp'] === 0) $state['status'] = 'DEFEAT';
        }
        $state['question'] = null;
        unset($state['questionHint']);
    } elseif ($action === 'FOCUS') {
        if(!empty($state['combat']['guard']))throw new DomainException('COMBAT_CHOICE_LOCKED');
        $state['focusUsed'] = true;
    } elseif (in_array($action,['GUARD','SURGE'],true)) {
        epq_combat_choice($state,$action);
    } elseif ($action === 'HINT') {
        if($state['question']===null || ($body['questionToken']??'')!==$state['questionToken'])throw new DomainException('HINT_NO_QUESTION');
        if(isset($state['questionHint']))throw new DomainException('HINT_ALREADY_USED');
        if(($state['question']['timed']??true)!==false && microtime(true)-$state['startedAt']>=($state['question']['timeLimit']??5))throw new DomainException('HINT_EXPIRED');
        epq_use_hint_potion($db,$playerId,$requestId);
        $state['questionHint']=epq_question_hint($state['question']);
        $state['pausedAt']=microtime(true);
    } elseif ($action === 'POTION') {
        if ($state['playerHp'] >= 100) throw new DomainException('HP is full.');
        epq_use_potion($db,$playerId,$requestId);
        $state['playerHp']=min(100,$state['playerHp']+epq_shop_catalog()['potion']['heal']);
        if ($state['question'] !== null) $state['pausedAt'] = microtime(true);
    } elseif ($action === 'RUN') {
        $state['status'] = 'ESCAPED';
        $state['question'] = null;
    }
    $response = ['ok'=>true, 'battle'=>epq_battle_view($state,$enemy), 'player'=>epq_reward_balance($db, $playerId), 'outcome'=>$outcome,
        'shop'=>epq_shop_view($db,$playerId)];
    $stateJson = json_encode($state, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
    $stmt = $db->prepare('UPDATE verified_battles SET state_json = ? WHERE battle_id = ?');
    $stmt->bind_param('ss', $stateJson, $battleId);
    $stmt->execute();
    $responseJson = json_encode($response, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
    $stmt = $db->prepare('INSERT INTO verified_battle_events (battle_id, request_id, payload_hash, response_json) VALUES (?, ?, ?, ?)');
    $stmt->bind_param('ssss', $battleId, $requestId, $payloadHash, $responseJson);
    $stmt->execute();
    $db->commit();
    epq_json($response);
} catch (Throwable $e) {
    if (isset($db) && $db instanceof mysqli) {
        try { $db->rollback(); }
        catch (Throwable $rollbackError) { error_log('[English Power Quest battle rollback] '.$rollbackError->getMessage()); }
    }
    if ($e instanceof DomainException) epq_json(['ok'=>false, 'error'=>$e->getMessage(), 'errorCode'=>in_array($e->getMessage(),['DUNGEON_LOCKED','BATTLE_SHOP_ONLY'],true)?$e->getMessage():null], 409);
    if ($e instanceof InvalidArgumentException || $e instanceof JsonException) epq_json(['ok'=>false, 'error'=>'Invalid battle request.'], 400);
    error_log('[English Power Quest battle] '.$e->getMessage());
    $missing = $e instanceof mysqli_sql_exception && $e->getCode() === 1146;
    epq_json(['ok'=>false, 'errorCode'=>$missing ? 'MIGRATION_REQUIRED' : 'BATTLE_UNAVAILABLE', 'error'=>'Verified battle service unavailable.'], 503);
}
