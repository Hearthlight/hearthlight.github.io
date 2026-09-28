// World v7, chapter 9 — Hollowmoor, Prism Springs, Cogsworth and the Aurora Tundra’s
// props: the manor’s front, the Lantern Cannon, Master Tock’s workshop, the runaway cuckoo,
// an aurora in the sky.

import { kit, THREE } from './kit.js';

// Hollowmoor Manor’s front: a tall grey house, gables, dark windows (one lit), a porch
export function buildManorFacade(r3d) {
  const K = kit(r3d), g = new THREE.Group();
  const stone = K.tex('manorstone', 16, 16, (p) => { p.rect(0, 0, 16, 16, '#6a6870'); for (let y = 0; y < 16; y += 4) { p.rect(0, y, 16, 1, '#4a4850'); for (let x = (y / 4) % 2 ? 0 : 5; x < 16; x += 10) p.rect(x, y, 1, 4, '#4a4850'); } p.px(3, 2, '#7a7880'); p.px(12, 9, '#5a5860'); }, { rx: 5, ry: 2 });
  const roof = K.c('#3a3444'), trim = K.c('#2a2430'), dark = K.c('#1a1820'), lit = K.glow('#ffd890', '#ffb060', 1.2);
  K.put(g, K.box(9, 5, 4), stone, 0, 2.5, 0);
  for (const x of [-3, 3]) { K.put(g, K.box(2.6, 1.8, 4.2), stone, x, 5.9, 0); const r0 = K.put(g, K.cone(2, 1.8, 4), roof, x, 7.7, 0, Math.PI / 4); r0.scale.set(1, 1, 1.5); }
  K.put(g, K.box(9.4, 0.3, 4.4), trim, 0, 5.1, 0);
  const rf = K.put(g, K.cone(4.2, 2.2, 4), roof, 0, 6.2, 0, Math.PI / 4); rf.scale.set(1.35, 1, 0.8);
  for (const x of [-3.4, -1.7, 1.7, 3.4]) for (const y of [1.6, 3.6]) {
    K.put(g, K.box(0.8, 1.1, 0.1), trim, x, y, 2.02);
    K.put(g, K.box(0.62, 0.92, 0.08), x === 1.7 && y === 3.6 ? lit : dark, x, y, 2.06);
  }
  // the porch and its door
  K.put(g, K.box(2.4, 0.3, 1.4), K.c('#5a5860'), 0, 0.15, 2.6);
  for (const x of [-1, 1]) K.put(g, K.box(0.2, 2.4, 0.2), trim, x, 1.35, 3.1);
  K.put(g, K.box(2.6, 0.2, 1.6), roof, 0, 2.6, 2.7);
  K.put(g, K.box(1.2, 2, 0.12), K.c('#2a1a14'), 0, 1.1, 2.04);
  K.put(g, K.ball(0.06, 5, 4), K.glow('#e0b050', '#a87a2a', 0.4), 0.4, 1.1, 2.12);
  // (a dead tree beside it, for company)
  const tr = K.grp(g, -5.6, 0, 2.2);
  K.put(tr, K.cyl(0.18, 0.28, 3, 6), K.c('#3a3030'), 0, 1.5, 0);
  for (const [a, h] of [[0.6, 2.4], [-0.8, 2.8], [2.2, 2.2]]) K.beam(tr, K.c('#3a3030'), 0, h, 0, Math.cos(a) * 1.2, h + 0.9, Math.sin(a) * 0.6, 0.1);
  return g;
}

// the Lantern Cannon: a brass barrel on a wheeled carriage, a lantern for a breech, gauges
// (userData.anim(t, charge 0..1): the lantern brightens, the gauges climb)
export function buildLanternCannon(r3d) {
  const K = kit(r3d), g = new THREE.Group();
  const brass = K.glow('#d8a84a', '#8a6a2a', 0.25), brassD = K.c('#8a6a2a'), wood = K.c('#5a3a24'), iron = K.c('#2a2430');
  K.put(g, K.box(1.6, 0.3, 1.1), wood, 0, 0.55, 0);
  for (const s of [-1, 1]) {
    const w = K.put(g, K.cyl(0.55, 0.55, 0.14, 12), wood, s * 0.9, 0.55, 0, 0, 0, Math.PI / 2);
    void w; K.put(g, K.cyl(0.1, 0.1, 0.18, 8), brass, s * 0.95, 0.55, 0, 0, 0, Math.PI / 2);
  }
  const barrel = K.grp(g, 0, 1.0, 0);
  barrel.rotation.x = -0.5;
  K.put(barrel, K.cyl(0.32, 0.42, 2.2, 12), brass, 0, 0, 1.0, 0, Math.PI / 2);
  for (const z of [0.3, 1.1, 1.9]) K.put(barrel, K.cyl(0.46, 0.46, 0.12, 12), brassD, 0, 0, z, 0, Math.PI / 2);
  // (the breech: a lantern in a brass cage)
  const breech = K.grp(barrel, 0, 0, -0.3);
  K.put(breech, K.box(0.7, 0.7, 0.7), iron, 0, 0, 0).scale.set(1, 1, 0.1);
  const glass = K.noCast(K.put(breech, K.ball(0.34, 10, 8), K.glow('#fff4c0', '#ffd66b', 0.3), 0, 0, 0));
  glass.material = glass.material.clone();
  for (let i = 0; i < 4; i++) K.put(breech, K.box(0.06, 0.74, 0.06), brassD, Math.cos(i * 1.57) * 0.34, 0, Math.sin(i * 1.57) * 0.34);
  // two gauges on the carriage
  const needles = [];
  for (const x of [-0.45, 0.45]) {
    K.put(g, K.cyl(0.18, 0.18, 0.05, 12), K.c('#f4ecd8'), x, 0.9, 0.5, 0, Math.PI / 2);
    const n = K.grp(g, x, 0.9, 0.53); K.put(n, K.box(0.02, 0.14, 0.02), K.c('#c8303a'), 0, 0.06, 0); needles.push(n);
  }
  const halo = K.noCast(K.put(breech, K.ball(0.8, 10, 8), K.light('#ffe08a', 0.2), 0, 0, 0));
  g.userData.anim = (t, charge = 0) => {
    glass.material.emissiveIntensity = 0.3 + charge * 2.2 + Math.sin(t * 8) * 0.1 * charge;
    halo.visible = charge > 0.05; halo.scale.setScalar(0.6 + charge * 0.9);
    needles.forEach((n, i) => { n.rotation.z = 1.2 - charge * 2.4 + Math.sin(t * 20 + i) * 0.04 * charge; });
  };
  g.userData.barrel = barrel;
  g.userData.anim(0, 0);
  return g;
}

// Master Tock’s workshop: a narrow brass-trimmed house with a great gear on its front
export function buildWorkshop(r3d) {
  const K = kit(r3d), g = new THREE.Group();
  const wall = K.c('#c8b898'), brass = K.glow('#d8a84a', '#8a6a2a', 0.2), roof = K.c('#6a4a3a'), dark = K.c('#2a2430');
  K.put(g, K.box(3.4, 3, 2.6), wall, 0, 1.5, 0);
  const rf = K.put(g, K.cone(2.6, 1.6, 4), roof, 0, 3.8, 0, Math.PI / 4); rf.scale.set(1, 1, 0.8);
  K.put(g, K.box(1, 1.8, 0.1), K.c('#5a3a24'), -0.8, 0.9, 1.32);
  K.put(g, K.box(0.8, 0.7, 0.1), K.glow('#ffd890', '#ffb060', 0.9), 0.9, 1.9, 1.32);
  const gear = K.grp(g, 0.7, 2.6, 1.36);
  K.put(gear, K.cyl(0.55, 0.55, 0.1, 14), brass, 0, 0, 0, 0, Math.PI / 2);
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; K.put(gear, K.box(0.14, 0.2, 0.1), brass, Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0, 0, 0, a); }
  K.put(gear, K.cyl(0.16, 0.16, 0.14, 8), dark, 0, 0, 0.02, 0, Math.PI / 2);
  g.userData.anim = (t) => { gear.rotation.z = t * 0.6; };
  return g;
}

// the town clock’s cuckoo, loose: a round wooden bird on a spring
export function buildCuckoo(r3d) {
  const K = kit(r3d), g = new THREE.Group(), body = K.grp(g, 0, 0.4, 0);
  const wood = K.c('#a8784a'), woodD = K.c('#6a4a30'), red = K.c('#c8383e');
  K.put(body, K.ball(0.26, 8, 6), wood, 0, 0, 0).scale.set(1, 0.9, 1.2);
  K.put(body, K.ball(0.18, 8, 6), wood, 0, 0.2, 0.2);
  K.put(body, K.cone(0.06, 0.16, 4), K.c('#f2c14e'), 0, 0.2, 0.42, 0, Math.PI / 2);
  for (const s of [-1, 1]) K.put(body, K.box(0.04, 0.05, 0.02), K.c('#1a1418'), s * 0.08, 0.26, 0.34);
  for (const s of [-1, 1]) K.put(body, K.box(0.06, 0.18, 0.3), red, s * 0.24, 0, -0.05).rotation.z = s * 0.3;
  K.put(body, K.box(0.14, 0.06, 0.3), woodD, 0, 0.04, -0.34).rotation.x = 0.4;
  // (its spring, coiled under it)
  for (let i = 0; i < 4; i++) K.put(g, K.cyl(0.1, 0.1, 0.03, 8), K.c('#9a96a0'), 0, 0.08 + i * 0.07, 0);
  g.userData.anim = (t, caught) => { body.rotation.z = caught ? 0 : Math.sin(t * 14) * 0.15; };
  return g;
}

// an aurora: ribbons of green and violet light hanging in the sky (userData.anim waves them)
export function buildAurora(r3d, w = 40) {
  const K = kit(r3d), g = new THREE.Group(), ribbons = [];
  for (const [k, col, y, z] of [[0, '#6aff9a', 16, 0], [1, '#8af0d0', 18, -3], [2, '#b08aff', 20, -6]]) {
    const geo = new THREE.PlaneGeometry(w, 5, 24, 1), m = new THREE.Mesh(geo, K.light(col, 0.28));
    m.position.set(0, y, z); m.userData.base = geo.attributes.position.array.slice(); m.userData.k = k;
    g.add(m); ribbons.push(m);
  }
  g.userData.anim = (t) => {
    for (const m of ribbons) {
      const a = m.geometry.attributes.position, b = m.userData.base;
      for (let i = 0; i < a.count; i++) { const x = b[i * 3]; a.setY(i, b[i * 3 + 1] + Math.sin(x * 0.2 + t * 0.7 + m.userData.k) * 1.2); a.setZ(i, b[i * 3 + 2] + Math.sin(x * 0.13 + t * 0.5) * 1.5); }
      a.needsUpdate = true;
    }
  };
  return g;
}
