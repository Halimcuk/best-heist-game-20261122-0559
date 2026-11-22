// Keyboard and mouse: WASD/arrows to move, Shift to sneak, 1/2/3 for tools,
// click to throw a decoy coin at the mouse position, Enter to start, R to restart.
export function createInput() {
  return {
    up: false, down: false, left: false, right: false, sneak: false,
    click: null, // {x, y} in canvas pixels, consumed by the loop
  };
}

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
};

export function attachInput(input, canvas, handlers) {
  window.addEventListener('keydown', (event) => {
    const mapped = KEYMAP[event.code];
    if (mapped) {
      input[mapped] = true;
      event.preventDefault();
    }
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') input.sneak = true;
    if (event.code === 'Digit1') handlers.onSmoke();
    if (event.code === 'Digit2') handlers.onEmp();
    if (event.code === 'Digit3') handlers.onDecoyKey();
    if (event.code === 'Enter') handlers.onEnter();
    if (event.code === 'KeyR') handlers.onRestart();
  });
  window.addEventListener('keyup', (event) => {
    const mapped = KEYMAP[event.code];
    if (mapped) input[mapped] = false;
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') input.sneak = false;
  });
  canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    input.click = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  });
  window.addEventListener('blur', () => {
    input.up = input.down = input.left = input.right = input.sneak = false;
  });
}
