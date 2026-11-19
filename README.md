# makefun-gta6-01

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/hanzzuan/makefun-gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/hanzzuan/makefun-gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**SOLMAR — Sunset Streets**: a complete original open-world crime game in the sun-soaked coastal city of Solmar. Mara Voss is back home to save her brother's garage from the fixer Dario Venn — forty story missions, car theft and driving, traffic and pedestrians, a wanted level with Solmar PD interceptors that chase and ram, combat, taxi fares, a live minimap, and a sunset you can drive into. The harbor update adds the North Harbor industrial district (cannery, freight yard, container stacks, gantry cranes, dockside pier), a weather system with rain and a full day/night cycle, motorcycles, delivery trucks and working taxis, police roadblocks at high wanted levels, explosive barrels, and a sneak-and-stamina system. The South Solmar update adds the Palmera Resort and Solmar Airport (terminal, control tower, Runway 27 with a taxiing jet), missions 6–8 that end Venn for good, a garage that tunes Mara's own Comet GT, a taxi company with ranks and VIP fares, street races with checkpoint gates, and a police helicopter at five stars. The East Solmar update adds the university campus, the stadium and the mall east of the old city, missions 9–11 that finish Rocco's crew, boats and a marina with water chases, property ownership, rival crew chases, a switchable radio, new vehicles, and dynamic city events. The crew and casino update adds missions 12–14 that close Venn's books, Rocco's vault, and Venn's heir in the stadium bowl, a hireable and trainable crew (a driver, a hacker, a lookout, a negotiator and an artist) at the safehouse, and the Solmar Casino at the resort with slots, blackjack and roulette for real stakes. The nightclub update adds missions 15–16 that take Club Neon and the harbor job, a nightclub business to own with a DJ mini-game and bouncers for hire, and a taxi rank that fast-travels Mara anywhere in town. The finale update adds missions 17–18 — a siege on the safehouse and one last boat at sunset — club upgrades (a sound system, a VIP lounge, a neon sign), a fourth crew hand in Rook the negotiator, radio ads between the songs, two more street races, a street-race city event, a penthouse above the club, and a whale table at the casino. The closing arc adds missions 37–40 — the last ledger at the airport, a night boat chase to the lighthouse, the showroom job, and one last sunset — plus a street-art scene: twelve spray walls around the city with a spray mini-game, a fifth crew hand in Ink the artist, a gold spray-can paint, and a tag war with Rocco's runners who paint over finished walls. Built with three.js, no build step, no network: everything the game loads lives under `game/`.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome.

## Play

- **WASD** move / drive, **Shift** run (drains stamina), **C** sneak, **E** enter or exit a car, **Space** handbrake
- **Mouse click** shoot (with the pistol), **F** punch, **1 / 2** fists / pistol
- **G** garage (on foot near Venn's Garage — repaint and tune Mara's Comet GT), **R** race (in a car at a race start marker)
- **N** radio (switch station — Sunset FM, Harbour Rock, Night Drive, Talk Solmar, Casino Jazz, Street FM), **B** property (near a gold property sign — buy a safehouse, an apartment, or the penthouse)
- **I** spray (at a blank wall — press **E** to lay a coat near the middle of the needle; three coats finish the wall, twelve walls make a Street Legend), **U** bounty board (at the garage — ten fugitives, and Vex works the same board)
- **V** crew (at the safehouse — hire Dee the driver, Nix the hacker, or Sable the lookout), **X** casino (at the resort door — slots and blackjack for real stakes)
- **C** club (at the Club Neon door — buy the club, hire bouncers, play a DJ set), **T** taxi rank (anywhere on foot — a cab to any landmark in town)
- **H** horn (scatters pedestrians), **mouse wheel** camera zoom, **P** pause, **M** mute — progress saves automatically to localStorage
- Steal anything with wheels: cars, vans, yellow cabs (fares pay 50% more), delivery trucks, motorcycles
- Red barrels explode when shot — clear a crew the smart way

## The city

### Street art

Twelve spray walls hide around Solmar — the mural row downtown, the mall food court, the stadium gate, the campus library, the harbor containers, the cannery wall, the resort pool house, the airport fence, Neon Alley, the back alley, the boardwalk and the dockside pier. Walk up to a blank wall and press **I**: a needle sweeps back and forth, and **E** lays a coat near the middle for a perfect one. Three coats finish a piece for $500 on the spot; three perfect coats in a row pay a streak bonus; the full set pays $5,000 more and the gold spray-can paint. Hire Ink at the safehouse and every finished wall pays $250 more. Rocco's runners hate the walls — every couple of minutes one of them sprays over a finished piece, and it goes blank again. The gallery (**I** at the garage) lists all twelve walls and whether each one is dry.

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
9. **Campus Heist** — Rocco's crew moved into the east side while Mara was busy with Venn. Hit the university archive, take the ledger back from Rocco's runners, and get out past the campus gates.
10. **Marina Run** — Rocco's runners are coming by boat. Take the speedboat out of the marina, outrun the patrol boats across the bay, and bring the drop home.
11. **Stadium Finale** — Rocco himself is waiting in the stadium bowl. Fight through his crew in front of a full crowd, take him down, and take East Solmar back.
12. **Venn's Ledger** — a second ledger sits in Venn's old downtown office, and the names in it would buy the whole PD. Get through the locked door (Nix pops it open; anyone else works the lock), clear the guards, and bring the ledger home.
13. **The Long Con** — the last of Rocco's money is in the casino vault at the resort. Clear the vault guards and run the takings to the mall vault before the crew regroups.
14. **The Last Sunset** — Venn's heir has taken the stadium bowl and put a price on Mara's head. Take the bowl back at sunset, and Solmar is hers for good.
15. **Night Shift** — Venn's men still hold Club Neon, and the club is where the whole city's money moves after dark. Take the door, clear the floor, and the club is Mara's.
16. **The Harbor Job** — the last of Venn's cash is coming in by boat at the North Harbor, and Rocco's runners are waiting for it. Take the manifest, take the cash, and bring it home by water.
17. **Safehouse Siege** — Rocco's last crew hits the safehouse looking for the ledgers. Hold the door, clear the yard, and take their stash to Leo.
18. **Sunset Streets** — one last boat leaves the marina at sunset with the final bag. Run the buoy, clear the pier, and bring the bag home before dark.

After the story, free roam continues: the taxi company pays cash and builds reputation (more in a real cab, and airport and resort runs pay a tourist premium; East Solmar runs pay a campus premium and a 25% company bonus; VIP fares unlock at Pro rank and chained fares pay 50% more; a club with a name helps too — Club Neon at reputation 5 puts Mara on the VIP list on its own), the garage tunes Mara's Comet GT (paint, engine, armour, and a nitro bottle worth +8 top speed), seven street races run checkpoint circuits around the city with best times saved, and the PD never really stops watching — at five stars the helicopter comes up, its spotlight halves the rate the heat cools, and every twenty seconds on station it calls in a fresh interceptor. Mara can also hire a crew at the safehouse — Dee makes every car and boat faster and adds 25% to taxi fares, Nix cools wanted heat faster and pops locked doors, Sable rings every police dot on the minimap in gold and warns her five seconds before the chopper calls in a unit — and each hand trains up to level 3 for stronger perks. The Solmar Casino at the resort runs slots, blackjack and roulette for real stakes, with lifetime winnings tracked and a Casino Suite and a Resort Villa to buy above the tables, and some nights the whole resort lights up for casino night. The fastest hull on the bay, the Solmar Yacht, is moored off the resort, and the radio now carries a seventh station, Club Neon, for the house beats from Mara's own club. Club Neon itself pays: buy it for $40,000, hire bouncers to keep the door, play a DJ set on the beat to raise the crowd, and collect the till every in-game day — at reputation 3 the taxi rank rides free on the club's name. And when the city is too big to drive across, press **T** for the taxi rank: a cab to any landmark in town for a flat fare, as long as the PD is not hard on her tail.

## The harbor and the weather

North Harbor is the working port in the north-east of the city: the Solmar Cannery, the Freight Yard with its container stacks, two gantry cranes, floodlights, and a dockside pier out over the ocean with boats riding the swell. Solmar also runs on a five-minute day: dawn, noon, sunset and night, with rain showers rolling through on their own timer — the lamps come on after dark and the rain patter joins the soundtrack. At three wanted stars and above, the PD throws up roadblocks on the road ahead of you: go around, thread the gap, or ram through.

## South Solmar

Past the last avenue to the south, the city opens up: the Palmera Resort with its hotel towers, pool deck and cabanas on the west, and Solmar Airport on the east — a terminal with a glass front, a control tower with a spinning radar, Runway 27 with pulsing edge lights, parked jets, a fuel truck and a jet that taxis the strip on a loop. Pilots work the terminal and resort guests lounge by the pool. At five wanted stars the Solmar PD sends a helicopter: it circles above Mara, pins its searchlight on her, and the heat takes twice as long to cool while it is on station.

## East Solmar

Past the old city's east edge, a new avenue runs from the stadium in the north to the mall in the south: Solmar University with its clock tower and a crowd of students, the Solmar Stadium with a scoreboard, floodlights and a roaring crowd — the bowl opens through a south gate on the avenue — and the Solmar Mall with its gold sign and shoppers. The marina on the west edge has three boats to steal — a speedboat, a fishing boat and a patrol boat — and the bay beyond it runs with buoys, a patrol loop, and rival boats that chase. Mara can buy property with mission cash: a safehouse, an apartment, and the penthouse above the mall, each paying rent every ninety seconds and healing her when she visits. Rocco's crew runs rival chases across the east side — outrun them or wreck them for a $300 reward — and the city itself throws events at her: roadworks, parades, police checkpoints, festivals, and fireworks over the marina that light up the whole bay. The radio runs four stations on the **N** key, the city bus loops from the plaza to the campus to the airport, and two new races — the Campus Circuit around the quad and the mall forecourt, and the Stadium Sprint around the bowl — run the east side with best times saved. Twelve sunset tokens hide around Solmar now: six in the old city, five in the east, and one gold token out in the bay worth $250 to a swimmer or a boater — taken tokens stay taken across sessions.

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
- `game/src/save.js` — localStorage progress (v2 profile: stats, garage, taxi company, race bests, property deeds, radio station, rival history, city events)
- `game/src/shots.js` — deterministic scene presets for the screenshots
- `game/src/south.js` — South Solmar: Palmera Resort and Solmar Airport
- `game/src/garage.js` — vehicle customization: paint, engine, armour and nitro upgrades
- `game/src/races.js` — street races: checkpoint circuits, par times, bests
- `game/src/heli.js` — the police helicopter at five wanted stars
- `game/src/taxi.js` — the taxi company: reputation, ranks, VIP and chained fares
- `game/src/east.js` — East Solmar: university, stadium and mall
- `game/src/boats.js` — the marina: speedboat, fishing boat and patrol boat
- `game/src/property.js` — property ownership: safehouse, apartment, penthouse
- `game/src/rivals.js` — Rocco's rival crew: chases, rams and wreck rewards
- `game/src/radio.js` — the radio: four stations, switchable with N
- `game/src/events.js` — dynamic city events: roadworks, parades, checkpoints, festivals
- `game/src/vehicles.js` — the city bus loop, the sports coupe and the pickup
- `game/src/crew.js` — Mara's crew: a driver, a hacker and a lookout for hire at the safehouse
- `game/src/casino.js` — the Solmar Casino: slots and blackjack for real stakes
- `game/src/nightclub.js` — Club Neon: buy the club, hire bouncers, play a DJ set, collect the till
- `game/src/fasttravel.js` — the taxi rank: fast travel between landmarks for a flat fare
- `game/vendor/three/three.module.min.js` — vendored three.js

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>

## Final pass — the epilogue (v5c)

The story now runs twenty missions: M19 "The Lighthouse" sends Mara
out on the bay at night to signal Leo's old crew, and M20 "Sunset
Streets II" closes the arc with the biggest payout in the game. Two
new systems keep Solmar busy after the story ends: a rare-car
collection (six one-of-one cars hidden around the city — drive each
to Venn's Garage to fill the showroom; all six gilds the Comet GT
gold and pays a $25,000 jackpot) and a jobs board at the garage
(repeatable deliveries, escorts and pickups with scaling pay, a job
timer and a streak bonus). The bus loop now stops at the Dockside
Pier, fast travel reaches it too, and the lighthouse has its own
race circuit.

## After dark — thirty-six missions, ten fugitives, one rival hunter

The story now runs thirty-six missions: after the M32 finale, M33 "The
Quiet Harbor" runs a smuggling sting at the docks, M34 "Neon Nights"
defends Club Neon from a rival takeover, M35 "The Long Road Home" runs
the campus, the bay and the marina with the clock running, and M36
"Solmar After Dark" closes the whole story under the city lights — the
final payout is $200,000. A new system keeps Solmar busy after the
story ends: the PD's wanted board at the garage (press U) lists ten
fugitives with cash on their heads, from Rico "Rat King" Delgado at the
freight yard to the Ghost of Solmar at the harbor. Cuff them alive for
the full price, drop them for half — and be quick, because the rival
hunter Vex works the same board and takes any bounty older than four
minutes. A surrendered fugitive stops shooting and puts their hands
up: walk in close and hold your ground to cuff them. Streaks pay more,
the crew takes a cut, the full package set pays 10% more, and the
club's new Back Room upgrade pays another 10%. The race list is
thirteen circuits now (the Bounty Run joined), ten properties are for
sale (a Bounty Office in the back alley joined), the bus stops at the
Back Alley, fast travel reaches it too, and five-star police now roll
in black interceptors.
