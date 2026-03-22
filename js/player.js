import * as maze from './maze.js';

// ── Grid player (maze mode) ───────────────────────────────────────────────────

export function create(x, y) {
  return { x, y, type: 'player', alive: true, moveCount: 0 };
}

export function tryMove(player, direction, mazeData) {
  const wallDir = maze.dirToWall(direction);
  if (!wallDir) return false;

  if (!maze.canMove(mazeData, player.x, player.y, wallDir)) return false;

  const deltas = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const [dx, dy] = deltas[direction];
  player.x += dx;
  player.y += dy;
  player.moveCount++;
  return true;
}

// ── Free player (open world mode) ─────────────────────────────────────────────

export function createFree(x, y, speed = 180) {
  return {
    x, y,
    type: 'player',
    alive: true,
    moveCount: 0,
    speed,
    vx: 0,
    vy: 0,
    radius: 10,
    _trail: [],       // last N positions for motion trail
  };
}

export function updateFree(player, heldDirs, dt, world) {
  const s = player.speed;
  let vx = 0, vy = 0;

  if (heldDirs.includes('up'))    vy -= s;
  if (heldDirs.includes('down'))  vy += s;
  if (heldDirs.includes('left'))  vx -= s;
  if (heldDirs.includes('right')) vx += s;

  // Normalize diagonal so speed is consistent
  if (vx !== 0 && vy !== 0) { vx *= 0.7071; vy *= 0.7071; }

  const sec = dt / 1000;
  const nx = player.x + vx * sec;
  const ny = player.y + vy * sec;

  const r = player.radius;
  const prevX = player.x, prevY = player.y;
  player.x = Math.max(r, Math.min(world.width - r, nx));
  player.y = Math.max(r, Math.min(world.height - r, ny));
  player.vx = vx;
  player.vy = vy;

  // Track trail based on distance moved
  const dx = player.x - prevX, dy = player.y - prevY;
  if (dx * dx + dy * dy > 4) {
    player._trail.push({ x: player.x, y: player.y });
    if (player._trail.length > 20) player._trail.shift();
  }

  // Increment moveCount at most once per 200ms of continuous movement
  if (vx !== 0 || vy !== 0) {
    const now = Date.now();
    if (!player._lastMoveCount || now - player._lastMoveCount >= 200) {
      player.moveCount++;
      player._lastMoveCount = now;
    }
  }
}

// ── Rendering (handles both modes) ───────────────────────────────────────────

export function render(ctx, player, cellSize, offsetY = 0) {
  let cx, cy, r;

  if (player.radius) {
    // Free mode — pixel coords, use player.radius
    cx = player.x;
    cy = player.y + offsetY;
    r = player.radius;

    // Motion trail
    if (player._trail) {
      for (let i = 0; i < player._trail.length; i++) {
        const t = player._trail[i];
        const age = i / player._trail.length;
        ctx.fillStyle = `rgba(0, 255, 136, ${age * 0.25})`;
        ctx.beginPath();
        ctx.arc(t.x, t.y + offsetY, r * age * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    // Grid mode — scale by cellSize
    cx = player.x * cellSize + cellSize / 2;
    cy = player.y * cellSize + cellSize / 2 + offsetY;
    r = cellSize * 0.3;
  }

  // Glow
  ctx.fillStyle = 'rgba(0, 255, 136, 0.15)';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = '#00ff88';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Inner
  ctx.fillStyle = '#00cc66';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
  ctx.fill();
}

export function resetTo(player, x, y) {
  player.x = x;
  player.y = y;
  if (player._trail) player._trail = [];
}
