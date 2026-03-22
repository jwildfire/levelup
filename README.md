# Level Up

A maze game that evolves as you play. Start with a simple maze, then after each level choose a new rule — or wish for one. Rules stack and accumulate, making the game progressively weirder. An AI Game Master watches, injects surprises, and chats with you through a sidebar.

## How to Play

1. Serve the project with any static file server:
   ```
   npx serve .
   ```
2. Open in your browser
3. Pick a Game Master personality
4. Navigate the maze with **arrow keys** or **WASD**
5. Reach the exit to complete each level
6. Choose your next rule — pick a mystery, or type a wish

## Game Masters

| | Name | Style |
|---|---|---|
| :monkey: | The Monkey's Paw | Grants your wishes... technically. |
| :fairy: | Chaotic Fairy Godmother | Bibbidi-bobbidi-whoops. |
| :slightly_smiling_face: | Passive Aggressive Assistant | No, it's fine. Really. |
| :dragon: | Evil Dungeon Master | Roll for initiative. You won't survive. |
| :microphone: | Unhinged Game Show Host | COME ON DOWN! |
| :wrench: | Game Developer | Your wish is my spec. |

## Rules

Rules are the core mechanic. Each one implements a plugin interface with hooks into the game loop:

- **Fire Hazard** — dodge flames that spawn in the maze
- **Collect Coins** — grab all coins before the exit opens
- **Shifting Walls** — walls rearrange while you play
- **Inverted Controls** — directions are reversed
- **Time Limit** — beat the level before time runs out
- **Fog of War** — limited visibility around the player

After mastering a rule (beating it 3 times), you can **save** it (always active) or **trash** it (never appears again).

## AI Integration

When running under [Claude Code](https://claude.ai/claude-code), the game supports live AI rule generation:

- Type a wish in the rule picker prompt
- Claude Code reads the wish via `window._pendingWish` and generates a rule object
- The rule is injected live via `window._injectRule()`
- The Game Master personality influences how wishes are interpreted

The AI Game Master can also inject rules, commentary, and gameplay tweaks between levels via a cron loop.

## Tech Stack

Vanilla HTML5 Canvas + ES Modules. No build step, no framework, no dependencies.

## Project Structure

```
index.html              Entry point
css/style.css           Styling
js/
  main.js               Game loop + orchestration
  canvas.js             Canvas utilities
  input.js              Keyboard input
  maze.js               Procedural maze generation
  player.js             Player entity
  entities.js           Entity manager
  collision.js          Collision detection
  state.js              Game state + localStorage
  ui/
    hud.js              In-game HUD
    screens.js          Menus + overlays
  rules/
    registry.js         Rule lifecycle
    pool/               Pre-generated rules
  goals/
    registry.js         Goal lifecycle
    pool/               Goal modules
tools/
  RULE_PROMPT.md        AI rule generation template
```

## License

See [LICENSE](LICENSE).
