const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/skills.js'),'utf8');
function fn(name) {const start=source.search(new RegExp('(?:export |async )?function '+name+'\\('));return source.slice(start,source.indexOf('\n}',start)+2).replace('export ','');}
test('Skill receipts reject forged points, unsupported levels and missing character progression',()=>{
  const c={Number};vm.createContext(c);vm.runInContext(fn('validSkillsReceipt'),c);
  const good={ok:true,skills:{characterLevel:2,skillPoints:1,wordStrikeLevel:0}};
  assert.ok(c.validSkillsReceipt(good));
  for(const patch of [{skillPoints:-1},{skillPoints:'1'},{wordStrikeLevel:4},{characterLevel:0}])assert.ok(!c.validSkillsReceipt({...good,skills:{...good.skills,...patch}}));
});
function fixture(request){const calls=[],c={branch:'word-strike',skills:null,busy:false,errorKey:null,noticeKey:null,pendingTarget:null,
  window:{EPQ_SKILLS:{csrfToken:'csrf'}},render(){},byId:()=>({focus(){}}),request:async body=>{calls.push(body);return request(body);}};
  vm.createContext(c);vm.runInContext(fn('validSkillsReceipt')+'\n'+fn('unlock'),c);return {c,calls};}
test('An uncertain purchase retains its exact target and retries without buying the next level',async()=>{
  let fail=true;const f=fixture(async()=>{if(fail)throw Error('Lost committed response');return {ok:true,skills:{characterLevel:3,skillPoints:1,wordStrikeLevel:1}};});
  await f.c.unlock(1);assert.equal(f.c.pendingTarget,1);assert.equal(f.c.errorKey,'skills.saveFailed');
  await f.c.unlock(2);assert.equal(f.calls.length,1,'Uncertain tier cannot be replaced by a different spend');
  fail=false;await f.c.unlock(f.c.pendingTarget);assert.deepEqual(f.calls.map(x=>x.targetLevel),[1,1]);assert.equal(f.c.pendingTarget,null);assert.equal(f.c.skills.wordStrikeLevel,1);
});
test('While a purchase is pending another activation cannot issue a second spend',async()=>{
  let release;const response=new Promise(r=>release=r),f=fixture(()=>response);
  const first=f.c.unlock(1);await f.c.unlock(2);assert.equal(f.calls.length,1);
  release({ok:true,skills:{characterLevel:2,skillPoints:0,wordStrikeLevel:1}});await first;assert.equal(f.c.busy,false);
});
test('Changed purchase conditions refresh the server balance before another choice',async()=>{
  const f=fixture(async body=>body?{rejected:true,errorCode:'NOT_ENOUGH_SKILL_POINTS'}:{ok:true,skills:{characterLevel:2,skillPoints:0,wordStrikeLevel:1}});
  await f.c.unlock(1);assert.equal(f.c.pendingTarget,null);assert.equal(f.c.skills.skillPoints,0);assert.equal(f.c.errorKey,null);assert.equal(f.c.noticeKey,'skills.pointsChanged');
});

test('Every unmet skill condition reports its own exact gap without hiding other conditions',()=>{
  const c={Math};vm.createContext(c);vm.runInContext(fn('skillNodeState'),c);
  const snapshot={characterLevel:3,skillPoints:2,wordStrikeLevel:0};
  const first=c.skillNodeState(snapshot,{level:1,cost:1,requiredLevel:2});assert.equal(first.ready,true);
  const second=c.skillNodeState(snapshot,{level:2,cost:2,requiredLevel:3});assert.equal(second.previousMet,false);assert.equal(second.levelGap,0);assert.equal(second.pointsGap,0);assert.equal(second.ready,false);
  const third=c.skillNodeState(snapshot,{level:3,cost:3,requiredLevel:5});assert.equal(third.previousMet,false);assert.equal(third.levelGap,2);assert.equal(third.pointsGap,1);assert.equal(third.ready,false);
});
test('Unknown snapshots never mark a tier ready, and owned tiers cannot be bought again',()=>{
  const c={Math};vm.createContext(c);vm.runInContext(fn('skillNodeState'),c);
  assert.equal(c.skillNodeState(null,{level:1,cost:1,requiredLevel:2}).known,false);
  for(let level=1;level<=3;level++){const state=c.skillNodeState({characterLevel:5,skillPoints:0,wordStrikeLevel:3},{level,cost:level,requiredLevel:2});assert.equal(state.owned,true);assert.equal(state.ready,false);}
});
test('A read failure clears stale unlock eligibility instead of enabling a stale purchase',async()=>{
  const f=fixture(async()=>{throw Error('Offline');});f.c.skills={characterLevel:5,skillPoints:6,wordStrikeLevel:0};
  vm.runInContext(fn('load')+'\n'+fn('skillNodeState')+'\n'+fn('selectionReady'),f.c);
  await f.c.load();assert.equal(f.c.skills,null);assert.equal(f.c.errorKey,'skills.loadFailed');
  assert.equal(f.c.selectionReady({level:1,cost:1,requiredLevel:2}),false);
});
test('Expired sessions stop credential retries and require the page to refresh',async()=>{
  const f=fixture(async()=>({rejected:true,errorCode:'SESSION_EXPIRED'}));
  await f.c.unlock(1);assert.equal(f.c.pendingTarget,null);assert.equal(f.c.errorKey,'skills.sessionExpired');assert.equal(f.c.skills,null);assert.equal(f.calls.length,1);
});
test('A rejected purchase followed by a failed refresh is a load error, not an uncertain spend',async()=>{
  const f=fixture(async body=>{if(body)return {rejected:true,errorCode:'CHARACTER_LEVEL_REQUIRED'};throw Error('Read failed');});
  await f.c.unlock(2);assert.equal(f.c.pendingTarget,null);assert.equal(f.c.skills,null);assert.equal(f.c.errorKey,'skills.loadFailed');
});
