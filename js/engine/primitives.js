// Entity factory functions — reusable building blocks for rules
// All positions/sizes are in PIXELS (not grid cells) unless noted.
// Every factory returns an entity object compatible with the entities manager.

let _uid = 0;
function uid(prefix) { return `${prefix}-${++_uid}`; }

// ── Ball ──────────────────────────────────────────────────
// A bouncing ball with velocity. Handles wall-bouncing automatically.
export function ball({ x, y, dx = 2, dy = -2, radius = 6, color = '#fff', bounceWalls = true, bounds = null } = {}) {
  return {
    id: uid('ball'), type: 'ball', ruleId: null,
    x, y, dx, dy, radius, color, bounceWalls, bounds,
    render(ctx) {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    },
    update(dt, gs) {
      this.x += this.dx * (dt / 16);
      this.y += this.dy * (dt / 16);
      if (this.bounceWalls && this.bounds) {
        const b = this.bounds;
        if (this.x - this.radius <= b.left) { this.x = b.left + this.radius; this.dx = Math.abs(this.dx); }
        if (this.x + this.radius >= b.right) { this.x = b.right - this.radius; this.dx = -Math.abs(this.dx); }
        if (this.y - this.radius <= b.top) { this.y = b.top + this.radius; this.dy = Math.abs(this.dy); }
        if (this.y + this.radius >= b.bottom) { this.y = b.bottom - this.radius; this.dy = -Math.abs(this.dy); }
      }
    },
  };
}

// ── Paddle ────────────────────────────────────────────────
// A rectangular paddle. axis='x' moves horizontally, 'y' vertically.
// controls: 'player' (arrow keys/mouse), 'ai' (tracks a target), or 'none'.
export function paddle({ x, y, width = 80, height = 12, color = '#00ff88', axis = 'x', speed = 5, controls = 'player', bounds = null } = {}) {
  return {
    id: uid('paddle'), type: 'paddle', ruleId: null,
    x, y, width, height, color, axis, speed, controls, bounds,
    _target: null,
    render(ctx) {
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
    },
    update(dt, gs) {
      const spd = this.speed * (dt / 16);
      if (this.controls === 'ai' && this._target) {
        const targetPos = this.axis === 'x' ? this._target.x : this._target.y;
        const myPos = this.axis === 'x' ? this.x : this.y;
        if (targetPos < myPos - 5) { this.axis === 'x' ? this.x -= spd : this.y -= spd; }
        else if (targetPos > myPos + 5) { this.axis === 'x' ? this.x += spd : this.y += spd; }
      }
      if (this.bounds) {
        const half = this.axis === 'x' ? this.width / 2 : this.height / 2;
        if (this.axis === 'x') {
          this.x = Math.max(this.bounds.left + half, Math.min(this.bounds.right - half, this.x));
        } else {
          this.y = Math.max(this.bounds.top + half, Math.min(this.bounds.bottom - half, this.y));
        }
      }
    },
  };
}

// ── Collectible ───────────────────────────────────────────
// An item the player can pick up. Works in both grid and pixel modes.
export function collectible({ x, y, emoji = '⭐', color = '#ffdd00', radius = 10, points = 1, onCollect = null, gridMode = false } = {}) {
  return {
    id: uid('collectible'), type: 'collectible', ruleId: null,
    x, y, emoji, color, radius, points, collected: false, gridMode,
    _onCollect: onCollect,
    render(ctx, cellSize, offsetY) {
      if (this.collected) return;
      if (this.gridMode && cellSize) {
        const cx = this.x * cellSize + cellSize / 2;
        const cy = this.y * cellSize + cellSize / 2 + (offsetY || 0);
        ctx.font = `${cellSize * 0.5}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.emoji, cx, cy);
      } else {
        ctx.font = `${this.radius * 2}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.emoji, this.x, this.y);
      }
    },
    collect() {
      this.collected = true;
      if (this._onCollect) this._onCollect(this);
    },
  };
}

// ── Enemy ─────────────────────────────────────────────────
// A hostile entity with movement patterns.
export function enemy({ x, y, speed = 1, color = '#ff4444', radius = 8, pattern = 'random', waypoints = [], onHit = null, gridMode = false } = {}) {
  return {
    id: uid('enemy'), type: 'enemy', ruleId: null,
    x, y, speed, color, radius, pattern, waypoints, gridMode,
    _waypointIdx: 0, _moveTimer: 0, _onHit: onHit,
    render(ctx, cellSize, offsetY) {
      if (this.gridMode && cellSize) {
        const cx = this.x * cellSize + cellSize / 2;
        const cy = this.y * cellSize + cellSize / 2 + (offsetY || 0);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(cx, cy, cellSize * 0.3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    update(dt, gs) {
      if (this.pattern === 'chase' && gs.player) {
        const spd = this.speed * (dt / 16);
        const dx = gs.player.x - this.x;
        const dy = gs.player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0.5) {
          this.x += (dx / dist) * spd;
          this.y += (dy / dist) * spd;
        }
      } else if (this.pattern === 'patrol' && this.waypoints.length > 1) {
        const target = this.waypoints[this._waypointIdx];
        const spd = this.speed * (dt / 16);
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < spd) {
          this._waypointIdx = (this._waypointIdx + 1) % this.waypoints.length;
        } else {
          this.x += (dx / dist) * spd;
          this.y += (dy / dist) * spd;
        }
      }
    },
  };
}

// ── Wall / Block ──────────────────────────────────────────
// A solid rectangle. Can be destructible.
export function block({ x, y, width, height, color = '#4a9eff', destructible = false, hp = 1, onDestroy = null } = {}) {
  return {
    id: uid('block'), type: 'block', ruleId: null,
    x, y, width, height, color, destructible, hp, destroyed: false,
    _onDestroy: onDestroy,
    render(ctx) {
      if (this.destroyed) return;
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, this.width, this.height);
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.x, this.y, this.width, this.height);
    },
    hit() {
      if (!this.destructible) return false;
      this.hp--;
      if (this.hp <= 0) {
        this.destroyed = true;
        if (this._onDestroy) this._onDestroy(this);
        return true;
      }
      return false;
    },
  };
}

// ── Zone ──────────────────────────────────────────────────
// An invisible (or tinted) trigger area.
export function zone({ x, y, width, height, color = 'rgba(0,255,136,0.1)', onEnter = null, onExit = null, visible = true } = {}) {
  return {
    id: uid('zone'), type: 'zone', ruleId: null,
    x, y, width, height, color, visible,
    _onEnter: onEnter, _onExit: onExit, _inside: false,
    render(ctx) {
      if (!this.visible) return;
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, this.width, this.height);
    },
    checkPoint(px, py) {
      const inside = px >= this.x && px <= this.x + this.width && py >= this.y && py <= this.y + this.height;
      if (inside && !this._inside) { this._inside = true; if (this._onEnter) this._onEnter(this); }
      if (!inside && this._inside) { this._inside = false; if (this._onExit) this._onExit(this); }
      return inside;
    },
  };
}

// ── Timer (visual) ────────────────────────────────────────
// A countdown timer that renders and calls back on expire.
export function timer({ seconds, x = 10, y = 20, color = '#ff4444', onTick = null, onExpire = null, visible = true } = {}) {
  return {
    id: uid('timer'), type: 'timer', ruleId: null,
    remaining: seconds * 1000, total: seconds * 1000,
    x, y, color, visible, expired: false,
    _onTick: onTick, _onExpire: onExpire,
    render(ctx) {
      if (!this.visible) return;
      const secs = Math.ceil(this.remaining / 1000);
      ctx.fillStyle = this.color;
      ctx.font = 'bold 16px "Courier New", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`${secs}s`, this.x, this.y);
    },
    update(dt) {
      if (this.expired) return;
      this.remaining -= dt;
      if (this._onTick) this._onTick(this);
      if (this.remaining <= 0) {
        this.remaining = 0;
        this.expired = true;
        if (this._onExpire) this._onExpire(this);
      }
    },
  };
}

// ── Counter (score display) ───────────────────────────────
export function counter({ label = 'Score', value = 0, x = 10, y = 20, color = '#fff' } = {}) {
  return {
    id: uid('counter'), type: 'counter', ruleId: null,
    label, value, x, y, color,
    render(ctx) {
      ctx.fillStyle = this.color;
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`${this.label}: ${this.value}`, this.x, this.y);
    },
  };
}

// ── Projectile ────────────────────────────────────────────
export function projectile({ x, y, dx, dy, radius = 4, color = '#ffdd00', lifetime = 3000, onHit = null } = {}) {
  return {
    id: uid('proj'), type: 'projectile', ruleId: null,
    x, y, dx, dy, radius, color, lifetime, age: 0, dead: false,
    _onHit: onHit,
    render(ctx) {
      if (this.dead) return;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    },
    update(dt) {
      if (this.dead) return;
      this.x += this.dx * (dt / 16);
      this.y += this.dy * (dt / 16);
      this.age += dt;
      if (this.age >= this.lifetime) this.dead = true;
    },
  };
}

// ── Particles (visual flair) ──────────────────────────────
export function particles({ x, y, count = 20, color = '#ffdd00', spread = 3, lifetime = 800 } = {}) {
  const dots = [];
  for (let i = 0; i < count; i++) {
    dots.push({
      x: 0, y: 0,
      dx: (Math.random() - 0.5) * spread,
      dy: (Math.random() - 0.5) * spread,
    });
  }
  return {
    id: uid('particles'), type: 'particles', ruleId: null,
    x, y, color, lifetime, age: 0, dots, dead: false,
    render(ctx) {
      if (this.dead) return;
      const alpha = Math.max(0, 1 - this.age / this.lifetime);
      ctx.fillStyle = this.color;
      ctx.globalAlpha = alpha;
      for (const d of this.dots) {
        ctx.fillRect(this.x + d.x - 1, this.y + d.y - 1, 3, 3);
      }
      ctx.globalAlpha = 1;
    },
    update(dt) {
      if (this.dead) return;
      this.age += dt;
      if (this.age >= this.lifetime) { this.dead = true; return; }
      for (const d of this.dots) {
        d.x += d.dx * (dt / 16);
        d.y += d.dy * (dt / 16);
      }
    },
  };
}

// ── Text Block ────────────────────────────────────────────
export function textBlock({ x, y, text, color = '#fff', size = 20, align = 'center' } = {}) {
  return {
    id: uid('text'), type: 'text', ruleId: null,
    x, y, text, color, size, align,
    render(ctx) {
      ctx.fillStyle = this.color;
      ctx.font = `bold ${this.size}px "Courier New", monospace`;
      ctx.textAlign = this.align;
      ctx.textBaseline = 'middle';
      ctx.fillText(this.text, this.x, this.y);
    },
  };
}
