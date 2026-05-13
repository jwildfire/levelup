# Level Up

A D&D-style game where the AI *is* the Dungeon Master, building the game while you play it.

You pick a DM personality — an evil dungeon master, a chaotic fairy godmother, a passive-aggressive assistant, a game show host, or others. Each has their own world theme and storytelling style. You play a quick warm-up (Level 1), and while you're playing, the DM watches you and designs Level 2 from scratch. Between levels, the DM asks you questions and your choices steer what comes next. Every level adds new mechanics, the narrative builds on your history, and no two playthroughs are alike.

## How It Works

```
Pick a DM → Level 1 warm-up (60s) → DM observes, builds Level 2
                                              ↓
                                  Between-levels: DM asks questions
                                  Player makes choices that steer design
                                              ↓
                                  Level 2: new mechanics, narrative continues
                                              ↓
                                  Repeat — each level adds complexity
```

**Level 1** is a known quantity: an open-world dot-chasing game with a 1-minute timer. The DM uses this as an observation window — watching play style, reading chat, and designing what comes next.

**Between levels**, the DM poses structured questions with clickable choices ("Which path do you choose: the dark forest, the crystal caves, or the sky bridge?"). Player decisions are stored in session history and directly influence the next level's design.

**Level 2+** is where it gets interesting. The DM uses `_nextLevel` to pre-build a level during play — custom rules, new mechanics, narrative flavor. Each level introduces ONE new mechanic tracked in `knownMechanics`, so complexity builds progressively. The DM has full narrative continuity via `sessionHistory`.

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

## Dungeon Masters

Each DM has a personality, world theme, and escalation style:

| | Name | World Theme |
|---|---|---|
| :monkey: | The Monkey's Paw | Cursed bazaar — every deal has a hidden cost |
| :fairy: | Chaotic Fairy Godmother | Enchanted theme park that keeps glitching |
| :slightly_smiling_face: | Passive Aggressive Assistant | Corporate office adding "helpful" features |
| :dragon: | Evil Dungeon Master | Ever-descending dungeon with deadly traps |
| :microphone: | Unhinged Game Show Host | Fever-dream game show with bonus rounds |
| :wrench: | Game Developer | Sandbox prototype evolving from player feedback |

## The Rules System

Rules are composable plugins that hook into the game loop. They range from simple modifiers (inverted controls, fog of war) to complete game replacements (Pong, Breakout, Snake).

**12 pre-generated rules** in `js/rules/pool/` — hazards, modifiers, collectibles.

**5 game-replacing minigames** in `js/rules/library/` — Pong, Breakout, Snake, Asteroid Dodge, Fly Swatter.

But the real power is that the GM can create *new* rules at runtime — full rule objects with custom `onTick`, `onRender`, and `onInput` hooks, injected live. The library exists as building blocks and inspiration, not as the menu.

## Running It

```bash
npm install          # first time only
npx serve .          # start game server
npm test             # run all 89 tests
```

Arrow keys / WASD to move. The GM handles the rest.

## Testing

89 Playwright tests covering all requirements (see `requirements.md`):

```bash
npm test                    # all tests
npm run test:existing       # R1-R8: existing game functionality (49 tests)
npm run test:new            # R9-R12: bridge, playwright, D&D DM mode (40 tests)
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
  state.js              Game state, session history, known mechanics
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
  new/                  R9-R12 tests (bridge, playwright, D&D DM mode)
specs/
  engine-v2.md          Engine v2 architecture spec
requirements.md         All requirements with test coverage
```

## License

See [LICENSE](LICENSE).
