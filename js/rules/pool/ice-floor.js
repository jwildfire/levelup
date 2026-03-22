import * as mazeModule from '../../maze.js';

export default {
  id: 'ice-floor',
  name: 'Slippery When Wet',
  description: 'The floor is ice. Every move slides you one extra cell in the same direction.',
  category: 'movement',
  difficulty: 2,

  init(gameState) {
    gameState.ruleData.lastIceDir = null;
  },

  destroy(gameState) {
    delete gameState.ruleData.lastIceDir;
  },

  onInput(direction, gameState) {
    // Store the direction so onTick can apply the slide
    gameState.ruleData.lastIceDir = direction;
    return direction;
  },

  onTick(dt, gameState) {
    if (gameState.phase !== 'playing') return;
    const data = gameState.ruleData;
    if (!data.lastIceDir) return;

    const dir = data.lastIceDir;
    data.lastIceDir = null;

    // Apply one extra slide in the same direction if no wall blocks it
    const p = gameState.player;
    const maze = gameState.maze;
    const cell = maze.grid[p.y * maze.cols + p.x];
    if (!cell) return;

    const dirMap = { up: 'n', down: 's', left: 'w', right: 'e' };
    const wallDir = dirMap[dir];
    if (!wallDir || cell.walls[wallDir]) return;

    // Move one more step
    if (dir === 'up' && p.y > 0) p.y--;
    else if (dir === 'down' && p.y < maze.rows - 1) p.y++;
    else if (dir === 'left' && p.x > 0) p.x--;
    else if (dir === 'right' && p.x < maze.cols - 1) p.x++;
  },

  onRender(ctx, gameState) {
    const cs = gameState.cellSize;
    const oy = gameState.hudHeight;
    const maze = gameState.maze;

    // Frosty blue tint on floor
    ctx.fillStyle = 'rgba(150, 220, 255, 0.07)';
    ctx.fillRect(0, oy, maze.cols * cs, maze.rows * cs);

    // Ice sparkles
    const t = Date.now() / 1000;
    ctx.fillStyle = 'rgba(200, 240, 255, 0.5)';
    for (let i = 0; i < maze.cols * maze.rows; i += 7) {
      const cx = (i % maze.cols + 0.3 + 0.4 * Math.sin(t + i)) * cs;
      const cy = (Math.floor(i / maze.cols) + 0.3 + 0.4 * Math.cos(t * 0.7 + i)) * cs + oy;
      const r = 1 + Math.abs(Math.sin(t * 2 + i));
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  },
};
