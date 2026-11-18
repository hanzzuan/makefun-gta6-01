// city.js — builds Solmar, the sun-soaked coastal city.
// A seeded grid of avenues and streets, block buildings with lit windows,
// a beach and ocean on the west edge, palms, lamps and a low sunset sun.
// Exports the road network and building colliders the other systems use.

import * as THREE from 'three';
import { mulberry32, clamp } from './util.js';
import { buildSouth } from './south.js';

export const CITY_HALF = 280; // playable city extends -280..280 on x and z
export const ROAD_SPACING = 70;
export const ROAD_WIDTH = 12;

// Named places missions and the HUD point at.
export const PLACES = {
  plaza: { x: 0, z: 0, name: 'Solmar Plaza' },
  safehouse: { x: -70, z: 140, name: 'Mara\u2019s Safehouse' },
  garage: { x: 140, z: -140, name: 'Venn\u2019s Garage' },
  marina: { x: -238, z: 175, name: 'Marina del Sol' },
  warehouse: { x: -140, z: -140, name: 'Sunset Warehouse' },
  cafe: { x: 70, z: 140, name: 'Caf\u00e9 Lumen' },
  tower: { x: 70, z: -70, name: 'Solmar Tower' },
  boardwalk: { x: -252, z: 0, name: 'Boardwalk' },
  harbor: { x: 210, z: -210, name: 'North Harbor' },
  cannery: { x: 140, z: -210, name: 'Solmar Cannery' },
  freight: { x: 210, z: -140, name: 'Freight Yard' },
  dockside: { x: -320, z: -210, name: 'Dockside Pier' },
  // South Solmar: the beach resort and the airport, built by south.js.
  resort: { x: -140, z: 210, name: 'Palmera Resort' },
  airport: { x: 140, z: 215, name: 'Solmar Airport' },
  terminal: { x: 210, z: 215, name: 'Solmar Terminal' },
  control: { x: 70, z: 215, name: 'Control Tower' },
  runway: { x: 120, z: 272, name: 'Runway 27' },
};

function makeWindowTexture(rng, warm) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  // A light warm-grey facade so the building reads in the sunset, not black.
  g.fillStyle = warm ? '#8a6a72' : '#6a7488';
  g.fillRect(0, 0, 64, 128);
  for (let y = 8; y < 120; y += 14) {
    for (let x = 6; x < 58; x += 12) {
      const lit = rng() < 0.42;
      g.fillStyle = lit ? (rng() < 0.7 ? '#ffd98a' : '#9fd8ff') : '#2a2f42';
      g.fillRect(x, y, 8, 9);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makePalm(rng) {
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
  const nuts = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 6, 5),
    new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 1 }),
  );
  nuts.position.y = 6.3;
  group.add(nuts);
  return group;
}

export function buildCity(scene) {
  const rng = mulberry32(20261119);
  const colliders = []; // {minX, maxX, minZ, maxZ}
  const lamps = [];

  // --- sky, sun and light -------------------------------------------------
  scene.background = new THREE.Color(0xff9a5c);
  scene.fog = new THREE.Fog(0xff9a5c, 180, 620);
  const sun = new THREE.DirectionalLight(0xffd9a0, 2.6);
  sun.position.set(-160, 90, 120);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -300;
  sun.shadow.camera.right = 300;
  sun.shadow.camera.top = 300;
  sun.shadow.camera.bottom = -300;
  sun.shadow.camera.far = 700;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(0xffc98a, 0x3a4a6b, 0.9);
  scene.add(hemi);
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(26, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff2c0, fog: false }),
  );
  sunDisc.position.set(-420, 70, 260);
  sunDisc.lookAt(0, 40, 0);
  scene.add(sunDisc);

  // --- ground, beach, ocean ----------------------------------------------
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY_HALF * 2 + 320, CITY_HALF * 2 + 320),
    new THREE.MeshStandardMaterial({ color: 0x8f8578, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(-60, -0.1, 0);
  ground.receiveShadow = true;
  scene.add(ground);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(60, CITY_HALF * 2 + 320),
    new THREE.MeshStandardMaterial({ color: 0xe8cf9a, roughness: 1 }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(-CITY_HALF - 30, 0.02, 0);
  sand.receiveShadow = true;
  scene.add(sand);

  const oceanMat = new THREE.MeshStandardMaterial({
    color: 0x1e6f8e, roughness: 0.25, metalness: 0.35, transparent: true, opacity: 0.94,
  });
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(320, CITY_HALF * 2 + 400), oceanMat);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(-CITY_HALF - 190, 0.0, 0);
  scene.add(ocean);

  // --- roads ---------------------------------------------------------------
  const avenues = [];
  const streets = [];
  for (let v = -CITY_HALF + 35; v <= CITY_HALF - 35; v += ROAD_SPACING) {
    avenues.push(v);
    streets.push(v);
  }
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x4a4b55, roughness: 0.95 });
  const dashMat = new THREE.MeshStandardMaterial({ color: 0xd8d2a0, roughness: 0.8 });
  const walkMat = new THREE.MeshStandardMaterial({ color: 0xcac2b2, roughness: 1 });
  const roadGeoX = new THREE.PlaneGeometry(CITY_HALF * 2, ROAD_WIDTH);
  const roadGeoZ = new THREE.PlaneGeometry(ROAD_WIDTH, CITY_HALF * 2);
  for (const v of avenues) {
    const r = new THREE.Mesh(roadGeoZ, roadMat);
    r.rotation.x = -Math.PI / 2;
    r.position.set(v, 0.05, 0);
    r.receiveShadow = true;
    scene.add(r);
    const w1 = new THREE.Mesh(new THREE.PlaneGeometry(3, CITY_HALF * 2), walkMat);
    w1.rotation.x = -Math.PI / 2;
    w1.position.set(v - ROAD_WIDTH / 2 - 1.5, 0.06, 0);
    scene.add(w1);
    const w2 = w1.clone();
    w2.position.x = v + ROAD_WIDTH / 2 + 1.5;
    scene.add(w2);
    for (let z = -CITY_HALF + 20; z < CITY_HALF; z += 18) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 6), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(v, 0.07, z);
      scene.add(dash);
    }
  }
  for (const v of streets) {
    const r = new THREE.Mesh(roadGeoX, roadMat);
    r.rotation.x = -Math.PI / 2;
    r.position.set(0, 0.05, v);
    r.receiveShadow = true;
    scene.add(r);
    const w1 = new THREE.Mesh(new THREE.PlaneGeometry(CITY_HALF * 2, 3), walkMat);
    w1.rotation.x = -Math.PI / 2;
    w1.position.set(0, 0.06, v - ROAD_WIDTH / 2 - 1.5);
    scene.add(w1);
    const w2 = w1.clone();
    w2.position.z = v + ROAD_WIDTH / 2 + 1.5;
    scene.add(w2);
    for (let x = -CITY_HALF + 20; x < CITY_HALF; x += 18) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.6), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(x, 0.07, v);
      scene.add(dash);
    }
  }

  // --- block ground: pavement, grass and parking lots so no block is bare dirt
  const blockMats = [
    new THREE.MeshStandardMaterial({ color: 0x9a938a, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0x7d9a5e, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0x8d867c, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0xa89a80, roughness: 1 }),
  ];
  const blockGeo = new THREE.PlaneGeometry(ROAD_SPACING - ROAD_WIDTH - 3, ROAD_SPACING - ROAD_WIDTH - 3);
  for (let bx = -3; bx <= 3; bx++) {
    for (let bz = -3; bz <= 3; bz++) {
      const cx = bx * ROAD_SPACING;
      const cz = bz * ROAD_SPACING;
      if (Math.abs(cx) < 55 && Math.abs(cz) < 55) continue; // the plaza
      if (distToPlaces(cx, cz) < 26) continue;
      const slab = new THREE.Mesh(blockGeo, blockMats[Math.floor(rng() * blockMats.length)]);
      slab.rotation.x = -Math.PI / 2;
      slab.position.set(cx, 0.04, cz);
      slab.receiveShadow = true;
      scene.add(slab);
    }
  }

  // --- buildings -----------------------------------------------------------
  const texA = makeWindowTexture(rng, true);
  const texB = makeWindowTexture(rng, false);
  const palette = [0x9a8fa8, 0xb08a6a, 0x7d8aa0, 0xc2a878, 0x8a9a8a, 0xa88a9a, 0x6a7a94];
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  for (let bx = -3; bx <= 3; bx++) {
    for (let bz = -3; bz <= 3; bz++) {
      // Block centres sit between the roads (roads run at -245, -175, ...).
      const cx = bx * ROAD_SPACING;
      const cz = bz * ROAD_SPACING;
      // Keep the central plaza and the named places clear.
      if (Math.abs(cx) < 55 && Math.abs(cz) < 55) continue;
      if (distToPlaces(cx, cz) < 26) continue;
      const n = 1 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const w = 16 + rng() * 16;
        const d = 16 + rng() * 16;
        const nearCenter = Math.abs(cx) + Math.abs(cz) < 140;
        const h = nearCenter ? 22 + rng() * 55 : 10 + rng() * 26;
        const px = cx + (rng() - 0.5) * (ROAD_SPACING - w - 16);
        const pz = cz + (rng() - 0.5) * (ROAD_SPACING - d - 16);
        const mat = new THREE.MeshStandardMaterial({
          color: palette[Math.floor(rng() * palette.length)],
          map: rng() < 0.6 ? texA : texB,
          emissive: 0xffc27a,
          emissiveMap: rng() < 0.6 ? texA : texB,
          emissiveIntensity: 0.28,
          roughness: 0.85,
        });
        const b = new THREE.Mesh(boxGeo, mat);
        b.scale.set(w, h, d);
        b.position.set(px, h / 2, pz);
        b.castShadow = true;
        b.receiveShadow = true;
        scene.add(b);
        colliders.push({ minX: px - w / 2, maxX: px + w / 2, minZ: pz - d / 2, maxZ: pz + d / 2 });
        // Rooftop box so the skyline is not flat.
        if (rng() < 0.5) {
          const roof = new THREE.Mesh(
            new THREE.BoxGeometry(4 + rng() * 4, 2 + rng() * 2, 4 + rng() * 4),
            new THREE.MeshStandardMaterial({ color: 0x4a4a52, roughness: 1 }),
          );
          roof.position.set(px + (rng() - 0.5) * w * 0.4, h + 1.5, pz + (rng() - 0.5) * d * 0.4);
          roof.castShadow = true;
          scene.add(roof);
        }
      }
    }
  }

  // Solmar Tower — the landmark skyscraper by the plaza.
  const towerMat = new THREE.MeshStandardMaterial({
    color: 0xd8c9a0, map: texA, emissive: 0xffc27a, emissiveMap: texA,
    emissiveIntensity: 0.35, roughness: 0.6, metalness: 0.2,
  });
  const tower = new THREE.Mesh(new THREE.BoxGeometry(26, 130, 26), towerMat);
  tower.position.set(PLACES.tower.x, 65, PLACES.tower.z);
  tower.castShadow = true;
  scene.add(tower);
  colliders.push({
    minX: PLACES.tower.x - 13, maxX: PLACES.tower.x + 13,
    minZ: PLACES.tower.z - 13, maxZ: PLACES.tower.z + 13,
  });
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff4040 }),
  );
  beacon.position.set(PLACES.tower.x, 132, PLACES.tower.z);
  scene.add(beacon);

  // Central plaza: fountain ring and a low wall.
  const plazaMat = new THREE.MeshStandardMaterial({ color: 0xcfc4ae, roughness: 0.9 });
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(20, 20, 0.5, 24), plazaMat);
  plaza.position.set(0, 0.25, 0);
  plaza.receiveShadow = true;
  scene.add(plaza);
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x3fa8c8, roughness: 0.15, metalness: 0.4 });
  const fountain = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 0.8, 20), waterMat);
  fountain.position.set(0, 0.6, 0);
  scene.add(fountain);

  // Safehouse: a small pink house with a garage door.
  const house = new THREE.Group();
  const houseBody = new THREE.Mesh(
    new THREE.BoxGeometry(14, 7, 10),
    new THREE.MeshStandardMaterial({ color: 0xe8a0a8, roughness: 0.9 }),
  );
  houseBody.position.y = 3.5;
  houseBody.castShadow = true;
  house.add(houseBody);
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(10, 4, 4),
    new THREE.MeshStandardMaterial({ color: 0x8a4a3a, roughness: 1 }),
  );
  roof.position.y = 9;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  house.add(roof);
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(5, 4.4, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x5a5a66, roughness: 0.7, metalness: 0.4 }),
  );
  door.position.set(3.5, 2.2, 5.1);
  house.add(door);
  house.position.set(PLACES.safehouse.x, 0, PLACES.safehouse.z);
  scene.add(house);
  colliders.push({
    minX: PLACES.safehouse.x - 7, maxX: PLACES.safehouse.x + 7,
    minZ: PLACES.safehouse.z - 5, maxZ: PLACES.safehouse.z + 5,
  });

  // Warehouse at the marina end: long low shed, with a loading door, a sign
  // band, and crates and barrels stacked by the door.
  const shed = new THREE.Mesh(
    new THREE.BoxGeometry(30, 9, 18),
    new THREE.MeshStandardMaterial({ color: 0x7a6a5a, roughness: 0.95 }),
  );
  shed.position.set(PLACES.warehouse.x, 4.5, PLACES.warehouse.z);
  shed.castShadow = true;
  scene.add(shed);
  colliders.push({
    minX: PLACES.warehouse.x - 15, maxX: PLACES.warehouse.x + 15,
    minZ: PLACES.warehouse.z - 9, maxZ: PLACES.warehouse.z + 9,
  });
  const shedDoor = new THREE.Mesh(
    new THREE.BoxGeometry(8, 6.5, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x3a3a42, roughness: 0.7, metalness: 0.4 }),
  );
  shedDoor.position.set(PLACES.warehouse.x, 3.25, PLACES.warehouse.z + 9.2);
  scene.add(shedDoor);
  const shedSign = new THREE.Mesh(
    new THREE.BoxGeometry(20, 1.6, 0.4),
    new THREE.MeshStandardMaterial({ color: 0xd8c9a0, roughness: 0.8 }),
  );
  shedSign.position.set(PLACES.warehouse.x, 8, PLACES.warehouse.z + 9.2);
  scene.add(shedSign);
  const crateMat = new THREE.MeshStandardMaterial({ color: 0xa88a5a, roughness: 1 });
  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x4a6a8a, roughness: 0.6, metalness: 0.3 });
  const crateSpots = [
    [PLACES.warehouse.x - 18, PLACES.warehouse.z + 14, 2.4],
    [PLACES.warehouse.x - 15.5, PLACES.warehouse.z + 14, 1.8],
    [PLACES.warehouse.x - 17, PLACES.warehouse.z + 14, 1.8],
    [PLACES.warehouse.x + 17, PLACES.warehouse.z + 13, 2.2],
    [PLACES.warehouse.x + 19, PLACES.warehouse.z + 15, 1.6],
  ];
  for (const [cx, cz, s] of crateSpots) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), crateMat);
    crate.position.set(cx, s / 2, cz);
    crate.rotation.y = rng() * 0.8;
    crate.castShadow = true;
    scene.add(crate);
  }
  for (const [bx, bz] of [[PLACES.warehouse.x + 12, PLACES.warehouse.z + 15], [PLACES.warehouse.x + 13.5, PLACES.warehouse.z + 15]]) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.2, 10), barrelMat);
    barrel.position.set(bx, 1.1, bz);
    barrel.castShadow = true;
    scene.add(barrel);
  }

  // Marina: wooden pier out over the water.
  const pier = new THREE.Mesh(
    new THREE.BoxGeometry(8, 0.6, 60),
    new THREE.MeshStandardMaterial({ color: 0x8a6a42, roughness: 1 }),
  );
  pier.position.set(PLACES.marina.x, 0.4, PLACES.marina.z + 10);
  pier.castShadow = true;
  scene.add(pier);

  // --- North Harbor: the industrial port district -------------------------
  // The north-east blocks are the working port: the Solmar Cannery, the
  // Freight Yard with its container stacks, two gantry cranes over the dock
  // road, and a pier out into the ocean at the north end of the beach.
  // The generic building loop already skipped these blocks (they sit within
  // 26 m of the new PLACES), so the district is built here by hand.
  const boats = [];
  let ferry = null;
  const yardSlab = new THREE.Mesh(
    new THREE.PlaneGeometry(150, 130),
    new THREE.MeshStandardMaterial({ color: 0x7e7a72, roughness: 1 }),
  );
  yardSlab.rotation.x = -Math.PI / 2;
  yardSlab.position.set(205, 0.045, -180);
  yardSlab.receiveShadow = true;
  scene.add(yardSlab);

  // Solmar Cannery: a long low shed with a pale sign band and a loading bay.
  const cannery = new THREE.Mesh(
    new THREE.BoxGeometry(36, 10, 20),
    new THREE.MeshStandardMaterial({ color: 0x9a7a5a, roughness: 0.95 }),
  );
  cannery.position.set(PLACES.cannery.x, 5, PLACES.cannery.z);
  cannery.castShadow = true;
  scene.add(cannery);
  colliders.push({
    minX: PLACES.cannery.x - 18, maxX: PLACES.cannery.x + 18,
    minZ: PLACES.cannery.z - 10, maxZ: PLACES.cannery.z + 10,
  });
  const cannerySign = new THREE.Mesh(
    new THREE.BoxGeometry(24, 2, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x3f7a8a, roughness: 0.8 }),
  );
  cannerySign.position.set(PLACES.cannery.x, 8.6, PLACES.cannery.z + 10.2);
  scene.add(cannerySign);
  const canneryDoor = new THREE.Mesh(
    new THREE.BoxGeometry(9, 7, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x2e2e34, roughness: 0.7, metalness: 0.4 }),
  );
  canneryDoor.position.set(PLACES.cannery.x + 8, 3.5, PLACES.cannery.z + 10.2);
  scene.add(canneryDoor);
  // Vent stacks on the cannery roof.
  const stackMat = new THREE.MeshStandardMaterial({ color: 0x5a5a62, roughness: 0.8, metalness: 0.3 });
  for (const [sx, sz] of [[-10, -4], [2, 5], [12, -5]]) {
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 7, 8), stackMat);
    stack.position.set(PLACES.cannery.x + sx, 13.5, PLACES.cannery.z + sz);
    stack.castShadow = true;
    scene.add(stack);
  }

  // Freight warehouse: corrugated blue-grey, bigger doors, taller roofline.
  const freightShed = new THREE.Mesh(
    new THREE.BoxGeometry(28, 11, 24),
    new THREE.MeshStandardMaterial({ color: 0x5a7086, roughness: 0.9, metalness: 0.25 }),
  );
  freightShed.position.set(PLACES.freight.x, 5.5, PLACES.freight.z);
  freightShed.castShadow = true;
  scene.add(freightShed);
  colliders.push({
    minX: PLACES.freight.x - 14, maxX: PLACES.freight.x + 14,
    minZ: PLACES.freight.z - 12, maxZ: PLACES.freight.z + 12,
  });
  const freightDoor = new THREE.Mesh(
    new THREE.BoxGeometry(10, 8, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x33333a, roughness: 0.7, metalness: 0.4 }),
  );
  freightDoor.position.set(PLACES.freight.x - 4, 4, PLACES.freight.z + 12.2);
  scene.add(freightDoor);

  // Container stacks: painted steel boxes, some two high, in the yard
  // between the cannery and the freight shed.
  const containerColors = [0xc2432b, 0x2e6fd8, 0x3f8a4a, 0xd8a03c, 0x8a5fd0, 0x3cc8c0, 0xb8b0a0];
  const containerGeo = new THREE.BoxGeometry(6.2, 2.7, 2.6);
  const yardRows = [
    { x: 178, z: -232, n: 4 },
    { x: 178, z: -222, n: 5 },
    { x: 178, z: -188, n: 4 },
    { x: 238, z: -188, n: 3 },
  ];
  for (const row of yardRows) {
    for (let i = 0; i < row.n; i++) {
      const cx = row.x + i * 7.4;
      const mat = new THREE.MeshStandardMaterial({
        color: containerColors[Math.floor(rng() * containerColors.length)],
        roughness: 0.75, metalness: 0.35,
      });
      const box = new THREE.Mesh(containerGeo, mat);
      box.position.set(cx, 1.35, row.z);
      box.rotation.y = (rng() - 0.5) * 0.06;
      box.castShadow = true;
      scene.add(box);
      colliders.push({ minX: cx - 3.1, maxX: cx + 3.1, minZ: row.z - 1.3, maxZ: row.z + 1.3 });
      // A second box on top of about half the stacks.
      if (rng() < 0.5) {
        const top = new THREE.Mesh(
          containerGeo,
          new THREE.MeshStandardMaterial({
            color: containerColors[Math.floor(rng() * containerColors.length)],
            roughness: 0.75, metalness: 0.35,
          }),
        );
        top.position.set(cx + (rng() - 0.5) * 0.6, 4.05, row.z);
        top.rotation.y = (rng() - 0.5) * 0.1;
        top.castShadow = true;
        scene.add(top);
      }
    }
  }

  // Gantry cranes: two steel frames straddling the dock road, with a
  // trolley beam and a hook cable hanging over the containers.
  function makeGantryCrane(cx, cz) {
    const group = new THREE.Group();
    const steel = new THREE.MeshStandardMaterial({ color: 0xd8b23c, roughness: 0.6, metalness: 0.5 });
    const darkSteel = new THREE.MeshStandardMaterial({ color: 0x3a3a42, roughness: 0.7, metalness: 0.4 });
    for (const [lx, lz] of [[-9, -5], [9, -5], [-9, 5], [9, 5]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(1.4, 30, 1.4), steel);
      leg.position.set(lx, 15, lz);
      leg.castShadow = true;
      group.add(leg);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(26, 2.2, 3), steel);
    beam.position.set(0, 30, 0);
    beam.castShadow = true;
    group.add(beam);
    const jib = new THREE.Mesh(new THREE.BoxGeometry(14, 1.6, 2), steel);
    jib.position.set(16, 30, 0);
    group.add(jib);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 3.4), darkSteel);
    cab.position.set(4, 27.5, 0);
    group.add(cab);
    const cable = new THREE.Mesh(new THREE.BoxGeometry(0.25, 12, 0.25), darkSteel);
    cable.position.set(-4, 23, 0);
    group.add(cable);
    const hook = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.2), darkSteel);
    hook.position.set(-4, 16.5, 0);
    group.add(hook);
    group.position.set(cx, 0, cz);
    scene.add(group);
    colliders.push({ minX: cx - 10, maxX: cx + 10, minZ: cz - 6, maxZ: cz + 6 });
    return group;
  }
  makeGantryCrane(185, -205);
  makeGantryCrane(245, -168);
  // The crane hooks slide along their beams on a slow loop, so the yard
  // never looks frozen. The hooks are kept in a list the update loop moves.
  const craneHooks = [];
  for (const [cx, cz] of [[185, -205], [245, -168]]) {
    const trolley = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 1.6, 2.5),
      new THREE.MeshStandardMaterial({ color: 0x3a3a42, roughness: 0.7, metalness: 0.4 }),
    );
    trolley.position.set(cx - 4, 29, cz);
    scene.add(trolley);
    const cable = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 12, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.8 }),
    );
    cable.position.set(cx - 4, 22, cz);
    scene.add(cable);
    const hook = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.2, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.8 }),
    );
    hook.position.set(cx - 4, 15.5, cz);
    scene.add(hook);
    craneHooks.push({ trolley, cable, hook, cx, cz, phase: cx * 0.05 });
  }

  // Harbor office: a two-storey block with a lit sign, the yard's brain.
  const office = new THREE.Mesh(
    new THREE.BoxGeometry(16, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xb08a6a, roughness: 0.9 }),
  );
  office.position.set(150, 6, -168);
  office.castShadow = true;
  scene.add(office);
  colliders.push({ minX: 142, maxX: 158, minZ: -174, maxZ: -162 });
  const officeSign = new THREE.Mesh(
    new THREE.BoxGeometry(10, 1.8, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x2e6f8e, roughness: 0.8 }),
  );
  officeSign.position.set(150, 10.5, -161.8);
  scene.add(officeSign);

  // Fish-market stalls along the cannery wall: striped awnings over crates.
  const stallColors = [0xd8382e, 0x2e6fd8, 0x3f8a4a];
  for (let i = 0; i < 4; i++) {
    const sx = 122 + i * 9;
    const stall = new THREE.Group();
    const counter = new THREE.Mesh(
      new THREE.BoxGeometry(5, 1.1, 2.4),
      new THREE.MeshStandardMaterial({ color: 0x8a6a42, roughness: 1 }),
    );
    counter.position.y = 0.55;
    counter.castShadow = true;
    stall.add(counter);
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(5.6, 0.15, 3),
      new THREE.MeshStandardMaterial({ color: stallColors[i % 3], roughness: 0.9 }),
    );
    awning.position.set(0, 2.6, 0);
    awning.rotation.x = 0.25;
    stall.add(awning);
    for (const [px, pz] of [[-1.8, -0.6], [0.4, -0.8], [1.8, -0.4]]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 2.6, 6),
        new THREE.MeshStandardMaterial({ color: 0x5a4630, roughness: 1 }),
      );
      post.position.set(px, 1.3, pz);
      stall.add(post);
    }
    stall.position.set(sx, 0, PLACES.cannery.z - 14);
    scene.add(stall);
    colliders.push({ minX: sx - 2.8, maxX: sx + 2.8, minZ: PLACES.cannery.z - 15.5, maxZ: PLACES.cannery.z - 12.5 });
  }

  // Lighthouse at the end of the dockside pier: a striped tower whose beam
  // sweeps the water after dark.
  const lighthouse = new THREE.Group();
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.85 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xd8382e, roughness: 0.85 });
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2 - i * 0.18, 2.4 - i * 0.18, 3.4, 10),
      i % 2 === 0 ? lightMat : stripeMat,
    );
    seg.position.y = 1.7 + i * 3.4;
    seg.castShadow = true;
    lighthouse.add(seg);
  }
  const lampRoom = new THREE.Mesh(
    new THREE.CylinderGeometry(1.9, 1.9, 2.4, 10),
    new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.6, metalness: 0.4 }),
  );
  lampRoom.position.y = 18.6;
  lighthouse.add(lampRoom);
  const beaconLight = new THREE.Mesh(
    new THREE.SphereGeometry(1.1, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8 }),
  );
  beaconLight.position.y = 18.6;
  lighthouse.add(beaconLight);
  const beamGeo = new THREE.ConeGeometry(9, 60, 12, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xffe9a8, transparent: true, opacity: 0.0, side: THREE.DoubleSide,
    depthWrite: false,
  });
  // The beam pivots on the lamp room so it sweeps the water after dark.
  const beamPivot = new THREE.Group();
  beamPivot.position.set(0, 18.6, 0);
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.rotation.z = Math.PI / 2;
  beam.position.set(30, 0, 0);
  beamPivot.add(beam);
  lighthouse.add(beamPivot);
  lighthouse.position.set(-352, 0, PLACES.dockside.z);
  scene.add(lighthouse);

  // Floodlight poles so the yard stays readable after dark.
  const floodMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.6, metalness: 0.6 });
  const floodHeadMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0 });
  const floodHeads = [];
  for (const [fx, fz] of [[150, -232], [262, -232], [150, -148], [262, -148]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 13, 6), floodMat);
    pole.position.set(fx, 6.5, fz);
    scene.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 1.2), floodHeadMat);
    head.position.set(fx, 13.2, fz);
    scene.add(head);
    floodHeads.push(head);
  }

  // Dockside pier: a long wooden pier out over the ocean at the north end
  // of the beach, with two moored boats that bob on the swell.
  const dockPier = new THREE.Mesh(
    new THREE.BoxGeometry(70, 0.7, 9),
    new THREE.MeshStandardMaterial({ color: 0x8a6a42, roughness: 1 }),
  );
  dockPier.position.set(-322, 0.5, PLACES.dockside.z);
  dockPier.castShadow = true;
  scene.add(dockPier);
  colliders.push({
    minX: -330, maxX: -288, minZ: PLACES.dockside.z - 4.5, maxZ: PLACES.dockside.z + 4.5,
  });
  for (let i = 0; i < 5; i++) {
    const piling = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 3, 6),
      new THREE.MeshStandardMaterial({ color: 0x5a4630, roughness: 1 }),
    );
    piling.position.set(-300 - i * 12, 0.2, PLACES.dockside.z + 5.4);
    scene.add(piling);
  }
  function makeBoat(bx, bz, hullColor) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(11, 1.6, 4.2),
      new THREE.MeshStandardMaterial({ color: hullColor, roughness: 0.5, metalness: 0.3 }),
    );
    hull.position.y = 0.4;
    hull.castShadow = true;
    boat.add(hull);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(4.5, 2, 3),
      new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.6 }),
    );
    cabin.position.set(-1, 1.9, 0);
    cabin.castShadow = true;
    boat.add(cabin);
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 5, 6),
      new THREE.MeshStandardMaterial({ color: 0x3a3a42, roughness: 0.7 }),
    );
    mast.position.set(2.5, 3.4, 0);
    boat.add(mast);
    boat.position.set(bx, 0, bz);
    scene.add(boat);
    boats.push({ mesh: boat, phase: rng() * Math.PI * 2, baseY: 0 });
    return boat;
  }
  makeBoat(-332, -196, 0xd8e4e8);
  makeBoat(-336, -226, 0xc2432b);
  // The harbor ferry: a small white steamer that crosses the water in
  // front of the pier, out toward the lighthouse and back again.
  ferry = new THREE.Group();
  const ferryHull = new THREE.Mesh(
    new THREE.BoxGeometry(6, 1.6, 14),
    new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.6 }),
  );
  ferryHull.position.y = 0.8;
  ferryHull.castShadow = true;
  ferry.add(ferryHull);
  const ferryCabin = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 2, 8),
    new THREE.MeshStandardMaterial({ color: 0x2e6a8a, roughness: 0.7 }),
  );
  ferryCabin.position.y = 2.6;
  ferry.add(ferryCabin);
  const funnel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.6, 2.4, 10),
    new THREE.MeshStandardMaterial({ color: 0xd8382e, roughness: 0.7 }),
  );
  funnel.position.set(0, 4.6, -2);
  ferry.add(funnel);
  ferry.position.set(-540, 0, -200);
  scene.add(ferry);

  // --- palms and lamps along the roads ------------------------------------
  const palmSpots = [];
  for (const v of avenues) {
    for (let z = -CITY_HALF + 55; z < CITY_HALF; z += 70) {
      if (rng() < 0.75) palmSpots.push([v - 10, z + (rng() - 0.5) * 20]);
      if (rng() < 0.75) palmSpots.push([v + 10, z + (rng() - 0.5) * 20]);
    }
  }
  for (const [x, z] of palmSpots) {
    if (distToPlaces(x, z) < 14) continue;
    const palm = makePalm(rng);
    palm.position.set(x, 0, z);
    scene.add(palm);
  }
  const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.6, metalness: 0.6 });
  const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (const v of avenues) {
    for (let z = -CITY_HALF + 35; z < CITY_HALF; z += 70) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7, 6), lampPoleMat);
      pole.position.set(v + 8, 3.5, z);
      scene.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), lampGlowMat);
      bulb.position.set(v + 8, 7.1, z);
      scene.add(bulb);
      lamps.push(bulb);
    }
  }

  // Distant skyline silhouettes so the horizon is never empty.
  const farMat = new THREE.MeshStandardMaterial({ color: 0x7a5a78, roughness: 1 });
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const r = 430 + rng() * 90;
    const h = 40 + rng() * 90;
    const b = new THREE.Mesh(new THREE.BoxGeometry(24 + rng() * 20, h, 24 + rng() * 20), farMat);
    b.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
    scene.add(b);
  }

  function distToPlaces(x, z) {
    let best = 1e9;
    for (const p of Object.values(PLACES)) {
      const dx = x - p.x;
      const dz = z - p.z;
      best = Math.min(best, Math.sqrt(dx * dx + dz * dz));
    }
    return best;
  }

  // --- weather and the day/night cycle ------------------------------------
  // Solmar runs on a 300-second day: 0 is midnight, 0.25 dawn, 0.5 noon,
  // 0.75 the golden-hour sunset the game opens on. Weather rolls on its
  // own timer — clear stretches broken by rain showers — and the sky, sun,
  // lamps and rain all follow the same clock.
  let timeOfDay = 0.74;
  let weather = 'clear'; // 'clear' | 'rain'
  let rainLevel = 0; // 0..1, ramps toward the weather's target
  let weatherTimer = 42;
  const SKY_KEYS = [
    // t, background, sun colour, sun intensity, hemisphere intensity, disc
    [0.0, 0x0b1026, 0x8899ff, 0.12, 0.28, 0xdfe8ff],
    [0.22, 0x2a2140, 0xff9a7a, 0.5, 0.42, 0xffe9c0],
    [0.3, 0xff9a7a, 0xffb27a, 1.6, 0.62, 0xfff2c0],
    [0.5, 0x7ec8f0, 0xfff2d0, 2.8, 1.0, 0xfff6d8],
    [0.72, 0xff9a5c, 0xffd9a0, 2.6, 0.9, 0xfff2c0],
    [0.82, 0x3a2a55, 0xff8a5c, 0.7, 0.45, 0xffd9a0],
    [1.0, 0x0b1026, 0x8899ff, 0.12, 0.28, 0xdfe8ff],
  ];
  const tmpA = new THREE.Color();
  const tmpB = new THREE.Color();
  function sampleSky(t) {
    let i = 0;
    while (i < SKY_KEYS.length - 2 && t > SKY_KEYS[i + 1][0]) i += 1;
    const a = SKY_KEYS[i];
    const b = SKY_KEYS[i + 1];
    const f = Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0] || 1)));
    return {
      bg: tmpA.setHex(a[1]).lerp(tmpB.setHex(b[1]), f).clone(),
      sun: tmpA.setHex(a[2]).lerp(tmpB.setHex(b[2]), f).clone(),
      sunI: a[3] + (b[3] - a[3]) * f,
      hemiI: a[4] + (b[4] - a[4]) * f,
      disc: tmpA.setHex(a[5]).lerp(tmpB.setHex(b[5]), f).clone(),
    };
  }
  // Rain: a box of falling points that follows the player, so the shower
  // is always overhead wherever Mara is in the city.
  const RAIN_DROPS = 1400;
  const rainPos = new Float32Array(RAIN_DROPS * 3);
  for (let i = 0; i < RAIN_DROPS; i++) {
    rainPos[i * 3] = (Math.random() * 2 - 1) * 85;
    rainPos[i * 3 + 1] = Math.random() * 55;
    rainPos[i * 3 + 2] = (Math.random() * 2 - 1) * 85;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rainMat = new THREE.PointsMaterial({
    color: 0xaac4e8, size: 0.45, transparent: true, opacity: 0, sizeAttenuation: true,
  });
  const rain = new THREE.Points(rainGeo, rainMat);
  rain.visible = false;
  rain.frustumCulled = false;
  scene.add(rain);

  // South Solmar: the Palmera Resort and Solmar Airport, past the last
  // avenue. The generic blocks above skip these lots (they sit within
  // 26 m of the new PLACES), so the district is built by hand here.
  const south = buildSouth(scene, colliders);

  return {
    colliders,
    avenues,
    streets,
    setWeather(mode) {
      if (mode !== 'clear' && mode !== 'rain') return;
      weather = mode;
      weatherTimer = mode === 'rain' ? 25 : 45;
    },
    setTimeOfDay(t) {
      timeOfDay = ((t % 1) + 1) % 1;
    },
    getWeather() {
      return { mode: weather, timeOfDay, rainLevel };
    },
    update(dt, time, px, pz) {
      // Advance the clock and roll the weather on its timer.
      timeOfDay = (timeOfDay + dt / 300) % 1;
      weatherTimer -= dt;
      if (weatherTimer <= 0) {
        weather = Math.random() < 0.35 ? 'rain' : 'clear';
        weatherTimer = weather === 'rain' ? 20 + Math.random() * 15 : 30 + Math.random() * 30;
      }
      const targetRain = weather === 'rain' ? 1 : 0;
      rainLevel += (targetRain - rainLevel) * Math.min(1, dt * 0.6);
      // Sky, sun and lamps follow the clock.
      const sky = sampleSky(timeOfDay);
      scene.background = sky.bg;
      scene.fog.color.copy(sky.bg);
      scene.fog.far = weather === 'rain' ? 430 : 620;
      const angle = (timeOfDay - 0.25) * Math.PI * 2;
      const elev = Math.sin(angle);
      sun.position.set(Math.cos(angle) * 280, Math.max(14, elev * 220 + 30), 140);
      const dim = weather === 'rain' ? 0.55 : 1;
      sun.color.copy(sky.sun);
      sun.intensity = sky.sunI * dim;
      hemi.intensity = sky.hemiI * (weather === 'rain' ? 0.8 : 1);
      // The low sun hangs over the ocean at sunset; after dark the disc
      // becomes the moon, high in the east.
      if (elev > -0.05) {
        sunDisc.position.set(sun.position.x * 1.5, Math.max(50, sun.position.y * 1.2), 260);
        sunDisc.material.color.copy(sky.disc);
      } else {
        sunDisc.position.set(300, 170, -180);
        sunDisc.material.color.setHex(0xdfe8ff);
      }
      // Lamps and floodlights glow harder as the city goes dark.
      const night = 1 - Math.min(1, Math.max(0, (elev + 0.25) * 2.2));
      lampGlowMat.color.setHex(night > 0.5 ? 0xffe9a8 : 0x8a7a55);
      floodHeadMat.color.setHex(night > 0.5 ? 0xfff2c0 : 0x9a8a68);
      // Gentle ocean shimmer and a slow breathing of the sunset glow.
      oceanMat.opacity = 0.9 + Math.sin(time * 0.5) * 0.04;
      sunDisc.scale.setScalar(1 + Math.sin(time * 0.3) * 0.015);
      // Boats ride the swell at the dockside pier.
      for (const boat of boats) {
        boat.mesh.position.y = Math.sin(time * 0.9 + boat.phase) * 0.28;
        boat.mesh.rotation.z = Math.sin(time * 0.7 + boat.phase) * 0.035;
        boat.mesh.rotation.x = Math.cos(time * 0.8 + boat.phase) * 0.02;
      }
      // Crane hooks slide along their beams, and the lighthouse beam sweeps
      // the water once the sun is down.
      for (const hook of craneHooks) {
        const slide = Math.sin(time * 0.22 + hook.phase) * 8;
        hook.trolley.position.x = hook.cx + slide;
        hook.cable.position.x = hook.cx + slide;
        hook.hook.position.x = hook.cx + slide;
      }
      beamPivot.rotation.y = time * 0.35;
      beamMat.opacity = night > 0.6 ? 0.16 : 0;
      beaconLight.material.color.setHex(night > 0.6 ? 0xffe9a8 : 0x8a7a55);
      // The ferry crosses the harbor on a loop: 170 m out, then it
      // turns around and comes back, riding the same swell.
      if (ferry) {
        const leg = (time * 6) % 340;
        const along = leg < 170 ? leg : 340 - leg;
        ferry.position.x = -540 + along;
        ferry.position.y = Math.sin(time * 0.9) * 0.25;
        ferry.rotation.y = leg < 170 ? 0 : Math.PI;
      }
      // South Solmar keeps moving too: the tower radar sweeps, the
      // runway lights breathe at night, and a jet taxis the strip.
      south.update(dt, time, night > 0.6);
      // Rain falls and wraps inside its box, centred on the player.
      if (rainLevel > 0.02) {
        rain.visible = true;
        rainMat.opacity = rainLevel * 0.65;
        rain.position.set(px || 0, 0, pz || 0);
        const fall = 62 * dt;
        for (let i = 0; i < RAIN_DROPS; i++) {
          rainPos[i * 3 + 1] -= fall;
          if (rainPos[i * 3 + 1] < 0) rainPos[i * 3 + 1] += 55;
        }
        rainGeo.attributes.position.needsUpdate = true;
      } else {
        rain.visible = false;
      }
    },
  };
}

// Is a point inside any building collider (with a radius margin)?
export function hitsBuilding(colliders, x, z, radius) {
  for (const c of colliders) {
    if (x > c.minX - radius && x < c.maxX + radius && z > c.minZ - radius && z < c.maxZ + radius) {
      return true;
    }
  }
  return false;
}

// Is the point on a road (within half the road width of an avenue/street)?
export function onRoad(x, z) {
  for (let v = -CITY_HALF + 35; v <= CITY_HALF - 35; v += ROAD_SPACING) {
    if (Math.abs(x - v) < ROAD_WIDTH / 2 + 1.5) return true;
    if (Math.abs(z - v) < ROAD_WIDTH / 2 + 1.5) return true;
  }
  return false;
}

// Pick a random point on the road network.
export function randomRoadPoint() {
  const vertical = Math.random() < 0.5;
  const lanes = [];
  for (let v = -CITY_HALF + 35; v <= CITY_HALF - 35; v += ROAD_SPACING) lanes.push(v);
  const lane = lanes[Math.floor(Math.random() * lanes.length)];
  const along = (Math.random() * 2 - 1) * (CITY_HALF - 40);
  return vertical ? { x: lane, z: along } : { x: along, z: lane };
}

export function clampToCity(x, z) {
  // The west edge reaches past the beach into the shallows, so Mara can
  // wade out to the dockside pier; everywhere else the city bounds hold.
  return {
    x: clamp(x, -CITY_HALF - 50, CITY_HALF + 20),
    z: clamp(z, -CITY_HALF - 20, CITY_HALF + 20),
  };
}
