// Secrets of the wild zones: sealed golden chests behind little puzzles, and
// treasure buried where the ground glints. They only wake while exploring.
//  - Plates: three old stone plates round a sealed chest. Stand on one and it
//    lights up — and stays lit a few seconds after you step off (its pillar of
//    light shrinks). Light all three at once and the seal breaks: friends make
//    it easy, alone you'll have to run (or ride!).
//  - Chimes: four crystals round a pedestal. A at the pedestal and it sings a
//    little tune; ring the crystals (A) in the same order. Three tunes, a note
//    longer each time; a wrong note and the tune plays again.
//  - Buried treasure: one in every wild zone, a glint in the ground. Dig!
// A solved secret stays solved for a while (saved), then a new chest waits.

import { THREE, toon } from '../render/r3d.js';
import { TT } from '../world/tiles.js';
import { ZONES } from '../world/big/layout.js';
import { hash2 } from '../engine/util.js';
import { audio } from '../engine/audio.js';
import { t } from '../i18n.js';
import { drawMarks } from './mapmarks.js';

const RESET = 30 * 60 * 1000;             // a solved secret comes back after half an hour
const HOLD = 5.5;                         // seconds a plate stays lit once you step off
const PLATE_R = 4.6;                      // plates' distance from the chest
const NOTES = [0, 2, 4, 7];               // the crystals sing G, A, B, D
const GEM = ['#ff6b7b', '#5aa8f2', '#8fdc5a', '#ffd66b'];
const TUNE = [3, 4, 5];                   // notes in each round
const BEAT = 0.62;                        // seconds per note when the pedestal plays

const PUZZLES = [
  { id: 'plates-dunes', kind: 'plates', poi: 'sand_temple' },
  { id: 'plates-canyon', kind: 'plates', poi: 'rock_arch' },
  { id: 'plates-sunken', kind: 'plates', poi: 'dome_temple' },
  { id: 'plates-heights', kind: 'plates', poi: 'windmill' },
  { id: 'plates-lagoon', kind: 'plates', poi: 'shipwreck' },
  { id: 'chimes-cloud', kind: 'chimes', poi: 'cloud_temple' },
  { id: 'chimes-bounce', kind: 'chimes', poi: 'mother_cap' },
  { id: 'chimes-volcano', kind: 'chimes', poi: 'onsen' },
  { id: 'chimes-steppe', kind: 'chimes', poi: 'baobab' },
  { id: 'chimes-straits', kind: 'chimes', poi: 'lighthouse' },
];

export class Secrets {
  constructor(party) {
    this.party = party;
    this.root = new THREE.Group();
    this.root.name = 'secrets';
    party.world.over.root.add(this.root);
    this.list = [];
    this.digs = [];
    this.save = party.loadSave('secrets', {}) || {};
    if (!this.save.solved) this.save.solved = {};
    const B = party.big;
    if (!B) return;
    // keep clear of the landmarks, camps, lairs and waystones (each with a radius)
    const taken = B.map.pois.map((p) => ({ x: p.x, z: p.z, r: (p.clear ?? 2) + 3 }));
    if (party.encounters) for (const c of party.encounters.camps) taken.push({ x: c.x, z: c.z, r: 8 });
    if (party.lairs) for (const L of party.lairs.list) taken.push({ x: L.x, z: L.z, r: 12 });
    for (const D of PUZZLES) {
      const poi = B.map.pois.find((p) => p.kind === D.poi);
      if (!poi) continue;
      const R = D.kind === 'plates' ? PLATE_R + 1.6 : 4.4;
      const at = this.spot(poi.x, poi.z, R, taken, D.kind);
      if (!at) continue;
      taken.push({ ...at, r: R });
      const cz = D.kind === 'plates' ? at.z : at.z - 1.6;
      this.list.push({ ...D, x: at.x, z: at.z, cx: at.x, cz, zone: B.zoneAt(at.x, at.z).id, state: this.solved(D.id) ? 'solved' : 'sealed', built: null, seen: false, told: false, game: null });
    }
    ZONES.forEach((Z, zi) => {
      if (Z.id === 'valley' || Z.id === 'sea' || !Z.seeds.length) return;
      const at = this.buriedSpot(Z, zi, taken);
      if (!at) return;
      taken.push({ ...at, r: 2 });
      const id = 'dig-' + Z.id;
      this.digs.push({ id, zone: Z.id, x: at.x, z: at.z, dug: this.solved(id), glintT: Math.random(), mound: null });
    });
  }

  active() { return this.party.exploring(); }
  solved(id) { const at = this.save.solved[id]; return !!at && Date.now() - at < RESET; }
  mark(id) { this.save.solved[id] = Date.now(); this.party.writeSave('secrets', this.save); }

  // ------------------------------------------------------------------ placement
  // open, dry, flat ground in a disc of radius R (no trees, no water, no decks)
  open(x, z, R) {
    const B = this.party.big;
    const ok = (px, pz) => B.col.walkable(Math.floor(px), Math.floor(pz)) && !B.onDeck(px, pz) && !B.col.blocked(px, pz, 0.5);
    if (!ok(x, z)) return false;
    for (const rr of [1.5, 3, 4.5, R]) {
      if (rr > R) continue;
      for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; if (!ok(x + Math.cos(a) * rr, z + Math.sin(a) * rr)) return false; }
    }
    return true;
  }

  // near a landmark: a spiral out from it, south first (in front, for the camera)
  spot(x, z, R, taken, kind) {
    const M = this.party.mounts;
    // where the pieces stand (no tree canopy may hide them)
    const parts = kind === 'plates' ? [[0, 0], ...[0, 1, 2].map((i) => { const a = -Math.PI / 2 + (i * Math.PI * 2) / 3; return [Math.cos(a) * PLATE_R, Math.sin(a) * PLATE_R]; })]
      : [[0, 0], [0, -1.6], ...[0, 1, 2, 3].map((i) => { const a = Math.PI / 4 + (i * Math.PI) / 2; return [Math.cos(a) * 3, Math.sin(a) * 3]; })];
    for (let r = R + 3; r <= 40; r += 1) {
      for (let k = 0; k < 16; k++) {
        const a = Math.PI / 2 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 8);
        const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
        if (taken.some((o) => Math.hypot(o.x - px, o.z - pz) < o.r + R + 2)) continue;
        // (trees just south count too: their crowns hide what's behind them on screen)
        if (M && parts.some(([dx, dz]) => M.tallNear(px + dx, pz + dz, 2.3) > 0 || M.tallNear(px + dx, pz + dz + 2, 2.3) > 0)) continue;
        if (this.open(px, pz, R)) return { x: px, z: pz };
      }
    }
    return null;
  }

  // somewhere quiet in a zone, off the roads (the same spot every time)
  buriedSpot(Z, zi, taken) {
    const B = this.party.big, m = B.map;
    for (let k = 0; k < 500; k++) {
      const s = Z.seeds[k % Z.seeds.length];
      const x = Math.floor(s[0] + (hash2(k, zi, 11) - 0.5) * 50) + 0.5, z = Math.floor(s[1] + (hash2(k, zi, 12) - 0.5) * 36) + 0.5;
      if (B.zoneAt(x, z).id !== Z.id || B.inValley(x, z)) continue;
      const tt = B.tileAt(x, z);
      if (tt === TT.PATH || tt === TT.PLAZA || m.keep[(Math.floor(z) - m.Z0) * m.W + (Math.floor(x) - m.X0)]) continue;
      if (taken.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + 4)) continue;
      if (this.open(x, z, 1.5) && !(this.party.mounts && this.party.mounts.tallNear(x, z, 2.2) > 0)) return { x, z };
    }
    return null;
  }

  // ------------------------------------------------------------------ models
  build(S) {
    const P = this.party, r3d = P.r3d, B = P.big;
    const g = new THREE.Group();
    const stone = toon(r3d, { color: 0xa8a0a4, key: 'sec-stone' }), dark = toon(r3d, { color: 0x6e6874, key: 'sec-dark' });
    const box = (w, h, d, m, x, y, z, parent = g) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; parent.add(b); return b; };
    const U = { plates: [], crystals: [] };
    // the sealed chest on its dais, under a shimmering dome
    const ox = S.cx - S.x, oz = S.cz - S.z;
    box(1.7, 0.22, 1.5, dark, ox, 0.11, oz);
    box(1.5, 0.12, 1.3, stone, ox, 0.28, oz);
    const chest = new THREE.Group();
    const gold = toon(r3d, { color: 0xf2c14e, emissive: 0x6a4a10, emissiveIntensity: 1, key: 'chest-gold' });
    const goldDeep = toon(r3d, { color: 0xd89a2a, emissive: 0x4a3008, emissiveIntensity: 1, key: 'chest-golddeep' });
    box(0.72, 0.4, 0.5, gold, 0, 0.2, 0, chest);
    box(0.74, 0.16, 0.52, goldDeep, 0, 0.48, 0, chest);
    box(0.12, 0.14, 0.05, toon(r3d, { color: 0xfff3c4, key: 'sec-latch' }), 0, 0.36, 0.27, chest);
    chest.position.set(ox, 0.34, oz);
    g.add(chest);
    // the seal: a shimmering dome, a glowing ring round its foot and motes circling it
    const dome = new THREE.Group();
    dome.add(new THREE.Mesh(new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x9a6aff, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false })));
    dome.add(new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 4, 24).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xc6a8ff })));
    const motes = [];
    for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), new THREE.MeshBasicMaterial({ color: 0xfff3c4 })); dome.add(m); motes.push(m); }
    dome.position.set(ox, 0.34, oz);
    g.add(dome);
    U.chest = chest; U.dome = dome; U.motes = motes;
    if (S.kind === 'plates') {
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 3;
        const px = Math.cos(a) * PLATE_R, pz = Math.sin(a) * PLATE_R;
        const pg = new THREE.Group();
        pg.position.set(px, 0, pz);
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.74, 0.12, 12), dark); base.position.y = 0.06; base.receiveShadow = true; pg.add(base);
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.62, 0.06, 12), stone); top.position.y = 0.14; top.receiveShadow = true; pg.add(top);
        const runeMat = new THREE.MeshToonMaterial({ color: 0x6a5a8a, emissive: 0x5ac8ff, emissiveIntensity: 0.1, gradientMap: r3d.gradient });
        const rune = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.07, 4, 16).rotateX(Math.PI / 2), runeMat); rune.position.y = 0.18; pg.add(rune);
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.56, 2.2, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0x5ac8ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
        pillar.position.y = 1.1; pillar.visible = false; pg.add(pillar);
        // a groove of runes from the plate to the dais (glows with its plate)
        const L = PLATE_R - 1.4, lineMat = new THREE.MeshToonMaterial({ color: 0x5a5260, emissive: 0x5ac8ff, emissiveIntensity: 0, gradientMap: r3d.gradient });
        const line = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, L), lineMat);
        line.position.set(px - Math.cos(a) * (L / 2 + 0.7), 0.02, pz - Math.sin(a) * (L / 2 + 0.7));
        line.rotation.y = -a + Math.PI / 2;
        g.add(line);
        g.add(pg);
        U.plates.push({ i, x: S.x + px, z: S.z + pz, lit: 0, rune, pillar, line, g: pg });
      }
    } else {
      // the pedestal and its orb
      const ped = new THREE.Group();
      box(0.7, 0.14, 0.7, dark, 0, 0.07, 0, ped);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.8, 8), stone); col.position.y = 0.52; col.castShadow = true; ped.add(col);
      box(0.56, 0.1, 0.56, stone, 0, 0.96, 0, ped);
      const orbMat = new THREE.MeshToonMaterial({ color: 0xf6f0ff, emissive: 0xffffff, emissiveIntensity: 0.3, gradientMap: r3d.gradient });
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), orbMat); orb.position.y = 1.22; ped.add(orb);
      g.add(ped);
      U.orb = orb;
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + (i * Math.PI) / 2;
        const px = Math.cos(a) * 3, pz = Math.sin(a) * 3;
        const cg = new THREE.Group();
        cg.position.set(px, 0, pz);
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.28, 8), stone); base.position.y = 0.14; base.castShadow = true; base.receiveShadow = true; cg.add(base);
        const mat = new THREE.MeshToonMaterial({ color: new THREE.Color(GEM[i]), emissive: new THREE.Color(GEM[i]), emissiveIntensity: 0.25, gradientMap: r3d.gradient });
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), mat); gem.scale.set(1, 1.6, 1); gem.position.y = 0.85; gem.castShadow = true; cg.add(gem);
        g.add(cg);
        U.crystals.push({ i, x: S.x + px, z: S.z + pz, glow: 0, mat, gem });
      }
    }
    g.position.set(S.x, B.groundY({ x: S.x, z: S.z }), S.z);
    g.userData = U;
    this.root.add(g);
    S.built = g;
    if (S.state === 'solved') { dome.visible = false; chest.visible = false; }
  }

  // ------------------------------------------------------------------ frame
  update(dt) {
    const P = this.party, on = this.active();
    const ps = P.players.filter((p) => p.connected);
    for (const S of this.list) {
      let d = 1e9;
      for (const p of ps) d = Math.min(d, Math.hypot(p.pos.x - S.x, p.pos.z - S.z));
      if (d < 45 && !S.built) this.build(S);
      if (!S.built) continue;
      S.built.visible = d < 60;
      if (d < 30) S.seen = true;
      if (S.state === 'solved' && !this.solved(S.id)) this.reset(S);
      if (!S.built.visible) continue;
      if (S.kind === 'plates') this.updatePlates(S, dt, on, ps);
      else this.updateChimes(S, dt, on);
      const U = S.built.userData;
      if (U.dome.visible) {
        U.dome.children[0].material.opacity = 0.28 + Math.sin(P.t * 2.2) * 0.08;
        U.motes.forEach((m, i) => { const a = P.t * 1.3 + (i * Math.PI) / 2; m.position.set(Math.cos(a) * 1.05, 0.35 + Math.sin(P.t * 2 + i) * 0.25, Math.sin(a) * 1.05); m.rotation.y += dt * 3; });
      }
      if (on && S.state === 'sealed' && d < 13 && !S.told) {
        S.told = true;
        P.toast(t(S.kind === 'plates' ? 'A sealed golden chest! Light all three plates at once.' : 'A sealed golden chest! Press {a} at the pedestal, then play its tune back.', { a: P.keyName('a') }), '#ffd66b');
        audio.sfx('sparkle', { volume: 0.6 });
      }
    }
    for (const g of this.digs) {
      if (g.dug) {
        if (this.solved(g.id)) continue;
        g.dug = false;
        if (g.mound) { this.root.remove(g.mound); g.mound = null; }
      }
      if (!on || (g.glintT -= dt) > 0) continue;
      g.glintT = 0.35 + Math.random() * 0.6;
      let d = 1e9;
      for (const p of ps) d = Math.min(d, Math.hypot(p.pos.x - g.x, p.pos.z - g.z));
      if (d < 8) P.world.fx.emit('sparkle', g.x + (Math.random() - 0.5) * 0.3, 0.12, g.z + (Math.random() - 0.5) * 0.2, 2, { color: '#ffe89a' });
    }
  }

  updatePlates(S, dt, on, ps) {
    const P = this.party, U = S.built.userData;
    let all = S.state === 'sealed';
    for (const pl of U.plates) {
      const was = pl.lit > 0;
      const stood = ps.some((p) => Math.hypot(p.pos.x - pl.x, p.pos.z - pl.z) < 0.85 && !(p.actor.jumpY > 0.6));
      if (on && S.state === 'sealed' && stood) pl.lit = HOLD;
      else pl.lit = Math.max(0, pl.lit - dt);
      if (!was && pl.lit > 0) {
        audio.sfx('tone', { pitch: NOTES[pl.i], volume: 0.8 });
        audio.sfx('place', { volume: 0.6 });
        P.world.fx.emit('ring', pl.x, 0.2, pl.z, 1, { color: '#9fdcff' });
      } else if (was && pl.lit <= 0 && S.state === 'sealed') audio.sfx('poof', { volume: 0.3 });
      const k = pl.lit / HOLD;
      pl.rune.material.emissiveIntensity = 0.1 + k * 1.7;
      pl.line.material.emissiveIntensity = k * 1.2;
      pl.pillar.visible = k > 0;
      if (k > 0) {
        pl.pillar.scale.y = Math.max(0.02, k); pl.pillar.position.y = 1.1 * k; pl.pillar.material.opacity = 0.3 + 0.25 * k + Math.sin(P.t * 8 + pl.i) * 0.06;
        if (Math.random() < dt * 5) P.world.fx.emit('sparkle', pl.x + (Math.random() - 0.5) * 0.8, 0.3 + Math.random() * 2 * k, pl.z + (Math.random() - 0.5) * 0.6, 1, { color: '#9fdcff' });
      }
      if (pl.lit <= 0) all = false;
    }
    if (all) this.solve(S);
  }

  updateChimes(S, dt, on) {
    const P = this.party, U = S.built.userData;
    for (const c of U.crystals) {
      c.glow = Math.max(0, c.glow - dt * 2.2);
      c.mat.emissiveIntensity = 0.25 + c.glow * 1.9;
      c.gem.scale.set(1 + c.glow * 0.25, 1.6 + c.glow * 0.4, 1 + c.glow * 0.25);
      c.gem.rotation.y += dt * (0.5 + c.glow * 4);
      c.gem.position.y = 0.85 + Math.sin(P.t * 1.6 + c.i * 1.7) * 0.06;
    }
    const G = S.game;
    const lit = U.crystals.reduce((a, c) => (c.glow > a.glow ? c : a), U.crystals[0]);
    U.orb.material.emissive.set(lit.glow > 0.05 ? GEM[lit.i] : '#ffffff');
    U.orb.material.emissiveIntensity = 0.3 + (G && G.phase === 'listen' ? 0.4 + Math.sin(P.t * 5) * 0.2 : 0) + lit.glow;
    if (!G || S.state !== 'sealed') return;
    if (!on) { S.game = null; return; }
    G.t += dt;
    if (G.phase === 'play') {
      const i = Math.floor(G.t / BEAT);
      if (G.t >= 0 && i !== G.shown && i < G.seq.length) { G.shown = i; this.ring(S, G.seq[i]); }
      if (G.t > G.seq.length * BEAT + 0.2) { G.phase = 'listen'; G.pos = 0; G.idle = 0; }
    } else if (G.phase === 'listen') {
      G.idle += dt;
      if (G.idle > 25) { S.game = null; P.toast(t('The crystals fall silent…'), '#b88cf0'); }
    } else if (G.t > 1.4) { G.phase = 'play'; G.t = -0.2; G.shown = -1; }
  }

  ring(S, i) {
    const c = S.built.userData.crystals[i];
    c.glow = 1;
    audio.sfx('tone', { pitch: NOTES[i], volume: 0.9 });
    this.party.world.fx.emit('sparkle', c.x, 1.1, c.z, 8, { color: GEM[i] });
  }

  // A at the pedestal: the crystals sing the first tune
  start(S, p) {
    if (S.game && S.game.phase !== 'listen') return;
    const seq = [];
    for (let k = 0; k < TUNE[0]; k++) seq.push(Math.floor(Math.random() * 4));
    S.game = { phase: 'play', round: 0, seq, pos: 0, t: -0.5, shown: -1, idle: 0 };
    this.party.toast(t('{name} wakes the crystals — listen!', { name: p.name }), p.color);
  }

  hit(S, i, p) {
    const P = this.party, G = S.game;
    this.ring(S, i);
    if (!G || G.phase !== 'listen') return;
    G.idle = 0;
    if (G.seq[G.pos] !== i) {
      G.phase = 'oops'; G.t = 0; G.pos = 0;
      audio.sfx('error', { volume: 0.7 });
      P.toast(t('Oops, not that one! Listen again…'), '#ff9aa8');
      return;
    }
    G.pos++;
    if (G.pos < G.seq.length) return;
    G.round++;
    if (G.round >= TUNE.length) { S.game = null; P.wait(0.5).then(() => this.solve(S)); return; }
    while (G.seq.length < TUNE[G.round]) G.seq.push(Math.floor(Math.random() * 4));
    G.phase = 'next'; G.t = 0;
    audio.sfx('sparkle', { volume: 0.7 });
    P.toast(t('Lovely! Now a longer tune… ({n}/{total})', { n: G.round + 1, total: TUNE.length }), '#8fd6b4');
  }

  solve(S) {
    const P = this.party, U = S.built.userData;
    if (S.state !== 'sealed') return;
    S.state = 'solved';
    this.mark(S.id);
    U.dome.visible = false; U.chest.visible = false;
    for (const pl of U.plates) { pl.lit = Math.max(pl.lit, 1.5); }
    P.world.fx.emit('flash', S.cx, 0.8, S.cz, 1, { color: '#ffd66b' });
    P.world.fx.emit('firework', S.cx, 1, S.cz, 30, { color: '#ffd66b' });
    audio.sfx('unlock', { volume: 0.9 });
    audio.jingle('shard');
    P.cam.shake = Math.max(P.cam.shake || 0, 0.2);
    P.showBanner(t('The seal breaks!'), t('a golden chest for the clever ones'));
    if (P.act && P.act.dropChest) P.act.dropChest(S.cx, S.cz, { rich: true, golden: true, pop: true, floor: 0.34 + P.big.groundY({ x: S.cx, z: S.cz }) });
    const C = P.combat;
    if (C) for (const p of P.players) if (p.fighter && Math.hypot(p.pos.x - S.x, p.pos.z - S.z) < 20) C.gainXp(p, 30);
  }

  reset(S) {
    S.state = 'sealed'; S.told = false; S.game = null;
    const U = S.built && S.built.userData;
    if (U) { U.dome.visible = true; U.chest.visible = true; }
  }

  dig(g, p) {
    const P = this.party;
    if (g.dug) return;
    g.dug = true;
    this.mark(g.id);
    P.world.fx.emit('soil', g.x, 0.1, g.z, 12);
    P.world.fx.emit('dust', g.x, 0.1, g.z, 8);
    audio.sfx('dig', { volume: 0.9 });
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.46, 0.12, 8), toon(P.r3d, { color: 0x7a5238, key: 'dig-mound' }));
    m.position.set(g.x, 0.06, g.z);
    m.receiveShadow = true;
    this.root.add(m);
    g.mound = m;
    P.wait(0.45).then(() => {
      if (P.act && P.act.dropChest) P.act.dropChest(g.x + 0.8, g.z + 0.3, { rich: true, golden: true, pop: true });
      audio.jingle('shard');
      P.showBanner(t('{name} dug up a golden chest!', { name: p.name }), t('buried treasure — one in every wild land'));
    });
  }

  // ------------------------------------------------------------------ explore hooks
  // what A does near a secret (explore's nearThing)
  near(p) {
    if (!this.active()) return null;
    for (const S of this.list) {
      if (S.kind !== 'chimes' || !S.built || S.state !== 'sealed' || Math.hypot(p.pos.x - S.x, p.pos.z - S.z) > 5) continue;
      const G = S.game;
      if (Math.hypot(p.pos.x - S.x, p.pos.z - S.z) < 1.3 && (!G || G.phase === 'listen')) return { kind: 'secret', label: 'Listen', hint: 'The pedestal plays a tune — then ring the crystals in its order', use: (q) => this.start(S, q) };
      for (const c of S.built.userData.crystals) if (Math.hypot(p.pos.x - c.x, p.pos.z - c.z) < 1.3) return { kind: 'secret', label: 'Ring', hint: G && G.phase === 'listen' ? 'Ring the crystals in the tune’s order' : 'A crystal that sings', use: (q) => this.hit(S, c.i, q) };
    }
    for (const g of this.digs) if (!g.dug && Math.hypot(p.pos.x - g.x, p.pos.z - g.z) < 1.2) return { kind: 'secret', label: 'Dig', hint: 'Something glints in the ground… dig!', use: (q) => this.dig(g, q) };
    return null;
  }

  // a word on the phone near a plates puzzle
  hint(p) {
    if (!this.active()) return null;
    for (const S of this.list) if (S.kind === 'plates' && S.state === 'sealed' && Math.hypot(p.pos.x - S.x, p.pos.z - S.z) < PLATE_R + 3) return 'Light all three plates at once — they stay lit a few seconds';
    return null;
  }

  // on the part of the world map someone has explored (so it stays there between sessions)
  revealed(o) { const WM = this.party.big && this.party.big.worldMap; return !!(WM && WM.revealed(o.x, o.z)); }

  mapMarks(out = []) {
    for (const S of this.list) if (S.seen || this.revealed(S)) out.push({ k: 'secret', x: S.x, z: S.z, on: S.state === 'solved', name: t('Sealed chest'), st: S.state === 'solved' ? t('Opened') : S.kind === 'plates' ? t('Three plates to light at once') : t('A tune to play back') });
    return out;
  }
  drawMapMarks(ctx, M) { drawMarks(ctx, M, this.mapMarks(), this.party.t); }

  dispose() { this.party.world.over.root.remove(this.root); }
}

export { secretIcon } from './mapmarks.js';
