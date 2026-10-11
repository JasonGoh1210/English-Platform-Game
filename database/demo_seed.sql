USE english_power_quest;

-- Optional fixtures for a NEW test database only. This is not an upgrade script.
-- The demo user has no password; register a real account through register.php.

INSERT INTO users (username, email)
VALUES ('demo', 'demo@example.local')
ON DUPLICATE KEY UPDATE username = VALUES(username);

INSERT INTO players (user_id, display_name, level_no, xp_total, coins_total, skill_points_total, current_world_id)
SELECT u.user_id, 'Rookie', 1, 0, 0, 0, w.world_id
FROM users u CROSS JOIN worlds w
WHERE u.username='demo' AND w.world_order=1
ON DUPLICATE KEY UPDATE display_name=VALUES(display_name);

INSERT INTO player_world_progress (player_id, world_id, status, unlocked_at)
SELECT p.player_id, w.world_id, 'UNLOCKED', CURRENT_TIMESTAMP
FROM players p
JOIN users u ON u.user_id=p.user_id
JOIN worlds w ON w.world_order=1
WHERE u.username='demo'
ON DUPLICATE KEY UPDATE status='UNLOCKED';

INSERT INTO player_english_stats (player_id, english_skill_id)
SELECT p.player_id, es.english_skill_id
FROM players p
JOIN users u ON u.user_id=p.user_id
CROSS JOIN english_skills es
WHERE u.username='demo'
ON DUPLICATE KEY UPDATE player_id=VALUES(player_id);

INSERT INTO items (item_name, item_type, description, effect_value, coin_price, is_shop_available)
VALUES ('Healing Herb','HP_POTION','Restore 20 HP during battle.',20,5,TRUE)
ON DUPLICATE KEY UPDATE item_name=VALUES(item_name);
