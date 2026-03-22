// Pong — replaces the maze with a full pong game.
// Player controls bottom paddle, AI controls top. First to 5 wins.
// Uses engine primitives and physics.

export default {
  id: 'pong',
  name: 'Pong',
  description: 'Classic pong. Beat the AI to complete the level.',
  category: 'game-replace',
  difficulty: 2,

  init(gs) {
    const w = gs.maze.cols * gs.cellSize;
    const h = gs.maze.rows * gs.cellSize;
    const offsetY = gs.hudHeight;

    gs.ruleData.pong = {
      w, h, offsetY,
      playerScore: 0,
      aiScore: 0,
      winScore: 5,
      ball: { x: w / 2, y: offsetY + h / 2, dx: 3, dy: -3, radius: 6 },
      player: { x: w / 2, y: offsetY + h - 25, width: 80, height: 10, speed: 5 },
      ai: { x: w / 2, y: offsetY + 25, width: 80, height: 10, speed: 3.5 },
      keysHeld: {},
      _keydown: null,
      _keyup: null,
    };

    const d = gs.ruleData.pong;
    d._keydown = (e) => { d.keysHeld[e.key] = true; };
    d._keyup = (e) => { d.keysHeld[e.key] = false; };
    window.addEventListener('keydown', d._keydown);
    window.addEventListener('keyup', d._keyup);
  },

  destroy(gs) {
    const d = gs.ruleData.pong;
    if (d) {
      if (d._keydown) window.removeEventListener('keydown', d._keydown);
      if (d._keyup) window.removeEventListener('keyup', d._keyup);
    }
    delete gs.ruleData.pong;
  },

  onTick(dt, gs) {
    const d = gs.ruleData.pong;
    if (!d) return;
    const t = dt / 16;

    // Player movement
    if (d.keysHeld['ArrowLeft'] || d.keysHeld['a']) d.player.x -= d.player.speed * t;
    if (d.keysHeld['ArrowRight'] || d.keysHeld['d']) d.player.x += d.player.speed * t;
    d.player.x = Math.max(d.player.width / 2, Math.min(d.w - d.player.width / 2, d.player.x));

    // AI movement
    const aiTarget = d.ball.x;
    if (aiTarget < d.ai.x - 5) d.ai.x -= d.ai.speed * t;
    else if (aiTarget > d.ai.x + 5) d.ai.x += d.ai.speed * t;
    d.ai.x = Math.max(d.ai.width / 2, Math.min(d.w - d.ai.width / 2, d.ai.x));

    // Ball movement
    d.ball.x += d.ball.dx * t;
    d.ball.y += d.ball.dy * t;

    // Wall bounce (left/right)
    if (d.ball.x - d.ball.radius <= 0) { d.ball.x = d.ball.radius; d.ball.dx = Math.abs(d.ball.dx); }
    if (d.ball.x + d.ball.radius >= d.w) { d.ball.x = d.w - d.ball.radius; d.ball.dx = -Math.abs(d.ball.dx); }

    // Paddle collision (player)
    if (d.ball.dy > 0 && d.ball.y + d.ball.radius >= d.player.y - d.player.height / 2 &&
        d.ball.x >= d.player.x - d.player.width / 2 && d.ball.x <= d.player.x + d.player.width / 2) {
      d.ball.dy = -Math.abs(d.ball.dy);
      const hit = (d.ball.x - d.player.x) / (d.player.width / 2);
      d.ball.dx = hit * 4;
      d.ball.y = d.player.y - d.player.height / 2 - d.ball.radius;
    }

    // Paddle collision (AI)
    if (d.ball.dy < 0 && d.ball.y - d.ball.radius <= d.ai.y + d.ai.height / 2 &&
        d.ball.x >= d.ai.x - d.ai.width / 2 && d.ball.x <= d.ai.x + d.ai.width / 2) {
      d.ball.dy = Math.abs(d.ball.dy);
      const hit = (d.ball.x - d.ai.x) / (d.ai.width / 2);
      d.ball.dx = hit * 4;
      d.ball.y = d.ai.y + d.ai.height / 2 + d.ball.radius;
    }

    // Score
    if (d.ball.y < d.offsetY) {
      d.playerScore++;
      this._resetBall(d, 1);
    }
    if (d.ball.y > d.offsetY + d.h) {
      d.aiScore++;
      this._resetBall(d, -1);
    }

    // Win condition
    if (d.playerScore >= d.winScore) {
      if (window._completeLevel) window._completeLevel();
    }
    if (d.aiScore >= d.winScore) {
      if (window._failLevel) window._failLevel('The AI wins! Try again.');
    }
  },

  _resetBall(d, dir) {
    d.ball.x = d.w / 2;
    d.ball.y = d.offsetY + d.h / 2;
    d.ball.dx = (Math.random() - 0.5) * 4;
    d.ball.dy = 3 * dir;
  },

  onRender(ctx, gs) {
    const d = gs.ruleData.pong;
    if (!d) return;

    // Black out the maze
    ctx.fillStyle = '#111';
    ctx.fillRect(0, d.offsetY, d.w, d.h);

    // Center line
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, d.offsetY + d.h / 2);
    ctx.lineTo(d.w, d.offsetY + d.h / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Paddles
    ctx.fillStyle = '#00ff88';
    ctx.fillRect(d.player.x - d.player.width / 2, d.player.y - d.player.height / 2, d.player.width, d.player.height);
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(d.ai.x - d.ai.width / 2, d.ai.y - d.ai.height / 2, d.ai.width, d.ai.height);

    // Ball
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(d.ball.x, d.ball.y, d.ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // Scores
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(d.playerScore, d.w / 2 - 40, d.offsetY + d.h / 2 + 30);
    ctx.fillStyle = '#ff4444';
    ctx.fillText(d.aiScore, d.w / 2 + 40, d.offsetY + d.h / 2 - 20);
  },

  onInput(direction, gs) {
    // Suppress maze movement while pong is active
    if (gs.ruleData.pong) return null;
    return direction;
  },
};
