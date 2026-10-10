USE english_power_quest;

-- Record whether each player's opening story has been completed.
-- Run this once against an existing database before using register/login.
ALTER TABLE players
    ADD COLUMN story_intro_seen TINYINT(1) NOT NULL DEFAULT 0
    AFTER current_world_id;
