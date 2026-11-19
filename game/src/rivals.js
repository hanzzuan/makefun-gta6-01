// rivals.js — the rival crew street chases.
// Venn is gone, but Solmar's streets are never empty: Rocco's crew runs
// the east side now, and they do not like Mara driving through it. A
// rival chase starts when Mara is driving fast with heat on her, or when
// a mission calls for it: two or three rival cars hunt her down, weave
// across her line, and ram her. Escape them — stay 130 metres clear for
// six seconds — or wreck them by slamming them into buildings and
// traffic. A chase pays $300 when it ends in Mara's favour.

import { clamp, rand, pick } from './util.js';
import { makeCar } from './cars.js';
import { SPRAY_SPOTS } from './graffiti.js';

export const RIVAL_CHASE_REWARD = 300;
export const RIVAL_ESCAPE_DISTANCE = 130;
export const RIVAL_ESCAPE_TIME = 6;
// A rival wrecked on the casino's doorstep pays double: the house
// likes a show, and the crowd tips the winner. The club pays too —
// a wreck on Club Neon's doorstep is the night's entertainment, and
// the door men tip the winner.
export const RIVAL_CASINO_BONUS = 500;
export const RIVAL_CLUB_BONUS = 400;
export function rivalWreckBonus(x, z) {
  const dc = Math.sqrt((x - (-128)) ** 2 + (z - 224) ** 2);
  const dn = Math.sqrt((x - (-70)) ** 2 + (z - (-70)) ** 2);
  if (dc < 40) return RIVAL_CASINO_BONUS;
  if (dn < 40) return RIVAL_CLUB_BONUS;
  return 0;
}

export const RIVAL_TAUNTS = [
  'Rocco sends his regards.',
  'East side is ours, Voss.',
  'You drive like a tourist, Mara.',
  'The crew wants your Comet.',
  'Nobody outruns Rocco twice.',
  'The club door is ours tonight.',
];

export function rivalTaunt() {
  return pick(RIVAL_TAUNTS);
}

// A taunt for a specific moment — the rivals heckle the collection
// and the board, not just the chase.
export function rivalTauntFor(kind) {
  if (kind === 'showroom') return 'Rocco: "Nice collection, Voss. Shame it is all going to be mine."';
  if (kind === 'job') return 'Rocco: "Running errands now? The big jobs still belong to us."';
  if (kind === 'bounty') return 'Rocco: "Hunting for the PD now? The Ghost will eat you alive, Voss."';
  return rivalTaunt();
}

export function makeRivalState() {
  return {
    active: false, // a chase is live right now
    rivals: [], // the rival cars in the chase
    escapeTimer: 0, // seconds the player has been clear of all rivals
    cooldown: 45, // seconds before a random chase can start again
    escaped: 0, // chases Mara escaped
    wrecked: 0, // chases Mara ended by wrecking the rivals
    total: 0,
    tagWarTimer: 150, // seconds until Rocco's runners spray over a finished wall
  };
}

export function rivalFromSave(saved) {
  const state = makeRivalState();
  if (!saved || typeof saved !== 'object') return state;
  state.escaped = Math.max(0, Number(saved.escaped) || 0);
  state.wrecked = Math.max(0, Number(saved.wrecked) || 0);
  state.total = Math.max(0, Number(saved.total) || 0);
  state.tagWarTimer = Math.max(30, Number(saved.tagWarTimer) || 150);
  return state;
}

// The tag war: Rocco's runners hate the walls. Every couple of minutes
// one of them sprays over a finished piece, and the wall goes blank
// again — Mara has to go back and paint it. Returns the hit wall, or
// null when the war is quiet. Only fires while Mara has finished at
// least one wall.
export function rivalTagWar(state, graffitiState, dt) {
  if (!state || !graffitiState) return null;
  state.tagWarTimer -= dt;
  if (state.tagWarTimer > 0) return null;
  state.tagWarTimer = 150 + Math.random() * 90;
  if (!graffitiState.done || graffitiState.done.length === 0) return null;
  const wallId = graffitiState.done[Math.floor(Math.random() * graffitiState.done.length)];
  const spot = SPRAY_SPOTS.find((s) => s.id === wallId);
  graffitiState.done = graffitiState.done.filter((id) => id !== wallId);
  delete graffitiState.coats[wallId];
  return { type: 'tagwar', spot: spot || { id: wallId, name: 'a wall' } };
}

// Spawn a rival chase at (x, z): two or three rival cars in purple and
// orange, already moving, already angry. They are traffic cars with a
// rival flag, but they are NOT part of the traffic stream — they live in
// rivalState.rivals and the steal check only looks at traffic, so Mara
// cannot steal one after the chase. They chase, they ram, and when the
// chase ends they are despawned.
export function spawnRivalChase(scene, x, z, count) {
  const rivals = [];
  const colors = [0x8a2a8a, 0xff7a1a, 0x8a2a8a];
  const n = count || 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < n; i++) {
    const car = makeCar('car', x + (rand(-14, 14)), z + (rand(-14, 14)), rand(0, Math.PI * 2), colors[i % colors.length]);
    car.name = "Rocco's Runner";
    car.rival = true;
    car.health = 100;
    car.ramCooldown = 0;
    car.weavePhase = rand(0, Math.PI * 2);
    car.pitTimer = 0;
    car.maxSpeed = 30;
    car.targetSpeed = 26;
    scene.add(car.mesh);
    rivals.push(car);
  }
  return rivals;
}

// One rival, one frame: steer at the player's car with a weave across
// her line, close the gap, and ram when close. A rival that hits a
// building at speed takes damage — use the city against them.
export function updateRival(car, dt, tx, tz, targetSpeed, colliders, onRam) {
  const dx = tx - car.x;
  const dz = tz - car.z;
  const d = Math.hypot(dx, dz);
  // Weave: a sine offset across the line of pursuit, so the rival
  // does not just tailgate — it cuts across Mara's nose.
  const weave = Math.sin(car.weavePhase + d * 0.05) * 6;
  const px = -dz / (d || 1);
  const pz = dx / (d || 1);
  const wantX = tx + px * weave;
  const wantZ = tz + pz * weave;
  const want = Math.atan2(wantX - car.x, wantZ - car.z);
  let diff = want - car.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.heading += clamp(diff, -2.2 * dt, 2.2 * dt);
  const desired = d > 50 ? car.maxSpeed : d > 18 ? car.maxSpeed * 0.75 : car.maxSpeed * 0.5;
  car.speed += (desired - car.speed) * Math.min(1, dt * 1.2);
  car.x += Math.sin(car.heading) * car.speed * dt;
  car.z += Math.cos(car.heading) * car.speed * dt;
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
  // Body roll into the turn, like the player car.
  car.mesh.rotation.z = clamp(-diff * 0.4, -0.12, 0.12);
  // Hitting a building at speed wrecks the rival a little.
  for (const c of colliders) {
    if (car.x > c.minX - 1 && car.x < c.maxX + 1 && car.z > c.minZ - 1 && car.z < c.maxZ + 1) {
      if (Math.abs(car.speed) > 10) {
        car.health -= 35;
        car.speed *= -0.3;
        car.x -= Math.sin(car.heading) * 2;
        car.z -= Math.cos(car.heading) * 2;
      }
      break;
    }
  }
  car.ramCooldown -= dt;
  if (d < 5.5 && car.ramCooldown <= 0) {
    car.ramCooldown = 1.6;
    if (onRam) onRam(8);
    car.speed *= 0.6;
    return { rammed: true };
  }
  return { rammed: false };
}

// Damage a rival car (player ram at speed, or a building). Returns true
// when the rival is wrecked.
export function damageRival(car, amount) {
  car.health -= amount;
  if (car.health <= 0) {
    car.health = 0;
    return true;
  }
  return false;
}

// The chase itself: escape by staying clear, or wreck every rival.
// Returns null while the chase runs, or an event when it ends:
// { type: 'escaped' } or { type: 'wrecked' }.
export function updateRivalChase(state, dt, px, pz) {
  if (!state.active) {
    state.cooldown -= dt;
    return null;
  }
  const alive = state.rivals.filter((r) => r.health > 0);
  if (alive.length === 0) {
    state.active = false;
    state.wrecked += 1;
    state.total += 1;
    return { type: 'wrecked' };
  }
  let nearest = 1e9;
  for (const r of alive) {
    const d = Math.hypot(r.x - px, r.z - pz);
    if (d < nearest) nearest = d;
  }
  if (nearest > RIVAL_ESCAPE_DISTANCE) {
    state.escapeTimer += dt;
    if (state.escapeTimer >= RIVAL_ESCAPE_TIME) {
      state.active = false;
      state.escaped += 1;
      state.total += 1;
      return { type: 'escaped' };
    }
  } else {
    state.escapeTimer = 0;
  }
  return null;
}

// End a chase and clear the rivals from the world.
export function despawnRivals(scene, rivals) {
  for (const r of rivals) {
    scene.remove(r.mesh);
  }
  return [];
}

// A one-line readout for the pause screen and the free-roam objective.
export function rivalStatusLine(state) {
  if (state.total === 0) return 'No rival chases yet — Rocco\u2019s crew is watching the east side.';
  return `Rival chases: ${state.total} · escaped ${state.escaped} · wrecked ${state.wrecked}`;
}
