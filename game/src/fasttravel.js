// fasttravel.js — the taxi rank's fast travel.
// Solmar is a big city, and sometimes Mara needs to be across town
// now: the taxi company runs a fast-travel rank. Pick a stop, pay the
// fare, and a cab drops her at the door — no driving, no PD, no fuss.
// The rank will not take her while the police are hard on her tail,
// while a timed job is running, or while she is mid-fare: a cab
// driver will not outrun a wanted level. Club Neon changes the deal:
// at reputation 3 the rank runs VIP fast travel for free, because the
// club's name opens the dispatcher's book.

import { PLACES } from './city.js';
import { dist2D } from './util.js';

// Every stop the rank serves, with its flat fare. The fare is the
// distance in spirit: the plaza is a hop, the airport is a haul.
export const FAST_TRAVEL_STOPS = [
  { key: 'plaza', name: 'Solmar Plaza', fare: 25, blurb: 'The heart of the city' },
  { key: 'safehouse', name: 'Mara\u2019s Safehouse', fare: 40, blurb: 'Home, and the crew hangs out here' },
  { key: 'garage', name: 'Venn\u2019s Garage', fare: 50, blurb: 'Leo\u2019s garage — tune the Comet here' },
  { key: 'cafe', name: 'Caf\u00e9 Lumen', fare: 30, blurb: 'Coffee, and Venn\u2019s old drop point' },
  { key: 'tower', name: 'Solmar Tower', fare: 40, blurb: 'Downtown offices, and the ledger job' },
  { key: 'nightclub', name: 'Club Neon', fare: 35, blurb: 'The club door — Mara\u2019s own place' },
  { key: 'neon-alley', name: 'Neon Alley', fare: 35, blurb: 'Behind the club — food carts, neon, and the night crowd' },
  { key: 'backalley', name: 'Back Alley', fare: 45, blurb: 'Behind the plaza — card games, and Silk\u2019s hideout' },
  { key: 'marina', name: 'Marina del Sol', fare: 60, blurb: 'Boats, and the pier at sunset' },
  { key: 'warehouse', name: 'Sunset Warehouse', fare: 55, blurb: 'Where the first ledger lived' },
  { key: 'harbor', name: 'North Harbor', fare: 120, blurb: 'The docks, and the cannery men' },
  { key: 'freight', name: 'Freight Yard', fare: 110, blurb: 'Trucks, and Venn\u2019s old hauler' },
  { key: 'resort', name: 'Palmera Resort', fare: 110, blurb: 'The pool, the casino, the south side' },
  { key: 'casino', name: 'Solmar Casino', fare: 110, blurb: 'The tables at the resort' },
  { key: 'airport', name: 'Solmar Airport', fare: 130, blurb: 'Runway 27, where Venn\u2019s plane never left' },
  { key: 'terminal', name: 'Solmar Terminal', fare: 140, blurb: 'The terminal, and the last flight out' },
  { key: 'campus', name: 'Solmar University', fare: 120, blurb: 'The quad, and the campus heist' },
  { key: 'stadium', name: 'Solmar Stadium', fare: 110, blurb: 'The bowl, and Rocco\u2019s last stand' },
  { key: 'mall', name: 'Solmar Mall', fare: 100, blurb: 'Shops, and the vault run' },
  { key: 'dockside', name: 'Dockside Pier', fare: 90, blurb: 'The lighthouse pier — Mara\u2019s signal run' },
  { key: 'cannery', name: 'Sunset Cannery', fare: 100, blurb: 'The cannery floor, and the harbor enforcers' },
  { key: 'mural-row', name: 'Mural Row', fare: 60, blurb: 'The art crowd rides here now — twelve walls, one gold can' },
];

export const FAST_TRAVEL_MAX_WANTED = 2; // the rank will not take a 3-star fare

export function makeFastTravelState() {
  return {
    trips: 0, // fast-travel rides taken
    spent: 0, // lifetime fares paid
    freeTrips: 0, // VIP rides taken on the club's name
    lastStop: null, // key of the last stop Mara rode to
  };
}

export function fastTravelFromSave(saved) {
  const state = makeFastTravelState();
  if (!saved || typeof saved !== 'object') return state;
  state.trips = Math.max(0, Number(saved.trips) || 0);
  state.spent = Math.max(0, Number(saved.spent) || 0);
  state.freeTrips = Math.max(0, Number(saved.freeTrips) || 0);
  if (typeof saved.lastStop === 'string') state.lastStop = saved.lastStop;
  return state;
}

export function fastTravelStopByKey(key) {
  return FAST_TRAVEL_STOPS.find((s) => s.key === key) || null;
}

// The fare for a ride: the stop's flat fare, or nothing when the
// club's name opens the book — Club Neon at reputation 3 rides free.
export function fastTravelFare(stop, clubRep) {
  if (!stop) return 0;
  if (clubRep >= 3) return 0;
  return stop.fare;
}

// Can Mara ride right now? The rank refuses while the PD is hard on
// her tail, while a timed job is running, or while she is carrying a
// fare — a cab will not outrun a wanted level or a deadline. Returns
// null when the ride is fine, or the reason it is not.
export function fastTravelBlockReason(world) {
  if (!world) return null;
  if (world.inCar || world.inBoat) return 'Get out of the car first — the rank takes walkers, not drivers.';
  if (world.wantedLevel > FAST_TRAVEL_MAX_WANTED) return 'The PD is watching the taxi ranks — lose the heat first.';
  if (world.timedStage) return 'A timed job is running — the rank will not outrun a deadline.';
  if (world.hasFare) return 'Finish the fare first — the passenger is waiting.';
  return null;
}

// Take the ride: pay the fare and land at the stop. Returns { ok,
// cost, stop } or { ok: false, reason }. The caller moves Mara.
export function takeFastTravel(state, stopKey, money, clubRep) {
  const stop = fastTravelStopByKey(stopKey);
  if (!stop) return { ok: false, reason: 'No such stop on the rank.' };
  const fare = fastTravelFare(stop, clubRep);
  if (money < fare) return { ok: false, reason: 'The ride to ' + stop.name + ' costs $' + fare + ' — you are short.' };
  state.trips += 1;
  state.spent += fare;
  if (fare === 0) state.freeTrips += 1;
  state.lastStop = stop.key;
  return { ok: true, cost: fare, stop };
}

// The nearest stop to where Mara stands, so the panel can mark the
// ride she is already at — no point paying to go where she is.
export function nearestFastTravelStop(x, z) {
  let best = null;
  let bestD = Infinity;
  for (const stop of FAST_TRAVEL_STOPS) {
    const place = PLACES[stop.key];
    if (!place) continue;
    const d = dist2D(x, z, place.x, place.z);
    if (d < bestD) { bestD = d; best = stop; }
  }
  return bestD < 20 ? best : null;
}

// The fast-travel panel rows: every stop, its fare (or FREE on the
// club's name), and whether Mara can afford it. The stop she stands
// at is marked instead of offered.
export function fastTravelMenuItems(state, money, x, z, clubRep) {
  const here = nearestFastTravelStop(x, z);
  return FAST_TRAVEL_STOPS.map((stop) => {
    const fare = fastTravelFare(stop, clubRep);
    return {
      id: stop.key,
      label: stop.name + ' — ' + stop.blurb,
      cost: fare,
      owned: here && here.key === stop.key,
      afford: money >= fare,
      free: fare === 0,
    };
  });
}

// One line under the panel title: how much Mara has ridden the rank.
export function fastTravelSummary(state, clubRep) {
  const vip = clubRep >= 3 ? ' The club\u2019s name rides free — VIP travel is on.' : '';
  if (state.trips === 0) {
    return 'The taxi rank runs all over Solmar. Pick a stop, pay the fare, and a cab drops you at the door.' + vip;
  }
  return state.trips + ' rides taken · $' + state.spent.toLocaleString() + ' in fares' +
    (state.freeTrips > 0 ? ' · ' + state.freeTrips + ' free on the club\u2019s name' : '') + '.' + vip;
}

// The HUD line under the objective: the rank at a glance.
export function fastTravelStatusLine(state) {
  if (!state || state.trips === 0) return '';
  return `TAXI RANK · ${state.trips} rides · $${state.spent.toLocaleString()} fares` +
    (state.freeTrips > 0 ? ` · ${state.freeTrips} VIP free` : '');
}

// The toast line when a ride lands: short, and it names the stop.
export function fastTravelArrivedLine(stop, fare) {
  if (fare === 0) return stop.name + ' — on the club\u2019s name, no fare.';
  return stop.name + ' — the cab drops you off. Fare $' + fare + '.';
}
