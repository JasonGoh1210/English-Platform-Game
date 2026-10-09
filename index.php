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
          <div class="pixel-player-name" data-i18n="player.name">Rookie</div>
          <div class="pixel-level"><span data-i18n="player.level">Lv.</span> <span id="levelText">1</span></div>

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
          <span class="pixel-small-label" data-i18n="quest.main">MAIN QUEST</span>
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
        <button id="dialogueButton" data-i18n="dialogue.continue">Continue ▸</button>
      </div>
    </div>

    <div class="controls" aria-label="Movement controls">
      <button class="move-button pixel-control" id="leftButton" aria-label="Move left" data-i18n-aria-label="controls.left">◀</button>
      <button class="move-button pixel-control" id="rightButton" aria-label="Move right" data-i18n-aria-label="controls.right">▶</button>
      <button class="interact-button pixel-control interact" id="interactButton" aria-label="Interact" data-i18n-aria-label="controls.interact">E</button>
    </div>

    <div class="hint pixel-hint" data-i18n="controls.hint">A / D or ← / → to move&nbsp;&nbsp; • &nbsp;E / SPACE to interact</div>

    <button type="button" class="settings-open-button" id="settingsOpenButton" data-i18n="settings.button">⚙ SETTINGS</button>

    <div class="destination-screen hidden" id="destinationScreen" role="dialog" aria-modal="true" aria-labelledby="destinationTitle">
      <div class="destination-topbar">
        <span>ENGLISH POWER QUEST</span>
        <span data-i18n="destination.top">WORLD GATE · 01</span>
      </div>

      <div class="destination-content">
        <header class="destination-heading">
          <p class="destination-kicker" data-i18n="destination.kicker">THE ANCIENT PORTAL</p>
          <h1 data-i18n="destination.title">REALM GATE</h1>
          <div class="destination-plaque" data-i18n="destination.choose">CHOOSE YOUR DESTINATION</div>
        </header>

        <div class="destination-carousel">
          <button class="destination-arrow" id="destinationPrev" type="button" aria-label="Previous destination" data-i18n-aria-label="destination.previous">◀</button>

          <section class="destination-card" aria-live="polite">
            <div class="destination-scene" id="destinationScene" data-scene="maple" aria-hidden="true">
              <div class="destination-scene-stars"></div>
              <div class="destination-sun"></div>
              <div class="destination-mountains"></div>
              <div class="destination-forest"></div>
              <div class="destination-landmark"></div>
              <div class="destination-ground"></div>
              <div class="destination-road"></div>
            </div>
            <div class="destination-card-top">
              <span id="destinationCategory">SAFE HAVEN</span>
              <span id="destinationCount">01 / 04</span>
            </div>
            <div class="destination-card-copy">
              <h2 id="destinationTitle">Maple Town</h2>
              <p id="destinationDescription">A peaceful village where your adventure and first words begin.</p>
            </div>
          </section>

          <button class="destination-arrow" id="destinationNext" type="button" aria-label="Next destination" data-i18n-aria-label="destination.next">▶</button>
        </div>

        <div class="destination-dots" aria-label="Choose a destination" data-i18n-aria-label="destination.select">
          <button type="button" class="active" data-destination-index="0" aria-label="Select Maple Town" data-i18n-aria-label="destination.select.maple" aria-current="true">■</button>
          <button type="button" data-destination-index="1" aria-label="Select Whispering Forest" data-i18n-aria-label="destination.select.forest">■</button>
          <button type="button" data-destination-index="2" aria-label="Select Old Camp Road" data-i18n-aria-label="destination.select.camp">■</button>
          <button type="button" data-destination-index="3" aria-label="Select Ancient Ruins" data-i18n-aria-label="destination.select.ruins">■</button>
        </div>

        <div class="destination-actions">
          <button class="destination-back" id="destinationBack" type="button" data-i18n="destination.back">↩ BACK TO MAP</button>
          <button class="destination-travel" id="destinationTravel" type="button"><span data-i18n="destination.travel">TRAVEL HERE</span> <span>▶</span></button>
        </div>

        <p class="destination-help" data-i18n="destination.help">← / → CHANGE LOCATION &nbsp; · &nbsp; ENTER TRAVEL &nbsp; · &nbsp; ESC CLOSE</p>
      </div>
    </div>
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
  </div>

  <script type="module" src="/FYP/js/rpg.js?v=20261009-walk4"></script>
</body>
</html>