const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../js/rpg.js'), 'utf8');
const inputSource = source.slice(source.indexOf('function resetMovementInput()'), source.indexOf('function bindHoldButton('));

function fixture() {
  const handlers = new Map();
  const on = scope => (name, callback) => handlers.set(scope + ':' + name, callback);
  const c = {
    adventure:{isOpen:()=>false},
    keys: new Set(), touch: { left: false, right: false }, settings: false,
    world: { player: { x: 600, vx: 0, walkFrame: 0, walkTimer: 0 }, storyIntroOpen: false,
      typingCaveOpen: false, travelMenu: false, interacting: false, battle: false },
    window: { addEventListener: on('window') },
    document: { hidden: false, addEventListener: on('document') },
    settingsIsOpen: () => c.settings,
    interact: () => { c.interactions++; }, interactions: 0,
    finishStoryIntro: () => { c.storyFinishes++; }, storyFinishes: 0
  };
  vm.createContext(c);
  vm.runInContext(inputSource, c);
  return {
    c,
    emit: (scope, name) => handlers.get(scope + ':' + name)(),
    key: (key, defaultPrevented = false, target = null) => {
      const event = { key, target, defaultPrevented, repeat: false, preventDefault() { this.defaultPrevented = true; } };
      handlers.get('window:keydown')(event);
      return event;
    }
  };
}

test('Map settings keep native Space and arrow actions and never accept movement keys', () => {
  const f = fixture(); f.c.settings = true;
  for (const key of [' ', 'ArrowLeft', 'ArrowRight', 'a', 'd', 'e', 'Enter']) {
    assert.equal(f.key(key).defaultPrevented, false, key);
  }
  assert.equal(f.c.keys.size, 0);
  assert.equal(f.c.interactions, 0);
});

test('Focused toolbar controls keep native Space and Enter without triggering world interactions', () => {
  const f=fixture(),target={closest:selector=>selector==='.map-tool-icons'?{}:null};
  for(const key of [' ','Enter','ArrowRight'])assert.equal(f.key(key,false,target).defaultPrevented,false);
  assert.equal(f.c.interactions,0);assert.equal(f.c.keys.size,0);
});

test('Exploration journal and mini-map keep native keyboard actions without moving the hero',()=>{
  const f=fixture(),target={closest:selector=>selector==='.adventure-hud'?{}:null};
  for(const key of [' ','Enter','ArrowRight'])assert.equal(f.key(key,false,target).defaultPrevented,false);
  assert.equal(f.c.interactions,0);assert.equal(f.c.keys.size,0);
});

test('An Escape consumed by settings does not skip the underlying story', () => {
  const f = fixture(); f.c.world.storyIntroOpen = true;
  f.key('Escape', true);
  assert.equal(f.c.storyFinishes, 0);
});

test('Lost focus, settings and loading transitions release both keyboard and touch movement', () => {
  for (const event of ['blur', 'epq-settings-change', 'epq-loading-change']) {
    const f = fixture(); f.key('ArrowRight');
    f.c.touch.left = true; f.c.touch.right = true;
    Object.assign(f.c.world.player, { vx: 240, walkFrame: 3, walkTimer: 0.15 });
    f.emit('window', event);
    assert.equal(f.c.keys.size, 0);
    assert.deepEqual(f.c.touch, { left: false, right: false });
    assert.deepEqual(f.c.world.player, { x: 600, vx: 0, walkFrame: 0, walkTimer: 0 });
  }
});

test('Hiding the page releases movement while a visible-page notification preserves a fresh press', () => {
  const f = fixture(); f.key('ArrowRight'); f.c.world.player.vx = 240;
  f.emit('document', 'visibilitychange');
  assert.ok(f.c.keys.has('arrowright'));
  f.c.document.hidden = true; f.emit('document', 'visibilitychange');
  assert.equal(f.c.keys.size, 0);
  assert.equal(f.c.world.player.vx, 0);
});

test('Dialogue allows native Space/Enter without queuing movement or re-triggering interaction', () => {
  const f = fixture(); f.c.world.interacting = true;
  for (const key of [' ', 'Enter', 'ArrowRight', 'e']) assert.equal(f.key(key).defaultPrevented, false);
  assert.equal(f.c.keys.size, 0);
  assert.equal(f.c.interactions, 0);
  f.c.world.interacting = false;
  assert.equal(f.key('ArrowRight').defaultPrevented, true);
  assert.ok(f.c.keys.has('arrowright'));
});
