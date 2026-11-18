// combat.js — fists, pistol and the warehouse crew who shoot back.
// Shooting is a hitscan ray from the camera through the crosshair; enemies
// are simple state machines: idle, aim, fire, down.

import * as THREE from 'three';
import { clamp, rand, dist2D } from './util.js';

export function makeEnemy(scene, x, z, variant) {
  // Variants: 'crew' is Venn's warehouse muscle, 'enforcer' is his harbor
  // crew in dark red — tougher and quicker on the trigger — 'collector'
  // is the man himself, slow but deadly accurate, 'guard' is his resort
  // and airport security in navy blue, and 'venn' is the fixer himself:
  // the toughest man in Solmar, in a grey suit with a red tie.
  const kind = variant || 'crew';
  const suitColor = kind === 'enforcer' ? 0x4a1e22
    : kind === 'collector' ? 0x14141a
    : kind === 'guard' ? 0x1a2a4a
    : kind === 'venn' ? 0x4a4a52
    : 0x2e2a3a;
  const group = new THREE.Group();
  const suit = new THREE.MeshStandardMaterial({ color: suitColor, roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc89068, roughness: 0.8 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.32), suit);
  torso.position.y = 1.25;
  torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.4, 0.36), skin);
  head.position.y = 1.83;
  head.castShadow = true;
  group.add(head);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.85, 0.26), suit);
  legL.position.set(-0.16, 0.45, 0);
  group.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.16;
  group.add(legR);
  const gun = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.12, 0.42),
    new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.4, metalness: 0.6 }),
  );
  gun.position.set(0.36, 1.2, 0.3);
  group.add(gun);
  // Enforcers wear a red armband so the player can tell them apart at a
  // glance; the collector wears a white shirt under the black suit.
  if (kind === 'enforcer') {
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.12, 0.34),
      new THREE.MeshStandardMaterial({ color: 0xd8382e, roughness: 0.7 }),
    );
    band.position.y = 1.45;
    group.add(band);
  }
  if (kind === 'collector') {
    const shirt = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.6, 0.34),
      new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.8 }),
    );
    shirt.position.y = 1.25;
    group.add(shirt);
  }
  // Guards wear a gold badge on the chest; Venn wears a red tie and a
  // gold watch — the two men the player must spot in a crowd of suits.
  if (kind === 'guard') {
    const badge = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.12, 0.04),
      new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.3, metalness: 0.8 }),
    );
    badge.position.set(-0.14, 1.5, 0.18);
    group.add(badge);
  }
  if (kind === 'venn') {
    const tie = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.55, 0.04),
      new THREE.MeshStandardMaterial({ color: 0xd8382e, roughness: 0.7 }),
    );
    tie.position.set(0, 1.35, 0.18);
    group.add(tie);
    const watch = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.08, 0.1),
      new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.3, metalness: 0.8 }),
    );
    watch.position.set(0.36, 1.05, 0.3);
    group.add(watch);
  }
  group.position.set(x, 0, z);
  group.userData.isEnemyRoot = true;
  scene.add(group);
  return {
    mesh: group,
    x, z,
    variant: kind,
    health: kind === 'venn' ? 300 : kind === 'collector' ? 220 : kind === 'enforcer' ? 150 : kind === 'guard' ? 120 : 100,
    alive: true,
    fireTimer: rand(0.5, 1.5),
    duckTimer: 0,
    heading: 0,
  };
}

// Enemy AI: face the player, fire in bursts when in range and line of sight.
// Enforcers fire faster, the collector rarely misses up close.
export function updateEnemy(enemy, dt, playerX, playerZ, onEnemyShot) {
  if (!enemy.alive) return;
  // Ducking: a near miss makes the enemy crouch and hold fire for a bit.
  if (enemy.duckTimer > 0) {
    enemy.duckTimer -= dt;
    enemy.mesh.scale.y = 0.65;
    return { fired: false };
  }
  enemy.mesh.scale.y = 1;
  const d = dist2D(enemy.x, enemy.z, playerX, playerZ);
  enemy.heading = Math.atan2(playerX - enemy.x, playerZ - enemy.z);
  enemy.mesh.rotation.y = enemy.heading;
  enemy.fireTimer -= dt;
  if (d < 42 && enemy.fireTimer <= 0) {
    const reload = enemy.variant === 'enforcer' ? rand(0.6, 1.0)
      : enemy.variant === 'collector' ? rand(1.2, 1.8)
      : enemy.variant === 'guard' ? rand(0.8, 1.3)
      : enemy.variant === 'venn' ? rand(0.5, 0.9)
      : rand(0.9, 1.6);
    enemy.fireTimer = reload;
    // Hit chance falls off with distance; the player can dodge behind cover.
    // Guards are steady shots, Venn barely misses.
    const baseChance = enemy.variant === 'collector' ? 0.68
      : enemy.variant === 'venn' ? 0.72
      : enemy.variant === 'enforcer' ? 0.6
      : enemy.variant === 'guard' ? 0.58 : 0.55;
    const hitChance = clamp(baseChance - d * 0.008, 0.12, baseChance);
    if (Math.random() < hitChance && onEnemyShot) {
      const dmg = enemy.variant === 'collector' ? rand(8, 14)
        : enemy.variant === 'venn' ? rand(10, 16)
        : rand(5, 11);
      onEnemyShot(dmg);
    }
    return { fired: true, fromX: enemy.x, fromZ: enemy.z };
  }
  return { fired: false };
}

// Player shoots: a near-level ray from the camera centre. The shot is
// tested against each living enemy as a thick ray (a 1.1 m cylinder around
// the line), because the chase camera cannot be mouse-aimed and a
// hairline ray would never find a torso at street distance. The nearest
// enemy inside the cylinder takes the hit.
export function shootFromCamera(camera, enemies, scene, maxDist, barrels) {
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  ray.far = maxDist;
  // The chase camera looks down at the player, so the raw centre ray dives
  // into the ground a few metres out — and a fixed shallow slope has the
  // opposite fault: it stays above a close enemy's head and can never come
  // down to meet them. Aim the shot at torso height 18 m out instead:
  // the round now crosses the torso line from a few metres away out to
  // the far end of the street, and the crosshair still reads true.
  const origin = ray.ray.origin;
  const dir = ray.ray.direction;
  const fwd = new THREE.Vector3(dir.x, 0, dir.z);
  if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, 1);
  fwd.normalize();
  const aimDist = 18;
  const aim = new THREE.Vector3(
    origin.x + fwd.x * aimDist,
    1.25,
    origin.z + fwd.z * aimDist,
  );
  dir.copy(aim).sub(origin).normalize();
  let best = null;
  let bestAlong = maxDist;
  for (const e of enemies) {
    if (!e.alive) continue;
    // Closest approach of the ray to the enemy's torso centre.
    const cx = e.x - origin.x;
    const cy = 1.25 - origin.y;
    const cz = e.z - origin.z;
    const along = cx * dir.x + cy * dir.y + cz * dir.z;
    if (along < 0 || along > maxDist) continue;
    const px = origin.x + dir.x * along;
    const py = origin.y + dir.y * along;
    const pz = origin.z + dir.z * along;
    const miss = Math.sqrt((e.x - px) ** 2 + (1.25 - py) ** 2 + (e.z - pz) ** 2);
    // A round that whistles past makes the enemy duck for cover.
    if (miss < 4) e.duckTimer = Math.max(e.duckTimer || 0, 1.5);
    if (miss < 1.1 && along < bestAlong) {
      best = e;
      bestAlong = along;
    }
  }
  // Barrels count as targets too: a drum hit closer than any enemy
  // goes up instead, so the blast can do the work for you.
  const barrelHit = barrels ? rayHitBarrel(origin, dir, maxDist, barrels) : null;
  if (barrelHit) {
    const barrelAlong = Math.sqrt(
      (barrelHit.point.x - origin.x) ** 2 +
      (barrelHit.point.y - origin.y) ** 2 +
      (barrelHit.point.z - origin.z) ** 2,
    );
    if (!best || barrelAlong < bestAlong) {
      return { hit: 'barrel', barrel: barrelHit.barrel, point: barrelHit.point };
    }
  }
  if (!best) {
    const far = ray.ray.at(maxDist, new THREE.Vector3());
    return { hit: 'world', point: far };
  }
  const point = new THREE.Vector3(
    origin.x + dir.x * bestAlong,
    origin.y + dir.y * bestAlong,
    origin.z + dir.z * bestAlong,
  );
  best.health -= 34;
  if (best.health <= 0) {
    best.alive = false;
    best.mesh.rotation.x = -Math.PI / 2; // fall over
    best.mesh.position.y = 0.4;
  }
  return { hit: 'enemy', enemy: best, point, killed: !best.alive };
}

// Melee: a short-range swing that knocks a nearby enemy down a step.
export function punch(playerX, playerZ, playerHeading, enemies) {
  let best = null;
  let bestD = 2.4;
  for (const e of enemies) {
    if (!e.alive) continue;
    const d = dist2D(playerX, playerZ, e.x, e.z);
    if (d >= bestD) continue;
    const a = Math.atan2(e.x - playerX, e.z - playerZ);
    let diff = Math.abs(a - playerHeading);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    if (diff > 0.9) continue;
    best = e;
    bestD = d;
  }
  if (!best) return null;
  best.health -= 25;
  if (best.health <= 0) {
    best.alive = false;
    best.mesh.rotation.x = -Math.PI / 2;
    best.mesh.position.y = 0.4;
  }
  return { enemy: best, killed: !best.alive };
}

// Explosive barrels: red drums left around the warehouse and the harbor.
// A pistol round sets one off, and the blast hurts every enemy nearby —
// the smart way to clear a crew that outnumbers you.
export function makeBarrel(scene, x, z) {
  const group = new THREE.Group();
  const drum = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 0.85, 2.1, 12),
    new THREE.MeshStandardMaterial({ color: 0xc22e1e, roughness: 0.55, metalness: 0.35 }),
  );
  drum.position.y = 1.05;
  drum.castShadow = true;
  group.add(drum);
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(0.88, 0.88, 0.25, 12),
    new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.6, metalness: 0.3 }),
  );
  band.position.y = 1.5;
  group.add(band);
  group.position.set(x, 0, z);
  scene.add(group);
  return { mesh: group, x, z, alive: true };
}

// Blow a barrel up: hide the drum, hurt every living enemy in the blast.
export function detonateBarrel(barrel, scene, enemies) {
  if (!barrel.alive) return [];
  barrel.alive = false;
  scene.remove(barrel.mesh);
  const hit = [];
  for (const e of enemies) {
    if (!e.alive) continue;
    const d = dist2D(barrel.x, barrel.z, e.x, e.z);
    if (d < 9) {
      e.health -= 80;
      if (e.health <= 0) {
        e.alive = false;
        e.mesh.rotation.x = -Math.PI / 2;
        e.mesh.position.y = 0.4;
      }
      hit.push(e);
    }
  }
  return hit;
}

// Test a shot ray against the barrels too: returns the nearest barrel hit
// (or null) so the caller can detonate it instead of an enemy.
export function rayHitBarrel(origin, dir, maxDist, barrels) {
  let best = null;
  let bestAlong = maxDist;
  for (const b of barrels) {
    if (!b.alive) continue;
    const cx = b.x - origin.x;
    const cy = 1.1 - origin.y;
    const cz = b.z - origin.z;
    const along = cx * dir.x + cy * dir.y + cz * dir.z;
    if (along < 0 || along > maxDist) continue;
    const px = origin.x + dir.x * along;
    const py = origin.y + dir.y * along;
    const pz = origin.z + dir.z * along;
    const miss = Math.sqrt((b.x - px) ** 2 + (1.1 - py) ** 2 + (b.z - pz) ** 2);
    if (miss < 1.2 && along < bestAlong) {
      best = b;
      bestAlong = along;
    }
  }
  if (!best) return null;
  return {
    barrel: best,
    point: new THREE.Vector3(
      origin.x + dir.x * bestAlong,
      origin.y + dir.y * bestAlong,
      origin.z + dir.z * bestAlong,
    ),
  };
}

// A tracer line that fades out — the visible part of a gunshot.
export function makeTracer(scene, from, to) {
  const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
    color: 0xffe9a0, transparent: true, opacity: 0.95,
  }));
  scene.add(line);
  return { line, life: 0.12 };
}

export function updateTracer(tracer, dt) {
  tracer.life -= dt;
  tracer.line.material.opacity = Math.max(0, tracer.life / 0.12) * 0.95;
  return tracer.life > 0;
}

// A first-aid kit on the street: +40 health, then it takes 45 seconds
// for the clinic to restock it.
export function makeHealthPack(scene, x, z) {
  const group = new THREE.Group();
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.9, 0.9),
    new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.6 }),
  );
  box.position.y = 0.45;
  box.castShadow = true;
  group.add(box);
  const crossV = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.18, 0.92),
    new THREE.MeshStandardMaterial({ color: 0xd8382e, roughness: 0.6 }),
  );
  crossV.position.y = 0.5;
  group.add(crossV);
  const crossH = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.5, 0.92),
    new THREE.MeshStandardMaterial({ color: 0xd8382e, roughness: 0.6 }),
  );
  crossH.position.y = 0.5;
  group.add(crossH);
  group.position.set(x, 0, z);
  scene.add(group);
  return { mesh: group, x, z, taken: false, respawn: 0 };
}
