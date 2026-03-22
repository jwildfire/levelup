import * as entities from './entities.js';

export function checkPlayer(player) {
  const hits = entities.getAt(player.x, player.y);
  return hits.map(entity => ({ entityA: player, entityB: entity }));
}
