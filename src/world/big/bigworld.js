// The big world as Party Mode sees it: generated map + scatter, collision,
// the chunk streamer and the world map. While attached it stands in for the
// valley's ground (the valley's buildings, trees & props stay as they are).

import { THREE } from '../../render/r3d.js';
import { TT } from '../tiles.js';
import { generateBig } from './gen.js';
import { scatterBig, OBJ_R } from './objects.js';
import { BigCollision } from './collide.js';
import { ChunkStreamer } from './stream.js';
import { WorldMap } from './minimap.js';
import { Pois } from './pois.js';
import { setNightGlow } from './objects3d.js';
import { BIG, VALLEY, ZONES } from './layout.js';

const TREES = ['oak', 'pine', 'cherry', 'apple', 'palm', 'bigtree', 'maple', 'snowpine', 'peach', 'willow'];

export class BigWorld {
  constructor(party) {
    this.party = party;
    this.world = party.world;
    this.r3d = party.r3d;
    const t0 = performance.now();
    this.map = generateBig(BIG.SEED, this.world.mapData);
    const t1 = performance.now();
    this.scatter = scatterBig(this.map);
    const t2 = performance.now();
    this.flows = [
      { x0: 360, x1: 520, z0: 160, z1: 264, x: -0.8, z: 0.35 },    // the straits swirl west
      { x0: -40, x1: 140, z0: 244, z1: 264, x: 0.6, z: 0 },          // a warm drift along the south
      { x0: 120, x1: 175, z0: 136, z1: 170, x: 0.5, z: 0.5 },        // out past the valley's sandbars
    ];
    this.whirlpools = this.map.whirlpools;
    this.col = new BigCollision(this.map);
    for (const o of this.scatter.list) { const r = OBJ_R[o.type]; if (r) this.col.add({ x: o.x, z: o.y - 0.05, r }); }
    this.worldMap = new WorldMap(this);
    this.deckY = new Map();
    this.timing = { gen: Math.round(t1 - t0), scatter: Math.round(t2 - t1), col: Math.round(performance.now() - t2) };
    this.revealT = 0;
  }

  get X0() { return this.map.X0; }
  get Z0() { return this.map.Z0; }
  bounds() { return { x0: this.map.X0, z0: this.map.Z0, x1: this.map.X0 + this.map.W, z1: this.map.Z0 + this.map.H }; }

  // is the ground around (x, z) painted yet?
  ready(x, z, r = 18) { return !this.streamer || this.streamer.readyAround(x, z, r); }

  tileAt(x, z) {
    const m = this.map, tx = Math.floor(x), tz = Math.floor(z);
    if (tx < m.X0 || tz < m.Z0 || tx >= m.X0 + m.W || tz >= m.Z0 + m.H) return -1;
    return m.ground[(tz - m.Z0) * m.W + (tx - m.X0)];
  }
  zoneAt(x, z) {
    const m = this.map, tx = Math.floor(x), tz = Math.floor(z);
    if (tx < m.X0 || tz < m.Z0 || tx >= m.X0 + m.W || tz >= m.Z0 + m.H) return ZONES[0];
    return ZONES[m.zone[(tz - m.Z0) * m.W + (tx - m.X0)]];
  }
  inValley(x, z) { return x >= VALLEY.x0 && z >= VALLEY.z0 && x < VALLEY.x1 && z < VALLEY.z1; }
  onDeck(x, z) {
    const m = this.map, tx = Math.floor(x), tz = Math.floor(z);
    if (tx < m.X0 || tz < m.Z0 || tx >= m.X0 + m.W || tz >= m.Z0 + m.H) return false;
    return !!m.deck[(tz - m.Z0) * m.W + (tx - m.X0)];
  }
  newDeck(x, z) {
    const m = this.map, tx = Math.floor(x), tz = Math.floor(z);
    return tx >= m.X0 && tz >= m.Z0 && tx < m.X0 + m.W && tz < m.Z0 + m.H && m.deck[(tz - m.Z0) * m.W + (tx - m.X0)] === 2;
  }
  // height of the surface outside the valley (bridges, boardwalks, platforms)
  groundY(p) {
    const m = this.map, tx = Math.floor(p.x), tz = Math.floor(p.z);
    if (tx < m.X0 || tz < m.Z0 || tx >= m.X0 + m.W || tz >= m.Z0 + m.H) return 0;
    const i = (tz - m.Z0) * m.W + (tx - m.X0), d = m.deck[i];
    return d === 3 ? (this.deckY.get(i) ?? 0.3) : d ? 0.21 : 0;
  }

  // a raised platform you can walk on (landmarks' docks, lily pads…)
  addDeck(rect, y) {
    const m = this.map;
    for (let z = Math.floor(rect[1]); z < Math.ceil(rect[1] + rect[3]); z++) for (let x = Math.floor(rect[0]); x < Math.ceil(rect[0] + rect[2]); x++) {
      if (x < m.X0 || z < m.Z0 || x >= m.X0 + m.W || z >= m.Z0 + m.H) continue;
      const i = (z - m.Z0) * m.W + (x - m.X0);
      // overlapping platforms (stairs, landings): the highest one wins
      const prev = m.deck[i] === 3 ? this.deckY.get(i) : null;
      m.deck[i] = 3; this.deckY.set(i, prev != null ? Math.max(prev, y) : y);
    }
  }

  // a cliff face right below a plateau (warm air rises there for gliders)
  cliffBelow(x, z) {
    const tx = Math.floor(x), tz = Math.floor(z);
    for (let k = 0; k <= 2; k++) { const t = this.tileAt(tx, tz - k - 1); if (t === TT.ROCK || t === TT.HILL || t === TT.MESA || t === TT.BASALT || t === TT.HEATH) return !(this.tileAt(tx, tz) === t); }
    return false;
  }

  // the nearest scattered object of a kind within r (giant mushrooms…)
  nearestObject(x, z, r, type) {
    const m = this.map, CH = BIG.CHUNK;
    const cx = Math.floor((x - m.X0) / CH), cz = Math.floor((z - m.Z0) / CH);
    let best = null, bd = r;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const list = this.scatter.byChunk.get((cx + i) + ',' + (cz + j));
      if (!list) continue;
      for (const o of list) { if (o.type !== type) continue; const d = Math.hypot(o.x - x, o.y - 0.15 - z); if (d < bd) { bd = d; best = o; } }
    }
    return best;
  }

  // ------------------------------------------------------------------ attach / detach
  attach() {
    const w = this.world, over = w.over;
    this.saved = { overCol: w.overCol, mapCol: w.maps.overworld.collision };
    // the valley's static colliders & the ones added since (arena…)
    for (const c of w.overCol.colliders) this.col.add(c);
    w.overCol = this.col;
    w.maps.overworld.collision = this.col;
    w.big = this;
    // the valley's bridge carries you over the river once it's mended
    this.col.bridge = (tx, tz) => !!(w.state && w.state.flags.bridgeFixed && w.bridgeTiles && w.bridgeTiles.has(tx + ',' + tz));
    // the streamed ground replaces the valley's (identical pixels inside it)
    for (const m of over.groundParts || []) m.visible = false;
    this.pois = new Pois(this);
    over.root.add(this.pois.root);
    this.streamer = new ChunkStreamer(this);
    over.root.add(this.streamer.root);
    this.pois.onReady = () => { for (const k of this.streamer.chunks.keys()) this.pois.show(k, true); };
    // cloud shadows over the whole world
    if (w.clouds) {
      this.savedClouds = { sx: w.clouds.scale.x, sy: w.clouds.scale.y, x: w.clouds.position.x, z: w.clouds.position.z };
      const m = this.map, g = w.clouds.geometry.parameters;
      w.clouds.scale.set((m.W + 40) / g.width, (m.H + 40) / g.height, 1);
      w.clouds.position.set(m.X0 + m.W / 2, 0.03, m.Z0 + m.H / 2);
    }
    // skirts beyond the edges: mountains north, forest west, sea south & east
    this.skirts = new THREE.Group();
    const m = this.map, S = 200;
    const sk = (c, x, z, sw, sh) => { const q = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: c })); q.position.set(x, -0.03, z); this.skirts.add(q); };
    sk(0x3a3442, m.X0 + m.W / 2, m.Z0 - S / 2, m.W + S * 2, S);
    sk(0x244d78, m.X0 + m.W / 2, m.Z0 + m.H + S / 2, m.W + S * 2, S);
    sk(0x2c5a40, m.X0 - S / 2, m.Z0 + m.H / 2, S, m.H);
    sk(0x244d78, m.X0 + m.W + S / 2, m.Z0 + m.H / 2, S, m.H);
    over.root.add(this.skirts);
    this.tuckTrees();
  }

  detach() {
    const w = this.world, over = w.over;
    if (!this.saved) return;
    this.untuckTrees();
    w.overCol = this.saved.overCol;
    w.maps.overworld.collision = this.saved.mapCol;
    w.big = null;
    for (const m of over.groundParts || []) m.visible = true;
    if (this.streamer) { over.root.remove(this.streamer.root); this.streamer.dispose(); this.streamer = null; }
    if (this.pois) { over.root.remove(this.pois.root); this.pois.dispose(); }
    if (w.clouds && this.savedClouds) { const s = this.savedClouds; w.clouds.scale.set(s.sx, s.sy, 1); w.clouds.position.set(s.x, 0.03, s.z); }
    over.root.remove(this.skirts);
    this.worldMap.save();
    this.saved = null;
  }

  // trees standing on the roads we opened out of the valley step aside
  tuckTrees() {
    const w = this.world, carved = this.map.carved;
    if (!carved.length) return;
    const hit = new Set(carved.map(([x, z]) => x + ',' + z));
    const onRoad = (x, z) => { for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (hit.has((Math.floor(x) + dx) + ',' + (Math.floor(z) + dz))) return true; return false; };
    const trees = w.mapData.objects.filter((o) => TREES.includes(o.type));
    const gone = trees.filter((o) => onRoad(o.x, o.y - 0.15));
    this.tucked = [];
    if (!gone.length) return;
    const mm = new THREE.Matrix4(), pos = new THREE.Vector3(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
    w.over.root.traverse((ob) => {
      if (!ob.isInstancedMesh || ob.parent === this.streamer.root || (ob.parent && ob.parent.parent === this.streamer.root)) return;
      for (let i = 0; i < ob.count; i++) {
        ob.getMatrixAt(i, mm);
        pos.setFromMatrixPosition(mm);
        let best = null, bd = 1e9;
        for (const o of gone) { const d = Math.hypot(o.x - pos.x, o.y - 0.15 - pos.z); if (d < bd) { bd = d; best = o; } }
        if (!best || bd > 3.6) continue;
        // is that piece really this tree's (and not a neighbour's)?
        let near = best, nd = bd;
        for (const o of trees) { const d = Math.hypot(o.x - pos.x, o.y - 0.15 - pos.z); if (d < nd) { nd = d; near = o; } }
        if (near !== best) continue;
        this.tucked.push({ ob, i, m: mm.clone() });
        ob.setMatrixAt(i, zero);
        ob.instanceMatrix.needsUpdate = true;
      }
    });
    for (const c of this.col.colliders) if (!c.rect && gone.some((o) => Math.hypot(o.x - c.x, o.y - c.z) < 0.5)) { c.disabled = true; this.tucked.push({ c }); }
  }

  untuckTrees() {
    for (const q of this.tucked || []) {
      if (q.c) q.c.disabled = false;
      else { q.ob.setMatrixAt(q.i, q.m); q.ob.instanceMatrix.needsUpdate = true; }
    }
    this.tucked = [];
  }

  // ------------------------------------------------------------------ frame
  update(dt, views, ppu, time) {
    if (this.streamer) this.streamer.update(dt, views, ppu, time);
    // (World v7: an outdoor instance streams its own little map the same way)
    for (const s of this.extra || []) s.update(dt, views, ppu, time);
    if (this.pois) this.pois.update(dt, time, this.party.lighting.hour);
    setNightGlow(this.party.lighting.lampLevel || 0);
    this.revealT -= dt;
    if (this.revealT <= 0) {
      this.revealT = 0.5;
      for (const p of this.party.players) if (p.connected) this.worldMap.reveal(p.pos.x, p.pos.z);
      this.saveT = (this.saveT || 0) - 0.5;
      if (this.saveT <= 0) { this.saveT = 10; this.worldMap.save(); }
    }
  }
}

export { TT };
