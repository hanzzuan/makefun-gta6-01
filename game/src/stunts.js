// stunts.js — the Solmar stunt-jump system, built for the final cut.
// Mara finds ramps all over the city — the runway, the film lot, the
// stadium forecourt — and launches the car off them. A jump is scored
// on airtime and entry speed, pays cash, and the best jumps persist in
// the save. Big air runs in slow motion: the whole simulation dips to
// half speed while the car hangs, the camera widens, and the letterbox
// closes in — the jump reads like a shot from the film Mara is
// doubling for. Jax the stunt driver, hired at the safehouse, pays
// 25% more on every jump and holds the slow-mo a beat longer.

import * as THREE from 'three';
import { dist2D, clamp, lerp } from './util.js';

// Eight ramps, all on open ground the car can actually reach: the
// runway strip, the film lot on the beach, the stadium and mall
// forecourts, the harbor apron, the plaza, the marina pier road and
// the campus quad. The heading is the launch direction — the car has
// to hit the ramp roughly along it, or it just drives over the wedge.
export const STUNT_RAMPS = [
  { id: 'runway', name: 'Runway Jump', x: 120, z: 272, heading: Math.PI / 2, blurb: 'The full strip, flat out, off the end of Runway 27.' },
  { id: 'film-lot', name: 'Film Lot Ramp', x: -285, z: 90, heading: Math.PI / 2, blurb: 'The backlot ramp — the stunt crew parks its vans here.' },
  { id: 'stadium', name: 'Stadium Leap', x: 320, z: -30, heading: Math.PI, blurb: 'Off the forecourt, over the north gate, into the bowl.' },
  { id: 'mall', name: 'Mall Air', x: 320, z: 40, heading: 0, blurb: 'The food-court forecourt, straight at the glass.' },
  { id: 'harbor', name: 'Harbor Launch', x: 210, z: -190, heading: 0, blurb: 'Down the dock road, off the apron, over the crates.' },
  { id: 'plaza', name: 'Plaza Kicker', x: 0, z: -60, heading: Math.PI, blurb: 'Up the north avenue, over the fountain wall.' },
  { id: 'marina', name: 'Pier Jump', x: -238, z: 150, heading: Math.PI / 2, blurb: 'The pier road, flat out, with the bay on the left.' },
  { id: 'campus', name: 'Campus Flyer', x: 300, z: 140, heading: -Math.PI / 2, blurb: 'Across the quad, past the clock tower, into the crowd.' },
];

export const STUNT_SET_BONUS = 5000; // every ramp jumped once
export const STUNT_DUEL_REWARD = 300; // beating a rival's posted jump

// The title ladder: the more jumps, the bigger the name. The set
// bonus pays the legend title on its own — eight ramps, one legend.
export const STUNT_TITLES = [
  { jumps: 0, title: 'Rookie' },
  { jumps: 5, title: 'Jump Kid' },
  { jumps: 15, title: 'Airtime Ace' },
  { jumps: 30, title: 'Ramp King' },
  { jumps: 50, title: 'Stunt Legend' },
];

export function makeStuntState() {
  return {
    jumped: [], // ramp ids Mara has cleared at least once
    bestAirByRamp: {}, // ramp id -> best airtime in seconds
    bestAir: 0,
    bestScore: 0,
    jumps: 0,
    earned: 0,
    setPaid: false,
    combo: 0, // jumps chained inside the 20-second window
    comboUntil: 0, // game time when the chain breaks
    bestCombo: 0, // longest chain Mara has ever run
    air: null, // live jump: { ramp, t, duration, peak, speed }
    airY: 0, // current height of the car above the road, metres
    cooldowns: {}, // ramp id -> game time when it can trigger again
    lastLanding: null, // { score, ramp, airSeconds, time } — the rivals read this
  };
}

export function stuntsFromSave(saved) {
  const state = makeStuntState();
  if (!saved) return state;
  if (Array.isArray(saved.jumped)) state.jumped = saved.jumped.filter((id) => STUNT_RAMPS.some((r) => r.id === id));
  if (saved.bestAirByRamp) state.bestAirByRamp = saved.bestAirByRamp;
  if (typeof saved.bestAir === 'number') state.bestAir = saved.bestAir;
  if (typeof saved.bestScore === 'number') state.bestScore = saved.bestScore;
  if (typeof saved.jumps === 'number') state.jumps = saved.jumps;
  if (typeof saved.earned === 'number') state.earned = saved.earned;
  if (saved.setPaid) state.setPaid = true;
  if (typeof saved.bestCombo === 'number') state.bestCombo = saved.bestCombo;
  return state;
}

// The ramps themselves: a low orange wedge with chevron stripes and a
// flag, so the launch reads from a block away. The wedge is visual
// only — the car launches on the trigger zone before it, so it is
// already rising as it crosses the ramp.
export function buildStuntRamps(scene) {
  const meshes = [];
  const wedgeMat = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.7 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffe14a, roughness: 0.6 });
  const flagMat = new THREE.MeshBasicMaterial({ color: 0xff5c5c });
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.5, metalness: 0.6 });
  for (const ramp of STUNT_RAMPS) {
    const group = new THREE.Group();
    const wedge = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.1, 5.2), wedgeMat);
    wedge.position.y = 0.55;
    wedge.rotation.x = -0.32; // the slope rises toward the launch direction
    wedge.castShadow = true;
    group.add(wedge);
    for (const sx of [-0.9, 0.9]) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 4.6), stripeMat);
      stripe.position.set(sx, 1.15, 0);
      stripe.rotation.x = -0.32;
      group.add(stripe);
    }
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.4, 6), poleMat);
    pole.position.set(2.2, 1.7, -2.2);
    group.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7), flagMat);
    flag.position.set(2.75, 3.0, -2.2);
    flag.material.side = THREE.DoubleSide;
    group.add(flag);
    group.position.set(ramp.x, 0, ramp.z);
    group.rotation.y = ramp.heading;
    scene.add(group);
    meshes.push(group);
  }
  return meshes;
}

// How far the car's nose is off the ramp's launch line, in radians.
function headingDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// One frame of the stunt system. Returns an event for the main loop
// to bank — a launch, a landing, or nothing. The car is the player
// car (or null on foot); time is game.time for the re-trigger cooldown.
// A ramp by id, for the loop and the board — the runway by default,
// so a bad id never leaves the game without a ramp.
export function stuntRampById(id) {
  return STUNT_RAMPS.find((r) => r.id === id) || STUNT_RAMPS[0];
}

export function updateStunts(state, car, dt, time) {
  state.airY = 0;
  if (state.air) {
    const air = state.air;
    air.t += dt;
    const u = clamp(air.t / air.duration, 0, 1);
    // A clean parabola: up off the ramp, hang at the peak, down to the road.
    state.airY = air.peak * 4 * u * (1 - u);
    if (air.t >= air.duration) {
      state.air = null;
      state.airY = 0;
      const airSeconds = air.duration;
      const ramp = stuntRampById(air.ramp);
      const isRecord = airSeconds > state.bestAir;
      // The combo: land one jump and the next one inside twenty seconds
      // chains — each link pays half again, up to three times. A chain
      // breaks the moment the clock runs out, so the line between ramps
      // is the whole game.
      const chained = time < state.comboUntil;
      state.combo = chained ? state.combo + 1 : 1;
      state.comboUntil = time + 20;
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      const comboMult = Math.min(3, 1 + 0.5 * (state.combo - 1));
      // The ramp of the day pays double: the backlot posts one ramp
      // every morning, and the stunt crew all runs it.
      const daily = stuntDailyRamp();
      const isDaily = daily.id === ramp.id;
      const score = Math.round((airSeconds * 100 + air.speed * 2) * comboMult * (isDaily ? 2 : 1));
      state.jumps += 1;
      state.bestAir = Math.max(state.bestAir, airSeconds);
      state.bestScore = Math.max(state.bestScore, score);
      if (!state.jumped.includes(ramp.id)) state.jumped.push(ramp.id);
      state.bestAirByRamp[ramp.id] = Math.max(state.bestAirByRamp[ramp.id] || 0, airSeconds);
      state.lastLanding = { score, ramp: ramp.id, airSeconds, time };
      return { type: 'landed', ramp, airSeconds, speed: air.speed, score, isRecord, combo: state.combo, comboMult, daily: isDaily };
    }
    return null;
  }
  if (!car || Math.abs(car.speed) < 12) return null;
  for (const ramp of STUNT_RAMPS) {
    if ((state.cooldowns[ramp.id] || 0) > time) continue;
    if (dist2D(car.x, car.z, ramp.x, ramp.z) > 5) continue;
    if (Math.abs(headingDiff(car.heading, ramp.heading)) > 1.1) continue;
    const speed = Math.abs(car.speed);
    state.air = {
      ramp: ramp.id,
      t: 0,
      duration: Math.min(1.5, 0.55 + speed * 0.012),
      peak: Math.min(6.5, 2.2 + speed * 0.08),
      speed,
    };
    state.cooldowns[ramp.id] = time + 4;
    return { type: 'launched', ramp };
  }
  return null;
}

// The slow-mo: while the car is high in the air the whole simulation
// runs at a little over half speed — the jump hangs, the camera widens,
// and the letterbox closes in. The launch itself stays real-time so
// the takeoff still has punch.
export function stuntTimeScale(state) {
  if (!state.air) return 1;
  if (state.air.t < 0.15) return 1;
  return state.airY > 1.5 ? 0.55 : 1;
}

// Jax the stunt driver holds the slow-mo a beat longer: the dip lasts
// until the car is nearly down, not just past the peak.
export function stuntTimeScaleWithCrew(state, hasJax) {
  if (!state.air) return 1;
  if (state.air.t < 0.15) return 1;
  return state.airY > (hasJax ? 0.7 : 1.5) ? 0.55 : 1;
}

export function stuntTitle(state) {
  if (state.setPaid) return 'Stunt Legend';
  let title = 'Rookie';
  for (const row of STUNT_TITLES) {
    if (state.jumps >= row.jumps) title = row.title;
  }
  return title;
}

export function stuntSetDone(state) {
  return STUNT_RAMPS.every((r) => state.jumped.includes(r.id));
}

// The nearest ramp Mara has not jumped yet, and how far away it is —
// the hint line uses it so the player always knows where the next
// launch is.
export function nearestUnjumpedRamp(state, x, z) {
  let best = null;
  let bestD = Infinity;
  for (const ramp of STUNT_RAMPS) {
    if (state.jumped.includes(ramp.id)) continue;
    const d = dist2D(x, z, ramp.x, ramp.z);
    if (d < bestD) {
      bestD = d;
      best = ramp;
    }
  }
  return best ? { ramp: best, dist: bestD } : null;
}

// The ramp of the day: one ramp every morning, picked by the calendar,
// so the whole stunt crew runs the same launch on the same day. The
// daily ramp pays double — the backlot's own little festival.
export function stuntDailyRamp() {
  const day = Math.floor(Date.now() / 86400000);
  return STUNT_RAMPS[day % STUNT_RAMPS.length];
}

// The live combo line for the HUD: what the chain is paying right now,
// and how long Mara has to keep it alive.
export function stuntComboLine(state, time) {
  if (!state || state.combo <= 1 || time >= state.comboUntil) return '';
  const mult = Math.min(3, 1 + 0.5 * (state.combo - 1));
  return 'Combo ×' + mult.toFixed(1) + ' — ' + state.combo + ' jumps chained, ' + Math.ceil(state.comboUntil - time) + 's to keep it alive.';
}

// The next rung on the title ladder: what Mara is jumping toward,
// and how many jumps it takes to get there.
export function stuntNextTitle(state) {
  for (const row of STUNT_TITLES) {
    if (state.jumps < row.jumps) return { title: row.title, need: row.jumps - state.jumps };
  }
  return null;
}

export function stuntStatusLine(state) {
  if (state.jumps === 0) return 'No jumps yet — eight ramps wait around Solmar.';
  const chain = state.bestCombo > 1 ? ' · best chain ' + state.bestCombo + ' jumps' : '';
  return state.jumps + ' jumps · best air ' + state.bestAir.toFixed(2) + 's · ' + stuntTitle(state) + chain;
}

// A line for the radio: Reel FM calls out the jump to beat, and the
// film lot's stunt crew talks about Mara's last launch.
export function stuntRumor(state) {
  if (state.jumps === 0) return 'Reel FM hears the Runway Jump is the one to beat — flat out down the strip, off the end, and don\\u2019t look down.';
  const bestRamp = STUNT_RAMPS.find((r) => (state.bestAirByRamp[r.id] || 0) === state.bestAir) || STUNT_RAMPS[0];
  return 'Reel FM: Mara Voss hung ' + state.bestAir.toFixed(2) + 's in the air off the ' + bestRamp.name + ' — the stunt crew is still talking about it.';
}

// The stunt board at the garage: every ramp, whether Mara has cleared
// it, and the best air off each one. Rows mirror the graffiti panel.
export function stuntMenuItems(state) {
  const items = STUNT_RAMPS.map((ramp) => {
    const best = state.bestAirByRamp[ramp.id] || 0;
    return {
      id: 'ramp:' + ramp.id,
      label: ramp.name,
      owned: state.jumped.includes(ramp.id),
      sub: (state.jumped.includes(ramp.id) ? 'Cleared — best ' + best.toFixed(2) + 's in the air' : 'Not jumped yet') + ' · ' + ramp.blurb,
    };
  });
  items.push({
    id: 'stunt:daily',
    label: 'Ramp of the day: ' + stuntDailyRamp().name,
    badge: 'DAILY ×2',
    sub: 'Double pay on the ' + stuntDailyRamp().name + ' today — ' + stuntDailyRamp().blurb,
  });
  items.push({
    id: 'stunt:summary',
    label: stuntStatusLine(state),
    sub: state.setPaid
      ? 'Every ramp cleared — the $' + STUNT_SET_BONUS.toLocaleString() + ' set bonus is banked.'
      : STUNT_RAMPS.length - state.jumped.length + ' ramps left for the $' + STUNT_SET_BONUS.toLocaleString() + ' set bonus.',
  });
  return items;
}

export function stuntSummary(state) {
  const chain = state.bestCombo > 1 ? ' · best chain ' + state.bestCombo + ' jumps' : '';
  const next = stuntNextTitle(state);
  const toward = next ? ' · next: ' + next.title + ' in ' + next.need + ' jumps' : ' · the ladder is climbed — Stunt Legend.';
  return 'Stunt jumps: ' + state.jumps + ' · earned $' + state.earned.toLocaleString() + ' · ' + stuntTitle(state) + chain + toward;
}
