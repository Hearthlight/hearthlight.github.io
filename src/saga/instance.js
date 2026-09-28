// World v7: outdoor instances — a dungeon under the open sky, like WoW’s
// instanced zones (a hidden valley, a festival ground, a mountain pass…).
// dungeon.js carves its rooms & corridors as usual; here they become a little
// map of the big world’s own tiles — glades, dirt paths, ponds, and woods all
// round rising into cliffs — painted by the same chunk painter in workers,
// scattered with the same trees, walked with the same collision, and lit by
// daylight at the instance’s own hour (lighting.updateInstance). Nobody
// wanders off: everything that isn’t a room or a path is thick woods (block 3).
//
// def.outdoor = { zone, hour, floor, path, rim, woods, cliffs, margin, paint(T), objs }
// — zone gives the palettes & trees; rim is what stands right round the rooms,
// woods the rest; cliffs the heights ([near, far], or [rim, near, far]); paint(T)
// adds the place’s own features.

import { TT } from '../world/tiles.js';
import { ZONES } from '../world/big/layout.js';
import { reliefBlocks } from '../world/big/gen.js';
import { scatterBig, OBJ_R } from '../world/big/objects.js';
import { BigCollision } from '../world/big/collide.js';
import { ChunkStreamer } from '../world/big/stream.js';
import { fbm } from '../engine/util.js';

export const GROUND = {
  grass: TT.GRASS, meadow: TT.MEADOW, forest: TT.FOREST, path: TT.PATH, roots: TT.ROOTS, leaves: TT.LEAVES,
  petals: TT.PETALS, sand: TT.SAND, soil: TT.SOIL, moss: TT.MYCEL, steppe: TT.STEPPE, snow: TT.SNOW, autumn: TT.AUTUMN,
  plaza: TT.PLAZA, ruins: TT.RUINS, cobble: TT.COBBLE, jungle: TT.JUNGLE, heath: TT.HEATH, canyon: TT.CANYON,
  mesa: TT.MESA, rock: TT.ROCK, basalt: TT.BASALT, crag: TT.CRAG, hill: TT.HILL, dune: TT.DUNE, ash: TT.ASH, glacier: TT.GLACIER,
  tundra: TT.TUNDRA, moor: TT.MOOR, bamboo: TT.BAMBOO, salt: TT.SALT, crystal: TT.CRYSTAL, marsh: TT.MARSH, bog: TT.BOG, mycel: TT.MYCEL,
  water: TT.WATER, coral: TT.CORAL, lava: TT.LAVA, obsidian: TT.OBSIDIAN,
};
for (const [k, v] of Object.entries(GROUND)) if (v === undefined) throw new Error('instance ground: no tile ' + k);
const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

export class Instance {
  constructor(d) {
    const P = d.P, def = d.def, O = def.outdoor, M = O.margin || 14;
    this.d = d; this.P = P; this.O = O;
    const X0 = d.ox - M, Z0 = d.oz - M, W = d.W + M * 2, H = d.H + M * 2, N = W * H;
    const seed = 4242 + def.id.length * 977 + (def.slot || 0) * 31;
    const ground = new Uint8Array(N), zone = new Uint8Array(N), elev = new Uint8Array(N);
    const keep = new Uint8Array(N), deck = new Uint8Array(N);
    zone.fill(Math.max(0, ZONES.findIndex((z) => z.id === O.zone)));
    const I = (x, z) => z * W + x;
    // how far each tile is from anywhere you can walk (tiles, 8-way, capped)
    const dist = new Uint8Array(N).fill(255), q = [];
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (d.at(x - M, z - M)) { dist[I(x, z)] = 0; q.push(I(x, z)); }
    for (let h = 0; h < q.length; h++) {
      const i = q[h], x = i % W, z = (i / W) | 0, nd = dist[i] + 1;
      if (nd > 20) continue;
      for (const [dx, dz] of N8) {
        const X = x + dx, Z = z + dz;
        if (X < 0 || Z < 0 || X >= W || Z >= H) continue;
        const j = I(X, Z);
        if (dist[j] > nd) { dist[j] = nd; q.push(j); }
      }
    }
    // the ground: glades in the rooms, dirt paths between them, ponds; woods
    // all round, rising in cliffs a few steps back from the glades
    const woods = GROUND[O.woods || 'forest'], rim = GROUND[O.rim || O.woods || 'forest'], lvl = O.cliffs === false ? [0, 0, 0] : O.cliffs || [2, 4];
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
      const i = I(x, z), lx = x - M, lz = z - M, v = d.at(lx, lz);
      if (v === 2) { ground[i] = TT.WATER; keep[i] = 1; continue; }
      if (v === 4) { ground[i] = TT.LAVA; keep[i] = 1; continue; }
      if (v === 1 || v === 3) {
        keep[i] = 1;
        if (d.link[d.I(lx, lz)]) { ground[i] = GROUND[O.path || 'path']; continue; }
        const r = d.rooms.find((rr) => lx >= rr.x && lz >= rr.z && lx < rr.x + rr.w && lz < rr.z + rr.h);
        const base = GROUND[(r && r.ground) || O.floor || 'grass'];
        ground[i] = base === TT.GRASS && fbm(x * 0.11, z * 0.11, seed, 3) > 0.6 ? TT.MEADOW : base;
        continue;
      }
      const dd = dist[i] + (fbm(x * 0.09, z * 0.09, seed + 5, 3) - 0.5) * 3;
      ground[i] = dd < 3 ? rim : woods;
      elev[i] = dd < 3 ? (lvl.length > 2 ? lvl[0] : 0) : dd < 6.5 ? lvl[lvl.length - 2] : lvl[lvl.length - 1];
    }
    const T = { W, H, M, ground, elev, keep, deck, dist, I, TT, seed, set: (lx, lz, tt, e) => { const x = lx + M, z = lz + M; if (x < 0 || z < 0 || x >= W || z >= H) return; const i = I(x, z); ground[i] = tt; if (e !== undefined) elev[i] = e; } };
    if (O.paint) O.paint(T);
    // cliffs where the woods rise; everything else off the paths is woods nobody crosses
    const block = reliefBlocks(ground, elev, W, H);
    for (let i = 0; i < N; i++) if (!keep[i] && !block[i]) block[i] = 3;
    this.map = { X0, Z0, W, H, ground, zone, elev, block, deck, keep, seed, carved: [], arena: null };
    // what grows there (and the place’s own great trees, rocks…: def.outdoor.objs,
    // [type, x, z, extra] in the dungeon’s tiles), what stops you
    this.scatter = scatterBig(this.map);
    const own = (O.objs || []).map(([type, x, z, extra]) => ({ type, x: d.ox + x, y: d.oz + z, s: 1, v: 0.5, ...extra }));
    if (own.length) {
      const CH = 32, far = (o) => own.every((q) => Math.hypot(q.x - o.x, q.y - o.y) > 1.6 * (q.big || 1) + 0.6);
      this.scatter.list = this.scatter.list.filter(far);
      for (const [k, b] of this.scatter.byChunk) this.scatter.byChunk.set(k, b.filter(far));
      for (const o of own) {
        this.scatter.list.push(o);
        const k = Math.floor((o.x - X0) / CH) + ',' + Math.floor((o.y - Z0) / CH);
        if (!this.scatter.byChunk.has(k)) this.scatter.byChunk.set(k, []);
        this.scatter.byChunk.get(k).push(o);
      }
    }
    this.col = new BigCollision(this.map);
    for (const o of this.scatter.list) { const r = OBJ_R[o.type]; if (r) this.col.add({ x: o.x, z: o.y - 0.05, r: r * (o.big || 1) }); }
    // painted & streamed like the big world (its own workers, riding on the big world’s frame)
    this.stream = new ChunkStreamer({ r3d: P.r3d, map: this.map, scatter: this.scatter, flows: [], pois: null, party: P });
    P.world.over.root.add(this.stream.root);
    if (P.big) (P.big.extra || (P.big.extra = [])).push(this.stream);
  }

  // are the chunks round (x, z) painted yet? (the entrance waits for them)
  ready(x, z, r = 12) { return this.stream.readyAround(x, z, r); }

  dispose() {
    const P = this.P;
    if (P.big && P.big.extra) P.big.extra = P.big.extra.filter((s) => s !== this.stream);
    P.world.over.root.remove(this.stream.root);
    this.stream.dispose();
  }
}
