<?php
declare(strict_types=1);
session_start();
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#111b22">
  <meta name="description" content="English Power Quest - a story-driven English learning RPG.">
  <title>English Power Quest</title>
  <link rel="stylesheet" href="/FYP/css/style.css">
</head>
<body>
  <div class="game-shell pixel-world-ui">
    <canvas id="gameCanvas" aria-label="English Power Quest world"></canvas>

    <div class="hud">
      <section class="pixel-player-card">
        <div class="pixel-avatar"><img src="/FYP/assets/player/dark-adventurer-exact.png" alt="Rookie character"></div>
        <div class="pixel-player-info">
          <div class="pixel-player-name">Rookie</div>
          <div class="pixel-level">Lv. <span id="levelText">1</span></div>

          <div class="pixel-stat-row">
            <span>HP</span>
            <div class="pixel-meter"><div class="hp-meter" style="width:100%"></div></div>
            <b id="mapHpText">100 / 100</b>
          </div>

          <div class="pixel-stat-row xp-row">
            <span>XP</span>
            <div class="pixel-meter"><div class="xp-meter" id="mapXpBar" style="width:0%"></div></div>
            <b><span id="xpText">0</span> / 100</b>
          </div>
        </div>

        <div class="pixel-currency-list">
          <div><span class="pixel-coin">◉</span><b id="coinsText">0</b></div>
          <div><span class="pixel-star">★</span><b id="powerText">0</b></div>
          <div><span class="pixel-book">▤</span><b>0</b></div>
        </div>
      </section>

      <section class="pixel-quest-card" id="questCard">
        <div class="quest-icon">!</div>
        <div>
          <span class="pixel-small-label">MAIN QUEST</span>
          <strong id="questTitle">The First Words</strong>
          <p id="questText">Find the village elder.</p>
        </div>
      </section>
    </div>

    <div class="location-pill pixel-location" id="locationText">MAPLE TOWN</div>

    <div class="dialogue hidden" id="dialogue">
      <div class="dialogue-portrait">🧓</div>
      <div class="dialogue-body">
        <div class="dialogue-name" id="dialogueName">Elder Rowan</div>
        <p id="dialogueText">Welcome, traveller.</p>
        <button id="dialogueButton">Continue ▸</button>
      </div>
    </div>

    <div class="controls" aria-label="Movement controls">
      <button class="move-button pixel-control" id="leftButton" aria-label="Move left">◀</button>
      <button class="move-button pixel-control" id="rightButton" aria-label="Move right">▶</button>
      <button class="interact-button pixel-control interact" id="interactButton" aria-label="Interact">E</button>
    </div>

    <div class="hint pixel-hint">A / D or ← / → to move&nbsp;&nbsp; • &nbsp;E / SPACE to interact</div>
  </div>

  <script type="module" src="/FYP/js/rpg.js"></script>
</body>
</html>