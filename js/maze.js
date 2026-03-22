// Procedural maze generator using recursive backtracker
// Each cell has walls: { n, s, e, w } (true = wall present)

export function generate(cols, rows) {
  const grid = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      grid.push({ x, y, walls: { n: true, s: true, e: true, w: true }, visited: false });
    }
  }

  function getCell(x, y) {
    if (x < 0 || x >= cols || y < 0 || y >= rows) return null;
    return grid[y * cols + x];
  }

  function getUnvisitedNeighbors(cell) {
    const neighbors = [];
    const dirs = [
      { dx: 0, dy: -1, wall: 'n', opposite: 's' },
      { dx: 0, dy: 1, wall: 's', opposite: 'n' },
      { dx: 1, dy: 0, wall: 'e', opposite: 'w' },
      { dx: -1, dy: 0, wall: 'w', opposite: 'e' },
    ];
    for (const d of dirs) {
      const neighbor = getCell(cell.x + d.dx, cell.y + d.dy);
      if (neighbor && !neighbor.visited) {
        neighbors.push({ cell: neighbor, wall: d.wall, opposite: d.opposite });
      }
    }
    return neighbors;
  }

  // Recursive backtracker
  const stack = [];
  const start = grid[0];
  start.visited = true;
  stack.push(start);

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors = getUnvisitedNeighbors(current);

    if (neighbors.length === 0) {
      stack.pop();
    } else {
      const { cell: next, wall, opposite } = neighbors[Math.floor(Math.random() * neighbors.length)];
      current.walls[wall] = false;
      next.walls[opposite] = false;
      next.visited = true;
      stack.push(next);
    }
  }

  // Clean up visited flags
  for (const cell of grid) delete cell.visited;

  return { grid, cols, rows, getCell };
}

export function render(ctx, maze, cellSize, offsetY = 0) {
  const { grid, cols } = maze;
  const wallColor = '#4a9eff';
  const wallWidth = 2;

  ctx.strokeStyle = wallColor;
  ctx.lineWidth = wallWidth;

  for (const cell of grid) {
    const x = cell.x * cellSize;
    const y = cell.y * cellSize + offsetY;

    if (cell.walls.n) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + cellSize, y);
      ctx.stroke();
    }
    if (cell.walls.s) {
      ctx.beginPath();
      ctx.moveTo(x, y + cellSize);
      ctx.lineTo(x + cellSize, y + cellSize);
      ctx.stroke();
    }
    if (cell.walls.e) {
      ctx.beginPath();
      ctx.moveTo(x + cellSize, y);
      ctx.lineTo(x + cellSize, y + cellSize);
      ctx.stroke();
    }
    if (cell.walls.w) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + cellSize);
      ctx.stroke();
    }
  }
}

export function getSpawnPoints(maze, count, excludePositions = []) {
  const open = maze.grid.filter(c => {
    return !excludePositions.some(p => p.x === c.x && p.y === c.y);
  });
  const shuffled = open.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(c => ({ x: c.x, y: c.y }));
}

export function canMove(maze, fromX, fromY, direction) {
  const cell = maze.grid[fromY * maze.cols + fromX];
  if (!cell) return false;
  return !cell.walls[direction];
}

export function dirToWall(dir) {
  const map = { up: 'n', down: 's', left: 'w', right: 'e' };
  return map[dir];
}
