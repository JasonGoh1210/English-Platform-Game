-- Existing installations: export a backup before importing this file.
-- Additive only: no existing player, save or ledger is rewritten.
-- New installations already include these tables in the full schema.
USE english_power_quest;

CREATE TABLE IF NOT EXISTS verified_battles (
    battle_id CHAR(32) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    player_id BIGINT UNSIGNED NOT NULL,
    enemy_code VARCHAR(60) NOT NULL,
    state_json JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_verified_battle_player (player_id, updated_at),
    CONSTRAINT fk_verified_battle_player FOREIGN KEY (player_id) REFERENCES players(player_id)
);

CREATE TABLE IF NOT EXISTS verified_battle_events (
    battle_id CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    request_id CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    payload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    response_json JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (battle_id, request_id),
    CONSTRAINT fk_verified_event_battle FOREIGN KEY (battle_id) REFERENCES verified_battles(battle_id)
);

CREATE TABLE IF NOT EXISTS verified_answer_attempts (
    attempt_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    battle_id CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    question_token CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    question_code VARCHAR(60) NOT NULL,
    question_json JSON NOT NULL,
    answer_json JSON NOT NULL,
    is_correct BOOLEAN NOT NULL,
    timed_out BOOLEAN NOT NULL,
    elapsed_ms INT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_verified_answer (battle_id, question_token),
    CONSTRAINT fk_verified_answer_battle FOREIGN KEY (battle_id) REFERENCES verified_battles(battle_id)
);
