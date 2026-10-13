<?php
declare(strict_types=1);
require_once __DIR__ . '/includes/auth.php';
header('Cross-Origin-Opener-Policy: same-origin-allow-popups');
if (!epq_is_guest()) epq_redirect_if_logged_in();
$isGuestUpgrade = epq_is_guest();

$error = '';
$username = '';
$displayName = $isGuestUpgrade ? (string)($_SESSION['display_name'] ?? '') : 'Adventurer';
$email = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = strtolower(trim((string)($_POST['username'] ?? '')));
    $email = strtolower(trim((string)($_POST['email'] ?? '')));
    $password = (string)($_POST['password'] ?? '');
    $confirm = (string)($_POST['confirm_password'] ?? '');
    $csrf = (string)($_POST['csrf_token'] ?? '');

    if (!epq_csrf_is_valid($csrf)) {
        $error = '页面已过期，请刷新后再试。';
    } elseif (!preg_match('/^[a-z0-9_.-]{3,30}$/', $username)) {
        $error = '用户名需要 3–30 个字符，只能使用英文字母、数字、点、横线或下划线。';
    } elseif ($email !== '' && (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 120)) {
        $error = '请输入有效的电子邮件地址，或把此栏留空。';
    } elseif (strlen($password) < 8) {
        $error = '密码至少需要 8 个字符。';
    } elseif ($password !== $confirm) {
        $error = '两次输入的密码不一致。';
    } else {
        try {
            $db = epq_db();
            if ($isGuestUpgrade) {
                // Upgrade the *existing* account: same user_id and player_id, no lost quests/XP.
                $guestUserId = (int)$_SESSION['user_id'];
                $guestPlayerId = (int)$_SESSION['player_id'];
                $db->begin_transaction();
                $locked = $db->prepare(
                    "SELECT u.user_id,p.display_name FROM users u INNER JOIN players p ON p.user_id=u.user_id
                     WHERE u.user_id = ? AND u.account_type = 'guest' FOR UPDATE"
                );
                $locked->bind_param('i', $guestUserId);
                $locked->execute();
                $guestProfile = $locked->get_result()->fetch_assoc();
                if (!$guestProfile) {
                    throw new RuntimeException('Guest account already upgraded or missing.');
                }
                $passwordHash = password_hash($password, PASSWORD_DEFAULT);
                $emailValue = $email === '' ? null : $email;
                $upgrade = $db->prepare(
                    "UPDATE users SET username = ?, password_hash = ?, email = ?, account_type = 'password'
                     WHERE user_id = ? AND account_type = 'guest'"
                );
                $upgrade->bind_param('sssi', $username, $passwordHash, $emailValue, $guestUserId);
                if (!$upgrade->execute()) throw new RuntimeException('Unable to upgrade guest account: ' . $upgrade->error);
                $displayName = (string)$guestProfile['display_name'];
                $intro = $db->prepare('SELECT story_intro_seen FROM players WHERE player_id = ?');
                $intro->bind_param('i', $guestPlayerId);
                $intro->execute();
                $storyRow = $intro->get_result()->fetch_assoc();
                epq_guest_revoke_tokens($db, $guestUserId);
                $db->commit();
                epq_clear_guest_cookie();
                epq_authenticate_session([
                    'user_id' => $guestUserId,
                    'player_id' => $guestPlayerId,
                    'username' => $username,
                    'display_name' => $displayName
                ], (int)($storyRow['story_intro_seen'] ?? 0) !== 1);
                header('Location: ' . epq_home_url());
                exit;
            }

            $check = $db->prepare("SELECT username FROM users WHERE username = ? LIMIT 1");
            $check->bind_param('s', $username);
            $check->execute();
            if ($check->get_result()->fetch_assoc()) {
                $error = '这个用户名已经被使用，请换一个。';
            } else {
                if ($email !== '') {
                    $emailCheck = $db->prepare("SELECT user_id FROM users WHERE email = ? LIMIT 1");
                    $emailCheck->bind_param('s', $email);
                    $emailCheck->execute();
                    if ($emailCheck->get_result()->fetch_assoc()) {
                        $error = '这个电子邮件已经注册过。';
                    }
                }

                if ($error === '') {
                    $db->begin_transaction();
                    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
                    $emailValue = $email === '' ? null : $email;

                    $userInsert = $db->prepare("INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)");
                    $userInsert->bind_param('sss', $username, $passwordHash, $emailValue);
                    if (!$userInsert->execute()) throw new RuntimeException('Unable to create user account.');
                    $userId = (int)$db->insert_id;

                    $playerId = epq_new_player($db, $userId);

                    $db->commit();

                    epq_authenticate_session([
                        'user_id' => $userId,
                        'player_id' => $playerId,
                        'username' => $username,
                        'display_name' => $displayName
                    ], true);
                    header('Location: ' . epq_home_url());
                    exit;
                }
            }
        } catch (Throwable $e) {
            if (isset($db) && $db instanceof mysqli) $db->rollback();
            error_log('[English Power Quest register] ' . $e->getMessage());
            if ($error === '') {
                $error = '注册暂时无法完成，请确认数据库更新 006 已完成，或更换已使用的用户名与邮箱。';
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23101521'/%3E%3Cpath d='M16 4 20 12 28 16 20 20 16 28 12 20 4 16 12 12Z' fill='%23e6ca8b'/%3E%3C/svg%3E">
  <meta name="referrer" content="no-referrer-when-downgrade">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#101521">
  <title>创建账号 · English Power Quest</title>
  <link rel="stylesheet" href="/FYP/css/auth.css?v=20261013-characters1">
</head>
<body class="auth-page">
  <main class="auth-layout auth-layout-register">
    <section class="auth-art" aria-label="English Power Quest fantasy world">
      <div class="auth-art-glow"></div>
      <div class="auth-brand"><span class="auth-brand-mark">✦</span> ENGLISH POWER QUEST</div>
      <div class="auth-art-copy">
        <p class="auth-kicker">A NEW ADVENTURE AWAITS</p>
        <h1>你的故事，<br><em>从这里开始。</em></h1>
        <p>先创建账号，再选择你的角色。每一段英文都能让你变得更强。</p>
      </div>
      <div class="auth-world-tags"><span>NEW CHARACTER</span><span>OPENING STORY</span><span>4 REALMS</span></div>
    </section>

    <section class="auth-panel">
      <a class="auth-back" href="<?= $isGuestUpgrade ? '/FYP/index.php' : '/FYP/login.php' ?>"><?= $isGuestUpgrade ? '返回游戏' : '已有账号？登录' ?> <span>↗</span></a>
      <div class="auth-panel-inner">
        <p class="auth-kicker">CREATE YOUR ACCOUNT</p>
        <h2><?= $isGuestUpgrade ? '升级游客账号' : '创建账号' ?></h2>
        <p class="auth-subtitle"><?= $isGuestUpgrade ? '保留当前角色的等级、剧情、金币和冒险进度，并设置永久登录密码。' : '首次进入时再选择名字、角色外观与男女。' ?></p>

        <?php if ($error !== ''): ?>
          <div class="auth-alert" role="alert"><?= epq_h($error) ?></div>
        <?php endif; ?>

        <?php $epqGoogleMode=$isGuestUpgrade?"link":"login"; require __DIR__."/includes/google_button.php"; ?>
        <div class="auth-divider"><span>或设置账号密码</span></div>
        <form class="auth-form" method="post" action="/FYP/register.php">
          <input type="hidden" name="csrf_token" value="<?= epq_h((string)$_SESSION['csrf_token']) ?>">
          <label for="username">用户名</label>
          <input id="username" name="username" type="text" autocomplete="username" minlength="3" maxlength="30" pattern="[A-Za-z0-9_.\-]{3,30}" value="<?= epq_h($username) ?>" placeholder="3–30 个英文字母或数字" required>
          <label for="email">电子邮件 <span class="auth-optional">选填</span></label>
          <input id="email" name="email" type="email" autocomplete="email" maxlength="120" value="<?= epq_h($email) ?>" placeholder="you@example.com">
          <label for="password">密码</label>
          <input id="password" name="password" type="password" autocomplete="new-password" minlength="8" required>
          <label for="confirm_password">确认密码</label>
          <input id="confirm_password" name="confirm_password" type="password" autocomplete="new-password" minlength="8" required>
          <button class="auth-submit" type="submit"><?= $isGuestUpgrade ? '升级并保留存档' : '创建账号并继续' ?> <span>→</span></button>
        </form>
        <p class="auth-smallprint">你的角色与冒险进度会跟随账号保存。</p>
      </div>
    </section>
  </main>
</body>
</html>
