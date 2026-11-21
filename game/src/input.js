// Keyboard + mouse input. WASD / arrows move, Shift sneaks, P pauses,
// R restarts the level, M mutes. A mouse click sets a click-to-move
// target; any keyboard movement cancels it.

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    moveTarget: null,
    onPause: null,
    onRestart: null,
    onMute: null,
    onAnyKey: null,
    onStart: null,
  };

  const MOVE_KEYS = new Set([
    'KeyW', 'KeyA', 'KeyS', 'KeyD',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  ]);

  function keyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (e.repeat) return;
    input.keys.add(e.code);
    if (MOVE_KEYS.has(e.code)) input.moveTarget = null;
    if (input.onAnyKey) input.onAnyKey(e.code);
    if (e.code === 'KeyP' && input.onPause) input.onPause();
    if (e.code === 'KeyR' && input.onRestart) input.onRestart();
    if (e.code === 'KeyM' && input.onMute) input.onMute();
    if ((e.code === 'Enter' || e.code === 'Space') && input.onStart) input.onStart();
  }

  function keyUp(e) {
    input.keys.delete(e.code);
  }

  function pointerDown(e) {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    input.moveTarget = { x, y };
    if (input.onAnyKey) input.onAnyKey('pointer');
    if (input.onStart) input.onStart();
  }

  function blur() {
    input.keys.clear();
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('blur', blur);
  canvas.addEventListener('pointerdown', pointerDown);

  input.destroy = () => {
    window.removeEventListener('keydown', keyDown);
    window.removeEventListener('keyup', keyUp);
    window.removeEventListener('blur', blur);
    canvas.removeEventListener('pointerdown', pointerDown);
  };
  return input;
}

// Normalised movement vector from the held keys: {x, y} each -1..1.
export function moveVector(input) {
  let x = 0;
  let y = 0;
  if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) x -= 1;
  if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) x += 1;
  if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) y -= 1;
  if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) y += 1;
  if (x !== 0 && y !== 0) {
    x *= Math.SQRT1_2;
    y *= Math.SQRT1_2;
  }
  return { x, y };
}

export function isSneaking(input) {
  return input.keys.has('ShiftLeft') || input.keys.has('ShiftRight');
}
