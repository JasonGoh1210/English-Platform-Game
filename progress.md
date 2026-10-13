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

## 2026-10-13 — Independent female character and login grouping

- User request: 女角角色是女孩子，然后随机名字多一点。然后把google登陆放在游客登陆上面和游客一起。
- New transparent female sheet generated with built-in imagegen, persisted at assets/player/female/female_adventurer_sheet.png. Seven used cells (idle plus six right-walk), left walk mirrored in Canvas; alpha bounds and one scale normalize the feet at 72 px. Original male PNGs and Rowan untouched.
- Girls selected by saved gender; live character previews, map/HUD, Story hero portraits, battle and typing portraits share the asset. Palette choices still apply to clothes; warm chestnut hair preserved.
- Expanded each gender to 1,600 unique valid English/Chinese names. Google and guest are grouped immediately below the password login form. No SQL migration or player data changes.

- Verification complete: 31 Node tests (including female pronouns), PHP validation of all 3,200 names, RSA/security checks and all PHP/JS syntax. Isolated database account/character/combat tests passed.
- Browser inspected girl previews and three palettes, real right/left walking, six distinct poses and exact mirrored alpha, all seven foot anchors at y=71, Story 她, HUD/battle/typing portraits, mobile login grouping, same-player upgrades/relogin, and no console/page errors. Required skill Playwright client passed with female character and matching MEET state.
- Female regression browser passed continuous combat, wrong/correct answers, HP reload, Herb, focus, lost-response replay, all four realm labels, audio settings/mute, Echo Cave entry/respawn/exit/re-entry, and all three Typing Cavern stages. Latest screenshots visually inspected.
- No SQL scripts changed or executed against the actual player database. Existing female profiles automatically use new art on refresh; male and legacy accounts keep original frames. Google credentials/configuration unchanged.

## 2026-10-13 — Optimization audit

- User request: 你帮我看有什么要优化的，你可以用skill。 Applied game-design-theory and game-ui-ux; used develop-web-game browser validation.
- Baseline: 31 Node regressions and PHP battle/tutorial/Google validation passed. No local player data touched.
- Isolated browser reproduced desktop account form overlap with quest title (account y14..57, quest y35..51), setting Tab focus escaping the modal, and wrong XP meter (level2/246 total XP displays246/100 with0% width).
- Disposable test guest accepted the same unsupported QUEST claim twice: XP123->246, Coins7->14. Original verified battle receipts remain replay-protected. Do not equate this test to changing real user balances.
- Safe fixes: moved upgrade/logout form into Settings without changing identity/CSRF/logout behavior; 44px action buttons, keyboard focus stays within Settings, Escape restores focus. XP and quest reward model deferred to explicit priority/acceptance notes in audit report.

- Optimization UI browser passed: desktop quest title clear; visible same-CSRF account form in Settings; 16 Tab and 16 Shift+Tab stay inside; Escape restores trigger; 390x844 Settings fits; guest upgrade/logout/password relogin retain player ID and saved progress. No console/page errors. Screenshots inspected before/after.
- Required skill Playwright client passed real movement/MEET state and screenshot/text consistency. Audit report records remaining QUEST replay, XP meter, learner feedback, 19-question bank, mobile readability and maintainability priorities. W3C APG used for modal keyboard behavior.
- No schema migration or new/changed sprite assets. Commit includes only account/layout/focus/cache updates, latest audit and README/progress documentation. Original gameplay and player data preserved.

## 2026-10-13 — Verified quest rewards and truthful XP HUD

- Continue optimization priorities 1/2: server-owned NPC chapter rewards and three-word typing runs, one-use claim keys/request receipts, additive migration007 snapshotting old chapter steps and old chapter reward ledgers. No actual XAMPP database modified.
- Old api/save_progress.php now rejects all client-supplied amounts. api/game_state.php overwrites client chapter steps with verified progression; position/world/cave and tutorial storage remain intact.
- Quest client serializes, persists uncertain requests per player, retries the exact receipt, resumes with fresh session CSRF and validates balance/chapter responses. No optimistic currency additions.
- NPC constants preserve original rewards and all four original positions; typing rewards10XP/5Coins/1Power per word, one-time ending50XP/25Coins/2Power. New practice runs still reward genuine answers. Wrong answers and local monster/hint/spelling mechanics preserved, with network waits pausing the local challenge.
- Server levelProgress comes from MySQL levels, updates on load/confirmed rewards, and displays current-level XP, dynamic denominator, percent and MAX.
- Backend passed: ownership/CSRF/location/story order, forged amount and chapter rejection, NPC and typing replay, three correct stages, single ending, legitimate replay, old migration/reimport and failed-ledger rollback. Existing combat/account checks passed.

- Final validation: 36 Node tests passed; all PHP/JS syntax, PHP question/tutorial/Google/XP tests and Bash smoke syntax passed. Isolated MariaDB tests passed fixed/forged rewards, legacy map and reward-ledger backfill, duplicate migration, abandoned runs, rollback/retry and existing account/combat flows.
- Browser passed four NPC chapters, lost committed NPC/typing responses, wrong spelling/hints, three words and once-only ending; XP246 displays146/150 at97.33%, plus mobile/MAX. Latest screenshots were opened and inspected.
- Full regression browser passed Rowan tutorial through durable debrief, legacy/skipped characters, synthesized audio/mute/settings, continuous combat/HP reload/Herb/focus, all four worlds and Echo Cave entry/exit/respawn. Required develop-web-game Playwright client passed real movement with matching MEET state and no console errors.
- Friendly player/save errors now avoid exposing database exceptions and identify missing migrations. Rollout requires backing up the actual database and importing ONLY missing007; no live data, credentials or art assets changed.
- Next priorities: battle mistake explanations/review and theme-based question expansion; client-reported coordinates/local monster timers remain outside current server verification. GitHub MySQL8/MariaDB10.4 CI pending publication.

- GitHub CI for79e0110 passed syntax and both MySQL8/MariaDB10.4 guest/account/combat/quest jobs. Follow-up explicitly enables mysqli exceptions in player/save routes; isolated test temporarily hides only the new story table, confirms all three endpoints return503 MIGRATION_REQUIRED without raw database messages or unverified fallback, and restores the table in finally. Backend/account/combat checks passed again.

## 2026-10-13 — UI and gameplay follow-up review

- User: 在继续看看有什么要改，ui啊，玩法等等。 Applied game-ui-ux, game-design-theory, develop-web-game. Baseline ca1f200, clean main.
- Isolated Chrome reproduced mobile/tablet location plaque covering quest text, short landscape groundY520 outside390px viewport, and timed battle question below635px. Current pools expose only10of19 questions: five EASY and five MEDIUM. Nine questions are not selected by current five encounter pools;All19question entries have Chinese question text;10odd-word/sentence entries lack both English and Chinese explanations.
- First fixes in progress: content-flow HUD toolbar, larger status/task text and44px actions, ResizeObserver positions guide below current HUD, responsive screen-space ground, landscape encounter/answers columns. No changes to combat amounts/timers/questions, saved world X positions, schemas or art assets.

- Final UI browser passed7viewports including568x320; no horizontal overflow or quest/plaque intersection. Settings/buttons44px, real landscape movement, portal interaction,12Tab focus checks/Escape restore and visible enemy HP passed. Latest map/battle/tutorial screenshots opened and visually checked. Very short screens use local answer-panel scroll; real-device keyboard/notch testing remains open.
-36Node regressions, all PHP/JS syntax and PHP grading/tutorial/Google/XP tests passed. Skill client passed real movement with MEET/text-state consistency; full isolated audio/combat/HP/Herb/replay/focus/four-world/Echo/three-word browser regression passed.
- Chinese UI/gameplay report identifies only10reachable battle questions,10missing EN/ZH explanations (question text is already bilingual), no battle review UI, weak target guidance, free Focus and learning-power/battle-damage disconnect. Proposed changes are not claimed implemented.
- Main changes:index.php,battle.php,css/style.css,js/rpg.js,js/i18n.js; battle/save modules only cache version updated. No SQL migration, original sprite/background/audio asset paths unchanged and actual player database untouched.

## 2026-10-13 — Post-battle mistake summary

- User: 战后错题总结。 Use existing verified attempt snapshots, no schema/player reset. Add read-only owner-scoped finished-battle review with stats and paged mistakes; supplement10missing EN/ZH explanations without changing questions, answers, time limits or rewards. Keep historical snapshots and only backfill missing explanations when canonical content matches exactly.

- Verification:38Node tests and all PHP/JS syntax passed, plus PHP battle/quest/tutorial/Google/XP/review rules. Isolated MySQL-compatible smoke verified ownership, active-battle protection, exact completed counts, upgrade/reload, no read rewards, timeout separation,10+2pagination, old explanations and literal submitted text.
- Browser played real wrong/timeout/3correct victory, intentionally lost a committed response (counted once), offline-summary/retry, refresh and unchanged wallets; EN/ZH,20Tab focus, mobile/landscape, saved all-type fixture with12mistakes and HTML-looking text, actual10wrong defeat, retry to fresh100HP, perfect victory and defeat return all passed. Screenshots opened and inspected, including final320px layout and scrolled landscape explanation.
- Required skill Playwright client passed movement/MEET/text-state consistency; full original audio/mute, continuous combat, HP reload/Herb/focus/replay, bilingual settings, all four realms, Echo entry/exit/respawn and three-stage typing passed. No new page/console errors.
- Original questions, choices, correct answers, times and rewards compared against prior commit and unchanged. Added only10missing bilingual explanations. No migrations, art/audio changes or actual XAMPP database writes. Current summary is for the finished battle; map history/practice entry remains a future task.

## 2026-10-13 — Four-world themed question expansion

- User: 扩充题库，给四个世界加入不同主题，减少重复。 Applied develop-web-game and game-design-theory. Existing19questions remain unchanged; added80bilingual questions (20perrealm), EASY8/10sec and MEDIUM10/12sec with the same existing difficulty reward tiers.
- Server enemy-to-realm mapping selects each themed pool; recent8answered questions per player/perrealm are deprioritized across battles. In-battle unused questions win before repeats; exhausted pools avoid the immediate previous question. Issued word choices are shuffled once and saved with the question token. Existing active snapshots stay intact.

- Final validation: all 38 Node tests, PHP/JS syntax, six PHP rule suites and Bash smoke syntax passed. Original 19 questions deep-compared with HEAD and exactly preserved. Isolated API smoke actually issued and correctly graded all 80 new questions, checked no first-pool repeat, recent eight per realm/player, Guardian/Wraith shared history, stable tokens/word order on reload/replay, no answer leakage and old active-question grading. Existing combat, quest, review and character/backend checks passed.
- Chrome played all four map-to-battle transitions with correct world topics in EN/ZH, all three question types, stable reload, actual victories and the new question's saved mistake explanation. Desktop, 390x844 mobile and 844x390 sentence screenshots were opened and inspected; short screens retain answer-panel scrolling. No new console/page errors. Required develop-web-game client passed movement/MEET with inspected screenshot and matching text state.
- Full browser regression passed Rowan teaching through debrief, Run/reload/Herb and bilingual coaching, old and skipped characters; synthesized audio/mute/volume, continuous combat, HP reload, lost-response replay, Focus, four-world labels, Echo entry/exit/respawn and all three typing stages with wrong-answer feedback. Test-only audio sampling was corrected to capture during server preparation and prime the browser audio context after navigation; production audio code was unchanged. Large synchronous API runs log PHP server stderr to a file to avoid filling a parent-process pipe; CI already does this.
- Changed question content, server pool selection, bilingual topic label, cache versions, tests and documentation only. No SQL migration or new/replaced art/audio asset paths; actual player database never accessed. GitHub MySQL8/MariaDB10.4 jobs run on publication. Next: collect learner feedback on the new 8-12 second limits; historical mistake practice remains a separate future feature.
