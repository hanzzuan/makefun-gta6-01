// cars.js — cars in Solmar: how they look, how traffic drives them, and how
// the player drives one. Cars are built from boxes and cylinders only, so
// the whole fleet costs almost nothing to render.

import * as THREE from 'three';
import { clamp, lerp, lerpAngle, rand, pick, dist2D } from './util.js';
import { CITY_HALF, ROAD_SPACING, hitsBuilding } from './city.js';

const CAR_COLORS = [
  0xd8382e, 0x2e6fd8, 0xf2c230, 0x38b24a, 0xe8e4da, 0x1c1c22, 0x8a5fd0,
  0xff7a3c, 0x3cc8c0, 0xb8b0a0, 0x5a3a28, 0xd84a8a,
];
const CAR_NAMES = [
  'Solano', 'Comet GT', 'Palmera', 'Dune Buggy', 'Viento', 'Coral Coupe',
  'Marlin', 'Sunset Van', 'Breeze', 'Tiburon',
];
const TAXI_NAMES = ['City Cab', 'Sunset Taxi', 'Harbor Cab'];
const TRUCK_NAMES = ['Harbor Hauler', 'Dock Runner', 'Freight Mule'];
const BIKE_NAMES = ['Street Hawk', 'Night Wasp', 'Coast Runner'];

// A car is a group: body, cabin, wheels, headlights, taillights.
export function buildCarMesh(color, kind) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color, roughness: 0.35, metalness: 0.55,
  });
  // The garage repaints bodies by this flag: the body material — and
  // only it — follows the player's chosen paint.
  bodyMat.userData.bodyPaint = true;
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x18202e, roughness: 0.1, metalness: 0.7,
  });
  const isVan = kind === 'van';
  const isPolice = kind === 'police';
  const isBike = kind === 'motorcycle';
  const isTruck = kind === 'truck';
  const isTaxi = kind === 'taxi';
  const isLimo = kind === 'limo';
  const bodyLen = isBike ? 2.3 : isTruck ? 6.0 : isVan ? 5.2 : isLimo ? 6.8 : 4.4;
  const bodyW = isBike ? 0.8 : isTruck ? 2.4 : isVan ? 2.2 : 2.0;
  const body = new THREE.Mesh(new THREE.BoxGeometry(bodyW, 0.85, bodyLen), bodyMat);
  body.position.y = 0.75;
  body.castShadow = true;
  group.add(body);
  if (isBike) {
    // A motorcycle: low seat, a fuel tank, and handlebars — no cabin.
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.22, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.9 }),
    );
    seat.position.set(0, 1.05, -0.45);
    group.add(seat);
    const tank = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.4, 0.7),
      bodyMat,
    );
    tank.position.set(0, 1.05, 0.35);
    group.add(tank);
    const bars = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.09, 0.09),
      new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.5, metalness: 0.6 }),
    );
    bars.position.set(0, 1.25, 0.95);
    group.add(bars);
  } else if (isTruck) {
    // A delivery truck: a cab up front, a tall cargo box behind it.
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 0.9, 1.5, 1.6),
      glassMat,
    );
    cab.position.set(0, 1.6, 1.9);
    cab.castShadow = true;
    group.add(cab);
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW, 2.4, 3.6),
      new THREE.MeshStandardMaterial({ color: 0xd8d2c2, roughness: 0.85, metalness: 0.15 }),
    );
    box.position.set(0, 1.85, -1.0);
    box.castShadow = true;
    group.add(box);
  } else if (isLimo) {
    // Venn's limousine: a stretched cabin, black privacy glass, and a
    // chrome divider down the middle — the car the fixer rides in.
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 0.86, 0.8, 4.6),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0e, roughness: 0.05, metalness: 0.8 }),
    );
    cabin.position.set(0, 1.5, 0);
    cabin.castShadow = true;
    group.add(cabin);
    const divider = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 0.9, 0.08, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xc8c8d0, roughness: 0.2, metalness: 0.9 }),
    );
    divider.position.set(0, 1.62, 0.4);
    group.add(divider);
  } else {
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 0.86, 0.75, isVan ? 3.4 : 2.1),
      glassMat,
    );
    cabin.position.set(0, 1.5, isVan ? 0.1 : -0.25);
    cabin.castShadow = true;
    group.add(cabin);
  }
  if (isTaxi) {
    // A lit TAXI sign on the roof: the side job's working vehicle.
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.3, 0.45),
      new THREE.MeshBasicMaterial({ color: 0xffe14a }),
    );
    sign.position.set(0, 2.05, -0.2);
    group.add(sign);
    const checker = new THREE.Mesh(
      new THREE.BoxGeometry(0.92, 0.1, 0.47),
      new THREE.MeshBasicMaterial({ color: 0x1a1a1e }),
    );
    checker.position.set(0, 1.92, -0.2);
    group.add(checker);
  }
  if (isPolice) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.28, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.4 }),
    );
    bar.position.set(0, 1.95, -0.2);
    group.add(bar);
    const red = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.22, 0.4),
      new THREE.MeshBasicMaterial({ color: 0xff2020 }),
    );
    red.position.set(-0.28, 2.1, -0.2);
    group.add(red);
    const blue = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.22, 0.4),
      new THREE.MeshBasicMaterial({ color: 0x2050ff }),
    );
    blue.position.set(0.28, 2.1, -0.2);
    group.add(blue);
    group.userData.lightBar = { red, blue };
  }
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 12);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.9 });
  const wheels = [];
  // Motorcycles run two wheels in line; trucks run six; limos stretch
  // theirs to the ends of the long body; everything else four.
  const wheelSpots = isBike
    ? [[0, 0.85], [0, -0.85]]
    : isTruck
      ? [[-1.05, 2.2], [1.05, 2.2], [-1.05, 0], [1.05, 0], [-1.05, -2.2], [1.05, -2.2]]
      : isLimo
        ? [[-0.95, 2.6], [0.95, 2.6], [-0.95, -2.6], [0.95, -2.6]]
        : [[-0.95, 1.5], [0.95, 1.5], [-0.95, -1.5], [0.95, -1.5]];
  for (const [wx, wz] of wheelSpots) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.42, wz);
    wheel.castShadow = true;
    group.add(wheel);
    wheels.push(wheel);
  }
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
  for (const hx of [-0.65, 0.65]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), headMat);
    head.position.set(hx, 0.8, bodyLen / 2 + 0.02);
    group.add(head);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const tx of [-0.65, 0.65]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), tailMat);
    tail.position.set(tx, 0.8, -bodyLen / 2 - 0.02);
    group.add(tail);
  }
  group.userData.wheels = wheels;
  group.userData.kind = kind;
  group.userData.headMat = headMat;
  group.userData.tailMat = tailMat;
  return group;
}

// Headlights burn bright after dark and dim to a dull glow by day.
export function updateCarLights(car, night) {
  const head = car.mesh.userData.headMat;
  const tail = car.mesh.userData.tailMat;
  if (head) head.color.setHex(night ? 0xfff6c8 : 0x8a8268);
  if (tail) tail.color.setHex(night ? 0xff2a2a : 0x7a2a2a);
}

export function makeCar(kind, x, z, heading, color) {
  const paint = kind === 'police' ? 0xf2f2f2
    : kind === 'taxi' ? 0xf2c230
    : (color ?? pick(CAR_COLORS));
  const mesh = buildCarMesh(paint, kind);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  const name = kind === 'police' ? 'Solmar PD Interceptor'
    : kind === 'taxi' ? pick(TAXI_NAMES)
    : kind === 'truck' ? pick(TRUCK_NAMES)
    : kind === 'motorcycle' ? pick(BIKE_NAMES)
    : kind === 'limo' ? 'Venn Limo'
    : pick(CAR_NAMES);
  const topSpeed = kind === 'police' ? 34
    : kind === 'motorcycle' ? 33
    : kind === 'taxi' ? 27
    : kind === 'van' ? 20
    : kind === 'truck' ? 17
    : kind === 'limo' ? 28
    : 26;
  return {
    mesh,
    kind,
    name,
    color: paint,
    x, z,
    heading,
    speed: 0,
    maxSpeed: topSpeed,
    steer: 0,
    // Traffic AI state: which avenue/street it follows and which way.
    lane: 0,
    along: 0,
    vertical: true,
    direction: 1,
    targetSpeed: 0,
    stuck: 0,
  };
}

// --- traffic ----------------------------------------------------------------

export function spawnTrafficCar(scene, colliders) {
  const vertical = Math.random() < 0.5;
  const lanes = [];
  for (let v = -CITY_HALF + 35; v <= CITY_HALF - 35; v += ROAD_SPACING) lanes.push(v);
  const lane = lanes[Math.floor(Math.random() * lanes.length)];
  const along = (Math.random() * 2 - 1) * (CITY_HALF - 40);
  const direction = Math.random() < 0.5 ? 1 : -1;
  // The fleet is mixed now: bikes weave through, trucks haul to the
  // harbor, yellow cabs work the avenues, vans fill the rest.
  const roll = Math.random();
  const kind = roll < 0.05 ? 'motorcycle' : roll < 0.12 ? 'truck' : roll < 0.22 ? 'taxi' : roll < 0.32 ? 'van' : 'car';
  const car = makeCar(kind, vertical ? lane + 3 : along, vertical ? along : lane + 3, 0);
  car.vertical = vertical;
  car.lane = lane;
  car.along = along;
  car.direction = direction;
  car.targetSpeed = rand(9, 15);
  car.heading = vertical ? (direction > 0 ? 0 : Math.PI) : (direction > 0 ? Math.PI / 2 : -Math.PI / 2);
  car.mesh.rotation.y = car.heading;
  scene.add(car.mesh);
  return car;
}

// One traffic car follows its lane; at an intersection it sometimes turns.
export function updateTrafficCar(car, dt, allCars) {
  const speed = car.targetSpeed;
  const step = speed * dt;
  // Slow down if a car is close ahead on the same lane.
  let ahead = 1e9;
  for (const other of allCars) {
    if (other === car) continue;
    if (car.vertical !== other.vertical) continue;
    if (Math.abs(other.lane - car.lane) > 1) continue;
    const d = (car.vertical ? other.z - car.z : other.x - car.x) * car.direction;
    if (d > 0 && d < ahead) ahead = d;
  }
  const effSpeed = ahead < 12 ? Math.max(0, speed * (ahead / 12)) : speed;
  const move = effSpeed * dt;
  if (car.vertical) {
    car.z += car.direction * move;
    car.along = car.z;
  } else {
    car.x += car.direction * move;
    car.along = car.x;
  }
  // Turn at an intersection now and then.
  const nearCross = Math.abs(((car.along % ROAD_SPACING) + ROAD_SPACING) % ROAD_SPACING - ROAD_SPACING / 2) < 2;
  if (nearCross && Math.random() < dt * 0.25) {
    const lanes = [];
    for (let v = -CITY_HALF + 35; v <= CITY_HALF - 35; v += ROAD_SPACING) lanes.push(v);
    const cross = lanes.reduce((best, v) => (Math.abs(v - car.along) < Math.abs(best - car.along) ? v : best), lanes[0]);
    car.vertical = !car.vertical;
    car.lane = cross;
    car.direction = Math.random() < 0.5 ? 1 : -1;
    car.heading = car.vertical
      ? (car.direction > 0 ? 0 : Math.PI)
      : (car.direction > 0 ? Math.PI / 2 : -Math.PI / 2);
    if (car.vertical) car.x = car.lane + 3;
    else car.z = car.lane + 3;
  }
  // Wrap around the city edge instead of despawning.
  if (car.along > CITY_HALF - 30) {
    car.along = -CITY_HALF + 30;
    if (car.vertical) car.z = car.along;
    else car.x = car.along;
  }
  if (car.along < -CITY_HALF + 30) {
    car.along = CITY_HALF - 30;
    if (car.vertical) car.z = car.along;
    else car.x = car.along;
  }
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = lerpAngle(car.mesh.rotation.y, car.heading, Math.min(1, dt * 6));
  const spin = effSpeed * dt * 2.4;
  for (const w of car.mesh.userData.wheels) w.rotation.x += spin;
  void step;
}

// --- player driving ----------------------------------------------------------

export function updatePlayerCar(car, axes, dt, handbrake, colliders, onCollide) {
  const accel = axes.y;
  const steerInput = axes.x;
  const maxSpeed = car.maxSpeed;
  const reverseMax = 10;
  // Spiked tires: the car limps along until the timer runs out.
  car.spikeSlow = Math.max(0, (car.spikeSlow || 0) - dt);
  const topSpeed = car.spikeSlow > 0 ? 10 : maxSpeed;
  // Trucks are sluggish off the line; bikes snap forward.
  const accelFactor = car.kind === 'truck' ? 0.6 : car.kind === 'motorcycle' ? 1.3 : 1;
  if (accel > 0) car.speed += 22 * accelFactor * accel * dt;
  else if (accel < 0) {
    if (car.speed > 0.5) car.speed -= 34 * dt; // brake
    else car.speed -= 12 * dt; // reverse
  } else {
    car.speed -= Math.sign(car.speed) * 9 * dt;
    if (Math.abs(car.speed) < 0.4) car.speed = 0;
  }
  if (handbrake) car.speed -= Math.sign(car.speed) * 26 * dt;
  car.speed = clamp(car.speed, -reverseMax, topSpeed);
  const steerTarget = steerInput * (car.speed >= 0 ? 1 : -1) * clamp(Math.abs(car.speed) / 8, 0, 1);
  car.steer = lerp(car.steer, steerTarget, Math.min(1, dt * 7));
  // Bikes flick through traffic; trucks wallow through the turn.
  const steerRate = car.kind === 'motorcycle' ? 2.7 : car.kind === 'truck' ? 1.35 : 1.9;
  const turnRate = car.steer * steerRate * clamp(Math.abs(car.speed) / 10, 0.25, 1);
  car.heading += turnRate * dt * (car.speed >= 0 ? 1 : -1);
  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  if (hitsBuilding(colliders, nx, nz, 2.2)) {
    car.speed *= -0.25;
    if (onCollide) onCollide(Math.abs(car.speed));
  } else {
    car.x = clamp(nx, -CITY_HALF - 18, CITY_HALF + 18);
    car.z = clamp(nz, -CITY_HALF - 18, CITY_HALF + 18);
  }
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
  // Body roll and pitch make the car feel alive. A bike leans INTO the
  // turn; a truck rolls out of it like a boat.
  car.mesh.rotation.z = car.kind === 'motorcycle'
    ? car.steer * 0.28
    : car.kind === 'truck' ? -car.steer * 0.1 : -car.steer * 0.06;
  car.mesh.rotation.x = clamp(-accel * 0.02, -0.03, 0.03);
  const spin = car.speed * dt * 2.4;
  for (const w of car.mesh.userData.wheels) w.rotation.x += spin;
  return Math.abs(car.speed);
}

export function carDistance(a, b) {
  return dist2D(a.x, a.z, b.x, b.z);
}
