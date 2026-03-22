export default {
  id: 'shadow-trail',
  name: 'Don\'t Look Back',
  description: 'Your past haunts you. A shadow of your recent path slowly creeps toward you.',
  category: 'hazard',
  difficulty: 3,

  init(gameState) {
    gameState.ruleData.trail = [];
    gameState.ruleData.trailMaxLen = 8 + gameState.level * 2;
    gameState.ruleData.lastPos = null;
  },

  destroy(gameState) {
    delete gameState.ruleData.trail;
    delete gameState.ruleData.trailMaxLen;
    delete gameState.ruleData.lastPos;
  },

  onLevelStart(gameState) {
    gameState.ruleData.trail = [];
    gameState.ruleData.trailMaxLen = 8 + gameState.level * 2;
    gameState.ruleData.lastPos = null;
  },

  onTick(dt, gameState) {
    if (gameState.phase !== 'playing') return;
    const data = gameState.ruleData;
    const p = gameState.player;

    // Record position when player moves
    if (!data.lastPos || data.lastPos.x !== p.x || data.lastPos.y !== p.y) {
      data.trail.push({ x: p.x, y: p.y });
      data.lastPos = { x: p.x, y: p.y };

      // Trim trail to max length
      if (data.trail.length > data.trailMaxLen) {
        data.trail.shift();
      }
    }

    // Check if player is standing on an old trail cell (other than current pos)
    for (let i = 0; i < data.trail.length - 1; i++) {
      const t = data.trail[i];
      if (t.x === p.x && t.y === p.y) {
        // Caught by the shadow — reset to start
        p.x = 0;
        p.y = 0;
        data.trail = [];
        window._systemMsg && window._systemMsg('The shadow caught you!');
        break;
      }
    }
  },

  onRender(ctx, gameState) {
    const data = gameState.ruleData;
    if (!data.trail || data.trail.length === 0) return;

    const cs = gameState.cellSize;
    const oy = gameState.hudHeight;
    const len = data.trail.length;

    for (let i = 0; i < len - 1; i++) {
      const t = data.trail[i];
      const age = (len - i) / len; // 1 = oldest, 0 = newest
      const alpha = age * 0.5;
      const r = cs * 0.3 * (1 - age * 0.5);

      ctx.fillStyle = `rgba(150, 0, 200, ${alpha})`;
      ctx.beginPath();
      ctx.arc(
        t.x * cs + cs / 2,
        t.y * cs + cs / 2 + oy,
        r,
        0, Math.PI * 2
      );
      ctx.fill();
    }
  },
};
