import * as maze from '../../maze.js';

export default {
  id: 'key-and-lock',
  name: 'Key Holder',
  description: 'A golden key is hidden somewhere. The exit is locked until you find it.',
  category: 'collectible',
  difficulty: 2,

  init(gameState) {
    gameState.ruleData.keyCollected = false;
    gameState.ruleData.keyPos = null;
  },

  destroy(gameState) {
    delete gameState.ruleData.keyCollected;
    delete gameState.ruleData.keyPos;
  },

  spawnEntities(mazeData, gameState) {
    const exclude = [{ x: 0, y: 0 }, { x: mazeData.cols - 1, y: mazeData.rows - 1 }];
    const points = maze.getSpawnPoints(mazeData, 1, exclude);
    if (points.length === 0) return [];

    const pos = points[0];
    gameState.ruleData.keyPos = pos;
    gameState.ruleData.keyCollected = false;

    return [{
      id: 'key-item',
      type: 'key',
      ruleId: 'key-and-lock',
      x: pos.x,
      y: pos.y,
      _frame: 0,
      update(dt) { this._frame += dt * 0.003; },
      render(ctx, cellSize, offsetY) {
        if (gameState.ruleData.keyCollected) return;
        const cx = this.x * cellSize + cellSize / 2;
        const cy = this.y * cellSize + cellSize / 2 + offsetY;
        const bob = Math.sin(this._frame) * 2;

        // Glow
        ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
        ctx.beginPath();
        ctx.arc(cx, cy + bob, cellSize * 0.38, 0, Math.PI * 2);
        ctx.fill();

        // Key head
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx - 2, cy - 3 + bob, 5, 0, Math.PI * 2);
        ctx.stroke();

        // Key shaft
        ctx.beginPath();
        ctx.moveTo(cx + 3, cy - 3 + bob);
        ctx.lineTo(cx + 10, cy - 3 + bob);
        ctx.stroke();

        // Key teeth
        ctx.beginPath();
        ctx.moveTo(cx + 7, cy - 3 + bob);
        ctx.lineTo(cx + 7, cy + bob);
        ctx.moveTo(cx + 10, cy - 3 + bob);
        ctx.lineTo(cx + 10, cy + bob);
        ctx.stroke();
      },
    }];
  },

  onCollision(entityA, entityB, gameState) {
    if (entityA.type === 'player' && entityB.type === 'key') {
      gameState.ruleData.keyCollected = true;
      window._systemMsg && window._systemMsg('Key collected! Exit is now open.');
    }
  },

  onRender(ctx, gameState) {
    if (gameState.ruleData.keyCollected) return;

    // Lock icon on exit
    const cs = gameState.cellSize;
    const oy = gameState.hudHeight;
    const maze = gameState.maze;
    const ex = (maze.cols - 1) * cs + cs / 2;
    const ey = (maze.rows - 1) * cs + cs / 2 + oy;

    ctx.strokeStyle = '#ff6600';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(255, 100, 0, 0.15)';
    ctx.beginPath();
    ctx.roundRect(ex - 8, ey - 6, 16, 12, 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ex, ey - 6, 5, Math.PI, 0);
    ctx.stroke();

    // "KEY" hint
    ctx.fillStyle = '#ffd700';
    ctx.font = `bold ${Math.max(8, cs * 0.3)}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('KEY', ex, ey - 14);
  },
};
