const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

export function resize(cellSize, cols, rows) {
  const hudHeight = 40;
  canvas.width = cols * cellSize;
  canvas.height = rows * cellSize + hudHeight;
  return { width: canvas.width, height: canvas.height, hudHeight };
}

export function resizeOpen(width, height) {
  const hudHeight = 40;
  canvas.width = width;
  canvas.height = height + hudHeight;
  return { width: canvas.width, height: canvas.height, hudHeight };
}

export function clear() {
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

export function drawRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

export function drawCircle(x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function drawText(text, x, y, color = '#fff', size = 14, align = 'left') {
  ctx.fillStyle = color;
  ctx.font = `${size}px 'Courier New', monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

export function drawLine(x1, y1, x2, y2, color = '#fff', width = 2) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

export { canvas, ctx };
