// World v7: the Duchess’s people, as foes.
//   minnow · fidget · brick   the Understudies (a mini-boss trio, chapter 1):
//       Minnow juggles pins at you from a distance (three marked landings),
//       Fidget keeps away, dashes off when you close in and lobs smoke bombs,
//       Brick paws the ground, charges down a marked lane, then slams (a ring).
//       When one of them goes down the others get cross (faster). Beaten, they
//       don’t poof: they run off, holding their bruises.
//   snuffbot                  Crumble’s Snuffbot 3000 (chapter 1’s boss): a
//       clanking candle-snuffer robot, Crumble in the glass dome. Snuff Slam on
//       a marked circle, a cone of hot wax (burning puddles), candle imps from
//       phase 2, and in phase 3 it overheats: steam rings to jump and its boiler
//       hatch pops open (hit it: ×1.5).
//   swimminnow · swimfidget · swimbrick   the Synchronised Swimmers (chapter 5's
//       mini-boss): swim caps, a pool. In the water they circle in formation and
//       nothing touches them (« Splash! »); the room's routine sends water jets
//       down marked lines, Brick's lift drops Minnow on a marked circle, a wave
//       spreads in rings. Drain the pool (its two bells, together) and they flop
//       on the tiles, helpless, until the water comes back (×1.5).
// Every blow is shown before it lands.

import { THREE } from '../../render/r3d.js';
import { toward, hover, speedOf, lob, hazard } from '../v3/ai.js';
import { flat, cone, later, tickLater, hurtIn, checkPhase, leash } from '../v3/bosses.js';
import { t } from '../../i18n.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export const TROUPE_ENEMIES = {
  minnow: { name: 'Minnow', hp: 70, speed: 2.9, r: 0.34, h: 1.25, dmg: 9, xp: 30, cost: 4, knockRes: 0.3, troupe: true },
  fidget: { name: 'Fidget', hp: 60, speed: 3.5, r: 0.34, h: 1.5, dmg: 8, xp: 30, cost: 4, knockRes: 0.3, troupe: true },
  brick: { name: 'Brick', hp: 170, speed: 2.0, r: 0.55, h: 2.0, dmg: 14, xp: 40, cost: 6, knockRes: 0.85, troupe: true },
  swimminnow: { name: 'Minnow', hp: 220, speed: 2.8, r: 0.34, h: 1.25, dmg: 14, xp: 90, cost: 8, knockRes: 0.6, troupe: true, swim: true },
  swimfidget: { name: 'Fidget', hp: 200, speed: 3.0, r: 0.34, h: 1.5, dmg: 13, xp: 90, cost: 8, knockRes: 0.6, troupe: true, swim: true },
  swimbrick: { name: 'Brick', hp: 340, speed: 2.4, r: 0.55, h: 2.0, dmg: 18, xp: 110, cost: 10, knockRes: 0.9, troupe: true, swim: true },
  snuffbot: { name: 'Snuffbot 3000', title: 'Crumble’s Snuffbot 3000', hp: 1100, speed: 1.35, r: 1.15, h: 2.6, dmg: 17, xp: 260, cost: 99, boss: true, knockRes: 1, elem: 'fire' },
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

// the Understudies as foes: stage clothes, lilac skin, a face each
export function understudy(r3d, { scale, top, hat, hair, mustache = false, glasses = false }) {
  const g = new THREE.Group(), body = grp(g);
  body.scale.setScalar(scale);
  const skin = mat(r3d, '#d5c2ee'), stripe = mat(r3d, '#6a3a78'), white = mat(r3d, '#f4eaff'), dark = mat(r3d, '#2a2433');
  // legs, a striped top, arms
  const legs = [];
  for (const s of [-1, 1]) { const L = grp(body, s * 0.13, 0.42, 0); box(L, 0.16, 0.42, 0.18, dark, 0, -0.21, 0); box(L, 0.18, 0.08, 0.24, mat(r3d, '#1a1622'), 0, -0.42, 0.03); legs.push(L); }
  const torso = grp(body, 0, 0.62, 0);
  box(torso, 0.5, 0.42, 0.34, top, 0, 0, 0);
  for (let i = 0; i < 3; i++) box(torso, 0.51, 0.06, 0.35, i % 2 ? white : stripe, 0, -0.12 + i * 0.12, 0);
  const arms = [];
  for (const s of [-1, 1]) { const A = grp(torso, s * 0.31, 0.14, 0); box(A, 0.13, 0.38, 0.14, top, 0, -0.18, 0); box(A, 0.12, 0.1, 0.12, skin, 0, -0.4, 0); arms.push(A); }
  // the head: a soft cube, eyes, and whatever they wear
  const head = grp(body, 0, 1.12, 0);
  box(head, 0.5, 0.46, 0.46, skin, 0, 0, 0);
  box(head, 0.52, 0.12, 0.48, hair, 0, 0.2, -0.02);
  for (const s of [-1, 1]) { box(head, 0.07, 0.09, 0.02, dark, s * 0.11, 0.02, 0.235); box(head, 0.03, 0.03, 0.02, white, s * 0.11 - 0.015, 0.04, 0.24); }
  box(head, 0.12, 0.03, 0.02, mat(r3d, '#7a3440'), 0, -0.12, 0.235);
  if (mustache) box(head, 0.28, 0.06, 0.03, hair, 0, -0.07, 0.24);
  if (glasses) for (const s of [-1, 1]) { box(head, 0.14, 0.12, 0.02, mat(r3d, '#e0e0f0'), s * 0.11, 0.02, 0.245); }
  if (hat === 'top') { cyl(head, 0.17, 0.17, 0.34, dark, 0, 0.42, 0); cyl(head, 0.3, 0.3, 0.05, dark, 0, 0.26, 0); box(head, 0.36, 0.06, 0.02, mat(r3d, '#c8454f'), 0, 0.3, 0.17); }
  if (hat === 'beret') { const b = cyl(head, 0.28, 0.25, 0.1, dark, 0.04, 0.3, 0); b.rotation.z = -0.15; box(head, 0.04, 0.06, 0.04, dark, 0.05, 0.37, 0); }
  // (a faint gloom shimmer round them: they’re the Duchess’s, after all)
  g.userData = { body, legs, arms, head, torso };
  return own(g);
}

function swimmer(r3d, { scale, suit, cap, glasses = false, mustache = false }) {
  const g = understudy(r3d, { scale, top: mat(r3d, suit), hat: null, hair: mat(r3d, cap), mustache, glasses });
  const u = g.userData, cm = mat(r3d, cap), fl = mat(r3d, '#fff3a6'), fl2 = mat(r3d, '#f28a6b');
  // (the cap: a dome over the head, a strap, a flower on the side)
  const dome = ball(u.head, 0.3, cm, 0, 0.16, -0.02, 0.92, 0.62, 0.88);
  dome.material = dome.material.clone();
  for (const s of [-1, 1]) box(u.head, 0.04, 0.3, 0.06, cm, s * 0.26, -0.04, 0.05);
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; ball(u.head, 0.05, i % 2 ? fl : fl2, 0.2 + Math.cos(a) * 0.07, 0.24 + Math.sin(a) * 0.07, 0.16, 1, 1, 0.5); }
  box(u.head, 0.06, 0.04, 0.03, mat(r3d, '#e0e0f0'), 0, -0.04, 0.25);
  return g;
}

export const TROUPE_MODELS = {
  minnow(r3d) {
    const g = understudy(r3d, { scale: 0.85, top: mat(r3d, '#8a3a86'), hat: 'top', hair: mat(r3d, '#e889b8') });
    // three juggling pins in the air above
    const pins = [];
    for (let i = 0; i < 3; i++) { const p = grp(g.userData.body, 0, 1.9, 0.2); box(p, 0.08, 0.24, 0.08, mat(r3d, '#fff3c4'), 0, 0, 0); box(p, 0.1, 0.06, 0.1, mat(r3d, '#e0405a'), 0, 0.05, 0); pins.push(p); }
    g.userData.pins = pins;
    return g;
  },
  fidget(r3d) { return understudy(r3d, { scale: 1.02, top: mat(r3d, '#6a4a9a'), hat: 'beret', hair: mat(r3d, '#7ecfae'), glasses: true }); },
  brick(r3d) { return understudy(r3d, { scale: 1.4, top: mat(r3d, '#5a3a7a'), hat: null, hair: mat(r3d, '#2a2433'), mustache: true }); },
  // the Synchronised Swimmers: swimsuits, flowered caps, a nose clip each
  swimminnow(r3d) { return swimmer(r3d, { scale: 0.85, suit: '#e0406a', cap: '#f4a4b6' }); },
  swimfidget(r3d) { return swimmer(r3d, { scale: 1.02, suit: '#4a8ae8', cap: '#9fdcff', glasses: true }); },
  swimbrick(r3d) { return swimmer(r3d, { scale: 1.4, suit: '#e0a040', cap: '#fff3a6', mustache: true }); },
  // Crumble’s Snuffbot 3000
  snuffbot(r3d) {
    const g = new THREE.Group(), body = grp(g);
    const brass = mat(r3d, '#c8983e'), brassD = mat(r3d, '#8a6a2a'), iron = mat(r3d, '#4a4452'), rivet = mat(r3d, '#e8c46a');
    const glass = new THREE.MeshToonMaterial({ color: '#bfe8ff', gradientMap: r3d.gradient, transparent: true, opacity: 0.55 });
    // stubby legs with big feet
    const legs = [];
    for (const s of [-1, 1]) { const L = grp(body, s * 0.55, 0.75, 0); cyl(L, 0.2, 0.24, 0.75, iron, 0, -0.35, 0, 8); box(L, 0.55, 0.22, 0.75, brassD, 0, -0.72, 0.1); legs.push(L); }
    // the barrel body, rivets, a grille
    const torso = grp(body, 0, 1.55, 0);
    cyl(torso, 0.85, 0.95, 1.3, brass, 0, 0, 0, 14);
    for (const y of [-0.55, 0.55]) cyl(torso, 0.97, 0.97, 0.12, brassD, 0, y, 0, 14);
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; box(torso, 0.08, 0.08, 0.08, rivet, Math.cos(a) * 0.9, 0.55, Math.sin(a) * 0.9); }
    for (let i = 0; i < 4; i++) box(torso, 0.8, 0.06, 0.05, iron, 0, -0.25 + i * 0.12, 0.88);
    // two eye-lamps
    const eyes = [-0.3, 0.3].map((x) => box(torso, 0.2, 0.14, 0.06, mat(r3d, '#ffe9a0', '#ffb040', 1.4), x, 0.25, 0.9));
    // the glass dome with Crumble inside (lilac, a red bellhop cap)
    const dome = grp(body, 0, 2.3, 0);
    cyl(dome, 0.5, 0.55, 0.1, brassD, 0, 0, 0, 12);
    const pilot = grp(dome, 0, 0.1, 0);
    box(pilot, 0.36, 0.34, 0.32, mat(r3d, '#d5c2ee'), 0, 0.2, 0);
    for (const s of [-1, 1]) box(pilot, 0.06, 0.08, 0.02, mat(r3d, '#2a2433'), s * 0.08, 0.24, 0.165);
    cyl(pilot, 0.14, 0.14, 0.14, mat(r3d, '#c8454f'), 0, 0.44, 0);
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.52, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), glass);
    bubble.position.y = 0.05; dome.add(bubble);
    // the snuffer arm (right) and a stubby left arm
    const arm = grp(torso, 1.05, 0.25, 0);
    box(arm, 0.3, 0.3, 0.3, iron, 0, 0, 0);
    const fore = grp(arm, 0.25, -0.1, 0.25);
    box(fore, 0.18, 0.18, 0.9, iron, 0, 0, 0.35);
    const snuffer = grp(fore, 0, -0.15, 0.95);
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.8, 12, 1, true), brass); c.rotation.x = Math.PI; c.position.y = -0.1; c.castShadow = true; snuffer.add(c);
    ball(snuffer, 0.14, brassD, 0, 0.35, 0);
    const lArm = grp(torso, -1.0, 0.2, 0);
    box(lArm, 0.24, 0.5, 0.24, iron, 0, -0.2, 0);
    box(lArm, 0.3, 0.2, 0.3, brassD, 0, -0.5, 0.05);
    // the chimney (it puffs) and the boiler hatch at the back
    const chimney = grp(torso, -0.35, 0.8, -0.35);
    cyl(chimney, 0.14, 0.18, 0.7, iron, 0, 0.3, 0, 8);
    cyl(chimney, 0.2, 0.2, 0.08, brassD, 0, 0.66, 0, 8);
    const hatch = box(torso, 0.6, 0.5, 0.06, mat(r3d, '#5a3a2a', '#ff6a1a', 0.2), 0, -0.05, -0.93);
    g.userData = { body, legs, torso, arm, fore, snuffer, eyes, dome, pilot, chimney, hatch };
    return own(g);
  },
};

// ------------------------------------------------------------------ brains
const angry = (e) => (e.cross ? 1.25 : 1);
function friends(e, C) { return C.enemies.filter((q) => q !== e && q.alive && q.def.troupe); }
function crossAll(e, C) {
  for (const q of friends(e, C)) { q.cross = true; C.bubble(q, pick([t('Hey!'), t('How rude!'), t('Our BIG moment!')]), 1.4); }
}
// they don’t poof when beaten: they limp off, holding their bruises
function exitStageLeft(e, C) {
  C.bubble(e, pick([t('Ow! My costume!'), t('Ouch… encore?'), t('This isn’t in the script!')]), 1.6);
  e.onDeath = () => { e.freed = true; e.fading = 2.2; };
  crossAll(e, C);
}

// ------------------------------------------------------------------ the Human Cannonball
// Brick walks back to Big Bertha, climbs in; she swings round onto a marked
// circle near someone, the fuse fizzes, BOOM — he lands on it (a shockwave),
// and sits there seeing stars for a moment: that’s when he can be hit hardest.
function cannonAct(e, dt, tgt, C) {
  const K = e.cannon, B = K.obj && K.obj.userData;
  tickLater(e, dt);
  if (e.dizzy > 0) e.dizzy -= dt;
  if (e.state === 'chase' || e.state === 'toCannon') {
    e.state = 'toCannon';
    const dx = K.x - e.x, dz = K.z - e.z, d = Math.hypot(dx, dz);
    if (d > 0.9) { const sp = speedOf(e, C) * 1.25; e.faceTo(K.x, K.z); C.moveEnemy(e, (dx / d) * sp * dt, (dz / d) * sp * dt); return; }
    e.state = 'loaded'; e.timer = 0.8; e.under = true;
    if (B) B.load(true);
    C.bubble(e, pick([t('BRICK… READY!'), t('Brick fly now.')]), 1.1);
    C.sfx('thud', e);
  } else if (e.state === 'loaded') {
    if (e.timer > 0 || !tgt) return;
    const v = tgt.vel || { x: 0, z: 0 };
    e.aim = { x: tgt.pos.x + v.x * 0.6, z: tgt.pos.z + v.z * 0.5 };
    C.telegraphCircle(e.aim.x, e.aim.z, 2.5, 1.4);
    if (B) B.aimAt(e.aim.x - K.x, e.aim.z - K.z);
    e.state = 'aim'; e.timer = 1.4;
    C.sfx('sizzle', e);
  } else if (e.state === 'aim') {
    if (e.timer > 0) return;
    const dx = e.aim.x - K.x, dz = e.aim.z - K.z, l = Math.hypot(dx, dz) || 1;
    if (B) B.fire();
    C.world.fx.emit('smoke', K.x + (dx / l) * 1.7, 1.5, K.z + (dz / l) * 1.7, 16, { color: '#f4f0ec' });
    C.world.fx.emit('sparkle', K.x + (dx / l) * 1.7, 1.6, K.z + (dz / l) * 1.7, 10, { color: '#ffd66b' });
    C.shakeAt(e, 0.35); C.sfx('boom', e);
    e.fly = { x0: K.x + (dx / l) * 1.6, z0: K.z + (dz / l) * 1.6, x1: e.aim.x, z1: e.aim.z, t: 0, dur: Math.max(0.7, Math.min(1.2, l / 10)) };
    e.faceTo(e.aim.x, e.aim.z);
    e.state = 'fly';
    if (B) B.load(false);
  } else if (e.state === 'fly') {
    const F = e.fly;
    F.t += dt;
    const k = Math.min(1, F.t / F.dur);
    e.x = F.x0 + (F.x1 - F.x0) * k; e.z = F.z0 + (F.z1 - F.z0) * k;
    e.y = Math.sin(k * Math.PI) * 5.5 + (1 - k) * 1.3; e.vy = 0;
    if (Math.random() < dt * 30) C.vfx.trail(e.x, e.y + 0.8, e.z, { color: '#b9a2e3', size: 0.35, life: 0.3 });
    if (k < 1) return;
    // (the landing)
    e.y = 0; e.vy = 0; e.under = false;
    hurtIn(C, e, (p) => Math.hypot(p.pos.x - e.x, p.pos.z - e.z) < 2.6 && p.actor.jumpY < 0.6, e.def.dmg * 1.4, { knock: 5, launch: 4 });
    C.vfx.shockwave(e.x, e.z, { r: 2.6, color: '#b9a2e3', life: 0.5, wall: 0.7 });
    C.world.fx.emit('dust', e.x, 0.2, e.z, 18);
    C.shakeAt(e, 0.5); C.sfx('slam', e);
    e.state = 'dizzy'; e.timer = 2.6; e.dizzy = 2.6;
    C.bubble(e, pick([t('Ta-daaa…'), t('Did… did Brick stick the landing?'), t('Stars. Pretty.')]), 1.5);
  } else if (e.state === 'dizzy' && e.timer <= 0) { e.state = 'toCannon'; }
}

// Big Bertha, the Understudies’ circus cannon: a red barrel starred in gold on
// a blue carriage with great spoked wheels. userData: aimAt(dx, dz), fire(),
// load(on) (Brick’s boots stick out of her mouth), anim(t) (the recoil)
export function buildBigBertha(r3d) {
  const g = new THREE.Group();
  const red = mat(r3d, '#c8383e'), redD = mat(r3d, '#962a32'), gold = mat(r3d, '#f2c14e', '#c89020', 0.35), blue = mat(r3d, '#2e4a8a'), wood = mat(r3d, '#8a5a3a'), iron = mat(r3d, '#3a3844');
  // the carriage and its wheels
  box(g, 1.3, 0.36, 2.0, blue, 0, 0.5, -0.1);
  box(g, 1.36, 0.08, 2.06, gold, 0, 0.7, -0.1);
  for (const s of [-1, 1]) {
    const w = grp(g, s * 0.78, 0.62, 0.2);
    const rim = cyl(w, 0.62, 0.62, 0.12, wood, 0, 0, 0, 16); rim.rotation.z = Math.PI / 2;
    for (let i = 0; i < 6; i++) { const sp = box(w, 0.06, 1.1, 0.07, gold, 0, 0, 0); sp.rotation.x = (i / 6) * Math.PI; }
    const hub = cyl(w, 0.14, 0.14, 0.16, iron, 0, 0, 0, 10); hub.rotation.z = Math.PI / 2;
  }
  // the barrel, on a pivot: it swings round and tilts up
  const yaw = grp(g, 0, 0.95, 0), pitch = grp(yaw), barrel = grp(pitch);
  const b = cyl(barrel, 0.42, 0.52, 2.4, red, 0, 0, 0.3, 16); b.rotation.x = Math.PI / 2;
  const mouth = cyl(barrel, 0.56, 0.46, 0.3, redD, 0, 0, 1.55, 16); mouth.rotation.x = Math.PI / 2;
  for (const z of [-0.5, 0.4, 1.2]) { const ring = cyl(barrel, 0.55, 0.55, 0.1, gold, 0, 0, z, 16); ring.rotation.x = Math.PI / 2; }
  const back = ball(barrel, 0.5, redD, 0, 0, -0.9, 1, 1, 0.7);
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const st = box(barrel, 0.14, 0.14, 0.04, gold, Math.cos(a) * 0.47, Math.sin(a) * 0.47, 0.8); st.rotation.set(0, 0, a + Math.PI / 4); st.lookAt(Math.cos(a) * 2, Math.sin(a) * 2, 0.8); }
  const fuse = box(barrel, 0.04, 0.3, 0.04, iron, 0, 0.5, -0.9);
  const spark = ball(barrel, 0.07, mat(r3d, '#fff0a0', '#ffd23a', 1.6), 0, 0.68, -0.9);
  // Brick’s boots, sticking out of her mouth when he’s loaded
  const boots = grp(barrel, 0, 0, 1.6);
  for (const s of [-1, 1]) box(boots, 0.16, 0.2, 0.32, mat(r3d, '#5a3a2a'), s * 0.12, 0, 0.1);
  boots.visible = false;
  pitch.rotation.x = -0.55;
  let recoilT = 9, loaded = false;
  g.userData = {
    aimAt(dx, dz) { yaw.rotation.y = Math.atan2(dx, dz); },
    fire() { recoilT = 0; },
    load(on) { loaded = on; boots.visible = on; },
    anim(tm) {
      recoilT += 1 / 60;
      barrel.position.z = recoilT < 0.5 ? -0.5 * Math.max(0, 1 - recoilT / 0.5) : 0;
      spark.visible = loaded && Math.floor(tm * 12) % 2 === 0;
      fuse.scale.y = loaded ? 1 : 0.6;
      boots.rotation.z = loaded ? Math.sin(tm * 9) * 0.2 : 0;
    },
  };
  return own(g);
}

export const TROUPE_BRAINS = {
  minnow: {
    init(e) { e.state = 'chase'; e.throwT = 1.6; },
    onDeath(e, C) { exitStageLeft(e, C); },
    think(e, dt, tgt, C) {
      const sp = speedOf(e, C) * angry(e);
      hover(e, C, tgt, sp, dt, 4, 6.5);
      e.throwT -= dt * angry(e);
      if (e.throwT <= 0) {
        e.throwT = rand(2, 2.6);
        // three pins: one where you are, two where you might go
        const v = tgt.vel || { x: 0, z: 0 };
        for (const k of [0, 1, 2]) {
          const o = k === 0 ? { x: 0, z: 0 } : { x: v.x * 0.5 + rand(-1.4, 1.4), z: v.z * 0.4 + rand(-1.1, 1.1) };
          later(e, k * 0.18, () => lob(C, e, { x: tgt.pos.x + o.x, z: tgt.pos.z + o.z }, { r: 0.8, dmg: e.def.dmg, t: 1.0, look: 'pinecone', knock: 2 }));
        }
        C.sfx('whoosh', e);
      }
      tickLater(e, dt);
    },
    pose(e, dt) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      (u.pins || []).forEach((p, i) => { const a = e.t * 5 + i * 2.09; p.position.set(Math.cos(a) * 0.35, 1.8 + Math.abs(Math.sin(a)) * 0.5, 0.15); p.rotation.z = a * 2; });
      for (const [i, L] of u.legs.entries()) L.rotation.x = Math.sin(e.t * 12 + i * Math.PI) * 0.5;
      u.arms[0].rotation.x = -1.4 + Math.sin(e.t * 10) * 0.3; u.arms[1].rotation.x = -1.4 + Math.cos(e.t * 10) * 0.3;
      void dt;
    },
  },
  fidget: {
    init(e) { e.state = 'chase'; e.bombT = 2.2; e.dashT = 0; },
    onDeath(e, C) { exitStageLeft(e, C); },
    think(e, dt, tgt, C) {
      const sp = speedOf(e, C) * angry(e);
      const d = Math.hypot(tgt.pos.x - e.x, tgt.pos.z - e.z);
      if (e.dashT > 0) {
        // a nervous dash away (with afterimages)
        e.dashT -= dt;
        C.moveEnemy(e, e.dashV.x * dt, e.dashV.z * dt);
        if (Math.random() < dt * 30) C.vfx.trail(e.x, 0.9, e.z, { color: '#b9a2e3', size: 0.3, life: 0.25 });
        return;
      }
      if (d < 2.6 && Math.random() < dt * 2.5) {
        const dx = e.x - tgt.pos.x, dz = e.z - tgt.pos.z, l = Math.hypot(dx, dz) || 1;
        e.dashV = { x: (dx / l) * 9, z: (dz / l) * 9 }; e.dashT = 0.35;
        C.bubble(e, pick([t('Eep!'), t('Not the face!'), t('Personal space!')]), 0.9);
        C.sfx('whoosh', e);
        return;
      }
      hover(e, C, tgt, sp, dt, 3.5, 5.5);
      e.bombT -= dt * angry(e);
      if (e.bombT <= 0) {
        e.bombT = rand(2.8, 3.4);
        lob(C, e, { x: tgt.pos.x, z: tgt.pos.z }, { r: 1.5, dmg: e.def.dmg, t: 1.2, look: 'bomb', elem: 'poison', knock: 2 });
      }
    },
    pose(e) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      for (const [i, L] of u.legs.entries()) L.rotation.x = Math.sin(e.t * 14 + i * Math.PI) * 0.6;
      u.head.rotation.z = Math.sin(e.t * 9) * 0.12;          // (always a little jittery)
    },
  },
  brick: {
    init(e) { e.state = 'chase'; e.timer = 1.4; },
    onDeath(e, C) { if (e.cannon && e.cannon.obj) e.cannon.obj.userData.load(false); exitStageLeft(e, C); },
    think(e, dt, tgt, C) {
      // (chapter 3: the Human Cannonball — Big Bertha does his moving for him)
      if (e.cannon) { cannonAct(e, dt, tgt, C); return; }
      const sp = speedOf(e, C) * angry(e);
      if (e.state === 'chase') {
        const d = toward(e, C, tgt, sp, dt, 1.4);
        if (e.timer <= 0) {
          if (d > 3.5) {
            // paws the ground, then charges down a marked lane
            e.state = 'windup'; e.timer = 0.9;
            e.lane = { x: (tgt.pos.x - e.x) / d, z: (tgt.pos.z - e.z) / d };
            C.telegraphLine(e, e.lane, 9, 0.9);
            C.bubble(e, t('BRICK!'), 0.9);
          } else {
            e.state = 'slamup'; e.timer = 1.0;
            C.telegraphCircle(e.x, e.z, 2.2, 1.0);
          }
        }
      } else if (e.state === 'windup' && e.timer <= 0) { e.state = 'charge'; e.timer = 0.75; e.hitOnce.clear(); C.sfx('charge', e); }
      else if (e.state === 'charge') {
        C.moveEnemy(e, e.lane.x * 11 * dt, e.lane.z * 11 * dt);
        C.enemyTouch(e, e.def.dmg, 4, 0.9);
        if (Math.random() < dt * 30) C.world.fx.emit('dust', e.x, 0.1, e.z, 1);
        if (e.timer <= 0) { e.state = 'recover'; e.timer = 0.8; }
      } else if (e.state === 'slamup' && e.timer <= 0) {
        hurtIn(C, e, (p) => Math.hypot(p.pos.x - e.x, p.pos.z - e.z) < 2.3 && p.actor.jumpY < 0.6, e.def.dmg * 1.2, { knock: 5, launch: 4 });
        C.vfx.shockwave(e.x, e.z, { r: 2.3, color: '#b9a2e3', life: 0.45, wall: 0.6 });
        C.shakeAt(e, 0.35); C.sfx('slam', e);
        e.state = 'recover'; e.timer = 0.9;
      } else if (e.state === 'recover' && e.timer <= 0) { e.state = 'chase'; e.timer = rand(1.2, 1.8) / angry(e); }
    },
    pose(e, dt) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      if (e.cannon) {
        // inside Bertha: gone; flying: a tumbling ball of Brick; landed: seeing stars
        e.obj.visible = e.state !== 'loaded' && e.state !== 'aim';
        e.obj.rotation.x = e.state === 'fly' ? e.fly.t * 14 : 0;
        if (e.state === 'dizzy') { e.obj.rotation.z = Math.sin(e.t * 6) * 0.15; if (Math.random() < (dt || 0.016) * 10) e.combat.world.fx.emit('sparkle', e.x + Math.cos(e.t * 8) * 0.5, 2.3, e.z + Math.sin(e.t * 8) * 0.4, 1, { color: '#fff3a6' }); } else e.obj.rotation.z = 0;
      }
      const run = e.state === 'charge' || e.state === 'toCannon' ? 22 : 8;
      for (const [i, L] of u.legs.entries()) L.rotation.x = Math.sin(e.t * run + i * Math.PI) * (e.state === 'charge' ? 0.9 : 0.4);
      const up = e.state === 'slamup' ? -2.6 : e.state === 'windup' ? -0.6 : 0;
      for (const A of u.arms) A.rotation.x += (up - A.rotation.x) * 0.25;
    },
  },

  // ---------------------------------------------------------------- the Snuffbot 3000
  snuffbot: {
    init(e) { e.state = 'chase'; e.timer = 2; e.phase = 1; e.impT = 6; e.lastAtk = null; },
    onHit(e) { if (e.exposed > 0) e.flash = 0.12; },
    think(e, dt, tgt, C) {
      tickLater(e, dt);
      leash(e, C);
      if (e.exposed > 0) e.exposed -= dt;
      if (e.state !== 'roar' && checkPhase(e, C, (ph) => {
        C.bubble(e, ph === 2 ? t('Er… which lever was it?') : t('HOT HOT HOT! Snuffbot, COOL DOWN!'), 2);
      })) return;
      if (e.state === 'roar') { if (e.timer <= 0) { e.state = 'chase'; e.timer = 1; } return; }
      const sp = speedOf(e, C) * (e.phase >= 3 ? 1.25 : 1);
      const d = Math.hypot(tgt.pos.x - e.x, tgt.pos.z - e.z);
      // candle imps from phase 2
      if (e.phase >= 2) { e.impT -= dt; if (e.impT <= 0 && C.enemies.filter((q) => q.alive && q.summoner === e).length < 3) { e.impT = 11; this.imps(e, C); } }
      if (e.state === 'chase') {
        toward(e, C, tgt, sp, dt, 2.2);
        if (e.timer > 0) return;
        const opts = ['slam'];
        if (d < 7) opts.push('spray');
        if (e.phase >= 3) opts.push('vent', 'vent');
        let a = pick(opts);
        if (a === e.lastAtk && opts.length > 1) a = pick(opts.filter((o) => o !== a));
        e.lastAtk = a;
        this[a](e, C, tgt);
      } else if (e.state === 'busy' && e.timer <= 0) { e.state = 'chase'; e.timer = rand(1.1, 1.8) / (e.phase >= 3 ? 1.3 : 1); }
    },
    // the snuffer comes down on a marked circle
    slam(e, C, tgt) {
      const x = tgt.pos.x, z = tgt.pos.z, r = 1.9;
      e.state = 'busy'; e.timer = 1.8; e.anim = 'slam'; e.animT = 0;
      e.faceTo(x, z);
      C.telegraphCircle(x, z, r, 1.15);
      C.bubble(e, pick([t('SNUFF!'), t('Lights OUT!'), t('Bonk time!')]), 1);
      later(e, 1.15, () => {
        hurtIn(C, e, (p) => Math.hypot(p.pos.x - x, p.pos.z - z) < r + 0.2 && p.actor.jumpY < 0.7, e.def.dmg * 1.3, { knock: 4, launch: 3 });
        C.vfx.shockwave(x, z, { r: r + 0.3, color: '#e8c46a', life: 0.5, wall: 0.8 });
        C.vfx.smoke(x, 0.4, z, { n: 10, color: '#8a8290', size: 0.5 });
        C.shakeAt(e, 0.5); C.sfx('thud', e);
      });
    },
    // a cone of hot wax, leaving puddles that burn
    spray(e, C, tgt) {
      const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, l = Math.hypot(dx, dz) || 1, dir = { x: dx / l, z: dz / l };
      e.state = 'busy'; e.timer = 1.9; e.anim = 'spray'; e.animT = 0;
      e.faceTo(tgt.pos.x, tgt.pos.z);
      cone(C, e.x, e.z, dir, 6.5, 0.95, 1.0, 0xffb040);
      later(e, 1.0, () => {
        hurtIn(C, e, (p) => { const px = p.pos.x - e.x, pz = p.pos.z - e.z, pd = Math.hypot(px, pz); return pd < 6.6 && (px * dir.x + pz * dir.z) / (pd || 1) > Math.cos(0.5); }, e.def.dmg, { knock: 3, elem: 'fire' });
        for (const k of [2.2, 3.8, 5.2]) {
          const s = (Math.random() - 0.5) * 1.6, x = e.x + dir.x * k - dir.z * s, z = e.z + dir.z * k + dir.x * s;
          hazard(C, { x, z, r: 0.9, life: 5, dmg: 0, elem: 'fire', color: 0xf4e4c0, spark: '#ffb040', edge: 0xc88a3a });
        }
        C.sfx('sizzle', e);
      });
    },
    // phase 3: it overheats — steam rings (jump them), and the boiler hatch opens
    vent(e, C) {
      e.state = 'busy'; e.timer = 2.6; e.anim = 'vent'; e.animT = 0;
      for (const [k, r] of [[0, 2.6], [0.55, 4.4], [1.1, 6.2]]) {
        later(e, k, () => {
          band(C, e.x, e.z, r, 0.7);
          later(e, 0.7, () => {
            hurtIn(C, e, (p) => { const pd = Math.hypot(p.pos.x - e.x, p.pos.z - e.z); return Math.abs(pd - r) < 0.8 && p.actor.jumpY < 0.5; }, e.def.dmg * 0.8, { knock: 3 });
            C.vfx.shockwave(e.x, e.z, { r, color: '#dff4ff', life: 0.4, wall: 0.5 });
          });
        });
      }
      e.exposed = 4.5;
      C.bubble(e, t('The boiler’s wide open! Don’t look!'), 1.8);
      C.sfx('geyser', e);
    },
    imps(e, C) {
      for (let i = 0; i < 2; i++) {
        const s = C.freeSpot(e.x + rand(-2, 2), e.z + 2, 2) || { x: e.x, z: e.z + 2 };
        const q = C.spawn('imp', s.x, s.z, { level: e.level });
        q.summoner = e;
      }
      C.bubble(e, t('Candle helpers, ASSEMBLE!'), 1.4);
    },
    pose(e, dt) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      e.animT = (e.animT || 0) + dt;
      const moving = e.state === 'chase';
      for (const [i, L] of u.legs.entries()) L.rotation.x = moving ? Math.sin(e.t * 6 + i * Math.PI) * 0.35 : 0;
      u.body.position.y = moving ? Math.abs(Math.sin(e.t * 6)) * 0.08 : 0;
      u.body.rotation.z = moving ? Math.sin(e.t * 6) * 0.04 : 0;
      // the snuffer arm: raised, then down; aimed forward for the spray
      let arm = -0.2;
      if (e.anim === 'slam') arm = e.animT < 1.1 ? -2.2 * Math.min(1, e.animT / 0.4) : e.animT < 1.25 ? 0.5 : 0.3;
      if (e.anim === 'spray') arm = e.animT < 1 ? -0.7 : -0.9 + Math.sin(e.t * 30) * 0.1;
      u.arm.rotation.x += (arm - u.arm.rotation.x) * Math.min(1, dt * 14);
      u.pilot.position.y = 0.1 + Math.abs(Math.sin(e.t * (e.phase >= 3 ? 14 : 4))) * 0.05;
      u.pilot.rotation.y = Math.sin(e.t * 2) * 0.4;
      u.hatch.material.emissiveIntensity = e.exposed > 0 ? 1.4 + Math.sin(e.t * 20) * 0.4 : e.phase >= 3 ? 0.5 : 0.15;
      for (const eye of u.eyes) eye.material.emissiveIntensity = e.phase >= 3 ? 1.4 + Math.sin(e.t * 16) * 0.5 : 1.3;
      if (Math.random() < dt * (e.phase >= 3 ? 12 : 4)) e.combat.world.fx.emit('smoke', e.x - 0.35, 3.3, e.z - 0.35, 1, { color: e.phase >= 3 ? '#5a4a5a' : '#8a8290' });
    },
  },
};

// ------------------------------------------------------------------ the Synchronised Swimmers
// (the pool is the room's: `e.pool = { cx, cz, r, a, full(), members }`, turned by
// the chapter's script, which also calls the routine)
function swimBrain() {
  return {
    init(e) { e.state = 'swim'; e.timer = 1; e.animT = 0; },
    onDeath(e, C) { exitStageLeft(e, C); e.immune = null; },
    think(e, dt, tgt, C) {
      tickLater(e, dt);
      e.immuneT = (e.immuneT || 0) - dt;
      const pool = e.pool;
      if (!pool) return;
      if (!pool.full()) {
        e.immune = null;
        if (e.state !== 'flop') { e.state = 'flop'; e.animT = 0; C.bubble(e, pick([t('Glub!'), t('Our ROUTINE!'), t('The water! Where’s the WATER?'), t('Brick is… a fish… out of water.')]), 1.6); C.sfx('thud', e); }
        return;
      }
      e.immune = 'Splash!';
      if (e.state === 'flop') { e.state = 'swim'; e.animT = 0; C.bubble(e, pick([t('Back in formation!'), t('And… a-one, a-two…'), t('Nobody saw that.')]), 1.4); }
      // (their places in the circle, turning)
      const alive = pool.members.filter((q) => q.alive), k = Math.max(0, alive.indexOf(e));
      const a = pool.a + (k / Math.max(1, alive.length)) * Math.PI * 2;
      const tx = pool.cx + Math.cos(a) * pool.r, tz = pool.cz + Math.sin(a) * pool.r * 0.7;
      const dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz);
      if (d > 0.05) { const sp = Math.min(d, speedOf(e, C) * dt * 1.4); e.x += (dx / d) * sp; e.z += (dz / d) * sp; }
      e.face = tgt ? { x: tgt.pos.x - e.x, z: tgt.pos.z - e.z } : { x: -Math.sin(a), z: Math.cos(a) };
    },
    pose(e, dt) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      e.animT = (e.animT || 0) + dt;
      if (e.state === 'flop') {
        // (flat on the wet tiles, feet kicking)
        u.body.rotation.x = -Math.min(1.45, e.animT * 5);
        u.body.position.y = 0.25;
        u.legs.forEach((L, i) => { L.rotation.x = Math.sin(e.t * 14 + i * Math.PI) * 0.5; });
        u.arms.forEach((A, i) => { A.rotation.z = (i ? -1 : 1) * (0.4 + Math.sin(e.t * 9) * 0.3); });
        return;
      }
      // (up to the chest in the water, arms sweeping in time)
      u.body.rotation.x = 0;
      u.body.position.y = -0.22 + Math.sin(e.t * 3 + e.x) * 0.06;
      u.arms.forEach((A, i) => { A.rotation.z = (i ? -1 : 1) * (2.4 + Math.sin(e.t * 4) * 0.5); A.rotation.x = Math.sin(e.t * 4 + i) * 0.3; });
      u.legs.forEach((L) => { L.rotation.x = 0; });
      if (Math.random() < dt * 4) e.combat.world.fx.emit('water', e.x, 0.3, e.z, 2);
    },
  };
}
TROUPE_BRAINS.swimminnow = swimBrain();
TROUPE_BRAINS.swimfidget = swimBrain();
TROUPE_BRAINS.swimbrick = swimBrain();

// their routines, called by the pool's script; `lead` carries the timers
export function swimRoutine(C, pool, name) {
  const alive = pool.members.filter((q) => q.alive), lead = alive[0];
  if (!lead) return;
  const dmg = lead.def.dmg * (C.enemyDmg || 1);
  if (name === 'jets') {
    // water jets from each of them, down marked lines at whoever is nearest
    for (const e of alive) {
      const p = C.alivePlayers().sort((a, b) => Math.hypot(a.pos.x - e.x, a.pos.z - e.z) - Math.hypot(b.pos.x - e.x, b.pos.z - e.z))[0];
      if (!p) continue;
      const dx = p.pos.x - e.x, dz = p.pos.z - e.z, l = Math.hypot(dx, dz) || 1, dir = { x: dx / l, z: dz / l }, o = { x: e.x, z: e.z };
      C.telegraphLine(o, dir, 11, 1.0);
      later(lead, 1.0, () => {
        for (let k = 1; k <= 11; k++) C.world.fx.emit('water', o.x + dir.x * k, 0.4, o.z + dir.z * k, 2);
        hurtIn(C, e, (q) => { const px = q.pos.x - o.x, pz = q.pos.z - o.z, u = px * dir.x + pz * dir.z; return u > 0 && u < 11 && Math.abs(px * dir.z - pz * dir.x) < 0.6; }, dmg, { knock: 4 });
        C.sfx('splash', lead);
      });
    }
    C.bubble(lead, pick([t('Fountain formation!'), t('And… SPOUT!')]), 1.2);
  } else if (name === 'lift') {
    // Brick lifts Minnow high… and she comes down on someone, with a big splash
    const brick = alive.find((q) => q.type === 'swimbrick') || lead, flyer = alive.find((q) => q.type === 'swimminnow') || lead;
    for (const p of C.alivePlayers().slice(0, 3)) {
      const x = p.pos.x, z = p.pos.z;
      C.zone({ x, z, r: 2.1, delay: 1.5, dmg: dmg * 1.3, knock: 5, kind: 'bomb', gloom: false, arc: { x: brick.x, y: 6, z: brick.z }, look: 'bubble' });
      later(lead, 1.5, () => { C.world.fx.emit('splash', x, 0.4, z, 24); C.vfx.shockwave(x, z, { r: 2.1, color: '#bfe8ff', life: 0.4, wall: 0.4 }); });
    }
    C.bubble(brick, t('The LIFT!'), 1.2);
    if (flyer !== brick) C.bubble(flyer, t('Wheee!'), 1.2);
    C.sfx('whoosh', brick);
  } else {
    // a wave from the middle of the pool, in rings: jump them
    for (const [k, r] of [[0, 3], [0.6, 5.5], [1.2, 8]]) {
      later(lead, k, () => {
        flat(C, new THREE.RingGeometry(Math.max(0.1, r - 0.6), r + 0.6, 40).rotateX(-Math.PI / 2), pool.cx, pool.cz, 0x8fd6e8, 0.7);
        later(lead, 0.7, () => {
          hurtIn(C, lead, (p) => Math.abs(Math.hypot(p.pos.x - pool.cx, p.pos.z - pool.cz) - r) < 0.8 && p.actor.jumpY < 0.5, dmg * 0.8, { knock: 3 });
          C.vfx.shockwave(pool.cx, pool.cz, { r, color: '#bfe8ff', life: 0.4, wall: 0.5 });
          C.sfx('splash', lead);
        });
      });
    }
    C.bubble(lead, pick([t('Everybody… WAVE!'), t('Ripple routine!')]), 1.2);
  }
}

// (a ring-shaped band, like the colossus’s)
function band(C, x, z, r, life) { return flat(C, new THREE.RingGeometry(Math.max(0.1, r - 0.6), r + 0.6, 40).rotateX(-Math.PI / 2), x, z, 0xdff4ff, life); }
