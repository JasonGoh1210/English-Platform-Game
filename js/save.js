// Local save system for the first prototype.

const SAVE_KEY = "englishPowerQuestPlayer";

export function savePlayer(player) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(player));
}

export function loadPlayer() {
  const raw = localStorage.getItem(SAVE_KEY);
  return raw ? JSON.parse(raw) : null;
}
