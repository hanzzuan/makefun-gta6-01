// input.js — keyboard and mouse state for Solmar.
// main.js polls this every frame; keys are tracked by their `code` value so
// layouts do not matter. Edge-triggered presses (E, F, P, 1, 2, M, G, R,
// Enter) are queued and consumed once by the game loop.

const keys = new Set();
const pressedQueue = [];
let mouseDown = false;
let mouseX = 0;
let mouseY = 0;
let pointerLocked = false;
let onFirstInteract = null;
let wheelDelta = 0; // accumulated mouse-wheel steps since last read

const EDGE_KEYS = new Set([
  'KeyE', 'KeyF', 'KeyP', 'KeyM', 'Digit1', 'Digit2', 'Enter', 'Space', 'KeyR', 'KeyH', 'KeyG',
]);

export function initInput(canvas, onInteract) {
  onFirstInteract = onInteract || null;
  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    if (EDGE_KEYS.has(event.code)) pressedQueue.push(event.code);
    if (event.code === 'Space') event.preventDefault();
    if (onFirstInteract) onFirstInteract();
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    keys.clear();
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) mouseDown = true;
    mouseX = event.clientX;
    mouseY = event.clientY;
    if (onFirstInteract) onFirstInteract();
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) mouseDown = false;
  });
  window.addEventListener('mousemove', (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
  });
  // Mouse wheel zooms the chase camera in and out; the loop reads it.
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    wheelDelta += Math.sign(event.deltaY);
    if (onFirstInteract) onFirstInteract();
  }, { passive: false });
  document.addEventListener('pointerlockchange', () => {
    pointerLocked = document.pointerLockElement === canvas;
  });
  canvas.addEventListener('click', () => {
    if (!pointerLocked && document.body.classList.contains('playing')) {
      canvas.requestPointerLock?.();
    }
  });
}

export function isDown(code) {
  return keys.has(code);
}

// True once for each keydown since the last frame; the game loop drains it.
export function consumePressed(code) {
  const i = pressedQueue.indexOf(code);
  if (i === -1) return false;
  pressedQueue.splice(i, 1);
  return true;
}

export function drainPressed() {
  pressedQueue.length = 0;
}

export function mouseIsDown() {
  return mouseDown;
}

export function mousePos() {
  return { x: mouseX, y: mouseY };
}

// How many wheel steps arrived since the last read (positive = zoom out).
export function consumeWheel() {
  const d = wheelDelta;
  wheelDelta = 0;
  return d;
}

// WASD / arrows as a -1..1 pair: x = strafe, y = forward.
export function moveAxes() {
  let x = 0;
  let y = 0;
  if (isDown('KeyA') || isDown('ArrowLeft')) x -= 1;
  if (isDown('KeyD') || isDown('ArrowRight')) x += 1;
  if (isDown('KeyW') || isDown('ArrowUp')) y += 1;
  if (isDown('KeyS') || isDown('ArrowDown')) y -= 1;
  return { x, y };
}
