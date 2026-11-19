// collectors.js — the rare-car collection: six one-of-a-kind cars hidden
// around Solmar. Steal one, drive it to Venn's Garage, and Leo logs it
// in the showroom book. Each car pays a finder's bonus; all six pay the
// full-set jackpot and gild Mara's Comet GT gold. A collected car is
// gone from the streets for good — the showroom keeps the keys.

import * as THREE from 'three';
import { makeCar, applyRareBonus } from './cars.js';
import { garageNear } from './garage.js';

// The six rares: one of each, parked where their owners left them. The
// spot names are what the showroom board shows Mara while she hunts.
export const RARE_CARS = [
  { id: 'vintage-roadster', name: 'Vintage Roadster', kind: 'coupe', color: 0x8a5a3c, x: 296, z: 96, heading: Math.PI / 2, spot: 'Solmar Mall car park', bonus: 4000 },
  { id: 'rally-fox', name: 'Rally Fox', kind: 'coupe', color: 0x2e7a4a, x: 296, z: -46, heading: -Math.PI / 2, spot: 'Solmar Stadium west lot', bonus: 5000 },
  { id: 'gold-coupe', name: 'Gold Coupe', kind: 'coupe', color: 0xd8a920, x: -104, z: 244, heading: Math.PI, spot: 'Solmar Casino forecourt', bonus: 6000 },
  { id: 'pd-interceptor', name: 'PD Interceptor', kind: 'police', color: undefined, x: 186, z: -186, heading: 0, spot: 'North Harbor impound row', bonus: 5000 },
  { id: 'beach-buggy', name: 'Beach Buggy', kind: 'pickup', color: 0x2e8a8a, x: -168, z: 188, heading: Math.PI / 2, spot: 'Palmera Resort beach road', bonus: 3500 },
  { id: 'midnight-limo', name: 'Midnight Limo', kind: 'limo', color: 0x14141a, x: 40, z: -40, heading: Math.PI, spot: 'Downtown, off the plaza', bonus: 7500 },
];

// The full-set jackpot: every rare in the showroom, and Leo gilds the
// Comet GT — the gold paint is the city's way of knowing Mara won.
export const COLLECTORS_SET_BONUS = 25000;
export const COLLECTORS_GOLD_PAINT = 0xd8a920;

// The showroom board: one line per rare, so the pause screen and the
// garage board can both say how the hunt is going.
export function makeCollectorsState() {
  return { collected: [], found: [], setPaid: false, earned: 0 };
}

export function collectorsFromSave(saved) {
  const state = makeCollectorsState();
  if (!saved || typeof saved !== 'object') return state;
  if (Array.isArray(saved.collected)) {
    for (const id of saved.collected) {
      if (RARE_CARS.some((c) => c.id === id) && !state.collected.includes(id)) {
        state.collected.push(id);
      }
    }
  }
  if (Array.isArray(saved.found)) {
    for (const id of saved.found) {
      if (RARE_CARS.some((c) => c.id === id) && !state.found.includes(id)) {
        state.found.push(id);
      }
    }
  }
  state.setPaid = saved.setPaid === true;
  state.earned = Number.isFinite(saved.earned) ? Math.max(0, Math.floor(saved.earned)) : 0;
  return state;
}

export function rareCarById(id) {
  return RARE_CARS.find((c) => c.id === id) || null;
}

export function collectorsRemaining(state) {
  return RARE_CARS.filter((c) => !state.collected.includes(c.id));
}

export function collectorsComplete(state) {
  return state.collected.length >= RARE_CARS.length;
}

// The gold paint is earned, not bought: only a full showroom gilds the
// Comet GT. The garage menu asks this before it offers the paint.
export function collectorsGoldPaint(state) {
  return collectorsComplete(state);
}

// Park every rare Mara has not collected yet, as a stealable car on the
// street. A rare is just a parked car with a rareId and a name the
// steal hint can show — the loop treats it like any other car until
// Mara drives it home.
export function spawnRareCars(scene, traffic, state) {
  const spawned = [];
  for (const rare of RARE_CARS) {
    if (state.collected.includes(rare.id)) continue;
    const car = makeCar(rare.kind, rare.x, rare.z, rare.heading, rare.color);
    applyRareBonus(car);
    car.name = rare.name;
    car.rareId = rare.id;
    car.targetSpeed = 0;
    scene.add(car.mesh);
    traffic.push(car);
    spawned.push(car);
  }
  return spawned;
}

// Spotting a rare: the first time Mara climbs into one, the board marks
// it found and the hunt for that car starts in earnest.
export function markRareFound(state, id) {
  if (!state.found.includes(id)) {
    state.found.push(id);
    return true;
  }
  return false;
}

// Handing a rare to Leo: the bonus pays, Rook negotiates 10% on top
// when he is hired, and the full set pays the jackpot once, ever.
export function collectRareCar(state, id, rookHired) {
  const rare = rareCarById(id);
  if (!rare || state.collected.includes(id)) return null;
  state.collected.push(id);
  let bonus = rare.bonus;
  if (rookHired) bonus = Math.round(bonus * 1.1);
  let setBonus = 0;
  if (collectorsComplete(state) && !state.setPaid) {
    state.setPaid = true;
    setBonus = COLLECTORS_SET_BONUS;
  }
  const total = bonus + setBonus;
  state.earned += total;
  return { car: rare, bonus, setBonus, total, complete: collectorsComplete(state) };
}

// One frame of the hunt. Returns an event when something happens, or
// null while Mara is just driving around: a rare is found the moment
// she climbs in, and collected the moment she parks it at the garage.
export function updateCollectors(state, playerCar, x, z, rookHired) {
  if (!playerCar || !playerCar.rareId) return null;
  const id = playerCar.rareId;
  if (state.collected.includes(id)) return null;
  if (!state.found.includes(id)) {
    markRareFound(state, id);
    const rare = rareCarById(id);
    return { type: 'found', car: rare };
  }
  if (garageNear(x, z)) {
    const done = collectRareCar(state, id, rookHired);
    if (!done) return null;
    return { type: 'collected', car: done.car, bonus: done.bonus, setBonus: done.setBonus, total: done.total, complete: done.complete, drivenCar: playerCar };
  }
  return null;
}

// The showroom board: every rare, its spot, and whether Mara has
// spotted it, brought it home, or never seen it at all.
export function collectorsMenuItems(state) {
  return RARE_CARS.map((rare) => {
    const owned = state.collected.includes(rare.id);
    const seen = state.found.includes(rare.id);
    return {
      id: 'rare-' + rare.id,
      label: rare.name + ' — ' + rare.spot,
      owned,
      afford: false,
      cost: 0,
      state: owned ? 'IN THE SHOWROOM' : seen ? 'SPOTTED — drive it to the garage' : 'NOT SPOTTED YET',
      bonus: rare.bonus,
    };
  });
}

export function collectorsSummary(state) {
  const n = state.collected.length;
  if (n >= RARE_CARS.length) {
    return 'All six rares are home. The Comet GT is gold, the showroom is full, and Solmar knows who owns the streets — the bounty board at the garage is the next hunt.';
  }
  return n + ' of 6 rares in the showroom — $' + state.earned.toLocaleString() + ' earned from the hunt. The rest are still parked out there, waiting to be stolen.';
}

export function collectorsStatusLine(state) {
  return 'Rare cars: ' + state.collected.length + ' / ' + RARE_CARS.length + ' in the showroom · $' + state.earned.toLocaleString() + ' earned';
}

export function collectorsFoundLine(state) {
  const next = collectorsRemaining(state)[0];
  if (!next) return 'Showroom complete — every rare is home.';
  return 'Showroom ' + state.collected.length + '/6 · next: ' + next.name + ' (' + next.spot + ')';
}

// The showroom sign: a gold board over the garage door with one bulb
// per rare — it lights up as the collection grows, so the garage
// itself tells the story of the hunt.
export function buildShowroomSign(scene) {
  const group = new THREE.Group();
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(7, 1.6, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.5 }),
  );
  board.position.set(0, 0, 0);
  group.add(board);
  const bulbs = [];
  for (let i = 0; i < RARE_CARS.length; i++) {
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x332211 }),
    );
    bulb.position.set(-2.5 + i * 1, 0, 0.2);
    group.add(bulb);
    bulbs.push(bulb);
  }
  group.position.set(140, 7.5, -132.5);
  scene.add(group);
  return { group, bulbs };
}

export function updateShowroomSign(sign, state) {
  if (!sign) return;
  sign.bulbs.forEach((bulb, i) => {
    const lit = state.collected.length > i;
    bulb.material.color.setHex(lit ? 0xffd23e : 0x332211);
  });
}

// A rare-car rival taunt for the pause screen: Rocco's old crew does
// not like watching their cars end up in Mara's showroom.
export function collectorsTaunt(state) {
  if (state.collected.length === 0) return 'Six rares out there. Leo will pay for every one.';
  if (state.collected.length >= RARE_CARS.length) return 'Every rare is home. The streets have nothing left to hide.';
  return state.collected.length + ' of 6 rares home — the crew is watching the rest.';
}

// A rumor about the next rare car still out there — the spotters on
// the plaza and the marina trade them, and Leo repeats the good ones.
// The area comes from the car's hiding spot, not a written hint.
function rareCarArea(car) {
  if (car.x < -250) return 'the north harbor';
  if (car.x > 250) return 'the east side';
  if (car.z > 200) return 'the south side';
  if (car.z < -150) return 'the docks';
  return 'downtown';
}
export function rareCarRumor(state) {
  const missing = RARE_CARS.filter((c) => !state.collected.includes(c.id));
  if (missing.length === 0) return 'Every rare car is in the showroom. The hunt is done — the Mural Row walls are next.';
  const car = missing[Math.floor(Math.random() * missing.length)];
  // Once in five, the word is from the film lot: the stunt crew parks
  // its vans by the ramps, and the rares roll past on the beach road.
  if (Math.random() < 0.2) return 'Word is the ' + car.name + ' was seen near the film lot ramps — the stunt crew parks there.';
  // Once in eight, the word is from the stunt show: the crowd saw the
  // rare roll past the lot while the ramps were out.
  if (Math.random() < 0.125) return 'Word is the ' + car.name + ' was seen at the film lot stunt show — the crowd watched it roll past the ramps.';
  return 'Word is the ' + car.name + ' was seen near ' + rareCarArea(car) + '.';
}

// The showroom as a bar: six slots, gold for found, dim for missing.
export function collectorsProgressBar(state) {
  return RARE_CARS.map((c) => (state.collected.includes(c.id) ? '●' : '○')).join(' ');
}
