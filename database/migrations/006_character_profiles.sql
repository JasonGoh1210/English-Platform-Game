-- Back up english_power_quest before importing this additive migration.
-- Existing accounts have no row and retain their original character/progress.
USE english_power_quest;
CREATE TABLE IF NOT EXISTS player_character_profiles (
    player_id BIGINT UNSIGNED PRIMARY KEY,
    appearance ENUM('shadow', 'forest', 'arcane') NOT NULL DEFAULT 'shadow',
    gender ENUM('male', 'female') NULL,
    setup_completed TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_character_profile_player FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE
);
