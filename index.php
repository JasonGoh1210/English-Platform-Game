<?php
declare(strict_types=1);
require_once __DIR__ . '/includes/auth.php';
epq_require_login_page();

$epqIsGuest = epq_is_guest();
$epqPlayerId = $epqIsGuest ? 0 : (int)($_SESSION['player_id'] ?? 0);
// Guest progress uses a dedicated localStorage namespace that survives a new guest session on this browser.
$epqStorageId = $epqIsGuest ? 'guest' : (string)$epqPlayerId;
$epqDisplayName = $epqIsGuest
    ? (string)($_SESSION['display_name'] ?? 'Guest Adventurer')
    : (string)($_SESSION['display_name'] ?? $_SESSION['username'] ?? 'Adventurer');
$epqShowStoryIntro = !$epqIsGuest && !empty($_SESSION['show_story_intro']);
$epqCsrfToken = (string)$_SESSION['csrf_token'];
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#111b22">
  <meta name="description" content="English Power Quest - a story-driven English learning RPG.">
  <title>English Power Quest</title>
  <link rel="stylesheet" href="/FYP/css/style.css?v=20261010-guestmode1">
</head>
<body>
  <div class="game-shell pixel-world-ui">
    <canvas id="gameCanvas" aria-label="English Power Quest world"></canvas>

    <div class="hud">
      <section class="pixel-player-card">
        <div class="pixel-avatar"><img src="/FYP/assets/player/png_frames/Player_Stand.png?v=20261010-assetpaths1" alt="Rookie character"></div>
        <div class="pixel-player-info">
          <div class="pixel-player-name"><?= epq_h($epqDisplayName) ?></div>
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

    <section class="story-intro-overlay hidden" id="storyIntroOverlay" role="dialog" aria-modal="true" aria-labelledby="storyIntroTitle" aria-describedby="storyIntroBody">
      <div class="storyboard-screen" id="storyboardCanvas" data-scene="prologue" data-camera="wide" data-effect="magic">
        <div class="storyboard-scene" id="storyboardSceneArt" aria-hidden="true"></div>
        <div class="storyboard-scene-vignette" aria-hidden="true"></div>
        <div class="storyboard-halftone" aria-hidden="true"></div>
        <div class="storyboard-speed-lines" aria-hidden="true"></div>
        <div class="storyboard-flash" aria-hidden="true"></div>

        <div class="storyboard-orbit-runes" aria-hidden="true">
          <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
        </div>

        <div class="storyboard-brandline">
          <span class="story-intro-brand">ENGLISH POWER QUEST</span>
          <span id="storyboardFrameTag">PROLOGUE · PANEL 01</span>
        </div>

        <div class="storyboard-portrait-wrap" id="storyboardPortraitWrap">
          <div class="storyboard-portrait-aura" aria-hidden="true"></div>
          <img id="storyIntroPortraitImage" alt="Story character portrait">
          <div class="storyboard-portrait-caption" id="storyboardSpeaker"><?= epq_h($epqDisplayName) ?></div>
        </div>

        <div class="story-intro-content">
          <div class="storyboard-kicker-row">
            <p class="story-intro-kicker" id="storyIntroKicker">ENGLISH POWER QUEST · PROLOGUE</p>
            <div class="story-intro-meta">
              <span id="storyIntroCounter">PROLOGUE · 1 / 8</span>
              <span id="storyboardLocation">AETHERIA</span>
            </div>
          </div>
          <div class="storyboard-caption-rule"><span></span><b>◆</b><span></span></div>
          <h1 id="storyIntroTitle">The Student at the Bottom</h1>
          <p id="storyIntroBody"></p>
          <div class="story-intro-progress-track"><div id="storyIntroProgress"></div></div>
        </div>

        <div class="storyboard-sfx" id="storyboardSfx" aria-hidden="true">WHOOSH!</div>
        <div class="storyboard-bottom-bar" aria-hidden="true"><span></span><span></span><span></span></div>
      </div>

      <div class="storyboard-controls">
        <button type="button" class="story-intro-skip" id="storyIntroSkip">SKIP SCENE</button>
        <div class="story-intro-hint">ENTER · NEXT PANEL &nbsp; / &nbsp; ESC · SKIP SCENE</div>
        <button type="button" class="story-intro-next" id="storyIntroNext">CONTINUE <span aria-hidden="true">→</span></button>
      </div>
    </section>

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

    <form class="game-logout-form" method="post" action="/FYP/logout.php">
      <input type="hidden" name="csrf_token" value="<?= epq_h($epqCsrfToken) ?>">
      <span class="game-account-name"><?= epq_h($epqDisplayName) ?></span>
      <button type="submit" class="game-logout-button"><?= $epqIsGuest ? '↩ 退出游客模式' : '↪ 退出登录' ?></button>
    </form>
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
    <section class="typing-cave-screen hidden" id="typingCaveScreen" role="dialog" aria-modal="true" aria-labelledby="typingCaveTitle">
      <header class="typing-cave-header">
        <div class="typing-cave-heading">
          <span class="typing-cave-kicker" id="typingCaveKicker">BEYOND THE ECHO · TYPING CHALLENGE</span>
          <h1 id="typingCaveTitle">Word Cavern</h1>
          <p id="typingCaveInstructions">Type the English word that matches the definition. The monster is getting closer!</p>
        </div>
        <button type="button" class="typing-cave-exit" id="typingCaveExit">↩ BACK TO MAP</button>
      </header>

      <section class="typing-cave-question-card" aria-live="polite">
        <div class="typing-cave-question-topline">
          <span class="typing-cave-question-label" id="typingCaveQuestionLabel">TYPE THE WORD THAT MEANS</span>
          <span class="typing-cave-stage-label" id="typingCaveStageLabel">LEVEL 1 / 3</span>
        </div>
        <h2 id="typingCaveQuestion">To propel something through the air with a movement of the arm and hand. To toss or hurl.</h2>
        <p class="typing-cave-translation hidden" id="typingCaveTranslation"></p>
        <span class="typing-cave-hint-label" id="typingCaveHintLabel">Letters are revealed as the monster approaches</span>
        <div class="typing-cave-letter-hint" id="typingCaveLetterHint" aria-label="Letter hints"></div>
      </section>

      <div class="typing-cave-stage" id="typingCaveStage" aria-label="Monster approach scene">
        <div class="typing-cave-rocks"></div>
        <div class="typing-cave-ground"></div>
        <div class="typing-cave-player">
          <img src="/FYP/assets/player/png_frames/Player_Stand.png?v=20261010-assetpaths1" alt="Player character">
        </div>
        <div class="typing-cave-monster" id="typingCaveMonster">
          <img src="/FYP/images/world/monsters/cave-wraith.svg?v=20261010-monsterart2" alt="Approaching monster">
        </div>
        <div class="typing-cave-threat">
          <span id="typingCaveThreatLabel">MONSTER APPROACH</span>
          <div class="typing-cave-threat-track"><div id="typingCaveThreatBar"></div></div>
        </div>
      </div>

      <div class="typing-cave-controls">
        <form id="typingCaveForm" class="typing-cave-form">
          <label for="typingCaveInput" id="typingCaveAnswerLabel">Type your answer</label>
          <div class="typing-cave-answer-row">
            <input id="typingCaveInput" name="typingCaveAnswer" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="24" placeholder="Type an English word…" disabled>
            <button type="submit" id="typingCaveSubmit" disabled>SUBMIT</button>
          </div>
        </form>
        <p class="typing-cave-message" id="typingCaveMessage" role="status">Type the word and press Enter.</p>
        <p class="typing-cave-spelling-feedback hidden" id="typingCaveSpellingFeedback" role="status" aria-live="polite"></p>
        <button type="button" class="typing-cave-retry hidden" id="typingCaveRetry">TRY AGAIN</button>
      </div>

      <div class="typing-cave-lose-overlay hidden" id="typingCaveLoseOverlay" role="alertdialog" aria-modal="true" aria-labelledby="typingCaveLoseTitle" aria-describedby="typingCaveLoseMessage">
        <section class="typing-cave-lose-panel">
          <div class="typing-cave-lose-icon" aria-hidden="true">☠</div>
          <p class="typing-cave-lose-kicker">TYPING CAVERN · FAILED</p>
          <h2 id="typingCaveLoseTitle">YOU LOSE</h2>
          <p id="typingCaveLoseMessage">The monster caught you. Review the word, then try again.</p>
          <div class="typing-cave-lose-review" aria-live="polite">
            <p class="typing-cave-review-attempt" id="typingCaveLoseAttempt">Your answer:</p>
            <p class="typing-cave-review-correct" id="typingCaveLoseCorrect">Correct answer:</p>
            <p class="typing-cave-review-explanation" id="typingCaveLoseExplanation">Spelling explanation:</p>
            <p class="typing-cave-review-meaning" id="typingCaveLoseMeaning">Definition:</p>
          </div>
          <div class="typing-cave-lose-actions">
            <button type="button" id="typingCaveLoseRetry">TRY AGAIN</button>
            <button type="button" id="typingCaveLoseExit">BACK TO MAP</button>
          </div>
        </section>
      </div>

      <div class="typing-cave-win-overlay hidden" id="typingCaveWinOverlay" role="alertdialog" aria-modal="true" aria-labelledby="typingCaveWinTitle" aria-describedby="typingCaveWinMessage">
        <section class="typing-cave-win-panel">
          <div class="typing-cave-win-icon" aria-hidden="true">✦</div>
          <p class="typing-cave-win-kicker">TYPING CAVERN · COMPLETE</p>
          <h2 id="typingCaveWinTitle">CAVE CLEARED!</h2>
          <p id="typingCaveWinMessage">You completed all three levels and pushed the monster away!</p>
          <div class="typing-cave-win-actions">
            <button type="button" id="typingCaveWinReplay">PLAY AGAIN</button>
            <button type="button" id="typingCaveWinExit">BACK TO MAP</button>
          </div>
        </section>
      </div>

      <p class="typing-cave-footer">ENTER · SUBMIT ANSWER &nbsp; / &nbsp; ESC · EXIT</p>
    </section>

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

  <script>
    window.EPQ_AUTH = <?= json_encode([
      'playerId' => $epqPlayerId,
      'storageId' => $epqStorageId,
      'isGuest' => $epqIsGuest,
      'displayName' => $epqDisplayName,
      'showStoryIntro' => $epqShowStoryIntro,
      'csrfToken' => $epqCsrfToken
    ], JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT) ?>;

    (() => {
      const canvas = document.getElementById("gameCanvas");
      const fallbackBackground = "/FYP/assets/world/backgrounds/maple-town.webp?v=20261010-assetpaths1";
      if (canvas) {
        canvas.style.backgroundColor = "#14212a";
        canvas.style.backgroundImage = 'url("' + fallbackBackground + '")';
        canvas.style.backgroundPosition = "center bottom";
        canvas.style.backgroundRepeat = "no-repeat";
        canvas.style.backgroundSize = "cover";
      }

      import("/FYP/js/rpg.js?v=20261010-monsterart2").catch((error) => {
        console.error("[English Power Quest] Game script failed to initialize:", error);
        const notice = document.createElement("div");
        notice.setAttribute("role", "alert");
        notice.style.cssText = "position:fixed;z-index:99999;left:50%;top:50%;transform:translate(-50%,-50%);width:min(760px,calc(100vw - 32px));padding:22px 24px;border:2px solid #d6b56f;border-radius:12px;background:#101923;color:#fff;font:16px/1.55 system-ui,sans-serif;box-shadow:0 20px 70px rgba(0,0,0,.55);white-space:pre-wrap;";
        const title = document.createElement("strong");
        title.textContent = "English Power Quest 启动失败";
        title.style.cssText = "display:block;margin-bottom:10px;color:#ffd991;font-size:20px;";
        const detail = document.createElement("div");
        detail.textContent = (error && error.message) ? error.message : String(error);
        const help = document.createElement("p");
        help.textContent = "请把这段错误文字截图发给 ChatGPT；目前先显示背景，修复后地图角色和互动会恢复。";
        help.style.cssText = "margin:12px 0 0;color:#c7d3df;font-size:14px;";
        notice.append(title, detail, help);
        document.querySelector(".game-shell")?.appendChild(notice);
      });
    })();
  </script>
</body>
</html>