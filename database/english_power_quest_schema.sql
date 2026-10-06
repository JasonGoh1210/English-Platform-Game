-- ============================================================
-- ENGLISH POWER QUEST
-- MySQL 8.0 Database Schema
-- GDD v0.2 aligned
-- ============================================================

CREATE DATABASE IF NOT EXISTS english_power_quest
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE english_power_quest;

-- ============================================================
-- 1. USERS / WORLDS / PLAYERS
-- ============================================================

CREATE TABLE users (
    user_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NULL,
    email VARCHAR(120) NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE worlds (
    world_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    world_name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    world_order INT UNSIGNED NOT NULL UNIQUE,
    required_level INT UNSIGNED NOT NULL DEFAULT 1,
    prerequisite_world_id INT UNSIGNED NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_world_prerequisite
        FOREIGN KEY (prerequisite_world_id) REFERENCES worlds(world_id)
);

CREATE TABLE players (
    player_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL UNIQUE,
    display_name VARCHAR(50) NOT NULL,
    level_no INT UNSIGNED NOT NULL DEFAULT 1,
    xp_total INT UNSIGNED NOT NULL DEFAULT 0,
    coins_total INT UNSIGNED NOT NULL DEFAULT 0,
    skill_points_total INT UNSIGNED NOT NULL DEFAULT 0,
    current_world_id INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_players_user
        FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT fk_players_world
        FOREIGN KEY (current_world_id) REFERENCES worlds(world_id)
);

-- ============================================================
-- 2. ENGLISH SKILLS
-- ============================================================

CREATE TABLE english_skills (
    english_skill_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    skill_code VARCHAR(40) NOT NULL UNIQUE,
    skill_name VARCHAR(80) NOT NULL,
    description VARCHAR(255) NULL,
    sort_order INT UNSIGNED NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE player_english_stats (
    player_id BIGINT UNSIGNED NOT NULL,
    english_skill_id INT UNSIGNED NOT NULL,
    current_power INT UNSIGNED NOT NULL DEFAULT 0,
    total_attempts INT UNSIGNED NOT NULL DEFAULT 0,
    correct_attempts INT UNSIGNED NOT NULL DEFAULT 0,
    accuracy_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (player_id, english_skill_id),

    CONSTRAINT fk_pes_player
        FOREIGN KEY (player_id) REFERENCES players(player_id),
    CONSTRAINT fk_pes_skill
        FOREIGN KEY (english_skill_id) REFERENCES english_skills(english_skill_id)
);

-- ============================================================
-- 3. QUESTION SYSTEM
-- ============================================================

CREATE TABLE question_types (
    question_type_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    type_code VARCHAR(40) NOT NULL UNIQUE,
    type_name VARCHAR(80) NOT NULL,
    description VARCHAR(255) NULL
);

CREATE TABLE difficulties (
    difficulty_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    difficulty_code VARCHAR(20) NOT NULL UNIQUE,
    difficulty_name VARCHAR(30) NOT NULL,
    time_limit_seconds INT UNSIGNED NOT NULL,
    xp_reward INT UNSIGNED NOT NULL,
    coin_reward INT UNSIGNED NOT NULL,
    english_power_reward INT UNSIGNED NOT NULL,
    repeat_xp_multiplier DECIMAL(4,2) NOT NULL DEFAULT 0.50,
    repeat_coin_multiplier DECIMAL(4,2) NOT NULL DEFAULT 0.50,
    repeat_english_power_reward INT UNSIGNED NOT NULL DEFAULT 0
);

CREATE TABLE questions (
    question_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    question_type_id INT UNSIGNED NOT NULL,
    primary_skill_id INT UNSIGNED NOT NULL,
    difficulty_id INT UNSIGNED NOT NULL,
    question_text TEXT NOT NULL,
    prompt_text TEXT NULL,
    answer_text TEXT NULL,
    explanation TEXT NULL,
    media_url VARCHAR(500) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_questions_type
        FOREIGN KEY (question_type_id) REFERENCES question_types(question_type_id),
    CONSTRAINT fk_questions_skill
        FOREIGN KEY (primary_skill_id) REFERENCES english_skills(english_skill_id),
    CONSTRAINT fk_questions_difficulty
        FOREIGN KEY (difficulty_id) REFERENCES difficulties(difficulty_id),

    INDEX idx_questions_lookup (question_type_id, difficulty_id, primary_skill_id, is_active)
);

CREATE TABLE question_skill_map (
    question_id BIGINT UNSIGNED NOT NULL,
    english_skill_id INT UNSIGNED NOT NULL,
    skill_role ENUM('PRIMARY','SECONDARY') NOT NULL DEFAULT 'SECONDARY',

    PRIMARY KEY (question_id, english_skill_id),

    CONSTRAINT fk_qsm_question
        FOREIGN KEY (question_id) REFERENCES questions(question_id) ON DELETE CASCADE,
    CONSTRAINT fk_qsm_skill
        FOREIGN KEY (english_skill_id) REFERENCES english_skills(english_skill_id)
);

CREATE TABLE question_options (
    option_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    question_id BIGINT UNSIGNED NOT NULL,
    option_text TEXT NOT NULL,
    display_order INT UNSIGNED NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    correct_order INT UNSIGNED NULL,

    CONSTRAINT fk_qo_question
        FOREIGN KEY (question_id) REFERENCES questions(question_id) ON DELETE CASCADE,

    UNIQUE KEY uq_question_display_order (question_id, display_order)
);

-- ============================================================
-- 4. LEVEL SYSTEM
-- ============================================================

CREATE TABLE levels (
    level_no INT UNSIGNED PRIMARY KEY,
    required_xp_total INT UNSIGNED NOT NULL UNIQUE,
    skill_points_on_level_up INT UNSIGNED NOT NULL DEFAULT 1,
    character_tier VARCHAR(80) NULL
);

-- ============================================================
-- 5. ITEMS / EVENTS / COSMETICS
-- Created before tables that reference them.
-- ============================================================

CREATE TABLE items (
    item_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    item_name VARCHAR(100) NOT NULL,
    item_type ENUM(
        'HP_POTION',
        'HINT',
        'TIME_EXTENSION',
        'SECOND_CHANCE',
        'OTHER'
    ) NOT NULL,
    description TEXT NULL,
    effect_value INT NULL,
    coin_price INT UNSIGNED NOT NULL DEFAULT 0,
    max_stack INT UNSIGNED NOT NULL DEFAULT 99,
    is_shop_available BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE weekly_events (
    event_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_name VARCHAR(120) NOT NULL,
    description TEXT NULL,
    start_at DATETIME NOT NULL,
    end_at DATETIME NOT NULL,
    event_currency_name VARCHAR(60) NOT NULL,
    event_currency_symbol VARCHAR(20) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE cosmetics (
    cosmetic_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cosmetic_name VARCHAR(120) NOT NULL,
    cosmetic_slot ENUM(
        'OUTFIT',
        'AVATAR',
        'WEAPON_SKIN',
        'PET',
        'EFFECT',
        'EMOTE',
        'BACKGROUND',
        'TRAIL',
        'ACCESSORY'
    ) NOT NULL,
    rarity ENUM('COMMON','RARE','EPIC','LEGENDARY') NOT NULL DEFAULT 'COMMON',
    description TEXT NULL,
    coin_price INT UNSIGNED NOT NULL DEFAULT 0,
    source_type ENUM('SHOP','QUEST','WEEKLY_EVENT','BOSS','LEVEL','DEFAULT') NOT NULL,
    event_id INT UNSIGNED NULL,
    visual_asset VARCHAR(255) NULL,
    is_shop_available BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_cosmetic_event
        FOREIGN KEY (event_id) REFERENCES weekly_events(event_id)
);

-- ============================================================
-- 6. QUEST SYSTEM
-- ============================================================

CREATE TABLE quests (
    quest_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    world_id INT UNSIGNED NULL,
    quest_name VARCHAR(120) NOT NULL,
    description TEXT NOT NULL,
    objective_type ENUM(
        'DEFEAT_ENEMIES',
        'ANSWER_QUESTIONS',
        'COMPLETE_MINIGAME',
        'REACH_COMBO',
        'DEFEAT_BOSS',
        'IMPROVE_SKILL',
        'COLLECT_COINS'
    ) NOT NULL,
    target_value INT UNSIGNED NOT NULL DEFAULT 1,

    reward_xp INT UNSIGNED NOT NULL DEFAULT 0,
    reward_coins INT UNSIGNED NOT NULL DEFAULT 0,
    reward_skill_points INT UNSIGNED NOT NULL DEFAULT 0,
    reward_item_id BIGINT UNSIGNED NULL,
    reward_item_quantity INT UNSIGNED NOT NULL DEFAULT 0,
    reward_cosmetic_id BIGINT UNSIGNED NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_quests_world
        FOREIGN KEY (world_id) REFERENCES worlds(world_id),
    CONSTRAINT fk_quests_item
        FOREIGN KEY (reward_item_id) REFERENCES items(item_id),
    CONSTRAINT fk_quests_cosmetic
        FOREIGN KEY (reward_cosmetic_id) REFERENCES cosmetics(cosmetic_id)
);

CREATE TABLE player_quest_progress (
    player_id BIGINT UNSIGNED NOT NULL,
    quest_id INT UNSIGNED NOT NULL,
    progress_value INT UNSIGNED NOT NULL DEFAULT 0,
    status ENUM('NOT_STARTED','IN_PROGRESS','COMPLETED','CLAIMED') NOT NULL DEFAULT 'NOT_STARTED',
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    claimed_at TIMESTAMP NULL,

    PRIMARY KEY (player_id, quest_id),

    CONSTRAINT fk_pqp_player
        FOREIGN KEY (player_id) REFERENCES players(player_id),
    CONSTRAINT fk_pqp_quest
        FOREIGN KEY (quest_id) REFERENCES quests(quest_id)
);

-- ============================================================
-- 7. ENEMY SYSTEM
-- ============================================================

CREATE TABLE enemies (
    enemy_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    world_id INT UNSIGNED NOT NULL,
    enemy_name VARCHAR(100) NOT NULL,
    enemy_type ENUM('SMALL','ELITE') NOT NULL,
    hp INT UNSIGNED NOT NULL,
    damage INT UNSIGNED NOT NULL,
    difficulty_code VARCHAR(20) NOT NULL,
    default_time_limit_seconds INT UNSIGNED NOT NULL DEFAULT 10,
    reward_xp INT UNSIGNED NOT NULL DEFAULT 0,
    reward_coins INT UNSIGNED NOT NULL DEFAULT 0,
    reward_skill_points INT UNSIGNED NOT NULL DEFAULT 0,
    visual_asset VARCHAR(255) NULL,
    special_mechanic TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_enemies_world
        FOREIGN KEY (world_id) REFERENCES worlds(world_id)
);

CREATE TABLE enemy_question_pool (
    enemy_id INT UNSIGNED NOT NULL,
    question_id BIGINT UNSIGNED NOT NULL,
    selection_weight INT UNSIGNED NOT NULL DEFAULT 1,

    PRIMARY KEY (enemy_id, question_id),

    CONSTRAINT fk_eqpool_enemy
        FOREIGN KEY (enemy_id) REFERENCES enemies(enemy_id) ON DELETE CASCADE,
    CONSTRAINT fk_eqpool_question
        FOREIGN KEY (question_id) REFERENCES questions(question_id) ON DELETE CASCADE
);

-- ============================================================
-- 8. BOSS SYSTEM
-- ============================================================

CREATE TABLE bosses (
    boss_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    world_id INT UNSIGNED NOT NULL,
    boss_name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    base_hp INT UNSIGNED NOT NULL,
    default_damage INT UNSIGNED NOT NULL,
    reward_xp INT UNSIGNED NOT NULL DEFAULT 0,
    reward_coins INT UNSIGNED NOT NULL DEFAULT 0,
    reward_skill_points INT UNSIGNED NOT NULL DEFAULT 0,
    visual_asset VARCHAR(255) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_boss_world
        FOREIGN KEY (world_id) REFERENCES worlds(world_id)
);

CREATE TABLE boss_phases (
    boss_phase_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    boss_id INT UNSIGNED NOT NULL,
    phase_number INT UNSIGNED NOT NULL,
    phase_name VARCHAR(100) NOT NULL,
    hp_threshold_percent DECIMAL(5,2) NOT NULL,
    phase_damage INT UNSIGNED NOT NULL,
    time_limit_seconds INT UNSIGNED NOT NULL,
    special_mechanic TEXT NULL,

    UNIQUE KEY uq_boss_phase (boss_id, phase_number),

    CONSTRAINT fk_boss_phase_boss
        FOREIGN KEY (boss_id) REFERENCES bosses(boss_id) ON DELETE CASCADE
);

CREATE TABLE boss_phase_question_pool (
    boss_phase_id INT UNSIGNED NOT NULL,
    question_id BIGINT UNSIGNED NOT NULL,
    selection_weight INT UNSIGNED NOT NULL DEFAULT 1,

    PRIMARY KEY (boss_phase_id, question_id),

    CONSTRAINT fk_bpqp_phase
        FOREIGN KEY (boss_phase_id) REFERENCES boss_phases(boss_phase_id) ON DELETE CASCADE,
    CONSTRAINT fk_bpqp_question
        FOREIGN KEY (question_id) REFERENCES questions(question_id) ON DELETE CASCADE
);

-- ============================================================
-- 9. CHARACTER SKILL TREE
-- ============================================================

CREATE TABLE skills (
    skill_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    skill_name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    skill_branch ENUM(
        'VOCABULARY',
        'GRAMMAR',
        'SPEAKING',
        'UTILITY',
        'COMBO'
    ) NOT NULL,
    max_level INT UNSIGNED NOT NULL DEFAULT 3,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE skill_levels (
    skill_id INT UNSIGNED NOT NULL,
    skill_level INT UNSIGNED NOT NULL,
    skill_point_cost INT UNSIGNED NOT NULL,
    effect_type VARCHAR(50) NULL,
    effect_value DECIMAL(8,2) NULL,
    effect_description VARCHAR(255) NULL,

    PRIMARY KEY (skill_id, skill_level),

    CONSTRAINT fk_skill_levels_skill
        FOREIGN KEY (skill_id) REFERENCES skills(skill_id) ON DELETE CASCADE
);

CREATE TABLE player_skills (
    player_id BIGINT UNSIGNED NOT NULL,
    skill_id INT UNSIGNED NOT NULL,
    current_level INT UNSIGNED NOT NULL DEFAULT 0,
    unlocked_at TIMESTAMP NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (player_id, skill_id),

    CONSTRAINT fk_player_skills_player
        FOREIGN KEY (player_id) REFERENCES players(player_id),
    CONSTRAINT fk_player_skills_skill
        FOREIGN KEY (skill_id) REFERENCES skills(skill_id)
);

-- ============================================================
-- 10. PLAYER WORLD / INVENTORY / COSMETICS
-- ============================================================

CREATE TABLE player_world_progress (
    player_id BIGINT UNSIGNED NOT NULL,
    world_id INT UNSIGNED NOT NULL,
    status ENUM('LOCKED','UNLOCKED','COMPLETED') NOT NULL DEFAULT 'LOCKED',
    unlocked_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,

    PRIMARY KEY (player_id, world_id),

    CONSTRAINT fk_pwp_player
        FOREIGN KEY (player_id) REFERENCES players(player_id),
    CONSTRAINT fk_pwp_world
        FOREIGN KEY (world_id) REFERENCES worlds(world_id)
);

CREATE TABLE inventory (
    player_id BIGINT UNSIGNED NOT NULL,
    item_id BIGINT UNSIGNED NOT NULL,
    quantity INT UNSIGNED NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (player_id, item_id),

    CONSTRAINT fk_inventory_player
        FOREIGN KEY (player_id) REFERENCES players(player_id),
    CONSTRAINT fk_inventory_item
        FOREIGN KEY (item_id) REFERENCES items(item_id)
);

CREATE TABLE player_cosmetics (
    player_id BIGINT UNSIGNED NOT NULL,
    cosmetic_id BIGINT UNSIGNED NOT NULL,
    is_equipped BOOLEAN NOT NULL DEFAULT FALSE,
    owned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (player_id, cosmetic_id),

    CONSTRAINT fk_player_cosmetic_player
        FOREIGN KEY (player_id) REFERENCES players(player_id),
    CONSTRAINT fk_player_cosmetic_cosmetic
        FOREIGN KEY (cosmetic_id) REFERENCES cosmetics(cosmetic_id)
);

-- ============================================================
-- 11. WEEKLY EVENT PROGRESS
-- ============================================================

CREATE TABLE event_quests (
    event_quest_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_id INT UNSIGNED NOT NULL,
    quest_name VARCHAR(120) NOT NULL,
    description TEXT NOT NULL,
    objective_type ENUM(
        'DEFEAT_ENEMIES',
        'ANSWER_QUESTIONS',
        'COMPLETE_MINIGAME',
        'REACH_COMBO',
        'DEFEAT_BOSS'
    ) NOT NULL,
    target_value INT UNSIGNED NOT NULL DEFAULT 1,

    reward_xp INT UNSIGNED NOT NULL DEFAULT 0,
    reward_coins INT UNSIGNED NOT NULL DEFAULT 0,
    reward_skill_points INT UNSIGNED NOT NULL DEFAULT 0,
    reward_event_currency INT UNSIGNED NOT NULL DEFAULT 0,
    reward_item_id BIGINT UNSIGNED NULL,
    reward_item_quantity INT UNSIGNED NOT NULL DEFAULT 0,
    reward_cosmetic_id BIGINT UNSIGNED NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_event_quests_event
        FOREIGN KEY (event_id) REFERENCES weekly_events(event_id),
    CONSTRAINT fk_event_quests_item
        FOREIGN KEY (reward_item_id) REFERENCES items(item_id),
    CONSTRAINT fk_event_quests_cosmetic
        FOREIGN KEY (reward_cosmetic_id) REFERENCES cosmetics(cosmetic_id)
);

CREATE TABLE event_quest_progress (
    player_id BIGINT UNSIGNED NOT NULL,
    event_quest_id INT UNSIGNED NOT NULL,
    progress_value INT UNSIGNED NOT NULL DEFAULT 0,
    status ENUM('NOT_STARTED','IN_PROGRESS','COMPLETED','CLAIMED') NOT NULL DEFAULT 'NOT_STARTED',
    completed_at TIMESTAMP NULL,
    claimed_at TIMESTAMP NULL,

    PRIMARY KEY (player_id, event_quest_id),

    CONSTRAINT fk_eqp_progress_player
        FOREIGN KEY (player_id) REFERENCES players(player_id),
    CONSTRAINT fk_eqp_progress_quest
        FOREIGN KEY (event_quest_id) REFERENCES event_quests(event_quest_id)
);

CREATE TABLE player_event_balances (
    player_id BIGINT UNSIGNED NOT NULL,
    event_id INT UNSIGNED NOT NULL,
    balance INT UNSIGNED NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (player_id, event_id),

    CONSTRAINT fk_peb_player
        FOREIGN KEY (player_id) REFERENCES players(player_id),
    CONSTRAINT fk_peb_event
        FOREIGN KEY (event_id) REFERENCES weekly_events(event_id)
);

-- ============================================================
-- 12. COMBAT / QUESTION ATTEMPTS
-- ============================================================

CREATE TABLE combat_sessions (
    combat_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    player_id BIGINT UNSIGNED NOT NULL,
    world_id INT UNSIGNED NOT NULL,
    enemy_id INT UNSIGNED NULL,
    boss_id INT UNSIGNED NULL,
    current_boss_phase_id INT UNSIGNED NULL,

    status ENUM('ACTIVE','WON','LOST','ABANDONED') NOT NULL DEFAULT 'ACTIVE',

    player_hp_start INT UNSIGNED NOT NULL,
    player_hp_end INT UNSIGNED NULL,
    target_hp_start INT UNSIGNED NOT NULL,
    target_hp_end INT UNSIGNED NULL,

    total_damage_dealt INT UNSIGNED NOT NULL DEFAULT 0,
    xp_earned INT UNSIGNED NOT NULL DEFAULT 0,
    coins_earned INT UNSIGNED NOT NULL DEFAULT 0,
    skill_points_earned INT UNSIGNED NOT NULL DEFAULT 0,

    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,

    CONSTRAINT fk_combat_player
        FOREIGN KEY (player_id) REFERENCES players(player_id),
    CONSTRAINT fk_combat_world
        FOREIGN KEY (world_id) REFERENCES worlds(world_id),
    CONSTRAINT fk_combat_enemy
        FOREIGN KEY (enemy_id) REFERENCES enemies(enemy_id),
    CONSTRAINT fk_combat_boss
        FOREIGN KEY (boss_id) REFERENCES bosses(boss_id),
    CONSTRAINT fk_combat_phase
        FOREIGN KEY (current_boss_phase_id) REFERENCES boss_phases(boss_phase_id),

    CONSTRAINT chk_one_combat_target
        CHECK (
            (enemy_id IS NOT NULL AND boss_id IS NULL)
            OR
            (enemy_id IS NULL AND boss_id IS NOT NULL)
        )
);

CREATE TABLE combat_attempts (
    attempt_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    combat_id BIGINT UNSIGNED NOT NULL,
    attempt_no INT UNSIGNED NOT NULL,
    question_id BIGINT UNSIGNED NOT NULL,
    selected_option_id BIGINT UNSIGNED NULL,
    answer_text TEXT NULL,

    is_correct BOOLEAN NOT NULL,
    response_time_ms INT UNSIGNED NULL,

    damage_dealt INT UNSIGNED NOT NULL DEFAULT 0,
    xp_earned INT UNSIGNED NOT NULL DEFAULT 0,
    coins_earned INT UNSIGNED NOT NULL DEFAULT 0,
    english_power_earned INT UNSIGNED NOT NULL DEFAULT 0,
    english_skill_id INT UNSIGNED NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_attempt_combat
        FOREIGN KEY (combat_id) REFERENCES combat_sessions(combat_id) ON DELETE CASCADE,
    CONSTRAINT fk_attempt_question
        FOREIGN KEY (question_id) REFERENCES questions(question_id),
    CONSTRAINT fk_attempt_option
        FOREIGN KEY (selected_option_id) REFERENCES question_options(option_id),
    CONSTRAINT fk_attempt_skill
        FOREIGN KEY (english_skill_id) REFERENCES english_skills(english_skill_id),

    UNIQUE KEY uq_combat_attempt_no (combat_id, attempt_no),
    INDEX idx_attempt_combat_time (combat_id, created_at)
);

-- ============================================================
-- 13. QUESTION MASTERY / VOCAB NOTEBOOK
-- ============================================================

CREATE TABLE player_question_mastery (
    player_id BIGINT UNSIGNED NOT NULL,
    question_id BIGINT UNSIGNED NOT NULL,
    attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
    correct_count INT UNSIGNED NOT NULL DEFAULT 0,
    first_correct_at TIMESTAMP NULL,
    last_attempt_at TIMESTAMP NULL,
    last_correct_at TIMESTAMP NULL,

    PRIMARY KEY (player_id, question_id),

    CONSTRAINT fk_pqm_player
        FOREIGN KEY (player_id) REFERENCES players(player_id),
    CONSTRAINT fk_pqm_question
        FOREIGN KEY (question_id) REFERENCES questions(question_id)
);

CREATE TABLE vocabulary_notebook (
    notebook_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    player_id BIGINT UNSIGNED NOT NULL,
    word VARCHAR(100) NOT NULL,
    meaning TEXT NOT NULL,
    category VARCHAR(80) NULL,
    difficulty_code VARCHAR(20) NULL,
    example_sentence TEXT NULL,
    source_question_id BIGINT UNSIGNED NULL,
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notebook_player
        FOREIGN KEY (player_id) REFERENCES players(player_id),
    CONSTRAINT fk_notebook_question
        FOREIGN KEY (source_question_id) REFERENCES questions(question_id),

    INDEX idx_notebook_player_word (player_id, word)
);

-- ============================================================
-- 14. POINT / REWARD LEDGERS
-- ============================================================

CREATE TABLE player_xp_transactions (
    xp_transaction_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    player_id BIGINT UNSIGNED NOT NULL,
    amount INT NOT NULL,
    source_type ENUM(
        'QUESTION',
        'ENEMY',
        'BOSS',
        'QUEST',
        'WEEKLY_EVENT',
        'LEVEL_REWARD',
        'ADMIN_ADJUSTMENT'
    ) NOT NULL,
    source_id BIGINT UNSIGNED NULL,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_pxt_player
        FOREIGN KEY (player_id) REFERENCES players(player_id),

    INDEX idx_pxt_player_time (player_id, created_at)
);

CREATE TABLE player_coin_transactions (
    coin_transaction_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    player_id BIGINT UNSIGNED NOT NULL,
    amount INT NOT NULL,
    source_type ENUM(
        'QUESTION',
        'ENEMY',
        'BOSS',
        'QUEST',
        'WEEKLY_EVENT',
        'SHOP_PURCHASE',
        'ADMIN_ADJUSTMENT'
    ) NOT NULL,
    source_id BIGINT UNSIGNED NULL,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_pct_player
        FOREIGN KEY (player_id) REFERENCES players(player_id),

    INDEX idx_pct_player_time (player_id, created_at)
);

CREATE TABLE player_skill_point_transactions (
    skill_point_transaction_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    player_id BIGINT UNSIGNED NOT NULL,
    amount INT NOT NULL,
    source_type ENUM(
        'LEVEL_UP',
        'ELITE',
        'MINI_BOSS',
        'MAIN_BOSS',
        'QUEST',
        'WEEKLY_EVENT',
        'SKILL_PURCHASE',
        'ADMIN_ADJUSTMENT'
    ) NOT NULL,
    source_id BIGINT UNSIGNED NULL,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_pspt_player
        FOREIGN KEY (player_id) REFERENCES players(player_id),

    INDEX idx_pspt_player_time (player_id, created_at)
);

CREATE TABLE player_english_power_transactions (
    english_power_transaction_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    player_id BIGINT UNSIGNED NOT NULL,
    english_skill_id INT UNSIGNED NOT NULL,
    amount INT NOT NULL,
    source_type ENUM(
        'QUESTION',
        'REVIEW',
        'QUEST',
        'BENCHMARK',
        'ADMIN_ADJUSTMENT'
    ) NOT NULL,
    source_id BIGINT UNSIGNED NULL,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_pept_player
        FOREIGN KEY (player_id) REFERENCES players(player_id),
    CONSTRAINT fk_pept_skill
        FOREIGN KEY (english_skill_id) REFERENCES english_skills(english_skill_id),

    INDEX idx_pept_player_skill_time (player_id, english_skill_id, created_at)
);

CREATE TABLE player_event_currency_transactions (
    event_currency_transaction_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    player_id BIGINT UNSIGNED NOT NULL,
    event_id INT UNSIGNED NOT NULL,
    amount INT NOT NULL,
    source_type ENUM(
        'EVENT_QUEST',
        'EVENT_REWARD',
        'EVENT_SHOP_PURCHASE',
        'ADMIN_ADJUSTMENT'
    ) NOT NULL,
    source_id BIGINT UNSIGNED NULL,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_pect_player
        FOREIGN KEY (player_id) REFERENCES players(player_id),
    CONSTRAINT fk_pect_event
        FOREIGN KEY (event_id) REFERENCES weekly_events(event_id),

    INDEX idx_pect_player_event_time (player_id, event_id, created_at)
);

-- ============================================================
-- 15. GROWTH SNAPSHOTS
-- ============================================================

CREATE TABLE player_growth_snapshots (
    snapshot_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    player_id BIGINT UNSIGNED NOT NULL,
    snapshot_date DATE NOT NULL,

    vocabulary_power INT UNSIGNED NOT NULL DEFAULT 0,
    grammar_power INT UNSIGNED NOT NULL DEFAULT 0,
    sentence_construction_power INT UNSIGNED NOT NULL DEFAULT 0,
    it_english_power INT UNSIGNED NOT NULL DEFAULT 0,
    listening_power INT UNSIGNED NOT NULL DEFAULT 0,
    speaking_power INT UNSIGNED NOT NULL DEFAULT 0,
    communication_power INT UNSIGNED NOT NULL DEFAULT 0,

    total_english_power INT UNSIGNED NOT NULL DEFAULT 0,

    UNIQUE KEY uq_player_snapshot_date (player_id, snapshot_date),

    CONSTRAINT fk_pgs_player
        FOREIGN KEY (player_id) REFERENCES players(player_id)
);

-- ============================================================
-- 16. STARTER MASTER DATA
-- ============================================================

INSERT INTO english_skills
    (skill_code, skill_name, description, sort_order)
VALUES
    ('VOCABULARY', 'Vocabulary', 'Word meaning, recognition and recall.', 1),
    ('GRAMMAR', 'Grammar', 'Grammar rules and sentence structure.', 2),
    ('SENTENCE_CONSTRUCTION', 'Sentence Construction', 'Building clear and correct sentences.', 3),
    ('IT_ENGLISH', 'IT English', 'Technology and IT-related English.', 4),
    ('LISTENING', 'Listening', 'Understanding spoken English.', 5),
    ('SPEAKING', 'Speaking', 'Using spoken English with confidence.', 6),
    ('COMMUNICATION', 'Communication', 'Practical communication in university and daily situations.', 7);

INSERT INTO question_types
    (type_code, type_name, description)
VALUES
    ('TRUE_FALSE', 'True / False Sprint', 'Fast true or false challenge.'),
    ('ODD_WORD_OUT', 'Odd Word Out', 'Choose the unrelated word.'),
    ('SENTENCE_BUILDER', 'Sentence Builder', 'Arrange words into a correct sentence.'),
    ('WORD_UNSCRAMBLE', 'Word Unscramble', 'Rearrange letters to form a word.'),
    ('SPEED_TYPING', 'Speed Typing', 'Type a short English passage accurately.'),
    ('LISTENING', 'Listening Challenge', 'Answer after listening to spoken English.'),
    ('SPEAKING', 'Speaking Challenge', 'Respond using spoken English.');

INSERT INTO difficulties
    (
        difficulty_code,
        difficulty_name,
        time_limit_seconds,
        xp_reward,
        coin_reward,
        english_power_reward,
        repeat_xp_multiplier,
        repeat_coin_multiplier,
        repeat_english_power_reward
    )
VALUES
    ('EASY',    'Easy',   5, 10,  5, 1, 0.50, 0.50, 0),
    ('MEDIUM',  'Medium', 7, 15,  8, 2, 0.50, 0.50, 0),
    ('HARD',    'Hard',  10, 20, 10, 3, 0.50, 0.50, 0);

INSERT INTO levels
    (level_no, required_xp_total, skill_points_on_level_up, character_tier)
VALUES
    (1,    0,    0, 'Rookie'),
    (2,    100,  1, 'Rookie'),
    (3,    250,  1, 'Explorer'),
    (4,    450,  1, 'Explorer'),
    (5,    700,  1, 'Warrior'),
    (6,    1000, 1, 'Warrior'),
    (7,    1350, 1, 'Elite Warrior'),
    (8,    1750, 1, 'Elite Warrior'),
    (9,    2200, 1, 'Elite Warrior'),
    (10,   2700, 1, 'English Master');

INSERT INTO worlds
    (world_name, description, world_order, required_level, prerequisite_world_id)
VALUES
    ('Dreamwood', 'A magical forest focused on basic vocabulary and understanding.', 1, 1, NULL);

INSERT INTO enemies
    (
        world_id, enemy_name, enemy_type, hp, damage,
        difficulty_code, default_time_limit_seconds,
        reward_xp, reward_coins, reward_skill_points
    )
SELECT
    world_id, 'Word Slime', 'SMALL', 60, 10,
    'EASY', 5, 20, 10, 0
FROM worlds
WHERE world_name = 'Dreamwood';

-- ============================================================
-- 17. LOCKED BUSINESS RULES
-- ============================================================
-- A. Correct question rewards:
--    EASY   = +10 XP, +5 Coins, +1 English Power
--    MEDIUM = +15 XP, +8 Coins, +2 English Power
--    HARD   = +20 XP, +10 Coins, +3 English Power
--
-- B. Wrong question:
--    0 XP, 0 Coins, 0 English Power, lose current action.
--
-- C. Repeated already-solved question:
--    50% XP, 50% Coins, 0 English Power.
--
-- D. Small Monster MVP example:
--    +20 XP, +10 Coins, +0 Skill Point.
--
-- E. Elite Monster MVP:
--    +30 XP, +15 Coins, +1 Skill Point.
--
-- F. Mini Boss MVP:
--    +50 XP, +30 Coins, +1 Skill Point.
--
-- G. Main Boss MVP:
--    +100 XP, +100 Coins, +2 Skill Points.
--
-- H. Level-up:
--    Skill Points granted from levels.skill_points_on_level_up.
--
-- I. English Power only comes from learning-related activities.
--
-- J. Cosmetics do not increase HP, Damage, English Power, XP or accuracy.
--
-- K. Weekly Event Currency is separate from normal Coins and belongs
--    to one specific event.
--
-- L. No leaderboard table is required.
--
-- M. Player HP is battle/session state, not a spendable progression point.
--
-- N. Ledger tables are the audit trail; players.*_total and
--    player_english_stats.current_power are cached current values.