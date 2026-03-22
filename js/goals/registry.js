const goals = {};
const active = [];

export function register(goal) {
  goals[goal.id] = goal;
}

export function activate(goalId, gameState) {
  const goal = goals[goalId];
  if (!goal) return;
  if (active.some(g => g.id === goalId)) return;
  if (goal.init) goal.init(gameState);
  active.push(goal);
}

export function getActive() {
  return active;
}

export function checkAll(gameState) {
  if (active.length === 0) return false;
  return active.every(g => g.check(gameState));
}

export function spawnAllEntities(maze, gameState) {
  const spawned = [];
  for (const goal of active) {
    if (goal.spawnEntities) {
      spawned.push(...goal.spawnEntities(maze, gameState));
    }
  }
  return spawned;
}

export function renderAll(ctx, gameState) {
  for (const goal of active) {
    if (goal.onRender) goal.onRender(ctx, gameState);
  }
}

export function reset() {
  active.length = 0;
}
