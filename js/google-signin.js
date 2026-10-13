(() => {
  const config=window.EPQ_GOOGLE;
  const container=document.getElementById("googleSignIn"),status=document.getElementById("googleStatus");
  if (!config || !container) return;
  let pending=false;
  async function credential(response) {
    if (pending) return;pending=true;status.textContent="正在登录，请稍候……";
    try {
      const result=await fetch("/FYP/api/google_login.php",{method:"POST",credentials:"same-origin",
        headers:{"Content-Type":"application/json"},body:JSON.stringify({credential:response.credential,csrfToken:config.csrfToken})});
      const data=await result.json();
      if (!result.ok || !data.ok) throw new Error(data.error||"Google 登录暂时无法完成，请刷新后重试。");
      if (!["/FYP/index.php","/FYP/character_setup.php"].includes(data.redirect)) throw new Error("登录暂时无法完成。");
      window.location.href=data.redirect;
    } catch(error) {status.textContent=(error.message||"Google 登录暂时无法完成。")+" 请刷新页面后重试，或使用账号／游客继续。";pending=false;}
  }
  const sdk=document.createElement("script");sdk.src="https://accounts.google.com/gsi/client";sdk.async=true;
  sdk.onload=()=>{
    try {
      google.accounts.id.initialize({client_id:config.clientId,nonce:config.nonce,callback:credential,auto_select:false});
      container.replaceChildren();
      google.accounts.id.renderButton(container,{theme:"outline",size:"large",text:"continue_with",locale:"zh_CN",
        width:Math.min(400,Math.max(220,Math.floor(container.clientWidth)))});
      status.textContent="使用 Google 账号继续，角色与进度会保存在游戏中。";
    } catch {status.textContent="Google 登录暂时无法加载，请使用账号或游客。";}
  };
  sdk.onerror=()=>{status.textContent="Google 登录暂时无法加载，请使用账号或游客。";};
  document.head.appendChild(sdk);
})();
