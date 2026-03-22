// Fly Swatter — flies buzz around the screen. Move cursor with arrows, swat with space.
// Swat enough flies before time runs out to complete the level.

export default {
  id: 'fly-swatter',
  name: 'Fly Swatter',
  description: 'Swat the flies before they escape.',
  category: 'game-replace',
  difficulty: 2,

  init(gs) {
    const w = gs.world ? gs.world.width : (gs.maze ? gs.maze.cols * gs.cellSize : 640);
    const h = gs.world ? gs.world.height : (gs.maze ? gs.maze.rows * gs.cellSize : 380);
    const oy = gs.hudHeight || 0;

    gs.ruleData.flies = {
      w, h, oy,
      cursor: { x: w / 2, y: oy + h / 2, speed: 6 },
      bugs: [],
      swatted: 0,
      target: 12,
      timeLeft: 25000,
      swatAnim: null,
      splats: [],
      spawnTimer: 0,
      spawnRate: 1200,
      keysHeld: {},
      _kd: null, _ku: null,
    };

    const d = gs.ruleData.flies;

    // Spawn initial flies
    for (let i = 0; i < 4; i++) this._spawnFly(d);

    d._kd = (e) => {
      d.keysHeld[e.key] = true;
      if (e.key === ' ' || e.key === 'Enter') {
        this._swat(d, gs);
      }
    };
    d._ku = (e) => { d.keysHeld[e.key] = false; };
    window.addEventListener('keydown', d._kd);
    window.addEventListener('keyup', d._ku);
  },

  _spawnFly(d) {
    d.bugs.push({
      x: 20 + Math.random() * (d.w - 40),
      y: d.oy + 20 + Math.random() * (d.h - 40),
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3,
      changeTimer: 500 + Math.random() * 1000,
      wingPhase: Math.random() * Math.PI * 2,
    });
  },

  _swat(d, gs) {
    d.swatAnim = { timer: 200 };
    let hit = false;
    for (let i = d.bugs.length - 1; i >= 0; i--) {
      const b = d.bugs[i];
      const dist = Math.hypot(b.x - d.cursor.x, b.y - d.cursor.y);
      if (dist < 30) {
        d.splats.push({ x: b.x, y: b.y, life: 2000 });
        d.bugs.splice(i, 1);
        d.swatted++;
        hit = true;
        if (d.swatted >= d.target) {
          setTimeout(() => { if (window._completeLevel) window._completeLevel(); }, 500);
        }
      }
    }
    if (!hit) {
      // Miss — flies scatter
      for (const b of d.bugs) {
        const dx = b.x - d.cursor.x;
        const dy = b.y - d.cursor.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 80) {
          b.vx += (dx / dist) * 4;
          b.vy += (dy / dist) * 4;
        }
      }
    }
  },

  destroy(gs) {
    const d = gs.ruleData.flies;
    if (d) {
      if (d._kd) window.removeEventListener('keydown', d._kd);
      if (d._ku) window.removeEventListener('keyup', d._ku);
    }
    delete gs.ruleData.flies;
  },

  onTick(dt, gs) {
    const d = gs.ruleData.flies;
    if (!d) return;
    const t = dt / 16;

    // Cursor movement
    if (d.keysHeld['ArrowLeft'] || d.keysHeld['a']) d.cursor.x -= d.cursor.speed * t;
    if (d.keysHeld['ArrowRight'] || d.keysHeld['d']) d.cursor.x += d.cursor.speed * t;
    if (d.keysHeld['ArrowUp'] || d.keysHeld['w']) d.cursor.y -= d.cursor.speed * t;
    if (d.keysHeld['ArrowDown'] || d.keysHeld['s']) d.cursor.y += d.cursor.speed * t;
    d.cursor.x = Math.max(0, Math.min(d.w, d.cursor.x));
    d.cursor.y = Math.max(d.oy, Math.min(d.oy + d.h, d.cursor.y));

    // Spawn flies
    d.spawnTimer += dt;
    if (d.spawnTimer >= d.spawnRate && d.bugs.length < 8) {
      d.spawnTimer = 0;
      this._spawnFly(d);
    }

    // Update flies
    for (const b of d.bugs) {
      b.changeTimer -= dt;
      if (b.changeTimer <= 0) {
        b.vx = (Math.random() - 0.5) * 4;
        b.vy = (Math.random() - 0.5) * 4;
        b.changeTimer = 400 + Math.random() * 800;
      }
      b.x += b.vx * t;
      b.y += b.vy * t;
      b.wingPhase += dt * 0.02;

      // Bounce off walls
      if (b.x < 10) { b.x = 10; b.vx = Math.abs(b.vx); }
      if (b.x > d.w - 10) { b.x = d.w - 10; b.vx = -Math.abs(b.vx); }
      if (b.y < d.oy + 10) { b.y = d.oy + 10; b.vy = Math.abs(b.vy); }
      if (b.y > d.oy + d.h - 10) { b.y = d.oy + d.h - 10; b.vy = -Math.abs(b.vy); }

      // Dampen
      b.vx *= 0.99;
      b.vy *= 0.99;
    }

    // Swat animation
    if (d.swatAnim) {
      d.swatAnim.timer -= dt;
      if (d.swatAnim.timer <= 0) d.swatAnim = null;
    }

    // Splat decay
    for (let i = d.splats.length - 1; i >= 0; i--) {
      d.splats[i].life -= dt;
      if (d.splats[i].life <= 0) d.splats.splice(i, 1);
    }

    // Timer
    d.timeLeft -= dt;
    if (d.timeLeft <= 0 && d.swatted < d.target) {
      if (window._failLevel) window._failLevel('Time\'s up! The flies escaped.');
    }
  },

  onRender(ctx, gs) {
    const d = gs.ruleData.flies;
    if (!d) return;

    // Background - kitchen-like
    ctx.fillStyle = '#f5f0e8';
    ctx.fillRect(0, d.oy, d.w, d.h);

    // Counter pattern
    ctx.fillStyle = '#e8e0d0';
    for (let x = 0; x < d.w; x += 40) {
      for (let y = 0; y < d.h; y += 40) {
        if ((x + y) % 80 === 0) ctx.fillRect(x, d.oy + y, 40, 40);
      }
    }

    // Splats
    for (const s of d.splats) {
      const a = s.life / 2000;
      ctx.fillStyle = `rgba(80, 120, 40, ${a * 0.6})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 8, 0, Math.PI * 2);
      ctx.fill();
      // Splatter dots
      for (let i = 0; i < 4; i++) {
        const angle = i * Math.PI / 2;
        ctx.beginPath();
        ctx.arc(s.x + Math.cos(angle) * 10, s.y + Math.sin(angle) * 10, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Flies
    for (const b of d.bugs) {
      // Body
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, 5, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wings
      const wingOff = Math.sin(b.wingPhase) * 4;
      ctx.fillStyle = 'rgba(200, 200, 220, 0.5)';
      ctx.beginPath();
      ctx.ellipse(b.x - 4, b.y - 2 + wingOff, 6, 3, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(b.x + 4, b.y - 2 - wingOff, 6, 3, 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(b.x - 2, b.y - 5, 1.5, 0, Math.PI * 2);
      ctx.arc(b.x + 2, b.y - 5, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cursor / swatter
    const swatScale = d.swatAnim ? 1.3 : 1;
    ctx.strokeStyle = d.swatAnim ? '#ff4444' : '#8B4513';
    ctx.lineWidth = 3;
    // Handle
    ctx.beginPath();
    ctx.moveTo(d.cursor.x + 12, d.cursor.y + 12);
    ctx.lineTo(d.cursor.x + 25, d.cursor.y + 25);
    ctx.stroke();
    // Swatter head
    ctx.strokeStyle = d.swatAnim ? '#ff4444' : '#666';
    ctx.lineWidth = 2;
    const sw = 18 * swatScale;
    ctx.strokeRect(d.cursor.x - sw / 2, d.cursor.y - sw / 2, sw, sw);
    // Grid on swatter
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(d.cursor.x, d.cursor.y - sw / 2);
    ctx.lineTo(d.cursor.x, d.cursor.y + sw / 2);
    ctx.moveTo(d.cursor.x - sw / 2, d.cursor.y);
    ctx.lineTo(d.cursor.x + sw / 2, d.cursor.y);
    ctx.stroke();

    // HUD
    ctx.fillStyle = '#333';
    ctx.font = '12px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`SWATTED: ${d.swatted} / ${d.target}`, 8, d.oy + 20);
    const secs = Math.max(0, Math.ceil(d.timeLeft / 1000));
    ctx.textAlign = 'right';
    ctx.fillStyle = secs < 5 ? '#ff3333' : '#333';
    ctx.fillText(`TIME: ${secs}s`, d.w - 8, d.oy + 20);

    // Instructions
    ctx.fillStyle = '#999';
    ctx.font = '10px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ARROWS to move · SPACE to swat', d.w / 2, d.oy + d.h - 8);
  },

  onInput(direction, gs) {
    if (gs.ruleData.flies) return null;
    return direction;
  },
};
