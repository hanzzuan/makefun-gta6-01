// vehicles.js — the new wheels: the city bus, the sports coupe and the
// pickup truck.
// Solmar's fleet grows in the East update. The city bus runs a fixed
// loop — plaza, marina, campus, airport — and stops at every stop, so
// Mara can ride it, steal it, or just watch it work. Sports coupes are
// the fastest street cars in the city, and pickups are the workhorses
// that haul through the harbor. All three are real cars from the car
// factory (cars.js owns the meshes); this module owns the routes and
// the spawns.

import { makeCar } from './cars.js';
import { clamp } from './util.js';

// The bus loop: plaza, marina, casino, campus, airport, and back to
// the plaza — and since Club Neon opened, the bus swings past the
// club door too, because the night crowd needs a ride home. The bus
// stops at each stop for a few seconds, doors open, then rolls on.
// The route is a rectangle with rounded corners, driven by waypoints
// the bus follows in order.
export const BUS_STOPS = [
  { x: 0, z: -40, name: 'Plaza' },
  { x: -238, z: 175, name: 'Marina' },
  { x: -128, z: 224, name: 'Casino' },
  { x: 320, z: 140, name: 'Campus' },
  { x: 140, z: 215, name: 'Airport' },
  { x: -70, z: -70, name: 'Club Neon' },
  { x: -320, z: -210, name: 'Dockside Pier' },
  { x: -296, z: -196, name: 'Lighthouse Cottage' },
  { x: -40, z: -40, name: 'Back Alley' },
];

export function makeBusRoute() {
  return BUS_STOPS.map((s) => ({ x: s.x, z: s.z, name: s.name }));
}

// Put the city bus in the world, at the first stop, ready to roll.
export function spawnBus(scene) {
  const bus = makeCar('bus', BUS_STOPS[0].x, BUS_STOPS[0].z, Math.PI / 2);
  bus.name = 'City Bus 12';
  bus.route = makeBusRoute();
  bus.stopIndex = 0;
  bus.stopTimer = 4; // dwell at the first stop before rolling
  bus.targetSpeed = 12;
  scene.add(bus.mesh);
  return bus;
}

// One frame of the bus: drive toward the next stop, dwell there, then
// move on. The bus follows the roads between stops — it cuts across
// blocks on the diagonal, the way a bus never would, so it keeps to the
// avenues: it steers toward the next stop and the traffic AI's lane
// logic does not apply. Returns the stop name while dwelling, else null.
export function updateBus(bus, dt) {
  if (bus.stopTimer > 0) {
    bus.stopTimer -= dt;
    bus.speed = 0;
    if (bus.stopTimer <= 0) {
      bus.stopIndex = (bus.stopIndex + 1) % bus.route.length;
    }
    return bus.route[bus.stopIndex].name;
  }
  const stop = bus.route[bus.stopIndex];
  const dx = stop.x - bus.x;
  const dz = stop.z - bus.z;
  const d = Math.hypot(dx, dz);
  if (d < 6) {
    bus.stopTimer = 4;
    bus.speed = 0;
    return stop.name;
  }
  const want = Math.atan2(dx, dz);
  let diff = want - bus.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  bus.heading += clamp(diff, -1.4 * dt, 1.4 * dt);
  bus.speed += (12 - bus.speed) * Math.min(1, dt * 0.8);
  bus.x += Math.sin(bus.heading) * bus.speed * dt;
  bus.z += Math.cos(bus.heading) * bus.speed * dt;
  bus.mesh.position.set(bus.x, 0, bus.z);
  bus.mesh.rotation.y = bus.heading;
  return null;
}

// A sports coupe parked somewhere worth stealing: fast, low, and loud.
export function spawnCoupe(scene, x, z) {
  const coupe = makeCar('coupe', x, z, Math.random() * Math.PI * 2);
  coupe.targetSpeed = 0;
  scene.add(coupe.mesh);
  return coupe;
}

// A pickup truck on the road: slow off the line, heavy in a ram, and
// the only thing that can push a roadblock barrier out of the way.
export function spawnPickup(scene, x, z, heading) {
  const pickup = makeCar('pickup', x, z, heading || 0);
  pickup.targetSpeed = 11;
  scene.add(pickup.mesh);
  return pickup;
}

// The Mural Row supply van: a gold van full of paint and ladders,
// parked by the mural row so the taggers never run dry. It drives
// like a van — slow, wide, and hard to push around.
export function spawnSprayVan(scene, x, z) {
  const van = makeCar('sprayvan', x, z, Math.random() * Math.PI * 2);
  van.targetSpeed = 0;
  scene.add(van.mesh);
  return van;
}

// A yellow cab parked at the kerb: stealable, like every cab in
// Solmar, and the meter starts the moment Mara takes it.
export function spawnTaxi(scene, x, z) {
  const cab = makeCar('taxi', x, z, Math.random() * Math.PI * 2);
  cab.targetSpeed = 0;
  scene.add(cab.mesh);
  return cab;
}

// What the bus is doing, for the HUD hint when Mara is near a stop.
export function busStatusLine(bus) {
  const stop = bus.route[bus.stopIndex];
  if (bus.stopTimer > 0) return `Bus 12 at ${stop.name} — doors open.`;
  return `Bus 12 heading to ${stop.name}.`;
}

// The new kinds at a glance, for the garage and the HUD: top speed and
// what they are for.
export const EXTRA_VEHICLE_INFO = {
  bus: { topSpeed: 20, blurb: 'The city bus — slow, wide, unstoppable.' },
  coupe: { topSpeed: 34, blurb: 'A sports coupe — the fastest street car in Solmar.' },
  pickup: { topSpeed: 24, blurb: 'A pickup — heavy enough to push through a roadblock.' },
};
