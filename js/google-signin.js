(() => {
  "use strict";
  const config = window.EPQ_GOOGLE;
  const container = document.getElementById("googleSignIn");
  const status = document.getElementById("googleStatus");
  const retry = document.getElementById("googleRetry");
  if (!config || !container || !status || !retry) return;
  const endpoint = "/FYP/api/google_login.php";
  const destinations = new Set(["/FYP/index.php", "/FYP/character_setup.php"]);
  let pending = false, initialized = false, sdkLoading = false, lastWidth = 0;
  let retryAction = () => window.location.reload();

  function message(text, action, label = "重试 Google 登录") {
    status.textContent = text;
    retry.hidden = !action;
    if (action) { retryAction = action; retry.textContent = label; }
  }
  function busy(value) {
    pending = value;
    container.inert = value;
    container.setAttribute("aria-busy", String(value));
  }
  function expired() { return Date.now() >= config.expiresAt * 1000; }
  function refresh() {
    message("登录页面已过期，请刷新后重新选择 Google 账号。", () => window.location.reload(), "刷新登录页面");
  }
  function navigate(data) {
    if (!destinations.has(data.redirect)) throw new Error("Invalid destination");
    window.location.assign(data.redirect);
  }
  async function request(url, options, timeout) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { ...options, credentials: "same-origin", cache: "no-store", signal: controller.signal });
      return { response, data: await response.json() };
    } finally { clearTimeout(timer); }
  }
  async function recover() {
    // A lost reply must never cause the credential to be submitted a second time.
    message("正在确认登录结果……");
    try {
      const { response, data } = await request(`${endpoint}?requestId=${encodeURIComponent(config.requestId)}`, { method: "GET" }, 8000);
      if (response.ok && data.ok === true && data.completed === true) { navigate(data); return true; }
    } catch { /* The retry never retains the credential. */ }
    return false;
  }
  function chooseAgain() {
    if (expired()) { refresh(); return; }
    message(config.mode === "link" ? "请重新选择 Google 账号，绑定会保留当前角色与进度。" : "请重新选择 Google 账号继续。");
    container.querySelector("[role=button],button,iframe")?.focus();
  }
  async function credential(response) {
    if (pending) return;
    if (expired()) { refresh(); return; }
    if (typeof response?.credential !== "string" || !response.credential) {
      message("未收到 Google 登录凭证，请重新选择账号。", chooseAgain); return;
    }
    busy(true);
    message(config.mode === "link" ? "正在绑定，请稍候……" : "正在登录，请稍候……");
    let ambiguous = true;
    try {
      const { response: result, data } = await request(endpoint, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential, csrfToken: config.csrfToken, requestId: config.requestId }) }, 20000);
      if (!data || typeof data.ok !== "boolean") throw new Error("Invalid response");
      if (result.ok && data.ok) { navigate(data); return; }
      ambiguous = false;
      if (data.errorCode === "GOOGLE_PAGE_EXPIRED") { refresh(); return; }
      message(typeof data.error === "string" ? data.error : "Google 登录暂时无法完成，请稍后重试。", chooseAgain);
    } catch {
      if (ambiguous && await recover()) return;
      message("网络连接中断，暂时无法确认登录结果。请刷新页面检查，或重新选择账号。", () => window.location.reload(), "刷新并检查登录状态");
    } finally { busy(false); }
  }
  function render() {
    const width = Math.min(400, Math.max(120, Math.floor(container.clientWidth)));
    if (width === lastWidth) return;
    container.replaceChildren();
    window.google.accounts.id.renderButton(container, { theme: "outline", size: "large", text: "continue_with", locale: "zh_CN", width });
    lastWidth = width;
  }
  function ready() {
    if (!initialized) {
      window.google.accounts.id.initialize({ client_id: config.clientId, nonce: config.nonce, callback: credential, auto_select: false });
      initialized = true;
    }
    render();
    message(config.mode === "link" ? "绑定 Google 后，仍然使用当前角色和存档。" : "使用 Google 账号继续，角色与进度会保存在游戏中。");
  }
  function load() {
    if (sdkLoading) return;
    if (expired()) { refresh(); return; }
    if (window.google?.accounts?.id) {
      try { ready(); } catch { message("Google 登录暂时无法显示，请重试。", load); }
      return;
    }
    sdkLoading = true;
    message("正在准备 Google 登录……");
    const sdk = document.createElement("script");
    sdk.src = "https://accounts.google.com/gsi/client";
    sdk.async = true;
    let finished = false;
    function finish(error) {
      if (finished) return;
      finished = true; sdkLoading = false; clearTimeout(timer);
      sdk.onload = null; sdk.onerror = null;
      if (error) {
        sdk.remove();
        message("Google 登录加载失败。请检查网络后重试，也可以使用账号或游客继续。", load);
      } else {
        try { ready(); } catch { message("Google 登录暂时无法显示，请重试。", load); }
      }
    }
    const timer = setTimeout(() => finish(true), 15000);
    sdk.onload = () => finish(false);
    sdk.onerror = () => finish(true);
    document.head.appendChild(sdk);
  }
  retry.addEventListener("click", () => { if (!pending) retryAction(); });
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(() => {
    if (initialized && !pending) {
      try { render(); } catch { message("Google 登录暂时无法显示，请重试。", load); }
    }
  }).observe(container);
  load();
})();
