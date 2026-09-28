// The Festival Ring: Party Mode's grand arena on the Golden Steppe, past the
// valley's west gate. Ring the gong for "Gloom Waves" (co-op, wave after wave
// bursting in through the four gates, a sulky storm cloud every fifth wave,
// blessings between waves), a friendly "Brawl" (everyone for themselves), or
// "King of the Ring" (hold the golden circle alone to score). The crowd
// cheers, does the wave and lobs you treats; now and then Hollis rolls in
// barrels — jump!

import { THREE, toon } from '../render/r3d.js';
import { ENEMIES } from '../combat/enemies.js';
import { BLESSINGS, drawCards } from '../combat/blessings.js';
import { CLASSES } from '../combat/classes.js';
import { drawText, measure } from '../engine/font.js';
import { panel, UI } from '../ui/ui.js';
import { audio } from '../engine/audio.js';
import { t } from '../i18n.js';
import { ARENA_SITE } from '../world/big/layout.js';
import { buildArena, gongSpot, ringAt, tf, GATES } from './arena3d.js';
import { seeThrough } from '../render/seethrough.js';
import { setRegion, REGIONS } from '../saga/levels.js';

export const ARENA = { ...ARENA_SITE };
export const GONG = gongSpot(ARENA);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const ease = (k) => k * k * (3 - 2 * k);
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ the place
export class ArenaSite {
  constructor(party) {
    this.party = party;
    const w = party.world;
    const b = buildArena(party.r3d, ARENA);
    this.b = b;
    this.root = b.group;
    this.cols = b.colliders;
    this.lights = b.lights;
    this.gates = b.gates;
    this.crowd = b.crowd;
    this.ring = 0;
    this.olaT = -1;
    this.near = false;
    this.gifts = [];
    this.M = new THREE.Matrix4();
    w.over.root.add(this.root);
    for (const c of this.cols) w.overCol.add(c);
    // the stands and the announcer's box thin out in front of whoever's behind them (the gong!)
    this.root.traverse((o) => { if (o.isMesh) for (const m of [].concat(o.material || [])) if (!m.transparent) seeThrough(m); });
    // the stands run west → north → east: an unwrapped angle for the Mexican wave
    for (const p of this.crowd.people) p.u = p.a < 1.5 ? p.a + TAU : p.a;
  }

  get gongAt() { return GONG; }
  gate(id) { return this.gates.find((g) => g.id === id); }

  relabel() {}

  // the ring's name over the announcer's box, like a painted sign
  drawLabels(ctx, v) {
    const s = this.b.boxSpot;
    const pp = v.project(s.x, s.y + 1.42, s.z + 1.3);
    if (!v.owns(pp.x, pp.y)) return;
    const u = this.party.display.worldToUi(pp.x, pp.y);
    const txt = t('Festival Ring'), w = measure(txt) + 10;
    const x = Math.round(u.x - w / 2), y = Math.round(u.y - 6);
    ctx.fillStyle = '#3b2a22'; ctx.fillRect(x - 1, y - 1, w + 2, 13);
    ctx.fillStyle = '#8e5d3e'; ctx.fillRect(x, y, w, 11);
    ctx.fillStyle = '#a8744a'; ctx.fillRect(x, y, w, 1);
    drawText(ctx, txt, u.x, y + 2, { color: '#fff3c4', align: 'center' });
  }

  // is any view looking at the ring? (the crowd & flags only move then)
  watched() {
    for (const v of this.party.cam.views || []) if (Math.abs(v.cx - ARENA.x) < 44 && Math.abs(v.cz - ARENA.z) < 34) return true;
    return false;
  }

  // gates: open (1) or shut (0); `openFor` opens one for a moment (gloom coming through)
  setGates(open) { for (const g of this.gates) { g.target = open ? 1 : 0; g.closeAt = 0; } }
  openFor(id, secs) { const g = this.gate(id); if (!g) return; g.target = 1; g.closeAt = this.party.t + secs; }
  // a spot just inside a gate
  gateSpot(g, k = -0.9) { const p = ringAt(ARENA, g.a, k); return { x: p.x + g.tx * rand(-0.8, 0.8), z: p.z + g.tz * rand(-0.8, 0.8) }; }

  update(dt) {
    const P = this.party, time = P.t;
    this.near = this.watched();
    for (const g of this.gates) {
      if (g.closeAt && time > g.closeAt) { g.target = 0; g.closeAt = 0; }
      const d = g.target - g.open;
      if (Math.abs(d) > 1e-3) {
        g.open += Math.sign(d) * Math.min(Math.abs(d), dt * 2.6);
        for (const pv of g.leaves) pv.rotation.y = pv.userData.closed + pv.userData.d * ease(g.open);
        if (!g.moving && this.near) { g.moving = true; audio.sfx('door', { volume: 0.3, pitch: -4 }); }
      } else g.moving = false;
      const shut = g.open < 0.5;
      for (const c of g.cols) c.disabled = !shut;
    }
    if (this.ring > 0) { this.ring -= dt; this.b.gong.rotation.z = Math.sin(this.ring * 40) * 0.08 * this.ring; }
    if (!this.near) return;
    // braziers
    for (const g of this.gates) for (const br of g.braziers) {
      br.fire.scale.set(0.26, 0.26 * (1 + Math.sin(time * 17 + br.x) * 0.18), 0.26);
      br.core.scale.set(0.14, 0.2 * (1 + Math.sin(time * 23 + br.z) * 0.25), 0.14);
      if (Math.random() < dt * 2.2) P.world.fx.emit('sparkle', br.x, 1.05, br.z, 1, { color: '#ffb862' });
    }
    // flags in the breeze
    const pm = this.b.penMesh;
    for (const f of this.b.flags) pm.setMatrixAt(f.i, tf(f.x, f.y, f.z, 0.5 + Math.sin(time * 2.3 + f.ph) * 0.35, f.len, f.len * 0.52, 1, 0, this.M));
    pm.instanceMatrix.needsUpdate = true;
    for (const f of this.b.flagsBox) f.rotation.y = Math.sin(time * 2.6 + f.position.x) * 0.4;
    for (const g of this.gates) for (const f of g.flags || []) f.rotation.y = (f.rotation.y > 1.5 ? Math.PI : 0) + Math.sin(time * 2.4 + f.position.x) * 0.35;
    // the crowd: hops settle, the wave rolls round the stands
    const ola = this.olaT >= 0 ? 2.3 + (this.olaT / 2.6) * 4.8 : -9;
    if (this.olaT >= 0) { this.olaT += dt; if (this.olaT > 2.8) this.olaT = -1; }
    for (const p of this.crowd.people) {
      if (p.jv || p.jump > 0) { p.jv -= 14 * dt; p.jump += p.jv * dt; if (p.jump <= 0) { p.jump = 0; p.jv = 0; } }
      else if (Math.random() < dt * 0.02) p.jv = 1.6;             // someone always fidgets
      p.wave = ola > 0 ? Math.max(0, 1 - Math.abs(p.u - ola) / 0.32) * 0.32 : 0;
    }
    this.crowd.pose(time);
    // the bouncy drums
    for (const d of this.b.drums) if (d.squash > 0) { d.squash = Math.max(0, d.squash - dt * 4); d.grp.scale.set(1 + d.squash * 0.15, 1 - d.squash * 0.45, 1 + d.squash * 0.15); }
    for (const p of P.players) this.drumCheck(p);
    this.updateGifts(dt);
  }

  // step on a festival drum: boing!
  drumCheck(p) {
    const a = p.actor;
    if (!a || p.hidden || p.swimming || p.vehicle || (p.fighter && p.fighter.down)) return;
    if (a.jumpY > 0.05 || (p.drumCd || 0) > this.party.t) return;
    for (const d of this.b.drums) {
      if (Math.hypot(a.pos.x - d.x, a.pos.z - d.z) > d.r - 0.12) continue;
      a.jumpV = 10.5; a.jumps = 1;
      p.drumCd = this.party.t + 0.35;
      d.squash = 1;
      audio.sfx('boing', { volume: 0.7 });
      audio.sfx('slam', { volume: 0.25, pitch: -8 });
      this.party.world.fx.emit('ring', d.x, 0.35, d.z, 1, { color: '#fff3c4' });
      this.party.buzz(p, 25);
      break;
    }
  }

  // the crowd cheers (k: how much)
  cheer(k = 1) {
    for (const p of this.crowd.people) if (p.jump <= 0 && Math.random() < 0.25 + k * 0.45) p.jv = 2.2 + Math.random() * 1.4 * Math.min(1.5, k);
    if (k >= 1 && this.near) audio.sfx('cheer', { volume: 0.55 });
  }
  ola() { this.olaT = 0; if (this.near) audio.sfx('cheer', { volume: 0.4, pitch: 3 }); }

  // a spectator lobs a wrapped treat into the ring; `land(x, z)` when it arrives
  lob(to, land) {
    const people = this.crowd.people;
    if (!people.length) return;
    const from = pick(people);
    from.jv = 3;
    const m = giftMesh(this.party.r3d);
    m.position.set(from.x, from.y + 0.8, from.z);
    this.root.add(m);
    this.gifts.push({ x0: from.x, y0: from.y + 0.8, z0: from.z, x1: to.x, z1: to.z, t: 0, dur: 1.0, m, land });
    audio.sfx('whoosh', { volume: 0.35, pitch: 6 });
  }

  updateGifts(dt) {
    for (const g of this.gifts) {
      g.t += dt;
      const k = Math.min(1, g.t / g.dur);
      g.m.position.set(g.x0 + (g.x1 - g.x0) * k, g.y0 * (1 - k) + 0.3 + Math.sin(k * Math.PI) * 3.2, g.z0 + (g.z1 - g.z0) * k);
      g.m.rotation.y += dt * 8; g.m.rotation.x += dt * 5;
      if (Math.random() < dt * 20) this.party.world.fx.emit('sparkle', g.m.position.x, g.m.position.y, g.m.position.z, 1, { color: '#fff3a6' });
      if (k >= 1) {
        g.done = true;
        this.root.remove(g.m);
        this.party.world.fx.emit('poof', g.x1, 0.3, g.z1, 6, { color: '#fff3c4' });
        audio.sfx('poof', { volume: 0.4 });
        if (g.land) g.land(g.x1, g.z1);
      }
    }
    this.gifts = this.gifts.filter((g) => !g.done);
  }

  bong() {
    this.ring = 1.2;
    audio.sfx('bell', { volume: 0.9 });
    audio.sfx('slam', { volume: 0.5 });
    this.party.world.fx.emit('ring', GONG.x, 1.05, GONG.z + 0.1, 1, { color: '#ffd66b' });
  }

  inside(x, z, k = 1) { return ((x - ARENA.x) / (ARENA.rx * k)) ** 2 + ((z - ARENA.z) / (ARENA.rz * k)) ** 2 < 1; }

  dispose() {
    const w = this.party.world;
    w.over.root.remove(this.root);
    for (const c of this.cols) w.overCol.remove(c);
    for (const g of this.gifts) this.root.remove(g.m);
    this.gifts = [];
  }
}

// a little wrapped present with a ribbon
function giftMesh(r3d) {
  const g = new THREE.Group();
  const c = pick(['#ef6479', '#5aa8f2', '#62c46c', '#b88cf0']);
  const m = (col) => toon(r3d, { color: col, key: 'gift' + col });
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.3), m(c)); g.add(b);
  const r1 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.07), m('#fff3c4')); g.add(r1);
  const r2 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.28, 0.32), m('#fff3c4')); g.add(r2);
  const bow = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.14), m('#f4c542')); bow.position.y = 0.17; g.add(bow);
  return g;
}

// a rolling barrel (axis along z, it rolls along x)
function barrelMesh(r3d) {
  const g = new THREE.Group();
  const m = (col) => toon(r3d, { color: col, key: 'barrel' + col });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.78, 12), m('#a8744a'));
  body.rotation.x = Math.PI / 2; body.castShadow = true; g.add(body);
  for (const z of [-0.26, 0.26]) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.07, 12), m('#4a3d48')); h.rotation.x = Math.PI / 2; h.position.z = z; g.add(h); }
  for (const z of [-0.395, 0.395]) { const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.02, 12), m('#8a5c3a')); lid.rotation.x = Math.PI / 2; lid.position.z = z; g.add(lid); }
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.86, 0.8), m('#ef6479')); g.add(stripe);
  return g;
}

// what each wave brings
function waveList(n, players) {
  if (n % 5 === 0) {
    const out = [{ type: 'boss', hp: 1 + (n / 5 - 1) * 0.6 }];
    if (n >= 10) for (let i = 0; i < 2 + players; i++) out.push({ type: 'gloomling' });
    return out;
  }
  const pool = ['gloomling'];
  if (n >= 2) pool.push('fox');
  if (n >= 3) pool.push('puffcap');
  if (n >= 4) pool.push('crow');
  if (n >= 6) pool.push('stag', 'biggloom');
  if (n >= 7) pool.push('shellback');
  let budget = 2 + n * 2 + players * (0.6 + n * 0.45);
  const out = [];
  // each new kind shows up at least once the wave it arrives
  const fresh = { 2: 'fox', 3: 'puffcap', 4: 'crow', 6: 'stag', 7: 'shellback' }[n];
  if (fresh) { out.push({ type: fresh }); budget -= ENEMIES[fresh].cost; }
  while (budget > 0.5) {
    const ty = Math.random() < 0.35 ? 'gloomling' : pick(pool);
    out.push({ type: ty });
    budget -= ENEMIES[ty].cost;
  }
  return out.sort(() => Math.random() - 0.5);
}

// barrel lanes (offsets from the centre, clear of the pillars)
const LANES = [-6.8, -1.6, 6.3];

// ------------------------------------------------------------------ the act
export class ArenaAct {
  constructor(party, { mode = 'waves', parent = null } = {}) {
    this.party = party;
    this.mode = mode;           // 'waves' | 'brawl' | 'king'
    this.parent = parent;       // the exploration we came from (resumed after)
    this.objective = '';
    this.music = 'festival';
    this.holdClock = true;
    this.wave = 0;
    this.queue = [];
    this.spawnT = 0;
    this.stage = 'intro';       // intro | fight | break | over
    this.overlay = null;
    this.cards = new Map();     // slot -> [blessing ids] offered this break
    this.pickSeq = 1000;
    this.crowd = [];
    this.time = 0;
    this.barrels = [];
    this.giftT = 12;
    this.barrelT = 26;
    this.king = null;
    this.quietZones = true;     // no "new place discovered" banners in the ring
  }

  // the camera frames the ring: stands, the announcer's box, the south wall
  camFocus() { const A = ARENA; return { x0: A.x - A.rx - 4.2, x1: A.x + A.rx + 4.2, z0: A.z - A.rz - 7.5, z1: A.z + A.rz + 1.6 }; }

  get site() { return this.party.arena; }
  get combat() { return this.party.combat; }
  get pvp() { return this.mode !== 'waves'; }

  async start() {
    const P = this.party;
    P.busy++;
    for (const p of P.players) { p.brawlKos = 0; p.kingPts = 0; }
    // (World v7: the Ring fights at the heroes' own level, whatever the land around it)
    const lvs = P.players.filter((p) => p.connected).map((p) => (p.fighter ? p.fighter.level : P.profileOf(p).level || 1));
    this.ringLv = Math.max(1, Math.round(lvs.reduce((a, b) => a + b, 0) / Math.max(1, lvs.length)));
    setRegion('ring', { x0: ARENA.x - ARENA.rx - 8, z0: ARENA.z - ARENA.rz - 8, x1: ARENA.x + ARENA.rx + 8, z1: ARENA.z + ARENA.rz + 8 }, [this.ringLv, this.ringLv]);
    await P.fadeTo(1, 0.45);
    // everyone steps into the ring
    const n = P.players.length;
    P.players.forEach((p, i) => {
      const a = (i / Math.max(1, n)) * TAU + 0.4;
      p.actor.pos = { x: ARENA.x + Math.cos(a) * ARENA.rx * 0.3, z: ARENA.z + Math.sin(a) * ARENA.rz * 0.3 };
      p.actor.dir = { x: -Math.cos(a), z: -Math.sin(a) };
    });
    P.cam.snap(P.camPlayers());
    this.fillStands();
    this.site.setGates(false);
    const C = P.startCombat({ pvp: this.pvp });
    C.bounds = { x: ARENA.x, z: ARENA.z, rx: ARENA.rx - 0.45, rz: ARENA.rz - 0.45 };
    C.onKill = (e, p) => this.onKill(e, p);
    C.onDown = (q, from) => this.onDown(q, from);
    C.onAllDown = () => this.defeat();
    C.canAct = () => this.stage === 'fight';
    // (Party Mode's clock skips to the evening; the solo game's day keeps its own time)
    if (!P.solo && (this.party.state.hour > 18.5 || this.party.state.hour < 7)) this.party.state.hour = 17.2;
    // let the ground around the ring paint before the lights come up
    for (let i = 0; i < 40 && P.big && !P.big.ready(ARENA.x, ARENA.z, 20); i++) await P.wait(0.05);
    await P.fadeTo(0, 0.5);
    this.site.bong();
    this.site.cheer(1);
    if (this.mode === 'brawl') {
      P.showBanner(t('Brawl!'), t('friendly free-for-all · 2 minutes'));
      await this.announce('Ladies, gentlemen and chickens! A friendly brawl! Last one standing gets… well, bragging rights!');
      P.busy--;
      await this.countdown();
      this.time = 120;
      this.powerT = 6;
      this.stage = 'fight';
    } else if (this.mode === 'king') {
      P.showBanner(t('King of the Ring'), t('hold the golden circle — alone! · 2 minutes'));
      await this.announce('King of the Ring! Stand in the golden circle — alone! — to score. Push your friends out! It moves, so keep up!');
      P.busy--;
      this.kingSetup();
      await this.countdown();
      this.time = 120;
      this.powerT = 8;
      this.stage = 'fight';
    } else {
      P.showBanner(t('Gloom Waves'), P.solo ? t('hold the ring as long as you can') : t('hold the ring together'));
      await this.announce('The gloom is coming for the Festival Ring! Hold them off, friends — every fifth wave, something big and grumpy shows up.');
      P.busy--;
      this.nextWave();
    }
  }

  // Hollis, master of ceremonies
  announce(text) { return this.party.say('hollis', text); }

  // Hollis up in his box, the villagers in the front row
  fillStands() {
    const P = this.party, S = this.site;
    this.crowd = [];
    const bx = S.b.boxSpot;
    const h = P.spawnNpc('hollis', bx.x, bx.z, { x: 0, z: 1 });
    h.restDir = { x: 0, z: 1 };
    h.seatY = bx.y;
    this.crowd.push(h);
    ['pip', 'rosa', 'sol', 'ivy', 'bram', 'wren', 'theo'].forEach((id, i) => {
      const s = S.b.vip[i];
      if (!s) return;
      const face = { x: ARENA.x - s.x, z: ARENA.z - s.z }, d = Math.hypot(face.x, face.z) || 1;
      const n = P.spawnNpc(id, s.x, s.z, { x: face.x / d, z: face.z / d });
      n.restDir = { x: face.x / d, z: face.z / d };
      n.seatY = s.y;
      this.crowd.push(n);
    });
  }

  cheer(k = 1) {
    for (const n of this.crowd) {
      if (Math.random() > 0.35 + k * 0.5) continue;
      n.hop(Math.random() * 0.4);
      n.setEmote(pick(['heart', 'note', 'exclaim', 'star']), 1.6);
    }
    this.site.cheer(k);
  }

  countdown() {
    return new Promise((resolve) => { this.overlay = { kind: 'count', t: 0, resolve, last: 4 }; });
  }

  // ------------------------------------------------------------------ waves
  nextWave() {
    const P = this.party;
    this.wave++;
    const n = P.players.filter((p) => p.connected).length || 1;
    this.queue = waveList(this.wave, n);
    this.spawnT = 1.4;
    this.stage = 'fight';
    this.combat.enemyDmg = 1 + (this.wave - 1) * 0.07;
    this.combat.enemySpeed = 1 + Math.min(0.25, (this.wave - 1) * 0.025);
    const boss = this.wave % 5 === 0;
    P.showBanner(t('Wave {n}', { n: this.wave }), boss ? t('Something big is coming…') : t('{n} gloom creatures', { n: this.queue.length }));
    audio.sfx(boss ? 'thunder' : 'bell', { volume: 0.8 });
    this.objective = t('Wave {n} — {k} to go', { n: this.wave, k: this.queue.length });
    if (boss) this.cheer(0.5);
    // every few waves, Hollis has the barrels rolled in
    this.barrelT = [3, 7, 9].includes(this.wave) ? 6 : [4, 8].includes(this.wave) ? 14 : 999;
  }

  // gloom bursts in through a gate (one away from the heroes, mostly)
  pickGate() {
    const c = this.combat.partyCentre();
    const w = GATES.map((g) => { const p = ringAt(ARENA, g.a, 0); return Math.hypot(p.x - c.x, p.z - c.z) ** 2 + 4; });
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < GATES.length; i++) { r -= w[i]; if (r <= 0) return this.site.gates[i]; }
    return this.site.gates[0];
  }

  spawnFromQueue() {
    const C = this.combat, S = this.site;
    const alive = C.enemies.filter((e) => e.alive).length;
    const n = this.party.players.filter((p) => p.connected).length || 1;
    if (alive >= Math.min(18, Math.floor(4 + n * 1.8))) return;
    const q = this.queue.shift();
    if (!q) return;
    let at;
    if (q.type === 'boss') { S.openFor('north', 3); at = ringAt(ARENA, -Math.PI / 2, -2.4); }
    else { const g = this.pickGate(); S.openFor(g.id, 1.6); at = S.gateSpot(g); }
    const e = C.spawn(q.type, at.x, at.z, { hpScale: q.hp || 1, level: (this.ringLv || 1) + Math.floor((this.wave || 1) / 4) });
    if (q.type === 'boss') { this.party.showBanner(t('The Grumblecloud!'), t('hit it while it naps')); this.party.cam.shake = 0.6; }
    return e;
  }

  onKill(e, p) {
    if (e.def.boss) {
      this.cheer(1.5);
      this.site.ola();
      this.party.toast(t('The Grumblecloud blew away!'), '#ffd66b');
      for (let i = 0; i < 8; i++) this.party.world.fx.emit('firework', e.x + rand(-3, 3), 3 + Math.random() * 2, e.z + rand(-2, 2), 30, { color: pick(['#ffd66b', '#f59ac8', '#8fd6b4', '#9fd0f5']) });
      audio.sfx('firework', { volume: 0.7 });
    } else if (Math.random() < 0.3) this.cheer(0.3);
    void p;
  }

  onDown(q, from) {
    if (this.pvp && from) { this.cheer(0.6); from.brawlKos = (from.brawlKos || 0) + 1; }
  }

  // ------------------------------------------------------------------ between waves
  async waveCleared() {
    const P = this.party, C = this.combat;
    this.stage = 'break';
    this.cheer(1);
    this.site.ola();
    P.showBanner(t('Wave {n} cleared!', { n: this.wave }), this.wave === 10 ? t('the Festival Ring is safe!') : t('pick a blessing on your phone'));
    audio.jingle('questDone');
    // naps end, everyone catches their breath
    for (const p of P.players) {
      const f = p.fighter;
      if (!f) continue;
      if (f.down) C.revive(p, 0.5, null);
      f.hp = Math.min(f.maxHp, f.hp + Math.round(f.maxHp * 0.25));
      f.secondWind = f.mods.secondWind;
    }
    for (const p of P.players) p.stars = (p.stars || 0) + 1;
    if (this.wave >= 10) { await P.wait(2.5); await this.finish(true); return; }
    await this.blessingPick();
    this.nextWave();
  }

  blessingPick() {
    const P = this.party;
    this.cards = new Map();
    const id = ++this.pickSeq;
    for (const p of P.players) {
      if (!p.fighter) continue;
      const cards = drawCards(p.fighter.blessings);
      this.cards.set(p.slot, { id, cards, picked: null });
      if (p.kind === 'phone' && p.connected) {
        P.net.send(p.id, { t: 'screen', s: 'choice', id, title: t('Pick a blessing!'), note: t('Blessings stack — choose one'), options: cards.map((c) => ({ label: t(BLESSINGS[c].name), sub: t(BLESSINGS[c].desc), color: '#b88cf0' })) });
      }
    }
    return new Promise((resolve) => { this.overlay = { kind: 'bless', t: 0, time: 14, resolve }; });
  }

  onPick(p, d) {
    const c = this.cards.get(p.slot);
    if (!c || c.picked || d.id !== c.id || typeof d.i !== 'number' || !c.cards[d.i]) return;
    this.grant(p, c.cards[d.i]);
  }

  grant(p, id) {
    const c = this.cards.get(p.slot);
    if (c) c.picked = id;
    const f = p.fighter;
    f.blessings.push(id);
    this.combat.refreshStats(p, false);
    this.combat.popText(p.pos.x, 2.3, p.pos.z, t(BLESSINGS[id].name), '#b88cf0');
    this.party.world.fx.emit('sparkle', p.pos.x, 1.3, p.pos.z, 14, { color: '#b88cf0' });
    audio.sfx('sparkle', { volume: 0.6 });
    if (p.kind === 'phone') this.party.net.send(p.id, { t: 'screen', s: 'play' });
  }

  // ------------------------------------------------------------------ the crowd's gifts
  lobGift() {
    const C = this.combat;
    const spot = C && C.freeSpot(ARENA.x, ARENA.z, Math.min(ARENA.rx, ARENA.rz) * 0.85);
    if (!spot) return;
    const kind = Math.random() < 0.6 ? 'tart' : 'coffee';
    this.site.lob(spot, (x, z) => { if (this.combat === C && this.stage !== 'over') C.drop(kind, x, z); });
  }

  // ------------------------------------------------------------------ barrels!
  rollBarrels(n = 1) {
    const C = this.combat, A = ARENA;
    const lanes = LANES.slice().sort(() => Math.random() - 0.5).slice(0, n);
    for (const dz of lanes) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      const half = A.rx * Math.sqrt(Math.max(0, 1 - (dz / A.rz) ** 2)) - 0.8;
      const x0 = A.x - dir * half, z = A.z + dz;
      C.telegraphLine({ x: x0, z }, { x: dir, z: 0 }, half * 2, 1.3);
      this.barrels.push({ x: x0, z, x1: A.x + dir * half, dir, t: -1.3 - Math.random() * 0.3, y: 0, vy: 0, hit: new Set(), m: null });
    }
    this.party.toast(t('Barrels! Jump over them!'), '#f4c542');
    audio.sfx('whistle', { volume: 0.6 });
    this.cheer(0.4);
  }

  updateBarrels(dt) {
    const C = this.combat;
    if (!C) return;
    for (const b of this.barrels) {
      b.t += dt;
      if (b.t < 0) continue;
      if (!b.m) { b.m = barrelMesh(this.party.r3d); C.root.add(b.m); audio.sfx('whoosh', { volume: 0.5, pitch: -6 }); }
      const sp = 6.2;
      b.x += b.dir * sp * dt;
      b.m.rotation.z -= b.dir * (sp * dt) / 0.42;
      for (const d of this.site.b.drums) if (Math.abs(d.x - b.x) < 0.55 && Math.abs(d.z - b.z) < 0.9 && b.y <= 0 && b.vy <= 0) { b.vy = 6.5; d.squash = 1; audio.sfx('boing', { volume: 0.5 }); }
      if (b.y > 0 || b.vy > 0) { b.vy -= 21 * dt; b.y = Math.max(0, b.y + b.vy * dt); if (b.y === 0) b.vy = 0; }
      b.m.position.set(b.x, 0.42 + b.y, b.z);
      if (b.y === 0 && Math.random() < dt * 14) this.party.world.fx.emit('dust', b.x - b.dir * 0.4, 0.1, b.z, 1);
      // bowling!
      if (b.y < 0.5) {
        for (const q of C.alivePlayers()) {
          if (b.hit.has(q) || q.actor.jumpY > 0.42) continue;
          if (Math.abs(q.pos.x - b.x) < 0.58 && Math.abs(q.pos.z - b.z) < 0.62) { b.hit.add(q); C.hurtPlayer(q, 10, { dir: { x: b.dir * 0.5, z: q.pos.z >= b.z ? 0.85 : -0.85 }, knock: 3.4 }); }
        }
        for (const e of C.enemies) {
          if (!e.alive || !e.hurtable || e.def.flying || b.hit.has(e)) continue;
          if (Math.abs(e.x - b.x) < 0.5 + e.r && Math.abs(e.z - b.z) < 0.55 + e.r) { b.hit.add(e); C.hurtEnemy(e, Math.max(12, e.maxHp * (e.def.boss ? 0.06 : 0.4)), { dir: { x: b.dir * 0.5, z: e.z >= b.z ? 0.85 : -0.85 }, knock: 3, launch: 4.5, heavy: true, kind: 'aoe' }); }
        }
      }
      if ((b.x1 - b.x) * b.dir <= 0) {
        b.done = true;
        C.root.remove(b.m);
        this.party.world.fx.emit('dust', b.x, 0.4, b.z, 12, { color: '#a8744a' });
        audio.sfx('whack', { volume: 0.5 });
      }
    }
    this.barrels = this.barrels.filter((b) => !b.done);
  }

  // ------------------------------------------------------------------ king of the ring
  kingSetup() {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.05, 2.3, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd66b, transparent: true, opacity: 0.9, depthWrite: false }));
    const disc = new THREE.Mesh(new THREE.CircleGeometry(2.05, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd66b, transparent: true, opacity: 0.16, depthWrite: false }));
    ring.position.y = 0.05; disc.position.y = 0.045;
    g.add(ring, disc);
    const next = new THREE.Mesh(new THREE.RingGeometry(2.1, 2.24, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, opacity: 0, depthWrite: false }));
    next.position.y = 0.05;
    this.combat.root.add(g, next);
    const s = this.kingSpot(null);
    g.position.set(s.x, 0, s.z);
    this.king = { g, ring, disc, next, x: s.x, z: s.z, r: 2.3, t: 0, every: 18, owner: null, acc: 0, to: null };
  }

  // somewhere open on the sand, away from where it was
  kingSpot(from) {
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * 0.62;
      const x = ARENA.x + Math.cos(a) * ARENA.rx * d, z = ARENA.z + Math.sin(a) * ARENA.rz * d;
      if (from && Math.hypot(x - from.x, z - from.z) < 7) continue;
      if (this.site.b.pillars.some((p) => Math.hypot(p.x - x, p.z - z) < 2.9)) continue;
      return { x, z };
    }
    return { x: ARENA.x, z: ARENA.z };
  }

  updateKing(dt) {
    const K = this.king, C = this.combat, P = this.party;
    if (!K) return;
    const inside = C.alivePlayers().filter((p) => Math.hypot(p.pos.x - K.x, p.pos.z - K.z) < K.r);
    const owner = inside.length === 1 ? inside[0] : null;
    if (owner && owner !== K.owner) { this.site.cheer(0.5); P.buzz(owner, [20, 20, 20]); }
    K.owner = owner;
    K.contested = inside.length > 1;
    if (this.stage === 'fight' && owner) {
      K.acc += dt;
      if (K.acc >= 1) {
        K.acc -= 1;
        owner.kingPts = (owner.kingPts || 0) + 1;
        C.popText(owner.pos.x, 2.3, owner.pos.z, '+1', '#ffd66b');
        audio.sfx('coin', { volume: 0.35 });
      }
    } else K.acc = Math.max(0, K.acc - dt * 0.5);
    // the circle moves on: a dashed ring shows where, then it glides there
    K.t += dt;
    if (!K.to && K.t > K.every - 2.6) { K.to = this.kingSpot(K); K.next.position.set(K.to.x, 0, K.to.z); audio.sfx('tick', { volume: 0.6 }); }
    if (K.to) K.next.material.opacity = 0.35 + Math.sin(P.t * 14) * 0.3;
    if (K.t >= K.every && K.to) {
      K.x = K.to.x; K.z = K.to.z; K.to = null; K.t = 0; K.acc = 0;
      K.g.position.set(K.x, 0, K.z);
      K.next.material.opacity = 0;
      P.world.fx.emit('ring', K.x, 0.1, K.z, 1, { color: '#ffd66b' });
      P.toast(t('The golden circle moved!'), '#ffd66b');
      audio.sfx('whoosh', { volume: 0.5 });
    }
    const col = K.contested ? (Math.floor(P.t * 8) % 2 ? 0xffffff : 0xff6b7b) : owner ? new THREE.Color(owner.color).getHex() : 0xffd66b;
    K.ring.material.color.setHex(col);
    K.disc.material.color.setHex(col);
    K.disc.material.opacity = owner ? 0.24 : 0.14 + Math.sin(P.t * 3) * 0.04;
    if (Math.random() < dt * 6) P.world.fx.emit('sparkle', K.x + rand(-1.6, 1.6), 0.2, K.z + rand(-1.2, 1.2), 1, { color: owner ? owner.color : '#ffd66b' });
  }

  // ------------------------------------------------------------------ the end
  defeat() {
    if (this.stage === 'over') return;
    this.stage = 'over';
    this.party.showBanner(t('The gloom wins this round…'), t('Wave {n}', { n: this.wave }));
    audio.sfx('down', { volume: 0.8 });
    this.party.wait(2.4).then(() => this.finish(false));
  }

  async finish(won) {
    const P = this.party, C = this.combat;
    this.stage = 'over';
    this.won = won;
    // whatever gloom is left wanders off, pleased with itself
    if (C) for (const e of C.enemies) {
      if (!e.alive) continue;
      P.world.fx.emit('smoke', e.x, e.y + 0.5, e.z, 8, { color: '#6a4a8e' });
      e.alive = false; e.fading = 0; e.remove();
    }
    const score = (p) => (this.mode === 'king' ? p.kingPts || 0 : this.mode === 'brawl' ? p.brawlKos || 0 : (p.fighter ? p.fighter.kos : 0));
    const rows = P.players.map((p) => ({ p, kos: score(p), falls: p.fighter ? p.fighter.falls : 0, dmg: p.fighter ? Math.round(p.fighter.dmgDealt) : 0 }));
    rows.sort((a, b) => (b.kos - a.kos) || (a.falls - b.falls) || (b.dmg - a.dmg));
    rows.forEach((r, i) => { const s = this.pvp ? [3, 2, 1][i] || 0 : (won ? 3 : 1); r.stars = s; r.p.stars = (r.p.stars || 0) + s; });
    if (won || this.pvp) { for (let i = 0; i < 10; i++) P.world.fx.emit('firework', ARENA.x + rand(-7, 7), 3 + Math.random() * 3, ARENA.z + rand(-4, 3), 30, { color: pick(['#ffd66b', '#f59ac8', '#8fd6b4', '#9fd0f5']) }); this.cheer(2); this.site.ola(); }
    await new Promise((resolve) => { this.overlay = { kind: 'results', t: 0, rows, won, resolve }; audio.jingle(won || this.pvp ? 'festival' : 'questDone'); });
    const opts = [
      { label: this.pvp ? t('Rematch!') : t('Try again'), color: '#ef6479' },
      { label: this.parent ? t('Back to exploring') : t('Back to the lobby'), color: '#4f73b6' },
    ];
    const i = await P.ask(t('What now?'), opts, 25);
    if (P.act !== this) return;
    await P.fadeTo(1, 0.45);
    this.dispose();
    P.stopCombat();
    if (i === 0) { P.act = new ArenaAct(P, { mode: this.mode, parent: this.parent }); P.act.start(); return; }
    if (this.parent) { P.act = this.parent; this.parent.resume(); }
    else P.backToLobby();
  }

  // ------------------------------------------------------------------ frame
  update(dt) {
    const P = this.party, C = this.combat;
    if (this.overlay) this.updateOverlay(dt);
    if (!C) return;
    const fighting = this.stage === 'fight';
    if (this.mode === 'waves' && fighting) {
      this.spawnT -= dt;
      if (this.spawnT <= 0 && this.queue.length) { this.spawnFromQueue(); this.spawnT = rand(0.5, 1.1); }
      const left = this.queue.length + C.enemies.filter((e) => e.alive).length;
      this.objective = t('Wave {n} — {k} to go', { n: this.wave, k: left });
      if (!this.queue.length && !C.enemies.some((e) => e.alive) && this.spawnT <= 0) this.waveCleared();
    }
    if (this.pvp && fighting) {
      this.time -= dt;
      this.powerT -= dt;
      if (this.powerT <= 0) { this.powerT = rand(7, 11); const s = C.freeSpot(ARENA.x, ARENA.z, ARENA.rz); if (s) C.drop(Math.random() < 0.6 ? 'tart' : 'coffee', s.x, s.z); }
      if (this.time <= 0) { this.stage = 'over'; audio.sfx('whistle', { volume: 0.8 }); P.showBanner(t('Time!'), ''); P.wait(1.6).then(() => this.finish(false)); }
    }
    if (this.mode === 'king') this.updateKing(dt);
    // the crowd's treats, and Hollis's barrels
    if (fighting) {
      this.giftT -= dt;
      if (this.giftT <= 0) { this.giftT = this.pvp ? rand(9, 14) : rand(15, 24); this.lobGift(); }
      this.barrelT -= dt;
      if (this.barrelT <= 0) { this.barrelT = this.pvp ? rand(20, 30) : 999; this.rollBarrels(this.wave >= 7 || this.pvp ? 2 : 1); }
    }
    this.updateBarrels(dt);
    for (const n of this.crowd) if (n.seatY !== undefined && n.id !== 'hollis' && Math.random() < dt * 0.15) n.hop(0);
  }

  updateOverlay(dt) {
    const o = this.overlay, P = this.party;
    o.t += dt;
    if (o.kind === 'count') {
      const n = Math.ceil(3 - o.t);
      if (n !== o.last && n > 0) { o.last = n; audio.sfx('tick', { volume: 0.9 }); }
      if (o.t >= 3 && !o.go) { o.go = true; audio.sfx('go'); for (const p of P.players) P.buzz(p, 60); }
      if (o.t >= 3.5) { this.overlay = null; o.resolve(); }
    } else if (o.kind === 'bless') {
      // keyboard players (and slowpokes) get a surprise blessing
      const all = P.players.filter((p) => p.fighter && p.connected).every((p) => { const c = this.cards.get(p.slot); return !c || c.picked; });
      if (all || o.t > o.time) {
        for (const p of P.players) { const c = this.cards.get(p.slot); if (c && !c.picked && p.fighter) this.grant(p, pick(c.cards)); }
        this.overlay = null;
        o.resolve();
      }
    } else if (o.kind === 'results') {
      if ((o.t > 3 && P.anyPressed('interact')) || o.t > 16) { P.consume('interact'); this.overlay = null; o.resolve(); }
    }
  }

  ctxFor(p) {
    if (this.overlay && this.overlay.kind === 'count') return { a: null, b: null, x: null, hint: 'Get ready…' };
    if (this.overlay && this.overlay.kind === 'results') return { a: this.overlay.t > 3 ? 'Continue' : null, b: 'Hop', hint: 'Great fight!' };
    if (this.stage === 'break') return { a: null, b: 'Hop', hint: 'Catch your breath — pick a blessing!' };
    const f = p.fighter;
    const hint = this.mode === 'king' ? 'Hold the golden circle alone to score — bonk the others out!'
      : this.mode === 'brawl' ? 'Bonk everyone! Tap A, hold A to charge'
        : this.barrels.length ? 'Barrels! Jump over them with B!' : 'Tap A to attack, hold A to charge, X for your special';
    return { a: f ? (f.charging ? 'Release!' : 'Attack') : null, b: 'Jump', hint };
  }

  syncPad(p) {
    const c = this.cards.get(p.slot);
    if (this.overlay && this.overlay.kind === 'bless' && c && !c.picked && p.kind === 'phone') {
      this.party.net.send(p.id, { t: 'screen', s: 'choice', id: c.id, title: t('Pick a blessing!'), note: t('Blessings stack — choose one'), options: c.cards.map((b) => ({ label: t(BLESSINGS[b].name), sub: t(BLESSINGS[b].desc), color: '#b88cf0' })) });
    }
  }

  onJoin(p) { void p; }
  onLeave(p) { void p; }
  onLand(p) { void p; }
  drawWorld() {}

  // a crown over the golden circle, in its holder's colour
  drawLabels(ctx, v) {
    const K = this.king;
    if (!K || this.stage === 'over') return;
    const q = v.project(K.x, 1.6 + Math.sin(this.party.t * 3) * 0.12, K.z);
    if (!v.owns(q.x, q.y)) return;
    const u = this.party.display.worldToUi(q.x, q.y);
    drawText(ctx, '♛', u.x, u.y - 8, { color: K.owner ? K.owner.color : '#ffd66b', align: 'center', scale: 2, outline: '#3b2a2e' });
    if (K.contested) drawText(ctx, t('Contested!'), u.x, u.y + 10, { color: '#fff3c4', align: 'center', outline: '#3b2a2e' });
  }

  dispose() {
    const ri = REGIONS.findIndex((r) => r.id === 'ring');
    if (ri >= 0) REGIONS.splice(ri, 1);
    for (const n of this.crowd) this.party.removeNpc(n.id);
    this.crowd = [];
    const C = this.combat;
    for (const b of this.barrels) if (b.m && C) C.root.remove(b.m);
    this.barrels = [];
    if (this.king && C) C.root.remove(this.king.g, this.king.next);
    this.king = null;
    if (this.site) this.site.setGates(true);
  }

  drawUi(ctx) {
    const P = this.party, W = P.display.w, H = P.display.h;
    // a small wave counter at the top (the boss bar sits just below it)
    if (this.mode === 'waves' && this.wave && !this.overlay) drawText(ctx, this.objective, W / 2, 6, { color: '#fff3c4', align: 'center', outline: '#3b2a2e' });
    if (this.pvp && this.stage === 'fight') {
      const s = Math.max(0, Math.ceil(this.time));
      drawText(ctx, s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : String(s), W / 2, 8, { color: s <= 10 && Math.floor(P.t * 4) % 2 ? '#ec5f73' : '#fff3c4', align: 'center', scale: 2, outline: '#3b2a2e' });
    }
    this.drawScores(ctx);
    const o = this.overlay;
    if (!o) return;
    if (o.kind === 'count') {
      const txt = o.t >= 3 ? t('FIGHT!') : String(Math.ceil(3 - o.t));
      drawText(ctx, txt, W / 2, H / 2 - 24, { color: o.t >= 3 ? '#ffd66b' : '#fff3c4', align: 'center', scale: 4, outline: '#3b2a2e' });
    } else if (o.kind === 'bless') {
      // one column up to four heroes, two beyond
      const rows = P.players.filter((p) => p.fighter);
      const cols = rows.length > 4 ? 2 : 1, per = Math.ceil(rows.length / cols);
      const pw = Math.min(W - 40, cols === 2 ? 420 : 300), ph = 34 + per * 12;
      const px = Math.round((W - pw) / 2), py = Math.round(Math.max(H * 0.36, H * 0.5 - ph / 2));
      panel(ctx, px, py, pw, ph);
      drawText(ctx, t('Blessings — {n}s', { n: Math.max(0, Math.ceil(o.time - o.t)) }), px + pw / 2, py + 9, { color: '#7d4f93', align: 'center' });
      const cw = Math.floor((pw - 16) / cols);
      rows.forEach((p, i) => {
        const c = this.cards.get(p.slot);
        const x0 = px + 8 + Math.floor(i / per) * cw, y = py + 24 + (i % per) * 12;
        ctx.fillStyle = p.color; ctx.fillRect(x0 + 2, y, 4, 9);
        drawText(ctx, p.name, x0 + 10, y + 1, { color: UI.ink });
        drawText(ctx, c && c.picked ? t(BLESSINGS[c.picked].name) : t('choosing…'), x0 + cw - 6, y + 1, { color: c && c.picked ? '#7d4f93' : UI.inkSoft, align: 'right' });
      });
    } else if (o.kind === 'results') {
      const rows = o.rows;
      const pw = Math.min(W - 40, 300), ph = 48 + rows.length * 14;
      const px = Math.round((W - pw) / 2), py = Math.round(H / 2 - ph / 2);
      panel(ctx, px, py, pw, ph);
      const title = this.mode === 'king' ? t('King of the Ring — results') : this.mode === 'brawl' ? t('Brawl — results') : o.won ? t('Victory! All ten waves!') : t('Reached wave {n}', { n: this.wave });
      drawText(ctx, title, px + pw / 2, py + 9, { color: '#8a5234', align: 'center' });
      drawText(ctx, this.mode === 'king' ? t('Points') : this.mode === 'brawl' ? t('K.O.s') : t('Beaten'), px + pw - 96, py + 22, { color: UI.inkSoft, align: 'right' });
      drawText(ctx, t('Naps'), px + pw - 58, py + 22, { color: UI.inkSoft, align: 'right' });
      rows.forEach((r, i) => {
        if (o.t < 0.3 + i * 0.2) return;
        const y = py + 34 + i * 14;
        ctx.fillStyle = r.p.color; ctx.fillRect(px + 10, y, 4, 11);
        const cls = r.p.fighter ? t(CLASSES[r.p.fighter.clsId].name) : '';
        drawText(ctx, `${r.p.name}`, px + 20, y + 2, { color: UI.ink });
        drawText(ctx, cls, px + 90, y + 2, { color: UI.inkSoft });
        drawText(ctx, String(r.kos), px + pw - 96, y + 2, { color: UI.ink, align: 'right' });
        drawText(ctx, String(r.falls), px + pw - 58, y + 2, { color: UI.ink, align: 'right' });
        if (!P.solo) drawText(ctx, `+${r.stars} ★`, px + pw - 12, y + 2, { color: '#e0a526', align: 'right' });
      });
      if (o.t > 3 && Math.floor(o.t * 2) % 2) drawText(ctx, t('{a} to continue', { a: P.keyName('a') }), W / 2, py + ph + 6, { color: '#fff7e6', align: 'center', outline: '#3b2a2e' });
    }
  }

  // who's winning (bottom strip): points in King, K.O.s in a brawl, level in the waves
  drawScores(ctx) {
    const P = this.party;
    if (P.dialogue.active || (this.overlay && this.overlay.kind !== 'count')) return;
    if (this.mode === 'king') P.drawBadges(ctx, (p) => t('{n} pts', { n: p.kingPts || 0 }), '#ffd66b');
    else if (this.mode === 'brawl') P.drawBadges(ctx, (p) => t('{n} K.O.', { n: p.brawlKos || 0 }), '#fff3c4');
    else P.drawBadges(ctx, (p) => (p.fighter ? t('Lv{n}', { n: p.fighter.level }) : ''));
  }
}
