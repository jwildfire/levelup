# Agent Notes for Future Sessions

Updated after Session 2.0 prep (2026-03-22). Read this before starting work.

## Session History
- **Session 1** (2026-03-21) — Built the game. See session1.md.
- **Session 1.1** (2026-03-22) — Open world engine, new flow design, timer-based levels. See session1.1.md.
- **Session 2.0** — Next play session. The agentic GM loop is the focus.

---

## The Big Idea (Read This First)

**Every playthrough after Level 1 should be completely unique.**

Level 1 is a quick, known warm-up: open world, chase dots, 1 minute. It exists so the GM can observe the player and build something new.

**Level 2 is the real game, and it should be one of:**
1. A **brand new game** the GM invents on the spot — new mechanics, new rules, new goals, something that didn't exist before this session.
2. A **significant remix** of the minigames/rules library — not just "play Pong now," but Pong with gravity wells and inverted controls and a narrative reason for it.

**The goal is NOT to:**
- Switch between pre-made minigames unchanged
- Pick from a menu of existing rules
- Play the same level structure with different modifiers

**The goal IS to:**
- Have the GM act as a game designer in real-time
- Create something that feels hand-crafted for this specific session
- Use the rules library and engine primitives as building blocks, not finished products
- Make the player feel like the game is being invented around them

---

## The Core GM Loop

This is the agentic loop that makes the game work:

```
1. Player picks a GM personality
2. Level 1 starts (60s timer, open world, dots)
3. GM observes: player movement, speed, chat messages, wishes
4. GM CREATES Level 2 during Level 1 — sets window._nextLevel with:
   - Custom world geometry (open, maze, or entirely custom)
   - New rules invented for this session (full rule objects, not just IDs)
   - Narrative framing that connects to what happened in Level 1
5. Level 1 timer fires → between-levels chat
6. Player can chat, make a wish, react
7. Level 2 loads instantly (GM already built it)
8. Repeat: GM builds Level 3 during Level 2, escalating
```

**Critical: the GM must be CREATING during Level 1, not waiting.** The 60-second window is when the GM designs Level 2. By the time the player finishes Level 1, `_nextLevel` should already be set with something genuinely new.

---

## What "Genuinely New" Means

The GM has access to:
- **Engine primitives** (`engine/primitives.js`): ball, paddle, zone, wall, collectible, enemy, projectile, timer, counter, particles
- **Physics helpers** (`engine/physics.js`): bounce, gravity, friction, collides, moveToward, patrol
- **Scene types** (`engine/scenes.js`): maze, arena, grid, platformer, blank
- **Existing rules** as inspiration: 12 pool rules + 5 library minigames
- **Full rule objects** with custom `onTick`, `onRender`, `onInput`, `spawnEntities`

"Genuinely new" means composing these into something the player hasn't seen:
- A bullet-hell dodge game with gravity wells that pull projectiles
- A memory game where tiles reveal maze paths
- A rhythm game where walls pulse to a beat
- Breakout but the bricks fight back and shoot at you
- A survival mode where the arena shrinks and enemies patrol

NOT just activating `pong` or `breakout` unchanged. Those exist as *templates* for the GM to remix.

---

## GM API Reference

```js
// ── During play (use in _onGmTick or _addEvent callbacks) ──────────────────

window._chat('message');              // Show in sidebar + between-levels screen
window._systemMsg('message');         // System-style message

window._addEvent({ type: 'time', ms: 30000 }, (gs) => { ... });  // 30s trigger
window._addEvent({ type: 'moves', count: 20 }, (gs) => { ... }); // after 20 moves
window._clearEvents();                // Remove all queued events (override schedule)

window._extendTimer(30000);           // Add 30s to level timer
window._setTimer(60000);             // Set timer to 60s remaining

window._injectRule(ruleObj);         // Inject rule mid-level (triggers injection flow)
window._injectRuleLive(ruleObj);     // Inject + activate immediately during play
window._removeRule(ruleId);          // Deactivate a rule mid-level
window._completeLevel();             // Force level end
window._failLevel('message');        // Restart current level

// ── Pre-build next level (THE KEY FEATURE) ───────────────────────────────

window._nextLevel = {
  world: 'open',           // or 'maze'
  width: 640,
  height: 380,
  playerPos: { x: 80, y: 190 },
  goalPos: { x: 560, y: 190 },
  playerSpeed: 180,
  injectRules: [ruleObj],  // rules to activate at level start — FULL OBJECTS, not IDs
};

// ── Hooks ──────────────────────────────────────────────────────────────────

window._onGmTick = function(state) {
  // Fires every 30s during play
  // state: { level, subLevel, worldType, activeRuleIds, gameMaster,
  //          playerMoves, dotsReached, timerRemaining, playerMessages }
};

window._onLevelStart = function({ level, spec, gameState }) {
  // Fires when startLevel() completes
  // THIS IS WHERE THE GM SHOULD START BUILDING THE NEXT LEVEL
};

window._onLevelEnd = function({ level, subLevel, dotsReached, moves, activeRuleIds }) {
  // Fires when timer expires or L is pressed
  // Finalize _nextLevel if not already done
};

window._respondToPlayer = function(msg, callback) {
  // Called when player sends a message in intro-chat
  // Call callback(responseText) to show GM response
};

// ── Between-levels screen ─────────────────────────────────────────────────
window._addBetweenMsg('text', 'Sender');  // Add message to the between-levels chat

// ── Inspection ────────────────────────────────────────────────────────────
window._getGameModes();    // List available game-replacing minigames
window._getRuleById(id);   // Get a rule object by ID (for remixing)
```

---

## Rule Interface

```js
{
  id: 'unique-kebab-id',
  name: 'Display Name',
  description: 'Revealed at level end.',
  category: 'hazard|modifier|collectible|visual|movement|game-replace',
  difficulty: 1-5,

  init(gs) {},          // called when activated (fresh gs.ruleData)
  destroy(gs) {},       // called on deactivation
  onLevelStart(gs) {},  // called at startLevel() after all rules re-initialized

  onInput(dir, gs) { return dir; },  // modify direction; return null to block
  onTick(dt, gs) {},                 // every frame, dt in ms
  onRender(ctx, gs) {},              // every frame, after entities + player
  onCollision(eA, eB, gs) {},        // player hit entity
  spawnEntities(maze, gs) {},        // return entity array; maze=null in open mode
}
```

**Open world coords**: `gs.player.x/y` are pixels. `gs.world.width/height`. `gs.cellSize = 1`.
**Maze world coords**: `gs.player.x/y` are grid cells. `gs.maze` available. `gs.cellSize` = px per cell.
**Rule state**: `gs.ruleData.yourKey` — cleared at each startLevel().
**dotJustReached**: `gs.dotJustReached` is briefly true after player reaches a dot. Rules can watch this.

---

## Level 1 Design (60 seconds)

Level 1 is intentionally short and simple. Its purpose:
1. Give the player something to do while the GM works
2. Let the GM observe play style (aggressive? cautious? fast?)
3. Set narrative tone through chat messages
4. **Build Level 2 in the background**

Default schedule:
- 0:00 — Level starts, open world, chase dots
- 0:30 — One rule injection (from open-world pool: inverted-controls, shadow-trail, random-warp)
- 1:00 — Timer fires, between-levels chat

GM should override the default schedule with `_clearEvents` + `_addEvent` if it has a better plan.

---

## Level 2+ Design (the creative part)

This is where the GM earns its keep. When `_onLevelStart` fires for Level 1, the GM should immediately start designing Level 2.

**Pattern:**
```js
window._onLevelStart = function({ level, spec, gameState }) {
  if (level === 1) {
    // Clear default injections, set our own
    window._clearEvents();
    window._addEvent({ type: 'time', ms: 30000 }, (gs) => {
      // inject something fun at 30s
    });

    // START BUILDING LEVEL 2 NOW
    window._nextLevel = {
      world: 'open',
      width: 640,
      height: 380,
      playerPos: { x: 320, y: 50 },
      goalPos: { x: 320, y: 330 },
      playerSpeed: 120,
      injectRules: [
        // Full rule objects with custom logic — NOT just activating existing rules
        {
          id: 'custom-session-game',
          name: 'Something New',
          description: 'A game that only exists in this session.',
          category: 'game-replace',
          difficulty: 3,
          init(gs) { /* ... */ },
          onTick(dt, gs) { /* ... */ },
          onRender(ctx, gs) { /* ... */ },
        }
      ]
    };
  }
};
```

---

## Known Limitations / Next Steps

- **Open-world rules pool is thin**: Most pool rules are maze-specific. Need open-world-native rules or the GM needs to create them.
- **`_respondToPlayer` not implemented**: Canned responses in intro chat. AI should hook this for real responses.
- **Wish processing**: Player wishes in between-levels chat set `_pendingWish`. AI needs to watch this.
- **No narrative history**: Chat log exists (`gs.chatLog`) but AI doesn't get it summarized.
- **Engine primitives not fully wired**: `engine/primitives.js` and `engine/physics.js` exist but aren't integrated into the main game loop yet. Rules can use them directly.

## Player Profile
- Wants fast, surprising, chaotic gameplay
- Gets bored if nothing changes for more than 30 seconds
- Loves mid-level surprises more than between-level reveals
- Wants the GM to feel like it's paying attention to them specifically
- Liked the two-way chat concept — GM should respond to player messages
- **Most important**: wants to feel like the game was made just for them, not picked from a list
