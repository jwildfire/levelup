// Breakout — classic brick breaker. Move paddle, bounce ball, destroy all bricks.

export default {
  id: 'breakout',
  name: 'Breakout',
  description: 'Break all the bricks with the ball.',
  category: 'game-replace',
  difficulty: 2,

  init(gs) {
    const w = gs.world ? gs.world.width : (gs.maze ? gs.maze.cols * gs.cellSize : 640);
    const h = gs.world ? gs.world.height : (gs.maze ? gs.maze.rows * gs.cellSize : 380);
    const oy = gs.hudHeight || 0;

    const brickCols = Math.floor(w / 50);
    const brickRows = 5;
    const brickW = (w - 20) / brickCols;
    const brickH = 14;
    const bricks = [];
    const colors = ['#ff4444', '#ff8844', '#ffcc44', '#44ff88', '#4488ff'];

    for (let r = 0; r < brickRows; r++) {
      for (let c = 0; c < brickCols; c++) {
        bricks.push({
          x: 10 + c * brickW,
          y: oy + 40 + r * (brickH + 3),
          w: brickW - 3,
          h: brickH,
          color: colors[r % colors.length],
          alive: true,
        });
      }
    }

    gs.ruleData.breakout = {
      w, h, oy,
      paddle: { x: w / 2, y: oy + h - 25, width: 70, height: 10, speed: 6 },
      ball: { x: w / 2, y: oy + h - 50, dx: 3, dy: -3, radius: 5, stuck: true },
      bricks,
      lives: 3,
      particles: [],
      keysHeld: {},
      _kd: null, _ku: null,
    };

    const d = gs.ruleData.breakout;
    d._kd = (e) => {
      d.keysHeld[e.key] = true;
      if ((e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') && d.ball.stuck) {
        d.ball.stuck = false;
        d.ball.dy = -3;
        d.ball.dx = (Math.random() - 0.5) * 2;
      }
    };
    d._ku = (e) => { d.keysHeld[e.key] = false; };
    window.addEventListener('keydown', d._kd);
    window.addEventListener('keyup', d._ku);
  },

  destroy(gs) {
    const d = gs.ruleData.breakout;
    if (d) {
      if (d._kd) window.removeEventListener('keydown', d._kd);
      if (d._ku) window.removeEventListener('keyup', d._ku);
    }
    delete gs.ruleData.breakout;
  },

  onTick(dt, gs) {
    const d = gs.ruleData.breakout;
    if (!d) return;
    const t = dt / 16;

    // Paddle
    if (d.keysHeld['ArrowLeft'] || d.keysHeld['a']) d.paddle.x -= d.paddle.speed * t;
    if (d.keysHeld['ArrowRight'] || d.keysHeld['d']) d.paddle.x += d.paddle.speed * t;
    d.paddle.x = Math.max(d.paddle.width / 2, Math.min(d.w - d.paddle.width / 2, d.paddle.x));

    // Ball stuck to paddle
    if (d.ball.stuck) {
      d.ball.x = d.paddle.x;
      d.ball.y = d.paddle.y - d.paddle.height / 2 - d.ball.radius - 2;
      return;
    }

    // Ball movement
    d.ball.x += d.ball.dx * t;
    d.ball.y += d.ball.dy * t;

    // Wall bounces
    if (d.ball.x - d.ball.radius <= 0) { d.ball.x = d.ball.radius; d.ball.dx = Math.abs(d.ball.dx); }
    if (d.ball.x + d.ball.radius >= d.w) { d.ball.x = d.w - d.ball.radius; d.ball.dx = -Math.abs(d.ball.dx); }
    if (d.ball.y - d.ball.radius <= d.oy) { d.ball.y = d.oy + d.ball.radius; d.ball.dy = Math.abs(d.ball.dy); }

    // Ball lost
    if (d.ball.y > d.oy + d.h) {
      d.lives--;
      if (d.lives <= 0) {
        if (window._failLevel) window._failLevel('All balls lost!');
        return;
      }
      d.ball.stuck = true;
      d.ball.x = d.paddle.x;
      d.ball.y = d.paddle.y - 20;
    }

    // Paddle collision
    if (d.ball.dy > 0 &&
        d.ball.y + d.ball.radius >= d.paddle.y - d.paddle.height / 2 &&
        d.ball.y < d.paddle.y &&
        d.ball.x >= d.paddle.x - d.paddle.width / 2 &&
        d.ball.x <= d.paddle.x + d.paddle.width / 2) {
      d.ball.dy = -Math.abs(d.ball.dy);
      const hit = (d.ball.x - d.paddle.x) / (d.paddle.width / 2);
      d.ball.dx = hit * 4;
      d.ball.y = d.paddle.y - d.paddle.height / 2 - d.ball.radius;
    }

    // Brick collision
    for (const brick of d.bricks) {
      if (!brick.alive) continue;
      if (d.ball.x + d.ball.radius > brick.x &&
          d.ball.x - d.ball.radius < brick.x + brick.w &&
          d.ball.y + d.ball.radius > brick.y &&
          d.ball.y - d.ball.radius < brick.y + brick.h) {
        brick.alive = false;
        // Determine bounce direction
        const overlapLeft = (d.ball.x + d.ball.radius) - brick.x;
        const overlapRight = (brick.x + brick.w) - (d.ball.x - d.ball.radius);
        const overlapTop = (d.ball.y + d.ball.radius) - brick.y;
        const overlapBottom = (brick.y + brick.h) - (d.ball.y - d.ball.radius);
        const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
        if (minOverlap === overlapTop || minOverlap === overlapBottom) d.ball.dy *= -1;
        else d.ball.dx *= -1;

        // Particles
        for (let i = 0; i < 5; i++) {
          d.particles.push({
            x: brick.x + brick.w / 2,
            y: brick.y + brick.h / 2,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            color: brick.color,
            life: 400,
          });
        }
        break;
      }
    }

    // Particles
    for (let i = d.particles.length - 1; i >= 0; i--) {
      const p = d.particles[i];
      p.x += p.vx * t;
      p.y += p.vy * t;
      p.life -= dt;
      if (p.life <= 0) d.particles.splice(i, 1);
    }

    // Win check
    if (d.bricks.every(b => !b.alive)) {
      if (window._completeLevel) window._completeLevel();
    }
  },

  onRender(ctx, gs) {
    const d = gs.ruleData.breakout;
    if (!d) return;

    // Background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, d.oy, d.w, d.h);

    // Bricks
    for (const b of d.bricks) {
      if (!b.alive) continue;
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
    }

    // Paddle
    ctx.fillStyle = '#00ff88';
    ctx.fillRect(
      d.paddle.x - d.paddle.width / 2,
      d.paddle.y - d.paddle.height / 2,
      d.paddle.width,
      d.paddle.height
    );

    // Ball
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(d.ball.x, d.ball.y, d.ball.radius, 0, Math.PI * 2);
    ctx.fill();
    // Glow
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.arc(d.ball.x, d.ball.y, d.ball.radius * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Particles
    for (const p of d.particles) {
      const a = p.life / 400;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = a;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;

    // Lives
    ctx.fillStyle = '#fff';
    ctx.font = '12px "Courier New", monospace';
    ctx.textAlign = 'left';
    const remaining = d.bricks.filter(b => b.alive).length;
    ctx.fillText(`BRICKS: ${remaining}`, 8, d.oy + 20);
    ctx.textAlign = 'right';
    for (let i = 0; i < d.lives; i++) {
      ctx.fillStyle = '#00ff88';
      ctx.beginPath();
      ctx.arc(d.w - 15 - i * 18, d.oy + 16, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Instructions if stuck
    if (d.ball.stuck) {
      ctx.fillStyle = '#888';
      ctx.font = '11px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SPACE or ↑ to launch', d.w / 2, d.oy + d.h - 50);
    }
  },

  onInput(direction, gs) {
    if (gs.ruleData.breakout) return null;
    return direction;
  },
};
