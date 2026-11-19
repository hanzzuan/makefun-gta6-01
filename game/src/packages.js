// packages.js — eleven hidden packages stashed around Solmar, GTA-style.
// Each one pays $500 the moment Mara walks over it, and finding all
// eleven pays a $5,000 bonus plus a permanent +10% on every job board
// payout. The packages are small gold crates that catch the light;
// the pause menu shows how many are left, and the board at the garage
// lists a hint for every one still out there.

import * as THREE from 'three';
import { dist2D } from './util.js';

// One package is worth $500 on the spot; the full set is worth $5,000
// on top, and the job board pays 10% more forever after.
export const PACKAGE_REWARD = 500;
export const PACKAGE_SET_BONUS = 5000;
export const PACKAGE_JOB_BONUS = 0.1;

// Ten crates, one per corner of the city — the hints are honest, the
// crates are small, and the gold catches the sunset if you look.
export const HIDDEN_PACKAGES = [
  { id: 'plaza-fountain', name: 'Fountain Package', x: 6, z: -34, hint: 'Behind the plaza fountain, where the coins land.' },
  { id: 'marina-pier', name: 'Pier Package', x: -230, z: 168, hint: 'At the end of the marina pier, past the boats.' },
  { id: 'casino-steps', name: 'Casino Package', x: -120, z: 216, hint: 'On the casino steps, where the losers sit.' },
  { id: 'campus-quad', name: 'Campus Package', x: 312, z: 128, hint: 'On the university quad, between the benches.' },
  { id: 'stadium-gate', name: 'Stadium Package', x: 340, z: -90, hint: 'By the stadium south gate, under the floodlights.' },
  { id: 'mall-court', name: 'Mall Package', x: 290, z: 130, hint: 'In the mall food court, behind the planters.' },
  { id: 'airport-lot', name: 'Airport Package', x: 120, z: 230, hint: 'In the airport long-stay lot, by the fence.' },
  { id: 'harbor-crates', name: 'Harbor Package', x: -200, z: -120, hint: 'Between the crates at the north harbor freight yard.' },
  { id: 'club-alley', name: 'Club Package', x: -70, z: -60, hint: 'In Neon Alley behind Club Neon, by the bins.' },
  { id: 'resort-pool', name: 'Resort Package', x: -150, z: 220, hint: 'Behind the resort pool house, where the towels are.' },
  { id: 'film-lot', name: 'Film Lot Package', x: -285, z: 90, hint: 'Behind the film lot camera crane, where the stunt crew parks.' },
];

export function makePackagesState() {
  return { found: [] };
}

export function packagesFromSave(saved) {
  const state = makePackagesState();
  if (!saved || typeof saved !== 'object') return state;
  if (Array.isArray(saved.found)) {
    state.found = saved.found.filter((id) => HIDDEN_PACKAGES.some((p) => p.id === id));
  }
  return state;
}

// Build one glowing crate per package still out there. The crates are
// gold and emissive so they catch the eye at dusk, and they sit just
// above the ground so they read over the grass and the paving.
export function spawnPackages(scene, state) {
  const meshes = [];
  for (const pkg of HIDDEN_PACKAGES) {
    if (state.found.includes(pkg.id)) continue;
    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.7, 0.7),
      new THREE.MeshStandardMaterial({ color: 0xd8a920, emissive: 0x8a6a10, emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.7 }),
    );
    crate.position.set(pkg.x, 0.6, pkg.z);
    crate.castShadow = true;
    scene.add(crate);
    meshes.push({ pkg, mesh: crate });
  }
  return meshes;
}

// The crates bob gently on their spots so they catch the eye from
// across the street — a gold crate that never sits still is easier
// to find than one that hides flat on the ground.
export function pulsePackageMeshes(meshes, time) {
  for (let i = 0; i < meshes.length; i++) {
    const entry = meshes[i];
    if (!entry || !entry.mesh) continue;
    entry.mesh.position.y = 0.6 + Math.sin(time * 2 + i * 1.3) * 0.08;
    entry.mesh.rotation.y += 0.01;
  }
}

// Walk over a crate and it is yours: $500 now, $5,000 more when the
// eleventh one lands, and the job board pays 10% extra forever after.
// The eleventh hides behind the film lot camera crane, where the
// stunt crew parks.
export function updatePackages(state, px, pz) {
  for (const pkg of HIDDEN_PACKAGES) {
    if (state.found.includes(pkg.id)) continue;
    if (dist2D(px, pz, pkg.x, pkg.z) < 3) {
      state.found.push(pkg.id);
      const setBonus = state.found.length >= HIDDEN_PACKAGES.length ? PACKAGE_SET_BONUS : 0;
      return { type: 'found', pkg, reward: PACKAGE_REWARD, setBonus, total: PACKAGE_REWARD + setBonus };
    }
  }
  return null;
}

// The set is complete when every crate is found — and the job board
// pays 10% more from then on, forever.
export function packagesComplete(state) {
  return state.found.length >= HIDDEN_PACKAGES.length;
}

export function packagesJobBonus(state) {
  return packagesComplete(state) ? 1 + PACKAGE_JOB_BONUS : 1;
}

export function packagesSummary(state) {
  return 'Hidden packages: ' + state.found.length + '/' + HIDDEN_PACKAGES.length + ' found' +
    (packagesComplete(state) ? ' — full set! Job board pays +10%.' : '');
}

// The full set of packages pays the bounty board too: a hunter who
// found every crate knows every hiding spot in Solmar, and the PD
// pays 10% more for every catch.
export function packagesBountyBonus(state) {
  return packagesComplete(state) ? 1.1 : 1;
}

export function packagesStatusLine(state) {
  return 'Packages ' + state.found.length + '/' + HIDDEN_PACKAGES.length;
}

// The garage board lists every package still out there with its hint,
// and every one already found with a tick — so the hunt never needs
// a guide, just a walk around the city.
export function packagesMenuItems(state) {
  return HIDDEN_PACKAGES.map((pkg) => ({
    id: 'package:' + pkg.id,
    kind: 'package',
    label: (state.found.includes(pkg.id) ? '✓ ' : '○ ') + pkg.name + ' — ' + pkg.hint,
    cost: 0,
    owned: state.found.includes(pkg.id),
    afford: true,
  }));
}

// The nearest unfound package, for the hint line: how far, and which
// way — the hunt is a walk, not a guess.
export function nearestPackage(state, px, pz) {
  let best = null;
  let bestD = Infinity;
  for (const pkg of HIDDEN_PACKAGES) {
    if (state.found.includes(pkg.id)) continue;
    const d = dist2D(px, pz, pkg.x, pkg.z);
    if (d < bestD) { bestD = d; best = pkg; }
  }
  return best ? { pkg: best, distance: Math.round(bestD) } : null;
}
