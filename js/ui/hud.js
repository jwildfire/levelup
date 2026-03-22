import * as rules from '../rules/registry.js';

const GM_INTERVAL = 60; // seconds between GM check-ins

export function render(ctx, gameState) {
  const cs = gameState.cellSize;
  const w = gameState.maze.cols * cs;

  // Background bar
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, w, gameState.hudHeight);
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, gameState.hudHeight);
  ctx.lineTo(w, gameState.hudHeight);
  ctx.stroke();

  // Level
  ctx.fillStyle = '#00ff88';
  ctx.font = 'bold 14px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`LVL ${gameState.level}`, 8, 20);

  // Active rules - show as mystery count, not names
  const activeRules = rules.getActive();
  if (activeRules.length > 0) {
    ctx.fillStyle = '#555';
    ctx.font = '10px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${activeRules.length} rule${activeRules.length > 1 ? 's' : ''} active`, 70, 20);
  }

  // Move count
  ctx.fillStyle = '#555';
  ctx.font = '11px "Courier New", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`Moves: ${gameState.player.moveCount}`, w - 8, 12);

  // GM check-in countdown
  if (gameState.levelStartTime && gameState.phase === 'playing') {
    const elapsed = (Date.now() - gameState.levelStartTime) / 1000;
    const remaining = Math.max(0, GM_INTERVAL - (elapsed % GM_INTERVAL));
    const secs = Math.ceil(remaining);
    const barWidth = 50;
    const barX = w / 2 - barWidth / 2;
    const barY = 30;
    const progress = 1 - (remaining / GM_INTERVAL);

    // Bar background
    ctx.fillStyle = '#222';
    ctx.fillRect(barX, barY, barWidth, 4);
    // Bar fill - goes from green to red as it gets close
    const r = Math.floor(255 * progress);
    const g = Math.floor(255 * (1 - progress));
    ctx.fillStyle = `rgb(${r}, ${g}, 50)`;
    ctx.fillRect(barX, barY, barWidth * progress, 4);

    // Label
    ctx.fillStyle = '#444';
    ctx.font = '9px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`GM: ${secs}s`, w / 2, 26);

    // ESC hint
    ctx.fillStyle = '#333';
    ctx.textAlign = 'right';
    ctx.fillText('ESC: skip', w - 8, 26);
  }
}
