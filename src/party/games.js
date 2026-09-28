// Party Mode mini-games. Each one is hosted by a villager somewhere in the
// valley: the story sets it up, shows the rules, counts down, runs it, then
// hands out stars from `results()`.

import { THREE, toon } from '../render/r3d.js';
import { buildProp } from '../models/props.js';
import { buildFurniture } from '../models/furniture.js';
import { TT } from '../world/tiles.js';
import { drawText, measure } from '../engine/font.js';
import { emote as drawEmote } from '../ui/ui.js';
import { audio } from '../engine/audio.js';
import { KOI_POND } from '../world/overworld.js';
import { t } from '../i18n.js';

// Text: ctxFor() returns English (party.js translates a, b, x and hint with
// its vars); everything drawn, toasted or said here goes through t().

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export class MiniGame {
  constructor(party, def) {
    this.party = party;
    this.def = def;
    this.world = party.world;
    this.r3d = party.r3d;
    this.root = new THREE.Group();
    this.world.over.root.add(this.root);
    this.pts = new Map();
    this.t = 0;
    this.left = def.time;
    this.running = false;
    this.ended = false;
    this.center = { x: def.arena[0], z: def.arena[1] };
    this.bounds = def.bounds;
    this.coop = !!def.coop;
  }

  get players() { return this.party.players; }
  get live() { return this.party.players.filter((p) => p.connected); }
  add(p, n = 1) { this.pts.set(p.slot, this.score(p) + n); }
  score(p) { return this.pts.get(p.slot) || 0; }
  mat(c, e = null) { return toon(this.r3d, { color: c, emissive: e || 0x000000, emissiveIntensity: e ? 0.9 : 1, key: 'mg' + c + (e || '') }); }
  box(w, h, d, c, x, y, z, parent = this.root) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'object' ? c : this.mat(c));
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  setup() { this.placePlayers(); }
  begin() { this.running = true; }
  update(dt) {
    if (!this.running) { this.idle(dt); return; }
    this.t += dt;
    this.left -= dt;
    this.tick(dt);
    for (const p of this.players) this.clamp(p);
    if (this.left <= 0 || this.goal()) { this.left = Math.max(0, this.left); this.running = false; this.ended = true; this.end(); }
  }
  idle(dt) { void dt; }
  tick(dt) { void dt; }
  goal() { return false; }
  end() { for (const p of this.players) p.frozen = false; }
  dispose() {
    this.world.over.root.remove(this.root);
    this.world.critters.hideKinds = null;
    for (const p of this.players) { p.frozen = false; p.actor.model.setProp(null); p.actor.armPose = undefined; }
  }
  ctxFor(p) { void p; return { a: null, b: 'Hop', hint: this.def.hint }; }
  results() { return this.players.map((p) => ({ p, pts: this.score(p) })).sort((a, b) => b.pts - a.pts); }
  scoreText(p) { return String(this.score(p)); }
  onJoin(p) { this.clamp(p); }
  onLeave(p) { void p; }
  onLand(p) { void p; }
  drawWorld(wctx, v) { void wctx; void v; }
  drawLabels(ctx, v) { void ctx; void v; }
  drawUi(ctx) { void ctx; }

  // an invisible fence around the arena
  clamp(p) {
    const b = this.bounds, c = this.center;
    const dx = (p.pos.x - c.x) / b.rx, dz = (p.pos.z - c.z) / b.rz;
    const d = Math.hypot(dx, dz);
    if (d > 1) { p.actor.pos.x = c.x + (dx / d) * b.rx; p.actor.pos.z = c.z + (dz / d) * b.rz; }
  }

  walkable(x, z, r = 0.3) {
    const w = this.world, m = w.mapData;
    const tx = Math.floor(x), tz = Math.floor(z);
    if (tx < 0 || tz < 0 || tx >= m.w || tz >= m.h) return false;
    if (m.ground[tz * m.w + tx] === TT.WATER) return false;
    return !w.overCol.blocked(x, z, r);
  }

  // a random free spot inside the arena
  spot({ min = 0, max = 1, away = null, gap = 0, avoid = [], tiles = null, r = 0.35 } = {}) {
    const b = this.bounds, c = this.center;
    for (let i = 0; i < 200; i++) {
      const a = Math.random() * Math.PI * 2, d = rand(min, max);
      const x = c.x + Math.cos(a) * d * b.rx, z = c.z + Math.sin(a) * d * b.rz;
      if (!this.walkable(x, z, r)) continue;
      if (tiles && !tiles.includes(this.world.tileAt(x, z))) continue;
      if (away && Math.hypot(x - away.x, z - away.z) < away.r) continue;
      if (gap && avoid.some((o) => Math.hypot(o.x - x, o.z - z) < gap)) continue;
      return { x, z };
    }
    return { x: c.x, z: c.z };
  }

  // everyone in a friendly ring around the start point
  placePlayers(at = this.def.start || this.def.arena, spread = 1.6) {
    const ps = this.players, n = ps.length;
    ps.forEach((p, i) => {
      const a = (i / Math.max(1, n)) * Math.PI * 2 + 0.4;
      let x = at[0] + Math.cos(a) * spread * (n > 1 ? 1 : 0), z = at[1] + Math.sin(a) * spread * 0.75 * (n > 1 ? 1 : 0);
      if (!this.walkable(x, z)) { const s = this.spot({ max: 0.5 }); x = s.x; z = s.z; }
      p.actor.pos = { x, z };
      p.actor.vel = { x: 0, z: 0 };
      p.actor.dir = { x: this.center.x - x, z: this.center.z - z };
      const l = Math.hypot(p.actor.dir.x, p.actor.dir.z) || 1;
      p.actor.dir = { x: p.actor.dir.x / l, z: p.actor.dir.z / l };
      p.actor.model.targetFacing = Math.atan2(p.actor.dir.x, p.actor.dir.z);
    });
    this.party.cam.snap(this.party.camPlayers());
  }

  // a marker floating over a point, in every view that can see it
  marker(ctx, v, x, z, label, color = '#ffd66b') {
    const u = this.party.toUi(v, x, 1.6, z);
    const bob = Math.round(Math.sin(this.party.t * 4) * 2);
    drawText(ctx, '↓', u.x, u.y - 6 + bob, { color, align: 'center', outline: '#3b2a2e' });
    if (label) {
      const w = measure(label) + 8;
      ctx.fillStyle = 'rgba(30,20,40,0.75)';
      ctx.fillRect(Math.round(u.x - w / 2), Math.round(u.y - 20 + bob), w, 11);
      drawText(ctx, label, u.x, u.y - 18 + bob, { color, align: 'center' });
    }
  }
}

// ---------------------------------------------------------------------------
// Bram's Hen Round-Up: the hens got out! Grab one (A) and carry it home.
// ---------------------------------------------------------------------------
export class HenRoundUp extends MiniGame {
  setup() {
    this.world.critters.hideKinds = new Set(['hen']);
    const [cx, cz] = this.def.coop;
    this.coopAt = { x: cx, z: cz, r: 1.45 };
    this.buildCoop();
    const n = Math.min(15, 4 + this.live.length * 2);
    this.hens = [];
    for (let i = 0; i < n; i++) this.addHen(false);
    this.placePlayers();
  }

  buildCoop() {
    const g = new THREE.Group();
    g.position.set(this.coopAt.x, 0, this.coopAt.z);
    this.root.add(g);
    const wood = this.mat(0xc0855a), dark = this.mat(0x7a5238), straw = this.mat(0xcfa352), roof = this.mat(0xc8453a), roofD = this.mat(0x9a3230);
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.04, 20), straw);
    floor.position.y = 0.02; floor.receiveShadow = true;
    g.add(floor);
    for (let i = 0; i < 18; i++) { const a = Math.random() * Math.PI * 2, r = Math.random() * 1.1; const b = this.box(0.18, 0.03, 0.05, this.mat(0xe8c46a), Math.cos(a) * r, 0.05, Math.sin(a) * r, g); b.rotation.y = Math.random() * 3; }
    // a ring of posts and a rail, open towards the field (south-east)
    const N = 16;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      if (Math.cos(a - 0.6) > 0.8) continue;
      this.box(0.1, 0.55, 0.1, dark, Math.cos(a) * 1.42, 0.27, Math.sin(a) * 1.42, g);
      const a2 = ((i + 0.5) / N) * Math.PI * 2;
      if (Math.cos(a2 - 0.6) > 0.8 || Math.cos(((i + 1) / N) * Math.PI * 2 - 0.6) > 0.8) continue;
      const rail = this.box(0.58, 0.07, 0.06, wood, Math.cos(a2) * 1.42, 0.42, Math.sin(a2) * 1.42, g);
      rail.rotation.y = -a2 + Math.PI / 2;
    }
    // the little hen house at the back
    const hx = -0.35, hz = -0.75;
    this.box(1.2, 0.7, 0.8, wood, hx, 0.45, hz, g);
    this.box(1.24, 0.08, 0.84, dark, hx, 0.1, hz, g);
    for (const s of [-1, 1]) { const r = this.box(1.36, 0.08, 0.56, s < 0 ? roof : roofD, hx, 0.95, hz + s * 0.2, g); r.rotation.x = s * 0.62; }
    this.box(0.28, 0.34, 0.04, this.mat(0x3b2a2e), hx + 0.1, 0.36, hz + 0.41, g);
    this.box(0.12, 0.5, 0.06, dark, hx - 0.4, 0.18, hz + 0.52, g).rotation.x = -0.9;
  }

  addHen(gold) {
    const pos = this.spot({ min: 0.25, max: 1, away: { ...this.coopAt, r: 3.5 } });
    const res = buildFurniture(this.r3d, { type: 'chicken', x: pos.x, z: pos.z, color: gold ? '#f6c65b' : pick(['#f4efe4', '#f4efe4', '#b8763a', '#e0924a']) });
    const obj = res.obj;
    if (gold) obj.traverse((m) => { if (m.isMesh && m.material.color && m.material.color.getHex() === 0xf6c65b) { m.material = m.material.clone(); m.material.emissive = new THREE.Color(0xa07818); m.material.emissiveIntensity = 0.6; } });
    obj.position.set(pos.x, 0, pos.z);
    this.root.add(obj);
    const h = { obj, anim: res.anim, x: pos.x, z: pos.z, tx: pos.x, tz: pos.z, wait: rand(0, 2), carrier: null, home: false, gold, ph: Math.random() * 10, fear: 0, flap: 0 };
    this.hens.push(h);
    return h;
  }

  tick(dt) {
    const now = this.party.t;
    if (!this.goldDone && this.left < this.def.time / 2) {
      this.goldDone = true;
      const h = this.addHen(true);
      this.party.toast(t('A golden hen! She’s worth 3!'), '#f6c65b');
      this.world.fx.emit('sparkle', h.x, 0.8, h.z, 16, { color: '#fff3a6' });
      audio.sfx('shard', { volume: 0.6 });
    }
    // grabbing
    for (const p of this.live) {
      if (p.carry || !p.input.pressed('a')) continue;
      let best = null, bd = 1.0;
      for (const h of this.hens) {
        if (h.home || h.carrier) continue;
        const d = Math.hypot(h.x - p.pos.x, h.z - p.pos.z);
        if (d < bd) { bd = d; best = h; }
      }
      if (best) {
        best.carrier = p; p.carry = best;
        audio.sfx('squeak', { volume: 0.6 });
        this.party.buzz(p, 25);
      } else p.say(t('Too far!'), 0.8);
    }
    for (const h of this.hens) {
      if (h.home) { this.homeHen(h, dt, now); continue; }
      const p = h.carrier;
      if (p) {
        if (!p.connected) { h.carrier = null; p.carry = null; }
        else {
          h.x = p.pos.x; h.z = p.pos.z;
          h.obj.position.set(p.pos.x, 1.72 + (p.actor.baseY || 0) + p.actor.jumpY, p.pos.z + 0.02);
          h.obj.rotation.y = Math.atan2(-p.actor.dir.z, p.actor.dir.x);
          h.obj.rotation.z = Math.sin(now * 14 + h.ph) * 0.15;
          if (Math.hypot(p.pos.x - this.coopAt.x, p.pos.z - this.coopAt.z) < this.coopAt.r + 0.2) this.deliver(h, p);
          continue;
        }
      }
      h.obj.rotation.z = 0;
      // flee from whoever is closest
      let near = null, nd = 99;
      for (const q of this.live) { const d = Math.hypot(q.pos.x - h.x, q.pos.z - h.z); if (d < nd) { nd = d; near = q; } }
      if (near && nd < 3 && !near.carry && h.fear <= 0.3) {
        // bolt away — and sidestep at the last moment
        const a = Math.atan2(h.z - near.pos.z, h.x - near.pos.x) + (nd < 1.4 ? (Math.random() < 0.5 ? 1.3 : -1.3) : rand(-0.6, 0.6));
        h.tx = h.x + Math.cos(a) * 2.6; h.tz = h.z + Math.sin(a) * 2.6; h.fear = 0.75; h.wait = 0;
        if (nd < 1.4 && Math.random() < 0.5) this.world.fx.emit('dust', h.x, 0.1, h.z, 2);
      }
      if (h.fear > 0) h.fear -= dt;
      h.wait -= dt;
      if (h.wait <= 0 && h.fear <= 0) { const a = Math.random() * Math.PI * 2; h.tx = h.x + Math.cos(a) * rand(0.5, 1.6); h.tz = h.z + Math.sin(a) * rand(0.5, 1.6); h.wait = rand(1, 3); }
      const dx = h.tx - h.x, dz = h.tz - h.z, d = Math.hypot(dx, dz);
      let moving = false;
      if (d > 0.05) {
        const sp = (h.fear > 0 ? 3.7 : 0.8) * (h.gold ? 1.2 : 1);
        const step = Math.min(d, sp * dt);
        const nx = h.x + (dx / d) * step, nz = h.z + (dz / d) * step;
        const inside = ((nx - this.center.x) / this.bounds.rx) ** 2 + ((nz - this.center.z) / this.bounds.rz) ** 2 < 0.92;
        if (this.walkable(nx, nz, 0.15) && inside && Math.hypot(nx - this.coopAt.x, nz - this.coopAt.z) > this.coopAt.r + 0.4) { h.x = nx; h.z = nz; moving = true; }
        else { h.tx = h.x; h.tz = h.z; h.wait = 0.2; }
        h.obj.rotation.y = Math.atan2(-dz, dx);
      }
      h.obj.position.set(h.x, moving ? Math.abs(Math.sin(now * 16 + h.ph)) * 0.05 : 0, h.z);
      if (!moving && h.anim) h.anim(now + h.ph);
    }
  }

  homeHen(h, dt, t) {
    h.wait -= dt;
    if (h.wait <= 0) { h.tx = this.coopAt.x + rand(-0.9, 0.9); h.tz = this.coopAt.z + rand(0, 0.9); h.wait = rand(1, 3); }
    const dx = h.tx - h.x, dz = h.tz - h.z, d = Math.hypot(dx, dz);
    if (d > 0.05) { h.x += (dx / d) * Math.min(d, 0.6 * dt); h.z += (dz / d) * Math.min(d, 0.6 * dt); h.obj.rotation.y = Math.atan2(-dz, dx); }
    else if (h.anim) h.anim(t + h.ph);
    h.obj.position.set(h.x, 0.05, h.z);
    h.obj.rotation.z = 0;
  }

  deliver(h, p) {
    h.carrier = null; h.home = true; p.carry = null;
    h.x = this.coopAt.x + rand(-0.6, 0.6); h.z = this.coopAt.z + rand(0.1, 0.8); h.tx = h.x; h.tz = h.z;
    this.add(p, h.gold ? 3 : 1);
    this.world.fx.emit('sparkle', h.x, 0.9, h.z, h.gold ? 20 : 8, { color: h.gold ? '#fff3a6' : '#ffd66b' });
    this.world.fx.emit('heart', h.x, 1.2, h.z, 1);
    audio.sfx('coin', { volume: 0.7 });
    this.party.buzz(p, [30, 30, 30]);
    p.say(h.gold ? '+3 ★' : '+1', 0.9);
  }

  goal() { return this.hens.length > 0 && this.hens.every((h) => h.home) && this.goldDone; }

  end() {
    super.end();
    for (const p of this.players) if (p.carry) { p.carry.carrier = null; p.carry = null; }
  }

  onLeave(p) { if (p.carry) { p.carry.carrier = null; p.carry = null; } }

  dispose() {
    super.dispose();
    for (const p of this.players) p.carry = null;
  }

  ctxFor(p) {
    if (!this.running) return { a: null, b: 'Hop', hint: this.def.hint };
    if (p.carry) return { a: null, b: 'Hop', hint: 'Carry it to the coop!' };
    const near = this.hens.some((h) => !h.home && !h.carrier && Math.hypot(h.x - p.pos.x, h.z - p.pos.z) < 1.0);
    return { a: near ? 'GRAB!' : 'Grab', b: 'Hop', hint: 'Catch a hen, bring it to the coop' };
  }

  drawLabels(ctx, v) {
    const home = this.hens.filter((h) => h.home).length;
    this.marker(ctx, v, this.coopAt.x, this.coopAt.z, t('Coop {n}/{total}', { n: home, total: this.hens.length }));
  }
}

// ---------------------------------------------------------------------------
// Juniper's Snowball Scramble: A throws (it aims for you a little), jump to
// dodge. Every hit is a point; being hit makes you dizzy for a moment.
// ---------------------------------------------------------------------------
export class SnowballScramble extends MiniGame {
  setup() {
    this.balls = [];
    this.targets = [];
    this.ballGeo = new THREE.IcosahedronGeometry(0.13, 1);
    this.ballMat = this.mat(0xffffff);
    this.shadowGeo = new THREE.CircleGeometry(0.12, 10).rotateX(-Math.PI / 2);
    this.shadowMat = new THREE.MeshBasicMaterial({ color: 0x1b1426, transparent: true, opacity: 0.25, depthWrite: false });
    const n = this.live.length <= 2 ? 3 : 2;
    for (let i = 0; i < n; i++) this.addTarget();
    this.placePlayers(this.def.start, 2.6);
    for (const p of this.players) { p.cool = 0; p.daze = 0; p.knock = null; }
  }

  addTarget() {
    const pos = this.spot({ min: 0.2, max: 0.95, gap: 2.5, avoid: this.players.map((p) => p.pos).concat(this.targets) });
    const res = buildProp(this.r3d, { type: 'snowman', x: pos.x, y: pos.z, scarf: Math.random() < 0.5 });
    res.obj.position.set(pos.x, 0, pos.z);
    res.obj.scale.setScalar(0.01);
    this.root.add(res.obj);
    const tg = { x: pos.x, z: pos.z, obj: res.obj, grow: 0, alive: true };
    this.targets.push(tg);
    return tg;
  }

  tick(dt) {
    const col = this.world.overCol;
    for (const p of this.players) {
      if (p.cool > 0) p.cool -= dt;
      if (p.daze > 0) { p.daze -= dt; p.frozen = p.daze > 0; if (p.daze <= 0) p.actor.expr = null; }
      if (p.knock) {
        p.knock.t -= dt;
        col.move(p.actor.pos, p.knock.vx * dt, p.knock.vz * dt, p.actor.radius);
        if (p.knock.t <= 0) p.knock = null;
      }
      if (p.throwT > 0 && (p.throwT -= dt) <= 0) p.actor.armPose = undefined;
      if (p.connected && p.daze <= 0 && p.cool <= 0 && p.input.pressed('a')) this.throwBall(p);
    }
    // snowballs
    for (const b of this.balls) {
      b.vy -= 13 * dt;
      b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
      b.mesh.position.set(b.x, b.y, b.z);
      b.shadow.position.set(b.x, 0.03, b.z);
      if (b.y <= 0.08 || !this.walkableAir(b.x, b.z)) { this.splat(b); continue; }
      for (const q of this.players) {
        if (q === b.owner || !q.connected) continue;
        if (q.actor.jumpY > 0.45) continue; // dodged it!
        if (Math.hypot(q.pos.x - b.x, q.pos.z - b.z) < 0.48 && b.y < 1.75 + q.actor.jumpY) { this.hit(b, q); break; }
      }
      if (b.dead) continue;
      for (const tg of this.targets) {
        if (!tg.alive || tg.grow < 0.9) continue;
        if (Math.hypot(tg.x - b.x, tg.z - b.z) < 0.5 && b.y < 1.5) { this.hitTarget(b, tg); break; }
      }
    }
    this.balls = this.balls.filter((b) => !b.dead);
    for (const tg of this.targets) {
      if (tg.alive) { tg.grow = Math.min(1, tg.grow + dt * 2.5); tg.obj.scale.setScalar(0.01 + tg.grow * 0.99); }
      else { tg.respawn -= dt; if (tg.respawn <= 0) { this.root.remove(tg.obj); tg.dead = true; } }
    }
    const before = this.targets.length;
    this.targets = this.targets.filter((tg) => !tg.dead);
    for (let i = this.targets.length; i < before; i++) this.addTarget();
  }

  walkableAir(x, z) { return !this.world.overCol.blocked(x, z, 0.05); }

  throwBall(p) {
    const a = p.actor;
    let dx = a.dir.x, dz = a.dir.z;
    // a little aim assist: lock onto the best target in a cone ahead
    let best = null, bs = 0;
    const cands = this.players.filter((q) => q !== p && q.connected).map((q) => ({ x: q.pos.x + q.vel.x * 0.18, z: q.pos.z + q.vel.z * 0.18 }))
      .concat(this.targets.filter((tg) => tg.alive && tg.grow > 0.9));
    for (const c of cands) {
      const ex = c.x - a.pos.x, ez = c.z - a.pos.z, d = Math.hypot(ex, ez);
      if (d < 0.5 || d > 9.5) continue;
      const cos = (ex * dx + ez * dz) / d;
      if (cos < 0.84) continue;
      const s = cos * 2 - d * 0.08;
      if (s > bs) { bs = s; best = { x: ex / d, z: ez / d, d }; }
    }
    const dist = best ? best.d : 7;
    if (best) { dx = best.x; dz = best.z; a.dir = { x: dx, z: dz }; a.model.targetFacing = Math.atan2(dx, dz); }
    const sp = 9.5, tFlight = dist / sp;
    const b = {
      owner: p, x: a.pos.x + dx * 0.35, y: 1.1 + (a.baseY || 0) + a.jumpY, z: a.pos.z + dz * 0.35,
      vx: dx * sp, vz: dz * sp, vy: Math.max(1.2, (0.9 - 1.1 + 0.5 * 13 * tFlight * tFlight) / Math.max(0.2, tFlight)),
    };
    b.mesh = new THREE.Mesh(this.ballGeo, this.ballMat);
    b.mesh.castShadow = true;
    b.shadow = new THREE.Mesh(this.shadowGeo, this.shadowMat);
    this.root.add(b.mesh, b.shadow);
    this.balls.push(b);
    p.cool = 0.5;
    p.throwT = 0.18;
    a.armPose = -2.7;
    audio.sfx('whoosh', { volume: 0.35 });
  }

  splat(b) {
    b.dead = true;
    this.root.remove(b.mesh, b.shadow);
    this.world.fx.emit('dust', b.x, 0.1, b.z, 5, { color: '#ffffff' });
  }

  hit(b, q) {
    this.splat(b);
    this.add(b.owner, 1);
    q.daze = 1.1; q.frozen = true; q.actor.expr = 'surprised';
    const l = Math.hypot(b.vx, b.vz) || 1;
    q.knock = { vx: (b.vx / l) * 3.2, vz: (b.vz / l) * 3.2, t: 0.28 };
    q.setEmote('sparkle', 1.1);
    q.hits = (q.hits || 0) + 1;
    this.world.fx.emit('dust', q.pos.x, 1.0, q.pos.z, 12, { color: '#ffffff' });
    audio.sfx('hit', { volume: 0.8 });
    this.party.buzz(q, [60, 30, 60]);
    this.party.buzz(b.owner, 20);
    b.owner.say('+1', 0.7);
  }

  hitTarget(b, tg) {
    this.splat(b);
    this.add(b.owner, 1);
    tg.alive = false; tg.respawn = 0.35;
    this.world.fx.emit('dust', tg.x, 0.8, tg.z, 18, { color: '#ffffff' });
    this.world.fx.emit('sparkle', tg.x, 1.2, tg.z, 6, { color: '#9fd0f5' });
    audio.sfx('hit', { volume: 0.6 });
    this.party.buzz(b.owner, 20);
    b.owner.say('+1', 0.7);
  }

  end() {
    super.end();
    for (const p of this.players) { p.daze = 0; p.knock = null; p.actor.expr = null; p.actor.armPose = undefined; }
  }

  ctxFor(p) {
    if (!this.running) return { a: null, b: 'Hop', hint: this.def.hint };
    if (p.daze > 0) return { a: null, b: null, hint: 'Brrr! Seeing stars…' };
    return { a: 'Throw', b: 'Dodge', hint: 'Hit friends & snowmen · jump to dodge' };
  }
}

// ---------------------------------------------------------------------------
// Ivy's Acorn Hunt: jump into leaf piles — some hide acorns, a few are golden.
// ---------------------------------------------------------------------------
export class AcornHunt extends MiniGame {
  setup() {
    // the hollow's own piles make way for the game's
    this.hidden = [];
    for (const lp of this.world.over.leafpiles || []) {
      if (((lp.x - this.center.x) / (this.bounds.rx + 3)) ** 2 + ((lp.z - this.center.z) / (this.bounds.rz + 3)) ** 2 < 1) { lp.obj.visible = false; this.hidden.push(lp); }
    }
    this.piles = [];
    const n = Math.min(14, 7 + this.live.length);
    for (let i = 0; i < n; i++) {
      const pos = this.spot({ min: 0.1, max: 0.95, gap: 2.1, avoid: this.piles, tiles: [TT.LEAVES, TT.GRASS, TT.FOREST, TT.PATH], r: 0.45 });
      const res = buildProp(this.r3d, { type: 'leafpile', x: pos.x, y: pos.z });
      const pile = new THREE.Group();
      pile.position.set(pos.x, 0, pos.z);
      res.obj.position.set(0, 0, 0);
      res.obj.scale.setScalar(1.35);
      pile.add(res.obj);
      // bright leaves on top and a dark rim so piles stand out on the leafy ground
      for (let k = 0; k < 7; k++) {
        const a = Math.random() * Math.PI * 2, d = Math.random() * 0.35;
        const leaf = this.box(0.2, 0.05, 0.15, pick([0xf6c65b, 0xe0405a, 0xfff0a0, 0xd9543c]), Math.cos(a) * d, 0.34 + Math.random() * 0.06, Math.sin(a) * d * 0.8, pile);
        leaf.rotation.set(Math.random() * 0.5, Math.random() * 3, Math.random() * 0.5);
      }
      const rim = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.78, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x5a2a1a, transparent: true, opacity: 0.35, depthWrite: false }));
      rim.position.y = 0.02; rim.scale.set(1, 1, 0.85);
      pile.add(rim);
      this.root.add(pile);
      this.piles.push({ x: pos.x, z: pos.z, obj: pile, full: true, grow: 1, regrow: 0, prize: this.roll(), wob: 0 });
    }
    this.flying = [];
    this.acornGeo = new THREE.IcosahedronGeometry(0.11, 0);
    this.placePlayers();
  }

  roll() { const r = Math.random(); return r < 0.1 ? 'gold' : r < 0.52 ? 'acorn' : 'none'; }

  onLand(p) {
    if (!this.running) return;
    let best = null, bd = 0.95;
    for (const pl of this.piles) {
      if (!pl.full) continue;
      const d = Math.hypot(pl.x - p.pos.x, pl.z - p.pos.z);
      if (d < bd) { bd = d; best = pl; }
    }
    if (best) this.burst(best, p);
  }

  burst(pl, p) {
    pl.full = false; pl.grow = 0.15; pl.regrow = 4.2;
    this.world.fx.emit('burst', pl.x, 0.3, pl.z, 24);
    audio.sfx('whoosh', { volume: 0.45 });
    if (pl.prize === 'none') { p.setEmote('question', 1); return; }
    const gold = pl.prize === 'gold';
    const m = new THREE.Mesh(this.acornGeo, this.mat(gold ? 0xf6c65b : 0x9a6440, gold ? 0xa07818 : null));
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.2), this.mat(0x6b4330));
    cap.position.y = 0.09; m.add(cap);
    m.scale.set(1, 1.25, 1);
    m.position.set(pl.x, 0.4, pl.z);
    this.root.add(m);
    this.flying.push({ m, p, t: 0, x: pl.x, z: pl.z, gold });
    this.add(p, gold ? 3 : 1);
    p.say(gold ? '+3 ★' : '+1', 0.9);
    audio.sfx(gold ? 'shard' : 'coin', { volume: 0.6 });
    this.party.buzz(p, gold ? [40, 30, 40, 30, 40] : 30);
    if (gold) this.world.fx.emit('sparkle', pl.x, 1, pl.z, 16, { color: '#fff3a6' });
  }

  tick(dt) {
    for (const pl of this.piles) {
      if (!pl.full) {
        pl.regrow -= dt;
        if (pl.regrow <= 0) { pl.full = true; pl.prize = this.roll(); this.world.fx.emit('burst', pl.x, 0.2, pl.z, 6); }
      }
      pl.grow += ((pl.full ? 1 : 0.15) - pl.grow) * Math.min(1, dt * 6);
      if (pl.full && Math.random() < dt * 0.35) this.world.fx.emit('sparkle', pl.x + rand(-0.3, 0.3), 0.5, pl.z, 1, { color: '#fff3a6' });
      // rustle when someone brushes past
      const near = this.players.some((p) => Math.hypot(p.pos.x - pl.x, p.pos.z - pl.z) < 0.7 && p.actor.moving);
      pl.wob = near ? Math.min(1, pl.wob + dt * 4) : Math.max(0, pl.wob - dt * 3);
      const w = Math.sin(this.party.t * 18) * 0.06 * pl.wob;
      pl.obj.scale.set(1 + w, pl.grow, 1 - w);
    }
    for (const f of this.flying) {
      f.t += dt;
      const k = Math.min(1, f.t / 0.55);
      const tx = f.p.pos.x, tz = f.p.pos.z;
      f.m.position.set(f.x + (tx - f.x) * k, 0.4 + Math.sin(k * Math.PI) * 1.4 + k * 1.2, f.z + (tz - f.z) * k);
      f.m.rotation.y += dt * 10;
      if (k >= 1) { this.root.remove(f.m); f.done = true; }
    }
    this.flying = this.flying.filter((f) => !f.done);
  }

  dispose() {
    super.dispose();
    for (const lp of this.hidden) lp.obj.visible = true;
  }

  ctxFor(p) {
    void p;
    if (!this.running) return { a: null, b: 'Hop', hint: this.def.hint };
    return { a: null, b: 'Jump in!', hint: 'Jump into leaf piles to find acorns' };
  }
}

// ---------------------------------------------------------------------------
// Finn's Koi Catch: cast (A), wait for the bite — your phone buzzes — then
// press A, quick! Golden koi are worth three.
// ---------------------------------------------------------------------------
export class KoiCatch extends MiniGame {
  setup() {
    this.lines = new Map();
    this.bobGeo = new THREE.SphereGeometry(0.07, 8, 6);
    this.placeAroundPond();
    for (const p of this.players) this.lines.set(p.slot, { state: 'idle', t: 0 });
  }

  placeAroundPond() {
    const ps = this.players, n = ps.length;
    const P = KOI_POND;
    ps.forEach((p, i) => {
      // spread around the pond edge, skipping the bridge (it runs north–south)
      let spot = null;
      for (let k = 0; k < 40 && !spot; k++) {
        const a = ((i + k * 0.37) / Math.max(1, n)) * Math.PI * 2 + 0.3;
        if (Math.abs(Math.cos(a)) < 0.25) continue;
        const x = P.x + Math.cos(a) * (P.rx + 1.1), z = P.z + Math.sin(a) * (P.rz + 1.0);
        if (this.walkable(x, z)) spot = { x, z };
      }
      spot = spot || this.spot({ max: 0.9 });
      p.actor.pos = spot;
      const dx = P.x - spot.x, dz = P.z - spot.z, l = Math.hypot(dx, dz) || 1;
      p.actor.dir = { x: dx / l, z: dz / l };
      p.actor.model.targetFacing = Math.atan2(dx / l, dz / l);
    });
    this.party.cam.snap(this.party.camPlayers());
  }

  // the first bit of pond in front of you
  waterAhead(p) {
    const a = p.actor;
    for (let d = 0.9; d <= 3; d += 0.2) {
      const x = a.pos.x + a.dir.x * d, z = a.pos.z + a.dir.z * d;
      const m = this.world.mapData;
      if (this.world.tileAt(x, z) === TT.WATER && !(m.noPier && m.noPier.has(Math.floor(x) + ',' + Math.floor(z)))) {
        const k = d + 0.6;
        return { x: a.pos.x + a.dir.x * k, z: a.pos.z + a.dir.z * k };
      }
    }
    return null;
  }

  tick(dt) {
    const koi = this.world.critters.list.filter((c) => c.kind === 'koi');
    for (const p of this.players) {
      let L = this.lines.get(p.slot);
      if (!L) { L = { state: 'idle', t: 0 }; this.lines.set(p.slot, L); }
      const A = p.connected && p.input.pressed('a');
      if (L.state === 'idle') {
        p.frozen = false;
        p.actor.model.setProp(null); p.actor.armPose = undefined;
        if (A) {
          const w = this.waterAhead(p);
          if (!w) { p.say(t('Face the pond!'), 1); continue; }
          L.state = 'wait'; L.at = w;
          const nearKoi = koi.some((c) => Math.hypot(c.x - w.x, c.z - w.z) < 1.6);
          L.t = rand(1.4, 4.2) * (nearKoi ? 0.6 : 1);
          L.bob = new THREE.Mesh(this.bobGeo, this.mat(0xe0405a));
          L.bob.position.set(w.x, 0.06, w.z);
          this.root.add(L.bob);
          this.world.fx.emit('splash', w.x, 0.05, w.z, 4);
          audio.sfx('cast', { volume: 0.5 });
        }
      } else if (L.state === 'wait') {
        p.frozen = true; p.actor.model.setProp('rod'); p.actor.armPose = -0.9;
        L.t -= dt;
        L.bob.position.y = 0.06 + Math.sin(this.party.t * 3 + p.slot) * 0.02;
        if (A) { this.reel(p, L); p.say(t('Too soon!'), 0.9); continue; }
        if (L.t <= 0) {
          L.state = 'bite'; L.t = 0.8;
          p.setEmote('exclaim', 0.8);
          this.party.buzz(p, [90, 40, 90]);
          audio.sfx('bite', { volume: 0.6 });
          this.world.fx.emit('splash', L.at.x, 0.05, L.at.z, 3);
        }
      } else if (L.state === 'bite') {
        L.t -= dt;
        L.bob.position.y = -0.04 + Math.sin(this.party.t * 30) * 0.03;
        if (A) {
          const r = Math.random();
          const kind = r < 0.04 ? 'ancient' : r < 0.18 ? 'golden' : 'koi';
          const n = kind === 'ancient' ? 5 : kind === 'golden' ? 3 : 1;
          this.add(p, n);
          p.say(kind === 'ancient' ? t('ANCIENT KOI! +5') : kind === 'golden' ? t('Golden koi! +3') : t('Koi! +1'), 1.3);
          p.fish = (p.fish || 0) + 1;
          this.world.fx.emit('splash', L.at.x, 0.1, L.at.z, 10);
          this.world.fx.emit('sparkle', p.pos.x, 1.8, p.pos.z, kind === 'koi' ? 5 : 16, { color: kind === 'koi' ? '#ffb07a' : '#fff3a6' });
          audio.sfx('reel', { volume: 0.5 });
          audio.sfx(kind === 'koi' ? 'coin' : 'shard', { volume: 0.6 });
          this.party.buzz(p, 30);
          this.reel(p, L, kind);
        } else if (L.t <= 0) { this.reel(p, L); p.say(t('It got away…'), 1); }
      } else if (L.state === 'show') {
        L.t -= dt;
        if (L.t <= 0) L.state = 'idle';
      }
    }
  }

  reel(p, L, caught = null) {
    if (L.bob) this.root.remove(L.bob);
    L.bob = null;
    L.state = caught ? 'show' : 'idle';
    L.t = caught ? 0.7 : 0;
    L.caught = caught;
  }

  end() {
    super.end();
    for (const p of this.players) { const L = this.lines.get(p.slot); if (L) this.reel(p, L); p.actor.model.setProp(null); p.actor.armPose = undefined; }
  }

  ctxFor(p) {
    if (!this.running) return { a: null, b: 'Hop', hint: this.def.hint };
    const L = this.lines.get(p.slot) || { state: 'idle' };
    if (L.state === 'wait') return { a: 'Reel in', b: null, hint: 'Wait for the bite… (your phone buzzes)' };
    if (L.state === 'bite') return { a: 'NOW!!', b: null, hint: 'A BITE! Press A!' };
    return { a: 'Cast', b: 'Hop', hint: 'Face the pond and cast your line' };
  }

  // fishing lines from rod tip to bobber
  drawWorld(wctx, v) {
    for (const p of this.players) {
      const L = this.lines.get(p.slot);
      if (!L || !L.bob) continue;
      const a = p.actor;
      const s = v.project(a.pos.x + a.dir.x * 0.45, 1.05 + (a.baseY || 0), a.pos.z + a.dir.z * 0.45);
      const e = v.project(L.bob.position.x, L.bob.position.y + 0.05, L.bob.position.z);
      const n = Math.ceil(Math.hypot(e.x - s.x, e.y - s.y));
      wctx.fillStyle = 'rgba(240,240,250,0.8)';
      for (let i = 0; i <= n; i++) { const k = i / n; wctx.fillRect(Math.round(s.x + (e.x - s.x) * k), Math.round(s.y + (e.y - s.y) * k + Math.sin(k * Math.PI) * 3), 1, 1); }
    }
  }

  drawLabels(ctx, v) {
    for (const p of this.players) {
      const L = this.lines.get(p.slot);
      if (!L || L.state !== 'show' || !L.caught) continue;
      const u = this.party.toUi(v, p.pos.x, 2.3, p.pos.z);
      drawFish(ctx, u.x, u.y - 8, L.caught);
    }
  }
}

function drawFish(ctx, x, y, kind) {
  const c = kind === 'koi' ? ['#f0934a', '#fff3e6'] : kind === 'golden' ? ['#f6c65b', '#fff3a6'] : ['#b9a2e3', '#fff3c4'];
  const g = ['..##....', '.####..#', '########', '.####..#', '..##....'];
  for (let j = 0; j < g.length; j++) for (let i = 0; i < 8; i++) if (g[j][i] === '#') { ctx.fillStyle = (i + j) % 3 === 0 ? c[1] : c[0]; ctx.fillRect(Math.round(x - 8 + i * 2), Math.round(y + j * 2), 2, 2); }
}

// ---------------------------------------------------------------------------
// Mabel's Star Stones (co-op): glowing stars appear on the ground — everyone
// must stand on one at the same time. Three rounds, then all jump together.
// ---------------------------------------------------------------------------
export class StarStones extends MiniGame {
  setup() {
    this.coop = true;
    this.round = 0;
    this.pads = [];
    this.stage = 'pads';
    this.hold = 0;
    this.padGeo = new THREE.CylinderGeometry(0.58, 0.58, 0.06, 5);
    this.glowMat = new THREE.SpriteMaterial({ map: this.party.lighting.glowTex, color: 0xffd66b, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 });
    this.placePlayers(this.def.start, 1.4);
  }

  begin() { super.begin(); this.nextRound(); }

  nextRound() {
    for (const pd of this.pads) this.root.remove(pd.m);
    this.pads = [];
    this.round++;
    this.hold = 0;
    if (this.round > 3) {
      this.stage = 'jump';
      this.jumpWin = 0;
      this.party.showBanner(t('Everyone jump together!'), t('all at the same time…'));
      audio.sfx('bell', { volume: 0.6 });
      return;
    }
    const n = Math.max(1, this.live.length);
    const ranges = [[0.35, 0.62], [0.5, 0.85], [0.3, 0.95]];
    const [a, b] = ranges[this.round - 1];
    const crowd = this.live.map((p) => ({ x: p.pos.x, z: p.pos.z }));
    for (let i = 0; i < n; i++) {
      // not right under somebody's feet: make people move for it
      const avoid = this.round === 1 ? this.pads.concat(crowd) : this.pads;
      const pos = this.spot({ min: a, max: b, gap: this.round === 3 ? 3.2 : 1.7, avoid, r: 0.3 });
      const m = new THREE.Mesh(this.padGeo, new THREE.MeshToonMaterial({ color: 0xfff3c4, emissive: 0xffd66b, emissiveIntensity: 0.9, gradientMap: this.r3d.gradient }));
      m.position.set(pos.x, 0.04, pos.z);
      m.rotation.y = Math.random() * Math.PI;
      const glow = new THREE.Sprite(this.glowMat.clone());
      glow.scale.set(2, 2, 1); glow.position.y = 0.3;
      m.add(glow);
      m.userData.glow = glow;
      this.root.add(m);
      this.pads.push({ x: pos.x, z: pos.z, m, who: null, drift: this.round === 3 ? { a: Math.random() * 6, r: 0.8 } : null, ox: pos.x, oz: pos.z });
      this.world.fx.emit('sparkle', pos.x, 0.5, pos.z, 6, { color: '#fff3a6' });
    }
    audio.sfx('sparkle', { volume: 0.5 });
  }

  tick(dt) {
    const live = this.live;
    if (this.stage === 'pads') {
      const taken = new Set();
      let all = true;
      for (const pd of this.pads) {
        if (pd.drift) { pd.drift.a += dt * 0.6; pd.x = pd.ox + Math.cos(pd.drift.a) * pd.drift.r; pd.z = pd.oz + Math.sin(pd.drift.a) * pd.drift.r * 0.7; pd.m.position.set(pd.x, 0.04, pd.z); }
        let who = null, bd = 0.55;
        for (const p of live) {
          if (taken.has(p)) continue;
          const d = Math.hypot(p.pos.x - pd.x, p.pos.z - pd.z);
          if (d < bd) { bd = d; who = p; }
        }
        if (who) taken.add(who);
        if (who !== pd.who) {
          pd.who = who;
          pd.m.material.color.set(who ? who.color : '#fff3c4'); pd.m.material.emissive.set(who ? who.color : '#ffd66b');
          pd.m.userData.glow.material.color.set(who ? who.color : '#ffd66b');
          if (who) audio.sfx('select', { volume: 0.4 });
        }
        pd.m.rotation.y += dt * (who ? 3 : 0.8);
        if (!who) all = false;
      }
      this.hold = all && this.pads.length ? this.hold + dt : 0;
      if (this.hold > 0.6) {
        for (const p of live) this.add(p, 1);
        for (const pd of this.pads) this.world.fx.emit('sparkle', pd.x, 0.6, pd.z, 10, { color: pd.who ? pd.who.color : '#fff3a6' });
        audio.sfx('shard', { volume: 0.6 });
        this.party.toast(t('Round {n} complete!', { n: this.round }), '#ffd66b');
        for (const p of live) this.party.buzz(p, 40);
        this.nextRound();
      }
    } else if (this.stage === 'jump') {
      const up = live.filter((p) => p.actor.jumpY > 0.25).length;
      if (up === live.length && live.length) {
        this.success = true;
        for (const p of live) this.add(p, 2);
        const c = this.center;
        for (let i = 0; i < 5; i++) this.world.fx.emit('firework', c.x + rand(-2, 2), 3 + Math.random() * 2, c.z + rand(-1, 1), 24, { color: pick(['#ffd66b', '#b9a2e3', '#8fd6b4', '#f4a4b6']) });
        audio.sfx('firework', { volume: 0.7 });
        for (const p of live) this.party.buzz(p, [50, 40, 50, 40, 120]);
      }
    }
  }

  goal() { return !!this.success; }

  results() {
    // one team, one score
    const r = super.results();
    return r.map((x) => ({ ...x, team: true }));
  }

  ctxFor(p) {
    void p;
    if (!this.running) return { a: null, b: 'Hop', hint: this.def.hint };
    if (this.stage === 'jump') return { a: null, b: 'JUMP!', hint: 'Everyone jump at the same time!' };
    return { a: null, b: 'Hop', hint: 'Round {n}/3 · everyone on a glowing star!', vars: { n: this.round } };
  }

  drawLabels(ctx, v) {
    if (this.stage !== 'pads') return;
    for (const pd of this.pads) if (!pd.who) this.marker(ctx, v, pd.x, pd.z, null, '#fff3a6');
  }

  drawUi(ctx) {
    if (!this.running || this.stage !== 'pads') return;
    const W = this.party.display.w;
    const n = this.pads.filter((p) => p.who).length;
    const txt = t('{n}/{total} stars lit', { n, total: this.pads.length });
    drawText(ctx, txt, W / 2, 48, { color: '#fff3c4', align: 'center', outline: '#3b2a2e' });
    void drawEmote;
  }
}

export const GAMES = { hens: HenRoundUp, snow: SnowballScramble, acorns: AcornHunt, koi: KoiCatch, stones: StarStones };
