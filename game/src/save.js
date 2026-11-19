// save.js — Solmar persistence, v2.
// One localStorage slot holds the whole profile: cash, story progress,
// where Mara was standing, lifetime stats, the garage, the taxi
// company, race bests, the radio station, property deeds, rival
// history, and the city events she has seen — plus the mute setting.
// The shape is versioned: a v1 save from the launch build migrates on
// first load, and anything unreadable or out of range falls back to a
// fresh default instead of crashing the game.

const SAVE_KEY = 'solmar-sunset-streets-save-v2';
const LEGACY_KEY = 'solmar-sunset-streets-save-v1';

// The full default profile. Every field is validated on load, so a save
// edited by hand — or written by an older build — can never produce a
// NaN, a negative cash balance, or a mission index the story does not have.
export function defaultSave() {
  return {
    money: 250,
    missionsDone: 0,
    x: -35,
    z: 112,
    storyDone: false,
    muted: false,
    stats: {
      fares: 0,
      stolen: 0,
      bestWanted: 0,
      barrels: 0,
      tokens: 0,
      shots: 0,
      racesWon: 0,
      taxiEarned: 0,
      garageSpent: 0,
      rivalsEscaped: 0,
      rivalsWrecked: 0,
      boatTrips: 0,
      eventsSeen: 0,
    },
    garage: { paint: 0xd8382e, engine: 0, armour: 0, spent: 0, nitro: 0 },
    taxi: { rep: 0, rank: 0, fares: 0, vipFares: 0, bestChain: 0, earned: 0 },
    races: { wins: 0, best: {} },
    property: { owned: [] },
    radio: { station: 0, switches: 0 },
    rivals: { escaped: 0, wrecked: 0, total: 0 },
    events: { stats: { roadworks: 0, parade: 0, checkpoint: 0, festival: 0, fireworks: 0, 'casino-night': 0, 'club-night': 0, 'street-race': 0, showroom: 0, market: 0, airshow: 0, 'street-art': 0, 'mural-tour': 0 }, total: 0 },
    crew: { hired: [], jobs: 0, levels: { dee: 1, nix: 1, sable: 1, rook: 1, ink: 1 } },
    casino: { won: 0, lost: 0, biggest: 0, hands: 0, spins: 0 },
    nightclub: { owned: false, rep: 0, bouncers: 0, income: 0, sets: 0, bestCombo: 0, lastIncomeDay: -1 },
    fasttravel: { trips: 0, spent: 0, freeTrips: 0, lastStop: null },
    // The showroom hunt: which rares Mara has spotted and which ones
    // Leo already has the keys for, and whether the set jackpot paid.
    collectors: { collected: [], found: [], setPaid: false, earned: 0 },
    packages: { found: [] },
    // Leo's jobs board: lifetime totals only — an active job never
    // survives a reload, its clock cannot be trusted across one.
    jobs: { done: 0, earned: 0, failed: 0, bestPay: 0, streak: 0 },
    // The wanted board: lifetime totals only — an active hunt never
    // survives a reload either, and Vex would have taken it anyway.
    bounty: { caught: 0, aliveCaught: 0, deadCaught: 0, earned: 0, bestPay: 0, streak: 0, rivalTakes: 0 },
    // Street art: finished walls, coats laid on unfinished ones, and
    // whether the twelfth wall already paid its $5,000 set bonus.
    graffiti: { done: [], coats: {}, earned: 0, setPaid: false, perfectStreak: 0 },
    tokensTaken: [],
  };
}

function asNumber(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  if (min !== undefined && n < min) return min;
  if (max !== undefined && n > max) return max;
  return n;
}

function asInt(value, fallback, min, max) {
  return Math.floor(asNumber(value, fallback, min, max));
}

// Validate a raw object against the profile shape, field by field.
// Unknown keys are dropped; missing keys fall back to the default.
export function normalizeSave(raw) {
  const d = defaultSave();
  if (!raw || typeof raw !== 'object') return d;
  d.money = asInt(raw.money, 250, 0, 999999999);
  d.missionsDone = asInt(raw.missionsDone, 0, 0, 99);
  d.storyDone = raw.storyDone === true;
  d.muted = raw.muted === true;
  d.x = asNumber(raw.x, -35, -320, 320);
  d.z = asNumber(raw.z, 112, -320, 320);
  const stats = raw.stats && typeof raw.stats === 'object' ? raw.stats : {};
  d.stats = {
    fares: asInt(stats.fares, 0, 0, 99999),
    stolen: asInt(stats.stolen, 0, 0, 99999),
    bestWanted: asInt(stats.bestWanted, 0, 0, 5),
    barrels: asInt(stats.barrels, 0, 0, 99999),
    tokens: asInt(stats.tokens, 0, 0, 99999),
    shots: asInt(stats.shots, 0, 0, 99999),
    racesWon: asInt(stats.racesWon, 0, 0, 99999),
    taxiEarned: asInt(stats.taxiEarned, 0, 0, 999999999),
    garageSpent: asInt(stats.garageSpent, 0, 0, 999999999),
    rivalsEscaped: asInt(stats.rivalsEscaped, 0, 0, 99999),
    rivalsWrecked: asInt(stats.rivalsWrecked, 0, 0, 99999),
    boatTrips: asInt(stats.boatTrips, 0, 0, 99999),
    eventsSeen: asInt(stats.eventsSeen, 0, 0, 99999),
  };
  const garage = raw.garage && typeof raw.garage === 'object' ? raw.garage : {};
  d.garage = {
    paint: asInt(garage.paint, 0xd8382e, 0, 0xffffff),
    engine: asInt(garage.engine, 0, 0, 3),
    armour: asInt(garage.armour, 0, 0, 3),
    spent: asInt(garage.spent, 0, 0, 999999999),
    nitro: asInt(garage.nitro, 0, 0, 1),
  };
  const taxi = raw.taxi && typeof raw.taxi === 'object' ? raw.taxi : {};
  d.taxi = {
    rep: asInt(taxi.rep, 0, 0, 99999),
    rank: asInt(taxi.rank, 0, 0, 3),
    fares: asInt(taxi.fares, 0, 0, 99999),
    vipFares: asInt(taxi.vipFares, 0, 0, 99999),
    bestChain: asInt(taxi.bestChain, 0, 0, 99999),
    earned: asInt(taxi.earned, 0, 0, 999999999),
  };
  const races = raw.races && typeof raw.races === 'object' ? raw.races : {};
  d.races = { wins: asInt(races.wins, 0, 0, 99999), best: {} };
  if (races.best && typeof races.best === 'object') {
    for (const [id, t] of Object.entries(races.best)) {
      if (typeof id === 'string' && Number.isFinite(t) && t > 0) {
        d.races.best[id] = t;
      }
    }
  }
  // Property deeds: only known ids survive a hand-edited save. The ids
  // are the ones property.js lists — a deed for any other id is dropped.
  // (An earlier build listed the wrong ids here, so bought places never
  // survived a reload; the list below matches the real properties.)
  const property = raw.property && typeof raw.property === 'object' ? raw.property : {};
  d.property = { owned: [] };
  if (Array.isArray(property.owned)) {
    for (const id of property.owned) {
      if (id === 'marina-loft' || id === 'harbor-penthouse' || id === 'stadium-suite' || id === 'casino-suite' || id === 'resort-villa' || id === 'club-penthouse' || id === 'lighthouse-cottage' || id === 'airport-hangar' || id === 'campus-dorm' || id === 'bounty-office') {
        d.property.owned.push(id);
      }
    }
  }
  // Radio: persist() writes { station, switches }; an old save may
  // hold a bare station number instead — both shapes load. Eight
  // stations now (Street FM joined the dial), so it runs 0..7.
  const radio = raw.radio && typeof raw.radio === 'object' ? raw.radio : {};
  d.radio = {
    station: asInt(radio.station !== undefined ? radio.station : raw.radio, 0, 0, 7),
    switches: asInt(radio.switches, 0, 0, 99999),
  };
  // Rivals: persist() writes { escaped, wrecked, total } — keep those
  // exact keys, or the chase history resets on every load.
  const rivals = raw.rivals && typeof raw.rivals === 'object' ? raw.rivals : {};
  d.rivals = {
    escaped: asInt(rivals.escaped, 0, 0, 99999),
    wrecked: asInt(rivals.wrecked, 0, 0, 99999),
    total: asInt(rivals.total, 0, 0, 99999),
  };
  // Events: persist() writes { stats, total }; keep the per-kind counts
  // so the pause screen survives a reload.
  const events = raw.events && typeof raw.events === 'object' ? raw.events : {};
  const eventStats = events.stats && typeof events.stats === 'object' ? events.stats : {};
  d.events = { stats: {}, total: asInt(events.total, 0, 0, 99999) };
  for (const k of ['roadworks', 'parade', 'checkpoint', 'festival', 'fireworks', 'casino-night', 'club-night', 'street-race', 'showroom', 'market', 'airshow', 'bounty-hunt', 'street-art', 'mural-tour']) {
    d.events.stats[k] = asInt(eventStats[k], 0, 0, 99999);
  }
  // The crew: only known hand ids survive a hand-edited save, and
  // training levels are clamped to 1..3. Rook the negotiator is the
  // fourth hand — a save from before he existed loads without him,
  // and a hired Rook survives a reload like the other three.
  const crew = raw.crew && typeof raw.crew === 'object' ? raw.crew : {};
  d.crew = { hired: [], jobs: asInt(crew.jobs, 0, 0, 99999), levels: { dee: 1, nix: 1, sable: 1, rook: 1, ink: 1 } };
  if (Array.isArray(crew.hired)) {
    for (const id of crew.hired) {
      if ((id === 'dee' || id === 'nix' || id === 'sable' || id === 'rook' || id === 'ink') && !d.crew.hired.includes(id)) {
        d.crew.hired.push(id);
      }
    }
  }
  if (crew.levels && typeof crew.levels === 'object') {
    for (const id of ['dee', 'nix', 'sable', 'rook', 'ink']) {
      d.crew.levels[id] = asInt(crew.levels[id], 1, 1, 3);
    }
  }
  // The casino: lifetime wins, losses and the biggest single win.
  const casino = raw.casino && typeof raw.casino === 'object' ? raw.casino : {};
  d.casino = {
    won: asInt(casino.won, 0, 0, 999999999),
    lost: asInt(casino.lost, 0, 0, 999999999),
    biggest: asInt(casino.biggest, 0, 0, 999999999),
    hands: asInt(casino.hands, 0, 0, 99999),
    spins: asInt(casino.spins, 0, 0, 99999),
  };
  // Club Neon: ownership, reputation, bouncers and the till. A save
  // from before the club existed loads as unowned — the deed is still
  // for sale at the door.
  const nightclub = raw.nightclub && typeof raw.nightclub === 'object' ? raw.nightclub : {};
  d.nightclub = {
    owned: nightclub.owned === true,
    rep: asInt(nightclub.rep, 0, 0, 5),
    bouncers: asInt(nightclub.bouncers, 0, 0, 2),
    income: asInt(nightclub.income, 0, 0, 999999999),
    sets: asInt(nightclub.sets, 0, 0, 99999),
    bestCombo: asInt(nightclub.bestCombo, 0, 0, 99999),
    lastIncomeDay: asInt(nightclub.lastIncomeDay, -1, -1, 999999),
    // Club upgrades used to be dropped by this normalization, so every
    // bought upgrade vanished on reload — keep the five flags now.
    upgrades: {
      sound: !!(nightclub.upgrades && nightclub.upgrades.sound === true),
      lounge: !!(nightclub.upgrades && nightclub.upgrades.lounge === true),
      sign: !!(nightclub.upgrades && nightclub.upgrades.sign === true),
      backroom: !!(nightclub.upgrades && nightclub.upgrades.backroom === true),
      mural: !!(nightclub.upgrades && nightclub.upgrades.mural === true),
    },
  };
  // The taxi rank: rides taken, fares paid, and the last stop.
  const fasttravel = raw.fasttravel && typeof raw.fasttravel === 'object' ? raw.fasttravel : {};
  d.fasttravel = {
    trips: asInt(fasttravel.trips, 0, 0, 99999),
    spent: asInt(fasttravel.spent, 0, 0, 999999999),
    freeTrips: asInt(fasttravel.freeTrips, 0, 0, 99999),
    lastStop: typeof fasttravel.lastStop === 'string' ? fasttravel.lastStop : null,
  };
  // The showroom: only known rare ids survive — a hand-edited save
  // cannot invent a seventh rare, and the set jackpot pays once.
  const collectors = raw.collectors && typeof raw.collectors === 'object' ? raw.collectors : {};
  d.collectors = { collected: [], found: [], setPaid: false, earned: 0 };
  const knownRares = ['vintage-roadster', 'rally-fox', 'gold-coupe', 'pd-interceptor', 'beach-buggy', 'midnight-limo'];
  if (Array.isArray(collectors.collected)) {
    for (const id of collectors.collected) {
      if (knownRares.includes(id) && !d.collectors.collected.includes(id)) d.collectors.collected.push(id);
    }
  }
  if (Array.isArray(collectors.found)) {
    for (const id of collectors.found) {
      if (knownRares.includes(id) && !d.collectors.found.includes(id)) d.collectors.found.push(id);
    }
  }
  d.collectors.setPaid = collectors.setPaid === true;
  d.collectors.earned = asInt(collectors.earned, 0, 0, 999999999);
  // Hidden packages: the list is copied as-is — packagesFromSave
  // drops any id that is not one of the ten real crates.
  const packages = raw.packages && typeof raw.packages === 'object' ? raw.packages : {};
  d.packages = { found: [] };
  if (Array.isArray(packages.found)) {
    for (const id of packages.found) {
      if (typeof id === 'string' && !d.packages.found.includes(id)) d.packages.found.push(id);
    }
  }
  // The jobs board: lifetime totals only. An active job is never
  // restored — its clock died with the last session.
  const jobs = raw.jobs && typeof raw.jobs === 'object' ? raw.jobs : {};
  d.jobs = {
    done: asInt(jobs.done, 0, 0, 99999),
    earned: asInt(jobs.earned, 0, 0, 999999999),
    failed: asInt(jobs.failed, 0, 0, 99999),
    bestPay: asInt(jobs.bestPay, 0, 0, 999999999),
    streak: asInt(jobs.streak, 0, 0, 99999),
  };
  // The wanted board: lifetime totals only. An active hunt is never
  // restored — its clock died with the last session.
  const bounty = raw.bounty && typeof raw.bounty === 'object' ? raw.bounty : {};
  d.bounty = {
    caught: asInt(bounty.caught, 0, 0, 99999),
    aliveCaught: asInt(bounty.aliveCaught, 0, 0, 99999),
    deadCaught: asInt(bounty.deadCaught, 0, 0, 99999),
    earned: asInt(bounty.earned, 0, 0, 999999999),
    bestPay: asInt(bounty.bestPay, 0, 0, 999999999),
    streak: asInt(bounty.streak, 0, 0, 99999),
    rivalTakes: asInt(bounty.rivalTakes, 0, 0, 99999),
  };
  // Street art: only known wall ids survive a hand-edited save, and
  // coats are clamped to 0..2 — a wall needs three coats, and a save
  // cannot claim a fourth one on a wall that is not finished.
  const graffiti = raw.graffiti && typeof raw.graffiti === 'object' ? raw.graffiti : {};
  d.graffiti = { done: [], coats: {}, earned: 0, setPaid: false, perfectStreak: 0 };
  const knownWalls = ['mural-row', 'plaza-fountain', 'mall-court', 'stadium-gate', 'campus-library', 'harbor-crates', 'cannery-wall', 'resort-pool', 'airport-fence', 'neon-alley', 'back-alley', 'boardwalk'];
  if (Array.isArray(graffiti.done)) {
    for (const id of graffiti.done) {
      if (knownWalls.includes(id) && !d.graffiti.done.includes(id)) d.graffiti.done.push(id);
    }
  }
  if (graffiti.coats && typeof graffiti.coats === 'object') {
    for (const id of knownWalls) {
      const n = asInt(graffiti.coats[id], 0, 0, 2);
      if (n > 0 && !d.graffiti.done.includes(id)) d.graffiti.coats[id] = n;
    }
  }
  d.graffiti.earned = asInt(graffiti.earned, 0, 0, 999999999);
  d.graffiti.setPaid = graffiti.setPaid === true;
  d.graffiti.perfectStreak = asInt(graffiti.perfectStreak, 0, 0, 999);
  // Taken sunset tokens: indices into the twelve spots, 0..11.
  d.tokensTaken = [];
  if (Array.isArray(raw.tokensTaken)) {
    for (const i of raw.tokensTaken) {
      const n = asInt(i, -1, 0, 11);
      if (n >= 0 && !d.tokensTaken.includes(n)) d.tokensTaken.push(n);
    }
  }
  return d;
}

// Read a v1 save (the launch build's key) and map it onto the v2
// shape. The old key is removed once the migration succeeds so the
// game never migrates twice.
function migrateLegacy() {
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const old = JSON.parse(raw);
    const migrated = normalizeSave({
      money: old.money,
      missionsDone: old.missionsDone,
      x: old.x,
      z: old.z,
      storyDone: old.storyDone,
      stats: old.stats,
    });
    window.localStorage.removeItem(LEGACY_KEY);
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(migrated));
    } catch {
      // Storage full or blocked: the migrated profile still plays, it
      // just will not persist until the player frees space.
    }
    return migrated;
  } catch {
    return null;
  }
}

// Load the profile, or null when no save exists yet (a fresh player
// starts at the default spawn with the intro cash).
export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (raw) return normalizeSave(JSON.parse(raw));
  } catch {
    // Corrupt JSON: fall through to the legacy key, then to null.
  }
  const migrated = migrateLegacy();
  if (migrated) return migrated;
  return null;
}

// Write the profile. The caller passes a plain object with any subset
// of the profile fields; anything missing is kept from the default,
// and the result is normalized before it is stored.
export function writeSave(state) {
  try {
    const normalized = normalizeSave(state);
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      ...normalized,
      savedAt: new Date().toISOString(),
    }));
    return true;
  } catch {
    return false;
  }
}

// Merge a partial update into the stored profile without clobbering
// fields the caller did not mention: read, overlay, normalize, write.
export function updateSave(partial) {
  const current = loadSave() || defaultSave();
  const merged = { ...current, ...partial };
  if (partial.stats) merged.stats = { ...current.stats, ...partial.stats };
  if (partial.garage) merged.garage = { ...current.garage, ...partial.garage };
  if (partial.taxi) merged.taxi = { ...current.taxi, ...partial.taxi };
  if (partial.races) merged.races = { ...current.races, ...partial.races };
  if (partial.property) merged.property = { ...current.property, ...partial.property };
  if (partial.rivals) merged.rivals = { ...current.rivals, ...partial.rivals };
  if (partial.events) merged.events = { ...current.events, ...partial.events };
  if (partial.crew) merged.crew = { ...current.crew, ...partial.crew };
  if (partial.casino) merged.casino = { ...current.casino, ...partial.casino };
  if (partial.nightclub) merged.nightclub = { ...current.nightclub, ...partial.nightclub };
  if (partial.fasttravel) merged.fasttravel = { ...current.fasttravel, ...partial.fasttravel };
  if (partial.collectors) merged.collectors = { ...current.collectors, ...partial.collectors };
  if (partial.packages) merged.packages = { ...current.packages, ...partial.packages };
  if (partial.jobs) merged.jobs = { ...current.jobs, ...partial.jobs };
  if (partial.bounty) merged.bounty = { ...current.bounty, ...partial.bounty };
  if (partial.graffiti) merged.graffiti = { ...current.graffiti, ...partial.graffiti };
  return writeSave(merged);
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Private mode can throw on remove; nothing to do about it.
  }
  try {
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Same: best effort only.
  }
}
