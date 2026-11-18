// garage.js — Leo's garage: vehicle customization at Venn's Garage.
// Mara's personal ride — a Comet GT parked at the safehouse — can be
// repainted and tuned here. Upgrades cost mission cash and persist in
// the save: paint is cosmetic, engine raises top speed, armour shrugs
// off a share of every hit. The menu opens on foot near the garage
// (press G) and closes with Escape or by walking away.

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

export function makeGarageState() {
  return { paint: 0xd8382e, engine: 0, armour: 0, spent: 0 };
}

export function garageFromSave(saved) {
  const g = makeGarageState();
  if (!saved || typeof saved !== 'object') return g;
  const paint = Number(saved.paint);
  if (Number.isFinite(paint)) g.paint = paint;
  g.engine = Math.max(0, Math.min(3, Number(saved.engine) || 0));
  g.armour = Math.max(0, Math.min(3, Number(saved.armour) || 0));
  g.spent = Math.max(0, Number(saved.spent) || 0);
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
  car.maxSpeed = (car.baseTopSpeed || car.maxSpeed) + engineBonus(garage.engine);
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
  return items;
}

export function garageSummary(garage) {
  const engine = GARAGE_ENGINE_LEVELS[garage.engine];
  const armour = GARAGE_ARMOUR_LEVELS[garage.armour];
  return `Paint ${paintName(garage.paint)} · Engine ${engine.name} · Armour ${armour.name} · Spent $${garage.spent.toLocaleString()}`;
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
