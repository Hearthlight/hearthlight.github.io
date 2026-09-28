// Vehicles for the big world, boarded & left from the phones (A near one to
// hop in, B to get out). Simple physics, lots of fun:
//  rowboat   — two rowers tap A; stroke together for a big "in sync!" surge
//  sailboat  — the whole crew; the captain steers, the others trim the sail
//  minecart  — rattles along the Red Canyon's rails between the mine & the gulch
//  glider    — launch off the Windy Heights' cliffs, ride warm air up
//  sled      — whoosh down the glacier runs, steer around the trees
//  balloon   — floats between the Balloon Station & the Cloud Isles
//  zipline   — a quick slide down a cable

import { THREE, toon } from '../render/r3d.js';
import { TT } from '../world/tiles.js';
import { audio } from '../engine/audio.js';
import { t } from '../i18n.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

export const VEHICLES = {
  rowboat: { name: 'Rowboat', seats: [[-0.36, 0.25, 0.1], [0.36, 0.25, 0.1]], reach: 1.9 },
  sailboat: { name: 'Sailboat', seats: [[0, 0.32, 1.3], [-0.45, 0.32, 0.5], [0.45, 0.32, 0.5], [-0.45, 0.32, -0.3], [0.45, 0.32, -0.3], [-0.45, 0.32, -1.1], [0.45, 0.32, -1.1], [0, 0.32, -1.7]], reach: 2.6 },
  minecart: { name: 'Minecart', seats: [[-0.22, 0.36, 0], [0.22, 0.36, 0]], reach: 1.6 },
  glider: { name: 'Glider', seats: [[0, -0.9, 0]], reach: 1.8 },
  sled: { name: 'Sled', seats: [[0, 0.2, -0.15], [0, 0.2, 0.45]], reach: 1.5 },
  balloon: { name: 'Balloon', seats: [[-0.35, 0.1, -0.35], [0.35, 0.1, -0.35], [-0.35, 0.1, 0.35], [0.35, 0.1, 0.35], [0, 0.1, 0]], reach: 2 },
  zipline: { name: 'Zipline', seats: [[0, -1.35, 0]], reach: 1.4 },
};

export class Vehicles {
  constructor(party) {
    this.party = party;
    this.list = [];
    this.root = new THREE.Group();
    party.world.over.root.add(this.root);
    this.spawnAll();
  }

  get big() { return this.party.big; }
  get world() { return this.party.world; }
  tile(x, z) { return this.world.tileAt(x, z); }
  water(x, z) { const tt = this.tile(x, z); return (tt === TT.WATER || tt === TT.CORAL) && !(this.big && this.big.onDeck(x, z)); }
  snowy(x, z) { const tt = this.tile(x, z); return tt === TT.SNOW || tt === TT.GLACIER || tt === TT.ICE; }

  // ------------------------------------------------------------------ where they wait
  spawnAll() {
    const B = this.big;
    if (!B) return;
    const nearWater = (x, z, r = 7) => {
      for (let d = 0; d <= r; d += 0.5) for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
        if (this.water(px, pz) && this.water(px + 1.4, pz) && this.water(px - 1.4, pz) && this.water(px, pz + 1.8) && this.water(px, pz - 1.8)) return { x: px, z: pz };
      }
      return null;
    };
    // (the solo game's pier already has Marlo's ferry: its boats moor elsewhere)
    const boat = (kind, x, z, h = 0) => { if (this.party.solo && x > 80 && x < 115 && z > 100 && z < 120) return; const s = nearWater(x, z); if (s) this.spawn(kind, s.x, s.z, { heading: h }); };
    boat('rowboat', 91, 110); boat('rowboat', 159, 66); boat('rowboat', 112, -88); boat('rowboat', -134, -62);
    boat('rowboat', 304, 76); boat('rowboat', 210, 200); boat('rowboat', 26, 196);
    boat('sailboat', 104, 112, Math.PI); boat('sailboat', 238, 196); boat('sailboat', 460, 224); boat('sailboat', 62, 222); boat('sailboat', -60, 150);
    for (const p of B.map.pois) {
      if (p.kind === 'glider_pad') this.spawn('glider', p.x, p.z + 0.2, { pad: { x: p.x, z: p.z + 0.2 } });
      // (clear of the ramp’s own collider, or it can never slide off)
      if (p.kind === 'sled_ramp') this.spawn('sled', p.x, p.z + 2.6, { home: { x: p.x, z: p.z + 2.6 } });
    }
    this.spawn('sled', 206, 16, { home: { x: 206, z: 16 } });
    for (const r of B.map.rails || []) this.spawn('minecart', r.pts[0][0], r.pts[0][1], { rail: r, s: 0, dir: 1 });
    const docks = B.map.pois.filter((p) => p.kind === 'balloon_dock');
    if (docks.length >= 2) this.spawn('balloon', docks[0].x, docks[0].z, { route: docks.map((d) => ({ x: d.x, z: d.z })), at: 0 });
    for (const z of B.map.ziplines || []) this.spawn('zipline', z.from[0], z.from[1], { line: z });
  }

  spawn(kind, x, z, opts = {}) {
    const def = VEHICLES[kind];
    const v = { kind, def, x, z, y: 0, heading: opts.heading || 0, speed: 0, riders: new Array(def.seats.length).fill(null), home: opts.home || opts.pad || { x, z }, idle: 0, ...opts };
    v.obj = buildVehicle(this.party.r3d, kind);
    this.root.add(v.obj);
    if (kind === 'zipline') this.root.add(buildCable(this.party.r3d, v.line));
    if (kind === 'balloon') { v.alt = 0; v.leg = null; }
    this.place(v);
    this.list.push(v);
    return v;
  }

  // ------------------------------------------------------------------ board & leave
  riders(v) { return v.riders.filter(Boolean); }

  nearFor(p) {
    if (p.vehicle || p.mount) return null;
    let best = null, bd = 1e9;
    for (const v of this.list) {
      if (v.flying || v.kind === 'zipline' && v.riding) continue;
      const d = Math.hypot(v.x - p.pos.x, v.z - p.pos.z);
      if (d < v.def.reach && d < bd && v.riders.some((r) => !r)) { bd = d; best = v; }
    }
    return best;
  }

  board(p, v) {
    const i = v.riders.findIndex((r) => !r);
    if (i < 0) return false;
    v.riders[i] = p;
    p.vehicle = v; p.seat = i;
    p.swimming = false;
    const a = p.actor;
    a.jumpV = 0; a.jumpY = 0;
    a.sitting = !['glider', 'zipline'].includes(v.kind);
    a.model.setProp(null);
    audio.sfx(v.kind === 'rowboat' || v.kind === 'sailboat' ? 'splash' : 'land', { volume: 0.5 });
    this.party.buzz(p, 25);
    p.setEmote('heart', 1);
    if (v.kind === 'glider') this.launchGlider(v);
    if (v.kind === 'zipline') { v.riding = true; v.s = 0; }
    return true;
  }

  leave(p, quiet = false) {
    const v = p.vehicle;
    if (!v) return;
    v.riders[p.seat] = null;
    p.vehicle = null; p.seat = -1;
    const a = p.actor;
    a.sitting = false; a.armPose = undefined; a.armPoseL = undefined; a.lean = 0;
    if (p.fighter) a.model.setProp(p.fighter.prop || p.fighter.cls.weapon);
    // step off onto something solid nearby (or plop into the water and swim)
    const col = this.world.overCol;
    let spot = null;
    for (let d = 0.9; d <= 3.2 && !spot; d += 0.4) for (let k = 0; k < 12 && !spot; k++) {
      const ang = (k / 12) * Math.PI * 2 + p.slot;
      const x = v.x + Math.cos(ang) * d, z = v.z + Math.sin(ang) * d;
      if (!col.blocked(x, z, 0.3) && !this.water(x, z)) spot = { x, z };
    }
    if (!spot) spot = { x: v.x + Math.cos(p.slot) * 1.2, z: v.z + Math.sin(p.slot) * 1.2 };
    a.pos = spot;
    a.jumpV = 3.8;
    if (!quiet) audio.sfx('jump', { volume: 0.4 });
    if (!this.riders(v).length) v.idle = 0;
  }

  // A near a vehicle hops in (before the activity reads A)
  handleInput() {
    const P = this.party;
    if (P.busy || P.dialogue.active || P.vote) return;
    for (const p of P.players) {
      if (!p.connected) continue;
      const inp = p.input;
      if (p.vehicle) {
        const v = p.vehicle;
        // B gets out (the glider lands, the balloon waits for its dock)
        if (inp.pressed('b') || inp.pressed('jump')) {
          inp.edges.delete('b'); inp.edges.delete('jump');
          if (v.kind === 'glider') v.landing = true;
          else if (v.kind === 'sled' && v.speed > 2) this.hop(v);
          else if (v.kind === 'balloon' && v.flying) P.toast(t('Wait until the balloon lands!'), p.color);
          else if (v.kind !== 'zipline') this.leave(p);
        }
        continue;
      }
      if (!inp.pressed('a')) continue;
      const v = this.nearFor(p);
      if (!v) continue;
      inp.edges.delete('a'); inp.edges.delete('interact');
      this.board(p, v);
    }
  }

  // ------------------------------------------------------------------ frame
  update(dt) {
    for (const v of this.list) {
      const rs = this.riders(v);
      switch (v.kind) {
        case 'rowboat': this.row(v, rs, dt); break;
        case 'sailboat': this.sail(v, rs, dt); break;
        case 'minecart': this.cart(v, rs, dt); break;
        case 'glider': this.glide(v, rs, dt); break;
        case 'sled': this.sled(v, rs, dt); break;
        case 'balloon': this.balloon(v, rs, dt); break;
        case 'zipline': this.zip(v, rs, dt); break;
        default: break;
      }
      // abandoned far away: back home after a while
      if (!rs.length && !v.flying) {
        v.idle += dt;
        const near = this.party.players.some((p) => Math.hypot(p.pos.x - v.x, p.pos.z - v.z) < 18);
        if (v.idle > 40 && !near && Math.hypot(v.x - v.home.x, v.z - v.home.z) > 3 && v.kind !== 'minecart' && v.kind !== 'balloon') {
          v.x = v.home.x; v.z = v.home.z; v.speed = 0; v.y = 0; v.idle = 0;
        }
      }
      this.place(v);
      this.seat(v, dt);
    }
  }

  // riders ride along: position, pose & facing
  seat(v, dt) {
    const c = Math.cos(v.heading), s = Math.sin(v.heading);
    v.riders.forEach((p, i) => {
      if (!p) return;
      const [sx, sy, sz] = v.def.seats[i];
      const a = p.actor;
      a.pos = { x: v.x + sx * c + sz * s, z: v.z - sx * s + sz * c };
      a.baseY = (v.y || 0) + sy + (v.bob || 0);
      a.jumpY = 0; a.jumpV = 0;
      a.dir = { x: Math.sin(v.heading), z: Math.cos(v.heading) };
      a.model.targetFacing = v.heading;
      if (v.kind === 'rowboat') { const ph = (v.oar || 0) * Math.PI * 2; a.armPose = -1.2 + Math.sin(ph) * 0.6; a.armPoseL = -1.2 + Math.sin(ph) * 0.6; }
      else if (v.kind === 'glider' || v.kind === 'zipline') { a.armPose = -2.9; a.armPoseL = -2.9; a.lean = v.kind === 'glider' ? 0.9 : 0; }
      else if (v.kind === 'sled' || v.kind === 'minecart') { a.armPose = -0.6; a.armPoseL = -0.6; }
      else if (v.kind === 'sailboat' && i === 0) { a.armPose = -1.0; a.armPoseL = -1.0; }
      else { a.armPose = undefined; a.armPoseL = undefined; }
      void dt;
    });
  }

  place(v) {
    v.obj.position.set(v.x, (v.y || 0) + (v.bob || 0), v.z);
    v.obj.rotation.y = v.heading;
    const u = v.obj.userData;
    if (u.oars) for (const o of u.oars) o.rotation.x = Math.sin((v.oar || 0) * Math.PI * 2) * 0.6;
    if (u.sail) u.sail.rotation.y = 0.9 + Math.sin(this.party.t * 0.7 + v.x) * 0.06;
    if (u.flame) u.flame.visible = (v.burn || 0) > 0;
    if (u.wheels) for (const w of u.wheels) w.rotation.x += v.speed * 0.04;
  }

  // push a boat forward on water; bump off shores & piers
  moveBoat(v, dt) {
    const c = Math.sin(v.heading), s = Math.cos(v.heading);
    const nx = v.x + c * v.speed * dt, nz = v.z + s * v.speed * dt;
    const len = v.kind === 'sailboat' ? 2.1 : 1.1;
    const ok = this.water(nx, nz) && this.water(nx + c * len, nz + s * len) && this.water(nx - c * len * 0.8, nz - s * len * 0.8);
    if (ok) { v.x = nx; v.z = nz; }
    else if (Math.abs(v.speed) > 0.6) { v.speed = -v.speed * 0.3; audio.sfx('bonk', { volume: 0.4 }); this.party.cam.shake = Math.max(this.party.cam.shake || 0, 0.12); }
    else v.speed = 0;
    // currents carry boats too
    const f = this.party.swim && this.party.swim.flowAt(v.x, v.z);
    if (f && this.water(v.x + f.x * dt * 2, v.z + f.z * dt * 2)) { v.x += f.x * 1.6 * dt; v.z += f.z * 1.6 * dt; }
    v.bob = Math.sin(this.party.t * 2 + v.x) * 0.04;
    if (Math.abs(v.speed) > 1.5 && Math.random() < dt * 8) this.world.fx.emit('water', v.x - c * len, 0.15, v.z - s * len, 2);
  }

  row(v, rs, dt) {
    v.oar = ((v.oar || 0) + dt * (v.strokeT > 0 ? 1.6 : 0)) % 1;
    v.strokeT = Math.max(0, (v.strokeT || 0) - dt);
    let steer = 0;
    for (const p of rs) {
      steer += p.input.moveVector().x;
      if (p.input.pressed('a') && !(p.rowCd > 0)) {
        p.input.edges.delete('a');
        p.rowCd = 0.28; p.rowAt = this.party.t;
        v.speed = Math.min(6.8, v.speed + (rs.length > 1 ? 0.95 : 1.35));
        v.strokeT = 0.5;
        audio.sfx('splash', { volume: 0.3 });
        // two rowers pulling together: a big surge
        const other = rs.find((q) => q !== p && this.party.t - (q.rowAt || -9) < 0.28);
        if (other) {
          v.speed = Math.min(8.5, v.speed + 1.4);
          v.sync = (v.sync || 0) + 1;
          this.world.fx.emit('heart', v.x, 1.5, v.z, 1);
          if (v.sync % 4 === 0) this.party.toast(t('{a} & {b} row in sync!', { a: p.name, b: other.name }), p.color);
          this.party.buzz(p, 15); this.party.buzz(other, 15);
        }
      }
    }
    for (const p of rs) p.rowCd = Math.max(0, (p.rowCd || 0) - dt);
    v.heading -= (steer / Math.max(1, rs.length)) * 1.7 * dt * (0.4 + Math.min(1, Math.abs(v.speed) / 3));
    v.speed *= Math.exp(-dt * 0.55);
    this.moveBoat(v, dt);
  }

  sail(v, rs, dt) {
    const helm = v.riders[0] || rs[0];
    let want = 0;
    if (helm) {
      const m = helm.input.moveVector(), l = Math.hypot(m.x, m.y);
      if (l > 0.2) {
        const target = Math.atan2(m.x, m.y);
        v.heading += Math.max(-1.3 * dt, Math.min(1.3 * dt, angDiff(v.heading, target)));
        want = 5.2 * Math.min(1, l);
      }
    }
    v.boost = Math.max(0, (v.boost || 0) - dt);
    for (const p of rs) {
      if (p === helm || !p.input.pressed('a')) continue;
      p.input.edges.delete('a');
      if (!(p.trimCd > 0)) { p.trimCd = 1.2; v.boost = 1.6; audio.sfx('whoosh', { volume: 0.4 }); this.world.fx.emit('sparkle', v.x, 2.4, v.z, 4, { color: '#fff3c4' }); }
    }
    for (const p of rs) p.trimCd = Math.max(0, (p.trimCd || 0) - dt);
    if (v.boost > 0) want += 2.4;
    v.speed += (want - v.speed) * Math.min(1, dt * 0.8);
    this.moveBoat(v, dt);
  }

  // along the rails: A pushes, it rattles to the end of the line and waits
  cart(v, rs, dt) {
    const r = v.rail;
    if (!r) return;
    if (!r.len) { r.cum = [0]; for (let i = 1; i < r.pts.length; i++) r.cum.push(r.cum[i - 1] + Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1])); r.len = r.cum[r.cum.length - 1]; }
    for (const p of rs) if (p.input.pressed('a')) { p.input.edges.delete('a'); if (Math.abs(v.speed) < 0.5) v.speed = 3 * v.dir; else v.speed += 1.2 * Math.sign(v.speed); audio.sfx('whoosh', { volume: 0.3 }); }
    if (rs.length && Math.abs(v.speed) > 0.1) v.speed += Math.sign(v.speed) * dt * 1.2;
    v.speed = Math.max(-10, Math.min(10, v.speed));
    v.speed *= Math.exp(-dt * (rs.length ? 0.05 : 1.5));
    v.s += v.speed * dt;
    if (v.s >= r.len || v.s <= 0) {
      v.s = Math.max(0, Math.min(r.len, v.s));
      if (Math.abs(v.speed) > 1) { audio.sfx('bonk', { volume: 0.5 }); this.world.fx.emit('dust', v.x, 0.3, v.z, 8); }
      v.speed = 0; v.dir = v.s <= 0 ? 1 : -1;
    }
    let i = 1;
    while (i < r.cum.length - 1 && r.cum[i] < v.s) i++;
    const k = (v.s - r.cum[i - 1]) / Math.max(0.001, r.cum[i] - r.cum[i - 1]);
    const [ax, az] = r.pts[i - 1], [bx, bz] = r.pts[i];
    v.x = ax + (bx - ax) * k; v.z = az + (bz - az) * k;
    const target = Math.atan2(bx - ax, bz - az) + (v.speed < 0 ? Math.PI : 0);
    v.heading += angDiff(v.heading, target) * Math.min(1, dt * 8);
    v.y = 0.02;
    v.clack = (v.clack || 0) - dt * Math.abs(v.speed);
    if (v.clack <= 0 && Math.abs(v.speed) > 1) { v.clack = 1.6; audio.footstep('stone'); if (Math.abs(angDiff(v.heading, target)) > 0.1) this.world.fx.emit('sparkle', v.x, 0.2, v.z, 3, { color: '#ffd66b' }); }
  }

  launchGlider(v) {
    v.flying = true; v.alt = 4.2; v.speed = 6.5; v.landing = false;
    const p = v.riders[0];
    v.heading = p ? Math.atan2(p.actor.dir.x, p.actor.dir.z || 1) : 0;
    if (Math.abs(angDiff(v.heading, 0)) > 1.4) v.heading = 0;   // off the cliff, facing out to the valley
    audio.sfx('gust', { volume: 0.7 });
    this.world.fx.emit('dust', v.x, 0.3, v.z, 10);
  }

  glide(v, rs, dt) {
    const p = rs[0];
    if (!v.flying) { v.y = 0.9; v.alt = 0; return; }
    if (p) {
      const m = p.input.moveVector();
      if (Math.hypot(m.x, m.y) > 0.25) v.heading += Math.max(-1.6 * dt, Math.min(1.6 * dt, angDiff(v.heading, Math.atan2(m.x, m.y))));
    }
    const tl = this.tile(v.x, v.z);
    let lift = -0.42;
    if (tl === TT.LAVA) lift = 1.7;                                   // hot air!
    else if (this.big && this.big.cliffBelow && this.big.cliffBelow(v.x, v.z)) lift = 1.1;   // cliff updrafts
    if (v.landing) lift = -2.6;
    v.alt = Math.max(0, Math.min(8, v.alt + lift * dt));
    v.x += Math.sin(v.heading) * v.speed * dt; v.z += Math.cos(v.heading) * v.speed * dt;
    const bnd = this.big ? this.big.bounds() : null;
    if (bnd) { v.x = Math.max(bnd.x0 + 4, Math.min(bnd.x1 - 4, v.x)); v.z = Math.max(bnd.z0 + 4, Math.min(bnd.z1 - 4, v.z)); }
    v.y = v.alt + 1.1;
    if (Math.random() < dt * 6) this.world.fx.emit('sparkle', v.x, v.y + 0.4, v.z, 1, { color: '#ffffff' });
    if (v.alt <= 0.02) {
      // touch down (never in lava or the clouds: the hot air bounces you back up)
      const bad = tl === TT.LAVA || tl === TT.SKY || tl === TT.CREVASSE;
      if (bad) { v.alt = 1.2; v.landing = false; return; }
      v.flying = false;
      if (p) { this.leave(p, true); audio.sfx('land', { volume: 0.6 }); this.world.fx.emit('dust', p.pos.x, 0.1, p.pos.z, 8); }
      // the glider floats home to its pad
      v.x = v.home.x; v.z = v.home.z; v.y = 0.9; v.heading = 0;
      this.world.fx.emit('sparkle', v.x, 1.2, v.z, 10, { color: '#fff3c4' });
    }
  }

  sled(v, rs, dt) {
    const col = this.world.overCol;
    if (!rs.length) { v.speed *= Math.exp(-dt * 3); v.y = 0; return; }
    const on = this.snowy(v.x, v.z);
    let steer = 0, brake = 0;
    for (const p of rs) { const m = p.input.moveVector(); steer += m.x; brake = Math.max(brake, m.y < -0.5 ? 1 : 0); if (p.input.pressed('a')) { p.input.edges.delete('a'); if (on && v.speed < 3) v.speed += 2.2; } }
    steer /= rs.length;
    // downhill is south; steering turns the sled
    const slope = on ? 5.5 : 0;
    v.heading += -steer * 1.9 * dt;
    v.heading += angDiff(v.heading, 0) * dt * 0.25;
    v.speed += (slope * Math.max(0.2, Math.cos(v.heading)) - v.speed * (on ? 0.35 : 3) - brake * 4) * dt;
    v.speed = Math.max(0, Math.min(11, v.speed));
    const dx = Math.sin(v.heading) * v.speed * dt, dz = Math.cos(v.heading) * v.speed * dt;
    if (col.blocked(v.x + dx * 3, v.z + dz * 3, 0.35) && v.speed > 4) {
      // wipeout!
      audio.sfx('bonk', { volume: 0.6 }); this.world.fx.emit('dust', v.x, 0.3, v.z, 12, { color: '#ffffff' });
      this.party.cam.shake = Math.max(this.party.cam.shake || 0, 0.25);
      for (const p of rs.slice()) { this.leave(p, true); p.actor.jumpV = 6; p.setEmote('star', 1.5); }
      v.speed = 0;
      return;
    }
    const pos = { x: v.x, z: v.z };
    col.move(pos, dx, dz, 0.35);
    v.x = pos.x; v.z = pos.z;
    if (v.hopT > 0) { v.hopT -= dt; v.y = Math.sin((1 - v.hopT / 0.5) * Math.PI) * 0.8; } else v.y = 0;
    if (v.speed > 3 && Math.random() < dt * 14) this.world.fx.emit('dust', v.x - Math.sin(v.heading) * 0.6, 0.1, v.z - Math.cos(v.heading) * 0.6, 1, { color: '#ffffff' });
    v.swoosh = (v.swoosh || 0) - dt;
    if (v.speed > 6 && v.swoosh <= 0) { v.swoosh = 0.8; audio.sfx('whoosh', { volume: 0.25 }); }
  }

  hop(v) { if (!(v.hopT > 0)) { v.hopT = 0.5; audio.sfx('jump', { volume: 0.4 }); } }

  balloon(v, rs, dt) {
    const R = v.route;
    v.burn = Math.max(0, (v.burn || 0) - dt);
    if (!v.flying) {
      v.y = 0.02; v.bob = Math.sin(this.party.t * 1.5) * 0.05;
      // empty, and someone waits on the other dock: it comes for them
      if (!rs.length) {
        const i = R.findIndex((d) => Math.hypot(d.x - v.x, d.z - v.z) > 6 && this.party.players.some((p) => p.connected !== false && !p.vehicle && Math.hypot(p.pos.x - d.x, p.pos.z - d.z) < 3.2));
        v.callT = i >= 0 ? (v.callT || 0) + dt : 0;
        if (v.callT > 1.2) {
          v.callT = 0; v.flying = true; v.from = { x: v.x, z: v.z }; v.at = i; v.to = R[i]; v.k = 0; v.burn = 1.5;
          audio.sfx('geyser', { volume: 0.4 });
          this.party.toast(t('The balloon is on its way!'));
        }
      }
      // anyone aboard presses A: take off for the next dock
      for (const p of rs) if (p.input.pressed('a')) {
        p.input.edges.delete('a');
        v.flying = true; v.from = { x: v.x, z: v.z }; v.at = (v.at + 1) % R.length; v.to = R[v.at]; v.k = 0; v.burn = 1.5;
        audio.sfx('geyser', { volume: 0.5 });
        this.party.toast(t('Up, up and away!'), p.color);
        break;
      }
      return;
    }
    for (const p of rs) if (p.input.pressed('a')) { p.input.edges.delete('a'); v.burn = 0.8; audio.sfx('geyser', { volume: 0.3 }); }
    const L = Math.hypot(v.to.x - v.from.x, v.to.z - v.from.z);
    v.k = Math.min(1, v.k + dt * (4.2 + (v.burn > 0 ? 1.2 : 0)) / Math.max(1, L));
    const e = v.k < 0.5 ? 2 * v.k * v.k : 1 - (-2 * v.k + 2) ** 2 / 2;
    v.x = v.from.x + (v.to.x - v.from.x) * e; v.z = v.from.z + (v.to.z - v.from.z) * e;
    v.y = Math.sin(v.k * Math.PI) * 6.5;
    v.heading += dt * 0.15;
    if (v.k >= 1) { v.flying = false; v.y = 0.02; audio.sfx('land', { volume: 0.5 }); this.world.fx.emit('dust', v.x, 0.2, v.z, 8); }
  }

  zip(v, rs, dt) {
    const L = v.line, p = rs[0];
    if (!p) { v.x = L.from[0]; v.z = L.from[1]; v.y = L.from[2]; v.riding = false; return; }
    const len = Math.hypot(L.to[0] - L.from[0], L.to[1] - L.from[1]);
    v.s = Math.min(1, (v.s || 0) + dt * 9 / len);
    v.x = L.from[0] + (L.to[0] - L.from[0]) * v.s; v.z = L.from[1] + (L.to[1] - L.from[1]) * v.s;
    v.y = L.from[2] + (L.to[2] - L.from[2]) * v.s - Math.sin(v.s * Math.PI) * 0.6;
    v.heading = Math.atan2(L.to[0] - L.from[0], L.to[1] - L.from[1]);
    if (Math.random() < dt * 20) this.world.fx.emit('sparkle', v.x, v.y + 1.5, v.z, 1, { color: '#ffd66b' });
    if (v.s >= 1) { this.leave(p, true); p.actor.jumpV = 4; audio.sfx('land', { volume: 0.5 }); v.s = 0; v.riding = false; }
  }

  // ------------------------------------------------------------------ the phone
  ctxFor(p) {
    const v = p.vehicle;
    if (!v) {
      const near = this.nearFor(p);
      return near ? { a: 'Board', hint: '{thing}: press A to hop in', vars: { thing: t(near.def.name) } } : null;
    }
    switch (v.kind) {
      case 'rowboat': return { a: 'Row', b: 'Get out', hint: this.riders(v).length > 1 ? 'Tap A together to row in sync!' : 'Tap A to row, steer with the stick' };
      case 'sailboat': return v.riders[0] === p ? { a: null, b: 'Get out', hint: 'You’re the captain: steer with the stick' } : { a: 'Trim sail', b: 'Get out', hint: 'Trim the sail for a burst of speed!' };
      case 'minecart': return { a: 'Push', b: 'Hop off', hint: 'Push off with A and hold on!' };
      case 'glider': return { a: null, b: v.flying ? 'Land' : 'Get off', hint: 'Steer with the stick · warm air over cliffs & lava lifts you' };
      case 'sled': return { a: 'Push', b: v.speed > 2 ? 'Hop' : 'Get off', hint: 'Steer around the trees!' };
      case 'balloon': return { a: v.flying ? 'Burner' : 'Lift off', b: v.flying ? null : 'Get out', hint: v.flying ? 'Enjoy the view!' : 'Press A to take off' };
      case 'zipline': return { a: null, b: null, hint: 'Wheee!' };
      default: return null;
    }
  }

  // an "A" over vehicles you can hop into
  drawLabels(ctx, view, P, drawText) {
    for (const v of this.list) {
      if (v.flying || !v.riders.some((r) => !r)) continue;
      const near = P.players.some((p) => !p.vehicle && Math.hypot(p.pos.x - v.x, p.pos.z - v.z) < v.def.reach + 0.5);
      if (!near) continue;
      const u = P.toUi(view, v.x, (v.y || 0) + 1.5, v.z), bob = Math.round(Math.sin(P.t * 5) * 1.5);
      ctx.fillStyle = '#3b2a2e'; ctx.fillRect(Math.round(u.x) - 5, Math.round(u.y) - 12 + bob, 11, 11);
      ctx.fillStyle = '#4f73b6'; ctx.fillRect(Math.round(u.x) - 4, Math.round(u.y) - 11 + bob, 9, 9);
      drawText(ctx, P.keyA || 'A', u.x + 1, u.y - 10 + bob, { color: '#fff7e6', align: 'center' });
    }
  }

  dispose() {
    for (const p of this.party.players) if (p.vehicle) this.leave(p, true);
    this.world.over.root.remove(this.root);
  }
}

// ------------------------------------------------------------------ models
export function buildVehicle(r3d, kind) {
  const g = new THREE.Group();
  const M = (c, e) => toon(r3d, { color: c, emissive: e || 0x000000, emissiveIntensity: e ? 1 : 1, key: 'veh' + c + (e || '') });
  const B = (w, h, d, m, x, y, z, parent = g) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; parent.add(b); return b; };
  const wood = M(0x9a6440), dark = M(0x6b4330), light = M(0xc89a68);
  if (kind === 'rowboat') {
    B(1.1, 0.12, 2.3, dark, 0, 0.06, 0);
    for (const sx of [-0.55, 0.55]) B(0.1, 0.34, 2.2, wood, sx, 0.2, 0);
    B(1.1, 0.34, 0.1, wood, 0, 0.2, -1.12); B(0.8, 0.3, 0.1, wood, 0, 0.2, 1.12);
    B(1.0, 0.06, 0.3, light, 0, 0.26, 0.1); B(1.0, 0.06, 0.3, light, 0, 0.26, -0.7);
    const oars = [];
    for (const sx of [-1, 1]) { const o = new THREE.Group(); o.position.set(sx * 0.62, 0.36, 0.1); B(1.2, 0.05, 0.06, light, sx * 0.55, 0, 0, o); B(0.3, 0.03, 0.16, light, sx * 1.15, -0.05, 0, o); g.add(o); oars.push(o); }
    g.userData.oars = oars;
    B(0.4, 0.03, 0.4, M(0xd9594c), 0, 0.37, -1.0);
  } else if (kind === 'sailboat') {
    B(1.7, 0.16, 4.4, dark, 0, 0.08, 0);
    for (const sx of [-0.85, 0.85]) B(0.12, 0.42, 4.2, wood, sx, 0.25, 0);
    B(1.6, 0.42, 0.12, wood, 0, 0.25, -2.15);
    const bow = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.1, 4), wood); bow.rotation.x = Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.position.set(0, 0.25, 2.7); bow.scale.set(1, 1, 0.5); g.add(bow);
    B(1.5, 0.05, 3.9, light, 0, 0.3, 0);
    B(0.14, 4.2, 0.14, dark, 0, 2.3, 0.4);
    // a striped lateen sail, swung out a little so everyone can see it
    const sail = new THREE.Group();
    sail.position.set(0, 0, 0.4); sail.rotation.y = 0.9;
    const cloth = new THREE.Mesh(triGeo([[0, 4.3, 0], [0, 0.75, -2.4], [0, 0.85, 1.2]]), toon(r3d, { map: stripeTex('#fbf1dc', '#d9594c', 6), side: THREE.DoubleSide, key: 'veh-sail2' }));
    cloth.castShadow = true;
    sail.add(cloth);
    B(0.08, 0.08, 3.6, dark, 0, 0.8, -0.6, sail);
    g.add(sail);
    g.userData.sail = sail;
    B(0.3, 0.2, 0.05, M(0xf4c542), 0, 4.45, 0.4);
  } else if (kind === 'minecart') {
    B(1.0, 0.5, 1.3, M(0x7a5a4a), 0, 0.45, 0);
    B(1.06, 0.08, 1.36, M(0x3b3a46), 0, 0.72, 0); B(1.06, 0.08, 1.36, M(0x3b3a46), 0, 0.3, 0);
    const wheels = [];
    for (const sx of [-0.45, 0.45]) for (const sz of [-0.4, 0.4]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 8), M(0x3b3a46)); w.rotation.z = Math.PI / 2; w.position.set(sx, 0.16, sz); g.add(w); wheels.push(w); }
    g.userData.wheels = wheels;
    B(0.9, 0.12, 1.2, M(0x9a8878), 0, 0.62, 0);
  } else if (kind === 'glider') {
    // a striped delta wing on a little frame; the pilot hangs below it
    const wing = new THREE.Mesh(triGeo([[0, 1.5, 1.1], [-2.1, 1.28, -0.75], [2.1, 1.28, -0.75]]), toon(r3d, { map: stripeTex('#ef6479', '#fff3c4', 5), side: THREE.DoubleSide, key: 'veh-wing' }));
    wing.castShadow = true;
    g.add(wing);
    const keel = new THREE.Mesh(triGeo([[0, 1.5, 1.1], [0, 1.28, -0.75], [0, 1.72, -0.75]]), toon(r3d, { color: 0xd9594c, side: THREE.DoubleSide, key: 'veh-keel' }));
    g.add(keel);
    B(0.05, 0.9, 0.05, dark, 0, 0.95, 0.15);
    B(1.1, 0.05, 0.05, dark, 0, 0.52, 0.15);
    B(0.04, 0.04, 1.9, dark, 0, 1.36, 0.15);
  } else if (kind === 'sled') {
    B(0.7, 0.08, 1.4, wood, 0, 0.24, 0);
    for (const sx of [-0.3, 0.3]) { B(0.06, 0.12, 1.5, M(0xc8454f), sx, 0.1, 0); const curl = B(0.06, 0.3, 0.1, M(0xc8454f), sx, 0.22, 0.78); curl.rotation.x = -0.5; }
    for (const z of [-0.45, 0, 0.45]) B(0.7, 0.05, 0.12, light, 0, 0.3, z);
  } else if (kind === 'balloon') {
    B(1.6, 0.8, 1.6, M(0xb8864a), 0, 0.4, 0);
    B(1.7, 0.1, 1.7, M(0x8a5a2a), 0, 0.82, 0);
    const env = new THREE.Group(); env.position.y = 4.2; g.add(env);
    const cols = [0xef6479, 0xfff3c4, 0x5aa8f2, 0xfff3c4, 0xf4c542, 0xfff3c4, 0x62c46c, 0xfff3c4];
    cols.forEach((c, i) => { const seg = new THREE.Mesh(new THREE.SphereGeometry(1.8, 8, 10, (i / 8) * Math.PI * 2, Math.PI * 2 / 8), toon(r3d, { color: c, key: 'veh-bal' + c })); seg.scale.set(1, 1.2, 1); seg.castShadow = true; env.add(seg); });
    for (const sx of [-0.75, 0.75]) for (const sz of [-0.75, 0.75]) { const r = B(0.03, 2.4, 0.03, M(0xd9c090), sx, 2.1, sz); r.rotation.z = -sx * 0.2; r.rotation.x = sz * 0.2; }
    const flame = B(0.25, 0.4, 0.25, M(0xffb040, 0xff9030), 0, 1.9, 0);
    g.userData.flame = flame;
  } else if (kind === 'zipline') {
    B(0.1, 0.1, 0.5, M(0x3b3a46), 0, 0.02, 0);
    B(0.06, 0.4, 0.06, M(0x3b3a46), 0, -0.2, 0);
    B(0.5, 0.06, 0.06, M(0xd9594c), 0, -0.4, 0);
  }
  return g;
}

// a flat triangle (double-sided, uv mapped for stripes)
function triGeo(pts) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([0.5, 1, 0, 0, 1, 0], 2));
  geo.computeVertexNormals();
  return geo;
}
const STRIPES = {};
function stripeTex(a, b, n) {
  const k = a + b + n;
  if (STRIPES[k]) return STRIPES[k];
  const c = document.createElement('canvas');
  c.width = 16; c.height = 16;
  const x = c.getContext('2d');
  for (let i = 0; i < 16; i++) { x.fillStyle = Math.floor(i / (16 / n)) % 2 ? b : a; x.fillRect(i, 0, 1, 16); }
  const tx = new THREE.CanvasTexture(c);
  tx.magFilter = tx.minFilter = THREE.NearestFilter; tx.generateMipmaps = false; tx.colorSpace = THREE.NoColorSpace;
  return (STRIPES[k] = tx);
}

function buildCable(r3d, L) {
  const g = new THREE.Group();
  const mat = toon(r3d, { color: 0x3b3a46, key: 'veh-cable' }), wood = toon(r3d, { color: 0x6b4330, key: 'veh-post' });
  const [ax, az, ay] = L.from, [bx, bz, by] = L.to;
  const n = 16;
  for (let i = 0; i < n; i++) {
    const k0 = i / n, k1 = (i + 1) / n;
    const p0 = new THREE.Vector3(ax + (bx - ax) * k0, ay + 1.4 + (by - ay) * k0 - Math.sin(k0 * Math.PI) * 0.6, az + (bz - az) * k0);
    const p1 = new THREE.Vector3(ax + (bx - ax) * k1, ay + 1.4 + (by - ay) * k1 - Math.sin(k1 * Math.PI) * 0.6, az + (bz - az) * k1);
    const len = p0.distanceTo(p1);
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, len), mat);
    seg.position.copy(p0).add(p1).multiplyScalar(0.5);
    seg.lookAt(p1);
    g.add(seg);
  }
  for (const [x, z, y] of [L.from, L.to]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, y + 1.6, 0.18), wood); post.position.set(x, (y + 1.6) / 2, z); post.castShadow = true; g.add(post); }
  return g;
}
