// What grows (and lies around) in the big world: a deterministic scatter over
// the whole map — trees, rocks, cacti, giant mushrooms, reeds… — as plain data
// ({ type, x, y, s, v } with y = z like the valley's objects), bucketed per
// chunk. Colliders come from the same data, so collisions never wait for a
// chunk's meshes.

import { TT } from '../tiles.js';
import { hash2 } from '../../engine/util.js';
import { BIG, ZONES, VALLEY } from './layout.js';

const Z = ZONES.map((z) => z.id);
// collider radius per kind (0 = walk through)
export const OBJ_R = {
  oak: 0.24, pine: 0.22, snowpine: 0.22, cherry: 0.24, maple: 0.24, palm: 0.22, bush: 0.36, rock: 0.34, boulder: 0.62,
  cactus: 0.26, bigshroom: 0.62, shrooms: 0, deadtree: 0.2, acacia: 0.26, willow: 0.42, reeds: 0, icespike: 0.26,
  spire: 0.4, puff: 0, column: 0.34, rubble: 0.3, tallgrass: 0, crystal: 0.3, mangrove: 0.3, fern: 0,
  treefern: 0.2, cycad: 0.3, bigleaf: 0, horsetail: 0,
  // World v7: the Dawnlands
  bamboo: 0.3, redmaple: 0.26, pumpkin: 0.26, elderoak: 0.55, mossrock: 0.4, glowshroom: 0, crookedtree: 0.22, menhir: 0.32,
  gorse: 0.34, prismspire: 0.38, saltheap: 0.3, cog: 0.42, lichenrock: 0.34, tundrashrub: 0, umbralspire: 0.3, floatrock: 0, karst: 1.1,
  fumarole: 0.4, obsidian: 0.3,
};

export function scatterBig(m) {
  const { X0, Z0, W, H, ground, zone, deck, keep, seed } = m;
  const CH = BIG.CHUNK;
  const tile = (x, z) => (x < X0 || z < Z0 || x >= X0 + W || z >= Z0 + H ? TT.WATER : ground[(z - Z0) * W + (x - X0)]);
  const zid = (x, z) => (x < X0 || z < Z0 || x >= X0 + W || z >= Z0 + H ? 'sea' : Z[zone[(z - Z0) * W + (x - X0)]]);
  const isDeck = (x, z) => x >= X0 && z >= Z0 && x < X0 + W && z < Z0 + H && deck[(z - Z0) * W + (x - X0)];
  const BLOCK = new Set([TT.PATH, TT.WATER, TT.CORAL, TT.LAVA, TT.SKY, TT.CREVASSE, TT.PLANK_H, TT.PLANK_V, TT.OBSIDIAN, TT.ICE, TT.PLAZA]);
  const kept = (x, z) => x >= X0 && z >= Z0 && x < X0 + W && z < Z0 + H && ((keep && keep[(z - Z0) * W + (x - X0)]) || (m.block && (m.block[(z - Z0) * W + (x - X0)] === 1 || m.block[(z - Z0) * W + (x - X0)] === 2)));
  const clear = (x, z, r) => { if (kept(x, z)) return false; for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (BLOCK.has(tile(x + i, z + j)) || isDeck(x + i, z + j)) return false; return true; };
  const inValley = (x, z) => x >= VALLEY.x0 - 1 && z >= VALLEY.z0 - 1 && x < VALLEY.x1 + 1 && z < VALLEY.z1 + 1;
  const list = [];
  const byChunk = new Map();
  const add = (type, x, y, extra = {}) => {
    const o = { type, x, y, s: 0.85 + hash2(Math.floor(x * 7), Math.floor(y * 7), seed + 3) * 0.35, v: hash2(Math.floor(x * 5), Math.floor(y * 5), seed + 4), ...extra };
    list.push(o);
    const key = Math.floor((x - X0) / CH) + ',' + Math.floor((y - Z0) / CH);
    let b = byChunk.get(key);
    if (!b) byChunk.set(key, (b = []));
    b.push(o);
  };
  for (let z = Z0 - 1; z < Z0 + H; z += 2) for (let x = X0 - 1; x < X0 + W; x += 2) {
    const jx = x + hash2(x, z, seed + 5) * 1.6, jz = z + hash2(x, z, seed + 6) * 1.6;
    const tx = Math.floor(jx), tz = Math.floor(jz);
    if (inValley(tx, tz)) continue;
    const t = tile(tx, tz), id = zid(tx, tz);
    const h = hash2(tx, tz, seed + 7), h2 = hash2(tx, tz, seed + 8);
    const px = jx + 0.5, pz = jz + 1;
    const needClear = (r = 1) => clear(tx, tz, r);
    switch (t) {
      case TT.FOREST: {
        if (!needClear()) break;
        if (id === 'elder') { if (h < 0.34) add('elderoak', px, pz, { forest: true }); else if (h < 0.7) add(h2 < 0.5 ? 'oak' : 'pine', px, pz, { forest: true }); else if (h < 0.76) add('mossrock', px, pz); }
        else if (id === 'harbor' || id === 'jade') { if (h < 0.8) add(h2 < 0.3 ? 'pine' : h2 < 0.55 ? 'cherry' : 'oak', px, pz, { forest: true }); }
        else if (id === 'bouncecap') { if (h < 0.3) add('bigshroom', px, pz); else if (h < 0.85) add(h2 < 0.5 ? 'pine' : 'oak', px, pz, { forest: true }); }
        else if (id === 'marsh') { if (h < 0.75) add(h2 < 0.35 ? 'willow' : 'oak', px, pz, { forest: true }); }
        else if (h < 0.86) add(h2 < 0.45 ? 'pine' : 'oak', px, pz, { forest: true });
        break;
      }
      case TT.GRASS: {
        if (!needClear()) break;
        if (id === 'lagoon' || id === 'sea' || id === 'straits' || id === 'sunken') { if (h < 0.1) add('palm', px, pz); else if (h < 0.16) add('bush', px, pz); }
        else if (id === 'dunes') { if (h < 0.35) add('palm', px, pz); else if (h < 0.45) add('fern', px, pz); }
        else if (id === 'steppe') { if (h < 0.05) add('oak', px, pz); else if (h < 0.1) add('bush', px, pz); }
        else if (id === 'dino') { if (h < 0.04) add('cycad', px, pz); else if (h < 0.09) add('fern', px, pz); else if (h < 0.12) add('bigleaf', px, pz); }
        else if (id === 'whale' || id === 'glow') { if (h < 0.06) add('palm', px, pz); else if (h < 0.1) add('bush', px, pz); }
        else if (id === 'jade') { if (h < 0.012) add('karst', px, pz); else if (h < 0.05) add(h2 < 0.5 ? 'cherry' : 'bush', px, pz); }
        else if (id === 'autumn') { if (h < 0.08) add('redmaple', px, pz); else if (h < 0.1) add('pumpkin', px, pz); }
        else if (id === 'clock') { if (h < 0.015) add('cog', px, pz); else if (h < 0.05) add(h2 < 0.6 ? 'oak' : 'bush', px, pz); }
        else if (id === 'elder') { if (h < 0.05) add('elderoak', px, pz); else if (h < 0.09) add('fern', px, pz); }
        else if (h < 0.07) add(h2 < 0.6 ? 'oak' : 'bush', px, pz);
        break;
      }
      // ---- World v7: the Dawnlands
      case TT.BAMBOO: {
        if (!needClear()) break;
        if (h < 0.42) add('bamboo', px, pz, { forest: true }); else if (h < 0.45) add('rock', px, pz); else if (h < 0.5) add('fern', px, pz);
        break;
      }
      case TT.SALT: if (needClear() && h < 0.012) add(h2 < 0.5 ? 'saltheap' : 'rock', px, pz); break;
      case TT.AUTUMN: {
        if (!needClear()) break;
        if (h < 0.5) add('redmaple', px, pz, { forest: true }); else if (h < 0.53) add('pumpkin', px, pz); else if (h < 0.55) add('shrooms', px, pz);
        break;
      }
      case TT.ROOTS: {
        if (!needClear()) break;
        if (h < 0.1) add('elderoak', px, pz, { forest: true }); else if (h < 0.24) add('fern', px, pz); else if (h < 0.28) add('mossrock', px, pz); else if (h < 0.31) add('glowshroom', px, pz);
        break;
      }
      case TT.MOOR: {
        if (!needClear()) break;
        if (h < 0.02) add('crookedtree', px, pz); else if (h < 0.028) add('menhir', px, pz); else if (h < 0.08) add('gorse', px, pz); else if (h < 0.1) add('rock', px, pz);
        break;
      }
      case TT.CRYSTAL: {
        if (!needClear()) break;
        if (h < 0.035) add('prismspire', px, pz); else if (h < 0.1) add('crystal', px, pz);
        break;
      }
      case TT.METAL: if (needClear() && h < 0.012) add('cog', px, pz); break;
      case TT.TUNDRA: {
        if (!needClear()) break;
        if (h < 0.025) add('lichenrock', px, pz); else if (h < 0.1) add('tundrashrub', px, pz); else if (h < 0.115 && z > -130) add('snowpine', px, pz);
        break;
      }
      case TT.UMBRAL: {
        if (!needClear()) break;
        if (h < 0.035) add('umbralspire', px, pz); else if (h < 0.05) add('floatrock', px, pz);
        break;
      }
      case TT.MEADOW: {
        if (!needClear()) break;
        if (id === 'autumn') { if (h < 0.06) add('pumpkin', px, pz); else if (h < 0.08) add('redmaple', px, pz); }
        else if (id === 'prism') { if (h < 0.04) add('crystal', px, pz); }
        else if (id === 'jade') { if (h < 0.008) add('karst', px, pz); else if (h < 0.03) add('cherry', px, pz); }
        else if (h < 0.05) add(id === 'dino' ? (h2 < 0.5 ? 'fern' : 'horsetail') : 'bush', px, pz);
        break;
      }
      case TT.JUNGLE: {
        // tree ferns & palms over cycads, giant horsetails and elephant-ear leaves
        if (!needClear()) break;
        if (h < 0.24) add('treefern', px, pz, { forest: true });
        else if (h < 0.31) add('palm', px, pz);
        else if (h < 0.37) add('cycad', px, pz);
        else if (h < 0.46) add('bigleaf', px, pz);
        else if (h < 0.52) add('horsetail', px, pz);
        else if (h < 0.6) add('fern', px, pz);
        break;
      }
      case TT.LEAVES: if (needClear() && h < 0.55) add('maple', px, pz, { forest: true }); break;
      case TT.HEATH: {
        if (!needClear()) break;
        if (h < 0.035) add('rock', px, pz); else if (h < 0.06) add('pine', px, pz); else if (h < 0.1) add('bush', px, pz); else if (h < 0.14) add('fern', px, pz);
        break;
      }
      case TT.HILL: if (needClear() && h < 0.05) add('bush', px, pz); break;
      case TT.ROCK: if (needClear() && h < 0.08) add(h2 < 0.2 ? 'boulder' : 'rock', px, pz); break;
      case TT.MYCEL: {
        if (!needClear()) break;
        if (h < 0.1) add('bigshroom', px, pz); else if (h < 0.24) add('shrooms', px, pz); else if (h < 0.28) add('fern', px, pz); else if (h < 0.3) add('crystal', px, pz);
        break;
      }
      case TT.SNOW: {
        if (!needClear()) break;
        const k = id === 'tundra' ? 0.05 : Math.max(0.08, Math.min(0.42, (z + 70) / 150));
        if (h < k) add('snowpine', px, pz, { forest: true }); else if (h < k + 0.02) add('rock', px, pz);
        break;
      }
      case TT.GLACIER: if (needClear() && h < 0.02) add(h2 < 0.6 ? 'icespike' : 'boulder', px, pz); break;
      case TT.CLOUD: if (needClear() && h < 0.05) add('puff', px, pz); break;
      case TT.STEPPE: {
        if (!needClear()) break;
        if (h < 0.022) add('acacia', px, pz); else if (h < 0.045) add('bush', px, pz); else if (h < 0.06) add('rock', px, pz); else if (h < 0.2) add('tallgrass', px, pz);
        break;
      }
      case TT.CANYON: {
        if (!needClear()) break;
        if (h < 0.04) add('cactus', px, pz); else if (h < 0.08) add('rock', px, pz); else if (h < 0.095) add('deadtree', px, pz);
        break;
      }
      case TT.MESA: if (needClear() && h < 0.03) add('bush', px, pz); break;
      case TT.DUNE: {
        if (!needClear()) break;
        if (h < 0.012) add('cactus', px, pz); else if (h < 0.018) add('rock', px, pz);
        break;
      }
      case TT.SAND: {
        if (!needClear()) break;
        const tropical = ['lagoon', 'sea', 'straits', 'sunken', 'dunes', 'whale', 'glow'].includes(id);
        if (tropical && h < 0.05) add('palm', px, pz); else if (h < 0.06) add('rock', px, pz);
        break;
      }
      case TT.BOG: {
        if (!needClear()) break;
        if (h < 0.03) add('willow', px, pz); else if (h < 0.05) add('deadtree', px, pz); else if (h < 0.22) add('reeds', px, pz); else if (h < 0.24) add('mangrove', px, pz);
        break;
      }
      case TT.MARSH: {
        if (!needClear()) break;
        if (id === 'glow') { if (h < 0.1) add('mangrove', px, pz); else if (h < 0.14) add('glowshroom', px, pz); else if (h < 0.3) add('reeds', px, pz); }
        else if (h < 0.25) add(h < 0.02 ? 'willow' : 'reeds', px, pz);
        break;
      }
      case TT.ASH: {
        if (!needClear()) break;
        // (Emberpeak’s slopes: dead trees, hot rocks, obsidian shards, steaming vents)
        if (h < 0.02) add('deadtree', px, pz); else if (h < 0.05) add('rock', px, pz, { hot: true });
        else if (id === 'volcano' && h < 0.064) add('obsidian', px, pz);
        else if (id === 'volcano' && h < 0.072) add('fumarole', px, pz);
        break;
      }
      case TT.BASALT: if (needClear() && h < 0.035) add(id === 'scar' ? 'umbralspire' : 'spire', px, pz); break;
      case TT.RUINS: {
        if (!needClear(0)) break;
        if (h < 0.05) add('column', px, pz); else if (h < 0.1) add('rubble', px, pz);
        break;
      }
      default: break;
    }
  }
  // the railway's sleepers & rails, every half tile
  for (const r of m.rails || []) for (let i = 0; i < r.pts.length - 1; i++) {
    const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1], L = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bx - ax, bz - az);
    for (let k = 0; k < L; k += 0.55) add('rail', ax + (bx - ax) * k / L, az + (bz - az) * k / L + 0.15, { ang });
  }
  return { list, byChunk };
}
