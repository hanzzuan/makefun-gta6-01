// graffiti.js — Solmar's street-art scene, GTA-style.
// Twelve spray spots hide around the city, one per corner: the mural
// row downtown, the mall food court, the stadium gate, the campus
// library, the harbor containers, the cannery wall, the resort pool
// house, the airport fence, Neon Alley, the back alley, the boardwalk
// and the dockside pier. Walk up to a wall, press I, and spray: a
// needle sweeps back and forth and E lays a coat — land it near the
// middle for a perfect coat, three coats finish a piece. Every piece
// pays $500 on the spot and raises Mara's street rep; the full set
// pays $5,000 more and unlocks the gold spray-can paint for the Comet
// GT. Spraying under a cop's nose is vandalism — the PD notices.
//
// The pause menu shows the gallery: every piece, its hint, and which
// ones are already dry. The walls themselves change colour as pieces
// land, so the city visibly fills up with Mara's work.

import * as THREE from 'three';
import { dist2D, nearestBy, sprayOff } from './util.js';

// One finished piece pays $500; the full set pays $5,000 on top and
// unlocks the gold spray-can paint. Rep runs 0..5, one point per two
// finished pieces — the street only respects a wall it has seen twice.
export const GRAFFITI_REWARD = 500;
export const GRAFFITI_SET_BONUS = 5000;
export const GRAFFITI_GOLD_PAINT = 0xffc300;

// Twelve walls, one per corner of Solmar. The hints are honest —
// every wall is a real place Mara can walk to, and the spray can
// only works on foot, up close, where the PD can see her.
export const SPRAY_SPOTS = [
  { id: 'mural-row', name: 'Mural Row', x: -100, z: -40, hint: 'The long wall on Mural Row downtown, behind the food carts.', colors: [0xff5c8a, 0xffd23e, 0x37d67a], blurb: 'Pink dawn over the row — the first wall every tagger learns.' },
  { id: 'plaza-fountain', name: 'Fountain Wall', x: 14, z: -28, hint: 'The low wall by the plaza fountain, where the coins land.', colors: [0x4a8cff, 0xffd23e, 0xff5c8a], blurb: 'Blue water, gold coins — the plaza in three cans.' },
  { id: 'mall-court', name: 'Food Court Wall', x: 296, z: 132, hint: 'The back wall of the mall food court, behind the planters.', colors: [0xff8a5c, 0x37d67a, 0xffd23e], blurb: 'Neon noodles and a sunset — the court smells of fries and paint.' },
  { id: 'stadium-gate', name: 'Stadium Gate', x: 342, z: -92, hint: 'The stadium south gate, under the floodlights.', colors: [0x9be15d, 0xff5c5c, 0x4a8cff], blurb: 'Green turf, red cards — the gate remembers every match.' },
  { id: 'campus-library', name: 'Library Wall', x: 308, z: 156, hint: 'The library wall on the university quad, between the benches.', colors: [0x7ab8ff, 0xffd23e, 0xc9a0ff], blurb: 'Books and spray — the students grade this one themselves.' },
  { id: 'harbor-crates', name: 'Harbor Crates', x: -198, z: -118, hint: 'The container stack at the north harbor freight yard.', colors: [0xff8a5c, 0x2e6a8a, 0xffd23e], blurb: 'Rust, salt and steel — the harbor in three coats.' },
  { id: 'cannery-wall', name: 'Cannery Wall', x: 132, z: -204, hint: 'The cannery wall at North Harbor, by the loading dock.', colors: [0x37d67a, 0xff5c8a, 0x4a8cff], blurb: 'Fish scales and neon — the cannery never looked this good.' },
  { id: 'resort-pool', name: 'Pool House Wall', x: -152, z: 222, hint: 'The pool house wall at the Palmera Resort, where the towels are.', colors: [0x4ad6c8, 0xffd23e, 0xff8a5c], blurb: 'Turquoise water, gold sun — the resort, bottled.' },
  { id: 'airport-fence', name: 'Airport Fence', x: 118, z: 232, hint: 'The long-stay fence at Solmar Airport, by the runway lights.', colors: [0xc9a0ff, 0xff5c5c, 0xffd23e], blurb: 'Purple dusk, red tail-lights — the fence watches the planes leave.' },
  { id: 'neon-alley', name: 'Neon Alley Wall', x: -62, z: -58, hint: 'The alley wall behind Club Neon, by the bins.', colors: [0xff5c8a, 0x4a8cff, 0x37d67a], blurb: 'Pink neon on brick — the alley glows even at noon.' },
  { id: 'back-alley', name: 'Back Alley Wall', x: -32, z: -44, hint: 'The back alley wall behind the plaza, by the card tables.', colors: [0xffd23e, 0xff5c5c, 0x9be15d], blurb: 'Gold, red and green — the alley deals in colour now.' },
  { id: 'boardwalk', name: 'Boardwalk Wall', x: -248, z: 8, hint: 'The boardwalk wall by the sea, where the gulls sit.', colors: [0x4a8cff, 0x4ad6c8, 0xffd23e], blurb: 'Blue sea, green glass — the boardwalk at golden hour.' },
];

// Street rep titles: the street only respects a wall it has seen
// twice, so rep climbs one point per two finished pieces.
export const GRAFFITI_TITLES = ['Toy', 'Tagger', 'Bomber', 'Muralist', 'Wall Poet', 'Street Legend'];

export function makeGraffitiState() {
  return {
    done: [], // spot ids with a finished piece
    coats: {}, // spot id -> coats laid so far (0..2, a piece needs 3)
    active: null, // { spotId, coats, needle, dir, speed } while spraying
    earned: 0,
    setPaid: false,
    perfectStreak: 0, // consecutive perfect coats, across walls — three in a row pays a bonus
  };
}

export function graffitiFromSave(saved) {
  const state = makeGraffitiState();
  if (!saved || typeof saved !== 'object') return state;
  if (Array.isArray(saved.done)) {
    state.done = saved.done.filter((id) => SPRAY_SPOTS.some((s) => s.id === id));
  }
  if (saved.coats && typeof saved.coats === 'object') {
    for (const spot of SPRAY_SPOTS) {
      const n = Number(saved.coats[spot.id]);
      if (Number.isFinite(n) && n > 0) state.coats[spot.id] = Math.min(2, Math.floor(n));
    }
  }
  state.earned = Number.isFinite(saved.earned) ? Math.max(0, Math.floor(saved.earned)) : 0;
  state.setPaid = saved.setPaid === true;
  state.perfectStreak = Number.isFinite(saved.perfectStreak) ? Math.max(0, Math.floor(saved.perfectStreak)) : 0;
  return state;
}

// Rep is one point per two finished pieces, capped at five — the
// street only respects a wall it has seen twice.
export function graffitiRep(state) {
  return Math.min(5, Math.floor(state.done.length / 2));
}

export function graffitiTitle(state) {
  return GRAFFITI_TITLES[graffitiRep(state)];
}

// How many walls are still blank — the hunt's remaining count, for
// the hint line and the gallery header.
export function graffitiWallsLeft(state) {
  return SPRAY_SPOTS.length - state.done.length;
}

export function graffitiComplete(state) {
  return state.done.length >= SPRAY_SPOTS.length;
}

// The gold spray-can paint unlocks when the set is complete — Leo
// mixes it himself, on the house, the moment the twelfth wall dries.
export function graffitiGoldUnlocked(state) {
  return graffitiComplete(state);
}

// Build one wall per spray spot: a pale brick panel on two posts, with
// three paint stripes that fill in as the piece dries. The walls are
// plain meshes the loop never moves, so they cost nothing at run time.
export function buildGraffitiWalls(scene, state) {
  const walls = [];
  for (const spot of SPRAY_SPOTS) {
    const group = new THREE.Group();
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 2.6, 0.25),
      new THREE.MeshStandardMaterial({ color: 0xb8b0a0, roughness: 0.95, metalness: 0 }),
    );
    panel.position.set(0, 1.3, 0);
    panel.castShadow = true;
    group.add(panel);
    const stripes = [];
    for (let i = 0; i < 3; i++) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 2.1, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x8a8578, roughness: 0.9, metalness: 0 }),
      );
      stripe.position.set(-1.4 + i * 1.4, 1.3, 0.16);
      group.add(stripe);
      stripes.push(stripe);
    }
    // A spray can left at the foot of the wall, so the spot reads as
    // a place to work even before Mara has touched it.
    const can = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.5, 10),
      new THREE.MeshStandardMaterial({ color: 0xd8d8d8, metalness: 0.8, roughness: 0.3 }),
    );
    can.position.set(2.6, 0.25, 0.5);
    can.castShadow = true;
    group.add(can);
    group.position.set(spot.x, 0, spot.z);
    scene.add(group);
    walls.push({ spot, group, panel, stripes, can });
  }
  updateGraffitiWalls(walls, state);
  return walls;
}

// A decorative wall for the film lot: a blank backlot wall in the same
// shape as the spray walls, but not one of the twelve — the set's own
// wall, for the cameras, not the count.
export function buildFilmWall(scene, x, z) {
  const group = new THREE.Group();
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(4.4, 2.6, 0.25),
    new THREE.MeshStandardMaterial({ color: 0xc8b8a0, roughness: 0.95, metalness: 0 }),
  );
  panel.position.set(0, 1.3, 0);
  panel.castShadow = true;
  group.add(panel);
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(4.0, 0.35, 0.06),
    new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.9, metalness: 0 }),
  );
  stripe.position.set(0, 2.2, 0.16);
  group.add(stripe);
  // A clapperboard painted on the wall: the film lot's mark, so the
  // wall reads as a set piece even before the first coat of paint.
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.7, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.6 }),
  );
  board.position.set(-1.2, 1.1, 0.16);
  group.add(board);
  for (let i = 0; i < 3; i++) {
    const clap = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.12, 0.07),
      new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.5 }),
    );
    clap.position.set(-1.55 + i * 0.35, 1.42, 0.16);
    clap.rotation.z = 0.3;
    group.add(clap);
  }
  group.position.set(x, 0, z);
  group.rotation.y = Math.PI / 2;
  scene.add(group);
  return group;
}

// Recolour the walls to match the save: a finished piece shows its
// three palette stripes, a half-finished one shows only the coats
// laid so far, and an untouched wall stays pale brick.
export function updateGraffitiWalls(walls, state) {
  for (const wall of walls) {
    const done = state.done.includes(wall.spot.id);
    const coats = done ? 3 : (state.coats[wall.spot.id] || 0);
    wall.stripes.forEach((stripe, i) => {
      if (i < coats) {
        stripe.material.color.setHex(wall.spot.colors[i]);
        stripe.material.emissive = new THREE.Color(wall.spot.colors[i]);
        stripe.material.emissiveIntensity = 0.25;
      } else {
        stripe.material.color.setHex(0x8a8578);
        stripe.material.emissiveIntensity = 0;
      }
    });
    wall.panel.material.color.setHex(done ? 0x9a9484 : 0xb8b0a0);
  }
}

// The nearest spray spot, for the hint line — only walls Mara has not
// finished yet, and only when she is close enough to work on one.
export function nearestSpraySpot(state, px, pz) {
  const best = nearestBy(SPRAY_SPOTS, px, pz, state.done || []);
  if (!best) return null;
  return { spot: best, distance: Math.round(dist2D(px, pz, best.x, best.z)) };
}

export function graffitiNear(state, px, pz) {
  const near = nearestSpraySpot(state, px, pz);
  return near && near.distance < 7 ? near.spot : null;
}

// Start a spray session at a wall: three coats, one needle sweeping
// back and forth, and E to lay each coat. The needle speeds up after
// every coat, so the third one is the test.
export function startSpray(state, spot) {
  if (state.done.includes(spot.id)) return { ok: false, reason: 'That wall is finished — pick another one.' };
  state.active = { spotId: spot.id, coats: state.coats[spot.id] || 0, needle: 0.5, dir: 1, speed: 1.1 };
  return { ok: true, spot };
}

// The needle sweeps while Mara holds her nerve: it ping-pongs 0..1,
// faster after each coat, and drifts back to the middle when she
// walks away — the wall waits, the needle does not.
export function updateGraffiti(state, dt, px, pz) {
  const active = state.active;
  if (!active) return null;
  const spot = SPRAY_SPOTS.find((s) => s.id === active.spotId);
  if (!spot) { state.active = null; return null; }
  if (dist2D(px, pz, spot.x, spot.z) > 12) {
    state.active = null;
    return { type: 'cancelled', spot };
  }
  active.needle += active.dir * active.speed * dt;
  if (active.needle >= 1) { active.needle = 1; active.dir = -1; }
  if (active.needle <= 0) { active.needle = 0; active.dir = 1; }
  return null;
}

// Lay a coat: the closer the needle is to the middle, the cleaner
// the coat. A perfect coat (within 0.15 of the middle) lays fast and
// pays a $25 style bonus; a sloppy one (past 0.4) sputters and lays
// nothing — the can hisses, the wall stays pale.
export function sprayCoat(state) {
  const active = state.active;
  if (!active) return null;
  const spot = SPRAY_SPOTS.find((s) => s.id === active.spotId);
  if (!spot) { state.active = null; return null; }
  const off = sprayOff(active.needle);
  if (off > 0.8) {
    active.speed = Math.min(2.2, active.speed + 0.2);
    state.perfectStreak = 0; // a sputter breaks the streak
    return { type: 'missed', spot, off };
  }
  const perfect = off <= 0.3;
  // A perfect coat feeds the streak; a merely good one resets it.
  // Three perfect coats in a row pay $50 each on the finished wall.
  state.perfectStreak = perfect ? (state.perfectStreak || 0) + 1 : 0;
  active.coats += 1;
  active.speed = Math.min(2.2, active.speed + 0.25);
  state.coats[spot.id] = active.coats;
  if (active.coats < 3) {
    return { type: 'coat', spot, coats: active.coats, perfect, off };
  }
  // Three coats: the piece is dry. $500 now, rep climbs, and the
  // twelfth wall pays $5,000 more and unlocks the gold paint.
  state.done.push(spot.id);
  delete state.coats[spot.id];
  state.active = null;
  const setBonus = state.done.length >= SPRAY_SPOTS.length && !state.setPaid ? GRAFFITI_SET_BONUS : 0;
  if (setBonus > 0) state.setPaid = true;
  const bonus = perfect ? 25 : 0;
  const streakBonus = (state.perfectStreak || 0) >= 3 ? state.perfectStreak * 50 : 0;
  const total = GRAFFITI_REWARD + setBonus + bonus + streakBonus;
  state.earned += total;
  return { type: 'done', spot, perfect, setBonus, bonus, streakBonus, total, rep: graffitiRep(state), title: graffitiTitle(state) };
}

// Cancel a spray session: the coats laid so far stay on the wall,
// the needle resets, and Mara can walk back and finish it later.
export function cancelSpray(state) {
  if (!state.active) return;
  state.active = null;
}

// A text meter for the hint line while spraying: the needle as a bar,
// so the player can see where it is without a new HUD element.
export function sprayMeter(state) {
  const active = state.active;
  if (!active) return '';
  const pos = Math.round(active.needle * 10);
  let bar = '';
  for (let i = 0; i <= 10; i++) bar += i === pos ? '|' : (i === 5 ? '+' : '-');
  return '[' + bar + '] coats ' + active.coats + '/3 — press E to spray';
}

export function graffitiSummary(state) {
  return 'Street art: ' + state.done.length + '/' + SPRAY_SPOTS.length + ' walls finished · rep ' + graffitiRep(state) +
    ' · ' + graffitiTitle(state) + ((state.perfectStreak || 0) > 0 ? ' · streak ' + state.perfectStreak : '') +
    (graffitiComplete(state) ? ' — full set! Gold spray paint unlocked.' : '');
}

export function graffitiStatusLine(state) {
  return 'Spray ' + state.done.length + '/' + SPRAY_SPOTS.length + ' · ' + graffitiTitle(state);
}

// The gallery: every wall, its hint, and whether it is dry — the
// pause menu shows the same list, so the hunt never needs a guide.
export function graffitiMenuItems(state) {
  return SPRAY_SPOTS.map((spot) => ({
    id: 'spray:' + spot.id,
    kind: 'spray',
    label: (state.done.includes(spot.id) ? '✓ ' : '○ ') + spot.name + ' — ' + spot.hint,
    cost: 0,
    owned: state.done.includes(spot.id),
    afford: true,
  }));
}

// The nearest unfinished wall, as a rumour for the radio and the
// hint line — the city always knows where the next blank wall is.
export function graffitiRumor(state) {
  const left = SPRAY_SPOTS.filter((s) => !state.done.includes(s.id));
  if (left.length === 0) return 'Every wall in Solmar wears your name now.';
  const pick = left[Math.floor(Math.random() * left.length)];
  return 'Word is the ' + pick.name + ' is still blank — ' + pick.hint;
}
