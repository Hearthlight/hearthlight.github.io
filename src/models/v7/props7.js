// World v7: small story props the chapters stand in the world — a cave’s
// mouth in the rocks, a Pelican Post roost, a quest sign… Local frame: origin
// on the ground at the prop’s centre, its front facing +z (the camera).

import { kit, THREE } from './kit.js';

// a dark opening in a heap of boulders, a lantern hung by it, gloom seeping out
export function buildCaveMouth(r3d, { glow = '#9a6ad0' } = {}) {
  const K = kit(r3d);
  const g = new THREE.Group();
  const rock = [K.c('#5a5462'), K.c('#4a4652'), K.c('#6a6472')];
  const geo = K.geo('cm-rock', () => new THREE.DodecahedronGeometry(1, 0));
  // the arch: boulders round a half-circle, bigger at the feet
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI - (i / 8) * Math.PI, s = 0.75 + (i === 0 || i === 8 ? 0.35 : 0) + (i % 3) * 0.08;
    const m = K.put(g, geo, rock[i % 3], Math.cos(a) * 1.75, Math.sin(a) * 1.9 + 0.35, -0.2 + (i % 2) * 0.1, i * 0.7, i * 0.3);
    m.scale.set(s, s * 0.9, s);
  }
  for (const [x, y, z, s] of [[-2.6, 0.4, -0.3, 0.9], [2.7, 0.45, -0.2, 1], [0.2, 2.6, -0.6, 1.1], [-1.4, 2.3, -0.7, 0.9], [1.6, 2.4, -0.7, 0.85]]) K.put(g, geo, rock[1], x, y, z).scale.setScalar(s);
  // the dark mouth, and a gloomy glow deep inside
  const hole = K.noCast(K.put(g, K.geo('cm-hole', () => new THREE.CircleGeometry(1.35, 16, 0, Math.PI)), K.c('#0e0a14'), 0, 0.05, 0.25));
  void hole;
  const deep = K.noCast(K.put(g, K.geo('cm-deep', () => new THREE.CircleGeometry(0.8, 12, 0, Math.PI)), K.light(glow, 0.35), 0, 0.15, 0.3));
  // a lantern on a crooked post, and a sign
  K.put(g, K.box(0.1, 1.5, 0.1), K.c('#5a3b2a'), 2.4, 0.75, 0.9);
  K.put(g, K.box(0.5, 0.08, 0.08), K.c('#5a3b2a'), 2.2, 1.45, 0.9);
  K.noCast(K.put(g, K.box(0.18, 0.24, 0.18), K.glow('#fff0c0', '#ffb347', 1.1), 2.0, 1.25, 0.9));
  K.put(g, K.box(0.08, 0.7, 0.08), K.c('#5a3b2a'), -2.3, 0.35, 1.1);
  K.put(g, K.box(0.8, 0.4, 0.06), K.c('#b07b50'), -2.3, 0.7, 1.15);
  g.userData.anim = (t) => { deep.material.opacity = 0.25 + Math.sin(t * 2) * 0.1; };
  return g;
}

// a whispering tree of the Deepwood: an old oak with a sleepy face in its bark;
// sick with gloom it frowns, its leaves go grey and violet wisps curl round it
// (userData.anim(t, S) reads its flag: `userData.flag`)
export function buildSickTree(r3d, flag) {
  const K = kit(r3d);
  const g = new THREE.Group();
  const bark = K.c('#6a4c38'), barkD = K.c('#4a3426');
  const trunk = K.put(g, K.cyl(0.55, 0.8, 2.6, 9), bark, 0, 1.3, 0);
  void trunk;
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.3; const r = K.put(g, K.box(1.0, 0.24, 0.3), barkD, Math.cos(a) * 0.8, 0.12, Math.sin(a) * 0.7); r.rotation.y = -a; r.rotation.z = -0.25; }
  // the face
  const face = K.grp(g, 0, 1.6, 0.66);
  const eyes = [-1, 1].map((s) => K.put(face, K.box(0.2, 0.06, 0.05), K.c('#2a1a14'), s * 0.2, 0.1, 0));
  const brows = [-1, 1].map((s) => K.put(face, K.box(0.22, 0.05, 0.05), barkD, s * 0.2, 0.24, 0));
  const mouth = K.put(face, K.box(0.26, 0.07, 0.05), K.c('#2a1a14'), 0, -0.22, 0);
  // the crown
  const green = [K.c('#4f8a3c'), K.c('#5f9a48'), K.c('#3f7a34')], grey = [K.c('#6a7064'), K.c('#7a7a70'), K.c('#5a5e58')];
  const blobs = [];
  for (const [x, y, z, r] of [[0, 3.4, 0, 1.3], [-1, 2.9, 0.3, 0.95], [1, 3.0, 0.1, 1.0], [0.2, 4.1, -0.2, 0.9], [-0.5, 3.8, 0.6, 0.7]]) {
    const b = K.put(g, K.ball(1, 10, 7), green[blobs.length % 3], x, y, z); b.scale.set(r, r * 0.85, r); blobs.push(b);
  }
  // gloom wisps
  const wisps = [];
  const wm = K.glow('#b88aff', '#8a4ae0', 0.9);
  for (let k = 0; k < 6; k++) { const w = K.noCast(K.put(g, K.ball(0.14, 6, 4), wm, 0, 0, 0)); wisps.push(w); }
  g.userData.flag = flag;
  let last = null;
  g.userData.anim = (t, S) => {
    const healed = !!(S && S.has(flag));
    if (healed !== last) {
      last = healed;
      blobs.forEach((b, i) => { b.material = healed ? green[i % 3] : grey[i % 3]; });
      mouth.scale.set(healed ? 1 : 0.8, 1, 1); mouth.position.y = healed ? -0.2 : -0.24;
      brows.forEach((b, i) => { b.rotation.z = healed ? 0 : (i ? -0.35 : 0.35); });
    }
    wisps.forEach((w, k) => { w.visible = !healed; const a = t * 0.9 + k * 1.05; w.position.set(Math.cos(a) * 1.4, 1 + ((t * 0.5 + k / 6) % 1) * 3, Math.sin(a) * 1.1); w.scale.setScalar(0.6 + Math.sin(t * 3 + k) * 0.3); });
    // (a slow blink when healed)
    const blink = healed && (t % 4.5) < 0.12;
    eyes.forEach((e) => { e.scale.y = blink ? 0.3 : 1; });
  };
  return g;
}

// the Rootway’s door: a curtain of roots parted round a dark opening, glowworms in it
export function buildRootDoor(r3d) {
  const K = kit(r3d);
  const g = new THREE.Group();
  const root = K.c('#6a4a30');
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI - (i / 8) * Math.PI, x = Math.cos(a) * 1.3, y = Math.sin(a) * 1.7 + 0.2;
    const b = K.put(g, K.cyl(0.14, 0.2, 1.2, 6), root, x, y, 0); b.rotation.z = a + Math.PI / 2 + (i % 2 ? 0.2 : -0.2);
  }
  K.noCast(K.put(g, K.geo('rd-hole', () => new THREE.CircleGeometry(1.2, 14, 0, Math.PI)), K.c('#0e0a0c'), 0, 0.05, -0.05));
  const glows = [];
  for (let k = 0; k < 5; k++) glows.push(K.noCast(K.put(g, K.ball(0.06, 5, 4), K.glow('#c8ffe8', '#6af0b0', 1.5), -0.6 + k * 0.3, 0.5 + (k % 3) * 0.35, -0.02)));
  g.userData.anim = (t) => { glows.forEach((w, k) => { w.position.y = 0.5 + (k % 3) * 0.35 + Math.sin(t * 1.5 + k) * 0.05; }); };
  return g;
}

// a forest lamp post (Tansy’s lamplighting round): lit by `userData.flag`
export function buildLampPost(r3d, flag) {
  const K = kit(r3d);
  const g = new THREE.Group();
  K.put(g, K.cyl(0.07, 0.1, 2.2, 6), K.c('#4a3a2a'), 0, 1.1, 0);
  K.put(g, K.box(0.5, 0.06, 0.06), K.c('#4a3a2a'), 0.2, 2.1, 0);
  const cage = K.grp(g, 0.42, 1.85, 0);
  K.put(cage, K.box(0.26, 0.04, 0.26), K.c('#3b3a46'), 0, 0.18, 0);
  K.put(cage, K.box(0.24, 0.04, 0.24), K.c('#3b3a46'), 0, -0.16, 0);
  const glass = K.noCast(K.put(cage, K.box(0.2, 0.28, 0.2), K.c('#5a5462'), 0, 0.01, 0));
  const on = K.glow('#fff0c0', '#ffb347', 1.3), off = K.c('#5a5462');
  let last = null;
  g.userData.anim = (t, S) => {
    const lit = !!(S && S.has(flag));
    if (lit !== last) { last = lit; glass.material = lit ? on : off; }
    cage.rotation.z = Math.sin(t * 1.3) * 0.05;
  };
  return g;
}

// ------------------------------------------------------------------ chapter 3: Dust & Spores
// the Duchess’s big top on the Festival Ring: a striped round tent, a pennant on
// top, bunting to the ground, a dark door flap facing the camera
export function buildBigTop(r3d) {
  const K = kit(r3d), g = new THREE.Group();
  const red = K.c('#c8383e'), cream = K.c('#f4ead8'), gold = K.c('#f2c14e'), pole = K.c('#6a4a34');
  const n = 16, R = 2.9, H = 1.7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, x = Math.cos(a) * R, z = Math.sin(a) * R;
    K.put(g, K.box(2 * R * Math.sin(Math.PI / n) + 0.04, H, 0.1), i % 2 ? red : cream, x, H / 2, z, -a + Math.PI / 2);
  }
  // the roof: a cone of panels, red and cream by turns
  const panels = (odd) => K.geo('bt-roof' + odd, () => {
    const pos = [], RR = R + 0.35, top = 2.2;
    for (let i = odd; i < n; i += 2) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      pos.push(0, top, 0, Math.cos(a1) * RR, 0, Math.sin(a1) * RR, Math.cos(a0) * RR, 0, Math.sin(a0) * RR);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    return geo;
  });
  K.put(g, panels(0), red, 0, H, 0);
  K.put(g, panels(1), cream, 0, H, 0);
  K.put(g, K.box(0.3, 0.3, 0.3), gold, 0, H + 2.25, 0);
  K.put(g, K.box(0.08, 1.3, 0.08), pole, 0, H + 2.9, 0);
  const flag = K.put(g, K.box(0.7, 0.36, 0.03), red, 0.38, H + 3.35, 0);
  // the door flap, tied back
  K.put(g, K.box(1.2, 1.5, 0.06), K.c('#2a1a24'), 0, 0.75, R + 0.02);
  for (const s of [-1, 1]) { const f = K.put(g, K.box(0.5, 1.5, 0.06), red, s * 0.8, 0.75, R + 0.08, s * 0.4); void f; }
  // bunting from the top down to pegs round it
  const cols = [K.c('#c8383e'), K.c('#f2c14e'), K.c('#3f6fae'), K.c('#62c46c')];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.3, ex = Math.cos(a) * (R + 1.6), ez = Math.sin(a) * (R + 1.6);
    for (let j = 1; j < 7; j++) { const u = j / 7; const f = K.put(g, K.cone(0.1, 0.22, 3), cols[(j + k) % 4], ex * u, H + 2.2 - u * (H + 1.9) + Math.sin(u * Math.PI) * 0.2, ez * u, 0, Math.PI); void f; }
    K.put(g, K.box(0.1, 0.3, 0.1), pole, ex, 0.15, ez);
  }
  g.userData.anim = (t) => { flag.rotation.y = Math.sin(t * 3) * 0.3; };
  return g;
}

// the Understudies’ show stage: planks on trestles, a red curtain, footlights
export function buildShowStage(r3d) {
  const K = kit(r3d), g = new THREE.Group();
  const wood = K.c('#9a6a44'), dark = K.c('#6b4330'), red = K.c('#b8303e'), redD = K.c('#861f2c'), gold = K.c('#f2c14e');
  K.put(g, K.box(6, 0.5, 2.6), wood, 0, 0.25, 0);
  for (let x = -2.5; x <= 2.5; x += 1) K.put(g, K.box(0.05, 0.52, 2.6), dark, x, 0.26, 0);
  for (const s of [-1, 1]) K.put(g, K.box(0.2, 3.2, 0.2), dark, s * 3, 1.6, -1.2);
  K.put(g, K.box(6.2, 0.3, 0.3), gold, 0, 3.2, -1.2);
  for (let i = 0; i < 12; i++) K.put(g, K.box(0.5, 2.7, 0.1), i % 2 ? red : redD, -2.75 + i * 0.5, 1.85, -1.25);
  for (let i = 0; i < 6; i++) K.noCast(K.put(g, K.box(0.24, 0.12, 0.14), K.glow('#fff6d8', '#ffe9a0', 1.2), -2.5 + i, 0.56, 1.2));
  K.put(g, K.box(1.4, 0.5, 0.1), gold, 0, 3.55, -1.15);
  for (let i = 0; i < 3; i++) K.noCast(K.put(g, K.cone(0.14, 0.22, 5), K.glow('#fff6d8', '#ffd66b', 0.8), -0.4 + i * 0.4, 3.9, -1.1));
  return g;
}

// the mine’s mouth, blown shut: a heap of red boulders, dust still settling
export function buildRockfall(r3d) {
  const K = kit(r3d), g = new THREE.Group();
  const rock = [K.c('#9a5a44'), K.c('#b8704a'), K.c('#7a4a3a')];
  const geo = K.geo('rf-rock', () => new THREE.DodecahedronGeometry(1, 0));
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI, d = 0.8 + (i % 3) * 0.7; const b = K.put(g, geo, rock[i % 3], Math.cos(a) * d * 1.3, 0.3 + (i % 4) * 0.35, Math.sin(a) * 0.5 - 0.2, i, i * 0.5); b.scale.setScalar(0.5 + (i % 3) * 0.25); }
  K.put(g, K.box(0.6, 0.35, 0.05), K.c('#f2c14e'), 1.9, 0.55, 0.7, 0.3);
  return g;
}

// the old quarry road’s gate: planks nailed across a timber frame in the mesa
// (built facing east; `open` pulls the planks off)
export function buildQuarryGate(r3d, S) {
  const K = kit(r3d), g = new THREE.Group(), f = K.grp(g, 0, 0, 0, Math.PI / 2);
  const wood = K.c('#6a4a34'), plank = K.c('#9a6a44');
  for (const x of [-1.5, 1.5]) K.put(f, K.box(0.34, 2.8, 0.34), wood, x, 1.4, 0);
  K.put(f, K.box(3.6, 0.36, 0.4), wood, 0, 2.85, 0);
  K.put(f, K.box(2.7, 2.6, 0.1), K.c('#1e1612'), 0, 1.3, -0.1);
  const boards = K.grp(f, 0, 0, 0.12);
  for (let i = 0; i < 4; i++) K.put(boards, K.box(3.1, 0.3, 0.08), plank, 0, 0.5 + i * 0.6, 0, 0, 0, (i % 2 ? 0.12 : -0.1));
  K.put(f, K.box(0.9, 0.5, 0.06), K.c('#b07b50'), 2.3, 1.2, 0.3, -0.2);
  K.put(f, K.box(0.5, 0.06, 0.07), K.c('#3a3844'), 2.3, 1.25, 0.34, -0.2, 0, 0.5);
  g.userData.anim = () => { boards.visible = !S || !S.has('quarryOpen'); };
  return g;
}

// the Steppe’s Great Hearth relit: a star of green-gold light in the ring’s sand
export function buildRingStar(r3d) {
  const K = kit(r3d), g = new THREE.Group();
  const shape = new THREE.Shape();
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? 1.1 : 2.6; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (k) shape.lineTo(x, y); else shape.moveTo(x, y); }
  const star = K.noCast(K.put(g, K.geo('rs-star', () => new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2)), K.light('#d8ffb0', 0.55), 0, 0.03, 0));
  const flame = K.noCast(K.put(g, K.cone(0.35, 1.1, 7), K.glow('#d8ffb0', '#8ff0a0', 0.9), 0, 0.55, 0));
  g.userData.anim = (t) => { star.material.opacity = 0.4 + Math.sin(t * 2) * 0.12; flame.scale.y = 0.85 + Math.sin(t * 6) * 0.15; flame.rotation.y = t; };
  return g;
}

// Temur’s wind chimes: a pole with a crossbar, hollow tubes that swing (once hung)
export function buildWindChime(r3d, flag, S) {
  const K = kit(r3d), g = new THREE.Group();
  K.put(g, K.box(0.1, 2.4, 0.1), K.c('#8a6a4a'), 0, 1.2, 0);
  K.put(g, K.box(0.9, 0.08, 0.08), K.c('#8a6a4a'), 0, 2.35, 0);
  const tubes = K.grp(g, 0, 2.3, 0);
  const cols = [K.c('#c8d4e0'), K.c('#e0c890'), K.c('#b8c8a0')];
  const ts = [];
  for (let i = 0; i < 5; i++) { const t = K.grp(tubes, -0.36 + i * 0.18, 0, 0); K.put(t, K.box(0.015, 0.2, 0.015), K.c('#3a3844'), 0, -0.1, 0); K.put(t, K.cyl(0.04, 0.04, 0.4 + (i % 3) * 0.12, 6), cols[i % 3], 0, -0.4 - (i % 3) * 0.06, 0); ts.push(t); }
  const ribbon = K.put(g, K.box(0.06, 0.6, 0.02), K.c('#c8383e'), 0.5, 2.0, 0);
  g.userData.anim = (tm) => { const on = !S || S.has(flag); tubes.visible = on; ribbon.visible = on; ts.forEach((t, i) => { t.rotation.z = Math.sin(tm * 2.2 + i) * 0.25; }); ribbon.rotation.z = Math.sin(tm * 3) * 0.3; };
  return g;
}

// a fluffhorn: the steppe folk’s woolly, curly-horned goats (this one’s lost & sulking)
export function buildFluffhorn(r3d) {
  const K = kit(r3d), g = new THREE.Group(), body = K.grp(g, 0, 0.45, 0);
  const wool = K.c('#f4ecdc'), woolD = K.c('#ddd2bc'), face = K.c('#6a5a4a'), horn = K.c('#c8a878'), eye = K.c('#1e1612');
  for (const [x, y, z, r] of [[0, 0, 0, 0.36], [0.2, 0.08, -0.15, 0.26], [-0.2, 0.06, -0.12, 0.27], [0, 0.18, 0.12, 0.26], [0, 0.1, -0.3, 0.24]]) K.put(body, K.ball(r, 7, 5), (x > 0 ? woolD : wool), x, y, z);
  const head = K.grp(body, 0, 0.12, 0.38);
  K.put(head, K.box(0.2, 0.22, 0.24), face, 0, 0, 0.04);
  K.put(head, K.ball(0.14, 6, 4), wool, 0, 0.14, -0.02);
  for (const s of [-1, 1]) { K.put(head, K.box(0.04, 0.04, 0.02), eye, s * 0.07, 0.03, 0.17); const h = K.put(head, K.cyl(0.03, 0.05, 0.3, 5), horn, s * 0.14, 0.14, -0.04, 0, 0.6, s * 1.1); void h; }
  for (const [x, z] of [[-0.18, 0.2], [0.18, 0.2], [-0.18, -0.2], [0.18, -0.2]]) K.put(g, K.box(0.08, 0.3, 0.08), face, x, 0.15, z);
  g.userData.anim = (t) => { head.rotation.x = Math.sin(t * 1.3) * 0.08; body.position.y = 0.45 + Math.sin(t * 2) * 0.01; };
  return g;
}

// an ore cart for the story’s scenes (with the Hearthstone in it, or empty)
export function buildOreCart(r3d, { stone = false } = {}) {
  const K = kit(r3d), g = new THREE.Group();
  K.put(g, K.box(1.1, 0.6, 1.4), K.c('#7a5a44'), 0, 0.5, 0);
  for (const z of [-0.6, 0.6]) K.put(g, K.box(1.15, 0.1, 0.08), K.c('#3a3844'), 0, 0.76, z);
  const wheels = [];
  for (const x of [-0.46, 0.46]) for (const z of [-0.45, 0.45]) { const w = K.grp(g, x, 0.2, z); K.put(w, K.cyl(0.2, 0.2, 0.1, 10), K.c('#3a3844'), 0, 0, 0, 0, 0, Math.PI / 2); K.put(w, K.box(0.12, 0.28, 0.04), K.c('#9a96a0'), 0, 0, 0.06); wheels.push(w); }
  let st = null;
  if (stone) {
    st = K.noCast(K.put(g, K.ball(0.5, 8, 6), K.glow('#b8e89a', '#4ab870', 0.6), 0, 1.05, 0));
    for (let i = 0; i < 5; i++) K.noCast(K.put(st, K.box(0.12, 0.42, 0.12), K.glow('#f2e08a', '#e0b030', 0.8), Math.cos(i * 1.26) * 0.42, 0.1 + (i % 2) * 0.16, Math.sin(i * 1.26) * 0.42, i, 0.4, 0));
  }
  g.userData.roll = (d) => { for (const w of wheels) w.rotation.x += d / 0.2; };
  g.userData.anim = (t) => { if (st) { st.rotation.y = t * 0.6; } };
  return g;
}

// the hollow under the Ring’s star where the Steppe’s Great Hearth burned: the
// trapdoor thrown open, dug-up sand round a cold, dark hole
export function buildEmptyHollow(r3d) {
  const K = kit(r3d), g = new THREE.Group();
  K.noCast(K.put(g, K.cyl(1.05, 1.05, 0.04, 16), K.c('#1e1612'), 0, 0.02, 0));
  K.noCast(K.put(g, K.cyl(0.8, 0.8, 0.05, 14), K.c('#0e0a10'), 0, 0.03, 0));
  const sand = [K.c('#e8c88a'), K.c('#d8b070')];
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; K.put(g, K.ball(0.28 + (i % 3) * 0.08, 6, 4), sand[i % 2], Math.cos(a) * 1.3, 0.05, Math.sin(a) * 1.15).scale.y = 0.45; }
  const lid = K.grp(g, 0, 0.1, -1.05);
  K.put(lid, K.box(1.6, 0.1, 1.1), K.c('#8a6a44'), 0, 0.55, -0.1, 0, -1.2);
  for (let i = 0; i < 3; i++) K.put(lid, K.box(1.62, 0.04, 0.06), K.c('#5a3a2a'), 0, 0.3 + i * 0.25, -0.25 - i * 0.02, 0, -1.2);
  K.put(g, K.box(0.9, 0.08, 0.14), K.c('#8a6a44'), 1.4, 0.06, 0.5, 0.6);
  return g;
}

// ------------------------------------------------------------------ chapter 4: Mire & Frost
// King Croakington’s throne: a great lily pad by the water, a seat of woven reeds
// under a toadstool parasol, cattails round it (the crown’s hook stands empty)
export function buildLilyThrone(r3d, S) {
  const K = kit(r3d), g = new THREE.Group();
  const pad = K.c('#5aa04a'), padD = K.c('#3f7a3a'), reed = K.c('#c8a868'), reedD = K.c('#a8844a'), cap = K.c('#d8483a'), dots = K.c('#f4ecdc');
  const lily = K.put(g, K.cyl(2.2, 2.2, 0.12, 20), pad, 0, 0.06, 0.2);
  lily.scale.z = 0.9;
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; K.put(g, K.box(0.05, 0.02, 2), padD, Math.cos(a) * 1, 0.13, 0.2 + Math.sin(a) * 0.9, -a); }
  // the seat and its tall back
  K.put(g, K.box(1.3, 0.5, 1.0), reed, 0, 0.42, -0.2);
  const back = K.put(g, K.box(1.4, 1.6, 0.2), reedD, 0, 1.1, -0.72);
  for (let i = 0; i < 6; i++) K.put(back, K.box(0.05, 1.6, 0.22), reed, -0.6 + i * 0.24, 0, 0);
  for (const s of [-1, 1]) K.put(g, K.box(0.2, 0.7, 0.9), reedD, s * 0.72, 0.6, -0.2);
  // the toadstool parasol
  K.put(g, K.cyl(0.08, 0.1, 2.4, 6), K.c('#e8dcc8'), 0.9, 1.2, -0.9);
  const tc = K.put(g, K.ball(0.9, 10, 6), cap, 0.9, 2.45, -0.9); tc.scale.y = 0.45;
  for (let i = 0; i < 5; i++) K.put(g, K.ball(0.12, 5, 4), dots, 0.9 + Math.cos(i * 1.3) * 0.5, 2.7, -0.9 + Math.sin(i * 1.3) * 0.5);
  // cattails
  for (const [x, z] of [[-2, -0.6], [-1.8, 0.8], [2.1, 0.5], [1.9, 1.2]]) { K.put(g, K.box(0.05, 1.4, 0.05), K.c('#6a9a4a'), x, 0.7, z); K.put(g, K.cyl(0.08, 0.08, 0.34, 6), K.c('#7a4a2a'), x, 1.35, z); }
  // the crown’s hook, empty until the crown comes home (then a warm glow)
  const hook = K.grp(g, -0.9, 1.8, -0.7);
  K.put(hook, K.box(0.06, 0.4, 0.06), K.c('#6a4a34'), 0, 0, 0);
  const warm = K.noCast(K.put(g, K.cyl(1.9, 1.9, 0.02, 20), K.light('#ffc890', 0.3), 0, 0.14, 0.2));
  g.userData.anim = (t) => { const on = S && S.done('c4_relight'); warm.visible = on; if (on) warm.material.opacity = 0.2 + Math.sin(t * 2) * 0.08; };
  return g;
}

// a little frog (the royal choir’s missing singers), green with a pale belly
export function buildFrog(r3d, color = '#6ab04a') {
  const K = kit(r3d), g = new THREE.Group(), body = K.grp(g);
  const c = K.c(color), belly = K.c('#e8f0c8'), eye = K.c('#fff8e8'), pupil = K.c('#1e1612');
  K.put(body, K.ball(0.22, 8, 6), c, 0, 0.18, 0).scale.set(1.2, 0.8, 1);
  K.put(body, K.ball(0.14, 6, 4), belly, 0, 0.14, 0.1).scale.set(1.2, 0.7, 0.8);
  for (const s of [-1, 1]) { K.put(body, K.ball(0.08, 6, 4), eye, s * 0.11, 0.33, 0.06); K.put(body, K.ball(0.04, 4, 3), pupil, s * 0.11, 0.35, 0.12); K.put(body, K.box(0.1, 0.05, 0.22), c, s * 0.2, 0.05, 0.02); }
  g.userData.anim = (t) => { body.position.y = Math.max(0, Math.sin(t * 3 + color.length)) * 0.12; body.scale.y = 1 + Math.sin(t * 6) * 0.04; };
  return g;
}

// a fat cloud puff (someone’s legs sticking out of it, kicking)
export function buildCloudPuff(r3d, { legs = false } = {}) {
  const K = kit(r3d), g = new THREE.Group();
  const w = K.c('#f8f8ff'), s = K.c('#e0e4f4');
  for (const [x, y, z, r] of [[0, 0.9, 0, 0.9], [0.8, 0.7, 0.2, 0.7], [-0.8, 0.75, 0.1, 0.7], [0.3, 1.5, -0.1, 0.6], [-0.4, 1.4, 0.3, 0.55]]) K.put(g, K.ball(r, 10, 8), y > 1 ? w : s, x, y, z);
  const kick = [];
  if (legs) for (const sx of [-0.18, 0.18]) { const L = K.grp(g, sx, 0.3, 0.7); K.put(L, K.box(0.16, 0.5, 0.16), K.c('#3a2a4a'), 0, -0.2, 0); K.put(L, K.box(0.2, 0.12, 0.3), K.c('#c8383e'), 0, -0.48, 0.06); kick.push(L); }
  g.userData.anim = (t) => { g.position.y = Math.sin(t * 1.2) * 0.08; kick.forEach((L, i) => { L.rotation.x = Math.sin(t * 12 + i * Math.PI) * 0.6; }); };
  return g;
}

// the Frostbell gate: two great ice crystals framing a doorway of frost behind the arch
export function buildFrostGate(r3d) {
  const K = kit(r3d), g = new THREE.Group();
  const ice = [K.glow('#dff4ff', '#8ad0ff', 0.5), K.glow('#c8ecff', '#6ab8f0', 0.5)];
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const c = K.put(g, K.cone(0.4 - i * 0.08, 3.2 - i * 0.7, 5), ice[i % 2], s * (1.7 + i * 0.35), (3.2 - i * 0.7) / 2, -0.2 + i * 0.2); c.rotation.z = -s * (0.08 + i * 0.12); }
  const door = K.noCast(K.put(g, K.box(2.6, 2.9, 0.1), K.light('#bfe8ff', 0.45), 0, 1.45, -0.3));
  for (let i = 0; i < 6; i++) K.noCast(K.put(g, K.box(0.1, 0.1, 0.05), K.glow('#ffffff', '#bfe8ff', 1), -0.9 + (i % 3) * 0.9, 0.8 + Math.floor(i / 3) * 1.1, -0.24));
  g.userData.anim = (t) => { door.material.opacity = 0.35 + Math.sin(t * 2) * 0.1; };
  return g;
}

// a bronze bell on a post of cloud-white stone (the Cloud Temple’s bells, silent until rung)
export function buildCloudBell(r3d, flag, S) {
  const K = kit(r3d), g = new THREE.Group();
  const stone = K.c('#f0ecf4'), bronze = K.glow('#d8a84a', '#a87a2a', 0.3);
  for (const x of [-0.5, 0.5]) K.put(g, K.box(0.2, 2, 0.2), stone, x, 1, 0);
  K.put(g, K.box(1.3, 0.2, 0.3), stone, 0, 2.05, 0);
  const bell = K.grp(g, 0, 1.9, 0);
  K.put(bell, K.cyl(0.18, 0.36, 0.55, 10), bronze, 0, -0.3, 0);
  K.put(bell, K.ball(0.08, 6, 4), K.c('#8a6a3a'), 0, -0.62, 0);
  g.userData.anim = (t) => { const rung = S && S.has(flag); bell.rotation.z = rung ? Math.sin(t * 3) * 0.25 : 0; };
  return g;
}

// the Gloomophone: Her Radiance's gramophone horn — a brass bell on a violet box,
// glowing when she speaks down it (the Understudies carry it everywhere)
export function buildGloomophone(r3d) {
  const K = kit(r3d), g = new THREE.Group();
  K.put(g, K.box(0.7, 0.5, 0.6), K.c('#4a2a5e'), 0, 0.25, 0);
  K.put(g, K.box(0.74, 0.08, 0.64), K.glow('#f2c14e', '#c89020', 0.3), 0, 0.52, 0);
  K.put(g, K.cyl(0.05, 0.05, 0.5, 6), K.c('#3a3844'), 0, 0.78, -0.1, 0, -0.4);
  const horn = K.grp(g, 0, 1.0, 0.15);
  // (the bell of the horn leans forward, towards whoever is being told off)
  K.put(horn, K.cyl(0.55, 0.06, 0.9, 12, true), K.glow('#d8a84a', '#8a5aa8', 0.4), 0, 0.2, 0.2, 0, 1.0);
  const mouth = K.noCast(K.put(horn, K.cyl(0.5, 0.5, 0.04, 12), K.glow('#c89aff', '#9a5ae0', 1.2), 0, 0.44, 0.58, 0, 1.0));
  g.userData.anim = (t) => { mouth.material.emissiveIntensity = 1 + Math.abs(Math.sin(t * 9)) * 0.9; horn.rotation.z = Math.sin(t * 7) * 0.04; };
  return g;
}

// a race flag on a pole (a checkered banner for the start and the finish)
export function buildRaceFlag(r3d, kind = 'flag') {
  const K = kit(r3d), g = new THREE.Group();
  K.put(g, K.box(0.1, 2.6, 0.1), K.c('#6a4a34'), 0, 1.3, 0);
  const flag = K.grp(g, 0, 2.3, 0);
  if (kind === 'flag') K.put(flag, K.box(0.8, 0.5, 0.04), K.c('#c8383e'), 0.42, 0, 0);
  else for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) K.put(flag, K.box(0.2, 0.17, 0.04), K.c((i + j) % 2 ? '#1e1a24' : '#f4f0e8'), 0.12 + i * 0.2, 0.17 - j * 0.17, 0);
  g.userData.anim = (t) => { flag.rotation.y = Math.sin(t * 4) * 0.25; };
  return g;
}

// ---- chapter 5: Sand & Sea
// Humphrey, the caravan's lead camel: two humps, a saddle blanket, a bell at his
// neck, a very long face (the escort's walker: anim(t, moving))
export function buildCamel(r3d) {
  const K = kit(r3d), g = new THREE.Group(), body = K.grp(g, 0, 0, 0);
  const fur = K.c('#d8a86a'), furD = K.c('#b8884a'), dark = K.c('#3a2a24');
  K.put(body, K.box(0.9, 0.7, 1.9), fur, 0, 1.45, 0);
  for (const z of [-0.45, 0.35]) K.put(body, K.ball(0.42, 8, 6), fur, 0, 1.85, z).scale.set(1, 0.9, 1);
  K.put(body, K.box(1.0, 0.1, 1.1), K.c('#c8383e'), 0, 1.82, -0.05);
  for (const x of [-0.46, 0.46]) K.put(body, K.box(0.04, 0.4, 1.0), K.c('#f2c14e'), x, 1.62, -0.05);
  const neck = K.grp(body, 0, 1.6, 0.85);
  K.put(neck, K.box(0.34, 1.0, 0.34), fur, 0, 0.35, 0.2).rotation.x = 0.5;
  const head = K.grp(neck, 0, 0.9, 0.5);
  K.put(head, K.box(0.36, 0.34, 0.7), fur, 0, 0, 0.1);
  K.put(head, K.box(0.3, 0.2, 0.2), furD, 0, -0.05, 0.48);
  for (const s of [-1, 1]) { K.put(head, K.box(0.06, 0.08, 0.06), dark, s * 0.17, 0.08, 0.2); K.put(head, K.box(0.08, 0.14, 0.06), fur, s * 0.16, 0.22, -0.18); }
  const bell = K.grp(neck, 0, 0.35, 0.45);
  K.put(bell, K.cyl(0.08, 0.14, 0.18, 8), K.glow('#d8a84a', '#8a6a2a', 0.3), 0, -0.1, 0);
  const legs = [];
  for (const [x, z] of [[-0.3, 0.7], [0.3, 0.7], [-0.3, -0.7], [0.3, -0.7]]) { const L = K.grp(body, x, 1.15, z); K.put(L, K.box(0.18, 1.1, 0.18), furD, 0, -0.55, 0); K.put(L, K.box(0.24, 0.1, 0.28), dark, 0, -1.1, 0.03); legs.push(L); }
  const tail = K.put(body, K.box(0.06, 0.5, 0.06), furD, 0, 1.4, -0.98);
  g.userData.anim = (t, moving) => {
    legs.forEach((L, i) => { L.rotation.x = moving ? Math.sin(t * 5 + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * 0.4 : 0; });
    body.position.y = moving ? Math.abs(Math.sin(t * 5)) * 0.05 : 0;
    head.rotation.x = moving ? Math.sin(t * 5) * 0.08 : Math.sin(t * 0.8) * 0.1 - 0.1;
    bell.rotation.z = Math.sin(t * (moving ? 8 : 2)) * (moving ? 0.5 : 0.1);
    tail.rotation.z = Math.sin(t * 3) * 0.3;
  };
  return g;
}

// a turtle hatchling, the size of a biscuit (anim(t, moving, home))
export function buildHatchling(r3d, k = 0) {
  const K = kit(r3d), g = new THREE.Group(), body = K.grp(g);
  const shell = K.c(['#6a8a3a', '#7a9a4a', '#5a7a3a', '#8aa84a', '#6a9a5a'][k % 5]), skin = K.c('#a8c878'), eye = K.c('#1e1612');
  K.put(body, K.ball(0.2, 8, 6), shell, 0, 0.14, 0).scale.set(1, 0.6, 1.15);
  K.put(body, K.ball(0.08, 6, 4), skin, 0, 0.14, 0.26);
  for (const s of [-1, 1]) K.put(body, K.box(0.03, 0.03, 0.02), eye, s * 0.04, 0.17, 0.32);
  const fl = [];
  for (const [x, z] of [[-0.18, 0.12], [0.18, 0.12], [-0.15, -0.14], [0.15, -0.14]]) { const f = K.put(body, K.box(0.12, 0.04, 0.08), skin, x, 0.08, z); fl.push(f); }
  g.userData.anim = (t, moving, home) => {
    fl.forEach((f, i) => { f.rotation.y = moving ? Math.sin(t * 14 + i) * 0.6 : 0; });
    body.position.y = home ? -0.08 : moving ? Math.abs(Math.sin(t * 14 + k)) * 0.03 : 0;
    body.rotation.z = moving ? Math.sin(t * 14 + k) * 0.12 : 0;
  };
  return g;
}

// a singing stone of the Old Forum: a carved standing stone, a note cut into it,
// its size its pitch (big = low)
export function buildSingingStone(r3d, size = 1) {
  const K = kit(r3d), g = new THREE.Group();
  const st = K.c('#c8c0a8'), stD = K.c('#a8a088'), weed = K.c('#5a9a5a');
  const h = 1.1 * size;
  K.put(g, K.box(0.9 * size, 0.2, 0.6 * size), stD, 0, 0.1, 0);
  K.put(g, K.box(0.7 * size, h, 0.4 * size), st, 0, 0.2 + h / 2, 0);
  K.put(g, K.box(0.74 * size, 0.14, 0.44 * size), weed, 0, 0.3, 0);
  const glyph = K.noCast(K.put(g, K.box(0.24, 0.34, 0.02), K.glow('#8fd6e8', '#4ab8d0', 0.4), 0, 0.2 + h * 0.6, 0.2 * size + 0.01));
  glyph.material = glyph.material.clone();
  g.userData.anim = (t) => { glyph.material.emissiveIntensity = 0.3 + Math.max(0, Math.sin(t * 1.5 + size * 3)) * 0.4; };
  return g;
}

// the Dauntless Teacup: Captain Wendy's little airship — a striped envelope, a
// gondola shaped like a giant teacup (saucer and all), a propeller, fins
export function buildAirship(r3d) {
  const K = kit(r3d), g = new THREE.Group(), body = K.grp(g);
  const env = K.put(body, K.ball(1, 16, 10), K.c('#f4ead8'), 0, 4.6, 0);
  env.scale.set(1.6, 1.4, 3.2);
  for (const z of [-1.6, 0, 1.6]) K.put(body, K.box(0.12, 2.6, 0.5), K.c('#c8383e'), 0, 4.6, z).scale.set(1, 1, 1);
  for (const s of [-1, 1]) { K.put(body, K.box(0.1, 1.2, 0.9), K.c('#c8383e'), s * 0.9, 4.8, -2.9).rotation.z = s * 0.3; }
  K.put(body, K.box(0.1, 1.3, 0.9), K.c('#c8383e'), 0, 5.6, -2.9);
  for (const [x, z] of [[-0.6, 0.8], [0.6, 0.8], [-0.6, -0.8], [0.6, -0.8]]) K.put(body, K.box(0.04, 2.1, 0.04), K.c('#6a4a34'), x * 0.9, 2.6, z * 0.9);
  const cup = K.grp(body, 0, 1.1, 0);
  K.put(cup, K.cyl(1.2, 0.85, 1.1, 16, true), K.c('#fbf6ec'), 0, 0.3, 0);
  K.put(cup, K.cyl(1.25, 1.25, 0.1, 16), K.c('#8ad0ff'), 0, 0.86, 0);
  K.put(cup, K.cyl(1.5, 1.4, 0.14, 18), K.c('#fbf6ec'), 0, -0.3, 0);
  const handle = K.put(cup, K.cyl(0.36, 0.36, 0.12, 12, true), K.c('#fbf6ec'), 1.35, 0.35, 0, 0, 0, Math.PI / 2);
  void handle;
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; K.put(cup, K.ball(0.1, 5, 4), K.c('#e87a9a'), Math.cos(a) * 1.05, 0.45, Math.sin(a) * 1.05); }
  const prop = K.grp(body, 0, 4.4, -3.3);
  for (const r of [0, Math.PI / 2]) K.put(prop, K.box(0.14, 1.4, 0.06), K.c('#6a4a34'), 0, 0, 0, 0, 0, r);
  g.userData.anim = (t) => { prop.rotation.z = t * 16; body.position.y = Math.sin(t * 1.3) * 0.12; body.rotation.z = Math.sin(t * 0.9) * 0.03; };
  return g;
}

// the great Sunken Bell: bronze, green with age, on a frame of stone posts
export function buildSunkenBell(r3d) {
  const K = kit(r3d), g = new THREE.Group();
  const stone = K.c('#d0c4a8'), bronze = K.glow('#b88a3a', '#6a4a1a', 0.25), verd = K.c('#5a9a86');
  for (const s of [-1, 1]) K.put(g, K.box(0.7, 4.6, 0.7), stone, s * 2.1, 2.3, 0);
  K.put(g, K.box(5, 0.6, 0.8), stone, 0, 4.7, 0);
  const bell = K.grp(g, 0, 4.4, 0);
  K.put(bell, K.cyl(0.7, 1.55, 2.3, 16), bronze, 0, -1.25, 0);
  K.put(bell, K.cyl(1.6, 1.6, 0.18, 16), verd, 0, -2.4, 0);
  K.put(bell, K.cyl(0.5, 0.7, 0.3, 12), verd, 0, -0.1, 0);
  const clapper = K.grp(bell, 0, -0.6, 0);
  K.put(clapper, K.box(0.12, 1.5, 0.12), K.c('#4a3a2a'), 0, -0.7, 0);
  K.put(clapper, K.ball(0.28, 8, 6), K.c('#6a5a4a'), 0, -1.5, 0);
  clapper.visible = false;
  g.userData = { bell, clapper, swing: 0 };
  g.userData.anim = (t, dt) => { const u = g.userData; u.swing = Math.max(0, u.swing - (dt || 0.016) * 0.5); bell.rotation.z = Math.sin(t * 5) * 0.22 * u.swing; clapper.rotation.z = -Math.sin(t * 5) * 0.3 * u.swing; };
  return g;
}

// ---- chapter 6: Fire & Fins
// the Understudies' swan pedalo: a white swan with a long proud neck, a bench for
// three, paddle wheels at the sides
export function buildSwanPedalo(r3d) {
  const K = kit(r3d), g = new THREE.Group(), body = K.grp(g);
  const white = K.c('#fbf6ec'), whiteD = K.c('#e0d8cc'), beak = K.c('#f2a03d'), dark = K.c('#2a2433');
  K.put(body, K.ball(1, 12, 8), white, 0, 0.35, 0).scale.set(0.95, 0.45, 1.5);
  for (const s of [-1, 1]) { const w = K.put(body, K.ball(0.6, 8, 6), whiteD, s * 0.75, 0.6, -0.2); w.scale.set(0.35, 0.5, 1.1); }
  const neck = K.grp(body, 0, 0.6, 1.1);
  K.put(neck, K.cyl(0.16, 0.22, 1.2, 8), white, 0, 0.55, 0.1).rotation.x = -0.25;
  K.put(neck, K.ball(0.26, 8, 6), white, 0, 1.2, 0.3);
  K.put(neck, K.cone(0.1, 0.34, 6), beak, 0, 1.18, 0.62).rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) K.put(neck, K.box(0.05, 0.06, 0.05), dark, s * 0.14, 1.26, 0.46);
  K.put(body, K.box(1.1, 0.14, 0.5), K.c('#8a5a3a'), 0, 0.72, -0.3);
  const wheels = [];
  for (const s of [-1, 1]) { const wh = K.grp(body, s * 1.0, 0.35, -0.2); for (let i = 0; i < 4; i++) K.put(wh, K.box(0.06, 0.7, 0.14), K.c('#c8383e'), 0, 0, 0, 0, i * Math.PI / 4); wheels.push(wh); }
  g.userData.anim = (t, moving = true) => { wheels.forEach((w) => { w.rotation.x = t * (moving ? 6 : 1); }); body.position.y = Math.sin(t * 2) * 0.05; neck.rotation.x = Math.sin(t * 1.3) * 0.06; };
  return g;
}

// the Dauntless Teacup's envelope, torn and draped over the jungle canopy
export function buildTornEnvelope(r3d) {
  const K = kit(r3d), g = new THREE.Group();
  const cloth = K.c('#f4ead8'), clothD = K.c('#d8ccb4'), red = K.c('#c8383e');
  const e = K.put(g, K.ball(1, 12, 8), cloth, 0, 1.2, 0); e.scale.set(2.6, 0.9, 1.6); e.rotation.z = 0.25;
  const f = K.put(g, K.ball(1, 10, 6), clothD, 1.8, 0.7, 0.4); f.scale.set(1.2, 0.5, 1.0);
  for (const z of [-0.9, 0, 0.9]) K.put(g, K.box(0.1, 0.5, 1.3), red, z * 1.2, 1.6 - Math.abs(z) * 0.3, 0).rotation.z = 0.25;
  K.put(g, K.box(0.9, 0.06, 0.5), K.c('#1e1624'), -0.6, 1.95, 0.6).rotation.z = 0.3;
  return g;
}

// a jar with a flame in it (the marsh's Great Hearth, taken as a stage prop)
export function buildFlameJar(r3d) {
  const K = kit(r3d), g = new THREE.Group();
  const glass = K.c('#e8f4f8');
  const jar = K.put(g, K.cyl(0.32, 0.36, 0.7, 12), glass, 0, 0.36, 0);
  jar.material = jar.material.clone(); jar.material.transparent = true; jar.material.opacity = 0.35; jar.material.depthWrite = false;
  K.put(g, K.cyl(0.26, 0.3, 0.1, 12), K.c('#5a3a2a'), 0, 0.76, 0);
  const fl = K.noCast(K.put(g, K.cone(0.14, 0.42, 7), K.glow('#ffe08a', '#ff9a4a', 1.6), 0, 0.34, 0));
  g.userData.anim = (t) => { fl.scale.y = 1 + Math.sin(t * 11) * 0.15; fl.rotation.y = t * 2; };
  return g;
}
