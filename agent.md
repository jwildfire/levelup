# Agent Notes for Future Sessions

Updated after Session 1.1 (2026-03-22) flow redesign. Read this before starting work.

## Session History
- **Session 1** (2026-03-21) — Built the game. See session1.md.
- **Session 1.1** (2026-03-22) — Open world engine, new flow design, timer-based levels. See session1.1.md.
- **Session 2.0** — Next play session.

---

## Design Intent (Critical — Read This)

The game has two types of changes that feel very different to the player:

### Sub-levels (1.0 → 1.1 → 1.2 → 1.3...)
**Frequent, small, mid-level tweaks.** The game is running, and something shifts.
- Inject a new rule
- Change a parameter (speed, timer length, dot position)
- Add an entity
- No screen transition — player just notices something changed
- GM says something short in chat to explain: *"The floor just got slippery."*
- HUD updates to show LVL 1.1, 1.2, etc.

These fire at 30s, 60s, 90s by default. AI GM should pick rules based on what's happening and the narrative it's building.

### Full Level Transitions (Level 1 → Level 2 → Level 3...)
**Infrequent, large, potentially radical changes.** Timer expires, player presses L, between-levels chat shows.
- Could be a completely different game mode (open world → maze → custom)
- Could inject rules that rewrite core mechanics (replace movement, add physics, new goal)
- Could be an AI-generated engine component (new canvas shader, entirely new rule)
- GM sends a real message explaining WHY the next level is what it is
- Player can make a wish in the between-levels chat

The GM builds level N+1 during level N using `_nextLevel`. By the time the timer fires, level N+1 should already be designed.

**Example narrative arc:**
- Level 1 (0:00): Simple dots. Timer starts. "Welcome. Find the dots."
- 1.1 (0:30): Inverted controls added. "Interesting. Your muscle memory betrays you."
- 1.2 (1:00): Speed doubles. "You're adapting. Let's speed this up."
- 1.3 (1:30): Random warp added. "You thought you had it figured out."
- Level 1 ends. Between-levels chat: "You survived. Level 2 is different. Stranger."
- Level 2 starts: Different world geometry, maze added, new goal type, 3 new rules.

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
window._completeLevel();             // Force level end
window._failLevel('message');        // Restart current level

// ── Pre-build next level ───────────────────────────────────────────────────

window._nextLevel = {
  world: 'open',           // or 'maze'
  width: 640,
  height: 380,
  playerPos: { x: 80, y: 190 },
  goalPos: { x: 560, y: 190 },
  playerSpeed: 180,
  injectRules: [ruleObj],  // rules to activate at level start
};

// ── Hooks ──────────────────────────────────────────────────────────────────

window._onGmTick = function(state) {
  // Fires every 30s during play
  // state: { level, subLevel, worldType, activeRuleIds, gameMaster,
  //          playerMoves, dotsReached, timerRemaining, playerMessages }
};

window._onLevelStart = function({ level, spec, gameState }) {
  // Fires when startLevel() completes
  // Good time to schedule events and set _nextLevel
};

window._onLevelEnd = function({ level, subLevel, dotsReached, moves, activeRuleIds }) {
  // Fires when timer expires or L is pressed
  // Good time to send a chat message about level 2 and finalize _nextLevel
};

window._respondToPlayer = function(msg, callback) {
  // Called when player sends a message in intro-chat
  // Call callback(responseText) to show GM response
};

// ── Between-levels screen (while player is on chat screen) ─────────────────
window._addBetweenMsg('text', 'Sender');  // Add message to the between-levels chat
```

---

## Rule Interface

```js
{
  id: 'unique-kebab-id',
  name: 'Display Name',
  description: 'Revealed at level end.',
  category: 'hazard|modifier|collectible|visual|movement',
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

## Sub-Level Injection Pattern (most common GM operation)

```js
window._onGmTick = function(state) {
  // At 30s, inject first twist
  if (state.timerRemaining < 90000 && state.subLevel === 0) {
    window._addEvent({ type: 'time', ms: 30000 }, (gs) => {
      window._injectRule(invertedControlsRule);  // or use ruleRegistry.activate()
      gs.subLevel++;
      window._chat("Your controls just flipped. Technically you asked for this.", gs.gameMaster.name);
    });
  }
};
```

Or simpler — schedule all sub-level events immediately at level start using `_onLevelStart`:
```js
window._onLevelStart = function({ level }) {
  window._clearEvents();  // clear default schedule

  window._addEvent({ type: 'time', ms: 30000 }, (gs) => {
    // inject rule 1.1
  });
  window._addEvent({ type: 'time', ms: 60000 }, (gs) => {
    // inject rule 1.2
  });
  window._addEvent({ type: 'time', ms: 90000 }, (gs) => {
    // inject rule 1.3
  });

  // Meanwhile, design level 2
  window._nextLevel = {
    world: 'open',
    // ... custom geometry + new rules
  };
};
```

---

## Big Level Change Pattern

The most powerful thing you can do: completely rebuild the game engine mid-session.

```js
window._nextLevel = {
  world: 'open',
  playerSpeed: 80,  // slow + ponderous
  goalPos: { x: 320, y: 320 },  // center-bottom
  injectRules: [
    {
      id: 'gravity-well',
      name: 'Gravity Well',
      description: 'A force pulls you toward the center.',
      onTick(dt, gs) {
        const cx = gs.world.width / 2;
        const cy = gs.world.height / 2;
        const dx = cx - gs.player.x;
        const dy = cy - gs.player.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 5) {
          gs.player.x += (dx / dist) * 40 * (dt / 1000);
          gs.player.y += (dy / dist) * 40 * (dt / 1000);
        }
      },
      onRender(ctx, gs) {
        // draw gravity visualization
      }
    }
  ]
};

window._onLevelEnd = function({ level }) {
  window._chat(
    `Level ${level} is over. What comes next... pulls differently.`,
    gs.gameMaster.name
  );
};
```

The `injectRules` array can contain FULL rule objects — not just IDs. This is how the GM builds game modes that don't exist in the pre-generated pool. This is where it gets interesting.

---

## Known Limitations / Next Session

- **Open-world rules pool is thin**: `inverted-controls`, `shadow-trail`, `random-warp` work in open world. Most other rules are maze-specific (silently fail). Session 2.0 should create open-world-native rules: obstacles, gravity fields, speed zones, patrolling enemies.
- **`_respondToPlayer` not implemented**: Canned responses in intro chat. AI should hook this for real responses.
- **Wish processing**: Player wishes in between-levels chat trigger `_pendingWish`. AI needs to watch this and call `_injectRule` + set rule.id in `gs.activeRuleIds`.
- **No narrative history**: Chat log exists (`gs.chatLog`) but AI doesn't get it summarized. Consider building a session summary to pass back on `_onGmTick`.

## Session 2.0 Priorities

1. Set `_onLevelStart` and `_onLevelEnd` hooks to run the full level lifecycle
2. Design level 1: Start with pure dots. At 30s inject something visual. At 60s inject physics. At 90s inject chaos.
3. Design level 2 while player plays level 1. Use `_nextLevel` with a genuinely different world geometry.
4. Narrate everything. The GM should be talking constantly — about what just changed, why, what's coming.
5. Don't be timid. Session 1's best moment was replacing the maze with Pong. Go bigger than that.

## Player Profile
- Wants fast, surprising, chaotic gameplay
- Gets bored if nothing changes for more than 30 seconds
- Loves mid-level surprises more than between-level reveals
- Wants the GM to feel like it's paying attention to them specifically
- Liked the two-way chat concept — GM should respond to player messages
