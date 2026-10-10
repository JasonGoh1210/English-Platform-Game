-- Apply ONCE after 003 when upgrading an existing database.
-- Creates the four world records expected by the independent map scenes.
USE english_power_quest;

UPDATE worlds
SET world_name = 'Maple Town',
    description = 'Starting village: vocabulary, characters and the opening story.'
WHERE world_order = 1 AND world_name = 'Dreamwood';

INSERT INTO worlds (world_name, description, world_order, required_level, prerequisite_world_id)
VALUES
    ('Maple Town', 'Starting village: vocabulary, characters and the opening story.', 1, 1, NULL),
    ('Whispering Forest', 'Enchanted forest and language challenges.', 2, 1, NULL),
    ('Old Camp Road', 'The sunset camp and the road guardians.', 3, 1, NULL),
    ('Ancient Ruins', 'The ruins, Echo Cave and Typing Cavern.', 4, 1, NULL)
ON DUPLICATE KEY UPDATE
    world_name = VALUES(world_name),
    description = VALUES(description);

-- Existing player references to the world_order=1 world remain valid.
