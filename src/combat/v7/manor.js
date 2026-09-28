// World v7, chapter 9: the gloom of Hollowmoor, Prism Springs, Cogsworth and the tundra.
//   wisp        a moor wisp: drifts, then darts at you along a marked line.
//   clockwork   a gloomed clockwork soldier of Cogsworth: marches, winds up, swings a marked
//               arc with its key.
//   bogling     a mud-and-gloom thing of the bogs: lobs mud that leaves a slowing puddle.
//   poltergeist a manor ghost: throws the china (a marked landing).
//   ladygrey    Lady Honoria, the Lady in Grey, the Duchess’s mother (Hollowmoor Manor’s
//               boss). When the ballroom is in THEN she is only a memory, dancing, and
//               nothing touches her; in NOW she’s a gloom ghost and can be struck. The tea
//               service (marked landings), the pendulum (a marked arc), cold spots (marked
//               circles that slow); from phase 2 she pulls the room back to THEN herself
//               (`e.onThen`), in phase 3 ghost dancers waltz round in rings.
// Every blow is shown before it lands.

import { THREE } from '../../render/r3d.js';
import { toward, hover, speedOf, lob } from '../v3/ai.js';
import { flat, cone, later, tickLater, hurtIn, checkPhase, leash } from '../v3/bosses.js';
import { t } from '../../i18n.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export const MANOR_ENEMIES = {
  wisp: { name: 'Moor Wisp', hp: 60, speed: 3.0, r: 0.3, h: 0.8, dmg: 14, xp: 15, cost: 3, flying: true, knockRes: 0.2 },
  clockwork: { name: 'Clockwork Soldier', hp: 120, speed: 1.7, r: 0.4, h: 1.3, dmg: 18, xp: 20, cost: 4, knockRes: 0.6, armorPts: 0.2 },
  bogling: { name: 'Bogling', hp: 90, speed: 1.6, r: 0.45, h: 0.9, dmg: 15, xp: 17, cost: 3, knockRes: 0.4 },
  poltergeist: { name: 'Poltergeist', hp: 70, speed: 2.6, r: 0.36, h: 1.2, dmg: 15, xp: 17, cost: 3, flying: true, knockRes: 0.2 },
  ladygrey: { name: 'the Lady in Grey', title: 'Lady Honoria, the Lady in Grey', hp: 6200, speed: 1.9, r: 0.8, h: 2.4, dmg: 24, xp: 1000, cost: 99, boss: true, flying: true, knockRes: 1 },
};

export const MANOR_ZONE_FOES = {
  moor: ['wisp', 'bogling', 'wisp', 'crow', 'bogling'],
  prism: ['bogling', 'wisp', 'slinger', 'beetle', 'harpy'],
  clock: ['clockwork', 'clockwork', 'knight', 'stormcrow', 'harpy'],
  tundra: ['yeti', 'wisp', 'frostimp', 'clockwork', 'yeti'],
};

// ------------------------------------------------------------------ models
const mats = new Map();
function mat(r3d, c, e = null, ei = 1) {
  const k = c + '|' + e + '|' + ei;
  if (!mats.has(k)) mats.set(k, new THREE.MeshToonMaterial({ color: c, emissive: e || 0x000000, emissiveIntensity: e ? ei : 1, gradientMap: r3d.gradient }));
  return mats.get(k);
}
function own(g) { g.traverse((m) => { if (m.isMesh) m.material = m.material.clone(); }); return g; }
function box(g, w, h, d, m, x, y, z) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; g.add(b); return b; }
function cyl(g, rt, rb, h, m, x, y, z, n = 12) { const b = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, n), m); b.position.set(x, y, z); b.castShadow = true; g.add(b); return b; }
function ball(g, r, m, x, y, z, sx = 1, sy = 1, sz = 1) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), m); b.position.set(x, y, z); b.scale.set(sx, sy, sz); b.castShadow = true; g.add(b); return b; }
const grp = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
const see = (g, a) => { g.traverse((m) => { if (m.isMesh) { m.material.transparent = true; m.material.opacity = a; m.material.depthWrite = false; m.castShadow = false; } }); return g; };

export const MANOR_MODELS = {
  // a wisp: a blue-white flame with two dark eyes
  wisp(r3d) {
    const g = new THREE.Group(), body = grp(g, 0, 0.8, 0);
    const f = mat(r3d, '#c8e0ff', '#8ab0ff', 1.4), f2 = mat(r3d, '#ffffff', '#c8e0ff', 1.6);
    ball(body, 0.26, f, 0, 0, 0, 1, 1.3, 1);
    const tip = ball(body, 0.14, f2, 0, 0.3, 0, 1, 1.6, 1);
    for (const s of [-1, 1]) box(body, 0.06, 0.08, 0.02, mat(r3d, '#1a1a3a'), s * 0.08, 0.02, 0.24);
    g.userData = { body, tip };
    return own(g);
  },
  // a clockwork soldier: a brass drum of a body, a key in its back, a busby
  clockwork(r3d) {
    const g = new THREE.Group(), body = grp(g);
    const brass = mat(r3d, '#c8983e'), red = mat(r3d, '#b8303a'), dark = mat(r3d, '#2a2433'), eye = mat(r3d, '#e8d0ff', '#a86ae0', 1.4);
    const legs = [];
    for (const s of [-1, 1]) { const L = grp(body, s * 0.14, 0.45, 0); box(L, 0.14, 0.45, 0.16, dark, 0, -0.22, 0); legs.push(L); }
    cyl(body, 0.3, 0.32, 0.6, red, 0, 0.75, 0);
    for (const y of [0.5, 1.0]) cyl(body, 0.33, 0.33, 0.06, brass, 0, y, 0);
    const head = grp(body, 0, 1.2, 0);
    ball(head, 0.2, brass, 0, 0, 0);
    cyl(head, 0.2, 0.22, 0.4, dark, 0, 0.3, 0);
    for (const s of [-1, 1]) box(head, 0.06, 0.06, 0.02, eye, s * 0.07, 0, 0.2);
    const key = grp(body, 0, 0.8, -0.34);
    box(key, 0.05, 0.05, 0.25, brass, 0, 0, -0.1);
    for (const s of [-1, 1]) box(key, 0.2, 0.12, 0.03, brass, s * 0.1, 0, -0.24);
    const arms = [];
    for (const s of [-1, 1]) { const A = grp(body, s * 0.36, 0.95, 0); box(A, 0.12, 0.42, 0.12, red, 0, -0.2, 0); arms.push(A); }
    g.userData = { body, legs, head, key, arms };
    return own(g);
  },
  // a bogling: a heap of mud with a gloomy face and weeds on its head
  bogling(r3d) {
    const g = new THREE.Group(), body = grp(g);
    const mud = mat(r3d, '#5a4a3a'), mudL = mat(r3d, '#7a6a52'), weed = mat(r3d, '#4a7a3a'), eye = mat(r3d, '#e8d0ff', '#a86ae0', 1.4);
    ball(body, 0.45, mud, 0, 0.35, 0, 1, 0.8, 1);
    ball(body, 0.28, mudL, 0.1, 0.62, 0.05);
    for (const s of [-1, 1]) box(body, 0.08, 0.1, 0.03, eye, s * 0.13, 0.5, 0.38);
    for (let i = 0; i < 4; i++) { const w = box(body, 0.04, 0.3, 0.04, weed, -0.15 + i * 0.1, 0.85, 0); w.rotation.z = (i - 1.5) * 0.3; }
    g.userData = { body };
    return own(g);
  },
  // a poltergeist: a sheet with holes, drifting
  poltergeist(r3d) {
    const g = new THREE.Group(), body = grp(g, 0, 0.6, 0);
    const sheet = mat(r3d, '#e8eef8', '#8aa0c8', 0.4), dark = mat(r3d, '#1a1a2a');
    cyl(body, 0.12, 0.42, 0.9, sheet, 0, 0.2, 0, 10);
    ball(body, 0.3, sheet, 0, 0.7, 0);
    for (const s of [-1, 1]) box(body, 0.08, 0.1, 0.02, dark, s * 0.1, 0.72, 0.28);
    box(body, 0.1, 0.06, 0.02, dark, 0, 0.58, 0.29);
    see(g, 0.8);
    g.userData = { body };
    return g;
  },
  // the Lady in Grey: a tall grey lady in an old-fashioned gown, a lace cap, a teacup
  ladygrey(r3d) {
    const g = new THREE.Group(), body = grp(g);
    body.scale.setScalar(1.3);
    const gown = mat(r3d, '#9aa0b0', '#6a7a9a', 0.4), gownD = mat(r3d, '#7a8090'), gownL = mat(r3d, '#b8bccc', '#7a8aaa', 0.35), lace = mat(r3d, '#e8eef8', '#b8c8e8', 0.5), skin = mat(r3d, '#dce4f0', '#a8b8d8', 0.4), dark = mat(r3d, '#2a2a3a'), hair = mat(r3d, '#c8ccd8', '#8a90a8', 0.3), pearl = mat(r3d, '#f4f4ff', '#c8d0f0', 0.8);
    // a bell skirt in three tiers, each with a ruffle, and a bustle behind
    const skirt = cyl(body, 0.3, 1.0, 1.5, gown, 0, 0.75, 0, 16);
    for (const [y, r0] of [[0.18, 1.02], [0.62, 0.84], [1.05, 0.62]]) cyl(body, r0, r0 + 0.05, 0.1, lace, 0, y, 0, 18);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; box(body, 0.05, 1.3, 0.04, gownD, Math.cos(a) * 0.68, 0.72, Math.sin(a) * 0.68).lookAt(0, 0.72, 0); }
    ball(body, 0.34, gownL, 0, 1.3, -0.42).scale.set(1.3, 0.8, 0.9);
    // (the hem trails off into mist)
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3; ball(body, 0.16, lace, Math.cos(a) * 1.05, 0.06, Math.sin(a) * 1.05).scale.set(1.4, 0.5, 1.4); }
    const torso = grp(body, 0, 1.72, 0);
    box(torso, 0.5, 0.46, 0.34, gown, 0, 0, 0);
    box(torso, 0.52, 0.08, 0.38, gownL, 0, -0.2, 0);
    // a sash and its bow at the back, a high lace collar, a cameo, pearls
    const bow = grp(torso, 0, -0.18, -0.2);
    for (const sd of [-1, 1]) box(bow, 0.18, 0.12, 0.05, gownL, sd * 0.12, 0, 0).rotation.z = sd * 0.4;
    box(bow, 0.06, 0.34, 0.04, gownL, 0.05, -0.2, 0).rotation.z = 0.15;
    box(torso, 0.3, 0.16, 0.3, lace, 0, 0.3, 0);
    cyl(torso, 0.07, 0.07, 0.03, mat(r3d, '#d8b8e8', '#a878c8', 0.6), 0, 0.12, 0.18, 10).rotation.x = Math.PI / 2;
    for (let i = 0; i < 7; i++) { const a = -0.9 + (i / 6) * 1.8; ball(torso, 0.025, pearl, Math.sin(a) * 0.16, 0.18 - Math.cos(a) * 0.05, 0.17 + Math.cos(a) * 0.01); }
    const arms = [];
    for (const s of [-1, 1]) {
      const A = grp(torso, s * 0.32, 0.14, 0);
      ball(A, 0.13, gownL, 0, 0, 0);
      box(A, 0.11, 0.5, 0.12, lace, 0, -0.3, 0);
      box(A, 0.11, 0.08, 0.11, skin, 0, -0.58, 0);
      arms.push(A);
    }
    // (a teacup in her left hand, a saucer under it)
    const cup = grp(arms[0], 0, -0.64, 0.1);
    cyl(cup, 0.08, 0.06, 0.08, lace, 0, 0, 0, 8); cyl(cup, 0.12, 0.12, 0.02, lace, 0, -0.04, 0, 8);
    const head = grp(body, 0, 2.18, 0);
    box(head, 0.42, 0.42, 0.4, skin, 0, 0, 0);
    // an upswept silver chignon with a comb of pearls
    box(head, 0.46, 0.18, 0.44, hair, 0, 0.18, -0.02);
    box(head, 0.1, 0.3, 0.42, hair, -0.2, 0.02, -0.04); box(head, 0.1, 0.3, 0.42, hair, 0.2, 0.02, -0.04);
    ball(head, 0.17, hair, 0, 0.36, -0.08).scale.set(1.2, 0.9, 1);
    for (let i = 0; i < 5; i++) ball(head, 0.03, pearl, -0.12 + i * 0.06, 0.5, -0.02);
    for (const s of [-1, 1]) box(head, 0.07, 0.04, 0.02, dark, s * 0.1, 0.02, 0.205);
    box(head, 0.1, 0.03, 0.02, dark, 0, -0.1, 0.205);
    // a veil, pinned to the chignon, falling behind
    const veil = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.1), mat(r3d, '#e8eef8', '#b8c8e8', 0.4));
    veil.material = veil.material.clone(); veil.material.side = THREE.DoubleSide;
    veil.position.set(0, -0.1, -0.3); veil.rotation.x = 0.25; head.add(veil);
    see(g, 0.85);
    g.userData = { body, torso, arms, head, skirt, alpha: 0.85 };
    return g;
  },
};

// a cold spot: a frosty circle that slows
function coldSpot(C, x, z, r, life) {
  const m = new THREE.Mesh(C.geo.disc, new THREE.MeshBasicMaterial({ color: 0xc8e0ff, transparent: true, opacity: 0.35, depthWrite: false }));
  m.scale.setScalar(r); m.position.set(x, 0.04, z);
  C.root.add(m);
  C.fxMeshes.push({ m, t: life, life, fn: (q, k) => {
    m.material.opacity = 0.35 * Math.min(1, k * 3);
    if (Math.random() < 0.25) C.world.fx.emit('sparkle', x + rand(-r, r), 0.4, z + rand(-r, r), 1, { color: '#e8f4ff' });
    for (const p of C.alivePlayers()) if (Math.hypot(p.pos.x - x, p.pos.z - z) < r && p.actor.jumpY < 0.3) p.actor.zoneSlow = Math.min(p.actor.zoneSlow ?? 1, 0.55);
  } });
}

export const MANOR_BRAINS = {
  wisp: {
    init(e) { e.state = 'drift'; e.timer = rand(1.2, 2.2); e.y = 0.3; },
    think(e, dt, tgt, C) {
      tickLater(e, dt);
      e.y = 0.3 + Math.sin(e.t * 3) * 0.2;
      if (!tgt) return;
      e.timer -= dt;
      if (e.dart) { e.dart.t -= dt; C.moveEnemy(e, e.dart.dir.x * 9 * dt, e.dart.dir.z * 9 * dt, true, true); hurtIn(C, e, (p) => Math.hypot(p.pos.x - e.x, p.pos.z - e.z) < 0.8 && !e.dart.hit.has(p) && e.dart.hit.add(p), e.def.dmg, { knock: 3 }); if (e.dart.t <= 0) e.dart = null; return; }
      hover(e, C, tgt, speedOf(e, C), dt, 2.5, 5, true);
      if (e.timer <= 0) {
        const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, l = Math.hypot(dx, dz) || 1, dir = { x: dx / l, z: dz / l };
        e.timer = rand(2.2, 3.2); C.telegraphLine(e, dir, Math.min(7, l + 2), 0.7);
        later(e, 0.7, () => { e.dart = { dir, t: 0.55, hit: new Set() }; C.sfx('whoosh', e); });
      }
    },
    pose(e) { const u = e.obj.userData; u.body.scale.set(1 + Math.sin(e.t * 8) * 0.06, 1 - Math.sin(e.t * 8) * 0.06, 1); u.tip.position.x = Math.sin(e.t * 5) * 0.06; },
  },
  clockwork: {
    init(e) { e.state = 'march'; e.timer = rand(1.5, 2.5); },
    think(e, dt, tgt, C) {
      tickLater(e, dt);
      if (!tgt) return;
      e.timer -= dt;
      if (e.state === 'march') {
        const d = toward(e, C, tgt, speedOf(e, C), dt, 1.6);
        if (d < 2.4 && e.timer <= 0) {
          const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, l = Math.hypot(dx, dz) || 1, dir = { x: dx / l, z: dz / l };
          e.state = 'wind'; e.timer = 1.2; e.face = dir;
          cone(C, e.x, e.z, dir, 2.6, 1.6, 0.8, 0xff5a6a);
          later(e, 0.8, () => { hurtIn(C, e, (p) => { const px = p.pos.x - e.x, pz = p.pos.z - e.z, dd = Math.hypot(px, pz); return dd < 2.6 && (px * dir.x + pz * dir.z) / (dd || 1) > Math.cos(0.8); }, e.def.dmg, { knock: 4 }); C.sfx('slam', e); });
        }
      } else if (e.timer <= 0) { e.state = 'march'; e.timer = rand(1.4, 2.2); }
    },
    pose(e) { const u = e.obj.userData; e.obj.rotation.y = Math.atan2(e.face.x, e.face.z); u.key.rotation.z = e.t * (e.state === 'wind' ? 12 : 3); const w = Math.sin(e.t * 8); u.legs[0].rotation.x = w * 0.4; u.legs[1].rotation.x = -w * 0.4; u.arms[1].rotation.x = e.state === 'wind' ? -1.8 : w * 0.3; },
  },
  bogling: {
    init(e) { e.state = 'creep'; e.timer = rand(1.5, 2.5); },
    think(e, dt, tgt, C) {
      tickLater(e, dt);
      if (!tgt) return;
      e.timer -= dt;
      hover(e, C, tgt, speedOf(e, C), dt, 3, 5.5);
      if (e.timer <= 0) {
        e.timer = rand(2.2, 3);
        const x = tgt.pos.x + rand(-0.5, 0.5), z = tgt.pos.z + rand(-0.5, 0.5);
        lob(C, e, { x, z }, { r: 1.3, dmg: e.def.dmg, t: 1.1, look: 'bomb', knock: 2 });
        later(e, 1.1, () => coldSpot(C, x, z, 1.5, 4));
      }
    },
    pose(e) { const u = e.obj.userData; e.obj.rotation.y = Math.atan2(e.face.x, e.face.z); u.body.scale.set(1 + Math.sin(e.t * 4) * 0.05, 1 - Math.sin(e.t * 4) * 0.05, 1); },
  },
  poltergeist: {
    init(e) { e.state = 'drift'; e.timer = rand(1.4, 2.2); e.y = 0.3; },
    think(e, dt, tgt, C) {
      tickLater(e, dt);
      e.y = 0.3 + Math.sin(e.t * 2) * 0.2;
      if (!tgt) return;
      e.timer -= dt;
      hover(e, C, tgt, speedOf(e, C), dt, 3, 6, true);
      if (e.timer <= 0) { e.timer = rand(2, 2.8); lob(C, e, { x: tgt.pos.x + rand(-0.4, 0.4), z: tgt.pos.z + rand(-0.4, 0.4) }, { r: 1.1, dmg: e.def.dmg, t: 1.0, look: 'bomb', knock: 2 }); C.sfx('whoosh', e); }
    },
    pose(e) { const u = e.obj.userData; e.obj.rotation.y = Math.atan2(e.face.x, e.face.z); u.body.rotation.z = Math.sin(e.t * 2) * 0.12; },
  },

  // ---- the Lady in Grey
  ladygrey: {
    init(e) { e.state = 'drift'; e.timer = 2.4; e.phase = 1; e.y = 0.3; e.last = null; e.thenT = 9; },
    think(e, dt, tgt, C) {
      tickLater(e, dt);
      leash(e, C);
      // (THEN: a memory, dancing — nothing touches her; NOW: a ghost)
      const then = e.era && e.era() === 'then';
      if (then && !e.immune) { e.immune = 'A memory — you can’t touch a memory. Turn the clock to NOW!'; e.hintText = 'THEN: she’s only a memory. Turn a clock to NOW!'; }
      else if (!then && e.immune) { e.immune = null; e.hintText = null; }
      e.y = 0.3 + Math.sin(e.t * 1.5) * 0.12;
      if (then) {
        // (a slow waltz round the room’s middle)
        const H = e.home || { x: e.x, z: e.z }, a = e.t * 0.6;
        const tx = H.x + Math.cos(a) * 4, tz = H.z + Math.sin(a) * 2.5, dx = tx - e.x, dz = tz - e.z, l = Math.hypot(dx, dz) || 1;
        C.moveEnemy(e, (dx / l) * Math.min(l, dt * 2.5), (dz / l) * Math.min(l, dt * 2.5), true, true);
        e.dance = (e.dance || 0) + dt;
        return;
      }
      if (e.state !== 'roar' && checkPhase(e, C, (ph) => { C.bubble(e, ph === 2 ? t('Is that you, Gloria? …No. No, it isn’t.') : t('Why won’t anyone let me WAIT?'), 2.2); if (e.onPhase) e.onPhase(e, ph); })) return;
      if (e.state === 'roar') { e.timer -= dt; if (e.timer <= 0) { e.state = 'drift'; e.timer = 1; } return; }
      if (!tgt) return;
      e.timer -= dt;
      // (from phase 2, now and then she pulls the room back to the old days)
      if (e.phase >= 2) { e.thenT -= dt; if (e.thenT <= 0) { e.thenT = e.phase >= 3 ? 8 : 10; if (e.onThen) e.onThen(e); C.bubble(e, pick([t('Back… to the good days.'), t('The music! Do you hear the music?')]), 1.8); return; } }
      if (e.state === 'drift') {
        hover(e, C, tgt, speedOf(e, C), dt, 3, 6, true);
        if (e.timer > 0) return;
        const opts = ['tea', 'pendulum', 'cold'];
        if (e.phase >= 3) opts.push('dancers');
        let a = pick(opts);
        if (a === e.last) a = pick(opts.filter((o) => o !== a));
        e.last = a;
        this[a](e, C, tgt);
      } else if (e.state === 'busy' && e.timer <= 0) { e.state = 'drift'; e.timer = rand(1.2, 1.9) / (e.phase >= 3 ? 1.2 : 1); }
    },
    // the tea service, thrown: marked landings round everyone
    tea(e, C) {
      e.state = 'busy'; e.timer = 1.7; e.anim = 'throw'; e.animT = 0;
      C.bubble(e, pick([t('Tea? It’s still warm.'), t('One lump or two?')]), 1.4);
      for (const p of C.alivePlayers()) for (let k = 0; k < (e.phase >= 2 ? 3 : 2); k++) {
        const x = p.pos.x + rand(-1.6, 1.6), z = p.pos.z + rand(-1.3, 1.3);
        later(e, 0.1 + k * 0.2, () => C.zone({ x, z, r: 1.0, delay: 1.0, dmg: e.def.dmg * 0.7 * (C.enemyDmg || 1), knock: 2, kind: 'bomb', gloom: true, arc: { x: e.x, y: 4, z: e.z }, look: 'bomb' }));
      }
      C.sfx('whoosh', e);
    },
    // the pendulum: a great marked arc in front of her
    pendulum(e, C, tgt) {
      const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, l = Math.hypot(dx, dz) || 1, dir = { x: dx / l, z: dz / l };
      e.face = dir; e.state = 'busy'; e.timer = 1.5; e.anim = 'sweep'; e.animT = 0;
      cone(C, e.x, e.z, dir, 6, 1.8, 1.0, 0xb8c8e8);
      later(e, 1.0, () => { hurtIn(C, e, (p) => { const px = p.pos.x - e.x, pz = p.pos.z - e.z, d = Math.hypot(px, pz); return d < 6 && (px * dir.x + pz * dir.z) / (d || 1) > Math.cos(0.9); }, e.def.dmg, { knock: 6 }); C.sfx('bell', e); C.shakeAt(e, 0.35); });
      C.bubble(e, t('Tick… tock.'), 1);
    },
    // cold spots on marked circles
    cold(e, C) {
      e.state = 'busy'; e.timer = 1.4; e.anim = 'sigh'; e.animT = 0;
      for (const p of C.alivePlayers().slice(0, 5)) {
        const x = p.pos.x + rand(-0.5, 0.5), z = p.pos.z + rand(-0.4, 0.4);
        C.telegraphCircle(x, z, 1.8, 0.9);
        later(e, 0.9, () => { hurtIn(C, e, (q) => Math.hypot(q.pos.x - x, q.pos.z - z) < 1.8, e.def.dmg * 0.6, { knock: 1 }); coldSpot(C, x, z, 1.8, 5); });
      }
      C.bubble(e, t('So cold, waiting.'), 1.2);
    },
    // (phase 3) ghost dancers waltz round the floor in rings
    dancers(e, C) {
      e.state = 'busy'; e.timer = 2.2; e.anim = 'sigh'; e.animT = 0;
      const H = e.home || { x: e.x, z: e.z };
      for (let k = 0; k < 2; k++) {
        const r0 = 3 + k * 3.5;
        flat(C, new THREE.RingGeometry(r0 - 0.5, r0 + 0.5, 48).rotateX(-Math.PI / 2), H.x, H.z, 0xb8c8e8, 1.2);
        later(e, 1.2 + k * 0.4, () => { hurtIn(C, e, (p) => { const d = Math.hypot(p.pos.x - H.x, p.pos.z - H.z); return Math.abs(d - r0) < 0.6 && p.actor.jumpY < 0.4; }, e.def.dmg * 0.8, { knock: 3 }); C.vfx.shockwave(H.x, H.z, { r: r0, color: '#c8d8f0', life: 0.6, wall: 0.8 }); });
      }
      C.bubble(e, t('Dance with me, darlings!'), 1.4);
    },
    pose(e, dt) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      e.animT = (e.animT || 0) + dt;
      const then = e.era && e.era() === 'then';
      // (THEN: warm and whole, waltzing; NOW: pale and see-through)
      const a = then ? 0.95 : 0.6 + Math.sin(e.t * 3) * 0.08;
      if (Math.abs((u.alpha || 0) - a) > 0.02) { u.alpha = a; e.obj.traverse((m) => { if (m.isMesh) m.material.opacity = a; }); }
      u.body.rotation.y = then ? (e.dance || 0) * 3 : 0;
      u.skirt.scale.set(1 + Math.sin(e.t * 3) * 0.03, 1, 1 + Math.cos(e.t * 3) * 0.03);
      u.arms[1].rotation.z = e.anim === 'sweep' && e.state === 'busy' ? -1.6 + Math.min(1, e.animT) * 2.2 : then ? -1.2 : -0.2;
      u.arms[0].rotation.x = e.anim === 'throw' && e.state === 'busy' ? -1.6 : -0.6;
      u.head.rotation.x = e.anim === 'sigh' && e.state === 'busy' ? 0.3 : 0;
    },
  },
};
