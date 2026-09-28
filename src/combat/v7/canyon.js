// World v7, chapter 3: the gloom of the Golden Steppe and the Red Canyon, as foes.
//   mole        a mole miner in a hard hat: swings its pick in a marked arc,
//               burrows (a mound races after you) and bursts up on a marked circle.
//   fuse        a fuse imp: a gloom gremlin hugging a stick of dynamite — it runs
//               up, lights the fuse (a marked circle) and goes off (the Ember
//               Imp’s brain, bestiary.js).
//   tumble      a gloom tumbleweed: marks a lane, rolls down it, bounces, again.
//   molebro     the Mole Brothers (the Old Mine’s mini-boss, three of them): pick
//               swings, burrows, and sticks of dynamite lobbed on marked spots.
//   drillosaur  Foreman Grubb’s Drillosaur (the Old Mine’s boss): a clanking
//               mechanical dinosaur with a drill for a nose. Drill charges down a
//               marked lane, burrows and bursts up under you, stomps rocks off the
//               quarry walls onto marked shadows, pokes with the drill; from
//               phase 2 Grubb calls his crew; in phase 3 the engine overheats —
//               after every charge it stalls, steaming (hit it then: ×1.6).
// Every blow is shown before it lands.

import { THREE } from '../../render/r3d.js';
import { toward, speedOf, lob } from '../v3/ai.js';
import { cone, later, tickLater, hurtIn, checkPhase, leash } from '../v3/bosses.js';
import { t } from '../../i18n.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export const CANYON_ENEMIES = {
  mole: { name: 'Mole Miner', hp: 48, speed: 2.6, r: 0.36, h: 0.8, dmg: 12, xp: 12, cost: 2, knockRes: 0.3 },
  fuse: { name: 'Fuse Imp', hp: 22, speed: 3.6, r: 0.3, h: 0.7, dmg: 20, xp: 8, cost: 2, knockRes: 0, elem: 'fire' },
  tumble: { name: 'Gloom Tumbleweed', hp: 30, speed: 3.2, r: 0.4, h: 0.7, dmg: 11, xp: 9, cost: 2, knockRes: 0.2 },
  molebro: { name: 'Mole Brother', hp: 190, speed: 2.4, r: 0.45, h: 1.0, dmg: 14, xp: 45, cost: 8, knockRes: 0.6 },
  drillosaur: { name: 'the Drillosaur', title: 'Foreman Grubb & the Drillosaur', hp: 2200, speed: 1.3, r: 1.4, h: 3.0, dmg: 20, xp: 420, cost: 99, boss: true, knockRes: 1 },
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
function coneM(g, r, h, m, x, y, z, n = 8) { const b = new THREE.Mesh(new THREE.ConeGeometry(r, h, n), m); b.position.set(x, y, z); b.castShadow = true; g.add(b); return b; }
const grp = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
const GLOOM = '#a86ae0';

// a mole miner’s body (the brothers are bigger, with a lamp that glows brighter)
function moleBody(r3d, big) {
  const g = new THREE.Group(), body = grp(g), k = big ? 1.3 : 1;
  const fur = mat(r3d, big ? '#8a7a86' : '#9a8a96'), belly = mat(r3d, '#c8bac2'), pink = mat(r3d, '#f0a0b0'), claw = mat(r3d, '#f0e6d4');
  const hat = mat(r3d, '#f2c14e'), hatD = mat(r3d, '#c8942a'), lamp = mat(r3d, '#fff4c0', '#ffe070', big ? 1.8 : 1.2), eye = mat(r3d, '#f0d8ff', GLOOM, 1.4);
  ball(body, 0.34 * k, fur, 0, 0.36 * k, 0, 1, 1.05, 0.95);
  ball(body, 0.22 * k, belly, 0, 0.3 * k, 0.16 * k, 1, 1, 0.6);
  const head = grp(body, 0, 0.68 * k, 0.06 * k);
  ball(head, 0.22 * k, fur, 0, 0, 0, 1, 0.9, 1.05);
  ball(head, 0.07 * k, pink, 0, -0.03 * k, 0.24 * k);
  for (const s of [-1, 1]) box(head, 0.07 * k, 0.03 * k, 0.03 * k, eye, s * 0.09 * k, 0.05 * k, 0.19 * k);
  // the hard hat & its lamp
  cyl(head, 0.2 * k, 0.24 * k, 0.12 * k, hat, 0, 0.14 * k, -0.02, 12);
  cyl(head, 0.28 * k, 0.28 * k, 0.03, hatD, 0, 0.09 * k, 0, 12);
  const lp = cyl(head, 0.05 * k, 0.06 * k, 0.07 * k, lamp, 0, 0.16 * k, 0.2 * k, 8); lp.rotation.x = Math.PI / 2;
  // big digging paws, one with a pick
  const arms = [];
  for (const s of [-1, 1]) {
    const A = grp(body, s * 0.3 * k, 0.42 * k, 0.05);
    ball(A, 0.1 * k, fur, 0, -0.1 * k, 0.04, 1, 1.3, 1);
    for (let i = -1; i <= 1; i++) box(A, 0.03, 0.03, 0.1 * k, claw, i * 0.05 * k, -0.22 * k, 0.1 * k);
    arms.push(A);
  }
  const pickG = grp(arms[1], 0, -0.2 * k, 0.1);
  box(pickG, 0.05, 0.05, 0.62 * k, mat(r3d, '#8a6a4a'), 0, 0, 0.26 * k);
  const head2 = box(pickG, 0.5 * k, 0.07, 0.07, mat(r3d, '#9aa0aa'), 0, 0, 0.56 * k); head2.rotation.z = 0.15;
  const legs = [];
  for (const s of [-1, 1]) { const L = grp(body, s * 0.16 * k, 0.1 * k, 0); ball(L, 0.1 * k, fur, 0, 0, 0.04, 1.1, 0.7, 1.4); legs.push(L); }
  return { g, body, head, arms, legs, lamp: lp };
}

export const CANYON_MODELS = {
  mole(r3d) { const m = moleBody(r3d, false); m.g.userData = { body: m.body, head: m.head, arms: m.arms, legs: m.legs, lamp: m.lamp }; return own(m.g); },
  molebro(r3d) {
    const m = moleBody(r3d, true);
    // (a red neckerchief and a belt of dynamite: the brothers mean business)
    box(m.body, 0.5, 0.08, 0.36, mat(r3d, '#c8423a'), 0, 0.72, 0.02);
    for (let i = 0; i < 5; i++) { const s = box(m.body, 0.06, 0.2, 0.06, mat(r3d, '#d8483a'), -0.22 + i * 0.11, 0.3, 0.4); s.rotation.z = 0.1; }
    m.g.userData = { body: m.body, head: m.head, arms: m.arms, legs: m.legs, lamp: m.lamp };
    return own(m.g);
  },
  // a round gloom gremlin hugging a stick of dynamite, its fuse fizzing
  fuse(r3d) {
    const g = new THREE.Group(), body = grp(g);
    ball(body, 0.24, mat(r3d, '#5a4a6a'), 0, 0.3, 0, 1, 1.05, 0.95);
    for (const s of [-1, 1]) box(body, 0.06, 0.05, 0.03, mat(r3d, '#f0d8ff', GLOOM, 1.4), s * 0.08, 0.38, 0.2);
    for (const s of [-1, 1]) { const h = box(body, 0.05, 0.14, 0.05, mat(r3d, '#3a2a44'), s * 0.13, 0.54, 0); h.rotation.z = -s * 0.4; }
    const stick = box(body, 0.12, 0.42, 0.12, mat(r3d, '#d8483a'), 0, 0.34, 0.22);
    stick.rotation.z = 0.25;
    box(body, 0.13, 0.04, 0.13, mat(r3d, '#f4e4c0'), 0.02, 0.44, 0.22).rotation.z = 0.25;
    const flame = grp(body, 0.07, 0.62, 0.22);
    box(flame, 0.02, 0.1, 0.02, mat(r3d, '#3a2a2a'), 0, -0.03, 0);
    box(flame, 0.08, 0.08, 0.08, mat(r3d, '#fff0a0', '#ffd23a', 1.6), 0, 0.04, 0);
    for (const s of [-0.1, 0.1]) box(body, 0.06, 0.12, 0.06, mat(r3d, '#3a2a44'), s, 0.06, 0);
    g.userData = { body, flame };
    return own(g);
  },
  // a tangle of dry twigs rolling about, two gloomy eyes in the middle
  tumble(r3d) {
    const g = new THREE.Group(), body = grp(g, 0, 0.36, 0), spin = grp(body);
    const tw = [mat(r3d, '#b89a6a'), mat(r3d, '#9a7a4e'), mat(r3d, '#c8ac7a')];
    for (let i = 0; i < 14; i++) { const b = box(spin, 0.66, 0.04, 0.04, tw[i % 3], 0, 0, 0); b.rotation.set(i * 1.3, i * 0.7, i * 2.1); }
    ball(spin, 0.18, mat(r3d, '#6a5a44'), 0, 0, 0);
    const eyes = grp(body, 0, 0.02, 0.22);
    for (const s of [-1, 1]) box(eyes, 0.07, 0.06, 0.03, mat(r3d, '#f0d8ff', GLOOM, 1.5), s * 0.08, 0, 0);
    g.userData = { body, spin, eyes };
    return own(g);
  },
  // Foreman Grubb’s Drillosaur: a clanking, soot-streaked mechanical dinosaur,
  // hazard stripes, a smokestack, a great drill for a nose, Grubb in the saddle
  drillosaur(r3d) {
    const g = new THREE.Group(), body = grp(g, 0, 1.2, 0);
    const paint = mat(r3d, '#e8a23a'), paintD = mat(r3d, '#b8782a'), iron = mat(r3d, '#5a5660'), ironD = mat(r3d, '#3a3844'), stripe = mat(r3d, '#2a2630');
    const steel = mat(r3d, '#c8ccd4'), glass = mat(r3d, '#fff4c0', '#ffd66b', 1.3), gloom = mat(r3d, '#e0c8ff', GLOOM, 1.4);
    // the hull
    box(body, 1.5, 1.0, 2.2, paint, 0, 0, 0);
    box(body, 1.56, 0.2, 2.26, paintD, 0, -0.45, 0);
    for (let i = 0; i < 5; i++) { const s = box(body, 1.58, 0.12, 0.2, stripe, 0, 0.36, -0.9 + i * 0.44); s.rotation.x = 0.5; }
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) box(body, 0.04, 0.06, 0.06, ironD, s * 0.77, 0.2, -0.8 + i * 0.5);
    // dorsal plates down its back, yellow and black
    for (let i = 0; i < 5; i++) { const pl = coneM(body, 0.26 - Math.abs(i - 2) * 0.03, 0.62 - Math.abs(i - 2) * 0.1, i % 2 ? stripe : paint, 0, 0.72, 0.8 - i * 0.42, 4); pl.scale.z = 0.35; }
    // the smokestack
    const stack = grp(body, 0.45, 0.5, -0.9);
    cyl(stack, 0.14, 0.18, 0.7, ironD, 0, 0.35, 0, 8);
    cyl(stack, 0.2, 0.2, 0.08, iron, 0, 0.7, 0, 8);
    // the neck & head: a boiler of a head with lamp eyes, the drill in front
    const neck = grp(body, 0, 0.3, 1.1);
    box(neck, 0.7, 0.6, 0.7, paint, 0, 0.1, 0.25).rotation.x = -0.3;
    const head = grp(neck, 0, 0.35, 0.7);
    head.scale.setScalar(1.3);
    box(head, 0.9, 0.62, 0.8, paint, 0, 0, 0);
    for (const s of [-1, 1]) { const brow = box(head, 0.3, 0.1, 0.3, stripe, s * 0.3, 0.34, 0.2); brow.rotation.z = -s * 0.3; }
    box(head, 0.92, 0.12, 0.82, stripe, 0, 0.22, 0);
    for (const s of [-1, 1]) cyl(head, 0.12, 0.12, 0.06, glass, s * 0.3, 0.08, 0.41, 10).rotation.x = Math.PI / 2;
    const jaw = grp(head, 0, -0.3, 0.1);
    box(jaw, 0.8, 0.14, 0.7, paintD, 0, 0, 0.05);
    for (let i = 0; i < 4; i++) coneM(jaw, 0.05, 0.14, steel, -0.27 + i * 0.18, 0.12, 0.35, 4);
    const drill = grp(head, 0, -0.02, 0.42);
    const bit = coneM(drill, 0.34, 1.3, steel, 0, 0, 0.66, 10); bit.rotation.x = Math.PI / 2;
    for (let i = 0; i < 4; i++) { const f = box(drill, 0.05, 0.05, 1.0, iron, 0, 0, 0.6); f.rotation.z = i * 0.78; f.position.set(Math.cos(i * 1.57) * 0.14, Math.sin(i * 1.57) * 0.14, 0.55); }
    cyl(drill, 0.36, 0.36, 0.14, ironD, 0, 0, 0.02, 10).rotation.x = Math.PI / 2;
    // the tail
    const tail = grp(body, 0, 0.05, -1.1);
    for (let i = 0; i < 4; i++) box(tail, 0.5 - i * 0.1, 0.4 - i * 0.07, 0.42, i % 2 ? paintD : paint, 0, -i * 0.08, -0.2 - i * 0.4);
    // four piston legs
    const legs = [];
    for (const [sx, sz] of [[-1, 0.7], [1, 0.7], [-1, -0.7], [1, -0.7]]) {
      const L = grp(body, sx * 0.62, -0.4, sz);
      box(L, 0.36, 0.7, 0.4, iron, 0, -0.35, 0);
      cyl(L, 0.1, 0.1, 0.5, steel, 0, -0.4, 0.22, 8);
      box(L, 0.46, 0.14, 0.56, ironD, 0, -0.74, 0.06);
      legs.push(L);
    }
    // Foreman Grubb in the saddle: hard hat, lamp, a great grey moustache
    const grubb = grp(body, -0.1, 0.62, -0.35);
    grubb.scale.setScalar(1.35);
    box(body, 0.7, 0.18, 0.6, mat(r3d, '#6a4a34'), -0.1, 0.56, -0.35);
    box(grubb, 0.5, 0.42, 0.36, mat(r3d, '#4a6a9a'), 0, 0.2, 0);
    const gh = grp(grubb, 0, 0.58, 0);
    box(gh, 0.38, 0.34, 0.34, mat(r3d, '#e8b890'), 0, 0, 0);
    box(gh, 0.34, 0.08, 0.06, mat(r3d, '#e8e4e0'), 0, -0.06, 0.19);
    for (const s of [-1, 1]) box(gh, 0.05, 0.05, 0.02, stripe, s * 0.09, 0.05, 0.18);
    cyl(gh, 0.22, 0.25, 0.14, mat(r3d, '#f2c14e'), 0, 0.2, 0, 10);
    const hl = cyl(gh, 0.05, 0.06, 0.06, glass, 0, 0.22, 0.2, 8); hl.rotation.x = Math.PI / 2;
    const garm = grp(grubb, 0.3, 0.3, 0.05);
    box(garm, 0.1, 0.36, 0.1, mat(r3d, '#4a6a9a'), 0, -0.1, 0.1);
    // the gloom that drives it: a violet glow in the boiler
    const core = box(body, 0.5, 0.3, 0.06, gloom, 0, -0.05, 1.12);
    g.userData = { body, neck, head, jaw, drill, tail, legs, stack, grubb, garm, core };
    return own(g);
  },
};

// ------------------------------------------------------------------ brains
// (a mound of earth races after you, then something bursts up on a marked circle)
function underChase(e, dt, tgt, C, sp, r, dmg) {
  toward(e, C, tgt, sp, dt, 0.3);
  if (Math.random() < dt * 22) C.world.fx.emit('dust', e.x, 0.1, e.z, 1, { color: '#a86a4a' });
  if (e.timer > 0) return;
  const x = tgt.pos.x, z = tgt.pos.z;
  e.state = 'popping'; e.timer = 9;
  C.telegraphCircle(x, z, r, 0.85);
  later(e, 0.85, () => {
    e.x = x; e.z = z; e.under = false; e.state = 'busy'; e.timer = 0.9;
    hurtIn(C, e, (p) => Math.hypot(p.pos.x - x, p.pos.z - z) < r + 0.1 && p.actor.jumpY < 0.6, dmg, { knock: 4, launch: 5 });
    C.vfx.shockwave(x, z, { r, color: '#c88a5a', life: 0.4, wall: 0.6 });
    C.world.fx.emit('dust', x, 0.2, z, 14, { color: '#a86a4a' });
    C.shakeAt(e, 0.3); C.sfx('slam', e);
  });
}
function swingPick(e, C, tgt, reach, dmg) {
  const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, l = Math.hypot(dx, dz) || 1, dir = { x: dx / l, z: dz / l };
  e.state = 'busy'; e.timer = 1.0; e.anim = 'swing'; e.animT = 0;
  e.faceTo(tgt.pos.x, tgt.pos.z);
  cone(C, e.x, e.z, dir, reach, 1.2, 0.55, 0xff5a6a);
  later(e, 0.55, () => {
    hurtIn(C, e, (p) => { const px = p.pos.x - e.x, pz = p.pos.z - e.z, pd = Math.hypot(px, pz); return pd < reach + 0.1 && (px * dir.x + pz * dir.z) / (pd || 1) > Math.cos(0.65); }, dmg, { knock: 3 });
    C.sfx('whoosh', e);
  });
}
function burrowDown(e, C, lines) {
  e.state = 'under'; e.under = true; e.timer = rand(1.4, 2.2);
  if (lines) C.bubble(e, pick(lines), 1);
  C.world.fx.emit('dust', e.x, 0.2, e.z, 10, { color: '#a86a4a' });
  C.sfx('dig', e);
}
function molePose(e, dt) {
  const u = e.obj.userData;
  e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
  e.animT = (e.animT || 0) + dt;
  const down = e.under ? -1.4 : 0;
  u.body.position.y += (down - u.body.position.y) * Math.min(1, dt * 10);
  const moving = e.state === 'chase';
  u.legs.forEach((L, i) => { L.rotation.x = moving ? Math.sin(e.t * 12 + i * Math.PI) * 0.6 : 0; });
  const swing = e.anim === 'swing' ? (e.animT < 0.5 ? -2.2 * Math.min(1, e.animT / 0.3) : e.animT < 0.7 ? 0.9 : 0.2) : moving ? Math.sin(e.t * 12) * 0.3 : 0;
  u.arms[1].rotation.x += (swing - u.arms[1].rotation.x) * Math.min(1, dt * 14);
  u.arms[0].rotation.x = moving ? -Math.sin(e.t * 12) * 0.3 : 0;
  u.lamp.material.emissiveIntensity = 1.2 + Math.sin(e.t * 5) * 0.2;
}

export const CANYON_BRAINS = {
  mole: {
    init(e) { e.state = 'chase'; e.timer = rand(0.8, 1.6); },
    think(e, dt, tgt, C) {
      tickLater(e, dt);
      if (!tgt) return;
      const sp = speedOf(e, C);
      if (e.state === 'chase') {
        const d = toward(e, C, tgt, sp, dt, 1.2);
        if (e.timer > 0) return;
        if (d < 2.2) swingPick(e, C, tgt, 2.2, e.def.dmg);
        else if (d > 4 && Math.random() < 0.7) burrowDown(e, C, null);
        else e.timer = 0.4;
      } else if (e.state === 'under') underChase(e, dt, tgt, C, sp * 1.6, 1.5, e.def.dmg * 1.1);
      else if (e.state === 'busy' && e.timer <= 0) { e.state = 'chase'; e.timer = rand(1.2, 2); }
    },
    pose: molePose,
  },
  // the Mole Brothers: picks, burrows and dynamite — three at once
  molebro: {
    init(e) { e.state = 'chase'; e.timer = rand(1, 2); e.last = null; },
    think(e, dt, tgt, C) {
      tickLater(e, dt);
      leash(e, C);
      if (e.state === 'roar') { if (e.timer <= 0) { e.state = 'chase'; e.timer = rand(0.6, 1.4); } return; }
      if (!tgt) return;
      const sp = speedOf(e, C);
      if (e.state === 'chase') {
        const d = toward(e, C, tgt, sp, dt, 1.4);
        if (e.timer > 0) return;
        const opts = ['dyn', 'burrow'];
        if (d < 2.6) opts.push('swing', 'swing');
        let a = pick(opts);
        if (a === e.last && opts.length > 1) a = pick(opts.filter((o) => o !== a));
        e.last = a;
        if (a === 'swing') swingPick(e, C, tgt, 2.6, e.def.dmg);
        else if (a === 'burrow') burrowDown(e, C, [t('Dig, brothers!'), t('Down the hole!')]);
        else {
          // two sticks of dynamite: where you are, where you’re going
          e.state = 'busy'; e.timer = 1.2; e.anim = 'swing'; e.animT = 0;
          const v = tgt.vel || { x: 0, z: 0 };
          for (const k of [0, 1]) later(e, k * 0.25, () => lob(C, e, { x: tgt.pos.x + v.x * 0.5 * k, z: tgt.pos.z + v.z * 0.4 * k }, { r: 1.5, dmg: e.def.dmg * 1.1, t: 1.15, look: 'dynamite', elem: 'fire', knock: 3 }));
          C.bubble(e, pick([t('Fire in the hole!'), t('Catch!')]), 0.9);
          C.sfx('sizzle', e);
        }
      } else if (e.state === 'under') underChase(e, dt, tgt, C, sp * 1.5, 1.8, e.def.dmg * 1.2);
      else if (e.state === 'busy' && e.timer <= 0) { e.state = 'chase'; e.timer = rand(1.1, 1.8); }
    },
    pose: molePose,
  },
  tumble: {
    init(e) { e.state = 'chase'; e.timer = rand(0.6, 1.4); },
    think(e, dt, tgt, C) {
      if (!tgt) return;
      const sp = speedOf(e, C);
      if (e.state === 'chase') {
        const d = toward(e, C, tgt, sp * 0.6, dt, 1);
        if (e.timer <= 0 && d < 8) {
          const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, l = Math.hypot(dx, dz) || 1;
          e.lane = { x: dx / l, z: dz / l }; e.dist = Math.min(9, d + 3);
          e.state = 'mark'; e.timer = 0.6;
          C.telegraphLine(e, e.lane, e.dist, 0.6);
        }
      } else if (e.state === 'mark' && e.timer <= 0) { e.state = 'roll'; e.timer = e.dist / 9; e.hitOnce.clear(); }
      else if (e.state === 'roll') {
        C.moveEnemy(e, e.lane.x * 9 * dt, e.lane.z * 9 * dt);
        C.enemyTouch(e, e.def.dmg, 3, 0.6);
        if (Math.random() < dt * 20) C.world.fx.emit('dust', e.x, 0.1, e.z, 1, { color: '#c8ac7a' });
        if (e.timer <= 0) { e.state = 'chase'; e.timer = rand(1.4, 2.2); e.vy = 4; e.y = 0.01; }
      }
    },
    pose(e, dt) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      const rate = e.state === 'roll' ? 14 : e.state === 'chase' ? 4 : 0;
      u.spin.rotation.x += rate * dt;
      u.body.position.y = 0.36 + (e.state === 'chase' ? Math.abs(Math.sin(e.t * 6)) * 0.12 : 0);
    },
  },

  // ---------------------------------------------------------------- the Drillosaur
  drillosaur: {
    init(e) { e.state = 'chase'; e.timer = 2; e.phase = 1; e.last = null; e.drillSpin = 0; },
    onHit(e) { if (e.exposed > 0) e.flash = 0.12; },
    think(e, dt, tgt, C) {
      tickLater(e, dt);
      leash(e, C);
      if (e.exposed > 0) e.exposed -= dt;
      if (e.state !== 'roar' && e.state !== 'under' && e.state !== 'popping' && e.state !== 'charging' && checkPhase(e, C, (ph) => C.bubble(e, ph === 2 ? t('Boys! SHIFT CHANGE!') : t('Full throttle! FULL THROTTLE!'), 2))) return;
      if (e.state === 'roar') { if (e.timer <= 0) { e.state = 'chase'; e.timer = 1; } return; }
      if (!tgt) return;
      const sp = speedOf(e, C) * (e.phase >= 3 ? 1.15 : 1);
      if (e.state === 'chase') {
        const d = toward(e, C, tgt, sp, dt, 3);
        if (e.timer > 0) return;
        const opts = ['charge', 'rocks', 'burrow'];
        if (d < 4) opts.push('poke', 'poke');
        if (e.phase >= 2 && C.enemies.filter((q) => q.alive && q.summoner === e).length < 3) opts.push('crew');
        if (e.phase >= 3) opts.push('charge');
        let a = pick(opts);
        if (a === e.last && opts.length > 1) a = pick(opts.filter((o) => o !== a));
        e.last = a;
        this[a](e, C, tgt);
      } else if (e.state === 'busy' && e.timer <= 0) { e.state = 'chase'; e.timer = rand(1.0, 1.6) / (e.phase >= 3 ? 1.2 : 1); }
      else if (e.state === 'windup' && e.timer <= 0) { e.state = 'charging'; e.timer = e.dist / 12; e.hitOnce.clear(); C.sfx('charge', e); }
      else if (e.state === 'charging') {
        C.moveEnemy(e, e.lane.x * 12 * dt, e.lane.z * 12 * dt);
        C.enemyTouch(e, e.def.dmg * 1.3, 6, 1.3);
        if (Math.random() < dt * 30) C.world.fx.emit('dust', e.x - e.lane.x, 0.2, e.z - e.lane.z, 2, { color: '#c88a5a' });
        if (e.timer <= 0) {
          C.shakeAt(e, 0.4); C.sfx('slam', e);
          if (!e.hitOnce.size) {
            // (it missed everyone: the drill bites into the quarry floor and sticks fast)
            e.state = 'busy'; e.timer = 3.2; e.exposed = 3.2; e.anim = 'stall'; e.animT = 0;
            C.bubble(e, pick([t('It’s STUCK! Reverse! REVERSE!'), t('Not the floor again!')]), 1.8);
            C.popText(e.x, e.def.h + 1, e.z, t('Stuck in its own tunnel!'), '#ffd66b', true);
            C.world.fx.emit('dust', e.x + e.lane.x * 1.5, 0.3, e.z + e.lane.z * 1.5, 24, { color: '#a86a4a' });
          } else if (e.phase >= 3) {
            // (the engine overheats: it stalls, steaming — Grubb hops out to kick it)
            e.state = 'busy'; e.timer = 2.8; e.exposed = 2.8; e.anim = 'stall'; e.animT = 0;
            C.bubble(e, pick([t('Blasted gears!'), t('Come ON, you old boiler!')]), 1.6);
          } else { e.state = 'busy'; e.timer = 0.8; }
        }
      } else if (e.state === 'under') {
        toward(e, C, tgt, sp * 2.2, dt, 0.3);
        if (Math.random() < dt * 26) C.world.fx.emit('dust', e.x, 0.1, e.z, 2, { color: '#a86a4a' });
        if (e.timer <= 0) {
          const x = tgt.pos.x, z = tgt.pos.z;
          e.state = 'popping'; e.timer = 9;
          C.telegraphCircle(x, z, 2.6, 1.0);
          later(e, 1.0, () => {
            e.x = x; e.z = z; e.under = false; e.state = 'busy'; e.timer = 1.2;
            hurtIn(C, e, (p) => Math.hypot(p.pos.x - x, p.pos.z - z) < 2.7 && p.actor.jumpY < 0.6, e.def.dmg * 1.4, { knock: 5, launch: 6 });
            C.vfx.shockwave(x, z, { r: 2.7, color: '#c88a5a', life: 0.5, wall: 0.8 });
            C.world.fx.emit('dust', x, 0.3, z, 24, { color: '#a86a4a' });
            C.shakeAt(e, 0.6); C.sfx('slam', e);
          });
        }
      }
    },
    // drill first down a marked lane
    charge(e, C, tgt) {
      const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, l = Math.hypot(dx, dz) || 1;
      e.lane = { x: dx / l, z: dz / l }; e.dist = Math.min(14, l + 4);
      e.state = 'windup'; e.timer = 1.0; e.anim = 'wind'; e.animT = 0;
      e.faceTo(tgt.pos.x, tgt.pos.z);
      C.telegraphLine(e, e.lane, e.dist, 1.0);
      C.bubble(e, pick([t('Out of my quarry!'), t('DRILL, you beauty!')]), 1);
      C.sfx('charge', e);
    },
    // a stomp: rocks come off the quarry walls onto marked shadows round everyone
    rocks(e, C) {
      e.state = 'busy'; e.timer = 1.8; e.anim = 'stomp'; e.animT = 0;
      C.shakeAt(e, 0.5); C.sfx('thud', e);
      C.vfx.shockwave(e.x, e.z, { r: 3, color: '#c88a5a', life: 0.4, wall: 0.5 });
      for (const p of C.alivePlayers()) for (let k = 0; k < (e.phase >= 2 ? 4 : 3); k++) {
        const x = p.pos.x + rand(-2.4, 2.4), z = p.pos.z + rand(-1.8, 1.8);
        later(e, 0.2 + k * 0.2, () => C.zone({ x, z, r: 1.15, delay: 1.1, dmg: e.def.dmg * 0.8 * (C.enemyDmg || 1), knock: 2, kind: 'bomb', gloom: true, arc: { x: x + rand(-1, 1), y: 9, z: z - 3 }, look: 'rock' }));
      }
    },
    burrow(e, C) {
      e.state = 'under'; e.under = true; e.timer = rand(1.6, 2.4);
      C.bubble(e, pick([t('Going under!'), t('Tunnel time!')]), 1.1);
      C.world.fx.emit('dust', e.x, 0.3, e.z, 20, { color: '#a86a4a' });
      C.shakeAt(e, 0.3); C.sfx('dig', e);
    },
    poke(e, C, tgt) {
      const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, l = Math.hypot(dx, dz) || 1, dir = { x: dx / l, z: dz / l };
      e.state = 'busy'; e.timer = 1.1; e.anim = 'poke'; e.animT = 0;
      e.faceTo(tgt.pos.x, tgt.pos.z);
      cone(C, e.x, e.z, dir, 4.2, 0.9, 0.7, 0xff5a6a);
      later(e, 0.7, () => {
        hurtIn(C, e, (p) => { const px = p.pos.x - e.x, pz = p.pos.z - e.z, pd = Math.hypot(px, pz); return pd < 4.3 && (px * dir.x + pz * dir.z) / (pd || 1) > Math.cos(0.5); }, e.def.dmg * 1.1, { knock: 5 });
        C.sfx('whoosh', e);
      });
    },
    crew(e, C) {
      e.state = 'busy'; e.timer = 1.3; e.anim = 'stomp'; e.animT = 0;
      C.bubble(e, pick([t('Boys! Shift change!'), t('Get digging, you lot!')]), 1.6);
      for (let i = 0; i < 2; i++) {
        const s = C.freeSpot(e.x + rand(-3, 3), e.z + rand(-3, 3), 2) || { x: e.x, z: e.z + 2 };
        const q = C.spawn(i ? 'mole' : 'fuse', s.x, s.z, { level: e.level });
        q.summoner = e;
        C.world.fx.emit('dust', s.x, 0.2, s.z, 8, { color: '#a86a4a' });
      }
    },
    pose(e, dt) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      e.animT = (e.animT || 0) + dt;
      const down = e.under ? -3.2 : 0;
      u.body.position.y += (1.2 + down - u.body.position.y) * Math.min(1, dt * 8);
      const walking = e.state === 'chase', running = e.state === 'charging';
      u.legs.forEach((L, i) => { L.rotation.x = walking || running ? Math.sin(e.t * (running ? 16 : 6) + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * (running ? 0.6 : 0.3) : 0; });
      const stalled = e.anim === 'stall' && e.exposed > 0;
      e.drillSpin += dt * (running ? 30 : stalled ? 0 : e.state === 'windup' ? 22 : e.state === 'busy' && e.anim === 'poke' ? 26 : 6);
      u.drill.rotation.z = e.drillSpin;
      let nod = 0;
      if (e.anim === 'wind' && e.state === 'windup') nod = 0.25;
      if (e.anim === 'poke' && e.state === 'busy') nod = e.animT < 0.6 ? -0.2 : 0.35;
      if (e.anim === 'stomp' && e.state === 'busy') nod = e.animT < 0.3 ? -0.3 : 0.1;
      if (stalled) nod = 0.35 + Math.sin(e.t * 9) * 0.05;
      u.neck.rotation.x += (nod - u.neck.rotation.x) * Math.min(1, dt * 10);
      u.jaw.rotation.x = running ? 0.3 : stalled ? 0.2 : 0;
      u.tail.rotation.y = Math.sin(e.t * (running ? 10 : 3)) * 0.25;
      u.body.rotation.z = running ? Math.sin(e.t * 16) * 0.04 : 0;
      // (Grubb: waving his fist, or out of the saddle kicking the boiler while it steams)
      u.grubb.position.x = stalled ? 0.9 : -0.1;
      u.grubb.position.y = stalled ? -0.4 : 0.62 + Math.abs(Math.sin(e.t * (running ? 16 : 4))) * 0.05;
      u.garm.rotation.x = stalled ? Math.sin(e.t * 14) * 0.8 : -1.2 + Math.sin(e.t * 6) * 0.3;
      u.core.material.emissiveIntensity = stalled ? 2.4 + Math.sin(e.t * 20) * 0.6 : 1.3;
      // smoke from the stack, steam when it stalls
      if (Math.random() < dt * (running ? 14 : 4)) e.combat.world.fx.emit('smoke', e.x + Math.sin(e.obj.rotation.y) * -0.7, 3.2, e.z + Math.cos(e.obj.rotation.y) * -0.7, 1, { color: stalled ? '#f4f0ec' : '#5a5660' });
      if (stalled && Math.random() < dt * 18) e.combat.world.fx.emit('smoke', e.x + rand(-0.8, 0.8), 1.6, e.z + rand(-0.8, 0.8), 1, { color: '#ffffff' });
    },
  },
};
