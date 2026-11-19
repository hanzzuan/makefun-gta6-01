// heli.js — the police helicopter. At wanted level 5 the department
// sends a chopper: it circles above Mara, pins a searchlight on her,
// and makes the heat take twice as long to cool. Drop below level 4
// and it peels off. One chopper, one spotlight, no firing — the threat
// is that it never loses you.

import * as THREE from 'three';

// Seconds between the chopper's reinforcement calls while it is on
// station, and how far ahead Sable's lookout warning reads the timer.
export const HELI_CALL_INTERVAL = 20;
export const HELI_CALL_WARNING = 5;

// Seconds until the chopper's next reinforcement call, or Infinity
// when it is not on station: the lookout warning counts down from this.
export function heliCallCountdown(heli) {
  if (!heli.active) return Infinity;
  return Math.max(0, HELI_CALL_INTERVAL - heli.callTimer);
}

export function makeHeli(scene) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a2a4a, roughness: 0.5, metalness: 0.3 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.2, 7.5), bodyMat);
  body.castShadow = true;
  group.add(body);
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(3.8, 1.4, 2.4),
    new THREE.MeshStandardMaterial({ color: 0x9fd8e8, roughness: 0.1, metalness: 0.6 }),
  );
  glass.position.set(0, 0.5, 2.6);
  group.add(glass);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 7), bodyMat);
  tail.position.set(0, 0.4, -6.8);
  group.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, 1.6), bodyMat);
  fin.position.set(0, 1.6, -10);
  group.add(fin);
  const skidMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.6, metalness: 0.5 });
  for (const side of [-1, 1]) {
    const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6.5, 6), skidMat);
    skid.rotation.x = Math.PI / 2;
    skid.position.set(side * 1.6, -1.5, 0);
    group.add(skid);
    const strutA = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1, 6), skidMat);
    strutA.position.set(side * 1.6, -1.1, 2);
    group.add(strutA);
    const strutB = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1, 6), skidMat);
    strutB.position.set(side * 1.6, -1.1, -2);
    group.add(strutB);
  }
  // Main rotor: two long blades that spin; a blurred disc fades in
  // with speed so the rotor reads at a glance.
  const rotor = new THREE.Group();
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.5, metalness: 0.4 });
  for (const angle of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(11, 0.12, 0.6), bladeMat);
    blade.rotation.y = angle;
    rotor.add(blade);
  }
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.2, 6), skidMat);
  mast.position.y = 0.6;
  rotor.add(mast);
  rotor.position.y = 1.6;
  group.add(rotor);
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(5.6, 5.6, 0.08, 24),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, side: THREE.DoubleSide }),
  );
  disc.position.y = 1.7;
  group.add(disc);
  const tailRotor = new THREE.Group();
  const tailBlade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.6, 0.12), bladeMat);
  tailRotor.add(tailBlade);
  tailRotor.position.set(-0.8, 1.8, -10);
  group.add(tailRotor);
  // Searchlight: a cone of light that hangs under the belly and
  // tracks the player, plus the bright lens itself.
  const spot = new THREE.Mesh(
    new THREE.ConeGeometry(6.5, 34, 20, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xfff6c8, transparent: true, opacity: 0.14,
      side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  spot.position.y = -18;
  group.add(spot);
  const lens = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xfff6c8 }),
  );
  lens.position.set(0, -1.4, 3.2);
  group.add(lens);
  group.visible = false;
  scene.add(group);
  return {
    group, rotor, tailRotor, disc, spot, lens,
    active: false,
    angle: 0,
    rotorSpeed: 0,
    spotlightOn: false,
    callTimer: 0, // seconds until the chopper calls in a fresh unit
    reinforce: false, // set true when a reinforcement is due; the caller consumes it
  };
}

// One frame of the chopper. At wanted 5 it flies in from the edge of
// the map and circles above the player; below 4 it climbs away and
// despawns. Returns whether the spotlight is currently pinning the
// player (the caller uses it to slow the heat decay).
export function updateHeli(heli, dt, px, pz, wantedLevel, time, overBay, hunt) {
  // During the lighthouse signal run the chopper circles the bay, not
  // Mara: the PD is hunting the signal, and the spotlight sweeps the
  // pier while she lights the lamp. During a bounty hunt the chopper
  // flies lower and tighter — the PD is watching the hunt, and it
  // wants the whole alley in the spotlight.
  const orbitX = overBay ? -352 : px;
  const orbitZ = overBay ? -210 : pz;
  const want = wantedLevel >= 5;
  if (want && !heli.active) {
    heli.active = true;
    heli.group.visible = true;
    heli.spotFade = 0; // the spotlight eases in, it does not snap on
    // Fly in from the north edge so it reads as arriving.
    heli.group.position.set(px + 120, 44, pz - 120);
    heli.angle = Math.atan2(pz - heli.group.position.z, px - heli.group.position.x);
  }
  if (!heli.active) return false;
  if (wantedLevel < 4) {
    // Peel off: climb and drift north until far away, then park. The
    // spotlight fades with it, so the beam does not snap off mid-air.
    heli.spotFade = 0;
    heli.group.position.y += dt * 18;
    heli.group.position.z -= dt * 40;
    heli.rotorSpeed = Math.max(0, heli.rotorSpeed - dt * 2);
    heli.rotor.rotation.y += heli.rotorSpeed * dt * 8;
    heli.tailRotor.rotation.z += heli.rotorSpeed * dt * 20;
    if (heli.group.position.y > 120) {
      heli.active = false;
      heli.group.visible = false;
      heli.spotlightOn = false;
    }
    return false;
  }
  // Circle the player at a 24 m radius, 34 m up, banking into the
  // turn — tight enough that the chopper reads in the chase camera,
  // high enough that the spotlight still pins the whole street. On a
  // bounty hunt it drops to 18 m and 28 m up, closing the circle.
  heli.angle += dt * 0.55;
  const radius = hunt ? 18 : 24;
  const tx = orbitX + Math.cos(heli.angle) * radius;
  const tz = orbitZ + Math.sin(heli.angle) * radius;
  heli.group.position.x = tx;
  heli.group.position.z = tz;
  heli.group.position.y = (hunt ? 28 : 34) + Math.sin(time * 0.7) * 1.5;
  heli.group.rotation.y = -heli.angle + Math.PI / 2;
  heli.group.rotation.z = 0.12;
  // Spin up the rotor to full speed and keep it there.
  heli.rotorSpeed = Math.min(1, heli.rotorSpeed + dt * 0.8);
  heli.rotor.rotation.y += heli.rotorSpeed * dt * 22;
  heli.tailRotor.rotation.z += heli.rotorSpeed * dt * 60;
  heli.disc.material.opacity = 0.05 + heli.rotorSpeed * 0.06;
  // The spotlight tracks the player: aim the cone from the belly at
  // the ground under Mara, and pulse the lens.
  const dx = px - heli.group.position.x;
  const dz = pz - heli.group.position.z;
  const dy = 0 - heli.group.position.y;
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  heli.spot.lookAt(heli.group.position.x + dx, 0, heli.group.position.z + dz);
  // A cone points +Y by default; rotate it to aim down the aim vector.
  heli.spot.rotation.set(0, 0, 0);
  heli.spot.position.set(0, -18, 0);
  const tilt = Math.atan2(Math.sqrt(dx * dx + dz * dz), -dy);
  const yaw = Math.atan2(dx, dz);
  heli.spot.rotation.order = 'YXZ';
  heli.spot.rotation.y = yaw;
  heli.spot.rotation.x = tilt;
  // The spotlight eases in over a second, so the beam fades up instead
  // of snapping on the moment the chopper arrives.
  heli.spotFade = Math.min(1, (heli.spotFade || 0) + dt * 1.5);
  heli.spot.material.opacity = (0.11 + Math.sin(time * 3) * 0.03) * heli.spotFade;
  heli.lens.material.color.setHex(0xfff6c8);
  heli.spotlightOn = true;
  // The chopper calls in reinforcements: every HELI_CALL_INTERVAL
  // seconds on station it asks dispatch for one fresh interceptor. The
  // caller watches heli.reinforce and spawns the unit, then clears the
  // flag. Sable the lookout reads the call timer from the main loop.
  heli.callTimer += dt;
  if (heli.callTimer >= HELI_CALL_INTERVAL) {
    heli.callTimer = 0;
    heli.reinforce = true;
  }
  return true;
}

// The chopper is on station when the spotlight is pinning the player;
// the heat decays at half speed while that is true.
export function heliOnStation(heli) {
  return heli.active && heli.spotlightOn;
}

// The helicopter spotlight is warm white — it reads as a searchlight
// over the bay, not a street lamp, and it pins the whole street.
export const HELI_SPOTLIGHT_COLOR = 0xfff2c8;
