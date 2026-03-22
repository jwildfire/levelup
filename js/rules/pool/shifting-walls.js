export default {
  id: 'shifting-walls',
  name: 'Shifting Walls',
  description: 'Some walls open and close every few seconds. Watch the timing!',
  category: 'modifier',
  difficulty: 3,

  init(gameState) {
    gameState.ruleData.shiftTimer = 0;
    gameState.ruleData.shiftInterval = 4000; // ms
    gameState.ruleData.shiftPhase = false;
    gameState.ruleData.shiftableWalls = [];
  },

  destroy(gameState) {
    // Restore original walls
    const data = gameState.ruleData;
    if (data.shiftableWalls && gameState.maze) {
      for (const sw of data.shiftableWalls) {
        const cell = gameState.maze.grid[sw.y * gameState.maze.cols + sw.x];
        if (cell) cell.walls[sw.wall] = sw.original;
        if (sw.neighborCell) {
          const nc = gameState.maze.grid[sw.neighborCell.y * gameState.maze.cols + sw.neighborCell.x];
          if (nc) nc.walls[sw.opposite] = sw.original;
        }
      }
    }
    delete gameState.ruleData.shiftTimer;
    delete gameState.ruleData.shiftInterval;
    delete gameState.ruleData.shiftPhase;
    delete gameState.ruleData.shiftableWalls;
  },

  onLevelStart(gameState) {
    // Pick some walls to be shiftable
    const maze = gameState.maze;
    const wallCount = 3 + gameState.level;
    const shiftable = [];
    const candidates = [];

    for (const cell of maze.grid) {
      if (cell.walls.e && cell.x < maze.cols - 1) {
        candidates.push({ x: cell.x, y: cell.y, wall: 'e', opposite: 'w',
          neighborCell: { x: cell.x + 1, y: cell.y } });
      }
      if (cell.walls.s && cell.y < maze.rows - 1) {
        candidates.push({ x: cell.x, y: cell.y, wall: 's', opposite: 'n',
          neighborCell: { x: cell.x, y: cell.y + 1 } });
      }
    }

    const shuffled = candidates.sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(wallCount, shuffled.length); i++) {
      shiftable.push({ ...shuffled[i], original: true });
    }

    gameState.ruleData.shiftableWalls = shiftable;
  },

  onTick(dt, gameState) {
    const data = gameState.ruleData;
    data.shiftTimer += dt;

    if (data.shiftTimer >= data.shiftInterval) {
      data.shiftTimer = 0;
      data.shiftPhase = !data.shiftPhase;

      // Toggle the shiftable walls
      for (const sw of data.shiftableWalls) {
        const newState = data.shiftPhase ? !sw.original : sw.original;
        const cell = gameState.maze.grid[sw.y * gameState.maze.cols + sw.x];
        if (cell) cell.walls[sw.wall] = newState;
        if (sw.neighborCell) {
          const nc = gameState.maze.grid[sw.neighborCell.y * gameState.maze.cols + sw.neighborCell.x];
          if (nc) nc.walls[sw.opposite] = newState;
        }
      }
    }
  },

  onRender(ctx, gameState) {
    const data = gameState.ruleData;
    if (!data.shiftableWalls) return;
    const cs = gameState.cellSize;
    const oy = gameState.hudHeight;
    const progress = data.shiftTimer / data.shiftInterval;
    const warning = progress > 0.75;

    for (const sw of data.shiftableWalls) {
      const cell = gameState.maze.grid[sw.y * gameState.maze.cols + sw.x];
      if (!cell) continue;
      const isWall = cell.walls[sw.wall];

      // Highlight shiftable walls
      const color = warning
        ? `rgba(255, 100, 100, ${0.3 + 0.3 * Math.sin(Date.now() / 100)})`
        : isWall ? 'rgba(100, 100, 255, 0.3)' : 'rgba(100, 255, 100, 0.2)';

      if (sw.wall === 'e') {
        ctx.fillStyle = color;
        ctx.fillRect(sw.x * cs + cs - 3, sw.y * cs + oy, 6, cs);
      } else if (sw.wall === 's') {
        ctx.fillStyle = color;
        ctx.fillRect(sw.x * cs, sw.y * cs + cs - 3 + oy, cs, 6);
      }
    }

    // Timer indicator
    ctx.fillStyle = warning ? '#ff6666' : '#6666ff';
    const barW = 60;
    const barH = 4;
    const barX = gameState.maze.cols * cs / 2 - barW / 2;
    ctx.fillRect(barX, 32, barW * progress, barH);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, 32, barW, barH);
  },
};
