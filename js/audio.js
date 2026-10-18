// Original short 8-bit effects, synthesized locally; no audio downloads required.
const STORAGE_KEY = "englishPowerQuest.audio.v1";
const DEFAULTS = { enabled: true, volume: 0.35 };
const effects = {
  click: [[740, 0.035, "square", 0.12]],
  correct: [[523, 0.065], [784, 0.10]],
  wrong: [[220, 0.09, "triangle"], [147, 0.13, "triangle"]],
  attack: [[880, 0.035, "sawtooth"], [440, 0.035, "sawtooth"], [110, 0.07, "triangle"]],
  hurt: [[120, 0.07, "sawtooth"], [75, 0.12, "triangle"]],
  focus: [[392, 0.07], [587, 0.07], [880, 0.12]],
  heal: [[330, 0.07, "triangle"], [440, 0.07, "triangle"], [659, 0.16, "triangle"]],
  portal: [[262, 0.06, "triangle"], [392, 0.06, "triangle"], [587, 0.06, "triangle"], [880, 0.16, "triangle"]],
  cave: [[196, 0.10, "triangle"], [147, 0.15, "triangle"]],
  dialogue: [[440, 0.04, "triangle"], [523, 0.06, "triangle"]],
  encounter: [[196, 0.06], [196, 0.06], [294, 0.10]],
  level: [[523, 0.07], [659, 0.07], [784, 0.07], [1047, 0.18]],
  victory: [[523, 0.09], [659, 0.09], [784, 0.09], [659, 0.09], [1047, 0.25]],
  defeat: [[330, 0.13, "triangle"], [262, 0.13, "triangle"], [196, 0.24, "triangle"]]
};
effects.seal=[[220,.07,'square'],[440,.08,'square'],[880,.15,'triangle']];
effects.bossDefeat=[[330,.12,'triangle'],[247,.12,'triangle'],[165,.18,'triangle'],[110,.35,'triangle']];
let settings = readSettings();
let context = null;
let master = null;
let unlocked = false;
let initialized = false;
let resuming = null;
const voices = new Set();
const lastPlayed = new Map();
const musicThemes={
  boss1:{tempo:88,notes:[196,0,294,0,220,0,262,0],bass:[98,98,110,87]},
  boss2:{tempo:112,notes:[220,330,294,220,262,392,330,294],bass:[110,110,131,98]},
  boss3:{tempo:136,notes:[247,370,330,294,247,440,392,330],bass:[123,110,98,110]},
  festival:{tempo:92,notes:[262,330,392,330,294,349,440,392],bass:[131,165,147,196]}
};
let musicScene=null,musicTimer=null,musicBeat=0,musicAt=0;const musicVoices=new Set();
function clearMusicVoices(){for(const v of musicVoices){try{v.stop();}catch{}}musicVoices.clear();musicAt=0;}
function musicNote(frequency,at,duration,type,strength){
  if(!frequency||musicVoices.size>10)return;const oscillator=context.createOscillator(),envelope=context.createGain();oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,at);
  envelope.gain.setValueAtTime(0,at);envelope.gain.linearRampToValueAtTime(strength,at+.015);envelope.gain.exponentialRampToValueAtTime(.0001,at+duration);oscillator.connect(envelope);envelope.connect(master);
  oscillator.onended=()=>{musicVoices.delete(oscillator);oscillator.disconnect();envelope.disconnect();};musicVoices.add(oscillator);oscillator.start(at);oscillator.stop(at+duration+.02);
}
function tickMusic(){
  if(!musicScene||!musicThemes[musicScene]||!unlocked||!settings.enabled||!settings.volume||document.hidden||!context||context.state!=='running'){if(musicVoices.size)clearMusicVoices();return;}
  const theme=musicThemes[musicScene],beat=60/theme.tempo;if(!musicAt||musicAt<context.currentTime-.2)musicAt=context.currentTime+.025;
  if(musicAt>context.currentTime+.15)return;
  musicNote(theme.notes[musicBeat%theme.notes.length],musicAt,beat*.65,'triangle',.055);
  if(musicBeat%2===0)musicNote(theme.bass[Math.floor(musicBeat/2)%4],musicAt,beat*1.5,'square',.022);
  musicAt+=beat;musicBeat++;
}
export function setMusicScene(scene){
  const next=musicThemes[scene]?scene:null;if(next===musicScene)return;clearMusicVoices();musicScene=next;musicBeat=0;
  if(musicTimer){clearInterval(musicTimer);musicTimer=null;}if(next){tickMusic();musicTimer=setInterval(tickMusic,120);}
}
export function getMusicState(){return {scene:musicScene,audible:!!(musicScene&&unlocked&&settings.enabled&&settings.volume&&!document.hidden&&context?.state==='running')};}

function readSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      enabled: typeof saved?.enabled === "boolean" ? saved.enabled : DEFAULTS.enabled,
      volume: typeof saved?.volume === "number" && Number.isFinite(saved.volume)
        ? Math.min(1, Math.max(0, saved.volume)) : DEFAULTS.volume
    };
  } catch { return { ...DEFAULTS }; }
}

export function getAudioSettings() { return { ...settings }; }

function stopSounds() {
  clearMusicVoices();
  for (const voice of voices) {
    try { voice.stop(); } catch { /* Already ended. */ }
  }
  voices.clear();
}

function refreshControls() {
  const toggle = document.getElementById("soundEnabled");
  const volume = document.getElementById("soundVolume");
  const output = document.getElementById("soundVolumeValue");
  if (toggle) toggle.checked = settings.enabled;
  if (volume) { volume.value = Math.round(settings.volume * 100); volume.disabled = !settings.enabled; }
  if (output) output.textContent = Math.round(settings.volume * 100) + "%";
}

export function setAudioSettings(patch) {
  if (typeof patch.enabled === "boolean") settings.enabled = patch.enabled;
  if (typeof patch.volume === "number" && Number.isFinite(patch.volume)) {
    settings.volume = Math.min(1, Math.max(0, patch.volume));
  }
  if (master) master.gain.setValueAtTime(settings.enabled ? settings.volume : 0, context.currentTime);
  if (!settings.enabled || settings.volume === 0) stopSounds();
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* Session-only settings. */ }
  refreshControls();
}

function resumeContext() {
  if (context?.state !== "suspended" || resuming) return;
  try {
    resuming = Promise.resolve(context.resume()).catch(() => {}).finally(() => { resuming = null; });
  } catch { resuming = null; }
}

function unlockAudio(event) {
  // Synthetic clicks and page loads must never start audio automatically.
  if (!event.isTrusted || (event.type === "keydown" && event.repeat)) return;
  unlocked = true;
  if (!settings.enabled || settings.volume === 0) return;
  try {
    if (!context) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return;
      context = new AudioCtor();
      master = context.createGain();
      master.gain.value = settings.volume;
      master.connect(context.destination);
    }
    resumeContext();
  } catch { context = null; master = null; }
}

export function playSound(name) {
  const notes = effects[name];
  if (!notes || !unlocked || !settings.enabled || settings.volume === 0 || document.hidden || !context) return;
  // Drop unavailable effects rather than queueing old attacks after a reconnect.
  if (context.state !== "running") { resumeContext(); return; }
  const now = context.currentTime;
  if (now - (lastPlayed.get(name) ?? -Infinity) < 0.06 || voices.size + notes.length > 24) return;
  lastPlayed.set(name, now);
  let at = now;
  try {
    for (const [frequency, duration, type = "square", strength = 0.24] of notes) {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, at);
      envelope.gain.setValueAtTime(0, at);
      envelope.gain.linearRampToValueAtTime(strength, at + 0.006);
      envelope.gain.exponentialRampToValueAtTime(0.001, at + duration);
      oscillator.connect(envelope);
      envelope.connect(master);
      voices.add(oscillator);
      oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); envelope.disconnect(); };
      oscillator.start(at);
      oscillator.stop(at + duration + 0.01);
      at += duration;
    }
  } catch { stopSounds(); }
}

export function setupAudio() {
  if (initialized) return;
  initialized = true;
  document.addEventListener("pointerdown", unlockAudio, true);
  document.addEventListener("keydown", unlockAudio, true);
  document.addEventListener("click", event => {
    const button = event.target.closest?.("button");
    if (button && !button.disabled) playSound("click");
  }, true);
  document.addEventListener("visibilitychange", () => { if (document.hidden) stopSounds(); });
  window.addEventListener("pagehide", stopSounds);
  window.addEventListener("pagehide",()=>setMusicScene(null));
  window.addEventListener("storage", event => {
    if (event.key !== STORAGE_KEY) return;
    settings = readSettings();
    if (master) master.gain.setValueAtTime(settings.enabled ? settings.volume : 0, context.currentTime);
    if (!settings.enabled || settings.volume === 0) stopSounds();
    refreshControls();
  });
  document.getElementById("soundEnabled")?.addEventListener("change", event => {
    setAudioSettings({ enabled: event.target.checked });
    unlockAudio(event);
    playSound("correct");
  });
  document.getElementById("soundVolume")?.addEventListener("input", event => {
    setAudioSettings({ volume: Number(event.target.value) / 100 });
  });
  document.getElementById("soundVolume")?.addEventListener("change", () => playSound("correct"));
  document.getElementById("soundTest")?.addEventListener("click", () => playSound("victory"));
  refreshControls();
}
