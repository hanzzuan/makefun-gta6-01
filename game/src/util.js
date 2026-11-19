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
// The nearest point to (x, z) in a list of { x, z } points, ignoring
// any point whose id is in `skip`. Returns null when nothing qualifies.
export function nearestBy(points, x, z, skip) {
  let best = null;
  let bestD = Infinity;
  for (const point of points) {
    if (skip && skip.includes(point.id)) continue;
    const d = dist2D(x, z, point.x, point.z);
    if (d < bestD) {
      bestD = d;
      best = point;
    }
  }
  return best;
}

// How far the spray needle sits from the middle, 0 at dead centre and
// 1 at the edge — a perfect coat needs it within 0.15 of the middle.
export function sprayOff(needle) {
  return Math.abs(needle - 0.5) * 2;
}

export function angleTo(ax, az, bx, bz) {
  return Math.atan2(bx - ax, bz - az);
}

// Format an amount of in-game dollars with thousands separators. A
// negative amount — a casino night gone wrong — reads with a minus.
export function money(n) {
  const v = Math.floor(n);
  return (v < 0 ? '−$' : '$') + Math.abs(v).toLocaleString('en-US');
}

// Short money for tight HUD space: $12.5k instead of $12,500, $1.2m
// past a million. Used for big payouts and property prices.
export function moneyShort(n) {
  const v = Math.floor(n);
  const sign = v < 0 ? '−$' : '$';
  const a = Math.abs(v);
  if (a >= 1000000) return sign + (a / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
  if (a >= 1000) return sign + (a / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return sign + a;
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

// The shortest signed turn from one heading to another, in radians,
// wrapped to [-PI, PI]: how far — and in which direction — a rival
// boat, a heli, or a chasing cop must turn to face its target.
export function wrapAngle(angle) {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// A random point inside a circle of the given radius around a centre:
// where a campus crowd gathers, or where a parade route drops its
// confetti. Uniform across the area, not the radius.
export function randomPointInCircle(cx, cz, radius) {
  const r = radius * Math.sqrt(Math.random());
  const a = Math.random() * Math.PI * 2;
  return { x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r };
}

// A countdown in M:SS, for the race par times and the timed mission
// stages: 95 seconds reads 1:35, 40 reads 0:40.
export function formatCountdown(seconds) {
  const whole = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return m + ':' + String(s).padStart(2, '0');
}

// Fisher–Yates shuffle, in place, returning the same array: the
// playlist order for the radio stations and the event rotation.
export function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = array[i];
    array[i] = array[j];
    array[j] = t;
  }
  return array;
}

// A duration in seconds as m:ss — the jobs board timer and the race
// clock both read better than raw seconds.
// A countdown as m:ss, for the bounty clock and any other timer that
// reads better in minutes than in raw seconds.
export function secondsToClock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

export function formatDuration(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

// An airtime in seconds, two decimals — the stunt board, the radio
// callout and the landing toast all read the same number.
export function formatAirtime(seconds) {
  return Math.max(0, seconds).toFixed(2) + 's';
}

// How dark the city is, 0 by day to 1 at night, smooth across the
// dawn and dusk edges — the headlight, the lamp glow and the music
// mood all follow the same number.
export function nightFactor(timeOfDay) {
  const t = ((timeOfDay % 1) + 1) % 1;
  if (t < 0.16 || t >= 0.88) return 1;
  if (t >= 0.28 && t < 0.72) return 0;
  if (t < 0.28) return 1 - (t - 0.16) / 0.12;
  return (t - 0.72) / 0.16;
}
