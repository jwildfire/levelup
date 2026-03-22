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

// Game state
const gs = state.createGameState();
window._gs = gs; // debug access
let lastTime = 0;

function getMazeSize(level) {
  // Start small (5x5) and scale slowly — the fun is rule stacking, not maze size
  const size = Math.min(5 + Math.floor(level * 1.5), 19);
  return { cols: size, rows: size };
}

function startLevel() {
  const { cols, rows } = getMazeSize(gs.level);
  gs.cellSize = Math.floor(Math.min(600 / cols, 600 / rows));
  const { hudHeight } = canvas.resize(gs.cellSize, cols, rows);
  gs.hudHeight = hudHeight;

  // Generate maze
  gs.maze = mazeGen.generate(cols, rows);

  // Create/reset player
  gs.player = player.create(0, 0);

  // Clear entities
  entities.clear();
  gs.ruleData = {};

  // Activate goals
  goalRegistry.reset();
  goalRegistry.activate('reach-exit', gs);

  // Re-activate all current rules (they need fresh init for new level)
  const ruleIds = [...gs.activeRuleIds];
  // Deactivate without clearing the activeRuleIds list
  for (const rule of ruleRegistry.getActive().slice()) {
    try { if (rule.destroy) rule.destroy(gs); } catch (e) { /* ignore */ }
  }
  // Clear active list in registry but keep gs.activeRuleIds
  ruleRegistry.getActive().length = 0;
  // Re-init
  for (const id of ruleIds) {
    ruleRegistry.activate(id, gs);
  }

  // Spawn entities from goals and rules
  const goalEntities = goalRegistry.spawnAllEntities(gs.maze, gs);
  const ruleEntities = ruleRegistry.spawnAllEntities(gs.maze, gs);
  entities.addMany(goalEntities);
  entities.addMany(ruleEntities);

  // Notify rules of level start
  ruleRegistry.onLevelStartAll(gs);

  gs.phase = 'playing';
  gs.levelStartTime = Date.now();
  screens.hide();
}

function onLevelComplete() {
  gs.phase = 'level-complete';
  state.recordLevelBeat(gs);
  // Reveal active rules on completion
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
    ruleId,
    name,
    (id) => { state.saveRule(gs, id); processSaveTrash(mastered, idx + 1); },
    (id) => { state.trashRule(gs, id); processSaveTrash(mastered, idx + 1); },
    () => { processSaveTrash(mastered, idx + 1); },
  );
}

function showChoices() {
  const choices = ruleRegistry.getChoices(3, gs);

  gs.phase = 'choosing';
  screens.showRulePicker(
    choices,
    // Pick a pre-generated mystery rule
    (chosen) => {
      ruleRegistry.activate(chosen.id, gs);
      gs.level++;
      startLevel();
    },
    // Player typed a custom rule prompt
    (prompt) => {
      handlePlayerPrompt(prompt);
    },
  );
}

async function handlePlayerPrompt(prompt) {
  screens.showGenerating(prompt, gs.gameMaster);
  gs.phase = 'generating';

  // Expose the wish so Claude Code can see it and generate a rule
  window._pendingWish = {
    prompt,
    activeRules: ruleRegistry.getActive().map(r => r.id),
    level: gs.level,
    gameMaster: gs.gameMaster,
    timestamp: Date.now(),
  };

  // Wait for Claude Code to inject the rule via window._injectRule()
  // Falls back to a pre-generated rule after 120 seconds
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
      startLevel();
      return;
    }

    if (Date.now() - start > timeout) {
      // Timeout - fall back to pre-generated
      console.warn('AI generation timed out, using fallback');
      window._pendingWish = null;
      const fallback = ruleRegistry.getChoices(1, gs);
      if (fallback.length > 0) {
        ruleRegistry.activate(fallback[0].id, gs);
      }
      gs.level++;
      startLevel();
      return;
    }

    setTimeout(checkForInjection, 500);
  }

  checkForInjection();
}

// Called by Claude Code via eval to inject a generated rule
window._injectRule = function(rule) {
  window._injectedRule = rule;
};

// Level completion API — rules can call these directly
window._completeLevel = function() {
  if (gs.phase === 'playing') {
    onLevelComplete();
  }
};

window._failLevel = function(message) {
  if (gs.phase === 'playing') {
    gs.phase = 'playing'; // keep phase for retry
    // Show failure in sidebar
    window._systemMsg(message || 'Level failed!');
    // Reset to start of current level
    startLevel();
  }
};

window._setGoal = function(description) {
  gs.currentGoalText = description;
};

// Sidebar chat system
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

// Chat system - Claude Code can send messages to the player
window._chat = function(message, sender = 'Game Master') {
  addSidebarMsg(message, sender, 'gm');
};

// Player messages - exposed so Claude Code can read them
window._playerMessages = [];

// Sidebar input handler
function initSidebarChat() {
  const input = document.getElementById('sidebar-input');
  const sendBtn = document.getElementById('sidebar-send');
  if (!input || !sendBtn) return;

  function send() {
    const msg = input.value.trim();
    if (!msg) return;
    addSidebarMsg(msg, 'You', 'player');
    window._playerMessages.push({ text: msg, timestamp: Date.now() });
    input.value = '';
  }

  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', (e) => {
    e.stopPropagation(); // Don't let game steal keys
    if (e.key === 'Enter') send();
  });
}

// System message helper
window._systemMsg = function(message) {
  addSidebarMsg(message, 'System', 'system');
};

function gameLoop(timestamp) {
  const dt = timestamp - lastTime;
  lastTime = timestamp;

  if (gs.phase === 'playing') {
    // Input
    let direction = input.getDirection();
    if (direction) {
      direction = ruleRegistry.processInput(direction, gs);
    }

    // Move player
    if (direction) {
      player.tryMove(gs.player, direction, gs.maze);
    }

    // Update entities
    entities.updateAll(dt, gs);

    // Update rules
    ruleRegistry.tickAll(dt, gs);

    // Check collisions
    const hits = collision.checkPlayer(gs.player);
    for (const { entityA, entityB } of hits) {
      ruleRegistry.onCollisionAll(entityA, entityB, gs);
    }

    // Check goals — some rules block the exit until conditions are met
    const coinsBlocked = gs.activeRuleIds.includes('collect-coins') && (gs.ruleData.coinsRemaining ?? 0) > 0;
    const keyBlocked = gs.activeRuleIds.includes('key-and-lock') && !gs.ruleData.keyCollected;
    const goalsBlocked = coinsBlocked || keyBlocked;

    if (!goalsBlocked && goalRegistry.checkAll(gs)) {
      onLevelComplete();
    }

    // Render
    canvas.clear();
    mazeGen.render(canvas.ctx, gs.maze, gs.cellSize, gs.hudHeight);
    entities.renderAll(canvas.ctx, gs.cellSize, gs.hudHeight);
    player.render(canvas.ctx, gs.player, gs.cellSize, gs.hudHeight);
    goalRegistry.renderAll(canvas.ctx, gs);
    ruleRegistry.renderAll(canvas.ctx, gs);
    hud.render(canvas.ctx, gs);
  }

  maybeGmTick(timestamp);
  input.clearFrame();
  requestAnimationFrame(gameLoop);
}

// ESC key - skip current level and go to wish prompt
function escapeToPrompt() {
  if (gs.phase !== 'playing') return;
  // Deactivate all rules cleanly
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

// In-game GM tick timer — fires every 30s during play
// Claude Code can set window._onGmTick to receive these pings
const GM_TICK_INTERVAL = 30000;
let lastGmTick = 0;

function maybeGmTick(now) {
  if (gs.phase !== 'playing') return;
  if (now - lastGmTick >= GM_TICK_INTERVAL) {
    lastGmTick = now;
    if (typeof window._onGmTick === 'function') {
      try {
        window._onGmTick({
          level: gs.level,
          phase: gs.phase,
          activeRuleIds: [...gs.activeRuleIds],
          gameMaster: gs.gameMaster,
          playerMoves: gs.player ? gs.player.moveCount : 0,
          playerMessages: [...window._playerMessages],
          timestamp: now,
        });
      } catch (e) {
        console.warn('_onGmTick error:', e);
      }
    }
  }
}

// Boot
function init() {
  // Set initial canvas size so menu is usable before first level
  canvas.resize(40, 15, 15);

  initSidebarChat();

  gs.phase = 'menu';
  screens.showMenu(gs, (gameMaster, initialPrompt) => {
    gs.gameMaster = gameMaster;
    window._gameMaster = gameMaster; // expose for cron
    // Update sidebar header
    const header = document.getElementById('sidebar-gm-name');
    if (header) header.textContent = `${gameMaster.emoji} ${gameMaster.name}`;
    window._systemMsg(`${gameMaster.name} has entered the game.`);
    if (initialPrompt) {
      gs.initialPrompt = initialPrompt;
      // Treat the initial prompt as the first wish
      startLevel();
      // After a brief moment, trigger the initial prompt as a rule generation
      setTimeout(() => handlePlayerPrompt(initialPrompt), 500);
    } else {
      startLevel();
    }
  });

  requestAnimationFrame(gameLoop);
}

init();
