<?php
declare(strict_types=1);
require_once __DIR__.'/rewards.php';
require_once __DIR__.'/dungeons.php';
require_once __DIR__.'/world_layout.php';
require_once __DIR__.'/castle.php';
require_once __DIR__.'/adventure.php';

function epq_story_beats(): array {
    return [
        'elder'=>['step'=>0,'next'=>1,'realm'=>1,'x'=>880,'xp'=>25,'coins'=>0,'power'=>1,'skill'=>'VOCABULARY'],
        'mira'=>['step'=>1,'next'=>2,'realm'=>2,'x'=>790,'xp'=>30,'coins'=>5,'power'=>1,'skill'=>'VOCABULARY'],
        'tala'=>['step'=>2,'next'=>3,'realm'=>3,'x'=>900,'xp'=>30,'coins'=>5,'power'=>1,'skill'=>'VOCABULARY'],
        'kai'=>['step'=>3,'next'=>4,'realm'=>4,'x'=>870,'xp'=>40,'coins'=>10,'power'=>2,'skill'=>'IT_ENGLISH']
    ];
}

function epq_story_step(mysqli $db, int $playerId): int {
    $create=$db->prepare('INSERT IGNORE INTO verified_story_progress (player_id) VALUES (?)');
    $create->bind_param('i',$playerId);$create->execute();
    $stmt=$db->prepare('SELECT chapter_step FROM verified_story_progress WHERE player_id=?');
    $stmt->bind_param('i',$playerId);$stmt->execute();
    return (int)$stmt->get_result()->fetch_assoc()['chapter_step'];
}

function epq_story_advance(mysqli $db, int $playerId, int $step): void {
    $stmt=$db->prepare('UPDATE verified_story_progress SET chapter_step=? WHERE player_id=?');
    $stmt->bind_param('ii',$step,$playerId);$stmt->execute();
    $stmt=$db->prepare("UPDATE player_game_saves SET save_json=JSON_SET(save_json,'$.questStep',?) WHERE player_id=?");
    $stmt->bind_param('ii',$step,$playerId);$stmt->execute();
}

function epq_quest_reward(mysqli $db, int $playerId, string $key, int $xp, int $coins, int $power, string $skill): bool {
    $stmt=$db->prepare('INSERT IGNORE INTO verified_quest_claims (player_id,claim_key) VALUES (?,?)');
    $stmt->bind_param('is',$playerId,$key);$stmt->execute();
    if (!$stmt->affected_rows) return false;
    epq_apply_reward($db,$playerId,$xp,$coins,$power,$skill,'QUEST','Verified quest: '.$key);
    return true;
}

function epq_quest_location(mysqli $db, int $playerId, int $realm, float $x): void {
    $stmt=$db->prepare('SELECT save_json FROM player_game_saves WHERE player_id=?');
    $stmt->bind_param('i',$playerId);$stmt->execute();
    $row=$stmt->get_result()->fetch_assoc();$state=$row?json_decode($row['save_json'],true):null;
    $realms=[1=>'maple',2=>'forest',3=>'camp',4=>'ruins'];
    if (!is_array($state) || ($state['currentRealmId']??null)!==$realms[$realm] || !empty($state['insideCave'])
        || !is_numeric($state['playerX']??null) || abs((float)$state['playerX']-$x)>125) {
        throw new DomainException('请先走到对应角色或终焉城堡入口旁边。');
    }
}

function epq_typing_bank(): array {
    static $bank;
    return $bank ??= json_decode((string)file_get_contents(__DIR__.'/../data/typing_cave_words.json'),true,512,JSON_THROW_ON_ERROR);
}

function epq_issue_typing_word(array &$state): void {
    if(($state['challengeVersion']??0)===1 && $state['completedLevels']===1){
        $sentences=[['The ancient gate opens after sunset','古老的大门在日落后开启。'],['Our courage grows when we learn together','我们一起学习时，勇气就会增长。'],['The final seal breaks before dawn arrives','黎明到来之前，最后的封印将破碎。']];
        $index=random_int(0,count($sentences)-1);[$answer,$meaning]=$sentences[$index];$words=explode(' ',$answer);$shuffled=$words;shuffle($shuffled);if($shuffled===$words)$shuffled=array_reverse($words);
        $state['word']=['id'=>'boss-sentence-'.$index,'mode'=>'sentence','answer'=>$answer,'words'=>$shuffled,
            'definition'=>'Arrange the words to break the second seal. Start with "'.$words[0].'".', 'definitionZh'=>$meaning];
        $state['questionToken']=bin2hex(random_bytes(16));return;
    }
    $available=array_values(array_filter(epq_typing_bank(),static fn($word)=>!in_array($word['id'],$state['seen'],true)));
    if (!$available) throw new RuntimeException('Typing bank needs at least three words.');
    $state['word']=$available[random_int(0,count($available)-1)];
    if(($state['challengeVersion']??0)===1){
        $state['word']['mode']=$state['completedLevels']===0?'meaning':'spelling';
        if($state['completedLevels']===0){$choices=[$state['word']['answer']];$others=$available;shuffle($others);foreach($others as $other)if(!in_array($other['answer'],$choices,true)){$choices[]=$other['answer'];if(count($choices)===4)break;}shuffle($choices);$state['word']['choices']=$choices;}
    }
    $state['seen'][]=$state['word']['id'];$state['questionToken']=bin2hex(random_bytes(16));
}

function epq_typing_answer_correct(array $word, mixed $answer): bool {
    return is_string($answer) && strlen($answer)<=128
        && strtolower(trim((string)preg_replace('/\s+/u',' ',$answer)))===strtolower(trim($word['answer']));
}

function epq_typing_view(string $runId, array $state): array {
    // Existing hints/letter-by-letter feedback use the word spelling. Reward grading remains server-side.
    return ['runId'=>$runId,'status'=>$state['status'],'completedLevels'=>$state['completedLevels'],
        'questionToken'=>$state['questionToken'],'word'=>$state['word']];
}

function epq_quest_action(mysqli $db,int $playerId,array $body): array {
    $action=$body['action']??'';
    $outcome=['rewardClaimed'=>false,'storyEnding'=>false];
    $step=epq_story_step($db,$playerId);
    if ($action==='NPC') {
        $npc=$body['npcId']??null;
        if (!is_string($npc) || !isset(epq_story_beats()[$npc])) throw new InvalidArgumentException('Unknown NPC.');
        $beat=epq_story_beats()[$npc];
        $outcome['npcId']=$npc;
        if ($step<$beat['step']) throw new DomainException('请先完成前面的剧情。');
        if ($step===$beat['step']) {
            epq_quest_location($db,$playerId,$beat['realm'],$beat['x']);
            $outcome['rewardClaimed']=epq_quest_reward($db,$playerId,'npc:'.$npc,$beat['xp'],$beat['coins'],$beat['power'],$beat['skill']);
            epq_story_advance($db,$playerId,$beat['next']);$step=$beat['next'];
        }
    } elseif ($action==='CASTLE_OPEN') {
        epq_quest_location($db,$playerId,4,(float)epq_world_layout()['castleGateX']);
        $castle=epq_castle_progress($db,$playerId);
        if(!$castle['gateOpen']) {
            if(!$castle['hasKey']) throw new DomainException('CASTLE_KEY_REQUIRED');
            $stmt=$db->prepare("INSERT IGNORE INTO verified_quest_claims (player_id,claim_key) VALUES (?,'castle:gate-open')");
            $stmt->bind_param('i',$playerId);$stmt->execute();
        }
    } elseif ($action==='TYPING_START') {
        epq_require_dungeon_access($db,$playerId,'ruins');
        epq_quest_location($db,$playerId,4,(float)epq_world_layout()['finalCastleX']);
        if(!epq_castle_progress($db,$playerId)['gateOpen']) throw new DomainException('CASTLE_KEY_REQUIRED');
        $close=$db->prepare("UPDATE verified_typing_runs SET state_json=JSON_SET(state_json,'$.status','CLOSED') WHERE player_id=? AND JSON_UNQUOTE(JSON_EXTRACT(state_json,'$.status'))='ACTIVE'");
        $close->bind_param('i',$playerId);$close->execute();
        $runId=bin2hex(random_bytes(16));
        $state=['status'=>'ACTIVE','challengeVersion'=>1,'kind'=>'typing','completedLevels'=>0,'seen'=>[],'word'=>null,'questionToken'=>null];
        epq_issue_typing_word($state);
        $json=json_encode($state,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE);
        $stmt=$db->prepare('INSERT INTO verified_typing_runs (run_id,player_id,state_json) VALUES (?,?,?)');
        $stmt->bind_param('sis',$runId,$playerId,$json);$stmt->execute();
        $outcome['typing']=epq_typing_view($runId,$state);
    } elseif (in_array($action,['TYPING_ANSWER','TYPING_CLOSE'],true)) {
        $runId=$body['runId']??null;
        if (!is_string($runId) || !preg_match('/\A[a-f0-9]{32}\z/',$runId)) throw new InvalidArgumentException('Invalid typing run.');
        $stmt=$db->prepare('SELECT state_json FROM verified_typing_runs WHERE run_id=? AND player_id=? FOR UPDATE');
        $stmt->bind_param('si',$runId,$playerId);$stmt->execute();$row=$stmt->get_result()->fetch_assoc();
        if (!$row) throw new DomainException('当前挑战不属于这个角色。');
        $state=json_decode($row['state_json'],true,512,JSON_THROW_ON_ERROR);
        if(($state['kind']??'typing')!=='typing')throw new DomainException('当前记录不是城堡挑战。');
        if ($action==='TYPING_CLOSE') { if ($state['status']==='ACTIVE') $state['status']='CLOSED'; }
        else {
            if ($state['status']!=='ACTIVE' || ($body['questionToken']??null)!==$state['questionToken']) throw new DomainException('本题已经结束，请重新进入挑战。');
            if (!is_string($body['answer']??null) || strlen($body['answer'])>128) throw new InvalidArgumentException('Invalid answer.');
            $outcome['correct']=epq_typing_answer_correct($state['word'],$body['answer']);
            if ($outcome['correct']) {
                $outcome['rewardClaimed']=epq_quest_reward($db,$playerId,'typing:'.$runId.':'.$state['questionToken'],10,5,1,'VOCABULARY');
                $state['completedLevels']++;
                if ($state['completedLevels']===3) {
                    $state['status']='WON';$state['questionToken']=null;
                    if ($step===4) {
                        epq_quest_reward($db,$playerId,'story:ending',50,25,2,'IT_ENGLISH');
                        epq_story_advance($db,$playerId,5);$step=5;$outcome['storyEnding']=true;
                    }
                } else epq_issue_typing_word($state);
            }
        }
        $json=json_encode($state,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE);
        $stmt=$db->prepare('UPDATE verified_typing_runs SET state_json=? WHERE run_id=?');
        $stmt->bind_param('ss',$json,$runId);$stmt->execute();
        $outcome['typing']=epq_typing_view($runId,$state);
    } elseif(in_array($action,['EXPLORE','MEMORY_START','ACTIVITY_ANSWER','COMPANION_CLAIM','WORLD_COMPLETE'],true)) {
        $outcome=epq_adventure_action($db,$playerId,$body);
    } else throw new InvalidArgumentException('Unknown quest action.');
    return ['ok'=>true,'chapterStep'=>$step,'player'=>epq_reward_balance($db,$playerId),'outcome'=>$outcome,'castle'=>epq_castle_progress($db,$playerId)];
}
