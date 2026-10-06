const BATTLE_KEY = "englishPowerQuest.battle";
const WORLD_SAVE_KEY = "englishPowerQuest.world.v2";

const enemies = {
  "slime-01": {
    id: "slime-01", name: "Word Slime", type: "slime", difficulty: "EASY",
    hp: 60, damage: 10, xp: 20, coins: 10, role: "WORD CREATURE"
  },
  "bat-01": {
    id: "bat-01", name: "Confusion Bat", type: "bat", difficulty: "EASY",
    hp: 70, damage: 10, xp: 25, coins: 12, role: "FOREST ENEMY"
  },
  "guardian-01": {
    id: "guardian-01", name: "Grammar Guardian", type: "guardian", difficulty: "MEDIUM",
    hp: 100, damage: 12, xp: 30, coins: 15, role: "ANCIENT GUARDIAN"
  }
};

const ui = {
  enemyName: document.getElementById("battleEnemyName"),
  enemyLabel: document.getElementById("battleEnemyLabel"),
  enemyRole: document.getElementById("battleEnemyRole"),
  enemyFigure: document.getElementById("enemyFigure"),
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
  questionPrompt: document.getElementById("questionPrompt"),
  answerArea: document.getElementById("answerArea"),
  backToMenu: document.getElementById("backToMenu"),
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
  mode: "MENU"
};

function getEnemy() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(BATTLE_KEY) || "null");
    return enemies[saved?.enemyId] || enemies["slime-01"];
  } catch {
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

function formatType(type) {
  return type === "TRUE_FALSE" ? "TRUE / FALSE"
    : type === "ODD_WORD_OUT" ? "ODD WORD OUT"
    : type === "SENTENCE_BUILDER" ? "SENTENCE BUILDER"
    : type;
}

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

function showMenu(prompt = "What will you do?", subtext = "Choose an action.") {
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
  const sourcePool = state.questions.filter(q => q.difficulty === state.enemy.difficulty);
  const pool = sourcePool.length ? sourcePool : state.questions;
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
    submit.textContent = "BUILD & ATTACK";
    submit.addEventListener("click", () => resolve(state.selectedWords.slice(), submit, false));

    ui.answerArea.append(selected, bank, submit);
    return;
  }

  const choices = question.type === "TRUE_FALSE"
    ? [{ label: "TRUE", value: true }, { label: "FALSE", value: false }]
    : (question.words || []).map(word => ({ label: word, value: word }));

  choices.forEach(choice => {
    const button = document.createElement("button");
    button.className = "battle-answer-button";
    button.type = "button";
    button.textContent = choice.label;
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
  ui.questionDifficulty.textContent = q.difficulty;
  ui.questionText.textContent = q.question;
  ui.questionPrompt.textContent = q.prompt || "Answer correctly to attack.";
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
    ui.battleMessage.textContent = timedOut
      ? "Time's up! The enemy attacks."
      : "Wrong answer! The enemy attacks.";

    window.setTimeout(enemyTurn, 700);
    return;
  }

  const elapsed = performance.now() - state.questionStartAt;
  const fast = elapsed <= Number(q.timeLimit || 5) * 1000 * 0.45;
  const baseDamage = q.difficulty === "HARD" ? 30 : q.difficulty === "MEDIUM" ? 25 : 20;
  const damage = Math.round(baseDamage * (fast ? 1.1 : 1));

  state.enemyHp = Math.max(0, state.enemyHp - damage);

  const saved = getSave();
  updateSave({
    xp: Number(saved.xp || 0) + Number(q.xp || 10),
    coins: Number(saved.coins || 0) + Number(q.coins || 5),
    power: Number(saved.power || 0) + Number(q.englishPower || 1)
  });

  playAttackAnimation();
  updateHp();
  ui.battleMessage.textContent = "Direct hit! English Power deals " + damage + " damage.";

  if (state.enemyHp <= 0) {
    window.setTimeout(finishVictory, 800);
  } else {
    window.setTimeout(enemyTurn, 900);
  }
}

function enemyTurn() {
  if (state.completed) return;

  playEnemyAttackAnimation();
  state.playerHp = Math.max(0, state.playerHp - state.enemy.damage);
  updateHp();
  ui.battleMessage.textContent = state.enemy.name + " attacks for " + state.enemy.damage + " damage.";

  if (state.playerHp <= 0) {
    window.setTimeout(finishDefeat, 800);
  } else {
    window.setTimeout(showBattleMenu, 750);
  }
}

function showBattleMenu() {
  showMenu("What will you do?", "Choose your next action.");
}

function useSkill() {
  if (state.completed) return;
  showMenu("Skill", "No active skill is equipped yet. Choose FIGHT to use your English Power.",);
}

function useItem() {
  if (state.completed) return;

  const save = getSave();
  const currentCoins = Number(save.coins || 0);

  if (state.playerHp >= state.playerMaxHp) {
    showMenu("Item", "Your HP is already full.");
    return;
  }

  if (currentCoins < 5) {
    showMenu("Item", "You need 5 Coins for a Healing Herb.");
    return;
  }

  state.playerHp = Math.min(state.playerMaxHp, state.playerHp + 20);
  updateSave({ coins: currentCoins - 5 });
  updateHp();
  ui.battleMessage.textContent = "Healing Herb restored 20 HP.";

  setTimeout(enemyTurn, 700);
}

function runAway() {
  if (state.completed) return;
  window.clearInterval(state.timerId);
  sessionStorage.removeItem(BATTLE_KEY);
  window.location.href = "/FYP/index.html";
}

function playAttackAnimation() {
  const player = document.querySelector(".player-figure-large");
  const enemy = document.querySelector(".monster-sprite");
  player.classList.remove("attack");
  enemy.classList.remove("hit");
  void player.offsetWidth;
  void enemy.offsetWidth;
  player.classList.add("attack");
  enemy.classList.add("hit");
}

function playEnemyAttackAnimation() {
  const player = document.querySelector(".player-figure-large");
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
  ui.resultKicker.textContent = victory ? "VICTORY" : "DEFEAT";
  ui.resultTitle.textContent = title;
  ui.resultText.textContent = text;
  ui.resultRewards.innerHTML = rewards.map(([label, value]) =>
    "<div><span>" + label + "</span><b>" + value + "</b></div>"
  ).join("");
  ui.resultButton.textContent = victory ? "Return to Map" : "Retry Battle";
  ui.battleResult.classList.remove("hidden");
  ui.resultButton.onclick = () => {
    if (victory) {
      sessionStorage.removeItem(BATTLE_KEY);
      window.location.href = "/FYP/index.html";
    } else {
      window.location.reload();
    }
  };
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
    power: Number(saved.power || 0) + 2,
    defeatedEnemyIds: [...defeated],
    questStep: state.enemy.id === "slime-01"
      ? Math.max(Number(saved.questStep || 0), 2)
      : Number(saved.questStep || 0)
  });

  showResult(
    true,
    state.enemy.name + " defeated!",
    "The road is safe again. Your knowledge made you stronger.",
    [["XP", "+" + state.enemy.xp], ["Coins", "+" + state.enemy.coins], ["POWER", "+2"]]
  );
}

function finishDefeat() {
  if (state.completed) return;
  state.completed = true;
  window.clearInterval(state.timerId);

  showResult(
    false,
    "Try Again",
    "Your journey is not over. Your learning progress is safe.",
    [["STATUS", "RETRY"], ["POWER", String(getSave().power || 0)], ["HP", "0"]]
  );
}

function bindBattleEvents() {
  ui.fightButton.addEventListener("click", () => {
    if (state.completed) return;
    showQuestionPanel();
    ui.battleMessage.textContent = "What will you do? Use your English to attack!";
    startQuestion();
  });

  ui.skillButton.addEventListener("click", useSkill);
  ui.itemButton.addEventListener("click", useItem);
  ui.runButton.addEventListener("click", runAway);

  ui.backToMenu.addEventListener("click", () => {
    window.clearInterval(state.timerId);
    showMenu("What will you do?", "Choose an action.");
  });
}

async function init() {
  state.enemy = getEnemy();
  state.enemyHp = state.enemy.hp;

  ui.enemyName.textContent = state.enemy.name;
  ui.enemyLabel.textContent = state.enemy.name.toUpperCase();
  ui.enemyRole.textContent = state.enemy.role;
  ui.enemyDifficulty.textContent = state.enemy.difficulty;
  ui.enemyFigure.textContent =
    state.enemy.type === "slime" ? "🟢" :
    state.enemy.type === "bat" ? "🦇" : "🛡️";

  bindBattleEvents();
  updateHp();

  try {
    const response = await fetch("/FYP/data/questions.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Question data unavailable");
    state.questions = await response.json();
    ui.battleMessage.textContent = "A wild " + state.enemy.name + " appeared!";
    showBattleMenu();
  } catch (error) {
    ui.battleMessage.textContent = "Unable to load the English challenge.";
    console.error(error);
  }
}

init();
