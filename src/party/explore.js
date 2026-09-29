// Explore & adventure. Last night's storm left gloom nests all over the
// valley: roam together (or split up — the camera copes), wake the nests,
// beat the gloom out of the poor animals (some will follow you home), dig up
// treasure hats, ring the gong at the Festival Ring for a scrap… and once the
// valley is bright enough, the Grumblecloud itself comes down to sulk on
// Starfall Hill.

import { THREE, toon } from '../render/r3d.js';
import { BLESSINGS, drawCards } from '../combat/blessings.js';
import { drawText } from '../engine/font.js';
import { panel, UI, heart } from '../ui/ui.js';
import { audio } from '../engine/audio.js';
import { TT } from '../world/tiles.js';
import { POINTS } from '../world/overworld.js';
import { TREASURE_HATS } from '../data/looks.js';
import { ArenaAct, ARENA, GONG } from './arena.js';
import { drawMarks } from './mapmarks.js';
import { drawTargetArrow } from './story.js';
import { Chests } from './chests.js';
import { t } from '../i18n.js';
import { timeLabel } from '../ui/hud.js';
import { Saga } from '../saga/saga.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const PLAZA = { x: POINTS.fountain[0] - 2.2, z: POINTS.fountain[1] + 4.8 };
const HILL = { x: 162, z: 27.4 };                // the boss fight, on top of Starfall Hill
const GOAL = 5;                                  // nests before the Grumblecloud shows up

// Where the gloom settled (rough spots: each snaps to the nearest open,
// walkable ground reachable from the plaza) and what sleeps there.
const NESTS = [
  { id: 'pasture', at: [15, 44], mob: ['gloomling', 'gloomling', 'biggloom', 'gloomling'] },
  { id: 'maple', at: [24, 21], mob: ['stag', 'fox', 'gloomling', 'gloomling'] },
  { id: 'shrine', at: [52, 25], mob: ['gloomling', 'crow', 'gloomling', 'crow'] },
  { id: 'camp', at: [80, 31], mob: ['fox', 'fox', 'gloomling', 'gloomling'] },
  { id: 'grove', at: [140, 39], mob: ['puffcap', 'puffcap', 'gloomling', 'gloomling', 'gloomling'] },
  { id: 'frost', at: [205, 28], mob: ['stag', 'biggloom', 'gloomling', 'gloomling'] },
  { id: 'blossom', at: [199, 55], mob: ['fox', 'crow', 'fox', 'gloomling'] },
  { id: 'marsh', at: [196, 83], mob: ['shellback', 'puffcap', 'crow', 'gloomling'] },
  { id: 'beach', at: [100, 98], mob: ['shellback', 'shellback', 'gloomling', 'gloomling'] },
  { id: 'bluffs', at: [24, 94], mob: ['crow', 'crow', 'biggloom', 'gloomling'] },
];
// buried treasure: the storm scattered some very special hats
const DIGS = [
  { hat: 'acorncap', at: [58, 46] },
  { hat: 'antlers', at: [9, 11] },
  { hat: 'glowcap', at: [148, 31] },
  { hat: 'panhelm', at: [7, 62] },
  { hat: 'gloomhorns', at: [228, 84] },
  { hat: 'starcrown', at: [168, 22] },
];
const TIPS = [
  'Dig where the ground glints!',
  'The storm buried hats. Real hats!',
  'The gloom is bolder at night.',
  'Ring the gong at the Festival Ring!',
  'A friend nearby wakes you from a nap.',
  'Hold {a} for a big charged attack!',
  'Freed animals may follow you home.',
];
const NIGHT = (h) => h >= 20 || h < 6;

// ------------------------------------------------------------------ a gloom nest
class Nest {
  constructor(act, def, at) {
    this.act = act;
    this.def = def;
    this.id = def.id;
    this.x = at.x; this.z = at.z;
    this.area = act.party.placeName(at.x, at.z);
    this.state = 'idle';          // idle → asleep → awake → clean
    this.enemies = [];
    this.t = Math.random() * 10;
    this.cleanT = 0;
    this.build();
  }

  build() {
    const r3d = this.act.party.r3d;
    const g = new THREE.Group();
    g.position.set(this.x, 0, this.z);
    const goo = toon(r3d, { color: 0x3a2350, key: 'nest-goo' }), goo2 = toon(r3d, { color: 0x4d2f6e, key: 'nest-goo2' });
    const thorn = toon(r3d, { color: 0x2e1c40, key: 'nest-thorn' });
    this.goo = new THREE.Group();
    const blobs = [[0, 0, 1.55], [0.9, 0.4, 0.9], [-0.9, 0.3, 1], [0.3, -0.8, 0.95], [-0.5, -0.7, 0.8], [1.2, -0.4, 0.6]];
    blobs.forEach(([x, z, r], i) => {
      const d = new THREE.Mesh(new THREE.CircleGeometry(r, 14).rotateX(-Math.PI / 2), i % 2 ? goo2 : goo);
      d.position.set(x, 0.02 + i * 0.002, z * 0.8);
      d.receiveShadow = true;
      this.goo.add(d);
    });
    g.add(this.goo);
    // thorny brambles leaning out of the puddle
    this.thorns = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + rand(-0.2, 0.2), r = rand(0.8, 1.3), h = rand(0.6, 1.1);
      const c = new THREE.Mesh(new THREE.ConeGeometry(rand(0.07, 0.12), h, 4), thorn);
      c.position.set(Math.cos(a) * r, h / 2 - 0.05, Math.sin(a) * r * 0.8);
      c.rotation.z = -Math.cos(a) * 0.5; c.rotation.x = Math.sin(a) * 0.5;
      c.castShadow = true;
      this.thorns.add(c);
    }
    g.add(this.thorns);
    // the gloom heart: a sulky crystal that pulses
    this.heartMat = new THREE.MeshToonMaterial({ color: 0x6a3a8e, emissive: 0xe05a9a, emissiveIntensity: 0.5, gradientMap: r3d.gradient });
    this.heart = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), this.heartMat);
    this.heart.scale.set(1, 1.45, 1);
    this.heart.castShadow = true;
    g.add(this.heart);
    // bubbles that swell and pop
    this.bubbles = [];
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), goo2);
      b.position.set(rand(-0.9, 0.9), 0.02, rand(-0.6, 0.6));
      b.userData.ph = Math.random();
      g.add(b);
      this.bubbles.push(b);
    }
    this.root = g;
    this.act.root.add(g);
  }

  update(dt) {
    const A = this.act, P = A.party, C = P.combat;
    this.t += dt;
    if (this.state !== 'clean') {
      const awake = this.state === 'awake';
      this.heart.position.y = 1.15 + Math.sin(this.t * (awake ? 5 : 1.8)) * 0.1;
      this.heart.rotation.y += dt * (awake ? 3 : 0.8);
      this.heartMat.emissiveIntensity = 0.45 + Math.sin(this.t * (awake ? 9 : 2.5)) * 0.25;
      for (const b of this.bubbles) {
        const k = (this.t * 0.5 + b.userData.ph) % 1;
        b.scale.setScalar(0.2 + k * 1.1);
        if (k < b.userData.last) { b.position.set(rand(-0.9, 0.9), 0.02, rand(-0.6, 0.6)); }
        b.userData.last = k;
      }
      const near = A.nearestDist(this.x, this.z);
      if (near < 40 && Math.random() < dt * 2.5) P.world.fx.emit('smoke', this.x + rand(-0.8, 0.8), 0.3, this.z + rand(-0.6, 0.6), 1, { color: '#6a4a8e' });
      if (!C || A.suspended) return;
      if (this.state === 'idle' && near < 17) this.spawn();
      else if (this.state === 'asleep') {
        if (near > 30) this.despawn();
        else if (near < 4.3 || this.enemies.some((e) => e.alive && e.state !== 'sleep')) this.wake();
      } else if (awake) {
        for (const e of this.enemies) if (e.alive && e.wakeIn > 0 && (e.wakeIn -= dt) <= 0) C.wake(e);
        const alive = this.enemies.filter((e) => e.alive);
        if (!alive.length) this.cleanse();
        else if (near > 32 && alive.every((e) => A.nearestDist(e.x, e.z) > 16)) this.despawn();
      }
    } else if (this.cleanT < 2) {
      // the gloom drains away and flowers pop up where it was
      this.cleanT += dt;
      const k = Math.min(1, this.cleanT / 1.2);
      this.goo.scale.setScalar(Math.max(0.01, 1 - k));
      this.thorns.position.y = -k * 1.2;
      this.heart.visible = false;
      for (const b of this.bubbles) b.visible = false;
      for (const f of this.flowers || []) { const q = Math.min(1, Math.max(0, (this.cleanT - f.userData.delay) / 0.35)); f.scale.setScalar(Math.max(0.01, q * (1 + Math.sin(q * Math.PI) * 0.3))); }
      if (this.cleanT >= 2) { this.goo.visible = false; this.thorns.visible = false; }
    }
  }

  spawn() {
    const A = this.act, P = A.party, C = P.combat;
    const n = P.players.filter((p) => p.connected).length || 1;
    const mob = this.def.mob.slice();
    for (let i = 2; i < n; i++) mob.push(i % 2 ? 'gloomling' : 'fox');
    if (A.cleansed >= 3) mob.push('gloomling');
    this.enemies = mob.map((type, i) => {
      const a = (i / mob.length) * Math.PI * 2 + rand(-0.3, 0.3);
      let x = this.x + Math.cos(a) * rand(1.1, 2.3), z = this.z + Math.sin(a) * rand(0.9, 1.8);
      if (P.world.overCol.blocked(x, z, 0.35)) { const s = C.freeSpot(this.x, this.z, 2.6); if (s) { x = s.x; z = s.z; } else { x = this.x; z = this.z; } }
      const e = C.spawn(type, x, z, { sleep: true, nest: this.id, quiet: true });
      if (e.def.flying && !e.def.boss) e.y = 0.35;
      e.face = { x: Math.cos(a + Math.PI), z: Math.sin(a + Math.PI) };
      return e;
    });
    this.state = 'asleep';
  }

  wake() {
    const P = this.act.party;
    this.state = 'awake';
    for (const e of this.enemies) if (e.alive && e.state === 'sleep') e.wakeIn = rand(0.05, 0.6);
    audio.sfx('growl', { volume: 0.7 });
    P.cam.shake = Math.max(P.cam.shake || 0, 0.15);
    for (const p of P.players) if (Math.hypot(p.pos.x - this.x, p.pos.z - this.z) < 10) P.buzz(p, [30, 40, 30]);
  }

  despawn() {
    for (const e of this.enemies) this.act.removeEnemy(e);
    this.enemies = [];
    this.state = 'idle';
  }

  cleanse() {
    const A = this.act, P = A.party, w = P.world;
    this.state = 'clean';
    this.cleanT = 0;
    const x = this.x, z = this.z;
    w.fx.emit('flash', x, 1.2, z, 1, { color: '#f59ac8' });
    w.fx.emit('firework', x, 1.2, z, 30, { color: '#ffd66b' });
    w.fx.emit('sparkle', x, 1, z, 24, { color: '#fff3a6' });
    w.fx.emit('ring', x, 0.1, z, 1, { color: '#8fd6b4' });
    audio.sfx('shard', { volume: 0.8 });
    audio.jingle('questDone');
    P.cam.shake = Math.max(P.cam.shake || 0, 0.25);
    // flowers
    const r3d = P.r3d, cols = [0xf4a4b6, 0xfff3a6, 0xffffff, 0xb9a2e3, 0xf28a6b, 0x9fd0f5];
    const stem = toon(r3d, { color: 0x5fa453, key: 'nest-stem' });
    this.flowers = [];
    for (let i = 0; i < 14; i++) {
      const f = new THREE.Group();
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 1.6;
      f.position.set(Math.cos(a) * r, 0, Math.sin(a) * r * 0.8);
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.2, 0.035), stem);
      s.position.y = 0.1;
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.11), toon(r3d, { color: cols[i % cols.length], key: 'nest-fl' + (i % cols.length) }));
      h.position.y = 0.22;
      f.add(s, h);
      f.scale.setScalar(0.01);
      f.userData.delay = 0.5 + Math.random() * 0.9;
      this.root.add(f);
      this.flowers.push(f);
    }
    A.nestCleansed(this);
  }
}

// ------------------------------------------------------------------ the act
export class ExploreAct {
  constructor(party) {
    this.party = party;
    this.target = null;
    this.objective = '';
    this.music = null;
    this.holdClock = true;
    this.freeRoam = true;           // the big screen can press L for the lobby
    this.stage = 'intro';           // intro | roam | gather | boss
    this.dim = 0;
    this.root = new THREE.Group();
    party.world.over.root.add(this.root);
    this.nests = [];
    this.digs = [];
    this.chestBox = new Chests(party, this.root, (c, p) => this.onChestOpen(c, p));
    this.relics = [];
    this.wanderers = [];
    this.stats = new Map();
    this.cleansed = 0;
    this.wanderT = 70;
    this.overlay = null;
    this.bossBeaten = false;
    // (World v7: the saga runs the adventure — the old nests and the Grumblecloud rest)
    this.saga = new Saga(party);
    party.saga = this.saga;
    this.saga.onChange = () => { this.cardKey = null; };
    this.place();
  }

  get world() { return this.party.world; }

  // everything snaps to open ground you can actually walk to from the plaza
  place() {
    const w = this.world, col = w.overCol, W = w.mapData.w, H = w.mapData.h;
    const g = col.grid || col.buildGrid(0.3);
    const seen = new Uint8Array(W * H);
    const start = Math.floor(PLAZA.z) * W + Math.floor(PLAZA.x);
    const q = [start];
    seen[start] = 1;
    for (let i = 0; i < q.length; i++) {
      const c = q[i], x = c % W, z = (c / W) | 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, nz = z + dz;
        if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
        const k = nz * W + nx;
        if (seen[k] || !g[k]) continue;
        seen[k] = 1;
        q.push(k);
      }
    }
    this.reach = { seen, W, H };
    // (nests also keep out from under tree canopies, so you can see them coming)
    const TREES = ['oak', 'cherry', 'apple', 'bigtree', 'pine', 'palm', 'maple', 'snowpine', 'peach', 'willow'];
    const trees = w.mapData.objects.filter((o) => TREES.includes(o.type));
    const snap = (x, z, clear, canopy = 0) => {
      let best = null, bd = 1e9;
      const near = canopy ? trees.filter((o) => Math.abs(o.x - x) < 18 && Math.abs(o.y - z) < 18) : [];
      for (let dz = -14; dz <= 14; dz++) for (let dx = -14; dx <= 14; dx++) {
        const tx = Math.floor(x) + dx, tz = Math.floor(z) + dz, d = dx * dx + dz * dz;
        if (d >= bd || tx < 0 || tz < 0 || tx >= W || tz >= H || !seen[tz * W + tx]) continue;
        if (col.blocked(tx + 0.5, tz + 0.5, clear) || w.tileAt(tx + 0.5, tz + 0.5) === TT.WATER) continue;
        if (near.some((o) => Math.hypot(o.x - tx - 0.5, o.y - tz - 0.5) < canopy + (o.type === 'bigtree' ? 1 : 0))) continue;
        bd = d; best = { x: tx + 0.5, z: tz + 0.5 };
      }
      return best || (canopy ? snap(x, z, clear, 0) : { x, z });
    };
    if (!this.saga) for (const d of NESTS) this.nests.push(new Nest(this, d, snap(d.at[0], d.at[1], 1.7, 3.2)));
    for (const d of DIGS) { const s = snap(d.at[0], d.at[1], 0.45); this.digs.push({ hat: d.hat, x: s.x, z: s.z, dug: false, glintT: Math.random() }); }
  }

  reachable(x, z) {
    const R = this.reach, tx = Math.floor(x), tz = Math.floor(z);
    return tx >= 0 && tz >= 0 && tx < R.W && tz < R.H && !!R.seen[tz * R.W + tx];
  }

  nearestDist(x, z) {
    let bd = 1e9;
    for (const p of this.party.players) { if (!p.connected) continue; const d = Math.hypot(p.pos.x - x, p.pos.z - z); if (d < bd) bd = d; }
    return bd;
  }

  stat(p, k, n = 1) {
    if (!p) return;
    let s = this.stats.get(p.slot);
    if (!s) this.stats.set(p.slot, (s = {}));
    s[k] = (s[k] || 0) + n;
  }
  statOf(p, k) { const s = this.stats.get(p.slot); return (s && s[k]) || 0; }

  // ------------------------------------------------------------------ start / arena interlude
  start() { this.run().catch((e) => console.error('explore', e)); }

  async run() {
    if (this.saga) return this.runSaga();
    return this.runNests();
  }

  // the Adventure: the saga picks up where the party left it
  async runSaga() {
    const P = this.party, S = this.saga;
    P.busy++;
    await P.fadeTo(1, 0.4);
    this.setupCombat();
    P.gatherAt(PLAZA.x, PLAZA.z + 2.2, 2.2);
    P.restorePositions?.();
    if (P.state.hour < 9 || P.state.hour > 16) P.state.hour = 11;
    P.busy = Math.max(0, P.busy - 1);
    if (!S.st.q.c1_intro) { S.start('c1_intro', { silent: true }); }
    else {
      await P.fadeTo(0, 0.6);
      const ch = S.chapter;
      P.showBanner(t('Chapter {n} — {title}', { n: ch.id, title: t(ch.title) }), t('the adventure goes on'));
    }
    this.stage = 'roam';
  }

  async runNests() {
    const P = this.party;
    P.busy++;
    await P.fadeTo(1, 0.4);
    this.setupCombat();
    const h = P.spawnNpc('hollis', PLAZA.x + 1.4, PLAZA.z - 1.6, { x: 0, z: 1 });
    h.restDir = { x: 0.2, z: 1 };
    this.hollis = h;
    P.gatherAt(PLAZA.x, PLAZA.z + 1.4, 2.2);
    for (const p of P.players) p.actor.face(h.pos.x, h.pos.z);
    P.state.hour = 8.3;
    await P.fadeTo(0, 0.6);
    P.showBanner(t('Explore & adventure'), t('the valley after the storm'));
    audio.sfx('bell', { volume: 0.6 });
    await P.wait(1.4);
    h.setEmote('exclaim', 1.2);
    await P.say('hollis', 'Adventurers, thank goodness! Last night’s storm left gloom nests all over the valley.');
    await P.say('hollis', 'Grumpy gloom creatures nap around each one. Wake them, bonk them, and the nest melts away — leaving a treasure chest behind!');
    await P.say('hollis', 'Animals caught in the gloom turn back into themselves when you beat it out of them. Be kind — some might even follow you home.');
    await P.say('hollis', 'Clear {n} nests and the Grumblecloud itself will come down to Starfall Hill. And if you fancy a friendly scrap, ring the gong at the Festival Ring!', { vars: { n: GOAL } });
    if (P.big) await P.say('hollis', 'And beyond the valley, the wild lands! Waystones to travel by, sealed golden chests, races on the roads, gloom camps… The host can bring up the world map.');
    P.busy = Math.max(0, P.busy - 1);
    this.stage = 'roam';
    P.showBanner(t('Off you go!'), t('split up or stick together — the camera follows'));
  }

  setupCombat() {
    const P = this.party;
    const C = P.startCombat({ pvp: false });
    C.onKill = (e, p) => this.onKill(e, p);
    C.onDown = (q) => this.stat(q, 'naps');
    C.onRevive = (q, by) => { if (by && by !== q) this.stat(by, 'revives'); };
    C.onAllDown = () => this.allDown();
    for (const p of P.players) this.applyRelics(p);
    return C;
  }

  applyRelics(p) {
    const C = this.party.combat, f = p.fighter;
    if (!C || !f) return;
    f.blessings = this.relics.slice();
    C.refreshStats(p, true);
  }

  suspend() {
    this.suspended = true;
    for (const n of this.nests) if (n.state === 'asleep' || n.state === 'awake') { n.enemies = []; n.state = 'idle'; }
    this.wanderers = [];
  }

  // back from the Festival Ring
  async resume() {
    const P = this.party;
    this.suspended = false;
    P.phase = 'adventure';
    this.setupCombat();
    this.hollis = P.spawnNpc('hollis', PLAZA.x + 1.4, PLAZA.z - 1.6, { x: 0, z: 1 });
    P.gatherAt(GONG.x + 0.4, GONG.z - 1.6, 1.4);
    P.buddies.regroup();
    for (const p of P.players) p.actor.face(ARENA.x, ARENA.z);
    await P.fadeTo(0, 0.5);
    P.showBanner(t('Back to exploring'), this.progressText());
  }

  async toArena(mode) {
    const P = this.party;
    this.suspend();
    P.act = new ArenaAct(P, { mode, parent: this });
    P.act.start();
  }

  // ------------------------------------------------------------------ fights
  onKill(e, p) {
    if (p) this.stat(p, 'kos');
    if (this.saga) this.saga.onKill(e, p);
    // a freed gloomy stag becomes its freer's mount (if they haven't got one yet)
    const M = this.party.mounts;
    const ride = e.def.animal === 'deer' ? 'stag' : e.def.mount;
    if (e.freed && p && M && ride && M.freeFriend(p, ride, e.x, e.z)) { e.remove(); e.fading = 0; this.stat(p, 'freed'); return; }
    if (e.freed) {
      const b = this.party.buddies.adoptFrom(e, p);
      if (b) { e.remove(); e.fading = 0; this.stat(b.owner, 'freed'); }
      else this.stat(p, 'freed');
    }
    if (e.type === 'boss') this.victory();
  }

  removeEnemy(e) {
    if (!e.alive && !(e.fading > 0)) return;
    e.alive = false;
    e.fading = 0;
    e.remove();
  }

  async allDown() {
    if (this.wiping) return;
    this.wiping = true;
    const P = this.party;
    P.showBanner(t('Everyone’s napping…'), this.stage === 'boss' ? t('the Grumblecloud gloats') : t('the gloom got bored and wandered off'));
    await P.wait(2.6);
    await P.fadeTo(1, 0.6);
    const C = P.combat;
    if (C) {
      if (this.stage === 'boss') {
        const b = C.enemies.find((e) => e.alive && e.type === 'boss');
        if (b) b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.2);
        for (const e of C.enemies) if (e.alive && e.type !== 'boss') this.removeEnemy(e);
        P.gatherAt(HILL.x, HILL.z + 2.5, 2.4);
      } else {
        for (const n of this.nests) if (n.state === 'awake') n.despawn();
        for (const e of this.wanderers) this.removeEnemy(e);
        this.wanderers = [];
      }
      for (const p of P.players) if (p.fighter && p.fighter.down) C.revive(p, 0.6, null);
    }
    P.buddies.regroup();
    await P.fadeTo(0, 0.6);
    this.wiping = false;
  }

  nestCleansed(n) {
    const P = this.party, C = P.combat;
    this.cleansed++;
    const left = Math.max(0, GOAL - this.cleansed);
    P.showBanner(t('Nest cleansed!'), this.bossBeaten ? t('{area} is bright again', { area: t(n.area) }) : left ? t('{area} is bright again · {k} to go', { area: t(n.area), k: left }) : t('{area} is bright again', { area: t(n.area) }));
    P.toast(t('{area}: the gloom is gone!', { area: t(n.area) }), '#8fd6b4');
    for (const p of P.players) {
      if (!p.fighter || !C) continue;
      if (p.fighter.down && Math.hypot(p.pos.x - n.x, p.pos.z - n.z) < 16) C.revive(p, 0.6, null);
      C.gainXp(p, 12 + this.cleansed * 3);
      if (Math.hypot(p.pos.x - n.x, p.pos.z - n.z) < 16) this.stat(p, 'nests');
    }
    // a chest tumbles out of the sky
    this.dropChest(n.x, n.z);
    if (!this.bossBeaten && this.cleansed === Math.min(GOAL, this.nests.length)) P.wait(4.5).then(() => this.summonBoss());
  }

  // gloom creatures wandering the valley (more of them at night)
  updateWanderers(dt) {
    const P = this.party, C = P.combat;
    this.wanderers = this.wanderers.filter((e) => e.alive);
    if (this.stage !== 'roam') return;
    const night = NIGHT(P.state.hour);
    this.wanderT -= dt * (night ? 1.8 : 1);
    if (this.wanderT > 0) return;
    this.wanderT = rand(70, 105);
    if (this.wanderers.length >= 5) return;
    const cand = P.players.filter((p) => p.connected && p.fighter && !p.fighter.down && !this.nests.some((n) => n.state === 'awake' && Math.hypot(n.x - p.pos.x, n.z - p.pos.z) < 18));
    if (!cand.length) return;
    const p = pick(cand);
    const types = night ? ['gloomling', 'gloomling', 'crow', pick(['biggloom', 'fox', 'gloomling'])] : ['gloomling', 'gloomling', pick(['fox', 'gloomling', 'crow'])];
    const n = P.players.filter((q) => q.connected).length;
    for (let i = 3; i < n; i += 2) types.push('gloomling');
    let spawned = 0;
    for (const ty of types) {
      for (let k = 0; k < 20; k++) {
        const a = Math.random() * Math.PI * 2, d = rand(6.5, 9);
        const x = p.pos.x + Math.cos(a) * d, z = p.pos.z + Math.sin(a) * d * 0.8;
        if (!this.reachable(x, z) || P.world.overCol.blocked(x, z, 0.45)) continue;
        this.wanderers.push(C.spawn(ty, x, z));
        spawned++;
        break;
      }
    }
    if (spawned) {
      P.toast(t('Gloom creatures sneak up on {name}!', { name: p.name }), '#b88cf0');
      audio.sfx('growl', { volume: 0.6 });
    }
  }

  // ------------------------------------------------------------------ treasure
  get chests() { return this.chestBox.list; }
  dropChest(x, z, opts) { return this.chestBox.drop(x, z, opts); }
  openChest(c, p) { this.chestBox.open(c, p); }

  // what's inside: a relic for everyone, stardust, a snack, gear
  onChestOpen(c, p) {
    const P = this.party, C = P.combat;
    this.stat(p, 'chests');
    // a relic: a blessing for the whole party, for the rest of the day
    const id = drawCards(this.relics, 1)[0];
    if (id) {
      this.relics.push(id);
      for (const q of P.players) if (q.fighter) { q.fighter.blessings.push(id); C.refreshStats(q, false); }
      P.showBanner(t('Relic: {relic}', { relic: t(BLESSINGS[id].name) }), t('{desc} — for everyone!', { desc: t(BLESSINGS[id].desc) }));
    }
    if (C) {
      for (let i = 0; i < (c.golden ? 40 : 16); i++) C.drop('dust', c.x, c.z);
      C.drop(Math.random() < 0.6 ? 'tart' : 'coffee', c.x, c.z);
      if (c.golden) C.drop('tart', c.x, c.z);
    }
    P.toast(t(c.golden ? '{name} opened a golden chest!' : '{name} opened a chest!', { name: p.name }), p.color);
    if (P.progress) P.progress.chestLoot(c, p);
  }

  dig(d, p) {
    const P = this.party, w = this.world;
    d.dug = true;
    this.stat(p, 'digs');
    w.fx.emit('soil', d.x, 0.1, d.z, 10);
    w.fx.emit('dust', d.x, 0.1, d.z, 8);
    audio.sfx('dig', { volume: 0.8 });
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.12, 8), toon(P.r3d, { color: 0x7a5238, key: 'dig-mound' }));
    m.position.set(d.x, 0.06, d.z);
    m.receiveShadow = true;
    this.root.add(m);
    P.wait(0.45).then(() => {
      if (!P.players.includes(p)) return;
      w.fx.emit('sparkle', p.pos.x, 2, p.pos.z, 20, { color: '#ffd66b' });
      w.fx.emit('ring', p.pos.x, 0.1, p.pos.z, 1, { color: '#ffd66b' });
      audio.jingle('shard');
      P.setLook(p, { ...p.look, hat: d.hat });
      const prof = P.profileOf(p);
      prof.hats = Array.from(new Set([...(prof.hats || []), d.hat]));
      P.saveProfile(p);
      P.sendHats(p);
      p.setEmote('star', 2);
      P.showBanner(t('{name} dug up the {hat}!', { name: p.name, hat: t(TREASURE_HATS[d.hat]) }), t('a treasure hat — yours to keep'));
    });
  }

  ringGong(p) {
    const P = this.party;
    if (this.gongBusy) return;
    this.gongBusy = true;
    P.arena.bong();
    p.setEmote('exclaim', 1.2);
    const opts = [
      { id: 'waves', label: t('Arena: gloom waves'), sub: t('team up against wave after wave'), color: '#b88cf0' },
    ];
    if (P.players.filter((q) => q.connected).length >= 2) {
      opts.push({ id: 'brawl', label: t('Arena: brawl'), sub: t('friendly free-for-all!'), color: '#ef6479' });
      opts.push({ id: 'king', label: t('Arena: king of the ring'), sub: t('hold the golden circle alone'), color: '#f4c542' });
    }
    opts.push({ id: 'no', label: t('Not now'), sub: t('keep exploring'), color: '#8fd67a' });
    P.ask(t('{name} rang the gong! Fight at the Festival Ring?', { name: p.name }), opts, 20).then((i) => {
      this.gongBusy = false;
      const o = opts[i];
      if (o && o.id !== 'no' && P.act === this) this.toArena(o.id);
    });
  }

  chat(n, p) {
    const left = Math.max(0, GOAL - this.cleansed);
    const tip = !this.bossBeaten && left && Math.random() < 0.35 ? t('{n} nests to go. You can do it!', { n: left }) : t(pick(TIPS), { a: this.party.keyName('a') });
    n.bubble = tip; n.bubbleT = 3; n.lookAt = p.pos; n.talking = true; n.speaking = false;
    audio.blip({ pitch: 52, wave: 'triangle' });
  }

  // what's within reach of a player (A does it instead of attacking)
  nearThing(p) {
    const P = this.party;
    if (p.fighter && p.fighter.down) return null;
    const d = (o) => Math.hypot(o.x - p.pos.x, o.z - p.pos.z);
    for (const c of this.chests) if (!c.opened && c.landed && d(c) < 1.5) return { kind: 'chest', c, label: 'Open', hint: 'A treasure chest! Press A to open it' };
    const sg = this.saga && this.saga.nearThing(p);
    if (sg) return sg;
    // in the thick of a fight, A is for fighting (no chats, trips or races by accident)
    const C = P.combat;
    if (C && C.enemies.some((e) => e.alive && e.state !== 'sleep' && Math.hypot(e.x - p.pos.x, e.z - p.pos.z) < 7)) return null;
    const room = P.rooms && P.rooms.nearThing(p);
    if (room) return room;
    const dino = P.dinos && P.dinos.nearThing(p);
    if (dino) return dino;
    for (const g of this.digs) if (!g.dug && d(g) < 1.2) return { kind: 'dig', g, label: 'Dig', hint: 'Something glints in the ground… dig!' };
    if (this.stage === 'roam' && d(GONG) < 1.8) return { kind: 'gong', label: 'Ring', hint: 'Ring the gong for a fight at the Festival Ring' };
    const sec = (P.secrets && P.secrets.near(p)) || (P.races && P.races.near(p));
    if (sec) return sec;
    for (const n of P.npcs) {
      if (Math.hypot(n.pos.x - p.pos.x, n.pos.z - p.pos.z) >= 1.6 + (n.counter ? 0.7 : 0)) continue;
      if (n.shop) return { kind: 'npc', n, label: 'Trade', hint: 'Pim trades mystery gear for stardust' };
      if (n.wants && !n.granted && p.food === n.wants) return { kind: 'npc', n, label: 'Give', hint: 'A present for {npc}!', vars: { npc: n.def.short } };
      return { kind: 'npc', n, label: 'Chat', hint: 'Say hi!' };
    }
    const s = P.travel && P.travel.near(p);
    if (s) return { kind: 'stone', s, label: 'Travel', hint: 'A waystone: travel to any other you’ve touched' };
    return null;
  }

  // ------------------------------------------------------------------ the Grumblecloud
  summonBoss() {
    const P = this.party;
    if (this.stage !== 'roam' || this.bossBeaten || P.act !== this) return;
    this.stage = 'gather';
    this.dim = 0.55;
    this.gatherT = 0;
    this.target = HILL;
    audio.sfx('thunder', { volume: 0.9 });
    P.cam.shake = 0.5;
    P.showBanner(t('The Grumblecloud is furious!'), t('everyone to Starfall Hill'));
    for (const e of this.wanderers) this.removeEnemy(e);
    this.wanderers = [];
  }

  updateGather(dt) {
    const P = this.party;
    const live = P.players.filter((p) => p.connected);
    const here = live.filter((p) => Math.hypot(p.pos.x - HILL.x, p.pos.z - HILL.z) < 7.5);
    this.gatherInfo = { here: here.length, total: live.length, late: live.filter((p) => !here.includes(p)) };
    this.gatherT += dt;
    if (Math.random() < dt * 0.25) { audio.sfx('thunder', { volume: 0.35 }); P.cam.flash = 0.4; }
    // stragglers get a lift from a friendly gust after a while
    if (this.gatherT > 55) {
      for (const p of this.gatherInfo.late) {
        this.world.fx.emit('smoke', p.pos.x, 0.5, p.pos.z, 6, { color: '#c9c4e8' });
        p.actor.pos = { x: HILL.x + rand(-2, 2), z: HILL.z + 2.4 + rand(-0.5, 0.5) };
        this.world.fx.emit('sparkle', p.pos.x, 1, p.pos.z, 10, { color: '#c9c4e8' });
        P.toast(t('A friendly gust carried {name} up the hill', { name: p.name }), p.color);
      }
      P.buddies.regroup();
    }
    if (live.length && here.length === live.length) this.startBoss();
  }

  startBoss() {
    const P = this.party, C = P.combat;
    this.stage = 'boss';
    this.target = null;
    this.gatherInfo = null;
    this.music = 'boss';
    C.bounds = { x: HILL.x, z: HILL.z, rx: 8.2, rz: 4.8 };
    for (const n of this.nests) if (n.state === 'asleep' || n.state === 'awake') n.despawn();
    this.boss = C.spawn('boss', HILL.x, HILL.z - 1, { hpScale: 1.1 });
    P.showBanner(t('The Grumblecloud!'), t('hit it while it naps'));
    P.cam.shake = 0.6;
  }

  async victory() {
    const P = this.party, C = P.combat;
    this.bossBeaten = true;
    this.stage = 'won';
    if (C) C.bounds = null;
    this.music = 'festival';
    await P.wait(1.2);
    this.dim = 0;
    P.state.hour = 17.8;   // a golden evening for the celebrations
    P.showBanner(t('The valley is safe!'), t('the Grumblecloud feels much better'));
    for (let k = 0; k < 14; k++) {
      await P.wait(0.4);
      const x = HILL.x + rand(-7, 7), z = HILL.z - 2 + rand(-2, 3), col = pick(['#ffd66b', '#ec5f73', '#8fd6b4', '#b9a2e3', '#f6a05a']);
      this.world.fx.emit('flash', x, 5 + Math.random() * 2, z, 1, { color: col });
      this.world.fx.emit('firework', x, 5 + Math.random() * 2, z, 36, { color: col });
      audio.sfx('firework', { volume: 0.55 });
      if (k % 4 === 0) for (const p of P.players) { p.setEmote(pick(['heart', 'star', 'note', 'sparkle']), 1.4); p.actor.jumpV = 4.6; }
    }
    for (const p of P.players) p.stars = (p.stars || 0) + 3;
    await this.awardsCard();
    const opts = [
      { id: 'roam', label: t('Keep exploring'), sub: t('{n} nests & {k} treasures left', { n: this.nests.filter((n) => n.state !== 'clean').length, k: this.digs.filter((d) => !d.dug).length }), color: '#8fd67a' },
      { id: 'waves', label: t('Arena: gloom waves'), sub: t('team up against wave after wave'), color: '#b88cf0' },
      { id: 'lobby', label: t('Back to the lobby'), sub: t('change outfits, invite friends'), color: '#4f73b6' },
    ];
    const i = await P.ask(t('What now?'), opts, 30);
    this.music = null;
    this.stage = 'roam';
    if (opts[i].id === 'lobby') P.backToLobby();
    else if (opts[i].id === 'waves') this.toArena('waves');
    else P.showBanner(t('Free roam'), t('the big screen can press L to go back to the lobby'));
  }

  awardsCard() {
    const P = this.party, ps = P.players.slice();
    const cats = [
      { k: 'kos', title: 'Gloom Buster', unit: 'bonked' },
      { k: 'freed', title: 'Animal Friend', unit: 'freed' },
      { k: 'revives', title: 'Helping Hand', unit: 'wake-ups' },
      { k: 'chests', title: 'Treasure Hunter', unit: 'chests' },
      { k: 'digs', title: 'Hat Collector', unit: 'hats' },
      { k: 'nests', title: 'Nest Cleaner', unit: 'nests' },
      { k: 'naps', title: 'Sleepyhead', unit: 'naps' },
    ];
    const given = [], free = new Set(ps.map((p) => p.slot));
    for (const c of cats) {
      if (!free.size) break;
      const cand = ps.filter((p) => free.has(p.slot));
      const best = cand.reduce((a, b) => (this.statOf(b, c.k) > this.statOf(a, c.k) ? b : a), cand[0]);
      if (!best || this.statOf(best, c.k) <= 0) continue;
      given.push({ p: best, c, v: this.statOf(best, c.k) });
      free.delete(best.slot);
    }
    for (const slot of free) given.push({ p: ps.find((q) => q.slot === slot), c: { title: 'Heart of the Party', unit: '' }, v: '' });
    given.sort((a, b) => a.p.slot - b.p.slot);
    return new Promise((resolve) => { this.overlay = { kind: 'awards', given, t: 0, resolve }; audio.jingle('festival'); });
  }

  // ------------------------------------------------------------------ frame
  update(dt) {
    const P = this.party, s = P.state;
    if (this.suspended) return;
    // the clock: days are long, nights are short (but the gloom loves them)
    if (!P.busy && !P.dialogue.active && this.stage !== 'boss') {
      const was = NIGHT(s.hour);
      s.hour += dt / (was ? 45 : 80);
      if (s.hour >= 24) { s.hour -= 24; s.day++; }
      const now = NIGHT(s.hour);
      if (!was && now && this.stage === 'roam') P.showBanner(t('Night falls'), t('the gloom grows bolder — stick together!'));
      if (was && !now && this.stage === 'roam') P.showBanner(t('Good morning!'), t('a new day in the valley'));
    }
    for (const n of this.nests) n.update(dt);
    this.chestBox.update(dt);
    if (this.saga) {
      this.saga.update(dt);
      const tg = this.saga.target();
      this.target = tg;
    } else if (P.combat && !this.wiping) this.updateWanderers(dt);
    if (this.stage === 'gather') this.updateGather(dt);
    if (this.overlay) {
      const o = this.overlay;
      o.t += dt;
      if ((o.t > 3 && P.anyPressed('interact')) || o.t > 25) { P.consume('interact'); this.overlay = null; o.resolve(); }
    }
    // treasure glints when someone is close
    for (const d of this.digs) {
      if (d.dug) continue;
      d.glintT -= dt;
      if (d.glintT <= 0) {
        d.glintT = rand(0.5, 1.1);
        if (this.nearestDist(d.x, d.z) < 7) this.world.fx.emit('sparkle', d.x + rand(-0.15, 0.15), 0.12, d.z + rand(-0.1, 0.1), 2, { color: '#ffe89a' });
      }
    }
    // A near a chest, a glint, the gong or a villager does that instead of swinging
    if (!P.busy && !P.dialogue.active && !P.vote && !this.overlay) {
      for (const p of P.players) {
        if (!p.connected || !p.input.pressed('a')) continue;
        const th = this.nearThing(p);
        if (!th) continue;
        p.input.edges.delete('a'); p.input.edges.delete('interact');
        if (th.kind === 'chest') this.openChest(th.c, p);
        else if (th.kind === 'dig') this.dig(th.g, p);
        else if (th.kind === 'gong') this.ringGong(p);
        else if (th.kind === 'npc') { if (th.n.traveler && P.travel) P.travel.chat(th.n, p); else if (th.n.counter && P.rooms) P.rooms.chat(th.n, p); else this.chat(th.n, p); }
        else if (th.kind === 'stone') P.travel.use(p, th.s);
        else if (th.kind === 'secret') th.use(p);
        else if (th.kind === 'room') P.rooms.use(th, p);
        else if (th.kind === 'dino') P.dinos.pat(th.d, p);
      }
    }
    for (const n of P.npcs) if (n.bubbleT > 0 && (n.bubbleT -= dt) <= 0) { n.bubble = null; n.talking = false; }
    this.objective = this.objectiveText();
    if (!P.busy) this.updateCard(dt);
  }

  // the objective card pops up when something changes (goal, relics, who's
  // here, a new area), and now and then as a reminder — never for long
  updateCard(dt) {
    const P = this.party, s = P.state;
    const v0 = P.cam.views[0];
    const area = v0 ? P.placeName(v0.cx, v0.cz) : '';
    const G = this.gatherInfo;
    const sub = G && G.total > 1 ? t('{n}/{total} here', { n: G.here, total: G.total }) + (G.late.length && G.late.length <= 3 ? ' · ' + t('waiting for {names}', { names: G.late.map((p) => p.name).join(', ') }) : '')
      : `${t(area)} · ${timeLabel(s.hour)}`;
    const relics = this.relics.length ? t('Relics: {list}', { list: this.relics.map((r) => t(BLESSINGS[r].name)).join(', ') }) : '';
    const key = this.objective + '|' + (G ? G.here : '') + '|' + this.relics.length;
    this.remindT = (this.remindT ?? 30) - dt;
    this.areaT = (this.areaT || 0) - dt;
    // (cardArea is the place the card last showed: a new one waits for areaT, it isn't forgotten;
    // a card already out just gets its line updated)
    const o = P.obj;
    if (o && o.t < o.secs && o.text === this.objective && o.sub !== sub) o.sub = sub;
    if (key !== this.cardKey) { P.showObjective(this.objective, sub, 7, relics); this.cardKey = key; this.remindT = 90; this.areaT = 20; this.cardArea = area; }
    else if (area !== this.cardArea && this.areaT <= 0) { P.showObjective(this.objective, sub, 5, relics); this.remindT = 90; this.areaT = 20; this.cardArea = area; }
    else if (this.remindT <= 0) { P.showObjective(this.objective, sub, 5, relics); this.remindT = 90; this.cardArea = area; }
  }

  progressText() {
    return this.bossBeaten ? t('the valley is safe · free roam') : t('Nests cleansed: {n}/{goal}', { n: Math.min(this.cleansed, GOAL), goal: GOAL });
  }

  // out in the wild lands (the first view's centre outside the valley)?
  inWild() {
    const P = this.party, v = P.cam.views[0], c = v && ((P.rooms && P.rooms.doorOf(v)) || { x: v.cx, z: v.cz });
    return !!(P.big && c && !P.big.inValley(c.x, c.z));
  }

  // things to do out there, for the card and the arrows
  wildTodo() {
    const P = this.party, out = [];
    if (P.encounters) for (const c of P.encounters.camps) if (c.state !== 'cleared') out.push(c);
    if (P.lairs) for (const L of P.lairs.list) if (L.state === 'idle') out.push(L);
    if (P.secrets) for (const S of P.secrets.list) if (S.state === 'sealed') out.push({ x: S.cx, z: S.cz });
    if (P.travel) for (const st of P.travel.stones) if (!st.attuned) out.push(st);
    if (P.races) for (const c of P.races.list) if (!P.races.best[c.id]) out.push(c.start);
    return out;
  }

  objectiveText() {
    const so = this.saga && this.saga.objective();
    if (so) return so.lines[0] || so.title;
    if (this.stage === 'gather') return t('Everyone to Starfall Hill!');
    if (this.stage === 'boss') return t('Calm the Grumblecloud!');
    if (this.inWild()) {
      const P = this.party, E = P.encounters, L = P.lairs, S = P.secrets;
      return t('Wild lands: camps {a}/{b} · guardians {c}/{d} · secrets {e}/{f}', {
        a: E ? E.cleared.size : 0, b: E ? E.camps.length : 0,
        c: L ? L.list.filter((q) => q.state === 'beaten').length : 0, d: L ? L.list.length : 0,
        e: S ? Object.keys(S.save.solved).length : 0, f: S ? S.list.length + S.digs.length : 0,
      });
    }
    if (this.bossBeaten) return t('Free roam: {n} nests, {k} treasures left', { n: this.nests.filter((n) => n.state !== 'clean').length, k: this.digs.filter((d) => !d.dug).length });
    return t('Cleanse the gloom nests: {n}/{goal}', { n: this.cleansed, goal: GOAL });
  }

  ctxFor(p) {
    const P = this.party;
    if (this.overlay) return { a: this.overlay.t > 3 ? 'Continue' : null, b: 'Hop', hint: 'The valley is safe!' };
    if (P.dialogue.active) return { a: 'Next', b: null, hint: 'Story time — look at the big screen!' };
    const th = this.nearThing(p);
    if (th) return { a: th.label, b: 'Jump', hint: th.hint, vars: th.vars };
    const f = p.fighter;
    const race = (P.races && P.races.ctxFor(p)) || (P.events && P.events.ctxFor(p));
    if (race) return { a: f && f.charging ? 'Release!' : 'Attack', b: 'Jump', hint: race.hint, vars: race.vars };
    const indoor = P.rooms && P.rooms.hint(p);
    if (indoor) return { a: f && f.charging ? 'Release!' : 'Attack', b: 'Jump', hint: indoor.hint, vars: indoor.vars };
    const secret = this.stage === 'roam' && P.secrets ? P.secrets.hint(p) : null;
    const hint = secret || (this.stage === 'gather' ? 'Everyone to Starfall Hill!'
      : this.stage === 'boss' ? 'Hit the Grumblecloud while it naps!'
        : NIGHT(P.state.hour) ? 'Night: light a campfire (button at the top) and sleep till morning'
          : P.big && !P.big.inValley(p.pos.x, p.pos.z) ? 'The wild lands: gloom camps, guardians, sealed chests, races — follow the arrow'
            : 'Explore! Cleanse gloom nests, dig for treasure');
    return { a: f && f.charging ? 'Release!' : 'Attack', b: 'Jump', hint };
  }

  syncPad(p) { this.party.sendHats(p); }

  onJoin(p) { this.applyRelics(p); }
  onLeave(p) { void p; }
  onLand(p) { void p; }

  dispose() {
    this.disposed = true;
    if (this.saga) { this.saga.dispose(); if (this.party.saga === this.saga) this.party.saga = null; }
    this.world.over.root.remove(this.root);
    this.dim = 0;
    this.overlay = null;
  }

  // ------------------------------------------------------------------ drawing
  drawWorld() {}

  drawLabels(ctx, v) {
    const P = this.party;
    if (P.busy || this.overlay) return;
    // each view gets an arrow to its nearest gloom (or to the hill)
    let tgt = this.target;
    if (!tgt && this.stage === 'roam' && v.members.length) {
      let cx = 0, cz = 0;
      for (const m of v.members) { cx += m.pos.x; cz += m.pos.z; }
      cx /= v.members.length; cz /= v.members.length;
      let bd = 1e9;
      const wild = P.big && !P.big.inValley(cx, cz);
      // in the valley: the nearest nest; out in the wild lands: the nearest thing to do
      for (const n of wild ? this.wildTodo() : this.nests) {
        if (n.state === 'clean') continue;
        const d = Math.hypot(n.x - cx, n.z - cz);
        if (d < bd) { bd = d; tgt = n; }
      }
      if (bd < 9 || (wild && bd > 90)) tgt = null;
    }
    // (racers get an arrow to their next flag instead)
    const special = (P.races && P.races.drawArrows(ctx, v)) || (P.events && P.events.drawArrows(ctx, v));
    if (tgt && !special) drawTargetArrow(P, ctx, v, tgt, this.target ? '#f2b63d' : '#c9a2f0');
    // "A" over chests you can open; ! and ? over the saga's people
    this.chestBox.drawPrompts(ctx, v);
    if (this.saga) this.saga.drawLabels(ctx, v);
    if (this.party.dungeons) this.party.dungeons.drawLabels(ctx, v);
    P.buddies.drawLabels(ctx, v, heart);
  }

  // marks on a map: `M(x, z)` → screen point
  mapMarks(out = []) {
    out.push({ k: 'arena', x: ARENA.x, z: ARENA.z, name: t('Festival Ring'), st: t('Ring the gong to fight there') });
    if (this.saga) this.saga.mapMarks(out);
    for (const n of this.nests) out.push({ k: 'nest', x: n.x, z: n.z, on: n.state === 'clean', a: n.state === 'awake' ? 1 : 0, name: t('Gloom nest'), st: n.state === 'clean' ? t('Cleansed') : '' });
    if (this.stage === 'gather' || this.stage === 'boss') out.push({ k: 'hill', x: HILL.x, z: HILL.z, name: t('Starfall Hill'), st: t('Objective') });
    return out;
  }
  drawMapMarks(ctx, M) { drawMarks(ctx, M, this.mapMarks(), this.party.t); }

  drawUi(ctx) {
    const P = this.party, W = P.display.w, H = P.display.h;
    if (P.phase === 'lobby') return;
    this.drawBadges(ctx);
    if (P.cam.layout.type !== 'grid' && !P.dialogue.active && !P.vote && !this.overlay && !P.bigMapOpen) {
      const mw = Math.min(110, Math.round(W * 0.2)), mh = Math.round(mw * 0.62);
      P.drawMiniMap(ctx, W - mw - 7, H - 21 - mh - 5, mw, mh);
    }
    if (this.overlay) this.drawAwards(ctx, W, H);
    if (this.saga && !P.dialogue.active) this.saga.games.drawUi(ctx, W, H);
  }

  drawBadges(ctx) {
    const P = this.party;
    if (P.dialogue.active || this.overlay) return;
    P.drawBadges(ctx, (p) => (p.fighter ? t('Lv{n}', { n: p.fighter.level }) : ''));
  }


  drawAwards(ctx, W, H) {
    const o = this.overlay, P = this.party, given = o.given;
    const pw = Math.min(W - 30, 330), ph = 40 + given.length * 17;
    const px = Math.round((W - pw) / 2), py = Math.round(H / 2 - ph / 2);
    panel(ctx, px, py, pw, ph);
    drawText(ctx, t('Heroes of the Valley'), px + pw / 2, py + 9, { color: '#8a5234', align: 'center' });
    given.forEach((a, i) => {
      if (o.t < 0.5 + i * 0.6) return;
      const y = py + 25 + i * 17;
      const pc = P.portraitOf(a.p.who, 'happy');
      ctx.fillStyle = a.p.color; ctx.fillRect(px + 8, y - 1, 16, 16);
      if (pc) ctx.drawImage(pc, 8, 4, 28, 28, px + 9, y, 14, 14);
      drawText(ctx, a.p.name, px + 30, y + 3, { color: UI.ink });
      drawText(ctx, t(a.c.title), px + 100, y + 3, { color: '#8a5234' });
      if (a.v !== '' && a.c.unit) drawText(ctx, `${a.v} ${t(a.c.unit)}`, px + pw - 10, y + 3, { color: UI.inkSoft, align: 'right' });
    });
    if (o.t > 3 && Math.floor(o.t * 2) % 2) drawText(ctx, t('A to continue'), px + pw / 2, py + ph + 6, { color: '#fff7e6', align: 'center', outline: '#3b2a2e' });
  }
}
