-- Migration 001: stable question keys and difficulty integrity
-- Run ONLY on an existing database imported from the older schema
-- that does not yet contain questions.question_code or fk_enemies_difficulty.
-- Back up your database before running this migration.

USE english_power_quest;

ALTER TABLE questions
    ADD COLUMN question_code VARCHAR(60) NULL AFTER question_id;

UPDATE questions
SET question_code = CONCAT('legacy-', question_id)
WHERE question_code IS NULL;

ALTER TABLE questions
    MODIFY question_code VARCHAR(60) NOT NULL,
    ADD UNIQUE KEY uq_questions_question_code (question_code);

-- Before running this statement, verify every enemies.difficulty_code
-- exists in difficulties.difficulty_code. Invalid rows will block the FK.
ALTER TABLE enemies
    ADD CONSTRAINT fk_enemies_difficulty
    FOREIGN KEY (difficulty_code)
    REFERENCES difficulties(difficulty_code);
