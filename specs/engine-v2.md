# Level Up Engine v2 — Spec

## Core Idea

Level Up isn't a maze game. It's a canvas with an AI that can turn it into anything. The engine should be a **toolkit of reusable primitives** that the AI can compose into wildly different gameplay experiences each level.

## The Primitives

### 1. Scene System (replaces "maze is always there")
Instead of always rendering a maze, the game has a **scene** — a blank canvas that rules populate. The maze becomes just one possible scene type.

```js
// Scene types the engine provides out of the box:
scenes.maze(cols, rows)        // Classic maze
scenes.arena(width, height)    // Open rectangle (pong, breakout, bullet hell)
scenes.grid(cols, rows)        // Grid of cells (puzzle, match-3, minesweeper)
scenes.platformer(width, height) // Side-scrolling with gravity
scenes.blank()                 // Empty canvas, do whatever you want
```

Each scene handles its own rendering and provides collision boundaries. Rules declare which scene they want (or inherit the current one).

### 2. Entity Toolkit
Reusable entity types the AI can spawn and configure:

```js
entities.ball({ x, y, dx, dy, radius, color, bounceWalls: true })
entities.paddle({ x, y, width, height, axis: 'x'|'y', controls: 'player'|'ai' })
entities.textBlock({ x, y, text, font, color })
entities.sprite({ x, y, frames: [...], frameRate })
entities.zone({ x, y, w, h, color, onEnter, onExit })  // trigger areas
entities.wall({ x1, y1, x2, y2, color, destructible })
entities.collectible({ x, y, emoji, points, onCollect })
entities.enemy({ x, y, speed, pattern: 'chase'|'patrol'|'random', onHit })
entities.projectile({ x, y, dx, dy, lifetime, onHit })
entities.timer({ seconds, onTick, onExpire, visible: true })
entities.counter({ label, value, x, y })  // score, lives, etc.
entities.particles({ x, y, count, color, spread, lifetime }) // visual flair
```

### 3. Input Modes
Different games need different input:

```js
input.arrows()       // { up, down, left, right } - discrete per-frame
input.continuous()   // held-key state for smooth movement
input.mouse()        // { x, y, clicked, held }
input.typeText()     // capture text input (trivia, word games)
input.buttons(labels) // render clickable buttons, return which was pressed
```

### 4. Physics Helpers
Common physics the AI shouldn't have to rewrite every time:

```js
physics.bounce(entity, bounds)      // wall bouncing
physics.gravity(entity, strength)   // downward pull
physics.friction(entity, amount)    // slow down over time
physics.collides(a, b)              // AABB or circle collision
physics.moveToward(a, b, speed)     // chase behavior
physics.patrol(entity, waypoints, speed) // back-and-forth movement
```

### 5. Level Completion API
Rules can complete the level directly:

```js
window._completeLevel()              // trigger level-complete flow
window._failLevel(message)           // trigger failure + retry
window._setGoal(description)         // update the HUD goal text
```

### 6. Rule Library (saved generated rules)
```
js/rules/library/
  pong.js           # saved from session 1
  breakout.js       # saved from session 1
  trivia.js         # saved from session 1
  ...
```

Each library rule is a full rule object that worked in a previous session. The AI can:
- **Replay** a library rule as-is
- **Remix** it — load the base and modify parameters (faster ball, smaller paddle, new questions)
- **Combine** pieces from multiple library rules into something new

The library grows over time. After each session, working rules get saved.

### 7. Auto-Save Pipeline
When `window._injectRule(rule)` is called and the rule runs successfully (no crashes for 10+ seconds), auto-save it:
1. Serialize the rule object to a JS file in `js/rules/library/`
2. Add metadata: date generated, GM personality, original wish, times played
3. Index in `data/rule-library.json`

## How Rule Generation Changes

Instead of the AI writing everything from scratch each time, it gets a **menu of primitives**:

```
You have these tools available:
- Scenes: maze, arena, grid, platformer, blank
- Entities: ball, paddle, textBlock, zone, wall, collectible, enemy, projectile, timer, counter, particles
- Input: arrows, continuous, mouse, typeText, buttons
- Physics: bounce, gravity, friction, collides, moveToward, patrol
- Library rules you can remix: [pong, breakout, trivia, ...]
- Level flow: _completeLevel(), _failLevel(), _setGoal()

The player wished for: "make it rain"
```

This makes generation faster, more reliable, and more creative — the AI combines primitives instead of writing raw canvas code from scratch.

## Migration Path

### What stays the same
- Rule hook interface (init, destroy, onTick, onRender, etc.)
- Game state on `gameState.ruleData.yourKey`
- Sidebar chat, GM personalities
- Save/trash mastery system

### What changes
- Maze is no longer auto-generated every level — scenes are
- `startLevel()` sets up whatever scene the active rules want
- Entity system gets richer (current one is basic)
- Input system gets modes beyond just arrow keys
- `RULE_PROMPT.md` gets rewritten to reference the primitive toolkit

## File Structure Changes
```
js/
  engine/
    scenes.js        # Scene types (maze, arena, grid, platformer, blank)
    primitives.js    # Entity factory functions
    physics.js       # Physics helpers
    input-modes.js   # Input mode system
  rules/
    pool/            # Pre-generated rules (keep existing)
    library/         # AI-generated rules saved from sessions
  ...existing files
```

## What Could Be Built Now vs. Next Session

### Now (no gameplay testing needed)
- `js/engine/primitives.js` — entity factory functions
- `js/engine/physics.js` — physics helpers
- `js/engine/scenes.js` — scene type definitions
- `js/rules/library/` — recreate pong/breakout from memory, save as library rules
- `window._completeLevel()` API in main.js
- Updated `RULE_PROMPT.md` referencing the toolkit

### Next session (needs playtesting)
- Wire scenes into the game loop (replace auto-maze)
- Input mode switching
- Auto-save pipeline for generated rules
- Playtest the whole flow end-to-end
