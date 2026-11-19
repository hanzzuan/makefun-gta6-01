// hud.js — the Solmar HUD: wanted stars, cash, health, speed, mission text,
// and a live round minimap drawn on a 2D canvas from the world state.

import { CITY_HALF } from './city.js';
import { money } from './util.js';

let els = null;
let mapCtx = null;

export function initHud() {
  els = {
    stars: document.getElementById('stars'),
    cash: document.getElementById('cash'),
    cashsub: document.getElementById('cashsub'),
    healthfill: document.getElementById('healthfill'),
    objtitle: document.getElementById('objtitle'),
    objtext: document.getElementById('objtext'),
    speednum: document.getElementById('speednum'),
    gear: document.getElementById('gear'),
    hint: document.getElementById('hint'),
    crosshair: document.getElementById('crosshair'),
    toast: document.getElementById('toast'),
    overlay: document.getElementById('overlay'),
    status: document.getElementById('status'),
    clock: document.getElementById('clock'),
    timer: document.getElementById('timer'),
    staminafill: document.getElementById('staminafill'),
    radio: document.getElementById('radio'),
    crewline: document.getElementById('crewline'),
  };
  const map = document.getElementById('minimap');
  mapCtx = map.getContext('2d');
  return els;
}

export function setStars(level) {
  let html = '';
  for (let i = 0; i < 5; i++) {
    html += i < level ? '&#9733;' : '<span class="off">&#9733;</span>';
  }
  els.stars.innerHTML = html;
}

export function setCash(amount) {
  els.cash.childNodes[0].textContent = money(amount);
}

export function setHealth(hp, maxHp) {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  els.healthfill.style.width = pct + '%';
  els.healthfill.style.background = pct > 50
    ? 'linear-gradient(90deg, #37d67a, #9be15d)'
    : pct > 25
      ? 'linear-gradient(90deg, #e8a13c, #f2c230)'
      : 'linear-gradient(90deg, #d8382e, #ff6a3c)';
}

// The clock and weather line: "6:42 PM · RAIN" over the city.
export function setClock(timeLabel, weatherLabel) {
  if (!els.clock) return;
  els.clock.textContent = timeLabel + ' · ' + weatherLabel;
}

// The timed-mission countdown, shown under the clock while a timed stage
// is live; hidden the rest of the time.
export function setTimer(seconds) {
  if (!els.timer) return;
  if (seconds == null || seconds <= 0) {
    els.timer.textContent = '';
    return;
  }
  const whole = Math.ceil(seconds);
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  els.timer.textContent = '⏱ ' + m + ':' + String(s).padStart(2, '0');
}

// The radio line: station, frequency and what it plays, under the
// clock. N turns the dial; the line follows the station.
export function setRadio(text) {
  if (!els.radio) return;
  els.radio.textContent = text || '';
}

// The crew line under the radio: who is on Mara's crew, or nothing
// when she runs solo.
export function setCrewLine(text) {
  if (!els.crewline) return;
  els.crewline.textContent = text || '';
}

// Stamina bar under health: sprinting drains it, walking brings it back.
export function setStamina(stamina, maxStamina) {
  if (!els.staminafill) return;
  const pct = Math.max(0, Math.min(100, (stamina / maxStamina) * 100));
  els.staminafill.style.width = pct + '%';
  els.staminafill.style.background = pct > 25
    ? 'linear-gradient(90deg, #4a8cff, #7ab8ff)'
    : 'linear-gradient(90deg, #e8a13c, #f2c230)';
}

export function setObjective(title, text) {
  els.objtitle.textContent = title;
  els.objtext.textContent = text;
}

// The race line sits under the objective while a street race is live:
// the timer, the next gate, and the par time to beat.
export function setRaceLine(text) {
  const el = document.getElementById('racebar');
  if (!el) return;
  if (!text) {
    el.style.display = 'none';
    el.textContent = '';
    return;
  }
  el.style.display = 'block';
  el.textContent = text;
}

export function setSpeed(kmh, label) {
  els.speednum.textContent = String(Math.round(kmh));
  els.gear.textContent = label;
}

export function setHint(html) {
  els.hint.innerHTML = html;
}

export function setCrosshair(visible) {
  els.crosshair.style.display = visible ? 'block' : 'none';
}

let toastTimer = null;
export function toast(main, sub) {
  els.toast.innerHTML = main + (sub ? '<small>' + sub + '</small>' : '');
  els.toast.style.opacity = '1';
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { els.toast.style.opacity = '0'; }, 2600);
}

export function announce(text) {
  els.status.textContent = text;
}

// --- overlay screens ---------------------------------------------------------

export function showStart(save, onStart) {
  const hasSave = save && (save.money > 250 || save.missionsDone > 0);
  els.overlay.style.display = 'flex';
  els.overlay.innerHTML =
    '<div class="panel">' +
    '<h1>SOLMAR</h1><h2>SUNSET STREETS</h2>' +
    '<p>Mara Voss is back in Solmar. Her brother\u2019s garage owes Dario Venn ' +
    '$50,000. Forty-four jobs stand between Mara and a clean slate — if the ' +
    'Solmar PD doesn\u2019t catch her first.</p>' +
    '<p style="font-size:14px;color:#c9c4ef">After the story: eight stunt ramps around the city, a Stunt Legend ' +
    'title to chase, and a film lot on the beach that pays for the air.</p>' +
    '<div class="keys"><b>WASD</b> move / drive &nbsp; <b>Shift</b> run &nbsp; ' +
    '<b>E</b> enter / exit car &nbsp; <b>Space</b> handbrake &nbsp; <b>C</b> sneak<br>' +
    '<b>Mouse click</b> shoot &nbsp; <b>F</b> punch &nbsp; <b>1 / 2</b> fists / pistol<br>' +
    '<b>G</b> garage (near Venn\u2019s Garage) &nbsp; <b>R</b> race (at a start marker)<br>' +
    '<b>N</b> radio &nbsp; <b>B</b> property (near a gold sign) &nbsp; <b>V</b> crew (at the safehouse) &nbsp; <b>X</b> casino (at the resort)<br>' +
    '<b>Y</b> stunt board (at the garage) &nbsp; <b>U</b> bounty board (at the garage)<br>' +
    '<b>H</b> horn &nbsp; <b>Wheel</b> camera zoom &nbsp; <b>P</b> pause &nbsp; <b>M</b> mute &nbsp; progress saves automatically</div>' +
    '<button id="startbtn">' + (hasSave ? 'CONTINUE — $' + save.money : 'START THE STORY') + '</button>' +
    (hasSave ? '<div class="save">Saved progress found: ' + save.missionsDone + ' mission(s) done.</div>' : '') +
    '</div>';
  document.getElementById('startbtn').addEventListener('click', onStart);
}

export function showPause(onResume, onRestart, stats) {
  const s = stats || { fares: 0, stolen: 0, bestWanted: 0, barrels: 0, tokens: 0 };
  els.overlay.style.display = 'flex';
  els.overlay.innerHTML =
    '<div class="panel"><h1 style="font-size:44px">PAUSED</h1>' +
    '<p>Solmar waits for no one — except right now.</p>' +
    '<div class="keys" style="text-align:left;display:inline-block">' +
    'Fares completed: <b>' + s.fares + '</b><br>' +
    'Cars stolen: <b>' + s.stolen + '</b><br>' +
    'Highest wanted level: <b>' + s.bestWanted + ' ★</b><br>' +
    'Barrels blown: <b>' + s.barrels + '</b><br>' +
    'Sunset tokens: <b>' + (s.tokens || 0) + ' / 12</b><br>' +
    'Story arc: <b>' + (s.arcName || '—') + '</b> · arc total: <b>$' + (s.arcPayout || 0).toLocaleString() + '</b><br>' +
    'Perfect spray streak: <b>' + (s.streak || 0) + '</b><br>' +
    'Races won: <b>' + (s.racesWon || 0) + '</b> · Taxi earned: <b>$' + (s.taxiEarned || 0).toLocaleString() + '</b><br>' +
    'Garage spent: <b>$' + (s.garageSpent || 0).toLocaleString() + '</b><br>' +
    'Rival chases escaped: <b>' + (s.rivalsEscaped || 0) + '</b> · wrecked: <b>' + (s.rivalsWrecked || 0) + '</b><br>' +
    'Boat trips: <b>' + (s.boatTrips || 0) + '</b> · City events seen: <b>' + (s.eventsSeen || 0) + '</b><br>' +
    'Crew hired: <b>' + (s.crewHired || 0) + ' / 6</b> · Casino: <b>' + (s.casinoGames || 0) + ' games</b><br>' +
    'Jobs done: <b>' + (s.jobsDone || 0) + '</b> · Rare cars in the showroom: <b>' + (s.rareCars || 0) + ' / 6</b><br>' +
    'Packages found: <b>' + (s.packagesFound || 0) + ' / 11</b> · Bounties caught: <b>' + (s.bountyCaught || 0) + '</b>' + (s.bountyRank ? ' (' + s.bountyRank + ')' : '') + '<br>' +
    'Walls sprayed: <b>' + (s.graffitiPieces || 0) + ' / 12</b>' + (s.graffitiTitle ? ' · ' + s.graffitiTitle : '') + '<br>' +
    'Stunt jumps: <b>' + (s.stuntJumps || 0) + '</b> · best air: <b>' + (s.stuntBestAir ? s.stuntBestAir.toFixed(2) + 's' : '—') + '</b>' + (s.stuntTitle ? ' · ' + s.stuntTitle : '') + (s.stuntBestCombo > 1 ? ' · best chain ' + s.stuntBestCombo + ' jumps' : '') + '</div>' +
    '<div><button id="resumebtn">RESUME</button> ' +
    '<button id="restartbtn" style="background:#ff8a5c">RESTART DAY</button></div></div>';
  document.getElementById('resumebtn').addEventListener('click', onResume);
  document.getElementById('restartbtn').addEventListener('click', onRestart);
}

// --- garage ---------------------------------------------------------------
// Leo's garage panel: every paint and upgrade with its price, whether
// Mara owns it, and whether she can afford it. Buttons call onBuy(id);
// the caller re-renders the panel after each purchase so prices and
// ownership stay live. onClose leaves the garage and resumes play.
export function showGarage(items, money, summary, onBuy, onClose) {
  els.overlay.style.display = 'flex';
  const rows = items.map((item) => {
    const state = item.owned
      ? '<span style="color:#7ab8ff">OWNED</span>'
      : item.afford
        ? '<span style="color:#ffd23e">$' + item.cost.toLocaleString() + '</span>'
        : '<span style="color:#ff8a7a">NEED $' + item.cost.toLocaleString() + '</span>';
    return '<div style="display:flex;justify-content:space-between;gap:16px;margin:4px 0">' +
      '<span>' + item.label + '</span>' +
      (item.owned
        ? state
        : '<button data-buy="' + item.id + '" style="padding:4px 12px;font-size:14px"' + (item.afford ? '' : ' disabled') + '>BUY ' + state + '</button>') +
      '</div>';
  }).join('');
  els.overlay.innerHTML =
    '<div class="panel"><h1 style="font-size:36px">LEO\u2019S GARAGE</h1>' +
    '<p>' + summary + '</p>' +
    '<p>Cash: <b>$' + money.toLocaleString() + '</b> — upgrades apply to Mara\u2019s Comet GT at the safehouse.</p>' +
    '<div style="text-align:left;display:inline-block;min-width:340px">' + rows + '</div>' +
    '<div><button id="garageclose">BACK TO THE STREETS</button></div></div>';
  els.overlay.querySelectorAll('[data-buy]').forEach((btn) => {
    btn.addEventListener('click', () => onBuy(btn.getAttribute('data-buy')));
  });
  document.getElementById('garageclose').addEventListener('click', onClose);
}

// --- property ---------------------------------------------------------------
// The property panel: Mara's three buyable places, with prices, whether
// she owns them, and whether she can afford them. Same shape as the
// garage panel: buttons call onBuy(id), the caller re-renders after
// each purchase, onClose leaves and resumes play.
export function showProperty(items, money, summary, onBuy, onClose) {
  els.overlay.style.display = 'flex';
  const rows = items.map((item) => {
    const state = item.owned
      ? '<span style="color:#7ab8ff">OWNED</span>'
      : item.afford
        ? '<span style="color:#ffd23e">$' + item.cost.toLocaleString() + '</span>'
        : '<span style="color:#ff8a7a">NEED $' + item.cost.toLocaleString() + '</span>';
    return '<div style="display:flex;justify-content:space-between;gap:16px;margin:4px 0">' +
      '<span>' + item.label + '</span>' +
      (item.owned
        ? state
        : '<button data-buy="' + item.id + '" style="padding:4px 12px;font-size:14px"' + (item.afford ? '' : ' disabled') + '>BUY ' + state + '</button>') +
      '</div>';
  }).join('');
  els.overlay.innerHTML =
    '<div class="panel"><h1 style="font-size:36px">SOLMAR PROPERTY</h1>' +
    '<p>' + summary + '</p>' +
    '<p>Cash: <b>$' + money.toLocaleString() + '</b> — a bought place heals Mara when she visits it, and pays rent every 90 seconds.</p>' +
    '<div style="text-align:left;display:inline-block;min-width:340px">' + rows + '</div>' +
    '<div><button id="propclose">BACK TO THE STREETS</button></div></div>';
  els.overlay.querySelectorAll('[data-buy]').forEach((btn) => {
    btn.addEventListener('click', () => onBuy(btn.getAttribute('data-buy')));
  });
  document.getElementById('propclose').addEventListener('click', onClose);
}

// --- crew ---------------------------------------------------------------
// The crew panel: the three hands Mara can hire at the safehouse, with
// prices, whether she owns them, and whether she can afford them. Same
// shape as the garage panel: buttons call onBuy(id), the caller
// re-renders after each hire, onClose leaves and resumes play.
export function showCrew(items, money, summary, onBuy, onClose) {
  els.overlay.style.display = 'flex';
  const rows = items.map((item) => {
    const state = item.owned
      ? '<span style="color:#7ab8ff">ON THE CREW</span>'
      : item.afford
        ? '<span style="color:#ffd23e">$' + item.cost.toLocaleString() + '</span>'
        : '<span style="color:#ff8a7a">NEED $' + item.cost.toLocaleString() + '</span>';
    return '<div style="display:flex;justify-content:space-between;gap:16px;margin:4px 0">' +
      '<span>' + item.label + '</span>' +
      (item.owned
        ? state
        : '<button data-buy="' + item.id + '" style="padding:4px 12px;font-size:14px"' + (item.afford ? '' : ' disabled') + '>HIRE ' + state + '</button>') +
      '</div>';
  }).join('');
  els.overlay.innerHTML =
    '<div class="panel"><h1 style="font-size:36px">MARA\u2019S CREW</h1>' +
    '<p>' + summary + '</p>' +
    '<p>Cash: <b>$' + money.toLocaleString() + '</b> — a hired hand works for Mara from the moment they sign on.</p>' +
    '<div style="text-align:left;display:inline-block;min-width:340px">' + rows + '</div>' +
    '<div><button id="crewclose">BACK TO THE STREETS</button></div></div>';
  els.overlay.querySelectorAll('[data-buy]').forEach((btn) => {
    btn.addEventListener('click', () => onBuy(btn.getAttribute('data-buy')));
  });
  document.getElementById('crewclose').addEventListener('click', onClose);
}

// --- casino ---------------------------------------------------------------
// The casino panel: slots and blackjack at the resort, each button one
// game at one stake. The last result shows on the panel after every
// game, and the caller re-renders after each play. onClose leaves the
// tables and resumes play.
export function showCasino(items, money, summary, lastResult, onPlay, onClose) {
  els.overlay.style.display = 'flex';
  const rows = items.map((item) => {
    const state = item.afford
      ? '<span style="color:#ffd23e">$' + item.cost.toLocaleString() + '</span>'
      : '<span style="color:#ff8a7a">NEED $' + item.cost.toLocaleString() + '</span>';
    return '<div style="display:flex;justify-content:space-between;gap:16px;margin:4px 0">' +
      '<span>' + item.label + '</span>' +
      '<button data-play="' + item.id + '" style="padding:4px 12px;font-size:14px"' + (item.afford ? '' : ' disabled') + '>PLAY ' + state + '</button>' +
      '</div>';
  }).join('');
  els.overlay.innerHTML =
    '<div class="panel"><h1 style="font-size:36px">SOLMAR CASINO</h1>' +
    '<p>' + summary + '</p>' +
    '<p>Cash: <b>$' + money.toLocaleString() + '</b> — the house always wins eventually. Probably.</p>' +
    (lastResult ? '<p style="color:#ffd23e">' + lastResult + '</p>' : '') +
    '<div style="text-align:left;display:inline-block;min-width:340px">' + rows + '</div>' +
    '<div><button id="casinoclose">CASH OUT</button></div></div>';
  els.overlay.querySelectorAll('[data-play]').forEach((btn) => {
    btn.addEventListener('click', () => onPlay(btn.getAttribute('data-play')));
  });
  document.getElementById('casinoclose').addEventListener('click', onClose);
}

// --- nightclub ---------------------------------------------------------------
// The club panel: Club Neon as a business. Buying the club, hiring
// bouncers and collecting the till are buttons like any other panel,
// but the DJ set is different — it leaves the panel and plays live in
// the world, on the beat, so its row says so instead of offering a
// price. The caller re-renders after every purchase; onClose leaves
// and resumes play.
export function showNightclub(items, money, summary, onBuy, onClose) {
  els.overlay.style.display = 'flex';
  const verb = (id) => (id === 'dj-set' ? 'PLAY THE SET' : id === 'collect' ? 'COLLECT' : id === 'hire-bouncer' ? 'HIRE' : 'BUY');
  const rows = items.map((item) => {
    const price = item.cost > 0
      ? (item.afford
        ? '<span style="color:#ffd23e">$' + item.cost.toLocaleString() + '</span>'
        : '<span style="color:#ff8a7a">NEED $' + item.cost.toLocaleString() + '</span>')
      : '<span style="color:#7dff8a">FREE</span>';
    return '<div style="display:flex;justify-content:space-between;gap:16px;margin:6px 0">' +
      '<span>' + item.label + '</span>' +
      '<button data-club="' + item.id + '" style="padding:4px 12px;font-size:14px;white-space:nowrap"' + (item.afford ? '' : ' disabled') + '>' + verb(item.id) + ' ' + price + '</button>' +
      '</div>';
  }).join('');
  els.overlay.innerHTML =
    '<div class="panel"><h1 style="font-size:36px;color:#ff2e88">CLUB NEON</h1>' +
    '<p>' + summary + '</p>' +
    '<p>Cash: <b>$' + money.toLocaleString() + '</b> — the DJ set plays live: sixteen beats, SPACE on the pulse.</p>' +
    '<div style="text-align:left;display:inline-block;min-width:340px">' + rows + '</div>' +
    '<div><button id="clubclose">BACK TO THE STREETS</button></div></div>';
  els.overlay.querySelectorAll('[data-club]').forEach((btn) => {
    btn.addEventListener('click', () => onBuy(btn.getAttribute('data-club')));
  });
  document.getElementById('clubclose').addEventListener('click', onClose);
}

// --- fast travel ---------------------------------------------------------------
// The taxi rank panel: every stop in Solmar as a button with its fare.
// The stop Mara stands at shows as HERE instead of a ride, and a free
// VIP ride — Club Neon at reputation 3 — shows as FREE. onRide(key)
// takes the ride; onClose leaves and resumes play.
export function showFastTravel(items, money, summary, onRide, onClose) {
  els.overlay.style.display = 'flex';
  const rows = items.map((item) => {
    if (item.owned) {
      return '<div style="display:flex;justify-content:space-between;gap:16px;margin:4px 0">' +
        '<span>' + item.label + '</span><span style="color:#7ab8ff">YOU ARE HERE</span></div>';
    }
    const price = item.free
      ? '<span style="color:#7dff8a">FREE — VIP</span>'
      : item.afford
        ? '<span style="color:#ffd23e">$' + item.cost.toLocaleString() + '</span>'
        : '<span style="color:#ff8a7a">NEED $' + item.cost.toLocaleString() + '</span>';
    return '<div style="display:flex;justify-content:space-between;gap:16px;margin:4px 0">' +
      '<span>' + item.label + '</span>' +
      '<button data-ride="' + item.id + '" style="padding:4px 12px;font-size:14px"' + (item.afford ? '' : ' disabled') + '>RIDE ' + price + '</button>' +
      '</div>';
  }).join('');
  els.overlay.innerHTML =
    '<div class="panel"><h1 style="font-size:36px">TAXI RANK</h1>' +
    '<p>' + summary + '</p>' +
    '<p>Cash: <b>$' + money.toLocaleString() + '</b> — a cab drops you at the door. No driving, no PD, no fuss.</p>' +
    '<div style="text-align:left;display:inline-block;min-width:340px;max-height:46vh;overflow-y:auto">' + rows + '</div>' +
    '<div><button id="rankclose">BACK TO THE STREETS</button></div></div>';
  els.overlay.querySelectorAll('[data-ride]').forEach((btn) => {
    btn.addEventListener('click', () => onRide(btn.getAttribute('data-ride')));
  });
  document.getElementById('rankclose').addEventListener('click', onClose);
}

// --- Leo's jobs board ---------------------------------------------------------------
// The jobs board panel: the active job on top, then the three offers
// with their routes and pay. onAccept('job-0' | 'job-1' | 'job-2')
// takes the job; onClose leaves and resumes play.
export function showJobs(items, money, summary, onAccept, onClose) {
  els.overlay.style.display = 'flex';
  const rows = items.map((item) => {
    if (item.id === 'job-active') {
      return '<div style="display:flex;justify-content:space-between;gap:16px;margin:4px 0">' +
        '<span>' + item.label + '</span><span style="color:#ffd23e">' + item.state + '</span></div>';
    }
    return '<div style="display:flex;justify-content:space-between;gap:16px;margin:4px 0">' +
      '<span>' + item.label + '</span>' +
      '<button data-job="' + item.id + '" style="padding:4px 12px;font-size:14px;white-space:nowrap"' + (item.afford ? '' : ' disabled') + '>TAKE $' + item.pay.toLocaleString() + '</button>' +
      '</div>';
  }).join('');
  els.overlay.innerHTML =
    '<div class="panel"><h1 style="font-size:36px">LEO\u2019S JOBS BOARD</h1>' +
    '<p>' + summary + '</p>' +
    '<p>Cash: <b>$' + money.toLocaleString() + '</b> — one job at a time, and the clock always runs. A streak pays more.</p>' +
    '<div style="text-align:left;display:inline-block;min-width:340px">' + rows + '</div>' +
    '<div><button id="jobsclose">BACK TO THE STREETS</button></div></div>';
  els.overlay.querySelectorAll('[data-job]').forEach((btn) => {
    btn.addEventListener('click', () => onAccept(btn.getAttribute('data-job')));
  });
  document.getElementById('jobsclose').addEventListener('click', onClose);
}

// --- the wanted board ---------------------------------------------------------------
// The bounty board: the eleven fugitives, their price and hideout, and
// the hunt already running. Same shape as the jobs board — a row per
// name, a TAKE button with the price — but the title is the PD's, and
// the warning is Vex's four-minute clock.
export function showBounty(items, money, summary, onAccept, onClose) {
  els.overlay.style.display = 'flex';
  const rows = items.map((item) => {
    if (item.id === 'bounty-active') {
      return '<div style="display:flex;justify-content:space-between;gap:16px;margin:4px 0">' +
        '<span>' + item.label + '</span><span style="color:#ff5c5c">' + item.state + '</span></div>';
    }
    return '<div style="display:flex;justify-content:space-between;gap:16px;margin:4px 0">' +
      '<span>' + item.label + '</span>' +
      '<button data-bounty="' + item.id + '" style="padding:4px 12px;font-size:14px;white-space:nowrap"' + (item.afford ? '' : ' disabled') + '>TAKE $' + item.pay.toLocaleString() + '</button>' +
      '</div>';
  }).join('');
  els.overlay.innerHTML =
    '<div class="panel"><h1 style="font-size:36px;color:#ff5c5c">WANTED — BOUNTY BOARD</h1>' +
    '<p>' + summary + '</p>' +
    '<p>Cash: <b>$' + money.toLocaleString() + '</b> — cuff them alive for the full price, drop them for half, and be quick: Vex takes any bounty older than four minutes.</p>' +
    '<div style="text-align:left;display:inline-block;min-width:340px">' + rows + '</div>' +
    '<div><button id="bountyclose">BACK TO THE STREETS</button></div></div>';
  els.overlay.querySelectorAll('[data-bounty]').forEach((btn) => {
    btn.addEventListener('click', () => onAccept(btn.getAttribute('data-bounty')));
  });
  document.getElementById('bountyclose').addEventListener('click', onClose);
}

// --- the showroom board ---------------------------------------------------------------
// The showroom board: all six rares, where they were last spotted, and
// whether Leo already has the keys. Display only — the hunt happens on
// the streets, not in a menu.
export function showCollectors(items, money, summary, onClose) {
  els.overlay.style.display = 'flex';
  const rows = items.map((item) => {
    const state = item.owned
      ? '<span style="color:#7dff8a">IN THE SHOWROOM · $' + item.bonus.toLocaleString() + '</span>'
      : '<span style="color:#ffd23e">' + item.state + '</span>';
    return '<div style="display:flex;justify-content:space-between;gap:16px;margin:4px 0">' +
      '<span>' + item.label + '</span>' + state + '</div>';
  }).join('');
  els.overlay.innerHTML =
    '<div class="panel"><h1 style="font-size:36px;color:#ffd23e">THE SHOWROOM</h1>' +
    '<p>' + summary + '</p>' +
    '<p>Cash: <b>$' + money.toLocaleString() + '</b> — steal a rare, drive it to Venn\u2019s Garage, and Leo logs it in the book. All six gild the Comet GT gold.</p>' +
    '<div style="text-align:left;display:inline-block;min-width:340px">' + rows + '</div>' +
    '<div><button id="showroomclose">BACK TO THE STREETS</button></div></div>';
  document.getElementById('showroomclose').addEventListener('click', onClose);
}

// --- street-art gallery ---------------------------------------------------------------
// The graffiti gallery: all twelve walls with their hints and whether
// each one is dry. Same shape as the showroom panel — a list, a
// summary, and a way back to the streets.
export function showGraffiti(items, money, summary, onClose) {
  els.overlay.style.display = 'flex';
  const rows = items.map((item) => {
    const state = item.owned
      ? '<span style="color:#7dff8a">DRY ✓</span>'
      : '<span style="color:#ffd23e">BLANK — press I at the wall</span>';
    return '<div style="display:flex;justify-content:space-between;gap:16px;margin:4px 0">' +
      '<span>' + item.label + '</span>' + state + '</div>';
  }).join('');
  els.overlay.innerHTML =
    '<div class="panel"><h1 style="font-size:36px;color:#ff5c8a">STREET ART</h1>' +
    '<p>' + summary + '</p>' +
    '<p>Cash: <b>$' + money.toLocaleString() + '</b> — walk up to a blank wall, press <b>I</b>, and lay three coats: the needle sweeps, <b>E</b> sprays near the middle. Every finished wall pays $500, the full set pays $5,000 more and unlocks the gold spray paint.</p>' +
    '<div style="text-align:left;display:inline-block;min-width:340px">' + rows + '</div>' +
    '<div><button id="graffiticlose">BACK TO THE STREETS</button></div></div>';
  document.getElementById('graffiticlose').addEventListener('click', onClose);
}

export function showStunts(items, money, summary, onClose) {
  els.overlay.style.display = 'flex';
  const rows = items.map((item) => {
    const state = item.badge
      ? '<span style="color:#ff7a1a">' + item.badge + '</span>'
      : item.owned === undefined
        ? ''
        : item.owned
          ? '<span style="color:#7dff8a">CLEARED ✓</span>'
          : '<span style="color:#ffd23e">NOT JUMPED</span>';
    return '<div style="display:flex;justify-content:space-between;gap:16px;margin:4px 0">' +
      '<span>' + item.label + ' <small style="color:#c9c4ef">' + (item.sub || '') + '</small></span>' + state + '</div>';
  }).join('');
  els.overlay.innerHTML =
    '<div class="panel"><h1 style="font-size:36px;color:#ff7a1a">STUNT JUMPS</h1>' +
    '<p>' + summary + '</p>' +
    '<p>Cash: <b>$' + money.toLocaleString() + '</b> — hit a ramp flat out (12+ m/s, along its line) and the car launches: airtime and entry speed set the score, and the cash is twice the score. Big air runs in slow motion. Clear all eight ramps for the $5,000 set bonus.</p>' +
    '<div style="text-align:left;display:inline-block;min-width:340px">' + rows + '</div>' +
    '<div><button id="stuntsclose">BACK TO THE STREETS</button></div></div>';
  document.getElementById('stuntsclose').addEventListener('click', onClose);
}

// The mission title card: a big cinematic card that fades in when a
// story mission starts, holds for a few seconds, and fades out on its
// own — the film's title, not a toast.
let titleTimer = null;
export function showTitleCard(title, subtitle, reward) {
  const card = document.getElementById('titlecard');
  if (!card) return;
  card.innerHTML = '<div class="t">' + title + '</div>' +
    '<div class="s">' + (subtitle || '') + '</div>' +
    (reward ? '<div class="r">PAYS $' + reward.toLocaleString() + '</div>' : '');
  card.classList.add('show');
  if (titleTimer) clearTimeout(titleTimer);
  titleTimer = setTimeout(() => card.classList.remove('show'), 3600);
}

// The letterbox: two black bars that close in on big stunt air, so a
// jump reads like a shot from a film.
export function setLetterbox(on) {
  document.body.classList.toggle('letterbox', !!on);
}

export function showBusted(onRetry) {
  els.overlay.style.display = 'flex';
  els.overlay.innerHTML =
    '<div class="panel"><h1 style="font-size:44px;color:#ff5a4a">BUSTED</h1>' +
    '<p>The Solmar PD caught up with Mara. Bail cost her $150 — and a night ' +
    'in the cells. The debt is still waiting.</p>' +
    '<button id="retrybtn">BACK TO THE STREETS</button></div>';
  document.getElementById('retrybtn').addEventListener('click', onRetry);
}

export function showWasted(onRetry) {
  els.overlay.style.display = 'flex';
  els.overlay.innerHTML =
    '<div class="panel"><h1 style="font-size:44px;color:#ff5a4a">WASTED</h1>' +
    '<p>Mara went down in the streets of Solmar. The city doesn\u2019t stop — ' +
    'but neither does she.</p>' +
    '<button id="retrybtn">GET UP AND GO AGAIN</button></div>';
  document.getElementById('retrybtn').addEventListener('click', onRetry);
}

export function showStoryComplete(onContinue) {
  els.overlay.style.display = 'flex';
  els.overlay.innerHTML =
    '<div class="panel"><h1 style="font-size:40px">SOLMAR IS FREE</h1>' +
    '<p>Mara holds the garage deed, the ledger is hers, the harbor is ' +
    'free, the resort breathes again — and Venn\u2019s plane never left ' +
    'Runway 27. Then Rocco came for the east side, and Mara took the ' +
    'quad, ran the bay, and brought him down in front of the whole ' +
    'stadium. The second ledger named everyone Venn ever owned, the ' +
    'long con at the casino took back the last of Rocco\u2019s money, ' +
    'and the night shift took Club Neon and the harbor job took the ' +
    'last of his cash. Then his last crew came for the safehouse and ' +
    'broke on the door, and the final bag came home by boat at ' +
    'sunset. Eighteen jobs, and the sun is setting over the ' +
    'marina, and the city is ' +
    'hers. Free roam continues — run the taxi company, ride the taxi ' +
    'rank anywhere in town, tune the Comet at Leo\u2019s garage, race ' +
    'the circuits, buy property, hire a crew, try the tables at the ' +
    'casino, and play a DJ set at your own club — and outrun the PD.</p>' +
    '<button id="freebtn">KEEP PLAYING</button></div>';
  document.getElementById('freebtn').addEventListener('click', onContinue);
}

export function hideOverlay() {
  els.overlay.style.display = 'none';
  els.overlay.innerHTML = '';
}

// --- minimap ------------------------------------------------------------------

export function drawMinimap(world) {
  const g = mapCtx;
  const S = 190;
  // The map covers x -310..390 and z -310..390: the old city plus East
  // Solmar and the bay's edge, so the stadium and the campus fit.
  const scale = S / 700;
  const toMap = (x, z) => [(x + 310) * scale, (z + 310) * scale];
  g.clearRect(0, 0, S, S);
  // Water on the west edge.
  g.fillStyle = '#1e6f8e';
  g.fillRect(0, 0, 14, S);
  g.fillStyle = '#e8cf9a';
  g.fillRect(14, 0, 6, S);
  // Roads.
  g.strokeStyle = 'rgba(220, 220, 210, 0.75)';
  g.lineWidth = 2.5;
  for (let v = -CITY_HALF + 35; v <= CITY_HALF - 35; v += 70) {
    const [ax] = toMap(v, 0);
    g.beginPath(); g.moveTo(ax, 0); g.lineTo(ax, S); g.stroke();
    const [, bz] = toMap(0, v);
    g.beginPath(); g.moveTo(0, bz); g.lineTo(S, bz); g.stroke();
  }
  // East Solmar roads: the avenue at x = 315 and the four east streets.
  {
    const [ax] = toMap(315, 0);
    g.beginPath(); g.moveTo(ax, 0); g.lineTo(ax, S); g.stroke();
    for (const sz of [-70, 70, 140, 210]) {
      const [, bz] = toMap(0, sz);
      const [x0] = toMap(280, 0);
      const [x1] = toMap(380, 0);
      g.beginPath(); g.moveTo(x0, bz); g.lineTo(x1, bz); g.stroke();
    }
  }
  // Mission marker.
  if (world.marker) {
    const [mx, my] = toMap(world.marker.x, world.marker.z);
    const pulse = 1 + Math.sin(world.time * 4) * 0.25;
    g.fillStyle = '#ffd23e';
    g.beginPath(); g.arc(mx, my, 7 * pulse, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#1a1030';
    g.lineWidth = 2;
    g.beginPath(); g.arc(mx, my, 7 * pulse, 0, Math.PI * 2); g.stroke();
  }
  // Traffic dots.
  g.fillStyle = '#cfd8ff';
  for (const c of world.traffic) {
    const [cx, cy] = toMap(c.x, c.z);
    g.fillRect(cx - 1.5, cy - 1.5, 3, 3);
  }
  // Police dots. Sable the lookout puts a gold ring on every one, so
  // Mara sees the PD coming before the PD sees her.
  g.fillStyle = '#4a8cff';
  for (const p of world.police) {
    const [px, py] = toMap(p.x, p.z);
    g.beginPath(); g.arc(px, py, 3.5, 0, Math.PI * 2); g.fill();
    if (world.lookout) {
      g.strokeStyle = '#ffd23e';
      g.lineWidth = 2;
      g.beginPath(); g.arc(px, py, 6, 0, Math.PI * 2); g.stroke();
    }
  }
  // Roadblocks: orange squares where the PD has closed the road.
  if (world.roadblocks) {
    g.fillStyle = '#ff8a1a';
    for (const rb of world.roadblocks) {
      const [rx, ry] = toMap(rb.x, rb.z);
      g.fillRect(rx - 4, ry - 4, 8, 8);
      g.strokeStyle = '#1a1030';
      g.lineWidth = 1.5;
      g.strokeRect(rx - 4, ry - 4, 8, 8);
    }
  }
  // Stunt ramps: orange triangles where the jumps are, so the next
  // launch is always on the map.
  if (world.stuntRamps) {
    g.fillStyle = '#ff7a1a';
    for (const r of world.stuntRamps) {
      const [rx, ry] = toMap(r.x, r.z);
      g.beginPath();
      g.moveTo(rx, ry - 5); g.lineTo(rx + 5, ry + 4); g.lineTo(rx - 5, ry + 4);
      g.closePath(); g.fill();
    }
  }
  // The harbor: a small diamond where the docks meet the sea.
  {
    const [hx, hy] = toMap(210, -210);
    g.fillStyle = '#7ab8ff';
    g.beginPath();
    g.moveTo(hx, hy - 5); g.lineTo(hx + 5, hy); g.lineTo(hx, hy + 5); g.lineTo(hx - 5, hy);
    g.closePath(); g.fill();
  }
  // The airport: a grey strip for Runway 27 on the south edge.
  {
    const [rx, ry] = toMap(120, 272);
    g.fillStyle = '#b8b0a0';
    g.fillRect(rx - 22, ry - 2, 44, 4);
  }
  // East Solmar: a red diamond for the stadium, a green one for the
  // university, and a gold square for the mall.
  function diamond(x, z, color) {
    const [dx, dy] = toMap(x, z);
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(dx, dy - 5); g.lineTo(dx + 5, dy); g.lineTo(dx, dy + 5); g.lineTo(dx - 5, dy);
    g.closePath(); g.fill();
  }
  diamond(320, -70, '#ff5c5c');
  diamond(320, 140, '#38b24a');
  {
    const [mx, my] = toMap(320, 70);
    g.fillStyle = '#ffd23e';
    g.fillRect(mx - 4, my - 4, 8, 8);
  }
  // The boat, if Mara is on the water: a blue triangle on the bay.
  if (world.boat) {
    const [bx, by] = toMap(world.boat.x, world.boat.z);
    g.fillStyle = '#7ab8ff';
    g.beginPath();
    g.moveTo(bx, by - 6); g.lineTo(bx + 5, by + 5); g.lineTo(bx - 5, by + 5);
    g.closePath(); g.fill();
  }
  // Player arrow: heading is atan2(dx, dz) on the XZ plane, the map draws
  // x right and z down, so the up-pointing arrow rotates by PI - heading.
  // The arrow is clamped to the map so it stays visible on the bay too.
  const [px0, py0] = toMap(world.px, world.pz);
  const px = Math.max(6, Math.min(S - 6, px0));
  const py = Math.max(6, Math.min(S - 6, py0));
  g.save();
  g.translate(px, py);
  g.rotate(Math.PI - world.heading);
  g.fillStyle = '#ffd23e';
  g.beginPath();
  g.moveTo(0, -9); g.lineTo(6, 7); g.lineTo(0, 3); g.lineTo(-6, 7); g.closePath();
  g.fill();
  g.restore();
  // North tick.
  g.fillStyle = '#fff';
  g.font = 'bold 11px sans-serif';
  g.fillText('N', S - 14, 14);
}
