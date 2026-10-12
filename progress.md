Original prompt: 试试看做新手教学，有一个小怪出现在村庄，长老教我们。。。

## First-adventure tutorial

- Extend the existing PHP/MySQL/Canvas game; keep Rowan's chosen sprite, four realms,
  original quests, guest identities, combat rules and existing player data.
- New-character flow: MOVE -> MEET -> SLIME -> BATTLE -> RETURN -> DONE.
  Skipping is durable; older characters use LEGACY. No SQL migration or new art.
- Persist bounded guide metadata in player_game_saves.save_json. No tutorial bonus
  rewards, battle timer changes or enemy respawn on lesson completion.
- Initial checks: 27 Node regressions and PHP tutorial validation passed. Isolated
  PHP/MariaDB backend tests passed, including checkpoint ownership/guest upgrades.
- Browser screenshots exposed guide/target overlap and a test click below the
  viewport. Compact the guide near its target, reposition markers, and scroll the
  browser's target button into view before clicking.
- Continue: complete fresh-guest walkthrough, Run/reload/skip/legacy checks, inspect
  desktop/mobile screenshots and console errors, run the skill Playwright client,
  then commit/push the tested change and verify GitHub Actions.

- Fresh-guest browser walkthrough passed, including real movement, Rowan's scene,
  natural slime encounter, Run/re-entry, map/battle reload, correct/wrong answers,
  confirmed Herb purchase, English/Chinese, victory/debrief, skip and legacy saves.
- The skill Playwright client reached MEET and its text snapshot matched the
  canvas. Its error log exposed requests for absent optional world backgrounds.
  The PHP map now supplies existing candidates in the same custom-first order;
  legacy/static entry points retain the original fallback behavior. No art changed.

- Final local verification passed: 27 Node regressions, 19 trusted-question checks,
  PHP checkpoint/syntax checks, complete fresh-guest browser walkthrough,
  skip/Run/reload/legacy compatibility, four realm backgrounds, audio signal/mute,
  all three Typing Cavern stages and the skill Playwright client with zero errors.
- An older cached client that omits tutorial metadata now keeps the stored
  checkpoint; isolated API tests cover this and same-player guest upgrades.
- Read-only render_game_to_text is available on map and battle pages. Tests use
  the Playwright client's own timing shim; production battle deadlines are intact.
- Delivery: commit the tested files to main and check syntax plus MySQL 8/MariaDB
  10.4 Actions jobs. No remaining feature implementation TODOs. Optional next work:
  server verification of NPC/typing rewards and a learner mistake-review screen.
