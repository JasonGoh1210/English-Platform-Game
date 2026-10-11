# Pixel sound effects

The map and battle pages share `js/audio.js` and the settings markup in
`includes/sound_settings.php`. Original short square/triangle/sawtooth notes are
synthesized with Web Audio. There are no external audio files, downloads, music
loops or database migrations.

## Player controls

- Settings includes Sound Effects, a 0–100% volume slider and Test Sound in both languages.
- Effects default to enabled at 35% volume. Settings persist in this browser under
  `englishPowerQuest.audio.v1`, across players, map/battle navigation and refresh.
- A real click/touch/key press unlocks audio. Page loads and scripted clicks stay silent.
  If the browser initially suspends audio, the next interaction can resume it.
- Muting or setting volume to zero immediately stops scheduled and active notes.
  Hidden pages and navigation stop sounds; old effects are never queued for later.
- Unsupported audio, denied autoplay and unavailable local storage do not block gameplay.

## Events

Buttons, NPC dialogue, illustrated story impacts/magic, portals, cave entry,
encounters, correct/wrong quiz answers, player/enemy attacks, Knowledge Focus,
confirmed Herb purchases, level increases, victory and defeat have distinct effects.
Typing Cavern includes correct/wrong answers, approaching monsters and final results.
Battle answer/purchase effects follow confirmed server responses; unsuccessful
purchases and unconfirmed answers do not play success sounds. Existing combat
rules, timers, balances and map/quest progression remain unchanged.

## Verification

`node --test tests/gameplay_regression.test.cjs tests/battle_api.test.cjs tests/audio.test.cjs`
covers audio unlocking, cancellation, preferences, failures, rate limits and
confirmed battle outcome sounds alongside existing gameplay/network regressions.
For browser acceptance, open Settings on both pages, test sound, mute, change
volume, refresh, switch language, fight and enter Typing Cavern. Check mobile and
landscape settings scrolling. Automated audio signal checks prove synthesis;
listening on the user's speakers/headphones is a separate manual check.

The local automated browser check used real PHP with an isolated MariaDB data
directory on port 3307 and Chrome. It verified map/battle preferences, real user
gestures, mute output, desktop/mobile/landscape settings, continuous combat,
Herb, reload, uncertain-response replay, victory, four realm labels and all three
Typing Cavern stages. Chrome's test-only `sinkId: {type: "none"}` output allowed
an analyser to measure native Web Audio synthesis without a headless audio device.
The production game uses the browser's normal speaker output. No existing XAMPP
player database was connected or changed by these checks.
