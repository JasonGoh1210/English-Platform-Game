const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../js/quest-api.js'),'utf8').replace('export function','function');
function success(){return {ok:true,chapterStep:1,player:{level:1,xp:25,coins:0,englishPowerTotal:1},outcome:{}};}
function fixture(storage=new Map()) {
  const c={Promise,Map,Array,Object,JSON,AbortController,crypto:require('node:crypto').webcrypto,
    setTimeout:(fn,ms)=>ms===10000?0:setTimeout(fn,0),clearTimeout,
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}};
  vm.createContext(c);vm.runInContext(source,c);return {c,storage};
}
test('Lost quest response replays identical inputs and serializes the next chapter',async()=>{
  const {c,storage}=fixture(),calls=[],confirmed=[];
  c.fetch=async(url,options)=>{calls.push(JSON.parse(options.body));if(calls.length===1)throw Error('Lost after commit');return {ok:true,status:200,json:async()=>success()};};
  const client=c.createQuestClient('csrf',7,r=>confirmed.push(r));
  await Promise.all([client.request('NPC',{npcId:'elder'}),client.request('NPC',{npcId:'mira'})]);
  assert.deepEqual(calls[0],calls[1]);assert.equal(calls[2].npcId,'mira');assert.notEqual(calls[2].requestId,calls[0].requestId);
  assert.equal(confirmed.length,2);assert.equal(storage.size,0);
});
test('Pending claim survives reload with its request ID and uses the new session CSRF',async()=>{
  const {c,storage}=fixture();let before;
  c.fetch=async(url,o)=>{before=JSON.parse(o.body);throw Error('Offline');};
  const client=c.createQuestClient('old',7);assert.equal((await client.request('NPC',{npcId:'elder'})).ok,false);
  const restored=fixture(storage).c;let after;
  restored.fetch=async(url,o)=>{after=JSON.parse(o.body);return {ok:true,status:200,json:async()=>success()};};
  await restored.createQuestClient('new',7).recover();assert.equal(before.requestId,after.requestId);assert.equal(after.csrfToken,'new');assert.equal(storage.size,0);
});
test('Retrying an uncertain answer reuses its receipt; conflicts are terminal and storage may be blocked',async()=>{
  const {c}=fixture(),calls=[];let offline=true;
  c.fetch=async(url,o)=>{calls.push(JSON.parse(o.body));if(offline)throw Error('Offline');return {ok:true,status:200,json:async()=>success()};};
  const client=c.createQuestClient('csrf',7),input={runId:'run',questionToken:'word',answer:'throw'};
  await client.request('TYPING_ANSWER',input);offline=false;await client.request('TYPING_ANSWER',input);
  assert.ok(calls.every(x=>x.requestId===calls[0].requestId));
  c.localStorage={getItem(){throw Error('Blocked');},setItem(){throw Error('Blocked');},removeItem(){throw Error('Blocked');}};
  c.fetch=async()=>({ok:false,status:409,json:async()=>({ok:false})});assert.equal((await c.createQuestClient('csrf',8).request('NPC',{npcId:'elder'})).status,409);
});

test('An incomplete success receipt is retried without confirming or replacing its request ID',async()=>{
  const {c,storage}=fixture(),calls=[],confirmed=[];
  c.fetch=async(url,o)=>{calls.push(JSON.parse(o.body));return {ok:true,status:200,json:async()=>calls.length<3?{ok:true}:success()};};
  const result=await c.createQuestClient('csrf',7,r=>confirmed.push(r)).request('NPC',{npcId:'elder'});
  assert.equal(result.ok,true);assert.equal(calls.length,3);assert.ok(calls.every(x=>x.requestId===calls[0].requestId));
  assert.equal(confirmed.length,1);assert.equal(storage.size,0);
});

test('Startup recovery and a simultaneous retry return the same completed receipt',async()=>{
  const {c,storage}=fixture();let original;
  c.fetch=async(url,o)=>{original=JSON.parse(o.body);throw Error('Offline');};
  await c.createQuestClient('old',7).request('NPC',{npcId:'elder'});
  const restored=fixture(storage).c,calls=[];
  restored.fetch=async(url,o)=>{calls.push(JSON.parse(o.body));return {ok:true,status:200,json:async()=>success()};};
  const client=restored.createQuestClient('new',7);
  const [,response]=await Promise.all([client.recover(),client.request('NPC',{npcId:'elder'})]);
  assert.equal(response.player.xp,25);assert.equal(calls.length,1);assert.equal(calls[0].requestId,original.requestId);assert.equal(storage.size,0);
});
