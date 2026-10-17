<?php
declare(strict_types=1);
require_once __DIR__.'/includes/auth.php';
epq_require_login_page();
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="icon" href="data:,">
  <title>技能树 · English Power Quest</title>
  <link rel="stylesheet" href="/FYP/css/learning.css?v=20261017-castleroad2">
  <link rel="stylesheet" href="/FYP/css/skills.css?v=20261017-castleroad2">
  <?php $epqLoadingMode = 'skills'; require __DIR__.'/includes/loading_screen.php'; ?>
</head>
<body class="learning-page skills-page">
  <main class="learning-shell">
    <header class="learning-header">
      <div><p class="learning-kicker">ENGLISH POWER QUEST</p><h1 data-i18n="skills.title">技能树</h1><p data-i18n="skills.subtitle">用升级获得的技能点，把正确答案变成更强的攻击。</p></div>
      <div class="learning-navigation">
        <div class="learning-languages"><button type="button" data-set-language="en">English</button><button type="button" data-set-language="zh">简体中文</button></div>
        <a class="learning-button" href="/FYP/index.php" data-i18n="destination.back">返回地图</a>
      </div>
    </header>
    <section class="skills-balances" aria-label="Character progression" data-i18n-aria-label="skills.progression">
      <div class="learning-stat"><span data-i18n="skills.characterLevel">角色等级</span><b id="skillsCharacterLevel">—</b></div>
      <div class="learning-stat skills-point-stat"><span data-i18n="skills.points">可用技能点</span><b id="skillsPoints">—</b></div>
      <div class="learning-stat skills-progress-stat"><span data-i18n="skills.branchProgress">分支进度</span><b id="skillsUnlockedCount">— / 3</b><div class="skills-progress-pips" aria-hidden="true"><i></i><i></i><i></i></div></div>
    </section>
    <p class="learning-note" data-i18n="skills.earn">完成战斗和剧情获得 XP，升级时获得技能点。</p>
    <section class="skills-branch" aria-labelledby="wordPowerTitle">
      <div class="skills-branch-heading"><div><p class="skills-eyebrow" data-i18n="skills.passiveBranch">被动技能 · 永久成长</p><h2 id="wordPowerTitle" data-i18n="skills.wordPower">单词之力</h2></div><span class="skills-branch-mark" aria-hidden="true">A<span>✦</span></span></div>
      <p class="skills-branch-description" data-i18n="skills.description">单词强化：答对词汇题时增加伤害。每次升级替换上一级效果。</p>
      <p class="skill-current-effect" id="skillsCurrentEffect" role="status" aria-live="polite"></p>
      <div class="skills-feedback"><p id="skillsStatus" role="status" aria-live="polite"></p><button type="button" class="learning-button hidden" id="skillsRetry" data-i18n="review.retry">重试</button></div>
      <ol class="skills-tree" id="skillsTree"></ol>
      <details class="skills-help"><summary data-i18n="skills.rulesTitle">解锁规则与生效时机</summary>
      <p class="learning-note" data-i18n="skills.unlockRules">必须按顺序解锁，同时满足角色等级和技能点要求；已解锁的等级不会重复扣点。</p>
      <p class="learning-note" data-i18n="skills.nextBattle">解锁后从下一场战斗生效，可与专注技能一起使用。技能不会替你回答问题，也不会改变学习正确率。</p>
      </details>
    </section>
    <p class="learning-note skills-page-note" data-i18n="skills.confirmHelp">选择一个技能，查看花费后再确认解锁。</p>
    <dialog id="skillsConfirm" aria-labelledby="skillsConfirmTitle" aria-describedby="skillsConfirmText skillsConfirmBalance skillsConfirmEffect">
      <h2 id="skillsConfirmTitle" data-i18n="skills.confirmTitle">解锁单词强化？</h2>
      <p id="skillsConfirmText"></p>
      <p class="skill-confirm-balance" id="skillsConfirmBalance"></p>
      <p class="learning-note" id="skillsConfirmEffect"></p>
      <div class="skills-confirm-actions"><button type="button" id="skillsCancel" data-i18n="skills.cancel">返回</button><button type="button" id="skillsBuy" data-i18n="skills.confirm">确认解锁</button></div>
    </dialog>
  </main>
  <script>window.EPQ_SKILLS = <?= json_encode(['csrfToken'=>(string)$_SESSION['csrf_token']], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;</script>
  <script type="module" src="/FYP/js/skills.js?v=20261017-castleroad2"></script>
</body>
</html>
