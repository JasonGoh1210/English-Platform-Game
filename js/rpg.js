import { t, getLanguage, onLanguageChange } from "./i18n.js?v=20261014-skills1";
import { playSound } from "./audio.js?v=20261014-skills1";
import { setSaveWarning, clearSaveWarning } from "./save-status.js?v=20261014-skills1";
import { normalizeTutorial, initialTutorial, tutorialActive, tutorialSlimeVisible, tutorialSlimeX, createTutorialGuide } from "./tutorial.js?v=20261014-skills1";
import { characterSprite, paintCharacterImages, paintCharacterImage, heroStoryText } from "./characters.js?v=20261014-skills1";
import { createQuestClient } from "./quest-api.js?v=20261014-skills1";
import { questGuidance, echoRooms, echoEnemyAvailable, storyTargets } from "./quest-guidance.js?v=20261014-skills1";
import { pixelArtPaths, drawPixelBackdrop, drawPixelGround, drawPixelLandmark, drawPixelCave } from "./pixel-world.js?v=20261014-skills1";
import { storyPortraitSource } from "./story-visuals.js?v=20261014-skills1";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const ui = {
  level: document.getElementById("levelText"),
  xp: document.getElementById("xpText"),
  power: document.getElementById("powerText"),
  coins: document.getElementById("coinsText"),
  playerName: document.querySelector(".pixel-player-name"),
  questTitle: document.getElementById("questTitle"),
  questText: document.getElementById("questText"),
  location: document.getElementById("locationText"),
  dialogue: document.getElementById("dialogue"),
  dialogueName: document.getElementById("dialogueName"),
  dialogueText: document.getElementById("dialogueText"),
  dialogueButton: document.getElementById("dialogueButton"),
  interactButton: document.getElementById("interactButton"),
  dialoguePortrait: document.getElementById("dialoguePortraitImage"),
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
  currentWord: null,
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
  currentDialogueNpcId: null, currentDialogueKey: null, currentDialogueIndex: 0, insideCave: false, typingCaveOpen: false, battle: null,
  tutorial: null
};

const worldBackgrounds = {
  maple: new Image(),
  forest: new Image(),
  camp: new Image(),
  ruins: new Image()
};

// Try the currently organized backgrounds folder first, then the root world folder.
// This supports both the repository layout and the user's previous local file placement.
// Players may keep their own backgrounds in images/world. The tracked
// assets/world/backgrounds files remain the reliable fallback for everyone.
const worldBackgroundPaths = {
  maple: ["/FYP/images/world/maple-town.webp?v=20261010-realmnames1", "/FYP/assets/world/backgrounds/maple-town.webp?v=20261010-realmnames1"],
  forest: ["/FYP/images/world/whispering-forest.webp?v=20261010-realmnames1", "/FYP/assets/world/backgrounds/whispering-forest.webp?v=20261010-realmnames1"],
  camp: ["/FYP/images/world/old-camp-road.webp?v=20261010-realmnames1", "/FYP/assets/world/backgrounds/old-camp-road.webp?v=20261010-realmnames1"],
  ruins: ["/FYP/images/world/ancient-ruins.webp?v=20261010-realmnames1", "/FYP/assets/world/backgrounds/ancient-ruins.webp?v=20261010-realmnames1"]
};
for (const realmId of Object.keys(worldBackgroundPaths)) {
  const availablePaths = window.EPQ_AUTH?.worldBackgrounds?.[realmId];
  if (Array.isArray(availablePaths)) {
    worldBackgroundPaths[realmId] = availablePaths.map(path => path + "?v=20261014-skills1");
  }
}

const worldBackgroundLoadedPaths = {};
function loadImageFromCandidates(image, paths, onReady, onFinalError) {
  if (!paths.length) {
    if (typeof onFinalError === "function") onFinalError();
    return;
  }
  let candidateIndex = 0;
  image.onload = () => {
    if (typeof onReady === "function") onReady(image.src);
  };
  image.onerror = () => {
    candidateIndex += 1;
    if (candidateIndex < paths.length) {
      image.src = paths[candidateIndex];
    } else if (typeof onFinalError === "function") {
      onFinalError();
    }
  };
  image.src = paths[0];
}
Object.entries(worldBackgrounds).forEach(([realmId, image]) => {
  image.decoding = "async";
  loadImageFromCandidates(
    image,
    worldBackgroundPaths[realmId],
    resolvedPath => {
      worldBackgroundLoadedPaths[realmId] = resolvedPath;
      console.info("[English Power Quest] World background ready:", realmId, resolvedPath);
    },
    () => console.warn("[English Power Quest] World background missing; using procedural fallback:", realmId)
  );
});

const AUTH_CONTEXT = window.EPQ_AUTH || {};
const questClient=createQuestClient(AUTH_CONTEXT.csrfToken,AUTH_CONTEXT.storageId||AUTH_CONTEXT.playerId,
  applyConfirmedQuest,waiting=>waiting?setSaveWarning("rewards","save.rewardFailed"):clearSaveWarning("rewards"));
paintCharacterImages(AUTH_CONTEXT.character);
const IS_GUEST = Boolean(AUTH_CONTEXT.isGuest);
const AUTH_PLAYER_ID = String(AUTH_CONTEXT.storageId || AUTH_CONTEXT.playerId || "guest");
const PLAYER_DISPLAY_NAME = String(
  AUTH_CONTEXT.displayName || ui.playerName?.textContent || "Adventurer"
).trim() || "Adventurer";

function personalizePlayerName(value) {
  return String(value ?? "")
    .replaceAll("亚历克斯·林（Alex Lin）", PLAYER_DISPLAY_NAME)
    .replaceAll("亚历克斯·林 (Alex Lin)", PLAYER_DISPLAY_NAME)
    .replaceAll("亚历克斯·林", PLAYER_DISPLAY_NAME)
    .replaceAll("亚历克斯", PLAYER_DISPLAY_NAME)
    .replaceAll("亚历", PLAYER_DISPLAY_NAME)
    .replace(/\bAlex Lin\b/gi, PLAYER_DISPLAY_NAME)
    .replace(/\bAlex\b/g, PLAYER_DISPLAY_NAME);
}
const WORLD_SAVE_KEY = `englishPowerQuest.world.v2.player.${AUTH_PLAYER_ID}`;
const WORLD_PENDING_KEY = `${WORLD_SAVE_KEY}.pending`;
const STORY_INTRO_SEEN_KEY = `englishPowerQuest.storyIntro.seen.v2.player.${AUTH_PLAYER_ID}`;
const NEW_ADVENTURE_TUTORIAL = Boolean(AUTH_CONTEXT.showStoryIntro);
let tutorialReady = false;
const renderTutorialGuide = createTutorialGuide(t, () => setMapTutorialStage("SKIPPED"));

function setMapTutorialStage(stage) {
  if (!tutorialReady || !world.tutorial || world.tutorial.stage === stage) return;
  world.tutorial = { ...world.tutorial, stage };
  saveWorldState();
  updateMapTutorial();
}

function initializeMapTutorial() {
  const saved = (() => { try { return JSON.parse(localStorage.getItem(WORLD_SAVE_KEY) || "null"); } catch { return null; } })();
  world.tutorial = initialTutorial(saved, NEW_ADVENTURE_TUTORIAL, world.player.x);
  tutorialReady = true;
  // Returning from Run/browser-back resumes the same lesson, without restoring HP or rewards.
  if (world.tutorial.stage === "BATTLE") world.tutorial.stage = "SLIME";
  updateMapTutorial();
  saveWorldState();
}

function updateMapTutorial() {
  if (!tutorialReady) return;
  const slime = enemies.find(enemy => enemy.id === "slime-01");
  if (slime) slime.x = tutorialSlimeX(world.tutorial);
  const visible = tutorialActive(world.tutorial) && world.currentRealmId === "maple"
    && !world.storyIntroOpen && !world.interacting && !world.travelMenu && !world.battle && !settingsIsOpen();
  if (visible && world.tutorial.stage === "MOVE"
      && Math.abs(world.player.x - world.tutorial.moveStartX) >= 70) {
    setMapTutorialStage("MEET");
    return;
  }
  if (slime?.defeated && tutorialActive(world.tutorial) && world.tutorial.stage !== "RETURN") {
    setMapTutorialStage("RETURN");
    return;
  }
  const targetX = world.tutorial.stage === "SLIME" ? 1140
    : ["MEET", "RETURN"].includes(world.tutorial.stage) ? 880 : null;
  const nearTarget = targetX !== null && Math.abs(world.player.x - targetX) < 240;
  renderTutorialGuide(world.tutorial, visible, getLanguage(), nearTarget);
}
let storyIntroPage = 0;
let storyMode = "intro";
let storySequence = [];
let storyCompletionCallback = null;
const BATTLE_KEY = `englishPowerQuest.battle.player.${AUTH_PLAYER_ID}`;
const ESCAPE_KEY = `englishPowerQuest.escape.v1.player.${AUTH_PLAYER_ID}`;

// MySQL is the durable save; localStorage is only a fast per-player cache.
let dbSaveReady = false;
let saveDelayHandle = null;
let pendingSaveData = null;
let saveChain = Promise.resolve();
let saveRevision = 0;
let lastPeriodicX = world.player.x;

function gameSaveRequest(state, keepalive = false) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  return fetch("/FYP/api/game_state.php", {
    method: "POST",
    credentials: "same-origin",
    keepalive,
    signal: controller.signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csrfToken: AUTH_CONTEXT.csrfToken || "", state })
  }).then(async response => {
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) throw new Error(result?.error || "Unable to save world");
    return result;
  }).finally(() => clearTimeout(timeout));
}

function flushGameSave() {
  if (!dbSaveReady || !pendingSaveData) return saveChain;
  clearTimeout(saveDelayHandle);
  const snapshot = pendingSaveData;
  const revision = saveRevision;
  pendingSaveData = null;
  saveChain = saveChain.catch(() => {}).then(async () => {
    await gameSaveRequest(snapshot);
    if (revision === saveRevision) {
      localStorage.removeItem(WORLD_PENDING_KEY);
      clearSaveWarning("world");
    }
    return true;
  }).catch(error => {
    console.warn("[English Power Quest] MySQL world save failed; local cache retained.", error);
    if (revision === saveRevision) {
      pendingSaveData = snapshot;
      setSaveWarning("world", "save.worldFailed");
      saveDelayHandle = setTimeout(flushGameSave, 5000);
    }
    return false;
  });
  return saveChain;
}

function queueGameSave(snapshot) {
  saveRevision += 1;
  pendingSaveData = snapshot;
  localStorage.setItem(WORLD_PENDING_KEY, "1");
  clearTimeout(saveDelayHandle);
  if (!dbSaveReady) return;
  saveDelayHandle = setTimeout(flushGameSave, 700);
}

async function loadServerGame() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch("/FYP/api/game_state.php", { credentials: "same-origin", cache: "no-store", signal: controller.signal });
    const result = await response.json();
    if (!response.ok || !result?.ok) throw new Error(result?.error || "Game state unavailable");
    const hasPendingLocalSave = localStorage.getItem(WORLD_PENDING_KEY) === "1"
      && localStorage.getItem(WORLD_SAVE_KEY) !== null;
    if (!hasPendingLocalSave && result.state && typeof result.state === "object") {
      const cached = (() => {
        try { return JSON.parse(localStorage.getItem(WORLD_SAVE_KEY) || "null") || {}; }
        catch { return {}; }
      })();
      localStorage.setItem(WORLD_SAVE_KEY, JSON.stringify({ ...cached, ...result.state }));
      loadWorldState();
      recenterCamera();
      updateQuest();
      syncHUD();
    }
    dbSaveReady = true;
    // Import an existing personal browser save into MySQL on first use.
    const local = localStorage.getItem(WORLD_SAVE_KEY);
    if (local && (hasPendingLocalSave || !result.state)) {
      queueGameSave(JSON.parse(local));
      void flushGameSave();
    }
    return true;
  } catch (error) {
    console.warn("[English Power Quest] Unable to restore MySQL world save; keeping browser cache.", error);
    // Do not write a default map over an existing server save after a failed GET.
    dbSaveReady = false;
    setTimeout(() => {
      void loadServerGame().then(async restored => {
        if (restored) {
          await loadServerPlayer();
          if (!tutorialReady) initializeMapTutorial();
        }
      });
    }, 5000);
    setSaveWarning("world", "save.worldFailed");
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

window.addEventListener("pagehide", () => {
  if (!dbSaveReady || localStorage.getItem(WORLD_PENDING_KEY) !== "1") return;
  const snapshot = (() => {
    try { return JSON.parse(localStorage.getItem(WORLD_SAVE_KEY) || "null"); }
    catch { return null; }
  })();
  if (snapshot) {
    const body = new Blob(
      [JSON.stringify({ csrfToken: AUTH_CONTEXT.csrfToken || "", state: snapshot })],
      { type: "application/json" }
    );
    // sendBeacon is designed for saves during navigation or browser close.
    if (navigator.sendBeacon) navigator.sendBeacon("/FYP/api/game_state.php", body);
    else void gameSaveRequest(snapshot, true).catch(() => {});
  }
});
setInterval(() => {
  if (world.battle || world.storyIntroOpen || world.typingCaveOpen || world.travelMenu) return;
  if (Math.abs(world.player.x - lastPeriodicX) < 16) return;
  lastPeriodicX = world.player.x;
  saveWorldState();
}, 5000);

function saveWorldState(overrides = {}) {
  const destination = destinations.find(item => item.id === world.currentRealmId) || destinations[0];
  const playerX = overrides.playerX !== undefined ? Number(overrides.playerX) : world.player.x;
  const insideCave = overrides.insideCave !== undefined ? Boolean(overrides.insideCave) : world.insideCave;
  const realmPositions = {
    ...world.realmPositions,
    [world.currentRealmId]: { playerX, insideCave, caveReturnX: world.caveReturnX }
  };
  world.realmPositions = realmPositions;
  const savedState = {
    storyVersion: 1,
    currentRealmId: world.currentRealmId, realmPositions, playerX,
    portalX: destination.portalX, insideCave, caveReturnX: world.caveReturnX,
    questStep: world.questStep, coins: world.coins, xp: world.xp, power: world.power, level: world.level,
    defeatedEnemyIds: enemies.filter(enemy => enemy.defeated).map(enemy => enemy.id),
    tutorial: world.tutorial,
    ...overrides
  };
  localStorage.setItem(WORLD_SAVE_KEY, JSON.stringify(savedState));
  queueGameSave(savedState);
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
    world.tutorial = normalizeTutorial(saved.tutorial);

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
playerStandSprite.src = "/FYP/assets/player/png_frames/Player_Stand.png?v=20261010-assetpaths1";

// Cave enemies keep the existing ghost sprite. Outdoor enemies prefer the user's
// newer SHrim asset. Try common capitalization, extension and folder variations.
const monsterSprite = new Image();
let monsterSpriteReady = false;
monsterSprite.onload = () => { monsterSpriteReady = true; };
monsterSprite.onerror = () => {
  monsterSpriteReady = false;
  console.warn("[English Power Quest] Unable to load map monster artwork.");
};
monsterSprite.src = "/FYP/assets/enemies/monster/Monster.png?v=20261010-assetpaths1";

const shrimSprite = new Image();
let shrimSpriteReady = false;
const shrimSpriteCandidates = [
  "/FYP/assets/enemies/monster/Shrim.png?v=20261010-assetpaths1"
];

loadImageFromCandidates(
  shrimSprite,
  shrimSpriteCandidates,
  () => {
    shrimSpriteReady = true;
    console.info("[English Power Quest] SHrim outdoor monster loaded.");
  },
  () => {
    shrimSpriteReady = false;
    console.warn("[English Power Quest] SHrim not found in assets/enemies/monster; outdoor encounters use the existing sprite fallback.");
  }
);

const mapEnemyArtPaths = {
  ...pixelArtPaths.monsters,
  "echo-slime-01": "/FYP/assets/enemies/monster/Shrim.png?v=20261010-enemyart1",
  "echo-dragon-01": "/FYP/assets/enemies/monster/Monster.png?v=20261010-enemyart1"
};
const mapEnemyArtById = {};
for (const [enemyId, imagePath] of Object.entries(mapEnemyArtPaths)) {
  const image = new Image();
  image.decoding = "async";
  image.onload = () => console.info("[English Power Quest] Loaded unique enemy art:", enemyId);
  image.onerror = () => console.warn("[English Power Quest] Could not load unique enemy art:", enemyId, imagePath);
  image.src = imagePath;
  mapEnemyArtById[enemyId] = image;
}

const npcPixelSprites = {};
for (const [id,path] of Object.entries(pixelArtPaths.npcs)) {
  const image=new Image();image.src=path;image.decoding="async";npcPixelSprites[id]=image;
}
const realmPortalSprite=new Image();realmPortalSprite.src=pixelArtPaths.portal;

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
      // There are no SVG frames in the current repository. Use the known idle
      // PNG as a safe fallback if any individual walking frame cannot load.
      if (img.dataset.standFallbackTried !== "true") {
        img.dataset.standFallbackTried = "true";
        img.src = "/FYP/assets/player/png_frames/Player_Stand.png?v=20261010-assetpaths1";
        return;
      }
      console.warn("[English Power Quest] Unable to load player frame:", frameName);
    };
    img.src = "/FYP/assets/player/png_frames/" + frameName + ".png?v=20261010-assetpaths1";
  });
}

function hasWalkFrame(direction, index) {
  const frame = playerWalkFrames[direction][index];
  return Boolean(frame && frame.complete && frame.naturalWidth > 0);
}

// Maple Town elder uses the selected hand-drawn NPC sprite instead of the
// procedural stand-in. Keep the existing Canvas character as a safe fallback.
const elderRowanSprite = new Image();
elderRowanSprite.decoding = "async";
elderRowanSprite.onerror = () => {
  elderRowanSprite.onerror = null;
  elderRowanSprite.src = "/FYP/images/npc/npc_elder_rowan_32.png?v=20261010-rowan1";
};
elderRowanSprite.src = pixelArtPaths.npcs.elder;
function elderRowanSpriteReady() {
  return elderRowanSprite.complete && elderRowanSprite.naturalWidth > 0;
}

const npcs = [
  { id: "elder", realmId: "maple", x: 880, name: "Elder Rowan", title: "Village Elder", titleKey: "npc.elder.title", nameKey: "npc.elder.name", dialogueKeys: ["npc.elder.1","npc.elder.2","npc.elder.3"], color: "#c79b6d", dialogue: ["Welcome to Maple Town, traveller.","The old road beyond the forest has gone silent.","If you want to help, follow the lanterns and learn the words of the road."] },
  { id: "mira", realmId: "forest", x: 790, name: "Mira", title: "Wandering Merchant", titleKey: "npc.mira.title", nameKey: "npc.mira.name", dialogueKeys: ["npc.mira.1","npc.mira.2","npc.mira.3"], color: "#c57f62", dialogue: ["You are heading into Whispering Forest, aren't you?","Remember: understanding a message can be more useful than a sharp sword.","I will wait here until you return."] },
  { id: "tala", realmId: "camp", x: 900, name: "Tala", title: "Camp Guide", titleKey: "npc.tala.title", nameKey: "npc.tala.name", dialogueKeys: ["npc.tala.1","npc.tala.2","npc.tala.3"], color: "#8c9d68", dialogue: ["The old road is safest when you read every sign.","Listen for the wind and watch the firelight; the trail changes after sunset.","Rest here, then carry what you have learned into the ruins."] },
  { id: "kai", realmId: "ruins", x: 870, name: "Kai", title: "System Keeper", titleKey: "npc.kai.title", nameKey: "npc.kai.name", dialogueKeys: ["npc.kai.1","npc.kai.2","npc.kai.3"], color: "#5f9db0", dialogue: ["These ruins belonged to the old network builders.","Their signs are written in technical English.","Bring me the right words and I can reopen the gate."] }
];

const landmarks = [
  { realmId: "maple", x: 420, type: "sign" },
  { realmId: "maple", x: 600, type: "house", variant: "cottage" },
  { realmId: "maple", x: 835, type: "house", variant: "elder" },
  { realmId: "maple", x: 1080, type: "house", variant: "shop" },
  { realmId: "maple", x: 1430, type: "bridge" },
  { realmId: "forest", x: 420, type: "sign" },
  { realmId: "forest", x: 620, type: "house", variant: "cottage" },
  { realmId: "forest", x: 990, type: "bridge" },
  { realmId: "forest", x: 1510, type: "tower" },
  { realmId: "camp", x: 420, type: "sign" },
  { realmId: "camp", x: 680, type: "camp" },
  { realmId: "camp", x: 1190, type: "bridge" },
  { realmId: "camp", x: 1580, type: "tower" },
  { realmId: "ruins", x: 340, type: "sign" },
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

// Single source of truth for localized names across HUD, wooden signposts,
// fixed world gates, travel menu and dialogue. No sign label is hard-coded.
function getLocalizedRealmName(realmId = world.currentRealmId) {
  const destination = destinations.find(item => item.id === realmId) || destinations[0];
  return t(destination.nameKey);
}

function getRealmSignDialogueKey(realmId = world.currentRealmId) {
  return `npc.sign.${destinations.some(item => item.id === realmId) ? realmId : "maple"}.text`;
}

const enemies = [
  { id: "slime-01", realmId: "maple", x: 1435, type: "slime", name: "Word Slime", difficulty: "EASY", hp: 60, damage: 10, xp: 20, coins: 10, defeated: false },
  { id: "bat-01", realmId: "forest", x: 1290, type: "bat", name: "Confusion Bat", difficulty: "EASY", hp: 70, damage: 10, xp: 25, coins: 12, defeated: false },
  { id: "road-guardian-01", realmId: "camp", x: 1370, type: "guardian", name: "Road Guardian", difficulty: "MEDIUM", hp: 85, damage: 11, xp: 28, coins: 14, defeated: false },
  { id: "guardian-01", realmId: "ruins", x: 1150, type: "guardian", name: "Grammar Guardian", difficulty: "MEDIUM", hp: 100, damage: 12, xp: 30, coins: 15, defeated: false },
  { id: "cave-wraith-01", realmId: "ruins", x: 810, type: "wraith", name: "Cave Wraith", difficulty: "MEDIUM", hp: 110, damage: 14, xp: 45, coins: 20, defeated: false, caveOnly: true },
  { id: "echo-slime-01", realmId: "ruins", x: 1350, type: "slime", name: "Rune Slime", nameKey: "guide.echo.slime", difficulty: "MEDIUM", hp: 80, damage: 10, xp: 25, coins: 12, defeated: false, caveOnly: true },
  { id: "echo-dragon-01", realmId: "ruins", x: 1870, type: "wraith", name: "Echo Dragon", nameKey: "guide.echo.dragon", difficulty: "MEDIUM", hp: 135, damage: 13, xp: 50, coins: 22, defeated: false, caveOnly: true }
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
  // Screen-space ground adapts to short windows; saved world X positions stay the same.
  world.groundY = Math.min(520, Math.max(160, window.innerHeight - 70));
  world.waterY = world.groundY + 130;
}

const mapHud = document.querySelector(".pixel-world-ui .hud");
if (mapHud && typeof ResizeObserver !== "undefined") {
  new ResizeObserver(() => {
    document.querySelector(".game-shell").style.setProperty("--map-hud-bottom", `${mapHud.getBoundingClientRect().bottom}px`);
  }).observe(mapHud);
}
window.addEventListener("resize", resize);
resize();

function resetMovementInput() {
  keys.clear();
  touch.left = false;
  touch.right = false;
  world.player.vx = 0;
  world.player.walkFrame = 0;
  world.player.walkTimer = 0;
}

// A lost key/pointer release must not keep the hero walking behind another window.
window.addEventListener("blur", resetMovementInput);
window.addEventListener("epq-settings-change", resetMovementInput);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) resetMovementInput();
});

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  // Native settings controls own their keys; Escape may already have closed the menu.
  if (e.defaultPrevented || settingsIsOpen()) return;

  if (world.storyIntroOpen) {
    if (k === "tab") {
      e.preventDefault();
      (document.activeElement === ui.storyIntroNext ? ui.storyIntroSkip : ui.storyIntroNext).focus();
    } else if (k === "enter" || k === " ") {
      e.preventDefault();
      if (!e.repeat) (document.activeElement === ui.storyIntroSkip ? finishStoryIntro : advanceStoryIntro)();
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
    if (k === "tab") {
      const buttons=[...ui.destinationScreen.querySelectorAll("button")].filter(button=>!button.disabled&&button.getClientRects().length);
      const index=buttons.indexOf(document.activeElement);
      e.preventDefault();buttons[(index+(e.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus();return;
    }
    if (["arrowleft", "a"].includes(k)) {
      e.preventDefault();
      if (!e.repeat) document.getElementById("destinationPrev").click();
      return;
    }
    if (["arrowright", "d"].includes(k)) {
      e.preventDefault();
      if (!e.repeat) document.getElementById("destinationNext").click();
      return;
    }
    if (k === "enter" || k === " ") {
      e.preventDefault();
      if (!e.repeat) {
        const focused=document.activeElement;
        if (focused?.tagName === "BUTTON" && ui.destinationScreen.contains(focused)) focused.click();
        else travelToSelectedDestination();
      }
      return;
    }
    if (k === "escape") {
      e.preventDefault();
      if (!e.repeat) closeDestinationMenu();
      return;
    }
    return;
  }

  if (world.interacting) return;

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

let journalNavigationPending = false;
document.querySelectorAll('a[href="/FYP/learning.php"], a[href="/FYP/skills.php"]').forEach(link => {
  link.addEventListener("click", async event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    if (journalNavigationPending) return;
    journalNavigationPending = true;
    resetMovementInput();
    try { saveWorldState(); await flushGameSave(); }
    catch (error) { console.warn("[English Power Quest] Journal navigation retains the available save.", error); }
    window.location.href = link.getAttribute("href");
  });
});

document.getElementById("destinationPrev").addEventListener("click", () => selectDestination(-1));
document.getElementById("destinationNext").addEventListener("click", () => selectDestination(1));
document.getElementById("destinationBack").addEventListener("click", closeDestinationMenu);
document.getElementById("destinationPreviewPrev").addEventListener("click", () => selectDestination(-1));
document.getElementById("destinationPreviewNext").addEventListener("click", () => selectDestination(1));
document.getElementById("destinationCard").addEventListener("click", travelToSelectedDestination);
for (const button of ui.destinationScreen.querySelectorAll(".destination-arrow, .destination-back")) {
  let releaseTimer;
  button.addEventListener("click", () => {
    clearTimeout(releaseTimer);
    button.classList.add("is-pressed");
    releaseTimer = setTimeout(() => button.classList.remove("is-pressed"), 140);
  });
}
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
    resetMovementInput();
    ui.interactButton.focus();
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

function showDialogue() {
  const portrait=storyPortraitSource(world.currentDialogueNpcId);
  ui.dialoguePortrait.src=portrait.src;
  ui.dialoguePortrait.alt=ui.dialogueName.textContent;
  ui.dialoguePortrait.dataset.portraitKind=pixelArtPaths.npcs[world.currentDialogueNpcId]?"npc":"object";
  ui.dialogue.classList.remove("hidden");
  resetMovementInput();
  ui.dialogueButton.focus();
}

function nearestEnemy() {
  let best = null;
  let dist = Infinity;
  const escapedId = getEscapedEnemyId();

  for (const enemy of enemies) {
    if (enemy.realmId !== world.currentRealmId) continue;
    if (enemy.defeated) continue;
    if (enemy.id === "slime-01" && !tutorialSlimeVisible(world.tutorial)) continue;
    if (Boolean(enemy.caveOnly) !== world.insideCave) continue;
    if (enemy.caveOnly && !echoEnemyAvailable(enemy.id, defeatedEnemyIds())) continue;

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
  return guideIsOpen() || !document.getElementById("settingsScreen")?.classList.contains("hidden");
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
          : PLAYER_DISPLAY_NAME,
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
  ui.storyIntroNext.focus();
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

function startEndingStoryboard(callback) {
  const frames = splitStoryParagraph(t("story.ending.body"), 3);
  const sequence = frames.map((body, index) => ({
    titleKey: "story.ending.title",
    body,
    character: index === 0 ? "kai" : "alex",
    speaker: index === 0 ? t("npc.kai.name") : PLAYER_DISPLAY_NAME,
    scene: index === 0 ? "ruins" : index === 1 ? "prologue" : "maple",
    location: index === 0
      ? t("location.ruins")
      : index === 1
        ? (getLanguage() === "zh" ? "清晨 · 校园" : "DAWN · CAMPUS")
        : t("location.maple"),
    camera: index === 0 ? "wide" : index === 1 ? "close" : "pan",
    effect: index === 0 ? "magic" : index === 1 ? "impact" : "magic",
    sfx: index === 0 ? "SHIIING!" : index === 1 ? (getLanguage() === "zh" ? "闪光！" : "FLASH!") : ""
  }));
  beginStoryboard(sequence, "ending", callback);
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
  const heroNarration = isIntro || storyMode === "ending";
  const heroText = text => heroNarration ? heroStoryText(text,AUTH_CONTEXT.character) : text;
  ui.storyIntroTitle.textContent = heroText(t(slide.titleKey));
  ui.storyIntroBody.textContent = personalizePlayerName(heroText(slide.body));
  ui.storyIntroProgress.style.width = `${(pageNumber / total) * 100}%`;
  ui.storyIntroNext.textContent = isIntro
    ? t(isLast ? "story.intro.start" : "story.intro.next")
    : (getLanguage() === "zh" ? (isLast ? "继续探索" : "下一格 →") : (isLast ? "RETURN TO EXPLORATION" : "NEXT PANEL →"));
  ui.storyIntroSkip.textContent = getLanguage() === "zh" ? "跳过演出" : "SKIP SCENE";
  document.getElementById("storyIntroHint").textContent = getLanguage() === "zh"
    ? "Enter · 继续　/　Esc · 跳过" : "Enter · Continue / Esc · Skip";
  ui.storyboardSpeaker.textContent = personalizePlayerName(slide.speaker || PLAYER_DISPLAY_NAME);
  ui.storyboardFrameTag.textContent = `${isIntro ? "PROLOGUE" : "CHAPTER"} · ${String(pageNumber).padStart(2, "0")}`;
  ui.storyboardLocation.textContent = slide.location || t("location.maple");
  ui.storyIntroPortraitImage.src = portrait.src;
  paintCharacterImage(ui.storyIntroPortraitImage,(slide.character || "alex") === "alex" ? AUTH_CONTEXT.character : null);
  ui.storyIntroPortraitImage.dataset.kind = portrait.kind;
  ui.storyIntroPortraitImage.alt = personalizePlayerName(slide.speaker || "Story character");
  ui.storyIntroCanvas.dataset.scene = slide.scene || "prologue";
  ui.storyIntroCanvas.dataset.camera = slide.camera || "wide";
  ui.storyIntroCanvas.dataset.effect = slide.effect || "magic";
  const storyBackgroundPath = slide.scene && slide.scene !== "prologue"
    ? (worldBackgroundLoadedPaths[slide.scene] || worldBackgroundPaths[slide.scene]?.[0])
    : pixelArtPaths.campus;
  ui.storyIntroSceneArt.style.backgroundImage = storyBackgroundPath
    ? `url("${storyBackgroundPath}")`
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
  // The server flag makes the account's first story play even if this browser
  // previously watched a story under a different account.
  if (!AUTH_CONTEXT.showStoryIntro) return;
  beginStoryboard(buildIntroStoryboard(), "intro");
}

function advanceStoryIntro() {
  if (!world.storyIntroOpen) return;
  if (storyIntroPage < storySequence.length - 1) {
    storyIntroPage += 1;
    renderStoryIntro();
    const slide = storySequence[storyIntroPage];
    if (slide?.sfx) playSound(slide.effect === "impact" ? "hurt" : "portal");
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
    AUTH_CONTEXT.showStoryIntro = false;
    {
      void fetch("/FYP/api/story_progress.php", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true, csrfToken: AUTH_CONTEXT.csrfToken || "" })
      }).then(response => response.json()).then(result => {
        if (!result?.ok) console.warn("Opening story completion was not saved to the account.", result?.error || "Unknown error");
      }).catch(error => console.warn("Opening story completion will remain local until the API is available.", error));
    }
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
  if (!world.typingCaveOpen) ui.interactButton.focus();
}



let npcQuestPending=false;
async function interact() {
  if(npcQuestPending)return;
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
    playSound("dialogue");
    world.interacting = true;
    world.currentDialogueNpcId = npc.id;
    world.currentDialogueIndex = world.questStep % npc.dialogueKeys.length;

    if (npc.id === "elder" && world.tutorial?.stage === "RETURN") {
      setMapTutorialStage("DONE");
      world.currentDialogueKey = "tutorial.complete";
      ui.dialogueName.textContent = t(npc.nameKey) + " · " + t(npc.titleKey);
      ui.dialogueText.textContent = t("tutorial.complete");
      showDialogue();
      playSound("level");
      return;
    }

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
      npcQuestPending=true;
      saveWorldState();
      if (await flushGameSave() === false) {
        world.interacting=false;npcQuestPending=false;setSaveWarning("rewards","save.rewardFailed");return;
      }
      const confirmed=await questClient.request("NPC",{npcId:npc.id});
      npcQuestPending=false;
      if (!confirmed.ok) {world.interacting=false;setSaveWarning("rewards","save.rewardFailed");return;}
      if (npc.id === "elder" && tutorialActive(world.tutorial)) {
        world.tutorial = { ...world.tutorial, stage: "SLIME" };
      }
      updateQuest();syncHUD();saveWorldState();
    } else if (npc.id === "kai" && world.questStep >= 5) {
      dialogueKey = "npc.kai.after";
    }

    if (storyBeatTriggered) {
      startChapterStoryboard(npc, beat,
        npc.id === "elder" && world.tutorial?.stage === "SLIME" ? "tutorial.rowanStory" : dialogueKey);
      return;
    }

    world.currentDialogueKey = dialogueKey;
    ui.dialogueName.textContent = t(npc.nameKey) + " · " + t(npc.titleKey);
    ui.dialogueText.textContent = t(dialogueKey);
    showDialogue();
    return;
  }

  const sign = landmarks.find(l => l.realmId === world.currentRealmId && l.type === "sign" && Math.abs(l.x - world.player.x) < 85);
  if (sign) {
    world.interacting = true;
    world.currentDialogueNpcId = "sign";
    world.currentDialogueKey = getRealmSignDialogueKey();
    ui.dialogueName.textContent = t("npc.sign.name") + " · " + getLocalizedRealmName();
    ui.dialogueText.textContent = t(world.currentDialogueKey);
    showDialogue();
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
  playSound("cave");
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
  showDialogue();
  saveWorldState({ playerX: world.player.x, insideCave: true });
}

function leaveCave() {
  playSound("portal");
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

function renderTypingQuestion() {
  const word = typingCaveState.currentWord;
  if (!typingUi.screen || !word) return;
  const isChinese = getLanguage() === "zh";

  typingUi.kicker.textContent = isChinese ? "回声之外 · 英语打字挑战" : "BEYOND THE ECHO · TYPING CHALLENGE";
  typingUi.title.textContent = t("guide.typing.name");
  const round = Math.min(typingCaveState.completedLevels, 2);
  const guardians = [
    { key: "guide.echo.wraith", src: pixelArtPaths.monsters["cave-wraith-01"] },
    { key: "guide.echo.slime", src: "/FYP/assets/enemies/monster/Shrim.png?v=20261010-enemyart1" },
    { key: "guide.echo.dragon", src: "/FYP/assets/enemies/monster/Monster.png?v=20261010-enemyart1" }
  ];
  const guardian = guardians[round];
  const monsterImage = typingUi.monster.querySelector("img");
  if (monsterImage.getAttribute("src") !== guardian.src) monsterImage.src = guardian.src;
  monsterImage.alt = t(guardian.key);
  document.getElementById("typingGuardianName").textContent = t(guardian.key);
  const rounds = document.getElementById("typingRounds");
  rounds.replaceChildren(...guardians.map((item, index) => {
    const li = document.createElement("li");
    li.textContent = (index < typingCaveState.completedLevels ? "✓ " : `${index + 1}. `) + t(item.key);
    li.classList.toggle("complete", index < typingCaveState.completedLevels);
    if (index === round) li.setAttribute("aria-current", "step");
    return li;
  }));
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
  playSound("cave");
  world.typingCaveOpen = true;
  world.player.vx = 0;
  keys.clear();
  touch.left = false;
  touch.right = false;

  typingCaveState.completedLevels = 0;
  typingCaveState.monsterLeft = TYPING_CAVE_START_POSITION;
  typingCaveState.approachSteps = 0;
  typingCaveState.passiveTimer = 0;
  typingCaveState.busy = true;
  typingCaveState.runId = null;
  typingCaveState.gameOver = false;
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

  const generation=typingCaveState.roundToken;
  saveWorldState();
  if(await flushGameSave()===false){typingUi.retry.classList.remove("hidden");setTypingMessage(getLanguage()==="zh"?"存档尚未确认，请检查连接后重试。":"Save not confirmed. Check your connection and retry.");return;}
  const result=await questClient.request("TYPING_START");
  if(!result.ok){typingUi.retry.classList.remove("hidden");setTypingMessage(getLanguage()==="zh"?"挑战暂时无法开始，请检查数据库更新与连接后重试。":"Challenge unavailable. Check the database update and connection, then retry.");return;}
  if(!world.typingCaveOpen||generation!==typingCaveState.roundToken){void questClient.request("TYPING_CLOSE",{runId:result.outcome.typing.runId});return;}
  const run=result.outcome.typing;
  typingCaveState.runId=run.runId;typingCaveState.questionToken=run.questionToken;
  typingCaveState.currentWord=run.word;typingCaveState.busy=false;
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
  if(typingCaveState.runId)void questClient.request("TYPING_CLOSE",{runId:typingCaveState.runId});
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
  playSound(reason === "wrong" ? "wrong" : "hurt");
  typingCaveState.approachSteps += 1;
  typingCaveState.monsterLeft = Math.max(27, typingCaveState.monsterLeft - TYPING_CAVE_STEP);
  typingCaveState.passiveTimer = 0;
  renderTypingQuestion();

  const isChinese = getLanguage() === "zh";
  if (typingCaveState.monsterLeft <= 32) {
    playSound("defeat");
    typingCaveState.gameOver = true;
    if(typingCaveState.runId)void questClient.request("TYPING_CLOSE",{runId:typingCaveState.runId});
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

async function submitTypingAnswer() {
  if (!world.typingCaveOpen || typingCaveState.busy || typingCaveState.gameOver || !typingCaveState.currentWord) return;
  const typed = typingUi.input.value.trim().toLowerCase().replace(/\s+/g, " ");
  if (!typed) {
    setTypingMessage(getLanguage() === "zh" ? "先输入一个英文答案。" : "Type an answer first.", "warning");
    typingUi.input.focus();
    return;
  }

  const generation=typingCaveState.roundToken;
  typingCaveState.busy=true;typingUi.input.disabled=true;typingUi.submit.disabled=true;
  const verified=await questClient.request("TYPING_ANSWER",{runId:typingCaveState.runId,questionToken:typingCaveState.questionToken,answer:typed});
  if(!world.typingCaveOpen||generation!==typingCaveState.roundToken)return;
  typingCaveState.busy=false;typingUi.input.disabled=false;typingUi.submit.disabled=false;
  if(!verified.ok){setTypingMessage(getLanguage()==="zh"?"答案尚未确认，请重试或重新进入挑战。":"Answer not confirmed. Retry or re-enter the challenge.","warning");return;}
  const correctAnswer = String(typingCaveState.currentWord.answer).trim().toLowerCase();
  if (!verified.outcome.correct) {
    typingUi.input.value = "";
    showTypingSpellingFeedback(typed, correctAnswer);
    advanceTypingMonster("wrong");
    return;
  }

  clearTypingSpellingFeedback();
  typingCaveState.lastMistake = null;
  playSound("correct");

  typingCaveState.busy = true;
  const token = ++typingCaveState.roundToken;
  const word = typingCaveState.currentWord;
  const isChinese = getLanguage() === "zh";
  typingCaveState.completedLevels = verified.outcome.typing.completedLevels;
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


  window.setTimeout(() => {
    if (!world.typingCaveOpen || token !== typingCaveState.roundToken) return;
    typingCaveState.passiveTimer = 0;
    clearTypingSpellingFeedback();
    typingUi.input.value = "";

    if (typingCaveState.completedLevels >= TYPING_CAVE_TOTAL_LEVELS) {
      typingCaveState.gameOver = true;
      typingCaveState.busy = true;
      const storyEnding = verified.outcome.storyEnding;
      const showTypingVictory = () => {
        playSound("victory");
        typingUi.winTitle.textContent = storyEnding
          ? t("story.ending.title")
          : (isChinese ? "挑战成功！" : "CAVE CLEARED!");
        typingUi.winMessage.textContent = storyEnding
          ? (isChinese
            ? "你完成了全部三关，也走完了英语力量任务的主线旅程。带着学会的词语，回去开启新的生活吧。"
            : "You completed all three levels and the main story. Take your new words back to campus and begin a new chapter.")
          : (isChinese
            ? "三关全部完成！你成功把怪物击退，获得了全部奖励。"
            : "You completed all three levels and pushed the monster away. All rewards have been earned!");
        typingUi.winReplay.textContent = isChinese ? "再玩一次" : "PLAY AGAIN";
        typingUi.winExit.textContent = isChinese ? "返回地图" : "BACK TO MAP";
        typingUi.winOverlay.classList.remove("hidden");
        typingUi.winReplay.focus();
      };

      if (storyEnding) {
        startEndingStoryboard(showTypingVictory);
      } else {
        showTypingVictory();
      }
      return;
    }

    typingCaveState.busy = false;
    typingUi.input.disabled = false;
    typingUi.submit.disabled = false;
    typingCaveState.currentWord=verified.outcome.typing.word;
    typingCaveState.questionToken=verified.outcome.typing.questionToken;
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
  closeTypingCave();void openTypingCave();
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
  ui.destinationTitle.classList.toggle("long-title", getLanguage() === "en" && t(destination.nameKey).length > 14);
  document.getElementById("destinationSceneImage").src = "/FYP/images/world/pixel/" + destination.id + ".png";
  document.getElementById("destinationRune").textContent = ["Ⅰ","Ⅱ","Ⅲ","Ⅳ"][world.selectedDestinationIndex];
  document.getElementById("destinationCard").setAttribute("aria-label", t("destination.cardTravel", { name: t(destination.nameKey) }));
  for (const [id,offset] of [["destinationPreviewPrev",-1],["destinationPreviewNext",1]]) {
    const realm=destinations[(world.selectedDestinationIndex+offset+destinations.length)%destinations.length];
    const preview=document.getElementById(id);preview.style.backgroundImage='url("/FYP/images/world/pixel/'+realm.id+'.png")';
    preview.querySelector("span").textContent=t(realm.nameKey);
    preview.setAttribute("aria-label",t(offset<0?"destination.previous":"destination.next")+" · "+t(realm.nameKey));
  }
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
  document.getElementById("destinationCard").focus();
}

function closeDestinationMenu() {
  world.travelMenu = false;
  ui.destinationScreen.classList.add("hidden");
  keys.clear();
  document.getElementById("interactButton").focus();
}

function travelToSelectedDestination() {
  if (!world.travelMenu) return;
  playSound("portal");
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
  updateQuestGuidance();
}

function defeatedEnemyIds() {
  return enemies.filter(enemy => enemy.defeated).map(enemy => enemy.id);
}

function currentGuidance() {
  return questGuidance({ chapter: world.questStep, realm: world.currentRealmId,
    x: world.player.x, insideCave: world.insideCave, tutorial: world.tutorial,
    slimeX: tutorialActive(world.tutorial) ? tutorialSlimeX(world.tutorial) : 1435,
    defeatedIds: defeatedEnemyIds() });
}

function guideIsOpen() {
  return !document.getElementById("questGuideScreen").classList.contains("hidden");
}

let lastGuidanceText = "";
function updateQuestGuidance() {
  const guide = currentGuidance();
  const targetName = t(guide.target.nameKey);
  const target = t("guide.nextTarget", { name: targetName, realm: getLocalizedRealmName(guide.target.realm) });
  let route = t(guide.routeKey, { realm: getLocalizedRealmName(guide.target.realm) });
  if (world.insideCave) route = t("guide.echo.progress", { count: guide.echo.cleared }) + " · " + route;
  const signature = target + route + world.questStep + getLanguage();
  if (signature === lastGuidanceText) return;
  lastGuidanceText = signature;
  ui.questText.textContent = target;
  document.getElementById("questDirection").textContent = route;
  document.getElementById("questGuideTarget").textContent = target;
  document.getElementById("questGuideRoute").textContent = route;
  const main = document.getElementById("questGuideMain");
  main.classList.toggle("hidden", !world.insideCave);
  main.textContent = t("guide.mainAfterCave", { name: t(guide.mainTarget.nameKey), realm: getLocalizedRealmName(guide.mainTarget.realm) });
  document.getElementById("questGuideEchoProgress").textContent = world.insideCave
    ? t("guide.echo.progress", { count: guide.echo.cleared }) : t("guide.echo.replay");
  const chapters = document.getElementById("questGuideChapters");
  chapters.replaceChildren(...storyTargets.map((item, index) => {
    const li = document.createElement("li");
    li.textContent = (index < world.questStep ? "✓ " : `${index + 1}. `) + t(item.nameKey);
    if (index === world.questStep) li.setAttribute("aria-current", "step");
    return li;
  }));
}

function closeQuestGuide() {
  document.getElementById("questGuideScreen").classList.add("hidden");
  const button = document.getElementById("questGuideOpen");
  button.setAttribute("aria-expanded", "false");
  button.focus();
}

document.getElementById("questGuideOpen").addEventListener("click", () => {
  if (world.storyIntroOpen || world.interacting || world.typingCaveOpen || world.travelMenu || world.battle) return;
  keys.clear(); touch.left = false; touch.right = false; world.player.vx = 0;
  updateQuestGuidance();
  document.getElementById("questGuideScreen").classList.remove("hidden");
  document.getElementById("questGuideOpen").setAttribute("aria-expanded", "true");
  document.getElementById("questGuideClose").focus();
});
document.getElementById("questGuideClose").addEventListener("click", closeQuestGuide);
document.getElementById("questGuideScreen").addEventListener("click", event => {
  if (event.target.id === "questGuideScreen") closeQuestGuide();
});
window.addEventListener("keydown", event => {
  if (!guideIsOpen()) return;
  if (event.key === "Escape") { event.preventDefault(); closeQuestGuide(); }
  if (event.key === "Tab") { event.preventDefault(); document.getElementById("questGuideClose").focus(); }
});


function updateLocation() {
  ui.location.textContent = world.insideCave ? t("location.cave") : getLocalizedRealmName();
}

function refreshWorldLanguage() {
  const journalLink = document.querySelector(".pixel-learning-link");
  if (journalLink) journalLink.title = t("learning.seen") + " · " + t("learning.open");
  updateQuest();
  syncHUD();
  updateLocation();
  if (world.storyIntroOpen) renderStoryIntro();
  if (world.currentDialogueNpcId) {
    if (world.currentDialogueNpcId === "sign") {
      ui.dialogueName.textContent = t("npc.sign.name") + " · " + getLocalizedRealmName();
      ui.dialogueText.textContent = t(getRealmSignDialogueKey());
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
  if (!ui.dialogue.classList.contains("hidden")) ui.dialoguePortrait.alt=ui.dialogueName.textContent;
}

onLanguageChange(refreshWorldLanguage);

function syncHUD() {
  ui.level.textContent = world.level;
  const progress=world.levelProgress;
  ui.xp.textContent=progress?.maxLevel?(getLanguage()==="zh"?"满级":"MAX"):(progress?.currentXp??world.xp);
  const target=document.getElementById("mapXpTarget"),divider=document.getElementById("mapXpDivider"),bar=document.getElementById("mapXpBar");
  if(target){target.textContent=progress?.requiredXp??"—";target.classList.toggle("hidden",Boolean(progress?.maxLevel));}
  if(divider)divider.classList.toggle("hidden",Boolean(progress?.maxLevel));
  if(bar)bar.style.width=(progress?.percent??0)+"%";
  ui.power.textContent = world.power;
  ui.coins.textContent = world.coins;
}

function applyConfirmedQuest(result) {
  const previousLevel=world.level;
  const player=result.player;
  world.level=Number(player.level);world.xp=Number(player.xp);world.coins=Number(player.coins);
  world.power=Number(player.englishPowerTotal);world.levelProgress=player.levelProgress;
  world.questStep=Number(result.chapterStep);
  if(result.outcome?.npcId==="elder"&&tutorialActive(world.tutorial)&&["MOVE","MEET"].includes(world.tutorial.stage)) {
    world.tutorial={...world.tutorial,stage:"SLIME"};
  }
  updateQuest();syncHUD();saveWorldState();
  if(world.level>previousLevel)playSound("level");
}

async function loadServerPlayer() {
  try {
    const response = await fetch("/FYP/api/player.php", { cache: "no-store" });
    if (!response.ok) return false;
    const data = await response.json();
    if (!data?.ok || !data.player) return false;

    // Once the DB API is available, use its progression balances as the
    // authoritative values instead of allowing localStorage to drift.
    if (ui.playerName && data.player.displayName) ui.playerName.textContent = String(data.player.displayName);
    world.level = Number(data.player.level || 1);
    world.xp = Number(data.player.xp || 0);
    world.coins = Number(data.player.coins || 0);
    world.power = Number(data.player.englishPowerTotal || 0);
    world.levelProgress=data.player.levelProgress;
    const seen = document.getElementById("questionsSeenText");
    if (seen) seen.textContent = Number.isSafeInteger(data.learning?.questionsSeen) ? String(data.learning.questionsSeen) : "—";
    const journal = document.querySelector(".pixel-learning-link");
    if (journal) journal.title = t("learning.seen") + " · " + t("learning.open");
    world.questStep=Number(data.player.chapterStep||0);
    if(world.questStep>=1&&tutorialActive(world.tutorial)&&["MOVE","MEET"].includes(world.tutorial.stage)) {
      world.tutorial={...world.tutorial,stage:"SLIME"};
    }
    updateQuest();
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

async function startBattle(enemy) {
  if (!enemy || enemy.defeated || world.battle) return;
  playSound("encounter");
  world.battle = enemy;
  if (enemy.id === "slime-01" && world.tutorial?.stage === "SLIME") {
    world.tutorial = { ...world.tutorial, stage: "BATTLE" };
  }

  // Save a safe spawn point before leaving the map so refreshing the map
  // cannot immediately retrigger the same encounter.
  const safeX = Math.max(100, enemy.x - 220);
  saveWorldState({ playerX: safeX });

  sessionStorage.setItem(BATTLE_KEY, JSON.stringify({ enemyId: enemy.id }));
  sessionStorage.removeItem(ESCAPE_KEY);
  await flushGameSave();
  window.location.href = "/FYP/battle.php";
}

function update(dt) {
  world.time += dt;
  updateMapTutorial();

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

  if (!world.battle && !world.interacting && !world.travelMenu && !settingsIsOpen()) {
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

  const compactLandscape = window.innerHeight <= 540 && window.innerWidth >= 560 && window.innerWidth <= 780;
  const targetCamera = clamp(world.player.x - window.innerWidth * (compactLandscape ? 0.4 : 0.5), 0, world.width - window.innerWidth);
  world.cameraX += (targetCamera - world.cameraX) * Math.min(1, dt * 6);

  updateLocation();
  updateQuestGuidance();
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
    drawQuestMarker();
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
  drawTutorialMarker();
  drawQuestMarker();
}

function drawQuestMarker() {
  if (world.storyIntroOpen || world.interacting || world.travelMenu || settingsIsOpen() || tutorialActive(world.tutorial)) return;
  const guide = currentGuidance();
  const x = Math.round(worldToScreen(guide.routeX));
  if (x < 18 || x > window.innerWidth - 18) return;
  const y = Math.round(world.groundY - (guide.viaPortal ? 245 : 200) + Math.sin(world.time * 3) * 3);
  ctx.save();ctx.fillStyle = "#ffe095";
  ctx.fillRect(x - 4, y, 8, 14);
  ctx.beginPath();ctx.moveTo(x - 10, y + 14);ctx.lineTo(x + 10, y + 14);ctx.lineTo(x, y + 25);ctx.closePath();ctx.fill();
  ctx.restore();
}

function drawTutorialMarker() {
  if (!tutorialActive(world.tutorial) || world.currentRealmId !== "maple" || world.storyIntroOpen) return;
  const stage = world.tutorial.stage;
  const target = ["MEET", "RETURN"].includes(stage) ? 880 : stage === "SLIME" ? 1140 : null;
  if (target === null) return;
  if (stage !== "SLIME" && Math.abs(world.player.x - target) < 95) return;
  const x = Math.round(worldToScreen(target));
  const y = Math.round(world.groundY - (stage === "SLIME" ? 115 : 150) + Math.sin(world.time * 4) * 4);
  ctx.save();
  ctx.fillStyle = "#ffe095";
  ctx.fillRect(x - 4, y - 20, 8, 14);
  ctx.beginPath(); ctx.moveTo(x - 11, y - 6); ctx.lineTo(x + 11, y - 6); ctx.lineTo(x, y + 5); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function worldToScreen(x, parallax = 1) {
  return x - world.cameraX * parallax;
}

function getWorldSceneForX() {
  return world.currentRealmId;
}

function drawWorldBackdrop(w, h, scene) {
  drawPixelBackdrop(ctx, worldBackgrounds[scene], {width:w,height:h,ground:world.groundY,realm:scene,camera:world.cameraX});
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
  drawPixelGround(ctx,{width:w,height:h,ground:world.groundY,realm:scene,camera:world.cameraX});
}



function drawLandmarks() {
  for (const l of landmarks) {
    if(l.realmId!==world.currentRealmId)continue;
    const x=worldToScreen(l.x);if(x < -220 || x > window.innerWidth+220)continue;
    if(l.type==="sign")drawSign(x,world.groundY,l.realmId);
    else if(l.type==="cave")drawCaveEntrance(x,world.groundY,Math.abs(l.x-world.player.x)<125);
    else if(l.type==="typingCave")drawTypingCaveEntrance(x,world.groundY,Math.abs(l.x-world.player.x)<135);
    else drawPixelLandmark(ctx,l.type,x,world.groundY,l.variant);
  }
}

function drawCaveEntrance(x, ground, nearby) {
  drawPixelLandmark(ctx,"cave",x,ground);
  ctx.save();ctx.textAlign="center";ctx.font="bold 12px system-ui";ctx.fillStyle="#c5e3eb";
  ctx.fillText(t("cave.entranceName"),x,ground-150);ctx.font="bold 10px system-ui";
  ctx.fillText(t("guide.echo.short"),x,ground-134);
  if(nearby){ctx.fillStyle="#142631";ctx.fillRect(Math.round(x-105),ground-180,210,22);ctx.fillStyle="#e9ddba";ctx.fillText(t("cave.enterPrompt"),x,ground-165);}
  ctx.restore();
}

function drawTypingCaveEntrance(x, ground, nearby) {
  drawPixelLandmark(ctx,"typingCave",x,ground);
  ctx.save();ctx.textAlign="center";ctx.font="bold 12px system-ui";ctx.fillStyle="#d5c7eb";
  ctx.fillText(t("guide.typing.name"),x,ground-150);ctx.font="bold 10px system-ui";
  ctx.fillText(t("guide.typing.short"),x,ground-134);
  if(nearby){ctx.fillStyle="#221d33";ctx.fillRect(Math.round(x-110),ground-180,220,22);ctx.fillStyle="#e9ddba";ctx.fillText(getLanguage()==="zh"?"按 E / 互动开始三关拼写":"E / INTERACT · SPELLING",x,ground-165);}
  ctx.restore();
}

function drawCaveScene(w, h) {
  drawPixelCave(ctx,{width:w,height:h,ground:world.groundY,camera:world.cameraX});
}

function drawCaveExit() {
  const x=worldToScreen(260);if(x < -120 || x > window.innerWidth+120)return;
  drawPixelLandmark(ctx,"cave",x,world.groundY);
  ctx.save();ctx.textAlign="center";ctx.fillStyle="#c5e3eb";ctx.font="bold 12px system-ui";
  ctx.fillText(t("guide.echo.exit"),x,world.groundY-148);
  if(Math.abs(world.player.x-260)<125){ctx.fillStyle="#142631";ctx.fillRect(Math.round(x-105),world.groundY-180,210,22);ctx.fillStyle="#e9ddba";ctx.font="bold 10px system-ui";ctx.fillText(t("cave.exitPrompt"),x,world.groundY-165);}
  ctx.restore();
}

function drawCaveDetails() {
  for(const room of echoRooms){const x=Math.round(worldToScreen(room.x));if(x < -160 || x > window.innerWidth+160)continue;
    ctx.save();ctx.textAlign="center";ctx.font="bold 12px system-ui";
    const label=t(room.roomKey),w=ctx.measureText(label).width+16;
    ctx.fillStyle="#182735";ctx.fillRect(Math.round(x-w/2),world.groundY-248,Math.ceil(w),24);
    ctx.fillStyle=echoEnemyAvailable(room.id,defeatedEnemyIds())?"#ecd49c":"#8194a7";ctx.fillText(label,x,world.groundY-232);ctx.restore();}
  for(const worldX of [510,1060,1550,2040]){const x=Math.round(worldToScreen(worldX));if(x < -40 || x > window.innerWidth+40)continue;
    ctx.fillStyle="#417789";ctx.fillRect(x,world.groundY-24,12,24);ctx.fillRect(x+4,world.groundY-32,4,8);
    ctx.fillStyle="#86bcc5";ctx.fillRect(x+4,world.groundY-28,4,24);}
}

function drawCaveForeground(w, h) {
  // Sparse pixel columns preserve depth without covering gameplay or adding noise.
  for(const worldX of [40,2130]){const x=Math.round(worldToScreen(worldX));if(x < -32 || x > w+32)continue;
    ctx.fillStyle="#0c1723";ctx.fillRect(x-12,world.groundY-128,24,128);ctx.fillRect(x-20,world.groundY-132,40,8);}
}

function drawWorldPortals() {
  const destination = destinations.find(item => item.id === world.currentRealmId);
  if (destination) drawPortal(destination);
}

function drawPortal(destination) {
  const x=Math.round(worldToScreen(destination.portalX)),ground=Math.round(world.groundY);if(x < -140 || x > window.innerWidth+140)return;
  ctx.save();ctx.imageSmoothingEnabled=false;
  if(realmPortalSprite.complete&&realmPortalSprite.naturalWidth)ctx.drawImage(realmPortalSprite,x-96,ground-192,192,192);
  else drawPixelLandmark(ctx,"cave",x,ground);
  ctx.textAlign="center";ctx.font="bold 12px system-ui";ctx.fillStyle="#e8d8ab";ctx.fillText(getLocalizedRealmName(destination.id),x,ground-174);
  if(Math.abs(destination.portalX-world.player.x)<145){ctx.fillStyle="#152634";ctx.fillRect(x-100,ground-204,200,22);ctx.fillStyle="#f2dfac";ctx.font="bold 11px system-ui";ctx.fillText(t("portal.interact"),x,ground-189);}
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

const wayfinderSignSprite = new Image();
wayfinderSignSprite.src = pixelArtPaths.sign;
function drawSign(x, ground, realmId) {
  ctx.save();ctx.imageSmoothingEnabled=false;
  if(wayfinderSignSprite.complete && wayfinderSignSprite.naturalWidth)ctx.drawImage(wayfinderSignSprite,Math.round(x-64),Math.round(ground-128),128,128);
  else {ctx.fillStyle='#896442';ctx.fillRect(x-60,ground-122,120,50);ctx.fillRect(x-40,ground-78,10,78);ctx.fillRect(x+30,ground-78,10,78);}
  ctx.fillStyle='#f6dfb5';ctx.textAlign='center';
  ctx.font=getLanguage()==='zh'?'bold 12px system-ui':"bold 11px 'Courier New', monospace";
  const label=getLocalizedRealmName(realmId);
  if(getLanguage()!=='zh' && ctx.measureText(label).width>92){
    const words=label.split(' '),last=words.pop();ctx.fillText(words.join(' '),x-8,ground-100,92);ctx.fillText(last,x-8,ground-86,92);
  }else ctx.fillText(label,x-8,ground-92,92);
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
    // The new elder's staff is taller than the procedural NPC; move the E
    // prompt above the staff while retaining the existing interaction radius.
    const promptLift = npc.id === "elder" && elderRowanSpriteReady() ? 18 : 0;
    if (nearby) {
      const glow = .72 + Math.sin(world.time * 5) * .18;
      ctx.save();
      ctx.globalAlpha = glow;
      ctx.fillStyle = "rgba(13, 20, 26, .9)";
      ctx.fillRect(x - 14, world.groundY - 141 - promptLift, 28, 25);
      ctx.strokeStyle = "#f0cc78";
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 14, world.groundY - 141 - promptLift, 28, 25);
      ctx.fillStyle = "#ffe6a0";
      ctx.font = "bold 14px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("E", x, world.groundY - 123 - promptLift);
      ctx.restore();
    } else {
      ctx.fillStyle = "rgba(16, 22, 23, .78)";
      ctx.beginPath();
      ctx.moveTo(x, world.groundY - 126 - promptLift);
      ctx.lineTo(x + 5, world.groundY - 121 - promptLift);
      ctx.lineTo(x, world.groundY - 116 - promptLift);
      ctx.lineTo(x - 5, world.groundY - 121 - promptLift);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#f1d17f";
      ctx.fillRect(x - 1, world.groundY - 122 - promptLift, 2, 2);
    }
  }
}

function drawStyledNPC(x, ground, npc) {
  const image=npc.id==="elder"?elderRowanSprite:npcPixelSprites[npc.id];
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.fillStyle="#18252a";ctx.fillRect(Math.round(x-22),Math.round(ground-2),44,4);
  if(image?.complete&&image.naturalWidth){ctx.drawImage(image,Math.round(x-64),Math.round(ground-(image.naturalWidth===32?128:124)),128,128);}
  else{ctx.fillStyle=npc.color;ctx.fillRect(Math.round(x-16),Math.round(ground-72),32,64);ctx.fillStyle="#d3ad85";ctx.fillRect(Math.round(x-12),Math.round(ground-92),24,24);ctx.fillStyle="#25313b";ctx.fillRect(Math.round(x-16),Math.round(ground-12),12,12);ctx.fillRect(Math.round(x+4),Math.round(ground-12),12,12);}
  ctx.restore();
}


function drawEnemies() {
  for (const enemy of enemies) {
    if (enemy.realmId !== world.currentRealmId) continue;
    if (enemy.defeated) continue;
    if (enemy.id === "slime-01" && !tutorialSlimeVisible(world.tutorial)) continue;
    if (Boolean(enemy.caveOnly) !== world.insideCave) continue;
    if (enemy.caveOnly && !echoEnemyAvailable(enemy.id, defeatedEnemyIds())) continue;
    const x = worldToScreen(enemy.x);
    if (x < -100 || x > window.innerWidth + 100) continue;
    const dedicatedSprite = mapEnemyArtById[enemy.id];
    const dedicatedReady = Boolean(dedicatedSprite && dedicatedSprite.complete && dedicatedSprite.naturalWidth > 0);
    // Use a distinct image for every non-slime creature; never reuse the Slime art
    // as a silent fallback for the Bat or Guardians.
    const activeSprite = dedicatedReady
      ? dedicatedSprite
      : enemy.type === "slime"
        ? (shrimSpriteReady ? shrimSprite : null)
        : (enemy.caveOnly && monsterSpriteReady ? monsterSprite : null);

    if (activeSprite) {
      const dimensionsByEnemy = {
        "slime-01": [104, 96],
        "bat-01": [145, 132],
        "road-guardian-01": [192, 192],
        "guardian-01": [192, 192],
        "cave-wraith-01": [154, 174],
        "echo-slime-01": [115, 105],
        "echo-dragon-01": [210, 200]
      };
      const [maxWidth, maxHeight] = dimensionsByEnemy[enemy.id] || [154, 158];
      const naturalWidth = activeSprite.naturalWidth || maxWidth;
      const naturalHeight = activeSprite.naturalHeight || maxHeight;
      const fittingScale = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight);
      const nativePixelSprite = [32,64].includes(naturalWidth) && naturalHeight === naturalWidth;
      const scale = nativePixelSprite ? Math.max(1, Math.floor(fittingScale)) : fittingScale;
      const drawWidth = naturalWidth * scale;
      const drawHeight = naturalHeight * scale;
      ctx.drawImage(
        activeSprite,
        Math.round(x - drawWidth / 2),
        Math.round(world.groundY - drawHeight),
        Math.round(drawWidth),
        Math.round(drawHeight)
      );
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
      characterSprite(displayFrame, AUTH_CONTEXT.character, {moving:displayFrameIsWalk,direction:currentWalkDirection,frame:currentWalkIndex}),
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
  // The tile layer already defines the ground; keep foreground decoration sparse.
  const offset=-Math.floor(world.cameraX)%128;
  for(let x=offset;x<w;x+=128){ctx.fillStyle="#536957";if(world.currentRealmId!=="ruins"&&world.currentRealmId!=="camp")ctx.fillRect(x+20,world.groundY-4,4,4);}
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

function drawFatalFrameError(error) {
  console.error("[English Power Quest] Frame rendering failed:", error);
  const w = window.innerWidth;
  const h = window.innerHeight;
  try {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#111923";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#ffd2a8";
    ctx.font = "bold 22px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("The game encountered a drawing error.", w / 2, h / 2 - 28);
    ctx.fillStyle = "#ffffff";
    ctx.font = "14px system-ui";
    ctx.fillText(String(error && error.message ? error.message : error).slice(0, 140), w / 2, h / 2 + 4);
    ctx.fillStyle = "#b7c6d6";
    ctx.font = "13px system-ui";
    ctx.fillText("Open the browser Console (F12) for details.", w / 2, h / 2 + 32);
  } catch (fallbackError) {
    console.error("[English Power Quest] Could not draw the error message:", fallbackError);
  }
}

function loop(now) {
  if (!lastTime) lastTime = now;
  const dt = Math.min(.033, (now - lastTime) / 1000);
  lastTime = now;
  try {
    update(dt);
    draw();
  } catch (error) {
    drawFatalFrameError(error);
  }
  requestAnimationFrame(loop);
}

// Read-only browser diagnostics: never expose answer keys, session tokens or IDs.
window.render_game_to_text = () => JSON.stringify({
  coordinates: "World origin at the left; x increases right; groundY is screen pixels downward.",
  realm: world.currentRealmId,
  mode: world.storyIntroOpen ? "STORY" : world.interacting ? "DIALOGUE" : world.typingCaveOpen ? "TYPING"
    : guideIsOpen() ? "QUEST_GUIDE" : world.travelMenu ? "TRAVEL" : world.battle ? "BATTLE_TRANSITION" : "MAP",
  player: { x: Math.round(world.player.x), vx: world.player.vx, groundY: world.groundY },
  tutorial: world.tutorial?.stage || null,
  chapter: world.questStep,
  story: world.storyIntroOpen ? { mode:storyMode,page:storyIntroPage+1,total:storySequence.length,
    title:ui.storyIntroTitle.textContent,speaker:ui.storyboardSpeaker.textContent,
    portrait:ui.storyIntroPortraitImage.getAttribute("src") } : null,
  portalX: world.portalX,
  landmarks: landmarks.filter(item=>item.realmId===world.currentRealmId).map(item=>({type:item.type,x:item.x})),
  guidance: currentGuidance(),
  typing: world.typingCaveOpen ? { round: typingCaveState.completedLevels + 1, monsterLeft: typingCaveState.monsterLeft,
    hintHiddenLetters: document.querySelectorAll(".typing-cave-letter:not(.revealed)").length } : null,
  enemies: enemies.filter(enemy => enemy.realmId === world.currentRealmId && !enemy.defeated
    && Boolean(enemy.caveOnly) === world.insideCave && (!enemy.caveOnly || echoEnemyAvailable(enemy.id, defeatedEnemyIds()))
    && (enemy.id !== "slime-01" || tutorialSlimeVisible(world.tutorial)))
    .map(enemy => ({ name: enemy.name, x: enemy.x })),
  npcs: npcs.filter(npc => npc.realmId === world.currentRealmId && !world.insideCave)
    .map(npc => ({ name: npc.name, x: npc.x }))
});


function runStartupStep(name, task) {
  try {
    task();
  } catch (error) {
    console.error("[English Power Quest] Startup step failed: " + name, error);
  }
}

// Start rendering BEFORE setup tasks. If saved-state/story setup fails, the
// canvas still renders (or shows the drawing error), rather than staying blank.
requestAnimationFrame(loop);

runStartupStep("loadWorldState", loadWorldState);
runStartupStep("recenterCamera", recenterCamera);
runStartupStep("restoreEscapeState", restoreEscapeState);
runStartupStep("updateQuest", updateQuest);
runStartupStep("syncHUD", syncHUD);
runStartupStep("openStoryIntroIfNew", openStoryIntroIfNew);

void (async () => {
  const restored = await loadServerGame();
  if (restored) await Promise.all([loadServerPlayer(), loadQuestions()]);
  else await loadQuestions();
  if (restored) {await questClient.recover();initializeMapTutorial();}
})().catch(error => {
  console.warn("[English Power Quest] Startup data could not be loaded.", error);
});
