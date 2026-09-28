// World v7: dungeons — instanced places built far east of the map (x ≥ 3000),
// one at a time, that the whole party enters together. A dungeon is a chain of
// rooms carved in a tile grid (caves round and ragged, halls square), joined by
// corridors with gates: fights that lock the doors until the gloom is gone,
// pressure plates to hold down (a sprint alone, easy together), trap corridors
// (hot wax dripping on marked spots), a mini-boss, a boss arena and, at the
// end, the thing the heroes came for. It’s dark in there: braziers, glowing
// crystals and every hero’s lantern light the way — unless it’s an outdoor
// instance (def.outdoor, saga/instance.js): then the rooms are glades under the
// open sky, the corridors dirt paths through thick woods, and it’s daylight.
//
// Party Mode sees it as one big dark room (rooms.js: the camera follows the
// group inside its frame, the views are lit like interiors); solo clamps its
// camera to it and lights it the same way. Collision: BigCollision asks here
// for anything east of DUN_X.

import { THREE, toon } from '../render/r3d.js';
import { Collision } from '../world/collision.js';
import { Painter } from '../art/surfaces.js';
import { kit } from '../models/v7/kit.js';
import { setRegion } from './levels.js';
import { audio } from '../engine/audio.js';
import { t } from '../i18n.js';
import { drawText } from '../engine/font.js';
import { DUNGEONS } from './dungeons/index.js';
import { flat } from '../combat/v3/bosses.js';
import { Instance } from './instance.js';
import { buildBeam, beamRoom } from './beam.js';
import { PAGODA_THEME, PAGODA_PROPS } from './pagoda.js';
import { buildJars, jarsRoom } from './jars.js';
import { heartwoodFloor, HEARTWOOD_PROPS } from './heartwood.js';
import { buildClockRoom, clockRoom } from './clocks.js';
import { MANOR_THEME, MANOR_PROPS } from './manor.js';
import { buildSpots, spotRoom } from './spots.js';
import { BACKSTAGE_THEME, BACKSTAGE_PROPS } from './backstage.js';
import { buildSunkenBell } from '../models/v7/props7.js';

export const DUN_X = 3000;
const SLOT_W = 260;
const TX = 16;                                   // texels per tile on the floor

export class Dungeons {
  constructor(P, saga) {
    this.P = P;
    this.saga = saga;
    this.X = DUN_X;
    this.cur = null;
    const col = P.big && P.big.col;
    if (col) col.dungeons = this;
    // Party’s camera: a view whose people are all inside frames the dungeon
    if (!P.solo && P.cam) {
      const prev = P.cam.roomOf;
      this.prevRoomOf = prev;
      P.cam.roomOf = (members) => { const R = this.roomOf(members); if (R) return R.frame; return prev ? prev(members) : null; };
    }
  }

  dispose() {
    if (this.cur) this.cur.dispose();
    this.cur = null;
    const col = this.P.big && this.P.big.col;
    if (col && col.dungeons === this) col.dungeons = null;
    if (!this.P.solo && this.P.cam && this.prevRoomOf !== undefined) this.P.cam.roomOf = this.prevRoomOf;
  }

  // ------------------------------------------------------------------ collision (BigCollision asks)
  inside(x, z) { const d = this.cur; return !!d && x >= d.ox - 2 && z >= d.oz - 2 && x < d.ox + d.W + 2 && z < d.oz + d.H + 2; }
  blocked(x, z, r, ignore) { const d = this.cur; return !d || d.col.blocked(x - d.ox, z - d.oz, r, ignore) || (!!d.inst && d.inst.col.blocked(x, z, r, ignore)); }
  walkable(tx, tz) { const d = this.cur; return !!d && d.col.walkable(tx - d.ox, tz - d.oz) && (!d.inst || d.inst.col.walkable(tx, tz)); }

  // Party’s rooms.js & camera: the dungeon as one big dark room
  roomAt(x, z) { return this.inside(x, z) ? this.cur.room : null; }
  roomOf(members) {
    if (!this.cur || !members.length) return null;
    for (const m of members) if (!m.pos || !this.inside(m.pos.x, m.pos.z)) return null;
    return this.cur.room;
  }
  heroIn(p) { return !!this.cur && this.inside(p.pos.x, p.pos.z); }

  // ------------------------------------------------------------------ in & out
  async enter(id) {
    const P = this.P, def = DUNGEONS[id];
    if (!def || this.entering) return;
    this.entering = true;
    P.busy++;
    await P.fadeTo(1, 0.5);
    if (this.cur && this.cur.def.id !== id) { this.cur.dispose(); this.cur = null; }
    if (!this.cur) this.cur = new Dungeon(this, def, DUN_X + (def.slot || 0) * SLOT_W, 0);
    const d = this.cur;
    setRegion('dungeon', { x0: d.ox, z0: d.oz, x1: d.ox + d.W, z1: d.oz + d.H }, def.lv);
    // everyone comes along (off their mounts and boats)
    const heroes = P.players.filter((p) => p.connected || P.solo);
    heroes.forEach((p, i) => {
      p.dungeonExit = { x: def.door[0], z: def.door[1] + 1.2 };
      if (p.mount && P.mounts) P.mounts.dismount(p, true);
      if (p.vehicle && P.vehicles) P.vehicles.leave(p, true);
      const s = d.startSpot(i, heroes.length);
      if (P.solo) P.gatherAt(s.x, s.z); else { p.actor.pos = { x: s.x, z: s.z }; p.actor.dir = { x: 0, z: -1 }; }
    });
    if (!P.solo) P.cam.snap(P.camPlayers());
    if (P.buddies && P.buddies.regroup) P.buddies.regroup();
    // (an outdoor instance: its ground is painted in workers — wait for the first chunks)
    if (d.inst) { const s = d.startSpot(0, 1); for (let k = 0; k < 60 && !d.inst.ready(s.x, s.z); k++) await P.wait(0.05); }
    this.setMusic(def.music || 'grotto');
    d.started = P.t || 0;
    await P.fadeTo(0, 0.6);
    P.busy--;
    this.entering = false;
    P.showBanner(t(def.name), t('Level {a}–{b}', { a: def.lv[0], b: def.lv[1] }));
    audio.sfx('door', { volume: 0.7 });
    if (def.onEnter) def.onEnter(this.saga, d);
  }

  async exit({ done = false } = {}) {
    const P = this.P, d = this.cur;
    if (!d || this.leaving) return;
    this.leaving = true;
    P.busy++;
    await P.fadeTo(1, 0.5);
    const out = d.def.door;
    const heroes = P.players.filter((p) => p.connected || P.solo);
    heroes.forEach((p, i) => {
      const a = (i / Math.max(1, heroes.length)) * Math.PI * 2;
      const x = out[0] + Math.cos(a) * (heroes.length > 1 ? 1.2 : 0), z = out[1] + 1.6 + Math.sin(a) * 0.6;
      p.dungeonExit = null; p.flight = null;
      if (p.fighter && p.fighter.down && P.combat) P.combat.revive(p, 0.6, null);
      if (P.solo) P.gatherAt(x, z); else p.actor.pos = { x, z };
    });
    // (the gloom inside stays inside)
    if (P.combat) for (const e of P.combat.enemies) if (e.alive && this.inside(e.x, e.z)) { e.alive = false; e.fading = 0; e.remove(); }
    if (P.combat) { P.combat.bounds = null; }
    d.dispose();
    this.cur = null;
    setRegion('dungeon', { x0: 0, z0: 0, x1: 0, z1: 0 }, [1, 1]);
    this.setMusic(null);
    if (!P.solo) P.cam.snap(P.camPlayers());
    if (P.buddies && P.buddies.regroup) P.buddies.regroup();
    await P.fadeTo(0, 0.6);
    P.busy--;
    this.leaving = false;
    if (done) this.saga.onDungeon(d.def.id);
  }

  setMusic(track) {
    const P = this.P;
    if (P.solo) P.sagaMusic = track;
    else if (P.act) P.act.music = track;
  }

  // (solo) light the world like a dark room while the hero is inside (an
  // outdoor instance: daylight at its own hour)
  soloLight(hour) {
    const d = this.cur, P = this.P;
    if (!d || !P.solo || !this.heroIn(P.me)) return false;
    const L = P.lighting;
    d.room.focus = { x: P.world.cam.x, z: P.world.cam.z };
    const S = L.sources;
    L.sources = d.lights;
    if (d.inst) L.hour = L.updateInstance(d.outdoor.hour, d.room.focus);
    else L.updateIndoor(hour, d.room.focus, d.room.room);
    L.sources = S;
    return true;
  }
  // (solo) the camera stays inside
  clampSolo(x, z, hw, hh) {
    const d = this.cur;
    if (!d || !this.inside(x, z)) return null;
    const { x0, z0, w, d: dd } = d.room.frame;
    const cx = w <= hw * 2 ? x0 + w / 2 : Math.max(x0 + hw - 1, Math.min(x0 + w - hw + 1, x));
    const cz = dd <= hh * 2 ? z0 + dd / 2 : Math.max(z0 + hh - 3, Math.min(z0 + dd - hh + 1, z));
    return { x: cx, z: cz };
  }

  update(dt) { if (this.cur) this.cur.update(dt); }
  drawLabels(ctx, v) { if (this.cur) this.cur.drawLabels(ctx, v); }

  // a little map of the dungeon (the rooms you’ve seen) instead of the world’s
  drawMini(ctx, x, y, w, h, who) {
    const d = this.cur;
    if (!d) return false;
    const k = Math.min(w / d.W, h / d.H) * 0.94, ox = x + (w - d.W * k) / 2, oy = y + (h - d.H * k) / 2;
    const MC = d.inst ? ['#1f3a26', '#b8543a', '#e0b040', '#7ab85a'] : ['#16111c', '#8a3a5a', '#b8862a', '#5a5068'];
    ctx.fillStyle = MC[0]; ctx.fillRect(x, y, w, h);
    for (const r of d.rooms) {
      if (!r.seen && r !== d.rooms[0]) continue;
      ctx.fillStyle = r.kind === 'fight' && r.state === 'fight' ? MC[1] : r.kind === 'end' ? MC[2] : MC[3];
      ctx.fillRect(Math.round(ox + r.x * k), Math.round(oy + r.z * k), Math.max(2, Math.round(r.w * k)), Math.max(2, Math.round(r.h * k)));
    }
    for (const p of who) {
      if (!this.inside(p.pos.x, p.pos.z)) continue;
      const px = Math.round(ox + (p.pos.x - d.ox) * k), pz = Math.round(oy + (p.pos.z - d.oz) * k);
      ctx.fillStyle = '#241a2e'; ctx.fillRect(px - 2, pz - 2, 5, 5);
      ctx.fillStyle = p.color || '#ec5f73'; ctx.fillRect(px - 1, pz - 1, 3, 3);
    }
    return true;
  }
  mapPos(p) { return p.dungeonExit && this.heroIn(p) ? p.dungeonExit : null; }
}

// ======================================================================
class Dungeon {
  constructor(D, def, ox, oz) {
    this.D = D; this.P = D.P; this.def = def;
    this.ox = ox; this.oz = oz;
    this.W = def.w; this.H = def.h;
    this.g = new Uint8Array(this.W * this.H);          // 0 void · 1 floor · 2 water · 3 gate
    this.kind = new Uint8Array(this.W * this.H);       // floor flavour for the painter
    this.link = new Uint8Array(this.W * this.H);       // 1: a corridor (an outdoor instance paints it a path)
    this.outdoor = def.outdoor || null;
    this.root = new THREE.Group();
    this.root.name = 'dungeon:' + def.id;
    this.root.position.set(ox, 0, oz);
    this.lights = [];
    this.colliders = [];
    this.rooms = def.rooms.map((r) => ({ ...r, state: 'idle', foes: [], t: 0 }));
    this.gates = [];
    this.plates = [];
    this.anims = [];
    this.t = 0;
    this.K = kit(this.P.r3d);
    this.carve();
    this.build();
    if (this.outdoor) this.inst = new Instance(this);
    this.col = new Collision(this.W, this.H, (tx, tz) => tx >= 0 && tz >= 0 && tx < this.W && tz < this.H && this.g[tz * this.W + tx] === 1, this.colliders);
    this.room = {
      id: 'dun:' + def.id, dungeon: this, t: -99, busy: false,
      // (the camera’s frame: an outdoor instance lets it see a little into the woods round it)
      // (`big`: a dungeon is no snug room — the party may spread out and the screen split)
      frame: this.outdoor ? { x0: ox - 8, z0: oz - 8, w: this.W + 16, d: this.H + 16, big: true } : { x0: ox, z0: oz, w: this.W, d: this.H, big: true },
      focus: { x: ox + this.W / 2, z: oz + this.H / 2 },
      lights: this.lights,
      def: { name: def.name, dark: !this.outdoor, music: def.music },
      room: { def: { dark: !this.outdoor, ambient: def.ambient || 0.46, outdoor: !!this.outdoor, hour: this.outdoor ? this.outdoor.hour : 0 }, glass: [], anims: [], furniture: [] },
    };
    this.P.world.over.root.add(this.root);
    if (def.setup) def.setup(this);
  }

  I(x, z) { return z * this.W + x; }
  at(x, z) { return x >= 0 && z >= 0 && x < this.W && z < this.H ? this.g[z * this.W + x] : 0; }
  roomById(id) { return this.rooms.find((r) => r.id === id); }
  roomAt(x, z) { const lx = x - this.ox, lz = z - this.oz; return this.rooms.find((r) => lx >= r.x && lz >= r.z && lx < r.x + r.w && lz < r.z + r.h) || null; }
  world(x, z) { return { x: this.ox + x, z: this.oz + z }; }

  // ------------------------------------------------------------------ carving
  carve() {
    const def = this.def, cave = def.theme === 'cave' || !!def.outdoor;
    let h = 12345 + def.id.length * 977;
    const rnd = () => { h = (h * 1103515245 + 12345) & 0x7fffffff; return h / 0x7fffffff; };
    const noise = (x, z) => Math.sin(x * 0.9 + z * 0.37) * 0.5 + Math.sin(x * 0.31 - z * 0.83 + 1.7) * 0.5;
    for (const r of this.rooms) {
      const cx = r.x + r.w / 2, cz = r.z + r.h / 2, rx = r.w / 2, rz = r.h / 2, round = r.shape ? r.shape === 'round' : cave;
      for (let z = r.z; z < r.z + r.h; z++) for (let x = r.x; x < r.x + r.w; x++) {
        const dx = (x + 0.5 - cx) / rx, dz = (z + 0.5 - cz) / rz;
        const inside = round ? dx * dx + dz * dz < 1 + noise(x, z) * 0.14 : Math.abs(dx) < 1 && Math.abs(dz) < 1;
        if (inside) { this.g[this.I(x, z)] = 1; this.kind[this.I(x, z)] = r.floor || 0; }
      }
      // pools (water you can’t cross) and pillars
      for (const [px, pz, prx, prz] of r.pools || []) for (let z = Math.floor(pz - prz - 1); z <= pz + prz + 1; z++) for (let x = Math.floor(px - prx - 1); x <= px + prx + 1; x++) {
        const dx = (x + 0.5 - px) / prx, dz = (z + 0.5 - pz) / prz;
        if (dx * dx + dz * dz < 1 + noise(x, z) * 0.2 && this.at(x, z) === 1) this.g[this.I(x, z)] = 2;
      }
      // lava (nobody crosses it on foot — a vent may throw you over): round, or a rect band
      for (const [px, pz, prx, prz, sh] of r.lavas || []) for (let z = Math.floor(pz - prz - 1); z <= pz + prz + 1; z++) for (let x = Math.floor(px - prx - 1); x <= px + prx + 1; x++) {
        const dx = (x + 0.5 - px) / prx, dz = (z + 0.5 - pz) / prz;
        const ok = sh === 'rect' ? Math.abs(dx) < 1 && Math.abs(dz) < 1 : dx * dx + dz * dz < 1 + noise(x, z) * 0.2;
        if (ok && this.at(x, z) === 1) this.g[this.I(x, z)] = 4;
      }
      // (islets of rock standing out of the lava)
      for (const [ix, iz, ir] of r.isles || []) for (let z = Math.floor(iz - ir - 1); z <= iz + ir + 1; z++) for (let x = Math.floor(ix - ir - 1); x <= ix + ir + 1; x++) {
        if (Math.hypot(x + 0.5 - ix, z + 0.5 - iz) < ir && this.at(x, z) === 4) this.g[this.I(x, z)] = 1;
      }
    }
    // corridors: straight or L-shaped, 3 wide, between the rooms’ edges
    for (const L of this.def.links || []) {
      const A = this.roomById(L.from), B = this.roomById(L.to);
      const w = L.w || 3;
      const pts = L.via ? [[A.x + A.w / 2, A.z + A.h / 2], ...L.via, [B.x + B.w / 2, B.z + B.h / 2]] : [[A.x + A.w / 2, A.z + A.h / 2], [B.x + B.w / 2, B.z + B.h / 2]];
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
        const n = Math.ceil(Math.hypot(bx - ax, bz - az) * 2);
        for (let s = 0; s <= n; s++) {
          const x = ax + (bx - ax) * s / n, z = az + (bz - az) * s / n;
          for (let dz = -w / 2; dz < w / 2; dz++) for (let dx = -w / 2; dx < w / 2; dx++) {
            const tx = Math.floor(x + dx + 0.5), tz = Math.floor(z + dz + 0.5);
            if (tx < 1 || tz < 1 || tx >= this.W - 1 || tz >= this.H - 1) continue;
            if (this.g[this.I(tx, tz)] === 0) { this.g[this.I(tx, tz)] = 1; this.kind[this.I(tx, tz)] = L.floor || 0; this.link[this.I(tx, tz)] = 1; }
          }
        }
      }
      // a gate where the corridor meets the destination room (optional)
      if (L.gate) this.gates.push({ id: L.gate, x: L.gx, z: L.gz, w: L.gw || w + 1, horiz: L.horiz !== false, open: !!L.open, k: L.open ? 1 : 0, room: L.to, from: L.from });
    }
    void rnd;
  }

  // the heroes’ starting spots, by the entrance
  startSpot(i, n) {
    const r = this.rooms[0], s = this.def.start || [r.x + r.w / 2, r.z + r.h - 2];
    const a = (i / Math.max(1, n)) * Math.PI * 2;
    return this.world(s[0] + (n > 1 ? Math.cos(a) * 1.3 : 0), s[1] + (n > 1 ? Math.sin(a) * 0.7 : 0));
  }

  // ------------------------------------------------------------------ building the place
  build() {
    const def = this.def, th = THEMES[def.theme] || THEMES.cave;
    if (!this.outdoor) this.buildCave(th);
    // gates (bars across a corridor)
    for (const G of this.gates) this.buildGate(G, th);
    // the rooms’ own props, lights, plates
    for (const r of this.rooms) {
      for (const pr of r.props || []) this.prop(pr);
      for (const [x, z] of r.plates || []) this.plates.push(this.buildPlate(r, x, z));
      if (r.torches) r.tb = r.torches.map(([x, z, n]) => this.buildTorch(r, x, z, n));
      if (r.bells) r.sb = r.bells.map(([x, z], k) => this.buildSimBell(r, x, z, k));
      if (r.rails) r.pn = this.buildRails(r);
      if (r.ice) r.slabs = this.buildIce(r);
      if (r.kind === 'tide') r.tide = this.buildTide(r);
      if (r.vents) r.vt = r.vents.map((v, k) => this.buildVent(r, v, k));
      if (r.kind === 'beam') r.bm = buildBeam(this, r);
      if (r.kind === 'jars') r.jr = buildJars(this, r);
      if (r.kind === 'clock') r.ck = buildClockRoom(this, r);
      if (r.kind === 'spot') r.sp = buildSpots(this, r);
    }
    for (const pr of def.props || []) this.prop(pr);
    th.dress(this);
  }

  // a dark place’s floor & walls (an outdoor instance’s ground is the instance’s map)
  buildCave(th) {
    // the floor: one painted texture for the whole dungeon
    const p = new Painter(this.W * TX, this.H * TX);
    th.paintFloor(p, this);
    const tex = new THREE.CanvasTexture(p.c);
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(this.W, this.H).rotateX(-Math.PI / 2), toon(this.P.r3d, { map: tex }));
    floor.position.set(this.W / 2, 0, this.H / 2);
    floor.receiveShadow = true;
    this.root.add(floor);
    this.floorTex = tex;
    // the walls: every empty tile touching the floor
    const walls = [];
    for (let z = 0; z < this.H; z++) for (let x = 0; x < this.W; x++) {
      if (this.g[this.I(x, z)] !== 0) continue;
      let near = false, south = false, north = false, side = false;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        const v = this.at(x + dx, z + dz);
        if (v === 1 || v === 2 || v === 3) { near = true; if (dz === 1) south = true; if (dz === -1) north = true; if (dz === 0) side = true; }
      }
      if (!near) continue;
      // (a wall with floor south of it faces the camera: tall; one with floor north of it would hide the room: low)
      const hgt = south ? th.wallH : north && !side ? th.lowH : th.sideH;
      walls.push([x, z, hgt, south, north]);
    }
    th.buildWalls(this, walls);
  }

  prop(pr) {
    const K = this.K, [kind, x, z, s = 1] = pr;
    const g = K.grp(this.root, x, 0, z);
    const P = PROPS[kind];
    if (!P) return;
    const res = P(K, g, s, this);
    if (res && res.light) this.lights.push({ ...res.light, x: this.ox + x + (res.light.dx || 0), z: this.oz + z + (res.light.dz || 0), base: res.light.power });
    if (res && res.r) this.colliders.push({ x, z, r: res.r });
    if (res && res.anim) this.anims.push(res.anim);
  }

  buildGate(G, th = THEMES.cave) {
    if (th.gate) { th.gate(this, G); this.setGate(G, G.open, true); return; }
    const K = this.K, g = K.grp(this.root, G.x, 0, G.z);
    const n = Math.round(G.w * 2), bars = [];
    const iron = K.c('#3b3440'), top = K.c('#6a5a4a');
    for (let i = 0; i < n; i++) {
      const b = K.put(g, K.box(0.14, 2, 0.14), iron, G.horiz ? -G.w / 2 + 0.25 + i * 0.5 : 0, 1, G.horiz ? 0 : -G.w / 2 + 0.25 + i * 0.5);
      bars.push(b);
    }
    K.put(g, K.box(G.horiz ? G.w + 0.3 : 0.3, 0.26, G.horiz ? 0.3 : G.w + 0.3), top, 0, 2.05, 0);
    G.g = g; G.bars = bars;
    this.setGate(G, G.open, true);
  }

  setGate(G, open, instant = false) {
    G.open = open;
    if (instant) { G.k = open ? 1 : 0; if (G.g) G.g.position.y = -G.k * (G.depth || 2.05); }
    const x0 = Math.floor(G.x - (G.horiz ? G.w / 2 : 0.5)), x1 = Math.ceil(G.x + (G.horiz ? G.w / 2 : 0.5));
    const z0 = Math.floor(G.z - (G.horiz ? 0.5 : G.w / 2)), z1 = Math.ceil(G.z + (G.horiz ? 0.5 : G.w / 2));
    for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) {
      const v = this.at(x, z);
      if (v === 1 || v === 3) this.g[this.I(x, z)] = open ? 1 : 3;
    }
    if (!instant) audio.sfx(open ? 'unlock' : 'slam', { volume: 0.6 });
  }
  gate(id) { return this.gates.find((q) => q.id === id); }

  // a brazier to light (torches rooms): its number counted out by glowworms above it
  buildTorch(r, x, z, n) {
    const K = this.K, g = K.grp(this.root, x, 0, z);
    K.put(g, K.cyl(0.42, 0.28, 0.7, 8), K.c('#4a4048'), 0, 0.35, 0);
    K.put(g, K.cyl(0.46, 0.46, 0.08, 8), K.c('#6a5a4a'), 0, 0.72, 0);
    const flame = K.noCast(K.put(g, K.cone(0.3, 0.7, 7), K.glow('#ffd66b', '#ff9a3a', 1.2), 0, 1.05, 0));
    flame.visible = false;
    K.put(g, K.box(0.03, 1.1, 0.03), K.c('#3a2a2a'), 0, 2.25, 0);
    for (let i = 0; i < n; i++) K.noCast(K.put(g, K.ball(0.1, 6), K.glow('#b8ffd8', '#6af0b0', 1.4), (i - (n - 1) / 2) * 0.28, 1.72, 0.05));
    const light = { x: this.ox + x, y: 1.3, z: this.oz + z, color: '#ffa860', power: 0, base: 0, flicker: true, dist: 8 };
    this.lights.push(light);
    this.anims.push((tm) => { if (flame.visible) { flame.scale.y = 0.85 + Math.sin(tm * 11 + x) * 0.18; flame.rotation.y = tm; } });
    this.colliders.push({ x, z, r: 0.5 });
    return { r, x, z, n, g, flame, light, lit: false, near: false };
  }
  setTorch(tb, on) {
    tb.lit = on; tb.flame.visible = on;
    tb.light.base = on ? 1.7 : 0; tb.light.power = tb.light.base;
  }

  buildPlate(r, x, z) {
    const K = this.K, g = K.grp(this.root, x, 0, z);
    K.put(g, K.cyl(0.62, 0.7, 0.14, 12), K.c('#8a8290'), 0, 0.07, 0);
    const rune = K.noCast(K.put(g, K.cyl(0.4, 0.4, 0.05, 10), K.glow('#6a5a7a', '#000000', 0), 0, 0.16, 0));
    rune.material = rune.material.clone();
    return { r, x, z, g, rune, lit: 0 };
  }

  // a singing bell (simon rooms): a bell on a little arch of ice over a glowing disc;
  // ring() swings it and sounds its own note
  buildSimBell(r, x, z, k) {
    const K = this.K, g = K.grp(this.root, x, 0, z);
    const cols = ['#ff9a8a', '#ffd66b', '#8ff0a0', '#8ad0ff', '#c89aff'];
    const ice = K.glow('#dff4ff', '#8ad0ff', 0.35), col = cols[k % cols.length];
    for (const s of [-1, 1]) K.put(g, K.box(0.18, 1.9, 0.18), ice, s * 0.55, 0.95, 0);
    K.put(g, K.box(1.3, 0.18, 0.24), ice, 0, 1.95, 0);
    const bell = K.grp(g, 0, 1.85, 0);
    K.put(bell, K.cyl(0.16, 0.34, 0.5, 10), K.glow('#d8b86a', '#a8843a', 0.3), 0, -0.28, 0);
    K.put(bell, K.ball(0.07, 6, 4), K.c('#8a6a3a'), 0, -0.56, 0);
    // (a pale disc of its colour; it blazes when the bell sings)
    const disc = K.noCast(K.put(g, K.cyl(0.85, 0.85, 0.04, 16), K.glow('#b8c8d8', col, 0.25), 0, 0.03, 0));
    disc.material = disc.material.clone();
    const b = { r, x, z, k, g, bell, disc, glow: 0, near: false, swing: 0 };
    b.setGlow = (v) => { disc.material.emissiveIntensity = 0.25 + v * 2.6; };
    b.ring = () => {
      b.glow = 1; b.swing = 1;
      audio.sfx('bell', { volume: 0.8, pitch: [0, 4, 7, 12, 16][k % 5] });
      this.P.world.fx.emit('sparkle', this.ox + x, 2, this.oz + z, 10, { color: col });
    };
    this.anims.push((tm, dt) => { b.swing = Math.max(0, b.swing - (dt || 0.016) * 1.5); bell.rotation.z = Math.sin(tm * 14) * 0.35 * b.swing; });
    return b;
  }

  // a little rail network (points rooms): rails for every branch, a lever by each
  // set of points, the depot with its ore cart, the button that sends it
  buildRails(r) {
    const K = this.K, R = r.rails, root = K.grp(this.root, 0, 0, 0), rail = K.c('#9a96a0'), tie = K.c('#6a4a34');
    const P = (id) => R.nodes[id];
    const seg = (a, b, parent) => {
      const [ax, az] = a, [bx, bz] = b, L = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bx - ax, bz - az);
      const s = K.grp(parent, (ax + bx) / 2, 0, (az + bz) / 2, ang);
      for (const o of [-0.35, 0.35]) K.put(s, K.box(0.08, 0.06, L), rail, o, 0.04, 0);
      for (let i = 0; i < Math.floor(L / 0.55); i++) K.put(s, K.box(0.95, 0.04, 0.14), tie, 0, 0.02, -L / 2 + 0.3 + i * 0.55);
      return s;
    };
    const edges = [];
    for (const [a, nx] of Object.entries(R.next)) for (const b of [].concat(nx)) edges.push([a, b]);
    for (const [a, b] of edges) seg(P(a), P(b), root);
    // the points: a bright blade on the branch each set sends the cart down
    const pn = { R, state: { ...R.start }, levers: [], blades: {}, cart: null, root };
    for (const [id, nx] of Object.entries(R.next)) {
      if (!Array.isArray(nx)) continue;
      pn.blades[id] = nx.map((to) => {
        const [ax, az] = P(id), [bx, bz] = P(to), L = Math.hypot(bx - ax, bz - az) || 1;
        const m = K.noCast(K.put(root, K.box(0.2, 0.08, 1.2), K.glow('#ffd66b', '#ffb040', 0.9), ax + (bx - ax) / L * 0.9, 0.08, az + (bz - az) / L * 0.9, Math.atan2(bx - ax, bz - az)));
        m.material = m.material.clone();
        return m;
      });
    }
    // the levers: each flips its own points — or, wired up, every set wearing its colour
    const marks = {};
    for (const [id, def] of Object.entries(R.levers)) {
      const L = Array.isArray(def) ? { at: def, flips: [id], col: '#c8383e' } : def, [lx, lz] = L.at;
      const g = K.grp(root, lx, 0, lz);
      K.put(g, K.box(0.5, 0.3, 0.5), K.c('#5a3a2a'), 0, 0.15, 0);
      const arm = K.grp(g, 0, 0.3, 0);
      K.put(arm, K.box(0.08, 0.9, 0.08), K.c('#3a3844'), 0, 0.45, 0);
      K.put(arm, K.ball(0.12, 6, 4), K.glow(L.col, L.col, 0.4), 0, 0.92, 0);
      if (!Array.isArray(def)) {
        K.put(g, K.box(0.54, 0.08, 0.54), K.glow(L.col, L.col, 0.5), 0, 0.31, 0);
        for (const j of L.flips) {
          // (a little post of the lever’s colour beside each set of points it works)
          const k = (marks[j] = (marks[j] || 0) + 1), [jx, jz] = P(j);
          const post = K.grp(root, jx - 1.3 + (k - 1) * 0.45, 0, jz + 0.95);
          K.put(post, K.box(0.12, 0.6, 0.12), K.c('#3a3844'), 0, 0.3, 0);
          K.put(post, K.box(0.3, 0.22, 0.08), K.glow(L.col, L.col, 0.6), 0, 0.62, 0);
        }
      }
      pn.levers.push({ id, x: lx, z: lz, arm, flips: L.flips, near: false, up: 0 });
      this.colliders.push({ x: lx, z: lz, r: 0.3 });
    }
    pn.show = () => {
      for (const [id, bl] of Object.entries(pn.blades)) bl.forEach((m, i) => { const on = i === pn.state[id]; m.material.emissiveIntensity = on ? 1.2 : 0; m.material.color.set(on ? '#ffd66b' : '#4a4652'); });
      for (const lv of pn.levers) lv.arm.rotation.z = lv.up ? -0.6 : 0.6;
    };
    pn.show();
    // buffer stops at the sidings’ ends (the cart goes nowhere there)
    for (const id of Object.keys(R.nodes)) {
      if (id === 'd' || id === R.goal || R.next[id] !== undefined) continue;
      const from = Object.keys(R.next).find((a) => [].concat(R.next[a]).includes(id));
      const [ax, az] = P(from), [bx, bz] = P(id);
      const bs = K.grp(root, bx, 0, bz, Math.atan2(bx - ax, bz - az));
      K.put(bs, K.box(1.1, 0.34, 0.26), K.c('#c8383e'), 0, 0.3, 0);
      for (const o of [-0.34, 0.34]) K.put(bs, K.box(0.14, 0.44, 0.14), K.c('#3a3844'), o, 0.22, -0.12);
      K.put(bs, K.box(0.3, 0.1, 0.27), K.c('#f0e6d0'), 0, 0.36, 0.01);
    }
    // the cart, waiting at the top of the line
    const [dx, dz] = P('d'), [ex, ez] = P(R.next.d);
    pn.idle = runawayCart(K, 1.3).g;
    pn.idle.scale.setScalar(0.85);
    pn.idle.position.set(dx, 0.3, dz);
    pn.idle.rotation.y = Math.atan2(ex - dx, ez - dz);
    root.add(pn.idle);
    // the button that sends the cart
    const [gx, gz] = R.go, bt = K.grp(root, gx, 0, gz);
    K.put(bt, K.box(0.8, 0.5, 0.8), K.c('#3a3844'), 0, 0.25, 0);
    const knob = K.put(bt, K.cyl(0.26, 0.26, 0.24, 10), K.glow('#ff5a4a', '#c8383e', 0.6), 0, 0.62, 0);
    pn.go = { x: gx, z: gz, knob, near: false };
    this.colliders.push({ x: gx, z: gz, r: 0.3 });
    return pn;
  }

  // the tide (tide rooms): the sea over the room's floor, and the tide bells that
  // send it out — bronze bells on coral posts, a ring of shells to step into
  buildTide(r) {
    const K = this.K, root = K.grp(this.root, 0, 0, 0);
    const sea = K.put(root, K.box(r.w - 0.2, 0.06, r.h - 0.2), K.glow('#3ab8c0', '#1a6a7a', 0.25), r.x + r.w / 2, TIDE_HIGH, r.z + r.h / 2);
    sea.material = sea.material.clone();
    sea.material.transparent = true; sea.material.opacity = 0.62; sea.material.depthWrite = false;
    sea.receiveShadow = false; sea.castShadow = false;
    const T = { sea, k: 0, outT: 0, bells: [], was: false, cool: 0, full: () => T.k < 0.5 };
    for (const [x, z] of r.bells || []) {
      if (r.greatBell) {
        // (the great Sunken Bell itself: a ring of shells before it to step into)
        const g = K.grp(root, x, 0, z), big = buildSunkenBell(this.P.r3d);
        big.position.set(0, 0, -1.6); g.add(big);
        const ring = K.noCast(K.put(g, K.cyl(1.5, 1.5, 0.05, 20), K.glow('#f4e8d0', '#ffd66b', 0.2), 0, 0.03, 0.4));
        ring.material = ring.material.clone();
        const b = { x, z: z + 0.4, bell: big.userData.bell, great: big, ring, near: false, rung: -99, swing: 0 };
        this.anims.push((tm, dt) => { if (big.userData.anim) big.userData.anim(tm, dt); ring.material.emissiveIntensity = T.cool > 0 || T.outT > 0 || !r.clapperIn ? 0.05 : 0.35 + Math.sin(tm * 4) * 0.3; });
        this.colliders.push({ x: x - 2.1, z: z - 1.6, r: 0.5 }, { x: x + 2.1, z: z - 1.6, r: 0.5 });
        T.bells.push(b);
        continue;
      }
      const g = K.grp(root, x, 0, z);
      g.scale.setScalar(r.bellScale || 1);
      K.put(g, K.cyl(0.18, 0.26, 1.7, 7), K.c('#e07a6a'), 0, 0.85, 0);
      for (const [a, y] of [[0.4, 0.5], [2.4, 1.0], [4.3, 1.3]]) K.put(g, K.ball(0.16, 5, 4), K.c('#f0a090'), Math.cos(a) * 0.2, y, Math.sin(a) * 0.2);
      K.put(g, K.box(0.9, 0.1, 0.12), K.c('#6a4a34'), 0, 1.75, 0);
      const bell = K.grp(g, 0, 1.68, 0);
      K.put(bell, K.cyl(0.14, 0.3, 0.44, 10), K.glow('#d8a84a', '#8a6a2a', 0.25), 0, -0.24, 0);
      K.put(bell, K.ball(0.06, 6, 4), K.c('#6a4a2a'), 0, -0.5, 0);
      const ring = K.noCast(K.put(g, K.cyl(0.9, 0.9, 0.05, 16), K.glow('#f4e8d0', '#ffd66b', 0.2), 0, 0.03, 0));
      ring.material = ring.material.clone();
      const b = { x, z, bell, ring, near: false, rung: -99, swing: 0 };
      this.anims.push((tm, dt) => { b.swing = Math.max(0, b.swing - (dt || 0.016) * 1.2); bell.rotation.z = Math.sin(tm * 12) * 0.4 * b.swing; ring.material.emissiveIntensity = T.cool > 0 || T.outT > 0 ? 0.05 : 0.2 + (this.t - b.rung < (r.together || 1.5) ? 1.4 : 0.35 + Math.sin(tm * 4) * 0.25); });
      T.bells.push(b);
    }
    return T;
  }

  // a vent (vent rooms): a ring of black rock round a glowing throat; an arrow on the
  // ground says where it throws; a stone cap on a hinge beside it (group rooms)
  buildVent(r, v, k) {
    const K = this.K, [x, z] = v.at, g = K.grp(this.root, x, 0, z);
    const rock = K.c('#3a3438'), rockL = K.c('#5a5058');
    K.put(g, K.cyl(0.95, 1.1, 0.3, 10), rock, 0, 0.15, 0);
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; K.put(g, K.box(0.34, 0.26 + (i % 3) * 0.1, 0.3), rockL, Math.cos(a) * 0.86, 0.3, Math.sin(a) * 0.86, -a); }
    const throat = K.noCast(K.put(g, K.cyl(0.62, 0.62, 0.05, 12), K.glow('#ff9a4a', '#ff6a1a', 0.6), 0, 0.31, 0));
    throat.material = throat.material.clone();
    const jet = K.noCast(K.put(g, K.cyl(0.4, 0.62, 1, 10), K.glow('#fff0d8', '#ffb070', 0.8), 0, 0.5, 0));
    jet.material = jet.material.clone(); jet.material.transparent = true; jet.material.opacity = 0.7; jet.material.depthWrite = false;
    jet.visible = false;
    // (the arrow: from the vent towards where it throws)
    const arrow = K.grp(g, 0, 0.04, 0);
    const tos = v.tos || [v.to];
    const aim = tos[tos.length - 1];
    arrow.rotation.y = Math.atan2(aim[0] - x, aim[1] - z);
    const am = K.glow('#ffd66b', '#ff9a4a', 0.3);
    K.noCast(K.put(arrow, K.box(0.16, 0.03, 0.9), am, 0, 0, 1.55));
    const tip = K.noCast(K.put(arrow, K.cone(0.28, 0.4, 3), am, 0, 0, 2.15));
    tip.rotation.x = Math.PI / 2;
    const V = { ...v, k, x, z, g, throat, jet, arrow, t: (v.phase || 0), capped: !!v.startCapped, near: false };
    if (v.cap) {
      const [cx, cz] = v.cap, lever = K.grp(this.root, cx, 0, cz);
      K.put(lever, K.box(0.7, 0.14, 0.7), rock, 0, 0.07, 0);
      const knob = K.put(lever, K.cyl(0.24, 0.3, 0.3, 8), K.glow('#c8a8ff', '#8a5ae0', 0.5), 0, 0.3, 0);
      const lid = K.grp(g, 0, 0.32, 0);
      K.put(lid, K.cyl(0.9, 0.9, 0.2, 10), rockL, 0, 0.1, 0);
      V.lid = lid; V.knob = knob; V.lever = { x: cx, z: cz, near: false };
      this.colliders.push({ x: cx, z: cz, r: 0.3 });
    }
    const inPlace = Math.hypot(aim[0] - x, aim[1] - z) < 0.5;
    V.show = () => { if (V.lid) { V.lid.position.y = V.capped ? 0.34 : -0.4; V.lid.visible = V.capped; V.knob.material.emissiveIntensity = V.capped ? 1.2 : 0.3; } V.arrow.visible = !V.capped && !inPlace; };
    V.show();
    return V;
  }

  // thin ice (thinice rooms): slabs over a frozen river — thick white ones hold,
  // clear blue ones crack under you and give way
  buildIce(r) {
    const K = this.K, I = r.ice, root = K.grp(this.root, 0, 0, 0);
    let h = (I.seed || 5) * 7919;
    const rnd = () => { h = (h * 1103515245 + 12345) & 0x7fffffff; return h / 0x7fffffff; };
    // the safe path: from the entrance row to the far row, only ever forward or
    // sideways, ending under the way out (the room’s middle)
    const safe = new Set(), exit = Math.floor((r.x + r.w / 2 - I.x0) / I.size);
    let c = exit;
    for (let row = I.rows - 1; row >= 0; row--) {
      safe.add(c + ',' + row);
      if (row === 0) break;
      let nc = c;
      if (Math.abs(c - exit) >= row - 1) nc = c + Math.sign(exit - c);
      else if (rnd() < 0.6) nc = Math.max(0, Math.min(I.cols - 1, c + (rnd() < 0.5 ? -1 : 1)));
      if (nc !== c) { c = nc; safe.add(c + ',' + row); }
    }
    const thick = K.c('#eef6fc'), thin = K.c('#9fd0f0', { transparent: true, opacity: 0.8 }), hole = K.c('#0e2a3e'), bubble = K.c('#dff4ff');
    const slabs = [];
    for (let row = 0; row < I.rows; row++) for (let col = 0; col < I.cols; col++) {
      const x = I.x0 + col * I.size + I.size / 2, z = I.z0 + row * I.size + I.size / 2, isThin = !safe.has(col + ',' + row);
      const m = K.put(root, K.box(I.size - 0.1, 0.08, I.size - 0.1), isThin ? thin : thick, x, 0.04, z);
      m.receiveShadow = true;
      if (isThin) { m.material = m.material.clone(); for (let k = 0; k < 3; k++) K.noCast(K.put(m, K.ball(0.06, 4, 3), bubble, (rnd() - 0.5) * 1.2, 0.05, (rnd() - 0.5) * 1.2)); }
      else for (let k = 0; k < 2; k++) K.put(m, K.box(0.3, 0.02, 0.2), K.c('#ffffff'), (rnd() - 0.5) * 1.1, 0.05, (rnd() - 0.5) * 1.1);
      const hl = K.noCast(K.put(root, K.cyl(I.size * 0.45, I.size * 0.45, 0.02, 12), hole, x, 0.02, z));
      hl.visible = false;
      slabs.push({ col, row, x, z, thin: isThin, mesh: m, hole: hl, state: 'ok', t: 0 });
    }
    return slabs;
  }

  // ------------------------------------------------------------------ frame
  update(dt) {
    const P = this.P, C = P.combat;
    this.t += dt;
    for (const a of this.anims) a(this.t, dt);
    for (const l of this.lights) if (l.flicker) l.power = l.base * (0.85 + Math.sin(this.t * 13 + l.x) * 0.08 + Math.sin(this.t * 7.3 + l.z) * 0.07);
    // every hero’s lantern
    this.heroLights();
    // the gates slide
    for (const G of this.gates) {
      const to = G.open ? 1 : 0;
      if (G.k !== to) { G.k += Math.sign(to - G.k) * Math.min(Math.abs(to - G.k), dt * 1.8); G.g.position.y = -G.k * (G.depth || 2.05); }
    }
    const heroes = P.players.filter((p) => (p.connected || P.solo) && this.D.inside(p.pos.x, p.pos.z));
    // rooms come alive when someone walks in
    for (const r of this.rooms) {
      r.t += dt;
      const inside = heroes.filter((p) => { const lx = p.pos.x - this.ox, lz = p.pos.z - this.oz; return lx >= r.x + 1 && lz >= r.z + 1 && lx < r.x + r.w - 1 && lz < r.z + r.h - 1; });
      if (inside.length && !r.seen) {
        r.seen = true;
        if (r.said) P.toast(t(r.said), '#fff3c4');
        if (r.onSeen) r.onSeen(this.D.saga, this, r);
      }
      const K = ROOM_KINDS[r.kind];
      if (K) K(this, r, inside, dt);
    }
    // the plates (lit a moment after someone steps off)
    for (const pl of this.plates) {
      const on = heroes.some((p) => Math.hypot(p.pos.x - this.ox - pl.x, p.pos.z - this.oz - pl.z) < 0.75);
      const hold = heroes.length <= 1 ? 7 : heroes.length <= 2 ? 5 : 3.5;
      if (on) { if (pl.lit <= 0) audio.sfx('tone', { volume: 0.6, pitch: this.plates.indexOf(pl) * 2 }); pl.lit = hold; }
      else pl.lit = Math.max(0, pl.lit - dt);
      const k = Math.min(1, pl.lit / 1.2);
      pl.rune.material.emissive.set(pl.r.solved ? '#8fe0a0' : '#ffd66b');
      pl.rune.material.emissiveIntensity = pl.r.solved ? 1 : k * (0.6 + Math.sin(this.t * 10) * 0.2 * (pl.lit < 2 ? 1 : 0));
    }
    if (C && this.bossFight) this.bossFight(dt);
    void C;
  }

  heroLights() {
    const P = this.P;
    this.lights = this.lights.filter((l) => !l.hero);
    for (const p of P.players) {
      if (!(p.connected || P.solo) || !this.D.inside(p.pos.x, p.pos.z)) continue;
      this.lights.push({ hero: true, x: p.pos.x, y: 1.7, z: p.pos.z + 0.2, color: '#ffd9a0', power: 1.25, dist: 7.5, lamp: true });
    }
    // (a boss glows enough to be seen coming)
    if (P.combat) for (const e of P.combat.enemies) if (e.alive && e.def.boss && this.D.inside(e.x, e.z)) this.lights.push({ hero: true, x: e.x, y: e.def.h + 1.2, z: e.z + 1.2, color: '#ffe0b0', power: 1.5, dist: 9, lamp: true });
    this.room.lights = this.lights;
  }

  // spawn foes in a room (spots spread around its middle)
  spawnIn(r, types, { level = null, sleep = false, tag = null } = {}) {
    const C = this.P.combat;
    if (!C) return [];
    const lv = this.def.lv, out = [];
    types.forEach((ty, i) => {
      const a = (i / types.length) * Math.PI * 2 + 0.4;
      const rx = r.w * 0.28, rz = r.h * 0.26;
      let x = this.ox + r.x + r.w / 2 + Math.cos(a) * rx, z = this.oz + r.z + r.h / 2 + Math.sin(a) * rz;
      for (let k = 0; k < 12 && this.D.blocked(x, z, 0.5); k++) { x = this.ox + r.x + 2 + Math.random() * (r.w - 4); z = this.oz + r.z + 2 + Math.random() * (r.h - 4); }
      const e = C.spawn(ty, x, z, { level: level || (lv[0] + Math.floor(Math.random() * (lv[1] - lv[0] + 1))), sleep });
      e.saga = true; if (tag) e.sagaTag = tag;
      out.push(e);
    });
    return out;
  }

  // the gates a room locks while its fight lasts
  lockRoom(r, on) {
    for (const G of this.gates) if ((G.room === r.id || G.from === r.id) && !G.keepOpen) this.setGate(G, on ? false : true);
  }

  drawLabels(ctx, v) {
    const P = this.P;
    for (const r of this.rooms) {
      if (r.kind === 'end' && r.state === 'ready' && r.item) {
        const u = P.toUi(v, this.ox + r.item[0], 1.9, this.oz + r.item[1]);
        drawText(ctx, '↓', u.x, u.y - 8 + Math.round(Math.sin(this.t * 4) * 2), { color: '#ffd66b', align: 'center', outline: '#3b2a2e' });
      }
    }
  }

  dispose() {
    this.P.world.over.root.remove(this.root);
    if (this.inst) this.inst.dispose();
    if (this.floorTex) this.floorTex.dispose();
    this.root.traverse((o) => { if (o.isMesh && o.geometry && o.geometry.userData.own) o.geometry.dispose(); });
  }
}

// a runaway ore cart as wide as its lane, heaped with rock (rolls down the carts rooms)
// the sea over a tide room: its height in, and out
const TIDE_HIGH = 0.5, TIDE_LOW = -0.25;
// (thin and thick ice, as buildIce paints them: a gust blows the one into the other)
const ICE_THIN = new THREE.Color('#9fd0f0'), ICE_THICK = new THREE.Color('#eef6fc');

function runawayCart(K, w) {
  const g = new THREE.Group(), wheels = [];
  const body = K.c('#7a5a44'), band = K.c('#3a3844'), ore = K.c('#8a8290');
  K.put(g, K.box(w - 0.4, 0.55, 1.2), body, 0, 0.35, 0);
  for (const z of [-0.5, 0.5]) K.put(g, K.box(w - 0.3, 0.1, 0.08), band, 0, 0.6, z);
  for (let i = 0; i < Math.round(w * 1.5); i++) K.put(g, K.ball(0.26, 5), ore, -w / 2 + 0.5 + (i / Math.max(1, Math.round(w * 1.5) - 1)) * (w - 1), 0.72 + (i % 2) * 0.1, (i % 3 - 1) * 0.3);
  for (const x of [-(w / 2 - 0.5), w / 2 - 0.5]) for (const z of [-0.4, 0.4]) { const wh = K.grp(g, x, -0.1, z); K.put(wh, K.cyl(0.22, 0.22, 0.1, 10), band, 0, 0, 0, 0, 0, Math.PI / 2); K.put(wh, K.box(0.12, 0.3, 0.04), K.c('#9a96a0'), 0, 0, 0.06); wheels.push(wh); }
  return { g, wheels };
}

// ======================================================================
// what each kind of room does
const ROOM_KINDS = {
  // the dawn beam (saga/beam.js): mirrors, prisms, paper screens, lotus lanterns
  beam: beamRoom,
  // the firefly jars (saga/jars.js): racks, hooks, moth swarms, glowcap doors
  jars: jarsRoom,
  // the clocks (saga/clocks.js): then and now
  clock: clockRoom,
  // the spotlights (saga/spots.js): sweeping pools of light, flats, the lighting board
  spot: spotRoom,
  // gloom waiting inside: the doors lock until it’s gone
  fight(d, r, inside) {
    const C = d.P.combat;
    if (r.state === 'idle' && inside.length && C) {
      r.state = 'fight';
      d.lockRoom(r, true);
      r.foes = d.spawnIn(r, r.foes0 || r.foesList || [], {});
      d.P.toast(t(r.shout || 'The gloom stirs!'), '#b88cf0');
    } else if (r.state === 'fight' && !r.foes.some((e) => e.alive)) {
      r.state = 'clear';
      d.lockRoom(r, false);
      audio.jingle('questDone');
      if (r.chest && d.P.act && d.P.act.dropChest) d.P.act.dropChest(d.ox + r.chest[0], d.oz + r.chest[1], { rich: !!r.rich });
      if (r.onClear) r.onClear(d.D.saga, d, r);
    }
  },
  // hold every plate down at once
  plates(d, r) {
    if (r.solved) return;
    const pl = d.plates.filter((q) => q.r === r);
    if (pl.length && pl.every((q) => q.lit > 0)) {
      r.solved = true;
      audio.sfx('shard', { volume: 0.8 });
      d.P.showBanner(t(r.done || 'The way opens!'), '');
      for (const id of r.opens || []) { const G = d.gate(id); if (G) d.setGate(G, true); }
      if (r.onClear) r.onClear(d.D.saga, d, r);
    }
  },
  // hot wax drips on marked spots while anyone’s in here
  wax(d, r, inside, dt) {
    const C = d.P.combat;
    if (!C || !inside.length) return;
    r.dripT = (r.dripT ?? 1) - dt;
    if (r.dripT > 0) return;
    r.dripT = r.every || 0.9;
    const p = inside[Math.floor(Math.random() * inside.length)];
    const x = p.pos.x + (Math.random() - 0.5) * 3, z = p.pos.z + (Math.random() - 0.5) * 2.4;
    const lx = x - d.ox, lz = z - d.oz;
    if (d.at(Math.floor(lx), Math.floor(lz)) !== 1) return;
    const dmg = 8 * (1 + (d.def.lv[0] - 1) * 0.1);
    // (r.drop ’dynamite’: sticks lobbed off the ledges, bigger bangs)
    if (r.drop === 'icicle') { C.zone({ x, z, r: 1.15, delay: 1.2, dmg: dmg * 1.2, knock: 2, kind: 'bomb', gloom: true, elem: 'ice', arc: { x: x + (Math.random() - 0.5) * 2, y: 8, z: z - 2 }, look: 'ice' }); return; }
    if (r.drop === 'dynamite') { C.zone({ x, z, r: 1.35, delay: 1.25, dmg: dmg * 1.3, knock: 3, kind: 'bomb', gloom: true, elem: 'fire', arc: { x: x + (Math.random() - 0.5) * 6, y: 5, z: z - 5 }, look: 'dynamite' }); return; }
    C.zone({ x, z, r: 1.1, delay: 1.15, dmg, knock: 2, gloom: true, elem: 'fire' });
    C.vfx.later(1.1, () => { C.vfx.bit && C.vfx.smoke(x, 0.3, z, { n: 3, color: '#f4e4c0', size: 0.3 }); });
  },
  // braziers to light in the right order (the glowworms above count it out);
  // step up to one to light it — the wrong one and they all gutter out
  torches(d, r, inside) {
    if (r.solved || !r.tb) return;
    for (const tb of r.tb) {
      const near = inside.some((p) => Math.hypot(p.pos.x - d.ox - tb.x, p.pos.z - d.oz - tb.z) < 1.35);
      const came = near && !tb.near;
      tb.near = near;
      if (!came || tb.lit) continue;
      const next = r.tb.filter((q) => q.lit).length + 1;
      if (tb.n === next) {
        d.setTorch(tb, true);
        audio.sfx('tone', { volume: 0.7, pitch: next * 3 });
        d.P.world.fx.emit('sparkle', d.ox + tb.x, 1.3, d.oz + tb.z, 12, { color: '#ffd66b' });
        if (r.tb.every((q) => q.lit)) {
          r.solved = true;
          audio.sfx('shard', { volume: 0.8 });
          d.P.showBanner(t(r.done || 'The way opens!'), '');
          for (const id of r.opens || []) { const G = d.gate(id); if (G) d.setGate(G, true); }
          if (r.onClear) r.onClear(d.D.saga, d, r);
        }
      } else if (r.tb.some((q) => q.lit) || tb.n !== 1) {
        for (const q of r.tb) d.setTorch(q, false);
        audio.sfx('error', { volume: 0.6 });
        d.P.toast(t(r.wrong || 'The flames gutter out. The glowworms blink, patient: one… two… three…'), '#b8ffd8');
      }
      break;
    }
  },
  // singing bells: they play a tune, you ring it back — a note longer each round
  simon(d, r, inside, dt) {
    if (r.solved || !r.sb) return;
    const S = r.sim || (r.sim = { round: 0, seq: [], i: 0, state: 'wait', t: 0, seed: 11 });
    S.t -= dt;
    for (const b of r.sb) { b.glow = Math.max(0, b.glow - dt * 2.2); b.setGlow(b.glow); }
    const newTune = () => {
      S.seq = [];
      for (let k = 0; k < (r.first || 3) + S.round; k++) {
        S.seed = (S.seed * 1103515245 + 12345) & 0x7fffffff;
        let n = S.seed % r.sb.length;
        if (k && n === S.seq[k - 1]) n = (n + 1) % r.sb.length;
        S.seq.push(n);
      }
    };
    if (S.state === 'wait') { if (!inside.length) return; newTune(); S.state = 'play'; S.i = 0; S.t = 1.1; return; }
    if (S.state === 'play') {
      if (S.t > 0) return;
      if (S.i >= S.seq.length) { S.state = 'input'; S.i = 0; for (const b of r.sb) b.near = inside.some((p) => Math.hypot(p.pos.x - d.ox - b.x, p.pos.z - d.oz - b.z) < 1.05); return; }
      r.sb[S.seq[S.i++]].ring();
      S.t = 0.7;
      return;
    }
    if (S.state === 'pause') { if (S.t <= 0) { S.state = 'play'; S.i = 0; S.t = 0.4; } return; }
    // (your turn: step onto the bells in the order they sang)
    for (const b of r.sb) {
      const nr = inside.some((p) => Math.hypot(p.pos.x - d.ox - b.x, p.pos.z - d.oz - b.z) < 1.05);
      const came = nr && !b.near;
      b.near = nr;
      if (!came) continue;
      b.ring();
      if (b.k === S.seq[S.i]) {
        if (++S.i < S.seq.length) break;
        S.round++;
        if (S.round >= (r.rounds || 3)) {
          r.solved = true;
          audio.sfx('shard', { volume: 0.8 });
          d.P.showBanner(t(r.done || 'The way opens!'), '');
          for (const id of r.opens || []) { const G = d.gate(id); if (G) d.setGate(G, true); }
          if (r.onClear) r.onClear(d.D.saga, d, r);
        } else { d.P.toast(t(r.again || 'Right! Now a longer tune…'), '#bfe8ff'); newTune(); S.state = 'pause'; S.t = 1.4; }
      } else {
        audio.sfx('error', { volume: 0.6 });
        d.P.toast(t(r.wrong || 'A sour note! Listen again…'), '#bfe8ff');
        S.state = 'pause'; S.t = 1.6;
      }
      break;
    }
  },
  // rail points: step on a lever to switch its points, on the button to send the cart;
  // route it into the barricade and it bursts through
  points(d, r, inside, dt) {
    const N = r.pn;
    if (r.solved || !N) return;
    const near = (x, z, rr = 0.95) => inside.some((p) => Math.hypot(p.pos.x - d.ox - x, p.pos.z - d.oz - z) < rr);
    for (const lv of N.levers) {
      const nr = near(lv.x, lv.z);
      if (nr && !lv.near && !N.cart) { lv.up = 1 - lv.up; for (const j of lv.flips) N.state[j] = 1 - N.state[j]; N.show(); audio.sfx('unlock', { volume: 0.6 }); }
      lv.near = nr;
    }
    const nr = near(N.go.x, N.go.z);
    if (nr && !N.go.near && !N.cart) {
      // the cart's way through the points
      const R = N.R, path = [R.nodes.d];
      let at = 'd';
      for (let k = 0; k < 12; k++) { const nx = R.next[at]; if (nx === undefined) break; at = Array.isArray(nx) ? nx[N.state[at]] : nx; path.push(R.nodes[at]); }
      const m = runawayCart(d.K, 1.3).g;
      m.scale.setScalar(0.85);
      d.root.add(m);
      N.idle.visible = false;
      N.cart = { path, end: at, i: 0, k: 0, m };
      N.go.knob.position.y = 0.5;
      audio.sfx('whoosh', { volume: 0.6 });
    }
    N.go.near = nr;
    if (N.go.knob.position.y < 0.62) N.go.knob.position.y = Math.min(0.62, N.go.knob.position.y + dt * 0.3);
    const c = N.cart;
    if (!c) return;
    if (c.done) { c.t -= dt; if (c.t <= 0) { d.root.remove(c.m); N.cart = null; N.idle.visible = true; } return; }
    const [ax, az] = c.path[c.i], [bx, bz] = c.path[c.i + 1], L = Math.hypot(bx - ax, bz - az) || 1;
    c.k += (dt * 5.5) / L;
    if (c.k >= 1) { c.i++; c.k = 0; }
    if (c.i >= c.path.length - 1) {
      const [ex, ez] = c.path[c.path.length - 1];
      c.m.position.set(ex, 0.3, ez);
      c.done = true; c.t = 1.2;
      if (c.end === r.rails.goal) {
        r.solved = true;
        d.root.remove(c.m); N.cart = null;
        const C = d.P.combat;
        if (C) C.vfx.explosion(d.ox + ex, d.oz + ez, { r: 2.2, color: '#c88a5a', hot: '#ffd66b', big: true, scorch: false });
        audio.sfx('boom', { volume: 0.8 });
        d.P.world.fx.emit('dust', d.ox + ex, 0.5, d.oz + ez, 30, { color: '#a86a4a' });
        d.P.showBanner(t(r.done || 'The way opens!'), '');
        for (const id of r.opens || []) { const G = d.gate(id); if (G) d.setGate(G, true); }
        if (r.onClear) r.onClear(d.D.saga, d, r);
      } else {
        audio.sfx('thud', { volume: 0.6 });
        d.P.toast(t(r.wrong || 'Clunk. The cart ends up in a siding. Try other points.'), '#ffd66b');
      }
      return;
    }
    const [px, pz] = c.path[c.i], [qx, qz] = c.path[c.i + 1];
    c.m.position.set(px + (qx - px) * c.k, 0.3, pz + (qz - pz) * c.k);
    c.m.rotation.y = Math.atan2(qx - px, qz - pz);
  },
  // thin ice over a frozen river: the clear blue slabs crack under you and give way
  thinice(d, r, inside, dt) {
    if (!r.slabs) return;
    const I = r.ice;
    for (const s of r.slabs) {
      if (s.state === 'crack') {
        s.t -= dt;
        s.mesh.position.y = 0.04 + Math.sin(d.t * 60) * 0.02;
        if (s.t <= 0) {
          s.state = 'hole'; s.t = 4; s.mesh.visible = false; s.hole.visible = true;
          audio.sfx('splash', { volume: 0.7 });
          d.P.world.fx.emit('sparkle', d.ox + s.x, 0.4, d.oz + s.z, 14, { color: '#bfe8ff' });
        }
      } else if (s.state === 'hole') { s.t -= dt; if (s.t <= 0) { s.state = 'ok'; s.mesh.visible = true; s.hole.visible = false; s.mesh.position.y = 0.04; } }
    }
    // (everyone on the ice, right to its edges — the room’s own bounds stop short of them)
    const onIce = d.P.players.filter((p) => (p.connected || d.P.solo) && !p.away && p.pos.x - d.ox >= I.x0 && p.pos.x - d.ox < I.x0 + I.cols * I.size && p.pos.z - d.oz >= I.z0 && p.pos.z - d.oz < I.z0 + I.rows * I.size);
    // (now and then a gust sweeps snow over the river and every slab looks the
    // same for a while: remember the way)
    if (inside.length || onIce.length || r.gustT) {
      r.gustT = (r.gustT || 0) + dt;
      const cyc = r.gustT % 9, w = r.passed || cyc < 5.5 ? 0 : Math.max(0, Math.min(1, (cyc - 5.5) / 0.6, (9 - cyc) / 0.6));
      if (w > 0 && !r.gustSaid) { r.gustSaid = true; d.P.toast(t(r.gust || 'A gust sweeps snow over the river — remember the way!'), '#bfe8ff'); audio.sfx('whoosh', { volume: 0.5 }); }
      if (Math.abs(w - (r.gustW || 0)) > 0.005) {
        r.gustW = w;
        for (const s of r.slabs) if (s.thin) { s.mesh.material.color.copy(ICE_THIN).lerp(ICE_THICK, w); s.mesh.material.opacity = 0.8 + 0.2 * w; s.mesh.children.forEach((ch) => { ch.visible = w < 0.5; }); }
      }
      if (w > 0.3 && Math.random() < dt * 40) { const s = r.slabs[Math.floor(Math.random() * r.slabs.length)]; d.P.world.fx.emit('leaf', d.ox + s.x + (Math.random() - 0.5) * 2, 2.5, d.oz + s.z, 1, { color: '#ffffff' }); }
    }
    const C = d.P.combat;
    for (const p of onIce) {
      const col = Math.floor((p.pos.x - d.ox - I.x0) / I.size), row = Math.floor((p.pos.z - d.oz - I.z0) / I.size);
      const s = r.slabs.find((q) => q.col === col && q.row === row);
      if (!s) continue;
      if (s.row === 0 && !s.thin) r.passed = true;
      if (s.thin && s.state === 'ok') { s.state = 'crack'; s.t = 0.55; audio.sfx('crackle', { volume: 0.6 }); }
      else if (s.state === 'hole' && !(p.actor && p.actor.jumpY > 0.3)) {
        // (in the drink: a cold dunk, and back to the bank)
        const [bx, bz] = I.back;
        if (C && p.fighter) C.hurtPlayer(p, 8 * (1 + (d.def.lv[0] - 1) * 0.1), { from: 'trap', elem: 'ice' });
        if (d.P.solo) d.P.gatherAt(d.ox + bx, d.oz + bz); else p.actor.pos = { x: d.ox + bx + (Math.random() - 0.5), z: d.oz + bz };
        audio.sfx('splash', { volume: 0.8 });
        d.P.toast(t(r.wrong || 'Splash! Thin ice — back to the bank.'), '#bfe8ff');
      }
    }
    if (!r.passed && inside.some((p) => p.pos.z - d.oz < I.z0 + 0.5)) r.passed = true;
  },
  // the tide: the sea covers the floor (you wade, slowly); ring the tide bell — or
  // all of them at once — and it draws back for a while: the sluice gates open,
  // then the sea comes back in and they close again
  tide(d, r, inside, dt) {
    const T = r.tide;
    if (!T) return;
    const P = d.P, heroes = P.players.filter((p) => (p.connected || P.solo) && d.D.inside(p.pos.x, p.pos.z));
    // (a room with a fight of its own in the water: its script, like a script room's)
    if (r.run && r.state === 'idle' && inside.length) { r.state = 'running'; r.run(d.D.saga, d, r); }
    else if (r.state === 'running' && r.tick) r.tick(d.D.saga, d, r, dt);
    if (r.run && r.state !== 'running') return;
    if (T.cool > 0) T.cool -= dt;
    // (the bells: stepped into, they ring — unless they are still re-tuning)
    for (const b of T.bells) {
      const nr = inside.some((p) => Math.hypot(p.pos.x - d.ox - b.x, p.pos.z - d.oz - b.z) < (b.great ? 1.6 : 1.0 * (r.bellScale || 1))) && T.cool <= 0 && !r.done && (!b.great || r.clapperIn);
      if (nr && !b.near) {
        b.rung = d.t; b.swing = 1;
        if (b.great) { b.great.userData.swing = 1; audio.sfx('bell', { volume: 1, pitch: -14 }); d.P.combat && d.P.combat.vfx.shockwave(d.ox + b.x, d.oz + b.z - 1.6, { r: 9, color: '#ffe8b0', life: 0.9, wall: 1 }); }
        else audio.sfx('bell', { volume: 0.7, pitch: -5 });
        P.world.fx.emit('water', d.ox + b.x, 0.4, d.oz + b.z, 8);
      }
      b.near = nr;
    }
    const all = T.bells.length && T.bells.every((b) => d.t - b.rung < (r.together || 99));
    const any = T.bells.some((b) => d.t - b.rung < 0.1);
    if (T.outT <= 0 && (r.together ? all : any)) {
      T.outT = r.window || 12;
      for (const b of T.bells) b.rung = -99;
      for (const id of r.opens || []) { const G = d.gate(id); if (G) d.setGate(G, true); }
      P.toast(t(r.gone || 'The sea draws back — quick, through the sluice!'), '#8fd6e8');
      audio.sfx('whoosh', { volume: 0.7, pitch: -6 });
      if (!r.solved && !r.run) { r.solved = true; if (r.onClear) r.onClear(d.D.saga, d, r); }
      if (r.crabs && !r.crabbed && P.combat) { r.crabbed = true; r.foes = d.spawnIn(r, new Array(r.crabs).fill('reefcrab'), {}); }
    } else if (r.together && !all && T.bells.some((b) => d.t - b.rung < 0.1) && T.outT <= 0 && !(r.aloneT > d.t)) {
      r.aloneT = d.t + 6;
      P.toast(t(r.alone || 'One bell alone isn’t enough — they must ring together!'), '#8fd6e8');
    }
    if (T.outT > 0) {
      const was = Math.ceil(T.outT);
      T.outT -= dt;
      const s = Math.ceil(T.outT);
      if (s !== was && s <= 3 && s > 0 && inside.length) { P.toast(String(s), '#8fd6e8'); audio.sfx('tick', { volume: 0.5 }); }
      if (T.outT <= 0) {
        // (the sea comes back — but no gate shuts on someone standing in it)
        const inGate = (G) => heroes.some((p) => Math.abs(p.pos.x - d.ox - G.x) < (G.horiz ? G.w / 2 : 0.5) + 0.7 && Math.abs(p.pos.z - d.oz - G.z) < (G.horiz ? 0.5 : G.w / 2) + 0.7);
        if ((r.opens || []).some((id) => { const G = d.gate(id); return G && inGate(G); })) T.outT = 0.3;
        else {
          for (const id of r.opens || []) { const G = d.gate(id); if (G) d.setGate(G, false); }
          T.cool = r.cooldown || 0;
          if (!r.done && inside.length) { P.toast(t(r.back || 'The tide comes back in!'), '#8fd6e8'); audio.sfx('splash', { volume: 0.8, pitch: -4 }); }
        }
      }
    }
    // the sea's height, and wading through it
    const to = T.outT > 0 ? 1 : 0;
    T.k += Math.sign(to - T.k) * Math.min(Math.abs(to - T.k), dt * (to ? 1.1 : 0.7));
    T.sea.position.y = TIDE_HIGH + (TIDE_LOW - TIDE_HIGH) * T.k + Math.sin(d.t * 1.7) * 0.03;
    T.sea.visible = T.k < 0.99;
    if (T.k < 0.5) for (const p of inside) if (p.actor) p.actor.zoneSlow = Math.min(p.actor.zoneSlow ?? 1, 0.72);
    if (T.k < 0.6 && Math.random() < dt * 3 * inside.length) { const p = inside[Math.floor(Math.random() * inside.length)]; if (p.actor && p.actor.moving) P.world.fx.emit('water', p.pos.x, 0.3, p.pos.z, 2); }
  },
  // vents: each breathes on its rhythm — a rumble, puffs of steam, then it BLOWS and
  // throws whoever stands on it across the lava, in an arc, to where its arrow points.
  // Group rooms share one pressure: cap vents (their lever) and the open one throws
  // further (`tos[n]`, n caps); a throw that falls short lands in the lava.
  vent(d, r, inside, dt) {
    if (!r.vt) return;
    const P = d.P, C = P.combat;
    if (r.run && r.state === 'idle' && inside.length) { r.state = 'running'; r.run(d.D.saga, d, r); }
    else if (r.state === 'running' && r.tick) r.tick(d.D.saga, d, r, dt);
    // (the caps: stepped on, a lever swings its lid)
    for (const V of r.vt) if (V.lever) {
      const nr = inside.some((p) => Math.hypot(p.pos.x - d.ox - V.lever.x, p.pos.z - d.oz - V.lever.z) < 0.95);
      if (nr && !V.lever.near) { V.capped = !V.capped; V.show(); audio.sfx('unlock', { volume: 0.6, pitch: V.capped ? -4 : 2 }); }
      V.lever.near = nr;
    }
    const capped = r.vt.filter((q) => q.capped).length;
    // (the more caps, the further the open vents throw: their arrows say so)
    if (r.group) for (const V of r.vt) V.arrow.scale.z = 0.7 + capped * 0.55;
    for (const V of r.vt) {
      const per = V.period || 3.2, blow = V.blow || 0.8;
      V.t = (V.t + dt) % per;
      const on = !V.capped && V.t > per - blow;
      const warm = V.capped ? 0 : Math.max(0, (V.t - (per - blow - 1.2)) / 1.2);
      V.throat.material.emissiveIntensity = V.capped ? 0.1 : on ? 2.4 : 0.6 + warm * 1.2 + Math.sin(d.t * 20) * 0.1 * warm;
      V.jet.visible = on;
      if (on) { const k = (V.t - (per - blow)) / blow; V.jet.scale.set(1, 1 + Math.sin(k * Math.PI) * 5, 1); V.jet.position.y = 0.5 + Math.sin(k * Math.PI) * 2.5; }
      if (!V.capped && warm > 0.2 && Math.random() < dt * 10 * warm) P.world.fx.emit('smoke', d.ox + V.x + (Math.random() - 0.5) * 0.6, 0.5, d.oz + V.z + (Math.random() - 0.5) * 0.6, 1, { color: '#e8e0e0' });
      if (on && !V.was) { audio.sfx('whoosh', { volume: 0.7, pitch: -4 }); for (let k = 0; k < 10; k++) P.world.fx.emit('smoke', d.ox + V.x, 1 + Math.random() * 3, d.oz + V.z, 1, { color: '#fff0e0' }); }
      V.was = on;
      if (!on) continue;
      // whoever stands on it flies (and a boss standing on it takes a nasty jolt)
      const tos = V.tos || [V.to], to = tos[Math.min(tos.length - 1, r.group ? capped : 0)];
      for (const p of inside) if (!p.flight && Math.hypot(p.pos.x - d.ox - V.x, p.pos.z - d.oz - V.z) < 0.9) {
        p.flight = { room: r, t: 0, dur: V.dur || 1.1, x0: p.pos.x, z0: p.pos.z, x1: d.ox + to[0], z1: d.oz + to[1], h: V.h || 4, lava: !!to[2] };
        audio.sfx('jump', { volume: 0.6 });
      }
      if (C) for (const e of C.enemies) if (e.alive && e.def.boss && !(e.ventT > 0) && Math.hypot(e.x - d.ox - V.x, e.z - d.oz - V.z) < 1.3) {
        e.ventT = 3; C.hurtEnemy(e, e.maxHp * 0.12, { knock: 0, kind: 'dot', noCombo: true, color: '#ff9a4a' });
        C.popText(e.x, e.def.h + 1, e.z, t('Blown sky-high!'), '#ffb070', true);
        if (C.vfx) C.vfx.explosion(e.x, e.z, { r: 1.6, color: '#ff9a4a', hot: '#fff0d8', scorch: false });
      }
    }
    // those in the air: an arc, then down where the vent pointed
    for (const p of P.players) {
      const F = p.flight;
      if (!F || F.room !== r) continue;
      F.t += dt;
      const k = Math.min(1, F.t / F.dur);
      p.actor.pos.x = F.x0 + (F.x1 - F.x0) * k; p.actor.pos.z = F.z0 + (F.z1 - F.z0) * k;
      p.actor.jumpY = Math.sin(k * Math.PI) * F.h; p.actor.jumpV = 0;
      if (k < 1) continue;
      p.flight = null;
      P.world.fx.emit('dust', p.pos.x, 0.2, p.pos.z, 8, { color: '#8a8488' });
      if (F.lava) {
        // (short: into the lava — a scorch, and back to the room's safe spot)
        const [bx, bz] = r.back || [r.x + r.w / 2, r.z + r.h - 1.5];
        if (C && p.fighter) C.hurtPlayer(p, 10 * (1 + (d.def.lv[0] - 1) * 0.1), { from: 'trap', elem: 'fire' });
        P.world.fx.emit('smoke', p.pos.x, 0.5, p.pos.z, 10, { color: '#5a4a4a' });
        if (P.solo) P.gatherAt(d.ox + bx, d.oz + bz); else p.actor.pos = { x: d.ox + bx + (Math.random() - 0.5), z: d.oz + bz };
        audio.sfx('sizzle', { volume: 0.7 });
        P.toast(t(r.short || 'Not far enough — into the lava! Back to the rocks.'), '#ffb070');
      }
    }
    // across: the room is passed (and its gates open)
    // (`goalZ`: anywhere past that line counts — across the lava)
    if (!r.passed && (r.goal || r.goalZ) && inside.some((p) => !p.flight && (r.goalZ ? p.pos.z - d.oz < r.goalZ : Math.hypot(p.pos.x - d.ox - r.goal[0], p.pos.z - d.oz - r.goal[1]) < (r.goalR || 2.5)))) {
      r.passed = true;
      for (const id of r.opens || []) { const G = d.gate(id); if (G) d.setGate(G, true); }
      if (r.done) d.P.showBanner(t(r.done), '');
    }
  },
  // logs roll down the slope: their lane is marked, then they come (jump them!)
  logs(d, r, inside, dt) {
    const C = d.P.combat;
    r.rolling = (r.rolling || []).filter((L) => {
      L.t += dt;
      const k = (L.t - L.wait) / L.dur;
      if (k < 0) return true;
      if (k >= 1) { d.root.remove(L.m); return false; }
      const z = L.z0 + (L.z1 - L.z0) * k;
      L.m.position.set(L.cx - d.ox, 0.45, z - d.oz);
      if (L.cart) L.cart.forEach((w) => { w.rotation.x = -(z - L.z0) / 0.2; }); else L.m.rotation.x = -(z - L.z0) / 0.45;
      if (C) for (const p of C.alivePlayers()) {
        if (L.hit.has(p) || p.pos.x < L.cx - L.w / 2 - 0.3 || p.pos.x > L.cx + L.w / 2 + 0.3 || Math.abs(p.pos.z - z) > 0.6 || p.actor.jumpY > 0.6) continue;
        L.hit.add(p);
        C.hurtPlayer(p, 10 * (1 + (d.def.lv[0] - 1) * 0.1), { dir: { x: 0, z: 1 }, knock: 4, from: 'trap' });
      }
      if (Math.random() < dt * 12) d.P.world.fx.emit('dust', L.cx + (Math.random() - 0.5) * L.w, 0.2, z, 1, { color: '#8a6a4a' });
      return true;
    });
    if (!C || !inside.length || r.passed) return;
    r.logT = (r.logT ?? 0.6) - dt;
    if (r.logT > 0) return;
    r.logT = r.every || 1.7;
    const w = r.laneW || 5, x0 = r.x + 1 + Math.random() * Math.max(0, r.w - 2 - w);
    const cx = d.ox + x0 + w / 2, z0 = d.oz + r.z + 1, z1 = d.oz + r.z + r.h - 1, speed = r.speed || 7;
    flat(C, new THREE.PlaneGeometry(w, z1 - z0).rotateX(-Math.PI / 2), cx, (z0 + z1) / 2, 0xff5a6a, 0.9);
    let m, cart = null;
    if (r.roll === 'cart') { const c = runawayCart(d.K, w); m = c.g; cart = c.wheels; }
    else if (r.roll === 'snowball') { m = new THREE.Group(); const b = d.K.put(m, d.K.ball(0.62, 10, 8), d.K.c('#f4f8ff'), 0, 0.2, 0); b.scale.set(w / 1.6, 1, 1); d.K.put(b, d.K.ball(0.2, 6, 4), d.K.c('#dce8f4'), 0.3, 0.4, 0.3); }
    else {
      m = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, w, 10).rotateZ(Math.PI / 2), toon(d.P.r3d, { color: 0x7a5a3a, key: 'dun-log' }));
      m.geometry.userData.own = true;
      m.castShadow = true;
    }
    m.position.set(cx - d.ox, 0.45, z0 - d.oz - 1);
    d.root.add(m);
    r.rolling.push({ m, cx, w, z0, z1, t: 0, wait: 0.9, dur: (z1 - z0) / speed, hit: new Set(), cart });
    audio.sfx('thud', { volume: 0.5 });
  },
  // a mini-boss or a boss: the dungeon’s own script runs it
  script(d, r, inside, dt) {
    if (r.state === 'idle' && inside.length && r.run) { r.state = 'running'; r.run(d.D.saga, d, r); }
    else if (r.state === 'running' && r.tick) r.tick(d.D.saga, d, r, dt);
  },
  // the prize: pick it up and the dungeon is done
  end(d, r, inside) {
    if (r.state === 'idle' && r.ready) r.state = 'ready';
    if (r.state !== 'ready' || !r.item) return;
    for (const p of inside) {
      if (Math.hypot(p.pos.x - d.ox - r.item[0], p.pos.z - d.oz - r.item[1]) > 1.4) continue;
      r.state = 'taken';
      if (r.take) r.take(d.D.saga, d, r, p); else d.D.exit({ done: true });
      break;
    }
  },
};

// ======================================================================
// themes: floor painting, walls, dressing
const THEMES = {
  // a sea cave: wet sand, rock pools, barnacled boulders, glowing crystals
  cave: {
    wallH: 2.6, sideH: 1.7, lowH: 0.55,
    paintFloor(p, d) {
      let h = 99;
      const rnd = () => { h = (h * 1103515245 + 12345) & 0x7fffffff; return h / 0x7fffffff; };
      // a smooth value noise (so the sand never looks tiled)
      const hash = (x, z) => { const v = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return v - Math.floor(v); };
      const vn = (x, z) => { const x0 = Math.floor(x), z0 = Math.floor(z), fx = x - x0, fz = z - z0, sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
        const a = hash(x0, z0), b = hash(x0 + 1, z0), c = hash(x0, z0 + 1), e = hash(x0 + 1, z0 + 1);
        return a + (b - a) * sx + (c - a) * sz + (a - b - c + e) * sx * sz; };
      const W = d.W * TX, H = d.H * TX, ctx = p.ctx, img = ctx.createImageData(W, H), px = img.data;
      const SAND = [[184, 162, 122], [196, 174, 134], [171, 149, 112], [205, 185, 145]];
      const set = (i, c, k = 1) => { px[i] = c[0] * k; px[i + 1] = c[1] * k; px[i + 2] = c[2] * k; px[i + 3] = 255; };
      // how far each floor texel is from the rock (in tiles, capped): darker & wetter near it
      const near = new Float32Array(d.W * d.H).fill(9);
      for (let z = 0; z < d.H; z++) for (let x = 0; x < d.W; x++) {
        if (d.g[d.I(x, z)] === 0) continue;
        let m = 9;
        for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) if (d.at(x + dx, z + dz) === 0) m = Math.min(m, Math.hypot(dx, dz));
        near[d.I(x, z)] = m;
      }
      for (let Z = 0; Z < H; Z++) for (let X = 0; X < W; X++) {
        const tx = (X / TX) | 0, tz = (Z / TX) | 0, v = d.g[d.I(tx, tz)], i = (Z * W + X) * 4;
        if (v === 0) { set(i, [12, 10, 16]); continue; }
        const n = vn(X / 22, Z / 22) * 0.6 + vn(X / 7, Z / 7) * 0.4;
        const c = SAND[Math.min(3, (n * 4) | 0)];
        const wall = near[d.I(tx, tz)];
        const k = wall < 1.6 ? 0.62 : wall < 2.6 ? 0.8 : 0.95 + n * 0.08;
        set(i, c, k);
        const r = hash(X, Z);
        if (r < 0.06) set(i, [140, 124, 96], k);
        else if (r > 0.965) set(i, [228, 212, 176], k);
      }
      // rock pools: smooth ellipses, deep in the middle, a pale rim
      for (const room of d.rooms) for (const [cx, cz, rx, rz] of room.pools || []) {
        for (let Z = Math.floor((cz - rz - 1.5) * TX); Z < (cz + rz + 1.5) * TX; Z++) for (let X = Math.floor((cx - rx - 1.5) * TX); X < (cx + rx + 1.5) * TX; X++) {
          if (X < 0 || Z < 0 || X >= W || Z >= H) continue;
          const dx = (X / TX - cx) / rx, dz = (Z / TX - cz) / rz, dd = Math.sqrt(dx * dx + dz * dz) + (vn(X / 9, Z / 9) - 0.5) * 0.16;
          const i = (Z * W + X) * 4;
          if (dd < 0.78) set(i, dd < 0.45 ? [24, 64, 84] : [34, 88, 108]);
          else if (dd < 0.9) set(i, [70, 140, 150]);
          else if (dd < 1.02) set(i, [120, 108, 86]);
          else if (dd < 1.12 && hash(X, Z) < 0.35) set(i, [80, 120, 76]);
        }
      }
      ctx.putImageData(img, 0, 0);
      // hot wax spilled over the floor of a waxy room
      for (const room of d.rooms) if (room.floor === 'wax' || room.kind === 'wax') {
        for (let k = 0; k < room.w * room.h * 0.5; k++) {
          const X = (room.x + 1 + rnd() * (room.w - 2)) * TX, Z = (room.z + 1 + rnd() * (room.h - 2)) * TX;
          if (d.at((X / TX) | 0, (Z / TX) | 0) !== 1) continue;
          const w = 3 + rnd() * 7, h = 2 + rnd() * 4;
          p.rect(X, Z, w, h, '#efe2c2'); p.rect(X + 1, Z + h, w - 2, 1, '#cdbb96'); p.px(X + 1, Z + 1, '#fffaf0');
        }
      }
      // shells, pebbles and strands of seaweed on top
      for (let z = 0; z < d.H; z++) for (let x = 0; x < d.W; x++) {
        if (d.g[d.I(x, z)] !== 1) continue;
        const X = x * TX, Z = z * TX;
        if (rnd() < 0.07) { const sx = X + 3 + rnd() * 9, sz = Z + 3 + rnd() * 9; p.rect(sx, sz, 3, 2, '#f0dcc8'); p.px(sx + 1, sz, '#e0a8a0'); p.px(sx + 2, sz + 1, '#c89080'); }
        if (rnd() < 0.05) { const sx = X + 2 + rnd() * 10, sz = Z + 2 + rnd() * 10; p.rect(sx, sz, 2, 2, '#6a6070'); p.px(sx, sz, '#8a8290'); }
        if (near[d.I(x, z)] < 1.6 && rnd() < 0.25) { const sx = X + rnd() * 12, sz = Z + rnd() * 12; p.rect(sx, sz, 1, 3, '#3a6a3a'); p.px(sx + 1, sz + 1, '#4a7a4a'); }
      }
    },
    buildWalls(d, walls) {
      const K = d.K, n = walls.length;
      const rockGeo = K.geo('dun-rock', () => new THREE.DodecahedronGeometry(0.72, 0));
      const mats = [K.c('#4a4652'), K.c('#57525e'), K.c('#3e3a46')];
      const ims = mats.map((m) => { const im = new THREE.InstancedMesh(rockGeo, m, n); im.castShadow = true; im.receiveShadow = true; im.count = 0; d.root.add(im); return im; });
      const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
      let h = 7;
      const rnd = () => { h = (h * 1103515245 + 12345) & 0x7fffffff; return h / 0x7fffffff; };
      for (const [x, z, hgt] of walls) {
        const im = ims[Math.floor(rnd() * 3)];
        e.set(rnd() * 3, rnd() * 3, rnd() * 3); q.setFromEuler(e);
        p.set(x + 0.5 + (rnd() - 0.5) * 0.3, hgt * 0.42, z + 0.5 + (rnd() - 0.5) * 0.3);
        s.set(1.05 + rnd() * 0.35, hgt * (0.9 + rnd() * 0.25), 1.05 + rnd() * 0.35);
        im.setMatrixAt(im.count++, M.compose(p, q, s));
        // (tall walls get a second boulder on top, a little back)
        if (hgt > 2) { p.set(x + 0.5 + (rnd() - 0.5) * 0.4, hgt * 0.95, z + 0.2); s.set(0.9 + rnd() * 0.3, 0.8, 0.9); e.set(rnd() * 3, rnd() * 3, 0); q.setFromEuler(e); im.setMatrixAt(im.count++, M.compose(p, q, s)); }
      }
      for (const im of ims) { im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); }
      // barnacles & seaweed specks on the tall rocks’ feet are painted on the floor; a roof of darkness beyond
    },
    dress(d) {
      // (a few stalagmites where the rooms say, and a drip of light from above in the big rooms)
      void d;
    },
  },
};
THEMES.halls = THEMES.cave;       // (until the built halls get their own look)
// under the Deepwood: dark loam and moss, roots across the floor, glowworms &
// glowing mushrooms, walls of earth held together by roots
THEMES.roots = {
  wallH: 2.8, sideH: 1.8, lowH: 0.55,
  paintFloor(p, d) {
    let h = 71;
    const rnd = () => { h = (h * 1103515245 + 12345) & 0x7fffffff; return h / 0x7fffffff; };
    const hash = (x, z) => { const v = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return v - Math.floor(v); };
    const vn = (x, z) => { const x0 = Math.floor(x), z0 = Math.floor(z), fx = x - x0, fz = z - z0, sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
      const a = hash(x0, z0), b = hash(x0 + 1, z0), c = hash(x0, z0 + 1), e = hash(x0 + 1, z0 + 1);
      return a + (b - a) * sx + (c - a) * sz + (a - b - c + e) * sx * sz; };
    const W = d.W * TX, H = d.H * TX, ctx = p.ctx, img = ctx.createImageData(W, H), px = img.data;
    const LOAM = [[140, 108, 80], [154, 120, 88], [126, 96, 70], [166, 132, 96]], MOSS = [[100, 144, 80], [116, 162, 90], [86, 128, 70]];
    const set = (i, c, k = 1) => { px[i] = c[0] * k; px[i + 1] = c[1] * k; px[i + 2] = c[2] * k; px[i + 3] = 255; };
    const near = new Float32Array(d.W * d.H).fill(9);
    for (let z = 0; z < d.H; z++) for (let x = 0; x < d.W; x++) {
      if (d.g[d.I(x, z)] === 0) continue;
      let m = 9;
      for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) if (d.at(x + dx, z + dz) === 0) m = Math.min(m, Math.hypot(dx, dz));
      near[d.I(x, z)] = m;
    }
    const onRoot = (X, Z) => Math.min(Math.abs(vn(X / 30, Z / 18) - 0.5), Math.abs(vn(X / 22 + 7, Z / 34 + 3) - 0.5)) < 0.03;
    for (let Z = 0; Z < H; Z++) for (let X = 0; X < W; X++) {
      const tx = (X / TX) | 0, tz = (Z / TX) | 0, v = d.g[d.I(tx, tz)], i = (Z * W + X) * 4;
      if (v === 0) { set(i, [14, 10, 10]); continue; }
      const n = vn(X / 20, Z / 20) * 0.6 + vn(X / 6, Z / 6) * 0.4, mo = vn(X / 26 + 40, Z / 26);
      const wall = near[d.I(tx, tz)], k = wall < 1.6 ? 0.6 : wall < 2.6 ? 0.8 : 0.95 + n * 0.08;
      set(i, mo > 0.6 ? MOSS[Math.min(2, ((mo - 0.6) * 12) | 0)] : LOAM[Math.min(3, (n * 4) | 0)], k);
      if (onRoot(X, Z)) set(i, onRoot(X, Z - 1) ? [92, 66, 46] : [164, 128, 92], k);
      else if (onRoot(X, Z - 1) || onRoot(X, Z - 2)) set(i, [64, 48, 36], k);
      const r = hash(X, Z);
      if (r < 0.05) set(i, [66, 50, 40], k); else if (r > 0.994) set(i, [150, 240, 200]);
    }
    for (const room of d.rooms) for (const [cx, cz, rx, rz] of room.pools || []) {
      for (let Z = Math.floor((cz - rz - 1.5) * TX); Z < (cz + rz + 1.5) * TX; Z++) for (let X = Math.floor((cx - rx - 1.5) * TX); X < (cx + rx + 1.5) * TX; X++) {
        if (X < 0 || Z < 0 || X >= W || Z >= H) continue;
        const dx = (X / TX - cx) / rx, dz = (Z / TX - cz) / rz, dd = Math.sqrt(dx * dx + dz * dz) + (vn(X / 9, Z / 9) - 0.5) * 0.16;
        const i = (Z * W + X) * 4;
        if (dd < 0.78) set(i, dd < 0.45 ? [16, 36, 40] : [24, 56, 60]);
        else if (dd < 0.9) set(i, [60, 110, 100]);
        else if (dd < 1.05) set(i, [70, 54, 40]);
      }
    }
    ctx.putImageData(img, 0, 0);
    // pebbles, fallen leaves, glowing mushroom caps
    for (let z = 0; z < d.H; z++) for (let x = 0; x < d.W; x++) {
      if (d.g[d.I(x, z)] !== 1) continue;
      const X = x * TX, Z = z * TX;
      if (rnd() < 0.08) { const sx = X + 2 + rnd() * 10, sz = Z + 2 + rnd() * 10; p.rect(sx, sz, 2, 2, '#5a4a42'); p.px(sx, sz, '#7a6a5a'); }
      if (rnd() < 0.06) { const sx = X + 2 + rnd() * 11, sz = Z + 2 + rnd() * 11; p.rect(sx, sz, 3, 2, rnd() < 0.5 ? '#9a6a3a' : '#7a8a3a'); }
      if (near[d.I(x, z)] < 1.8 && rnd() < 0.18) { const sx = X + rnd() * 12, sz = Z + rnd() * 12; p.rect(sx, sz, 2, 1, '#8ff0d0'); p.px(sx, sz + 1, '#e8e0d0'); }
    }
  },
  buildWalls(d, walls) {
    const K = d.K, n = walls.length;
    const rockGeo = K.geo('dun-rock', () => new THREE.DodecahedronGeometry(0.72, 0));
    const rootGeo = K.geo('dun-root', () => new THREE.CylinderGeometry(0.08, 0.14, 1, 5).translate(0, -0.5, 0));
    const mats = [K.c('#5a4234'), K.c('#6a4e3a'), K.c('#4a3628')];
    const ims = mats.map((m) => { const im = new THREE.InstancedMesh(rockGeo, m, n * 2); im.castShadow = true; im.receiveShadow = true; im.count = 0; d.root.add(im); return im; });
    const roots = new THREE.InstancedMesh(rootGeo, K.c('#6a4a30'), n * 2); roots.count = 0; roots.castShadow = true; d.root.add(roots);
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
    let h = 11;
    const rnd = () => { h = (h * 1103515245 + 12345) & 0x7fffffff; return h / 0x7fffffff; };
    for (const [x, z, hgt, south] of walls) {
      const im = ims[Math.floor(rnd() * 3)];
      e.set(rnd() * 3, rnd() * 3, rnd() * 3); q.setFromEuler(e);
      p.set(x + 0.5 + (rnd() - 0.5) * 0.3, hgt * 0.42, z + 0.5 + (rnd() - 0.5) * 0.3);
      s.set(1.05 + rnd() * 0.35, hgt * (0.9 + rnd() * 0.25), 1.05 + rnd() * 0.35);
      im.setMatrixAt(im.count++, M.compose(p, q, s));
      if (hgt > 2) { p.set(x + 0.5 + (rnd() - 0.5) * 0.4, hgt * 0.95, z + 0.2); s.set(0.9 + rnd() * 0.3, 0.8, 0.9); e.set(rnd() * 3, rnd() * 3, 0); q.setFromEuler(e); im.setMatrixAt(im.count++, M.compose(p, q, s)); }
      // roots hanging over the faces that look at the camera
      if (south && rnd() < 0.55) for (let k = 0; k < 2; k++) {
        e.set((rnd() - 0.5) * 0.4, 0, (rnd() - 0.5) * 0.5); q.setFromEuler(e);
        p.set(x + 0.2 + rnd() * 0.6, hgt * (0.85 + rnd() * 0.2), z + 1.02);
        s.set(1, 0.8 + rnd() * 1.4, 1);
        roots.setMatrixAt(roots.count++, M.compose(p, q, s));
      }
    }
    for (const im of [...ims, roots]) { im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); }
  },
  dress(d) { void d; },
  // a gate of gnarled roots, bound by the gloom, that rise across the way and sink back into the ground
  gate(d, G) {
    const K = d.K, g = K.grp(d.root, G.x, 0, G.z), bars = [];
    const bark = K.c('#6a4a30'), barkD = K.c('#4e3522'), thorn = K.c('#e0d0a8'), leaf = K.c('#5a9a48'), knot = K.glow('#c89aff', '#9a5ae0', 0.9);
    const n = Math.max(4, Math.round(G.w * 2)), at = (u, y, o = 0) => (G.horiz ? [u, y, o] : [o, y, u]);
    const tilt = (o, a) => { if (G.horiz) o.rotation.z = a; else o.rotation.x = a; };
    for (let i = 0; i < n; i++) {
      const h = ((i * 7919 + 13) % 17) / 17, u = -G.w / 2 + 0.25 + (i / (n - 1)) * (G.w - 0.5), tall = 1.6 + h * 0.9;
      // a thick foot, then a thinner tip bending back the other way
      const b = K.grp(g, ...at(u, 0, (h - 0.5) * 0.35));
      tilt(b, (h - 0.5) * 0.8);
      const foot = K.put(b, K.cyl(0.12, 0.22, tall * 0.62, 6), i % 3 ? bark : barkD, 0, tall * 0.3, 0);
      const tip = K.grp(b, 0, tall * 0.58, 0);
      tilt(tip, -(h - 0.5) * 1.5 + (i % 2 ? 0.25 : -0.25));
      K.put(tip, K.cyl(0.04, 0.12, tall * 0.5, 5), i % 2 ? bark : barkD, 0, tall * 0.24, 0);
      for (let k = 0; k < 2; k++) K.put(foot, K.cone(0.05, 0.2, 4), thorn, k ? 0.15 : -0.15, -0.2 + k * 0.4, 0, 0, 0, k ? -1.3 : 1.3);
      if (i % 3 === 1) K.put(tip, K.box(0.24, 0.04, 0.14), leaf, 0.1, tall * 0.4, 0.04, 0.4, 0.3, 0);
      bars.push(b);
    }
    // two twisted roots across, the gloom’s knots where they cross
    for (const [y, r] of [[0.75, 0.11], [1.45, 0.08]]) K.put(g, K.cyl(r, r * 1.2, G.w, 6), barkD, 0, y, 0, 0, G.horiz ? 0 : Math.PI / 2, G.horiz ? Math.PI / 2 : 0);
    for (let i = 1; i < n - 1; i += 2) K.noCast(K.put(g, K.ball(0.12, 6), knot, ...at(-G.w / 2 + 0.25 + (i / (n - 1)) * (G.w - 0.5), i % 4 === 1 ? 0.75 : 1.45, 0.1)));
    K.put(g, K.box(G.horiz ? G.w : 0.6, 0.16, G.horiz ? 0.6 : G.w), barkD, 0, 0.08, 0);
    G.depth = 2.9;
    G.g = g; G.bars = bars;
  },
};

// the Frostbell Halls: gates are walls of ice blocks that sink into the snow
THEMES.ice = {
  ...THEMES.cave,
  gate(d, G) {
    const K = d.K, g = K.grp(d.root, G.x, 0, G.z), bars = [];
    const ice = [K.c('#cfeeff', { transparent: true, opacity: 0.85 }), K.c('#b0dcf4', { transparent: true, opacity: 0.85 })], rim = K.glow('#e8f8ff', '#8ad0ff', 0.4);
    const along = (u, y, o = 0) => (G.horiz ? [u, y, o] : [o, y, u]);
    const n = Math.max(2, Math.round(G.w / 1.1));
    for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) {
      const u = -G.w / 2 + (i + 0.5) * (G.w / n) + (j ? 0.25 : 0), b = K.put(g, K.box(G.horiz ? G.w / n - 0.06 : 0.7, 0.95, G.horiz ? 0.7 : G.w / n - 0.06), ice[(i + j) % 2], ...along(u, 0.48 + j * 0.96));
      bars.push(b);
    }
    for (let i = 0; i < n + 1; i++) K.noCast(K.put(g, K.cone(0.12, 0.5, 5), rim, ...along(-G.w / 2 + i * (G.w / n), 2.1)));
    G.g = g; G.bars = bars; G.depth = 2.5;
  },
  dress(d) { void d; },
};

// the Old Mine: gates are plank barricades nailed across the way (they drop into a trench)
THEMES.mine = {
  ...THEMES.cave,
  gate(d, G) {
    const K = d.K, g = K.grp(d.root, G.x, 0, G.z), bars = [];
    const plank = [K.c('#9a6a44'), K.c('#8a5a3a'), K.c('#a8784e')], post = K.c('#5a3a2a'), nail = K.c('#3a3844'), warn = K.c('#f2c14e');
    const along = (u, y, o = 0) => (G.horiz ? [u, y, o] : [o, y, u]);
    for (const u of [-G.w / 2 + 0.2, G.w / 2 - 0.2]) { const p = K.put(g, K.box(0.26, 2.2, 0.26), post, ...along(u, 1.1)); bars.push(p); }
    for (let i = 0; i < 4; i++) {
      const pl = K.put(g, K.box(G.horiz ? G.w : 0.12, 0.3, G.horiz ? 0.12 : G.w), plank[i % 3], ...along((i % 2 ? 0.1 : -0.1), 0.45 + i * 0.44, 0.12));
      if (G.horiz) pl.rotation.z = (i % 2 ? 0.08 : -0.06); else pl.rotation.x = (i % 2 ? 0.08 : -0.06);
      for (const s of [-1, 1]) K.put(g, K.box(0.05, 0.05, 0.05), nail, ...along(s * (G.w / 2 - 0.25), 0.45 + i * 0.44, 0.2));
    }
    // a cross brace and a yellow warning board
    const br = K.put(g, K.box(G.horiz ? G.w * 1.05 : 0.1, 0.22, G.horiz ? 0.1 : G.w * 1.05), plank[1], ...along(0, 1.1, 0.22));
    if (G.horiz) br.rotation.z = 0.5; else br.rotation.x = 0.5;
    K.put(g, K.box(G.horiz ? 0.7 : 0.06, 0.4, G.horiz ? 0.06 : 0.7), warn, ...along(0, 1.55, 0.28));
    K.put(g, K.box(G.horiz ? 0.5 : 0.07, 0.07, G.horiz ? 0.07 : 0.5), nail, ...along(0, 1.55, 0.3));
    G.g = g; G.bars = bars; G.depth = 2.4;
  },
  dress(d) { void d; },
};

// the Sunken Bell Temple: gates are bronze sluice grilles between weathered stone
// posts, green with verdigris (they sink into the sea floor)
THEMES.sea = {
  ...THEMES.cave,
  gate(d, G) {
    const K = d.K, g = K.grp(d.root, G.x, 0, G.z), bars = [];
    const bronze = K.c('#5a9a86'), bronzeD = K.c('#3a7a6a'), stone = K.c('#c8bca0'), weed = K.c('#4a8a4a');
    const along = (u, y, o = 0) => (G.horiz ? [u, y, o] : [o, y, u]);
    for (const u of [-G.w / 2 - 0.1, G.w / 2 + 0.1]) { const p = K.put(g, K.box(0.5, 2.6, 0.5), stone, ...along(u, 1.3)); bars.push(p); K.put(p, K.box(0.54, 0.3, 0.54), weed, 0, -0.9, 0); }
    const n = Math.max(3, Math.round(G.w * 1.6));
    for (let i = 0; i < n; i++) bars.push(K.put(g, K.box(G.horiz ? 0.12 : 0.14, 2.1, G.horiz ? 0.14 : 0.12), i % 2 ? bronze : bronzeD, ...along(-G.w / 2 + (i + 0.5) * (G.w / n), 1.05)));
    for (const y of [0.35, 1.25, 2.05]) K.put(g, K.box(G.horiz ? G.w : 0.16, 0.16, G.horiz ? 0.16 : G.w), bronzeD, ...along(0, y));
    K.put(g, K.cyl(0.26, 0.26, 0.1, 10), K.glow('#d8a84a', '#8a6a2a', 0.3), ...along(0, 1.25, 0.12), 0, Math.PI / 2, 0);
    G.g = g; G.bars = bars; G.depth = 2.5;
  },
  dress(d) { void d; },
};

// the Forge Heart: gates are iron portcullises, riveted, glowing at the seams
THEMES.forge = {
  ...THEMES.cave,
  gate(d, G) {
    const K = d.K, g = K.grp(d.root, G.x, 0, G.z), bars = [];
    const iron = K.c('#3a3438'), ironL = K.c('#5a5058'), hot = K.glow('#ff9a4a', '#ff6a1a', 0.5);
    const along = (u, y, o = 0) => (G.horiz ? [u, y, o] : [o, y, u]);
    for (const u of [-G.w / 2 - 0.1, G.w / 2 + 0.1]) bars.push(K.put(g, K.box(0.55, 2.8, 0.55), ironL, ...along(u, 1.4)));
    const n = Math.max(3, Math.round(G.w * 1.4));
    for (let i = 0; i < n; i++) bars.push(K.put(g, K.box(G.horiz ? 0.16 : 0.18, 2.3, G.horiz ? 0.18 : 0.16), iron, ...along(-G.w / 2 + (i + 0.5) * (G.w / n), 1.15)));
    for (const y of [0.5, 1.4, 2.2]) K.put(g, K.box(G.horiz ? G.w : 0.2, 0.18, G.horiz ? 0.2 : G.w), iron, ...along(0, y));
    for (let i = 0; i < n; i++) K.noCast(K.put(g, K.box(0.08, 0.08, 0.08), hot, ...along(-G.w / 2 + (i + 0.5) * (G.w / n), 1.4, 0.12)));
    G.g = g; G.bars = bars; G.depth = 2.7;
  },
  dress(d) { void d; },
};

// the Lantern Pagoda (saga/pagoda.js)
THEMES.pagoda = PAGODA_THEME;
// the Heartwood, inside the Great Tree (saga/heartwood.js): the Rootway's walls, floors in growth rings
THEMES.heartwood = { ...THEMES.roots, paintFloor: heartwoodFloor, wallH: 3.0 };
// Hollowmoor Manor (saga/manor.js): parquet, wallpaper, oak doors
THEMES.manor = MANOR_THEME;
// aboard the Gloomstage (saga/backstage.js): stage boards, velvet, curtains that rise
THEMES.backstage = BACKSTAGE_THEME;

// ======================================================================
// props: [kind, x, z, scale] in the dungeon’s local tiles
const PROPS = {
  crystal(K, g, s) {
    const m = K.glow('#9fe8ff', '#5ad0ff', 0.9);
    for (let i = 0; i < 4; i++) { const c = K.put(g, K.cone(0.16 * s, (0.7 + (i % 2) * 0.5) * s, 5), m, Math.cos(i * 1.7) * 0.3 * s, 0.35 * s, Math.sin(i * 1.7) * 0.25 * s); c.rotation.z = (i - 1.5) * 0.25; }
    return { light: { y: 0.8, color: '#7ad8ff', power: 0.9, dist: 5.5 }, r: 0.35 * s };
  },
  torch(K, g, s) {
    K.put(g, K.cyl(0.07, 0.09, 1.3, 6), K.c('#5a3b2a'), 0, 0.65, 0);
    const f = K.noCast(K.put(g, K.cone(0.16, 0.42, 6), K.glow('#ffd66b', '#ffb040', 1.3), 0, 1.5, 0));
    return { light: { y: 1.6, color: '#ffb862', power: 1.1, flicker: true, dist: 6 }, r: 0.2, anim: (tm) => { f.scale.y = 0.85 + Math.sin(tm * 13 + g.position.x) * 0.15; } };
  },
  brazier(K, g, s) {
    K.put(g, K.cyl(0.45 * s, 0.3 * s, 0.7 * s, 8), K.c('#4a4048'), 0, 0.35 * s, 0);
    const f = K.noCast(K.put(g, K.cone(0.34 * s, 0.7 * s, 7), K.glow('#ffd66b', '#ff9a3a', 1.2), 0, 0.95 * s, 0));
    return { light: { y: 1.3, color: '#ffa860', power: 1.7, flicker: true, dist: 9 }, r: 0.5 * s, anim: (tm) => { f.scale.y = 0.85 + Math.sin(tm * 11 + g.position.z) * 0.18; f.rotation.y = tm; } };
  },
  rock(K, g, s) {
    K.put(g, K.geo('dun-rock', () => new THREE.DodecahedronGeometry(0.72, 0)), K.c('#5a5462'), 0, 0.35 * s, 0).scale.set(s, s * 0.7, s);
    return { r: 0.6 * s };
  },
  shell(K, g, s) { K.put(g, K.cone(0.22 * s, 0.18 * s, 6), K.c('#f0d8c8'), 0, 0.09, 0).rotation.x = Math.PI / 2; return null; },
  barrel(K, g, s) {
    K.put(g, K.cyl(0.36 * s, 0.36 * s, 0.8 * s, 10), K.c('#8e5d3e'), 0, 0.4 * s, 0);
    for (const y of [0.15, 0.65]) K.put(g, K.cyl(0.38 * s, 0.38 * s, 0.07, 10), K.c('#3b3a46'), 0, y * s, 0);
    return { r: 0.4 * s };
  },
  candle(K, g, s) {
    const wax = K.c('#f4ead0');
    K.put(g, K.cyl(0.18 * s, 0.22 * s, 0.9 * s, 8), wax, 0, 0.45 * s, 0);
    K.put(g, K.cyl(0.3 * s, 0.34 * s, 0.1, 8), K.c('#e8d8b0'), 0, 0.05, 0);
    const f = K.noCast(K.put(g, K.cone(0.08 * s, 0.24 * s, 5), K.glow('#ffd66b', '#ffb040', 1.3), 0, 1.05 * s, 0));
    // (wax runs down it and pools at its foot)
    for (let i = 0; i < 3; i++) K.put(g, K.box(0.07 * s, (0.3 + i * 0.12) * s, 0.07 * s), wax, Math.cos(i * 2.1) * 0.2 * s, (0.6 + i * 0.08) * s, Math.sin(i * 2.1) * 0.2 * s);
    return { light: { y: 1.1 * s, color: '#ffc070', power: 1.3, flicker: true, dist: 6 }, r: 0.25 * s, anim: (tm) => { f.scale.x = 0.9 + Math.sin(tm * 17 + g.position.x) * 0.1; } };
  },
  // a stage light on a pole: a bright pool on the floor
  spot(K, g, s) {
    K.put(g, K.cyl(0.06, 0.08, 2.2, 6), K.c('#3b3440'), 0, 1.1, 0);
    const head = K.grp(g, 0, 2.2, 0);
    K.put(head, K.cyl(0.18, 0.26, 0.36, 8), K.c('#3b3440'), 0, 0, 0.1, 0, -0.9, 0);
    K.noCast(K.put(head, K.cyl(0.17, 0.17, 0.05, 8), K.glow('#fff6d8', '#ffe9a0', 1.4), 0, -0.1, 0.26, 0, -0.9, 0));
    return { light: { y: 2.1, dz: 1.2, color: '#fff0c8', power: 1.6, dist: 8 }, r: 0.2 };
  },
  // a makeshift stage: planks on crates, a red curtain on two poles
  stageboards(K, g, s) {
    const wood = K.c('#9a6a44'), dark = K.c('#6b4330'), red = K.c('#b8303e'), redD = K.c('#861f2c');
    K.put(g, K.box(9 * s, 0.14, 3.4), wood, 0, 0.07, 0);
    for (let x = -4; x <= 4; x += 1) K.put(g, K.box(0.05, 0.15, 3.4), dark, x * s, 0.07, 0);
    for (const sx of [-1, 1]) { K.put(g, K.box(0.18, 3.2, 0.18), dark, sx * 4.4 * s, 1.6, -1.6); }
    K.put(g, K.box(9 * s, 0.16, 0.2), dark, 0, 3.2, -1.6);
    for (let i = 0; i < 9; i++) K.put(g, K.box(0.9 * s, 2.9, 0.12), i % 2 ? red : redD, (-4 + i) * s, 1.7, -1.62);
    return { r: 0 };
  },
  // glowworms: a cluster of little lights on threads from the roof
  glowworms(K, g, s) {
    const m = K.glow('#c8ffe8', '#6af0b0', 1.4), bits = [];
    for (let i = 0; i < 7; i++) { const a = i * 2.4, r = 0.2 + (i % 3) * 0.18, hh = 2.1 + (i % 4) * 0.25; K.put(g, K.box(0.015, 3.2 - hh, 0.015), K.c('#c8d8c8'), Math.cos(a) * r, (3.2 + hh) / 2, Math.sin(a) * r); bits.push(K.noCast(K.put(g, K.ball(0.07 * s, 5), m, Math.cos(a) * r, hh, Math.sin(a) * r))); }
    return { light: { y: 2.3, color: '#8af4c8', power: 1.5, dist: 8.5 }, anim: (tm) => { bits.forEach((b, i) => { b.position.y += Math.sin(tm * 1.3 + i) * 0.002; }); } };
  },
  // glowing mushrooms, teal & violet
  shroom(K, g, s) {
    const caps = [K.glow('#8ff0e0', '#4ad0c0', 0.9), K.glow('#d8b0ff', '#a86ae0', 0.9)];
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1, r = i ? 0.28 : 0, k = (i ? 0.6 : 1) * s;
      K.put(g, K.cyl(0.06 * k, 0.08 * k, 0.5 * k, 6), K.c('#e8e0d0'), Math.cos(a) * r, 0.25 * k, Math.sin(a) * r);
      K.noCast(K.put(g, K.ball(0.24 * k, 6), caps[i % 2], Math.cos(a) * r, 0.52 * k, Math.sin(a) * r)).scale.y = 0.5;
    }
    return { light: { y: 0.8, color: '#8ff0e0', power: 1.1, dist: 5.5 }, r: 0.25 * s };
  },
  // great gnarled roots arching out of the ground (walk under them), moss on their backs
  roots(K, g, s, d) {
    const m = K.c('#6a4a30'), mD = K.c('#523826'), moss = K.c('#6aa04a');
    const arch = (R, tube) => K.geo(`dun-arch${R},${tube}`, () => new THREE.TorusGeometry(R, tube, 6, 12, Math.PI));
    [[1.15, 0.22, 0, 0, 0.35, m], [0.8, 0.17, 0.75, 0.45, -0.55, mD], [0.55, 0.13, -0.9, -0.35, 1.1, m]].forEach(([R, tb, x, z, ry, mat]) => {
      const a = K.put(g, arch(R * s, tb * s), mat, x * s, -0.12 * s, z * s, ry);
      K.put(a, K.ball(tb * s * 1.3, 5), moss, 0, R * s + tb * s * 0.4, 0).scale.set(1.3, 0.5, 1);
    });
    // (under a roof, they come out of the wall instead: a few thick ones leaning)
    if (!d || !d.outdoor) for (let i = 0; i < 2; i++) { const b = K.put(g, K.cyl(0.18 * s, 0.26 * s, 2.2 * s, 6), m, (i - 0.5) * 0.9 * s, 0.8 * s, -0.3 * s); b.rotation.z = (i - 0.5) * 0.7; b.rotation.x = 0.3; }
    return { r: 0.3 * s };
  },
  // the curtain of the falls, seen from behind: white water streaming down, spray at its foot
  falls(K, g, s) {
    const m = K.glow('#dff4ff', '#a8d8ff', 0.35), streaks = [];
    for (let i = 0; i < 14; i++) { const b = K.noCast(K.put(g, K.box(0.18, 2.8, 0.06), m, -3 + i * 0.46 * s, 1.4, 0)); streaks.push(b); }
    return { light: { y: 1.5, color: '#bfe8ff', power: 0.8, dist: 6 }, anim: (tm) => { streaks.forEach((b, i) => { b.scale.y = 0.9 + Math.sin(tm * 9 + i * 1.7) * 0.1; b.position.y = 1.4 + Math.sin(tm * 12 + i) * 0.05; }); } };
  },
  // bones & shiny things in a badger’s hoard
  hoard(K, g, s) {
    const bone = K.c('#e8dcc8'), shine = K.glow('#ffe89a', '#ffc94a', 0.6);
    for (let i = 0; i < 5; i++) { const b = K.put(g, K.box(0.5 * s, 0.08, 0.08), bone, Math.cos(i * 1.3) * 0.5, 0.06, Math.sin(i * 1.3) * 0.4); b.rotation.y = i; }
    for (let i = 0; i < 6; i++) K.noCast(K.put(g, K.ball(0.07, 5), shine, Math.cos(i * 2) * 0.4, 0.08, Math.sin(i * 2) * 0.35));
    return { r: 0.6 * s };
  },
  // a stack of logs at the top of the slope
  logpile(K, g, s) {
    const m = K.c('#7a5a3a'), end = K.c('#c8a070');
    for (let i = 0; i < 5; i++) { const y = i < 3 ? 0.35 : 1.0, x = (i < 3 ? i - 1 : i - 3.5) * 0.9; K.put(g, K.cyl(0.4, 0.4, 3 * s, 8), [m, end, end], x, y, 0, 0, 0, Math.PI / 2); }
    return { r: 1.4 * s };
  },
  // the Deepwood’s Great Hearth: a ring of old stones in the roots, a flame waiting
  hearth(K, g, s) {
    const stone = K.c('#8a8290');
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; K.put(g, K.box(0.5, 0.4, 0.4), stone, Math.cos(a) * 0.9 * s, 0.2, Math.sin(a) * 0.9 * s, a); }
    const f = K.noCast(K.put(g, K.cone(0.4 * s, 1.1 * s, 7), K.glow('#b8ffd0', '#6af0a0', 0.9), 0, 0.6 * s, 0));
    return { light: { y: 1.2, color: '#8ff0c0', power: 1.2, dist: 7 }, r: 1.1 * s, anim: (tm) => { f.scale.y = 0.8 + Math.sin(tm * 6) * 0.15; f.rotation.y = tm * 0.8; } };
  },
  // ---- outdoors (instances under the open sky)
  // fireflies (or pollen in the sun): a few motes drifting round a spot
  fireflies(K, g, s) {
    const m = K.glow('#fff4b0', '#ffe070', 1.2), bits = [];
    for (let i = 0; i < 6; i++) bits.push(K.noCast(K.put(g, K.ball(0.05 * s, 4), m, 0, 1, 0)));
    return { anim: (tm) => bits.forEach((b, i) => { const a = tm * (0.4 + i * 0.07) + i * 2.1; b.position.set(Math.cos(a) * (0.6 + (i % 3) * 0.3) * s, 0.9 + Math.sin(tm * 1.1 + i) * 0.35 + (i % 2) * 0.5, Math.sin(a * 1.3) * 0.5 * s); }) };
  },
  // a badger burrow: a mound of turned earth round a dark hole
  burrow(K, g, s) {
    const earth = K.c('#8a6448'), earthD = K.c('#6a4a34');
    K.put(g, K.ball(0.9 * s, 8), earth, 0, 0, 0).scale.set(1, 0.42, 0.8);
    K.put(g, K.cyl(0.32 * s, 0.36 * s, 0.1, 10), K.c('#1e1612'), 0, 0.3 * s, 0.52 * s, 0, 1.15, 0);
    for (let i = 0; i < 5; i++) K.put(g, K.box(0.18 * s, 0.1, 0.16 * s), earthD, Math.cos(i * 1.4) * 1.0 * s, 0.05, 0.6 * s + Math.sin(i * 1.4) * 0.3 * s, i, 0, 0);
    return { r: 0.75 * s };
  },
  // a fallen log, moss on its back
  log(K, g, s) {
    K.put(g, K.cyl(0.32 * s, 0.36 * s, 2.4 * s, 8), [K.c('#6e5038'), K.c('#c8a070'), K.c('#c8a070')], 0, 0.32 * s, 0, 0.3, 0, Math.PI / 2);
    K.put(g, K.box(1.6 * s, 0.1, 0.34 * s), K.c('#5a9a48'), -0.1, 0.64 * s, 0, 0.3, 0, 0);
    return { r: 0.55 * s };
  },
  // an old stump, its rings showing
  stump(K, g, s) {
    K.put(g, K.cyl(0.42 * s, 0.55 * s, 0.6 * s, 9), K.c('#6e5038'), 0, 0.3 * s, 0);
    K.put(g, K.cyl(0.4 * s, 0.4 * s, 0.04, 9), K.c('#d8b888'), 0, 0.61 * s, 0);
    K.put(g, K.cyl(0.24 * s, 0.24 * s, 0.05, 9), K.c('#b8905e'), 0, 0.62 * s, 0);
    return { r: 0.5 * s };
  },
  // mossy standing stones
  stones(K, g, s) {
    const st = [K.c('#8a8a86'), K.c('#9a9a92')], moss = K.c('#6aa04a');
    [[-0.7, 1.3, 0.2], [0.1, 1.7, -0.3], [0.8, 1.1, 0.3]].forEach(([x, h, z], i) => { const b = K.put(g, K.box(0.5 * s, h * s, 0.4 * s), st[i % 2], x * s, h * s / 2, z * s); b.rotation.set(0, i * 0.5, (i - 1) * 0.08); K.put(b, K.box(0.52, 0.12, 0.42), moss, 0, 0.45, 0); });
    return { r: 0.9 * s };
  },
  // a clump of wildflowers (walk right through)
  flowers(K, g, s) {
    const cols = [K.c('#f2c14e'), K.c('#e87a9a'), K.c('#f4f0e8'), K.c('#9a8ae0')], stem = K.c('#4e8a3e');
    for (let i = 0; i < 9; i++) { const a = i * 2.4, r = (0.15 + (i % 4) * 0.2) * s, h = 0.25 + (i % 3) * 0.1; K.put(g, K.box(0.03, h, 0.03), stem, Math.cos(a) * r, h / 2, Math.sin(a) * r); K.noCast(K.put(g, K.ball(0.07, 5), cols[i % 4], Math.cos(a) * r, h + 0.03, Math.sin(a) * r)); }
    return null;
  },
  // ---- the Frostbell Halls
  // a cluster of ice crystals, catching the light
  iceshard(K, g, s) {
    const m = [K.glow('#dff4ff', '#8ad0ff', 0.45), K.glow('#c8ecff', '#6ab8f0', 0.45)];
    for (let i = 0; i < 5; i++) { const c = K.put(g, K.cone(0.2 * s, (0.9 + (i % 3) * 0.5) * s, 5), m[i % 2], Math.cos(i * 1.6) * 0.35 * s, (0.45 + (i % 3) * 0.25) * s, Math.sin(i * 1.6) * 0.3 * s); c.rotation.z = (i - 2) * 0.22; c.rotation.x = (i % 2 ? 0.2 : -0.15); }
    return { r: 0.45 * s };
  },
  // a snowman (somebody was having fun up here), a carrot nose, a little scarf
  snowman(K, g, s) {
    const snow = K.c('#f4f8ff');
    K.put(g, K.ball(0.5 * s, 10, 8), snow, 0, 0.45 * s, 0);
    K.put(g, K.ball(0.36 * s, 10, 8), snow, 0, 1.1 * s, 0);
    K.put(g, K.ball(0.26 * s, 10, 8), snow, 0, 1.6 * s, 0);
    K.put(g, K.cone(0.05 * s, 0.26 * s, 6), K.c('#f08a3a'), 0, 1.6 * s, 0.34 * s, 0, Math.PI / 2);
    for (const x of [-0.09, 0.09]) K.put(g, K.box(0.05, 0.05, 0.03), K.c('#2a2630'), x * s, 1.68 * s, 0.24 * s);
    K.put(g, K.cyl(0.3 * s, 0.3 * s, 0.1, 10), K.c('#c8383e'), 0, 1.36 * s, 0);
    K.put(g, K.box(0.1, 0.35, 0.05), K.c('#c8383e'), 0.18 * s, 1.2 * s, 0.26 * s);
    return { r: 0.5 * s };
  },
  // strings of little flags between two poles, snapping in the wind
  flags(K, g, s) {
    const cols = [K.c('#c8383e'), K.c('#f2c14e'), K.c('#3f6fae'), K.c('#62c46c'), K.c('#f4f0e8')];
    for (const x of [-1.8, 1.8]) K.put(g, K.box(0.08, 2.2, 0.08), K.c('#6a4a34'), x * s, 1.1, 0);
    const fl = [];
    for (let i = 0; i < 9; i++) { const u = -1.6 + i * 0.4; const f = K.put(g, K.box(0.24, 0.28, 0.02), cols[i % 5], u * s, 1.95 - Math.sin(((i + 0.5) / 9) * Math.PI) * 0.35, 0); fl.push(f); }
    return { r: 0, anim: (tm) => fl.forEach((f, i) => { f.rotation.y = Math.sin(tm * 5 + i) * 0.5; }) };
  },
  // the King’s crown on a pedestal of ice, its Ember Pearl glowing
  crownstand(K, g, s) {
    K.put(g, K.cyl(0.55, 0.7, 1.0, 8), K.c('#cfeeff', { transparent: true, opacity: 0.9 }), 0, 0.5, 0);
    const c = K.grp(g, 0, 1.15, 0);
    K.put(c, K.cyl(0.32, 0.36, 0.26, 10), K.glow('#f2c14e', '#c89020', 0.35), 0, 0, 0);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; K.put(c, K.cone(0.07, 0.2, 4), K.glow('#f2c14e', '#c89020', 0.35), Math.cos(a) * 0.3, 0.2, Math.sin(a) * 0.3); }
    const pearl = K.noCast(K.put(c, K.ball(0.13, 8, 6), K.glow('#ffe8c8', '#ff9a6a', 1.2), 0, 0.08, 0.33));
    return { light: { y: 1.4, color: '#ffb890', power: 1.2, dist: 7 }, r: 0.7, anim: (tm) => { c.rotation.y = tm * 0.6; pearl.scale.setScalar(1 + Math.sin(tm * 3) * 0.1); } };
  },
  // ---- the quarry (the Old Mine)
  // the foreman’s shack: planks, a tin roof, a lamp in the window, a sign
  shack(K, g, s) {
    const plank = K.c('#9a6a44'), dark = K.c('#6a4a34'), tin = K.c('#8a8a92');
    K.put(g, K.box(2.6 * s, 1.8 * s, 2 * s), plank, 0, 0.9 * s, 0);
    for (let i = 0; i < 5; i++) K.put(g, K.box(0.04, 1.8 * s, 0.02), dark, -1.1 * s + i * 0.55 * s, 0.9 * s, 1.01 * s);
    const roof = K.put(g, K.box(3 * s, 0.1, 2.5 * s), tin, 0, 1.95 * s, 0.1); roof.rotation.x = 0.12;
    K.put(g, K.box(0.7 * s, 1.2 * s, 0.06), dark, -0.6 * s, 0.6 * s, 1.03 * s);
    K.noCast(K.put(g, K.box(0.6, 0.45, 0.04), K.glow('#ffe8a0', '#ffc860', 0.7), 0.6 * s, 1.1 * s, 1.03 * s));
    K.put(g, K.box(1.0, 0.3, 0.05), K.c('#f2c14e'), 0, 1.7 * s, 1.06 * s);
    return { r: 1.3 * s, light: { y: 1.2, dz: 1.3, color: '#ffc870', power: 0.8, dist: 5 } };
  },
  // a heap of rock and rubble, a glint of ore in it
  orepile(K, g, s) {
    const r = [K.c('#8a8290'), K.c('#9a7a6a'), K.c('#7a6a6a')];
    for (let i = 0; i < 9; i++) { const a = i * 2.3, d = (i % 3) * 0.35; K.put(g, K.ball((0.5 - (i % 3) * 0.1) * s, 5), r[i % 3], Math.cos(a) * d * s, (0.3 + (i < 3 ? 0.35 : 0)) * s, Math.sin(a) * d * s).scale.y = 0.7; }
    K.noCast(K.put(g, K.cone(0.1, 0.3, 5), K.glow('#f2e08a', '#e0b030', 0.8), 0.2 * s, 0.8 * s, 0.1));
    return { r: 0.8 * s };
  },
  // barrels, one tipped over
  barrels(K, g, s) {
    const b = K.c('#8e5d3e'), band = K.c('#3b3a46');
    for (const [x, z] of [[0, 0], [0.7, 0.2]]) { K.put(g, K.cyl(0.32 * s, 0.32 * s, 0.75 * s, 10), b, x * s, 0.37 * s, z * s); K.put(g, K.cyl(0.34 * s, 0.34 * s, 0.06, 10), band, x * s, 0.6 * s, z * s); }
    K.put(g, K.cyl(0.3 * s, 0.3 * s, 0.7 * s, 10), b, -0.5 * s, 0.3 * s, 0.6 * s, 0.4, 0, Math.PI / 2);
    return { r: 0.6 * s };
  },
  // a timber mine portal: two posts and a lintel, a lantern hung under it
  timber(K, g, s) {
    const wood = K.c('#6a4a34');
    for (const x of [-1.4, 1.4]) K.put(g, K.box(0.3, 2.4 * s, 0.3), wood, x * s, 1.2 * s, 0);
    K.put(g, K.box(3.3 * s, 0.34, 0.36), wood, 0, 2.45 * s, 0);
    K.put(g, K.box(0.05, 0.4, 0.05), K.c('#3a3844'), 0, 2.1 * s, 0.1);
    K.noCast(K.put(g, K.box(0.18, 0.24, 0.18), K.glow('#fff0b0', '#ffd66b', 1.2), 0, 1.85 * s, 0.1));
    return { light: { y: 1.8, color: '#ffc870', power: 1, dist: 6 } };
  },
  // an ore cart on a short length of rails, heaped with rock and a glint of crystal
  orecart(K, g, s) {
    const iron = K.c('#3a3844'), wood = K.c('#7a5a44'), rail = K.c('#9a96a0');
    for (const x of [-0.45, 0.45]) K.put(g, K.box(0.08, 0.06, 2.4 * s), rail, x, 0.03, 0);
    for (let i = -2; i <= 2; i++) K.put(g, K.box(1.2, 0.05, 0.16), K.c('#6a4a34'), 0, 0.02, i * 0.5 * s);
    K.put(g, K.box(1.0, 0.55, 1.3), wood, 0, 0.5, 0);
    for (const z of [-0.55, 0.55]) K.put(g, K.box(1.05, 0.1, 0.08), iron, 0, 0.74, z);
    for (let i = 0; i < 5; i++) K.put(g, K.ball(0.22, 5), K.c('#8a8290'), -0.3 + (i % 3) * 0.3, 0.84, -0.3 + Math.floor(i / 3) * 0.5);
    K.noCast(K.put(g, K.cone(0.1, 0.32, 5), K.glow('#9fe8ff', '#5ad0ff', 0.9), 0.1, 1.0, 0.1));
    for (const x of [-0.42, 0.42]) for (const z of [-0.4, 0.4]) K.put(g, K.cyl(0.16, 0.16, 0.1, 10), iron, x, 0.18, z, 0, 0, Math.PI / 2);
    return { r: 0.7 * s };
  },
  // a length of rails (north–south), sleepers under them
  rails(K, g, s) {
    const rail = K.c('#9a96a0'), tie = K.c('#6a4a34');
    for (const x of [-0.45, 0.45]) K.put(g, K.box(0.08, 0.06, 4 * s), rail, x, 0.03, 0);
    for (let i = 0; i < Math.round(8 * s); i++) K.put(g, K.box(1.2, 0.05, 0.16), tie, 0, 0.02, -2 * s + 0.25 + i * 0.5);
    return null;
  },
  // a stack of crates, one of them dynamite
  crates(K, g, s) {
    const w = [K.c('#a8784e'), K.c('#8a5a3a')];
    K.put(g, K.box(0.8, 0.8, 0.8), w[0], 0, 0.4, 0);
    K.put(g, K.box(0.7, 0.7, 0.7), w[1], 0.75, 0.35, 0.1, 0.3);
    K.put(g, K.box(0.6, 0.6, 0.6), w[0], 0.2, 1.1, 0, 0.5);
    K.put(g, K.box(0.3, 0.3, 0.02), K.c('#d8483a'), 0.75, 0.38, 0.46, 0.3);
    return { r: 0.7 * s };
  },
  // a crate of dynamite, sticks poking out
  tnt(K, g, s) {
    K.put(g, K.box(0.9, 0.5, 0.6), K.c('#a8784e'), 0, 0.25, 0);
    for (let i = 0; i < 6; i++) K.put(g, K.box(0.11, 0.4, 0.11), K.c('#d8483a'), -0.3 + (i % 3) * 0.3, 0.55, -0.12 + Math.floor(i / 3) * 0.24, 0, (i - 2.5) * 0.08, 0);
    K.put(g, K.box(0.5, 0.2, 0.02), K.c('#f2c14e'), 0, 0.28, 0.31);
    return { r: 0.55 * s };
  },
  // a miner’s lamp on a pole
  lampost(K, g, s) {
    K.put(g, K.box(0.1, 2.2, 0.1), K.c('#5a3a2a'), 0, 1.1, 0);
    K.put(g, K.box(0.5, 0.08, 0.08), K.c('#5a3a2a'), 0.2, 2.15, 0);
    K.put(g, K.box(0.2, 0.28, 0.2), K.c('#3a3844'), 0.4, 1.9, 0);
    K.noCast(K.put(g, K.box(0.14, 0.2, 0.14), K.glow('#fff0b0', '#ffd66b', 1.2), 0.4, 1.9, 0));
    return { light: { y: 1.9, dx: 0.4, color: '#ffc870', power: 1.1, dist: 6 }, r: 0.15 };
  },
  // a wooden derrick crane with a bucket on its rope
  derrick(K, g, s) {
    const wood = K.c('#7a5a44'), rope = K.c('#d8c8a0');
    for (const [x, z] of [[-0.6, -0.4], [0.6, -0.4], [0, 0.6]]) { const leg = K.put(g, K.box(0.14, 3.6 * s, 0.14), wood, x * 0.5, 1.7 * s, z * 0.5); leg.rotation.set(z * -0.18, 0, x * 0.18); }
    const arm = K.put(g, K.box(0.14, 0.14, 3.2 * s), wood, 0, 3.3 * s, 1.1 * s); arm.rotation.x = -0.25;
    K.put(g, K.box(0.03, 1.4 * s, 0.03), rope, 0, 2.6 * s, 2.5 * s);
    K.put(g, K.cyl(0.3, 0.24, 0.4, 8), K.c('#3a3844'), 0, 1.8 * s, 2.5 * s);
    return { r: 0.6 * s };
  },
  // a saguaro, arms up
  cactus(K, g, s) {
    const c = K.c('#5a9a4a'), cD = K.c('#4a823e');
    K.put(g, K.cyl(0.2 * s, 0.24 * s, 1.8 * s, 8), c, 0, 0.9 * s, 0);
    for (const sx of [-1, 1]) { K.put(g, K.box(0.34 * s, 0.14 * s, 0.16 * s), cD, sx * 0.3 * s, (0.8 + (sx > 0 ? 0.3 : 0)) * s, 0); K.put(g, K.cyl(0.13 * s, 0.14 * s, 0.6 * s, 7), c, sx * 0.46 * s, (1.05 + (sx > 0 ? 0.3 : 0)) * s, 0); }
    return { r: 0.3 * s };
  },
  // the Steppe’s Hearthstone in its ore cart: a great stone burning green and gold
  hearthstone(K, g, s) {
    K.put(g, K.box(1.3, 0.6, 1.5), K.c('#7a5a44'), 0, 0.45, 0);
    for (const x of [-0.5, 0.5]) for (const z of [-0.5, 0.5]) K.put(g, K.cyl(0.18, 0.18, 0.1, 10), K.c('#3a3844'), x, 0.18, z, 0, 0, Math.PI / 2);
    const st = K.noCast(K.put(g, K.ball(0.6 * s, 6), K.glow('#b8e89a', '#4ab870', 0.55), 0, 1.15, 0));
    for (let i = 0; i < 5; i++) K.noCast(K.put(st, K.box(0.14, 0.5, 0.14), K.glow('#f2e08a', '#e0b030', 0.8), Math.cos(i * 1.26) * 0.5, 0.1 + (i % 2) * 0.2, Math.sin(i * 1.26) * 0.5, i, 0.4, 0));
    return { light: { y: 1.6, color: '#b8ffb0', power: 1.4, dist: 8 }, r: 0.9 * s, anim: (tm) => { st.rotation.y = tm * 0.5; st.scale.setScalar(1 + Math.sin(tm * 3) * 0.04); } };
  },
  pedestal(K, g, s) {
    K.put(g, K.cyl(0.5 * s, 0.62 * s, 0.9 * s, 8), K.c('#8a8290'), 0, 0.45 * s, 0);
    K.put(g, K.cyl(0.62 * s, 0.62 * s, 0.12, 8), K.c('#a8a0ac'), 0, 0.95 * s, 0);
    return { r: 0.55 * s };
  },
  // ---- the Sunken Bell Temple
  // a fluted column, broken off (its drum lies beside it), weed round its foot
  column(K, g, s) {
    const st = K.c('#d8ccb0'), stD = K.c('#b8ac90'), weed = K.c('#4a8a4a');
    const h = (1.6 + (Math.abs(g.position.x * 7 + g.position.z * 3) % 3) * 0.6) * s;
    K.put(g, K.box(0.95 * s, 0.24, 0.95 * s), stD, 0, 0.12, 0);
    const c = K.put(g, K.cyl(0.36 * s, 0.4 * s, h, 8), st, 0, 0.24 + h / 2, 0);
    for (let i = 0; i < 4; i++) K.put(c, K.box(0.06, h * 0.96, 0.06), stD, Math.cos(i * 1.57 + 0.4) * 0.37 * s, 0, Math.sin(i * 1.57 + 0.4) * 0.37 * s);
    K.put(g, K.cyl(0.4 * s, 0.4 * s, 0.7 * s, 8), st, 0.9 * s, 0.36 * s, 0.3 * s, 0.4, 0, Math.PI / 2);
    K.put(g, K.box(1.1 * s, 0.14, 1.1 * s), weed, 0, 0.05, 0);
    return { r: 0.5 * s };
  },
  // a branching coral, pink or orange
  coral(K, g, s) {
    const m = (Math.abs(g.position.x + g.position.z * 3) % 2) ? K.c('#f08a7a') : K.c('#f0a860');
    for (let i = 0; i < 6; i++) { const a = i * 1.1, h = (0.5 + (i % 3) * 0.3) * s; const b = K.put(g, K.cyl(0.07 * s, 0.1 * s, h, 5), m, Math.cos(a) * 0.25 * s, h / 2, Math.sin(a) * 0.2 * s); b.rotation.z = Math.cos(a) * 0.4; b.rotation.x = Math.sin(a) * 0.4; K.noCast(K.put(b, K.ball(0.09 * s, 5), m, 0, h / 2, 0)); }
    return null;
  },
  // kelp swaying in the shallows
  kelp(K, g, s) {
    const m = [K.c('#4a9a5a'), K.c('#5aaa6a')], blades = [];
    for (let i = 0; i < 5; i++) { const b = K.grp(g, Math.cos(i * 1.3) * 0.3 * s, 0, Math.sin(i * 1.3) * 0.25 * s); K.put(b, K.box(0.14, 1.2 * s, 0.05), m[i % 2], 0, 0.6 * s, 0); blades.push(b); }
    return { anim: (tm) => blades.forEach((b, i) => { b.rotation.z = Math.sin(tm * 1.4 + i) * 0.18; }) };
  },
  // (M14) a school of little silver fish circling in a pool
  fishschool(K, g, s) {
    const cols = [K.glow('#c8e0f0', '#6a9ac8', 0.3), K.glow('#f0c878', '#c8904a', 0.3)], fish = [];
    for (let i = 0; i < 7; i++) {
      const f = K.grp(g, 0, 0, 0), c = cols[i % 5 === 0 ? 1 : 0];
      K.noCast(K.put(f, K.box(0.1, 0.12, 0.3), c, 0, 0, 0));
      K.noCast(K.put(f, K.cone(0.08, 0.14, 3), c, 0, 0, -0.2, 0, -Math.PI / 2));
      fish.push({ f, r: (1 + (i % 3) * 0.35) * s, y: 0.14 + (i % 3) * 0.05, ph: i * 0.9, sp: 0.6 + (i % 3) * 0.15 });
    }
    return { anim: (tm) => fish.forEach((q) => { const a = tm * q.sp + q.ph; q.f.position.set(Math.cos(a) * q.r, q.y + Math.sin(tm * 2 + q.ph) * 0.08, Math.sin(a) * q.r * 0.8); q.f.rotation.y = -a; }) };
  },
  // (M14) light through the water above, rippling on the floor
  caustics(K, g, s) {
    const m = K.light('#bfefff', 0.1), blobs = [];
    for (let i = 0; i < 6; i++) { const b = K.noCast(K.put(g, K.cyl(0.6 * s, 0.6 * s, 0.01, 10), m, 0, 0.03 + i * 0.002, 0)); blobs.push({ b, ph: i * 1.7 }); }
    return { anim: (tm) => blobs.forEach((q) => { q.b.position.x = Math.sin(tm * 0.4 + q.ph) * 1.8 * s; q.b.position.z = Math.cos(tm * 0.33 + q.ph * 1.3) * 1.4 * s; const k = 0.7 + Math.sin(tm * 1.1 + q.ph) * 0.35; q.b.scale.set(k, 1, k * 0.8); }) };
  },
  // an amphora, half sunk in the sand
  urn(K, g, s) {
    const c = K.c('#c87a4a');
    const u = K.grp(g, 0, 0, 0, 0.3); u.rotation.z = 0.35;
    K.put(u, K.ball(0.36 * s, 8, 6), c, 0, 0.32 * s, 0).scale.y = 1.3;
    K.put(u, K.cyl(0.1 * s, 0.14 * s, 0.34 * s, 8), c, 0, 0.8 * s, 0);
    for (const sx of [-1, 1]) K.put(u, K.box(0.05, 0.28 * s, 0.05), c, sx * 0.2 * s, 0.72 * s, 0).rotation.z = sx * 0.5;
    return { r: 0.35 * s };
  },
  // a weathered statue of a lamp-bearer, arm raised (its lamp long dark)
  statue(K, g, s) {
    const st = K.c('#b8b4a0'), stD = K.c('#98947e'), weed = K.c('#5a9a5a');
    K.put(g, K.box(1.1 * s, 0.6 * s, 1.1 * s), stD, 0, 0.3 * s, 0);
    K.put(g, K.box(0.7 * s, 1.1 * s, 0.5 * s), st, 0, 1.15 * s, 0);
    K.put(g, K.ball(0.3 * s, 7, 5), st, 0, 1.95 * s, 0);
    const arm = K.put(g, K.box(0.16 * s, 0.8 * s, 0.16 * s), st, 0.42 * s, 1.95 * s, 0); arm.rotation.z = -0.35;
    K.put(g, K.box(0.26 * s, 0.26 * s, 0.26 * s), stD, 0.58 * s, 2.4 * s, 0);
    K.put(g, K.box(1.14 * s, 0.14, 1.14 * s), weed, 0, 0.62 * s, 0);
    return { r: 0.6 * s };
  },
  // a giant clam, just a little open
  clam(K, g, s) {
    const sh = K.c('#c8b8e0'), shD = K.c('#a898c8');
    K.put(g, K.ball(0.55 * s, 10, 6), shD, 0, 0.2 * s, 0).scale.set(1, 0.4, 0.8);
    const top = K.put(g, K.ball(0.55 * s, 10, 6), sh, 0, 0.32 * s, -0.05); top.scale.set(1, 0.35, 0.8); top.rotation.x = -0.25;
    K.noCast(K.put(g, K.ball(0.12 * s, 6, 4), K.glow('#fff8f0', '#ffe8c8', 0.8), 0, 0.28 * s, 0.2 * s));
    return { r: 0.55 * s };
  },
  // ---- the Forge Heart
  // an old smith’s anvil on a stump of basalt
  anvil(K, g, s) {
    const iron = K.c('#4a4450'), ironL = K.c('#6a6470');
    K.put(g, K.box(0.6 * s, 0.5 * s, 0.6 * s), K.c('#3a3438'), 0, 0.25 * s, 0);
    K.put(g, K.box(0.34 * s, 0.26 * s, 0.3 * s), iron, 0, 0.62 * s, 0);
    K.put(g, K.box(0.9 * s, 0.2 * s, 0.4 * s), ironL, 0, 0.84 * s, 0);
    K.put(g, K.cone(0.14 * s, 0.34 * s, 5), ironL, 0.58 * s, 0.84 * s, 0).rotation.z = -Math.PI / 2;
    return { r: 0.45 * s };
  },
  // a squat furnace, its mouth glowing
  furnace(K, g, s) {
    const brick = K.c('#6a3a2a'), brickD = K.c('#4a2a20');
    K.put(g, K.box(1.3 * s, 1.4 * s, 1.1 * s), brick, 0, 0.7 * s, 0);
    K.put(g, K.box(1.4 * s, 0.14, 1.2 * s), brickD, 0, 1.4 * s, 0);
    K.put(g, K.cyl(0.26 * s, 0.32 * s, 1.1 * s, 8), brickD, 0.3 * s, 2.0 * s, -0.2 * s);
    const mouth = K.noCast(K.put(g, K.box(0.6 * s, 0.5 * s, 0.05), K.glow('#ffb070', '#ff6a1a', 1.2), 0, 0.5 * s, 0.56 * s));
    return { r: 0.7 * s, light: { y: 0.8, dz: 0.8, color: '#ff9a4a', power: 1.2, dist: 6, flicker: true }, anim: (tm) => { mouth.material.emissiveIntensity = 1 + Math.sin(tm * 9) * 0.25; } };
  },
  // a ruined arch of two posts and a broken lintel
  arch(K, g, s) {
    const st = K.c('#d0c4a8'), stD = K.c('#b0a488');
    for (const x of [-1.3, 1.3]) K.put(g, K.box(0.6 * s, 2.8 * s, 0.6 * s), st, x * s, 1.4 * s, 0);
    const l = K.put(g, K.box(2.2 * s, 0.5 * s, 0.7 * s), stD, -0.3 * s, 3.0 * s, 0); l.rotation.z = 0.12;
    return null;
  },
};

Object.assign(PROPS, PAGODA_PROPS, HEARTWOOD_PROPS, MANOR_PROPS, BACKSTAGE_PROPS);

export { ROOM_KINDS, PROPS, THEMES };
