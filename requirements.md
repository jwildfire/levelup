# Level Up — Requirements

This document governs all existing and planned functionality. Every requirement has a test.

---

## R1: Game Boot & Menu

- **R1.1** — Page loads without JS errors
- **R1.2** — Menu screen shows 6 GM personality options
- **R1.3** — Clicking a GM reveals the "Begin" button
- **R1.4** — After selecting GM, intro chat screen appears with GM's welcome message
- **R1.5** — Intro chat has a text input and a "Start Level 1" button

## R2: Level 1 — The Warm-Up

- **R2.1** — Level 1 starts in open-world mode (not maze)
- **R2.2** — Player dot renders and responds to arrow keys / WASD
- **R2.3** — Gold goal dot renders and pulses
- **R2.4** — Timer starts at 60 seconds (level 1 only)
- **R2.5** — Timer renders as countdown text and progress bar
- **R2.6** — Reaching the dot: dot respawns at new position, counter increments
- **R2.7** — HUD shows level number, dot count, move count
- **R2.8** — One default rule injection fires at 30 seconds (sub-level increments)
- **R2.9** — Timer expiry triggers level end (phase changes to 'between-levels')
- **R2.10** — Pressing L or ESC during play also triggers level end

## R3: Between-Levels Screen

- **R3.1** — Shows level summary (dots reached, moves)
- **R3.2** — Shows recent chat messages
- **R3.3** — Has a wish/chat input field
- **R3.4** — Has a "Level N+1" / advance button
- **R3.5** — Advancing increments level counter and starts next level

## R4: Level 2+ — GM-Built Levels

- **R4.1** — If `_nextLevel` is set before level end, next level uses that spec
- **R4.2** — `_nextLevel.injectRules` activates rule objects at level start
- **R4.3** — Level 2+ timer is 120 seconds (not 60)
- **R4.4** — Default injection schedule: 3 injections at 30/60/90s for level 2+

## R5: GM Hook System

- **R5.1** — `_onLevelStart` fires after `startLevel()` with `{ level, spec, gameState }`
- **R5.2** — `_onLevelEnd` fires on level end with `{ level, subLevel, dotsReached, moves, activeRuleIds }`
- **R5.3** — `_onGmTick` fires every 30 seconds during play with game state snapshot
- **R5.4** — `_respondToPlayer` is called when player sends intro chat message (if set)

## R6: GM API — Mid-Level

- **R6.1** — `_chat(msg)` adds message to sidebar and chat log
- **R6.2** — `_addEvent({ type: 'time', ms }, callback)` fires callback after ms elapsed
- **R6.3** — `_addEvent({ type: 'moves', count }, callback)` fires callback after N moves
- **R6.4** — `_clearEvents()` removes all queued events
- **R6.5** — `_injectRuleLive(ruleObj)` registers, activates, and spawns entities immediately
- **R6.6** — `_removeRule(ruleId)` deactivates a rule mid-level
- **R6.7** — `_extendTimer(ms)` adds time to running timer
- **R6.8** — `_setTimer(ms)` sets timer to specific remaining value
- **R6.9** — `_completeLevel()` forces level end
- **R6.10** — `_failLevel(msg)` restarts current level

## R7: Rule System

- **R7.1** — Rules register via `ruleRegistry.register(rule)`
- **R7.2** — `activate(id, gs)` calls `init()` and adds to active list
- **R7.3** — `deactivate(id, gs)` calls `destroy()` and removes from active list
- **R7.4** — `registerInjected(rule)` persists AI-generated rules across level transitions
- **R7.5** — Rule hooks fire each frame: `onTick(dt, gs)`, `onRender(ctx, gs)`
- **R7.6** — `onInput(dir, gs)` can modify or block player input
- **R7.7** — `onCollision(eA, eB, gs)` fires on entity collision

## R8: Sidebar Chat

- **R8.1** — Sidebar renders with GM name header
- **R8.2** — Player can type and send messages
- **R8.3** — `_chat()` messages appear in sidebar with sender and timestamp
- **R8.4** — Messages are stored in `gs.chatLog`

## R9: WebSocket Bridge (NEW)

The bridge enables real-time communication between the browser game and an external AI (Claude Code).

- **R9.1** — Bridge server starts on a configurable port (default 8765)
- **R9.2** — Bridge server accepts WebSocket connections from browser and AI clients
- **R9.3** — Browser client (`gm-bridge.js`) auto-connects on page load
- **R9.4** — Browser client sends `{ type: 'player-chat', message }` when player sends sidebar message
- **R9.5** — Browser client sends `{ type: 'phase-change', phase, level }` on game phase transitions
- **R9.6** — Browser client sends `{ type: 'dot-reached', count }` when dot is reached
- **R9.7** — Bridge relays `{ type: 'gm-chat', message, sender }` from AI → browser, calls `_chat()`
- **R9.8** — Bridge relays `{ type: 'inject-rule', rule }` from AI → browser, calls `_injectRuleLive()`
- **R9.9** — Bridge relays `{ type: 'set-next-level', spec }` from AI → browser, sets `_nextLevel`
- **R9.10** — Browser client reconnects automatically if connection drops

## R10: Playwright GM Session (NEW)

The Playwright orchestrator launches the browser and monitors game state for the AI.

- **R10.1** — `gm-session.js` launches a Chromium browser and navigates to the game URL
- **R10.2** — Can read full game state via `page.evaluate(() => window._gs)`
- **R10.3** — Can execute arbitrary JS in the browser context (set hooks, inject rules)
- **R10.4** — Exposes `getGameState()` method that returns serializable game state snapshot
- **R10.5** — Exposes `injectNextLevel(spec)` method that sets `window._nextLevel` via page.evaluate
- **R10.6** — Exposes `injectRuleLive(ruleObj)` method that calls `window._injectRuleLive()` in browser
- **R10.7** — Exposes `sendChat(message, sender)` method that calls `window._chat()` in browser
- **R10.8** — Can detect game phase changes by polling or evaluating `window._gs.phase`

## R11: Integrated GM Loop (NEW)

The full agentic loop combining bridge + playwright.

- **R11.1** — GM session starts bridge server and Playwright browser together
- **R11.2** — When Level 1 starts, AI receives notification (via bridge event or state poll)
- **R11.3** — AI can read player chat messages in real-time via bridge
- **R11.4** — AI can send GM chat responses in real-time via bridge
- **R11.5** — AI can set `_nextLevel` via Playwright before Level 1 ends
- **R11.6** — When level ends and `_nextLevel` is set, Level 2 loads the GM-built spec
- **R11.7** — The loop repeats: AI builds Level N+1 during Level N
