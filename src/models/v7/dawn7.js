// World v7, chapter 7 — the Dawnlands’ props: the Teacup’s mooring mast, Lanternport’s
// street lamps, gloom barnacles, the monks’ Dawn Kites, sky lanterns for the festival,
// and the whale’s spout.

import { kit, THREE } from './kit.js';

// a mooring mast for the Dauntless Teacup: a timber lattice tower, a ladder, a
// platform with a brass mooring ring, a windsock and a lamp
export function buildMast(r3d) {
  const K = kit(r3d), g = new THREE.Group();
  const wood = K.c('#7a5236'), woodD = K.c('#5a3a24'), brass = K.glow('#e0b050', '#a87a2a', 0.3), rope = K.c('#e8dcb8');
  const H = 5.2;
  for (const [x, z] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) K.beam(g, wood, x, 0, z, x * 0.45, H, z * 0.45, 0.16);
  for (let k = 0; k < 4; k++) {
    const y0 = 0.4 + k * 1.2, y1 = y0 + 1.2, s0 = 0.8 - (y0 / H) * 0.44, s1 = 0.8 - (y1 / H) * 0.44;
    for (const [ax, az, bx, bz] of [[-1, 1, 1, 1], [1, 1, 1, -1], [1, -1, -1, -1], [-1, -1, -1, 1]]) K.beam(g, woodD, ax * s0, y0, az * s0, bx * s1, y1, bz * s1, 0.07);
  }
  // (the ladder up the side facing the camera)
  for (const s of [-1, 1]) K.beam(g, woodD, s * 0.22, 0, 0.95, s * 0.22, H, 0.5, 0.06);
  for (let k = 0; k < 11; k++) { const y = 0.3 + k * 0.45, z = 0.95 - (y / H) * 0.45; K.put(g, K.box(0.5, 0.05, 0.05), woodD, 0, y, z); }
  K.put(g, K.box(1.3, 0.14, 1.3), wood, 0, H, 0);
  for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) K.put(g, K.box(0.06, 0.5, 0.06), woodD, x, H + 0.3, z);
  const ring = K.put(g, K.cyl(0.36, 0.36, 0.08, 14), brass, 0, H + 0.62, 0, 0, Math.PI / 2);
  void ring;
  K.put(g, K.box(0.06, 0.7, 0.06), woodD, 0, H + 0.35, 0);
  // a windsock on a pole
  K.put(g, K.box(0.05, 1.2, 0.05), woodD, 0.6, H + 0.6, -0.6);
  const sock = K.grp(g, 0.6, H + 1.1, -0.6);
  for (let i = 0; i < 4; i++) K.put(sock, K.cyl(0.14 - i * 0.02, 0.12 - i * 0.02, 0.24, 8), i % 2 ? K.c('#f4efe4') : K.c('#e0483a'), 0.14 + i * 0.22, 0, 0, 0, 0, Math.PI / 2);
  const lamp = K.noCast(K.put(g, K.box(0.2, 0.26, 0.2), K.glow('#fff0c0', '#ffb347', 1.1), -0.6, H + 0.35, 0.6));
  void lamp;
  // (coils of rope at the foot)
  K.put(g, K.cyl(0.3, 0.3, 0.16, 10), rope, 1.1, 0.08, 0.6);
  g.userData.anim = (t) => { sock.rotation.y = Math.sin(t * 0.8) * 0.4; sock.rotation.z = Math.sin(t * 2.3) * 0.08; };
  return g;
}

// one of Lanternport’s street lamps: a black post, a crossbar, a red paper lantern
// hanging from it — dark until it’s relit
export function buildStreetLamp(r3d) {
  const K = kit(r3d), g = new THREE.Group();
  const iron = K.c('#2a2430'), gold = K.c('#e0a840');
  K.put(g, K.cyl(0.08, 0.12, 2.5, 6), iron, 0, 1.25, 0);
  K.put(g, K.cyl(0.22, 0.26, 0.2, 8), iron, 0, 0.1, 0);
  K.put(g, K.box(0.7, 0.07, 0.07), iron, 0.28, 2.42, 0);
  const hang = K.grp(g, 0.56, 2.38, 0);
  K.put(hang, K.box(0.02, 0.18, 0.02), iron, 0, -0.09, 0);
  const on = K.glow('#ff7a4a', '#ff8a4a', 1.2), off = K.c('#6a3a3a');
  const body = K.noCast(K.put(hang, K.ball(0.24, 10, 8), off, 0, -0.42, 0));
  body.scale.set(1, 1.25, 1);
  for (const y of [-0.13, -0.71]) K.put(hang, K.cyl(0.12, 0.12, 0.06, 8), iron, 0, y, 0);
  K.put(hang, K.box(0.03, 0.2, 0.03), gold, 0, -0.84, 0);
  // (a flame inside, seen through the paper)
  const flame = K.noCast(K.put(hang, K.cone(0.06, 0.16, 6), K.glow('#fff4c0', '#ffd66b', 2), 0, -0.44, 0));
  flame.visible = false;
  g.userData.setLit = (lit) => { body.material = lit ? on : off; flame.visible = lit; };
  g.userData.anim = (t, lit) => { hang.rotation.z = Math.sin(t * 1.4) * 0.05; if (lit) flame.scale.y = 0.85 + Math.sin(t * 13) * 0.15; };
  return g;
}

// a gloom barnacle: a stubby violet cone with a ring of plates, a slit that glows
export function buildBarnacle(r3d) {
  const K = kit(r3d), g = new THREE.Group();
  const shell = K.c('#6a5a7a'), shellL = K.c('#8a7a9a'), dark = K.c('#241a2e'), eye = K.glow('#e8d0ff', '#b07aff', 1.4);
  K.put(g, K.cyl(0.24, 0.42, 0.5, 7), shell, 0, 0.25, 0);
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; K.put(g, K.box(0.12, 0.36, 0.1), shellL, Math.cos(a) * 0.3, 0.24, Math.sin(a) * 0.3, -a).rotation.x = 0.25; }
  K.put(g, K.cyl(0.2, 0.24, 0.08, 7), dark, 0, 0.52, 0);
  const eyes = K.grp(g, 0, 0.36, 0.3);
  for (const s of [-1, 1]) K.noCast(K.put(eyes, K.box(0.1, 0.05, 0.03), eye, s * 0.09, 0, 0)).rotation.z = s * 0.3;
  const tuft = K.grp(g, 0, 0.56, 0);
  for (let i = 0; i < 3; i++) K.put(tuft, K.box(0.03, 0.2, 0.03), K.c('#a86ae0'), (i - 1) * 0.06, 0.1, 0).rotation.z = (i - 1) * 0.4;
  g.userData.anim = (t, state) => { tuft.rotation.y = t * 3; eyes.scale.y = state === 'hit' ? 0.2 : 1 + Math.sin(t * 9) * 0.2; };
  return g;
}

// a Dawn Kite: a paper carp with a gold fin and streamers in the flier’s colour
export function buildKite(r3d, color = '#ec5f73') {
  const K = kit(r3d), g = new THREE.Group();
  const paper = K.c('#f4ecd8'), ink = K.c('#2a2433'), gold = K.glow('#f2c14e', '#c89020', 0.2), col = K.c(color);
  const body = K.grp(g);
  const b = K.put(body, K.box(0.9, 0.5, 0.05), paper, 0, 0, 0); b.rotation.z = 0;
  K.put(body, K.box(0.3, 0.5, 0.06), col, -0.3, 0, 0.01);
  for (const s of [-1, 1]) K.put(body, K.box(0.14, 0.14, 0.06), ink, 0.3, s * 0.1, 0.02);
  const tail = K.put(body, K.cone(0.3, 0.5, 4), col, -0.66, 0, 0, 0, 0, Math.PI / 2);
  void tail;
  const fin = K.put(body, K.box(0.3, 0.2, 0.05), gold, 0, 0.32, 0); fin.rotation.z = -0.3;
  K.put(body, K.box(0.9, 0.04, 0.04), K.c('#8a6a4a'), 0, 0, 0.04);
  const streamers = [];
  for (let i = 0; i < 3; i++) { const s = K.grp(body, -0.8, -0.1 - i * 0.08, 0); K.put(s, K.box(0.5, 0.05, 0.02), i % 2 ? gold : col, -0.25, 0, 0); streamers.push(s); }
  const halo = K.noCast(K.put(g, K.ball(0.9, 10, 8), K.light('#ffe08a', 0.18), 0, 0, 0));
  halo.visible = false;
  g.userData.anim = (t, up) => {
    body.rotation.z = Math.sin(t * 2.1) * 0.12;
    streamers.forEach((s, i) => { s.rotation.z = Math.sin(t * 5 + i) * 0.35; });
    halo.visible = !!up; if (up) halo.scale.setScalar(1 + Math.sin(t * 4) * 0.08);
  };
  return g;
}

// a sky lantern: a paper bag with a flame under it (the Lantern Festival)
export function buildSkyLantern(r3d, tint = '#ffcf7a') {
  const K = kit(r3d), g = new THREE.Group();
  K.noCast(K.put(g, K.cyl(0.24, 0.17, 0.46, 8), K.glow(tint, '#ff8a3a', 0.75), 0, 0.23, 0));
  K.noCast(K.put(g, K.cyl(0.25, 0.25, 0.04, 8), K.glow('#f4d8a0', '#ffb070', 0.5), 0, 0.46, 0));
  K.noCast(K.put(g, K.cone(0.06, 0.12, 5), K.glow('#fff4c0', '#ffd66b', 2.2), 0, 0.02, 0));
  return g;
}

// the whale’s spout: a column of water with a crown of spray (grows with userData.k)
export function buildSpout(r3d) {
  const K = kit(r3d), g = new THREE.Group();
  const water = K.c('#cfeaf8').clone(), foam = K.c('#ffffff');
  water.transparent = true; water.opacity = 0.82; water.depthWrite = false;
  const col = K.noCast(K.put(g, K.cyl(0.8, 1.1, 1, 12), water, 0, 0.5, 0));
  const crown = K.grp(g, 0, 1, 0);
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; K.noCast(K.put(crown, K.ball(0.5, 6, 5), i % 2 ? foam : water, Math.cos(a) * 0.9, 0, Math.sin(a) * 0.9)); }
  g.userData.k = 0;
  g.userData.anim = (t) => {
    const k = g.userData.k || 0;
    g.visible = k > 0.01;
    col.scale.set(1 + Math.sin(t * 20) * 0.05, Math.max(0.01, k * 14), 1 + Math.cos(t * 17) * 0.05);
    col.position.y = k * 7;
    crown.position.y = k * 14; crown.rotation.y = t * 2;
    crown.scale.setScalar(0.6 + k * 0.8 + Math.sin(t * 12) * 0.08);
  };
  return g;
}
