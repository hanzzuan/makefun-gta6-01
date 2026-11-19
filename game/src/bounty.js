// bounty.js — the Solmar PD's wanted board, run out of Leo's garage.
// Ten fugitives are loose in the city, each with a price on their
// head and a hideout where they hole up. Mara takes a bounty at the
// board (press U at the garage), hunts the fugitive down, and brings
// them in: cuff them alive for the full price, or drop them for half.
// A rival hunter called Vex is working the same board — take longer
// than four minutes and Vex gets there first, the bounty is gone, and
// the streak resets. A surrendered fugitive stops shooting and puts
// their hands up: walk up close and hold your ground for two seconds
// to cuff them. Streaks pay more, and the board always offers three
// fresh names. Ranks: Rookie, Street Hunter, Hunter, Legend.

import { PLACES } from './city.js';
import { dist2D, shuffle, pick, secondsToClock } from './util.js';
import { garageNear } from './garage.js';

// The eight wanted: a name, an alias the street knows them by, a tier,
// a price, the enemy variant that spawns them, the place they hide, a
// line for the board, and the taunts they shout when Mara closes in.
export const FUGITIVES = [
  {
    id: 'rat-king',
    name: 'Rico Delgado',
    alias: 'Rat King',
    tier: 1,
    bounty: 2500,
    variant: 'fugitive',
    hideout: 'freight',
    blurb: 'Skims the freight yard manifests and sells the trucks twice.',
    taunts: ['You will never find me between these trucks!', 'Venn paid better than the PD ever will!'],
  },
  {
    id: 'silk',
    name: 'Mona Ferreira',
    alias: 'Silk',
    tier: 1,
    bounty: 3000,
    variant: 'fugitive',
    hideout: 'backalley',
    blurb: 'Runs the back-alley card games and never loses a hand she deals.',
    taunts: ['The alley is mine, Mara. Always was.', 'You cannot cuff a shadow!'],
  },
  {
    id: 'torch',
    name: 'Danny Ibarra',
    alias: 'Torch',
    tier: 2,
    bounty: 5000,
    variant: 'fugitive',
    hideout: 'warehouse',
    blurb: 'Burned the Sunset Warehouse records and kept the matches.',
    taunts: ['Come closer, I have one match left.', 'The warehouse burns for me, not you!'],
  },
  {
    id: 'wrench',
    name: 'Sal Okafor',
    alias: 'Wrench',
    tier: 2,
    bounty: 6500,
    variant: 'fugitive',
    hideout: 'cannery',
    blurb: 'Strips stolen cars at the cannery and sells the parts by dawn.',
    taunts: ['I built this city with these hands!', 'Your car is next on my bench, Mara.'],
  },
  {
    id: 'velvet',
    name: 'Vera Kwan',
    alias: 'Velvet',
    tier: 3,
    bounty: 9000,
    variant: 'fugitive-armoured',
    hideout: 'nightclub',
    blurb: 'Owns the nightclub door after dark — and everyone who owes her.',
    taunts: ['The club is my court, and you are not on the list.', 'Velvet does not run. Velvet collects.'],
  },
  {
    id: 'doc',
    name: 'Elias Marsh',
    alias: 'Doc',
    tier: 3,
    bounty: 10500,
    variant: 'fugitive-armoured',
    hideout: 'campus',
    blurb: 'A campus lecturer who grades papers by day and moves contraband by night.',
    taunts: ['I taught half this city, Mara. You included.', 'Your thesis is due, and it is marked F.'],
  },
  {
    id: 'saint',
    name: 'Father Abara',
    alias: 'Saint',
    tier: 3,
    bounty: 12000,
    variant: 'fugitive-armoured',
    hideout: 'resort',
    blurb: 'Preaches at the resort chapel and fences the collection plate.',
    taunts: ['The Lord forgives. I do not.', 'Say your prayers, Mara — the pool is warm.'],
  },
  {
    id: 'ghost',
    name: 'The Ghost of Solmar',
    alias: 'Ghost',
    tier: 4,
    bounty: 20000,
    variant: 'fugitive-boss',
    hideout: 'harbor',
    blurb: 'Nobody has seen his face. The harbor crews whisper his name and lock their doors.',
    taunts: ['You are hunting a ghost, Mara.', 'The harbor keeps its own. Turn back.'],
  },
  {
    id: 'razor',
    name: 'Razor Reyes',
    alias: 'Razor',
    tier: 2,
    bounty: 7500,
    variant: 'fugitive',
    hideout: 'freight',
    blurb: 'Cut his way out of the freight yard twice. The third time the PD stopped counting.',
    taunts: ['I cut my way out of every cage, Voss.', 'Come closer — the blade is quicker than the badge.'],
  },
  {
    id: 'mama',
    name: 'Mama Sol',
    alias: 'Mama',
    tier: 3,
    bounty: 15000,
    variant: 'fugitive-armoured',
    hideout: 'mural-row',
    blurb: 'Forty years she ran the plaza. The PD pays for a ghost with her name on it.',
    taunts: ['Forty years I ran this plaza, child.', 'The Lord forgives. I do not.'],
  },
];

// The rival hunter: Vex works the same board, and the clock on every
// bounty is the time before Vex gets there first.
export const BOUNTY_RIVAL_NAME = 'Vex';
export const BOUNTY_TIME_LIMIT = 240; // seconds before Vex takes it
export const BOUNTY_CUFF_SECONDS = 2; // hold close to cuff a surrendered fugitive
export const BOUNTY_CUFF_RANGE = 5; // metres — close enough to grab them
export const BOUNTY_SURRENDER_FRACTION = 0.35; // health left when they give up
export const BOUNTY_BOARD_SIZE = 3;
export const BOUNTY_STREAK_CAP = 0.5; // a streak pays at most +50%

export const BOUNTY_RANKS = [
  { caught: 0, name: 'Rookie', blurb: 'Fresh on the board. The city is watching.' },
  { caught: 3, name: 'Street Hunter', blurb: 'Three in the bag — the board knows your name now.' },
  { caught: 8, name: 'Hunter', blurb: 'Eight fugitives down. Vex is starting to hurry.' },
  { caught: 15, name: 'Legend', blurb: 'Fifteen. The PD pins your poster next to theirs.' },
];

export function fugitiveById(id) {
  return FUGITIVES.find((f) => f.id === id) || null;
}

export function bountyRank(state) {
  let rank = BOUNTY_RANKS[0];
  for (const r of BOUNTY_RANKS) {
    if (state.caught >= r.caught) rank = r;
  }
  return rank;
}

export function bountyRankLine(state) {
  const rank = bountyRank(state);
  return rank.name + ' — ' + state.caught + ' caught · ' + rank.blurb;
}

export function makeBountyState() {
  return {
    active: null, // { id, timer, cuffTimer, spawned }
    offered: [],
    caught: 0,
    aliveCaught: 0,
    deadCaught: 0,
    earned: 0,
    bestPay: 0,
    streak: 0,
    rivalTakes: 0,
  };
}

export function bountyFromSave(saved) {
  const state = makeBountyState();
  if (!saved || typeof saved !== 'object') return state;
  state.caught = Number.isFinite(saved.caught) ? Math.max(0, Math.floor(saved.caught)) : 0;
  state.aliveCaught = Number.isFinite(saved.aliveCaught) ? Math.max(0, Math.floor(saved.aliveCaught)) : 0;
  state.deadCaught = Number.isFinite(saved.deadCaught) ? Math.max(0, Math.floor(saved.deadCaught)) : 0;
  state.earned = Number.isFinite(saved.earned) ? Math.max(0, Math.floor(saved.earned)) : 0;
  state.bestPay = Number.isFinite(saved.bestPay) ? Math.max(0, Math.floor(saved.bestPay)) : 0;
  state.streak = Number.isFinite(saved.streak) ? Math.max(0, Math.floor(saved.streak)) : 0;
  state.rivalTakes = Number.isFinite(saved.rivalTakes) ? Math.max(0, Math.floor(saved.rivalTakes)) : 0;
  // An active hunt never survives a reload: its clock died with the
  // last session, and Vex would have taken it anyway.
  state.active = null;
  state.offered = [];
  return state;
}

// The wanted board hangs on Leo's garage door — the same spot as the
// jobs board, so one trip to the garage covers both kinds of work.
export function bountyNear(x, z) {
  return garageNear(x, z);
}

// The board offers three fresh names, never the one Mara is already
// hunting, and never the same name twice on one board.
export function refreshBountyBoard(state) {
  const pool = shuffle(FUGITIVES.filter((f) => !state.active || f.id !== state.active.id));
  state.offered = pool.slice(0, BOUNTY_BOARD_SIZE).map((f) => f.id);
}

// Where the fugitive holes up, with a little scatter so two hunts never
// stage on the exact same paving stone.
export function fugitiveSpawnPoint(fugitive) {
  const place = PLACES[fugitive.hideout] || PLACES.plaza;
  return {
    x: place.x + (Math.random() * 10 - 5),
    z: place.z + (Math.random() * 10 - 5),
  };
}

// Take a bounty off the board: the clock starts the moment the name is
// pinned, and Vex starts driving the moment after.
export function acceptBounty(state, index) {
  if (state.active) return { ok: false, reason: 'You already have a bounty — finish it or let Vex take it first.' };
  const id = state.offered[index];
  const fugitive = fugitiveById(id);
  if (!fugitive) return { ok: false, reason: 'That name is not on the board any more.' };
  state.active = { id: fugitive.id, timer: BOUNTY_TIME_LIMIT, cuffTimer: 0, spawned: false };
  state.offered = state.offered.filter((o) => o !== id);
  return { ok: true, fugitive };
}

// The pay for a catch: the price on the head, plus a streak bonus that
// caps at +50%, and half price when the fugitive comes back dead. The
// optional mult carries the crew cut, the packages bonus and the club's
// back room — all of them pay on top of the board price.
export function bountyPayFor(state, fugitive, alive, mult) {
  const streakMult = 1 + Math.min(state.streak, 5) * 0.1;
  const full = Math.round(fugitive.bounty * streakMult * (mult || 1));
  return alive ? full : Math.round(full / 2);
}

// The hunt itself, run once a frame while a bounty is active. The
// fugitive is a live enemy in the world's enemy list, tagged with the
// bounty id when main.js spawns them. A hurt fugitive surrenders: get
// close on foot and hold your ground to cuff them alive. A dead
// fugitive pays half. A slow hunt pays nothing — Vex takes it.
export function updateBounty(state, enemies, playerX, playerZ, inCar, inBoat, dt, payMult) {
  if (!state.active) return null;
  const fugitive = fugitiveById(state.active.id);
  if (!fugitive) {
    state.active = null;
    return null;
  }
  state.active.timer -= dt;
  if (state.active.timer <= 0) {
    const lost = fugitive;
    state.active = null;
    state.streak = 0;
    state.rivalTakes += 1;
    refreshBountyBoard(state);
    return { type: 'rival-take', fugitive: lost };
  }
  const enemy = enemies.find((e) => e.bountyId === fugitive.id);
  if (!enemy) return null;
  // The fugitive moves: every few seconds the board notes where they
  // were last seen, so the hunt is a chase and not a treasure hunt —
  // a running fugitive keeps the trail warm, a cornered one goes quiet.
  const elapsed = Math.round(BOUNTY_TIME_LIMIT - state.active.timer);
  if (!state.active.lastSeen || elapsed - state.active.lastSeen.t >= 5) {
    state.active.lastSeen = { x: Math.round(enemy.x), z: Math.round(enemy.z), t: elapsed };
  }
  if (!enemy.alive) {
    const pay = bountyPayFor(state, fugitive, false, payMult);
    state.active = null;
    state.caught += 1;
    state.deadCaught += 1;
    state.streak += 1;
    state.earned += pay;
    if (pay > state.bestPay) state.bestPay = pay;
    refreshBountyBoard(state);
    return { type: 'killed', fugitive, pay };
  }
  // A fugitive beaten down to a third of their health gives up: they
  // stop shooting and put their hands up. Walk in close and hold your
  // ground for two seconds to cuff them — alive pays the full price.
  const maxHealth = enemy.maxHealth || 100;
  if (!enemy.surrendered && enemy.health <= maxHealth * BOUNTY_SURRENDER_FRACTION) {
    enemy.surrendered = true;
    return { type: 'surrendered', fugitive };
  }
  if (enemy.surrendered) {
    const close = !inCar && !inBoat && dist2D(playerX, playerZ, enemy.x, enemy.z) <= BOUNTY_CUFF_RANGE;
    if (close) {
      state.active.cuffTimer += dt;
      if (state.active.cuffTimer >= BOUNTY_CUFF_SECONDS) {
        const pay = bountyPayFor(state, fugitive, true, payMult);
        state.active = null;
        state.caught += 1;
        state.aliveCaught += 1;
        state.streak += 1;
        state.earned += pay;
        if (pay > state.bestPay) state.bestPay = pay;
        refreshBountyBoard(state);
        return { type: 'cuffed', fugitive, pay };
      }
      return { type: 'cuff-progress', fugitive, progress: state.active.cuffTimer / BOUNTY_CUFF_SECONDS };
    }
    state.active.cuffTimer = Math.max(0, state.active.cuffTimer - dt * 2);
  }
  return null;
}

// The board as menu rows: the active hunt on top, then the three names
// on offer with their price, tier and hideout. A row is only takeable
// while no hunt is running.
export function bountyMenuItems(state) {
  const items = [];
  if (state.active) {
    const fugitive = fugitiveById(state.active.id);
    const place = fugitive ? PLACES[fugitive.hideout] : null;
    items.push({
      id: 'bounty-active',
      label: 'HUNTING: ' + fugitive.name + ' (' + fugitive.alias + ') — ' + (place ? place.name : 'somewhere in Solmar'),
      state: Math.ceil(state.active.timer) + 's before Vex takes it',
    });
  }
  for (let i = 0; i < state.offered.length; i++) {
    const fugitive = fugitiveById(state.offered[i]);
    if (!fugitive) continue;
    const place = PLACES[fugitive.hideout];
    const tierWord = fugitive.tier === 4 ? 'MOST WANTED' : fugitive.tier === 3 ? 'DANGEROUS' : fugitive.tier === 2 ? 'ARMED' : 'RUNNER';
    items.push({
      id: 'bounty-' + i,
      label: fugitive.name + ' (' + fugitive.alias + ') — ' + tierWord + ' · ' + (place ? place.name : 'Solmar') + ' · ' + fugitive.blurb,
      pay: fugitive.bounty,
      afford: !state.active,
    });
  }
  return items;
}

export function bountySummary(state) {
  const rank = bountyRank(state);
  return 'Ten fugitives are loose in Solmar, and the PD pays cash for every one of them. ' +
    'Cuff them alive for the full price, drop them for half — and be quick, because Vex works ' +
    'the same board. You are a ' + rank.name + ': ' + state.caught + ' caught (' + state.aliveCaught +
    ' alive, ' + state.deadCaught + ' dead), $' + state.earned.toLocaleString() + ' earned, best single ' +
    'catch $' + state.bestPay.toLocaleString() + '. Vex has beaten you to ' + state.rivalTakes + '.';
}

// The HUD line: the active hunt with its clock, or the board's count
// when Mara is between hunts.
export function bountyStatusLine(state) {
  if (state.active) {
    const fugitive = fugitiveById(state.active.id);
    if (!fugitive) return '';
    const cuff = state.active.cuffTimer > 0
      ? ' · CUFF ' + state.active.cuffTimer.toFixed(1) + 's'
      : '';
    return 'BOUNTY: ' + fugitive.alias.toUpperCase() + ' · ' + secondsToClock(state.active.timer) + cuff;
  }
  return state.offered.length > 0 ? 'BOUNTY BOARD: ' + state.offered.length + ' wanted' : '';
}

// A line for the pause screen: rank, catches and the best pay.
export function bountyBoardLine(state) {
  let line = bountyRank(state).name + ' · ' + state.caught + ' caught · best $' + state.bestPay.toLocaleString();
  if (state.active && state.active.lastSeen) {
    line += ' · last seen (' + state.active.lastSeen.x + ', ' + state.active.lastSeen.z + ')';
  }
  return line;
}

// A fugitive's taunt, shouted when Mara closes in — the board keeps
// their words on file, and they never learn new ones.
export function fugitiveTaunt(fugitive) {
  if (!fugitive || !fugitive.taunts || fugitive.taunts.length === 0) return '';
  return pick(fugitive.taunts);
}
