<?php
declare(strict_types=1);
session_start();
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#101b24">
  <title>English Power Quest · Battle</title>
  <link rel="stylesheet" href="/FYP/css/style.css">
</head>
<body class="battle-page">
  <main class="battle-screen">
    <header class="battle-header">
      <div class="battle-title">
        <span class="battle-kicker">WILD ENCOUNTER</span>
        <h1 id="battleEnemyName">Word Slime</h1>
      </div>
      <a class="back-link" href="/FYP/index.php" id="returnMapLink">RUN TO MAP</a>
    </header>

    <section class="battlefield-pokemon-layout" aria-label="Battle scene">
      <div class="scene-haze haze-one"></div>
      <div class="scene-haze haze-two"></div>

      <div class="battle-monster monster-side">
        <div class="monster-shadow"></div>
        <div class="monster-sprite" id="enemyFigure">🟢</div>
        <div class="monster-name-box">
          <strong id="battleEnemyLabel">WORD SLIME</strong>
          <span id="battleEnemyRole">WORD CREATURE</span>
          <span class="enemy-difficulty-tag" id="enemyDifficulty">EASY</span>
        </div>
        <div class="hp-card enemy">
          <div class="hp-top"><span>HP</span><b id="enemyHpText">60 / 60</b></div>
          <div class="battle-bar"><div id="enemyHpBar"></div></div>
        </div>
      </div>

      <div class="battle-player player-side">
        <div class="player-shadow"></div>
        <div class="battle-character-sprite player-figure-large">
          <span class="player-cape"></span>
          <span class="player-body"></span>
          <span class="player-head"></span>
          <span class="player-sword"></span>
        </div>
        <div class="player-name-box">
          <strong>YOU</strong>
          <span>LANGUAGE ADVENTURER</span>
        </div>
        <div class="hp-card player">
          <div class="hp-top"><span>HP</span><b id="playerHpText">100 / 100</b></div>
          <div class="battle-bar"><div id="playerHpBar"></div></div>
        </div>
      </div>
    </section>

    <section class="battle-command-zone">
      <div class="battle-message-line" id="battleMessage">A wild opponent appeared!</div>

      <div id="battleMenu" class="battle-menu">
        <div class="command-prompt">
          <strong id="commandPrompt">What will you do?</strong>
          <span id="menuSubtext">Choose an action.</span>
        </div>

        <div class="command-grid">
          <button class="command-button fight" id="fightButton">
            <span class="command-icon">⚔</span>
            <span>FIGHT</span>
          </button>
          <button class="command-button skill" id="skillButton">
            <span class="command-icon">✦</span>
            <span>SKILL</span>
          </button>
          <button class="command-button item" id="itemButton">
            <span class="command-icon">◈</span>
            <span>ITEM</span>
          </button>
          <button class="command-button run" id="runButton">
            <span class="command-icon">↩</span>
            <span>RUN</span>
          </button>
        </div>
      </div>

      <div id="questionPanel" class="question-panel hidden">
        <div class="question-top">
          <span id="questionType">TRUE / FALSE</span>
          <span id="questionDifficulty">EASY</span>
          <span class="battle-timer" id="timerText">5.0s</span>
        </div>
        <h2 id="questionText">Loading question...</h2>
        <p id="questionPrompt">Answer correctly to attack.</p>
        <div id="answerArea" class="battle-answers"></div>
        <button class="back-to-menu" id="backToMenu">← Back to menu</button>
      </div>
    </section>

    <div class="battle-result hidden" id="battleResult">
      <div class="result-card">
        <span class="battle-kicker" id="resultKicker">VICTORY</span>
        <h2 id="resultTitle">Enemy Defeated!</h2>
        <p id="resultText">You got stronger.</p>
        <div class="result-rewards" id="resultRewards"></div>
        <button id="resultButton">Return to Map</button>
      </div>
    </div>
  </main>

  <script type="module" src="/FYP/js/battle.js?v=20261006-07"></script>
</body>
</html>