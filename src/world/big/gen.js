// The big world, generated from a seed: each zone is an authored macro shape
// (a plateau and its cliff wall, a canyon network carved through mesas, a
// volcano cone with lava flows, an atoll, a bayou of channels…) filled in with
// seeded noise, with soft "ecotones" where zones meet; then the valley is
// stamped at its own coordinates and roads open its borders. This file makes
// the Hearthlands (continent 1, inside its own box `C1`); gen2.js adds the
// Wide Sea and the Dawnlands. Pure & deterministic (node, workers). Also
// returns the points of interest.

import { TT, HIGH, TINFO, faceTex, SLOPE } from '../tiles.js';

const TINFO_WALK = (t) => !!(TINFO[t] && TINFO[t].walk);
import { fbm, hash2, rng } from '../../engine/util.js';
import { buildOverworld } from '../overworld.js';
import { BIG, VALLEY, ZONES, ZI, ARENA_SITE, C1 } from './layout.js';
import { generateDawn } from './gen2.js';

const { X0, Z0, W, H } = BIG;
const OCEAN = new Set(['sunken', 'lagoon', 'straits', 'sea']);

export function generateBig(seed = BIG.SEED, valley = null) {
  const t0 = Date.now();
  const g = new Uint8Array(W * H).fill(TT.WATER);
  const zone = new Uint8Array(W * H).fill(ZI.wide);
  const deck = new Uint8Array(W * H);        // bridges & boardwalks you can stand on (1 = the valley's own, 2 = new)
  const keep = new Uint8Array(W * H);        // 1 = keep clear of scatter (roads' shoulders, landmarks, sled runs…)
  const elev = new Uint8Array(W * H);        // (World v7) relief: the ground's height in levels (plateaus 1, mountains more)
  const I = (x, z) => (z - Z0) * W + (x - X0);
  const inb = (x, z) => x >= X0 && z >= Z0 && x < X0 + W && z < Z0 + H;
  const inValley = (x, z) => x >= VALLEY.x0 && z >= VALLEY.z0 && x < VALLEY.x1 && z < VALLEY.z1;
  const get = (x, z) => (inb(x, z) ? g[I(x, z)] : TT.WATER);
  const zoneAt = (x, z) => (inb(x, z) ? zone[I(x, z)] : ZI.sea);
  const Z = ZONES.map((zd) => zd.id);
  const zid = (x, z) => Z[zoneAt(x, z)];
  const set = (x, z, t, force = false) => { x = Math.floor(x); z = Math.floor(z); if (inb(x, z) && (force || !inValley(x, z))) g[I(x, z)] = t; };
  const N = (x, z, s, sc = 0.05, oct = 3) => fbm(x * sc, z * sc, seed + s, oct);
  const ridge = (x, z, s, sc) => 1 - Math.abs(N(x, z, s, sc, 3) - 0.5) * 2;
  // a noise-warped ellipse
  const ell = (cx, cz, rx, rz, t, pred = null, wob = 0, ws = 0) => {
    for (let z = Math.floor(cz - rz - wob - 1); z <= cz + rz + wob + 1; z++) for (let x = Math.floor(cx - rx - wob - 1); x <= cx + rx + wob + 1; x++) {
      const dx = (x + 0.5 - cx) / rx, dz = (z + 0.5 - cz) / rz;
      const w = wob ? (fbm(x * 0.09, z * 0.09, seed + ws, 2) - 0.5) * wob * 0.4 : 0;
      if (dx * dx + dz * dz <= 1 + w && (!pred || pred(get(x, z), x, z))) set(x, z, t);
    }
  };
  // (World v7) relief. raise(): the ground inside a noise-warped ellipse goes up to
  // `lv` levels (exactly `lv` with `exact`); mountain(): terraces stacked round a
  // crag core (nobody climbs it), jagged 3D peaks on top
  const raise = (cx, cz, rx, rz, lv, pred = null, wob = 0, ws = 0, exact = false) => {
    for (let z = Math.floor(cz - rz - wob - 1); z <= cz + rz + wob + 1; z++) for (let x = Math.floor(cx - rx - wob - 1); x <= cx + rx + wob + 1; x++) {
      if (!inb(x, z) || inValley(x, z)) continue;
      const dx = (x + 0.5 - cx) / rx, dz = (z + 0.5 - cz) / rz;
      const w = wob ? (fbm(x * 0.09, z * 0.09, seed + ws, 2) - 0.5) * wob * 0.4 : 0;
      if (dx * dx + dz * dz > 1 + w || (pred && !pred(get(x, z), x, z))) continue;
      const i = I(x, z);
      if (exact || elev[i] < lv) elev[i] = lv;
    }
  };
  const mountain = (cx, cz, rx, rz, levels, { crag = levels, ground = TT.ROCK, pred = null, wob = 3, ws = 0, peaks = 0, style = 'rock' } = {}) => {
    for (let l = 1; l <= levels; l++) {
      const k = 1 - ((l - 1) / levels) * 0.8;
      raise(cx, cz - (l - 1) * 0.7, rx * k, rz * k, l, pred, wob, ws + l * 7);   // (summits lean north: the south faces show)
    }
    for (let z = Math.floor(cz - rz - wob - 2); z <= cz + rz + wob + 2; z++) for (let x = Math.floor(cx - rx - wob - 2); x <= cx + rx + wob + 2; x++) {
      if (!inb(x, z) || inValley(x, z)) continue;
      const i = I(x, z), e = elev[i];
      const dx = (x + 0.5 - cx) / rx, dz = (z + 0.5 - cz) / rz, w = wob ? (fbm(x * 0.09, z * 0.09, seed + ws + 7, 2) - 0.5) * wob * 0.4 : 0;
      if (!e || dx * dx + dz * dz > 1 + w || (pred && !pred(g[i], x, z))) continue;          // (only its own footprint)
      if (e >= crag) g[i] = TT.CRAG;
      else if (ground !== null && g[i] !== TT.WATER && g[i] !== TT.PATH) g[i] = ground;
    }
    const r = rng(seed + ws + 991), kc = 1 - ((crag - 1) / levels) * 0.8;
    // (a rugged top: knobs a level higher round the crag core)
    for (let k = 0; k < 2 + peaks; k++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.6; raise(cx + Math.cos(a) * rx * kc * d, cz - (crag - 1) * 0.7 + Math.sin(a) * rz * kc * d, 2 + r() * 2.5, 1.5 + r() * 1.5, levels + 1, (tt) => tt === TT.CRAG, 1, ws + 50 + k); }
    for (let k = 0, n = 0; k < 60 && n < peaks; k++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.75, x = Math.floor(cx + Math.cos(a) * rx * kc * d) + 0.5, z = Math.floor(cz - (crag - 1) * 0.7 + Math.sin(a) * rz * kc * d) + 0.5;
      if (get(Math.floor(x), Math.floor(z)) !== TT.CRAG || pois.some((p) => p.kind === 'peak' && Math.hypot(p.x - x, p.z - z) < 6)) continue;
      pois.push({ kind: 'peak', x, z, style, h: 4 + r() * 4 + (elev[I(Math.floor(x), Math.floor(z))] - crag) * 1.2 });
      n++;
    }
  };
  // (a dry, flat, open spot near (x, z) for a landmark: walkable ground all round, off roads & decks, one level)
  const dryNear = (x, z, R = 8) => {
    const ok = (tx, tz, e) => { if (!inb(tx, tz)) return false; const i = I(tx, tz), tt = g[i]; return TINFO_WALK(tt) && tt !== TT.PATH && tt !== TT.PLAZA && tt !== TT.CRAG && !deck[i] && elev[i] === e; };
    for (let r = 0; r <= R; r++) for (let k = 0; k < (r ? 16 : 1); k++) {
      const a = (k / 16) * Math.PI * 2, px = Math.floor(x + Math.cos(a) * r), pz = Math.floor(z + Math.sin(a) * r);
      if (!inb(px, pz)) continue;
      const e = elev[I(px, pz)];
      let good = true;
      for (let dz = -1; dz <= 1 && good; dz++) for (let dx = -1; dx <= 1 && good; dx++) if (!ok(px + dx, pz + dz, e)) good = false;
      if (good) return [px + 0.5, pz + 0.5];
    }
    return [x, z];
  };
  // plateaus stand one level up unless something raised them higher
  const baseRelief = () => { for (let i = 0; i < W * H; i++) if (!elev[i] && HIGH.has(g[i])) elev[i] = 1; };

  // a wobbly polyline of width w (tiles)
  const line = (pts, w, t, pred = null, wig = 0, ws = 0) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L * 2));
      const nx = -(bz - az) / (L || 1), nz = (bx - ax) / (L || 1);
      for (let s = 0; s <= n; s++) {
        const k = s / n;
        const off = wig ? (fbm((ax + (bx - ax) * k) * 0.06, (az + (bz - az) * k) * 0.06, seed + ws, 2) - 0.5) * wig : 0;
        const cx = ax + (bx - ax) * k + nx * off, cz = az + (bz - az) * k + nz * off;
        const r = (typeof w === 'function' ? w(i + k) : w) / 2;
        for (let z = Math.floor(cz - r); z <= Math.floor(cz + r); z++) for (let x = Math.floor(cx - r); x <= Math.floor(cx + r); x++) {
          if ((x + 0.5 - cx) ** 2 + (z + 0.5 - cz) ** 2 > r * r + 0.3) continue;
          if (!pred || pred(get(x, z), x, z)) set(x, z, t);
        }
      }
    }
  };
  // a meandering walk (canyons, channels) from a start heading somewhere
  const walk = (x, z, ang, steps, stepLen, turn, ws) => {
    const pts = [[x, z]];
    const r = rng(seed + ws);
    for (let i = 0; i < steps; i++) { ang += (r() - 0.5) * turn; x += Math.cos(ang) * stepLen; z += Math.sin(ang) * stepLen; pts.push([x, z]); }
    return pts;
  };
  const clearMark = (x0, z0, x1, z1) => { for (let z = Math.floor(z0); z <= z1; z++) for (let x = Math.floor(x0); x <= x1; x++) if (inb(x, z)) keep[I(x, z)] = 1; };
  const pois = [];
  const poi = (kind, x, z, extra = {}) => { pois.push({ kind, x, z, ...extra }); const r = extra.clear ?? 2; clearMark(x - r, z - r, x + r, z + r); };

  // ---------------------------------------------------------------- 1. zones (a warped Voronoi) + ecotones
  const seeds = [];
  ZONES.forEach((zd, zi) => { if (!zd.c2) for (const [x, z] of zd.seeds) seeds.push({ x, z, zi }); });
  // the valley's neighbours along its edges (so the right zone meets each border)
  const near = { deepwood: [[40, -14], [80, -20], [120, -16], [160, -14], [192, -10]], sea: [[20, 150], [80, 146], [140, 146], [200, 148], [252, 152]],
    marsh: [[258, 62], [258, 98]], steppe: [[-16, 50], [-16, 88]], bouncecap: [[-18, 8]], glacier: [[256, 14]] };
  for (const [id, pts] of Object.entries(near)) for (const [x, z] of pts) seeds.push({ x, z, zi: ZI[id] });
  const second = new Uint8Array(W * H), mix = new Float32Array(W * H);
  // (the Hearthlands' loops stay inside their own box: C1)
  const eachC1 = (fn) => { for (let z = C1.z0; z < C1.z1; z++) for (let x = C1.x0; x < C1.x1; x++) fn(x, z); };
  for (let z = C1.z0; z < C1.z1; z++) for (let x = C1.x0; x < C1.x1; x++) {
    const i = I(x, z);
    if (inValley(x, z)) { zone[i] = ZI.valley; second[i] = ZI.valley; continue; }
    const wx = x + (fbm(x * 0.011, z * 0.011, seed + 1, 3) - 0.5) * 80;
    const wz = z + (fbm(x * 0.011 + 9.3, z * 0.011 + 4.1, seed + 2, 3) - 0.5) * 80;
    let b1 = 0, d1 = 1e18, b2 = 0, d2 = 1e18;
    for (const s of seeds) {
      const d = (wx - s.x) ** 2 + (wz - s.z) ** 2;
      if (d < d1) { if (s.zi !== b1) { d2 = d1; b2 = b1; } d1 = d; b1 = s.zi; }
      else if (d < d2 && s.zi !== b1) { d2 = d; b2 = s.zi; }
    }
    zone[i] = b1; second[i] = b2;
    mix[i] = Math.sqrt(d2) - Math.sqrt(d1);        // how deep inside its zone (tiles)
  }
  // the Heights and Deep Whisperwood meet exactly along the cliff line
  const cliffZ = (x) => -46 + Math.round((fbm(x * 0.045, 3.3, seed + 7, 3) - 0.5) * 12);
  for (let x = -40; x < 196; x++) {
    const edge = cliffZ(x);
    for (let z = C1.z0; z < 0; z++) {
      const i = I(x, z), id = Z[zone[i]];
      if (id !== 'heights' && id !== 'deepwood') continue;
      zone[i] = z < edge ? ZI.heights : ZI.deepwood;
      if (mix[i] > 6) mix[i] = 6;
      second[i] = z < edge ? ZI.deepwood : ZI.heights;
    }
  }

  // ---------------------------------------------------------------- 2. base ground (with soft edges between land zones)
  const base = (id, x, z) => {
    switch (id) {
      case 'deepwood': return N(x, z, 11, 0.06) > 0.64 ? (N(x, z, 12, 0.12) > 0.6 ? TT.MEADOW : TT.GRASS) : TT.FOREST;
      case 'heights': {
        if (ridge(x, z, 23, 0.03) > 0.93) return TT.ROCK;
        return N(x, z, 22, 0.045) > 0.6 ? TT.HILL : TT.HEATH;
      }
      case 'bouncecap': {
        const n = N(x, z, 32, 0.05);
        if (x > -70 && n > 0.62) return TT.LEAVES;
        return N(x, z, 31, 0.06) > 0.7 ? TT.FOREST : TT.MYCEL;
      }
      case 'glacier': {
        const south = z > -46 + (N(x, z, 43, 0.04) - 0.5) * 16;
        if (south) return TT.SNOW;
        if (ridge(x, z, 44, 0.028) > 0.94) return TT.ROCK;
        return N(x, z, 41, 0.06) > 0.64 ? TT.SNOW : TT.GLACIER;
      }
      case 'cloud': return TT.SKY;
      case 'steppe': return N(x, z, 61, 0.05) > 0.63 ? TT.GRASS : N(x, z, 62, 0.09) > 0.72 ? TT.MEADOW : TT.STEPPE;
      case 'canyon': return TT.MESA;
      case 'dunes': return N(x, z, 81, 0.07) > 0.74 ? TT.CANYON : TT.DUNE;
      case 'marsh': return N(x, z, 92, 0.08) > 0.55 ? TT.MARSH : TT.BOG;
      case 'volcano': return N(x, z, 101, 0.06) > 0.74 ? TT.BASALT : TT.ASH;
      default: return TT.WATER;
    }
  };
  for (let z = C1.z0; z < C1.z1; z++) for (let x = C1.x0; x < C1.x1; x++) {
    if (inValley(x, z)) continue;
    const i = I(x, z), a = Z[zone[i]], b = Z[second[i]];
    let id = a;
    // ecotone: near a land border, patches of the neighbour's ground creep in
    if (!OCEAN.has(a) && !OCEAN.has(b) && a !== 'cloud' && b !== 'cloud' && b !== 'valley' && mix[i] < 14) {
      const k = 1 - mix[i] / 14;
      if (N(x, z, 7, 0.09) < k * 0.55) id = b;
    }
    g[i] = base(id, x, z);
  }

  // ---------------------------------------------------------------- 3. zones take shape
  const zoneIs = (id) => (tt, x, z) => zid(x, z) === id;
  const notValley = (tt, x, z) => !inValley(x, z);

  // --- Windy Heights: a heather plateau above a long cliff wall
  for (let x = -40; x < 196; x++) {
    const edge = cliffZ(x);
    for (let z = Math.max(C1.z0, edge - 90); z < edge; z++) if (zid(x, z) === 'heights') { if (!HIGH.has(get(x, z)) && get(x, z) !== TT.WATER) set(x, z, TT.HEATH); }
    for (let z = edge; z < edge + 3; z++) if (inb(x, z) && zid(x, z) === 'heights') { zone[I(x, z)] = ZI.deepwood; set(x, z, TT.FOREST); }
  }
  ell(112, -86, 12, 6.5, TT.WATER, null, 3, 5);                        // the Great Tarn
  for (const [x, z, rx, rz] of [[18, -112, 5, 3], [150, -114, 6, 3.5], [-14, -80, 4, 2.6], [176, -74, 3.5, 2.2], [66, -124, 4, 2.5], [140, -70, 3, 2]]) ell(x, z, rx, rz, TT.WATER, zoneIs('heights'), 2, 6);
  ell(56, -102, 16, 11, TT.HILL, zoneIs('heights'), 4, 8);            // Breezy Hill, where the windmills turn
  for (let k = 0; k < 7; k++) { const r = rng(seed + 90 + k); const x = -30 + r() * 210, z = -125 + r() * 70; ell(x, z, 2 + r() * 3, 1.5 + r() * 2, TT.ROCK, zoneIs('heights'), 2, 9 + k); }

  // --- Deep Whisperwood: clearings and the gorge under the waterfall
  ell(96, -24, 7, 5, TT.GRASS, zoneIs('deepwood'), 3, 10);             // the hunters' clearing
  ell(150, -20, 6, 4, TT.MEADOW, zoneIs('deepwood'), 3, 11);           // the hidden glade
  ell(44, -28, 6, 4, TT.GRASS, zoneIs('deepwood'), 3, 12);
  for (let z = -44; z < 0; z++) for (let x = 106; x < 119; x++) if (Math.abs(x - 112.5) > 2.2 && Math.abs(x - 112.5) < 5.5 && N(x, z, 13, 0.2) > 0.4 && zid(x, z) === 'deepwood') set(x, z, TT.ROCK);

  // --- Bouncecap Woods: glowing pools, the Mother Cap's clearing, a spore bog
  ell(-150, -72, 9, 6, TT.MYCEL, null, 2, 30);
  ell(-134, -63, 6.5, 4, TT.WATER, null, 3, 31);
  for (const [x, z] of [[-228, -108], [-84, -96], [-192, -30], [-46, -22], [-250, -60], [-110, -120]]) ell(x, z, 4.5, 2.8, TT.WATER, zoneIs('bouncecap'), 2, 32);
  for (let z = -134; z < -80; z++) for (let x = -280; x < -200; x++) if (zid(x, z) === 'bouncecap' && N(x, z, 33, 0.07) > 0.58) set(x, z, N(x, z, 34, 0.1) > 0.62 ? TT.WATER : TT.BOG);

  // --- Frostpeak: the glacier's crevasses, the frozen lake, the sled runs
  const cr = rng(seed + 17);
  for (let k = 0; k < 22; k++) {
    const x = 196 + cr() * 190, z = -132 + cr() * 80, a = -0.4 + cr() * 0.8, L = 7 + cr() * 13;
    line([[x - Math.cos(a) * L / 2, z - Math.sin(a) * L / 2], [x, z + (cr() - 0.5) * 3], [x + Math.cos(a) * L / 2, z + Math.sin(a) * L / 2]], 1.3, TT.CREVASSE, (tt) => tt === TT.GLACIER, 1.5, 20 + k);
  }
  ell(300, -38, 10, 5.5, TT.ICE, zoneIs('glacier'), 3, 13);
  const sledRuns = [
    { name: 'Glacier Run', pts: [[236, -128], [240, -108], [232, -88], [238, -68], [234, -52]] },
    { name: 'Frostpeak Plunge', pts: [[336, -126], [330, -104], [340, -84], [332, -62], [336, -48]] },
  ];
  for (const run of sledRuns) {
    line(run.pts, 7, TT.SNOW, zoneIs('glacier'), 2, 25);
    for (let i = 0; i < run.pts.length - 1; i++) { const [ax, az] = run.pts[i], [bx, bz] = run.pts[i + 1]; clearMark(Math.min(ax, bx) - 4, Math.min(az, bz), Math.max(ax, bx) + 4, Math.max(az, bz)); }
  }

  // --- Cloud Isles: islands on a sea of clouds, joined by cloud bridges
  const isles = [[432, -72, 13, 8.5], [458, -104, 14, 8], [492, -62, 10, 7], [488, -118, 8, 5.5], [412, -112, 8, 5.5], [470, -40, 9, 5]];
  for (const [x, z, rx, rz] of isles) ell(x, z, rx, rz, TT.CLOUD, zoneIs('cloud'), 4, 30);
  line([[440, -79], [452, -97]], 3, TT.CLOUD, zoneIs('cloud'), 1.5, 36);
  line([[470, -104], [485, -113]], 3, TT.CLOUD, zoneIs('cloud'), 1.5, 37);
  line([[444, -68], [484, -62]], 2.6, TT.CLOUD, zoneIs('cloud'), 2, 38);
  // the Balloon Station: the glacier's last snowy spur, out over the sea of clouds
  ell(387, -67, 9, 7.5, TT.SNOW, (tt) => tt === TT.SKY, 2, 39);

  // --- Golden Steppe: a lake, rocky knolls, the Baobab's rise
  ell(-104, 18, 8, 5, TT.WATER, zoneIs('steppe'), 3, 60);
  for (const [x, z, r] of [[-36, 104, 3], [-118, 70, 4], [-60, 8, 3], [-20, 40, 2.4], [-88, 118, 3.2]]) ell(x, z, r * 1.3, r, TT.ROCK, zoneIs('steppe'), 2, 61);
  ell(-96, 86, 8, 6, TT.GRASS, zoneIs('steppe'), 3, 62);

  // --- Red Canyon: canyons carved through the mesas, basins for the mine & the town
  const canyonFloor = (tt, x, z) => zid(x, z) === 'canyon' || (zid(x, z) === 'steppe' && tt !== TT.WATER);
  line([[-262, -46], [-232, -12], [-206, 24], [-186, 64], [-166, 100], [-146, 128]], (k) => 10 + Math.sin(k * 1.7) * 3, TT.CANYON, canyonFloor, 6, 70);
  const branches = [[-206, 24, -2.6], [-186, 64, 0.2], [-232, -12, 0.3], [-170, 90, -0.5], [-200, 40, 2.9], [-176, 80, 2.4],
    [-246, -30, -2.2], [-220, 4, 1.4], [-192, 50, -1.2], [-160, 110, 0.9], [-180, 76, 1.8], [-214, 16, -0.6], [-240, 60, -1.6], [-150, 60, -1.9]];
  branches.forEach(([x, z, a], k) => line(walk(x, z, a, 9 + (k % 4), 6, 0.9, 71 + k), (s) => 7 + Math.sin(s * 1.3 + k) * 2.5, TT.CANYON, canyonFloor, 3, 72 + k));
  for (let k = 0; k < 6; k++) { const r = rng(seed + 180 + k); ell(-260 + r() * 110, -20 + r() * 130, 6 + r() * 5, 4 + r() * 3, TT.CANYON, zoneIs('canyon'), 2, 181 + k); }
  ell(-212, 26, 12, 8, TT.CANYON, zoneIs('canyon'), 3, 78);            // the mine yard
  ell(-198, 84, 13, 9, TT.CANYON, zoneIs('canyon'), 3, 79);            // Dusty Gulch
  ell(-150, 30, 10, 7, TT.CANYON, zoneIs('canyon'), 3, 80);            // where the road comes in

  // --- Sunscorch Dunes: oases, rock outcrops, the temple's plaza
  const oases = [[-150, 170, 7, 4.5], [-222, 222, 6, 4], [-96, 238, 5.5, 3.6], [-250, 150, 4, 2.6]];
  for (const [x, z, rx, rz] of oases) { ell(x, z, rx + 4, rz + 3, TT.GRASS, zoneIs('dunes'), 2, 84); ell(x, z, rx * 0.55, rz * 0.55, TT.WATER, zoneIs('dunes'), 1, 85); }
  for (let k = 0; k < 9; k++) { const r = rng(seed + 86 + k); const x = -270 + r() * 190, z = 130 + r() * 120; if (Math.hypot(x + 200, z - 212) < 16) continue; ell(x, z, 3 + r() * 5, 2 + r() * 3, TT.MESA, zoneIs('dunes'), 3, 87 + k); }
  for (let z = 204; z <= 224; z++) for (let x = -212; x <= -188; x++) if (Math.abs(x + 200) < 12 - Math.max(0, z - 220) * 3) set(x, z, TT.RUINS);

  // --- Croakmire: a bayou of channels around islands, the Frog King's lagoon
  const chr = rng(seed + 50);
  for (let k = 0; k < 16; k++) {
    const x = 250 + chr() * 120, z = 4 + chr() * 132;
    line(walk(x, z, chr() * Math.PI * 2, 8, 5, 1.2, 51 + k), 3 + chr() * 3, TT.WATER, zoneIs('marsh'), 2, 52 + k);
  }
  ell(310, 80, 16, 10, TT.WATER, zoneIs('marsh'), 4, 53);
  ell(310, 79, 5, 3.5, TT.MARSH, null, 1, 54);
  ell(286, 50, 10, 7, TT.MARSH, zoneIs('marsh'), 3, 55);               // Croakton, on firmer ground
  for (let z = 0; z < 140; z++) for (let x = 240; x < 380; x++) if (zid(x, z) === 'marsh' && get(x, z) === TT.BOG && N(x, z, 56, 0.08) > 0.68) set(x, z, TT.FOREST);

  // --- Emberpeak: the cone, the crater, lava down the flanks, hot springs
  const V = { x: 455, z: 50 };
  ell(V.x, V.z, 36, 25, TT.BASALT, zoneIs('volcano'), 1.2, 40);
  ell(V.x, V.z - 1, 17, 11, TT.ASH, null, 1, 46);                       // the crater's ashy floor
  ell(V.x, V.z - 2, 12, 7.5, TT.LAVA, null, 2, 41);
  const flows = [[[V.x + 8, V.z + 6], [470, 88], [484, 124], [492, 160]], [[V.x - 9, V.z + 6], [432, 86], [416, 122], [404, 160]], [[V.x + 12, V.z - 4], [492, 28], [520, 20]], [[V.x - 11, V.z - 4], [420, 24], [398, 2], [390, -24]]];
  flows.forEach((pts, k) => line(pts, (s) => 3.2 + Math.sin(s * 2.1 + k) * 0.8, TT.LAVA, (tt, x, z) => zid(x, z) === 'volcano' || tt === TT.WATER, 3.5, 42 + k));
  for (const [x, z] of [[402, 64], [438, 104], [476, 4]]) { ell(x, z, 5, 3.4, TT.ASH, zoneIs('volcano'), 1, 47); ell(x, z, 3, 2, TT.WATER, zoneIs('volcano'), 1, 48); }

  // --- the southern seas: an atoll, a drowned city, rocky straits, islets
  const island = (x, z, rx, rz, inner = TT.GRASS, beach = TT.SAND, ws = 60) => {
    ell(x, z, rx, rz, beach, null, 3, ws);
    if (rx > 3.5) ell(x, z, rx * 0.62, rz * 0.62, inner, null, 3, ws + 1);
  };
  const A = { x: 238, z: 206, rx: 64, rz: 40 };
  for (let z = A.z - A.rz - 8; z <= A.z + A.rz + 8; z++) for (let x = A.x - A.rx - 8; x <= A.x + A.rx + 8; x++) {
    const d = Math.hypot((x - A.x) / A.rx, (z - A.z) / A.rz) + (fbm(x * 0.07, z * 0.07, seed + 70, 2) - 0.5) * 0.12;
    if (d < 0.9) set(x, z, TT.CORAL);
    else if (d < 1.0) {
      const ang = Math.atan2(z - A.z, x - A.x) + Math.PI;
      const gap = [0.25, 2.1, 3.9, 5.3].some((q) => Math.abs(ang - q) < 0.06);
      set(x, z, gap ? TT.CORAL : d > 0.935 && d < 0.97 && hash2(x, z, 71) < 0.85 ? TT.GRASS : TT.SAND);
    }
  }
  for (let z = A.z - 26; z <= A.z + 26; z++) for (let x = A.x - 44; x <= A.x + 44; x++) if (get(x, z) === TT.CORAL && N(x, z, 74, 0.05) < 0.36) set(x, z, TT.WATER); // deeper pools
  island(238, 208, 8, 5, TT.GRASS, TT.SAND, 72);                       // Turtle Nest islet
  for (const [x, z] of [[204, 192], [266, 224], [214, 226], [276, 190], [250, 180]]) island(x, z, 2.8, 1.9, TT.SAND, TT.SAND, 73);
  const S = { x: 30, z: 206 };
  ell(S.x, S.z, 40, 28, TT.CORAL, zoneIs('sunken'), 5, 80);
  for (let bz = -3; bz <= 3; bz++) for (let bx = -4; bx <= 4; bx++) {
    const x = S.x + bx * 8, z = S.z + bz * 7;
    if (Math.hypot(bx / 4.6, bz / 3.6) > 1 || hash2(bx, bz, 81) < 0.28 || (bx === 0 && bz === 0)) continue;
    const w = 4 + Math.floor(hash2(bx, bz, 82) * 3), h = 3 + Math.floor(hash2(bx, bz, 83) * 2);
    for (let z2 = z - 1; z2 < z + h - 1; z2++) for (let x2 = x - 2; x2 < x - 2 + w; x2++) set(x2, z2, TT.RUINS);
  }
  ell(S.x, S.z, 8, 5.5, TT.RUINS, null, 0, 84);                         // the old forum
  for (let x = S.x - 30; x <= S.x + 30; x++) for (const z of [S.z - 1, S.z]) if (get(x, z) === TT.CORAL) set(x, z, TT.WATER);   // the grand canal
  for (let z = S.z - 22; z <= S.z + 22; z++) for (const x of [S.x - 1, S.x]) if (get(x, z) === TT.CORAL) set(x, z, TT.WATER);
  island(92, 246, 4.5, 3, TT.RUINS, TT.SAND, 85);                       // the old lighthouse rock

  // --- Dino Isle (Adventure v5): a jungle island of dinosaurs. Lobes of jungle
  // round a rocky height, fern meadows where the long-necks graze, the Tyrant
  // King's clearing in the north, Nest Hollow in the south-east
  const DI = { x: 408, z: 214 };
  const nearIsle = (x, z, k = 1) => ((x - DI.x) / (46 * k)) ** 2 + ((z - DI.z) / (36 * k)) ** 2 < 1;
  for (const [x, z, rx, rz, ws] of [[408, 214, 34, 24, 140], [392, 197, 14, 10, 141], [436, 223, 12, 11, 142], [387, 231, 12, 8, 143], [424, 203, 12, 8, 144]]) ell(x, z, rx, rz, TT.JUNGLE, (tt) => tt === TT.WATER || tt === TT.CORAL || tt === TT.JUNGLE, 2.2, ws);
  // (everything around it belongs to the island: its music, its foes, its turquoise shallows)
  for (let z = DI.z - 40; z <= DI.z + 40; z++) for (let x = DI.x - 52; x <= DI.x + 52; x++) {
    if (!inb(x, z) || !nearIsle(x, z, 1.1)) continue;
    const i = I(x, z), was = Z[zone[i]];
    if (OCEAN.has(was) || was === 'dino') zone[i] = ZI.dino;           // (Emberpeak's shore stays Emberpeak's)
  }
  const isle = (tt, x, z) => zid(x, z) === 'dino' && tt !== TT.WATER && tt !== TT.CORAL;
  ell(386, 214, 11, 8, TT.MEADOW, isle, 3, 145);                      // the Fern Meadows
  ell(384, 214, 7, 5, TT.GRASS, isle, 2, 146);
  ell(429, 205, 9.5, 6.5, TT.GRASS, isle, 2, 147);                    // the Tyrant King's clearing
  ell(431, 230, 7, 4.5, TT.MEADOW, isle, 2, 148);                     // Nest Hollow
  ell(415, 217, 8.5, 5.5, TT.ROCK, isle, 2, 149);                     // Fernpeak, a rocky height
  ell(397, 201, 3, 2, TT.MEADOW, isle, 1, 150);
  ell(441, 219, 5.5, 4, TT.MEADOW, isle, 2, 153);                     // Gloomfern Glade, where the gloom camps
  ell(400, 236, 5, 3.5, TT.GRASS, isle, 2, 154);
  const sr = rng(seed + 90);
  for (let k = 0; k < 16; k++) { const x = 368 + sr() * 142, z = 166 + sr() * 88; if (Math.hypot(x - 470, z - 214) < 14 || nearIsle(x, z, 1.05)) continue; island(x, z, 1.8 + sr() * 3.5, 1.4 + sr() * 2.5, TT.ROCK, TT.ROCK, 91 + k); }
  island(470, 214, 9, 6.5, TT.GRASS, TT.SAND, 99);                      // Lighthouse Isle
  for (const [x, z, r] of [[62, 150, 3.5], [172, 152, 4.5], [-34, 162, 3], [336, 160, 3.5], [120, 176, 2.5]]) island(x, z, r * 1.4, r, TT.GRASS, TT.SAND, 100);

  // ---------------------------------------------------------------- 4. the rim of the Hearthlands
  // rocky heights north and west; the sea south; east, a wavy coast onto the
  // Wide Sea (and a wall of crags where the sea of clouds ends)
  eachC1((x, z) => {
    if (inValley(x, z)) return;
    const id = zid(x, z), n = (N(x, z, 120, 0.12) - 0.5) * 6;
    const east = x >= C1.x1 - 12 + (N(x, z, 121, 0.035, 2) - 0.5) * 18 + n * 0.5;
    if (z < C1.z0 + 7 + n && id !== 'cloud') set(x, z, TT.ROCK);
    else if (x < C1.x0 + 7 + n && !OCEAN.has(id)) set(x, z, id === 'dunes' || id === 'canyon' ? TT.MESA : TT.ROCK);
    else if (id === 'cloud' && (x >= C1.x1 - 7 + n || z < C1.z0 + 5 + n)) set(x, z, TT.ROCK);
    else if ((east || z >= C1.z1 - 8 + n) && id !== 'cloud') { set(x, z, TT.WATER); if (east && !OCEAN.has(id)) zone[I(x, z)] = ZI.wide; }
  });

  // ---------------------------------------------------------------- 4b. relief (World v7)
  // the north & west rims rise into a mountain wall (crags, peaks along the top);
  // Frostpeak gets real mountains, Breezy Hill a second level, Emberpeak a stepped
  // cone with its crater up top, and the dunes their red buttes
  eachC1((x, z) => {
    if (inValley(x, z)) return;
    const i = I(x, z), t = g[i], id = zid(x, z);
    if (t !== TT.ROCK && t !== TT.MESA) return;
    const n = (N(x, z, 120, 0.12) - 0.5) * 6;
    const d = Math.max(C1.z0 + 7 + n - z, OCEAN.has(id) ? 0 : C1.x0 + 7 + n - x, id === 'cloud' ? Math.max(x - (C1.x1 - 7 + n), C1.z0 + 5 + n - z) : 0);
    if (d <= 0) return;
    elev[i] = Math.min(4, 1 + Math.floor(d / 1.7));
    if (d > 1.6) g[i] = TT.CRAG;
  });
  {
    const r = rng(seed + 130);
    for (let x = C1.x0 + 12; x < C1.x1 - 8; x += 11 + Math.floor(r() * 6)) {
      const z = C1.z0 + 2.5 + r() * 1.5, id = zid(Math.floor(x), Math.floor(z + 6));
      if (get(Math.floor(x), Math.floor(z)) !== TT.CRAG) continue;
      pois.push({ kind: 'peak', x, z, style: id === 'bouncecap' ? 'mossy' : id === 'deepwood' ? 'rock' : 'snow', h: 5 + r() * 5 });
    }
    for (let z = C1.z0 + 16; z < C1.z1 - 20; z += 12 + Math.floor(r() * 6)) {
      const x = C1.x0 + 2.5 + r() * 1.5, id = zid(Math.floor(x + 6), Math.floor(z));
      if (get(Math.floor(x), Math.floor(z)) !== TT.CRAG) continue;
      pois.push({ kind: 'peak', x, z, style: id === 'dunes' || id === 'canyon' || id === 'steppe' ? 'red' : 'mossy', h: 4 + r() * 4 });
    }
  }
  const iceOk = (tt, x, z) => zid(x, z) === 'glacier' && tt !== TT.WATER && !keep[I(x, z)];
  mountain(292, -121, 25, 11, 4, { crag: 3, ground: TT.SNOW, pred: iceOk, ws: 410, peaks: 4, style: 'snow' });
  mountain(371, -117, 13, 8, 3, { crag: 3, ground: TT.SNOW, pred: iceOk, ws: 420, peaks: 2, style: 'snow' });
  raise(56, -102, 18, 13, 2, (tt) => tt === TT.HILL, 0, 0);
  {
    const coneOk = (tt, x, z) => zid(x, z) === 'volcano' && tt !== TT.WATER;
    raise(V.x, V.z - 2, 28, 19, 2, coneOk, 2, 400);
    raise(V.x, V.z - 3, 21, 14, 3, coneOk, 1.5, 401);
    raise(V.x, V.z - 3, 17.5, 11.5, 4, coneOk, 1, 402);                 // the crater's rim…
    raise(V.x, V.z - 3, 13.5, 8.8, 3, coneOk, 0.8, 403, true);          // …and the crater floor, a step down inside it
  }
  // the dunes' buttes (Monument Valley) and Sunrock, a great red monolith
  for (const [x, z, rx, rz, lv] of [[-240, 186, 10, 5.5, 3], [-128, 150, 3.2, 2.2, 3], [-262, 244, 3, 2, 2], [-184, 250, 3.6, 2.4, 3], [-108, 196, 2.6, 2, 2]]) {
    ell(x, z, rx, rz, TT.CRAG, (tt, x2, z2) => zid(x2, z2) === 'dunes' && tt !== TT.WATER && !keep[I(x2, z2)], 1.2, 131);
    raise(x, z, rx + 1, rz + 1, lv, (tt) => tt === TT.CRAG, 0, 0);
  }

  // ---------------------------------------------------------------- 5. rivers
  const river = (pts, w, wig = 3, ws = 0) => line(pts, w, TT.WATER, notValley, wig, ws);
  river([[112, -86], [110, -70], [113, -58], [112, -44], [111, -24], [112, -8], [112, 0]], 3.4, 2, 1);
  river([[-60, -30], [-56, -4], [-52, 22], [-46, 52], [-52, 82], [-44, 108], [-38, 134]], 3.8, 5, 2);
  river([[-262, -46], [-232, -12], [-206, 24], [-186, 64], [-166, 100], [-146, 128], [-120, 150]], 3.2, 2, 3);
  river([[300, -40], [298, -10], [303, 20], [297, 50], [305, 86], [318, 118], [332, 150]], 3.4, 5, 4);
  // (World v7) the Heights' tarns & river lie on the plateau: the river falls off its cliff into the gorge
  eachC1((x, z) => { const i = I(x, z); if (g[i] === TT.WATER && zid(x, z) === 'heights') elev[i] = 1; });

  // ---------------------------------------------------------------- 6. coasts
  const dW = distTo(g, (t) => t === TT.WATER || t === TT.CORAL, 4);
  for (let z = C1.z0; z < C1.z1; z++) for (let x = C1.x0; x < C1.x1; x++) {
    if (inValley(x, z)) continue;
    const i = I(x, z), t = g[i], d = dW[i];
    if (d === 0 || d > 3) continue;
    const id = Z[zone[i]];
    if (HIGH.has(t) || t === TT.LAVA || t === TT.RUINS || t === TT.CLOUD || t === TT.SKY || t === TT.ICE) continue;
    const salty = OCEAN.has(id) || id === 'dunes' || id === 'steppe' || id === 'dino' || (id === 'volcano' && (z > 110 || x > 500));
    if (!salty) continue;
    if (id === 'volcano') { if (d <= 2) g[i] = TT.ASH; continue; }
    if (d <= 2 + (hash2(x, z, 110) < 0.5 ? 1 : 0)) g[i] = TT.SAND;
  }

  // ---------------------------------------------------------------- 6b. Dino Isle's river & tar pits
  line([[411, 223], [406, 229], [399, 234], [395, 240], [393, 247]], 2.6, TT.WATER, isle, 2, 151);
  for (const [x, z, rx, rz] of [[397, 210, 2.6, 1.7], [414, 208.6, 2.2, 1.5], [380, 227, 2.4, 1.6], [393, 222, 2.2, 1.5]]) ell(x, z, rx, rz, TT.TAR, (tt, x2, z2) => isle(tt, x2, z2) && tt !== TT.ROCK && tt !== TT.SAND, 1, 152);

  // ---------------------------------------------------------------- 7. the valley
  const vm = valley || buildOverworld();
  for (let z = 0; z < vm.h; z++) for (let x = 0; x < vm.w; x++) g[I(x, z)] = vm.ground[z * vm.w + x];
  for (let z = 0; z < vm.h; z++) for (let x = 0; x < vm.w; x++) if (vm.ground[z * vm.w + x] === TT.PLANK_H || vm.ground[z * vm.w + x] === TT.PLANK_V) deck[I(x, z)] = 1;

  // ---------------------------------------------------------------- 8. roads
  // (roads keep the height of the ground they cross: stairs where it steps)
  baseRelief();
  const carved = [];                        // valley tiles opened up (trees there get tucked away)
  const roads = [];
  const road = (pts, w = 2, ws = 0) => {
    roads.push(pts);
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L * 2));
      for (let s = 0; s <= n; s++) {
        const k = s / n;
        const wig = ws >= 0 ? (fbm((ax + (bx - ax) * k) * 0.05, (az + (bz - az) * k) * 0.05, seed + 200 + ws, 2) - 0.5) * 3 : 0;
        const nx = -(bz - az) / (L || 1), nz = (bx - ax) / (L || 1);
        const cx = ax + (bx - ax) * k + nx * wig, cz = az + (bz - az) * k + nz * wig;
        for (let j = -1; j <= w; j++) for (let q = -1; q <= w; q++) {
          const x = Math.floor(cx - w / 2 + 0.5) + q, z = Math.floor(cz - w / 2 + 0.5) + j;
          if (!inb(x, z)) continue;
          keep[I(x, z)] = 1;
          if (j < 0 || q < 0 || j >= w || q >= w) continue;
          const t = get(x, z), idx = I(x, z);
          if (t === TT.WATER || t === TT.CORAL) { g[idx] = TT.PLANK_H; if (!deck[idx]) deck[idx] = 2; }
          else if (t === TT.LAVA) g[idx] = TT.OBSIDIAN;
          else if (t === TT.CREVASSE) g[idx] = TT.SNOW;
          else if (t === TT.SKY) g[idx] = TT.CLOUD;
          else if (t === TT.PLANK_H || t === TT.PLANK_V || t === TT.PLAZA || t === TT.OBSIDIAN || t === TT.RUINS || t === TT.CLOUD || t === TT.METAL || t === TT.COBBLE) continue;
          else {
            if (inValley(x, z) && t !== TT.PATH) carved.push([x, z]);
            g[idx] = TT.PATH;
          }
        }
      }
    }
  };
  // west: the Pinewick road across the steppe to the canyon; a branch to the dunes
  road([[3, 69.5], [-20, 69], [-44, 63], [-70, 52], [-100, 44], [-128, 38], [-150, 32], [-175, 30], [-200, 26]], 2, 1);
  road([[-70, 52], [-80, 82], [-94, 112], [-116, 140], [-150, 166], [-180, 188], [-200, 204]], 2, 2);
  road([[-198, 84], [-186, 64], [-200, 26]], 2, 10);
  // north-west: from Maple Hollow up into Bouncecap Woods
  road([[21, 22], [18, 10], [14, 0], [4, -14], [-20, -26], [-60, -40], [-100, -54], [-138, -66]], 2, 3);
  road([[-200, 26], [-208, 0], [-214, -28], [-196, -56], [-160, -70]], 2, 4);
  // north: the camp trail through Deep Whisperwood, switchbacks up to the Heights
  road([[76, 26], [75, 12], [73, 0], [70, -14], [66, -28], [72, -36], [64, -42], [72, -48], [64, -54], [70, -62], [66, -76], [58, -92]], 2, 5);
  road([[58, -92], [86, -96], [112, -100], [140, -98], [170, -90], [200, -82], [226, -72]], 2, 6);
  road([[58, -92], [30, -100], [0, -98], [-30, -90], [-60, -84], [-100, -80], [-140, -76]], 2, 7);
  // north-east: from Frostpine up the foothills onto the glacier, to the balloon station
  road([[200, 21], [206, 10], [210, 0], [216, -16], [232, -30], [254, -44], [284, -32], [300, -52], [330, -62], [364, -66], [388, -66]], 2, 8);
  // east: from Blossom Glade through Croakmire to Emberpeak's rim
  road([[222, 62], [234, 61], [246, 60], [266, 56], [286, 50], [300, 58], [320, 64], [350, 62], [380, 64], [404, 62], [424, 56], [440, 46], [448, 40]], 2, 9);
  // south-east: from Emberpeak's hot springs road down to the coast and over the strait to Dino Isle,
  // then trails to the Fern Meadows, the Tyrant King's clearing and Nest Hollow (a plank bridge over the river)
  road([[380, 64], [386, 88], [390, 116], [392, 146], [392, 168], [392, 190]], 2, 11);
  road([[392, 190], [389, 200], [388, 208]], 2, 12);
  road([[390, 205], [402, 207], [412, 205], [421, 206]], 2, 13);
  road([[402, 207], [404, 219], [400, 231], [412, 238], [427, 233]], 2, 14);
  // the Reedmarsh boardwalk carries on east over the bog to the Frog King
  for (let x = 229; x < 296; x++) for (const z of [86, 87]) {
    const t = get(x, z);
    if (x < 240 && t !== TT.WATER && t !== TT.PLANK_H && t !== TT.MARSH && t !== TT.FOREST && t !== TT.MEADOW && t !== TT.GRASS) continue;
    const idx = I(x, z);
    keep[idx] = 1;
    if (t === TT.WATER || t === TT.BOG || t === TT.MARSH || t === TT.FOREST || x >= 240) { g[idx] = TT.PLANK_H; if (!deck[idx]) deck[idx] = 2; if (inValley(x, z)) carved.push([x, z]); }
  }
  // open the valley's forest belts where the roads leave
  const clear = (x0, z0, w, h, t) => { for (let z = z0; z < z0 + h; z++) for (let x = x0; x < x0 + w; x++) if (inb(x, z) && g[I(x, z)] === TT.FOREST) { g[I(x, z)] = t; if (inValley(x, z)) carved.push([x, z]); } };
  clear(0, 66, 5, 8, TT.GRASS);
  clear(228, 56, 12, 9, TT.MEADOW);
  clear(226, 82, 14, 8, TT.MARSH);

  // ---------------------------------------------------------------- 9. points of interest
  // landmarks (built from models/landmarks.js), camps, and a waystone in every zone
  poi('waystone', 95.5, 71, { zone: 'valley', clear: 0, name: 'Market Plaza' });
  poi('waystone', 82, -26, { zone: 'deepwood', clear: 1, name: 'Foresters’ Clearing' });
  poi('camp', 99, -22, { clear: 4 });
  poi('waystone', 62, -86, { zone: 'heights', name: 'Breezy Hill' });
  for (const [x, z] of [[42, -104], [56, -114], [70, -104]]) poi('windmill', x, z, { clear: 3 });
  // the southern edge of the heather plateau at x: where the gliders take off
  const rim = (x) => { let e = null; for (let z = -130; z < 0; z++) if ((get(x, z) === TT.HEATH || get(x, z) === TT.HILL) && zid(x, z) === 'heights') e = z; return e; };
  for (const x of [24, 150, 96]) { const e = rim(x); if (e !== null) { poi('glider_pad', x, e - 1.2, { clear: 3, pad: true }); for (let z = e - 4; z <= e; z++) for (let dx = -2; dx <= 2; dx++) if (get(x + dx, z) === TT.ROCK) set(x + dx, z, TT.HEATH); } }
  for (const [x, z] of [[100, -96], [128, -104], [-10, -96], [180, -86], [30, -80]]) poi('cairn', x, z, { clear: 1 });
  poi('waystone', -142, -62, { zone: 'bouncecap', name: 'the Mother Cap' });
  poi('mother_cap', -152, -76, { clear: 5 });
  for (const [x, z] of [[-200, -40], [-92, -104], [-236, -122], [-60, -60]]) poi('fairy_ring', x, z, { clear: 3 });
  poi('camp', -128, -80, { clear: 4 });
  poi('waystone', 258, -48, { zone: 'glacier', name: 'Frostpeak Camp' });
  poi('igloo', 288, -30, { clear: 3 });
  poi('igloo', 294, -26, { clear: 3 });
  poi('ice_arch', 262, -104, { clear: 4 });
  for (const run of sledRuns) poi('sled_ramp', run.pts[0][0], run.pts[0][1] + 3, { clear: 3, run: run.name });
  poi('balloon_dock', 389, -71, { clear: 4 });
  poi('waystone', 382, -64, { zone: 'glacier', name: 'Balloon Station' });
  poi('cloud_temple', 458, -106, { clear: 5 });
  poi('balloon_dock', 427, -73, { clear: 4 });
  poi('waystone', 440, -76, { zone: 'cloud', name: 'Cloud Harbour' });
  poi('waystone', -64, 48, { zone: 'steppe', name: 'Nomad Camp' });
  for (const [x, z] of [[-78, 38], [-70, 34], [-62, 36]]) poi('yurt', x, z, { clear: 3 });
  poi('baobab', -96, 84, { clear: 4 });
  poi('waystone', -150, 36, { zone: 'canyon', name: 'Canyon Gate' });
  poi('mine_entrance', -214, 19.5, { clear: 3 });
  poi('water_tower', -204, 30, { clear: 2 });
  poi('water_tower', -190, 80, { clear: 2 });
  poi('rock_arch', -176, 46, { clear: 3 });
  poi('camp', -198, 90, { clear: 4 });
  // (World v7) Dusty Gulch: a gold-rush town round the railway's end
  for (const [style, x, z] of [['saloon', -205, 80.5], ['store', -185.5, 84], ['sheriff', -215, 87.5], ['assay', -187, 94]]) poi('frontier', x, z, { style, clear: 3 });
  poi('waystone', -148, 176, { zone: 'dunes', name: 'Palm Oasis' });
  poi('oasis_tent', -156, 162, { clear: 3 });
  poi('oasis_tent', -142, 164, { clear: 3 });
  poi('sand_temple', -200, 212, { clear: 6 });
  poi('worm_bones', -112, 226, { clear: 5 });
  poi('waystone', 30, 212, { zone: 'sunken', name: 'the Old Forum' });
  poi('sunken_statue', 30, 204, { clear: 3 });
  for (const [x, z] of [[14, 206], [46, 206], [30, 190], [30, 222]]) poi('ruin_arch', x, z, { clear: 2 });
  poi('dome_temple', 92, 244, { clear: 3 });
  poi('waystone', 238, 210, { zone: 'lagoon', name: 'Turtle Nest' });
  poi('stilt_hut', 206, 196, { clear: 3 });
  poi('stilt_hut', 268, 220, { clear: 3 });
  poi('shipwreck', 300, 176, { clear: 4 });
  poi('waystone', 468, 218, { zone: 'straits', name: 'Lighthouse Isle' });
  poi('lighthouse', 472, 210, { clear: 3 });
  for (const [x, z] of [[358, 190], [446, 246], [500, 176], [410, 252]]) poi('sea_stack', x, z, { clear: 2 });
  poi('shipwreck', 430, 186, { clear: 4 });
  poi('waystone', 296, 44, { zone: 'marsh', name: 'Croakton' });
  poi('frog_throne', 310, 79, { clear: 5 });
  for (const [x, z] of [[278, 46], [292, 40], [284, 58]]) poi('stilt_house', x, z, { clear: 3 });
  for (const [x, z] of [[300, 74], [320, 74], [304, 88], [318, 86], [296, 82]]) poi('lilypad', x, z, { clear: 1, deck: true });
  poi('waystone', 404, 58, { zone: 'volcano', name: 'Hot Springs' });
  poi('onsen', 404, 70, { clear: 4 });
  poi('forge_gate', 448, 36, { clear: 3 });
  for (const [x, z] of [[416, 44], [436, 96], [478, 12], [470, 92]]) poi('geyser', x, z, { clear: 2 });
  poi('waystone', 150, -18, { zone: 'deepwood', name: 'the Hidden Glade' });
  poi('waystone', 395, 193, { zone: 'dino', name: 'Fern Landing' });
  poi('dino_station', 382, 194, { clear: 4 });
  poi('dino_skeleton', 380, 214, { clear: 5 });
  poi('rex_nest', 430, 200, { clear: 6 });
  for (const [x, z] of [[426, 229], [433, 232], [437, 226]]) poi('dino_nest', x, z, { clear: 2 });

  // (World v7) the Pelican Post's roosts, by the hubs (the Post opens in chapter 2)
  for (const [rid, name, zone, x, z] of [
    ['marigold', 'Marigold Cove', 'valley', 134.5, 94.5], ['foresters', 'Foresters’ Clearing', 'deepwood', 86.5, -29], ['breezy', 'Breezy Hill', 'heights', 66.5, -83],
    ['nomad', 'Nomad Camp', 'steppe', -58.5, 51.5], ['gulch', 'Dusty Gulch', 'canyon', -191.5, 91.5], ['mothercap', 'the Mother Cap', 'bouncecap', -136.5, -58.5],
    ['croakton', 'Croakton', 'marsh', 300.5, 47.5], ['frostcamp', 'Frostpeak Camp', 'glacier', 263.5, -44.5], ['cloudharbour', 'Cloud Harbour', 'cloud', 444.5, -72.5],
    ['oasis', 'Palm Oasis', 'dunes', -142.5, 179.5], ['turtlenest', 'Turtle Nest', 'lagoon', 242.5, 213.5], ['forum', 'the Old Forum', 'sunken', 34.5, 215.5],
    ['hotsprings', 'Hot Springs', 'volcano', 408.5, 61.5], ['lighthouseisle', 'Lighthouse Isle', 'straits', 464.5, 221.5], ['fernlanding', 'Fern Landing', 'dino', 399.5, 196.5],
  ]) { const [rx, rz] = zone === 'valley' ? [x, z] : dryNear(x, z); poi('roost', rx, rz, { rid, name, zone, clear: 2 }); }

  // ---------------------------------------------------------------- 9b. the Festival Ring
  // the grand arena on the Golden Steppe, past the valley's west gate: raked
  // sand inside, the ground cleared for the stands around it, and a lane from
  // the north gate up to the Pinewick road
  const arena = { ...ARENA_SITE };
  {
    const A = arena;
    for (let z = Math.floor(A.z - A.rz - 7); z <= A.z + A.rz + 7; z++) for (let x = Math.floor(A.x - A.rx - 7); x <= A.x + A.rx + 7; x++) {
      if (!inb(x, z) || inValley(x, z)) continue;
      const dx = x + 0.5 - A.x, dz = z + 0.5 - A.z;
      if ((dx / (A.rx + 5.6)) ** 2 + (dz / (A.rz + 6.2)) ** 2 > 1) continue;
      const idx = I(x, z);
      keep[idx] = 1;
      if ((dx / (A.rx + 1.3)) ** 2 + (dz / (A.rz + 1.3)) ** 2 <= 1) g[idx] = TT.ARENA;
      else if (g[idx] !== TT.PATH && (HIGH.has(g[idx]) || !TINFO_WALK(g[idx]))) g[idx] = TT.STEPPE;
    }
    line([[A.x, A.z - A.rz - 1.5], [A.x, 70]], 2.2, TT.PATH, (tt) => tt !== TT.ARENA);
    clearMark(A.x - 3, 66, A.x + 3, A.z - A.rz);
    poi('arena', A.x, A.z, { clear: 0, name: 'Festival Ring' });
  }

  // ---------------------------------------------------------------- 10. things to ride
  // the Red Canyon railway: from the mine yard down to Dusty Gulch (cuttings through
  // the mesa, a trestle over water)
  const rails = [{ name: 'Canyon Railway', pts: [[-214, 28], [-208, 42], [-200, 54], [-194, 64], [-196, 76], [-200, 86]] }];
  for (const r of rails) {
    for (let i = 0; i < r.pts.length - 1; i++) {
      const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1], L = Math.hypot(bx - ax, bz - az);
      for (let k = 0; k <= L * 3; k++) {
        const x = ax + (bx - ax) * k / (L * 3), z = az + (bz - az) * k / (L * 3);
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
          const tx = Math.floor(x + dx * 0.7), tz = Math.floor(z + dz * 0.7);
          if (!inb(tx, tz)) continue;
          const idx = I(tx, tz), tt = g[idx];
          keep[idx] = 1;
          if (tt === TT.WATER) { g[idx] = TT.PLANK_H; deck[idx] = 2; }
          else if (tt === TT.MESA || tt === TT.ROCK) g[idx] = TT.CANYON;
        }
      }
    }
  }
  // ziplines: from a clifftop down to lower ground (both ends kept clear)
  const zr = rim(36);
  const ziplines = [
    { from: [36, (zr ?? -66) - 1.5, 3.2], to: [38, (zr ?? -66) + 22, 0.2] },
    { from: [-222, 12, 2.8], to: [-214, 26, 0.2] },
    { from: [262, -118, 2.4], to: [262, -98, 0.2] },
  ];
  for (const zl of ziplines) for (const [x, z] of [zl.from, zl.to]) { clearMark(x - 2, z - 2, x + 2, z + 2); for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const t = get(x + dx, z + dz); if (t === TT.FOREST) set(x + dx, z + dz, TT.GRASS); } }
  // whirlpools in the straits, and glinting dive spots all over the warm seas
  const whirlpools = [{ x: 452, z: 252, r: 5 }, { x: 500, z: 190, r: 4.5 }, { x: 354, z: 234, r: 4 }];
  const dives = [];
  const dr = rng(seed + 300);
  for (let k = 0; k < 900 && dives.length < 44; k++) {
    const x = Math.floor(C1.x0 + dr() * (C1.x1 - C1.x0)) + 0.5, z = Math.floor(130 + dr() * 130) + 0.5;
    const tt = get(Math.floor(x), Math.floor(z)), id = zid(Math.floor(x), Math.floor(z));
    if ((tt !== TT.CORAL && tt !== TT.WATER) || !['lagoon', 'sunken', 'straits', 'sea', 'dino'].includes(id)) continue;
    if (dives.some((d) => Math.hypot(d.x - x, d.z - z) < 12)) continue;
    const roll = dr();
    dives.push({ x, z, loot: roll < 0.12 ? 'relic' : roll < 0.4 ? 'shell' : 'pearl', zone: id });
  }

  // ---------------------------------------------------------------- 11. the Wide Sea & the Dawnlands (gen2.js)
  generateDawn({ g, zone, deck, keep, elev, I, inb, get, set, zid, N, ridge, ell, line, walk, raise, mountain, baseRelief, dryNear, clearMark, poi, pois, island, road, distTo, seed, Z, ZI, rails, ziplines, whirlpools, dives });

  // ---------------------------------------------------------------- 12. relief: what nobody walks on
  baseRelief();
  const block = reliefBlocks(g, elev);

  const t1 = Date.now();
  return { X0, Z0, W, H, seed, ground: g, zone, deck, keep, elev, block, carved, roads, pois, sledRuns, rails, ziplines, whirlpools, dives, arena, ms: t1 - t0, I, inb, inValley };
}

// (World v7) the tiles the relief keeps you off: 1 = a cliff's face (the rows its
// painted face mostly covers, under higher ground), 2 = a ledge (a drop of two
// levels or more beside it, north, east or west, with no face to show it).
// Paths (stairs) and bridges ignore both.
// (World v7) also for an outdoor instance’s own little map (saga/instance.js): pass its size
export function reliefBlocks(g, elev, W = BIG.W, H = BIG.H) {
  const b = new Uint8Array(W * H);
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    const i = z * W + x, e = elev[i];
    for (let k = 1; k <= 4 && z - k >= 0; k++) {
      const E = elev[i - k * W];
      if (E === e + 1 && SLOPE.has(g[i - k * W]) && SLOPE.has(g[i])) break;          // (a bank: walk it)
      if (E > e && faceTex(E, e) > (k - 1) * 16 + 8) { b[i] = 1; break; }
    }
    if (b[i] || e < 2) continue;
    if ((z > 0 && elev[i - W] <= e - 2) || (x > 0 && elev[i - 1] <= e - 2) || (x < W - 1 && elev[i + 1] <= e - 2)) b[i] = 2;
  }
  return b;
}

// distance (in tiles, capped) from every tile to the nearest `isSrc` tile
function distTo(g, isSrc, cap) {
  const d = new Uint8Array(W * H).fill(255);
  for (let i = 0; i < W * H; i++) if (isSrc(g[i])) d[i] = 0;
  for (let pass = 0; pass < cap; pass++) {
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
      const i = z * W + x;
      if (d[i] <= pass) continue;
      if ((x > 0 && d[i - 1] === pass) || (x < W - 1 && d[i + 1] === pass) || (z > 0 && d[i - W] === pass) || (z < H - 1 && d[i + W] === pass)) d[i] = pass + 1;
    }
  }
  return d;
}

// the tile at world (x, z) of a generated map
export function bigTile(m, x, z) {
  x = Math.floor(x); z = Math.floor(z);
  if (x < m.X0 || z < m.Z0 || x >= m.X0 + m.W || z >= m.Z0 + m.H) return TT.WATER;
  return m.ground[(z - m.Z0) * m.W + (x - m.X0)];
}
