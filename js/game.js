import {
  addCoins,
  addEnglishPower,
  addSkillPoints,
  addXP,
  accuracy,
  createDefaultPlayer,
  englishSkillLabel,
  normalizePlayer,
  questionIsRepeat,
  recordAnswer,
  totalEnglishPower
} from "./player.js";
import { clearPlayerSave, loadPlayer, savePlayer } from "./save.js";
import { getReward, getBossPhase, handleCorrectAnswer, handleWrongAnswer, applyEnemyDamage, enemyAttack, startCombat } from "./combat.js";
import { createQuestionReward, formatQuestionType, loadQuestions, normalizedSentenceAnswer, pickQuestion, questionTimeLimit } from "./question.js";

const state = {
  player: createDefaultPlayer(),
  questions: [],
  enemies: [],
  levels: [],
  skills: [],
  worlds: [],
  currentEnemy: null,
  combat: null,
  currentQuestion: null,
  timerId: null,
  questionStartedAt: 0,
  answerLocked: false,
  soundEnabled: true,
  sentenceSelected: [],
  battleLog: [],
  modalAction: ""
};

const el = {};
const DATA_FILES = {
  enemies: "./data/enemies.json?v=20261010-monsterart2",
  levels: "./data/levels.json",
  skills: "./data/skills.json",
  worlds: "./data/worlds.json"
};

function cacheElements() {
  [
    "playerAvatar","playerName","playerTier","playerHpText","playerHpBar","xpText","xpBar",
    "coinsText","skillPointsText","skillPointsText2","totalPowerText","vocabularyPower",
    "grammarPower","sentencePower","itEnglishPower","worldDescription","stageText","playerSprite",
    "enemySprite","enemyName","enemyType","enemyHpText","enemyHpBar","comboBadge","bossPhase",
    "statusMessage","questionType","questionDifficulty","timerText","questionText","questionPrompt",
    "answerArea","nextQuestion","battleLog","accuracyText","skillList","modal","modalIcon",
    "modalEyebrow","modalTitle","modalText","modalRewards","modalButton","toast","soundToggle",
    "resetSave"
  ].forEach((id) => { el[id] = document.getElementById(id); });
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load " + path);
  return response.json();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function playTone(kind) {
  if (!state.soundEnabled || !("AudioContext" in window || "webkitAudioContext" in window)) return;

  try {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const frequencies = { correct: 660, wrong: 180, level: 880, victory: 1040, click: 420 };
    osc.frequency.value = frequencies[kind] || 420;
    osc.type = "square";
    gain.gain.value = 0.035;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  } catch (error) {
    console.debug("Audio unavailable.");
  }
}

function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.remove("hidden");
  window.clearTimeout(state.toastTimeout);
  state.toastTimeout = window.setTimeout(() => el.toast.classList.add("hidden"), 2200);
}

function log(message, type = "info") {
  state.battleLog.unshift({ message, type });
  state.battleLog = state.battleLog.slice(0, 18);
  el.battleLog.innerHTML = state.battleLog.map((item) => {
    return '<div class="log-line ' + item.type + '">' + escapeHtml(item.message) + "</div>";
  }).join("");
}

function currentWorld() {
  return state.worlds.find((world) => world.id === state.player.currentWorld) || state.worlds[0];
}

function updatePlayerUI() {
  const levelDef = state.levels.find((item) => item.level === state.player.level) || state.levels[0];
  const nextLevel = state.levels.find((item) => item.level === state.player.level + 1);
  const hp = state.combat?.playerHp ?? 100;
  const hpMax = state.combat?.playerMaxHp ?? 100;

  el.playerName.textContent = state.player.displayName;
  el.playerTier.textContent = "Level " + state.player.level + " · " + (levelDef?.tier || "Rookie");
  el.coinsText.textContent = state.player.coins;
  el.skillPointsText.textContent = state.player.skillPoints;
  el.skillPointsText2.textContent = state.player.skillPoints;
  el.playerHpText.textContent = hp + " / " + hpMax;
  el.playerHpBar.style.width = Math.max(0, (hp / hpMax) * 100) + "%";

  const currentRequired = Number(levelDef?.requiredXP || 0);
  const nextRequired = Number(nextLevel?.requiredXP || currentRequired + 1);
  const xpIntoLevel = Math.max(0, state.player.xp - currentRequired);
  const xpSpan = Math.max(1, nextRequired - currentRequired);
  const xpPercent = nextLevel ? Math.min(100, (xpIntoLevel / xpSpan) * 100) : 100;

  el.xpText.textContent = nextLevel ? state.player.xp + " / " + nextRequired : state.player.xp + " XP";
  el.xpBar.style.width = xpPercent + "%";

  const map = [
    ["vocabulary", "vocabularyPower"],
    ["grammar", "grammarPower"],
    ["sentenceConstruction", "sentencePower"],
    ["itEnglish", "itEnglishPower"]
  ];

  for (const [key, id] of map) el[id].textContent = state.player.englishPower[key];

  el.totalPowerText.textContent = totalEnglishPower(state.player);
  el.accuracyText.textContent = "Accuracy " + accuracy(state.player) + "%";
  el.worldDescription.textContent = currentWorld()?.description || "";
  el.soundToggle.textContent = state.soundEnabled ? "🔊" : "🔇";
}

function updateEnemyUI() {
  if (!state.currentEnemy || !state.combat) return;

  const enemy = state.currentEnemy;
  const hp = Math.max(0, state.combat.enemyHp);
  const maxHp = state.combat.enemyMaxHp;

  el.enemyName.textContent = enemy.name;
  el.enemyType.textContent = enemy.isBoss ? enemy.type + " · BOSS" : enemy.type;
  el.enemyHpText.textContent = hp + " / " + maxHp;
  el.enemyHpBar.style.width = Math.max(0, (hp / maxHp) * 100) + "%";
  if (enemy.spritePath) {
    if (el.enemySprite.dataset.enemyId !== enemy.id) {
      el.enemySprite.dataset.enemyId = enemy.id;
      el.enemySprite.replaceChildren();
      const art = document.createElement("img");
      art.alt = enemy.name;
      art.draggable = false;
      art.decoding = "async";
      art.style.width = "100%";
      art.style.height = "100%";
      art.style.objectFit = "contain";
      art.style.imageRendering = "pixelated";
      art.onerror = () => {
        art.onerror = null;
        el.enemySprite.textContent = enemy.visual || "👾";
      };
      art.src = enemy.spritePath;
      el.enemySprite.appendChild(art);
    }
  } else {
    el.enemySprite.dataset.enemyId = enemy.id;
    el.enemySprite.textContent = enemy.visual || "👾";
  }

  const phase = getBossPhase(enemy, hp);
  if (phase) {
    el.bossPhase.textContent = "PHASE " + phase.number + " · " + phase.name;
    el.bossPhase.classList.remove("hidden");
  } else {
    el.bossPhase.classList.add("hidden");
  }

  if (state.combat.combo >= 2) {
    el.comboBadge.textContent = "COMBO x" + state.combat.combo;
    el.comboBadge.classList.remove("hidden");
  } else {
    el.comboBadge.classList.add("hidden");
  }
}

function updateSkillUI() {
  el.skillList.innerHTML = state.skills.map((skill) => {
    const unlocked = state.player.unlockedSkills.includes(skill.id);
    return [
      '<div class="skill-card"><div>',
      "<h3>" + escapeHtml(skill.name) + "</h3>",
      "<p>" + escapeHtml(skill.description) + "</p>",
      '</div><span class="skill-status">',
      unlocked ? "UNLOCKED" : "LOCK · " + skill.cost + " SP",
      "</span></div>"
    ].join("");
  }).join("");
}

function updateStageUI() {
  const total = state.enemies.length;
  const index = Math.min(state.player.currentEnemyIndex, total);
  el.stageText.textContent = "Stage " + Math.min(index + 1, total) + " / " + total;
}

function resetBattleAnswerUI() {
  el.answerArea.className = "answer-grid";
  el.answerArea.innerHTML = "";
  state.sentenceSelected = [];
}

function renderTrueFalse(question) {
  el.answerArea.className = "answer-grid";

  [
    { text: "TRUE", value: true },
    { text: "FALSE", value: false }
  ].forEach((option) => {
    const button = document.createElement("button");
    button.className = "answer-button";
    button.type = "button";
    button.textContent = option.text;
    button.addEventListener("click", () => resolveAnswer(option.value, button));
    el.answerArea.appendChild(button);
  });
}

function renderOddWordOut(question) {
  el.answerArea.className = "answer-grid";
  question.words.forEach((word) => {
    const button = document.createElement("button");
    button.className = "answer-button";
    button.type = "button";
    button.textContent = word;
    button.addEventListener("click", () => resolveAnswer(word, button));
    el.answerArea.appendChild(button);
  });
  el.questionPrompt.textContent = "Choose the word that does not belong.";
}

function renderSentenceBuilder(question) {
  el.answerArea.className = "sentence-builder";

  const answerBox = document.createElement("div");
  answerBox.className = "sentence-answer";

  const wordBank = document.createElement("div");
  wordBank.className = "word-bank";

  question.words.forEach((word) => {
    const button = document.createElement("button");
    button.className = "word-chip";
    button.type = "button";
    button.textContent = word;
    button.addEventListener("click", () => {
      if (state.answerLocked || button.classList.contains("selected")) return;
      button.classList.add("selected");
      state.sentenceSelected.push(word);

      const chosen = document.createElement("span");
      chosen.className = "word-chip selected";
      chosen.textContent = word;
      answerBox.appendChild(chosen);
    });
    wordBank.appendChild(button);
  });

  const submit = document.createElement("button");
  submit.className = "primary-button";
  submit.type = "button";
  submit.textContent = "Build Sentence";
  submit.addEventListener("click", () => {
    resolveAnswer(normalizedSentenceAnswer(question, state.sentenceSelected), submit);
  });

  el.answerArea.append(answerBox, wordBank, submit);
  el.questionPrompt.textContent = "Tap the words in the correct order.";
}

function renderQuestion(question) {
  resetBattleAnswerUI();
  el.questionType.textContent = formatQuestionType(question.type);
  el.questionDifficulty.textContent = question.difficulty;
  el.questionText.textContent = question.question;
  el.questionPrompt.textContent = question.prompt || "";

  if (question.type === "TRUE_FALSE") renderTrueFalse(question);
  else if (question.type === "ODD_WORD_OUT") renderOddWordOut(question);
  else if (question.type === "SENTENCE_BUILDER") renderSentenceBuilder(question);
  else renderTrueFalse(question);
}

function setQuestion(question) {
  state.currentQuestion = question;
  state.answerLocked = false;
  state.questionStartedAt = performance.now();
  renderQuestion(question);

  const timeLimit = questionTimeLimit(question);
  let remaining = timeLimit;

  el.timerText.classList.remove("warning");
  el.timerText.textContent = remaining.toFixed(1) + "s";

  window.clearInterval(state.timerId);
  state.timerId = window.setInterval(() => {
    remaining -= 0.1;
    el.timerText.textContent = Math.max(0, remaining).toFixed(1) + "s";
    if (remaining <= 2) el.timerText.classList.add("warning");

    if (remaining <= 0) {
      window.clearInterval(state.timerId);
      if (!state.answerLocked) resolveAnswer(null, null, true);
    }
  }, 100);
}

function disableAnswerButtons() {
  el.answerArea.querySelectorAll("button").forEach((button) => {
    button.disabled = true;
  });
}

function validateAnswer(question, value) {
  if (question.type === "TRUE_FALSE") return value === Boolean(question.answer);
  if (question.type === "ODD_WORD_OUT") return String(value).toLowerCase() === String(question.answer).toLowerCase();
  if (question.type === "SENTENCE_BUILDER") {
    return String(value).toLowerCase() === normalizedSentenceAnswer(question, question.answerOrder);
  }
  return false;
}

function getCorrectAnswerText(question) {
  if (question.type === "TRUE_FALSE") return question.answer ? "TRUE" : "FALSE";
  if (question.type === "ODD_WORD_OUT") return question.answer;
  if (question.type === "SENTENCE_BUILDER") return question.answerOrder.join(" ");
  return "See the explanation after the battle.";
}

function resolveAnswer(value, clickedButton = null, timedOut = false) {
  if (state.answerLocked || !state.currentQuestion || !state.combat) return;

  state.answerLocked = true;
  window.clearInterval(state.timerId);

  const question = state.currentQuestion;
  const elapsedMs = Math.max(0, performance.now() - state.questionStartedAt);
  state.combat.lastResponseMs = elapsedMs;
  const isCorrect = !timedOut && validateAnswer(question, value);

  disableAnswerButtons();
  if (clickedButton) clickedButton.classList.add(isCorrect ? "correct" : "wrong");

  const repeated = questionIsRepeat(state.player, question.id);
  recordAnswer(state.player, isCorrect, question.id);
  if (isCorrect) handleCorrect(question, repeated);
  else handleWrong(question, timedOut);

  savePlayer(state.player);
  updatePlayerUI();
  updateEnemyUI();
}

function handleCorrect(question, repeated) {
  playTone("correct");
  const reward = createQuestionReward(question, repeated);
  const result = handleCorrectAnswer(state.combat, question);

  addXP(state.player, reward.xp, state.levels);
  addCoins(state.player, reward.coins);
  addEnglishPower(state.player, question.skill, reward.englishPower);

  el.playerSprite.classList.remove("attack");
  el.enemySprite.classList.remove("hit");
  void el.playerSprite.offsetWidth;
  void el.enemySprite.offsetWidth;
  el.playerSprite.classList.add("attack");
  el.enemySprite.classList.add("hit");

  const repeatLabel = repeated ? " (review reward)" : "";
  log(
    "Correct! " + result.damage + " damage. +" + reward.xp + " XP, +" +
    reward.coins + " Coins, +" + reward.englishPower + " " +
    englishSkillLabel(question.skill) + repeatLabel + ".",
    "success"
  );

  el.statusMessage.textContent = "Correct! You attack the " + state.currentEnemy.name + ".";

  if (result.enemyDefeated) finishEnemyVictory();
  else enemyTurn();
}

function handleWrong(question, timedOut) {
  playTone("wrong");
  handleWrongAnswer(state.combat);

  const message = timedOut ? "Time's up. You lose the action." : "Not quite. You lose the action.";
  el.statusMessage.textContent = message;
  el.answerArea.classList.add("shake");
  window.setTimeout(() => el.answerArea.classList.remove("shake"), 350);

  log(message + " Correct answer: " + getCorrectAnswerText(question), "danger");
  enemyTurn();
}

function enemyTurn() {
  if (!state.currentEnemy || state.combat.enemyHp <= 0) return;

  const phase = getBossPhase(state.currentEnemy, state.combat.enemyHp);
  const damage = enemyAttack(state.currentEnemy, phase);
  const defeated = applyEnemyDamage(state.combat, damage);

  updatePlayerUI();

  if (defeated) {
    finishPlayerDefeat();
    return;
  }

  log(state.currentEnemy.name + " hits you for " + damage + " damage.", "danger");
  el.statusMessage.textContent = state.currentEnemy.name + " attacks. Your turn.";

  window.setTimeout(() => {
    if (state.combat?.status === "ACTIVE") loadNextQuestion();
  }, 500);
}

function loadNextQuestion() {
  if (!state.currentEnemy || !state.combat) return;

  const phase = getBossPhase(state.currentEnemy, state.combat.enemyHp);
  const recent = state.combat.usedQuestionIds.slice(-4);
  const question = pickQuestion(state.questions, state.currentEnemy, phase, recent);

  state.combat.currentQuestionId = question.id;
  state.combat.usedQuestionIds.push(question.id);
  el.statusMessage.textContent = "Choose your answer to attack.";
  setQuestion(question);
}

function showModal(config) {
  el.modalIcon.textContent = config.icon;
  el.modalEyebrow.textContent = config.eyebrow;
  el.modalTitle.textContent = config.title;
  el.modalText.textContent = config.text;
  el.modalRewards.innerHTML = (config.rewards || []).map((reward) => {
    return '<div class="reward-card"><span>' + escapeHtml(reward[0]) +
      "</span><strong>" + escapeHtml(reward[1]) + "</strong></div>";
  }).join("");
  el.modalButton.textContent = config.button;
  el.modal.classList.remove("hidden");
  state.modalAction = config.button;
}

function hideModal() {
  el.modal.classList.add("hidden");
}

function finishEnemyVictory() {
  state.combat.status = "WON";
  window.clearInterval(state.timerId);
  el.enemySprite.classList.add("defeat");

  const reward = getReward(state.currentEnemy);
  const levelBefore = state.player.level;

  addXP(state.player, reward.xp, state.levels);
  addCoins(state.player, reward.coins);
  addSkillPoints(state.player, reward.skillPoints);

  if (!state.player.defeatedEnemyIds.includes(state.currentEnemy.id)) {
    state.player.defeatedEnemyIds.push(state.currentEnemy.id);
  }

  state.player.currentEnemyIndex = Math.min(
    state.player.currentEnemyIndex + 1,
    state.enemies.length
  );

  savePlayer(state.player);
  updatePlayerUI();
  updateStageUI();

  log(
    "Victory! +" + reward.xp + " XP, +" + reward.coins + " Coins, +" +
    reward.skillPoints + " Skill Points.",
    "reward"
  );

  if (state.player.level > levelBefore) {
    playTone("level");
    log("LEVEL UP! You are now Level " + state.player.level + ".", "reward");
  } else {
    playTone("victory");
  }

  const complete = state.player.currentEnemyIndex >= state.enemies.length;
  const title = state.currentEnemy.isBoss ? "BOSS DEFEATED!" : "MONSTER DEFEATED!";
  showModal({
    icon: complete ? "🌟" : "🏆",
    eyebrow: title,
    title,
    text: complete ? "Dreamwood is complete. You got stronger." : "You got stronger. The next challenge is waiting.",
    rewards: [
      ["XP", "+" + reward.xp],
      ["Coins", "+" + reward.coins],
      ["Skill Points", "+" + reward.skillPoints],
      ["English Power", String(totalEnglishPower(state.player))]
    ],
    button: complete ? "Replay World" : "Next Challenge"
  });
}

function finishPlayerDefeat() {
  state.combat.status = "LOST";
  window.clearInterval(state.timerId);

  log("You were defeated. Your learning progress is safe; retry this challenge.", "danger");

  showModal({
    icon: "💀",
    eyebrow: "DEFEAT",
    title: "Try Again",
    text: "Mistakes are part of the quest. Your learning progress is safe.",
    rewards: [
      ["English Power", String(totalEnglishPower(state.player))],
      ["Accuracy", accuracy(state.player) + "%"]
    ],
    button: "Retry Battle"
  });
}

function startCurrentBattle() {
  window.clearInterval(state.timerId);

  if (state.player.currentEnemyIndex >= state.enemies.length) state.player.currentEnemyIndex = 0;

  state.currentEnemy = state.enemies[state.player.currentEnemyIndex];
  state.combat = startCombat(state.currentEnemy);

  el.enemySprite.classList.remove("defeat");
  updateEnemyUI();
  updatePlayerUI();
  updateStageUI();

  log("Encountered " + state.currentEnemy.name + ".", "info");
  el.statusMessage.textContent = "Prepare yourself. English is your weapon.";
  loadNextQuestion();
}

function handleModalAction() {
  const action = state.modalAction;
  hideModal();

  if (action === "Retry Battle") {
    startCurrentBattle();
    return;
  }

  if (action === "Replay World") {
    state.player.currentEnemyIndex = 0;
    state.player.defeatedEnemyIds = [];
    savePlayer(state.player);
  }

  startCurrentBattle();
}

function resetSave() {
  const confirmed = window.confirm("Reset all English Power Quest progress on this browser?");
  if (!confirmed) return;

  clearPlayerSave();
  state.player = createDefaultPlayer();
  state.battleLog = [];
  updateSkillUI();
  startCurrentBattle();
  updatePlayerUI();
  showToast("Save reset. Your new quest begins.");
}

function bindEvents() {
  el.modalButton.addEventListener("click", handleModalAction);
  el.soundToggle.addEventListener("click", () => {
    state.soundEnabled = !state.soundEnabled;
    updatePlayerUI();
    playTone("click");
  });
  el.resetSave.addEventListener("click", resetSave);
}

async function initialiseData() {
  const [questions, enemies, levels, skills, worlds] = await Promise.all([
    loadQuestions(),
    fetchJson(DATA_FILES.enemies),
    fetchJson(DATA_FILES.levels),
    fetchJson(DATA_FILES.skills),
    fetchJson(DATA_FILES.worlds)
  ]);

  state.questions = questions;
  state.enemies = enemies;
  state.levels = levels;
  state.skills = skills;
  state.worlds = worlds;
}

export async function startGame() {
  cacheElements();
  bindEvents();
  await initialiseData();

  state.player = normalizePlayer(loadPlayer());

  if (!state.worlds.some((world) => world.id === state.player.currentWorld)) {
    state.player.currentWorld = state.worlds[0]?.id || "Dreamwood";
  }

  if (state.player.currentEnemyIndex > state.enemies.length) {
    state.player.currentEnemyIndex = 0;
  }

  updateSkillUI();
  updatePlayerUI();
  updateStageUI();

  log("Welcome to Dreamwood.", "reward");
  log("Your English Power is your strength.", "info");
  log("Beat the monsters. Beat your old self.", "info");

  startCurrentBattle();
}