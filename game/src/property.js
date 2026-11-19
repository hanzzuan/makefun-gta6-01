// property.js — property ownership in Solmar.
// Mission cash buys more than paint: Mara can buy her own places. A
// bought property is a home base — walk up to it and it heals her to
// full, and every ninety seconds each property pays a little rent. The
// three properties are the Marina Loft over the pier, the Harbour
// Penthouse above the cannery offices, and the Stadium Suite at the
// east stand. Press B near a property sign to buy or visit.

import * as THREE from 'three';

// The three buyable properties. Prices are mission-cash prices: the
// loft is a first purchase, the suite is an endgame one. The list grew
// past three — the villa and the casino suite joined in the south and
// east updates — so the status line counts PROPERTIES.length, not a
// hard-coded three.
export const PROPERTIES = [
  {
    id: 'marina-loft',
    name: 'Marina Loft',
    price: 8000,
    x: -238, z: 175,
    blurb: 'A loft over the marina pier — the sunset comes through the windows.',
  },
  {
    id: 'mural-loft',
    name: 'Mural Row Loft',
    price: 12000,
    x: -100, z: -60,
    blurb: 'A loft over Mural Row — paint on the walls, the smell of spray in the hall, and the art crowd below.',
  },
  {
    id: 'neon-loft',
    name: 'Neon Loft',
    price: 20000,
    x: -70, z: -90,
    blurb: 'A loft above Club Neon — the bass comes through the floor and the neon comes through the windows.',
  },
  {
    id: 'harbor-cottage',
    name: 'Harbor Cottage',
    price: 18000,
    x: 210, z: -210,
    blurb: 'A cottage on the harbor wall — gulls on the roof, cranes on the skyline, and the cannery whistle at dawn.',
  },
  {
    id: 'harbor-penthouse',
    name: 'Harbour Penthouse',
    price: 15000,
    x: 210, z: -190,
    blurb: 'The top floor above the cannery offices, with the whole harbor below.',
  },
  {
    id: 'stadium-suite',
    name: 'Stadium Suite',
    price: 25000,
    x: 320, z: -70,
    blurb: 'A private suite in the east stand — match day, every day.',
  },
  {
    id: 'casino-suite',
    name: 'Casino Suite',
    price: 40000,
    x: -128, z: 224,
    blurb: 'The high roller suite above the casino — the house pays you rent now.',
  },
  {
    id: 'resort-villa',
    name: 'Resort Villa',
    price: 60000,
    x: -140, z: 210,
    blurb: 'A private villa behind the resort pool — the whole south side is yours.',
  },
  {
    id: 'club-penthouse',
    name: 'Club Penthouse',
    price: 45000,
    x: -70, z: -84,
    blurb: 'A penthouse above Club Neon — the city lights, the bass, the whole downtown below.',
  },
  {
    id: 'lighthouse-cottage',
    name: 'Lighthouse Cottage',
    price: 30000,
    x: -296, z: -196,
    blurb: 'A cottage on the dockside road — the lamp sweeps past the windows all night.',
  },
  {
    id: 'airport-hangar',
    name: 'Airport Hangar',
    price: 35000,
    x: 140, z: 215,
    blurb: 'A hangar by the runway — park the Comet GT next to the jets.',
  },
  {
    id: 'campus-dorm',
    name: 'Campus Dorm',
    price: 20000,
    x: 320, z: 140,
    blurb: 'A dorm room on the quad — cheap, loud, and full of students who owe you favors.',
  },
  {
    id: 'bounty-office',
    name: 'Bounty Office',
    price: 30000,
    x: -40, z: -40,
    blurb: 'A back-alley office with a wanted board on the wall — the fugitives come to you, eventually.',
  },
  {
    id: 'film-studio',
    name: 'Film Studio',
    price: 70000,
    x: -285, z: 90,
    blurb: 'The backlot studio on the beach — the ramps are yours, the cameras are yours, and the stunt crew answers to you.',
  },
  {
    id: 'stunt-garage',
    name: 'Stunt Garage',
    price: 55000,
    x: 155, z: -125,
    blurb: 'A second garage by Venn\u2019s, built for the jump cars — reinforced frames, spare ramps, and a lift that never complains.',
  },
  {
    id: 'sunset-penthouse',
    name: 'Sunset Penthouse',
    price: 90000,
    x: -252, z: 40,
    blurb: 'A penthouse above the boardwalk — the whole bay through the glass, and the sunset every single night.',
  },
];

export const RENT_PER_PROPERTY = 150;
export const RENT_COOLDOWN = 90; // seconds between rent collections

// The film studio pays its owner in air: owning the backlot studio
// lifts every stunt reward by a quarter — the crew works for its own
// boss, and the cameras are already rolling.
export function propertyStuntMult(state) {
  if (!state || !state.owned) return 1;
  return state.owned.includes('film-studio') ? 1.25 : 1;
}

export function makePropertyState() {
  return {
    owned: [], // property ids Mara owns
    spent: 0,
    rentAt: 0, // game time of the last rent collection
    visits: 0,
  };
}

export function propertyFromSave(saved) {
  const state = makePropertyState();
  if (!saved || typeof saved !== 'object') return state;
  if (Array.isArray(saved.owned)) {
    for (const id of saved.owned) {
      if (PROPERTIES.some((p) => p.id === id) && !state.owned.includes(id)) {
        state.owned.push(id);
      }
    }
  }
  state.spent = Math.max(0, Number(saved.spent) || 0);
  state.rentAt = Math.max(0, Number(saved.rentAt) || 0);
  state.visits = Math.max(0, Number(saved.visits) || 0);
  return state;
}

export function propertyById(id) {
  return PROPERTIES.find((p) => p.id === id) || null;
}

export function ownsProperty(state, id) {
  return state.owned.includes(id);
}

// The nearest property sign within 12 metres, or null. Owned and
// unowned both count: B near an owned one visits it (heal + rent),
// B near an unowned one opens the purchase panel.
export function propertyNear(x, z, state) {
  let best = null;
  let bestD = 12 * 12;
  for (const p of PROPERTIES) {
    const dx = x - p.x;
    const dz = z - p.z;
    const d = dx * dx + dz * dz;
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}

// Buy a property. Returns { ok, cost } or { ok: false, reason }.
export function buyProperty(state, id, money) {
  const prop = propertyById(id);
  if (!prop) return { ok: false, reason: 'unknown' };
  if (state.owned.includes(id)) return { ok: false, reason: 'owned' };
  if (money < prop.price) return { ok: false, reason: 'broke' };
  state.owned.push(id);
  state.spent += prop.price;
  return { ok: true, cost: prop.price };
}

// Rent: every owned property pays RENT_PER_PROPERTY once the cooldown
// since the last collection has passed. Returns the amount collected.
export function collectRent(state, now) {
  if (state.owned.length === 0) return 0;
  if (now - state.rentAt < RENT_COOLDOWN) return 0;
  state.rentAt = now;
  return state.owned.length * RENT_PER_PROPERTY;
}

// Visiting a property Mara owns heals her to full — home is where the
// first-aid kit lives. Returns true when a visit happened.
export function visitProperty(state) {
  state.visits += 1;
  return true;
}

// The purchase panel: every property with its price, whether Mara owns
// it, and whether she can afford it right now.
export function propertyMenuItems(state, money) {
  return PROPERTIES.map((p) => ({
    id: p.id,
    kind: 'property',
    label: `${p.name} — ${p.blurb}`,
    cost: state.owned.includes(p.id) ? 0 : p.price,
    owned: state.owned.includes(p.id),
    afford: state.owned.includes(p.id) || money >= p.price,
  }));
}

export function propertySummary(state) {
  if (state.owned.length === 0) {
    return 'No property yet — buy a place of your own and it heals you when you visit, and pays rent every 90 seconds.';
  }
  const names = state.owned.map((id) => propertyById(id).name).join(', ');
  return `Owned: ${names} · rent $${state.owned.length * RENT_PER_PROPERTY} per 90s · Spent $${state.spent.toLocaleString()} · ${state.visits} visits.`;
}

// A one-line readout for the pause screen and the free-roam objective.
export function propertyStatusLine(state) {
  if (state.owned.length === 0) return 'No property — press B near a property sign to buy one.';
  return `${state.owned.length}/${PROPERTIES.length} properties owned · rent $${state.owned.length * RENT_PER_PROPERTY}/90s`;
}

// Property signs in the world: a post with a gold panel at each
// property's door, so the player can find them without a map.
export function buildPropertySigns(scene) {
  const signs = [];
  for (const p of PROPERTIES) {
    const group = new THREE.Group();
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 3.4, 6),
      new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.6, metalness: 0.5 }),
    );
    post.position.y = 1.7;
    group.add(post);
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 1.6, 0.18),
      new THREE.MeshStandardMaterial({ color: 0xffd23e, roughness: 0.5, metalness: 0.2 }),
    );
    panel.position.y = 3.6;
    panel.castShadow = true;
    group.add(panel);
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.3, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xd8382e, roughness: 0.6 }),
    );
    stripe.position.y = 3.0;
    group.add(stripe);
    group.position.set(p.x, 0, p.z);
    scene.add(group);
    signs.push({ mesh: group, panel, property: p });
  }
  return signs;
}

// The sign panel turns green once Mara owns the place, so a bought
// property reads as hers from across the street.
export function updatePropertySigns(signs, state) {
  for (const sign of signs) {
    const owned = state.owned.includes(sign.property.id);
    sign.panel.material.color.setHex(owned ? 0x38b24a : 0xffd23e);
  }
}
