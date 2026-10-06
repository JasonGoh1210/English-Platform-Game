const SAVE_KEY = "englishPowerQuest.save.v1";

export function savePlayer(player) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(player));
}

export function loadPlayer() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("Save data could not be loaded:", error);
    return null;
  }
}

export function clearPlayerSave() {
  localStorage.removeItem(SAVE_KEY);
}