<?php
declare(strict_types=1);
require_once __DIR__ . '/includes/auth.php';
epq_redirect_if_logged_in();

$error = '';
$username = '';
$displayName = '';
$email = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = strtolower(trim((string)($_POST['username'] ?? '')));
    $displayName = trim((string)($_POST['display_name'] ?? ''));
    $email = strtolower(trim((string)($_POST['email'] ?? '')));
    $password = (string)($_POST['password'] ?? '');
    $confirm = (string)($_POST['confirm_password'] ?? '');
    $csrf = (string)($_POST['csrf_token'] ?? '');

    if (!epq_csrf_is_valid($csrf)) {
        $error = '页面已过期，请刷新后再试。';
    } elseif (!preg_match('/^[a-z0-9_.-]{3,30}$/', $username)) {
        $error = '用户名需要 3–30 个字符，只能使用英文字母、数字、点、横线或下划线。';
    } elseif ($displayName === '' || strlen($displayName) > 200) {
        $error = '请输入角色名称（最多 50 个字符）。';
    } elseif ($email !== '' && (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 120)) {
        $error = '请输入有效的电子邮件地址，或把此栏留空。';
    } elseif (strlen($password) < 8) {
        $error = '密码至少需要 8 个字符。';
    } elseif ($password !== $confirm) {
        $error = '两次输入的密码不一致。';
    } else {
        try {
            $db = epq_db();
            $worldResult = $db->query("SELECT world_id FROM worlds WHERE is_active = 1 ORDER BY world_order ASC LIMIT 1");
            $worldRow = $worldResult ? $worldResult->fetch_assoc() : null;
            if (!$worldRow) {
                throw new RuntimeException('No active world exists in the database. Import the schema and starter data first.');
            }
            $worldId = (int)$worldRow['world_id'];

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

                    $playerInsert = $db->prepare(
                        "INSERT INTO players (user_id, display_name, level_no, xp_total, coins_total, skill_points_total, current_world_id, story_intro_seen)
                         VALUES (?, ?, 1, 0, 0, 0, ?, 0)"
                    );
                    $playerInsert->bind_param('isi', $userId, $displayName, $worldId);
                    if (!$playerInsert->execute()) throw new RuntimeException('Unable to create player profile.');
                    $playerId = (int)$db->insert_id;

                    $worldProgress = $db->prepare(
                        "INSERT INTO player_world_progress (player_id, world_id, status, unlocked_at)
                         VALUES (?, ?, 'UNLOCKED', CURRENT_TIMESTAMP)"
                    );
                    $worldProgress->bind_param('ii', $playerId, $worldId);
                    if (!$worldProgress->execute()) throw new RuntimeException('Unable to initialize world progress.');

                    $skills = $db->prepare(
                        "INSERT INTO player_english_stats (player_id, english_skill_id)
                         SELECT ?, english_skill_id FROM english_skills WHERE is_active = 1"
                    );
                    $skills->bind_param('i', $playerId);
                    if (!$skills->execute()) throw new RuntimeException('Unable to initialize English skills.');

                    $db->commit();

                    epq_authenticate_session([
                        'user_id' => $userId,
                        'player_id' => $playerId,
                        'username' => $username,
                        'display_name' => $displayName
                    ], true);
                    header('Location: /FYP/index.php');
                    exit;
                }
            }
        } catch (Throwable $e) {
            if (isset($db) && $db instanceof mysqli) $db->rollback();
            error_log('[English Power Quest register] ' . $e->getMessage());
            if ($error === '') {
                $error = '注册暂时无法完成。请确认已导入数据库结构、基础种子数据及 database/migrations/002_auth_story_progress.sql。';
            }
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
  <title>创建账号 · English Power Quest</title>
  <link rel="stylesheet" href="/FYP/css/auth.css?v=20261010-authstory1">
</head>
<body class="auth-page">
  <main class="auth-layout auth-layout-register">
    <section class="auth-art" aria-label="English Power Quest fantasy world">
      <div class="auth-art-glow"></div>
      <div class="auth-brand"><span class="auth-brand-mark">✦</span> ENGLISH POWER QUEST</div>
      <div class="auth-art-copy">
        <p class="auth-kicker">A NEW ADVENTURE AWAITS</p>
        <h1>你的故事，<br><em>从这里开始。</em></h1>
        <p>创建角色，观看开场序章，再踏入枫叶镇。每一段英文都能让你变得更强。</p>
      </div>
      <div class="auth-world-tags"><span>NEW CHARACTER</span><span>OPENING STORY</span><span>4 REALMS</span></div>
    </section>

    <section class="auth-panel">
      <a class="auth-back" href="/FYP/login.php">已有账号？登录 <span>↗</span></a>
      <div class="auth-panel-inner">
        <p class="auth-kicker">CREATE YOUR HERO</p>
        <h2>创建账号</h2>
        <p class="auth-subtitle">资料只用于建立你的游戏角色与保存进度。</p>

        <?php if ($error !== ''): ?>
          <div class="auth-alert" role="alert"><?= epq_h($error) ?></div>
        <?php endif; ?>

        <form class="auth-form" method="post" action="/FYP/register.php">
          <input type="hidden" name="csrf_token" value="<?= epq_h((string)$_SESSION['csrf_token']) ?>">
          <label for="display_name">角色名称</label>
          <input id="display_name" name="display_name" type="text" autocomplete="nickname" maxlength="50" value="<?= epq_h($displayName) ?>" placeholder="例如：Alex" required>
          <label for="username">用户名</label>
          <input id="username" name="username" type="text" autocomplete="username" minlength="3" maxlength="30" pattern="[A-Za-z0-9_.-]{3,30}" value="<?= epq_h($username) ?>" placeholder="3–30 个英文字母或数字" required>
          <label for="email">电子邮件 <span class="auth-optional">选填</span></label>
          <input id="email" name="email" type="email" autocomplete="email" maxlength="120" value="<?= epq_h($email) ?>" placeholder="you@example.com">
          <label for="password">密码</label>
          <input id="password" name="password" type="password" autocomplete="new-password" minlength="8" required>
          <label for="confirm_password">确认密码</label>
          <input id="confirm_password" name="confirm_password" type="password" autocomplete="new-password" minlength="8" required>
          <button class="auth-submit" type="submit">创建角色并开始 Story <span>→</span></button>
        </form>
        <p class="auth-smallprint">密码会使用 PHP password_hash 安全哈希储存，不会以明文写入数据库。</p>
      </div>
    </section>
  </main>
</body>
</html>
