// police.js — Solmar PD: the wanted level and the police cars that answer it.
// Stealing a car, speeding through a crowd or firing a weapon raises heat;
// police spawn at the city edge, chase, ram, and back off when the heat dies.

import * as THREE from 'three';
import { clamp, lerpAngle, dist2D } from './util.js';
import { CITY_HALF, ROAD_SPACING, randomRoadPoint, hitsBuilding } from './city.js';
import { makeCar } from './cars.js';

export const MAX_WANTED = 5;

export function makeWanted() {
  return {
    level: 0,
    heat: 0, // 0..100, fills toward the next star
    decayTimer: 0,
    busted: false,
  };
}

// Heat thresholds: how much heat each star needs.
const STAR_HEAT = [0, 25, 50, 75, 100, 130];

export function addHeat(wanted, amount, reason) {
  wanted.heat = clamp(wanted.heat + amount, 0, 150);
  wanted.decayTimer = 0;
  const level = STAR_HEAT.reduce((lvl, need, i) => (wanted.heat >= need ? i : lvl), 0);
  const rose = level > wanted.level;
  wanted.level = Math.min(MAX_WANTED, level);
  return { rose, level: wanted.level, reason };
}

export function updateWanted(wanted, dt, playerHidden, heliOverhead) {
  // Heat cools off when the player is out of sight and not committing crimes.
  // The helicopter changes the maths: while its spotlight is on Mara, the
  // PD never loses her, so the heat cools at half speed.
  wanted.decayTimer += dt;
  if (wanted.decayTimer > 6) {
    const rate = (playerHidden ? 6 : 2.5) * (heliOverhead ? 0.5 : 1);
    wanted.heat = Math.max(0, wanted.heat - rate * dt);
    const level = STAR_HEAT.reduce((lvl, need, i) => (wanted.heat >= need ? i : lvl), 0);
    wanted.level = Math.min(MAX_WANTED, level);
  }
  return wanted.level;
}

// Radio chatter for the wanted level: what the dispatcher says when the
// heat rises. main.js shows one line per new star.
export function pdDispatchText(level) {
  return [
    '',
    'All units: a suspect is on foot in the city. Keep your eyes open.',
    'Units, we have a runner in a vehicle. Intercept and box them in.',
    'Three stars: roadblocks are going up on the avenues. Do not let them through.',
    'Four stars: spike strips authorized. Bring that car to a stop.',
    'Five stars: the chopper is on station. The eye in the sky never loses them.',
  ][clamp(level, 0, 5)];
}

export function wantedForLevel(level) {
  // How many police cars a wanted level fields.
  return [0, 1, 2, 3, 4, 5][clamp(level, 0, 5)];
}

// --- roadblocks ------------------------------------------------------------
// At three stars and above the PD throws up roadblocks: two interceptors
// parked sideways across the road ahead of the player, with striped
// barriers filling the gaps. The barriers are real colliders, so the
// player must slip around them, thread the gap, or ram straight through.
export function roadblockSpot(playerX, playerZ, heading) {
  const ahead = 55;
  const rawX = playerX + Math.sin(heading) * ahead;
  const rawZ = playerZ + Math.cos(heading) * ahead;
  const lanes = [];
  for (let v = -CITY_HALF + 35; v <= CITY_HALF - 35; v += ROAD_SPACING) lanes.push(v);
  const nearestLane = (v) => lanes.reduce((best, l) => (Math.abs(l - v) < Math.abs(best - v) ? l : best), lanes[0]);
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
  return { group, cars, barriers, colliders: pushed, spikeMeshes, spikes: { x: spikeX, z: spikeZ, used: false }, x, z, heading };
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

export function spawnPoliceCar(scene, nearX, nearZ, level = 1) {
  // Spawn on a road some distance away, coming toward the player.
  const spot = randomRoadPoint();
  const dx = spot.x - nearX;
  const dz = spot.z - nearZ;
  const d = Math.sqrt(dx * dx + dz * dz) || 1;
  const x = nearX + (dx / d) * 90;
  const z = nearZ + (dz / d) * 90;
  const car = makeCar('police', x, z, Math.atan2(nearX - x, nearZ - z));
  // Interceptors get faster as the wanted level climbs.
  car.maxSpeed = 29 + Math.min(7, level * 1.5);
  car.targetSpeed = 0;
  car.ramCooldown = 0;
  scene.add(car.mesh);
  return car;
}

// Chase the target: steer toward it, ram when close, recover from walls.
export function updatePoliceCar(car, targetX, targetZ, targetSpeed, dt, colliders, onRam, level) {
  const d = dist2D(car.x, car.z, targetX, targetZ);
  const wantHeading = Math.atan2(targetX - car.x, targetZ - car.z);
  car.heading = lerpAngle(car.heading, wantHeading, Math.min(1, dt * 2.2));
  // Faster than the player when far, easing off when right on top of them.
  // At high wanted levels the interceptors push harder.
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
  // Flashing light bar.
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
