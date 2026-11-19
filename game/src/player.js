// player.js — Mara Voss on foot: the character model, walk/run movement,
// third-person camera, and entering/exiting cars.

import * as THREE from 'three';
import { clamp, lerpAngle, rand } from './util.js';
import { hitsBuilding, clampToCity } from './city.js';

// Sprint stamina comes back at this rate while Mara walks: ten points
// a second, so a full sprint takes ten seconds to recover from.
export const STAMINA_REGEN_PER_SECOND = 10;

// Mara: a simple stylised figure — jacket, jeans, hair, built from boxes.
export function buildPlayerMesh() {
  const group = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xd8a077, roughness: 0.8 });
  const jacket = new THREE.MeshStandardMaterial({ color: 0xc2432b, roughness: 0.7 });
  const jeans = new THREE.MeshStandardMaterial({ color: 0x2a3a5e, roughness: 0.85 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x1c1210, roughness: 0.9 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.34), jacket);
  torso.position.y = 1.25;
  torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.42, 0.38), skin);
  head.position.y = 1.85;
  head.castShadow = true;
  group.add(head);
  const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.16, 0.42), hair);
  hairTop.position.y = 2.08;
  group.add(hairTop);
  const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.5, 0.12), hair);
  hairBack.position.set(0, 1.82, -0.2);
  group.add(hairBack);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.85, 0.28), jeans);
  legL.position.set(-0.17, 0.45, 0);
  legL.castShadow = true;
  group.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.17;
  group.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.24), jacket);
  armL.position.set(-0.42, 1.25, 0);
  armL.castShadow = true;
  group.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.42;
  group.add(armR);
  // A pistol in the right hand when armed.
  const gun = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.12, 0.42),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.4, metalness: 0.6 }),
  );
  gun.position.set(0.42, 0.95, 0.28);
  gun.visible = false;
  group.add(gun);
  // A spray can in the right hand for the walls: gold, with a black
  // cap, hidden until Mara is spraying.
  const can = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.28, 8),
    new THREE.MeshStandardMaterial({ color: 0xffc300, roughness: 0.4, metalness: 0.5 }),
  );
  can.position.set(0.42, 0.95, 0.28);
  can.visible = false;
  group.add(can);
  group.userData = { legL, legR, armL, armR, gun, torso, can };
  return group;
}

// Show or hide the spray can in Mara's hand while she works a wall.
export function setSpraying(player, on) {
  const can = player && player.userData && player.userData.can;
  if (can) can.visible = !!on;
}

export function makePlayer(x, z) {
  const mesh = buildPlayerMesh();
  mesh.position.set(x, 0, z);
  return {
    mesh,
    x, z,
    heading: 0,
    speed: 0,
    health: 100,
    maxHealth: 100,
    money: 250,
    weapon: 'fists', // 'fists' | 'pistol'
    ammo: 24,
    inCar: null,
    inBoat: null, // the boat Mara is driving, or null when on land
    personalRide: null, // Mara's tuned Comet GT at the safehouse, or null
    walkPhase: 0,
    stamina: 100,
    maxStamina: 100,
    adrenaline: false, // true while a bounty hunt is running: the chase keeps Mara moving
    swimStamina: 100, // swimming in deep water drains this, not the sprint bar
    sneaking: false,
  };
}

// Damage through armour: when Mara is in her tuned ride, the armour
// plating absorbs a share of every hit before her health feels it.
// On foot there is no plating, so the full amount lands.
export function damageThroughArmour(player, amount) {
  const armour = player.inCar ? (player.inCar.armour || 0) : 0;
  if (armour <= 0) return amount;
  return Math.max(1, Math.round(amount * (1 - armour)));
}

// Move on foot. `axes` is {x: strafe, y: forward} relative to the camera.
// Returns the speed actually achieved. Sneaking is slow and quiet: the PD
// has to be much closer to bust Mara while she sneaks.
export function updatePlayerOnFoot(player, axes, dt, running, cameraHeading, colliders, sneaking) {
  player.sneaking = !!sneaking && !running;
  if (running && player.stamina <= 0) running = false;
  const targetSpeed = player.sneaking ? 2.2 : running ? 8.5 : 4.6;
  const moving = Math.abs(axes.x) > 0.05 || Math.abs(axes.y) > 0.05;
  let speed = 0;
  if (moving) {
    // Movement is camera-relative: forward is where the camera looks.
    const forwardX = Math.sin(cameraHeading);
    const forwardZ = Math.cos(cameraHeading);
    const rightX = Math.cos(cameraHeading);
    const rightZ = -Math.sin(cameraHeading);
    const mx = forwardX * axes.y + rightX * axes.x;
    const mz = forwardZ * axes.y + rightZ * axes.x;
    const len = Math.hypot(mx, mz) || 1;
    const wantHeading = Math.atan2(mx / len, mz / len);
    player.heading = lerpAngle(player.heading, wantHeading, Math.min(1, dt * 12));
    speed = targetSpeed;
    // The bay: waist-deep wading in the shallows, and a proper swim in
    // the deep water past the pier. Swimming is steady but it drains a
    // separate swim stamina — step off a boat far from shore and the
    // swim home is a real effort.
    const inWater = player.x < -308;
    const inDeepWater = player.x < -322;
    if (inDeepWater) {
      speed = player.swimStamina > 0 ? 2.8 : 1.4;
      player.swimming = true;
    } else {
      player.swimming = false;
      if (inWater) speed *= 0.5;
    }
    const nx = player.x + Math.sin(player.heading) * speed * dt;
    const nz = player.z + Math.cos(player.heading) * speed * dt;
    if (!hitsBuilding(colliders, nx, nz, 0.7)) {
      const clamped = clampToCity(nx, nz);
      player.x = clamped.x;
      player.z = clamped.z;
    }
    player.walkPhase += dt * speed * 1.6;
  }
  player.speed = speed;
  // Stamina: sprinting drains it, walking or standing brings it back.
  // Swimming drains the swim bar instead; it refills on dry land.
  if (player.swimming && moving) {
    player.swimStamina = Math.max(0, player.swimStamina - 6 * dt);
  } else if (!player.swimming) {
    player.swimStamina = Math.min(100, player.swimStamina + 12 * dt);
  }
  if (running && moving) {
    player.stamina = Math.max(0, player.stamina - 14 * dt);
  } else if (moving) {
    // Adrenaline: a hunt on the board makes the stamina come back
    // half again as fast — the chase keeps Mara moving.
    const regen = STAMINA_REGEN_PER_SECOND * (player.adrenaline ? 1.5 : 1);
    player.stamina = Math.min(player.maxStamina, player.stamina + regen * dt);
  } else {
    player.stamina = Math.min(player.maxStamina, player.stamina + STAMINA_REGEN_PER_SECOND * dt);
  }
  // Waist-deep in the shallows past the beach, chest-deep when swimming.
  player.mesh.position.set(player.x, player.x < -322 ? -0.55 : player.x < -308 ? -0.35 : 0, player.z);
  player.mesh.rotation.y = player.heading;
  // Walk swing on the limbs — or a swim stroke when in deep water.
  const swing = moving ? Math.sin(player.walkPhase) * 0.55 : 0;
  const u = player.mesh.userData;
  u.legL.rotation.x = swing;
  u.legR.rotation.x = -swing;
  if (player.swimming) {
    // Arms up and paddling: the stroke that gets Mara home.
    u.armL.rotation.x = -2.2 + Math.sin(player.walkPhase * 1.4) * 0.4;
    u.armR.rotation.x = -2.2 - Math.sin(player.walkPhase * 1.4) * 0.4;
  } else {
    u.armL.rotation.x = -swing * 0.8;
    u.armR.rotation.x = swing * 0.8;
  }
  u.gun.visible = player.weapon === 'pistol';
  return speed;
}

// Third-person chase camera: sits behind and above the target, looks ahead.
export function updateCamera(camera, targetX, targetZ, heading, dt, distance, height, lookAhead, speedKmh) {
  const cx = targetX - Math.sin(heading) * distance;
  const cz = targetZ - Math.cos(heading) * distance;
  const desired = new THREE.Vector3(cx, height, cz);
  camera.position.lerp(desired, Math.min(1, dt * 5));
  // Speed sensation: the field of view widens as the car goes faster,
  // and the frame shudders a little at the top end — the road rushes.
  const speed = speedKmh || 0;
  const wantFov = 60 + Math.min(18, speed * 0.12);
  if (Math.abs(camera.fov - wantFov) > 0.5) {
    camera.fov = camera.fov + (wantFov - camera.fov) * Math.min(1, dt * 4);
    camera.updateProjectionMatrix();
  }
  const shake = speed > 90 ? (speed - 90) * 0.0012 : 0;
  const look = new THREE.Vector3(
    targetX + Math.sin(heading) * lookAhead + (Math.random() - 0.5) * shake,
    1.6 + (Math.random() - 0.5) * shake * 0.5,
    targetZ + Math.cos(heading) * lookAhead + (Math.random() - 0.5) * shake,
  );
  camera.lookAt(look);
}

// Find the nearest enterable car within reach of the player.
export function nearestCar(player, cars, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of cars) {
    const dx = car.x - player.x;
    const dz = car.z - player.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

export function playerDisplayName() {
  return 'Mara Voss';
}

export function randomSpawn() {
  // Fresh starts vary: half the time Mara wakes up at the garage,
  // half the time at the marina — the city looks different from the
  // water, and the first job is never far from either. Once in a
  // while she wakes up at the film lot, where the stunt crew left
  // the coffee on and the ramps out.
  const roll = Math.random();
  if (roll < 0.45) return { x: -70 + rand(-4, 4), z: 148 + rand(-4, 4) };
  if (roll < 0.9) return { x: -238 + rand(-4, 4), z: 175 + rand(-4, 4) };
  return { x: -285 + rand(-4, 4), z: 90 + rand(-4, 4) };
}

// Fast travel drops Mara on her feet: clamp the landing spot inside
// the city so a stop near the edge never leaves her in the bay.
export function clampPlayerToCity(player) {
  if (!player) return;
  player.x = Math.min(360, Math.max(-360, player.x));
  player.z = Math.min(280, Math.max(-280, player.z));
}
