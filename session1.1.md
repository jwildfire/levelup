# Level Up - Session 1.1 Notes (Coding)
**Date:** 2026-03-22

## What Is Session 1.1?

A between-play coding session. No gameplay — just fixes and content based on Session 1 feedback before Session 2.0 (next play session).

---

## Changes Made

### Bug Fixes
- **`showGenerating` GM text** — Was hardcoded "The monkey's paw curls." Now uses personality-specific flavor text per GM. The Evil DM intones ancient runes, the Game Show Host spins the WISH-O-METER, etc.
- **Injected rule persistence** — Added `registerInjected()` in registry.js that stores AI-generated rules in a persistent `Map` in addition to the main rules object. Defensive safety net so rules can't silently disappear across level transitions.
- **Exit-blocking logic** — Generalized in main.js to cleanly handle both `collect-coins` and the new `key-and-lock` rule.

### Pacing
- **Smaller mazes** — Level 1 is now 5×5 (was 7×7). Scaling is slower (`5 + floor(level * 1.5)` instead of `7 + level * 2`). Gets to rule-stacking faster.
- **GM interval 60s → 30s** — HUD countdown now shows 30s. Feels more alive.
- **`window._onGmTick`** — A callback the game fires every 30s during play with current game state snapshot. Claude Code can set this instead of relying on cron's 1-minute minimum. Real-time GM reactions without scheduler limitations.

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

## Not Done (Carry to Session 2.0 or later)

- [ ] Rule management screen (view saved/trashed from menu)
- [ ] Sound effects
- [ ] Mobile touch controls
- [ ] More goal types beyond "reach exit"
- [ ] Player stats / run history
- [ ] Auto-inject rules during play (not just between levels) — the GM should surprise mid-level

---

## Notes for Session 2.0

The `_onGmTick` hook is the key new tool for the GM. Set it at game start like:

```js
window._onGmTick = function(state) {
  // state = { level, phase, activeRuleIds, gameMaster, playerMoves, playerMessages, timestamp }
  // Inject commentary, surprise rules, etc.
};
```

Session 1's best moment was the surprise Pong injection mid-rule-pick. Session 2 should lean into that energy — use `_onGmTick` to inject rules and commentary *during* levels, not just between them. The game is most fun when the GM is actively messing with the player.
