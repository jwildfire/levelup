# Agent Notes for Future Sessions

Advice from Session 1 Claude to future Claude. Read this before starting work.

## What Works Well
- The rule plugin system is solid. Hooks compose cleanly and rules are independent.
- Injecting rules via `window._injectRule()` during live play is the magic of this game. Lean into it hard.
- The GM personality system is fun and players respond to it. The sidebar chat makes the AI feel present.

## What Doesn't Work (Fix These First)
- **Injected rules don't survive `startLevel()`**. This is the #1 blocker. The registry only knows about rules registered at boot via `import`. Dynamically injected rules get lost when the level transitions because `startLevel()` re-initializes from `gs.activeRuleIds` and the registry can't find the rule objects. Fix: store injected rule objects in a persistent Map keyed by ID, and have the registry check that Map during re-initialization.
- **Game-replacing rules can't complete levels**. Rules like Pong/Breakout that take over the entire canvas can't trigger the "reach exit" goal. Add `window._completeLevel()` that rules can call to signal completion directly.
- **The cron loop is too slow**. 1-minute minimum makes the GM feel laggy. The player asked for 30-second intervals. Explore alternatives or at least make the most of each check-in.

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
