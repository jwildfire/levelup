export default {
  id: 'fog-of-war',
  name: 'Fog of War',
  description: 'You can only see a small area around you. The rest is shrouded in darkness.',
  category: 'visual',
  difficulty: 3,

  init(gameState) {
    gameState.ruleData.fogRadius = 2.5; // cells visible around player
  },

  destroy(gameState) {
    delete gameState.ruleData.fogRadius;
  },

  onRender(ctx, gameState) {
    const cs = gameState.cellSize;
    const oy = gameState.hudHeight;
    const w = gameState.maze.cols * cs;
    const h = gameState.maze.rows * cs;
    const p = gameState.player;
    const fogR = gameState.ruleData.fogRadius;

    const px = p.x * cs + cs / 2;
    const py = p.y * cs + cs / 2 + oy;
    const radius = fogR * cs;

    // Draw fog as a full-canvas overlay with a circular cutout
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    // Create a clipping region that is everything EXCEPT the circle
    ctx.fillStyle = 'rgba(0, 0, 0, 0.92)';
    ctx.beginPath();
    ctx.rect(0, oy, w, h);
    ctx.arc(px, py, radius, 0, Math.PI * 2, true); // true = counterclockwise = hole
    ctx.fill();

    // Soft edge
    const grad = ctx.createRadialGradient(px, py, radius * 0.7, px, py, radius);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  },
};
