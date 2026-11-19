// events.js — dynamic city events.
// Solmar is not a backdrop: things happen in it while Mara drives.
// Every minute or so the city rolls an event — roadworks blocking a
// lane, a parade crossing the plaza, a PD checkpoint on the avenue, a
// street festival that pulls a crowd to the plaza, or fireworks over
// the marina that light up the whole bay. Events are timed: they
// arrive with a toast, they run for about a minute, and they leave.
// A clean run through a checkpoint pays a little bonus; a festival or
// fireworks is just the city being alive. The state counts every event
// for the pause screen, so Mara can see what Solmar threw at her.

import * as THREE from 'three';
import { rand, pick } from './util.js';
import { randomRoadPoint } from './city.js';
import { spawnPedestrianAt, spawnTaggerCrew } from './pedestrians.js';
import { makeCar } from './cars.js';

export const EVENT_DURATION = 55; // seconds an event stays live
export const CHECKPOINT_BONUS = 150; // clean pass through a checkpoint

const EVENT_KINDS = [
  { kind: 'roadworks', weight: 30, blurb: 'Roadworks ahead — the crew is digging up the avenue.' },
  { kind: 'parade', weight: 20, blurb: 'A parade is crossing the plaza — the whole city is out.' },
  { kind: 'checkpoint', weight: 25, blurb: 'PD checkpoint ahead — drive through clean and slow.' },
  { kind: 'festival', weight: 25, blurb: 'A street festival at the plaza — music, crowds, food carts.' },
  { kind: 'fireworks', weight: 15, blurb: 'Fireworks over the marina — the whole bay is watching.' },
  { kind: 'casino-night', weight: 12, blurb: 'Casino night at the resort — high rollers, live music, and the tables are hot.' },
  { kind: 'showroom', weight: 10, blurb: 'A rare car was spotted near the garage — the collectors are out.' },
  { kind: 'market', weight: 18, blurb: 'Market day at the plaza — stalls, crowds, and a food cart with a queue.' },
  { kind: 'airshow', weight: 8, blurb: 'An airshow over the bay — a jet is looping the lighthouse.' },
  { kind: 'club-night', weight: 12, blurb: 'Club night at Club Neon — the dance floor is packed and the DJ is on fire.' },
  { kind: 'street-race', weight: 10, blurb: 'An illegal street race is forming on the avenue — the crowd is gathering and the engines are warm.' },
  { kind: 'bounty-hunt', weight: 10, blurb: 'A bounty hunt is on — the PD wants a fugitive, Vex is already driving, and the reward is cash.' },
  { kind: 'street-art', weight: 10, blurb: 'A street-art fair at Mural Row — the taggers are out and the walls are open.' },
  { kind: 'mural-tour', weight: 8, blurb: 'A mural tour at Mural Row — a bus full of tourists, cameras out, and the walls are the show.' },
  { kind: 'stunt-show', weight: 8, blurb: 'A stunt show at the film lot — the ramps are out and the crowd is gathering.' },
];

// The stunt show's rotating bill: the backlot never runs the same
// show twice — a different act, a different dare, every time the
// crowd gathers at the film lot.
export const STUNT_SHOW_BLURBS = [
  'A stunt show at the film lot — the ramps are out and the crowd is gathering.',
  'A stunt show at the film lot — tonight: the runway jump, live, and Mara Voss is doubling.',
  'A stunt show at the film lot — the stunt crew is betting on the air, and the crowd is betting on Mara.',
  'A stunt show at the film lot — two ramps, one car, and the cameras are rolling.',
  'A stunt show at the film lot — DJ Marlow is on the loudspeaker and the crowd wants air.',
];
export function stuntShowBlurb() {
  return STUNT_SHOW_BLURBS[Math.floor(Math.random() * STUNT_SHOW_BLURBS.length)];
}

export function makeEventState() {
  return {
    active: null, // { kind, x, z, left, props, clean, paid }
    timer: 50 + Math.random() * 40, // seconds until the next event
    stats: { roadworks: 0, parade: 0, checkpoint: 0, festival: 0, fireworks: 0, 'casino-night': 0, 'club-night': 0, 'street-race': 0, showroom: 0, market: 0, airshow: 0, 'street-art': 0, 'mural-tour': 0, 'stunt-show': 0 },
    total: 0,
  };
}

export function eventFromSave(saved) {
  const state = makeEventState();
  if (!saved || typeof saved !== 'object') return state;
  if (saved.stats && typeof saved.stats === 'object') {
    for (const k of ['roadworks', 'parade', 'checkpoint', 'festival', 'fireworks', 'casino-night', 'club-night', 'street-race', 'showroom', 'market', 'airshow', 'street-art', 'mural-tour', 'stunt-show']) {
      state.stats[k] = Math.max(0, Number(saved.stats[k]) || 0);
    }
  }
  state.total = Math.max(0, Number(saved.total) || 0);
  return state;
}

function pickKind() {
  const total = EVENT_KINDS.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * total;
  for (const e of EVENT_KINDS) {
    roll -= e.weight;
    if (roll <= 0) return e;
  }
  return EVENT_KINDS[0];
}

// Build the props for an event at (x, z): cones and a barrier for
// roadworks, a marching crowd for a parade, barriers and a sign for a
// checkpoint, a crowd and food carts for a festival. Returns the prop
// meshes so the caller can clear them when the event ends.
export function buildEventProps(scene, kind, x, z) {
  const props = [];
  const coneMat = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.7 });
  const barrierMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.6 });
  function cone(cx, cz) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 8), coneMat);
    c.position.set(cx, 0.6, cz);
    c.castShadow = true;
    scene.add(c);
    props.push(c);
    return c;
  }
  function barrier(cx, cz, rot) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.1, 0.4), barrierMat);
    b.position.set(cx, 0.55, cz);
    b.rotation.y = rot || 0;
    b.castShadow = true;
    scene.add(b);
    props.push(b);
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(4.5, 0.3, 0.42),
      new THREE.MeshStandardMaterial({ color: 0xd8382e, roughness: 0.6 }),
    );
    stripe.position.set(cx, 0.75, cz);
    stripe.rotation.y = rot || 0;
    scene.add(stripe);
    props.push(stripe);
    return b;
  }
  if (kind === 'roadworks') {
    // A lane closed off with cones, and a digger's barrier across it.
    for (let i = -2; i <= 2; i++) {
      cone(x + i * 3, z - 6);
      cone(x + i * 3, z + 6);
    }
    barrier(x, z, 0);
    const mound = new THREE.Mesh(
      new THREE.ConeGeometry(3, 2.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x6a5a42, roughness: 1 }),
    );
    mound.position.set(x + 8, 1.1, z);
    scene.add(mound);
    props.push(mound);
  } else if (kind === 'parade') {
    // A marching crowd: eight walkers in a loose line across the road,
    // with two escort cars' worth of cones marking the route.
    for (let i = 0; i < 8; i++) {
      const ped = spawnPedestrianAt(scene, x + (i % 4) * 2.4 - 3.6, z + Math.floor(i / 4) * 3, pick(['walker', 'tourist', 'jogger']));
      ped.wait = 999; // the parade holds its line while the event runs
      ped.speed = 0;
      props.push(ped.mesh);
    }
    cone(x - 10, z - 8);
    cone(x + 10, z - 8);
    cone(x - 10, z + 8);
    cone(x + 10, z + 8);
  } else if (kind === 'checkpoint') {
    // A PD checkpoint: barriers across the road and cones funnelling
    // traffic through a single gap.
    barrier(x, z - 4, 0);
    barrier(x, z + 4, 0);
    for (let i = -1; i <= 1; i++) {
      cone(x - 6 + i * 2, z);
      cone(x + 6 - i * 2, z + 10);
    }
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(3, 1.4, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x1a2a4a, roughness: 0.6 }),
    );
    sign.position.set(x, 2.6, z - 8);
    scene.add(sign);
    props.push(sign);
  } else if (kind === 'fireworks') {
    // Fireworks over the bay: five coloured bursts hanging above the
    // water, each with its own phase so they bloom one after another,
    // and a crowd of watchers on the marina facing the show.
    const burstColors = [0xff5c5c, 0xffd23e, 0x7dff8a, 0x7ab8ff, 0xff7ad8];
    for (let i = 0; i < 5; i++) {
      const burst = new THREE.Mesh(
        new THREE.SphereGeometry(2.2 + (i % 2), 12, 10),
        new THREE.MeshBasicMaterial({ color: burstColors[i], transparent: true, opacity: 0.9 }),
      );
      burst.position.set(x - 30 - i * 6, 18 + (i % 3) * 6, z - 12 + i * 7);
      burst.userData.burst = true;
      burst.userData.phase = i * 1.3;
      scene.add(burst);
      props.push(burst);
    }
    for (let i = 0; i < 6; i++) {
      const ped = spawnPedestrianAt(scene, x + 24 + rand(-6, 6), z + (i - 3) * 3.5, pick(['walker', 'tourist', 'guest']));
      ped.wait = 999;
      ped.speed = 0;
      props.push(ped.mesh);
    }
  } else if (kind === 'casino-night') {
    // Casino night at the resort: high rollers and dealers gather at
    // the casino door, and a gold glow hangs over the tables — the
    // resort pays for the music, and the house pays for the lights.
    for (let i = 0; i < 8; i++) {
      const ped = spawnPedestrianAt(scene, x + rand(-14, 14), z + rand(-8, 10), pick(['guest', 'dealer', 'tourist']));
      ped.wait = 999;
      ped.speed = 0;
      props.push(ped.mesh);
    }
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(3, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xf2c230, transparent: true, opacity: 0.35 }),
    );
    glow.position.set(x, 5, z);
    glow.userData.burst = true;
    glow.userData.phase = 0;
    scene.add(glow);
    props.push(glow);
  } else if (kind === 'club-night') {
    // Club night at Club Neon: the dance floor spills out the door,
    // clubbers in neon, and a pink glow over the avenue — the club
    // pays for the lights, and the crowd pays for the night.
    for (let i = 0; i < 8; i++) {
      const ped = spawnPedestrianAt(scene, x + rand(-14, 14), z + rand(-8, 10), pick(['clubber', 'clubber', 'tourist']));
      ped.wait = 999;
      ped.speed = 0;
      props.push(ped.mesh);
    }
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(3, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xff2e88, transparent: true, opacity: 0.35 }),
    );
    glow.position.set(x, 5, z);
    glow.userData.burst = true;
    glow.userData.phase = 0;
    scene.add(glow);
    props.push(glow);
  } else if (kind === 'street-race') {
    // An illegal street race forming on the avenue: two parked racers
    // nose to nose, a crowd on the pavement, and cones marking the
    // start line — the engines are warm and the money is already down.
    for (const [rx, rz, heading] of [[x - 3, z, 0], [x + 3, z, 0]]) {
      const racer = makeCar('coupe', rx, rz, heading);
      racer.targetSpeed = 0;
      scene.add(racer.mesh);
      props.push(racer.mesh);
    }
    for (let i = 0; i < 6; i++) {
      const ped = spawnPedestrianAt(scene, x + rand(-12, 12), z + rand(-6, 14), pick(['walker', 'tourist', 'clubber']));
      ped.wait = 999;
      ped.speed = 0;
      props.push(ped.mesh);
    }
    cone(x - 8, z - 6);
    cone(x + 8, z - 6);
  } else if (kind === 'bounty-hunt') {
    // A bounty hunt in progress: two black PD interceptors parked nose
    // to nose, cones closing the street, and a small crowd watching the
    // hunt — the fugitive is somewhere in the middle of it.
    for (const [rx, rz, heading] of [[x - 4, z, Math.PI / 2], [x + 4, z, -Math.PI / 2]]) {
      const unit = makeCar('interceptor', rx, rz, heading);
      unit.targetSpeed = 0;
      scene.add(unit.mesh);
      props.push(unit.mesh);
    }
    for (let i = 0; i < 5; i++) {
      const ped = spawnPedestrianAt(scene, x + rand(-10, 10), z + rand(4, 12), pick(['walker', 'tourist', 'elder']));
      ped.wait = 999;
      ped.speed = 0;
      props.push(ped.mesh);
    }
    cone(x - 9, z - 6);
    cone(x + 9, z - 6);
  } else if (kind === 'street-art') {
    // A street-art fair at Mural Row: three taggers working a wall,
    // a small crowd watching, and the paint smell in the air — the
    // walls are open while the fair runs.
    spawnTaggerCrew(scene, x, z, 3, props);
    for (let i = 0; i < 4; i++) {
      const ped = spawnPedestrianAt(scene, x + rand(-10, 10), z + rand(4, 10), pick(['walker', 'tourist']));
      ped.wait = 999;
      ped.speed = 0;
      props.push(ped.mesh);
    }
    cone(x - 10, z - 6);
    cone(x + 10, z - 6);
  } else if (kind === 'mural-tour') {
    // A mural tour at Mural Row: a city bus parked at the kerb, four
    // tourists with cameras, and two taggers working the wall — the
    // walls are the show while the tour runs.
    const tourBus = makeCar('bus', x + 12, z - 8, Math.PI / 2);
    tourBus.targetSpeed = 0;
    scene.add(tourBus.mesh);
    props.push(tourBus.mesh);
    spawnTaggerCrew(scene, x, z, 2, props);
    for (let i = 0; i < 4; i++) {
      const ped = spawnPedestrianAt(scene, x + rand(-10, 10), z + rand(4, 10), 'tourist');
      ped.wait = 999;
      ped.speed = 0;
      props.push(ped.mesh);
    }
    cone(x - 10, z - 6);
    cone(x + 10, z - 6);
  } else if (kind === 'stunt-show') {
    // A stunt show at the film lot: two ramp wedges on the sand, a
    // crowd along the rope line, and the film crew's cameras — the show
    // runs while the ramps are out, and the crowd tips when Mara jumps.
    for (const [wx, wz, wr] of [[x, z, -0.32], [x + 8, z + 4, -0.32]]) {
      const wedge = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 1.1, 5.2),
        new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.7 }),
      );
      wedge.position.set(wx, 0.55, wz);
      wedge.rotation.x = wr;
      wedge.castShadow = true;
      scene.add(wedge);
      props.push(wedge);
    }
    // The rope line: two barriers holding the crowd back from the run-up.
    barrier(x - 6, z + 14, 0);
    barrier(x + 6, z + 14, 0);
    for (let i = 0; i < 8; i++) {
      const ped = spawnPedestrianAt(scene, x + rand(-14, 14), z + rand(6, 12), pick(['walker', 'tourist', 'guest', 'film-crew']));
      ped.wait = 999;
      ped.speed = 0;
      props.push(ped.mesh);
    }
    cone(x - 10, z - 6);
    cone(x + 10, z - 6);
  } else {
    // A festival: a crowd at the plaza and two food carts.
    for (let i = 0; i < 8; i++) {
      const ped = spawnPedestrianAt(scene, x + rand(-12, 12), z + rand(-12, 12), pick(['walker', 'tourist', 'vendor', 'guest']));
      ped.wait = 999;
      ped.speed = 0;
      props.push(ped.mesh);
    }
    for (const [cx, cz, color] of [[x - 8, z + 6, 0xd8382e], [x + 8, z - 6, 0x3f8a4a]]) {
      const cart = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 1.2, 1.6),
        new THREE.MeshStandardMaterial({ color, roughness: 0.9 }),
      );
      cart.position.set(cx, 0.6, cz);
      cart.castShadow = true;
      scene.add(cart);
      props.push(cart);
    }
  }
  return props;
}

// Clear an event's props from the world. Pedestrian meshes are removed
// too — the parade and festival crowds disperse when the event ends.
export function clearEventProps(scene, props, peds) {
  for (const prop of props || []) {
    scene.remove(prop);
  }
  if (peds) {
    // Parade and festival peds held their spots with wait = 999; let
    // them walk off again instead of leaving them frozen.
    for (const ped of peds) {
      if (ped.wait === 999) {
        ped.wait = 0;
        ped.speed = ped.variant === 'jogger' ? 2.6 : 1.4;
      }
    }
  }
  return [];
}

// One frame of the event system. Returns null most frames, or an event:
// { type: 'start', kind, x, z, blurb } when one begins, or
// { type: 'end', kind, bonus } when one ends — bonus is the checkpoint
// payout when Mara kept her nose clean through it. wantedLevel is the
// live wanted level, so a checkpoint knows if Mara stayed clean.
export function updateEvents(state, dt, px, pz, wantedLevel, scene, peds) {
  if (state.active) {
    state.active.left -= dt;
    state.active.elapsed = (state.active.elapsed || 0) + dt;
    if (state.active.kind === 'checkpoint' && wantedLevel > 0) {
      state.active.clean = false;
    }
    // Fireworks bloom one after another: each burst swells and fades
    // on its own phase while the show runs.
    if (state.active.kind === 'fireworks') {
      for (const prop of state.active.props) {
        if (prop.userData && prop.userData.burst) {
          const s = 0.55 + 0.65 * Math.abs(Math.sin(state.active.elapsed * 1.6 + prop.userData.phase));
          prop.scale.setScalar(s);
        }
      }
    }
    if (state.active.left <= 0) {
      const done = state.active;
      clearEventProps(scene, done.props, peds);
      state.active = null;
      state.timer = 45 + Math.random() * 45;
      const bonus = done.kind === 'checkpoint' && done.clean ? CHECKPOINT_BONUS : 0;
      // A street-art fair pays a tip when Mara is in the crowd: the
      // Mural Row visitors tip $100 for the colour when she is there.
      const artBonus = done.kind === 'street-art' && dist2D(px, pz, -100, -40) < 60 ? 100 : 0;
      // A stunt show pays a tip when Mara is in the crowd: the film
      // lot visitors tip $150 for the jumps when she is there.
      const stuntBonus = done.kind === 'stunt-show' && dist2D(px, pz, -285, 90) < 60 ? 150 : 0;
      return { type: 'end', kind: done.kind, bonus: bonus + artBonus + stuntBonus };
    }
    return null;
  }
  state.timer -= dt;
  if (state.timer > 0) return null;
  const pick = pickKind();
  // Roadworks and checkpoints sit on a road; parades sit at the plaza,
  // where the crowd belongs; festivals take the plaza too, but two
  // nights in five the crowd gathers at the casino instead — the
  // resort pays for the music. Casino nights gather at the casino
  // door, club nights at Club Neon's door. Fireworks go over the bay,
  // so the bursts hang above the water off the marina.
  const spot = pick.kind === 'parade'
    ? { x: 0, z: 0 }
    : pick.kind === 'stunt-show'
      ? { x: -285, z: 90 }
      : pick.kind === 'festival'
      ? (Math.random() < 0.4 ? { x: -128, z: 224 } : { x: 0, z: 0 })
      : pick.kind === 'casino-night'
        ? { x: -128, z: 224 }
        : pick.kind === 'club-night'
          ? { x: -70, z: -70 }
          : pick.kind === 'fireworks'
            ? { x: -250, z: 20 }
            : randomRoadPoint();
  const props = buildEventProps(scene, pick.kind, spot.x, spot.z);
  state.active = {
    kind: pick.kind, x: spot.x, z: spot.z,
    left: EVENT_DURATION, props, clean: true, elapsed: 0,
  };
  state.stats[pick.kind] = (state.stats[pick.kind] || 0) + 1;
  state.total += 1;
  // The stunt show never reads the same bill twice: the backlot
  // rotates the act every time the crowd gathers.
  const blurb = pick.kind === 'stunt-show' ? stuntShowBlurb() : pick.blurb;
  return { type: 'start', kind: pick.kind, x: spot.x, z: spot.z, blurb };
}

// A one-line readout for the pause screen.
export function eventStatusLine(state) {
  if (state.total === 0) return 'No city events yet — Solmar is warming up.';
  const parts = [];
  for (const k of ['roadworks', 'parade', 'checkpoint', 'festival', 'fireworks', 'casino-night', 'club-night', 'street-race', 'street-art', 'mural-tour']) {
    if (state.stats[k] > 0) parts.push(`${k} ${state.stats[k]}`);
  }
  return `City events: ${state.total} · ${parts.join(' · ')}`;
}
