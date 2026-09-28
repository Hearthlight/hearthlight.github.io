// Trailer recorder: plays the game frame by frame (any speed, same result) and
// records lossless clips through the dev server (POST /__rec → ffmpeg), with
// captions in the game's pixel font, a real phone controller on screen
// (pad.html in an iframe, driven by synthetic touches) and the game's own
// synthesised sound, logged per clip and re-rendered offline in sync.
//   const R = await import('/tools/reel.js');
//   await R.setup();                                   // 1920×1080, English, paused
//   await R.clip('lobby', 4, (f, tm) => { … }, { captions: [{ text: 'Hi!', at: 0.5 }] });
//   await R.soundtrack([{ clip: 'lobby', from: 0, to: 4, at: 0 }], { length: 4 });
// Clips land in screenshots/reel/<name>.mkv (+ <name>.json, the sound log).

import { audio, __debug as AD } from '../src/engine/audio.js';
import { drawText, measure } from '../src/engine/font.js';

const g = () => window.game;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CAP = 4;                  // caption grid: 4 device pixels per pixel (the UI's own at 1080p)

export const R = {
  W: 1920, H: 1080, fps: 30,
  view: { x: 0, y: 0, w: 1920, h: 1080 },   // where the game sits in the frame
  phone: null,                               // the pad iframe and where it's drawn
  captions: [],                              // what the clip says (see drawCaption)
  over: [],                                  // extra painters (ctx, tm) on the caption grid
  after: [],                                 // things to do a little later (a finger lifting)
  log: null, tm: 0, vms: 0,
};

// ------------------------------------------------------------------ setup
function fakeWindow(w, h) {
  const def = (k, v) => Object.defineProperty(window, k, { get: () => v, configurable: true });
  def('innerWidth', w); def('innerHeight', h); def('devicePixelRatio', 1);
}

// the game's own screen size (the rest of the frame is the phone's)
export function size(w = R.W, h = R.H, x = 0, y = 0) {
  fakeWindow(w, h);
  R.view = { x, y, w, h };
  g().display.resize();
}

export async function setup({ lang = 'en' } = {}) {
  for (let i = 0; i < 100 && !(window.game && g().world && g().world.overCol); i++) await sleep(100);
  size();
  g().settings.lang = lang;
  g().applySettings();
  g().debug.pause(true);
  hookAudio();
  return g();
}

// ------------------------------------------------------------------ sound log
const HOOK = ['playMusic', 'sfx', 'jingle', 'blip', 'footstep', 'setAmbient', 'duck', 'muffle'];
function hookAudio() {
  if (audio.__reel) return;
  audio.__reel = true;
  for (const k of HOOK) {
    const orig = audio[k];
    audio[k] = (...a) => {
      if (R.log && !(k === 'playMusic' && a[0] === audio.currentTrack)) R.log.push({ tm: Math.max(0, R.tm), k, a: JSON.parse(JSON.stringify(a)) });
      return orig(...a);
    };
  }
}

// ------------------------------------------------------------------ the phone
// A real controller page in an iframe; its time runs on the recording's clock.
export async function phone(code, { name = 'Alex', look = null, cls = 'knight', fresh = true, s = 2 } = {}) {
  const ls = (k, v) => localStorage.setItem('hlpad.' + k, JSON.stringify(v));
  ls('name', name); ls('lang', 'en'); ls('cls', cls);
  if (look) ls('look', look);
  if (fresh) localStorage.removeItem('hlpad.id');
  if (R.phone) R.phone.fr.remove();
  const fr = document.createElement('iframe');
  const pw = 215 * s / (window.devicePixelRatio || 1), ph = 466 * s / (window.devicePixelRatio || 1);
  fr.style.cssText = `position:absolute;left:-2000px;top:0;width:${Math.round(pw)}px;height:${Math.round(ph)}px;border:0`;
  fr.src = '/pad.html#' + code;
  document.body.appendChild(fr);
  for (let i = 0; i < 100 && !(fr.contentWindow && fr.contentWindow.pad); i++) await sleep(50);
  const win = fr.contentWindow;
  win.performance.now = () => R.vms;
  const cv = win.document.getElementById('pad');
  R.phone = { fr, win, cv, pad: win.pad, s: 2, x: 0, y: 0, touches: new Map(), show: true, side: true };
  placePhone();
  return R.phone;
}

// the phone stands in the panel right of the game's view
export function placePhone() {
  const P = R.phone;
  if (!P) return;
  const pw = P.cv.width * P.s, ph = P.cv.height * P.s;
  const px = R.view.x + R.view.w;
  P.x = Math.round((px + (R.W - px - pw) / 2) / 2) * 2;
  P.y = Math.round((R.H - ph) / 2 / 2) * 2 + 2;
}

function ptr(type, id, x, y) {
  const P = R.phone, dpr = P.win.devicePixelRatio || 1;
  const sc = (parseFloat(P.cv.style.width) * dpr) / P.cv.width;
  P.cv.dispatchEvent(new P.win.PointerEvent('pointer' + type, {
    clientX: (x * sc) / dpr, clientY: (y * sc) / dpr, pointerId: id, bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: id === 1,
  }));
  if (type === 'up') P.touches.set(id, { x, y, up: R.tm });
  else P.touches.set(id, { x, y, down: true, at: R.tm });
}

export const region = (id) => R.phone.pad.regions().find((r) => r.id === id);

// press a button of the phone (by its region id) — lifted `hold` seconds later
export function press(id, hold = 0.12) {
  const r = region(id);
  if (!r) return false;
  const x = r.circle ? r.cx : r.x + r.w / 2, y = r.circle ? r.cy : r.y + r.h / 2;
  ptr('down', 2, x, y);
  R.after.push({ tm: R.tm + hold, fn: () => ptr('up', 2, x, y) });
  return true;
}

// the thumb-stick: a direction (−1…1), or null to let go
export function stick(vx, vy) {
  const P = R.phone, st = P.pad.stick, z = region('stick');
  if (vx === null) { if (st.id !== null) ptr('up', 1, st.x, st.y); return; }
  if (!z) return;
  if (st.id === null) ptr('down', 1, z.x + z.w * 0.5, z.y + z.h * 0.62);
  ptr('move', 1, st.ox + vx * st.r, st.oy + vy * st.r);
}

function drawPhone(o, k) {
  const P = R.phone, px = R.view.x + R.view.w;
  // the panel: night purple with a few stars
  const gr = o.createLinearGradient(0, 0, 0, R.H * k);
  gr.addColorStop(0, '#231a2f'); gr.addColorStop(1, '#130e1b');
  o.fillStyle = gr; o.fillRect(px * k, 0, (R.W - px) * k, R.H * k);
  for (let i = 0; i < 26; i++) {
    const x = px + ((i * 157 + 41) % (R.W - px)), y = (i * 263 + 97) % R.H;
    o.fillStyle = (i + Math.floor(R.tm * 1.3)) % 5 === 0 ? 'rgba(255,243,196,0.7)' : 'rgba(185,162,227,0.3)';
    o.fillRect(Math.round(x / 4) * 4 * k, Math.round(y / 4) * 4 * k, 4 * k, 4 * k);
  }
  if (!P.show) return;
  const sw = P.cv.width * P.s, sh = P.cv.height * P.s, b = 12, top = 30;
  const bx = P.x - b, by = P.y - top, bw = sw + b * 2, bh = sh + top * 2;
  const body = (x, y, w, h, r, col) => {
    o.fillStyle = col;
    for (let j = 0; j < h; j += 2) {
      const dy = j < r ? r - j : j > h - r ? j - (h - r) : 0;
      const inset = dy ? Math.ceil((r - Math.sqrt(Math.max(0, r * r - dy * dy))) / 2) * 2 : 0;
      o.fillRect((x + inset) * k, (y + j) * k, (w - inset * 2) * k, 2 * k);
    }
  };
  body(bx + 8, by + 12, bw, bh, 44, 'rgba(0,0,0,0.3)');
  body(bx - 4, by - 4, bw + 8, bh + 8, 48, '#0b0810');
  body(bx, by, bw, bh, 44, '#3a3048');
  body(bx + 4, by + 4, bw - 8, bh - 8, 40, '#171220');
  o.fillStyle = '#4d4160';
  o.fillRect((bx + 40) * k, (by - 4) * k, (bw - 80) * k, 2 * k);
  // side buttons, speaker & camera
  o.fillStyle = '#2a2236';
  o.fillRect((bx - 8) * k, (by + 150) * k, 4 * k, 60 * k);
  o.fillRect((bx - 8) * k, (by + 230) * k, 4 * k, 60 * k);
  o.fillRect((bx + bw + 4) * k, (by + 190) * k, 4 * k, 90 * k);
  o.fillStyle = '#2c2438'; o.fillRect((bx + bw / 2 - 30) * k, (by + 12) * k, 60 * k, 6 * k);
  o.fillStyle = '#0c0a12'; o.fillRect((bx + bw / 2 + 44) * k, (by + 10) * k, 10 * k, 10 * k);
  o.fillStyle = '#2d3a5a'; o.fillRect((bx + bw / 2 + 46) * k, (by + 12) * k, 4 * k, 4 * k);
  o.fillStyle = '#2c2438'; o.fillRect((bx + bw / 2 - 40) * k, (by + bh - 18) * k, 80 * k, 6 * k);
  o.drawImage(P.cv, P.x * k, P.y * k, sw * k, sh * k);
  // fingers: a soft round mark where the thumbs are
  for (const [id, f] of P.touches) {
    const age = f.down ? 0 : R.tm - f.up;
    if (age > 0.25) { P.touches.delete(id); continue; }
    const a = f.down ? 1 : 1 - age / 0.25;
    const cx = P.x + f.x * P.s, cy = P.y + f.y * P.s, r = f.down ? 22 : 22 + age * 40;
    disc(o, k, cx, cy, r, `rgba(255,255,255,${0.28 * a})`);
    disc(o, k, cx, cy, r * 0.55, `rgba(255,255,255,${0.35 * a})`);
  }
}

function disc(o, k, cx, cy, r, col) {
  o.fillStyle = col;
  for (let y = -r; y < r; y += 2) {
    const w = Math.round(Math.sqrt(Math.max(0, r * r - (y + 1) * (y + 1))) / 2) * 2;
    if (w > 0) o.fillRect(Math.round((cx - w) / 2) * 2 * k, Math.round((cy + y) / 2) * 2 * k, w * 2 * k, 2 * k);
  }
}

// ------------------------------------------------------------------ captions
// { text, sub, at, dur, pos: 'bottom' | 'top' | 'center', y, size, band } on the 4-px grid
export function outlined(ctx, text, x, y, { color = '#fff3c4', edge = '#2a1f33', scale = 2, align = 'center' } = {}) {
  drawText(ctx, text, x, y + 2, { color: 'rgba(20,12,28,0.55)', align, scale });
  for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) drawText(ctx, text, x + ox, y + oy, { color: edge, align, scale });
  drawText(ctx, text, x, y, { color, align, scale });
}

function drawCaption(ctx, c, tm) {
  const k = tm - c.at;
  const dur = c.dur || 99;
  if (k < 0 || k > dur) return;
  // (a caption carried across a montage's cuts: no fade on the inner ones)
  const a = Math.min(1, c.fadeIn === false ? 1 : k / 0.22, c.fadeOut === false ? 1 : (dur - k) / 0.22);
  const rise = c.fadeIn === false ? 0 : Math.round((1 - Math.min(1, k / 0.22)) * 6);
  const cx = c.x != null ? c.x : Math.round((R.view.x + R.view.w / 2) / CAP), sz = c.size || 2;
  const H = R.H / CAP;
  const lineH = 9 * sz, subH = c.sub ? 12 : 0;
  const y = c.y != null ? c.y : c.pos === 'top' ? 12 : c.pos === 'center' ? Math.round(H / 2 - (lineH + subH) / 2) : H - 14 - lineH - subH;
  ctx.globalAlpha = a;
  if (c.band !== false && c.pos !== 'center' && c.y == null) {
    const bh = lineH + subH + 22, by = c.pos === 'top' ? 0 : H - bh;
    const gr = ctx.createLinearGradient(0, by, 0, by + bh);
    const dark = 'rgba(20,14,28,0.62)', clear = 'rgba(20,14,28,0)';
    gr.addColorStop(0, c.pos === 'top' ? dark : clear); gr.addColorStop(1, c.pos === 'top' ? clear : dark);
    ctx.fillStyle = gr; ctx.fillRect(R.view.x / CAP, by, R.view.w / CAP, bh);
  }
  outlined(ctx, c.text, cx, y + rise, { color: c.color || '#fff3c4', scale: sz });
  if (c.sub) outlined(ctx, c.sub, cx, y + lineH + 4 + rise, { color: c.subColor || '#f6d38f', scale: 1 });
  ctx.globalAlpha = 1;
}

// the game's logo: the lantern and "Hearthlight" with its warm glow
export function logo(ctx, cx, y, tm, scale = 4) {
  const a0 = ctx.globalAlpha;
  drawText(ctx, 'Hearthlight', cx + 8, y + 2, { color: 'rgba(20,12,28,0.5)', align: 'center', scale, outline: 'rgba(20,12,28,0.5)' });
  drawText(ctx, 'Hearthlight', cx + 8, y, { color: '#fff3c4', align: 'center', scale, outline: '#3b2a2e' });
  ctx.globalAlpha = a0 * (0.18 + (0.5 + Math.sin(tm * 1.5) * 0.5) * 0.18);
  drawText(ctx, 'Hearthlight', cx + 8, y, { color: '#ffd66b', align: 'center', scale });
  ctx.globalAlpha = a0;
  const lx = Math.round(cx + 8 - measure('Hearthlight', scale) / 2) - 18;
  g().drawLanternIcon(ctx, lx, y + 2, tm);
}

// ------------------------------------------------------------------ compositing
let capCv = null;
function compose(o, div) {
  const d = g().display, V = R.view, k = 1 / div;
  o.imageSmoothingEnabled = false;
  if (V.w < R.W || V.h < R.H) { o.fillStyle = '#14121c'; o.fillRect(0, 0, R.W * k, R.H * k); }
  o.save();
  o.beginPath(); o.rect(V.x * k, V.y * k, V.w * k, V.h * k); o.clip();
  const wx = V.x + (d.devW - d.ww * d.wscale) / 2, wy = V.y + (d.devH - d.wh * d.wscale) / 2;
  o.drawImage(d.worldCanvas, wx * k, wy * k, d.ww * d.wscale * k, d.wh * d.wscale * k);
  const ux = V.x + (d.devW - d.w * d.scale) / 2, uy = V.y + (d.devH - d.h * d.scale) / 2;
  if (!R.hideUi) o.drawImage(d.canvas, ux * k, uy * k, d.w * d.scale * k, d.h * d.scale * k);
  o.restore();
  if (R.phone && R.phone.side) drawPhone(o, k);
  if (!capCv) { capCv = document.createElement('canvas'); capCv.width = R.W / CAP; capCv.height = R.H / CAP; }
  const cc = capCv.getContext('2d');
  cc.imageSmoothingEnabled = false;
  cc.clearRect(0, 0, capCv.width, capCv.height);
  for (const f of R.over) f(cc, R.tm);
  for (const c of R.captions) drawCaption(cc, c, R.tm);
  o.drawImage(capCv, 0, 0, R.W * k, R.H * k);
}

async function post(op, name, q = {}, body = '') {
  const r = await fetch('/__rec?' + new URLSearchParams({ op, name, ...q }), { method: 'POST', body });
  if (!r.ok) throw new Error('reel ' + op + ': ' + (await r.text()));
  return r.text();
}

// Record `seconds` of the game as clip `name`. `each(f, tm)` runs before each
// frame (steer bots, press phone buttons…) and must not step the game itself.
// `div` records at 1/div size (only when every layer's scale divides by it).
export async function clip(name, seconds, each = null, { div = 1, captions = [], over = [], fps = R.fps } = {}) {
  const n = Math.round(seconds * fps), W = R.W / div, H = R.H / div;
  const out = document.createElement('canvas');
  out.width = W; out.height = H;
  const o = out.getContext('2d', { willReadFrequently: true });
  R.captions = captions; R.over = over; R.after = [];
  await post('open', name, { w: W, h: H, fps, up: div });
  R.log = [];
  const t0 = performance.now();
  try {
    for (let f = 0; f < n; f++) {
      R.tm = f / fps;
      for (const a of R.after.filter((x) => x.tm <= R.tm)) { R.after.splice(R.after.indexOf(a), 1); a.fn(); }
      if (each) await each(f, R.tm);
      await sleep(2);
      for (let s = 0; s < 2; s++) {
        R.tm = (f - 1 + (s + 1) / 2) / fps;
        R.vms += 1000 / 60;
        await g().debug.step(1, 1 / 60);
      }
      R.tm = f / fps;
      if (R.phone && R.phone.side) R.phone.pad.draw();
      compose(o, div);
      await post('frame', name, {}, o.getImageData(0, 0, W, H).data);
    }
  } finally {
    await post('close', name);
    await post('save', name + '.json', {}, JSON.stringify({ fps, frames: n, log: R.log }));
    R.log = null; R.captions = []; R.over = [];
  }
  return { frames: n, ms: Math.round((performance.now() - t0) / n) };
}

// a quick look at the frame as it would be recorded (screenshots/<name>.png, half size)
export async function still(name = 'still', div = 2) {
  const out = document.createElement('canvas');
  out.width = R.W / div; out.height = R.H / div;
  if (R.phone && R.phone.side) R.phone.pad.draw();
  compose(out.getContext('2d'), div);
  const blob = await new Promise((r) => out.toBlob(r, 'image/png'));
  return (await fetch('/__shot?name=' + encodeURIComponent(name), { method: 'POST', body: blob })).text();
}

// let the world run without recording (settle a scene, paint new ground…)
export async function run(seconds, each = null) {
  const n = Math.round(seconds * R.fps);
  R.after = R.after || [];
  for (let f = 0; f < n; f++) {
    R.tm += 1 / R.fps;
    for (const a of R.after.filter((x) => x.tm <= R.tm)) { R.after.splice(R.after.indexOf(a), 1); a.fn(); }
    if (each) await each(f, f / R.fps);
    await sleep(f % 10 ? 2 : 30);
    R.vms += 1000 / 30;
    await g().debug.step(2, 1 / 60);
  }
  if (R.phone && R.phone.side) R.phone.pad.draw();
}

// ------------------------------------------------------------------ soundtrack
// Where each shot of an edit list starts in the film (`at`), in whole frames:
// a `fade` overlaps the shot before, anything else is a cut (as tools/reelcut.py).
export function plan(edl) {
  const fps = edl.fps || 30;
  let n = 0;
  edl.shots.forEach((s, i) => {
    const start = Math.max(0, n - (i ? Math.round((s.fade || 0) * fps) : 0));
    s.at = start / fps;
    n = start + Math.round(s.to * fps) - Math.round(s.from * fps);
  });
  edl.length = n / fps;
  return edl;
}

// Re-render the logged sound of an edit offline: `edit` = [{ clip, from, to, at }]
// (clip seconds from…to placed at `at` in the film), over one music track.
export async function soundtrack(edit, { length, music = 'festival', musicAt = 0, file = 'mix.wav', gains = {}, skip = [] } = {}) {
  const logs = {};
  for (const c of edit) if (!logs[c.clip]) logs[c.clip] = await (await fetch(`/screenshots/reel/${c.clip}.json`)).json();
  const sr = 48000, len = length || Math.max(...edit.map((c) => c.at + c.to - c.from));
  const ctx = new OfflineAudioContext(2, Math.ceil(len * sr), sr);
  const vols = ['master', 'music', 'sfx', 'ambient'].map((k) => [k, audio.getVolume(k)]);
  audio.setVolume('master', 1); audio.setVolume('music', 1); audio.setVolume('sfx', 1); audio.setVolume('ambient', 1);
  audio.muffle(false);
  const api = AD.offline(ctx);
  for (const [k, v] of vols) audio.setVolume(k, v);
  const E = api.engine, G = { music: 0.9, sfx: 0.75, ambient: 0.35, ...gains };
  E.mVol.gain.value *= G.music; E.mVolW.gain.value *= G.music;
  E.sVol.gain.value = G.sfx; E.sWet.gain.value = G.sfx;
  E.aVol.gain.value = G.ambient; E.aWet.gain.value = G.ambient;
  const ev = [];
  for (const c of edit) for (const e of logs[c.clip].log) {
    if (e.tm < c.from || e.tm >= c.to || skip.includes(e.k) || e.k === 'muffle') continue;
    if (e.k === 'playMusic' && music) continue;
    ev.push({ ...e, T: c.at + e.tm - c.from });
  }
  ev.sort((a, b) => a.T - b.T);
  let i = 0;
  const play = (e) => {
    const T = e.T, a = e.a;
    if (e.k === 'sfx') api.sfx(a[0], a[1], T);
    else if (e.k === 'jingle') api.jingle(a[0], T);
    else if (e.k === 'blip') api.blip(a[0], T);
    else if (e.k === 'footstep') api.footstep(a[0], T);
    else if (e.k === 'setAmbient') api.ambient(a[0], T);
    else if (e.k === 'duck') api.duck(a[0], a[1], T);
    else if (e.k === 'playMusic') api.music(a[0], (a[1] && a[1].fade) || 1.5, T);
  };
  const STEP = 0.2;
  const upto = (T) => { while (i < ev.length && ev[i].T < T) play(ev[i++]); api.pump(T - STEP, T + 0.4); };
  if (music) api.music(music, 0.05, musicAt);
  upto(STEP);
  for (let T = STEP; T < len; T += STEP) {
    const at = T;
    ctx.suspend(at).then(() => { upto(at + STEP); ctx.resume(); });
  }
  const buf = await ctx.startRendering();
  const wav = toWav(buf);
  await post('save', file, {}, wav);
  return { seconds: len, events: ev.length, peak: peak(buf) };
}

function peak(buf) {
  let m = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > m) m = v; } }
  return Math.round(m * 1000) / 1000;
}

function toWav(buf) {
  const n = buf.length, ch = buf.numberOfChannels, out = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const str = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); out.setUint32(4, 36 + n * ch * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true);
  out.setUint32(24, buf.sampleRate, true); out.setUint32(28, buf.sampleRate * ch * 2, true);
  out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true); str(36, 'data'); out.setUint32(40, n * ch * 2, true);
  const data = [...Array(ch)].map((_, c) => buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const v = Math.max(-1, Math.min(1, data[c][i])); out.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2; }
  return out.buffer;
}
