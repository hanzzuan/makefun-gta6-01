// pedestrians.js — the people of Solmar: walkers on the sidewalks who
// stroll, wait at corners, and scatter when a car or a gunshot comes close.

import * as THREE from 'three';
import { rand, pick, pickWeighted, lerpAngle } from './util.js';
import { CITY_HALF, ROAD_SPACING, onRoad } from './city.js';

const SHIRTS = [0xe8e4da, 0x3c6fd8, 0xd8a03c, 0x7ab24a, 0xd84a6a, 0x8a5fd0, 0x3cc8c0, 0xe86a3c];
const PANTS = [0x2a3a5e, 0x3a3a3a, 0x5a4a3a, 0x2e4a3a];

export function buildPedMesh(shirt, pants, variant) {
  const group = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: pick([0xd8a077, 0xb07850, 0x8a5a3a, 0xe8b890]), roughness: 0.8 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.85 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.9 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.62, 0.3), shirtMat);
  torso.position.y = 1.2;
  torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.38, 0.34), skin);
  head.position.y = 1.72;
  head.castShadow = true;
  group.add(head);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 0.24), pantsMat);
  legL.position.set(-0.14, 0.42, 0);
  group.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.14;
  group.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.6, 0.2), shirtMat);
  armL.position.set(-0.36, 1.18, 0);
  group.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.36;
  group.add(armR);
  // Variant gear: what a person wears says where they are going.
  if (variant === 'worker') {
    // Dockworker: yellow hard hat and a hi-vis vest over the shirt.
    const helmet = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.2, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.5 }),
    );
    helmet.position.y = 1.98;
    group.add(helmet);
    const vest = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.5, 0.34),
      new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.85 }),
    );
    vest.position.y = 1.22;
    group.add(vest);
  } else if (variant === 'jogger') {
    // Runner: cap, headband, and a brighter shirt.
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.14, 0.38),
      new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.8 }),
    );
    cap.position.y = 1.96;
    group.add(cap);
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.08, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xd8382e, roughness: 0.8 }),
    );
    band.position.y = 1.86;
    group.add(band);
  } else if (variant === 'tourist') {
    // Sightseer: straw hat and a camera hanging on the chest.
    const hat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.38, 0.08, 10),
      new THREE.MeshStandardMaterial({ color: 0xd8b878, roughness: 1 }),
    );
    hat.position.y = 1.96;
    group.add(hat);
    const camera = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.16, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.5 }),
    );
    camera.position.set(0, 1.32, 0.2);
    group.add(camera);
  } else if (variant === 'elder') {
    // Older local: grey hair and a walking cane in the right hand.
    const hair = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.14, 0.38),
      new THREE.MeshStandardMaterial({ color: 0xc8c8c8, roughness: 1 }),
    );
    hair.position.y = 1.96;
    group.add(hair);
    const cane = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 1.1, 6),
      new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.9 }),
    );
    cane.position.set(0.42, 0.75, 0.15);
    group.add(cane);
  } else if (variant === 'vendor') {
    // Street vendor: an apron and a flat cap, standing by the cart.
    const apron = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.6, 0.34),
      new THREE.MeshStandardMaterial({ color: 0x3f8a4a, roughness: 0.9 }),
    );
    apron.position.y = 1.2;
    group.add(apron);
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.12, 0.38),
      new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 1 }),
    );
    cap.position.y = 1.96;
    group.add(cap);
  } else if (variant === 'pilot') {
    // Airport crew: a white shirt, navy epaulettes, and a peaked cap.
    const shirtWhite = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.6, 0.34),
      new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.8 }),
    );
    shirtWhite.position.y = 1.2;
    group.add(shirtWhite);
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.3, 0.14, 10),
      new THREE.MeshStandardMaterial({ color: 0x1a2a4a, roughness: 0.7 }),
    );
    cap.position.y = 1.98;
    group.add(cap);
    for (const side of [-1, 1]) {
      const epaulette = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.04, 0.3),
        new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.4, metalness: 0.6 }),
      );
      epaulette.position.set(side * 0.24, 1.52, 0);
      group.add(epaulette);
    }
  } else if (variant === 'guest') {
    // Resort guest: a bright holiday shirt and sunglasses.
    const shades = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.08, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.2, metalness: 0.5 }),
    );
    shades.position.set(0, 1.74, 0.18);
    group.add(shades);
    const towel = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x3cc8c0, roughness: 1 }),
    );
    towel.position.set(0, 1.0, -0.2);
    group.add(towel);
  } else if (variant === 'dealer') {
    // Casino dealer: a black jacket, a gold bow tie, and a deck in hand.
    const jacket = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.6, 0.34),
      new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.7 }),
    );
    jacket.position.y = 1.2;
    group.add(jacket);
    const bow = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.1, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.4, metalness: 0.6 }),
    );
    bow.position.set(0, 1.56, 0.18);
    group.add(bow);
  } else if (variant === 'clubber') {
    // Clubber: neon shirt, dark pants, and a glow stick in hand — the
    // night crowd at Club Neon, out until the sun comes up.
    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.5, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xff2e88 }),
    );
    glow.position.set(0.44, 1.1, 0.12);
    group.add(glow);
    const shade = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.1, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.4 }),
    );
    shade.position.set(0, 1.78, 0.05);
    group.add(shade);
  } else if (variant === 'tagger') {
    // Tagger: a Mural Row kid in a purple hoodie, spray can in hand —
    // the street artists who paint the twelve walls by day and tag
    // the back alleys by night.
    const can = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.28, 8),
      new THREE.MeshStandardMaterial({ color: 0xffc300, roughness: 0.4, metalness: 0.5 }),
    );
    can.position.set(0.44, 1.1, 0.12);
    group.add(can);
    const hood = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.14, 0.42),
      new THREE.MeshStandardMaterial({ color: 0x6a3a8a, roughness: 0.9 }),
    );
    hood.position.set(0, 1.8, 0);
    group.add(hood);
  } else if (variant === 'student') {
    // University student: a backpack and a stack of books under one arm.
    const pack = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.55, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x2e6fd8, roughness: 0.85 }),
    );
    pack.position.set(0, 1.25, -0.26);
    group.add(pack);
    const books = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.12, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xd8382e, roughness: 0.8 }),
    );
    books.position.set(-0.4, 1.05, 0.1);
    group.add(books);
  } else if (variant === 'shopper') {
    // Mall shopper: shopping bags in both hands, in the mall's colours.
    for (const side of [-1, 1]) {
      const bag = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.4, 0.18),
        new THREE.MeshStandardMaterial({ color: side < 0 ? 0xffd23e : 0xd84a6a, roughness: 0.8 }),
      );
      bag.position.set(side * 0.44, 0.85, 0.12);
      group.add(bag);
    }
  } else if (variant === 'informant') {
    // An informant: a trench coat and a wide hat, standing in the
    // shadows by the back alley — the street's eyes, for a price.
    const coat = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.1, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.9 }),
    );
    coat.position.set(0, 0.95, 0);
    group.add(coat);
    const hat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.34, 0.22, 8),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.9 }),
    );
    hat.position.set(0, 2.05, 0);
    group.add(hat);
  } else if (variant === 'film-crew') {
    // Film crew: a clapperboard under one arm and a headset around the
    // neck — the backlot's own people, walking the beach between takes.
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.3, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.6 }),
    );
    board.position.set(0.44, 1.15, 0.12);
    group.add(board);
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.08, 0.07),
      new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.5 }),
    );
    stripe.position.set(0.44, 1.28, 0.12);
    group.add(stripe);
    // The headset: a band over the head and two ear cups, so the crew
    // hears the director and nobody else.
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.035, 6, 12, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.6 }),
    );
    band.position.set(0, 1.95, 0);
    group.add(band);
    for (const sx of [-0.28, 0.28]) {
      const cup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 0.06, 8),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.6 }),
      );
      cup.rotation.z = Math.PI / 2;
      cup.position.set(sx, 1.85, 0);
      group.add(cup);
    }
  }
  group.userData = { legL, legR, armL, armR };
  return group;
}

export function spawnPedestrian(scene, forcedVariant) {
  // Start on a sidewalk next to a road.
  const vertical = Math.random() < 0.5;
  const lanes = [];
  for (let v = -CITY_HALF + 35; v <= CITY_HALF - 35; v += ROAD_SPACING) lanes.push(v);
  const lane = lanes[Math.floor(Math.random() * lanes.length)];
  const along = (Math.random() * 2 - 1) * (CITY_HALF - 40);
  const side = Math.random() < 0.5 ? -1 : 1;
  const x = vertical ? lane + side * 9 : along;
  const z = vertical ? along : lane + side * 9;
  // Most people are plain walkers; the rest are joggers, dockworkers,
  // tourists and older locals, each with their own pace and gear. Pilots
  // and resort guests never spawn on the street — they belong to the
  // airport and the resort, where main.js places them by hand. Students
  // and shoppers are the same: the campus and the mall place them.
  const variant = forcedVariant || pickWeighted([
    ['walker', 55], ['jogger', 15], ['worker', 12], ['tourist', 10], ['elder', 8], ['informant', 2], ['tagger', 6], ['film-crew', 3],
  ]);
  const mesh = buildPedMesh(pick(SHIRTS), pick(PANTS), variant);
  mesh.position.set(x, 0, z);
  const pace = variant === 'jogger' ? rand(2.6, 3.4)
    : variant === 'elder' ? rand(0.7, 1.1)
    : variant === 'worker' ? rand(1.2, 1.8)
    : rand(1.0, 1.9);
  const ped = {
    mesh,
    x, z,
    variant,
    heading: rand(0, Math.PI * 2),
    speed: pace,
    phase: rand(0, 6),
    // Walking along the sidewalk: keep one axis fixed-ish, drift the other.
    axis: vertical ? 'z' : 'x',
    dir: Math.random() < 0.5 ? 1 : -1,
    fixed: vertical ? x : z,
    wait: 0,
    flee: 0,
    chat: 0, // >0 while standing and chatting with a partner
  };
  scene.add(mesh);
  return ped;
}

// Two people standing face to face, chatting on a corner — ambient life
// that pauses, turns, and eventually wanders off together.
export function spawnPedestrianPair(scene) {
  const vertical = Math.random() < 0.5;
  const lanes = [];
  for (let v = -CITY_HALF + 35; v <= CITY_HALF - 35; v += ROAD_SPACING) lanes.push(v);
  const lane = lanes[Math.floor(Math.random() * lanes.length)];
  const along = (Math.random() * 2 - 1) * (CITY_HALF - 60);
  const side = Math.random() < 0.5 ? -1 : 1;
  const bx = vertical ? lane + side * 9 : along;
  const bz = vertical ? along : lane + side * 9;
  const first = spawnPedestrianAt(scene, bx, bz, 'walker');
  const second = spawnPedestrianAt(scene, bx + 1.6, bz + 0.4, Math.random() < 0.5 ? 'tourist' : 'walker');
  first.chat = 14 + Math.random() * 10;
  second.chat = first.chat;
  first.chatPartner = second;
  second.chatPartner = first;
  return [first, second];
}

// A crew of taggers at a wall: they stand and work, frozen in place
// while the fair runs, so the wall reads as painted live.
export function spawnTaggerCrew(scene, x, z, count, props) {
  for (let i = 0; i < count; i++) {
    const ped = spawnPedestrianAt(scene, x + (i - (count - 1) / 2) * 4, z + rand(-2, 2), 'tagger');
    ped.wait = 999;
    ped.speed = 0;
    props.push(ped.mesh);
  }
}

// The film crew's set talk: what the backlot says between takes.
// Walk up to a film-crew member and the hint line carries their voice.
export const FILM_CREW_LINES = [
  '"Quiet on the set — the stunt double is about to jump."',
  '"The director wants the runway jump in one take. One."',
  '"That ramp at the film lot? Mara Voss cleared it. Twice."',
  '"The crane shot is the money shot — hold the car in frame."',
  '"Reel FM is playing the chase theme again. It never gets old."',
  '"The stunt crew parks its vans by the ramp. The pay is in the air."',
  '"Jax says the slow-mo is longer when he is driving. He would know."',
  '"The sunset penthouse is the wrap party. The film lot is the work."',
];
export function filmCrewLine() {
  return FILM_CREW_LINES[Math.floor(Math.random() * FILM_CREW_LINES.length)];
}

export function spawnPedestrianAt(scene, x, z, variant) {
  const mesh = buildPedMesh(pick(SHIRTS), pick(PANTS), variant || 'walker');
  mesh.position.set(x, 0, z);
  const ped = {
    mesh, x, z, variant: variant || 'walker',
    heading: rand(0, Math.PI * 2),
    speed: rand(1.0, 1.9),
    phase: rand(0, 6),
    axis: 'z', dir: 1, fixed: x,
    wait: 0, flee: 0, chat: 0,
  };
  scene.add(mesh);
  return ped;
}

// A street vendor with a cart: they never walk anywhere, they just stand
// by the goods and watch the city go by.
export function spawnVendor(scene, x, z) {
  const ped = spawnPedestrianAt(scene, x, z, 'vendor');
  ped.wait = Infinity; // vendors hold their spot all day
  ped.speed = 0;
  const cart = new THREE.Group();
  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 1.0, 1.4),
    new THREE.MeshStandardMaterial({ color: 0x8a6a42, roughness: 1 }),
  );
  counter.position.y = 0.5;
  counter.castShadow = true;
  cart.add(counter);
  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.12, 1.8),
    new THREE.MeshStandardMaterial({ color: 0xd8382e, roughness: 0.9 }),
  );
  awning.position.y = 2.2;
  awning.rotation.x = 0.2;
  cart.add(awning);
  const goods = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.35, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x3f8a4a, roughness: 0.9 }),
  );
  goods.position.y = 1.15;
  cart.add(goods);
  cart.position.set(x + 1.2, 0, z + 0.6);
  scene.add(cart);
  ped.cart = cart;
  return ped;
}

// A stray dog that trots along behind its owner, tail up.
export function spawnDog(scene, owner) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.35, 0.35),
    new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 1 }),
  );
  body.position.y = 0.35;
  group.add(body);
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.3, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 1 }),
  );
  head.position.set(0.45, 0.55, 0);
  group.add(head);
  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.08, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 1 }),
  );
  tail.position.set(-0.45, 0.5, 0);
  tail.rotation.z = 0.6;
  group.add(tail);
  group.position.set(owner.x + 1, 0, owner.z + 1);
  scene.add(group);
  return { mesh: group, owner, variant: 'dog', x: owner.x + 1, z: owner.z + 1 };
}

export function updatePedestrian(ped, dt, threats, rain) {
  // Dogs ignore the sidewalk rules: they just trot after their owner.
  if (ped.variant === 'dog') {
    const dx = ped.owner.x - ped.x;
    const dz = ped.owner.z - ped.z;
    const d = Math.hypot(dx, dz);
    if (d > 2) {
      ped.x += (dx / d) * 4 * dt;
      ped.z += (dz / d) * 4 * dt;
      ped.mesh.rotation.y = Math.atan2(dx, dz);
    }
    ped.mesh.position.set(ped.x, 0, ped.z);
    return;
  }
  // Flee from a nearby threat (player car at speed, or a gunshot).
  let threat = null;
  for (const t of threats) {
    const dx = ped.x - t.x;
    const dz = ped.z - t.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < t.radius) {
      threat = { dx, dz, d };
      break;
    }
  }
  if (threat) ped.flee = 1.2;
  if (ped.flee > 0) {
    ped.flee -= dt;
    const len = Math.max(0.01, threat ? threat.d : 1);
    const fx = threat ? threat.dx / len : 0;
    const fz = threat ? threat.dz / len : 0;
    ped.x += fx * 5.5 * dt;
    ped.z += fz * 5.5 * dt;
    ped.heading = lerpAngle(ped.heading, Math.atan2(fx, fz), Math.min(1, dt * 10));
    ped.phase += dt * 14;
  } else if (ped.chat > 0) {
    // Chatting on the corner: stand still, face the partner, shift weight.
    ped.chat -= dt;
    if (ped.chatPartner) {
      ped.heading = lerpAngle(
        ped.heading,
        Math.atan2(ped.chatPartner.x - ped.x, ped.chatPartner.z - ped.z),
        Math.min(1, dt * 6),
      );
    }
    ped.phase += dt * 2;
    if (ped.chat <= 0 && ped.chatPartner) {
      // The chat breaks up: both wander off down the sidewalk together.
      ped.chatPartner.chat = 0;
      ped.dir = Math.random() < 0.5 ? 1 : -1;
      ped.chatPartner.dir = ped.dir;
    }
  } else {
    if (ped.wait > 0) {
      ped.wait -= dt;
    } else {
      // Rain makes everyone hurry: peds walk up to 70% faster in a
      // shower, heads down, looking for the nearest awning.
      const step = ped.speed * (1 + (rain || 0) * 0.7) * dt;
      if (ped.axis === 'z') {
        ped.z += ped.dir * step;
        if (Math.abs(ped.z) > CITY_HALF - 20) ped.dir *= -1;
        // At a cross street, sometimes pause or turn around.
        if (onRoad(ped.x, ped.z) && Math.random() < dt * 0.4) {
          if (Math.random() < 0.5) ped.wait = rand(1, 3);
          else ped.dir *= -1;
        }
      } else {
        ped.x += ped.dir * step;
        if (Math.abs(ped.x) > CITY_HALF - 20) ped.dir *= -1;
        if (onRoad(ped.x, ped.z) && Math.random() < dt * 0.4) {
          if (Math.random() < 0.5) ped.wait = rand(1, 3);
          else ped.dir *= -1;
        }
      }
      ped.heading = lerpAngle(
        ped.heading,
        ped.axis === 'z' ? (ped.dir > 0 ? 0 : Math.PI) : (ped.dir > 0 ? Math.PI / 2 : -Math.PI / 2),
        Math.min(1, dt * 8),
      );
      ped.phase += dt * ped.speed * 4;
    }
  }
  ped.mesh.position.set(ped.x, 0, ped.z);
  ped.mesh.rotation.y = ped.heading;
  const swing = Math.sin(ped.phase) * 0.5;
  ped.mesh.userData.legL.rotation.x = swing;
  ped.mesh.userData.legR.rotation.x = -swing;
  ped.mesh.userData.armL.rotation.x = -swing * 0.7;
  ped.mesh.userData.armR.rotation.x = swing * 0.7;
}

// Two vendors hold the jobs board at the garage — one takes the
// delivery slips, the other knows every pickup in the city.
export function spawnJobClients(scene) {
  return [spawnVendor(scene, 132, -132), spawnVendor(scene, 148, -132)];
}

// Two spotters watch the rare cars: one on the plaza, one at the
// marina — they trade rumors, and Leo repeats the good ones.
export function spawnRareSpotters(scene) {
  return [spawnVendor(scene, 10, -30), spawnVendor(scene, -230, 160)];
}
