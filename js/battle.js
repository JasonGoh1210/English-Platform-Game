import { t, getLanguage, onLanguageChange } from "./i18n.js?v=20261010-battlekeys1";

// Use the same per-player storage namespace as the map. If these keys differ,
// the battle page cannot find the enemy that the map just stored and redirects back.
const AUTH_CONTEXT = window.EPQ_AUTH || {};
const AUTH_PLAYER_ID = String(AUTH_CONTEXT.playerId || "guest");
const BATTLE_KEY = `englishPowerQuest.battle.player.${AUTH_PLAYER_ID}`;
const WORLD_SAVE_KEY = `englishPowerQuest.world.v2.player.${AUTH_PLAYER_ID}`;
const ESCAPE_KEY = `englishPowerQuest.escape.v1.player.${AUTH_PLAYER_ID}`;

const enemies = {
  "slime-01": {
    id: "slime-01", name: "Word Slime", nameZh: "单词史莱姆", type: "slime", difficulty: "EASY",
    spritePath: "/FYP/assets/enemies/monster/Shrim.png?v=20261010-enemyart1",
    questionTypes: ["TRUE_FALSE", "ODD_WORD_OUT"],
    hp: 60, damage: 10, xp: 20, coins: 10, role: "WORD CREATURE", roleKey: "battle.wordCreature"
  },
  "bat-01": {
    id: "bat-01", name: "Confusion Bat", nameZh: "迷惑蝙蝠", type: "bat", difficulty: "EASY",
    spritePath: "/FYP/assets/enemies/monster/Monster.png?v=20261010-enemyart1",
    questionTypes: ["TRUE_FALSE", "ODD_WORD_OUT"],
    hp: 70, damage: 10, xp: 25, coins: 12, role: "FOREST ENEMY", roleKey: "battle.forestEnemy"
  },
  "road-guardian-01": {
    id: "road-guardian-01", name: "Road Guardian", nameZh: "道路守卫", type: "guardian", difficulty: "MEDIUM",
    spritePath: "/FYP/assets/enemies/monster/Monster.png?v=20261010-enemyart1",
    questionTypes: ["TRUE_FALSE", "SENTENCE_BUILDER"],
    hp: 85, damage: 11, xp: 28, coins: 14, role: "ROAD GUARDIAN", roleKey: "battle.ancientGuardian"
  },
  "guardian-01": {
    id: "guardian-01", name: "Grammar Guardian", nameZh: "语法守卫", type: "guardian", difficulty: "MEDIUM",
    spritePath: "/FYP/assets/enemies/monster/Monster.png?v=20261010-enemyart1",
    questionTypes: ["TRUE_FALSE", "SENTENCE_BUILDER"],
    hp: 100, damage: 12, xp: 30, coins: 15, role: "ANCIENT GUARDIAN", roleKey: "battle.ancientGuardian"
  },
  "cave-wraith-01": {
    id: "cave-wraith-01", name: "Cave Wraith", nameZh: "洞穴幽魂", type: "wraith", difficulty: "MEDIUM",
    spritePath: "/FYP/assets/enemies/monster/Monster.png?v=20261010-enemyart1",
    questionTypes: ["TRUE_FALSE", "SENTENCE_BUILDER"],
    hp: 110, damage: 14, xp: 45, coins: 20, role: "CAVE SPIRIT", roleKey: "battle.caveSpirit"
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
  questions: [],
  currentQuestion: null,
  usedQuestionIds: [],
  timerId: null,
  questionStartAt: 0,
  locked: false,
  selectedWords: [],
  completed: false,
  mode: "MENU",
  focusUsed: false,
  turnLocked: false,
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
  localStorage.setItem(WORLD_SAVE_KEY, JSON.stringify({ ...getSave(), ...patch }));
}

async function saveProgressServer(payload) {
  try {
    const response = await fetch("/FYP/api/save_progress.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) return false;
    const data = await response.json();
    return Boolean(data.ok);
  } catch {
    return false;
  }
}

function questionSkillCode(question) {
  const raw = String(question?.skill || question?.primarySkill || "VOCABULARY").toUpperCase();
  if (raw === "SENTENCECONSTRUCTION") return "SENTENCE_CONSTRUCTION";
  if (raw === "ITENGLISH") return "IT_ENGLISH";
  if (raw === "GRAMMAR") return "GRAMMAR";
  return raw;
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
  }
  if (state.mode === "MENU") {
    ui.commandPrompt.textContent = t("battle.whatDo");
    ui.menuSubtext.textContent = t("battle.chooseAction");
  }
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
});

function normalizeSentence(words) {
  return (Array.isArray(words) ? words : [])
    .map(word => String(word).trim())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isCorrect(question, value) {
  if (question.type === "TRUE_FALSE") return value === Boolean(question.answer);
  if (question.type === "ODD_WORD_OUT") return String(value).toLowerCase() === String(question.answer).toLowerCase();
  if (question.type === "SENTENCE_BUILDER") return normalizeSentence(value) === normalizeSentence(question.answerOrder);
  return false;
}

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

function chooseQuestion() {
  const supportsType = question =>
    !Array.isArray(state.enemy.questionTypes) ||
    state.enemy.questionTypes.includes(question.type);

  // Keep each enemy's question types aligned with the game design data.
  let pool = state.questions.filter(
    q => q.difficulty === state.enemy.difficulty && supportsType(q)
  );

  if (!pool.length) {
    pool = state.questions.filter(supportsType);
  }
  if (!pool.length) {
    pool = state.questions;
  }

  const fresh = pool.filter(q => !state.usedQuestionIds.includes(q.id));
  const candidates = fresh.length ? fresh : pool;
  const question = candidates[Math.floor(Math.random() * candidates.length)];
  state.usedQuestionIds.push(question.id);
  return question;
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

function startQuestion() {
  window.clearInterval(state.timerId);
  state.locked = false;
  state.selectedWords = [];
  state.currentQuestion = chooseQuestion();

  const q = state.currentQuestion;
  ui.questionType.textContent = formatType(q.type);
  ui.questionDifficulty.textContent = t("battle." + String(q.difficulty).toLowerCase());
  ui.questionText.textContent = q.question;
  ui.questionTranslation.textContent = q.questionZh || "";
  ui.questionTranslation.classList.toggle("hidden", getLanguage() !== "zh" || !q.questionZh);
  ui.questionPrompt.textContent = getLanguage() === "zh"
    ? (q.promptZh || (q.type === "TRUE_FALSE" ? t("battle.answerPrompt") : q.prompt || ""))
    : (q.prompt || t("battle.answerPrompt"));
  renderChoices(q);

  let remaining = Number(q.timeLimit || 5);
  ui.timerText.classList.remove("warning");
  ui.timerText.textContent = remaining.toFixed(1) + "s";
  state.questionStartAt = performance.now();

  state.timerId = window.setInterval(() => {
    if (state.locked || state.completed) return;
    remaining -= 0.1;
    ui.timerText.textContent = Math.max(0, remaining).toFixed(1) + "s";
    if (remaining <= 2) ui.timerText.classList.add("warning");

    if (remaining <= 0) {
      window.clearInterval(state.timerId);
      resolve(null, null, true);
    }
  }, 100);
}

function resolve(value, button, timedOut) {
  if (state.locked || state.completed) return;

  state.locked = true;
  window.clearInterval(state.timerId);
  disableAnswers();

  const q = state.currentQuestion;
  const correct = !timedOut && isCorrect(q, value);

  if (button) button.classList.add(correct ? "correct" : "wrong");

  if (!correct) {
    setBattleMessage(timedOut ? "battle.timeUp" : "battle.wrong");

    window.setTimeout(enemyTurn, 700);
    return;
  }

  const elapsed = performance.now() - state.questionStartAt;
  const fast = elapsed <= Number(q.timeLimit || 5) * 1000 * 0.45;
  const baseDamage = q.difficulty === "HARD" ? 30 : q.difficulty === "MEDIUM" ? 25 : 20;

  const focusMultiplier = state.focusUsed ? 1.5 : 1;
  const fastMultiplier = fast ? 1.1 : 1;
  const damage = Math.round(baseDamage * focusMultiplier * fastMultiplier);

  const usedFocus = state.focusUsed;
  state.focusUsed = false;
  state.enemyHp = Math.max(0, state.enemyHp - damage);

  const saved = getSave();
  updateSave({
    xp: Number(saved.xp || 0) + Number(q.xp || 10),
    coins: Number(saved.coins || 0) + Number(q.coins || 5),
    power: Number(saved.power || 0) + Number(q.englishPower || 1)
  });

  void saveProgressServer({
    xpDelta: Number(q.xp || 10),
    coinDelta: Number(q.coins || 5),
    englishPowerDelta: Number(q.englishPower || 1),
    englishSkillCode: questionSkillCode(q),
    sourceType: "QUESTION",
    sourceId: null,
    description: "Question reward: " + q.id
  });

  playAttackAnimation();
  updateHp();

  setBattleMessage(usedFocus ? "battle.focusHit" : "battle.directHit", { damage });

  if (state.enemyHp <= 0) {
    window.setTimeout(finishVictory, 800);
  } else {
    // Correct answers are the player's successful attack turn.
    // The enemy does NOT counterattack after a correct answer.
    // Continue directly to the next English question.
    window.setTimeout(startQuestion, 900);
  }
}
function enemyTurn() {
  if (state.completed) return;

  playEnemyAttackAnimation();
  state.playerHp = Math.max(0, state.playerHp - state.enemy.damage);
  updateHp();
  setBattleMessage("battle.enemyAttack", {
    enemy: localEnemyName(),
    damage: state.enemy.damage
  });

  if (state.playerHp <= 0) {
    window.setTimeout(finishDefeat, 800);
  } else {
    // Do not return to the command menu after every question.
    // Continue directly with the next English challenge.
    window.setTimeout(startQuestion, 750);
  }
}

function showBattleMenu() {
  showMenu(t("battle.whatDo"), t("battle.chooseAction"));
}

function useSkill() {
  if (state.completed || state.locked) return;

  if (state.focusUsed) {
    setBattleMessage("battle.focusAlready");
    return;
  }

  state.focusUsed = true;
  setBattleMessage("battle.focusActive");

  // If SKILL is selected before the first FIGHT, start the continuous
  // question flow. During combat, leave the current question/timer alone.
  if (ui.questionPanel.classList.contains("hidden")) {
    showQuestionPanel();
    startQuestion();
  }
}
function useItem() {
  if (state.completed || state.locked) return;

  const questionAlreadyOpen = !ui.questionPanel.classList.contains("hidden");
  const save = getSave();
  const currentCoins = Number(save.coins || 0);

  if (state.playerHp >= state.playerMaxHp) {
    setBattleMessage("battle.hpFull");
    return;
  }

  if (currentCoins < 5) {
    setBattleMessage("battle.notEnoughCoins");
    return;
  }

  state.playerHp = Math.min(state.playerMaxHp, state.playerHp + 20);
  updateSave({ coins: currentCoins - 5 });
  void saveProgressServer({
    xpDelta: 0,
    coinDelta: -5,
    englishPowerDelta: 0,
    englishSkillCode: "VOCABULARY",
    sourceType: "SHOP_PURCHASE",
    sourceId: null,
    description: "Used Healing Herb in battle"
  });

  updateHp();
  setBattleMessage("battle.healed");

  // Do not force another command selection. If the player used the item
  // from the initial menu, continue straight into the question flow.
  if (!questionAlreadyOpen) {
    showQuestionPanel();
    startQuestion();
  }
}
function returnToMapAfterBattle() {
  window.clearInterval(state.timerId);
  sessionStorage.setItem(ESCAPE_KEY, state.enemy.id);
  sessionStorage.removeItem(BATTLE_KEY);
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
  state.resultType = victory ? "VICTORY" : "DEFEAT";
  ui.resultKicker.textContent = victory ? t("battle.victory") : t("battle.defeat");
  ui.resultTitle.textContent = title;
  ui.resultText.textContent = text;
  ui.resultRewards.innerHTML = rewards.map(([label, value]) =>
    "<div><span>" + label + "</span><b>" + value + "</b></div>"
  ).join("");
  ui.resultButton.textContent = victory ? t("battle.returnMap") : t("battle.retry");
  ui.battleResult.classList.remove("hidden");
  ui.resultButton.onclick = () => {
    if (victory) {
      sessionStorage.removeItem(BATTLE_KEY);
      sessionStorage.removeItem(ESCAPE_KEY);
      window.location.href = "/FYP/index.php";
    } else {
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

function finishVictory() {
  if (state.completed) return;
  state.completed = true;
  window.clearInterval(state.timerId);

  const saved = getSave();
  const defeated = new Set(Array.isArray(saved.defeatedEnemyIds) ? saved.defeatedEnemyIds : []);
  defeated.add(state.enemy.id);

  updateSave({
    xp: Number(saved.xp || 0) + state.enemy.xp,
    coins: Number(saved.coins || 0) + state.enemy.coins,
    defeatedEnemyIds: [...defeated],
    questStep: state.enemy.id === "slime-01"
      ? Math.max(Number(saved.questStep || 0), 2)
      : Number(saved.questStep || 0)
  });

  // Enemy victory grants XP and Coins. English Power is awarded for
  // learning activities (correct answers/learning quests), not kills.
  void saveProgressServer({
    xpDelta: state.enemy.xp,
    coinDelta: state.enemy.coins,
    englishPowerDelta: 0,
    englishSkillCode: "VOCABULARY",
    sourceType: "ENEMY",
    sourceId: null,
    description: "Defeated " + state.enemy.name
  });

  showResult(
    true,
    t("battle.victoryTitle", { enemy: localEnemyName() }),
    t("battle.victoryText"),
    [[t("battle.rewardXp"), "+" + state.enemy.xp], [t("battle.rewardCoins"), "+" + state.enemy.coins]]
  );
}

function finishDefeat() {
  if (state.completed) return;
  state.completed = true;
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
    if (state.completed) return;
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
  state.enemyHp = state.enemy.hp;
  state.focusUsed = false;

  ui.enemyName.textContent = localEnemyName();
  ui.enemyLabel.textContent = localEnemyName().toUpperCase();
  ui.enemyRole.textContent = t(state.enemy.roleKey);
  if (ui.enemyDifficulty) ui.enemyDifficulty.textContent = t("battle." + String(state.enemy.difficulty).toLowerCase());
  // Use art matched to the actual enemy. Slime encounters must not show
  // the winged purple monster; other enemies use the available fantasy sprite.
  ui.enemyFigure.textContent = "";
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

  bindBattleEvents();
  updateHp();

  try {
    const response = await fetch("/FYP/data/questions.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Question data unavailable");
    state.questions = await response.json();
    setBattleMessage("battle.enemyAppeared", { enemy: localEnemyName() });
    showBattleMenu();
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

init();
