import * as maze from '../../maze.js';

export default {
  id: 'random-warp',
  name: 'Quantum Uncertainty',
  description: 'Every 15 seconds the universe forgets where you were and puts you somewhere else.',
  category: 'modifier',
  difficulty: 3,

  init(gameState) {
    gameState.ruleData.warpTimer = 0;
    gameState.ruleData.warpInterval = 15000;
    gameState.ruleData.warpWarning = false;
  },

  destroy(gameState) {
    delete gameState.ruleData.warpTimer;
    delete gameState.ruleData.warpInterval;
    delete gameState.ruleData.warpWarning;
  },

  onLevelStart(gameState) {
    // Warp more frequently at higher levels
    gameState.ruleData.warpInterval = Math.max(8000, 15000 - gameState.level * 500);
    gameState.ruleData.warpTimer = 0;
    gameState.ruleData.warpWarning = false;
  },

  onTick(dt, gameState) {
    if (gameState.phase !== 'playing') return;
    const data = gameState.ruleData;
    data.warpTimer += dt;

    const warningThreshold = data.warpInterval - 2000;
    data.warpWarning = data.warpTimer >= warningThreshold;

    if (data.warpTimer >= data.warpInterval) {
      data.warpTimer = 0;
      data.warpWarning = false;

      const p = gameState.player;
      const mazeData = gameState.maze;
      const exclude = [
        { x: p.x, y: p.y },
        { x: mazeData.cols - 1, y: mazeData.rows - 1 },
      ];
      const points = maze.getSpawnPoints(mazeData, 1, exclude);
      if (points.length > 0) {
        p.x = points[0].x;
        p.y = points[0].y;
      }
    }
  },

  onRender(ctx, gameState) {
    const data = gameState.ruleData;
    const cs = gameState.cellSize;
    const oy = gameState.hudHeight;
    const mazeData = gameState.maze;
    const pct = data.warpTimer / data.warpInterval;

    // Warning flash when close to warp
    if (data.warpWarning) {
      const flashAlpha = 0.1 + 0.1 * Math.sin(Date.now() / 100);
      ctx.fillStyle = `rgba(0, 200, 255, ${flashAlpha})`;
      ctx.fillRect(0, oy, mazeData.cols * cs, mazeData.rows * cs);
    }

    // Warp timer bar
    const barW = 50;
    const barX = mazeData.cols * cs / 2 - barW / 2;
    const color = data.warpWarning ? '#00ccff' : '#005566';
    ctx.fillStyle = '#111';
    ctx.fillRect(barX, 36, barW, 3);
    ctx.fillStyle = color;
    ctx.fillRect(barX, 36, barW * pct, 3);

    // Label
    const secs = Math.ceil((data.warpInterval - data.warpTimer) / 1000);
    ctx.fillStyle = data.warpWarning ? '#00ccff' : '#334455';
    ctx.font = '8px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`warp: ${secs}s`, mazeData.cols * cs / 2, 32);
  },
};
