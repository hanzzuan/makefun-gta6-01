// save.js — Solmar persistence, v2.
// One localStorage slot holds the whole profile: cash, story progress,
// where Mara was standing, lifetime stats, the garage, the taxi
// company, race bests and the mute setting. The shape is versioned: a
// v1 save from the launch build migrates on first load, and anything
// unreadable or out of range falls back to a fresh default instead of
// crashing the game.

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
    },
    garage: { paint: 0xd8382e, engine: 0, armour: 0, spent: 0 },
    taxi: { rep: 0, rank: 0, fares: 0, vipFares: 0, bestChain: 0, earned: 0 },
    races: { wins: 0, best: {} },
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
  };
  const garage = raw.garage && typeof raw.garage === 'object' ? raw.garage : {};
  d.garage = {
    paint: asInt(garage.paint, 0xd8382e, 0, 0xffffff),
    engine: asInt(garage.engine, 0, 0, 3),
    armour: asInt(garage.armour, 0, 0, 3),
    spent: asInt(garage.spent, 0, 0, 999999999),
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
