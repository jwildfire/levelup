export default {
  id: 'inverted-controls',
  name: 'Mirror World',
  description: 'All movement controls are reversed. Left is right, up is down!',
  category: 'movement',
  difficulty: 2,

  onInput(direction, gameState) {
    const invert = {
      up: 'down',
      down: 'up',
      left: 'right',
      right: 'left',
    };
    return invert[direction] || direction;
  },

  onRender(ctx, gameState) {
    // Subtle visual indicator that controls are flipped
    const cs = gameState.cellSize;
    const w = gameState.maze.cols * cs;
    const h = gameState.maze.rows * cs;
    const oy = gameState.hudHeight;

    // Faint mirror tint on edges
    const grad = ctx.createLinearGradient(0, oy, w, oy);
    grad.addColorStop(0, 'rgba(180, 0, 255, 0.05)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(180, 0, 255, 0.05)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, oy, w, h);
  },
};
