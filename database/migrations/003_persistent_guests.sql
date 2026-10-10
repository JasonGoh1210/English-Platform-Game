-- Run ONCE in phpMyAdmin against an EXISTING English Power Quest database.
-- Back up the database before importing. New installations using the latest
-- english_power_quest_schema.sql already have these tables and columns.
USE english_power_quest;

ALTER TABLE users
    ADD COLUMN account_type ENUM('password', 'guest', 'google') NOT NULL DEFAULT 'password' AFTER email,
    ADD COLUMN google_sub VARCHAR(255) NULL UNIQUE AFTER account_type;

CREATE TABLE guest_login_tokens (
    token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_guest_token_user (user_id),
    INDEX idx_guest_token_expiry (expires_at),
    CONSTRAINT fk_guest_token_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE player_game_saves (
    player_id BIGINT UNSIGNED PRIMARY KEY,
    save_json JSON NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_game_save_player FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE
);
