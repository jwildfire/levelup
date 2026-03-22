// Snake — classic snake game. Eat food to grow. Don't hit walls or yourself.
// Reach target length to complete the level.

export default {
  id: 'snake-game',
  name: 'Snake',
  description: 'Classic snake. Eat, grow, survive.',
  category: 'game-replace',
  difficulty: 2,

  init(gs) {
    const w = gs.world ? gs.world.width : (gs.maze ? gs.maze.cols * gs.cellSize : 640);
    const h = gs.world ? gs.world.height : (gs.maze ? gs.maze.rows * gs.cellSize : 380);
    const oy = gs.hudHeight || 0;

    const gridSize = 16;
    const cols = Math.floor(w / gridSize);
    const rows = Math.floor(h / gridSize);

    gs.ruleData.snake = {
      w, h, oy, gridSize, cols, rows,
      body: [{ x: Math.floor(cols / 2), y: Math.floor(rows / 2) }],
      dir: { x: 1, y: 0 },
      nextDir: { x: 1, y: 0 },
      food: null,
      moveTimer: 0,
      moveRate: 120,
      target: 15,
      gameOver: false,
      keysHeld: {},
      _kd: null,
    };

    const d = gs.ruleData.snake;
    this._spawnFood(d);

    d._kd = (e) => {
      if ((e.key === 'ArrowUp' || e.key === 'w') && d.dir.y !== 1) d.nextDir = { x: 0, y: -1 };
      if ((e.key === 'ArrowDown' || e.key === 's') && d.dir.y !== -1) d.nextDir = { x: 0, y: 1 };
      if ((e.key === 'ArrowLeft' || e.key === 'a') && d.dir.x !== 1) d.nextDir = { x: -1, y: 0 };
      if ((e.key === 'ArrowRight' || e.key === 'd') && d.dir.x !== -1) d.nextDir = { x: 1, y: 0 };
    };
    window.addEventListener('keydown', d._kd);
  },

  _spawnFood(d) {
    const occupied = new Set(d.body.map(s => `${s.x},${s.y}`));
    let x, y;
    do {
      x = Math.floor(Math.random() * d.cols);
      y = Math.floor(Math.random() * d.rows);
    } while (occupied.has(`${x},${y}`));
    d.food = { x, y };
  },

  destroy(gs) {
    const d = gs.ruleData.snake;
    if (d && d._kd) window.removeEventListener('keydown', d._kd);
    delete gs.ruleData.snake;
  },

  onTick(dt, gs) {
    const d = gs.ruleData.snake;
    if (!d || d.gameOver) return;

    d.moveTimer += dt;
    if (d.moveTimer < d.moveRate) return;
    d.moveTimer = 0;

    d.dir = { ...d.nextDir };
    const head = d.body[0];
    const newHead = { x: head.x + d.dir.x, y: head.y + d.dir.y };

    // Wall collision
    if (newHead.x < 0 || newHead.x >= d.cols || newHead.y < 0 || newHead.y >= d.rows) {
      d.gameOver = true;
      setTimeout(() => {
        if (window._failLevel) window._failLevel('Snake hit the wall!');
      }, 800);
      return;
    }

    // Self collision
    if (d.body.some(s => s.x === newHead.x && s.y === newHead.y)) {
      d.gameOver = true;
      setTimeout(() => {
        if (window._failLevel) window._failLevel('Snake ate itself!');
      }, 800);
      return;
    }

    d.body.unshift(newHead);

    // Food collision
    if (d.food && newHead.x === d.food.x && newHead.y === d.food.y) {
      this._spawnFood(d);
      // Speed up slightly
      d.moveRate = Math.max(50, d.moveRate - 3);
      if (d.body.length >= d.target) {
        setTimeout(() => {
          if (window._completeLevel) window._completeLevel();
        }, 300);
      }
    } else {
      d.body.pop();
    }
  },

  onRender(ctx, gs) {
    const d = gs.ruleData.snake;
    if (!d) return;

    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, d.oy, d.w, d.h);

    // Grid lines
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= d.cols; x++) {
      ctx.beginPath();
      ctx.moveTo(x * d.gridSize, d.oy);
      ctx.lineTo(x * d.gridSize, d.oy + d.rows * d.gridSize);
      ctx.stroke();
    }
    for (let y = 0; y <= d.rows; y++) {
      ctx.beginPath();
      ctx.moveTo(0, d.oy + y * d.gridSize);
      ctx.lineTo(d.cols * d.gridSize, d.oy + y * d.gridSize);
      ctx.stroke();
    }

    // Snake body
    for (let i = 0; i < d.body.length; i++) {
      const s = d.body[i];
      const t = i / d.body.length;
      const g = Math.floor(255 * (1 - t * 0.6));
      ctx.fillStyle = d.gameOver ? '#ff3333' : `rgb(0, ${g}, ${Math.floor(g * 0.5)})`;
      ctx.fillRect(s.x * d.gridSize + 1, d.oy + s.y * d.gridSize + 1, d.gridSize - 2, d.gridSize - 2);
    }

    // Snake eyes (on head)
    if (d.body.length > 0) {
      const head = d.body[0];
      const hx = head.x * d.gridSize + d.gridSize / 2;
      const hy = d.oy + head.y * d.gridSize + d.gridSize / 2;
      ctx.fillStyle = '#fff';
      const ex = d.dir.x * 3;
      const ey = d.dir.y * 3;
      ctx.beginPath();
      ctx.arc(hx + ex - 2, hy + ey - 2, 2, 0, Math.PI * 2);
      ctx.arc(hx + ex + 2, hy + ey + 2, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Food
    if (d.food) {
      const fx = d.food.x * d.gridSize + d.gridSize / 2;
      const fy = d.oy + d.food.y * d.gridSize + d.gridSize / 2;
      const pulse = 1 + Math.sin(Date.now() / 200) * 0.2;
      ctx.fillStyle = '#ff4488';
      ctx.beginPath();
      ctx.arc(fx, fy, (d.gridSize / 2 - 2) * pulse, 0, Math.PI * 2);
      ctx.fill();
    }

    // HUD
    ctx.fillStyle = '#fff';
    ctx.font = '12px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`LENGTH: ${d.body.length} / ${d.target}`, 8, d.oy + 20);

    if (d.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, d.oy, d.w, d.h);
      ctx.fillStyle = '#ff3333';
      ctx.font = 'bold 24px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', d.w / 2, d.oy + d.h / 2);
    }
  },

  onInput(direction, gs) {
    if (gs.ruleData.snake) return null;
    return direction;
  },
};
