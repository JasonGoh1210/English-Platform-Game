# Rowan's first-adventure tutorial

The existing Maple Town story and `slime-01` encounter now introduce movement,
interaction and quiz combat to new players. Both Chinese and English are supported.
The selected Rowan sprite and existing slime art are reused; no asset installation
or SQL migration is needed. Verified battles still require the previously shipped
migration 005 on older databases.

## Flow

1. After the opening story is watched/skipped, Rowan's guide asks the player to walk
   70 world units using keyboard or touch controls.
2. The gold arrow points at Rowan (X880). Talking to him plays a tutorial version
   of his existing first chapter and grants its existing reward once.
3. The existing Word Slime appears nearby at X1140. Enter its normal `battle.php`
   encounter. Rowan explains FIGHT, TRUE/FALSE, odd words, correct/wrong answers,
   Knowledge Focus and confirmed Herb purchases in a non-blocking coach panel.
   Questions remain continuous; the guide does not pause/reset server timers or
   alter combat HP, damage, rewards, question pools or prices.
4. After victory, return to Rowan and interact for a debrief. The forest quest
   continues. The debrief grants no additional reward and does not change chapters.

The map guide can be skipped at any stage; the battle coach has its own skip
button. Skipping hides the coach, retains chapter/coin/XP progress and restores the
slime's original X1435 position, without changing defeated state. Completed/skipped
lessons never respawn enemies. Run returns to the same lesson; defeat retains normal
retry behavior. The guide does not block portals or prevent later exploration.

## Persistence and compatibility

Guide checkpoints are `{version:1, stage, moveStartX}` in the existing
`player_game_saves.save_json` under `tutorial`. The API filters valid stages and
bounds the movement anchor; these values have no authority over combat rewards.
Map/battle saves and guest upgrades keep the same account/player ownership rules.
Older cached clients that omit `tutorial` retain its existing checkpoint.

The stages are MOVE, MEET, SLIME, BATTLE, RETURN, DONE, SKIPPED and LEGACY.
Existing checkpoints resume after reload. Accounts with no checkpoint enroll only
if the opening story is still new, the first chapter has not begun and the slime
has not been defeated. Other existing characters get LEGACY and continue their
current world, chapter, position and balances. To preview the complete tutorial,
create a new guest character rather than resetting an existing player.

## Files and validation

- `js/tutorial.js`: checkpoint rules, lesson spawn and map guide presentation.
- `js/rpg.js`, `js/battle.js`: existing story, map and battle integration.
- `includes/tutorial.php`, `api/game_state.php`: bounded persisted checkpoints.
- `includes/tutorial_guide.php`, `index.php`, `battle.php`, `css/style.css`,
  `js/i18n.js`: pixel UI and both languages.
- Node gameplay/audio/tutorial regressions; PHP checkpoint validation; isolated
  MySQL/MariaDB API checkpoint/ownership/guest-upgrade tests.

Browser acceptance must cover a fresh guest through the complete flow, map/battle
refresh, Run/retry, skip, mobile layout, both languages and an existing character.
Keep existing XAMPP player data out of the developer's isolated browser tests.

Local verification passed with real PHP, a separate MariaDB directory/port and
Chrome: fresh guest through the complete lesson, Run/re-entry, map/battle refresh,
correct/wrong answers, Herb, both languages, victory/debrief without bonus rewards,
skip persistence, an existing character, four realms, sounds and all three typing
stages. The develop-web-game Playwright client verified movement and the read-only
`render_game_to_text` snapshot with no console/page errors. Desktop and mobile
screenshots were inspected. The map now lists only existing background candidates
while preserving `images/world` precedence and the bundled fallback.
