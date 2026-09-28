// Procedural pixel-art terrain painter (async, memory-conscious).
// Tiles are upsampled with a bilinear "influence field" (+ a little noise per
// terrain) so borders become rounded & organic instead of blocky, then each
// pixel is textured, edges get lips/shadows, water gets depth & banks, rock
// plateaus get cliff faces, and small decals are stamped on top.
// Output: the full ImageData (split into chunk canvases by the caller) and a
// compact per-pixel water info buffer used by the animated water shader.

import { TT, TINFO, TILE } from '../world/tiles.js';
import { T } from './palette.js';
import { hexToRgb } from '../engine/color.js';
import { valueNoise, fbm, hash2, bayer } from '../engine/util.js';

const RGB = (hex) => hexToRgb(hex);
const R = (arr) => arr.map(RGB);

const C = {
  grass: R(T.grass),
  meadow: R(T.meadow),
  forest: R(['#2c5a40', '#356b45', '#3f7a4a', '#4f8c50', '#62a058']),
  path: R(T.path),
  plaza: R(T.plaza),
  sand: R(T.sand),
  wetSand: R(['#a88a5c', '#b99a68', '#c9aa77']),
  water: R(T.water),
  soil: R(T.soil),
  field: R(['#5a3b28', '#6e4a32', '#80583a', '#c9a44e', '#e0bf62']),
  rock: R(T.rock),
  cliff: R(T.cliff),
  earth: R(['#4d3326', '#6a4631', '#7f563b']),
  moss: R(['#5b7a45', '#6f9150']),
  stair: R(['#6a6571', '#8a858e', '#aaa5aa']),
  snow: R(['#8f9cc0', '#b8c6e2', '#dde6f4', '#f1f5fc', '#ffffff']),
  ice: R(['#5f8fc0', '#86b2dc', '#a9cdec', '#cfe6f7', '#f4fbff']),
  leaves: R(['#5a3e2a', '#8a4a2a', '#b85f30', '#d9853a', '#eab150']),
  marsh: R(['#34502f', '#44613a', '#577343', '#6f8a4c', '#8ea25e']),
  petals: R(['#f7b8d0', '#fbd8e6', '#e98fb2']),
};

const HARD = new Set([TT.SOIL, TT.FIELD]);
const UNDER = { [TT.SOIL]: TT.GRASS, [TT.FIELD]: TT.GRASS };
// yield to the browser between heavy passes (MessageChannel isn't throttled
// like setTimeout chains are in background tabs)
const chan = typeof MessageChannel !== 'undefined' ? new MessageChannel() : null;
const waiting = [];
if (chan) chan.port1.onmessage = () => { const r = waiting.shift(); if (r) r(); };
const yieldFrame = () => new Promise((r) => { if (chan) { waiting.push(r); chan.port2.postMessage(0); } else setTimeout(r, 0); });

// Smooth noise sampled on a coarse grid (every 4 px) and interpolated —
// visually identical for large-scale variation, ~16x cheaper.
function makeField(PW, PH, scale, seed, octaves = 3) {
  const S = 4;
  const gw = Math.ceil(PW / S) + 2, gh = Math.ceil(PH / S) + 2;
  const f = new Float32Array(gw * gh);
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) f[y * gw + x] = fbm((x * S) / scale, (y * S) / scale, seed, octaves);
  return (px, py) => {
    const gx = px / S, gy = py / S;
    const x0 = gx | 0, y0 = gy | 0, fx = gx - x0, fy = gy - y0;
    const i = y0 * gw + x0;
    const a = f[i], b = f[i + 1], c = f[i + gw], d = f[i + gw + 1];
    return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
  };
}

export async function renderTerrain(map, onProgress = () => {}) {
  const { w, h, ground } = map;
  const PW = w * TILE, PH = h * TILE;
  const N = PW * PH;
  const types = new Uint8Array(N);

  const tileAt = (x, y) => {
    x = x < 0 ? 0 : x >= w ? w - 1 : x;
    y = y < 0 ? 0 : y >= h ? h - 1 : y;
    return ground[y * w + x];
  };
  const soft = (t) => (t === TT.PLANK_H || t === TT.PLANK_V ? TT.WATER : HARD.has(t) ? UNDER[t] : t);

  // ---------- Pass 1: terrain type per pixel ----------
  const score = new Float32Array(32);
  for (let py = 0; py < PH; py++) {
    const v = py / TILE - 0.5, j0 = Math.floor(v), fy = v - j0;
    const tyOwn = (py / TILE) | 0;
    for (let px = 0; px < PW; px++) {
      const own = ground[tyOwn * w + ((px / TILE) | 0)];
      if (HARD.has(own)) { types[py * PW + px] = own; continue; }
      if (own === TT.PLANK_H || own === TT.PLANK_V) { types[py * PW + px] = TT.WATER; continue; }
      const u = px / TILE - 0.5, i0 = Math.floor(u), fx = u - i0;
      const a = soft(tileAt(i0, j0)), b = soft(tileAt(i0 + 1, j0));
      const c = soft(tileAt(i0, j0 + 1)), d = soft(tileAt(i0 + 1, j0 + 1));
      if (a === b && a === c && a === d) { types[py * PW + px] = a; continue; }
      score[a] = 0; score[b] = 0; score[c] = 0; score[d] = 0;
      score[a] += (1 - fx) * (1 - fy);
      score[b] += fx * (1 - fy);
      score[c] += (1 - fx) * fy;
      score[d] += fx * fy;
      let best = a, bestS = -9;
      for (const t of [a, b, c, d]) {
        const info = TINFO[t];
        const n = info.noise ? (valueNoise(px * 0.19 + t * 31.7, py * 0.19 + t * 17.3, 5) - 0.5) * 2 * info.noise : 0;
        const s = score[t] + n + info.prio * 0.0005;
        if (s > bestS) { bestS = s; best = t; }
      }
      types[py * PW + px] = best;
    }
    if ((py & 127) === 127) { onProgress(0.05 + 0.2 * (py / PH)); await yieldFrame(); }
  }

  const typeAt = (x, y) => {
    x = x < 0 ? 0 : x >= PW ? PW - 1 : x;
    y = y < 0 ? 0 : y >= PH ? PH - 1 : y;
    return types[y * PW + x];
  };
  const isWater = (t) => t === TT.WATER;
  const H = (t) => TINFO[t].height;

  // ---------- Pass 2: distances (integer chamfer, clamped) ----------
  onProgress(0.26); await yieldFrame();
  const dLand = chamfer16(PW, PH, (i) => !isWater(types[i]));       // units: px*3
  onProgress(0.34); await yieldFrame();
  const landAbove = new Uint8Array(N);
  const landAboveType = new Uint8Array(N);
  const rockAbove = new Uint8Array(N);
  for (let px = 0; px < PW; px++) {
    let lastLand = -999, lastT = 0, lastRock = -999;
    for (let py = 0; py < PH; py++) {
      const i = py * PW + px;
      const t = types[i];
      if (t === TT.ROCK || t === TT.HILL) lastRock = py;
      else { const k = py - lastRock; rockAbove[i] = k > 255 ? 255 : k; }
      if (!isWater(t)) { lastLand = py; lastT = t; continue; }
      const k = py - lastLand;
      landAbove[i] = k > 255 ? 255 : k;
      landAboveType[i] = lastT;
    }
  }
  onProgress(0.4); await yieldFrame();

  // Water info for the shader (R: distance to land in px, G: bank/cliff flag)
  const waterInfo = new Uint8Array(N * 2);
  for (let i = 0; i < N; i++) {
    if (!isWater(types[i])) continue;
    const d = Math.round(dLand[i] / 3);
    waterInfo[i * 2] = d > 255 ? 255 : d < 1 ? 1 : d;
    const la = landAbove[i], lt = landAboveType[i];
    const bank = ((lt === TT.ROCK || lt === TT.HILL) && la <= 13) || (la <= 4 && lt !== TT.WATER && lt !== TT.SAND) || (lt === TT.SAND && la <= 2);
    waterInfo[i * 2 + 1] = bank ? 255 : 0;
  }
  // wet sand needs distance to water: compute after water shading reads dLand
  onProgress(0.44); await yieldFrame();

  // ---------- noise fields ----------
  const F = {
    grass: makeField(PW, PH, 64, 8), meadow: makeField(PW, PH, 64, 15), forest: makeField(PW, PH, 64, 22),
    path: makeField(PW, PH, 26, 32), sand: makeField(PW, PH, 40, 52), rock: makeField(PW, PH, 18, 81), moss: makeField(PW, PH, 24, 84),
  };

  const CELL = 7;
  const cellOf = (px, py) => {
    const cx = Math.floor(px / CELL), cy = Math.floor(py / CELL);
    let best = 1e9, second = 1e9, id = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const gx = cx + i, gy = cy + j;
      const ox = (gy & 1) * 0.5;
      const fx = (gx + ox + 0.2 + hash2(gx, gy, 11) * 0.6) * CELL;
      const fy = (gy + 0.2 + hash2(gx, gy, 12) * 0.6) * CELL;
      const dd = (px + 0.5 - fx) ** 2 * 0.8 + (py + 0.5 - fy) ** 2;
      if (dd < best) { second = best; best = dd; id = (gy * 4096 + gx) >>> 0; }
      else if (dd < second) second = dd;
    }
    return [id, Math.sqrt(second) - Math.sqrt(best)];
  };

  // ---------- Pass 3a: water colours (needs dLand) ----------
  const img = new ImageData(PW, PH);
  const D = img.data;
  const put = (i, rgb) => { const o = i * 4; D[o] = rgb[0]; D[o + 1] = rgb[1]; D[o + 2] = rgb[2]; D[o + 3] = 255; };
  for (let py = 0; py < PH; py++) {
    for (let px = 0; px < PW; px++) {
      const i = py * PW + px;
      if (types[i] !== TT.WATER) continue;
      const dith = bayer(px, py) - 0.5;
      const la = landAbove[i], lt = landAboveType[i];
      const dl = dLand[i] / 3;
      let col;
      if (lt === TT.ROCK && la <= 13) {
        const k = la;
        const band = ((k + ((hash2(px >> 2, 0, 21) * 3) | 0)) % 4);
        col = k >= 12 ? C.water[0] : band === 0 ? C.cliff[1] : k > 8 ? C.cliff[1] : k < 3 ? C.cliff[3] : C.cliff[2];
        if (hash2(px, py >> 2, 22) < 0.06 && k > 2 && k < 11) col = C.cliff[0];
        if (k === 1) col = C.cliff[4];
      } else if ((lt === TT.GRASS || lt === TT.MEADOW || lt === TT.FOREST || lt === TT.PATH || lt === TT.FIELD) && la <= 4) {
        col = la === 1 ? C.earth[2] : la === 2 ? C.earth[1] : la === 3 ? C.earth[0] : C.water[1];
      } else if (lt === TT.SAND && la <= 2) {
        col = la === 1 ? C.wetSand[0] : C.water[2];
      } else {
        const dd = dl + dith * 3;
        col = dd < 3 ? C.water[4] : dd < 7 ? C.water[3] : dd < 16 ? C.water[2] : dd < 30 ? C.water[1] : C.water[0];
        if (dl > 6 && valueNoise(px * 0.08, py * 0.3, 44) > 0.78 && ((px + py * 3) & 7) < 3) col = dd < 16 ? C.water[3] : C.water[2];
      }
      put(i, col);
    }
  }
  // distance to water (reuses the dLand buffer)
  const dWater = chamfer16(PW, PH, (i) => isWater(types[i]), dLand);
  onProgress(0.5); await yieldFrame();

  // ---------- Pass 3b: land colours ----------
  for (let py = 0; py < PH; py++) {
    for (let px = 0; px < PW; px++) {
      const i = py * PW + px;
      const t = types[i];
      if (t === TT.WATER) continue;
      const dith = bayer(px, py) - 0.5;
      let col;
      const up = typeAt(px, py - 1), dn = typeAt(px, py + 1), lf = typeAt(px - 1, py), rt = typeAt(px + 1, py);
      const up2 = typeAt(px, py - 2);
      const lowerBelow = H(dn) < H(t) && dn !== t;
      const higherAbove = H(up) > H(t) || (H(up2) > H(t) && up2 !== t && t !== TT.PLAZA);
      const sideLower = (H(lf) < H(t) && lf !== t) || (H(rt) < H(t) && rt !== t);

      // cliff faces below rock plateaus (paths become little stairs)
      const ra = rockAbove[i];
      if (t !== TT.ROCK && t !== TT.HILL && ra <= 10) {
        if (t === TT.PATH) {
          const k = ra % 3;
          put(i, k === 0 ? C.stair[2] : k === 1 ? C.stair[1] : C.stair[0]);
        } else {
          const band = ((ra + ((hash2(px >> 2, 1, 23) * 3) | 0)) % 4);
          col = ra >= 9 ? C.earth[0] : band === 0 ? C.cliff[1] : ra < 3 ? C.cliff[3] : C.cliff[2];
          if (hash2(px, py >> 2, 24) < 0.05 && ra > 2 && ra < 9) col = C.cliff[0];
          if (ra === 1) col = C.cliff[4];
          put(i, col);
        }
        continue;
      }

      switch (t) {
        case TT.GRASS: case TT.MEADOW: case TT.FOREST: {
          const P = t === TT.GRASS ? C.grass : t === TT.MEADOW ? C.meadow : C.forest;
          const patch = (t === TT.GRASS ? F.grass : t === TT.MEADOW ? F.meadow : F.forest)(px, py) + (hash2(px >> 2, py >> 2, 9) - 0.5) * 0.02;
          let lvl = 2;
          if (patch > 0.61) lvl = 3;
          else if (patch < 0.36) lvl = 1;
          const sp = hash2(px, py, t * 13 + 5);
          if (sp < 0.018) lvl -= 1;
          else if (sp > 0.985) lvl += 1;
          col = P[lvl < 0 ? 0 : lvl > 4 ? 4 : lvl];
          if (lowerBelow) col = isWater(dn) ? P[0] : P[1];
          else if (sideLower && isWater(lf === t ? rt : lf)) col = P[1];
          break;
        }
        case TT.PATH: {
          const vv = F.path(px, py) * 0.85 + hash2(px >> 1, py >> 1, 31) * 0.15 + dith * 0.08;
          col = vv < 0.33 ? C.path[1] : vv < 0.62 ? C.path[2] : C.path[3];
          if (higherAbove) col = C.path[0];
          else if (H(lf) > H(t) || H(rt) > H(t)) col = C.path[1];
          else if (lowerBelow) col = C.path[1];
          const hh = hash2(px, py, 33);
          if (hh < 0.012) col = C.path[0];
          else if (hh < 0.02) col = C.path[4];
          break;
        }
        case TT.PLAZA: {
          const [id, e] = cellOf(px, py);
          if (e < 1.15) col = C.plaza[1];
          else {
            const hv = hash2(id, 7, 41);
            col = hv < 0.25 ? C.plaza[2] : hv < 0.85 ? C.plaza[3] : C.plaza[4];
            const [idU, eU] = cellOf(px, py - 1), [idL, eL] = cellOf(px - 1, py);
            const [idD, eD] = cellOf(px, py + 1), [idR, eR] = cellOf(px + 1, py);
            if ((idU !== id && eU < 1.15) || (idL !== id && eL < 1.15)) col = C.plaza[4];
            else if ((idD !== id && eD < 1.15) || (idR !== id && eR < 1.15)) col = C.plaza[2];
          }
          if (up !== TT.PLAZA || dn !== TT.PLAZA || lf !== TT.PLAZA || rt !== TT.PLAZA) col = C.plaza[0];
          break;
        }
        case TT.SAND: {
          const dw = dWater[i] / 3;
          const vv = F.sand(px, py) * 0.8 + hash2(px >> 2, py >> 2, 51) * 0.2 + dith * 0.14;
          col = vv < 0.4 ? C.sand[1] : vv < 0.72 ? C.sand[2] : C.sand[3];
          if (dw < 5 + dith * 3) col = dw < 2.5 ? C.wetSand[0] : C.wetSand[1];
          else if (dw < 8 + dith * 3) col = C.wetSand[2];
          const hh = hash2(px, py, 53);
          if (hh < 0.01) col = C.sand[0];
          else if (hh < 0.02) col = C.sand[4];
          if (higherAbove && H(up) >= 2) col = C.sand[0];
          break;
        }
        case TT.SOIL: {
          const ly = py % TILE;
          const furrow = ly % 4 === 3;
          const vv = hash2(px >> 2, py >> 2, 71) + dith * 0.2;
          col = furrow ? C.soil[1] : vv < 0.45 ? C.soil[2] : C.soil[3];
          if (ly % 4 === 0 && !furrow) col = C.soil[3];
          if (hash2(px, py, 72) < 0.03) col = C.soil[4];
          const tx = (px / TILE) | 0, ty = (py / TILE) | 0;
          const tU = ground[(((py - 1) / TILE) | 0) * w + tx];
          const tL = ground[ty * w + (((px - 1) / TILE) | 0)];
          const tR = ground[ty * w + (((px + 1) / TILE) | 0)];
          const tD = ground[(((py + 1) / TILE) | 0) * w + tx];
          if (tU !== TT.SOIL) col = C.soil[0];
          else if (tL !== TT.SOIL || tR !== TT.SOIL) col = C.soil[1];
          else if (tD !== TT.SOIL) col = C.soil[4];
          break;
        }
        case TT.FIELD: {
          const ly = py % 6;
          col = ly === 5 ? C.field[0] : ly === 4 ? C.field[1] : ly === 0 ? C.field[3] : C.field[2];
          if (ly < 3 && hash2(px, py, 75) < 0.3) col = C.field[4];
          break;
        }
        case TT.SNOW: {
          // soft drifts with cool blue hollows and the odd glint
          const vv = F.meadow(px, py) * 0.85 + hash2(px, py >> 1, 111) * 0.08 + dith * 0.08;
          col = vv < 0.4 ? C.snow[2] : vv < 0.62 ? C.snow[3] : C.snow[4];
          const hh = hash2(px, py, 113);
          if (hh < 0.018) col = C.snow[1];
          if (lowerBelow) col = isWater(dn) ? C.snow[0] : C.snow[1];
          else if (sideLower) col = C.snow[2];
          if (higherAbove) col = C.snow[1];
          break;
        }
        case TT.ICE: {
          const vv = F.sand(px, py) * 0.6 + hash2(px >> 3, py >> 1, 121) * 0.4;
          col = vv < 0.35 ? C.ice[1] : vv < 0.7 ? C.ice[2] : C.ice[3];
          if (((px + py * 2) % 23) === 0 && hash2(px >> 3, py >> 3, 122) < 0.5) col = C.ice[4];
          if (Math.abs(valueNoise(px / 9, py / 9, 123) - 0.5) < 0.012) col = C.ice[0];
          if (higherAbove) col = C.ice[0];
          else if (up !== t && H(up) >= H(t)) col = C.ice[1];
          break;
        }
        case TT.LEAVES: {
          // a carpet of fallen maple leaves
          const patch = F.forest(px, py), earth = F.path(px, py);
          const hh = hash2(px, py, 131);
          col = patch > 0.55 ? C.leaves[2] : patch < 0.4 ? C.leaves[1] : C.leaves[2];
          if (hh < 0.22) col = C.leaves[3];
          else if (hh < 0.27) col = C.leaves[4];
          else if (hh > 0.965) col = C.leaves[0];
          // bare earth & the last green grass showing through in places
          if (earth > 0.66 && hh > 0.3) col = hh > 0.7 ? C.earth[1] : C.earth[2];
          else if (earth < 0.3 && hh > 0.55) col = hh > 0.85 ? C.forest[3] : C.forest[2];
          if (lowerBelow) col = C.leaves[0];
          break;
        }
        case TT.MARSH: {
          const vv = F.grass(px, py) * 0.8 + hash2(px >> 2, py >> 2, 141) * 0.2 + dith * 0.1;
          col = vv < 0.38 ? C.marsh[1] : vv < 0.62 ? C.marsh[2] : C.marsh[3];
          if (hash2(px, py, 142) < 0.02) col = C.marsh[4];
          if (lowerBelow) col = isWater(dn) ? C.marsh[0] : C.marsh[1];
          if (higherAbove) col = C.marsh[0];
          break;
        }
        case TT.PETALS: {
          const P = C.meadow;
          const patch = F.meadow(px, py);
          col = P[patch > 0.6 ? 3 : patch < 0.36 ? 1 : 2];
          const hh = hash2(px, py, 151);
          if (hh < 0.07) col = C.petals[0]; else if (hh < 0.095) col = C.petals[1]; else if (hh < 0.1) col = C.petals[2];
          if (lowerBelow) col = isWater(dn) ? P[0] : P[1];
          break;
        }
        case TT.HILL: {
          // meadow grass on a raised plateau, with a sunlit rim
          const P = C.meadow;
          const patch = F.meadow(px, py) + (hash2(px >> 2, py >> 2, 91) - 0.5) * 0.02;
          let lvl = patch > 0.58 ? 3 : patch < 0.38 ? 2 : 2;
          const sp = hash2(px, py, 93);
          if (sp < 0.02) lvl -= 1; else if (sp > 0.982) lvl += 1;
          col = P[lvl < 0 ? 0 : lvl > 4 ? 4 : lvl];
          if (lowerBelow) col = C.rock[4];
          else if (H(up) < H(t) && up !== t) col = P[4];
          else if (sideLower) col = P[1];
          break;
        }
        case TT.ROCK: {
          const vv = F.rock(px, py) * 0.8 + hash2(px >> 2, py >> 2, 82) * 0.2 + dith * 0.12;
          col = vv < 0.38 ? C.rock[1] : vv < 0.62 ? C.rock[2] : C.rock[3];
          if (Math.abs(valueNoise(px / 11, py / 11, 83) - 0.5) < 0.018) col = C.rock[0];
          const moss = F.moss(px, py);
          if (moss > 0.64) col = moss > 0.7 ? C.moss[1] : C.moss[0];
          if (hash2(px, py, 85) < 0.012) col = C.rock[4];
          if (lowerBelow) col = C.rock[4];
          else if (H(up) < H(t) && up !== t) col = C.rock[3];
          break;
        }
        default:
          col = [255, 0, 255];
      }
      put(i, col);
    }
    if ((py & 63) === 63) { onProgress(0.5 + 0.42 * (py / PH)); await yieldFrame(); }
  }

  // ---------- Pass 4: decals ----------
  stampDecals(D, PW, PH, types, w, h, ground, rockAbove);
  onProgress(0.95);
  return { img, waterInfo, types, PW, PH };
}

// Two-pass chamfer distance transform with integer 3-4 weights (Uint16, clamped).
function chamfer16(W, H, isSrc, reuse = null) {
  const MAX = 65000;
  const d = reuse && reuse.length === W * H ? reuse : new Uint16Array(W * H);
  for (let i = 0; i < W * H; i++) d[i] = isSrc(i) ? 0 : MAX;
  for (let y = 0; y < H; y++) {
    const r = y * W;
    for (let x = 0; x < W; x++) {
      const i = r + x;
      let v = d[i];
      if (v === 0) continue;
      if (x > 0 && d[i - 1] + 3 < v) v = d[i - 1] + 3;
      if (y > 0) {
        if (d[i - W] + 3 < v) v = d[i - W] + 3;
        if (x > 0 && d[i - W - 1] + 4 < v) v = d[i - W - 1] + 4;
        if (x < W - 1 && d[i - W + 1] + 4 < v) v = d[i - W + 1] + 4;
      }
      d[i] = v;
    }
  }
  for (let y = H - 1; y >= 0; y--) {
    const r = y * W;
    for (let x = W - 1; x >= 0; x--) {
      const i = r + x;
      let v = d[i];
      if (v === 0) continue;
      if (x < W - 1 && d[i + 1] + 3 < v) v = d[i + 1] + 3;
      if (y < H - 1) {
        if (d[i + W] + 3 < v) v = d[i + W] + 3;
        if (x < W - 1 && d[i + W + 1] + 4 < v) v = d[i + W + 1] + 4;
        if (x > 0 && d[i + W - 1] + 4 < v) v = d[i + W - 1] + 4;
      }
      d[i] = v;
    }
  }
  return d;
}

// ---------- Decals ----------
const DECALS = {
  tuftA: ['l...l', 'm.l.m', '.mam.'],
  tuftB: ['.l.', 'lml', 'mam'],
  tuftC: ['l.l..l', 'm.m.lm', '.a.am.'],
  tuftD: ['m.m', '.a.'],
  tuftE: ['..l', 'l.m', 'mam'],
  tuftF: ['l.l', 'mlm', '.a.'],
  flowerW: ['.w.', 'wyw', '.w.'],
  flowerP: ['.p.', 'pyp', '.p.'],
  flowerB: ['.b.', 'byb', '.b.'],
  flowerY: ['.y.', 'yoy', '.y.'],
  bud: ['p.', 'm.'],
  dotW: ['w'],
  dotP: ['p'],
  dotY: ['y'],
  clover: ['.c.', 'cmc', '.c.'],
  pebble: ['l.', 'dd'],
  pebble2: ['.l', 'dd', '.d'],
  shell: ['.q.', 'qrq'],
  star: ['.o.', 'ooo', 'o.o'],
  leaf: ['.o', 'oO'],
  twig: ['t..', '.tt'],
  mush: ['rrr', 'wsw', '.s.'],
  fern: ['l.l.l', '.mmm.', '..a..'],
  puddle: ['.bb.', 'bwbb', '.bb.'],
  petal: ['p.', '.p'],
};

function stampDecals(D, PW, PH, types, w, h, ground, rockAbove) {
  const pal = {
    grass: { a: '#356e46', m: '#4b8a4c', l: '#94cc66', w: '#fff8ec', y: '#ffd66b', p: '#f4a4b6', b: '#8fc8f0', o: '#e8883a', c: '#4f9150' },
    meadow: { a: '#44804a', m: '#5a9a50', l: '#b0dc7a', w: '#fffdf4', y: '#ffe07a', p: '#f7a9c4', b: '#9fd0f5', o: '#f0934a', c: '#5a9a52' },
    forest: { a: '#234a36', m: '#2f6243', l: '#5f9a55', o: '#b8743a', O: '#8a4f2a', t: '#6b4330', r: '#d9594c', w: '#fff3e0', s: '#e9dcc8' },
    path: { l: '#e0c595', d: '#7a5a3c' },
    sand: { q: '#f7d6c9', r: '#e3a896', o: '#ef9a6b', l: '#fff4d8', d: '#b99a68' },
    rock: { l: '#c9c4c4', d: '#6a6571' },
    snow: { l: '#ffffff', d: '#8f9cc0', m: '#7f9a78', a: '#5f7a60' },
    marsh: { l: '#a8b070', m: '#6f8a4c', a: '#3f5a3a', b: '#6f9cc8', w: '#eef6e0', y: '#e8d06a', p: '#d9a0c0' },
    petals: { a: '#44804a', m: '#5a9a50', l: '#b0dc7a', w: '#fff4f8', y: '#ffe07a', p: '#f7a9c4', b: '#9fd0f5', o: '#f0934a', c: '#5a9a52' },
  };
  const leafPal = [{ o: '#d9543c', O: '#9a3a28' }, { o: '#e8883a', O: '#b85f30' }, { o: '#f0c050', O: '#c8903a' }, { o: '#c8453a', O: '#8a3028' }];
  const put = (x, y, hex) => {
    if (x < 0 || y < 0 || x >= PW || y >= PH) return;
    const o = (y * PW + x) * 4;
    const n = parseInt(hex.slice(1), 16);
    D[o] = (n >> 16) & 255; D[o + 1] = (n >> 8) & 255; D[o + 2] = n & 255;
  };
  const fits = (x, y, pat, t) => {
    for (let j = -1; j <= pat.length; j++) for (let i = -1; i <= pat[0].length; i++) {
      const xx = x + i, yy = y + j;
      if (xx < 0 || yy < 0 || xx >= PW || yy >= PH) return false;
      const k = yy * PW + xx;
      if (types[k] !== t || (t !== TT.ROCK && t !== TT.HILL && rockAbove[k] <= 11)) return false;
    }
    return true;
  };
  const stamp = (x, y, name, p, t) => {
    const pat = DECALS[name];
    if (!fits(x, y, pat, t)) return;
    pat.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] !== '.' && p[row[i]]) put(x + i, y + j, p[row[i]]); });
  };
  const TUFTS = ['tuftA', 'tuftB', 'tuftC', 'tuftD', 'tuftE', 'tuftF'];
  for (let ty = 0; ty < h; ty++) for (let tx = 0; tx < w; tx++) {
    const t = ground[ty * w + tx];
    const bx = tx * TILE, by = ty * TILE;
    const r = (k) => hash2(tx, ty, 100 + k);
    const at = (k) => [bx + Math.floor(r(k * 2) * 12) + 1, by + Math.floor(r(k * 2 + 1) * 12) + 1];
    if (t === TT.GRASS) {
      if (r(1) < 0.8) { const [x, y] = at(1); stamp(x, y, TUFTS[Math.floor(r(2) * 6)], pal.grass, t); }
      if (r(3) < 0.45) { const [x, y] = at(2); stamp(x, y, TUFTS[Math.floor(r(4) * 6)], pal.grass, t); }
      if (r(7) < 0.12) { const [x, y] = at(5); stamp(x, y, 'clover', pal.grass, t); }
      if (r(5) < 0.1) { const [x, y] = at(3); stamp(x, y, ['flowerW', 'flowerY', 'dotW', 'dotY', 'bud'][Math.floor(r(6) * 5)], pal.grass, t); }
    } else if (t === TT.MEADOW) {
      if (r(1) < 0.7) { const [x, y] = at(1); stamp(x, y, TUFTS[Math.floor(r(2) * 6)], pal.meadow, t); }
      for (let k = 0; k < 3; k++) if (r(10 + k) < 0.5) {
        const [x, y] = at(4 + k);
        stamp(x, y, ['flowerW', 'flowerP', 'flowerB', 'flowerY', 'dotW', 'dotP', 'dotY'][Math.floor(r(20 + k) * 7)], pal.meadow, t);
      }
    } else if (t === TT.FOREST) {
      if (r(1) < 0.6) { const [x, y] = at(1); stamp(x, y, ['leaf', 'twig', 'tuftA', 'tuftB', 'tuftD', 'fern'][Math.floor(r(2) * 6)], pal.forest, t); }
      if (r(3) < 0.06) { const [x, y] = at(2); stamp(x, y, 'mush', pal.forest, t); }
    } else if (t === TT.PATH) {
      if (r(1) < 0.25) { const [x, y] = at(1); stamp(x, y, r(2) < 0.5 ? 'pebble' : 'pebble2', pal.path, t); }
    } else if (t === TT.SAND) {
      if (r(1) < 0.07) { const [x, y] = at(1); stamp(x, y, r(2) < 0.7 ? 'shell' : 'star', pal.sand, t); }
      if (r(3) < 0.2) { const [x, y] = at(2); stamp(x, y, 'pebble', pal.sand, t); }
    } else if (t === TT.ROCK) {
      if (r(1) < 0.3) { const [x, y] = at(1); stamp(x, y, 'pebble2', pal.rock, t); }
    } else if (t === TT.SNOW) {
      if (r(1) < 0.12) { const [x, y] = at(1); stamp(x, y, 'tuftD', pal.snow, t); }
      if (r(3) < 0.18) { const [x, y] = at(2); stamp(x, y, 'pebble', pal.snow, t); }
    } else if (t === TT.LEAVES) {
      for (let k = 0; k < 3; k++) if (r(10 + k) < 0.7) { const [x, y] = at(4 + k); stamp(x, y, 'leaf', leafPal[Math.floor(r(20 + k) * 4)], t); }
      if (r(3) < 0.2) { const [x, y] = at(2); stamp(x, y, 'twig', pal.forest, t); }
      if (r(5) < 0.04) { const [x, y] = at(3); stamp(x, y, 'mush', pal.forest, t); }
    } else if (t === TT.MARSH) {
      if (r(1) < 0.7) { const [x, y] = at(1); stamp(x, y, ['tuftA', 'tuftC', 'tuftE'][Math.floor(r(2) * 3)], pal.marsh, t); }
      if (r(3) < 0.25) { const [x, y] = at(2); stamp(x, y, 'puddle', pal.marsh, t); }
      if (r(5) < 0.08) { const [x, y] = at(3); stamp(x, y, r(6) < 0.5 ? 'flowerY' : 'dotW', pal.marsh, t); }
    } else if (t === TT.PETALS) {
      if (r(1) < 0.55) { const [x, y] = at(1); stamp(x, y, TUFTS[Math.floor(r(2) * 6)], pal.petals, t); }
      for (let k = 0; k < 2; k++) if (r(10 + k) < 0.55) { const [x, y] = at(4 + k); stamp(x, y, ['flowerP', 'dotP', 'dotW', 'petal'][Math.floor(r(20 + k) * 4)], pal.petals, t); }
    } else if (t === TT.HILL) {
      if (r(1) < 0.7) { const [x, y] = at(1); stamp(x, y, TUFTS[Math.floor(r(2) * 6)], pal.meadow, t); }
      for (let k = 0; k < 2; k++) if (r(10 + k) < 0.45) {
        const [x, y] = at(4 + k);
        stamp(x, y, ['flowerW', 'flowerB', 'flowerY', 'dotW', 'dotY'][Math.floor(r(20 + k) * 5)], pal.meadow, t);
      }
    }
  }
}

// ---------- Animated water (GPU) ----------
export const WATER_VERT = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

export const WATER_FRAG = /* glsl */`
  uniform sampler2D tInfo;
  uniform float uTime;
  uniform vec2 uSize;
  uniform vec3 uTint;
  varying vec2 vUv;
  float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  void main() {
    vec2 px = floor(vec2(vUv.x, 1.0 - vUv.y) * uSize);
    vec4 info = texture2D(tInfo, (px + 0.5) / uSize);
    float d = info.r * 255.0;
    if (d < 0.5 || info.g > 0.5) discard;
    float f = floor(uTime * 2.4);
    vec3 foam = vec3(0.906, 0.965, 0.957) * uTint;
    float wob = floor(h21(floor(px / 8.0)) * 4.0);
    float phase = mod(f + wob, 4.0);
    float reach = phase < 1.0 ? 1.5 : phase < 2.0 ? 2.5 : phase < 3.0 ? 3.5 : 2.5;
    if (d <= reach) {
      float solid = step(d, reach - 1.0) + step(d, 1.5);
      if (solid < 0.5 && mod(px.x + px.y + f, 2.0) > 0.5) discard;
      gl_FragColor = vec4(foam, solid > 0.5 ? 0.9 : 0.6);
      return;
    }
    if (d > 5.0 && d <= 6.5 && mod(floor(px.x / 2.0) + f, 5.0) < 1.0) { gl_FragColor = vec4(foam, 0.35); return; }
    if (d > 8.0) {
      vec2 cell = vec2(floor((px.x + f * 2.0) / 24.0), floor(px.y / 10.0));
      float hv = h21(cell + f * 7.13);
      if (hv < 0.16) {
        float gx = cell.x * 24.0 + floor(h21(cell + 3.1) * 16.0) - f * 2.0;
        float gy = cell.y * 10.0 + floor(h21(cell + 5.7) * 8.0);
        float len = 2.0 + floor(h21(cell + 9.3) * 3.0);
        vec3 g1 = vec3(0.475, 0.741, 0.863) * uTint, g2 = vec3(0.663, 0.863, 0.933) * uTint;
        if (px.y == gy && px.x >= gx && px.x < gx + len) { gl_FragColor = vec4(hv < 0.06 ? g2 : g1, 0.86); return; }
        if (px.y == gy - 1.0 && px.x >= gx + 1.0 && px.x < gx + len - 1.0 && hv < 0.08) { gl_FragColor = vec4(g1, 0.63); return; }
      }
    }
    discard;
  }`;
