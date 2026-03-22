import * as maze from './maze.js';

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

export function render(ctx, player, cellSize, offsetY = 0) {
  const cx = player.x * cellSize + cellSize / 2;
  const cy = player.y * cellSize + cellSize / 2 + offsetY;
  const r = cellSize * 0.3;

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
}
