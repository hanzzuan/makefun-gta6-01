// police.js — the Solmar PD: wanted heat, interceptors, roadblocks.
// Rebuilt for the East update with a proper pursuit model. The wanted
// level is heat on a 0–150 scale: crimes add heat, the level is the
// heat band, and the heat cools when Mara stays out of sight. Each
// level sends more interceptors, and from level 4 the PD tries a PIT
// maneuver — pulling alongside and swerving into her rear quarter. At
// level 3 and above the PD throws up roadblocks on the road ahead,
// spike strips included. The helicopter (heli.js) is a separate system
// that only joins at level 5.

import * as THREE from 'three';
import { clamp, rand, lerpAngle, dist2D } from './util.js';
import { CITY_HALF, ROAD_SPACING, randomRoadPoint, hitsBuilding } from './city.js';
import { makeCar } from './cars.js';

export const MAX_WANTED = 5;

// Heat bands: the level is the highest band the heat has reached.
export const STAR_HEAT = [0, 25, 50, 75, 100, 130];

export function makeWanted() {
  return {
    level: 0,
    heat: 0, // 0..150; the level follows the heat bands
    decayTimer: 0, // seconds since the last crime — cooling starts after 6
    busted: false,
  };
}

// A crime adds heat and may raise the level. Returns what changed, so
// the caller can toast the new level.
export function addHeat(wanted, amount, reason) {
  const before = wanted.level;
  wanted.heat = clamp(wanted.heat + amount, 0, 150);
  wanted.decayTimer = 0;
  let level = 0;
  for (let i = 1; i <= MAX_WANTED; i++) {
    if (wanted.heat >= STAR_HEAT[i]) level = i;
  }
  wanted.level = level;
  return { rose: level > before, level, reason: reason || 'crime' };
}

// One frame of the heat: after six quiet seconds it starts to cool.
// Hiding (no police nearby) cools twice as fast; the helicopter's
// spotlight overhead halves the rate — the eye never loses her.
export function updateWanted(wanted, dt, playerHidden, heliOverhead, decayBoost) {
  wanted.decayTimer += dt;
  if (wanted.decayTimer < 6) return wanted.level;
  const base = playerHidden ? 6 : 2.5;
  // Nix the hacker cools the heat twice as fast: the crew's edge is a
  // multiplier on the decay rate, defaulting to 1 when she is not hired.
  const rate = base * (heliOverhead ? 0.5 : 1) * (decayBoost || 1);
  wanted.heat = Math.max(0, wanted.heat - rate * dt);
  let level = 0;
  for (let i = 1; i <= MAX_WANTED; i++) {
    if (wanted.heat >= STAR_HEAT[i]) level = i;
  }
  wanted.level = level;
  return wanted.level;
}

// How many interceptors the level puts on the street.
export function wantedForLevel(level) {
  return [0, 1, 2, 3, 4, 5][clamp(level | 0, 0, 5)];
}

// What the dispatcher says when the level rises: one line per star,
// each nastier than the last.
export function pdDispatchText(level) {
  const lines = [
    '',
    'All units: a suspect is loose in the city. Keep your eyes open.',
    'Units, we have a runner in a vehicle. Intercept and box them in.',
    'Three stars: roadblocks are going up on the avenues. Do not let them through.',
    'Four stars: PIT maneuvers authorized. Bring that car around.',
    'Five stars: the chopper is on station and every unit in Solmar is rolling. The eye in the sky never loses them.',
  ];
  return lines[clamp(level | 0, 0, 5)] || '';
}

// --- roadblocks ------------------------------------------------------------
// At three stars and above the PD throws up roadblocks: two interceptors
// parked sideways across the road ahead of the player, striped barriers
// filling the gaps, and a spike strip on the near side. The barriers
// are real colliders, so the player must slip around them, thread the
// gap, or ram straight through.
export function roadblockSpot(playerX, playerZ, heading) {
  const ahead = 55;
  const rawX = playerX + Math.sin(heading) * ahead;
  const rawZ = playerZ + Math.cos(heading) * ahead;
  const lanes = [];
  for (let v = -CITY_HALF + 35; v <= CITY_HALF - 35; v += ROAD_SPACING) lanes.push(v);
  const nearestLane = (v) => lanes.reduce(
    (best, l) => (Math.abs(l - v) < Math.abs(best - v) ? l : best),
    lanes[0],
  );
  // Snap across the road, not along it: a car travelling along an avenue
  // (heading near 0 or PI) meets a roadblock on the nearest avenue.
  if (Math.abs(Math.sin(heading)) > Math.abs(Math.cos(heading))) {
    return { x: rawX, z: nearestLane(rawZ), heading };
  }
  return { x: nearestLane(rawX), z: rawZ, heading };
}

export function spawnRoadblock(scene, x, z, heading, colliders) {
  const group = new THREE.Group();
  const cars = [];
  const barriers = [];
  const pushed = [];
  const rightX = Math.cos(heading);
  const rightZ = -Math.sin(heading);
  // Two interceptors parked nose-to-nose across the lane.
  for (const side of [-1, 1]) {
    const cx = x + rightX * side * 4.6;
    const cz = z + rightZ * side * 4.6;
    const car = makeCar('police', cx, cz, heading + Math.PI / 2);
    car.targetSpeed = 0;
    scene.add(car.mesh);
    cars.push(car);
    const c = { minX: cx - 2.4, maxX: cx + 2.4, minZ: cz - 2.4, maxZ: cz + 2.4 };
    colliders.push(c);
    pushed.push(c);
  }
  // Striped barriers: yellow and white bands across the remaining gaps.
  const stripeA = new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.8 });
  const stripeB = new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.8 });
  for (const [off, mat] of [[0, stripeA], [9.2, stripeB], [-9.2, stripeB]]) {
    const bx = x + rightX * off;
    const bz = z + rightZ * off;
    const barrier = new THREE.Mesh(new THREE.BoxGeometry(5, 1.1, 0.5), mat);
    barrier.position.set(bx, 0.55, bz);
    barrier.rotation.y = heading;
    barrier.castShadow = true;
    scene.add(barrier);
    barriers.push(barrier);
    const ex = Math.abs(Math.cos(heading)) * 2.5 + 0.4;
    const ez = Math.abs(Math.sin(heading)) * 2.5 + 0.4;
    const c = { minX: bx - ex, maxX: bx + ex, minZ: bz - ez, maxZ: bz + ez };
    colliders.push(c);
    pushed.push(c);
  }
  group.position.set(x, 0, z);
  scene.add(group);
  // A spike strip on the near side of the block: drive over it and the
  // tires go soft for a while. The strip sits 12 m before the barriers,
  // on the side the player is coming from.
  const spikeX = x - Math.sin(heading) * 12;
  const spikeZ = z - Math.cos(heading) * 12;
  const spikeBase = new THREE.Mesh(
    new THREE.BoxGeometry(5, 0.15, 1.4),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.9 }),
  );
  spikeBase.position.set(spikeX, 0.08, spikeZ);
  spikeBase.rotation.y = heading;
  scene.add(spikeBase);
  const spikeMat = new THREE.MeshStandardMaterial({ color: 0x8a8a92, roughness: 0.4, metalness: 0.7 });
  const spikeMeshes = [spikeBase];
  for (let i = -2; i <= 2; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 6), spikeMat);
    spike.position.set(spikeX + Math.cos(heading) * i, 0.3, spikeZ - Math.sin(heading) * i);
    scene.add(spike);
    spikeMeshes.push(spike);
  }
  return {
    group, cars, barriers,
    colliders: pushed,
    spikeMeshes,
    spikes: { x: spikeX, z: spikeZ, used: false },
    x, z, heading,
  };
}

export function despawnRoadblock(scene, roadblock, colliders) {
  if (!roadblock) return;
  for (const car of roadblock.cars) scene.remove(car.mesh);
  for (const barrier of roadblock.barriers) scene.remove(barrier);
  for (const mesh of roadblock.spikeMeshes || []) scene.remove(mesh);
  scene.remove(roadblock.group);
  for (const c of roadblock.colliders) {
    const i = colliders.indexOf(c);
    if (i !== -1) colliders.splice(i, 1);
  }
}

// --- police cars -------------------------------------------------------------

// A fresh interceptor: spawns on a road 90 metres out from the player,
// heading toward them, and joins the pursuit. Higher levels make it
// faster and bolder, and it carries the pursuit state for PIT attempts.
export function spawnPoliceCar(scene, nearX, nearZ, level = 1) {
  const spot = randomRoadPoint();
  const dx = spot.x - nearX;
  const dz = spot.z - nearZ;
  const d = Math.sqrt(dx * dx + dz * dz) || 1;
  const x = nearX + (dx / d) * 90;
  const z = nearZ + (dz / d) * 90;
  const car = makeCar(level >= 5 ? 'interceptor' : 'police', x, z, Math.atan2(nearX - x, nearZ - z));
  car.maxSpeed = 29 + Math.min(7, level * 1.5);
  car.targetSpeed = 0;
  car.ramCooldown = 0;
  car.pitTimer = 0; // seconds until the next PIT side-swap
  car.pitSide = 1;
  car.weavePhase = rand(0, Math.PI * 2);
  scene.add(car.mesh);
  return car;
}

// Chase the target: steer toward it, ram when close, recover from
// walls. At level 4 and above the unit tries a PIT maneuver: it pulls
// alongside the player's rear quarter, then swerves into it. Returns
// the distance to the target, for the caller's siren and bust logic.
export function updatePoliceCar(car, targetX, targetZ, targetSpeed, dt, colliders, onRam, level) {
  const d = dist2D(car.x, car.z, targetX, targetZ);
  // Aim: straight at the target, with a PIT offset at high levels and
  // a gentle weave at low ones so the pursuit does not look robotic.
  let aimX = targetX;
  let aimZ = targetZ;
  if ((level || 1) >= 4) {
    car.pitTimer -= dt;
    if (car.pitTimer <= 0) {
      car.pitTimer = 4 + rand(0, 3);
      car.pitSide = car.pitSide === 1 ? -1 : 1;
    }
    const side = car.pitSide || 1;
    const px = -(targetZ - car.z) / (d || 1);
    const pz = (targetX - car.x) / (d || 1);
    const offset = d < 14 ? side * 4.5 : side * 2;
    aimX = targetX + px * offset;
    aimZ = targetZ + pz * offset;
  } else {
    const weave = Math.sin(car.weavePhase + d * 0.04) * 3;
    aimX = targetX + (-(targetZ - car.z) / (d || 1)) * weave;
    aimZ = targetZ + ((targetX - car.x) / (d || 1)) * weave;
  }
  const wantHeading = Math.atan2(aimX - car.x, aimZ - car.z);
  car.heading = lerpAngle(car.heading, wantHeading, Math.min(1, dt * 2.2));
  // Faster than the player when far, easing off when right on top of
  // them so the ram lands instead of overshooting.
  const boost = level ? Math.min(6, level * 1.2) : 0;
  const desired = d > 60 ? car.maxSpeed + boost : d > 18 ? 26 + boost : 16;
  car.speed += (desired - car.speed) * Math.min(1, dt * 1.4);
  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  // Police steer around buildings instead of driving through them.
  if (hitsBuilding(colliders, nx, nz, 2.2)) {
    car.heading += 0.9 * dt * 4;
    car.speed *= 0.94;
  } else {
    car.x = clamp(nx, -CITY_HALF - 10, CITY_HALF + 10);
    car.z = clamp(nz, -CITY_HALF - 10, CITY_HALF + 10);
  }
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
  const spin = car.speed * dt * 2.4;
  for (const w of car.mesh.userData.wheels) w.rotation.x += spin;
  // Flashing light bar: red and blue alternate twice a second.
  const bar = car.mesh.userData.lightBar;
  if (bar) {
    const on = Math.floor(performance.now() / 180) % 2 === 0;
    bar.red.material.color.setHex(on ? 0xff2020 : 0x551010);
    bar.blue.material.color.setHex(on ? 0x182050 : 0x2050ff);
  }
  // Ram: a hard hit when the interceptor closes in.
  car.ramCooldown = Math.max(0, (car.ramCooldown || 0) - dt);
  if (d < 5.5 && car.ramCooldown <= 0 && onRam) {
    car.ramCooldown = 1.6;
    onRam(Math.min(14, 4 + car.speed * 0.25), targetSpeed);
  }
  return d;
}

// A siren wail position: the nearest police car, for the audio system.
export function nearestPoliceDistance(cars, x, z) {
  let best = 1e9;
  for (const c of cars) best = Math.min(best, dist2D(c.x, c.z, x, z));
  return best;
}

// Stealing a rare car is grand theft: six heat, not two — the city
// notices when a one-of-one goes missing.
export const RARE_CAR_HEAT = 6;
export const GRAFFITI_HEAT = 1; // a cop catching Mara mid-spray adds one star

// Heat cools on its own when Mara stays clean: 1.5 heat per second
// with no new crime, so a quiet drive home is a real way out.
export const HEAT_DECAY_PER_SECOND = 1.5;
