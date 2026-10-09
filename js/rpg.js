import { t, getLanguage, onLanguageChange } from "./i18n.js";

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
  destinationScreen: document.getElementById("destinationScreen"),
  destinationScene: document.getElementById("destinationScene"),
  destinationCategory: document.getElementById("destinationCategory"),
  destinationTitle: document.getElementById("destinationTitle"),
  destinationDescription: document.getElementById("destinationDescription"),
  destinationCount: document.getElementById("destinationCount")
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
    bob: 0,
    walkFrame: 0,
    walkTimer: 0
  },
  cameraX: 0,
  time: 0,
  questStep: 0,
  coins: 0,
  xp: 0,
  power: 0,
  level: 1,
  interacting: false,
  travelMenu: false,
  selectedDestinationIndex: 0,
  portalX: 4870,
  currentDialogueNpcId: null,
  currentDialogueIndex: 0,
  battle: null
};

const WORLD_SAVE_KEY = "englishPowerQuest.world.v2";
const BATTLE_KEY = "englishPowerQuest.battle";
const ESCAPE_KEY = "englishPowerQuest.escape.v1";

function saveWorldState(overrides = {}) {
  localStorage.setItem(WORLD_SAVE_KEY, JSON.stringify({
    playerX: world.player.x,
    portalX: world.portalX,
    questStep: world.questStep,
    coins: world.coins,
    xp: world.xp,
    power: world.power,
    level: world.level,
    defeatedEnemyIds: enemies.filter(enemy => enemy.defeated).map(enemy => enemy.id),
    ...overrides
  }));
}

function loadWorldState() {
  try {
    const saved = JSON.parse(localStorage.getItem(WORLD_SAVE_KEY) || "null");
    if (!saved) return;
    world.player.x = clamp(Number(saved.playerX) || world.player.x, 100, world.width - 120);
    world.portalX = clamp(Number(saved.portalX) || world.portalX, 160, world.width - 160);
    world.questStep = Number(saved.questStep) || 0;
    world.coins = Number(saved.coins) || 0;
    world.xp = Number(saved.xp) || 0;
    world.power = Number(saved.power) || 0;
    world.level = Number(saved.level) || 1;
    const defeated = new Set(Array.isArray(saved.defeatedEnemyIds) ? saved.defeatedEnemyIds : []);
    enemies.forEach(enemy => { enemy.defeated = defeated.has(enemy.id); });
  } catch (error) {
    console.warn("Unable to restore map progress.");
  }
}

const keys = new Set();
const touch = { left: false, right: false };
let questions = [];
let lastTime = 0;

const playerSprite = new Image();
let playerSpriteReady = false;

const playerWalkFrames = {
  right: Array.from({ length: 6 }, () => new Image()),
  left: Array.from({ length: 6 }, () => new Image())
};

let playerWalkReadyCount = 0;
const PLAYER_WALK_FRAME_COUNT = 6;

playerSprite.src = "/FYP/assets/player/dark-adventurer-exact.png";
playerSprite.onload = () => { playerSpriteReady = true; };

for (const direction of ["right", "left"]) {
  playerWalkFrames[direction].forEach((img, index) => {
    img.src = "/FYP/assets/player/player_walk_" + direction + "_" + (index + 1) + ".png";
    img.onload = () => { playerWalkReadyCount += 1; };
  });
}

function hasWalkFrame(direction, index) {
  const frame = playerWalkFrames[direction][index];
  return Boolean(frame && frame.complete && frame.naturalWidth > 0);
}

const npcs = [
  {
    id: "elder",
    x: 1050,
    name: "Elder Rowan",
    title: "Village Elder",
    titleKey: "npc.elder.title",
    nameKey: "npc.elder.name",
    dialogueKeys: ["npc.elder.1", "npc.elder.2", "npc.elder.3"],
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
    titleKey: "npc.mira.title",
    nameKey: "npc.mira.name",
    dialogueKeys: ["npc.mira.1", "npc.mira.2", "npc.mira.3"],
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
    titleKey: "npc.kai.title",
    nameKey: "npc.kai.name",
    dialogueKeys: ["npc.kai.1", "npc.kai.2", "npc.kai.3"],
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

const destinations = [
  {
    id: "maple",
    name: "Maple Town",
    nameKey: "destination.maple.name",
    category: "SAFE HAVEN",
    categoryKey: "destination.safe",
    description: "A peaceful village where your adventure and first words begin.",
    descriptionKey: "destination.maple.description",
    scene: "maple",
    spawnX: 650
  },
  {
    id: "forest",
    name: "Whispering Forest",
    nameKey: "destination.forest.name",
    category: "VOCABULARY TRAIL",
    categoryKey: "destination.vocab",
    description: "Follow the lantern-lit path and uncover the language hidden in the woods.",
    descriptionKey: "destination.forest.description",
    scene: "forest",
    spawnX: 1400
  },
  {
    id: "camp",
    name: "Old Camp Road",
    nameKey: "destination.camp.name",
    category: "SURVIVAL ROUTE",
    categoryKey: "destination.survival",
    description: "Rest by the old camp before travelling deeper into the forgotten road.",
    descriptionKey: "destination.camp.description",
    scene: "camp",
    spawnX: 2650
  },
  {
    id: "ruins",
    name: "Ancient Ruins",
    nameKey: "destination.ruins.name",
    category: "ANCIENT CHALLENGE",
    categoryKey: "destination.challenge",
    description: "Explore the silent stone ruins and the secrets of the old network builders.",
    descriptionKey: "destination.ruins.description",
    scene: "ruins",
    spawnX: 3680
  }
];

const enemies = [
  { id: "slime-01", x: 2300, type: "slime", name: "Word Slime", difficulty: "EASY", hp: 60, damage: 10, xp: 20, coins: 10, defeated: false },
  { id: "bat-01", x: 3020, type: "bat", name: "Confusion Bat", difficulty: "EASY", hp: 70, damage: 10, xp: 25, coins: 12, defeated: false },
  { id: "guardian-01", x: 3990, type: "guardian", name: "Grammar Guardian", difficulty: "MEDIUM", hp: 100, damage: 12, xp: 30, coins: 15, defeated: false }
];

function restoreEscapeState() {
  try {
    const activeBattle = JSON.parse(sessionStorage.getItem(BATTLE_KEY) || "null");
    if (activeBattle?.enemyId && !sessionStorage.getItem(ESCAPE_KEY)) {
      sessionStorage.setItem(ESCAPE_KEY, activeBattle.enemyId);
      sessionStorage.removeItem(BATTLE_KEY);
    }
  } catch {
    sessionStorage.removeItem(BATTLE_KEY);
  }
}

function getEscapedEnemyId() {
  return sessionStorage.getItem(ESCAPE_KEY);
}

function clearEscapeWhenFarEnough() {
  const escapedId = getEscapedEnemyId();
  if (!escapedId) return;
  const enemy = enemies.find(item => item.id === escapedId);
  if (!enemy || Math.abs(enemy.x - world.player.x) >= 180) {
    sessionStorage.removeItem(ESCAPE_KEY);
  }
}

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

  if (world.travelMenu) {
    if (["arrowleft", "a"].includes(k)) {
      e.preventDefault();
      if (!e.repeat) selectDestination(-1);
      return;
    }
    if (["arrowright", "d"].includes(k)) {
      e.preventDefault();
      if (!e.repeat) selectDestination(1);
      return;
    }
    if (k === "enter" || k === " ") {
      e.preventDefault();
      if (!e.repeat) travelToSelectedDestination();
      return;
    }
    if (k === "escape") {
      e.preventDefault();
      if (!e.repeat) closeDestinationMenu();
      return;
    }
    return;
  }

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

document.getElementById("destinationPrev").addEventListener("click", () => selectDestination(-1));
document.getElementById("destinationNext").addEventListener("click", () => selectDestination(1));
document.getElementById("destinationBack").addEventListener("click", closeDestinationMenu);
document.getElementById("destinationTravel").addEventListener("click", travelToSelectedDestination);
document.querySelectorAll("[data-destination-index]").forEach((button) => {
  button.addEventListener("click", () => {
    world.selectedDestinationIndex = Number(button.dataset.destinationIndex) || 0;
    renderDestinationSelection();
  });
});

ui.dialogueButton.addEventListener("click", () => {
  if (world.interacting) {
    world.interacting = false;
    world.currentDialogueNpcId = null;
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
  const escapedId = getEscapedEnemyId();

  for (const enemy of enemies) {
    if (enemy.defeated) continue;

    // After RUN or browser-back from battle, give the player enough space
    // to move away before the same encounter can trigger again.
    if (enemy.id === escapedId) {
      const escapeDistance = Math.abs(enemy.x - world.player.x);
      if (escapeDistance < 180) continue;
    }

    const d = Math.abs(enemy.x - world.player.x);
    if (d < dist) {
      dist = d;
      best = enemy;
    }
  }

  if (escapedId) clearEscapeWhenFarEnough();
  return dist < 72 ? best : null;
}

function settingsIsOpen() {
  return !document.getElementById("settingsScreen")?.classList.contains("hidden");
}

function interact() {
  if (world.interacting || world.battle || world.travelMenu || settingsIsOpen()) return;

  // Check the portal first so it remains usable even beside an NPC.
  if (Math.abs(world.portalX - world.player.x) < 112) {
    openDestinationMenu();
    return;
  }

  const npc = nearestNPC();

  if (npc) {
    world.interacting = true;
    world.currentDialogueNpcId = npc.id;
    world.currentDialogueIndex = world.questStep % npc.dialogueKeys.length;
    ui.dialogueName.textContent = t(npc.nameKey) + " · " + t(npc.titleKey);
    ui.dialogueText.textContent = t(npc.dialogueKeys[world.currentDialogueIndex]);
    ui.dialogue.classList.remove("hidden");

    if (npc.id === "elder" && world.questStep === 0) {
      world.questStep = 1;
      world.xp += 25;
      world.power += 1;
      updateQuest();
      syncHUD();
      saveWorldState();
      void saveServerProgress({
        xpDelta: 25,
        coinDelta: 0,
        englishPowerDelta: 1,
        englishSkillCode: "VOCABULARY",
        sourceType: "QUEST",
        sourceId: null,
        description: "Completed quest: The First Words"
      });
    }
    return;
  }

  const sign = landmarks.find(l => l.type === "sign" && Math.abs(l.x - world.player.x) < 85);
  if (sign) {
    world.interacting = true;
    world.currentDialogueNpcId = "sign";
    ui.dialogueName.textContent = t("npc.sign.name");
    ui.dialogueText.textContent = t("npc.sign.text");
    ui.dialogue.classList.remove("hidden");
  }
}

function renderDestinationSelection() {
  const destination = destinations[world.selectedDestinationIndex] || destinations[0];
  ui.destinationCategory.textContent = t(destination.categoryKey);
  ui.destinationTitle.textContent = t(destination.nameKey);
  ui.destinationDescription.textContent = t(destination.descriptionKey);
  ui.destinationCount.textContent =
    String(world.selectedDestinationIndex + 1).padStart(2, "0") +
    " / " + String(destinations.length).padStart(2, "0");
  ui.destinationScene.dataset.scene = destination.scene;
  ui.destinationScene.setAttribute("aria-label", t(destination.nameKey) + (getLanguage() === "zh" ? "场景" : " landscape"));

  document.querySelectorAll("[data-destination-index]").forEach((button) => {
    const active = Number(button.dataset.destinationIndex) === world.selectedDestinationIndex;
    button.classList.toggle("active", active);
    if (active) {
      button.setAttribute("aria-current", "true");
    } else {
      button.removeAttribute("aria-current");
    }
  });
}

function selectDestination(direction) {
  if (!world.travelMenu) return;
  world.selectedDestinationIndex =
    (world.selectedDestinationIndex + direction + destinations.length) % destinations.length;
  renderDestinationSelection();
}

function openDestinationMenu() {
  world.travelMenu = true;
  world.player.vx = 0;
  keys.clear();
  touch.left = false;
  touch.right = false;
  renderDestinationSelection();
  ui.destinationScreen.classList.remove("hidden");
}

function closeDestinationMenu() {
  world.travelMenu = false;
  ui.destinationScreen.classList.add("hidden");
  keys.clear();
}

function travelToSelectedDestination() {
  const destination = destinations[world.selectedDestinationIndex] || destinations[0];

  world.player.x = destination.spawnX;
  world.player.vx = 0;
  world.player.facing = 1;
  world.player.walkFrame = 0;
  world.player.walkTimer = 0;

  // Keep a usable return gate near the arrival point in each destination.
  world.portalX = Math.min(world.width - 180, destination.spawnX + 145);
  world.cameraX = clamp(
    world.player.x - window.innerWidth * 0.5,
    0,
    Math.max(0, world.width - window.innerWidth)
  );

  world.travelMenu = false;
  ui.destinationScreen.classList.add("hidden");
  saveWorldState({ playerX: world.player.x, portalX: world.portalX });
}

function updateQuest() {
  if (world.questStep === 0) {
    ui.questTitle.textContent = t("quest.first.title");
    ui.questText.textContent = t("quest.first.text");
  } else if (world.questStep === 1) {
    ui.questTitle.textContent = t("quest.forest.title");
    ui.questText.textContent = t("quest.forest.text");
  } else {
    ui.questTitle.textContent = t("quest.road.title");
    ui.questText.textContent = t("quest.road.text");
  }
}

function updateLocation() {
  ui.location.textContent =
    world.player.x < 1250 ? t("location.maple") :
    world.player.x < 2300 ? t("location.forest") :
    world.player.x < 3400 ? t("location.camp") :
    t("location.ruins");
}

function refreshWorldLanguage() {
  updateQuest();
  updateLocation();
  if (world.currentDialogueNpcId) {
    if (world.currentDialogueNpcId === "sign") {
      ui.dialogueName.textContent = t("npc.sign.name");
      ui.dialogueText.textContent = t("npc.sign.text");
    } else {
      const npc = npcs.find(item => item.id === world.currentDialogueNpcId);
      if (npc) {
        ui.dialogueName.textContent = t(npc.nameKey) + " · " + t(npc.titleKey);
        ui.dialogueText.textContent = t(npc.dialogueKeys[world.currentDialogueIndex]);
      }
    }
  }
  if (world.travelMenu) renderDestinationSelection();
}

onLanguageChange(refreshWorldLanguage);

function syncHUD() {
  ui.level.textContent = world.level;
  ui.xp.textContent = world.xp;
  ui.power.textContent = world.power;
  ui.coins.textContent = world.coins;
}

async function saveServerProgress(payload) {
  try {
    const response = await fetch("/FYP/api/save_progress.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      console.warn("Server did not save map reward:", data?.error || response.statusText);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("Map reward will remain local until the PHP API is available.", error);
    return false;
  }
}

async function loadServerPlayer() {
  try {
    const response = await fetch("/FYP/api/player.php", { cache: "no-store" });
    if (!response.ok) return false;
    const data = await response.json();
    if (!data?.ok || !data.player) return false;

    // Once the DB API is available, use its progression balances as the
    // authoritative values instead of allowing localStorage to drift.
    world.level = Number(data.player.level || 1);
    world.xp = Number(data.player.xp || 0);
    world.coins = Number(data.player.coins || 0);
    world.power = Number(data.player.englishPowerTotal || 0);
    syncHUD();
    saveWorldState({
      level: world.level,
      xp: world.xp,
      coins: world.coins,
      power: world.power
    });
    return true;
  } catch (error) {
    console.warn("Player API unavailable; continuing with local save.", error);
    return false;
  }
}

function startBattle(enemy) {
  if (!enemy || enemy.defeated) return;

  // Save a safe spawn point before leaving the map so refreshing the map
  // cannot immediately retrigger the same encounter.
  const safeX = Math.max(100, enemy.x - 220);
  saveWorldState({ playerX: safeX });

  sessionStorage.setItem(BATTLE_KEY, JSON.stringify({ enemyId: enemy.id }));
  sessionStorage.removeItem(ESCAPE_KEY);
  window.location.href = "/FYP/battle.php";
}

function update(dt) {
  world.time += dt;

  if (!world.interacting && !world.travelMenu && !settingsIsOpen()) {
    const left = keys.has("arrowleft") || keys.has("a") || touch.left;
    const right = keys.has("arrowright") || keys.has("d") || touch.right;
    const direction = (right ? 1 : 0) - (left ? 1 : 0);

    world.player.vx = direction * world.player.speed;
    if (direction !== 0) world.player.facing = direction;

    world.player.x += world.player.vx * dt;
    world.player.x = clamp(world.player.x, 100, world.width - 120);

    if (Math.abs(world.player.vx) > 1) {
      world.player.walkTimer += dt;
      const frameDuration = 0.13;
      while (world.player.walkTimer >= frameDuration) {
        world.player.walkTimer -= frameDuration;
        world.player.walkFrame = (world.player.walkFrame + 1) % PLAYER_WALK_FRAME_COUNT;
      }
    } else {
      world.player.walkTimer = 0;
      world.player.walkFrame = 0;
    }

    const encounter = nearestEnemy();
    if (encounter) {
      startBattle(encounter);
    }
  }

  const targetCamera = clamp(world.player.x - window.innerWidth * 0.5, 0, world.width - window.innerWidth);
  world.cameraX += (targetCamera - world.cameraX) * Math.min(1, dt * 6);

  if (world.player.x > 1000 && world.questStep === 1) {
    world.questStep = 2;
    world.xp += 50;
    world.power += 2;
    world.coins += 10;
    updateQuest();
    syncHUD();
    saveWorldState();
    void saveServerProgress({
      xpDelta: 50,
      coinDelta: 10,
      englishPowerDelta: 2,
      englishSkillCode: "IT_ENGLISH",
      sourceType: "QUEST",
      sourceId: null,
      description: "Completed quest: Into Whispering Forest"
    });
  }

  updateLocation();
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
  drawPortal();
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

function drawPortal() {
  const x = worldToScreen(world.portalX);
  const ground = world.groundY;
  if (x < -150 || x > window.innerWidth + 150) return;

  const nearby = Math.abs(world.portalX - world.player.x) < 145;
  const pulse = 1 + Math.sin(world.time * 3.4) * 0.06;

  ctx.save();

  const glow = ctx.createRadialGradient(x, ground - 92, 4, x, ground - 92, 116 * pulse);
  glow.addColorStop(0, "rgba(104, 238, 218, 0.46)");
  glow.addColorStop(0.42, "rgba(65, 177, 181, 0.20)");
  glow.addColorStop(1, "rgba(35, 105, 124, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(x - 125, ground - 225, 250, 245);

  // Stone frame, assembled from chunky blocks to match the pixel-art map.
  ctx.fillStyle = "#293b42";
  ctx.fillRect(x - 67, ground - 145, 22, 145);
  ctx.fillRect(x + 45, ground - 145, 22, 145);
  ctx.fillRect(x - 61, ground - 162, 26, 18);
  ctx.fillRect(x + 35, ground - 162, 26, 18);
  ctx.fillRect(x - 46, ground - 178, 25, 18);
  ctx.fillRect(x + 21, ground - 178, 25, 18);
  ctx.fillRect(x - 25, ground - 190, 50, 16);

  ctx.fillStyle = "#829398";
  ctx.fillRect(x - 63, ground - 141, 5, 136);
  ctx.fillRect(x + 58, ground - 141, 5, 136);
  ctx.fillRect(x - 55, ground - 158, 11, 4);
  ctx.fillRect(x + 44, ground - 158, 11, 4);
  ctx.fillRect(x - 39, ground - 174, 10, 4);
  ctx.fillRect(x + 29, ground - 174, 10, 4);
  ctx.fillRect(x - 17, ground - 186, 34, 4);

  // The portal itself breathes with animated teal and blue light.
  ctx.beginPath();
  ctx.moveTo(x - 39, ground);
  ctx.lineTo(x - 39, ground - 111);
  ctx.quadraticCurveTo(x - 39, ground - 153, x, ground - 153);
  ctx.quadraticCurveTo(x + 39, ground - 153, x + 39, ground - 111);
  ctx.lineTo(x + 39, ground);
  ctx.closePath();
  ctx.fillStyle = "#071319";
  ctx.fill();

  const portalLight = ctx.createLinearGradient(x - 34, ground - 130, x + 35, ground - 8);
  portalLight.addColorStop(0, "rgba(96, 255, 223, 0.92)");
  portalLight.addColorStop(0.48, "rgba(37, 152, 179, 0.76)");
  portalLight.addColorStop(1, "rgba(27, 70, 112, 0.92)");
  ctx.fillStyle = portalLight;
  ctx.fill();

  ctx.globalAlpha = 0.55 + Math.sin(world.time * 5) * 0.12;
  ctx.fillStyle = "#c1fff0";
  for (let i = 0; i < 8; i++) {
    const particleY = ground - 20 - ((world.time * 42 + i * 23) % 116);
    const particleX = x + Math.sin(world.time * 2.7 + i * 2.1) * (12 + (i % 3) * 6);
    ctx.fillRect(Math.round(particleX), Math.round(particleY), 3 + (i % 2), 5);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#111e24";
  ctx.fillRect(x - 77, ground - 7, 154, 10);
  ctx.fillStyle = "#c5a76a";
  ctx.fillRect(x - 68, ground - 5, 136, 4);

  ctx.textAlign = "center";
  ctx.font = "bold 13px 'Courier New', monospace";
  ctx.fillStyle = "#091317";
  ctx.fillText(t("portal.name"), x + 2, ground - 215 + 2);
  ctx.fillStyle = "#f4dc91";
  ctx.fillText(t("portal.name"), x, ground - 215);

  if (nearby) {
    ctx.fillStyle = "rgba(7, 16, 20, 0.9)";
    ctx.fillRect(x - 91, ground - 248, 182, 22);
    ctx.strokeStyle = "#cfb16d";
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 91, ground - 248, 182, 22);
    ctx.font = getLanguage() === "zh" ? "bold 11px sans-serif" : "bold 10px 'Courier New', monospace";
    ctx.fillStyle = "#fff3c6";
    ctx.fillText(t("portal.interact"), x, ground - 233);
  }

  ctx.restore();
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
  ctx.fillText(getLanguage() === "zh" ? "枫叶镇 →" : text, x, ground - 89);
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
  const y = ground;

  ctx.fillStyle = "rgba(0,0,0,.25)";
  ctx.beginPath();
  ctx.ellipse(x, ground + 4, player ? 30 : 25, player ? 8 : 7, 0, 0, Math.PI * 2);
  ctx.fill();

  if (player) {
    const direction = world.player.facing > 0 ? "right" : "left";
    const frameIndex = world.player.walkFrame;
    const moving = Math.abs(world.player.vx) > 1;
    const frame = playerWalkFrames[direction][frameIndex];

    if (moving && hasWalkFrame(direction, frameIndex)) {
      const drawW = 96;
      const drawH = 144;

      ctx.save();
      ctx.translate(x, y - drawH);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        frame,
        0, 0, frame.naturalWidth, frame.naturalHeight,
        -drawW / 2, 0, drawW, drawH
      );
      ctx.restore();
      return;
    }

    if (playerSpriteReady) {
      const drawW = 128;
      const drawH = 128;

      ctx.save();
      ctx.translate(x, y - drawH);

      if (world.player.facing > 0) ctx.scale(-1, 1);

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(playerSprite, -drawW / 2, 0, drawW, drawH);
      ctx.restore();
      return;
    }
  }

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

loadWorldState();
restoreEscapeState();
updateQuest();
syncHUD();

Promise.all([loadServerPlayer(), loadQuestions()])
  .finally(() => requestAnimationFrame(loop));
