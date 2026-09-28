// World v7, chapter 7: the gloom of the Dawnlands, as foes.
//   murkmoth       a grey-violet moth that flutters at lanterns (in Lanternport’s dark
//                  it nibbles your light — see saga/games7.js); a nip, then off again.
//   inkimp         a blot of gloom ink with a brush: splats ink on marked spots, and
//                  the puddles it leaves slow you down.
//   paperlantern   a paper lantern gone sour: drifts, then spits three sparks down
//                  marked lines.
//   paperbat       folded-paper bats, quick and fragile (the Paper Dragon sheds them).
//   mimeminnow · mimefidget · mimebrick   the Mime Troupe (chapter 7’s mini-boss): the
//                  Understudies in white faces. Fidget mimes walls (a marked line: then
//                  nobody crosses it for a while) and boxes (a marked square round you:
//                  stay in it and you’re boxed in — a friend pops it, or hop out);
//                  Minnow mimes a rope (a marked line: jump, or be reeled in) and can’t
//                  stop talking; Brick mimes a piano (a marked circle: then it lands).
//   paperdragon    Old Lucky, the monks’ festival dragon, brought to life by the gloom
//                  (the Lantern Pagoda’s boss): a long paper body that follows its head;
//                  up in the air nothing reaches it; it dives down a marked line, lands on
//                  a perch — and there the Dawn Mirror’s beam can catch it: it burns
//                  (×2, stunned). Phase 2 sheds paper bats, phase 3 dives twice.
// Every blow is shown before it lands.

import { THREE } from '../../render/r3d.js';
import { toward, hover, speedOf, lob } from '../v3/ai.js';
import { flat, cone, later, tickLater, hurtIn, checkPhase, leash } from '../v3/bosses.js';
import { understudy } from './troupe.js';
import { t } from '../../i18n.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export const DAWN_ENEMIES = {
  murkmoth: { name: 'Murk Moth', hp: 30, speed: 3.3, r: 0.3, h: 0.8, dmg: 6, xp: 8, cost: 1, flying: true, knockRes: 0 },
  inkimp: { name: 'Ink Imp', hp: 62, speed: 2.7, r: 0.34, h: 0.8, dmg: 13, xp: 14, cost: 3, knockRes: 0.2 },
  paperlantern: { name: 'Sour Lantern', hp: 50, speed: 2.1, r: 0.36, h: 1.1, dmg: 12, xp: 14, cost: 3, flying: true, elem: 'fire', knockRes: 0.2 },
  paperbat: { name: 'Paper Bat', hp: 22, speed: 4.0, r: 0.28, h: 0.8, dmg: 7, xp: 5, cost: 1, flying: true, knockRes: 0 },
  mimeminnow: { name: 'Minnow', hp: 300, speed: 2.9, r: 0.34, h: 1.25, dmg: 14, xp: 110, cost: 8, knockRes: 0.6, troupe: true },
  mimefidget: { name: 'Fidget', hp: 280, speed: 3.1, r: 0.34, h: 1.5, dmg: 13, xp: 110, cost: 8, knockRes: 0.6, troupe: true },
  mimebrick: { name: 'Brick', hp: 460, speed: 2.3, r: 0.55, h: 2.0, dmg: 18, xp: 130, cost: 10, knockRes: 0.9, troupe: true },
  paperdragon: { name: 'Old Lucky', title: 'Old Lucky, the Paper Dragon', hp: 4800, speed: 3.4, r: 1.0, h: 1.6, dmg: 21, xp: 820, cost: 99, boss: true, flying: true, knockRes: 1 },
};

// which gloom lives in the Dawnlands (the Explore camps pick from these)
export const DAWN_ZONE_FOES = {
  whale: ['murkmoth', 'reefcrab', 'jelly', 'murkmoth'],
  harbor: ['murkmoth', 'inkimp', 'ghost', 'crow', 'murkmoth'],
  jade: ['inkimp', 'paperlantern', 'harpy', 'paperbat', 'kite'],
  salt: ['burrower', 'murkmoth', 'slinger', 'beetle', 'paperlantern'],
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
function cyl(g, rt, rb, h, m, x, y, z, n = 10) { const b = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, n), m); b.position.set(x, y, z); b.castShadow = true; g.add(b); return b; }
function ball(g, r, m, x, y, z, sx = 1, sy = 1, sz = 1) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), m); b.position.set(x, y, z); b.scale.set(sx, sy, sz); b.castShadow = true; g.add(b); return b; }
const grp = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
const GLOOM = '#a86ae0';

// the Understudies as mimes: white faces, black stripes, a beret each
function mime(r3d, o) {
  const g = understudy(r3d, { ...o, top: mat(r3d, '#1e1a24'), hat: 'beret' });
  const u = g.userData, white = mat(r3d, '#f8f4f0');
  u.head.children[0].material = white.clone();
  // (painted tears, rouge, a red mouth)
  for (const s of [-1, 1]) box(u.head, 0.03, 0.08, 0.02, mat(r3d, '#241a2e'), s * 0.11, -0.07, 0.236);
  box(u.head, 0.1, 0.05, 0.02, mat(r3d, '#e0405a'), 0, -0.13, 0.237);
  for (const A of u.arms) box(A, 0.15, 0.1, 0.15, white, 0, -0.42, 0);
  return g;
}

export const DAWN_MODELS = {
  // a moth: a fuzzy body, four dusty wings, feathery antennae, eyes that glow
  murkmoth(r3d) {
    const g = new THREE.Group(), body = grp(g, 0, 0.7, 0);
    const fur = mat(r3d, '#6a5a7a'), wing = mat(r3d, '#8a7a9a'), wingD = mat(r3d, '#5a4a6a'), eye = mat(r3d, '#fff0a0', '#ffd66b', 1.4);
    ball(body, 0.16, fur, 0, 0, 0, 1, 0.9, 1.4);
    ball(body, 0.12, fur, 0, 0.04, 0.2);
    for (const s of [-1, 1]) box(body, 0.06, 0.06, 0.03, eye, s * 0.06, 0.07, 0.3);
    for (const s of [-1, 1]) { const a = box(body, 0.02, 0.22, 0.02, wingD, s * 0.05, 0.2, 0.26); a.rotation.z = -s * 0.5; a.rotation.x = 0.4; }
    const wings = [];
    for (const s of [-1, 1]) for (const f of [0, 1]) {
      const W = grp(body, s * 0.08, 0.04, f ? -0.12 : 0.06);
      const w = box(W, 0.5, 0.03, f ? 0.26 : 0.34, f ? wingD : wing, s * 0.25, 0, 0);
      box(W, 0.08, 0.035, 0.08, mat(r3d, '#c8b8e0'), s * 0.3, 0.005, 0);
      void w; wings.push({ W, s });
    }
    g.userData = { body, wings };
    return own(g);
  },
  // a blot of ink with a brush for a tail and two white eyes
  inkimp(r3d) {
    const g = new THREE.Group(), body = grp(g);
    const ink = mat(r3d, '#1e1a30'), inkL = mat(r3d, '#3a3458'), white = mat(r3d, '#f4f0ff'), wood = mat(r3d, '#8a5a3a');
    ball(body, 0.36, ink, 0, 0.36, 0, 1, 0.9, 1);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; ball(body, 0.1, inkL, Math.cos(a) * 0.3, 0.08, Math.sin(a) * 0.3, 1, 0.5, 1); }
    for (const s of [-1, 1]) { ball(body, 0.08, white, s * 0.13, 0.48, 0.3); box(body, 0.04, 0.05, 0.02, ink, s * 0.13, 0.48, 0.38); }
    const brush = grp(body, 0.32, 0.5, 0);
    box(brush, 0.05, 0.6, 0.05, wood, 0, 0.1, 0);
    box(brush, 0.1, 0.16, 0.1, ink, 0, -0.26, 0);
    brush.rotation.z = -0.6;
    g.userData = { body, brush };
    return own(g);
  },
  // a paper lantern gone sour: a scowl on the paper, a flame inside, tassels
  paperlantern(r3d) {
    const g = new THREE.Group(), body = grp(g, 0, 1.0, 0);
    const paper = mat(r3d, '#8a4a9a', '#6a2a8a', 0.5), cap = mat(r3d, '#2a1a24'), glow = mat(r3d, '#ffd08a', '#ff9a4a', 1.4);
    ball(body, 0.34, paper, 0, 0, 0, 1, 1.2, 1);
    for (const y of [-0.4, 0.4]) cyl(body, 0.16, 0.16, 0.08, cap, 0, y, 0, 8);
    for (const s of [-1, 1]) { const b = box(body, 0.12, 0.03, 0.02, cap, s * 0.1, 0.1, 0.33); b.rotation.z = s * 0.4; box(body, 0.06, 0.06, 0.02, glow, s * 0.1, 0.02, 0.34); }
    box(body, 0.16, 0.04, 0.02, glow, 0, -0.12, 0.34);
    const tass = [];
    for (const x of [-0.08, 0.08]) { const T = grp(body, x, -0.45, 0); box(T, 0.03, 0.26, 0.03, mat(r3d, '#e0405a'), 0, -0.13, 0); tass.push(T); }
    g.userData = { body, tass };
    return own(g);
  },
  // a folded-paper bat
  paperbat(r3d) {
    const g = new THREE.Group(), body = grp(g, 0, 0.8, 0);
    const red = mat(r3d, '#c8383e'), cream = mat(r3d, '#f4ecd8'), eye = mat(r3d, '#fff0a0', GLOOM, 1.2);
    const core = box(body, 0.18, 0.16, 0.24, red, 0, 0, 0); core.rotation.x = 0.3;
    for (const s of [-1, 1]) box(body, 0.05, 0.04, 0.02, eye, s * 0.05, 0.04, 0.13);
    const wings = [];
    for (const s of [-1, 1]) { const W = grp(body, s * 0.08, 0, 0); const w = box(W, 0.36, 0.02, 0.22, s < 0 ? cream : red, s * 0.18, 0, 0); w.rotation.y = s * 0.3; wings.push({ W, s }); }
    g.userData = { body, wings };
    return own(g);
  },
  mimeminnow(r3d) { return mime(r3d, { scale: 0.85, hair: mat(r3d, '#e889b8') }); },
  mimefidget(r3d) { return mime(r3d, { scale: 1.02, hair: mat(r3d, '#7ecfae'), glasses: true }); },
  mimebrick(r3d) { return mime(r3d, { scale: 1.4, hair: mat(r3d, '#2a2433'), mustache: true }); },
  // Old Lucky: a festival dragon of red paper and gold — a big head (horns, whiskers,
  // a jaw that snaps), a long body of paper drums trailing after it, a tail tuft
  paperdragon(r3d) {
    const g = new THREE.Group();
    const red = mat(r3d, '#c8302a'), redD = mat(r3d, '#8a2020'), gold = mat(r3d, '#f2c14e', '#c89020', 0.35), cream = mat(r3d, '#f4ecd8'), ink = mat(r3d, '#241a2e');
    const gloom = mat(r3d, '#6a4a8a', GLOOM, 0.6);
    const head = grp(g, 0, 0, 0);
    const skull = grp(head, 0, 0.2, 0);
    box(skull, 1.0, 0.7, 1.1, red, 0, 0, 0);
    box(skull, 1.04, 0.14, 1.14, gold, 0, 0.3, 0);
    box(skull, 0.8, 0.3, 0.5, red, 0, -0.1, 0.72);
    for (const s of [-1, 1]) {
      ball(skull, 0.2, cream, s * 0.3, 0.2, 0.52); ball(skull, 0.1, ink, s * 0.3, 0.22, 0.66);
      const horn = box(skull, 0.1, 0.6, 0.1, gold, s * 0.32, 0.55, -0.3); horn.rotation.set(-0.6, 0, s * 0.3);
      const wh = box(skull, 0.04, 0.04, 0.9, gold, s * 0.36, -0.2, 1.2); wh.rotation.y = s * 0.4;
      box(skull, 0.3, 0.3, 0.06, cream, s * 0.52, 0.05, 0.05);
    }
    // (the gloom ink over its brow: gone when it’s saved)
    const brow = box(skull, 1.06, 0.2, 0.3, gloom, 0, 0.38, 0.45);
    const jaw = grp(head, 0, -0.1, 0.4);
    box(jaw, 0.76, 0.14, 0.7, redD, 0, -0.07, 0.3);
    for (let i = 0; i < 4; i++) box(jaw, 0.08, 0.12, 0.08, cream, -0.24 + i * 0.16, 0.06, 0.6);
    // the fringe
    for (let i = 0; i < 7; i++) { const f = box(head, 0.12, 0.34, 0.1, i % 2 ? gold : cream, -0.45 + i * 0.15, 0.1, -0.56); f.rotation.x = 0.4; }
    // the body: paper drums with gold hoops and a spine of little flags
    const segs = [];
    for (let k = 0; k < 10; k++) {
      const s = grp(g, 0, 0, -(k + 1) * 0.75);
      const sc = 1 - k * 0.045;
      cyl(s, 0.42 * sc, 0.42 * sc, 0.62, k % 2 ? red : redD, 0, 0, 0, 10).rotation.x = Math.PI / 2;
      for (const z of [-0.28, 0.28]) cyl(s, 0.45 * sc, 0.45 * sc, 0.06, gold, 0, 0, z, 10).rotation.x = Math.PI / 2;
      box(s, 0.08, 0.26 * sc, 0.2, k % 2 ? gold : cream, 0, 0.5 * sc, 0);
      if (k === 9) for (let i = 0; i < 5; i++) { const f = box(s, 0.1, 0.1, 0.5, i % 2 ? gold : red, (i - 2) * 0.1, 0, -0.5); f.rotation.y = (i - 2) * 0.25; }
      segs.push(s);
    }
    const fire = grp(g, 0, 0, 0);
    fire.visible = false;
    for (let i = 0; i < 6; i++) ball(fire, 0.24, mat(r3d, '#ffb040', '#ff6a1a', 1.6), rand(-0.4, 0.4), rand(0.3, 0.9), rand(-0.4, 0.4));
    g.scale.setScalar(1.3);
    g.userData = { head, skull, jaw, segs, brow, fire, sc: 1.3 };
    return own(g);
  },
};

// ------------------------------------------------------------------ the mimes’ invisible things
// (an invisible wall: a faint shimmer; nobody crosses it until it fades)
function mimeWall(C, x, z, dir, len, life) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(len, 1.8, 0.12), new THREE.MeshBasicMaterial({ color: 0xf4f0ff, transparent: true, opacity: 0.08, depthWrite: false }));
  m.position.set(x, 0.9, z); m.rotation.y = Math.atan2(dir.x, dir.z);
  C.root.add(m);
  const ax = Math.cos(m.rotation.y), az = -Math.sin(m.rotation.y);        // along the wall
  const nx = dir.x, nz = dir.z;                                         // across it
  C.fxMeshes.push({ m, t: life, life, fn: (q, k) => {
    m.material.opacity = 0.06 + Math.sin(q.t * 6) * 0.03 + (q.bump || 0) * 0.35;
    q.bump = Math.max(0, (q.bump || 0) - 0.05);
    for (const p of C.alivePlayers()) {
      const rx = p.pos.x - x, rz = p.pos.z - z, u = rx * ax + rz * az, v = rx * nx + rz * nz;
      if (Math.abs(u) > len / 2 + 0.2 || Math.abs(v) > 0.45) continue;
      // (pushed back to the side they came from)
      const side = Math.sign(v) || 1, push = 0.45 - Math.abs(v);
      p.actor.pos.x += nx * side * push; p.actor.pos.z += nz * side * push;
      if (!q.bump || q.bump < 0.2) { q.bump = 1; C.world.fx.emit('sparkle', p.pos.x, 1, p.pos.z, 3, { color: '#ffffff' }); }
    }
    void k;
  } });
}
// (a box round someone: they’re stuck until a friend pops it, or they hop out)
function mimeBox(C, p, life) {
  const S = 1.2, m = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(S, 1.8, S)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }));
  const x = p.pos.x, z = p.pos.z;
  m.position.set(x, 0.9, z);
  C.root.add(m);
  p.mimeBoxed = { x, z, hops: 0, air: false };
  C.popText(x, 2.4, z, t('Boxed in!'), '#ffffff');
  C.fxMeshes.push({ m, t: life, life, fn: (q) => {
    const B = p.mimeBoxed;
    if (!B || !p.fighter || p.fighter.down) { q.t = 0; p.mimeBoxed = null; return; }
    p.actor.pos.x = Math.max(x - 0.3, Math.min(x + 0.3, p.actor.pos.x)); p.actor.pos.z = Math.max(z - 0.3, Math.min(z + 0.3, p.actor.pos.z));
    const air = !!p.actor.airborne;
    if (air && !B.air) B.hops++;
    B.air = air;
    m.material.opacity = 0.35 + Math.sin(q.t * 8) * 0.15;
    const friend = C.alivePlayers().find((o) => o !== p && Math.hypot(o.pos.x - x, o.pos.z - z) < 1.4);
    if (friend || B.hops >= 3) {
      q.t = 0; p.mimeBoxed = null;
      C.world.fx.emit('sparkle', x, 1, z, 14, { color: '#ffffff' }); C.sfx('poof');
      C.popText(x, 2.2, z, friend ? t('{name} pops the box!', { name: friend.name }) : t('Hopped out!'), '#fff7e6');
    }
    if (q.t <= 0.02) p.mimeBoxed = null;
  } });
}

// ------------------------------------------------------------------ brains
function flap(e, dt, speed = 22) {
  const u = e.obj.userData;
  if (u.wings) for (const { W, s } of u.wings) W.rotation.z = s * Math.sin(e.t * speed) * 0.7;
  void dt;
}
// the Understudies’ band, whatever the act: when one goes down the others get cross
function crossTroupe(e, C) {
  const band = C.enemies.filter((q) => q.miniGroup && q.miniGroup === e.miniGroup);
  const down = band.filter((q) => !q.alive).length;
  e.cross = down;
  return 1 + down * 0.25;
}

export const DAWN_BRAINS = {
  murkmoth: {
    init(e) { e.state = 'flutter'; e.timer = rand(0.5, 1.2); e.y = 0.2; e.bob = rand(0, 6); },
    think(e, dt, tgt, C) {
      e.y = 0.25 + Math.sin(e.t * 5 + e.bob) * 0.18;
      if (!tgt) return;
      e.timer -= dt;
      // (the lit lamps of a relit town scare it off)
      const R = e.lamps, safe = R && R.lamps.some((L) => L.lit && Math.hypot(L.x - e.x, L.z - e.z) < (R.st.glow || 3.8) + 0.5);
      if (e.state === 'flee' || safe) {
        const dx = e.x - tgt.pos.x, dz = e.z - tgt.pos.z, d = Math.hypot(dx, dz) || 1;
        C.moveEnemy(e, (dx / d) * speedOf(e, C) * dt, (dz / d) * speedOf(e, C) * dt, true, true);
        if (e.state === 'flee' && e.timer <= 0) { e.state = 'flutter'; e.timer = rand(0.8, 1.4); }
        if (safe && R && Math.random() < dt * 0.6) { e.alive = false; e.fading = 0.5; }
        return;
      }
      const d = toward(e, C, tgt, speedOf(e, C) * (0.8 + Math.sin(e.t * 3) * 0.3), dt, 0.5);
      if (d < 0.8 && e.timer <= 0) {
        e.state = 'flee'; e.timer = rand(1, 1.6);
        if (R) { const s = R.light.get(tgt); if (s) { s.v = Math.max(0, s.v - (R.st.nibble || 1.6)); C.popText(tgt.pos.x, 2.1, tgt.pos.z, t('Nibbled!'), '#c9a2f0'); } }
        else C.hurtPlayer(tgt, e.def.dmg * (C.enemyDmg || 1), { knock: 1, src: e });
      }
    },
    pose(e, dt) { flap(e, dt, 26); e.obj.rotation.y = Math.atan2(e.face.x, e.face.z); },
  },
  inkimp: {
    init(e) { e.state = 'chase'; e.timer = rand(1, 2); },
    think(e, dt, tgt, C) {
      tickLater(e, dt);
      if (!tgt) return;
      e.timer -= dt;
      if (e.state === 'chase') {
        hover(e, C, tgt, speedOf(e, C), dt, 2.8, 5);
        if (e.timer <= 0) {
          e.state = 'splat'; e.timer = 1.1;
          const x = tgt.pos.x + rand(-0.6, 0.6), z = tgt.pos.z + rand(-0.6, 0.6);
          lob(C, e, { x, z }, { r: 1.2, dmg: e.def.dmg, t: 1.0, look: 'bomb', knock: 2 });
          later(e, 1.0, () => inkPuddle(C, x, z, 1.4, 5));
        }
      } else if (e.timer <= 0) { e.state = 'chase'; e.timer = rand(1.8, 2.8); }
    },
    pose(e) { const u = e.obj.userData; e.obj.rotation.y = Math.atan2(e.face.x, e.face.z); u.body.scale.set(1 + Math.sin(e.t * 8) * 0.05, 1 - Math.sin(e.t * 8) * 0.05, 1); u.brush.rotation.z = e.state === 'splat' ? -1.6 + Math.min(1, e.timer) * 1 : -0.6 + Math.sin(e.t * 4) * 0.2; },
  },
  paperlantern: {
    init(e) { e.state = 'drift'; e.timer = rand(1.5, 2.5); e.y = 0.3; },
    think(e, dt, tgt, C) {
      tickLater(e, dt);
      e.y = 0.3 + Math.sin(e.t * 2) * 0.2;
      if (!tgt) return;
      e.timer -= dt;
      if (e.state === 'drift') {
        hover(e, C, tgt, speedOf(e, C), dt, 3.5, 6, true);
        if (e.timer <= 0) {
          e.state = 'spit'; e.timer = 1.3;
          const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, a0 = Math.atan2(dz, dx);
          for (const da of [-0.35, 0, 0.35]) {
            const dir = { x: Math.cos(a0 + da), z: Math.sin(a0 + da) };
            C.telegraphLine(e, dir, 7, 0.8);
            later(e, 0.8, () => hurtIn(C, e, (p) => { const px = p.pos.x - e.x, pz = p.pos.z - e.z, along = px * dir.x + pz * dir.z; return along > 0 && along < 7 && Math.abs(px * dir.z - pz * dir.x) < 0.5; }, e.def.dmg, { knock: 2, elem: 'fire' }));
          }
          later(e, 0.8, () => { C.sfx('crackle', e); for (let k = 0; k < 6; k++) C.world.fx.emit('firework', e.x, 1, e.z, 1, { color: '#ffb040' }); });
        }
      } else if (e.timer <= 0) { e.state = 'drift'; e.timer = rand(2, 3); }
    },
    pose(e) { const u = e.obj.userData; u.body.rotation.z = Math.sin(e.t * 1.5) * 0.1; for (const T of u.tass) T.rotation.z = Math.sin(e.t * 4) * 0.3; },
  },
  paperbat: {
    init(e) { e.state = 'swoop'; e.timer = rand(0.4, 1); e.y = 0.3; e.bob = rand(0, 6); },
    think(e, dt, tgt, C) {
      e.y = 0.3 + Math.sin(e.t * 6 + e.bob) * 0.25;
      if (!tgt) return;
      e.timer -= dt;
      const d = toward(e, C, tgt, speedOf(e, C), dt, 0.4);
      if (d < 0.7 && e.timer <= 0) { e.timer = 1.2; C.hurtPlayer(tgt, e.def.dmg * (C.enemyDmg || 1), { knock: 1.5, src: e }); }
    },
    pose(e, dt) { flap(e, dt, 30); e.obj.rotation.y = Math.atan2(e.face.x, e.face.z); },
  },

  // ---- the Mime Troupe
  mimeminnow: troupeBrain({
    act: ['rope', 'rope', 'jab'],
    // (Minnow can’t help it)
    chatter: ['A ROPE! It’s an invisible ro— mmph!', 'I’m being SILENT. Loudly.', '(Minnow mimes shouting.) …HEY!'],
    rope(e, C, tgt) {
      e.state = 'busy'; e.timer = 1.8; e.anim = 'rope'; e.animT = 0;
      const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, L = Math.hypot(dx, dz) || 1, dir = { x: dx / L, z: dz / L };
      C.telegraphLine(e, dir, Math.min(9, L + 1), 0.9);
      if (Math.random() < 0.5) C.bubble(e, t(pick(this.chatter)), 1.4);
      later(e, 0.9, () => {
        // (the hooked one is reeled in — unless they’re in the air)
        for (const p of C.alivePlayers()) {
          const px = p.pos.x - e.x, pz = p.pos.z - e.z, along = px * dir.x + pz * dir.z;
          if (along < 0 || along > 9 || Math.abs(px * dir.z - pz * dir.x) > 0.6 || p.actor.airborne) continue;
          const k = Math.min(along - 1, 3.5);
          if (k > 0) C.world.fx.emit('dust', p.pos.x, 0.3, p.pos.z, 6);
          p.actor.pos.x -= dir.x * k; p.actor.pos.z -= dir.z * k;
          C.hurtPlayer(p, e.def.dmg * 0.6 * (C.enemyDmg || 1), { knock: 0, src: e });
          C.popText(p.pos.x, 2.2, p.pos.z, t('Reeled in!'), '#fff7e6');
        }
        C.sfx('whoosh', e);
      });
    },
    jab(e, C, tgt) {
      e.state = 'busy'; e.timer = 1.1; e.anim = 'jab'; e.animT = 0;
      C.telegraphCircle(tgt.pos.x, tgt.pos.z, 1.2, 0.7);
      const x = tgt.pos.x, z = tgt.pos.z;
      later(e, 0.7, () => { hurtIn(C, e, (p) => Math.hypot(p.pos.x - x, p.pos.z - z) < 1.2, e.def.dmg, { knock: 3 }); C.sfx('bonk', e); });
    },
  }),
  mimefidget: troupeBrain({
    act: ['wall', 'wall', 'box'],
    chatter: ['(Fidget mimes a wall.)', '(Fidget glares at Minnow.)', 'Minnow. MIMES.'],
    wall(e, C, tgt) {
      e.state = 'busy'; e.timer = 1.4; e.anim = 'wall'; e.animT = 0;
      // (a wall across the way between them and someone: 5 long)
      const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, L = Math.hypot(dx, dz) || 1, dir = { x: dx / L, z: dz / L };
      const x = e.x + dir.x * Math.min(L * 0.5, 3), z = e.z + dir.z * Math.min(L * 0.5, 3);
      const geo = new THREE.PlaneGeometry(5, 0.6).rotateX(-Math.PI / 2);
      flat(C, geo, x, z, 0xf4f0ff, 0.9, Math.atan2(dir.x, dir.z));
      if (Math.random() < 0.4) C.bubble(e, t(pick(this.chatter)), 1.4);
      later(e, 0.9, () => { mimeWall(C, x, z, dir, 5, e.phase >= 2 ? 8 : 6); C.sfx('flick', e); });
    },
    box(e, C, tgt) {
      e.state = 'busy'; e.timer = 1.5; e.anim = 'box'; e.animT = 0;
      const x = tgt.pos.x, z = tgt.pos.z, geo = new THREE.PlaneGeometry(1.4, 1.4).rotateX(-Math.PI / 2);
      flat(C, new THREE.EdgesGeometry(geo), x, z, 0xffffff, 1.0);
      flat(C, geo, x, z, 0xf4f0ff, 1.0);
      later(e, 1.0, () => { const p = C.alivePlayers().find((q) => Math.abs(q.pos.x - x) < 0.7 && Math.abs(q.pos.z - z) < 0.7 && !q.mimeBoxed); if (p) mimeBox(C, p, 4); C.sfx('flick', e); });
    },
  }),
  mimebrick: troupeBrain({
    act: ['piano', 'piano', 'push'],
    chatter: ['(Brick mimes lifting something VERY heavy.)', '(Brick mimes a tiny violin.)', '…'],
    piano(e, C, tgt) {
      e.state = 'busy'; e.timer = 2.0; e.anim = 'lift'; e.animT = 0;
      const x = tgt.pos.x + rand(-0.4, 0.4), z = tgt.pos.z + rand(-0.4, 0.4);
      C.telegraphCircle(x, z, 2, 1.4);
      if (Math.random() < 0.5) C.bubble(e, t(pick(this.chatter)), 1.4);
      later(e, 1.4, () => {
        hurtIn(C, e, (p) => Math.hypot(p.pos.x - x, p.pos.z - z) < 2, e.def.dmg * 1.4, { knock: 5 });
        C.vfx.shockwave(x, z, { r: 2, color: '#f4f0ff', life: 0.5, wall: 0.8 });
        C.world.fx.emit('dust', x, 0.4, z, 16, { color: '#d8d0c8' });
        C.shakeAt(e, 0.45); C.sfx('chord', e); C.sfx('slam', e);
        C.popText(x, 1.6, z, t('PLONNNG!'), '#fff7e6', true);
      });
    },
    push(e, C, tgt) {
      e.state = 'busy'; e.timer = 1.6; e.anim = 'push'; e.animT = 0;
      const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, L = Math.hypot(dx, dz) || 1, dir = { x: dx / L, z: dz / L };
      e.face = dir;
      C.telegraphLine(e, dir, 6, 0.8);
      later(e, 0.8, () => { e.dash = { dir, t: 0.45 }; C.sfx('charge', e); });
    },
  }),

  // ---- Old Lucky, the Paper Dragon
  paperdragon: {
    init(e) {
      e.state = 'enter'; e.timer = 1.6; e.phase = 1; e.fy = 5; e.y = 5; e.trail = []; e.ang = 0; e.burn = 0; e.dives = 0;
      e.immune = 'Too high to reach!';
      e.beamR = 1.2;
    },
    onHit(e) { if (e.burn > 0) e.flash = 0.1; },
    // (what the Dawn Mirror’s beam can catch: the head and a few drums, when it’s low)
    beamPoints(e) {
      if (e.fy > 1.6) return [];
      const pts = [[e.x, e.z]];
      for (let k = 0; k < e.trail.length; k += 4) pts.push([e.trail[k].x, e.trail[k].z]);
      return pts;
    },
    onBeam(e, C) {
      if (e.burn > 0 || e.fy > 1.6 || !e.alive) return;
      e.burn = e.phase >= 3 ? 3.2 : 4; e.state = 'burn'; e.timer = e.burn; e.immune = null; e.hintText = null;
      C.popText(e.x, 2.8, e.z, t('It catches fire!'), '#ffb040', true);
      C.sfx('crackle', e); C.sfx('roar', e); C.shakeAt(e, 0.4);
      if (e.onBurn) e.onBurn(e);
    },
    think(e, dt, tgt, C) {
      tickLater(e, dt);
      const H = e.home || { x: e.x, z: e.z };
      // (the trail its body follows)
      const last = e.trail[0];
      if (!last || Math.hypot(last.x - e.x, last.z - e.z, last.y - e.fy) > 0.12) { e.trail.unshift({ x: e.x, y: e.fy, z: e.z }); if (e.trail.length > 90) e.trail.pop(); }
      e.y = e.fy;
      if (e.burn > 0) {
        e.burn -= dt;
        if (Math.random() < dt * 12) C.world.fx.emit('smoke', e.x + rand(-1, 1), 1.2, e.z + rand(-1, 1), 1, { color: '#5a4a4a' });
        if (e.burn <= 0) this.takeOff(e, C);
        return;
      }
      if (e.state !== 'roar' && checkPhase(e, C, (ph) => { C.bubble(e, ph === 2 ? t('RRRAWR! (a papery rustle)') : t('RRRRAAAWR!'), 1.8); })) return;
      if (e.state === 'roar') { if (e.timer <= 0) this.takeOff(e, C); e.timer -= dt; return; }
      e.timer -= dt;
      const R0 = e.radius || 8;
      if (e.state === 'enter') {
        e.fy += (4.6 - e.fy) * Math.min(1, dt * 2);
        this.circle(e, H, R0, dt, 1.4);
        if (e.timer <= 0) { e.state = 'soar'; e.timer = rand(3, 4.5); }
      } else if (e.state === 'soar') {
        e.fy += (4.6 - e.fy) * Math.min(1, dt * 2);
        this.circle(e, H, R0, dt, e.phase >= 3 ? 2.1 : 1.6);
        e.inkT = (e.inkT || 1.5) - dt;
        if (e.phase >= 2 && e.inkT <= 0 && tgt) { e.inkT = 1.4; const x = tgt.pos.x + rand(-1, 1), z = tgt.pos.z + rand(-1, 1); lob(C, e, { x, z }, { r: 1.2, dmg: e.def.dmg * 0.6, t: 1.1 }); later(e, 1.1, () => inkPuddle(C, x, z, 1.5, 5)); }
        if (e.timer <= 0 && tgt) this.aim(e, C, tgt, H);
      } else if (e.state === 'aim') {
        // (hanging at the start of its dive, the line marked)
        e.fy += (3 - e.fy) * Math.min(1, dt * 3);
        e.x += (e.d.ax - e.x) * Math.min(1, dt * 5); e.z += (e.d.az - e.z) * Math.min(1, dt * 5);
        e.face = e.d.dir;
        if (e.timer <= 0) { e.state = 'dive'; e.timer = 0.85; C.sfx('whoosh', e); C.sfx('roar', e); }
      } else if (e.state === 'dive') {
        const D = e.d, k = 1 - Math.max(0, e.timer) / 0.85;
        e.x = D.ax + (D.bx - D.ax) * k; e.z = D.az + (D.bz - D.az) * k;
        e.fy = 0.7 + Math.sin(k * Math.PI) * 0.3;
        for (const p of C.alivePlayers()) if (!D.hit.has(p) && Math.hypot(p.pos.x - e.x, p.pos.z - e.z) < 1.4) { D.hit.add(p); C.hurtPlayer(p, e.def.dmg * (C.enemyDmg || 1), { dir: D.dir, knock: 5, src: e }); }
        if (e.timer <= 0) {
          e.dives++;
          if (e.phase >= 3 && e.dives % 2 === 1 && tgt) { this.aim(e, C, tgt, H); return; }
          this.perch(e, C, H);
        }
      } else if (e.state === 'land') {
        const [px, pz] = e.perchAt;
        e.x += (px - e.x) * Math.min(1, dt * 3); e.z += (pz - e.z) * Math.min(1, dt * 3);
        e.fy += (0.55 - e.fy) * Math.min(1, dt * 4);
        if (Math.hypot(px - e.x, pz - e.z) < 0.3) { e.state = 'perch'; e.timer = e.phase >= 3 ? 3 : 3.8; e.swept = false; C.world.fx.emit('dust', e.x, 0.3, e.z, 14); C.sfx('thud', e); }
      } else if (e.state === 'perch') {
        e.fy = 0.55;
        if (tgt) { const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, l = Math.hypot(dx, dz) || 1; e.face = { x: dx / l, z: dz / l }; }
        // (a sweep of its tail behind it, halfway through)
        if (!e.swept && e.timer < (e.phase >= 3 ? 1.8 : 2.4)) {
          e.swept = true;
          const back = { x: -e.face.x, z: -e.face.z };
          cone(C, e.x, e.z, back, 5, 1.6, 0.8, 0xff5a6a);
          later(e, 0.8, () => { hurtIn(C, e, (p) => { const px = p.pos.x - e.x, pz = p.pos.z - e.z, d = Math.hypot(px, pz); return d < 5 && (px * back.x + pz * back.z) / (d || 1) > Math.cos(0.8); }, e.def.dmg * 0.8, { knock: 5 }); C.sfx('whoosh', e); });
        }
        if (e.timer <= 0) this.takeOff(e, C);
      }
      leash(e, C);
    },
    circle(e, H, R, dt, sp) {
      e.ang += dt * sp / Math.max(3, R) * 3;
      const tx = H.x + Math.cos(e.ang) * R, tz = H.z + Math.sin(e.ang) * R * 0.7;
      const dx = tx - e.x, dz = tz - e.z, l = Math.hypot(dx, dz) || 1;
      const k = Math.min(l, dt * 9);
      e.x += (dx / l) * k; e.z += (dz / l) * k;
      if (l > 0.05) e.face = { x: dx / l, z: dz / l };
    },
    aim(e, C, tgt, H) {
      // (from one side of the roof, through them, to the other)
      const dx = tgt.pos.x - H.x, dz = tgt.pos.z - H.z, a = Math.atan2(dz, dx) + rand(-0.5, 0.5) + Math.PI;
      const R = (e.radius || 8) + 1, ax = H.x + Math.cos(a) * R, az = H.z + Math.sin(a) * R * 0.7;
      const L0 = Math.hypot(tgt.pos.x - ax, tgt.pos.z - az) || 1, dir = { x: (tgt.pos.x - ax) / L0, z: (tgt.pos.z - az) / L0 }, L = Math.min(L0 + 5, R * 2);
      e.d = { ax, az, bx: ax + dir.x * L, bz: az + dir.z * L, dir, hit: new Set() };
      e.state = 'aim'; e.timer = 1.1; e.immune = 'Too high to reach!'; e.hintText = null;
      C.telegraphLine({ x: ax, z: az }, dir, L, 1.1);
      C.bubble(e, t(pick(['Rrrrr…', '(the paper rustles, hungrily)'])), 0.9);
    },
    perch(e, C, H) {
      // (the nearest perch round the Dawn Mirror)
      const P = e.perches || [[H.x, H.z + 6]];
      let best = P[0], bd = 1e9;
      for (const q of P) { const d = Math.hypot(q[0] - e.x, q[1] - e.z); if (d < bd && q !== e.lastPerch) { bd = d; best = q; } }
      e.lastPerch = best; e.perchAt = best;
      e.state = 'land'; e.timer = 4;
      e.immune = null; e.hintText = 'It’s landed — turn the Dawn Mirror on it!';
    },
    takeOff(e, C) {
      e.state = 'soar'; e.timer = rand(2.8, 4.2) / (e.phase >= 3 ? 1.3 : 1); e.burn = 0;
      e.immune = 'Too high to reach!'; e.hintText = null;
      if (e.phase >= 2) for (let k = 0; k < (e.phase >= 3 ? 3 : 2); k++) { const b = C.spawn('paperbat', e.x + rand(-1.5, 1.5), e.z + rand(-1.5, 1.5), { level: e.level, quiet: true }); b.saga = true; b.sagaTag = e.sagaTag; }
      C.sfx('whoosh', e);
    },
    pose(e, dt) {
      const u = e.obj.userData;
      e.obj.rotation.y = 0;
      const burning = e.burn > 0;
      u.head.rotation.y = Math.atan2(e.face.x, e.face.z);
      u.head.rotation.z = Math.sin(e.t * 3) * 0.08;
      u.jaw.rotation.x = e.state === 'dive' || e.state === 'aim' ? 0.5 : burning ? 0.7 + Math.sin(e.t * 20) * 0.2 : 0.1 + Math.max(0, Math.sin(e.t * 2)) * 0.2;
      u.fire.visible = burning;
      if (burning) { u.fire.rotation.y = e.t * 5; u.fire.scale.setScalar(1 + Math.sin(e.t * 15) * 0.15); }
      u.brow.visible = !e.saved;
      // (the drums along the trail, a little apart)
      const T = e.trail;
      let acc = 0, i = 0, px = e.x, py = e.fy, pz = e.z;
      u.segs.forEach((s, k) => {
        const want = (k + 1) * 0.72;
        while (i < T.length - 1 && acc + Math.hypot(T[i + 1].x - T[i].x, T[i + 1].z - T[i].z, T[i + 1].y - T[i].y) < want) { acc += Math.hypot(T[i + 1].x - T[i].x, T[i + 1].z - T[i].z, T[i + 1].y - T[i].y); i++; }
        const a = T[i] || { x: e.x, y: e.fy, z: e.z - want }, b = T[i + 1] || a, seg = Math.hypot(b.x - a.x, b.z - a.z, b.y - a.y) || 1, f = Math.min(1, (want - acc) / seg);
        const x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f, z = a.z + (b.z - a.z) * f;
        s.position.set((x - e.x) / u.sc, (y - e.fy) / u.sc + Math.sin(e.t * 4 - k * 0.6) * 0.1, (z - e.z) / u.sc);
        s.rotation.y = Math.atan2(px - x, pz - z);
        px = x; py = y; pz = z;
      });
      void py; void dt;
    },
  },
};

// an ink puddle: slows whoever wades through it
export function inkPuddle(C, x, z, r, life) {
  const m = new THREE.Mesh(C.geo.disc, new THREE.MeshBasicMaterial({ color: 0x1e1a30, transparent: true, opacity: 0.7, depthWrite: false }));
  m.scale.setScalar(r); m.position.set(x, 0.035, z);
  C.root.add(m);
  C.fxMeshes.push({ m, t: life, life, fn: (q, k) => {
    m.material.opacity = 0.7 * Math.min(1, k * 3);
    for (const p of C.alivePlayers()) if (Math.hypot(p.pos.x - x, p.pos.z - z) < r && p.actor.jumpY < 0.3) p.actor.zoneSlow = Math.min(p.actor.zoneSlow ?? 1, 0.55);
  } });
}

// the Mime Troupe’s shared brain: keep a mime’s distance, an act now and then,
// a dash when Brick pushes, crosser as the others go down
function troupeBrain(o) {
  return {
    ...o,
    init(e) { e.state = 'chase'; e.timer = rand(1.2, 2.2); e.phase = 1; e.last = null; },
    think(e, dt, tgt, C) {
      tickLater(e, dt);
      const cross = crossTroupe(e, C);
      if (e.dash) {
        e.dash.t -= dt;
        C.moveEnemy(e, e.dash.dir.x * 9 * dt, e.dash.dir.z * 9 * dt, true);
        hurtIn(C, e, (p) => Math.hypot(p.pos.x - e.x, p.pos.z - e.z) < 1.1 && !(e.dashHit || (e.dashHit = new Set())).has(p) && e.dashHit.add(p), e.def.dmg, { knock: 5 });
        if (e.dash.t <= 0) { e.dash = null; e.dashHit = null; }
        return;
      }
      if (!tgt) return;
      e.timer -= dt * cross;
      if (e.state === 'chase') {
        hover(e, C, tgt, speedOf(e, C) * (0.9 + (cross - 1) * 0.5), dt, 3, 6);
        if (e.timer <= 0) {
          let a = pick(this.act);
          if (a === e.last && this.act.length > 1) a = pick(this.act.filter((q) => q !== a));
          e.last = a;
          this[a](e, C, tgt);
        }
      } else if (e.state === 'busy' && e.timer <= 0) { e.state = 'chase'; e.timer = rand(1.4, 2.4); }
    },
    pose(e, dt) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      e.animT = (e.animT || 0) + dt;
      const busy = e.state === 'busy', a = busy ? e.anim : null, w = Math.sin(e.t * 9);
      u.body.position.y = Math.abs(Math.sin(e.t * 6)) * 0.04;
      for (const [i, L] of u.legs.entries()) L.rotation.x = e.moving || !busy ? (i ? -w : w) * 0.4 : 0;
      // (the mime’s hands: flat on the wall, pulling the rope, heaving the piano)
      const [l, r] = u.arms;
      if (a === 'wall' || a === 'box') { l.rotation.set(-1.5, 0, 0.2 + Math.sin(e.t * 6) * 0.1); r.rotation.set(-1.5, 0, -0.2 - Math.sin(e.t * 6 + 1) * 0.1); }
      else if (a === 'rope') { const k = Math.sin(e.animT * 8); l.rotation.set(-1.2 + k * 0.4, 0, 0.3); r.rotation.set(-1.2 - k * 0.4, 0, -0.3); }
      else if (a === 'lift') { l.rotation.set(0, 0, 2.8); r.rotation.set(0, 0, -2.8); u.body.position.y = -0.05 + Math.sin(e.t * 20) * 0.02; }
      else if (a === 'push' || a === 'jab') { l.rotation.set(-1.4, 0, 0); r.rotation.set(-1.4, 0, 0); }
      else { l.rotation.set(Math.sin(e.t * 3) * 0.3, 0, 0.15); r.rotation.set(-Math.sin(e.t * 3) * 0.3, 0, -0.15); }
    },
  };
}
void cone;
