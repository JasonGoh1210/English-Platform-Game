import {getLanguage,onLanguageChange} from './i18n.js?v=20261018-newbie1';
const pick=(en,zh)=>getLanguage()==='zh'?zh:en;
const names={maple:['Maple Town','枫叶镇'],forest:['Whispering Forest','低语森林'],camp:['Old Camp Road','旧营地道路'],ruins:['Ancient Ruins','古代遗迹']};
const skillNames={VOCABULARY:['Vocabulary','词汇'],GRAMMAR:['Grammar','语法'],SENTENCE_CONSTRUCTION:['Sentences','句子'],IT_ENGLISH:['Technical English','科技英语']};
const make=(tag,cls,text)=>{const el=document.createElement(tag);el.className=cls;if(text!==undefined)el.textContent=text;return el;};
export function createAdventure({getContext,request,onChanged,onPet=()=>{}}){
  let data=null,failed=false,pending=false,activity=null,feedback=null,selected=[],tab='codex',notice='',lastMini=-1;
  const dialog=make('dialog','adventure-dialog');dialog.id='adventureDialog';dialog.setAttribute('aria-labelledby','adventureTitle');
  const hud=make('div','adventure-hud hidden'),journal=make('button','adventure-journal-trigger'),map=make('details','adventure-minimap'),summary=make('summary',''),mini=make('canvas','');
  journal.id='adventureJournal';journal.type='button';mini.width=300;mini.height=94;mini.setAttribute('role','img');mini.setAttribute('aria-label','区域地图 / Area map');map.append(summary,mini);hud.append(journal,map);document.body.append(hud,dialog);
  journal.addEventListener('click',()=>open());
  function button(text,action,key){const b=make('button','',text);b.type='button';b.disabled=pending;if(key)b.dataset.focusKey=key;b.addEventListener('click',action);return b;}
  function labels(){journal.textContent=pick('Adventure book','冒险手册');summary.textContent=pick('▦ Area map','▦ 区域地图');dialog.setAttribute('lang',getLanguage()==='zh'?'zh-CN':'en');}
  async function refresh(){try{const c=new AbortController(),timer=setTimeout(()=>c.abort(),10000);let receipt;try{const r=await fetch('/FYP/api/adventure.php',{cache:'no-store',credentials:'same-origin',signal:c.signal});receipt=await r.json();if(!r.ok)throw Error();}finally{clearTimeout(timer);}if(!receipt.ok||!receipt.adventure?.book||!receipt.adventure.memory)throw Error();data=receipt.adventure;failed=false;}catch{failed=true;}if(dialog.open)render();}
  function open(nextTab){if(nextTab)tab=nextTab;activity=null;feedback=null;notice='';if(!dialog.open)dialog.showModal();render();dialog.scrollTop=0;dialog.querySelector('.handbook-tabs button.active,button')?.focus();if(!data)void refresh();}
  function render(){
    labels();const focus=document.activeElement?.dataset.focusKey;dialog.replaceChildren();
    const head=make('header','adventure-dialog-head'),heading=make('h2','',pick('Adventure book','冒险手册'));heading.id='adventureTitle';head.append(heading,button(pick('Close ×','关闭 ×'),()=>dialog.close(),'close'));dialog.append(head);
    const tabs=make('nav','handbook-tabs');tabs.setAttribute('aria-label',pick('Book sections','手册栏目'));
    for(const [key,en,zh] of [['codex','Creatures','怪物图鉴'],['worlds','Worlds','世界进度'],['learning','Growth','学习成长'],['companions','Companions','随从']]){
      const b=button(pick(en,zh),()=>{tab=key;activity=null;feedback=null;notice='';render();dialog.scrollTop=0;dialog.querySelector('[data-focus-key="tab-'+key+'"]')?.focus();},'tab-'+key);b.classList.toggle('active',tab===key);b.setAttribute('aria-pressed',String(tab===key));tabs.append(b);
    }dialog.append(tabs);
    if(failed){dialog.append(make('p','',pick('Records unavailable. Your progress is preserved.','暂时无法读取记录，原有进度会保留。')),button(pick('Retry','重试'),()=>void refresh(),'retry'));return;}
    if(!data){dialog.append(make('p','',pick('Reading your records…','正在读取冒险记录……')));return;}
    if(activity){renderActivity();}else{
      if(feedback){const box=make('section','adventure-feedback');box.setAttribute('role','status');const answer=typeof feedback.answer==='boolean'?pick(feedback.answer?'TRUE':'FALSE',feedback.answer?'正确':'错误'):Array.isArray(feedback.answer)?feedback.answer.join(' '):String(feedback.answer);
        box.append(make('h3','',feedback.correct?pick('A memory grows stronger','记忆又牢固了一点'):pick('Read the explanation, then rest','理解解析，稍后再试')),make('p','',pick('Answer: ','答案：')+answer),make('p','',pick(feedback.explanation,feedback.explanationZh)));
        box.append(make('p','',pick('Rune ','符文 ')+feedback.masteryStage+'/3 · '+pick('Next review: ','下次复习：')+new Date(feedback.nextDue*1000).toLocaleString(getLanguage()==='zh'?'zh-CN':'en-GB')));
        if(feedback.rewardClaimed)box.append(make('p','handbook-reward',pick('Rune mastered! +10 XP · +8 Coins.','符文已掌握！+10经验 · +8金币。')));dialog.append(box);
      }
      if(tab==='codex')renderCodex();else if(tab==='worlds')renderWorlds();else if(tab==='learning')renderLearning();else renderCompanions();
    }
    if(notice){const p=make('p','adventure-notice',notice);p.setAttribute('role','status');dialog.append(p);}
    if(focus&&!pending){const previous=dialog.querySelector('[data-focus-key="'+focus+'"]');if(previous&&!previous.disabled)previous.focus({preventScroll:true});}
  }
  function renderCodex(){
    const all=data.book.monsters,seen=all.filter(m=>m.seen).length,won=all.filter(m=>m.defeated).length;
    dialog.append(make('p','handbook-summary',pick('Discovered ','已发现 ')+seen+'/'+all.length+' · '+pick('Defeated ','已击败 ')+won+'/'+all.length));
    const grid=make('div','handbook-codex');
    for(const m of all){const card=make('article','codex-card'+(m.seen?'':' unknown'));card.dataset.monsterId=m.id;
      const img=make('img','');img.src=m.sprite;img.alt=m.seen?pick(m.name,m.nameZh):pick('Undiscovered creature silhouette','未发现怪物的剪影');img.width=img.height=96;img.loading='lazy';
      const title=make('h3','',m.seen?pick(m.name,m.nameZh):'???');card.append(img,title,make('p','',pick(...names[m.realm])+' · '+pick(m.defeated?'Defeated':m.seen?'Encountered':'Undiscovered',m.defeated?'已击败':m.seen?'已遭遇':'未发现')));
      if(m.seen){card.append(make('p','',m.id==='wordless-king'?pick('Three seals','三道封印'):'HP '+m.hp));const detail=make('details','');detail.append(make('summary','',pick('Creature notes','怪物笔记')));detail.append(make('p','',pick(m.tip,m.tipZh)));if(m.defeated)detail.append(make('p','handbook-word',m.word[0]+' · '+m.word[1]),make('p','',pick('Victories: ','击败次数：')+m.wins));else detail.append(make('p','',pick('Win to unlock its word card.','击败后解锁词语卡片。')));card.append(detail);}grid.append(card);
    }dialog.append(grid);
  }
  function renderWorlds(){
    dialog.append(make('p','handbook-summary',pick('Progress comes from saved victories, story and answers. Reviews are optional.','进度来自已保存的胜利、主线和答题；记忆复习为可选内容。')));
    for(const [id,w] of Object.entries(data.book.worlds)){const card=make('section','handbook-world'),head=make('div','handbook-world-heading');head.append(make('h3','',pick(...names[id])),make('b','',w.percent+'%'));card.append(head);const meter=make('progress','');meter.max=100;meter.value=w.percent;meter.setAttribute('aria-label',pick(...names[id]));card.append(meter);
      const details=make('details','');details.append(make('summary','',pick('Objectives ','目标 ')+w.done+'/'+w.total));const list=make('ul','');for(const g of w.goals)list.append(make('li',g.done?'met':'',(g.done?'✓ ':'◇ ')+pick(g.en,g.zh)));details.append(list);card.append(details);
      const claim=button(w.claimed?pick('World seal collected','世界徽记已领取'):pick('Collect seal ·20 XP +15 Coins','领取徽记 ·20经验 +15金币'),()=>void act('WORLD_COMPLETE',{realmId:id}),'world-'+id);claim.disabled||=w.claimed||w.percent<100;card.append(claim);dialog.append(card);
    }
    if(data.book.festival)dialog.append(make('p','handbook-reward',pick('The village festival is open. Return to Maple Town to see the lights and speak to the villagers.','枫叶镇庆典已开启，回村看看灯火，也和村民聊聊吧。')));
  }
  function metric(en,zh,stat){const box=make('div','handbook-stat');box.append(make('span','',pick(en,zh)),make('strong','',stat.rate===null?'—':stat.rate+'%'),make('small','',stat.correct+'/'+stat.total+' '+pick('correct','答对')));return box;}
  function renderLearning(){
    const r=data.book.report,stats=make('div','handbook-stats');stats.append(metric('First attempts','首次作答',r.first),metric('Battle repeats','战斗重答',r.repeatedBattle),metric('Memory reviews','记忆复习',r.memory));dialog.append(stats,make('p','learning-note',pick('Outdoor and cave battle questions count once in first attempts. Repeats, memory reviews and castle seals stay separate.','野外与洞穴战斗题按每题第一次提交统计；重答、记忆复习与城堡封印分开记录。')));
    const growth=make('section','handbook-world');growth.append(make('h3','',pick('Your learning trend','学习趋势')));
    if(r.comparisonReady){const compare=make('div','handbook-stats handbook-comparison');compare.append(metric('First 10 new questions','最初10道新题',r.early),metric('Latest 10 new questions','最近10道新题',r.recent));growth.append(compare,make('p','',pick('Two different groups of first attempts; this is a snapshot, not proof of lasting mastery.','比较两组不同新题的首次作答，用来观察趋势；长期掌握还需要持续复习。')));}else growth.append(make('p','',pick('Answer 20 different battle questions to compare two separate groups of 10.','完成20道不同战斗题后，比较前后两组各10道新题的表现。')));dialog.append(growth);
    const castle=make('section','handbook-world');castle.append(make('h3','',pick('Castle seals','城堡封印')),make('p','',r.castle.correct+'/'+r.castle.total+' '+pick('answers correct','作答正确')+' · '+pick('Complete victories: ','完整通关：')+r.castle.wins),make('p','learning-note',pick('Meaning, sentence and spelling attempts are recorded together here, separately from first-attempt battle accuracy.','词义、排句和拼写挑战单独记录在这里，不混入战斗首次正确率。')));dialog.append(castle);
    const skills=make('section','handbook-world');skills.append(make('h3','',pick('First attempts by topic','各类知识的首次作答')));
    for(const [id,label] of Object.entries(skillNames)){const s=r.skills[id]||{total:0,correct:0,rate:null},row=make('div','handbook-topic');row.append(make('span','',pick(...label)),make('b','',s.rate===null?pick('No answers yet','暂无作答'):s.rate+'% · '+s.correct+'/'+s.total));const bar=make('progress','');bar.max=100;bar.value=s.rate||0;bar.setAttribute('aria-label',pick(...label));row.append(bar);skills.append(row);}dialog.append(skills);
    const memory=make('section','adventure-memory-card');memory.append(make('h3','',pick('Memory altar','记忆祭坛')),make('p','',pick('Practice the same knowledge in a different situation. Reviews rebuild a local monument; three spaced successes master each rune.','换一个情境练习同一知识。复习会逐步修复当地遗迹；每题三次间隔成功后掌握符文。')),
      make('p','',pick('Due ','待复习 ')+data.memory.due+' · '+pick('Mastered ','已掌握 ')+data.memory.mastered+'/'+data.memory.total));
    if(data.memory.nextDue)memory.append(make('p','',pick('Next review: ','下次复习：')+new Date(data.memory.nextDue*1000).toLocaleString(getLanguage()==='zh'?'zh-CN':'en-GB')));
    const review=button(pick('Recall a memory','开始回忆'),()=>void act('MEMORY_START'),'review');review.id='memoryStart';review.disabled||=!data.memory.due;memory.append(review);dialog.append(memory);
  }
  function renderCompanions(){
    const catalog=window.EPQ_AUTH?.shopCatalog||{};dialog.append(make('p','adventure-bond',pick('Travel bond ','旅途默契 ')+data.bond+'/100 · '+pick('Companion goals unlock cosmetic charms. All looks share the same battle abilities.','完成同行目标，解锁专属外观徽饰；所有随从共享战斗能力。')));
    const care=button(pick('Greet your companion','和当前随从打招呼'),()=>{onPet();notice=pick('Your companion responds! Close the book to see the gesture.','随从回应了你！合上手册看看它的动作。');render();},'pet');dialog.append(care);
    const grid=make('div','handbook-companions');for(const [id,b] of Object.entries(data.book.companions)){
      const card=make('article','handbook-world'+(b.owned?'':' unowned')),p=catalog[id];if(p){const img=make('img','companion-goal-art');img.src=p.sprite;img.alt=pick(p.name,p.nameZh);img.width=img.height=64;card.append(img,make('h3','',pick(p.name,p.nameZh)));}
      card.append(make('h4','',pick(b.name,b.nameZh)),make('p','',pick(b.help,b.helpZh)),make('p','',b.current+'/'+b.required+' · '+pick(b.claimed?'Charm earned':b.owned?'Owned':'Not owned',b.claimed?'徽饰已获得':b.owned?'已拥有':'尚未拥有')));
      const claim=button(b.claimed?pick('Charm collected','徽饰已领取'):pick('Collect charm ·10 XP +5 Coins','领取徽饰 ·10经验 +5金币'),()=>void act('COMPANION_CLAIM',{companionId:id}),'companion-'+id);claim.disabled||=!b.owned||!b.ready||b.claimed||data.book.equipped!==id;card.append(claim);
      if(b.owned&&data.book.equipped!==id&&!b.claimed)card.append(make('small','',pick('Equip this companion in your backpack first.','请先到背包装备这只随从。')));grid.append(card);
    }dialog.append(grid);
  }
  function renderActivity(){
    const q=activity.question;dialog.append(make('p','adventure-eyebrow',pick(activity.context==='transfer'?'NEW CONTEXT · no HP penalty':'HISTORICAL REVIEW · no HP penalty',activity.context==='transfer'?'换个情境 · 不扣血':'历史原题回顾 · 不扣血')),make('h3','adventure-question',q.question));
    if(getLanguage()==='zh')dialog.append(make('p','',q.questionZh||''));dialog.append(make('p','',getLanguage()==='zh'?(q.promptZh||''):(q.prompt||'')));const choices=make('div','adventure-choices');
    if(q.type==='SENTENCE_BUILDER'){
      const row=make('div','adventure-selected');row.setAttribute('aria-live','polite');for(const [slot,index] of selected.entries())row.append(button(q.words[index],()=>{selected.splice(slot,1);render();dialog.querySelector('.adventure-choices button:not(:disabled)')?.focus();},'chosen-'+index));dialog.append(row);
      q.words.forEach((word,index)=>{const b=button(word,()=>{selected.push(index);render();dialog.querySelector('.adventure-choices button:not(:disabled),[data-activity-submit=sentence]:not(:disabled)')?.focus();},'word-'+index);b.disabled||=selected.includes(index);choices.append(b);});dialog.append(choices);
      const submit=button(pick('Confirm sentence','确认句子'),()=>void act('ACTIVITY_ANSWER',{questionToken:activity.token,answer:selected.map(i=>q.words[i])}),'submit');submit.disabled||=selected.length!==q.words.length;submit.dataset.activitySubmit='sentence';dialog.append(submit,button(pick('Clear','清空'),()=>{selected=[];render();},'clear'));
    }else{for(const [index,value] of (q.type==='TRUE_FALSE'?[true,false]:q.words).entries())choices.append(button(typeof value==='boolean'?pick(value?'TRUE':'FALSE',value?'正确':'错误'):value,()=>void act('ACTIVITY_ANSWER',{questionToken:activity.token,answer:value}),'answer-'+index));dialog.append(choices);}
    dialog.append(button(pick('Back to report','返回成长报告'),()=>{activity=null;render();},'back'));
  }
  async function act(action,inputs={}){
    if(pending)return;pending=true;notice='';render();
    try{const r=await request(action,inputs);if(!r.ok)throw Error(r.error||'');const out=r.outcome;if(out.adventure)data=out.adventure;if(out.activity){activity=out.activity;selected=[];feedback=null;}else{activity=null;feedback=out.masteryStage===undefined?null:out;}
      if(out.empty)notice=pick('No memories are due yet.','现在没有到期的错题。');if(out.expired)notice=pick('That question is finished. Open a new memory.','这道题已结束，请重新开始回忆。');
      if(out.companionCharm)notice=pick('Companion charm saved. +10 XP · +5 Coins on first claim.','随从徽饰已保存，首次领取 +10经验 · +5金币。');if(out.worldComplete)notice=pick('World seal saved. +20 XP · +15 Coins on first claim.','世界徽记已保存，首次领取 +20经验 · +15金币。');
      if(out.rewardClaimed||out.companionCharm||out.worldComplete)onChanged(r);
    }catch(e){notice=pick('Not confirmed. Check the requirements and retry. A lost reply cannot duplicate rewards.','尚未确认，请检查领取条件和连接后重试；丢失的回复不会重复发奖。');}
    finally{pending=false;render();dialog.scrollTop=0;dialog.querySelector('.adventure-choices button:not(:disabled)')?.focus({preventScroll:true});}
  }
  function update(time){const c=getContext();hud.classList.toggle('hidden',!c.enabled||c.inside);if(data&&map.open&&time-lastMini>.15){lastMini=time;drawMini(c);}}
  function drawMini(c){const g=mini.getContext('2d'),x=v=>12+276*v/c.width;g.fillStyle='#0c202a';g.fillRect(0,0,300,94);g.strokeStyle='#526970';g.strokeRect(12,44,276,10);g.fillStyle='#83d8d4';g.fillRect(x(220)-3,40,6,19);g.fillStyle='#d8bd85';for(const p of [c.caveX,c.realm==='maple'?2360:null,c.realm==='ruins'?4480:null].filter(Number.isFinite))g.fillRect(x(p)-3,39,6,7);g.fillStyle='#fff2d6';g.fillRect(x(c.x)-3,40,6,18);g.fillStyle='#d4ded6';g.font='12px system-ui';g.fillText(pick(...names[c.realm])+' · '+(data.book.worlds[c.realm]?.percent||0)+'%',12,24);g.fillText(pick('You ▪  Portal ▪  Landmark ▪','玩家 ▪  传送门 ▪  地标 ▪'),12,79);}
  function draw(ctx,{camera,ground,time}){
    const c=getContext();if(!data||c.inside)return;const x=Math.round(data.altars[c.realm]-camera);if(x< -150||x>innerWidth+150)return;
    const stage=data.book.restoration[c.realm]||0;ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.fillStyle='#172c36';ctx.fillRect(x-65,ground-8,130,8);ctx.fillStyle='#4c6570';for(const offset of [-52,34]){ctx.fillRect(x+offset,ground-32,18,24);if(stage>=1)ctx.fillRect(x+offset,ground-76,18,44);if(stage>=2)ctx.fillRect(x+offset,ground-118,18,42);}
    if(stage>=3){ctx.fillStyle='#97b2af';ctx.fillRect(x-60,ground-126,120,12);ctx.fillRect(x-44,ground-140,88,14);ctx.fillStyle='#e0ca8b';for(let n=0;n<4;n++)ctx.fillRect(x-30+n*18,ground-134,8,6);ctx.fillStyle='#81ddbe';ctx.fillRect(x-21,ground-74,42,8);ctx.fillRect(x-5,ground-94,10,48);
      for(let n=0;n<6;n++){ctx.fillStyle=n%2?'#b0e7d8':'#e9d69a';ctx.fillRect(Math.round(x+Math.sin(time*.7+n)*43),Math.round(ground-126+(time*12+n*21)%100),3,3);}}
    else{ctx.fillStyle='#6d848b';ctx.fillRect(x-15,ground-55,30,48);ctx.fillStyle='#86bdc1';ctx.fillRect(x-4,ground-47,8,28);ctx.fillRect(x-10,ground-38,20,6);ctx.fillStyle='#435761';for(let n=0;n<4;n++)ctx.fillRect(x-55+n*28,ground-10-(n%2)*7,22,7);}
    const near=Math.abs(data.altars[c.realm]-c.x)<80,y=ground-(near?183:158);ctx.fillStyle='#142e37';ctx.fillRect(x-68,y,136,24);ctx.fillStyle='#ead8a8';ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.fillText(pick('Memory monument','记忆遗迹')+' '+stage+'/3',x,y+16);if(near)ctx.fillText(pick('E · Recall','E · 回忆'),x,y-10);ctx.restore();
  }
  onLanguageChange(()=>{labels();if(dialog.open)render();});dialog.addEventListener('close',()=>journal.focus({preventScroll:true}));labels();
  return {refresh,update,draw,open,isOpen:()=>dialog.open,route:()=>null,
    async interact(){const c=getContext();if(!data||!c.enabled||c.inside||Math.abs(data.altars[c.realm]-c.x)>=80)return false;open('learning');await act('MEMORY_START');return true;},
    interest(){const c=getContext();if(c.inside)return Math.abs(c.x-260)<180?{x:260,kind:'cave'}:null;if(c.realm==='maple'&&Math.abs(c.x-2220)<160)return{x:2220,kind:'supplies'};if(Number.isFinite(c.caveX)&&Math.abs(c.x-c.caveX)<200)return{x:c.caveX,kind:'cave'};if(data&&Math.abs(c.x-data.altars[c.realm])<150)return{x:data.altars[c.realm],kind:'memory'};return null;},
    companionCharm(id){return data?.book.companions[id]?.claimed?data.book.companions[id].charm:null;},
    state(){return {loaded:!!data,open:dialog.open,tab,memory:data?.memory||null,bond:data?.bond||0,worlds:data?Object.fromEntries(Object.entries(data.book.worlds).map(([id,w])=>[id,w.percent])):{},codex:data?{seen:data.book.monsters.filter(m=>m.seen).length,defeated:data.book.monsters.filter(m=>m.defeated).length,total:data.book.monsters.length}:null,restoration:data?.book.restoration||{},activity:activity?{kind:activity.kind,id:activity.id,type:activity.question.type,context:activity.context}:null};}
  };
}
