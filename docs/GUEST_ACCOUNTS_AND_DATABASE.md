# Persistent guest accounts, story and MySQL database

## Implemented behavior

- Each guest gets a unique users row (`account_type='guest'`) and an initialized players row with `story_intro_seen=0`.
- The first authenticated visit asks for a name, appearance and gender, then displays the same opening Story as registration. Story completion updates `players.story_intro_seen` for **both** account types.
- Anonymous resume uses a 256-bit random cookie `epq_guest_resume` (30-day expiry, HttpOnly, SameSite=Lax, Secure when HTTPS). MySQL stores only the SHA-256 token hash in `guest_login_tokens`.
- Closing the browser normally preserves the recovery cookie. Explicit "退出游客模式" revokes all that guest's tokens and clears the recovery cookie. Clearing browser cookies loses automatic access; this is intentionally not a transferable password.
- Map data (`player_game_saves`), selected world (`players.current_world_id`), explored worlds (`player_world_progress`), XP, coins, English skills and opening Story are stored in MySQL. Browser localStorage is only a per-player cache.
- A guest may open **升级账号** in the map to set a username/password and optional email. The existing users.user_id and players.player_id are preserved, so the map, story, quests, XP and transaction ledgers stay attached to the same character. Guest recovery tokens are revoked on upgrade.
- Passwords use PHP `password_hash`, not plaintext. Google Identity Services sign-in and linking now verify signed ID tokens on the server, use stable `google_sub`, and store verified email. A Client ID is required to enable the button. Existing accounts and guest upgrades retain the same player; see [configuration and character setup](GOOGLE_SIGNIN_AND_CHARACTERS.md). Never store Gmail passwords.

## Updating an existing local database (XAMPP / phpMyAdmin)

1. **Back up `english_power_quest`** through phpMyAdmin's Export before changing anything.
2. Confirm that `database/migrations/002_auth_story_progress.sql` is already applied (the players table should include `story_intro_seen`). Do not re-run 002 if the column exists.
3. In phpMyAdmin, select database `english_power_quest`. Run/import `database/migrations/003_persistent_guests.sql` once.
4. Then run/import `database/migrations/004_four_worlds.sql`. This inserts the four active world records.
5. For verified battles, import `database/migrations/005_verified_battles.sql` after the backup. It only creates three new tables and preserves existing data.
6. Import `database/migrations/006_character_profiles.sql` for first-login naming, gender and appearance. This creates one new table without changing old characters.
7. `git pull origin main` updates PHP/JS/SQL *files*, but **does not execute SQL against your local MySQL**.
8. Keep the project's Apache alias `/FYP` and XAMPP running. Visit `http://localhost/FYP/login.php`.

For a new empty database, import the latest `database/english_power_quest_schema.sql` once instead of 003/004/005/006. **Never** import the full schema into an existing database; it contains CREATE TABLE and sample seed inserts.

## Verification queries

```sql
USE english_power_quest;
SHOW COLUMNS FROM users;
SHOW COLUMNS FROM players;
SHOW TABLES LIKE 'guest_login_tokens';
SHOW TABLES LIKE 'player_game_saves';
SELECT world_id, world_order, world_name FROM worlds ORDER BY world_order;
SELECT u.user_id, u.account_type, u.username, u.email,
       p.player_id, p.display_name, p.story_intro_seen, p.current_world_id,
       p.level_no, p.xp_total, p.coins_total
FROM users u
JOIN players p ON p.user_id = u.user_id
ORDER BY u.user_id DESC;
```

## Acceptance test

1. From login.php, create a guest, then choose a unique name, appearance and gender on the character page. Verify a users guest row, a players row, and `story_intro_seen=0`.
2. Finish or skip the opening Story. Verify `story_intro_seen=1`.
3. Walk, teleport and earn XP; verify `player_game_saves` and player balances change.
4. Close **all** browser windows without pressing logout, reopen the same browser within 30 days, visit /FYP/login.php. Guest should resume with the same player_id and Story should not replay.
5. From the map, click **升级账号**, set a username and password, optionally email. Verify account_type=password, identical user_id/player_id and unchanged XP/coins/Story; old guest cookie is revoked.
6. Log out and log back in with the new username/password. Confirm the same profile returns.
7. Explicit guest logout revokes persistent recovery. Logging out is *not* the same as merely closing the browser.

GitHub Actions runs PHP/JavaScript syntax checks, gameplay regression tests and guest-flow smoke tests on MySQL 8 and MariaDB 10.4 on pushes to main, including a simulated existing-schema migration.

## Save failure handling

- A failed map save remains marked as pending in the player's browser cache. The latest snapshot is retried after five seconds and survives a reload. Older online map state does not overwrite this pending snapshot.
- If the initial online map read fails, the game retries that read before writing a default map. Navigation into battle waits for the queued map write, and pending battle outcomes remain cached for the map to retry.
- A visible bilingual message reports unconfirmed map writes or rewards. A confirmed map write clears only the map warning; it does not imply that a failed reward was saved.
- Healing Herb waits for a successful server purchase before restoring HP. Answer buttons and the countdown pause while the purchase is pending, then resume the same question. Repeated item clicks cannot start another simultaneous purchase.
- A rejected insufficient-funds purchase returns HTTP 409 without changing balances. Failed balance/ledger statements roll back the entire reward transaction.
- Battle rewards, damage and Herb purchases are server-computed. Uncertain battle responses replay the same request ID and cannot duplicate charges/rewards. NPC/typing QUEST rewards still use the legacy client flow and are not automatically retried. See [verified battles](VERIFIED_BATTLES.md).
- Story chapters advance through Rowan, Mira, Tala and Kai. Defeating Word Slime does not skip Mira's chapter. Existing saved quest steps are preserved; this update does not reset characters who already reached a later chapter.

## Security and limitations

This is a browser-bound guest account. Anyone with access to the same browser session can use it; use HTTPS in production. A stolen raw bearer cookie could resume that guest until it expires or is revoked. Account recovery requires upgrading to a password account or binding Google. Password email verification is not implemented. Google sign-in is available after configuration; it verifies the token and does not merge accounts just because their emails match.

Battle answers, HP, rewards, attempts and accuracy are now server-verified and transactionally replay-safe. NPC/typing QUEST claims and map/quest state remain client-reported; the save endpoint validates shape and bounds, not proof of location or quest completion. Complete those remaining checks before treating all game progression as server-authoritative.
