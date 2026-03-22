// Physics helpers — common operations rules can use without reimplementing

// ── Collision Detection ───────────────────────────────────

// Axis-aligned bounding box collision
export function aabb(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

// Circle-circle collision
export function circlesCollide(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < (a.radius + b.radius);
}

// Circle-rectangle collision (ball vs paddle/block)
export function circleRect(circle, rect) {
  const cx = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
  const cy = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
  const dx = circle.x - cx;
  const dy = circle.y - cy;
  return (dx * dx + dy * dy) < (circle.radius * circle.radius);
}

// Point inside rectangle
export function pointInRect(px, py, rect) {
  return px >= rect.x && px <= rect.x + rect.width &&
         py >= rect.y && py <= rect.y + rect.height;
}

// ── Movement Helpers ──────────────────────────────────────

// Move entity toward a target point at given speed
export function moveToward(entity, targetX, targetY, speed, dt) {
  const dx = targetX - entity.x;
  const dy = targetY - entity.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < speed * (dt / 16)) {
    entity.x = targetX;
    entity.y = targetY;
    return true; // arrived
  }
  const s = speed * (dt / 16);
  entity.x += (dx / dist) * s;
  entity.y += (dy / dist) * s;
  return false;
}

// Patrol between waypoints [{x, y}, ...]
export function patrol(entity, waypoints, speed, dt) {
  if (!waypoints.length) return;
  if (entity._wpIdx === undefined) entity._wpIdx = 0;
  const target = waypoints[entity._wpIdx];
  if (moveToward(entity, target.x, target.y, speed, dt)) {
    entity._wpIdx = (entity._wpIdx + 1) % waypoints.length;
  }
}

// ── Forces ────────────────────────────────────────────────

// Apply gravity (add to dy each frame)
export function gravity(entity, strength, dt) {
  entity.dy = (entity.dy || 0) + strength * (dt / 16);
}

// Apply friction (reduce velocity)
export function friction(entity, amount, dt) {
  const f = Math.max(0, 1 - amount * (dt / 16));
  if (entity.dx !== undefined) entity.dx *= f;
  if (entity.dy !== undefined) entity.dy *= f;
}

// Apply velocity to position
export function applyVelocity(entity, dt) {
  entity.x += (entity.dx || 0) * (dt / 16);
  entity.y += (entity.dy || 0) * (dt / 16);
}

// ── Bounce ────────────────────────────────────────────────

// Bounce entity off rectangular bounds { left, right, top, bottom }
// Returns which edges were hit: { left, right, top, bottom }
export function bounceInBounds(entity, bounds, radius = 0) {
  const hit = { left: false, right: false, top: false, bottom: false };
  if (entity.x - radius < bounds.left) {
    entity.x = bounds.left + radius;
    entity.dx = Math.abs(entity.dx);
    hit.left = true;
  }
  if (entity.x + radius > bounds.right) {
    entity.x = bounds.right - radius;
    entity.dx = -Math.abs(entity.dx);
    hit.right = true;
  }
  if (entity.y - radius < bounds.top) {
    entity.y = bounds.top + radius;
    entity.dy = Math.abs(entity.dy);
    hit.top = true;
  }
  if (entity.y + radius > bounds.bottom) {
    entity.y = bounds.bottom - radius;
    entity.dy = -Math.abs(entity.dy);
    hit.bottom = true;
  }
  return hit;
}

// Bounce a ball off a paddle (reflects dy based on hit position)
export function bounceBallOffPaddle(ball, paddle) {
  if (!circleRect(ball, { x: paddle.x - paddle.width / 2, y: paddle.y - paddle.height / 2, width: paddle.width, height: paddle.height })) {
    return false;
  }
  // Reflect
  ball.dy = -Math.abs(ball.dy);
  // Angle based on where ball hit paddle
  const hitPos = (ball.x - paddle.x) / (paddle.width / 2); // -1 to 1
  ball.dx = hitPos * Math.abs(ball.dy) * 0.8;
  // Push ball above paddle
  ball.y = paddle.y - paddle.height / 2 - ball.radius;
  return true;
}

// ── Distance / Angle ──────────────────────────────────────

export function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function angle(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

// ── Random Helpers ────────────────────────────────────────

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

export function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
