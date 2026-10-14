import { t, getLanguage, setLanguage, onLanguageChange } from "./i18n.js?v=20261014-skills1";

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

function render() {
  byId("skillsCharacterLevel").textContent=skills?.characterLevel??"—";
  byId("skillsPoints").textContent=skills?.skillPoints??"—";
  const focused=document.activeElement?.dataset.skillLevel;
  const tree=byId("skillsTree");tree.replaceChildren();
  for(const node of nodes) {
    const owned=skills && skills.wordStrikeLevel>=node.level;
    const ready=skills && skills.wordStrikeLevel===node.level-1 && skills.characterLevel>=node.requiredLevel && skills.skillPoints>=node.cost;
    const item=element("li","skill-node"+(owned?" owned":ready?" available":""));
    item.append(element("h3","",t("skills.node",{level:node.level})),element("p","skill-effect",t("skills.bonus",{bonus:node.bonus})),
      element("p","skill-condition",t("skills.requirement",{level:node.requiredLevel,cost:node.cost})));
    const button=element("button","",t(owned?"skills.owned":!skills?"review.loading":skills.wordStrikeLevel!==node.level-1?"skills.previous"
      :skills.characterLevel<node.requiredLevel?"skills.levelRequired":skills.skillPoints<node.cost?"skills.pointsRequired":"skills.unlock"));
    button.type="button";button.dataset.skillLevel=String(node.level);button.disabled=!ready||busy||pendingTarget!==null;
    button.addEventListener("click",()=>{selected=node;renderConfirm();byId("skillsConfirm").showModal();byId("skillsCancel").focus();});
    item.append(button);tree.append(item);
  }
  if(focused)tree.querySelector('[data-skill-level="'+focused+'"]:not(:disabled)')?.focus({preventScroll:true});
  byId("skillsStatus").textContent=t(busy?"skills.saving":errorKey||noticeKey||"skills.ready");
  byId("skillsRetry").classList.toggle("hidden",!errorKey||busy);
  document.querySelectorAll("[data-set-language]").forEach(button=>button.classList.toggle("active",button.dataset.setLanguage===getLanguage()));
  renderConfirm();
}
function renderConfirm() {
  if(selected)byId("skillsConfirmText").textContent=t("skills.confirmText",{level:selected.level,cost:selected.cost,bonus:selected.bonus});
}
async function request(body) {
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
  try {
    const response=await fetch("/FYP/api/skills.php",{method:body?"POST":"GET",credentials:"same-origin",cache:"no-store",signal:controller.signal,
      ...(body?{headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}:{})});
    const receipt=await response.json();
    if(response.ok && validSkillsReceipt(receipt))return receipt;
    if(response.status===409 && ["PREVIOUS_SKILL_REQUIRED","CHARACTER_LEVEL_REQUIRED","NOT_ENOUGH_SKILL_POINTS"].includes(receipt?.errorCode)) {
      return {rejected:true,errorCode:receipt.errorCode};
    }
    throw Error("Skills unavailable");
  } finally {clearTimeout(timeout);}
}
async function load() {
  if(busy)return;busy=true;errorKey=null;render();
  try {const receipt=await request();if(!validSkillsReceipt(receipt))throw Error();skills=receipt.skills;}
  catch {errorKey="skills.loadFailed";}
  finally {busy=false;render();}
}
async function unlock(target) {
  if(busy)return;pendingTarget=target;busy=true;errorKey=null;noticeKey=null;render();
  try {
    const receipt=await request({csrfToken:window.EPQ_SKILLS?.csrfToken||"",skill:"word-strike",targetLevel:target});
    if(receipt.rejected) {
      pendingTarget=null;errorKey="skills.requirementsChanged";
      const latest=await request();if(validSkillsReceipt(latest))skills=latest.skills;
    } else {skills=receipt.skills;pendingTarget=null;noticeKey="skills.unlocked";}
  } catch {errorKey="skills.saveFailed";}
  finally {busy=false;render();if(errorKey)byId("skillsRetry").focus();else byId("skillsStatus").focus();}
}
byId("skillsStatus").tabIndex=-1;
byId("skillsCancel").addEventListener("click",()=>byId("skillsConfirm").close());
byId("skillsBuy").addEventListener("click",()=>{const target=selected?.level;byId("skillsConfirm").close();if(target)void unlock(target);});
byId("skillsRetry").addEventListener("click",()=>pendingTarget!==null?void unlock(pendingTarget):void load());
document.querySelectorAll("[data-set-language]").forEach(button=>button.addEventListener("click",()=>setLanguage(button.dataset.setLanguage)));
onLanguageChange(render);
render();void load();
