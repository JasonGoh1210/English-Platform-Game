<?php
declare(strict_types=1);
require_once __DIR__.'/includes/auth.php';
if (empty($_SESSION['user_id']) || empty($_SESSION['player_id'])) { header('Location: /FYP/login.php'); exit; }
$error = '';
$name = trim((string)($_POST['display_name'] ?? ''));
$appearance = (string)($_POST['appearance'] ?? 'shadow');
$gender = (string)($_POST['gender'] ?? 'male');
$catalog = epq_character_catalog();
try {
    $db = epq_db();
    $profile = epq_character_profile($db, (int)$_SESSION['player_id']);
    if ($profile['complete']) {
        epq_sync_character_session();
        $owner = $db->prepare('SELECT display_name FROM players WHERE player_id = ? AND user_id = ?');
        $owner->bind_param('ii', $_SESSION['player_id'], $_SESSION['user_id']);
        $owner->execute();
        $saved = $owner->get_result()->fetch_assoc();
        if ($saved) $_SESSION['display_name'] = $saved['display_name'];
        header('Location: /FYP/index.php'); exit;
    }
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if (!epq_csrf_is_valid((string)($_POST['csrf_token'] ?? ''))) {
            http_response_code(403); $error = '页面已过期，请刷新后再试。';
        } else {
            $result = epq_complete_character($db, (int)$_SESSION['user_id'], (int)$_SESSION['player_id'], $name, $appearance, $gender);
            session_regenerate_id(true);
            $_SESSION['display_name'] = $result['name'];
            $_SESSION['character'] = $result;
            $_SESSION['character_setup_pending'] = false;
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
            header('Location: /FYP/index.php'); exit;
        }
    }
} catch (DomainException $e) { http_response_code(400); $error = $e->getMessage(); }
catch (Throwable $e) { error_log('[EPQ character setup] '.$e->getMessage()); http_response_code(503); $error = '角色暂时无法保存，请稍后重试。'; }
if (!isset($catalog[$appearance])) $appearance = 'shadow';
if (!in_array($gender,['male','female'],true)) $gender = 'male';
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23101521'/%3E%3Cpath d='M16 4 20 12 28 16 20 20 16 28 12 20 4 16 12 12Z' fill='%23e6ca8b'/%3E%3C/svg%3E">
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#101521"><title>创建你的角色 · English Power Quest</title>
  <link rel="stylesheet" href="/FYP/css/auth.css?v=20261013-female1">
</head>
<body class="auth-page character-page">
  <main class="auth-layout character-layout">
    <section class="auth-art character-art" aria-label="角色预览">
      <div class="auth-brand"><span class="auth-brand-mark">✦</span> ENGLISH POWER QUEST</div>
      <div class="character-stage">
        <span class="auth-kicker">YOUR STORY STARTS WITH YOU</span>
        <canvas width="256" height="288" data-character-preview="" aria-label="所选角色预览"></canvas>
        <h1 id="previewName">你的冒险者</h1><p id="previewStyle">暗影旅人</p>
      </div>
      <p class="character-stage-note">选择属于你的名字与外观，带着英语力量开始冒险。</p>
    </section>
    <section class="auth-panel"><div class="auth-panel-inner">
      <p class="auth-kicker">CREATE YOUR CHARACTER</p><h2>这就是你的角色</h2>
      <p class="auth-subtitle">只需第一次设置。名字和外观会跟随你的存档保存。</p>
      <?php if ($error !== ''): ?><div class="auth-alert" role="alert"><?= epq_h($error) ?></div><?php endif; ?>
      <form class="auth-form" id="characterForm" method="post" action="/FYP/character_setup.php">
        <input type="hidden" name="csrf_token" value="<?= epq_h((string)$_SESSION['csrf_token']) ?>">
        <label for="characterName">角色名字</label>
        <div class="character-name-row">
          <input id="characterName" name="display_name" minlength="2" maxlength="24" value="<?= epq_h($name) ?>" placeholder="为你的角色取个名字" autocomplete="nickname" required>
          <button type="button" id="randomName" class="name-dice" aria-label="随机取一个角色名字" title="随机名字">⚄</button>
        </div>
        <small class="character-input-hint">2–24 个字符 · 点骰子试试随机名字</small>
        <fieldset class="character-fieldset"><legend>角色性别</legend>
          <div class="character-genders">
            <label><input type="radio" name="gender" value="male" <?= $gender==='male'?'checked':'' ?>><span>♂ 男</span></label>
            <label><input type="radio" name="gender" value="female" <?= $gender==='female'?'checked':'' ?>><span>♀ 女</span></label>
          </div>
        </fieldset>
        <fieldset class="character-fieldset"><legend>选择角色外观</legend>
          <div class="character-options">
            <?php foreach ($catalog as $id=>$look): ?>
            <label class="character-option" style="--hero-accent:<?= epq_h($look['accent']) ?>">
              <input type="radio" name="appearance" value="<?= epq_h($id) ?>" <?= $id===$appearance?'checked':'' ?>>
              <span class="character-option-body"><canvas width="96" height="108" data-character-preview="<?= epq_h($id) ?>" aria-hidden="true"></canvas><strong><?= epq_h($look['label']) ?></strong></span>
            </label>
            <?php endforeach; ?>
          </div>
        </fieldset>
        <button class="auth-submit" type="submit" id="createCharacter">保存角色，开始冒险 <span>→</span></button>
      </form>
    </div></section>
  </main>
  <script>window.EPQ_CHARACTER_SETUP = <?= json_encode(['catalog'=>$catalog,'names'=>epq_character_names()],JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT) ?>;</script>
  <script type="module" src="/FYP/js/character-setup.js?v=20261015-village2"></script>
</body>
</html>
