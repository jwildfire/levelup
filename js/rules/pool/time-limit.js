export default {
  id: 'time-limit',
  name: 'Race the Clock',
  description: 'You have limited time to complete the level. Hurry!',
  category: 'modifier',
  difficulty: 2,

  init(gameState) {
    gameState.ruleData.timeLimit = 0;
    gameState.ruleData.timeRemaining = 0;
  },

  destroy(gameState) {
    delete gameState.ruleData.timeLimit;
    delete gameState.ruleData.timeRemaining;
  },

  onLevelStart(gameState) {
    // Scale time with maze size
    const cells = gameState.maze.cols * gameState.maze.rows;
    const baseTime = cells * 400; // ms per cell
    gameState.ruleData.timeLimit = baseTime;
    gameState.ruleData.timeRemaining = baseTime;
  },

  onTick(dt, gameState) {
    if (gameState.phase !== 'playing') return;
    gameState.ruleData.timeRemaining -= dt;
    if (gameState.ruleData.timeRemaining <= 0) {
      gameState.ruleData.timeRemaining = 0;
      // Reset player to start
      gameState.player.x = 0;
      gameState.player.y = 0;
      // Reset timer
      gameState.ruleData.timeRemaining = gameState.ruleData.timeLimit;
    }
  },

  onRender(ctx, gameState) {
    const remaining = gameState.ruleData.timeRemaining ?? 0;
    const total = gameState.ruleData.timeLimit ?? 1;
    const pct = remaining / total;
    const secs = Math.ceil(remaining / 1000);

    const cs = gameState.cellSize;
    const w = gameState.maze.cols * cs;

    // Timer bar
    const barW = 80;
    const barH = 6;
    const barX = w / 2 - barW / 2;
    const barY = 8;

    const color = pct > 0.3 ? '#00ff88' : pct > 0.1 ? '#ffaa00' : '#ff4444';

    ctx.fillStyle = '#222';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = color;
    ctx.fillRect(barX, barY, barW * pct, barH);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.fillStyle = color;
    ctx.font = '11px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${secs}s`, w / 2, barY + barH + 12);
  },
};
