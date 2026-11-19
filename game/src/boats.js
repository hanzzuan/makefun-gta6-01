// boats.js — boats on the water west of Solmar.
// The ocean is not scenery: Mara can board a boat at the dockside pier
// or the marina, drive it across the bay, and outrun rival boats in a
// water chase. Boats live on the water (x < -282); the beach pushes them
// back, and the bay is bounded by the lighthouse to the north and the
// harbor mouth to the south. A boat is steered like a car but drifts:
// throttle builds slowly, turns bleed speed, and the swell never stops.

import * as THREE from 'three';
import { clamp, rand, pick } from './util.js';

// The bay: boats may run from the lighthouse in the north to the harbor
// mouth in the south, and from the open water in the west to the beach.
export const BAY = { minX: -470, maxX: -282, minZ: -295, maxZ: 295 };
export const BEACH_X = -282;

export const BOAT_KINDS = {
  speedboat: { topSpeed: 26, accel: 11, name: 'Sunset Speedboat' },
  fishing: { topSpeed: 14, accel: 8, name: 'Harbor Fisher' },
  patrol: { topSpeed: 22, accel: 10, name: 'PD Patrol Boat' },
  yacht: { topSpeed: 30, accel: 9, name: 'Solmar Yacht' },
  // The smugglers' runner: the fastest hull on the bay, dark paint,
  // no running lights — it reads as a patrol boat until it is gone.
  smuggler: { topSpeed: 32, accel: 12, name: 'Smuggler Runner' },
};

const BOAT_NAMES = ['Wave Runner', 'Salt Spray', 'Night Tide', 'Golden Gull'];

// A boat is a hull, a cabin or windshield, and an outboard motor. The
// hull is a long low box with a pointed bow made from a second box
// rotated 45 degrees — cheap, but it reads as a boat from the pier.
export function makeBoatMesh(color, kind) {
  const group = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({
    color, roughness: 0.4, metalness: 0.35,
  });
  const hull = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.1, 8.5), hullMat);
  hull.position.y = 0.55;
  hull.castShadow = true;
  group.add(hull);
  const bow = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.9, 2.4), hullMat);
  bow.position.set(0, 0.5, 5.1);
  bow.rotation.y = Math.PI / 4;
  group.add(bow);
  const deckMat = new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.7 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.25, 7.6), deckMat);
  deck.position.y = 1.2;
  group.add(deck);
  if (kind === 'speedboat') {
    // A low windshield and a single outboard motor on the transom.
    const shield = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 1.0, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x9fd8e8, roughness: 0.1, metalness: 0.5 }),
    );
    shield.position.set(0, 1.9, 1.8);
    shield.rotation.x = -0.35;
    group.add(shield);
    const motor = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.4, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.5, metalness: 0.5 }),
    );
    motor.position.set(0, 0.9, -4.5);
    group.add(motor);
  } else if (kind === 'fishing') {
    // A small cabin with a mast, for the harbor's working boats.
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 1.8, 2.6),
      new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.6 }),
    );
    cabin.position.set(0, 2.1, 0.4);
    cabin.castShadow = true;
    group.add(cabin);
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 4.5, 6),
      new THREE.MeshStandardMaterial({ color: 0x3a3a42, roughness: 0.7 }),
    );
    mast.position.set(0, 4.2, 0.4);
    group.add(mast);
  } else {
    // The patrol boat: a cabin, a light bar, and a searchlight.
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 1.6, 3.2),
      new THREE.MeshStandardMaterial({ color: 0x1a2a4a, roughness: 0.5 }),
    );
    cabin.position.set(0, 2.0, 0.2);
    cabin.castShadow = true;
    group.add(cabin);
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.3, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xd8382e, roughness: 0.4, metalness: 0.4 }),
    );
    bar.position.set(0, 3.0, 0.2);
    group.add(bar);
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xfff2c0 }),
    );
    lamp.position.set(0, 2.6, 2.0);
    group.add(lamp);
  }
  group.userData = { kind };
  return group;
}

// Put a boat in the world. Returns the boat object the loop drives:
// mesh, kind, name, position, heading, speed, and a wake timer.
export function makeBoat(scene, kind, x, z, heading) {
  const k = BOAT_KINDS[kind] ? kind : 'speedboat';
  const color = k === 'patrol' ? 0x1a2a4a : k === 'fishing' ? 0x3f8a4a : pick([0xd8382e, 0xf2c230, 0x2e6fd8, 0xe8e4da]);
  const mesh = makeBoatMesh(color, k);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading || 0;
  scene.add(mesh);
  return {
    mesh,
    kind: k,
    name: BOAT_KINDS[k].name,
    displayName: pick(BOAT_NAMES),
    x, z,
    heading: heading || 0,
    speed: 0,
    maxSpeed: BOAT_KINDS[k].topSpeed,
    steer: 0,
    bobPhase: rand(0, Math.PI * 2),
    rival: false,
    health: 100,
  };
}

// A moored boat near the pier or the marina: the ones Mara can steal.
export function spawnBoat(scene, x, z, kind) {
  const boat = makeBoat(scene, kind || pick(['speedboat', 'fishing', 'yacht', 'smuggler']), x, z, rand(0, Math.PI * 2));
  boat.speed = 0;
  return boat;
}

// A PD patrol boat moored at the marina: dark blue, fast, and
// stealable like every boat in Solmar — the bay's own interceptor.
export function spawnPatrolBoat(scene, x, z) {
  const boat = makeBoat(scene, 'patrol', x, z, rand(0, Math.PI * 2));
  boat.speed = 0;
  return boat;
}

// Drive the boat Mara is in. axes.y is throttle (1 forward, -1 reverse),
// axes.x is the rudder. The water drags: speed bleeds off when the
// throttle lifts, turns bleed more, and the beach pushes the hull back.
export function updatePlayerBoat(boat, axes, dt, onCollide, speedMult) {
  const info = BOAT_KINDS[boat.kind];
  const throttle = axes.y || 0;
  // Dee the driver makes boats faster too: the crew's speed multiplier
  // lifts both the acceleration and the hull's top speed.
  const boost = speedMult || 1;
  if (throttle > 0) boat.speed += info.accel * boost * throttle * dt;
  else if (throttle < 0) boat.speed += info.accel * boost * 0.7 * throttle * dt;
  else boat.speed -= Math.sign(boat.speed) * Math.min(Math.abs(boat.speed), 6 * dt);
  // Turning bleeds speed, like a real hull carving a turn.
  const turn = (axes.x || 0) * 1.35 * (boat.speed >= 0 ? 1 : -1);
  if (Math.abs(boat.speed) > 1) {
    boat.heading += turn * dt * clamp(Math.abs(boat.speed) / 10, 0.25, 1);
    boat.speed -= Math.sign(boat.speed) * Math.abs(turn) * 1.1 * dt;
  }
  boat.speed = clamp(boat.speed, -info.topSpeed * boost * 0.45, info.topSpeed * boost);
  boat.x += Math.sin(boat.heading) * boat.speed * dt;
  boat.z += Math.cos(boat.heading) * boat.speed * dt;
  // The bay's bounds: the beach to the east, open water to the west,
  // the lighthouse north and the harbor mouth south.
  let hit = false;
  if (boat.x > BAY.maxX) { boat.x = BAY.maxX; boat.speed *= -0.3; hit = true; }
  if (boat.x < BAY.minX) { boat.x = BAY.minX; boat.speed *= -0.3; hit = true; }
  if (boat.z > BAY.maxZ) { boat.z = BAY.maxZ; boat.speed *= -0.3; hit = true; }
  if (boat.z < BAY.minZ) { boat.z = BAY.minZ; boat.speed *= -0.3; hit = true; }
  if (hit && onCollide) onCollide(Math.abs(boat.speed));
  boat.mesh.position.set(boat.x, 0, boat.z);
  boat.mesh.rotation.y = boat.heading;
}

// The swell: every boat bobs and rolls a little, driven or moored.
export function updateBoatVisual(boat, time) {
  boat.mesh.position.y = Math.sin(time * 0.9 + boat.bobPhase) * 0.22;
  boat.mesh.rotation.z = Math.sin(time * 0.7 + boat.bobPhase) * 0.03;
  boat.mesh.rotation.x = Math.cos(time * 0.8 + boat.bobPhase) * 0.02;
}

// The nearest boat Mara can board, within maxDist metres.
export function boatNear(x, z, boats, maxDist) {
  let best = null;
  let bestD = (maxDist || 5) * (maxDist || 5);
  for (const boat of boats) {
    const dx = boat.x - x;
    const dz = boat.z - z;
    const d = dx * dx + dz * dz;
    if (d < bestD) { bestD = d; best = boat; }
  }
  return best;
}

// A floating buoy: the marker for the boat stages. Orange, lit, and
// bobbing on the swell so it reads from across the bay.
export function makeBuoy(scene, x, z) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.5, 1.2, 10),
    new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.6 }),
  );
  base.position.y = 0.6;
  base.castShadow = true;
  group.add(base);
  const stripe = new THREE.Mesh(
    new THREE.CylinderGeometry(1.15, 1.15, 0.3, 10),
    new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.6 }),
  );
  stripe.position.y = 1.0;
  group.add(stripe);
  // A gold band above the stripe, spray-painted by the Mural Row crew
  // the night the lighthouse signal went up — the buoys wear the tag.
  const tag = new THREE.Mesh(
    new THREE.CylinderGeometry(1.12, 1.12, 0.12, 10),
    new THREE.MeshStandardMaterial({ color: 0xffc300, roughness: 0.5, metalness: 0.4 }),
  );
  tag.position.y = 1.25;
  group.add(tag);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffd23e }),
  );
  lamp.position.y = 1.6;
  group.add(lamp);
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.8, 6),
    new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.7 }),
  );
  pole.position.y = 1.4;
  group.add(pole);
  group.position.set(x, 0, z);
  scene.add(group);
  return { mesh: group, lamp, x, z, phase: rand(0, Math.PI * 2) };
}

export function updateBuoy(buoy, time) {
  buoy.mesh.position.y = Math.sin(time * 0.9 + buoy.phase) * 0.25;
  buoy.lamp.material.color.setHex(Math.sin(time * 2.4) > 0 ? 0xffd23e : 0x8a6a1a);
}

// A rival patrol boat that chases Mara's boat across the bay. It steers
// toward her, closes the gap, and bumps her hull — the water version of
// a police ram. Returns true while it is still hunting.
export function updateRivalBoat(boat, dt, tx, tz, onRam) {
  const dx = tx - boat.x;
  const dz = tz - boat.z;
  const d = Math.hypot(dx, dz);
  const want = Math.atan2(dx, dz);
  let diff = want - boat.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  boat.heading += clamp(diff, -1.1 * dt, 1.1 * dt);
  const target = d > 60 ? boat.maxSpeed : d > 20 ? boat.maxSpeed * 0.7 : boat.maxSpeed * 0.4;
  boat.speed += (target - boat.speed) * Math.min(1, dt * 0.8);
  boat.x += Math.sin(boat.heading) * boat.speed * dt;
  boat.z += Math.cos(boat.heading) * boat.speed * dt;
  boat.x = clamp(boat.x, BAY.minX, BAY.maxX);
  boat.z = clamp(boat.z, BAY.minZ, BAY.maxZ);
  boat.mesh.position.set(boat.x, 0, boat.z);
  boat.mesh.rotation.y = boat.heading;
  if (d < 6 && onRam) {
    onRam(6);
    boat.speed *= 0.5;
  }
  return d < 140;
}

// How far along the bay a boat is, for the HUD: 0 at the pier, 1 at
// the lighthouse buoy.
export function boatProgress(boat) {
  const t = clamp((boat.z + 295) / 590, 0, 1);
  return t;
}

// A boat stage is cleared when the hull is inside the marker ring —
// the bay is the road, so the check is pure distance: on foot or in
// a car it can never clear.
export function boatAtBuoy(px, pz, place, radius) {
  const dx = px - place.x;
  const dz = pz - place.z;
  return dx * dx + dz * dz < radius * radius;
}

// The buoys of the bay: the lighthouse buoy where the signal runs,
// and the harbor-mouth buoy where the smugglers cross.
export const BUOY_SPOTS = [
  { x: -352, z: -210, name: 'Lighthouse Buoy' },
  { x: -280, z: -140, name: 'Harbor-Mouth Buoy' },
];
