# Level Up

A game where the AI Game Master builds the game *while you play it*.

You pick a GM personality. You play a quick 1-minute warm-up (Level 1). While you're playing, the GM watches you and designs Level 2 from scratch — a completely unique game that didn't exist before this session. Every playthrough after Level 1 is different: a significant remix of existing minigames, a brand-new game invented on the spot, or something the GM dreamed up based on your play style and wishes.

The goal isn't to switch between pre-made minigames. The goal is that the GM *creates* something new for you, every time.

## How It Works

```
Pick a GM → Play Level 1 (60s warm-up) → GM builds Level 2 while you play
                                                    ↓
                                        Between-levels chat (wish, react)
                                                    ↓
                                        Level 2: something completely new
                                                    ↓
                                        Repeat, escalating
```

**Level 1** is a known quantity: an open-world dot-chasing game with a 1-minute timer. One mid-level rule injection at 30s to keep things interesting. This is the GM's observation window — it watches how you move, what you say in chat, and uses that to design what comes next.

**Level 2+** is where it gets weird. The GM uses `_nextLevel` to pre-build a level during play — custom geometry, injected rules, maybe an entirely different game engine. By the time Level 1's timer fires, Level 2 is already waiting. No picking from a menu. The GM decided.

## Architecture: Bridge + Playwright

The GM loop runs through two channels:

**WebSocket Bridge** (`tools/bridge.js` + `js/gm-bridge.js`) — Real-time chat relay:
- Player chat messages → AI (instant)
- AI chat responses → browser (instant)
- Game phase changes, dot events → AI as notifications

**Playwright Session** (`tools/gm-session.js`) — Heavy lifting:
- Reads full game state via `page.evaluate()`
- Injects rule objects and `_nextLevel` specs into the running game
- Launches browser, navigates to game

```
Claude Code starts a play session
  ├── Launches WS bridge + Playwright browser
  ├── Player picks GM → bridge event → AI knows personality
  ├── Level 1 starts → AI observes via state polling + bridge events
  │   ├── Player chats → bridge → AI responds → bridge → browser
  │   └── AI designs Level 2 → injects via Playwright
  └── Level 1 ends → Level 2 loads instantly → repeat
```

## Game Masters

| | Name | Style |
|---|---|---|
| :monkey: | The Monkey's Paw | Grants your wishes... technically. |
| :fairy: | Chaotic Fairy Godmother | Bibbidi-bobbidi-whoops. |
| :slightly_smiling_face: | Passive Aggressive Assistant | No, it's fine. Really. |
| :dragon: | Evil Dungeon Master | Roll for initiative. You won't survive. |
| :microphone: | Unhinged Game Show Host | COME ON DOWN! |
| :wrench: | Game Developer | Your wish is my spec. |

## The Rules System

Rules are composable plugins that hook into the game loop. They range from simple modifiers (inverted controls, fog of war) to complete game replacements (Pong, Breakout, Snake).

**12 pre-generated rules** in `js/rules/pool/` — hazards, modifiers, collectibles.

**5 game-replacing minigames** in `js/rules/library/` — Pong, Breakout, Snake, Asteroid Dodge, Fly Swatter.

But the real power is that the GM can create *new* rules at runtime — full rule objects with custom `onTick`, `onRender`, and `onInput` hooks, injected live. The library exists as building blocks and inspiration, not as the menu.

## Running It

```bash
npm install          # first time only
npx serve .          # start game server
npm test             # run all 74 tests
```

Arrow keys / WASD to move. The GM handles the rest.

## Testing

74 Playwright tests covering all requirements (see `requirements.md`):

```bash
npm test                    # all tests
npm run test:existing       # R1-R8: existing game functionality (49 tests)
npm run test:new            # R9-R11: bridge + playwright GM loop (25 tests)
```

## Tech Stack

- Vanilla HTML5 Canvas + ES Modules (game)
- Node.js + `ws` (WebSocket bridge)
- Playwright (browser automation + testing)

## Project Structure

```
index.html              Entry point (canvas + sidebar chat)
css/style.css           Styling
js/
  main.js               Game loop, GM API, level management
  gm-bridge.js          Browser-side WebSocket bridge client
  canvas.js             Canvas utilities
  input.js              Keyboard input (discrete + held-key)
  maze.js               Procedural maze generation
  player.js             Player entity (free + grid modes)
  entities.js           Entity manager
  collision.js          Collision detection (grid + proximity)
  state.js              Game state + localStorage persistence
  engine/               Engine primitives (scenes, physics, entities)
  ui/
    hud.js              In-game HUD
    screens.js          Menus, overlays, between-levels chat
  rules/
    registry.js         Rule lifecycle management
    pool/               12 pre-generated rules
    library/            5 game-replacing minigames
  goals/
    registry.js         Goal lifecycle
    pool/               Goal modules (reach-exit, reach-dot)
tools/
  bridge.js             WebSocket bridge server
  gm-session.js         Playwright GM session orchestrator
  RULE_PROMPT.md        AI rule generation template
tests/
  existing/             R1-R8 tests (game functionality)
  new/                  R9-R11 tests (bridge + playwright)
specs/
  engine-v2.md          Engine v2 architecture spec
requirements.md         All requirements with test coverage
```

## License

See [LICENSE](LICENSE).
