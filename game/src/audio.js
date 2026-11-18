// audio.js — every sound in Solmar is synthesized with WebAudio: no audio
// files, no network. Engine hum, sirens, gunshots, pickups, UI clicks and a
// slow sunset pad that loops under the city.

let ctx = null;
let master = null;
let muted = false;
let engineOsc = null;
let engineGain = null;
let sirenOscA = null;
let sirenOscB = null;
let sirenGain = null;
let rotorOsc = null;
let rotorGain = null;
let musicNodes = null;

export function initAudio() {
  if (ctx) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
  }
}

export function resumeAudio() {
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}

export function isMuted() {
  return muted;
}

function blip(freq, dur, type, vol, slideTo) {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  gain.gain.setValueAtTime(vol || 0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noiseBurst(dur, vol, lowFreq) {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  const len = Math.floor(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowFreq || 1200;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol || 0.3, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  src.start(t);
}

export const sfx = {
  click() { blip(660, 0.07, 'square', 0.12); },
  pickup() { blip(520, 0.09, 'sine', 0.25, 880); setTimeout(() => blip(880, 0.12, 'sine', 0.2, 1320), 80); },
  cash() { blip(988, 0.1, 'triangle', 0.25); setTimeout(() => blip(1319, 0.16, 'triangle', 0.25), 90); },
  gunshot() { noiseBurst(0.14, 0.5, 900); blip(160, 0.1, 'square', 0.2, 60); },
  punch() { noiseBurst(0.08, 0.35, 500); },
  crash() { noiseBurst(0.3, 0.5, 400); blip(90, 0.25, 'sawtooth', 0.2, 45); },
  door() { blip(220, 0.08, 'square', 0.15, 180); },
  mission() { [523, 659, 784].forEach((f, i) => setTimeout(() => blip(f, 0.22, 'triangle', 0.25), i * 110)); },
  busted() { [392, 311, 233].forEach((f, i) => setTimeout(() => blip(f, 0.3, 'sawtooth', 0.2), i * 160)); },
  wanted() { blip(440, 0.18, 'square', 0.18, 660); },
  denied() { blip(180, 0.15, 'square', 0.18, 120); },
  horn() { blip(370, 0.22, 'square', 0.22); setTimeout(() => blip(466, 0.22, 'square', 0.2), 60); },
  explosion() { noiseBurst(0.6, 0.7, 300); blip(70, 0.5, 'sawtooth', 0.3, 35); },
  splash() { noiseBurst(0.25, 0.25, 900); },
  radio() { blip(880, 0.08, 'sine', 0.15, 1108); setTimeout(() => blip(1108, 0.1, 'sine', 0.15), 90); },
  // Race countdown: a short beep for each number, a high one for GO.
  raceBeep() { blip(520, 0.12, 'square', 0.2); },
  raceGo() { blip(880, 0.3, 'square', 0.25, 1320); },
  // A checkpoint gate: two quick notes, higher than a pickup.
  checkpoint() { blip(1046, 0.09, 'triangle', 0.25); setTimeout(() => blip(1568, 0.14, 'triangle', 0.25), 70); },
  // Garage: a wrench clink followed by the till — an upgrade is bought.
  upgrade() { blip(2400, 0.05, 'square', 0.12); setTimeout(() => blip(988, 0.1, 'triangle', 0.25), 90); setTimeout(() => blip(1319, 0.14, 'triangle', 0.25), 180); },
};

// --- engine hum: a looped oscillator whose pitch follows speed -------------
export function startEngine() {
  if (!ctx || engineOsc) return;
  engineOsc = ctx.createOscillator();
  engineOsc.type = 'sawtooth';
  engineOsc.frequency.value = 55;
  engineGain = ctx.createGain();
  engineGain.gain.value = 0;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 420;
  engineOsc.connect(filter);
  filter.connect(engineGain);
  engineGain.connect(master);
  engineOsc.start();
}

export function setEngine(speedRatio, on, tone) {
  if (!engineGain) return;
  const target = on && !muted ? 0.05 + speedRatio * 0.075 : 0;
  engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
  // A bike buzzes high, a truck rumbles low, a car sits in the middle.
  const base = tone === 'motorcycle' ? 84 : tone === 'truck' ? 40 : 52;
  if (engineOsc) engineOsc.frequency.setTargetAtTime(base + speedRatio * 95, ctx.currentTime, 0.1);
}

export function stopEngine() {
  if (engineOsc) {
    try { engineOsc.stop(); } catch { /* already stopped */ }
    engineOsc = null;
    engineGain = null;
  }
}

// --- siren: two alternating tones, gain follows the nearest police car -----
export function startSiren() {
  if (!ctx || sirenOscA) return;
  sirenOscA = ctx.createOscillator();
  sirenOscA.type = 'sine';
  sirenOscA.frequency.value = 720;
  sirenOscB = ctx.createOscillator();
  sirenOscB.type = 'sine';
  sirenOscB.frequency.value = 960;
  sirenGain = ctx.createGain();
  sirenGain.gain.value = 0;
  sirenOscA.connect(sirenGain);
  sirenOscB.connect(sirenGain);
  sirenGain.connect(master);
  sirenOscA.start();
  sirenOscB.start();
}

export function setSiren(distance) {
  if (!sirenGain || !ctx) return;
  const near = Math.max(0, 1 - distance / 140);
  sirenGain.gain.setTargetAtTime(muted ? 0 : near * 0.09, ctx.currentTime, 0.2);
  const t = ctx.currentTime;
  const wail = Math.sin(t * 2.4) > 0 ? 720 : 960;
  sirenOscA.frequency.setTargetAtTime(wail, t, 0.05);
  sirenOscB.frequency.setTargetAtTime(wail === 720 ? 960 : 720, t, 0.05);
}

// --- helicopter rotor: a low thump loop, gain follows the chopper --------
// The rotor is two detuned low oscillators through a lowpass: the beat
// between them reads as blades chopping the air.
export function startRotor() {
  if (!ctx || rotorOsc) return;
  rotorOsc = ctx.createOscillator();
  rotorOsc.type = 'sawtooth';
  rotorOsc.frequency.value = 22;
  const rotorOscB = ctx.createOscillator();
  rotorOscB.type = 'sawtooth';
  rotorOscB.frequency.value = 24;
  rotorGain = ctx.createGain();
  rotorGain.gain.value = 0;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 160;
  rotorOsc.connect(filter);
  rotorOscB.connect(filter);
  filter.connect(rotorGain);
  rotorGain.connect(master);
  rotorOsc.start();
  rotorOscB.start();
  rotorOsc._partner = rotorOscB;
}

export function setRotor(distance, active) {
  if (!rotorGain || !ctx) return;
  const near = active ? Math.max(0, 1 - distance / 220) : 0;
  rotorGain.gain.setTargetAtTime(muted ? 0 : near * 0.12, ctx.currentTime, 0.25);
}

export function stopRotor() {
  if (rotorOsc) {
    try { rotorOsc.stop(); rotorOsc._partner && rotorOsc._partner.stop(); } catch { /* already stopped */ }
    rotorOsc = null;
    rotorGain = null;
  }
}

// --- rain: a looped patter of filtered noise under the weather ------------
let rainSrc = null;
let rainGain = null;

export function startRain() {
  if (!ctx || rainSrc) return;
  const len = Math.floor(ctx.sampleRate * 2);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  rainSrc = ctx.createBufferSource();
  rainSrc.buffer = buffer;
  rainSrc.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  rainGain = ctx.createGain();
  rainGain.gain.value = 0;
  rainSrc.connect(filter);
  filter.connect(rainGain);
  rainGain.connect(master);
  rainSrc.start();
}

export function setRainLevel(level) {
  if (!rainGain || !ctx) return;
  rainGain.gain.setTargetAtTime(muted ? 0 : level * 0.14, ctx.currentTime, 0.4);
}

export function stopRain() {
  if (rainSrc) {
    try { rainSrc.stop(); } catch { /* already stopped */ }
    rainSrc = null;
    rainGain = null;
  }
}

// --- sunset pad: slow chords that loop under the game ----------------------
// Two moods: warm major chords by day, a moodier minor set after dark.
// Each mood has its own oscillators and gains, so switching moods just
// fades one set out and the other in — never both at once.
export function startMusic() {
  if (!ctx || musicNodes) return;
  const dayChords = [
    [220.0, 277.18, 329.63],
    [174.61, 220.0, 261.63],
    [196.0, 246.94, 293.66],
    [146.83, 220.0, 293.66],
  ];
  const nightChords = [
    [220.0, 261.63, 329.63],
    [196.0, 233.08, 293.66],
    [174.61, 220.0, 261.63],
    [146.83, 174.61, 220.0],
  ];
  function buildSet(chordList) {
    const gains = chordList.map(() => {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(master);
      return g;
    });
    const oscs = chordList.map((chord, i) =>
      chord.map((freq) => {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = freq;
        o.connect(gains[i]);
        o.start();
        return o;
      }),
    );
    return { gains, oscs };
  }
  const day = buildSet(dayChords);
  const night = buildSet(nightChords);
  let step = 0;
  let mood = 'day';
  const timer = setInterval(() => {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const on = mood === 'night' ? night : day;
    const off = mood === 'night' ? day : night;
    on.gains.forEach((g, i) => {
      g.gain.setTargetAtTime(i === step % dayChords.length ? 0.035 : 0, t, 1.2);
    });
    off.gains.forEach((g) => g.gain.setTargetAtTime(0, t, 1.2));
    step += 1;
  }, 6000);
  musicNodes = { day, night, timer, get mood() { return mood; }, set mood(m) { mood = m; } };
}

// Switch the pad between its day and night chord sets.
export function setMusicMood(mood) {
  if (!musicNodes) return;
  musicNodes.mood = mood === 'night' ? 'night' : 'day';
}

export function stopMusic() {
  if (!musicNodes) return;
  clearInterval(musicNodes.timer);
  for (const set of [musicNodes.day, musicNodes.night]) {
    for (const row of set.oscs) for (const o of row) { try { o.stop(); } catch { /* noop */ } }
  }
  musicNodes = null;
}
