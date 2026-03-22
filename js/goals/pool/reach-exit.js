export default {
  id: 'reach-exit',
  name: 'Reach the Exit',
  description: 'Navigate to the glowing exit tile.',

  init(gameState) {
    // Exit is always at bottom-right corner
    gameState.ruleData.exitPos = {
      x: gameState.maze.cols - 1,
      y: gameState.maze.rows - 1,
    };
  },

  check(gameState) {
    const exit = gameState.ruleData.exitPos;
    if (!exit || !gameState.player) return false;
    return gameState.player.x === exit.x && gameState.player.y === exit.y;
  },

  onRender(ctx, gameState) {
    const exit = gameState.ruleData.exitPos;
    if (!exit) return;
    const cs = gameState.cellSize;
    const oy = gameState.hudHeight;
    const cx = exit.x * cs + cs / 2;
    const cy = exit.y * cs + cs / 2 + oy;

    // Pulsing glow
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);
    const r = cs * 0.35 * (0.8 + 0.2 * pulse);

    ctx.fillStyle = `rgba(255, 215, 0, ${0.1 + 0.1 * pulse})`;
    ctx.beginPath();
    ctx.arc(cx, cy, cs * 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffed4a';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  },

  spawnEntities() {
    return [];
  },
};
