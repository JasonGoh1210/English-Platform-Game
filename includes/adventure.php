<?php
declare(strict_types=1);
require_once __DIR__.'/battle_rules.php';
require_once __DIR__.'/shop.php';
require_once __DIR__.'/memory_context.php';
require_once __DIR__.'/handbook.php';

function epq_adventure_id(int $playerId): string {return md5('EPQ:adventure:v1:'.$playerId);}
function epq_adventure_load(mysqli $db,int $playerId): array {
    $id=epq_adventure_id($playerId);$s=$db->prepare('SELECT state_json FROM verified_typing_runs WHERE run_id=? AND player_id=?');$s->bind_param('si',$id,$playerId);$s->execute();$row=$s->get_result()->fetch_assoc();
    if(!$row)return ['kind'=>'adventure','status'=>'ADVENTURE','version'=>2,'memory'=>[],'current'=>null];
    $state=json_decode($row['state_json'],true,512,JSON_THROW_ON_ERROR);if(($state['kind']??null)!=='adventure')throw new RuntimeException('Activity record conflict.');
    // Retain earned trail rewards, but never resume removed clues.
    if(($state['current']['kind']??null)==='trail')$state['current']=null;return $state;
}
function epq_adventure_save(mysqli $db,int $playerId,array $state): void {
    $id=epq_adventure_id($playerId);$json=json_encode($state,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE);
    $s=$db->prepare('INSERT INTO verified_typing_runs (run_id,player_id,state_json) VALUES (?,?,?) ON DUPLICATE KEY UPDATE state_json=VALUES(state_json)');$s->bind_param('sis',$id,$playerId,$json);$s->execute();
}
function epq_memory_candidates(mysqli $db,int $playerId): array {
    $s=$db->prepare("SELECT a.attempt_id,a.question_code,a.question_json FROM verified_answer_attempts a JOIN
        (SELECT MAX(m.attempt_id) AS latest FROM verified_answer_attempts m JOIN verified_battles b ON b.battle_id=m.battle_id
         WHERE b.player_id=? AND m.is_correct=0 AND JSON_UNQUOTE(JSON_EXTRACT(b.state_json,'$.status')) IN ('VICTORY','DEFEAT','ESCAPED') GROUP BY m.question_code) recent
        ON a.attempt_id=recent.latest ORDER BY a.attempt_id DESC");$s->bind_param('i',$playerId);$s->execute();$items=[];
    foreach($s->get_result() as $row)$items[$row['question_code']]=$row;return $items;
}
function epq_adventure_view(mysqli $db,int $playerId,?array $state=null): array {
    $state??=epq_adventure_load($db,$playerId);$candidates=epq_memory_candidates($db,$playerId);$due=0;$mastered=0;$next=null;
    foreach($candidates as $id=>$row){$m=$state['memory'][$id]??[];$new=(int)($m['mistake']??0)<(int)$row['attempt_id'];$when=$new?0:(int)($m['due']??0);if(!$new&&(int)($m['stage']??0)>=3)$mastered++;if($when<=time())$due++;else$next=$next===null?$when:min($next,$when);
        if($new&&$m){$state['memory'][$id]['bestStage']=max((int)($m['bestStage']??0),(int)($m['stage']??0));$state['memory'][$id]['stage']=0;}
    }
    $book=epq_handbook_view($db,$playerId,$state);$bond=min(100,$mastered*10+count(array_filter($book['companions'],static fn($b)=>$b['claimed']))*8);
    return ['memory'=>['due'=>$due,'total'=>count($candidates),'mastered'=>$mastered,'nextDue'=>$next],'bond'=>$bond,'book'=>$book,'altars'=>['maple'=>1290,'forest'=>1450,'camp'=>1810,'ruins'=>1950]];
}
function epq_activity_public(array $current): array {
    return ['token'=>$current['token'],'kind'=>$current['kind'],'id'=>$current['id'],'context'=>$current['question']['memoryContext']??'historical','question'=>epq_public_question($current['question'])];
}
function epq_adventure_action(mysqli $db,int $playerId,array $body): array {
    $state=epq_adventure_load($db,$playerId);$action=$body['action'];$out=['rewardClaimed'=>false];
    if($action==='EXPLORE')throw new DomainException('探索小支线已移除。 / Exploration trails were removed.');
    if($action==='MEMORY_START'){
        $candidates=epq_memory_candidates($db,$playerId);
        if(($state['current']['kind']??null)==='memory')$out['activity']=epq_activity_public($state['current']);
        else foreach($candidates as $id=>$row){$m=$state['memory'][$id]??[];$new=(int)($m['mistake']??0)<(int)$row['attempt_id'];if(!$new&&(int)($m['due']??0)>time())continue;
            $original=json_decode($row['question_json'],true,512,JSON_THROW_ON_ERROR);
            if($new)$state['memory'][$id]=['stage'=>0,'bestStage'=>max((int)($m['bestStage']??0),(int)($m['stage']??0)),'due'=>0,'mistake'=>(int)$row['attempt_id'],'realm'=>$original['realm']??'maple'];
            $q=epq_prepare_question(epq_memory_context($original,(int)($state['memory'][$id]['stage']??0)));$q['timed']=false;
            $state['current']=['kind'=>'memory','id'=>$id,'token'=>bin2hex(random_bytes(16)),'question'=>$q];$out['activity']=epq_activity_public($state['current']);break;
        }
        if(!isset($out['activity']))$out['empty']=true;
    }elseif($action==='ACTIVITY_ANSWER'){
        $current=$state['current'];if(!$current||($current['kind']??'')!=='memory'||!is_string($body['questionToken']??null)||!hash_equals($current['token'],$body['questionToken']))throw new DomainException('本题已结束，请重新打开。 / Question no longer active.');
        $q=$current['question'];$correct=epq_answer_correct($q,$body['answer']??null);$out+=['correct'=>$correct,'answer'=>$q['answerOrder']??$q['answer'],'explanation'=>$q['explanation']??'','explanationZh'=>$q['explanationZh']??'','activityKind'=>'memory','questionId'=>$current['id']];
        $m=&$state['memory'][$current['id']];$m['bestStage']=max((int)($m['bestStage']??0),(int)$m['stage']);$m['stage']=$correct?min(3,(int)$m['stage']+1):0;$m['bestStage']=max($m['bestStage'],$m['stage']);$m['due']=time()+($correct?[300,86400,604800][max(0,$m['stage']-1)]:60);
        $out['masteryStage']=$m['stage'];$out['nextDue']=$m['due'];if($correct&&$m['stage']===3)$out['rewardClaimed']=epq_quest_reward($db,$playerId,'mastery:'.$current['id'],10,8,0,epq_question_skill($q));
        $state['current']=null;
    }elseif($action==='COMPANION_CLAIM'){
        $id=$body['companionId']??null;if(!is_string($id)||!isset(epq_companion_goals()[$id]))throw new InvalidArgumentException('Unknown companion.');
        $book=epq_handbook_view($db,$playerId,$state);$buddy=$book['companions'][$id];
        if(!$buddy['owned']||$book['equipped']!==$id||!$buddy['ready'])throw new DomainException('请装备该随从并完成同行目标。 / Equip this companion and finish its goal.');
        $out['rewardClaimed']=epq_quest_reward($db,$playerId,'companion:'.$id,10,5,0,'VOCABULARY');$out['companionCharm']=$id;
    }elseif($action==='WORLD_COMPLETE'){
        $id=$body['realmId']??null;if(!is_string($id)||!in_array($id,['maple','forest','camp','ruins'],true))throw new InvalidArgumentException('Unknown realm.');
        $book=epq_handbook_view($db,$playerId,$state);if($book['worlds'][$id]['percent']!==100)throw new DomainException('该世界尚未完成。 / This world is not complete.');
        $out['rewardClaimed']=epq_quest_reward($db,$playerId,'world:complete:'.$id,20,15,0,'VOCABULARY');$out['worldComplete']=$id;
    }else throw new InvalidArgumentException('Unknown handbook action.');
    epq_adventure_save($db,$playerId,$state);$out['adventure']=epq_adventure_view($db,$playerId,$state);
    if($action==='ACTIVITY_ANSWER'){
        // This transaction writes its receipt after returning from this function.
        // Include the just-graded review now; receipt replays read the committed ledger instead.
        $review=&$out['adventure']['book']['report']['memory'];$review['total']++;$review['correct']+=$out['correct']?1:0;$review['rate']=round($review['correct']*100/$review['total'],1);
    }
    return $out;
}
