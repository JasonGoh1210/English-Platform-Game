import { t, getLanguage, setLanguage, onLanguageChange } from "./i18n.js?v=20261014-storypixel";
import { battleToken, createBattleClient } from "./battle-api.js?v=20261014-storypixel";
import { setSaveWarning, clearSaveWarning } from "./save-status.js?v=20261014-storypixel";
import { playSound } from "./audio.js?v=20261014-storypixel";
import { normalizeTutorial } from "./tutorial.js?v=20261014-storypixel";
import { paintCharacterImages } from "./characters.js?v=20261014-storypixel";
import { createBattleReviewPanel } from "./battle-review.js?v=20261014-storypixel";
import { pixelArtPaths } from "./pixel-world.js?v=20261014-storypixel";

// Use the same per-player storage namespace as the map. If these keys differ,
// the battle page cannot find the enemy that the map just stored and redirects back.
const AUTH_CONTEXT = window.EPQ_AUTH || {};
const AUTH_PLAYER_ID = String(AUTH_CONTEXT.storageId || AUTH_CONTEXT.playerId || "guest");
const BATTLE_KEY = `englishPowerQuest.battle.player.${AUTH_PLAYER_ID}`;
const WORLD_SAVE_KEY = `englishPowerQuest.world.v2.player.${AUTH_PLAYER_ID}`;
const WORLD_PENDING_KEY = `${WORLD_SAVE_KEY}.pending`;
const ESCAPE_KEY = `englishPowerQuest.escape.v1.player.${AUTH_PLAYER_ID}`;
let pendingBattleSave = Promise.resolve();
let battleSaveRevision = 0;
let battleRequest;
let serverReady = false;
let pendingAnswer = Promise.resolve();
let pendingItemUse = Promise.resolve();
let tutorialBattle = false;
let reviewPanel;

function coachBattle(key, values = {}) {
  if (!tutorialBattle) return;
  state.coachMessage = { key, values };
  const panel = document.getElementById("battleMentor");
  panel?.classList.remove("hidden");
  const text = document.getElementById("battleMentorText");
  if (text) text.textContent = t(key, values);
  ui.fightButton.classList.toggle("tutorial-highlight", state.mode === "MENU");
}

function initializeBattleTutorial() {
  tutorialBattle = state.enemy.id === "slime-01" && normalizeTutorial(getSave().tutorial)?.stage === "BATTLE";
  if (!tutorialBattle) return;
  document.getElementById("battleTutorialSkip")?.addEventListener("click", () => {
    tutorialBattle = false;
    updateSave({ tutorial: { ...normalizeTutorial(getSave().tutorial), stage: "SKIPPED" } });
    document.getElementById("battleMentor")?.classList.add("hidden");
    ui.fightButton.classList.remove("tutorial-highlight");
  });
  coachBattle("tutorial.battle.start");
}
function applyServerBattle(result) {
  if (!result?.ok) return false;
  state.playerHp = result.battle.playerHp;
  state.enemyHp = result.battle.enemyHp;
  state.focusUsed = result.battle.focusUsed;
  if (result.player) updateSave({xp:result.player.xp, coins:result.player.coins, power:result.player.englishPowerTotal, level:result.player.level});
  updateHp();
  return true;
}
async function saveBattleState(snapshot, revision) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch("/FYP/api/game_state.php", {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csrfToken: AUTH_CONTEXT.csrfToken || "", state: snapshot })
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) throw new Error("MySQL battle state save failed");
    if (revision === battleSaveRevision) {
      localStorage.removeItem(WORLD_PENDING_KEY);
      clearSaveWarning("world");
    }
    return true;
  } catch (error) {
    setSaveWarning("world", "save.worldFailed");
    console.warn("[English Power Quest] Battle map state remains cached locally.", error);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

const enemies = {
  "slime-01": {
    id: "slime-01", name: "Word Slime", nameZh: "单词史莱姆", type: "slime", difficulty: "EASY",
    spritePath: "/FYP/assets/enemies/monster/Shrim.png?v=20261010-enemyart1",
    questionTypes: ["TRUE_FALSE", "ODD_WORD_OUT"],
    hp: 60, damage: 10, xp: 20, coins: 10, role: "WORD CREATURE", roleKey: "battle.wordCreature"
  },
  "bat-01": {
    id: "bat-01", name: "Confusion Bat", nameZh: "迷惑蝙蝠", type: "bat", difficulty: "EASY",
    spritePath: pixelArtPaths.monsters["bat-01"],
    questionTypes: ["TRUE_FALSE", "ODD_WORD_OUT"],
    hp: 70, damage: 10, xp: 25, coins: 12, role: "FOREST ENEMY", roleKey: "battle.forestEnemy"
  },
  "road-guardian-01": {
    id: "road-guardian-01", name: "Road Guardian", nameZh: "道路守卫", type: "guardian", difficulty: "MEDIUM",
    spritePath: pixelArtPaths.monsters["road-guardian-01"],
    questionTypes: ["TRUE_FALSE", "SENTENCE_BUILDER"],
    hp: 85, damage: 11, xp: 28, coins: 14, role: "ROAD GUARDIAN", roleKey: "battle.ancientGuardian"
  },
  "guardian-01": {
    id: "guardian-01", name: "Grammar Guardian", nameZh: "语法守卫", type: "guardian", difficulty: "MEDIUM",
    spritePath: pixelArtPaths.monsters["guardian-01"],
    questionTypes: ["TRUE_FALSE", "SENTENCE_BUILDER"],
    hp: 100, damage: 12, xp: 30, coins: 15, role: "ANCIENT GUARDIAN", roleKey: "battle.ancientGuardian"
  },
  "cave-wraith-01": {
    id: "cave-wraith-01", name: "Cave Wraith", nameZh: "洞穴幽魂", type: "wraith", difficulty: "MEDIUM",
    spritePath: pixelArtPaths.monsters["cave-wraith-01"],
    questionTypes: ["TRUE_FALSE", "SENTENCE_BUILDER"],
    hp: 110, damage: 14, xp: 45, coins: 20, role: "CAVE SPIRIT", roleKey: "battle.caveSpirit"
  },
  "echo-slime-01": {
    id: "echo-slime-01", name: "Rune Slime", nameZh: "符文史莱姆", type: "slime", difficulty: "MEDIUM",
    spritePath: "/FYP/assets/enemies/monster/Shrim.png?v=20261010-enemyart1",
    questionTypes: ["TRUE_FALSE"], hp: 80, damage: 10, xp: 25, coins: 12, role: "CAVE SPIRIT", roleKey: "battle.caveSpirit"
  },
  "echo-dragon-01": {
    id: "echo-dragon-01", name: "Echo Dragon", nameZh: "回声飞龙", type: "wraith", difficulty: "MEDIUM",
    spritePath: "/FYP/assets/enemies/monster/Monster.png?v=20261010-enemyart1",
    questionTypes: ["SENTENCE_BUILDER"], hp: 135, damage: 13, xp: 50, coins: 22, role: "CAVE SPIRIT", roleKey: "battle.caveSpirit"
  }
};

const ui = {
  enemyName: document.getElementById("battleEnemyName"),
  enemyLabel: document.getElementById("battleEnemyLabel"),
  enemyRole: document.getElementById("battleEnemyRole"),
  enemyFigure: document.getElementById("enemyFigure"),
  playerSprite: document.getElementById("battlePlayerSprite"),
  enemyDifficulty: document.getElementById("enemyDifficulty"),
  playerHpText: document.getElementById("playerHpText"),
  playerHpBar: document.getElementById("playerHpBar"),
  enemyHpText: document.getElementById("enemyHpText"),
  enemyHpBar: document.getElementById("enemyHpBar"),
  battleMessage: document.getElementById("battleMessage"),
  battleMenu: document.getElementById("battleMenu"),
  commandPrompt: document.getElementById("commandPrompt"),
  menuSubtext: document.getElementById("menuSubtext"),
  fightButton: document.getElementById("fightButton"),
  skillButton: document.getElementById("skillButton"),
  itemButton: document.getElementById("itemButton"),
  runButton: document.getElementById("runButton"),
  questionPanel: document.getElementById("questionPanel"),
  questionType: document.getElementById("questionType"),
  questionDifficulty: document.getElementById("questionDifficulty"),
  timerText: document.getElementById("timerText"),
  questionText: document.getElementById("questionText"),
  questionTranslation: document.getElementById("questionTranslation"),
  questionPrompt: document.getElementById("questionPrompt"),
  questionTheme: document.getElementById("questionTheme"),
  answerArea: document.getElementById("answerArea"),
  activeSkillButton: document.getElementById("activeSkillButton"),
  activeItemButton: document.getElementById("activeItemButton"),
  activeRunButton: document.getElementById("activeRunButton"),
  battleResult: document.getElementById("battleResult"),
  resultKicker: document.getElementById("resultKicker"),
  resultTitle: document.getElementById("resultTitle"),
  resultText: document.getElementById("resultText"),
  resultRewards: document.getElementById("resultRewards"),
  resultButton: document.getElementById("resultButton")
};

const state = {
  enemy: null,
  enemyHp: 0,
  playerHp: 100,
  playerMaxHp: 100,
  currentQuestion: null,
  questionToken: null,
  remaining: 0,
  loadingQuestion: false,
  skillPending: false,
  confirmedEnemyTurn: null,
  timerId: null,
  locked: false,
  selectedWords: [],
  completed: false,
  mode: "MENU",
  focusUsed: false,
  turnLocked: false,
  itemPending: false,
  leaving: false,
  resultType: null,
  battleMessageTranslation: null
};

function getEnemy() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(BATTLE_KEY) || "null");
    if (!saved?.enemyId) {
      window.location.replace("/FYP/index.php");
      return enemies["slime-01"];
    }
    return enemies[saved.enemyId] || enemies["slime-01"];
  } catch {
    window.location.replace("/FYP/index.php");
    return enemies["slime-01"];
  }
}

function getSave() {
  try {
    return JSON.parse(localStorage.getItem(WORLD_SAVE_KEY) || "null") || {};
  } catch {
    return {};
  }
}

function updateSave(patch) {
  const updated = { ...getSave(), ...patch };
  localStorage.setItem(WORLD_SAVE_KEY, JSON.stringify(updated));
  localStorage.setItem(WORLD_PENDING_KEY, "1");
  const revision = ++battleSaveRevision;
  // Keep the battle outcome in MySQL before returning to the map.
  // Serialize saves: a slower older request must not overwrite a newer battle result.
  pendingBattleSave = pendingBattleSave.catch(() => {}).then(() => saveBattleState(updated, revision));
}

function battleFailure(result) {
  setBattleMessage(result?.errorCode === "MIGRATION_REQUIRED" ? "battle.migrationRequired" : "battle.serverFailed");
}



function formatType(type) {
  if (type === "TRUE_FALSE") return t("battle.trueFalse");
  if (type === "ODD_WORD_OUT") return t("battle.oddOneOut");
  if (type === "SENTENCE_BUILDER") return t("battle.sentenceBuilder");
  return type;
}

function localEnemyName(enemy = state.enemy) {
  if (!enemy) return "";
  return getLanguage() === "zh" ? enemy.nameZh + "（" + enemy.name + "）" : enemy.name;
}

function setBattleMessage(key, values = {}) {
  state.battleMessageTranslation = { key, values };
  ui.battleMessage.textContent = t(key, values);
}

function localizeBattleStaticText() {
  if (!state.enemy) return;
  ui.enemyName.textContent = localEnemyName();
  ui.enemyLabel.textContent = localEnemyName().toUpperCase();
  ui.enemyRole.textContent = t(state.enemy.roleKey);
  if (ui.enemyDifficulty) ui.enemyDifficulty.textContent = t("battle." + String(state.enemy.difficulty).toLowerCase());

  if (state.currentQuestion) {
    localizeQuestionTheme();
    // Global static translations replace the loading placeholder on language changes.
    ui.questionText.textContent = state.currentQuestion.question;
    ui.questionType.textContent = formatType(state.currentQuestion.type);
    ui.questionDifficulty.textContent = t("battle." + String(state.currentQuestion.difficulty || state.enemy.difficulty).toLowerCase());
    const translatedQuestion = state.currentQuestion.questionZh || "";
    ui.questionTranslation.textContent = translatedQuestion;
    ui.questionTranslation.classList.toggle("hidden", getLanguage() !== "zh" || !translatedQuestion);
    ui.questionPrompt.textContent = getLanguage() === "zh"
      ? (state.currentQuestion.promptZh || (state.currentQuestion.type === "TRUE_FALSE" ? t("battle.answerPrompt") : state.currentQuestion.prompt || ""))
      : (state.currentQuestion.prompt || t("battle.answerPrompt"));

    ui.answerArea.querySelectorAll("[data-answer-value]").forEach(button => {
      if (state.currentQuestion.type !== "TRUE_FALSE") return;
      button.textContent = getLanguage() === "zh"
        ? (button.dataset.answerValue === "true" ? t("battle.true") : t("battle.false"))
        : (button.dataset.answerValue === "true" ? "TRUE" : "FALSE");
    });
    const submit = ui.answerArea.querySelector(".battle-submit");
    if (submit) submit.textContent = t("battle.buildAttack");
  }
  if (state.mode === "MENU") {
    ui.commandPrompt.textContent = t("battle.whatDo");
    ui.menuSubtext.textContent = t("battle.chooseAction");
  }
}

function localizeQuestionTheme() {
  const realm = state.currentQuestion?.realm;
  const themed = ["maple", "forest", "camp", "ruins"].includes(realm);
  ui.questionTheme.textContent = themed ? t("quiz.theme." + realm) : "";
  ui.questionTheme.classList.toggle("hidden", !themed);
}

onLanguageChange(() => {
  localizeBattleStaticText();
  if (state.battleMessageTranslation) {
    const messageValues = { ...state.battleMessageTranslation.values };
    if (Object.prototype.hasOwnProperty.call(messageValues, "enemy") && state.enemy) {
      messageValues.enemy = localEnemyName();
    }
    ui.battleMessage.textContent = t(
      state.battleMessageTranslation.key,
      messageValues
    );
  }
  if (state.resultType) renderStoredResult();
  if (tutorialBattle && state.coachMessage) coachBattle(state.coachMessage.key, state.coachMessage.values);
});





function showMenu(prompt = t("battle.whatDo"), subtext = t("battle.chooseAction")) {
  state.mode = "MENU";
  state.locked = false;
  window.clearInterval(state.timerId);
  ui.questionPanel.classList.add("hidden");
  ui.battleMenu.classList.remove("hidden");
  ui.commandPrompt.textContent = prompt;
  ui.menuSubtext.textContent = subtext;
}

function showQuestionPanel() {
  state.mode = "QUESTION";
  ui.battleMenu.classList.add("hidden");
  ui.questionPanel.classList.remove("hidden");
}

function disableAnswers() {
  ui.answerArea.querySelectorAll("button").forEach(button => { button.disabled = true; });
}



function renderChoices(question) {
  ui.answerArea.className = "battle-answers";
  ui.answerArea.innerHTML = "";

  if (question.type === "SENTENCE_BUILDER") {
    ui.answerArea.classList.add("sentence-mode");
    const selected = document.createElement("div");
    selected.className = "battle-sentence";
    const bank = document.createElement("div");
    bank.className = "battle-word-bank";

    (question.words || []).forEach(word => {
      const button = document.createElement("button");
      button.className = "battle-word-chip";
      button.type = "button";
      button.textContent = word;
      button.addEventListener("click", () => {
        if (state.locked || button.classList.contains("selected")) return;
        button.classList.add("selected");
        state.selectedWords.push(word);
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
    submit.textContent = t("battle.buildAttack");
    submit.addEventListener("click", () => resolve(state.selectedWords.slice(), submit, false));

    ui.answerArea.append(selected, bank, submit);
    return;
  }

  const choices = question.type === "TRUE_FALSE"
    ? [
        { label: getLanguage() === "zh" ? t("battle.true") : "TRUE", value: true },
        { label: getLanguage() === "zh" ? t("battle.false") : "FALSE", value: false }
      ]
    : (question.words || []).map(word => ({ label: word, value: word }));

  choices.forEach(choice => {
    const button = document.createElement("button");
    button.className = "battle-answer-button";
    button.type = "button";
    button.textContent = choice.label;
    button.dataset.answerValue = String(choice.value);
    button.addEventListener("click", () => resolve(choice.value, button, false));
    ui.answerArea.appendChild(button);
  });
}

async function startQuestion() {
  if (state.completed || state.leaving || state.loadingQuestion || !serverReady) return;
  state.loadingQuestion = true;
  state.locked = true;
  window.clearInterval(state.timerId);
  const result = await battleRequest("QUESTION");
  state.loadingQuestion = false;
  if (state.leaving) return;
  if (!applyServerBattle(result)) { battleFailure(result); return; }
  state.locked = false;
  state.selectedWords = [];
  state.currentQuestion = result.battle.question;
  state.questionToken = result.battle.questionToken;
  const q = state.currentQuestion;
  ui.questionPrompt.classList.toggle("generic-prompt", !q.prompt && !q.promptZh);
  localizeQuestionTheme();
  ui.questionType.textContent = formatType(q.type);
  ui.questionDifficulty.textContent = t("battle." + String(q.difficulty).toLowerCase());
  ui.questionText.textContent = q.question;
  ui.questionTranslation.textContent = q.questionZh || "";
  ui.questionTranslation.classList.toggle("hidden", getLanguage() !== "zh" || !q.questionZh);
  ui.questionPrompt.textContent = getLanguage() === "zh"
    ? (q.promptZh || (q.type === "TRUE_FALSE" ? t("battle.answerPrompt") : q.prompt || ""))
    : (q.prompt || t("battle.answerPrompt"));
  renderChoices(q);
  if (tutorialBattle) coachBattle(q.type === "TRUE_FALSE" ? "tutorial.battle.trueFalse" : "tutorial.battle.oddWord");
  state.remaining = result.battle.remaining;
  ui.timerText.classList.remove("warning");
  ui.timerText.textContent = state.remaining.toFixed(1) + "s";
  state.timerId = window.setInterval(() => {
    if (state.locked || state.completed || state.itemPending || state.skillPending || state.leaving) return;
    state.remaining -= 0.1;
    ui.timerText.textContent = Math.max(0, state.remaining).toFixed(1) + "s";
    if (state.remaining <= 2) ui.timerText.classList.add("warning");
    if (state.remaining <= 0) { window.clearInterval(state.timerId); void resolve(null, null, true); }
  }, 100);
}

async function resolve(value, button, timedOut) {
  if (state.locked || state.completed || state.itemPending || state.skillPending || state.leaving) return;
  state.locked = true;
  window.clearInterval(state.timerId);
  disableAnswers();
  setBattleMessage("battle.checking");
  pendingAnswer = battleRequest("ANSWER", {questionToken:state.questionToken, answer:value, timedOut});
  const result = await pendingAnswer;
  if (state.leaving) { applyServerBattle(result); return; }
  if (!result.ok) { battleFailure(result); return; }
  const correct = result.outcome.correct;
  if (tutorialBattle) coachBattle(correct ? "tutorial.battle.correct" : "tutorial.battle.wrong");
  if (button) button.classList.add(correct ? "correct" : "wrong");
  playSound(correct ? "correct" : "wrong");
  if (!correct) {
    // Preserve delayed enemy-hit animation; HP comes from the server.
    state.confirmedEnemyTurn = result;
    setBattleMessage(result.outcome.timedOut ? "battle.timeUp" : "battle.wrong");
    window.setTimeout(enemyTurn, 700);
    return;
  }
  const previousLevel = Number(getSave().level || 1);
  applyServerBattle(result);
  playAttackAnimation();
  playSound("attack");
  if (Number(result.player?.level || 1) > previousLevel) playSound("level");
  setBattleMessage(result.outcome.usedFocus ? "battle.focusHit" : "battle.directHit", {damage:result.outcome.damage});
  if (result.battle.status === "VICTORY") window.setTimeout(finishVictory, 800);
  else window.setTimeout(startQuestion, 900);
}
function enemyTurn() {
  if (state.completed || state.leaving) return;
  const result = state.confirmedEnemyTurn;
  if (!result) return;
  state.confirmedEnemyTurn = null;
  playEnemyAttackAnimation();
  playSound("hurt");
  applyServerBattle(result);
  setBattleMessage("battle.enemyAttack", {enemy:localEnemyName(), damage:state.enemy.damage});
  if (result.battle.status === "DEFEAT") window.setTimeout(finishDefeat, 800);
  else window.setTimeout(startQuestion, 750);
}

function showBattleMenu() {
  showMenu(t("battle.whatDo"), t("battle.chooseAction"));
}

async function useSkill() {
  if (state.completed || state.locked || state.itemPending || state.skillPending || state.leaving || !serverReady) return;
  if (state.focusUsed) { setBattleMessage("battle.focusAlready"); return; }
  state.skillPending = true;
  const result = await battleRequest("FOCUS");
  state.skillPending = false;
  if (state.leaving) return;
  if (!applyServerBattle(result)) { battleFailure(result); return; }
  if (typeof result.battle.remaining === "number") state.remaining = result.battle.remaining;
  setBattleMessage("battle.focusActive");
  if (tutorialBattle) coachBattle("tutorial.battle.focus");
  playSound("focus");
  if (ui.questionPanel.classList.contains("hidden")) { showQuestionPanel(); void startQuestion(); }
}
function useItem() {
  if (state.completed || state.locked || state.itemPending || state.skillPending || state.leaving || !serverReady) return;
  const questionAlreadyOpen = !ui.questionPanel.classList.contains("hidden");
  if (state.playerHp >= state.playerMaxHp) { setBattleMessage("battle.hpFull"); return; }
  if (Number(getSave().coins || 0) < 5) { setBattleMessage("battle.notEnoughCoins"); return; }
  state.itemPending = true;
  const buttons = [...ui.answerArea.querySelectorAll("button"), ui.itemButton, ui.activeItemButton].filter(Boolean);
  const disabledBefore = buttons.map(button => button.disabled);
  buttons.forEach(button => { button.disabled = true; });
  setBattleMessage("battle.itemPending");
  pendingItemUse = (async () => {
    try {
      const result = await battleRequest("HERB");
      if (!result.ok) { setBattleMessage(result.status === 409 ? "battle.notEnoughCoins" : "battle.itemFailed"); return false; }
      applyServerBattle(result);
      playSound("heal");
      if (tutorialBattle) coachBattle("tutorial.battle.heal");
      if (questionAlreadyOpen && !state.leaving) {
        const resumed = await battleRequest("RESUME");
        if (resumed.ok) state.remaining = resumed.battle.remaining;
      }
      setBattleMessage("battle.healed");
      return true;
    } catch { setBattleMessage("battle.itemFailed"); return false; }
    finally {
      state.itemPending = false;
      buttons.forEach((button, index) => { button.disabled = disabledBefore[index]; });
      if (!questionAlreadyOpen && !state.leaving) { showQuestionPanel(); void startQuestion(); }
    }
  })();
  return pendingItemUse;
}
async function returnToMapAfterBattle() {
  if (state.leaving) return;
  state.leaving = true;
  window.clearInterval(state.timerId);
  // Missing migration during startup must not trap the player here.
  if (serverReady) {
    await Promise.allSettled([pendingItemUse, pendingAnswer]);
    if (state.enemyHp <= 0) finishConfirmedVictorySave();
    else if (!state.completed) await battleRequest("RUN");
  }
  if (state.enemyHp <= 0) sessionStorage.removeItem(ESCAPE_KEY);
  else sessionStorage.setItem(ESCAPE_KEY, state.enemy.id);
  if (tutorialBattle && state.enemyHp > 0) {
    updateSave({ tutorial: { ...normalizeTutorial(getSave().tutorial), stage: "SLIME" } });
  }
  sessionStorage.removeItem(BATTLE_KEY);
  await pendingBattleSave;
  window.location.href = "/FYP/index.php";
}

function runAway() {
  if (state.completed) return;
  returnToMapAfterBattle();
}

function playAttackAnimation() {
  const player = document.querySelector("#battlePlayerSprite");
  const enemy = document.querySelector(".monster-sprite");
  player.classList.remove("attack");
  enemy.classList.remove("hit");
  void player.offsetWidth;
  void enemy.offsetWidth;
  player.classList.add("attack");
  enemy.classList.add("hit");
}

function playEnemyAttackAnimation() {
  const player = document.querySelector("#battlePlayerSprite");
  const enemy = document.querySelector(".monster-sprite");
  player.classList.remove("hit");
  enemy.classList.remove("attack-enemy");
  void player.offsetWidth;
  void enemy.offsetWidth;
  player.classList.add("hit");
  enemy.classList.add("attack-enemy");
}

function updateHp() {
  ui.playerHpText.textContent = state.playerHp + " / " + state.playerMaxHp;
  ui.playerHpBar.style.width = (state.playerHp / state.playerMaxHp * 100) + "%";
  ui.enemyHpText.textContent = state.enemyHp + " / " + state.enemy.hp;
  ui.enemyHpBar.style.width = (state.enemyHp / state.enemy.hp * 100) + "%";
}

function showResult(victory, title, text, rewards) {
  const firstShow = ui.battleResult.classList.contains("hidden");
  state.resultType = victory ? "VICTORY" : "DEFEAT";
  ui.resultKicker.textContent = victory ? t("battle.victory") : t("battle.defeat");
  ui.resultTitle.textContent = title;
  ui.resultText.textContent = text;
  ui.resultRewards.innerHTML = rewards.map(([label, value]) =>
    "<div><span>" + label + "</span><b>" + value + "</b></div>"
  ).join("");
  ui.resultButton.textContent = victory ? t("battle.returnMap") : t("battle.retry");
  ui.battleResult.classList.remove("hidden");
  reviewPanel?.show();
  const mapButton = document.getElementById("resultMapButton");
  mapButton.classList.toggle("hidden", victory);
  mapButton.onclick = () => void returnToMapAfterBattle();
  if (firstShow) {
    ui.resultTitle.tabIndex = -1;
    ui.resultTitle.focus();
  }
  ui.resultButton.onclick = async () => {
    if (victory) {
      await returnToMapAfterBattle();
    } else {
      if (state.leaving) return;
      state.leaving = true;
      await pendingBattleSave;
      const entry = JSON.parse(sessionStorage.getItem(BATTLE_KEY) || "{}");
      delete entry.battleId;
      sessionStorage.setItem(BATTLE_KEY, JSON.stringify(entry));
      window.location.reload();
    }
  };
}

function renderStoredResult() {
  if (!state.resultType) return;
  if (state.resultType === "VICTORY") {
    showResult(
      true,
      t("battle.victoryTitle", { enemy: localEnemyName() }),
      t("battle.victoryText"),
      [[t("battle.rewardXp"), "+" + state.enemy.xp], [t("battle.rewardCoins"), "+" + state.enemy.coins]]
    );
  } else {
    showResult(
      false,
      t("battle.tryAgain"),
      t("battle.defeatText"),
      [[t("battle.rewardStatus"), t("battle.rewardRetry")], [t("battle.rewardPower"), String(getSave().power || 0)], [t("battle.rewardHp"), "0"]]
    );
  }
}

function finishConfirmedVictorySave() {
  const saved = getSave();
  const defeated = new Set(Array.isArray(saved.defeatedEnemyIds) ? saved.defeatedEnemyIds : []);
  defeated.add(state.enemy.id);
  const patch = {defeatedEnemyIds:[...defeated], questStep:Number(saved.questStep || 0)};
  if (tutorialBattle) patch.tutorial = { ...normalizeTutorial(saved.tutorial), stage: "RETURN" };
  updateSave(patch);
}

function finishVictory() {
  if (state.completed || state.leaving) return;
  state.completed = true;
  window.clearInterval(state.timerId);
  finishConfirmedVictorySave();
  playSound("victory");
  showResult(true, t("battle.victoryTitle", {enemy:localEnemyName()}), t("battle.victoryText"),
    [[t("battle.rewardXp"), "+" + state.enemy.xp], [t("battle.rewardCoins"), "+" + state.enemy.coins]]);
}

function finishDefeat() {
  if (state.completed || state.leaving) return;
  state.completed = true;
  playSound("defeat");
  window.clearInterval(state.timerId);

  showResult(
    false,
    t("battle.tryAgain"),
    t("battle.defeatText"),
    [[t("battle.rewardStatus"), t("battle.rewardRetry")], [t("battle.rewardPower"), String(getSave().power || 0)], [t("battle.rewardHp"), "0"]]
  );
}

function bindBattleEvents() {
  if (!ui.fightButton || !ui.skillButton || !ui.itemButton || !ui.runButton) {
    throw new Error("Battle command buttons are missing from the page.");
  }

  ui.fightButton.addEventListener("click", (event) => {
    event.preventDefault();
    if (state.completed || state.loadingQuestion || state.leaving || !serverReady) return;
    showQuestionPanel();
    setBattleMessage("battle.menuFight");
    startQuestion();
  });

  ui.skillButton.addEventListener("click", (event) => {
    event.preventDefault();
    useSkill();
  });

  ui.itemButton.addEventListener("click", (event) => {
    event.preventDefault();
    useItem();
  });

  ui.runButton.addEventListener("click", (event) => {
    event.preventDefault();
    runAway();
  });

  ui.activeSkillButton?.addEventListener("click", (event) => {
    event.preventDefault();
    useSkill();
  });

  ui.activeItemButton?.addEventListener("click", (event) => {
    event.preventDefault();
    useItem();
  });

  ui.activeRunButton?.addEventListener("click", (event) => {
    event.preventDefault();
    runAway();
  });
  document.getElementById("returnMapLink")?.addEventListener("click", (event) => {
    event.preventDefault();
    void returnToMapAfterBattle();
  });

  // Fallback delegation: keeps commands clickable even if another UI layer changes.
  ui.battleMenu.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-command]");
    if (!button || button.disabled) return;
    if (button === ui.fightButton || button === ui.skillButton || button === ui.itemButton || button === ui.runButton) return;

    const action = button.dataset.command;
    if (action === "fight") ui.fightButton.click();
    if (action === "skill") ui.skillButton.click();
    if (action === "item") ui.itemButton.click();
    if (action === "run") ui.runButton.click();
  });
}

async function init() {
  document.body.classList.add("battle-js-ready");
  setBattleMessage("battle.loading");
  state.enemy = getEnemy();
  document.body.dataset.realm = state.enemy.id === "slime-01" ? "maple" : state.enemy.id === "bat-01" ? "forest" : state.enemy.id === "road-guardian-01" ? "camp" : "ruins";
  document.body.dataset.encounter = ["cave-wraith-01","echo-slime-01","echo-dragon-01"].includes(state.enemy.id) ? "cave" : "outdoor";
  state.enemyHp = state.enemy.hp;
  state.focusUsed = false;

  ui.enemyName.textContent = localEnemyName();
  ui.enemyLabel.textContent = localEnemyName().toUpperCase();
  ui.enemyRole.textContent = t(state.enemy.roleKey);
  if (ui.enemyDifficulty) ui.enemyDifficulty.textContent = t("battle." + String(state.enemy.difficulty).toLowerCase());
  // Use art matched to the actual enemy. Slime encounters must not show
  // the winged purple monster; other enemies use the available fantasy sprite.
  ui.enemyFigure.textContent = "";
  ui.enemyFigure.classList.toggle("native-pixel-64", Boolean(pixelArtPaths.monsters[state.enemy.id]));
  const monsterArt = document.createElement("img");
  monsterArt.alt = state.enemy.name;
  monsterArt.draggable = false;
  monsterArt.style.width = "100%";
  monsterArt.style.height = "100%";
  monsterArt.style.objectFit = "contain";
  monsterArt.style.imageRendering = "pixelated";
  monsterArt.onerror = () => {
    monsterArt.onerror = null;
    ui.enemyFigure.textContent = state.enemy.type === "slime" ? "🟢" : (state.enemy.type === "bat" ? "🦇" : "👾");
  };
  monsterArt.src = state.enemy.spritePath || "/FYP/assets/enemies/monster/Monster.png?v=20261010-enemyart1";
  ui.enemyFigure.appendChild(monsterArt);
  if (ui.playerSprite) {
    // Register the fallback before assigning src, so even an immediate load
    // failure cannot leave a broken-image placeholder in the battle scene.
    ui.playerSprite.onerror = () => {
      ui.playerSprite.onerror = null;
      ui.playerSprite.src = "/FYP/assets/player/png_frames/player_walk_right_1.png?v=20261010-assetpaths1";
    };
    ui.playerSprite.src = "/FYP/assets/player/png_frames/Player_Stand.png?v=20261010-assetpaths1";
  }
  paintCharacterImages(AUTH_CONTEXT.character);

  bindBattleEvents();
  ui.battleResult.querySelectorAll("[data-set-language]").forEach(button => {
    button.addEventListener("click", () => setLanguage(button.dataset.setLanguage));
  });
  ui.battleResult.addEventListener("keydown", event => {
    if (event.key !== "Tab") return;
    const controls = [...ui.battleResult.querySelectorAll("button:not(:disabled), summary")].filter(element => element.getClientRects().length);
    const first = controls[0], last = controls[controls.length - 1];
    if (!first) return;
    if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !controls.includes(document.activeElement))) {
      event.preventDefault(); first.focus();
    }
  });
  updateHp();

  try {
    const entry = JSON.parse(sessionStorage.getItem(BATTLE_KEY) || "{}");
    if (!entry.battleId) entry.battleId = battleToken();
    sessionStorage.setItem(BATTLE_KEY, JSON.stringify(entry));
    reviewPanel = createBattleReviewPanel(document.getElementById("battleReview"), entry.battleId, t, getLanguage);
    battleRequest = createBattleClient(entry.battleId, AUTH_CONTEXT.csrfToken || "", retrying => {
      if (retrying) setSaveWarning("battle", "battle.reconnecting");
      else clearSaveWarning("battle");
    });
    const result = await battleRequest("START", {enemyId:state.enemy.id});
    if (!result.ok) { battleFailure(result); return; }
    serverReady = true;
    applyServerBattle(result);
    initializeBattleTutorial();
    setBattleMessage("battle.enemyAppeared", {enemy:localEnemyName()});
    if (result.battle.status === "VICTORY") finishVictory();
    else if (result.battle.status === "DEFEAT") finishDefeat();
    else if (result.battle.status === "ESCAPED") void returnToMapAfterBattle();
    else if (result.battle.question) { showQuestionPanel(); void startQuestion(); }
    else showBattleMenu();
  } catch (error) {
    setBattleMessage("battle.battleError", { error: error.message });
    console.error("English Power Quest battle error:", error);
  }
}

window.addEventListener("unhandledrejection", (event) => {
  if (ui.battleMessage) {
    const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
    setBattleMessage("battle.genericError", { error: reason });
  }
  console.error("English Power Quest unhandled rejection:", event.reason);
});

window.addEventListener("error", (event) => {
  if (ui.battleMessage && event.error) {
    setBattleMessage("battle.genericError", { error: event.error.message || "Unknown error" });
  }
});

window.render_game_to_text = () => JSON.stringify({
  mode: state.completed ? state.resultType : state.mode,
  enemy: state.enemy ? { name: localEnemyName(), hp: state.enemyHp } : null,
  playerHp: state.playerHp,
  focus: state.focusUsed,
  timer: Math.max(0, Number(state.remaining || 0)),
  question: state.currentQuestion ? { type: state.currentQuestion.type, text: state.currentQuestion.question, realm:state.currentQuestion.realm || null } : null,
  review: reviewPanel?.getStats() || null,
  tutorial: tutorialBattle ? normalizeTutorial(getSave().tutorial)?.stage : null,
  coach: tutorialBattle && state.coachMessage ? t(state.coachMessage.key, state.coachMessage.values) : null
});

init();
