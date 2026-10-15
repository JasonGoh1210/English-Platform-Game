<?php
declare(strict_types=1);
require_once __DIR__.'/includes/auth.php';
require_once __DIR__.'/includes/account_rules.php';
epq_auth_page_headers();
if(!epq_is_guest())epq_redirect_if_logged_in();
$isGuestUpgrade=epq_is_guest();
$error='';$fieldErrors=[];$username='';$email='';
$displayName=$isGuestUpgrade?(string)($_SESSION['display_name']??''):'Adventurer';
if($_SERVER['REQUEST_METHOD']==='POST'){
    $username=strtolower(trim(epq_form_text($_POST,'username')));
    $email=strtolower(trim(epq_form_text($_POST,'email')));
    $password=epq_form_text($_POST,'password');$confirm=epq_form_text($_POST,'confirm_password');
    if(!epq_csrf_is_valid(epq_form_text($_POST,'csrf_token'))){
        http_response_code(403);$error='页面已过期，请刷新后再试。';
    }else{
        $fieldErrors['username']=epq_username_error($username);
        $fieldErrors['email']=$email!==''&&(!filter_var($email,FILTER_VALIDATE_EMAIL)||strlen($email)>120)?'请输入有效的电子邮件地址，或把此栏留空。':'';
        $fieldErrors['password']=epq_new_password_error($password);
        $fieldErrors['confirm_password']=$confirm===''?'请再输入一次密码。':($password!==$confirm?'两次输入的密码不一致。':'');
        $fieldErrors=array_filter($fieldErrors,static fn($value)=>$value!=='');
        if($fieldErrors){http_response_code(400);$error='请检查下方标出的内容。';}
        else{
            try{
                $db=epq_db();mysqli_report(MYSQLI_REPORT_ERROR|MYSQLI_REPORT_STRICT);
                $conflict=epq_account_conflict($db,$username,$email,$isGuestUpgrade?(int)$_SESSION['user_id']:null);
                if($conflict){
                    $fieldErrors[$conflict['field']]=$conflict['message'];
                    throw new DomainException($conflict['message']);
                }
                $db->begin_transaction();
                $passwordHash=password_hash($password,PASSWORD_DEFAULT);$emailValue=$email===''?null:$email;
                if($isGuestUpgrade){
                    // Keep the existing owner, player, saves, inventory and balances.
                    $userId=(int)$_SESSION['user_id'];$playerId=(int)$_SESSION['player_id'];
                    $locked=$db->prepare("SELECT p.display_name,p.story_intro_seen FROM users u INNER JOIN players p ON p.user_id=u.user_id
                        WHERE u.user_id=? AND p.player_id=? AND u.account_type='guest' FOR UPDATE");
                    $locked->bind_param('ii',$userId,$playerId);$locked->execute();$profile=$locked->get_result()->fetch_assoc();
                    if(!$profile)throw new DomainException('当前游客账号状态已变化，请刷新后重试。');
                    $upgrade=$db->prepare("UPDATE users SET username=?,password_hash=?,email=?,account_type='password' WHERE user_id=? AND account_type='guest'");
                    $upgrade->bind_param('sssi',$username,$passwordHash,$emailValue,$userId);$upgrade->execute();
                    $displayName=(string)$profile['display_name'];$showStory=(int)$profile['story_intro_seen']!==1;
                    epq_guest_revoke_tokens($db,$userId);
                }else{
                    $insert=$db->prepare('INSERT INTO users(username,password_hash,email) VALUES (?,?,?)');
                    $insert->bind_param('sss',$username,$passwordHash,$emailValue);$insert->execute();$userId=(int)$db->insert_id;
                    $playerId=epq_new_player($db,$userId);$showStory=true;
                }
                $db->commit();
                if($isGuestUpgrade)epq_clear_guest_cookie();
                epq_authenticate_session(['user_id'=>$userId,'player_id'=>$playerId,'username'=>$username,'display_name'=>$displayName],$showStory);
                header('Location: '.epq_home_url());exit;
            }catch(Throwable $e){
                if(isset($db)&&$db instanceof mysqli)$db->rollback();
                if($e instanceof DomainException){http_response_code(409);$error=$e->getMessage();}
                elseif($e instanceof mysqli_sql_exception&&$e->getCode()===1062){
                    // The unique database keys also protect simultaneous submissions.
                    http_response_code(409);$error='用户名或邮箱刚被使用，请检查后重试。';
                    try{$conflict=epq_account_conflict($db,$username,$email,$isGuestUpgrade?(int)$_SESSION['user_id']:null);
                        if($conflict){$fieldErrors[$conflict['field']]=$conflict['message'];$error=$conflict['message'];}
                    }catch(Throwable $lookupError){error_log('[EPQ account conflict] '.get_class($lookupError));}
                }else{
                    http_response_code(503);$error='注册暂时无法完成，请稍后重试。';
                    error_log('[EPQ registration] '.get_class($e));
                }
            }
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
  <title>创建账号 · English Power Quest</title>
  <link rel="stylesheet" href="/FYP/css/auth.css?v=20261015-input1">
  <script src="/FYP/js/auth-form.js?v=20261015-input1" defer></script>
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
        <form class="auth-form" data-account-form="register" method="post" action="/FYP/register.php">
          <input type="hidden" name="csrf_token" value="<?= epq_h((string)$_SESSION['csrf_token']) ?>">
          <label for="username">用户名</label>
          <input id="username" name="username" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" minlength="3" maxlength="30" pattern="[A-Za-z0-9_.\-]{3,30}" value="<?= epq_h($username) ?>" placeholder="例如：MapleHero_01" aria-describedby="usernameHint usernameStatus usernameError" aria-invalid="<?= isset($fieldErrors['username'])?'true':'false' ?>" required>
          <p class="auth-input-hint" id="usernameHint">3–30位英文字母、数字或 . _ -；用户名不能重复，不区分字母大小写。</p>
          <p class="auth-field-status" id="usernameStatus" role="status" aria-live="polite"></p>
          <p class="auth-field-error" id="usernameError" <?= isset($fieldErrors['username'])?'':'hidden' ?>><?= epq_h($fieldErrors['username']??'') ?></p>
          <label for="email">电子邮件 <span class="auth-optional">选填</span></label>
          <input id="email" name="email" type="email" autocomplete="email" maxlength="120" value="<?= epq_h($email) ?>" placeholder="you@example.com" aria-describedby="emailHint emailError" aria-invalid="<?= isset($fieldErrors['email'])?'true':'false' ?>">
          <p class="auth-input-hint" id="emailHint">可以留空；填写时请使用有效且尚未注册的邮箱。</p>
          <p class="auth-field-error" id="emailError" <?= isset($fieldErrors['email'])?'':'hidden' ?>><?= epq_h($fieldErrors['email']??'') ?></p>
          <label for="password">密码</label>
          <div class="auth-password-field"><input id="password" name="password" type="password" autocomplete="new-password" minlength="8" maxlength="72" placeholder="至少8位，包含大写字母和数字" aria-describedby="passwordHint passwordRules passwordError" aria-invalid="<?= isset($fieldErrors['password'])?'true':'false' ?>" required><button type="button" class="auth-password-toggle" data-password-toggle="password" aria-controls="password" aria-pressed="false" aria-label="显示密码">显示</button></div>
          <p class="auth-input-hint" id="passwordHint">大写英文字母和数字都必须有，符号可选；英文和数字最多72位。</p>
          <ul class="auth-password-rules" id="passwordRules" aria-label="密码要求"><li data-password-rule="length">至少8个字符</li><li data-password-rule="uppercase">至少1个大写字母 A–Z</li><li data-password-rule="digit">至少1个数字 0–9</li></ul>
          <p class="auth-field-error" id="passwordError" <?= isset($fieldErrors['password'])?'':'hidden' ?>><?= epq_h($fieldErrors['password']??'') ?></p>
          <label for="confirm_password">确认密码</label>
          <div class="auth-password-field"><input id="confirm_password" name="confirm_password" type="password" autocomplete="new-password" minlength="8" maxlength="72" placeholder="再次输入相同密码" aria-describedby="confirmHint confirmError" aria-invalid="<?= isset($fieldErrors['confirm_password'])?'true':'false' ?>" required><button type="button" class="auth-password-toggle" data-password-toggle="confirm_password" aria-controls="confirm_password" aria-pressed="false" aria-label="显示确认密码">显示</button></div>
          <p class="auth-input-hint" id="confirmHint">两次输入的密码必须完全一致，包含大小写。</p>
          <p class="auth-field-error" id="confirmError" <?= isset($fieldErrors['confirm_password'])?'':'hidden' ?>><?= epq_h($fieldErrors['confirm_password']??'') ?></p>
          <button class="auth-submit" type="submit"><?= $isGuestUpgrade ? '升级并保留存档' : '创建账号并继续' ?> <span>→</span></button>
        </form>
        <p class="auth-smallprint">你的角色与冒险进度会跟随账号保存。</p>
      </div>
    </section>
  </main>
</body>
</html>
