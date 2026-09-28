// Dinosaurs (Adventure v5), built like the other creatures — rounded bodies,
// boxy heads and legs — with a rig to animate: hips & knees, chains of neck
// and tail segments, a jaw, a frill, wings. Every model faces +x (like the
// mounts); gloomy ones turn purple with glowing eyes.
//   brachio  the long-neck: a gentle giant you can walk under
//   trike    triceratops: frill, three horns, a beak
//   raptor   quick & feathered, a sickle claw   compy  a tiny cousin
//   dilo     dilophosaurus: twin crests and a frill it flares
//   ptera    pteranodon: a crest, a long beak, big leathery wings
//   ankylo   armoured all over, a club on its tail
//   stego    plates down its back, spikes on its tail
//   rex      the Tyrant King: a huge head full of teeth, tiny arms

import { THREE, toon } from '../render/r3d.js';

const GLOOM = new THREE.Color('#5a3a78');
const _c = new THREE.Color();
const shade = (hex, gloom, k = 0.55) => (gloom ? '#' + _c.set(hex).lerp(GLOOM, k).getHexString() : hex);

// palettes (a couple of looks each)
const LOOKS = {
  brachio: [{ body: '#6f9a8a', belly: '#bcd6b4', back: '#557a6c', spot: '#4a6a5e' }, { body: '#8a9a6a', belly: '#d8dcb0', back: '#6a7a52', spot: '#5a6a44' }],
  trike: [{ body: '#c8844a', belly: '#ecc896', back: '#a86a3a', frill: '#f0d8a8', frill2: '#a0503a', horn: '#f4ecd8', beak: '#4a3a30' }, { body: '#8a9a5a', belly: '#d8d8a0', back: '#6a7a44', frill: '#f0c85a', frill2: '#c8583a', horn: '#f4ecd8', beak: '#3a3a30' }],
  raptor: [{ body: '#c8a060', belly: '#f0dcb0', back: '#8a5a3a', crest: '#d8584a', claw: '#3a2a2a' }, { body: '#8aa0b8', belly: '#dce4ec', back: '#5a6a80', crest: '#f2b63d', claw: '#2a2a3a' }],
  compy: [{ body: '#9ac84a', belly: '#e0f0b0', back: '#5a8a3a', crest: '#f2b63d', claw: '#2a3a2a' }],
  dilo: [{ body: '#6aa84a', belly: '#dcecb0', back: '#4a7a3a', crest: '#e8c84a', frill: '#e8583a', frill2: '#f2c14e', claw: '#2a3a2a' }],
  ptera: [{ body: '#b8805a', belly: '#f0d8b8', wing: '#e8a070', wing2: '#c8784a', crest: '#e0583a', beak: '#e8c878' }],
  ankylo: [{ body: '#8a8a5a', belly: '#c8c498', armor: '#6a5a3a', spike: '#ece0c4' }],
  stego: [{ body: '#5a9a7a', belly: '#c8e0c0', back: '#467a60', plate: '#e0843a', plate2: '#f2b63d', spike: '#f0e6cc' }],
  rex: [{ body: '#6a8a4a', belly: '#e8e2b4', back: '#4e6a36', stripe: '#2e4024', teeth: '#fff6e0', claw: '#2a2a22', spike: '#3a3226', mouth: '#9a3a4a' }],
};

// (green and purple wash out to grey: the gloomy Tyrant King gets colours of his own)
const GLOOM_LOOKS = {
  rex: { body: '#5c3f80', belly: '#a88cc8', back: '#44305e', stripe: '#2a1a40', teeth: '#fff6e0', claw: '#1e1428', spike: '#1e1428', mouth: '#c83a5a' },
};

// how each walks: steps per cycle, leg swing, body bob, a reference speed
const GAIT = {
  brachio: { trot: 0.55, amp: 0.26, bob: 0.05, ref: 1.6, biped: false },
  trike: { trot: 1.0, amp: 0.42, bob: 0.05, ref: 3.2, biped: false },
  raptor: { trot: 1.5, amp: 0.7, bob: 0.07, ref: 4.5, biped: true },
  compy: { trot: 2.4, amp: 0.8, bob: 0.05, ref: 4.5, biped: true },
  dilo: { trot: 1.2, amp: 0.6, bob: 0.06, ref: 3.5, biped: true },
  ptera: { trot: 1.4, amp: 0.4, bob: 0.03, ref: 3, biped: true },
  ankylo: { trot: 0.9, amp: 0.38, bob: 0.03, ref: 2.4, biped: false },
  stego: { trot: 0.8, amp: 0.34, bob: 0.04, ref: 2.4, biped: false },
  rex: { trot: 0.8, amp: 0.5, bob: 0.1, ref: 3.2, biped: true },
};

// how high a rider sits on the tameable ones (mounts.js reads it)
export const DINO_RIG = {
  trike: { saddle: 1.52, trot: 7, amp: 0.42, radius: 0.55 },
  raptor: { saddle: 1.42, trot: 12, amp: 0.7, radius: 0.42, scale: 1.15 },
};

export function buildDino(r3d, kind, { variant = 0, gloom = false, scale = 1, saddle = null, baby = false } = {}) {
  const looks = LOOKS[kind] || LOOKS.raptor;
  const L0 = looks[variant % looks.length], L = {};
  for (const [k, v] of Object.entries(L0)) L[k] = shade(v, gloom && k !== 'horn' && k !== 'spike' && k !== 'teeth' && k !== 'claw');
  if (gloom && GLOOM_LOOKS[kind]) Object.assign(L, GLOOM_LOOKS[kind]);
  const root = new THREE.Group();
  const rig = { kind, root, dino: true, legs: [], neck: [], tail: [], wings: [], body: null, head: null, jaw: null, frill: null, arms: [], saddle: null, t: Math.random() * 10, baseY: 0, gloom, eyes: [] };
  const mats = {};
  const mat = (c, e = null, ei = 1) => { const k = c + '|' + e; return mats[k] || (mats[k] = e ? toon(r3d, { color: c, emissive: e, emissiveIntensity: ei, key: 'dino' + k }) : toon(r3d, { color: c, key: 'dino' + c })); };
  const geoBox = new THREE.BoxGeometry(1, 1, 1), geoBall = new THREE.IcosahedronGeometry(1, 1), geoCone = new THREE.ConeGeometry(1, 1, 5);
  const put = (parent, geo, c, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, typeof c === 'string' ? mat(c) : c);
    m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz); m.castShadow = true; m.receiveShadow = true;
    parent.add(m); return m;
  };
  const box = (p, w, h, d, c, x, y, z, rx, ry, rz) => put(p, geoBox, c, x, y, z, w, h, d, rx, ry, rz);
  const ball = (p, rx, ry, rz, c, x, y, z) => put(p, geoBall, c, x, y, z, rx, ry, rz);
  const cone = (p, r, h, c, x, y, z, rx = 0, ry = 0, rz = 0) => put(p, geoCone, c, x, y, z, r, h, r, rx, ry, rz);
  const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
  // eyes: a white eye & a dark pupil — or, in the gloom, a glowing yellow one
  const eye = (p, x, y, z, s) => {
    for (const sz of [-1, 1]) {
      const e = box(p, s * 0.6, s, s * 0.5, gloom ? mat('#fff3a0', '#ffe066', 1.2) : '#fdf8ee', x, y, z * sz);
      box(p, s * 0.35, s * 0.6, s * 0.3, '#241a2e', x + s * 0.18, y - s * 0.1, z * sz + sz * s * 0.12);
      rig.eyes.push(e);
    }
  };
  // a chain of segments from `parent`: each a group nested in the last, pointing along `dir` (radians, in the x-y plane)
  const chain = (parent, x, y, n, len, ang, bend, make) => {
    let g = grp(parent, x, y, 0), out = [];
    g.rotation.z = ang;
    for (let i = 0; i < n; i++) {
      make(g, i, len);
      out.push(g);
      const nx = grp(g, len, 0, 0);
      nx.rotation.z = bend;
      g = nx;
    }
    out.tip = g;
    return out;
  };
  // a leg hanging from a hip: thigh, knee, shin, foot
  const leg = (x, y, z, up, low, w, c1, c2, foot, phase, opts = {}) => {
    const hip = grp(body, x, y, z);
    box(hip, w, up, w, c1, opts.fwd || 0, -up / 2, 0);
    const knee = grp(hip, (opts.fwd || 0) * 2, -up, 0);
    box(knee, w * 0.8, low, w * 0.8, c2, opts.back || 0, -low / 2, 0);
    box(knee, w * (opts.footL || 1.3), w * 0.35, w * 1.1, foot, (opts.back || 0) * 2 + w * 0.25, -low + w * 0.12, 0);
    if (opts.claw) cone(knee, w * 0.18, w * 0.5, opts.claw, (opts.back || 0) * 2 + w * 0.7, -low + w * 0.1, 0, 0, 0, -Math.PI / 2);
    rig.legs.push({ hip, knee, phase });
    return hip;
  };
  const body = grp(root);
  rig.body = body;
  const saddleCol = saddle || '#b84a3a';
  const addSaddle = (x, y, w, d) => {
    const s = grp(body, x, y, 0);
    box(s, w, 0.07, d, saddleCol, 0, 0, 0);
    box(s, w * 0.6, 0.09, d * 0.75, '#6b4330', 0, 0.07, 0);
    box(s, 0.08, 0.14, d * 0.7, '#6b4330', -w * 0.28, 0.13, 0);
    box(s, w + 0.02, 0.05, 0.05, '#f4c542', 0, -0.03, d / 2);
    box(s, w + 0.02, 0.05, 0.05, '#f4c542', 0, -0.03, -d / 2);
    s.userData.pad = s.children[0];
    rig.saddle = s;
  };

  if (kind === 'brachio') {
    // a gentle giant: long front legs, the neck rising high, a long tail
    ball(body, 1.7, 1.05, 1.0, L.body, 0, 2.35, 0);
    ball(body, 1.4, 0.7, 0.85, L.belly, 0.05, 2.0, 0);
    for (const [x, z, s] of [[-0.5, 0.35, 0.3], [0.3, -0.4, 0.26], [0.9, 0.25, 0.22], [-1.0, -0.2, 0.24]]) ball(body, s, s * 0.4, s, L.spot, x, 3.3, z);
    for (const [x, z, ph] of [[1.0, 0.55, 0], [1.0, -0.55, Math.PI], [-1.05, 0.55, Math.PI], [-1.05, -0.55, 0]]) leg(x, x > 0 ? 2.25 : 2.15, z, x > 0 ? 1.1 : 0.95, x > 0 ? 1.15 : 1.0, 0.44, L.body, L.body, L.back, ph);
    rig.neck = chain(body, 1.35, 2.9, 7, 0.52, 1.05, 0.06, (g, i, len) => { box(g, len + 0.12, 0.56 - i * 0.04, 0.5 - i * 0.03, L.body, len / 2, 0, 0); box(g, len * 0.8, 0.12, 0.3 - i * 0.02, L.belly, len / 2, -0.26 + i * 0.02, 0); });
    const head = grp(rig.neck.tip, 0.1, 0, 0); head.rotation.z = -0.95; rig.head = head;
    box(head, 0.62, 0.34, 0.36, L.body, 0.22, 0.04, 0);
    box(head, 0.26, 0.2, 0.3, L.back, 0.08, 0.26, 0);                 // the nasal bump
    box(head, 0.3, 0.12, 0.32, L.belly, 0.32, -0.14, 0);
    eye(head, 0.14, 0.12, 0.18, 0.1);
    rig.tail = chain(body, -1.6, 2.4, 7, 0.55, Math.PI + 0.35, -0.06, (g, i, len) => box(g, len + 0.1, 0.5 - i * 0.06, 0.46 - i * 0.055, L.body, len / 2, 0, 0));
    rig.baseY = 0;
  } else if (kind === 'trike') {
    ball(body, 1.05, 0.62, 0.64, L.body, -0.1, 1.0, 0);
    ball(body, 0.85, 0.36, 0.52, L.belly, -0.05, 0.82, 0);
    for (let i = 0; i < 4; i++) box(body, 0.2, 0.08, 0.5, L.back, -0.6 + i * 0.35, 1.58, 0);
    for (const [x, z, ph] of [[0.55, 0.4, 0], [0.55, -0.4, Math.PI], [-0.62, 0.4, Math.PI], [-0.62, -0.4, 0]]) leg(x, 0.8, z, 0.36, 0.36, 0.26, L.body, L.back, L.back, ph);
    const head = grp(body, 0.95, 1.02, 0); rig.head = head;
    box(head, 0.62, 0.42, 0.44, L.body, 0.25, 0, 0);
    box(head, 0.26, 0.26, 0.3, L.beak, 0.64, -0.08, 0);
    cone(head, 0.08, 0.22, L.beak, 0.78, -0.1, 0, 0, 0, -Math.PI / 2);
    box(head, 0.4, 0.14, 0.4, L.belly, 0.3, -0.2, 0);
    eye(head, 0.28, 0.1, 0.23, 0.1);
    // the frill: a great round shield behind the head, patterned, edged with knobs
    const frill = grp(head, -0.08, 0.16, 0); frill.rotation.z = 0.62; rig.frill = frill;
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.09, 14), mat(L.frill));
    disc.rotation.z = Math.PI / 2; disc.position.y = 0.16; disc.castShadow = true; frill.add(disc);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.1, 12), mat(L.frill2));
    inner.rotation.z = Math.PI / 2; inner.position.y = 0.2; frill.add(inner);
    for (let i = 0; i < 7; i++) { const a = -1.35 + i * 0.45; ball(frill, 0.075, 0.075, 0.075, L.horn, 0.02, 0.16 + Math.cos(a) * 0.66, Math.sin(a) * 0.66); }
    // three horns: two long brow horns sweeping forward, a short one on the nose
    for (const z of [-0.15, 0.15]) cone(head, 0.085, 0.78, L.horn, 0.42, 0.42, z, 0, 0, -1.1);
    cone(head, 0.07, 0.26, L.horn, 0.62, 0.2, 0, 0, 0, -0.7);
    rig.tail = chain(body, -1.05, 1.0, 4, 0.34, Math.PI + 0.3, -0.1, (g, i, len) => box(g, len + 0.06, 0.34 - i * 0.07, 0.3 - i * 0.06, L.body, len / 2, 0, 0));
    if (saddle !== false) addSaddle(-0.15, 1.56, 0.6, 0.66);
  } else if (kind === 'raptor' || kind === 'compy') {
    const k = kind === 'compy' ? 0.45 : 1.22;
    const B = grp(body, 0, 0, 0); B.scale.setScalar(k);
    ball(B, 0.46, 0.3, 0.26, L.body, 0, 0.78, 0);
    ball(B, 0.36, 0.2, 0.2, L.belly, 0.05, 0.68, 0);
    for (let i = 0; i < 3; i++) box(B, 0.1, 0.05, 0.36, L.back, -0.2 + i * 0.2, 1.02, 0);
    // hind legs: thigh forward, shin back, a sickle claw
    const hip = (z, ph) => {
      const h = grp(B, 0, 0.72, z);
      box(h, 0.2, 0.34, 0.16, L.body, 0.06, -0.14, 0);
      const knee = grp(h, 0.1, -0.3, 0);
      box(knee, 0.1, 0.36, 0.1, L.back, -0.08, -0.16, 0);
      box(knee, 0.24, 0.07, 0.12, L.back, 0.0, -0.36, 0);
      cone(knee, 0.03, 0.14, L.claw, 0.05, -0.28, 0, 0, 0, -0.4);
      rig.legs.push({ hip: h, knee, phase: ph });
    };
    hip(0.14, 0); hip(-0.14, Math.PI);
    // little arms with feather tufts
    for (const z of [-0.18, 0.18]) { const a = grp(B, 0.34, 0.72, z); box(a, 0.08, 0.2, 0.06, L.body, 0.02, -0.08, 0); box(a, 0.06, 0.12, 0.05, L.crest, -0.04, -0.12, 0); rig.arms.push(a); }
    // the neck curves up, the head looks ahead
    rig.neck = chain(B, 0.38, 0.86, 2, 0.2, 0.9, -0.5, (g, i, len) => box(g, len + 0.06, 0.18 - i * 0.02, 0.16, L.body, len / 2, 0, 0));
    const head = grp(rig.neck.tip, 0.04, 0, 0); head.rotation.z = -0.35; rig.head = head;
    box(head, 0.38, 0.18, 0.18, L.body, 0.16, 0.02, 0);
    box(head, 0.22, 0.08, 0.16, L.belly, 0.22, -0.08, 0);
    const jaw = grp(head, 0.02, -0.06, 0); rig.jaw = jaw;
    box(jaw, 0.32, 0.06, 0.14, L.back, 0.16, -0.03, 0);
    for (let i = 0; i < 4; i++) cone(head, 0.015, 0.05, '#fff6e0', 0.1 + i * 0.07, -0.07, 0.06, Math.PI);
    eye(head, 0.14, 0.08, 0.09, 0.07);
    for (let i = 0; i < 3; i++) box(head, 0.06, 0.1 - i * 0.02, 0.04, L.crest, 0.02 - i * 0.06, 0.14 - i * 0.02, 0);
    rig.tail = chain(B, -0.42, 0.84, 5, 0.22, Math.PI + 0.12, -0.02, (g, i, len) => { box(g, len + 0.04, 0.16 - i * 0.025, 0.14 - i * 0.02, i === 4 ? L.crest : L.body, len / 2, 0, 0); });
    if (kind === 'raptor' && saddle !== false) addSaddle(-0.02, 1.22, 0.4, 0.36);
  } else if (kind === 'dilo') {
    const B = grp(body, 0, 0, 0); B.scale.setScalar(1.25);
    ball(B, 0.46, 0.3, 0.26, L.body, 0, 0.8, 0);
    ball(B, 0.36, 0.2, 0.2, L.belly, 0.05, 0.7, 0);
    for (const [x, z] of [[-0.2, 0.12], [0.05, -0.14], [0.2, 0.1]]) box(B, 0.1, 0.04, 0.1, L.back, x, 1.08, z);
    for (const [z, ph] of [[0.14, 0], [-0.14, Math.PI]]) {
      const h = grp(B, 0, 0.74, z);
      box(h, 0.2, 0.34, 0.16, L.body, 0.06, -0.14, 0);
      const knee = grp(h, 0.1, -0.3, 0);
      box(knee, 0.1, 0.38, 0.1, L.back, -0.08, -0.17, 0);
      box(knee, 0.24, 0.07, 0.12, L.back, 0.0, -0.38, 0);
      rig.legs.push({ hip: h, knee, phase: ph });
    }
    for (const z of [-0.18, 0.18]) { const a = grp(B, 0.34, 0.74, z); box(a, 0.08, 0.2, 0.06, L.body, 0.02, -0.08, 0); rig.arms.push(a); }
    rig.neck = chain(B, 0.38, 0.9, 3, 0.18, 0.8, -0.35, (g, i, len) => box(g, len + 0.06, 0.18, 0.16, L.body, len / 2, 0, 0));
    const head = grp(rig.neck.tip, 0.04, 0, 0); head.rotation.z = -0.3; rig.head = head;
    box(head, 0.4, 0.18, 0.18, L.body, 0.16, 0.02, 0);
    const jaw = grp(head, 0.02, -0.06, 0); rig.jaw = jaw;
    box(jaw, 0.32, 0.06, 0.14, L.back, 0.16, -0.03, 0);
    eye(head, 0.14, 0.08, 0.09, 0.07);
    // twin crests along the top of the head
    for (const z of [-0.05, 0.05]) box(head, 0.34, 0.14, 0.03, L.crest, 0.12, 0.17, z);
    // the frill, folded flat until it flares
    const frill = grp(rig.neck[0], 0.12, 0, 0); rig.frill = frill;
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 10), mat(L.frill));
    disc.rotation.z = Math.PI / 2; disc.castShadow = true; frill.add(disc);
    const disc2 = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.035, 10), mat(L.frill2));
    disc2.rotation.z = Math.PI / 2; frill.add(disc2);
    frill.scale.setScalar(0.15);
    rig.tail = chain(B, -0.42, 0.86, 5, 0.22, Math.PI + 0.1, -0.02, (g, i, len) => box(g, len + 0.04, 0.16 - i * 0.025, 0.14 - i * 0.02, L.body, len / 2, 0, 0));
  } else if (kind === 'ptera') {
    // a light body, a long beak & crest, big wings on the shoulders
    ball(body, 0.3, 0.2, 0.2, L.body, 0, 0.5, 0);
    ball(body, 0.22, 0.12, 0.15, L.belly, 0.02, 0.42, 0);
    const head = grp(body, 0.28, 0.62, 0); rig.head = head;
    box(head, 0.2, 0.14, 0.12, L.body, 0.05, 0, 0);
    box(head, 0.5, 0.06, 0.07, L.beak, 0.38, -0.03, 0);
    box(head, 0.36, 0.05, 0.04, L.crest, -0.2, 0.08, 0, 0, 0, 0.35);
    eye(head, 0.06, 0.03, 0.065, 0.05);
    for (const s of [-1, 1]) {
      const w = grp(body, 0.05, 0.56, 0.16 * s); rig.wings.push(w);
      box(w, 0.08, 0.05, 0.62, L.body, 0, 0, 0.31 * s);
      box(w, 0.52, 0.02, 0.62, L.wing, -0.2, -0.01, 0.31 * s);
      const tip = grp(w, 0, 0, 0.62 * s); rig.wings.push(tip);
      box(tip, 0.05, 0.04, 0.6, L.body, 0.04, 0, 0.3 * s);
      box(tip, 0.36, 0.02, 0.6, L.wing2, -0.12, -0.01, 0.28 * s, 0, 0.2 * s, 0);
    }
    for (const [z, ph] of [[0.06, 0], [-0.06, Math.PI]]) { const h = grp(body, -0.08, 0.4, z); box(h, 0.05, 0.22, 0.05, L.body, 0, -0.11, 0); const kn = grp(h, 0, -0.2, 0); box(kn, 0.1, 0.04, 0.06, L.beak, 0.03, -0.02, 0); rig.legs.push({ hip: h, knee: kn, phase: ph }); }
    rig.tail = chain(body, -0.28, 0.5, 2, 0.14, Math.PI, 0, (g, i, len) => box(g, len, 0.06, 0.06, L.body, len / 2, 0, 0));
  } else if (kind === 'ankylo') {
    ball(body, 1.0, 0.46, 0.66, L.body, -0.05, 0.62, 0);
    ball(body, 0.8, 0.22, 0.56, L.belly, 0, 0.44, 0);
    // armour: rows of plates and studs, spikes along the flanks
    for (let i = 0; i < 5; i++) for (const z of [-0.36, 0, 0.36]) box(body, 0.26, 0.1, 0.26, L.armor, -0.6 + i * 0.3, 1.0 - Math.abs(z) * 0.35, z, 0, 0.785, 0);
    for (let i = 0; i < 5; i++) for (const s of [-1, 1]) cone(body, 0.06, 0.24, L.spike, -0.6 + i * 0.3, 0.62, s * 0.64, s * Math.PI / 2, 0, 0);
    for (const [x, z, ph] of [[0.5, 0.42, 0], [0.5, -0.42, Math.PI], [-0.55, 0.42, Math.PI], [-0.55, -0.42, 0]]) leg(x, 0.5, z, 0.22, 0.24, 0.22, L.body, L.armor, L.armor, ph);
    const head = grp(body, 0.9, 0.6, 0); rig.head = head;
    box(head, 0.42, 0.3, 0.46, L.body, 0.16, 0, 0);
    box(head, 0.3, 0.1, 0.5, L.armor, 0.1, 0.18, 0);
    for (const s of [-1, 1]) cone(head, 0.05, 0.16, L.spike, -0.02, 0.14, s * 0.28, s * Math.PI / 2, 0, 0);
    eye(head, 0.26, 0.06, 0.23, 0.07);
    rig.tail = chain(body, -1.0, 0.64, 4, 0.3, Math.PI + 0.1, -0.02, (g, i, len) => box(g, len + 0.04, 0.2 - i * 0.03, 0.22 - i * 0.03, L.body, len / 2, 0, 0));
    const club = rig.tail.tip; rig.club = club;
    ball(club, 0.24, 0.18, 0.3, L.armor, 0.16, 0, 0);
    for (const s of [-1, 1]) ball(club, 0.14, 0.12, 0.14, L.armor, 0.14, 0, s * 0.2);
  } else if (kind === 'stego') {
    ball(body, 1.1, 0.62, 0.52, L.body, -0.1, 1.1, 0);
    ball(body, 0.9, 0.36, 0.42, L.belly, 0, 0.85, 0);
    // two rows of plates down the back, highest over the hips
    for (let i = 0; i < 8; i++) {
      const x = 0.7 - i * 0.24, hgt = 0.3 + Math.sin((i / 7) * Math.PI) * 0.3, y = 1.55 + Math.sin((i / 7) * Math.PI) * 0.15;
      box(body, hgt * 0.7, hgt, 0.05, i % 2 ? L.plate : L.plate2, x, y + hgt * 0.35, (i % 2 ? 0.08 : -0.08), 0, 0, 0.785);
    }
    for (const [x, z, ph, len] of [[0.6, 0.34, 0, 0.3], [0.6, -0.34, Math.PI, 0.3], [-0.6, 0.34, Math.PI, 0.42], [-0.6, -0.34, 0, 0.42]]) leg(x, x > 0 ? 0.72 : 0.9, z, len, len, 0.22, L.body, L.back, L.back, ph);
    const head = grp(body, 0.95, 0.85, 0); rig.head = head;
    box(head, 0.36, 0.2, 0.22, L.body, 0.14, 0, 0);
    box(head, 0.14, 0.12, 0.18, L.belly, 0.3, -0.04, 0);
    eye(head, 0.18, 0.05, 0.11, 0.06);
    rig.tail = chain(body, -1.1, 1.18, 4, 0.34, Math.PI - 0.25, 0.08, (g, i, len) => box(g, len + 0.04, 0.26 - i * 0.05, 0.24 - i * 0.05, L.body, len / 2, 0, 0));
    for (const s of [-1, 1]) for (const d of [0.05, 0.22]) cone(rig.tail.tip, 0.04, 0.34, L.spike, d, 0.06, s * 0.12, s * 0.9, 0, 0.3);
  } else if (kind === 'rex') {
    // the Tyrant King: a deep chest, a huge skull full of teeth, stripes down
    // his back (it's his back the camera sees), bony scutes, tiny clawed arms
    ball(body, 1.0, 0.95, 0.82, L.body, 0.35, 2.25, 0);                 // chest
    ball(body, 0.9, 0.82, 0.74, L.body, -0.55, 2.2, 0);                 // hips
    ball(body, 1.1, 0.55, 0.64, L.belly, 0.25, 1.82, 0);                // belly
    for (const [x, s, y] of [[0.8, 0.22, 2.95], [0.3, 0.26, 3.12], [-0.25, 0.26, 3.02], [-0.8, 0.22, 2.84]]) ball(body, s, s * 0.34, 0.66, L.stripe, x, y, 0);
    for (let i = 0; i < 7; i++) { const x = 1.0 - i * 0.32; box(body, 0.12, 0.16, 0.12, L.spike, x, 3.1 - Math.abs(x - 0.1) * 0.22, 0); }
    const legR = (z, ph) => {
      const h = grp(body, -0.3, 2.05, z);
      ball(h, 0.42, 0.55, 0.3, L.body, 0.12, -0.2, 0);                  // the thigh's muscle
      box(h, 0.56, 0.8, 0.46, L.back, 0.12, -0.42, 0);
      const knee = grp(h, 0.2, -0.78, 0);
      box(knee, 0.36, 0.9, 0.34, L.back, -0.18, -0.4, 0);
      box(knee, 0.74, 0.16, 0.46, L.back, 0.06, -0.86, 0);
      for (const dz of [-0.15, 0, 0.15]) cone(knee, 0.06, 0.2, L.claw, 0.48, -0.88, dz, 0, 0, -Math.PI / 2);
      rig.legs.push({ hip: h, knee, phase: ph });
    };
    legR(0.5, 0); legR(-0.5, Math.PI);
    for (const z of [-0.42, 0.42]) {
      const a = grp(body, 1.02, 2.1, z);
      box(a, 0.13, 0.32, 0.11, L.body, 0.04, -0.14, 0);
      box(a, 0.24, 0.1, 0.1, L.body, 0.14, -0.3, 0);
      for (const dz of [-0.03, 0.03]) cone(a, 0.025, 0.1, L.claw, 0.28, -0.34, dz, 0, 0, -Math.PI / 2);
      rig.arms.push(a);
    }
    rig.neck = chain(body, 1.08, 2.55, 2, 0.34, 0.5, -0.28, (g, i, len) => { box(g, len + 0.16, 0.7, 0.62, L.body, len / 2, 0, 0); box(g, 0.1, 0.12, 0.1, L.spike, len / 2, 0.38, 0); });
    const head = grp(rig.neck.tip, 0.08, 0.08, 0); head.rotation.z = -0.2; rig.head = head;
    box(head, 0.82, 0.74, 0.82, L.body, 0.22, 0.14, 0);                 // the skull
    box(head, 0.8, 0.5, 0.62, L.body, 0.9, 0.04, 0);                    // the snout
    box(head, 0.22, 0.42, 0.52, L.body, 1.36, 0.0, 0);
    box(head, 0.7, 0.1, 0.5, L.stripe, 0.85, 0.3, 0);                   // a dark stripe down the snout
    for (const s of [-1, 1]) box(head, 0.4, 0.14, 0.2, L.stripe, 0.46, 0.55, s * 0.3);   // scowling brows
    box(head, 0.5, 0.34, 0.9, L.back, 0.02, -0.02, 0);                  // jaw muscles
    eye(head, 0.5, 0.4, 0.42, 0.2);
    for (const s of [-1, 1]) box(head, 0.07, 0.07, 0.07, '#241a2e', 1.4, 0.2, s * 0.14);
    for (let i = 0; i < 6; i++) for (const s of [-1, 1]) cone(head, 0.05, 0.2, L.teeth, 0.62 + i * 0.15, -0.26, s * 0.27, Math.PI);
    const jaw = grp(head, 0.3, -0.26, 0); rig.jaw = jaw;
    box(jaw, 1.1, 0.24, 0.64, L.back, 0.5, -0.08, 0);
    box(jaw, 0.95, 0.06, 0.5, L.mouth, 0.5, 0.05, 0);
    box(jaw, 1.0, 0.1, 0.5, L.belly, 0.5, -0.2, 0);
    for (let i = 0; i < 5; i++) for (const s of [-1, 1]) cone(jaw, 0.045, 0.16, L.teeth, 0.35 + i * 0.16, 0.1, s * 0.26);
    rig.tail = chain(body, -1.25, 2.3, 7, 0.46, Math.PI - 0.15, 0.035, (g, i, len) => {
      box(g, len + 0.08, 0.7 - i * 0.085, 0.62 - i * 0.075, i % 2 ? L.stripe : L.body, len / 2, 0, 0);
      box(g, 0.1, 0.12, 0.1, L.spike, len / 2, 0.38 - i * 0.045, 0);
    });
  }
  if (baby) { const hd = rig.head; if (hd) hd.scale.setScalar(1.6); }
  root.scale.setScalar(scale);
  root.userData.rig = rig;
  if (rig.saddle && saddle === null) rig.saddle.visible = false;      // wild ones have no saddle yet
  return rig;
}

// Pose a dinosaur: speed (tiles/s) sets the gait; act = a flourish 0..1 (a
// bite, a charge, a spit: the jaw opens, the frill flares); roar = head up,
// jaw wide; graze = head down to the ferns; air = off the ground (wings beat)
export function animDino(rig, dt, { speed = 0, act = 0, roar = 0, graze = false, air = false, swim = false, glide = false } = {}) {
  const G = GAIT[rig.kind] || GAIT.raptor;
  const run = Math.min(1.6, speed / G.ref), moving = run > 0.05;
  rig.t += dt * (0.45 + run) * G.trot;
  const ph = rig.t * 6;
  for (const L of rig.legs) {
    const s = Math.sin(ph + L.phase);
    L.hip.rotation.z = moving ? s * G.amp * Math.min(1, run + 0.2) : 0;
    if (L.knee) L.knee.rotation.z = moving ? -Math.max(0, Math.cos(ph + L.phase)) * G.amp * 0.9 : 0;
  }
  if (swim) for (const [i, L] of rig.legs.entries()) { L.hip.rotation.z = Math.sin(rig.t * 9 + i * 1.7) * 0.6; if (L.knee) L.knee.rotation.z = -0.4; }
  rig.body.position.y = rig.baseY + (moving ? Math.abs(Math.sin(ph)) * G.bob * run : Math.sin(rig.t * 1.3) * 0.012);
  rig.body.rotation.z = moving ? Math.cos(ph) * 0.02 * run : 0;
  // the tail swishes (a wave down the chain), faster when running
  rig.tail.forEach((g, i) => { g.rotation.y = Math.sin(rig.t * (moving ? 5 : 1.4) - i * 0.7) * (0.05 + i * 0.03) * (moving ? 1 : 0.6); });
  // the neck: a long-neck sways, reaches down to graze; others bob
  if (rig.kind === 'brachio') {
    const k = graze ? 1 : 0;
    rig.neck.forEach((g, i) => { g.rotation.y = Math.sin(rig.t * 0.8 - i * 0.4) * 0.04; if (i > 0) g.rotation.z = 0.06 - k * (i < 4 ? 0.28 : 0.1) + (roar ? 0.05 : 0); });
    rig.neck[0].rotation.z = 1.05 - k * 0.35 + Math.sin(rig.t * 0.7) * 0.03;
  } else if (rig.neck.length) {
    rig.neck.forEach((g, i) => { if (i > 0) g.rotation.y = Math.sin(rig.t * 1.1) * 0.05; });
  }
  if (rig.head) {
    const base = rig.kind === 'brachio' ? -0.95 : rig.kind === 'rex' ? -0.2 : rig.kind === 'raptor' || rig.kind === 'compy' ? -0.35 : rig.kind === 'dilo' ? -0.3 : 0;
    rig.head.rotation.z = base + (moving ? Math.sin(ph * 2) * 0.05 : Math.sin(rig.t * 0.9) * 0.04) + roar * 0.45 - (graze && rig.kind !== 'brachio' ? 0.5 : 0) - act * (rig.kind === 'trike' ? 0.35 : 0);
  }
  if (rig.jaw) rig.jaw.rotation.z = -Math.max(roar * 0.7, act * 0.5, rig.kind === 'rex' ? Math.max(0, Math.sin(rig.t * 0.5)) * 0.06 : 0);
  if (rig.frill && rig.kind === 'dilo') rig.frill.scale.setScalar(0.15 + Math.max(act, roar) * 0.85);
  if (rig.arms.length) rig.arms.forEach((a, i) => { a.rotation.z = moving ? Math.sin(ph + i) * 0.2 : Math.sin(rig.t + i) * 0.05; });
  if (rig.kind === 'ptera') {
    const flap = air ? Math.sin(rig.t * 14) : act ? Math.sin(rig.t * 20) * 0.6 : 0;
    rig.wings.forEach((w, i) => {
      const side = i < 2 ? 1 : -1, tip = i % 2;
      w.rotation.x = side * (air || act ? flap * (tip ? 0.5 : 0.85) : glide ? (tip ? -0.08 : 0.06) + Math.sin(rig.t * 2 + i) * 0.04 : tip ? -0.9 : -0.3);
    });
  }
  if (rig.club) rig.club.rotation.y = act ? Math.sin(rig.t * 18) * 0.5 * act : 0;
}

// the saddle takes its rider's colour
export function paintDinoSaddle(r3d, rig, color) {
  if (!rig.saddle) return;
  rig.saddle.visible = true;
  rig.saddle.userData.pad.material = toon(r3d, { color, key: 'mount' + color });
}

// an enemy's model: facing +z like the other gloom creatures, its own
// materials (enemies flash & tint), the rig in userData for the brain to pose
export function dinoEnemyModel(r3d, kind, opts = {}) {
  const rig = buildDino(r3d, kind, { gloom: true, saddle: false, ...opts });
  const g = new THREE.Group();
  rig.root.rotation.y = -Math.PI / 2;
  g.add(rig.root);
  g.traverse((m) => { if (m.isMesh) m.material = m.material.clone(); });
  // a few gloom wisps rising off its back
  g.userData = { rig, body: rig.root };
  return g;
}
