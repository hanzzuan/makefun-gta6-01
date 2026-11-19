// main.js — SOLMAR: Sunset Streets. Bootstraps the renderer, owns the game
// loop and the state machine (menu / playing / paused / busted / wasted),
// and wires every system together: city, cars, pedestrians, police,
// missions, combat, HUD, audio and saving.

import * as THREE from 'three';
import { buildCity, PLACES, hitsBuilding, nearestPlace } from './city.js';
import { makeCar, spawnTrafficCar, updateTrafficCar, updatePlayerCar, updateCarLights } from './cars.js';
import { CAMPUS_STUDENTS, buildEastBountyBoard, buildEastMural, buildStadiumMural, buildMallMural } from './east.js';
import { buildCasinoSign, buildBountyBillboard, buildResortMural, buildAirportMural, buildBeachMural } from './south.js';
import { makePlayer, updatePlayerOnFoot, updateCamera, nearestCar as nearestCarToPlayer, randomSpawn, damageThroughArmour, clampPlayerToCity, setSpraying } from './player.js';
import { spawnPedestrian, spawnPedestrianPair, spawnPedestrianAt, spawnVendor, spawnJobClients, spawnRareSpotters, spawnDog, updatePedestrian } from './pedestrians.js';
import { makeWanted, addHeat, updateWanted, wantedForLevel, spawnPoliceCar, updatePoliceCar, nearestPoliceDistance, spawnRoadblock, despawnRoadblock, roadblockSpot, pdDispatchText, RARE_CAR_HEAT, GRAFFITI_HEAT } from './police.js';
import { makeMissionState, currentMission, currentStage, updateMissions, missionObjectiveText, startFare, fareObjectiveText, farePayForDestination, STORY_INTRO, missionArc, arcPayout } from './missions.js';
import { makeEnemy, updateEnemy, shootFromCamera, punch, makeTracer, updateTracer, makeBarrel, detonateBarrel, makeHealthPack, isBoss, cashDropFor } from './combat.js';
import { initHud, setStars, setCash, setHealth, setStamina, setClock, setTimer, setObjective, setSpeed, setHint, setCrosshair, setRaceLine, showGarage, showProperty, showCrew, showCasino, showNightclub, showFastTravel, showJobs, showBounty, showCollectors, showGraffiti, setRadio, setCrewLine, toast, announce, showStart, showPause, showBusted, showWasted, showStoryComplete, hideOverlay, drawMinimap } from './hud.js';
import { initAudio, resumeAudio, toggleMute, isMuted, sfx, startEngine, setEngine, stopEngine, startSiren, setSiren, startRotor, setRotor, startMusic, setMusicMood, setRadioStation, startRain, setRainLevel, startBoat, setBoat, stopBoat } from './audio.js';
import { loadSave, writeSave, clearSave } from './save.js';
import { initInput, moveAxes, consumePressed, anyPressed, consumeWheel, mouseIsDown, isDown } from './input.js';
import { shotFromUrl, applyShot, markShotReady } from './shots.js';
import { clamp, dist2D, formatClock, formatRaceTime, formatCountdown } from './util.js';
import { makeHeli, updateHeli, heliOnStation, heliCallCountdown, HELI_CALL_WARNING } from './heli.js';
import { garageFromSave, garageNear, garageMenuItems, garageSummary, buyUpgrade, buyPaint, applyGarageUpgrades, buildBountyBoard, updateBountyBoard } from './garage.js';
import { raceFromSave, raceNearStart, buildRaceGates, buildRaceStartMarkers, clearRaceGates, startRace, cancelRace, updateRace, raceObjective, raceStatusLine } from './races.js';
import { taxiFromSave, taxiFarePay, onTaxiFareDone, breakTaxiChain, rollVipFare, companyFareDestination, taxiStatusLine, taxiJobBonusPay } from './taxi.js';
import { makeBoat, spawnBoat, spawnPatrolBoat, updatePlayerBoat, updateBoatVisual, boatNear, makeBuoy, updateBuoy, updateRivalBoat } from './boats.js';
import { makePropertyState, propertyFromSave, propertyNear, buyProperty, propertyMenuItems, propertySummary, collectRent, buildPropertySigns, updatePropertySigns, propertyStatusLine } from './property.js';
import { makeRivalState, rivalFromSave, spawnRivalChase, updateRival, updateRivalChase, despawnRivals, rivalTaunt, rivalStatusLine, damageRival, RIVAL_CHASE_REWARD, rivalWreckBonus, rivalTagWar } from './rivals.js';
import { makeRadioState, radioFromSave, nextStation, currentStation, radioStatusLine, radioJingle, radioAd } from './radio.js';
import { makeEventState, eventFromSave, updateEvents, eventStatusLine } from './events.js';
import { spawnBus, updateBus, spawnCoupe, spawnPickup, spawnSprayVan, spawnTaxi, busStatusLine } from './vehicles.js';
import { makeCrewState, crewFromSave, crewNear, hireCrew, trainCrew, hasCrew, crewMenuItems, crewSummary, crewSpeedMult, crewDecayMult, crewLookout, crewStatusLine, crewHiredLine, onMissionWithCrew, crewJobBonus, crewBountyBonus, crewGraffitiBonus } from './crew.js';
import { makeCasinoState, casinoFromSave, casinoNear, playSlots, playBlackjack, playRoulette, casinoMenuItems, casinoSummary, casinoStatusLine, casinoBetFor } from './casino.js';
import { makeNightclubState, nightclubFromSave, nightclubNear, buyClub, hireBouncer, buyClubUpgrade, clubDailyTake, collectClubIncome, djStartSet, djUpdate, djHit, djSetLine, nightclubMenuItems, nightclubSummary, nightclubStatusLine, clubDoorLine, clubCrowdLine, buildClubSign, updateClubSign } from './nightclub.js';
import { makeFastTravelState, fastTravelFromSave, fastTravelMenuItems, fastTravelSummary, fastTravelStatusLine, fastTravelArrivedLine, takeFastTravel, fastTravelBlockReason } from './fasttravel.js';
import { makeCollectorsState, collectorsFromSave, spawnRareCars, updateCollectors, collectorsMenuItems, collectorsSummary, collectorsStatusLine, collectorsFoundLine, buildShowroomSign, updateShowroomSign, COLLECTORS_GOLD_PAINT, rareCarRumor, collectorsProgressBar } from './collectors.js';
import { makePackagesState, packagesFromSave, spawnPackages, updatePackages, packagesMenuItems, packagesSummary, packagesStatusLine, packagesComplete, packagesJobBonus, packagesBountyBonus, nearestPackage, pulsePackageMeshes } from './packages.js';
import { makeJobsState, jobsFromSave, jobsNear, refreshJobsBoard, acceptJob, updateJobs, jobsMenuItems, jobsSummary, jobsStatusLine, jobsBoardLine, jobsTimerLine } from './jobs.js';
import { makeBountyState, bountyFromSave, bountyNear, refreshBountyBoard, acceptBounty, updateBounty, bountyMenuItems, bountySummary, bountyStatusLine, bountyBoardLine, fugitiveSpawnPoint, fugitiveTaunt, BOUNTY_RIVAL_NAME } from './bounty.js';
import { makeGraffitiState, graffitiFromSave, buildGraffitiWalls, updateGraffitiWalls, graffitiNear, startSpray, sprayCoat, cancelSpray, updateGraffiti, graffitiMenuItems, graffitiSummary, graffitiStatusLine, graffitiRumor, sprayMeter, nearestSpraySpot, graffitiTitle, graffitiWallsLeft } from './graffiti.js';

// The story is forty jobs long; the taxi company opens once it is done.
const STORY_LEN = 40;

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

// The v4 systems: property, the radio, rival chases and city events all
// restore from the save and persist with it, the same way.
const propertyState = propertyFromSave(save && save.property);
const radioState = radioFromSave(save && save.radio);
const rivalState = rivalFromSave(save && save.rivals);
const eventState = eventFromSave(save && save.events);

// The v5 systems: Mara's crew and the casino, restored and persisted
// the same way as every system before them.
const crewState = crewFromSave(save && save.crew);
const casinoState = casinoFromSave(save && save.casino);

// The v5b systems: Club Neon and the taxi rank's fast travel, restored
// and persisted the same way as every system before them.
const nightclubState = nightclubFromSave(save && save.nightclub);
const fastTravelState = fastTravelFromSave(save && save.fasttravel);

// The v5c systems: the rare-car collection and Leo's jobs board,
// restored and persisted the same way as every system before them.
const collectorsState = collectorsFromSave(save && save.collectors);
const jobsState = jobsFromSave(save && save.jobs);
const packagesState = packagesFromSave(save && save.packages);
refreshJobsBoard(jobsState);

// The v5d system: the PD's wanted board, run out of Leo's garage —
// ten fugitives, a rival hunter on the same board, and a clock.
const bountyState = bountyFromSave(save && save.bounty);
refreshBountyBoard(bountyState);

// The v5e system: Solmar's street art — twelve spray walls around
// the city, a three-coat mini-game at each one, and a rep that ends
// in a gold spray-can paint for the Comet GT.
const graffitiState = graffitiFromSave(save && save.graffiti);

const wanted = makeWanted();
const missions = makeMissionState();
const stats = save && save.stats
  ? { ...save.stats }
  : { fares: 0, stolen: 0, bestWanted: 0, barrels: 0, tokens: 0, shots: 0, racesWon: 0, taxiEarned: 0, garageSpent: 0, rivalsEscaped: 0, rivalsWrecked: 0, boatTrips: 0, eventsSeen: 0 };
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

// The Club Neon sign: a neon board over the downtown door, dim until
// Mara owns the place and burning bright once she does.
const clubSign = buildClubSign(scene);

// The showroom sign over the garage door: one gold bulb per rare, lit
// as the collection grows — and the six rares themselves, parked around
// the city where their owners left them, waiting to be stolen.
const showroomSign = buildShowroomSign(scene);
updateShowroomSign(showroomSign, collectorsState);

// The wanted board on the garage wall, beside the showroom sign: its
// red seals light up with the names on the bounty board.
const bountyBoard = buildBountyBoard(scene);
updateBountyBoard(bountyBoard, bountyState);

// The fugitives are posted where the city can read them: a notice
// board on the campus quad and a billboard on the resort road.
buildEastBountyBoard(scene);
buildBountyBillboard(scene);
// The campus and resort murals: blank walls with gold frames and a
// spray can at the foot, waiting for the first coat.
buildEastMural(scene);
buildResortMural(scene);
// The stadium and airport murals: the loudest wall in Solmar and the
// last wall most players find, both waiting for paint.
buildStadiumMural(scene);
buildAirportMural(scene);
// The mall and beach murals: the busiest wall in town and the one
// with the best sunset view, both waiting for paint.
buildMallMural(scene);
buildBeachMural(scene);

// The twelve spray walls: pale brick panels with three paint stripes
// each, standing where the hints say they are — the city fills up
// with Mara's work as the pieces dry.
const graffitiWalls = buildGraffitiWalls(scene, graffitiState);

const traffic = [];
const police = [];
const peds = [];
const enemies = [];
const tracers = [];
const roadblocks = []; // PD roadblocks at high wanted levels
const barrels = []; // explosive barrels at the warehouse and the harbor
const tokens = []; // sunset tokens: glowing caches hidden around the city
const boats = []; // boats on the bay: moored at the pier and the marina
const rivalBoats = []; // Rocco's patrol boats, only during mission 10
let playerBoat = null; // the boat Mara is driving, or null when on land
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
let crewKey = ''; // which mission stage's crew is currently spawned (missions 6/8/9/11)
let lastWantedLevel = 0; // for the dispatch chatter when the heat rises
let lastRaceCount = 0; // last whole second of the race countdown, for beeps
let buoyMeshes = []; // mission 10: the two buoys marking the boat run
let bus = null; // the city bus on its loop: plaza, marina, campus, airport

const game = {
  scene, camera, player, traffic, police, enemies, peds, wanted, missions,
  city, colliders, roadblocks, barrels, heli, garage, raceState, taxiCompany,
  boats, rivalBoats, propertyState, radioState, rivalState, eventState,
  crewState, casinoState, nightclubState, fastTravelState,
  collectorsState, jobsState, graffitiState,
  state: 'menu',
  shotMode: false,
  cameraMode: 'follow',
  playerCar: null,
  playerBoat: null,
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
// The six rares, parked where their owners left them — the showroom
// hunt starts the moment Mara steals the first one.
spawnRareCars(scene, traffic, collectorsState);
const packageMeshes = spawnPackages(scene, packagesState);
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
// Campus students on the quad, and casino dealers by the resort door.
for (const [px, pz] of CAMPUS_STUDENTS) {
  peds.push(spawnPedestrianAt(scene, px, pz, 'student'));
}
for (const [px, pz] of [[-124, 220], [-132, 228]]) {
  peds.push(spawnPedestrianAt(scene, px, pz, 'dealer'));
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
// Two vendors hold the jobs board at the garage.
for (const client of spawnJobClients(scene)) peds.push(client);
// Two spotters watch the rare cars: one on the plaza, one at the marina.
for (const spotter of spawnRareSpotters(scene)) peds.push(spotter);
// East Solmar folk: students on the university quad, shoppers outside
// the mall doors. The campus heist and the stadium finale happen here.
for (const [px, pz] of [[312, 128], [328, 132], [306, 148], [334, 152], [320, 122], [316, 158]]) {
  peds.push(spawnPedestrianAt(scene, px, pz, 'student'));
}
for (const [px, pz] of [[312, 48], [328, 48], [308, 56], [332, 56]]) {
  peds.push(spawnPedestrianAt(scene, px, pz, 'shopper'));
}
// Boats on the bay: two moored at the dockside pier, one by the marina,
// and the Solmar Yacht moored off the resort — the fastest hull in the
// bay. Mara boards one with E, the same way she steals a car.
boats.push(spawnBoat(scene, -340, -196, 'speedboat'));
boats.push(spawnBoat(scene, -336, -226, 'fishing'));
boats.push(spawnBoat(scene, -352, -160, 'speedboat'));
boats.push(spawnBoat(scene, -300, -150, 'yacht'));
boats.push(spawnPatrolBoat(scene, -320, -190));
// The city bus runs its loop: plaza, marina, campus, airport.
bus = spawnBus(scene);
traffic.push(bus);
// A sports coupe in the mall lot and a pickup by the freight yard —
// both stealable, both worth the heat.
traffic.push(spawnCoupe(scene, 283, 78));
traffic.push(spawnPickup(scene, 210, -140, Math.PI / 2));
// The Mural Row supply van: gold, full of paint and ladders, parked
// by the mural row so the taggers never run dry.
traffic.push(spawnSprayVan(scene, -100, -60));
// A yellow cab at the plaza kerb, waiting to be stolen.
traffic.push(spawnTaxi(scene, 20, 20));
// Property signs: gold panels at the three buyable doors.
const propertySigns = buildPropertySigns(scene);
// The casino's gold sign by the resort door, so the tables read from
// the street the way the property signs do.
buildCasinoSign(scene);
// Sunset tokens: twelve glowing caches hidden around Solmar. The six
// originals pay $100 each; the five East Solmar caches pay $150; and
// one gold cache sits out in the bay, worth $250 to a swimmer or a
// boater. Taken tokens stay taken: the save remembers their indices.
const TOKEN_SPOTS = [
  [0, 24], [-238, 200], [70, -48], [-252, 40], [210, -190], [-70, 160],
  [340, -40], [330, 140], [345, 90], [315, 210], [290, -140], [-340, -100],
];
const takenTokens = new Set(save && Array.isArray(save.tokensTaken) ? save.tokensTaken : []);
for (let ti = 0; ti < TOKEN_SPOTS.length; ti++) {
  const [tx, tz] = TOKEN_SPOTS[ti];
  const value = ti === 11 ? 250 : ti >= 6 ? 150 : 100;
  const tokenMesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.9),
    new THREE.MeshStandardMaterial({
      color: ti === 11 ? 0xffb830 : 0xffd23e,
      emissive: ti === 11 ? 0xcc8800 : 0xaa7711,
      emissiveIntensity: 1.2,
      metalness: 0.8, roughness: 0.25,
    }),
  );
  tokenMesh.position.set(tx, 1.2, tz);
  tokenMesh.castShadow = true;
  if (!takenTokens.has(ti)) scene.add(tokenMesh);
  tokens.push({ mesh: tokenMesh, x: tx, z: tz, taken: takenTokens.has(ti), value });
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
  setRadioStation(radioState.station);
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
    property: propertyState,
    radio: { station: radioState.station, switches: radioState.switches },
    rivals: { escaped: rivalState.escaped, wrecked: rivalState.wrecked, total: rivalState.total },
    events: { stats: eventState.stats, total: eventState.total },
    crew: crewState,
    casino: { won: casinoState.won, lost: casinoState.lost, biggest: casinoState.biggest, hands: casinoState.hands, spins: casinoState.spins },
    nightclub: nightclubState,
    fasttravel: fastTravelState,
    collectors: collectorsState,
    jobs: jobsState,
    packages: packagesState,
    bounty: bountyState,
    graffiti: graffitiState,
    tokensTaken: tokens.map((t, i) => (t.taken ? i : -1)).filter((i) => i >= 0),
    muted: isMuted(),
  });
}

function pauseGame() {
  if (game.state !== 'playing') return;
  game.state = 'paused';
  showPause(
    () => { hideOverlay(); game.state = 'playing'; },
    () => { clearSave(); window.location.reload(); },
    { ...stats, crewHired: crewState.hired.length, casinoGames: casinoState.hands + casinoState.spins, jobsDone: jobsState.done, rareCars: collectorsState.collected.length, packagesFound: packagesState.found.length, bountyCaught: bountyState.caught, bountyRank: bountyBoardLine(bountyState), graffitiPieces: graffitiState.done.length, graffitiTitle: graffitiTitle(graffitiState), arcName: missionArc(missions.index).name, arcPayout: arcPayout(missions.index), streak: graffitiState.perfectStreak },
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
  // A bust ends the rival chase, the boat trip and the race: the city resets.
  if (rivalState.active) {
    despawnRivals(scene, rivalState.rivals);
    rivalState.rivals = [];
    rivalState.active = false;
    rivalState.escapeTimer = 0;
  }
  for (const rb of rivalBoats) scene.remove(rb.mesh);
  rivalBoats.length = 0;
  if (playerBoat) {
    playerBoat = null;
    game.playerBoat = null;
    player.inBoat = null;
    stopBoat();
  }
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
  } else if (car.rareId) {
    toast('RARE FIND', car.name + ' — Leo will pay for this one. Drive it to the garage.');
    addHeat(wanted, RARE_CAR_HEAT, 'grand-theft-rare');
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

// --- boats ---------------------------------------------------------------------
// Boarding a boat works like stealing a car, but on the water: E near a
// moored boat at the pier or the marina, and Mara is at the helm. The
// boat leaves the boats list while she drives it, and rejoins it when
// she steps off — onto the pier, or into the shallows if she is careless.
function enterBoat(boat) {
  const idx = boats.indexOf(boat);
  if (idx !== -1) boats.splice(idx, 1);
  playerBoat = boat;
  game.playerBoat = boat;
  player.inBoat = boat;
  player.mesh.visible = false;
  player.x = boat.x;
  player.z = boat.z;
  sfx.door();
  startBoat();
  toast('BOAT TAKEN', boat.name + ' — the bay is yours. Mind the patrol boats.');
  stats.boatTrips = (stats.boatTrips || 0) + 1;
  const res = addHeat(wanted, 15, 'stole a boat');
  if (res.rose) sfx.wanted();
  game.cameraMode = 'chase';
}

function exitBoat() {
  if (!playerBoat) return;
  const boat = playerBoat;
  playerBoat = null;
  game.playerBoat = null;
  player.inBoat = null;
  // Step off onto the nearest dry-ish spot: the pier side if close to
  // it, otherwise the beach. Mara wades the last few metres.
  player.x = boat.x + 4;
  player.z = boat.z;
  if (player.x > -282) player.x = -282;
  player.heading = boat.heading;
  player.mesh.visible = true;
  player.mesh.position.set(player.x, 0, player.z);
  boat.speed = 0;
  boats.push(boat);
  stopBoat();
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

// A generic stage crew for the epilogue missions: the stage definition
// carries its own place, count and variant, so a new mission never
// needs a hardcoded spawn function — the crew rings the stage place
// in the open, where Mara can see them coming.
function spawnGenericCrew(place, count, variant) {
  if (enemies.some((e) => e.alive)) return;
  if (!place) return;
  const n = count || 4;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 8 + (i % 2) * 4;
    enemies.push(makeEnemy(scene, place.x + Math.cos(a) * r, place.z + Math.sin(a) * r, variant || 'crew'));
  }
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

// Mission 9: Rocco's crew on the university quad — five rivals in
// orange, spread across the lawn so Mara has to work the angles.
function spawnCampusRivals() {
  if (enemies.some((e) => e.alive)) return;
  const spots = [
    [PLACES.campus.x - 18, PLACES.campus.z - 12],
    [PLACES.campus.x - 6, PLACES.campus.z + 10],
    [PLACES.campus.x + 8, PLACES.campus.z - 8],
    [PLACES.campus.x + 16, PLACES.campus.z + 12],
    [PLACES.campus.x, PLACES.campus.z + 18],
  ];
  for (const [ex, ez] of spots) enemies.push(makeEnemy(scene, ex, ez, 'rival'));
  toast('ROCCO\u2019S CREW', rivalTaunt());
}

// Mission 11: the stadium finale — five rivals on the field and Rocco
// himself in the centre circle, the toughest fight in Solmar.
function spawnStadiumCrew() {
  if (enemies.some((e) => e.alive)) return;
  const spots = [
    [PLACES.stadium.x - 24, PLACES.stadium.z - 12],
    [PLACES.stadium.x - 10, PLACES.stadium.z + 10],
    [PLACES.stadium.x + 12, PLACES.stadium.z - 10],
    [PLACES.stadium.x + 24, PLACES.stadium.z + 12],
    [PLACES.stadium.x - 2, PLACES.stadium.z - 16],
  ];
  for (const [ex, ez] of spots) enemies.push(makeEnemy(scene, ex, ez, 'rival'));
  const rocco = makeEnemy(scene, PLACES.stadium.x, PLACES.stadium.z, 'boss');
  enemies.push(rocco);
  toast('ROCCO', 'The boss of the east side — and he brought the whole crew.');
}

// Mission 12: Venn's old office guards — four of his men holding the
// second ledger above Solmar Tower, spread across the office floor.
function spawnOfficeGuards() {
  if (enemies.some((e) => e.alive)) return;
  const spots = [
    [PLACES.office.x - 8, PLACES.office.z - 6],
    [PLACES.office.x + 6, PLACES.office.z - 8],
    [PLACES.office.x - 4, PLACES.office.z + 8],
    [PLACES.office.x + 10, PLACES.office.z + 6],
  ];
  for (const [ex, ez] of spots) enemies.push(makeEnemy(scene, ex, ez, 'rival'));
  toast('VENN\u2019S OFFICE', 'His guards are still on the payroll.');
}

// Mission 13: Rocco's vault guards on the casino floor — five men
// between Mara and the last of the crew's money.
function spawnCasinoGuards() {
  if (enemies.some((e) => e.alive)) return;
  const spots = [
    [PLACES.casino.x - 10, PLACES.casino.z - 8],
    [PLACES.casino.x + 8, PLACES.casino.z - 10],
    [PLACES.casino.x - 6, PLACES.casino.z + 8],
    [PLACES.casino.x + 10, PLACES.casino.z + 6],
    [PLACES.casino.x, PLACES.casino.z + 12],
  ];
  for (const [ex, ez] of spots) enemies.push(makeEnemy(scene, ex, ez, 'rival'));
  toast('CASINO VAULT', 'Rocco\u2019s men are guarding the money like it is theirs.');
}

// Mission 14: Venn's heir and his crew in the stadium bowl — five
// rivals around the pitch and the heir himself in the middle, who
// fights with Venn's health bar and a boss cash drop.
function spawnSunsetCrew() {
  if (enemies.some((e) => e.alive)) return;
  const spots = [
    [PLACES.stadium.x - 14, PLACES.stadium.z - 10],
    [PLACES.stadium.x + 12, PLACES.stadium.z - 12],
    [PLACES.stadium.x - 10, PLACES.stadium.z + 12],
    [PLACES.stadium.x + 14, PLACES.stadium.z + 10],
    [PLACES.stadium.x, PLACES.stadium.z - 18],
  ];
  for (const [ex, ez] of spots) enemies.push(makeEnemy(scene, ex, ez, 'rival'));
  enemies.push(makeEnemy(scene, PLACES.stadium.x, PLACES.stadium.z, 'venn'));
  toast('THE LAST SUNSET', 'Venn\u2019s heir is in the middle of the bowl — take him down.');
}

// Mission 15: Venn's old boys holding the Club Neon floor — five
// enforcers in the dark room, and the bouncer at the door, the
// biggest man in the club, who fights like a boss.
function spawnClubCrew() {
  if (enemies.some((e) => e.alive)) return;
  const spots = [
    [PLACES.nightclub.x - 10, PLACES.nightclub.z - 8],
    [PLACES.nightclub.x + 8, PLACES.nightclub.z - 10],
    [PLACES.nightclub.x - 6, PLACES.nightclub.z + 8],
    [PLACES.nightclub.x + 10, PLACES.nightclub.z + 6],
    [PLACES.nightclub.x, PLACES.nightclub.z + 12],
  ];
  for (const [ex, ez] of spots) enemies.push(makeEnemy(scene, ex, ez, 'enforcer'));
  enemies.push(makeEnemy(scene, PLACES.nightclub.x, PLACES.nightclub.z, 'bouncer'));
  toast('CLUB NEON', 'Venn\u2019s old boys hold the floor — and the bouncer is the biggest man in the room.');
}

// Mission 16: Venn's guards in the cannery office at North Harbor —
// five men between Mara and the last of his money.
function spawnHarborJobCrew() {
  if (enemies.some((e) => e.alive)) return;
  const spots = [
    [PLACES.harbor.x - 16, PLACES.harbor.z + 10],
    [PLACES.harbor.x - 4, PLACES.harbor.z + 14],
    [PLACES.harbor.x + 10, PLACES.harbor.z + 8],
    [PLACES.harbor.x + 16, PLACES.harbor.z + 16],
    [PLACES.harbor.x, PLACES.harbor.z - 12],
  ];
  for (const [ex, ez] of spots) enemies.push(makeEnemy(scene, ex, ez, 'guard'));
  toast('THE HARBOR JOB', 'Five guards between you and the last of Venn\u2019s money.');
}

// Mission 17: Rocco's last crew at the safehouse — six of them in
// the yard, the big one in the middle, all of them looking for the
// ledgers. The siege breaks when the last one falls.
function spawnSafehouseCrew() {
  if (enemies.some((e) => e.alive)) return;
  const spots = [
    [PLACES.safehouse.x - 12, PLACES.safehouse.z - 6],
    [PLACES.safehouse.x + 10, PLACES.safehouse.z - 8],
    [PLACES.safehouse.x - 8, PLACES.safehouse.z + 10],
    [PLACES.safehouse.x + 12, PLACES.safehouse.z + 8],
    [PLACES.safehouse.x, PLACES.safehouse.z - 14],
  ];
  for (const [ex, ez] of spots) enemies.push(makeEnemy(scene, ex, ez, 'rival'));
  enemies.push(makeEnemy(scene, PLACES.safehouse.x, PLACES.safehouse.z, 'enforcer'));
  toast('SAFEHOUSE SIEGE', 'Six of Rocco\\u2019s last crew in the yard — hold the door.');
}

// Mission 18: the last of Venn's guards on the marina pier — four men
// between Mara and the final bag, waiting to see the boat off.
function spawnFinalCrew() {
  if (enemies.some((e) => e.alive)) return;
  const spots = [
    [PLACES.marina.x - 10, PLACES.marina.z + 6],
    [PLACES.marina.x + 8, PLACES.marina.z + 4],
    [PLACES.marina.x - 4, PLACES.marina.z - 8],
    [PLACES.marina.x + 12, PLACES.marina.z - 6],
  ];
  for (const [ex, ez] of spots) enemies.push(makeEnemy(scene, ex, ez, 'guard'));
  toast('SUNSET STREETS', 'Four guards on the pier — the final bag is behind them.');
}

// Mission 10: the buoys that mark the boat run — the lighthouse buoy
// in the north and the harbor-mouth buoy in the south.
function spawnBuoys() {
  if (buoyMeshes.length > 0) return;
  buoyMeshes.push(makeBuoy(scene, PLACES.buoy.x, PLACES.buoy.z));
  buoyMeshes.push(makeBuoy(scene, PLACES.buoySouth.x, PLACES.buoySouth.z));
}

// Mission 10: Rocco's patrol boats, launched when Mara takes the boat
// run. Two patrol boats that hunt her across the bay until she finishes
// the run or loses them.
function spawnRivalBoats() {
  if (rivalBoats.length > 0) return;
  for (const [bx, bz] of [[-360, -160], [-340, -260]]) {
    const boat = makeBoat(scene, 'patrol', bx, bz, 0);
    boat.rival = true;
    rivalBoats.push(boat);
  }
  toast('PATROL BOATS', 'Rocco\u2019s boats are coming — outrun them or out-turn them.');
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
        if (id === 'engine' || id === 'armour' || id === 'nitro') {
          const res = buyUpgrade(garage, id, player.money);
          if (!res.ok) { sfx.denied(); return; }
          player.money -= res.cost;
          stats.garageSpent = (stats.garageSpent || 0) + res.cost;
          setCash(player.money);
          applyGarageUpgrades(personalRide, garage);
          sfx.upgrade();
          toast('UPGRADE FITTED', id === 'engine' ? 'The Comet pulls harder now.' : id === 'nitro' ? 'Nitro fitted — the Comet is +8 faster, always.' : 'The Comet shrugs off hits now.');
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

// --- property ----------------------------------------------------------------------
// Open the property panel: the game pauses while Mara shops for a place
// of her own, and the panel re-renders after every purchase. Buying
// applies at once — the sign outside turns green, and the place starts
// healing her on visits and paying rent.
function openProperty() {
  game.state = 'paused';
  const render = () => {
    showProperty(
      propertyMenuItems(propertyState, player.money),
      player.money,
      propertySummary(propertyState),
      (id) => {
        const res = buyProperty(propertyState, id, player.money);
        if (!res.ok) { sfx.denied(); return; }
        player.money -= res.cost;
        setCash(player.money);
        updatePropertySigns(propertySigns, propertyState);
        sfx.upgrade();
        toast('PROPERTY BOUGHT', propertySummary(propertyState));
        render();
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

// --- crew ----------------------------------------------------------------------
// Open the crew panel: the game pauses while Mara hires a hand at the
// safehouse, and the panel re-renders after every hire. A hired hand
// applies at once — Dee's speed, Nix's cool-down, Sable's eyes.
function openCrew() {
  game.state = 'paused';
  const render = () => {
    showCrew(
      crewMenuItems(crewState, player.money),
      player.money,
      crewSummary(crewState),
      (id) => {
        // A 'train-dee' row trains the hand; any other row hires them.
        if (id.startsWith('train-')) {
          const res = trainCrew(crewState, id.slice(6), player.money);
          if (!res.ok) { sfx.denied(); toast('CAN\u2019T TRAIN', res.reason); return; }
          player.money -= res.cost;
          setCash(player.money);
          sfx.upgrade();
          toast('TRAINED', res.member.name + ' is now Lv ' + res.level + ' — stronger perk.');
          setCrewLine(crewStatusLine(crewState));
          render();
          return;
        }
        const res = hireCrew(crewState, id, player.money);
        if (!res.ok) { sfx.denied(); toast('CAN\u2019T HIRE', res.reason); return; }
        player.money -= res.cost;
        setCash(player.money);
        sfx.hire();
        toast('CREW', crewHiredLine(res.member));
        render();
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

// --- casino ----------------------------------------------------------------------
// Open the casino panel: the game pauses while Mara plays the tables
// at the resort. Each button is one game at one stake; the panel
// re-renders after every game with the result on it.
function openCasino() {
  game.state = 'paused';
  const render = () => {
    showCasino(
      casinoMenuItems(casinoState, player.money),
      player.money,
      casinoSummary(casinoState),
      casinoState.lastResult,
      (id) => {
        const game2 = casinoBetFor(id);
        if (!game2.bet || player.money < game2.bet) { sfx.denied(); return; }
        player.money -= game2.bet;
        sfx.chip();
        let played;
        if (game2.kind === 'slots') {
          played = playSlots(casinoState, game2.bet);
          if (played.win >= game2.bet * 10) sfx.jackpot();
          else if (played.win > 0) sfx.cash(); else sfx.denied();
        } else if (game2.kind === 'blackjack') {
          played = playBlackjack(casinoState, game2.bet);
          if (played.win > 0) sfx.cash(); else sfx.denied();
        } else if (game2.kind === 'roulette-red') {
          played = playRoulette(casinoState, game2.bet, 'red');
          if (played.win > 0) sfx.cash(); else sfx.denied();
        } else if (game2.kind === 'roulette-black') {
          played = playRoulette(casinoState, game2.bet, 'black');
          if (played.win > 0) sfx.cash(); else sfx.denied();
        } else {
          played = playRoulette(casinoState, game2.bet, 'seven');
          if (played.win >= game2.bet * 10) sfx.jackpot();
          else if (played.win > 0) sfx.cash(); else sfx.denied();
        }
        player.money += played.win;
        setCash(player.money);
        render();
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

// --- nightclub -------------------------------------------------------------------
// Open the club panel: the game pauses while Mara runs Club Neon.
// Buying the club, hiring bouncers and collecting the till all happen
// here; the DJ set leaves the panel and plays live, on the beat, in
// the world — sixteen beats at 132 BPM, Space on the pulse.
function openNightclub() {
  game.state = 'paused';
  const render = () => {
    showNightclub(
      nightclubMenuItems(nightclubState, player.money),
      player.money,
      nightclubSummary(nightclubState),
      (id) => {
        if (id === 'buy-club') {
          const res = buyClub(nightclubState, player.money);
          if (!res.ok) { sfx.denied(); toast('CAN\u2019T BUY', res.reason); return; }
          player.money -= res.cost;
          setCash(player.money);
          sfx.upgrade();
          toast('CLUB NEON', 'The club is yours — the door, the booth and the till.');
          updateClubSign(clubSign, nightclubState);
          render();
          return;
        }
        if (id === 'hire-bouncer') {
          const res = hireBouncer(nightclubState, player.money);
          if (!res.ok) { sfx.denied(); toast('CAN\u2019T HIRE', res.reason); return; }
          player.money -= res.cost;
          setCash(player.money);
          sfx.hire();
          toast('CLUB NEON', 'A bouncer for the door — ' + res.bouncers + '/2 on the door.');
          render();
          return;
        }
        if (id.startsWith('upgrade-')) {
          const res = buyClubUpgrade(nightclubState, player.money, id.slice(8));
          if (!res.ok) { sfx.denied(); toast('CAN\u2019T BUY', res.reason); return; }
          player.money -= res.cost;
          setCash(player.money);
          sfx.upgrade();
          toast('CLUB NEON', res.name + ' installed — the club just got better.');
          updateClubSign(clubSign, nightclubState);
          render();
          return;
        }
        if (id === 'dj-set') {
          const res = djStartSet(nightclubState);
          if (!res.ok) { sfx.denied(); toast('CAN\u2019T PLAY', res.reason); return; }
          hideOverlay();
          game.state = 'playing';
          toast('DJ SET', 'Sixteen beats — press SPACE on the pulse!');
          return;
        }
        if (id === 'collect') {
          const take = collectClubIncome(nightclubState, game.time);
          if (take <= 0) { sfx.denied(); toast('TILL EMPTY', 'The till fills once a night — come back tomorrow.'); return; }
          player.money += take;
          setCash(player.money);
          sfx.cash();
          toast('CLUB NEON', 'The till paid $' + take.toLocaleString() + '.');
          render();
          return;
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

// --- fast travel -------------------------------------------------------------------
// Open the taxi rank panel: every stop in Solmar, its fare, and whether
// Mara can afford it. The ride itself is instant — a cab drops her at
// the door — but the rank refuses while the PD is hard on her tail,
// while a timed job runs, or while she is carrying a fare.
function openFastTravel() {
  const block = fastTravelBlockReason({
    inCar: !!playerCar,
    inBoat: !!playerBoat,
    wantedLevel: wanted.level,
    timedStage: missions.stageTimer != null,
    hasFare: !!missions.fare,
  });
  if (block) { toast('TAXI RANK', block); sfx.denied(); return; }
  game.state = 'paused';
  const render = () => {
    showFastTravel(
      fastTravelMenuItems(fastTravelState, player.money, player.x, player.z, nightclubState.rep),
      player.money,
      fastTravelSummary(fastTravelState, nightclubState.rep),
      (key) => {
        const res = takeFastTravel(fastTravelState, key, player.money, nightclubState.rep);
        if (!res.ok) { sfx.denied(); toast('CAN\u2019T RIDE', res.reason); return; }
        player.money -= res.cost;
        setCash(player.money);
        const place = PLACES[res.stop.key];
        player.x = place.x;
        player.z = place.z + 6;
        clampPlayerToCity(player);
        player.heading = 0;
        player.mesh.position.set(player.x, 0, player.z);
        player.mesh.rotation.y = 0;
        hideOverlay();
        game.state = 'playing';
        toast('TAXI RANK', fastTravelArrivedLine(res.stop, res.cost));
        sfx.cash();
        persist();
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

// --- the wanted board ---------------------------------------------------------------
// Open the bounty board at the garage: the ten fugitives, their price
// and hideout, and the hunt already running. Taking a name spawns the
// fugitive at their hideout and starts Vex's clock.
function openBounty() {
  game.state = 'paused';
  const render = () => {
    showBounty(
      bountyMenuItems(bountyState),
      player.money,
      bountySummary(bountyState),
      (id) => {
        if (!id.startsWith('bounty-')) return;
        const res = acceptBounty(bountyState, Number(id.slice(7)));
        if (!res.ok) { sfx.denied(); toast('CAN\u2019T TAKE IT', res.reason); return; }
        const spot = fugitiveSpawnPoint(res.fugitive);
        const foe = makeEnemy(scene, spot.x, spot.z, res.fugitive.variant);
        foe.bountyId = res.fugitive.id;
        foe.maxHealth = foe.health;
        enemies.push(foe);
        bountyState.active.spawned = true;
        addHeat(wanted, 2, 'bounty');
        hideOverlay();
        game.state = 'playing';
        toast('BOUNTY TAKEN', res.fugitive.name + ' (' + res.fugitive.alias + ') — $' + res.fugitive.bounty.toLocaleString() + ' at ' + (res.fugitive.hideout) + '. ' + BOUNTY_RIVAL_NAME + ' has four minutes. ' + fugitiveTaunt(res.fugitive));
        sfx.bounty();
        persist();
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

// --- Leo's jobs board ---------------------------------------------------------------
// Open the jobs board at the garage: three fresh jobs pinned to Leo's
// door, the active one on top, and the streak that makes the next one
// pay more. Taking a job pins a fresh one in its place.
function openJobs() {
  game.state = 'paused';
  const render = () => {
    showJobs(
      jobsMenuItems(jobsState),
      player.money,
      jobsSummary(jobsState),
      (id) => {
        if (!id.startsWith('job-')) return;
        const res = acceptJob(jobsState, Number(id.slice(4)));
        if (res.ok) sfx.job();
        if (!res.ok) { sfx.denied(); toast('CAN\u2019T TAKE IT', res.reason); return; }
        hideOverlay();
        game.state = 'playing';
        const leg = res.job.legs[0];
        toast('JOB TAKEN', res.job.kind.toUpperCase() + ' — ' + leg.to.name + ' · $' + res.job.pay.toLocaleString() + ' on delivery.');
        sfx.click();
        persist();
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

// --- the showroom board ---------------------------------------------------------------
// Open the showroom board at the garage: all six rares, where they were
// last spotted, and which ones Leo already has the keys for.
function openCollectors() {
  game.state = 'paused';
  showCollectors(
    collectorsMenuItems(collectorsState),
    player.money,
    collectorsSummary(collectorsState),
    () => {
      hideOverlay();
      game.state = 'playing';
      persist();
    },
  );
}

// --- the packages board ---------------------------------------------------------------
// Open the packages list at the garage: every hidden crate, its hint,
// and which ones are already found.
function openPackages() {
  game.state = 'paused';
  showCollectors(
    packagesMenuItems(packagesState),
    player.money,
    packagesSummary(packagesState),
    () => {
      hideOverlay();
      game.state = 'playing';
      persist();
    },
  );
}

// --- the street-art gallery ---------------------------------------------------------------
// Open the graffiti gallery at the garage: all twelve walls, their
// hints, and which ones are already dry — the hunt never needs a
// guide, just a walk around the city and a can of paint.
function openGraffiti() {
  game.state = 'paused';
  showGraffiti(
    graffitiMenuItems(graffitiState),
    player.money,
    graffitiSummary(graffitiState),
    () => {
      hideOverlay();
      game.state = 'playing';
      persist();
    },
  );
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
  // Club Neon at reputation 5 puts Mara on the VIP list on its own.
  if (rollVipFare(taxiCompany, Math.random, nightclubState.rep)) {
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
  // One tap, one panel: the garage trio shares a single key check, and
  // each key keeps its own spot — J needs the board, G and K the garage.
  const garageKey = anyPressed(['KeyG', 'KeyJ', 'KeyK', 'KeyL', 'KeyU']);
  if (garageKey && !playerCar) {
    if (garageKey === 'KeyG' && garageNear(player.x, player.z)) { openGarage(); return; }
    if (garageKey === 'KeyJ' && jobsNear(player.x, player.z)) { openJobs(); return; }
    if (garageKey === 'KeyK' && garageNear(player.x, player.z)) { openCollectors(); return; }
    if (garageKey === 'KeyL' && garageNear(player.x, player.z)) { openPackages(); return; }
    if (garageKey === 'KeyU' && bountyNear(player.x, player.z)) { openBounty(); return; }
  }
  // Street art: on foot near a blank wall, press I to spray — the
  // needle sweeps and E lays each coat, three coats finish the wall.
  // At the garage, press I to open the gallery instead. While a
  // spray is running, E belongs to the can, not to the nearest car.
  if (consumePressed('KeyI') && !playerCar && !playerBoat) {
    if (graffitiState.active) {
      cancelSpray(graffitiState);
      toast('SPRAY PAUSED', 'The coats stay on the wall — walk back and finish it later.');
      sfx.click();
    } else {
      const spot = graffitiNear(graffitiState, player.x, player.z);
      if (spot) {
        const res = startSpray(graffitiState, spot);
        if (res.ok) {
          toast('SPRAYING — ' + spot.name.toUpperCase(), 'The needle sweeps — press E to lay a coat near the middle. Three coats finish the wall.');
          sfx.spray();
        } else {
          toast('WALL DONE', res.reason);
          sfx.denied();
        }
      } else if (garageNear(player.x, player.z)) {
        openGraffiti();
        return;
      }
    }
  }
  if (graffitiState.active && consumePressed('KeyE')) {
    const coat = sprayCoat(graffitiState);
    if (coat && coat.type === 'coat') {
      sfx.spray();
      if (coat.perfect) { sfx.perfect(); toast('PERFECT COAT', 'Clean line — ' + coat.coats + '/3 coats on the wall.'); }
    } else if (coat && coat.type === 'missed') {
      sfx.denied();
      toast('THE CAN SPUTTERS', 'Too far off the middle — the coat did not land. Steady now.');
    } else if (coat && coat.type === 'done') {
      // Ink on the crew tags the walls for Mara: every finished piece
      // pays $250 more with him holding the ladder.
      const inkBonus = crewGraffitiBonus(crewState);
      player.money += coat.total + inkBonus;
      setCash(player.money);
      updateGraffitiWalls(graffitiWalls, graffitiState);
      // Vandalism in front of the PD is a crime: a cop close enough
      // to watch the paint dry adds a star to the board.
      if (nearestPoliceDistance(police, player.x, player.z) < 30) {
        addHeat(wanted, GRAFFITI_HEAT, 'graffiti');
        toast('WALL DONE — ' + coat.spot.name.toUpperCase(), 'Piece finished — +$' + (coat.total + inkBonus).toLocaleString() + '. The PD saw the paint dry: +1 heat.');
      } else {
        toast('WALL DONE — ' + coat.spot.name.toUpperCase(), 'Piece finished — +$' + (coat.total + inkBonus).toLocaleString() + (coat.setBonus > 0 ? ' · FULL SET! Gold spray paint unlocked.' : ' · ' + coat.title + ', rep ' + coat.rep + '.'));
      }
      sfx.mission();
      sfx.cash();
      if (coat.streakBonus > 0) sfx.streak();
      persist();
    }
  }
  // Photo mode: press O to hide the HUD and take a clean shot of the
  // city, press O again to bring it back. (P is already the pause key,
  // so photo mode takes the next free key.)
  if (consumePressed('KeyO')) {
    game.photoMode = !game.photoMode;
    document.getElementById('hud').style.display = game.photoMode ? 'none' : '';
    toast(game.photoMode ? 'PHOTO MODE' : 'HUD ON', game.photoMode ? 'Press O again to bring the HUD back.' : 'The HUD is back.');
    sfx.click();
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
  // The radio: N turns the dial. The station follows Mara everywhere —
  // on foot, in a car, or out on the bay.
  if (consumePressed('KeyN')) {
    const station = nextStation(radioState);
    setRadioStation(radioState.station);
    setRadio(radioStatusLine(radioState));
    toast('\u266A ' + station.name, radioJingle(radioState));
    // Every third switch, the dial carries an ad — Solmar's shops
    // pay for the airtime, and the ads are half the city's gossip.
    if (radioState.switches % 3 === 0) toast('\u266A SOLMAR RADIO', radioAd());
    // Every fifth switch, the dial carries a rumour from the walls —
    // the city always knows where the next blank wall is.
    if (radioState.switches % 5 === 0) toast('\u266A STREET FM', graffitiRumor(graffitiState));
    sfx.click();
  }
  // Property: B near a sign buys a place or visits one Mara owns.
  // A visit heals her to full and collects the rent when it is due.
  if (consumePressed('KeyB') && !playerCar && !playerBoat) {
    const prop = propertyNear(player.x, player.z, propertyState);
    if (prop) {
      if (propertyState.owned.includes(prop.id)) {
        player.health = player.maxHealth;
        setHealth(player.health, player.maxHealth);
        const rent = collectRent(propertyState, game.time);
        if (rent > 0) {
          player.money += rent;
          setCash(player.money);
          toast(prop.name, 'Home sweet home — healed, and $' + rent + ' rent collected.');
        } else {
          toast(prop.name, 'Home sweet home — fully healed.');
        }
        sfx.pickup();
      } else {
        openProperty();
        return;
      }
    }
  }
  // The crew: on foot at the safehouse, press V to hire a hand.
  if (consumePressed('KeyV') && !playerCar && !playerBoat && crewNear(player.x, player.z)) {
    openCrew();
    return;
  }
  // The casino: on foot at the resort door, press X to play the tables.
  if (consumePressed('KeyX') && !playerCar && !playerBoat && casinoNear(player.x, player.z)) {
    openCasino();
    return;
  }
  // Club Neon: on foot at the club door, press C to run the club.
  if (consumePressed('KeyC') && !playerCar && !playerBoat && nightclubNear(player.x, player.z)) {
    openNightclub();
    return;
  }
  // The taxi rank: on foot anywhere, press T to ride the rank.
  if (consumePressed('KeyT') && !playerCar && !playerBoat) {
    openFastTravel();
    return;
  }

  // --- mission stage bookkeeping: spawn what the stage needs ---
  const mission = currentMission(missions);
  if (mission && mission.id === 'hot-wheels' && missions.stage === 0) spawnMissionTwoCar();
  if (mission && mission.id === 'sunset-score' && missions.stage === 0) spawnWarehouseCrew();
  if (mission && mission.id === 'harbor-lights' && missions.stage === 1) spawnHarborCrew();
  if (mission && mission.id === 'the-last-collector' && missions.stage === 1) spawnChaseTruck();
  if (mission && mission.id === 'runway-run' && missions.stage === 1) spawnFuelTruck();
  if (mission && mission.id === 'the-last-flight' && missions.stage === 0) spawnVennLimo();
  // Mission 10: the buoys go out as soon as the boat run starts, and
  // Rocco's patrol boats launch with them. The patrol boats stand down
  // once Mara has the drop and is heading home.
  if (mission && mission.id === 'marina-run' && missions.stage >= 1) {
    spawnBuoys();
    if (missions.stage === 1 || missions.stage === 2) spawnRivalBoats();
  }
  if (mission && mission.id === 'marina-run' && missions.stage >= 3 && rivalBoats.length > 0) {
    for (const rb of rivalBoats) scene.remove(rb.mesh);
    rivalBoats.length = 0;
  }
  // Missions 6, 8, 9, 11, 12, 13, 14, 15, 16, 17 and 18 clear a crew:
  // spawn it once per stage and track whether it is down, so the stage
  // cannot complete before the player has even met the guards. The
  // office job clears at stage 2 (after the hack); the finale clears
  // at stage 2 too (after the boat run); the rest clear at stage 1.
  // The epilogue missions (19-36) clear through the same map, but
  // their crews spawn generically from the stage definition — place,
  // count and variant — so a new mission never needs a hardcoded
  // spawn function. Two missions clear twice (the comet's shadow and
  // every street), so their entries are lists, not single stages.
  const clearStage = { 'southern-comfort': 1, 'the-last-flight': 1, 'campus-heist': 1, 'stadium-finale': 1, 'venns-ledger': 2, 'the-long-con': 1, 'the-last-sunset': 1, 'night-shift': 1, 'harbor-job': 1, 'safehouse-siege': 1, 'sunset-streets': 2, 'the-lighthouse': 2, 'sunset-streets-2': 1, 'the-long-sunset': 1, 'solmar-forever': 1, 'the-bay-run': 1, 'epilogue-comet-gt': 1, 'the-gold-standard': 1, 'sunset-forever': 1, 'the-last-crew': 1, 'king-of-solmar': 1, 'the-long-way-home': 1, 'the-comets-shadow': [1, 3], 'every-street': [1, 3], 'solmar-forever-2': 2, 'quiet-harbor': [1, 3], 'neon-nights': [1, 3], 'long-road-home': [1, 4], 'solmar-after-dark': [2, 4], 'the-last-ledger': 2, 'harbor-lights-2': 2, 'the-showroom-job': 1, 'solmar-forever-2b': [2, 4] };
  let crewDown = false;
  const clearStages = clearStage[mission.id];
  const isClearStage = Array.isArray(clearStages) ? clearStages.includes(missions.stage) : missions.stage === clearStages;
  if (mission && clearStages !== undefined && isClearStage) {
    const key = mission.id + ':' + missions.stage;
    if (crewKey !== key) {
      crewKey = key;
      if (mission.id === 'southern-comfort') spawnResortCrew();
      else if (mission.id === 'the-last-flight') spawnTerminalGuards();
      else if (mission.id === 'campus-heist') spawnCampusRivals();
      else if (mission.id === 'venns-ledger') spawnOfficeGuards();
      else if (mission.id === 'the-long-con') spawnCasinoGuards();
      else if (mission.id === 'the-last-sunset') spawnSunsetCrew();
      else if (mission.id === 'night-shift') spawnClubCrew();
      else if (mission.id === 'harbor-job') spawnHarborJobCrew();
      else if (mission.id === 'safehouse-siege') spawnSafehouseCrew();
      else if (mission.id === 'sunset-streets') spawnFinalCrew();
      else if (mission.id === 'the-lighthouse' || mission.id === 'sunset-streets-2' || mission.id === 'the-long-sunset' || mission.id === 'solmar-forever' || mission.id === 'the-bay-run' || mission.id === 'epilogue-comet-gt' || mission.id === 'the-gold-standard' || mission.id === 'sunset-forever' || mission.id === 'the-last-crew' || mission.id === 'king-of-solmar' || mission.id === 'the-long-way-home' || mission.id === 'the-comets-shadow' || mission.id === 'every-street' || mission.id === 'solmar-forever-2' || mission.id === 'quiet-harbor' || mission.id === 'neon-nights' || mission.id === 'long-road-home' || mission.id === 'solmar-after-dark' || mission.id === 'the-last-ledger' || mission.id === 'harbor-lights-2' || mission.id === 'the-showroom-job' || mission.id === 'solmar-forever-2b') {
        const st = mission.stages[missions.stage];
        spawnGenericCrew(st.place, st.enemies, st.variant);
      }
      else spawnStadiumCrew();
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
  if (playerBoat) {
    // On the water: throttle with W/S, rudder with A/D. The boat drifts,
    // so the camera stays wide and the speedo reads in knots of fun.
    updatePlayerBoat(playerBoat, axes, dt, (impact) => {
      sfx.crash();
      if (impact > 12) damagePlayer(3);
    }, crewSpeedMult(crewState));
    speedKmh = Math.abs(playerBoat.speed) * 3.6;
    setBoat(Math.abs(playerBoat.speed) / playerBoat.maxSpeed);
    setHint('<b>E</b> — step off the boat &nbsp; <b>W/S</b> — throttle &nbsp; <b>A/D</b> — rudder');
    if (consumePressed('KeyE')) exitBoat();
    if (!game.shotMode) game.cameraMode = 'chase';
  } else if (playerCar) {
    updatePlayerCar(playerCar, axes, dt, isDown('Space'), colliders, (impact) => {
      sfx.crash();
      if (impact > 12) damagePlayer(3);
    }, crewSpeedMult(crewState));
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
    // The nearest unfound package, for the hint line — computed once
    // so the hint only fires when a crate is actually close.
    const nearPkg = nearestPackage(packagesState, player.x, player.z);
    // The nearest blank spray wall, for the same hint line.
    const nearWall = graffitiNear(graffitiState, player.x, player.z);
    // The nearest named place, so the player always knows where they are.
    const nearPlace = nearestPlace(player.x, player.z);
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
    } else if (nearPkg && nearPkg.distance < 40) {
      setHint('Gold crate nearby: ' + nearPkg.pkg.name + ' — ' + nearPkg.distance + 'm · ' + nearPkg.pkg.hint);
    } else if (nearWall) {
      setHint('<b>I</b> — spray the ' + nearWall.name + ' wall (' + (12 - graffitiWallsLeft(graffitiState)) + '/12 dry)');
    } else if (nearPlace && nearPlace.distance < 12) {
      setHint('Near the ' + nearPlace.place.name + ' — ' + nearPlace.distance + 'm');
    } else if (garageNear(player.x, player.z)) {
      setHint('<b>G</b> — Leo\u2019s garage · <b>J</b> — jobs board · <b>K</b> — showroom ' + collectorsState.collected.length + '/6 · <b>L</b> — packages ' + packagesState.found.length + '/10 · <b>U</b> — bounty board ' + bountyState.caught + ' caught');
    } else if (crewNear(player.x, player.z)) {
      setHint('<b>V</b> — hire a hand for Mara\u2019s crew' + (crewState.hired.length ? ' (' + crewState.hired.length + '/3 hired)' : ''));
    } else if (casinoNear(player.x, player.z)) {
      setHint('<b>X</b> — Solmar Casino: slots and blackjack');
    } else if (nightclubNear(player.x, player.z)) {
      setHint('<b>C</b> — Club Neon' + (nightclubState.owned ? ' — your club: DJ set, bouncers, till' : ' — buy the club, $40,000'));
    } else if (boatNear(player.x, player.z, boats, 5)) {
      const boat = boatNear(player.x, player.z, boats, 5);
      setHint('<b>E</b> — board the ' + boat.name);
      if (consumePressed('KeyE')) enterBoat(boat);
    } else if (propertyNear(player.x, player.z, propertyState)) {
      const prop = propertyNear(player.x, player.z, propertyState);
      setHint(propertyState.owned.includes(prop.id)
        ? '<b>B</b> — ' + prop.name + ' (yours — visit to heal and collect rent)'
        : '<b>B</b> — ' + prop.name + ' — $' + prop.price.toLocaleString());
    } else {
      setHint('<b>WASD</b> move &nbsp; <b>Shift</b> run &nbsp; <b>E</b> enter a car<br><b>2</b> pistol &nbsp; <b>F</b> punch &nbsp; <b>P</b> pause');
    }
    if (!game.shotMode) game.cameraMode = 'follow';
  }

  // Mara's position is her vehicle's position while she drives or sails:
  // missions, fares, tokens, the police and the minimap all read
  // player.x/z, so the sync has to happen every frame — not just when
  // she climbs in or out, or every goto stage and fare drop-off would
  // read the spot where she boarded and never the road she is on.
  if (playerBoat) {
    player.x = playerBoat.x;
    player.z = playerBoat.z;
  } else if (playerCar) {
    player.x = playerCar.x;
    player.z = playerCar.z;
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
        if (result.killed) {
          sfx.cash();
          const drop = cashDropFor(result.enemy);
          if (drop > 0) {
            player.money += drop;
            setCash(player.money);
            toast('POCKETED $' + drop, isBoss(result.enemy) ? 'Rocco carried the crew\u2019s cash.' : 'A rival\u2019s pocket money.');
          }
        }
      }
      if (player.ammo <= 0) {
        toast('OUT OF AMMO', 'Find more at the safehouse — press 1 for fists.');
        player.ammo = 12;
      }
    }
  }

  // --- traffic, pedestrians, police ---
  for (const car of traffic) {
    if (car === bus) continue; // the bus follows its own route, not the traffic AI
    updateTrafficCar(car, dt, traffic);
  }
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

  // Rival crew chases: while Mara is driving fast with heat on her,
  // Rocco's crew may come after her. A chase pays $300 when it ends in
  // her favour — escape them, or wreck them against the city.
  if (!rivalState.active && playerCar && wanted.level >= 1 && Math.abs(playerCar.speed) > 14) {
    rivalState.cooldown -= dt;
    if (rivalState.cooldown <= 0 && Math.random() < dt * 0.08) {
      rivalState.rivals = spawnRivalChase(scene, player.x + 30, player.z + 30, 2);
      rivalState.active = true;
      rivalState.escapeTimer = 0;
      rivalState.cooldown = 60;
      toast('RIVAL CREW', rivalTaunt());
      sfx.wanted();
    }
  }
  if (rivalState.active) {
    for (const rival of rivalState.rivals) {
      if (rival.health <= 0) continue;
      updateRival(rival, dt, player.x, player.z, playerCar ? Math.abs(playerCar.speed) : 0, colliders, (dmg) => {
        damagePlayer(dmg);
        sfx.crash();
      });
    }
    // Ramming a rival at speed wrecks it a little — use the city.
    if (playerCar) {
      for (const rival of rivalState.rivals) {
        if (rival.health > 0 && dist2D(playerCar.x, playerCar.z, rival.x, rival.z) < 4.4 && Math.abs(playerCar.speed) > 10) {
          if (damageRival(rival, 40)) {
            rival.mesh.rotation.x = -Math.PI / 2;
            rival.mesh.position.y = 0.4;
          }
          playerCar.speed *= 0.5;
          sfx.crash();
        }
      }
    }
    const rivalEv = updateRivalChase(rivalState, dt, player.x, player.z);
    if (rivalEv) {
      const won = rivalEv.type === 'wrecked';
      const bonus = won ? rivalWreckBonus(player.x, player.z) : 0;
      player.money += RIVAL_CHASE_REWARD + bonus;
      stats.rivalsEscaped = (stats.rivalsEscaped || 0) + (rivalEv.type === 'escaped' ? 1 : 0);
      stats.rivalsWrecked = (stats.rivalsWrecked || 0) + (won ? 1 : 0);
      setCash(player.money);
      toast(won ? 'RIVALS WRECKED' : 'RIVALS LOST', '+$' + (RIVAL_CHASE_REWARD + bonus) + ' — Rocco\u2019s crew backs off. For now.');
      sfx.cash();
      despawnRivals(scene, rivalState.rivals);
      rivalState.rivals = [];
      rivalState.cooldown = 60;
    }
  }

  // City events: roadworks, parades, checkpoints, festivals. A clean
  // run through a checkpoint pays a little bonus.
  const cityEv = updateEvents(eventState, dt, player.x, player.z, wanted.level, scene, peds);
  if (cityEv && cityEv.type === 'start') {
    stats.eventsSeen = (stats.eventsSeen || 0) + 1;
    toast('SOLMAR — ' + cityEv.kind.toUpperCase(), cityEv.blurb);
    sfx.radio();
  } else if (cityEv && cityEv.type === 'end' && cityEv.bonus > 0) {
    player.money += cityEv.bonus;
    setCash(player.money);
    if (cityEv.kind === 'street-art') toast('ART FAIR TIP', 'The Mural Row crowd tipped you for the colour — +$' + cityEv.bonus + '.');
    else toast('CLEAN CHECKPOINT', 'The PD waved you through — +$' + cityEv.bonus + '.');
    sfx.cash();
  }

  // Leo's jobs board: the clock on the active job runs while Mara
  // drives, and the board pays the moment a leg lands.
  const jobEvent = updateJobs(jobsState, player.x, player.z, dt);
  if (jobEvent && jobEvent.type === 'done') {
    // The crew takes a cut of the credit, not the cash: every hired
    // hand adds 5% to board pay, on top of the streak bonus.
    const crewPay = Math.round(jobEvent.pay * crewJobBonus(crewState) * packagesJobBonus(packagesState));
    player.money += crewPay;
    setCash(player.money);
    toast('JOB DONE', jobEvent.job.kind.toUpperCase() + ' — +$' + crewPay.toLocaleString() + (jobsState.streak > 1 ? ' · streak ' + jobsState.streak : '') + (crewState.hired.length ? ' · crew +5% each' : '') + (packagesComplete(packagesState) ? ' · packages +10%' : '') + '.');
    sfx.cash();
    persist();
  } else if (jobEvent && jobEvent.type === 'failed') {
    toast('JOB FAILED', 'The clock ran out — Leo pins a fresh one on the board.');
    sfx.denied();
    persist();
  } else if (jobEvent && jobEvent.type === 'stage') {
    const leg = jobEvent.job.legs[jobEvent.leg];
    toast('NEXT LEG', leg.to.name + ' — ' + formatCountdown(leg.timeLimit) + ' on the clock.');
    sfx.click();
  }

  // The wanted board: a hunt runs while Mara drives, and the fugitive
  // is a live enemy in the world — cuff them alive for the full price,
  // drop them for half, or lose them to Vex when the clock runs out.
  // A hunt is adrenaline: stamina comes back half again as fast while
  // one is running. The pay carries the crew cut, the packages bonus
  // and the club's back room on top of the board price.
  player.adrenaline = !!bountyState.active;
  const bountyPayMult = crewBountyBonus(crewState) * packagesBountyBonus(packagesState) * (nightclubState.upgrades.backroom ? 1.1 : 1);
  const bountyEvent = updateBounty(bountyState, enemies, player.x, player.z, !!playerCar, !!playerBoat, dt, bountyPayMult);
  if (bountyEvent && bountyEvent.type === 'cuffed') {
    player.money += bountyEvent.pay;
    setCash(player.money);
    const at = enemies.findIndex((e) => e.bountyId === bountyEvent.fugitive.id);
    if (at >= 0) { scene.remove(enemies[at].mesh); enemies.splice(at, 1); }
    toast('BOUNTY CAUGHT — ALIVE', bountyEvent.fugitive.name + ' (' + bountyEvent.fugitive.alias + ') — +$' + bountyEvent.pay.toLocaleString() + ' · streak ' + bountyState.streak + ' · ' + bountyBoardLine(bountyState) + '.');
    sfx.cash();
    sfx.mission();
    persist();
  } else if (bountyEvent && bountyEvent.type === 'killed') {
    player.money += bountyEvent.pay;
    setCash(player.money);
    toast('BOUNTY CAUGHT — DEAD', bountyEvent.fugitive.name + ' (' + bountyEvent.fugitive.alias + ') — +$' + bountyEvent.pay.toLocaleString() + ' (half price — alive pays double) · streak ' + bountyState.streak + '.');
    sfx.cash();
    persist();
  } else if (bountyEvent && bountyEvent.type === 'rival-take') {
    const at = enemies.findIndex((e) => e.bountyId === bountyEvent.fugitive.id);
    if (at >= 0) { scene.remove(enemies[at].mesh); enemies.splice(at, 1); }
    toast(BOUNTY_RIVAL_NAME.toUpperCase() + ' GOT THERE FIRST', bountyEvent.fugitive.name + ' is gone — Vex took the bounty, and the streak resets.');
    sfx.denied();
    persist();
  } else if (bountyEvent && bountyEvent.type === 'surrendered') {
    toast('THEY SURRENDERED', bountyEvent.fugitive.name + ' put their hands up — walk in close and hold your ground to cuff them alive!');
    sfx.wanted();
  }

  // The rare-car hunt: spotted the moment Mara climbs in, collected
  // the moment she parks it at the garage — Leo takes the keys.
  const rareEvent = updateCollectors(collectorsState, playerCar, player.x, player.z, hasCrew(crewState, 'rook'));
  if (rareEvent && rareEvent.type === 'found') {
    toast('RARE SPOTTED', rareEvent.car.name + ' — drive it to Venn\u2019s Garage and Leo pays $' + rareEvent.car.bonus.toLocaleString() + '. ' + rareCarRumor(collectorsState));
    sfx.radio();
  } else if (rareEvent && rareEvent.type === 'collected') {
    player.money += rareEvent.total;
    setCash(player.money);
    const car = rareEvent.drivenCar;
    scene.remove(car.mesh);
    const at = traffic.indexOf(car);
    if (at >= 0) traffic.splice(at, 1);
    playerCar = null;
    game.playerCar = null;
    player.inCar = null;
    player.mesh.visible = true;
    player.mesh.position.set(player.x, 0, player.z);
    updateShowroomSign(showroomSign, collectorsState);
    updateBountyBoard(bountyBoard, bountyState);
    // The full set gilds the Comet GT gold — Leo paints it himself,
    // on the house, the moment the sixth car rolls in.
    if (rareEvent.setBonus > 0) {
      garage.paint = COLLECTORS_GOLD_PAINT;
      applyGarageUpgrades(personalRide, garage);
    }
    toast('RARE COLLECTED', rareEvent.car.name + ' — +$' + rareEvent.total.toLocaleString() + (rareEvent.setBonus > 0 ? ' · FULL SET! The Comet GT is gold.' : '') + ' · ' + collectorsState.collected.length + '/6 in the showroom ' + collectorsProgressBar(collectorsState) + '.');
    sfx.cash();
    sfx.collect();
    sfx.mission();
    persist();
  }

  // Hidden packages: walk over a gold crate and it is yours — $500
  // now, $5,000 more when the tenth one lands, and the job board
  // pays 10% extra forever after.
  const pkgEvent = updatePackages(packagesState, player.x, player.z);
  if (pkgEvent && pkgEvent.type === 'found') {
    player.money += pkgEvent.total;
    setCash(player.money);
    const at = packageMeshes.findIndex((m) => m.pkg.id === pkgEvent.pkg.id);
    if (at >= 0) {
      scene.remove(packageMeshes[at].mesh);
      packageMeshes.splice(at, 1);
    }
    toast('PACKAGE FOUND', pkgEvent.pkg.name + ' — +$' + pkgEvent.total.toLocaleString() + (pkgEvent.setBonus > 0 ? ' · FULL SET! Job board pays +10% forever.' : '') + ' · ' + packagesState.found.length + '/10 found.');
    sfx.collect();
    persist();
  }

  // Street art: the needle sweeps while Mara sprays, and walking
  // away cancels the session — the coats laid so far stay on the
  // wall. The hint line shows the needle while she works.
  const sprayEvent = updateGraffiti(graffitiState, dt, player.x, player.z);
  if (sprayEvent && sprayEvent.type === 'cancelled') {
    toast('SPRAY CANCELLED', 'Walked away from the ' + sprayEvent.spot.name + ' — the coats stay, the wall waits.');
  }
  if (graffitiState.active) setHint('SPRAY — ' + sprayMeter(graffitiState) + ' · <b>I</b> to stop');
  // The spray can lives in Mara's hand while she works a wall, and
  // the gold crates bob so they catch the eye across the street.
  setSpraying(player, !!graffitiState.active);
  pulsePackageMeshes(packageMeshes, game.time);
  // The tag war: Rocco's runners spray over a finished wall every
  // couple of minutes, and the wall goes blank again.
  const tagWar = rivalTagWar(rivalState, graffitiState, dt);
  if (tagWar) {
    toast('TAG WAR', "Rocco's runners sprayed over the " + tagWar.spot.name + ' wall — it is blank again.');
    sfx.tagwar();
    updateGraffitiWalls(graffitiWalls, graffitiState);
    persist();
  }

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
  const heliOn = updateHeli(heli, dt, player.x, player.z, wanted.level, game.time, missions.index === 18, !!bountyState.active);
  setRotor(dist2D(heli.group.position.x, heli.group.position.z, player.x, player.z), heli.active);
  // The chopper calls in reinforcements: one fresh interceptor every
  // time its call timer fires while it is on station. Sable the
  // lookout warns Mara five seconds before the call goes out.
  if (heli.reinforce) {
    heli.reinforce = false;
    police.push(spawnPoliceCar(scene, player.x, player.z, wanted.level));
    toast('PD REINFORCEMENTS', 'The chopper called in another unit.');
  }
  if (crewLookout(crewState) && heli.active && heliCallCountdown(heli) <= HELI_CALL_WARNING && heliCallCountdown(heli) > HELI_CALL_WARNING - dt) {
    toast('LOOKOUT', 'Sable hears the chopper calling in a unit — five seconds.');
  }

  // Wanted decay and busted check. Sneaking lets Mara hide in plain
  // sight: a cop has to be almost on top of her to make the bust. Nix
  // the hacker cools the heat twice as fast when she is on the crew.
  updateWanted(wanted, dt, police.length === 0, heliOn, crewDecayMult(crewState));
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
    inBoat: playerBoat !== null,
    crewHacker: hasCrew(crewState, 'hacker'),
  };
  const finished = updateMissions(missions, world, dt);
  if (missions.message) {
    toast('MISSION FAILED', missions.message);
    missions.message = '';
  }
  if (finished) {
    // Rook the getaway driver negotiates every payout up: a hired
    // Rook adds 15% to every mission reward, because he knows what
    // the job was worth before Mara does.
    const rookBonus = hasCrew(crewState, 'rook');
    const payout = rookBonus ? Math.round(finished.reward * 1.15) : finished.reward;
    const arc = missionArc(Math.max(0, missions.index - 1));
    player.money += payout;
    onMissionWithCrew(crewState);
    setCash(player.money);
    toast('MISSION COMPLETE', finished.mission.title + ' — +$' + payout + (rookBonus ? ' (Rook negotiated +15%)' : '') + ' · ' + arc.name);
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
      // The company east bonus needs the destination key, not just the
      // name: look it up from the place name the fare carries.
      const destKey = Object.keys(PLACES).find((k) => PLACES[k].name === missions.fare.name);
      const pay = taxiFarePay(taxiCompany, base, vip, destKey, hasCrew(crewState, 'driver'));
      // A fare that ends at the garage pays a 10% tip — the rider is
      // usually a job client, and job clients tip the driver.
      const garageTip = destKey === 'garage' ? taxiJobBonusPay(pay) : 0;
      player.money += pay + garageTip;
      stats.fares += 1;
      stats.taxiEarned = (stats.taxiEarned || 0) + pay + garageTip;
      setCash(player.money);
      const rankUp = onTaxiFareDone(taxiCompany, vip, pay);
      toast(vip ? 'VIP FARE PAID' : 'FARE PAID', '+$' + (pay + garageTip) + ' — nice driving.' +
        (garageTip > 0 ? ' Garage tip +$' + garageTip + '.' : '') +
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
  for (let ti = 0; ti < tokens.length; ti++) {
    const token = tokens[ti];
    if (token.taken) continue;
    token.mesh.rotation.y += dt * 2;
    token.mesh.position.y = 1.2 + Math.sin(game.time * 2 + token.x) * 0.2;
    if (dist2D(player.x, player.z, token.x, token.z) < 2.5) {
      token.taken = true;
      scene.remove(token.mesh);
      player.money += token.value;
      stats.tokens = (stats.tokens || 0) + 1;
      setCash(player.money);
      persist();
      toast('SUNSET TOKEN', '+$' + token.value + ' — ' + stats.tokens + ' of 12 found.');
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

  // --- boats, bus and buoys -------------------------------------------------
  // Boats bob on the swell whether Mara drives them or not; the patrol
  // boats hunt her while the boat run is live; the bus rolls its loop
  // unless Mara is driving it herself; the buoys blink.
  for (const boat of boats) updateBoatVisual(boat, game.time);
  if (playerBoat) updateBoatVisual(playerBoat, game.time);
  for (const rb of rivalBoats) {
    updateBoatVisual(rb, game.time);
    updateRivalBoat(rb, dt, player.x, player.z, (dmg) => {
      damagePlayer(dmg);
      sfx.crash();
    });
  }
  for (const buoy of buoyMeshes) updateBuoy(buoy, game.time);
  if (bus && playerCar !== bus) updateBus(bus, dt);

  // --- camera ---
  if (game.cameraMode === 'chase' && playerCar) {
    updateCamera(camera, playerCar.x, playerCar.z, playerCar.heading, dt, camDistance, 4.6, 10);
  } else if (game.cameraMode === 'chase' && playerBoat) {
    updateCamera(camera, playerBoat.x, playerBoat.z, playerBoat.heading, dt, camDistance + 4, 5.5, 12);
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
  if (jobsState.active && jobsState.active.timer != null) setTimer(jobsState.active.timer);
  setRadio(radioStatusLine(radioState));
  setCrewLine(crewStatusLine(crewState) + (nightclubStatusLine(nightclubState) ? ' · ' + nightclubStatusLine(nightclubState) : '') + (fastTravelStatusLine(fastTravelState) ? ' · ' + fastTravelStatusLine(fastTravelState) : '') + (collectorsStatusLine(collectorsState) ? ' · ' + collectorsStatusLine(collectorsState) : '') + (jobsStatusLine(jobsState) ? ' · ' + jobsStatusLine(jobsState) : '') + (bountyStatusLine(bountyState) ? ' · ' + bountyStatusLine(bountyState) : '') + (graffitiStatusLine(graffitiState) ? ' · ' + graffitiStatusLine(graffitiState) : ''));
  // Club Neon: a live DJ set runs on the beat while Mara is on foot.
  // Space on the pulse scores; the set pays out by the crowd when the
  // sixteenth beat lands. The club sign burns bright once she owns it.
  updateClubSign(clubSign, nightclubState);
  if (nightclubState.set && !playerCar && !playerBoat) {
    const djEvent = djUpdate(nightclubState, dt);
    if (djEvent && djEvent.type === 'set-done') {
      player.money += djEvent.payout;
      setCash(player.money);
      if (djEvent.repUp) toast('CLUB NEON', 'The crowd loved it — reputation up! ' + clubCrowdLine());
      else toast('DJ SET DONE', djEvent.hits + '/16 on the beat · ' + djEvent.perfects + ' perfect · +$' + djEvent.payout.toLocaleString());
      sfx.cash();
      persist();
    } else if (djEvent === 'beat') {
      sfx.beat();
    }
    if (consumePressed('Space')) {
      const hit = djHit(nightclubState);
      if (hit === 'perfect') sfx.perfect();
      else if (hit === 'good') sfx.cash();
    }
  }
  setMusicMood(sky.timeOfDay < 0.22 || sky.timeOfDay > 0.82 ? 'night' : 'day');
  const obj = missionObjectiveText(missions);
  if (missions.fare && missions.fare.pickedUp) {
    setObjective(missions.fare.vip ? 'VIP FARE' : 'TAXI FARE', fareObjectiveText(missions.fare));
  } else if (missions.fare && !missions.fare.pickedUp) {
    setObjective(missions.fare.vip ? 'VIP FARE' : 'TAXI FARE', 'Pick up your passenger.');
  } else if (!currentMission(missions)) {
    // Free roam: the objective line carries the taxi company, the race
    // standings and the property book, so the side business is always
    // in view.
    setObjective('FREE ROAM', taxiStatusLine(taxiCompany) + ' · ' + raceStatusLine(raceState) + ' · ' + propertyStatusLine(propertyState));
  } else {
    setObjective(obj.title, obj.text);
  }
  // The race line sits under the clock while a race is live.
  setRaceLine(nightclubState.set ? djSetLine(nightclubState) : raceObjective(raceState));
  setSpeed(speedKmh, playerBoat ? (playerBoat.name || 'BOAT') : playerCar ? (playerCar.name || 'CAR') : 'ON FOOT');
  const stage = currentStage(missions);
  const marker = stage && stage.place ? stage.place
    : missions.fare ? { x: missions.fare.pickedUp ? missions.fare.toX : missions.fare.fromX, z: missions.fare.pickedUp ? missions.fare.toZ : missions.fare.fromZ }
      : null;
  drawMinimap({
    px: player.x, pz: player.z, heading: playerCar ? playerCar.heading : playerBoat ? playerBoat.heading : player.heading,
    marker, traffic, police, roadblocks, time: game.time, boat: playerBoat,
    lookout: crewLookout(crewState),
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
  get boats() { return boats; },
  get playerBoat() { return playerBoat; },
  get rivalBoats() { return rivalBoats; },
  get propertyState() { return propertyState; },
  get radioState() { return radioState; },
  get rivalState() { return rivalState; },
  get eventState() { return eventState; },
  get crewState() { return crewState; },
  get casinoState() { return casinoState; },
  get nightclubState() { return nightclubState; },
  get fastTravelState() { return fastTravelState; },
  get collectorsState() { return collectorsState; },
  get jobsState() { return jobsState; },
  get packagesState() { return packagesState; },
  get bountyState() { return bountyState; },
  get graffitiState() { return graffitiState; },
  get showroomSign() { return showroomSign; },
  get bountyBoard() { return bountyBoard; },
  get bus() { return bus; },
  get buoyMeshes() { return buoyMeshes; },
};

animate();
