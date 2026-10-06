const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const ui = {
  level: document.getElementById("levelText"),
  xp: document.getElementById("xpText"),
  power: document.getElementById("powerText"),
  coins: document.getElementById("coinsText"),
  questTitle: document.getElementById("questTitle"),
  questText: document.getElementById("questText"),
  location: document.getElementById("locationText"),
  dialogue: document.getElementById("dialogue"),
  dialogueName: document.getElementById("dialogueName"),
  dialogueText: document.getElementById("dialogueText"),
  dialogueButton: document.getElementById("dialogueButton"),
  battleOverlay: document.getElementById("battleOverlay"),
  battleTurnText: document.getElementById("battleTurnText"),
  battleEnemySprite: document.getElementById("battleEnemySprite"),
  battleEnemyName: document.getElementById("battleEnemyName"),
  battleEnemyHpText: document.getElementById("battleEnemyHpText"),
  battleEnemyHpBar: document.getElementById("battleEnemyHpBar"),
  battlePlayerHpText: document.getElementById("battlePlayerHpText"),
  battlePlayerHpBar: document.getElementById("battlePlayerHpBar"),
  battleQuestionType: document.getElementById("battleQuestionType"),
  battleDifficulty: document.getElementById("battleDifficulty"),
  battleTimer: document.getElementById("battleTimer"),
  battleQuestionText: document.getElementById("battleQuestionText"),
  battlePrompt: document.getElementById("battlePrompt"),
  battleAnswers: document.getElementById("battleAnswers"),
  battleMessage: document.getElementById("battleMessage")
};

const world = {
  width: 5200,
  groundY: 520,
  waterY: 650,
  player: {
    x: 650,
    y: 0,
    vx: 0,
    facing: 1,
    speed: 250,
    width: 34,
    height: 58,
    onGround: true,
    bob: 0
  },
  cameraX: 0,
  time: 0,
  questStep: 0,
  coins: 0,
  xp: 0,
  power: 0,
  level: 1,
  interacting: false,
  battle: null
};

const keys = new Set();
const touch = { left: false, right: false };
let questions = [];
let lastTime = 0;

const npcs = [
  {
    id: "elder",
    x: 1050,
    name: "Elder Rowan",
    title: "Village Elder",
    color: "#c79b6d",
    dialogue: [
      "Welcome to Maple Town, traveller.",
      "The old road beyond the forest has gone silent.",
      "If you want to help, follow the lanterns and learn the words of the road."
    ]
  },
  {
    id: "mira",
    x: 1770,
    name: "Mira",
    title: "Wandering Merchant",
    color: "#c57f62",
    dialogue: [
      "You are heading into Whispering Forest, aren't you?",
      "Remember: understanding a message can be more useful than a sharp sword.",
      "I will wait here until you return."
    ]
  },
  {
    id: "kai",
    x: 3550,
    name: "Kai",
    title: "System Keeper",
    color: "#5f9db0",
    dialogue: [
      "These ruins belonged to the old network builders.",
      "Their signs are written in technical English.",
      "Bring me the right words and I can reopen the gate."
    ]
  }
];

const landmarks = [
  { x: 380, type: "sign", text: "MAPLE TOWN →" },
  { x: 980, type: "house" },
  { x: 1450, type: "bridge" },
  { x: 2050, type: "camp" },
  { x: 2780, type: "tower" },
  { x: 3450, type: "ruins" },
  { x: 4380, type: "gate" }
];

const enemies = [
  { id: "slime-01", x: 2300, type: "slime", name: "Word Slime", difficulty: "EASY", hp: 60, damage: 10, xp: 20, coins: 10, defeated: false },
  { id: "bat-01", x: 3020, type: "bat", name: "Confusion Bat", difficulty: "EASY", hp: 70, damage: 10, xp: 25, coins: 12, defeated: false },
  { id: "guardian-01", x: 3990, type: "guardian", name: "Grammar Guardian", difficulty: "MEDIUM", hp: 100, damage: 12, xp: 30, coins: 15, defeated: false }
];

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener("resize", resize);
resize();

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (["arrowleft","arrowright","a","d"," ","e"].includes(k)) e.preventDefault();
  keys.add(k);
  if ((k === "e" || k === " ") && !e.repeat && !world.battle) interact();
});

window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

function bindHoldButton(id, prop) {
  const button = document.getElementById(id);
  const on = (e) => { e.preventDefault(); touch[prop] = true; };
  const off = (e) => { e.preventDefault(); touch[prop] = false; };
  button.addEventListener("pointerdown", on);
  button.addEventListener("pointerup", off);
  button.addEventListener("pointercancel", off);
  button.addEventListener("pointerleave", off);
}

bindHoldButton("leftButton", "left");
bindHoldButton("rightButton", "right");
document.getElementById("interactButton").addEventListener("click", interact);

ui.dialogueButton.addEventListener("click", () => {
  if (world.interacting) {
    world.interacting = false;
    ui.dialogue.classList.add("hidden");
  }
});

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function nearestNPC() {
  let best = null;
  let dist = Infinity;
  for (const npc of npcs) {
    const d = Math.abs(npc.x - world.player.x);
    if (d < dist) {
      dist = d;
      best = npc;
    }
  }
  return dist < 95 ? best : null;
}

function nearestEnemy() {
  let best = null;
  let dist = Infinity;
  for (const enemy of enemies) {
    if (enemy.defeated) continue;
    const d = Math.abs(enemy.x - world.player.x);
    if (d < dist) {
      dist = d;
      best = enemy;
    }
  }
  return dist < 72 ? best : null;
}

function interact() {
  if (world.interacting || world.battle) return;
  const npc = nearestNPC();

  if (npc) {
    world.interacting = true;
    ui.dialogueName.textContent = npc.name + " · " + npc.title;
    ui.dialogueText.textContent = npc.dialogue[world.questStep % npc.dialogue.length];
    ui.dialogue.classList.remove("hidden");

    if (npc.id === "elder" && world.questStep === 0) {
      world.questStep = 1;
      world.xp += 25;
      world.power += 1;
      updateQuest();
      syncHUD();
    }
    return;
  }

  const sign = landmarks.find(l => l.type === "sign" && Math.abs(l.x - world.player.x) < 85);
  if (sign) {
    world.interacting = true;
    ui.dialogueName.textContent = "Road Sign";
    ui.dialogueText.textContent = "The sign reads: “The forest path is quiet, but the old words still remain.”";
    ui.dialogue.classList.remove("hidden");
  }
}

function updateQuest() {
  if (world.questStep === 0) {
    ui.questTitle.textContent = "The First Words";
    ui.questText.textContent = "Find the village elder.";
  } else if (world.questStep === 1) {
    ui.questTitle.textContent = "Into Whispering Forest";
    ui.questText.textContent = "Walk east and find the old camp.";
  } else {
    ui.questTitle.textContent = "The Silent Road";
    ui.questText.textContent = "Reach the ancient gate.";
  }
}

function syncHUD() {
  ui.level.textContent = world.level;
  ui.xp.textContent = world.xp;
  ui.power.textContent = world.power;
  ui.coins.textContent = world.coins;
}

function startBattle(enemy) {
  if (world.battle || enemy.defeated) return;
  world.battle = {
    enemy,
    enemyHp: enemy.hp,
    playerHp: 100,
    playerMaxHp: 100,
    currentQuestion: null,
    usedQuestionIds: [],
    questionStartedAt: 0,
    timerId: null,
    locked: false,
    sentenceSelected: []
  };
  touch.left = false;
  touch.right = false;
  keys.delete("arrowleft");
  keys.delete("arrowright");
  keys.delete("a");
  keys.delete("d");
  ui.battleOverlay.classList.remove("hidden");
  ui.battleEnemySprite.textContent = enemy.type === "slime" ? "🟢" : enemy.type === "bat" ? "🦇" : "🛡️";
  ui.battleEnemyName.textContent = enemy.name;
  ui.battleMessage.textContent = "The " + enemy.name + " blocks your path! Answer to attack.";
  loadBattleQuestion();
}

function pickBattleQuestion() {
  const battle = world.battle;
  const enemy = battle.enemy;
  let pool = questions.filter(q => q.difficulty === enemy.difficulty);

  if (!pool.length) pool = questions.slice();

  const fresh = pool.filter(q => !battle.usedQuestionIds.includes(q.id));
  pool = fresh.length ? fresh : pool;

  const q = pool[Math.floor(Math.random() * pool.length)];
  battle.usedQuestionIds.push(q.id);
  return q;
}

function formatType(type) {
  if (type === "TRUE_FALSE") return "TRUE / FALSE";
  if (type === "ODD_WORD_OUT") return "ODD WORD OUT";
  if (type === "SENTENCE_BUILDER") return "SENTENCE BUILDER";
  return type;
}

function normalizedSentenceAnswer(question, words) {
  const result = Array.isArray(words) ? words : [];
  return result.map(v => String(v).trim()).join(" ").replace(/s+/g, " ").trim().toLowerCase();
}

function correctForQuestion(question, value) {
  if (question.type === "TRUE_FALSE") return value === Boolean(question.answer);
  if (question.type === "ODD_WORD_OUT") return String(value).toLowerCase() === String(question.answer).toLowerCase();
  if (question.type === "SENTENCE_BUILDER") {
    return String(value).toLowerCase() === normalizedSentenceAnswer(question, question.answerOrder);
  }
  return false;
}

function questionAnswerText(question) {
  if (question.type === "TRUE_FALSE") return question.answer ? "TRUE" : "FALSE";
  if (question.type === "ODD_WORD_OUT") return question.answer;
  if (question.type === "SENTENCE_BUILDER") return question.answerOrder.join(" ");
  return "";
}

function loadBattleQuestion() {
  const battle = world.battle;
  if (!battle) return;

  window.clearInterval(battle.timerId);
  battle.locked = false;
  battle.sentenceSelected = [];

  const question = pickBattleQuestion();
  battle.currentQuestion = question;
  battle.questionStartedAt = performance.now();

  ui.battleTurnText.textContent = "YOUR TURN";
  ui.battleQuestionType.textContent = formatType(question.type);
  ui.battleDifficulty.textContent = question.difficulty;
  ui.battleQuestionText.textContent = question.question;
  ui.battlePrompt.textContent = question.prompt || "Choose the correct answer to strike.";
  ui.battleAnswers.innerHTML = "";

  if (question.type === "TRUE_FALSE") {
    renderChoice("TRUE", true);
    renderChoice("FALSE", false);
  } else if (question.type === "ODD_WORD_OUT") {
    question.words.forEach(word => renderChoice(word, word));
    ui.battleAnswers.classList.remove("sentence-mode");
  } else if (question.type === "SENTENCE_BUILDER") {
    renderSentenceBuilder(question);
  }

  let remaining = Number(question.timeLimit || 5);
  ui.battleTimer.classList.remove("warning");
  ui.battleTimer.textContent = remaining.toFixed(1) + "s";
  battle.timerId = window.setInterval(() => {
    if (!world.battle || battle.locked) return;
    remaining -= 0.1;
    ui.battleTimer.textContent = Math.max(0, remaining).toFixed(1) + "s";
    if (remaining <= 2) ui.battleTimer.classList.add("warning");
    if (remaining <= 0) {
      window.clearInterval(battle.timerId);
      resolveBattleAnswer(null, null, true);
    }
  }, 100);

  updateBattleHUD();
}

function renderChoice(label, value) {
  const button = document.createElement("button");
  button.className = "battle-answer-button";
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", () => resolveBattleAnswer(value, button, false));
  ui.battleAnswers.appendChild(button);
}

function renderSentenceBuilder(question) {
  ui.battleAnswers.classList.add("sentence-mode");

  const selected = document.createElement("div");
  selected.className = "battle-sentence";

  const bank = document.createElement("div");
  bank.className = "battle-word-bank";

  question.words.forEach(word => {
    const button = document.createElement("button");
    button.className = "battle-word-chip";
    button.type = "button";
    button.textContent = word;
    button.addEventListener("click", () => {
      if (world.battle?.locked || button.classList.contains("selected")) return;
      button.classList.add("selected");
      world.battle.sentenceSelected.push(word);
      const chip = document.createElement("span");
      chip.className = "battle-word-chip";
      chip.textContent = word;
      selected.appendChild(chip);
    });
    bank.appendChild(button);
  });

  const submit = document.createElement("button");
  submit.className = "battle-submit";
  submit.type = "button";
  submit.textContent = "Build Sentence & Attack";
  submit.addEventListener("click", () => {
    const answer = normalizedSentenceAnswer(question, world.battle.sentenceSelected);
    resolveBattleAnswer(answer, submit, false);
  });

  ui.battleAnswers.append(selected, bank, submit);
}

function resolveBattleAnswer(value, clickedButton, timedOut) {
  const battle = world.battle;
  if (!battle || battle.locked) return;

  battle.locked = true;
  window.clearInterval(battle.timerId);
  ui.battleAnswers.querySelectorAll("button").forEach(button => { button.disabled = true; });

  const question = battle.currentQuestion;
  const correct = !timedOut && correctForQuestion(question, value);

  if (clickedButton) clickedButton.classList.add(correct ? "correct" : "wrong");

  if (correct) {
    const elapsed = performance.now() - battle.questionStartedAt;
    const fastBonus = elapsed <= Number(question.timeLimit || 5) * 1000 * .45;
    const baseDamage = question.difficulty === "HARD" ? 30 : question.difficulty === "MEDIUM" ? 25 : 20;
    const damage = Math.round(baseDamage * (fastBonus ? 1.1 : 1));

    battle.enemyHp = Math.max(0, battle.enemyHp - damage);
    world.xp += Number(question.xp || 10);
    world.coins += Number(question.coins || 5);
    world.power += Number(question.englishPower || 1);
    syncHUD();
    updateBattleHUD();

    ui.battleMessage.textContent = "Correct! Your English Power strikes for " + damage + " damage.";
    if (battle.enemyHp <= 0) {
      window.setTimeout(finishBattleVictory, 650);
    } else {
      window.setTimeout(enemyTurnAfterCorrect, 700);
    }
  } else {
    ui.battleMessage.textContent = timedOut
      ? "Time's up! The enemy attacks."
      : "Wrong answer. The enemy attacks.";
    window.setTimeout(enemyTurn, 700);
  }
}

function enemyTurnAfterCorrect() {
  if (!world.battle) return;
  enemyTurn();
}

function enemyTurn() {
  const battle = world.battle;
  if (!battle) return;

  const damage = battle.enemy.damage;
  battle.playerHp = Math.max(0, battle.playerHp - damage);
  ui.battleTurnText.textContent = "ENEMY ATTACK";
  ui.battleMessage.textContent = battle.enemy.name + " hits you for " + damage + " damage.";
  updateBattleHUD();

  if (battle.playerHp <= 0) {
    window.setTimeout(finishBattleDefeat, 650);
  } else {
    window.setTimeout(loadBattleQuestion, 700);
  }
}

function updateBattleHUD() {
  const battle = world.battle;
  if (!battle) return;

  ui.battleEnemyHpText.textContent = battle.enemyHp + " / " + battle.enemy.hp;
  ui.battleEnemyHpBar.style.width = Math.max(0, battle.enemyHp / battle.enemy.hp * 100) + "%";
  ui.battlePlayerHpText.textContent = battle.playerHp + " / " + battle.playerMaxHp;
  ui.battlePlayerHpBar.style.width = Math.max(0, battle.playerHp / battle.playerMaxHp * 100) + "%";
}

function finishBattleVictory() {
  const battle = world.battle;
  if (!battle) return;

  window.clearInterval(battle.timerId);
  battle.enemy.defeated = true;
  world.battle = null;
  ui.battleOverlay.classList.add("hidden");
  world.xp += battle.enemy.xp;
  world.coins += battle.enemy.coins;
  world.power += 2;
  syncHUD();

  if (battle.enemy.id === "slime-01") {
    world.questStep = Math.max(world.questStep, 2);
    updateQuest();
  }

  ui.dialogueName.textContent = "Victory";
  ui.dialogueText.textContent = battle.enemy.name + " defeated! The road ahead is safe.";
  ui.dialogue.classList.remove("hidden");
  world.interacting = true;
}

function finishBattleDefeat() {
  const battle = world.battle;
  if (!battle) return;
  window.clearInterval(battle.timerId);
  world.battle = null;
  ui.battleOverlay.classList.add("hidden");
  ui.dialogueName.textContent = "Defeated";
  ui.dialogueText.textContent = "You were knocked down, but your learning progress is safe. Try the encounter again.";
  ui.dialogue.classList.remove("hidden");
  world.interacting = true;
}

function update(dt) {
  world.time += dt;

  if (!world.battle && !world.interacting) {
    const left = keys.has("arrowleft") || keys.has("a") || touch.left;
    const right = keys.has("arrowright") || keys.has("d") || touch.right;
    const direction = (right ? 1 : 0) - (left ? 1 : 0);

    world.player.vx = direction * world.player.speed;
    if (direction !== 0) world.player.facing = direction;

    world.player.x += world.player.vx * dt;
    world.player.x = clamp(world.player.x, 100, world.width - 120);
    world.player.bob += dt * (Math.abs(world.player.vx) > 1 ? 11 : 3);

    const encounter = nearestEnemy();
    if (encounter) {
      startBattle(encounter);
    }
  }

  const targetCamera = clamp(world.player.x - window.innerWidth * 0.5, 0, world.width - window.innerWidth);
  world.cameraX += (targetCamera - world.cameraX) * Math.min(1, dt * 6);

  if (!world.battle && world.player.x > 1000 && world.questStep === 1) {
    world.questStep = 2;
    world.xp += 50;
    world.power += 2;
    world.coins += 10;
    updateQuest();
    syncHUD();
  }

  ui.location.textContent =
    world.player.x < 1250 ? "MAPLE TOWN" :
    world.player.x < 2300 ? "WHISPERING FOREST" :
    world.player.x < 3400 ? "OLD CAMP ROAD" :
    "ANCIENT RUINS";
}

function draw() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  ctx.clearRect(0, 0, w, h);

  drawSky(w, h);
  drawFarMountains(w, h);
  drawForestLayer(w, h, 0.16, "#193b34", 155, 300);
  drawForestLayer(w, h, 0.30, "#23483a", 200, 340);
  drawGround(w, h);
  drawLandmarks();
  drawNPCs();
  drawEnemies();
  drawPlayer();
  drawForeground(w, h);
}

function worldToScreen(x, parallax = 1) {
  return x - world.cameraX * parallax;
}

function drawSky(w, h) {
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, "#163d4d");
  gradient.addColorStop(.55, "#6d9aa0");
  gradient.addColorStop(1, "#c7c6a6");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "rgba(255,255,220,.7)";
  for (let i = 0; i < 70; i++) {
    const x = (i * 197) % w;
    const y = 15 + ((i * 83) % 180);
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.fillStyle = "rgba(255,245,207,.25)";
  ctx.beginPath();
  ctx.arc(w - 110, 105, 48, 0, Math.PI * 2);
  ctx.fill();
}

function drawFarMountains(w, h) {
  ctx.fillStyle = "#52666a";
  ctx.beginPath();
  ctx.moveTo(0, 370);
  for (let x = 0; x <= w; x += 110) {
    const y = 310 + Math.sin(x * .013) * 42;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, 540);
  ctx.lineTo(0, 540);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(225,230,220,.45)";
  ctx.beginPath();
  ctx.moveTo(0, 310);
  for (let x = 0; x <= w; x += 140) {
    ctx.lineTo(x, 280 + Math.sin(x * .015) * 35);
  }
  ctx.lineTo(w, 360);
  ctx.lineTo(0, 360);
  ctx.closePath();
  ctx.fill();
}

function drawForestLayer(w, h, parallax, color, minSize, maxSize) {
  const start = Math.floor((world.cameraX * parallax) / 170) - 3;
  const end = start + Math.ceil(w / 170) + 7;
  for (let i = start; i < end; i++) {
    const xWorld = i * 170 + 70;
    const x = worldToScreen(xWorld, parallax);
    const size = minSize + Math.abs(i * 37 % (maxSize - minSize));
    const y = world.groundY - size * .58;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size * .28, 0, Math.PI * 2);
    ctx.arc(x - size * .18, y + size * .06, size * .24, 0, Math.PI * 2);
    ctx.arc(x + size * .2, y + size * .02, size * .25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3f4a35";
    ctx.fillRect(x - 6, y + size * .12, 12, size * .48);
  }
}

function drawGround(w, h) {
  ctx.fillStyle = "#263a2d";
  ctx.fillRect(0, world.groundY, w, h - world.groundY);
  ctx.fillStyle = "#66784b";
  ctx.fillRect(0, world.groundY - 8, w, 8);
  const tile = 80;
  const start = Math.floor(world.cameraX / tile) - 1;
  const end = start + Math.ceil(w / tile) + 2;
  for (let i = start; i < end; i++) {
    const x = i * tile - world.cameraX;
    ctx.fillStyle = i % 2 === 0 ? "#34462f" : "#30412c";
    ctx.fillRect(x, world.groundY + 22, tile - 2, 55);
    ctx.fillStyle = "#536442";
    ctx.fillRect(x + 10, world.groundY + 17, 22, 5);
  }
}

function drawLandmarks() {
  for (const l of landmarks) {
    const x = worldToScreen(l.x);
    if (x < -220 || x > window.innerWidth + 220) continue;
    if (l.type === "house") drawHouse(x, world.groundY);
    if (l.type === "bridge") drawBridge(x, world.groundY);
    if (l.type === "camp") drawCamp(x, world.groundY);
    if (l.type === "tower") drawTower(x, world.groundY);
    if (l.type === "ruins") drawRuins(x, world.groundY);
    if (l.type === "gate") drawGate(x, world.groundY);
    if (l.type === "sign") drawSign(x, world.groundY, l.text);
  }
}

function drawHouse(x, ground) {
  ctx.fillStyle = "#a76b4f";
  ctx.fillRect(x - 80, ground - 105, 160, 105);
  ctx.fillStyle = "#70443d";
  ctx.beginPath();
  ctx.moveTo(x - 105, ground - 105);
  ctx.lineTo(x, ground - 180);
  ctx.lineTo(x + 105, ground - 105);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#4d3329";
  ctx.fillRect(x - 18, ground - 55, 36, 55);
  ctx.fillStyle = "#d9c889";
  ctx.fillRect(x - 62, ground - 76, 34, 30);
  ctx.fillRect(x + 28, ground - 76, 34, 30);
}

function drawBridge(x, ground) {
  ctx.fillStyle = "#694936";
  for (let i = -100; i <= 100; i += 28) ctx.fillRect(x + i, ground - 18, 22, 80);
  ctx.fillStyle = "#a6784d";
  ctx.fillRect(x - 115, ground - 25, 230, 14);
}

function drawCamp(x, ground) {
  ctx.fillStyle = "#72543d";
  ctx.fillRect(x - 55, ground - 70, 110, 8);
  ctx.fillStyle = "#c59b67";
  ctx.beginPath();
  ctx.moveTo(x - 65, ground - 62);
  ctx.lineTo(x, ground - 132);
  ctx.lineTo(x + 65, ground - 62);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f4a84e";
  ctx.beginPath();
  ctx.arc(x + 95, ground - 18, 14 + Math.sin(world.time * 7) * 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawTower(x, ground) {
  ctx.fillStyle = "#70746e";
  ctx.fillRect(x - 45, ground - 160, 90, 160);
  ctx.fillStyle = "#3f4a48";
  ctx.fillRect(x - 55, ground - 178, 110, 20);
  ctx.fillStyle = "#a5b0a0";
  ctx.fillRect(x - 16, ground - 132, 32, 34);
}

function drawRuins(x, ground) {
  ctx.strokeStyle = "#73766b";
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(x - 90, ground);
  ctx.lineTo(x - 90, ground - 140);
  ctx.lineTo(x, ground - 190);
  ctx.lineTo(x + 90, ground - 140);
  ctx.lineTo(x + 90, ground);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.fillStyle = "#b9b4a0";
  ctx.fillRect(x - 16, ground - 75, 32, 75);
}

function drawGate(x, ground) {
  ctx.fillStyle = "#4b5452";
  ctx.fillRect(x - 115, ground - 145, 35, 145);
  ctx.fillRect(x + 80, ground - 145, 35, 145);
  ctx.fillRect(x - 115, ground - 155, 230, 20);
  ctx.fillStyle = world.questStep >= 2 ? "#82bd7e" : "#9c4d4d";
  ctx.fillRect(x - 68, ground - 125, 136, 125);
}

function drawSign(x, ground, text) {
  ctx.fillStyle = "#5d4532";
  ctx.fillRect(x - 5, ground - 85, 10, 85);
  ctx.fillStyle = "#c99d62";
  ctx.fillRect(x - 70, ground - 115, 140, 42);
  ctx.fillStyle = "#26362d";
  ctx.font = "bold 12px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(text, x, ground - 89);
}

function drawNPCs() {
  for (const npc of npcs) {
    const x = worldToScreen(npc.x);
    if (x < -100 || x > window.innerWidth + 100) continue;
    const bob = Math.sin(world.time * 3 + npc.x) * 2;
    drawCharacter(x, world.groundY + bob, npc.color, "#d8c7a4", false);
    if (Math.abs(npc.x - world.player.x) < 105) {
      ctx.fillStyle = "#f3c75f";
      ctx.font = "bold 12px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("E", x, world.groundY - 84);
    }
  }
}

function drawEnemies() {
  for (const enemy of enemies) {
    if (enemy.defeated) continue;
    const x = worldToScreen(enemy.x);
    if (x < -100 || x > window.innerWidth + 100) continue;
    if (enemy.type === "slime") {
      ctx.fillStyle = "#76b86b";
      ctx.beginPath();
      ctx.arc(x, world.groundY - 28, 28, Math.PI, 0);
      ctx.lineTo(x + 28, world.groundY - 2);
      ctx.lineTo(x - 28, world.groundY - 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#18241e";
      ctx.fillRect(x - 11, world.groundY - 34, 5, 8);
      ctx.fillRect(x + 6, world.groundY - 34, 5, 8);
    } else if (enemy.type === "bat") {
      ctx.fillStyle = "#594f76";
      ctx.beginPath();
      ctx.moveTo(x, world.groundY - 75);
      ctx.lineTo(x - 45, world.groundY - 48);
      ctx.lineTo(x - 25, world.groundY - 15);
      ctx.lineTo(x, world.groundY - 38);
      ctx.lineTo(x + 25, world.groundY - 15);
      ctx.lineTo(x + 45, world.groundY - 48);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = "#8a7660";
      ctx.fillRect(x - 25, world.groundY - 90, 50, 90);
      ctx.fillStyle = "#b5a18a";
      ctx.fillRect(x - 18, world.groundY - 75, 36, 26);
    }

    if (Math.abs(enemy.x - world.player.x) < 80) {
      ctx.fillStyle = "#ffce68";
      ctx.font = "bold 11px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("!", x, world.groundY - 103);
    }
  }
}

function drawCharacter(x, ground, coat, skin, player) {
  const bob = player ? Math.sin(world.player.bob) * 2 : 0;
  const y = ground + bob;

  ctx.fillStyle = "rgba(0,0,0,.25)";
  ctx.beginPath();
  ctx.ellipse(x, ground + 4, 25, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = coat;
  ctx.fillRect(x - 15, y - 55, 30, 43);
  ctx.fillStyle = skin;
  ctx.fillRect(x - 13, y - 78, 26, 25);
  ctx.fillStyle = player ? "#4b3625" : "#3b3028";
  ctx.fillRect(x - 17, y - 86, 34, 10);
  ctx.fillStyle = "#242c31";
  ctx.fillRect(x - 11, y - 14, 9, 14);
  ctx.fillRect(x + 2, y - 14, 9, 14);

  if (player) {
    ctx.fillStyle = "#e7c968";
    const swordX = x + world.player.facing * 25;
    ctx.fillRect(swordX - 3, y - 43, 6, 35);
    ctx.fillStyle = "#c9d4d2";
    ctx.fillRect(swordX - 2, y - 63, 4, 20);
  }
}

function drawPlayer() {
  const x = worldToScreen(world.player.x);
  drawCharacter(x, world.groundY, "#3f7181", "#d8b08b", true);
}

function drawForeground(w, h) {
  const waterTop = world.waterY;
  ctx.fillStyle = "#1e4c59";
  ctx.fillRect(0, waterTop, w, h - waterTop);
  ctx.fillStyle = "rgba(167, 205, 196, .24)";
  for (let i = 0; i < 32; i++) {
    const x = ((i * 173 - world.cameraX * .65) % (w + 120)) - 60;
    const y = waterTop + 25 + ((i * 47) % Math.max(40, h - waterTop - 40));
    ctx.fillRect(x, y, 50 + (i % 3) * 18, 2);
  }
  ctx.fillStyle = "rgba(0,0,0,.12)";
  ctx.fillRect(0, waterTop - 3, w, 7);
}

async function loadQuestions() {
  try {
    const response = await fetch("/FYP/data/questions.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Question data unavailable");
    questions = await response.json();
  } catch (error) {
    questions = [
      { id: "fallback-1", type: "TRUE_FALSE", difficulty: "EASY", question: "\"Assist\" means \"help\".", answer: true, explanation: "Assist means help.", timeLimit: 5, xp: 10, coins: 5, englishPower: 1 },
      { id: "fallback-2", type: "TRUE_FALSE", difficulty: "EASY", question: "\"Fast\" means \"slow\".", answer: false, explanation: "Fast and slow are opposites.", timeLimit: 5, xp: 10, coins: 5, englishPower: 1 }
    ];
  }
}

function loop(now) {
  if (!lastTime) lastTime = now;
  const dt = Math.min(.033, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

updateQuest();
syncHUD();
loadQuestions().then(() => requestAnimationFrame(loop));
