const ENGLISH_SKILLS = [
  "vocabulary",
  "grammar",
  "sentenceConstruction",
  "itEnglish"
];

export function createDefaultPlayer() {
  return {
    displayName: "Rookie",
    level: 1,
    xp: 0,
    coins: 0,
    skillPoints: 0,
    englishPower: {
      vocabulary: 0,
      grammar: 0,
      sentenceConstruction: 0,
      itEnglish: 0
    },
    totalAttempts: 0,
    correctAttempts: 0,
    bestCombo: 0,
    currentWorld: "Dreamwood",
    currentEnemyIndex: 0,
    defeatedEnemyIds: [],
    mastery: {},
    unlockedSkills: []
  };
}

function numberOrDefault(value, fallback) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

export function normalizePlayer(raw) {
  const base = createDefaultPlayer();
  const saved = raw && typeof raw === "object" ? raw : {};

  const player = {
    ...base,
    ...saved,
    englishPower: { ...base.englishPower, ...(saved.englishPower || {}) },
    defeatedEnemyIds: Array.isArray(saved.defeatedEnemyIds) ? saved.defeatedEnemyIds : [],
    mastery: saved.mastery && typeof saved.mastery === "object" ? saved.mastery : {},
    unlockedSkills: Array.isArray(saved.unlockedSkills) ? saved.unlockedSkills : []
  };

  player.level = Math.max(1, numberOrDefault(player.level, 1));
  player.xp = Math.max(0, numberOrDefault(player.xp, 0));
  player.coins = Math.max(0, numberOrDefault(player.coins, 0));
  player.skillPoints = Math.max(0, numberOrDefault(player.skillPoints, 0));
  player.totalAttempts = Math.max(0, numberOrDefault(player.totalAttempts, 0));
  player.correctAttempts = Math.max(0, numberOrDefault(player.correctAttempts, 0));
  player.bestCombo = Math.max(0, numberOrDefault(player.bestCombo, 0));
  player.currentEnemyIndex = Math.max(0, numberOrDefault(player.currentEnemyIndex, 0));

  for (const skill of ENGLISH_SKILLS) {
    player.englishPower[skill] = Math.max(0, numberOrDefault(player.englishPower[skill], 0));
  }

  return player;
}

export function englishSkillLabel(skill) {
  const labels = {
    vocabulary: "Vocabulary",
    grammar: "Grammar",
    sentenceConstruction: "Sentence Construction",
    itEnglish: "IT English"
  };
  return labels[skill] || skill;
}

export function totalEnglishPower(player) {
  return ENGLISH_SKILLS.reduce((sum, skill) => sum + Number(player.englishPower[skill] || 0), 0);
}

export function addEnglishPower(player, skill, amount) {
  if (!ENGLISH_SKILLS.includes(skill)) return;
  player.englishPower[skill] += Math.max(0, amount);
}

export function addCoins(player, amount) {
  player.coins = Math.max(0, player.coins + Math.trunc(amount));
}

export function addSkillPoints(player, amount) {
  player.skillPoints = Math.max(0, player.skillPoints + Math.trunc(amount));
}

export function getLevelDefinition(levels, level) {
  return levels.find((item) => item.level === level) || levels[levels.length - 1];
}

export function updateLevelFromXP(player, levels) {
  const sorted = [...levels].sort((a, b) => a.requiredXP - b.requiredXP);
  const previousLevel = player.level;
  let nextLevel = 1;

  for (const definition of sorted) {
    if (player.xp >= definition.requiredXP) nextLevel = definition.level;
  }

  player.level = Math.max(previousLevel, nextLevel);

  let skillPointsGained = 0;
  if (player.level > previousLevel) {
    for (let level = previousLevel + 1; level <= player.level; level += 1) {
      const definition = getLevelDefinition(sorted, level);
      const points = Number(definition?.skillPointsOnLevelUp || 0);
      skillPointsGained += points;
      player.skillPoints += points;
    }
  }

  return {
    previousLevel,
    newLevel: player.level,
    skillPointsGained,
    leveledUp: player.level > previousLevel
  };
}

export function addXP(player, amount, levels) {
  player.xp += Math.max(0, Math.trunc(amount));
  return updateLevelFromXP(player, levels);
}

export function recordAnswer(player, isCorrect, questionId) {
  player.totalAttempts += 1;

  if (!player.mastery[questionId]) {
    player.mastery[questionId] = { attempts: 0, correct: 0 };
  }

  player.mastery[questionId].attempts += 1;

  if (isCorrect) {
    player.correctAttempts += 1;
    player.mastery[questionId].correct += 1;
  }
}

export function questionIsRepeat(player, questionId) {
  return Number(player.mastery?.[questionId]?.correct || 0) > 0;
}

export function accuracy(player) {
  if (player.totalAttempts === 0) return 0;
  return Math.round((player.correctAttempts / player.totalAttempts) * 100);
}