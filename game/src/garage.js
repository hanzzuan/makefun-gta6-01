// garage.js — Leo's garage: vehicle customization at Venn's Garage.
// Mara's personal ride — a Comet GT parked at the safehouse — can be
// repainted and tuned here. Upgrades cost mission cash and persist in
// the save: paint is cosmetic, engine raises top speed, armour shrugs
// off a share of every hit. The menu opens on foot near the garage
// (press G) and closes with Escape or by walking away.

import * as THREE from 'three';
import { PLACES } from './city.js';

export const GARAGE_PAINTS = [
  { name: 'Sunset Red', hex: 0xd8382e },
  { name: 'Midnight Blue', hex: 0x1e3a6e },
  { name: 'Acid Lime', hex: 0xa8d81a },
  { name: 'Gold Rush', hex: 0xf2c230 },
  { name: 'Pearl White', hex: 0xe8e4da },
  { name: 'Shadow Black', hex: 0x1a1a1e },
  { name: 'Miami Pink', hex: 0xe86ba8 },
  { name: 'Harbour Teal', hex: 0x1a8a7a },
  { name: 'Campus Green', hex: 0x3f8a4a },
  { name: 'Ocean Spray', hex: 0x3cc8c0 },
  { name: 'Crew Blue', hex: 0x2e8bff },
  { name: 'Neon Pink', hex: 0xff2e88 },
  { name: 'Sunset Gold', hex: 0xd8a920 },
  { name: 'Spray Gold', hex: 0xffc300 }, // the gold spray-can paint — the colour of a finished wall
  { name: 'Comet Silver', hex: 0xc8c8d0 },
  { name: 'Bay Blue', hex: 0x2e6ab0 },
];

export const GARAGE_ENGINE_LEVELS = [
  { level: 0, name: 'Stock', cost: 0, topSpeedBonus: 0 },
  { level: 1, name: 'Street Tune', cost: 800, topSpeedBonus: 4 },
  { level: 2, name: 'Race Cams', cost: 1500, topSpeedBonus: 9 },
  { level: 3, name: 'Turbo Kit', cost: 2400, topSpeedBonus: 15 },
];

export const GARAGE_ARMOUR_LEVELS = [
  { level: 0, name: 'Stock Panels', cost: 0, reduction: 0 },
  { level: 1, name: 'Reinforced Doors', cost: 600, reduction: 0.15 },
  { level: 2, name: 'Plated Hull', cost: 1200, reduction: 0.3 },
  { level: 3, name: 'Armoured Shell', cost: 2000, reduction: 0.5 },
];

export const PAINT_COST = 350;

// Nitro: a one-shot bottle of speed for the Comet GT. One purchase,
// always on, +8 top speed on top of the engine tuning. It costs
// mission cash and it is the fastest way to make the Comet outrun a
// police interceptor — or a rival's coupe.
export const NITRO_COST = 1800;
export const NITRO_TOP_SPEED_BONUS = 8;

export function makeGarageState() {
  return { paint: 0xd8382e, engine: 0, armour: 0, spent: 0, nitro: 0 };
}

// The wanted board on the garage wall, beside the showroom sign: a
// dark board with a yellow WANTED bar and three red seals, one per
// name on the board. The seals light up while a hunt is running and
// dim when the board is empty, so the street can read the work at a
// glance. Built once at boot, updated by the loop.
export function buildBountyBoard(scene) {
  const group = new THREE.Group();
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(4, 2.6, 0.25),
    new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 0.85 }),
  );
  group.add(board);
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(4, 0.5, 0.3),
    new THREE.MeshBasicMaterial({ color: 0xffd23e }),
  );
  bar.position.set(0, 1.05, 0.02);
  group.add(bar);
  const seals = [];
  for (let i = 0; i < 3; i++) {
    const seal = new THREE.Mesh(
      new THREE.CircleGeometry(0.32, 12),
      new THREE.MeshBasicMaterial({ color: 0x5a1a1a }),
    );
    seal.position.set(-1.1 + i * 1.1, 0.1, 0.16);
    group.add(seal);
    seals.push(seal);
  }
  group.position.set(148, 3.2, -132.5);
  scene.add(group);
  return { group, seals };
}

export function updateBountyBoard(board, state) {
  if (!board) return;
  board.seals.forEach((seal, i) => {
    const lit = state.active ? i === 0 : i < state.offered.length;
    seal.material.color.setHex(lit ? 0xd8382e : 0x5a1a1a);
  });
  // While a hunt runs, the first seal burns with the clock: Vex is
  // driving, and the board knows it — the seal flashes faster as the
  // four minutes run down, so the garage itself keeps time.
  if (board.seals[0] && state.active) {
    const frac = Math.max(0, state.active.timer / 240);
    const flash = Math.sin(Date.now() / (120 + 480 * frac)) > 0;
    board.seals[0].material.color.setHex(flash ? 0xff5a3c : 0x8a1a1a);
  }
}

export function garageFromSave(saved) {
  const g = makeGarageState();
  if (!saved || typeof saved !== 'object') return g;
  const paint = Number(saved.paint);
  if (Number.isFinite(paint)) g.paint = paint;
  g.engine = Math.max(0, Math.min(3, Number(saved.engine) || 0));
  g.armour = Math.max(0, Math.min(3, Number(saved.armour) || 0));
  g.spent = Math.max(0, Number(saved.spent) || 0);
  g.nitro = Math.max(0, Math.min(1, Number(saved.nitro) || 0));
  return g;
}

// A garage entry: the garage place is where Leo works, next to the
// warehouse job from the first mission. Close enough to walk to.
export function garageNear(x, z) {
  const g = PLACES.garage;
  if (!g) return false;
  const dx = x - g.x;
  const dz = z - g.z;
  return dx * dx + dz * dz < 14 * 14;
}

// Paint a car mesh in place: the body is the first box of the car
// group, so recolour its material and every body-coloured panel.
export function applyPaint(carMesh, hex) {
  if (!carMesh) return;
  carMesh.traverse((child) => {
    if (!child.isMesh) return;
    const mat = child.material;
    if (!mat || !mat.userData) return;
    if (mat.userData.bodyPaint) {
      mat.color.setHex(hex);
    }
  });
  // Cars built before paint marking still get a body recolour: the
  // first child of the group is always the body box.
  const body = carMesh.children && carMesh.children[0];
  if (body && body.isMesh && body.material && body.material.color) {
    body.material.color.setHex(hex);
  }
}

// Engine tuning: each level adds top speed and a little acceleration.
export function engineBonus(engineLevel) {
  const level = GARAGE_ENGINE_LEVELS[Math.max(0, Math.min(3, engineLevel | 0))];
  return level ? level.topSpeedBonus : 0;
}

export function armourReduction(armourLevel) {
  const level = GARAGE_ARMOUR_LEVELS[Math.max(0, Math.min(3, armourLevel | 0))];
  return level ? level.reduction : 0;
}

// Apply the saved garage state to the car Mara is driving. Called when
// she enters her personal ride; traffic cars are never tuned. Engine
// tuning raises maxSpeed (the value the driving physics reads), armour
// is read by the damage path when she is hit inside the car.
export function applyGarageUpgrades(car, garage) {
  if (!car || !garage) return;
  applyPaint(car.mesh, garage.paint);
  car.maxSpeed = (car.baseTopSpeed || car.maxSpeed) + engineBonus(garage.engine) + (garage.nitro ? NITRO_TOP_SPEED_BONUS : 0);
  car.armour = armourReduction(garage.armour);
}

// What the next upgrade of a kind costs; null once maxed out.
export function nextUpgradeCost(kind, garage) {
  if (kind === 'engine') {
    const next = GARAGE_ENGINE_LEVELS[garage.engine + 1];
    return next ? next.cost : null;
  }
  if (kind === 'armour') {
    const next = GARAGE_ARMOUR_LEVELS[garage.armour + 1];
    return next ? next.cost : null;
  }
  if (kind === 'nitro') {
    return garage.nitro ? null : NITRO_COST;
  }
  return null;
}

// Buy one upgrade. Returns { ok, cost } on success or { ok: false,
// reason } when the player cannot afford it or is already maxed out.
export function buyUpgrade(garage, kind, money) {
  const cost = nextUpgradeCost(kind, garage);
  if (cost === null) return { ok: false, reason: 'maxed' };
  if (money < cost) return { ok: false, reason: 'broke' };
  if (kind === 'engine') garage.engine += 1;
  if (kind === 'armour') garage.armour += 1;
  if (kind === 'nitro') garage.nitro = 1;
  garage.spent += cost;
  return { ok: true, cost };
}

export function buyPaint(garage, hex, money) {
  if (garage.paint === hex) return { ok: false, reason: 'same' };
  if (money < PAINT_COST) return { ok: false, reason: 'broke' };
  garage.paint = hex;
  garage.spent += PAINT_COST;
  return { ok: true, cost: PAINT_COST };
}

export function paintName(hex) {
  const paint = GARAGE_PAINTS.find((p) => p.hex === hex);
  return paint ? paint.name : 'Custom';
}

// The menu the HUD draws: every option with its price, whether it is
// owned, and whether the player can afford it right now.
export function garageMenuItems(garage, money) {
  const items = [];
  for (const paint of GARAGE_PAINTS) {
    items.push({
      id: `paint:${paint.hex}`,
      kind: 'paint',
      label: `Paint — ${paint.name}`,
      cost: paint.hex === garage.paint ? 0 : PAINT_COST,
      owned: paint.hex === garage.paint,
      afford: money >= PAINT_COST || paint.hex === garage.paint,
    });
  }
  const engineCost = nextUpgradeCost('engine', garage);
  items.push({
    id: 'engine',
    kind: 'engine',
    label: engineCost === null
      ? 'Engine — Turbo Kit (max)'
      : `Engine — ${GARAGE_ENGINE_LEVELS[garage.engine + 1].name}`,
    cost: engineCost === null ? 0 : engineCost,
    owned: engineCost === null,
    afford: engineCost !== null && money >= engineCost,
  });
  const armourCost = nextUpgradeCost('armour', garage);
  items.push({
    id: 'armour',
    kind: 'armour',
    label: armourCost === null
      ? 'Armour — Armoured Shell (max)'
      : `Armour — ${GARAGE_ARMOUR_LEVELS[garage.armour + 1].name}`,
    cost: armourCost === null ? 0 : armourCost,
    owned: armourCost === null,
    afford: armourCost !== null && money >= armourCost,
  });
  const nitroCost = nextUpgradeCost('nitro', garage);
  items.push({
    id: 'nitro',
    kind: 'nitro',
    label: nitroCost === null
      ? 'Nitro — fitted (+8 top speed)'
      : `Nitro — +${NITRO_TOP_SPEED_BONUS} top speed, always on`,
    cost: nitroCost === null ? 0 : nitroCost,
    owned: nitroCost === null,
    afford: nitroCost !== null && money >= nitroCost,
  });
  return items;
}

export function garageSummary(garage) {
  const engine = GARAGE_ENGINE_LEVELS[garage.engine];
  const armour = GARAGE_ARMOUR_LEVELS[garage.armour];
  const nitro = garage.nitro ? ' · Nitro fitted' : '';
  return `Paint ${paintName(garage.paint)} · Engine ${engine.name} · Armour ${armour.name}${nitro} · Spent $${garage.spent.toLocaleString()}`;
}

// What the next upgrade of each kind would do, in plain words, so the
// player can weigh the price against the gain before buying.
export function garageUpgradeSummary(garage) {
  const engineCost = nextUpgradeCost('engine', garage);
  const armourCost = nextUpgradeCost('armour', garage);
  const engineText = engineCost === null
    ? 'Engine maxed — Turbo Kit fitted.'
    : `Next engine: ${GARAGE_ENGINE_LEVELS[garage.engine + 1].name} (+${GARAGE_ENGINE_LEVELS[garage.engine + 1].topSpeedBonus} top speed) for $${engineCost}.`;
  const armourText = armourCost === null
    ? 'Armour maxed — Armoured Shell fitted.'
    : `Next armour: ${GARAGE_ARMOUR_LEVELS[garage.armour + 1].name} (${Math.round(GARAGE_ARMOUR_LEVELS[garage.armour + 1].reduction * 100)}% less damage) for $${armourCost}.`;
  return engineText + ' ' + armourText;
}
