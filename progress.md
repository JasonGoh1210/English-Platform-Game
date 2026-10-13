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

## 2026-10-13 — Google sign-in and first-login character creation

- User request: 登陆页面帮我加google，登陆，signin不要放游戏名称先，如果第一次登陆了就可以选名字选角色选男女，名字有一个saizi可以换随机名字。
- Confirmed: defer CHARACTER NAME until after authentication; keep game branding. No Google OAuth project yet; implement and document configuration first.
- Added pending-only character profile migration 006. Existing accounts without a row remain complete/default and keep their names, stats and saves. Registration/guest creation runs in the existing transaction.
- Added name dice, three palettes from the existing 13 PNG frames, independent gender, saved once server-side. No generated art, altered frame dimensions/alpha, or replacement Rowan asset.
- Google uses official GIS popup, session CSRF and one-use signed nonce, RSA signature/issuer/audience/expiry validation against fixed HTTPS Google certs, stable sub, and explicit same-player binding. Email/Google identity conflicts never auto-merge characters. No Secret required; unconfigured button disabled.
- Initial local backend checks passed: character setup/replay/ownership, old accounts, same-player guest/Google upgrades, saved balances, and original verified combat. RSA rejection cases and three palette/name tests passed.
- Browser check found battle initialization overwrote the tinted portrait; moved palette painting after original sprite initialization. Rechecking the complete browser flow.
- Production XAMPP player database not modified; migration tests use isolated MariaDB port 3307. Real Google login remains untested until Client ID is configured.

- Final verification: all 30 Node regressions, 19 trusted-question PHP checks, tutorial validation, Google RSA/claim checks, and all PHP/JS syntax passed.
- Isolated MariaDB browser: desktop/mobile creation and settings, pending guest cookie recovery, changing dice names, three distinct previews, saved female/forest profile, walking, colored battle portrait, same-player password upgrade and relogin, with no page/console errors.
- Existing audio/combat browser suite passed all four world labels, continuous wrong/correct combat, durable HP, Herb, focus, lost-response replay, sound mute/volume/settings and all three typing stages with loss feedback and victory. Rowan guide browser suite passed movement/story/slime/Run/reload/debrief, durable skip and legacy chapter/balance preservation.
- Final required skill Playwright client passed actual movement, MEET checkpoint, matching text/canvas and no errors. Screenshots visually inspected, including mobile setup/map/settings/account and desktop battle. Account binding entry is inside Settings to keep mobile header controls within the viewport.
- PHP fetched Google's real public signing certificates over verified HTTPS successfully. Real Google account/popup remains intentionally untested without the user's Client ID.
- Next deployment steps: back up actual database, import ONLY missing migration 006, configure public Client ID locally per docs/GOOGLE_SIGNIN_AND_CHARACTERS.md, hard-refresh and test real Google sign-in/link. No actual player database changed and no new sprite PNGs.
