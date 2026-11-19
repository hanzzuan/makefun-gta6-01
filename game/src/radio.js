// radio.js — the car radio.
// Every car in Solmar has a radio, and Mara's thumb is on the dial.
// Eight stations, switched with N: Sunset FM for the golden-hour pop,
// Harbour Rock for the harbor nights, Night Drive for the synth that
// fits a 2 a.m. getaway, and Talk Solmar for the city's own voices.
// The station is part of the save, so the dial stays where Mara left
// it. The audio module owns the actual sound; this module owns the
// stations, the dial, and what the HUD shows.

export const RADIO_STATIONS = [
  {
    id: 'sunset',
    name: 'Sunset FM',
    blurb: 'Pop hits for the golden hour',
    mood: 'day',
    freq: '98.7',
  },
  {
    id: 'harbor-rock',
    name: 'Harbour Rock',
    blurb: 'Guitars for the harbor nights',
    mood: 'rock',
    freq: '101.3',
  },
  {
    id: 'night-drive',
    name: 'Night Drive',
    blurb: 'Synth for a 2 a.m. getaway',
    mood: 'night',
    freq: '104.9',
  },
  {
    id: 'talk',
    name: 'Talk Solmar',
    blurb: 'The city talking to itself',
    mood: 'talk',
    freq: '88.2',
  },
  {
    id: 'casino-jazz',
    name: 'Casino Jazz',
    blurb: 'Late-night piano for the high rollers',
    mood: 'night',
    freq: '107.5',
  },
  {
    id: 'bay-blues',
    name: 'Bay Blues',
    blurb: 'Slow blues for the marina at midnight',
    mood: 'night',
    freq: '92.4',
  },
  {
    id: 'club-neon',
    name: 'Club Neon',
    blurb: 'House beats from Mara\u2019s own club',
    mood: 'night',
    freq: '99.1',
  },
  {
    id: 'street-fm',
    name: 'Street FM',
    blurb: 'The Mural Row pirate station — art talk and spray-can hip-hop',
    mood: 'day',
    freq: '95.6',
  },
  {
    id: 'reel-fm',
    name: 'Reel FM',
    blurb: 'Movie scores and chase themes from the Solmar backlot',
    mood: 'day',
    freq: '93.8',
  },
];

// Reel FM's programme: the backlot's own soundtrack — chase themes,
// sunset scores and the stunt show's stingers, read out by the DJ
// between the songs. The track list cycles in order, so the station
// always knows what is playing.
export const REEL_FM_TRACKS = [
  'Reel FM — "Runway 27 (Main Theme)" — the strip, the jet, the jump.',
  'Reel FM — "Sunset Over the Bay" — strings, a slow drive, the last light.',
  'Reel FM — "The Stuntman\\u2019s Waltz" — three-four time, flat out, no brakes.',
  'Reel FM — "Backlot Nights" — neon, rain on the set, a crane in the dark.',
  'Reel FM — "The Last Race (Final Cut)" — drums, a boat, and a lighthouse.',
  'Reel FM — "Mara\\u2019s Theme" — one guitar, one city, one debt to pay.',
  'Reel FM — "The Film Job" — a heist in 4/4, the reels under your arm.',
  'Reel FM — "Golden Hour Chase" — horns, a siren, and the sun in the mirror.',
];
let reelCursor = 0;
export function reelFmTrack() {
  const track = REEL_FM_TRACKS[reelCursor % REEL_FM_TRACKS.length];
  reelCursor += 1;
  return track;
}

// The Reel FM DJ: the backlot's voice, calling the stunt show between
// the tracks — the ramp of the day, the best air, the next jump.
export function reelFmDj(stuntState) {
  if (!stuntState || stuntState.jumps === 0) return 'Reel FM — DJ Marlow: "The ramps are out, the cameras are rolling, and somebody out there has not jumped yet. You know who you are."';
  return 'Reel FM — DJ Marlow: "Mara Voss, ' + stuntState.bestAir.toFixed(2) + ' seconds of air — the backlot is still talking about it. Who is going to beat that?"';
}

export function makeRadioState() {
  return {
    station: 0, // index into RADIO_STATIONS
    switches: 0, // times Mara has changed station
    heard: [], // station ids heard this session
  };
}

export function radioFromSave(saved) {
  const state = makeRadioState();
  if (!saved || typeof saved !== 'object') return state;
  const s = Number(saved.station);
  if (Number.isFinite(s)) state.station = Math.max(0, Math.min(RADIO_STATIONS.length - 1, s | 0));
  state.switches = Math.max(0, Number(saved.switches) || 0);
  return state;
}

export function currentStation(state) {
  return RADIO_STATIONS[state.station] || RADIO_STATIONS[0];
}

export function stationName(state) {
  return currentStation(state).name;
}

export function stationBlurb(state) {
  return currentStation(state).blurb;
}

// Turn the dial: next station, wrapping around. Returns the new station.
export function nextStation(state) {
  state.station = (state.station + 1) % RADIO_STATIONS.length;
  state.switches += 1;
  const station = currentStation(state);
  if (!state.heard.includes(station.id)) state.heard.push(station.id);
  return station;
}

// Turn the dial the other way, for completeness.
export function prevStation(state) {
  state.station = (state.station + RADIO_STATIONS.length - 1) % RADIO_STATIONS.length;
  state.switches += 1;
  const station = currentStation(state);
  if (!state.heard.includes(station.id)) state.heard.push(station.id);
  return station;
}

// The station's sound: which chord set the audio module should play.
// 'talk' means no music — the city talks instead.
export function stationMood(state) {
  return currentStation(state).mood;
}

// The HUD line under the clock: station, frequency and what it plays.
export function radioStatusLine(state) {
  const station = currentStation(state);
  return `♪ ${station.freq} ${station.name} — ${station.blurb}`;
}

// The radio jingle the HUD shows when Mara switches: short, punchy,
// and different for every station.
export function radioJingle(state) {
  const station = currentStation(state);
  const jingles = {
    sunset: 'Sunset FM — the sun never sets on Solmar.',
    'harbor-rock': 'Harbour Rock — turn it up, the harbor can take it.',
    'night-drive': 'Night Drive — the city sounds better at 2 a.m.',
    talk: 'Talk Solmar — the callers are already arguing.',
    'casino-jazz': 'Casino Jazz — the piano never loses, even when you do.',
    'bay-blues': 'Bay Blues — slow water, slow songs, midnight at the marina.',
    'club-neon': 'Club Neon — house beats from your own club, Mara.',
    'street-fm': 'Street FM — the walls are talking, and the paint is still wet.',
    'reel-fm': 'Reel FM — the chase never ends, and neither does the music.',
  };
  return jingles[station.id] || station.name;
}

// The ads that pay for the airtime: Solmar's shops, garages and
// nightclubs, read between the songs. They cycle in order, so the
// third station switch always carries a fresh one.
export const RADIO_ADS = [
  'Leo\u2019s Garage — your Comet, tuned while you wait. Mention Mara for the sunset rate.',
  'Palmera Resort — the pool is warm, the tables are hot, and the sunset is free.',
  'Solmar Taxi Co. — anywhere in town, any hour, and the meter never lies. Much.',
  'Club Neon — the floor is moving, the DJ is Mara Voss, and the door is open.',
  'Marina del Sol — boats for sale, boats for rent, and one boat you should not ask about.',
  'Solmar Mall — three floors of everything, and the vault run starts at the food court.',
  'The Sunset Diner — pie at 2 a.m., coffee at 4 a.m., and no questions at any hour.',
  'Harbour Bait & Tackle — the fish are biting, the patrol boats are not, and the bay is yours.',
  'Venn\u2019s Garage jobs board — deliveries, escorts, pickups. The pay scales, the clock does not wait.',
  'The Solmar showroom — six rare cars, one garage, and a gold Comet for the driver who finds them all.',
  'The PD wanted board at Leo\\u2019s Garage — eleven fugitives, cash on every head, and Vex works the same board. Press U at the garage.',
  'Reel FM — the film lot stunt show is on: eight ramps, one legend, and Mara Voss in the driver\\u2019s seat.',
  'Mama Sol runs the plaza — forty years, one bench, and a price on her head. The PD pays, the plaza watches.',
  'Mural Row — twelve walls, one gold can, and a Street Legend title for whoever finishes them all. Press I at a blank wall.',
];

let adCursor = 0;
export function radioAd() {
  const ad = RADIO_ADS[adCursor % RADIO_ADS.length];
  adCursor += 1;
  return ad;
}
