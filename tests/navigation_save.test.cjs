const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/rpg.js'),'utf8'),start=source.indexOf('window.addEventListener("pagehide",');
const handler=source.slice(start,source.indexOf('\nsetInterval(',start));
function fixture(ready,battle){const storage=new Map(),sent=[],c={dbSaveReady:ready,world:{battle},WORLD_SAVE_KEY:'world',WORLD_PENDING_KEY:'pending',AUTH_CONTEXT:{csrfToken:'test'},Blob,JSON,saves:0,
  localStorage:{getItem:k=>storage.get(k)||null},navigator:{sendBeacon:(url,blob)=>sent.push({url,blob})},window:{addEventListener:(event,fn)=>c.hide=fn},
  saveWorldState:()=>{c.saves++;storage.set('world',JSON.stringify({currentRealmId:'forest',insideCave:true,playerX:537}));storage.set('pending','1');}};
  vm.createContext(c);vm.runInContext(handler,c);return {c,storage,sent};}
test('Reload captures movement after the last periodic save and sends the current interior position',async()=>{
  const f=fixture(true,null);f.storage.set('world',JSON.stringify({playerX:440}));f.c.hide();
  assert.equal(f.c.saves,1);assert.equal(f.sent.length,1);assert.equal(f.sent[0].url,'/FYP/api/game_state.php');
  const payload=JSON.parse(await f.sent[0].blob.text());assert.equal(payload.state.playerX,537);assert.equal(payload.state.insideCave,true);
});
test('Battle navigation preserves its saved safe position instead of the live encounter position',async()=>{
  const f=fixture(true,{id:'clockwork-owl-01'});f.storage.set('world',JSON.stringify({playerX:830,insideCave:true}));f.storage.set('pending','1');f.c.hide();
  assert.equal(f.c.saves,0);assert.equal(JSON.parse(await f.sent[0].blob.text()).state.playerX,830);
});
test('An unavailable initial database read cannot overwrite the existing player save on page exit',()=>{
  const f=fixture(false,null);f.c.hide();assert.equal(f.c.saves,0);assert.equal(f.sent.length,0);assert.equal(f.storage.size,0);
});
