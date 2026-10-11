const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const battleSource = fs.readFileSync(path.join(root, "js/battle.js"), "utf8");
const mapSource = fs.readFileSync(path.join(root, "js/rpg.js"), "utf8");

// Run the production functions with controlled storage/network/time boundaries.
function functions(source, names) {
  return names.map(name => {
    const start = source.search(new RegExp(`^(?:async )?function ${name}\\(`, "m"));
    assert.notEqual(start, -1, `Missing production function: ${name}`);
    const end = source.indexOf("\n}", start);
    return source.slice(start, end + 2);
  }).join("\n");
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function fixture() {
  const storage = new Map();
  const tasks = [];
  const warnings = new Map();
  const c = {
    console: { warn() {} }, AbortController, Promise,
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: key => storage.delete(key)
    },
    sessionStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: key => storage.delete(key)
    },
    WORLD_SAVE_KEY: "test.player.7", WORLD_PENDING_KEY: "test.player.7.pending",
    BATTLE_KEY: "battle.7", ESCAPE_KEY: "escape.7", AUTH_CONTEXT: { csrfToken: "test" },
    pendingBattleSave: Promise.resolve(), pendingBattleRewards: [], rewardChain: Promise.resolve(),
    pendingItemUse: Promise.resolve(), battleSaveRevision: 0,
    dbSaveReady: true, saveDelayHandle: null, pendingSaveData: null,
    saveChain: Promise.resolve(), saveRevision: 0,
    now: 3000, performance: { now: () => c.now },
    setTimeout: (fn, ms) => { const task = { fn, ms }; tasks.push(task); return task; },
    clearTimeout: task => { if (task) task.cancelled = true; },
    setSaveWarning: (kind, key) => warnings.set(kind, key),
    clearSaveWarning: kind => warnings.delete(kind),
    t: key => key, localEnemyName: () => "Word Slime", questionSkillCode: () => "VOCABULARY",
    messages: [], setBattleMessage: key => c.messages.push(key),
    updateHp() {}, playAttackAnimation() {}, playEnemyAttackAnimation() {},
    disableAnswers() {}, showQuestionPanel() {}, startQuestion() {},
    showResult() {}, finishDefeat() {},
    state: {
      enemy: { id: "slime-01", name: "Word Slime", hp: 60, damage: 10, xp: 20, coins: 10 },
      enemyHp: 60, playerHp: 65, playerMaxHp: 100,
      completed: false, locked: false, itemPending: false, leaving: false,
      focusUsed: false, questionStartAt: 0,
      currentQuestion: { id: "q1", type: "TRUE_FALSE", answer: true, difficulty: "EASY", timeLimit: 5, xp: 10, coins: 5, englishPower: 1 }
    },
    ui: {
      questionPanel: { classList: { contains: () => false } },
      answerArea: { querySelectorAll: () => c.answerButtons },
      itemButton: { disabled: false }, activeItemButton: { disabled: false }
    },
    answerButtons: [{ disabled: false }, { disabled: true }],
    saved: { coins: 10, xp: 0, power: 0, questStep: 1 },
    getSave: () => c.saved,
    updateSave: patch => Object.assign(c.saved, patch),
    trackBattleReward: async payload => { c.rewards.push(payload); return { ok: true, player: { coins: 5 } }; },
    rewards: [],
    fetch: async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) }),
    loadWorldState() {}, recenterCamera() {}, updateQuest() {}, syncHUD() {}, loadServerPlayer() {}
  };
  c.window = { clearInterval() {}, setTimeout: c.setTimeout, location: { href: "battle.php", reload() { c.reloaded = true; } } };
  vm.createContext(c);
  return { c, storage, tasks, warnings, load: (source, names) => vm.runInContext(functions(source, names), c) };
}

test("Word Slime victory preserves every story chapter and grants its normal reward", () => {
  for (let chapter = 0; chapter <= 5; chapter++) {
    const f = fixture();
    f.c.saved.questStep = chapter;
    f.load(battleSource, ["finishVictory"]);
    f.c.finishVictory();
    assert.equal(f.c.saved.questStep, chapter);
    assert.equal(f.c.saved.xp, 20);
    assert.equal(f.c.saved.coins, 20);
    assert.deepEqual(Array.from(f.c.saved.defeatedEnemyIds), ["slime-01"]);
    f.c.finishVictory();
    assert.equal(f.c.rewards.length, 1, "Victory cannot grant a second reward");
  }
});

test("Correct attacks preserve player HP and schedule the next question", () => {
  const f = fixture();
  f.load(battleSource, ["normalizeSentence", "isCorrect", "resolve", "enemyTurn"]);
  f.c.resolve(true, null, false);
  assert.equal(f.c.state.playerHp, 65);
  assert.equal(f.c.state.enemyHp, 40);
  assert.equal(f.tasks[0].fn, f.c.startQuestion);
  f.c.resolve(true, null, false);
  assert.equal(f.c.rewards.length, 1);
});

test("Wrong answers and timeouts trigger enemy damage and continuous questions", () => {
  for (const timeout of [false, true]) {
    const f = fixture();
    f.load(battleSource, ["normalizeSentence", "isCorrect", "resolve", "enemyTurn"]);
    f.c.resolve(false, null, timeout);
    assert.equal(f.tasks[0].fn, f.c.enemyTurn);
    f.tasks[0].fn();
    assert.equal(f.c.state.playerHp, 55);
    assert.equal(f.tasks[1].fn, f.c.startQuestion);
  }
});

test("Healing Herb waits for confirmation, blocks double clicks and resumes the same question", async () => {
  const f = fixture(), purchase = deferred();
  f.c.trackBattleReward = payload => { f.c.rewards.push(payload); return purchase.promise; };
  f.load(battleSource, ["useItem", "normalizeSentence", "isCorrect", "resolve"]);
  const currentQuestion = f.c.state.currentQuestion;
  const result = f.c.useItem();
  assert.equal(f.c.state.playerHp, 65);
  assert.equal(f.c.saved.coins, 10);
  assert.equal(f.c.state.itemPending, true);
  f.c.useItem();
  f.c.resolve(true, null, false);
  assert.equal(f.c.rewards.length, 1);
  assert.equal(f.c.state.enemyHp, 60);
  f.c.now += 1500;
  purchase.resolve({ ok: true, player: { coins: 5 } });
  assert.equal(await result, true);
  assert.equal(f.c.state.playerHp, 85);
  assert.equal(f.c.saved.coins, 5);
  assert.equal(f.c.state.currentQuestion, currentQuestion);
  assert.equal(f.c.state.questionStartAt, 1500, "Purchase wait does not penalize answer speed");
  assert.deepEqual(f.c.answerButtons.map(b => b.disabled), [false, true]);
  assert.equal(f.c.state.itemPending, false);
  assert.equal(f.tasks.length, 0, "Current question is not restarted");
});

test("Rejected, unconfirmed and failed herb requests grant no healing or local spending", async () => {
  for (const response of [{ ok: false, status: 409 }, { ok: false, status: 500 }, { ok: false, status: 0 }, new Error("offline")]) {
    const f = fixture();
    f.c.trackBattleReward = async () => { if (response instanceof Error) throw response; return response; };
    f.load(battleSource, ["useItem"]);
    assert.equal(await f.c.useItem(), false);
    assert.equal(f.c.state.playerHp, 65);
    assert.equal(f.c.saved.coins, 10);
    assert.equal(f.c.state.itemPending, false);
    assert.equal(f.c.ui.itemButton.disabled, false);
  }
});

test("Full HP and insufficient local Coins never issue a purchase", () => {
  for (const [hp, coins] of [[100, 10], [65, 4]]) {
    const f = fixture();
    f.c.state.playerHp = hp;
    f.c.saved.coins = coins;
    f.load(battleSource, ["useItem"]);
    f.c.useItem();
    assert.equal(f.c.rewards.length, 0);
  }
});

test("Battle reward requests are serialized so earned Coins precede purchases", async () => {
  const f = fixture(), first = deferred(), calls = [];
  f.c.saveProgressServer = payload => { calls.push(payload); return calls.length === 1 ? first.promise : Promise.resolve({ ok: true }); };
  f.load(battleSource, ["trackBattleReward"]);
  const reward = f.c.trackBattleReward("answer"), purchase = f.c.trackBattleReward("purchase");
  await Promise.resolve(); await Promise.resolve();
  assert.deepEqual(calls, ["answer"]);
  first.resolve({ ok: true });
  await Promise.all([reward, purchase]);
  assert.deepEqual(calls, ["answer", "purchase"]);
});

test("Running waits for pending purchases/saves and suppresses delayed combat callbacks", async () => {
  const f = fixture(), purchase = deferred(), save = deferred();
  f.c.pendingItemUse = purchase.promise;
  f.c.pendingBattleSave = save.promise;
  f.load(battleSource, ["returnToMapAfterBattle", "finishVictory", "enemyTurn"]);
  const leave = f.c.returnToMapAfterBattle();
  f.c.finishVictory(); f.c.enemyTurn();
  assert.equal(f.c.rewards.length, 0);
  assert.equal(f.c.state.playerHp, 65);
  purchase.resolve();
  await Promise.resolve();
  assert.equal(f.c.window.location.href, "battle.php");
  save.resolve();
  await leave;
  assert.equal(f.c.window.location.href, "/FYP/index.php");
  assert.equal(f.storage.get(f.c.ESCAPE_KEY), "slime-01");
});

test("Malformed success responses retain pending battle state", async () => {
  const f = fixture();
  f.storage.set(f.c.WORLD_PENDING_KEY, "1");
  f.c.fetch = async () => ({ ok: true, json: async () => ({ ok: false }) });
  f.load(battleSource, ["saveBattleState"]);
  assert.equal(await f.c.saveBattleState({ questStep: 1 }, 0), false);
  assert.equal(f.storage.get(f.c.WORLD_PENDING_KEY), "1");
  assert.equal(f.warnings.has("world"), true);
});

test("Failed map saves retry the pending snapshot and clear it only after confirmation", async () => {
  const f = fixture(), writes = [];
  f.c.gameSaveRequest = async snapshot => { writes.push(snapshot); if (writes.length === 1) throw new Error("offline"); };
  f.load(mapSource, ["queueGameSave", "flushGameSave"]);
  f.c.queueGameSave({ questStep: 2, currentRealmId: "forest" });
  assert.equal(await f.c.flushGameSave(), false);
  assert.equal(f.c.pendingSaveData.questStep, 2);
  assert.equal(f.storage.get(f.c.WORLD_PENDING_KEY), "1");
  assert.ok(f.tasks.some(task => task.ms === 5000 && !task.cancelled));
  assert.equal(await f.c.flushGameSave(), true);
  assert.equal(f.storage.has(f.c.WORLD_PENDING_KEY), false);
  assert.equal(f.warnings.has("world"), false);
});

test("An older failed map request cannot replace the player's newer snapshot", async () => {
  const f = fixture(), first = deferred(), writes = [];
  f.c.gameSaveRequest = snapshot => { writes.push(snapshot); return writes.length === 1 ? first.promise : Promise.resolve(); };
  f.load(mapSource, ["queueGameSave", "flushGameSave"]);
  f.c.queueGameSave({ questStep: 1 });
  const old = f.c.flushGameSave();
  await Promise.resolve(); await Promise.resolve();
  f.c.queueGameSave({ questStep: 3 });
  const newer = f.c.flushGameSave();
  first.reject(new Error("old request failed"));
  await old; await newer;
  assert.deepEqual(writes.map(w => w.questStep), [1, 3]);
  assert.equal(f.c.pendingSaveData, null);
  assert.equal(f.storage.has(f.c.WORLD_PENDING_KEY), false);
});

test("Reload restores an unconfirmed browser save instead of older online progress", async () => {
  const f = fixture(), local = { questStep: 3, currentRealmId: "camp" };
  f.storage.set(f.c.WORLD_SAVE_KEY, JSON.stringify(local));
  f.storage.set(f.c.WORLD_PENDING_KEY, "1");
  f.c.fetch = async () => ({ ok: true, json: async () => ({ ok: true, state: { questStep: 1, currentRealmId: "maple" } }) });
  f.c.gameSaveRequest = async () => {};
  f.load(mapSource, ["loadServerGame", "queueGameSave", "flushGameSave"]);
  assert.equal(await f.c.loadServerGame(), true);
  assert.deepEqual(JSON.parse(f.storage.get(f.c.WORLD_SAVE_KEY)), local);
  await f.c.saveChain;
});

test("Failed initial map reads do not enable writes that overwrite server progress", async () => {
  const f = fixture();
  f.c.fetch = async () => { throw new Error("offline"); };
  f.load(mapSource, ["loadServerGame", "queueGameSave", "flushGameSave"]);
  assert.equal(await f.c.loadServerGame(), false);
  assert.equal(f.c.dbSaveReady, false);
  f.c.queueGameSave({ questStep: 1 });
  assert.equal(f.storage.get(f.c.WORLD_PENDING_KEY), "1");
  assert.equal(f.tasks.filter(task => task.ms === 700).length, 0);
});

test("Confirmed map writes do not clear unrelated reward failure warnings", async () => {
  const f = fixture();
  f.warnings.set("rewards", "save.rewardFailed");
  f.c.gameSaveRequest = async () => {};
  f.load(mapSource, ["queueGameSave", "flushGameSave"]);
  f.c.queueGameSave({ questStep: 4 }); await f.c.flushGameSave();
  assert.equal(f.warnings.get("rewards"), "save.rewardFailed");
});
