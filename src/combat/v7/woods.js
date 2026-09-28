// World v7, chapter 2: the gloom of the Whispering Woods, as foes.
//   kite         gloom kites (the Heights): Crumble’s kites, come alive. They
//                circle high, mark a line, then dive down it.
//   rootling     a knot of roots that scuttles close, marks a short lunge, lunges.
//   kit          a badger kit, all teeth: quick little bites.
//   sapling      a gloomy sprout that keeps its distance and spits seeds.
//   grumbleclaw  the gloom badger (the Rootway’s mini-boss): claw swipes in a
//                marked arc, burrows (a mound of earth races after you, then he
//                bursts up on a marked circle), calls his kits from phase 2.
//   barkbeard    the Elder of the Deepwood, gloomed (the Rootway’s boss): roots
//                burst up along marked lines (three from phase 2), acorns rain
//                on marked spots, a branch sweeps a marked arc, saplings sprout
//                from phase 2, and in phase 3 he stomps (rings to jump) and the
//                gloom knot in his chest shows (hit it: ×1.5).
// Every blow is shown before it lands.

import { THREE } from '../../render/r3d.js';
import { toward, hover, speedOf, lob } from '../v3/ai.js';
import { flat, cone, later, tickLater, hurtIn, checkPhase, leash } from '../v3/bosses.js';
import { t } from '../../i18n.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export const WOODS_ENEMIES = {
  kite: { name: 'Gloom Kite', hp: 34, speed: 3.0, r: 0.4, h: 0.7, dmg: 12, xp: 12, cost: 3, flying: true, knockRes: 0.1 },
  rootling: { name: 'Rootling', hp: 44, speed: 2.6, r: 0.34, h: 0.7, dmg: 10, xp: 11, cost: 2, knockRes: 0.3 },
  kit: { name: 'Gloom Kit', hp: 26, speed: 3.6, r: 0.3, h: 0.5, dmg: 8, xp: 6, cost: 1, knockRes: 0 },
  sapling: { name: 'Gloom Sapling', hp: 30, speed: 1.6, r: 0.32, h: 0.9, dmg: 9, xp: 6, cost: 1, knockRes: 0.2 },
  gloomlamp: { name: 'Gloom Lantern', hp: 70, speed: 0, r: 0.4, h: 1.4, dmg: 0, xp: 8, cost: 1, knockRes: 1 },
  grumbleclaw: { name: 'Grumbleclaw', title: 'Grumbleclaw, the gloom badger', hp: 520, speed: 2.5, r: 0.75, h: 1.2, dmg: 15, xp: 120, cost: 20, boss: true, knockRes: 0.85 },
  barkbeard: { name: 'Barkbeard', title: 'Barkbeard, Elder of the Deepwood', hp: 1500, speed: 1.0, r: 1.3, h: 4.2, dmg: 18, xp: 320, cost: 99, boss: true, knockRes: 1 },
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

export const WOODS_MODELS = {
  // Grumbleclaw’s gloom lantern, planted in the burrow’s floor: a crooked post, a violet flame
  gloomlamp(r3d) {
    const g = new THREE.Group(), body = grp(g);
    const wood = mat(r3d, '#5a4030'), iron = mat(r3d, '#3a3040'), flame = mat(r3d, '#d8a8ff', '#a86ae0', 1.8);
    box(body, 0.12, 1.2, 0.12, wood, 0, 0.6, 0).rotation.z = 0.08;
    box(body, 0.4, 0.06, 0.06, wood, 0.12, 1.15, 0);
    const cage = grp(body, 0.28, 0.95, 0);
    box(cage, 0.3, 0.04, 0.3, iron, 0, 0.18, 0); box(cage, 0.3, 0.04, 0.3, iron, 0, -0.18, 0);
    for (const [x, z] of [[-0.13, -0.13], [0.13, -0.13], [-0.13, 0.13], [0.13, 0.13]]) box(cage, 0.03, 0.36, 0.03, iron, x, 0, z);
    const f = ball(cage, 0.11, flame, 0, 0, 0); f.castShadow = false;
    g.userData = { body, flame: f };
    return own(g);
  },
  // a diamond kite of gloomy cloth with a cross face, a tail of bows
  kite(r3d) {
    const g = new THREE.Group(), body = grp(g, 0, 0.1, 0);
    const cloth = mat(r3d, '#5a3a7a'), cloth2 = mat(r3d, '#7a4a9a'), stick = mat(r3d, '#8a6a4a'), eye = mat(r3d, '#fff0a0', '#ffd66b', 1.3);
    const sail = grp(body, 0, 0, 0);
    const d = box(sail, 0.62, 0.62, 0.04, cloth, 0, 0, 0); d.rotation.z = Math.PI / 4; d.scale.set(1, 1.35, 1);
    const d2 = box(sail, 0.3, 0.3, 0.05, cloth2, 0, 0.12, 0.01); d2.rotation.z = Math.PI / 4;
    box(sail, 0.04, 1.2, 0.03, stick, 0, 0, 0.03); box(sail, 0.86, 0.04, 0.03, stick, 0, 0.08, 0.03);
    for (const s of [-1, 1]) { const e = box(sail, 0.12, 0.07, 0.02, eye, s * 0.13, 0.02, 0.05); e.rotation.z = s * -0.35; }
    box(sail, 0.16, 0.04, 0.02, mat(r3d, '#241a2e'), 0, -0.16, 0.05);
    const tail = [];
    let prev = grp(sail, 0, -0.58, 0);
    for (let i = 0; i < 5; i++) {
      const s = grp(prev, 0, i ? -0.22 : 0, 0);
      box(s, 0.02, 0.22, 0.02, stick, 0, -0.11, 0);
      const bow = box(s, 0.16, 0.08, 0.03, i % 2 ? mat(r3d, '#c8454f') : mat(r3d, '#f4d04a'), 0, -0.22, 0);
      bow.rotation.z = 0.4;
      tail.push(s); prev = s;
    }
    g.userData = { body, sail, tail };
    return own(g);
  },
  // a knot of roots on root legs, two violet eyes, a sprout on top
  rootling(r3d) {
    const g = new THREE.Group(), body = grp(g);
    const bark = mat(r3d, '#a47a52'), barkD = mat(r3d, '#76553a'), leaf = mat(r3d, '#7ac05a'), eye = mat(r3d, '#f0dcff', GLOOM, 1.6);
    ball(body, 0.3, bark, 0, 0.5, 0, 1, 0.85, 0.9);
    ball(body, 0.2, mat(r3d, '#8a6a9a'), 0, 0.62, -0.1, 1, 0.6, 0.9);
    const legs = [];
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4, L = grp(body, Math.cos(a) * 0.18, 0.36, Math.sin(a) * 0.18); const r = box(L, 0.08, 0.42, 0.08, barkD, 0, -0.18, 0); r.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); legs.push(L); }
    for (const s of [-1, 1]) box(body, 0.1, 0.1, 0.03, eye, s * 0.11, 0.56, 0.27);
    const sprout = grp(body, 0, 0.78, 0);
    box(sprout, 0.03, 0.16, 0.03, mat(r3d, '#4a7a3a'), 0, 0.06, 0);
    for (const s of [-1, 1]) { const l = box(sprout, 0.14, 0.03, 0.08, leaf, s * 0.07, 0.15, 0); l.rotation.z = s * 0.4; }
    g.userData = { body, legs, sprout };
    return own(g);
  },
  // a badger kit: round & grey, a striped face, gloom eyes
  kit(r3d) {
    const g = new THREE.Group(), body = grp(g);
    const fur = mat(r3d, '#a8a4ae'), dark = mat(r3d, '#3a3642'), white = mat(r3d, '#f8f4f8'), eye = mat(r3d, '#f0dcff', GLOOM, 1.6);
    ball(body, 0.24, fur, 0, 0.26, 0, 1, 0.85, 1.25);
    const head = grp(body, 0, 0.32, 0.26);
    box(head, 0.26, 0.2, 0.22, white, 0, 0, 0);
    for (const s of [-1, 1]) { box(head, 0.07, 0.21, 0.23, dark, s * 0.07, 0.005, 0); box(head, 0.05, 0.03, 0.02, eye, s * 0.07, 0.03, 0.115); }
    box(head, 0.06, 0.05, 0.05, dark, 0, -0.05, 0.12);
    const legs = [];
    for (const [x, z] of [[-0.12, 0.14], [0.12, 0.14], [-0.12, -0.14], [0.12, -0.14]]) { const L = grp(body, x, 0.12, z); box(L, 0.08, 0.14, 0.08, dark, 0, -0.06, 0); legs.push(L); }
    g.userData = { body, head, legs };
    return own(g);
  },
  // a sulking sprout on two root feet: a leafy crown gone violet, a round mouth
  sapling(r3d) {
    const g = new THREE.Group(), body = grp(g);
    const bark = mat(r3d, '#7a5a3a'), leaf = mat(r3d, '#5a8a4a'), sick = mat(r3d, '#7a5a9a');
    cyl(body, 0.09, 0.13, 0.6, bark, 0, 0.36, 0, 7);
    const legs = [];
    for (const s of [-1, 1]) { const L = grp(body, s * 0.1, 0.12, 0); box(L, 0.08, 0.16, 0.14, bark, 0, -0.04, 0.03); legs.push(L); }
    const crown = grp(body, 0, 0.78, 0);
    ball(crown, 0.28, leaf, 0, 0, 0, 1, 0.8, 1);
    ball(crown, 0.18, sick, 0.14, 0.12, 0.08);
    ball(crown, 0.16, sick, -0.16, 0.06, -0.06);
    box(body, 0.1, 0.08, 0.02, mat(r3d, '#2a1a2a'), 0, 0.5, 0.12);
    for (const s of [-1, 1]) box(body, 0.05, 0.05, 0.02, mat(r3d, '#e8c8ff', GLOOM, 1.2), s * 0.06, 0.6, 0.12);
    g.userData = { body, legs, crown };
    return own(g);
  },
  // Grumbleclaw: a big grumpy badger in a miner’s helmet (its lamp snuffed with gloom)
  grumbleclaw(r3d) {
    const g = new THREE.Group(), body = grp(g);
    const fur = mat(r3d, '#9a96a2'), furD = mat(r3d, '#76727e'), dark = mat(r3d, '#3a3642'), white = mat(r3d, '#f8f4f8'), claw = mat(r3d, '#f0e6d4');
    const eye = mat(r3d, '#f0d8ff', GLOOM, 1.4), helm = mat(r3d, '#c8983e'), helmD = mat(r3d, '#8a6a2a');
    const torso = grp(body, 0, 0.72, 0);
    ball(torso, 0.62, fur, 0, 0, 0, 1.05, 0.82, 1.3);
    ball(torso, 0.5, furD, 0, 0.18, -0.2, 1, 0.6, 1.1);
    const head = grp(torso, 0, 0.18, 0.72);
    box(head, 0.62, 0.46, 0.5, white, 0, 0, 0);
    for (const s of [-1, 1]) { box(head, 0.16, 0.47, 0.51, dark, s * 0.16, 0.005, 0); box(head, 0.1, 0.06, 0.02, eye, s * 0.16, 0.06, 0.26); box(head, 0.12, 0.14, 0.08, dark, s * 0.24, 0.28, -0.12); }
    box(head, 0.14, 0.1, 0.1, mat(r3d, '#e89aa8'), 0, -0.12, 0.28);
    // the helmet with its gloomy lamp
    const hat = grp(head, 0, 0.28, -0.02);
    ball(hat, 0.3, helm, 0, 0, 0, 1.1, 0.6, 1.05);
    box(hat, 0.7, 0.04, 0.62, helmD, 0, -0.08, 0.02);
    const lamp = box(hat, 0.14, 0.12, 0.08, mat(r3d, '#d8b8ff', GLOOM, 1.6), 0, 0.02, 0.32);
    const arms = [];
    for (const s of [-1, 1]) {
      const A = grp(torso, s * 0.5, -0.1, 0.46);
      box(A, 0.24, 0.5, 0.26, furD, 0, -0.2, 0);
      for (let k = -1; k <= 1; k++) { const c = box(A, 0.05, 0.05, 0.24, claw, k * 0.07, -0.44, 0.14); c.rotation.x = 0.3; }
      arms.push(A);
    }
    const legs = [];
    for (const [x, z] of [[-0.38, -0.5], [0.38, -0.5]]) { const L = grp(torso, x, -0.3, z); box(L, 0.24, 0.34, 0.3, dark, 0, -0.16, 0); legs.push(L); }
    g.userData = { body, torso, head, arms, legs, lamp };
    return own(g);
  },
  // Barkbeard: an elder treant — a trunk of a body on root legs, branch arms,
  // a mossy beard, a leafy crown; gloom vines round him and a gloom knot in his chest
  barkbeard(r3d) {
    const g = new THREE.Group(), body = grp(g);
    const bark = mat(r3d, '#98724e'), barkD = mat(r3d, '#6e5038'), barkL = mat(r3d, '#b08a62'), moss = mat(r3d, '#6aa04a'), mossD = mat(r3d, '#4e823a');
    const leaf = mat(r3d, '#5a9a48'), leafG = mat(r3d, '#8a62b0'), vine = mat(r3d, '#8a4ac0', GLOOM, 0.6);
    const legs = [];
    for (const s of [-1, 1]) {
      const L = grp(body, s * 0.55, 1.1, 0);
      cyl(L, 0.3, 0.42, 1.1, barkD, 0, -0.55, 0, 8);
      for (let k = 0; k < 3; k++) { const r = box(L, 0.16, 0.16, 0.7, barkD, (k - 1) * 0.2, -1.05, 0.25); r.rotation.x = -0.25; }
      legs.push(L);
    }
    const trunk = grp(body, 0, 2.25, 0);
    cyl(trunk, 0.78, 1.0, 2.4, bark, 0, 0, 0, 10);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const s = box(trunk, 0.08, 2.2, 0.08, barkD, Math.cos(a) * 0.86, 0, Math.sin(a) * 0.86); s.rotation.y = -a; }
    // the face: deep eyes (gloom violet; green once freed), a knot of a nose, a mossy beard
    const eyes = [];
    for (const s of [-1, 1]) { box(trunk, 0.26, 0.16, 0.1, barkD, s * 0.28, 0.62, 0.86); eyes.push(box(trunk, 0.16, 0.1, 0.06, mat(r3d, '#e8c8ff', GLOOM, 1.6), s * 0.28, 0.6, 0.92)); }
    ball(trunk, 0.14, barkL, 0, 0.36, 0.95, 1, 1.2, 1);
    box(trunk, 0.4, 0.08, 0.06, mat(r3d, '#2a1a1e'), 0, 0.12, 0.92);
    const beard = grp(trunk, 0, -0.1, 0.9);
    for (let i = 0; i < 7; i++) { const x = (i - 3) * 0.13; ball(beard, 0.14, i % 2 ? moss : mossD, x, -0.18 - Math.abs(x) * -0.2 - (3 - Math.abs(i - 3)) * 0.12, 0, 0.9, 1.6, 0.7); }
    // the gloom knot in his chest (it shows in phase 3)
    const heart = ball(trunk, 0.26, mat(r3d, '#c89aff', GLOOM, 0.3), 0, -0.55, 0.9, 1, 1.2, 0.5);
    // branch arms with twig fingers
    const arms = [];
    for (const s of [-1, 1]) {
      const A = grp(trunk, s * 0.9, 0.7, 0);
      const up = grp(A, 0, 0, 0); up.rotation.z = s * -0.5;
      cyl(up, 0.16, 0.22, 1.2, bark, 0, -0.6, 0, 7);
      const fore = grp(up, 0, -1.15, 0); fore.rotation.z = s * 0.5;
      cyl(fore, 0.12, 0.16, 1.0, bark, 0, -0.5, 0, 7);
      for (let k = 0; k < 3; k++) { const f = box(fore, 0.06, 0.5, 0.06, barkD, (k - 1) * 0.1, -1.1, 0.05); f.rotation.z = (k - 1) * 0.35; }
      ball(fore, 0.2, leaf, 0, -0.35, 0.1, 1, 0.7, 1);
      arms.push(up);
    }
    // the crown: great leafy clouds, streaked with gloom
    const crown = grp(trunk, 0, 1.7, -0.1);
    for (const [x, y, z, r, gl] of [[0, 0.5, 0, 1.2, 0], [-1, 0.1, 0.2, 0.9, 1], [1, 0.15, 0.1, 0.95, 0], [0.3, 1.1, -0.2, 0.8, 1], [-0.5, 0.9, 0.4, 0.7, 0], [0.8, 0.8, 0.4, 0.6, 1]]) ball(crown, r, gl ? leafG : leaf, x, y, z, 1, 0.8, 1);
    // gloom vines wrapped round him
    const vines = grp(body, 0, 0, 0);
    for (let i = 0; i < 5; i++) { const v = box(vines, 2.1, 0.1, 0.1, vine, 0, 1.4 + i * 0.42, 0); v.rotation.y = i * 0.9; v.rotation.z = 0.35; }
    g.userData = { body, legs, trunk, arms, crown, eyes, heart, beard, vines };
    return own(g);
  },
};

// ------------------------------------------------------------------ brains
// (a root spike: pops out of the ground and sinks back)
let spikeGeo = null;
function spike(C, x, z) {
  spikeGeo = spikeGeo || new THREE.ConeGeometry(0.28, 1.5, 6).translate(0, 0.75, 0);
  const m = new THREE.Mesh(spikeGeo, C.mat(0x6a4a2e));
  m.position.set(x + rand(-0.15, 0.15), -1.5, z); m.rotation.set(rand(-0.25, 0.25), rand(0, 6), rand(-0.25, 0.25));
  m.castShadow = true;
  C.root.add(m);
  C.fxMeshes.push({ m, t: 0.9, life: 0.9, fn: (q, k) => { q.m.position.y = k > 0.8 ? -1.5 * ((k - 0.8) / 0.2) : k < 0.3 ? -1.5 * (1 - k / 0.3) : 0; } });
}

export const WOODS_BRAINS = {
  // (it just burns — and while it does, Grumbleclaw shrugs off half of every blow)
  gloomlamp: {
    init(e) { e.state = 'idle'; },
    think(e, dt, tgt, C) { if (Math.random() < dt * 3) C.world.fx.emit('sparkle', e.x + 0.28, 1.2, e.z, 1, { color: '#c8a8ff' }); },
    pose(e) { const u = e.obj.userData; u.flame.scale.setScalar(1 + Math.sin(e.t * 11) * 0.15); },
  },
  kite: {
    init(e) { e.y = 2.4; e.state = 'chase'; e.timer = rand(1.4, 2.4); },
    think(e, dt, tgt, C) {
      if (!tgt) return;
      if (e.state === 'chase') {
        e.ang = (e.ang ?? Math.random() * 6) + dt * 0.9;
        const tx = tgt.pos.x + Math.cos(e.ang) * 4.6, tz = tgt.pos.z + Math.sin(e.ang) * 3.2;
        C.moveEnemy(e, (tx - e.x) * dt * 1.8, (tz - e.z) * dt * 1.8, false, true);
        e.faceTo(tgt.pos.x, tgt.pos.z);
        e.y += (2.4 + Math.sin(e.t * 2) * 0.3 - e.y) * dt * 3;
        if (e.timer <= 0) {
          const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, d = Math.hypot(dx, dz) || 1;
          e.aim = { x: dx / d, z: dz / d }; e.dist = d + 4;
          e.state = 'mark'; e.timer = 0.8;
          C.telegraphLine(e, e.aim, e.dist, 0.8);
          C.sfx('whoosh', e);
        }
      } else if (e.state === 'mark') {
        e.face = e.aim; e.y += (3 - e.y) * dt * 4;
        if (e.timer <= 0) { e.state = 'dive'; e.timer = e.dist / 11; e.hitOnce.clear(); }
      } else if (e.state === 'dive') {
        C.moveEnemy(e, e.aim.x * 11 * dt, e.aim.z * 11 * dt, false, true);
        e.y += (0.5 - e.y) * dt * 10;
        if (e.y < 1.2) C.enemyTouch(e, e.def.dmg, 3, 0.6);
        if (e.timer <= 0) { e.state = 'chase'; e.timer = rand(2.6, 3.6); }
      }
    },
    pose(e) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      u.sail.rotation.x = e.state === 'dive' ? -1.1 : -0.35 + Math.sin(e.t * 3) * 0.12;
      u.sail.rotation.z = Math.sin(e.t * 2.3) * 0.2;
      u.tail.forEach((s, i) => { s.rotation.z = Math.sin(e.t * 5 - i * 0.8) * 0.35; s.rotation.x = Math.sin(e.t * 4 - i) * 0.2; });
    },
  },
  rootling: {
    init(e) { e.state = 'chase'; e.timer = 1; },
    think(e, dt, tgt, C) {
      if (!tgt) return;
      const sp = speedOf(e, C);
      if (e.state === 'chase') {
        const d = toward(e, C, tgt, sp, dt, 1.6);
        if (d < 2.7 && e.timer <= 0) {
          const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, l = Math.hypot(dx, dz) || 1;
          e.lane = { x: dx / l, z: dz / l }; e.state = 'wind'; e.timer = 0.55;
          C.telegraphLine(e, e.lane, 3, 0.55);
        }
      } else if (e.state === 'wind' && e.timer <= 0) { e.state = 'lunge'; e.timer = 0.28; e.hitOnce.clear(); }
      else if (e.state === 'lunge') {
        C.moveEnemy(e, e.lane.x * 10 * dt, e.lane.z * 10 * dt);
        C.enemyTouch(e, e.def.dmg, 2.5, 0.6);
        if (e.timer <= 0) { e.state = 'chase'; e.timer = rand(1.2, 1.8); }
      }
    },
    pose(e) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      const run = e.state === 'lunge' ? 26 : 12;
      u.legs.forEach((L, i) => { L.rotation.x = Math.sin(e.t * run + i * 1.6) * 0.4; });
      u.body.position.y = e.state === 'wind' ? -0.1 : Math.abs(Math.sin(e.t * run * 0.5)) * 0.06;
      u.sprout.rotation.z = Math.sin(e.t * 6) * 0.3;
    },
  },
  kit: {
    init(e) { e.state = 'chase'; e.timer = 0.6; },
    think(e, dt, tgt, C) {
      if (!tgt) return;
      const d = toward(e, C, tgt, speedOf(e, C), dt, 0.7);
      if (d < 1.05 && e.timer <= 0) { e.hitOnce.clear(); C.enemyTouch(e, e.def.dmg, 1.6, 0.9); e.timer = 0.9; e.bite = 0.2; }
      if (e.bite > 0) e.bite -= dt;
    },
    pose(e) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      u.legs.forEach((L, i) => { L.rotation.x = Math.sin(e.t * 18 + i * Math.PI * 0.5) * 0.6; });
      u.head.rotation.x = e.bite > 0 ? 0.4 : 0;
    },
  },
  sapling: {
    init(e) { e.state = 'chase'; e.timer = rand(1.4, 2.4); },
    think(e, dt, tgt, C) {
      if (!tgt) return;
      hover(e, C, tgt, speedOf(e, C), dt, 3.5, 6);
      if (e.timer <= 0) { e.timer = rand(2.2, 3); e.spit = 0.3; lob(C, e, { x: tgt.pos.x, z: tgt.pos.z }, { r: 1, dmg: e.def.dmg, t: 1.0, look: 'acorn', knock: 2 }); }
      if (e.spit > 0) e.spit -= dt;
    },
    pose(e) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      u.legs.forEach((L, i) => { L.rotation.x = Math.sin(e.t * 9 + i * Math.PI) * 0.4; });
      u.crown.scale.setScalar(e.spit > 0 ? 1.15 : 1);
      u.crown.rotation.z = Math.sin(e.t * 2) * 0.1;
    },
  },

  // ---------------------------------------------------------------- Grumbleclaw
  grumbleclaw: {
    init(e) { e.state = 'chase'; e.timer = 1.4; e.phase = 1; e.last = null; e.lamps = 0; },
    onHit(e) {
      if (e.lamps > 0 && !(e.shT > 0)) { e.shT = 2.5; e.combat.popText(e.x, e.def.h + 0.8, e.z, t('His gloom lanterns shield him!'), '#c8a8ff'); }
      if (e.exposed > 0) e.flash = 0.12;
    },
    think(e, dt, tgt, C) {
      tickLater(e, dt);
      leash(e, C);
      // (his gloom lanterns: while one burns he takes half; the last one out leaves him dazed)
      e.shT = Math.max(0, (e.shT || 0) - dt);
      if (e.exposed > 0) e.exposed -= dt;
      const lit = C.enemies.filter((q) => q.alive && q.lampOf === e).length;
      if (e.lamps > 0 && lit === 0) { e.exposed = 3.5; C.bubble(e, t('My lanterns! My LOVELY lanterns!'), 1.8); C.popText(e.x, e.def.h + 1, e.z, t('Dazed!'), '#ffd66b', true); }
      e.lamps = lit;
      if (e.state !== 'roar' && e.state !== 'under' && e.state !== 'popping' && checkPhase(e, C, (ph) => { C.bubble(e, ph === 2 ? t('GRUMBLE GRUMBLE!') : t('My burrow! MY BURROW!'), 2); this.lanterns(e, C); })) return;
      if (e.state === 'roar') { if (e.timer <= 0) { e.state = 'chase'; e.timer = 0.8; } return; }
      if (!tgt) return;
      const sp = speedOf(e, C) * (e.phase >= 3 ? 1.2 : 1);
      if (e.state === 'chase') {
        const d = toward(e, C, tgt, sp, dt, 1.4);
        if (e.timer > 0) return;
        const opts = ['burrow'];
        if (d < 3.2) opts.push('swipe', 'swipe');
        if (e.phase >= 2 && C.enemies.filter((q) => q.alive && q.summoner === e).length < 3) opts.push('call');
        let a = pick(opts);
        if (a === e.last && opts.length > 1) a = pick(opts.filter((o) => o !== a));
        e.last = a;
        this[a](e, C, tgt);
      } else if (e.state === 'busy' && e.timer <= 0) { e.state = 'chase'; e.timer = rand(0.9, 1.5); }
      else if (e.state === 'under') {
        // a mound of earth races after you, then he bursts up where you stand
        toward(e, C, tgt, sp * 1.7, dt, 0.3);
        if (Math.random() < dt * 22) C.world.fx.emit('dust', e.x, 0.1, e.z, 1, { color: '#8a6a4a' });
        if (e.timer <= 0) {
          const x = tgt.pos.x, z = tgt.pos.z;
          e.state = 'popping'; e.timer = 9;
          C.telegraphCircle(x, z, 1.8, 0.9);
          later(e, 0.9, () => {
            e.x = x; e.z = z; e.under = false; e.state = 'busy'; e.timer = 1.1;
            hurtIn(C, e, (p) => Math.hypot(p.pos.x - x, p.pos.z - z) < 1.9 && p.actor.jumpY < 0.6, e.def.dmg * 1.3, { knock: 4, launch: 5 });
            C.vfx.shockwave(x, z, { r: 2, color: '#b08a5a', life: 0.4, wall: 0.6 });
            C.world.fx.emit('dust', x, 0.2, z, 16, { color: '#8a6a4a' });
            C.shakeAt(e, 0.4); C.sfx('slam', e);
          });
        }
      }
    },
    swipe(e, C, tgt) {
      const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, l = Math.hypot(dx, dz) || 1, dir = { x: dx / l, z: dz / l };
      e.state = 'busy'; e.timer = 1.25; e.anim = 'swipe'; e.animT = 0;
      e.faceTo(tgt.pos.x, tgt.pos.z);
      cone(C, e.x, e.z, dir, 3.3, 1.6, 0.65, 0xff5a6a);
      later(e, 0.65, () => {
        hurtIn(C, e, (p) => { const px = p.pos.x - e.x, pz = p.pos.z - e.z, pd = Math.hypot(px, pz); return pd < 3.4 && (px * dir.x + pz * dir.z) / (pd || 1) > Math.cos(0.8); }, e.def.dmg, { knock: 4 });
        C.sfx('whoosh', e);
      });
    },
    burrow(e, C) {
      e.state = 'under'; e.under = true; e.timer = rand(1.8, 2.6);
      C.bubble(e, pick([t('Dig dig dig!'), t('Down I go!'), t('You can’t see me!')]), 1.1);
      C.world.fx.emit('dust', e.x, 0.2, e.z, 14, { color: '#8a6a4a' });
      C.sfx('dig', e);
    },
    // (phases 2 and 3) two gloom lanterns planted at the burrow’s edge
    lanterns(e, C) {
      const H = e.home || { x: e.x, z: e.z };
      for (let i = 0; i < 2; i++) {
        const a = Math.random() * Math.PI * 2, s = C.freeSpot(H.x + Math.cos(a) * 5, H.z + Math.sin(a) * 4, 2) || { x: H.x + (i ? 4 : -4), z: H.z };
        const q = C.spawn('gloomlamp', s.x, s.z, { level: e.level });
        q.lampOf = e; q.summoner = e;
        C.world.fx.emit('smoke', s.x, 0.8, s.z, 8, { color: '#6a4a8e' });
      }
      if (!e.toldLamps) { e.toldLamps = true; C.party.toast(t('Grumbleclaw plants gloom lanterns — knock them out!'), '#c8a8ff'); }
    },
    call(e, C) {
      e.state = 'busy'; e.timer = 1.4; e.anim = 'roar'; e.animT = 0;
      C.bubble(e, t('Kits! To your grumpy old dad!'), 1.6);
      C.sfx('growl', e);
      for (let i = 0; i < 2; i++) {
        const s = C.freeSpot(e.x + rand(-2, 2), e.z + rand(-2, 2), 2) || { x: e.x, z: e.z + 1.5 };
        const q = C.spawn('kit', s.x, s.z, { level: e.level });
        q.summoner = e;
      }
    },
    pose(e, dt) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      e.animT = (e.animT || 0) + dt;
      const down = e.under ? -1.5 : 0;
      u.body.position.y += (down - u.body.position.y) * Math.min(1, dt * 9);
      const moving = e.state === 'chase';
      u.legs.forEach((L, i) => { L.rotation.x = moving ? Math.sin(e.t * 9 + i * Math.PI) * 0.5 : 0; });
      let arm = 0;
      if (e.anim === 'swipe') arm = e.animT < 0.6 ? -1.6 * Math.min(1, e.animT / 0.3) : e.animT < 0.8 ? 0.9 : 0.2;
      if (e.anim === 'roar') arm = -0.8;
      for (const [i, A] of u.arms.entries()) A.rotation.x += ((i ? arm : arm * 0.6) - A.rotation.x) * Math.min(1, dt * 12);
      u.head.rotation.x = e.anim === 'roar' && e.animT < 1 ? -0.4 : 0;
      u.lamp.material.emissiveIntensity = 1.2 + Math.sin(e.t * 7) * 0.4;
    },
  },

  // ---------------------------------------------------------------- Barkbeard
  barkbeard: {
    init(e) { e.state = 'chase'; e.timer = 2; e.phase = 1; e.last = null; e.sapT = 6; },
    onHit(e) { if (e.exposed > 0) e.flash = 0.12; },
    think(e, dt, tgt, C) {
      tickLater(e, dt);
      leash(e, C);
      if (e.exposed > 0) e.exposed -= dt;
      this.goldAcorns(e, C, dt);
      if (e.state !== 'roar' && checkPhase(e, C, (ph) => C.bubble(e, ph === 2 ? t('…roots… remember…') : t('THE DARK… IS SO… LOUD!'), 2.2))) return;
      if (e.state === 'roar') { if (e.timer <= 0) { e.state = 'chase'; e.timer = 1; } return; }
      if (!tgt) return;
      if (e.phase >= 2) { e.sapT -= dt; if (e.sapT <= 0 && C.enemies.filter((q) => q.alive && q.summoner === e).length < 4) { e.sapT = 12; this.saplings(e, C); } }
      const sp = speedOf(e, C);
      if (e.state === 'chase') {
        const d = toward(e, C, tgt, sp, dt, 2.6);
        if (e.timer > 0) return;
        const opts = ['roots', 'acorns'];
        if (d < 4.6) opts.push('sweep', 'sweep');
        if (e.phase >= 3) opts.push('stomp', 'stomp');
        let a = pick(opts);
        if (a === e.last && opts.length > 1) a = pick(opts.filter((o) => o !== a));
        e.last = a;
        this[a](e, C, tgt);
      } else if (e.state === 'busy' && e.timer <= 0) { e.state = 'chase'; e.timer = rand(1.0, 1.7) / (e.phase >= 3 ? 1.25 : 1); }
    },
    // roots burst up along marked lines toward you (three of them from phase 2)
    roots(e, C, tgt) {
      const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, l = Math.hypot(dx, dz) || 1, dir = { x: dx / l, z: dz / l };
      e.state = 'busy'; e.timer = 1.8; e.anim = 'roots'; e.animT = 0;
      e.faceTo(tgt.pos.x, tgt.pos.z);
      for (const off of e.phase >= 2 ? [-0.4, 0, 0.4] : [0]) {
        const c = Math.cos(off), s = Math.sin(off), d2 = { x: dir.x * c - dir.z * s, z: dir.x * s + dir.z * c };
        C.telegraphLine(e, d2, 11, 0.9);
        for (let k = 1; k <= 10; k++) later(e, 0.9 + k * 0.05, () => {
          const x = e.x + d2.x * k, z = e.z + d2.z * k;
          hurtIn(C, e, (p) => Math.hypot(p.pos.x - x, p.pos.z - z) < 0.9 && p.actor.jumpY < 0.7, e.def.dmg * 0.9, { knock: 3, launch: 4 });
          spike(C, x, z);
          if (k % 3 === 0) C.world.fx.emit('dust', x, 0.2, z, 3, { color: '#6a4a2a' });
        });
      }
      C.bubble(e, pick([t('ROOTS!'), t('Hmmm… MMMM!')]), 1);
      C.sfx('thud', e);
    },
    // acorns rain down on marked spots round everyone
    acorns(e, C) {
      e.state = 'busy'; e.timer = 1.6; e.anim = 'shake'; e.animT = 0;
      const heroes = C.alivePlayers();
      for (const p of heroes) for (let k = 0; k < (e.phase >= 2 ? 3 : 2); k++) {
        const x = p.pos.x + rand(-2, 2), z = p.pos.z + rand(-1.6, 1.6);
        later(e, k * 0.18, () => lob(C, e, { x, z }, { r: 1.1, dmg: e.def.dmg * 0.8, t: 1.1, look: 'acorn', knock: 2 }));
        // (the odd one lands golden — kick it back where it came from)
        if (k === 0) later(e, 1.3, () => this.goldAcorn(e, C, x, z));
      }
      C.sfx('whoosh', e);
    },
    // a golden acorn on the ground for a while: step on it and it flies back into his beard —
    // he chokes on it (the knot in his chest shows: ×1.5)
    goldAcorn(e, C, x, z) {
      if (!e.alive) return;
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 1), new THREE.MeshToonMaterial({ color: 0xf2c14e, emissive: 0xc89020, emissiveIntensity: 0.9, gradientMap: C.r3d.gradient }));
      m.scale.set(1, 1.25, 1); m.position.set(x, 0.3, z); C.root.add(m);
      (e.golden || (e.golden = [])).push({ m, x, z, life: 6, fly: null });
      if (!e.toldGold) { e.toldGold = true; C.party.toast(t('A golden acorn! Kick it back into Barkbeard’s beard!'), '#ffd66b'); }
    },
    goldAcorns(e, C, dt) {
      for (const A of e.golden || []) {
        if (A.fly) {
          A.fly.t += dt;
          const k = Math.min(1, A.fly.t / 0.45);
          A.m.position.set(A.x + (e.x - A.x) * k, 0.3 + Math.sin(k * Math.PI) * 2.4 + k * 2.4, A.z + (e.z - A.z) * k);
          if (k >= 1) {
            A.done = true; C.root.remove(A.m);
            e.exposed = Math.max(e.exposed || 0, 3.5); e.flash = 0.2;
            C.bubble(e, pick([t('HRRK— an ACORN… in my BEARD…'), t('…my own… acorn… how RUDE…')]), 1.6);
            C.popText(e.x, e.def.h + 1, e.z, t('Choked on an acorn!'), '#ffd66b', true);
            C.sfx('bonk', e); C.shakeAt(e, 0.3);
          }
          continue;
        }
        A.life -= dt;
        A.m.rotation.y += dt * 2; A.m.position.y = 0.3 + Math.abs(Math.sin(A.life * 4)) * 0.12;
        if (A.life <= 0 || !e.alive) { A.done = true; C.root.remove(A.m); continue; }
        if (C.alivePlayers().some((p) => Math.hypot(p.pos.x - A.x, p.pos.z - A.z) < 0.8)) { A.fly = { t: 0 }; C.sfx('whoosh', e); }
      }
      if (e.golden) e.golden = e.golden.filter((A) => !A.done);
    },
    // a great branch sweeps a marked arc in front of him
    sweep(e, C, tgt) {
      const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, l = Math.hypot(dx, dz) || 1, dir = { x: dx / l, z: dz / l };
      e.state = 'busy'; e.timer = 1.5; e.anim = 'sweep'; e.animT = 0;
      e.faceTo(tgt.pos.x, tgt.pos.z);
      cone(C, e.x, e.z, dir, 4.8, 2.2, 0.85, 0xff5a6a);
      later(e, 0.85, () => {
        hurtIn(C, e, (p) => { const px = p.pos.x - e.x, pz = p.pos.z - e.z, pd = Math.hypot(px, pz); return pd < 4.9 && (px * dir.x + pz * dir.z) / (pd || 1) > Math.cos(1.1); }, e.def.dmg * 1.2, { knock: 6 });
        C.sfx('whoosh', e); C.shakeAt(e, 0.3);
      });
    },
    // phase 3: he stomps (rings to jump over) and the gloom knot in his chest shows
    stomp(e, C) {
      e.state = 'busy'; e.timer = 2.4; e.anim = 'stomp'; e.animT = 0;
      for (const [k, r] of [[0, 2.8], [0.5, 4.6], [1.0, 6.4]]) {
        later(e, k, () => {
          flat(C, new THREE.RingGeometry(Math.max(0.1, r - 0.6), r + 0.6, 40).rotateX(-Math.PI / 2), e.x, e.z, 0x8a5a3a, 0.7);
          later(e, 0.7, () => {
            hurtIn(C, e, (p) => { const pd = Math.hypot(p.pos.x - e.x, p.pos.z - e.z); return Math.abs(pd - r) < 0.8 && p.actor.jumpY < 0.5; }, e.def.dmg * 0.8, { knock: 3 });
            C.vfx.shockwave(e.x, e.z, { r, color: '#b08a5a', life: 0.4, wall: 0.5 });
            C.sfx('thud', e);
          });
        });
      }
      e.exposed = 4.5;
      C.bubble(e, t('…the knot… my heart… it HURTS…'), 1.8);
      C.shakeAt(e, 0.5);
    },
    saplings(e, C) {
      for (let i = 0; i < 3; i++) {
        const s = C.freeSpot(e.x + rand(-3, 3), e.z + rand(1, 3), 2) || { x: e.x, z: e.z + 2 };
        const q = C.spawn('sapling', s.x, s.z, { level: e.level });
        q.summoner = e;
        C.world.fx.emit('dust', s.x, 0.2, s.z, 8, { color: '#6a4a2a' });
      }
      C.bubble(e, t('Grow… little ones…'), 1.4);
    },
    pose(e, dt) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      e.animT = (e.animT || 0) + dt;
      const moving = e.state === 'chase';
      u.legs.forEach((L, i) => { L.rotation.x = moving ? Math.sin(e.t * 3 + i * Math.PI) * 0.25 : 0; });
      u.body.rotation.z = Math.sin(e.t * 1.2) * 0.03 + (moving ? Math.sin(e.t * 3) * 0.03 : 0);
      let armL = 0, armR = 0;
      if (e.anim === 'sweep') { const k = e.animT; armR = k < 0.8 ? -1.6 * Math.min(1, k / 0.4) : k < 1.1 ? 1.2 : 0.4; }
      if (e.anim === 'roots') { armL = armR = e.animT < 0.9 ? -0.9 : 0.5; }
      if (e.anim === 'stomp') { armL = armR = -0.5; u.body.position.y = e.animT < 2 ? Math.abs(Math.sin(e.animT * Math.PI * 2)) * 0.25 : 0; }
      if (e.anim === 'shake') { u.crown.rotation.z = Math.sin(e.animT * 30) * 0.12 * Math.max(0, 1 - e.animT); }
      else u.crown.rotation.z += (0 - u.crown.rotation.z) * Math.min(1, dt * 6);
      u.arms[0].rotation.x += (armL - u.arms[0].rotation.x) * Math.min(1, dt * 8);
      u.arms[1].rotation.x += (armR - u.arms[1].rotation.x) * Math.min(1, dt * 8);
      u.heart.material.emissiveIntensity = e.exposed > 0 ? 1.6 + Math.sin(e.t * 18) * 0.5 : e.phase >= 3 ? 0.7 : 0.25;
      for (const eye of u.eyes) eye.material.emissiveIntensity = 1.4 + Math.sin(e.t * 3) * 0.3;
    },
  },
};

// Barkbeard as himself again (for the scenes and his place by the falls): green
// eyes, no gloom vines, a quiet knot; `userData.anim(t)` sways him a little
export function buildBarkbeard(r3d) {
  const g = WOODS_MODELS.barkbeard(r3d), u = g.userData;
  u.vines.visible = false;
  for (const e of u.eyes) { e.material.color.set('#e8ffe0'); e.material.emissive.set('#6af0a0'); e.material.emissiveIntensity = 1.2; }
  u.heart.material.color.set('#8a6a4a'); u.heart.material.emissiveIntensity = 0;
  u.crown.children.forEach((b, i) => { if (i % 2) b.material = b.material.clone(), b.material.color.set('#5a9a48'); });
  u.anim = (t) => { u.body.rotation.z = Math.sin(t * 0.7) * 0.025; u.crown.rotation.z = Math.sin(t * 0.9 + 1) * 0.03; u.arms[0].rotation.x = Math.sin(t * 0.6) * 0.06; u.arms[1].rotation.x = Math.sin(t * 0.6 + 2) * 0.06; };
  return g;
}
