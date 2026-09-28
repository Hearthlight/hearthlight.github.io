// Mounts. Wild herds roam the big world — stags in Deep Whisperwood, boars
// and giant hens on the Golden Steppe, turtles on the southern beaches, bears
// on the glacier, big frogs in Croakmire. Bring an animal its favourite food
// (it grows near the herd), win its trust on your phone (tap A while the
// marker is in the green, three times) and it's yours for good: ride it
// (faster, bigger jumps, a kick on A and a special on X), get off with Y,
// whistle it back with Y. Gloomy stags freed in a fight trust you straight
// away. Each phone keeps its own mounts.

import { THREE, toon } from '../render/r3d.js';
import { audio } from '../engine/audio.js';
import { t } from '../i18n.js';
import { TT } from '../world/tiles.js';
import { drawText, measure } from '../engine/font.js';
import { ARENA_SITE, ZONES } from '../world/big/layout.js';
import { buildMount, animMount, paintSaddle, RIG, MOUNT_SCALE } from '../models/mounts3d.js';

export const FOODS = {
  apple: { a: 'an apple' }, acorn: { a: 'an acorn' }, corn: { a: 'a corncob' },
  kelp: { a: 'some kelp' }, honey: { a: 'a honeycomb' }, bug: { a: 'a juicy bug' },
  fern: { a: 'a fern frond' }, fish: { a: 'a fresh fish' },
};
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const MOUNTS = {
  stag: { name: 'Stag', a: 'a stag', the: 'the stag', food: 'apple', zones: ['deepwood', 'heights'], speed: 1.6, swim: 0.85, jump: 7.4, attack: { name: 'Antler toss', dmg: 16, reach: 1.3, knock: 3, launch: 5, icon: { g: 'paw', s: 'nature' } }, ability: { id: 'dash', name: 'Dash', cd: 4.5, icon: { g: 'dash', s: 'nature' } }, herd: [2, 3], green: 0.22, pace: 1.0, herds: 4 },
  boar: { name: 'Boar', a: 'a boar', the: 'the boar', food: 'acorn', zones: ['steppe', 'canyon'], speed: 1.45, swim: 0.8, jump: 6.2, attack: { name: 'Tusk jab', dmg: 18, reach: 1.2, knock: 3.4, icon: { g: 'paw', s: 'phys' } }, ability: { id: 'charge', name: 'Charge', cd: 6, icon: { g: 'boot', s: 'fire' } }, herd: [2, 3], green: 0.2, pace: 1.15, herds: 4 },
  hen: { name: 'Giant hen', a: 'a giant hen', the: 'the giant hen', food: 'corn', zones: ['steppe', 'cloud'], speed: 1.3, swim: 0.95, jump: 8.2, glide: true, attack: { name: 'Peck', dmg: 12, reach: 1.1, knock: 2, icon: { g: 'feather', s: 'phys' } }, ability: { id: 'flap', name: 'Flap', cd: 2.5, icon: { g: 'wing', s: 'storm' } }, herd: [3, 4], green: 0.28, pace: 0.9, herds: 4 },
  turtle: { name: 'Turtle', a: 'a turtle', the: 'the turtle', food: 'kelp', zones: ['lagoon', 'sunken', 'straits', 'sea'], speed: 0.95, swim: 2.2, jump: 4.4, attack: { name: 'Shell bump', dmg: 14, reach: 1.2, knock: 3.6, icon: { g: 'shield', s: 'frost' } }, ability: { id: 'spin', name: 'Shell spin', cd: 6, icon: { g: 'whirl', s: 'frost' } }, herd: [2, 3], green: 0.3, pace: 0.75, herds: 4, beach: true },
  bear: { name: 'Bear', a: 'a bear', the: 'the bear', food: 'honey', zones: ['glacier', 'heights'], speed: 1.25, swim: 1.05, jump: 5.8, armor: 0.4, attack: { name: 'Swipe', dmg: 22, reach: 1.35, knock: 3.2, icon: { g: 'paw', s: 'phys' } }, ability: { id: 'slam', name: 'Ground slam', cd: 7, icon: { g: 'quake', s: 'storm' } }, herd: [1, 2], green: 0.18, pace: 1.2, herds: 4 },
  frog: { name: 'Big frog', a: 'a big frog', the: 'the big frog', food: 'bug', zones: ['marsh', 'bouncecap'], speed: 1.25, swim: 1.5, jump: 9.6, attack: { name: 'Tongue lash', dmg: 14, reach: 2.4, knock: 1.5, icon: { g: 'spiral', s: 'nature' } }, ability: { id: 'leap', name: 'Mega leap', cd: 4, icon: { g: 'boot', s: 'nature' } }, herd: [2, 3], green: 0.24, pace: 1.05, herds: 4 },
  // Dino Isle (Adventure v5)
  trike: { name: 'Triceratops', a: 'a triceratops', the: 'the triceratops', food: 'fern', zones: ['dino'], speed: 1.35, swim: 0.8, jump: 5.4, armor: 0.35, attack: { name: 'Horn toss', dmg: 24, reach: 1.55, knock: 3.8, launch: 5, icon: { g: 'burst', s: 'phys' } }, ability: { id: 'stampede', name: 'Stampede', cd: 7, icon: { g: 'quake', s: 'nature' } }, herd: [2, 3], green: 0.2, pace: 1.1, herds: 3, soil: [TT.JUNGLE, TT.GRASS, TT.MEADOW] },
  raptor: { name: 'Raptor', a: 'a raptor', the: 'the raptor', food: 'fish', zones: ['dino'], speed: 1.8, swim: 0.9, jump: 8.4, attack: { name: 'Claw swipe', dmg: 17, reach: 1.25, knock: 2.2, icon: { g: 'paw', s: 'phys' } }, ability: { id: 'pounce', name: 'Pounce', cd: 4, icon: { g: 'boot', s: 'storm' } }, herd: [2, 3], green: 0.22, pace: 0.95, herds: 3, soil: [TT.JUNGLE, TT.GRASS, TT.MEADOW] },
};
export const MOUNT_ORDER = ['stag', 'boar', 'hen', 'turtle', 'bear', 'frog', 'trike', 'raptor'];
// how deep a swimming mount sits in the water (its legs paddle under the surface)
const SINK = { stag: 0.62, boar: 0.46, hen: 0.34, turtle: 0.02, bear: 0.6, frog: 0.3, trike: 0.78, raptor: 0.62 };
const swimCol = (w) => ({ move: (pos, x, z, r) => w.overCol.move(pos, x, z, r, true), blocked: (x, z, r, ig) => w.overCol.blocked(x, z, r, ig, true) });

const NEAR = 40, FAR = 52;          // wild models appear / go away (tiles from the nearest player)
// tall things that would hide an animal (the camera looks from the south, over the canopy)
const TALL = new Set(['oak', 'pine', 'snowpine', 'cherry', 'maple', 'palm', 'boulder', 'bigshroom', 'deadtree', 'acacia', 'willow', 'spire', 'column', 'mangrove', 'icespike', 'crystal', 'cactus', 'treefern', 'cycad'])
const rnd = (a, b) => a + Math.random() * (b - a);
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let q = Math.imul(a ^ (a >>> 15), 1 | a); q = (q + Math.imul(q ^ (q >>> 7), 61 | q)) ^ q; return ((q ^ (q >>> 14)) >>> 0) / 4294967296; }; }
const yawOf = (d) => Math.atan2(-d.z, d.x);

// the meter of the taming game: where the marker is after `t` seconds
export const meterAt = (time, speed) => { const u = (time * speed) % 2; return u < 1 ? u : 2 - u; };

export class Mounts {
  constructor(party) {
    this.party = party;
    this.root = new THREE.Group();
    this.root.name = 'mounts';
    party.world.over.root.add(this.root);
    this.wild = [];
    this.spots = [];
    this.home = new Map();          // slot -> the player's own mount out in the world
    this.taming = new Map();        // slot -> the taming game in progress
    this.seq = 1;
    this.placeHerds();
  }

  get big() { return this.party.big; }
  get world() { return this.party.world; }

  // ------------------------------------------------------------------ the herds
  placeHerds() {
    const B = this.big;
    if (!B) return;
    const m = B.map, r = mulberry(m.seed + 777);
    const A = ARENA_SITE;
    const centres = [];
    for (const kind of MOUNT_ORDER) {
      const D = MOUNTS[kind];
      let made = 0;
      for (let k = 0; k < 4000 && made < D.herds; k++) {
        const x = Math.floor(m.X0 + r() * m.W) + 0.5, z = Math.floor(m.Z0 + r() * m.H) + 0.5;
        if (m.inValley(Math.floor(x), Math.floor(z))) continue;
        const z0 = B.zoneAt(x, z);
        if (!z0 || !D.zones.includes(z0.id)) continue;
        if (((x - A.x) / (A.rx + 10)) ** 2 + ((z - A.z) / (A.rz + 10)) ** 2 < 1) continue;
        if (!this.landOk(x, z, D.beach)) continue;
        if (D.soil && !D.soil.includes(B.tileAt(x, z))) continue;          // (Dino Isle's own ground, not the rocks offshore)
        if (m.pois.some((q) => q.kind === 'rex_nest' && Math.hypot(q.x - x, q.z - z) < 14)) continue;    // (the Tyrant King wants his clearing to himself)
        if (centres.some((c) => Math.hypot(c.x - x, c.z - z) < (c.kind === kind ? 34 : 14))) continue;
        if (this.tallNear(x, z, 4.5) > 1) continue;                 // a clearing, so you can see them
        centres.push({ kind, x, z });
        made++;
        const herd = { kind, x, z, id: centres.length };
        const n = D.herd[0] + Math.floor(r() * (D.herd[1] - D.herd[0] + 1));
        for (let i = 0; i < n; i++) {
          const p = this.spotNear(x, z, 1.5, 4, D.beach, r);
          if (p) this.wild.push({ kind, D, herd, x: p.x, z: p.z, face: { x: r() - 0.5, z: r() - 0.5 }, state: 'graze', t: r() * 4, variant: Math.floor(r() * 3), rig: null, id: this.seq++, bubbleT: 0, y: 0 });
        }
        // its favourite food grows nearby
        for (let i = 0; i < 3; i++) {
          const p = this.spotNear(x, z, 5, 11, D.beach, r);
          if (p) this.spots.push({ food: D.food, x: p.x, z: p.z, taken: 0, obj: null });
        }
      }
    }
  }

  landOk(x, z, beach) {
    const B = this.big, tt = B.tileAt(x, z);
    if (!this.world.overCol || !B.col) return false;
    if (tt === TT.WATER || tt === TT.CORAL || tt === TT.LAVA || tt === TT.SKY || tt === TT.CREVASSE || tt === TT.ARENA) return false;
    if (B.col.blocked(x, z, 0.5)) return false;
    return beach ? tt === TT.SAND : true;
  }

  spotNear(x, z, d0, d1, beach, r) {
    for (let k = 0; k < 60; k++) {
      const a = r() * Math.PI * 2, d = d0 + r() * (d1 - d0);
      const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      if (this.landOk(px, pz, beach) && (k > 40 || this.tallNear(px, pz, 1.8) === 0)) return { x: px, z: pz };
    }
    return null;
  }

  // trees & big rocks around a point (from the big world's scatter)
  tallNear(x, z, r) {
    const B = this.big, m = B.map, CH = 32;
    const cx = Math.floor((x - m.X0) / CH), cz = Math.floor((z - m.Z0) / CH);
    let n = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const list = B.scatter.byChunk.get((cx + i) + ',' + (cz + j));
      if (list) for (const o of list) if (TALL.has(o.type) && Math.hypot(o.x - x, o.y - z) < r) n++;
    }
    return n;
  }

  // ------------------------------------------------------------------ owning & riding
  owned(p) { const pr = this.party.profileOf(p); return (pr.mounts && pr.mounts.owned) || []; }
  active(p) { const pr = this.party.profileOf(p); const o = this.owned(p); return pr.mounts && o.includes(pr.mounts.active) ? pr.mounts.active : o[0] || null; }

  give(p, kind, { x, z, rig } = {}) {
    const P = this.party, pr = P.profileOf(p);
    pr.mounts = pr.mounts || { owned: [], active: null };
    if (!pr.mounts.owned.includes(kind)) pr.mounts.owned.push(kind);
    pr.mounts.active = kind;
    P.profileDirty = true;
    this.sendList(p);
    // out it steps (the tamed wild model becomes the player's own)
    this.stable(p);
    const h = { kind, D: MOUNTS[kind], x: x ?? p.pos.x + 1, z: z ?? p.pos.z, y: 0, face: { x: 1, z: 0 }, state: 'wait', rig: rig || buildMount(P.r3d, kind, { variant: 0 }), owner: p, t: 0, act: 0 };
    if (!rig) this.root.add(h.rig.root);
    paintSaddle(P.r3d, h.rig, p.color);
    this.home.set(p.slot, h);
    return h;
  }

  // put a player's mount away (activity change, left the party)
  stable(p) {
    const h = this.home.get(p.slot);
    if (!h) return;
    if (p.mount === h) this.dismount(p, true);
    this.root.remove(h.rig.root);
    this.home.delete(p.slot);
  }

  allowed() {
    const P = this.party;
    if (P.phase === 'lobby') return true;
    return P.exploring();
  }

  ride(p, h) {
    const a = p.actor;
    p.mount = h;
    h.state = 'ridden';
    a.sitting = true;
    a.speedMul = h.D.speed;
    a.jumpPower = h.D.jump;
    a.radius = 0.4;
    a.model.setProp(null);
    audio.sfx('jump', { volume: 0.5 });
    audio.sfx('pet', { volume: 0.4 });
    this.party.buzz(p, 25);
    p.setEmote('heart', 1);
    a.pos = { x: h.x, z: h.z };
  }

  dismount(p, quiet = false) {
    const h = p.mount, a = p.actor;
    if (!h) return;
    p.mount = null;
    h.state = 'wait';
    h.x = a.pos.x; h.z = a.pos.z; h.y = 0;
    a.sitting = false; a.speedMul = 1; a.jumpPower = 0; a.radius = 0.26; a.lean = 0;
    if (p.fighter) a.model.setProp(p.fighter.prop || p.fighter.cls.weapon);
    // hop down beside it
    const side = { x: -a.dir.z, z: a.dir.x };
    const col = this.world.overCol;
    for (const s of [1, -1]) { const x = h.x + side.x * 0.9 * s, z = h.z + side.z * 0.9 * s; if (!col.blocked(x, z, 0.28)) { a.pos = { x, z }; break; } }
    a.jumpV = 4;
    if (!quiet) audio.sfx('jump', { volume: 0.4 });
  }

  // Y on foot: whistle — your mount trots over (or appears from just out of sight)
  whistle(p) {
    const P = this.party, kind = this.active(p);
    if (!kind) return;
    let h = this.home.get(p.slot);
    if (h && h.kind !== kind) { this.stable(p); h = null; }
    if (!h) {
      h = this.give(p, kind);
      const a = Math.random() * Math.PI * 2;
      for (let d = 9; d > 2; d -= 1) { const x = p.pos.x + Math.cos(a) * d, z = p.pos.z + Math.sin(a) * d; if (this.canStand(h, x, z)) { h.x = x; h.z = z; break; } }
    }
    const far = Math.hypot(h.x - p.pos.x, h.z - p.pos.z);
    if (far > 30) { h.x = p.pos.x - p.actor.dir.x * 8; h.z = p.pos.z - p.actor.dir.z * 8; if (!this.canStand(h, h.x, h.z)) { h.x = p.pos.x + 1.2; h.z = p.pos.z; } }
    h.state = 'come';
    audio.sfx('whistle', { volume: 0.7, pitch: 5 });
    p.setEmote('note', 1.2);
    P.buzz(p, [20, 30, 20]);
  }

  canStand(h, x, z) {
    const tt = this.big ? this.big.tileAt(x, z) : this.world.tileAt(x, z);
    const wet = tt === TT.WATER || tt === TT.CORAL;
    return !this.world.overCol.blocked(x, z, 0.4, null, wet);
  }

  // ------------------------------------------------------------------ input (before the activity reads A)
  handleInput() {
    const P = this.party;
    if (P.busy || P.dialogue.active || P.vote) return;
    const ok = this.allowed();
    for (const p of P.players) {
      if (!p.connected || p.vehicle) continue;
      const inp = p.input;
      if (this.taming.has(p.slot)) { this.tameInput(p); continue; }
      if (!ok) continue;
      if (p.mount) {
        if (inp.pressed('y')) { inp.edges.delete('y'); this.dismount(p); continue; }
        if (inp.pressed('special')) { inp.edges.delete('special'); inp.edges.delete('x'); this.ability(p); }
        if (inp.pressed('interact') && this.enemiesNear(p, 4.5)) { inp.edges.delete('interact'); inp.edges.delete('a'); this.attack(p); }
        continue;
      }
      if (inp.pressed('y') && this.owned(p).length && !this.enemiesNear(p, 9) && !p.indoors) { inp.edges.delete('y'); this.whistle(p); continue; }
      if (!inp.pressed('interact')) continue;
      const h = this.home.get(p.slot);
      if (h && h.state !== 'ridden' && Math.hypot(h.x - p.pos.x, h.z - p.pos.z) < 1.7) { inp.edges.delete('interact'); inp.edges.delete('a'); this.ride(p, h); continue; }
      const w = this.wildFor(p);
      if (w && p.food === w.D.food) { inp.edges.delete('interact'); inp.edges.delete('a'); this.startTaming(p, w); }
    }
  }

  // E has a job here: ride your mount, offer a treat (the solo pet's cuddle can wait)
  wantsA(p) {
    if (!this.allowed() || p.mount || p.vehicle || this.taming.has(p.slot)) return false;
    const h = this.home.get(p.slot);
    if (h && h.state !== 'ridden' && Math.hypot(h.x - p.pos.x, h.z - p.pos.z) < 1.7) return true;
    const w = this.wildFor(p);
    return !!(w && p.food === w.D.food);
  }

  enemiesNear(p, r) {
    const C = this.party.combat;
    return !!(C && C.enemies.some((e) => e.alive && e.hurtable && Math.hypot(e.x - p.pos.x, e.z - p.pos.z) < r));
  }

  // the wild animal a player is next to
  wildFor(p, r = 1.9) {
    let best = null, bd = r;
    for (const w of this.wild) {
      if (!w.rig || w.state === 'flee' || w.tamer) continue;
      const d = Math.hypot(w.x - p.pos.x, w.z - p.pos.z);
      if (d < bd) { bd = d; best = w; }
    }
    return best;
  }

  // ------------------------------------------------------------------ taming
  startTaming(p, w) {
    const P = this.party;
    // (migrating animals are calm: fewer taps, a wider green)
    const g = { id: this.seq++, w, p, hits: 0, misses: 0, need: w.migrant ? 2 : 3, t: 0, speed: 0.85 * w.D.pace, zone: rnd(0.3, 0.7), width: w.D.green * (w.migrant ? 1.35 : 1), done: false };
    this.taming.set(p.slot, g);
    w.tamer = p; w.state = 'eat';
    w.face = { x: p.pos.x - w.x, z: p.pos.z - w.z };
    p.frozen = true; p.taming = true;
    p.actor.face(w.x, w.z);
    audio.sfx('pet', { volume: 0.5 });
    if (p.kind === 'phone') P.net.send(p.id, { t: 'screen', s: 'tame', id: g.id, animal: t(w.D.name), food: t(FOODS[w.D.food].a), foodId: w.D.food, kind: w.kind, need: g.need, speed: g.speed, zone: g.zone, width: g.width });
    P.toast(t('{name} holds out {food}…', { name: p.name, food: t(FOODS[w.D.food].a) }), p.color);
  }

  // keyboard & gamepad players play the meter on the big screen
  tameInput(p) {
    const g = this.taming.get(p.slot), inp = p.input;
    if (p.kind === 'phone') { if (inp.pressed('b') || inp.pressed('jump')) { inp.edges.delete('b'); inp.edges.delete('jump'); this.endTaming(p, false, true); } return; }
    if (inp.pressed('interact')) {
      inp.edges.delete('interact'); inp.edges.delete('a');
      const m = meterAt(g.t, g.speed);
      this.tameStep(p, Math.abs(m - g.zone) < g.width / 2);
    } else if (inp.pressed('jump')) { inp.edges.delete('jump'); this.endTaming(p, false, true); }
  }

  // a phone judged a tap: {t:'tame', id, hit}
  onTameMsg(p, d) {
    const g = this.taming.get(p.slot);
    if (!g || g.id !== d.id || g.done) return;
    if (d.quit) { this.endTaming(p, false, true); return; }
    this.tameStep(p, !!d.hit, typeof d.zone === 'number' ? d.zone : null);
  }

  tameStep(p, hit, zone = null) {
    const g = this.taming.get(p.slot), w = g.w, P = this.party, fx = this.world.fx;
    if (hit) {
      g.hits++;
      fx.emit('heart', w.x, 1.4, w.z, 1);
      audio.sfx('pet', { volume: 0.5, pitch: g.hits * 2 });
      P.buzz(p, 30);
      g.speed *= 1.18; g.width *= 0.88; g.zone = zone ?? rnd(0.25, 0.75);
      if (g.hits >= g.need) this.endTaming(p, true);
    } else {
      g.misses++;
      w.hop = 0.25;
      audio.sfx('error', { volume: 0.35 });
      P.buzz(p, [15, 30, 15]);
      if (g.misses >= 3) this.endTaming(p, false);
    }
  }

  endTaming(p, won, quit = false) {
    const g = this.taming.get(p.slot), P = this.party;
    if (!g || g.done) return;
    g.done = true;
    this.taming.delete(p.slot);
    p.frozen = false; p.taming = false;
    const w = g.w;
    w.tamer = null;
    if (p.kind === 'phone') P.net.send(p.id, { t: 'screen', s: 'play' });
    if (won) {
      p.food = null;
      this.wild = this.wild.filter((q) => q !== w);
      const had = this.owned(p).includes(w.kind);
      const h = this.give(p, w.kind, { x: w.x, z: w.z, rig: w.rig });
      h.face = w.face;
      this.ride(p, h);
      audio.jingle('friendUp');
      this.world.fx.emit('sparkle', w.x, 1.2, w.z, 18, { color: '#fff3a6' });
      this.world.fx.emit('heart', w.x, 1.6, w.z, 3);
      P.showBanner(t('{name} tamed {animal}!', { name: p.name, animal: t(w.D.a) }), had ? t('another friend — {y} to get off, {y} to whistle', { y: P.keyName('y') }) : t('{y} to get off · {y} again to whistle it back', { y: P.keyName('y') }));
      p.setEmote('heart', 2);
    } else {
      w.state = quit ? 'graze' : 'flee';
      w.t = quit ? 2 : 2.6;
      w.shy = quit ? 0 : 10;
      if (!quit) P.toast(t('{animal} bolted! Try again in a moment', { animal: cap(t(w.D.the)) }), p.color);
    }
  }

  // ------------------------------------------------------------------ mounted moves
  attack(p) {
    const h = p.mount, C = this.party.combat, A = h.D.attack;
    if (!C || (h.cd || 0) > 0) return;
    h.cd = 0.5; h.act = 1;
    const a = p.actor, f = p.fighter;
    const mul = f ? 1 + ((f.eff || f.level) - 1) * 0.06 : 1;
    let hitAny = false;
    for (const e of C.enemies) {
      if (!e.alive || !e.hurtable) continue;
      const dx = e.x - a.pos.x, dz = e.z - a.pos.z, d = Math.hypot(dx, dz);
      if (d > A.reach + e.r + 0.3) continue;
      if (d > 0.4 && (dx * a.dir.x + dz * a.dir.z) / d < 0.25) continue;
      C.hurtEnemy(e, A.dmg * mul, { p, dir: { x: dx / (d || 1), z: dz / (d || 1) }, knock: A.knock, launch: A.launch || 0, heavy: true, kind: 'melee' });
      hitAny = true;
    }
    audio.sfx(hitAny ? 'whack' : 'whoosh', { volume: 0.5 });
    if (h.kind === 'frog') this.world.fx.emit('sparkle', a.pos.x + a.dir.x * 1.6, 0.6, a.pos.z + a.dir.z * 1.6, 4, { color: '#f59ac8' });
  }

  ability(p) {
    const h = p.mount, a = p.actor, P = this.party, C = P.combat, fx = this.world.fx;
    if ((h.abilCd || 0) > 0) { audio.sfx('error', { volume: 0.25 }); return; }
    h.abilCd = h.D.ability.cd;
    h.act = 1;
    P.buzz(p, 40);
    const id = h.D.ability.id;
    if (id === 'dash' || id === 'charge') {
      h.rush = { t: id === 'dash' ? 0.38 : 1.1, speed: id === 'dash' ? 16 : 11, hit: new Set(), dmg: id === 'dash' ? 18 : 26, stun: id === 'charge' ? 0.9 : 0 };
      audio.sfx(id === 'dash' ? 'whoosh' : 'charge', { volume: 0.6 });
    } else if (id === 'stampede') {
      // head down, horns first: a long thundering charge that tosses the gloom aside
      h.rush = { t: 1.4, speed: 12.5, hit: new Set(), dmg: 34, stun: 1.1, stampede: true };
      audio.sfx('roar', { volume: 0.5, pitch: 6 }); audio.sfx('charge', { volume: 0.7 });
      P.cam.shake = Math.max(P.cam.shake || 0, 0.2);
    } else if (id === 'pounce') {
      // a leap at the nearest gloom (or straight ahead), claws out
      let best = null, bd = 7;
      if (C) for (const e of C.enemies) { if (!e.alive || !e.hurtable) continue; const d = Math.hypot(e.x - a.pos.x, e.z - a.pos.z); if (d < bd) { bd = d; best = e; } }
      if (best) a.face(best.x, best.z);
      a.jumpV = 7.8; a.jumps = 1;
      h.rush = { t: 0.62, speed: best ? Math.min(13, bd / 0.55) : 11, hit: new Set(), dmg: 22, leap: true, pounce: true };
      audio.sfx('chirp', { volume: 0.7 }); audio.sfx('whoosh', { volume: 0.5 });
    } else if (id === 'flap') {
      a.jumpV = Math.max(a.jumpV, 10.5); a.jumps = 1;
      fx.emit('sparkle', a.pos.x, 0.8, a.pos.z, 8, { color: '#fbf6ec' });
      audio.sfx('whoosh', { volume: 0.5, pitch: 6 });
    } else if (id === 'leap') {
      a.jumpV = 11.5; a.jumps = 1;
      h.rush = { t: 0.9, speed: 7.5, hit: new Set(), dmg: 0, leap: true };
      audio.sfx('boing', { volume: 0.6 });
    } else if (id === 'spin') {
      h.spin = 1.2;
      audio.sfx('charge', { volume: 0.5 });
    } else if (id === 'slam') {
      a.jumpV = 7; a.jumps = 1;
      h.slam = true;
      audio.sfx('growl', { volume: 0.6 });
    }
    void C;
  }

  // a charge / dash / leap / spin in progress; the slam lands
  updateMoves(p, dt) {
    const h = p.mount, a = p.actor, C = this.party.combat, fx = this.world.fx;
    const mul = p.fighter ? 1 + ((p.fighter.eff || p.fighter.level) - 1) * 0.06 : 1;
    if (h.cd > 0) h.cd -= dt;
    if (h.abilCd > 0) h.abilCd -= dt;
    if (h.act > 0) h.act = Math.max(0, h.act - dt * 3);
    if (h.rush) {
      const R = h.rush;
      R.t -= dt;
      const ox = a.pos.x, oz = a.pos.z;
      this.moveMount(p, a.dir.x * R.speed * dt, a.dir.z * R.speed * dt);
      if (!R.leap && Math.hypot(a.pos.x - ox, a.pos.z - oz) < R.speed * dt * 0.3) { R.t = 0; audio.sfx('slam', { volume: 0.5 }); this.party.cam.shake = Math.max(this.party.cam.shake || 0, 0.25); }
      if (Math.random() < dt * (R.stampede ? 60 : 30)) fx.emit('dust', a.pos.x - a.dir.x * 0.5 + (Math.random() - 0.5) * 0.6, 0.1, a.pos.z - a.dir.z * 0.5, 1);
      if (R.stampede && Math.random() < dt * 5) audio.sfx('stomp', { volume: 0.35 });
      if (C && R.dmg) for (const e of C.enemies) {
        if (!e.alive || !e.hurtable || R.hit.has(e)) continue;
        if (Math.hypot(e.x - a.pos.x, e.z - a.pos.z) > 0.9 + e.r) continue;
        R.hit.add(e);
        C.hurtEnemy(e, R.dmg * mul, { p, dir: a.dir, knock: 3.8, launch: 3, stun: R.stun, heavy: true, kind: 'melee' });
      }
      if (R.t <= 0 || (R.leap && !a.airborne && R.t < 0.75)) {
        if (R.leap) this.shockwave(p, R.pounce ? 1.5 : 1.9, (R.pounce ? 24 : 18) * mul, R.pounce ? 0.5 : 0);
        h.rush = null;
      }
    }
    if (h.spin > 0) {
      h.spin -= dt;
      h.spinA = (h.spinA || 0) + dt * 22;
      h.tick = (h.tick || 0) - dt;
      if (h.tick <= 0) { h.tick = 0.3; this.shockwave(p, 1.6, 12 * mul, 0, true); }
    }
    if (h.slam && !a.airborne && a.jumpV <= 0) {
      h.slam = false;
      this.shockwave(p, 2.6, 30 * mul, 1.2);
      this.party.cam.shake = Math.max(this.party.cam.shake || 0, 0.45);
    }
    // hens glide: hold B on the way down
    if (h.D.glide && a.airborne && a.jumpV < 0 && p.input.down('jump')) { a.jumpV = Math.max(a.jumpV, -1.3); h.gliding = true; } else h.gliding = false;
  }

  shockwave(p, r, dmg, stun, quiet = false) {
    const C = this.party.combat, a = p.actor, fx = this.world.fx;
    fx.emit('ring', a.pos.x, 0.1, a.pos.z, 1, { color: '#fff3c4' });
    if (!quiet) { fx.emit('dust', a.pos.x, 0.1, a.pos.z, 14); audio.sfx('slam', { volume: 0.6 }); }
    if (!C) return;
    for (const e of C.enemies) {
      if (!e.alive || !e.hurtable) continue;
      const dx = e.x - a.pos.x, dz = e.z - a.pos.z, d = Math.hypot(dx, dz);
      if (d > r + e.r) continue;
      C.hurtEnemy(e, dmg, { p, dir: { x: dx / (d || 1), z: dz / (d || 1) }, knock: 3, launch: 3.5, stun, heavy: true, kind: 'aoe' });
    }
  }

  moveMount(p, dx, dz) { swimCol(this.world).move(p.actor.pos, dx, dz, p.actor.radius); }

  // what the actor collides with while riding: every mount takes to the water
  colFor(p) { return p.mount ? swimCol(this.world) : null; }

  // ------------------------------------------------------------------ frame
  // before the rider's actor moves: speed for the ground underfoot
  pre(p) {
    const h = p.mount;
    if (!h) return;
    const a = p.actor;
    const tt = this.world.tileAt(a.pos.x, a.pos.z), wet = tt === TT.WATER || tt === TT.CORAL;
    if (wet && !h.swim) { this.world.fx.emit('splash', a.pos.x, 0.2, a.pos.z, 14); audio.sfx('splash', { volume: 0.6 }); }
    h.swim = wet;
    a.speedMul = wet ? h.D.swim || h.D.speed * 0.6 : h.D.speed;
    a.jumpPower = wet ? 3.6 : h.D.jump;
    // the rider sits in the saddle (lower in the water: the mount swims)
    a.baseY = (wet ? (h.kind === 'turtle' ? -0.2 : -SINK[h.kind]) : this.world.groundY(a.pos)) + RIG[h.kind].saddle * MOUNT_SCALE - 0.34;
    if (p.fighter && p.fighter.down) this.dismount(p, true);
  }

  // after it moved: the mount follows, and the rider sits on it
  post(p, dt) {
    const h = p.mount;
    if (!h) return;
    const a = p.actor;
    this.updateMoves(p, dt);
    const g = this.world.groundY ? this.world.groundY(a.pos) : 0;
    h.x = a.pos.x; h.z = a.pos.z; h.y = (h.swim ? 0 : g) + a.jumpY;
    h.face = a.dir;
    a.lean = h.rush ? 0.35 : 0;
    const R = h.rig;
    R.root.position.set(h.x, h.swim ? -SINK[h.kind] + Math.sin(this.party.t * 3) * 0.03 : h.y, h.z);
    R.root.rotation.y = yawOf(h.face) + (h.spin > 0 ? h.spinA : 0);
    animMount(R, dt, { speed: a.moving ? a.speed * (h.rush ? 2 : 1) : 0, air: a.airborne, act: h.act, swim: h.swim });
    if (h.gliding && Math.random() < dt * 10) this.world.fx.emit('sparkle', h.x, h.y + 0.6, h.z, 1, { color: '#fbf6ec' });
    if (h.swim && (a.moving ? Math.random() < dt * 14 : Math.random() < dt * 3)) this.world.fx.emit('water', h.x - a.dir.x * 0.6 + (Math.random() - 0.5) * 0.5, 0.15, h.z - a.dir.z * 0.6 + (Math.random() - 0.5) * 0.3, 1);
  }

  update(dt) {
    const P = this.party;
    const ok = this.allowed();
    // not in this activity: taming stops, everyone's mount goes back to the stable
    if (!ok) {
      for (const p of P.players) { if (this.taming.has(p.slot)) this.endTaming(p, false, true); if (this.home.has(p.slot)) this.stable(p); }
    }
    const players = P.players.filter((p) => p.connected);
    // wild herds come to life near players
    for (const w of this.wild) {
      let d = 1e9;
      for (const p of players) d = Math.min(d, Math.hypot(p.pos.x - w.x, p.pos.z - w.z));
      if (!w.rig && d < NEAR) { w.rig = buildMount(P.r3d, w.kind, { variant: w.variant, wild: true }); w.rig.root.position.set(w.x, 0, w.z); this.root.add(w.rig.root); }
      else if (w.rig && d > FAR && !w.tamer) { this.root.remove(w.rig.root); w.rig = null; }
      if (w.rig) this.wildAi(w, dt, players);
    }
    // favourite foods glint on the ground
    for (const s of this.spots) {
      if (s.taken > 0) { s.taken -= dt; if (s.taken <= 0 && s.obj) s.obj.visible = true; continue; }
      let d = 1e9, who = null;
      for (const p of players) { const q = Math.hypot(p.pos.x - s.x, p.pos.z - s.z); if (q < d) { d = q; who = p; } }
      if (!s.obj && d < NEAR) { s.obj = foodMesh(P.r3d, s.food); s.obj.position.set(s.x, 0, s.z); this.root.add(s.obj); }
      else if (s.obj && d > FAR) { this.root.remove(s.obj); s.obj = null; }
      if (s.obj) { s.obj.position.y = 0.12 + Math.sin(P.t * 3 + s.x) * 0.05; s.obj.rotation.y += dt * 1.5; if (Math.random() < dt * 1.5) this.world.fx.emit('sparkle', s.x, 0.4, s.z, 1, { color: '#fff3a6' }); }
      if (ok && who && d < 0.8 && who.food !== s.food && !who.vehicle) {
        who.food = s.food;
        s.taken = 45; if (s.obj) s.obj.visible = false;
        audio.sfx('pickup', { volume: 0.6 });
        P.toast(t('{name} picked up {food}', { name: who.name, food: t(FOODS[s.food].a) }), who.color);
      }
    }
    // your own mounts: waiting, or trotting over when whistled
    for (const [slot, h] of this.home) {
      const p = P.players.find((q) => q.slot === slot);
      if (!p) continue;
      if (h.state === 'ridden') continue;
      const dx = p.pos.x - h.x, dz = p.pos.z - h.z, d = Math.hypot(dx, dz);
      let sp = 0;
      if (h.state === 'come') {
        if (d > 1.4) { sp = Math.min(7, 2 + d); const pos = { x: h.x, z: h.z }; swimCol(this.world).move(pos, (dx / d) * sp * dt, (dz / d) * sp * dt, 0.4); if (Math.hypot(pos.x - h.x, pos.z - h.z) < sp * dt * 0.2) h.stuck = (h.stuck || 0) + dt; else h.stuck = 0; h.x = pos.x; h.z = pos.z; h.face = { x: dx, z: dz }; if (h.stuck > 1.2) { h.x = p.pos.x - dx / d * 1.3; h.z = p.pos.z - dz / d * 1.3; h.stuck = 0; } }
        else { h.state = 'wait'; h.face = { x: dx, z: dz }; }
      }
      const g = this.world.groundY ? this.world.groundY({ x: h.x, z: h.z }) : 0;
      const tt = this.world.tileAt(h.x, h.z), wet = tt === TT.WATER || tt === TT.CORAL;
      h.rig.root.position.set(h.x, wet ? -SINK[h.kind] : g, h.z);
      h.rig.root.rotation.y = yawOf(h.face);
      animMount(h.rig, dt, { speed: sp, graze: h.state === 'wait' && d > 3, swim: wet });
    }
    for (const g of this.taming.values()) g.t += dt;
  }

  wildAi(w, dt, players) {
    w.t -= dt;
    if (w.shy > 0) w.shy -= dt;
    if (w.hop > 0) w.hop -= dt;
    let sp = 0;
    // who's close, and do they bring the right food?
    let near = null, nd = 1e9;
    for (const p of players) { const d = Math.hypot(p.pos.x - w.x, p.pos.z - w.z); if (d < nd) { nd = d; near = p; } }
    const treat = near && near.food === w.D.food && !near.mount;
    w.curious = treat && nd < 8;
    if (w.state === 'eat') { sp = 0; }
    else if (w.state === 'flee') {
      if (near && nd < 9) { const dx = w.x - near.pos.x, dz = w.z - near.pos.z, d = nd || 1; w.face = { x: dx / d, z: dz / d }; }
      sp = 4.2 * w.D.pace;
      if (w.t <= 0) { w.state = 'graze'; w.t = rnd(2, 4); }
    } else if (w.curious && !(w.shy > 0)) {
      // it saw the treat: comes closer, a little shy
      const dx = near.pos.x - w.x, dz = near.pos.z - w.z;
      w.face = { x: dx, z: dz };
      sp = nd > 1.6 ? 1.3 * w.D.pace : 0;
      w.state = 'graze';
    } else if (w.herd.migrate && !(near && nd < 1.1 && !treat)) {
      // on the move with its herd: keep your place in the group (calm, it hardly minds you)
      const tx = w.herd.x + w.ox, tz = w.herd.z + w.oz, dx = tx - w.x, dz = tz - w.z, d = Math.hypot(dx, dz);
      if (d > 0.3) { w.face = { x: dx, z: dz }; sp = Math.min(3.4, w.herd.migrate.speed + d * 0.6) * w.D.pace; }
      w.state = 'wander'; w.tx = tx; w.tz = tz; w.t = 2;
    } else if (near && nd < (near.actor.running || near.mount ? 3.2 : 1.7) && !treat) {
      w.state = 'flee'; w.t = rnd(1.4, 2.2);
      audio.sfx(w.kind === 'hen' ? 'squeak' : 'snap', { volume: 0.25 });
    } else if (w.state === 'wander') {
      const dx = w.tx - w.x, dz = w.tz - w.z, d = Math.hypot(dx, dz);
      if (d < 0.4 || w.t <= 0) { w.state = 'graze'; w.t = rnd(3, 7); }
      else { w.face = { x: dx, z: dz }; sp = 1.1 * w.D.pace; }
    } else if (w.t <= 0) {
      // amble somewhere open near the herd
      for (let k = 0; k < 6; k++) {
        const a = Math.random() * Math.PI * 2, r = rnd(1, 5.5);
        w.tx = w.herd.x + Math.cos(a) * r; w.tz = w.herd.z + Math.sin(a) * r;
        if (this.tallNear(w.tx, w.tz, 1.4) === 0) break;
      }
      w.state = 'wander'; w.t = 6;
    }
    if (sp > 0) {
      const l = Math.hypot(w.face.x, w.face.z) || 1;
      const pos = { x: w.x, z: w.z };
      const col = w.kind === 'turtle' ? { move: (q, x, z, r) => this.world.overCol.move(q, x, z, r, true) } : this.world.overCol;
      col.move(pos, (w.face.x / l) * sp * dt, (w.face.z / l) * sp * dt, 0.4);
      // land animals keep out of the water
      const tt = this.world.tileAt(pos.x, pos.z);
      if (w.kind === 'turtle' || (tt !== TT.WATER && tt !== TT.CORAL)) { w.x = pos.x; w.z = pos.z; }
      else { w.state = 'graze'; w.t = 1; }
    }
    const g = this.world.groundY ? this.world.groundY({ x: w.x, z: w.z }) : 0;
    const tt = this.world.tileAt(w.x, w.z), wet = tt === TT.WATER || tt === TT.CORAL;
    w.rig.root.position.set(w.x, (wet ? -0.02 : g) + (w.hop > 0 ? Math.sin(w.hop * 12) * 0.12 : 0), w.z);
    w.rig.root.rotation.y = yawOf(w.face);
    animMount(w.rig, dt, { speed: sp, graze: (w.state === 'graze' && !w.curious) || w.state === 'eat', swim: wet });
  }

  // ------------------------------------------------------------------ what the phone shows
  ctxFor(p, base) {
    if (!this.allowed()) return null;
    const g = this.taming.get(p.slot);
    if (g) return { a: 'Tap in the green!', b: 'Give up', x: null, y: null, hint: 'Win its trust: tap A while the marker is in the green' };
    if (p.mount) {
      const h = p.mount, fight = this.enemiesNear(p, 4.5);
      return { ...base, a: fight ? h.D.attack.name : base.a, b: h.D.glide ? 'Jump · glide' : 'Jump', x: h.D.ability.name, y: 'Get off', cd: h.abilCd > 0 ? Math.round((h.abilCd / h.D.ability.cd) * 100) : 0, hint: base.hint || '' };
    }
    const out = { ...base };
    const h = this.home.get(p.slot);
    if (this.owned(p).length && !p.indoors) out.y = 'Whistle';
    if (h && h.state !== 'ridden' && Math.hypot(h.x - p.pos.x, h.z - p.pos.z) < 1.7) { out.a = 'Ride'; out.hint = 'Hop on!'; out.vars = null; }
    const w = this.wildFor(p, 2.6);
    if (w) {
      if (p.food === w.D.food && Math.hypot(w.x - p.pos.x, w.z - p.pos.z) < 1.9) { out.a = 'Offer'; out.hint = 'Offer {food} — then win its trust on your phone'; out.vars = { food: t(FOODS[w.D.food].a) }; }
      else if (p.food !== w.D.food) { out.hint = '{animal} would love {food}…'; out.vars = { animal: cap(t(w.D.the)), food: t(FOODS[w.D.food].a) }; }
    }
    return out;
  }

  // the phone's « My mounts »: yours, and the ones still out there (what they love, where)
  sendList(p) {
    if (p.kind !== 'phone' || !p.connected) return;
    const own = this.owned(p), zname = (id) => { const z = ZONES.find((q) => q.id === id); return z ? t(z.name) : ''; };
    const all = MOUNT_ORDER.map((k) => ({ id: k, name: t(MOUNTS[k].name), have: own.includes(k), hint: t('Loves {food}', { food: t(FOODS[MOUNTS[k].food].a) }) + ' · ' + zname(MOUNTS[k].zones[0]) }));
    this.party.net.send(p.id, { t: 'mounts', owned: own.map((k) => ({ id: k, name: t(MOUNTS[k].name) })), all, active: this.active(p) });
  }

  // the phone picked another mount to ride
  choose(p, kind) {
    if (!this.owned(p).includes(kind)) return;
    const pr = this.party.profileOf(p);
    pr.mounts.active = kind;
    this.party.profileDirty = true;
    const h = this.home.get(p.slot);
    if (h && h.kind !== kind) { const riding = p.mount === h; this.stable(p); if (riding && this.allowed()) { this.whistle(p); const n = this.home.get(p.slot); if (n) { n.x = p.pos.x; n.z = p.pos.z; this.ride(p, n); } } }
    this.sendList(p);
  }

  onLeave(p) { const g = this.taming.get(p.slot); if (g) this.endTaming(p, false, true); this.stable(p); }

  // a gloomy animal freed in a fight trusts whoever freed it (no food needed)
  freeFriend(p, kind, x, z) {
    if (!MOUNTS[kind] || this.owned(p).includes(kind)) return false;
    const h = this.give(p, kind, { x, z });
    h.face = { x: p.pos.x - x, z: p.pos.z - z };
    this.world.fx.emit('sparkle', x, 1, z, 16, { color: '#8fd6b4' });
    this.world.fx.emit('heart', x, 1.4, z, 2);
    audio.jingle('friendUp');
    this.party.showBanner(t('{animal} is free of the gloom — and trusts {name}!', { animal: cap(t(MOUNTS[kind].the)), name: p.name }), t('{a} to ride it · {y} to get off · {y} to whistle', { a: this.party.keyName('a'), y: this.party.keyName('y') }));
    return true;
  }

  // ------------------------------------------------------------------ the big screen
  drawLabels(ctx, v) {
    const P = this.party, d = P.display;
    // what a wild animal fancies (a thought bubble when someone's close)
    for (const w of this.wild) {
      if (!w.rig || w.state === 'flee') continue;
      let nd = 1e9;
      for (const p of P.players) nd = Math.min(nd, Math.hypot(p.pos.x - w.x, p.pos.z - w.z));
      if (nd > 6 && !w.tamer) continue;
      const q = v.project(w.x, RIG[w.kind].saddle * MOUNT_SCALE + 0.95, w.z);
      if (!v.owns(q.x, q.y)) continue;
      const u = d.worldToUi(q.x, q.y);
      const g = w.tamer ? this.taming.get(w.tamer.slot) : null;
      if (g) { drawMeter(ctx, u.x, u.y - 8, g); continue; }
      bubble(ctx, u.x, u.y - 6, w.D.food, w.curious, P.t);
    }
    // what you carry
    for (const p of P.players) {
      if (!p.food || p.hidden || this.taming.has(p.slot)) continue;
      const q = v.project(p.pos.x, (p.actor.baseY || 0) + p.actor.jumpY + 1.55, p.pos.z);
      if (!v.owns(q.x, q.y)) continue;
      const u = d.worldToUi(q.x, q.y);
      foodIcon(ctx, p.food, Math.round(u.x) + 9, Math.round(u.y) - 14);
    }
  }

  dispose() {
    for (const p of this.party.players) { if (p.mount) this.dismount(p, true); p.food = null; p.frozen = false; p.taming = false; }
    this.party.world.over.root.remove(this.root);
    this.home.clear(); this.taming.clear();
  }
}

// ------------------------------------------------------------------ little drawings
// 7×7 pixel icons for the favourite foods (big screen & phone share the shapes)
export const FOOD_PIX = {
  apple: { rows: ['...g...', '..g....', '.rrrr..', 'rrwrrr.', 'rrrrrr.', 'rrrrrr.', '.rrrr..'], pal: { r: '#e04848', w: '#ffb0a0', g: '#4f9a3a' } },
  acorn: { rows: ['...s...', '.ccccc.', 'ccccccc', '.bbbbb.', '.bbwbb.', '..bbb..', '...b...'], pal: { c: '#6b4330', b: '#c8864a', w: '#f0c890', s: '#4a3020' } },
  corn: { rows: ['..y.y..', '.yyyyy.', 'gyyyyyg', 'gyywyyg', '.gyyyg.', '.ggygg.', '..g.g..'], pal: { y: '#f4c542', w: '#fff3a6', g: '#62a84a' } },
  kelp: { rows: ['.g...g.', '.gg.gg.', '..g.g..', '.gg.gg.', '..ggg..', '...g...', '..ggg..'], pal: { g: '#3a9a5a' } },
  honey: { rows: ['..ddd..', '.hhhhh.', 'hhhwhhh', 'hhhhhhh', 'hhhhhhh', '.hhhhh.', '..ooo..'], pal: { d: '#8a5a2a', h: '#f0a830', w: '#fff0a0', o: '#c8782a' } },
  bug: { rows: ['.a...a.', '..a.a..', '.bbbbb.', 'bbwbwbb', 'bbbbbbb', '.bbbbb.', '..b.b..'], pal: { a: '#2a2433', b: '#3ab8c8', w: '#e8fbff' } },
  fern: { rows: ['...g...', '.g.g.g.', '..ggg..', 'g.ggg.g', '.ggggg.', '...s...', '...s...'], pal: { g: '#4f9a3c', s: '#6b4a2a' } },
  fish: { rows: ['.......', '..bbb.t', '.bbwbbt', 'bbbbbtt', '.bbbbbt', '..bbb.t', '.......'], pal: { b: '#6aa8d8', w: '#241a2e', t: '#4a88c0' } },
};

export function foodIcon(ctx, food, x, y, s = 1) {
  const F = FOOD_PIX[food];
  if (!F) return;
  ctx.fillStyle = '#241a2e';
  ctx.fillRect(x - 1, y - 1, 7 * s + 2, 7 * s + 2);
  ctx.fillStyle = '#fff7e6';
  ctx.fillRect(x, y, 7 * s, 7 * s);
  F.rows.forEach((row, j) => { for (let i = 0; i < 7; i++) { const c = F.pal[row[i]]; if (c) { ctx.fillStyle = c; ctx.fillRect(x + i * s, y + j * s, s, s); } } });
}

function bubble(ctx, x, y, food, love, time) {
  const bx = Math.round(x) - 8, by = Math.round(y) - 12 + (love ? Math.round(Math.sin(time * 5)) : 0);
  ctx.fillStyle = '#241a2e'; ctx.fillRect(bx - 1, by - 1, love ? 26 : 17, 13);
  ctx.fillStyle = '#fff7e6'; ctx.fillRect(bx, by, love ? 24 : 15, 11);
  ctx.fillRect(bx + 5, by + 11, 3, 2);
  foodIcon(ctx, food, bx + 4, by + 2);
  if (love) {
    ctx.fillStyle = '#ef6479';
    ['.xx.xx.', 'xxxxxxx', '.xxxxx.', '..xxx..', '...x...'].forEach((row, j) => { for (let i = 0; i < 7; i++) if (row[i] === 'x') ctx.fillRect(bx + 14 + i, by + 3 + j, 1, 1); });
  }
}

function drawMeter(ctx, x, y, g) {
  const w = 60, h = 7, bx = Math.round(x - w / 2), by = Math.round(y - 10);
  ctx.fillStyle = '#241a2e'; ctx.fillRect(bx - 2, by - 2, w + 4, h + 12);
  ctx.fillStyle = '#5a4a6a'; ctx.fillRect(bx, by, w, h);
  ctx.fillStyle = '#6fd66a'; ctx.fillRect(Math.round(bx + (g.zone - g.width / 2) * w), by, Math.max(2, Math.round(g.width * w)), h);
  const m = meterAt(g.t, g.speed);
  ctx.fillStyle = '#fff3c4'; ctx.fillRect(Math.round(bx + m * (w - 2)), by - 1, 2, h + 2);
  for (let i = 0; i < g.need; i++) { ctx.fillStyle = i < g.hits ? '#ef6479' : '#6a5a7a'; ctx.fillRect(bx + w / 2 - g.need * 5 + i * 10 + 2, by + h + 3, 6, 5); }
}

function foodMesh(r3d, food) {
  const g = new THREE.Group();
  const m = (c, e) => toon(r3d, { color: c, emissive: e || 0x000000, key: 'food' + c + (e || '') });
  const b = (w, h, d, c, x, y, z, e) => { const q = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m(c, e)); q.position.set(x, y, z); q.castShadow = true; g.add(q); return q; };
  if (food === 'apple') { b(0.22, 0.2, 0.22, '#e04848', 0, 0.1, 0); b(0.03, 0.08, 0.03, '#6b4330', 0, 0.24, 0); b(0.1, 0.03, 0.06, '#4f9a3a', 0.05, 0.25, 0); }
  else if (food === 'acorn') { b(0.16, 0.16, 0.16, '#c8864a', 0, 0.08, 0); b(0.2, 0.08, 0.2, '#6b4330', 0, 0.18, 0); b(0.03, 0.06, 0.03, '#4a3020', 0, 0.25, 0); }
  else if (food === 'corn') { b(0.12, 0.3, 0.12, '#f4c542', 0, 0.15, 0); b(0.05, 0.26, 0.14, '#62a84a', -0.07, 0.12, 0); b(0.05, 0.26, 0.14, '#62a84a', 0.07, 0.12, 0); }
  else if (food === 'kelp') { for (const [x, h] of [[-0.06, 0.34], [0.02, 0.26], [0.08, 0.3]]) b(0.05, h, 0.03, '#3a9a5a', x, h / 2, 0); }
  else if (food === 'honey') { b(0.22, 0.2, 0.22, '#f0a830', 0, 0.1, 0); b(0.24, 0.05, 0.24, '#8a5a2a', 0, 0.22, 0); b(0.1, 0.04, 0.02, '#fff0a0', 0, 0.12, 0.115); }
  else if (food === 'bug') { b(0.16, 0.1, 0.2, '#3ab8c8', 0, 0.35, 0, 0x1a6a7a); b(0.1, 0.02, 0.18, '#e8fbff', 0.1, 0.38, 0); b(0.1, 0.02, 0.18, '#e8fbff', -0.1, 0.38, 0); }
  else if (food === 'fern') { b(0.04, 0.34, 0.04, '#6b4a2a', 0, 0.17, 0); for (let i = 0; i < 4; i++) { const q = b(0.26 - i * 0.04, 0.03, 0.08, '#4f9a3c', 0, 0.12 + i * 0.07, 0); q.rotation.y = i * 0.9; } }
  else if (food === 'fish') { b(0.3, 0.12, 0.08, '#6aa8d8', 0, 0.08, 0); b(0.08, 0.12, 0.05, '#4a88c0', -0.18, 0.08, 0); b(0.03, 0.03, 0.09, '#241a2e', 0.1, 0.1, 0); }
  return g;
}
