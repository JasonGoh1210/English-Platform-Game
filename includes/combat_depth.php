<?php
declare(strict_types=1);

function epq_combat_start(string $enemyId,array $skills): array {
    $kind=match($enemyId){'bat-01'=>'dive','hollow-treant-01'=>'vines','castle-warden-01'=>'shield',
        'road-guardian-01','guardian-01','moss-sentinel-01','clockwork-owl-01'=>'runes',
        'cave-wraith-01'=>'haunt','ember-scorpion-01'=>'carapace','echo-dragon-01'=>'scales',default=>'practice'};
    return ['version'=>1,'kind'=>$kind,'turn'=>1,'guard'=>false,'shield'=>0,'energy'=>0,'surge'=>false,
        'barrier'=>in_array($kind,['vines','shield','carapace','scales'],true)?2:0,
        'grammarLevel'=>(int)($skills['grammarGuardLevel']??0),'sentenceLevel'=>(int)($skills['sentenceSurgeLevel']??0)];
}
function epq_combat_view(array $state): ?array {
    if(!isset($state['combat']))return null;$c=$state['combat'];
    $c['intent']=match($c['kind']){
        'dive'=>$c['turn']%3===0?'dive':'circle','vines'=>$c['barrier']?'vines':'exposed',
        'shield','carapace','scales'=>$c['barrier']?'shield':'exposed',
        'runes'=>$c['turn']%2===0?'rune':'watch','haunt'=>'haunt',default=>'practice'};
    return $c;
}
function epq_combat_choice(array &$state,string $action): void {
    if(!isset($state['combat']))throw new DomainException('COMBAT_LEGACY');
    if($state['question']===null)throw new DomainException('COMBAT_NO_QUESTION');
    $c=&$state['combat'];
    if($action==='GUARD'){
        if($state['focusUsed']||$c['surge'])throw new DomainException('COMBAT_CHOICE_LOCKED');
        $c['guard']=true;
    }elseif($action==='SURGE'){
        if($c['guard']||$c['surge']||$c['sentenceLevel']<1||$c['energy']<3)throw new DomainException('SURGE_NOT_READY');
        $c['energy']-=3;$c['surge']=true;
    }
}
// The answer still determines success. Enemy traits alter the hit, never its grading/rewards.
function epq_combat_answer(array &$state,array $question,array &$outcome,int $baseDamage): void {
    if(!isset($state['combat']))return;$c=&$state['combat'];$messages=[];
    if($outcome['correct']){
        $skill=epq_question_skill($question);$damage=$outcome['damage'];
        if($c['barrier']>0){
            $break=$state['focusUsed']||$skill==='VOCABULARY'||$skill==='SENTENCE_CONSTRUCTION';
            $c['barrier']=max(0,$c['barrier']-($break?2:1));
            if(!$break)$damage=max(1,$damage-6);
            $messages[]=$c['barrier']?'barrier-hit':'barrier-broken';
        }
        if($c['kind']==='dive'&&$c['turn']%3===0){$damage+=6;$messages[]='dive-interrupted';}
        if($c['kind']==='runes'&&$c['turn']%2===0){$damage+=4;$messages[]='rune-broken';}
        if($skill==='GRAMMAR'&&$c['grammarLevel']>0){
            $gain=epq_skill_branches()['grammar-guard'][$c['grammarLevel']-1];$c['shield']=min(12,$c['shield']+$gain);$messages[]='shield-gained';
        }
        if($c['surge']){$damage+=epq_skill_branches()['sentence-surge'][$c['sentenceLevel']-1];$c['surge']=false;$messages[]='surge-hit';}
        if($skill==='SENTENCE_CONSTRUCTION'&&$c['sentenceLevel']>0)$c['energy']=min(3,$c['energy']+1);
        $outcome['damage']=$damage;
    }else{
        $damage=$baseDamage;
        if($c['guard']){$damage=(int)ceil($damage/2);$messages[]='guarded';}
        $absorb=min($c['shield'],$damage);$damage-=$absorb;$c['shield']-=$absorb;
        if($absorb)$messages[]='shield-absorbed';
        $outcome['enemyDamage']=$damage;
        // A missed rune window is shown, not an unexplained extra HP penalty.
    }
    $c['guard']=false;$c['turn']++;$outcome['combatEvents']=$messages;
}
