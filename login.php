<?php
declare(strict_types=1);
require_once __DIR__ . '/includes/auth.php';
epq_redirect_if_logged_in();

$error = '';
$username = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && (string)($_POST['guest_mode'] ?? '') === '1') {
    $csrf = (string)($_POST['csrf_token'] ?? '');
    if (!epq_csrf_is_valid($csrf)) {
        $error = '页面已过期，请刷新后再试。';
    } else {
        session_regenerate_id(true);
        unset($_SESSION['user_id'], $_SESSION['player_id'], $_SESSION['username']);
        $_SESSION['guest_mode'] = true;
        $_SESSION['guest_id'] = 'guest_' . bin2hex(random_bytes(12));
        $_SESSION['display_name'] = 'Guest Adventurer';
        $_SESSION['show_story_intro'] = false;
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        header('Location: /FYP/index.php');
        exit;
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = strtolower(trim((string)($_POST['username'] ?? '')));
    $password = (string)($_POST['password'] ?? '');
    $csrf = (string)($_POST['csrf_token'] ?? '');

    if (!epq_csrf_is_valid($csrf)) {
        $error = '页面已过期，请刷新后再试。';
    } elseif ($username === '' || $password === '') {
        $error = '请输入用户名和密码。';
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
                header('Location: /FYP/index.php');
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
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#101521">
  <title>登录 · English Power Quest</title>
  <link rel="stylesheet" href="/FYP/css/auth.css?v=20261010-authstory1">
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

        <form class="auth-form" method="post" action="/FYP/login.php">
          <input type="hidden" name="csrf_token" value="<?= epq_h((string)$_SESSION['csrf_token']) ?>">
          <label for="username">用户名</label>
          <input id="username" name="username" type="text" autocomplete="username" maxlength="50" value="<?= epq_h($username) ?>" required autofocus>
          <label for="password">密码</label>
          <input id="password" name="password" type="password" autocomplete="current-password" required>
          <button class="auth-submit" type="submit">登录游戏 <span>→</span></button>
        </form>

        <div class="auth-divider"><span>或</span></div>
        <form class="auth-guest-form" method="post" action="/FYP/login.php">
          <input type="hidden" name="csrf_token" value="<?= epq_h((string)$_SESSION['csrf_token']) ?>">
          <input type="hidden" name="guest_mode" value="1">
          <button class="auth-guest-button" type="submit">
            <span class="auth-guest-icon" aria-hidden="true">◇</span>
            <span><strong>以游客身份游玩</strong><small>无需注册 · 进度只保存在此浏览器</small></span>
            <span class="auth-guest-arrow" aria-hidden="true">→</span>
          </button>
        </form>

        <p class="auth-footnote">第一次来到这里？<a href="/FYP/register.php">创建账号</a>，开始你的序章 Story。</p>
        <p class="auth-smallprint">你的角色等级、金币和冒险进度会跟随账号保存。</p>
      </div>
    </section>
  </main>
</body>
</html>
