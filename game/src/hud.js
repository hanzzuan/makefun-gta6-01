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
    '$50,000. Eight jobs stand between Mara and a clean slate — if the ' +
    'Solmar PD doesn\u2019t catch her first.</p>' +
    '<div class="keys"><b>WASD</b> move / drive &nbsp; <b>Shift</b> run &nbsp; ' +
    '<b>E</b> enter / exit car &nbsp; <b>Space</b> handbrake &nbsp; <b>C</b> sneak<br>' +
    '<b>Mouse click</b> shoot &nbsp; <b>F</b> punch &nbsp; <b>1 / 2</b> fists / pistol<br>' +
    '<b>G</b> garage (near Venn\u2019s Garage) &nbsp; <b>R</b> race (at a start marker)<br>' +
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
    'Sunset tokens: <b>' + (s.tokens || 0) + ' / 6</b><br>' +
    'Races won: <b>' + (s.racesWon || 0) + '</b> · Taxi earned: <b>$' + (s.taxiEarned || 0).toLocaleString() + '</b><br>' +
    'Garage spent: <b>$' + (s.garageSpent || 0).toLocaleString() + '</b></div>' +
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
    '<div class="panel"><h1 style="font-size:40px">VENN IS FINISHED</h1>' +
    '<p>Mara holds the garage deed, the ledger is hers, the harbor is ' +
    'free, the resort breathes again — and Venn\u2019s plane never left ' +
    'Runway 27. The sun is setting over the marina, and the city is ' +
    'hers. Free roam continues — run the taxi company, tune the Comet ' +
    'at Leo\u2019s garage, race the circuits, and outrun the PD.</p>' +
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
  const scale = S / (CITY_HALF * 2 + 60);
  const toMap = (x, z) => [(x + CITY_HALF + 30) * scale, (z + CITY_HALF + 30) * scale];
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
  // Police dots.
  g.fillStyle = '#4a8cff';
  for (const p of world.police) {
    const [px, py] = toMap(p.x, p.z);
    g.beginPath(); g.arc(px, py, 3.5, 0, Math.PI * 2); g.fill();
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
  // Player arrow: heading is atan2(dx, dz) on the XZ plane, the map draws
  // x right and z down, so the up-pointing arrow rotates by PI - heading.
  const [px, py] = toMap(world.px, world.pz);
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
