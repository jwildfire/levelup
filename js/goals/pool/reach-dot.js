export default {
  id: 'reach-dot',
  name: 'Reach the Goal',
  description: 'Get to the glowing dot.',

  init(gameState) {
    // Goal position lives in gameState.world.goalPos (set by level spec)
    // Nothing to initialize here — goal reads live from gameState
  },

  check(gameState) {
    const pos = gameState.world && gameState.world.goalPos;
    if (!pos || !gameState.player) return false;
    const dx = gameState.player.x - pos.x;
    const dy = gameState.player.y - pos.y;
    return dx * dx + dy * dy < 22 * 22;
  },

  onRender(ctx, gameState) {
    const pos = gameState.world && gameState.world.goalPos;
    if (!pos) return;

    const { x, y } = pos;
    const oy = gameState.hudHeight;
    const t = Date.now();
    const pulse = 0.5 + 0.5 * Math.sin(t / 300);
    const spin = t / 1200;

    // Outer ring glow
    ctx.fillStyle = `rgba(255, 215, 0, ${0.08 + 0.08 * pulse})`;
    ctx.beginPath();
    ctx.arc(x, y + oy, 36, 0, Math.PI * 2);
    ctx.fill();

    // Mid ring
    ctx.fillStyle = `rgba(255, 215, 0, ${0.15 + 0.1 * pulse})`;
    ctx.beginPath();
    ctx.arc(x, y + oy, 22, 0, Math.PI * 2);
    ctx.fill();

    // Spinning dash ring
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.4 + 0.3 * pulse})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -spin * 30;
    ctx.beginPath();
    ctx.arc(x, y + oy, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Core dot
    const coreR = 9 * (0.9 + 0.1 * pulse);
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(x, y + oy, coreR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff8c0';
    ctx.beginPath();
    ctx.arc(x - 3, y - 3 + oy, coreR * 0.4, 0, Math.PI * 2);
    ctx.fill();
  },

  spawnEntities() {
    return [];
  },
};
