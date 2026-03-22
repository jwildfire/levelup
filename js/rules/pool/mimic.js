export default {
  id: 'mimic',
  name: 'The Mimic',
  description: 'An entity copies your every move, 3 steps behind. If it reaches you, back to start.',
  category: 'hazard',
  difficulty: 3,

  init(gameState) {
    gameState.ruleData.mimicHistory = [];
    gameState.ruleData.mimicPos = { x: 0, y: 0 };
    gameState.ruleData.mimicDelay = 3; // moves behind
    gameState.ruleData.mimicLastPlayerPos = null;
  },

  destroy(gameState) {
    delete gameState.ruleData.mimicHistory;
    delete gameState.ruleData.mimicPos;
    delete gameState.ruleData.mimicDelay;
    delete gameState.ruleData.mimicLastPlayerPos;
  },

  onLevelStart(gameState) {
    const delay = Math.max(1, 4 - Math.floor(gameState.level / 2));
    gameState.ruleData.mimicDelay = delay;
    gameState.ruleData.mimicHistory = [];
    gameState.ruleData.mimicPos = { x: 0, y: 0 };
    gameState.ruleData.mimicLastPlayerPos = null;
  },

  onTick(dt, gameState) {
    if (gameState.phase !== 'playing') return;
    const data = gameState.ruleData;
    const p = gameState.player;
    const last = data.mimicLastPlayerPos;

    // Record player moves
    if (!last || last.x !== p.x || last.y !== p.y) {
      data.mimicHistory.push({ x: p.x, y: p.y });
      data.mimicLastPlayerPos = { x: p.x, y: p.y };

      // Advance mimic to position `delay` steps behind
      const targetIdx = data.mimicHistory.length - 1 - data.mimicDelay;
      if (targetIdx >= 0) {
        data.mimicPos = { ...data.mimicHistory[targetIdx] };
      }

      // Check if mimic caught the player
      if (data.mimicPos.x === p.x && data.mimicPos.y === p.y && data.mimicHistory.length > data.mimicDelay) {
        p.x = 0;
        p.y = 0;
        data.mimicHistory = [];
        data.mimicPos = { x: 0, y: 0 };
        window._systemMsg && window._systemMsg('The Mimic got you!');
      }
    }
  },

  onRender(ctx, gameState) {
    const data = gameState.ruleData;
    const cs = gameState.cellSize;
    const oy = gameState.hudHeight;
    const m = data.mimicPos;
    if (!m) return;

    const cx = m.x * cs + cs / 2;
    const cy = m.y * cs + cs / 2 + oy;
    const pulse = 0.8 + 0.2 * Math.sin(Date.now() / 200);

    // Spooky red glow
    ctx.fillStyle = `rgba(255, 0, 80, ${0.15 * pulse})`;
    ctx.beginPath();
    ctx.arc(cx, cy, cs * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // Mimic body - looks like a darker version of the player
    ctx.fillStyle = `rgba(200, 0, 60, ${0.8 * pulse})`;
    ctx.beginPath();
    ctx.arc(cx, cy, cs * 0.28, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#ff4488';
    ctx.beginPath();
    ctx.arc(cx - 3, cy - 2, 2, 0, Math.PI * 2);
    ctx.arc(cx + 3, cy - 2, 2, 0, Math.PI * 2);
    ctx.fill();
  },
};
