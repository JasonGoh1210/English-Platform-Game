/* Standalone on purpose: loading must work even if the page module cannot load. */
(() => {
  'use strict';
  const mode = document.currentScript?.dataset.loadingMode || 'page';
  const copy = {
    zh: {title:'准备好下一段冒险', opening:'正在打开页面…', map:'正在读取冒险进度…', battle:'正在准备战斗…', skills:'正在读取技能…', shop:'正在打开商店…', backpack:'正在打开背包…', learning:'正在读取学习记录…', character:'正在准备角色…', assets:'正在准备像素场景…', travel:'正在前往下一页…', hint:'小提示：答对英语题，让你的冒险者变得更强。', failed:'加载暂时遇到问题', failedText:'等待时间较长，请检查连接后重试，或返回页面查看提示。', retry:'重新打开', back:'返回页面'},
    en: {title:'Your next adventure awaits', opening:'Opening the page…', map:'Reading your adventure…', battle:'Preparing your battle…', skills:'Reading your skills…', shop:'Opening the shop…', backpack:'Opening your backpack…', learning:'Reading your learning records…', character:'Preparing your character…', assets:'Preparing pixel scenery…', travel:'Traveling to the next page…', hint:'Adventure tip: correct English answers make your hero stronger.', failed:'Loading needs a little help', failedText:'This is taking longer than expected. Check your connection and retry, or return to the page for details.', retry:'Open again', back:'Return to page'}
  };
  let language = 'zh';
  try { language = localStorage.getItem('englishPowerQuest.language.v1') === 'en' ? 'en' : 'zh'; } catch {}
  const layer = document.createElement('section');
  layer.id = 'epqLoading'; layer.className = 'epq-loading'; layer.tabIndex = -1;
  layer.setAttribute('role', 'dialog'); layer.setAttribute('aria-modal', 'true');
  layer.setAttribute('aria-labelledby', 'epqLoadingTitle');
  layer.setAttribute('aria-describedby', 'epqLoadingStatus');
  layer.innerHTML = '<div class="epq-loading-card"><p class="epq-loading-brand">ENGLISH POWER QUEST</p><div class="epq-loading-portal" aria-hidden="true"><img src="/FYP/images/world/pixel/realm_portal_64.png" alt=""><i class="epq-loading-spark"></i></div><h1 id="epqLoadingTitle"></h1><p class="epq-loading-status" id="epqLoadingStatus" role="status" aria-live="polite"></p><div class="epq-loading-track" aria-hidden="true"><span></span></div><p class="epq-loading-hint"></p><div class="epq-loading-actions" hidden><button type="button" id="epqLoadingRetry"></button><button type="button" id="epqLoadingBack"></button></div></div>';
  document.body.prepend(layer);
  // Requested presentation time; resource readiness can keep the screen open longer.
  const minimumDuration = 2000, portalDuration = 3000;
  let active = false, failed = false, stage = mode, timer, finishTimer, opener, visibleUntil = 0, revision = 0, destinationName;
  const inertBefore = new Map();
  const title = layer.querySelector('h1'), status = layer.querySelector('.epq-loading-status'), hint = layer.querySelector('.epq-loading-hint');
  const actions = layer.querySelector('.epq-loading-actions'), retry = layer.querySelector('#epqLoadingRetry'), back = layer.querySelector('#epqLoadingBack');
  function render() {
    const text = copy[language]; layer.lang = language === 'zh' ? 'zh-CN' : 'en';
    title.textContent = failed ? text.failed : text.title;
    status.textContent = failed ? text.failedText : stage === 'portal'
      ? (language === 'zh' ? '正在穿越传送门…' : 'Traveling through the portal…') + (destinationName ? ' ' + destinationName() : '')
      : text[stage] || text.opening;
    hint.textContent = text.hint; retry.textContent = text.retry; back.textContent = text.back;
    actions.hidden = !failed; layer.dataset.state = failed ? 'error' : 'loading';
  }
  function blockContent() {
    for (const child of document.body.children) {
      if (child === layer || /^(SCRIPT|LINK|STYLE)$/.test(child.tagName)) continue;
      if (!inertBefore.has(child)) inertBefore.set(child, child.inert);
      child.inert = true;
    }
  }
  function begin(next = mode, options = {}) {
    if (!active) opener = document.activeElement;
    revision += 1; clearTimeout(finishTimer);
    destinationName = typeof options.destination === 'function' ? options.destination : null;
    active = true; failed = false; stage = next; layer.hidden = false;
    document.documentElement.classList.add('epq-is-loading'); blockContent(); render();
    layer.focus({preventScroll:true});
    visibleUntil = performance.now() + (next === 'portal' ? portalDuration : minimumDuration);
    clearTimeout(timer); timer = setTimeout(fail, 20000);
    window.dispatchEvent(new CustomEvent('epq-loading-change', {detail:{active:true}}));
  }
  function ready(force = false) {
    if (!active || (stage === 'travel' && !force)) return;
    clearTimeout(finishTimer);
    const remaining = visibleUntil - performance.now(), currentRevision = revision;
    if (!force && !failed && remaining > 0) {
      finishTimer = setTimeout(() => {if (currentRevision === revision) ready();}, remaining);
      return;
    }
    clearTimeout(timer); active = false; failed = false; layer.hidden = true;
    document.documentElement.classList.remove('epq-is-loading');
    for (const [child, inert] of inertBefore) child.inert = inert;
    inertBefore.clear();
    // Keep a meaningful focus chosen by Story/the page, otherwise restore the opener.
    if (layer.contains(document.activeElement) || document.activeElement === document.body) {
      if (opener?.isConnected && opener !== document.body && !opener.inert && opener.getClientRects().length) opener.focus({preventScroll:true});
      else {
        layer.blur();
        const target = document.querySelector('.story-intro-overlay:not(.hidden) button') || document.querySelector('[autofocus], main h1, .game-shell canvas, form input:not([type="hidden"])');
        if (target) { if (!target.matches('input, button, a, select, textarea') && !target.hasAttribute('tabindex')) target.tabIndex = -1; target.focus({preventScroll:true}); }
      }
    }
    window.dispatchEvent(new CustomEvent('epq-loading-change', {detail:{active:false}}));
  }
  function fail() {
    if (!active || failed) return;
    clearTimeout(timer); clearTimeout(finishTimer); failed = true; render(); retry.focus({preventScroll:true});
  }
  function step(next) { if (active && !failed) {stage = next; render();} }
  // Asset failures retain the game's existing fallback art, never an endless spinner.
  function waitForImages(images, timeout = 8000) {
    return Promise.all([...images].filter(Boolean).map(image => new Promise(resolve => {
      if (image.complete) { resolve(); return; }
      let deadline;
      const done = () => { clearTimeout(deadline); image.removeEventListener('load', done); image.removeEventListener('error', done); resolve(); };
      image.addEventListener('load', done); image.addEventListener('error', done);
      deadline = setTimeout(done, timeout);
    })));
  }
  // Battle calls this before START, so presentation time cannot consume a new question's timer.
  function waitForMinimum() { return new Promise(resolve => setTimeout(resolve, Math.max(0, visibleUntil - performance.now()))); }
  window.EPQLoading = {begin, ready, fail, step, waitForImages, waitForMinimum, get active() {return active;}};
  retry.addEventListener('click', () => { window.location.assign(window.location.href); }); // GET, never replay a form POST.
  back.addEventListener('click', () => ready(true));
  window.addEventListener('epq-language-change', event => {language = event.detail?.language === 'en' ? 'en' : 'zh'; render();});
  window.addEventListener('pageshow', event => { if (event.persisted) ready(true); });
  window.addEventListener('keydown', event => {
    if (!active) return;
    const buttons = failed ? [retry, back] : [];
    if (event.key === 'Tab') {
      event.preventDefault();
      const index = buttons.indexOf(document.activeElement);
      if (buttons.length) buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
      else layer.focus({preventScroll:true});
    } else if (!layer.contains(event.target) || !failed) event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  document.addEventListener('focusin', event => {if (active && !layer.contains(event.target)) (failed ? retry : layer).focus({preventScroll:true});});
  const routes = new Set(['index.php','battle.php','skills.php','shop.php','backpack.php','learning.php','character_setup.php','login.php','register.php','logout.php']);
  function localPage(value) {try {const url = new URL(value, location.href); return url.origin === location.origin && url.pathname.startsWith('/FYP/') && routes.has(url.pathname.split('/').pop()) ? url : null;} catch {return null;}}
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const url = localPage(link.href);
    if (url && !(url.pathname === location.pathname && url.search === location.search && url.hash)) begin('travel');
  });
  document.addEventListener('submit', event => {
    const form = event.target;
    if (!event.defaultPrevented && (!form.target || form.target === '_self') && localPage(form.action)) begin('travel');
  });
  begin(mode);
  // Forms need only their own DOM and art; Google/analytics are optional services.
  if (mode === 'page') {
    const complete = () => { step('assets'); void waitForImages(document.querySelectorAll('main img, .auth-shell img'), 3000).then(()=>ready()); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', complete, {once:true});
    else complete();
  }
})();
