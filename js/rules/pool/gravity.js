export default {
  id: 'gravity',
  name: 'Gravitational Pull',
  description: 'The floor has opinions. Every 2 seconds, you slide one cell south.',
  category: 'modifier',
  difficulty: 2,

  init(gameState) {
    gameState.ruleData.gravityTimer = 0;
    gameState.ruleData.gravityInterval = 2000;
  },

  destroy(gameState) {
    delete gameState.ruleData.gravityTimer;
    delete gameState.ruleData.gravityInterval;
  },

  onLevelStart(gameState) {
    // Faster gravity at higher levels
    gameState.ruleData.gravityInterval = Math.max(800, 2000 - gameState.level * 150);
  },

  onTick(dt, gameState) {
    if (gameState.phase !== 'playing') return;
    const data = gameState.ruleData;
    data.gravityTimer += dt;

    if (data.gravityTimer >= data.gravityInterval) {
      data.gravityTimer = 0;
      const p = gameState.player;
      const maze = gameState.maze;
      // Try to slide south — blocked by walls
      if (p.y < maze.rows - 1) {
        const cell = maze.grid[p.y * maze.cols + p.x];
        if (cell && !cell.walls.s) {
          p.y += 1;
        }
      }
    }
  },

  onRender(ctx, gameState) {
    const data = gameState.ruleData;
    const pct = data.gravityTimer / data.gravityInterval;
    const cs = gameState.cellSize;
    const w = gameState.maze.cols * cs;
    const oy = gameState.hudHeight;

    // Draw gravity arrows along bottom edge
    ctx.fillStyle = `rgba(100, 200, 255, ${0.2 + 0.15 * Math.sin(Date.now() / 300)})`;
    const arrowCount = Math.floor(w / (cs * 1.5));
    for (let i = 0; i < arrowCount; i++) {
      const ax = (i + 0.5) * (w / arrowCount);
      const ay = gameState.maze.rows * cs + oy - 6;
      ctx.beginPath();
      ctx.moveTo(ax, ay - 8);
      ctx.lineTo(ax - 4, ay - 14);
      ctx.lineTo(ax + 4, ay - 14);
      ctx.closePath();
      ctx.fill();
    }

    // Countdown pip
    ctx.fillStyle = pct > 0.7 ? '#64c8ff' : '#335566';
    ctx.fillRect(4, oy + 4, 4, (gameState.maze.rows * cs - 8) * pct);
  },
};
