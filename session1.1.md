# Level Up - Session 1.1 Notes (Coding)
**Date:** 2026-03-22

## What Is Session 1.1?

A between-play coding session. No gameplay — just fixes and content based on Session 1 feedback, plus a significant engine rethink before Session 2.0.

---

## Part A: Bug Fixes (committed earlier)

### Bug Fixes
- **`showGenerating` GM text** — Was hardcoded "The monkey's paw curls." Now uses personality-specific flavor text per GM. The Evil DM intones ancient runes, the Game Show Host spins the WISH-O-METER, etc.
- **Injected rule persistence** — Added `registerInjected()` in registry.js that stores AI-generated rules in a persistent `Map` in addition to the main rules object. Defensive safety net so rules can't silently disappear across level transitions.
- **Exit-blocking logic** — Generalized in main.js to cleanly handle both `collect-coins` and the new `key-and-lock` rule.

### Pacing
- **Smaller mazes** — Level 1 is now 5×5 (was 7×7). Scaling is slower. Gets to rule-stacking faster.
- **GM interval 60s → 30s** — HUD countdown now shows 30s. Feels more alive.
- **`window._onGmTick`** — A callback the game fires every 30s during play with current game state snapshot.

### New Pre-Generated Rules (6 added, 12 total)

| Rule | Category | Difficulty | Effect |
|---|---|---|---|
| Gravitational Pull | modifier | 2 | Slides south every 2s; faster at higher levels |
| Slippery When Wet | movement | 2 | Each move slides one extra cell if no wall |
| Key Holder | collectible | 2 | Exit locked until golden key is found |
| Don't Look Back | hazard | 3 | Revisiting recent path cells resets you |
| Quantum Uncertainty | modifier | 3 | Teleports to random cell every 15s (with warning) |
| The Mimic | hazard | 3 | Copies your moves 3 steps behind; catches you = reset |

---

## Part B: Open World Engine (this session)

### Core Problem Re-Identified

Session 1 feedback: too much maze, not enough surprise. The root cause was architectural — the maze was baked into the engine as an assumption, not a choice. Every rule had to work around it.

New philosophy: **the world is a blank canvas. Rules build the experience on top of it.**

The minimal form is two dots: one you control, one you need to reach. Everything else — walls, enemies, physics, hazards, entire game modes — is added by rules. The maze becomes one possible rule, not the default state.

### What Was Built

#### Free Movement (`player.js`)
- `createFree(x, y, speed)` — pixel-position player with velocity, radius, motion trail
- `updateFree(player, heldDirs, dt, world)` — smooth movement, diagonal normalization, canvas boundary clamping
- Motion trail: last 20 positions fade behind the player
- Move counter throttled to once per 200ms (was per-frame — gave absurdly high counts)
- `render()` updated: detects free vs grid mode via `player.radius` presence

#### Held-Key Input (`input.js`)
- Added `getHeld()` — returns array of all currently-held movement directions
- Existing `getDirection()` (fires once per press) kept for maze mode

#### Open World Canvas (`canvas.js`)
- Added `resizeOpen(width, height)` — sets canvas to fixed pixel dimensions + HUD

#### Proximity Collision (`collision.js`)
- Added `checkPlayerFree(player)` — circle overlap detection using entity radius
- Existing grid-based `checkPlayer()` kept for maze mode

#### Reach-Dot Goal (`goals/pool/reach-dot.js`)
- New goal for open world: proximity check within 22px of goal position
- Animated gold dot with pulsing glow, spinning dashed ring, specular highlight
- Goal position read from `gameState.world.goalPos` (set by level spec)

#### Level Spec System (`main.js`)
Levels are now driven by spec objects instead of being hardcoded:
```js
// Open world (new default)
{ world: 'open', width: 640, height: 380,
  playerPos: {x: 80, y: 190}, goalPos: {x: 560, y: 190}, playerSpeed: 180 }

// Maze world (still works)
{ world: 'maze', cols: 9, rows: 9 }
```
`startLevel(spec)` handles both. Maze world still fully functional.

#### Mid-Level Event Queue
```js
window._addEvent({ type: 'time', ms: 10000 }, (gs) => {
  window._injectRule(someRule); // fires 10s into level
});
window._addEvent({ type: 'moves', count: 30 }, (gs) => {
  window._chat('Nice moves!');
});
```
Triggers: `time` (ms elapsed) or `moves` (move count). Actions get the full game state.

#### `_nextLevel` — GM Pre-Builds While You Play
The key agentic feature. During level N, the GM sets:
```js
window._nextLevel = {
  world: 'open',
  playerPos: { x: 320, y: 50 },  // player starts top-center
  goalPos: { x: 320, y: 330 },   // goal at bottom
  playerSpeed: 200,
  injectRules: [someRuleObj],     // optional: GM injects new rules
};
```
When level N completes, instead of showing the rule picker, the game shows "NEXT LEVEL READY" and loads the GM-built spec instantly. No wait, no picking — the GM already decided.

#### HUD Updated
- `hud.js` now handles open world width (`gs.world.width` vs `gs.maze.cols * cs`)
- Added `OPEN` badge in HUD for open world levels
- GM countdown bar continues to work in both modes

---

## Browser Testing (Screenshots)

All tests run with Playwright + Chromium. Zero JS errors across all tests.

### Screenshot 1 — Menu
![Menu](screenshots/1-menu.png)
GM selection screen. All 6 personalities listed. Unchanged from session 1.

### Screenshot 2 — Open World Level 1
![Open World](screenshots/2-openworld.png)
Green player dot (left), gold spinning goal dot (right). Dot-grid background. HUD shows LVL 1, OPEN badge, GM: 29s countdown, Moves: 0.

### Screenshot 3 — Free Movement with Trail
![Moving](screenshots/3-moving.png)
Player has moved right — motion trail (fading green dots) visible behind it. Moves: 40. Smooth, responsive.

### Screenshot 4 — Level Complete
![Level Complete](screenshots/4-complete.png)
"LEVEL 1 COMPLETE! Moves: 13" — correct count with the 200ms throttle. Game world visible behind overlay.

### Screenshot 5 — Rule Picker
![Rule Picker](screenshots/5-rulepicker.png)
3 mystery rules with world-agnostic hints ("Something valuable is waiting", not "the maze is full of"). Wish input box at top.

### Screenshot 6 — `_nextLevel` in Action
**GM sends sidebar message during level 1:** "⚡ BONUS ROUND LOADED! I've already planned your NEXT CHALLENGE!"

**After completing level 1 — "NEXT LEVEL READY"** instead of rule picker:
"The Game Master has prepared something... Press ENTER to begin"

**Level 2 loads with GM-specified layout:** Player at top-center, gold goal at bottom-center. Completely different geometry from level 1. No rule picker needed.

---

## What Changed (File Summary)

| File | Change |
|------|--------|
| `js/input.js` | Added `getHeld()` for held-key detection |
| `js/player.js` | Added `createFree`, `updateFree`, motion trail, dual render mode |
| `js/canvas.js` | Added `resizeOpen()` |
| `js/collision.js` | Added `checkPlayerFree()` proximity detection |
| `js/goals/pool/reach-dot.js` | New goal for open world |
| `js/goals/registry.js` | Registered reach-dot |
| `js/ui/hud.js` | Open world width handling, OPEN badge |
| `js/ui/screens.js` | Added `showNextLevelReady()`, fixed maze-specific mystery hints |
| `js/main.js` | Level spec system, open world game loop, event queue, `_nextLevel`, `_addEvent` |

---

## Still Missing / Next Session

- [ ] Rules don't know which world they're in — maze-specific rules (fire-hazard, collect-coins, shifting-walls) silently fail in open world (caught by try-catch). This is acceptable but a `worlds: ['open','maze']` declaration on rules would allow the rule picker to filter by world type.
- [ ] Open world rules library is thin — the 6 new rules from Part A mostly target maze mode. Need open-world-native rules: obstacles/walls the player can't pass through, enemies that patrol, collectibles at pixel positions.
- [ ] `injectRules` in `_nextLevel` spec works but untested with full rule objects
- [ ] The `_addEvent` queue isn't exposed to the rule picker/wish flow yet — only available to GM via console
- [ ] Maze world still available but now off the default path — access via `buildMazeSpec(level)` or `_nextLevel = { world: 'maze', ... }`

---

## Notes for Session 2.0

The GM now has full control over every level's geometry. The canonical workflow:

1. Level N starts (open world, dot-to-dot)
2. GM uses `_onGmTick` (fires every 30s) to watch the player
3. GM builds `_nextLevel` during play — custom positions, injected rules, maybe a maze
4. GM sends a chat message hinting at what's coming
5. Level N completes → "NEXT LEVEL READY" → GM's level loads instantly
6. Repeat, escalating chaos

The event queue (`_addEvent`) is for mid-level surprises. Rule injection at 15 seconds in, wall appearing at move 20, etc.

The baseline game (dot → dot) is intentionally boring. The GM is supposed to make it interesting. Session 2.0 should lean into this hard.

---

## Part C: Flow Redesign (this session, continued)

### Problem Statement

Session 1 had a rule picker between every level — the player was actively choosing what happened to them. The new vision flips this: **the GM decides everything, and the player reacts.**

### New Game Flow

```
Menu → Pick GM → Intro Chat → Level 1 starts
                                    │
                              2-minute timer
                              Dots respawn on reach
                              Rules inject at 30/60/90s (1.1, 1.2, 1.3)
                                    │
                              Timer fires (or L pressed)
                                    │
                          Between-levels chat screen
                          (stats + GM narrative + wish input)
                                    │
                              Level 2 → (click or press L)
                                    │
                              Repeat, but bigger
```

### Sub-levels vs Full Level Changes

**Sub-levels** (1.0 → 1.1 → 1.2 → 1.3): Frequent, small, mid-level. Rule injection, parameter change. No screen transition. HUD updates. GM sends one sentence in chat.

**Full level change** (1 → 2 → 3): Infrequent, potentially radical. Different world geometry. Entirely new rules. Could replace the game engine itself. GM builds this during level N while player is playing. Between-levels chat is where the GM explains the narrative.

### What Was Built (Part C)

**`level-timer.js`** — A rule (so it's modifiable) that counts down 2 minutes. Renders:
- Green→yellow→red progress bar at HUD boundary
- Bold countdown timer (1:59, 1:58...) at top of play area
- Red screen-edge flash when ≤10s remain
- Sets `gs.levelTimerExpired` when done; main.js detects this

**`reach-dot.js` (modified)** — Dot never ends the level. When reached:
- Respawns at a new random position (≥100px from player)
- Increments `gs.ruleData.dotsReached`
- Sets `gs.dotJustReached` briefly so rules can react

**`showIntroChat()`** — Screen after GM selection. GM speaks with personality-specific welcome message. Player can respond (optional). "Start Level 1 →" button always visible. Canned GM follow-up (AI can override with `window._respondToPlayer`).

**`showBetweenLevels()`** — Between-levels chat screen. Shows level summary (dots, moves), last 6 chat messages from the level, wish input, and "Level 2 →" button. L key also advances.

**`hud.js` (simplified)** — Shows LVL 1.2 (sub-level), ⬤ dot count, moves, "ESC · L → chat" hint.

**`main.js` (rewritten)**:
- Boot: menu → intro chat → level 1 (no direct-to-game skip)
- `level-timer` auto-activated every level (before accumulated player rules)
- Default injection schedule: 3 open-world rules at 30/60/90s (AI overrides with `_clearEvents` + `_addEvent`)
- Timer check at top of game loop: if `gs.levelTimerExpired`, call `onLevelEnd()`
- `onLevelEnd()` fires `_onLevelEnd` hook, then shows between-levels screen
- L and ESC both trigger `onLevelEnd()` during play
- `_onLevelStart` hook fires after level initializes

### New GM Hooks

```js
window._onLevelStart = function({ level, spec, gameState }) { ... };
window._onLevelEnd = function({ level, subLevel, dotsReached, moves, activeRuleIds }) { ... };
window._extendTimer(ms);       // add time to running timer
window._setTimer(ms);          // set timer directly
window._clearEvents();         // clear default injection schedule
window._addBetweenMsg(text, sender);  // add to between-levels chat panel
```

### Browser Testing Screenshots

**Intro Chat** — GM speaks immediately. Personality tone clear ("Ah. A visitor. I sense a wish forming. Speak carefully."). Optional player input. Start Level 1 button prominent.

**Playing — Timer** — 1:59 countdown green and bold at top of play area. Progress bar at HUD boundary. HUD shows LVL 1, dots: 0, moves.

**Playing — Dot Reached (1:56, ⬤ 1)** — After reaching the first dot, it respawned at a completely new position (bottom-center). HUD shows ⬤ 1. Player trail visible from motion.

**Playing — LVL 1.2** — After manually setting subLevel=2, dotsReached=4 via console: HUD shows "LVL 1.2" and "⬤ 4" in gold. Timer still running.

**Between Levels (L key)** — "LEVEL 1.2 COMPLETE · ⬤ 4 dots · ↔ 14 moves". Chat panel with GM header, wish input, "Level 2 → (OR PRESS L)" button. Game world visible and frozen behind.

