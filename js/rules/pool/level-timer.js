// Level Timer — auto-activated every level.
// Level 1: 60s (quick warm-up while GM builds level 2).
// Level 2+: 120s. Fires gs.levelTimerExpired when done.
// This is a rule so it can be modified, extended, or removed.
// GM API:
//   gs.ruleData.timer_remaining   — ms left (read/write)
//   gs.ruleData.timer_duration    — total ms (default 120000)
//   window._extendTimer(ms)       — add time
//   window._setTimer(ms)          — set remaining time

export default {
  id: 'level-timer',
  name: 'Level Timer',
  description: 'The clock was ticking the whole time.',
  category: 'modifier',
  difficulty: 1,

  init(gs) {
    // Level 1 is a short warm-up (60s). Later levels get 2 minutes.
    gs.ruleData.timer_duration = (gs.level === 1) ? 60000 : 120000;
    gs.ruleData.timer_remaining = gs.ruleData.timer_duration;
    gs.ruleData.timer_fired = false;
  },

  onLevelStart(gs) {
    // Re-calc duration in case level changed (level 1 = 60s, rest = 120s)
    gs.ruleData.timer_duration = (gs.level === 1) ? 60000 : 120000;
    gs.ruleData.timer_remaining = gs.ruleData.timer_duration;
    gs.ruleData.timer_fired = false;
  },

  onTick(dt, gs) {
    if (gs.phase !== 'playing') return;
    if (gs.ruleData.timer_fired) return;
    gs.ruleData.timer_remaining = Math.max(0, gs.ruleData.timer_remaining - dt);
    if (gs.ruleData.timer_remaining <= 0) {
      gs.ruleData.timer_fired = true;
      gs.levelTimerExpired = true;
    }
  },

  onRender(ctx, gs) {
    if (gs.phase !== 'playing') return;
    const rem = gs.ruleData.timer_remaining;
    if (rem === undefined) return;

    const dur = gs.ruleData.timer_duration || 120000;
    const frac = rem / dur;
    const secs = Math.ceil(rem / 1000);
    const w = gs.worldType === 'open' ? gs.world.width : (gs.maze ? gs.maze.cols * gs.cellSize : 640);
    const oy = gs.hudHeight;

    // Timer color: green → yellow → red
    let r, g;
    if (frac > 0.5) { r = Math.floor(510 * (1 - frac)); g = 255; }
    else { r = 255; g = Math.floor(510 * frac); }
    const timerColor = `rgb(${r},${g},0)`;

    // Progress bar right at HUD/play boundary
    const barW = Math.round(w * 0.7);
    const barX = Math.round((w - barW) / 2);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(barX, oy, barW, 3);
    ctx.fillStyle = timerColor;
    ctx.fillRect(barX, oy, Math.round(barW * frac), 3);

    // Countdown text — top-center of play area
    const timerStr = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.fillStyle = timerColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.globalAlpha = frac < 0.1 ? 0.5 + 0.5 * Math.sin(Date.now() / 100) : 1;
    ctx.fillText(timerStr, w / 2, oy + 6);
    ctx.globalAlpha = 1;

    // Red screen-edge flash when <= 10s
    if (secs <= 10) {
      const flash = 0.08 + 0.08 * Math.sin(Date.now() / 150);
      const h = gs.worldType === 'open' ? gs.world.height : (gs.maze ? gs.maze.rows * gs.cellSize : 380);
      const grd = ctx.createRadialGradient(w / 2, oy + h / 2, h * 0.3, w / 2, oy + h / 2, h * 0.8);
      grd.addColorStop(0, `rgba(255,0,0,0)`);
      grd.addColorStop(1, `rgba(255,0,0,${flash})`);
      ctx.fillStyle = grd;
      ctx.fillRect(0, oy, w, h);
    }
  },
};
