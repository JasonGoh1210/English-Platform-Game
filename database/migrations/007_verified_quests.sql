-- Export a backup first. Additive: no old balances, names, saves or accounts are changed.
USE english_power_quest;
CREATE TABLE IF NOT EXISTS verified_story_progress (
    player_id BIGINT UNSIGNED PRIMARY KEY,
    chapter_step TINYINT UNSIGNED NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS verified_quest_claims (
    player_id BIGINT UNSIGNED NOT NULL,
    claim_key VARCHAR(120) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (player_id, claim_key),
    FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS verified_typing_runs (
    run_id CHAR(32) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    player_id BIGINT UNSIGNED NOT NULL,
    state_json JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_typing_owner (player_id),
    FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS verified_quest_events (
    player_id BIGINT UNSIGNED NOT NULL,
    request_id CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    payload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    response_json JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (player_id, request_id),
    FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE
);
-- Snapshot already completed chapters ONCE. Reimport never resets verified progression.
INSERT IGNORE INTO verified_story_progress (player_id, chapter_step)
SELECT p.player_id,
    GREATEST(CASE WHEN JSON_VALID(s.save_json) AND JSON_UNQUOTE(JSON_EXTRACT(s.save_json, '$.questStep')) REGEXP '^[0-5]$'
         THEN CAST(JSON_UNQUOTE(JSON_EXTRACT(s.save_json, '$.questStep')) AS UNSIGNED) ELSE 0 END, COALESCE(legacy.chapter_step,0))
FROM players p LEFT JOIN player_game_saves s ON s.player_id = p.player_id
LEFT JOIN (SELECT player_id, MAX(CASE description
    WHEN 'Story chapter completed: The First Words' THEN 1
    WHEN 'Story chapter completed: Words in the Woods' THEN 2
    WHEN 'Story chapter completed: A Promise by Firelight' THEN 3
    WHEN 'Story chapter completed: The Language of the Lost' THEN 4
    WHEN 'Story ending: The First Real Conversation' THEN 5 ELSE 0 END) AS chapter_step
    FROM player_xp_transactions WHERE source_type='QUEST' GROUP BY player_id) legacy ON legacy.player_id=p.player_id;
