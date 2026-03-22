let entities = [];

export function clear() {
  entities = [];
}

export function add(entity) {
  entities.push(entity);
}

export function addMany(list) {
  entities.push(...list);
}

export function remove(id) {
  entities = entities.filter(e => e.id !== id);
}

export function removeByRule(ruleId) {
  entities = entities.filter(e => e.ruleId !== ruleId);
}

export function getAll() {
  return entities;
}

export function getByType(type) {
  return entities.filter(e => e.type === type);
}

export function getAt(x, y) {
  return entities.filter(e => e.x === x && e.y === y);
}

export function updateAll(dt, gameState) {
  for (const e of entities) {
    if (e.update) e.update(dt, gameState);
  }
}

export function renderAll(ctx, cellSize, offsetY = 0) {
  for (const e of entities) {
    if (e.render) e.render(ctx, cellSize, offsetY);
  }
}
