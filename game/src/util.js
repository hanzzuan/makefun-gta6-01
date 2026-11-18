// util.js — tiny math and random helpers shared by every Solmar system.
// No state lives here; every function is pure so the city, traffic and
// missions can all draw on the same deterministic-feeling helpers.

export function clamp(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

// Smoothstep easing for camera blends and UI pulses.
export function smooth(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

export function rand(low, high) {
  return low + Math.random() * (high - low);
}

export function randInt(low, high) {
  return Math.floor(rand(low, high + 1));
}

export function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Seeded random so the city layout is stable between page loads.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function dist2D(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

// Angle (radians) from point a to point b on the XZ plane.
export function angleTo(ax, az, bx, bz) {
  return Math.atan2(bx - ax, bz - az);
}

// Format an amount of in-game dollars with thousands separators.
export function money(n) {
  return '$' + Math.floor(n).toLocaleString('en-US');
}

// Clamp a value to the 0..1 range, for fades and blends.
export function clamp01(value) {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

// Shortest signed angle from a to b, in (-PI, PI].
export function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

// Format a game-clock hour (0..24) as a 12-hour string: "7:30 PM".
export function formatClock(hours) {
  const h = ((hours % 24) + 24) % 24;
  const hour12 = Math.floor(h) % 12 || 12;
  const minutes = Math.floor((h % 1) * 60);
  const suffix = h < 12 ? 'AM' : 'PM';
  return hour12 + ':' + String(minutes).padStart(2, '0') + ' ' + suffix;
}

// Format a race time in seconds as "1:23.45" — minutes, seconds, hundredths.
export function formatRaceTime(seconds) {
  const t = Math.max(0, seconds);
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const hundredths = Math.floor((t % 1) * 100);
  return m + ':' + String(s).padStart(2, '0') + '.' + String(hundredths).padStart(2, '0');
}

// Pick one entry from a list with a seeded random function, so a layout
// built from a seed stays stable between page loads.
export function seededPick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

// Pick one entry from a weighted list: [[value, weight], ...].
export function pickWeighted(entries) {
  let total = 0;
  for (const [, w] of entries) total += w;
  let roll = Math.random() * total;
  for (const [value, w] of entries) {
    roll -= w;
    if (roll <= 0) return value;
  }
  return entries[entries.length - 1][0];
}

// True with probability p (0..1), for ambient chance rolls.
export function chance(p) {
  return Math.random() < p;
}

// Ease a value in and out over a 0..1 progress, for camera and UI moves.
export function easeInOut(t) {
  const x = clamp01(t);
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}
