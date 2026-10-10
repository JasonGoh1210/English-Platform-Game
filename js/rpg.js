import { t, getLanguage, onLanguageChange } from "./i18n.js?v=20261010-storyarc2";

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
  storyIntroOverlay: document.getElementById("storyIntroOverlay"),
  storyIntroCanvas: document.getElementById("storyboardCanvas"),
  storyIntroSceneArt: document.getElementById("storyboardSceneArt"),
  storyIntroPortraitImage: document.getElementById("storyIntroPortraitImage"),
  storyboardSpeaker: document.getElementById("storyboardSpeaker"),
  storyboardFrameTag: document.getElementById("storyboardFrameTag"),
  storyboardLocation: document.getElementById("storyboardLocation"),
  storyboardSfx: document.getElementById("storyboardSfx"),
  storyIntroKicker: document.getElementById("storyIntroKicker"),
  storyIntroCounter: document.getElementById("storyIntroCounter"),
  storyIntroTitle: document.getElementById("storyIntroTitle"),
  storyIntroBody: document.getElementById("storyIntroBody"),
  storyIntroProgress: document.getElementById("storyIntroProgress"),
  storyIntroNext: document.getElementById("storyIntroNext"),
  storyIntroSkip: document.getElementById("storyIntroSkip"),
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
  loseAttempt: document.getElementById("typingCaveLoseAttempt"),
  loseCorrect: document.getElementById("typingCaveLoseCorrect"),
  loseExplanation: document.getElementById("typingCaveLoseExplanation"),
  loseMeaning: document.getElementById("typingCaveLoseMeaning"),
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
  lastMistake: null,
  monsterLeft: TYPING_CAVE_START_POSITION,
  approachSteps: 0,
  passiveTimer: 0,
  busy: false,
  gameOver: false,
  roundToken: 0
};

const world = {
  currentRealmId: "maple", realmPositions: {}, width: 1800, groundY: 520, waterY: 650,
  player: { x: 440, y: 0, vx: 0, facing: 1, speed: 250, width: 34, height: 58, onGround: true, bob: 0, walkFrame: 0, walkTimer: 0 },
  cameraX: 0, time: 0, questStep: 0, coins: 0, xp: 0, power: 0, level: 1,
  interacting: false, travelMenu: false, storyIntroOpen: false, selectedDestinationIndex: 0, portalX: 220, caveReturnX: 0,
  currentDialogueNpcId: null, currentDialogueKey: null, currentDialogueIndex: 0, insideCave: false, typingCaveOpen: false, battle: null
};

const worldBackgrounds = {
  maple: new Image(),
  forest: new Image(),
  camp: new Image(),
  ruins: new Image()
};
const worldBackgroundPaths = {
  maple: "/FYP/images/world/backgrounds/maple-town.webp?v=20261010-bgart3",
  forest: "/FYP/images/world/backgrounds/whispering-forest.webp?v=20261010-bgart3",
  camp: "/FYP/images/world/backgrounds/old-camp-road.webp?v=20261010-bgart3",
  ruins: "/FYP/images/world/backgrounds/ancient-ruins.webp?v=20261010-bgart3"
};
Object.entries(worldBackgrounds).forEach(([realmId, image]) => {
  image.decoding = "async";
  image.onload = () => console.info("[English Power Quest] World background ready:", realmId);
  image.onerror = () => console.warn("[English Power Quest] World background missing; using procedural fallback:", realmId);
  image.src = worldBackgroundPaths[realmId];
});

const WORLD_SAVE_KEY = "englishPowerQuest.world.v2";
const STORY_INTRO_SEEN_KEY = "englishPowerQuest.storyIntro.seen.v2";
let storyIntroPage = 0;
let storyMode = "intro";
let storySequence = [];
let storyCompletionCallback = null;
const BATTLE_KEY = "englishPowerQuest.battle";
const ESCAPE_KEY = "englishPowerQuest.escape.v1";

function saveWorldState(overrides = {}) {
  const destination = destinations.find(item => item.id === world.currentRealmId) || destinations[0];
  const playerX = overrides.playerX !== undefined ? Number(overrides.playerX) : world.player.x;
  const insideCave = overrides.insideCave !== undefined ? Boolean(overrides.insideCave) : world.insideCave;
  const realmPositions = {
    ...world.realmPositions,
    [world.currentRealmId]: { playerX, insideCave, caveReturnX: world.caveReturnX }
  };
  world.realmPositions = realmPositions;
  localStorage.setItem(WORLD_SAVE_KEY, JSON.stringify({
    storyVersion: 1,
    currentRealmId: world.currentRealmId, realmPositions, playerX,
    portalX: destination.portalX, insideCave, caveReturnX: world.caveReturnX,
    questStep: world.questStep, coins: world.coins, xp: world.xp, power: world.power, level: world.level,
    defeatedEnemyIds: enemies.filter(enemy => enemy.defeated).map(enemy => enemy.id),
    ...overrides
  }));
}

function loadWorldState() {
  try {
    const saved = JSON.parse(localStorage.getItem(WORLD_SAVE_KEY) || "null");
    if (!saved) return;
    const knownRealm = destinations.find(item => item.id === saved.currentRealmId);
    const storedPositions = saved.realmPositions && typeof saved.realmPositions === "object" ? saved.realmPositions : {};
    let realmId = knownRealm ? knownRealm.id : "";
    let migratedX = Number(saved.playerX);
    if (!Number.isFinite(migratedX)) migratedX = 440;

    if (!knownRealm) {
      const oldPortalX = Number(saved.portalX);
      // Only the pre-realm version used a single portal at x≈5500. In the
      // immediately previous build each destination had its own global x, so
      // classify those saves by the player's old map section first.
      if (Number.isFinite(oldPortalX) && oldPortalX >= 5000 && migratedX >= 4800 && Math.abs(migratedX - oldPortalX) < 180) {
        realmId = "maple"; migratedX = 440;
      } else if (saved.insideCave || migratedX >= 3400) {
        realmId = "ruins"; migratedX = migratedX >= 3400 ? migratedX - 3400 : 900;
      } else if (migratedX >= 2350) {
        realmId = "camp"; migratedX -= 2350;
      } else if (migratedX >= 1250) {
        realmId = "forest"; migratedX -= 1250;
      } else {
        realmId = "maple";
      }
    }

    const destination = destinations.find(item => item.id === realmId) || destinations[0];
    world.currentRealmId = destination.id;
    world.width = destination.width;
    world.realmPositions = storedPositions;
    world.portalX = destination.portalX;
    const savedPosition = storedPositions[destination.id];
    const hasLocalPosition = savedPosition && Number.isFinite(Number(savedPosition.playerX));
    world.insideCave = hasLocalPosition && savedPosition.insideCave !== undefined
      ? Boolean(savedPosition.insideCave) : Boolean(saved.insideCave);
    world.caveReturnX = Number(savedPosition?.caveReturnX || saved.caveReturnX) || 0;

    if (world.insideCave) {
      const cave = landmarks.find(item => item.realmId === world.currentRealmId && item.type === "cave");
      if (!world.caveReturnX && cave) world.caveReturnX = cave.x + 120;
      world.player.x = 440;
    } else {
      const position = hasLocalPosition ? Number(savedPosition.playerX) : migratedX;
      world.player.x = clamp(position, 70, world.width - 90);
    }
    const needsStoryMigration = (Number(saved.storyVersion) || 0) < 1;
    world.questStep = needsStoryMigration ? 0 : (Number(saved.questStep) || 0);
    world.coins = Number(saved.coins) || 0;
    world.xp = Number(saved.xp) || 0;
    world.power = Number(saved.power) || 0;
    world.level = Number(saved.level) || 1;

    if (needsStoryMigration) {
      // The previous quest steps were only a short prototype, not the new
      // four-world narrative. Keep earned stats but restart the main story at home.
      const home = destinations.find(item => item.id === "maple") || destinations[0];
      world.currentRealmId = home.id;
      world.width = home.width;
      world.portalX = home.portalX;
      world.player.x = home.spawnX;
      world.insideCave = false;
      world.caveReturnX = 0;
      world.realmPositions = {
        ...storedPositions,
        [home.id]: { playerX: home.spawnX, insideCave: false, caveReturnX: 0 }
      };
    }

    const defeated = new Set(Array.isArray(saved.defeatedEnemyIds) ? saved.defeatedEnemyIds : []);
    enemies.forEach(enemy => { enemy.defeated = defeated.has(enemy.id); });
    if (needsStoryMigration) saveWorldState();
  } catch (error) {
    console.warn("Unable to restore map progress.", error);
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

// The supplied walking PNGs contain transparent pixels inside parts of the
// cloak/body. Repair only small, fully enclosed transparent holes after load.
// Background-connected transparency (between legs and around the flowing cape)
// is preserved, so the sprite silhouette and transparent background remain.
function repairEnclosedSpriteHoles(img) {
  if (img.dataset.alphaRepairDone === "true") return;
  img.dataset.alphaRepairDone = "true";

  try {
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    if (!width || !height) return;

    const repairCanvas = document.createElement("canvas");
    repairCanvas.width = width;
    repairCanvas.height = height;
    const repairCtx = repairCanvas.getContext("2d", { willReadFrequently: true });
    repairCtx.clearRect(0, 0, width, height);
    repairCtx.drawImage(img, 0, 0);

    const imageData = repairCtx.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    const total = width * height;
    const outside = new Uint8Array(total);
    const queue = new Int32Array(total);
    const transparentThreshold = 24;
    let head = 0;
    let tail = 0;

    const enqueueOutside = (index) => {
      if (!outside[index] && pixels[index * 4 + 3] < transparentThreshold) {
        outside[index] = 1;
        queue[tail++] = index;
      }
    };

    // Flood-fill transparency connected to the outer image border.
    for (let x = 0; x < width; x += 1) {
      enqueueOutside(x);
      enqueueOutside((height - 1) * width + x);
    }
    for (let y = 0; y < height; y += 1) {
      enqueueOutside(y * width);
      enqueueOutside(y * width + width - 1);
    }

    while (head < tail) {
      const index = queue[head++];
      const x = index % width;
      const y = Math.floor(index / width);
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (Math.abs(dx) + Math.abs(dy) !== 1) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          enqueueOutside(ny * width + nx);
        }
      }
    }

    const filled = new Uint8Array(total);
    let repairedPixels = 0;

    // Find internal alpha holes using four-way connectivity. This prevents a
    // single diagonal contact with the outside background from hiding a hole.
    // Large regions remain untouched to avoid filling real gaps between limbs.
    for (let start = 0; start < total; start += 1) {
      if (outside[start] || filled[start] || pixels[start * 4 + 3] >= transparentThreshold) continue;

      head = 0;
      tail = 0;
      queue[tail++] = start;
      filled[start] = 2;
      const component = [];

      while (head < tail) {
        const index = queue[head++];
        component.push(index);
        const x = index % width;
        const y = Math.floor(index / width);
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (Math.abs(dx) + Math.abs(dy) !== 1) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            const next = ny * width + nx;
            if (!outside[next] && !filled[next] && pixels[next * 4 + 3] < transparentThreshold) {
              filled[next] = 2;
              queue[tail++] = next;
            }
          }
        }
      }

      if (component.length > 6000) {
        component.forEach(index => { filled[index] = 1; });
        continue;
      }

      // Seed the hole edge with the nearest adjacent opaque pixel colour.
      head = 0;
      tail = 0;
      for (const index of component) {
        const x = index % width;
        const y = Math.floor(index / width);
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (Math.abs(dx) + Math.abs(dy) !== 1) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            const neighbour = ny * width + nx;
            if (pixels[neighbour * 4 + 3] >= transparentThreshold) {
              const p = index * 4;
              const n = neighbour * 4;
              pixels[p] = pixels[n];
              pixels[p + 1] = pixels[n + 1];
              pixels[p + 2] = pixels[n + 2];
              pixels[p + 3] = 255;
              filled[index] = 3;
              queue[tail++] = index;
              repairedPixels += 1;
              break;
            }
          }
          if (filled[index] === 3) break;
        }
      }

      // Propagate edge colours through the remaining transparent pixels in the hole.
      while (head < tail) {
        const index = queue[head++];
        const x = index % width;
        const y = Math.floor(index / width);
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (Math.abs(dx) + Math.abs(dy) !== 1) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            const next = ny * width + nx;
            if (filled[next] !== 2) continue;
            const p = next * 4;
            const n = index * 4;
            pixels[p] = pixels[n];
            pixels[p + 1] = pixels[n + 1];
            pixels[p + 2] = pixels[n + 2];
            pixels[p + 3] = 255;
            filled[next] = 3;
            queue[tail++] = next;
            repairedPixels += 1;
          }
        }
      }

      // Leave any unseeded component untouched rather than inventing colours.
      component.forEach(index => {
        if (filled[index] === 2) {
          filled[index] = 1;
          pixels[index * 4 + 3] = 0;
        }
      });
    }

    if (repairedPixels > 0) {
      repairCtx.putImageData(imageData, 0, 0);
      img.dataset.alphaRepairDataUrl = repairCanvas.toDataURL("image/png");
      img.src = img.dataset.alphaRepairDataUrl;
      img.dataset.alphaRepairDataUrl = "";
      console.debug("[English Power Quest] Repaired enclosed sprite holes:", repairedPixels);
    }
  } catch (error) {
    // If canvas pixel access is unavailable, keep the original image usable.
    console.warn("[English Power Quest] Sprite transparency repair skipped.", error);
  }
}

for (const direction of ["right", "left"]) {
  playerWalkFrames[direction].forEach((img, index) => {
    const frameName = "player_walk_" + direction + "_" + (index + 1);
    img.onload = () => repairEnclosedSpriteHoles(img);
    img.onerror = () => {
      // The detailed PNG frames are preferred. Keep the SVG frames as a safe fallback.
      if (img.dataset.svgFallbackTried !== "true") {
        img.dataset.svgFallbackTried = "true";
        img.src = "/FYP/images/player_walk_frames/svg_frames/" + frameName + ".svg?v=20261010-assets3";
        return;
      }
      console.warn("[English Power Quest] Unable to load player frame:", frameName);
    };
    img.src = "/FYP/images/player_walk_frames/png_frames/" + frameName + ".png?v=20261010-assets3";
  });
}

function hasWalkFrame(direction, index) {
  const frame = playerWalkFrames[direction][index];
  return Boolean(frame && frame.complete && frame.naturalWidth > 0);
}

const npcs = [
  { id: "elder", realmId: "maple", x: 880, name: "Elder Rowan", title: "Village Elder", titleKey: "npc.elder.title", nameKey: "npc.elder.name", dialogueKeys: ["npc.elder.1","npc.elder.2","npc.elder.3"], color: "#c79b6d", dialogue: ["Welcome to Maple Town, traveller.","The old road beyond the forest has gone silent.","If you want to help, follow the lanterns and learn the words of the road."] },
  { id: "mira", realmId: "forest", x: 790, name: "Mira", title: "Wandering Merchant", titleKey: "npc.mira.title", nameKey: "npc.mira.name", dialogueKeys: ["npc.mira.1","npc.mira.2","npc.mira.3"], color: "#c57f62", dialogue: ["You are heading into Whispering Forest, aren't you?","Remember: understanding a message can be more useful than a sharp sword.","I will wait here until you return."] },
  { id: "tala", realmId: "camp", x: 900, name: "Tala", title: "Camp Guide", titleKey: "npc.tala.title", nameKey: "npc.tala.name", dialogueKeys: ["npc.tala.1","npc.tala.2","npc.tala.3"], color: "#8c9d68", dialogue: ["The old road is safest when you read every sign.","Listen for the wind and watch the firelight; the trail changes after sunset.","Rest here, then carry what you have learned into the ruins."] },
  { id: "kai", realmId: "ruins", x: 870, name: "Kai", title: "System Keeper", titleKey: "npc.kai.title", nameKey: "npc.kai.name", dialogueKeys: ["npc.kai.1","npc.kai.2","npc.kai.3"], color: "#5f9db0", dialogue: ["These ruins belonged to the old network builders.","Their signs are written in technical English.","Bring me the right words and I can reopen the gate."] }
];

const landmarks = [
  { realmId: "maple", x: 360, type: "sign", text: "MAPLE TOWN →" },
  { realmId: "maple", x: 600, type: "house", variant: "cottage" },
  { realmId: "maple", x: 835, type: "house", variant: "elder" },
  { realmId: "maple", x: 1080, type: "house", variant: "shop" },
  { realmId: "maple", x: 1430, type: "bridge" },
  { realmId: "forest", x: 350, type: "sign", text: "WHISPERING FOREST →" },
  { realmId: "forest", x: 620, type: "house", variant: "cottage" },
  { realmId: "forest", x: 990, type: "bridge" },
  { realmId: "forest", x: 1510, type: "tower" },
  { realmId: "camp", x: 355, type: "sign", text: "OLD CAMP ROAD →" },
  { realmId: "camp", x: 680, type: "camp" },
  { realmId: "camp", x: 1190, type: "bridge" },
  { realmId: "camp", x: 1580, type: "tower" },
  { realmId: "ruins", x: 340, type: "sign", text: "ANCIENT RUINS →" },
  { realmId: "ruins", x: 630, type: "tower" },
  { realmId: "ruins", x: 930, type: "ruins" },
  { realmId: "ruins", x: 1250, type: "gate" },
  { realmId: "ruins", x: 1680, type: "cave" },
  { realmId: "ruins", x: 1940, type: "typingCave" }
];

const destinations = [
  { id: "maple", name: "Maple Town", nameKey: "destination.maple.name", category: "SAFE HAVEN", categoryKey: "destination.safe", description: "A peaceful village where your adventure and first words begin.", descriptionKey: "destination.maple.description", scene: "maple", width: 1800, spawnX: 440, portalX: 220 },
  { id: "forest", name: "Whispering Forest", nameKey: "destination.forest.name", category: "VOCABULARY TRAIL", categoryKey: "destination.vocab", description: "A standalone enchanted forest with lantern paths and hidden words.", descriptionKey: "destination.forest.description", scene: "forest", width: 2100, spawnX: 440, portalX: 220 },
  { id: "camp", name: "Old Camp Road", nameKey: "destination.camp.name", category: "SURVIVAL ROUTE", categoryKey: "destination.survival", description: "A separate sunset wilderness with a campfire, pine trees and a guide.", descriptionKey: "destination.camp.description", scene: "camp", width: 1950, spawnX: 440, portalX: 220 },
  { id: "ruins", name: "Ancient Ruins", nameKey: "destination.ruins.name", category: "ANCIENT CHALLENGE", categoryKey: "destination.challenge", description: "A separate ancient realm with stone towers, a sealed gate and two caves.", descriptionKey: "destination.ruins.description", scene: "ruins", width: 2200, spawnX: 440, portalX: 1510 }
];

const enemies = [
  { id: "slime-01", realmId: "maple", x: 1435, type: "slime", name: "Word Slime", difficulty: "EASY", hp: 60, damage: 10, xp: 20, coins: 10, defeated: false },
  { id: "bat-01", realmId: "forest", x: 1290, type: "bat", name: "Confusion Bat", difficulty: "EASY", hp: 70, damage: 10, xp: 25, coins: 12, defeated: false },
  { id: "road-guardian-01", realmId: "camp", x: 1370, type: "guardian", name: "Road Guardian", difficulty: "MEDIUM", hp: 85, damage: 11, xp: 28, coins: 14, defeated: false },
  { id: "guardian-01", realmId: "ruins", x: 1150, type: "guardian", name: "Grammar Guardian", difficulty: "MEDIUM", hp: 100, damage: 12, xp: 30, coins: 15, defeated: false },
  { id: "cave-wraith-01", realmId: "ruins", x: 810, type: "wraith", name: "Cave Wraith", difficulty: "MEDIUM", hp: 110, damage: 14, xp: 45, coins: 20, defeated: false, caveOnly: true }
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

  if (world.storyIntroOpen) {
    if (k === "enter" || k === " ") {
      e.preventDefault();
      if (!e.repeat) advanceStoryIntro();
    } else if (k === "escape") {
      e.preventDefault();
      if (!e.repeat) finishStoryIntro();
    }
    return;
  }

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
ui.storyIntroNext.addEventListener("click", advanceStoryIntro);
ui.storyIntroSkip.addEventListener("click", finishStoryIntro);

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
    world.currentDialogueKey = null;
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
    if (npc.realmId !== world.currentRealmId) continue;
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
    if (enemy.realmId !== world.currentRealmId) continue;
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

function splitStoryParagraph(paragraph, maxFrames = 3) {
  const parts = String(paragraph || "")
    .match(/[^.!?。！？]+[.!?。！？]*/g)
    ?.map(part => part.trim())
    .filter(Boolean) || [String(paragraph || "")];
  if (parts.length <= maxFrames) return parts;

  const frames = [];
  const perFrame = Math.ceil(parts.length / maxFrames);
  for (let i = 0; i < parts.length; i += perFrame) {
    frames.push(parts.slice(i, i + perFrame).join(" "));
  }
  return frames.slice(0, maxFrames);
}

function storyPortraitSource(characterId) {
  if (characterId === "alex") {
    return {
      src: "/FYP/images/player_walk_frames/png_frames/Player_Stand.png?v=20261010-mangastory1",
      kind: "pixel"
    };
  }

  const portraits = {
    rowan: `<g stroke-linejoin="round" stroke-linecap="round">
      <path d="M46 348 L58 242 Q69 198 103 184 L193 184 Q232 205 245 348Z" fill="#513b36" stroke="#191a27" stroke-width="9"/>
      <path d="M72 233 L100 199 L120 260 L103 345 L63 345Z" fill="#ac8657" stroke="#e0be7b" stroke-width="4"/>
      <path d="M204 229 L180 197 L158 263 L184 344 L236 345Z" fill="#7c6046" stroke="#e0be7b" stroke-width="4"/>
      <path d="M114 179 L115 154 L180 154 L182 197 L148 218Z" fill="#b88867" stroke="#6a493e" stroke-width="5"/>
      <path d="M89 107 Q83 48 139 43 Q201 43 207 111 L196 166 Q171 198 143 193 Q105 182 94 150Z" fill="#e5c29a" stroke="#704f43" stroke-width="7"/>
      <path d="M86 113 Q75 62 112 33 Q149 8 189 39 Q220 60 207 117 L193 91 L180 64 L163 86 L141 65 L117 93 L105 128Z" fill="#d8d6c5" stroke="#56576b" stroke-width="8"/>
      <path d="M111 130 Q115 155 139 164 L157 164 Q181 153 185 129 Q174 145 160 139 L148 150 L137 139 Q124 146 111 130Z" fill="#f1ead8" stroke="#8a857e" stroke-width="5"/>
      <path d="M111 114 L130 114 M165 114 L185 113" stroke="#5b4538" stroke-width="7"/>
      <ellipse cx="125" cy="118" rx="5" ry="7" fill="#2d2d36"/><ellipse cx="173" cy="117" rx="5" ry="7" fill="#2d2d36"/>
      <path d="M142 120 L137 137 L148 139" fill="none" stroke="#9c7053" stroke-width="4"/>
      <path d="M116 169 L143 183 L176 165" fill="none" stroke="#fff0d9" stroke-width="8"/>
      <path d="M39 348 L29 104 Q27 77 48 72" fill="none" stroke="#8b6844" stroke-width="9"/>
      <path d="M28 80 Q18 59 43 51 Q57 65 42 82Z" fill="#f4ca72" stroke="#be8c44" stroke-width="5"/>
    </g>`,
    mira: `<g stroke-linejoin="round" stroke-linecap="round">
      <path d="M53 348 L65 242 Q78 195 112 184 L183 184 Q221 201 235 348Z" fill="#3d594f" stroke="#172c35" stroke-width="9"/>
      <path d="M77 233 L106 199 L123 257 L102 346 L62 346Z" fill="#6d967d" stroke="#b6d9aa" stroke-width="4"/>
      <path d="M205 233 L180 199 L160 260 L186 346 L234 346Z" fill="#284e49" stroke="#a5c7a4" stroke-width="4"/>
      <path d="M121 171 L120 147 L177 147 L180 190 L149 206Z" fill="#e3b391" stroke="#8b574a" stroke-width="5"/>
      <path d="M93 97 Q92 45 145 42 Q202 46 202 105 L190 158 Q168 186 143 180 Q104 173 95 141Z" fill="#e8b794" stroke="#70413d" stroke-width="7"/>
      <path d="M85 109 Q70 62 112 35 Q156 4 193 43 L204 107 L186 89 L172 67 L150 82 L128 66 L105 100Z" fill="#79483e" stroke="#372b35" stroke-width="8"/>
      <path d="M62 88 L97 39 Q133 6 190 27 L238 76 L220 91 L102 75Z" fill="#526e4d" stroke="#1e393b" stroke-width="9"/>
      <path d="M107 78 L201 67 L216 83 L101 96Z" fill="#b4cb83" stroke="#354e3d" stroke-width="5"/>
      <path d="M185 28 Q211 3 229 30 L209 58Z" fill="#e8d9a0" stroke="#71815c" stroke-width="4"/>
      <ellipse cx="122" cy="114" rx="7" ry="9" fill="#245b54"/><ellipse cx="170" cy="113" rx="7" ry="9" fill="#245b54"/>
      <path d="M113 102 L132 99 M162 99 L182 102" stroke="#623b37" stroke-width="6"/>
      <path d="M144 117 L137 135 L149 138" fill="none" stroke="#ab775e" stroke-width="4"/>
      <path d="M132 153 Q149 164 166 151" fill="none" stroke="#a14f4c" stroke-width="4"/>
      <path d="M67 251 L94 211 L113 240 L101 277 L80 284Z" fill="#c28f54" stroke="#72523d" stroke-width="5"/>
      <path d="M206 244 L222 217 L238 231 L236 273 L215 285Z" fill="#8da875" stroke="#375249" stroke-width="5"/>
    </g>`,
    tala: `<g stroke-linejoin="round" stroke-linecap="round">
      <path d="M46 348 L57 240 Q72 196 105 185 L190 185 Q230 205 245 348Z" fill="#4b6042" stroke="#182a2b" stroke-width="9"/>
      <path d="M67 231 L101 197 L123 259 L102 346 L58 346Z" fill="#849969" stroke="#cfca90" stroke-width="4"/>
      <path d="M208 235 L182 197 L160 258 L185 346 L241 346Z" fill="#314a3d" stroke="#9aab77" stroke-width="4"/>
      <path d="M118 174 L117 146 L178 146 L182 193 L147 209Z" fill="#dfb18b" stroke="#815b4b" stroke-width="5"/>
      <path d="M92 96 Q89 45 145 43 Q201 45 205 101 L191 158 Q167 186 140 178 Q105 171 96 143Z" fill="#e4b28a" stroke="#6f473c" stroke-width="7"/>
      <path d="M84 111 Q69 69 101 41 L130 30 L190 48 L213 93 L196 115 L182 80 L162 101 L143 77 L118 101 L105 133Z" fill="#4e342e" stroke="#241f2b" stroke-width="8"/>
      <path d="M75 170 L198 155 L218 188 L89 206Z" fill="#983f3c" stroke="#3c2530" stroke-width="8"/>
      <path d="M92 167 L194 157 L200 174 L97 188Z" fill="#d77654" stroke="#60303a" stroke-width="4"/>
      <ellipse cx="122" cy="115" rx="7" ry="9" fill="#3f5a48"/><ellipse cx="173" cy="114" rx="7" ry="9" fill="#3f5a48"/>
      <path d="M111 102 L132 99 M162 99 L184 101" stroke="#57342e" stroke-width="6"/>
      <path d="M145 117 L139 135 L151 138" fill="none" stroke="#a86d55" stroke-width="4"/>
      <path d="M132 153 Q149 164 169 149" fill="none" stroke="#9f4942" stroke-width="4"/>
      <path d="M39 248 L55 240 L56 346 L40 346Z" fill="#70513a" stroke="#302a26" stroke-width="5"/>
      <path d="M30 229 L64 229 L71 265 L24 265Z" fill="#f7c765" stroke="#5b4430" stroke-width="6"/>
      <path d="M39 237 L56 237 L56 256 L39 256Z" fill="#ffe9a6"/>
      <path d="M68 220 Q45 185 67 165" stroke="#ffcc70" stroke-width="4" fill="none"/>
    </g>`,
    kai: `<g stroke-linejoin="round" stroke-linecap="round">
      <path d="M46 348 L55 242 Q72 201 105 185 L194 185 Q230 209 245 348Z" fill="#263d59" stroke="#121b31" stroke-width="9"/>
      <path d="M70 237 L101 199 L122 257 L104 346 L60 346Z" fill="#356a83" stroke="#83d8e5" stroke-width="4"/>
      <path d="M206 234 L182 198 L160 260 L187 346 L241 346Z" fill="#142b47" stroke="#4d8cb2" stroke-width="4"/>
      <path d="M119 173 L117 144 L178 144 L181 195 L148 208Z" fill="#d6b29c" stroke="#725966" stroke-width="5"/>
      <path d="M90 103 Q89 47 145 39 Q203 47 202 104 L191 157 Q171 181 142 177 Q104 171 94 143Z" fill="#e2c8bb" stroke="#6c6a86" stroke-width="7"/>
      <path d="M82 117 Q71 63 107 37 L143 22 L191 42 L214 93 L199 127 L186 88 L164 101 L144 72 L124 97 L106 124Z" fill="#8ba9ce" stroke="#344e73" stroke-width="8"/>
      <path d="M110 110 L132 106 M161 106 L183 109" stroke="#596fa7" stroke-width="6"/>
      <ellipse cx="121" cy="118" rx="7" ry="10" fill="#286eae"/><ellipse cx="172" cy="117" rx="7" ry="10" fill="#286eae"/>
      <ellipse cx="123" cy="120" rx="3" ry="5" fill="#e3f8ff"/><ellipse cx="174" cy="119" rx="3" ry="5" fill="#e3f8ff"/>
      <path d="M145 120 L138 138 L150 139" fill="none" stroke="#a97e76" stroke-width="4"/>
      <path d="M128 152 Q149 161 170 150" fill="none" stroke="#7f5660" stroke-width="4"/>
      <path d="M79 202 L109 185 L138 212 L122 266 L90 250Z" fill="#182b45" stroke="#83d8e5" stroke-width="4"/>
      <path d="M158 205 L185 187 L216 216 L203 263 L171 249Z" fill="#13243e" stroke="#83d8e5" stroke-width="4"/>
      <path d="M191 261 L228 248 L246 283 L214 314 L185 295Z" fill="#272b4a" stroke="#c4b1ff" stroke-width="4"/>
      <path d="M205 278 L218 267 L231 281 L219 297Z" fill="#71e5ee"/>
    </g>`,
    book: `<g stroke-linejoin="round" stroke-linecap="round">
      <path d="M46 113 L144 50 L252 97 L156 168Z" fill="#0e1c3d" stroke="#d9cbff" stroke-width="8"/>
      <path d="M46 113 L45 252 L154 314 L156 168Z" fill="#132955" stroke="#6be9ff" stroke-width="7"/>
      <path d="M156 168 L252 97 L254 232 L154 314Z" fill="#1e3975" stroke="#6be9ff" stroke-width="7"/>
      <path d="M63 131 L143 82 L140 147 L64 199Z" fill="#223e78" stroke="#f1d683" stroke-width="4"/>
      <path d="M174 177 L234 131 L235 210 L175 252Z" fill="#2b4b8f" stroke="#f1d683" stroke-width="4"/>
      <path d="M150 91 L174 130 L155 173 L133 137Z" fill="#b1faff" stroke="#68e7ff" stroke-width="5"/>
      <path d="M155 120 L179 151 L155 184 L131 151Z" fill="#e9ffff" stroke="#67ecff" stroke-width="5"/>
      <path d="M155 25 L164 57 M226 49 L206 74 M84 58 L109 81 M274 155 L247 159 M84 235 L112 223" stroke="#6be9ff" stroke-width="6"/>
      <circle cx="155" cy="155" r="113" fill="none" stroke="#70f2ff" stroke-width="3" stroke-dasharray="7 12"/>
    </g>`,
    shadow: `<g stroke-linejoin="round" stroke-linecap="round">
      <path d="M35 349 Q39 248 76 207 L55 131 L91 106 L102 48 L139 80 L176 49 L191 106 L224 128 L212 205 Q252 242 265 349Z" fill="#141226" stroke="#3e246e" stroke-width="10"/>
      <path d="M61 210 L78 158 L111 187 L143 157 L183 186 L219 152 L232 223 L200 320 L97 328Z" fill="#242044" stroke="#6a3a9e" stroke-width="7"/>
      <path d="M91 148 L122 132 L143 148 L165 131 L201 148 L181 176 L143 187 L107 176Z" fill="#6e42a5"/>
      <path d="M105 154 L131 148 L125 165Z M157 149 L188 154 L168 166Z" fill="#b9f3ff"/>
      <path d="M112 213 L138 223 L126 256 L109 247Z M158 223 L182 210 L188 246 L169 258Z" fill="#4c2a83"/>
      <path d="M127 275 L145 287 L163 276 L155 302 L139 306Z" fill="#bd5dff"/>
      <path d="M81 221 L60 261 M209 221 L237 259" stroke="#a66bff" stroke-width="6"/>
    </g>`
  };
  const art = portraits[characterId] || portraits.book;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="360" viewBox="0 0 300 360">
    <defs>
      <linearGradient id="glow" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e5fbff"/><stop offset=".45" stop-color="#77deff"/><stop offset="1" stop-color="#8f5bff"/></linearGradient>
      <radialGradient id="halo"><stop stop-color="#65dfff" stop-opacity=".34"/><stop offset="1" stop-color="#65dfff" stop-opacity="0"/></radialGradient>
      <linearGradient id="coat" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#50688f"/><stop offset="1" stop-color="#171c32"/></linearGradient>
    </defs>
    <ellipse cx="150" cy="185" rx="135" ry="170" fill="url(#halo)"/>
    <path d="M150 8 L163 28 L185 20 L185 45 L213 41 L204 65 L232 77 L210 95" fill="none" stroke="url(#glow)" stroke-width="3" opacity=".55"/>
    <path d="M43 298 L22 321 L68 315 M255 294 L279 320 L234 313" fill="none" stroke="#74dcff" stroke-width="3" opacity=".45"/>
    ${art}
  </svg>`;
  return { src: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg), kind: "illustration" };
}

function splitStoryParagraph(paragraph, maxFrames = 3) {
  const parts = String(paragraph || "")
    .match(/[^.!?。！？]+[.!?。！？]*/g)
    ?.map(part => part.trim())
    .filter(Boolean) || [String(paragraph || "")];
  if (parts.length <= maxFrames) return parts;
  const frames = [];
  const perFrame = Math.ceil(parts.length / maxFrames);
  for (let i = 0; i < parts.length; i += perFrame) {
    frames.push(parts.slice(i, i + perFrame).join(" "));
  }
  return frames.slice(0, maxFrames);
}

function buildIntroStoryboard() {
  const sequence = [];
  for (let page = 1; page <= 3; page += 1) {
    const body = t(`story.intro.page${page}.body`);
    const frames = splitStoryParagraph(body, 3);
    frames.forEach((frame, frameIndex) => {
      const firstPage = page === 1;
      const scene = page < 3 ? "prologue" : "maple";
      sequence.push({
        titleKey: `story.intro.page${page}.title`,
        body: frame,
        character: page === 3 && frameIndex === frames.length - 1 ? "book" : "alex",
        speaker: page === 3 && frameIndex === frames.length - 1
          ? (getLanguage() === "zh" ? "系统之书" : "THE SYSTEM BOOK")
          : "ALEX LIN",
        scene,
        location: page === 1 ? "CAMPUS · 11:47 PM" : page === 2 ? "CAMPUS · THE LAST WORD" : "AETHERIA · MAPLE TOWN",
        camera: frameIndex === 0 ? "close" : frameIndex === 1 ? "pan" : "wide",
        effect: page === 2 ? "impact" : page === 3 ? "magic" : "tension",
        sfx: page === 2 ? (getLanguage() === "zh" ? "轰——！" : "THOOM!") : page === 3 ? "SHIIING!" : ""
      });
    });
  }
  return sequence;
}

function beginStoryboard(sequence, mode = "chapter", callback = null) {
  world.storyIntroOpen = true;
  storyMode = mode;
  storySequence = sequence;
  storyIntroPage = 0;
  storyCompletionCallback = callback;
  keys.clear();
  touch.left = false;
  touch.right = false;
  ui.dialogue.classList.add("hidden");
  renderStoryIntro();
  ui.storyIntroOverlay.classList.remove("hidden");
}

function startChapterStoryboard(npc, beat, dialogueKey) {
  const fullText = t(dialogueKey);
  const frames = splitStoryParagraph(fullText, 3);
  const titleKey = beat.titleKey || npc.titleKey;
  const story = frames.map((body, index) => ({
    titleKey,
    body,
    character: npc.id,
    speaker: t(npc.nameKey) + " · " + t(npc.titleKey),
    scene: npc.realmId,
    location: t(({ maple: "location.maple", forest: "location.forest", camp: "location.camp", ruins: "location.ruins" })[npc.realmId]),
    camera: index === 0 ? "close" : index === frames.length - 1 ? "wide" : "pan",
    effect: npc.id === "kai" && index === frames.length - 1 ? "magic" : index === 0 ? "tension" : "impact",
    sfx: index === 0 ? "" : npc.id === "kai" ? "SHIIING!" : "WHUMP!"
  }));
  beginStoryboard(story, "chapter");
}

function renderStoryIntro() {
  if (!storySequence.length) return;
  const slide = storySequence[storyIntroPage] || storySequence[0];
  const pageNumber = storyIntroPage + 1;
  const total = storySequence.length;
  const isIntro = storyMode === "intro";
  const isLast = pageNumber === total;
  const portrait = storyPortraitSource(slide.character || "alex");

  ui.storyIntroKicker.textContent = isIntro
    ? t("story.intro.kicker")
    : (getLanguage() === "zh" ? "主线剧情 · 动态分镜" : "MAIN STORY · CINEMATIC");
  ui.storyIntroCounter.textContent = getLanguage() === "zh"
    ? `${isIntro ? "序章" : "剧情"} · 分镜 ${pageNumber} / ${total}`
    : `${isIntro ? "PROLOGUE" : "STORY"} · PANEL ${String(pageNumber).padStart(2, "0")} / ${total}`;
  ui.storyIntroTitle.textContent = t(slide.titleKey);
  ui.storyIntroBody.textContent = slide.body;
  ui.storyIntroProgress.style.width = `${(pageNumber / total) * 100}%`;
  ui.storyIntroNext.textContent = isIntro
    ? t(isLast ? "story.intro.start" : "story.intro.next")
    : (getLanguage() === "zh" ? (isLast ? "继续探索" : "下一格 →") : (isLast ? "RETURN TO EXPLORATION" : "NEXT PANEL →"));
  ui.storyIntroSkip.textContent = getLanguage() === "zh" ? "跳过演出" : "SKIP SCENE";
  ui.storyboardSpeaker.textContent = slide.speaker || "ALEX LIN";
  ui.storyboardFrameTag.textContent = `${isIntro ? "PROLOGUE" : "CHAPTER"} · ${String(pageNumber).padStart(2, "0")}`;
  ui.storyboardLocation.textContent = slide.location || t("location.maple");
  ui.storyIntroPortraitImage.src = portrait.src;
  ui.storyIntroPortraitImage.dataset.kind = portrait.kind;
  ui.storyIntroPortraitImage.alt = slide.speaker || "Story character";
  ui.storyIntroCanvas.dataset.scene = slide.scene || "prologue";
  ui.storyIntroCanvas.dataset.camera = slide.camera || "wide";
  ui.storyIntroCanvas.dataset.effect = slide.effect || "magic";
  ui.storyIntroSceneArt.style.backgroundImage = slide.scene && slide.scene !== "prologue" && worldBackgroundPaths[slide.scene]
    ? `url("${worldBackgroundPaths[slide.scene]}")`
    : "none";
  ui.storyboardSfx.textContent = slide.sfx || "";
  ui.storyboardSfx.classList.toggle("hidden", !slide.sfx);
  ui.storyIntroCanvas.classList.remove("storyboard-hit", "storyboard-flash-active", "storyboard-magic-active");
  void ui.storyIntroCanvas.offsetWidth;
  if (slide.effect === "impact") ui.storyIntroCanvas.classList.add("storyboard-hit");
  if (slide.effect === "magic") ui.storyIntroCanvas.classList.add("storyboard-flash-active", "storyboard-magic-active");
}

function openStoryIntroIfNew() {
  let seen = false;
  try { seen = localStorage.getItem(STORY_INTRO_SEEN_KEY) === "1"; }
  catch (error) { console.warn("Story intro preference is unavailable.", error); }
  if (seen) return;
  beginStoryboard(buildIntroStoryboard(), "intro");
}

function advanceStoryIntro() {
  if (!world.storyIntroOpen) return;
  if (storyIntroPage < storySequence.length - 1) {
    storyIntroPage += 1;
    renderStoryIntro();
  } else {
    finishStoryIntro();
  }
}

function finishStoryIntro() {
  if (!world.storyIntroOpen) return;
  const finishedMode = storyMode;
  world.storyIntroOpen = false;
  ui.storyIntroOverlay.classList.add("hidden");
  if (finishedMode === "intro") {
    try { localStorage.setItem(STORY_INTRO_SEEN_KEY, "1"); }
    catch (error) { console.warn("Story intro preference could not be saved.", error); }
  } else if (finishedMode === "chapter") {
    world.interacting = false;
    world.currentDialogueNpcId = null;
    world.currentDialogueKey = null;
    ui.dialogue.classList.add("hidden");
  }
  keys.clear();
  touch.left = false;
  touch.right = false;
  const callback = storyCompletionCallback;
  storyCompletionCallback = null;
  if (typeof callback === "function") callback();
}



function interact() {
  if (world.interacting || world.battle || world.travelMenu || settingsIsOpen()) return;

  // Every region has a permanent portal at its own fixed coordinate.
  if (!world.insideCave && nearestWorldPortal(112)) {
    openDestinationMenu();
    return;
  }

  if (!world.insideCave) {
    const typingCave = landmarks.find(item => item.realmId === world.currentRealmId && item.type === "typingCave");
    if (typingCave && Math.abs(typingCave.x - world.player.x) < 118) {
      openTypingCave();
      return;
    }
  }

  if (world.insideCave) {
    if (Math.abs(260 - world.player.x) < 112) leaveCave();
    return;
  }

  const cave = landmarks.find(item => item.realmId === world.currentRealmId && item.type === "cave");
  if (cave && Math.abs(cave.x - world.player.x) < 105) {
    enterCave();
    return;
  }

  const npc = nearestNPC();

  if (npc) {
    world.interacting = true;
    world.currentDialogueNpcId = npc.id;
    world.currentDialogueIndex = world.questStep % npc.dialogueKeys.length;

    const storyBeats = {
      elder: { step: 0, dialogueKey: "npc.elder.story", nextStep: 1, xp: 25, coins: 0, power: 1, skill: "VOCABULARY", label: "The First Words", titleKey: "quest.first.title" },
      mira:  { step: 1, dialogueKey: "npc.mira.story",  nextStep: 2, xp: 30, coins: 5, power: 1, skill: "VOCABULARY", label: "Words in the Woods", titleKey: "quest.forest.title" },
      tala:  { step: 2, dialogueKey: "npc.tala.story",  nextStep: 3, xp: 30, coins: 5, power: 1, skill: "VOCABULARY", label: "A Promise by Firelight", titleKey: "quest.camp.title" },
      kai:   { step: 3, dialogueKey: "npc.kai.story",   nextStep: 4, xp: 40, coins: 10, power: 2, skill: "IT_ENGLISH", label: "The Language of the Lost", titleKey: "quest.ruins.title" }
    };
    const beat = storyBeats[npc.id];
    let dialogueKey = npc.dialogueKeys[world.currentDialogueIndex];
    const storyBeatTriggered = Boolean(beat && world.questStep === beat.step);

    if (storyBeatTriggered) {
      dialogueKey = beat.dialogueKey;
      world.questStep = beat.nextStep;
      world.xp += beat.xp;
      world.coins += beat.coins;
      world.power += beat.power;
      updateQuest();
      syncHUD();
      saveWorldState();
      void saveServerProgress({
        xpDelta: beat.xp,
        coinDelta: beat.coins,
        englishPowerDelta: beat.power,
        englishSkillCode: beat.skill,
        sourceType: "QUEST",
        sourceId: null,
        description: "Story chapter completed: " + beat.label
      });
    } else if (npc.id === "kai" && world.questStep >= 5) {
      dialogueKey = "npc.kai.after";
    }

    if (storyBeatTriggered) {
      startChapterStoryboard(npc, beat, dialogueKey);
      return;
    }

    world.currentDialogueKey = dialogueKey;
    ui.dialogueName.textContent = t(npc.nameKey) + " · " + t(npc.titleKey);
    ui.dialogueText.textContent = t(dialogueKey);
    ui.dialogue.classList.remove("hidden");
    return;
  }

  const sign = landmarks.find(l => l.realmId === world.currentRealmId && l.type === "sign" && Math.abs(l.x - world.player.x) < 85);
  if (sign) {
    world.interacting = true;
    world.currentDialogueNpcId = "sign";
    world.currentDialogueKey = "npc.sign.text";
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
  const cave = landmarks.find(item => item.realmId === world.currentRealmId && item.type === "cave");
  if (!cave) return;
  world.caveReturnX = cave.x + 120;
  world.insideCave = true;
  // Cave monsters respawn when the player enters the cave again.
  enemies.forEach(enemy => {
    if (enemy.realmId === world.currentRealmId && enemy.caveOnly) enemy.defeated = false;
  });
  world.player.x = 440;
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
  const cave = landmarks.find(item => item.realmId === world.currentRealmId && item.type === "cave");
  world.player.x = clamp(world.caveReturnX || (cave ? cave.x + 120 : 440), 70, world.width - 90);
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
  typingCaveState.lastMistake = null;
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
      ? "怪物追上你了。看一下本题的答案和拼写解释，再挑战一次吧。"
      : "The monster caught you. Review this word and its spelling explanation, then try again.";

    const reviewWord = typingCaveState.currentWord;
    const lastMistake = typingCaveState.lastMistake;
    typingUi.loseAttempt.textContent = isChinese
      ? "你输入的答案：" + (lastMistake ? lastMistake.typedAnswer : "本题没有提交错误答案（超时）")
      : "Your answer: " + (lastMistake ? lastMistake.typedAnswer : "No incorrect answer submitted (time ran out)");
    typingUi.loseCorrect.textContent = isChinese
      ? "正确答案：" + (lastMistake ? lastMistake.correctAnswer : String(reviewWord?.answer || "").toUpperCase())
      : "Correct answer: " + (lastMistake ? lastMistake.correctAnswer : String(reviewWord?.answer || "").toUpperCase());
    typingUi.loseExplanation.textContent = isChinese
      ? "拼写解释：" + (lastMistake
        ? lastMistake.explanation
        : "本题超时，未提交答案。请根据下方单词释义记住正确拼写。")
      : "Explanation: " + (lastMistake
        ? lastMistake.explanation
        : "Time ran out before an answer was submitted. Review the word meaning below and remember its spelling.");
    typingUi.loseMeaning.textContent = isChinese
      ? "题目释义：" + (reviewWord?.definitionZh || reviewWord?.definition || "")
      : "Definition: " + (reviewWord?.definition || "") +
        (reviewWord?.definitionZh ? " · 中文：" + reviewWord.definitionZh : "");

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
  typingCaveState.lastMistake = {
    typedAnswer: typed.toUpperCase(),
    correctAnswer: correct.toUpperCase(),
    explanation: message
  };
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
  typingCaveState.lastMistake = null;

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
      const storyEnding = world.questStep === 4;
      if (storyEnding) {
        world.questStep = 5;
        world.xp += 50;
        world.coins += 25;
        world.power += 2;
        updateQuest();
        syncHUD();
        saveWorldState();
        void saveServerProgress({
          xpDelta: 50,
          coinDelta: 25,
          englishPowerDelta: 2,
          englishSkillCode: "IT_ENGLISH",
          sourceType: "QUEST",
          sourceId: null,
          description: "Story ending: The First Real Conversation"
        });
      }
      typingUi.winTitle.textContent = storyEnding
        ? t("story.ending.title")
        : (isChinese ? "挑战成功！" : "CAVE CLEARED!");
      typingUi.winMessage.textContent = storyEnding
        ? t("story.ending.body")
        : (isChinese
          ? "三关全部完成！你成功把怪物击退，获得了全部奖励。"
          : "You completed all three levels and pushed the monster away. All rewards have been earned!");
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

function nearestWorldPortal(maxDistance = Infinity) {
  const destination = destinations.find(item => item.id === world.currentRealmId);
  if (!destination) return null;
  return Math.abs(destination.portalX - world.player.x) < maxDistance ? destination : null;
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

  world.realmPositions[world.currentRealmId] = {
    playerX: world.player.x,
    insideCave: false,
    caveReturnX: world.caveReturnX
  };
  world.currentRealmId = destination.id;
  world.width = destination.width;
  world.portalX = destination.portalX;
  world.insideCave = false;
  world.caveReturnX = 0;
  const rememberedPosition = world.realmPositions[destination.id];
  world.player.x = clamp(
    rememberedPosition && Number.isFinite(Number(rememberedPosition.playerX))
      ? Number(rememberedPosition.playerX)
      : destination.spawnX,
    70,
    world.width - 90
  );
  world.player.vx = 0;
  world.player.facing = 1;
  world.player.walkFrame = 0;
  world.player.walkTimer = 0;

  // Portal position is fixed by this realm and is never moved to follow the player.
  world.portalX = destination.portalX;
  world.interacting = false;
  world.currentDialogueNpcId = null;
  updateLocation();
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
  const chapter = world.questStep >= 5
    ? ["quest.ending.title", "quest.ending.text"]
    : world.questStep === 4
      ? ["quest.cave.title", "quest.cave.text"]
      : world.questStep === 3
        ? ["quest.ruins.title", "quest.ruins.text"]
        : world.questStep === 2
          ? ["quest.camp.title", "quest.camp.text"]
          : world.questStep === 1
            ? ["quest.forest.title", "quest.forest.text"]
            : ["quest.first.title", "quest.first.text"];
  ui.questTitle.textContent = t(chapter[0]);
  ui.questText.textContent = t(chapter[1]);
}


function updateLocation() {
  const locationKeys = {
    maple: "location.maple", forest: "location.forest", camp: "location.camp", ruins: "location.ruins"
  };
  ui.location.textContent = world.insideCave ? t("location.cave") : t(locationKeys[world.currentRealmId] || locationKeys.maple);
}

function refreshWorldLanguage() {
  updateQuest();
  updateLocation();
  if (world.storyIntroOpen) renderStoryIntro();
  if (world.currentDialogueNpcId) {
    if (world.currentDialogueNpcId === "sign") {
      ui.dialogueName.textContent = t("npc.sign.name");
      ui.dialogueText.textContent = t(world.currentDialogueKey || "npc.sign.text");
    } else if (world.currentDialogueNpcId === "caveEntry") {
      ui.dialogueName.textContent = t("cave.title");
      ui.dialogueText.textContent = t("cave.entered");
    } else {
      const npc = npcs.find(item => item.id === world.currentDialogueNpcId);
      if (npc) {
        ui.dialogueName.textContent = t(npc.nameKey) + " · " + t(npc.titleKey);
        ui.dialogueText.textContent = t(world.currentDialogueKey || npc.dialogueKeys[world.currentDialogueIndex]);
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

  if (world.storyIntroOpen) return;

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
    world.player.x = clamp(world.player.x, 70, world.width - 90);

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

  const scene = world.currentRealmId;
  drawWorldBackdrop(w, h, scene);
  drawGround(w, h, scene);
  drawLandmarks();
  drawWorldPortals();
  drawNPCs();
  drawEnemies();
  drawPlayer();
  drawForeground(w, h);
}

function worldToScreen(x, parallax = 1) {
  return x - world.cameraX * parallax;
}

function getWorldSceneForX() {
  return world.currentRealmId;
}

function drawWorldBackdrop(w, h, scene) {
  const backgroundImage = worldBackgrounds[scene];
  if (backgroundImage && backgroundImage.complete && backgroundImage.naturalWidth > 0) {
    // Keep the illustration's aspect ratio: it fills the viewport with only a
    // small parallax shift. Align its painted path with the gameplay ground.
    const floorRatios = { maple: 0.76, forest: 0.78, camp: 0.76, ruins: 0.70 };
    const maxCamera = Math.max(0, world.width - w);
    const parallaxTravel = Math.max(0, maxCamera * 0.16);
    const progress = maxCamera > 0 ? clamp(world.cameraX / maxCamera, 0, 1) : 0;
    const drawWidth = w + parallaxTravel;
    const drawHeight = drawWidth * backgroundImage.naturalHeight / backgroundImage.naturalWidth;
    const drawX = -progress * parallaxTravel;
    const drawY = world.groundY - drawHeight * (floorRatios[scene] || 0.75);
    ctx.drawImage(backgroundImage, drawX, drawY, drawWidth, drawHeight);
    return;
  }

  const palette = {
    maple: { top: "#397ca1", middle: "#83c2cb", bottom: "#e6d9a7", far: "#7d9c79", hill: "#416c4b", trees1: "#244d3b", trees2: "#183c31", light: "#fff0bd" },
    forest: { top: "#183342", middle: "#37656b", bottom: "#b1b58a", far: "#526b68", hill: "#34564a", trees1: "#1c433a", trees2: "#10372f", light: "#9ee7ba" },
    camp: { top: "#422f4a", middle: "#ba755e", bottom: "#e7bd7b", far: "#79645d", hill: "#625b43", trees1: "#4a4a3b", trees2: "#273a34", light: "#ffcb75" },
    ruins: { top: "#171c36", middle: "#4e5477", bottom: "#a18f98", far: "#6b6d7b", hill: "#41444f", trees1: "#303e3d", trees2: "#1d3330", light: "#c4a6ff" }
  }[scene] || null;
  const p = palette || { top:"#397ca1",middle:"#83c2cb",bottom:"#e6d9a7",far:"#7d9c79",hill:"#416c4b",trees1:"#244d3b",trees2:"#183c31",light:"#fff0bd" };

  const sky = ctx.createLinearGradient(0,0,0,h);
  sky.addColorStop(0,p.top); sky.addColorStop(.58,p.middle); sky.addColorStop(1,p.bottom);
  ctx.fillStyle=sky; ctx.fillRect(0,0,w,h);

  const sunX = w*.82, sunY = h*(scene==="camp"?.24:.16);
  const glow=ctx.createRadialGradient(sunX,sunY,2,sunX,sunY,145);
  glow.addColorStop(0, scene==="ruins"?"rgba(196,166,255,.27)":scene==="camp"?"rgba(255,196,117,.32)":"rgba(255,244,200,.25)");
  glow.addColorStop(1,"rgba(255,255,255,0)");
  ctx.fillStyle=glow; ctx.fillRect(sunX-150,sunY-150,300,300);
  ctx.fillStyle=p.light; ctx.beginPath(); ctx.arc(sunX,sunY,scene==="ruins"?24:29,0,Math.PI*2); ctx.fill();

  // Distant ridges give each world its own silhouette and horizon.
  ctx.fillStyle=p.far; ctx.beginPath(); ctx.moveTo(0,h*.58);
  for(let x=0;x<=w+100;x+=85){
    const wave=scene==="ruins" ? Math.sin(x*.021)*35+Math.cos(x*.009)*14 :
      scene==="camp" ? Math.sin(x*.014)*22+Math.cos(x*.006)*16 : Math.sin(x*.013)*34;
    ctx.lineTo(x,h*.49+wave);
  }
  ctx.lineTo(w,world.groundY); ctx.lineTo(0,world.groundY); ctx.closePath(); ctx.fill();
  ctx.fillStyle=p.hill; ctx.beginPath(); ctx.moveTo(0,h*.70);
  for(let x=0;x<=w+80;x+=72) ctx.lineTo(x,h*.65+Math.cos(x*.015)*19);
  ctx.lineTo(w,world.groundY); ctx.lineTo(0,world.groundY); ctx.closePath(); ctx.fill();

  if(scene==="maple" || scene==="forest"){
    drawForestLayer(w,h,.13,p.trees1,scene==="maple"?165:205,scene==="maple"?270:350);
    drawForestLayer(w,h,.25,p.trees2,scene==="maple"?185:225,scene==="maple"?295:375);
    // Fireflies in the whispering woods.
    if(scene==="forest"){
      for(let i=0;i<22;i++){
        const fx=(i*131-world.cameraX*.16+w*2)%w;
        const fy=110+((i*47)%Math.max(100,world.groundY-150));
        ctx.globalAlpha=.35+(Math.sin(world.time*2+i)+1)*.25;
        ctx.fillStyle=p.light; ctx.fillRect(fx,fy,3,3);
      }
      ctx.globalAlpha=1;
    }
  } else if(scene==="camp"){
    // Pine silhouettes and drifting ember pixels under a sunset sky.
    for(let i=-1;i<Math.ceil(w/155)+2;i++){
      const x=i*155+60, base=world.groundY-5, ht=95+Math.abs(i*37%80);
      ctx.fillStyle=i%2?p.trees1:p.trees2;
      ctx.fillRect(x-4,base-ht*.35,8,ht*.35);
      for(let tier=0;tier<4;tier++){
        const y=base-ht+tier*ht*.2, half=19+tier*8;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-half,y+ht*.29);ctx.lineTo(x+half,y+ht*.29);ctx.closePath();ctx.fill();
      }
    }
    for(let i=0;i<12;i++){
      const ex=(i*143+world.time*(7+i%4))%w, ey=world.groundY-70-((i*43+world.time*11)%210);
      ctx.fillStyle=p.light;ctx.globalAlpha=.42;ctx.fillRect(ex,ey,2,3);
    }
    ctx.globalAlpha=1;
  } else {
    // Ruined towers and rune-lit monoliths frame the ancient realm.
    for(let i=0;i<Math.ceil(w/185)+2;i++){
      const x=i*185-(world.cameraX*.12%185)+60, base=world.groundY-3, ht=84+Math.abs(i*43%85);
      ctx.fillStyle=i%2?"#343b4b":"#3d414d";
      ctx.fillRect(x-7,base-ht,14,ht);ctx.fillRect(x-17,base-ht+20,34,8);ctx.fillRect(x-22,base-ht+42,44,7);
      ctx.fillStyle="rgba(196,166,255,.55)";ctx.fillRect(x-1,base-ht+7,3,Math.max(20,ht-22));
    }
    for(let i=0;i<16;i++){
      const gx=((i*113-world.cameraX*.18)%w+w)%w, gy=world.groundY-50-(i*37%185);
      ctx.fillStyle=p.light;ctx.globalAlpha=.25+(Math.sin(world.time*1.7+i)+1)*.2;ctx.fillRect(gx,gy,3,3);
    }
    ctx.globalAlpha=1;
  }
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

function drawGround(w, h, scene = "maple") {
  const p = {
    maple:{soil:"#263a2d",top:"#81945a",a:"#344a33",b:"#30442f",seam:"#566844",detail:"#97a776"},
    forest:{soil:"#1c3430",top:"#597b55",a:"#28443c",b:"#243c36",seam:"#42624b",detail:"#83b07c"},
    camp:{soil:"#38322d",top:"#b18a56",a:"#4a3f35",b:"#41382f",seam:"#6f5b42",detail:"#d0a86a"},
    ruins:{soil:"#272b37",top:"#77748c",a:"#343744",b:"#2e313d",seam:"#4b4f60",detail:"#8c86ad"}
  }[scene] || {soil:"#263a2d",top:"#81945a",a:"#344a33",b:"#30442f",seam:"#566844",detail:"#97a776"};
  ctx.fillStyle=p.soil;ctx.fillRect(0,world.groundY,w,h-world.groundY);
  ctx.fillStyle=p.top;ctx.fillRect(0,world.groundY-8,w,8);
  ctx.fillStyle="rgba(10,13,12,.24)";ctx.fillRect(0,world.groundY-2,w,4);
  const tile=80,start=Math.floor(world.cameraX/tile)-1,end=start+Math.ceil(w/tile)+2;
  for(let i=start;i<end;i++){
    const x=i*tile-world.cameraX;
    ctx.fillStyle=i%2===0?p.a:p.b;ctx.fillRect(x,world.groundY+22,tile-2,55);
    ctx.fillStyle=p.seam;ctx.fillRect(x+10,world.groundY+17,22,5);
    ctx.fillStyle=p.detail;
    if(scene==="maple"||scene==="forest"){ctx.fillRect(x+44,world.groundY+36,4,2);ctx.fillRect(x+53,world.groundY+45,2,3);}
    else if(scene==="camp"){ctx.fillRect(x+48,world.groundY+41,9,2);ctx.fillRect(x+18,world.groundY+59,5,2);}
    else{ctx.fillRect(x+46,world.groundY+35,3,9);ctx.fillRect(x+49,world.groundY+35,5,2);}
  }
}



function drawLandmarks() {
  for (const l of landmarks) {
    if (l.realmId !== world.currentRealmId) continue;
    const x = worldToScreen(l.x);
    if (x < -220 || x > window.innerWidth + 220) continue;
    const hasPaintedBackground = Boolean(
      worldBackgrounds[world.currentRealmId]?.complete &&
      worldBackgrounds[world.currentRealmId]?.naturalWidth > 0
    );
    if (hasPaintedBackground && ["house", "bridge", "camp", "tower", "ruins", "gate"].includes(l.type)) {
      // Those structures are painted into the selected full-world background.
      // Keep their interaction logic/data, but do not draw duplicate foreground copies.
      continue;
    }
    if (l.type === "house") drawHouse(x, world.groundY, l.variant);
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
  const exitWorldX = 260;
  const x = worldToScreen(exitWorldX);
  const ground = world.groundY;
  if (x < -140 || x > window.innerWidth + 140) return;
  const nearby = Math.abs(world.player.x - exitWorldX) < 125;
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
  const positions = [400, 560, 760, 1010, 1190];
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

function drawWorldPortals() {
  const destination = destinations.find(item => item.id === world.currentRealmId);
  if (destination) drawPortal(destination);
}

function drawPortal(destination) {
  const worldX=destination.portalX, x=worldToScreen(worldX), ground=world.groundY;
  if(x < -160 || x > window.innerWidth+160) return;
  const nearby=Math.abs(worldX-world.player.x)<145;
  const pulse=1+Math.sin(world.time*3.4+worldX)*.045;
  const p={
    maple:{glow:"rgba(120,239,197,.35)",core:"#83e2bd",mid:"#399e9a",deep:"#1d4a66",trim:"#e2cf91"},
    forest:{glow:"rgba(110,238,157,.34)",core:"#9af3ab",mid:"#36996e",deep:"#123e3b",trim:"#c5e29c"},
    camp:{glow:"rgba(255,182,93,.36)",core:"#ffe0a0",mid:"#d17b45",deep:"#663d45",trim:"#f2c674"},
    ruins:{glow:"rgba(182,146,255,.38)",core:"#e4d3ff",mid:"#9071d5",deep:"#302b5f",trim:"#d3bdff"}
  }[destination.scene];
  ctx.save();
  const glow=ctx.createRadialGradient(x,ground-77,3,x,ground-77,90*pulse);
  glow.addColorStop(0,p.glow);glow.addColorStop(.5,"rgba(45,112,124,.10)");glow.addColorStop(1,"rgba(17,30,40,0)");
  ctx.fillStyle=glow;ctx.fillRect(x-104,ground-188,208,205);

  // Compact fixed gate with chipped stone edges and realm colour.
  ctx.fillStyle="#273139";
  ctx.fillRect(x-48,ground-126,15,126);ctx.fillRect(x+33,ground-126,15,126);
  ctx.fillRect(x-56,ground-135,24,10);ctx.fillRect(x+31,ground-135,24,10);
  ctx.fillRect(x-39,ground-148,21,14);ctx.fillRect(x+18,ground-148,21,14);ctx.fillRect(x-17,ground-157,34,11);
  ctx.fillStyle="#71818a";ctx.fillRect(x-45,ground-122,4,113);ctx.fillRect(x+39,ground-122,4,113);
  ctx.fillStyle=p.trim;ctx.fillRect(x-37,ground-151,5,4);ctx.fillRect(x+31,ground-151,5,4);ctx.fillRect(x-9,ground-154,18,3);
  ctx.beginPath();ctx.moveTo(x-29,ground);ctx.lineTo(x-29,ground-95);
  ctx.quadraticCurveTo(x-29,ground-135,x,ground-135);ctx.quadraticCurveTo(x+29,ground-135,x+29,ground-95);
  ctx.lineTo(x+29,ground);ctx.closePath();ctx.fillStyle="#071018";ctx.fill();
  const light=ctx.createLinearGradient(x-26,ground-125,x+26,ground-5);
  light.addColorStop(0,p.core);light.addColorStop(.52,p.mid);light.addColorStop(1,p.deep);
  ctx.globalAlpha=.82+Math.sin(world.time*4.6+worldX)*.1;ctx.fillStyle=light;ctx.fill();ctx.globalAlpha=1;
  ctx.fillStyle=p.core;ctx.globalAlpha=.72;
  for(let i=0;i<5;i++){
    const py=ground-16-((world.time*28+i*27+worldX*.1)%101);
    const px=x+Math.sin(world.time*2.1+i*1.8+worldX)*(8+(i%3)*4);
    ctx.fillRect(Math.round(px),Math.round(py),3,4+(i%2)*2);
  }
  ctx.globalAlpha=1;
  ctx.fillStyle="#121d24";ctx.fillRect(x-67,ground-6,134,9);
  ctx.fillStyle=p.trim;ctx.fillRect(x-57,ground-4,114,3);
  ctx.textAlign="center";ctx.font=getLanguage()==="zh"?"bold 11px sans-serif":"bold 10px 'Courier New', monospace";
  ctx.fillStyle="#0b1118";ctx.fillText(getLanguage()==="zh"?t(destination.nameKey):"WORLD GATE",x+1,ground-177);
  ctx.fillStyle=p.trim;ctx.fillText(getLanguage()==="zh"?t(destination.nameKey):"WORLD GATE",x,ground-178);
  if(nearby){
    ctx.fillStyle="rgba(7,12,18,.94)";ctx.fillRect(x-90,ground-211,180,21);
    ctx.strokeStyle=p.trim;ctx.lineWidth=2;ctx.strokeRect(x-90,ground-211,180,21);
    ctx.fillStyle="#fff6dc";ctx.font=getLanguage()==="zh"?"bold 11px sans-serif":"bold 9px 'Courier New', monospace";
    ctx.fillText(t("portal.interact"),x,ground-197);
  }
  ctx.restore();
}

function drawHouse(x, ground, variant = "cottage") {
  const palettes = {
    cottage: { wall: "#b77a56", wallLight: "#d79b6c", roof: "#643e4b", roofLight: "#925563", trim: "#e0bd83", door: "#49313a" },
    elder: { wall: "#9e7450", wallLight: "#c69a69", roof: "#43564a", roofLight: "#71836a", trim: "#e1c992", door: "#3d3530" },
    shop: { wall: "#c18a53", wallLight: "#e0b777", roof: "#51436a", roofLight: "#8170a0", trim: "#f0d69b", door: "#4a3440" }
  };
  const p = palettes[variant] || palettes.cottage;
  ctx.save();

  // Ground shadow and stone step.
  ctx.fillStyle = "rgba(8, 13, 13, .28)";
  ctx.beginPath();
  ctx.ellipse(x + 2, ground + 4, 112, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6d7060";
  ctx.fillRect(x - 93, ground - 8, 186, 10);
  ctx.fillStyle = "#a8a58b";
  ctx.fillRect(x - 87, ground - 8, 42, 3);
  ctx.fillRect(x + 35, ground - 8, 47, 3);

  // Chimney and roof silhouette.
  ctx.fillStyle = "#493640";
  ctx.fillRect(x + 46, ground - 180, 24, 55);
  ctx.fillStyle = "#a45f5a";
  ctx.fillRect(x + 42, ground - 185, 32, 8);
  ctx.fillStyle = "rgba(205, 200, 185, .22)";
  for (let i = 0; i < 3; i++) {
    const smokeY = ground - 194 - i * 13 - Math.sin(world.time * 1.4 + i) * 3;
    ctx.fillRect(x + 54 + i * 3, smokeY, 5 + i * 2, 4);
  }

  ctx.beginPath();
  ctx.moveTo(x - 106, ground - 112);
  ctx.lineTo(x - 78, ground - 147);
  ctx.lineTo(x, ground - 201);
  ctx.lineTo(x + 79, ground - 146);
  ctx.lineTo(x + 107, ground - 112);
  ctx.closePath();
  const roofGradient = ctx.createLinearGradient(x - 100, ground - 190, x + 70, ground - 105);
  roofGradient.addColorStop(0, p.roofLight);
  roofGradient.addColorStop(.5, p.roof);
  roofGradient.addColorStop(1, "#302a3b");
  ctx.fillStyle = roofGradient;
  ctx.fill();
  ctx.strokeStyle = "#302733";
  ctx.lineWidth = 5;
  ctx.stroke();

  // Roof tiles in offset rows for a hand-crafted pixel-art look.
  for (let row = 0; row < 4; row++) {
    const y = ground - 169 + row * 15;
    const halfWidth = 19 + row * 19;
    for (let col = -3; col <= 3; col++) {
      const tileX = x + col * 27 + (row % 2) * 12;
      if (Math.abs(tileX - x) > halfWidth + 20) continue;
      ctx.fillStyle = (row + col) % 2 === 0 ? p.roofLight : p.roof;
      ctx.fillRect(tileX - 11, y, 22, 5);
      ctx.fillStyle = "rgba(17, 19, 29, .45)";
      ctx.fillRect(tileX - 11, y + 5, 22, 2);
    }
  }
  ctx.strokeStyle = "rgba(238, 204, 156, .55)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 78, ground - 145);
  ctx.lineTo(x, ground - 198);
  ctx.lineTo(x + 78, ground - 145);
  ctx.stroke();

  // Warm timber wall with plank seams and sturdy corner posts.
  ctx.fillStyle = "#3b302b";
  ctx.fillRect(x - 82, ground - 120, 164, 120);
  const wallGradient = ctx.createLinearGradient(x - 80, ground - 117, x + 80, ground);
  wallGradient.addColorStop(0, p.wallLight);
  wallGradient.addColorStop(1, p.wall);
  ctx.fillStyle = wallGradient;
  ctx.fillRect(x - 76, ground - 114, 152, 110);
  for (let row = 0; row < 6; row++) {
    const y = ground - 101 + row * 17;
    ctx.fillStyle = "rgba(64, 43, 39, .25)";
    ctx.fillRect(x - 73, y, 146, 2);
    ctx.fillStyle = "rgba(244, 202, 139, .24)";
    ctx.fillRect(x - 70, y + 3, 139, 1);
  }

  // Timber framing and a stone foundation.
  ctx.fillStyle = "#59403a";
  ctx.fillRect(x - 76, ground - 115, 9, 112);
  ctx.fillRect(x + 67, ground - 115, 9, 112);
  ctx.fillRect(x - 78, ground - 76, 156, 7);
  ctx.fillRect(x - 82, ground - 6, 164, 8);
  ctx.fillStyle = "#887d6b";
  for (let i = 0; i < 8; i++) {
    const sx = x - 77 + i * 20;
    ctx.fillRect(sx, ground - 5, 15, 5);
    ctx.fillStyle = i % 2 ? "#b4a28a" : "#716c63";
  }

  // Window frames, warm interior light, cross bars and sills.
  for (const wx of [x - 48, x + 28]) {
    ctx.fillStyle = "#4a3435";
    ctx.fillRect(wx - 2, ground - 91, 38, 39);
    ctx.fillStyle = "#f7d88d";
    ctx.fillRect(wx + 2, ground - 87, 30, 31);
    const glass = ctx.createLinearGradient(wx, ground - 86, wx + 30, ground - 57);
    glass.addColorStop(0, "#d9efc2");
    glass.addColorStop(.5, "#f2d697");
    glass.addColorStop(1, "#c87e57");
    ctx.fillStyle = glass;
    ctx.fillRect(wx + 4, ground - 85, 26, 27);
    ctx.fillStyle = "#6d4b45";
    ctx.fillRect(wx + 15, ground - 86, 4, 29);
    ctx.fillRect(wx + 3, ground - 73, 28, 4);
    ctx.fillStyle = "#f5d9a2";
    ctx.fillRect(wx - 4, ground - 53, 42, 5);
    ctx.fillStyle = "rgba(255, 211, 127, .17)";
    ctx.fillRect(wx - 6, ground - 98, 45, 52);
  }

  // Offset front door with arch, panels, handle and lantern.
  ctx.fillStyle = "#342830";
  ctx.fillRect(x + 5, ground - 74, 44, 72);
  ctx.fillStyle = p.door;
  ctx.fillRect(x + 9, ground - 71, 36, 69);
  ctx.fillStyle = "rgba(225, 183, 128, .22)";
  ctx.fillRect(x + 14, ground - 64, 2, 54);
  ctx.strokeStyle = "#c49a6e";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 15, ground - 61, 23, 22);
  ctx.strokeRect(x + 15, ground - 34, 23, 22);
  ctx.fillStyle = "#e8c26f";
  ctx.beginPath();
  ctx.arc(x + 37, ground - 35, 3, 0, Math.PI * 2);
  ctx.fill();

  // Variant-specific signboard.
  if (variant === "shop") {
    ctx.fillStyle = "#4a3442";
    ctx.fillRect(x - 15, ground - 142, 76, 23);
    ctx.strokeStyle = "#dfbd7c";
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 15, ground - 142, 76, 23);
    ctx.fillStyle = "#fff0c1";
    ctx.font = "bold 10px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(getLanguage() === "zh" ? "杂货铺" : "SUPPLIES", x + 23, ground - 127);
  } else if (variant === "elder") {
    ctx.fillStyle = "#3d4b3c";
    ctx.fillRect(x - 28, ground - 141, 56, 12);
    ctx.fillStyle = "#e7d29b";
    ctx.fillRect(x - 25, ground - 138, 50, 3);
  }

  // Flower boxes and potted herbs finish the village facade.
  for (const wx of [x - 48, x + 28]) {
    ctx.fillStyle = "#684237";
    ctx.fillRect(wx - 2, ground - 51, 38, 7);
    for (let i = 0; i < 4; i++) {
      const fx = wx + 3 + i * 9;
      ctx.fillStyle = ["#d9838d", "#e7bf66", "#a7c17a", "#c58fd0"][i];
      ctx.fillRect(fx, ground - 57 - (i % 2) * 3, 5, 5);
      ctx.fillStyle = "#597b50";
      ctx.fillRect(fx + 1, ground - 52, 3, 4);
    }
  }
  ctx.fillStyle = "#77624b";
  ctx.fillRect(x - 103, ground - 29, 15, 24);
  ctx.fillStyle = "#9d815b";
  ctx.fillRect(x - 106, ground - 31, 21, 5);
  ctx.fillStyle = "#5e8a53";
  ctx.fillRect(x - 100, ground - 39, 4, 11);
  ctx.fillRect(x - 94, ground - 36, 4, 9);

  ctx.restore();
}

function drawBridge(x, ground) {
  ctx.save();
  ctx.fillStyle = "rgba(6, 11, 15, .32)";
  ctx.fillRect(x - 139, ground + 2, 278, 18);

  // Stone abutments and timber supports.
  for (const sx of [x - 111, x + 104]) {
    ctx.fillStyle = "#55483e";
    ctx.fillRect(sx - 11, ground - 23, 22, 91);
    ctx.fillStyle = "#a17d58";
    ctx.fillRect(sx - 7, ground - 22, 5, 81);
    ctx.fillStyle = "#463d38";
    ctx.fillRect(sx - 15, ground + 58, 30, 9);
  }

  // Heavy timber deck with individually shaded planks.
  ctx.fillStyle = "#513c31";
  ctx.fillRect(x - 137, ground - 28, 274, 24);
  for (let i = 0; i < 12; i++) {
    const px = x - 132 + i * 23;
    ctx.fillStyle = i % 2 ? "#916749" : "#a97b51";
    ctx.fillRect(px, ground - 25, 20, 15);
    ctx.fillStyle = "#d1a16a";
    ctx.fillRect(px + 2, ground - 24, 15, 2);
    ctx.fillStyle = "#4c382f";
    ctx.fillRect(px + 10, ground - 19, 2, 2);
  }

  // Curved handrails, rope and chunky posts.
  ctx.strokeStyle = "#644837";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(x - 130, ground - 45);
  ctx.quadraticCurveTo(x, ground - 75, x + 130, ground - 45);
  ctx.stroke();
  ctx.strokeStyle = "#c49a65";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 130, ground - 47);
  ctx.quadraticCurveTo(x, ground - 77, x + 130, ground - 47);
  ctx.stroke();
  for (let i = 0; i < 9; i++) {
    const px = x - 118 + i * 29.5;
    const top = ground - 45 - Math.sin((i / 8) * Math.PI) * 29;
    ctx.fillStyle = "#4e3a31";
    ctx.fillRect(px - 4, top - 3, 8, 29);
    ctx.fillStyle = "#c29764";
    ctx.fillRect(px - 2, top, 3, 20);
  }
  ctx.restore();
}

function drawCamp(x, ground) {
  ctx.save();
  const fireGlow = ctx.createRadialGradient(x + 93, ground - 25, 3, x + 93, ground - 25, 84);
  fireGlow.addColorStop(0, "rgba(255, 170, 72, .28)");
  fireGlow.addColorStop(1, "rgba(255, 122, 48, 0)");
  ctx.fillStyle = fireGlow;
  ctx.fillRect(x + 2, ground - 110, 184, 120);

  // Tent shadow and canvas body.
  ctx.fillStyle = "rgba(8, 11, 12, .3)";
  ctx.beginPath();
  ctx.ellipse(x, ground + 1, 89, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#604735";
  ctx.fillRect(x - 75, ground - 67, 150, 9);
  ctx.beginPath();
  ctx.moveTo(x - 78, ground - 65);
  ctx.lineTo(x - 8, ground - 144);
  ctx.lineTo(x + 77, ground - 65);
  ctx.closePath();
  const canvas = ctx.createLinearGradient(x - 50, ground - 120, x + 65, ground - 56);
  canvas.addColorStop(0, "#d7b985");
  canvas.addColorStop(.5, "#ae8759");
  canvas.addColorStop(1, "#795943");
  ctx.fillStyle = canvas;
  ctx.fill();
  ctx.strokeStyle = "#533f32";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = "#302931";
  ctx.beginPath();
  ctx.moveTo(x - 24, ground - 65);
  ctx.lineTo(x - 8, ground - 120);
  ctx.lineTo(x + 29, ground - 65);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#e1c99d";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 8, ground - 140);
  ctx.lineTo(x - 8, ground - 68);
  ctx.stroke();
  ctx.fillStyle = "#d7c18e";
  ctx.fillRect(x - 60, ground - 62, 18, 4);
  ctx.fillRect(x + 47, ground - 62, 17, 4);

  // Campfire with layered flame and surrounding stones.
  ctx.fillStyle = "#5c4738";
  ctx.fillRect(x + 66, ground - 18, 60, 9);
  ctx.save();
  ctx.translate(x + 94, ground - 19);
  ctx.rotate(.35);
  ctx.fillStyle = "#6c4934";
  ctx.fillRect(-24, -3, 48, 7);
  ctx.rotate(-.7);
  ctx.fillStyle = "#9b6940";
  ctx.fillRect(-24, -3, 48, 7);
  ctx.restore();
  const flame = 1 + Math.sin(world.time * 9) * .12;
  ctx.fillStyle = "#d45f31";
  ctx.beginPath();
  ctx.moveTo(x + 94, ground - 15);
  ctx.quadraticCurveTo(x + 64, ground - 34 * flame, x + 91, ground - 58 * flame);
  ctx.quadraticCurveTo(x + 88, ground - 37, x + 113, ground - 19);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffbe55";
  ctx.beginPath();
  ctx.moveTo(x + 94, ground - 16);
  ctx.quadraticCurveTo(x + 79, ground - 31 * flame, x + 97, ground - 44 * flame);
  ctx.quadraticCurveTo(x + 94, ground - 29, x + 104, ground - 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#d4c5a2";
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(x + 62 + i * 16, ground - 8 + (i % 2) * 3, 7, 5);
  }

  // Crate and rolled bedroll.
  ctx.fillStyle = "#5a4030";
  ctx.fillRect(x - 107, ground - 42, 26, 34);
  ctx.fillStyle = "#a9794e";
  ctx.fillRect(x - 104, ground - 39, 20, 28);
  ctx.fillStyle = "#5a4030";
  ctx.fillRect(x - 96, ground - 39, 3, 28);
  ctx.fillRect(x - 104, ground - 27, 20, 3);
  ctx.fillStyle = "#81917c";
  ctx.fillRect(x - 132, ground - 20, 26, 11);
  ctx.fillStyle = "#b6bda0";
  ctx.fillRect(x - 129, ground - 19, 19, 3);
  ctx.restore();
}

function drawTower(x, ground) {
  ctx.save();
  ctx.fillStyle = "rgba(7, 10, 13, .28)";
  ctx.beginPath();
  ctx.ellipse(x, ground + 2, 71, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tower body with shaded sides and block courses.
  ctx.fillStyle = "#343f43";
  ctx.fillRect(x - 53, ground - 174, 106, 174);
  ctx.fillStyle = "#747d79";
  ctx.fillRect(x - 45, ground - 165, 80, 160);
  ctx.fillStyle = "#4b5759";
  ctx.fillRect(x + 21, ground - 165, 14, 160);
  ctx.fillStyle = "#a0a49a";
  ctx.fillRect(x - 44, ground - 163, 5, 153);
  for (let row = 0; row < 9; row++) {
    const y = ground - 151 + row * 17;
    ctx.fillStyle = "rgba(40, 50, 52, .48)";
    ctx.fillRect(x - 44, y, 80, 2);
    for (let col = 0; col < 3; col++) {
      const bx = x - 39 + col * 28 + (row % 2) * 9;
      ctx.fillStyle = "rgba(189, 191, 174, .32)";
      ctx.fillRect(bx, y + 3, 17, 2);
    }
  }

  // Battlements and roof cap.
  ctx.fillStyle = "#303b40";
  ctx.fillRect(x - 61, ground - 188, 122, 22);
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i % 2 ? "#68736f" : "#89908a";
    ctx.fillRect(x - 55 + i * 25, ground - 201, 17, 16);
  }
  ctx.fillStyle = "#bdc7bb";
  ctx.fillRect(x - 48, ground - 185, 95, 3);

  // Narrow glowing window, lintel, and hanging ivy.
  ctx.fillStyle = "#222d34";
  ctx.fillRect(x - 17, ground - 132, 35, 46);
  const windowGlow = ctx.createLinearGradient(x - 12, ground - 128, x + 12, ground - 86);
  windowGlow.addColorStop(0, "#cae6b8");
  windowGlow.addColorStop(1, "#dca86d");
  ctx.fillStyle = windowGlow;
  ctx.fillRect(x - 12, ground - 127, 25, 36);
  ctx.fillStyle = "#3b464b";
  ctx.fillRect(x - 3, ground - 127, 5, 36);
  ctx.fillRect(x - 12, ground - 110, 25, 4);
  ctx.fillStyle = "#42654a";
  ctx.fillRect(x - 51, ground - 120, 4, 39);
  ctx.fillRect(x - 47, ground - 91, 7, 4);
  ctx.fillRect(x + 38, ground - 70, 5, 44);

  // Door and steps.
  ctx.fillStyle = "#30383b";
  ctx.fillRect(x - 20, ground - 62, 42, 64);
  ctx.fillStyle = "#473f37";
  ctx.fillRect(x - 15, ground - 57, 31, 58);
  ctx.fillStyle = "#bca16e";
  ctx.fillRect(x + 7, ground - 31, 3, 4);
  ctx.fillStyle = "#777c74";
  ctx.fillRect(x - 29, ground - 6, 60, 7);
  ctx.restore();
}

function drawRuins(x, ground) {
  ctx.save();
  const glow = ctx.createRadialGradient(x, ground - 86, 3, x, ground - 86, 125);
  glow.addColorStop(0, "rgba(101, 203, 190, .17)");
  glow.addColorStop(1, "rgba(101, 203, 190, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(x - 135, ground - 216, 270, 230);

  // Broken arch made from individual ancient stone blocks.
  const stones = [
    [x - 102, ground - 20, 27, 26], [x - 100, ground - 49, 24, 28],
    [x - 98, ground - 80, 22, 28], [x - 93, ground - 111, 22, 28],
    [x - 80, ground - 140, 29, 26], [x - 52, ground - 159, 28, 22],
    [x - 21, ground - 171, 36, 21], [x + 16, ground - 168, 31, 22],
    [x + 47, ground - 151, 29, 23], [x + 73, ground - 127, 24, 27],
    [x + 85, ground - 97, 20, 26], [x + 91, ground - 68, 24, 28],
    [x + 94, ground - 39, 27, 36]
  ];
  stones.forEach((stone, i) => {
    ctx.fillStyle = i % 3 === 0 ? "#586568" : (i % 3 === 1 ? "#737a74" : "#626e70");
    ctx.fillRect(stone[0], stone[1], stone[2], stone[3]);
    ctx.fillStyle = "rgba(204, 208, 188, .34)";
    ctx.fillRect(stone[0] + 3, stone[1] + 3, stone[2] - 8, 3);
    ctx.fillStyle = "rgba(22, 31, 35, .42)";
    ctx.fillRect(stone[0], stone[1] + stone[3] - 4, stone[2], 4);
  });

  // Dark empty arch opening and a faint rune seal.
  ctx.fillStyle = "#172025";
  ctx.beginPath();
  ctx.moveTo(x - 71, ground);
  ctx.lineTo(x - 66, ground - 83);
  ctx.quadraticCurveTo(x - 60, ground - 135, x, ground - 140);
  ctx.quadraticCurveTo(x + 61, ground - 137, x + 67, ground - 83);
  ctx.lineTo(x + 72, ground);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(151, 232, 214, .72)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, ground - 121);
  ctx.lineTo(x + 9, ground - 105);
  ctx.lineTo(x, ground - 89);
  ctx.lineTo(x - 9, ground - 105);
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = "#d3f5d6";
  ctx.fillRect(x - 2, ground - 108, 4, 6);

  // Broken masonry and moss at the foot of the ruin.
  ctx.fillStyle = "#495858";
  ctx.fillRect(x - 125, ground - 7, 35, 8);
  ctx.fillRect(x + 88, ground - 9, 42, 10);
  ctx.fillStyle = "#79936a";
  ctx.fillRect(x - 107, ground - 13, 21, 4);
  ctx.fillRect(x + 103, ground - 15, 19, 4);
  ctx.restore();
}

function drawGate(x, ground) {
  ctx.save();
  const unlocked = world.questStep >= 2;
  const light = ctx.createRadialGradient(x, ground - 74, 4, x, ground - 74, 150);
  light.addColorStop(0, unlocked ? "rgba(111, 222, 150, .26)" : "rgba(204, 74, 90, .19)");
  light.addColorStop(1, "rgba(20, 22, 24, 0)");
  ctx.fillStyle = light;
  ctx.fillRect(x - 155, ground - 190, 310, 200);

  // Pillars, carved blocks, caps, and gold trim.
  for (const side of [-1, 1]) {
    const px = x + side * 91;
    ctx.fillStyle = "#2f3d40";
    ctx.fillRect(px - 24, ground - 157, 48, 157);
    ctx.fillStyle = "#667775";
    ctx.fillRect(px - 17, ground - 149, 31, 143);
    ctx.fillStyle = "#9b9e88";
    ctx.fillRect(px - 15, ground - 145, 4, 135);
    for (let row = 0; row < 6; row++) {
      ctx.fillStyle = "rgba(34, 45, 45, .5)";
      ctx.fillRect(px - 17, ground - 126 + row * 22, 31, 2);
    }
    ctx.fillStyle = "#323d3e";
    ctx.fillRect(px - 30, ground - 165, 60, 12);
    ctx.fillStyle = "#c5a86f";
    ctx.fillRect(px - 26, ground - 162, 52, 3);
    ctx.fillStyle = "#4c5a58";
    ctx.fillRect(px - 28, ground - 7, 56, 9);
  }
  ctx.fillStyle = "#303b3d";
  ctx.fillRect(x - 119, ground - 176, 238, 24);
  ctx.fillStyle = "#a99465";
  ctx.fillRect(x - 111, ground - 171, 222, 3);
  ctx.fillStyle = "#4c5855";
  ctx.fillRect(x - 107, ground - 151, 214, 10);

  // Locked/unlocked gate panel and bars.
  ctx.fillStyle = "#101b20";
  ctx.fillRect(x - 67, ground - 128, 134, 128);
  const gateGradient = ctx.createLinearGradient(x - 60, ground - 120, x + 60, ground);
  gateGradient.addColorStop(0, unlocked ? "#477d58" : "#6f3543");
  gateGradient.addColorStop(1, unlocked ? "#244a3b" : "#392b39");
  ctx.fillStyle = gateGradient;
  ctx.fillRect(x - 60, ground - 121, 120, 117);
  ctx.fillStyle = "#222f34";
  for (let i = -2; i <= 2; i++) {
    ctx.fillRect(x + i * 24 - 3, ground - 118, 6, 112);
  }
  ctx.fillStyle = unlocked ? "#bff2c5" : "#ee9a9f";
  ctx.fillRect(x - 53, ground - 110, 106, 3);
  ctx.fillRect(x - 53, ground - 10, 106, 3);
  ctx.fillStyle = "#d9bd7b";
  for (const bx of [x - 92, x + 89]) {
    ctx.fillRect(bx, ground - 139, 4, 4);
    ctx.fillRect(bx, ground - 105, 4, 4);
  }
  ctx.fillStyle = unlocked ? "#c4e7b0" : "#efb3b3";
  ctx.beginPath();
  ctx.arc(x, ground - 65, 9 + Math.sin(world.time * 3) * 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#283638";
  ctx.beginPath();
  ctx.arc(x, ground - 65, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSign(x, ground, text) {
  ctx.save();
  // Shadow, braced posts and an angled wooden town sign.
  ctx.fillStyle = "rgba(0, 0, 0, .22)";
  ctx.fillRect(x - 70, ground - 60, 142, 7);
  ctx.fillStyle = "#503a2b";
  ctx.fillRect(x - 43, ground - 102, 9, 102);
  ctx.fillRect(x + 34, ground - 94, 7, 94);
  ctx.fillStyle = "#95653e";
  ctx.fillRect(x - 39, ground - 99, 3, 97);
  ctx.fillRect(x + 36, ground - 91, 3, 90);

  ctx.fillStyle = "#3c2f2a";
  ctx.fillRect(x - 86, ground - 131, 174, 42);
  ctx.fillStyle = "#b7844e";
  ctx.fillRect(x - 82, ground - 127, 166, 34);
  ctx.fillStyle = "#e0bd7c";
  ctx.fillRect(x - 78, ground - 123, 158, 3);
  ctx.fillRect(x - 78, ground - 98, 158, 2);
  ctx.fillStyle = "#80553a";
  ctx.fillRect(x - 70, ground - 119, 142, 21);
  ctx.fillStyle = "#f6df9d";
  ctx.font = "bold 12px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(getLanguage() === "zh" ? "枫叶镇 →" : text, x, ground - 105);

  // Carved arrow and metal nail heads.
  ctx.fillStyle = "#fff0bf";
  ctx.beginPath();
  ctx.moveTo(x + 57, ground - 117);
  ctx.lineTo(x + 69, ground - 109);
  ctx.lineTo(x + 57, ground - 101);
  ctx.lineTo(x + 61, ground - 109);
  ctx.closePath();
  ctx.fill();
  for (const nx of [x - 73, x + 73]) {
    ctx.fillStyle = "#483932";
    ctx.fillRect(nx, ground - 114, 4, 4);
    ctx.fillStyle = "#e4c685";
    ctx.fillRect(nx + 1, ground - 113, 2, 2);
  }
  ctx.restore();
}



function drawNPCs() {
  for (const npc of npcs) {
    if (npc.realmId !== world.currentRealmId) continue;
    const x = worldToScreen(npc.x);
    if (x < -120 || x > window.innerWidth + 120) continue;
    const bob = Math.sin(world.time * 2.4 + npc.x) * 1.3;
    drawStyledNPC(x, world.groundY + bob, npc);

    const nearby = Math.abs(npc.x - world.player.x) < 105;
    if (nearby) {
      const glow = .72 + Math.sin(world.time * 5) * .18;
      ctx.save();
      ctx.globalAlpha = glow;
      ctx.fillStyle = "rgba(13, 20, 26, .9)";
      ctx.fillRect(x - 14, world.groundY - 141, 28, 25);
      ctx.strokeStyle = "#f0cc78";
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 14, world.groundY - 141, 28, 25);
      ctx.fillStyle = "#ffe6a0";
      ctx.font = "bold 14px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("E", x, world.groundY - 123);
      ctx.restore();
    } else {
      ctx.fillStyle = "rgba(16, 22, 23, .78)";
      ctx.beginPath();
      ctx.moveTo(x, world.groundY - 126);
      ctx.lineTo(x + 5, world.groundY - 121);
      ctx.lineTo(x, world.groundY - 116);
      ctx.lineTo(x - 5, world.groundY - 121);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#f1d17f";
      ctx.fillRect(x - 1, world.groundY - 122, 2, 2);
    }
  }
}

function drawStyledNPC(x, ground, npc) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(ground));

  // Ground shadow and feet.
  ctx.fillStyle = "rgba(5, 9, 12, .3)";
  ctx.beginPath();
  ctx.ellipse(0, 3, 28, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  const isElder = npc.id === "elder";
  const isMerchant = npc.id === "mira";
  const isGuide = npc.id === "tala";
  const isKeeper = npc.id === "kai";
  const robe = isElder ? "#85734c" : isMerchant ? "#9d533e" : isGuide ? "#64764e" : "#3f7186";
  const robeLight = isElder ? "#c2a36a" : isMerchant ? "#d28a53" : isGuide ? "#a9bd74" : "#75bac9";
  const robeDark = isElder ? "#504736" : isMerchant ? "#5c3540" : isGuide ? "#3c4d36" : "#263d58";
  const hair = isElder ? "#c4c2a7" : isMerchant ? "#6b352d" : isGuide ? "#805044" : "#243440";
  const skin = isElder ? "#d5b28d" : isMerchant ? "#e2b28c" : "#d9b89b";

  // Back cloak, with a role-specific silhouette.
  ctx.fillStyle = "#242b30";
  ctx.beginPath();
  ctx.moveTo(-12, -74);
  ctx.lineTo(-22, -60);
  ctx.lineTo(-24, -31);
  ctx.lineTo(-32, -11);
  ctx.lineTo(-19, -14);
  ctx.lineTo(-7, -8);
  ctx.lineTo(18, -10);
  ctx.lineTo(25, -36);
  ctx.lineTo(17, -62);
  ctx.lineTo(10, -74);
  ctx.closePath();
  ctx.fill();

  // Boots and legs are drawn behind the tunic.
  ctx.fillStyle = "#22252d";
  ctx.fillRect(-14, -25, 10, 21);
  ctx.fillRect(5, -25, 10, 21);
  ctx.fillStyle = "#4c4c4a";
  ctx.fillRect(-17, -7, 15, 5);
  ctx.fillRect(4, -7, 17, 5);
  ctx.fillStyle = "#b09a72";
  ctx.fillRect(-13, -23, 2, 12);
  ctx.fillRect(8, -23, 2, 12);

  // Main coat/robe with shaded side and bright seam.
  ctx.fillStyle = robeDark;
  ctx.beginPath();
  ctx.moveTo(-13, -72);
  ctx.lineTo(11, -73);
  ctx.lineTo(17, -58);
  ctx.lineTo(19, -28);
  ctx.lineTo(13, -17);
  ctx.lineTo(-17, -17);
  ctx.lineTo(-21, -31);
  ctx.lineTo(-17, -58);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = robe;
  ctx.beginPath();
  ctx.moveTo(-11, -69);
  ctx.lineTo(7, -69);
  ctx.lineTo(12, -56);
  ctx.lineTo(9, -24);
  ctx.lineTo(-12, -23);
  ctx.lineTo(-16, -34);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = robeLight;
  ctx.fillRect(-11, -65, 3, 36);
  ctx.fillRect(7, -58, 3, 25);
  ctx.fillStyle = "rgba(11, 17, 22, .4)";
  ctx.fillRect(-7, -54, 4, 22);
  ctx.fillRect(1, -51, 3, 18);

  // Belt, buckle and stitched hem.
  ctx.fillStyle = "#2b292a";
  ctx.fillRect(-15, -35, 29, 5);
  ctx.fillStyle = "#d8bb7a";
  ctx.fillRect(-2, -36, 6, 7);
  ctx.fillStyle = "#716048";
  ctx.fillRect(0, -34, 2, 3);
  for (let stitch = -10; stitch <= 10; stitch += 5) {
    ctx.fillStyle = robeLight;
    ctx.fillRect(stitch, -20, 2, 2);
  }

  // Arms, sleeves and hands.
  ctx.fillStyle = robeDark;
  ctx.beginPath();
  ctx.moveTo(-14, -67);
  ctx.lineTo(-25, -62);
  ctx.lineTo(-22, -45);
  ctx.lineTo(-14, -42);
  ctx.lineTo(-9, -49);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = robe;
  ctx.fillRect(-23, -60, 7, 13);
  ctx.fillStyle = skin;
  ctx.fillRect(-22, -47, 7, 8);
  ctx.fillStyle = robeDark;
  ctx.beginPath();
  ctx.moveTo(10, -67);
  ctx.lineTo(19, -60);
  ctx.lineTo(17, -45);
  ctx.lineTo(11, -43);
  ctx.lineTo(6, -50);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = robeLight;
  ctx.fillRect(12, -58, 5, 11);
  ctx.fillStyle = skin;
  ctx.fillRect(11, -46, 7, 8);

  // Neck and face, facing toward the player/right.
  ctx.fillStyle = skin;
  ctx.fillRect(-5, -81, 11, 13);
  ctx.fillStyle = "#22242d";
  ctx.fillRect(-14, -95, 29, 20);
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(-11, -94);
  ctx.lineTo(6, -94);
  ctx.lineTo(13, -86);
  ctx.lineTo(9, -76);
  ctx.lineTo(1, -72);
  ctx.lineTo(-9, -77);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255, 231, 195, .7)";
  ctx.fillRect(1, -90, 7, 2);
  ctx.fillStyle = "#4a3030";
  ctx.fillRect(9, -85, 3, 2);
  ctx.fillStyle = "#191f25";
  ctx.fillRect(5, -87, 3, 4);
  ctx.fillStyle = "#fff0bf";
  ctx.fillRect(6, -87, 1, 1);

  // Hair/hood silhouette and face-framing locks.
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.moveTo(-15, -91);
  ctx.lineTo(-14, -102);
  ctx.lineTo(-7, -108);
  ctx.lineTo(4, -108);
  ctx.lineTo(14, -101);
  ctx.lineTo(16, -91);
  ctx.lineTo(10, -91);
  ctx.lineTo(8, -97);
  ctx.lineTo(4, -91);
  ctx.lineTo(-2, -98);
  ctx.lineTo(-6, -91);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = robeLight;
  ctx.fillRect(-7, -103, 9, 2);
  ctx.fillStyle = "#141b23";
  ctx.fillRect(-12, -96, 5, 8);
  ctx.fillRect(8, -96, 4, 7);

  // Unique class details make the three NPCs readable at a glance.
  if (isElder) {
    // Elder Rowan: pale beard, layered shawl and a walking staff.
    ctx.fillStyle = "#d1cdb3";
    ctx.beginPath();
    ctx.moveTo(-6, -78);
    ctx.lineTo(5, -79);
    ctx.lineTo(4, -68);
    ctx.lineTo(-1, -62);
    ctx.lineTo(-7, -70);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ece3c7";
    ctx.fillRect(-5, -76, 8, 3);
    ctx.fillStyle = "#d1b67c";
    ctx.fillRect(-24, -79, 4, 78);
    ctx.fillStyle = "#826441";
    ctx.fillRect(-27, -80, 10, 4);
    ctx.fillStyle = "#e6d29b";
    ctx.fillRect(-15, -63, 10, 4);
    ctx.fillRect(3, -62, 10, 4);
  } else if (isMerchant) {
    // Mira: merchant cap, shoulder pack, bright sash and coin pouch.
    ctx.fillStyle = "#6c4a36";
    ctx.beginPath();
    ctx.moveTo(-18, -100);
    ctx.lineTo(-10, -112);
    ctx.lineTo(8, -111);
    ctx.lineTo(18, -100);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#d3a45c";
    ctx.fillRect(-15, -100, 31, 4);
    ctx.fillStyle = "#b8784b";
    ctx.fillRect(-26, -67, 12, 18);
    ctx.fillStyle = "#e8c787";
    ctx.fillRect(-24, -65, 8, 3);
    ctx.fillStyle = "#e7c06e";
    ctx.fillRect(8, -42, 8, 8);
    ctx.fillStyle = "#6a4534";
    ctx.fillRect(-2, -66, 18, 4);
  } else if (isGuide) {
    // Tala: moss-green travel scarf, trail map and a warm lantern.
    ctx.fillStyle = "#a6b975";
    ctx.fillRect(-15, -71, 29, 5);
    ctx.fillRect(-3, -67, 7, 17);
    ctx.fillStyle = "#4d5e3b";
    ctx.fillRect(-28, -67, 14, 20);
    ctx.fillStyle = "#d4c18e";
    ctx.fillRect(-26, -65, 10, 2);
    ctx.fillRect(-26, -59, 10, 2);
    ctx.fillRect(-26, -53, 10, 2);
    ctx.fillStyle = "#47382b";
    ctx.fillRect(15, -45, 5, 18);
    ctx.fillStyle = "#f7c76b";
    ctx.fillRect(12, -55, 12, 12);
    ctx.fillStyle = "rgba(255, 205, 113, .24)";
    ctx.beginPath();
    ctx.arc(18, -49, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffebad";
    ctx.fillRect(15, -52, 6, 6);
  } else if (isKeeper) {
    // Kai: teal hood, cyan rune trim and a floating holographic book.
    ctx.fillStyle = "#263848";
    ctx.beginPath();
    ctx.moveTo(-17, -93);
    ctx.lineTo(-12, -111);
    ctx.lineTo(3, -115);
    ctx.lineTo(17, -103);
    ctx.lineTo(15, -88);
    ctx.lineTo(8, -95);
    ctx.lineTo(0, -100);
    ctx.lineTo(-7, -93);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#9ce8de";
    ctx.fillRect(-13, -72, 3, 35);
    ctx.fillRect(8, -72, 3, 35);
    ctx.fillRect(-4, -54, 8, 3);
    ctx.fillStyle = "rgba(79, 227, 220, .17)";
    ctx.fillRect(19, -58, 22, 28);
    ctx.strokeStyle = "#83eee5";
    ctx.lineWidth = 2;
    ctx.strokeRect(22, -56, 17, 23);
    ctx.fillStyle = "#d1fff2";
    ctx.fillRect(29, -51, 3, 13);
    ctx.fillRect(25, -47, 11, 3);
  }

  // Edge highlights and collar details.
  ctx.fillStyle = "#1e242c";
  ctx.fillRect(-15, -73, 7, 5);
  ctx.fillStyle = robeLight;
  ctx.fillRect(-12, -69, 3, 11);
  ctx.fillRect(4, -68, 3, 9);
  ctx.fillStyle = "#d5bd82";
  ctx.fillRect(0, -43, 4, 4);
  ctx.restore();
}


function drawEnemies() {
  for (const enemy of enemies) {
    if (enemy.realmId !== world.currentRealmId) continue;
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
openStoryIntroIfNew();

Promise.all([loadServerPlayer(), loadQuestions()])
  .finally(() => requestAnimationFrame(loop));
