export async function loadQuestions() {
  const response = await fetch("./data/questions.json", { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load question data.");
  return response.json();
}

export function filterQuestions(questions, enemy, phase) {
  const types = enemy.questionTypes || [];
  const difficulty = phase?.difficulty || enemy.difficulty || "EASY";

  let candidates = questions.filter((question) => {
    const typeMatch = types.length === 0 || types.includes(question.type);
    const difficultyMatch = question.difficulty === difficulty;
    return typeMatch && difficultyMatch;
  });

  if (candidates.length === 0) {
    candidates = questions.filter((question) => types.length === 0 || types.includes(question.type));
  }

  return candidates.length ? candidates : questions;
}

export function pickQuestion(questions, enemy, phase, recentlyUsedIds = []) {
  const candidates = filterQuestions(questions, enemy, phase);
  const fresh = candidates.filter((question) => !recentlyUsedIds.includes(question.id));
  const pool = fresh.length ? fresh : candidates;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function questionTimeLimit(question) {
  return Number(question.timeLimit || 5);
}

export function formatQuestionType(type) {
  return {
    TRUE_FALSE: "TRUE / FALSE",
    ODD_WORD_OUT: "ODD WORD OUT",
    SENTENCE_BUILDER: "SENTENCE BUILDER"
  }[type] || type;
}

export function createQuestionReward(question, repeated) {
  const multiplier = repeated ? 0.5 : 1;
  return {
    xp: Math.floor(Number(question.xp || 0) * multiplier),
    coins: Math.floor(Number(question.coins || 0) * multiplier),
    englishPower: repeated ? 0 : Number(question.englishPower || 0)
  };
}

export function normalizedSentenceAnswer(question, selectedWords) {
  return selectedWords.join(" ").trim().toLowerCase();
}