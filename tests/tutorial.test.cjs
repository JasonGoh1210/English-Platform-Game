const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const tutorial = fs.readFileSync(path.join(root, "js/tutorial.js"), "utf8").replaceAll("export function", "function");
const map = fs.readFileSync(path.join(root, "js/rpg.js"), "utf8");
function loadFunctions(context, names) {
  for (const name of names) {
    const start = map.search(new RegExp(`^function ${name}\\(`, "m"));
    assert.ok(start >= 0);
    vm.runInContext(map.slice(start, map.indexOf("\n}", start) + 2), context);
  }
}
function fixture() {
  const c = { tutorialReady:true, saves:[], frames:[],
    world:{tutorial:{version:1,stage:"MOVE",moveStartX:440},player:{x:440},currentRealmId:"maple",questStep:0},
    enemies:[{id:"slime-01",x:1435,defeated:false}],
    saveWorldState:()=>c.saves.push(JSON.parse(JSON.stringify(c.world))),
    renderTutorialGuide:(value,visible)=>c.frames.push({stage:value.stage,visible}),
    getLanguage:()=>"zh", settingsIsOpen:()=>false
  };
  vm.createContext(c); vm.runInContext(tutorial,c);
  loadFunctions(c,["setMapTutorialStage","updateMapTutorial"]);
  return c;
}

test("New adventures enroll; existing characters and terminal guide stages keep their progress", () => {
  const c=fixture();
  assert.equal(c.initialTutorial(null,true).stage,"MOVE");
  for(const saved of [{questStep:3,xp:120},{questStep:0,defeatedEnemyIds:["slime-01"]}]) {
    assert.equal(c.initialTutorial(saved,true).stage,"LEGACY");
    assert.equal(saved.tutorial,undefined,"Never mutate a player's existing snapshot");
  }
  assert.equal(c.initialTutorial({questStep:0},false).stage,"LEGACY");
  for(const stage of ["DONE","SKIPPED","BATTLE","RETURN"]) {
    assert.equal(c.initialTutorial({tutorial:{version:1,stage,moveStartX:512}},true).stage,stage);
  }
});

test("Movement advances once, lesson spawn preserves the original slime and skipping restores its position", () => {
  const c=fixture(); c.updateMapTutorial();
  assert.equal(c.tutorialSlimeVisible(c.world.tutorial),false);
  c.world.player.x=510;c.updateMapTutorial();
  assert.equal(c.world.tutorial.stage,"MEET");assert.equal(c.saves.length,1);
  for(let i=0;i<30;i++)c.updateMapTutorial();
  assert.equal(c.saves.length,1,"Animation frames cannot repeatedly save a checkpoint");
  c.setMapTutorialStage("SLIME");
  assert.equal(c.enemies[0].x,1140);assert.equal(c.enemies[0].defeated,false);
  c.setMapTutorialStage("SKIPPED");assert.equal(c.enemies[0].x,1435);
  assert.equal(c.tutorialSlimeVisible(c.world.tutorial),true);
});

test("Victory requests Rowan's debrief once; completed tutorials never respawn enemies", () => {
  const c=fixture();c.world.tutorial.stage="SLIME";c.enemies[0].defeated=true;
  c.updateMapTutorial();assert.equal(c.world.tutorial.stage,"RETURN");assert.equal(c.saves.length,1);
  c.updateMapTutorial();assert.equal(c.saves.length,1);
  c.setMapTutorialStage("DONE");assert.equal(c.enemies[0].defeated,true);
  assert.equal(c.frames.at(-1).visible,false);
  c.updateMapTutorial();assert.equal(c.world.tutorial.stage,"DONE");
});

test("Story, settings and other worlds hide the guide without consuming movement checkpoints", () => {
  for(const patch of [{storyIntroOpen:true},{interacting:true},{currentRealmId:"forest"},{travelMenu:true}]) {
    const c=fixture();Object.assign(c.world,patch);c.world.player.x=600;c.updateMapTutorial();
    assert.equal(c.frames.at(-1).visible,false);assert.equal(c.world.tutorial.stage,"MOVE");
  }
});

test("Unknown progress is rejected and position anchors are bounded", () => {
  const c=fixture();
  for(const value of [null,{}, {version:2,stage:"MOVE"},{version:1,stage:"ADMIN_REWARD"}])assert.equal(c.normalizeTutorial(value),null);
  assert.equal(c.normalizeTutorial({version:1,stage:"MOVE",moveStartX:Infinity}).moveStartX,440);
  assert.equal(c.normalizeTutorial({version:1,stage:"MOVE",moveStartX:-999}).moveStartX,70);
});
