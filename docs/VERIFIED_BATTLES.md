# Verified battle rollout (migration 005)

## Existing XAMPP installation

1. Export a backup of `english_power_quest` in phpMyAdmin.
2. Pull the code, select that database and import `database/migrations/005_verified_battles.sql`.
3. Confirm `verified_battles`, `verified_battle_events`, `verified_answer_attempts` exist.
4. Hard refresh (Ctrl+F5) and enter a battle from the map.

Migration 005 only creates new tables; it does not rewrite/delete players, saved maps,
accounts or ledgers. It can be imported again safely. New empty installations already
include the tables in `english_power_quest_schema.sql`. Never import the full schema over
existing players. Code updates do not execute SQL. Until 005 is applied, battle shows a
bilingual update message and permits returning to the map; no unverified reward fallback.

## Runtime contract

- `api/battle.php` derives the player from the authenticated PHP session and checks CSRF.
- START creates/resumes a durable battle ID for one of the five current encounters.
  Refresh restores HP, Knowledge Focus, status and the active question.
- QUESTION selects a trusted question and random token. Public responses omit answers,
  explanations and reward amounts. `data/questions.json` remains the trusted content source;
  the older SQL question/combat tables are not yet used by this runtime. [World-themed pools](THEMED_QUESTION_BANK.md) now provide80playable questions and player-scoped recent-history avoidance.
- ANSWER checks the issued snapshot and answer type. The server computes correctness,
  timeout, speed bonus, damage, XP, Coins and English Power. Correct answers never harm
  the player and reset the mistake streak. Consecutive wrong/timeout answers add3
  damage per additional mistake, capped at12 extra. Reload and healing preserve the streak.
- Knowledge Focus, stored potions, victory and Run update the same server battle.
  Buy healing25Coin/hint30Coin potions in the village shop before battle; new HERB
  purchases in battle are rejected. Healing consumes one owned bottle for up to40HP,
  without charging Coins. An open question pauses during item confirmation and resumes
  without selecting another question. See [supply and mistake rules](BATTLE_SUPPLIES_AND_MISTAKES.md).
- Every action has a request ID. Identical replays return the receipt; changed inputs
  under that ID return 409. An issued question can be answered only once, even with a
  new request ID. Attempts, balances, ledgers, state and receipts commit/roll back together.
- The client serializes actions and retries uncertain responses with the same ID. Keep
  the page open while the bilingual reconnect notice is visible. Reload restores durable
  state; it cannot reset HP or re-grant a completed victory's rewards.
- Attempts store question snapshots, submitted answers, correctness, timeouts and duration.
  Per-skill attempts, correct counts and accuracy are persisted. [Post-battle learning summaries](BATTLE_LEARNING_SUMMARY.md) now show saved mistakes and bilingual explanations.

## Remaining scope

NPC/typing rewards and progression now use [verified quests (migration 007)](VERIFIED_QUESTS_AND_XP.md).
The legacy arbitrary reward endpoint, including QUEST, is blocked. The public static question bank can still be read, and map
coordinates/encounter entry are not proven by the server. This prevents duplicate combat
settlement and forged combat reward amounts; it is not a complete anti-cheat system.

## Validation

- PHP/JavaScript syntax, Node gameplay/network-replay checks, PHP grading for all question types.
- Disposable MySQL 8 / MariaDB 10.4: guest ownership, CSRF, wrong/correct/timeout, metrics,
  repeat requests, payload conflicts, victory reload, insufficient funds, full HP,
  ledger rollback/retry, potion pause, streak damage/reset/cap, Run and legacy bypass rejection.
- Local browser checks use a separate PHP server and MariaDB data directory/port,
  without connecting to the user's existing XAMPP database.
