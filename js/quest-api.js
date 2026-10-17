export function createQuestClient(csrfToken, storageId, confirmed = () => {}, pending = () => {}) {
  const key=`englishPowerQuest.quest.pending.player.${storageId}`;
  const actions=["NPC","CASTLE_OPEN","TYPING_START","TYPING_ANSWER","TYPING_CLOSE"];
  let entries=[];
  try {
    const saved=JSON.parse(localStorage.getItem(key)||"[]");
    if (Array.isArray(saved)) entries=saved.filter(e=>e&&actions.includes(e.action)&&/^[a-f0-9]{32}$/.test(e.requestId));
  } catch { /* Storage may be disabled; requests still work in memory. */ }
  let chain=Promise.resolve();
  const completed=new Map();
  const persist=()=>{try {if(entries.length)localStorage.setItem(key,JSON.stringify(entries));else localStorage.removeItem(key);}catch {}};
  async function send(entry) {
    for(let attempt=0;attempt<3;attempt++) {
      const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
      try {
        const response=await fetch("/FYP/api/quests.php",{method:"POST",credentials:"same-origin",keepalive:true,
          signal:controller.signal,headers:{"Content-Type":"application/json"},body:JSON.stringify({...entry,csrfToken})});
        const data=await response.json();
        const valid=data?.ok&&data.player&&["level","xp","coins","englishPowerTotal"].every(k=>Number.isFinite(data.player[k])&&data.player[k]>=0)
          &&Number.isInteger(data.chapterStep)&&data.chapterStep>=0&&data.chapterStep<=5&&data.outcome&&typeof data.outcome==="object";
        if(response.ok&&valid) return data;
        if(response.ok)throw new Error("Incomplete quest receipt");
        if(response.status<500||data?.errorCode==="MIGRATION_REQUIRED") return {...data,ok:false,status:response.status};
      }catch { /* A response may be lost after commit: replay the original request. */ }
      finally {clearTimeout(timeout);}
      pending(true);
      if(attempt<2)await new Promise(resolve=>setTimeout(resolve,500));
    }
    return {ok:false,status:503,error:"任务尚未确认，请检查连接后重试。"};
  }
  async function drain(target) {
    if(target&&completed.has(target.requestId))return completed.get(target.requestId);
    let result={ok:true};
    const batch=entries.slice();
    for(const entry of batch) {
      result=await send(entry);
      if(!result.ok&&result.status>=500) {pending(true);return result;}
      entries.shift();persist();
      completed.set(entry.requestId,result);
      if(result.ok)confirmed(result);
      if(entry===target) {pending(entries.length>0);return result;}
    }
    pending(false);return result;
  }
  const enqueue=task=>{const result=chain.catch(()=>{}).then(task);chain=result;return result;};
  return {
    recover:()=>enqueue(()=>drain()),
    request:(action,inputs={})=>{
      if(!actions.includes(action))return Promise.resolve({ok:false,status:400});
      let entry=entries.find(e=>e.action===action&&Object.keys(inputs).every(k=>e[k]===inputs[k]));
      if(!entry){entry={...inputs,action,requestId:crypto.randomUUID().replaceAll("-","")};entries.push(entry);persist();}
      return enqueue(()=>drain(entry));
    }
  };
}
