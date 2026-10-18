import { t, getLanguage, setLanguage, onLanguageChange } from "./i18n.js?v=20261018-newbie1";
import { formatReviewAnswer } from "./battle-review.js?v=20261018-newbie1";

const types = { TRUE_FALSE:"battle.trueFalse", ODD_WORD_OUT:"battle.oddOneOut", SENTENCE_BUILDER:"battle.sentenceBuilder" };
export function validLearningReceipt(data) {
  const s = data?.stats;
  return data?.ok === true && s && ["total","correct","wrong","timedOut","questionsSeen"].every(k=>Number.isSafeInteger(s[k]) && s[k]>=0)
    && s.total===s.correct+s.wrong+s.timedOut && s.questionsSeen<=s.total
    && (s.total ? Number.isFinite(s.accuracy) && s.accuracy>=0 && s.accuracy<=100 : s.accuracy===null)
    && (data.nextCursor===null || Number.isSafeInteger(data.nextCursor) && data.nextCursor>0)
    && Array.isArray(data.mistakes) && data.mistakes.length<=10
    && new Set(data.mistakes.map(item=>item.attemptId)).size===data.mistakes.length
    && data.mistakes.every(item=>Number.isSafeInteger(item.attemptId) && item.attemptId>0 && types[item.question?.type]
      && typeof item.question.question==="string" && typeof item.timedOut==="boolean"
      && typeof item.explanation==="string" && typeof item.explanationZh==="string"
      && (item.question.type==="TRUE_FALSE" ? typeof item.correctAnswer==="boolean"
        : Array.isArray(item.question.words) && item.question.words.every(w=>typeof w==="string")
          && (item.question.type==="ODD_WORD_OUT" ? typeof item.correctAnswer==="string"
            : Array.isArray(item.correctAnswer) && item.correctAnswer.every(w=>typeof w==="string"))));
}

export function validPracticeReceipt(data, item) {
  const p=data?.practice;
  return data?.ok===true && typeof p?.correct==="boolean" && p.question?.type===item.question.type
    && p.question.question===item.question.question && JSON.stringify(p.correctAnswer)===JSON.stringify(item.correctAnswer)
    && typeof p.explanation==="string" && typeof p.explanationZh==="string";
}

const byId = id=>document.getElementById(id);
const node = (tag, cls, text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
const button = (label, callback)=>{const el=node("button","learning-button",t(label));el.type="button";el.addEventListener("click",callback);return el;};
let data=null, loading=false, failed=false, practice=null, sequence=0;
const answerLine = (label, answer, cls)=>{const el=node("p",cls);el.append(node("strong","",t(label)+" "),node("span","",formatReviewAnswer(answer,t)));return el;};

function render() {
  const stats=byId("learningStats");stats.replaceChildren();
  for(const [key,label] of [["questionsSeen","learning.seen"],["total","learning.total"],["accuracy","learning.accuracy"],["mistakes","learning.mistakes"]]) {
    const value=!data ? "—" : key==="mistakes" ? String(data.stats.wrong+data.stats.timedOut)
      : key==="accuracy" ? (data.stats.accuracy===null?"—":data.stats.accuracy+"%") : String(data.stats[key]);
    const item=node("div","learning-stat");item.append(node("span","",t(label)),node("b","",value));stats.append(item);
  }
  byId("learningStatus").textContent=loading?t("review.loading"):failed?t("learning.failed"):"";
  byId("learningRetry").classList.toggle("hidden",!failed||loading);
  byId("learningMore").classList.toggle("hidden",!data?.nextCursor||failed||loading);
  const list=byId("learningMistakes"),open=new Set([...list.querySelectorAll("details[open]")].map(d=>d.dataset.attemptId));
  const focused=document.activeElement?.closest("[data-attempt-id]")?.dataset.attemptId;
  list.replaceChildren();
  if(data && !data.mistakes.length) list.append(node("p","",t("learning.empty")));
  for(const [index,item] of (data?.mistakes||[]).entries()) {
    const detail=node("details","learning-mistake");detail.dataset.attemptId=String(item.attemptId);detail.open=open.has(detail.dataset.attemptId);
    const summary=node("summary","",t("review.entry",{number:index+1,type:t(types[item.question.type])})+" · "+t(item.timedOut?"review.timeout":"review.wrong"));
    const preview=item.question.type==="ODD_WORD_OUT"?item.question.words.join(" · ")
      :getLanguage()==="zh"?(item.question.promptZh||item.question.questionZh||item.question.question):(item.question.prompt||item.question.question);
    summary.append(node("span","learning-summary-question",preview));detail.append(summary);
    const body=node("div","learning-mistake-body");body.append(node("h3","",item.question.question));
    if(getLanguage()==="zh" && item.question.questionZh) body.append(node("p","learning-translation",item.question.questionZh));
    body.append(answerLine("review.yourAnswer",item.submittedAnswer,"learning-answer"),answerLine("review.correctAnswer",item.correctAnswer,"learning-answer correct"));
    if(item.explanation)body.append(node("p","",item.explanation));
    if(getLanguage()==="zh" && item.explanationZh)body.append(node("p","learning-translation",item.explanationZh));
    const retry=button("learning.practice",()=>openPractice(item));retry.dataset.practiceId=String(item.attemptId);body.append(retry);detail.append(body);list.append(detail);
  }
  if(focused) [...list.querySelectorAll("details")].find(d=>d.dataset.attemptId===focused)?.querySelector("summary")?.focus({preventScroll:true});
  renderPractice();
}

async function load() {
  if(loading)return;loading=true;failed=false;render();
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
  try {
    const response=await fetch("/FYP/api/learning.php?before="+(data?.nextCursor||0),{cache:"no-store",credentials:"same-origin",signal:controller.signal});
    const receipt=await response.json();if(!response.ok||!validLearningReceipt(receipt))throw Error("Learning unavailable");
    if(data) receipt.mistakes=[...data.mistakes,...receipt.mistakes.filter(item=>!data.mistakes.some(old=>old.attemptId===item.attemptId))];
    data=receipt;
  } catch { failed=true; }
  finally { clearTimeout(timeout);loading=false;render();window.EPQLoading?.ready(); }
}

function openPractice(item) {
  practice={item,selected:[],pending:false,result:null,answer:null,error:false,id:++sequence};renderPractice();
  byId("learningPractice").scrollIntoView({behavior:"auto",block:"start"});byId("learningPracticeTitle").focus({preventScroll:true});
}

function renderPractice() {
  const root=byId("learningPractice"),active=root.contains(document.activeElement)?document.activeElement:null;
  const focus=active?{id:active.id,word:active.dataset.wordIndex,slot:active.dataset.selectedSlot}:null;
  root.classList.toggle("hidden",!practice);root.replaceChildren();if(!practice)return;
  root.setAttribute("aria-busy",String(practice.pending));
  const current=practice,q=current.item.question;
  const header=node("div","learning-practice-head"),heading=node("h2","",t("learning.practiceTitle"));heading.id="learningPracticeTitle";heading.tabIndex=-1;
  header.append(heading,button("learning.closePractice",()=>{const id=current.item.attemptId;practice=null;sequence++;renderPractice();document.querySelector('[data-practice-id="'+id+'"]')?.focus();}));
  root.append(header,node("p","learning-note",t("learning.practiceNote")),node("h3","",q.question));
  if(getLanguage()==="zh" && q.questionZh)root.append(node("p","learning-translation",q.questionZh));
  if(q.prompt || getLanguage()==="zh" && q.promptZh)root.append(node("p","",getLanguage()==="zh"?(q.promptZh||q.prompt):q.prompt));
  const choices=node("div","learning-practice-choices");
  if(q.type==="SENTENCE_BUILDER") {
    const selected=node("div","learning-selected"),bank=node("div","learning-word-bank");
    current.selected.forEach((index,slot)=>{const chip=node("button","",q.words[index]);chip.type="button";chip.dataset.selectedSlot=String(slot);chip.disabled=current.pending||Boolean(current.result);
      chip.addEventListener("click",()=>{current.selected.splice(slot,1);renderPractice();});selected.append(chip);});
    q.words.forEach((word,index)=>{const chip=node("button","",word);chip.type="button";chip.dataset.wordIndex=String(index);
      chip.disabled=current.pending||Boolean(current.result)||current.selected.includes(index);chip.addEventListener("click",()=>{current.selected.push(index);renderPractice();});bank.append(chip);});
    const actions=node("div","learning-practice-actions"),submit=button("learning.check",()=>void submitPractice(current.selected.map(i=>q.words[i])));
    submit.id="learningSubmit";submit.disabled=current.pending||Boolean(current.result)||current.selected.length!==q.words.length;
    const clear=button("learning.clear",()=>{current.selected=[];renderPractice();});clear.disabled=current.pending||Boolean(current.result);actions.append(submit,clear);root.append(selected,bank,actions);
  } else {
    const values=q.type==="TRUE_FALSE"?[true,false]:q.words;
    values.forEach(value=>{const choice=node("button","",formatReviewAnswer(value,t));choice.type="button";choice.dataset.practiceAnswer=String(value);
      choice.disabled=current.pending||Boolean(current.result);choice.addEventListener("click",()=>void submitPractice(value));choices.append(choice);});root.append(choices);
  }
  const feedback=node("p","learning-practice-feedback",current.pending?t("learning.checking"):current.error?t("learning.practiceFailed"):"");feedback.setAttribute("role","status");root.append(feedback);
  if(current.result) {
    const result=node("div","learning-practice-result"+(current.result.correct?"":" wrong"));result.setAttribute("role","status");
    result.append(node("strong","",t(current.result.correct?"learning.correct":"learning.tryAgain")),answerLine("review.yourAnswer",current.answer,""),answerLine("review.correctAnswer",current.result.correctAnswer,""));
    if(current.result.explanation)result.append(node("p","",current.result.explanation));
    if(getLanguage()==="zh" && current.result.explanationZh)result.append(node("p","",current.result.explanationZh));
    result.append(button("learning.again",()=>openPractice(current.item)));root.append(result);
  }
  if(focus) {
    let target=focus.id?byId(focus.id):focus.word!==undefined?root.querySelector('[data-word-index="'+focus.word+'"]')
      :focus.slot!==undefined?root.querySelector('[data-selected-slot="'+focus.slot+'"]'):null;
    if(!target||target.disabled)target=root.querySelector('.learning-word-bank button:not(:disabled), #learningSubmit:not(:disabled), .learning-practice-result button')||heading;
    target.focus({preventScroll:true});
  }
}

async function submitPractice(answer) {
  if(!practice||practice.pending||practice.result)return;
  const current=practice;current.pending=true;current.error=false;current.answer=answer;renderPractice();
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
  try {
    const response=await fetch("/FYP/api/learning.php",{method:"POST",credentials:"same-origin",signal:controller.signal,
      headers:{"Content-Type":"application/json"},body:JSON.stringify({csrfToken:window.EPQ_LEARNING.csrfToken,attemptId:current.item.attemptId,answer})});
    const receipt=await response.json();if(!response.ok||!validPracticeReceipt(receipt,current.item))throw Error("Practice unavailable");
    current.result=receipt.practice;
  } catch { current.error=true; }
  finally { clearTimeout(timeout);current.pending=false;if(practice?.id===current.id)renderPractice(); }
}

byId("learningRetry").addEventListener("click",()=>void load());
byId("learningMore").addEventListener("click",()=>void load());
document.querySelectorAll("[data-set-language]").forEach(b=>b.addEventListener("click",()=>setLanguage(b.dataset.setLanguage)));
onLanguageChange(render);
void load();
