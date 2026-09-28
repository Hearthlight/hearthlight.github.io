// World v7, M13 — the world bosses: five giants of the wild, each in its own land, waking
// when heroes come near (party/lairs.js: `world: true`), announced to the whole party and
// scaled for one hero or eight. Three phases each; every blow is shown before it lands.
//   thunderhoof  Old Thunderhoof (the Golden Steppe): a gloom bison as big as a barn —
//                charges along a marked lane, stomps, and from phase 2 a stampede of gloom
//                calves across marked lines; phase 3 the ground quakes in rings (jump them)
//   papertiger   the Paper Tiger (the Jade Terraces): an origami tiger — pounces on marked
//                circles, swipes a cone, spatters ink that slows; phase 2 folds paper cranes;
//                phase 3 folds itself flat and skates the arena’s edge. Fire hurts it double
//   moonmoth     the Moonmoth (Elderbough): a pale moth the size of a cottage — wing gusts,
//                moon-dust that slows, a dive; phase 2 its mothlings; phase 3 a moonbeam that
//                sweeps round (jump it)
//   behemoth     the Crystal Behemoth (Prism Springs): turns slowly, and its back is glass —
//                hits from behind do nearly double; prism beams fan out, crystals erupt under
//                you; phase 3 a ring of shards round it
//   aurorawyrm   the Aurora Wyrm (the Aurora Tundra): burrows (untouchable — a ripple in the
//                snow hunts you), erupts on a marked circle, breathes frost; phase 3 the aurora
//                itself comes down in bands across the ground

import { THREE } from '../../render/r3d.js';
import { toward, hover, speedOf } from '../v3/ai.js';
import { flat, cone, later, tickLater, hurtIn, checkPhase, leash } from '../v3/bosses.js';
import { t } from '../../i18n.js';
import { wingGeo } from './moths.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const norm = (x, z) => { const l = Math.hypot(x, z) || 1; return { x: x / l, z: z / l }; };

export const WORLD_BOSSES = {
  thunderhoof: { name: 'Old Thunderhoof', title: 'Old Thunderhoof', hp: 1900, speed: 1.9, r: 1.5, h: 2.6, dmg: 28, xp: 320, cost: 99, boss: true, knockRes: 1 },
  papertiger: { name: 'Paper Tiger', title: 'The Paper Tiger', hp: 1700, speed: 3.0, r: 1.1, h: 2.0, dmg: 26, xp: 320, cost: 99, boss: true, knockRes: 1 },
  moonmoth: { name: 'Moonmoth', title: 'The Moonmoth', hp: 1800, speed: 2.6, r: 1.3, h: 3.4, dmg: 25, xp: 340, cost: 99, boss: true, flying: true, knockRes: 1 },
  behemoth: { name: 'Crystal Behemoth', title: 'The Crystal Behemoth', hp: 2100, speed: 1.3, r: 1.7, h: 3.0, dmg: 31, xp: 360, cost: 99, boss: true, knockRes: 1 },
  aurorawyrm: { name: 'Aurora Wyrm', title: 'The Aurora Wyrm', hp: 1900, speed: 3.6, r: 1.2, h: 2.2, dmg: 29, xp: 360, cost: 99, boss: true, knockRes: 1, elem: 'ice' },
  // (not a boss: the rare Sir Reginald is one — party/rares.js)
  gloomhen: { name: 'Gloom Hen', hp: 240, speed: 2.8, r: 0.7, h: 1.5, dmg: 20, xp: 40, cost: 6, knockRes: 0.6 },
};

// ------------------------------------------------------------------ models
const mats = new Map();
function mat(r3d, c, e = null, ei = 1) {
  const k = c + '|' + e + '|' + ei;
  if (!mats.has(k)) mats.set(k, new THREE.MeshToonMaterial({ color: c, emissive: e || 0x000000, emissiveIntensity: e ? ei : 1, gradientMap: r3d.gradient }));
  return mats.get(k);
}
function own(g) { g.traverse((m) => { if (m.isMesh) m.material = Array.isArray(m.material) ? m.material.map((q) => q.clone()) : m.material.clone(); }); return g; }
function box(g, w, h, d, m, x, y, z) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; g.add(b); return b; }
function ball(g, r, m, x, y, z, sx = 1, sy = 1, sz = 1) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), m); b.position.set(x, y, z); b.scale.set(sx, sy, sz); b.castShadow = true; g.add(b); return b; }
function gem(g, r, m, x, y, z, sx = 1, sy = 1, sz = 1) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), m); b.position.set(x, y, z); b.scale.set(sx, sy, sz); b.castShadow = true; g.add(b); return b; }
function spike(g, r, h, m, x, y, z, rx = 0, rz = 0, n = 5) { const b = new THREE.Mesh(new THREE.ConeGeometry(r, h, n), m); b.position.set(x, y, z); b.rotation.set(rx, 0, rz); b.castShadow = true; g.add(b); return b; }
const grp = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
const GLOOM = '#a86ae0';

// a pale moon-moth wing (cut out of its painting), and a gloom calf for the stampede
let moonWing = null;
function moonWingMaterial(r3d) {
  if (!moonWing) {
    const c = document.createElement('canvas'); c.width = 32; c.height = 24;
    const g = c.getContext('2d');
    g.beginPath(); g.moveTo(0, 8); g.quadraticCurveTo(10, -2, 30, 3); g.quadraticCurveTo(34, 14, 26, 22); g.quadraticCurveTo(12, 25, 0, 16); g.closePath();
    g.save(); g.clip();
    g.fillStyle = '#d8d8f0'; g.fillRect(0, 0, 32, 24);
    g.fillStyle = '#b8b8e0'; for (let x = 0; x < 32; x += 5) g.fillRect(x, 0, 1, 24);
    g.fillStyle = '#f4f4ff'; g.fillRect(0, 19, 32, 5);
    // (a crescent moon on each wing)
    g.fillStyle = '#fff4c0'; g.beginPath(); g.arc(20, 10, 6, 0, 6.3); g.fill();
    g.fillStyle = '#d8d8f0'; g.beginPath(); g.arc(23, 8, 5, 0, 6.3); g.fill();
    g.restore();
    g.strokeStyle = '#6a6a9a'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, 8); g.quadraticCurveTo(10, -2, 30, 3); g.quadraticCurveTo(34, 14, 26, 22); g.quadraticCurveTo(12, 25, 0, 16); g.stroke();
    moonWing = new THREE.CanvasTexture(c); moonWing.magFilter = THREE.NearestFilter; moonWing.minFilter = THREE.NearestFilter;
  }
  return new THREE.MeshToonMaterial({ map: moonWing, gradientMap: r3d.gradient, side: THREE.DoubleSide, alphaTest: 0.5, emissive: 0x8a8ac8, emissiveIntensity: 0.35 });
}
function calfMesh(r3d) {
  const g = new THREE.Group();
  const hide = mat(r3d, '#3a2a3a'), eye = mat(r3d, '#e8d0ff', GLOOM, 1.8);
  box(g, 0.8, 0.7, 1.2, hide, 0, 0.55, 0);
  box(g, 0.5, 0.45, 0.5, hide, 0, 0.75, 0.75);
  for (const s of [-1, 1]) box(g, 0.08, 0.06, 0.02, eye, s * 0.14, 0.82, 1.0);
  for (const [x, z] of [[-0.25, -0.4], [0.25, -0.4], [-0.25, 0.4], [0.25, 0.4]]) box(g, 0.18, 0.35, 0.18, hide, x, 0.18, z);
  return g;
}

export const WORLD_MODELS = {
  // a hen as big as a pony, grey with gloom, violet eyes and a very bad temper
  gloomhen(r3d) {
    const g = new THREE.Group(), body = grp(g, 0, 0, 0);
    const feather = mat(r3d, '#b8b0c0'), featherD = mat(r3d, '#8a8098'), red = mat(r3d, '#c8383e'), beak = mat(r3d, '#f2c14e'), eye = mat(r3d, '#e8d0ff', GLOOM, 2);
    ball(body, 0.7, feather, 0, 0.95, -0.1, 1, 0.9, 1.2);
    const head = grp(body, 0, 1.55, 0.55);
    ball(head, 0.36, feather, 0, 0, 0);
    box(head, 0.12, 0.3, 0.36, red, 0, 0.38, 0);
    box(head, 0.2, 0.14, 0.26, beak, 0, -0.04, 0.38);
    box(head, 0.1, 0.18, 0.08, red, 0, -0.22, 0.32);
    for (const s of [-1, 1]) box(head, 0.08, 0.08, 0.02, eye, s * 0.17, 0.08, 0.32);
    const wings = [];
    for (const s of [-1, 1]) { const W = grp(body, s * 0.62, 1.05, -0.1); box(W, 0.12, 0.5, 0.9, featherD, 0, 0, 0); wings.push(W); }
    const tail = grp(body, 0, 1.25, -0.9); box(tail, 0.5, 0.6, 0.2, featherD, 0, 0.1, 0).rotation.x = -0.5;
    const legs = [];
    for (const s of [-1, 1]) { const L = grp(body, s * 0.25, 0.45, 0.05); box(L, 0.08, 0.45, 0.08, beak, 0, -0.22, 0); box(L, 0.22, 0.05, 0.3, beak, 0, -0.44, 0.05); legs.push(L); }
    g.userData = { body, head, wings, legs, tail };
    return own(g);
  },
  // a gloom bison: a great humped back and shaggy mane, bone horns, violet eyes
  thunderhoof(r3d) {
    const g = new THREE.Group(), body = grp(g, 0, 0, 0);
    const hide = mat(r3d, '#7a5440'), shag = mat(r3d, '#4a3024'), bone = mat(r3d, '#efe4c8'), hoof = mat(r3d, '#2a2024'), eye = mat(r3d, '#e8d0ff', GLOOM, 2);
    box(body, 2.2, 1.5, 3.0, hide, 0, 1.75, -0.2);
    ball(body, 1.25, shag, 0, 2.55, 0.7, 1.1, 0.9, 1.1);
    for (let i = 0; i < 6; i++) box(body, 0.5, 0.9, 0.3, shag, -1 + i * 0.4, 1.65, 1.35).rotation.x = 0.2;
    const head = grp(body, 0, 1.55, 1.75);
    box(head, 1.0, 0.95, 1.1, hide, 0, 0, 0.3);
    box(head, 0.8, 0.5, 0.4, shag, 0, -0.55, 0.45);
    for (const s of [-1, 1]) {
      const H = grp(head, s * 0.55, 0.35, 0.2);
      spike(H, 0.16, 0.9, bone, s * 0.3, 0.1, 0, 0, -s * 1.3, 6);
      spike(H, 0.1, 0.5, bone, s * 0.62, 0.45, 0, 0, -s * 0.3, 6);
      box(head, 0.12, 0.08, 0.02, eye, s * 0.28, 0.12, 0.86);
    }
    const legs = [];
    for (const [x, z] of [[-0.75, -1.2], [0.75, -1.2], [-0.75, 0.9], [0.75, 0.9]]) { const L = grp(body, x, 1.1, z); box(L, 0.5, 1.0, 0.55, hide, 0, -0.5, 0); box(L, 0.56, 0.2, 0.6, hoof, 0, -1.0, 0); legs.push(L); }
    const tail = grp(body, 0, 2.1, -1.75); box(tail, 0.12, 0.9, 0.12, hide, 0, -0.4, 0); box(tail, 0.26, 0.3, 0.26, shag, 0, -0.9, 0);
    const wisps = [];
    for (let i = 0; i < 4; i++) { const w = ball(g, 0.35, mat(r3d, '#6a4a8e', '#4a2a6e', 0.6), 0, 3, 0); w.castShadow = false; wisps.push(w); }
    g.userData = { body, head, legs, tail, wisps };
    return own(g);
  },
  // an origami tiger: folded white paper with orange panels and ink stripes, triangle ears
  papertiger(r3d) {
    const g = new THREE.Group(), body = grp(g, 0, 0, 0);
    const paper = mat(r3d, '#f4ecd8'), orange = mat(r3d, '#f08a3a'), ink = mat(r3d, '#1e1a22'), eye = mat(r3d, '#ffe08a', '#ffb040', 1.4);
    const torso = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), orange); torso.scale.set(0.8, 0.6, 1.4); torso.position.set(0, 1.2, 0); torso.castShadow = true; body.add(torso);
    box(body, 1.0, 0.3, 2.0, paper, 0, 0.95, 0);
    for (let i = 0; i < 4; i++) box(body, 1.04, 0.62, 0.12, ink, 0, 1.2, -0.7 + i * 0.45).rotation.x = 0.3;
    const head = grp(body, 0, 1.5, 1.35);
    const hd = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 0), orange); hd.scale.set(1, 0.85, 1); hd.castShadow = true; head.add(hd);
    box(head, 0.7, 0.3, 0.4, paper, 0, -0.25, 0.35);
    for (const s of [-1, 1]) { spike(head, 0.22, 0.45, orange, s * 0.35, 0.55, -0.05, 0, 0, 3); box(head, 0.14, 0.1, 0.04, eye, s * 0.22, 0.1, 0.52); box(head, 0.3, 0.05, 0.04, ink, s * 0.35, -0.05, 0.5).rotation.z = s * 0.3; }
    const legs = [];
    for (const [x, z] of [[-0.4, -0.7], [0.4, -0.7], [-0.4, 0.75], [0.4, 0.75]]) { const L = grp(body, x, 0.9, z); box(L, 0.28, 0.9, 0.3, paper, 0, -0.45, 0); box(L, 0.3, 0.2, 0.36, orange, 0, -0.85, 0.05); legs.push(L); }
    const tail = grp(body, 0, 1.3, -1.1);
    for (let i = 0; i < 4; i++) box(tail, 0.18, 0.18, 0.45, i % 2 ? ink : orange, 0, 0.2 + i * 0.22, -0.3 - i * 0.3).rotation.x = -0.6;
    g.userData = { body, head, legs, tail, torso };
    return own(g);
  },
  // a great pale moth: silver fur, a crescent on its back, four moon-painted wings
  moonmoth(r3d) {
    const g = new THREE.Group(), body = grp(g, 0, 2.2, 0);
    const fur = mat(r3d, '#c8c8e0'), furD = mat(r3d, '#9a9ac0'), moon = mat(r3d, '#fff4c0', '#ffe08a', 1.2), eye = mat(r3d, '#e0f0ff', '#9fd0ff', 1.8), leg = mat(r3d, '#5a5a7a');
    ball(body, 0.7, fur, 0, 0, -0.25, 1, 0.9, 1.6);
    ball(body, 0.55, furD, 0, 0.1, 0.6, 1.1, 1, 0.9);
    const cres = grp(body, 0, 0.62, -0.2);
    box(cres, 0.12, 0.1, 0.7, moon, 0.16, 0, 0).rotation.y = 0.3; box(cres, 0.12, 0.1, 0.7, moon, -0.12, 0, 0.05).rotation.y = -0.2;
    const head = grp(body, 0, 0.2, 1.15);
    ball(head, 0.42, fur, 0, 0, 0);
    for (const s of [-1, 1]) { ball(head, 0.16, eye, s * 0.22, 0.08, 0.28); const A = grp(head, s * 0.15, 0.32, 0.1); box(A, 0.05, 0.9, 0.05, furD, 0, 0.45, 0).rotation.z = -s * 0.3; for (let k = 0; k < 6; k++) box(A, 0.34, 0.03, 0.03, furD, s * 0.12, 0.25 + k * 0.12, 0).rotation.z = -s * 0.45; }
    for (let k = 0; k < 3; k++) for (const s of [-1, 1]) box(body, 0.05, 0.6, 0.05, leg, s * 0.45, -0.45, 0.3 - k * 0.35).rotation.z = s * 0.6;
    const wm = moonWingMaterial(r3d), wings = [];
    for (const [s, f] of [[-1, 0], [1, 0], [-1, 1], [1, 1]]) {
      const W = grp(body, s * 0.4, 0.1, f ? -0.8 : 0.25);
      const w = new THREE.Mesh(wingGeo(f ? 2.6 : 3.3, f ? 1.9 : 2.4), wm);
      w.position.set(s * (f ? 1.3 : 1.65), 0, f ? -0.3 : 0); if (s < 0) w.scale.x = -1; w.castShadow = true;
      W.add(w); wings.push({ W, s, f });
    }
    g.userData = { body, head, wings };
    return own(g);
  },
  // a crystal beast on four pillar legs: pink facets, a mane of cyan spikes — and at its
  // rear, a glowing core behind thin glass (its weak spot)
  behemoth(r3d) {
    const g = new THREE.Group(), body = grp(g, 0, 0, 0);
    const pink = mat(r3d, '#e8a8d8', '#c878c0', 0.35), pinkD = mat(r3d, '#b878b0'), cyan = mat(r3d, '#a8f0ff', '#58c8f0', 0.8), stone = mat(r3d, '#6a6078'), core = mat(r3d, '#fff4c8', '#ffd66b', 1.6);
    gem(body, 1.4, pink, 0, 2.0, 0, 1.25, 0.85, 1.55);
    gem(body, 0.9, pinkD, 0, 2.5, 0.4, 1, 0.8, 1);
    const head = grp(body, 0, 2.0, 2.0);
    gem(head, 0.75, pink, 0, 0, 0.2, 1, 0.85, 1.1);
    for (const s of [-1, 1]) { spike(head, 0.14, 0.7, cyan, s * 0.45, 0.55, 0, 0, -s * 0.5, 4); box(head, 0.14, 0.1, 0.04, core, s * 0.28, 0.1, 0.9); }
    for (let i = 0; i < 7; i++) { const a = (i / 6 - 0.5) * 1.4; spike(body, 0.2 + (i % 2) * 0.08, 1.1 + (i % 3) * 0.4, cyan, Math.sin(a) * 0.9, 2.8 + Math.cos(a) * 0.3, 0.9 - i * 0.35, 0, -a * 0.6, 4); }
    // (the core, at the back, behind a glassy plate)
    const coreM = ball(body, 0.42, core, 0, 2.1, -1.95);
    coreM.castShadow = false;
    const legs = [];
    for (const [x, z] of [[-0.9, -1.1], [0.9, -1.1], [-0.9, 1.1], [0.9, 1.1]]) { const L = grp(body, x, 1.4, z); box(L, 0.6, 1.4, 0.6, stone, 0, -0.7, 0); gem(L, 0.35, pinkD, 0, -0.15, 0.15); legs.push(L); }
    g.userData = { body, head, legs, core: coreM };
    return own(g);
  },
  // an ice serpent: a horned head, a trail of body segments, aurora-coloured fins
  aurorawyrm(r3d) {
    const g = new THREE.Group(), root = grp(g, 0, 0, 0);
    const ice = mat(r3d, '#c8e8ff'), iceD = mat(r3d, '#8ab8e0'), eye = mat(r3d, '#e0fff8', '#6affd0', 2), horn = mat(r3d, '#f4f8ff');
    const fins = ['#6aff9a', '#8af0d0', '#b08aff'].map((c) => mat(r3d, c, c, 0.9));
    const head = grp(root, 0, 1.1, 0);
    box(head, 1.1, 0.8, 1.4, ice, 0, 0, 0.2);
    box(head, 0.9, 0.3, 0.7, iceD, 0, -0.45, 0.55);
    for (const s of [-1, 1]) { spike(head, 0.14, 0.9, horn, s * 0.4, 0.55, -0.3, -0.7, -s * 0.3, 5); box(head, 0.16, 0.12, 0.04, eye, s * 0.3, 0.12, 0.92); }
    const segs = [];
    for (let i = 0; i < 7; i++) {
      const r0 = 0.62 - i * 0.06, S = grp(root, 0, 0.8, -1 - i * 0.9);
      ball(S, r0, i % 2 ? iceD : ice, 0, 0, 0, 1, 0.85, 1.1);
      spike(S, 0.16, 0.7, fins[i % 3], 0, r0 * 0.9, 0, -0.3, 0, 4);
      segs.push(S);
    }
    g.userData = { root, head, segs };
    return own(g);
  },
};

// ------------------------------------------------------------------ helpers
// something rolling or running along a lane, hurting whoever it meets once
function runner(C, e, { x, z, dir, speed, len, mesh, dmg, r = 1, delay = 0.9, knock = 5 }) {
  (e.runners || (e.runners = [])).push({ x, z, dir, speed, len, mesh, dmg, r, t: -delay, gone: 0, hit: new Set(), knock });
}
function tickRunners(C, e, dt) {
  if (!e.runners) return;
  for (const R of e.runners) {
    R.t += dt;
    if (R.t < 0) continue;
    if (!R.on) { R.on = true; R.mesh.position.set(R.x, 0, R.z); R.mesh.rotation.y = Math.atan2(R.dir.x, R.dir.z); C.root.add(R.mesh); }
    const step = R.speed * dt;
    R.x += R.dir.x * step; R.z += R.dir.z * step; R.gone += step;
    R.mesh.position.set(R.x, Math.abs(Math.sin(R.t * 14)) * 0.12, R.z);
    for (const p of C.alivePlayers()) if (!R.hit.has(p) && Math.hypot(p.pos.x - R.x, p.pos.z - R.z) < R.r && p.actor.jumpY < 0.6) { R.hit.add(p); C.hurtPlayer(p, R.dmg * (C.enemyDmg || 1), { dir: R.dir, knock: R.knock, src: e }); }
    if (Math.random() < dt * 12) C.world.fx.emit('dust', R.x, 0.2, R.z, 1);
    if (R.gone > R.len) { R.done = true; C.root.remove(R.mesh); C.world.fx.emit('smoke', R.x, 0.6, R.z, 4, { color: '#6a4a8e' }); }
  }
  e.runners = e.runners.filter((R) => !R.done);
}
// rings expanding from a point, one after another (jump them)
function quakeRings(C, e, x, z, n, color, elem = null) {
  for (let i = 0; i < n; i++) {
    const r = 2.4 + i * 2.2;
    later(e, i * 0.45, () => flat(C, new THREE.RingGeometry(Math.max(0.1, r - 0.7), r + 0.7, 40).rotateX(-Math.PI / 2), x, z, 0xff5a6a, 0.8));
    later(e, 0.8 + i * 0.45, () => {
      C.vfx.shockwave(x, z, { r, color, life: 0.5, wall: 0.9 });
      hurtIn(C, e, (p) => Math.abs(Math.hypot(p.pos.x - x, p.pos.z - z) - r) < 0.8 && p.actor.jumpY < 0.7, e.def.dmg * 0.6, { knock: 2, launch: 7, elem });
      C.sfx('thud', e);
    });
  }
}
// a line from a point: those near it (and on the ground) get hurt
function onLine(p, x, z, dir, len, w) {
  const px = p.pos.x - x, pz = p.pos.z - z, along = px * dir.x + pz * dir.z;
  if (along < 0 || along > len) return false;
  return Math.abs(px * dir.z - pz * dir.x) < w;
}
// turn slowly toward a point (radians per second)
function turnToward(e, x, z, rate, dt) {
  const want = Math.atan2(x - e.x, z - e.z), cur = Math.atan2(e.face.x, e.face.z);
  let d = want - cur; d = Math.atan2(Math.sin(d), Math.cos(d));
  const a = cur + Math.max(-rate * dt, Math.min(rate * dt, d));
  e.face = { x: Math.sin(a), z: Math.cos(a) };
  return Math.abs(d);
}

// ------------------------------------------------------------------ brains
export const WORLD_BRAINS = {
  // pecks (a short cone), a flap of both wings (a ring round it: jump), eggs lobbed at you
  gloomhen: {
    init(e) { e.state = 'chase'; e.timer = rand(1, 1.6); },
    think(e, dt, tgt, C) {
      tickLater(e, dt);
      if (!tgt) return;
      e.timer -= dt;
      if (e.state === 'chase') {
        const d = toward(e, C, tgt, speedOf(e, C), dt, 1.4);
        if (e.timer > 0) return;
        const r = Math.random();
        if (d < 2.4 && r < 0.55) {
          const dir = norm(tgt.pos.x - e.x, tgt.pos.z - e.z);
          e.state = 'busy'; e.timer = 0.9; e.face = dir; e.peck = 0.6;
          cone(C, e.x, e.z, dir, 2.4, 1.2, 0.55, 0xff5a6a);
          later(e, 0.55, () => { hurtIn(C, e, (p) => { const px = p.pos.x - e.x, pz = p.pos.z - e.z, dd = Math.hypot(px, pz); return dd < 2.4 && (px * dir.x + pz * dir.z) / (dd || 1) > Math.cos(0.6); }, e.def.dmg * (e.dmgMul || 1), { knock: 3 }); C.sfx('cluck', e); });
        } else if (r < 0.8) {
          e.state = 'busy'; e.timer = 1.3; e.flap = 1;
          flat(C, new THREE.RingGeometry(1.4, 2.8, 32).rotateX(-Math.PI / 2), e.x, e.z, 0xff5a6a, 0.8);
          later(e, 0.8, () => { hurtIn(C, e, (p) => { const dd = Math.hypot(p.pos.x - e.x, p.pos.z - e.z); return dd > 1.2 && dd < 3 && p.actor.jumpY < 0.5; }, e.def.dmg * 0.8 * (e.dmgMul || 1), { knock: 6 }); C.vfx.shockwave(e.x, e.z, { r: 2.8, color: '#e8e0f0', life: 0.35, wall: 0.5 }); C.sfx('whoosh', e); });
        } else {
          e.state = 'busy'; e.timer = 1.2;
          for (let k = 0; k < 3; k++) C.zone({ x: tgt.pos.x + rand(-1.6, 1.6), z: tgt.pos.z + rand(-1.6, 1.6), r: 1.0, delay: 1.0 + k * 0.15, dmg: e.def.dmg * 0.7 * (e.dmgMul || 1) * (C.enemyDmg || 1), knock: 2, kind: 'bomb', gloom: true, arc: { x: e.x, y: 1.2, z: e.z }, look: 'bomb' });
          C.bubble(e, pick([t('BAWK!'), t('Bu-GAWK!')]), 0.8);
        }
      } else if (e.timer <= 0) { e.state = 'chase'; e.timer = rand(0.9, 1.5); }
    },
    pose(e, dt) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      e.peck = Math.max(0, (e.peck || 0) - dt); e.flap = Math.max(0, (e.flap || 0) - dt);
      u.head.rotation.x = e.peck > 0 ? 0.6 : Math.sin(e.t * 6) * 0.1;
      u.wings.forEach((W, i) => { W.rotation.z = (i ? -1 : 1) * (e.flap > 0 ? 0.6 + Math.sin(e.t * 30) * 0.5 : 0.1); });
      const walk = e.state === 'chase' ? Math.sin(e.t * 12) : 0;
      u.legs.forEach((L, i) => { L.rotation.x = walk * (i ? 0.5 : -0.5); });
      u.body.position.y = Math.abs(walk) * 0.05;
    },
  },
  thunderhoof: {
    init(e) { e.state = 'chase'; e.timer = 1.8; e.phase = 1; e.last = null; },
    think(e, dt, tgt, C) {
      tickLater(e, dt); tickRunners(C, e, dt);
      if (e.state !== 'charging') leash(e, C);
      if (e.state !== 'roar' && e.state !== 'charging' && checkPhase(e, C, (ph) => { C.bubble(e, ph === 2 ? t('The herd is coming!') : t('The ground itself is angry!'), 2); this.stampede(e, C, ph === 2 ? 3 : 5); })) return;
      if (e.state === 'roar') { if (e.timer <= 0) { e.state = 'chase'; e.timer = 1; } return; }
      if (e.state === 'windup') { if (e.timer <= 0) { e.state = 'charging'; e.chargeLeft = e.chargeLen; e.hit = new Set(); C.sfx('stomp', e); } return; }
      if (e.state === 'charging') {
        const step = Math.min(e.chargeLeft, 13 * dt);
        C.moveEnemy(e, e.chargeDir.x * step, e.chargeDir.z * step, true);
        e.chargeLeft -= step;
        if (Math.random() < dt * 20) C.world.fx.emit('dust', e.x, 0.3, e.z, 2);
        for (const p of C.alivePlayers()) if (!e.hit.has(p) && Math.hypot(p.pos.x - e.x, p.pos.z - e.z) < e.def.r + 0.8) { e.hit.add(p); C.hurtPlayer(p, e.def.dmg * 1.2 * (C.enemyDmg || 1), { dir: e.chargeDir, knock: 8, src: e }); p.actor.jumpV = Math.max(p.actor.jumpV, 4); }
        if (e.chargeLeft <= 0.01) { e.state = 'busy'; e.timer = 1.0; C.shakeAt(e, 0.4); C.sfx('thud', e); }
        return;
      }
      if (!tgt) return;
      if (e.state === 'chase') {
        const d = toward(e, C, tgt, speedOf(e, C) * (e.phase >= 3 ? 1.25 : 1), dt, 3);
        if (e.timer > 0) return;
        const opts = d < 3.8 ? ['stomp', 'stomp', 'charge'] : ['charge', 'charge', 'stomp'];
        if (e.phase >= 2) opts.push('stampede');
        if (e.phase >= 3) opts.push('quake', 'quake');
        let a = pick(opts);
        if (a === e.last && opts.length > 1) a = pick(opts.filter((o) => o !== a));
        e.last = a;
        if (a === 'stampede') this.stampede(e, C, e.phase >= 3 ? 5 : 3);
        else this[a](e, C, tgt);
      } else if (e.state === 'busy' && e.timer <= 0) { e.state = 'chase'; e.timer = rand(1.2, 1.9) / (e.phase >= 3 ? 1.3 : 1); }
    },
    // a lane marked on the ground, a snort — and then the whole barn comes down it
    charge(e, C, tgt) {
      const dir = norm(tgt.pos.x - e.x, tgt.pos.z - e.z), len = Math.min(15, Math.hypot(tgt.pos.x - e.x, tgt.pos.z - e.z) + 5);
      e.state = 'windup'; e.timer = 1.0; e.face = dir; e.chargeDir = dir; e.chargeLen = len;
      C.telegraphLine(e, dir, len, 1.0);
      C.bubble(e, pick([t('SNORT!'), t('HRRUMPH!')]), 0.9);
      C.sfx('growl', e);
    },
    stomp(e, C) {
      e.state = 'busy'; e.timer = 1.5; e.rear = 0.9;
      C.telegraphCircle(e.x, e.z, 3.6, 0.9);
      later(e, 0.9, () => { hurtIn(C, e, (p) => Math.hypot(p.pos.x - e.x, p.pos.z - e.z) < 3.6 && p.actor.jumpY < 0.6, e.def.dmg, { knock: 5, launch: 3 }); C.vfx.shockwave(e.x, e.z, { r: 3.8, color: '#c8a878', life: 0.5, wall: 1 }); C.shakeAt(e, 0.6); C.sfx('slam', e); });
    },
    // gloom calves pour across the plain on marked lanes
    stampede(e, C, n) {
      e.state = 'busy'; e.timer = 2.2;
      const ps = C.alivePlayers();
      for (let k = 0; k < n; k++) {
        const p = ps[k % Math.max(1, ps.length)], at = p ? { x: p.pos.x + rand(-1.5, 1.5), z: p.pos.z + rand(-1.5, 1.5) } : { x: e.x, z: e.z };
        const a = Math.random() * Math.PI * 2, dir = { x: Math.cos(a), z: Math.sin(a) };
        const sx = at.x - dir.x * 12, sz = at.z - dir.z * 12;
        C.telegraphLine({ x: sx, z: sz }, dir, 24, 1.1 + k * 0.15);
        runner(C, e, { x: sx, z: sz, dir, speed: 11, len: 24, mesh: calfMesh(C.r3d), dmg: e.def.dmg * 0.7, r: 1.0, delay: 1.1 + k * 0.15 });
      }
      C.sfx('stomp', e);
    },
    quake(e, C) { e.state = 'busy'; e.timer = 2.6; e.rear = 1.2; C.bubble(e, t('The ground itself is angry!'), 1.4); quakeRings(C, e, e.x, e.z, 3, '#c8a878'); },
    pose(e, dt) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      const run = e.state === 'charging' ? 3 : e.state === 'chase' ? 1 : 0;
      u.legs.forEach((L, i) => { L.rotation.x = run ? Math.sin(e.t * (6 + run * 3) + (i % 2) * Math.PI + (i > 1 ? 0.5 : 0)) * 0.35 * Math.min(1.6, run) : 0; });
      e.rear = Math.max(0, (e.rear || 0) - dt);
      u.body.rotation.x = e.rear > 0.4 ? -0.25 : e.state === 'windup' ? 0.12 : 0;
      u.head.rotation.x = e.state === 'windup' || e.state === 'charging' ? 0.45 : Math.sin(e.t * 1.5) * 0.05;
      u.tail.rotation.x = Math.sin(e.t * 4) * 0.3;
      u.wisps.forEach((w, i) => { const a = e.t * 0.8 + i * 1.57; w.position.set(Math.cos(a) * 2.2, 2.6 + Math.sin(e.t * 2 + i) * 0.4, Math.sin(a) * 2.2); });
    },
  },

  papertiger: {
    init(e) { e.state = 'chase'; e.timer = 1.5; e.phase = 1; e.last = null; },
    think(e, dt, tgt, C) {
      tickLater(e, dt); tickRunners(C, e, dt);
      if (e.state !== 'skate') leash(e, C);
      if (e.state !== 'roar' && e.state !== 'skate' && e.state !== 'leap' && checkPhase(e, C, (ph) => { C.bubble(e, ph === 2 ? t('Fold, cranes! FOLD!') : t('Now I am… FLAT.'), 2); if (ph === 2) this.cranes(e, C, 3); })) return;
      if (e.state === 'roar') { if (e.timer <= 0) { e.state = 'chase'; e.timer = 1; } return; }
      if (e.state === 'leap') {
        const L = e.leap; L.t += dt;
        const k = Math.min(1, L.t / L.dur);
        e.x = L.x0 + (L.x1 - L.x0) * k; e.z = L.z0 + (L.z1 - L.z0) * k; e.y = Math.sin(k * Math.PI) * 3;
        if (k >= 1) { e.y = 0; e.state = 'busy'; e.timer = 0.9; hurtIn(C, e, (p) => Math.hypot(p.pos.x - e.x, p.pos.z - e.z) < 2.3, e.def.dmg * 1.1, { knock: 6, launch: 3 }); C.vfx.shockwave(e.x, e.z, { r: 2.4, color: '#f4ecd8', life: 0.4, wall: 0.6 }); C.sfx('thud', e); C.shakeAt(e, 0.4); }
        return;
      }
      if (e.state === 'skate') {
        const S = e.skate, seg = S.pts[S.i], nx = S.pts[S.i + 1];
        if (!nx) { e.state = 'busy'; e.timer = 0.6; e.flat = 0; return; }
        const dir = norm(nx.x - seg.x, nx.z - seg.z), step = 14 * dt;
        e.x += dir.x * step; e.z += dir.z * step; e.face = dir;
        for (const p of C.alivePlayers()) if (!S.hit.has(p) && Math.hypot(p.pos.x - e.x, p.pos.z - e.z) < 1.4 && p.actor.jumpY < 0.5) { S.hit.add(p); C.hurtPlayer(p, e.def.dmg * (C.enemyDmg || 1), { dir, knock: 6, src: e }); }
        if (Math.hypot(nx.x - e.x, nx.z - e.z) < step + 0.1) { e.x = nx.x; e.z = nx.z; S.i++; S.hit = new Set(); }
        return;
      }
      if (!tgt) return;
      if (e.state === 'chase') {
        const d = toward(e, C, tgt, speedOf(e, C) * (e.phase >= 3 ? 1.2 : 1), dt, 2.2);
        if (e.timer > 0) return;
        const opts = d < 3.2 ? ['swipe', 'swipe', 'pounce'] : ['pounce', 'ink', 'pounce'];
        if (e.phase >= 2) opts.push('ink', 'cranes');
        if (e.phase >= 3) opts.push('fold', 'fold');
        let a = pick(opts);
        if (a === e.last && opts.length > 1) a = pick(opts.filter((o) => o !== a));
        e.last = a;
        this[a](e, C, tgt, a === 'cranes' ? 2 : 0);
      } else if (e.state === 'busy' && e.timer <= 0) { e.state = 'chase'; e.timer = rand(1, 1.6) / (e.phase >= 3 ? 1.25 : 1); }
    },
    pounce(e, C, tgt) {
      const x1 = tgt.pos.x, z1 = tgt.pos.z;
      e.state = 'busy'; e.timer = 99;
      C.telegraphCircle(x1, z1, 2.3, 0.9);
      e.face = norm(x1 - e.x, z1 - e.z);
      C.sfx('growl', e);
      later(e, 0.9, () => { e.state = 'leap'; e.leap = { x0: e.x, z0: e.z, x1, z1, t: 0, dur: 0.5 }; });
    },
    swipe(e, C, tgt) {
      const dir = norm(tgt.pos.x - e.x, tgt.pos.z - e.z);
      e.state = 'busy'; e.timer = 1.2; e.face = dir; e.claw = 0.9;
      cone(C, e.x, e.z, dir, 3.8, 1.9, 0.7, 0xff5a6a);
      later(e, 0.7, () => { hurtIn(C, e, (p) => { const px = p.pos.x - e.x, pz = p.pos.z - e.z, dd = Math.hypot(px, pz); return dd < 3.8 && (px * dir.x + pz * dir.z) / (dd || 1) > Math.cos(0.95); }, e.def.dmg, { knock: 5 }); C.sfx('whoosh', e); });
    },
    // three ink blots arc over; each leaves a slowing puddle
    ink(e, C) {
      e.state = 'busy'; e.timer = 1.6;
      for (const p of C.alivePlayers().slice(0, 4)) for (let k = 0; k < (e.phase >= 2 ? 2 : 1); k++) {
        const x = p.pos.x + rand(-1.4, 1.4), z = p.pos.z + rand(-1.4, 1.4);
        C.zone({ x, z, r: 1.3, delay: 1.1, dmg: e.def.dmg * 0.6 * (C.enemyDmg || 1), knock: 2, kind: 'bomb', gloom: true, arc: { x: e.x, y: 2, z: e.z }, look: 'bomb' });
        later(e, 1.15, () => inkPuddle(C, x, z, 1.4, 5));
      }
      C.sfx('whoosh', e);
    },
    cranes(e, C, n) {
      e.state = 'busy'; e.timer = 1.2;
      for (let i = 0; i < (n || 2); i++) { const s = C.freeSpot(e.x, e.z, 5); if (s) { const q = C.spawn('paperbat', s.x, s.z, { level: e.level }); q.summoner = e; } }
      for (let i = 0; i < 12; i++) C.world.fx.emit('sparkle', e.x + rand(-2, 2), 1 + Math.random() * 2, e.z + rand(-2, 2), 1, { color: '#f4ecd8' });
      C.sfx('whoosh', e);
    },
    // folded flat, it skates round a marked square about its home
    fold(e, C) {
      const H = e.home || { x: e.x, z: e.z }, r = 6;
      const pts = [{ x: e.x, z: e.z }, { x: H.x - r, z: H.z - r }, { x: H.x + r, z: H.z - r }, { x: H.x + r, z: H.z + r }, { x: H.x - r, z: H.z + r }, { x: H.x - r, z: H.z - r }];
      for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], dir = norm(b.x - a.x, b.z - a.z); C.telegraphLine(a, dir, Math.hypot(b.x - a.x, b.z - a.z), 1.2 + i * 0.1); }
      e.state = 'busy'; e.timer = 99; e.flat = 1;
      C.bubble(e, t('Now I am… FLAT.'), 1.2);
      later(e, 1.2, () => { e.state = 'skate'; e.skate = { pts, i: 0, hit: new Set() }; C.sfx('whoosh', e); });
    },
    pose(e, dt) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      e.obj.position.y = e.y || 0;
      const moving = e.state === 'chase' || e.state === 'leap';
      u.legs.forEach((L, i) => { L.rotation.x = moving ? Math.sin(e.t * 9 + (i % 2) * Math.PI) * 0.45 : 0; });
      e.claw = Math.max(0, (e.claw || 0) - dt);
      u.head.rotation.x = e.claw > 0 ? -0.3 : Math.sin(e.t * 2) * 0.05;
      u.tail.rotation.y = Math.sin(e.t * 3) * 0.4;
      const fl = e.flat ? 0.15 : 1;
      u.body.scale.y += (fl - u.body.scale.y) * Math.min(1, dt * 10);
      u.body.rotation.y = e.state === 'skate' ? e.t * 12 : 0;
    },
  },

  moonmoth: {
    init(e) { e.state = 'chase'; e.timer = 1.5; e.phase = 1; e.last = null; e.y = 0; },
    think(e, dt, tgt, C) {
      tickLater(e, dt); leash(e, C);
      if (e.beam) this.tickBeam(e, C, dt);
      if (e.state !== 'roar' && e.state !== 'dive' && checkPhase(e, C, (ph) => { C.bubble(e, ph === 2 ? t('Children of the moon — come!') : t('Look at the moon. LOOK AT IT.'), 2); if (ph === 2) this.mothlings(e, C, 3); })) return;
      if (e.state === 'roar') { if (e.timer <= 0) { e.state = 'chase'; e.timer = 1; } return; }
      if (e.state === 'dive') {
        const D = e.dive; D.t += dt;
        const k = Math.min(1, D.t / D.dur);
        e.x = D.x0 + (D.x1 - D.x0) * k; e.z = D.z0 + (D.z1 - D.z0) * k;
        if (k >= 1) { e.state = 'busy'; e.timer = 1; hurtIn(C, e, (p) => Math.hypot(p.pos.x - e.x, p.pos.z - e.z) < 2.5, e.def.dmg * 1.1, { knock: 6 }); C.vfx.shockwave(e.x, e.z, { r: 2.6, color: '#e0e8ff', life: 0.45, wall: 0.6 }); C.sfx('thud', e); }
        return;
      }
      if (!tgt) return;
      if (e.state === 'chase') {
        hover(e, C, tgt, speedOf(e, C), dt, 3, 7, true);
        if (e.timer > 0) return;
        const opts = ['gust', 'dust', 'dive'];
        if (e.phase >= 2) opts.push('dust', 'mothlings');
        if (e.phase >= 3 && !e.beam) opts.push('moonbeam', 'moonbeam');
        let a = pick(opts);
        if (a === e.last && opts.length > 1) a = pick(opts.filter((o) => o !== a));
        e.last = a;
        this[a](e, C, tgt, 2);
      } else if (e.state === 'busy' && e.timer <= 0) { e.state = 'chase'; e.timer = rand(1.1, 1.8) / (e.phase >= 3 ? 1.2 : 1); }
    },
    gust(e, C, tgt) {
      const dir = norm(tgt.pos.x - e.x, tgt.pos.z - e.z);
      e.state = 'busy'; e.timer = 1.4; e.face = dir; e.beat = 1;
      cone(C, e.x, e.z, dir, 7, 1.2, 0.9, 0xd8d8ff);
      later(e, 0.9, () => { hurtIn(C, e, (p) => { const px = p.pos.x - e.x, pz = p.pos.z - e.z, dd = Math.hypot(px, pz); return dd < 7 && (px * dir.x + pz * dir.z) / (dd || 1) > Math.cos(0.6); }, e.def.dmg * 0.8, { knock: 9 }); C.sfx('whoosh', e); for (let i = 0; i < 10; i++) C.world.fx.emit('sparkle', e.x + dir.x * i * 0.6, 1, e.z + dir.z * i * 0.6, 1, { color: '#e8e8ff' }); });
    },
    // moon-dust on marked circles; a silver haze that slows where it lands
    dust(e, C) {
      e.state = 'busy'; e.timer = 1.6;
      for (const p of C.alivePlayers()) for (let k = 0; k < 2; k++) {
        const x = p.pos.x + rand(-2, 2), z = p.pos.z + rand(-2, 2);
        C.zone({ x, z, r: 1.4, delay: 1.2, dmg: e.def.dmg * 0.5 * (C.enemyDmg || 1), knock: 1, kind: 'bomb', gloom: true, elem: 'ice', arc: { x: e.x, y: 3, z: e.z }, look: 'bomb' });
        later(e, 1.25, () => silverHaze(C, x, z, 1.5, 4));
      }
    },
    dive(e, C, tgt) {
      const x1 = tgt.pos.x, z1 = tgt.pos.z;
      e.state = 'busy'; e.timer = 99;
      C.telegraphCircle(x1, z1, 2.5, 1.0);
      later(e, 1.0, () => { e.state = 'dive'; e.dive = { x0: e.x, z0: e.z, x1, z1, t: 0, dur: 0.45 }; C.sfx('whoosh', e); });
    },
    mothlings(e, C, n) {
      e.state = 'busy'; e.timer = 1.2;
      for (let i = 0; i < (n || 2); i++) { const s = C.freeSpot(e.x, e.z, 5); if (s) { const q = C.spawn('mothling', s.x, s.z, { level: e.level }); q.summoner = e; } }
      C.sfx('chirp', e);
    },
    // a moonbeam from the moth to the ground, sweeping round once (jump it)
    moonbeam(e, C) {
      e.state = 'busy'; e.timer = 5;
      const H = e.home || { x: e.x, z: e.z };
      e.x = H.x; e.z = H.z;
      const a0 = Math.random() * Math.PI * 2;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(11, 0.9).translate(5.5, 0, 0).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xe8f0ff, transparent: true, opacity: 0.25, depthWrite: false }));
      m.position.set(e.x, 0.06, e.z); m.rotation.y = -a0;
      C.root.add(m);
      e.beam = { m, a: a0, warm: 1.0, t: 0, tick: 0 };
      C.bubble(e, t('Look at the moon. LOOK AT IT.'), 1.4);
    },
    tickBeam(e, C, dt) {
      const B = e.beam;
      B.t += dt;
      B.m.position.set(e.x, 0.06, e.z);
      if (B.warm > 0) { B.warm -= dt; B.m.material.opacity = 0.2 + Math.sin(B.t * 20) * 0.1; return; }
      B.a += dt * 1.6; B.m.rotation.y = -B.a; B.m.material.opacity = 0.75;
      B.tick -= dt;
      if (B.tick <= 0) {
        B.tick = 0.15;
        const dir = { x: Math.cos(B.a), z: Math.sin(B.a) };
        for (const p of C.alivePlayers()) if (onLine(p, e.x, e.z, dir, 11, 0.6) && p.actor.jumpY < 0.5) C.hurtPlayer(p, e.def.dmg * 0.5 * (C.enemyDmg || 1), { dir, knock: 3, src: e, elem: 'ice' });
      }
      if (B.t > 5 || !e.alive) { C.root.remove(B.m); e.beam = null; }
    },
    pose(e, dt) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      e.beat = Math.max(0, (e.beat || 0) - dt);
      const speed = e.beat > 0 ? 22 : 9, amp = e.beat > 0 ? 0.8 : 0.45;
      for (const { W, s, f } of u.wings) W.rotation.z = s * (Math.sin(e.t * speed + (f ? 0.6 : 0)) * amp + 0.1);
      u.body.position.y = 2.2 + Math.sin(e.t * 2) * 0.25 - (e.state === 'dive' ? 1.2 : 0);
    },
  },

  behemoth: {
    init(e) { e.state = 'chase'; e.timer = 2; e.phase = 1; e.last = null; },
    think(e, dt, tgt, C) {
      tickLater(e, dt); leash(e, C);
      // (a blow on the thin glass at its back: say so, now and then)
      e.weakT = Math.max(0, (e.weakT || 0) - dt);
      if (e.backHit) { e.backHit = false; e.flash = 0.12; if (e.weakT <= 0) { e.weakT = 3; C.popText(e.x, e.def.h + 0.9, e.z, t('Weak spot!'), '#fff4c8'); } }
      if (e.state !== 'roar' && checkPhase(e, C, (ph) => { C.bubble(e, ph === 2 ? t('CRRRACK!') : t('Shatter… with… me!'), 2); if (ph === 3) this.shards(e, C); })) return;
      if (e.state === 'roar') { if (e.timer <= 0) { e.state = 'chase'; e.timer = 1; } return; }
      if (!tgt) return;
      if (e.state === 'chase') {
        // (it turns slowly — get behind it, where the glass is thin)
        const off = turnToward(e, tgt.pos.x, tgt.pos.z, e.phase >= 3 ? 1.1 : 0.75, dt);
        const d = Math.hypot(tgt.pos.x - e.x, tgt.pos.z - e.z);
        if (d > 3.2 && off < 0.8) C.moveEnemy(e, e.face.x * speedOf(e, C) * dt, e.face.z * speedOf(e, C) * dt, true);
        if (e.timer > 0) return;
        const opts = ['prism', 'crystals', off < 0.6 && d < 4 ? 'slam' : 'prism'];
        if (e.phase >= 3) opts.push('shards');
        let a = pick(opts);
        if (a === e.last && opts.length > 1) a = pick(opts.filter((o) => o !== a));
        e.last = a;
        this[a](e, C, tgt);
      } else if (e.state === 'busy' && e.timer <= 0) { e.state = 'chase'; e.timer = rand(1.3, 2) / (e.phase >= 3 ? 1.25 : 1); }
    },
    // three beams fanned out from its brow
    prism(e, C) {
      e.state = 'busy'; e.timer = 1.8;
      const base = Math.atan2(e.face.z, e.face.x), n = e.phase >= 2 ? 5 : 3, spread = e.phase >= 2 ? 0.4 : 0.5;
      const lines = [];
      for (let i = 0; i < n; i++) { const a = base + (i - (n - 1) / 2) * spread, dir = { x: Math.cos(a), z: Math.sin(a) }; lines.push(dir); C.telegraphLine({ x: e.x + dir.x * 1.6, z: e.z + dir.z * 1.6 }, dir, 13, 1.0); }
      later(e, 1.0, () => {
        const cols = ['#ff9ad8', '#9fe8ff', '#fff4a0', '#b0f08a', '#c8a8ff'];
        lines.forEach((dir, i) => {
          const m = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 13).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: cols[i % cols.length], transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
          m.position.set(e.x + dir.x * 8.1, 0.9, e.z + dir.z * 8.1); m.rotation.y = Math.atan2(dir.x, dir.z);
          C.root.add(m); C.fxMeshes.push({ m, t: 0.35, life: 0.35, grow: 0 });
        });
        hurtIn(C, e, (p) => lines.some((dir) => onLine(p, e.x + dir.x * 1.6, e.z + dir.z * 1.6, dir, 13, 0.7)), e.def.dmg * 0.9, { knock: 3 });
        C.sfx('zap', e);
      });
    },
    // crystals erupt under everyone
    crystals(e, C) {
      e.state = 'busy'; e.timer = 1.6;
      for (const p of C.alivePlayers()) {
        const x = p.pos.x, z = p.pos.z;
        C.telegraphCircle(x, z, 1.5, 1.0);
        later(e, 1.0, () => { hurtIn(C, e, (q) => Math.hypot(q.pos.x - x, q.pos.z - z) < 1.5, e.def.dmg * 0.8, { knock: 2, launch: 6 }); C.vfx.iceSpikes(x, z, { r: 0.7, n: 5, h: 1.4, life: 0.8, color: '#ff9ad8' }); C.sfx('crackle', e); });
      }
    },
    slam(e, C) {
      e.state = 'busy'; e.timer = 1.4;
      const x = e.x + e.face.x * 2, z = e.z + e.face.z * 2;
      C.telegraphCircle(x, z, 2.8, 0.9);
      later(e, 0.9, () => { hurtIn(C, e, (p) => Math.hypot(p.pos.x - x, p.pos.z - z) < 2.8 && p.actor.jumpY < 0.6, e.def.dmg * 1.1, { knock: 6, launch: 3 }); C.vfx.shockwave(x, z, { r: 3, color: '#ff9ad8', life: 0.45, wall: 0.8 }); C.shakeAt(e, 0.5); C.sfx('slam', e); });
    },
    // a ring of shards bursts out of it (jump them)
    shards(e, C) { e.state = 'busy'; e.timer = 2.4; quakeRings(C, e, e.x, e.z, 2, '#ff9ad8'); },
    pose(e) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      const walk = e.state === 'chase' ? Math.sin(e.t * 3) : 0;
      u.legs.forEach((L, i) => { L.rotation.x = walk * 0.25 * (i % 2 ? 1 : -1); });
      u.core.scale.setScalar(1 + Math.sin(e.t * 5) * 0.12);
      u.head.rotation.x = e.state === 'busy' ? -0.15 : 0;
    },
  },

  aurorawyrm: {
    init(e) { e.state = 'chase'; e.timer = 2; e.phase = 1; e.last = null; e.under = 0; },
    think(e, dt, tgt, C) {
      tickLater(e, dt); leash(e, C);
      if (e.state !== 'roar' && e.state !== 'burrow' && checkPhase(e, C, (ph) => { C.bubble(e, ph === 2 ? t('SKREEEE!') : t('The sky comes down with me!'), 2); })) return;
      if (e.state === 'roar') { if (e.timer <= 0) { e.state = 'chase'; e.timer = 1; } return; }
      // under the snow: a ripple hunts someone, then it bursts up under them
      if (e.state === 'burrow') {
        e.immune = 'Under the snow!';
        const p = e.prey && e.prey.fighter && !e.prey.fighter.down ? e.prey : tgt;
        e.under -= dt;
        if (p && e.under > 1.1) { const dx = p.pos.x - e.x, dz = p.pos.z - e.z, l = Math.hypot(dx, dz); if (l > 0.3) C.moveEnemy(e, (dx / l) * speedOf(e, C) * 1.6 * dt, (dz / l) * speedOf(e, C) * 1.6 * dt, true); }
        if (Math.random() < dt * 25) C.world.fx.emit('dust', e.x + rand(-0.6, 0.6), 0.2, e.z + rand(-0.6, 0.6), 1, { color: '#f4f8ff' });
        if (e.under <= 1.1 && !e.marked) { e.marked = true; C.telegraphCircle(e.x, e.z, 2.6, 1.1); }
        if (e.under <= 0) {
          e.state = 'busy'; e.timer = e.phase >= 2 ? 2.6 : 3.4; e.immune = null; e.marked = false;
          hurtIn(C, e, (q) => Math.hypot(q.pos.x - e.x, q.pos.z - e.z) < 2.6, e.def.dmg * 1.2, { knock: 4, launch: 8, elem: 'ice' });
          C.vfx.shockwave(e.x, e.z, { r: 2.8, color: '#dff4ff', life: 0.5, wall: 1 }); C.vfx.iceSpikes(e.x, e.z, { r: 1.2, n: 6, h: 1.2, life: 0.8 });
          C.shakeAt(e, 0.6); C.sfx('crackle', e);
          later(e, 1.0, () => { if (e.alive && e.state === 'busy') this.breath(e, C, e.prey || tgt); });
        }
        return;
      }
      if (!tgt) return;
      if (e.state === 'chase') {
        toward(e, C, tgt, speedOf(e, C) * 0.7, dt, 3.5);
        if (e.timer > 0) return;
        const opts = ['burrow', 'burrow', 'breath'];
        if (e.phase >= 3) opts.push('aurora', 'aurora');
        let a = pick(opts);
        if (a === e.last && opts.length > 1) a = pick(opts.filter((o) => o !== a));
        e.last = a;
        this[a](e, C, tgt);
      } else if (e.state === 'busy' && e.timer <= 0) { e.state = 'chase'; e.timer = rand(0.8, 1.4); }
    },
    burrow(e, C, tgt) {
      e.state = 'burrow'; e.under = e.phase >= 2 ? 2.6 : 3.2; e.prey = tgt; e.marked = false;
      C.vfx.sparks(e.x, 0.5, e.z, { n: 16, color: '#f4f8ff', kind: 'shard', speed: 4 });
      C.sfx('whoosh', e);
    },
    breath(e, C, tgt) {
      if (!tgt) return;
      const dir = norm(tgt.pos.x - e.x, tgt.pos.z - e.z);
      e.state = 'busy'; e.timer = Math.max(e.timer, 1.4); e.face = dir; e.jaw = 1;
      cone(C, e.x, e.z, dir, 6.5, 1.0, 0.8, 0x9fdcff);
      later(e, 0.8, () => { hurtIn(C, e, (p) => { const px = p.pos.x - e.x, pz = p.pos.z - e.z, dd = Math.hypot(px, pz); return dd < 6.5 && (px * dir.x + pz * dir.z) / (dd || 1) > Math.cos(0.5); }, e.def.dmg * 0.9, { knock: 3, elem: 'ice' }); for (let i = 0; i < 14; i++) C.world.fx.emit('sparkle', e.x + dir.x * i * 0.45, 1, e.z + dir.z * i * 0.45, 1, { color: '#dff4ff' }); C.sfx('whoosh', e); });
    },
    // the aurora comes down: bands of light fall across the ground, one after another
    aurora(e, C) {
      e.state = 'busy'; e.timer = 3;
      const cols = [0x6aff9a, 0x8af0d0, 0xb08aff], a = Math.random() * Math.PI, dir = { x: Math.cos(a), z: Math.sin(a) }, perp = { x: -dir.z, z: dir.x };
      for (let i = 0; i < 3; i++) {
        const off = (i - 1) * 4 + rand(-1, 1), o = { x: e.x + perp.x * off - dir.x * 12, z: e.z + perp.z * off - dir.z * 12 };
        later(e, i * 0.5, () => { const m = flat(C, new THREE.PlaneGeometry(1.8, 24).rotateX(-Math.PI / 2), o.x + dir.x * 12, o.z + dir.z * 12, cols[i], 1.1, Math.atan2(dir.x, dir.z)); void m; });
        later(e, 1.1 + i * 0.5, () => {
          hurtIn(C, e, (p) => onLine(p, o.x, o.z, dir, 24, 1.0), e.def.dmg * 0.9, { knock: 2, elem: 'ice' });
          for (let k = 0; k < 16; k++) C.world.fx.emit('sparkle', o.x + dir.x * k * 1.5, 1 + Math.random() * 2, o.z + dir.z * k * 1.5, 1, { color: ['#6aff9a', '#8af0d0', '#b08aff'][i] });
          C.sfx('chord', e);
        });
      }
      C.bubble(e, t('The sky comes down with me!'), 1.4);
    },
    pose(e, dt) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      const down = e.state === 'burrow' ? (e.under > 0.25 ? -3.2 : -3.2 * (e.under / 0.25)) : 0;
      u.root.position.y += (down - u.root.position.y) * Math.min(1, dt * (e.state === 'burrow' ? 6 : 14));
      u.segs.forEach((S, i) => { S.position.x = Math.sin(e.t * 4 - i * 0.7) * 0.35 * (i / 6); S.position.y = 0.8 + Math.sin(e.t * 3 - i) * 0.12; });
      e.jaw = Math.max(0, (e.jaw || 0) - dt);
      u.head.rotation.x = e.jaw > 0 ? -0.3 : Math.sin(e.t * 2) * 0.08;
    },
  },
};

// an ink puddle: slows whoever stands in it
function inkPuddle(C, x, z, r, life) {
  const m = new THREE.Mesh(C.geo.disc, new THREE.MeshBasicMaterial({ color: 0x1e1a22, transparent: true, opacity: 0.55, depthWrite: false }));
  m.scale.setScalar(r); m.position.set(x, 0.035, z);
  C.root.add(m);
  C.fxMeshes.push({ m, t: life, life, fn: (q, k) => {
    m.material.opacity = 0.55 * Math.min(1, k * 3);
    for (const p of C.alivePlayers()) if (Math.hypot(p.pos.x - x, p.pos.z - z) < r && p.actor.jumpY < 0.3) p.actor.zoneSlow = Math.min(p.actor.zoneSlow ?? 1, 0.55);
  } });
}
// a silver haze of moon-dust: slows whoever stands in it
function silverHaze(C, x, z, r, life) {
  const m = new THREE.Mesh(C.geo.disc, new THREE.MeshBasicMaterial({ color: 0xe0e8ff, transparent: true, opacity: 0.4, depthWrite: false }));
  m.scale.setScalar(r); m.position.set(x, 0.04, z);
  C.root.add(m);
  C.fxMeshes.push({ m, t: life, life, fn: (q, k) => {
    m.material.opacity = 0.4 * Math.min(1, k * 3);
    if (Math.random() < 0.3) C.world.fx.emit('sparkle', x + rand(-r, r), 0.5, z + rand(-r, r), 1, { color: '#e8f0ff' });
    for (const p of C.alivePlayers()) if (Math.hypot(p.pos.x - x, p.pos.z - z) < r && p.actor.jumpY < 0.3) p.actor.zoneSlow = Math.min(p.actor.zoneSlow ?? 1, 0.6);
  } });
}

// (hits on the Crystal Behemoth from behind, where the glass is thin; fire on the Paper Tiger)
export function worldBossMul(e, dir, elem) {
  if (e.type === 'behemoth' && dir && dir.x * e.face.x + dir.z * e.face.z > 0.35) { e.backHit = true; return 1.8; }
  if (e.type === 'papertiger' && (elem === 'fire' || (e.st && e.st.burn > 0))) return 1.6;
  return 1;
}
