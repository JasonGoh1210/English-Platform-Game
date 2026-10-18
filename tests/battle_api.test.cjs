const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync(require("node:path").join(__dirname, "../js/battle-api.js"), "utf8").replaceAll("export ", "");

test("Lost combat responses replay the same request and serialize later actions", async () => {
  const calls = [], warnings = [];
  let id = 0;
  const context = {
    AbortController, Promise,
    crypto: {randomUUID: () => String(++id).padStart(32,"0")},
    setTimeout: (fn, ms) => { if(ms === 2000) queueMicrotask(fn); return 1; }, clearTimeout() {},
    fetch: async (url, options) => {
      calls.push(JSON.parse(options.body));
      assert.equal(url,"/FYP/api/battle.php");
      if(calls.length === 1) throw Error("Response lost after commit");
      return {ok:true,status:200,json:async () => ({ok:true,receipt:calls.at(-1).requestId})};
    }
  };
  vm.createContext(context); vm.runInContext(source, context);
  const request = context.createBattleClient("a".repeat(32),"csrf", retry => warnings.push(retry));
  const answer = request("ANSWER", {questionToken:"q",answer:true});
  const herb = request("POTION");
  await Promise.all([answer,herb]);
  assert.deepEqual(calls.map(c=>c.action),["ANSWER","ANSWER","POTION"]);
  assert.deepEqual(calls[0],calls[1]);
  assert.notEqual(calls[1].requestId,calls[2].requestId);
  assert.ok(warnings.includes(true)); assert.equal(warnings.at(-1),false);
});

test("Rejected purchases and missing migrations terminate without automatic charge retries", async () => {
  for(const data of [{ok:false,error:"Insufficient Coins"},{ok:false,errorCode:"MIGRATION_REQUIRED"}]) {
    let calls = 0;
    const c = {AbortController,Promise,crypto:{randomUUID:()=>"b".repeat(32)},setTimeout:()=>1,clearTimeout(){},
      fetch:async()=>{calls++;return {ok:false,status:data.errorCode?503:409,json:async()=>data};}};
    vm.createContext(c); vm.runInContext(source,c);
    const result = await c.createBattleClient("a".repeat(32),"csrf")("POTION");
    assert.equal(result.ok,false); assert.equal(calls,1);
  }
});
