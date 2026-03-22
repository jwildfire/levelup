import * as maze from '../../maze.js';
import * as entities from '../../entities.js';

export default {
  id: 'collect-coins',
  name: 'Coin Collector',
  description: 'Collect all coins scattered through the maze before you can exit.',
  category: 'collectible',
  difficulty: 1,

  init(gameState) {
    gameState.ruleData.coinsRemaining = 0;
    gameState.ruleData.coinsTotal = 0;
  },

  destroy(gameState) {
    delete gameState.ruleData.coinsRemaining;
    delete gameState.ruleData.coinsTotal;
  },

  spawnEntities(mazeData, gameState) {
    const count = 3 + Math.floor(gameState.level * 1.5);
    const exclude = [
      { x: 0, y: 0 },
      { x: mazeData.cols - 1, y: mazeData.rows - 1 },
    ];
    const points = maze.getSpawnPoints(mazeData, count, exclude);
    gameState.ruleData.coinsRemaining = points.length;
    gameState.ruleData.coinsTotal = points.length;

    return points.map((p, i) => ({
      id: `coin-${i}`,
      type: 'coin',
      ruleId: 'collect-coins',
      x: p.x,
      y: p.y,
      collected: false,
      bobPhase: Math.random() * Math.PI * 2,
      update(dt) {
        this.bobPhase += dt * 0.003;
      },
      render(ctx, cellSize, offsetY) {
        if (this.collected) return;
        const cx = this.x * cellSize + cellSize / 2;
        const bob = Math.sin(this.bobPhase) * 2;
        const cy = this.y * cellSize + cellSize / 2 + offsetY + bob;
        const r = cellSize * 0.2;

        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffed4a';
        ctx.beginPath();
        ctx.arc(cx - r * 0.2, cy - r * 0.2, r * 0.4, 0, Math.PI * 2);
        ctx.fill();
      },
    }));
  },

  onCollision(entityA, entityB, gameState) {
    if (entityA.type === 'player' && entityB.type === 'coin' && !entityB.collected) {
      entityB.collected = true;
      gameState.ruleData.coinsRemaining--;
      // Move the entity off-grid so it won't collide again
      entityB.x = -1;
      entityB.y = -1;
    }
  },

  onRender(ctx, gameState) {
    const remaining = gameState.ruleData.coinsRemaining ?? 0;
    const total = gameState.ruleData.coinsTotal ?? 0;
    const collected = total - remaining;

    // Only show counter after player collects the first coin
    if (collected > 0) {
      ctx.fillStyle = '#ffd700';
      ctx.font = '12px "Courier New", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${collected}/${total}`, gameState.maze.cols * gameState.cellSize - 8, 25);
    }
  },
};
