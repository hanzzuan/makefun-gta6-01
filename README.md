# makefun-gta6-01

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/hanzzuan/makefun-gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/hanzzuan/makefun-gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**SOLMAR — Sunset Streets**: a complete original open-world crime game in the sun-soaked coastal city of Solmar. Mara Voss is back home to save her brother's garage from the fixer Dario Venn — eight story missions, car theft and driving, traffic and pedestrians, a wanted level with Solmar PD interceptors that chase and ram, combat, taxi fares, a live minimap, and a sunset you can drive into. The harbor update adds the North Harbor industrial district (cannery, freight yard, container stacks, gantry cranes, dockside pier), a weather system with rain and a full day/night cycle, motorcycles, delivery trucks and working taxis, police roadblocks at high wanted levels, explosive barrels, and a sneak-and-stamina system. The South Solmar update adds the Palmera Resort and Solmar Airport (terminal, control tower, Runway 27 with a taxiing jet), missions 6–8 that end Venn for good, a garage that tunes Mara's own Comet GT, a taxi company with ranks and VIP fares, street races with checkpoint gates, and a police helicopter at five stars. Built with three.js, no build step, no network: everything the game loads lives under `game/`.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome.

## Play

- **WASD** move / drive, **Shift** run (drains stamina), **C** sneak, **E** enter or exit a car, **Space** handbrake
- **Mouse click** shoot (with the pistol), **F** punch, **1 / 2** fists / pistol
- **G** garage (on foot near Venn's Garage — repaint and tune Mara's Comet GT), **R** race (in a car at a race start marker)
- **H** horn (scatters pedestrians), **mouse wheel** camera zoom, **P** pause, **M** mute — progress saves automatically to localStorage
- Steal anything with wheels: cars, vans, yellow cabs (fares pay 50% more), delivery trucks, motorcycles
- Red barrels explode when shot — clear a crew the smart way

## The city

Solmar is a seeded grid of avenues and streets around Solmar Plaza: Solmar Tower, the Marina del Sol pier, the Sunset Warehouse, Venn's Garage, Café Lumen, Mara's safehouse, a boardwalk and a beach with the ocean to the west. Traffic follows the road network, pedestrians stroll the sidewalks and scatter from speeding cars and gunfire, and the sun hangs low over the water all day long.

## Missions

1. **First Fare** — get a car, pick up a package at Café Lumen, deliver it to the marina.
2. **Hot Wheels** — steal the Coral Coupe by Solmar Tower, lose the police, deliver it to Venn's Garage.
3. **The Sunset Score** — take Venn's ledger back from the warehouse crew and bring it home.
4. **Harbor Lights** — Venn's enforcers are shaking down the dockworkers at North Harbor. Clear them out, grab the cash box, bring it to Leo at the garage.
5. **The Last Collector** — Venn's collector is fleeing with the garage deed in an armored truck. Chase the truck down until the driver gives up, then bring the deed home.
6. **Southern Comfort** — Venn's guards are leaning on the Palmera Resort. Clear them off the pool deck, then get to the airport terminal.
7. **Runway Run** — steal Venn's fuel truck from the airport apron, lose the police, bring it to Leo at the garage.
8. **The Last Flight** — Venn himself is leaving on a private jet from Runway 27. Clear his last guards from the terminal, then run the runway before the plane takes off.

After the story, free roam continues: the taxi company pays cash and builds reputation (more in a real cab, and airport and resort runs pay a tourist premium; VIP fares unlock at Pro rank and chained fares pay 50% more), the garage tunes Mara's Comet GT (paint, engine, armour), three street races run checkpoint circuits around the city with best times saved, and the PD never really stops watching — at five stars the helicopter comes up and its spotlight halves the rate the heat cools.

## The harbor and the weather

North Harbor is the working port in the north-east of the city: the Solmar Cannery, the Freight Yard with its container stacks, two gantry cranes, floodlights, and a dockside pier out over the ocean with boats riding the swell. Solmar also runs on a five-minute day: dawn, noon, sunset and night, with rain showers rolling through on their own timer — the lamps come on after dark and the rain patter joins the soundtrack. At three wanted stars and above, the PD throws up roadblocks on the road ahead of you: go around, thread the gap, or ram through.

## South Solmar

Past the last avenue to the south, the city opens up: the Palmera Resort with its hotel towers, pool deck and cabanas on the west, and Solmar Airport on the east — a terminal with a glass front, a control tower with a spinning radar, Runway 27 with pulsing edge lights, parked jets, a fuel truck and a jet that taxis the strip on a loop. Pilots work the terminal and resort guests lounge by the pool. At five wanted stars the Solmar PD sends a helicopter: it circles above Mara, pins its searchlight on her, and the heat takes twice as long to cool while it is on station.

## Structure

- `game/index.html` — page, HUD and minimap canvas, import map for three.js
- `game/src/main.js` — bootstrap, game loop and state machine
- `game/src/city.js` — Solmar: roads, buildings, beach, palms, lamps, sun
- `game/src/cars.js` — car factory, traffic AI, arcade driving physics
- `game/src/player.js` — Mara on foot, camera, entering and exiting cars
- `game/src/pedestrians.js` — sidewalk walkers who flee from danger
- `game/src/police.js` — wanted level and police interceptors
- `game/src/missions.js` — story, missions and taxi fares
- `game/src/combat.js` — pistol, fists and the warehouse crew
- `game/src/hud.js` — stars, cash, health, speed, objectives, minimap
- `game/src/audio.js` — synthesized WebAudio sound: engine, sirens, shots, music
- `game/src/save.js` — localStorage progress (v2 profile: stats, garage, taxi company, race bests)
- `game/src/shots.js` — deterministic scene presets for the screenshots
- `game/src/south.js` — South Solmar: Palmera Resort and Solmar Airport
- `game/src/garage.js` — vehicle customization: paint, engine and armour upgrades
- `game/src/races.js` — street races: checkpoint circuits, par times, bests
- `game/src/heli.js` — the police helicopter at five wanted stars
- `game/src/taxi.js` — the taxi company: reputation, ranks, VIP and chained fares
- `game/vendor/three/three.module.min.js` — vendored three.js

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
