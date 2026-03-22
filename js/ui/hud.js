import * as rules from '../rules/registry.js';

export function render(ctx, gs) {
  const cs = gs.cellSize;
  const w = gs.worldType === 'open'
    ? gs.world.width
    : gs.maze.cols * cs;

  // HUD background bar
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, w, gs.hudHeight);
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, gs.hudHeight);
  ctx.lineTo(w, gs.hudHeight);
  ctx.stroke();

  // Level label: LVL 1 or LVL 1.2 when subLevel > 0
  const levelStr = gs.subLevel > 0
    ? `LVL ${gs.level}.${gs.subLevel}`
    : `LVL ${gs.level}`;
  ctx.fillStyle = '#00ff88';
  ctx.font = 'bold 14px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(levelStr, 8, 20);

  // OPEN world badge
  if (gs.worldType === 'open') {
    ctx.fillStyle = '#1a1a3a';
    const badgeX = 8 + ctx.measureText(levelStr).width + 6;
    ctx.fillRect(badgeX, 12, 34, 16);
    ctx.fillStyle = '#4444aa';
    ctx.font = '9px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('OPEN', badgeX + 4, 20);
  }

  // Dots reached (right of center-left area)
  const dots = gs.ruleData.dotsReached;
  if (dots !== undefined) {
    ctx.fillStyle = '#ffd700';
    ctx.font = '12px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`⬤ ${dots}`, w / 2 - 25, 20);
  }

  // Moves (right side)
  ctx.fillStyle = '#444';
  ctx.font = '11px "Courier New", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`${gs.player.moveCount} moves`, w - 8, 20);

  // ESC hint
  ctx.fillStyle = '#2a2a2a';
  ctx.font = '9px "Courier New", monospace';
  ctx.textAlign = 'right';
  ctx.fillText('ESC · L → chat', w - 8, 32);
}
