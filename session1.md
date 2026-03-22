# Level Up - Session 1 Notes
**Date:** 2026-03-21

## What Is Level Up?

A browser-based maze game that evolves as you play. You start with a simple maze, and after each level you choose (or wish for) a new rule. Rules stack and accumulate, making the game progressively weirder. An AI Game Master runs in the background, injecting rules, commentary, and surprises via a sidebar chat.

**Tech stack:** Vanilla HTML5 Canvas + ES Modules. No build step, no framework. Served via a simple static file server.

---

## Completed This Session

### Core Game Engine
- Procedural maze generation (recursive backtracker, scales with level)
- Player movement with wall collision (arrow keys + WASD)
- Entity system with collision detection
- Game loop: input -> update -> collision -> goal check -> render
- Game state management with localStorage persistence

### Rule Plugin System
- Standard hook interface: `init`, `destroy`, `onTick`, `onRender`, `onInput`, `onCollision`, `onLevelStart`, `spawnEntities`
- Rules compose by stacking - game loop iterates all active rules each frame
- Rules store state on `gameState.ruleData.yourKey`
- Registry handles lifecycle: register, activate, deactivate, choose

### 6 Pre-Generated Rules
1. **Fire Hazard** - fire entities spawn in the maze, touching them resets you
2. **Collect Coins** - coins spawn, must collect all before exit opens
3. **Shifting Walls** - maze walls periodically rearrange
4. **Inverted Controls** - directions are reversed
5. **Time Limit** - countdown timer, fail if it expires
6. **Fog of War** - limited visibility radius around player

### Level Progression Flow
- Beat level -> reveal active rules -> save/trash prompt (if mastered 3x) -> rule picker
- Save = rule is always on; Trash = rule never appears again
- Persisted to localStorage

### Game Master System
- 6 GM personalities: Monkey's Paw, Chaotic Fairy Godmother, Passive Aggressive Assistant, Evil Dungeon Master, Unhinged Game Show Host, Game Developer
- GM selection screen at game start with optional initial prompt
- Sidebar chat for two-way communication (player <-> GM)
- Cron-based GM loop (~1 min interval) checks game state and acts

### AI Rule Injection
- Players type wishes in the rule picker prompt
- `window._pendingWish` exposes the wish for Claude Code to see
- Claude Code generates a rule object and injects via `window._injectRule()`
- 120-second timeout with fallback to pre-generated rule
- `window._chat()` for GM-to-player messages

### UI/UX
- Sidebar chat panel with message history (GM, player, system message types)
- HUD: level indicator, active rule count, move counter, GM countdown timer
- ESC key to skip current level and return to wish prompt
- Full-viewport overlay for menus (fixed positioning)

---

## Play Session Highlights

### GM: Chaotic Fairy Godmother
Played through 4 levels with the Chaotic Fairy Godmother personality. The sidebar filled up with enthusiastic, sparkle-laden commentary.

**Injected rules during play:**
- **Mermaid Mania** - ocean-themed entities swimming through the maze
- **Ocean Current** - directional currents pushing the player
- **Whirlpool Warps** - teleport portals between two points in the maze
- **Breakout** (wish: "not a maze, you pick") - attempted to inject a full Breakout game replacing the maze

**Key moment:** The player wished for "not a maze, you pick" and the Fairy Godmother tried to inject a full Breakout game. It rendered but didn't survive the level transition - exposing a core architectural issue with injected rules that completely replace the maze gameplay.

### Final State
- Level 4, choosing screen
- Active rules: ocean-current, time-limit
- 84 moves total
- Sidebar full of Fairy Godmother messages

---

## Known Issues / Bugs

1. **Injected rules don't survive level transitions** - When `startLevel()` runs, it re-initializes rules from `gs.activeRuleIds`, but dynamically injected rules (registered at runtime) may not be in the registry's pool correctly. Rules like Pong/Breakout that replace the maze entirely also can't trigger the normal "reach exit" goal completion.

2. **`showGenerating` screen always says "The monkey's paw curls"** - Hardcoded in `screens.js:294`. Should reference the active GM personality instead.

3. **Sidebar send handler fragile after reload** - `initSidebarChat()` attaches event listeners on boot, but they can break. Was hotfixed via eval during the session.

4. **Cron minimum is 1 minute** - User wanted 30-second GM check-ins but cron granularity is 1 minute. The HUD countdown timer shows 60 seconds.

5. **Game-replacing rules (pong, breakout, trivia) need a different completion flow** - They can't use the "reach exit" goal. Need a way for rules to signal level completion directly.

---

## TODO for Next Session

### High Priority
- [ ] Fix injected rule persistence through level transitions
  - Rules injected via `_injectRule` need to be properly stored so `startLevel()` can re-initialize them
  - Consider storing the rule object itself (not just the ID) in a Map
- [ ] Add a `completeLevel()` API that rules can call directly
  - For game-replacing rules (pong, breakout) that can't use "reach exit"
  - Something like `gameState.completeLevel()` or `window._completeLevel()`

### Medium Priority
- [ ] Fix `showGenerating` to use GM personality text instead of "monkey's paw curls"
- [ ] Make sidebar chat handler more robust (survives page state changes)
- [ ] Add more pre-generated rules to the pool (at least 6 more for variety)
- [ ] Consider reducing GM interval or finding alternative to cron for faster check-ins

### Nice to Have
- [ ] Rule management screen (view saved/trashed rules from menu)
- [ ] Sound effects / audio
- [ ] Mobile touch controls
- [ ] Visual polish: particle effects, transitions between levels
- [ ] Player stats / run history tracking
- [ ] Multiple goal types beyond "reach exit" (survive N seconds, defeat enemies, etc.)

---

## File Structure
```
levelup/
  index.html                     # Entry point, canvas + sidebar layout
  css/style.css                  # All styling
  data/rule-pool.json            # Rule metadata
  tools/RULE_PROMPT.md           # AI generation prompt template
  js/
    main.js                      # Game loop, boot, orchestration, chat, wish system
    canvas.js                    # Canvas setup/drawing
    input.js                     # Keyboard input
    maze.js                      # Maze generation + rendering
    player.js                    # Player entity
    entities.js                  # Entity manager
    collision.js                 # Collision detection
    state.js                     # Game state + localStorage
    ui/
      hud.js                     # In-game HUD
      screens.js                 # Menu, level-complete, rule picker, GM selection
    rules/
      registry.js                # Rule lifecycle management
      pool/                      # Pre-generated rule modules (6 total)
    goals/
      registry.js                # Goal lifecycle
      pool/reach-exit.js         # Default goal
```
