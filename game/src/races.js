// races.js — street races: checkpoint circuits around Solmar.
// Drive to a race start marker and press R to enter. Each race is a
// chain of glowing gates: pass them in order, beat the par time for a
// bigger payout. Best times persist in the save and count toward the
// racer stats line on the HUD.

import * as THREE from 'three';
import { formatRaceTime } from './util.js';

export const RACE_ROUTES = [
  {
    id: 'plaza-sprint',
    name: 'Plaza Sprint',
    start: { x: 0, z: -40 },
    checkpoints: [
      { x: 70, z: -70 },
      { x: 140, z: -70 },
      { x: 140, z: 0 },
      { x: 70, z: 70 },
      { x: 0, z: 70 },
      { x: -70, z: 0 },
      { x: 0, z: -40 },
    ],
    par: 45,
    payout: 1200,
    blurb: 'A tight downtown loop around the plaza.',
  },
  {
    id: 'mural-mile',
    name: 'Mural Mile',
    start: { x: 315, z: 100 },
    checkpoints: [
      { x: 315, z: 40 },
      { x: 315, z: -30 },
      { x: 320, z: -70 },
      { x: 315, z: 0 },
      { x: 315, z: 70 },
      { x: 320, z: 140 },
      { x: 315, z: 100 },
    ],
    par: 55,
    payout: 1600,
    blurb: 'Down the East avenue past the campus mural and back — the taggers time it.',
  },
  {
    id: 'resort-run',
    name: 'Resort Run',
    start: { x: -140, z: 190 },
    checkpoints: [
      { x: -70, z: 140 },
      { x: 0, z: 140 },
      { x: 70, z: 140 },
      { x: 140, z: 140 },
      { x: 140, z: 215 },
      { x: 70, z: 215 },
      { x: 0, z: 215 },
      { x: -70, z: 215 },
      { x: -140, z: 190 },
    ],
    par: 60,
    payout: 1800,
    blurb: 'The south loop past the resort pool and the airport fence — the casino crowd watches from the door.',
  },
  {
    id: 'downtown-dash',
    name: 'Downtown Dash',
    start: { x: 0, z: -40 },
    checkpoints: [
      { x: -70, z: -40 },
      { x: -100, z: -40 },
      { x: -70, z: 0 },
      { x: 0, z: 70 },
      { x: 70, z: 0 },
      { x: 70, z: -70 },
      { x: 0, z: -40 },
    ],
    par: 40,
    payout: 1000,
    blurb: 'A short downtown sprint past Mural Row — the taggers cheer the winner.',
  },
  {
    id: 'bounty-run',
    name: 'Bounty Run',
    start: { x: -40, z: -80 },
    checkpoints: [
      { x: -40, z: -40 },
      { x: 70, z: -70 },
      { x: 140, z: -140 },
      { x: 210, z: -140 },
      { x: 210, z: -210 },
      { x: 140, z: -210 },
      { x: 0, z: -140 },
      { x: -40, z: -80 },
    ],
    par: 60,
    payout: 2600,
    blurb: 'A hunt lap past the back alley, the garage and the harbor — where the fugitives hide.',
  },
  {
    id: 'harbor-loop',
    name: 'Harbor Loop',
    start: { x: -140, z: -140 },
    checkpoints: [
      { x: -210, z: -140 },
      { x: -280, z: -70 },
      { x: -210, z: 0 },
      { x: -140, z: -70 },
      { x: -70, z: -140 },
      { x: -140, z: -140 },
    ],
    par: 55,
    payout: 1800,
    blurb: 'A fast circuit past the docks and the marina.',
  },
  {
    id: 'runway-dash',
    name: 'Runway Dash',
    start: { x: -20, z: 272 },
    checkpoints: [
      { x: 60, z: 272 },
      { x: 140, z: 272 },
      { x: 220, z: 272 },
      { x: 260, z: 250 },
      { x: 180, z: 240 },
      { x: 100, z: 250 },
      { x: -20, z: 272 },
    ],
    par: 40,
    payout: 2400,
    blurb: 'Flat-out down Runway 27 and back past the terminal.',
  },
  {
    id: 'lighthouse-loop',
    name: 'Lighthouse Loop',
    start: { x: -280, z: -140 },
    checkpoints: [
      { x: -320, z: -180 },
      { x: -300, z: -210 },
      { x: -260, z: -140 },
      { x: -200, z: -70 },
      { x: -140, z: -140 },
      { x: -280, z: -140 },
    ],
    par: 55,
    payout: 2600,
    blurb: 'A night loop out to the dockside pier and back past the marina.',
  },
  {
    id: 'airport-run',
    name: 'Airport Run',
    start: { x: 140, z: 215 },
    checkpoints: [
      { x: 60, z: 272 },
      { x: -20, z: 272 },
      { x: -20, z: 200 },
      { x: 60, z: 200 },
      { x: 140, z: 215 },
    ],
    par: 40,
    payout: 2200,
    blurb: 'A flat circuit around the terminal and back past the tower.',
  },
  {
    id: 'campus-circuit',
    name: 'Campus Circuit',
    start: { x: 320, z: 140 },
    checkpoints: [
      { x: 320, z: 70 },
      { x: 320, z: -70 },
      { x: 280, z: -70 },
      { x: 280, z: 140 },
      { x: 320, z: 140 },
    ],
    par: 45,
    payout: 2000,
    blurb: 'A tight loop around the quad, the stadium, and the dorms.',
  },
  {
    id: 'campus-circuit',
    name: 'Campus Circuit',
    start: { x: 315, z: 140 },
    checkpoints: [
      { x: 360, z: 140 },
      { x: 360, z: 40 },
      { x: 315, z: 40 },
      { x: 280, z: 40 },
      { x: 280, z: 140 },
      { x: 315, z: 140 },
    ],
    par: 40,
    payout: 2000,
    blurb: 'Around the campus quad and the mall forecourt, down the east side and back up the lawn.',
  },
  {
    id: 'stadium-sprint',
    name: 'Stadium Sprint',
    start: { x: 315, z: 0 },
    checkpoints: [
      { x: 370, z: 0 },
      { x: 370, z: -112 },
      { x: 370, z: 40 },
      { x: 315, z: 40 },
      { x: 315, z: 0 },
    ],
    par: 42,
    payout: 1600,
    blurb: 'A fast loop around the stadium bowl, east past the stands and back down the avenue.',
  },
  {
    id: 'casino-loop',
    name: 'Casino Loop',
    start: { x: -140, z: 210 },
    checkpoints: [
      { x: -70, z: 210 },
      { x: 0, z: 210 },
      { x: 70, z: 210 },
      { x: 140, z: 210 },
      { x: 140, z: 140 },
      { x: 70, z: 140 },
      { x: -70, z: 140 },
      { x: -140, z: 140 },
      { x: -140, z: 210 },
    ],
    par: 50,
    payout: 2200,
    blurb: 'A high-roller loop past the casino door and the airport road, back to the resort.',
  },
  {
    id: 'club-loop',
    name: 'Club Loop',
    start: { x: -70, z: -70 },
    checkpoints: [
      { x: -70, z: 0 },
      { x: 0, z: 0 },
      { x: 70, z: 0 },
      { x: 70, z: -70 },
      { x: 0, z: -70 },
      { x: -70, z: -70 },
    ],
    par: 48,
    payout: 2400,
    blurb: 'A neon night run from Club Neon, around the plaza and back to the door — the crowd watches from the pavement.',
  },
  {
    id: 'downtown-loop',
    name: 'Downtown Loop',
    start: { x: 0, z: -40 },
    checkpoints: [
      { x: 0, z: 40 },
      { x: 70, z: 40 },
      { x: 70, z: -40 },
      { x: 140, z: -40 },
      { x: 140, z: 40 },
      { x: 70, z: 40 },
      { x: 0, z: 40 },
      { x: 0, z: -40 },
    ],
    par: 55,
    payout: 2600,
    blurb: 'A tight downtown loop past the plaza, the tower and the cafe — the city watches from every corner.',
  },
  {
    id: 'harbor-sprint',
    name: 'Harbor Sprint',
    start: { x: 210, z: -190 },
    checkpoints: [
      { x: 210, z: -140 },
      { x: 210, z: -90 },
      { x: 160, z: -90 },
      { x: 160, z: -140 },
      { x: 160, z: -190 },
      { x: 210, z: -190 },
    ],
    par: 44,
    payout: 2300,
    blurb: 'A flat-out sprint through the cannery yard and the container stacks — no room for a mistake.',
  },
];

export function makeRaceState() {
  return {
    active: null, // the route being raced, or null
    checkpoint: 0,
    time: 0,
    best: {}, // routeId -> best seconds
    wins: 0,
    gates: [],
    countdown: 0,
  };
}

export function raceFromSave(saved) {
  const state = makeRaceState();
  if (saved && typeof saved === 'object') {
    if (saved.best && typeof saved.best === 'object') {
      for (const [id, t] of Object.entries(saved.best)) {
        if (Number.isFinite(t)) state.best[id] = t;
      }
    }
    state.wins = Math.max(0, Number(saved.wins) || 0);
  }
  return state;
}

// The nearest race whose start marker the player is close to, or null.
// The marker only shows when the player is in a car — races are for
// drivers, not pedestrians.
export function raceNearStart(x, z) {
  let found = null;
  let bestD = 22 * 22;
  for (const route of RACE_ROUTES) {
    const dx = x - route.start.x;
    const dz = z - route.start.z;
    const d = dx * dx + dz * dz;
    if (d < bestD) {
      bestD = d;
      found = route;
    }
  }
  return found;
}

// Permanent start markers: one slim green ring at each route's start
// line, so a driver can find the races without a map. The full gates
// only appear while a race is live.
export function buildRaceStartMarkers(scene) {
  const markers = [];
  for (const route of RACE_ROUTES) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(4.2, 0.22, 8, 20),
      new THREE.MeshBasicMaterial({ color: 0x7dff8a, transparent: true, opacity: 0.6 }),
    );
    ring.position.set(route.start.x, 3.2, route.start.z);
    scene.add(ring);
    markers.push(ring);
  }
  return markers;
}

// Build the glowing gates for a route. Gates are torus rings standing
// upright on the road, the next one bright, later ones dimmer. Returns
// the gate meshes so the caller can move them out when the race ends.
export function buildRaceGates(scene, route) {
  const gates = [];
  for (let i = 0; i < route.checkpoints.length; i++) {
    const cp = route.checkpoints[i];
    const gate = new THREE.Mesh(
      new THREE.TorusGeometry(4.2, 0.35, 8, 20),
      new THREE.MeshBasicMaterial({
        color: i === 0 ? 0xffc230 : 0x2e6fd8,
        transparent: true,
        opacity: i === 0 ? 0.95 : 0.45,
      }),
    );
    gate.position.set(cp.x, 3.2, cp.z);
    // Face the gate along the direction of travel: look at the next
    // checkpoint so the ring reads as a doorway, not a wall.
    const next = route.checkpoints[(i + 1) % route.checkpoints.length];
    gate.lookAt(next.x, 3.2, next.z);
    scene.add(gate);
    gates.push(gate);
    // A light post beside each gate so the route reads at night too.
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 4.5, 6),
      new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.6 }),
    );
    post.position.set(cp.x + 4.6, 2.25, cp.z);
    scene.add(post);
    gates.push(post);
  }
  return gates;
}

export function clearRaceGates(scene, gates) {
  for (const gate of gates || []) {
    scene.remove(gate);
    if (gate.geometry) gate.geometry.dispose();
    if (gate.material) gate.material.dispose();
  }
  return [];
}

export function startRace(state, route) {
  state.active = route;
  state.checkpoint = 0;
  state.time = 0;
  state.countdown = 3;
  return state;
}

export function cancelRace(state) {
  state.active = null;
  state.checkpoint = 0;
  state.time = 0;
  state.countdown = 0;
}

// One frame of racing. Returns null while nothing happens, or an
// event: { type: 'checkpoint', index, total } or { type: 'finish',
// time, payout, isBest }. The caller pays out the cash and shows the
// result; the state is reset by finishRace.
export function updateRace(state, px, pz, dt) {
  if (!state.active) return null;
  if (state.countdown > 0) {
    state.countdown -= dt;
    if (state.countdown > 0) return null;
    state.countdown = 0;
    return { type: 'go' };
  }
  state.time += dt;
  const cp = state.active.checkpoints[state.checkpoint];
  const dx = px - cp.x;
  const dz = pz - cp.z;
  if (dx * dx + dz * dz < 7 * 7) {
    state.checkpoint += 1;
    if (state.checkpoint >= state.active.checkpoints.length) {
      const time = state.time;
      const payout = raceReward(state.active, time);
      const prev = state.best[state.active.id];
      const isBest = prev === undefined || time < prev;
      if (isBest) state.best[state.active.id] = time;
      state.wins += 1;
      const event = { type: 'finish', time, payout, isBest, route: state.active };
      cancelRace(state);
      return event;
    }
    return { type: 'checkpoint', index: state.checkpoint, total: state.active.checkpoints.length };
  }
  return null;
}

// Payout: full amount for beating par, half for finishing, plus a
// $500 bonus for a new personal best.
export function raceReward(route, time) {
  const base = time <= route.par ? route.payout : Math.round(route.payout / 2);
  return base;
}

export function raceObjective(state) {
  if (!state.active) return null;
  if (state.countdown > 0) {
    return `${state.active.name} — ${Math.ceil(state.countdown)}…`;
  }
  const cp = state.active.checkpoints[state.checkpoint];
  return `${state.active.name} — ${formatRaceTime(state.time)} · Gate ${state.checkpoint + 1}/${state.active.checkpoints.length}`;
}

// A one-line progress readout for the HUD: how far through the race
// Mara is, and whether she is ahead of her best time.
export function raceProgressText(state) {
  if (!state.active) return null;
  const done = state.checkpoint / state.active.checkpoints.length;
  const best = state.best[state.active.id];
  const ahead = best !== undefined && state.time < best;
  const pct = Math.round(done * 100);
  return `${pct}% through · ${formatRaceTime(state.time)}${best !== undefined ? (ahead ? ' · ahead of best' : ' · best ' + formatRaceTime(best)) : ''}`;
}

export function raceBestLine(state) {
  const parts = [];
  for (const route of RACE_ROUTES) {
    const best = state.best[route.id];
    parts.push(`${route.name} ${best !== undefined ? formatRaceTime(best) : '—'}`);
  }
  return parts.join(' · ');
}

export function raceStatusLine(state) {
  const parts = [];
  for (const route of RACE_ROUTES) {
    const best = state.best[route.id];
    parts.push(`${route.name} ${best !== undefined ? formatRaceTime(best) : '—'}`);
  }
  return `Races won: ${state.wins} · ${parts.join(' · ')}`;
}
