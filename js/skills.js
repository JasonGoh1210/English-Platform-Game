import { t, getLanguage, setLanguage, onLanguageChange } from "./i18n.js?v=20261017-castleroad2";

const nodes = [{level:1,cost:1,requiredLevel:2,bonus:4},{level:2,cost:2,requiredLevel:3,bonus:8},{level:3,cost:3,requiredLevel:5,bonus:12}];
const byId = id=>document.getElementById(id);
const element = (tag,cls,text)=>{const el=document.createElement(tag);el.className=cls;if(text!==undefined)el.textContent=text;return el;};
export function validSkillsReceipt(receipt) {
  const s=receipt?.skills;
  return receipt?.ok===true && s && Number.isSafeInteger(s.characterLevel) && s.characterLevel>=1
    && Number.isSafeInteger(s.skillPoints) && s.skillPoints>=0
    && Number.isSafeInteger(s.wordStrikeLevel) && s.wordStrikeLevel>=0 && s.wordStrikeLevel<=3;
}
let skills=null,busy=false,errorKey=null,noticeKey=null,selected=null,pendingTarget=null;

export function skillNodeState(snapshot,node) {
  if(!snapshot)return {known:false,owned:false,ready:false,previousMet:false,levelMet:false,pointsMet:false,levelGap:null,pointsGap:null};
  const owned=snapshot.wordStrikeLevel>=node.level;
  const previousMet=snapshot.wordStrikeLevel>=node.level-1;
  const levelGap=Math.max(0,node.requiredLevel-snapshot.characterLevel),pointsGap=Math.max(0,node.cost-snapshot.skillPoints);
  return {known:true,owned,ready:!owned&&previousMet&&levelGap===0&&pointsGap===0,
    previousMet,levelMet:levelGap===0,pointsMet:pointsGap===0,levelGap,pointsGap};
}
function selectionReady(node) {
  return !!node&&!busy&&pendingTarget===null&&!errorKey&&skillNodeState(skills,node).ready;
}
function nodeExplanation(node,state) {
  if(!state.known)return t(errorKey||"review.loading");
  if(state.owned)return t(skills.wordStrikeLevel===node.level?"skills.currentTier":"skills.replacedTier",{level:skills.wordStrikeLevel});
  const conditions=element("ul","skill-conditions");
  const rows=[
    {met:state.previousMet,text:t(node.level===1?"skills.noPrevious":"skills.previousDetail",{level:node.level-1})},
    {met:state.levelMet,text:t("skills.levelDetail",{current:skills.characterLevel,required:node.requiredLevel})+(state.levelGap?t("skills.levelGap",{gap:state.levelGap}):"")},
    {met:state.pointsMet,text:t("skills.pointsDetail",{current:skills.skillPoints,cost:node.cost})+(state.pointsGap?t("skills.pointsGap",{gap:state.pointsGap}):"")}
  ];
  for(const row of rows){const item=element("li",row.met?"met":"missing",(row.met?"✓ ":"○ ")+row.text);conditions.append(item);}
  return conditions;
}
function skillSymbol(level) {
  const frame=element("span","skill-symbol");frame.setAttribute("aria-hidden","true");
  const namespace="http://www.w3.org/2000/svg",svg=document.createElementNS(namespace,"svg");
  svg.setAttribute("viewBox","0 0 32 32");svg.setAttribute("shape-rendering","crispEdges");
  const shapes=[
    [3,9,26,20,"#060e18"],[4,7,11,20,"var(--book-cover)"],[17,7,11,20,"var(--book-cover)"],
    [6,6,8,18,"#ecd9ab"],[18,6,8,18,"#f6e8c5"],[14,8,4,20,"#796448"],
    [6,24,8,2,"#bba377"],[18,24,8,2,"#cdb78a"],[8,10,4,2,"#8f805f"],[8,14,4,2,"#8f805f"],
    [20,10,4,2,"var(--book-rune)"],[20,14,2,6,"var(--book-rune)"],[22,18,2,2,"var(--book-rune)"]
  ];
  if(level>=2)shapes.push([25,1,2,6,"var(--book-rune)"],[23,3,6,2,"var(--book-rune)"]);
  if(level===3)shapes.push([2,2,2,4,"#eed293"],[1,3,4,2,"#eed293"],[29,19,2,2,"#eed293"]);
  for(const [x,y,width,height,fill] of shapes){const rectangle=document.createElementNS(namespace,"rect");for(const [key,value] of Object.entries({x,y,width,height,fill}))rectangle.setAttribute(key,String(value));svg.append(rectangle);}
  frame.append(svg);return frame;
}
function render() {
  byId("skillsCharacterLevel").textContent=skills?.characterLevel??"—";
  byId("skillsPoints").textContent=skills?.skillPoints??"—";
  byId("skillsUnlockedCount").textContent=(skills?.wordStrikeLevel??"—")+" / "+nodes.length;
  document.querySelectorAll(".skills-progress-pips i").forEach((pip,index)=>pip.classList.toggle("filled",!!skills&&index<skills.wordStrikeLevel));
  const focused=document.activeElement?.dataset.skillLevel;
  const tree=byId("skillsTree");tree.setAttribute("aria-busy",String(busy));tree.replaceChildren();
  for(const node of nodes) {
    const state=skillNodeState(skills,node),{owned,ready}=state;
    const item=element("li","skill-node"+(owned?" owned":ready?" available":"")+(owned&&skills.wordStrikeLevel===node.level?" current":""));
    item.dataset.skillNode=String(node.level);
    const badgeKey=!state.known?(errorKey?"skills.unavailableBadge":"review.loading")
      :owned?(skills.wordStrikeLevel===node.level?"skills.activeBadge":"skills.owned")
      :pendingTarget!==null?(node.level===pendingTarget?"skills.pendingBadge":"skills.waitingBadge")
      :ready?"skills.availableBadge":"skills.lockedBadge";
    const heading=element("div","skill-node-heading"),rank=element("span","skill-rank",String(node.level).padStart(2,"0"));rank.setAttribute("aria-hidden","true");
    heading.append(rank,element("span","skill-state",t(badgeKey)));item.append(heading);
    const overview=element("div","skill-overview"),copy=element("div","skill-overview-copy");
    copy.append(element("h3","",t("skills.node",{level:node.level})),element("p","skill-effect",t("skills.bonus",{bonus:node.bonus})),
      element("p","skill-condition skill-cost",t("skills.requirement",{level:node.requiredLevel,cost:node.cost})));
    overview.append(skillSymbol(node.level),copy);item.append(overview);
    const explanation=nodeExplanation(node,state);
    const detail=typeof explanation==="string"?element("p","skill-condition",explanation):explanation;
    detail.id="skillConditions"+node.level;item.append(detail);
    const button=element("button","",t(owned?"skills.owned":!skills?errorKey?"skills.unavailableBadge":"review.loading":pendingTarget!==null?"skills.pendingBadge":skills.wordStrikeLevel!==node.level-1?"skills.previous"
      :skills.characterLevel<node.requiredLevel?"skills.levelRequired":skills.skillPoints<node.cost?"skills.pointsRequired":"skills.unlock"));
    button.type="button";button.dataset.skillLevel=String(node.level);button.disabled=!selectionReady(node);
    button.setAttribute("aria-describedby",detail.id);
    button.addEventListener("click",()=>{if(!selectionReady(node))return;selected=node;renderConfirm();const dialog=byId("skillsConfirm");dialog.showModal();byId("skillsCancel").focus({preventScroll:true});dialog.scrollTop=0;});
    item.append(button);tree.append(item);
  }
  if(focused)tree.querySelector('[data-skill-level="'+focused+'"]:not(:disabled)')?.focus({preventScroll:true});
  const activeBonus=skills?(nodes[skills.wordStrikeLevel-1]?.bonus||0):0;
  byId("skillsCurrentEffect").textContent=skills?t("skills.currentEffect",{bonus:activeBonus}):t("skills.effectUnknown");
  byId("skillsStatus").textContent=pendingTarget!==null?t(busy?"skills.confirmingTarget":"skills.pendingTarget",{level:pendingTarget})
    :t(busy?"skills.saving":errorKey||noticeKey||(skills?.wordStrikeLevel===3?"skills.maxed":"skills.ready"));
  if(!busy&&!errorKey&&pendingTarget===null&&skills?.wordStrikeLevel===3&&noticeKey==="skills.unlocked")byId("skillsStatus").textContent+=" "+t("skills.maxed");
  byId("skillsRetry").classList.toggle("hidden",!errorKey||busy);
  byId("skillsRetry").textContent=t(errorKey==="skills.sessionExpired"?"skills.refreshPage":pendingTarget!==null?"skills.retryTarget":"skills.refreshData");
  document.querySelectorAll("[data-set-language]").forEach(button=>button.classList.toggle("active",button.dataset.setLanguage===getLanguage()));
  renderConfirm();
}
function renderConfirm() {
  byId("skillsBuy").disabled=!selectionReady(selected);
  if(selected){
    byId("skillsConfirmText").textContent=t("skills.confirmText",{level:selected.level,cost:selected.cost,bonus:selected.bonus});
    byId("skillsConfirmBalance").textContent=skills?t("skills.balancePreview",{current:skills.skillPoints,cost:selected.cost,remaining:Math.max(0,skills.skillPoints-selected.cost)}):t("skills.effectUnknown");
    byId("skillsConfirmEffect").textContent=t("skills.effectPreview",{before:skills?(nodes[skills.wordStrikeLevel-1]?.bonus||0):0,after:selected.bonus});
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
    const receipt=await request({csrfToken:window.EPQ_SKILLS?.csrfToken||"",skill:"word-strike",targetLevel:target});
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
byId("skillsCancel").addEventListener("click",()=>byId("skillsConfirm").close());
byId("skillsBuy").addEventListener("click",()=>{if(!selectionReady(selected))return;const target=selected.level;byId("skillsConfirm").close();void unlock(target);});
byId("skillsConfirm").addEventListener("close",()=>{if(busy)return;const button=byId("skillsTree").querySelector('[data-skill-level="'+selected?.level+'"]:not(:disabled)');(button||byId("skillsStatus")).focus();});
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
