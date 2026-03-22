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

But the real power is that the GM can create *new* rules at runtime — full rule objects with custom `onTick`, `onRender`, and `onInput` hooks, injected live via `_injectRule()`. The library exists as a starting point and inspiration, not as the menu.

## Running It

```
npx serve .
```

Arrow keys / WASD to move. The GM handles the rest.

## Tech Stack

Vanilla HTML5 Canvas + ES Modules. No build step, no framework, no dependencies.

## Project Structure

```
index.html              Entry point (canvas + sidebar chat)
css/style.css           Styling
js/
  main.js               Game loop, GM API, level management
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
  RULE_PROMPT.md        AI rule generation template
specs/
  engine-v2.md          Engine v2 architecture spec
```

## License

See [LICENSE](LICENSE).
