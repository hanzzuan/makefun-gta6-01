// missions.js — the story of Solmar and its jobs.
// Mara Voss came home to save her brother's garage from Dario Venn, the
// fixer who owns half the marina. Forty missions, then free roam with
// taxi fares, car theft, boats and rival chases to keep earning. Every
// mission is a small state machine: stages with a target point, a
// radius, and a line of story text. The last three jobs take Mara east
// — the campus heist, a boat run across the bay, and the stadium finale
// against Rocco's crew, who moved in after Venn fell. Then the ledger
// job and the long con at the casino finish what Venn started, and the
// last two jobs take the fight to the nightclub door and the harbor.
// The epilogue takes her back to the water: a signal from the
// lighthouse, and one last run through every street she owns. And
// after dark, the story runs four more jobs — the quiet harbor, the
// neon nights, the long road home, and Solmar after dark itself.

import { PLACES } from './city.js';
import { dist2D } from './util.js';
import { boatAtBuoy } from './boats.js';

export const STORY_INTRO =
  'Mara Voss is back in Solmar. Her brother Leo\u2019s garage owes Dario Venn ' +
  '$50,000, and Venn collects on Friday. Forty jobs stand between Mara and ' +
  'a clean slate — if the Solmar PD doesn\u2019t catch her first.';

export function makeMissionState() {
  return {
    index: 0, // which mission is active (0..39), 40 = story done
    stage: 0,
    done: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
    fare: null, // active taxi fare, if any
    fareCooldown: 8,
    message: '',
    messageTimer: 0,
    chaseTimer: 0, // seconds spent close behind Venn's truck, mission 5
    stageTimer: null, // seconds left on a timed stage, null when not timed
    hackTimer: null, // seconds left channeling a locked door, mission 12
  };
}

// A mission stage: go somewhere, do something, or survive something.
function stage(kind, place, text, radius, extra) {
  return { kind, place, text, radius: radius || 10, ...(extra || {}) };
}

// The story arcs: forty missions in nine arcs, from the garage debt to
// the last sunset. The mission-complete toast names the arc, so the
// player always knows which chapter just closed.
export const STORY_ARCS = [
  { from: 0, to: 2, name: 'The Garage Debt', blurb: 'Venn owns the garage — Mara pays it back one job at a time.' },
  { from: 3, to: 4, name: 'Harbor Nights', blurb: 'The cannery men, the freight yard, and the first collector.' },
  { from: 5, to: 7, name: 'Southern Comfort', blurb: 'The resort, the airport, and the end of Venn for good.' },
  { from: 8, to: 10, name: "Rocco's Crew", blurb: 'The east side fights back — the campus, the marina, the bowl.' },
  { from: 11, to: 13, name: 'Closing the Books', blurb: "Venn's ledger, Rocco's vault, and Venn's heir in the stadium." },
  { from: 14, to: 17, name: 'Neon Nights', blurb: 'Club Neon, the harbor job, and one last boat at sunset.' },
  { from: 18, to: 31, name: 'Sunset Streets', blurb: 'The lighthouse, the showroom, the jobs board — Solmar, forever.' },
  { from: 32, to: 35, name: 'After Dark', blurb: 'The quiet harbor, the neon nights, the long road home.' },
  { from: 36, to: 39, name: 'The Last Sunset', blurb: 'The last ledger, the night boat, the showroom job — and the true final mission.' },
];

export function missionArc(index) {
  for (const arc of STORY_ARCS) {
    if (index >= arc.from && index <= arc.to) return arc;
  }
  return STORY_ARCS[STORY_ARCS.length - 1];
}

// What the whole arc pays, all missions added up — the pause menu
// shows it so the player knows what the chapter is worth.
export function arcPayout(index) {
  const arc = missionArc(index);
  let total = 0;
  for (let i = arc.from; i <= arc.to && i < MISSIONS.length; i++) {
    total += MISSIONS[i].reward || 0;
  }
  return total;
}

export const MISSIONS = [
  {
    id: 'first-fare',
    title: 'MISSION 1 — FIRST FARE',
    reward: 400,
    briefing: 'Venn\u2019s man waits at Caf\u00e9 Lumen with a package. Get a car — ' +
      'any car — and bring the package to the marina. Don\u2019t keep him waiting.',
    stages: [
      stage('goto', PLACES.cafe, 'Get to Caf\u00e9 Lumen and pick up the package.', 9),
      stage('goto', PLACES.marina, 'Deliver the package to the marina pier.', 10),
      stage('done', null, 'Package delivered. Venn is watching — and paying.', 0),
    ],
  },
  {
    id: 'hot-wheels',
    title: 'MISSION 2 — HOT WHEELS',
    reward: 900,
    briefing: 'A Coral Coupe is parked by Solmar Tower — Venn wants it in his ' +
      'garage tonight. Steal it. The cops will notice. Lose them, then bring ' +
      'the car to Venn\u2019s Garage.',
    stages: [
      stage('steal', PLACES.tower, 'Steal the Coral Coupe parked by Solmar Tower. (Walk up and press E.)', 8, { carKind: 'sport' }),
      stage('escape', PLACES.garage, 'Lose the police, then deliver the car to Venn\u2019s Garage.', 12, { needWanted: 0 }),
      stage('done', null, 'The Coupe is Venn\u2019s now. One more job to go.', 0),
    ],
  },
  {
    id: 'sunset-score',
    title: 'MISSION 3 — THE SUNSET SCORE',
    reward: 2500,
    briefing: 'Venn\u2019s ledger is in the Sunset Warehouse, guarded by his own ' +
      'crew. Take it back, by force if you have to, and get it to Mara\u2019s ' +
      'safehouse. This ends the debt.',
    stages: [
      stage('fight', PLACES.warehouse, 'Clear the warehouse crew and grab the ledger.', 16, { enemies: 4 }),
      stage('goto', PLACES.safehouse, 'Bring the ledger home to the safehouse.', 10),
      stage('done', null, 'The debt is done. Solmar is yours now, Mara.', 0),
    ],
  },
  {
    id: 'harbor-lights',
    title: 'MISSION 4 — HARBOR LIGHTS',
    reward: 1200,
    briefing: 'The debt is paid, but Venn doesn\u2019t forgive. His enforcers ' +
      'are shaking down the dockworkers at North Harbor for "protection" ' +
      'money. Go up there, clear them out, and bring the cash box back to ' +
      'Leo at the garage. The harbor belongs to Solmar, not to Venn.',
    stages: [
      stage('goto', PLACES.harbor, 'Get to North Harbor — the enforcers are by the containers.', 18),
      stage('fight', PLACES.harbor, 'Clear the enforcers and grab the cash box.', 20, { enemies: 3 }),
      stage('timed', PLACES.garage, 'Get the cash box to Leo before Venn\u2019s men regroup — 100 seconds.', 12, { timeLimit: 100 }),
      stage('done', null, 'The dockworkers keep their pay. Venn is losing his grip.', 0),
    ],
  },
  {
    id: 'the-last-collector',
    title: 'MISSION 5 — THE LAST COLLECTOR',
    reward: 4000,
    briefing: 'Venn\u2019s last collector is fleeing Solmar with the garage ' +
      'deed in an armored truck, heading for the Freight Yard. Chase the ' +
      'truck down — stay on its tail until the driver gives up — then bring ' +
      'the deed home. After this, Venn has nothing left to collect.',
    stages: [
      stage('goto', PLACES.freight, 'The collector\u2019s truck is leaving the Freight Yard. Get after it.', 18),
      stage('chase', PLACES.freight, 'Stay on the truck\u2019s tail until the driver gives up.', 0),
      stage('goto', PLACES.safehouse, 'Bring the garage deed home to the safehouse.', 10),
      stage('done', null, 'The deed is yours. Venn is finished in Solmar.', 0),
    ],
  },
  {
    id: 'southern-comfort',
    title: 'MISSION 6 — SOUTHERN COMFORT',
    reward: 5000,
    briefing: 'Venn isn\u2019t done. His men are leaning on the Palmera ' +
      'Resort down south, shaking the guests for "protection" money and ' +
      'holding the guest ledger. Get to the resort, clear his guards out ' +
      'of the pool deck, then bring word to the airport terminal — Venn ' +
      'has a courier flying out tonight.',
    stages: [
      stage('goto', PLACES.resort, 'Get to the Palmera Resort in South Solmar.', 20),
      stage('clear', PLACES.resort, 'Clear Venn\u2019s guards off the pool deck.', 22, { enemies: 4 }),
      stage('goto', PLACES.terminal, 'Get to the airport terminal — Venn\u2019s courier flies out tonight.', 14),
      stage('done', null, 'The resort breathes again. Venn\u2019s courier never made the flight.', 0),
    ],
  },
  {
    id: 'runway-run',
    title: 'MISSION 7 — RUNWAY RUN',
    reward: 6000,
    briefing: 'Venn is smuggling cash out of Solmar in his fuel truck, ' +
      'parked on the airport apron. Steal it — the fuel truck is slow, ' +
      'but it\u2019s heavy enough to push through anything. Lose the cops, ' +
      'then bring it to Leo at the garage. The airport never saw it leave.',
    stages: [
      stage('goto', PLACES.airport, 'Venn\u2019s fuel truck is on the airport apron. Get there.', 18),
      stage('steal', PLACES.airport, 'Steal the fuel truck parked by the terminal. (Walk up and press E.)', 10, { carKind: 'truck' }),
      stage('escape', PLACES.garage, 'Lose the police, then deliver the fuel truck to Venn\u2019s Garage.', 12, { needWanted: 0 }),
      stage('done', null, 'The smuggling cash is yours. Venn\u2019s airport route is closed.', 0),
    ],
  },
  {
    id: 'the-last-flight',
    title: 'MISSION 8 — THE LAST FLIGHT',
    reward: 10000,
    briefing: 'It ends tonight. Venn himself is leaving Solmar on a ' +
      'private jet from Runway 27, and his last guards hold the ' +
      'terminal. Clear them out, then run the runway before the plane ' +
      'takes off. If Venn leaves Solmar, he comes back. Don\u2019t let him.',
    stages: [
      stage('goto', PLACES.terminal, 'Venn is at the airport terminal. Get there.', 16),
      stage('clear', PLACES.terminal, 'Clear Venn\u2019s last guards from the terminal.', 20, { enemies: 6 }),
      stage('timed', PLACES.runway, 'Run the runway — stop Venn\u2019s plane before it takes off. 90 seconds.', 14, { timeLimit: 90 }),
      stage('done', null, 'Venn\u2019s plane never left the runway. Solmar is yours now, Mara — for real this time.', 0),
    ],
  },
  {
    id: 'campus-heist',
    title: 'MISSION 9 — CAMPUS HEIST',
    reward: 7500,
    briefing: 'Venn is gone, but his money isn\u2019t: Rocco\u2019s crew is ' +
      'moving Venn\u2019s old cash through Solmar University, and the ' +
      'students are paying for it. Get to the campus, clear Rocco\u2019s ' +
      'men off the quad, then get to the stadium — the crew keeps its ' +
      'books there, and the books are worth more than the cash.',
    stages: [
      stage('goto', PLACES.campus, 'Get to Solmar University in East Solmar.', 20),
      stage('clear', PLACES.campus, 'Clear Rocco\u2019s crew off the university quad.', 24, { enemies: 5 }),
      stage('goto', PLACES.stadium, 'Get to Solmar Stadium — Rocco\u2019s crew keeps its books there.', 16),
      stage('done', null, 'The quad is quiet again. Rocco\u2019s books are next.', 0),
    ],
  },
  {
    id: 'marina-run',
    title: 'MISSION 10 — MARINA RUN',
    reward: 8500,
    briefing: 'Rocco\u2019s cash is moving by water now — a courier boat ' +
      'runs the bay at night. Take a boat from the dockside pier, run ' +
      'the lighthouse buoy and the harbor-mouth buoy, and bring the ' +
      'courier\u2019s drop back to the safehouse. Rocco\u2019s patrol boats ' +
      'will try to run you down. The bay is yours if you are faster.',
    stages: [
      stage('goto', PLACES.marina, 'Get to the marina pier and board a boat. (Walk up and press E.)', 12),
      stage('boat', PLACES.buoy, 'Run the lighthouse buoy — stay in the boat.', 14),
      stage('boat', PLACES.buoySouth, 'Now the harbor-mouth buoy — Rocco\u2019s patrol boats are coming.', 14),
      stage('goto', PLACES.safehouse, 'Bring the courier\u2019s drop home to the safehouse.', 10),
      stage('done', null, 'The bay run is done. Rocco\u2019s water route is closed.', 0),
    ],
  },
  {
    id: 'stadium-finale',
    title: 'MISSION 11 — THE STADIUM FINALE',
    reward: 15000,
    briefing: 'It ends where the city watches. Rocco himself is at ' +
      'Solmar Stadium with his whole crew and the stadium takings, ' +
      'counting the money he took from Solmar. Clear the stadium, ' +
      'take Rocco down, and get the takings to the mall vault before ' +
      'his crew regroups. After this, nobody owns Solmar but Solmar.',
    stages: [
      stage('goto', PLACES.stadium, 'Rocco is at Solmar Stadium. Get there — through the south gate.', 18),
      stage('clear', PLACES.stadium, 'Clear Rocco\u2019s crew from the stadium — and take Rocco down.', 26, { enemies: 6 }),
      stage('timed', { x: 320, z: 40, name: 'Solmar Mall' }, 'Get the stadium takings to the mall vault before Rocco\u2019s crew regroups — 90 seconds.', 12, { timeLimit: 90 }),
      stage('done', null, 'Rocco is down, the takings are safe, and Solmar is finally free. The city is yours, Mara.', 0),
    ],
  },
  {
    id: 'venns-ledger',
    title: 'MISSION 12 — VENN\u2019S LEDGER',
    reward: 12000,
    briefing: 'Venn is gone, but his books aren\u2019t: a second ledger ' +
      'sits in his old downtown office above Solmar Tower, and the ' +
      'names in it would buy the whole PD. Get to the office, get ' +
      'through the locked door — Nix pops it open on sight, anyone ' +
      'else has to work the lock for ten seconds — clear the guards ' +
      'inside, and bring the ledger home. The city deserves to know ' +
      'who Venn owned.',
    stages: [
      stage('goto', PLACES.office, 'Venn\u2019s old office is above Solmar Tower. Get there.', 20),
      stage('hack', PLACES.office, 'Get through the locked office door — Nix opens it instantly, otherwise hold the lock for 10 seconds.', 14),
      stage('clear', PLACES.office, 'Clear Venn\u2019s guards from the office and grab the second ledger.', 16, { enemies: 4 }),
      stage('goto', PLACES.safehouse, 'Bring the ledger home to the safehouse.', 10),
      stage('done', null, 'The second ledger is yours. Venn owned half the city — now the city owns the proof.', 0),
    ],
  },
  {
    id: 'the-long-con',
    title: 'MISSION 13 — THE LONG CON',
    reward: 18000,
    briefing: 'The last of Rocco\u2019s money is in the casino vault at ' +
      'the Palmera Resort, and his men are guarding it like it is ' +
      'theirs — because it was. Walk in through the casino door, ' +
      'clear the vault guards, and run the takings to the mall vault ' +
      'before the crew regroups. Ninety seconds, one bag, and Solmar ' +
      'is done paying for other people\u2019s crimes.',
    stages: [
      stage('goto', PLACES.casino, 'Rocco\u2019s last money is in the casino vault at the resort. Get there.', 22),
      stage('clear', PLACES.casino, 'Clear Rocco\u2019s vault guards from the casino floor.', 22, { enemies: 5 }),
      stage('timed', { x: 320, z: 40, name: 'Solmar Mall' }, 'Run the casino takings to the mall vault before the crew regroups — 90 seconds.', 12, { timeLimit: 90 }),
      stage('done', null, 'The long con is over. Every dollar Venn and Rocco ever took is back where it belongs.', 0),
    ],
  },
  {
    id: 'the-last-sunset',
    title: 'MISSION 14 — THE LAST SUNSET',
    reward: 25000,
    briefing: 'Venn\u2019s heir has taken the stadium bowl and put a price ' +
      'on Mara\u2019s head. Take the bowl back at sunset, and Solmar is ' +
      'hers for good. His crew is five strong, and the heir himself ' +
      'fights like Venn did — fast, and with no mercy.',
    stages: [
      stage('goto', PLACES.stadium, 'Venn\u2019s heir is holding the stadium bowl. Get there before sunset.', 24),
      stage('clear', PLACES.stadium, 'Clear the bowl — five of the heir\u2019s crew, and the heir himself, are waiting.', 26, { enemies: 6 }),
      stage('timed', PLACES.safehouse, 'Run home to the safehouse in two minutes — the PD heard every shot.', 16, { timeLimit: 120 }),
      stage('done', null, 'The last sunset. Solmar is Mara\u2019s again.', 0),
    ],
  },
  {
    id: 'night-shift',
    title: 'MISSION 15 — NIGHT SHIFT',
    reward: 16000,
    briefing: 'Venn\u2019s old boys never left the nightclub — they run ' +
      'Club Neon like a till with a dance floor, and the door money ' +
      'still flows to his heirs. Take the club back: get to the door, ' +
      'clear his enforcers off the floor, and bring the club\u2019s books ' +
      'home. After this, the club is Mara\u2019s to buy — and to keep.',
    stages: [
      stage('goto', PLACES.nightclub, 'Get to Club Neon downtown — Venn\u2019s old boys hold the door.', 18),
      stage('clear', PLACES.nightclub, 'Clear Venn\u2019s enforcers off the club floor — five of them, and the bouncer is the biggest.', 22, { enemies: 6 }),
      stage('goto', PLACES.safehouse, 'Bring the club\u2019s books home to the safehouse.', 10),
      stage('done', null, 'The club is free. The deed is for sale now — and Mara knows the price.', 0),
    ],
  },
  {
    id: 'harbor-job',
    title: 'MISSION 16 — THE HARBOR JOB',
    reward: 20000,
    briefing: 'The last of Venn\u2019s money sits in the cannery office ' +
      'at North Harbor, guarded by the men who never got the message ' +
      'that he is gone. Clear the office, then run the cash to the ' +
      'marina pier before his crew regroups — a hundred seconds, one ' +
      'bag, and Solmar is done paying for other people\u2019s crimes.',
    stages: [
      stage('goto', PLACES.harbor, 'The last of Venn\u2019s money is in the cannery office at North Harbor. Get there.', 20),
      stage('clear', PLACES.harbor, 'Clear Venn\u2019s guards from the cannery office — five of them, and they know the money is theirs.', 22, { enemies: 5 }),
      stage('timed', PLACES.marina, 'Run the harbor cash to the marina pier before Venn\u2019s crew regroups — 100 seconds.', 12, { timeLimit: 100 }),
      stage('done', null, 'The harbor job is done. Every dollar Venn ever took is back where it belongs — and Solmar is free.', 0),
    ],
  },
  {
    id: 'safehouse-siege',
    title: 'MISSION 17 — SAFEHOUSE SIEGE',
    reward: 20000,
    briefing: 'Rocco\\u2019s last crew never got the message that he is ' +
      'gone — they are hitting the safehouse tonight, six of them, ' +
      'looking for the ledgers and for Mara. Hold the door, clear the ' +
      'yard, and take their stash to Leo at the garage. After this, ' +
      'there is no crew left in Solmar to come for her.',
    stages: [
      stage('goto', PLACES.safehouse, 'Rocco\\u2019s last crew is hitting the safehouse — get home, fast.', 14),
      stage('clear', PLACES.safehouse, 'Hold the safehouse — six of Rocco\\u2019s last crew in the yard, and the big one does not fall easy.', 24, { enemies: 6 }),
      stage('goto', PLACES.garage, 'Take the crew\\u2019s stash to Leo at the garage.', 10),
      stage('done', null, 'The siege is broken. No crew is left in Solmar to come for Mara — and the stash pays for the next paint job.', 0),
    ],
  },
  {
    id: 'sunset-streets',
    title: 'MISSION 18 — SUNSET STREETS',
    reward: 30000,
    briefing: 'One last boat is leaving the marina at sunset with the ' +
      'final bag of Venn\\u2019s money, and four of his guards are ' +
      'waiting on the pier to see it off. Take the boat out to the ' +
      'lighthouse buoy, come back, clear the pier, and bring the bag ' +
      'home to the safehouse before dark. Eighteen jobs, and then the ' +
      'city is hers — every street, every sunset, every dollar.',
    stages: [
      stage('goto', PLACES.marina, 'The last boat leaves the marina at sunset. Get to the pier and board it.', 14),
      stage('boat', PLACES.buoy, 'Run the lighthouse buoy — stay in the boat, the bay is the road.', 16),
      stage('clear', PLACES.marina, 'The pier guards are waiting — four of Venn\\u2019s men between Mara and the final bag.', 22, { enemies: 4 }),
      stage('timed', PLACES.safehouse, 'Bring the final bag home to the safehouse before dark — 120 seconds.', 12, { timeLimit: 120 }),
      stage('done', null, 'Eighteen jobs done. The last bag is home, the sun is setting over the marina, and Solmar belongs to Mara Voss.', 0),
    ],
  },
  {
    id: 'the-lighthouse',
    title: 'MISSION 19 — THE LIGHTHOUSE',
    reward: 35000,
    briefing: 'Leo\u2019s old crew is waiting offshore for a signal — ' +
      'three of Venn\u2019s smugglers hold the dockside pier and the ' +
      'lighthouse is dark. Take a boat out to the lighthouse buoy and ' +
      'light the signal, come back, clear the pier, and bring word ' +
      'home before the PD works out what the light means.',
    stages: [
      stage('goto', PLACES.marina, 'The signal boat waits at the marina pier. Get there and board it.', 14),
      stage('boat', PLACES.buoy, 'Run the lighthouse buoy and light the signal — stay in the boat, the bay is the road.', 16),
      stage('clear', PLACES.marina, 'The pier smugglers are waiting — three of Venn\u2019s men between Mara and the dock.', 22, { enemies: 3, variant: 'smuggler' }),
      stage('timed', PLACES.safehouse, 'Bring word home to the safehouse before the PD works out what the light meant — 120 seconds.', 12, { timeLimit: 120 }),
      stage('done', null, 'The light is lit. Leo\u2019s old crew is coming home, and Solmar is watching the bay.', 0),
    ],
  },
  {
    id: 'sunset-streets-2',
    title: 'MISSION 20 — SUNSET STREETS II',
    reward: 40000,
    briefing: 'One last run, and the city pays for all of it. Venn\u2019s ' +
      'last loyalists are holding the plaza at sunset, six of them, ' +
      'with the last of his money in a bag by the fountain. Clear the ' +
      'plaza, take the bag to Leo at the garage, and the story is over: ' +
      'twenty jobs, every street, every sunset, every dollar.',
    stages: [
      stage('goto', PLACES.plaza, 'Venn\u2019s last loyalists are holding the plaza at sunset. Get there.', 18),
      stage('clear', PLACES.plaza, 'Clear the plaza — six loyalists, and the bag by the fountain is the last of Venn\u2019s money.', 24, { enemies: 6 }),
      stage('timed', PLACES.garage, 'Take the last bag to Leo at the garage before the PD locks the plaza down — 100 seconds.', 12, { timeLimit: 100 }),
      stage('done', null, 'Twenty jobs done. The last bag is Leo\u2019s, the sun is setting over Solmar, and the streets belong to Mara Voss.', 0),
    ],
  },
  {
    id: 'the-long-sunset',
    title: 'MISSION 21 — THE LONG SUNSET',
    reward: 45000,
    briefing: 'The resort guards still fly Venn\u2019s colors, and the pool ' +
      'house is the last place his men hold on the south side. Take it ' +
      'back, then come home before the sun is gone — the resort is ' +
      'yours now, every room, every table, every sunset.',
    stages: [
      stage('goto', PLACES.resort, 'Drive to the Palmera Resort — the pool house is the last place Venn\u2019s men hold.', 14),
      stage('clear', PLACES.resort, 'Clear the resort guards — four of them, and they know the pool house better than you do.', 22, { enemies: 4 }),
      stage('timed', PLACES.safehouse, 'Get back to the safehouse before the sun sets — 120 seconds, and the resort is behind you.', 12, { timeLimit: 120 }),
      stage('done', null, 'The pool house is quiet. The resort is yours now — every room, every table, every sunset.', 0),
    ],
  },
  {
    id: 'solmar-forever',
    title: 'MISSION 22 — SOLMAR FOREVER',
    reward: 50000,
    briefing: 'Rocco\u2019s runners are on the plaza, daring you to come and ' +
      'take it, six of them, in front of the whole city. The crowd will ' +
      'remember who stood there when it was over — make it you.',
    stages: [
      stage('goto', PLACES.plaza, 'Venn\u2019s last loyalists are holding the plaza at sunset. Get there.', 18),
      stage('clear', PLACES.plaza, 'Clear the plaza — six runners, and the crowd will remember who stood there when it was over.', 24, { enemies: 6 }),
      stage('timed', PLACES.garage, 'Take the last bag to Leo at the garage before the PD locks the plaza down — 100 seconds.', 12, { timeLimit: 100 }),
      stage('goto', PLACES.safehouse, 'Home to the safehouse. The plaza is yours, the crew is yours, Solmar is yours.', 12),
      stage('done', null, 'The plaza cheered. Solmar knows your name now — and it is not Venn\u2019s anymore.', 0),
    ],
  },
  {
    id: 'the-bay-run',
    title: 'MISSION 23 — THE BAY RUN',
    reward: 55000,
    briefing: 'Smugglers run the lighthouse road after dark, and they pay ' +
      'the lamp keeper to look away. Take a boat out under the lamp, ' +
      'end the run at the marina, and bring the bay home before the ' +
      'PD works out what the light means.',
    stages: [
      stage('boat', PLACES.buoy, 'Take a boat out to the lighthouse buoy — the smugglers\u2019 skiffs cross right under the lamp.', 16),
      stage('clear', PLACES.marina, 'Clear the marina smugglers — three of them, fast on the trigger, light on health.', 22, { enemies: 3, variant: 'smuggler' }),
      stage('timed', PLACES.dockside, 'Back to the dockside pier in 90 seconds — the lamp is lit, and the bay is watching.', 12, { timeLimit: 90 }),
      stage('done', null, 'The bay is quiet. No more skiffs, no more lamp keeper\u2019s bribes — just the water and the light.', 0),
    ],
  },
  {
    id: 'epilogue-comet-gt',
    title: 'MISSION 24 — EPILOGUE: THE COMET GT',
    reward: 75000,
    briefing: 'One last job, and it is the car itself: take the Comet GT ' +
      'across the whole city, through Rocco\u2019s last men at the ' +
      'terminal, and bring it home gold. Twenty-four jobs, one city, ' +
      'one car — and all of it yours.',
    stages: [
      stage('goto', PLACES.terminal, 'Drive the Comet GT to the airport terminal — Rocco\u2019s last men are waiting where the planes leave.', 14),
      stage('clear', PLACES.terminal, 'Clear the terminal guards — four of them, and the last flight out is not for you.', 22, { enemies: 4 }),
      stage('timed', PLACES.garage, 'Back to the garage in 120 seconds — Leo is waiting with the gold paint and the keys.', 12, { timeLimit: 120 }),
      stage('goto', PLACES.safehouse, 'Home to the safehouse in the Comet GT. Twenty-four jobs. One city. Yours.', 12),
      stage('done', null, 'The Comet GT is gold, the garage is full, and Solmar is yours. Mara Voss — Sunset Streets.', 0),
    ],
  },
  {
    id: 'the-gold-standard',
    title: 'MISSION 25 — THE GOLD STANDARD',
    reward: 80000,
    briefing: 'The gold paint is on the car, but the city still tests ' +
      'its driver: the casino owes Mara a debt, and the tables pay it ' +
      'in one run. Take the Comet GT to the casino, clear the floor, ' +
      'and bring the marker home.',
    stages: [
      stage('goto', PLACES.casino, 'Drive the Comet GT to the Solmar Casino — the tables owe you a marker.', 14),
      stage('clear', PLACES.casino, 'Clear the casino floor — four guards, and the high rollers are watching.', 22, { enemies: 4 }),
      stage('timed', PLACES.garage, 'Back to the garage in 120 seconds — the marker is worth more than the drive.', 12, { timeLimit: 120 }),
      stage('done', null, 'The marker is Leo\u2019s. The casino pays its debts now — to you.', 0),
    ],
  },
  {
    id: 'sunset-forever',
    title: 'MISSION 26 — SUNSET FOREVER',
    reward: 90000,
    briefing: 'The airport is where every story in Solmar ends, and ' +
      'this one ends with you staying. Rocco\u2019s last plane is on ' +
      'the runway, and his last men are guarding the terminal door.',
    stages: [
      stage('goto', PLACES.terminal, 'Drive to the airport terminal — the last plane out is boarding.', 14),
      stage('clear', PLACES.terminal, 'Clear the terminal — four of Rocco\u2019s last men, and none of them are flying.', 22, { enemies: 4 }),
      stage('timed', PLACES.safehouse, 'Home to the safehouse in 120 seconds — the plane leaves without them.', 12, { timeLimit: 120 }),
      stage('done', null, 'The plane left. You stayed. Solmar is yours, and it always was.', 0),
    ],
  },
  {
    id: 'the-last-crew',
    title: 'MISSION 27 — THE LAST CREW',
    reward: 100000,
    briefing: 'Every crew in Solmar has had its say, and now there is ' +
      'one left: yours. The harbor is where crews are made — take ' +
      'the cannery, hold the docks, and the harbor flies your colors.',
    stages: [
      stage('goto', PLACES.harbor, 'Drive to the North Harbor — the cannery is where crews are made.', 14),
      stage('clear', PLACES.harbor, 'Clear the harbor — five enforcers, and the docks will remember the day.', 24, { enemies: 5 }),
      stage('timed', PLACES.garage, 'Back to the garage in 100 seconds — the harbor flies your colors now.', 12, { timeLimit: 100 }),
      stage('done', null, 'The cannery is quiet. The harbor is yours, and the crews answer to you.', 0),
    ],
  },
  {
    id: 'king-of-solmar',
    title: 'MISSION 28 — KING OF SOLMAR',
    reward: 110000,
    briefing: 'They call it the king\u2019s run: the plaza, the stadium, ' +
      'and the mall, one after the other, with the whole city ' +
      'watching. Finish it and there is no one left to argue with.',
    stages: [
      stage('goto', PLACES.plaza, 'Start the king\u2019s run at Solmar Plaza — the whole city is watching.', 18),
      stage('clear', PLACES.stadium, 'Clear the stadium — six rivals, and the bowl will roar for the winner.', 24, { enemies: 6, variant: 'rival' }),
      stage('timed', PLACES.mall, 'To the mall in 90 seconds — the king\u2019s run does not wait for traffic.', 12, { timeLimit: 90 }),
      stage('goto', PLACES.safehouse, 'Home to the safehouse. The king\u2019s run is done, and the crown fits.', 12),
      stage('done', null, 'King of Solmar. The plaza, the stadium, the mall — all of it, all yours.', 0),
    ],
  },
  {
    id: 'the-long-way-home',
    title: 'MISSION 29 — THE LONG WAY HOME',
    reward: 120000,
    briefing: 'The resort, the marina, and the dockside pier — the long ' +
      'way home, past every place the story started. One more run, ' +
      'one more crew, and the sun sets on the whole of it.',
    stages: [
      stage('goto', PLACES.resort, 'Start the long way home at the Palmera Resort — the pool is warm, the guards are not.', 14),
      stage('clear', PLACES.resort, 'Clear the resort — four guards, and the pool house is the last holdout.', 22, { enemies: 4 }),
      stage('boat', PLACES.buoy, 'Take a boat out to the lighthouse buoy — the long way home crosses the bay.', 16),
      stage('timed', PLACES.safehouse, 'Home to the safehouse in 120 seconds — the long way home ends at your own door.', 12, { timeLimit: 120 }),
      stage('done', null, 'The long way home is done. Every street, every sunset, every dollar — home.', 0),
    ],
  },
  {
    id: 'the-comets-shadow',
    title: 'MISSION 30 — THE COMET\u2019S SHADOW',
    reward: 130000,
    briefing: 'The Comet GT casts a long shadow, and Rocco\u2019s last ' +
      'shadow crew hides in it: the freight yard, the warehouse, and ' +
      'the cannery, one after the other, in the dark.',
    stages: [
      stage('goto', PLACES.freight, 'Drive to the Freight Yard — the shadow crew hides between the trucks.', 14),
      stage('clear', PLACES.freight, 'Clear the freight yard — five enforcers, and the trucks are not moving.', 24, { enemies: 5 }),
      stage('goto', PLACES.warehouse, 'To the Sunset Warehouse — the shadow crew\u2019s last bolt-hole.', 14),
      stage('clear', PLACES.warehouse, 'Clear the warehouse — four rivals, and the shadow is yours now.', 22, { enemies: 4 }),
      stage('timed', PLACES.garage, 'Back to the garage in 100 seconds — the Comet\u2019s shadow belongs to you.', 12, { timeLimit: 100 }),
      stage('done', null, 'The shadow is yours. The Comet GT drives in the light now — and so do you.', 0),
    ],
  },
  {
    id: 'every-street',
    title: 'MISSION 31 — EVERY STREET',
    reward: 140000,
    briefing: 'Every street in Solmar, one last time: the campus, the ' +
      'mall, and the plaza, with the clock running and the city ' +
      'cheering. This is the run the whole game was building to.',
    stages: [
      stage('goto', PLACES.campus, 'Start at the university — the students are out, and the quad is yours.', 14),
      stage('clear', PLACES.campus, 'Clear the campus — four rivals, and the lecture halls will talk about it.', 22, { enemies: 4 }),
      stage('goto', PLACES.mall, 'To the mall — the vault run starts at the food court, and so does this one.', 14),
      stage('clear', PLACES.mall, 'Clear the mall — five guards, and the shops are closing for you.', 24, { enemies: 5 }),
      stage('timed', PLACES.plaza, 'To the plaza in 90 seconds — every street, every sunset, every dollar.', 12, { timeLimit: 90 }),
      stage('done', null, 'Every street. Every sunset. Every dollar. Solmar is yours — all of it.', 0),
    ],
  },
  {
    id: 'solmar-forever-2',
    title: 'MISSION 32 — SOLMAR, FOREVER',
    reward: 150000,
    briefing: 'The last job of all: the lighthouse, the plaza, and ' +
      'home, in one run, at sunset. Thirty-two jobs, and this one ' +
      'pays for all of them — because it is the one that ends the ' +
      'story, and starts the legend.',
    stages: [
      stage('boat', PLACES.buoy, 'Take a boat out to the lighthouse buoy one last time — light the signal for the whole city.', 16),
      stage('goto', PLACES.plaza, 'To the plaza — the whole city is out, and the sun is setting on Solmar.', 18),
      stage('clear', PLACES.plaza, 'Clear the plaza one last time — six loyalists, and the legend is written tonight.', 24, { enemies: 6, variant: 'rival' }),
      stage('timed', PLACES.safehouse, 'Home to the safehouse in 120 seconds — the story ends at your own door.', 12, { timeLimit: 120 }),
      stage('done', null, 'Thirty-two jobs. One city. One legend. Mara Voss — Sunset Streets, forever.', 0),
    ],
  },
  {
    id: 'quiet-harbor',
    title: 'MISSION 33 — THE QUIET HARBOR',
    reward: 160000,
    briefing: 'The story was supposed to be over — but the harbor never ' +
      'sleeps, and neither do Venn\u2019s smugglers. A sting at the North ' +
      'Harbor, quiet as the water at 3 a.m., and the ledger finally closes.',
    stages: [
      stage('goto', PLACES.harbor, 'Drive to the North Harbor — the smugglers run the quiet hours, and the quiet hours start now.', 14),
      stage('clear', PLACES.harbor, 'Clear the harbor — five smugglers, and the containers are not talking.', 24, { enemies: 5, variant: 'smuggler' }),
      stage('goto', PLACES.cannery, 'To the cannery — the sting\u2019s second room, and the second crew.', 14),
      stage('clear', PLACES.cannery, 'Clear the cannery — four smugglers, and the line stops here.', 22, { enemies: 4, variant: 'smuggler' }),
      stage('timed', PLACES.safehouse, 'Home to the safehouse in 120 seconds — the quiet harbor stays quiet.', 12, { timeLimit: 120 }),
      stage('done', null, 'The harbor is quiet. The smugglers are done. The ledger is one line shorter.', 0),
    ],
  },
  {
    id: 'neon-nights',
    title: 'MISSION 34 — NEON NIGHTS',
    reward: 170000,
    briefing: 'Rocco\u2019s last friends want Club Neon back, and they are ' +
      'coming through the door tonight. Hold the club, hold the night, ' +
      'and hold the door — the neon stays lit, and it stays Mara\u2019s.',
    stages: [
      stage('goto', PLACES.nightclub, 'Get to Club Neon — the takeover starts at the door, and the door is yours.', 12),
      stage('clear', PLACES.nightclub, 'Clear the club — six bouncers who are not yours, and the dance floor is the last holdout.', 22, { enemies: 6, variant: 'bouncer' }),
      stage('goto', PLACES['neon-alley'], 'To Neon Alley — the takeover crew\u2019s backup, waiting behind the food carts.', 12),
      stage('clear', PLACES['neon-alley'], 'Clear the alley — four rivals, and the carts keep serving.', 20, { enemies: 4, variant: 'rival' }),
      stage('timed', PLACES.garage, 'Back to the garage in 100 seconds — the neon stays lit, and it stays yours.', 12, { timeLimit: 100 }),
      stage('done', null, 'Neon nights. Your club, your door, your city — and the neon never blinks.', 0),
    ],
  },
  {
    id: 'long-road-home',
    title: 'MISSION 35 — THE LONG ROAD HOME',
    reward: 180000,
    briefing: 'One more long road, from the campus to the bay and home: ' +
      'the university, the lighthouse buoy, and the safehouse door, with ' +
      'the clock running the whole way. The longest road home is the ' +
      'one you have already driven a hundred times.',
    stages: [
      stage('goto', PLACES.campus, 'Start at the university — the students are out, and the quad is yours one more time.', 14),
      stage('clear', PLACES.campus, 'Clear the campus — four rivals, and the lecture halls will talk about it again.', 22, { enemies: 4, variant: 'rival' }),
      stage('boat', PLACES.buoy, 'Take a boat out to the lighthouse buoy — the long road home crosses the bay.', 16),
      stage('goto', PLACES.marina, 'To the marina — the last stop before home, and the pier is not empty.', 14),
      stage('clear', PLACES.marina, 'Clear the marina — five smugglers, and the boats stay in the water.', 22, { enemies: 5, variant: 'smuggler' }),
      stage('timed', PLACES.safehouse, 'Home to the safehouse in 120 seconds — the long road home ends at your own door.', 12, { timeLimit: 120 }),
      stage('done', null, 'The long road home is done. Every street, every sunset, every dollar — home.', 0),
    ],
  },
  {
    id: 'solmar-after-dark',
    title: 'MISSION 36 — SOLMAR AFTER DARK',
    reward: 200000,
    briefing: 'The last job of all, after dark: the lighthouse, the ' +
      'plaza, and home, in one run, under the city lights. Thirty-six ' +
      'jobs, and this one pays for all of them — because it is the one ' +
      'that ends the story, and starts the legend, after dark.',
    stages: [
      stage('boat', PLACES.buoy, 'Take a boat out to the lighthouse buoy one last time — light the signal for the whole city, after dark.', 16),
      stage('goto', PLACES.plaza, 'To the plaza — the whole city is out under the lights, and the sun has set on Solmar.', 18),
      stage('clear', PLACES.plaza, 'Clear the plaza one last time — six loyalists, and the legend is written tonight.', 24, { enemies: 6, variant: 'rival' }),
      stage('goto', PLACES.tower, 'To Solmar Tower — the last rooftop, the last crew, the last light in the city.', 14),
      stage('clear', PLACES.tower, 'Clear the tower — five guards, and the skyline belongs to you.', 22, { enemies: 5, variant: 'guard' }),
      stage('timed', PLACES.safehouse, 'Home to the safehouse in 120 seconds — the story ends at your own door, after dark.', 12, { timeLimit: 120 }),
      stage('done', null, 'Thirty-six jobs. One city. One legend. Mara Voss — Sunset Streets, after dark, forever.', 0),
    ],
  },
  {
    id: 'the-last-ledger',
    title: 'MISSION 37 — THE LAST LEDGER',
    reward: 210000,
    briefing: 'After dark, the story keeps one page back: Venn\u2019s ' +
      'third ledger sits in a locked hangar at the airport, and the ' +
      'names in it would buy the whole city twice. Get to the hangar, ' +
      'work the lock — Nix pops it on sight, anyone else holds it for ' +
      'ten seconds — clear the guards inside, and bring the ledger ' +
      'home. The city deserves to know who Venn owned.',
    stages: [
      stage('goto', PLACES.airport, 'Venn\u2019s third ledger is in a locked hangar at the airport. Get there.', 18),
      stage('hack', PLACES.airport, 'Get through the locked hangar door — Nix opens it instantly, otherwise hold the lock for 10 seconds.', 14),
      stage('clear', PLACES.airport, 'Clear the hangar guards — four of them, and the ledger is worth more than the plane.', 20, { enemies: 4, variant: 'guard' }),
      stage('timed', PLACES.garage, 'Run the ledger to Leo at the garage before the PD locks the airport down — 120 seconds.', 12, { timeLimit: 120 }),
      stage('done', null, 'The third ledger is yours. Venn owned half the city — now the city owns the proof, all three copies of it.', 0),
    ],
  },
  {
    id: 'harbor-lights-2',
    title: 'MISSION 38 — HARBOR LIGHTS II',
    reward: 220000,
    briefing: 'The smugglers came back to the harbor at night, and ' +
      'they brought a boat this time: a courier skiff runs the bay ' +
      'under the lighthouse lamp, and the pier crew is waiting for ' +
      'it. Take a boat out, run the buoy, come back, clear the pier, ' +
      'and bring the drop home before the PD works out what the ' +
      'light means.',
    stages: [
      stage('goto', PLACES.marina, 'The courier skiff runs the bay tonight. Get to the marina pier and board a boat.', 14),
      stage('boat', PLACES.buoy, 'Run the lighthouse buoy — stay in the boat, the bay is the road, and the skiff is faster than you.', 16),
      stage('clear', PLACES.marina, 'The pier smugglers are waiting — three of Venn\u2019s men between Mara and the drop.', 22, { enemies: 3, variant: 'smuggler' }),
      stage('timed', PLACES.safehouse, 'Bring the drop home to the safehouse before the PD works out what the light meant — 120 seconds.', 12, { timeLimit: 120 }),
      stage('done', null, 'The skiff is gone, the pier is quiet, and the bay is Mara\u2019s again — for the second time.', 0),
    ],
  },
  {
    id: 'the-showroom-job',
    title: 'MISSION 39 — THE SHOWROOM JOB',
    reward: 230000,
    briefing: 'A rival collector has a midnight-black Comet GT — the ' +
      'one that got away — on display in his mall showroom, behind ' +
      'five guards who think a locked door is a plan. Take the mall ' +
      'back, drive the car out through the food court, and bring it ' +
      'to Leo at the garage. The showroom pays for itself.',
    stages: [
      stage('goto', PLACES.mall, 'The rival collector\u2019s showroom is in the mall — the midnight Comet GT is on display inside.', 16),
      stage('clear', PLACES.mall, 'Clear the showroom guards — five of them, and the car is worth more than the mall.', 24, { enemies: 5, variant: 'guard' }),
      stage('goto', PLACES.garage, 'Drive the midnight Comet GT to Leo at the garage — the showroom job pays for itself.', 12),
      stage('timed', PLACES.safehouse, 'Home to the safehouse in 100 seconds — the car is yours, the mall is quiet, and the night is young.', 12, { timeLimit: 100 }),
      stage('done', null, 'The midnight Comet GT is Leo\u2019s now. The showroom is empty, the collector is broke, and Solmar has one more rare.', 0),
    ],
  },
  {
    id: 'solmar-forever-2b',
    title: 'MISSION 40 — SOLMAR, FOREVER II',
    reward: 250000,
    briefing: 'The true final job: the lighthouse, the plaza, the ' +
      'tower and home, in one run, at sunset. Forty jobs, and this ' +
      'one pays for all of them — because it is the one that ends ' +
      'the story for good, and starts the legend for real.',
    stages: [
      stage('boat', PLACES.buoy, 'Take a boat out to the lighthouse buoy one last time — light the signal for the whole city.', 16),
      stage('goto', PLACES.plaza, 'To the plaza — the whole city is out, and the sun is setting on Solmar.', 18),
      stage('clear', PLACES.plaza, 'Clear the plaza one last time — six loyalists, and the legend is written tonight.', 24, { enemies: 6, variant: 'rival' }),
      stage('goto', PLACES.tower, 'To Solmar Tower — the last rooftop, the last crew, the last light in the city.', 14),
      stage('clear', PLACES.tower, 'Clear the tower — five guards, and the skyline belongs to you.', 22, { enemies: 5, variant: 'guard' }),
      stage('timed', PLACES.safehouse, 'Home to the safehouse in 120 seconds — the story ends at your own door.', 12, { timeLimit: 120 }),
      stage('done', null, 'Forty jobs. One city. One legend. Mara Voss — Sunset Streets, forever.', 0),
    ],
  },
];

export function currentMission(state) {
  return state.index < MISSIONS.length ? MISSIONS[state.index] : null;
}

export function currentStage(state) {
  const m = currentMission(state);
  return m ? m.stages[state.stage] : null;
}

// Advance the active stage when its condition is met. `world` carries the
// live facts the stage checks: player position, car, wanted level, enemies.
export function updateMissions(state, world, dt) {
  const m = currentMission(state);
  if (!m) {
    // Story done: free roam. Offer taxi fares on a cooldown.
    state.fareCooldown -= dt;
    if (!state.fare && state.fareCooldown <= 0) {
      state.fare = null; // fares are started by main.js near a pedestrian
    }
    return null;
  }
  const st = m.stages[state.stage];
  if (!st) return null;
  if (st.kind === 'goto') {
    const d = dist2D(world.px, world.pz, st.place.x, st.place.z);
    if (d < st.radius) return advance(state, m);
  }
  if (st.kind === 'steal') {
    if (world.stolenCar) return advance(state, m);
  }
  if (st.kind === 'escape') {
    const d = dist2D(world.px, world.pz, st.place.x, st.place.z);
    if (d < st.radius && world.wantedLevel <= (st.needWanted ?? 0)) {
      return advance(state, m);
    }
  }
  if (st.kind === 'fight') {
    if (world.enemiesLeft <= 0 && world.pickedLedger) return advance(state, m);
  }
  if (st.kind === 'clear') {
    // Like a fight, but no pickup: the stage ends when the crew the
    // main loop spawned for this stage is all down. world.crewDown is
    // only true once the crew existed, so the stage cannot complete
    // before the player has even met the guards.
    if (world.crewDown) return advance(state, m);
  }
  if (st.kind === 'chase') {
    // The truck gives up once Mara has stayed on its tail long enough.
    if (world.chaseDone) return advance(state, m);
  }
  if (st.kind === 'hack') {
    // A locked door: Nix the hacker pops it open the moment Mara is
    // close; anyone else has to work the lock for ten seconds, and
    // stepping away resets the channel.
    const d = dist2D(world.px, world.pz, st.place.x, st.place.z);
    if (d >= st.radius) {
      state.hackTimer = null;
      return null;
    }
    if (world.crewHacker) return advance(state, m);
    if (state.hackTimer == null) state.hackTimer = 10;
    state.hackTimer -= dt;
    if (state.hackTimer <= 0) {
      state.hackTimer = null;
      return advance(state, m);
    }
    return null;
  }
  if (st.kind === 'boat') {
    // A boat stage: Mara must be in a boat and reach the marker on the
    // water. On foot the stage cannot advance — the bay is the road.
    if (world.inBoat) {
      if (boatAtBuoy(world.px, world.pz, st.place, st.radius)) return advance(state, m);
    }
  }
  if (st.kind === 'timed') {
    // A timed delivery: the clock starts the first frame the stage is live.
    if (state.stageTimer == null) state.stageTimer = st.timeLimit ?? 60;
    state.stageTimer -= dt;
    const d = dist2D(world.px, world.pz, st.place.x, st.place.z);
    if (d < st.radius) {
      state.stageTimer = null;
      return advance(state, m);
    }
    if (state.stageTimer <= 0) {
      // Too slow: the job slips away and the mission restarts from stage 0.
      state.stageTimer = null;
      state.stage = 0;
      state.message = 'TOO SLOW — Venn\u2019s men regrouped. The job starts over.';
    }
  }
  if (st.kind === 'done') {
    return advance(state, m);
  }
  return null;
}

// Returns a completion event when a mission finishes: {mission, reward}.
function advance(state, mission) {
  state.stage += 1;
  if (state.stage >= mission.stages.length) {
    state.done[state.index] = true;
    const finished = mission;
    state.index += 1;
    state.stage = 0;
    return { mission: finished, reward: finished.reward };
  }
  return null;
}

export function missionObjectiveText(state) {
  const m = currentMission(state);
  if (!m) {
    if (state.fare) {
      return { title: 'TAXI FARE', text: 'Drop your passenger at the marker. $' + state.fare.pay + ' on delivery.' };
    }
    return { title: 'FREE ROAM', text: 'Solmar is yours. Steal cars, take fares, dodge the PD. Press T for the taxi rank — a cab to anywhere in town.' };
  }
  const st = m.stages[state.stage];
  return { title: m.title, text: st ? st.text : '' };
}

// Start a taxi fare: a nearby pedestrian wants a ride to a random place.
// Water places (the buoys, the pier) are never destinations — a cab
// cannot drop a passenger off in the bay.
export function startFare(state, fromX, fromZ, pay) {
  const spots = Object.values(PLACES).filter((p) => !p.water);
  const dest = spots[Math.floor(Math.random() * spots.length)];
  state.fare = {
    fromX, fromZ,
    toX: dest.x, toZ: dest.z,
    name: dest.name,
    pay,
    pickedUp: false,
  };
  return state.fare;
}

export function fareObjectiveText(fare) {
  if (!fare.pickedUp) return 'Pick up your passenger (walk close and press E).';
  return 'Drop your passenger at ' + fare.name + '.';
}

// Taxi fares pay more when Mara drives a real cab: the meter runs hot.
export function taxiFarePay(basePay, inTaxi) {
  return inTaxi ? Math.round(basePay * 1.5) : basePay;
}

// A fare to the harbor pays a dockworker's premium on top of the meter;
// airport and resort runs pay a tourist premium — the guests tip well.
// East Solmar runs pay a campus premium: students and match-day crowds
// tip for a driver who knows the east side.
export function farePayForDestination(basePay, destName, inTaxi) {
  let pay = taxiFarePay(basePay, inTaxi);
  if (destName === 'North Harbor' || destName === 'Freight Yard') pay += 60;
  if (destName === 'Solmar Airport' || destName === 'Solmar Terminal' || destName === 'Palmera Resort') pay += 80;
  if (destName === 'Solmar University' || destName === 'Solmar Stadium' || destName === 'Solmar Mall') pay += 70;
  if (destName === 'Mural Row') pay += 90; // tourists ride out to watch the walls go up, and they tip for the colour
  return pay;
}
