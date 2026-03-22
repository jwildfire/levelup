import * as canvas from './canvas.js';
import * as input from './input.js';
import * as mazeGen from './maze.js';
import * as player from './player.js';
import * as entities from './entities.js';
import * as collision from './collision.js';
import * as state from './state.js';
import * as ruleRegistry from './rules/registry.js';
import * as goalRegistry from './goals/registry.js';
import * as hud from './ui/hud.js';
import * as screens from './ui/screens.js';

// ── Goals ─────────────────────────────────────────────────────────────────────
import reachExit from './goals/pool/reach-exit.js';
import reachDot from './goals/pool/reach-dot.js';

// ── Rules ─────────────────────────────────────────────────────────────────────
import levelTimer from './rules/pool/level-timer.js';
import fireHazard from './rules/pool/fire-hazard.js';
import collectCoins from './rules/pool/collect-coins.js';
import shiftingWalls from './rules/pool/shifting-walls.js';
import invertedControls from './rules/pool/inverted-controls.js';
import timeLimit from './rules/pool/time-limit.js';
import fogOfWar from './rules/pool/fog-of-war.js';
import gravity from './rules/pool/gravity.js';
import iceFloor from './rules/pool/ice-floor.js';
import keyAndLock from './rules/pool/key-and-lock.js';
import shadowTrail from './rules/pool/shadow-trail.js';
import randomWarp from './rules/pool/random-warp.js';
import mimic from './rules/pool/mimic.js';

// ── Game-Replacing Mini-Games ────────────────────────────────────────────────
import pong from './rules/library/pong/rule.js';
import asteroidDodge from './rules/library/asteroid-dodge/rule.js';
import snakeGame from './rules/library/snake/rule.js';
import flySwatter from './rules/library/fly-swatter/rule.js';
import breakout from './rules/library/breakout/rule.js';

// Register everything
goalRegistry.register(reachExit);
goalRegistry.register(reachDot);

ruleRegistry.register(levelTimer);
ruleRegistry.register(fireHazard);
ruleRegistry.register(collectCoins);
ruleRegistry.register(shiftingWalls);
ruleRegistry.register(invertedControls);
ruleRegistry.register(timeLimit);
ruleRegistry.register(fogOfWar);
ruleRegistry.register(gravity);
ruleRegistry.register(iceFloor);
ruleRegistry.register(keyAndLock);
ruleRegistry.register(shadowTrail);
ruleRegistry.register(randomWarp);
ruleRegistry.register(mimic);

ruleRegistry.register(pong);
ruleRegistry.register(asteroidDodge);
ruleRegistry.register(snakeGame);
ruleRegistry.register(flySwatter);
ruleRegistry.register(breakout);

// ─────────────────────────────────────────────────────────────────────────────
// Game State
// ─────────────────────────────────────────────────────────────────────────────

const gs = state.createGameState();
window._gs = gs;
let lastTime = 0;

// ─────────────────────────────────────────────────────────────────────────────
// Level Specs
// ─────────────────────────────────────────────────────────────────────────────

function buildDefaultSpec() {
  return {
    world: 'open',
    width: 640,
    height: 380,
    playerPos: { x: 80, y: 190 },
    goalPos: { x: 560, y: 190 },
    playerSpeed: 180,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Level Initialization
// ─────────────────────────────────────────────────────────────────────────────

function startLevel(spec) {
  spec = spec || buildDefaultSpec();
  gs.currentSpec = spec;
  gs.worldType = spec.world;
  gs.subLevel = 0;
  gs.levelTimerExpired = false;
  gs.dotJustReached = false;

  if (spec.world === 'open') {
    const w = spec.width || 640;
    const h = spec.height || 380;
    const { hudHeight } = canvas.resizeOpen(w, h);
    gs.hudHeight = hudHeight;
    gs.world = { ...spec };
    gs.cellSize = 1;
    gs.maze = null;
    gs.player = player.createFree(spec.playerPos.x, spec.playerPos.y, spec.playerSpeed || 180);
    goalRegistry.reset();
    goalRegistry.activate('reach-dot', gs);

  } else {
    const cols = spec.cols || Math.min(5 + Math.floor(gs.level * 1.5), 19);
    const rows = spec.rows || cols;
    gs.cellSize = Math.floor(Math.min(600 / cols, 600 / rows));
    const { hudHeight } = canvas.resize(gs.cellSize, cols, rows);
    gs.hudHeight = hudHeight;
    gs.world = null;
    gs.maze = mazeGen.generate(cols, rows);
    gs.player = player.create(0, 0);
    goalRegistry.reset();
    goalRegistry.activate('reach-exit', gs);
  }

  entities.clear();
  gs.ruleData = {};
  gs.events = [];

  // Re-init all persistent rules
  const ruleIds = [...gs.activeRuleIds];
  for (const rule of ruleRegistry.getActive().slice()) {
    try { if (rule.destroy) rule.destroy(gs); } catch (_) { /* ignore */ }
  }
  ruleRegistry.getActive().length = 0;

  // Auto-activate the level timer (always on)
  ruleRegistry.activate('level-timer', gs);

  // Re-activate player's accumulated rules
  for (const id of ruleIds) {
    if (id !== 'level-timer') ruleRegistry.activate(id, gs);
  }

  // Inject any spec-provided rules (GM pre-built levels)
  if (spec.injectRules) {
    for (const rule of spec.injectRules) {
      ruleRegistry.registerInjected(rule);
      ruleRegistry.activate(rule.id, gs);
    }
  }

  // Spawn entities from goals and rules
  entities.addMany(goalRegistry.spawnAllEntities(gs.maze, gs));
  entities.addMany(ruleRegistry.spawnAllEntities(gs.maze, gs));
  ruleRegistry.onLevelStartAll(gs);

  gs.phase = 'playing';
  gs.levelStartTime = Date.now();
  screens.hide();

  // Schedule default mid-level injections (GM can override these with _clearEvents + _addEvent)
  scheduleDefaultInjections();

  // Fire onLevelStart hook for GM
  if (typeof window._onLevelStart === 'function') {
    try { window._onLevelStart({ level: gs.level, spec, gameState: gs }); } catch (_) { /* ignore */ }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Mid-Level Injection Schedule
// Open-world safe rules: inverted-controls always works; others try and silently fail.
// AI GM should override this by clearing events and setting its own.
// ─────────────────────────────────────────────────────────────────────────────

const OPEN_WORLD_RULE_POOL = ['inverted-controls', 'shadow-trail', 'random-warp'];

function scheduleDefaultInjections() {
  const available = OPEN_WORLD_RULE_POOL.filter(id => !gs.activeRuleIds.includes(id));
  const picked = available.sort(() => Math.random() - 0.5).slice(0, 3);

  // Level 1 is 60s — only inject once at 30s. Later levels get 3 injections.
  const schedule = (gs.level === 1) ? [30000] : [30000, 60000, 90000];

  schedule.forEach((ms, i) => {
    const ruleId = picked[i];
    if (!ruleId) return;
    window._addEvent({ type: 'time', ms }, (gameState) => {
      ruleRegistry.activate(ruleId, gameState);
      gameState.subLevel = (gameState.subLevel || 0) + 1;
      const rule = ruleRegistry.getById(ruleId);
      if (rule) window._chat(`↳ ${rule.name} activates.`, gs.gameMaster ? gs.gameMaster.name : 'Game');
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Queue
// ─────────────────────────────────────────────────────────────────────────────

function processEvents() {
  if (!gs.events || gs.events.length === 0) return;
  const elapsed = Date.now() - gs.levelStartTime;
  for (const evt of gs.events) {
    if (evt.fired) continue;
    let fire = false;
    if (evt.trigger.type === 'time' && elapsed >= evt.trigger.ms) fire = true;
    if (evt.trigger.type === 'moves' && gs.player && gs.player.moveCount >= evt.trigger.count) fire = true;
    if (fire) {
      evt.fired = true;
      try { evt.action(gs); } catch (e) { console.warn('Event error:', e); }
    }
  }
  gs.events = gs.events.filter(e => !e.fired);
}

window._addEvent = function(trigger, action) {
  if (!gs.events) gs.events = [];
  gs.events.push({ trigger, action, fired: false });
};

window._clearEvents = function() {
  gs.events = [];
};

window._extendTimer = function(ms) {
  if (gs.ruleData) gs.ruleData.timer_remaining = (gs.ruleData.timer_remaining || 0) + ms;
};

window._setTimer = function(ms) {
  if (gs.ruleData) {
    gs.ruleData.timer_remaining = ms;
    gs.ruleData.timer_fired = false;
    gs.levelTimerExpired = false;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Level End
// ─────────────────────────────────────────────────────────────────────────────

function onLevelEnd() {
  if (gs.phase !== 'playing') return;
  gs.phase = 'between-levels';

  // Fire hook for GM to respond
  if (typeof window._onLevelEnd === 'function') {
    try {
      window._onLevelEnd({
        level: gs.level,
        subLevel: gs.subLevel,
        dotsReached: gs.ruleData.dotsReached || 0,
        moves: gs.player ? gs.player.moveCount : 0,
        activeRuleIds: [...gs.activeRuleIds],
      });
    } catch (_) { /* ignore */ }
  }

  screens.showBetweenLevels(
    gs,
    gs.gameMaster,
    (wishText) => handleWish(wishText),
    () => advanceToNextLevel(),
  );
}

function advanceToNextLevel() {
  gs.level++;
  gs.subLevel = 0;
  const spec = window._nextLevel || buildDefaultSpec();
  window._nextLevel = null;
  startLevel(spec);
}

// ─────────────────────────────────────────────────────────────────────────────
// Wish Handling (between levels)
// ─────────────────────────────────────────────────────────────────────────────

async function handleWish(prompt) {
  // Store the pending wish — AI reads this and calls _injectRule + optionally sets _nextLevel
  window._pendingWish = {
    prompt,
    activeRules: gs.activeRuleIds,
    level: gs.level,
    gameMaster: gs.gameMaster,
    timestamp: Date.now(),
  };

  // Show generating screen only if GM needs it (leave between-levels visible otherwise)
  // The "generating" state is shown by the GM if needed via window._chat or overlay updates
  // For now, just wait for injection with a fallback timeout
  const start = Date.now();
  const timeout = 90000;

  function checkInjection() {
    if (gs.phase !== 'between-levels') return; // already moved on

    if (window._injectedRule) {
      const rule = window._injectedRule;
      window._injectedRule = null;
      window._pendingWish = null;
      try {
        ruleRegistry.registerInjected(rule);
        // Will be activated on next startLevel
        gs.activeRuleIds.push(rule.id);
      } catch (e) { console.warn('Failed to queue injected rule:', e); }
      // Don't auto-advance — let player click "Level N+1"
      if (window._addBetweenMsg) {
        window._addBetweenMsg(`✓ "${rule.name}" queued for next level.`, 'System', 'gm');
      }
      return;
    }

    if (Date.now() - start < timeout) {
      setTimeout(checkInjection, 500);
    }
  }

  checkInjection();
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar Chat
// ─────────────────────────────────────────────────────────────────────────────

function addSidebarMsg(message, sender, type = 'gm') {
  const container = document.getElementById('sidebar-messages');
  if (container) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const el = document.createElement('div');
    el.className = `sidebar-msg ${type}`;
    el.innerHTML = `<span class="msg-sender">${sender} <span class="msg-time">${time}</span></span>${message}`;
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
  }
  // Track in chat log
  gs.chatLog.push({ text: message, sender, type, ts: Date.now() });
}

window._chat = function(message, sender) {
  addSidebarMsg(message, sender || (gs.gameMaster ? gs.gameMaster.name : 'Game Master'), 'gm');
  // Also pipe to between-levels panel if open
  if (gs.phase === 'between-levels' && typeof window._addBetweenMsg === 'function') {
    window._addBetweenMsg(message, sender || (gs.gameMaster ? gs.gameMaster.name : 'Game Master'), 'gm');
  }
};

window._playerMessages = [];
window._systemMsg = function(message) {
  addSidebarMsg(message, 'System', 'system');
};

function initSidebarChat() {
  const inputEl = document.getElementById('sidebar-input');
  const sendBtn = document.getElementById('sidebar-send');
  if (!inputEl || !sendBtn) return;

  function send() {
    const msg = inputEl.value.trim();
    if (!msg) return;
    addSidebarMsg(msg, 'You', 'player');
    window._playerMessages.push({ text: msg, timestamp: Date.now() });
    gs.chatLog.push({ text: msg, sender: 'You', type: 'player', ts: Date.now() });
    inputEl.value = '';
  }

  sendBtn.addEventListener('click', send);
  inputEl.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') send();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// External API
// ─────────────────────────────────────────────────────────────────────────────

window._injectRule = function(rule) { window._injectedRule = rule; };

// Mid-level rule injection — registers + activates immediately during play
window._injectRuleLive = function(rule) {
  ruleRegistry.registerInjected(rule);
  ruleRegistry.activate(rule.id, gs);
  // Spawn entities if the rule provides them
  if (rule.spawnEntities) {
    try {
      const spawned = rule.spawnEntities(gs.maze, gs);
      if (spawned && spawned.length) entities.addMany(spawned);
    } catch (e) { console.warn('spawnEntities failed for', rule.id, e); }
  }
  gs.subLevel = (gs.subLevel || 0) + 1;
};

// Deactivate a rule mid-level
window._removeRule = function(ruleId) {
  ruleRegistry.deactivate(ruleId, gs);
};

// Expose game mode registry so GM can pick mini-games for next level
window._getGameModes = function() {
  return ruleRegistry.getGameModes().map(r => ({ id: r.id, name: r.name, description: r.description }));
};
window._getRuleById = function(id) { return ruleRegistry.getById(id); };

window._completeLevel = function() { if (gs.phase === 'playing') onLevelEnd(); };
window._failLevel = function(message) {
  if (gs.phase === 'playing') {
    window._systemMsg(message || 'Level failed — restarting.');
    startLevel(gs.currentSpec);
  }
};
window._setGoal = function(text) { gs.currentGoalText = text; };
window._nextLevel = null;

// ─────────────────────────────────────────────────────────────────────────────
// Open World Background
// ─────────────────────────────────────────────────────────────────────────────

function drawOpenWorldBackground() {
  const ctx = canvas.ctx;
  const w = gs.world.width;
  const h = gs.world.height;
  const oy = gs.hudHeight;

  ctx.fillStyle = '#181828';
  const step = 40;
  for (let x = step; x < w; x += step) {
    for (let y = step; y < h; y += step) {
      ctx.beginPath();
      ctx.arc(x, y + oy, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.strokeStyle = '#22223a';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(1, oy + 1, w - 2, h - 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// Game Loop
// ─────────────────────────────────────────────────────────────────────────────

function gameLoop(timestamp) {
  const dt = Math.min(timestamp - lastTime, 50);
  lastTime = timestamp;

  if (gs.phase === 'playing') {

    // Check for timer expiry (set by level-timer rule)
    if (gs.levelTimerExpired) {
      gs.levelTimerExpired = false;
      onLevelEnd();
      input.clearFrame();
      requestAnimationFrame(gameLoop);
      return;
    }

    // Clear dot-reached flag (rules can watch gs.dotJustReached)
    gs.dotJustReached = false;

    if (gs.worldType === 'open') {
      // ── Open World ──────────────────────────────────────────────────────────

      // Process held keys through onInput rules
      const rawHeld = input.getHeld();
      const heldDirs = [];
      for (const dir of rawHeld) {
        let d = dir;
        for (const rule of ruleRegistry.getActive()) {
          if (rule.onInput) {
            try { d = rule.onInput(d, gs) || d; } catch (_) { /* ignore */ }
          }
          if (!d) break;
        }
        if (d && !heldDirs.includes(d)) heldDirs.push(d);
      }

      player.updateFree(gs.player, heldDirs, dt, gs.world);
      entities.updateAll(dt, gs);
      ruleRegistry.tickAll(dt, gs);

      const hits = collision.checkPlayerFree(gs.player);
      for (const { entityA, entityB } of hits) {
        ruleRegistry.onCollisionAll(entityA, entityB, gs);
      }

      processEvents();
      goalRegistry.checkAll(gs); // check() handles respawn+scoring; returns false always

      canvas.clear();
      drawOpenWorldBackground();
      entities.renderAll(canvas.ctx, 1, gs.hudHeight);
      player.render(canvas.ctx, gs.player, 1, gs.hudHeight);
      goalRegistry.renderAll(canvas.ctx, gs);
      ruleRegistry.renderAll(canvas.ctx, gs);
      hud.render(canvas.ctx, gs);

    } else {
      // ── Maze World ──────────────────────────────────────────────────────────

      let direction = input.getDirection();
      if (direction) direction = ruleRegistry.processInput(direction, gs);
      if (direction) player.tryMove(gs.player, direction, gs.maze);

      entities.updateAll(dt, gs);
      ruleRegistry.tickAll(dt, gs);

      const hits = collision.checkPlayer(gs.player);
      for (const { entityA, entityB } of hits) {
        ruleRegistry.onCollisionAll(entityA, entityB, gs);
      }

      processEvents();

      const coinsBlocked = gs.activeRuleIds.includes('collect-coins') && (gs.ruleData.coinsRemaining ?? 0) > 0;
      const keyBlocked = gs.activeRuleIds.includes('key-and-lock') && !gs.ruleData.keyCollected;
      if (!coinsBlocked && !keyBlocked && goalRegistry.checkAll(gs)) {
        onLevelEnd();
      }

      canvas.clear();
      mazeGen.render(canvas.ctx, gs.maze, gs.cellSize, gs.hudHeight);
      entities.renderAll(canvas.ctx, gs.cellSize, gs.hudHeight);
      player.render(canvas.ctx, gs.player, gs.cellSize, gs.hudHeight);
      goalRegistry.renderAll(canvas.ctx, gs);
      ruleRegistry.renderAll(canvas.ctx, gs);
      hud.render(canvas.ctx, gs);
    }
  }

  input.clearFrame();
  requestAnimationFrame(gameLoop);
}

// ─────────────────────────────────────────────────────────────────────────────
// Key Handlers
// ─────────────────────────────────────────────────────────────────────────────

window.addEventListener('keydown', (e) => {
  // L or ESC during play → go to between-levels chat
  if ((e.key === 'l' || e.key === 'L' || e.key === 'Escape') && gs.phase === 'playing') {
    onLevelEnd();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GM Tick (30s interval during play — set window._onGmTick to receive it)
// ─────────────────────────────────────────────────────────────────────────────

const GM_TICK_MS = 30000;
let lastGmTick = 0;

setInterval(() => {
  if (gs.phase !== 'playing') return;
  const now = Date.now();
  if (now - lastGmTick < GM_TICK_MS) return;
  lastGmTick = now;
  if (typeof window._onGmTick === 'function') {
    try {
      window._onGmTick({
        level: gs.level,
        subLevel: gs.subLevel,
        worldType: gs.worldType,
        activeRuleIds: [...gs.activeRuleIds],
        gameMaster: gs.gameMaster,
        playerMoves: gs.player ? gs.player.moveCount : 0,
        dotsReached: gs.ruleData.dotsReached || 0,
        timerRemaining: gs.ruleData.timer_remaining || 0,
        playerMessages: [...window._playerMessages],
      });
    } catch (e) { console.warn('_onGmTick error:', e); }
  }
}, 1000);

// ─────────────────────────────────────────────────────────────────────────────
// Boot
// ─────────────────────────────────────────────────────────────────────────────

function init() {
  canvas.resize(40, 15, 15);
  initSidebarChat();
  gs.phase = 'menu';

  screens.showMenu(gs, (gm) => {
    // GM selected — show intro chat
    gs.gameMaster = gm;
    window._gameMaster = gm;

    const header = document.getElementById('sidebar-gm-name');
    if (header) header.textContent = `${gm.emoji} ${gm.name}`;

    window._systemMsg(`${gm.name} has entered the game.`);
    gs.phase = 'intro-chat';

    screens.showIntroChat(gm, (initialMessage) => {
      window._introMessage = initialMessage;
      gs.phase = 'playing';
      startLevel(buildDefaultSpec());
      if (initialMessage) {
        // Store as pending wish so AI can process it
        window._pendingWish = {
          prompt: initialMessage,
          activeRules: [],
          level: 1,
          gameMaster: gm,
          timestamp: Date.now(),
          context: 'intro',
        };
      }
    });
  });

  requestAnimationFrame(gameLoop);
}

init();
