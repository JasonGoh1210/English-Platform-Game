# English Platform Game

## English Power Quest

A mobile-friendly fantasy RPG prototype that turns English practice into combat and character progression.

### Current MVP

- Dreamwood world
- Player HP, XP, Coins and Skill Points
- English Power tracking
- True / False Sprint
- Odd Word Out
- Sentence Builder
- 3 regular enemies
- 1 elite monster
- 1 mini boss with phases
- 1 main boss with phases
- Combo and fast-answer damage bonuses
- Repeat-question reward handling
- Personal English accuracy tracking
- Local browser save using localStorage
- Responsive UI

### Game loop

Explore -> Encounter -> English Challenge -> Answer -> Attack -> Defeat -> Reward -> Improve -> Progress

### Reward rules

Easy: +10 XP, +5 Coins, +1 English Power
Medium: +15 XP, +8 Coins, +2 English Power
Hard: +20 XP, +10 Coins, +3 English Power

Wrong answers give no question reward and cost the current action.

### Run locally

Because the game loads JSON files and ES modules, use a local web server.

Example:
python -m http.server 8000

Then open:
http://localhost:8000

### Database

The MySQL schema is stored in:
database/english_power_quest_schema.sql

The browser MVP currently uses localStorage so the core gameplay can be tested before the backend/API is connected to MySQL.

### Repository structure

index.html
css/style.css
js/main.js
js/game.js
js/player.js
js/combat.js
js/question.js
js/save.js
data/questions.json
data/enemies.json
data/levels.json
data/skills.json
data/worlds.json
assets/player/
assets/enemies/
assets/world/
assets/ui/
database/english_power_quest_schema.sql

### Design principle

Level up your character. Level up yourself.

Core emotional outcome:
I GOT STRONGER.
