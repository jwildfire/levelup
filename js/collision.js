import * as entities from './entities.js';

// Grid-based collision (maze mode) — exact cell match
export function checkPlayer(player) {
  const hits = entities.getAt(player.x, player.y);
  return hits.map(entity => ({ entityA: player, entityB: entity }));
}

// Proximity-based collision (free mode) — circular overlap
export function checkPlayerFree(player) {
  const all = entities.getAll();
  const hits = [];
  const pr = player.radius || 10;
  for (const e of all) {
    const er = e.radius || 10;
    const dx = e.x - player.x;
    const dy = e.y - player.y;
    if (dx * dx + dy * dy < (pr + er) * (pr + er)) {
      hits.push({ entityA: player, entityB: e });
    }
  }
  return hits;
}
