<?php
require_once __DIR__.'/google.php';
$epqGoogleClientId=epq_google_client_id();
$epqGoogleMode=$epqGoogleMode??'login';
$epqGoogleRequest=$epqGoogleClientId!==''?epq_google_request($epqGoogleMode):null;
?>
<div class="google-signin-section">
  <div id="googleSignIn" class="google-signin-container">
    <button type="button" class="google-placeholder" disabled aria-describedby="googleStatus">
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C44.4 38.03 46.98 31.87 46.98 24.55z"/><path fill="#FBBC05" d="M10.53 28.59A14.41 14.41 0 019.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.87 23.87 0 000 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.17 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
      <span><?= $epqGoogleMode==='link'?'绑定 Google，保留当前角色':'使用 Google 登录' ?></span>
    </button>
  </div>
  <p id="googleStatus" class="google-signin-status" role="status"><?= $epqGoogleClientId===''?'Google 登录暂未启用，你可以先使用账号或游客。':'正在准备 Google 登录……' ?></p>
</div>
<?php if ($epqGoogleRequest): ?>
<script>window.EPQ_GOOGLE = <?= json_encode(['clientId'=>$epqGoogleClientId,'nonce'=>$epqGoogleRequest['nonce'],
    'csrfToken'=>(string)$_SESSION['csrf_token']],JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT) ?>;</script>
<script src="/FYP/js/google-signin.js?v=20261013-characters1" defer></script>
<?php endif; ?>
