// nightclub.js — Club Neon, Mara's own nightclub.
// After the story's middle jobs, Mara can buy the downtown nightclub
// from Venn's old holdings and run it herself: a dance floor, a DJ
// booth, and a door that pays. The club is a business and a stage —
// buying it costs real mission cash, bouncers keep the door safe, the
// DJ set is a live rhythm game Mara plays herself, and every in-game
// day the till pays out. A club with a name behind it opens doors:
// at reputation 3 the taxi rank runs VIP fast travel for free, and at
// reputation 5 the dispatcher sends VIP fares to the club door.

import * as THREE from 'three';
import { PLACES } from './city.js';
import { dist2D } from './util.js';

export const CLUB_PRICE = 40000;
export const CLUB_NAME = 'Club Neon';
export const BOUNCER_COST = 2000;
export const MAX_BOUNCERS = 2;
export const CLUB_REP_MAX = 5;
export const CLUB_VIP_TRAVEL_REP = 3;
export const CLUB_VIP_FARE_REP = 5;
export const CLUB_DAY_SECONDS = 300; // one in-game day is 300 seconds
export const DJ_BEATS_PER_SET = 16;
export const DJ_BPM = 132;
export const DJ_PERFECT_WINDOW = 0.07; // seconds either side of the beat
export const DJ_GOOD_WINDOW = 0.16;
export const DJ_CROWD_START = 30;
export const DJ_CROWD_MAX = 100;

// The club's own words: what the bouncers say when Mara walks in,
// and what the crowd shouts when a set lands. The door staff know
// her by now — she owns the place, after all.
export const CLUB_DOOR_LINES = [
  'Door\u2019s yours, boss. No trouble tonight.',
  'The queue stretches round the block for your set.',
  'Venn\u2019s old boys tried the door again. They left.',
  'Floor\u2019s packed, Mara. They came to hear you play.',
  'Somebody\u2019s cousin from the PD is asking after you. Politely.',
];

export const CLUB_CROWD_LINES = [
  'The floor is moving with you!',
  'They\u2019re chanting your name, Mara!',
  'That drop shook the glasses off the bar!',
  'The whole club is yours tonight!',
];

export function makeNightclubState() {
  return {
    owned: false, // Mara owns the club outright
    rep: 0, // club reputation 0..5
    bouncers: 0, // hired door staff 0..2
    income: 0, // lifetime till collections
    sets: 0, // DJ sets played
    bestCombo: 0, // best beat streak in one set
    lastIncomeDay: -1, // in-game day of the last till collection
    crowd: 0, // crowd meter 0..100, live during a set
    set: null, // the live DJ set, or null when Mara is not playing
    upgrades: { sound: false, lounge: false, sign: false, backroom: false, mural: false, screen: false }, // club upgrades bought
  };
}

export function nightclubFromSave(saved) {
  const state = makeNightclubState();
  if (!saved || typeof saved !== 'object') return state;
  state.owned = saved.owned === true;
  state.rep = Math.max(0, Math.min(CLUB_REP_MAX, Number(saved.rep) || 0));
  state.bouncers = Math.max(0, Math.min(MAX_BOUNCERS, Number(saved.bouncers) || 0));
  state.income = Math.max(0, Number(saved.income) || 0);
  state.sets = Math.max(0, Number(saved.sets) || 0);
  state.bestCombo = Math.max(0, Number(saved.bestCombo) || 0);
  state.lastIncomeDay = Number.isFinite(saved.lastIncomeDay) ? Math.floor(saved.lastIncomeDay) : -1;
  // Upgrades survive the save; an older save without them starts clean.
  if (saved.upgrades && typeof saved.upgrades === 'object') {
    for (const k of ['sound', 'lounge', 'sign', 'backroom', 'mural', 'screen']) {
      if (saved.upgrades[k] === true) state.upgrades[k] = true;
    }
  }
  return state;
}

// Close enough to the club door and the C key opens the club panel.
export function nightclubNear(x, z) {
  return dist2D(x, z, PLACES.nightclub.x, PLACES.nightclub.z) < 16;
}

// Buy the club outright. Returns { ok, cost } or { ok: false, reason }.
export function buyClub(state, money) {
  if (state.owned) return { ok: false, reason: 'You already own Club Neon.' };
  if (money < CLUB_PRICE) return { ok: false, reason: 'The club costs $' + CLUB_PRICE.toLocaleString() + ' — you are short.' };
  state.owned = true;
  state.rep = 1; // buying the place puts Mara's name on the door
  return { ok: true, cost: CLUB_PRICE };
}

// Hire a bouncer for the door. Each one keeps the floor safe and
// adds to the nightly take — and the crowd likes a door that holds.
export function hireBouncer(state, money) {
  if (!state.owned) return { ok: false, reason: 'Buy the club first — the door is not yours to staff.' };
  if (state.bouncers >= MAX_BOUNCERS) return { ok: false, reason: 'The door is fully staffed — two bouncers is enough.' };
  if (money < BOUNCER_COST) return { ok: false, reason: 'A bouncer costs $' + BOUNCER_COST.toLocaleString() + ' — you are short.' };
  state.bouncers += 1;
  state.rep = Math.min(CLUB_REP_MAX, state.rep + 1);
  return { ok: true, cost: BOUNCER_COST, bouncers: state.bouncers };
}

// Club upgrades: one-time purchases that make the business pay more.
// The sound system makes every DJ set pay 25% more, the VIP lounge
// lifts the nightly till by half, and the neon sign puts the club's
// name on the avenue — reputation up the moment it lights.
export const CLUB_UPGRADES = [
  { id: 'sound', name: 'Sound System', cost: 5000, blurb: 'A wall of speakers — DJ sets pay 25% more' },
  { id: 'lounge', name: 'VIP Lounge', cost: 8000, blurb: 'A velvet rope and a private bar — the nightly till pays 50% more' },
  { id: 'sign', name: 'Neon Sign', cost: 2000, blurb: 'The name in pink neon over the door — reputation +1 at once' },
  { id: 'backroom', name: 'Back Room', cost: 12000, blurb: 'A quiet room behind the bar — the club hears where the fugitives hide, and the board pays 10% more' },
  { id: 'mural', name: 'Mural Wall', cost: 6000, blurb: 'A wall inside the club for the taggers — the street comes to dance, and the till pays 15% more' },
  { id: 'screen', name: 'Silver Screen', cost: 10000, blurb: 'A cinema screen over the dance floor — film nights pay 20% more on the till' },
];

// Buy a club upgrade. Returns { ok, cost, name } or { ok: false, reason }.
export function buyClubUpgrade(state, money, id) {
  const up = CLUB_UPGRADES.find((u) => u.id === id);
  if (!up) return { ok: false, reason: 'No such upgrade.' };
  if (!state.owned) return { ok: false, reason: 'Buy the club first — there is nothing to upgrade yet.' };
  if (state.upgrades[id]) return { ok: false, reason: up.name + ' is already installed.' };
  if (money < up.cost) return { ok: false, reason: up.name + ' costs $' + up.cost.toLocaleString() + ' — you are short.' };
  state.upgrades[id] = true;
  if (id === 'sign') state.rep = Math.min(CLUB_REP_MAX, state.rep + 1);
  return { ok: true, cost: up.cost, name: up.name };
}

// The nightly take: a base till, more with reputation, more again
// with bouncers on the door — and half again with the VIP lounge.
// The mural wall brings the street inside, and the till pays 15% more.
// The silver screen runs film nights, and the till pays 20% more.
export function clubDailyTake(state) {
  if (!state.owned) return 0;
  const base = 200 + state.rep * 150 + state.bouncers * 150;
  let take = state.upgrades.lounge ? Math.round(base * 1.5) : base;
  if (state.upgrades.mural) take = Math.round(take * 1.15);
  if (state.upgrades.screen) take = Math.round(take * 1.2);
  return take;
}

// Collect the till when a new in-game day has begun. The till holds
// up to three nights of takings — the staff skim the rest — so a
// player who stays away for a week still banks three nights. Returns
// the amount collected, or 0 when the till is empty or Mara does not
// own the club. The caller banks the cash and shows the toast.
export function collectClubIncome(state, gameTime) {
  if (!state.owned) return 0;
  const day = Math.floor(gameTime / CLUB_DAY_SECONDS);
  if (day <= state.lastIncomeDay) return 0;
  const nights = Math.min(3, day - state.lastIncomeDay);
  state.lastIncomeDay = day;
  const take = clubDailyTake(state) * nights;
  state.income += take;
  return take;
}

// --- the DJ set: a live rhythm game ---------------------------------------
// Mara plays the booth herself. Sixteen beats at 132 BPM; the player
// presses Space on each beat. A hit inside the perfect window is a
// perfect; inside the good window is a good; anything else breaks the
// combo and cools the crowd. The crowd meter starts at 30 and climbs
// with every hit — a hot crowd pays more, and a crowd over 80 after a
// full set earns the club a reputation point.

export function djStartSet(state) {
  if (!state.owned) return { ok: false, reason: 'Buy the club first — the booth is not yours yet.' };
  if (state.set) return { ok: false, reason: 'You are already playing a set.' };
  state.set = {
    beat: 0, // beats elapsed, fractional
    hits: 0,
    perfects: 0,
    combo: 0,
    bestCombo: 0,
    crowd: DJ_CROWD_START,
    finished: false,
  };
  state.crowd = DJ_CROWD_START;
  return { ok: true };
}

// Advance the set clock. Returns 'beat' when a beat boundary passes
// (the HUD pulses), or null. The set ends after DJ_BEATS_PER_SET beats.
export function djUpdate(state, dt) {
  const set = state.set;
  if (!set) return null;
  const before = Math.floor(set.beat);
  set.beat += dt * (DJ_BPM / 60);
  const after = Math.floor(set.beat);
  if (set.beat >= DJ_BEATS_PER_SET) {
    return finishDjSet(state);
  }
  return after > before ? 'beat' : null;
}

// Score one Space press against the beat. The beat's phase is the
// fraction of the current beat: near 0 (or near 1) is on the beat.
export function djHit(state) {
  const set = state.set;
  if (!set) return null;
  const phase = set.beat % 1;
  const off = Math.min(phase, 1 - phase) * (60 / DJ_BPM);
  if (off <= DJ_PERFECT_WINDOW) {
    set.hits += 1;
    set.perfects += 1;
    set.combo += 1;
    set.crowd = Math.min(DJ_CROWD_MAX, set.crowd + 12);
    if (set.combo > set.bestCombo) set.bestCombo = set.combo;
    return 'perfect';
  }
  if (off <= DJ_GOOD_WINDOW) {
    set.hits += 1;
    set.combo += 1;
    set.crowd = Math.min(DJ_CROWD_MAX, set.crowd + 8);
    if (set.combo > set.bestCombo) set.bestCombo = set.combo;
    return 'good';
  }
  set.combo = 0;
  set.crowd = Math.max(0, set.crowd - 5);
  return 'miss';
}

// End the set: pay out by the crowd, count the set, and grow the
// club's reputation when the crowd stayed hot. Returns the result.
function finishDjSet(state) {
  const set = state.set;
  const crowd = set.crowd;
  // The sound system makes a hot room pay: a quarter more on the set.
  // The mural wall brings the street inside, and the set pays a tenth more.
  const payout = Math.round((100 + crowd * 2 + state.rep * 50) * (state.upgrades.sound ? 1.25 : 1) * (state.upgrades.mural ? 1.1 : 1));
  state.sets += 1;
  if (set.bestCombo > state.bestCombo) state.bestCombo = set.bestCombo;
  let repUp = false;
  if (crowd >= 80 && state.rep < CLUB_REP_MAX) {
    state.rep += 1;
    repUp = true;
  }
  state.crowd = crowd;
  state.set = null;
  return {
    type: 'set-done',
    hits: set.hits,
    perfects: set.perfects,
    bestCombo: set.bestCombo,
    crowd,
    payout,
    repUp,
  };
}

// The live set's HUD line: the crowd meter, the combo, and how many
// beats are left — so the player can read the room at a glance.
export function djSetLine(state) {
  const set = state.set;
  if (!set) return '';
  const left = Math.max(0, DJ_BEATS_PER_SET - Math.floor(set.beat));
  const bar = '\u2588'.repeat(Math.round(set.crowd / 10)) + '\u2591'.repeat(10 - Math.round(set.crowd / 10));
  return `♪ DJ SET · crowd ${bar} ${set.crowd}% · combo x${set.combo} · ${left} beats left — SPACE on the beat!`;
}

// The club panel rows: buy the club, hire bouncers, or play a set.
// The DJ row only shows once Mara owns the place.
export function nightclubMenuItems(state, money) {
  const items = [];
  if (!state.owned) {
    items.push({
      id: 'buy-club',
      label: 'Buy Club Neon — the whole downtown nightclub, door, booth and all',
      cost: CLUB_PRICE,
      owned: false,
      afford: money >= CLUB_PRICE,
    });
    return items;
  }
  items.push({
    id: 'dj-set',
    label: 'Play a DJ set — sixteen beats at 132 BPM, the crowd pays for a hot room',
    cost: 0,
    owned: false,
    afford: true,
  });
  for (let i = state.bouncers; i < MAX_BOUNCERS; i++) {
    items.push({
      id: 'hire-bouncer',
      label: 'Hire a bouncer — a safe door means a fuller floor (+$150 a night)',
      cost: BOUNCER_COST,
      owned: false,
      afford: money >= BOUNCER_COST,
    });
  }
  // Upgrades the club does not have yet, each as its own row.
  for (const up of CLUB_UPGRADES) {
    if (state.upgrades[up.id]) continue;
    items.push({
      id: 'upgrade-' + up.id,
      label: up.name + ' — ' + up.blurb,
      cost: up.cost,
      owned: false,
      afford: money >= up.cost,
    });
  }
  items.push({
    id: 'collect',
    label: 'Collect the till — tonight\u2019s take is $' + clubDailyTake(state).toLocaleString(),
    cost: 0,
    owned: false,
    afford: true,
  });
  return items;
}

// One line under the panel title: what the club is worth to Mara.
export function nightclubSummary(state) {
  if (!state.owned) {
    return 'Club Neon is Venn\u2019s old holding, and the deed is for sale — $' + CLUB_PRICE.toLocaleString() + '. Buy it and the door, the booth and the till are yours.';
  }
  const parts = [
    'Reputation ' + state.rep + '/' + CLUB_REP_MAX,
    state.bouncers + '/' + MAX_BOUNCERS + ' bouncers',
    state.sets + ' sets played',
    'best combo x' + state.bestCombo,
    '$' + state.income.toLocaleString() + ' collected',
  ];
  return 'You own Club Neon. ' + parts.join(' · ') + '. The till pays $' + clubDailyTake(state).toLocaleString() + ' a night.';
}

// The HUD line under the objective: the club at a glance.
// The film nights on the silver screen: one film a night, picked by
// the calendar, so the club's regulars always know what is showing.
export const CLUB_FILM_NIGHTS = [
  'Runway 27 — the chase film, starring the stunt crew.',
  'Sunset Over the Bay — the slow one, for the front row.',
  'The Last Race — boats, a lighthouse, and a dawn getaway.',
  'The Film Job — a heist, in the club where the heist was planned.',
  'Golden Hour Chase — horns, a siren, and the sun in the mirror.',
  'Mara\\u2019s Theme — the film about the driver in the booth.',
];
export function clubFilmNightLine(state) {
  if (!state || !state.owned || !state.upgrades.screen) return '';
  const day = Math.floor(Date.now() / 86400000);
  return ' · tonight: ' + CLUB_FILM_NIGHTS[day % CLUB_FILM_NIGHTS.length];
}

export function nightclubStatusLine(state) {
  if (!state || !state.owned) return '';
  return `CLUB NEON · rep ${state.rep}/${CLUB_REP_MAX} · ${state.bouncers} bouncers · till $${clubDailyTake(state)}/night` + clubFilmNightLine(state);
}

// A door line for the toast when Mara walks in: the staff know her.
export function clubDoorLine() {
  return CLUB_DOOR_LINES[Math.floor(Math.random() * CLUB_DOOR_LINES.length)];
}

// A crowd line for a finished set: the room loved it.
export function clubCrowdLine() {
  return CLUB_CROWD_LINES[Math.floor(Math.random() * CLUB_CROWD_LINES.length)];
}

// The club's neon sign: a glowing magenta box over the door, with a
// cyan stripe, so the club reads from across the plaza at night.
export function buildClubSign(scene) {
  const group = new THREE.Group();
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(6.4, 2.2, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xff2e88, emissive: 0xcc1166, emissiveIntensity: 1.4, roughness: 0.4 }),
  );
  board.position.y = 6.2;
  board.castShadow = true;
  group.add(board);
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(6.4, 0.35, 0.32),
    new THREE.MeshStandardMaterial({ color: 0x19e3ff, emissive: 0x0a9abb, emissiveIntensity: 1.2, roughness: 0.4 }),
  );
  stripe.position.y = 4.9;
  group.add(stripe);
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 4.4, 0.25),
    new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.3, metalness: 0.6 }),
  );
  door.position.y = 2.2;
  group.add(door);
  group.position.set(PLACES.nightclub.x, 0, PLACES.nightclub.z);
  scene.add(group);
  return { mesh: group, board, stripe };
}

// The sign dims when Mara does not own the club yet — a dark door
// nobody dances behind — and burns bright once it is hers.
export function updateClubSign(sign, state) {
  if (!sign) return;
  const owned = state && state.owned;
  sign.board.material.emissiveIntensity = owned ? 1.4 : 0.25;
  sign.stripe.material.emissiveIntensity = owned ? 1.2 : 0.15;
}
