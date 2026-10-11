// Serialize actions and retry an uncertain response with the SAME request token.
// A replay returns the original receipt without charging/granting rewards again.
let chain = Promise.resolve();
export function battleToken() {
  return crypto.randomUUID().replaceAll("-", "");
}

export function createBattleClient(battleId, csrfToken, reportRetry = () => {}) {
  async function request(payload) {
    for (;;) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch("/FYP/api/battle.php", {
          method: "POST", credentials: "same-origin", signal: controller.signal,
          headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (response.ok && data?.ok) { reportRetry(false); return data; }
        if (response.status < 500 || data?.errorCode === "MIGRATION_REQUIRED") {
          reportRetry(false);
          return { ...data, ok: false, status: response.status };
        }
      } catch { /* A lost response may have committed. Replay the same request. */ }
      finally { clearTimeout(timeout); }
      reportRetry(true);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  return (action, inputs = {}) => {
    const payload = { ...inputs, action, battleId, csrfToken, requestId: battleToken() };
    const result = chain.catch(() => {}).then(() => request(payload));
    chain = result;
    return result;
  };
}
