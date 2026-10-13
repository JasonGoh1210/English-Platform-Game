export function formatReviewAnswer(answer, t) {
  if (answer === true) return t("battle.true");
  if (answer === false) return t("battle.false");
  if (answer === null || answer === undefined) return t("review.noAnswer");
  if (Array.isArray(answer) && answer.every(word => typeof word === "string")) return answer.join(" ");
  if (typeof answer === "string") return answer || t("review.noAnswer");
  return t("review.invalidAnswer");
}

export function createBattleReviewPanel(root, battleId, t, getLanguage) {
  let data = null;
  let loading = false;
  let failed = false;
  let request = null;
  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const typeKey = type => ({TRUE_FALSE:"battle.trueFalse", ODD_WORD_OUT:"battle.oddOneOut", SENTENCE_BUILDER:"battle.sentenceBuilder"})[type];
  function valid(receipt) {
    const stats = receipt?.stats;
    return receipt?.ok && receipt.battleId === battleId && ["VICTORY", "DEFEAT", "ESCAPED"].includes(receipt.status)
      && stats && ["total", "correct", "wrong", "timedOut"].every(key => Number.isSafeInteger(stats[key]) && stats[key] >= 0)
      && stats.total === stats.correct + stats.wrong + stats.timedOut
      && (stats.total === 0 ? stats.accuracy === null : Number.isFinite(stats.accuracy) && stats.accuracy >= 0 && stats.accuracy <= 100)
      && (receipt.nextCursor === null || Number.isSafeInteger(receipt.nextCursor) && receipt.nextCursor > 0)
      && Array.isArray(receipt.mistakes) && receipt.mistakes.length <= 10
      && receipt.mistakes.every(item => Number.isSafeInteger(item.attemptId) && item.attemptId > 0
        && typeKey(item.question?.type) && typeof item.question.question === "string"
        && (item.question.type === "TRUE_FALSE" ? typeof item.correctAnswer === "boolean"
          : item.question.type === "ODD_WORD_OUT" ? typeof item.correctAnswer === "string"
          : Array.isArray(item.correctAnswer) && item.correctAnswer.every(word => typeof word === "string"))
        && typeof item.timedOut === "boolean" && typeof item.explanation === "string" && typeof item.explanationZh === "string");
  }
  function answerLine(label, answer, className) {
    const line = node("p", className);
    line.append(node("strong", "", t(label) + " "), node("span", "", formatReviewAnswer(answer, t)));
    return line;
  }
  function render() {
    const restoreFocus = root.contains(document.activeElement);
    const focusedAttempt = document.activeElement?.closest("details")?.dataset.attemptId;
    const open = new Set([...root.querySelectorAll("details[open]")].map(detail => detail.dataset.attemptId));
    const hadDetails = root.querySelector("details") !== null;
    root.setAttribute("aria-busy", String(loading));
    root.replaceChildren();
    const heading = node("h3", "", t("review.title"));
    heading.id = "battleReviewTitle";
    root.append(heading);
    if (data) {
      const stats = node("div", "review-stats");
      for (const [key, label] of [["total","review.total"],["correct","review.correct"],["wrong","review.wrong"],["timedOut","review.timeout"]]) {
        const item = node("div", "");
        item.append(node("span", "", t(label)), node("b", "", String(data.stats[key])));
        stats.append(item);
      }
      root.append(stats, node("p", "review-accuracy", data.stats.total
        ? t("review.accuracy", {value:data.stats.accuracy}) : t("review.noAttempts")));
      if (data.stats.total && data.stats.wrong + data.stats.timedOut === 0) root.append(node("p", "review-perfect", t("review.perfect")));
      else if (data.mistakes.length) {
        root.append(node("p", "review-help", t("review.help")));
        const list = node("div", "review-mistakes");
        data.mistakes.forEach((item, index) => {
          const detail = node("details", "review-mistake");
          detail.dataset.attemptId = String(item.attemptId);
          detail.open = hadDetails ? open.has(detail.dataset.attemptId) : index === 0;
          const summary = node("summary", "");
          summary.append(node("span", "", t("review.entry", {number:index + 1, type:t(typeKey(item.question.type))})),
            node("span", "review-badge", t(item.timedOut ? "review.timeout" : "review.wrong")));
          const body = node("div", "review-mistake-body");
          body.append(node("h4", "", item.question.question));
          if (getLanguage() === "zh" && item.question.questionZh) body.append(node("p", "review-translation", item.question.questionZh));
          if (Array.isArray(item.question.words)) body.append(node("p", "review-words", item.question.words.join(" · ")));
          body.append(answerLine("review.yourAnswer", item.submittedAnswer, "review-your-answer"),
            answerLine("review.correctAnswer", item.correctAnswer, "review-correct-answer"));
          body.append(node("h5", "", t("review.explanation")));
          if (item.explanation) body.append(node("p", "", item.explanation));
          if (getLanguage() === "zh" && item.explanationZh) body.append(node("p", "review-translation", item.explanationZh));
          if (!item.explanation && !item.explanationZh) body.append(node("p", "", t("review.noExplanation")));
          detail.append(summary, body);
          list.append(detail);
        });
        root.append(list);
      }
    }
    if (loading || failed) {
      const notice = node("p", "review-notice", t(loading ? "review.loading" : "review.failed"));
      notice.setAttribute("role", "status");
      root.append(notice);
    }
    if (!loading && (failed || data?.nextCursor)) {
      const button = node("button", "review-load-more", t(failed ? "review.retry" : "review.more"));
      button.type = "button";
      button.addEventListener("click", () => void load());
      root.append(button);
    }
    if (restoreFocus) {
      heading.tabIndex = -1;
      const detail = [...root.querySelectorAll("details")].find(item => item.dataset.attemptId === focusedAttempt);
      (detail?.querySelector("summary") || root.querySelector("button") || heading).focus({preventScroll:true});
    }
  }
  async function load() {
    if (loading) return request;
    loading = true;
    failed = false;
    render();
    request = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const after = data?.nextCursor || 0;
        const response = await fetch(`/FYP/api/battle_review.php?battleId=${encodeURIComponent(battleId)}&after=${after}`,
          {credentials:"same-origin", cache:"no-store", signal:controller.signal});
        const receipt = await response.json();
        if (!response.ok || !valid(receipt)) throw new Error("Review unavailable");
        if (data) receipt.mistakes = [...data.mistakes, ...receipt.mistakes.filter(item => !data.mistakes.some(old => old.attemptId === item.attemptId))];
        data = receipt;
      } catch {
        failed = true;
      } finally {
        clearTimeout(timeout);
        loading = false;
        render();
      }
    })();
    return request;
  }
  return {
    show() { render(); if (!data && !loading && !failed) void load(); },
    getStats() { return data?.stats || null; }
  };
}
