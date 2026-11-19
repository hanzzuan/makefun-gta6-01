// south.js — South Solmar: the Palmera Resort and Solmar Airport.
// The south edge of the city, past the last avenue: beach-resort hotels
// with a pool and cabanas on the west side, and the airport — terminal,
// control tower, runway with edge lights and a taxiing plane — on the
// east. The generic building loop skips these blocks (they sit within
// 26 m of the new PLACES), so the district is built here by hand.

import * as THREE from 'three';
import { mulberry32 } from './util.js';

// The south district's named places live in city.js PLACES; the
// coordinates below match them so missions and the HUD can point here.
export const SOUTH = {
  resort: { x: -140, z: 210 },
  airport: { x: 140, z: 215 },
  terminal: { x: 210, z: 215 },
  control: { x: 70, z: 215 },
  runway: { x: 120, z: 272 },
};

function makePalmTree(rng) {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8a6b46, roughness: 1 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, 6.5, 6), trunkMat);
  trunk.position.y = 3.25;
  trunk.rotation.z = (rng() - 0.5) * 0.16;
  group.add(trunk);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f9e4f, roughness: 0.9, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.55, 3.4, 4), leafMat);
    const a = (i / 7) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 1.1, 6.6, Math.sin(a) * 1.1);
    leaf.rotation.set(Math.sin(a) * 1.15, 0, -Math.cos(a) * 1.15);
    leaf.scale.set(1, 1, 0.35);
    group.add(leaf);
  }
  return group;
}

// A small passenger jet: fuselage, swept wings, tail fin, two engines.
function makePlane(scene, x, z, heading, livery) {
  const plane = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: livery, roughness: 0.4, metalness: 0.4 });
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 16, 10), hullMat);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.position.y = 2.2;
  fuselage.castShadow = true;
  plane.add(fuselage);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3.2, 10), hullMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 2.2, 9.4);
  plane.add(nose);
  const tailCone = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 1.6, 3.4, 10), hullMat);
  tailCone.rotation.x = Math.PI / 2;
  tailCone.position.set(0, 2.2, -9.4);
  plane.add(tailCone);
  const wingMat = new THREE.MeshStandardMaterial({ color: 0xd8d2c2, roughness: 0.5, metalness: 0.3 });
  const wing = new THREE.Mesh(new THREE.BoxGeometry(24, 0.25, 3.4), wingMat);
  wing.position.set(0, 2.0, 1.5);
  wing.castShadow = true;
  plane.add(wing);
  const tailWing = new THREE.Mesh(new THREE.BoxGeometry(8, 0.22, 2.2), wingMat);
  tailWing.position.set(0, 2.6, -8.2);
  plane.add(tailWing);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3.6, 2.6), hullMat);
  fin.position.set(0, 4.2, -8.4);
  plane.add(fin);
  const engineMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.5, metalness: 0.5 });
  for (const side of [-1, 1]) {
    const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 2.6, 8), engineMat);
    engine.rotation.x = Math.PI / 2;
    engine.position.set(side * 4.6, 1.4, 2.2);
    plane.add(engine);
    const gear = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.2, 6), engineMat);
    gear.position.set(side * 1.2, 0.6, 4);
    plane.add(gear);
    const gearRear = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.2, 6), engineMat);
    gearRear.position.set(side * 1.2, 0.6, -4);
    plane.add(gearRear);
  }
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.5, 15.5),
    new THREE.MeshStandardMaterial({ color: 0x2e6fd8, roughness: 0.5 }),
  );
  stripe.position.set(1.62, 2.2, 0);
  plane.add(stripe);
  plane.position.set(x, 0, z);
  plane.rotation.y = heading;
  scene.add(plane);
  return plane;
}

export function buildSouth(scene, colliders) {
  const rng = mulberry32(20261120);
  const animated = { radar: null, runwayLights: [], taxiPlane: null, windsock: null };

  // --- Palmera Resort -------------------------------------------------------
  // Two hotel towers over a pool deck, with cabanas and a palm court.
  const resortSlab = new THREE.Mesh(
    new THREE.PlaneGeometry(110, 70),
    new THREE.MeshStandardMaterial({ color: 0xd8cfae, roughness: 1 }),
  );
  resortSlab.rotation.x = -Math.PI / 2;
  resortSlab.position.set(-140, 0.045, 212);
  resortSlab.receiveShadow = true;
  scene.add(resortSlab);

  const hotelTex = (() => {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#e8d8c0';
    g.fillRect(0, 0, 64, 128);
    for (let y = 8; y < 120; y += 12) {
      for (let x = 6; x < 58; x += 11) {
        g.fillStyle = rng() < 0.55 ? '#ffd98a' : '#3a4a6b';
        g.fillRect(x, y, 7, 8);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  })();
  const hotelMat = new THREE.MeshStandardMaterial({
    color: 0xe8d8c0, map: hotelTex, emissive: 0xffc27a,
    emissiveMap: hotelTex, emissiveIntensity: 0.3, roughness: 0.8,
  });
  const hotelA = new THREE.Mesh(new THREE.BoxGeometry(20, 52, 18), hotelMat);
  hotelA.position.set(-156, 26, 196);
  hotelA.castShadow = true;
  scene.add(hotelA);
  colliders.push({ minX: -166, maxX: -146, minZ: 187, maxZ: 205 });
  const hotelB = new THREE.Mesh(new THREE.BoxGeometry(16, 38, 16), hotelMat);
  hotelB.position.set(-124, 19, 224);
  hotelB.castShadow = true;
  scene.add(hotelB);
  colliders.push({ minX: -132, maxX: -116, minZ: 216, maxZ: 232 });
  // Rooftop pool deck on the shorter tower.
  const roofPool = new THREE.Mesh(
    new THREE.BoxGeometry(10, 0.6, 8),
    new THREE.MeshStandardMaterial({ color: 0x3fa8c8, roughness: 0.15, metalness: 0.4 }),
  );
  roofPool.position.set(-124, 38.4, 224);
  scene.add(roofPool);
  // Ground pool: bright blue water in a pale deck.
  const pool = new THREE.Mesh(
    new THREE.BoxGeometry(26, 0.5, 14),
    new THREE.MeshStandardMaterial({ color: 0x2e9ec8, roughness: 0.1, metalness: 0.5 }),
  );
  pool.position.set(-140, 0.3, 232);
  pool.receiveShadow = true;
  scene.add(pool);
  const poolEdge = new THREE.Mesh(
    new THREE.BoxGeometry(28, 0.4, 16),
    new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: 0.9 }),
  );
  poolEdge.position.set(-140, 0.18, 232);
  scene.add(poolEdge);
  // Cabanas: striped canvas roofs on posts around the pool.
  const cabanaColors = [0xd8382e, 0x2e6fd8, 0x3f8a4a, 0xf2c230];
  for (let i = 0; i < 5; i++) {
    const cx = -164 + i * 12;
    const cabana = new THREE.Group();
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(3.2, 1.6, 4),
      new THREE.MeshStandardMaterial({ color: cabanaColors[i % 4], roughness: 0.9 }),
    );
    roof.position.y = 3.4;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    cabana.add(roof);
    for (const [px, pz] of [[-2.4, -2.4], [2.4, -2.4], [-2.4, 2.4], [2.4, 2.4]]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 2.8, 6),
        new THREE.MeshStandardMaterial({ color: 0x5a4630, roughness: 1 }),
      );
      post.position.set(px, 1.4, pz);
      cabana.add(post);
    }
    const lounger = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.5, 0.9),
      new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.9 }),
    );
    lounger.position.y = 0.35;
    cabana.add(lounger);
    cabana.position.set(cx, 0, 244);
    scene.add(cabana);
    colliders.push({ minX: cx - 2.6, maxX: cx + 2.6, minZ: 241.4, maxZ: 246.6 });
  }
  // Palm court between the towers.
  for (const [px, pz] of [[-168, 216], [-112, 200], [-160, 236], [-118, 244], [-140, 186]]) {
    const palm = makePalmTree(rng);
    palm.position.set(px, 0, pz);
    scene.add(palm);
  }
  // Lifeguard tower over the pool, a volleyball court on the deck, and
  // a beach bar hut where the guests get their drinks.
  const towerLegsMat = new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.9 });
  for (const [lx, lz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 4.2, 6), towerLegsMat);
    leg.position.set(-158 + lx, 2.1, 232 + lz);
    scene.add(leg);
  }
  const towerSeat = new THREE.Mesh(
    new THREE.BoxGeometry(4.6, 0.5, 4.6),
    new THREE.MeshStandardMaterial({ color: 0xd8382e, roughness: 0.8 }),
  );
  towerSeat.position.set(-158, 4.4, 232);
  towerSeat.castShadow = true;
  scene.add(towerSeat);
  const towerRoof = new THREE.Mesh(
    new THREE.ConeGeometry(3.6, 1.8, 4),
    new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.9 }),
  );
  towerRoof.position.set(-158, 6.2, 232);
  towerRoof.rotation.y = Math.PI / 4;
  scene.add(towerRoof);
  colliders.push({ minX: -160.3, maxX: -155.7, minZ: 229.7, maxZ: 234.3 });
  // Volleyball court: sand patch, net, and a ball on the sand.
  const court = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 7),
    new THREE.MeshStandardMaterial({ color: 0xe8cf9a, roughness: 1 }),
  );
  court.rotation.x = -Math.PI / 2;
  court.position.set(-120, 0.06, 238);
  scene.add(court);
  const netMat = new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.9, side: THREE.DoubleSide });
  const net = new THREE.Mesh(new THREE.PlaneGeometry(7, 1), netMat);
  net.position.set(-120, 1.4, 238);
  scene.add(net);
  for (const side of [-1, 1]) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 2.4, 6),
      new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.6 }),
    );
    pole.position.set(-120 + side * 3.6, 1.2, 238);
    scene.add(pole);
  }
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.6 }),
  );
  ball.position.set(-118, 0.4, 240);
  ball.castShadow = true;
  scene.add(ball);
  // Beach bar hut: a thatched roof on posts, a counter, and stools.
  const hut = new THREE.Group();
  const hutRoof = new THREE.Mesh(
    new THREE.ConeGeometry(4.4, 2.2, 6),
    new THREE.MeshStandardMaterial({ color: 0xc8a86a, roughness: 1 }),
  );
  hutRoof.position.y = 3.6;
  hutRoof.castShadow = true;
  hut.add(hutRoof);
  for (const [px, pz] of [[-3.4, -3.4], [3.4, -3.4], [-3.4, 3.4], [3.4, 3.4]]) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 2.8, 6),
      new THREE.MeshStandardMaterial({ color: 0x5a4630, roughness: 1 }),
    );
    post.position.set(px, 1.4, pz);
    hut.add(post);
  }
  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(5, 1, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.9 }),
  );
  counter.position.set(0, 0.6, 0);
  hut.add(counter);
  for (let i = 0; i < 3; i++) {
    const stool = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: 0xd8382e, roughness: 0.8 }),
    );
    stool.position.set(-1.6 + i * 1.6, 0.25, 1.4);
    hut.add(stool);
  }
  hut.position.set(-166, 0, 224);
  scene.add(hut);
  colliders.push({ minX: -169.5, maxX: -162.5, minZ: 220.5, maxZ: 227.5 });
  // Resort sign: a tall post with a glowing board by the avenue.
  const signPost = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 12, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.7 }),
  );
  signPost.position.set(-168, 6, 186);
  scene.add(signPost);
  const signBoard = new THREE.Mesh(
    new THREE.BoxGeometry(10, 3, 0.4),
    new THREE.MeshStandardMaterial({ color: 0xd8382e, emissive: 0x881818, emissiveIntensity: 0.5, roughness: 0.7 }),
  );
  signBoard.position.set(-168, 12.5, 186);
  signBoard.castShadow = true;
  scene.add(signBoard);
  colliders.push({ minX: -168.5, maxX: -167.5, minZ: 185.5, maxZ: 186.5 });

  // --- Solmar Airport -------------------------------------------------------
  // Terminal, control tower, runway and apron on the south-east flats.
  const apron = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 90),
    new THREE.MeshStandardMaterial({ color: 0x8d8d94, roughness: 1 }),
  );
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(150, 0.045, 240);
  apron.receiveShadow = true;
  scene.add(apron);

  // Terminal: a long low building with a glass front and a sign band.
  const terminal = new THREE.Mesh(
    new THREE.BoxGeometry(46, 12, 18),
    new THREE.MeshStandardMaterial({ color: 0xc8c4b8, roughness: 0.85 }),
  );
  terminal.position.set(140, 6, 214);
  terminal.castShadow = true;
  scene.add(terminal);
  colliders.push({ minX: 117, maxX: 163, minZ: 205, maxZ: 223 });
  const glassFront = new THREE.Mesh(
    new THREE.BoxGeometry(44, 7, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x18202e, roughness: 0.1, metalness: 0.7 }),
  );
  glassFront.position.set(140, 5, 223.2);
  scene.add(glassFront);
  const termSign = new THREE.Mesh(
    new THREE.BoxGeometry(30, 2.2, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x2e6fd8, emissive: 0x1a3a6a, emissiveIntensity: 0.6, roughness: 0.8 }),
  );
  termSign.position.set(140, 11, 223.2);
  scene.add(termSign);
  // Departures annexe beside the terminal.
  const annexe = new THREE.Mesh(
    new THREE.BoxGeometry(20, 9, 14),
    new THREE.MeshStandardMaterial({ color: 0xa89a80, roughness: 0.9 }),
  );
  annexe.position.set(210, 4.5, 214);
  annexe.castShadow = true;
  scene.add(annexe);
  colliders.push({ minX: 200, maxX: 220, minZ: 207, maxZ: 221 });

  // Control tower: a tapering shaft with a glass cab and a spinning radar.
  const towerShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 3.6, 26, 10),
    new THREE.MeshStandardMaterial({ color: 0xd8d2c2, roughness: 0.8 }),
  );
  towerShaft.position.set(70, 13, 216);
  towerShaft.castShadow = true;
  scene.add(towerShaft);
  colliders.push({ minX: 66.4, maxX: 73.6, minZ: 212.4, maxZ: 219.6 });
  const towerCab = new THREE.Mesh(
    new THREE.CylinderGeometry(4.4, 3.4, 4, 10),
    new THREE.MeshStandardMaterial({ color: 0x18202e, roughness: 0.1, metalness: 0.7 }),
  );
  towerCab.position.set(70, 28, 216);
  scene.add(towerCab);
  const radarBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 2.2, 6),
    new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.6, metalness: 0.5 }),
  );
  radarBase.position.set(70, 31, 216);
  scene.add(radarBase);
  const radar = new THREE.Group();
  const radarBar = new THREE.Mesh(
    new THREE.BoxGeometry(5.4, 0.25, 0.7),
    new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.5, metalness: 0.4 }),
  );
  radarBar.position.set(2.2, 0, 0);
  radar.add(radarBar);
  const radarDish = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 0.3, 10),
    new THREE.MeshStandardMaterial({ color: 0x8a8a92, roughness: 0.5, metalness: 0.5 }),
  );
  radarDish.position.set(-1.4, 0, 0);
  radar.add(radarDish);
  radar.position.set(70, 32.2, 216);
  scene.add(radar);
  animated.radar = radar;

  // Runway 27: a long dark strip with threshold bars, centre dashes and
  // edge lights that pulse at night, plus a windsock at the threshold.
  const runway = new THREE.Mesh(
    new THREE.PlaneGeometry(320, 18),
    new THREE.MeshStandardMaterial({ color: 0x2e2e34, roughness: 0.95 }),
  );
  runway.rotation.x = -Math.PI / 2;
  runway.position.set(120, 0.05, 272);
  runway.receiveShadow = true;
  scene.add(runway);
  const runwayMarkMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.8 });
  for (let x = -30; x < 280; x += 22) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(8, 1), runwayMarkMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(x, 0.07, 272);
    scene.add(dash);
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 8; i++) {
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 10), runwayMarkMat);
      bar.rotation.x = -Math.PI / 2;
      bar.position.set(side > 0 ? 268 : -28, 0.07, 272 - 6 + i * 1.8);
      scene.add(bar);
    }
  }
  const edgeLightMat = new THREE.MeshBasicMaterial({ color: 0x7dff8a });
  for (let x = -36; x <= 276; x += 24) {
    for (const z of [262, 282]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.7), edgeLightMat);
      lamp.position.set(x, 0.35, z);
      scene.add(lamp);
      animated.runwayLights.push(lamp);
    }
  }
  // Windsock: pole, orange cone pointing into the wind.
  const sockPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.18, 7, 6),
    new THREE.MeshStandardMaterial({ color: 0x8a8a92, roughness: 0.6, metalness: 0.5 }),
  );
  sockPole.position.set(-34, 3.5, 258);
  scene.add(sockPole);
  const sock = new THREE.Mesh(
    new THREE.ConeGeometry(0.9, 3.2, 8),
    new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.8 }),
  );
  sock.rotation.z = Math.PI / 2 - 0.35;
  sock.position.set(-32.4, 6.6, 258);
  scene.add(sock);
  animated.windsock = sock;

  // Two parked jets on the apron, and one that taxis the runway on a loop.
  makePlane(scene, 190, 250, Math.PI / 2, 0xe8e4da);
  colliders.push({ minX: 178, maxX: 202, minZ: 244, maxZ: 256 });
  makePlane(scene, 96, 250, -Math.PI / 2, 0x2e6fd8);
  colliders.push({ minX: 84, maxX: 108, minZ: 244, maxZ: 256 });
  const taxiPlane = makePlane(scene, -30, 272, Math.PI / 2, 0xc2432b);
  animated.taxiPlane = taxiPlane;

  // Fuel truck and luggage carts by the terminal, for the runway job.
  // The truck does not sit still: it loops the apron between the
  // terminal and the parked jets, and its collider rides with it so the
  // player cannot walk through the moving truck.
  const fuelTruck = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 2.2, 6.4),
    new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.6, metalness: 0.3 }),
  );
  fuelTruck.position.set(168, 1.4, 232);
  fuelTruck.castShadow = true;
  scene.add(fuelTruck);
  const fuelCollider = { minX: 166.8, maxX: 169.2, minZ: 228.8, maxZ: 235.2 };
  colliders.push(fuelCollider);
  animated.fuelTruck = fuelTruck;
  animated.fuelCollider = fuelCollider;
  for (let i = 0; i < 3; i++) {
    const cart = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 1.2, 1.6),
      new THREE.MeshStandardMaterial({ color: 0x5a7086, roughness: 0.8, metalness: 0.3 }),
    );
    cart.position.set(176 + i * 4, 0.7, 236);
    cart.castShadow = true;
    scene.add(cart);
  }

  return {
    colliders,
    update(dt, time, isNight) {
      if (animated.radar) animated.radar.rotation.y = time * 1.4;
      // Runway edge lights breathe at night and sit dim by day.
      const glow = isNight ? 0.55 + Math.sin(time * 2.2) * 0.45 : 0.25;
      edgeLightMat.color.setHex(isNight ? 0x7dff8a : 0x3a5a3a);
      for (const lamp of animated.runwayLights) {
        lamp.scale.setScalar(0.85 + glow * 0.3);
      }
      // The red jet taxis down the runway, turns at the far end, and
      // comes back — a slow loop that keeps the strip alive.
      if (animated.taxiPlane) {
        const leg = (time * 4.5) % 640;
        const along = leg < 320 ? leg : 640 - leg;
        animated.taxiPlane.position.x = -30 + along;
        animated.taxiPlane.position.z = 272;
        animated.taxiPlane.rotation.y = leg < 320 ? Math.PI / 2 : -Math.PI / 2;
      }
      // The windsock swings gently in the sea breeze.
      if (animated.windsock) {
        animated.windsock.rotation.z = Math.PI / 2 - 0.35 + Math.sin(time * 0.8) * 0.12;
      }
      // The fuel truck loops the apron: terminal → jet → jet → terminal,
      // 80 metres at 2 m/s, its collider riding along so the truck is
      // solid everywhere it drives.
      if (animated.fuelTruck && animated.fuelCollider) {
        const loop = (time * 2) % 80;
        let fx;
        let fz;
        let fHeading;
        if (loop < 22) {
          fx = 168 + loop; fz = 232; fHeading = Math.PI / 2;
        } else if (loop < 40) {
          fx = 190; fz = 232 + (loop - 22); fHeading = 0;
        } else if (loop < 62) {
          fx = 190 - (loop - 40); fz = 250; fHeading = -Math.PI / 2;
        } else {
          fx = 168; fz = 250 - (loop - 62); fHeading = Math.PI;
        }
        animated.fuelTruck.position.x = fx;
        animated.fuelTruck.position.z = fz;
        animated.fuelTruck.rotation.y = fHeading;
        const along = fHeading === 0 || fHeading === Math.PI;
        const hx = along ? 1.2 : 3.2;
        const hz = along ? 3.2 : 1.2;
        animated.fuelCollider.minX = fx - hx;
        animated.fuelCollider.maxX = fx + hx;
        animated.fuelCollider.minZ = fz - hz;
        animated.fuelCollider.maxZ = fz + hz;
      }
    },
  };
}

// The casino's gold sign by the resort door: a glowing box on two
// posts, so the tables read from the street the way the property
// signs do. Called once at boot, like the property signs.
export function buildCasinoSign(scene) {
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(6, 1.6, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x8a6a1a, emissive: 0xf2c230, emissiveIntensity: 0.7, metalness: 0.5, roughness: 0.4 }),
  );
  sign.position.set(-128, 4.2, 224);
  sign.castShadow = true;
  scene.add(sign);
  // A gold glow strip under the sign, so the casino door reads from
  // the avenue at night — the house wants to be found.
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(6, 0.3, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x8a6a1a, emissive: 0xf2c230, emissiveIntensity: 0.9, metalness: 0.5, roughness: 0.4 }),
  );
  strip.position.set(-128, 3.2, 224);
  scene.add(strip);
  for (const px of [-130.5, -125.5]) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 4.2, 6),
      new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.6 }),
    );
    post.position.set(px, 2.1, 224);
    scene.add(post);
  }
}

// The beach buggy hides behind the resort pool house — the rarest
// car in the south, and the only one that likes the sand.
export const SOUTH_RARE_SPOT = { x: -170, z: 238, kind: 'buggy', name: 'Beach Buggy' };

// A WANTED billboard on the resort road: the PD's fugitives, posted
// where the south side can read them — Saint's face is the biggest
// one on it, and the resort guests pretend not to notice.
export function buildBountyBillboard(scene) {
  const billboard = new THREE.Mesh(
    new THREE.BoxGeometry(5, 3, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x2a2018, emissive: 0x332211, emissiveIntensity: 0.4, roughness: 0.9 }),
  );
  billboard.position.set(-152, 4.5, 238);
  billboard.castShadow = true;
  scene.add(billboard);
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(5, 0.5, 0.45),
    new THREE.MeshBasicMaterial({ color: 0xffd23e }),
  );
  bar.position.set(-152, 5.8, 238);
  scene.add(bar);
  for (const px of [-154.5, -149.5]) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 4.5, 6),
      new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.6 }),
    );
    post.position.set(px, 2.25, 238);
    scene.add(post);
  }
  return billboard;
}

// The resort mural: a blank wall beside the pool house where the
// resort's guests watch the taggers work at sunset — the most
// photographed wall in Solmar, and the one the casino crowd tips for.
export function buildResortMural(scene) {
  const group = new THREE.Group();
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 2.6, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 1 }),
  );
  group.add(wall);
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(4.9, 0.35, 0.34),
    new THREE.MeshBasicMaterial({ color: 0xff5c8a }),
  );
  frame.position.set(0, 1.45, 0);
  group.add(frame);
  const can = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.4, 8),
    new THREE.MeshStandardMaterial({ color: 0xffc300, roughness: 0.4, metalness: 0.5 }),
  );
  can.position.set(-2.0, 0.3, 0.25);
  group.add(can);
  group.position.set(-138, 1.3, 226);
  group.rotation.y = Math.PI;
  scene.add(group);
  return group;
}

// The airport mural: a blank wall on the terminal fence where the
// ground crew paints between flights — the last wall most players
// find, and the one the tower watches over the runway.
export function buildAirportMural(scene) {
  const group = new THREE.Group();
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 2.6, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xc8c8d0, roughness: 1 }),
  );
  group.add(wall);
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(4.9, 0.35, 0.34),
    new THREE.MeshBasicMaterial({ color: 0x3cc8c0 }),
  );
  frame.position.set(0, 1.45, 0);
  group.add(frame);
  const can = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.4, 8),
    new THREE.MeshStandardMaterial({ color: 0xffc300, roughness: 0.4, metalness: 0.5 }),
  );
  can.position.set(-2.0, 0.3, 0.25);
  group.add(can);
  group.position.set(148, 1.3, 206);
  group.rotation.y = Math.PI / 2;
  scene.add(group);
  return group;
}

// The beach mural: a blank wall on the boardwalk where the surfers
// paint between sets — salt in the air, sand on the cans, and the
// best sunset view of any wall in Solmar.
export function buildBeachMural(scene) {
  const group = new THREE.Group();
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 2.6, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xe0d8c8, roughness: 1 }),
  );
  group.add(wall);
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(4.9, 0.35, 0.34),
    new THREE.MeshBasicMaterial({ color: 0xff2e88 }),
  );
  frame.position.set(0, 1.45, 0);
  group.add(frame);
  const can = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.4, 8),
    new THREE.MeshStandardMaterial({ color: 0xffc300, roughness: 0.4, metalness: 0.5 }),
  );
  can.position.set(2.0, 0.3, 0.25);
  group.add(can);
  group.position.set(-170, 1.3, 234);
  group.rotation.y = Math.PI;
  scene.add(group);
  return group;
}

// The film lot: the Solmar backlot on the beach at (-285, 90) — a
// facade wall for the street set, a camera crane on a tripod, and two
// floodlight poles, so the lot reads as a working set from the road.
// The ramps live here too (built by stunts.js), and the stunt crew's
// film van parks by the crane.
export function buildFilmLot(scene) {
  const group = new THREE.Group();
  // The street-set facade: a tall flat wall with a painted sign board.
  const facade = new THREE.Mesh(
    new THREE.BoxGeometry(14, 6, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x8a7a68, roughness: 1 }),
  );
  facade.position.set(0, 3, -6);
  facade.castShadow = true;
  group.add(facade);
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(8, 1.6, 0.2),
    new THREE.MeshBasicMaterial({ color: 0xffd23e }),
  );
  sign.position.set(0, 5.2, -5.6);
  group.add(sign);
  // The camera crane: a tripod mast, an angled arm, and the camera box.
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.2, 7, 6),
    new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.5, metalness: 0.6 }),
  );
  mast.position.set(6, 3.5, 2);
  group.add(mast);
  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.3, 6),
    new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.5, metalness: 0.6 }),
  );
  arm.position.set(6, 6.6, 0);
  arm.rotation.x = 0.5;
  group.add(arm);
  const camera = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.6, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.4 }),
  );
  camera.position.set(6, 5.4, -2.4);
  group.add(camera);
  // Two floodlight poles so the set stays lit after dark.
  for (const lx of [-8, 10]) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.14, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.6, metalness: 0.6 }),
    );
    pole.position.set(lx, 3, 4);
    group.add(pole);
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.7, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xfff2c0 }),
    );
    head.position.set(lx, 6.2, 4);
    group.add(head);
  }
  // The backlot street: a second set down the beach — a western street
  // facade with a water tower behind it, so the lot reads as a town
  // from the sand and not a single wall.
  const street = new THREE.Mesh(
    new THREE.BoxGeometry(10, 4.5, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x9a6a4a, roughness: 1 }),
  );
  street.position.set(-12, 2.25, 2);
  street.rotation.y = 0.5;
  street.castShadow = true;
  group.add(street);
  const streetSign = new THREE.Mesh(
    new THREE.BoxGeometry(5, 1.1, 0.2),
    new THREE.MeshBasicMaterial({ color: 0xc2432b }),
  );
  streetSign.position.set(-12, 3.9, 2.4);
  streetSign.rotation.y = 0.5;
  group.add(streetSign);
  // A second camera crane for the western set: a shorter mast, a
  // counterweighted arm, and the camera box aimed down the street —
  // the second unit shoots the backlot street while the first unit
  // shoots the main facade.
  const mast2 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.18, 5, 6),
    new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.5, metalness: 0.6 }),
  );
  mast2.position.set(-16, 2.5, 6);
  group.add(mast2);
  const arm2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.25, 4.5),
    new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.5, metalness: 0.6 }),
  );
  arm2.position.set(-16, 4.8, 4);
  arm2.rotation.x = 0.45;
  group.add(arm2);
  const camera2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.55, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.4 }),
  );
  camera2.position.set(-16, 3.9, 1.8);
  group.add(camera2);
  // The water tower: four legs, a tank, a cone roof — the lot's skyline.
  const tankMat = new THREE.MeshStandardMaterial({ color: 0x6a7a8a, roughness: 0.8, metalness: 0.3 });
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 2.4, 10), tankMat);
  tank.position.set(12, 7.2, -4);
  tank.castShadow = true;
  group.add(tank);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.2, 10), tankMat);
  roof.position.set(12, 9, -4);
  group.add(roof);
  for (const [lx, lz] of [[10.8, -2.8], [13.2, -2.8], [10.8, -5.2], [13.2, -5.2]]) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.12, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.6, metalness: 0.5 }),
    );
    leg.position.set(lx, 3, lz);
    group.add(leg);
  }
  // The director's corner: two canvas chairs and a folding table with
  // the shooting script, where the director waits between takes.
  for (const cx of [-4, -2.2]) {
    const chair = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.9, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.9 }),
    );
    chair.position.set(cx, 0.45, 8);
    group.add(chair);
  }
  const table = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.1, 1),
    new THREE.MeshStandardMaterial({ color: 0x5a4a38, roughness: 0.9 }),
  );
  table.position.set(-3.1, 0.75, 9.5);
  group.add(table);
  const script = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.06, 0.7),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  script.position.set(-3.1, 0.82, 9.5);
  group.add(script);
  // Sandbags along the set edge, so the lot holds its line against the
  // wind — and against a car that comes in too hot.
  for (let i = 0; i < 6; i++) {
    const bag = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.45, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xb09a72, roughness: 1 }),
    );
    bag.position.set(-14 + i * 1.2, 0.22, 10);
    bag.rotation.y = (i % 2 ? 0.15 : -0.1);
    group.add(bag);
  }
  // Bunting between the floodlight poles: a string of small warm
  // bulbs that sways over the set at night, so the lot reads as a
  // party even when the cameras are off.
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (let i = 0; i <= 9; i++) {
    const t = i / 9;
    const bx = -8 + t * 18;
    const by = 6.2 - Math.sin(t * Math.PI) * 1.1;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), bulbMat);
    bulb.position.set(bx, by, 4);
    group.add(bulb);
  }
  group.position.set(-285, 0, 90);
  scene.add(group);
  return group;
}

// The south beach: the sand strip behind the resort pool, where the
// buggy hides and the sun sets over the water.
export const SOUTH_BEACH_SPOTS = [
  { x: -170, z: 238, name: 'Beach Buggy Hideout' },
  { x: -150, z: 246, name: 'South Beach' },
];
