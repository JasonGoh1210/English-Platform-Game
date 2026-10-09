# English Power Quest — Code & Database Audit

Audit date: 2026-10-09
Scope: current `main` branch files, static review only. The code has not been executed against the user's local XAMPP/MySQL instance in this audit.

## Fixes applied in this pass

1. **Battle actions remain usable during continuous questions.** Added Skill, Item, and Run actions to the active question panel. Previously the main command menu was hidden after FIGHT, making those actions unavailable during most of the battle.
2. **Skill flow no longer unexpectedly returns to the hidden menu or triggers a free enemy turn.** Knowledge Focus now marks the next correct answer for +50% damage and starts the question flow if used before FIGHT.
3. **Healing Item flow stays in the current battle.** It no longer calls `showMenu()` on normal use and strand the player on a hidden question panel.
4. **Enemy victory no longer grants +2 English Power.** Enemy victories give XP and Coins; English Power remains connected to learning activities and the configured learning quest rewards.
5. **Question selection now respects enemy question-type rules.** The previous selection filtered by difficulty only, so Word Slime could receive Sentence Builder questions even though its intended pool excluded them.
6. **Player stats API stores its result set once.** This avoids repeatedly calling `get_result()` in the fetch loop.
7. **Reward ledger sources are validated independently.** `SHOP_PURCHASE` can now be recorded in the coin ledger without being incorrectly rewritten as `QUESTION` because it is not a valid XP source.
8. **Map quest rewards are sent to the PHP progress API, and the map reads DB balances when the player API is available.** LocalStorage is still used for map position, defeated map enemies, and quest step.
9. **Database schema improved.** Added a stable `questions.question_code` key to map JSON question IDs to database questions, and a foreign key from `enemies.difficulty_code` to `difficulties.difficulty_code`.
10. **Battle sprite source aligned.** Battle JavaScript now selects the same uploaded PNG file used by the page instead of replacing it with the earlier SVG.

## Remaining high-priority issues

### P0 — Reward API trusts client-supplied amounts

`api/save_progress.php` accepts `xpDelta`, `coinDelta`, `englishPowerDelta`, and `sourceType` from the browser. A user can send their own POST request and grant arbitrary repeated rewards. This is acceptable only for a local prototype, not a production or multi-user game.

**Recommended replacement:** add a server-authoritative `api/submit_answer.php`. It should accept a question code and submitted answer, validate against trusted server-side question data, determine first/repeat rewards, update mastery and accuracy, and write the corresponding ledgers inside one transaction. The browser should not decide reward amounts.

### P0 — Every API call uses the same hard-coded demo player

`api/bootstrap.php` resolves the player by username `demo`; there is no completed login flow or authenticated player identity. If multiple students use this build, they will share the same database character.

**Recommended replacement:** implement login/logout using `password_hash` / `password_verify`, regenerate the PHP session ID after login, and resolve `player_id` from the authenticated session. Do not accept a client-supplied player ID as authority.

### P1 — Question and enemy content are not yet database-driven

- Battle questions are loaded from `data/questions.json`.
- Enemy values are duplicated in `js/rpg.js`, `js/battle.js`, and `data/enemies.json`.
- The SQL schema defines `questions`, `question_options`, `enemies`, and pools, but the demo seed does not import the actual JSON question set or all map enemies.
- The new `question_code` column establishes a mapping, but an importer/API has not been added yet.

**Recommended replacement:** choose one content source. For the final full-stack build, use an idempotent import script to load JSON into MySQL, serve active question/enemy data from PHP APIs, and keep the JSON files as authoring/import data rather than a second runtime source.

### P1 — Combat records and learning analytics are not being populated

The schema has `combat_sessions`, `combat_attempts`, `player_question_mastery`, and per-skill statistics. Current battle calls only the balance API for rewards. It does not open/finish a DB combat session or write each correct, wrong, and timed-out answer. As a result, attempt counts, accuracy, mastery, and battle history will remain incomplete.

**Recommended replacement:** once server-side answer validation is implemented, record every answer (including wrong/time-out answers), combat start/end, damage, and rewards in the same transaction where possible.

### P1 — Quest state is still browser-local

Quest rewards are now sent to PHP, but `questStep`, map position, and defeated map enemy IDs still rely on LocalStorage. Clearing browser data can reset those flags and may allow the same quest reward to be claimed again.

**Recommended replacement:** persist quest progress and map/world progress in `player_quest_progress` and `player_world_progress`, with a server-side unique claim/transaction rule.

### P1 — Inventory is not a real inventory yet

The battle Healing Herb currently behaves as a direct 5-Coin purchase and immediate heal. It does not decrement a row in `inventory`, even though items/inventory tables exist.

**Recommended replacement:** either label this explicitly as “Buy & use Healing Herb”, or implement shop purchase and item use against the `inventory` table.

### P1 — Error responses expose internal exception messages

The APIs return `$e->getMessage()` to the browser. That is useful during local development, but can expose database/table details. Log technical details server-side and return a generic public error in a deployed build.

### P1 — Database connection defaults are development-only

`config/db.php` uses the XAMPP-style `root` user with an empty password. That may be normal for a local test setup, but must be replaced with a restricted database user and private configuration before deployment.

## Database design recommendations

- Keep `players.xp_total`, `coins_total`, and `skill_points_total` as cached balances, but treat transaction tables as the audit trail. Update both atomically.
- Keep `player_english_stats.current_power` for fast display and update attempts/correct/accuracy in the same answer transaction.
- Add idempotency/unique keys for answer submissions and reward claims so network retries cannot award the same event twice.
- Add a migration process for existing databases. Do **not** repeatedly import the full `english_power_quest_schema.sql` into a database that already has tables.
- Before production, use session-based player identity, validate all rewards server-side, and add foreign keys/unique constraints for any new content links.

## What should be replaced, and what should stay

- **Keep:** PHP + MySQL for persistent accounts/progress, HTML/CSS for the UI, and JSON as a convenient content-authoring format during development.
- **Replace next:** browser-authoritative rewards with server-validated answer submissions; hard-coded demo identity with login/session identity; LocalStorage quest claims with database-backed quest progress.
- **Consider later:** move the map and battle into Phaser Scenes so scene changes no longer reload separate PHP pages. Do this after the reward/API/data model is stable; it is a larger refactor and is not required to fix the current issues.
- **Do not replace everything at once:** first complete server-authoritative answer submission, then import content and record combat history, then migrate rendering/scenes if time allows.

## Verification status

The files on GitHub were inspected and patched, but live browser behaviour and SQL migration execution still need testing on the user's local XAMPP/MySQL installation. The migration file below applies only to an older database schema that does not yet have the new question code and difficulty foreign key:
`database/migrations/001_question_codes_and_difficulty_fk.sql`.
