// east.js — East Solmar: the university campus, the stadium and the mall.
// Past the last avenue to the east, the city opens up again: students on
// the quad at Solmar University, the floodlit bowl of Solmar Stadium, and
// the Solmar Mall with its parking lot full of cars worth stealing. The
// district is built by hand, like South Solmar, with its own avenue and
// streets that join the main grid at the east edge of town.

import * as THREE from 'three';
import { mulberry32 } from './util.js';

// The district's named places: the campus quad, the stadium bowl and the
// mall doors. city.js mirrors these coordinates in PLACES so missions,
// fares and the minimap all agree on where East Solmar is.
export const EAST = {
  campus: { x: 320, z: 140, name: 'Solmar University' },
  stadium: { x: 320, z: -70, name: 'Solmar Stadium' },
  mall: { x: 320, z: 70, name: 'Solmar Mall' },
  quad: { x: 320, z: 140, name: 'University Quad' },
  field: { x: 320, z: -70, name: 'Stadium Field' },
  eastgate: { x: 300, z: 35, name: 'East Gate' },
};

// The east avenue and the four east streets. The avenue runs north-south
// at x = 315; the streets run east from the main grid (x = 280) out to
// the edge of the map (x = 380). The grid streets at the same z already
// reach x = 280, so driving east on any of them rolls straight into the
// district — no teleport, no loading, just more city.
export const CAMPUS_STUDENTS = [
  [306, 152], [332, 128], [318, 158],
];
export const EAST_AVENUE_X = 315;
export const EAST_STREETS_Z = [-70, 70, 140, 210];

// A WANTED notice board on the campus quad: the university posts the
// PD's fugitives beside the lecture lists, and Doc's face is on it —
// the students read it between classes, and so does Mara.
export function buildEastBountyBoard(scene) {
  const group = new THREE.Group();
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 2.2, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.9 }),
  );
  group.add(board);
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.45, 0.24),
    new THREE.MeshBasicMaterial({ color: 0xffd23e }),
  );
  bar.position.set(0, 0.85, 0.02);
  group.add(bar);
  group.position.set(312, 2.2, 128);
  group.rotation.y = Math.PI / 4;
  scene.add(group);
  return group;
}

// The campus mural: a blank wall on the quad where the art students
// paint between lectures — the first wall most players meet, and the
// one the university keeps repainting white.
export function buildEastMural(scene) {
  const group = new THREE.Group();
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 2.6, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xcfc8b8, roughness: 1 }),
  );
  group.add(wall);
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(4.9, 0.35, 0.34),
    new THREE.MeshBasicMaterial({ color: 0xffc300 }),
  );
  frame.position.set(0, 1.45, 0);
  group.add(frame);
  const can = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.4, 8),
    new THREE.MeshStandardMaterial({ color: 0xff5c8a, roughness: 0.4, metalness: 0.5 }),
  );
  can.position.set(2.0, 0.3, 0.25);
  group.add(can);
  group.position.set(308, 1.3, 118);
  group.rotation.y = Math.PI / 4;
  scene.add(group);
  return group;
}

// The stadium mural: a blank wall at the stadium gate where the
// east-side crowd paints before the match — the loudest wall in
// Solmar, and the one Rocco's runners watch the closest.
export function buildStadiumMural(scene) {
  const group = new THREE.Group();
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 2.6, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xd8d2c2, roughness: 1 }),
  );
  group.add(wall);
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(4.9, 0.35, 0.34),
    new THREE.MeshBasicMaterial({ color: 0x2e8bff }),
  );
  frame.position.set(0, 1.45, 0);
  group.add(frame);
  const can = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.4, 8),
    new THREE.MeshStandardMaterial({ color: 0xffc300, roughness: 0.4, metalness: 0.5 }),
  );
  can.position.set(2.0, 0.3, 0.25);
  group.add(can);
  group.position.set(312, 1.3, -58);
  group.rotation.y = Math.PI / 2;
  scene.add(group);
  return group;
}

// The mall mural: a blank wall at the food court where the shoppers
// paint between meals — the busiest wall in Solmar, and the one the
// mall security pretends not to see.
export function buildMallMural(scene) {
  const group = new THREE.Group();
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 2.6, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xd8d2c2, roughness: 1 }),
  );
  group.add(wall);
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(4.9, 0.35, 0.34),
    new THREE.MeshBasicMaterial({ color: 0xa8d81a }),
  );
  frame.position.set(0, 1.45, 0);
  group.add(frame);
  const can = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.4, 8),
    new THREE.MeshStandardMaterial({ color: 0xffc300, roughness: 0.4, metalness: 0.5 }),
  );
  can.position.set(-2.0, 0.3, 0.25);
  group.add(can);
  group.position.set(310, 1.3, 62);
  group.rotation.y = -Math.PI / 2;
  scene.add(group);
  return group;
}

export function buildEast(scene, colliders) {
  const rng = mulberry32(20261119);

  // --- east roads -------------------------------------------------------
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x4a4b55, roughness: 0.95 });
  const dashMat = new THREE.MeshStandardMaterial({ color: 0xd8d2a0, roughness: 0.8 });
  const walkMat = new THREE.MeshStandardMaterial({ color: 0xcac2b2, roughness: 1 });
  // The avenue: one long strip of asphalt with sidewalks on both sides.
  const avenue = new THREE.Mesh(new THREE.PlaneGeometry(12, 560), roadMat);
  avenue.rotation.x = -Math.PI / 2;
  avenue.position.set(EAST_AVENUE_X, 0.05, 0);
  avenue.receiveShadow = true;
  scene.add(avenue);
  for (const side of [-1, 1]) {
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(3, 560), walkMat);
    walk.rotation.x = -Math.PI / 2;
    walk.position.set(EAST_AVENUE_X + side * 7.5, 0.06, 0);
    scene.add(walk);
  }
  for (let z = -270; z < 280; z += 18) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 6), dashMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(EAST_AVENUE_X, 0.07, z);
    scene.add(dash);
  }
  // The four east streets, each with its own dashes and sidewalks.
  for (const z of EAST_STREETS_Z) {
    const street = new THREE.Mesh(new THREE.PlaneGeometry(100, 12), roadMat);
    street.rotation.x = -Math.PI / 2;
    street.position.set(330, 0.05, z);
    street.receiveShadow = true;
    scene.add(street);
    for (const side of [-1, 1]) {
      const walk = new THREE.Mesh(new THREE.PlaneGeometry(100, 3), walkMat);
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(330, 0.06, z + side * 7.5);
      scene.add(walk);
    }
    for (let x = 285; x < 380; x += 18) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.6), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(x, 0.07, z);
      scene.add(dash);
    }
  }

  // --- helpers ----------------------------------------------------------
  function box(w, h, d, color, x, y, z, opts) {
    const mat = new THREE.MeshStandardMaterial({
      color, roughness: (opts && opts.rough) || 0.85,
      metalness: (opts && opts.metal) || 0,
      emissive: (opts && opts.glow) || 0x000000,
      emissiveIntensity: (opts && opts.glowI) || 0,
    });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    if (!opts || !opts.noCollide) {
      colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    }
    return m;
  }
  function windowStrip(x, y, z, w, lit) {
    // A band of lit windows on a facade: thin bright boxes so the
    // building reads as occupied after dark.
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(w, 1.6, 0.2),
      new THREE.MeshBasicMaterial({ color: lit ? 0xffd9a0 : 0x2a3444 }),
    );
    strip.position.set(x, y, z);
    scene.add(strip);
    return strip;
  }
  function makePalm(r) {
    const palm = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 1 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 6.5, 6), trunkMat);
    trunk.position.y = 3.25;
    trunk.rotation.z = (r() - 0.5) * 0.16;
    trunk.castShadow = true;
    palm.add(trunk);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f8a4a, roughness: 1 });
    for (let i = 0; i < 6; i++) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 0.9), leafMat);
      const a = (i / 6) * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 1.4, 6.6, Math.sin(a) * 1.4);
      leaf.rotation.y = -a;
      leaf.rotation.z = 0.5;
      palm.add(leaf);
    }
    return palm;
  }

  // --- university campus -------------------------------------------------
  // The quad: a big lawn with paths, benches and palms, ringed by the
  // lecture halls. Students gather here between classes.
  const quad = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 70),
    new THREE.MeshStandardMaterial({ color: 0x5a8a4a, roughness: 1 }),
  );
  quad.rotation.x = -Math.PI / 2;
  quad.position.set(320, 0.04, 140);
  quad.receiveShadow = true;
  scene.add(quad);
  // Cross paths through the lawn so it reads as a walked place.
  for (const [pw, pd, px, pz] of [[90, 3, 320, 140], [3, 70, 320, 140]]) {
    const path = new THREE.Mesh(
      new THREE.PlaneGeometry(pw, pd),
      new THREE.MeshStandardMaterial({ color: 0xcfc4ae, roughness: 1 }),
    );
    path.rotation.x = -Math.PI / 2;
    path.position.set(px, 0.05, pz);
    scene.add(path);
  }
  // Four lecture halls around the quad, each with a different roofline.
  const hallColors = [0xb08a6a, 0x7d8aa0, 0x9a8fa8, 0x8a9a8a];
  const hallSpots = [[296, 108], [344, 108], [296, 172], [344, 172]];
  const hallRoofs = [];
  hallSpots.forEach(([hx, hz], i) => {
    const h = 12 + rng() * 6;
    box(20, h, 14, hallColors[i], hx, h / 2, hz);
    windowStrip(hx, h * 0.6, hz + 7.1, 16, true);
    windowStrip(hx, h * 0.3, hz + 7.1, 16, rng() < 0.7);
    const roof = box(8, 2.5, 8, 0x4a4a52, hx + (rng() - 0.5) * 6, h + 1.2, hz + (rng() - 0.5) * 4);
    hallRoofs.push(roof);
  });
  // The library: the tallest building on campus, glass-fronted, with a
  // row of columns out front and a reading terrace on the roof.
  box(26, 26, 18, 0x6a7a94, 320, 13, 100);
  windowStrip(320, 18, 100 + 9.1, 22, true);
  windowStrip(320, 10, 100 + 9.1, 22, true);
  for (let i = -2; i <= 2; i++) {
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 9, 8),
      new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.8 }),
    );
    col.position.set(320 + i * 4.4, 4.5, 110);
    col.castShadow = true;
    scene.add(col);
  }
  box(20, 1.2, 12, 0x4a4a52, 320, 26.6, 100);
  // The clock tower: a slender tower over the quad with a glowing clock
  // face on each side and a minute hand that actually turns.
  const tower = box(7, 34, 7, 0xd8c9a0, 320, 17, 186);
  tower.castShadow = true;
  const clockFaceMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0 });
  const clockFaces = [];
  for (const [fx, fz, ry] of [[320, 189.6, 0], [320, 182.4, Math.PI], [316.4, 186, Math.PI / 2], [323.6, 186, -Math.PI / 2]]) {
    const face = new THREE.Mesh(new THREE.CircleGeometry(2.4, 20), clockFaceMat);
    face.position.set(fx, 30, fz);
    face.rotation.y = ry;
    scene.add(face);
    clockFaces.push(face);
  }
  const minuteHand = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 2.0, 0.1),
    new THREE.MeshBasicMaterial({ color: 0x1a1a1e }),
  );
  minuteHand.position.set(320, 30, 189.7);
  scene.add(minuteHand);
  box(8, 2, 8, 0x2a2a30, 320, 35, 186);
  // Two dorm blocks on the north edge of campus, with balconies.
  for (const [dx, dz] of [[292, 206], [348, 206]]) {
    const h = 16;
    box(18, h, 12, 0xc2a878, dx, h / 2, dz);
    windowStrip(dx, 11, dz + 6.1, 14, true);
    windowStrip(dx, 6, dz + 6.1, 14, rng() < 0.6);
    box(18, 0.8, 2, 0x4a4a52, dx, h * 0.62, dz + 6.6, { noCollide: true });
  }
  // Benches and palms around the quad.
  for (const [bx, bz] of [[306, 128], [334, 128], [306, 152], [334, 152], [320, 122], [320, 158]]) {
    box(3.4, 0.5, 1.2, 0x8a6a42, bx, 0.5, bz, { noCollide: true });
    box(0.3, 0.9, 1.2, 0x5a4630, bx - 1.5, 0.45, bz, { noCollide: true });
    box(0.3, 0.9, 1.2, 0x5a4630, bx + 1.5, 0.45, bz, { noCollide: true });
  }
  for (const [px, pz] of [[302, 122], [338, 122], [302, 158], [338, 158], [312, 140], [328, 140]]) {
    const palm = makePalm(rng);
    palm.position.set(px, 0, pz);
    scene.add(palm);
  }

  // --- Solmar Stadium ------------------------------------------------------
  // The bowl: a green field with white lines, ringed by four stands.
  // The east stand is the tallest — the away end, where the floodlights
  // hang. The scoreboard glows over the north stand.
  const field = new THREE.Mesh(
    new THREE.PlaneGeometry(64, 40),
    new THREE.MeshStandardMaterial({ color: 0x4a8a3a, roughness: 1 }),
  );
  field.rotation.x = -Math.PI / 2;
  field.position.set(320, 0.04, -70);
  field.receiveShadow = true;
  scene.add(field);
  // Field lines: the touchlines, the halfway line and the centre circle.
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xf2f2f2 });
  for (const [lw, ld, lx, lz] of [[64, 0.5, 320, -90], [64, 0.5, 320, -50], [0.5, 40, 320, -70]]) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(lw, ld), lineMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(lx, 0.06, lz);
    scene.add(line);
  }
  const circle = new THREE.Mesh(new THREE.RingGeometry(7.5, 8, 28), lineMat);
  circle.rotation.x = -Math.PI / 2;
  circle.position.set(320, 0.06, -70);
  scene.add(circle);
  // The stands: stepped concrete, four sides, the east one highest.
  // The south stand is split in two with an eight-metre gate between
  // the halves, on the avenue: the bowl has to be enterable, or the
  // stadium finale would be a fight Mara could never reach.
  const standMat = new THREE.MeshStandardMaterial({ color: 0x8a8a94, roughness: 0.95 });
  const standSpots = [
    { x: 320, z: -98, w: 76, h: 14, d: 10 },
    { x: 296.5, z: -42, w: 29, h: 14, d: 10 },
    { x: 338.5, z: -42, w: 39, h: 14, d: 10 },
    { x: 282, z: -70, w: 10, h: 11, d: 52 },
    { x: 358, z: -70, w: 10, h: 19, d: 52 },
  ];
  for (const s of standSpots) {
    const stand = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, s.d), standMat);
    stand.position.set(s.x, s.h / 2, s.z);
    stand.castShadow = true;
    stand.receiveShadow = true;
    scene.add(stand);
    colliders.push({
      minX: s.x - s.w / 2, maxX: s.x + s.w / 2,
      minZ: s.z - s.d / 2, maxZ: s.z + s.d / 2,
    });
    // A coloured seat band along the top of each stand.
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(s.w > s.d ? s.w : 0.6, 1.2, s.d > s.w ? s.d : 0.6),
      new THREE.MeshStandardMaterial({ color: 0xd8382e, roughness: 0.8 }),
    );
    band.position.set(s.x, s.h + 0.6, s.z);
    scene.add(band);
  }
  // Floodlight masts on the four corners of the bowl.
  const floodMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.6, metalness: 0.6 });
  const floodHeads = [];
  for (const [fx, fz] of [[288, -102], [352, -102], [288, -38], [352, -38]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 26, 6), floodMat);
    pole.position.set(fx, 13, fz);
    pole.castShadow = true;
    scene.add(pole);
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(6, 2.4, 1.2),
      new THREE.MeshBasicMaterial({ color: 0x9a8a68 }),
    );
    head.position.set(fx, 26.5, fz);
    head.lookAt(320, 0, -70);
    scene.add(head);
    floodHeads.push(head);
    colliders.push({ minX: fx - 0.6, maxX: fx + 0.6, minZ: fz - 0.6, maxZ: fz + 0.6 });
  }
  // The scoreboard: a big dark panel over the north stand with a glowing
  // face that pulses through the match. SOLMAR 3 — 1 VISITORS, always.
  // On Saturdays it reads STUNT SHOW SAT — the bowl fills for the jumps.
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(18, 7, 1.4),
    new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.6 }),
  );
  board.position.set(320, 20, -104);
  board.castShadow = true;
  scene.add(board);
  const boardFaceMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  const boardFace = new THREE.Mesh(new THREE.PlaneGeometry(16, 5.4), boardFaceMat);
  boardFace.position.set(320, 20, -103.2);
  scene.add(boardFace);
  colliders.push({ minX: 311, maxX: 329, minZ: -105, maxZ: -103 });
  // Turnstiles and the ticket office at the south gate. The office
  // sits west of the gate so the way in stays clear.
  box(10, 5, 6, 0x7d8aa0, 300, 2.5, -32);
  windowStrip(300, 3.2, -28.9, 8, true);
  for (const tx of [312, 320, 328]) {
    box(1.2, 2.2, 1.2, 0x2a2a30, tx, 1.1, -26, { noCollide: true });
  }

  // --- Solmar Mall -----------------------------------------------------------
  // A long low shopping centre with a glass front, a sign band that
  // blinks after dark, and a parking lot full of marked bays — and a
  // few cars parked in them, because a mall without cars is just a box.
  const mallBody = box(46, 13, 28, 0xb0a89a, 320, 6.5, 70);
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(40, 7, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x9fd8e8, roughness: 0.15, metalness: 0.5 }),
  );
  glass.position.set(320, 4.5, 70 - 14.2);
  scene.add(glass);
  const signMat = new THREE.MeshBasicMaterial({ color: 0xffd23e });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(24, 2.6, 0.5), signMat);
  sign.position.set(320, 11.5, 70 - 14.3);
  scene.add(sign);
  // The mall's roof plant: vents and a big air-conditioning box.
  box(6, 2, 5, 0x4a4a52, 306, 14, 66, { noCollide: true });
  box(5, 1.6, 4, 0x6a6a72, 334, 13.8, 74, { noCollide: true });
  // The parking lot: dark asphalt west of the mall with painted bays.
  const lot = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 40),
    new THREE.MeshStandardMaterial({ color: 0x3a3b44, roughness: 1 }),
  );
  lot.rotation.x = -Math.PI / 2;
  lot.position.set(288, 0.05, 70);
  lot.receiveShadow = true;
  scene.add(lot);
  const bayMat = new THREE.MeshBasicMaterial({ color: 0xd8d2a0 });
  for (let i = 0; i < 6; i++) {
    const bay = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 5), bayMat);
    bay.rotation.x = -Math.PI / 2;
    bay.position.set(278 + i * 4.5, 0.07, 70);
    scene.add(bay);
  }
  // Parked cars in the lot: simple bodies, no traffic AI — they are
  // scenery until Mara steals one (the lot cars are added to traffic
  // by main.js, which is why they use the same box proportions).
  const parkedColors = [0xd8382e, 0x2e6fd8, 0xe8e4da, 0x38b24a];
  for (let i = 0; i < 4; i++) {
    const car = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.85, 4.4),
      new THREE.MeshStandardMaterial({ color: parkedColors[i], roughness: 0.35, metalness: 0.55 }),
    );
    body.position.y = 0.75;
    body.castShadow = true;
    car.add(body);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.7, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x18202e, roughness: 0.1, metalness: 0.7 }),
    );
    cabin.position.set(0, 1.45, -0.2);
    car.add(cabin);
    car.position.set(278 + i * 4.5, 0, 62);
    car.rotation.y = Math.PI / 2;
    scene.add(car);
  }
  // A fountain in front of the mall doors, because every mall has one.
  const fountain = new THREE.Mesh(
    new THREE.CylinderGeometry(4, 4, 0.8, 16),
    new THREE.MeshStandardMaterial({ color: 0x3fa8c8, roughness: 0.15, metalness: 0.4 }),
  );
  fountain.position.set(320, 0.4, 48);
  scene.add(fountain);
  colliders.push({ minX: 316, maxX: 324, minZ: 44, maxZ: 52 });

  // Palms down the east avenue so the new district feels like Solmar.
  for (let z = -245; z <= 245; z += 70) {
    if (rng() < 0.8) {
      const palm = makePalm(rng);
      palm.position.set(EAST_AVENUE_X - 10, 0, z + (rng() - 0.5) * 20);
      scene.add(palm);
    }
    if (rng() < 0.8) {
      const palm = makePalm(rng);
      palm.position.set(EAST_AVENUE_X + 10, 0, z + (rng() - 0.5) * 20);
      scene.add(palm);
    }
  }

  // Quad lamps: four posts around the university quad that glow after
  // dark, so the campus reads at night as well as by day.
  const quadLampMats = [];
  for (const [lx, lz] of [[306, 126], [334, 126], [306, 154], [334, 154]]) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 3.2, 6),
      new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.6 }),
    );
    pole.position.set(lx, 1.6, lz);
    scene.add(pole);
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x9a8a68, emissive: 0xfff2c0, emissiveIntensity: 0.2 });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), lampMat);
    lamp.position.set(lx, 3.3, lz);
    scene.add(lamp);
    quadLampMats.push(lampMat);
  }

  return {
    colliders,
    update(dt, time, isNight) {
      // The scoreboard pulses through the match; the floodlights and
      // the mall sign only earn their keep after dark. On Saturdays
      // the bowl fills for the stunt show, and the board glows orange
      // for the jumps instead of gold for the match.
      const pulse = 0.75 + Math.sin(time * 1.4) * 0.25;
      const stuntSaturday = new Date().getDay() === 6;
      boardFaceMat.color.setHex(isNight ? (stuntSaturday ? 0xff7a1a : 0xffe9a8) : 0x8a7a55);
      boardFace.scale.setScalar(isNight ? pulse : 1);
      for (const head of floodHeads) {
        head.material.color.setHex(isNight ? 0xfff2c0 : 0x9a8a68);
      }
      signMat.color.setHex(isNight && Math.sin(time * 2.2) > -0.2 ? 0xffd23e : 0x8a6a1a);
      // The clock tower's minute hand turns once an hour of game time.
      minuteHand.rotation.z = -((time / 300) % 1) * Math.PI * 2;
      // The library windows breathe a little with the evening crowd.
      clockFaceMat.color.setHex(isNight ? 0xfff2c0 : 0xd8c9a0);
      // The quad lamps come on after dark and fade with the dawn.
      for (const m of quadLampMats) m.emissiveIntensity = isNight ? 1.2 : 0.2;
    },
  };
}

// Is a point on the east road network (the avenue or one of the streets)?
export function onEastRoad(x, z) {
  if (Math.abs(x - EAST_AVENUE_X) < 7.5 && z > -280 && z < 280) return true;
  for (const sz of EAST_STREETS_Z) {
    if (Math.abs(z - sz) < 7.5 && x > 278 && x < 382) return true;
  }
  return false;
}

// A random point on the east road network, for traffic and spawns.
export function randomEastRoadPoint() {
  if (Math.random() < 0.5) {
    return { x: EAST_AVENUE_X, z: (Math.random() * 2 - 1) * 260 };
  }
  const z = EAST_STREETS_Z[Math.floor(Math.random() * EAST_STREETS_Z.length)];
  return { x: 285 + Math.random() * 90, z };
}

// The rare cars hiding in the east: the rally car at the stadium bowl
// and the vintage roadster at the mall forecourt.
export const EAST_RARE_SPOTS = [
  { x: 320, z: -40, kind: 'coupe', name: 'Rally Fox' },
  { x: 300, z: 110, kind: 'sedan', name: 'Vintage Roadster' },
];

// The mall forecourt: where the vintage roadster waits, and where
// the shoppers gather on match days.
export const EAST_MALL_SPOTS = [
  { x: 300, z: 110, name: 'Mall Forecourt' },
  { x: 290, z: 130, name: 'Food Court' },
];
