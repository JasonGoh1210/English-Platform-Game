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
  <title>学习与错题 · English Power Quest</title>
  <link rel="stylesheet" href="/FYP/css/learning.css?v=20261014-skills1">
</head>
<body class="learning-page">
  <main class="learning-shell">
    <header class="learning-header">
      <div><p class="learning-kicker">ENGLISH POWER QUEST</p><h1 data-i18n="learning.title">学习与错题</h1><p data-i18n="learning.subtitle">把冒险中的错题，变成下一次答对的力量。</p></div>
      <div class="learning-navigation">
        <div class="learning-languages" aria-label="Language"><button type="button" data-set-language="en">English</button><button type="button" data-set-language="zh">简体中文</button></div>
        <a class="learning-button" href="/FYP/index.php" data-i18n="destination.back">↩ 返回地图</a>
      </div>
    </header>
    <section class="learning-stats" id="learningStats" aria-label="Learning statistics" data-i18n-aria-label="learning.statistics"></section>
    <p class="learning-note" data-i18n="learning.statsNote">统计来自冒险中的答题，复习不会改变原来的战斗记录。</p>
    <p id="learningStatus" role="status" aria-live="polite"></p>
    <button class="learning-button hidden" id="learningRetry" type="button" data-i18n="review.retry">重试</button>
    <section class="learning-practice hidden" id="learningPractice" aria-labelledby="learningPracticeTitle"></section>
    <section class="learning-history" aria-labelledby="learningHistoryTitle">
      <h2 id="learningHistoryTitle" data-i18n="learning.history">历史错题</h2>
      <p data-i18n="learning.historyHelp">查看自己的答案和解释，或选择「再练这题」进行不限时练习。</p>
      <div id="learningMistakes"></div>
      <button class="learning-button hidden" id="learningMore" type="button" data-i18n="review.more">查看更多错题</button>
    </section>
  </main>
  <script>window.EPQ_LEARNING = <?= json_encode(['csrfToken'=>(string)$_SESSION['csrf_token']], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;</script>
  <script type="module" src="/FYP/js/learning.js?v=20261014-skills1"></script>
</body>
</html>
