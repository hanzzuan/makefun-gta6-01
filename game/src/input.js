// input.js — keyboard and mouse state for Solmar.
// Rebuilt for the East update. main.js polls this every frame; keys are
// tracked by their `code` value so layouts do not matter. Edge-triggered
// presses (E, F, P, 1, 2, M, G, R, H, N, B, Enter, Space) are queued
// and consumed once by the game loop — N turns the radio dial, B buys
// or visits a property. The mouse fires the pistol, the wheel zooms
// the chase camera, and a click locks the pointer while playing.

const state = {
  keys: new Set(),
  pressed: [], // edge-triggered codes waiting to be consumed
  mouseDown: false,
  mouseX: 0,
  mouseY: 0,
  wheel: 0, // accumulated wheel steps since the last read
  locked: false,
  interact: null,
};

// Keys that fire once per press instead of staying held: the loop
// consumes each one exactly once, so a single tap never double-fires.
// C opens Club Neon at the club door, T opens the taxi rank anywhere,
// G/J/K/L open the garage, the jobs board, the showroom and the
// packages list at the garage, and O hides the HUD for a photo.
// I sprays a wall when Mara stands by one, or opens the street-art
// gallery at the garage.
const EDGE_KEYS = new Set([
  'KeyE', 'KeyF', 'KeyP', 'KeyM', 'Digit1', 'Digit2', 'Enter', 'Space',
  'KeyR', 'KeyH', 'KeyG', 'KeyN', 'KeyB', 'KeyV', 'KeyX', 'KeyC', 'KeyT',
  'KeyJ', 'KeyK', 'KeyL', 'KeyO', 'KeyU', 'KeyI',
]);

function noteInteract() {
  if (state.interact) state.interact();
}

export function initInput(canvas, onInteract) {
  state.interact = onInteract || null;
  window.addEventListener('keydown', (event) => {
    if (event.repeat) return; // held keys do not re-queue
    state.keys.add(event.code);
    if (EDGE_KEYS.has(event.code)) state.pressed.push(event.code);
    if (event.code === 'Space') event.preventDefault();
    noteInteract();
  });
  window.addEventListener('keyup', (event) => {
    state.keys.delete(event.code);
  });
  // Losing the window clears every held key, so Mara never drives
  // herself into a wall while the player is alt-tabbed.
  window.addEventListener('blur', () => {
    state.keys.clear();
    state.mouseDown = false;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) state.mouseDown = true;
    state.mouseX = event.clientX;
    state.mouseY = event.clientY;
    noteInteract();
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) state.mouseDown = false;
  });
  window.addEventListener('mousemove', (event) => {
    state.mouseX = event.clientX;
    state.mouseY = event.clientY;
  });
  // Mouse wheel zooms the chase camera in and out; the loop reads it.
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    state.wheel += Math.sign(event.deltaY);
    noteInteract();
  }, { passive: false });
  document.addEventListener('pointerlockchange', () => {
    state.locked = document.pointerLockElement === canvas;
  });
  canvas.addEventListener('click', () => {
    if (!state.locked && document.body.classList.contains('playing')) {
      canvas.requestPointerLock?.();
    }
  });
}

export function isDown(code) {
  return state.keys.has(code);
}

// True once for each keydown since the last frame; the game loop drains it.
export function consumePressed(code) {
  const i = state.pressed.indexOf(code);
  if (i === -1) return false;
  state.pressed.splice(i, 1);
  return true;
}

// Every edge press still waiting, oldest first — for menus that want
// to clear the queue instead of reading one key at a time.
export function pressedCodes() {
  return [...state.pressed];
}

export function drainPressed() {
  state.pressed.length = 0;
}

export function mouseIsDown() {
  return state.mouseDown;
}

export function mousePos() {
  return { x: state.mouseX, y: state.mouseY };
}

// How many wheel steps arrived since the last read (positive = zoom out).
export function consumeWheel() {
  const d = state.wheel;
  state.wheel = 0;
  return d;
}

// WASD / arrows as a -1..1 pair: x = strafe, y = forward. Diagonals are
// normalized so holding W+A is not faster than holding W alone.
export function moveAxes() {
  let x = 0;
  let y = 0;
  if (isDown('KeyA') || isDown('ArrowLeft')) x -= 1;
  if (isDown('KeyD') || isDown('ArrowRight')) x += 1;
  if (isDown('KeyW') || isDown('ArrowUp')) y += 1;
  if (isDown('KeyS') || isDown('ArrowDown')) y -= 1;
  if (x !== 0 && y !== 0) {
    const inv = 1 / Math.sqrt(2);
    x *= inv;
    y *= inv;
  }
  return { x, y };
}

// Take the first pressed key from a list, if any — the garage trio
// (G/J/K) shares one check now, so a single tap cannot open two panels.
export function anyPressed(codes) {
  for (const code of codes) {
    if (consumePressed(code)) return code;
  }
  return null;
}

// True when any key in the list is held — the driving camera uses it
// to pick a view without caring which of two keys the player pressed.
export function isAnyDown(codes) {
  return codes.some((code) => isDown(code));
}
