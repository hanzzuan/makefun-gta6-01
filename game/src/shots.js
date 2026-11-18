// shots.js — deterministic scene presets for the entry's screenshots.
// ?shot=chase | drive | city | mission starts the game already playing
// in a staged moment: the cover shot is a five-star chase with the
// police helicopter overhead, the HUD and the minimap all on screen.
// Nothing here edits pixels; the screenshots are real renders of the
// running game.
//
// Each preset is one entry in SHOT_DEFS: a label for the dossier and a
// setup(game) that stages the world and leaves it running. The registry
// makes it cheap to re-stage a shot or add one: add a name to the
// registry, a query in shots.json, and the driver takes it.

import { PLACES } from './city.js';
import { makeCar } from './cars.js';
import { makeEnemy } from './combat.js';
import { spawnRoadblock } from './police.js';

export const SHOT_NAMES = ['chase', 'drive', 'city', 'mission'];

// Shared staging: put Mara in a car, hide her on-foot mesh, and hand
// the wheel to the loop. Every driving preset uses this so the car
// always ends up in the same state the loop expects.
function stageInCar(game, car) {
  const { scene, player } = game;
  car.speed = 24;
  scene.add(car.mesh);
  game.playerCar = car;
  game.autoDrive = true;
  player.inCar = car;
  player.x = car.x;
  player.z = car.z;
  player.heading = car.heading;
  player.mesh.visible = false;
  game.cameraMode = 'chase';
}

function stageOnFoot(game, x, z, heading) {
  const { player } = game;
  player.x = x;
  player.z = z;
  player.heading = heading;
  player.mesh.position.set(x, 0, z);
  player.mesh.rotation.y = heading;
  game.cameraMode = 'follow';
}

const SHOT_DEFS = {
  chase: {
    label: 'Five-star chase: the PD helicopter overhead, roadblock ahead',
    setup(game) {
      // Mara in a red Comet GT on the central avenue, five stars, the
      // chopper pinning its searchlight on her and interceptors closing
      // in from the flanks. Rain is falling and the PD has thrown up a
      // roadblock on the avenue ahead of her.
      const car = makeCar('car', 35, 120, Math.PI, 0xd8382e);
      car.name = 'Comet GT';
      stageInCar(game, car);
      const { wanted } = game;
      wanted.heat = 135;
      wanted.level = 5;
      game.ensurePolice(5);
      // The chopper is parked on station above her from frame one, so
      // the cover always shows the searchlight; the loop keeps it there.
      if (game.heli) {
        game.heli.active = true;
        game.heli.group.visible = true;
        game.heli.group.position.set(car.x + 18, 38, car.z - 18);
        game.heli.rotorSpeed = 1;
        game.heli.spotlightOn = true;
      }
      // Interceptors hold a loose formation ahead of her — in shot mode
      // the loop keeps them there so the cover always shows the chase.
      game.policeFormation = [[-8, 18], [8, 24], [0, 32]];
      game.police.forEach((p) => {
        p.heading = Math.PI;
        p.speed = 26;
      });
      game.city.setWeather('rain');
      game.city.setTimeOfDay(0.74);
      game.roadblocks.push(spawnRoadblock(game.scene, 35, 58, Math.PI, game.colliders));
      game.missions.index = 5;
      game.missions.stage = 1;
    },
  },
  drive: {
    label: 'Night cab shift in the new South district, past the airport',
    setup(game) {
      // A night shift in a yellow cab: Mara working the south avenue
      // after dark, the terminal and the control tower lit behind her,
      // a plane parked on the apron, traffic ahead.
      const car = makeCar('taxi', 70, 245, Math.PI / 2);
      car.name = 'City Cab';
      car.speed = 16;
      stageInCar(game, car);
      game.wanted.heat = 0;
      game.wanted.level = 0;
      // A fresh story state, whatever the browser saved before.
      game.missions.index = 0;
      game.missions.stage = 0;
      game.city.setWeather('clear');
      game.city.setTimeOfDay(0.97);
      // A car ahead on the same avenue so the shot shows traffic.
      const ahead = makeCar('car', 140, 245, Math.PI / 2, 0xf2c230);
      ahead.targetSpeed = 12;
      ahead.vertical = false;
      ahead.lane = 245;
      ahead.along = 140;
      ahead.direction = 1;
      game.scene.add(ahead.mesh);
      game.traffic.push(ahead);
    },
  },
  city: {
    label: 'On foot at the Palmera Resort in the South district, golden hour',
    setup(game) {
      // On foot at the Palmera Resort at golden hour: Mara mid-frame
      // facing the pool, the cabanas and the hotel towers ahead of her,
      // resort guests on the deck. She stands at the pool's north edge
      // facing south (heading 0), close enough that the pool, the
      // cabanas and the guests all read in one frame.
      stageOnFoot(game, -140, 218, 0);
      // Bring a few resort guests into the frame ahead of her.
      const nearSpots = [[-152, 228], [-132, 232], [-118, 244]];
      nearSpots.forEach(([sx, sz], i) => {
        const ped = game.peds[i * 2];
        if (!ped) return;
        ped.x = sx;
        ped.z = sz;
        ped.mesh.position.set(sx, 0, sz);
      });
      game.wanted.heat = 0;
      game.wanted.level = 0;
      game.missions.index = 5;
      game.missions.stage = 0;
      game.city.setWeather('clear');
      game.city.setTimeOfDay(0.72);
    },
  },
  mission: {
    label: 'Southern Comfort: Mara faces Venn\u2019s resort guards by the pool',
    setup(game) {
      // Mission 6: Mara at the Palmera Resort, pistol out, Venn's
      // guards in the open by the pool ahead of her, the hotel towers
      // and the cabanas behind them. She stands at the pool's north
      // edge facing south (heading 0), close enough that the guards
      // read clearly, clear of the palm at (-140, 186).
      const { player } = game;
      stageOnFoot(game, -140, 210, 0);
      player.weapon = 'pistol';
      game.wanted.heat = 28;
      game.wanted.level = 1;
      game.missions.index = 5;
      game.missions.stage = 1;
      game.enemies.length = 0;
      const spots = [
        [PLACES.resort.x - 18, PLACES.resort.z + 16],
        [PLACES.resort.x - 4, PLACES.resort.z + 20],
        [PLACES.resort.x + 12, PLACES.resort.z + 12],
        [PLACES.resort.x + 20, PLACES.resort.z + 22],
      ];
      for (const [ex, ez] of spots) {
        const enemy = makeEnemy(game.scene, ex, ez, 'guard');
        game.enemies.push(enemy);
      }
      game.city.setWeather('clear');
      game.city.setTimeOfDay(0.74);
    },
  },
};

export function shotFromUrl() {
  const q = new URLSearchParams(window.location.search);
  const shot = q.get('shot');
  return SHOT_NAMES.includes(shot) ? shot : null;
}

export function shotLabel(shot) {
  return SHOT_DEFS[shot] ? SHOT_DEFS[shot].label : '';
}

// `game` is the live world main.js assembles: scene, camera, player, the
// traffic/police/enemy lists, the wanted and mission state, and helpers
// to put Mara in a car or arm her. Every preset leaves the game running.
export function applyShot(game, shot) {
  const def = SHOT_DEFS[shot];
  if (!def) return;
  game.state = 'playing';
  game.shotMode = true;
  def.setup(game);
}

// After the preset is applied and a few frames have rendered, the game
// marks the page ready so the screenshot driver knows when to capture.
export function markShotReady(frames) {
  if (frames >= 30) {
    document.title = 'solmar-shot-ready';
    return true;
  }
  return false;
}
