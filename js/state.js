const STORAGE_KEY = 'levelup-save';

export function createGameState() {
  const saved = loadPersistent();
  return {
    // Session
    level: 1,
    activeRuleIds: [...saved.savedRuleIds],
    activeGoalIds: ['reach-exit'],
    player: null,
    maze: null,
    cellSize: 32,
    hudHeight: 40,

    // Phase: 'menu' | 'playing' | 'level-complete' | 'choosing' | 'save-trash'
    phase: 'menu',
    timer: 0,
    levelStartTime: 0,

    // Persistent
    savedRuleIds: saved.savedRuleIds,
    trashedRuleIds: saved.trashedRuleIds,
    ruleHistory: saved.ruleHistory,

    // Transient rule data (rules hang their state here)
    ruleData: {},
  };
}

export function savePersistent(gs) {
  const data = {
    savedRuleIds: gs.savedRuleIds,
    trashedRuleIds: gs.trashedRuleIds,
    ruleHistory: gs.ruleHistory,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // localStorage unavailable
  }
}

function loadPersistent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      return {
        savedRuleIds: data.savedRuleIds || [],
        trashedRuleIds: data.trashedRuleIds || [],
        ruleHistory: data.ruleHistory || {},
      };
    }
  } catch (e) {
    // ignore
  }
  return { savedRuleIds: [], trashedRuleIds: [], ruleHistory: {} };
}

export function recordLevelBeat(gs) {
  for (const ruleId of gs.activeRuleIds) {
    if (!gs.ruleHistory[ruleId]) {
      gs.ruleHistory[ruleId] = { timesPlayed: 0, timesBeaten: 0 };
    }
    gs.ruleHistory[ruleId].timesBeaten++;
    gs.ruleHistory[ruleId].timesPlayed++;
  }
  savePersistent(gs);
}

export function getRulesMasteredThisLevel(gs, threshold = 3) {
  return gs.activeRuleIds.filter(id => {
    const h = gs.ruleHistory[id];
    return h && h.timesBeaten >= threshold &&
      !gs.savedRuleIds.includes(id) &&
      !gs.trashedRuleIds.includes(id);
  });
}

export function saveRule(gs, ruleId) {
  if (!gs.savedRuleIds.includes(ruleId)) {
    gs.savedRuleIds.push(ruleId);
  }
  savePersistent(gs);
}

export function trashRule(gs, ruleId) {
  if (!gs.trashedRuleIds.includes(ruleId)) {
    gs.trashedRuleIds.push(ruleId);
  }
  // Remove from active if present
  gs.activeRuleIds = gs.activeRuleIds.filter(id => id !== ruleId);
  savePersistent(gs);
}

export function clearSaveData() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // ignore
  }
}
