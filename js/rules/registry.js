const rules = {};
const active = [];

export function register(rule) {
  rules[rule.id] = rule;
}

export function activate(ruleId, gameState) {
  const rule = rules[ruleId];
  if (!rule) return;
  if (active.some(r => r.id === ruleId)) return;
  try {
    if (rule.init) rule.init(gameState);
  } catch (e) {
    console.warn(`Rule ${ruleId} init failed:`, e);
  }
  active.push(rule);
  if (!gameState.activeRuleIds.includes(ruleId)) {
    gameState.activeRuleIds.push(ruleId);
  }
}

export function deactivate(ruleId, gameState) {
  const idx = active.findIndex(r => r.id === ruleId);
  if (idx === -1) return;
  const rule = active[idx];
  try {
    if (rule.destroy) rule.destroy(gameState);
  } catch (e) {
    console.warn(`Rule ${ruleId} destroy failed:`, e);
  }
  active.splice(idx, 1);
  gameState.activeRuleIds = gameState.activeRuleIds.filter(id => id !== ruleId);
}

export function getActive() {
  return active;
}

export function getAll() {
  return Object.values(rules);
}

export function getById(id) {
  return rules[id];
}

export function getChoices(count, gameState) {
  const excluded = new Set([
    ...gameState.activeRuleIds,
    ...gameState.trashedRuleIds,
  ]);
  const available = Object.values(rules).filter(r => !excluded.has(r.id));
  // Shuffle and pick
  const shuffled = available.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function processInput(direction, gameState) {
  let dir = direction;
  for (const rule of active) {
    if (!dir) break;
    if (rule.onInput) {
      try {
        dir = rule.onInput(dir, gameState);
      } catch (e) {
        console.warn(`Rule ${rule.id} onInput failed:`, e);
      }
    }
  }
  return dir;
}

export function tickAll(dt, gameState) {
  for (const rule of active) {
    if (rule.onTick) {
      try {
        rule.onTick(dt, gameState);
      } catch (e) {
        console.warn(`Rule ${rule.id} onTick failed:`, e);
      }
    }
  }
}

export function onCollisionAll(entityA, entityB, gameState) {
  for (const rule of active) {
    if (rule.onCollision) {
      try {
        rule.onCollision(entityA, entityB, gameState);
      } catch (e) {
        console.warn(`Rule ${rule.id} onCollision failed:`, e);
      }
    }
  }
}

export function renderAll(ctx, gameState) {
  for (const rule of active) {
    if (rule.onRender) {
      try {
        rule.onRender(ctx, gameState);
      } catch (e) {
        console.warn(`Rule ${rule.id} onRender failed:`, e);
      }
    }
  }
}

export function spawnAllEntities(maze, gameState) {
  const spawned = [];
  for (const rule of active) {
    if (rule.spawnEntities) {
      try {
        spawned.push(...rule.spawnEntities(maze, gameState));
      } catch (e) {
        console.warn(`Rule ${rule.id} spawnEntities failed:`, e);
      }
    }
  }
  return spawned;
}

export function onLevelStartAll(gameState) {
  for (const rule of active) {
    if (rule.onLevelStart) {
      try {
        rule.onLevelStart(gameState);
      } catch (e) {
        console.warn(`Rule ${rule.id} onLevelStart failed:`, e);
      }
    }
  }
}

export function reset(gameState) {
  while (active.length > 0) {
    deactivate(active[0].id, gameState);
  }
}
