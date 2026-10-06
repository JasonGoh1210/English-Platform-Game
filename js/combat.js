const DAMAGE_BY_DIFFICULTY = {
  EASY: 20,
  MEDIUM: 25,
  HARD: 30
};

export function startCombat(enemy) {
  return {
    enemyId: enemy.id,
    enemyHp: enemy.hp,
    enemyMaxHp: enemy.hp,
    playerHp: 100,
    playerMaxHp: 100,
    combo: 0,
    currentQuestionId: null,
    usedQuestionIds: [],
    status: "ACTIVE",
    lastResponseMs: 99999,
    pendingFocus: false
  };
}

export function getBossPhase(enemy, currentHp) {
  if (!enemy.isBoss || !Array.isArray(enemy.phases) || !enemy.phases.length) return null;

  const percent = currentHp / enemy.hp;
  let selected = enemy.phases[0];

  for (const phase of enemy.phases) {
    if (percent <= Number(phase.hpThresholdPercent)) selected = phase;
  }

  return selected;
}

export function calculateDamage(question, combat) {
  const base = DAMAGE_BY_DIFFICULTY[question.difficulty] || 20;
  const comboBonus = Math.min(Math.max(combat.combo - 1, 0) * 0.05, 0.20);

  const timeLimit = Number(question.timeLimit || 5);
  const responseSeconds = Number(combat.lastResponseMs || 99999) / 1000;
  const fastBonus = responseSeconds <= timeLimit * 0.5 ? 0.10 : 0;

  const focusBonus = combat.pendingFocus ? 0.50 : 0;
  return Math.max(1, Math.round(base * (1 + comboBonus + fastBonus + focusBonus)));
}

export function handleCorrectAnswer(combat, question) {
  combat.combo += 1;
  const damage = calculateDamage(question, combat);
  combat.enemyHp = Math.max(0, combat.enemyHp - damage);
  combat.pendingFocus = false;

  return { damage, enemyDefeated: combat.enemyHp <= 0 };
}

export function handleWrongAnswer(combat) {
  combat.combo = 0;
  return { comboReset: true };
}

export function enemyAttack(enemy, phase) {
  return Math.max(1, Number(phase?.damage ?? enemy.damage ?? 10));
}

export function applyEnemyDamage(combat, damage) {
  combat.playerHp = Math.max(0, combat.playerHp - damage);
  return combat.playerHp <= 0;
}

export function getReward(enemy) {
  return {
    xp: Number(enemy.rewardXP || 0),
    coins: Number(enemy.rewardCoins || 0),
    skillPoints: Number(enemy.rewardSkillPoints || 0)
  };
}