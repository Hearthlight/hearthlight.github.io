// The brutes: four big, slow, loud foes of the wild lands. Each has its own shape and its own
// way to fight — and each can be caught out:
//   boar       the Gloom Boar paws the ground (a lane), then charges straight down it. Step
//              aside: it skids into whatever is there, or runs out of breath — dizzy. A swipe
//              of the tusks for whoever stands under its snout.
//   gustbelly  breathes in (a cone that draws you closer while its belly swells), then blows a
//              gale that sends you flying for little harm. Blows count double while it breathes
//              in, and enough of them pop it: it whizzes off backwards and lies flat. Now and
//              then a hop and a belly flop.
//   stormram   rears and stomps: a ring of sparks races out along the ground (hop over it, or
//              stand clear). Three stomps, each ring wider — then its wool is spent and it
//              pants. A headbutt for whoever stands right in front.
//   ogre       lobs boulders from afar (circles where they land); close, it lifts its tree
//              trunk and smashes a lane: step aside and the club sticks in the ground.
// Helpless (stars turning over its head), a brute takes half as much again. Enough blows in a
// short while make it reel too (the little bar under its health). Light hits don’t move it, but
// it shows every one of them.

import { THREE } from '../../render/r3d.js';
import { audio } from '../../engine/audio.js';
import { drawText } from '../../engine/font.js';
import { TT } from '../../world/tiles.js';
import { speedOf } from '../v3/ai.js';
import { t } from '../../i18n.js';

const rand = (a, b) => a + Math.random() * (b - a);
const norm = (x, z) => { const l = Math.hypot(x, z) || 1; return { x: x / l, z: z / l }; };
const to = (e, tgt) => norm(tgt.pos.x - e.x, tgt.pos.z - e.z);
const ease = (k) => k * k * (3 - 2 * k);
const RED = 0xff5a6a, INK = '#1e1428';
const POISE = 0.55;          // this share of its health in quick blows, and a brute reels
const FALL = 1.05;           // seconds a beaten brute takes to topple over and poof
const REACH = [4, 5.5, 7];   // how far the Storm Ram’s three rings run

export const BRUTE_ENEMIES = {
  boar: { name: 'Gloom Boar', hp: 140, speed: 1.9, r: 0.75, h: 1.5, dmg: 16, xp: 30, cost: 6, knockRes: 0.92, brute: true },
  gustbelly: { name: 'Gustbelly', hp: 150, speed: 1.4, r: 0.9, h: 2.0, dmg: 14, xp: 30, cost: 6, knockRes: 0.95, brute: true },
  stormram: { name: 'Storm Ram', hp: 150, speed: 1.7, r: 0.8, h: 1.8, dmg: 16, xp: 32, cost: 6, knockRes: 0.92, brute: true, elem: 'shock' },
  ogre: { name: 'Gloom Ogre', hp: 175, speed: 1.5, r: 0.85, h: 2.4, dmg: 19, xp: 34, cost: 7, knockRes: 0.95, brute: true },
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
function ball(g, r, m, x, y, z, sx = 1, sy = 1, sz = 1, detail = 1) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail), m); b.position.set(x, y, z); b.scale.set(sx, sy, sz); b.castShadow = true; g.add(b); return b; }
function cyl(g, rt, rb, h, m, x, y, z, n = 8) { const b = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, n), m); b.position.set(x, y, z); b.castShadow = true; g.add(b); return b; }
function spike(g, r, h, m, x, y, z, rx = 0, rz = 0, n = 5) { const b = new THREE.Mesh(new THREE.ConeGeometry(r, h, n), m); b.position.set(x, y, z); b.rotation.set(rx, 0, rz); b.castShadow = true; g.add(b); return b; }
const grp = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
// two glowing eyes under cross brows
function glare(r3d, g, y, z, gap, s = 0.12) {
  const eye = mat(r3d, '#fff3a0', '#ffe066', 1.6), ink = mat(r3d, INK);
  for (const sx of [-1, 1]) {
    box(g, s, s * 1.15, 0.06, eye, sx * gap, y, z);
    box(g, s * 0.42, s * 0.5, 0.04, ink, sx * (gap - s * 0.16), y - s * 0.2, z + 0.025);
    // (the brow sits back, so the eye still shows from above)
    box(g, s * 1.7, s * 0.4, 0.06, ink, sx * gap, y + s * 0.82, z - 0.03).rotation.z = sx * 0.42;
  }
}

export const BRUTE_MODELS = {
  // a boar as broad as a cart: a bristly back, two big ivory tusks, small angry eyes
  boar(r3d) {
    const g = new THREE.Group(), size = grp(g), body = grp(size);
    size.scale.setScalar(1.12);
    const hide = mat(r3d, '#5a326e'), dark = mat(r3d, '#3c204e'), snout = mat(r3d, '#8a5ea2'), pink = mat(r3d, '#f6a2c0'), tusk = mat(r3d, '#fffbe8', '#d8c488', 0.55), mane = mat(r3d, '#e088ff', '#8a3ad0', 0.6), mane2 = mat(r3d, '#b65cf0', '#6a2ab0', 0.5), hoof = mat(r3d, INK);
    const trunk = grp(body, 0, 0.84, -0.2);
    ball(trunk, 0.66, hide, 0, 0, 0, 1.22, 0.9, 1.12);
    ball(trunk, 0.5, dark, 0, 0.14, 0.34, 1.3, 0.92, 0.8);
    // (the bristles: bright tufts over its shoulders)
    const bristles = [];
    for (let i = 0; i < 4; i++) { const b = box(trunk, 0.34 - i * 0.03, 0.26 - Math.abs(i - 1) * 0.04, 0.2, i % 2 ? mane2 : mane, 0, 0.64 - Math.max(0, i - 2) * 0.05, 0.5 - i * 0.22); b.rotation.x = -0.4; bristles.push(b); }
    const head = grp(trunk, 0, -0.06, 0.66);
    ball(head, 0.5, hide, 0, 0, 0, 1.06, 0.92, 0.96);
    box(head, 0.5, 0.36, 0.42, snout, 0, -0.1, 0.42);
    box(head, 0.42, 0.28, 0.06, pink, 0, -0.1, 0.65);
    for (const sx of [-1, 1]) {
      box(head, 0.07, 0.1, 0.03, hoof, sx * 0.1, -0.08, 0.68);
      spike(head, 0.15, 0.8, tusk, sx * 0.4, 0.08, 0.52, 0.8, -sx * 0.75, 5);
      spike(head, 0.17, 0.3, dark, sx * 0.44, 0.34, -0.14, -0.2, -sx * 0.95, 3);
    }
    glare(r3d, head, 0.22, 0.4, 0.21, 0.15);
    const legs = [];
    for (const [x, z] of [[-0.42, 0.34], [0.42, 0.34], [-0.42, -0.6], [0.42, -0.6]]) { const L = grp(body, x, 0.55, z); box(L, 0.28, 0.5, 0.3, dark, 0, -0.25, 0); box(L, 0.31, 0.13, 0.34, hoof, 0, -0.49, 0.02); legs.push(L); }
    const tail = grp(trunk, 0, 0.22, -0.74);
    box(tail, 0.08, 0.08, 0.3, dark, 0, 0.08, -0.08).rotation.x = 0.7; ball(tail, 0.1, mane2, 0, 0.2, -0.22);
    g.userData = { body, trunk, head, legs, tail, bristles };
    return own(g);
  },
  // a huge round belly on two tiny legs: puffed cheeks, a pale tummy, a curl of wind on its crown
  gustbelly(r3d) {
    const g = new THREE.Group(), body = grp(g);
    const skin = mat(r3d, '#5856c4'), skinD = mat(r3d, '#3e3c92'), tum = mat(r3d, '#fbeacb'), cheek = mat(r3d, '#f58fb4'), ink = mat(r3d, INK), curlM = mat(r3d, '#eee6ff', '#a890ff', 0.6);
    const legs = [];
    for (const sx of [-1, 1]) { const L = grp(body, sx * 0.34, 0.3, 0.02); box(L, 0.25, 0.3, 0.27, skinD, 0, -0.12, 0); box(L, 0.31, 0.12, 0.42, ink, 0, -0.24, 0.07); legs.push(L); }
    const puff = grp(body, 0, 1.12, 0);            // the balloon (its middle: it swells, spins and flattens round it)
    ball(puff, 0.85, skin, 0, 0, 0, 1, 0.98, 0.96, 2);
    ball(puff, 0.62, tum, 0, -0.22, 0.36, 1, 1, 0.74, 2);
    box(puff, 0.18, 0.18, 0.2, skinD, 0, -0.28, -0.84);
    const arms = [];
    for (const sx of [-1, 1]) arms.push(ball(puff, 0.18, skinD, sx * 0.86, 0.04, 0.2, 1, 1.25, 1));
    const face = grp(puff, 0, 0.43, 0.58);
    glare(r3d, face, 0.13, 0.04, 0.21, 0.14);
    const cheeks = [-1, 1].map((sx) => ball(face, 0.2, cheek, sx * 0.38, -0.1, 0.0));
    const mouth = box(face, 0.16, 0.14, 0.08, ink, 0, -0.14, 0.19);
    const curl = grp(puff, 0, 0.8, 0);
    box(curl, 0.14, 0.26, 0.14, curlM, 0, 0.1, 0); box(curl, 0.38, 0.14, 0.14, curlM, 0.12, 0.28, 0); box(curl, 0.14, 0.18, 0.14, curlM, 0.26, 0.16, 0);
    g.userData = { body, puff, legs, arms, face, cheeks, mouth, curl };
    return own(g);
  },
  // a ram in a thundercloud of wool: lightning flickers in it, and its spiral horns are gold
  stormram(r3d) {
    const g = new THREE.Group(), body = grp(g);
    const wool = mat(r3d, '#5c6096'), woolD = mat(r3d, '#444878'), faceM = mat(r3d, '#1f1a30'), muzzle = mat(r3d, '#3c3252'), gold = mat(r3d, '#ffd24a', '#b8860b', 0.8), hoof = mat(r3d, '#15101e'), bolt = mat(r3d, '#fffbd0', '#ffe066', 2);
    const legs = [];
    for (const [x, z] of [[-0.3, 0.34], [0.3, 0.34], [-0.3, -0.5], [0.3, -0.5]]) { const L = grp(body, x, 0.6, z); box(L, 0.18, 0.5, 0.18, faceM, 0, -0.26, 0); box(L, 0.21, 0.12, 0.22, hoof, 0, -0.54, 0.01); legs.push(L); }
    const fleece = grp(body, 0, 1.02, -0.12), puffs = [];
    for (const [x, y, z, r, d] of [[0, 0, 0, 0.62, 0], [-0.42, 0.1, -0.26, 0.45, 1], [0.42, 0.1, -0.24, 0.45, 0], [0, 0.4, -0.14, 0.47, 0], [-0.36, 0.02, 0.34, 0.4, 0], [0.36, 0.04, 0.34, 0.4, 1], [0, -0.02, -0.6, 0.45, 1], [0, 0.32, 0.3, 0.37, 0]]) puffs.push(ball(fleece, r, d ? woolD : wool, x, y, z));
    // (lightning caught in the wool)
    const bolts = [];
    for (const [x, y, z, ry] of [[-0.56, 0.3, 0.08, -0.5], [0.58, 0.26, -0.1, 0.5], [0.06, 0.82, 0.05, 0], [-0.24, 0.5, -0.66, 2.6], [0.3, 0.6, -0.5, -2.4]]) {
      const b = grp(fleece, x, y, z); b.rotation.y = ry;
      box(b, 0.1, 0.28, 0.1, bolt, 0.06, 0.11, 0).rotation.z = -0.6; box(b, 0.1, 0.28, 0.1, bolt, -0.04, -0.09, 0).rotation.z = 0.5;
      for (const m of b.children) m.castShadow = false;
      bolts.push(b);
    }
    const head = grp(body, 0, 1.0, 0.56);
    box(head, 0.46, 0.5, 0.5, faceM, 0, 0, 0.1);
    box(head, 0.34, 0.24, 0.26, muzzle, 0, -0.16, 0.4);
    glare(r3d, head, 0.1, 0.36, 0.14, 0.13);
    for (const sx of [-1, 1]) {
      const H = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.12, 6, 14, Math.PI * 1.6), gold);
      H.position.set(sx * 0.4, 0.12, 0.08); H.rotation.y = sx * 0.55; H.scale.x = -sx; H.castShadow = true;
      head.add(H);
    }
    ball(fleece, 0.2, woolD, 0, 0.1, -1.0);
    g.userData = { body, fleece, puffs, bolts, head, legs };
    return own(g);
  },
  // tall and hunched, a heavy underbite — and a tree trunk for a club, leaves and all
  ogre(r3d) {
    const g = new THREE.Group(), body = grp(g);
    const skin = mat(r3d, '#7c68b4'), skinD = mat(r3d, '#574684'), pale = mat(r3d, '#a394d0'), cloth = mat(r3d, '#6a4630'), rope = mat(r3d, '#f0c880'), tusk = mat(r3d, '#fffbe8', '#d8c488', 0.55), hair = mat(r3d, '#2a1c3a'), bark = mat(r3d, '#9a6640'), barkD = mat(r3d, '#6a4428'), cut = mat(r3d, '#f6dca6'), leaf = mat(r3d, '#8ee860', '#3aa82a', 0.6), leafD = mat(r3d, '#58b84c'), stone = mat(r3d, '#8a8290');
    const legs = [];
    for (const sx of [-1, 1]) { const L = grp(body, sx * 0.34, 0.64, 0); box(L, 0.4, 0.62, 0.44, skinD, 0, -0.3, 0); box(L, 0.46, 0.15, 0.6, skinD, 0, -0.56, 0.08); legs.push(L); }
    const torso = grp(body, 0, 0.64, 0);            // it bends at the hips
    box(torso, 1.06, 0.34, 0.76, cloth, 0, 0.1, 0);
    box(torso, 1.1, 0.1, 0.8, rope, 0, 0.28, 0);
    ball(torso, 0.62, pale, 0, 0.62, 0.2, 1.05, 0.9, 0.86);
    box(torso, 1.5, 0.62, 0.84, skin, 0, 1.2, -0.04);
    ball(torso, 0.36, skinD, 0, 1.46, -0.34, 1.6, 0.8, 1);
    const head = grp(torso, 0, 1.6, 0.34);
    box(head, 0.74, 0.54, 0.62, skin, 0, 0.14, 0);
    box(head, 0.88, 0.3, 0.64, pale, 0, -0.2, 0.12);            // the underbite
    box(head, 0.78, 0.15, 0.22, skinD, 0, 0.34, 0.28);
    box(head, 0.2, 0.17, 0.14, pale, 0, 0.08, 0.36);
    for (const sx of [-1, 1]) { box(head, 0.16, 0.36, 0.15, tusk, sx * 0.28, 0.06, 0.4); box(head, 0.12, 0.26, 0.14, skinD, sx * 0.46, 0.2, -0.06).rotation.z = -sx * 0.5; }
    // (a topknot, pinned with a bone)
    box(head, 0.24, 0.26, 0.24, hair, 0, 0.52, -0.08); box(head, 0.5, 0.08, 0.08, tusk, 0, 0.5, -0.08);
    glare(r3d, head, 0.2, 0.33, 0.18, 0.14);
    const arms = [];
    for (const sx of [-1, 1]) { const A = grp(torso, sx * 0.92, 1.36, 0.02); box(A, 0.38, 0.86, 0.42, skin, 0, -0.38, 0); ball(A, 0.3, skinD, 0, -0.9, 0.02); arms.push(A); }
    const club = grp(arms[1], 0, -0.9, 0.06);
    cyl(club, 0.32, 0.17, 2.1, bark, 0, 0, 0.8, 7).rotation.x = Math.PI / 2;
    cyl(club, 0.25, 0.25, 0.05, cut, 0, 0, 1.86, 7).rotation.x = Math.PI / 2;
    box(club, 0.12, 0.12, 0.5, barkD, 0, 0.16, 0.5); box(club, 0.13, 0.46, 0.13, barkD, 0.14, 0.36, 1.34).rotation.z = -0.45;
    ball(club, 0.3, leaf, 0.3, 0.64, 1.36); ball(club, 0.22, leafD, 0.04, 0.68, 1.14); ball(club, 0.2, leaf, 0.36, 0.5, 1.06);
    const rock = ball(arms[0], 0.38, stone, 0, -1.24, 0.05, 1.1, 0.9, 1, 0);
    rock.visible = false;
    g.userData = { body, torso, head, legs, arms, club, rock };
    return own(g);
  },
};

// ------------------------------------------------------------------ what they share
// the marks a brute draws on the ground — where its blow will land — pulsing red until it does.
// It keeps track of its own: a blow that never comes takes its mark away.
const SHAPES = {};
const shape = (k, make) => SHAPES[k] || (SHAPES[k] = make());
const pulse = (q, k) => { q.m.material.opacity = Math.min(1, (q.life - q.t) / 0.12) * (0.22 + (1 - k) * 0.3 + Math.sin(q.t * 26) * 0.07); };
function ground(C, e, geo, x, z, life, { rot = 0, sx = 1, sz = 1, fn = pulse, danger = true } = {}) {
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  m.position.set(x, 0.045, z); m.rotation.y = rot; m.scale.set(sx, 1, sz);
  C.root.add(m);
  const q = { m, t: life, life, fn, line: danger };
  C.fxMeshes.push(q); e.marks.push(q);
  return q;
}
const lane = (C, e, dir, len, w, life) => ground(C, e, shape('lane', () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5)), e.x, e.z, life, { rot: Math.atan2(dir.x, dir.z), sx: w, sz: len });
const fan = (C, e, dir, len, spread, life) => ground(C, e, shape('fan' + spread, () => new THREE.CircleGeometry(1, 24, -Math.PI / 2 - spread / 2, spread).rotateX(-Math.PI / 2)), e.x, e.z, life, { rot: Math.atan2(dir.x, dir.z), sx: len, sz: len });
const spot = (C, e, x, z, r, life) => { ground(C, e, C.geo.disc, x, z, life, { sx: r, sz: r }); ground(C, e, C.geo.ring, x, z, life, { sx: r, sz: r, fn: (q) => { q.m.material.opacity = 0.75 + Math.sin(q.t * 26) * 0.2; } }); };
function unmark(e) { for (const q of e.marks) q.t = Math.min(q.t, 0); e.marks.length = 0; }
const inFan = (p, x, z, dir, len, spread) => { const px = p.pos.x - x, pz = p.pos.z - z, d = Math.hypot(px, pz); return d < len && (d < 0.05 || (px * dir.x + pz * dir.z) / d > Math.cos(spread / 2)); };
const inLane = (p, x, z, dir, len, half) => { const px = p.pos.x - x, pz = p.pos.z - z, along = px * dir.x + pz * dir.z; return along > -0.2 && along < len && Math.abs(px * dir.z - pz * dir.x) < half; };

// hurt whoever passes the test (knocked away from the brute, or the way `dir` says); returns
// how many really took it — a hero who rolled through it didn’t
function strike(C, e, test, dmg, { knock = 3, launch = 0, elem = null, dir = null } = {}) {
  let n = 0;
  for (const p of C.alivePlayers()) {
    if (!test(p)) continue;
    const f = p.fighter, was = f.hp + (f.shield || 0);
    const r = C.hurtPlayer(p, dmg, { dir: dir ? dir(p) : norm(p.pos.x - e.x, p.pos.z - e.z), knock, src: e, elem });
    if (r === 'parry' || !(f.hp + (f.shield || 0) < was)) continue;
    if (launch && !f.down) p.actor.jumpV = Math.max(p.actor.jumpV, launch);
    n++;
  }
  return n;
}

// a brute turns slowly, and only steps the way it faces
function turnTo(e, x, z, max) {
  const cur = Math.atan2(e.face.x, e.face.z);
  let d = Math.atan2(x, z) - cur; d = Math.atan2(Math.sin(d), Math.cos(d));
  const a = cur + Math.max(-max, Math.min(max, d));
  e.face = { x: Math.sin(a), z: Math.cos(a) };
  return Math.abs(d);
}
function lumber(e, C, tgt, sp, dt, stop, turn = 3.4) {
  const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, d = Math.hypot(dx, dz) || 1;
  const off = turnTo(e, dx / d, dz / d, turn * dt);
  e.walking = d > stop && off < 1.2;
  if (e.walking) C.moveEnemy(e, e.face.x * sp * dt, e.face.z * sp * dt, true);
  return d;
}

function arm(e) { e.state = 'chase'; e.timer = rand(0.9, 1.5); e.marks = []; e.poise = 0; e.soft = 1; e.rings = []; }
function calm(e, wait) { unmark(e); e.state = 'chase'; e.timer = wait; e.soft = 1; }
// helpless for a while: stars over its head, and every blow counts half as much again
function daze(C, e, secs, { text = null, state = 'dazed' } = {}) {
  unmark(e);
  e.state = state; e.helpless = true; e.dazed = e.dazeLen = secs; e.stagger = Math.max(e.stagger || 0, secs);
  e.poise = 0; e.soft = 1;
  C.vfx.star(e.x, e.y + e.def.h + 0.3, e.z, { size: 1.7, kind: 'rays', color: '#ffe066', life: 0.4, spin: 3 });
  audio.sfx('boing', { volume: 0.5, pitch: -5 });
  if (text) C.popText(e.x, e.y + e.def.h + 1.2, e.z, text, '#f4eaff');
}
// every frame it thinks: the reel meter drains, a daze ends, and an attack cut short (it was
// stunned, frozen, or lost sight of everyone) is dropped — its mark with it. True: helpless
function tick(e, dt, C) {
  if (!e.woke) { e.woke = true; e.nameT = 4; e.poiseLock = 2; }      // (it gets to show its trick first)
  const gap = e.idle > 0.25; e.idle = 0;
  if (e.poiseLock > 0) e.poiseLock -= dt;
  if (e.poiseT > 0) e.poiseT -= dt; else if (e.poise > 0) e.poise = Math.max(0, e.poise - e.maxHp * POISE * 0.3 * dt);
  if (e.helpless) {
    if (e.dazed > 0) return true;
    e.helpless = false; e.poiseLock = 2.2; e.shakeT = 0.5;
    calm(e, rand(0.7, 1.1));
    if (e.brain.rouse) e.brain.rouse(e, C);
  } else if (gap && e.state !== 'chase') calm(e, 0.5);
  return false;
}
// …and every frame it is drawn: the daze runs out
function settle(e, dt) {
  if (e.dazed > 0) e.dazed -= dt;
  if (e.nameT > 0) e.nameT -= dt;
  if (e.shakeT > 0) e.shakeT -= dt;
  e.idle = (e.idle || 0) + dt;
}
// every blow shows: a squash, a lean away from it, a wobble that dies down
function react(e, B, dt) {
  const k = e.hitK = Math.max(0, (e.hitK || 0) - dt * 3.4);
  if (!k) return;
  const d = e.hitDir || { x: 0, z: 1 };
  B.scale.x *= 1 + k * 0.14; B.scale.y *= 1 - k * 0.17; B.scale.z *= 1 + k * 0.14;
  B.rotation.x += (d.x * e.face.x + d.z * e.face.z) * k * 0.16;
  B.rotation.z += -(d.x * e.face.z - d.z * e.face.x) * k * 0.16 + Math.sin(e.t * 36) * k * 0.09;
}

// ---- what combat.js asks of a brute
export const bruteMul = (e) => (e.dazed > 0 ? 1.5 : 1);
// a blow has landed: it doesn’t budge, but it thumps, flashes, wobbles — and the meter fills
export function bruteHit(C, e, dmg, { heavy = false, dir = null } = {}) {
  e.hitK = Math.max(e.hitK || 0, heavy ? 1 : 0.62); e.hitDir = dir;
  e.flash = heavy ? 0.16 : 0.11;
  audio.sfx('hit', { volume: heavy ? 0.5 : 0.34, pitch: -6 });
  if (heavy) audio.sfx('stomp', { volume: 0.35, pitch: 5 });
  C.world.fx.emit('dust', e.x + rand(-0.4, 0.4), 0.05, e.z + rand(-0.3, 0.3), heavy ? 4 : 2);
  if (e.dazed > 0) C.vfx.sparks(e.x, e.y + e.def.h * 0.7, e.z, { n: heavy ? 10 : 5, color: '#ffe066', speed: 4.5, up: 3 });
  if (e.hp <= 0 || e.helpless || e.poiseLock > 0 || e.state === 'sleep') return;
  e.poise += dmg * (heavy ? 1.5 : 1) * (e.soft || 1); e.poiseT = 1.4;
  if (e.poise < e.maxHp * POISE * (e.tough || 1)) return;
  e.tough = Math.min(1.6, (e.tough || 1) * 1.2);
  C.popText(e.x, e.y + e.def.h + 0.9, e.z, t('Staggered!'), '#ffe066', true);
  if (e.brain.reel) e.brain.reel(e, C); else daze(C, e, 1.7);
}
// beaten: it topples over on its side, thuds, then goes up in stardust
export function bruteFall(C, e) {
  const k = 1 - Math.max(0, e.fading) / FALL;
  // (the last blow’s flash goes out: it falls in its own colours)
  if (!e.fallSide) { e.fallSide = Math.random() < 0.5 ? 1 : -1; e.setFlash(0); }
  const side = e.fallSide;
  if (k < 0.34) { e.obj.rotation.z = side * 1.45 * (k / 0.34) ** 2; return; }
  if (!e.thud) {
    e.thud = true;
    C.shakeAt(e, 0.32); audio.sfx('thud', { volume: 0.55 });
    C.world.fx.emit('dust', e.x, 0.1, e.z, 14);
    C.vfx.shockwave(e.x, e.z, { r: e.r * 2.6, color: '#c8bca8', life: 0.4, wall: 0.4 });
  }
  e.obj.rotation.z = side * (1.45 - Math.sin(Math.min(1, (k - 0.34) / 0.16) * Math.PI) * 0.1);
  if (k < 0.72) return;
  if (!e.burst) {
    e.burst = true;
    C.vfx.pop(e.x, 0.5, e.z, { size: 2 });
    C.vfx.star(e.x, 0.7, e.z, { size: 2.4, kind: 'rays', color: '#fff3a6', life: 0.4, spin: 2 });
    audio.sfx('poof', { volume: 0.7, pitch: -5 });
    for (let i = 0; i < 8; i++) C.drop('dust', e.x, e.z);
  }
  e.obj.scale.setScalar(Math.max(0.01, 1 - (k - 0.72) / 0.28));
}
export const BRUTE_FALL = FALL;
// the reel meter under a brute’s health, its name when it wakes — and, helpless, the stars
// turning over its head
export function drawBruteMarks(ctx, C, v) {
  const P = C.party;
  for (const e of C.enemies) {
    if (!e.alive || !e.def.brute || e.state === 'sleep') continue;
    const u = P.toUi(v, e.x, e.y + e.def.h + 0.25, e.z), w = 30, x0 = Math.round(u.x - w / 2), y0 = Math.round(u.y) + 4;
    const k = e.dazed > 0 ? e.dazed / (e.dazeLen || 1) : (e.poise || 0) / (e.maxHp * POISE * (e.tough || 1));
    ctx.fillStyle = '#241a2e'; ctx.fillRect(x0 - 1, y0 - 1, w + 2, 3);
    ctx.fillStyle = '#4a3a5a'; ctx.fillRect(x0, y0, w, 1);
    ctx.fillStyle = e.dazed > 0 && Math.floor(P.t * 8) % 2 ? '#fff7e6' : '#ffd66b'; ctx.fillRect(x0, y0, Math.round(w * Math.max(0, Math.min(1, k))), 1);
    if (e.nameT > 0 && !(e.dazed > 0)) { ctx.globalAlpha = Math.min(1, e.nameT); drawText(ctx, t(e.def.name), u.x, y0 - 16, { color: '#f4eaff', align: 'center', outline: '#241a2e' }); ctx.globalAlpha = 1; }
    if (!(e.dazed > 0 || e.stun > 0.3)) continue;
    const s = e.starY ? P.toUi(v, e.x, e.y + e.starY, e.z) : u;
    for (let i = 0; i < 3; i++) {
      const a = P.t * 5.5 + i * 2.094;
      drawText(ctx, '★', Math.round(s.x + Math.cos(a) * 14), Math.round(s.y - 12 + Math.sin(a) * 4), { color: i ? '#ffe066' : '#fff7e6', align: 'center', outline: '#241a2e' });
    }
  }
}
function onDeath(e, C) {
  unmark(e);
  for (const R of e.rings) R.q.t = 0;
  e.rings = [];
  C.hitstop = Math.max(C.hitstop, 0.1);
  C.shakeAt(e, 0.45);
  audio.sfx('slam', { volume: 0.6, pitch: -4 });
}

// ---- the Storm Ram’s rings, racing out along the ground: whoever they pass, and who hasn’t hopped
function ring(C, e, max, dmg) {
  const R = { x: e.x, z: e.z, r: e.r, max, v: 7, dmg, hit: new Set() };
  const m = new THREE.Mesh(shape('band', () => new THREE.RingGeometry(0.93, 1.07, 48).rotateX(-Math.PI / 2)), new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
  m.position.set(R.x, 0.06, R.z); m.scale.setScalar(R.r);
  // (a white-hot line down its middle: it reads on sand and on grass alike)
  const hot = new THREE.Mesh(C.geo.ring, new THREE.MeshBasicMaterial({ color: 0xfffbd0, transparent: true, opacity: 0.95, depthWrite: false }));
  hot.position.y = 0.005; hot.scale.setScalar(1.03);
  m.add(hot);
  C.root.add(m);
  const life = (max - R.r) / R.v;
  R.q = { m, t: life, life, fn: (q, k) => { m.scale.setScalar(Math.max(0.1, R.r)); m.material.opacity = R.done ? 0 : 0.3 + Math.min(0.5, k * 2.5); hot.material.opacity = R.done ? 0 : Math.min(0.95, 0.2 + k * 3); } };
  C.fxMeshes.push(R.q);
  e.rings.push(R);
}
function tickRings(C, e, dt) {
  if (!e.rings.length) return;
  for (const R of e.rings) {
    R.r += R.v * dt;
    for (let i = 0; i < 3; i++) { const a = rand(0, Math.PI * 2); C.vfx.bit('ember', R.x + Math.cos(a) * R.r, 0.1, R.z + Math.sin(a) * R.r, { vy: rand(1.5, 3.5), g: 9, life: 0.3, size: 0.07, color: i ? '#ffe066' : '#ffffff' }); }
    for (const p of C.alivePlayers()) {
      if (R.hit.has(p) || Math.abs(Math.hypot(p.pos.x - R.x, p.pos.z - R.z) - R.r) > 0.4) continue;
      R.hit.add(p);
      if (p.actor.jumpY > 0.2) { C.popText(p.pos.x, 2.3, p.pos.z, t('Hop!'), '#ffe066'); continue; }
      C.hurtPlayer(p, R.dmg, { dir: norm(p.pos.x - R.x, p.pos.z - R.z), knock: 2, src: e, elem: 'shock' });
    }
    if (R.r >= R.max) { R.done = true; R.q.t = Math.min(R.q.t, 0); }
  }
  e.rings = e.rings.filter((R) => !R.done);
}

// ---- the Ogre’s boulders: once thrown, they land — a circle says where
function boulder(C, e, at, r, dmg, delay) {
  for (const [geo, fn] of [[C.geo.disc, pulse], [C.geo.ring, (q) => { q.m.material.opacity = 0.75 + Math.sin(q.t * 26) * 0.2; }]]) {
    const w = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0, depthWrite: false }));
    w.position.set(at.x, 0.045, at.z); w.scale.setScalar(r);
    C.root.add(w);
    C.fxMeshes.push({ m: w, t: delay, life: delay, fn, line: true });
  }
  const m = C.shotMesh('rock'), from = { x: e.x - e.face.z * 0.8, y: 3.1, z: e.z + e.face.x * 0.8 };
  m.scale.multiplyScalar(1.35);
  C.root.add(m);
  C.fxMeshes.push({ m, t: delay, life: delay, fn: (q, k) => { const a = 1 - k; m.position.set(from.x + (at.x - from.x) * a, from.y * (1 - a) + 0.3 + Math.sin(a * Math.PI) * 3.4, from.z + (at.z - from.z) * a); m.rotation.x += 0.2; m.rotation.z += 0.13; } });
  C.vfx.later(delay, () => {
    strike(C, e, (p) => Math.hypot(p.pos.x - at.x, p.pos.z - at.z) < r + 0.2, dmg, { knock: 3.5, launch: 3.5, dir: (p) => norm(p.pos.x - at.x, p.pos.z - at.z) });
    C.vfx.shockwave(at.x, at.z, { r: r * 1.15, color: '#d8ccb8', life: 0.4, wall: 0.7 });
    C.vfx.debris(at.x, at.z, { n: 12, r: r * 0.5, color: '#8a8290', up: 5.5, size: 0.16 });
    C.vfx.smoke(at.x, 0.15, at.z, { n: 3, size: 0.2, color: '#c8bca8', spread: r * 0.4, rise: 0.5, life: 0.6 });
    C.shakeAt(e, 0.25);
    audio.sfx('slam', { volume: 0.5, pitch: 3 });
  });
}

// ------------------------------------------------------------------ brains
export const BRUTE_BRAINS = {
  boar: {
    init(e) { arm(e); e.swiped = true; },        // (it opens with a charge: the tusks are for whoever stays under its snout after)
    think(e, dt, tgt, C) {
      if (tick(e, dt, C)) return;
      const dmg = e.def.dmg * (e.dmgMul || 1), a = e.aim;
      if (e.state === 'chase') {
        const d = lumber(e, C, tgt, speedOf(e, C), dt, 1.5);
        if (e.timer > 0) return;
        if (d < 2.4 && !e.swiped) {
          e.swiped = true; e.state = 'swipe'; e.timer = 0.75; e.aim = e.face = to(e, tgt);
          fan(C, e, e.aim, 2.7, 2.1, 0.75);
          C.sfx('growl', e);
        } else if (d < 12) {
          e.swiped = false; e.state = 'paw'; e.timer = 0.95; e.aim = e.face = to(e, tgt); e.len = Math.max(5, Math.min(10, d + 3.5));
          lane(C, e, e.aim, e.len, 2.1, 0.95);
          C.sfx('growl', e);
        }
      } else if (e.state === 'swipe') {
        if (e.timer > 0) return;
        strike(C, e, (p) => inFan(p, e.x, e.z, a, 2.9, 2.1), dmg * 0.8, { knock: 5 });
        C.vfx.slash(e.x + a.x * 0.5, 0.6, e.z + a.z * 0.5, Math.atan2(a.x, a.z), { r: 2.3, arc: 2.1, color: '#fff6dc', life: 0.22 });
        C.sfx('whoosh', e);
        e.state = 'swung'; e.timer = 0.6;
      } else if (e.state === 'swung') {
        if (e.timer <= 0) { e.state = 'chase'; e.timer = rand(0.5, 0.9); }
      } else if (e.state === 'paw') {
        // (it kicks the dirt up behind it, and snorts)
        if (Math.random() < dt * 16) C.world.fx.emit('dust', e.x - a.x * 0.9 + rand(-0.3, 0.3), 0.05, e.z - a.z * 0.9 + rand(-0.3, 0.3), 2);
        if (Math.random() < dt * 5) C.vfx.smoke(e.x + a.x * 1.3, 0.75, e.z + a.z * 1.3, { n: 1, size: 0.14, color: '#f4eaff', life: 0.45, rise: 0.5, spread: 0.1 });
        if (e.timer <= 0) { e.state = 'charge'; e.left = e.len; e.rammed = false; e.hit = new Set(); C.sfx('charge', e); }
      } else if (e.state === 'charge') {
        const step = Math.min(e.left, 11.5 * dt), moved = C.moveEnemy(e, a.x * step, a.z * step);
        e.left -= step;
        for (const p of C.alivePlayers()) {
          if (e.hit.has(p) || Math.hypot(p.pos.x - e.x, p.pos.z - e.z) > e.r + 0.3) continue;
          e.hit.add(p);
          // (tossed off the lane, to the side they stood on)
          const side = (p.pos.x - e.x) * a.z - (p.pos.z - e.z) * a.x >= 0 ? 1 : -1;
          if (strike(C, e, (q) => q === p, dmg, { knock: 4.2, launch: 4.5, dir: () => norm(a.x * 0.5 + a.z * side, a.z * 0.5 - a.x * side) })) e.rammed = true;
        }
        if (Math.random() < dt * 34) C.world.fx.emit('dust', e.x - a.x * 0.7, 0.05, e.z - a.z * 0.7, 2);
        if (!moved) {
          // straight into something solid
          C.shakeAt(e, 0.4); C.sfx('bonk', e); audio.sfx('thud', { volume: 0.5 });
          C.vfx.debris(e.x + a.x * 0.9, e.z + a.z * 0.9, { n: 10, r: 0.4, up: 5 });
          C.vfx.star(e.x + a.x * 0.9, 0.9, e.z + a.z * 0.9, { size: 1.6, color: '#ffffff', life: 0.18 });
          e.knock = { vx: -a.x * 3.5, vz: -a.z * 3.5, t: 0.16 };
          daze(C, e, 3.2, { text: t('BONK!') });
        } else if (e.left <= 0.01) { e.state = 'skid'; e.timer = 0.5; }
      } else if (e.state === 'skid') {
        const k = Math.max(0, e.timer / 0.5);
        C.moveEnemy(e, a.x * 6 * k * dt, a.z * 6 * k * dt);
        if (Math.random() < dt * 40 * k) C.world.fx.emit('dust', e.x + a.x * 0.6, 0.05, e.z + a.z * 0.6, 2);
        if (e.timer > 0) return;
        // nobody in its way: it has run itself out of breath
        if (e.rammed) { e.state = 'chase'; e.timer = rand(1.4, 2); } else daze(C, e, 2.8, { text: t('Huff… puff…') });
      }
    },
    onDeath,
    pose(e, dt) {
      const u = e.obj.userData, s = e.state, B = u.body, H = u.head;
      settle(e, dt);
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      const walk = s === 'chase' && e.walking ? e.t * 9 : 0, run = s === 'charge' ? e.t * 30 : 0, dazed = e.dazed > 0;
      let lean = 0, low = 0, back = 0, hx = 0, hy = 0, hz = 0, long = 1;
      if (s === 'sleep') { low = 0.3; hx = 0.4; }
      else if (dazed) { lean = -0.24; low = 0.1; hx = 0.3; hz = Math.sin(e.t * 5) * 0.4; }
      else if (s === 'paw') { back = -0.2 * ease(Math.min(1, (0.95 - e.timer) / 0.3)); hx = 0.5; lean = 0.08; }
      else if (s === 'charge') { hx = 0.3; lean = 0.13; long = 1.1; }
      else if (s === 'skid') { lean = -0.22; hx = -0.15; }
      else if (s === 'swipe') { hy = -1.0 * ease(Math.min(1, (0.75 - e.timer) / 0.4)); hx = 0.25; }
      else if (s === 'swung') { hy = 1.0 * Math.max(0, (e.timer - 0.3) / 0.3); hx = 0.1; }
      if (e.shakeT > 0) hy += Math.sin(e.t * 30) * 0.4;
      B.position.set(0, (walk ? Math.abs(Math.sin(walk)) * 0.04 : 0) + (run ? Math.abs(Math.sin(run)) * 0.09 : 0) - low + (s === 'sleep' ? Math.sin(e.t * 1.6) * 0.02 : 0), back);
      B.rotation.set(lean, 0, 0); B.scale.set(1, 1, long);
      H.rotation.set(hx, hy, hz);
      u.legs.forEach((L, i) => {
        const front = i < 2, odd = i % 2 ? Math.PI : 0;
        L.rotation.x = s === 'sleep' ? (front ? -1.35 : 1.35) : dazed ? (front ? -0.6 : 1.1) : walk ? Math.sin(walk + odd + (front ? 0 : Math.PI)) * 0.5
          : run ? Math.sin(run + (front ? 0 : 2.2)) * 0.9 : s === 'paw' && i === 1 ? -0.5 + Math.sin(e.t * 24) * 0.6 : s === 'skid' ? (front ? -0.8 : -0.3) : 0;
      });
      const up = s === 'paw' || s === 'charge' ? 1.35 + Math.sin(e.t * 40) * 0.08 : dazed || s === 'sleep' ? 0.7 : 1;
      for (const b of u.bristles) b.scale.y = up;
      u.tail.rotation.x = s === 'charge' ? -0.9 : Math.sin(e.t * 7) * 0.3;
      e.starY = dazed ? 1.75 : 0;
      react(e, B, dt);
    },
  },

  gustbelly: {
    init(e) { arm(e); e.puff = 0; },
    think(e, dt, tgt, C) {
      if (tick(e, dt, C)) return;
      const dmg = e.def.dmg * (e.dmgMul || 1), a = e.aim;
      if (e.state === 'chase') {
        const d = lumber(e, C, tgt, speedOf(e, C), dt, 3);
        if (e.timer > 0) return;
        if (d < 7 && (e.blew ? Math.random() < 0.65 : d < 2.3 && Math.random() < 0.4)) this.crouch(e, C, tgt, d);
        else if (d < 8) {
          // a deep breath: everyone in front of it is drawn in
          e.blew = true; e.state = 'inhale'; e.timer = 1.7; e.soft = 2; e.aim = e.face = to(e, tgt);
          fan(C, e, e.aim, 7, 1.1, 2.05);
          audio.sfx('gust', { volume: 0.45, pitch: 7 });
        }
      } else if (e.state === 'inhale') {
        for (const p of C.alivePlayers()) {
          if (!inFan(p, e.x, e.z, a, 7, 1.1)) continue;
          const dx = e.x - p.pos.x, dz = e.z - p.pos.z, d = Math.hypot(dx, dz);
          if (d > e.r + 1) C.world.overCol.move(p.actor.pos, (dx / d) * 2.3 * dt, (dz / d) * 2.3 * dt, p.actor.radius);
        }
        if (Math.random() < dt * 34) {
          const g = Math.atan2(a.z, a.x) + rand(-0.5, 0.5), d = rand(2.5, 7), life = rand(0.3, 0.5);
          C.vfx.bit('puff', e.x + Math.cos(g) * d, rand(0.4, 1.6), e.z + Math.sin(g) * d, { vx: -Math.cos(g) * (d - 1) / life, vz: -Math.sin(g) * (d - 1) / life, vy: 0, g: 0, drag: 0, life, size: 0.15, s1: 0.05, color: '#ffffff', spin: 0 });
        }
        if (e.timer <= 0) { e.state = 'blow'; e.timer = 0.8; e.soft = 1; e.hit = new Set(); audio.sfx('gust', { volume: 0.9 }); C.shakeAt(e, 0.18); }
      } else if (e.state === 'blow') {
        // the gale: little harm, but it carries you off
        if (e.timer > 0.4) for (const p of C.alivePlayers()) {
          if (e.hit.has(p) || !inFan(p, e.x, e.z, a, 7.3, 1.1)) continue;
          e.hit.add(p);
          if (C.hurtPlayer(p, dmg * 0.35, { dir: a, knock: 0, src: e }) === 'parry' || p.fighter.down) continue;
          p.fighter.knock = { vx: a.x * 15, vz: a.z * 15, t: 0.42 };
          p.actor.jumpV = Math.max(p.actor.jumpV, 5);
          C.party.buzz(p, 60);
        }
        if (e.timer > 0.25) for (let i = 0; i < 4; i++) {
          const g = Math.atan2(a.z, a.x) + rand(-0.5, 0.5), sp = rand(11, 17);
          C.vfx.bit('puff', e.x + Math.cos(g) * 1.1, rand(0.3, 1.7), e.z + Math.sin(g) * 1.1, { vx: Math.cos(g) * sp, vz: Math.sin(g) * sp, vy: 0, g: 0, drag: 0.5, life: rand(0.3, 0.5), size: 0.24, s1: 0.08, color: i ? '#ffffff' : '#d6c8ff', spin: 0 });
        }
        if (e.timer <= 0) { e.state = 'winded'; e.timer = 1.5; }
      } else if (e.state === 'winded') {
        if (e.timer <= 0) { e.state = 'chase'; e.timer = rand(0.8, 1.4); }
      } else if (e.state === 'crouch') {
        if (e.timer > 0) return;
        const air = 2 * 8.6 / 22;
        e.state = 'hop'; e.timer = 1.3; e.vy = 8.6; e.y = 0.02; e.up = false; e.hop = { x: (e.spot.x - e.x) / air, z: (e.spot.z - e.z) / air };
        audio.sfx('boing', { volume: 0.6 });
      } else if (e.state === 'hop') {
        C.moveEnemy(e, e.hop.x * dt, e.hop.z * dt, false, true);
        if (e.y > 0.1 && e.timer > 0) e.up = true;
        else if (e.up || e.timer <= 0) {
          strike(C, e, (p) => Math.hypot(p.pos.x - e.x, p.pos.z - e.z) < 2.4, dmg, { knock: 4.5, launch: 5 });
          C.vfx.shockwave(e.x, e.z, { r: 2.5, color: '#fbeacb', life: 0.4, wall: 0.7 });
          C.vfx.debris(e.x, e.z, { n: 12, r: 1.2, up: 5 });
          C.shakeAt(e, 0.38); C.sfx('slam', e);
          unmark(e);
          e.state = 'flop'; e.timer = 0.9;
        }
      } else if (e.state === 'flop') {
        if (e.timer <= 0) { e.state = 'chase'; e.timer = rand(1, 1.6); }
      } else if (e.state === 'whizz') {
        // popped: it whizzes off backwards, this way and that, and lands flat
        const k = Math.max(0, e.timer / 0.8), w = Math.sin(e.t * 22) * 5 * k, v = 2 + 8 * k;
        C.moveEnemy(e, (-a.x * v - a.z * w) * dt, (-a.z * v + a.x * w) * dt);
        e.y = Math.abs(Math.sin(e.t * 15)) * 0.5 * k; e.vy = 0;
        if (Math.random() < dt * 40) C.vfx.smoke(e.x + a.x * 0.8, 0.9 + e.y, e.z + a.z * 0.8, { n: 1, size: 0.2, color: '#eef4ff', life: 0.5, rise: 0.3, spread: 0.2 });
        if (e.timer <= 0) { e.y = 0; C.world.fx.emit('dust', e.x, 0.1, e.z, 10); audio.sfx('poof', { volume: 0.6, pitch: -7 }); daze(C, e, 3.4, { state: 'flat' }); }
      }
    },
    // a hop: a circle where its belly will land
    crouch(e, C, tgt, d) {
      const k = Math.min(1, 4.5 / (d || 1));
      let x = e.x + (tgt.pos.x - e.x) * k, z = e.z + (tgt.pos.z - e.z) * k;
      if (C.world.overCol.blocked(x, z, 0.45) || C.world.tileAt(x, z) === TT.WATER) { x = e.x; z = e.z; }
      e.blew = false; e.state = 'crouch'; e.timer = 0.8; e.spot = { x, z };
      if (d > 0.3) e.face = to(e, tgt);
      spot(C, e, x, z, 2.2, 0.8 + 2 * 8.6 / 22);
      C.sfx('growl', e);
    },
    // enough blows while it breathes in, and it pops
    reel(e, C) {
      if (e.state !== 'inhale') { daze(C, e, 1.7); return; }
      unmark(e);
      e.state = 'whizz'; e.timer = 0.8; e.soft = 1; e.poiseLock = 1;
      C.popText(e.x, e.y + e.def.h + 0.9, e.z, t('Pfffrrrt!'), '#f4eaff', true);
      audio.sfx('steam', { volume: 0.9, pitch: 4 }); audio.sfx('whoosh', { volume: 0.6, pitch: 9 });
      C.vfx.star(e.x, 1.2, e.z, { size: 2, kind: 'rays', color: '#ffffff', life: 0.3 });
    },
    onDeath,
    pose(e, dt) {
      const u = e.obj.userData, s = e.state, B = u.body, Pf = u.puff;
      settle(e, dt);
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      const want = s === 'inhale' ? 1 - Math.max(0, e.timer) / 1.7 : s === 'blow' ? -0.35 : s === 'winded' ? -0.25 : s === 'whizz' ? -0.6 : 0;
      e.puff += (want - e.puff) * Math.min(1, dt * (s === 'inhale' ? 30 : 9));
      const walk = s === 'chase' && e.walking ? e.t * 8 : 0, k = 1 + e.puff * 0.34, flat = s === 'flat';
      let sx = k, sy = k, py = 0, tilt = 0, roll = 0;
      if (s === 'sleep') { sx = 1.08; sy = 0.86 + Math.sin(e.t * 1.6) * 0.04; }
      else if (flat) { sx = 1.3; sy = 0.3 + Math.sin(e.t * 9) * 0.02; }
      else if (s === 'whizz') { roll = e.t * 26; }
      else if (s === 'crouch') { const c = ease(Math.min(1, (0.8 - e.timer) / 0.5)); sx = 1 + c * 0.16; sy = 1 - c * 0.24; }
      else if (s === 'hop') { sx = 0.93; sy = 1.1; tilt = 0.25; }
      else if (s === 'flop') { const c = Math.max(0, (e.timer - 0.45) / 0.45); sx = 1 + c * 0.32; sy = 1 - c * 0.42; }
      else if (s === 'winded') { sy *= 1 + Math.sin(e.t * 13) * 0.04; tilt = 0.22; }
      else if (s === 'dazed') { roll = Math.sin(e.t * 4) * 0.16; tilt = 0.12; }
      else if (s === 'blow') tilt = 0.2;
      else if (s === 'inhale') tilt = -0.14 * e.puff;
      if (walk) { py = Math.abs(Math.sin(walk)) * 0.07; roll = Math.sin(walk) * 0.07; }
      B.position.set(0, py, 0); B.rotation.set(0, 0, 0); B.scale.set(1, 1, 1);
      Pf.scale.set(sx, sy, sx); Pf.rotation.set(tilt, 0, roll); Pf.position.y = (flat ? 0.02 : 0.28) + 0.84 * sy;
      u.legs.forEach((L, i) => { L.rotation.x = walk ? Math.sin(walk + i * Math.PI) * 0.7 : s === 'hop' ? 0.7 : 0; L.rotation.z = flat ? (i ? -1.3 : 1.3) : 0; L.visible = s !== 'whizz'; });
      const ch = s === 'blow' ? 1.7 : s === 'inhale' ? 0.75 : s === 'crouch' ? 1.3 : 1;
      for (const c of u.cheeks) c.scale.setScalar(ch + (s === 'blow' ? Math.sin(e.t * 50) * 0.1 : 0));
      const open = s === 'inhale' ? 2.6 : s === 'blow' ? 1.8 : s === 'winded' || flat ? 1.5 + Math.sin(e.t * 13) * 0.3 : 1;
      u.mouth.scale.set(open, open, 1);
      u.curl.rotation.y += dt * (s === 'inhale' ? 22 : s === 'blow' ? -30 : 2);
      u.arms.forEach((A, i) => { A.position.y = 0.04 + (s === 'inhale' || s === 'crouch' ? 0.2 : s === 'chase' ? Math.sin(e.t * 8 + i * Math.PI) * 0.05 : 0); });
      e.starY = flat ? 1.1 : 0;
      react(e, B, dt);
    },
  },

  stormram: {
    init(e) { arm(e); e.n = 0; e.pale = 0; for (const m of e.obj.userData.puffs) m.userData.dark = m.material.color.clone(); },
    think(e, dt, tgt, C) {
      if (tick(e, dt, C)) return;
      const dmg = e.def.dmg * (e.dmgMul || 1), a = e.aim;
      if (e.state === 'chase') {
        const d = lumber(e, C, tgt, speedOf(e, C), dt, 2.2);
        if (e.timer > 0) return;
        const ahead = ((tgt.pos.x - e.x) * e.face.x + (tgt.pos.z - e.z) * e.face.z) / (d || 1);
        if (d < 2.6 && ahead > 0.7 && !e.butted) {
          e.butted = true; e.state = 'butt'; e.timer = 0.7; e.aim = e.face = to(e, tgt);
          lane(C, e, e.aim, 3, 1.5, 0.7);
          C.sfx('growl', e);
        } else if (d < 7.5) { e.n = 0; this.rear(e, C); C.sfx('growl', e); }
      } else if (e.state === 'rear') {
        if (Math.random() < dt * 30) { const g = rand(0, Math.PI * 2); C.vfx.bit('ember', e.x + Math.cos(g) * 1.6, rand(0.3, 1.8), e.z + Math.sin(g) * 1.6, { vx: -Math.cos(g) * 5, vz: -Math.sin(g) * 5, vy: 0, g: 0, drag: 0, life: 0.25, size: 0.07, color: '#ffe066' }); }
        if (e.timer > 0) return;
        // down come the hooves: a ring of sparks races out
        ring(C, e, REACH[e.n], dmg * 0.6);
        e.n++; e.state = 'down'; e.timer = 0.5;
        C.vfx.shockwave(e.x, e.z, { r: 1.7, color: '#ffe066', life: 0.3, wall: 0.6 });
        C.vfx.debris(e.x + e.face.x * 0.6, e.z + e.face.z * 0.6, { n: 6, r: 0.4 });
        C.shakeAt(e, 0.3); C.sfx('stomp', e); audio.sfx('zap', { volume: 0.5, pitch: -5 });
      } else if (e.state === 'down') {
        if (e.timer > 0) return;
        if (e.n < 3) this.rear(e, C);
        else { e.butted = false; daze(C, e, 2.6, { text: t('Pant… pant…') }); }
      } else if (e.state === 'butt') {
        if (e.timer <= 0) { e.state = 'lunge'; e.timer = 0.2; e.hitOnce.clear(); C.sfx('charge', e); }
      } else if (e.state === 'lunge') {
        C.moveEnemy(e, a.x * 9 * dt, a.z * 9 * dt);
        C.enemyTouch(e, dmg, 5.5, 0.7, 1.0);
        if (e.timer <= 0) { e.state = 'butted'; e.timer = 0.6; }
      } else if (e.state === 'butted') {
        if (e.timer <= 0) { e.state = 'chase'; e.timer = rand(0.6, 1); }
      }
    },
    // it rears: a ring closes in on its hooves, another shows how far the sparks will run
    rear(e, C) {
      e.state = 'rear'; e.timer = 0.8;
      ground(C, e, C.geo.ring, e.x, e.z, 0.8, { sx: REACH[e.n], sz: REACH[e.n], danger: false, fn: (q) => { q.m.material.opacity = 0.45 + Math.sin(q.t * 26) * 0.15; } });
      ground(C, e, C.geo.ring, e.x, e.z, 0.8, { danger: false, fn: (q, k) => { q.m.scale.setScalar(e.r + 0.2 + k * 2); q.m.material.opacity = 0.9 - k * 0.5; } });
    },
    // its wool crackles back to life
    rouse(e, C) {
      e.n = 0;
      if (e.pale < 0.5) return;
      C.vfx.sparks(e.x, 1.3, e.z, { n: 14, color: '#ffe066', speed: 4, up: 3 });
      audio.sfx('zap', { volume: 0.5 });
    },
    onDeath,
    pose(e, dt) {
      const u = e.obj.userData, s = e.state, B = u.body, H = u.head, C = e.combat;
      settle(e, dt); tickRings(C, e, dt);
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      const walk = s === 'chase' && e.walking ? e.t * 9 : 0, spent = s === 'dazed' && e.n >= 3;
      let lean = 0, up = 0, back = 0, hx = 0, sq = 0;
      if (s === 'sleep') { up = -0.34; hx = 0.5; }
      else if (s === 'rear') { const k = ease(Math.min(1, (0.8 - e.timer) / 0.45)); lean = -0.6 * k; up = 0.28 * k; hx = -0.2 * k; }
      else if (s === 'down') { sq = Math.max(0, (e.timer - 0.25) / 0.25); lean = 0.12 * sq; }
      else if (e.dazed > 0) { hx = 0.55; up = -0.06 + Math.sin(e.t * 14) * 0.02; lean = 0.08; }
      else if (s === 'butt') { const k = ease(Math.min(1, (0.7 - e.timer) / 0.4)); hx = 0.7 * k; back = -0.22 * k; lean = 0.1 * k; }
      else if (s === 'lunge' || s === 'butted') { hx = 0.5; back = s === 'lunge' ? 0.2 : 0; }
      if (e.shakeT > 0) lean += Math.sin(e.t * 30) * 0.05;
      B.position.set(0, (walk ? Math.abs(Math.sin(walk)) * 0.05 : 0) + up + (s === 'sleep' ? Math.sin(e.t * 1.6) * 0.02 : 0), back);
      B.rotation.set(lean, 0, 0); B.scale.set(1 + sq * 0.14, 1 - sq * 0.18, 1 + sq * 0.14);
      H.rotation.set(hx, e.dazed > 0 ? Math.sin(e.t * 3) * 0.15 : 0, 0);
      u.legs.forEach((L, i) => {
        const front = i < 2, odd = i % 2 ? Math.PI : 0;
        L.rotation.x = s === 'sleep' ? (front ? -1.4 : 1.4) : walk ? Math.sin(walk + odd + (front ? 0 : Math.PI)) * 0.5 : s === 'rear' && front ? -1.0 + Math.sin(e.t * 20 + odd) * 0.35 : s === 'rear' ? 0.5 : s === 'lunge' ? (front ? -0.7 : 0.7) : 0;
      });
      // its wool: dark and crackling — or pale and still, once the three stomps have spent it
      e.pale += ((spent ? 1 : 0) - e.pale) * Math.min(1, dt * 6);
      for (const m of u.puffs) m.material.color.copy(m.userData.dark).lerp(PALE, e.pale * 0.85);
      const breath = e.dazed > 0 ? 1 + Math.sin(e.t * 14) * 0.05 : 1, fl = 1 - e.pale * 0.12;
      u.fleece.scale.set(fl, fl * breath, fl);
      u.bolts.forEach((b, i) => { b.visible = e.alive && e.pale < 0.3 && s !== 'sleep' && (s === 'rear' || Math.sin(e.t * (19 + i * 7) + i * 2) > 0.2); b.scale.setScalar(s === 'rear' ? 1.5 : 1); });
      e.starY = 0;
      react(e, B, dt);
    },
  },

  ogre: {
    init: arm,
    think(e, dt, tgt, C) {
      if (tick(e, dt, C)) return;
      const dmg = e.def.dmg * (e.dmgMul || 1), a = e.aim;
      if (e.state === 'chase') {
        const d = lumber(e, C, tgt, speedOf(e, C), dt, 2.4, 2.8);
        if (e.timer > 0) return;
        if (d < 3.8) {
          // the tree trunk goes up…
          e.state = 'lift'; e.timer = 0.95; e.aim = e.face = to(e, tgt);
          lane(C, e, e.aim, 4.5, 1.7, 0.95);
          C.sfx('growl', e);
        } else if (d < 13) { e.state = 'heave'; e.timer = 0.6; }
      } else if (e.state === 'heave') {
        turnTo(e, tgt.pos.x - e.x, tgt.pos.z - e.z, 4 * dt);
        if (e.timer > 0) return;
        // two boulders: one for each of the two nearest heroes (where they are heading) — or, for a
        // hero alone, a second one beside
        const near = C.alivePlayers().filter((p) => !p.indoors && Math.hypot(p.pos.x - e.x, p.pos.z - e.z) < 15).sort((p, q) => Math.hypot(p.pos.x - e.x, p.pos.z - e.z) - Math.hypot(q.pos.x - e.x, q.pos.z - e.z));
        for (let i = 0; i < 2; i++) {
          const p = near[i] || near[0] || tgt, lead = near[i] ? 0.6 : 0, off = near[i] ? 0 : 2.4;
          const g = rand(0, Math.PI * 2);
          boulder(C, e, { x: p.pos.x + (p.vel ? p.vel.x : 0) * lead + Math.cos(g) * off, z: p.pos.z + (p.vel ? p.vel.z : 0) * lead + Math.sin(g) * off }, 1.5, dmg * 0.8, 1.15 + i * 0.3);
        }
        C.sfx('whoosh', e);
        e.state = 'thrown'; e.timer = 0.6;
      } else if (e.state === 'thrown') {
        if (e.timer <= 0) { e.state = 'chase'; e.timer = rand(2, 3); }
      } else if (e.state === 'lift') {
        if (e.timer > 0) return;
        // …and comes down: step aside, and it sticks in the ground
        const n = strike(C, e, (p) => inLane(p, e.x, e.z, a, 4.6, 0.95), dmg * 1.25, { knock: 5, launch: 4.5 });
        for (const d of [1.5, 2.5, 3.5, 4.3]) C.vfx.later(d * 0.035, () => { const x = e.x + a.x * d, z = e.z + a.z * d; C.vfx.shockwave(x, z, { r: 1, color: '#d8ccb8', life: 0.35, wall: 0.6 }); C.vfx.debris(x, z, { n: 5, r: 0.4, up: 5.5 }); });
        C.shakeAt(e, 0.45); C.sfx('slam', e); audio.sfx('thud', { volume: 0.5 });
        unmark(e);
        if (n) { e.state = 'slammed'; e.timer = 1; } else daze(C, e, 2.6, { state: 'stuck', text: t('Hnnngh!') });
      } else if (e.state === 'slammed') {
        if (e.timer <= 0) { e.state = 'chase'; e.timer = rand(0.8, 1.3); }
      }
    },
    onDeath,
    pose(e, dt) {
      const u = e.obj.userData, s = e.state, B = u.body, T = u.torso;
      settle(e, dt);
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      const walk = s === 'chase' && e.walking ? e.t * 5.5 : 0, sw = Math.sin(walk);
      let bend = 0.12, sway = sw * 0.07, aL = sw * 0.35, aR = -0.2 - sw * 0.15, club = 0.55, by = Math.abs(sw) * 0.05, bz = 0, hx = 0, legs = null;
      if (s === 'sleep') { bend = 0.55; hx = 0.4; by = -0.32; aL = -0.3; aR = -0.5; club = 1.25; legs = -1.45; }
      else if (s === 'heave') { const k = ease(Math.min(1, (0.6 - e.timer) / 0.4)); aL = -2.9 * k; bend = 0.12 - 0.22 * k; }
      else if (s === 'thrown') { const k = Math.max(0, e.timer / 0.6); aL = -1.0 * k; bend = 0.3 * k + 0.12; }
      else if (s === 'lift') { const k = ease(Math.min(1, (0.95 - e.timer) / 0.55)); aR = -0.2 - 3.1 * k; aL = -2.9 * k; bend = 0.12 - 0.34 * k; by = 0.06 * k; club = 0.55 - 0.1 * k; }
      else if (s === 'slammed' || s === 'stuck') {
        // (the club is planted: it tugs, and tugs)
        const tug = Math.max(0, Math.sin(e.t * 11)) * (s === 'stuck' ? 1 : 0.5);
        bend = 0.48 - tug * 0.16; aR = -0.9 + tug * 0.14; aL = -1.15 + tug * 0.14; club = 1.12; bz = -tug * 0.05;
      } else if (e.dazed > 0) { bend = 0.25 + Math.cos(e.t * 4) * 0.1; sway = Math.sin(e.t * 4) * 0.2; aL = 0.1; aR = -0.1; hx = 0.3; }
      if (e.shakeT > 0) sway += Math.sin(e.t * 30) * 0.05;
      B.position.set(0, by, bz); B.rotation.set(0, 0, 0); B.scale.set(1, 1, 1);
      T.rotation.set(bend, 0, sway);
      u.head.rotation.set(hx, e.dazed > 0 && s !== 'stuck' ? Math.sin(e.t * 3) * 0.3 : 0, 0);
      u.arms[0].rotation.x = aL; u.arms[1].rotation.x = aR; u.club.rotation.x = club;
      u.rock.visible = s === 'heave';
      u.legs.forEach((L, i) => { L.rotation.x = legs !== null ? legs : walk ? Math.sin(walk + i * Math.PI) * 0.55 : 0; });
      e.starY = s === 'stuck' ? 2.55 : 0;
      react(e, B, dt);
    },
  },
};
const PALE = new THREE.Color('#d2d2e2');
