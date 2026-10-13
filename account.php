<?php
declare(strict_types=1);
require_once __DIR__.'/includes/auth.php';
header('Cross-Origin-Opener-Policy: same-origin-allow-popups');
epq_require_login_page();
$stmt=epq_db()->prepare('SELECT google_sub FROM users WHERE user_id=?');
$userId=(int)$_SESSION['user_id'];$stmt->bind_param('i',$userId);$stmt->execute();$account=$stmt->get_result()->fetch_assoc();
$linked=!empty($account['google_sub']);
?>
<!DOCTYPE html><html lang="zh-CN"><head>
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23101521'/%3E%3Cpath d='M16 4 20 12 28 16 20 20 16 28 12 20 4 16 12 12Z' fill='%23e6ca8b'/%3E%3C/svg%3E">
  <meta name="referrer" content="no-referrer-when-downgrade">
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>账号设置 · English Power Quest</title><link rel="stylesheet" href="/FYP/css/auth.css?v=20261013-characters1">
</head><body class="auth-page"><main class="auth-layout">
  <section class="auth-art"><div class="auth-brand"><span class="auth-brand-mark">✦</span> ENGLISH POWER QUEST</div>
    <div class="auth-art-copy"><p class="auth-kicker">KEEP YOUR ADVENTURE</p><h1>你的角色，<br><em>一直陪着你。</em></h1><p>绑定登录方式，继续同一个角色的旅程。</p></div>
  </section>
  <section class="auth-panel"><a class="auth-back" href="/FYP/index.php">返回游戏 ↗</a><div class="auth-panel-inner">
    <p class="auth-kicker">YOUR ACCOUNT</p><h2>账号设置</h2>
    <p class="auth-subtitle">当前角色：<?= epq_h((string)$_SESSION['display_name']) ?></p>
    <?php if ($linked): ?><p class="account-linked">✓ 已绑定 Google，下次可以使用 Google 登录。</p>
    <?php else: ?><p>绑定 Google 会保留当前角色的名字、外观、等级与存档。</p>
    <?php $epqGoogleMode='link';require __DIR__.'/includes/google_button.php'; ?>
    <?php endif; ?>
    <?php if (epq_is_guest()): ?><p class="auth-footnote"><a href="/FYP/register.php">也可以设置账号密码，升级游客账号</a></p><?php endif; ?>
  </div></section>
</main></body></html>
