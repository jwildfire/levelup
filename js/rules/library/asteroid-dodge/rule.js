// Asteroid Dodge — dodge falling asteroids, survive to complete the level.
// Player moves left/right at the bottom. Asteroids rain from above.
// Survive until the score target is reached (based on time alive).

export default {
  id: 'asteroid-dodge',
  name: 'Asteroid Dodge',
  description: 'Dodge the falling rocks. Survive long enough to win.',
  category: 'game-replace',
  difficulty: 3,

  init(gs) {
    const w = gs.world ? gs.world.width : (gs.maze ? gs.maze.cols * gs.cellSize : 640);
    const h = gs.world ? gs.world.height : (gs.maze ? gs.maze.rows * gs.cellSize : 380);
    const oy = gs.hudHeight || 0;

    gs.ruleData.asteroids = {
      w, h, oy,
      ship: { x: w / 2, y: oy + h - 30, width: 24, height: 16, speed: 5 },
      rocks: [],
      spawnTimer: 0,
      spawnRate: 600,    // ms between spawns — decreases over time
      survived: 0,       // ms survived
      target: 30000,     // survive 30s to win
      particles: [],
      hits: 0,
      maxHits: 3,
      keysHeld: {},
      _kd: null, _ku: null,
    };

    const d = gs.ruleData.asteroids;
    d._kd = (e) => { d.keysHeld[e.key] = true; };
    d._ku = (e) => { d.keysHeld[e.key] = false; };
    window.addEventListener('keydown', d._kd);
    window.addEventListener('keyup', d._ku);
  },

  destroy(gs) {
    const d = gs.ruleData.asteroids;
    if (d) {
      if (d._kd) window.removeEventListener('keydown', d._kd);
      if (d._ku) window.removeEventListener('keyup', d._ku);
    }
    delete gs.ruleData.asteroids;
  },

  onTick(dt, gs) {
    const d = gs.ruleData.asteroids;
    if (!d) return;
    const t = dt / 16;

    // Ship movement
    if (d.keysHeld['ArrowLeft'] || d.keysHeld['a']) d.ship.x -= d.ship.speed * t;
    if (d.keysHeld['ArrowRight'] || d.keysHeld['d']) d.ship.x += d.ship.speed * t;
    d.ship.x = Math.max(d.ship.width / 2, Math.min(d.w - d.ship.width / 2, d.ship.x));

    // Spawn rocks
    d.spawnTimer += dt;
    const rate = Math.max(150, d.spawnRate - d.survived * 0.01);
    if (d.spawnTimer >= rate) {
      d.spawnTimer = 0;
      const size = 8 + Math.random() * 16;
      d.rocks.push({
        x: Math.random() * d.w,
        y: d.oy - size,
        size,
        speed: 1.5 + Math.random() * 2 + d.survived * 0.00005,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.1,
      });
    }

    // Update rocks
    for (let i = d.rocks.length - 1; i >= 0; i--) {
      const r = d.rocks[i];
      r.y += r.speed * t;
      r.rot += r.rotSpeed * t;

      // Off screen
      if (r.y > d.oy + d.h + r.size) {
        d.rocks.splice(i, 1);
        continue;
      }

      // Hit ship?
      const dx = r.x - d.ship.x;
      const dy = r.y - d.ship.y;
      if (Math.abs(dx) < (r.size + d.ship.width) / 2 && Math.abs(dy) < (r.size + d.ship.height) / 2) {
        d.hits++;
        // Explosion particles
        for (let p = 0; p < 8; p++) {
          d.particles.push({
            x: r.x, y: r.y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 500,
          });
        }
        d.rocks.splice(i, 1);
        if (d.hits >= d.maxHits) {
          if (window._failLevel) window._failLevel('Your ship was destroyed! Too many hits.');
        }
      }
    }

    // Update particles
    for (let i = d.particles.length - 1; i >= 0; i--) {
      const p = d.particles[i];
      p.x += p.vx * t;
      p.y += p.vy * t;
      p.life -= dt;
      if (p.life <= 0) d.particles.splice(i, 1);
    }

    // Survive timer
    d.survived += dt;
    if (d.survived >= d.target) {
      if (window._completeLevel) window._completeLevel();
    }
  },

  onRender(ctx, gs) {
    const d = gs.ruleData.asteroids;
    if (!d) return;

    // Background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, d.oy, d.w, d.h);

    // Stars
    ctx.fillStyle = '#333';
    const seed = 42;
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 137 + seed) % d.w);
      const sy = d.oy + ((i * 251 + seed) % d.h);
      ctx.fillRect(sx, sy, 1, 1);
    }

    // Rocks
    for (const r of d.rocks) {
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(r.rot);
      ctx.fillStyle = '#887766';
      ctx.beginPath();
      const pts = 6;
      for (let i = 0; i < pts; i++) {
        const a = (i / pts) * Math.PI * 2;
        const rad = r.size / 2 * (0.7 + 0.3 * Math.sin(i * 3.7));
        const px = Math.cos(a) * rad;
        const py = Math.sin(a) * rad;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Ship
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.moveTo(d.ship.x, d.ship.y - d.ship.height / 2);
    ctx.lineTo(d.ship.x - d.ship.width / 2, d.ship.y + d.ship.height / 2);
    ctx.lineTo(d.ship.x + d.ship.width / 2, d.ship.y + d.ship.height / 2);
    ctx.closePath();
    ctx.fill();

    // Engine glow
    ctx.fillStyle = '#ff8800';
    ctx.beginPath();
    ctx.moveTo(d.ship.x - 5, d.ship.y + d.ship.height / 2);
    ctx.lineTo(d.ship.x, d.ship.y + d.ship.height / 2 + 6 + Math.random() * 4);
    ctx.lineTo(d.ship.x + 5, d.ship.y + d.ship.height / 2);
    ctx.closePath();
    ctx.fill();

    // Particles
    for (const p of d.particles) {
      const a = p.life / 500;
      ctx.fillStyle = `rgba(255, 150, 50, ${a})`;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }

    // HUD: health + timer
    ctx.fillStyle = '#fff';
    ctx.font = '12px "Courier New", monospace';
    ctx.textAlign = 'left';
    const remaining = Math.max(0, Math.ceil((d.target - d.survived) / 1000));
    ctx.fillText(`SURVIVE: ${remaining}s`, 8, d.oy + 20);

    // Health pips
    for (let i = 0; i < d.maxHits; i++) {
      ctx.fillStyle = i < (d.maxHits - d.hits) ? '#00ff88' : '#333';
      ctx.fillRect(d.w - 60 + i * 18, d.oy + 10, 12, 12);
    }
  },

  onInput(direction, gs) {
    if (gs.ruleData.asteroids) return null;
    return direction;
  },
};
