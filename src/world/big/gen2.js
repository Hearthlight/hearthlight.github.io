// World v7: the Wide Sea and the Dawnlands (continent 2), east of the
// Hearthlands. Called by generateBig (gen.js) once the Hearthlands are made,
// with its helpers. A landmass with a noisy coast and two bays is split into
// zones by a warped Voronoi of the Dawnlands’ own seeds (soft ecotones), and
// given relief: each zone has a height field (blended across its borders, eased
// down to the beaches), then its landmarks — every land borrows from a great
// park somewhere: a Norwegian fjord (Lantern Bay), Zhangjiajie’s pillars over
// Longji’s rice terraces (Jade Terraces), Uyuni’s mirror & Pamukkale’s white
// stairs (Saltmirror Flats), a Kyoto autumn (Emberleaf Wood), Ha Long’s stacks
// round a glowing bay (Glowtide Coast), Yosemite’s valley & falls under a
// colossal tree (Elderbough), Skye’s pinnacles (Hollowmoor), Yellowstone’s
// rainbow springs & geysers (Prism Springs), the Alps (Cogsworth Heights),
// Glacier’s peaks & turquoise lakes (Aurora Tundra), the Giant’s Causeway
// (the Umbral Scar). Whale Isle and Pelican Rock sit in the sea. Pure &
// deterministic, like gen.js.

import { TT, HIGH } from '../tiles.js';
import { rng, hash2 } from '../../engine/util.js';
import { ZONES, C1, C2 } from './layout.js';

// the places the story & the systems need (hubs, landmarks)
export const DAWN = {
  lanternport: [782, 64], monastery: [806, -116], saltworks: [800, 226], harvestholm: [894, 186],
  stiltwater: [1010, 282], greatTree: [958, 68], rootholm: [960, 94], candlewick: [1128, 122],
  lodge: [1206, 252], cogsworth: [1250, -72], auroraCamp: [1046, -110], scarGate: [1318, 96],
  whale: [602, 62], blowholeInn: [606, 60], pelicanRock: [556, 112],
  whiteStairs: [832, 212], prismatic: [1238, 236], punctual: [1176, 262], halfDome: [1044, 16], elCap: [928, 20], falls: [1000, 26],
  storr: [1212, 70], cogswhorn: [1300, -124], causeway: [1424, 120],
};
const HUBS = [DAWN.lanternport, DAWN.monastery, DAWN.saltworks, DAWN.harvestholm, DAWN.greatTree, DAWN.candlewick, DAWN.lodge, DAWN.cogsworth, DAWN.auroraCamp, DAWN.scarGate];
const LAND = new Set(['harbor', 'jade', 'salt', 'autumn', 'glow', 'elder', 'moor', 'prism', 'clock', 'tundra', 'scar']);
// the roads (kept clear of pillars & crags; carved last, with stairs where they climb)
const [LPx, LPz] = DAWN.lanternport, [MOx, MOz] = DAWN.monastery, [SWx, SWz] = DAWN.saltworks, [HHx, HHz] = DAWN.harvestholm;
const [STx, STz] = DAWN.stiltwater, [RHx, RHz] = DAWN.rootholm, [CAx, CAz] = DAWN.candlewick, [LOx, LOz] = DAWN.lodge;
const [CWx, CWz] = DAWN.cogsworth, [ACx, ACz] = DAWN.auroraCamp;
const ROADS = [
  [[LPx + 24, LPz - 4], [LPx + 40, LPz + 2], [846, 76], [896, 72], [940, 76], [RHx - 6, RHz]],        // the Dawn Road
  [[LPx + 2, LPz - 9], [LPx - 6, 30], [790, 0], [794, -36], [800, -72], [MOx, MOz + 12]],            // the Pilgrims’ Way
  [[LPx + 2, LPz + 9], [772, 104], [782, 146], [792, 186], [SWx, SWz - 6]],                           // the Salt Road
  [[RHx - 2, RHz + 4], [958, 116], [930, 150], [906, 174], [HHx + 4, HHz - 4]],
  [[HHx + 8, HHz + 6], [928, 222], [966, 252], [STx - 16, STz - 8]],
  [[RHx + 6, RHz], [1020, 90], [1066, 100], [1102, 112], [CAx - 6, CAz]],
  [[CAx + 4, CAz + 6], [1152, 168], [1180, 212], [LOx - 4, LOz - 6]],
  [[RHx, RHz - 12], [986, 30], [994, 0], [1004, -30], [1024, -70], [ACx, ACz + 6]],
  [[ACx + 8, ACz], [1100, -104], [1160, -100], [1200, -98], [CWx - 40, CWz - 2]],
  [[CAx + 8, CAz - 2], [1190, 112], [1250, 104], [DAWN.scarGate[0] - 4, DAWN.scarGate[1]]],
];
const nearRoad = (x, z, d) => ROADS.some((pts) => pts.some((p, k) => {
  if (!k) return false;
  const [ax, az] = pts[k - 1], [bx, bz] = p, L2 = (bx - ax) ** 2 + (bz - az) ** 2 || 1;
  const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / L2));
  return Math.hypot(x - ax - (bx - ax) * t, z - az - (bz - az) * t) < d;
}));

export function generateDawn(K) {
  const { g, zone, keep, elev, I, inb, get, set, zid, N, ell, line, walk, raise, mountain, baseRelief, dryNear, clearMark, poi, pois, island, road, distTo, Z, ZI, dives, whirlpools } = K;
  const seed = K.seed;
  const each = (x0, z0, x1, z1, fn) => { for (let z = Math.max(z0, -192); z < Math.min(z1, 320); z++) for (let x = x0; x < Math.min(x1, 1448); x++) if (inb(x, z)) fn(x, z, I(x, z)); };
  const E = (x, z) => (inb(x, z) ? elev[I(x, z)] : 0);
  const inZ = (id) => (tt, x, z) => zid(x, z) === id && tt !== TT.WATER;

  // ---------------------------------------------------------------- 1. the Hearthlands’ seas deepen into the Wide Sea
  each(C1.x1 - 44, C1.z0, C1.x1, C1.z1, (x, z, i) => {
    if (g[i] === TT.WATER && Z[zone[i]] !== 'wide' && !LAND.has(Z[zone[i]]) && Z[zone[i]] !== 'dino' && x >= C1.x1 - 22 + (N(x, z, 503, 0.03, 2) - 0.5) * 34) zone[i] = ZI.wide;
  });
  each(C1.x0, C1.z1 - 30, C1.x1, C1.z1, (x, z, i) => {
    if (g[i] === TT.WATER && ['sea', 'straits', 'lagoon', 'sunken'].includes(Z[zone[i]]) && z >= C1.z1 - 12 + (N(x, z, 505, 0.03, 2) - 0.5) * 22) zone[i] = ZI.wide;
  });
  for (let k = dives.length - 1; k >= 0; k--) if (zid(Math.floor(dives[k].x), Math.floor(dives[k].z)) === 'wide') dives.splice(k, 1);

  // ---------------------------------------------------------------- 2. the landmass (a squarish blob, a noisy coast, two bays)
  const CX = 1064, CZ = 64, RX = 382, RZ = 244;
  const BAYS = [{ x: 740, z: 64, rx: 34, rz: 24, id: 'harbor' }, { x: 1032, z: 304, rx: 50, rz: 30, id: 'glow' }];
  const bayOf = (x, z) => BAYS.find((b) => Math.hypot((x - b.x) / b.rx, (z - b.z) / b.rz) + (N(x, z, 504, 0.06, 2) - 0.5) * 0.36 < 1) || null;
  const isLand = (x, z) => {
    if (x < C2.x0 || z < C2.z0 || x >= C2.x1 || z >= C2.z1) return false;
    const dx = Math.abs(x - CX) / RX, dz = Math.abs(z - CZ) / RZ;
    const c = Math.cbrt(dx * dx * dx + dz * dz * dz);
    if (c > 1.35) return false;
    let d = c + (N(x, z, 501, 0.008, 4) - 0.5) * 0.5 + (N(x, z, 502, 0.04, 2) - 0.5) * 0.1;
    // (every hub stays on dry land, whatever the noise says)
    for (const [hx, hz] of HUBS) { if (Math.abs(x - hx) < 30 && Math.abs(z - hz) < 30) { const q = Math.hypot(x - hx, z - hz); if (q < 30) d -= (30 - q) / 30 * 0.25; } }
    return d < 0.93 && !bayOf(x, z);
  };
  // zones: a warped Voronoi of the Dawnlands’ seeds
  const seeds = [];
  ZONES.forEach((zd, zi) => { if (zd.c2) for (const [x, z] of zd.seeds) seeds.push({ x, z, zi }); });
  const W = C2.x1 - C2.x0, second = new Uint8Array(W * (C2.z1 - C2.z0)), mix = new Float32Array(second.length);
  const L = (x, z) => (z - C2.z0) * W + (x - C2.x0);
  const inC2 = (x, z) => x >= C2.x0 && z >= C2.z0 && x < C2.x1 && z < C2.z1;
  const landM = new Uint8Array(second.length);                     // (isLand, once per tile)
  each(C2.x0 - 24, C2.z0 - 12, C2.x1 + 8, C2.z1 + 8, (x, z, i) => {
    const land = isLand(x, z);
    if (!land) { const bay = bayOf(x, z); zone[i] = bay ? ZI[bay.id] : ZI.wide; g[i] = TT.WATER; return; }
    landM[L(x, z)] = 1;
    const wx = x + (N(x, z, 511, 0.011, 3) - 0.5) * 84, wz = z + (N(x + 931, z + 411, 512, 0.011, 3) - 0.5) * 84;
    let b1 = 0, d1 = 1e18, b2 = 0, d2 = 1e18;
    for (const s of seeds) {
      const d = (wx - s.x) ** 2 + (wz - s.z) ** 2;
      if (d < d1) { if (s.zi !== b1) { d2 = d1; b2 = b1; } d1 = d; b1 = s.zi; }
      else if (d < d2 && s.zi !== b1) { d2 = d; b2 = s.zi; }
    }
    zone[i] = b1;
    const l = L(x, z); second[l] = b2; mix[l] = Math.sqrt(d2) - Math.sqrt(d1);
  });

  // ---------------------------------------------------------------- 3. base ground, with ecotones between zones
  const base = (id, x, z) => {
    switch (id) {
      case 'harbor': return N(x, z, 521, 0.06) > 0.64 ? TT.FOREST : N(x, z, 522, 0.08) > 0.6 ? TT.MEADOW : TT.GRASS;
      case 'jade': { if (N(x, z, 523, 0.03) > 0.52) return TT.PADDY; return N(x, z, 524, 0.055) > 0.55 ? TT.BAMBOO : N(x, z, 525, 0.07) > 0.6 ? TT.MEADOW : TT.GRASS; }
      case 'salt': return N(x, z, 526, 0.05) > 0.7 ? TT.SAND : TT.SALT;
      case 'autumn': return N(x, z, 527, 0.06) > 0.66 ? TT.MEADOW : TT.AUTUMN;
      case 'glow': return N(x, z, 528, 0.07) > 0.54 ? TT.MARSH : N(x, z, 529, 0.05) > 0.6 ? TT.GRASS : TT.SAND;
      case 'elder': return N(x, z, 530, 0.05) > 0.63 ? TT.FOREST : TT.ROOTS;
      case 'moor': return N(x, z, 531, 0.07) > 0.66 ? TT.BOG : TT.MOOR;
      case 'prism': { const n = N(x, z, 532, 0.05); return n > 0.6 ? TT.MEADOW : n < 0.4 ? TT.CRYSTAL : TT.SINTER; }
      case 'clock': return N(x, z, 533, 0.06) > 0.56 ? TT.MEADOW : TT.GRASS;
      case 'tundra': return N(x, z, 534, 0.06) > 0.64 ? TT.SNOW : TT.TUNDRA;
      case 'scar': return TT.UMBRAL;
      default: return TT.WATER;
    }
  };
  each(C2.x0, C2.z0, C2.x1, C2.z1, (x, z, i) => {
    const l = L(x, z);
    if (!landM[l]) return;
    const a = Z[zone[i]], b = Z[second[l]];
    let id = a;
    if (LAND.has(b) && mix[l] < 14 && N(x, z, 7, 0.09) < (1 - mix[l] / 14) * 0.55) id = b;
    g[i] = base(id, x, z);
  });

  // ---------------------------------------------------------------- 4. relief: every zone’s height field, blended across borders
  // (rolling hills, rice terraces, a high tundra, alpine slopes…), eased down to
  // the beaches — except where the coast is a cliff (the north, the Scar, the fjord)
  const HF = {
    harbor: (x, z) => N(x, z, 801, 0.022) * 2.2,
    jade: (x, z) => N(x, z, 802, 0.02, 3) * 5.2 - 0.6,
    salt: () => 0,
    autumn: (x, z) => N(x, z, 803, 0.022) * 2.8 - 0.3,
    glow: () => 0,
    elder: () => 0,
    moor: (x, z) => N(x, z, 804, 0.02, 3) * 3.4 - 0.2,
    prism: (x, z) => N(x, z, 805, 0.03) * 1.6,
    clock: (x, z) => 1 + N(x, z, 806, 0.018) * 2.8,
    tundra: (x, z) => 3 + N(x, z, 807, 0.02) * 1.6,
    scar: (x, z) => N(x, z, 808, 0.025) * 2.4,
  };
  const CLIFFS = new Set(['tundra', 'clock', 'scar']);
  const seaD = distTo(g, (t) => t === TT.WATER, 12);
  each(C2.x0, C2.z0, C2.x1, C2.z1, (x, z, i) => {
    if (g[i] === TT.WATER) return;
    const l = L(x, z), a = Z[zone[i]], b = Z[second[l]];
    const fa = HF[a] ? HF[a](x, z) : 0, fb = LAND.has(b) && HF[b] ? HF[b](x, z) : fa;
    const wa = 0.5 + 0.5 * Math.min(1, mix[l] / 22);
    let h = fa * wa + fb * (1 - wa);
    if (!CLIFFS.has(a)) h *= Math.min(1, seaD[i] / 11);
    elev[i] = Math.max(0, Math.min(6, Math.floor(h)));
  });
  // a pond: water carved flat at the level of its middle (its shore too)
  const pond = (x, z, rx, rz, pred = null, wob = 1.5, ws = 0, lv = null) => {
    const e = lv ?? E(Math.floor(x), Math.floor(z));
    raise(x, z, rx + 1.5, rz + 1.5, e, (tt, x2, z2) => !pred || pred(tt, x2, z2) || tt === TT.WATER, wob, ws, true);
    ell(x, z, rx, rz, TT.WATER, pred, wob, ws);
  };
  // a pillar: a crag of limestone (or basalt…) standing tall, a peak on top
  const pillar = (x, z, r, lv, style, pred = null, h = null) => {
    if (nearRoad(x, z, r + 3)) return false;
    ell(x, z, r, r * 0.8, TT.CRAG, pred, 1, 900 + Math.floor(x));
    raise(x, z, r + 0.6, r * 0.8 + 0.6, lv, (tt) => tt === TT.CRAG, 0, 0, true);
    if (get(Math.floor(x), Math.floor(z)) === TT.CRAG) pois.push({ kind: 'peak', x: Math.floor(x) + 0.5, z: Math.floor(z) + 0.5, style, h: h ?? 3 + lv * 0.8 });
    return true;
  };

  // ---------------------------------------------------------------- 5. the lands take shape
  // --- Lantern Bay, a fjord: green cliff walls either side of the bay, a waterfall
  // down the north wall, Lanternport climbing its hill in three terraces
  {
    // (the bay’s water as a mask first: then a cheap look round every tile)
    const bx0 = 680, bz0 = LPz - 72, bw = LPx + 20 - bx0, bh = 144, bay = new Uint8Array(bw * bh);
    for (let z = 0; z < bh; z++) for (let x = 0; x < bw; x++) if (bayOf(bx0 + x, bz0 + z)) bay[z * bw + x] = 1;
    const isBay = (x, z) => x >= bx0 && z >= bz0 && x < bx0 + bw && z < bz0 + bh && bay[(z - bz0) * bw + (x - bx0)] === 1;
    each(680, LPz - 60, LPx + 8, LPz + 60, (x, z, i) => {
      if (g[i] === TT.WATER || Z[zone[i]] !== 'harbor') return;
      if (x > LPx - 14 && z > LPz - 34 && z < LPz + 22) return;                           // (the town)
      let near = 99;
      for (let d = 1; d <= 12 && near === 99; d++) if (isBay(x, z + d) || isBay(x, z - d) || isBay(x + d, z) || isBay(x - d, z)) near = d;
      if (near <= 12) elev[i] = Math.max(elev[i], near <= 7 ? 3 : 2);
    });
  }
  // (the town climbs north from the quays: a retaining wall faces the harbour at each step)
  for (let z = LPz - 32; z < LPz + 22; z++) for (let x = LPx - 14; x < LPx + 40; x++) {
    if (!inb(x, z) || get(x, z) === TT.WATER || zid(x, z) !== 'harbor') continue;
    elev[I(x, z)] = z < LPz - 17 ? 2 : z < LPz - 7 ? 1 : 0;
  }
  ell(LPx, LPz, 12, 6, TT.COBBLE, inZ('harbor'), 1.5, 541);                            // the harbour square
  ell(LPx + 14, LPz - 24, 8, 4.5, TT.COBBLE, inZ('harbor'), 1, 542);                   // the upper square, by the hall
  line([[LPx - 8, LPz - 11], [LPx + 26, LPz - 11]], 2.6, TT.COBBLE, inZ('harbor'), 1, 543);   // the middle street
  line([[LPx + 3, LPz - 4], [LPx + 3, LPz - 20], [LPx + 10, LPz - 24]], 3, TT.COBBLE, inZ('harbor'), 0.5, 547);   // the street up
  line([[LPx - 3, LPz + 6], [LPx - 3, LPz + 20], [LPx + 10, LPz + 30]], 2.4, TT.COBBLE, inZ('harbor'), 1.5, 544);
  line([[LPx - 6, LPz - 6], [LPx - 10, LPz - 22], [LPx - 2, LPz - 34]], 2.4, TT.COBBLE, inZ('harbor'), 1.5, 545);
  // (stone stairs where the street climbs each wall)
  for (const sz of [LPz - 7, LPz - 17]) for (let dx = -1; dx <= 1; dx++) set(LPx + 3 + dx, sz, TT.PATH);
  const pier = (pts, w) => { line(pts, w, TT.PLANK_H, (tt) => tt === TT.WATER || tt === TT.SAND, 0, 546); for (const [x, z] of pts) clearMark(x - 2, z - 2, x + 2, z + 2); };
  pier([[LPx - 11, LPz], [LPx - 30, LPz]], 2.2);
  pier([[LPx - 9, LPz - 7], [LPx - 20, LPz - 11]], 1.6);
  pier([[LPx - 9, LPz + 7], [LPx - 20, LPz + 11]], 1.6);

  // --- Jade Terraces: paddies stepping down the hillsides (Longji), limestone
  // pillars rising from the mist (Zhangjiajie), the Dawn Monastery on its hill
  raise(MOx, MOz, 17, 11, Math.max(3, E(MOx, MOz) + 1), inZ('jade'), 3, 550, true);
  ell(MOx, MOz, 16, 10, TT.MEADOW, inZ('jade'), 3, 549);
  ell(MOx, MOz + 1, 8, 5, TT.COBBLE, null, 0.5, 551);
  for (let k = 0; k < 7; k++) { const r = rng(seed + 552 + k); ell(700 + r() * 220, -176 + r() * 150, 6 + r() * 9, 4 + r() * 6, TT.BAMBOO, (tt, x, z) => zid(x, z) === 'jade' && tt !== TT.WATER && tt !== TT.PADDY, 3, 553 + k); }
  {
    const r = rng(seed + 560);
    let n = 0;
    for (let k = 0; k < 400 && n < 26; k++) {
      const x = 700 + r() * 230, z = -178 + r() * 170;
      if (zid(Math.floor(x), Math.floor(z)) !== 'jade' || Math.hypot(x - MOx, z - MOz) < 22 || get(Math.floor(x), Math.floor(z)) === TT.WATER) continue;
      if (pois.some((p) => p.kind === 'peak' && Math.hypot(p.x - x, p.z - z) < 9)) continue;
      if (pillar(x, z, 1.4 + r() * 2.2, 4 + Math.floor(r() * 3), 'karst', inZ('jade'), 5 + r() * 5)) n++;
    }
  }

  // --- Saltmirror Flats: a white mirror to the sky (Uyuni), the Saltworks’ pans, and
  // the White Stairs: travertine terraces full of turquoise pools (Pamukkale)
  const sr = rng(seed + 570);
  for (let k = 0; k < 40; k++) {
    const x = 700 + sr() * 190, z = 150 + sr() * 150, rx = 2 + sr() * 5, rz = 1.5 + sr() * 3.2;
    if (Math.hypot(x - SWx, z - SWz) < 16 || Math.hypot(x - DAWN.whiteStairs[0], z - DAWN.whiteStairs[1]) < 22) continue;
    ell(x, z, rx, rz, TT.WATER, (tt, x2, z2) => tt === TT.SALT && zid(x2, z2) === 'salt', 1.5, 571 + k);
  }
  for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) {
    const x0 = SWx - 12 + i * 7, z0 = SWz + 6 + j * 6;
    for (let z = z0; z < z0 + 4; z++) for (let x = x0; x < x0 + 5; x++) if (zid(x, z) === 'salt') set(x, z, TT.WATER);
  }
  {
    const [wx, wz] = DAWN.whiteStairs, ok = (tt, x, z) => (zid(x, z) === 'salt' || zid(x, z) === 'autumn') && tt !== TT.WATER;
    for (let l = 1; l <= 4; l++) {
      const k = 1 - (l - 1) * 0.2;
      raise(wx, wz - (l - 1) * 2.2, 17 * k, 11 * k, l, ok, 2.5, 580 + l);
      ell(wx, wz - (l - 1) * 2.2, 17 * k, 11 * k, TT.SALT, ok, 2.5, 580 + l);
    }
    // a pool on every step, brim-full
    const pr = rng(seed + 590);
    for (let k = 0; k < 16; k++) { const a = pr() * Math.PI * 2, d = pr() * 13; const x = wx + Math.cos(a) * d, z = wz + Math.sin(a) * d * 0.6; pond(x, z, 1.6 + pr() * 1.8, 1 + pr() * 1.2, (tt) => tt === TT.SALT, 0.8, 591 + k); }
  }
  for (const [x, z, r] of [[742, 176, 5], [856, 262, 4], [760, 284, 4.5]]) pillar(x, z, r, 3, 'granite', inZ('salt'), 3);

  // --- Emberleaf Wood: clearings & pumpkin fields round Harvestholm
  ell(HHx, HHz, 13, 9, TT.GRASS, inZ('autumn'), 3, 600);
  raise(HHx, HHz, 14, 10, E(HHx, HHz), inZ('autumn'), 3, 601, true);
  for (const [x, z, w, h] of [[HHx - 16, HHz - 12, 8, 5], [HHx + 9, HHz - 13, 7, 5], [HHx + 12, HHz + 6, 8, 4]]) for (let zz = z; zz < z + h; zz++) for (let xx = x; xx < x + w; xx++) if (zid(xx, zz) === 'autumn' && get(xx, zz) !== TT.WATER) { set(xx, zz, TT.FIELD); elev[I(xx, zz)] = E(HHx, HHz); }
  for (let k = 0; k < 6; k++) { const r = rng(seed + 602 + k); ell(850 + r() * 120, 120 + r() * 130, 5 + r() * 5, 3.5 + r() * 3.5, TT.MEADOW, inZ('autumn'), 3, 603 + k); }

  // --- Glowtide Coast: mangrove channels, limestone stacks in the glowing bay (Ha Long), Stiltwater on the water
  const gr = rng(seed + 610);
  for (let k = 0; k < 12; k++) {
    const x = 930 + gr() * 190, z = 250 + gr() * 50;
    line(walk(x, z, gr() * Math.PI * 2, 7, 4, 1.3, 611 + k), 2 + gr() * 2.5, TT.WATER, inZ('glow'), 1.5, 612 + k);
  }
  {
    let n = 0;
    for (let k = 0; k < 300 && n < 16; k++) {
      const x = 960 + gr() * 150, z = 286 + gr() * 34;
      const tt = get(Math.floor(x), Math.floor(z));
      if (tt !== TT.WATER || Math.hypot(x - STx, z - STz) < 16 || pois.some((p) => p.kind === 'peak' && Math.hypot(p.x - x, p.z - z) < 8)) continue;
      if (pillar(x, z, 1.3 + gr() * 2, 3 + Math.floor(gr() * 3), 'karst', (t2) => t2 === TT.WATER, 4 + gr() * 4)) n++;
    }
  }
  line([[STx - 14, STz - 8], [STx - 2, STz], [STx + 14, STz + 2]], 1.6, TT.PLANK_H, (tt) => tt === TT.WATER || tt === TT.MARSH || tt === TT.SAND, 0, 626);
  line([[STx - 2, STz], [STx - 2, STz + 14]], 1.6, TT.PLANK_H, (tt) => tt === TT.WATER || tt === TT.MARSH || tt === TT.SAND, 0, 627);

  // --- Elderbough, Yosemite-style: a granite rim north of the valley (the meltwater
  // falls off it), Half Dome and El Capitan, the Great Tree on the valley floor
  const [GTx, GTz] = DAWN.greatTree;
  const [FAx, FAz] = DAWN.falls;
  each(880, -60, 1110, 60, (x, z, i) => {
    if (g[i] === TT.WATER || Z[zone[i]] !== 'elder') return;
    const rim = Math.abs(x - FAx) < 12 ? FAz : 24 + (N(x, z, 630, 0.05) - 0.5) * 14;     // (square to the falls)
    if (z < rim) elev[i] = Math.max(elev[i], 4);
  });
  mountain(DAWN.halfDome[0], DAWN.halfDome[1], 10, 7, 7, { crag: 5, ground: TT.ROCK, pred: inZ('elder'), ws: 640, peaks: 0 });
  mountain(DAWN.elCap[0], DAWN.elCap[1], 13, 6, 6, { crag: 5, ground: TT.ROCK, pred: inZ('elder'), ws: 650, peaks: 0 });
  ell(GTx, GTz + 6, 22, 16, TT.ROOTS, inZ('elder'), 3, 655);
  ell(FAx - 2, FAz + 16, 16, 10, TT.MEADOW, (tt, x, z) => zid(x, z) === 'elder' && tt !== TT.WATER && E(x, z) === 0, 3, 658);   // the meadow under the falls
  pond(FAx - 2, FAz + 12, 7, 4.5, null, 2, 656, 0);                                     // the Wellspring, where the falls land
  ell(GTx, GTz + 26, 9, 6, TT.GRASS, inZ('elder'), 2, 657);                            // Rootholm’s green

  // --- Hollowmoor, like Skye: rolling moor, lochs, rocky tors, the Old Man (a lone pinnacle)
  const mr = rng(seed + 660);
  for (let k = 0; k < 14; k++) { const x = 1070 + mr() * 190, z = 30 + mr() * 190; if (zid(Math.floor(x), Math.floor(z)) === 'moor') pond(x, z, 2 + mr() * 5, 1.5 + mr() * 3, inZ('moor'), 2, 661 + k); }
  for (let k = 0; k < 8; k++) { const x = 1070 + mr() * 190, z = 30 + mr() * 190; if (Math.hypot(x - CAx, z - CAz) < 16 || nearRoad(x, z, 5)) continue; ell(x, z, 2.5 + mr() * 3, 2 + mr() * 2, TT.ROCK, inZ('moor'), 2, 680 + k); }
  pillar(DAWN.storr[0], DAWN.storr[1], 1.8, 6, 'rock', inZ('moor'), 10);
  for (const [x, z] of [[1206, 66], [1219, 73], [1216, 62]]) pillar(x, z, 1, 4, 'rock', inZ('moor'), 4.5);

  // --- Prism Springs, Yellowstone’s cousin: rainbow hot springs in pale sinter,
  // terraces of travertine, geysers (Old Punctual keeps time), steam everywhere
  const [GPx, GPz] = DAWN.prismatic;
  ell(GPx, GPz, 16, 11, TT.SINTER, inZ('prism'), 3, 690);
  pond(GPx, GPz, 9, 6, null, 1.2, 691);                                                 // the Grand Prismatic
  const hr = rng(seed + 692);
  for (let k = 0; k < 18; k++) {
    const x = 1130 + hr() * 220, z = 170 + hr() * 120;
    if (zid(Math.floor(x), Math.floor(z)) !== 'prism' || Math.hypot(x - GPx, z - GPz) < 16 || nearRoad(x, z, 4)) continue;
    ell(x, z, 4 + hr() * 3, 3 + hr() * 2, TT.SINTER, inZ('prism'), 2, 693 + k);
    pond(x, z, 1.2 + hr() * 2.2, 1 + hr() * 1.5, null, 1, 713 + k);
  }
  {
    const tx = 1296, tz = 196, ok = inZ('prism');                                        // the terraces (Mammoth)
    for (let l = 1; l <= 3; l++) { const k = 1 - (l - 1) * 0.26; raise(tx, tz - (l - 1) * 2, 14 * k, 9 * k, E(tx, tz + 12) + l, ok, 2, 730 + l, true); ell(tx, tz - (l - 1) * 2, 14 * k, 9 * k, TT.SINTER, ok, 2, 730 + l); }
    for (let k = 0; k < 8; k++) { const a = hr() * Math.PI * 2, d = hr() * 10; pond(tx + Math.cos(a) * d, tz + Math.sin(a) * d * 0.6, 1.3 + hr(), 0.9 + hr() * 0.7, (tt) => tt === TT.SINTER, 0.6, 735 + k); }
  }
  for (let k = 0; k < 7; k++) { const x = 1140 + hr() * 200, z = 190 + hr() * 100; if (zid(Math.floor(x), Math.floor(z)) === 'prism' && get(Math.floor(x), Math.floor(z)) !== TT.WATER && !nearRoad(x, z, 4)) ell(x, z, 3, 2.2, TT.CRYSTAL, inZ('prism'), 1, 745 + k); }

  // --- Cogsworth Heights, the Alps: the Cogswhorn and its sisters, alpine meadows,
  // the clockmakers’ brass town on its terrace
  mountain(DAWN.cogswhorn[0], DAWN.cogswhorn[1], 17, 11, 6, { crag: 4, ground: TT.SNOW, pred: inZ('clock'), ws: 750, peaks: 3, style: 'snow' });
  mountain(1210, -140, 14, 9, 5, { crag: 4, ground: TT.SNOW, pred: inZ('clock'), ws: 760, peaks: 2, style: 'snow' });
  mountain(1258, -132, 9, 6, 4, { crag: 3, ground: TT.SNOW, pred: inZ('clock'), ws: 765, peaks: 1, style: 'snow' });
  mountain(1330, -52, 11, 8, 5, { crag: 4, ground: TT.ROCK, pred: inZ('clock'), ws: 770, peaks: 2, style: 'rock' });
  ell(CWx, CWz - 4, 24, 16, TT.METAL, inZ('clock'), 3, 775);
  raise(CWx, CWz - 4, 26, 18, Math.max(3, E(CWx, CWz) + 1), (tt) => tt === TT.METAL, 2, 776, true);

  // --- Aurora Tundra, like Glacier: a high plateau under jagged peaks, glaciers
  // spilling down to milky turquoise lakes
  const [p1, p2, p3] = [[996, -166, 20, 10], [1112, -170, 18, 9], [1140, -122, 11, 8]];
  for (const [x, z, rx, rz] of [p1, p2, p3]) {
    mountain(x, z, rx, rz, 6, { crag: 5, ground: TT.SNOW, pred: inZ('tundra'), ws: 780 + x, peaks: rx > 12 ? 3 : 2, style: 'snow' });
    line([[x, z - 2], [x + 3, z + rz * 0.6], [x + 1, z + rz + 5]], 5, TT.GLACIER, (tt, x2, z2) => zid(x2, z2) === 'tundra' && tt !== TT.CRAG && tt !== TT.WATER, 2, 790 + x);   // a glacier tongue
    pond(x + 2, z + rz + 11, 6, 3.5, inZ('tundra'), 2, 800 + x);                        // the lake at its snout
  }
  const tr = rng(seed + 810);
  for (let k = 0; k < 6; k++) { const x = 920 + tr() * 260, z = -150 + tr() * 90; if (zid(Math.floor(x), Math.floor(z)) === 'tundra' && !nearRoad(x, z, 6)) pond(x, z, 4 + tr() * 6, 2.5 + tr() * 3, inZ('tundra'), 3, 811 + k); }

  // --- the Umbral Scar: black glass, a chasm, and basalt columns stepping down into the
  // sea like the Giant’s Causeway; black spires
  line([[1400, -40], [1392, 10], [1400, 60], [1386, 110], [1396, 160], [1384, 210]], (k) => 3 + Math.sin(k * 1.9) * 1.2, TT.CREVASSE, inZ('scar'), 5, 820);
  each(1340, -80, 1448, 260, (x, z, i) => {
    if (g[i] === TT.WATER || Z[zone[i]] !== 'scar' || seaD[i] > 9) return;
    g[i] = TT.BASALT;
    elev[i] = Math.max(1, Math.min(3, Math.floor(seaD[i] / 2.6)));
  });
  mountain(1402, 176, 9, 6, 5, { crag: 3, ground: TT.UMBRAL, pred: inZ('scar'), ws: 830, peaks: 2, style: 'black' });
  mountain(1392, -22, 8, 6, 4, { crag: 3, ground: TT.UMBRAL, pred: inZ('scar'), ws: 835, peaks: 2, style: 'black' });

  // ---------------------------------------------------------------- 6. rivers (they run at the ground’s height: falls where it steps)
  const river = (pts, w, wig = 3, ws = 0) => line(pts, w, TT.WATER, (tt, x, z) => LAND.has(zid(x, z)) && tt !== TT.METAL && tt !== TT.CRAG, wig, ws);
  river([[852, -170], [842, -136], [824, -100], [806, -68], [790, -36], [770, -6], [744, 22], [724, 42]], 3.4, 4, 701);    // the Jade River
  river([[1120, -150], [1108, -120], [1088, -90], [1060, -56], [1030, -20], [1008, 4], [FAx, FAz - 8], [FAx, FAz + 1], [FAx - 2, FAz + 11]], 3, 1.5, 702);   // the Meltwater, over the valley’s rim
  river([[972, 76], [962, 112], [948, 150], [930, 190], [928, 230], [948, 262], [986, 290]], 3.2, 4, 703);                 // the Ember River
  river([[1248, 26], [1206, 58], [1166, 92], [1136, 132], [1112, 174], [1084, 220], [1062, 262], [1044, 292]], 2.8, 4, 704); // the Slowwater
  river([[LPx - 20, LPz - 44], [LPx - 22, LPz - 32], [LPx - 22, LPz - 20]], 2.4, 1, 705);                                   // the Bridal Veil, into the fjord
  river([[CWx + 20, CWz + 8], [CWx + 26, CWz + 20], [CWx + 24, CWz + 40]], 2.4, 1.5, 706);                                  // (off the brass terrace)

  // ---------------------------------------------------------------- 7. coasts
  const dW = distTo(g, (t) => t === TT.WATER || t === TT.CORAL, 4);
  each(C2.x0 - 20, C2.z0, C2.x1, C2.z1, (x, z, i) => {
    const t = g[i], d = dW[i];
    if (d === 0 || d > 3 || t === TT.PLANK_H || t === TT.COBBLE || HIGH.has(t) || elev[i] > 0) return;
    const id = Z[zone[i]];
    if (!LAND.has(id)) return;
    // (only on the open sea & the bays: inland pools keep their banks)
    let sea = false;
    for (let j = -4; j <= 4 && !sea; j++) for (let k = -4; k <= 4 && !sea; k++) { const q = inb(x + k, z + j) ? I(x + k, z + j) : -1; if (q >= 0 && g[q] === TT.WATER && (!LAND.has(Z[zone[q]]) || bayOf(x + k, z + j))) sea = true; }
    if (!sea || id === 'scar') return;
    if (id === 'salt') { if (d <= 1) g[i] = TT.SAND; return; }
    if (d <= 2 + (hash2(x, z, 710) < 0.5 ? 1 : 0)) g[i] = TT.SAND;
  });

  // ---------------------------------------------------------------- 8. the Wide Sea’s islands
  // Whale Isle: a sleeping whale the size of a village, grass on its back, the
  // Blowhole Inn between its eye and its blowhole
  const [WHx, WHz] = DAWN.whale;
  ell(WHx, WHz, 30, 13, TT.SAND, null, 2, 720);
  ell(WHx - 30, WHz + 1, 7, 9, TT.SAND, null, 1.5, 721);
  ell(WHx + 32, WHz - 7, 8, 3.5, TT.SAND, null, 1, 722); ell(WHx + 32, WHz + 8, 8, 3.5, TT.SAND, null, 1, 723);
  ell(WHx - 2, WHz - 1, 24, 9, TT.GRASS, null, 2, 724);
  ell(WHx + 4, WHz - 2, 12, 5, TT.MEADOW, null, 1.5, 725);
  raise(WHx - 2, WHz - 2, 20, 7, 1, (tt) => tt === TT.GRASS || tt === TT.MEADOW, 2, 726);   // (its back, a little up)
  each(WHx - 48, WHz - 28, WHx + 52, WHz + 28, (x, z, i) => { if (Math.hypot((x - WHx) / 50, (z - WHz) / 26) < 1) zone[i] = ZI.whale; });
  // Pelican Rock: Perkins’s post office on a lump of rock
  const [PRx, PRz] = DAWN.pelicanRock;
  ell(PRx, PRz, 7, 5, TT.SAND, null, 1.5, 730); ell(PRx, PRz - 1, 4.5, 3, TT.ROCK, null, 1, 731);
  for (const [x, z, r] of [[586, -60, 3], [640, 190, 3.5], [566, 240, 2.5], [654, -120, 3], [612, 150, 2]]) island(x, z, r * 1.4, r, TT.ROCK, TT.ROCK, 732);
  for (const [x, z, r, lv] of [[662, 250, 2, 4], [668, 236, 1.5, 3], [650, 262, 1.8, 3], [700, 300, 2.2, 4]]) pillar(x, z, r, lv, 'karst', (t2) => t2 === TT.WATER, 5);

  // ---------------------------------------------------------------- 9. roads (at the height of the ground they cross: stairs where it steps)
  baseRelief();
  ROADS.forEach((pts, k) => road(pts, 2, 740 + k));

  // ---------------------------------------------------------------- 10. places
  poi('waystone', LPx + 4, LPz + 4, { zone: 'harbor', clear: 0, name: 'Lanternport' });
  poi('lighthouse', 748, 36, { clear: 3 });
  const HOUSES = [
    // the harbour front, the street up, the upper town (whitewash, tiled roofs, paper lanterns)
    [LPx - 8, LPz - 16, 5, 3, { roof: '#c8574f', wall: 'plaster', wallColor: '#f4efe4', trim: '#5a3b2a', awning: ['#fbf1dc', '#c8574f'], sign: 'fish' }],
    [LPx + 1, LPz - 16, 5, 3, { roof: '#3f6f9e', wall: 'plaster', wallColor: '#f0e4d0', trim: '#5a3b2a', flowerbox: true, chimney: 1 }],
    [LPx - 1, LPz + 9, 5, 3, { roof: '#6a4a8a', wall: 'plaster', wallColor: '#f4e8f0', trim: '#4b3a3a', round: true, chimney: 3 }],
    [LPx + 9, LPz + 7, 5, 3, { roof: '#d98a4e', wall: 'boards', wallColor: '#e8d4b0', trim: '#6b4330', awning: ['#fbf1dc', '#3f9b98'], sign: 'cup' }],
    [LPx + 9, LPz - 16, 5, 3, { roof: '#4f955a', wall: 'stone', trim: '#4b3a3a', flowerbox: true }],
    [LPx + 18, LPz - 16, 5, 3, { roof: '#8a5a9e', wall: 'plaster', wallColor: '#f0e8dc', trim: '#5a3b2a', awning: ['#fbf1dc', '#8a5a9e'], sign: 'leaf' }],
    [LPx - 4, LPz - 27, 5, 3, { roof: '#5f9e6a', wall: 'plaster', wallColor: '#f4efe4', trim: '#6b4330', flowerbox: true, round: true }],
    [LPx + 12, LPz - 31, 6, 4, { roof: '#b8483a', wall: 'stone', trim: '#4b3a3a', clock: true, flag: true, columns: true }],
    [LPx + 27, LPz + 4, 5, 3, { roof: '#c89a52', wall: 'plaster', wallColor: '#f4efe4', trim: '#6b4330', chimney: 1, shutter: '#3f6f9e' }],
    [LPx + 19, LPz + 6, 4, 3, { roof: '#3f9b98', wall: 'boards', wallColor: '#d8c8a8', trim: '#5a3b2a', flowerbox: true }],
  ];
  HOUSES.forEach(([x, z, w, h, style], k) => {
    poi('house', x + w / 2, z + h / 2, { clear: 0, b: { id: 'lp-house-' + k, x, y: z, w, h, door: x + Math.floor(w / 2), style } });
    clearMark(x - 1, z - 1, x + w + 1, z + h + 2);
    const lv = E(x + Math.floor(w / 2), z + h);
    for (let zz = z; zz < z + h + 1; zz++) for (let xx = x - 1; xx < x + w + 1; xx++) { const tt = get(xx, zz); if (tt !== TT.WATER && tt !== TT.PLANK_H && !HIGH.has(tt) && tt !== TT.PATH) { set(xx, zz, TT.COBBLE); elev[I(xx, zz)] = lv; } }
  });
  poi('waystone', MOx + 5, MOz + 9, { zone: 'jade', name: 'the Dawn Monastery' });
  poi('pagoda', MOx, MOz - 2, { clear: 6 });
  for (const [x, z] of [[793, -46], [798, -82]]) poi('torii', x, z, { clear: 1 });
  for (const [x, z] of [[MOx - 4, MOz + 7], [MOx + 4, MOz + 7], [LPx - 6, LPz + 2], [LPx + 6, LPz - 6]]) poi('stone_lantern', x, z, { clear: 1 });
  poi('waystone', SWx + 8, SWz - 4, { zone: 'salt', name: 'the Saltworks' });
  for (const [x, z] of [[SWx - 16, SWz - 2], [SWx + 14, SWz + 10]]) poi('windpump', x, z, { clear: 2 });
  poi('waystone', HHx - 4, HHz + 4, { zone: 'autumn', name: 'Harvestholm' });
  poi('windmill', HHx + 6, HHz - 6, { clear: 3 });
  poi('camp', HHx - 30, HHz + 30, { clear: 4 });
  poi('waystone', STx - 18, STz - 10, { zone: 'glow', name: 'Stiltwater' });
  for (const [x, z] of [[STx - 8, STz - 5], [STx + 6, STz - 2], [STx - 5, STz + 7], [STx + 10, STz + 6]]) poi('stilt_house', x, z, { clear: 2 });
  poi('waystone', RHx + 4, RHz + 6, { zone: 'elder', name: 'Rootholm' });
  poi('great_tree', GTx, GTz, { clear: 13 });
  poi('camp', 1030, 48, { clear: 4 });
  poi('waystone', CAx + 4, CAz + 6, { zone: 'moor', name: 'Candlewick' });
  poi('stone_circle', 1164, 150, { clear: 5 });
  for (const [x, z, w, h, roof] of [[CAx - 10, CAz - 8, 4, 3, '#4a3a5a'], [CAx - 3, CAz - 10, 5, 3, '#5a4a3a'], [CAx + 6, CAz - 8, 4, 3, '#3a4a5a']]) {
    poi('house', x + w / 2, z + h / 2, { clear: 0, b: { id: 'cw-house-' + x, x, y: z, w, h, door: x + Math.floor(w / 2), style: { roof, wall: 'logs', trim: '#3a2a2a', chimney: 1, lean: true, round: true } } });
    clearMark(x - 1, z - 1, x + w + 1, z + h + 2);
  }
  poi('waystone', LOx - 6, LOz + 4, { zone: 'prism', name: 'Old Punctual Lodge' });
  poi('geyser', DAWN.punctual[0], DAWN.punctual[1], { clear: 3, big: true, name: 'Old Punctual' });
  for (const [x, z] of [[1252, 214], [1222, 262], [1160, 222], [1320, 244]]) if (get(x, z) !== TT.WATER) poi('geyser', x, z, { clear: 2 });
  poi('geode', LOx + 30, LOz + 14, { clear: 5 });
  poi('camp', LOx, LOz - 4, { clear: 4 });
  poi('waystone', CWx - 30, CWz + 4, { zone: 'clock', name: 'Cogsworth' });
  poi('clocktower', CWx, CWz - 6, { clear: 6 });
  poi('waystone', ACx + 6, ACz + 8, { zone: 'tundra', name: 'Aurora Camp' });
  for (const [x, z] of [[ACx - 8, ACz - 2], [ACx, ACz - 6], [ACx + 8, ACz - 2]]) poi('yurt', x, z, { clear: 3 });
  poi('igloo', ACx - 18, ACz + 10, { clear: 3 });
  poi('waystone', WHx + 10, WHz + 3, { zone: 'whale', name: 'the Blowhole Inn' });
  poi('whale_eye', WHx - 30, WHz + 6, { clear: 3 });
  poi('geyser', WHx - 12, WHz - 4, { clear: 2 });
  poi('whale_tail', WHx + 44, WHz, { clear: 2 });
  poi('house', DAWN.blowholeInn[0] + 2, DAWN.blowholeInn[1] - 3, { clear: 0, b: { id: 'blowhole-inn', x: DAWN.blowholeInn[0] - 1, y: DAWN.blowholeInn[1] - 5, w: 6, h: 3, door: DAWN.blowholeInn[0] + 2, style: { roof: '#3f6f9e', wall: 'boards', wallColor: '#e8dcc0', trim: '#4a2e25', sign: 'cup', chimney: 4, flowerbox: true } } });
  clearMark(DAWN.blowholeInn[0] - 2, DAWN.blowholeInn[1] - 6, DAWN.blowholeInn[0] + 6, DAWN.blowholeInn[1] + 1);
  // the Pelican Post’s roosts (Perkins’s own on Pelican Rock)
  for (const [rid, name, zone, x, z] of [
    ['pelicanrock', 'Pelican Rock', 'wide', PRx + 0.5, PRz - 0.5], ['whale', 'the Blowhole Inn', 'whale', WHx + 15.5, WHz + 4.5],
    ['lanternport', 'Lanternport', 'harbor', LPx + 9.5, LPz + 3.5], ['monastery', 'the Dawn Monastery', 'jade', MOx + 9.5, MOz + 8.5], ['saltworks', 'the Saltworks', 'salt', SWx + 3.5, SWz - 8.5],
    ['harvestholm', 'Harvestholm', 'autumn', HHx - 8.5, HHz + 6.5], ['stiltwater', 'Stiltwater', 'glow', STx - 21.5, STz - 14.5], ['rootholm', 'Rootholm', 'elder', RHx + 8.5, RHz + 3.5],
    ['candlewick', 'Candlewick', 'moor', CAx + 8.5, CAz + 2.5], ['lodge', 'Old Punctual Lodge', 'prism', LOx - 10.5, LOz + 0.5], ['cogsworth', 'Cogsworth', 'clock', CWx - 34.5, CWz + 8.5],
    ['aurora', 'Aurora Camp', 'tundra', ACx + 10.5, ACz + 6.5],
  ]) { const [rx, rz] = dryNear(x, z); poi('roost', rx, rz, { rid, name, zone, clear: 2 }); }
  whirlpools.push({ x: 604, z: 210, r: 5 }, { x: 650, z: -40, r: 4.5 });
  // (piers & boardwalks are decks of planks over the water: the ones drawn here get theirs)
  const deck = K.deck;
  if (deck) for (let i = 0; i < g.length; i++) if (g[i] === TT.PLANK_H && !deck[i]) deck[i] = 2;
  void inC2; void keep;
}
