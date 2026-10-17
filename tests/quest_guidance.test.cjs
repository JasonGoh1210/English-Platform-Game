const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const moduleReady = import("data:text/javascript;base64," + Buffer.from(fs.readFileSync(path.join(__dirname, "../js/quest-guidance.js"))).toString("base64"));

test("Next NPC follows the saved chapter, and cross-world directions point at the current world's fixed portal", async () => {
  const { questGuidance } = await moduleReady;
  for (const [chapter, id, realm] of [[0,"elder","maple"],[1,"mira","forest"],[2,"tala","camp"],[3,"kai","ruins"],[4,"typing","ruins"],[5,"kai","ruins"]]) {
    const guide = questGuidance({ chapter, realm, x: 440 });
    assert.equal(guide.target.id, id); assert.equal(guide.target.realm, realm);
    assert.equal(guide.viaPortal, false); assert.equal(guide.direction, "right");
  }
  const toForest = questGuidance({chapter:1,realm:"maple",x:880});
  assert.equal(toForest.target.id,"mira"); assert.equal(toForest.routeX,220); assert.equal(toForest.direction,"left");
  const fromRuins = questGuidance({chapter:1,realm:"ruins",x:870});
  assert.equal(fromRuins.routeX,220); assert.equal(fromRuins.direction,"left");
  assert.equal(questGuidance({chapter:1,realm:"ruins",x:210}).routeKey,"guide.route.portal.near");
  assert.equal(questGuidance({chapter:3,realm:"ruins",x:1100}).direction,"left");
  const layout=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/world_layout.json'),'utf8'));
  assert.equal(questGuidance({chapter:4,realm:"ruins",x:1930}).direction,"right");
  assert.equal(questGuidance({chapter:4,realm:"ruins",x:layout.finalCastleX-10}).routeKey,"guide.route.near");
  assert.equal(questGuidance({chapter:4,realm:"ruins",x:1680}).target.x,layout.finalCastleX);
  assert.ok(layout.finalCastleX-1680>1920,'Castle is beyond an entire desktop viewport from Echo Cave');
  const sealed=questGuidance({chapter:4,realm:"ruins",x:1940,dungeonAccess:{ruins:false}});
  assert.equal(sealed.target.id,"guardian-01");assert.equal(sealed.direction,"left");assert.equal(sealed.mainTarget.id,"typing");
});

test('Castle guidance follows the saved tree, warden, key and open-gate progression',async()=>{
  const {questGuidance}=await moduleReady;
  const base={chapter:4,realm:'ruins',x:2000,dungeonAccess:{ruins:true}};
  for(const [castle,id] of [[{treeCleared:false},'hollow-treant-01'],[{treeCleared:true,hasKey:false},'castle-warden-01'],[{treeCleared:true,hasKey:true},'castle-gate'],[{gateOpen:true},'typing']]) {
    const guide=questGuidance({...base,castle});assert.equal(guide.target.id,id);assert.equal(guide.mainTarget.id,'typing');
    assert.equal(questGuidance({...base,realm:'forest',castle}).routeX,220);
  }
  assert.equal(questGuidance({...base,x:3705,castle:{treeCleared:true,hasKey:true}}).direction,'near');
});

test('Each world interior guides to its own guardian and exit without overwriting the main quest',async()=>{
  const {questGuidance,echoEnemyAvailable}=await moduleReady;
  const specs=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/dungeons.json'),'utf8'));
  for(const [realm,spec] of Object.entries(specs)) {
    const guide=questGuidance({realm,chapter:4,insideCave:true,x:440,rooms:spec.enemies});
    assert.equal(guide.target.id,spec.enemies[0].id);assert.equal(guide.target.realm,realm);assert.equal(guide.mainTarget.id,'typing');
    const complete=questGuidance({realm,insideCave:true,x:1000,rooms:spec.enemies,defeatedIds:spec.enemies.map(e=>e.id)});
    assert.equal(complete.target.id,'exit');assert.equal(complete.target.realm,realm);assert.equal(complete.direction,'left');
    assert.equal(echoEnemyAvailable('unknown-monster',[],spec.enemies),false);
  }
});

test("Tutorial battle and return override the next chapter without altering it", async () => {
  const { questGuidance } = await moduleReady;
  const input = {chapter:1,realm:"maple",x:900,tutorial:{stage:"RETURN"}};
  assert.equal(questGuidance(input).target.id,"elder");assert.equal(input.chapter,1);
  const slime=questGuidance({...input,tutorial:{stage:"SLIME"},slimeX:1140});
  assert.equal(slime.target.id,"slime-01");assert.equal(slime.routeX,1140);
});

test("Optional cave rooms unlock in order, keep story destination and guide back to the exit when cleared", async () => {
  const { questGuidance, echoProgress, echoEnemyAvailable } = await moduleReady;
  const cleared=["cave-wraith-01","echo-slime-01","echo-dragon-01"];
  for(let count=0;count<3;count++) {
    const ids=cleared.slice(0,count);
    const guide=questGuidance({chapter:4,realm:"ruins",insideCave:true,x:440,defeatedIds:ids});
    assert.equal(guide.target.id,cleared[count]);assert.equal(guide.echo.cleared,count);
    assert.equal(guide.mainTarget.id,"typing");assert.equal(guide.viaPortal,false);
    assert.equal(echoEnemyAvailable(cleared[count],ids),true);
    if(count<2)assert.equal(echoEnemyAvailable(cleared[count+1],ids),false);
  }
  const complete=questGuidance({chapter:4,realm:"ruins",insideCave:true,x:1870,defeatedIds:cleared});
  assert.equal(complete.target.id,"exit");assert.equal(complete.routeX,260);assert.equal(complete.direction,"left");
  assert.equal(echoProgress([]).cleared,0);assert.equal(echoProgress([cleared[0],cleared[0]]).cleared,1);
});
