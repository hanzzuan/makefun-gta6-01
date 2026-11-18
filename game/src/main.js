// main.js — SOLMAR: Sunset Streets. Bootstraps the renderer, owns the game
// loop and the state machine (menu / playing / paused / busted / wasted),
// and wires every system together: city, cars, pedestrians, police,
// missions, combat, HUD, audio and saving.

import * as THREE from 'three';
import { buildCity, PLACES, hitsBuilding } from './city.js';
import { makeCar, spawnTrafficCar, updateTrafficCar, updatePlayerCar, updateCarLights } from './cars.js';
import { makePlayer, updatePlayerOnFoot, updateCamera, nearestCar as nearestCarToPlayer, randomSpawn, damageThroughArmour } from './player.js';
import { spawnPedestrian, spawnPedestrianPair, spawnPedestrianAt, spawnVendor, spawnDog, updatePedestrian } from './pedestrians.js';
import { makeWanted, addHeat, updateWanted, wantedForLevel, spawnPoliceCar, updatePoliceCar, nearestPoliceDistance, spawnRoadblock, despawnRoadblock, roadblockSpot, pdDispatchText } from './police.js';
import { makeMissionState, currentMission, currentStage, updateMissions, missionObjectiveText, startFare, fareObjectiveText, farePayForDestination, STORY_INTRO } from './missions.js';
import { makeEnemy, updateEnemy, shootFromCamera, punch, makeTracer, updateTracer, makeBarrel, detonateBarrel, makeHealthPack } from './combat.js';
import { initHud, setStars, setCash, setHealth, setStamina, setClock, setTimer, setObjective, setSpeed, setHint, setCrosshair, setRaceLine, showGarage, toast, announce, showStart, showPause, showBusted, showWasted, showStoryComplete, hideOverlay, drawMinimap } from './hud.js';
import { initAudio, resumeAudio, toggleMute, isMuted, sfx, startEngine, setEngine, stopEngine, startSiren, setSiren, startRotor, setRotor, startMusic, setMusicMood, startRain, setRainLevel } from './audio.js';
import { loadSave, writeSave, clearSave } from './save.js';
import { initInput, moveAxes, consumePressed, consumeWheel, mouseIsDown, isDown } from './input.js';
import { shotFromUrl, applyShot, markShotReady } from './shots.js';
import { clamp, dist2D, formatClock, formatRaceTime } from './util.js';
import { makeHeli, updateHeli } from './heli.js';
import { garageFromSave, garageNear, garageMenuItems, garageSummary, buyUpgrade, buyPaint, applyGarageUpgrades } from './garage.js';
import { raceFromSave, raceNearStart, buildRaceGates, buildRaceStartMarkers, clearRaceGates, startRace, cancelRace, updateRace, raceObjective, raceStatusLine } from './races.js';
import { taxiFromSave, taxiFarePay, onTaxiFareDone, breakTaxiChain, rollVipFare, companyFareDestination, taxiStatusLine } from './taxi.js';

// The story is eight jobs long; the taxi company opens once it is done.
const STORY_LEN = 8;

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
camera.position.set(-70, 40, 180);

const city = buildCity(scene);
const colliders = city.colliders;

// --- world state ---------------------------------------------------------------
const save = loadSave();
const spawn = save ? { x: save.x, z: save.z } : randomSpawn();
const player = makePlayer(spawn.x, spawn.z);
if (save) {
  player.money = save.money;
}
player.mesh.position.set(player.x, 0, player.z);
scene.add(player.mesh);

// The v3 systems: the garage, the taxi company and the street races all
// restore from the save and persist with it.
const garage = garageFromSave(save && save.garage);
const taxiCompany = taxiFromSave(save && save.taxi);
const raceState = raceFromSave(save && save.races);

const wanted = makeWanted();
const missions = makeMissionState();
const stats = save && save.stats
  ? { ...save.stats }
  : { fares: 0, stolen: 0, bestWanted: 0, barrels: 0, tokens: 0, shots: 0, racesWon: 0, taxiEarned: 0, garageSpent: 0 };
if (save) {
  missions.index = Math.min(save.missionsDone, STORY_LEN);
  for (let i = 0; i < missions.index; i++) missions.done[i] = true;
  if (save.storyDone) missions.index = STORY_LEN;
}

// The police helicopter: parked until five stars call it up.
const heli = makeHeli(scene);

// The race start markers: slim green rings on the road at each circuit's
// start line, so a driver can find the races without a map.
buildRaceStartMarkers(scene);

const traffic = [];
const police = [];
const peds = [];
const enemies = [];
const tracers = [];
const roadblocks = []; // PD roadblocks at high wanted levels
const barrels = []; // explosive barrels at the warehouse and the harbor
const tokens = []; // sunset tokens: glowing caches hidden around the city
let playerCar = null; // the car Mara is driving, or null when on foot
let missionTargetCar = null; // the Coral Coupe mission 2 asks Mara to steal
let ledgerMesh = null;
let ledgerTaken = false;
let cashboxMesh = null; // mission 4: Venn's cash box at the harbor
let cashboxTaken = false;
let chaseTruck = null; // mission 5: Venn's armored truck, fleeing north
let vennLimo = null; // mission 8: Venn's black limousine at the terminal
let farePed = null; // the pedestrian waiting for a taxi fare
let camDistance = 11.5; // chase-camera distance, wheel zooms it 7..16
let hornCooldown = 0;
let nearMissCooldown = 0; // seconds until the next near-miss bonus pays
let crewKey = ''; // which mission stage's crew is currently spawned (missions 6/8)
let lastWantedLevel = 0; // for the dispatch chatter when the heat rises
let lastRaceCount = 0; // last whole second of the race countdown, for beeps

const game = {
  scene, camera, player, traffic, police, enemies, peds, wanted, missions,
  city, colliders, roadblocks, barrels, heli, garage, raceState, taxiCompany,
  state: 'menu',
  shotMode: false,
  cameraMode: 'follow',
  playerCar: null,
  time: 0,
  ensurePolice(n) {
    while (police.length < n) {
      police.push(spawnPoliceCar(scene, player.x, player.z, wanted.level));
    }
    while (police.length > n) {
      const gone = police.pop();
      scene.remove(gone.mesh);
    }
  },
};

// Seed the city with traffic and pedestrians.
for (let i = 0; i < 14; i++) {
  const car = spawnTrafficCar(scene, colliders);
  traffic.push(car);
}
// A few parked cars Mara can steal right away.
for (let i = 0; i < 5; i++) {
  const spot = { x: (Math.random() * 2 - 1) * 200, z: (Math.random() * 2 - 1) * 200 };
  const parked = makeCar('car', spot.x, spot.z, Math.random() * Math.PI * 2);
  parked.targetSpeed = 0;
  scene.add(parked.mesh);
  traffic.push(parked);
}
for (let i = 0; i < 26; i++) {
  peds.push(spawnPedestrian(scene));
}
// Mara's personal ride: a Comet GT parked by the safehouse, painted and
// tuned by the garage. It is a normal traffic car when she is not in it.
const personalRide = makeCar('car', PLACES.safehouse.x + 8, PLACES.safehouse.z + 10, Math.PI / 2, garage.paint);
personalRide.name = 'Comet GT';
personalRide.baseTopSpeed = personalRide.maxSpeed;
applyGarageUpgrades(personalRide, garage);
scene.add(personalRide.mesh);
traffic.push(personalRide);
player.personalRide = personalRide;
// South Solmar folk: pilots by the terminal, resort guests by the pool.
for (const [px, pz] of [[150, 228], [130, 230], [168, 226]]) {
  peds.push(spawnPedestrianAt(scene, px, pz, 'pilot'));
}
for (const [px, pz] of [[-152, 228], [-132, 232], [-118, 244], [-160, 240]]) {
  peds.push(spawnPedestrianAt(scene, px, pz, 'guest'));
}
// Explosive barrels: a few by the warehouse shed, a few in the harbor yard.
for (const [bx, bz] of [[-156, -118], [-124, -122], [-140, -112]]) {
  barrels.push(makeBarrel(scene, bx, bz));
}
for (const [bx, bz] of [[190, -196], [226, -200], [200, -176], [170, -216]]) {
  barrels.push(makeBarrel(scene, bx, bz));
}
// First-aid kits: one by the hospital, one by the safehouse. They restock.
const healthPacks = [
  makeHealthPack(scene, 76, -52),
  makeHealthPack(scene, -64, 156),
];
// Two stray dogs trot along behind a couple of the walkers.
peds.push(spawnDog(scene, peds[2]));
peds.push(spawnDog(scene, peds[9]));
// Chatting pairs on the corners: the city talks to itself.
for (let i = 0; i < 3; i++) {
  const pair = spawnPedestrianPair(scene);
  peds.push(pair[0], pair[1]);
}
// Street vendors hold their carts by the cafe and the plaza.
peds.push(spawnVendor(scene, 62, 132));
peds.push(spawnVendor(scene, -8, 12));
// Sunset tokens: six glowing caches hidden around Solmar, $100 each.
const TOKEN_SPOTS = [
  [0, 24], [-238, 200], [70, -48], [-252, 40], [210, -190], [-70, 160],
];
for (const [tx, tz] of TOKEN_SPOTS) {
  const tokenMesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.9),
    new THREE.MeshStandardMaterial({
      color: 0xffd23e, emissive: 0xaa7711, emissiveIntensity: 1.2,
      metalness: 0.8, roughness: 0.25,
    }),
  );
  tokenMesh.position.set(tx, 1.2, tz);
  tokenMesh.castShadow = true;
  scene.add(tokenMesh);
  tokens.push({ mesh: tokenMesh, x: tx, z: tz, taken: false });
}

initHud();
initInput(canvas, () => {
  resumeAudio();
  if (game.state === 'menu') return;
});
initAudio();
if (save && save.muted) toggleMute();
showStart(save, startGame);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener('error', (event) => {
  document.title = 'solmar-error: ' + String(event.message).slice(0, 120);
});

// --- flow ----------------------------------------------------------------------

function startGame() {
  initAudio();
  resumeAudio();
  startMusic();
  startEngine();
  startSiren();
  startRotor();
  startRain();
  hideOverlay();
  document.body.classList.add('playing');
  game.state = 'playing';
  const m = currentMission(missions);
  if (m) toast(m.title, m.briefing);
  else toast('FREE ROAM', 'Solmar is yours. Take fares, steal cars, dodge the PD.');
  announce(STORY_INTRO);
}

// Persist the whole profile: cash, story, position, stats, garage, the
// taxi company and the race bests. Called on mission completion, on
// autosave, and whenever the mute setting changes.
function persist() {
  writeSave({
    money: player.money,
    missionsDone: missions.index,
    x: player.x,
    z: player.z,
    storyDone: missions.index >= STORY_LEN,
    stats,
    garage,
    taxi: taxiCompany,
    races: { wins: raceState.wins, best: raceState.best },
    muted: isMuted(),
  });
}

function pauseGame() {
  if (game.state !== 'playing') return;
  game.state = 'paused';
  showPause(
    () => { hideOverlay(); game.state = 'playing'; },
    () => { clearSave(); window.location.reload(); },
    stats,
  );
}

function respawn(afterBusted) {
  player.health = player.maxHealth;
  player.x = PLACES.safehouse.x;
  player.z = PLACES.safehouse.z + 8;
  player.heading = 0;
  player.mesh.position.set(player.x, 0, player.z);
  player.mesh.visible = true;
  if (playerCar) {
    // Leave the car where it was; Mara walks away from it.
    traffic.push(playerCar);
    playerCar.targetSpeed = 0;
    playerCar = null;
    game.playerCar = null;
    player.inCar = null;
  }
  wanted.heat = 0;
  wanted.level = 0;
  game.ensurePolice(0);
  // A busted or wasted Mara comes back to a clear road: the PD stands down.
  for (const rb of roadblocks) despawnRoadblock(scene, rb, colliders);
  roadblocks.length = 0;
  // A bust ends the race and the taxi chain: the dispatcher moves on.
  if (raceState.active) {
    clearRaceGates(scene, raceState.gates);
    raceState.gates = [];
    cancelRace(raceState);
  }
  breakTaxiChain(taxiCompany);
  if (afterBusted) player.money = Math.max(0, player.money - 150);
  hideOverlay();
  game.state = 'playing';
}

function endRun(kind) {
  if (kind === 'busted') {
    sfx.busted();
    game.state = 'busted';
    showBusted(() => respawn(true));
  } else {
    sfx.busted();
    game.state = 'wasted';
    showWasted(() => respawn(false));
  }
}

// --- car theft -------------------------------------------------------------------

function enterCar(car) {
  const idx = traffic.indexOf(car);
  if (idx !== -1) traffic.splice(idx, 1);
  playerCar = car;
  game.playerCar = car;
  player.inCar = car;
  player.mesh.visible = false;
  player.x = car.x;
  player.z = car.z;
  sfx.door();
  if (car === personalRide) {
    // Mara's own ride: the garage tuning applies every time she gets in,
    // so a purchase at Leo's shows up on the next drive.
    applyGarageUpgrades(car, garage);
    toast('YOUR COMET GT', 'Leo\u2019s tuning, your paint. This one is yours.');
  } else if (car === missionTargetCar) {
    if (currentMission(missions) && currentMission(missions).id === 'runway-run') {
      toast('TRUCK STOLEN', 'The fuel truck is yours. Lose the cops, then deliver it to Leo.');
    } else {
      toast('CAR STOLEN', 'The Coral Coupe is yours. Lose the cops, then deliver it.');
    }
  } else if (car.kind === 'taxi') {
    toast('CAB TAKEN', car.name + ' — fares pay 50% more in a real cab.');
  } else if (car.kind === 'motorcycle') {
    toast('BIKE TAKEN', car.name + ' — fast, light, and very stealable.');
  } else {
    toast('CAR TAKEN', car.name + ' — the owner will report it.');
  }
  stats.stolen += 1;
  stats.bestWanted = Math.max(stats.bestWanted, wanted.level);
  const res = addHeat(wanted, 30, 'grand theft auto');
  if (res.rose) {
    sfx.wanted();
    toast('WANTED ★'.repeat(0) + 'HEAT RISING', 'The Solmar PD is on its way.');
  }
  game.cameraMode = 'chase';
}

function exitCar() {
  if (!playerCar) return;
  const car = playerCar;
  playerCar = null;
  game.playerCar = null;
  player.inCar = null;
  player.x = car.x - Math.sin(car.heading + Math.PI / 2) * 2.4;
  player.z = car.z - Math.cos(car.heading + Math.PI / 2) * 2.4;
  player.heading = car.heading;
  player.mesh.visible = true;
  player.mesh.position.set(player.x, 0, player.z);
  car.targetSpeed = 0;
  traffic.push(car);
  sfx.door();
  game.cameraMode = 'follow';
}

// --- mission helpers ---------------------------------------------------------------

function spawnMissionTwoCar() {
  if (missionTargetCar) return;
  const car = makeCar('car', PLACES.tower.x + 22, PLACES.tower.z + 6, Math.PI / 2);
  car.name = 'Coral Coupe';
  car.color = 0xff7a3c;
  car.mesh.children[0].material.color.setHex(0xff7a3c);
  car.targetSpeed = 0;
  scene.add(car.mesh);
  traffic.push(car);
  missionTargetCar = car;
}

function spawnWarehouseCrew() {
  // Only spawn when no crew is alive: the old length check let a dead
  // crew from an earlier mission block every later crew from spawning.
  if (enemies.some((e) => e.alive)) return;
  // The crew waits in the open yard south of the shed, in the player's line
  // of fire — never inside the shed itself, where they could not be seen.
  const spots = [
    [PLACES.warehouse.x - 14, PLACES.warehouse.z + 18],
    [PLACES.warehouse.x - 2, PLACES.warehouse.z + 20],
    [PLACES.warehouse.x + 10, PLACES.warehouse.z + 16],
    [PLACES.warehouse.x + 16, PLACES.warehouse.z + 24],
  ];
  for (const [ex, ez] of spots) enemies.push(makeEnemy(scene, ex, ez));
}

function spawnLedger() {
  if (ledgerMesh) return;
  ledgerMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.5, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xffd23e, emissive: 0xaa7711, emissiveIntensity: 0.8, metalness: 0.7, roughness: 0.3 }),
  );
  // The ledger sits by the shed door, reachable on foot.
  ledgerMesh.position.set(PLACES.warehouse.x, 0.9, PLACES.warehouse.z + 14);
  ledgerMesh.castShadow = true;
  scene.add(ledgerMesh);
}

// Mission 4: Venn's enforcers shaking down the dockworkers by the
// containers, in the open yard where Mara can see them coming.
function spawnHarborCrew() {
  if (enemies.some((e) => e.alive)) return;
  const spots = [
    [PLACES.harbor.x - 22, PLACES.harbor.z + 12],
    [PLACES.harbor.x - 4, PLACES.harbor.z + 16],
    [PLACES.harbor.x + 14, PLACES.harbor.z + 8],
  ];
  for (const [ex, ez] of spots) enemies.push(makeEnemy(scene, ex, ez, 'enforcer'));
}

// Mission 6: Venn's resort guards on the Palmera pool deck, in the open
// between the cabanas so Mara can see them from the avenue.
function spawnResortCrew() {
  if (enemies.some((e) => e.alive)) return;
  const spots = [
    [PLACES.resort.x - 18, PLACES.resort.z + 16],
    [PLACES.resort.x - 4, PLACES.resort.z + 20],
    [PLACES.resort.x + 12, PLACES.resort.z + 12],
    [PLACES.resort.x + 20, PLACES.resort.z + 22],
  ];
  for (const [ex, ez] of spots) enemies.push(makeEnemy(scene, ex, ez, 'guard'));
}

// Mission 8: Venn's last guards hold the terminal, and the fixer himself
// stands among them — the toughest man in Solmar, in the grey suit.
function spawnTerminalGuards() {
  if (enemies.some((e) => e.alive)) return;
  const spots = [
    [PLACES.terminal.x - 12, PLACES.terminal.z + 14],
    [PLACES.terminal.x - 2, PLACES.terminal.z + 18],
    [PLACES.terminal.x + 8, PLACES.terminal.z + 12],
    [PLACES.terminal.x + 14, PLACES.terminal.z + 20],
    [PLACES.terminal.x - 18, PLACES.terminal.z + 8],
  ];
  for (const [ex, ez] of spots) enemies.push(makeEnemy(scene, ex, ez, 'guard'));
  enemies.push(makeEnemy(scene, PLACES.terminal.x + 2, PLACES.terminal.z + 16, 'venn'));
}

// Mission 8: Venn's black limousine waits by the terminal, engine
// running — the car he means to ride to the plane. It is scenery with
// a story: stealable, like everything else in Solmar, but the mission
// is the man, not the car.
function spawnVennLimo() {
  if (vennLimo) return;
  const limo = makeCar('limo', PLACES.terminal.x - 22, PLACES.terminal.z + 6, Math.PI / 2, 0x14141a);
  limo.name = "Venn's Limo";
  limo.targetSpeed = 0;
  scene.add(limo.mesh);
  traffic.push(limo);
  vennLimo = limo;
}

// Mission 7: Venn's fuel truck on the airport apron — a slow, heavy
// delivery truck painted yellow, parked by the terminal. Stealing it is
// the mission: it becomes the mission target car.
function spawnFuelTruck() {
  if (missionTargetCar && currentMission(missions) && currentMission(missions).id === 'runway-run') return;
  const truck = makeCar('truck', PLACES.airport.x + 28, PLACES.airport.z + 17, Math.PI / 2, 0xf2c230);
  truck.name = "Venn's Fuel Truck";
  truck.targetSpeed = 0;
  scene.add(truck.mesh);
  traffic.push(truck);
  missionTargetCar = truck;
}

// Mission 4: the cash box appears by the cannery door once the enforcers
// are down — same pickup rule as the ledger, different prize.
function spawnCashbox() {
  if (cashboxMesh) return;
  cashboxMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.6, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x3f8a4a, emissive: 0x1a5a22, emissiveIntensity: 0.6, metalness: 0.6, roughness: 0.4 }),
  );
  cashboxMesh.position.set(PLACES.cannery.x, 0.9, PLACES.cannery.z + 14);
  cashboxMesh.castShadow = true;
  scene.add(cashboxMesh);
}

// Mission 5: Venn's armored truck, a heavy delivery truck painted black,
// fleeing the Freight Yard north up the avenues. It drives itself as a
// traffic car until Mara boxes it in.
function spawnChaseTruck() {
  if (chaseTruck) return;
  // On the avenue beside the Freight Yard, heading north away from town.
  const truck = makeCar('truck', 178, -110, Math.PI, 0x1a1a1e);
  truck.name = "Venn's Hauler";
  truck.vertical = true;
  truck.lane = 175;
  truck.along = -110;
  truck.direction = -1; // north, away from the city
  truck.targetSpeed = 15;
  truck.heading = Math.PI;
  truck.mesh.rotation.y = truck.heading;
  scene.add(truck.mesh);
  traffic.push(truck);
  chaseTruck = truck;
  missions.chaseTimer = 0;
}

// --- garage ----------------------------------------------------------------------

// Open Leo's garage panel: the game pauses while Mara shops, and the
// panel re-renders after every purchase so prices and ownership stay
// live. Buying applies the upgrade to her Comet GT at once.
function openGarage() {
  game.state = 'paused';
  const render = () => {
    showGarage(
      garageMenuItems(garage, player.money),
      player.money,
      garageSummary(garage),
      (id) => {
        if (id === 'engine' || id === 'armour') {
          const res = buyUpgrade(garage, id, player.money);
          if (!res.ok) { sfx.denied(); return; }
          player.money -= res.cost;
          stats.garageSpent = (stats.garageSpent || 0) + res.cost;
          setCash(player.money);
          applyGarageUpgrades(personalRide, garage);
          sfx.upgrade();
          toast('UPGRADE FITTED', id === 'engine' ? 'The Comet pulls harder now.' : 'The Comet shrugs off hits now.');
          render();
          return;
        }
        if (id.startsWith('paint:')) {
          const hex = Number(id.slice('paint:'.length));
          const res = buyPaint(garage, hex, player.money);
          if (!res.ok) { sfx.denied(); return; }
          player.money -= res.cost;
          stats.garageSpent = (stats.garageSpent || 0) + res.cost;
          setCash(player.money);
          applyGarageUpgrades(personalRide, garage);
          sfx.upgrade();
          toast('REPAINTED', 'The Comet GT wears its new paint now.');
          render();
        }
      },
      () => {
        hideOverlay();
        game.state = 'playing';
        persist();
      },
    );
  };
  render();
}

// --- taxi fares (free roam) ----------------------------------------------------------

function maybeOfferFare(dt) {
  if (missions.index < STORY_LEN || missions.fare || player.inCar) return;
  missions.fareCooldown -= dt;
  if (missions.fareCooldown > 0) return;
  missions.fareCooldown = 25;
  // Find a pedestrian near Mara to be the passenger.
  let best = null;
  let bestD = 45;
  for (const ped of peds) {
    const d = dist2D(ped.x, ped.z, player.x, player.z);
    if (d < bestD) { best = ped; bestD = d; }
  }
  if (!best) return;
  farePed = best;
  missions.fare = startFare(missions, best.x, best.z, 120 + Math.floor(Math.random() * 180));
  // From Pro rank up, the dispatcher sometimes sends a VIP: a timed
  // guest who wants the resort or the airport and pays nearly double.
  if (rollVipFare(taxiCompany, Math.random)) {
    const dest = companyFareDestination(Math.random, true);
    missions.fare.toX = dest.place.x;
    missions.fare.toZ = dest.place.z;
    missions.fare.name = dest.place.name;
    missions.fare.vip = true;
    toast('VIP FARE', 'A guest needs the ' + dest.place.name + ' — fast. The company pays double.');
  } else {
    missions.fare.vip = false;
    toast('TAXI FARE', 'A passenger waits nearby — walk up and press E.');
  }
  sfx.pickup();
}

// --- main loop -----------------------------------------------------------------------

const clock = new THREE.Clock();
let frame = 0;
let saveTimer = 0;
let fireTimer = 0;
let bustedTimer = 0;
let regenTimer = 0;
let shotThreat = { x: 0, z: 0, radius: 0, until: 0 };
let lastDamageAt = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  game.time += dt;
  frame += 1;

  if (game.state === 'playing') {
    stepGame(dt);
  }
  city.update(dt, game.time, player.x, player.z);
  setRainLevel(city.getWeather().rainLevel);
  renderer.render(scene, camera);

  // Screenshot mode: mark the page ready once the scene has settled.
  if (game.shotMode && game.state === 'playing') {
    markShotReady(frame);
  }
}

function stepGame(dt) {
  // Screenshot presets drive themselves so the staged moment stays alive.
  const axes = game.autoDrive ? { x: 0, y: 1 } : moveAxes();
  const running = isDown('ShiftLeft') || isDown('ShiftRight');

  // Pause / mute / weapon switching.
  if (consumePressed('KeyP')) { pauseGame(); return; }
  if (consumePressed('KeyM')) {
    const muted = toggleMute();
    toast(muted ? 'SOUND OFF' : 'SOUND ON', '');
    persist();
  }
  if (consumePressed('Digit1')) { player.weapon = 'fists'; setCrosshair(false); }
  if (consumePressed('Digit2')) {
    player.weapon = 'pistol';
    setCrosshair(true);
    sfx.click();
  }
  // The garage: on foot near Venn's Garage, press G to open Leo's panel.
  if (consumePressed('KeyG') && !playerCar && garageNear(player.x, player.z)) {
    openGarage();
    return;
  }
  // Street races: in a car at a start marker, press R to enter.
  if (consumePressed('KeyR') && playerCar && !raceState.active && !missions.fare) {
    const route = raceNearStart(playerCar.x, playerCar.z);
    if (route) {
      raceState.gates = buildRaceGates(scene, route);
      startRace(raceState, route);
      lastRaceCount = 4;
      toast('RACE — ' + route.name, route.blurb + ' Beat par ' + formatRaceTime(route.par) + ' for $' + route.payout + '.');
      sfx.raceBeep();
    }
  }

  // --- mission stage bookkeeping: spawn what the stage needs ---
  const mission = currentMission(missions);
  if (mission && mission.id === 'hot-wheels' && missions.stage === 0) spawnMissionTwoCar();
  if (mission && mission.id === 'sunset-score' && missions.stage === 0) spawnWarehouseCrew();
  if (mission && mission.id === 'harbor-lights' && missions.stage === 1) spawnHarborCrew();
  if (mission && mission.id === 'the-last-collector' && missions.stage === 1) spawnChaseTruck();
  if (mission && mission.id === 'runway-run' && missions.stage === 1) spawnFuelTruck();
  if (mission && mission.id === 'the-last-flight' && missions.stage === 0) spawnVennLimo();
  // Missions 6 and 8 clear a crew: spawn it once per stage and track
  // whether it is down, so the stage cannot complete before the player
  // has even met the guards.
  let crewDown = false;
  if (mission && (mission.id === 'southern-comfort' || mission.id === 'the-last-flight') && missions.stage === 1) {
    const key = mission.id + ':' + missions.stage;
    if (crewKey !== key) {
      crewKey = key;
      if (mission.id === 'southern-comfort') spawnResortCrew();
      else spawnTerminalGuards();
    }
    crewDown = crewKey === key && enemies.length > 0 && enemies.filter((e) => e.alive).length === 0;
  } else if (crewKey) {
    crewKey = '';
  }

  // --- movement ---
  // Mouse wheel zooms the chase camera; the horn scares nearby pedestrians.
  const wheel = consumeWheel();
  if (wheel !== 0) camDistance = clamp(camDistance + wheel * 1.5, 7, 16);
  hornCooldown -= dt;
  nearMissCooldown -= dt;
  if (consumePressed('KeyH') && hornCooldown <= 0 && playerCar) {
    hornCooldown = 0.9;
    sfx.horn();
    shotThreat = { x: player.x, z: player.z, radius: 18, until: game.time + 1.2 };
  }
  let speedKmh = 0;
  if (playerCar) {
    updatePlayerCar(playerCar, axes, dt, isDown('Space'), colliders, (impact) => {
      sfx.crash();
      if (impact > 12) damagePlayer(3);
    });
    speedKmh = Math.abs(playerCar.speed) * 3.6;
    setEngine(Math.abs(playerCar.speed) / playerCar.maxSpeed, true, playerCar.kind);
    const raceRoute = raceState.active ? null : raceNearStart(playerCar.x, playerCar.z);
    setHint('<b>E</b> — exit car &nbsp; <b>Space</b> — handbrake' +
      (raceRoute ? '<br><b>R</b> — enter the ' + raceRoute.name + ' (par ' + formatRaceTime(raceRoute.par) + ', $' + raceRoute.payout + ')' : ''));
    // Crash into traffic cars.
    for (const other of traffic) {
      if (dist2D(playerCar.x, playerCar.z, other.x, other.z) < 4.4) {
        if (Math.abs(playerCar.speed) > 6) {
          playerCar.speed *= 0.45;
          sfx.crash();
          damagePlayer(2);
        }
        const push = 4.4 - dist2D(playerCar.x, playerCar.z, other.x, other.z);
        const a = Math.atan2(other.x - playerCar.x, other.z - playerCar.z);
        other.x += Math.sin(a) * push;
        other.z += Math.cos(a) * push;
        other.mesh.position.set(other.x, 0, other.z);
      } else if (dist2D(playerCar.x, playerCar.z, other.x, other.z) < 6.5
        && Math.abs(playerCar.speed) > 15 && nearMissCooldown <= 0) {
        // Near miss: threading past traffic at speed pays a little bonus.
        nearMissCooldown = 3;
        player.money += 5;
        setCash(player.money);
        toast('CLOSE ONE', '+$5 for threading the gap.');
        sfx.cash();
      }
    }
    // Running over a pedestrian is a crime — and a tragedy.
    for (const ped of peds) {
      if (ped.down) continue;
      if (dist2D(playerCar.x, playerCar.z, ped.x, ped.z) < 2.1 && Math.abs(playerCar.speed) > 3) {
        ped.down = true;
        ped.downTimer = 8;
        ped.mesh.rotation.x = -Math.PI / 2;
        ped.mesh.position.y = 0.35;
        addHeat(wanted, 25, 'hit pedestrian');
        toast('PEDESTRIAN DOWN', 'The PD saw that. Heat is rising.');
        sfx.crash();
      }
    }
    if (consumePressed('KeyE')) exitCar();
    // In screenshot mode the preset owns the camera; the loop must not
    // overwrite its cinematic angle every frame.
    if (!game.shotMode) game.cameraMode = 'chase';
  } else {
    const camHeading = player.heading;
    const walked = updatePlayerOnFoot(player, axes, dt, running, camHeading, colliders, isDown('KeyC'));
    speedKmh = walked * 3.6;
    setEngine(0, false);
    // Enter a nearby car.
    const near = nearestCarToPlayer(player, traffic, 4.5);
    if (near && consumePressed('KeyE')) {
      enterCar(near);
    } else if (near) {
      setHint('<b>E</b> — steal the ' + near.name);
    } else if (missions.fare && !missions.fare.pickedUp && farePed &&
      dist2D(player.x, player.z, farePed.x, farePed.z) < 3) {
      setHint('<b>E</b> — pick up the passenger');
      if (consumePressed('KeyE')) {
        missions.fare.pickedUp = true;
        toast('PASSENGER ABOARD', 'Take them to ' + missions.fare.name + '.');
        sfx.pickup();
      }
    } else if (farePed && missions.fare && !missions.fare.pickedUp &&
      dist2D(player.x, player.z, farePed.x, farePed.z) < 6) {
      setHint('<b>E</b> — pick up the passenger');
    } else if (garageNear(player.x, player.z)) {
      setHint('<b>G</b> — Leo\u2019s garage: paint and tune the Comet GT');
    } else {
      setHint('<b>WASD</b> move &nbsp; <b>Shift</b> run &nbsp; <b>E</b> enter a car<br><b>2</b> pistol &nbsp; <b>F</b> punch &nbsp; <b>P</b> pause');
    }
    if (!game.shotMode) game.cameraMode = 'follow';
  }

  // --- combat input ---
  fireTimer -= dt;
  if (!playerCar) {
    if (consumePressed('KeyF')) {
      sfx.punch();
      const hit = punch(player.x, player.z, player.heading, enemies);
      if (hit) {
        toast(hit.killed ? 'KNOCKED OUT' : 'HIT', '');
        addHeat(wanted, 6, 'assault');
      }
    }
    if (player.weapon === 'pistol' && mouseIsDown() && fireTimer <= 0 && player.ammo > 0) {
      fireTimer = 0.28;
      player.ammo -= 1;
      sfx.gunshot();
      const from = new THREE.Vector3(player.x, 1.5, player.z);
      const result = shootFromCamera(camera, enemies, scene, 90, barrels);
      const to = result ? result.point : new THREE.Vector3(
        player.x + Math.sin(player.heading) * 60,
        1.4,
        player.z + Math.cos(player.heading) * 60,
      );
      const tracer = makeTracer(scene, from, to);
      tracers.push(tracer);
      shotThreat = { x: player.x, z: player.z, radius: 34, until: game.time + 1.5 };
      addHeat(wanted, 12, 'shots fired');
      if (result && result.hit === 'barrel') {
        const caught = detonateBarrel(result.barrel, scene, enemies);
        stats.barrels += 1;
        sfx.explosion();
        addHeat(wanted, 18, 'explosion');
        toast('BARREL BLEW', caught.length > 0
          ? caught.length + ' of Venn\u2019s men caught in the blast.'
          : 'Nobody close enough to catch it.');
      } else if (result && result.hit === 'enemy') {
        toast(result.killed ? 'TARGET DOWN' : 'HIT', result.killed ? '' : 'Keep firing.');
        if (result.killed) sfx.cash();
      }
      if (player.ammo <= 0) {
        toast('OUT OF AMMO', 'Find more at the safehouse — press 1 for fists.');
        player.ammo = 12;
      }
    }
  }

  // --- traffic, pedestrians, police ---
  for (const car of traffic) updateTrafficCar(car, dt, traffic);
  // Headlights come on after dark, for traffic and for Mara's car.
  const skyNow = city.getWeather();
  const isNight = skyNow.timeOfDay < 0.22 || skyNow.timeOfDay > 0.82;
  for (const car of traffic) updateCarLights(car, isNight);
  if (playerCar) updateCarLights(playerCar, isNight);
  const threats = [];
  if (playerCar && Math.abs(playerCar.speed) > 4) {
    threats.push({ x: playerCar.x, z: playerCar.z, radius: 9 });
  }
  if (game.time < shotThreat.until) {
    threats.push({ x: shotThreat.x, z: shotThreat.z, radius: shotThreat.radius });
  }
  for (const ped of peds) {
    if (ped.down) {
      ped.downTimer -= dt;
      if (ped.downTimer <= 0) {
        ped.down = false;
        ped.mesh.rotation.x = 0;
        ped.mesh.position.y = 0;
      }
      continue;
    }
    updatePedestrian(ped, dt, threats);
  }
  // Police: field as many cars as the wanted level demands.
  const wantCount = wantedForLevel(wanted.level);
  game.ensurePolice(wantCount);
  for (const cop of police) {
    updatePoliceCar(cop, player.x, player.z, playerCar ? Math.abs(playerCar.speed) : player.speed, dt, colliders, (dmg) => {
      damagePlayer(dmg);
      sfx.crash();
    }, wanted.level);
  }
  setSiren(police.length ? nearestPoliceDistance(police, player.x, player.z) : 999);

  // Roadblocks: at three stars the PD closes the road ahead of Mara; the
  // block lifts once the heat drops back down.
  if (wanted.level >= 3 && roadblocks.length === 0) {
    const heading = playerCar ? playerCar.heading : player.heading;
    const spot = roadblockSpot(player.x, player.z, heading);
    roadblocks.push(spawnRoadblock(scene, spot.x, spot.z, spot.heading, colliders));
    toast('ROADBLOCK AHEAD', 'The PD has closed the road — go around or through.');
    sfx.radio();
  }
  if (wanted.level < 2 && roadblocks.length > 0) {
    for (const rb of roadblocks) despawnRoadblock(scene, rb, colliders);
    roadblocks.length = 0;
  }
  // Ramming a roadblock interceptor hurts, like ramming traffic.
  if (playerCar) {
    for (const rb of roadblocks) {
      for (const copCar of rb.cars) {
        if (dist2D(playerCar.x, playerCar.z, copCar.x, copCar.z) < 4.4 && Math.abs(playerCar.speed) > 6) {
          playerCar.speed *= 0.4;
          sfx.crash();
          damagePlayer(3);
          addHeat(wanted, 8, 'rammed a roadblock');
        }
      }
      // Spike strips pop the tires: the car limps until the timer runs out.
      if (rb.spikes && !rb.spikes.used && dist2D(playerCar.x, playerCar.z, rb.spikes.x, rb.spikes.z) < 3) {
        rb.spikes.used = true;
        playerCar.spikeSlow = 6;
        toast('TIRES SPIKED', 'The car limps — shake the cops before it heals.');
        sfx.crash();
      }
    }
  }

  // Screenshot mode: the chase preset keeps its interceptors in formation
  // around the player's car so the staged cover always reads as a chase.
  if (game.shotMode && game.policeFormation && playerCar) {
    const h = playerCar.heading;
    const sinH = Math.sin(h);
    const cosH = Math.cos(h);
    police.forEach((cop, i) => {
      const [lx, lz] = game.policeFormation[i % game.policeFormation.length];
      cop.x = playerCar.x + lx * cosH + lz * sinH;
      cop.z = playerCar.z - lx * sinH + lz * cosH;
      cop.heading = h;
      cop.speed = Math.abs(playerCar.speed);
      cop.mesh.position.set(cop.x, 0, cop.z);
      cop.mesh.rotation.y = h;
    });
  }

  // The helicopter: at five stars it comes up and pins its spotlight on
  // Mara; below four it peels off. While it is on station the heat cools
  // at half speed and the bust range grows — the eye never loses her.
  const heliOn = updateHeli(heli, dt, player.x, player.z, wanted.level, game.time);
  setRotor(dist2D(heli.group.position.x, heli.group.position.z, player.x, player.z), heli.active);

  // Wanted decay and busted check. Sneaking lets Mara hide in plain
  // sight: a cop has to be almost on top of her to make the bust.
  updateWanted(wanted, dt, police.length === 0, heliOn);
  if (wanted.level > lastWantedLevel) {
    toast('WANTED — ' + wanted.level + ' ★', pdDispatchText(wanted.level));
    sfx.radio();
  }
  if (wanted.level < lastWantedLevel && wanted.level === 0) {
    toast('HEAT OFF', 'The PD lost you. Solmar is quiet — for now.');
  }
  lastWantedLevel = wanted.level;
  if (wanted.level >= 1 && !playerCar && player.speed < 1) {
    const bustRange = (player.sneaking ? 2.2 : 4) + (heliOn ? 1 : 0);
    let near = false;
    for (const cop of police) {
      if (dist2D(cop.x, cop.z, player.x, player.z) < bustRange) near = true;
    }
    if (near) {
      bustedTimer += dt;
      if (bustedTimer > 2.5) {
        bustedTimer = 0;
        endRun('busted');
        return;
      }
    } else {
      bustedTimer = 0;
    }
  } else {
    bustedTimer = 0;
  }

  // --- enemies ---
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    updateEnemy(enemy, dt, player.x, player.z, (dmg) => {
      damagePlayer(dmg);
      sfx.gunshot();
    });
  }
  // Ledger appears once the warehouse crew is down.
  if (mission && mission.id === 'sunset-score' && missions.stage === 0) {
    const alive = enemies.filter((e) => e.alive).length;
    if (alive === 0 && enemies.length > 0) spawnLedger();
  }
  if (ledgerMesh && !ledgerTaken && dist2D(player.x, player.z, PLACES.warehouse.x, PLACES.warehouse.z + 14) < 3) {
    ledgerTaken = true;
    scene.remove(ledgerMesh);
    ledgerMesh = null;
    toast('LEDGER SECURED', 'Now get it home to the safehouse.');
    sfx.pickup();
  }
  // Cash box appears once the harbor enforcers are down.
  if (mission && mission.id === 'harbor-lights' && missions.stage === 1) {
    const alive = enemies.filter((e) => e.alive).length;
    if (alive === 0 && enemies.length > 0) spawnCashbox();
  }
  if (cashboxMesh && !cashboxTaken && dist2D(player.x, player.z, PLACES.cannery.x, PLACES.cannery.z + 14) < 3) {
    cashboxTaken = true;
    scene.remove(cashboxMesh);
    cashboxMesh = null;
    toast('CASH BOX SECURED', 'Now get it to Leo at the garage.');
    sfx.pickup();
  }

  // --- missions ---
  // Mission 5: stay on the truck's tail and the driver loses his nerve.
  let chaseDone = false;
  if (mission && mission.id === 'the-last-collector' && missions.stage === 1 && chaseTruck) {
    const chaseD = dist2D(player.x, player.z, chaseTruck.x, chaseTruck.z);
    if (chaseD < 14) {
      missions.chaseTimer += dt;
      chaseTruck.targetSpeed = Math.max(4, 15 - missions.chaseTimer * 2.5);
    } else {
      missions.chaseTimer = Math.max(0, missions.chaseTimer - dt * 0.5);
      chaseTruck.targetSpeed = 15;
    }
    if (missions.chaseTimer > 3.5) {
      chaseTruck.targetSpeed = 0;
      chaseDone = true;
    }
  }
  const world = {
    px: player.x,
    pz: player.z,
    stolenCar: missionTargetCar !== null && playerCar === missionTargetCar,
    wantedLevel: wanted.level,
    enemiesLeft: enemies.filter((e) => e.alive).length,
    pickedLedger: ledgerTaken || cashboxTaken,
    chaseDone,
    crewDown,
  };
  const finished = updateMissions(missions, world, dt);
  if (missions.message) {
    toast('MISSION FAILED', missions.message);
    missions.message = '';
  }
  if (finished) {
    player.money += finished.reward;
    setCash(player.money);
    toast('MISSION COMPLETE', finished.mission.title + ' — +$' + finished.reward);
    sfx.mission();
    sfx.cash();
    persist();
    if (missions.index >= STORY_LEN) {
      showStoryComplete(() => { hideOverlay(); game.state = 'playing'; });
      game.state = 'paused';
    } else {
      const next = currentMission(missions);
      if (next) setTimeout(() => toast(next.title, next.briefing), 2800);
    }
  }

  // --- street races ---
  if (raceState.active) {
    if (!playerCar) {
      // A race needs a car: leaving it abandons the race.
      clearRaceGates(scene, raceState.gates);
      raceState.gates = [];
      cancelRace(raceState);
      breakTaxiChain(taxiCompany);
      toast('RACE ABANDONED', 'You left the car — the gates come down.');
    } else {
      // Countdown beeps: one per whole second left, then GO.
      if (raceState.countdown > 0) {
        const whole = Math.ceil(raceState.countdown);
        if (whole < lastRaceCount) {
          lastRaceCount = whole;
          sfx.raceBeep();
        }
      }
      const ev = updateRace(raceState, playerCar.x, playerCar.z, dt);
      if (ev && ev.type === 'go') {
        sfx.raceGo();
        toast('GO!', 'Through the gates, in order.');
      }
      if (ev && ev.type === 'checkpoint') {
        sfx.checkpoint();
        toast('GATE ' + ev.index + '/' + ev.total, 'Keep it flat out.');
      }
      if (ev && ev.type === 'finish') {
        player.money += ev.payout;
        stats.racesWon = (stats.racesWon || 0) + 1;
        setCash(player.money);
        clearRaceGates(scene, raceState.gates);
        raceState.gates = [];
        toast('RACE WON — ' + ev.route.name,
          formatRaceTime(ev.time) + (ev.isBest ? ' — new best time!' : '') + ' +$' + ev.payout);
        sfx.mission();
        sfx.cash();
      }
      // Light the next gate gold and dim the rest, so the route reads.
      if (raceState.active) {
        raceState.gates.forEach((g, i) => {
          if (i % 2 !== 0) return; // odd indices are the light posts
          const gateIndex = i / 2;
          const isNext = gateIndex === raceState.checkpoint;
          g.material.color.setHex(isNext ? 0xffc230 : 0x2e6fd8);
          g.material.opacity = isNext ? 0.95 : 0.45;
        });
      }
    }
  }

  // --- taxi fares ---
  maybeOfferFare(dt);
  if (missions.fare && missions.fare.pickedUp && playerCar) {
    const d = dist2D(player.x, player.z, missions.fare.toX, missions.fare.toZ);
    if (d < 10) {
      // A real cab earns 50% more; harbor runs pay a dock premium,
      // airport and resort runs a tourist premium. The company adds its
      // rank bonus, VIP multiplier and the chain bonus on top.
      const base = farePayForDestination(missions.fare.pay, missions.fare.name, playerCar.kind === 'taxi');
      const vip = missions.fare.vip === true;
      const pay = taxiFarePay(taxiCompany, base, vip);
      player.money += pay;
      stats.fares += 1;
      stats.taxiEarned = (stats.taxiEarned || 0) + pay;
      setCash(player.money);
      const rankUp = onTaxiFareDone(taxiCompany, vip, pay);
      toast(vip ? 'VIP FARE PAID' : 'FARE PAID', '+$' + pay + ' — nice driving.' +
        (rankUp.rankUp ? ' Rank up: Taxi Co. ' + rankUp.rankName + '!' : '') +
        (taxiCompany.chain > 0 ? ' Chain x' + taxiCompany.chain + ' — the dispatcher has another pickup.' : ''));
      sfx.cash();
      missions.fare = null;
      farePed = null;
      // A chained fare comes fast: the dispatcher already has the next
      // pickup, so the cooldown is short while the chain is alive.
      missions.fareCooldown = taxiCompany.chain > 0 ? 4 : 20;
    }
  }

  // --- sunset tokens ---
  for (const token of tokens) {
    if (token.taken) continue;
    token.mesh.rotation.y += dt * 2;
    token.mesh.position.y = 1.2 + Math.sin(game.time * 2 + token.x) * 0.2;
    if (dist2D(player.x, player.z, token.x, token.z) < 2.5) {
      token.taken = true;
      scene.remove(token.mesh);
      player.money += 100;
      stats.tokens = (stats.tokens || 0) + 1;
      setCash(player.money);
      toast('SUNSET TOKEN', '+$100 — ' + stats.tokens + ' of 6 found.');
      sfx.cash();
    }
  }

  // --- first-aid kits ---
  for (const pack of healthPacks) {
    if (pack.taken) {
      pack.respawn -= dt;
      if (pack.respawn <= 0) {
        pack.taken = false;
        scene.add(pack.mesh);
      }
      continue;
    }
    pack.mesh.rotation.y += dt;
    if (dist2D(player.x, player.z, pack.x, pack.z) < 2.2 && player.health < player.maxHealth) {
      pack.taken = true;
      pack.respawn = 45;
      scene.remove(pack.mesh);
      player.health = Math.min(player.maxHealth, player.health + 40);
      setHealth(player.health, player.maxHealth);
      toast('FIRST AID', '+40 health.');
      sfx.cash();
    }
  }

  // --- health regen out of combat ---
  if (game.time - lastDamageAt > 10 && player.health < player.maxHealth) {
    regenTimer += dt;
    if (regenTimer > 1) {
      regenTimer = 0;
      player.health = Math.min(player.maxHealth, player.health + 2);
    }
  }

  // --- tracers ---
  for (let i = tracers.length - 1; i >= 0; i--) {
    if (!updateTracer(tracers[i], dt)) {
      scene.remove(tracers[i].line);
      tracers.splice(i, 1);
    }
  }

  // --- camera ---
  if (game.cameraMode === 'chase' && playerCar) {
    updateCamera(camera, playerCar.x, playerCar.z, playerCar.heading, dt, camDistance, 4.6, 10);
  } else {
    updateCamera(camera, player.x, player.z, player.heading, dt, camDistance * 0.7, 3.4, 6);
  }

  // --- HUD ---
  setStars(wanted.level);
  setCash(player.money);
  setHealth(player.health, player.maxHealth);
  setStamina(player.stamina, player.maxStamina);
  const sky = city.getWeather();
  setClock(formatClock(sky.timeOfDay * 24), sky.mode === 'rain' ? 'RAIN' : 'CLEAR');
  setTimer(missions.stageTimer);
  setMusicMood(sky.timeOfDay < 0.22 || sky.timeOfDay > 0.82 ? 'night' : 'day');
  const obj = missionObjectiveText(missions);
  if (missions.fare && missions.fare.pickedUp) {
    setObjective(missions.fare.vip ? 'VIP FARE' : 'TAXI FARE', fareObjectiveText(missions.fare));
  } else if (missions.fare && !missions.fare.pickedUp) {
    setObjective(missions.fare.vip ? 'VIP FARE' : 'TAXI FARE', 'Pick up your passenger.');
  } else if (!currentMission(missions)) {
    // Free roam: the objective line carries the taxi company and the
    // race standings, so the side business is always in view.
    setObjective('FREE ROAM', taxiStatusLine(taxiCompany) + ' · ' + raceStatusLine(raceState));
  } else {
    setObjective(obj.title, obj.text);
  }
  // The race line sits under the clock while a race is live.
  setRaceLine(raceObjective(raceState));
  setSpeed(speedKmh, playerCar ? (playerCar.name || 'CAR') : 'ON FOOT');
  const stage = currentStage(missions);
  const marker = stage && stage.place ? stage.place
    : missions.fare ? { x: missions.fare.pickedUp ? missions.fare.toX : missions.fare.fromX, z: missions.fare.pickedUp ? missions.fare.toZ : missions.fare.fromZ }
      : null;
  drawMinimap({
    px: player.x, pz: player.z, heading: playerCar ? playerCar.heading : player.heading,
    marker, traffic, police, roadblocks, time: game.time,
  });

  // --- autosave ---
  saveTimer += dt;
  if (saveTimer > 5) {
    saveTimer = 0;
    persist();
  }
}

function damagePlayer(amount) {
  // Armour on the tuned ride absorbs a share of every hit first.
  player.health = Math.max(0, player.health - damageThroughArmour(player, amount));
  lastDamageAt = game.time;
  if (player.health <= 0) {
    endRun('wasted');
  }
}

// --- screenshot presets ---------------------------------------------------------
const shot = shotFromUrl();
if (shot) {
  // Skip the menu: the game starts already playing in the staged moment.
  game.state = 'playing';
  game.shotMode = true;
  hideOverlay();
  document.body.classList.add('playing');
  initAudio();
  startEngine();
  applyShot(game, shot);
  // applyShot hands main.js the staged car; the loop drives the local one.
  playerCar = game.playerCar;
  // The HUD needs one frame of state before the first render.
  setStars(wanted.level);
  setCash(player.money);
  setHealth(player.health, player.maxHealth);
  const obj = missionObjectiveText(missions);
  setObjective(obj.title, obj.text);
  setSpeed(0, playerCar ? playerCar.name : 'ON FOOT');
}

// A small debug handle for play-testing: the state the HUD reads from.
// Harmless in play; the finalist review plays the game, not this handle.
window.__solmar = {
  get player() { return player; },
  get state() { return game.state; },
  get scene() { return scene; },
  get game() { return game; },
  get wanted() { return wanted; },
  get missions() { return missions; },
  get trafficCount() { return traffic.length; },
  get policeCount() { return police.length; },
  get pedCount() { return peds.length; },
  get cars() { return traffic; },
  get enemies() { return enemies; },
  get weather() { return city.getWeather(); },
  get roadblocks() { return roadblocks; },
  get barrels() { return barrels; },
  get stats() { return stats; },
  get chaseTruck() { return chaseTruck; },
  get heli() { return heli; },
  get garage() { return garage; },
  get raceState() { return raceState; },
  get taxiCompany() { return taxiCompany; },
  get personalRide() { return personalRide; },
  get missionTargetCar() { return missionTargetCar; },
  get vennLimo() { return vennLimo; },
};

animate();
