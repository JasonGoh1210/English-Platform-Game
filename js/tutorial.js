const STAGES = new Set(["MOVE", "MEET", "SLIME", "BATTLE", "RETURN", "DONE", "SKIPPED", "LEGACY"]);

export function normalizeTutorial(value) {
  if (!value || value.version !== 1 || !STAGES.has(value.stage)) return null;
  return {
    version: 1,
    stage: value.stage,
    moveStartX: Number.isFinite(value.moveStartX) ? Math.min(1710, Math.max(70, value.moveStartX)) : 440
  };
}

export function initialTutorial(saved, showIntro, playerX = 440) {
  const existing = normalizeTutorial(saved?.tutorial);
  if (existing) return existing;
  const firstAdventure = showIntro && Number(saved?.questStep || 0) === 0
    && !(saved?.defeatedEnemyIds || []).includes("slime-01");
  return { version: 1, stage: firstAdventure ? "MOVE" : "LEGACY", moveStartX: playerX };
}

export function tutorialActive(value) {
  return Boolean(value && !["DONE", "SKIPPED", "LEGACY"].includes(value.stage));
}

export function tutorialSlimeVisible(value) {
  return !value || !["MOVE", "MEET"].includes(value.stage);
}

export function tutorialSlimeX(value) {
  return value && ["SLIME", "BATTLE", "RETURN"].includes(value.stage) ? 1140 : 1435;
}

// The guide never captures movement keys or pauses an issued battle question.
export function createTutorialGuide(t, onSkip) {
  const panel = document.getElementById("tutorialGuide");
  const title = document.getElementById("tutorialTitle");
  const text = document.getElementById("tutorialText");
  const progress = document.getElementById("tutorialProgress");
  const skip = document.getElementById("tutorialSkip");
  let previous = "";
  skip?.addEventListener("click", onSkip);
  return (value, visible, language, nearTarget = false) => {
    const stage = value?.stage;
    panel?.classList.toggle("hidden", !visible);
    panel?.classList.toggle("tutorial-guide-near", nearTarget);
    const target = visible && ["MEET", "RETURN"].includes(stage) ? "interactButton" : null;
    document.getElementById("interactButton")?.classList.toggle("tutorial-highlight", target !== null);
    const signature = stage + ":" + language + ":" + nearTarget;
    if (!panel || signature === previous) return;
    previous = signature;
    const step = { MOVE: 1, MEET: 2, SLIME: 3, BATTLE: 3, RETURN: 4 }[stage] || 1;
    title.textContent = t("tutorial.map." + (stage || "MOVE").toLowerCase() + ".title");
    text.textContent = t("tutorial.map." + (stage || "MOVE").toLowerCase() + (nearTarget ? ".near" : ".text"));
    progress.textContent = t("tutorial.progress", { step });
  };
}
