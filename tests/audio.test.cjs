const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../js/audio.js"), "utf8").replaceAll("export function", "function");

function fixture({ saved = null, blocked = false, unsupported = false, rejectResume = false } = {}) {
  const storage = new Map(saved ? [["englishPowerQuest.audio.v1", saved]] : []);
  const listeners = new Map(), controls = new Map();
  const contexts = [], tones = [];
  const listen = (key, fn) => { const list = listeners.get(key) || []; list.push(fn); listeners.set(key, list); };
  for (const id of ["soundEnabled", "soundVolume", "soundVolumeValue", "soundTest"]) {
    controls.set(id, { addEventListener: (name, fn) => listen(id + ":" + name, fn) });
  }
  const parameter = () => ({ value: 0, setValueAtTime(value) { this.value = value; }, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  class AudioContext {
    constructor() { this.state = "running"; this.currentTime = 1; this.destination = {}; contexts.push(this); }
    createGain() { return { gain: parameter(), connect() {}, disconnect() {} }; }
    createOscillator() {
      const tone = { frequency: parameter(), connect() {}, disconnect() {}, start() { this.started = true; }, stop() { this.stops = (this.stops || 0) + 1; } };
      tones.push(tone); return tone;
    }
    resume() { if (rejectResume) return Promise.reject(Error("Audio blocked")); this.state = "running"; return Promise.resolve(); }
  }
  const c = {
    localStorage: {
      getItem(key) { if (blocked) throw Error("Storage blocked"); return storage.get(key) ?? null; },
      setItem(key, value) { if (blocked) throw Error("Storage blocked"); storage.set(key, value); }
    },
    document: { hidden: false, getElementById: id => controls.get(id), addEventListener: (name, fn) => listen("document:" + name, fn) },
    window: { AudioContext: unsupported ? undefined : AudioContext, addEventListener: (name, fn) => listen("window:" + name, fn) },
    Promise, console
  };
  vm.createContext(c); vm.runInContext(source, c); c.setupAudio();
  const fire = (key, event = {}) => { for (const fn of listeners.get(key) || []) fn(event); };
  return { c, contexts, tones, storage, controls, listeners, fire, unlock: () => fire("document:pointerdown", {isTrusted:true,type:"pointerdown"}) };
}

test("Page load and synthetic input stay silent; real gestures share one context", () => {
  const f = fixture();
  f.c.playSound("victory");
  f.fire("document:pointerdown", {isTrusted:false,type:"pointerdown"});
  assert.equal(f.contexts.length, 0);
  f.unlock(); f.unlock(); f.c.playSound("correct");
  assert.equal(f.contexts.length, 1);
  assert.ok(f.tones.some(tone => tone.started));
  const count = f.listeners.get("document:pointerdown").length;
  f.c.setupAudio(); assert.equal(f.listeners.get("document:pointerdown").length, count);
});

test("Mute cancels active and scheduled sounds; zero volume and hidden pages are silent", () => {
  const f = fixture(); f.unlock(); f.c.playSound("victory");
  assert.equal(f.tones.length, 5);
  f.c.setAudioSettings({enabled:false});
  assert.ok(f.tones.every(tone => tone.stops === 2));
  f.c.playSound("hurt"); assert.equal(f.tones.length, 5);
  f.c.setAudioSettings({enabled:true,volume:0}); f.c.playSound("heal"); assert.equal(f.tones.length, 5);
  f.c.setAudioSettings({volume:0.5}); f.c.document.hidden = true;
  f.c.playSound("heal"); assert.equal(f.tones.length, 5);
  f.c.document.hidden = false; f.c.playSound("heal"); assert.equal(f.tones.length, 8);
  f.fire("window:pagehide"); assert.ok(f.tones.slice(5).every(tone => tone.stops === 2));
});

test("Settings persist between pages, sync across tabs, and tolerate invalid or blocked storage", () => {
  const f = fixture(); f.c.setAudioSettings({enabled:false,volume:0.62});
  const next = fixture({saved:f.storage.get("englishPowerQuest.audio.v1")});
  assert.equal(next.c.getAudioSettings().enabled, false);
  assert.equal(next.controls.get("soundVolume").value, 62);
  assert.equal(next.controls.get("soundVolume").disabled, true);
  next.storage.set("englishPowerQuest.audio.v1", '{"enabled":true,"volume":0.2}');
  next.fire("window:storage", {key:"englishPowerQuest.audio.v1"});
  assert.equal(next.c.getAudioSettings().volume, 0.2);
  assert.equal(next.controls.get("soundVolume").disabled, false);
  for (const options of [{saved:"invalid JSON"}, {saved:'{"volume":"loud"}'}, {blocked:true}]) {
    const bad = fixture(options); assert.equal(bad.c.getAudioSettings().volume, 0.35);
    assert.doesNotThrow(() => bad.c.setAudioSettings({enabled:false,volume:200}));
    assert.equal(bad.c.getAudioSettings().volume, 1);
  }
});

test("Unsupported audio and rejected resume do not break gameplay or queue stale effects", async () => {
  const absent = fixture({unsupported:true}); absent.unlock();
  assert.doesNotThrow(() => absent.c.playSound("attack"));
  const f = fixture({rejectResume:true}); f.unlock(); f.contexts[0].state = "suspended";
  assert.doesNotThrow(() => f.c.playSound("attack"));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.tones.length, 0);
  f.contexts[0].state = "running"; assert.equal(f.tones.length, 0);
  f.c.playSound("heal"); assert.equal(f.tones.length, 3);
});

test("Rapid repeated clicks are limited and all original effects release their audio nodes", () => {
  const f = fixture(); f.unlock();
  for (let i = 0; i < 100; i++) f.c.playSound("click");
  assert.equal(f.tones.length, 1);
  for (const name of ["correct","wrong","attack","hurt","focus","heal","portal","cave","dialogue","encounter","level","victory","defeat"]) {
    f.contexts[0].currentTime += 1;
    for (const tone of f.tones) tone.onended?.();
    const before = f.tones.length; f.c.playSound(name);
    assert.ok(f.tones.length > before, name);
  }
});
