// crew.js — Mara's crew.
// Solmar is too big for one person. After the story's early jobs, Mara
// can hire a crew at the safehouse: a driver who makes every getaway
// car faster, a hacker who cools the heat twice as fast and pops
// locked doors, and a lookout who puts a gold ring on every police
// dot on the minimap. Hiring costs real mission cash, the crew shows
// in the HUD and the pause screen, and it persists in the save — a
// hired hand stays hired across sessions.

import { PLACES } from './city.js';
import { dist2D } from './util.js';

export const CREW_HANGOUT_RADIUS = 14;

// The five hands Mara can hire. Each one changes how the city plays:
// the driver is speed, the hacker is quiet, the lookout is eyes, the
// fourth hand, Rook, is the negotiator who makes every job pay — and
// the fifth, Ink, is the Mural Row artist who tags the walls for her
// and paints the crew's rides gold.
export const CREW = [
  {
    id: 'dee',
    name: 'Dee "Wheels" Ortiz',
    role: 'driver',
    cost: 2500,
    blurb: 'Ex-street racer. Every car Mara drives goes 12% faster, and boats too.',
    perk: '+12% top speed in cars and boats',
  },
  {
    id: 'nix',
    name: 'Nix',
    role: 'hacker',
    cost: 4000,
    blurb: 'Quiet kid from the campus labs. Wanted heat cools twice as fast, and locked doors open for her.',
    perk: 'Heat cools 2x faster · pops locked doors',
  },
  {
    id: 'sable',
    name: 'Sable',
    role: 'lookout',
    cost: 3000,
    blurb: 'Ex-dispatcher who knows every PD radio channel. Police dots on the minimap wear a gold ring.',
    perk: 'Police marked on the minimap',
  },
  {
    id: 'rook',
    name: 'Rook',
    role: 'negotiator',
    cost: 6000,
    blurb: 'A fixer who used to work for Venn and knows what every job is worth. Every mission pays 15% more with him on the crew.',
    perk: 'Mission rewards +15%',
  },
  {
    id: 'ink',
    name: 'Ink',
    role: 'artist',
    cost: 3500,
    blurb: 'The Mural Row artist. He tags the walls for Mara — every wall pays $250 more with him on the crew, and the gold spray paint is his.',
    perk: 'Graffiti pays +$250 per wall',
  },
];

export function makeCrewState() {
  return {
    hired: [], // crew ids, in hire order
    jobs: 0, // missions finished with a full crew beside Mara
    levels: { dee: 1, nix: 1, sable: 1, rook: 1, ink: 1 }, // training level 1 to 3 per hand
  };
}

export function crewFromSave(saved) {
  const state = makeCrewState();
  if (!saved || typeof saved !== 'object') return state;
  if (Array.isArray(saved.hired)) {
    for (const id of saved.hired) {
      if (CREW.some((c) => c.id === id) && !state.hired.includes(id)) {
        state.hired.push(id);
      }
    }
  }
  state.jobs = Math.max(0, Number(saved.jobs) || 0);
  // Training levels survive the save too; anything out of range
  // resets to 1, so an older save still loads clean.
  if (saved.levels && typeof saved.levels === 'object') {
    for (const c of CREW) {
      const lv = Number(saved.levels[c.id]);
      state.levels[c.id] = lv >= 1 && lv <= CREW_MAX_LEVEL ? lv : 1;
    }
  }
  return state;
}

// Training levels run 1 to 3, and each level makes the perk stronger.
// Level 2 costs $1,500, level 3 costs $3,000.
export const CREW_MAX_LEVEL = 3;
export const CREW_TRAIN_COST = { 1: 1500, 2: 3000 };

// Training level of one hand, 1 to 3.
export function crewLevel(state, id) {
  return (state.levels && state.levels[id]) || 1;
}

// Train a hired hand up one level. Returns the cost and the new level,
// or why it cannot be done.
export function trainCrew(state, id, money) {
  const member = crewById(id);
  if (!member) return { ok: false, reason: 'No such hand.' };
  if (!state.hired.includes(id)) return { ok: false, reason: member.name + ' is not on the crew yet.' };
  const level = crewLevel(state, id);
  if (level >= CREW_MAX_LEVEL) return { ok: false, reason: member.name + ' is already at max level.' };
  const cost = CREW_TRAIN_COST[level];
  if (money < cost) return { ok: false, reason: 'Training costs $' + cost.toLocaleString() + ' — you are short.' };
  state.levels[id] = level + 1;
  return { ok: true, cost, level: level + 1, member };
}

// A bigger crew opens more doors: every hired hand adds 5% to job
// board pay — the board pays for the hands that run it.
export function crewJobBonus(state) {
  if (!state || !state.hired) return 1;
  return 1 + state.hired.length * 0.05;
}

// The crew takes the same cut of bounty pay as of board pay: every
// hired hand adds 5% to a catch, on top of the streak bonus.
export function crewBountyBonus(state) {
  if (!state || !state.hired) return 1;
  return 1 + state.hired.length * 0.05;
}

// Ink on the crew tags the walls for Mara: every finished piece pays
// $250 more with him holding the ladder.
export function crewGraffitiBonus(state) {
  if (!state || !state.hired) return 0;
  return state.hired.includes('ink') ? 250 : 0;
}

export function crewById(id) {
  return CREW.find((c) => c.id === id) || null;
}

export function hasCrew(state, roleOrId) {
  if (!state) return false;
  return state.hired.some((id) => {
    const c = crewById(id);
    return c && (c.id === roleOrId || c.role === roleOrId);
  });
}

export function crewCount(state) {
  return state ? state.hired.length : 0;
}

export function crewIsFull(state) {
  return crewCount(state) >= CREW.length;
}

// The hangout: Mara hires at the safehouse, where the crew waits by
// the garage door. Close enough to the safehouse and the V key opens
// the crew panel.
export function crewNear(x, z) {
  return dist2D(x, z, PLACES.safehouse.x, PLACES.safehouse.z) < CREW_HANGOUT_RADIUS;
}

// Hire a hand. Returns {ok, cost} on success, or {ok:false, reason}
// when Mara already hired them or cannot afford them.
export function hireCrew(state, id, money) {
  const member = crewById(id);
  if (!member) return { ok: false, reason: 'No such hand.' };
  if (state.hired.includes(id)) return { ok: false, reason: member.name + ' is already on the crew.' };
  if (money < member.cost) return { ok: false, reason: 'Need $' + member.cost.toLocaleString() + ' to hire ' + member.name + '.' };
  state.hired.push(id);
  return { ok: true, cost: member.cost, member };
}

// The driver's edge: every car and boat Mara drives runs faster —
// 12% at level 1, 18% at level 2, 24% at level 3.
export function crewSpeedMult(state) {
  if (!hasCrew(state, 'driver')) return 1;
  return 1.06 + 0.06 * crewLevel(state, 'dee');
}

// The hacker's edge: the wanted heat cools faster, so the PD loses
// Mara's trail sooner — 2x at level 1, 3x at level 2, 4x at level 3.
export function crewDecayMult(state) {
  if (!hasCrew(state, 'hacker')) return 1;
  return 1 + crewLevel(state, 'nix');
}

// The lookout's edge: police dots on the minimap wear a gold ring, so
// Mara sees the PD coming before the PD sees her.
export function crewLookout(state) {
  return hasCrew(state, 'lookout');
}

// A job done with the whole crew beside Mara counts double for the
// crew's own record — three hands, one score.
export function onMissionWithCrew(state) {
  if (crewIsFull(state)) state.jobs += 1;
  return state.jobs;
}

// The crew panel rows: each hand, its price or OWNED tag, and whether
// Mara can afford them right now — plus a training row under each
// hired hand who is not at max level yet.
export function crewMenuItems(state, money) {
  const items = CREW.map((c) => ({
    id: c.id,
    label: c.name + ' — ' + c.role + ' Lv ' + crewLevel(state, c.id) + ' · ' + c.perk,
    cost: c.cost,
    owned: state.hired.includes(c.id),
    afford: money >= c.cost,
  }));
  for (const c of CREW) {
    if (!state.hired.includes(c.id)) continue;
    const level = crewLevel(state, c.id);
    if (level >= CREW_MAX_LEVEL) continue;
    const cost = CREW_TRAIN_COST[level];
    items.push({
      id: 'train-' + c.id,
      label: 'Train ' + c.name + ' to Lv ' + (level + 1) + ' — stronger perk',
      cost,
      owned: false,
      afford: money >= cost,
    });
  }
  return items;
}

// One line under the panel title: who is on the crew, or why Mara
// should hire.
export function crewSummary(state) {
  if (state.hired.length === 0) {
    return 'Nobody on the crew yet. Hire a hand and Solmar gets smaller.';
  }
  const names = state.hired.map((id) => crewById(id).name).join(', ');
  return 'On the crew: ' + names + '. Jobs with a full crew: ' + state.jobs + '.';
}

// The HUD line under the objective: the crew at a glance, with each
// hand's level and the bonus it gives right now.
export function crewStatusLine(state) {
  if (!state || state.hired.length === 0) return '';
  const tags = state.hired.map((id) => {
    const c = crewById(id);
    const lv = crewLevel(state, id);
    return c.role === 'driver'
      ? 'DEE Lv' + lv + ' +' + (6 + 6 * lv) + '% speed'
      : c.role === 'hacker'
        ? 'NIX Lv' + lv + ' ' + (1 + lv) + 'x cool-down'
        : 'SABLE Lv' + lv + ' eyes';
  });
  return 'CREW · ' + tags.join(' · ');
}

// The toast line when a hand joins: short, and it names the perk.
export function crewHiredLine(member) {
  return member.name + ' is on the crew — ' + member.perk + '.';
}

// A hand's name for the pause screen, or a dash when the seat is empty.
export function crewRosterLine(state) {
  if (!state || state.hired.length === 0) return 'Crew: none hired yet';
  return 'Crew: ' + state.hired.map((id) => crewById(id).name).join(', ');
}
