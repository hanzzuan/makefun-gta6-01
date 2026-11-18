// player.js — Mara Voss on foot: the character model, walk/run movement,
// third-person camera, and entering/exiting cars.

import * as THREE from 'three';
import { clamp, lerpAngle, rand } from './util.js';
import { hitsBuilding, clampToCity } from './city.js';

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
  group.userData = { legL, legR, armL, armR, gun, torso };
  return group;
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
    personalRide: null, // Mara's tuned Comet GT at the safehouse, or null
    walkPhase: 0,
    stamina: 100,
    maxStamina: 100,
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
    // Wading into the ocean past the beach slows Mara to a waist-deep walk.
    const inWater = player.x < -308;
    if (inWater) speed *= 0.5;
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
  if (running && moving) {
    player.stamina = Math.max(0, player.stamina - 14 * dt);
  } else {
    player.stamina = Math.min(player.maxStamina, player.stamina + 10 * dt);
  }
  // Waist-deep in the shallows past the beach.
  player.mesh.position.set(player.x, player.x < -308 ? -0.35 : 0, player.z);
  player.mesh.rotation.y = player.heading;
  // Walk swing on the limbs.
  const swing = moving ? Math.sin(player.walkPhase) * 0.55 : 0;
  const u = player.mesh.userData;
  u.legL.rotation.x = swing;
  u.legR.rotation.x = -swing;
  u.armL.rotation.x = -swing * 0.8;
  u.armR.rotation.x = swing * 0.8;
  u.gun.visible = player.weapon === 'pistol';
  return speed;
}

// Third-person chase camera: sits behind and above the target, looks ahead.
export function updateCamera(camera, targetX, targetZ, heading, dt, distance, height, lookAhead) {
  const cx = targetX - Math.sin(heading) * distance;
  const cz = targetZ - Math.cos(heading) * distance;
  const desired = new THREE.Vector3(cx, height, cz);
  camera.position.lerp(desired, Math.min(1, dt * 5));
  const look = new THREE.Vector3(
    targetX + Math.sin(heading) * lookAhead,
    1.6,
    targetZ + Math.cos(heading) * lookAhead,
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
  return { x: -70 + rand(-4, 4), z: 148 + rand(-4, 4) };
}
