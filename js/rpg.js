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

const typingUi = {
  screen: document.getElementById("typingCaveScreen"),
  exit: document.getElementById("typingCaveExit"),
  kicker: document.getElementById("typingCaveKicker"),
  title: document.getElementById("typingCaveTitle"),
  instructions: document.getElementById("typingCaveInstructions"),
  questionLabel: document.getElementById("typingCaveQuestionLabel"),
  stageLabel: document.getElementById("typingCaveStageLabel"),
  question: document.getElementById("typingCaveQuestion"),
  translation: document.getElementById("typingCaveTranslation"),
  hintLabel: document.getElementById("typingCaveHintLabel"),
  hint: document.getElementById("typingCaveLetterHint"),
  monster: document.getElementById("typingCaveMonster"),
  threatBar: document.getElementById("typingCaveThreatBar"),
  form: document.getElementById("typingCaveForm"),
  answerLabel: document.getElementById("typingCaveAnswerLabel"),
  input: document.getElementById("typingCaveInput"),
  submit: document.getElementById("typingCaveSubmit"),
  message: document.getElementById("typingCaveMessage"),
  spellingFeedback: document.getElementById("typingCaveSpellingFeedback"),
  retry: document.getElementById("typingCaveRetry"),
  threatLabel: document.getElementById("typingCaveThreatLabel"),
  loseOverlay: document.getElementById("typingCaveLoseOverlay"),
  loseTitle: document.getElementById("typingCaveLoseTitle"),
  loseMessage: document.getElementById("typingCaveLoseMessage"),
  loseRetry: document.getElementById("typingCaveLoseRetry"),
  loseExit: document.getElementById("typingCaveLoseExit"),
  winOverlay: document.getElementById("typingCaveWinOverlay"),
  winTitle: document.getElementById("typingCaveWinTitle"),
  winMessage: document.getElementById("typingCaveWinMessage"),
  winReplay: document.getElementById("typingCaveWinReplay"),
  winExit: document.getElementById("typingCaveWinExit")
};

const TYPING_CAVE_TOTAL_LEVELS = 3;
const TYPING_CAVE_START_POSITION = 84;
const TYPING_CAVE_RIGHT_LIMIT = 94;
const TYPING_CAVE_STEP = 7.5;

const typingCaveState = {
  words: [],
  currentWord: null,
  seenIds: new Set(),
  completedLevels: 0,
  monsterLeft: TYPING_CAVE_START_POSITION,
  approachSteps: 0,
  passiveTimer: 0,
  busy: false,
  gameOver: false,
  roundToken: 0
};

const world = {
  width: 5800,
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
  portalX: 5500,
  currentDialogueNpcId: null,
  currentDialogueIndex: 0,
  insideCave: false,
  typingCaveOpen: false,
  battle: null
};

const WORLD_SAVE_KEY = "englishPowerQuest.world.v2";
const BATTLE_KEY = "englishPowerQuest.battle";
const ESCAPE_KEY = "englishPowerQuest.escape.v1";

function saveWorldState(overrides = {}) {
  localStorage.setItem(WORLD_SAVE_KEY, JSON.stringify({
    playerX: world.player.x,
    portalX: world.portalX,
    insideCave: world.insideCave,
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
    const savedPortalX = Number(saved.portalX);
    // Migrate the old default portal away from the new typing-cave entrance.
    world.portalX = savedPortalX === 4870
      ? 5500
      : clamp(savedPortalX || world.portalX, 160, world.width - 160);
    world.insideCave = Boolean(saved.insideCave);
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

// Dedicated idle sprite: the old code incorrectly used walk frame 1 while standing,
// which made the character look jagged and visually incomplete.
const playerStandSprite = new Image();
let playerStandReady = false;
playerStandSprite.onload = () => { playerStandReady = true; };
playerStandSprite.onerror = () => {
  playerStandReady = false;
  console.warn("[English Power Quest] Unable to load Player_Stand.png; using walk frame fallback.");
};
playerStandSprite.src = "/FYP/images/player_walk_frames/png_frames/Player_Stand.png?v=20261010-characterfix2";

// Shared monster artwork for map encounters, using the uploaded asset.
const monsterSprite = new Image();
let monsterSpriteReady = false;
monsterSprite.onload = () => { monsterSpriteReady = true; };
monsterSprite.onerror = () => {
  monsterSpriteReady = false;
  console.warn("[English Power Quest] Unable to load map monster artwork.");
};
monsterSprite.src = "/FYP/images/player_walk_frames/monster/Monster.png?v=20261010-mapmonster1";

const playerWalkFrames = {
  right: Array.from({ length: 6 }, () => new Image()),
  left: Array.from({ length: 6 }, () => new Image())
};

const PLAYER_WALK_FRAME_COUNT = 6;

for (const direction of ["right", "left"]) {
  playerWalkFrames[direction].forEach((img, index) => {
    const frameName = "player_walk_" + direction + "_" + (index + 1);
    img.onerror = () => {
      // The detailed PNG frames are preferred. Keep the SVG frames as a safe fallback.
      if (img.dataset.svgFallbackTried !== "true") {
        img.dataset.svgFallbackTried = "true";
        img.src = "/FYP/images/player_walk_frames/svg_frames/" + frameName + ".svg?v=20261010-assets2";
        return;
      }
      console.warn("[English Power Quest] Unable to load player frame:", frameName);
    };
    img.src = "/FYP/images/player_walk_frames/png_frames/" + frameName + ".png?v=20261010-assets2";
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
  { x: 4380, type: "gate" },
  { x: 4630, type: "cave" },
  { x: 5050, type: "typingCave" }
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
    spawnX: 4100
  }
];

const enemies = [
  { id: "slime-01", x: 2300, type: "slime", name: "Word Slime", difficulty: "EASY", hp: 60, damage: 10, xp: 20, coins: 10, defeated: false },
  { id: "bat-01", x: 3020, type: "bat", name: "Confusion Bat", difficulty: "EASY", hp: 70, damage: 10, xp: 25, coins: 12, defeated: false },
  { id: "guardian-01", x: 3990, type: "guardian", name: "Grammar Guardian", difficulty: "MEDIUM", hp: 100, damage: 12, xp: 30, coins: 15, defeated: false },
  { id: "cave-wraith-01", x: 4780, type: "wraith", name: "Cave Wraith", difficulty: "MEDIUM", hp: 110, damage: 14, xp: 45, coins: 20, defeated: false, caveOnly: true }
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

  if (world.typingCaveOpen) {
    if (k === "escape") {
      e.preventDefault();
      if (!e.repeat) closeTypingCave();
    }
    return;
  }

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

typingUi.exit.addEventListener("click", closeTypingCave);
typingUi.retry.addEventListener("click", retryTypingCave);
typingUi.loseRetry.addEventListener("click", retryTypingCave);
typingUi.loseExit.addEventListener("click", closeTypingCave);
typingUi.winReplay.addEventListener("click", retryTypingCave);
typingUi.winExit.addEventListener("click", closeTypingCave);
typingUi.form.addEventListener("submit", (event) => {
  event.preventDefault();
  submitTypingAnswer();
});
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
    if (Boolean(enemy.caveOnly) !== world.insideCave) continue;

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
  if (!world.insideCave && Math.abs(world.portalX - world.player.x) < 112) {
    openDestinationMenu();
    return;
  }

  if (!world.insideCave) {
    const typingCave = landmarks.find(item => item.type === "typingCave");
    if (typingCave && Math.abs(typingCave.x - world.player.x) < 118) {
      openTypingCave();
      return;
    }
  }

  if (world.insideCave) {
    if (Math.abs(4325 - world.player.x) < 112) {
      leaveCave();
    }
    return;
  }

  const cave = landmarks.find(item => item.type === "cave");
  if (cave && Math.abs(cave.x - world.player.x) < 105) {
    enterCave();
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

function recenterCamera() {
  world.cameraX = clamp(
    world.player.x - window.innerWidth * 0.5,
    0,
    Math.max(0, world.width - window.innerWidth)
  );
}

function enterCave() {
  world.insideCave = true;
  // Cave monsters respawn when the player enters the cave again.
  enemies.forEach(enemy => {
    if (enemy.caveOnly) enemy.defeated = false;
  });
  world.player.x = 4480;
  world.player.vx = 0;
  world.player.facing = 1;
  world.player.walkFrame = 0;
  world.player.walkTimer = 0;
  world.interacting = true;
  world.currentDialogueNpcId = "caveEntry";
  recenterCamera();
  updateLocation();
  ui.dialogueName.textContent = t("cave.title");
  ui.dialogueText.textContent = t("cave.entered");
  ui.dialogue.classList.remove("hidden");
  saveWorldState({ playerX: world.player.x, insideCave: true });
}

function leaveCave() {
  world.insideCave = false;
  world.player.x = 4660;
  world.player.vx = 0;
  world.player.facing = -1;
  world.player.walkFrame = 0;
  world.player.walkTimer = 0;
  world.interacting = false;
  world.currentDialogueNpcId = null;
  ui.dialogue.classList.add("hidden");
  recenterCamera();
  updateLocation();
  saveWorldState({ playerX: world.player.x, insideCave: false });
}

const fallbackTypingWords = [
  { id: "throw", answer: "throw", definition: "To propel something through the air with a movement of the arm and hand. To toss or hurl.", definitionZh: "用手臂和手的动作把东西抛向空中；投掷。" },
  { id: "upload", answer: "upload", definition: "To transfer a file from your device to a remote computer or server.", definitionZh: "把文件从自己的设备传到远程电脑或服务器。" },
  { id: "debug", answer: "debug", definition: "To find and remove errors from a computer program.", definitionZh: "找出并修正电脑程序中的错误。" }
];

async function ensureTypingCaveWords() {
  if (typingCaveState.words.length) return typingCaveState.words;
  try {
    const response = await fetch("/FYP/data/typing_cave_words.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Typing cave word data unavailable");
    const data = await response.json();
    typingCaveState.words = Array.isArray(data)
      ? data.filter(item => item && item.id && item.answer && item.definition)
      : [];
  } catch (error) {
    console.warn("Typing cave will use its built-in vocabulary fallback.", error);
  }
  if (!typingCaveState.words.length) typingCaveState.words = fallbackTypingWords;
  return typingCaveState.words;
}

function chooseTypingWord() {
  if (!typingCaveState.words.length) return null;
  let available = typingCaveState.words.filter(word => !typingCaveState.seenIds.has(word.id));
  if (!available.length) {
    typingCaveState.seenIds.clear();
    available = typingCaveState.words;
  }
  const word = available[Math.floor(Math.random() * available.length)];
  typingCaveState.seenIds.add(word.id);
  typingCaveState.currentWord = word;
  return word;
}

function renderTypingQuestion() {
  const word = typingCaveState.currentWord;
  if (!typingUi.screen || !word) return;
  const isChinese = getLanguage() === "zh";

  typingUi.kicker.textContent = isChinese ? "回声之外 · 英语打字挑战" : "BEYOND THE ECHO · TYPING CHALLENGE";
  typingUi.title.textContent = isChinese ? "字谜洞穴" : "Word Cavern";
  typingUi.stageLabel.textContent = isChinese
    ? `第 ${Math.min(typingCaveState.completedLevels + 1, TYPING_CAVE_TOTAL_LEVELS)} / ${TYPING_CAVE_TOTAL_LEVELS} 关`
    : `LEVEL ${Math.min(typingCaveState.completedLevels + 1, TYPING_CAVE_TOTAL_LEVELS)} / ${TYPING_CAVE_TOTAL_LEVELS}`;
  typingUi.instructions.textContent = isChinese
    ? "根据上方解释输入正确的英文单词。怪物会慢慢靠近！"
    : "Type the English word that matches the definition. The monster is getting closer!";
  typingUi.questionLabel.textContent = isChinese ? "输入符合以下解释的单词" : "TYPE THE WORD THAT MEANS";
  typingUi.question.textContent = word.definition;
  typingUi.translation.textContent = word.definitionZh || "";
  typingUi.translation.classList.toggle("hidden", !isChinese || !word.definitionZh);
  typingUi.hintLabel.textContent = isChinese ? "怪物靠近时会逐步揭示字母" : "Letters are revealed as the monster approaches";

  const answer = String(word.answer).toUpperCase();
  const maxRevealCount = Math.max(1, answer.length - 2); // Always hide the last two letters.
  const revealCount = Math.min(maxRevealCount, Math.max(1, typingCaveState.approachSteps + 1));
  typingUi.hint.replaceChildren();
  for (let index = 0; index < answer.length; index += 1) {
    const slot = document.createElement("span");
    slot.className = "typing-cave-letter" + (index < revealCount ? " revealed" : "");
    slot.textContent = index < revealCount ? answer[index] : "·";
    typingUi.hint.appendChild(slot);
  }

  typingUi.answerLabel.textContent = isChinese ? "输入英文答案" : "Type your answer";
  typingUi.input.setAttribute("aria-label", typingUi.answerLabel.textContent);
  typingUi.input.maxLength = Math.max(12, answer.length + 2);
  typingUi.threatLabel.textContent = isChinese ? "怪物接近程度" : "MONSTER APPROACH";
  typingUi.submit.textContent = isChinese ? "提交答案" : "SUBMIT";
  typingUi.retry.textContent = isChinese ? "再试一次" : "TRY AGAIN";
  typingUi.exit.textContent = isChinese ? "↩ 返回地图" : "↩ BACK TO MAP";
  updateTypingCaveVisuals();
}

function updateTypingCaveVisuals() {
  typingUi.monster.style.left = typingCaveState.monsterLeft + "%";
  const threat = Math.max(0, Math.min(100, (TYPING_CAVE_START_POSITION - typingCaveState.monsterLeft) / (TYPING_CAVE_START_POSITION - 32) * 100));
  typingUi.threatBar.style.width = threat + "%";
}

function setTypingMessage(text, kind = "") {
  typingUi.message.textContent = text;
  typingUi.message.classList.remove("success", "warning", "danger");
  if (kind) typingUi.message.classList.add(kind);
}

async function openTypingCave() {
  if (world.typingCaveOpen) return;
  world.typingCaveOpen = true;
  world.player.vx = 0;
  keys.clear();
  touch.left = false;
  touch.right = false;

  typingCaveState.completedLevels = 0;
  typingCaveState.monsterLeft = TYPING_CAVE_START_POSITION;
  typingCaveState.approachSteps = 0;
  typingCaveState.passiveTimer = 0;
  typingCaveState.busy = false;
  typingCaveState.gameOver = false;
  typingCaveState.seenIds.clear();
  typingCaveState.roundToken += 1;

  typingUi.screen.classList.remove("hidden");
  clearTypingSpellingFeedback();
  typingUi.input.value = "";
  typingUi.input.disabled = true;
  typingUi.submit.disabled = true;
  typingUi.retry.classList.add("hidden");
  typingUi.loseOverlay.classList.add("hidden");
  typingUi.winOverlay.classList.add("hidden");
  setTypingMessage(getLanguage() === "zh" ? "正在准备单词挑战……" : "Preparing word challenge…");
  updateTypingCaveVisuals();

  await ensureTypingCaveWords();
  if (!world.typingCaveOpen) return;
  chooseTypingWord();
  renderTypingQuestion();
  typingUi.input.disabled = false;
  typingUi.submit.disabled = false;
  typingUi.input.focus();
  setTypingMessage(getLanguage() === "zh"
    ? "输入英文单词并按 Enter。答错会让怪物前进一步。"
    : "Type the word and press Enter. A wrong answer moves the monster one step closer.");
}

function closeTypingCave() {
  if (!world.typingCaveOpen) return;
  world.typingCaveOpen = false;
  typingCaveState.roundToken += 1;
  keys.clear();
  touch.left = false;
  touch.right = false;
  typingUi.screen.classList.add("hidden");
  typingUi.input.disabled = false;
  typingUi.input.value = "";
  updateLocation();
}

function advanceTypingMonster(reason) {
  if (!world.typingCaveOpen || typingCaveState.busy || typingCaveState.gameOver) return;
  typingCaveState.approachSteps += 1;
  typingCaveState.monsterLeft = Math.max(27, typingCaveState.monsterLeft - TYPING_CAVE_STEP);
  typingCaveState.passiveTimer = 0;
  renderTypingQuestion();

  const isChinese = getLanguage() === "zh";
  if (typingCaveState.monsterLeft <= 32) {
    typingCaveState.gameOver = true;
    typingCaveState.busy = true;
    typingUi.input.disabled = true;
    typingUi.submit.disabled = true;
    typingUi.retry.classList.add("hidden");

    typingUi.loseTitle.textContent = isChinese ? "你输了！" : "YOU LOSE";
    typingUi.loseMessage.textContent = isChinese
      ? "怪物追上你了。再试一次，记得在最后两个字母揭晓前打出答案！"
      : "The monster caught you. Try again and type the word before it reaches you.";
    typingUi.loseRetry.textContent = isChinese ? "再挑战一次" : "TRY AGAIN";
    typingUi.loseExit.textContent = isChinese ? "返回地图" : "BACK TO MAP";
    typingUi.loseOverlay.classList.remove("hidden");
    typingUi.loseRetry.focus();
    setTypingMessage(isChinese ? "挑战失败。" : "Challenge failed.", "danger");
    return;
  }

  setTypingMessage(
    reason === "wrong"
      ? (isChinese ? "答案不正确！怪物前进一步，并揭示了一个字母。" : "Not quite! The monster moves one step closer and reveals a letter.")
      : (isChinese ? "怪物正在靠近……又揭示了一个字母！" : "The monster creeps closer… another letter is revealed!"),
    reason === "wrong" ? "warning" : "danger"
  );
  typingUi.input.focus();
}

function showTypingSpellingFeedback(typedAnswer, correctAnswer) {
  const typed = String(typedAnswer || "").trim().toLowerCase();
  const correct = String(correctAnswer || "").trim().toLowerCase();
  const isChinese = getLanguage() === "zh";
  let differenceIndex = 0;

  while (
    differenceIndex < typed.length &&
    differenceIndex < correct.length &&
    typed[differenceIndex] === correct[differenceIndex]
  ) {
    differenceIndex += 1;
  }

  const position = differenceIndex + 1;
  const enteredLetter = typed[differenceIndex] || "";
  const expectedLetter = correct[differenceIndex] || "";
  let message;

  // Detect one missing character (for example, "bandwidth" typed without "d").
  const missingLetter =
    typed.length < correct.length &&
    correct.slice(0, differenceIndex) === typed.slice(0, differenceIndex) &&
    correct.slice(differenceIndex + 1) === typed.slice(differenceIndex);

  // Detect one extra character.
  const extraLetter =
    typed.length > correct.length &&
    typed.slice(0, differenceIndex) === correct.slice(0, differenceIndex) &&
    typed.slice(differenceIndex + 1) === correct.slice(differenceIndex);

  if (missingLetter) {
    message = isChinese
      ? `你漏了第 ${position} 个字母：这里需要补上 “${expectedLetter.toUpperCase()}”。字母数量和顺序都会影响拼写，请检查这一处再试。`
      : `You missed letter ${position}: add “${expectedLetter.toUpperCase()}” here. The number and order of letters matter, so check this spot and try again.`;
  } else if (extraLetter) {
    message = isChinese
      ? `第 ${position} 个字母多输入了 “${enteredLetter.toUpperCase()}”。这个位置不需要多一个字母，请检查拼写长度和后面的字母顺序。`
      : `You added an extra “${enteredLetter.toUpperCase()}” at position ${position}. Check the word length and the order of the remaining letters.`;
  } else if (enteredLetter && expectedLetter) {
    message = isChinese
      ? `第 ${position} 个字母拼错了：你输入 “${enteredLetter.toUpperCase()}”，这个位置应该是 “${expectedLetter.toUpperCase()}”。从左到右核对字母顺序，再重新输入。`
      : `Letter ${position} is incorrect: you typed “${enteredLetter.toUpperCase()}”, but this position should be “${expectedLetter.toUpperCase()}”. Check the letter order and try again.`;
  } else if (typed.length < correct.length) {
    message = isChinese
      ? `你的答案少了字母。这个单词需要 ${correct.length} 个字母，你输入了 ${typed.length} 个；请检查结尾是否漏字母。`
      : `Your answer is missing letters. This word has ${correct.length} letters, but you entered ${typed.length}. Check the ending.`;
  } else {
    message = isChinese
      ? `你的答案比正确拼写长。这个单词需要 ${correct.length} 个字母，你输入了 ${typed.length} 个；请检查是否多打了字母。`
      : `Your answer is longer than the correct spelling. This word has ${correct.length} letters, but you entered ${typed.length}. Check for extra letters.`;
  }

  typingUi.spellingFeedback.textContent = message;
  typingUi.spellingFeedback.classList.remove("hidden");
}

function clearTypingSpellingFeedback() {
  typingUi.spellingFeedback.textContent = "";
  typingUi.spellingFeedback.classList.add("hidden");
}

function submitTypingAnswer() {
  if (!world.typingCaveOpen || typingCaveState.busy || typingCaveState.gameOver || !typingCaveState.currentWord) return;
  const typed = typingUi.input.value.trim().toLowerCase().replace(/\s+/g, " ");
  if (!typed) {
    setTypingMessage(getLanguage() === "zh" ? "先输入一个英文答案。" : "Type an answer first.", "warning");
    typingUi.input.focus();
    return;
  }

  const correctAnswer = String(typingCaveState.currentWord.answer).trim().toLowerCase();
  if (typed !== correctAnswer) {
    typingUi.input.value = "";
    showTypingSpellingFeedback(typed, correctAnswer);
    advanceTypingMonster("wrong");
    return;
  }

  clearTypingSpellingFeedback();

  typingCaveState.busy = true;
  const token = ++typingCaveState.roundToken;
  const word = typingCaveState.currentWord;
  const isChinese = getLanguage() === "zh";
  typingCaveState.completedLevels += 1;
  typingCaveState.monsterLeft = Math.min(
    TYPING_CAVE_RIGHT_LIMIT,
    typingCaveState.monsterLeft + TYPING_CAVE_STEP
  );
  typingCaveState.approachSteps = Math.max(0, typingCaveState.approachSteps - 1);
  typingCaveState.passiveTimer = 0;
  renderTypingQuestion();
  // During the short success pause, show the level just completed.
  typingUi.stageLabel.textContent = isChinese
    ? `第 ${typingCaveState.completedLevels} / ${TYPING_CAVE_TOTAL_LEVELS} 关`
    : `LEVEL ${typingCaveState.completedLevels} / ${TYPING_CAVE_TOTAL_LEVELS}`;

  typingUi.input.disabled = true;
  typingUi.submit.disabled = true;
  setTypingMessage(
    isChinese
      ? `答对了！怪物后退一步！第 ${typingCaveState.completedLevels} / ${TYPING_CAVE_TOTAL_LEVELS} 关完成。`
      : `Correct! The monster steps back! Level ${typingCaveState.completedLevels} / ${TYPING_CAVE_TOTAL_LEVELS} complete.`,
    "success"
  );

  world.xp += 10;
  world.coins += 5;
  world.power += 1;
  syncHUD();
  saveWorldState();
  void saveServerProgress({
    xpDelta: 10,
    coinDelta: 5,
    englishPowerDelta: 1,
    englishSkillCode: "VOCABULARY",
    sourceType: "QUESTION",
    sourceId: null,
    description: "Typing Cavern word: " + word.answer
  });

  window.setTimeout(() => {
    if (!world.typingCaveOpen || token !== typingCaveState.roundToken) return;
    typingCaveState.passiveTimer = 0;
    clearTypingSpellingFeedback();
    typingUi.input.value = "";

    if (typingCaveState.completedLevels >= TYPING_CAVE_TOTAL_LEVELS) {
      typingCaveState.gameOver = true;
      typingCaveState.busy = true;
      typingUi.winTitle.textContent = isChinese ? "挑战成功！" : "CAVE CLEARED!";
      typingUi.winMessage.textContent = isChinese
        ? "三关全部完成！你成功把怪物击退，获得了全部奖励。"
        : "You completed all three levels and pushed the monster away. All rewards have been earned!";
      typingUi.winReplay.textContent = isChinese ? "再玩一次" : "PLAY AGAIN";
      typingUi.winExit.textContent = isChinese ? "返回地图" : "BACK TO MAP";
      typingUi.winOverlay.classList.remove("hidden");
      typingUi.winReplay.focus();
      return;
    }

    typingCaveState.busy = false;
    typingUi.input.disabled = false;
    typingUi.submit.disabled = false;
    chooseTypingWord();
    renderTypingQuestion();
    setTypingMessage(
      isChinese
        ? `下一关！还剩 ${TYPING_CAVE_TOTAL_LEVELS - typingCaveState.completedLevels} 关，继续把怪物击退！`
        : `Next level! ${TYPING_CAVE_TOTAL_LEVELS - typingCaveState.completedLevels} level(s) remaining. Keep pushing the monster back!`
    );
    typingUi.input.focus();
  }, 900);
}

function retryTypingCave() {
  typingCaveState.completedLevels = 0;
  typingCaveState.monsterLeft = TYPING_CAVE_START_POSITION;
  typingCaveState.approachSteps = 0;
  typingCaveState.passiveTimer = 0;
  typingCaveState.busy = false;
  typingCaveState.gameOver = false;
  typingCaveState.roundToken += 1;
  typingUi.loseOverlay.classList.add("hidden");
  typingUi.winOverlay.classList.add("hidden");
  clearTypingSpellingFeedback();
  typingUi.input.value = "";
  typingUi.input.disabled = false;
  typingUi.submit.disabled = false;
  typingUi.retry.classList.add("hidden");
  renderTypingQuestion();
  setTypingMessage(getLanguage() === "zh" ? "再试一次！怪物会慢慢靠近。" : "Try again! The monster will slowly approach.");
  typingUi.input.focus();
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
  ui.location.textContent = world.insideCave ? t("location.cave") :
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
    } else if (world.currentDialogueNpcId === "caveEntry") {
      ui.dialogueName.textContent = t("cave.title");
      ui.dialogueText.textContent = t("cave.entered");
    } else {
      const npc = npcs.find(item => item.id === world.currentDialogueNpcId);
      if (npc) {
        ui.dialogueName.textContent = t(npc.nameKey) + " · " + t(npc.titleKey);
        ui.dialogueText.textContent = t(npc.dialogueKeys[world.currentDialogueIndex]);
      }
    }
  }
  if (world.travelMenu) renderDestinationSelection();
  if (world.typingCaveOpen) renderTypingQuestion();
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

  if (world.typingCaveOpen) {
    if (!typingCaveState.busy && !typingCaveState.gameOver) {
      typingCaveState.passiveTimer += dt;
      if (typingCaveState.passiveTimer >= 8) {
        advanceTypingMonster("time");
      }
    }
    return;
  }

  if (!world.interacting && !world.travelMenu && !settingsIsOpen()) {
    const left = keys.has("arrowleft") || keys.has("a") || touch.left;
    const right = keys.has("arrowright") || keys.has("d") || touch.right;
    const direction = (right ? 1 : 0) - (left ? 1 : 0);

    world.player.vx = direction * world.player.speed;
    if (direction !== 0) world.player.facing = direction;

    world.player.x += world.player.vx * dt;
    world.player.x = world.insideCave
      ? clamp(world.player.x, 4260, world.width - 120)
      : clamp(world.player.x, 100, world.width - 120);

    if (Math.abs(world.player.vx) > 1) {
      world.player.walkTimer += dt;
      const frameDuration = 0.22;
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

  if (world.insideCave) {
    drawCaveScene(w, h);
    drawCaveExit();
    drawCaveDetails();
    drawEnemies();
    drawPlayer();
    drawCaveForeground(w, h);
    return;
  }

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
    if (l.type === "cave") drawCaveEntrance(x, world.groundY, Math.abs(l.x - world.player.x) < 125);
    if (l.type === "typingCave") drawTypingCaveEntrance(x, world.groundY, Math.abs(l.x - world.player.x) < 135);
  }
}

function drawCaveEntrance(x, ground, nearby) {
  ctx.save();
  const glow = ctx.createRadialGradient(x, ground - 80, 5, x, ground - 80, 125);
  glow.addColorStop(0, "rgba(99, 173, 204, .24)");
  glow.addColorStop(1, "rgba(17, 30, 40, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(x - 130, ground - 215, 260, 230);

  ctx.fillStyle = "#292f37";
  ctx.fillRect(x - 82, ground - 92, 28, 92);
  ctx.fillRect(x + 54, ground - 92, 28, 92);
  ctx.beginPath();
  ctx.moveTo(x - 87, ground - 88);
  ctx.lineTo(x - 73, ground - 150);
  ctx.lineTo(x - 31, ground - 184);
  ctx.lineTo(x + 19, ground - 191);
  ctx.lineTo(x + 67, ground - 157);
  ctx.lineTo(x + 87, ground - 88);
  ctx.closePath();
  ctx.fillStyle = "#39424a";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x - 54, ground);
  ctx.lineTo(x - 51, ground - 90);
  ctx.quadraticCurveTo(x - 44, ground - 147, x, ground - 148);
  ctx.quadraticCurveTo(x + 45, ground - 146, x + 52, ground - 90);
  ctx.lineTo(x + 54, ground);
  ctx.closePath();
  ctx.fillStyle = "#070a10";
  ctx.fill();

  ctx.fillStyle = "#657b85";
  ctx.fillRect(x - 80, ground - 94, 12, 85);
  ctx.fillRect(x + 68, ground - 94, 12, 85);
  ctx.fillStyle = "#202831";
  ctx.fillRect(x - 63, ground - 5, 126, 8);

  ctx.fillStyle = "#c7e7ed";
  ctx.textAlign = "center";
  ctx.font = getLanguage() === "zh" ? "bold 13px sans-serif" : "bold 12px 'Courier New', monospace";
  ctx.fillText(t("cave.entranceName"), x, ground - 205);

  if (nearby) {
    ctx.fillStyle = "rgba(7, 12, 18, .92)";
    ctx.fillRect(x - 99, ground - 238, 198, 22);
    ctx.strokeStyle = "#7eb7cb";
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 99, ground - 238, 198, 22);
    ctx.fillStyle = "#e3f7ff";
    ctx.font = getLanguage() === "zh" ? "bold 11px sans-serif" : "bold 10px 'Courier New', monospace";
    ctx.fillText(t("cave.enterPrompt"), x, ground - 223);
  }
  ctx.restore();
}

function drawTypingCaveEntrance(x, ground, nearby) {
  ctx.save();

  const glow = ctx.createRadialGradient(x, ground - 82, 3, x, ground - 82, 150);
  glow.addColorStop(0, "rgba(155, 91, 226, .34)");
  glow.addColorStop(.55, "rgba(92, 58, 150, .16)");
  glow.addColorStop(1, "rgba(18, 16, 31, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(x - 155, ground - 232, 310, 245);

  // Purple-gray stone arch to distinguish this cave from the blue Echo Cave.
  ctx.fillStyle = "#282536";
  ctx.beginPath();
  ctx.moveTo(x - 101, ground);
  ctx.lineTo(x - 94, ground - 98);
  ctx.lineTo(x - 70, ground - 164);
  ctx.lineTo(x - 22, ground - 196);
  ctx.lineTo(x + 35, ground - 190);
  ctx.lineTo(x + 82, ground - 149);
  ctx.lineTo(x + 102, ground - 76);
  ctx.lineTo(x + 102, ground);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#545064";
  ctx.fillRect(x - 92, ground - 92, 22, 92);
  ctx.fillRect(x + 70, ground - 92, 22, 92);
  ctx.fillStyle = "#756b86";
  ctx.fillRect(x - 85, ground - 91, 5, 83);
  ctx.fillRect(x + 80, ground - 91, 5, 83);

  ctx.beginPath();
  ctx.moveTo(x - 62, ground);
  ctx.lineTo(x - 60, ground - 91);
  ctx.quadraticCurveTo(x - 56, ground - 145, x, ground - 151);
  ctx.quadraticCurveTo(x + 55, ground - 145, x + 61, ground - 91);
  ctx.lineTo(x + 62, ground);
  ctx.closePath();
  ctx.fillStyle = "#05060b";
  ctx.fill();

  // A few dim crystal pixels make this entrance feel like a separate challenge area.
  ctx.fillStyle = "#bc9cff";
  ctx.globalAlpha = .85;
  ctx.fillRect(x - 38, ground - 117, 4, 10);
  ctx.fillRect(x + 30, ground - 132, 4, 10);
  ctx.fillRect(x + 7, ground - 94, 3, 7);
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#171621";
  ctx.fillRect(x - 91, ground - 6, 182, 10);
  ctx.fillStyle = "#87729d";
  ctx.fillRect(x - 79, ground - 4, 158, 3);

  ctx.textAlign = "center";
  ctx.font = getLanguage() === "zh" ? "bold 13px sans-serif" : "bold 12px 'Courier New', monospace";
  ctx.fillStyle = "#eadcff";
  ctx.fillText(getLanguage() === "zh" ? "打字洞穴" : "WORD CAVERN", x, ground - 211);

  if (nearby) {
    ctx.fillStyle = "rgba(10, 8, 17, .94)";
    ctx.fillRect(x - 119, ground - 246, 238, 23);
    ctx.strokeStyle = "#a88cd1";
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 119, ground - 246, 238, 23);
    ctx.fillStyle = "#f3eaff";
    ctx.font = getLanguage() === "zh" ? "bold 11px sans-serif" : "bold 10px 'Courier New', monospace";
    ctx.fillText(getLanguage() === "zh" ? "按 E / 互动开始打字挑战" : "PRESS E TO START TYPING CHALLENGE", x, ground - 231);
  }

  ctx.restore();
}

function drawCaveScene(w, h) {
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, "#050810");
  gradient.addColorStop(.42, "#101722");
  gradient.addColorStop(.72, "#242b32");
  gradient.addColorStop(1, "#171e23");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  // Jagged ceiling silhouette.
  ctx.fillStyle = "#080c13";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  for (let x = 0; x <= w + 90; x += 70) {
    const tooth = 18 + Math.abs(Math.sin(x * .033)) * 33;
    ctx.lineTo(x, tooth);
    ctx.lineTo(x + 34, 0);
  }
  ctx.lineTo(w, 0);
  ctx.closePath();
  ctx.fill();

  // Distant cavern walls and narrow shafts of cold light.
  ctx.fillStyle = "#1a252f";
  ctx.beginPath();
  ctx.moveTo(0, 300);
  for (let x = 0; x <= w + 80; x += 80) {
    ctx.lineTo(x, 215 + Math.sin(x * .017) * 47);
  }
  ctx.lineTo(w, 525);
  ctx.lineTo(0, 525);
  ctx.closePath();
  ctx.fill();

  const start = Math.floor(world.cameraX / 150) - 2;
  const end = start + Math.ceil(w / 150) + 5;
  for (let i = start; i < end; i++) {
    const worldX = i * 150 + 45;
    const x = worldToScreen(worldX);
    const size = 28 + Math.abs(i * 31 % 48);
    ctx.fillStyle = i % 2 ? "#222e37" : "#29323b";
    ctx.beginPath();
    ctx.moveTo(x - size * .48, 0);
    ctx.lineTo(x + size * .48, 0);
    ctx.lineTo(x + size * .12, size + 15);
    ctx.lineTo(x - size * .09, size * .72);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(4, 7, 12, .34)";
    ctx.fillRect(x - 25, 105 + Math.abs(i * 17 % 110), 50, 9);
    ctx.fillRect(x - 15, 122 + Math.abs(i * 13 % 115), 30, 5);
  }

  ctx.fillStyle = "#4e5960";
  ctx.fillRect(0, world.groundY - 9, w, 10);
  ctx.fillStyle = "#303b43";
  ctx.fillRect(0, world.groundY + 1, w, h - world.groundY);

  const tile = 72;
  const floorStart = Math.floor(world.cameraX / tile) - 1;
  const floorEnd = floorStart + Math.ceil(w / tile) + 3;
  for (let i = floorStart; i < floorEnd; i++) {
    const x = i * tile - world.cameraX;
    ctx.fillStyle = i % 2 ? "#263138" : "#202a31";
    ctx.fillRect(x, world.groundY + 18, tile - 2, 56);
    ctx.fillStyle = "#455057";
    ctx.fillRect(x + 11, world.groundY + 19, 18, 5);
  }

  // Location title inside the cave.
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(0, 0, 0, .48)";
  ctx.fillRect(w * .5 - 176, 177, 352, 43);
  ctx.strokeStyle = "rgba(133, 184, 203, .6)";
  ctx.lineWidth = 2;
  ctx.strokeRect(w * .5 - 176, 177, 352, 43);
  ctx.fillStyle = "#e1f1f4";
  ctx.font = getLanguage() === "zh" ? "bold 21px sans-serif" : "bold 19px 'Courier New', monospace";
  ctx.fillText(t("cave.title"), w * .5, 204);
  ctx.fillStyle = "#9eafbb";
  ctx.font = getLanguage() === "zh" ? "13px sans-serif" : "12px 'Courier New', monospace";
  ctx.fillText(t("cave.subtitle"), w * .5, 239);
}

function drawCaveExit() {
  const x = worldToScreen(4325);
  const ground = world.groundY;
  if (x < -140 || x > window.innerWidth + 140) return;
  const nearby = Math.abs(world.player.x - 4325) < 125;
  ctx.save();
  ctx.fillStyle = "rgba(153, 215, 230, .12)";
  ctx.beginPath();
  ctx.ellipse(x, ground - 80, 104, 156, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#59666c";
  ctx.beginPath();
  ctx.moveTo(x - 92, ground);
  ctx.lineTo(x - 75, ground - 109);
  ctx.lineTo(x - 41, ground - 170);
  ctx.lineTo(x + 18, ground - 182);
  ctx.lineTo(x + 73, ground - 135);
  ctx.lineTo(x + 93, ground);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x - 57, ground);
  ctx.lineTo(x - 48, ground - 90);
  ctx.quadraticCurveTo(x, ground - 155, x + 50, ground - 90);
  ctx.lineTo(x + 57, ground);
  ctx.closePath();
  ctx.fillStyle = "#080c12";
  ctx.fill();

  ctx.fillStyle = "#8dd5e5";
  ctx.fillRect(x - 72, ground - 70, 7, 62);
  ctx.fillRect(x + 65, ground - 70, 7, 62);

  if (nearby) {
    ctx.fillStyle = "rgba(6, 10, 15, .93)";
    ctx.fillRect(x - 98, ground - 224, 196, 22);
    ctx.strokeStyle = "#7eb7cb";
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 98, ground - 224, 196, 22);
    ctx.textAlign = "center";
    ctx.fillStyle = "#e3f7ff";
    ctx.font = getLanguage() === "zh" ? "bold 11px sans-serif" : "bold 10px 'Courier New', monospace";
    ctx.fillText(t("cave.exitPrompt"), x, ground - 209);
  }
  ctx.restore();
}

function drawCaveDetails() {
  const positions = [4590, 4670, 4920, 5050];
  for (let i = 0; i < positions.length; i++) {
    const x = worldToScreen(positions[i]);
    if (x < -80 || x > window.innerWidth + 80) continue;
    if (i % 2 === 0) {
      ctx.fillStyle = "#39464d";
      ctx.fillRect(x - 21, world.groundY - 114, 42, 114);
      ctx.fillStyle = "#56636a";
      ctx.fillRect(x - 30, world.groundY - 122, 60, 14);
      ctx.fillStyle = "#202a31";
      ctx.fillRect(x - 14, world.groundY - 95, 6, 66);
      ctx.fillRect(x + 8, world.groundY - 80, 6, 45);
    } else {
      const glow = ctx.createRadialGradient(x, world.groundY - 48, 2, x, world.groundY - 48, 52);
      glow.addColorStop(0, "rgba(104, 218, 227, .33)");
      glow.addColorStop(1, "rgba(66, 134, 147, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(x - 55, world.groundY - 105, 110, 110);
      ctx.fillStyle = "#64bbc5";
      ctx.beginPath();
      ctx.moveTo(x, world.groundY - 83);
      ctx.lineTo(x + 17, world.groundY - 45);
      ctx.lineTo(x + 9, world.groundY - 12);
      ctx.lineTo(x - 10, world.groundY - 12);
      ctx.lineTo(x - 18, world.groundY - 48);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#b0fbff";
      ctx.fillRect(x - 2, world.groundY - 77, 4, 36);
    }
  }
}

function drawCaveForeground(w, h) {
  ctx.fillStyle = "rgba(5, 8, 12, .25)";
  ctx.fillRect(0, world.groundY + 85, w, Math.max(0, h - world.groundY - 85));
  const start = Math.floor(world.cameraX / 105) - 1;
  const end = start + Math.ceil(w / 105) + 2;
  for (let i = start; i < end; i++) {
    const x = i * 105 - world.cameraX + 20;
    ctx.fillStyle = i % 2 ? "#151d24" : "#1d272d";
    ctx.beginPath();
    ctx.moveTo(x - 24, h);
    ctx.lineTo(x - 9, world.groundY + 65);
    ctx.lineTo(x + 9, world.groundY + 59);
    ctx.lineTo(x + 35, h);
    ctx.closePath();
    ctx.fill();
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
    if (Boolean(enemy.caveOnly) !== world.insideCave) continue;
    const x = worldToScreen(enemy.x);
    if (x < -100 || x > window.innerWidth + 100) continue;
    if (monsterSpriteReady) {
      // Draw the supplied monster PNG in place of the old canvas-drawn shapes.
      // Keep the fallback shapes below in case the image cannot be loaded.
      const drawHeight = enemy.type === "wraith" ? 220 : 184;
      const drawWidth = enemy.type === "wraith" ? 156 : 184;
      ctx.drawImage(monsterSprite, x - drawWidth / 2, world.groundY - drawHeight, drawWidth, drawHeight);
    } else if (enemy.type === "slime") {
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
    } else if (enemy.type === "wraith") {
      const pulse = 0.82 + Math.sin(world.time * 4) * 0.08;
      ctx.fillStyle = "rgba(71, 185, 202, .18)";
      ctx.beginPath();
      ctx.ellipse(x, world.groundY - 54, 45 * pulse, 55 * pulse, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#547d8d";
      ctx.beginPath();
      ctx.moveTo(x - 25, world.groundY - 75);
      ctx.quadraticCurveTo(x - 34, world.groundY - 108, x, world.groundY - 110);
      ctx.quadraticCurveTo(x + 35, world.groundY - 108, x + 25, world.groundY - 75);
      ctx.lineTo(x + 31, world.groundY - 11);
      ctx.lineTo(x + 13, world.groundY - 22);
      ctx.lineTo(x, world.groundY - 9);
      ctx.lineTo(x - 14, world.groundY - 22);
      ctx.lineTo(x - 31, world.groundY - 11);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#bdffff";
      ctx.fillRect(x - 12, world.groundY - 78, 7, 6);
      ctx.fillRect(x + 5, world.groundY - 78, 7, 6);
      ctx.fillStyle = "#17262e";
      ctx.fillRect(x - 10, world.groundY - 77, 3, 5);
      ctx.fillRect(x + 7, world.groundY - 77, 3, 5);
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
  const currentWalkDirection = player
    ? (world.player.facing > 0 ? "right" : "left")
    : null;
  const moving = Boolean(player && Math.abs(world.player.vx) > 1);
  const currentWalkIndex = player ? world.player.walkFrame : 0;
  const walkingFrame = playerWalkFrames[currentWalkDirection || "right"] || [];
  const selectedFrame = walkingFrame[currentWalkIndex];
  const selectedFrameReady = Boolean(
    player && hasWalkFrame(currentWalkDirection, currentWalkIndex)
  );

  // Walk only while the player is moving. At rest, use the dedicated clean
  // Player_Stand.png instead of leaving the character frozen in a walk pose.
  let displayFrame = null;
  let displayFrameIsWalk = false;
  if (player && moving && selectedFrameReady) {
    displayFrame = selectedFrame;
    displayFrameIsWalk = true;
  } else if (player && playerStandReady && playerStandSprite.complete && playerStandSprite.naturalWidth > 0) {
    displayFrame = playerStandSprite;
  } else if (player && hasWalkFrame(currentWalkDirection, 0)) {
    // Recovery path if the stand image is missing: show a valid directional frame.
    displayFrame = walkingFrame[0];
    displayFrameIsWalk = true;
  }

  const displayFrameReady = Boolean(
    displayFrame && displayFrame.complete && displayFrame.naturalWidth > 0
  );

  if (!displayFrameReady) {
    ctx.fillStyle = "rgba(0,0,0,.25)";
    ctx.beginPath();
    ctx.ellipse(x, ground + 4, player ? 30 : 25, player ? 8 : 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (player && displayFrameReady) {
    // Keep each asset's aspect ratio: walk frames use a 2:3 portrait box,
    // while Player_Stand.png uses a square box. Both remain bottom-aligned at the feet.
    const drawW = displayFrameIsWalk ? 96 : 144;
    const drawH = 144;

    ctx.save();
    ctx.translate(x, y);
    // Player_Stand.png faces right; mirror only this stand image when facing left.
    if (!displayFrameIsWalk && world.player.facing < 0) ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      displayFrame,
      0, 0, displayFrame.naturalWidth, displayFrame.naturalHeight,
      -drawW / 2, -drawH, drawW, drawH
    );
    ctx.restore();
    return;
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
recenterCamera();
restoreEscapeState();
updateQuest();
syncHUD();

Promise.all([loadServerPlayer(), loadQuestions()])
  .finally(() => requestAnimationFrame(loop));
