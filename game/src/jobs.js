// jobs.js — Leo's jobs board at the garage: repeatable side jobs for
// Mara between story missions. A job is a short run with a clock: a
// delivery is one timed drop, a pickup is a fetch and a timed return,
// an escort is a three-stop chain with a client riding along. Jobs pay
// by distance and kind, a streak pays more, and the board always offers
// three fresh ones. The garage is where the work is — press J there.

import { PLACES } from './city.js';
import { dist2D, pickWeighted, formatCountdown, formatDuration } from './util.js';
import { garageNear } from './garage.js';

// The board only offers jobs that start at the garage and end
// somewhere a car can actually reach — never the buoys, never the bay.
const JOB_STOPS = Object.entries(PLACES)
  .filter(([, p]) => !p.water)
  .map(([key, p]) => ({ key, ...p }));

// Five kinds, five shapes. A delivery is one timed leg; a pickup is
// a free leg out and a timed leg home; an escort is three timed legs
// with a client who does not like to be kept waiting. A rush job is
// one leg on a short clock — the pay is high because the clock is
// not. A smuggle job is two legs after dark with the best pay on the
// board, and a VIP job is one leg, one very rich client, one very
// short fuse.
export const JOB_KINDS = {
  delivery: { name: 'Delivery', mult: 1.0, legs: 1, blurb: 'Take the package there before the clock runs out.' },
  pickup: { name: 'Pickup', mult: 1.3, legs: 2, blurb: 'Fetch the parcel, then run it home before the clock runs out.' },
  escort: { name: 'Escort', mult: 1.6, legs: 3, blurb: 'Three stops with a client aboard — keep moving, keep the clock happy.' },
  rush: { name: 'Rush', mult: 1.9, legs: 1, clock: 0.6, blurb: 'One leg, one short clock — the pay is high because the clock is not.' },
  smuggle: { name: 'Smuggle', mult: 2.2, legs: 2, blurb: 'Two legs after dark with the best pay on the board. No questions.' },
  vip: { name: 'VIP', mult: 2.5, legs: 1, clock: 0.8, blurb: 'One leg, one very rich client, one very short fuse.' },
  tip: { name: 'Tip-Off', mult: 1.2, legs: 1, blurb: 'Drive a witness to the garage — they know where a fugitive hides, and Leo pays for the tip.' },
  tour: { name: 'Tour', mult: 1.4, legs: 2, blurb: 'Two stops showing tourists the murals and the marina — the city pays for the view.' },
  mural: { name: 'Mural Run', mult: 1.5, legs: 2, blurb: 'Two legs hauling paint and ladders for the Mural Row crew — the city pays for the colour.' },
};

export const JOBS_BOARD_SIZE = 3;
export const JOBS_STREAK_CAP = 0.5; // a streak pays at most +50%

export function makeJobsState() {
  return { active: null, offered: [], done: 0, earned: 0, failed: 0, bestPay: 0, streak: 0 };
}

export function jobsFromSave(saved) {
  const state = makeJobsState();
  if (!saved || typeof saved !== 'object') return state;
  state.done = Number.isFinite(saved.done) ? Math.max(0, Math.floor(saved.done)) : 0;
  state.earned = Number.isFinite(saved.earned) ? Math.max(0, Math.floor(saved.earned)) : 0;
  state.failed = Number.isFinite(saved.failed) ? Math.max(0, Math.floor(saved.failed)) : 0;
  state.bestPay = Number.isFinite(saved.bestPay) ? Math.max(0, Math.floor(saved.bestPay)) : 0;
  state.streak = Number.isFinite(saved.streak) ? Math.max(0, Math.floor(saved.streak)) : 0;
  // An active job from an older save is dropped: its clock cannot be
  // trusted across a reload, and the board always offers fresh work.
  state.active = null;
  state.offered = [];
  return state;
}

// The jobs board lives at the garage — Leo pins the work to his door.
export function jobsNear(x, z) {
  return garageNear(x, z);
}

// Pay by the road: 300 base plus 3 per metre of the longest leg, times
// the kind multiplier. An escort across town pays like an escort
// across town should.
function jobPayFor(kind, legs) {
  const longest = Math.max(...legs.map((leg) => leg.distance));
  const base = 300 + Math.round(longest * 3);
  return Math.round(base * JOB_KINDS[kind].mult);
}

// A leg's clock: the road at 20 m/s plus a grace margin, so a decent
// driver makes it with seconds to spare and a slow one does not.
function legTimeLimit(distance) {
  return Math.ceil(distance / 20) + 30;
}

function pickStop(rng, avoidKeys) {
  const pool = JOB_STOPS.filter((s) => !avoidKeys.includes(s.key));
  const stop = pool[Math.floor((rng ? rng() : Math.random()) * pool.length)];
  return stop;
}

// Roll one job: a kind weighted toward deliveries, a chain of stops
// that never repeats a place, and a clock per leg.
function rollJob(rng) {
  const random = rng || Math.random;
  const kind = pickWeighted([
    ['delivery', 5],
    ['pickup', 3],
    ['escort', 2],
    ['rush', 2],
    ['smuggle', 1],
    ['vip', 1],
  ]);
  const legs = [];
  const used = ['garage'];
  const legCount = JOB_KINDS[kind].legs;
  for (let i = 0; i < legCount; i++) {
    const stop = pickStop(random, used);
    used.push(stop.key);
    const from = i === 0 ? PLACES.garage : legs[i - 1].to;
    const distance = Math.round(dist2D(from.x, from.z, stop.x, stop.z));
    // Rush and VIP jobs run a short clock: the same road, less time.
    const clock = JOB_KINDS[kind].clock || 1;
    legs.push({
      to: { key: stop.key, x: stop.x, z: stop.z, name: stop.name },
      distance,
      timeLimit: Math.ceil(legTimeLimit(distance) * clock),
    });
  }
  const pay = jobPayFor(kind, legs);
  return {
    id: kind + '-' + Math.floor(random() * 90000 + 10000),
    kind,
    legs,
    pay,
    stage: 0,
    timer: null,
  };
}

// The board always offers three: top it up whenever a job is taken or
// the player opens it with an empty board.
export function refreshJobsBoard(state, rng) {
  while (state.offered.length < JOBS_BOARD_SIZE) {
    state.offered.push(rollJob(rng));
  }
  return state.offered;
}

export function jobsBoardLine(state) {
  if (state.active) {
    const job = state.active;
    const leg = job.legs[job.stage];
    return 'Job: ' + JOB_KINDS[job.kind].name + ' → ' + leg.to.name + (job.timer != null ? ' · ' + formatCountdown(job.timer) : '');
  }
  return 'Jobs board: ' + state.offered.length + ' jobs pinned · ' + state.done + ' done';
}

// Take a job off the board. Only one at a time — Leo does not double
// book his best driver, and a job left half-done is a job failed.
export function acceptJob(state, index) {
  if (state.active) return { ok: false, reason: 'Finish the active job first — Leo does not double-book.' };
  const job = state.offered[index];
  if (!job) return { ok: false, reason: 'That job is already gone.' };
  state.offered.splice(index, 1);
  job.stage = 0;
  job.timer = null;
  state.active = job;
  refreshJobsBoard(state);
  return { ok: true, job };
}

// A streak pays: every job done in a row without failing adds 5% to
// the next payout, up to +50%. Fail once and the streak is gone.
export function jobsStreakMult(state) {
  return 1 + Math.min(state.streak * 0.05, JOBS_STREAK_CAP);
}

function jobLegTarget(job) {
  return job.legs[job.stage].to;
}

// One frame of the active job. Returns an event when the job ends, or
// null while Mara is still on the road: reaching a leg's marker moves
// the job on, the clock running out fails it.
export function updateJobs(state, px, pz, dt) {
  const job = state.active;
  if (!job) return null;
  const leg = job.legs[job.stage];
  const target = leg.to;
  const d = dist2D(px, pz, target.x, target.z);
  const timed = job.stage > 0 || job.kind !== 'pickup';
  if (timed && job.timer == null) job.timer = leg.timeLimit;
  if (timed) job.timer -= dt;
  if (d < 12) {
    // Leg done: a delivery ends here, a pickup or escort moves on.
    job.stage += 1;
    job.timer = null;
    if (job.stage >= job.legs.length) {
      const streakPay = Math.round(job.pay * jobsStreakMult(state));
      state.done += 1;
      state.earned += streakPay;
      state.streak += 1;
      state.bestPay = Math.max(state.bestPay, streakPay);
      state.active = null;
      return { type: 'done', job, pay: streakPay };
    }
    return { type: 'stage', job, leg: job.stage };
  }
  if (timed && job.timer <= 0) {
    state.failed += 1;
    state.streak = 0;
    state.active = null;
    return { type: 'failed', job };
  }
  return null;
}

// The board: the active job first, then the three offers, each with
// its route, its clock and its pay. Buttons take the job.
export function jobsMenuItems(state) {
  const items = [];
  if (state.active) {
    const job = state.active;
    const leg = job.legs[job.stage];
    items.push({
      id: 'job-active',
      label: 'ACTIVE: ' + JOB_KINDS[job.kind].name + ' → ' + leg.to.name + ' (leg ' + (job.stage + 1) + '/' + job.legs.length + ')',
      owned: false,
      afford: false,
      cost: 0,
      state: job.timer != null ? formatCountdown(job.timer) + ' left' : 'go to ' + leg.to.name,
    });
  }
  state.offered.forEach((job, i) => {
    const route = job.legs.map((leg) => leg.to.name).join(' → ');
    items.push({
      id: 'job-' + i,
      label: JOB_KINDS[job.kind].name + ': ' + route,
      owned: false,
      afford: true,
      cost: 0,
      state: '$' + job.pay.toLocaleString() + ' · ' + job.legs.length + ' leg' + (job.legs.length > 1 ? 's' : ''),
      pay: job.pay,
    });
  });
  return items;
}

export function jobsSummary(state) {
  const parts = [
    state.done + ' jobs done',
    '$' + state.earned.toLocaleString() + ' earned',
    state.failed + ' failed',
  ];
  if (state.streak > 0) parts.push('streak ' + state.streak + ' (+' + Math.round((jobsStreakMult(state) - 1) * 100) + '% pay)');
  if (state.bestPay > 0) parts.push('best job $' + state.bestPay.toLocaleString());
  return 'Leo\u2019s jobs board — ' + parts.join(' · ') + '. One job at a time, and the clock always runs.';
}

export function jobsStatusLine(state) {
  return 'Jobs: ' + state.done + ' done · $' + state.earned.toLocaleString() + ' earned · streak ' + state.streak;
}

export function jobsTimerLine(state) {
  const job = state.active;
  if (!job || job.timer == null) return null;
  const leg = job.legs[job.stage];
  return JOB_KINDS[job.kind].name + ' → ' + leg.to.name + ' · ' + formatDuration(job.timer);
}

// The board's best offer, for the garage hint: what Leo is paying
// most for right now, so Mara knows whether the drive is worth it.
export function jobsBestOffer(state) {
  if (!state.offered.length) return null;
  let best = state.offered[0];
  for (const job of state.offered) {
    if (job.pay > best.pay) best = job;
  }
  return best;
}
