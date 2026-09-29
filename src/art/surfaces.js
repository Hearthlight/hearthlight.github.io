// Pixel-art surface painters for 3D models (facades, roofs, planks, signs…).
// Everything is painted at 16 texels per world unit so it lines up with the
// ground and the oblique camera shows it 1 texel = 1 pixel.

import { makeCanvas } from '../engine/gfx.js';
import { ramp, mix } from '../engine/color.js';
import { rng, hash2 } from '../engine/util.js';

export const TX = 16;

export class Painter {
  constructor(w, h) {
    this.c = makeCanvas(w, h);
    this.ctx = this.c.ctx;
    this.w = w; this.h = h;
  }
  px(x, y, col) { if (!col) return; this.ctx.fillStyle = col; this.ctx.fillRect(x | 0, y | 0, 1, 1); }
  rect(x, y, w, h, col) { if (!col || w <= 0 || h <= 0) return; this.ctx.fillStyle = col; this.ctx.fillRect(x | 0, y | 0, w | 0, h | 0); }
  hline(x, y, w, col) { this.rect(x, y, w, 1, col); }
  vline(x, y, h, col) { this.rect(x, y, 1, h, col); }
  clear(x, y, w, h) { this.ctx.clearRect(x, y, w, h); }
  grid(rows, map, ox = 0, oy = 0) {
    rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const col = map[row[i]]; if (col) this.px(ox + i, oy + j, col); } });
  }
}

// ---------------------------------------------------------------------------
// Wall materials
// ---------------------------------------------------------------------------
const WALLS = {
  plaster: { base: '#f1e2c4' },
  timber: { base: '#f4e6c8', beam: '#6b4330' },
  brick: { base: '#b8634c' },
  stone: { base: '#b9b0a8' },
  boards: { base: '#8fb7d6' },
  logs: { base: '#a8744a' },
};

export function wallFill(p, x0, y0, w, h, kind, style = {}, seed = 1) {
  const r = rng(seed);
  const base = style.wallColor || WALLS[kind]?.base || '#f1e2c4';
  const R = ramp(base);
  if (kind === 'brick') {
    p.rect(x0, y0, w, h, R.d);
    for (let y = 0; y < h; y += 4) {
      const off = (y / 4) % 2 ? 4 : 0;
      for (let x = -off; x < w; x += 8) {
        const v = hash2(x + x0 * 7, y + y0 * 3, seed);
        const col = v < 0.2 ? R.l : v > 0.85 ? R.d : R.m;
        p.rect(x0 + Math.max(0, x), y0 + y, Math.min(7, x + 7) - Math.max(0, x) + (x < 0 ? 0 : 0), 3, col);
        p.hline(x0 + Math.max(0, x), y0 + y, Math.min(7, w - x), v < 0.2 ? R.h : R.l);
      }
    }
  } else if (kind === 'stone') {
    p.rect(x0, y0, w, h, R.o);
    let y = 0, row = 0;
    while (y < h) {
      const rh = 4 + (row % 2);
      let x = -((row * 3) % 5);
      while (x < w) {
        const bw = 5 + Math.floor(r() * 5);
        const v = r();
        const col = v < 0.3 ? R.l : v > 0.8 ? R.d : R.m;
        const xs = Math.max(0, x), xe = Math.min(w, x + bw - 1);
        p.rect(x0 + xs, y0 + y, xe - xs, rh - 1, col);
        p.hline(x0 + xs, y0 + y, xe - xs, R.h);
        if (xe - xs > 1) p.px(x0 + xe - 1, y0 + y + rh - 2, R.d);
        x += bw;
      }
      y += rh; row++;
    }
  } else if (kind === 'boards') {
    for (let y = 0; y < h; y++) {
      const k = y % 3;
      p.hline(x0, y0 + y, w, k === 0 ? R.l : k === 2 ? R.d : R.m);
    }
    for (let i = 0; i < w * h * 0.02; i++) p.px(x0 + r() * w, y0 + r() * h, R.d);
  } else if (kind === 'logs') {
    for (let y = 0; y < h; y++) {
      const k = y % 4;
      p.hline(x0, y0 + y, w, k === 0 ? R.h : k === 1 ? R.l : k === 2 ? R.m : R.o);
    }
    for (let i = 0; i < w * h * 0.03; i++) p.px(x0 + r() * w, y0 + ((r() * h) & ~3) + 2, R.d);
  } else {
    // plaster / timber base
    p.rect(x0, y0, w, h, R.m);
    for (let i = 0; i < w * h * 0.05; i++) p.px(x0 + r() * w, y0 + r() * h, r() < 0.5 ? R.l : mix(R.m, R.d, 0.5));
    if (kind === 'timber' && !style.noBeam) {
      const beam = style.trim || WALLS.timber.beam;
      const B = ramp(beam);
      p.hline(x0, y0 + Math.floor(h * 0.42), w, B.m);
      p.hline(x0, y0 + Math.floor(h * 0.42) + 1, w, B.o);
    }
  }
}

// ---------------------------------------------------------------------------
// Facade: front wall with door & windows. Returns color + glow canvases.
// ---------------------------------------------------------------------------
export function paintFacade({ wTiles, hPx, kind = 'plaster', style = {}, doorX = null, seed = 7, windows = null, sign = null }) {
  const W = Math.round(wTiles * TX), H = hPx;
  const p = new Painter(W, H);
  const glow = new Painter(W, H);
  glow.rect(0, 0, W, H, '#000000');
  const trim = style.trim || '#6b4330';
  const T = ramp(trim);
  const two = style.storeys === 2;
  wallFill(p, 0, 0, W, H, kind, kind === 'timber' ? { ...style, noBeam: true } : style, seed);
  // (where the door & windows go: a timber frame is built round them)
  const dbl = style.doorKind === 'double';
  const dw = dbl ? 14 : 12, dh = Math.min(21, H - 5);
  const doorRect = doorX !== null ? { x: Math.round(doorX * TX) + (dbl ? 1 : 2), y: H - 3 - dh, w: dw, h: dh } : null;
  const winW = 10, winH = 9;
  // one row of windows under the eave; a house of two storeys has a row on each floor
  const wy = two ? H - 24 : Math.max(3, Math.floor(H * 0.2));
  const wyUp = two ? Math.max(4, Math.floor(H * 0.13)) : null;
  const slots = windows || autoWindows(W, doorRect, winW);
  const slotsUp = two ? (style.upWindows || evenWindows(W, winW)) : [];
  if (kind === 'timber') timberFrame(p, W, H, T, doorRect, slots, winW, wy + winH + 1, two ? { y: wyUp, slots: slotsUp, floor: wy - 5 } : null);
  // between the floors: a string course of the trim colour
  if (two && kind !== 'timber' && kind !== 'logs') { p.rect(0, wy - 5, W, 2, T.m); p.hline(0, wy - 4, W, T.d); p.hline(0, wy - 3, W, 'rgba(40,20,40,0.18)'); }
  // rain-splash grime along the foot of the wall
  p.rect(0, H - 6, W, 3, 'rgba(70,45,55,0.12)');

  // foundation
  const F = ramp('#8f8a93');
  p.rect(0, H - 3, W, 3, F.m);
  p.hline(0, H - 3, W, F.l);
  p.hline(0, H - 1, W, F.d);
  for (let x = 2; x < W; x += 6) p.vline(x, H - 2, 1, F.d);

  // corner posts / timber frame
  if (kind === 'timber' || kind === 'plaster' || kind === 'boards') {
    p.rect(0, 0, 2, H - 3, T.m); p.vline(1, 0, H - 3, T.d);
    p.rect(W - 2, 0, 2, H - 3, T.m); p.vline(W - 1, 0, H - 3, T.d);
  }
  if (kind === 'stone' || kind === 'brick') {
    // dressed quoins up the corners
    const Q = ramp(kind === 'brick' ? '#d8cfc4' : '#cfc8c2');
    for (let y = 0, k = 0; y < H - 4; y += 4, k++) for (const cx of [0, W - (k % 2 ? 3 : 5)]) { p.rect(cx, y, k % 2 ? 3 : 5, 3, Q.m); p.hline(cx, y, k % 2 ? 3 : 5, Q.l); }
  }
  if (kind === 'logs') {
    // log ends at the corners
    for (let y = 1; y < H - 4; y += 4) {
      for (const cx of [0, W - 3]) {
        p.rect(cx, y, 3, 3, '#d9b07a'); p.px(cx + 1, y + 1, '#a8744a'); p.px(cx, y, '#6b4330'); p.px(cx + 2, y + 2, '#6b4330');
      }
    }
  }
  // eave shadow
  p.hline(0, 0, W, 'rgba(40,20,40,0.45)');
  p.hline(0, 1, W, 'rgba(40,20,40,0.2)');

  // door
  let door = null;
  if (doorRect) {
    const dx = doorRect.x, dy = doorRect.y;
    door = doorRect;
    const D = ramp(style.doorColor || '#8e5d3e');
    // frame
    p.rect(dx - 1, dy - 1, dw + 2, dh + 1, T.o);
    p.rect(dx, dy, dw, dh, D.m);
    for (let x = dx + 2; x < dx + dw; x += 3) p.vline(x, dy + 1, dh - 1, D.d);
    p.hline(dx, dy, dw, D.l);
    if (style.round || style.arched) {
      p.px(dx, dy, T.o); p.px(dx + dw - 1, dy, T.o); p.px(dx + 1, dy, T.o); p.px(dx + dw - 2, dy, T.o);
      p.px(dx, dy + 1, T.o); p.px(dx + dw - 1, dy + 1, T.o);
    }
    if (dbl) {
      // two leaves, a fanlight over them, two knobs
      p.vline(dx + dw / 2, dy + 1, dh - 1, T.o);
      p.rect(dx + 2, dy + 2, dw - 4, 3, '#9ccbe8'); p.hline(dx + 2, dy + 2, dw - 4, '#e8f6ff');
      for (let x = dx + 4; x < dx + dw - 2; x += 3) p.px(x, dy + 3, D.d);
      glow.rect(dx + 2, dy + 2, dw - 4, 3, '#ffcf7a');
      p.px(dx + dw / 2 - 2, dy + Math.floor(dh / 2) + 1, '#f2c14e'); p.px(dx + dw / 2 + 1, dy + Math.floor(dh / 2) + 1, '#f2c14e');
    } else {
      // little window in door
      p.rect(dx + 4, dy + 4, 4, 4, '#9ccbe8');
      p.px(dx + 4, dy + 4, '#e8f6ff');
      p.hline(dx + 4, dy + 6, 4, D.d); p.vline(dx + 6, dy + 4, 4, D.d);
      glow.rect(dx + 4, dy + 4, 4, 4, '#ffcf7a');
      // knob
      p.px(dx + dw - 3, dy + Math.floor(dh / 2) + 1, '#f2c14e');
      p.px(dx + dw - 3, dy + Math.floor(dh / 2) + 2, '#b8862a');
    }
  }

  // windows (evenly spread, avoiding the door)
  const wins = [];
  for (const wx of slots) {
    paintWindow(p, glow, wx, wy, winW, winH, T, style);
    wins.push({ x: wx, y: wy, w: winW, h: winH });
  }
  for (const wx of slotsUp) {
    paintWindow(p, glow, wx, wyUp, winW, winH, T, { ...style, flowerbox: style.flowerbox || style.upFlowers });
    wins.push({ x: wx, y: wyUp, w: winW, h: winH });
  }

  // sign board above the door
  if (sign && door) {
    const sw = 14, sh = 7;
    const sx = door.x + door.w / 2 - sw / 2, sy = Math.max(1, door.y - sh - 1);
    p.rect(sx, sy, sw, sh, '#4a2e25');
    p.rect(sx + 1, sy + 1, sw - 2, sh - 2, '#e9cf9b');
    p.hline(sx + 1, sy + 1, sw - 2, '#fff1c9');
    drawIcon(p, sign, sx + sw / 2 - 2, sy + 1);
  }
  return { color: p.c, glow: glow.c, door, windows: wins };
}

// an upper floor's windows: evenly along the whole wall (nothing below to avoid)
function evenWindows(W, winW) {
  const n = Math.max(2, Math.round(W / 30));
  const out = [];
  for (let i = 0; i < n; i++) out.push(Math.round(((i + 0.5) / n) * W - winW / 2));
  return out.filter((x) => x > 3 && x + winW < W - 3);
}

// Half-timbering: a rail under the eave and one at sill height, posts at the corners and on
// both sides of every window & the door, braces slanting across the panels below the sills
function timberFrame(p, W, H, B, door, slots, winW, sillY, up = null) {
  const top = up ? up.floor : 2, bot = H - 3;
  if (up) {
    // the upper floor: a rail under the eave, one at its floor, posts round its windows
    p.rect(0, 2, W, 2, B.m); p.hline(0, 3, W, B.d);
    const us = [0, W - 2];
    for (const wx of up.slots) us.push(wx - 3, wx + winW + 1);
    for (const x of us) { p.rect(x, 2, 2, top - 2, B.m); p.vline(x + 1, 2, top - 2, B.d); }
    p.rect(0, up.y + 10, W, 2, B.m);
  }
  p.rect(0, top, W, 2, B.m); p.hline(0, top + 1, W, B.d);
  p.rect(0, sillY, W, 2, B.m); p.hline(0, sillY + 1, W, B.d);
  const xs = [0, W - 2];
  for (const wx of slots) xs.push(wx - 3, wx + winW + 1);
  if (door) xs.push(door.x - 3, door.x + door.w + 1);
  xs.sort((a, b) => a - b);
  for (const x of xs) { p.rect(x, top, 2, bot - top, B.m); p.vline(x + 1, top, bot - top, B.d); }
  for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i] + 2, b = xs[i + 1], n = b - a;
    if (n < 7 || (door && a >= door.x - 2 && b <= door.x + door.w + 2)) continue;
    const y0 = sillY + 2, y1 = bot - 2;
    for (let k = 0; k < n; k++) {
      const y = Math.round(y0 + (k / Math.max(1, n - 1)) * (y1 - y0));
      p.rect(i % 2 ? a + k : b - 1 - k, y, 1, 2, k % 2 ? B.d : B.m);
    }
  }
}

function autoWindows(W, door, winW) {
  const out = [];
  const free = (x) => !door || x + winW + 3 < door.x || x > door.x + door.w + 3;
  const n = Math.max(1, Math.floor(W / 28));
  const step = W / (n + 1);
  for (let i = 1; i <= n + 1; i++) {
    const x = Math.round(step * i - winW / 2);
    if (x > 3 && x + winW < W - 3 && free(x)) out.push(x);
  }
  if (!out.length) {
    for (const x of [5, W - winW - 5]) if (free(x)) out.push(x);
  }
  // de-duplicate overlapping
  return out.filter((x, i) => i === 0 || x - out[i - 1] > winW + 2);
}

export function paintWindow(p, glow, x, y, w, h, T, style = {}) {
  const shutter = style.shutter;
  if (shutter) {
    const S = ramp(shutter);
    for (const sx of [x - 3, x + w]) {
      p.rect(sx, y, 3, h, S.m);
      for (let j = 1; j < h; j += 2) p.hline(sx, y + j, 3, S.d);
      p.vline(sx, y, h, S.o);
    }
  }
  // (an arched window: its top corners filled back with the wall behind, a keystone over it)
  const behind = style.arched ? [...p.ctx.getImageData(x - 2, y - 2, 1, 1).data] : null;
  p.rect(x - 1, y - 1, w + 2, h + 2, T.o);
  p.rect(x, y, w, h, '#5c7fa8');
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const d = i + j;
      p.px(x + i, y + j, d < 4 ? '#bfe3f2' : d < 7 ? '#8cc0de' : '#6b9cc4');
    }
  }
  p.px(x + 1, y + 1, '#ffffff');
  p.px(x + 2, y + 1, '#e8f6ff');
  p.px(x + 1, y + 2, '#e8f6ff');
  if (behind) {
    const wc = `rgb(${behind[0]},${behind[1]},${behind[2]})`;
    for (const [dx, dy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [w - 2, -1], [w - 1, -1], [w, -1], [w, 0]]) p.px(x + dx, y + dy, wc);
    p.px(x, y, T.o); p.px(x + 1, y - 1, T.o); p.px(x + w - 1, y, T.o); p.px(x + w - 2, y - 1, T.o);
    p.rect(x + Math.floor(w / 2) - 1, y - 2, 2, 2, T.l);
  }
  // mullions
  p.vline(x + Math.floor(w / 2), y, h, T.m);
  p.hline(x, y + Math.floor(h / 2), w, T.m);
  // sill
  p.rect(x - 2, y + h + 1, w + 4, 1, T.l);
  // curtains
  if (style.curtain) {
    const C = ramp(style.curtain);
    p.vline(x, y, h, C.m); p.vline(x + 1, y, h - 2, C.l);
    p.vline(x + w - 1, y, h, C.m); p.vline(x + w - 2, y, h - 2, C.l);
  }
  glow.rect(x, y, w, h, '#ffc76a');
  if (behind) { glow.px(x, y, '#000000'); glow.px(x + w - 1, y, '#000000'); }
  glow.px(x + 1, y + 1, '#fff0b8');
  glow.vline(x + Math.floor(w / 2), y, h, '#6b4a20');
  glow.hline(x, y + Math.floor(h / 2), w, '#6b4a20');
  // flower box
  if (style.flowerbox) {
    const fb = ramp('#8e5d3e');
    p.rect(x - 1, y + h + 2, w + 2, 3, fb.m);
    p.hline(x - 1, y + h + 2, w + 2, fb.l);
    p.hline(x - 1, y + h + 4, w + 2, fb.o);
    const cols = ['#f4a4b6', '#ffd66b', '#ec5f73', '#fff8ec', '#b9a2e3'];
    for (let i = 0; i < w + 2; i += 2) {
      p.px(x - 1 + i, y + h + 1, '#5fa453');
      p.px(x - 1 + i + (i % 4 ? 0 : 1), y + h + 1 - (i % 3 ? 1 : 0), cols[(i + x) % cols.length]);
    }
  }
}

// Tiny 5x5 icons for signs
const ICONS = {
  bread: ['.ooo.', 'obbbo', 'obBbo', 'obbbo', '.ooo.'],
  fish: ['.....', 'o.oo.', 'oobbo', 'o.oo.', '.....'],
  cup: ['.o.o.', 'ooooo', 'obbbo', 'obbboo', '.ooo.'],
  book: ['oo.oo', 'obobo', 'obobo', 'obobo', 'oo.oo'],
  leaf: ['...oo', '.oobo', 'obbo.', 'obo..', 'o....'],
  hammer: ['ooooo', 'ooooo', '..o..', '..o..', '..o..'],
  star: ['..o..', 'ooooo', '.ooo.', '.o.o.', '.....'],
  heart: ['.o.o.', 'ooooo', 'ooooo', '.ooo.', '..o..'],
  anchor: ['..o..', '.ooo.', '..o..', 'o.o.o', '.ooo.'],
};
const ICON_COL = {
  bread: { o: '#8a5234', b: '#e0a45a', B: '#f6d38f' },
  fish: { o: '#2f5f9e', b: '#7cb6e0' },
  cup: { o: '#5a3b2a', b: '#f4efe4' },
  book: { o: '#3f7f7c', b: '#f4efe4' },
  leaf: { o: '#2f6b45', b: '#7fbf5a' },
  hammer: { o: '#5a4a5a', b: '#8e5d3e' },
  star: { o: '#e0a526' },
  heart: { o: '#ec5f73' },
  anchor: { o: '#384675' },
};
export function drawIcon(p, name, x, y) {
  const g = ICONS[name];
  if (!g) return;
  p.grid(g, ICON_COL[name] || { o: '#3b2a2e', b: '#fff' }, Math.round(x), Math.round(y));
}

// ---------------------------------------------------------------------------
// Roofs: a slope of wT x hT texels (its projected size), the ridge at the top.
// kinds: shingle · scallop (fish scales) · tile (clay barrel tiles) · slate · shakes (split
// wood) · thatch · tin (corrugated). Every piece gets its own shade, courses are laid from
// the eave up (each one overlapping the one below), moss gathers low down.
// ---------------------------------------------------------------------------
export function paintRoof(wT, hT, color, { seed = 3, kind = 'shingle', ridge = true, eave = true, moss = 1 } = {}) {
  const p = new Painter(wT, hT);
  const R = ramp(color);
  const r = rng(seed);
  const tints = [R.m, R.m, R.m, mix(R.m, R.l, 0.45), mix(R.m, R.d, 0.4), mix(R.m, R.h, 0.25), mix(R.m, R.d, 0.2)];
  const pick = () => tints[Math.floor(r() * tints.length)];
  p.rect(0, 0, wT, hT, R.m);
  (ROOFS[kind] || ROOFS.shingle)(p, wT, hT, R, r, pick);
  // sunlight just under the ridge, shade toward the eave
  for (let y = 0; y < hT; y++) {
    const t = y / hT;
    if (t < 0.2) p.rect(0, y, wT, 1, `rgba(255,244,214,${((0.2 - t) * 0.4).toFixed(3)})`);
    else if (t > 0.64) p.rect(0, y, wT, 1, `rgba(40,20,50,${((t - 0.64) * 0.38).toFixed(3)})`);
  }
  // moss in little clumps, mostly low down where the rain runs off
  if (moss && kind !== 'tin') {
    const n = Math.round((wT * hT) / 900 * moss) + 1;
    for (let i = 0; i < n; i++) {
      const cx = Math.floor(r() * wT), cy = Math.floor(hT * (0.4 + r() * 0.52)), s = 2 + Math.floor(r() * 3);
      for (let k = 0; k < s * 3; k++) {
        const v = r();
        p.px(cx + Math.round((r() - 0.5) * s * 2), cy + Math.round((r() - 0.5) * s * 0.8), v < 0.25 ? '#a3c46a' : v < 0.65 ? '#7a9a55' : '#5f7f45');
      }
    }
  }
  if (ridge) { p.hline(0, 0, wT, R.o); p.hline(0, 1, wT, R.d); }
  if (eave) { p.hline(0, hT - 2, wT, mix(R.o, R.d, 0.5)); p.hline(0, hT - 1, wT, R.o); }
  return p.c;
}

// (courses from the eave up: the one above is painted last, over the top of the one below)
function courses(hT, rowH) { const out = []; for (let y = 0, row = 0; y < hT; y += rowH, row++) out.push([y, row]); return out.reverse(); }

const ROOFS = {
  shingle(p, w, h, R, r, pick) {
    const rowH = 4;
    for (const [y, row] of courses(h, rowH)) {
      let x = -((row * 3) % 7);
      while (x < w) {
        const sw = 5 + Math.floor(r() * 3), c = pick();
        p.rect(x, y, sw, rowH, c);
        p.hline(x + 1, y, sw - 1, mix(c, R.l, 0.55));          // its top catches the light
        p.vline(x, y, rowH, R.d);                               // the gap to its neighbour
        if (r() < 0.12) p.px(x + 1 + Math.floor(r() * (sw - 2)), y + 1, R.h);
        p.hline(x, y + rowH - 1, sw, mix(c, R.o, 0.65));        // its lower edge, in shadow
        x += sw;
      }
    }
  },
  scallop(p, w, h, R, r, pick) {
    // fish scales: rounded tabs, each one's tip hanging over the joint of the two below it
    const rowH = 4, sw = 8;
    const S = ['cccccccc', 'chlccccd', 'dlcccccd', 'odccccdo', '.oddddo.'];
    for (const [y, row] of courses(h, rowH)) {
      for (let x = -(row % 2) * 4; x < w; x += sw) {
        const c = pick();
        p.grid(S, { c, h: mix(c, R.h, 0.55), l: mix(c, R.l, 0.5), d: mix(c, R.d, 0.6), o: R.o }, x, y);
      }
    }
  },
  tile(p, w, h, R, r, pick) {
    // clay barrel tiles: a column of rounded backs, troughs between them, rows overlapping
    const rowH = 5, cw = 5;
    for (const [y] of courses(h, rowH)) {
      for (let x = 0; x < w; x += cw) {
        const c = pick();
        p.rect(x, y, cw, rowH, c);
        p.vline(x, y, rowH, mix(c, R.o, 0.55));               // the trough
        p.vline(x + 1, y, rowH - 1, mix(c, R.l, 0.5));
        p.vline(x + 2, y, rowH - 2, mix(c, R.h, 0.5));        // the rounded back in the sun
        p.vline(x + 4, y, rowH, mix(c, R.d, 0.4));
        p.hline(x + 1, y + rowH - 1, 3, mix(c, R.d, 0.5));    // its lower lip
        p.px(x, y + rowH - 1, R.o);
      }
    }
  },
  slate(p, w, h, R, r, pick) {
    const rowH = 4;
    for (const [y, row] of courses(h, rowH)) {
      let x = -((row * 4) % 8);
      while (x < w) {
        const sw = 6 + Math.floor(r() * 3);
        const c = r() < 0.3 ? mix(pick(), '#7c8494', 0.14) : pick();
        p.rect(x, y, sw, rowH, c);
        p.hline(x + 1, y, sw - 1, mix(c, R.l, 0.35));
        p.vline(x, y, rowH, R.d);
        if (r() < 0.22) p.px(x + 1, y + rowH - 2, mix(c, R.h, 0.55));    // a chipped corner
        p.hline(x, y + rowH - 1, sw, mix(c, R.o, 0.6));
        x += sw;
      }
    }
  },
  shakes(p, w, h, R, r, pick) {
    // split wood: narrow, uneven, greying in the weather, a grain line down each
    const rowH = 5, grey = '#8f8a86';
    for (const [y] of courses(h, rowH)) {
      let x = -Math.floor(r() * 4);
      while (x < w) {
        const sw = 3 + Math.floor(r() * 4), len = rowH + (r() < 0.35 ? 1 : 0);
        const c = mix(pick(), grey, r() * 0.22);
        p.rect(x, y, sw, len, c);
        p.vline(x, y, len, R.o);
        if (sw > 3) p.vline(x + 1 + Math.floor(r() * (sw - 2)), y + 1, len - 2, mix(c, R.d, 0.45));
        p.px(x + 1, y, mix(c, R.l, 0.6));
        p.hline(x, y + len - 1, sw, mix(c, R.o, 0.55));
        x += sw;
      }
    }
  },
  thatch(p, w, h, R, r) {
    // straw combed down the slope in short strands, greying with age lower down
    const old = mix(R.m, '#8d7f68', 0.55), oldD = mix(R.d, '#6f6452', 0.5);
    for (let x = 0; x < w; x++) {
      let y = -Math.floor(r() * 4);
      while (y < h) {
        const len = 2 + Math.floor(r() * 4), v = r(), aged = r() < (y / h) * 0.55;
        p.vline(x, y, len, aged ? (v < 0.45 ? oldD : old) : v < 0.3 ? R.d : v < 0.72 ? R.m : v < 0.95 ? R.l : R.h);
        y += len;
      }
    }
    // laid in thick courses: a soft shadowed line where each one overlaps the next
    for (let y = 9; y < h - 5; y += 9) {
      for (let x = 0; x < w; x++) {
        if (hash2(x, y, 4) < 0.18) continue;
        p.px(x, y + Math.floor(hash2(x >> 2, y, 5) * 2), mix(R.d, R.o, 0.35));
      }
    }
    // a thick, clipped edge along the eave
    p.rect(0, h - 4, w, 4, oldD);
    for (let x = 0; x < w; x++) { p.px(x, h - 4, hash2(x, 1, 7) < 0.5 ? R.m : old); if (hash2(x, 2, 7) < 0.35) p.px(x, h - 3, old); }
  },
  tin(p, w, h, R, r) {
    // corrugated sheets: ridges down the slope, overlaps with screws, a little rust
    for (let x = 0; x < w; x++) p.vline(x, 0, h, [R.h, R.l, R.m, R.d][x % 4]);
    for (let y = 15; y < h - 3; y += 16) {
      p.hline(0, y, w, R.o); p.hline(0, y + 1, w, R.h);
      for (let x = 1; x < w; x += 8) p.px(x, y - 1, R.o);
    }
    const rust = mix(R.m, '#a8583a', 0.5);
    for (let i = 0; i < w / 6; i++) { const x = Math.floor(r() * w), y = Math.floor(r() * h); p.vline(x, y, 2 + Math.floor(r() * 6), rust); }
  },
};

// Plain wall strip (sides / gables)
export function paintWall(wT, hT, kind, style = {}, seed = 5, { foundation = true } = {}) {
  const p = new Painter(wT, hT);
  wallFill(p, 0, 0, wT, hT, kind, style, seed);
  if (foundation) {
    const F = ramp('#8f8a93');
    p.rect(0, hT - 3, wT, 3, F.m); p.hline(0, hT - 3, wT, F.l); p.hline(0, hT - 1, wT, F.d);
  }
  if (kind === 'timber' || kind === 'plaster' || kind === 'boards') {
    const T = ramp(style.trim || '#6b4330');
    p.rect(0, 0, 2, hT - (foundation ? 3 : 0), T.m); p.rect(wT - 2, 0, 2, hT - (foundation ? 3 : 0), T.d);
  }
  return p.c;
}

// Wooden planks (top view) — dir 'h' = planks run east-west
export function paintPlanks(wT, hT, { dir = 'h', seed = 9, color = '#b07b50' } = {}) {
  const p = new Painter(wT, hT);
  const R = ramp(color);
  const r = rng(seed);
  const along = dir === 'h' ? wT : hT, across = dir === 'h' ? hT : wT;
  for (let a = 0; a < across; a++) {
    const plank = Math.floor(a / 4), k = a % 4;
    const base = hash2(plank, 1, seed) < 0.5 ? R.m : R.l;
    const col = k === 3 ? R.o : k === 0 ? (base === R.m ? R.l : R.h) : base;
    if (dir === 'h') p.hline(0, a, along, col); else p.vline(a, 0, along, col);
    if (k === 3) continue;
    const seamOff = Math.floor(hash2(plank, 3, seed) * 20);
    for (let s = seamOff % 24; s < along; s += 24) {
      if (dir === 'h') { p.px(s, a, R.d); if (k === 1) { p.px(s + 2, a, R.o); p.px(s - 2, a, R.o); } }
      else { p.px(a, s, R.d); if (k === 1) { p.px(a, s + 2, R.o); p.px(a, s - 2, R.o); } }
    }
    for (let i = 0; i < along * 0.025; i++) {
      const s = Math.floor(r() * along);
      if (dir === 'h') p.px(s, a, R.d); else p.px(a, s, R.d);
    }
  }
  return p.c;
}

// Generic tiny wood / bark texture
export function paintWood(wT, hT, color = '#8e5d3e', { vertical = true, seed = 4 } = {}) {
  const p = new Painter(wT, hT);
  const R = ramp(color);
  const r = rng(seed);
  p.rect(0, 0, wT, hT, R.m);
  for (let i = 0; i < (vertical ? wT : hT); i += 3) {
    if (vertical) p.vline(i, 0, hT, R.d); else p.hline(0, i, wT, R.d);
  }
  for (let i = 0; i < wT * hT * 0.08; i++) p.px(r() * wT, r() * hT, r() < 0.5 ? R.l : R.o);
  return p.c;
}

export function paintNoise(wT, hT, colors, density = 0.3, seed = 2) {
  const p = new Painter(wT, hT);
  const r = rng(seed);
  p.rect(0, 0, wT, hT, colors[1] || colors[0]);
  for (let i = 0; i < wT * hT * density; i++) {
    p.px(r() * wT, r() * hT, colors[Math.floor(r() * colors.length)]);
  }
  return p.c;
}

// Striped awning texture (projected), scalloped bottom edge (transparent)
export function paintAwning(wT, hT, c1, c2) {
  const p = new Painter(wT, hT);
  const A = ramp(c1), B = ramp(c2);
  for (let x = 0; x < wT; x++) {
    const stripe = Math.floor(x / 4) % 2 === 0;
    const R = stripe ? A : B;
    for (let y = 0; y < hT - 2; y++) p.px(x, y, y === 0 ? R.l : y < 2 ? R.m : R.m);
    p.px(x, hT - 3, R.d);
    // scallops
    const s = x % 4;
    if (s === 1 || s === 2) { p.px(x, hT - 2, R.d); p.px(x, hT - 1, R.o); }
    else p.px(x, hT - 2, R.o);
  }
  // shading gradient
  for (let y = 0; y < hT - 3; y++) if (y > (hT - 3) * 0.6) p.rect(0, y, wT, 1, 'rgba(60,20,50,0.12)');
  return p.c;
}
