// The wild world doesn't wait for you. While exploring, every few minutes
// something happens somewhere near the party:
//  - a gloom invasion: a waystone out in the wild is attacked. Get there
//    (follow the arrow), hold out through three waves, and the stone shines
//    again — a chest and a good handful of XP for the defenders.
//  - a migration: a big herd crosses the land near you. Migrating animals are
//    calm: taming one is easier than usual.
//  - at night, shooting stars: one falls close by — catch it before it fades
//    for stardust and a wish for the whole party.
// (Weather events — gusts, blizzards, sandstorms, squalls — live in zones.js.)

import { THREE } from '../render/r3d.js';
import { ZONE_FOES, ZONE_BIG, makeElite } from '../combat/v3/bestiary.js';
import { MOUNTS } from './mounts.js';
import { ZONES } from '../world/big/layout.js';
import { TT } from '../world/tiles.js';
import { drawText, measure } from '../engine/font.js';
import { audio } from '../engine/audio.js';
import { drawTargetArrow } from './story.js';
import { t } from '../i18n.js';
import { drawMarks } from './mapmarks.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const ZNAME = Object.fromEntries(ZONES.map((z) => [z.id, z.name]));
const NIGHT = (h) => h >= 20 || h < 6;

const FIRST = [150, 240];        // seconds of roaming before the first big event
const EVERY = [260, 420];        // then between events
const WAVES = 3;
const REACH = 16;                // someone this close starts the defence
const HERD = { stag: 'stags', boar: 'boars', hen: 'giant hens', bear: 'bears', frog: 'big frogs' };
const WISHES = [
  { id: 'swift', name: 'swift feet for everyone!', apply: (f) => { f.speedT = Math.max(f.speedT || 0, 60); } },
  { id: 'strong', name: 'stronger hits for everyone!', apply: (f) => { f.buff = Math.max(f.buffT > 0 ? f.buff : 0, 0.25); f.buffT = Math.max(f.buffT || 0, 60); } },
  { id: 'heal', name: 'everyone feels wonderful!', apply: (f) => { f.hp = f.maxHp; f.regenT = Math.max(f.regenT || 0, 15); } },
];

export class Events {
  constructor(party) {
    this.party = party;
    this.root = new THREE.Group();
    this.root.name = 'world-events';
    party.world.over.root.add(this.root);
    this.next = rnd(FIRST[0], FIRST[1]);
    this.invasion = null;
    this.migration = null;
    this.stars = [];
    this.starT = rnd(15, 30);
    this.cardRect = null;
  }

  active() { const P = this.party; return P.exploring() && !!P.combat && (!P.eventsAllowed || P.eventsAllowed()); }
  busy() { const P = this.party; return (P.races && P.races.race) || (P.lairs && P.lairs.fight) || P.busy || P.vote || (P.act && P.act.stage !== 'roam'); }
  live() { return this.party.players.filter((p) => p.connected); }

  centroid() {
    const ps = this.live();
    let x = 0, z = 0;
    for (const p of ps) { x += p.pos.x; z += p.pos.z; }
    return ps.length ? { x: x / ps.length, z: z / ps.length } : null;
  }

  level() {
    const ps = this.live().filter((p) => p.fighter);
    return ps.length ? ps.reduce((a, p) => a + p.fighter.level, 0) / ps.length : 1;
  }

  // ------------------------------------------------------------------ frame
  update(dt) {
    const P = this.party, on = this.active();
    if (!on) {
      if (this.invasion) this.endInvasion(false, true);
      if (this.migration) this.endMigration(true);
      for (const s of this.stars) this.removeStar(s);
      this.stars = [];
      return;
    }
    if (this.invasion) this.updateInvasion(dt);
    if (this.migration) this.updateMigration(dt);
    this.updateStars(dt);
    if (this.invasion || this.migration || this.busy()) return;
    if ((this.next -= dt) > 0) return;
    this.next = rnd(EVERY[0], EVERY[1]);
    if (!(Math.random() < 0.6 && this.startInvasion()) && !this.startMigration()) this.startInvasion();
  }

  // for testing & the host: start one now
  trigger(kind) {
    if (kind === 'invasion') return this.startInvasion();
    if (kind === 'migration') return this.startMigration();
    if (kind === 'star') return this.dropStar(true);
    return false;
  }

  // ------------------------------------------------------------------ invasions
  startInvasion() {
    const P = this.party, T = P.travel, c = this.centroid();
    if (!T || !c || this.invasion) return false;
    // (only lands the story has opened — never behind the Murk — and the stones they've been
    // near first: a road they know leads there)
    const shut = (s) => P.murk && P.murk.at(Math.floor(s.x), Math.floor(s.z)), known = (s) => (s.attuned || s.seen ? 1 : 0);
    const cands = T.stones.filter((s) => s.zone !== 'valley' && ZONE_FOES[s.zone] && !shut(s)).map((s) => ({ s, d: Math.hypot(s.x - c.x, s.z - c.z) })).filter((o) => o.d > 25 && o.d < 120);
    if (!cands.length) return false;
    cands.sort((a, b) => known(b.s) - known(a.s) || a.d - b.d);
    const s = pick(cands.slice(0, 2)).s;
    const I = { s, zone: s.zone, phase: 'wait', t: 0, wave: 0, foes: [], away: 0, pause: 0, g: this.gloomMarker(s) };
    this.invasion = I;
    P.showBanner(t('Gloom attack at a waystone: {place}!', { place: t(s.name) }), t(P.solo ? 'defend the waystone! Follow the arrow' : 'defend the waystone — follow the arrow'));
    audio.sfx('thunder', { volume: 0.6 });
    audio.sfx('growl', { volume: 0.8, pitch: -6 });
    for (const p of this.live()) P.buzz(p, [60, 40, 60]);
    return true;
  }

  // a column of gloom over the stone, seen from far away
  gloomMarker(s) {
    const g = new THREE.Group();
    const col = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.2, 14, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0x6a3aa0, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
    col.position.y = 7;
    g.add(col);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(REACH * 0.55, 0.12, 4, 48).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xb86aff, transparent: true, opacity: 0.5, depthWrite: false }));
    ring.position.y = 0.08;
    g.add(ring);
    g.position.set(s.x, 0, s.z);
    g.userData = { col, ring };
    this.root.add(g);
    return g;
  }

  updateInvasion(dt) {
    const P = this.party, I = this.invasion;
    I.t += dt;
    const U = I.g.userData;
    U.col.rotation.y += dt * 0.6;
    U.col.material.opacity = (I.phase === 'fight' ? 0.28 : 0.38) + Math.sin(P.t * 3) * 0.06;
    U.ring.rotation.y -= dt * 0.3;
    if (Math.random() < dt * 8) P.world.fx.emit('smoke', I.s.x + rnd(-2, 2), rnd(0.2, 2.5), I.s.z + rnd(-1.5, 1.5), 1, { color: '#4a2a6e' });
    let d = 1e9;
    for (const p of this.live()) d = Math.min(d, Math.hypot(p.pos.x - I.s.x, p.pos.z - I.s.z));
    if (I.phase === 'wait') {
      if (d < REACH) { I.phase = 'fight'; I.t = 0; this.wave(); }
      else if (I.t > 150) this.endInvasion(false);
      return;
    }
    I.foes = I.foes.filter((e) => e.alive || e.fading > 0);
    // everyone ran off: the gloom settles in (for now)
    if (d > 40) { I.away += dt; if (I.away > 25) { this.endInvasion(false); return; } } else I.away = 0;
    if (I.pause > 0) { if ((I.pause -= dt) <= 0) this.wave(); return; }
    if (!I.foes.some((e) => e.alive)) {
      if (I.wave >= WAVES) this.endInvasion(true);
      else { I.pause = 3; P.toast(t('Wave {n} beaten! More gloom coming…', { n: I.wave }), '#b88cf0'); }
    }
  }

  wave() {
    const P = this.party, C = P.combat, I = this.invasion;
    I.wave++;
    const lv = this.level(), n = this.live().length || 1;
    const pool = ZONE_FOES[I.zone] || ZONE_FOES.steppe;
    const count = Math.min(10, 2 + I.wave + Math.floor(n * 0.8) + Math.floor(lv / 4));
    const types = [];
    for (let i = 0; i < count; i++) types.push(pick(pool));
    if (I.wave === WAVES && ZONE_BIG[I.zone]) types[0] = ZONE_BIG[I.zone];
    types.forEach((ty, i) => {
      const a = (i / types.length) * Math.PI * 2 + rnd(-0.3, 0.3), r = rnd(6, 9);
      const s = C.freeSpot(I.s.x + Math.cos(a) * r, I.s.z + Math.sin(a) * r * 0.8, 1.2) || { x: I.s.x + Math.cos(a) * r, z: I.s.z + Math.sin(a) * r * 0.8 };
      const e = C.spawn(ty, s.x, s.z, {});
      e.invasion = true;
      I.foes.push(e);
    });
    if (I.wave >= 2 && lv >= 3) { const e = I.foes.find((q) => q.alive && q.type !== ZONE_BIG[I.zone]); if (e) makeElite(e); }
    P.toast(t('Wave {n}/{total}!', { n: I.wave, total: WAVES }), '#ff9aa8');
    audio.sfx('growl', { volume: 0.7 });
  }

  endInvasion(won, quiet = false) {
    const P = this.party, I = this.invasion, C = P.combat;
    this.invasion = null;
    this.root.remove(I.g);
    if (!won) {
      for (const e of I.foes) if (e.alive) { e.alive = false; e.fading = 0; e.remove(); }
      if (!quiet) P.toast(t('The gloom drifted away… ({place})', { place: t(I.s.name) }), '#b9a2e3');
      return;
    }
    P.showBanner(t('The waystone is safe!'), t('{place} shines brighter than ever', { place: t(I.s.name) }));
    audio.jingle('questDone');
    P.world.fx.emit('flash', I.s.x, 1, I.s.z, 1, { color: '#9fdcff' });
    P.world.fx.emit('firework', I.s.x, 1.5, I.s.z, 30, { color: '#9fdcff' });
    P.world.fx.emit('ring', I.s.x, 0.2, I.s.z, 1, { color: '#9fdcff' });
    if (P.act && P.act.dropChest) P.act.dropChest(I.s.x + 1.5, I.s.z + 1.2, { rich: true });
    for (const p of this.live()) {
      if (Math.hypot(p.pos.x - I.s.x, p.pos.z - I.s.z) > 30) continue;
      if (C && p.fighter) { C.gainXp(p, 50); if (p.fighter.down) C.revive(p, 0.6, null); }
      if (P.progress) P.progress.addDust(p, 20);
    }
    if (P.travel && !I.s.attuned) P.travel.attune(I.s, this.live()[0]);
  }

  // ------------------------------------------------------------------ migrations
  startMigration() {
    const P = this.party, M = P.mounts, B = P.big, c = this.centroid();
    if (!M || !B || !c || this.migration) return false;
    const zone = B.zoneAt(c.x, c.z).id;
    const kinds = Object.keys(HERD).filter((k) => MOUNTS[k].zones.includes(zone));
    if (!kinds.length) return false;
    const kind = pick(kinds), D = MOUNTS[kind];
    // a line across the party's land: from one side, past the group, to the other
    const land = (x, z) => { const tt = B.tileAt(x, z); return tt !== TT.WATER && tt !== TT.CORAL && tt !== TT.LAVA && tt !== TT.SKY && tt !== -1 && B.zoneAt(x, z).id === zone; };
    let path = null;
    for (let k = 0; k < 16 && !path; k++) {
      const a = Math.random() * Math.PI * 2, dx = Math.cos(a), dz = Math.sin(a) * 0.8, off = rnd(3, 6);
      const A = { x: c.x - dx * 26 - dz * off, z: c.z - dz * 26 + dx * off }, Bp = { x: c.x + dx * 30 - dz * off, z: c.z + dz * 30 + dx * off };
      let ok = true;
      for (let i = 0; i <= 12 && ok; i++) { const q = i / 12; if (!land(A.x + (Bp.x - A.x) * q, A.z + (Bp.z - A.z) * q)) ok = false; }
      if (ok) path = { A, B: Bp };
    }
    if (!path) return false;
    const herd = { kind, x: path.A.x, z: path.A.z, id: 'migration', migrate: { tx: path.B.x, tz: path.B.z, speed: 1.5 }, done: false };
    const n = 7 + Math.floor(Math.random() * 4);
    const wild = [];
    for (let i = 0; i < n; i++) {
      const ox = rnd(-3.5, 3.5), oz = rnd(-2.5, 2.5);
      const w = { kind, D, herd, x: herd.x + ox, z: herd.z + oz, ox, oz, face: { x: path.B.x - path.A.x, z: path.B.z - path.A.z }, state: 'wander', t: 6, variant: Math.floor(Math.random() * 3), rig: null, id: M.seq++, bubbleT: 0, y: 0, migrant: true };
      M.wild.push(w);
      wild.push(w);
    }
    this.migration = { herd, wild, t: 0, zone };
    P.showBanner(t('Migration: {animals} on the move!', { animals: t(HERD[kind]) }), t('migrating animals are calm — easy to tame'));
    audio.sfx('growl', { volume: 0.3, pitch: 8 });
    return true;
  }

  updateMigration(dt) {
    const M = this.party.mounts, G = this.migration, h = G.herd;
    G.t += dt;
    if (!M) { this.migration = null; return; }
    G.wild = G.wild.filter((w) => M.wild.includes(w));          // (tamed ones leave the herd)
    const mg = h.migrate, dx = mg.tx - h.x, dz = mg.tz - h.z, d = Math.hypot(dx, dz);
    if (d > 0.5 && !h.done) {
      // the herd waits for its stragglers
      const lag = G.wild.reduce((a, w) => Math.max(a, Math.hypot(w.x - h.x - w.ox, w.z - h.z - w.oz)), 0);
      const sp = mg.speed * (lag > 5 ? 0.3 : 1);
      h.x += (dx / d) * sp * dt; h.z += (dz / d) * sp * dt;
    } else h.done = true;
    // gone over the horizon: off they go once nobody's looking
    let near = 1e9;
    for (const p of this.live()) near = Math.min(near, Math.hypot(p.pos.x - h.x, p.pos.z - h.z));
    if ((h.done && near > 22) || G.t > 150 || !G.wild.length) this.endMigration(false);
  }

  endMigration(quiet) {
    const M = this.party.mounts, G = this.migration;
    this.migration = null;
    if (!M || !G) return;
    for (const w of G.wild) {
      if (w.tamer) { w.migrant = false; w.herd = { kind: w.kind, x: w.x, z: w.z, id: 'strays' }; continue; }
      if (w.rig) M.root.remove(w.rig.root);
      M.wild = M.wild.filter((q) => q !== w);
    }
    if (!quiet) this.party.toast(t('The herd moves on over the hills'), '#8fd67a');
  }

  // ------------------------------------------------------------------ shooting stars
  updateStars(dt) {
    const P = this.party;
    if (NIGHT(P.state.hour) && !this.busy()) {
      if ((this.starT -= dt) <= 0) { this.starT = rnd(40, 70); this.dropStar(false); }
    }
    for (const s of this.stars) {
      s.t += dt;
      if (s.phase === 'fall') {
        const k = Math.min(1, s.t / 1.4);
        s.g.position.set(s.fx + (s.x - s.fx) * k, s.fy + (s.y0 - s.fy) * k * k, s.fz + (s.z - s.fz) * k);
        P.world.fx.emit('sparkle', s.g.position.x, s.g.position.y, s.g.position.z, 2, { color: Math.random() < 0.5 ? '#fff3c4' : '#9fdcff' });
        if (k >= 1) {
          s.phase = 'land'; s.t = 0;
          // it lights the ground around it (a source in the lamp pool)
          s.light = { x: s.x, y: s.y0 + 0.6, z: s.z, color: '#ffe89a', power: 1.6, dist: 6, always: true };
          P.lighting.sources.push(s.light);
          P.world.fx.emit('flash', s.x, 0.5, s.z, 1, { color: '#fff3c4' });
          P.world.fx.emit('ring', s.x, 0.15, s.z, 1, { color: '#fff3c4' });
          P.world.fx.emit('firework', s.x, 0.6, s.z, 16, { color: '#fff3c4' });
          audio.sfx('shard', { volume: 0.7 });
          P.cam.shake = Math.max(P.cam.shake || 0, 0.12);
        }
      } else if (s.phase === 'land') {
        s.g.position.y = s.y0 + Math.sin(P.t * 3) * 0.12;
        s.g.rotation.y += dt * 2;
        s.glow.material.opacity = 0.65 + Math.sin(P.t * 5) * 0.2;
        if (Math.random() < dt * 4) P.world.fx.emit('sparkle', s.x + rnd(-0.4, 0.4), rnd(0.3, 1.2), s.z + rnd(-0.3, 0.3), 1, { color: '#fff3c4' });
        const who = this.live().find((p) => Math.hypot(p.pos.x - s.x, p.pos.z - s.z) < 1.1);
        if (who) this.catchStar(s, who);
        else if (s.t > 50) { s.gone = true; P.world.fx.emit('sparkle', s.x, 0.6, s.z, 10, { color: '#9fdcff' }); }
      }
    }
    for (const s of this.stars) if (s.gone) this.removeStar(s);
    this.stars = this.stars.filter((s) => !s.gone);
  }

  removeStar(s) {
    this.root.remove(s.g);
    if (s.light) { const L = this.party.lighting; L.sources = L.sources.filter((q) => q !== s.light); s.light = null; }
  }

  // a star falls a little way from someone
  dropStar(force) {
    const P = this.party, B = P.big, ps = this.live();
    if (!ps.length || this.stars.length >= 2) return false;
    const p = pick(ps);
    for (let k = 0; k < 30; k++) {
      const a = Math.random() * Math.PI * 2, r = rnd(6, 11);
      const x = p.pos.x + Math.cos(a) * r, z = p.pos.z + Math.sin(a) * r * 0.75;
      const tt = B ? B.tileAt(x, z) : P.world.tileAt(x, z);
      if (tt === TT.WATER || tt === TT.CORAL || tt === TT.LAVA || tt === TT.SKY || tt === -1 || P.world.overCol.blocked(x, z, 0.4) || (P.murk && P.murk.at(Math.floor(x), Math.floor(z)))) continue;
      const g = new THREE.Group();
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), new THREE.MeshBasicMaterial({ color: 0xfff8d8 }));
      star.scale.set(1, 1.35, 1);
      g.add(star);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: P.lighting.glowTex, color: 0xffe89a, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
      glow.scale.set(2.2, 2.2, 1);
      g.add(glow);
      const y0 = 0.5 + (B ? B.groundY({ x, z }) : 0);
      const s = { g, glow, x, z, y0, fx: x + 18, fy: 22, fz: z - 12, t: 0, phase: 'fall' };
      g.position.set(s.fx, s.fy, s.fz);
      this.root.add(g);
      this.stars.push(s);
      audio.sfx('whoosh', { volume: 0.5, pitch: 12 });
      if (force || Math.random() < 0.5) P.toast(t(P.solo ? 'A shooting star! Catch it before it fades!' : 'A shooting star! Catch it before it fades'), '#fff3c4');
      return true;
    }
    return false;
  }

  catchStar(s, p) {
    const P = this.party, G = P.progress;
    s.gone = true;
    P.world.fx.emit('firework', s.x, 1, s.z, 24, { color: '#fff3c4' });
    P.world.fx.emit('ring', s.x, 0.2, s.z, 1, { color: '#fff3c4' });
    audio.jingle('shard');
    const wish = pick(WISHES);
    for (const q of this.live()) {
      if (G) G.addDust(q, q === p ? 25 : Math.hypot(q.pos.x - s.x, q.pos.z - s.z) < 14 ? 10 : 0);
      if (q.fighter) wish.apply(q.fighter);
    }
    p.setEmote('star', 2);
    P.buzz(p, [30, 30, 30, 30, 90]);
    P.showBanner(t('{name} caught a shooting star!', { name: p.name }), t('Wish: {wish}', { wish: t(wish.name) }));
  }

  // ------------------------------------------------------------------ hud
  ctxFor(p) {
    const I = this.invasion;
    if (!I) return null;
    if (I.phase === 'wait') return { hint: 'A waystone is under attack: {place} — follow the arrow!', vars: { place: t(I.s.name) } };
    return { hint: 'Defend the waystone! Wave {n}/{total}', vars: { n: I.wave, total: WAVES } };
  }

  // an arrow in every view that isn't there yet
  drawArrows(ctx, v) {
    const I = this.invasion;
    if (!I || !v.members.length) return false;
    const near = v.members.some((m) => Math.hypot(m.pos.x - I.s.x, m.pos.z - I.s.z) < REACH);
    if (near && I.phase === 'fight') return false;
    drawTargetArrow(this.party, ctx, v, I.s, '#ff6b9a');
    return true;
  }

  drawUi(ctx) {
    const P = this.party, I = this.invasion;
    this.cardRect = null;
    if (!I || (P.races && P.races.race)) return;
    const title = t('Gloom attack: {place}', { place: t(I.s.name) });
    const left = I.foes.filter((e) => e.alive).length;
    const sub = I.phase === 'wait' ? t('{zone} · get there!', { zone: t(ZNAME[I.zone] || '') }) : I.pause > 0 ? t('wave {n}/{total} beaten', { n: I.wave, total: WAVES }) : t('wave {n}/{total} · {k} left', { n: I.wave, total: WAVES, k: left });
    const w = Math.max(measure(title), measure(sub)) + 20, { x, y } = P.topCard(w, 25);
    ctx.fillStyle = 'rgba(30,20,40,0.85)'; ctx.fillRect(x, y, w, 25);
    ctx.fillStyle = '#b86aff'; ctx.fillRect(x, y, w, 1);
    drawText(ctx, title, x + w / 2, y + 4, { color: '#ff9ad0', align: 'center' });
    drawText(ctx, sub, x + w / 2, y + 14, { color: '#e8d6b4', align: 'center' });
    this.cardRect = { x, y, w, h: 25 };
  }

  mapMarks(out = []) {
    const I = this.invasion;
    if (I) out.push({ k: 'invasion', x: I.s.x, z: I.s.z, name: t('Gloom invasion'), st: t('Hold the waystone!') });
    for (const s of this.stars) if (s.phase === 'land') out.push({ k: 'star', x: s.x, z: s.z, name: t('Shooting star'), st: t('Catch it for a wish') });
    return out;
  }
  drawMapMarks(ctx, M) { drawMarks(ctx, M, this.mapMarks(), this.party.t); }

  dispose() {
    if (this.invasion) this.endInvasion(false, true);
    if (this.migration) this.endMigration(true);
    for (const s of this.stars) this.removeStar(s);
    this.stars = [];
    this.party.world.over.root.remove(this.root);
  }
}
