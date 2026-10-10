# Persistent guest accounts, story and MySQL database

## Implemented behavior

- Each guest gets a unique users row (`account_type='guest'`) and an initialized players row with `story_intro_seen=0`.
- The first visit displays the same opening Story as registration. Story completion updates `players.story_intro_seen` for **both** account types.
- Anonymous resume uses a 256-bit random cookie `epq_guest_resume` (30-day expiry, HttpOnly, SameSite=Lax, Secure when HTTPS). MySQL stores only the SHA-256 token hash in `guest_login_tokens`.
- Closing the browser normally preserves the recovery cookie. Explicit "退出游客模式" revokes all that guest's tokens and clears the recovery cookie. Clearing browser cookies loses automatic access; this is intentionally not a transferable password.
- Map data (`player_game_saves`), selected world (`players.current_world_id`), explored worlds (`player_world_progress`), XP, coins, English skills and opening Story are stored in MySQL. Browser localStorage is only a per-player cache.
- A guest may open **升级账号** in the map to set a username/password and optional email. The existing users.user_id and players.player_id are preserved, so the map, story, quests, XP and transaction ledgers stay attached to the same character. Guest recovery tokens are revoked on upgrade.
- Passwords use PHP `password_hash`, not plaintext. No Google OAuth is implemented yet: the nullable `google_sub` field is schema preparation only. When Google sign-in is implemented, verify the Google ID token on the server, use its stable `sub`, and store the verified email in `users.email`. Never store Gmail passwords.

## Updating an existing local database (XAMPP / phpMyAdmin)

1. **Back up `english_power_quest`** through phpMyAdmin's Export before changing anything.
2. Confirm that `database/migrations/002_auth_story_progress.sql` is already applied (the players table should include `story_intro_seen`). Do not re-run 002 if the column exists.
3. In phpMyAdmin, select database `english_power_quest`. Run/import `database/migrations/003_persistent_guests.sql` once.
4. Then run/import `database/migrations/004_four_worlds.sql`. This inserts the four active world records.
5. `git pull origin main` updates PHP/JS/SQL *files*, but **does not execute SQL against your local MySQL**.
6. Keep the project's Apache alias `/FYP` and XAMPP running. Visit `http://localhost/FYP/login.php`.

For a new empty database, import the latest `database/english_power_quest_schema.sql` once instead of 003/004. **Never** import the full schema into an existing database; it contains CREATE TABLE and sample seed inserts.

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

1. From login.php, create a guest with a unique name. Verify a users guest row, a players row, and `story_intro_seen=0`.
2. Finish or skip the opening Story. Verify `story_intro_seen=1`.
3. Walk, teleport and earn XP; verify `player_game_saves` and player balances change.
4. Close **all** browser windows without pressing logout, reopen the same browser within 30 days, visit /FYP/login.php. Guest should resume with the same player_id and Story should not replay.
5. From the map, click **升级账号**, set a username and password, optionally email. Verify account_type=password, identical user_id/player_id and unchanged XP/coins/Story; old guest cookie is revoked.
6. Log out and log back in with the new username/password. Confirm the same profile returns.
7. Explicit guest logout revokes persistent recovery. Logging out is *not* the same as merely closing the browser.

## Security and limitations

This is a browser-bound guest account. Anyone with access to the same browser session can use it; use HTTPS in production. A stolen raw bearer cookie could resume that guest until it expires or is revoked. Full account recovery requires upgrading to a password account. No email verification or Google sign-in exists yet.

The current gameplay still reports rewards and some quest/map state from client-side JavaScript. The save endpoint validates shape and bounds but does **not** fully prove that every answer, XP reward or quest step was earned. A production-grade game should issue server-verified question sessions, idempotent reward events and replay-resistant transactions.
