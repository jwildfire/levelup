// Scene system — different canvas layouts rules can use
// A scene provides: bounds, rendering, and collision context.
// Rules declare a scene type; the game loop uses it instead of auto-generating a maze.

// ── Scene: Maze ───────────────────────────────────────────
// Classic grid maze. This is what the game used originally.
export function maze(cols, rows) {
  return {
    type: 'maze',
    cols, rows,
    description: 'Grid maze with walls. Player moves cell-by-cell.',
  };
}

// ── Scene: Arena ──────────────────────────────────────────
// Open rectangular area. Good for pong, breakout, bullet hell, etc.
export function arena(width, height, { bgColor = '#111', borderColor = '#4a9eff', borderWidth = 2 } = {}) {
  return {
    type: 'arena',
    width, height, bgColor, borderColor, borderWidth,
    description: 'Open rectangle. Free pixel movement.',
    bounds() {
      return { left: 0, top: 0, right: width, bottom: height };
    },
    render(ctx, offsetY = 0) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, offsetY, width, height);
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderWidth;
      ctx.strokeRect(0, offsetY, width, height);
    },
  };
}

// ── Scene: Grid ───────────────────────────────────────────
// Grid of cells without maze walls. Good for puzzle games, match-3, minesweeper.
export function grid(cols, rows, cellSize, { bgColor = '#111', lineColor = '#222' } = {}) {
  return {
    type: 'grid',
    cols, rows, cellSize,
    description: 'Open grid of cells. No walls, free grid movement.',
    width: cols * cellSize,
    height: rows * cellSize,
    bounds() {
      return { left: 0, top: 0, right: cols * cellSize, bottom: rows * cellSize };
    },
    render(ctx, offsetY = 0) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, offsetY, cols * cellSize, rows * cellSize);
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= cols; x++) {
        ctx.beginPath();
        ctx.moveTo(x * cellSize, offsetY);
        ctx.lineTo(x * cellSize, offsetY + rows * cellSize);
        ctx.stroke();
      }
      for (let y = 0; y <= rows; y++) {
        ctx.beginPath();
        ctx.moveTo(0, offsetY + y * cellSize);
        ctx.lineTo(cols * cellSize, offsetY + y * cellSize);
        ctx.stroke();
      }
    },
  };
}

// ── Scene: Platformer ─────────────────────────────────────
// Side-scrolling area with a floor. Gravity applies.
export function platformer(width, height, { bgColor = '#0a0a1a', floorColor = '#4a9eff', floorHeight = 20 } = {}) {
  return {
    type: 'platformer',
    width, height, bgColor, floorColor, floorHeight,
    description: 'Side-scrolling area with gravity and a floor.',
    bounds() {
      return { left: 0, top: 0, right: width, bottom: height - floorHeight };
    },
    render(ctx, offsetY = 0) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, offsetY, width, height);
      ctx.fillStyle = floorColor;
      ctx.fillRect(0, offsetY + height - floorHeight, width, floorHeight);
    },
  };
}

// ── Scene: Blank ──────────────────────────────────────────
// Empty canvas. The rule handles everything.
export function blank(width, height, { bgColor = '#111' } = {}) {
  return {
    type: 'blank',
    width, height, bgColor,
    description: 'Empty canvas. The rule does all rendering.',
    bounds() {
      return { left: 0, top: 0, right: width, bottom: height };
    },
    render(ctx, offsetY = 0) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, offsetY, width, height);
    },
  };
}
