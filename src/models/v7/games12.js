// The new mini-games’ props (saga/games12.js): the fairground range — its rail, the boards that
// swing up beyond it, what is thrown —, the pen the fluffhorns are driven into, Buttercup at the
// end of her rope, Granny Mochi’s dango stall and its crates.

import { kit, THREE } from './kit.js';
import { buildFurniture } from '../furniture.js';

// ------------------------------------------------------------------ the range
// the rail the throwers stand behind: posts and two logs, w tiles wide (along x)
export function buildRangeRail(r3d, w = 9) {
  const K = kit(r3d), g = new THREE.Group(), wood = K.c('#8a5a3a'), woodL = K.c('#b07b50');
  const n = Math.max(2, Math.round(w / 1.5));
  for (let i = 0; i <= n; i++) K.put(g, K.box(0.16, 0.78, 0.16), wood, -w / 2 + (i * w) / n, 0.39, 0);
  K.put(g, K.box(w + 0.3, 0.1, 0.12), woodL, 0, 0.7, 0);
  K.put(g, K.box(w + 0.3, 0.08, 0.1), woodL, 0, 0.4, 0);
  return g;
}

// behind the last row: straw bales to stop what flies, two masts and a string of pennants
export function buildRangeBack(r3d, w = 9) {
  const K = kit(r3d), g = new THREE.Group(), wood = K.c('#8a5a3a'), straw = K.c('#e0bc5a'), strawD = K.c('#c89a3c');
  const n = Math.max(3, Math.round(w / 1.3));
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + ((i + 0.5) * w) / n;
    K.put(g, K.box(1.1, 0.55, 0.6), i % 2 ? straw : strawD, x, 0.28, 0, (i % 3 - 1) * 0.08);
    if (i % 2 === 0) K.put(g, K.box(1.0, 0.5, 0.56), straw, x + 0.3, 0.8, 0, 0.12);
  }
  for (const s of [-1, 1]) K.put(g, K.box(0.14, 2.7, 0.14), wood, s * (w / 2 + 0.3), 1.35, 0.1);
  const cols = ['#ec5f73', '#f2c14e', '#8fd6b4', '#b9a2e3'], m = Math.round(w * 1.6), flags = [];
  let px = -w / 2 - 0.3, py = 2.6;
  for (let i = 0; i <= m; i++) {
    const u = i / m, x = -w / 2 - 0.3 + u * (w + 0.6), y = 2.6 - Math.sin(u * Math.PI) * 0.55;
    if (i) K.beam(g, wood, px, py, 0.1, x, y, 0.1, 0.03);
    if (i && i < m) flags.push(K.noCast(K.put(g, K.box(0.2, 0.2, 0.02), K.c(cols[i % 4]), x, y - 0.16, 0.1, 0, 0, Math.PI / 4)));
    px = x; py = y;
  }
  g.userData.anim = (t) => { flags.forEach((f, i) => { f.rotation.x = Math.sin(t * 3 + i * 0.7) * 0.25; }); };
  return g;
}

// a board on a hinge: a gloom’s face (`foe`), a golden one with a crown (`gold`), or a friend’s
// (`friend`: a hen, a camel…) — userData.set(k): 0 lying back in the grass, 1 standing
export function buildRangeBoard(r3d, kind = 'foe', friend = 'hen') {
  const K = kit(r3d), g = new THREE.Group(), arm = K.grp(g, 0, 0.08, 0);
  K.put(g, K.box(0.56, 0.1, 0.22), K.c('#6a4a30'), 0, 0.05, 0);
  K.put(arm, K.box(0.1, 0.5, 0.06), K.c('#8a5a3a'), 0, 0.25, -0.02);
  const face = K.grp(arm, 0, 0.9, 0);
  const disc = (r, mat, x = 0, y = 0, z = 0, d = 0.06) => K.put(face, K.cyl(r, r, d, 16), mat, x, y, z, 0, Math.PI / 2);
  const dark = K.c('#241a2e');
  if (kind === 'friend' && friend === 'camel') {
    const fur = K.c('#d8a86a'), furD = K.c('#b8884a');
    disc(0.47, furD, 0, 0, -0.02); disc(0.42, fur);
    K.put(face, K.box(0.34, 0.26, 0.1), furD, 0, -0.16, 0.05);
    for (const s of [-1, 1]) { K.put(face, K.box(0.07, 0.09, 0.04), dark, s * 0.16, 0.1, 0.04); K.put(face, K.box(0.12, 0.2, 0.06), fur, s * 0.3, 0.4, 0); K.put(face, K.box(0.05, 0.04, 0.04), dark, s * 0.07, -0.16, 0.1); }
    K.put(face, K.box(0.4, 0.07, 0.03), K.c('#c8383e'), 0, 0.3, 0.04);
  } else if (kind === 'friend') {
    const white = K.c('#fbf6ec'), red = K.c('#e0483a');
    disc(0.47, K.c('#d9ccb0'), 0, 0, -0.02); disc(0.42, white);
    for (let i = -1; i <= 1; i++) K.put(face, K.box(0.12, 0.16 - Math.abs(i) * 0.04, 0.06), red, i * 0.11, 0.46, 0);
    K.put(face, K.cone(0.09, 0.2, 4), K.c('#f2a03a'), 0, -0.02, 0.12, 0, Math.PI / 2);
    K.put(face, K.box(0.1, 0.14, 0.04), red, 0, -0.2, 0.05);
    for (const s of [-1, 1]) K.put(face, K.box(0.07, 0.08, 0.04), dark, s * 0.16, 0.1, 0.04);
  } else {
    const gold = kind === 'gold';
    disc(0.48, gold ? K.c('#b07818') : K.c('#3a2a4a'), 0, 0, -0.02);
    disc(0.43, gold ? K.glow('#f6cf5a', '#c89020', 0.55) : K.c('#7a5aa8'));
    const eye = gold ? K.glow('#fffbe0', '#fff3a6', 1.2) : K.glow('#f4eaff', '#c9a2f0', 1.3);
    for (const s of [-1, 1]) K.noCast(K.put(face, K.box(0.14, 0.08, 0.04), eye, s * 0.16, 0.08, 0.04, 0, 0, -s * 0.45));
    K.put(face, K.box(0.24, 0.06, 0.04), dark, 0, -0.17, 0.04);
    for (const s of [-1, 1]) K.put(face, K.box(0.06, 0.07, 0.04), gold ? K.c('#fffbe0') : K.c('#f4eaff'), s * 0.07, -0.13, 0.05);
    // (a gloomling’s two horns — or a crown)
    if (gold) for (let i = -1; i <= 1; i++) K.noCast(K.put(face, K.cone(0.08, 0.22, 4), K.glow('#fff3a6', '#f2c14e', 0.9), i * 0.16, 0.52, 0));
    else for (const s of [-1, 1]) K.put(face, K.cone(0.09, 0.24, 5), K.c('#5a3f86'), s * 0.26, 0.44, 0, 0, 0, -s * 0.5);
  }
  g.userData.set = (k) => { arm.rotation.x = -(1 - k) * 1.52; };
  g.userData.spin = (a) => { face.rotation.z = a; };
  g.userData.set(0);
  return g;
}

// what is thrown: a little sack of flour, a coconut, a snowball
export function buildRangeShot(r3d, kind = 'sack') {
  const K = kit(r3d), g = new THREE.Group();
  if (kind === 'coconut') { K.put(g, K.ball(0.15, 8, 6), K.c('#7a5234'), 0, 0, 0); K.put(g, K.ball(0.05, 5, 4), K.c('#3b2a2e'), 0.06, 0.05, 0.11); }
  else if (kind === 'snow') K.put(g, K.ball(0.14, 8, 6), K.c('#ffffff'), 0, 0, 0);
  else { K.put(g, K.box(0.2, 0.2, 0.18), K.c('#f4ecd8'), 0, 0, 0); K.put(g, K.box(0.12, 0.08, 0.1), K.c('#d9ccb0'), 0, 0.13, 0); K.put(g, K.box(0.22, 0.04, 0.2), K.c('#c8383e'), 0, 0.08, 0); }
  return g;
}

// ------------------------------------------------------------------ the pen
// a round pen of posts and rails, straw underfoot, open on one side (`gate`: the angle its
// opening looks at, `half`: half its width) — userData.cols: what stops a hero, around (0, 0)
export function buildPen(r3d, R = 2.4, gate = Math.PI, half = 0.6) {
  const K = kit(r3d), g = new THREE.Group(), wood = K.c('#8a5a3a'), woodL = K.c('#b07b50');
  K.noCast(K.put(g, K.cyl(R - 0.15, R - 0.15, 0.04, 24), K.c('#e0bc5a'), 0, 0.02, 0));
  for (let i = 0; i < 16; i++) { const a = i * 2.4, d = (i % 5) * 0.4; K.noCast(K.put(g, K.box(0.3, 0.03, 0.06), K.c('#c89a3c'), Math.cos(a) * d, 0.05, Math.sin(a) * d, a)); }
  const N = 14, cols = [], pts = [];
  for (let i = 0; i < N; i++) { const a = gate + half + (i / (N - 1)) * (Math.PI * 2 - half * 2); pts.push([Math.cos(a) * R, Math.sin(a) * R]); }
  const flags = [];
  pts.forEach(([x, z], i) => {
    const end = i === 0 || i === N - 1;
    K.put(g, K.box(0.16, end ? 1.7 : 0.8, 0.16), wood, x, end ? 0.85 : 0.4, z);
    cols.push({ x, z, r: 0.3 });
    if (end) flags.push(K.noCast(K.put(g, K.box(0.4, 0.26, 0.03), K.c('#ffd23a'), x + 0.26, 1.5, z)));
    if (!i) return;
    const [px, pz] = pts[i - 1];
    K.beam(g, woodL, px, 0.62, pz, x, 0.62, z, 0.09);
    K.beam(g, woodL, px, 0.34, pz, x, 0.34, z, 0.08);
    cols.push({ x: (x + px) / 2, z: (z + pz) / 2, r: 0.3 });
  });
  g.userData.cols = cols;
  g.userData.anim = (t) => { flags.forEach((f, i) => { f.rotation.y = Math.sin(t * 3 + i) * 0.3; }); };
  return g;
}

// a golden one of the herd: its wool shines (every mesh gets a gilded twin of its material)
export function gild(r3d, obj) {
  const K = kit(r3d), gold = K.glow('#f6cf5a', '#c89020', 0.6), goldD = K.glow('#e0a526', '#a07818', 0.5);
  obj.traverse((m) => { if (m.isMesh && m.material && m.material.color) { const c = m.material.color; if (c.r > 0.8 && c.g > 0.75) m.material = c.b > 0.8 ? gold : goldD; } });
  return obj;
}

// ------------------------------------------------------------------ the rope’s other end
// Buttercup, Bram’s cow, with a bell: she looks along +x (userData.anim(t, mode): ’pull’ — she
// leans back —, ’dig’ — all four hooves in the ground —, ’won’ — hers —, ’lost’)
export function buildButtercup(r3d) {
  const K = kit(r3d), g = new THREE.Group(), body = K.grp(g), res = buildFurniture(r3d, { type: 'cow', x: 0, z: 0, color: '#fbf1dc', seed: 3 });
  res.obj.position.set(0, 0, 0); body.add(res.obj); body.scale.setScalar(1.3);
  K.put(body, K.box(0.14, 0.16, 0.14), K.glow('#f2c14e', '#c89020', 0.3), 0.74, 0.62, 0);
  for (const [dx, dz] of [[0, 0.07], [0, -0.07], [0.07, 0], [-0.07, 0]]) K.put(body, K.box(0.08, 0.03, 0.08), K.c('#fff7e6'), 0.7 + dx, 1.2, 0.2 + dz);
  K.put(body, K.box(0.06, 0.05, 0.06), K.c('#ffd23a'), 0.7, 1.22, 0.2);
  g.userData.anim = (t, mode) => {
    res.anim(mode === 'dig' ? 0 : t);
    body.rotation.z = mode === 'dig' ? 0.2 + Math.sin(t * 34) * 0.015 : mode === 'pull' ? 0.07 + Math.sin(t * 9) * 0.02 : mode === 'lost' ? -0.14 : 0;
    body.position.y = mode === 'won' ? Math.abs(Math.sin(t * 7)) * 0.22 : 0;
    body.position.x = mode === 'dig' ? Math.sin(t * 40) * 0.015 : 0;
  };
  return g;
}

// ------------------------------------------------------------------ for the nets
// a lantern bug of the Deepwood: a dark little body one sees by day, a bulb that lights up
// (userData.glow(0..1), as the fireflies of autumn8.js have)
export function buildLanternBug(r3d) {
  const K = kit(r3d), g = new THREE.Group(), wings = [];
  K.noCast(K.put(g, K.ball(0.09, 6, 5), K.c('#3b2a2e'), 0, 0.05, 0.08));
  const bulb = K.noCast(K.put(g, K.ball(0.13, 8, 6), K.glow('#ffe89a', '#ffc040', 1.4), 0, 0, -0.08));
  bulb.material = bulb.material.clone();
  const halo = K.noCast(K.put(g, K.ball(0.4, 8, 6), K.light('#ffe08a', 0.3), 0, 0, -0.08));
  halo.material = halo.material.clone();
  for (const s of [-1, 1]) wings.push(K.noCast(K.put(g, K.box(0.2, 0.02, 0.12), K.c('#f4efe4'), s * 0.14, 0.12, 0.04)));
  g.userData.glow = (k) => {
    bulb.material.emissiveIntensity = 0.1 + k * 1.9; bulb.material.color.set(k > 0.5 ? '#fff3a6' : '#8a6a3a'); bulb.scale.setScalar(0.8 + k * 0.45);
    halo.material.opacity = k * 0.4; halo.scale.setScalar(0.7 + k * 0.5);
    const f = Math.sin(performance.now() / 28) * 0.7; wings[0].rotation.z = f; wings[1].rotation.z = -f;
  };
  return g;
}

// ------------------------------------------------------------------ Granny Mochi’s dango
export const DANGO = ['#f4a4b6', '#fbf6ec', '#9ad08a'];

export function buildDango(r3d, color, r = 0.2) {
  const K = kit(r3d), g = new THREE.Group();
  K.put(g, K.ball(r, 10, 8), K.c(color), 0, 0, 0);
  K.noCast(K.put(g, K.ball(r * 0.3, 6, 4), K.c('#ffffff'), -r * 0.4, r * 0.45, r * 0.5));
  return g;
}

// a crate heaped with dango of one colour, a pennant of that colour over it
export function buildDangoCrate(r3d, color) {
  const K = kit(r3d), g = new THREE.Group(), wood = K.c('#a8784a'), woodD = K.c('#6a4a30');
  K.put(g, K.box(0.95, 0.5, 0.8), wood, 0, 0.25, 0);
  for (const z of [-0.41, 0.41]) K.put(g, K.box(1.0, 0.1, 0.03), woodD, 0, 0.36, z);
  for (const [x, y, z] of [[-0.26, 0.56, -0.16], [0.02, 0.56, -0.18], [0.28, 0.56, -0.14], [-0.14, 0.56, 0.14], [0.16, 0.56, 0.16], [-0.06, 0.78, -0.04], [0.18, 0.78, 0]]) { const b = buildDango(r3d, color, 0.18); b.position.set(x, y, z); g.add(b); }
  K.put(g, K.box(0.06, 1.3, 0.06), woodD, -0.5, 0.65, -0.36);
  const flag = K.noCast(K.put(g, K.box(0.42, 0.3, 0.03), K.c(color), -0.26, 1.14, -0.36));
  K.noCast(K.put(g, K.box(0.46, 0.34, 0.02), K.c('#3b2a2e'), -0.26, 1.14, -0.38));
  g.userData.anim = (t) => { flag.rotation.y = Math.sin(t * 2.6) * 0.18; };
  return g;
}

// the stall: a counter under a striped awning, a skewer on its stand — userData.show(colours)
// threads that many dango on it
export function buildDangoStall(r3d, max = 5) {
  const K = kit(r3d), g = new THREE.Group(), wood = K.c('#a8784a'), woodD = K.c('#6a4a30');
  K.put(g, K.box(2.3, 0.12, 1.0), wood, 0, 0.78, 0);
  K.put(g, K.box(2.2, 0.66, 0.9), K.c('#c8383e'), 0, 0.4, 0);
  for (let i = -3; i <= 3; i++) if (i % 2) K.noCast(K.put(g, K.box(0.3, 0.66, 0.02), K.c('#fbf6ec'), i * 0.31, 0.4, 0.46));
  for (const s of [-1, 1]) K.put(g, K.box(0.1, 2.3, 0.1), woodD, s * 1.1, 1.15, -0.45);
  for (let i = 0; i < 6; i++) K.put(g, K.box(0.4, 0.06, 0.7), i % 2 ? K.c('#fbf6ec') : K.c('#c8383e'), -1 + i * 0.4, 2.32, -0.2).rotation.x = 0.35;
  // the stand and its stick
  for (const s of [-1, 1]) K.put(g, K.box(0.06, 0.3, 0.06), woodD, s * 0.95, 0.98, 0.1);
  K.put(g, K.box(2.0, 0.035, 0.035), K.c('#e8d6b4'), 0, 1.14, 0.1);
  const balls = [];
  for (let i = 0; i < max; i++) balls.push(K.grp(g, 0, 1.14, 0.1));
  g.userData.show = (cols, len = max) => {
    const n = cols.length;
    balls.forEach((b, i) => {
      while (b.children.length) b.remove(b.children[0]);
      b.visible = i < n;
      if (i < n) { b.add(buildDango(r3d, cols[i], 0.19)); b.position.x = (i - (len - 1) / 2) * 0.4; }
    });
  };
  return g;
}
