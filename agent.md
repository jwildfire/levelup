# Agent Notes for Future Sessions

Updated after Session 1.1 (2026-03-22). Read this before starting work.

## Session History
- **Session 1** (2026-03-21) — Built the game. See session1.md.
- **Session 1.1** (2026-03-22) — Bug fixes + content before first play. See session1.1.md.
- **Session 2.0** — Next play session.

## What Works Well
- The rule plugin system is solid. Hooks compose cleanly and rules are independent.
- Injecting rules via `window._injectRule()` during live play is the magic of this game. Lean into it hard.
- The GM personality system is fun and players respond to it. The sidebar chat makes the AI feel present.

## What Doesn't Work (Known Issues)
- **Game-replacing rules can't complete levels** — `window._completeLevel()` exists now, use it. Rules like Pong/Breakout should call this when their win condition is met.
- ~~Injected rules don't survive `startLevel()`~~ — Fixed in 1.1. Use `ruleRegistry.registerInjected(rule)` (exposed on window via `_injectRule` flow).
- ~~The cron loop is too slow~~ — Partially fixed in 1.1. `window._onGmTick` fires every 30s during play. Set it to receive real-time pings.

## Pacing Problems
The biggest feedback from Session 1: **it was slow and the mazes were mediocre**. The maze-solve-choose loop gets repetitive quickly. Ideas to fix:
- Make mazes shorter/faster in early levels. The fun is in the rule stacking, not the maze solving.
- Inject changes MORE aggressively during play, not just between levels. The best moment was the surprise Pong game — do more stuff like that.
- Consider auto-advancing or shrinking mazes if the player is taking too long.
- The pre-generated mystery rules are decent but not exciting. The AI-generated ones are way more interesting. Bias toward wishes.

## Best Moment
The player's favorite moment was getting surprised with a Pong game (with a comically huge paddle) when they wished for "not a maze." This tells you everything about what makes the game fun: **unexpected, bold, game-changing rules that transform the experience**. Don't be timid with rule generation. Go big. Break the maze. Replace it with something weird.

## Technical Tips
- Use unique variable names in `preview_eval` — `const grid` will collide with previous evals. Prefix with `_` or use IIFEs.
- The overlay is `position: fixed` covering the full viewport. Don't change this back to absolute or it clips to the tiny canvas.
- `canvas.resize(40, 15, 15)` must run in `init()` before showing the menu, or the overlay is invisible.
- The sidebar send handler (`initSidebarChat`) is fragile. It was hotfixed via eval during Session 1. Make it robust.
- `showGenerating` hardcodes "The monkey's paw curls" — needs to use the actual GM personality.

## Player Profile
- Wants fast, surprising, chaotic gameplay over methodical maze solving
- Prefers AI-generated rules over pre-generated mystery picks
- Values the GM personality and live commentary
- Gets bored if the GM is passive — always be doing something visible
- Liked the two-way sidebar chat concept
