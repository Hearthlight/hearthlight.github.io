/**
 * Hearthlight — audio engine
 * ===========================================================================
 * Every sound in the game is synthesised here with the Web Audio API: there
 * are no audio files. This module is self-contained (no imports) and has no
 * import-time side effects: nothing touches Web Audio until `audio.unlock()`
 * is called from a user gesture.
 *
 * Contents
 *   1. Constants, state & utilities
 *   2. Context & buses (signal graph, reverb IR, noise buffers, waves)
 *   3. Envelope / node helpers & voice bookkeeping
 *   4. Instrument voices (musicbox, kalimba, marimba, pluck, guitar, flute,
 *      pad, bass, bell, epiano) and soft percussion
 *   5. Music theory helpers & parsers (notes, chords, voicings)
 *   6. Music data (8 tracks written as data)
 *   7. Track compiler & lookahead scheduler (Player)
 *   8. Sound effects, footsteps & dialogue blips
 *   9. Jingles
 *  10. Ambient layers
 *  11. Public API
 *
 * Signal graph
 *   voice → instrument bus (lowpass/pan) → track fade ─→ music dry sum ─→ duck → muffle → music vol ─┐
 *                                        └→ send ─→ track fade(wet) → music wet sum → duck → muffle → music vol → reverb
 *   sfx/jingle/blip/footstep → group (vol/pan) → sfx tone → sfx vol ─────────────────────────────────┤
 *                                            └→ send → sfx wet vol ──────────────────────→ reverb     │
 *   ambient layer → layer gain → ambient vol ─────────────────────────────────────────────────────────┤
 *                            └→ send → ambient wet vol ─────────────────→ reverb                      │
 *   reverb (highpass → convolver, synthetic 2.6 s stereo IR) → return ────────────────────────────────┤
 *                                                                                  mix → compressor → master → out
 *
 * The music reverb send passes through its own duck/muffle/volume nodes so a
 * single shared ConvolverNode serves music, sfx and ambience while every
 * volume/duck/muffle control still affects the matching wet signal.
 *
 * Integration notes
 *   - Call audio.unlock() inside keydown/pointerdown/touchend handlers. It is
 *     idempotent and cheap, so calling it on every gesture is fine (Safari can
 *     re-suspend the context after interruptions).
 *   - Everything else may be called at any time: before unlock, music/volume/
 *     ambient requests are remembered and applied once unlocked; one-shots
 *     (sfx, jingles, blips, footsteps) are simply skipped.
 *   - setVolume takes a slider position 0..1; gain = v² (perceptual curve).
 *   - duck(amount, seconds): `amount` is the music gain while ducked (0.35 ≈ -9 dB).
 *   - Jingles, blips and footsteps play on the sfx volume; jingles duck music.
 *   - No method ever throws; unknown names log one console warning.
 */

// ───────────────────────────────────────────────────────────────────────────
// 1. Constants, state & utilities
// ───────────────────────────────────────────────────────────────────────────

import { WORLD_TRACKS } from './tracks_world.js';

const LOOKAHEAD = 0.2;      // seconds of music scheduled ahead of the audio clock
const TICK_MS = 25;         // scheduler wake-up period
const MAX_LOOKAHEAD = 1.5;  // adaptive lookahead ceiling (1 Hz throttled timers)
const MAX_VOICES = 180;     // safety cap on simultaneously allocated voices
const SILENT = 0.0001;      // "zero" for exponential ramps (-80 dB)
const OPEN_HZ = 12000;      // music bus lowpass when not muffled (gentle top-end taming)
const MUFFLE_HZ = 700;      // music bus lowpass when muffled (menus/pause)
const MUFFLE_GAIN = 0.8;    // extra music attenuation while muffled
const MIX_TRIM = 0.7;       // pre-compressor trim (offsets the compressor's makeup gain)

const KINDS = ['master', 'music', 'sfx', 'ambient'];
const AMB_KEYS = ['birds', 'crickets', 'waves', 'rain', 'wind', 'fire', 'night'];

const state = {
  vol: { master: 1, music: 1, sfx: 1, ambient: 1 }, // slider positions 0..1
  track: null,         // logical current track (what the game asked for)
  pendingFade: 2.5,    // fade to use when a pre-unlock request finally starts
  muffled: false,
  amb: { birds: 0, crickets: 0, waves: 0, rain: 0, wind: 0, fire: 0, night: 0 },
  disabled: false,     // Web Audio unavailable/failed → everything is a no-op
  lastBlip: -1,
  stepFoot: 0,
};

let E = null;          // the live engine (created by unlock())
let forcedNow = null;  // debug/offline rendering: overrides the clock
let timer = null;      // scheduler timeout handle
let lastTickMs = 0;

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const chance = (p) => Math.random() < p;
const semis = (s) => Math.pow(2, s / 12);
const cents = (c) => Math.pow(2, c / 1200);
const volCurve = (v) => v * v; // slider position → gain (perceptual-ish)
const nowT = () => (forcedNow != null ? forcedNow : E.ctx.currentTime);
const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);

const warned = new Set();
function warnOnce(key, msg) {
  if (warned.has(key)) return;
  warned.add(key);
  try { console.warn('[audio] ' + msg); } catch (_) { /* no console */ }
}

function perfNow() {
  return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
}

// ───────────────────────────────────────────────────────────────────────────
// 2. Context & buses
// ───────────────────────────────────────────────────────────────────────────

function getAudioContextClass() {
  const g = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
  return g.AudioContext || g.webkitAudioContext || null;
}

/** Build the whole mixing graph on `ctx` and return the engine object. */
function makeEngine(ctx) {
  const e = {
    ctx,
    active: 0,          // allocated one-shot voices (music notes, sfx, events)
    noise: {},          // cached noise buffers by colour
    waves: {},          // cached PeriodicWaves
    ks: new Map(),      // Karplus-Strong guitar buffers (LRU)
    players: [],        // music players (current + fading out)
    amb: null,          // ambient layers
    duck: { until: 0, amount: 1 },
  };
  const gain = (v) => { const n = ctx.createGain(); n.gain.value = v; return n; };
  const lowpass = (f) => {
    const n = ctx.createBiquadFilter();
    n.type = 'lowpass'; n.frequency.value = Math.min(f, ctx.sampleRate * 0.45); n.Q.value = 0.707;
    return n;
  };

  // Master: mix → compressor → master volume → speakers
  e.mix = gain(MIX_TRIM);
  e.comp = ctx.createDynamicsCompressor();
  setParam(e.comp.threshold, -10);
  setParam(e.comp.knee, 8);
  setParam(e.comp.ratio, 3);
  setParam(e.comp.attack, 0.004);
  setParam(e.comp.release, 0.25);
  e.master = gain(volCurve(state.vol.master));
  e.mix.connect(e.comp);
  e.comp.connect(e.master);
  e.master.connect(ctx.destination);

  // Shared reverb: highpass (keeps lows dry & clean) → convolver → return
  e.verbIn = ctx.createBiquadFilter();
  e.verbIn.type = 'highpass'; e.verbIn.frequency.value = 220; e.verbIn.Q.value = 0.6;
  e.verb = ctx.createConvolver();
  e.verb.normalize = true;
  e.verb.buffer = makeImpulse(ctx, 2.6);
  e.verbRet = gain(0.55);
  e.verbIn.connect(e.verb);
  e.verb.connect(e.verbRet);
  e.verbRet.connect(e.mix);

  // Music (dry and wet chains mirror each other)
  const mv = musicVolGain();
  const mf = state.muffled ? MUFFLE_HZ : OPEN_HZ;
  e.mDry = gain(1); e.mDuck = gain(1); e.mMuf = lowpass(mf); e.mVol = gain(mv);
  // (music wet sum starts at 2 = +6 dB: music is the main reverb user)
  e.mWet = gain(2); e.mDuckW = gain(1); e.mMufW = lowpass(mf); e.mVolW = gain(mv);
  e.mDry.connect(e.mDuck); e.mDuck.connect(e.mMuf); e.mMuf.connect(e.mVol); e.mVol.connect(e.mix);
  e.mWet.connect(e.mDuckW); e.mDuckW.connect(e.mMufW); e.mMufW.connect(e.mVolW); e.mVolW.connect(e.verbIn);

  // SFX (jingles, blips and footsteps share it)
  e.sIn = lowpass(11000);
  e.sVol = gain(volCurve(state.vol.sfx));
  e.sWet = gain(volCurve(state.vol.sfx));
  e.sIn.connect(e.sVol); e.sVol.connect(e.mix);
  e.sWet.connect(e.verbIn);

  // Ambient
  e.aVol = gain(volCurve(state.vol.ambient));
  e.aWet = gain(volCurve(state.vol.ambient));
  e.aVol.connect(e.mix);
  e.aWet.connect(e.verbIn);

  for (const k of ['mix', 'comp', 'master', 'verbIn', 'verb', 'verbRet', 'mDry', 'mDuck', 'mMuf', 'mVol',
    'mWet', 'mDuckW', 'mMufW', 'mVolW', 'sIn', 'sVol', 'sWet', 'aVol', 'aWet']) pinChannels(e[k], 2);
  return e;
}

function musicVolGain() {
  return volCurve(state.vol.music) * (state.muffled ? MUFFLE_GAIN : 1);
}

function setParam(p, v) { try { p.value = v; } catch (_) { /* read-only in some mocks */ } }

/**
 * Pin a node's channel count. Summing nodes otherwise flip between mono and
 * stereo as panned voices come and go, and stateful nodes (filters, the
 * compressor) reset their state on such a flip — an audible one-sample click.
 */
function pinChannels(node, n) {
  try { node.channelCountMode = 'explicit'; node.channelCount = n; } catch (_) { /* not supported */ }
  return node;
}

/**
 * Synthetic stereo impulse response: decaying noise that darkens over time
 * (one-pole lowpass whose cutoff falls as the tail decays), with a short
 * pre-delay, a soft onset and a faded end so it never clicks.
 */
function makeImpulse(ctx, seconds) {
  const sr = ctx.sampleRate;
  const n = Math.max(1, Math.floor(sr * seconds));
  const buf = ctx.createBuffer(2, n, sr);
  const pre = Math.floor(sr * 0.014);
  const rt60 = seconds * 0.9;
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = pre; i < n; i++) {
      const t = (i - pre) / sr;
      const env = Math.pow(10, (-3 * t) / rt60);
      const onset = t < 0.01 ? t / 0.01 : 1;
      const k = 0.08 + 0.55 * Math.exp(-t * 1.4); // brightness falls with time
      lp += k * ((Math.random() * 2 - 1) - lp);
      d[i] = lp * env * onset;
    }
    const tail = Math.min(n - pre, Math.floor(sr * 0.08));
    for (let i = 0; i < tail; i++) d[n - 1 - i] *= i / tail;
  }
  return buf;
}

/**
 * Cached, seamlessly-loopable noise buffers ('white' | 'pink' | 'brown').
 * The end is cross-faded into the start so looping never clicks.
 */
function noiseBuffer(color) {
  const cached = E.noise[color];
  if (cached) return cached;
  const ctx = E.ctx, sr = ctx.sampleRate;
  const secs = color === 'white' ? 2.5 : 4;
  const n = Math.floor(sr * secs), fade = Math.floor(sr * 0.05);
  const raw = new Float32Array(n + fade);
  if (color === 'pink') {
    // Paul Kellet's refined pink filter
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < raw.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520; b3 = 0.86650 * b3 + w * 0.3104856;
      b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.0168980;
      raw[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  } else if (color === 'brown') {
    let last = 0;
    for (let i = 0; i < raw.length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      raw[i] = last * 3.5;
    }
  } else {
    for (let i = 0; i < raw.length; i++) raw[i] = Math.random() * 2 - 1;
  }
  // remove DC, cross-fade the overhang into the start, normalise
  let mean = 0;
  for (let i = 0; i < raw.length; i++) mean += raw[i];
  mean /= raw.length;
  const buf = ctx.createBuffer(1, n, sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = raw[i] - mean;
  for (let i = 0; i < fade; i++) {
    const x = (i / fade) * Math.PI * 0.5;
    d[i] = (raw[i] - mean) * Math.sin(x) + (raw[n + i] - mean) * Math.cos(x);
  }
  let peak = 0;
  for (let i = 0; i < n; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; }
  if (peak > 0) { const s = 0.95 / peak; for (let i = 0; i < n; i++) d[i] *= s; }
  E.noise[color] = buf;
  return buf;
}

/** Harmonic recipes for PeriodicWaves (sine-term amplitudes, fundamental first). */
const WAVE_RECIPES = {
  flute: [1, 0.32, 0.12, 0.06, 0.025, 0.012],
  bass: [1, 0.45, 0.16, 0.07, 0.03],
  warm: Array.from({ length: 28 }, (_, i) => 1 / Math.pow(i + 1, 1.3)), // soft saw
  hollow: [1, 0, 0.25, 0, 0.08, 0, 0.02],                              // soft square (coins)
  reed: [1, 0.6, 0.38, 0.22, 0.12, 0.06, 0.03],
};

function wave(name) {
  let w = E.waves[name];
  if (w) return w;
  const h = WAVE_RECIPES[name] || WAVE_RECIPES.warm;
  const real = new Float32Array(h.length + 1);
  const imag = new Float32Array(h.length + 1);
  for (let i = 0; i < h.length; i++) imag[i + 1] = h[i];
  w = E.ctx.createPeriodicWave(real, imag);
  E.waves[name] = w;
  return w;
}

// ───────────────────────────────────────────────────────────────────────────
// 3. Envelope / node helpers & voice bookkeeping
// ───────────────────────────────────────────────────────────────────────────
//
// Control parameters (volumes, fades, duck, muffle) are only ever moved with
// setTargetAtTime after cancelScheduledValues: that always continues from the
// param's *actual* current value, so there are never jumps (and we never have
// to read `param.value`, which is unreliable mid-automation in some browsers).
// One-shot voice envelopes always start and end at SILENT with ramps.

/** Smoothly move a control param toward v (time-constant tau, seconds). */
function glide(p, v, t, tau) {
  p.cancelScheduledValues(t);
  p.setTargetAtTime(v, t, Math.max(0.001, tau));
}

const clampF = (f) => clamp(f, 10, E.ctx.sampleRate * 0.45);

function gainAt(v) {
  const g = E.ctx.createGain();
  g.gain.value = v;
  return g;
}

function filt(type, f, q) {
  const b = E.ctx.createBiquadFilter();
  b.type = type;
  b.frequency.value = clampF(f);
  b.Q.value = q == null ? 0.707 : q;
  return b;
}

function panNode(p) {
  if (!E.ctx.createStereoPanner) return null;
  const n = E.ctx.createStereoPanner();
  n.pan.value = clamp(p, -1, 1);
  return n;
}

const BASIC_TYPES = { sine: 1, triangle: 1, square: 1, sawtooth: 1 };

function osc(type, f, t) {
  const o = E.ctx.createOscillator();
  if (BASIC_TYPES[type]) o.type = type;
  else o.setPeriodicWave(wave(type));
  o.frequency.setValueAtTime(clampF(f), t);
  return o;
}

/** Noise source from the cached loopable buffers, random start offset. */
function noiseSrc(color, t, dur) {
  const s = E.ctx.createBufferSource();
  const b = noiseBuffer(color);
  s.buffer = b;
  let off;
  if (dur + 0.1 >= b.duration) { s.loop = true; off = Math.random() * b.duration * 0.5; }
  else off = Math.random() * (b.duration - dur - 0.1);
  s.start(t, off);
  return s;
}

/** Percussive envelope: SILENT → peak (linear, a) → exponential decay to SILENT over d. */
function envPerc(p, t, peak, a, d) {
  peak = Math.max(peak, SILENT * 2);
  p.setValueAtTime(SILENT, t);
  p.linearRampToValueAtTime(peak, t + a);
  p.exponentialRampToValueAtTime(SILENT, t + a + d);
  return t + a + d;
}

/** Plucked envelope: natural exponential decay, damped (release r) if the note ends first. */
function envPluck(p, t, peak, a, d, dur, r) {
  peak = Math.max(peak, SILENT * 2);
  p.setValueAtTime(SILENT, t);
  p.linearRampToValueAtTime(peak, t + a);
  const tOff = t + Math.max(dur, a + 0.02);
  if (tOff + r >= t + a + d) {
    p.exponentialRampToValueAtTime(SILENT, t + a + d);
    return t + a + d;
  }
  const v = peak * Math.pow(SILENT / peak, (tOff - t - a) / d); // value on the decay curve
  p.exponentialRampToValueAtTime(Math.max(v, SILENT), tOff);
  p.exponentialRampToValueAtTime(SILENT, tOff + r);
  return tOff + r;
}

/** Sustained ADSR (linear attack, exponential decay & release). Returns the end time. */
function envADSR(p, t, dur, peak, a, d, s, r) {
  peak = Math.max(peak, SILENT * 2);
  const sv = Math.max(peak * s, SILENT * 2);
  const tOff = t + Math.max(dur, 0.01);
  p.setValueAtTime(SILENT, t);
  if (tOff <= t + a) {
    p.linearRampToValueAtTime(Math.max(peak * (tOff - t) / a, SILENT * 2), tOff);
  } else {
    p.linearRampToValueAtTime(peak, t + a);
    if (tOff <= t + a + d) {
      p.exponentialRampToValueAtTime(peak * Math.pow(sv / peak, (tOff - t - a) / d), tOff);
    } else {
      p.exponentialRampToValueAtTime(sv, t + a + d);
      p.setValueAtTime(sv, tOff);
    }
  }
  p.exponentialRampToValueAtTime(SILENT, tOff + r);
  return tOff + r;
}

/**
 * Voice bookkeeping: `src` is the source that stops last; when it ends every
 * node of the voice is disconnected so nothing accumulates. `grp` (optional)
 * is a temporary output group (sfx/jingle) released when its last voice ends.
 */
function own(src, nodes, grp) {
  const e = E;
  e.active++;
  if (grp) grp.n++;
  src.onended = () => {
    e.active--;
    for (let i = 0; i < nodes.length; i++) { try { nodes[i].disconnect(); } catch (_) { /* already */ } }
    nodes.length = 0;
    if (grp && --grp.n <= 0 && grp.sealed) dropGroup(grp);
  };
}

/** Temporary output group: volume → optional pan → dest, plus optional reverb send. */
function makeGroup(vol, pan, send, dest, wetDest) {
  const out = gainAt(vol);
  const nodes = [out];
  let head = out;
  if (pan) {
    const p = panNode(pan);
    if (p) { out.connect(p); head = p; nodes.push(p); }
  }
  head.connect(dest || E.sIn);
  if (send > 0) {
    const w = gainAt(send);
    head.connect(w);
    w.connect(wetDest || E.sWet);
    nodes.push(w);
  }
  return { out, nodes, n: 0, sealed: false };
}

/** Call after scheduling a group's voices; frees it once they have all ended. */
function seal(g) {
  g.sealed = true;
  if (g.n <= 0) dropGroup(g);
}

function dropGroup(g) {
  for (const n of g.nodes) { try { n.disconnect(); } catch (_) { /* already */ } }
  g.nodes.length = 0;
}

/** One enveloped oscillator partial (optionally gliding from f0) → dest. */
function partial(dest, t, type, f, peak, a, d, nodes, f0, glideT) {
  const o = osc(type, f0 || f, t);
  if (f0) o.frequency.exponentialRampToValueAtTime(clampF(f), t + glideT);
  const g = gainAt(0);
  const end = envPerc(g.gain, t, peak, a, d);
  o.connect(g);
  g.connect(dest);
  o.start(t);
  o.stop(end + 0.02);
  nodes.push(o, g);
  return o;
}

// ───────────────────────────────────────────────────────────────────────────
// 4. Instrument voices
// ───────────────────────────────────────────────────────────────────────────
// Signature: (dest, t, midi, durSeconds, velocity 0..1, group?)
// Peak output of a voice is roughly velocity × 0.5; the instrument bus level
// (VOICES table) sets the balance between instruments.

/** Music box: sine + shimmering octave + tiny inharmonic "ting"; rings freely. */
function vMusicbox(dest, t, m, dur, v, grp) {
  const f = mtof(m), nodes = [];
  const ring = clamp(2.8 - (m - 72) * 0.07, 0.9, 3.2);
  const main = partial(dest, t, 'sine', f, 0.5 * v, 0.004, ring, nodes);
  partial(dest, t, 'sine', f * 2.004, 0.09 * v, 0.003, ring * 0.4, nodes);
  if (f * 5.4 < 9000) partial(dest, t, 'sine', f * 5.4, 0.03 * v, 0.002, 0.08, nodes);
  own(main, nodes, grp);
}

/** Kalimba: warm sine, hollow 3rd partial, brief tine "tink". */
function vKalimba(dest, t, m, dur, v, grp) {
  const f = mtof(m), nodes = [];
  const ring = clamp(1.8 - (m - 60) * 0.03, 0.6, 2.0);
  const main = partial(dest, t, 'sine', f, 0.5 * v, 0.006, ring, nodes);
  partial(dest, t, 'sine', f * 3.02, 0.05 * v, 0.004, ring * 0.22, nodes);
  if (f * 5.95 < 9000) partial(dest, t, 'sine', f * 5.95, 0.04 * v, 0.002, 0.05, nodes);
  own(main, nodes, grp);
}

/** Marimba: sine with a brief pitch drop, tuned 4th overtone, short woody decay. */
function vMarimba(dest, t, m, dur, v, grp) {
  const f = mtof(m), nodes = [];
  const dec = clamp(1.05 - (m - 60) * 0.022, 0.3, 1.2);
  const main = partial(dest, t, 'sine', f, 0.55 * v, 0.003, dec, nodes, f * 1.015, 0.025);
  partial(dest, t, 'sine', f * 3.99, 0.13 * v, 0.002, Math.min(0.14, dec * 0.3), nodes);
  if (f < 520) partial(dest, t, 'sine', f * 9.8, 0.03 * v, 0.001, 0.025, nodes);
  own(main, nodes, grp);
}

/** Pluck: soft saw + triangle through a closing lowpass (a mellow harp/piano-ish pluck). */
function vPluck(dest, t, m, dur, v, grp) {
  const f = mtof(m);
  const o1 = osc('warm', f, t);
  const o2 = osc('triangle', f, t);
  o2.detune.value = 6;
  const lp = filt('lowpass', Math.min(f * 7, 5200), 0.9);
  lp.frequency.setValueAtTime(clampF(Math.min(f * 7, 5200)), t);
  lp.frequency.exponentialRampToValueAtTime(clampF(Math.max(f * 1.6, 350)), t + 0.25);
  const g = gainAt(0);
  const decay = clamp(1.4 - (m - 55) * 0.02, 0.45, 1.4);
  const end = envPluck(g.gain, t, 0.3 * v, 0.004, decay, dur, 0.12);
  o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(dest);
  o1.start(t); o2.start(t); o1.stop(end + 0.02); o2.stop(end + 0.02);
  own(o1, [o1, o2, lp, g], grp);
}

/** Karplus-Strong string buffer for a MIDI note (cached, LRU-bounded). */
function ksBuffer(m) {
  const key = Math.round(m);
  const hit = E.ks.get(key);
  if (hit) { E.ks.delete(key); E.ks.set(key, hit); return hit; }
  const ctx = E.ctx, sr = ctx.sampleRate, f = mtof(key);
  const N = Math.max(2, Math.round(sr / f - 0.5));
  const f0 = sr / (N + 0.5);            // the 2-tap average adds half a sample of delay
  const len = Math.floor(sr * 1.5);
  const buf = ctx.createBuffer(1, len, sr);
  const y = buf.getChannelData(0);
  let lpv = 0, mean = 0;
  let lp2 = 0; // two one-pole passes: a soft, warm "thumb" pluck rather than a bright pick
  for (let i = 0; i < N; i++) { lpv += 0.45 * ((Math.random() * 2 - 1) - lpv); lp2 += 0.45 * (lpv - lp2); y[i] = lp2; mean += lp2; }
  mean /= N;
  for (let i = 0; i < N; i++) y[i] -= mean;
  const t60 = clamp(3.2 - (key - 40) * 0.055, 0.9, 3.2);
  const rho = Math.pow(0.001, 1 / (f0 * t60));
  for (let i = N; i < len; i++) y[i] = rho * 0.5 * (y[i - N] + (i - N - 1 >= 0 ? y[i - N - 1] : 0));
  let peak = 0;
  for (let i = 0; i < len; i++) { const a = Math.abs(y[i]); if (a > peak) peak = a; }
  if (peak > 0) for (let i = 0; i < len; i++) y[i] *= 0.9 / peak;
  const entry = { buf, rate: f / f0 };  // playbackRate corrects the integer-delay tuning error
  E.ks.set(key, entry);
  if (E.ks.size > 24) E.ks.delete(E.ks.keys().next().value);
  return entry;
}

/** Nylon-ish guitar: Karplus-Strong pluck with a soft attack and damped release. */
function vGuitar(dest, t, m, dur, v, grp) {
  const ks = ksBuffer(m);
  const src = E.ctx.createBufferSource();
  src.buffer = ks.buf;
  src.playbackRate.value = ks.rate;
  const len = ks.buf.duration / ks.rate;
  const g = gainAt(0);
  const tOff = Math.min(t + Math.max(dur, 0.1) + 0.2, t + len - 0.25);
  g.gain.setValueAtTime(SILENT, t);
  g.gain.linearRampToValueAtTime(0.5 * v, t + 0.003);
  g.gain.setValueAtTime(0.5 * v, tOff);
  g.gain.exponentialRampToValueAtTime(SILENT, tOff + 0.2);
  src.connect(g); g.connect(dest);
  src.start(t);
  src.stop(tOff + 0.22);
  own(src, [src, g], grp);
}

/** Flute: breathy sine-ish tone, pitch scoop on attack, delayed vibrato, breath noise. */
function vFlute(dest, t, m, dur, v, grp) {
  const f = mtof(m);
  const o = osc('flute', f, t);
  o.detune.setValueAtTime(-22, t);
  o.detune.linearRampToValueAtTime(0, t + 0.07);
  const lfo = osc('sine', rand(4.8, 5.6), t);
  const lg = gainAt(0);
  if (dur > 0.4) {
    lg.gain.setValueAtTime(0, t + 0.3);
    lg.gain.linearRampToValueAtTime(10, t + Math.min(dur, 0.95));
  }
  lfo.connect(lg); lg.connect(o.detune);
  const g = gainAt(0);
  const end = envADSR(g.gain, t, dur, 0.3 * v, 0.06, 0.25, 0.78, 0.14);
  o.connect(g); g.connect(dest);
  const nz = noiseSrc('white', t, dur + 0.3);
  const bp = filt('bandpass', Math.min(f * 2, 4500), 1.3);
  const ng = gainAt(0);
  envADSR(ng.gain, t, dur, 0.06 * v, 0.03, 0.12, 0.3, 0.12);
  nz.connect(bp); bp.connect(ng); ng.connect(dest);
  o.start(t); lfo.start(t);
  o.stop(end + 0.03); lfo.stop(end + 0.03); nz.stop(end + 0.03);
  own(o, [o, lfo, lg, g, nz, bp, ng], grp);
}

/** Pad: a whole chord of detuned soft-saw pairs (spread L/R) through a slowly opening lowpass. */
function vPad(dest, t, notes, dur, v, grp) {
  const ctx = E.ctx;
  if (!Array.isArray(notes)) notes = [notes];
  const atk = clamp(dur * 0.35, 0.25, 1.1), rel = 1.5;
  const lp = filt('lowpass', 400, 0.5);
  lp.frequency.setValueAtTime(380, t);
  lp.frequency.linearRampToValueAtTime(1350, t + atk * 1.3);
  lp.frequency.linearRampToValueAtTime(950, t + dur + rel);
  const merge = ctx.createChannelMerger ? ctx.createChannelMerger(2) : null;
  const g = gainAt(0);
  const peak = (0.2 * v) / Math.sqrt(notes.length * 2);
  const end = envADSR(g.gain, t, dur, peak, atk, 0.8, 0.85, rel);
  const nodes = [lp, g];
  if (merge) { merge.connect(lp); nodes.push(merge); }
  let first = null;
  for (const m of notes) {
    for (let side = 0; side < 2; side++) {
      const o = osc('warm', mtof(m), t);
      o.detune.value = (side ? 6 : -7) + rand(-2, 2);
      if (merge) o.connect(merge, 0, side); else o.connect(lp);
      o.start(t);
      o.stop(end + 0.03);
      nodes.push(o);
      first = first || o;
    }
  }
  lp.connect(g); g.connect(dest);
  own(first, nodes, grp);
}

/** Bass: round sine-heavy tone (a few harmonics so it reads on small speakers). */
function vBass(dest, t, m, dur, v, grp) {
  const o = osc('bass', mtof(m), t);
  const g = gainAt(0);
  const end = envADSR(g.gain, t, dur, 0.5 * v, 0.008, 0.3, 0.6, 0.09);
  o.connect(g); g.connect(dest);
  o.start(t); o.stop(end + 0.02);
  own(o, [o, g], grp);
}

/** Bell: gentle FM (1:3.5) whose brightness fades quickly into a pure tail. */
function vBell(dest, t, m, dur, v, grp) {
  const f = mtof(m);
  const car = osc('sine', f, t);
  const mod = osc('sine', f * 3.5, t);
  const mg = gainAt(0);
  const idx = clamp(1.25 - f / 2000, 0.3, 1.0); // brightness falls with pitch: never piercing
  mg.gain.setValueAtTime(idx * f * 3.5, t);
  mg.gain.exponentialRampToValueAtTime(f * 0.02, t + 0.6);
  mod.connect(mg); mg.connect(car.frequency);
  const g = gainAt(0);
  const ring = clamp(2.8 - (m - 72) * 0.05, 1.2, 3.0);
  const end = envPerc(g.gain, t, 0.3 * v, 0.002, ring);
  car.connect(g); g.connect(dest);
  car.start(t); mod.start(t); car.stop(end + 0.02); mod.stop(end + 0.02);
  own(car, [car, mod, mg, g], grp);
}

/** Electric piano: 1:1 FM whose index decays (soft bark → mellow tone). */
function vEpiano(dest, t, m, dur, v, grp) {
  const f = mtof(m);
  const car = osc('sine', f, t);
  const mod = osc('sine', f, t);
  const mg = gainAt(0);
  mg.gain.setValueAtTime(f * (0.7 + v * 0.7), t);
  mg.gain.exponentialRampToValueAtTime(f * 0.12, t + 0.9);
  mod.connect(mg); mg.connect(car.frequency);
  const g = gainAt(0);
  const ring = clamp(2.6 - (m - 60) * 0.04, 0.9, 3.0);
  const end = envPluck(g.gain, t, 0.34 * v, 0.004, ring, dur, 0.25);
  car.connect(g); g.connect(dest);
  car.start(t); mod.start(t); car.stop(end + 0.02); mod.stop(end + 0.02);
  own(car, [car, mod, mg, g], grp);
}

// Soft percussion — same signature; pitch/duration ignored.

/** Filtered-noise hit helper used by the percussion voices and sfx. */
function noiseHit(dest, t, color, type, f, q, peak, a, d, grp, f2) {
  const s = noiseSrc(color, t, a + d + 0.05);
  const b = filt(type, f, q);
  if (f2) {
    b.frequency.setValueAtTime(clampF(f), t);
    b.frequency.exponentialRampToValueAtTime(clampF(f2), t + a + d);
  }
  const g = gainAt(0);
  const end = envPerc(g.gain, t, peak, a, d);
  s.connect(b); b.connect(g); g.connect(dest);
  s.stop(end + 0.02);
  own(s, [s, b, g], grp);
  return end;
}

function pShaker(dest, t, m, dur, v, grp) {
  noiseHit(dest, t, 'white', 'bandpass', rand(4200, 5200), 0.9, 0.17 * v, 0.012, rand(0.05, 0.075), grp);
}

function pKick(dest, t, m, dur, v, grp) {
  const nodes = [];
  const o = partial(dest, t, 'sine', 48, 0.7 * v, 0.004, 0.28, nodes, 115, 0.11);
  own(o, nodes, grp);
}

function pWood(dest, t, m, dur, v, grp) {
  const nodes = [];
  const f = 1250 * (m ? semis(m - 60) : 1);
  const o = partial(dest, t, 'sine', f * 0.9, 0.3 * v, 0.002, 0.06, nodes, f, 0.02);
  partial(dest, t, 'triangle', f * 1.9, 0.05 * v, 0.001, 0.02, nodes);
  own(o, nodes, grp);
}

function pBrush(dest, t, m, dur, v, grp) {
  noiseHit(dest, t, 'pink', 'bandpass', rand(2300, 2900), 0.6, 0.14 * v, 0.035, 0.16, grp);
}

function pTamb(dest, t, m, dur, v, grp) {
  noiseHit(dest, t, 'white', 'bandpass', 7200, 1.6, 0.1 * v, 0.003, 0.11, grp);
  noiseHit(dest, t + 0.018, 'white', 'bandpass', 6400, 1.6, 0.05 * v, 0.003, 0.08, grp);
}

function pClap(dest, t, m, dur, v, grp) {
  for (let i = 0; i < 3; i++) {
    noiseHit(dest, t + i * 0.011, 'white', 'bandpass', 1350, 1.1, (i === 2 ? 0.22 : 0.12) * v, 0.002, i === 2 ? 0.12 : 0.012, grp);
  }
}

/**
 * Instrument table: voice function + bus settings.
 *   lvl  – bus gain, send – reverb send, lp – bus lowpass (Hz, 0 = none), pan – stereo position
 */
const VOICES = {
  musicbox: { fn: vMusicbox, lvl: 0.5, send: 0.4, lp: 6500, pan: 0.12 },
  kalimba: { fn: vKalimba, lvl: 0.62, send: 0.26, lp: 5500, pan: -0.06 },
  marimba: { fn: vMarimba, lvl: 0.62, send: 0.22, lp: 5200, pan: 0.06 },
  pluck: { fn: vPluck, lvl: 0.5, send: 0.2, lp: 4200, pan: -0.22 },
  guitar: { fn: vGuitar, lvl: 0.5, send: 0.2, lp: 4000, pan: -0.24 },
  flute: { fn: vFlute, lvl: 0.55, send: 0.34, lp: 6500, pan: 0.14 },
  pad: { fn: vPad, lvl: 0.55, send: 0.5, lp: 0, pan: 0, chord: true },
  bass: { fn: vBass, lvl: 0.62, send: 0.04, lp: 0, pan: 0 },
  bell: { fn: vBell, lvl: 0.3, send: 0.55, lp: 6000, pan: 0.28 },
  epiano: { fn: vEpiano, lvl: 0.5, send: 0.22, lp: 5000, pan: -0.08 },
  shaker: { fn: pShaker, lvl: 0.5, send: 0.1, lp: 8000, pan: 0.3 },
  kick: { fn: pKick, lvl: 0.55, send: 0, lp: 0, pan: 0 },
  wood: { fn: pWood, lvl: 0.45, send: 0.14, lp: 6000, pan: -0.28 },
  brush: { fn: pBrush, lvl: 0.45, send: 0.12, lp: 7000, pan: 0.18 },
  tamb: { fn: pTamb, lvl: 0.4, send: 0.12, lp: 9000, pan: 0.34 },
  clap: { fn: pClap, lvl: 0.4, send: 0.2, lp: 6000, pan: -0.12 },
};

// ───────────────────────────────────────────────────────────────────────────
// 5. Music theory helpers & parsers
// ───────────────────────────────────────────────────────────────────────────

const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** 'F#' → 6, 'Bb' → 10 */
function pcOf(name) {
  const m = /^([A-G])(#|b)?$/.exec(name);
  if (!m) return null;
  return (PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
}

/** 'C#5' → 73, 'Bb3' → 58 */
function noteToMidi(s) {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(s);
  if (!m) return null;
  return 12 * (parseInt(m[3], 10) + 1) + PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

const QUALITIES = {
  '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10],
  '6': [0, 4, 7, 9], m6: [0, 3, 7, 9], sus2: [0, 2, 7], sus4: [0, 5, 7], '7sus4': [0, 5, 7, 10],
  add9: [0, 4, 7, 14], madd9: [0, 3, 7, 14], maj9: [0, 4, 7, 11, 14], m9: [0, 3, 7, 10, 14],
  '9': [0, 4, 7, 10, 14], '69': [0, 4, 7, 9, 14], dim: [0, 3, 6], m7b5: [0, 3, 6, 10],
  aug: [0, 4, 8], 'maj7#11': [0, 4, 7, 11, 18],
};

/** 'D7sus4' / 'G/B' → { sym, root, iv, bass } (pitch classes & intervals). */
function parseChord(sym) {
  const [main, slash] = sym.split('/');
  const m = /^([A-G][#b]?)(.*)$/.exec(main || '');
  if (!m) return null;
  const root = pcOf(m[1]);
  const iv = QUALITIES[m[2]];
  if (root == null || !iv) return null;
  const bass = slash ? pcOf(slash) : root;
  if (bass == null) return null;
  return { sym, root, iv, bass };
}

const MODES = {
  major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11], mixolydian: [0, 2, 4, 5, 7, 9, 10],
};

function scaleOf(key, mode) {
  const r = pcOf(key) || 0;
  return (MODES[mode] || MODES.major).map((x) => (x + r) % 12);
}

/** Next scale tone above (dir=1) or below (dir=-1) midi note m. */
function scaleStep(m, scale, dir) {
  let x = m + dir;
  for (let i = 0; i < 12 && scale.indexOf(((x % 12) + 12) % 12) < 0; i++) x += dir;
  return x;
}

/**
 * Melody string → note events (steps are 16th notes). Tokens, space-separated:
 *   C5:4   note C5 lasting 4 steps (duration may be omitted to reuse the last one)
 *   _:2    rest        +:4  tie (extends the previous note)
 *   E5:2!  accent      G4:2?  ghost note
 *   |      bar line — verified to fall exactly on a bar boundary
 */
function parseMelody(str, stepsPerBar, errors, where) {
  const events = [];
  let pos = 0, lastDur = 4, last = null, bar = 0;
  for (const tok of String(str).trim().split(/\s+/)) {
    if (!tok) continue;
    if (tok === '|') {
      bar++;
      if (stepsPerBar && pos !== bar * stepsPerBar && errors) {
        errors.push(`${where}: bar ${bar} ends at step ${pos}, expected ${bar * stepsPerBar}`);
      }
      continue;
    }
    const mm = /^([A-G][#b]?-?\d|_|\+)(?::(\d+))?([!?]?)$/.exec(tok);
    if (!mm) { if (errors) errors.push(`${where}: bad token "${tok}"`); continue; }
    const d = mm[2] ? parseInt(mm[2], 10) : lastDur;
    lastDur = d;
    if (mm[1] === '_') last = null;
    else if (mm[1] === '+') { if (last) last.d += d; }
    else {
      last = { s: pos, d, m: noteToMidi(mm[1]), v: mm[3] === '!' ? 1.15 : mm[3] === '?' ? 0.6 : 1 };
      events.push(last);
    }
    pos += d;
  }
  return { events, len: pos };
}

/**
 * Chord chart → timed chords. Bars are separated by '|'; chords within a bar
 * share it evenly unless given explicit beats ('C:2 D:2'). '%' repeats the
 * previous chord.
 */
function parseChords(str, stepsPerBar, beatSteps, errors, where) {
  const list = [];
  const bars = String(str).split('|').map((b) => b.trim()).filter((b) => b.length);
  let prev = null;
  bars.forEach((barStr, bi) => {
    const items = barStr.split(/\s+/).map((tk) => {
      const [sym, beats] = tk.split(':');
      return { sym, beats: beats ? parseFloat(beats) : 0 };
    });
    const fixed = items.reduce((a, it) => a + it.beats * beatSteps, 0);
    const free = items.filter((it) => !it.beats).length;
    const each = free ? (stepsPerBar - fixed) / free : 0;
    let pos = bi * stepsPerBar;
    for (const it of items) {
      const d = it.beats ? it.beats * beatSteps : each;
      let ch = it.sym === '%' ? prev : parseChord(it.sym);
      if (!ch) { errors.push(`${where}: bad chord "${it.sym}"`); ch = prev; }
      if (d !== Math.round(d)) errors.push(`${where}: chord "${it.sym}" has fractional length`);
      if (ch) list.push({ s: pos, d, chord: ch });
      prev = ch;
      pos += d;
    }
    if (pos !== (bi + 1) * stepsPerBar) errors.push(`${where}: chord bar ${bi + 1} spans ${pos - bi * stepsPerBar} steps`);
  });
  return { list, bars: bars.length };
}

function avg(a) { let s = 0; for (const x of a) s += x; return s / a.length; }

/**
 * Voice a chord inside [lo, hi] with at most `max` notes (drops the 5th, then
 * the root). Every inversion is tried; the one moving least from the previous
 * voicing wins (smooth voice leading), else the one nearest the range centre.
 */
function voiceChord(ch, lo, hi, prev, max) {
  const iv = ch.iv.slice();
  if (iv.length > max) { const i = iv.indexOf(7); if (i >= 0) iv.splice(i, 1); }
  if (iv.length > max) { const i = iv.indexOf(0); if (i >= 0) iv.splice(i, 1); }
  while (iv.length > max) iv.pop();
  const pcs = [...new Set(iv.map((x) => (ch.root + x) % 12))].sort((a, b) => a - b);
  const centre = (lo + hi) / 2;
  let best = null, bestCost = Infinity;
  for (let r = 0; r < pcs.length; r++) {
    for (let up = 0; up < 2; up++) {
      let n = lo + (((pcs[r] - lo) % 12) + 12) % 12 + 12 * up;
      const notes = [n];
      for (let k = 1; k < pcs.length; k++) {
        const pc = pcs[(r + k) % pcs.length];
        let x = n + 1;
        while (x % 12 !== pc) x++;
        notes.push(x);
        n = x;
      }
      if (notes[notes.length - 1] > hi) continue;
      let cost = Math.abs(avg(notes) - centre) * (prev ? 0.15 : 1);
      if (prev && prev.length) {
        for (const a of notes) cost += Math.min(...prev.map((b) => Math.abs(a - b)));
        for (const b of prev) cost += Math.min(...notes.map((a) => Math.abs(a - b)));
      }
      if (cost < bestCost) { bestCost = cost; best = notes; }
    }
  }
  if (!best) { // range narrower than the chord: stack from lo
    let n = lo + (((pcs[0] - lo) % 12) + 12) % 12;
    best = [n];
    for (let k = 1; k < pcs.length; k++) { let x = n + 1; while (x % 12 !== pcs[k]) x++; best.push(x); n = x; }
  }
  return best;
}

/** Instance of pitch class `pc` inside [lo, hi] closest to `near` (or the range centre). */
function placePc(pc, lo, hi, near) {
  const target = near != null ? near : (lo + hi) / 2;
  let best = null;
  for (let n = lo; n <= hi; n++) {
    if (n % 12 === pc && (best == null || Math.abs(n - target) < Math.abs(best - target))) best = n;
  }
  return best != null ? best : lo + (((pc - lo) % 12) + 12) % 12;
}

// ───────────────────────────────────────────────────────────────────────────
// 6. Music data
// ───────────────────────────────────────────────────────────────────────────
//
// Each track is data: tempo, meter (beats per bar; the grid is always 16ths),
// swing (position of the off-beat 8th inside the beat: 0.5 = straight,
// 0.58 ≈ lilting shuffle), key/mode (for ornaments), a form (section order)
// and sections holding a chord chart plus melody lines. `parts` describe how
// the arrangement is realised:
//
//   notes – plays a melody line from the section (src)     arp  – arpeggiates the chords
//   pad   – sustained chords (voice-led)                  comp – rhythmic chord hits
//   bass  – pattern of chord degrees                      perc – drum pattern
//
// Pattern strings (one bar, one char per 16th):
//   bass/comp: 'R' root/slash bass, '3' third, '5' fifth, '7' seventh, '8' octave,
//              'a' approach note to the next chord, 'x' chord hit (comp),
//              '-' hold the previous note, '.' silence
//   perc:      'X' accent, 'x' hit, 'o' ghost, '.' rest
//
// Track options: gain (loudness trim), verb (reverb amount multiplier).
// Part options: only (section list), when ('odd' | 'even' | 'after' loops),
// alt (instrument used on odd loops), oct (transpose), density (probability a
// note plays), orn (probability of a grace-note ornament on long notes, from
// the second loop on), vel, range [lo, hi] (MIDI), max (notes per chord),
// strum (seconds between chord notes), ring (arp note length in steps).

const TRACKS = {
  // Dreamy music-box waltz: a lantern-lit harbour at dusk. The "royal road"
  // IVmaj7–V–iii–vi progression with lydian B♮ over F; the B section borrows
  // B♭maj7 and resolves up into the loop (B5 → C6).
  title: {
    bpm: 70, beats: 3, swing: 0.5, key: 'C', mode: 'major', gain: 1.19, verb: 1.16,
    form: ['A', 'B'],
    sections: {
      A: {
        chords: 'Fmaj7 | G/F | Em7 | Am7 | Dm7 | F/G | Cmaj7 | E7sus4:2 E7:1',
        lead: 'C6:6 B5:2 A5:4 | B5:6 A5:2 G5:4 | G5:4 B5 E6 | E6:6 D6:2 C6:4 | D6:6 C6:2 A5:4 | A5:6 G5:2 F5:4 | E5:4 G5 B5 | A5:8 G#5:4',
      },
      B: {
        chords: 'Fmaj7 | Em7 | Dm7 | Cmaj7 | Bbmaj7 | Am7 | Dm7 | G7sus4:2 G:1',
        lead: 'C6:4 F6 E6 | D6:6 B5:2 G5:4 | C6:4 A5 F5 | E5:6 G5:2 B5:4 | D6:6 C6:2 A5:4 | E6:4 G6:6 E6:2 | D6:6 C6:2 A5:4 | C6:8 B5:4',
        bells: 'A6:12 | G6 | F6 | E6 | D6 | C6 | _:12 | _:12',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'musicbox', vel: 0.8, orn: 0.06 },
      { type: 'notes', src: 'bells', inst: 'bell', vel: 0.32, when: 'after' },
      { type: 'arp', inst: 'kalimba', rate: 2, pat: [0, 1, 2, 3, 2, 1], vel: 0.3, range: [53, 74], ring: 3, density: 0.94 },
      { type: 'pad', inst: 'pad', vel: 0.55, range: [52, 71], max: 4 },
      { type: 'bass', inst: 'bass', pat: 'R-----------', vel: 0.42, range: [36, 48] },
    ],
  },

  // Main theme — a cheerful, cozy village morning. G major, lilting swing,
  // kalimba statement (A) answered by a lyrical marimba bridge (B) that
  // climbs to E6 before cadencing home.
  day: {
    bpm: 96, beats: 4, swing: 0.57, key: 'G', mode: 'major', gain: 0.88, verb: 1.6,
    form: ['A', 'A2', 'B', 'B2'],
    sections: {
      A: {
        chords: 'G | D/F# | Em7 | Cadd9 | Am7 | D | G/B:2 C:2 | D7sus4:2 D7:2',
        lead: 'B4:2 D5 G5:4 A5:2 G5 E5 D5 | E5:4 D5:2 B4 A4:8 | B4:2 D5 G5:4 A5:2 B5 A5 G5 | E5:4 G5:2 E5 D5:8 | C5:2 E5 A5:4 G5:2 E5 D5 C5 | D5:4 F#5:2 A5 G5:4 F#5 | G5:4 B4:2 D5 E5:4 C5 | D5:6 C5:2 B4 A4 _:4',
      },
      A2: {
        chords: 'G | D/F# | Em7 | Cadd9 | Am7 | D7 | C:2 D:2 | G',
        lead: 'B4:2 D5 G5:4 A5:2 G5 E5 D5 | E5:4 D5:2 B4 A4:8 | B4:2 D5 G5:4 A5:2 B5 A5 G5 | E5:4 G5:2 A5 G5:4 E5 | C5:2 E5 A5:4 B5:2 A5 G5 E5 | F#5:4 A5:2 F#5 D5:4 E5:2 F#5 | G5:4 E5 F#5 A5 | G5:8 _:4 D5:4',
      },
      B: {
        chords: 'Cmaj7 | D/C | Bm7 | Em7 | Am7 | Bm7 | C | D7sus4:3 D7:1',
        lead: 'E5:6 D5:2 E5:4 G5 | F#5:6 E5:2 F#5:4 A5 | B5:8 A5:4 F#5 | G5:8 _:4 E5:2 F#5 | G5:6 E5:2 C5:4 E5 | F#5:6 D5:2 B4:4 D5 | E5:4 G5 C6 B5:2 A5 | A5:8 G5:4 F#5',
      },
      B2: {
        chords: 'Cmaj7 | D/C | Bm7 | Em7 | Am7 | D7 | C:2 D:2 | G',
        lead: 'E5:6 D5:2 E5:4 G5 | F#5:6 E5:2 F#5:4 A5 | B5:6 A5:2 B5:4 D6 | E6:8 D6:4 B5 | C6:6 B5:2 A5:4 E5 | F#5:4 A5 C6 A5 | B5:4 G5 A5 F#5 | G5:8 _:4 D5:4',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'kalimba', alt: 'marimba', vel: 0.85, orn: 0.06, only: ['A', 'A2'] },
      { type: 'notes', src: 'lead', inst: 'marimba', alt: 'kalimba', vel: 0.85, orn: 0.06, only: ['B', 'B2'] },
      { type: 'notes', src: 'lead', inst: 'bell', oct: 12, vel: 0.26, density: 0.3, when: 'odd' },
      { type: 'comp', inst: 'pluck', pat: '....x-x-....x---', vel: 0.42, range: [55, 71], max: 3, strum: 0.012 },
      { type: 'pad', inst: 'pad', vel: 0.4, range: [55, 72], max: 4, only: ['B', 'B2'] },
      { type: 'bass', inst: 'bass', pat: 'R-----5-R---5-a-', vel: 0.75, range: [38, 52] },
      { type: 'perc', inst: 'shaker', pat: '..x...x...x.o.x.', vel: 0.45 },
      { type: 'perc', inst: 'kick', pat: 'x.......x.......', vel: 0.5 },
      { type: 'perc', inst: 'wood', pat: '....x.......x...', vel: 0.32, only: ['B', 'B2'] },
    ],
  },

  // Golden hour: a slower bossa-tinged D major with flute over nylon guitar
  // picking. Gm6 (borrowed iv) adds a wistful sunset colour.
  evening: {
    bpm: 80, beats: 4, swing: 0.54, key: 'D', mode: 'major', gain: 0.93, verb: 1.38,
    form: ['A', 'A2', 'B'],
    sections: {
      A: {
        chords: 'Dmaj7 | Bm7 | Em9 | A7 | F#m7 | Bm7 | Gmaj7 | Gm6',
        lead: 'F#5:6 A5:2 C#6:8 | B5:4 A5 F#5:8 | G5:6 F#5:2 E5:4 B5 | A5:8 _:4 E5:2 F#5 | A5:6 C#6:2 E6:4 C#6 | D6:8 B5:4 A5 | B5:6 A5:2 F#5:4 D5 | E5:8 _:8',
      },
      A2: {
        chords: 'Dmaj7 | Bm7 | Em9 | A7 | F#m7 | B7 | Em7:2 A7:2 | Dmaj7',
        lead: 'F#5:6 A5:2 C#6:8 | B5:4 A5 F#5:8 | G5:6 F#5:2 E5:4 G5 | E6:8 C#6:4 A5 | A5:6 C#6:2 E6:4 F#6 | D#6:8 C#6:4 B5 | G5:4 B5 A5 C#6 | D6:12 _:4',
      },
      B: {
        chords: 'Gmaj7 | F#m7 | Em7 | Dmaj7 | Gmaj7 | F#m7:2 B7:2 | Em7 | A7sus4:2 A7:2',
        lead: 'B5:6 C#6:2 D6:4 F#6 | E6:8 C#6:4 A5 | B5:6 D6:2 G6:4 E6 | F#6:8 E6:4 C#6 | D6:6 B5:2 A5:4 G5 | A5:4 C#6 D#6 F#6 | G6:6 F#6:2 E6:4 B5 | D6:8 C#6:4 _:4',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'flute', vel: 0.8, orn: 0.05 },
      { type: 'arp', inst: 'guitar', rate: 2, pat: [0, 2, 3, 4, 1, 3, 2, 3], vel: 0.5, range: [52, 67], bassLow: true, ring: 6 },
      { type: 'pad', inst: 'pad', vel: 0.34, range: [55, 71], max: 4, when: 'odd' },
      { type: 'bass', inst: 'bass', pat: 'R-----5-R-----5-', vel: 0.62, range: [38, 52] },
      { type: 'perc', inst: 'wood', pat: 'x..x..x...x..x..', vel: 0.2 },
      { type: 'perc', inst: 'shaker', pat: 'o.o.o.o.o.o.o.o.', vel: 0.32 },
    ],
  },

  // Night: calm and spacious E major with lydian shimmer (F#/E). Long pad
  // chords, a sparse kalimba arpeggio and a bell melody full of rests.
  night: {
    bpm: 64, beats: 4, swing: 0.5, key: 'E', mode: 'major', gain: 1.5, verb: 1.2,
    form: ['A', 'B'],
    sections: {
      A: {
        chords: 'Emaj7 | F#/E | G#m7 | C#m7 | Amaj7 | G#m7 | F#m7 | B7sus4',
        lead: '_:8 B5:4 G#5 | A#5:8 _:8 | _:4 D#6:4 B5:8 | G#5:12 _:4 | _:8 C#6:4 E6 | D#6:8 B5 | _:8 A5:4 C#6 | E6:8 _:8',
      },
      B: {
        chords: 'Amaj7 | G#m7 | F#m9 | Emaj7 | Amaj7 | G#m7 | C#m7 | Bsus4:2 B:2',
        lead: 'C#6:6 B5:2 G#5:8 | B5:8 D#6 | G#5:6 A5:2 C#6:8 | B5:12 _:4 | E6:6 C#6:2 B5:8 | D#6:6 B5:2 F#5:8 | G#5:8 E5 | E5:8 D#5',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'bell', alt: 'musicbox', vel: 0.62, orn: 0.04 },
      { type: 'arp', inst: 'kalimba', rate: 2, pat: [0, 2, 1, 3, null, 2, 1, null], vel: 0.3, range: [59, 76], ring: 4, density: 0.8 },
      { type: 'pad', inst: 'pad', vel: 0.62, range: [52, 71], max: 4 },
      { type: 'bass', inst: 'bass', pat: 'R---------------', vel: 0.38, range: [36, 48] },
    ],
  },

  // Interior: homey and soft, a warm kitchen. F major with a gently swung
  // "boom-chick" — round bass on 1 & 3, e-piano chords on 2 & 4 — and a
  // singing e-piano melody (A B A form).
  interior: {
    bpm: 84, beats: 4, swing: 0.56, key: 'F', mode: 'major', gain: 1.05, verb: 2.1,
    form: ['A', 'B', 'A'],
    sections: {
      A: {
        chords: 'Fmaj7 | Dm7 | Gm7 | C7 | Am7 | Dm7 | Gm7 | C7sus4:2 C7:2',
        lead: 'A5:4 G5:2 A5 C6:4 A5 | F5:6 E5:2 D5:8 | D5:2 F5 Bb5:4 A5:2 G5 F5:4 | E5:6 G5:2 Bb5:4 G5 | A5:4 G5:2 A5 C6:4 E6 | D6:6 C6:2 A5:8 | Bb5:4 A5:2 G5 F5:4 D5 | F5:8 E5',
      },
      B: {
        chords: 'Bbmaj7 | C/Bb | Am7 | Dm7 | Gm7 | C7 | Fmaj7:2 Dm7:2 | Gm7:2 C7:2',
        lead: 'F5:4 A5 D6:6 C6:2 | Bb5:4 G5 E5:6 G5:2 | A5:6 C6:2 E6:8 | D6:6 C6:2 A5:4 F5 | G5:6 A5:2 Bb5:4 D6 | C6:6 Bb5:2 G5:4 E5 | F5:4 A5 D6 C6 | Bb5:6 A5:2 G5:8',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'epiano', vel: 0.78, orn: 0.05 },
      { type: 'comp', inst: 'epiano', pat: '....x---....x-x-', vel: 0.36, range: [53, 67], max: 4, strum: 0.01 },
      { type: 'pad', inst: 'pad', vel: 0.32, range: [55, 72], max: 4, when: 'odd' },
      { type: 'arp', inst: 'kalimba', rate: 4, pat: [3, 2, 4, 2], vel: 0.22, range: [65, 81], ring: 4, density: 0.7, when: 'odd', only: ['B'] },
      { type: 'bass', inst: 'bass', pat: 'R---..5-R---..a-', vel: 0.72, range: [36, 50] },
      { type: 'perc', inst: 'brush', pat: '....x.......x...', vel: 0.34 },
    ],
  },

  // Rain: cozy-melancholy A minor. Music box over soft pads and a slow
  // piano-ish arpeggio; Fmaj7/Cmaj7/G6 keep it comforting, the final E major
  // gives a warm lift back into the loop. Odd loops trade the music box for
  // a Rhodes-like e-piano.
  rain: {
    bpm: 72, beats: 4, swing: 0.5, key: 'A', mode: 'minor', gain: 1.2, verb: 1.23,
    form: ['A', 'B'],
    sections: {
      A: {
        chords: 'Am9 | Fmaj7 | Cmaj7 | G6 | Am9 | Fmaj7 | Dm9 | Esus4:2 Em7:2',
        lead: 'E5:4 A5 B5 C6 | A5:8 E5:4 F5 | G5:6 E5:2 C5:8 | D5:8 B4:4 E5 | E5:4 A5 B5 E6 | C6:8 A5:4 G5 | F5:6 E5:2 D5:4 A5 | A5:8 G5',
      },
      B: {
        chords: 'Fmaj7 | G6 | Em7 | Am9 | Dm9 | G | Cmaj7 | Esus4:2 E:2',
        lead: 'A5:6 C6:2 E6:8 | D6:8 B5:4 G5 | B5:6 G5:2 E5:8 | C6:6 B5:2 A5:8 | D6:6 E6:2 F6:8 | D6:6 B5:2 G5:8 | E5:6 G5:2 B5:8 | A5:8 G#5',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'musicbox', alt: 'epiano', vel: 0.75, orn: 0.05 },
      { type: 'arp', inst: 'pluck', rate: 2, pat: [0, 2, 1, 3, 2, 1, 3, 2], vel: 0.28, range: [52, 67], ring: 4, density: 0.9 },
      { type: 'pad', inst: 'pad', vel: 0.55, range: [52, 71], max: 4 },
      { type: 'bass', inst: 'bass', pat: 'R-------5-------', vel: 0.45, range: [33, 47] },
    ],
  },

  // Festival: joyful A major polka-bounce. Marimba tune (A), a flute "fife"
  // bridge (B), oom-pah plucks, bouncy bass and the most percussion.
  festival: {
    bpm: 112, beats: 4, swing: 0.5, key: 'A', mode: 'major', gain: 0.9, verb: 1.55,
    form: ['A', 'B', 'A2'],
    sections: {
      A: {
        chords: 'A | E/G# | F#m | D | A/C# | D | Bm7:2 E7:2 | A',
        lead: 'E5:2 A5 C#6 A5 E5 A5 C#6:4 | B5:2 G#5 E5 G#5 B5:4 E6 | C#6:2 A5 F#5 A5 C#6 E6 D6 C#6 | D6:4 C#6:2 B5 A5:8 | E5:2 A5 C#6 A5 E5 A5 E6:4 | F#6:4 E6:2 D6 A5:8 | D6:4 B5 G#5 B5 | A5:8 _:4 E5:4',
      },
      B: {
        chords: 'D | E | C#m7 | F#m | Bm7 | E | A/C#:2 D:2 | E7sus4:2 E7:2',
        lead: 'F#5:6 A5:2 D6:8 | E6:6 D6:2 B5:8 | C#6:4 E6 G#5 B5 | A5:8 F#5:4 A5:2 B5 | D6:6 C#6:2 B5:4 F#5 | G#5:6 B5:2 E6:8 | E6:4 C#6 D6 F#6 | E6:8 D6:4 B5',
      },
      A2: {
        chords: 'A | E/G# | F#m | D | A/C# | D | E7sus4:2 E7:2 | A',
        lead: 'E5:2 A5 C#6 A5 E5 A5 C#6:4 | B5:2 G#5 E5 G#5 B5:4 E6 | C#6:2 A5 F#5 A5 C#6 E6 D6 C#6 | D6:4 C#6:2 B5 A5:8 | E5:2 A5 C#6 A5 E5 A5 E6:4 | F#6:4 E6:2 D6 A5:8 | E6:4 D6 B5 G#5 | A5:12 _:4',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'marimba', alt: 'kalimba', vel: 0.85, orn: 0.04, only: ['A', 'A2'] },
      { type: 'notes', src: 'lead', inst: 'flute', vel: 0.72, orn: 0.04, only: ['B'] },
      { type: 'notes', src: 'lead', inst: 'marimba', oct: -12, vel: 0.4, only: ['B'], when: 'odd' },
      { type: 'notes', src: 'lead', inst: 'bell', oct: 12, vel: 0.22, density: 0.3, when: 'odd', only: ['A', 'A2'] },
      { type: 'comp', inst: 'pluck', pat: '..x-..x-..x-..x-', vel: 0.42, range: [57, 72], max: 3, strum: 0.008 },
      { type: 'bass', inst: 'bass', pat: 'R-..5-..R-..5-a.', vel: 0.8, range: [40, 52] },
      { type: 'perc', inst: 'kick', pat: 'x.......x.......', vel: 0.58 },
      { type: 'perc', inst: 'clap', pat: '....x.......x...', vel: 0.42 },
      { type: 'perc', inst: 'shaker', pat: 'x.o.x.o.x.o.x.o.', vel: 0.36 },
      { type: 'perc', inst: 'tamb', pat: '..x...x...x...x.', vel: 0.32, only: ['B', 'A2'] },
      { type: 'perc', inst: 'wood', pat: ['................', '................', '................', '..........x.x.x.'], vel: 0.3 },
    ],
  },

  // Shop: a short, bouncy, cute B♭ major loop — kalimba and marimba trading
  // phrases over staccato plucks and a tick-tock woodblock.
  shop: {
    bpm: 104, beats: 4, swing: 0.57, key: 'Bb', mode: 'major', gain: 0.92, verb: 1.35,
    form: ['A', 'B'],
    sections: {
      A: {
        chords: 'Bb | Gm7 | Cm7 | F7 | Bb | Gm7 | Cm7:2 F7:2 | Bb',
        lead: 'D5:2 F5 Bb5 F5 D6:4 Bb5 | Bb5:2 A5 G5 F5 D5:4 G5 | Eb5:2 G5 C6 G5 Eb6:4 C6 | A5:4 C6:2 A5 F5:8 | D6:2 C6 Bb5 A5 Bb5:4 F5 | G5:2 A5 Bb5 D6 F6:4 D6 | Eb6:4 C6 A5 C6 | Bb5:8 _:4 F5:4',
      },
      B: {
        chords: 'Ebmaj7 | F | Dm7 | Gm7 | Cm7 | F/A | Bb/D:2 Eb:2 | F7sus4:2 F7:2',
        lead: 'G5:6 Bb5:2 D6:8 | C6:6 A5:2 F5:8 | F5:4 A5 C6 D6 | Bb5:8 A5:4 G5 | Eb6:6 D6:2 C6:4 G5 | A5:4 C6 F6 C6 | D6:4 Bb5 Eb6 G5 | Bb5:8 A5',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'kalimba', alt: 'marimba', vel: 0.85, orn: 0.05, only: ['A'] },
      { type: 'notes', src: 'lead', inst: 'marimba', alt: 'kalimba', vel: 0.85, orn: 0.05, only: ['B'] },
      { type: 'notes', src: 'lead', inst: 'bell', oct: 12, vel: 0.22, density: 0.3, when: 'odd' },
      { type: 'comp', inst: 'pluck', pat: '..x...x...x...x.', vel: 0.4, range: [55, 70], max: 3, strum: 0.006 },
      { type: 'bass', inst: 'bass', pat: 'R-..5-..R-..5-a-', vel: 0.72, range: [38, 50] },
      { type: 'perc', inst: 'wood', pat: '..x.......x.x...', vel: 0.3 },
      { type: 'perc', inst: 'shaker', pat: '..x...x...x...x.', vel: 0.3 },
      { type: 'perc', inst: 'kick', pat: 'x.......x.......', vel: 0.42 },
    ],
  },

  // Island: a breezy calypso-lite in F — marimba tune over off-beat plucks,
  // a lazy syncopated bass, clave woodblock and shaker. Turtle Isle & ferry.
  island: {
    bpm: 92, beats: 4, swing: 0.56, key: 'F', mode: 'major', gain: 0.9, verb: 1.4,
    form: ['A', 'B'],
    sections: {
      A: {
        chords: 'F | Bb | C7 | F | Dm7 | Gm7 | C7 | F',
        lead: 'C5:2 F5 A5 C6:4 A5:2 F5:4 | D6:4 C6:2 Bb5 A5:4 F5 | G5:2 Bb5 E5 G5 C6:6 Bb5:2 | A5:8 _:4 C5:4 | D5:2 F5 A5 C6 D6:4 C6 | Bb5:4 A5:2 G5 F5:4 D5 | E5:2 G5 Bb5 C6 E6:4 D6:2 C6 | F5:12 _:4',
      },
      B: {
        chords: 'Bb | C | Am7 | Dm7 | Gm7 | C7 | F:2 Dm7:2 | Gm7:2 C7:2',
        lead: 'F5:4 Bb5 D6:6 C6:2 | E6:6 C6:2 G5:8 | A5:2 C6 E6 C6 A5:4 G5 | F5:8 _:4 A5:4 | Bb5:6 D6:2 G6:4 F6 | E6:4 C6 Bb5 G5 | A5:4 C6 F5 A5 | G5:4 Bb5 E5:6 _:2',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'marimba', alt: 'kalimba', vel: 0.85, orn: 0.05 },
      { type: 'notes', src: 'lead', inst: 'bell', oct: 12, vel: 0.22, density: 0.25, when: 'odd' },
      { type: 'comp', inst: 'pluck', pat: '..x-..x-..x-..x-', vel: 0.36, range: [57, 72], max: 3, strum: 0.008 },
      { type: 'pad', inst: 'pad', vel: 0.3, range: [55, 72], max: 4, when: 'odd' },
      { type: 'bass', inst: 'bass', pat: 'R--5--R-R--5--a-', vel: 0.7, range: [36, 50] },
      { type: 'perc', inst: 'shaker', pat: 'x.o.x.o.x.o.x.o.', vel: 0.28 },
      { type: 'perc', inst: 'wood', pat: 'x..x..x...x.x...', vel: 0.24 },
      { type: 'perc', inst: 'kick', pat: 'x.......x.......', vel: 0.42 },
    ],
  },

  // Forest: mellow D dorian for the Whisperwood — a breathy flute line over
  // a dappled kalimba arpeggio and soft pads, with the odd woodblock "knock".
  forest: {
    bpm: 76, beats: 4, swing: 0.5, key: 'D', mode: 'dorian', gain: 1.05, verb: 1.7,
    form: ['A', 'B'],
    sections: {
      A: {
        chords: 'Dm9 | Em7 | Fmaj7 | Em7 | Dm9 | G/D | Am7 | Em7',
        lead: 'A5:6 F5:2 E5:4 D5 | E5:8 G5:4 B5 | A5:6 C6:2 E6:8 | D6:4 B5 G5:8 | F5:6 A5:2 C6:4 E6 | D6:6 B5:2 G5:8 | C6:4 E6 A5 G5 | E5:12 _:4',
      },
      B: {
        chords: 'Cmaj7 | G | Am7 | Em7 | Fmaj7 | Cmaj7 | Gsus4 | G',
        lead: 'E5:4 G5 B5:6 C6:2 | D6:8 B5:4 G5 | C6:6 A5:2 E5:8 | G5:8 _:4 B4:4 | A5:4 C6 F6:6 E6:2 | E6:8 D6:4 C6 | C6:6 B5:2 A5:4 G5 | G5:8 A5:4 B5',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'flute', vel: 0.72, orn: 0.06 },
      { type: 'arp', inst: 'kalimba', rate: 2, pat: [0, 2, 1, 3, null, 2, 1, null], vel: 0.28, range: [57, 76], ring: 4, density: 0.85 },
      { type: 'pad', inst: 'pad', vel: 0.45, range: [50, 69], max: 4 },
      { type: 'bass', inst: 'bass', pat: 'R-------5-------', vel: 0.45, range: [36, 48] },
      { type: 'perc', inst: 'wood', pat: '..x.......x.....', vel: 0.18 },
      { type: 'perc', inst: 'brush', pat: '....x.......x...', vel: 0.2, when: 'odd' },
    ],
  },
};

// the big Party Mode world brings its own zone themes
Object.assign(TRACKS, WORLD_TRACKS);

const TRACK_IDS = Object.keys(TRACKS);

// ───────────────────────────────────────────────────────────────────────────
// 7. Track compiler & lookahead scheduler
// ───────────────────────────────────────────────────────────────────────────
//
// A track compiles (once, lazily) into a flat per-step event table for one
// full loop. The Player walks that table step by step, scheduling each step
// slightly ahead of the audio clock (lookahead), applying swing, small
// humanisation (±5 ms timing, velocity jitter) and per-loop variation
// (alternate instruments, density, ornaments, loop-gated parts).

const compiled = {};

function patFor(pat, bar) {
  return Array.isArray(pat) ? pat[bar % pat.length] : pat;
}

/** Length of a pattern note starting at index i: 1 + following '-' chars. */
function holdLen(p, i) {
  let n = 1;
  while (i + n < p.length && p[i + n] === '-') n++;
  return n;
}

/** Pitch class of a chord degree for bass lines ('R','3','5','7'). */
function degreePc(ch, deg) {
  const has = (x) => ch.iv.indexOf(x) >= 0;
  let iv = 0;
  if (deg === '3') iv = has(4) ? 4 : has(3) ? 3 : has(5) ? 5 : 2;
  else if (deg === '5') iv = has(7) ? 7 : has(6) ? 6 : has(8) ? 8 : 7;
  else if (deg === '7') iv = has(10) ? 10 : has(11) ? 11 : has(9) ? 9 : 12;
  return (ch.root + iv) % 12;
}

function compileTrack(id) {
  if (compiled[id]) return compiled[id];
  const def = TRACKS[id];
  const errors = [];
  const beatSteps = 4;
  const spb = def.beats * beatSteps;
  const scale = scaleOf(def.key, def.mode);

  // 1. Lay the sections out end to end.
  const secs = [];
  let offset = 0;
  for (const name of def.form) {
    const sec = def.sections[name];
    if (!sec) { errors.push(`${id}: missing section ${name}`); continue; }
    const ch = parseChords(sec.chords, spb, beatSteps, errors, `${id}.${name}.chords`);
    const len = ch.bars * spb;
    secs.push({ name, sec, start: offset, len, chords: ch.list.map((c) => ({ s: c.s + offset, d: c.d, chord: c.chord })) });
    offset += len;
  }
  const loopLen = offset;
  const allChords = [];
  for (const S of secs) for (const c of S.chords) allChords.push(c);
  const chordAt = new Array(loopLen);
  for (let i = 0; i < allChords.length; i++) {
    const c = allChords[i];
    for (let s = c.s; s < c.s + c.d && s < loopLen; s++) chordAt[s] = i;
  }
  const chordOf = (s) => allChords[chordAt[((s % loopLen) + loopLen) % loopLen]].chord;
  const secOf = (s) => { for (const S of secs) if (s >= S.start && s < S.start + S.len) return S; return secs[0]; };

  const steps = Array.from({ length: loopLen }, () => []);
  const add = (s, ev) => { if (s >= 0 && s < loopLen) steps[s].push(ev); };

  def.parts.forEach((part, pi) => {
    const inSec = (name) => !part.only || part.only.indexOf(name) >= 0;
    const vel = part.vel == null ? 0.7 : part.vel;
    if (!VOICES[part.inst]) errors.push(`${id}: unknown instrument ${part.inst}`);
    if (part.alt && !VOICES[part.alt]) errors.push(`${id}: unknown instrument ${part.alt}`);

    if (part.type === 'notes') {
      for (const S of secs) {
        if (!inSec(S.name) || !S.sec[part.src]) continue;
        const where = `${id}.${S.name}.${part.src}`;
        const mel = parseMelody(S.sec[part.src], spb, errors, where);
        if (mel.len !== S.len) errors.push(`${where}: ${mel.len} steps, expected ${S.len}`);
        for (const n of mel.events) {
          if (n.m == null) continue;
          add(S.start + n.s, { p: pi, m: n.m + (part.oct || 0), d: n.d, v: vel * n.v, sec: S.name });
        }
      }
    } else if (part.type === 'pad') {
      let prev = null;
      for (const S of secs) {
        if (!inSec(S.name)) continue;
        let run = null; // merge repeated chords into one long pad note
        const flush = () => {
          if (!run) return;
          const notes = voiceChord(run.chord, part.range[0], part.range[1], prev, part.max || 4);
          prev = notes;
          add(run.s, { p: pi, m: notes, d: run.d, v: vel, sec: S.name });
          run = null;
        };
        for (const c of S.chords) {
          if (run && run.chord.sym === c.chord.sym) run.d += c.d;
          else { flush(); run = { s: c.s, d: c.d, chord: c.chord }; }
        }
        flush();
      }
    } else if (part.type === 'comp' || part.type === 'bass') {
      let prevVoicing = null, lastChord = null, voicing = null, prevBass = null;
      const [lo, hi] = part.range || (part.type === 'bass' ? [36, 52] : [55, 71]);
      for (const S of secs) {
        if (!inSec(S.name)) continue;
        for (let s = S.start; s < S.start + S.len; s++) {
          const p = patFor(part.pat, Math.floor(s / spb));
          const i = s % spb;
          const c = p[i];
          if (!c || c === '.' || c === '-') continue;
          const len = holdLen(p, i);
          const ch = chordOf(s);
          if (part.type === 'comp') {
            if (ch !== lastChord) { voicing = voiceChord(ch, lo, hi, prevVoicing, part.max || 3); prevVoicing = voicing; lastChord = ch; }
            const acc = c === 'X' ? 1.15 : c === 'o' ? 0.6 : 1;
            add(s, { p: pi, m: voicing, d: len, v: vel * acc, sec: S.name });
          } else {
            let m;
            const root = placePc(ch.bass, lo, hi, prevBass);
            if (c === 'R') { m = root; prevBass = root; }
            else if (c === '8') m = (prevBass != null ? prevBass : root) + 12;
            else if (c === 'a') {
              const target = placePc(chordOf(s + len).bass, lo, hi, prevBass != null ? prevBass : root);
              // prefer a diatonic neighbour: leading tone below, then semitone/tone above, tone below
              const pcIn = (x) => scale.indexOf(((x % 12) + 12) % 12) >= 0;
              m = [target - 1, target + 1, target + 2, target - 2].find(pcIn);
              if (m == null) m = target - 1;
            } else if (c === '3' || c === '5' || c === '7') {
              const base = prevBass != null ? prevBass : root;
              m = base + (((degreePc(ch, c) - base) % 12) + 12) % 12;
            } else { errors.push(`${id}: bad bass char "${c}"`); continue; }
            add(s, { p: pi, m, d: len, v: vel * (i === 0 ? 1.05 : 0.92), sec: S.name });
          }
        }
      }
    } else if (part.type === 'arp') {
      const [lo] = part.range || [55, 72];
      const rate = part.rate || 2;
      for (const S of secs) {
        if (!inSec(S.name)) continue;
        for (let s = S.start; s < S.start + S.len; s += rate) {
          const idx = part.pat[Math.floor((s % spb) / rate) % part.pat.length];
          if (idx == null) continue;
          const ch = chordOf(s);
          const pcs = [...new Set(ch.iv.map((x) => (ch.root + x) % 12))];
          const rootN = lo + (((ch.root - lo) % 12) + 12) % 12;
          const tones = pcs.map((pc) => rootN + (((pc - ch.root) % 12) + 12) % 12).sort((a, b) => a - b).slice(0, 4);
          if (part.bassLow) tones.unshift(placePc(ch.bass, lo - 12, lo - 1));
          const n = tones.length;
          const m = tones[idx % n] + 12 * Math.floor(idx / n);
          add(s, { p: pi, m, d: part.ring || rate, v: vel * ((s % spb) === 0 ? 1.08 : 1), sec: S.name });
        }
      }
    } else if (part.type === 'perc') {
      for (const S of secs) {
        if (!inSec(S.name)) continue;
        for (let s = S.start; s < S.start + S.len; s++) {
          const c = patFor(part.pat, Math.floor(s / spb))[s % spb];
          if (c === 'x' || c === 'X' || c === 'o') {
            add(s, { p: pi, m: 0, d: 1, v: vel * (c === 'X' ? 1.2 : c === 'o' ? 0.55 : 1), sec: S.name });
          }
        }
      }
    } else errors.push(`${id}: unknown part type ${part.type}`);
  });

  // swing warp: position of each 16th inside the beat (fraction of a beat)
  const r = clamp(def.swing || 0.5, 0.5, 0.7);
  const W = [0, r / 2, r, r + (1 - r) / 2];
  const beatDur = 60 / def.bpm;
  const stepOff = (k) => Math.floor(k / 4) * beatDur + W[k % 4] * beatDur;
  const c = {
    id, def, spb, loopLen, steps, scale, secOf, chordOf, stepOff, beatDur, errors,
    loopDur: (loopLen / 4) * beatDur, parts: def.parts,
  };
  if (errors.length) warnOnce('compile:' + id, `track "${id}" has ${errors.length} issue(s): ${errors.slice(0, 3).join('; ')}`);
  compiled[id] = c;
  return c;
}

function whenOk(when, loop) {
  if (!when) return true;
  if (typeof when === 'function') return !!when(loop);
  if (when === 'odd') return loop % 2 === 1;
  if (when === 'even') return loop % 2 === 0;
  if (when === 'after') return loop >= 1;
  return true;
}

/** One playing instance of a track (a crossfade briefly has two). */
class Player {
  constructor(id, fade, t0) {
    this.id = id;
    this.c = compileTrack(id);
    this.level = num(this.c.def.gain, 1);
    this.wetLevel = this.level * num(this.c.def.verb, 1);
    this.out = pinChannels(gainAt(0), 2);
    this.wet = pinChannels(gainAt(0), 2);
    this.out.connect(E.mDry);
    this.wet.connect(E.mWet);
    this.nodes = [this.out, this.wet];
    this.buses = {};
    this.step = 0;
    this.loop = 0;
    this.loopStart = t0 + 0.06;
    this.stopping = false;
    this.endAt = Infinity;
    this.dead = false;
    this.fadeTo(1, t0, Math.max(0.01, fade / 4));
  }

  /** Relative fade level (0..1) at time t, from the analytic setTargetAtTime curve. */
  fadeAt(t) {
    const f = this.fade;
    return f.to + (f.from - f.to) * Math.exp(-Math.max(0, t - f.t) / f.tau);
  }

  fadeTo(to, t, tau) {
    this.fade = { from: this.fade ? this.fadeAt(t) : 0, to, t, tau };
    glide(this.out.gain, this.level * to, t, tau);
    glide(this.wet.gain, this.wetLevel * to, t, tau);
  }

  /** Per-instrument bus: gain → lowpass → pan → track out (+ reverb send). */
  bus(inst) {
    let b = this.buses[inst];
    if (b) return b;
    const spec = VOICES[inst];
    b = pinChannels(gainAt(spec.lvl), spec.chord ? 2 : 1);
    this.nodes.push(b);
    let head = b;
    if (spec.lp) { const f = pinChannels(filt('lowpass', spec.lp, 0.707), spec.chord ? 2 : 1); head.connect(f); head = f; this.nodes.push(f); }
    if (spec.pan) { const p = panNode(spec.pan); if (p) { head.connect(p); head = p; this.nodes.push(p); } }
    head.connect(this.out);
    if (spec.send > 0) { const s = gainAt(spec.send); head.connect(s); s.connect(this.wet); this.nodes.push(s); }
    this.buses[inst] = b;
    return b;
  }

  /** Schedule every step that starts before `until`; stale steps are skipped. */
  tick(until, now) {
    const c = this.c;
    for (let guard = 0; guard < 50000 && !this.dead; guard++) {
      const t = this.loopStart + c.stepOff(this.step);
      if (t >= until || (this.stopping && t > this.endAt)) break;
      if (t >= now - 0.03) this.playStep(this.step, t, now);
      this.step++;
      if (this.step >= c.loopLen) {
        this.step = 0;
        this.loop++;
        this.loopStart += c.loopDur;
      }
    }
  }

  playStep(s, t, now) {
    const c = this.c;
    const evs = c.steps[s];
    for (let i = 0; i < evs.length; i++) {
      const ev = evs[i];
      const part = c.parts[ev.p];
      if (part.when && !whenOk(part.when, this.loop)) continue;
      if (part.density != null && part.density < 1 && Math.random() > part.density) continue;
      if (E.active > MAX_VOICES && part.type !== 'notes') continue;
      const inst = part.alt && this.loop % 2 === 1 ? part.alt : part.inst;
      const spec = VOICES[inst];
      if (!spec) continue;
      const dur = c.stepOff(s + ev.d) - c.stepOff(s);
      const tight = part.type === 'bass' || part.type === 'perc';
      const tt = Math.max(now + 0.005, t + (Math.random() - 0.5) * (tight ? 0.004 : 0.01));
      const v = clamp(ev.v * rand(0.9, 1.05), 0.02, 1.2);
      const dest = this.bus(inst);
      if (Array.isArray(ev.m)) {
        if (spec.chord) spec.fn(dest, tt, ev.m, dur, v);
        else {
          const k = 1 / Math.sqrt(ev.m.length);
          for (let j = 0; j < ev.m.length; j++) {
            spec.fn(dest, tt + j * (part.strum || 0), ev.m[j], dur, v * k * (j === ev.m.length - 1 ? 1.1 : 1));
          }
        }
      } else {
        spec.fn(dest, tt, ev.m, dur, v);
        // Ornament (from the second loop on): quick grace note from the scale tone above.
        if (part.orn && this.loop > 0 && ev.d >= 4 && chance(part.orn) && tt - 0.07 > now) {
          spec.fn(dest, tt - 0.07, scaleStep(ev.m, c.scale, 1), 0.06, v * 0.5);
        }
      }
    }
  }

  stop(fade, t) {
    if (this.stopping) return;
    this.stopping = true;
    const tau = Math.max(0.02, fade / 4);
    const now = Math.max(this.fadeAt(t), 1e-4);
    this.fadeTo(0, t, tau);
    // dispose once the level is below -65 dB (sooner if it had barely faded in)
    this.endAt = t + tau * Math.max(1, Math.log(now / 5.6e-4));
  }

  revive(fade, t) {
    this.stopping = false;
    this.endAt = Infinity;
    this.fadeTo(1, t, Math.max(0.01, fade / 4));
  }

  dispose() {
    this.dead = true;
    for (const n of this.nodes) { try { n.disconnect(); } catch (_) { /* already */ } }
    this.nodes.length = 0;
    this.buses = {};
  }
}

/** Crossfade to `id` (null = fade out). Revives a still-fading player of the same track. */
function applyTrack(id, fade) {
  const t = nowT();
  let revived = null;
  if (id) for (const p of E.players) if (!p.dead && p.id === id && p.stopping) revived = p;
  for (const p of E.players) if (p !== revived && !p.stopping) p.stop(fade, t);
  if (revived) revived.revive(fade, t);
  else if (id) E.players.push(new Player(id, fade, t));
}

/** Schedule everything (music + ambient events) up to `until`. */
function pump(until) {
  const t = nowT();
  const ps = E.players;
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = ps[i];
    if (p.stopping && t >= p.endAt) { p.dispose(); ps.splice(i, 1); continue; }
    p.tick(until, t);
  }
  if (E.amb) ambientTick(until, t);
}

function schedulerTick() {
  timer = null;
  if (!E || E.ctx.state === 'closed') return;
  try {
    const ms = perfNow();
    const gap = lastTickMs ? (ms - lastTickMs) / 1000 : TICK_MS / 1000;
    lastTickMs = ms;
    // If timers are being throttled (background tab, busy main thread), look further ahead.
    const look = clamp(gap * 1.6, LOOKAHEAD, MAX_LOOKAHEAD);
    pump(nowT() + look);
  } catch (err) {
    warnOnce('tick', 'scheduler error: ' + (err && err.message));
  }
  timer = setTimeout(schedulerTick, TICK_MS);
}

function ensureScheduler() {
  if (timer == null && E && forcedNow == null) {
    lastTickMs = 0;
    timer = setTimeout(schedulerTick, 0);
  }
}

// ───────────────────────────────────────────────────────────────────────────
// 8. Sound effects, footsteps & dialogue blips
// ───────────────────────────────────────────────────────────────────────────
// Every sfx builds its voices into a temporary group (volume/pan/reverb send)
// that frees itself once the last voice ends. `p` is the pitch ratio (the
// caller's semitone offset times a small random detune for variety).

const ftom = (f) => 69 + 12 * Math.log2(f / 440);

/** Enveloped tone into a group; glides f → fTo when fTo is given. */
function sTone(g, t, f, peak, a, d, type, fTo, glideT) {
  const nodes = [];
  const o = partial(g.out, t, type || 'sine', fTo || f, peak, a, d, nodes, fTo ? f : 0, glideT || (a + d) * 0.6);
  own(o, nodes, g);
}

/** Filtered noise burst into a group; the filter sweeps f → fTo when given. */
function sNoise(g, t, color, type, f, q, peak, a, d, fTo) {
  noiseHit(g.out, t, color, type, f, q, peak, a, d, g, fTo);
}

/** Short two-partial chime (UI dings). */
function chime(g, t, f, peak, dec, type) {
  const nodes = [];
  const o = partial(g.out, t, type || 'sine', f, peak, 0.003, dec, nodes);
  if (f * 2 < 9000) partial(g.out, t, 'sine', f * 2.005, peak * 0.15, 0.002, dec * 0.4, nodes);
  own(o, nodes, g);
}

/** Glassy crystal tone: sine plus quieter inharmonic partials (capped below 9 kHz). */
function crystal(g, t, f, peak, dec) {
  const nodes = [];
  const o = partial(g.out, t, 'sine', f, peak, 0.002, dec, nodes);
  if (f * 2.76 < 9000) partial(g.out, t, 'sine', f * 2.76, peak * 0.22, 0.002, dec * 0.45, nodes);
  if (f * 5.4 < 9000) partial(g.out, t, 'sine', f * 5.4, peak * 0.07, 0.001, 0.08, nodes);
  own(o, nodes, g);
}

/** Tone following a multi-point frequency contour with an ADSR (animal voices, squeaks). */
function contour(g, t, type, freqs, times, peak, a, d, s, dur, r, extra) {
  const o = osc(type, freqs[0], t);
  for (let i = 1; i < freqs.length; i++) o.frequency.exponentialRampToValueAtTime(clampF(freqs[i]), t + times[i - 1]);
  const env = gainAt(0);
  const end = envADSR(env.gain, t, dur, peak, a, d, s, r);
  const nodes = [o, env];
  let head = o;
  if (extra) head = extra(o, nodes, t, end) || o;
  head.connect(env);
  env.connect(g.out);
  o.start(t);
  o.stop(end + 0.03);
  own(o, nodes, g); // any LFOs added by `extra` are started/stopped there
  return end;
}

/** Low amplitude-modulated rumble (purr/snore). */
function purr(g, t, f, dur, peak, rate) {
  const o = osc('warm', f, t);
  const wob = osc('sine', 5.5, t);
  const wg = gainAt(f * 0.04);
  wob.connect(wg); wg.connect(o.frequency);
  const lp = filt('lowpass', 560, 0.8);
  const am = gainAt(0.5);
  const lfo = osc('sine', rate, t);
  const lg = gainAt(0.5);
  lfo.connect(lg); lg.connect(am.gain);
  const env = gainAt(0);
  const end = envADSR(env.gain, t, dur, peak, Math.min(0.12, dur * 0.3), 0.2, 0.8, 0.18);
  o.connect(lp); lp.connect(am); am.connect(env); env.connect(g.out);
  for (const s of [o, wob, lfo]) { s.start(t); s.stop(end + 0.03); }
  own(o, [o, wob, wg, lp, am, lfo, lg, env], g);
}

const COIN_NOTES = [1319, 1175, 1568, 1319, 1760, 1568, 2093];
const PENTA_HI = [1047, 1175, 1319, 1568, 1760, 2093, 2349, 2637];

/**
 * SFX definitions: fn(group, time, pitchRatio); vol = group level,
 * send = reverb amount, vary = random detune range in cents.
 */
const SFX = {
  select: { vol: 1.84, send: 0.05, vary: 30, fn(g, t, p) {
    sTone(g, t, 1420 * p, 0.1, 0.002, 0.05, 'sine', 1250 * p, 0.03);
  } },
  confirm: { vol: 1.0, send: 0.15, vary: 15, fn(g, t, p) {
    chime(g, t, 1047 * p, 0.14, 0.22);
    chime(g, t + 0.065, 1568 * p, 0.13, 0.32);
  } },
  cancel: { vol: 1.5, send: 0.1, vary: 15, fn(g, t, p) {
    chime(g, t, 784 * p, 0.13, 0.12, 'triangle');
    chime(g, t + 0.06, 523 * p, 0.13, 0.2, 'triangle');
  } },
  open: { vol: 2.8, send: 0.12, vary: 40, fn(g, t, p) {
    sNoise(g, t, 'pink', 'bandpass', 600 * p, 1.2, 0.22, 0.07, 0.16, 2400 * p);
    sTone(g, t + 0.03, 440 * p, 0.05, 0.01, 0.1, 'sine', 660 * p, 0.08);
  } },
  close: { vol: 3.0, send: 0.1, vary: 40, fn(g, t, p) {
    sNoise(g, t, 'pink', 'bandpass', 2200 * p, 1.2, 0.18, 0.04, 0.14, 600 * p);
    sTone(g, t + 0.02, 520 * p, 0.05, 0.005, 0.09, 'sine', 380 * p, 0.08);
  } },
  pickup: { vol: 2.0, send: 0.12, vary: 40, fn(g, t, p) {
    sTone(g, t, 520 * p, 0.18, 0.003, 0.1, 'sine', 1250 * p, 0.06);
    chime(g, t + 0.06, 1760 * p, 0.08, 0.18);
  } },
  coin: { vol: 1.6, send: 0.12, vary: 12, fn(g, t, p) {
    sTone(g, t, 988 * p, 0.08, 0.002, 0.07, 'hollow');
    sTone(g, t + 0.07, 1319 * p, 0.09, 0.002, 0.38, 'hollow');
    sTone(g, t + 0.07, 2638 * p, 0.01, 0.002, 0.15, 'sine');
  } },
  buy: { vol: 1.45, send: 0.14, vary: 12, fn(g, t, p) {
    sTone(g, t, 150 * p, 0.2, 0.004, 0.12, 'sine', 90 * p, 0.1);
    sTone(g, t + 0.02, 1319 * p, 0.07, 0.002, 0.08, 'hollow');
    sTone(g, t + 0.1, 1760 * p, 0.08, 0.002, 0.35, 'hollow');
    chime(g, t + 0.1, 2637 * p, 0.025, 0.3);
  } },
  sell: { vol: 1.85, send: 0.15, vary: 12, fn(g, t, p) {
    let tt = t;
    for (let i = 0; i < 6; i++) {
      sTone(g, tt, COIN_NOTES[i] * p * cents(rand(-15, 15)), 0.07 * (1 - i * 0.08), 0.002, 0.14, 'hollow');
      tt += rand(0.045, 0.07);
    }
  } },
  door: { vol: 1.33, send: 0.12, vary: 60, fn(g, t, p) {
    contour(g, t, 'warm', [170 * p, 230 * p, 200 * p], [0.18, 0.3], 0.05, 0.08, 0.14, 0.6, 0.2, 0.1,
      (o, nodes, t0, end) => {
        const lfo = osc('sine', 23, t0), lg = gainAt(18 * p);
        lfo.connect(lg); lg.connect(o.frequency);
        lfo.start(t0); lfo.stop(end + 0.03);
        const bp = filt('bandpass', 1100, 3);
        o.connect(bp);
        nodes.push(lfo, lg, bp);
        return bp;
      });
    sTone(g, t + 0.28, 130 * p, 0.26, 0.004, 0.16, 'sine', 80 * p, 0.08);
    sNoise(g, t + 0.28, 'brown', 'lowpass', 700, 0.7, 0.2, 0.003, 0.08);
  } },
  water: { vol: 2.9, send: 0.12, vary: 50, fn(g, t, p) {
    sNoise(g, t, 'pink', 'bandpass', 3000 * p, 0.8, 0.05, 0.08, 0.45);
    for (let i = 0; i < 14; i++) {
      const f = rand(1600, 3000) * p;
      sTone(g, t + rand(0, 0.45), f, rand(0.015, 0.04), 0.001, 0.03, 'sine', f * 1.5, 0.025);
    }
  } },
  plant: { vol: 2.1, send: 0.05, vary: 60, fn(g, t, p) {
    sNoise(g, t, 'brown', 'lowpass', 450, 0.7, 0.3, 0.004, 0.07);
    sNoise(g, t + 0.1, 'brown', 'lowpass', 400, 0.7, 0.2, 0.004, 0.06);
    sTone(g, t, 110 * p, 0.12, 0.003, 0.08, 'sine', 70 * p, 0.06);
  } },
  harvest: { vol: 2.2, send: 0.12, vary: 40, fn(g, t, p) {
    sTone(g, t, 320 * p, 0.2, 0.003, 0.08, 'sine', 900 * p, 0.04);
    for (let i = 0; i < 4; i++) sNoise(g, t + 0.03 + i * 0.05 + rand(0, 0.02), 'pink', 'bandpass', rand(3000, 4500), 0.8, 0.06, 0.008, 0.04);
    chime(g, t + 0.12, 1568 * p, 0.06, 0.2);
  } },
  cast: { vol: 4.0, send: 0.1, vary: 50, fn(g, t, p) {
    sNoise(g, t, 'pink', 'bandpass', 400 * p, 1.0, 0.18, 0.12, 0.25, 2200 * p);
    sTone(g, t + 0.05, 1800 * p, 0.015, 0.05, 0.3, 'sine', 900 * p, 0.3);
  } },
  splash: { vol: 2.7, send: 0.15, vary: 60, fn(g, t, p) {
    sNoise(g, t, 'white', 'lowpass', 3000, 0.7, 0.22, 0.005, 0.35, 700);
    sTone(g, t + 0.02, 250 * p, 0.08, 0.005, 0.07, 'sine', 520 * p, 0.06);
    for (let i = 0; i < 6; i++) {
      const f = rand(1200, 2400) * p;
      sTone(g, t + rand(0.08, 0.35), f, rand(0.02, 0.045), 0.001, 0.04, 'sine', f * 1.5, 0.03);
    }
  } },
  bite: { vol: 1.85, send: 0.1, vary: 10, fn(g, t, p) {
    chime(g, t, 1319 * p, 0.13, 0.12);
    chime(g, t + 0.075, 1760 * p, 0.15, 0.18);
  } },
  reel: { vol: 1.9, send: 0.04, vary: 30, fn(g, t, p) {
    for (let i = 0; i < 6; i++) {
      const tt = t + i * 0.045;
      sNoise(g, tt, 'white', 'bandpass', (i % 2 ? 2400 : 2800) * p, 2.2, 0.3, 0.001, 0.012);
      sTone(g, tt, (i % 2 ? 900 : 1000) * p, 0.1, 0.001, 0.015, 'triangle');
    }
  } },
  heart: { vol: 0.72, send: 0.3, vary: 10, fn(g, t, p) {
    [880, 1109, 1319, 1760].forEach((f, i) => vBell(g.out, t + i * 0.06, ftom(f * p), 0, 0.3, g));
    sTone(g, t + 0.25, 2637 * p, 0.01, 0.02, 0.4);
    sTone(g, t + 0.3, 3520 * p, 0.006, 0.02, 0.3);
  } },
  place: { vol: 1.7, send: 0.08, vary: 50, fn(g, t, p) {
    sTone(g, t, 380 * p, 0.2, 0.002, 0.07, 'sine', 320 * p, 0.03);
    sTone(g, t, 900 * p, 0.04, 0.001, 0.03, 'triangle');
    sNoise(g, t, 'pink', 'bandpass', 1200, 1.0, 0.1, 0.002, 0.03);
    sTone(g, t + 0.07, 360 * p, 0.07, 0.002, 0.05, 'sine', 300 * p, 0.03);
  } },
  error: { vol: 1.65, send: 0.06, vary: 5, fn(g, t, p) {
    sTone(g, t, 330 * p, 0.13, 0.01, 0.12, 'triangle');
    sTone(g, t + 0.13, 247 * p, 0.13, 0.01, 0.2, 'triangle');
  } },
  pet: { vol: 0.8, send: 0.06, vary: 80, fn(g, t, p) {
    purr(g, t, 95 * p, 0.55, 0.16, 24);
    sTone(g, t + 0.5, 300 * p, 0.04, 0.03, 0.14, 'triangle', 430 * p, 0.12);
  } },
  meow: { vol: 0.36, send: 0.1, vary: 120, fn(g, t, p) {
    const f0 = 560 * p;
    contour(g, t, 'warm', [f0, f0 * 1.35, f0 * 0.82], [0.14, 0.46], 0.75, 0.05, 0.15, 0.7, 0.4, 0.1,
      (o, nodes, t0) => {
        const f1 = filt('bandpass', 800, 3.5), f2 = filt('bandpass', 2200, 5), g2 = gainAt(0.45), sum = gainAt(1);
        f1.frequency.setValueAtTime(800, t0); f1.frequency.linearRampToValueAtTime(1500, t0 + 0.14); f1.frequency.linearRampToValueAtTime(950, t0 + 0.46);
        f2.frequency.setValueAtTime(2200, t0); f2.frequency.linearRampToValueAtTime(3000, t0 + 0.14); f2.frequency.linearRampToValueAtTime(2400, t0 + 0.46);
        o.connect(f1); o.connect(f2); f1.connect(sum); f2.connect(g2); g2.connect(sum);
        nodes.push(f1, f2, g2, sum);
        return sum;
      });
  } },
  woof: { vol: 0.68, send: 0.08, vary: 100, fn(g, t, p) {
    contour(g, t, 'warm', [330 * p, 230 * p], [0.12], 0.8, 0.012, 0.1, 0.5, 0.1, 0.07,
      (o, nodes, t0) => {
        const f1 = filt('bandpass', 600, 2.5);
        f1.frequency.setValueAtTime(600, t0); f1.frequency.linearRampToValueAtTime(760, t0 + 0.04); f1.frequency.linearRampToValueAtTime(450, t0 + 0.15);
        o.connect(f1); nodes.push(f1);
        return f1;
      });
    sNoise(g, t, 'pink', 'bandpass', 700 * p, 1.0, 0.06, 0.01, 0.07);
  } },
  squeak: { vol: 1.68, send: 0.08, vary: 80, fn(g, t, p) {
    contour(g, t, 'triangle', [1400 * p, 2400 * p, 1900 * p], [0.05, 0.12], 0.08, 0.008, 0.05, 0.6, 0.08, 0.05);
  } },
  bell: { vol: 0.5, send: 0.3, vary: 10, fn(g, t, p) {
    [0, 0.1, 0.21, 0.34].forEach((dt, i) => vBell(g.out, t + dt, ftom((i % 2 ? 1319 : 1568) * p), 0, 0.5 * (1 - i * 0.18), g));
  } },
  firefly: { vol: 1.6, send: 0.35, vary: 20, fn(g, t, p) {
    const f = pick([2093, 2349, 2637, 3136]) * p;
    sTone(g, t, f, 0.035, 0.004, 0.25);
    sTone(g, t + 0.05, f * 1.5, 0.018, 0.004, 0.2);
  } },
  page: { vol: 1.6, send: 0.06, vary: 60, fn(g, t, p) {
    for (let i = 0; i < 3; i++) sNoise(g, t + i * 0.05 + rand(0, 0.02), 'pink', 'bandpass', rand(1600, 3000) * p, 0.9, 0.5 - i * 0.1, 0.01, 0.05);
    sNoise(g, t + 0.1, 'pink', 'lowpass', 700 * p, 0.7, 0.25, 0.02, 0.08);
  } },
  // one clear crystal note (pitch it with opts.pitch: the chime puzzles play tunes)
  tone: { vol: 1.5, send: 0.45, vary: 0, fn(g, t, p) {
    crystal(g, t, 784 * p, 0.09, 1.2);
    chime(g, t, 392 * p, 0.05, 0.9, 'triangle');
  } },
  shard: { vol: 1.23, send: 0.45, vary: 10, fn(g, t, p) {
    [1319, 1661, 1976, 2489, 2637].forEach((f, i) => crystal(g, t + i * 0.05, f * p, 0.06, 0.9));
    sTone(g, t, 220 * p, 0.05, 0.15, 0.8, 'sine', 330 * p, 0.6);
  } },
  firework: { vol: 1.75, send: 0.25, vary: 60, fn(g, t, p) {
    contour(g, t, 'sine', [600 * p, 1500 * p], [0.7], 0.035, 0.1, 0.3, 0.7, 0.62, 0.08);
    sNoise(g, t, 'pink', 'bandpass', 1800, 0.8, 0.03, 0.3, 0.4);
    sNoise(g, t + 0.75, 'brown', 'lowpass', 600, 0.7, 0.35, 0.003, 0.45);
    sTone(g, t + 0.75, 90, 0.2, 0.004, 0.3, 'sine', 45, 0.25);
    for (let i = 0; i < 14; i++) sNoise(g, t + 0.85 + rand(0, 0.9), 'white', 'bandpass', rand(2000, 4000), 1.5, rand(0.01, 0.04), 0.001, 0.012);
  } },
  sparkle: { vol: 1.85, send: 0.4, vary: 10, fn(g, t, p) {
    const n = 4 + ((Math.random() * 2) | 0);
    let tt = t;
    for (let i = 0; i < n; i++) {
      const f = pick(PENTA_HI) * p;
      sTone(g, tt, f, 0.05, 0.002, rand(0.15, 0.3));
      sTone(g, tt, f * 2.01, 0.008, 0.002, 0.1);
      tt += rand(0.035, 0.06);
    }
  } },
  step: { vol: 1.4, send: 0.03, vary: 150, fn(g, t, p) { FOOT.dirt(g, t, p); } },
  typewriter: { vol: 2.75, send: 0.03, vary: 40, fn(g, t, p) {
    sNoise(g, t, 'white', 'bandpass', 2600 * p, 1.5, 0.1, 0.001, 0.025);
    sTone(g, t, 190 * p, 0.1, 0.002, 0.04, 'sine', 120 * p, 0.03);
    sTone(g, t + 0.003, 1900 * p, 0.015, 0.001, 0.03);
  } },
  chop: { vol: 1.4, send: 0.08, vary: 60, fn(g, t, p) {
    sTone(g, t, 190 * p, 0.3, 0.002, 0.12, 'sine', 105 * p, 0.06);
    sNoise(g, t, 'pink', 'lowpass', 1600, 0.7, 0.2, 0.001, 0.07);
    sNoise(g, t, 'white', 'bandpass', 2300, 1.2, 0.06, 0.001, 0.015);
  } },
  dig: { vol: 2.7, send: 0.05, vary: 60, fn(g, t, p) {
    sNoise(g, t, 'pink', 'bandpass', 800 * p, 1.0, 0.12, 0.02, 0.12, 1400 * p);
    sNoise(g, t + 0.12, 'brown', 'lowpass', 600, 0.7, 0.28, 0.004, 0.1);
    sTone(g, t + 0.12, 120 * p, 0.1, 0.003, 0.08, 'sine', 75 * p, 0.06);
  } },
  snore: { vol: 0.82, send: 0.08, vary: 60, fn(g, t, p) {
    purr(g, t, 105 * p, 0.6, 0.12, 27);
    sNoise(g, t, 'pink', 'bandpass', 900 * p, 1.2, 0.04, 0.45, 0.25);
    sTone(g, t + 0.85, 700 * p, 0.045, 0.08, 0.35, 'sine', 1150 * p, 0.35);
  } },
  // a springy little hop, and a soft pat on landing
  jump: { vol: 1.6, send: 0.08, vary: 40, fn(g, t, p) {
    sTone(g, t, 260 * p, 0.16, 0.004, 0.13, 'triangle', 620 * p, 0.1);
    sTone(g, t + 0.02, 780 * p, 0.04, 0.003, 0.08, 'sine', 1250 * p, 0.06);
    sNoise(g, t, 'pink', 'bandpass', 900 * p, 1.2, 0.05, 0.002, 0.05);
  } },
  land: { vol: 2.2, send: 0.04, vary: 60, fn(g, t, p) {
    sNoise(g, t, 'pink', 'lowpass', 700 * p, 0.8, 0.14, 0.002, 0.07, 240 * p);
    sTone(g, t, 150 * p, 0.12, 0.002, 0.07, 'sine', 90 * p, 0.05);
  } },
  whoosh: { vol: 4.3, send: 0.1, vary: 60, fn(g, t, p) {
    sNoise(g, t, 'pink', 'bandpass', 300 * p, 1.1, 0.2, 0.15, 0.25, 1800 * p);
  } },
  unlock: { vol: 3.3, send: 0.06, vary: 30, fn(g, t, p) {
    sNoise(g, t, 'white', 'bandpass', 3200 * p, 3, 0.12, 0.001, 0.012);
    sTone(g, t, 2400 * p, 0.04, 0.001, 0.02);
    sTone(g, t + 0.07, 900 * p, 0.12, 0.002, 0.04, 'sine', 700 * p, 0.02);
    sNoise(g, t + 0.07, 'white', 'bandpass', 1500 * p, 2, 0.1, 0.001, 0.02);
  } },
  mail: { vol: 1.13, send: 0.25, vary: 10, fn(g, t, p) {
    sNoise(g, t, 'pink', 'bandpass', 2800, 0.8, 0.05, 0.01, 0.06);
    [784, 1047, 1319].forEach((f, i) => chime(g, t + 0.06 + i * 0.09, f * p, 0.1, 0.45));
    vBell(g.out, t + 0.33, ftom(2093 * p), 0, 0.25, g);
  } },
  // ---- Party Mode
  tick: { vol: 1.6, send: 0.1, vary: 0, fn(g, t, p) {
    sTone(g, t, 880 * p, 0.16, 0.002, 0.09, 'triangle');
    sTone(g, t, 1760 * p, 0.04, 0.001, 0.03, 'sine');
    sNoise(g, t, 'white', 'bandpass', 3200, 2, 0.05, 0.001, 0.02);
  } },
  go: { vol: 1.3, send: 0.2, vary: 0, fn(g, t, p) {
    [1047, 1319, 1568].forEach((f) => chime(g, t, f * p, 0.12, 0.5));
    chime(g, t + 0.08, 2093 * p, 0.1, 0.6);
    sNoise(g, t, 'pink', 'bandpass', 1200, 0.9, 0.12, 0.01, 0.25, 4800);
  } },
  whistle: { vol: 0.9, send: 0.12, vary: 0, fn(g, t, p) {
    for (let i = 0; i < 2; i++) {
      const t0 = t + i * 0.2;
      sTone(g, t0, 2250 * p, 0.12, 0.01, 0.16, 'sine', 2480 * p, 0.05);
      sTone(g, t0, 2330 * p, 0.05, 0.01, 0.15, 'sine', 2250 * p, 0.12);
      sNoise(g, t0, 'white', 'bandpass', 2400, 3, 0.03, 0.01, 0.14);
    }
  } },
  hit: { vol: 2.2, send: 0.08, vary: 25, fn(g, t, p) {
    sNoise(g, t, 'white', 'lowpass', 2600 * p, 0.8, 0.3, 0.002, 0.12, 400);
    sTone(g, t, 180 * p, 0.2, 0.003, 0.09, 'sine', 90 * p, 0.08);
  } },
  cheer: { vol: 1.1, send: 0.3, vary: 5, fn(g, t, p) {
    for (let i = 0; i < 5; i++) sNoise(g, t + i * 0.06, 'pink', 'bandpass', rand(900, 1800), 1.4, 0.07, 0.04, 0.4);
    [784, 988, 1175, 1568, 1976].forEach((f, i) => chime(g, t + 0.05 + i * 0.07, f * p, 0.09, 0.5));
  } },
  // ---- Party Mode combat (comic, not violent: bonks, boings & poofs)
  whack: { vol: 1.9, send: 0.06, vary: 40, fn(g, t, p) {
    sNoise(g, t, 'pink', 'bandpass', 1400 * p, 1.1, 0.22, 0.002, 0.07, 600 * p);
    sTone(g, t, 240 * p, 0.14, 0.002, 0.07, 'triangle', 150 * p, 0.06);
  } },
  // (Release v9) the new heroes: a whisk's airy swish, a wrench's clank, a sprout popping up,
  // a lantern's warm glow (the Lamplighter's light), a puff of steam
  swish: { vol: 1.3, send: 0.05, vary: 30, fn(g, t, p) {
    sNoise(g, t, 'white', 'bandpass', 3200 * p, 1.6, 0.14, 0.004, 0.06, 1800 * p);
    sNoise(g, t + 0.04, 'white', 'bandpass', 4200 * p, 1.8, 0.08, 0.003, 0.05, 2600 * p);
  } },
  clank: { vol: 1.5, send: 0.18, vary: 25, fn(g, t, p) {
    sTone(g, t, 880 * p, 0.12, 0.001, 0.12, 'square', 820 * p, 0.1);
    sTone(g, t, 1330 * p, 0.08, 0.001, 0.18, 'triangle');
    sNoise(g, t, 'white', 'bandpass', 3800, 2.5, 0.08, 0.001, 0.04);
  } },
  sprout: { vol: 1.4, send: 0.2, vary: 20, fn(g, t, p) {
    sTone(g, t, 300 * p, 0.14, 0.004, 0.09, 'sine', 900 * p, 0.08);
    sTone(g, t + 0.05, 1200 * p, 0.06, 0.002, 0.08, 'triangle');
    sNoise(g, t, 'pink', 'lowpass', 1400, 0.8, 0.08, 0.003, 0.08);
  } },
  glow: { vol: 1.0, send: 0.55, vary: 5, fn(g, t, p) {
    [523, 659, 784, 1047].forEach((f, i) => chime(g, t + i * 0.035, f * p, 0.06, 0.7, 'sine'));
    sNoise(g, t, 'pink', 'bandpass', 2400, 0.6, 0.05, 0.05, 0.4);
  } },
  steam: { vol: 1.2, send: 0.2, vary: 15, fn(g, t, p) {
    sNoise(g, t, 'white', 'highpass', 2600 * p, 0.7, 0.16, 0.02, 0.5, 4200 * p);
    sTone(g, t, 180 * p, 0.05, 0.02, 0.3, 'sine', 120 * p, 0.3);
  } },
  bonk: { vol: 1.8, send: 0.1, vary: 30, fn(g, t, p) {
    sTone(g, t, 520 * p, 0.2, 0.002, 0.16, 'triangle', 190 * p, 0.14);
    sTone(g, t, 1040 * p, 0.05, 0.001, 0.05, 'sine');
    sNoise(g, t, 'white', 'bandpass', 2600, 2, 0.05, 0.001, 0.03);
  } },
  // (World v7) a brassy fanfare for grand entrances, a clinking chain, a huge
  // dull thud (the Grand Snuffer), a bright little chime
  fanfare: { vol: 1.0, send: 0.35, vary: 0, fn(g, t, p) {
    [[392, 0, 0.14], [523, 0.13, 0.14], [659, 0.26, 0.14], [784, 0.39, 0.5]].forEach(([f, dt, d]) => {
      sTone(g, t + dt, f * p, 0.11, 0.01, d, 'sawtooth');
      sTone(g, t + dt, f * p * 1.5, 0.05, 0.01, d, 'square');
      sTone(g, t + dt, f * p * 0.5, 0.07, 0.01, d * 1.2, 'triangle');
    });
    sNoise(g, t + 0.39, 'pink', 'bandpass', 2600, 0.8, 0.05, 0.02, 0.5);
  } },
  chain: { vol: 1.4, send: 0.2, vary: 20, fn(g, t, p) {
    for (let i = 0; i < 7; i++) { chime(g, t + i * 0.09 + rand(0, 0.02), rand(2200, 3400) * p, 0.05, 0.08, 'triangle'); sNoise(g, t + i * 0.09, 'white', 'bandpass', 4200 * p, 2, 0.04, 0.001, 0.03); }
  } },
  thud: { vol: 2.6, send: 0.25, vary: 10, fn(g, t, p) {
    sTone(g, t, 70 * p, 0.45, 0.004, 0.7, 'sine', 32 * p, 0.6);
    sNoise(g, t, 'brown', 'lowpass', 500, 0.7, 0.5, 0.004, 0.8, 120);
    sNoise(g, t + 0.02, 'pink', 'bandpass', 900, 0.9, 0.12, 0.01, 0.3);
  } },
  chime: { vol: 1.3, send: 0.5, vary: 5, fn(g, t, p) {
    [1047, 1319, 1568, 2093].forEach((f, i) => crystal(g, t + i * 0.06, f * p, 0.07, 1.1));
  } },
  slam: { vol: 2.2, send: 0.12, vary: 15, fn(g, t, p) {
    sTone(g, t, 110 * p, 0.3, 0.004, 0.3, 'sine', 45 * p, 0.25);
    sNoise(g, t, 'brown', 'lowpass', 900, 0.7, 0.35, 0.005, 0.3, 200);
  } },
  boom: { vol: 1.9, send: 0.15, vary: 20, fn(g, t, p) {
    sTone(g, t, 150 * p, 0.28, 0.003, 0.35, 'sine', 50 * p, 0.3);
    sNoise(g, t, 'pink', 'lowpass', 2400, 0.6, 0.3, 0.004, 0.4, 300);
    chime(g, t + 0.03, 1760 * p, 0.04, 0.3);
  } },
  zap: { vol: 1.2, send: 0.2, vary: 35, fn(g, t, p) {
    sTone(g, t, 1400 * p, 0.09, 0.002, 0.12, 'triangle', 2600 * p, 0.1);
    chime(g, t + 0.02, 2093 * p, 0.05, 0.2);
  } },
  flick: { vol: 1.6, send: 0.05, vary: 40, fn(g, t, p) {
    sTone(g, t, 330 * p, 0.12, 0.001, 0.08, 'triangle', 620 * p, 0.05);
    sNoise(g, t, 'white', 'bandpass', 3000, 3, 0.06, 0.001, 0.02);
  } },
  pluck: { vol: 1.3, send: 0.22, vary: 60, fn(g, t, p) {
    const f = [392, 440, 494, 523, 587][Math.floor(Math.random() * 5)] * p;
    sTone(g, t, f, 0.16, 0.002, 0.35, 'triangle');
    sTone(g, t, f * 2, 0.05, 0.002, 0.18, 'sine');
  } },
  chord: { vol: 1.2, send: 0.3, vary: 10, fn(g, t, p) {
    [262, 330, 392, 523].forEach((f, i) => sTone(g, t + i * 0.015, f * p, 0.1, 0.003, 0.55, 'triangle'));
    sTone(g, t, 90 * p, 0.2, 0.004, 0.3, 'sine', 55 * p, 0.25);
  } },
  song: { vol: 1.1, send: 0.35, vary: 5, fn(g, t, p) {
    [523, 659, 784, 1047, 1319].forEach((f, i) => chime(g, t + i * 0.08, f * p, 0.1, 0.7));
    sTone(g, t, 262 * p, 0.08, 0.05, 0.8, 'sine');
  } },
  growl: { vol: 1.5, send: 0.08, vary: 40, fn(g, t, p) {
    sTone(g, t, 150 * p, 0.12, 0.02, 0.2, 'sawtooth', 110 * p, 0.18);
    sNoise(g, t, 'brown', 'lowpass', 500, 0.8, 0.1, 0.02, 0.18);
  } },
  // ---- Dino Isle: a big cartoon roar, heavy steps, a pterosaur's screech,
  // raptor chirps and a long-neck's gentle hoot
  roar: { vol: 1.5, send: 0.24, vary: 25, fn(g, t, p) {
    sTone(g, t, 150 * p, 0.13, 0.06, 0.9, 'sawtooth', 80 * p, 0.8);
    sTone(g, t + 0.02, 228 * p, 0.05, 0.08, 0.8, 'sawtooth', 120 * p, 0.7);
    sNoise(g, t, 'brown', 'bandpass', 520, 1.2, 0.5, 0.08, 0.9, 260);
    sNoise(g, t + 0.05, 'white', 'bandpass', 1500, 1.6, 0.12, 0.1, 0.6, 900);
    sTone(g, t, 62 * p, 0.2, 0.1, 1.0, 'sine', 45 * p, 0.9);
  } },
  stomp: { vol: 1.8, send: 0.1, vary: 20, fn(g, t, p) {
    sTone(g, t, 72 * p, 0.3, 0.005, 0.28, 'sine', 40 * p, 0.25);
    sNoise(g, t, 'brown', 'lowpass', 300, 0.7, 0.5, 0.004, 0.22);
  } },
  screech: { vol: 1.0, send: 0.16, vary: 30, fn(g, t, p) {
    sTone(g, t, 1400 * p, 0.08, 0.02, 0.35, 'sawtooth', 900 * p, 0.3);
    sNoise(g, t, 'white', 'bandpass', 2600, 3, 0.1, 0.02, 0.3, 1800);
  } },
  chirp: { vol: 0.9, send: 0.08, vary: 40, fn(g, t, p) {
    for (let i = 0; i < 2; i++) sTone(g, t + i * 0.09, 1800 * p, 0.07, 0.005, 0.07, 'square', 2600 * p, 0.05);
  } },
  honk: { vol: 1.2, send: 0.3, vary: 20, fn(g, t, p) {
    sTone(g, t, 110 * p, 0.14, 0.15, 1.2, 'triangle', 95 * p, 1.0);
    sTone(g, t, 165 * p, 0.07, 0.2, 1.1, 'sine', 140 * p, 1.0);
    sNoise(g, t, 'brown', 'bandpass', 300, 2, 0.12, 0.2, 1.0);
  } },
  charge: { vol: 1.5, send: 0.1, vary: 20, fn(g, t, p) {
    for (let i = 0; i < 4; i++) sNoise(g, t + i * 0.07, 'brown', 'lowpass', 700, 0.8, 0.14, 0.005, 0.06);
    sTone(g, t, 90 * p, 0.12, 0.02, 0.3, 'sine', 70 * p, 0.3);
  } },
  charge_up: { vol: 0.9, send: 0.15, vary: 10, fn(g, t, p) {
    sTone(g, t, 300 * p, 0.07, 0.05, 0.3, 'triangle', 900 * p, 0.3);
  } },
  caw: { vol: 1.2, send: 0.12, vary: 30, fn(g, t, p) {
    sTone(g, t, 800 * p, 0.1, 0.01, 0.16, 'sawtooth', 560 * p, 0.14);
    sNoise(g, t, 'white', 'bandpass', 1800, 2.5, 0.06, 0.01, 0.12);
  } },
  snap: { vol: 1.6, send: 0.05, vary: 30, fn(g, t, p) {
    sNoise(g, t, 'white', 'highpass', 2500, 1, 0.14, 0.001, 0.03);
    sTone(g, t, 700 * p, 0.08, 0.001, 0.04, 'square');
  } },
  thunder: { vol: 2.0, send: 0.25, vary: 15, fn(g, t, p) {
    sNoise(g, t, 'white', 'highpass', 3000, 0.7, 0.16, 0.001, 0.06);
    sNoise(g, t + 0.03, 'brown', 'lowpass', 600, 0.6, 0.4, 0.02, 0.9, 150);
    sTone(g, t + 0.02, 70 * p, 0.2, 0.02, 0.7, 'sine', 40 * p, 0.6);
  } },
  levelup: { vol: 1.1, send: 0.3, vary: 0, fn(g, t, p) {
    [523, 659, 784, 1047].forEach((f, i) => chime(g, t + i * 0.07, f * p, 0.12, 0.35));
    chime(g, t + 0.3, 1568 * p, 0.14, 0.8);
    chime(g, t + 0.3, 2093 * p, 0.06, 0.8);
  } },
  crit: { vol: 1.4, send: 0.15, vary: 10, fn(g, t, p) {
    sTone(g, t, 1800 * p, 0.1, 0.001, 0.12, 'triangle', 900 * p, 0.1);
    chime(g, t + 0.02, 2637 * p, 0.06, 0.25);
    sNoise(g, t, 'pink', 'bandpass', 1200, 1, 0.2, 0.002, 0.08, 500);
  } },
  block: { vol: 1.3, send: 0.1, vary: 20, fn(g, t, p) {
    chime(g, t, 1318 * p, 0.12, 0.25, 'square');
    sNoise(g, t, 'white', 'bandpass', 4200, 4, 0.05, 0.001, 0.05);
  } },
  hurt: { vol: 1.6, send: 0.08, vary: 25, fn(g, t, p) {
    sTone(g, t, 660 * p, 0.12, 0.002, 0.14, 'triangle', 330 * p, 0.12);
    sNoise(g, t, 'pink', 'bandpass', 900, 1, 0.12, 0.002, 0.06);
  } },
  down: { vol: 1.2, send: 0.2, vary: 5, fn(g, t, p) {
    [523, 440, 349, 262].forEach((f, i) => sTone(g, t + i * 0.1, f * p, 0.09, 0.005, 0.14, 'triangle'));
  } },
  revive: { vol: 1.1, send: 0.3, vary: 5, fn(g, t, p) {
    [392, 523, 659, 784].forEach((f, i) => chime(g, t + i * 0.06, f * p, 0.1, 0.4));
  } },
  poof: { vol: 1.5, send: 0.12, vary: 40, fn(g, t, p) {
    sNoise(g, t, 'pink', 'lowpass', 1800 * p, 0.8, 0.22, 0.004, 0.2, 300);
    sTone(g, t, 400 * p, 0.06, 0.004, 0.12, 'sine', 900 * p, 0.1);
  } },
  spit: { vol: 1.2, send: 0.08, vary: 40, fn(g, t, p) {
    sNoise(g, t, 'pink', 'bandpass', 700 * p, 1.4, 0.14, 0.003, 0.1, 1400 * p);
  } },
  // ---- the big world
  boing: { vol: 2.2, send: 0.12, vary: 40, fn(g, t, p) {
    // a mushroom cap springing back: a rubbery pitch bend + a soft thud
    sTone(g, t, 150 * p, 0.3, 0.004, 0.32, 'triangle', 420 * p, 0.16);
    sTone(g, t + 0.02, 300 * p, 0.12, 0.004, 0.22, 'sine', 900 * p, 0.14);
    sNoise(g, t, 'brown', 'lowpass', 500, 0.7, 0.25, 0.003, 0.08);
  } },
  croak: { vol: 2.4, send: 0.2, vary: 80, fn(g, t, p) {
    for (let i = 0; i < 3; i++) sTone(g, t + i * 0.07, 110 * p, 0.2, 0.01, 0.06, 'sawtooth', 90 * p, 0.05);
    sNoise(g, t, 'brown', 'bandpass', 380 * p, 2, 0.18, 0.01, 0.2);
  } },
  // (World v7) a hen: « bok… bok… BAWK! » — two short clucks and a rising squawk
  cluck: { vol: 2.2, send: 0.15, vary: 60, fn(g, t, p) {
    for (const [dt, f, d] of [[0, 520, 0.06], [0.13, 560, 0.06], [0.28, 700, 0.14]]) {
      sTone(g, t + dt, f * p, 0.16, 0.005, d, 'square', f * p * (d > 0.1 ? 1.5 : 0.8), d);
      sNoise(g, t + dt, 'white', 'bandpass', 1800 * p, 3, 0.05, 0.005, d);
    }
  } },
  blub: { vol: 2.2, send: 0.1, vary: 120, fn(g, t, p) {
    sTone(g, t, 90 * p, 0.28, 0.01, 0.16, 'sine', 180 * p, 0.12);
    sNoise(g, t + 0.05, 'brown', 'lowpass', 300, 0.7, 0.2, 0.01, 0.12);
  } },
  gust: { vol: 3.2, send: 0.2, vary: 40, fn(g, t, p) {
    sNoise(g, t, 'pink', 'bandpass', 500 * p, 0.8, 0.26, 0.35, 1.2, 1600 * p);
    sNoise(g, t + 0.2, 'white', 'bandpass', 2600 * p, 1.5, 0.05, 0.3, 0.9, 1200 * p);
  } },
  geyser: { vol: 2.6, send: 0.2, vary: 30, fn(g, t, p) {
    sNoise(g, t, 'white', 'highpass', 1800 * p, 0.7, 0.2, 0.05, 1.1, 900 * p);
    sNoise(g, t, 'brown', 'lowpass', 260, 0.8, 0.3, 0.02, 0.6);
    sTone(g, t, 70 * p, 0.25, 0.02, 0.5, 'sine', 50 * p, 0.4);
  } },
  crackle: { vol: 1.8, send: 0.15, vary: 60, fn(g, t, p) {
    for (let i = 0; i < 5; i++) sNoise(g, t + rand(0, 0.25), 'white', 'bandpass', rand(2500, 5000) * p, 3, 0.12, 0.001, 0.03);
    sTone(g, t, 1800 * p, 0.04, 0.001, 0.12, 'sine', 900 * p, 0.1);
  } },
  sizzle: { vol: 1.6, send: 0.08, vary: 40, fn(g, t, p) {
    sNoise(g, t, 'white', 'highpass', 3500 * p, 0.7, 0.14, 0.01, 0.45);
    sTone(g, t, 240 * p, 0.08, 0.005, 0.2, 'triangle', 120 * p, 0.2);
  } },
};

/** Footstep surfaces: fn(group, time, pitchRatio). Kept quiet and soft. */
const FOOT = {
  grass(g, t, p) {
    sNoise(g, t, 'pink', 'bandpass', 1700 * p, 0.7, 0.3, 0.012, 0.06);
    sNoise(g, t + 0.022, 'pink', 'bandpass', 2300 * p, 0.8, 0.16, 0.01, 0.05);
  },
  dirt(g, t, p) {
    sNoise(g, t, 'brown', 'lowpass', 1100 * p, 0.7, 0.14, 0.004, 0.06);
    sTone(g, t, 120 * p, 0.06, 0.003, 0.05, 'sine', 80 * p, 0.04);
  },
  stone(g, t, p) {
    sNoise(g, t, 'white', 'bandpass', 1900 * p, 1.6, 0.05, 0.001, 0.03);
    sTone(g, t, 260 * p, 0.05, 0.002, 0.035, 'sine', 210 * p, 0.03);
  },
  wood(g, t, p) {
    sTone(g, t, 210 * p, 0.1, 0.002, 0.07, 'sine', 170 * p, 0.05);
    sTone(g, t, 430 * p, 0.03, 0.001, 0.03, 'triangle');
    sNoise(g, t, 'pink', 'bandpass', 900 * p, 1.2, 0.04, 0.002, 0.04);
  },
  sand(g, t, p) {
    sNoise(g, t, 'pink', 'bandpass', 2000 * p, 0.7, 0.28, 0.015, 0.09);
    for (let i = 0; i < 3; i++) sNoise(g, t + rand(0, 0.06), 'pink', 'bandpass', rand(2800, 4000), 2, 0.06, 0.001, 0.01);
  },
  floor(g, t, p) {
    sNoise(g, t, 'pink', 'lowpass', 800 * p, 0.7, 0.1, 0.004, 0.05);
    sTone(g, t, 150 * p, 0.05, 0.003, 0.05, 'sine', 110 * p, 0.04);
  },
  water(g, t, p) {
    sNoise(g, t, 'white', 'bandpass', 1200 * p, 1.0, 0.06, 0.01, 0.12, 2200 * p);
    const f = rand(1400, 2200) * p;
    sTone(g, t + 0.04, f, 0.02, 0.001, 0.04, 'sine', f * 1.4, 0.03);
  },
};

const FOOT_VOL = 1.0;
const FOOT_GAIN = { grass: 1.45, dirt: 1.6, stone: 2.1, wood: 1.1, sand: 1.45, floor: 2.4, water: 3.2 };
const lastSfxAt = {};

function playSfx(name, opts) {
  const def = SFX[name];
  if (!def) { warnOnce('sfx:' + name, `unknown sfx "${name}"`); return; }
  const o = opts || {};
  const t = nowT() + 0.005;
  if (lastSfxAt[name] != null && t - lastSfxAt[name] < 0.025 && t >= lastSfxAt[name]) return; // flood guard
  lastSfxAt[name] = t;
  if (E.active > MAX_VOICES + 80) return;
  const p = semis(clamp(num(o.pitch, 0), -36, 36)) * cents(rand(-def.vary, def.vary));
  const vol = clamp(num(o.volume, 1), 0, 2) * def.vol;
  if (vol <= 0) return;
  const g = makeGroup(vol, clamp(num(o.pan, 0), -1, 1), def.send);
  def.fn(g, t, p);
  seal(g);
}

function playFootstep(surface) {
  let fn = FOOT[surface];
  if (!fn) { warnOnce('foot:' + surface, `unknown footstep surface "${surface}"`); fn = FOOT.dirt; }
  const t = nowT() + 0.005;
  if (lastSfxAt.__foot != null && t - lastSfxAt.__foot < 0.05 && t >= lastSfxAt.__foot) return;
  lastSfxAt.__foot = t;
  state.stepFoot ^= 1;
  const g = makeGroup(FOOT_VOL * (FOOT_GAIN[surface] || 1.6) * rand(0.75, 1), state.stepFoot ? 0.07 : -0.07, 0.03);
  fn(g, t, cents(rand(-150, 150)));
  seal(g);
}

// Dialogue blips: soft, very short, lowpassed chirps. Pitches are drawn from
// pentatonic offsets inside ±vary so chatter always sounds musical.
const BLIP_LEVEL = { sine: 0.091, triangle: 0.109, square: 0.066, sawtooth: 0.107 };
const blipOffsets = {};

function playBlip(voice) {
  const vo = voice || {};
  const t = nowT() + 0.005;
  if (t - state.lastBlip < 0.03 && t >= state.lastBlip) return;
  state.lastBlip = t;
  const base = clamp(num(vo.pitch, 72), 36, 100);
  const vary = Math.round(clamp(num(vo.vary, 3), 0, 12));
  let offs = blipOffsets[vary];
  if (!offs) {
    offs = [];
    for (let k = -vary; k <= vary; k++) if ([0, 2, 4, 7, 9].indexOf(((k % 12) + 12) % 12) >= 0) offs.push(k);
    if (!offs.length) offs.push(0);
    blipOffsets[vary] = offs;
  }
  const type = BLIP_LEVEL[vo.wave] ? vo.wave : 'square';
  const f = mtof(base + pick(offs));
  const len = rand(0.042, 0.055);
  const o = osc(type, f * 0.985, t);
  o.frequency.exponentialRampToValueAtTime(clampF(f * 1.012), t + len);
  const lp = filt('lowpass', Math.min(f * 3.2, 3400), 0.8);
  const g = gainAt(0);
  const peak = BLIP_LEVEL[type] * rand(0.85, 1);
  g.gain.setValueAtTime(SILENT, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.008);
  g.gain.exponentialRampToValueAtTime(peak * 0.6, t + 0.02);
  g.gain.exponentialRampToValueAtTime(SILENT, t + len);
  o.connect(lp); lp.connect(g); g.connect(E.sIn);
  o.start(t);
  o.stop(t + len + 0.02);
  own(o, [o, lp, g], null);
}

// ───────────────────────────────────────────────────────────────────────────
// 9. Jingles — short stingers that auto-duck the music
// ───────────────────────────────────────────────────────────────────────────
// Parts: { inst, notes } melody (same syntax as tracks), { inst, chord, at, len }
// a held chord/bass note, { inst, hits } percussion hits (all in 16th steps).

const JINGLES = {
  questStart: { vol: 0.89, bpm: 140, parts: [
    { inst: 'kalimba', notes: 'D5:2 G5 A5 D6:6', vel: 0.8 },
    { inst: 'bell', notes: '_:6 A6:6', vel: 0.35 },
    { inst: 'pad', chord: 'G4 A4 D5', at: 0, len: 10, vel: 0.5 },
  ] },
  questDone: { vol: 0.75, bpm: 150, parts: [
    { inst: 'marimba', notes: 'C5:2 E5 G5 C6 _:2 G5:2 C6:8', vel: 0.85 },
    { inst: 'kalimba', notes: 'E5:2 G5 C6 E6 _:2 D6:2 E6:8', vel: 0.45 },
    { inst: 'bell', notes: '_:12 C7:8', vel: 0.28 },
    { inst: 'pad', chord: 'C4 E4 G4 C5', at: 10, len: 10, vel: 0.6 },
    { inst: 'bass', chord: 'C3', at: 10, len: 8, vel: 0.6 },
  ] },
  friendUp: { vol: 0.91, bpm: 140, parts: [
    { inst: 'kalimba', notes: 'E5:2 G#5 B5 E6:8', vel: 0.8 },
    { inst: 'bell', notes: '_:4 B6:8', vel: 0.3 },
    { inst: 'pad', chord: 'E4 G#4 B4 D#5', at: 0, len: 12, vel: 0.45 },
  ] },
  newDay: { vol: 0.92, bpm: 120, parts: [
    { inst: 'marimba', notes: 'C5:2 D5 G5:4 E5:2 G5 C6:8', vel: 0.8 },
    { inst: 'bell', notes: '_:12 G6:8', vel: 0.28 },
    { inst: 'pad', chord: 'C4 E4 G4 D5', at: 0, len: 18, vel: 0.5 },
    { inst: 'bass', chord: 'C3', at: 0, len: 16, vel: 0.5 },
  ] },
  sleep: { vol: 0.93, bpm: 100, parts: [
    { inst: 'musicbox', notes: 'G5:3 E5 C5:6 B4:2 D5 C5:10', vel: 0.75 },
    { inst: 'pad', chord: 'F4 A4 C5 E5', at: 0, len: 12, vel: 0.5 },
    { inst: 'pad', chord: 'C4 E4 G4 B4', at: 12, len: 14, vel: 0.5 },
    { inst: 'bass', chord: 'F2', at: 0, len: 12, vel: 0.4 },
    { inst: 'bass', chord: 'C3', at: 12, len: 14, vel: 0.4 },
  ] },
  shard: { vol: 1.08, bpm: 150, parts: [
    { inst: 'bell', notes: 'F5:2 A5 B5 E6 A6:10', vel: 0.55 },
    { inst: 'musicbox', notes: '_:4 C6:2 E6 B6:10', vel: 0.45 },
    { inst: 'pad', chord: 'F4 A4 B4 E5', at: 0, len: 16, vel: 0.5 },
  ] },
  lighthouse: { vol: 0.79, bpm: 110, parts: [
    { inst: 'flute', notes: 'A5:4 Bb5 C6:8 F6:12', vel: 0.75 },
    { inst: 'musicbox', notes: '_:16 F5:2 A5 C6 F6:6', vel: 0.5 },
    { inst: 'bell', notes: '_:16 A6:12', vel: 0.3 },
    { inst: 'pad', chord: 'Bb3 D4 F4', at: 0, len: 8, vel: 0.5 },
    { inst: 'pad', chord: 'C4 E4 G4 Bb4', at: 8, len: 8, vel: 0.5 },
    { inst: 'pad', chord: 'F4 A4 C5', at: 16, len: 14, vel: 0.55 },
    { inst: 'bass', chord: 'Bb2', at: 0, len: 8, vel: 0.55 },
    { inst: 'bass', chord: 'C3', at: 8, len: 8, vel: 0.55 },
    { inst: 'bass', chord: 'F2', at: 16, len: 12, vel: 0.55 },
  ] },
  festival: { vol: 0.68, bpm: 150, parts: [
    { inst: 'marimba', notes: 'C5:1 C5 C5:2 G5 E5 C6:6', vel: 0.85 },
    { inst: 'kalimba', notes: 'E5:1 E5 E5:2 B5 G5 E6:6', vel: 0.45 },
    { inst: 'pad', chord: 'C4 E4 G4', at: 8, len: 8, vel: 0.5 },
    { inst: 'clap', hits: [0, 2, 8], vel: 0.6 },
    { inst: 'tamb', hits: [4, 6, 8], vel: 0.5 },
  ] },
  catch: { vol: 0.75, bpm: 170, parts: [
    { inst: 'marimba', notes: 'G5:1 A5 B5 D6 G6:6', vel: 0.85 },
    { inst: 'bell', notes: '_:4 G6:8', vel: 0.3 },
    { inst: 'pad', chord: 'G4 B4 D5', at: 4, len: 8, vel: 0.45 },
  ] },
  purchase: { vol: 1.05, bpm: 160, parts: [
    { inst: 'marimba', notes: 'G5:2 C6 E6:6', vel: 0.8 },
    { inst: 'bell', notes: '_:4 C7:6', vel: 0.25 },
    { inst: 'kalimba', notes: '_:4 G6:6', vel: 0.3 },
  ] },
};

const jingleCache = {};

function playJingle(name) {
  const J = JINGLES[name];
  if (!J) { warnOnce('jingle:' + name, `unknown jingle "${name}"`); return; }
  const t0 = nowT() + 0.03;
  const step = 60 / J.bpm / 4;
  const g = makeGroup(0.9 * num(J.vol, 1), 0, 0.3);
  let end = 0;
  for (const part of J.parts) {
    const spec = VOICES[part.inst];
    if (!spec) continue;
    const lvl = spec.lvl * (part.vel || 0.7);
    if (part.notes) {
      const key = name + ':' + part.notes;
      const mel = jingleCache[key] || (jingleCache[key] = parseMelody(part.notes, 0));
      for (const n of mel.events) {
        spec.fn(g.out, t0 + n.s * step, n.m, n.d * step, lvl * n.v, g);
        end = Math.max(end, (n.s + n.d) * step);
      }
    } else if (part.chord) {
      const notes = part.chord.split(/\s+/).map(noteToMidi).filter((x) => x != null);
      const t = t0 + (part.at || 0) * step, d = (part.len || 8) * step;
      if (spec.chord) spec.fn(g.out, t, notes, d, lvl, g);
      else for (const m of notes) spec.fn(g.out, t, m, d, lvl, g);
      end = Math.max(end, ((part.at || 0) + (part.len || 8)) * step);
    } else if (part.hits) {
      for (const h of part.hits) spec.fn(g.out, t0 + h * step, 0, step, lvl, g);
    }
  }
  seal(g);
  duckMusic(0.3, end + 0.4);
}

// ───────────────────────────────────────────────────────────────────────────
// 10. Ambient layers
// ───────────────────────────────────────────────────────────────────────────
// Each layer owns a gain (ramped toward its target by setAmbient) feeding the
// ambient bus. Continuous beds are built lazily when a layer first becomes
// audible and torn down after it has been silent for a few seconds; random
// events (chirps, drops, crackles) are scheduled by the shared scheduler with
// irregular timing and a density that follows the layer's level.

function loopNoise(L, color, t) {
  const s = E.ctx.createBufferSource();
  const b = noiseBuffer(color);
  s.buffer = b;
  s.loop = true;
  s.start(t, Math.random() * b.duration);
  L.srcs.push(s);
  L.nodes.push(s);
  return s;
}

function lfoNode(L, freq, depth, target, t) {
  const o = osc('sine', freq, t);
  const g = gainAt(depth);
  o.connect(g);
  g.connect(target);
  o.start(t);
  L.srcs.push(o);
  L.nodes.push(o, g);
  return o;
}

/** chain(L, a, b, c…) connects nodes in series and registers them with the layer. */
function chain(L, ...nodes) {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
  for (const n of nodes) if (n !== L.out && L.nodes.indexOf(n) < 0) L.nodes.push(n);
}

/** Random delay with an exponential distribution (irregular, natural timing). */
const expWait = (rate) => -Math.log(1 - Math.random() * 0.999) / Math.max(rate, 0.001);

const AMB = {
  // Surf: two decorrelated pink-noise swells (~8 s and ~9 s periods) whose
  // lowpass opens at each crest, plus a faint foam hiss.
  waves: { base: 0.28, send: 0.12, build(L, t) {
    for (let side = 0; side < 2; side++) {
      const n = loopNoise(L, 'pink', t);
      const lp = filt('lowpass', 520, 0.5);
      const sw = gainAt(0.55);
      const pn = panNode(side ? 0.55 : -0.55);
      const lfo = lfoNode(L, side ? 1 / 9.3 : 1 / 7.8, 0.42, sw.gain, t);
      const lg2 = gainAt(330);
      lfo.connect(lg2); lg2.connect(lp.frequency);
      L.nodes.push(lg2);
      if (pn) chain(L, n, lp, sw, pn, L.out); else chain(L, n, lp, sw, L.out);
    }
    const f = loopNoise(L, 'white', t);
    const bp = filt('bandpass', 2000, 0.6);
    const fg = gainAt(0.03);
    lfoNode(L, 1 / 7.8, 0.025, fg.gain, t + 1.2);
    chain(L, f, bp, fg, L.out);
  } },

  // Rain: pinkish body in stereo, a low patter, and random droplet plinks.
  rain: { base: 0.25, send: 0.08, build(L, t) {
    for (let side = 0; side < 2; side++) {
      const n = loopNoise(L, 'pink', t);
      const hp = filt('highpass', 380, 0.5);
      const lp = filt('lowpass', side ? 4200 : 5200, 0.5);
      const g = gainAt(0.42);
      const pn = panNode(side ? 0.45 : -0.45);
      if (pn) chain(L, n, hp, lp, g, pn, L.out); else chain(L, n, hp, lp, g, L.out);
    }
    const b = loopNoise(L, 'brown', t);
    const blp = filt('lowpass', 900, 0.5);
    chain(L, b, blp, gainAt(0.3), L.out);
  },
  interval: (L) => expWait(10 * (0.25 + L.target)),
  event(L, t) {
    const g = makeGroup(rand(0.3, 1), rand(-0.8, 0.8), 0, L.out);
    const f = rand(1500, 3200);
    sTone(g, t, f, rand(0.03, 0.08), 0.001, rand(0.02, 0.04), 'sine', f * 1.6, 0.03);
    seal(g);
  } },

  // Wind: two band-passed noise bands whose centre and level drift to new
  // random targets every few seconds (organic gusts).
  wind: { base: 0.45, send: 0.1, build(L, t) {
    L.data.bands = [];
    for (let side = 0; side < 2; side++) {
      const n = loopNoise(L, 'pink', t);
      const bp = filt('bandpass', rand(350, 700), 1.4);
      const g = gainAt(0.5);
      const pn = panNode(side ? 0.4 : -0.4);
      if (pn) chain(L, n, bp, g, pn, L.out); else chain(L, n, bp, g, L.out);
      L.data.bands.push({ bp, g });
    }
  },
  interval: () => rand(1.8, 4.5),
  event(L, t) {
    for (const band of L.data.bands || []) {
      glide(band.bp.frequency, rand(280, 1100), t, rand(0.8, 2.0));
      glide(band.g.gain, rand(0.25, 1.0), t, rand(0.8, 2.2));
    }
  } },

  // Hearth fire: low rumble + soft roar, with random crackles and the odd pop.
  fire: { base: 0.22, send: 0.05, build(L, t) {
    const b = loopNoise(L, 'brown', t);
    const lp = filt('lowpass', 170, 0.6);
    chain(L, b, lp, gainAt(0.7), L.out);
    const p = loopNoise(L, 'pink', t);
    const bp = filt('bandpass', 380, 0.7);
    const rg = gainAt(0.1);
    lfoNode(L, 0.23, 0.04, rg.gain, t);
    chain(L, p, bp, rg, L.out);
  },
  interval: (L) => expWait(9 * (0.3 + L.target)),
  event(L, t) {
    const g = makeGroup(1, rand(-0.35, 0.35), 0, L.out);
    if (chance(0.88)) {
      const bursts = chance(0.2) ? 2 + ((Math.random() * 3) | 0) : 1;
      let tt = t;
      for (let i = 0; i < bursts; i++) {
        const a = Math.pow(Math.random(), 2) * 0.22 + 0.02;
        sNoise(g, tt, 'white', 'bandpass', rand(1500, 4200), 1.2, a, 0.001, rand(0.004, 0.02));
        tt += rand(0.015, 0.05);
      }
    } else {
      sTone(g, t, rand(180, 320), 0.07, 0.002, 0.03, 'sine', 110, 0.03);
      sNoise(g, t, 'pink', 'bandpass', 900, 1, 0.06, 0.001, 0.04);
    }
    seal(g);
  } },

  // Birds: irregular songs from a few synthesised "species", panned around.
  birds: { base: 0.95, send: 0.3,
  interval: (L) => rand(1.2, 5.0) / (0.35 + 0.65 * L.target),
  event(L, t) {
    const g = makeGroup(rand(0.35, 1), rand(-0.8, 0.8), 0, L.out);
    const kind = Math.random();
    if (kind < 0.4) { // tweets: quick upward sweeps
      const n = 2 + ((Math.random() * 4) | 0);
      const f0 = rand(2300, 3300);
      let tt = t;
      for (let i = 0; i < n; i++) {
        sTone(g, tt, f0 * rand(0.95, 1.05), rand(0.05, 0.09), 0.006, 0.05, 'sine', f0 * rand(1.15, 1.4), 0.045);
        tt += rand(0.07, 0.11);
      }
    } else if (kind < 0.62) { // trill: FM warble
      const dur = rand(0.35, 0.6), f = rand(2500, 3200);
      const o = osc('sine', f, t);
      const m = osc('sine', rand(24, 40), t);
      const mg = gainAt(rand(180, 320));
      m.connect(mg); mg.connect(o.frequency);
      const env = gainAt(0);
      const end = envADSR(env.gain, t, dur, rand(0.04, 0.06), 0.03, 0.1, 0.7, 0.08);
      o.connect(env); env.connect(g.out);
      o.start(t); m.start(t); o.stop(end + 0.02); m.stop(end + 0.02);
      own(o, [o, m, mg, env], g);
    } else if (kind < 0.82) { // "fee-bee" two-note whistle
      const f1 = rand(2800, 3300);
      contour(g, t, 'sine', [f1, f1 * 1.01], [0.22], 0.055, 0.03, 0.1, 0.8, 0.22, 0.06);
      contour(g, t + 0.3, 'sine', [f1 * 0.84, f1 * 0.83], [0.25], 0.05, 0.03, 0.1, 0.8, 0.25, 0.08);
    } else { // warble: a little run of gliding notes
      const n = 4 + ((Math.random() * 4) | 0);
      let tt = t;
      for (let i = 0; i < n; i++) {
        const f = rand(2000, 3500);
        sTone(g, tt, f, rand(0.03, 0.06), 0.008, rand(0.04, 0.07), 'sine', f * rand(0.8, 1.25), 0.05);
        tt += rand(0.06, 0.09);
      }
    }
    seal(g);
  } },

  // Crickets: three "individuals" with their own pitch and position, each
  // chirp a train of 3–4 short sine pulses.
  crickets: { base: 1.4, send: 0.2, build(L) {
    L.data.crickets = [0, 1, 2].map(() => ({ f: rand(3300, 4300), pan: rand(-0.7, 0.7) }));
  },
  interval: (L) => rand(0.22, 0.5) / (0.4 + 0.6 * L.target),
  event(L, t) {
    const c = pick(L.data.crickets);
    const g = makeGroup(rand(0.6, 1), c.pan, 0, L.out);
    const o = osc('sine', c.f * rand(0.995, 1.005), t);
    const env = gainAt(0);
    const pulses = chance(0.4) ? 4 : 3;
    const peak = 0.035;
    let tt = t;
    env.gain.setValueAtTime(SILENT, t);
    for (let i = 0; i < pulses; i++) {
      env.gain.setValueAtTime(SILENT, tt);
      env.gain.linearRampToValueAtTime(peak, tt + 0.005);
      env.gain.setValueAtTime(peak, tt + 0.013);
      env.gain.linearRampToValueAtTime(SILENT, tt + 0.02);
      tt += 0.042;
    }
    o.connect(env); env.connect(g.out);
    o.start(t); o.stop(tt + 0.02);
    own(o, [o, env], g);
    seal(g);
  } },

  // Night air: a very soft low hush with slow "breathing" and a faint high air.
  night: { base: 0.23, send: 0.1, build(L, t) {
    const n = loopNoise(L, 'pink', t);
    const lp = filt('lowpass', 320, 0.5);
    const g = gainAt(0.5);
    lfoNode(L, 0.05, 0.18, g.gain, t);
    chain(L, n, lp, g, L.out);
    const h = loopNoise(L, 'pink', t);
    const bp = filt('bandpass', 2500, 0.5);
    chain(L, h, bp, gainAt(0.035), L.out);
  } },
};

function layerOf(key) {
  let L = E.amb[key];
  if (!L) {
    L = E.amb[key] = { key, def: AMB[key], target: 0, out: null, nodes: [], srcs: [], live: false, next: 0, zeroAt: 0, data: {} };
  }
  return L;
}

function layerStart(L, t) {
  L.out = gainAt(0);
  L.out.connect(E.aVol);
  L.nodes = [L.out];
  L.srcs = [];
  L.data = {};
  if (L.def.send) {
    const w = gainAt(L.def.send);
    L.out.connect(w);
    w.connect(E.aWet);
    L.nodes.push(w);
  }
  if (L.def.build) L.def.build(L, t);
  L.live = true;
  L.next = t + rand(0.1, 0.8);
}

/** Only called after the layer has been at ~zero gain for seconds, so the cut is inaudible. */
function layerTeardown(L) {
  const t = nowT();
  for (const s of L.srcs) { try { s.stop(t + 0.02); } catch (_) { /* not started */ } }
  for (const n of L.nodes) { try { n.disconnect(); } catch (_) { /* already */ } }
  L.srcs = [];
  L.nodes = [];
  L.out = null;
  L.live = false;
}

const ambLevel = (L) => Math.pow(L.target, 1.5) * L.def.base;

function applyAmbient(key, v) {
  const L = layerOf(key);
  const t = nowT();
  const was = L.target;
  L.target = v;
  if (v > 0.001 && !L.live) layerStart(L, t);
  if (!L.live) return;
  glide(L.out.gain, ambLevel(L), t, 0.5);
  if (v <= 0.001 && was > 0.001) L.zeroAt = t;
}

function ambientTick(until, t) {
  for (const key of AMB_KEYS) {
    const L = E.amb[key];
    if (!L || !L.live) continue;
    if (L.target <= 0.001) {
      if (t - L.zeroAt > 4) layerTeardown(L);
      continue;
    }
    const def = L.def;
    if (!def.event) continue;
    if (L.next < t - 0.5) L.next = t + rand(0, 0.3); // resync after a stall
    for (let guard = 0; L.next < until && guard < 64; guard++) {
      def.event(L, Math.max(L.next, t + 0.005));
      L.next += def.interval(L);
    }
  }
}

// ───────────────────────────────────────────────────────────────────────────
// 11. Public API
// ───────────────────────────────────────────────────────────────────────────

function duckMusic(amount, seconds) {
  const t = nowT();
  const d = E.duck;
  const amt = clamp(num(amount, 0.35), 0, 1);
  const secs = clamp(num(seconds, 2.5), 0.05, 60);
  if (t < d.until) { d.amount = Math.min(d.amount, amt); d.until = Math.max(d.until, t + secs); }
  else { d.amount = amt; d.until = t + secs; }
  for (const p of [E.mDuck.gain, E.mDuckW.gain]) {
    p.cancelScheduledValues(t);
    p.setTargetAtTime(d.amount, t, 0.06);
    p.setTargetAtTime(1, d.until, 0.35);
  }
}

function applyMuffle() {
  const t = nowT();
  const f = state.muffled ? MUFFLE_HZ : OPEN_HZ;
  const tau = state.muffled ? 0.12 : 0.2;
  glide(E.mMuf.frequency, f, t, tau);
  glide(E.mMufW.frequency, f, t, tau);
  const g = musicVolGain();
  glide(E.mVol.gain, g, t, 0.15);
  glide(E.mVolW.gain, g, t, 0.15);
}

function applyVolume(kind) {
  const t = nowT();
  const g = volCurve(state.vol[kind]);
  const tau = 0.05;
  if (kind === 'master') glide(E.master.gain, g, t, tau);
  else if (kind === 'music') { const m = musicVolGain(); glide(E.mVol.gain, m, t, tau); glide(E.mVolW.gain, m, t, tau); }
  else if (kind === 'sfx') { glide(E.sVol.gain, g, t, tau); glide(E.sWet.gain, g, t, tau); }
  else if (kind === 'ambient') { glide(E.aVol.gain, g, t, tau); glide(E.aWet.gain, g, t, tau); }
}

function resumeCtx() {
  const ctx = E.ctx;
  if (ctx.state !== 'running' && ctx.state !== 'closed' && ctx.resume) {
    try {
      const pr = ctx.resume();
      if (pr && pr.then) pr.then(ensureScheduler, () => { /* needs another gesture */ });
    } catch (_) { /* ignore */ }
  }
}

/** iOS/Safari: playing a silent buffer inside the gesture fully unlocks output. */
function primeSilence(ctx) {
  try {
    const s = ctx.createBufferSource();
    s.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    s.connect(ctx.destination);
    s.onended = () => { try { s.disconnect(); } catch (_) { /* already */ } };
    s.start(0);
  } catch (_) { /* ignore */ }
}

let visibilityHooked = false;
function hookVisibility() {
  if (visibilityHooked || typeof document === 'undefined' || !document.addEventListener) return;
  visibilityHooked = true;
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && E) { resumeCtx(); ensureScheduler(); }
  });
}

function unlock() {
  if (state.disabled) return;
  try {
    if (E && E.ctx.state === 'closed') { // the browser closed it: rebuild from scratch
      if (timer != null) { clearTimeout(timer); timer = null; }
      E = null;
    }
    if (!E) {
      const AC = getAudioContextClass();
      if (!AC) { state.disabled = true; warnOnce('noaudio', 'Web Audio is not available; audio disabled'); return; }
      let ctx;
      try { ctx = new AC({ latencyHint: 'interactive' }); } catch (_) { ctx = new AC(); }
      E = makeEngine(ctx);
      E.amb = {};
      primeSilence(ctx);
      if (ctx.addEventListener) ctx.addEventListener('statechange', () => { if (E && E.ctx.state === 'running') ensureScheduler(); });
      hookVisibility();
      for (const k of AMB_KEYS) if (state.amb[k] > 0) applyAmbient(k, state.amb[k]);
      if (state.track) applyTrack(state.track, state.pendingFade);
      ensureScheduler();
      // Warm the noise caches right after the gesture so the first footstep never hitches.
      setTimeout(() => { if (E) for (const c of ['white', 'pink', 'brown']) noiseBuffer(c); }, 30);
    }
    resumeCtx();
  } catch (err) {
    warnOnce('unlock', 'audio unlock failed: ' + (err && err.message));
    if (!E) state.disabled = true;
  }
}

/** Wrap an API method so an audio problem can never throw into the game. */
function safe(name, fn) {
  return function (...args) {
    try { return fn.apply(this, args); } catch (err) {
      warnOnce('api:' + name, `audio.${name} failed: ${err && err.message}`);
      return undefined;
    }
  };
}

const live = () => !!E && !state.disabled;

export const audio = {
  /** Call from a user gesture (keydown/pointerdown). Idempotent; safe without Web Audio. */
  unlock: safe('unlock', unlock),

  /** True once the AudioContext exists and is running. */
  get ready() { return !!E && E.ctx.state === 'running'; },

  /** kind: 'master' | 'music' | 'sfx' | 'ambient'; v: slider position 0..1 (perceptual curve, smooth ramp). */
  setVolume: safe('setVolume', (kind, v) => {
    if (KINDS.indexOf(kind) < 0) { warnOnce('vol:' + kind, `unknown volume kind "${kind}"`); return; }
    state.vol[kind] = clamp(num(v, state.vol[kind]), 0, 1);
    if (live()) applyVolume(kind);
  }),

  getVolume(kind) { return KINDS.indexOf(kind) >= 0 ? state.vol[kind] : 0; },

  /** Crossfade to a track (null = fade out). Same id = no-op. Works before unlock (starts once unlocked). */
  playMusic: safe('playMusic', (trackId, opts) => {
    const id = trackId == null ? null : String(trackId);
    if (id !== null && !TRACKS[id]) { warnOnce('track:' + id, `unknown track "${id}"`); return; }
    if (id === state.track) return;
    const fade = clamp(num(opts && opts.fade, 2.5), 0, 30);
    state.track = id;
    state.pendingFade = fade;
    if (live()) { applyTrack(id, fade); ensureScheduler(); }
  }),

  /** The track the game asked for (even if still waiting for unlock), or null. */
  get currentTrack() { return state.track; },

  /** Smoothly lowpass (~700 Hz) and slightly lower the music, e.g. while paused. */
  muffle: safe('muffle', (on) => {
    state.muffled = !!on;
    if (live()) applyMuffle();
  }),

  /** Temporarily lower the music to `amount` (gain multiplier) for `seconds`, then restore. */
  duck: safe('duck', (amount = 0.35, seconds = 2.5) => {
    if (live()) duckMusic(amount, seconds);
  }),

  /** opts: { pitch: semitones, volume: 0..1 multiplier, pan: -1..1 } */
  sfx: safe('sfx', (name, opts) => {
    if (!SFX[name]) { warnOnce('sfx:' + name, `unknown sfx "${name}"`); return; }
    if (live()) playSfx(name, opts);
  }),

  /** Short musical stinger; ducks the music automatically. */
  jingle: safe('jingle', (name) => {
    if (!JINGLES[name]) { warnOnce('jingle:' + name, `unknown jingle "${name}"`); return; }
    if (live()) playJingle(name);
  }),

  /** One dialogue blip. voice: { pitch: MIDI note, wave, vary: semitone range }. */
  blip: safe('blip', (voice) => { if (live()) playBlip(voice); }),

  /** 'grass' | 'dirt' | 'stone' | 'wood' | 'sand' | 'floor' | 'water' */
  footstep: safe('footstep', (surface) => {
    if (!FOOT[surface]) { warnOnce('foot:' + surface, `unknown footstep surface "${surface}"`); }
    if (live()) playFootstep(surface);
  }),

  /** levels: { birds, crickets, waves, rain, wind, fire, night } each 0..1; omitted keys keep their target. */
  setAmbient: safe('setAmbient', (levels) => {
    if (!levels || typeof levels !== 'object') return;
    for (const k of AMB_KEYS) {
      if (!(k in levels)) continue;
      const v = clamp(num(levels[k], state.amb[k]), 0, 1);
      state.amb[k] = v;
      if (live()) applyAmbient(k, v);
    }
  }),
};

export default audio;

/**
 * Debug / test hooks (not used by the game). `withContext` builds a private
 * engine on a caller-supplied context (e.g. an OfflineAudioContext) and runs
 * `fn(api)` synchronously with a controllable clock, then restores the live
 * engine — used for offline level/click analysis.
 */
export const __debug = {
  tracks: TRACK_IDS,
  sfxNames: Object.keys(SFX),
  jingleNames: Object.keys(JINGLES),
  surfaces: Object.keys(FOOT),
  ambientKeys: AMB_KEYS.slice(),
  compile: (id) => compileTrack(id),
  validate() {
    const out = {};
    for (const id of TRACK_IDS) {
      delete compiled[id];
      const c = compileTrack(id);
      out[id] = { errors: c.errors.slice(), bars: c.loopLen / c.spb, seconds: c.loopDur, events: c.steps.reduce((a, s) => a + s.length, 0) };
    }
    return out;
  },
  stats() {
    if (!E) return null;
    const amb = {};
    for (const k of AMB_KEYS) { const L = E.amb && E.amb[k]; amb[k] = L && L.live ? L.nodes.length : 0; }
    return {
      state: E.ctx.state, active: E.active, players: E.players.length,
      playerNodes: E.players.reduce((a, p) => a + p.nodes.length, 0),
      ksCache: E.ks.size, noiseBuffers: Object.keys(E.noise).length, ambientNodes: amb,
      timerRunning: timer != null,
    };
  },
  /**
   * Build a private engine on `ctx` and return an API whose every call swaps
   * that engine in (with its clock forced to the given time) and back out, so
   * it can be driven incrementally, e.g. from OfflineAudioContext.suspend().
   */
  offline(ctx) {
    const eng = makeEngine(ctx);
    eng.amb = {};
    const run = (t, f) => {
      const saved = E, savedNow = forcedNow;
      E = eng; forcedNow = t;
      try { return f(); } finally { E = saved; forcedNow = savedNow; }
    };
    return {
      engine: eng,
      music: (id, fade = 0.05, t = 0) => run(t, () => applyTrack(id, fade)),
      pump: (t, until) => run(t, () => pump(until)),
      sfx: (name, opts, t = 0) => run(t, () => playSfx(name, opts)),
      jingle: (name, t = 0) => run(t, () => playJingle(name)),
      blip: (voice, t = 0) => run(t, () => { state.lastBlip = -1; playBlip(voice); }),
      footstep: (surface, t = 0) => run(t, () => { lastSfxAt.__foot = undefined; playFootstep(surface); }),
      ambient: (levels, t = 0) => run(t, () => { for (const k of Object.keys(levels)) applyAmbient(k, levels[k]); }),
      duck: (a, sec, t = 0) => run(t, () => duckMusic(a, sec)),
      muffle: (on, t = 0) => run(t, () => { const m = state.muffled; state.muffled = on; applyMuffle(); state.muffled = m; }),
      voice: (inst, midi, dur, vel, t = 0) => run(t, () => VOICES[inst].fn(eng.mDry, t, midi, dur, vel)),
      stats: () => ({ active: eng.active, players: eng.players.length }),
    };
  },
  withContext(ctx, fn) { return fn(__debug.offline(ctx)); },
};
