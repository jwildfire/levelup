const keys = {};
const justPressed = {};

function onKeyDown(e) {
  if (!keys[e.key]) {
    justPressed[e.key] = true;
  }
  keys[e.key] = true;
}

function onKeyUp(e) {
  keys[e.key] = false;
}

window.addEventListener('keydown', onKeyDown);
window.addEventListener('keyup', onKeyUp);

export function isDown(key) {
  return !!keys[key];
}

export function wasPressed(key) {
  return !!justPressed[key];
}

export function clearFrame() {
  for (const k in justPressed) {
    delete justPressed[k];
  }
}

export function getDirection() {
  if (justPressed['ArrowUp'] || justPressed['w'] || justPressed['W']) return 'up';
  if (justPressed['ArrowDown'] || justPressed['s'] || justPressed['S']) return 'down';
  if (justPressed['ArrowLeft'] || justPressed['a'] || justPressed['A']) return 'left';
  if (justPressed['ArrowRight'] || justPressed['d'] || justPressed['D']) return 'right';
  return null;
}
