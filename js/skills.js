import {renderSkillGraph} from './skill-graph.js?v=20261018-newbie1';
import { t, getLanguage, setLanguage, onLanguageChange } from "./i18n.js?v=20261018-newbie1";

const branches={
  'word-strike':{field:'wordStrikeLevel',en:'Word Power',zh:'词汇之力',bonuses:[4,8,12],description:['Correct vocabulary answers deal extra damage. Focus breaks enemy barriers.','答对词汇题增加伤害；专注攻击可以击破怪物屏障。']},
  'grammar-guard':{field:'grammarGuardLevel',en:'Grammar Ward',zh:'语法守护',bonuses:[2,4,6],description:['Correct grammar answers build a shield, up to 12 HP. The shield absorbs later mistake damage.','答对语法题获得护盾，最多积累12点；护盾抵消之后失误受到的伤害。']},
  'sentence-surge':{field:'sentenceSurgeLevel',en:'Sentence Surge',zh:'句子蓄能',bonuses:[6,12,18],description:['Correct sentence answers build energy. At 3 energy, choose Surge to strengthen your next correct attack.','答对排句题积累能量；达到3点后选择「蓄力重击」，强化下一次正确攻击。']}
};
let branch='word-strike';
const pick=(en,zh)=>getLanguage()==='zh'?zh:en;
const branchLevel=s=>Number(s?.[branches[branch].field]||0);
let nodes = [{level:1,cost:1,requiredLevel:2,bonus:4},{level:2,cost:2,requiredLevel:3,bonus:8},{level:3,cost:3,requiredLevel:5,bonus:12}];
const byId = id=>document.getElementById(id);
const element = (tag,cls,text)=>{const el=document.createElement(tag);el.className=cls;if(text!==undefined)el.textContent=text;return el;};
export function validSkillsReceipt(receipt) {
  const s=receipt?.skills;
  return receipt?.ok===true && s && Number.isSafeInteger(s.characterLevel) && s.characterLevel>=1
    && Number.isSafeInteger(s.skillPoints) && s.skillPoints>=0
    && ['grammarGuardLevel','sentenceSurgeLevel'].every(key=>s[key]===undefined||Number.isSafeInteger(s[key])&&s[key]>=0&&s[key]<=3)
    && Number.isSafeInteger(s.wordStrikeLevel) && s.wordStrikeLevel>=0 && s.wordStrikeLevel<=3;
}
let skills=null,busy=false,errorKey=null,noticeKey=null,selected=null,pendingTarget=null;

export function skillNodeState(snapshot,node,field="wordStrikeLevel") {
  if(!snapshot)return {known:false,owned:false,ready:false,previousMet:false,levelMet:false,pointsMet:false,levelGap:null,pointsGap:null};
  const owned=(snapshot[field]||0)>=node.level;
  const previousMet=(snapshot[field]||0)>=node.level-1;
  const levelGap=Math.max(0,node.requiredLevel-snapshot.characterLevel),pointsGap=Math.max(0,node.cost-snapshot.skillPoints);
  return {known:true,owned,ready:!owned&&previousMet&&levelGap===0&&pointsGap===0,
    previousMet,levelMet:levelGap===0,pointsMet:pointsGap===0,levelGap,pointsGap};
}
function selectionReady(node) {
  return !!node&&!busy&&pendingTarget===null&&!errorKey&&skillNodeState(skills,node,branches[branch].field).ready;
}
function nodeExplanation(node,state) {
  if(!state.known)return t(errorKey||"review.loading");
  if(state.owned)return t(branchLevel(skills)===node.level?"skills.currentTier":"skills.replacedTier",{level:branchLevel(skills)});
  const conditions=element("ul","skill-conditions");
  const rows=[
    {met:state.previousMet,text:t(node.level===1?"skills.noPrevious":"skills.previousDetail",{level:node.level-1})},
    {met:state.levelMet,text:t("skills.levelDetail",{current:skills.characterLevel,required:node.requiredLevel})+(state.levelGap?t("skills.levelGap",{gap:state.levelGap}):"")},
    {met:state.pointsMet,text:t("skills.pointsDetail",{current:skills.skillPoints,cost:node.cost})+(state.pointsGap?t("skills.pointsGap",{gap:state.pointsGap}):"")}
  ];
  for(const row of rows){const item=element("li",row.met?"met":"missing",(row.met?"✓ ":"○ ")+row.text);conditions.append(item);}
  return conditions;
}
function render() {
  document.body.dataset.skillBranch=branch;
  const focusedBranch=document.activeElement?.dataset.skillBranch,focusedTier=document.activeElement?.dataset.skillLevel;
  byId('skillsCharacterLevel').textContent=skills?.characterLevel??'—';byId('skillsPoints').textContent=skills?.skillPoints??'—';
  byId('skillsUnlockedCount').textContent=skills?Object.values(branches).reduce((n,b)=>n+(skills[b.field]||0),0)+' / 9':'— / 9';
  const nav=byId('skillBranches');nav.replaceChildren();
  for(const [id,info] of Object.entries(branches)){
    const button=element('button',id===branch?'active':'',pick(info.en,info.zh));button.type='button';button.dataset.skillBranch=id;button.setAttribute('aria-pressed',String(id===branch));button.disabled=busy||pendingTarget!==null;
    const count=element('small','',pick('Unlocked ','已解锁 ')+(skills?.[info.field]??'—')+'/3');button.append(count);
    button.addEventListener('click',()=>selectGraphNode(id,Math.min(3,(skills?.[info.field]||0)+1)));nav.append(button);
  }
  const info=branches[branch];nodes=nodes.map(n=>({...n,bonus:info.bonuses[n.level-1]}));
  if(!selected)selected=nodes[Math.min(2,branchLevel(skills))];
  renderSkillGraph({root:byId('skillsTree'),branches,skills,selected:{branch,level:selected.level},busy:busy||pendingTarget!==null,stateFor:skillNodeState,language:getLanguage(),onSelect:(id,node)=>selectGraphNode(id,node.level)});
  byId('skillMapKey').textContent=pick('◆ Available · ✓ Learned · ◇ Locked. Select a node for costs and effects. Arrow keys move between nodes.','◆ 可解锁 · ✓ 已学会 · ◇ 未满足。选择节点查看费用与效果；方向键切换节点。');
  const title=byId('wordPowerTitle'),description=document.querySelector('.skills-branch-description');title.removeAttribute('data-i18n');description.removeAttribute('data-i18n');
  title.textContent=pick(info.en,info.zh)+' '+selected.level;description.textContent=pick(...info.description);
  const eyebrow=document.querySelector('.skills-eyebrow');eyebrow.removeAttribute('data-i18n');eyebrow.textContent=pick('Skill details · Shared point budget','技能详情 · 共用技能点');
  const currentBonus=info.bonuses[branchLevel(skills)-1]||0;
  byId('skillsCurrentEffect').textContent=pick('Current effect +','当前效果 +')+currentBonus+' · '+pick('Selected tier +','所选等级 +')+selected.bonus;
  const detail=byId('skillDetail');detail.replaceChildren();
  const effect=element('p','skill-effect',pick(branch==='grammar-guard'?'Shield gained +':branch==='sentence-surge'?'Surge bonus +':'Vocabulary damage +',branch==='grammar-guard'?'语法护盾 +':branch==='sentence-surge'?'重击伤害 +':'词汇伤害 +')+selected.bonus);
  detail.append(effect,element('p','',t('skills.requirement',{level:selected.requiredLevel,cost:selected.cost})));
  const state=skillNodeState(skills,selected,info.field),why=nodeExplanation(selected,state);detail.append(typeof why==='string'?element('p','',why):why);
  byId('skillsInspectBuy').disabled=!selectionReady(selected);byId('skillsInspectBuy').textContent=t(state.owned?'skills.owned':'skills.unlock');
  byId('skillsStatus').textContent=pendingTarget!==null?t(busy?'skills.confirmingTarget':'skills.pendingTarget',{level:pendingTarget}):t(busy?'skills.saving':errorKey||noticeKey||(branchLevel(skills)===3?'skills.maxed':'skills.ready'));
  byId('skillsRetry').classList.toggle('hidden',!errorKey||busy);byId('skillsRetry').textContent=t(errorKey==='skills.sessionExpired'?'skills.refreshPage':pendingTarget!==null?'skills.retryTarget':'skills.refreshData');
  document.querySelectorAll('[data-set-language]').forEach(b=>b.classList.toggle('active',b.dataset.setLanguage===getLanguage()));
  renderConfirm();
  if(focusedBranch&&!busy){const selector=focusedTier?'#skillsTree [data-skill-branch="'+focusedBranch+'"][data-skill-level="'+focusedTier+'"]':'#skillBranches [data-skill-branch="'+focusedBranch+'"]';document.querySelector(selector)?.focus({preventScroll:true});}
}
function selectGraphNode(id,tier){
  if(busy||pendingTarget!==null)return;branch=id;const info=branches[id];nodes=nodes.map(n=>({...n,bonus:info.bonuses[n.level-1]}));selected=nodes[tier-1];noticeKey=null;render();
  document.querySelector('#skillsTree [data-skill-branch="'+id+'"][data-skill-level="'+tier+'"]')?.focus({preventScroll:true});
}
function renderConfirm() {
  byId('skillsConfirmTitle').removeAttribute('data-i18n');byId('skillsConfirmTitle').textContent=pick('Unlock ','解锁')+pick(branches[branch].en,branches[branch].zh)+'?';
  byId("skillsBuy").disabled=!selectionReady(selected);
  if(selected){
    byId("skillsConfirmText").textContent=t("skills.confirmText",{level:selected.level,cost:selected.cost,bonus:selected.bonus});
    byId("skillsConfirmBalance").textContent=skills?t("skills.balancePreview",{current:skills.skillPoints,cost:selected.cost,remaining:Math.max(0,skills.skillPoints-selected.cost)}):t("skills.effectUnknown");
    byId("skillsConfirmEffect").textContent=t("skills.effectPreview",{before:skills?(nodes[branchLevel(skills)-1]?.bonus||0):0,after:selected.bonus});
    if(branch!=='word-strike')byId('skillsConfirmEffect').textContent=pick(branch==='grammar-guard'?'Shield gained ':'Surge bonus ',branch==='grammar-guard'?'每次获得护盾 ':'重击伤害加成 ')+'+'+(skills?(nodes[branchLevel(skills)-1]?.bonus||0):0)+' → +'+selected.bonus+pick('. Replaces the earlier tier from next battle; tiers do not stack.','。从下一场战斗替换上一级效果，不叠加。');
    if(branch!=='word-strike')byId('skillsConfirmText').textContent=pick(branches[branch].en,branches[branch].zh)+' '+selected.level+' · '+pick('Cost ','花费 ')+selected.cost+pick(' skill points','技能点')+' · '+pick(...branches[branch].description);
  }
}
async function request(body) {
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
  try {
    const response=await fetch("/FYP/api/skills.php",{method:body?"POST":"GET",credentials:"same-origin",cache:"no-store",signal:controller.signal,
      ...(body?{headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}:{})});
    const receipt=await response.json();
    if(response.ok && validSkillsReceipt(receipt))return receipt;
    if(response.status===401||response.status===403)return {rejected:true,errorCode:"SESSION_EXPIRED"};
    if(response.status===409 && ["PREVIOUS_SKILL_REQUIRED","CHARACTER_LEVEL_REQUIRED","NOT_ENOUGH_SKILL_POINTS"].includes(receipt?.errorCode)) {
      return {rejected:true,errorCode:receipt.errorCode};
    }
    throw Error("Skills unavailable");
  } finally {clearTimeout(timeout);}
}
async function load() {
  if(busy)return;busy=true;errorKey=null;render();
  try {const receipt=await request();if(receipt.errorCode==="SESSION_EXPIRED"){skills=null;errorKey="skills.sessionExpired";return;}
    if(!validSkillsReceipt(receipt))throw Error();skills=receipt.skills;}
  catch {skills=null;errorKey="skills.loadFailed";}
  finally {busy=false;render();window.EPQLoading?.ready();}
}
async function unlock(target) {
  if(busy||(pendingTarget!==null&&target!==pendingTarget))return;pendingTarget=target;busy=true;errorKey=null;noticeKey=null;render();
  try {
    const receipt=await request({csrfToken:window.EPQ_SKILLS?.csrfToken||"",skill:branch,targetLevel:target});
    if(receipt.rejected) {
      pendingTarget=null;
      if(receipt.errorCode==="SESSION_EXPIRED"){skills=null;errorKey="skills.sessionExpired";}
      else{
        const latest=await request();
        if(!validSkillsReceipt(latest)){skills=null;errorKey=latest.errorCode==="SESSION_EXPIRED"?"skills.sessionExpired":"skills.loadFailed";}
        else{skills=latest.skills;errorKey=null;noticeKey=({PREVIOUS_SKILL_REQUIRED:"skills.previousChanged",CHARACTER_LEVEL_REQUIRED:"skills.levelChanged",NOT_ENOUGH_SKILL_POINTS:"skills.pointsChanged"})[receipt.errorCode]||"skills.requirementsChanged";}
      }
    } else {skills=receipt.skills;pendingTarget=null;noticeKey="skills.unlocked";}
  } catch {if(pendingTarget===null){skills=null;errorKey="skills.loadFailed";}else errorKey="skills.saveFailed";}
  finally {busy=false;render();if(errorKey)byId("skillsRetry").focus();else byId("skillsStatus").focus();}
}
byId("skillsStatus").tabIndex=-1;
byId('skillsInspectBuy').addEventListener('click',()=>{if(!selectionReady(selected))return;renderConfirm();byId('skillsConfirm').showModal();byId('skillsCancel').focus();});
byId("skillsCancel").addEventListener("click",()=>byId("skillsConfirm").close());
byId("skillsBuy").addEventListener("click",()=>{if(!selectionReady(selected))return;const target=selected.level;byId("skillsConfirm").close();void unlock(target);});
byId("skillsConfirm").addEventListener("close",()=>{if(busy)return;const button=byId("skillsInspectBuy");(button||byId("skillsStatus")).focus();});
byId("skillsConfirm").addEventListener("keydown",event=>{
  if(event.key!=="Tab")return;
  const controls=[...byId("skillsConfirm").querySelectorAll("button")].filter(button=>!button.disabled&&button.getClientRects().length);
  const first=controls[0],last=controls[controls.length-1];
  if(!first)return;
  if((event.shiftKey&&document.activeElement===first)||(!event.shiftKey&&document.activeElement===last)){
    event.preventDefault();(event.shiftKey?last:first).focus();
  }
});
byId("skillsRetry").addEventListener("click",()=>errorKey==="skills.sessionExpired"?window.location.reload():pendingTarget!==null?void unlock(pendingTarget):void load());
document.querySelectorAll("[data-set-language]").forEach(button=>button.addEventListener("click",()=>setLanguage(button.dataset.setLanguage)));
onLanguageChange(render);
render();void load();
