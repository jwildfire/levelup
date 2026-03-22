// Reach-Dot goal — the baseline mechanic for open world.
// When player reaches the dot, it RESPAWNS at a new position.
// The level never ends by reaching a dot — only the timer ends the level.
// Dot score tracked in gs.ruleData.dotsReached.

function randomGoalPos(world, playerX, playerY) {
  const margin = 60;
  const minDist = 100;
  let nx, ny, attempts = 0;
  do {
    nx = margin + Math.random() * (world.width - margin * 2);
    ny = margin + Math.random() * (world.height - margin * 2);
    attempts++;
  } while (
    attempts < 30 &&
    Math.hypot(nx - playerX, ny - playerY) < minDist
  );
  return { x: Math.round(nx), y: Math.round(ny) };
}

export default {
  id: 'reach-dot',
  name: 'Reach the Goal',
  description: 'Get to the glowing dot.',

  init(gameState) {
    if (!gameState.ruleData.dotsReached) {
      gameState.ruleData.dotsReached = 0;
    }
  },

  check(gameState) {
    const pos = gameState.world && gameState.world.goalPos;
    if (!pos || !gameState.player) return false;

    const dx = gameState.player.x - pos.x;
    const dy = gameState.player.y - pos.y;

    if (dx * dx + dy * dy < 22 * 22) {
      // Respawn at a new random position
      gameState.world.goalPos = randomGoalPos(
        gameState.world,
        gameState.player.x,
        gameState.player.y,
      );
      gameState.ruleData.dotsReached = (gameState.ruleData.dotsReached || 0) + 1;

      // Fire onDotReached hook for rules/GM to listen to
      gameState.dotJustReached = true;
    }

    return false; // Level ends by timer, not goal
  },

  onRender(ctx, gameState) {
    const pos = gameState.world && gameState.world.goalPos;
    if (!pos) return;

    const { x, y } = pos;
    const oy = gameState.hudHeight;
    const t = Date.now();
    const pulse = 0.5 + 0.5 * Math.sin(t / 300);
    const spin = t / 1200;

    // Outer glow
    ctx.fillStyle = `rgba(255, 215, 0, ${0.07 + 0.07 * pulse})`;
    ctx.beginPath();
    ctx.arc(x, y + oy, 34, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 215, 0, ${0.12 + 0.08 * pulse})`;
    ctx.beginPath();
    ctx.arc(x, y + oy, 22, 0, Math.PI * 2);
    ctx.fill();

    // Spinning dash ring
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.4 + 0.25 * pulse})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -spin * 30;
    ctx.beginPath();
    ctx.arc(x, y + oy, 17, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 1;

    // Core
    const coreR = 9 * (0.92 + 0.08 * pulse);
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
