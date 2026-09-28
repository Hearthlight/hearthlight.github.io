// Chunk painter for the big world (runs in a worker). Same recipe as
// art/terrain.js — influence-field borders, textured ground, lips & cliff
// faces, water depth & banks, decals — but for one 32×32-tile chunk at a
// time, computed over a window with a 3-tile margin so distance fields and
// decals flow across chunk borders, and with every noise sampled at absolute
// texel coordinates (the valley paints exactly as it does in the solo game).
//
// Output: RGBA for 512×512 texels. Alpha carries the liquid info for the
// animated overlay: 0 = land (or a bank), else (kind << 6) | distance-to-shore
// (1..63), kind 0 = water, 1 = lava, 2 = sea of clouds, 3 = reef shallows.

import { TT, TINFO, TILE, HIGH, faceTex, LEVEL_TEX, SLOPE } from '../tiles.js';
import { T } from '../../art/palette.js';
import { hexToRgb } from '../../engine/color.js';
import { valueNoise, fbm, hash2, bayer } from '../../engine/util.js';
import { ZONES, WATERS, BIG } from './layout.js';

const RGB = (hex) => hexToRgb(hex);
const R = (arr) => arr.map(RGB);

const C = {
  grass: R(T.grass), meadow: R(T.meadow), forest: R(['#2c5a40', '#356b45', '#3f7a4a', '#4f8c50', '#62a058']),
  path: R(T.path), plaza: R(T.plaza), sand: R(T.sand), wetSand: R(['#a88a5c', '#b99a68', '#c9aa77']),
  water: R(T.water), soil: R(T.soil), field: R(['#5a3b28', '#6e4a32', '#80583a', '#c9a44e', '#e0bf62']),
  rock: R(T.rock), cliff: R(T.cliff), earth: R(['#4d3326', '#6a4631', '#7f563b']), moss: R(['#5b7a45', '#6f9150']),
  stair: R(['#6a6571', '#8a858e', '#aaa5aa']),
  snow: R(['#8f9cc0', '#b8c6e2', '#dde6f4', '#f1f5fc', '#ffffff']),
  ice: R(['#5f8fc0', '#86b2dc', '#a9cdec', '#cfe6f7', '#f4fbff']),
  leaves: R(['#5a3e2a', '#8a4a2a', '#b85f30', '#d9853a', '#eab150']),
  marsh: R(['#34502f', '#44613a', '#577343', '#6f8a4c', '#8ea25e']),
  petals: R(['#f7b8d0', '#fbd8e6', '#e98fb2']),
  // ---- the big world
  dune: R(['#c98f52', '#dba766', '#e8bd7c', '#f2d094', '#fae3b4']),
  mesa: R(['#7a3a2a', '#9a4a32', '#b85e3c', '#cf7a4e', '#e39a68']),
  mesaCliff: R(['#5a2a22', '#7a3a2c', '#95503a', '#b0684a', '#c8845e']),
  canyon: R(['#8a5238', '#a8664a', '#c07c58', '#d4946a', '#e4ae84']),
  basalt: R(['#2a2430', '#3a3240', '#4a4050', '#5c5262', '#766a7a']),
  basaltCliff: R(['#1e1a24', '#2c2632', '#3a3240', '#4a4050', '#5c5262']),
  lava: R(['#6a1a14', '#a02a14', '#d8481a', '#f8801e', '#ffd04a']),
  ash: R(['#5e5860', '#716a72', '#857e86', '#9a939a', '#b4aeb2']),
  obsidian: R(['#140e1c', '#221830', '#342648', '#4c3a66', '#8a78b4']),
  mycel: R(['#3a2a58', '#4a3670', '#5c4688', '#7058a0', '#8a74bc']),
  spore: R(['#8ff0e8', '#f7a4e0', '#fff3a6']),
  glacier: R(['#4a7ab4', '#6a9ccc', '#8cbce2', '#b8daf2', '#f4fbff']),
  crevasse: R(['#0e1a3a', '#16285a', '#22407a', '#3a64a0', '#6a98cc']),
  bog: R(['#2e2a1e', '#3e3824', '#4e4630', '#62583a', '#7a6e48']),
  ruins: R(['#6e685e', '#8a8478', '#a49e90', '#bcb6a6', '#d4cebc']),
  cloud: R(['#9ea8d4', '#bcc6ea', '#d6ddf6', '#eef1fd', '#ffffff']),
  sky: R(['#5a70c4', '#7a8ed8', '#a2b0e8', '#cdd6f4', '#eef2ff']),
  steppe: R(['#8a7a3a', '#a8964a', '#c4b058', '#d8c46a', '#ecda8a']),
  heath: R(['#5e6a48', '#72804e', '#8a9458', '#a07ab8', '#c8a0dc']),
  heathCliff: R(['#4a4a44', '#5e5e56', '#74746a', '#8a8a7e', '#a2a292']),
  coral: R(['#f58ab0', '#ff9a6a', '#c88af0', '#ffd46a', '#8af0c8']),
  // ---- Dino Isle
  jungle: R(['#1f4a2a', '#285e33', '#32743b', '#428c43', '#6aac4c']),
  litter: R(['#6b4a2a', '#8a6232', '#4e3a24']),
  jflower: R(['#f06a8a', '#ffd04a', '#ff8a4a']),
  tar: R(['#120e16', '#1c1622', '#2a2234', '#4a3e62', '#9a8ac4']),
  // ---- World v7: the Dawnlands
  bamboo: R(['#4a5a2e', '#5e6e36', '#768646', '#90a058', '#aeb872']),
  bambooLeaf: R(['#7e8a3e', '#a8ae60', '#c8c886']),
  paddy: R(['#2a5658', '#366c6c', '#44847e', '#62a292', '#9ccab2']),
  rice: R(['#3a7438', '#56963c', '#86c44e', '#b2de6e']),
  lip: R(['#3e4a3e', '#5e6a58', '#8a9078', '#c0c0a2']),
  salt: R(['#a296a4', '#c6bac4', '#e0d6de', '#f0eaee', '#ffffff']),
  saltPink: R(['#eec4d2', '#f8dce6']),
  autumn: R(['#4a1c16', '#76281c', '#a23822', '#c8562c', '#e6823a']),
  autumnGold: R(['#e6a238', '#f2c858', '#fff08a']),
  roots: R(['#1c2e1e', '#283e26', '#345230', '#44683a', '#5c8246']),
  root: R(['#2e2218', '#4a3826', '#664c32', '#86683e']),
  moor: R(['#2a222c', '#3a2f3c', '#4a3f4a', '#5e5460', '#786e76']),
  moorGrass: R(['#56594a', '#70765e', '#909878']),
  crystal: R(['#7466a2', '#9486c0', '#b4a6de', '#d4caf2', '#f6f2ff']),
  prism: R(['#ff8ac8', '#8ad8ff', '#ffe68a', '#a8ffb8']),
  cobble: R(['#46404c', '#5e5862', '#78727a', '#928c92', '#b0aaae']),
  metal: R(['#46361c', '#665026', '#8a6c30', '#ae8a40', '#d8b460']),
  metalCliff: R(['#1c181c', '#2c262e', '#463e46', '#665648', '#9a7a48']),
  tundra: R(['#46524a', '#5a685c', '#728272', '#8c9c8a', '#aebaa8']),
  lichen: R(['#c8984a', '#d6764a', '#e8d070']),
  umbral: R(['#0c0812', '#160f1e', '#20162c', '#2e2040', '#422e5c']),
  vein: R(['#5a3494', '#9a60e0', '#dcb4ff']),
  chasm: R(['#06040a', '#0e0818', '#1a1030', '#34205a', '#6a44a8']),
  // ---- World v7: relief — the faces under each kind of high ground, falls, crags, hot springs
  snowCliff: R(['#3e4658', '#56607a', '#6e7a94', '#8a96ae', '#c4d2e6']),
  travertine: R(['#8a7e70', '#b0a490', '#d0c6b2', '#e8e0d0', '#fffaf2']),
  pamukkale: R(['#2a8aa8', '#3aa8c0', '#5ac4d0', '#8adce0', '#c4f0f0']),
  crystalCliff: R(['#4a3e6e', '#62568a', '#7c70a8', '#9a8ec4', '#d4cef0']),
  umbralCliff: R(['#08060c', '#120c1a', '#1c1428', '#2a1e3c', '#6a44a8']),
  wall: R(['#3e3a36', '#5a544c', '#766e62', '#948a7a', '#b8ae9a']),
  granite: R(['#6e6a66', '#8a8680', '#a4a098', '#c0bcb2', '#e0dcd2']),
  karst: R(['#6a6e66', '#868a80', '#a2a498', '#bcbeb0', '#dcdcd0']),
  fall: R(['#3a7cae', '#6aaad4', '#a8d4ee', '#e4f4fc', '#ffffff']),
  lavafall: R(['#7a1a10', '#c83a14', '#f0701e', '#ffb03a', '#ffe68a']),
  sinter: R(['#7e7060', '#a89a84', '#d4c8b2', '#e8e0d0', '#f8f4ec']),
  mats: R(['#b8482a', '#e0783a', '#eeb04a']),
};
const WPAL = {}; for (const [k, v] of Object.entries(WATERS)) WPAL[k] = R(v);
WPAL.sea = C.water;                             // the valley's own sea, exactly
const ZWATER = ZONES.map((z) => WPAL[z.water] || C.water);

const HARD = new Set([TT.SOIL, TT.FIELD]);
const UNDER = { [TT.SOIL]: TT.GRASS, [TT.FIELD]: TT.GRASS };
const isLiq = (t) => t === TT.WATER || t === TT.CORAL || t === TT.LAVA || t === TT.SKY || t === TT.CREVASSE;
const GRASSY = new Set([TT.GRASS, TT.MEADOW, TT.FOREST, TT.PATH, TT.FIELD, TT.STEPPE, TT.MYCEL, TT.CANYON, TT.JUNGLE, TT.BAMBOO, TT.AUTUMN, TT.ROOTS, TT.MOOR, TT.TUNDRA]);
const SCAR = ZONES.findIndex((z) => z.id === 'scar');
// the face under a plateau, by the plateau's kind
const ZX = (id) => ZONES.findIndex((z) => z.id === id);
const [DUNES, CANYON, VOLCANO, ELDER, JADE, GLOWZ, SALTZ] = ['dunes', 'canyon', 'volcano', 'elder', 'jade', 'glow', 'salt'].map(ZX);
const COLDZ = new Set(['glacier', 'heights', 'tundra', 'clock', 'cloud', 'deepwood'].map(ZX));
const cragPal = (z) => (z === DUNES || z === CANYON ? C.mesaCliff : z === SCAR || z === VOLCANO ? C.basaltCliff : z === ELDER ? C.granite : z === JADE || z === GLOWZ ? C.karst : COLDZ.has(z) ? C.snowCliff : C.cliff);
const cragTop = (z) => (z === DUNES || z === CANYON ? C.mesa : z === SCAR || z === VOLCANO ? C.basalt : z === ELDER ? C.granite : z === JADE || z === GLOWZ ? C.karst : C.rock);
const cliffPal = (ht, z = -1) => (ht === TT.MESA ? C.mesaCliff : ht === TT.BASALT || ht === TT.ASH || ht === TT.OBSIDIAN ? C.basaltCliff : ht === TT.HEATH ? C.heathCliff : ht === TT.METAL ? C.metalCliff
  : ht === TT.CRAG ? cragPal(z) : ht === TT.SNOW || ht === TT.ICE || ht === TT.GLACIER || ht === TT.TUNDRA ? C.snowCliff
  : ht === TT.SALT || ht === TT.SINTER ? C.travertine : ht === TT.CRYSTAL ? C.crystalCliff : ht === TT.UMBRAL ? C.umbralCliff
  : ht === TT.PADDY || ht === TT.COBBLE ? C.wall : C.cliff);
const M = 4;                                    // margin in tiles (faces up to ~6 levels tall flow in from above)
const CH = BIG.CHUNK;

// noise sampled on a coarse grid over the window, in absolute texels
function field(px0, py0, PW, PH, scale, seed, octaves = 3) {
  const S = 4, gx0 = Math.floor(px0 / S), gy0 = Math.floor(py0 / S);
  const gw = Math.ceil(PW / S) + 3, gh = Math.ceil(PH / S) + 3;
  const f = new Float32Array(gw * gh);
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) f[y * gw + x] = fbm(((gx0 + x) * S) / scale, ((gy0 + y) * S) / scale, seed, octaves);
  return (px, py) => {
    const gx = px / S, gy = py / S, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
    const i = (y0 - gy0) * gw + (x0 - gx0);
    const a = f[i], b = f[i + 1], c = f[i + gw], d = f[i + gw + 1];
    return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
  };
}

// the Festival Ring's paint: a terracotta border, a thin ring and a big
// shooting star with a ribbon tail in the festival colours
const RING = {
  border: RGB('#b8583a'), borderHi: RGB('#cf6e48'), line: RGB('#f4e2b8'), mid: RGB('#c8703a'),
  star: RGB('#f0b848'), starHi: RGB('#ffd878'), starEdge: RGB('#9a5a2a'),
  tail: [RGB('#ef6479'), RGB('#f4c542'), RGB('#5aa8f2')],
};

// point-in-polygon (even-odd)
function inPoly(pts, x, y) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function paintChunk(map, cx, cz) {
  const { X0, Z0, W: MW, H: MH, ground, zone, arena } = map;
  // the star at the ring's centre (texel space)
  const starPts = [];
  if (arena) for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, r = (k % 2 ? 1.12 : 2.6) * TILE;
    starPts.push([arena.x * TILE + Math.cos(a) * r, arena.z * TILE + Math.sin(a) * r]);
  }
  const tx0 = X0 + cx * CH - M, tz0 = Z0 + cz * CH - M;      // window origin (world tiles)
  const TW = CH + M * 2, PW = TW * TILE, PH = PW, N = PW * PH;
  const px0 = tx0 * TILE, py0 = tz0 * TILE;                  // absolute texel origin
  const tileAt = (x, z) => {
    x = x < X0 ? X0 : x >= X0 + MW ? X0 + MW - 1 : x;
    z = z < Z0 ? Z0 : z >= Z0 + MH ? Z0 + MH - 1 : z;
    return ground[(z - Z0) * MW + (x - X0)];
  };
  const zoneAt = (x, z) => {
    x = x < X0 ? X0 : x >= X0 + MW ? X0 + MW - 1 : x;
    z = z < Z0 ? Z0 : z >= Z0 + MH ? Z0 + MH - 1 : z;
    return zone[(z - Z0) * MW + (x - X0)];
  };
  const soft = (t) => (t === TT.PLANK_H || t === TT.PLANK_V ? TT.WATER : HARD.has(t) ? UNDER[t] : t);

  // ---------- Pass 1: terrain type & height per texel (organic borders)
  // (World v7: the four tiles round a texel compete as (type, level) pairs, so a
  // terrace's edge wobbles like any border; one level per plateau keeps the old look)
  const EL = map.elev || null;
  const elevAt = (x, z) => {
    x = x < X0 ? X0 : x >= X0 + MW ? X0 + MW - 1 : x;
    z = z < Z0 ? Z0 : z >= Z0 + MH ? Z0 + MH - 1 : z;
    const q = (z - Z0) * MW + (x - X0);
    return EL ? EL[q] : HIGH.has(ground[q]) ? 1 : 0;
  };
  const types = new Uint8Array(N), elevT = new Uint8Array(N);
  const score = new Float32Array(512);
  for (let y = 0; y < PH; y++) {
    const py = py0 + y;
    const v = py / TILE - 0.5, j0 = Math.floor(v), fy = v - j0, tyOwn = Math.floor(py / TILE);
    for (let x = 0; x < PW; x++) {
      const px = px0 + x, i = y * PW + x, txOwn = Math.floor(px / TILE);
      const own = tileAt(txOwn, tyOwn);
      if (HARD.has(own)) { types[i] = own; elevT[i] = elevAt(txOwn, tyOwn); continue; }
      if (own === TT.PLANK_H || own === TT.PLANK_V) { types[i] = TT.WATER; elevT[i] = elevAt(txOwn, tyOwn); continue; }
      const u = px / TILE - 0.5, i0 = Math.floor(u), fx = u - i0;
      const a = soft(tileAt(i0, j0)) * 8 + elevAt(i0, j0), b = soft(tileAt(i0 + 1, j0)) * 8 + elevAt(i0 + 1, j0);
      const c = soft(tileAt(i0, j0 + 1)) * 8 + elevAt(i0, j0 + 1), d = soft(tileAt(i0 + 1, j0 + 1)) * 8 + elevAt(i0 + 1, j0 + 1);
      if (a === b && a === c && a === d) { types[i] = a >> 3; elevT[i] = a & 7; continue; }
      score[a] = 0; score[b] = 0; score[c] = 0; score[d] = 0;
      score[a] += (1 - fx) * (1 - fy); score[b] += fx * (1 - fy); score[c] += (1 - fx) * fy; score[d] += fx * fy;
      let best = a, bestS = -9;
      for (const k of [a, b, c, d]) {
        const t = k >> 3, ek = (k & 7) - (HIGH.has(t) ? 1 : 0), info = TINFO[t];
        const n = info.noise ? (valueNoise(px * 0.19 + t * 31.7 + ek * 13.1, py * 0.19 + t * 17.3 + ek * 7.9, 5) - 0.5) * 2 * info.noise : 0;
        const s = score[k] + n + info.prio * 0.0005 + ek * 0.0001;
        if (s > bestS) { bestS = s; best = k; }
      }
      types[i] = best >> 3; elevT[i] = best & 7;
    }
  }
  const typeAt = (x, y) => types[(y < 0 ? 0 : y >= PH ? PH - 1 : y) * PW + (x < 0 ? 0 : x >= PW ? PW - 1 : x)];
  const Ht = (t) => TINFO[t].height;

  // water palette per texel: the zone that wins the influence field there
  const zscore = new Float32Array(64);
  const zoneOf = (x, y) => {
    const px = px0 + x, py = py0 + y;
    const u = px / TILE - 0.5, v = py / TILE - 0.5, i0 = Math.floor(u), j0 = Math.floor(v), fx = u - i0, fy = v - j0;
    const a = zoneAt(i0, j0), b = zoneAt(i0 + 1, j0), c = zoneAt(i0, j0 + 1), d = zoneAt(i0 + 1, j0 + 1);
    if (a === b && a === c && a === d) return a;
    zscore[a] = 0; zscore[b] = 0; zscore[c] = 0; zscore[d] = 0;
    zscore[a] += (1 - fx) * (1 - fy); zscore[b] += fx * (1 - fy); zscore[c] += (1 - fx) * fy; zscore[d] += fx * fy;
    let best = a, bs = -9;
    for (const q of [a, b, c, d]) { const s = zscore[q] + (bayer(px, py) - 0.5) * 0.5 + (valueNoise(px * 0.07, py * 0.07, 88) - 0.5) * 0.6; if (s > bs) { bs = s; best = q; } }
    return best;
  };

  // ---------- Pass 2: distances & column scans — and the faces: under an edge where
  // the ground drops, a cliff as tall as the drop (FACE_TEX texels a level); where
  // the top is a liquid, it falls (waterfalls, lava falls)
  const dLand = chamfer16(PW, PH, (i) => !isLiq(types[i]));
  const landAbove = new Uint8Array(N), landAboveType = new Uint8Array(N), landAboveElev = new Uint8Array(N);
  const faceD = new Uint8Array(N), faceH = new Uint8Array(N), faceT = new Uint8Array(N), faceL = new Uint8Array(N);
  const MAXF = M * TILE - 4;
  for (let x = 0; x < PW; x++) {
    let lastLand = -999, lastT = 0, lastE = 0, topY = -1, topE = 0, topT = 0;
    for (let y = 0; y < PH; y++) {
      const i = y * PW + x, t = types[i], e = elevT[i];
      if (topY >= 0 && e < topE && y - topY < Math.min(MAXF, faceTex(topE, e))) { faceD[i] = y - topY + 1; faceH[i] = Math.min(MAXF, faceTex(topE, e)); faceT[i] = topT; faceL[i] = topE - e; }
      else if (y > 0 && elevT[i - PW] > e) { topY = y; topE = elevT[i - PW]; topT = types[i - PW]; faceD[i] = 1; faceH[i] = Math.min(MAXF, faceTex(topE, e)); faceT[i] = topT; faceL[i] = topE - e; }
      else topY = -1;
      if (!isLiq(t)) { lastLand = y; lastT = t; lastE = e; continue; }
      const k = y - lastLand;
      landAbove[i] = k > 255 ? 255 : k;
      landAboveType[i] = lastT; landAboveElev[i] = lastE;
    }
  }
  // a fall down a face: streaks of water (or lava) over the rock, spray at the foot;
  // the liquid overlay animates it (alpha code 62)
  const paintFall = (i, px, py, ra, fh, lava) => {
    const P = lava ? C.lavafall : C.fall;
    const s = valueNoise(px * 0.45, py * 0.07 - ra * 0.02, lava ? 612 : 611);
    let c = s > 0.68 ? P[4] : s > 0.5 ? P[3] : s > 0.32 ? P[2] : P[1];
    if (ra <= 2) c = P[3];
    if (ra >= fh - 2) c = hash2(px, py, 613) < 0.6 ? P[4] : P[3];
    if (!lava && (px & 7) === 0 && s < 0.4) c = P[0];
    const o = i * 4; img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2]; img[o + 3] = ((lava ? 1 : 0) << 6) | 62;
  };

  // ---------- noise fields (made on first use)
  const FIELDS = { grass: [64, 8], meadow: [64, 15], forest: [64, 22], path: [26, 32], sand: [40, 52], rock: [18, 81], moss: [24, 84], big: [120, 301], dune: [46, 302], lava: [22, 303], cloud: [70, 304], terr: [210, 424] };
  const F = {};
  const f = (k) => F[k] || (F[k] = field(px0, py0, PW, PH, FIELDS[k][0], FIELDS[k][1]));

  const CELL = 7;
  const cellOf = (px, py, cell = CELL, s = 11) => {
    const cx = Math.floor(px / cell), cy = Math.floor(py / cell);
    let best = 1e9, second = 1e9, id = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const gx = cx + i, gy = cy + j;
      const ox = (gy & 1) * 0.5;
      const fx = (gx + ox + 0.2 + hash2(gx, gy, s) * 0.6) * cell;
      const fy = (gy + 0.2 + hash2(gx, gy, s + 1) * 0.6) * cell;
      const dd = (px + 0.5 - fx) ** 2 * 0.8 + (py + 0.5 - fy) ** 2;
      if (dd < best) { second = best; best = dd; id = (gy * 4096 + gx) >>> 0; }
      else if (dd < second) second = dd;
    }
    return [id, Math.sqrt(second) - Math.sqrt(best)];
  };

  // (the same, with the cell's feature point: facets & plates shaded by their side)
  const cellPt = (px, py, cell, s) => {
    const cx = Math.floor(px / cell), cy = Math.floor(py / cell);
    let best = 1e9, second = 1e9, id = 0, bx = 0, by = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const gx = cx + i, gy = cy + j;
      const fx = (gx + 0.2 + hash2(gx, gy, s) * 0.6) * cell, fy = (gy + 0.2 + hash2(gx, gy, s + 1) * 0.6) * cell;
      const dd = (px + 0.5 - fx) ** 2 + (py + 0.5 - fy) ** 2;
      if (dd < best) { second = best; best = dd; id = (gy * 4096 + gx) >>> 0; bx = fx; by = fy; }
      else if (dd < second) second = dd;
    }
    return [id, Math.sqrt(second) - Math.sqrt(best), px + 0.5 - bx, py + 0.5 - by];
  };
  const clampF = (k, qx, qy) => f(k)(qx < px0 ? px0 : qx >= px0 + PW ? px0 + PW - 1 : qx, qy < py0 ? py0 : qy >= py0 + PH ? py0 + PH - 1 : qy);
  const onRoot = (qx, qy) => Math.min(Math.abs(valueNoise(qx / 34, qy / 20, 453) - 0.5), Math.abs(valueNoise(qx / 26, qy / 38, 454) - 0.5)) < 0.021;

  // cumulus puffs: the nearest feature point of a jittered grid, with its radius
  const puff = (px, py, cell, s) => {
    const cx = Math.floor(px / cell), cy = Math.floor(py / cell);
    let best = 1e9, bx = 0, by = 0, br = cell;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const gx = cx + i, gy = cy + j;
      const fx = (gx + 0.2 + hash2(gx, gy, s) * 0.6) * cell, fy = (gy + 0.2 + hash2(gx, gy, s + 1) * 0.6) * cell;
      const r = cell * (0.62 + hash2(gx, gy, s + 2) * 0.5);
      const d = Math.hypot(px + 0.5 - fx, (py + 0.5 - fy) * 1.15) / r;
      if (d < best) { best = d; bx = fx; by = fy; br = r; }
    }
    return { d: best, lx: (px - bx) / br, ly: (py - by) / br };
  };

  const img = new Uint8ClampedArray(N * 4);
  const put = (i, rgb) => { const o = i * 4; img[o] = rgb[0]; img[o + 1] = rgb[1]; img[o + 2] = rgb[2]; img[o + 3] = 0; };

  // ---------- Pass 3a: liquids
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
    const i = y * PW + x, t = types[i];
    if (!isLiq(t)) continue;
    const px = px0 + x, py = py0 + y;
    const dith = bayer(px, py) - 0.5;
    const la = landAbove[i], lt = landAboveType[i];
    const dl = dLand[i] / 3;
    // (World v7) a liquid falling off higher ground: a waterfall, a lava fall
    const ft = faceT[i];
    if (faceD[i] && (ft === TT.WATER || ft === TT.CORAL || ft === TT.LAVA)) { paintFall(i, px, py, faceD[i], faceH[i], ft === TT.LAVA); continue; }
    const drop = landAboveElev[i] - elevT[i];
    let col, kind = 0, bank = false;
    if (t === TT.LAVA) {
      kind = 1;
      const n = f('lava')(px, py);
      const crust = n < 0.42 + dith * 0.06 && dl > 3;
      col = dl < 1.5 ? C.basalt[1] : crust ? (n < 0.34 ? C.lava[0] : C.lava[1]) : dl < 4 ? C.lava[3] : n > 0.62 ? C.lava[4] : C.lava[2];
      if (drop > 0 && la <= faceTex(landAboveElev[i], elevT[i])) { const k = la * 10 / faceTex(landAboveElev[i], elevT[i]); col = k <= 1 ? C.basaltCliff[4] : k < 4 ? C.basaltCliff[2] : k < 8 ? C.basaltCliff[1] : C.lava[1]; bank = k < 8; }
    } else if (t === TT.SKY) {
      kind = 2;
      const n = f('cloud')(px, py) * 0.8 + f('big')(px, py) * 0.2;
      const q = puff(px, py, 34, 311);
      const lit = -(q.lx * 0.6 + q.ly * 0.8);
      const v = n * 1.1 - 0.2 + (1 - Math.min(1, q.d)) * 0.18 + lit * 0.07 + dith * 0.05;
      col = v > 0.6 ? C.sky[4] : v > 0.5 ? C.sky[3] : v > 0.4 ? C.sky[2] : v > 0.3 ? C.sky[1] : C.sky[0];
      if (lt === TT.CLOUD && la <= 12) { col = la <= 2 ? C.cloud[3] : la <= 6 ? C.cloud[2] : la <= 9 ? C.cloud[1] : C.cloud[0]; bank = true; }
    } else if (t === TT.CREVASSE) {
      const d = dl + dith;
      if (zoneOf(x, y) === SCAR) col = d < 1.5 ? C.vein[1] : d < 3 ? C.chasm[4] : d < 5 ? C.chasm[3] : d < 9 ? C.chasm[2] : d < 14 ? C.chasm[1] : C.chasm[0];
      else col = d < 1.5 ? C.glacier[4] : d < 3 ? C.crevasse[4] : d < 5 ? C.crevasse[3] : d < 8 ? C.crevasse[2] : d < 12 ? C.crevasse[1] : C.crevasse[0];
      bank = true;
    } else {
      const zw = zoneOf(x, y), P = zw === SALTZ && elevT[i] >= 1 ? C.pamukkale : ZWATER[zw] || C.water;   // (the White Stairs' pools: turquoise)
      kind = t === TT.CORAL ? 3 : 0;
      // (the solo game's rules: cliffs & earth banks colour the edge, and the
      // animated foam stays off the banks)
      // (a cliff drops into the water as tall as the ground above stands)
      const Hh = faceTex(landAboveElev[i], elevT[i]) + 1, cliff = drop > 0 && la <= Hh + 2 && !(drop === 1 && lt === TT.HILL);
      bank = (drop > 0 && la <= Hh + 2) || (la <= 4 && lt !== TT.SAND && lt !== TT.DUNE && lt !== TT.SALT && !isLiq(lt)) || ((lt === TT.SAND || lt === TT.DUNE || lt === TT.SALT) && la <= 2);
      if (cliff) {
        const k = la, cp = cliffPal(lt, zoneOf(x, y));
        const band = ((k + ((hash2(px >> 2, 0, 21) * 3) | 0)) % 4);
        col = k >= Hh + 1 ? P[0] : band === 0 ? cp[1] : k > Hh - 3 ? cp[1] : k < 3 ? cp[3] : cp[2];
        if (hash2(px, py >> 2, 22) < 0.06 && k > 2 && k < Hh) col = cp[0];
        if (drop > 1 && k > 1 && k < Hh - 2 && k % LEVEL_TEX === 0) col = cp[3];          // (a ledge at every level)
        if (k === 1) col = cp[4];
      } else if (GRASSY.has(lt) && la <= 4) {
        col = la === 1 ? C.earth[2] : la === 2 ? C.earth[1] : la === 3 ? C.earth[0] : P[1];
      } else if ((lt === TT.SAND || lt === TT.DUNE) && la <= 2) {
        col = la === 1 ? C.wetSand[0] : P[2];
      } else if ((lt === TT.GLACIER || lt === TT.CLOUD) && la <= 3) {
        col = la === 1 ? C.snow[1] : la === 2 ? C.ice[1] : P[2];
      } else if ((lt === TT.BOG || lt === TT.ASH || lt === TT.BASALT) && la <= 3) {
        col = la === 1 ? C.bog[2] : la === 2 ? C.bog[1] : P[1];
      } else if (lt === TT.SALT && la <= 2) {
        col = la === 1 ? C.salt[1] : P[3];
      } else if ((lt === TT.UMBRAL || lt === TT.CRYSTAL || lt === TT.COBBLE || lt === TT.PADDY) && la <= 3) {
        const E = lt === TT.UMBRAL ? C.umbral : lt === TT.CRYSTAL ? C.crystal : lt === TT.PADDY ? C.lip : C.cobble;
        col = la === 1 ? E[lt === TT.PADDY ? 3 : 1] : la === 2 ? E[0] : P[1];
      } else {
        const dd = dl + dith * 3;
        col = dd < 3 ? P[4] : dd < 7 ? P[3] : dd < 16 ? P[2] : dd < 30 ? P[1] : P[0];
        if (dl > 6 && valueNoise(px * 0.08, py * 0.3, 44) > 0.78 && ((px + py * 3) & 7) < 3) col = dd < 16 ? P[3] : P[2];
      }
      if (t === TT.CORAL && !bank && la > 4) {
        // reef shallows: a pale sandy bottom, seagrass, and the odd coral head
        const sandy = f('sand')(px, py), grass = f('moss')(px, py), reef = f('rock')(px, py);
        col = sandy > 0.58 ? P[4] : P[3];
        if (grass > 0.66 && ((px + py) & 1)) col = P[2];
        if (reef > 0.72) {
          const cc = C.coral[Math.floor(hash2(px >> 3, py >> 3, 332) * 5)];
          col = reef > 0.74 ? cc : P[1];
          if (reef > 0.76 && ((px ^ py) & 3) === 0) col = RGB('#fff4e8');
        }
        if (dl < 3) col = P[4];
      }
    }
    put(i, col);
    const d = Math.max(1, Math.min(61, Math.round(dl)));            // (62: a fall)
    img[i * 4 + 3] = bank ? 0 : (kind << 6) | d;
  }

  // ---------- Pass 3b: land
  const dWater = chamfer16(PW, PH, (i) => types[i] === TT.WATER || types[i] === TT.CORAL);
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
    const i = y * PW + x, t = types[i];
    if (isLiq(t)) continue;
    const px = px0 + x, py = py0 + y;
    const dith = bayer(px, py) - 0.5;
    let col;
    const up = typeAt(x, y - 1), dn = typeAt(x, y + 1), lf = typeAt(x - 1, y), rt = typeAt(x + 1, y), up2 = typeAt(x, y - 2);
    const lowerBelow = Ht(dn) < Ht(t) && dn !== t;
    const higherAbove = Ht(up) > Ht(t) || (Ht(up2) > Ht(t) && up2 !== t && t !== TT.PLAZA);
    const sideLower = (Ht(lf) < Ht(t) && lf !== t) || (Ht(rt) < Ht(t) && rt !== t);
    // cliff faces under higher ground, as tall as the drop (paths become stairs; a liquid on top falls);
    // a one-level step of soft ground is a bank instead: the ground itself, shaded like a slope
    const ra = faceD[i];
    let bankK = 0;
    if (ra && faceL[i] === 1 && SLOPE.has(faceT[i]) && SLOPE.has(t)) bankK = ra <= 1 ? 1.12 : 0.74 + (ra / faceH[i]) * 0.14 + (bayer(px, py) - 0.5) * 0.04;
    else if (ra) {
      const ht = faceT[i], fh = faceH[i];
      if (t === TT.PATH || t === TT.OBSIDIAN) { const k = ra % 3; put(i, k === 0 ? C.stair[2] : k === 1 ? C.stair[1] : C.stair[0]); continue; }
      if (ht === TT.WATER || ht === TT.CORAL || ht === TT.LAVA) { paintFall(i, px, py, ra, fh, ht === TT.LAVA); continue; }
      const cp = cliffPal(ht, zoneOf(x, y));
      if (ht === TT.METAL) {
        // brass-trimmed iron girders: a lit trim on top, rivets, dark bays between the posts
        const gx = ((px % 12) + 12) % 12, rr = ((ra - 1) % LEVEL_TEX) + 1;
        col = ra >= fh - 1 ? C.earth[0] : rr === 1 ? cp[4] : rr === 2 ? cp[3] : gx < 2 ? cp[3] : gx === 2 ? cp[2] : (rr === 5 ? cp[2] : cp[1]);
        if (gx === 0 && (rr === 4 || rr === 7)) col = cp[4];
        put(i, col);
        continue;
      }
      if (ht === TT.PADDY || ht === TT.COBBLE) {
        // a retaining wall: stone courses in running bond, a capstone on top
        const row = Math.floor((ra - 1) / 3), bx = (((px + (row & 1) * 3) % 7) + 7) % 7;
        col = ra === 1 ? cp[4] : ra >= fh - 1 ? C.earth[0] : (ra - 1) % 3 === 2 || bx === 0 ? cp[1] : hash2(Math.floor((px + (row & 1) * 3) / 7), row, 26) < 0.5 ? cp[2] : cp[3];
        put(i, col);
        continue;
      }
      const band = ((ra + ((hash2(px >> 2, 1, 23) * 3) | 0)) % 4);
      col = ra >= fh - 1 ? (ht === TT.BASALT || cp === C.basaltCliff ? C.basaltCliff[0] : C.earth[0]) : band === 0 ? cp[1] : ra < 3 ? cp[3] : cp[2];
      if ((ht === TT.BASALT || cp === C.basaltCliff) && (px & 3) === 0 && ra < fh - 1) col = cp[0];            // basalt columns
      else if ((ht === TT.MESA || cp === C.mesaCliff) && ra % 3 === 1 && ra < fh - 1) col = cp[2];            // red strata
      if (hash2(px, py >> 2, 24) < 0.05 && ra > 2 && ra < fh - 1) col = cp[0];
      if (fh > LEVEL_TEX && ra > 1 && ra < fh - 2 && ra % LEVEL_TEX === 0) col = cp[3];                        // (a ledge at every level)
      if (cp === C.travertine && ra > 1 && ra < fh - 1 && px % 3 === 0 && ra < 3 + hash2(px, 0, 27) * fh) col = hash2(px, 1, 28) < 0.5 ? cp[4] : cp[3];   // (travertine drips)
      if (ht === TT.SNOW && ra < 4 && fh > 10) col = C.snow[ra < 3 ? 4 : 3];                                   // (snow spilling over)
      if (ra === 1) col = cp[4];
      put(i, col);
      continue;
    }
    switch (t) {
      case TT.GRASS: case TT.MEADOW: case TT.FOREST: {
        const P = t === TT.GRASS ? C.grass : t === TT.MEADOW ? C.meadow : C.forest;
        const patch = f(t === TT.GRASS ? 'grass' : t === TT.MEADOW ? 'meadow' : 'forest')(px, py) + (hash2(px >> 2, py >> 2, 9) - 0.5) * 0.02;
        let lvl = 2;
        if (patch > 0.61) lvl = 3; else if (patch < 0.36) lvl = 1;
        const sp = hash2(px, py, t * 13 + 5);
        if (sp < 0.018) lvl -= 1; else if (sp > 0.985) lvl += 1;
        col = P[lvl < 0 ? 0 : lvl > 4 ? 4 : lvl];
        if (lowerBelow) col = isLiq(dn) ? P[0] : P[1];
        else if (sideLower && isLiq(lf === t ? rt : lf)) col = P[1];
        break;
      }
      case TT.PATH: {
        const vv = f('path')(px, py) * 0.85 + hash2(px >> 1, py >> 1, 31) * 0.15 + dith * 0.08;
        col = vv < 0.33 ? C.path[1] : vv < 0.62 ? C.path[2] : C.path[3];
        if (higherAbove) col = C.path[0];
        else if (Ht(lf) > Ht(t) || Ht(rt) > Ht(t)) col = C.path[1];
        else if (lowerBelow) col = C.path[1];
        const hh = hash2(px, py, 33);
        if (hh < 0.012) col = C.path[0]; else if (hh < 0.02) col = C.path[4];
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
        const vv = f('sand')(px, py) * 0.8 + hash2(px >> 2, py >> 2, 51) * 0.2 + dith * 0.14;
        col = vv < 0.4 ? C.sand[1] : vv < 0.72 ? C.sand[2] : C.sand[3];
        if (dw < 5 + dith * 3) col = dw < 2.5 ? C.wetSand[0] : C.wetSand[1];
        else if (dw < 8 + dith * 3) col = C.wetSand[2];
        const hh = hash2(px, py, 53);
        if (hh < 0.01) col = C.sand[0]; else if (hh < 0.02) col = C.sand[4];
        if (higherAbove && Ht(up) >= 2) col = C.sand[0];
        break;
      }
      case TT.SOIL: {
        const ly = ((py % TILE) + TILE) % TILE;
        const furrow = ly % 4 === 3;
        const vv = hash2(px >> 2, py >> 2, 71) + dith * 0.2;
        col = furrow ? C.soil[1] : vv < 0.45 ? C.soil[2] : C.soil[3];
        if (ly % 4 === 0 && !furrow) col = C.soil[3];
        if (hash2(px, py, 72) < 0.03) col = C.soil[4];
        const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
        const tU = tileAt(tx, Math.floor((py - 1) / TILE)), tL = tileAt(Math.floor((px - 1) / TILE), ty);
        const tR = tileAt(Math.floor((px + 1) / TILE), ty), tD = tileAt(tx, Math.floor((py + 1) / TILE));
        if (tU !== TT.SOIL) col = C.soil[0];
        else if (tL !== TT.SOIL || tR !== TT.SOIL) col = C.soil[1];
        else if (tD !== TT.SOIL) col = C.soil[4];
        break;
      }
      case TT.FIELD: {
        const ly = ((py % 6) + 6) % 6;
        col = ly === 5 ? C.field[0] : ly === 4 ? C.field[1] : ly === 0 ? C.field[3] : C.field[2];
        if (ly < 3 && hash2(px, py, 75) < 0.3) col = C.field[4];
        break;
      }
      case TT.SNOW: {
        const vv = f('meadow')(px, py) * 0.85 + hash2(px, py >> 1, 111) * 0.08 + dith * 0.08;
        col = vv < 0.4 ? C.snow[2] : vv < 0.62 ? C.snow[3] : C.snow[4];
        if (hash2(px, py, 113) < 0.018) col = C.snow[1];
        if (lowerBelow) col = isLiq(dn) ? C.snow[0] : C.snow[1];
        else if (sideLower) col = C.snow[2];
        if (higherAbove) col = C.snow[1];
        break;
      }
      case TT.ICE: {
        const vv = f('sand')(px, py) * 0.6 + hash2(px >> 3, py >> 1, 121) * 0.4;
        col = vv < 0.35 ? C.ice[1] : vv < 0.7 ? C.ice[2] : C.ice[3];
        if (((px + py * 2) % 23) === 0 && hash2(px >> 3, py >> 3, 122) < 0.5) col = C.ice[4];
        if (Math.abs(valueNoise(px / 9, py / 9, 123) - 0.5) < 0.012) col = C.ice[0];
        if (higherAbove) col = C.ice[0];
        else if (up !== t && Ht(up) >= Ht(t)) col = C.ice[1];
        break;
      }
      case TT.LEAVES: {
        const patch = f('forest')(px, py), earth = f('path')(px, py), hh = hash2(px, py, 131);
        col = patch > 0.55 ? C.leaves[2] : patch < 0.4 ? C.leaves[1] : C.leaves[2];
        if (hh < 0.22) col = C.leaves[3]; else if (hh < 0.27) col = C.leaves[4]; else if (hh > 0.965) col = C.leaves[0];
        if (earth > 0.66 && hh > 0.3) col = hh > 0.7 ? C.earth[1] : C.earth[2];
        else if (earth < 0.3 && hh > 0.55) col = hh > 0.85 ? C.forest[3] : C.forest[2];
        if (lowerBelow) col = C.leaves[0];
        break;
      }
      case TT.MARSH: {
        const vv = f('grass')(px, py) * 0.8 + hash2(px >> 2, py >> 2, 141) * 0.2 + dith * 0.1;
        col = vv < 0.38 ? C.marsh[1] : vv < 0.62 ? C.marsh[2] : C.marsh[3];
        if (hash2(px, py, 142) < 0.02) col = C.marsh[4];
        if (lowerBelow) col = isLiq(dn) ? C.marsh[0] : C.marsh[1];
        if (higherAbove) col = C.marsh[0];
        break;
      }
      case TT.PETALS: {
        const P = C.meadow, patch = f('meadow')(px, py);
        col = P[patch > 0.6 ? 3 : patch < 0.36 ? 1 : 2];
        const hh = hash2(px, py, 151);
        if (hh < 0.07) col = C.petals[0]; else if (hh < 0.095) col = C.petals[1]; else if (hh < 0.1) col = C.petals[2];
        if (lowerBelow) col = isLiq(dn) ? P[0] : P[1];
        break;
      }
      case TT.HILL: {
        const P = C.meadow;
        const patch = f('meadow')(px, py) + (hash2(px >> 2, py >> 2, 91) - 0.5) * 0.02;
        let lvl = patch > 0.58 ? 3 : 2;
        const sp = hash2(px, py, 93);
        if (sp < 0.02) lvl -= 1; else if (sp > 0.982) lvl += 1;
        col = P[lvl < 0 ? 0 : lvl > 4 ? 4 : lvl];
        if (lowerBelow) col = C.rock[4];
        else if (Ht(up) < Ht(t) && up !== t) col = P[4];
        else if (sideLower) col = P[1];
        break;
      }
      case TT.ROCK: {
        const vv = f('rock')(px, py) * 0.8 + hash2(px >> 2, py >> 2, 82) * 0.2 + dith * 0.12;
        col = vv < 0.38 ? C.rock[1] : vv < 0.62 ? C.rock[2] : C.rock[3];
        if (Math.abs(valueNoise(px / 11, py / 11, 83) - 0.5) < 0.018) col = C.rock[0];
        const moss = f('moss')(px, py);
        if (moss > 0.64) col = moss > 0.7 ? C.moss[1] : C.moss[0];
        if (hash2(px, py, 85) < 0.012) col = C.rock[4];
        if (lowerBelow) col = C.rock[4];
        else if (Ht(up) < Ht(t) && up !== t) col = C.rock[3];
        break;
      }
      // ---------------------------------------------------------- the big world
      case TT.DUNE: {
        // wind ripples curling over the dunes, sunlit crests
        const big = f('big')(px, py), n = f('dune')(px, py);
        const rip = Math.sin((px * 0.55 + py * 0.9 + n * 60) * 0.55);
        col = big > 0.6 ? C.dune[3] : big < 0.38 ? C.dune[1] : C.dune[2];
        if (rip > 0.82) col = big > 0.55 ? C.dune[4] : C.dune[3];
        else if (rip < -0.86) col = C.dune[big < 0.4 ? 0 : 1];
        const dw = dWater[i] / 3;
        if (dw < 4 + dith * 2) col = dw < 2 ? C.wetSand[0] : C.wetSand[1];
        if (hash2(px, py, 161) < 0.006) col = C.dune[0];
        if (lowerBelow) col = C.dune[1];
        break;
      }
      case TT.MESA: {
        // a sun-baked plateau top: warm rock & dust, dry scrub, pale sandy drifts
        const vv = f('rock')(px, py) * 0.6 + f('big')(px, py) * 0.25 + hash2(px >> 2, py >> 2, 171) * 0.15 + dith * 0.08;
        col = vv < 0.4 ? C.mesa[2] : vv < 0.6 ? C.mesa[3] : C.mesa[4];
        if (f('sand')(px, py) > 0.64) col = C.canyon[3];
        const scrub = f('moss')(px, py);
        if (scrub > 0.63 && hash2(px, py, 173) < 0.45) col = hash2(px, py, 174) < 0.5 ? RGB('#8a8a4a') : RGB('#6e7a3e');
        if (hash2(px, py, 175) < 0.012) col = C.mesa[1];
        if (lowerBelow) col = C.mesa[4];
        else if (Ht(up) < Ht(t) && up !== t) col = C.mesa[4];
        else if (sideLower) col = C.mesa[1];
        break;
      }
      case TT.CANYON: {
        const vv = f('path')(px, py) * 0.8 + hash2(px >> 1, py >> 1, 181) * 0.2 + dith * 0.1;
        col = vv < 0.38 ? C.canyon[1] : vv < 0.64 ? C.canyon[2] : C.canyon[3];
        const hh = hash2(px, py, 182);
        if (hh < 0.015) col = C.canyon[0]; else if (hh < 0.025) col = C.canyon[4];
        if (lowerBelow) col = C.canyon[1];
        break;
      }
      case TT.BASALT: {
        // hexagonal column tops
        const [id, e] = cellOf(px, py, 9, 191);
        const hv = hash2(id, 3, 192);
        col = e < 1.0 ? C.basalt[0] : hv < 0.3 ? C.basalt[1] : hv < 0.8 ? C.basalt[2] : C.basalt[3];
        const [idU, eU] = cellOf(px, py - 1, 9, 191);
        if (idU !== id && eU < 1.0 && e >= 1.0) col = C.basalt[4];
        if (lowerBelow) col = C.basalt[4];
        else if (Ht(up) < Ht(t) && up !== t) col = C.basalt[4];
        break;
      }
      case TT.ASH: {
        const vv = f('sand')(px, py) * 0.75 + hash2(px >> 1, py >> 1, 201) * 0.25 + dith * 0.1;
        col = vv < 0.4 ? C.ash[1] : vv < 0.66 ? C.ash[2] : C.ash[3];
        const hh = hash2(px, py, 202);
        if (hh < 0.02) col = C.ash[0]; else if (hh > 0.997) col = C.lava[3];
        if (lowerBelow) col = C.ash[1];
        break;
      }
      case TT.OBSIDIAN: {
        const [id, e] = cellOf(px, py, 11, 211);
        col = e < 1.1 ? C.obsidian[0] : hash2(id, 5, 212) < 0.5 ? C.obsidian[1] : C.obsidian[2];
        if (((px + py) % 9 === 0) && e > 2.5) col = C.obsidian[4];
        if (up !== t && !isLiq(up)) col = C.obsidian[3];
        if (lowerBelow) col = C.obsidian[0];
        break;
      }
      case TT.MYCEL: {
        const patch = f('forest')(px, py) + (hash2(px >> 2, py >> 2, 221) - 0.5) * 0.03;
        col = patch > 0.62 ? C.mycel[3] : patch < 0.38 ? C.mycel[1] : C.mycel[2];
        const hh = hash2(px, py, 222);
        if (hh < 0.004) col = C.spore[0]; else if (hh < 0.007) col = C.spore[1]; else if (hh > 0.985) col = C.mycel[4];
        if (lowerBelow) col = isLiq(dn) ? C.mycel[0] : C.mycel[1];
        break;
      }
      case TT.GLACIER: {
        // old blue ice: bands of colour, fine cracks, drifts of fresh snow, glints
        const band = f('big')(px, py) * 0.7 + f('sand')(px, py) * 0.3;
        col = band < 0.4 ? C.glacier[1] : band < 0.56 ? C.glacier[2] : C.glacier[3];
        const crack = Math.abs(valueNoise(px / 13, py / 7, 232) - 0.5);
        if (crack < 0.012) col = C.glacier[0]; else if (crack < 0.03 && ((px + py) & 1)) col = C.glacier[1];
        if (f('meadow')(px, py) > 0.64) col = hash2(px, py, 233) < 0.6 ? C.snow[4] : C.snow[3];
        if (((px * 3 + py * 5) % 41) === 0 && hash2(px >> 3, py >> 3, 234) < 0.5) col = C.glacier[4];
        if (lowerBelow) col = C.glacier[0];
        else if (higherAbove) col = C.glacier[1];
        break;
      }
      case TT.JUNGLE: {
        // lush jungle floor: deep greens in patches, fern fronds, leaf litter,
        // roots snaking across, the odd bright flower
        const patch = f('forest')(px, py) * 0.7 + f('moss')(px, py) * 0.3 + (hash2(px >> 2, py >> 2, 401) - 0.5) * 0.03;
        col = patch > 0.63 ? C.jungle[3] : patch > 0.5 ? C.jungle[2] : patch < 0.35 ? C.jungle[0] : C.jungle[1];
        const fx = (px + (py >> 1)) & 7, fy = py & 7;
        if (valueNoise(px * 0.21, py * 0.21, 402) > 0.6 && (fx === fy || fx === 7 - fy) && fy > 1) col = patch > 0.5 ? C.jungle[4] : C.jungle[3];
        const hh = hash2(px, py, 403);
        if (hh < 0.016) col = C.litter[1]; else if (hh < 0.026) col = C.litter[0];
        else if (hh > 0.998) col = C.jflower[Math.floor(hash2(px >> 1, py >> 1, 404) * 3)];
        if (Math.abs(valueNoise(px / 23, py / 11, 405) - 0.5) < 0.011) col = C.litter[2];
        if (lowerBelow) col = isLiq(dn) ? C.earth[1] : C.jungle[0];
        else if (higherAbove) col = C.jungle[0];
        break;
      }
      case TT.TAR: {
        // a glossy black pit: streaks of sheen, slow bubbles, a muddy rim
        const n = f('lava')(px, py) * 0.7 + f('big')(px, py) * 0.3;
        col = n > 0.6 ? C.tar[2] : n > 0.44 ? C.tar[1] : C.tar[0];
        const sheen = valueNoise(px * 0.09, py * 0.35, 411);
        if (sheen > 0.8) col = C.tar[4]; else if (sheen > 0.72 && ((px + py) & 1)) col = C.tar[3];
        const gx = Math.floor(px / 11), gy = Math.floor(py / 11);
        if (hash2(gx, gy, 413) < 0.3) {
          const bx = gx * 11 + 3 + hash2(gx, gy, 414) * 5, by = gy * 11 + 3 + hash2(gx, gy, 415) * 5, dd = Math.hypot(px + 0.5 - bx, py + 0.5 - by);
          if (dd < 2.4 && dd > 1.3) col = C.tar[3]; else if (dd <= 1.3) col = C.tar[2];
          if (Math.abs(px + 0.5 - (bx - 0.8)) < 0.6 && Math.abs(py + 0.5 - (by - 0.8)) < 0.6) col = C.tar[4];
        }
        if (typeAt(x - 2, y) !== t || typeAt(x + 2, y) !== t || typeAt(x, y - 2) !== t || typeAt(x, y + 2) !== t) col = typeAt(x - 1, y) !== t || typeAt(x + 1, y) !== t || typeAt(x, y - 1) !== t || typeAt(x, y + 1) !== t ? C.litter[2] : C.bog[1];
        break;
      }
      case TT.BOG: {
        const vv = f('grass')(px, py) * 0.75 + hash2(px >> 2, py >> 2, 241) * 0.25 + dith * 0.1;
        col = vv < 0.4 ? C.bog[1] : vv < 0.62 ? C.bog[2] : C.bog[3];
        if (f('moss')(px, py) > 0.62) col = C.marsh[vv > 0.5 ? 2 : 1];
        if (valueNoise(px * 0.12, py * 0.3, 242) > 0.8 && ((px + py * 2) & 3) === 0) col = RGB('#8a9a7a');
        if (lowerBelow) col = C.bog[0];
        break;
      }
      case TT.RUINS: {
        // big weathered flagstones, cracked, moss in the joints
        const lx = ((px % 12) + 12) % 12, ly = ((py % 8) + 8) % 8, row = Math.floor(py / 8);
        const jx = (((px + (row & 1) * 6) % 12) + 12) % 12;
        const joint = ly === 7 || jx === 11;
        const stone = hash2(Math.floor((px + (row & 1) * 6) / 12), row, 251);
        col = joint ? (f('moss')(px, py) > 0.55 ? C.moss[0] : C.ruins[0]) : stone < 0.3 ? C.ruins[2] : stone < 0.8 ? C.ruins[3] : C.ruins[4];
        if (!joint && hash2(px, py, 252) < 0.02) col = C.ruins[1];
        if (lowerBelow) col = C.ruins[1];
        void lx;
        break;
      }
      case TT.CLOUD: {
        // soft cumulus from above: rounded puffs, sunlit from the top-left,
        // lavender creases between them, a warm glint here and there
        const a = puff(px, py, 15, 261), b = puff(px + 5, py + 3, 9, 265);
        const q = a.d < b.d * 1.25 ? a : b;
        const lit = -(q.lx * 0.6 + q.ly * 0.8);
        const v = (1 - Math.min(1, q.d)) * 0.7 + lit * 0.35 + dith * 0.12;
        col = q.d > 0.96 ? C.cloud[1] : v > 0.62 ? C.cloud[4] : v > 0.36 ? C.cloud[3] : v > 0.12 ? C.cloud[2] : C.cloud[1];
        if (q.d < 0.5 && lit > 0.45 && hash2(px, py, 263) < 0.25) col = RGB('#fff4dc');
        if (lowerBelow) col = C.cloud[1];
        break;
      }
      case TT.STEPPE: {
        const patch = f('meadow')(px, py) + (hash2(px >> 2, py >> 2, 271) - 0.5) * 0.02;
        col = patch > 0.62 ? C.steppe[3] : patch < 0.36 ? C.steppe[1] : C.steppe[2];
        const sp = hash2(px, py, 272);
        if (sp < 0.02) col = C.steppe[0]; else if (sp > 0.98) col = C.steppe[4];
        if (lowerBelow) col = isLiq(dn) ? C.steppe[0] : C.steppe[1];
        break;
      }
      case TT.ARENA: {
        // raked sand in rings around the centre, then the paint on top
        const A = arena || { x: 0, z: 0, rx: 10, rz: 10 };
        const ex = (px + 0.5) / TILE - A.x, ez = (py + 0.5) / TILE - A.z;
        const q = Math.sqrt((ex / A.rx) ** 2 + (ez / A.rz) ** 2);
        const vv = f('sand')(px, py) * 0.55 + hash2(px >> 1, py >> 1, 402) * 0.3 + dith * 0.15;
        col = vv < 0.45 ? C.sand[2] : C.sand[3];
        const rr = q * A.rz * TILE + (valueNoise(px * 0.045, py * 0.045, 401) - 0.5) * 6;
        const fur = ((rr % 5) + 5) % 5;
        if (q < 1) {
          if (fur < 1) col = C.sand[1];
          else if (fur < 2 && hash2(px, py, 403) < 0.55) col = C.sand[4];
        } else col = hash2(px, py, 404) < 0.15 ? C.sand[1] : C.sand[2];      // packed under the wall
        const worn = hash2(px, py, 405) < 0.07;
        let paint = null;
        if (q > 0.918 && q < 0.968) paint = (q > 0.94 && q < 0.95) ? RING.borderHi : RING.border;
        else if (q > 0.897 && q < 0.907) paint = RING.line;
        else if (q > 0.548 && q < 0.559) paint = RING.mid;
        // the tail: three ribbons streaming west-north-west, tapering and fading out
        const ux = -0.876, uz = -0.482, along = ex * ux + ez * uz, across = -ex * uz + ez * ux;
        if (along > 0.6 && along < 8.2) {
          const k = (along - 0.6) / 7.6, bend = across - 0.05 * (along - 0.6) ** 2;
          for (let s = -1; s <= 1; s++) {
            const w = (0.3 - s * 0.02) * (1 - k) ** 0.8;
            if (Math.abs(bend - s * 0.66) < w && !(k > 0.62 && hash2(px, py, 406 + s) < (k - 0.62) * 2.6)) paint = RING.tail[s + 1];
          }
        }
        if (Math.abs(ex) < 2.8 && Math.abs(ez) < 2.8 && inPoly(starPts, px + 0.5, py + 0.5)) {
          const edge = !inPoly(starPts, px + 1.8, py + 0.5) || !inPoly(starPts, px - 0.8, py + 0.5) || !inPoly(starPts, px + 0.5, py + 1.8) || !inPoly(starPts, px + 0.5, py - 0.8);
          paint = edge ? RING.starEdge : (ex + ez < -0.6 && hash2(px, py, 407) < 0.7) ? RING.starHi : RING.star;
        }
        if (paint && !(worn && paint !== RING.starEdge)) col = paint;
        break;
      }
      case TT.HEATH: {
        // windswept moor: olive grass, drifts of purple heather, golden tufts
        const patch = f('grass')(px, py), bloom = f('moss')(px, py), gold = f('meadow')(px, py);
        col = patch > 0.6 ? C.heath[2] : patch < 0.38 ? C.heath[0] : C.heath[1];
        if (gold > 0.62 && hash2(px, py, 283) < 0.5) col = RGB('#b8a45a');
        if (bloom > 0.55) col = hash2(px, py, 281) < (bloom - 0.45) * 2.2 ? (hash2(px, py, 282) < 0.5 ? C.heath[3] : C.heath[4]) : RGB('#7a5a86');
        if (lowerBelow) col = C.heathCliff[4];
        else if (Ht(up) < Ht(t) && up !== t) col = C.heath[2];
        break;
      }
      // ---------------------------------------------------------- World v7: the Dawnlands
      case TT.BAMBOO: {
        // a bamboo grove's floor: drifts of pale fallen leaves over dark soil
        const patch = f('forest')(px, py) * 0.6 + f('moss')(px, py) * 0.4;
        col = patch > 0.6 ? C.bamboo[3] : patch > 0.47 ? C.bamboo[2] : patch < 0.36 ? C.bamboo[0] : C.bamboo[1];
        const gx = Math.floor(px / 5), gy = Math.floor(py / 4), hh = hash2(gx, gy, 421);
        if (hh < 0.34) {
          const lx = px - gx * 5, ly = py - gy * 4, dir = hash2(gx, gy, 422) < 0.5;
          if (ly < 3 && (dir ? lx === ly || lx === ly + 1 : lx === 3 - ly || lx === 4 - ly)) col = hh < 0.08 ? C.bambooLeaf[2] : hh < 0.2 ? C.bambooLeaf[1] : C.bambooLeaf[0];
        }
        if (hash2(px, py, 423) < 0.01) col = C.bamboo[0];
        if (lowerBelow) col = isLiq(dn) ? C.earth[1] : C.bamboo[0];
        else if (higherAbove) col = C.bamboo[0];
        break;
      }
      case TT.PADDY: {
        // flooded terraces: still water with the sky in it, rice shoots in rows,
        // and stone lips where one step drops to the next (steps follow contours)
        const lev = (qx, qy) => Math.floor(clampF('terr', qx, qy) * 14);
        const L0 = lev(px, py), Lu = lev(px, py - 1), Lu2 = lev(px, py - 2), Ld = lev(px, py + 1);
        const n = f('sand')(px, py);
        col = n > 0.6 ? C.paddy[3] : n > 0.42 ? C.paddy[2] : C.paddy[1];
        if (valueNoise(px * 0.07, py * 0.32, 425) > 0.77 && ((px + py) & 1)) col = C.paddy[4];
        const rx = ((px % 4) + 4) % 4, ry = ((py % 5) + 5) % 5;
        if (rx === 1 && ry <= 1) col = ry === 0 ? C.rice[2] : C.rice[1];
        else if ((rx === 0 || rx === 2) && ry === 1 && hash2(px >> 2, py, 426) < 0.5) col = C.rice[0];
        else if (rx === 1 && ry === 2) col = C.paddy[0];
        if (L0 < Lu) col = C.lip[0];                                 // the wall under a higher step
        else if (L0 < Lu2) col = C.lip[1];
        else if (L0 > Ld) col = C.lip[3];                            // the lit top of a lip
        else if (lev(px - 1, py) !== L0 || lev(px + 1, py) !== L0) col = C.lip[2];
        if (lowerBelow) col = C.lip[1];
        else if (higherAbove) col = C.lip[0];
        break;
      }
      case TT.SALT: {
        // a salt crust cracked into plates: raised white rims, a shadow in each crack
        const [id, e] = cellOf(px, py, 13, 431);
        const hv = hash2(id, 9, 432);
        col = hv < 0.3 ? C.salt[2] : hv < 0.88 ? C.salt[3] : C.saltPink[1];
        if (e < 0.9) col = C.salt[1];
        else if (e < 1.9) col = C.salt[4];
        else if (hash2(px >> 1, py >> 1, 433) < 0.05) col = C.salt[2];
        const dw = dWater[i] / 3;
        if (dw < 2.5 + dith * 2) col = dw < 1.2 ? C.salt[1] : C.salt[2];
        if (lowerBelow) col = C.salt[1];
        break;
      }
      case TT.AUTUMN: {
        // a deep carpet of fallen leaves: crimson & rust drifts, orange & gold leaves on top
        const patch = f('forest')(px, py) * 0.7 + f('big')(px, py) * 0.3;
        col = patch > 0.6 ? C.autumn[3] : patch > 0.48 ? C.autumn[2] : patch < 0.36 ? C.autumn[0] : C.autumn[1];
        const gx = Math.floor(px / 4), gy = Math.floor(py / 4);
        if (hash2(gx, gy, 441) < 0.62) {
          const dx = px - (gx * 4 + 1 + Math.floor(hash2(gx, gy, 442) * 2)), dy = py - (gy * 4 + 1 + Math.floor(hash2(gx, gy, 443) * 2));
          if (Math.abs(dx) + Math.abs(dy) <= 1) {
            const k = hash2(gx, gy, 444);
            col = k < 0.34 ? C.autumn[4] : k < 0.58 ? C.autumnGold[0] : k < 0.7 ? C.autumnGold[1] : k < 0.9 ? C.autumn[3] : C.autumn[2];
            if (dx === 1 || dy === 1) col = C.autumn[1];
          }
        }
        if (hash2(px, py, 445) < 0.008) col = C.autumn[0];
        if (lowerBelow) col = isLiq(dn) ? C.earth[1] : C.autumn[0];
        else if (higherAbove) col = C.autumn[0];
        break;
      }
      case TT.ROOTS: {
        // deep old moss, dark between the clumps, crossed by the giant trees' roots
        const patch = f('moss')(px, py) * 0.6 + f('forest')(px, py) * 0.4 + (hash2(px >> 2, py >> 2, 451) - 0.5) * 0.03;
        col = patch > 0.62 ? C.roots[4] : patch > 0.5 ? C.roots[3] : patch < 0.36 ? C.roots[1] : C.roots[2];
        if (hash2(px, py, 452) < 0.02) col = C.roots[0];
        if (onRoot(px, py)) col = !onRoot(px, py - 1) ? C.root[3] : !onRoot(px, py - 2) ? C.root[2] : C.root[1];
        else if (onRoot(px, py - 1) || onRoot(px, py - 2)) col = C.root[0];
        if (lowerBelow) col = isLiq(dn) ? C.earth[1] : C.roots[0];
        else if (higherAbove) col = C.roots[0];
        break;
      }
      case TT.MOOR: {
        // a Highland moor: patches of purple heather, grey-green grass and rusty bracken over dark peat
        const hv = f('moss')(px, py), gr = f('grass')(px, py), br = f('big')(px, py) * 0.6 + f('rock')(px, py) * 0.4;
        col = gr > 0.56 ? C.moorGrass[1] : gr > 0.44 ? C.moorGrass[0] : C.moor[2];
        if (hv > 0.57) col = hash2(px, py, 462) < 0.72 ? (hv > 0.65 ? RGB('#9a7090') : RGB('#7c5a76')) : C.moor[3];
        else if (br > 0.6 && hash2(px, py, 465) < 0.8) col = br > 0.66 ? RGB('#a0663c') : RGB('#84563a');
        const hh = hash2(px, py, 461);
        if (hh < 0.04) col = C.moorGrass[2]; else if (hh > 0.988) col = C.moor[0];
        if (lowerBelow) col = C.moor[0];
        else if (higherAbove) col = C.moor[1];
        break;
      }
      case TT.CRYSTAL: {
        // lilac ground set with crystal facets (lit on the top-left, shaded on the
        // bottom-right) and the odd rainbow glint
        const g0 = f('meadow')(px, py);
        col = g0 > 0.58 ? C.crystal[3] : g0 < 0.4 ? C.crystal[1] : C.crystal[2];
        const [id, e, lx, ly] = cellPt(px, py, 9, 471);
        if (hash2(id, 3, 472) < 0.36) col = e < 1 ? C.crystal[0] : lx + ly < -1.5 ? C.crystal[4] : lx + ly > 1.5 ? C.crystal[1] : C.crystal[3];
        if (hash2(px, py, 473) < 0.004) col = C.prism[Math.floor(hash2(px >> 1, py >> 1, 474) * 4)];
        if (lowerBelow) col = C.crystal[0];
        else if (higherAbove) col = C.crystal[1];
        break;
      }
      case TT.COBBLE: {
        // round cobbles in dark mortar, each lit on its top
        const [id, e, , ly] = cellPt(px, py, 5, 481);
        const hv = hash2(id, 5, 482);
        col = e < 0.9 ? C.cobble[0] : ly < -0.8 ? C.cobble[4] : hv < 0.3 ? C.cobble[2] : hv < 0.85 ? C.cobble[3] : RGB('#a8947a');
        if (ly > 1.4 && e >= 0.9) col = C.cobble[1];
        if (lowerBelow) col = C.cobble[0];
        break;
      }
      case TT.METAL: {
        // riveted brass plates in a running bond, brushed streaks, dark seams, a gear engraved here and there
        const ty = Math.floor(py / 16), by = ((py % 16) + 16) % 16, sx = (((px + (ty & 1) * 8) % 16) + 16) % 16;
        const hv = hash2(Math.floor((px + (ty & 1) * 8) / 16), ty, 491);
        col = hv < 0.35 ? C.metal[2] : C.metal[3];
        if (((py + (px >> 3)) % 5 === 0) && hash2(px >> 2, py, 492) < 0.45) col = hv < 0.5 ? C.metal[3] : C.metal[4];
        if (hv > 0.84) { const dx = sx - 8, dy = by - 8, rr = Math.hypot(dx, dy); if ((rr > 2.4 && rr < 3.6) || (rr >= 3.6 && rr < 5 && ((Math.atan2(dy, dx) * 8 / Math.PI) & 1))) col = C.metal[1]; }
        if (by === 0 || sx === 0) col = C.metal[0];
        else if (by === 1 || sx === 1) col = C.metal[4];
        else if (by === 15 || sx === 15) col = C.metal[1];
        if ((sx === 3 || sx === 13) && (by === 3 || by === 12)) col = C.metal[4];
        else if ((sx === 3 || sx === 13) && (by === 4 || by === 13)) col = C.metal[0];
        if (lowerBelow) col = C.metal[4];
        else if (Ht(up) < Ht(t) && up !== t) col = C.metal[4];
        break;
      }
      case TT.TUNDRA: {
        // frozen sage ground heaved into polygons, frost in the cracks, lichens, snow patches
        const patch = f('grass')(px, py) * 0.7 + f('big')(px, py) * 0.3;
        col = patch > 0.6 ? C.tundra[3] : patch > 0.46 ? C.tundra[2] : C.tundra[1];
        const snow = f('meadow')(px, py);
        const [, e] = cellOf(px, py, 21, 501);
        if (e < 1.3) col = snow > 0.5 ? C.snow[3] : C.tundra[0];
        const hh = hash2(px, py, 502);
        if (hh < 0.012) col = C.lichen[Math.floor(hash2(px >> 1, py >> 1, 503) * 3)];
        else if (hh > 0.99) col = C.tundra[4];
        if (snow > 0.66) col = hash2(px, py, 504) < 0.7 ? C.snow[4] : C.snow[3];
        if (lowerBelow) col = C.tundra[0];
        else if (higherAbove) col = C.tundra[1];
        break;
      }
      case TT.UMBRAL: {
        // black glass in big shards; violet light seeps up through some cracks
        const [id, e, lx, ly] = cellPt(px, py, 17, 511);
        const hv = hash2(id, 7, 512);
        col = hv < 0.4 ? C.umbral[1] : hv < 0.8 ? C.umbral[2] : C.umbral[3];
        if (lx + ly < -4 && hv > 0.3) col = C.umbral[hv > 0.8 ? 4 : 3];
        const lit = valueNoise(px / 40, py / 40, 513) > 0.5;
        if (e < 0.8) col = lit ? C.vein[2] : C.umbral[0];
        else if (e < 1.7) col = lit ? C.vein[1] : C.umbral[0];
        else if (e < 2.5 && lit && hash2(px, py, 514) < 0.5) col = C.vein[0];
        if (lowerBelow) col = C.umbral[0];
        break;
      }
      case TT.CRAG: {
        // a mountain's bare rock: cracked, lichen-spotted; snow on the cold heights,
        // red in the desert, black by the volcano, pale granite, green-topped karst
        const zc = zoneOf(x, y), e = elevT[i], P = cragTop(zc);
        const vv = f('rock')(px, py) * 0.8 + hash2(px >> 2, py >> 2, 621) * 0.2 + dith * 0.12;
        col = vv < 0.38 ? P[2] : vv < 0.62 ? P[3] : P[4];
        if (Math.abs(valueNoise(px / 9, py / 9, 622) - 0.5) < 0.02) col = P[1];
        if (hash2(px, py, 624) < 0.012) col = P[0];
        if (COLDZ.has(zc) && e >= 2 && f('meadow')(px, py) > 0.56 - (e - 2) * 0.12) col = hash2(px, py, 623) < 0.8 ? C.snow[4] : C.snow[3];
        else if ((zc === JADE || zc === GLOWZ) && f('moss')(px, py) > 0.5) col = f('forest')(px, py) > 0.55 ? C.jungle[3] : C.jungle[2];
        if (lowerBelow) col = P[4];
        break;
      }
      case TT.SINTER: {
        // a hot spring's crust: pale silica in scalloped terracettes, rust & orange mats where the runoff flows
        const vv = f('sand')(px, py) * 0.7 + hash2(px >> 1, py >> 1, 631) * 0.3 + dith * 0.1;
        col = vv < 0.4 ? C.sinter[2] : vv < 0.7 ? C.sinter[3] : C.sinter[4];
        // (the runoff: rust & orange mats thick by the springs, rarer further off)
        const dw = dWater[i] / 3, near = Math.max(0, 1 - dw / 70);
        const run = valueNoise(px / 18 + valueNoise(px / 40, py / 40, 634) * 3, py / 14, 632);
        if (run > 0.76 - near * 0.2) col = run > 0.8 - near * 0.12 ? C.mats[0] : run > 0.78 - near * 0.16 ? C.mats[1] : C.mats[2];
        if (dw < 3.5 + dith * 2) col = dw < 1.5 ? C.mats[2] : dw < 2.5 ? C.mats[1] : C.mats[0];
        if (Math.abs(valueNoise(px / 8, py / 8, 633) - 0.5) < 0.016) col = C.sinter[1];
        if (lowerBelow) col = C.sinter[1];
        break;
      }
      default: col = [255, 0, 255];
    }
    if (bankK) col = [col[0] * bankK, col[1] * bankK, col[2] * bankK];
    // (World v7) terraces: the higher, the lighter; a bright lip on the south rim, a thin shade on the north one
    const e = elevT[i];
    if (!bankK && (e >= 2 || (e === 1 && !HIGH.has(t)))) {
      const k = 1 + Math.max(0, e - 1) * 0.035 + (y < PH - 1 && elevT[i + PW] < e ? 0.16 : 0) - (y > 0 && elevT[i - PW] < e ? 0.1 : 0);
      if (k !== 1) col = [col[0] * k, col[1] * k, col[2] * k];
    }
    put(i, col);
  }

  // ---------- Pass 4: decals
  stampDecals(img, PW, PH, types, tx0, tz0, tileAt, faceD);

  // ---------- the chunk, out of the window
  const S = CH * TILE, out = new Uint8ClampedArray(S * S * 4), o0 = M * TILE;
  for (let y = 0; y < S; y++) out.set(img.subarray(((y + o0) * PW + o0) * 4, ((y + o0) * PW + o0 + S) * 4), y * S * 4);
  return out;
}

// Two-pass chamfer distance transform with integer 3-4 weights (Uint16, clamped).
function chamfer16(W, H, isSrc) {
  const MAX = 65000;
  const d = new Uint16Array(W * H);
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

// ---------- Decals (same patterns & placement as the valley's)
const DECALS = {
  tuftA: ['l...l', 'm.l.m', '.mam.'], tuftB: ['.l.', 'lml', 'mam'], tuftC: ['l.l..l', 'm.m.lm', '.a.am.'], tuftD: ['m.m', '.a.'],
  tuftE: ['..l', 'l.m', 'mam'], tuftF: ['l.l', 'mlm', '.a.'],
  flowerW: ['.w.', 'wyw', '.w.'], flowerP: ['.p.', 'pyp', '.p.'], flowerB: ['.b.', 'byb', '.b.'], flowerY: ['.y.', 'yoy', '.y.'],
  bud: ['p.', 'm.'], dotW: ['w'], dotP: ['p'], dotY: ['y'], clover: ['.c.', 'cmc', '.c.'], pebble: ['l.', 'dd'], pebble2: ['.l', 'dd', '.d'],
  shell: ['.q.', 'qrq'], star: ['.o.', 'ooo', 'o.o'], leaf: ['.o', 'oO'], twig: ['t..', '.tt'], mush: ['rrr', 'wsw', '.s.'],
  fern: ['l.l.l', '.mmm.', '..a..'], puddle: ['.bb.', 'bwbb', '.bb.'], petal: ['p.', '.p'],
  // big world
  cactus: ['.m.', 'mmm', '.m.', '.a.'], bones: ['w.w', '.w.', 'w.w'], ember: ['o'], glowdot: ['g'], shroom: ['pp', 'ss'],
  heather: ['p.p', '.m.'], ripple: ['ll', '..'], crack: ['d..', '.dd'],
  frond: ['l.l.l.l', '.lmmml.', '..mam..', '.l.a.l.'], sprig: ['l.l', '.m.', 'lal'], orchid: ['p.p', '.y.', 'p.p'],
  // World v7
  shoot: ['.l.', '.m.', 'lml', 'mam'], acorn: ['.t.', 'OoO', '.O.'], shard: ['.o.', 'olo', '.o.'], glint: ['o'],
  saltstar: ['o.o', '.l.', 'o.o'], tuftG: ['m.m.m', '.mam.'],
};
const PAL = {
  grass: { a: '#356e46', m: '#4b8a4c', l: '#94cc66', w: '#fff8ec', y: '#ffd66b', p: '#f4a4b6', b: '#8fc8f0', o: '#e8883a', c: '#4f9150' },
  meadow: { a: '#44804a', m: '#5a9a50', l: '#b0dc7a', w: '#fffdf4', y: '#ffe07a', p: '#f7a9c4', b: '#9fd0f5', o: '#f0934a', c: '#5a9a52' },
  forest: { a: '#234a36', m: '#2f6243', l: '#5f9a55', o: '#b8743a', O: '#8a4f2a', t: '#6b4330', r: '#d9594c', w: '#fff3e0', s: '#e9dcc8' },
  path: { l: '#e0c595', d: '#7a5a3c' },
  sand: { q: '#f7d6c9', r: '#e3a896', o: '#ef9a6b', l: '#fff4d8', d: '#b99a68' },
  rock: { l: '#c9c4c4', d: '#6a6571' },
  snow: { l: '#ffffff', d: '#8f9cc0', m: '#7f9a78', a: '#5f7a60' },
  marsh: { l: '#a8b070', m: '#6f8a4c', a: '#3f5a3a', b: '#6f9cc8', w: '#eef6e0', y: '#e8d06a', p: '#d9a0c0' },
  petals: { a: '#44804a', m: '#5a9a50', l: '#b0dc7a', w: '#fff4f8', y: '#ffe07a', p: '#f7a9c4', b: '#9fd0f5', o: '#f0934a', c: '#5a9a52' },
  dune: { m: '#6a9a4a', a: '#4a7a3a', w: '#fff4e0', l: '#fae3b4', d: '#b8864a' },
  steppe: { a: '#6a5a2a', m: '#8a7a3a', l: '#f0e0a0', w: '#fff8e0', y: '#ffe07a', p: '#e8a0b0', o: '#e8883a' },
  mycel: { g: '#8ff0e8', p: '#f7a4e0', s: '#e8dcf8', l: '#a08ad0', d: '#2a1e40', m: '#5c4688', a: '#3a2a58' },
  heath: { p: '#c89ae0', m: '#6e7a58', a: '#4a5a3a', l: '#d8b0f0', w: '#f4eaf8' },
  ash: { o: '#ff8a3a', d: '#4a4448', l: '#b4aeb2' },
  canyon: { l: '#f0c8a0', d: '#6a3a2a' },
  bog: { b: '#6a8a7a', w: '#c8d8c0', m: '#5a6a3a', a: '#3a4a2a', l: '#8a9a5a', y: '#d8c85a' },
  glacier: { l: '#ffffff', d: '#6a98cc' },
  jungle: { a: '#1c4428', m: '#2e6a3a', l: '#6aac4c', o: '#8a6232', O: '#6b4a2a', t: '#5a3e24', p: '#f06a8a', y: '#ffd04a', w: '#fff3e0', r: '#e8583a', s: '#e9dcc8' },
  tar: { w: '#e8dfc8', b: '#4a3e62', l: '#9a8ac4' },
  bamboo: { l: '#c8d070', m: '#7a9a3a', a: '#4a6a2a', o: '#d6d488', O: '#989848', t: '#6a5a3a' },
  autumn: { r: '#d9594c', w: '#fff3e0', s: '#e9dcc8', o: '#b87838', O: '#6a3a24', t: '#4a2a1a', l: '#f2c858', m: '#a23822', a: '#6a2a1e' },
  roots: { a: '#1c3020', m: '#2e5a34', l: '#5e9a4a', r: '#e8c86a', w: '#f4ecd8', s: '#d8ccb0', o: '#8a6a3a', O: '#5a4028', t: '#4a3424' },
  moor: { p: '#94708a', m: '#5a5e4e', a: '#3a2f3c', l: '#a0a488', d: '#2a222c', w: '#c8c4bc' },
  crystal: { o: '#f6f2ff', l: '#8ad8ff', d: '#6a5a98' },
  prism: { o: '#ff8ac8' },
  tundra: { l: '#b0bcaa', m: '#728272', a: '#46524a', d: '#3a443c', y: '#e8d070', o: '#d6764a' },
  umbral: { o: '#c890ff', l: '#e8d0ff' },
  salt: { o: '#ffffff', l: '#f8f0f4', d: '#c6bac4' },
};
const LEAF = [{ o: '#d9543c', O: '#9a3a28' }, { o: '#e8883a', O: '#b85f30' }, { o: '#f0c050', O: '#c8903a' }, { o: '#c8453a', O: '#8a3028' }];
const TUFTS = ['tuftA', 'tuftB', 'tuftC', 'tuftD', 'tuftE', 'tuftF'];

function stampDecals(D, PW, PH, types, tx0, tz0, tileAt, faceD) {
  const put = (x, y, hex) => {
    if (x < 0 || y < 0 || x >= PW || y >= PH) return;
    const o = (y * PW + x) * 4, n = parseInt(hex.slice(1), 16);
    D[o] = (n >> 16) & 255; D[o + 1] = (n >> 8) & 255; D[o + 2] = n & 255;
  };
  const fits = (x, y, pat, t) => {
    for (let j = -1; j <= pat.length; j++) for (let i = -1; i <= pat[0].length; i++) {
      const xx = x + i, yy = y + j;
      if (xx < 0 || yy < 0 || xx >= PW || yy >= PH) return false;
      const k = yy * PW + xx;
      if (types[k] !== t || faceD[k] || (k >= PW && faceD[k - PW])) return false;
    }
    return true;
  };
  const stamp = (x, y, name, p, t) => {
    const pat = DECALS[name];
    if (!fits(x, y, pat, t)) return;
    pat.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] !== '.' && p[row[i]]) put(x + i, y + j, p[row[i]]); });
  };
  const TW = PW / TILE;
  for (let ty = -1; ty <= TW; ty++) for (let tx = -1; tx <= TW; tx++) {
    const wx = tx0 + tx, wz = tz0 + ty;
    const t = tileAt(wx, wz);
    const bx = tx * TILE, by = ty * TILE;
    const r = (k) => hash2(wx, wz, 100 + k);
    const at = (k) => [bx + Math.floor(r(k * 2) * 12) + 1, by + Math.floor(r(k * 2 + 1) * 12) + 1];
    if (t === TT.GRASS) {
      if (r(1) < 0.8) { const [x, y] = at(1); stamp(x, y, TUFTS[Math.floor(r(2) * 6)], PAL.grass, t); }
      if (r(3) < 0.45) { const [x, y] = at(2); stamp(x, y, TUFTS[Math.floor(r(4) * 6)], PAL.grass, t); }
      if (r(7) < 0.12) { const [x, y] = at(5); stamp(x, y, 'clover', PAL.grass, t); }
      if (r(5) < 0.1) { const [x, y] = at(3); stamp(x, y, ['flowerW', 'flowerY', 'dotW', 'dotY', 'bud'][Math.floor(r(6) * 5)], PAL.grass, t); }
    } else if (t === TT.MEADOW) {
      if (r(1) < 0.7) { const [x, y] = at(1); stamp(x, y, TUFTS[Math.floor(r(2) * 6)], PAL.meadow, t); }
      for (let k = 0; k < 3; k++) if (r(10 + k) < 0.5) { const [x, y] = at(4 + k); stamp(x, y, ['flowerW', 'flowerP', 'flowerB', 'flowerY', 'dotW', 'dotP', 'dotY'][Math.floor(r(20 + k) * 7)], PAL.meadow, t); }
    } else if (t === TT.FOREST) {
      if (r(1) < 0.6) { const [x, y] = at(1); stamp(x, y, ['leaf', 'twig', 'tuftA', 'tuftB', 'tuftD', 'fern'][Math.floor(r(2) * 6)], PAL.forest, t); }
      if (r(3) < 0.06) { const [x, y] = at(2); stamp(x, y, 'mush', PAL.forest, t); }
    } else if (t === TT.PATH) {
      if (r(1) < 0.25) { const [x, y] = at(1); stamp(x, y, r(2) < 0.5 ? 'pebble' : 'pebble2', PAL.path, t); }
    } else if (t === TT.SAND) {
      if (r(1) < 0.07) { const [x, y] = at(1); stamp(x, y, r(2) < 0.7 ? 'shell' : 'star', PAL.sand, t); }
      if (r(3) < 0.2) { const [x, y] = at(2); stamp(x, y, 'pebble', PAL.sand, t); }
    } else if (t === TT.ROCK) {
      if (r(1) < 0.3) { const [x, y] = at(1); stamp(x, y, 'pebble2', PAL.rock, t); }
    } else if (t === TT.SNOW) {
      if (r(1) < 0.12) { const [x, y] = at(1); stamp(x, y, 'tuftD', PAL.snow, t); }
      if (r(3) < 0.18) { const [x, y] = at(2); stamp(x, y, 'pebble', PAL.snow, t); }
    } else if (t === TT.LEAVES) {
      for (let k = 0; k < 3; k++) if (r(10 + k) < 0.7) { const [x, y] = at(4 + k); stamp(x, y, 'leaf', LEAF[Math.floor(r(20 + k) * 4)], t); }
      if (r(3) < 0.2) { const [x, y] = at(2); stamp(x, y, 'twig', PAL.forest, t); }
      if (r(5) < 0.04) { const [x, y] = at(3); stamp(x, y, 'mush', PAL.forest, t); }
    } else if (t === TT.MARSH) {
      if (r(1) < 0.7) { const [x, y] = at(1); stamp(x, y, ['tuftA', 'tuftC', 'tuftE'][Math.floor(r(2) * 3)], PAL.marsh, t); }
      if (r(3) < 0.25) { const [x, y] = at(2); stamp(x, y, 'puddle', PAL.marsh, t); }
      if (r(5) < 0.08) { const [x, y] = at(3); stamp(x, y, r(6) < 0.5 ? 'flowerY' : 'dotW', PAL.marsh, t); }
    } else if (t === TT.PETALS) {
      if (r(1) < 0.55) { const [x, y] = at(1); stamp(x, y, TUFTS[Math.floor(r(2) * 6)], PAL.petals, t); }
      for (let k = 0; k < 2; k++) if (r(10 + k) < 0.55) { const [x, y] = at(4 + k); stamp(x, y, ['flowerP', 'dotP', 'dotW', 'petal'][Math.floor(r(20 + k) * 4)], PAL.petals, t); }
    } else if (t === TT.HILL) {
      if (r(1) < 0.7) { const [x, y] = at(1); stamp(x, y, TUFTS[Math.floor(r(2) * 6)], PAL.meadow, t); }
      for (let k = 0; k < 2; k++) if (r(10 + k) < 0.45) { const [x, y] = at(4 + k); stamp(x, y, ['flowerW', 'flowerB', 'flowerY', 'dotW', 'dotY'][Math.floor(r(20 + k) * 5)], PAL.meadow, t); }
    }
    // ---- the big world
    else if (t === TT.DUNE) {
      if (r(1) < 0.035) { const [x, y] = at(1); stamp(x, y, r(2) < 0.7 ? 'cactus' : 'bones', PAL.dune, t); }
    } else if (t === TT.STEPPE) {
      if (r(1) < 0.75) { const [x, y] = at(1); stamp(x, y, TUFTS[Math.floor(r(2) * 6)], PAL.steppe, t); }
      if (r(3) < 0.4) { const [x, y] = at(2); stamp(x, y, TUFTS[Math.floor(r(4) * 6)], PAL.steppe, t); }
      if (r(5) < 0.08) { const [x, y] = at(3); stamp(x, y, ['flowerY', 'dotW', 'flowerP'][Math.floor(r(6) * 3)], PAL.steppe, t); }
    } else if (t === TT.MYCEL) {
      if (r(1) < 0.5) { const [x, y] = at(1); stamp(x, y, r(2) < 0.5 ? 'glowdot' : 'shroom', PAL.mycel, t); }
      if (r(3) < 0.35) { const [x, y] = at(2); stamp(x, y, TUFTS[Math.floor(r(4) * 6)], { l: '#a08ad0', m: '#5c4688', a: '#3a2a58' }, t); }
    } else if (t === TT.HEATH) {
      for (let k = 0; k < 2; k++) if (r(10 + k) < 0.6) { const [x, y] = at(4 + k); stamp(x, y, k ? 'heather' : TUFTS[Math.floor(r(20 + k) * 6)], PAL.heath, t); }
    } else if (t === TT.ASH) {
      if (r(1) < 0.2) { const [x, y] = at(1); stamp(x, y, r(2) < 0.6 ? 'pebble' : 'ember', PAL.ash, t); }
    } else if (t === TT.CANYON) {
      if (r(1) < 0.3) { const [x, y] = at(1); stamp(x, y, r(2) < 0.5 ? 'pebble' : 'pebble2', PAL.canyon, t); }
      if (r(3) < 0.05) { const [x, y] = at(2); stamp(x, y, 'cactus', PAL.dune, t); }
    } else if (t === TT.BOG) {
      if (r(1) < 0.4) { const [x, y] = at(1); stamp(x, y, r(2) < 0.5 ? 'puddle' : 'tuftC', PAL.bog, t); }
    } else if (t === TT.GLACIER) {
      if (r(1) < 0.2) { const [x, y] = at(1); stamp(x, y, 'crack', PAL.glacier, t); }
    } else if (t === TT.JUNGLE) {
      if (r(1) < 0.7) { const [x, y] = at(1); stamp(x, y, ['frond', 'sprig', 'fern', 'leaf', 'twig', 'tuftB'][Math.floor(r(2) * 6)], PAL.jungle, t); }
      if (r(3) < 0.35) { const [x, y] = at(2); stamp(x, y, ['sprig', 'frond', 'tuftE'][Math.floor(r(4) * 3)], PAL.jungle, t); }
      if (r(5) < 0.06) { const [x, y] = at(3); stamp(x, y, r(6) < 0.5 ? 'orchid' : 'mush', PAL.jungle, t); }
    } else if (t === TT.TAR) {
      if (r(1) < 0.12) { const [x, y] = at(1); stamp(x, y, 'bones', PAL.tar, t); }
    }
    // ---- World v7: the Dawnlands
    else if (t === TT.BAMBOO) {
      if (r(1) < 0.25) { const [x, y] = at(1); stamp(x, y, 'shoot', PAL.bamboo, t); }
      if (r(3) < 0.3) { const [x, y] = at(2); stamp(x, y, r(4) < 0.5 ? 'leaf' : 'twig', PAL.bamboo, t); }
    } else if (t === TT.AUTUMN) {
      for (let k = 0; k < 2; k++) if (r(10 + k) < 0.5) { const [x, y] = at(4 + k); stamp(x, y, 'leaf', LEAF[Math.floor(r(20 + k) * 4)], t); }
      if (r(3) < 0.12) { const [x, y] = at(2); stamp(x, y, r(4) < 0.6 ? 'acorn' : 'mush', PAL.autumn, t); }
      if (r(5) < 0.15) { const [x, y] = at(3); stamp(x, y, 'twig', PAL.autumn, t); }
    } else if (t === TT.ROOTS) {
      if (r(1) < 0.45) { const [x, y] = at(1); stamp(x, y, ['fern', 'tuftB', 'tuftD', 'sprig'][Math.floor(r(2) * 4)], PAL.roots, t); }
      if (r(3) < 0.07) { const [x, y] = at(2); stamp(x, y, 'mush', PAL.roots, t); }
    } else if (t === TT.MOOR) {
      if (r(1) < 0.5) { const [x, y] = at(1); stamp(x, y, r(2) < 0.6 ? 'tuftG' : 'heather', PAL.moor, t); }
      if (r(3) < 0.1) { const [x, y] = at(2); stamp(x, y, 'pebble', PAL.moor, t); }
    } else if (t === TT.CRYSTAL) {
      if (r(1) < 0.3) { const [x, y] = at(1); stamp(x, y, r(2) < 0.6 ? 'shard' : 'glint', r(6) < 0.3 ? PAL.prism : PAL.crystal, t); }
    } else if (t === TT.TUNDRA) {
      if (r(1) < 0.4) { const [x, y] = at(1); stamp(x, y, TUFTS[Math.floor(r(2) * 6)], PAL.tundra, t); }
      if (r(3) < 0.15) { const [x, y] = at(2); stamp(x, y, 'pebble2', PAL.tundra, t); }
    } else if (t === TT.UMBRAL) {
      if (r(1) < 0.12) { const [x, y] = at(1); stamp(x, y, r(2) < 0.5 ? 'glint' : 'shard', PAL.umbral, t); }
    } else if (t === TT.SALT) {
      if (r(1) < 0.1) { const [x, y] = at(1); stamp(x, y, 'saltstar', PAL.salt, t); }
    }
  }
}
