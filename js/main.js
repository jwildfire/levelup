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

// Import goals
import reachExit from './goals/pool/reach-exit.js';
import reachDot from './goals/pool/reach-dot.js';

// Import pre-generated rules
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

// Register everything
goalRegistry.register(reachExit);
goalRegistry.register(reachDot);
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

// ─────────────────────────────────────────────────────────────────────────────
// Game State
// ─────────────────────────────────────────────────────────────────────────────
const gs = state.createGameState();
window._gs = gs;
let lastTime = 0;

// ─────────────────────────────────────────────────────────────────────────────
// Level Specs
// ─────────────────────────────────────────────────────────────────────────────

// Default open-world spec: a dot that needs to reach another dot.
// Everything else is built by rules on top of this blank canvas.
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

function buildMazeSpec(level) {
  const size = Math.min(5 + Math.floor(level * 1.5), 19);
  return { world: 'maze', cols: size, rows: size };
}

// ─────────────────────────────────────────────────────────────────────────────
// Level Initialization
// ─────────────────────────────────────────────────────────────────────────────

function startLevel(spec) {
  spec = spec || buildDefaultSpec();
  gs.currentSpec = spec;
  gs.worldType = spec.world;

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
    // maze world
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

  // Re-activate all current rules with fresh init
  const ruleIds = [...gs.activeRuleIds];
  for (const rule of ruleRegistry.getActive().slice()) {
    try { if (rule.destroy) rule.destroy(gs); } catch (e) { /* ignore */ }
  }
  ruleRegistry.getActive().length = 0;
  for (const id of ruleIds) {
    ruleRegistry.activate(id, gs);
  }

  // Inject spec-provided rules (GM pre-built levels can include new rules)
  if (spec.injectRules) {
    for (const rule of spec.injectRules) {
      ruleRegistry.registerInjected(rule);
      ruleRegistry.activate(rule.id, gs);
    }
  }

  // Spawn entities from goals and rules
  const goalEntities = goalRegistry.spawnAllEntities(gs.maze, gs);
  const ruleEntities = ruleRegistry.spawnAllEntities(gs.maze, gs);
  entities.addMany(goalEntities);
  entities.addMany(ruleEntities);

  ruleRegistry.onLevelStartAll(gs);

  gs.phase = 'playing';
  gs.levelStartTime = Date.now();
  screens.hide();
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Queue  (rules/GM can schedule mid-level events)
// window._addEvent({ type: 'time', ms: 10000 }, fn)
// window._addEvent({ type: 'moves', count: 20 }, fn)
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

// ─────────────────────────────────────────────────────────────────────────────
// Level Progression
// ─────────────────────────────────────────────────────────────────────────────

function onLevelComplete() {
  gs.phase = 'level-complete';
  state.recordLevelBeat(gs);
  const revealedRules = ruleRegistry.getActive().map(r => ({ name: r.name, description: r.description }));
  screens.showLevelComplete(gs, revealedRules);

  function onContinue(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      window.removeEventListener('keydown', onContinue);
      checkSaveTrash();
    }
  }
  window.addEventListener('keydown', onContinue);
}

function checkSaveTrash() {
  const mastered = state.getRulesMasteredThisLevel(gs);
  if (mastered.length > 0) {
    processSaveTrash(mastered, 0);
  } else {
    showChoices();
  }
}

function processSaveTrash(mastered, idx) {
  if (idx >= mastered.length) {
    showChoices();
    return;
  }
  const ruleId = mastered[idx];
  const rule = ruleRegistry.getById(ruleId);
  const name = rule ? rule.name : ruleId;

  gs.phase = 'save-trash';
  screens.showSaveTrash(
    ruleId, name,
    (id) => { state.saveRule(gs, id); processSaveTrash(mastered, idx + 1); },
    (id) => { state.trashRule(gs, id); processSaveTrash(mastered, idx + 1); },
    () => { processSaveTrash(mastered, idx + 1); },
  );
}

function showChoices() {
  // If the GM pre-built the next level, use it instead of the rule picker
  if (window._nextLevel) {
    const spec = window._nextLevel;
    window._nextLevel = null;
    gs.phase = 'choosing';
    screens.showNextLevelReady(() => {
      gs.level++;
      startLevel(spec);
    });
    return;
  }

  const choices = ruleRegistry.getChoices(3, gs);
  gs.phase = 'choosing';
  screens.showRulePicker(
    choices,
    (chosen) => {
      ruleRegistry.activate(chosen.id, gs);
      gs.level++;
      startLevel(buildDefaultSpec());
    },
    (prompt) => {
      handlePlayerPrompt(prompt);
    },
  );
}

async function handlePlayerPrompt(prompt) {
  screens.showGenerating(prompt, gs.gameMaster);
  gs.phase = 'generating';

  window._pendingWish = {
    prompt,
    activeRules: ruleRegistry.getActive().map(r => r.id),
    level: gs.level,
    gameMaster: gs.gameMaster,
    timestamp: Date.now(),
  };

  const timeout = 120000;
  const start = Date.now();

  function checkForInjection() {
    if (window._injectedRule) {
      const rule = window._injectedRule;
      window._injectedRule = null;
      window._pendingWish = null;
      try {
        ruleRegistry.registerInjected(rule);
        ruleRegistry.activate(rule.id, gs);
      } catch (e) {
        console.warn('Failed to activate injected rule:', e);
      }
      gs.level++;
      const spec = window._nextLevel || buildDefaultSpec();
      window._nextLevel = null;
      startLevel(spec);
      return;
    }

    if (Date.now() - start > timeout) {
      console.warn('AI generation timed out, using fallback');
      window._pendingWish = null;
      const fallback = ruleRegistry.getChoices(1, gs);
      if (fallback.length > 0) ruleRegistry.activate(fallback[0].id, gs);
      gs.level++;
      startLevel(buildDefaultSpec());
      return;
    }

    setTimeout(checkForInjection, 500);
  }

  checkForInjection();
}

// ─────────────────────────────────────────────────────────────────────────────
// External API (Claude Code / GM interface)
// ─────────────────────────────────────────────────────────────────────────────

window._injectRule = function(rule) { window._injectedRule = rule; };

window._completeLevel = function() {
  if (gs.phase === 'playing') onLevelComplete();
};

window._failLevel = function(message) {
  if (gs.phase === 'playing') {
    window._systemMsg(message || 'Level failed!');
    startLevel(gs.currentSpec);
  }
};

window._setGoal = function(description) { gs.currentGoalText = description; };

// GM can pre-build the next level at any time during play.
// window._nextLevel = { world: 'open', goalPos: {x,y}, injectRules: [...], ... }
// It will be consumed when the current level completes.
window._nextLevel = null;

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar Chat
// ─────────────────────────────────────────────────────────────────────────────

function addSidebarMsg(message, sender, type = 'gm') {
  const container = document.getElementById('sidebar-messages');
  if (!container) return;
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const el = document.createElement('div');
  el.className = `sidebar-msg ${type}`;
  el.innerHTML = `<span class="msg-sender">${sender} <span class="msg-time">${time}</span></span>${message}`;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

window._chat = function(message, sender = 'Game Master') {
  addSidebarMsg(message, sender, 'gm');
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
    inputEl.value = '';
  }

  sendBtn.addEventListener('click', send);
  inputEl.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') send();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GM Tick (fires every 30s during play — hook into window._onGmTick)
// ─────────────────────────────────────────────────────────────────────────────

const GM_TICK_MS = 30000;
let lastGmTick = 0;

function maybeGmTick(now) {
  if (gs.phase !== 'playing') return;
  if (now - lastGmTick >= GM_TICK_MS) {
    lastGmTick = now;
    if (typeof window._onGmTick === 'function') {
      try {
        window._onGmTick({
          level: gs.level,
          phase: gs.phase,
          worldType: gs.worldType,
          activeRuleIds: [...gs.activeRuleIds],
          gameMaster: gs.gameMaster,
          playerMoves: gs.player ? gs.player.moveCount : 0,
          playerMessages: [...window._playerMessages],
          timestamp: now,
        });
      } catch (e) { console.warn('_onGmTick error:', e); }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Open World Background Render
// ─────────────────────────────────────────────────────────────────────────────

function drawOpenWorldBackground() {
  const ctx = canvas.ctx;
  const w = gs.world.width;
  const h = gs.world.height;
  const oy = gs.hudHeight;

  // Subtle dot grid
  ctx.fillStyle = '#1c1c2e';
  const step = 40;
  for (let x = step; x < w; x += step) {
    for (let y = step; y < h; y += step) {
      ctx.beginPath();
      ctx.arc(x, y + oy, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Border
  ctx.strokeStyle = '#2a2a4a';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, oy + 1, w - 2, h - 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// Game Loop
// ─────────────────────────────────────────────────────────────────────────────

function gameLoop(timestamp) {
  const dt = Math.min(timestamp - lastTime, 50); // cap dt to prevent spiral
  lastTime = timestamp;

  if (gs.phase === 'playing') {

    // ── Open World ────────────────────────────────────────────────────────────
    if (gs.worldType === 'open') {
      // Apply onInput rules to each held direction
      const rawHeld = input.getHeld();
      const heldDirs = [];
      for (const dir of rawHeld) {
        let d = dir;
        for (const rule of ruleRegistry.getActive()) {
          if (rule.onInput) {
            try { d = rule.onInput(d, gs) || d; } catch (e) { /* ignore */ }
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

      // Goal check
      const keyBlocked = gs.activeRuleIds.includes('key-and-lock') && !gs.ruleData.keyCollected;
      if (!keyBlocked && goalRegistry.checkAll(gs)) {
        onLevelComplete();
      }

      // Render
      canvas.clear();
      drawOpenWorldBackground();
      entities.renderAll(canvas.ctx, 1, gs.hudHeight);
      player.render(canvas.ctx, gs.player, 1, gs.hudHeight);
      goalRegistry.renderAll(canvas.ctx, gs);
      ruleRegistry.renderAll(canvas.ctx, gs);
      hud.render(canvas.ctx, gs);

    // ── Maze World ────────────────────────────────────────────────────────────
    } else {
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
        onLevelComplete();
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

  maybeGmTick(timestamp);
  input.clearFrame();
  requestAnimationFrame(gameLoop);
}

// ─────────────────────────────────────────────────────────────────────────────
// ESC — skip to wish prompt
// ─────────────────────────────────────────────────────────────────────────────

function escapeToPrompt() {
  if (gs.phase !== 'playing') return;
  for (const rule of ruleRegistry.getActive().slice()) {
    try { if (rule.destroy) rule.destroy(gs); } catch (e) { /* ignore */ }
  }
  gs.phase = 'choosing';
  gs.level++;
  showChoices();
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') escapeToPrompt();
});

// ─────────────────────────────────────────────────────────────────────────────
// Boot
// ─────────────────────────────────────────────────────────────────────────────

function init() {
  canvas.resize(40, 15, 15); // placeholder until first level

  initSidebarChat();

  gs.phase = 'menu';
  screens.showMenu(gs, (gameMaster, initialPrompt) => {
    gs.gameMaster = gameMaster;
    window._gameMaster = gameMaster;
    const header = document.getElementById('sidebar-gm-name');
    if (header) header.textContent = `${gameMaster.emoji} ${gameMaster.name}`;
    window._systemMsg(`${gameMaster.name} has entered the game.`);

    if (initialPrompt) {
      gs.initialPrompt = initialPrompt;
      startLevel(buildDefaultSpec());
      setTimeout(() => handlePlayerPrompt(initialPrompt), 500);
    } else {
      startLevel(buildDefaultSpec());
    }
  });

  requestAnimationFrame(gameLoop);
}

init();
