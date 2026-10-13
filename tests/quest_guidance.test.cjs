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
  assert.equal(fromRuins.routeX,1510); assert.equal(fromRuins.direction,"right");
  assert.equal(questGuidance({chapter:1,realm:"ruins",x:1500}).routeKey,"guide.route.portal.near");
  assert.equal(questGuidance({chapter:3,realm:"ruins",x:1100}).direction,"left");
  assert.equal(questGuidance({chapter:4,realm:"ruins",x:1930}).routeKey,"guide.route.near");
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
