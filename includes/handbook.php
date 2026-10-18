<?php
declare(strict_types=1);
require_once __DIR__.'/battle_rules.php';
require_once __DIR__.'/shop.php';

function epq_companion_goals(): array {
    static $data;return $data??=json_decode((string)file_get_contents(__DIR__.'/../data/companion_goals.json'),true,512,JSON_THROW_ON_ERROR);
}
function epq_handbook_monsters(): array {
    $base=[
        'slime-01'=>['Word Slime','单词史莱姆','/FYP/assets/enemies/monster/Shrim.png','Try Focus or Guard while learning the basics.','学习基础操作，尝试专注与防御。',['greeting','问候']],
        'bat-01'=>['Confusion Bat','迷惑蝙蝠','/FYP/images/world/monsters/confusion-bat-64.png','Every third turn, a correct answer interrupts its dive for 6 extra damage.','每第三回合出现俯冲破绽，答对打断并额外造成6伤害。',['careful','小心']],
        'road-guardian-01'=>['Road Guardian','道路守卫','/FYP/images/world/monsters/road-guardian-64.png','A rune opens every second turn: answer correctly for 4 extra damage.','每第二回合符文露出，答对额外造成4伤害。',['shelter','庇护所']],
        'guardian-01'=>['Grammar Guardian','语法守卫','/FYP/images/world/monsters/grammar-guardian-64.png','Read the rune warning and choose between Focus and Guard.','观察符文预警，选择专注或防御。',['permission','许可']],
        'hollow-treant-01'=>['Hollow Treant','枯木树妖','/FYP/images/castle/hollow-treant-96.png','Vocabulary, sentences or Focus break its two vine layers faster.','词汇、排句或专注可以更快解除两层藤蔓。',['restore','修复']],
        'castle-warden-01'=>['Castle Warden','城门侍卫','/FYP/images/castle/gate-warden-96.png','Break the shield. Victory earns the persistent castle key.','击破护盾，胜利后获得永久保存的城堡钥匙。',['unlock','解锁']]
    ];
    $dungeonWords=['moss-sentinel-01'=>['observe','观察'],'ember-scorpion-01'=>['resist','抵抗'],'cave-wraith-01'=>['whisper','低语'],'echo-slime-01'=>['protect','保护'],'echo-dragon-01'=>['memory','记忆']];
    foreach(epq_dungeon_specs() as $realm=>$spec)foreach($spec['enemies'] as $m){
        if(!empty($spec['legacyOnly']))continue;
        $tip=in_array($m['id'],['ember-scorpion-01','echo-dragon-01'],true)
            ?['Vocabulary, sentences or Focus break its armour.','使用词汇、排句或专注击破护甲。']
            :['Watch the intent. Guard reduces a mistake hit; owned potions can restore HP.','观察意图，防御减少失误伤害，已有药水可以恢复生命。'];
        if($m['id']==='moss-sentinel-01')$tip=['Its rune opens every second turn. A correct answer deals 4 extra damage.','苔菇守卫每第二回合露出符文，答对额外造成4伤害。'];
        if($m['id']==='cave-wraith-01')$tip=['Correct answers strike the wraith without hurting you. Prepare Guard before a difficult answer.','答对只会攻击幽魂，不扣你的血；难题作答前可以准备防御。'];
        if($m['id']==='echo-slime-01')$tip=['Read each statement carefully. A stored hint potion gives a clue without answering for you.','读清判断句再选择；已有提示药水会给线索，但不会代答。'];
        $base[$m['id']]=[$m['name'],$m['nameZh'],$m['spritePath'],...$tip,$dungeonWords[$m['id']]??['echo','回声']];
    }
    return $base;
}
function epq_handbook_view(mysqli $db,int $playerId,array $activity): array {
    $enemies=epq_battle_enemies();$facts=[];
    $s=$db->prepare("SELECT enemy_code,COUNT(*) AS seen,SUM(JSON_UNQUOTE(JSON_EXTRACT(state_json,'$.status'))='VICTORY') AS wins
        FROM verified_battles WHERE player_id=? GROUP BY enemy_code");$s->bind_param('i',$playerId);$s->execute();
    foreach($s->get_result() as $row)$facts[$row['enemy_code']]=['seen'=>(int)$row['seen'],'wins'=>(int)$row['wins']];
    $s=$db->prepare('SELECT claim_key FROM verified_quest_claims WHERE player_id=?');$s->bind_param('i',$playerId);$s->execute();$claims=array_column($s->get_result()->fetch_all(MYSQLI_ASSOC),'claim_key');
    $chapter=epq_story_step($db,$playerId);$access=epq_dungeon_access($db,$playerId);
    foreach(epq_dungeon_specs() as $realm=>$spec)if($access[$realm]&&!isset($facts[$spec['gate']]))$facts[$spec['gate']]=['seen'=>1,'wins'=>1];
    $s=$db->prepare("SELECT state_json FROM verified_typing_runs WHERE player_id=? AND JSON_EXTRACT(state_json,'$.completedLevels') IS NOT NULL");$s->bind_param('i',$playerId);$s->execute();$bossSeen=0;$bossWins=0;
    foreach($s->get_result() as $row){$run=json_decode($row['state_json'],true);if(($run['kind']??'typing')==='typing'){$bossSeen++;if(($run['status']??'')==='WON')$bossWins++;}}
    if(in_array('story:ending',$claims,true)){$bossSeen=max(1,$bossSeen);$bossWins=max(1,$bossWins);}
    $s=$db->prepare('SELECT a.attempt_id,a.question_code,a.question_json,a.is_correct,b.enemy_code FROM verified_answer_attempts a
        JOIN verified_battles b ON b.battle_id=a.battle_id WHERE b.player_id=? ORDER BY a.attempt_id');$s->bind_param('i',$playerId);$s->execute();
    $first=[];$repeated=['total'=>0,'correct'=>0];$all=['total'=>0,'correct'=>0];$perSkill=[];$skillCorrect=[];$realmCorrect=array_fill_keys(['maple','forest','camp','ruins'],0);
    foreach($s->get_result() as $row){
        $q=json_decode($row['question_json'],true,512,JSON_THROW_ON_ERROR);$skill=epq_question_skill($q);$correct=(int)$row['is_correct'];$all['total']++;$all['correct']+=$correct;$skillCorrect[$skill]=($skillCorrect[$skill]??0)+$correct;
        $realm=$q['realm']??($enemies[$row['enemy_code']]['realm']??'maple');if($correct&&isset($realmCorrect[$realm]))$realmCorrect[$realm]++;
        if(isset($first[$row['question_code']])){$repeated['total']++;$repeated['correct']+=$correct;continue;}
        $first[$row['question_code']]=['correct'=>$correct,'skill'=>$skill];$perSkill[$skill]??=['total'=>0,'correct'=>0];$perSkill[$skill]['total']++;$perSkill[$skill]['correct']+=$correct;
    }
    $rate=static function(array $counts):array{$counts['rate']=$counts['total']?round($counts['correct']*100/$counts['total'],1):null;return $counts;};
    $firstCounts=['total'=>count($first),'correct'=>array_sum(array_column($first,'correct'))];$ordered=array_values($first);
    $window=static fn(array $items):array=>$rate(['total'=>count($items),'correct'=>array_sum(array_column($items,'correct'))]);
    $s=$db->prepare("SELECT response_json FROM verified_quest_events WHERE player_id=? AND (JSON_EXTRACT(response_json,'$.outcome.masteryStage') IS NOT NULL OR (JSON_EXTRACT(response_json,'$.outcome.typing') IS NOT NULL AND JSON_EXTRACT(response_json,'$.outcome.correct') IS NOT NULL))");$s->bind_param('i',$playerId);$s->execute();$reviews=['total'=>0,'correct'=>0];$castleAnswers=['total'=>0,'correct'=>0];
    foreach($s->get_result() as $row){$out=json_decode($row['response_json'],true)['outcome'];if(isset($out['masteryStage'])){$reviews['total']++;$reviews['correct']+=!empty($out['correct'])?1:0;}else{$castleAnswers['total']++;$castleAnswers['correct']+=!empty($out['correct'])?1:0;}}
    $s=$db->prepare("SELECT COUNT(DISTINCT CONCAT(e.battle_id,':',JSON_UNQUOTE(JSON_EXTRACT(e.response_json,'$.battle.combat.turn')))) AS n
        FROM verified_battle_events e JOIN verified_battles b ON b.battle_id=e.battle_id
        WHERE b.player_id=? AND JSON_UNQUOTE(JSON_EXTRACT(e.response_json,'$.battle.combat.guard'))='true'");$s->bind_param('i',$playerId);$s->execute();$guards=(int)$s->get_result()->fetch_assoc()['n'];
    $shop=epq_shop_view($db,$playerId);$bought=0;$uses=0;
    foreach(epq_shop_events($db,$playerId) as $event){if(($event['action']??'')==='BUY'&&in_array($event['item']??'', ['potion','hint_potion'],true))$bought++;if(($event['action']??'')==='USE'&&($event['item']??'')==='potion')$uses++;}
    $mastered=0;$restoration=array_fill_keys(['maple','forest','camp','ruins'],0);
    foreach($activity['memory']??[] as $qid=>$m){if((int)($m['stage']??0)>=3)$mastered++;$realm=$m['realm']??'maple';if(isset($restoration[$realm]))$restoration[$realm]=min(3,$restoration[$realm]+max((int)($m['bestStage']??0),(int)($m['stage']??0)));}
    $metrics=['correct'=>$all['correct'],'firstCorrect'=>$firstCounts['correct'],'suppliesBought'=>$bought,'chapter'=>$chapter,'potionUses'=>$uses,'guards'=>$guards,'grammarCorrect'=>$skillCorrect['GRAMMAR']??0,'mastered'=>$mastered,'ruinsVictories'=>0,'caveVictories'=>0];
    foreach($facts as $id=>$f){if(($enemies[$id]['realm']??'')==='ruins')$metrics['ruinsVictories']+=$f['wins'];if(isset($enemies[$id]['dungeon']))$metrics['caveVictories']+=$f['wins'];}
    $buddies=[];foreach(epq_companion_goals() as $id=>$goal)$buddies[$id]=$goal+['current'=>min($goal['required'],$metrics[$goal['metric']]),'ready'=>$metrics[$goal['metric']]>=$goal['required'],'claimed'=>in_array('companion:'.$id,$claims,true),'owned'=>in_array($id,$shop['owned'],true)];
    $monsters=[];foreach(epq_handbook_monsters() as $id=>$info){$f=$facts[$id]??['seen'=>0,'wins'=>0];$m=$enemies[$id];$monsters[]=['id'=>$id,'realm'=>$m['realm'],'seen'=>$f['seen']>0,'defeated'=>$f['wins']>0,'wins'=>$f['wins'],'name'=>$info[0],'nameZh'=>$info[1],'sprite'=>$info[2],'hp'=>$m['hp'],'tip'=>$info[3],'tipZh'=>$info[4],'word'=>$info[5]];}
    $monsters[]=['id'=>'wordless-king','realm'=>'ruins','seen'=>$bossSeen>0,'defeated'=>$bossWins>0,'wins'=>$bossWins,'name'=>'Wordless King','nameZh'=>'无言魔王','sprite'=>'/FYP/images/castle/wordless-king-128.png','hp'=>3,'tip'=>'Break three seals: meaning, sentence, then spelling.','tipZh'=>'依次击碎词义、排句和拼写三道封印。','word'=>['courage','勇气']];
    $worlds=[];$index=0;foreach(['maple','forest','camp','ruins'] as $realm){$index++;$spec=epq_dungeon_specs()[$realm];
        $goals=[['key'=>'story','en'=>'Story chapter','zh'=>'世界主线','done'=>$chapter>=$index],['key'=>'road','en'=>'Outdoor guardian','zh'=>'外部守卫','done'=>($facts[$spec['gate']]['wins']??0)>0],['key'=>'learning','en'=>'One correct world answer','zh'=>'答对一道世界题','done'=>$realmCorrect[$realm]>0]];
        if(empty($spec['legacyOnly']))foreach($spec['enemies'] as $m)$goals[]=['key'=>$m['id'],'en'=>$m['name'],'zh'=>$m['nameZh'],'done'=>($facts[$m['id']]['wins']??0)>0];
        if($realm==='ruins')foreach([['hollow-treant-01','Restore the treant','复原树妖'],['castle-warden-01','Castle key','获得城堡钥匙'],['gate','Unlock castle gate','打开城堡大门'],['boss','Final boss','击败最终魔王']] as [$id,$en,$zh])$goals[]=['key'=>$id,'en'=>$en,'zh'=>$zh,'done'=>$id==='gate'?in_array('castle:gate-open',$claims,true)||$bossWins>0:($id==='boss'?$bossWins>0:($facts[$id]['wins']??0)>0)];
        $done=count(array_filter($goals,static fn($g)=>$g['done']));$worlds[$realm]=['goals'=>$goals,'done'=>$done,'total'=>count($goals),'percent'=>(int)floor(100*$done/count($goals)),'claimed'=>in_array('world:complete:'.$realm,$claims,true)];
    }
    return ['monsters'=>$monsters,'worlds'=>$worlds,'companions'=>$buddies,'equipped'=>$shop['equipped'],'restoration'=>$restoration,'festival'=>$chapter>=5,
        'report'=>['first'=>$rate($firstCounts),'repeatedBattle'=>$rate($repeated),'memory'=>$rate($reviews),'castle'=>$rate($castleAnswers)+['wins'=>$bossWins],'skills'=>array_map($rate,$perSkill),'comparisonReady'=>count($ordered)>=20,'early'=>$window(array_slice($ordered,0,10)),'recent'=>$window(array_slice($ordered,-10))]];
}
