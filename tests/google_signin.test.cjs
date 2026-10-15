const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../js/google-signin.js'), 'utf8');
const flush = async () => { for (let i = 0; i < 6; i++) await new Promise(resolve => setImmediate(resolve)); };
const reply = (data, ok = true) => ({ ok, json: async () => data });
function fixture({ configured = true, sdkReady = true, fetcher = async () => reply({ ok: true, redirect: '/FYP/index.php' }) } = {}) {
  let callback, resize, initialized = 0, reloaded = 0, now = 1000000;
  const navigations = [], scripts = [], calls = [], timers = new Map(), renders = [];
  let timerId = 0;
  const status = { textContent: '' }, retry = { hidden: true, addEventListener(_, listener) { this.click = listener; } };
  const container = { clientWidth: 180, inert: false, attrs: {}, replaceChildren() {}, setAttribute(key, value) { this.attrs[key] = value; }, querySelector() { return { focus() {} }; } };
  const sdk = { accounts: { id: { initialize(config) { initialized++; callback = config.callback; }, renderButton(_, options) { renders.push(options); } } } };
  const window = { location: { assign(url) { navigations.push(url); }, reload() { reloaded++; } },
    EPQ_GOOGLE: configured ? { clientId: '123-test.apps.googleusercontent.com', nonce: 'nonce', csrfToken: 'csrf', requestId: 'a'.repeat(32), expiresAt: 1600, mode: 'link' } : undefined };
  if (sdkReady) window.google = sdk;
  const context = { window, document: { getElementById(id) { return { googleSignIn: container, googleStatus: status, googleRetry: retry }[id]; },
    createElement() { return { remove() { this.removed = true; } }; }, head: { appendChild(script) { scripts.push(script); } } },
    Date: { now: () => now }, AbortController, encodeURIComponent,
    ResizeObserver: class { constructor(callback) { resize = callback; } observe() {} },
    setTimeout(callback, delay) { timers.set(++timerId, { callback, deadline: now + delay }); return timerId; }, clearTimeout(id) { timers.delete(id); },
    fetch: async (url, options) => { calls.push({ url, options }); return fetcher(url, options); } };
  vm.runInNewContext(source, context);
  return { window, status, retry, container, scripts, calls, renders, navigations,
    initialized: () => initialized, reloaded: () => reloaded, send: value => callback(value), resize: () => resize(),
    installSdk() { window.google = sdk; },
    advance(ms) { now += ms; for (const [id, timer] of [...timers]) if (timer.deadline <= now) { timers.delete(id); timer.callback(); } } };
}
test('Unconfigured Google never downloads SDK or intercepts other login methods', () => {
  const f = fixture({ configured: false }); assert.equal(f.scripts.length, 0); assert.equal(f.initialized(), 0);
});
test('SDK failure and timeout offer retry, ignore late completion, initialize once', () => {
  const f = fixture({ sdkReady: false }); assert.equal(f.scripts[0].src, 'https://accounts.google.com/gsi/client');
  const lateLoad = f.scripts[0].onload; f.advance(15000); assert.equal(f.retry.hidden, false);
  lateLoad(); assert.equal(f.initialized(), 0);
  f.retry.click(); assert.equal(f.scripts.length, 2); f.scripts[1].onerror(); assert.equal(f.retry.hidden, false);
  f.retry.click(); f.installSdk(); f.scripts[2].onload(); assert.equal(f.initialized(), 1);
  f.container.clientWidth = 280; f.resize(); assert.equal(f.initialized(), 1); assert.equal(f.renders.at(-1).width, 280);
});
test('Duplicate callbacks submit once, carry page nonce reference and lock only Google control', async () => {
  let resolve; const f = fixture({ fetcher: () => new Promise(done => { resolve = done; }) });
  const pending = f.send({ credential: 'private-token' }); f.send({ credential: 'duplicate' });
  assert.equal(f.calls.length, 1); assert.equal(f.container.inert, true); assert.equal(f.container.attrs['aria-busy'], 'true');
  assert.deepEqual(JSON.parse(f.calls[0].options.body), { credential: 'private-token', csrfToken: 'csrf', requestId: 'a'.repeat(32) });
  resolve(reply({ ok: true, redirect: '/FYP/character_setup.php' })); await pending;
  assert.deepEqual(f.navigations, ['/FYP/character_setup.php']); assert.equal(f.container.inert, false);
});
test('Lost success response recovers using read-only status, never repeats the credential POST', async () => {
  const f = fixture({ fetcher: async (_, options) => options.method === 'POST'
    ? { ok: true, json: async () => { throw new SyntaxError('Lost response'); } }
    : reply({ ok: true, completed: true, redirect: '/FYP/index.php' }) });
  await f.send({ credential: 'private-token' });
  assert.deepEqual(f.calls.map(call => call.options.method), ['POST', 'GET']); assert.deepEqual(f.navigations, ['/FYP/index.php']);
  assert.equal(f.calls[1].url.includes('private-token'), false); assert.equal(f.calls[1].options.body, undefined);
});
test('Slow POST aborts, checks completion, and leaves an explicit refresh action', async () => {
  const f = fixture({ fetcher: (_, options) => options.method === 'POST'
    ? new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(new Error('Aborted'))))
    : reply({ ok: true, completed: false }) });
  const pending = f.send({ credential: 'private-token' }); f.advance(20000); await pending;
  assert.equal(f.calls.length, 2); assert.equal(f.retry.hidden, false); assert.equal(f.container.inert, false);
  f.retry.click(); assert.equal(f.reloaded(), 1); assert.equal(f.calls.length, 2);
});
test('Expired page and explicit CSRF expiry refresh instead of reusing stale credentials', async () => {
  const f = fixture({ fetcher: async () => reply({ ok: false, errorCode: 'GOOGLE_PAGE_EXPIRED' }, false) });
  await f.send({ credential: 'private-token' }); f.retry.click(); assert.equal(f.reloaded(), 1); assert.equal(f.calls.length, 1);
  const old = fixture(); old.advance(601000); await old.send({ credential: 'private-token' }); assert.equal(old.calls.length, 0); assert.equal(old.retry.hidden, false);
});
test('Account conflict can reselect without sending the rejected credential again', async () => {
  const f = fixture({ fetcher: async () => reply({ ok: false, error: '当前存档仍然保留。', errorCode: 'GOOGLE_REJECTED' }, false) });
  await f.send({ credential: 'private-token' }); assert.equal(f.status.textContent, '当前存档仍然保留。');
  f.retry.click(); assert.equal(f.calls.length, 1); assert.equal(f.reloaded(), 0);
});
test('Server or recovery response cannot navigate to an external address', async () => {
  const f = fixture({ fetcher: async (_, options) => reply(options.method === 'POST'
    ? { ok: true, redirect: 'https://attacker.invalid' } : { ok: true, completed: true, redirect: '//attacker.invalid' }) });
  await f.send({ credential: 'private-token' }); assert.deepEqual(f.navigations, []); assert.equal(f.retry.hidden, false);
});
