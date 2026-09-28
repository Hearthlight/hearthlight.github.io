// Rideable animals, built from boxes like the valley's critters but big
// enough to carry a hero: stag, boar, giant hen, turtle, bear and big frog.
// Each model has a saddle (in its rider's colour once tamed) and a little
// animation rig: legs that trot or gallop, a bobbing head, flapping wings,
// paddling flippers, frog legs that kick out mid-leap.

import { THREE, toon } from '../render/r3d.js';
import { buildDino, animDino, DINO_RIG } from './dinos3d.js';

// base looks (wild ones vary a little)
const LOOKS = {
  stag: [{ fur: '#a8744a', dark: '#6b4a34', light: '#f1e2c8', antler: '#e9dcc8' }, { fur: '#8f5f3a', dark: '#5a3b28', light: '#e8d4b4', antler: '#f2e8d8' }],
  boar: [{ fur: '#6b4a3a', dark: '#3e2a24', light: '#8a6a58', snout: '#e8a0a0' }, { fur: '#5a4a44', dark: '#2e2624', light: '#7a6a62', snout: '#d89898' }],
  hen: [{ body: '#fbf6ec', wing: '#e8dcc8', comb: '#e04848', beak: '#f2b63d', leg: '#f2b63d' }, { body: '#d9a060', wing: '#b87a40', comb: '#e04848', beak: '#f2b63d', leg: '#f2b63d' }, { body: '#8a5a3a', wing: '#6a4028', comb: '#e04848', beak: '#f2c85a', leg: '#e8b040' }],
  turtle: [{ shell: '#4f8a4a', shellD: '#3a6a38', skin: '#9ab86a', belly: '#e8dca0' }, { shell: '#3f7a7a', shellD: '#2c5a5c', skin: '#8ac0a0', belly: '#e8e0b0' }],
  bear: [{ fur: '#7a5238', dark: '#4e3424', light: '#a8805c', nose: '#2a2433' }, { fur: '#f2f0ea', dark: '#c8c4bc', light: '#ffffff', nose: '#3a3440' }],
  frog: [{ skin: '#5aa84a', dark: '#3a7a34', belly: '#e8e08a', eye: '#f4f0d8' }, { skin: '#3a9a8a', dark: '#28706a', belly: '#d8e8a0', eye: '#f4f0d8' }],
};

// how high a rider sits, and how the model moves
export const RIG = {
  stag: { saddle: 1.02, trot: 9, amp: 0.55, radius: 0.46 },
  boar: { saddle: 0.8, trot: 12, amp: 0.6, radius: 0.44 },
  hen: { saddle: 1.02, trot: 11, amp: 0.7, radius: 0.42 },
  turtle: { saddle: 0.66, trot: 5, amp: 0.5, radius: 0.46 },
  bear: { saddle: 1.08, trot: 7, amp: 0.45, radius: 0.5 },
  frog: { saddle: 0.72, trot: 6, amp: 0.4, radius: 0.44 },
};

export const MOUNT_SCALE = 1.12;
// (Dino Isle's mounts are dinosaurs: dinos3d.js builds & poses them)
Object.assign(RIG, DINO_RIG);

export function buildMount(r3d, kind, { variant = 0, saddle = null, scale = MOUNT_SCALE, wild = false } = {}) {
  if (DINO_RIG[kind]) { const d = buildDino(r3d, kind, { variant, saddle: wild ? null : saddle, scale: scale * (DINO_RIG[kind].scale || 1) }); if (wild && d.saddle) d.saddle.visible = false; return d; }
  const looks = LOOKS[kind] || LOOKS.stag;
  const L = looks[variant % looks.length];
  const root = new THREE.Group();
  const rig = { kind, root, legs: [], wings: [], flip: [], body: null, head: null, neck: null, tail: null, saddle: null, t: Math.random() * 10 };
  const mat = (c) => toon(r3d, { color: c, key: 'mount' + c });
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const box = (parent, w, h, d, c, x, y, z) => {
    const m = new THREE.Mesh(geo, mat(c));
    m.scale.set(w, h, d); m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  };
  const group = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const body = group(root, 0, 0, 0);
  rig.body = body;
  // four legs hanging from hips (pivot at the top), each a list of boxes
  const leg = (x, y, z, len, w, c, hoof) => {
    const g = group(body, x, y, z);
    box(g, w, len, w, c, 0, -len / 2, 0);
    if (hoof) box(g, w + 0.02, 0.07, w + 0.03, hoof, 0, -len + 0.03, 0.01);
    rig.legs.push(g);
    return g;
  };
  const saddleCol = saddle || '#b84a3a';
  const addSaddle = (x, y, z, w, d) => {
    const s = group(body, x, y, z);
    box(s, w, 0.07, d, saddleCol, 0, 0, 0);
    box(s, w * 0.6, 0.09, d * 0.75, '#6b4330', 0, 0.07, 0);
    box(s, 0.08, 0.14, d * 0.7, '#6b4330', -w * 0.28, 0.13, 0);
    box(s, w + 0.02, 0.05, 0.05, '#f4c542', 0, -0.03, d / 2);
    box(s, w + 0.02, 0.05, 0.05, '#f4c542', 0, -0.03, -d / 2);
    rig.saddle = s;
    s.userData.pad = s.children[0];
  };

  if (kind === 'stag') {
    box(body, 1.05, 0.44, 0.42, L.fur, 0, 0.82, 0);
    box(body, 0.36, 0.26, 0.36, L.light, 0.38, 0.74, 0);
    box(body, 0.1, 0.16, 0.16, L.light, -0.54, 0.9, 0);
    for (const [x, z] of [[0.38, 0.14], [0.38, -0.14], [-0.38, 0.14], [-0.38, -0.14]]) leg(x, 0.66, z, 0.62, 0.1, L.dark, '#3b2a22');
    const neck = group(body, 0.44, 0.96, 0); rig.neck = neck;
    box(neck, 0.18, 0.46, 0.18, L.fur, 0.06, 0.2, 0);
    const head = group(neck, 0.12, 0.46, 0); rig.head = head;
    box(head, 0.34, 0.2, 0.2, L.fur, 0.1, 0, 0);
    box(head, 0.12, 0.1, 0.14, L.light, 0.28, -0.04, 0);
    box(head, 0.05, 0.05, 0.05, '#2a2433', 0.36, 0.0, 0);
    for (const z of [-0.09, 0.09]) { box(head, 0.04, 0.05, 0.05, '#2a2433', 0.16, 0.05, z * 1.1); box(head, 0.06, 0.13, 0.05, L.fur, -0.02, 0.13, z * 1.5); }
    for (const z of [-0.08, 0.08]) {
      box(head, 0.05, 0.34, 0.05, L.antler, -0.02, 0.28, z);
      box(head, 0.16, 0.05, 0.05, L.antler, 0.04, 0.34, z * 1.7);
      box(head, 0.05, 0.14, 0.05, L.antler, 0.1, 0.42, z * 2.2);
      box(head, 0.05, 0.12, 0.05, L.antler, -0.06, 0.48, z * 1.3);
    }
    addSaddle(-0.04, 1.05, 0, 0.42, 0.46);
  } else if (kind === 'boar') {
    box(body, 0.9, 0.46, 0.5, L.fur, -0.02, 0.56, 0);
    box(body, 0.7, 0.12, 0.2, L.dark, -0.04, 0.83, 0);                       // bristly ridge
    box(body, 0.3, 0.4, 0.46, L.light, 0.32, 0.54, 0);
    for (const [x, z] of [[0.3, 0.16], [0.3, -0.16], [-0.3, 0.16], [-0.3, -0.16]]) leg(x, 0.36, z, 0.34, 0.13, L.dark, '#2a2224');
    const head = group(body, 0.5, 0.5, 0); rig.head = head;
    box(head, 0.3, 0.32, 0.38, L.fur, 0.06, 0, 0);
    box(head, 0.12, 0.16, 0.2, L.snout, 0.25, -0.05, 0);
    box(head, 0.03, 0.04, 0.04, '#6a3a3a', 0.31, -0.03, 0.05); box(head, 0.03, 0.04, 0.04, '#6a3a3a', 0.31, -0.03, -0.05);
    for (const z of [-0.12, 0.12]) {
      box(head, 0.05, 0.12, 0.05, '#fbf6ec', 0.24, 0.06, z);                 // tusks
      box(head, 0.05, 0.05, 0.05, '#2a2433', 0.14, 0.08, z * 1.3);
      box(head, 0.1, 0.12, 0.06, L.dark, -0.02, 0.2, z * 1.1);
    }
    const tail = group(body, -0.48, 0.66, 0); rig.tail = tail;
    box(tail, 0.05, 0.16, 0.05, L.dark, -0.02, -0.06, 0);
    addSaddle(-0.06, 0.8, 0, 0.4, 0.5);
  } else if (kind === 'hen') {
    box(body, 0.74, 0.6, 0.6, L.body, 0, 0.76, 0);
    box(body, 0.54, 0.2, 0.5, L.body, -0.06, 1.1, 0);
    const tail = group(body, -0.38, 0.96, 0); rig.tail = tail;
    box(tail, 0.2, 0.42, 0.34, L.body, -0.08, 0.14, 0);
    box(tail, 0.12, 0.3, 0.24, L.wing, -0.18, 0.28, 0);
    for (const s of [-1, 1]) {
      const w = group(body, 0, 0.9, 0.31 * s);
      box(w, 0.5, 0.34, 0.08, L.wing, -0.04, -0.06, 0.02 * s);
      rig.wings.push(w);
    }
    for (const z of [0.13, -0.13]) leg(0.02, 0.46, z, 0.44, 0.07, L.leg, L.leg);
    const neck = group(body, 0.3, 1.08, 0); rig.neck = neck;
    box(neck, 0.26, 0.34, 0.3, L.body, 0.02, 0.14, 0);
    const head = group(neck, 0.06, 0.34, 0); rig.head = head;
    box(head, 0.28, 0.26, 0.28, L.body, 0.02, 0.04, 0);
    box(head, 0.14, 0.08, 0.1, L.beak, 0.2, 0.02, 0);
    box(head, 0.08, 0.12, 0.06, L.comb, 0.14, -0.1, 0);
    box(head, 0.18, 0.12, 0.06, L.comb, 0.0, 0.22, 0);
    box(head, 0.08, 0.08, 0.06, L.comb, 0.1, 0.24, 0);
    for (const z of [-0.14, 0.14]) box(head, 0.05, 0.05, 0.03, '#2a2433', 0.1, 0.08, z);
    addSaddle(-0.06, 1.22, 0, 0.36, 0.44);
  } else if (kind === 'turtle') {
    box(body, 0.96, 0.2, 0.82, L.belly, 0, 0.26, 0);
    box(body, 0.92, 0.22, 0.8, L.shell, 0, 0.42, 0);
    box(body, 0.74, 0.14, 0.64, L.shell, 0, 0.58, 0);
    for (const [x, z] of [[0.2, 0.2], [-0.2, 0.2], [0.2, -0.2], [-0.2, -0.2], [0, 0]]) box(body, 0.2, 0.03, 0.2, L.shellD, x, 0.66, z);
    for (const [x, z] of [[0.36, 0.36], [0.36, -0.36], [-0.36, 0.36], [-0.36, -0.36]]) {
      const f = group(body, x, 0.28, z);
      box(f, 0.28, 0.08, 0.16, L.skin, x > 0 ? 0.08 : -0.06, -0.02, z > 0 ? 0.06 : -0.06);
      rig.flip.push(f);
    }
    const head = group(body, 0.5, 0.36, 0); rig.head = head;
    box(head, 0.28, 0.22, 0.24, L.skin, 0.1, 0.02, 0);
    for (const z of [-0.08, 0.08]) box(head, 0.04, 0.05, 0.05, '#2a2433', 0.2, 0.08, z);
    box(head, 0.08, 0.03, 0.14, '#6a8a4a', 0.22, -0.04, 0);
    const tail = group(body, -0.5, 0.3, 0); rig.tail = tail;
    box(tail, 0.14, 0.06, 0.08, L.skin, -0.04, 0, 0);
    addSaddle(-0.02, 0.68, 0, 0.4, 0.46);
  } else if (kind === 'bear') {
    box(body, 1.0, 0.6, 0.62, L.fur, -0.02, 0.8, 0);
    box(body, 0.4, 0.5, 0.58, L.fur, 0.36, 0.86, 0);                          // shoulders
    box(body, 0.2, 0.2, 0.2, L.fur, -0.54, 0.86, 0);
    for (const [x, z] of [[0.34, 0.2], [0.34, -0.2], [-0.34, 0.2], [-0.34, -0.2]]) leg(x, 0.56, z, 0.5, 0.2, L.dark, L.dark);
    const head = group(body, 0.58, 0.96, 0); rig.head = head;
    box(head, 0.36, 0.34, 0.4, L.fur, 0.06, 0, 0);
    box(head, 0.16, 0.14, 0.2, L.light, 0.26, -0.06, 0);
    box(head, 0.06, 0.06, 0.08, L.nose, 0.34, -0.02, 0);
    for (const z of [-0.12, 0.12]) { box(head, 0.05, 0.05, 0.05, '#2a2433', 0.2, 0.08, z); box(head, 0.12, 0.12, 0.08, L.fur, -0.02, 0.2, z * 1.3); box(head, 0.06, 0.06, 0.04, L.light, 0.0, 0.2, z * 1.3); }
    addSaddle(-0.1, 1.12, 0, 0.46, 0.56);
  } else if (kind === 'frog') {
    box(body, 0.78, 0.36, 0.7, L.skin, 0, 0.4, 0);
    box(body, 0.62, 0.14, 0.6, L.belly, 0.06, 0.24, 0);
    for (const [x, z] of [[-0.1, 0.26], [0.12, -0.2], [-0.2, -0.1]]) box(body, 0.14, 0.03, 0.14, L.dark, x, 0.59, z);
    const head = group(body, 0.38, 0.5, 0); rig.head = head;
    box(head, 0.3, 0.26, 0.62, L.skin, 0.06, 0, 0);
    box(head, 0.03, 0.03, 0.46, '#2a3a28', 0.22, -0.06, 0);
    for (const z of [-0.2, 0.2]) {
      box(head, 0.18, 0.18, 0.18, L.eye, 0.02, 0.18, z);
      box(head, 0.06, 0.1, 0.1, '#1a1a22', 0.1, 0.19, z);
    }
    // back legs (folded, they kick out in a leap) & front legs
    for (const z of [-0.36, 0.36]) {
      const g = group(body, -0.26, 0.34, z);
      box(g, 0.44, 0.2, 0.18, L.skin, -0.04, -0.1, 0);
      box(g, 0.26, 0.06, 0.24, L.dark, 0.08, -0.2, 0.04 * Math.sign(z));
      rig.flip.push(g);
    }
    for (const z of [-0.26, 0.26]) leg(0.26, 0.3, z, 0.26, 0.09, L.skin, L.dark);
    addSaddle(-0.06, 0.6, 0, 0.38, 0.44);
  }
  root.scale.setScalar(scale);
  root.userData.rig = rig;
  if (wild && rig.saddle) rig.saddle.visible = false;      // wild ones have no saddle yet
  return rig;
}

// Pose a mount: speed (tiles/s) sets the gait; air = off the ground; act = a
// flourish (0..1) for attacks & abilities; swim = in the water
export function animMount(rig, dt, { speed = 0, air = false, act = 0, swim = false, graze = false } = {}) {
  if (rig.dino) { animDino(rig, dt, { speed, air, act, swim, graze }); return; }
  const R = RIG[rig.kind];
  const run = Math.min(1.4, speed / 3.2);
  rig.t += dt * (0.5 + run) * (R.trot / 6);
  const s = Math.sin(rig.t * 6), c = Math.cos(rig.t * 6);
  const k = run > 0.05 ? 1 : 0;
  rig.legs.forEach((g, i) => { g.rotation.z = k * (i % 2 === (i < 2 ? 0 : 1) ? s : -s) * R.amp * Math.min(1, run + 0.3) * (air ? 0.3 : 1); });
  rig.body.position.y = k ? Math.abs(s) * 0.06 * run : Math.sin(rig.t * 1.4) * 0.01;
  rig.body.rotation.z = k ? c * 0.04 * run : 0;
  if (rig.head) rig.head.rotation.z = graze && !k ? -0.55 + Math.sin(rig.t * 2) * 0.08 : k ? s * 0.06 : Math.sin(rig.t * 0.9) * 0.05;
  if (rig.neck) rig.neck.rotation.z = graze && !k ? -0.6 : act ? -0.3 * act : 0;
  if (rig.tail) rig.tail.rotation.x = Math.sin(rig.t * 5) * 0.3;
  if (rig.kind === 'hen') for (const [i, w] of rig.wings.entries()) w.rotation.x = (i ? -1 : 1) * (air ? 0.4 + Math.sin(rig.t * 22) * 0.6 : act * 0.8 + Math.sin(rig.t * 3) * 0.03);
  if (rig.kind === 'turtle') { for (const [i, f] of rig.flip.entries()) f.rotation.y = Math.sin(rig.t * (swim ? 9 : 6) + i * 1.6) * (swim || k ? 0.5 : 0.05); rig.body.position.y = swim ? -0.18 + Math.sin(rig.t * 2) * 0.03 : rig.body.position.y; }
  // everyone else paddles under the surface, head up, a little bob
  else if (swim) {
    const p = Math.sin(rig.t * 9);
    rig.legs.forEach((g, i) => { g.rotation.z = (i % 2 ? p : -p) * 0.7; });
    rig.body.position.y = Math.sin(rig.t * 2.2) * 0.025;
    rig.body.rotation.z = -0.08;
    if (rig.head) rig.head.rotation.z = 0.12;
  }
  if (rig.kind === 'frog') for (const f of rig.flip) { f.rotation.z = air ? 0.9 : 0; f.position.x = air ? -0.4 : -0.26; }
  if (act && rig.kind === 'bear' && rig.head) rig.head.rotation.z = -0.2 * act;
}

// the saddle takes its rider's colour
export function paintSaddle(r3d, rig, color) {
  if (!rig.saddle) return;
  rig.saddle.visible = true;
  rig.saddle.userData.pad.material = toon(r3d, { color, key: 'mount' + color });
}
