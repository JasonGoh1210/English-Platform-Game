# English Platform Game

## English Power Quest

A mobile-friendly fantasy RPG prototype that teaches English through exploration, battles and progression.

## Current implementation

- Four independent Canvas realms with keyboard/touch movement, fixed portals and bilingual world names
- NPC dialogue, opening/chapter story, Echo Cave and the three-stage Typing Cavern
- Separate PHP battle page with continuous English questions
- True/False, Odd Word Out and Sentence Builder question types
- 80 playable themed questions across four realms, bilingual explanations, shuffled words and recent-question avoidance (99 total including legacy content)
- Battle rewards, HP, Coins, XP and English Power
- Sign up, login and logout with PHP sessions; passwords are stored with `password_hash`
- Each new account receives a player profile and starts with the opening story; story completion is saved to MySQL
- Returning users who have completed the opening story go straight to the map
- Persistent guest accounts with a 30-day browser recovery cookie; upgrading keeps the same character and progress
- MySQL stores map/quest snapshots, player balances and opening-story completion; LocalStorage provides a per-player cache
- Failed map writes retain a pending browser snapshot and retry; an unconfirmed snapshot is restored before older online state
- Healing Herb restores HP only after a confirmed 5-Coin purchase; the current question resumes after the purchase
- Server-issued battle questions, server grading/damage/rewards, durable HP and idempotent action receipts
- Persisted correct/wrong/timeout attempts and per-skill accuracy
- Post-battle learning summary with saved mistakes, correct answers, bilingual explanations and pagination
- Learning journal with real question counts, owned historical mistakes and untimed server-graded practice
- Settings pause freezes the server's battle timer, survives reload and resumes the same question
- Self-paced ordinary realm battles; optional Echo Cave encounters retain timed challenges
- Three-level Word Power skill branch with permanent, server-validated Skill Point purchases and vocabulary attack bonuses
- Sentence Builder supports removing selected words, clearing the sentence and blocking incomplete submissions
- One gated pixel cave/tower challenge per realm, distinct interior guardians and saved interior positions; outdoor victory unlocks access
- Grounded portal/entrance artwork, internal exit doors and continuous pixel stone floors
- Six persistent companion looks with following and next-task guidance, plus a Coin shop for stored healing potions (+40 HP)
- Three distinct outfits per gender: original shadow adventurer, ranger and star mage, with dedicated walking frames
- All realm portals are fixed at the left (X220); Word Cavern uses one guardian across three spelling rounds with pixel victory/defeat screens
- First-login character creation with saved name, dice, gender and three sprite palettes
- Google Identity Services sign-in and same-player binding, enabled by a local Client ID

Combat, NPC chapter and typing rewards now use server grading and replay-safe receipts. Map coordinates and exploration snapshots remain browser-reported, with per-player LocalStorage used to recover unconfirmed saves.

See [skill progression and combat pacing](docs/SKILLS_AND_COMBAT_PACING.md) for unlock costs, saved data, verification and remaining GDD priorities.
See [realm dungeons and typing UI](docs/REALM_DUNGEONS_AND_TYPING_UI.md) for entrances, guardians, unlock compatibility, the moved ruins portal and the twelve asset paths.
See [companions, shop and distinct heroes](docs/COMPANIONS_SHOP_AND_HEROES.md) for prices, inventory safety, grounded sprites, new hero frames and all twelve added asset paths.

## Run locally with XAMPP

1. Put the repository under your XAMPP-served folder, or configure your Apache Alias to point to the repository.
2. Start Apache and MySQL.
3. Open `http://localhost/FYP/index.php` (adjust `/FYP` if your Alias differs).

The project uses paths beginning with `/FYP/`, so if you use a different URL prefix, update those paths consistently in PHP, JavaScript and CSS.

## Database setup

For a **new, empty local database**, import `database/english_power_quest_schema.sql` once using phpMyAdmin. It already includes the Story flag, persistent guest tables, map saves, four worlds, verified battles, character profiles and verified quest rewards. Register through `register.php` or create a guest through `login.php`.

Do not also run migrations 001–007 on this new schema: their changes are already included. `database/demo_seed.sql` is an optional development fixture, not an installation requirement or an upgrade script. Its demo user has no password and is not a playable password login.

Check `config/db.php` for the local MySQL credentials.

For an **existing database**, export a backup first and inspect its columns/tables. Apply only missing migrations in order: 001 for older question schemas, 002 for `players.story_intro_seen`, 003 for guest identities/map saves, then 004 for the four world records, 005 for verified battles, 006 for character profiles and 007 for verified NPC/typing progression. Never reimport the full schema or demo seed over existing players. See [`docs/GUEST_ACCOUNTS_AND_DATABASE.md`](docs/GUEST_ACCOUNTS_AND_DATABASE.md).

`git pull origin main` updates files; it does not execute SQL. Verified battles require migration 005 on existing databases; see [`docs/VERIFIED_BATTLES.md`](docs/VERIFIED_BATTLES.md). First-login setup requires migration 006; [Google login and character setup](docs/GOOGLE_SIGNIN_AND_CHARACTERS.md) explains the safe update and Client ID configuration. NPC/typing progression requires migration 007; see [safe quest update and XP HUD](docs/VERIFIED_QUESTS_AND_XP.md). No image installation is required.

Map and battle Settings now include pixel sound effects, volume and a Test Sound button. Click/touch or press a key to enable browser audio. No sound files or SQL migration are required; see [Sound effects](docs/SOUND_EFFECTS.md).

New characters now learn movement and their first village battle with Elder Rowan. The guide saves progress, supports skipping and preserves existing characters. See [First adventure tutorial](docs/FIRST_ADVENTURE_TUTORIAL.md).

The quest HUD now names the next NPC/world and points toward the target or the current world's portal. [Quest guidance and caves](docs/QUEST_GUIDANCE_AND_CAVES.md) explains the optional three-room Echo Cave, two new monsters and the original three-round spelling finale with changing monster artwork. No new SQL migration or image installation is required.

[Pixel art and interface update](docs/PIXEL_ART_AND_UI.md) lists the new native 64×64 NPC/enemy/portal PNGs with 32×32 ground tiles, quieter four-world backgrounds and the dark destination/battle UI. Original player sprites and the selected 32px Rowan file remain unchanged; Rowan now has a matching 64px variant; old background files remain as fallbacks. New assets arrive with Git, with no SQL migration.

## Validation

Run PHP syntax checks, `node --check js/rpg.js`, `node --check js/battle.js`, and `node --test tests/*.test.cjs` and `php tests/battle_rules_test.php`, `node --test tests/characters.test.cjs`, `php tests/google_token_test.php`. CI checks gameplay regressions and the guest/save/upgrade and verified combat/quest flows on MySQL 8 and MariaDB 10.4. These checks do not verify the actual browser artwork or a complete playthrough.

Latest reproduced issues and input fixes: [Project check, 2026-10-14](docs/PROJECT_CHECK_2026-10-14.md). Settings support native keyboard controls; lost focus releases movement, and dialogue supports Space/Enter with focus restoration. [Optimization review, 2026-10-13](docs/OPTIMIZATION_REVIEW_2026-10-13.md) and [UI and gameplay follow-up](docs/UI_GAMEPLAY_REVIEW_2026-10-13.md) retain historical findings and follow-up progress.

[Battle learning summary](docs/BATTLE_LEARNING_SUMMARY.md) explains the new victory/defeat review, preserved historical records and update steps. No new SQL migration is required.

[Four-world themed question bank](docs/THEMED_QUESTION_BANK.md) lists the 20 questions per realm and repeat rules. Existing active questions and historical explanations remain valid; no new SQL migration.

## Known gaps before a final FYP release

- Map coordinates and local monster approach remain browser-reported; server quest validation does not prove movement.
- Keep the server's JSON question bank authoritative; any future MySQL content import must remain consistent with issued questions and historical review snapshots.
- Add mastery calculations and a dedicated skill progression view; the journal currently tracks battle records and untimed historical practice.
- NPC and typing rewards now use server grading, chapter order and replay-safe receipts; the legacy arbitrary reward endpoint is closed.
- Use a restricted MySQL account and avoid returning raw exception messages outside local development.

See [`docs/CODE_DATABASE_AUDIT.md`](docs/CODE_DATABASE_AUDIT.md) for the historical audit; its older authentication and persistence descriptions have been superseded by the guest-account documentation.

## Main folders

- `index.php`, `battle.php`: map and battle pages
- `js/`: Canvas movement and battle logic
- `css/style.css`: game UI
- `data/`: JSON question/enemy/level/skill/world content
- `api/`: PHP JSON endpoints
- `config/db.php`: MySQL connection
- `database/`: schema, demo seed and migrations
- `assets/player/`: player sprites

## Design principle

**Level up your character. Level up yourself.**

Core emotional outcome: **I GOT STRONGER.**

[Pixel story UI and building scale](docs/PIXEL_STORY_UI.md) documents matching dialogue/story NPC portraits, larger pixel architecture and the refreshed opening/chapter UI. No SQL migration or player reset is required.

[Layout review and NPC portraits](docs/LAYOUT_REVIEW_AND_PORTRAITS.md) lists the four native 256x256 upper-body portraits, smaller unobstructed signs and centered battle questions. Map sprites, portal coordinates, saved positions and combat rules remain intact.

[Learning journal and settings pause](docs/LEARNING_JOURNAL_AND_PAUSE.md) connects the map book to real recorded question counts, historical mistakes and three practice types, and adds server-backed battle pause/resume. No SQL migration or player reset is required.
