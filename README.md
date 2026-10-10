# English Platform Game

## English Power Quest

A mobile-friendly fantasy RPG prototype that teaches English through exploration, battles and progression.

## Current implementation

- Canvas-based exploration map with keyboard and touch movement
- NPC dialogue and map events
- Separate PHP battle page with continuous English questions
- True/False, Odd Word Out and Sentence Builder question types
- Battle rewards, HP, Coins, XP and English Power
- Sign up, login and logout with PHP sessions; passwords are stored with `password_hash`
- Each new account receives a player profile and starts with the opening story; story completion is saved to MySQL
- Returning users who have completed the opening story go straight to the map
- LocalStorage still stores map position, defeated map enemies and quest-step flags
- MySQL stores account/player records and opening-story completion; some gameplay progress remains browser-local

> This is still a prototype. Some game APIs/reward flows may still rely on client-supplied values and LocalStorage, so not all progress is server-authoritative. Do not deploy this version as a public multi-user game without a full security and data-persistence audit.

## Run locally with XAMPP

1. Put the repository under your XAMPP-served folder, or configure your Apache Alias to point to the repository.
2. Start Apache and MySQL.
3. Open `http://localhost/FYP/index.php` (adjust `/FYP` if your Alias differs).

The project uses paths beginning with `/FYP/`, so if you use a different URL prefix, update those paths consistently in PHP, JavaScript and CSS.

## Database setup

For a **new, empty local database**, import in this order using phpMyAdmin:

1. `database/english_power_quest_schema.sql`
2. `database/demo_seed.sql`
3. `database/migrations/002_auth_story_progress.sql` (adds the opening-story completion flag)

Check `config/db.php` for the local MySQL credentials.

If you already imported the database schema, back up the database first. Run `database/migrations/002_auth_story_progress.sql` once if the `players.story_intro_seen` column does not exist. Do not run the same migration more than once. The older `001_question_codes_and_difficulty_fk.sql` migration is only for databases that predate that change; review the schema before applying it.

## Known gaps before a final FYP release

- Replace client-supplied reward deltas with server-side answer validation.
- Import `data/questions.json` and `data/enemies.json` into MySQL (or establish one authoritative runtime source).
- Persist answer attempts, accuracy, mastery, combat sessions and quest claims in the database.
- Replace LocalStorage quest/reward state with DB-backed progress and idempotent reward claims.
- Use a restricted MySQL account and avoid returning raw exception messages outside local development.

See [`docs/CODE_DATABASE_AUDIT.md`](docs/CODE_DATABASE_AUDIT.md) for the code/database audit and priorities.

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
