// Keyboard and mouse input: key state plus a canvas click slot.

// Fresh input state: all movement flags off, no click stored.
export function createInput() {
  return { up: false, down: false, left: false, right: false, sneak: false, click: null };
}

// Wire keyboard and mouse listeners onto the canvas. Handlers:
// smoke, emp, decoy (key 3), enter, restart.
export function installInput(input, canvas, handlers) {
  window.addEventListener('keydown', (e) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        input.up = true;
        e.preventDefault();
        break;
      case 'KeyS':
      case 'ArrowDown':
        input.down = true;
        e.preventDefault();
        break;
      case 'KeyA':
      case 'ArrowLeft':
        input.left = true;
        e.preventDefault();
        break;
      case 'KeyD':
      case 'ArrowRight':
        input.right = true;
        e.preventDefault();
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        input.sneak = true;
        break;
      case 'Digit1':
        handlers.smoke();
        break;
      case 'Digit2':
        handlers.emp();
        break;
      case 'Digit3':
        handlers.decoy();
        break;
      case 'Enter':
        handlers.enter();
        break;
      case 'KeyR':
        handlers.restart();
        break;
      default:
        break;
    }
  });

  window.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        input.up = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        input.down = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        input.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        input.right = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        input.sneak = false;
        break;
      default:
        break;
    }
  });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    input.click = { x, y };
  });

  window.addEventListener('blur', () => {
    input.up = false;
    input.down = false;
    input.left = false;
    input.right = false;
    input.sneak = false;
  });
}
