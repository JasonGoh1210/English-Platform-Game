import { t, onLanguageChange } from "./i18n.js?v=20261011-savefix1";

const warnings = new Map();

function renderSaveWarnings() {
  const notice = document.getElementById("saveStatus");
  if (!notice) return;
  notice.textContent = [...warnings.values()].map(key => t(key)).join(" ");
  notice.classList.toggle("hidden", warnings.size === 0);
}

export function setSaveWarning(kind, key) {
  warnings.set(kind, key);
  renderSaveWarnings();
}

export function clearSaveWarning(kind) {
  warnings.delete(kind);
  renderSaveWarnings();
}

onLanguageChange(renderSaveWarnings);
