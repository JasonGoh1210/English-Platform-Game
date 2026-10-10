<?php
declare(strict_types=1);
require_once __DIR__ . '/includes/auth.php';
epq_require_login_page();

$epqPlayerId = (int)$_SESSION['player_id'];
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#101b24">
  <title>English Power Quest · Battle</title>
  <link rel="stylesheet" href="/FYP/css/style.css?v=20261010-assetpaths1">
</head>
<body class="battle-page">
  <main class="battle-screen">
    <header class="battle-header">
      <div class="battle-title">
        <span class="battle-kicker" data-i18n="battle.kicker">WILD ENCOUNTER</span>
        <h1 id="battleEnemyName">Word Slime</h1>
      </div>
      <a class="back-link" href="/FYP/index.php" id="returnMapLink" data-i18n="battle.back">RUN TO MAP</a>
    </header>

    <section class="battlefield-pokemon-layout" aria-label="Battle scene" data-i18n-aria-label="battle.scene">
      <div class="scene-haze haze-one"></div>
      <div class="scene-haze haze-two"></div>

      <div class="battle-monster monster-side">
        <div class="monster-shadow"></div>
        <div class="monster-sprite" id="enemyFigure">🟢</div>
        <div class="monster-name-box">
          <strong id="battleEnemyLabel">WORD SLIME</strong>
          <span id="battleEnemyRole" data-i18n="battle.wordCreature">WORD CREATURE</span>
          <span class="enemy-difficulty-tag" id="enemyDifficulty">EASY</span>
        </div>
        <div class="hp-card enemy">
          <div class="hp-top"><span>HP</span><b id="enemyHpText">60 / 60</b></div>
          <div class="battle-bar"><div id="enemyHpBar"></div></div>
        </div>
      </div>

      <div class="battle-player player-side">
        <div class="player-shadow"></div>
        <img class="battle-player-art" id="battlePlayerSprite" src="/FYP/assets/player/png_frames/Player_Stand.png?v=20261010-assetpaths1" alt="Player character">
        <div class="player-name-box">
          <strong data-i18n="battle.you">YOU</strong>
          <span data-i18n="battle.adventurer">LANGUAGE ADVENTURER</span>
        </div>
        <div class="hp-card player">
          <div class="hp-top"><span>HP</span><b id="playerHpText">100 / 100</b></div>
          <div class="battle-bar"><div id="playerHpBar"></div></div>
        </div>
      </div>
    </section>

    <section class="battle-command-zone">
      <div class="battle-message-line" id="battleMessage" data-i18n="battle.initialMessage">A wild opponent appeared!</div>

      <div id="battleMenu" class="battle-menu">
        <div class="command-prompt">
          <strong id="commandPrompt" data-i18n="battle.whatDo">What will you do?</strong>
          <span id="menuSubtext" data-i18n="battle.chooseAction">Choose an action.</span>
        </div>

        <div class="command-grid">
          <button class="command-button fight" id="fightButton">
            <span class="command-icon">⚔</span>
            <span data-i18n="battle.fight">FIGHT</span>
          </button>
          <button class="command-button skill" id="skillButton">
            <span class="command-icon">✦</span>
            <span data-i18n="battle.skill">SKILL</span>
          </button>
          <button class="command-button item" id="itemButton">
            <span class="command-icon">◈</span>
            <span data-i18n="battle.item">ITEM</span>
          </button>
          <button class="command-button run" id="runButton">
            <span class="command-icon">↩</span>
            <span data-i18n="battle.run">RUN</span>
          </button>
        </div>
      </div>

      <div id="questionPanel" class="question-panel hidden">
        <div class="question-top">
          <span id="questionType" data-i18n="battle.trueFalse">TRUE / FALSE</span>
          <span id="questionDifficulty" data-i18n="battle.easy">EASY</span>
          <span class="battle-timer" id="timerText">5.0s</span>
        </div>
        <h2 id="questionText" data-i18n="battle.loadingQuestion">Loading question...</h2>
        <p class="question-translation hidden" id="questionTranslation"></p>
        <p id="questionPrompt" data-i18n="battle.answerPrompt">Answer correctly to attack.</p>
        <div id="answerArea" class="battle-answers"></div>
        <div class="question-battle-actions" aria-label="Battle actions" data-i18n-aria-label="battle.actions">
          <button type="button" id="activeSkillButton" class="battle-action-button"><span>✦ </span><span data-i18n="battle.skill">SKILL</span></button>
          <button type="button" id="activeItemButton" class="battle-action-button"><span>◈ </span><span data-i18n="battle.item">ITEM</span></button>
          <button type="button" id="activeRunButton" class="battle-action-button danger"><span>↩ </span><span data-i18n="battle.run">RUN</span></button>
        </div>
      </div>
    </section>

    <div class="battle-result hidden" id="battleResult">
      <div class="result-card">
        <span class="battle-kicker" id="resultKicker" data-i18n="battle.victory">VICTORY</span>
        <h2 id="resultTitle" data-i18n="battle.enemyDefeated">Enemy Defeated!</h2>
        <p id="resultText" data-i18n="battle.stronger">You got stronger.</p>
        <div class="result-rewards" id="resultRewards"></div>
        <button id="resultButton" data-i18n="battle.returnMap">Return to Map</button>
      </div>
    </div>
  </main>

  <button type="button" class="settings-open-button battle-settings-open" id="settingsOpenButton" data-i18n="settings.button">⚙ SETTINGS</button>

  <div class="settings-screen hidden" id="settingsScreen" role="dialog" aria-modal="true" aria-labelledby="settingsTitle">
    <section class="settings-panel">
      <div class="settings-panel-kicker">ENGLISH POWER QUEST</div>
      <h2 id="settingsTitle" data-i18n="settings.title">SETTINGS</h2>
      <p data-i18n="settings.subtitle">Make the game comfortable for you.</p>
      <div class="settings-language-label" data-i18n="settings.language">LANGUAGE / 语言</div>
      <div class="settings-language-options">
        <button type="button" data-set-language="en" data-i18n="settings.english">English</button>
        <button type="button" data-set-language="zh" data-i18n="settings.chinese">简体中文</button>
      </div>
      <p class="settings-saved" data-i18n="settings.saved">Your language choice is saved automatically.</p>
      <button type="button" class="settings-close-button" id="settingsCloseButton" data-i18n="settings.close">CLOSE</button>
    </section>
  </div>

  <script>
    // Keep battle-page storage scoped to the same logged-in player as the map.
    window.EPQ_AUTH = <?= json_encode([
      'playerId' => $epqPlayerId
    ], JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT) ?>;
  </script>
  <script type="module" src="/FYP/js/battle.js?v=20261010-battlekeys1"></script>
</body>
</html>