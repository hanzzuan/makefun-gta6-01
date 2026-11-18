// missions.js — the story of Solmar and its jobs.
// Mara Voss came home to save her brother's garage from Dario Venn, the
// fixer who owns half the marina. Three missions, then free roam with taxi
// fares and car theft to keep earning. Every mission is a small state
// machine: stages with a target point, a radius, and a line of story text.

import { PLACES } from './city.js';
import { dist2D } from './util.js';

export const STORY_INTRO =
  'Mara Voss is back in Solmar. Her brother Leo\u2019s garage owes Dario Venn ' +
  '$50,000, and Venn collects on Friday. Eight jobs stand between Mara and ' +
  'a clean slate — if the Solmar PD doesn\u2019t catch her first.';

export function makeMissionState() {
  return {
    index: 0, // which mission is active (0..7), 8 = story done
    stage: 0,
    done: [false, false, false, false, false, false, false, false],
    fare: null, // active taxi fare, if any
    fareCooldown: 8,
    message: '',
    messageTimer: 0,
    chaseTimer: 0, // seconds spent close behind Venn's truck, mission 5
    stageTimer: null, // seconds left on a timed stage, null when not timed
  };
}

// A mission stage: go somewhere, do something, or survive something.
function stage(kind, place, text, radius, extra) {
  return { kind, place, text, radius: radius || 10, ...(extra || {}) };
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
    return { title: 'FREE ROAM', text: 'Solmar is yours. Steal cars, take fares, dodge the PD.' };
  }
  const st = m.stages[state.stage];
  return { title: m.title, text: st ? st.text : '' };
}

// Start a taxi fare: a nearby pedestrian wants a ride to a random place.
export function startFare(state, fromX, fromZ, pay) {
  const spots = Object.values(PLACES);
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
export function farePayForDestination(basePay, destName, inTaxi) {
  let pay = taxiFarePay(basePay, inTaxi);
  if (destName === 'North Harbor' || destName === 'Freight Yard') pay += 60;
  if (destName === 'Solmar Airport' || destName === 'Solmar Terminal' || destName === 'Palmera Resort') pay += 80;
  return pay;
}
