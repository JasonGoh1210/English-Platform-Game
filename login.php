<?php
declare(strict_types=1);
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__.'/includes/account_rules.php';
epq_auth_page_headers();
epq_redirect_if_logged_in();

$error = '';
$username = '';
$fieldErrors=[];


if ($_SERVER['REQUEST_METHOD'] === 'POST' && epq_form_text($_POST,'guest_mode') === '1') {
    $csrf = epq_form_text($_POST,'csrf_token');
    if (!epq_csrf_is_valid($csrf)) {
        $error = '页面已过期，请刷新后再试。';
    } else {
        try {
            $db = epq_db();
            $guestPlayer = epq_create_guest_player($db);
            epq_guest_start_session($guestPlayer);
            header('Location: ' . epq_home_url());
            exit;
        } catch (Throwable $e) {
            error_log('[English Power Quest guest registration] ' . $e->getMessage());
            $error = '暂时无法创建新角色，请确认数据库更新 006 已完成。现有账号仍可登录。';
        }
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = strtolower(trim(epq_form_text($_POST,'username')));
    $password = epq_form_text($_POST,'password');
    $csrf = epq_form_text($_POST,'csrf_token');

    if (!epq_csrf_is_valid($csrf)) {
        $error = '页面已过期，请刷新后再试。';
    } elseif ($username === '' || $password === '') {
        $error = '请输入用户名和密码。';
        if($username==='')$fieldErrors['username']='请输入注册时的用户名。';
        if($password==='')$fieldErrors['password']='请输入密码。';
    } elseif(strlen($username)>50||strlen($password)>4096){
        $error='输入内容过长，请检查用户名或密码。';
    } else {
        try {
            $db = epq_db();
            $stmt = $db->prepare(
                "SELECT u.user_id, u.username, u.password_hash,
                        p.player_id, p.display_name, p.story_intro_seen
                 FROM users u
                 INNER JOIN players p ON p.user_id = u.user_id
                 WHERE u.username = ?
                 LIMIT 1"
            );
            if (!$stmt) throw new RuntimeException('Unable to prepare login query.');
            $stmt->bind_param('s', $username);
            $stmt->execute();
            $row = $stmt->get_result()->fetch_assoc();

            if (!$row || empty($row['password_hash']) || !password_verify($password, (string)$row['password_hash'])) {
                $error = '用户名或密码不正确。';
            } else {
                epq_authenticate_session($row, (int)$row['story_intro_seen'] !== 1);
                header('Location: ' . epq_home_url());
                exit;
            }
        } catch (Throwable $e) {
            error_log('[English Power Quest login] ' . $e->getMessage());
            $error = '登录暂时无法完成。请确认已导入数据库结构及 database/migrations/002_auth_story_progress.sql。';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23101521'/%3E%3Cpath d='M16 4 20 12 28 16 20 20 16 28 12 20 4 16 12 12Z' fill='%23e6ca8b'/%3E%3C/svg%3E">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#101521">
  <title>登录 · English Power Quest</title>
  <link rel="stylesheet" href="/FYP/css/auth.css?v=20261015-input1">
  <script src="/FYP/js/auth-form.js?v=20261015-input1" defer></script>
  <?php require __DIR__.'/includes/loading_screen.php'; ?>
</head>
<body class="auth-page">
  <main class="auth-layout">
    <section class="auth-art" aria-label="English Power Quest fantasy world">
      <div class="auth-art-glow"></div>
      <div class="auth-brand"><span class="auth-brand-mark">✦</span> ENGLISH POWER QUEST</div>
      <div class="auth-art-copy">
        <p class="auth-kicker">YOUR NEXT CHAPTER BEGINS</p>
        <h1>进入一个<br><em>会成长的世界。</em></h1>
        <p>探索奇幻世界、认识角色、挑战英文任务，让每一次学习都成为冒险的一部分。</p>
      </div>
      <div class="auth-world-tags"><span>4 REALMS</span><span>STORY RPG</span><span>LEARN & GROW</span></div>
    </section>

    <section class="auth-panel">
      <a class="auth-back" href="/FYP/register.php">创建新账号 <span>↗</span></a>
      <div class="auth-panel-inner">
        <p class="auth-kicker">WELCOME BACK, ADVENTURER</p>
        <h2>欢迎回来</h2>
        <p class="auth-subtitle">登录后继续你的冒险旅程。</p>

        <?php if ($error !== ''): ?>
          <div class="auth-alert" role="alert"><?= epq_h($error) ?></div>
        <?php endif; ?>

        <form class="auth-form" data-account-form="login" method="post" action="/FYP/login.php">
          <input type="hidden" name="csrf_token" value="<?= epq_h((string)$_SESSION['csrf_token']) ?>">
          <label for="username">用户名</label>
          <input id="username" name="username" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="50" value="<?= epq_h($username) ?>" placeholder="请输入注册时的用户名" aria-describedby="usernameHint usernameError" aria-invalid="<?= isset($fieldErrors['username'])?'true':'false' ?>" required autofocus>
          <p class="auth-input-hint" id="usernameHint">使用注册时的用户名；英文字母不区分大小写。</p>
          <p class="auth-field-error" id="usernameError" <?= isset($fieldErrors['username'])?'':'hidden' ?>><?= epq_h($fieldErrors['username']??'') ?></p>
          <label for="password">密码</label>
          <div class="auth-password-field"><input id="password" name="password" type="password" autocomplete="current-password" maxlength="4096" placeholder="请输入密码，注意大小写" aria-describedby="passwordHint capsLockHint passwordError" aria-invalid="<?= isset($fieldErrors['password'])?'true':'false' ?>" required><button type="button" class="auth-password-toggle" data-password-toggle="password" aria-controls="password" aria-pressed="false" aria-label="显示密码">显示</button></div>
          <p class="auth-input-hint" id="passwordHint">密码区分大小写，请输入创建账号时设置的密码。</p>
          <p class="auth-field-status" id="capsLockHint" role="status" aria-live="polite"></p>
          <p class="auth-field-error" id="passwordError" <?= isset($fieldErrors['password'])?'':'hidden' ?>><?= epq_h($fieldErrors['password']??'') ?></p>
          <button class="auth-submit" type="submit">登录 <span>→</span></button>
        </form>

        <div class="auth-divider"><span>或</span></div>
        <div class="auth-alternative-logins" aria-label="其他登录方式">
        <?php $epqGoogleMode="login"; require __DIR__."/includes/google_button.php"; ?>
        <form class="auth-guest-form" method="post" action="/FYP/login.php">
          <input type="hidden" name="csrf_token" value="<?= epq_h((string)$_SESSION['csrf_token']) ?>">
          <input type="hidden" name="guest_mode" value="1">
          <button class="auth-guest-button" type="submit">
            <span class="auth-guest-icon" aria-hidden="true">◇</span>
            <span><strong>以游客身份游玩</strong><small>进入后选择名字、角色外观和男女</small></span>
            <span class="auth-guest-arrow" aria-hidden="true">→</span>
          </button>
        </form>
        </div>

        <p class="auth-footnote">第一次来到这里？<a href="/FYP/register.php">创建账号</a>，开始你的序章 Story。</p>
        <p class="auth-smallprint">你的角色等级、金币和冒险进度会跟随账号保存。</p>
      </div>
    </section>
  </main>
</body>
</html>
