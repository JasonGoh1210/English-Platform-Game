const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/battle.js'),'utf8');
const start=source.indexOf('function synchronizeSettingsPause('),end=source.indexOf('\nwindow.addEventListener("epq-settings-change"');
function fixture(request) {
  const warnings=new Map(),calls=[];
  const c={settingsTransition:Promise.resolve(),settingsRevision:0,serverReady:true,Promise,Error,
    state:{settingsOpen:false,settingsPaused:false,settingsPending:false,settingsFailed:false,completed:false,leaving:false,needsQuestion:false},
    ui:{timerText:{textContent:''}},renderSettingsPause(){},applyServerBattle:r=>r.ok,
    setSaveWarning:(kind,value)=>warnings.set(kind,value),clearSaveWarning:kind=>warnings.delete(kind),
    startQuestion:()=>{calls.push('NEXT');},battleRequest:async action=>{calls.push(action);return request(action,c);}};
  vm.createContext(c);vm.runInContext(source.slice(start,end),c);return {c,calls,warnings};
}
test('Rapid settings open/close serialize PAUSE and RESUME and keep input blocked until confirmation',async()=>{
  let release;const held=new Promise(r=>release=r);
  const f=fixture(async action=>{if(action==='PAUSE')await held;return {ok:true,battle:{paused:action==='PAUSE',remaining:4.5}};});
  const opening=f.c.synchronizeSettingsPause(true),closing=f.c.synchronizeSettingsPause(false);
  assert.equal(f.c.state.settingsPending,true);await Promise.resolve();release();await Promise.all([opening,closing]);
  assert.deepEqual(f.calls,['PAUSE','RESUME']);assert.equal(f.c.state.settingsPending,false);assert.equal(f.c.state.settingsPaused,false);
  assert.equal(f.c.state.remaining,4.5);assert.equal(f.warnings.size,0);
});
test('A superseded failed pause cannot block a later successful resume',async()=>{
  const f=fixture(async action=>({ok:action==='RESUME',battle:{paused:false,remaining:3}}));
  await Promise.all([f.c.synchronizeSettingsPause(true),f.c.synchronizeSettingsPause(false)]);
  assert.equal(f.c.state.settingsFailed,false);assert.equal(f.warnings.size,0);
});
test('An unconfirmed resume remains blocked and a retry starts the deferred question only after success',async()=>{
  let succeed=false;const f=fixture(async()=>({ok:succeed,battle:{paused:false}}));f.c.state.settingsPaused=true;f.c.state.needsQuestion=true;
  await f.c.synchronizeSettingsPause(false);assert.equal(f.c.state.settingsFailed,true);assert.equal(f.calls.includes('NEXT'),false);
  succeed=true;await f.c.synchronizeSettingsPause(false);assert.equal(f.c.state.settingsFailed,false);assert.deepEqual(f.calls,['RESUME','RESUME','NEXT']);
});
