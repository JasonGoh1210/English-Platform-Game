(() => {
  "use strict";
  const form = document.querySelector("[data-account-form]");
  if (!form) return;
  const registration = form.dataset.accountForm === "register";
  const username = form.querySelector("[name=username]"), password = form.querySelector("[name=password]");
  const confirm = form.querySelector("[name=confirm_password]"), email = form.querySelector("[name=email]");
  const status = document.getElementById("usernameStatus"), caps = document.getElementById("capsLockHint");
  const touched = new Set();
  let checkTimer, controller, sequence = 0, availability = null;
  form.noValidate = true;
  const normalized = () => username.value.trim().toLowerCase();
  function field(input, error, show) {
    input.setCustomValidity(error);
    input.setAttribute("aria-invalid", String(Boolean(error && show)));
    const id = input === confirm ? "confirmError" : `${input.name}Error`;
    const element = document.getElementById(id);
    if (element) { element.textContent = error && show ? error : ""; element.hidden = !error || !show; }
    return !error;
  }
  function usernameError() {
    const value = normalized();
    if (!value) return "请输入用户名。";
    if (!registration) return value.length > 50 ? "用户名最多50个字符。" : "";
    if (!/^[a-z0-9_.-]{3,30}$/.test(value)) return "用户名需为3–30位，只能包含英文字母、数字、点、横线或下划线。";
    if (availability?.username === value && !availability.available) return "这个用户名已被使用，请换一个（不区分英文字母大小写）。";
    return "";
  }
  function passwordError() {
    const value = password.value;
    if (!value) return "请输入密码。";
    if (!registration) return new TextEncoder().encode(value).length > 4096 ? "密码输入过长，请检查后重试。" : "";
    if (value.includes("\0")) return "密码包含无法使用的字符，请重新输入。";
    if (new TextEncoder().encode(value).length > 72) return "密码太长，请减少字符；英文和数字最多72位。";
    if (Array.from(value).length < 8) return "密码至少需要8个字符。";
    if (!/[A-Z]/.test(value)) return "密码至少需要1个大写英文字母（A–Z）。";
    if (!/[0-9]/.test(value)) return "密码至少需要1个数字（0–9）。";
    return "";
  }
  function validate(input, show = touched.has(input)) {
    let error = "";
    if (input === username) error = usernameError();
    else if (input === password) error = passwordError();
    else if (input === confirm) error = !input.value ? "请再输入一次密码。" : input.value !== password.value ? "两次输入的密码不一致。" : "";
    else if (input === email && input.value) {
      error = input.validity.typeMismatch || new TextEncoder().encode(input.value).length > 120 ? "请输入有效的电子邮件地址，或把此栏留空。" : "";
    }
    return field(input, error, show);
  }
  function passwordRules() {
    const value = password.value;
    const rules = { length: Array.from(value).length >= 8, uppercase: /[A-Z]/.test(value), digit: /[0-9]/.test(value) };
    form.querySelectorAll("[data-password-rule]").forEach(item => { item.dataset.met = String(rules[item.dataset.passwordRule]); });
  }
  function scheduleUsernameCheck() {
    clearTimeout(checkTimer); controller?.abort(); sequence++; availability = null;
    if (!registration || !status) return;
    status.textContent = ""; status.dataset.state = "";
    if (usernameError()) return;
    const value = normalized(), current = sequence;
    checkTimer = setTimeout(async () => {
      controller = new AbortController();
      const active = controller, timeout = setTimeout(() => active.abort(), 6000);
      status.textContent = "正在检查用户名……";
      try {
        const response = await fetch("/FYP/api/check_username.php", { method: "POST", credentials: "same-origin", cache: "no-store", signal: active.signal,
          headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: value, csrfToken: form.querySelector("[name=csrf_token]").value }) });
        const data = await response.json();
        if (current !== sequence || normalized() !== value) return;
        if (!response.ok || !data.ok || data.username !== value || typeof data.available !== "boolean") throw new Error("Unavailable");
        availability = { username: value, available: data.available };
        status.textContent = data.available ? "✓ 这个用户名可以使用，提交时会再次确认。" : "";
        status.dataset.state = data.available ? "available" : "";
        validate(username, true);
      } catch {
        if (current === sequence) { status.textContent = "暂时无法检查，提交时会再次确认。"; status.dataset.state = ""; }
      } finally { clearTimeout(timeout); }
    }, 400);
  }
  for (const input of [username, password, confirm, email].filter(Boolean)) {
    input.addEventListener("input", () => {
      if (input === username) scheduleUsernameCheck();
      validate(input);
      if (input === password) { passwordRules(); if (confirm?.value) validate(confirm, true); }
    });
    input.addEventListener("blur", () => {
      touched.add(input);
      if (input === username) input.value = normalized();
      if (input === email) input.value = input.value.trim();
      validate(input, true);
    });
  }
  form.querySelectorAll("[data-password-toggle]").forEach(button => button.addEventListener("click", () => {
    const input = document.getElementById(button.dataset.passwordToggle), reveal = input.type === "password";
    input.type = reveal ? "text" : "password";
    button.textContent = reveal ? "隐藏" : "显示";
    button.setAttribute("aria-pressed", String(reveal));
    button.setAttribute("aria-label", `${reveal ? "隐藏" : "显示"}${input === confirm ? "确认密码" : "密码"}`);
    input.focus({ preventScroll: true });
  }));
  if (caps) {
    const warn = event => { caps.textContent = event.getModifierState?.("CapsLock") ? "大写锁定已开启，请注意密码大小写。" : ""; };
    password.addEventListener("keydown", warn); password.addEventListener("keyup", warn);
    password.addEventListener("blur", () => { caps.textContent = ""; });
  }
  form.addEventListener("submit", event => {
    username.value = normalized();
    if (email) email.value = email.value.trim();
    const inputs = [username, password, confirm, email].filter(Boolean);
    const results = inputs.map(input => { touched.add(input); return validate(input, true); });
    if (results.some(valid => !valid)) {
      event.preventDefault(); inputs[results.indexOf(false)].focus(); form.reportValidity();
    }
  });
  passwordRules();
  form.querySelector('[aria-invalid="true"]')?.focus();
})();
