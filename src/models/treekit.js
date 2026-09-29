// Tree recipes shared by the valley (models/nature.js) and the big world (world/big/objects3d.js):
// broadleaf trees (oak, apple, cherry, maples, the big oak) and palms, as a list of parts each
// builder turns into its own instanced meshes.
// The camera looks down at 45° and draws heights 1:1, so a ball of leaves comes out 1.4 times
// taller than wide: a crown is a wide dome of flattened tufts (round on screen), set high enough
// on a trunk with roots and a fork to show it.

import { pixelTexture } from '../render/r3d.js';
import { Painter } from '../art/surfaces.js';
import { ramp } from '../engine/color.js';
import { rng } from '../engine/util.js';

// crown centre height, spread, tuft size (tree units; a tree is scaled after)
const CROWN = {
  oak: { H: 1.95, R: 1.0, r: 0.5, low: 7, mid: 4 },
  apple: { H: 1.8, R: 0.92, r: 0.48, low: 6, mid: 4 },
  cherry: { H: 1.95, R: 1.02, r: 0.5, low: 7, mid: 4 },
  maple: { H: 2.0, R: 1.0, r: 0.52, low: 7, mid: 4 },
  big: { H: 3.5, R: 2.0, r: 0.9, low: 9, mid: 6 },
};
const FLAT_Y = 0.64, FLAT_Z = 0.84;          // a tuft: round on screen at 45°

// emit(part, x, y, z, sx, sy, sz, ry, rx, rz, tint) — parts: trunk, root, branch, tuft, fruit
export function broadleaf(kind, x, z, seed, sc, emit, { fruit = false } = {}) {
  const C = CROWN[kind] || CROWN.oak, r = rng(Math.floor(seed * 1e6) + 7);
  const H = C.H, R = C.R, big = kind === 'big';
  // the trunk, its roots and a fork disappearing into the crown
  const tw = (big ? 0.7 : 0.36) * sc;
  emit('trunk', x, 0, z, tw, (H - 0.25) * sc, tw, r() * 6, 0, 0);
  // (a root starts on the ground a little way out and climbs back into the trunk)
  const ra = r() * Math.PI * 2, rl = (big ? 0.62 : 0.36) * sc;
  for (let i = 0; i < 3; i++) {
    const a = ra + i * 2.1 + r() * 0.5, out = rl * 0.87 * 0.85;
    emit('root', x + Math.cos(a) * out, 0, z - Math.sin(a) * out, tw * 0.5, rl, tw * 0.5, a, 0, 1.05);
  }
  for (const side of [-1, 1]) emit('branch', x + side * 0.05 * sc, (H - 0.95) * sc, z, tw * 0.42, 0.78 * sc, tw * 0.42, r() * 0.8 - 0.4, 0, side * -0.55);
  // tufts: a low ring, a middle ring and a top — lighter up top, darker underneath
  const tufts = [];
  // (uneven rings — heights & spreads jittered — so the crown doesn't come out in tiers)
  const ring = (n, d, y, rad, off, dy = 0.24) => {
    for (let i = 0; i < n; i++) {
      const a = off + (i / n) * Math.PI * 2 + (r() - 0.5) * 0.6, dd = d * (0.8 + r() * 0.35);
      tufts.push({ x: Math.cos(a) * dd, y: y + (r() - 0.5) * dy, z: Math.sin(a) * dd * 0.78, r: rad * (0.86 + r() * 0.3) });
    }
  };
  ring(C.low, R * 0.74, H - 0.16, C.r, r() * 6);
  ring(C.mid, R * 0.4, H + 0.14, C.r * 1.08, r() * 6, 0.3);
  tufts.push({ x: (r() - 0.5) * 0.3, y: H + 0.4, z: -0.1, r: C.r * 1.05 });
  if (big) ring(4, R * 0.5, H + 0.5, C.r * 0.8, r() * 6);
  let lo = Infinity, hi = -Infinity;
  for (const f of tufts) { const v = f.y - f.z; lo = Math.min(lo, v); hi = Math.max(hi, v); }
  for (const f of tufts) {
    const k = (f.y - f.z - lo) / Math.max(0.01, hi - lo);          // 0 at the bottom of the crown, 1 at its top
    const tint = [0.8 + k * 0.28, 0.84 + k * 0.22, 0.9 + k * 0.08];
    emit('tuft', x + f.x * sc, f.y * sc, z + f.z * sc, f.r * sc, f.r * FLAT_Y * sc, f.r * FLAT_Z * sc, r() * 6, 0, 0, tint);
  }
  // apples on the tufts that face you
  if (fruit) {
    for (const f of tufts) {
      if (f.z < -0.05 || r() < 0.25) continue;
      const a = (r() - 0.5) * 2.2;
      emit('fruit', x + (f.x + Math.sin(a) * f.r * 0.75) * sc, (f.y - f.r * 0.15) * sc, z + (f.z + Math.cos(a) * f.r * FLAT_Z * 0.9) * sc, 0.15 * sc, 0.15 * sc, 0.15 * sc, a, 0, 0);
    }
  }
  return tufts.length;
}

// emit(part, …) — parts: ptrunk, pring, frond, coco
export function palm(x, z, seed, emit) {
  const r = rng(Math.floor(seed * 1e6) + 11);
  // (leaning left or right, rather than at you: that's how a palm reads best from up here)
  const lean = (r() < 0.5 ? 0 : Math.PI) + (r() - 0.5) * 1.1, bend = 0.16 + r() * 0.12;
  const lx = Math.cos(lean), lz = Math.sin(lean);
  let px = 0, py = 0, tilt = 0.05;
  for (let i = 0; i < 7; i++) {
    const len = 0.42, rad = 0.3 - i * 0.022;
    tilt += bend * 0.16;
    // (a segment leans the way the trunk bends, a little more at each ring)
    emit(i % 2 ? 'pring' : 'ptrunk', x + px * lx, py, z + px * lz, rad, len + 0.02, rad, -lean, 0, -tilt);
    px += Math.sin(tilt) * len; py += Math.cos(tilt) * len;
  }
  const tx = x + px * lx, tz = z + px * lz, ty = py;
  for (let i = 0; i < 3; i++) { const a = i * 2.1 + r(); emit('coco', tx + Math.cos(a) * 0.12, ty - 0.12, tz + Math.sin(a) * 0.1, 0.12, 0.12, 0.12, 0, 0, 0); }
  // fronds: three pieces each, rising then arching down; a few young ones stand up in the middle
  const n = 8, off = r() * 6;
  const frond = (a, pitches, lens, wides, tint, y0 = ty + 0.04) => {
    let fx = tx, fy = y0, fz = tz;
    pitches.forEach((p, k) => {
      const dx = Math.cos(p) * Math.cos(a), dy = Math.sin(p), dz = Math.cos(p) * Math.sin(a), L = lens[k];
      emit('frond', fx + dx * L / 2, fy + dy * L / 2, fz + dz * L / 2, L + 0.04, 0.05, wides[k], -a, 0, p, tint);
      fx += dx * L; fy += dy * L; fz += dz * L;
    });
  };
  for (let i = 0; i < n; i++) {
    const a = off + (i / n) * Math.PI * 2 + (r() - 0.5) * 0.3, t = i % 2 ? 1.04 : 0.86;
    const s = 0.9 + r() * 0.25;
    frond(a, [0.42, -0.08, -0.62], [0.42 * s, 0.46 * s, 0.4 * s], [0.26, 0.32, 0.2], [t * 0.98, t, t * 0.94]);
  }
  for (let i = 0; i < 3; i++) frond(off + i * 2.1 + 0.5, [1.05, 0.45], [0.3, 0.3], [0.18, 0.14], [1.12, 1.1, 1.0], ty + 0.06);
}

// ------------------------------------------------------------------ textures
// leaves in tufts: little rounded clumps, lit on top with a shadow line under each —
// (blossom: white & pale flowers scattered over the pink)
export function leafTexture(color, seed, { blossom = false } = {}) {
  const R = ramp(color), P = new Painter(24, 24), r = rng(seed);
  P.rect(0, 0, 24, 24, R.m);
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(r() * 24), y = Math.floor(r() * 24), w = 3 + Math.floor(r() * 2);
    for (let k = 0; k < w; k++) P.px((x + k) % 24, (y + 2) % 24, R.d);       // under the clump
    for (let k = 1; k < w - 1; k++) P.px((x + k) % 24, y, R.l);             // its lit top
    P.px((x + 1) % 24, (y + 1) % 24, R.l);
    if (r() < 0.35) P.px((x + 1) % 24, y, R.h);
  }
  if (blossom) {
    for (let i = 0; i < 22; i++) {
      const x = Math.floor(r() * 24), y = Math.floor(r() * 24);
      P.px(x, y, r() < 0.5 ? '#fff4f7' : R.h);
      if (r() < 0.4) P.px((x + 1) % 24, y, '#ffe3ec');
    }
  }
  const t = pixelTexture(P.c, { repeat: true });
  t.repeat.set(3, 2);
  return t;
}

// a palm frond, seen from above: a pale midrib and leaflets combed back to a toothed edge
export function palmTexture() {
  const P = new Painter(24, 12);
  const R = ramp('#5fae5a');
  for (let x = 0; x < 24; x++) {
    for (let y = 0; y < 12; y++) {
      const e = Math.abs(y - 5.5);                                   // distance from the midrib
      const tooth = (x + Math.round(e)) % 4 === 0;                  // gaps between leaflets, slanting back
      if (e > 4.5 && (x + y) % 3 === 0) continue;                    // a ragged edge
      P.px(x, y, e < 1 ? R.h : tooth ? R.d : e > 3.5 ? R.l : R.m);
    }
  }
  return pixelTexture(P.c);
}
