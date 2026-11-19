// shots.js — deterministic scene presets for the entry's screenshots.
// ?shot=chase | drive | city | mission starts the game already playing
// in a staged moment: the cover shot is a five-star chase down the East
// Solmar avenue with the police helicopter overhead, the HUD and the
// minimap all on screen. Nothing here edits pixels; the screenshots are
// real renders of the running game.
//
// Each preset is one entry in SHOT_DEFS: a label for the dossier and a
// setup(game) that stages the world and leaves it running. The registry
// makes it cheap to re-stage a shot or add one: add a name to the
// registry, a query in shots.json, and the driver takes it.

import { PLACES } from './city.js';
import { makeCar } from './cars.js';
import { makeEnemy, makeTagger, makeRival } from './combat.js';
import { spawnRoadblock } from './police.js';

export const SHOT_NAMES = ['chase', 'drive', 'city', 'mission', 'casino', 'club', 'bounty', 'graffiti'];

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
  casino: {
    label: 'The Long Con: Mara clears Rocco\u2019s vault guards from the casino floor at the Palmera Resort',
    setup(game) {
      // Mission 13: Mara on foot at the casino door at night, pistol
      // out, Rocco's vault guards in orange closing in across the
      // resort forecourt, the gold casino sign glowing behind her and
      // two stars on the board. She stands south of the door facing
      // north (heading PI), close enough that the guards read clearly.
      const { player } = game;
      stageOnFoot(game, -128, 238, Math.PI);
      player.weapon = 'pistol';
      game.wanted.heat = 14;
      game.wanted.level = 2;
      const spots = [
        [-138, 216], [-118, 214], [-134, 228], [-122, 230],
      ];
      for (const [ex, ez] of spots) {
        const e = makeRival(game.scene, ex, ez);
        game.enemies.push(e);
      }
    },
  },
  graffiti: {
    label: 'Street Legend: Mara finishes a wall on Mural Row at golden hour, spray can in hand, the taggers watching',
    setup(game) {
      // Mural Row at golden hour: Mara on foot at the long blank wall
      // downtown, spray can in hand, two taggers in purple hoodies
      // watching from the kerb. She stands south of the wall facing
      // north (heading PI), close enough that the wall reads clearly.
      const { player } = game;
      stageOnFoot(game, -100, -40, Math.PI);
      player.weapon = 'pistol';
      game.wanted.heat = 0;
      game.wanted.level = 0;
      const spots = [
        [-106, -34], [-94, -34],
      ];
      for (const [ex, ez] of spots) {
        const e = makeTagger(game.scene, ex, ez);
        game.enemies.push(e);
      }
    },
  },
  club: {
    label: 'Night Shift: Mara takes Club Neon back, pistol out, the bouncers closing in under the neon sign',
    setup(game) {
      // Mission 15: Mara on foot at the club door at night, pistol out,
      // Venn's bouncers in black vests closing in across the pavement,
      // the pink neon sign glowing behind her and two stars on the
      // board. She stands south of the door facing north (heading PI),
      // close enough that the bouncers read clearly.
      const { player } = game;
      stageOnFoot(game, -70, -56, Math.PI);
      player.weapon = 'pistol';
      game.wanted.heat = 14;
      game.wanted.level = 2;
      const spots = [
        [-76, -66], [-64, -66], [-76, -76], [-64, -76],
      ];
      for (const [ex, ez] of spots) {
        const e = makeEnemy(game.scene, ex, ez, 'bouncer');
        game.enemies.push(e);
      }
      game.city.setWeather('clear');
      game.city.setTimeOfDay(0.9);
      game.missions.index = 14;
      game.missions.stage = 1;
    },
  },
  bounty: {
    label: 'Bounty hunt: Mara corners the Ghost of Solmar in the back alley at night, pistol out, three stars on the board',
    setup(game) {
      // The wanted board's biggest name: Mara on foot in the back
      // alley at night, pistol out, the Ghost's fugitives in dusty
      // grey-green closing in between the food carts, three stars on
      // the board. She stands at the alley mouth facing in (heading
      // -PI/2), close enough that the fugitives read clearly.
      const { player } = game;
      stageOnFoot(game, -40, -28, -Math.PI / 2);
      player.weapon = 'pistol';
      game.wanted.heat = 21;
      game.wanted.level = 3;
      const spots = [
        [-46, -40], [-34, -40], [-46, -48], [-34, -48],
      ];
      for (const [ex, ez] of spots) {
        const e = makeEnemy(game.scene, ex, ez, 'fugitive');
        game.enemies.push(e);
      }
      game.city.setWeather('clear');
      game.city.setTimeOfDay(0.92);
      game.missions.index = 32;
      game.missions.stage = 1;
    },
  },
  chase: {
    label: 'Five-star chase down the East Solmar avenue: the PD helicopter overhead, roadblock ahead',
    setup(game) {
      // Mara in a red Comet GT on the East Solmar avenue just south of
      // the stadium gate, five stars, heading south down the clear run
      // toward the mall. The chopper pins its searchlight on her and
      // interceptors close in from the flanks. Rain is falling and the
      // PD has thrown up a roadblock on the avenue ahead of her, short
      // of the mall fountain.
      const car = makeCar('car', 315, -10, 0, 0xd8382e);
      car.name = 'Comet GT';
      stageInCar(game, car);
      car.speed = 14;
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
        p.heading = 0;
        p.speed = 26;
      });
      game.city.setWeather('rain');
      game.city.setTimeOfDay(0.74);
      game.roadblocks.push(spawnRoadblock(game.scene, 315, 28, 0, game.colliders));
      game.missions.index = 8;
      game.missions.stage = 1;
    },
  },
  drive: {
    label: 'Dusk drive up the East Solmar avenue in the sports coupe, past the campus and the mall',
    setup(game) {
      // A dusk run in the orange sports coupe: Mara heading north up
      // the East Solmar avenue from the campus, the library and the
      // mall ahead of her, the city bus ahead on the same avenue.
      const car = makeCar('coupe', 315, 165, Math.PI);
      car.name = 'Veloce Coupe';
      stageInCar(game, car);
      car.speed = 12;
      game.wanted.heat = 0;
      game.wanted.level = 0;
      // A fresh story state, whatever the browser saved before.
      game.missions.index = 0;
      game.missions.stage = 0;
      game.city.setWeather('clear');
      game.city.setTimeOfDay(0.82);
      // The city bus ahead on the same avenue so the shot shows the
      // east-side traffic.
      const bus = makeCar('bus', 315, 140, Math.PI);
      bus.targetSpeed = 10;
      bus.vertical = true;
      bus.lane = 315;
      bus.along = 140;
      bus.direction = -1;
      game.scene.add(bus.mesh);
      game.traffic.push(bus);
    },
  },
  city: {
    label: 'The showroom at Venn\u2019s Garage — Mara\u2019s rare-car collection at golden hour',
    setup(game) {
      // On foot south of the garage at golden hour, facing north into
      // the showroom: three rares parked in a row by the door — the
      // gold coupe, the rally fox and the vintage roadster — with the
      // gold showroom board glowing over the garage door behind them.
      stageOnFoot(game, 140, -112, Math.PI);
      const rares = [
        ['coupe', 128, -126, 0xd8a920],
        ['coupe', 140, -126, 0x2e7a4a],
        ['coupe', 152, -126, 0x8a5a3c],
      ];
      for (const [kind, x, z, color] of rares) {
        const car = makeCar(kind, x, z, Math.PI, color);
        car.targetSpeed = 0;
        game.scene.add(car.mesh);
        game.traffic.push(car);
      }
      game.wanted.heat = 0;
      game.wanted.level = 0;
      game.missions.index = 19;
      game.missions.stage = 0;
      game.city.setWeather('clear');
      game.city.setTimeOfDay(0.72);
    },
  },
  mission: {
    label: 'The Lighthouse: Mara signals Leo\u2019s old crew from the dockside pier at night — mission 19 of twenty',
    setup(game) {
      // Mission 19: Mara on the dockside pier at night, pistol out,
      // Venn's smugglers closing in across the pier, the lighthouse
      // beam sweeping the bay behind her and the marina lights across
      // the water. She stands east of the pier facing west toward the
      // lighthouse (heading -PI/2), close enough that the smugglers
      // read clearly.
      const { player } = game;
      stageOnFoot(game, -318, -196, -Math.PI / 2);
      player.weapon = 'pistol';
      game.wanted.heat = 28;
      game.wanted.level = 1;
      game.missions.index = 18;
      game.missions.stage = 2;
      game.enemies.length = 0;
      const spots = [
        [-330, -204, 'rival'],
        [-330, -196, 'rival'],
        [-328, -188, 'rival'],
      ];
      for (const [ex, ez, variant] of spots) {
        const enemy = makeEnemy(game.scene, ex, ez, variant);
        game.enemies.push(enemy);
      }
      game.city.setWeather('clear');
      game.city.setTimeOfDay(0.95);
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
