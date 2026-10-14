const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/skills.js'),'utf8');
function fn(name) {const start=source.search(new RegExp('(?:export |async )?function '+name+'\\('));return source.slice(start,source.indexOf('\n}',start)+2).replace('export ','');}
test('Skill receipts reject forged points, unsupported levels and missing character progression',()=>{
  const c={Number};vm.createContext(c);vm.runInContext(fn('validSkillsReceipt'),c);
  const good={ok:true,skills:{characterLevel:2,skillPoints:1,wordStrikeLevel:0}};
  assert.ok(c.validSkillsReceipt(good));
  for(const patch of [{skillPoints:-1},{skillPoints:'1'},{wordStrikeLevel:4},{characterLevel:0}])assert.ok(!c.validSkillsReceipt({...good,skills:{...good.skills,...patch}}));
});
function fixture(request){const calls=[],c={skills:null,busy:false,errorKey:null,noticeKey:null,pendingTarget:null,
  window:{EPQ_SKILLS:{csrfToken:'csrf'}},render(){},byId:()=>({focus(){}}),request:async body=>{calls.push(body);return request(body);}};
  vm.createContext(c);vm.runInContext(fn('validSkillsReceipt')+'\n'+fn('unlock'),c);return {c,calls};}
test('An uncertain purchase retains its exact target and retries without buying the next level',async()=>{
  let fail=true;const f=fixture(async()=>{if(fail)throw Error('Lost committed response');return {ok:true,skills:{characterLevel:3,skillPoints:1,wordStrikeLevel:1}};});
  await f.c.unlock(1);assert.equal(f.c.pendingTarget,1);assert.equal(f.c.errorKey,'skills.saveFailed');
  fail=false;await f.c.unlock(f.c.pendingTarget);assert.deepEqual(f.calls.map(x=>x.targetLevel),[1,1]);assert.equal(f.c.pendingTarget,null);assert.equal(f.c.skills.wordStrikeLevel,1);
});
test('While a purchase is pending another activation cannot issue a second spend',async()=>{
  let release;const response=new Promise(r=>release=r),f=fixture(()=>response);
  const first=f.c.unlock(1);await f.c.unlock(2);assert.equal(f.calls.length,1);
  release({ok:true,skills:{characterLevel:2,skillPoints:0,wordStrikeLevel:1}});await first;assert.equal(f.c.busy,false);
});
test('Changed purchase conditions refresh the server balance before another choice',async()=>{
  const f=fixture(async body=>body?{rejected:true,errorCode:'NOT_ENOUGH_SKILL_POINTS'}:{ok:true,skills:{characterLevel:2,skillPoints:0,wordStrikeLevel:1}});
  await f.c.unlock(1);assert.equal(f.c.pendingTarget,null);assert.equal(f.c.skills.skillPoints,0);assert.equal(f.c.errorKey,'skills.requirementsChanged');
});
