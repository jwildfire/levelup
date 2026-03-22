# Agent Notes for Future Sessions

Updated after Session 1.1 (2026-03-22). Read this before starting work.

## Session History
- **Session 1** (2026-03-21) — Built the game. See session1.md.
- **Session 1.1** (2026-03-22) — Bug fixes, 6 new rules, open world engine. See session1.1.md.
- **Session 2.0** — Next play session.

---

## What the Game Is Now

The default level is an open canvas: a green dot (you) and a gold dot (reach it). No maze. No walls. Everything else is added by rules or the GM. The maze is still available (`world: 'maze'`) but is no longer the default.

The GM pre-builds levels during play via `window._nextLevel`. When the current level ends, instead of showing the rule picker, the GM's level loads instantly. This is the core loop.

---

## GM API (what you can do during play)

```js
// Send a message to the player's sidebar
window._chat('message', 'Sender Name');
window._systemMsg('message'); // System style

// Read what the player typed
window._playerMessages; // array of { text, timestamp }

// Inject a rule right now (mid-level)
window._injectRule(ruleObj); // triggers handlePlayerPrompt injection path

// Force level complete / restart
window._completeLevel();
window._failLevel('message');

// Pre-build next level (consumed on current level's completion)
window._nextLevel = {
  world: 'open',           // or 'maze'
  width: 640, height: 380, // open world only
  playerPos: { x: 80, y: 190 },
  goalPos: { x: 560, y: 190 },
  playerSpeed: 180,
  injectRules: [ruleObj],  // optional: inject new rules into the level
};

// Schedule a mid-level event
window._addEvent({ type: 'time', ms: 15000 }, (gs) => {
  // fires 15s into level
  window._injectRule(surpriseRule);
});
window._addEvent({ type: 'moves', count: 25 }, (gs) => {
  window._chat('Nice moves!');
});

// 30-second heartbeat during play
window._onGmTick = function(state) {
  // state = { level, worldType, activeRuleIds, gameMaster,
  //           playerMoves, playerMessages, timestamp }
  // Use this instead of cron — fires every 30s, real-time
};

// Read full game state
window._gs; // { level, phase, worldType, world, maze, player, activeRuleIds, ... }
window._gameMaster; // { id, name, emoji, style, color }
window._pendingWish; // set when player submits a wish
```

---

## Rule Interface

```js
{
  id: 'unique-kebab-id',
  name: 'Display Name',
  description: 'Revealed after beating the level.',
  category: 'hazard|modifier|collectible|visual|movement',
  difficulty: 1-5,

  init(gameState) {},          // called when activated
  destroy(gameState) {},       // called on deactivation
  onLevelStart(gameState) {},  // called each new level

  onInput(dir, gs) { return dir; },  // modify direction, return null to cancel
  onTick(dt, gs) {},           // every frame (~16ms), dt in ms
  onRender(ctx, gs) {},        // every frame, after world/entities/player
  onCollision(eA, eB, gs) {},  // player touched entity
  spawnEntities(maze, gs) {},  // return entity array (maze=null in open mode)
}
```

**Open world coordinates:** pixel-based. Player is at `gs.player.x, gs.player.y` in pixels. Canvas is `gs.world.width × gs.world.height`. `gs.cellSize = 1`. Entities in open world should store pixel coords as `x, y` directly.

**Maze world coordinates:** grid-based. `gs.maze` is available. Entities use cell coords × `gs.cellSize`. `gs.player.x/y` are cell indices.

**State namespace:** `gs.ruleData.yourKey` — survives the level, cleared at level start.

---

## What Doesn't Work / Watch Out For

- **Maze rules in open world** — Rules that call `maze.getSpawnPoints()` or read `gs.maze` will throw silently (caught by try-catch). They just do nothing. This is fine.
- **`onInput` in open world** — Runs per held direction. If you flip 'left' to 'right', it applies to every frame the key is held. Test carefully.
- **Game-replacing rules** — Call `window._completeLevel()` when the alternative game's win condition is met.
- **Variable collisions in injected rule code** — Use IIFEs or unique prefixes. `const grid` will conflict with previous evals.

---

## Session 2.0 Strategy

The game is most fun when the GM is actively messing with things mid-level. The canonical session 2 arc:

1. Start with open world dot-to-dot — boring on purpose
2. Use `_onGmTick` at 30s to add something unexpected mid-level via `_addEvent`
3. Use `_nextLevel` to warp the geometry while the player is still playing
4. Use `_injectRule` to replace the experience entirely when the player wishes for it (Pong, Breakout, trivia — anything)
5. Escalate each level: more rules stacked, weirder geometry, shorter tolerance

**Don't be timid.** The best moment in Session 1 was Pong with a comically huge paddle. Go bigger.

## Player Profile
- Wants fast, surprising, chaotic gameplay over methodical solving
- Prefers AI-generated rules over mystery picks
- Gets bored quickly if nothing changes
- Loves mid-level surprises more than between-level reveals
- Liked two-way sidebar chat — make the GM feel present and reactive
