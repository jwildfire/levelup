import * as maze from '../../maze.js';

export default {
  id: 'fire-hazard',
  name: 'Avoid the Fire',
  description: 'Fire spawns in random cells. Touching fire sends you back to start.',
  category: 'hazard',
  difficulty: 2,

  init(gameState) {
    gameState.ruleData.firePositions = [];
  },

  destroy(gameState) {
    delete gameState.ruleData.firePositions;
  },

  spawnEntities(mazeData, gameState) {
    const count = 2 + gameState.level;
    const exclude = [
      { x: 0, y: 0 },
      { x: mazeData.cols - 1, y: mazeData.rows - 1 },
    ];
    const points = maze.getSpawnPoints(mazeData, count, exclude);
    gameState.ruleData.firePositions = points;

    return points.map((p, i) => ({
      id: `fire-${i}`,
      type: 'fire',
      ruleId: 'fire-hazard',
      x: p.x,
      y: p.y,
      frame: Math.random() * Math.PI * 2,
      update(dt) {
        this.frame += dt * 0.005;
      },
      render(ctx, cellSize, offsetY) {
        const cx = this.x * cellSize + cellSize / 2;
        const cy = this.y * cellSize + cellSize / 2 + offsetY;
        const flicker = 0.7 + 0.3 * Math.sin(this.frame);
        const r = cellSize * 0.25 * flicker;

        // Outer glow
        ctx.fillStyle = 'rgba(255, 80, 0, 0.2)';
        ctx.beginPath();
        ctx.arc(cx, cy, cellSize * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Flame
        ctx.fillStyle = '#ff4400';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.arc(cx, cy - r * 0.3, r * 0.5, 0, Math.PI * 2);
        ctx.fill();
      },
    }));
  },

  onCollision(entityA, entityB, gameState) {
    if (entityA.type === 'player' && entityB.type === 'fire') {
      gameState.player.x = 0;
      gameState.player.y = 0;
    }
  },
};
