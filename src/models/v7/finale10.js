// World v7, chapter 10 — the Grand Finale’s props: the Umbral Spotlight (a lamp that eats
// light), the searchlights sweeping the sky round the Gloomstage, the Understudies’ crate
// stage, a sealed letter, festival bunting, and the wedge of darkness the Spotlight throws.

import { kit, THREE } from './kit.js';

// the Umbral Spotlight: a great iron lamp on chains, its lens violet-black; lit, it pours a
// cone of darkness down; shattered, its lens is crazed white and it sparks
// (userData.set('off' | 'lit' | 'shattered'), userData.anim(t))
export function buildUmbralSpotlight(r3d) {
  const K = kit(r3d), g = new THREE.Group();
  const iron = K.c('#2a2430'), ironL = K.c('#4a4252'), gold = K.c('#c89a3a');
  for (const x of [-0.8, 0.8]) K.put(g, K.box(0.06, 5, 0.06), ironL, x, 3.2, 0);
  const head = K.grp(g, 0, 0, 0);
  K.put(head, K.cyl(1.0, 1.25, 1.5, 16), iron, 0, 0.2, 0);
  K.put(head, K.cyl(1.32, 1.32, 0.14, 16), gold, 0, -0.55, 0);
  K.put(head, K.cyl(0.7, 0.9, 0.5, 12), iron, 0, 1.1, 0);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; const f = K.put(head, K.box(0.9, 0.06, 0.7), ironL, Math.cos(a) * 1.4, -0.7, Math.sin(a) * 1.4, -a); f.rotation.z = 0; }
  const lensMat = K.glow('#2a1040', '#8a4ae0', 0.2).clone();
  const lens = K.noCast(K.put(head, K.cyl(1.12, 1.12, 0.06, 18), lensMat, 0, -0.6, 0));
  // (the cracks, when it’s shattered)
  const cracks = K.grp(head, 0, -0.64, 0);
  const white = K.glow('#ffffff', '#fff4c8', 1.4);
  for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.3, L = 0.5 + (i % 3) * 0.2; K.noCast(K.beam(cracks, white, 0, 0, 0, Math.cos(a) * L, 0, Math.sin(a) * L, 0.05)); }
  // (the cone of darkness it pours down — normal blending: it darkens)
  const coneMat = new THREE.MeshBasicMaterial({ color: 0x1a0828, transparent: true, opacity: 0.32, depthWrite: false });
  const beam = K.noCast(new THREE.Mesh(new THREE.ConeGeometry(2.2, 5.2, 20, 1, true), coneMat));
  beam.position.set(0, -3.2, 0);
  g.add(beam);
  let state = 'off';
  g.userData.set = (s) => {
    state = s;
    cracks.visible = s === 'shattered';
    beam.visible = s === 'lit';
    lensMat.emissiveIntensity = s === 'lit' ? 1.6 : s === 'shattered' ? 0.05 : 0.2;
  };
  g.userData.anim = (t) => {
    head.rotation.y = Math.sin(t * 0.4) * 0.1;
    if (state === 'lit') { lensMat.emissiveIntensity = 1.4 + Math.sin(t * 7) * 0.25; beam.material.opacity = 0.28 + Math.sin(t * 3) * 0.05; }
    else if (state === 'shattered') lensMat.emissiveIntensity = Math.random() < 0.08 ? 0.8 : 0.05;
  };
  g.userData.set('off');
  return g;
}

// a searchlight’s beam: a long pale cone from its lamp (userData.anim sweeps it)
export function buildSearchBeam(r3d, { len = 18, r = 2.4, speed = 0.5, phase = 0, swing = 0.9 } = {}) {
  const K = kit(r3d), g = new THREE.Group(), pivot = K.grp(g);
  K.put(pivot, K.cyl(0.35, 0.45, 0.6, 10), K.c('#2a2430'), 0, 0, 0, 0, Math.PI / 2);
  const cone = K.noCast(K.put(pivot, K.cone(r, len, 18), K.light('#fff4c8', 0.16), 0, 0, -len / 2, 0, -Math.PI / 2));
  void cone;
  pivot.rotation.x = 0.55;
  g.userData.anim = (t) => { pivot.rotation.y = Math.sin(t * speed + phase) * swing; pivot.rotation.x = 0.45 + Math.sin(t * speed * 0.7 + phase) * 0.2; };
  return g;
}

// the Understudies’ stage: crates, a plank, a little curtain on two poles, a star
export function buildCrateStage(r3d) {
  const K = kit(r3d), g = new THREE.Group();
  const crate = K.tex('cratestage', 12, 12, (p) => { p.rect(0, 0, 12, 12, '#8a6a4a'); p.rect(0, 0, 12, 1, '#5a4430'); p.rect(0, 11, 12, 1, '#5a4430'); p.rect(0, 0, 1, 12, '#5a4430'); p.rect(11, 0, 1, 12, '#5a4430'); p.rect(1, 5, 10, 1, '#6a5038'); });
  for (const x of [-1.1, 0, 1.1]) K.put(g, K.box(1, 0.7, 1), crate, x, 0.35, 0);
  K.put(g, K.box(3.6, 0.1, 1.4), K.c('#a8845a'), 0, 0.75, 0);
  for (const x of [-1.7, 1.7]) K.put(g, K.box(0.08, 1.8, 0.08), K.c('#4a3220'), x, 1.6, -0.6);
  for (const s of [-1, 1]) K.put(g, K.box(0.7, 1.3, 0.05), K.c(s < 0 ? '#b8303e' : '#861f2c'), s * 1.35, 1.75, -0.6);
  K.put(g, K.box(3.5, 0.18, 0.08), K.c('#c89a3a'), 0, 2.45, -0.6);
  const star = K.noCast(K.put(g, K.cyl(0.26, 0.26, 0.05, 5), K.glow('#ffe08a', '#ffc040', 1), 0, 2.2, -0.55, 0, Math.PI / 2));
  g.userData.anim = (t) => { star.rotation.y = t * 1.5; };
  return g;
}

// a sealed letter, thirty years in a postbag
export function buildLetter(r3d) {
  const K = kit(r3d), g = new THREE.Group();
  const paper = K.tex('oldletter', 10, 8, (p) => { p.rect(0, 0, 10, 8, '#efe2c0'); for (let i = 0; i < 5; i++) { p.px(i, i * 0.8 | 0, '#c8b890'); p.px(9 - i, i * 0.8 | 0, '#c8b890'); } p.px(3, 6, '#d8c8a0'); });
  K.put(g, K.box(0.62, 0.04, 0.44), paper, 0, 0, 0);
  K.put(g, K.cyl(0.08, 0.08, 0.05, 10), K.c('#c8383e'), 0, 0.03, 0.05);
  return g;
}

// strings of festival lights and pennants, sagging between two poles (w apart, along x)
export function buildBunting(r3d, w = 10, { h = 3.4, n = 14 } = {}) {
  const K = kit(r3d), g = new THREE.Group();
  for (const x of [-w / 2, w / 2]) { K.put(g, K.cyl(0.07, 0.09, h + 0.3, 6), K.c('#6a4a34'), x, (h + 0.3) / 2, 0); K.put(g, K.ball(0.12, 6, 5), K.c('#c89a3a'), x, h + 0.35, 0); }
  const cols = ['#ffcf7a', '#ff9a8a', '#8fd6ff', '#b0f08a', '#f7b0e0'];
  const bulbs = [];
  for (let i = 1; i < n; i++) {
    const u = i / n, x = -w / 2 + u * w, y = h - Math.sin(u * Math.PI) * 0.9;
    const b = K.noCast(K.put(g, K.ball(0.09, 6, 5), K.glow(cols[i % cols.length], cols[i % cols.length], 1.4), x, y - 0.1, 0));
    bulbs.push(b);
    if (i % 2) K.put(g, K.cone(0.14, 0.32, 3), K.c(cols[(i + 2) % cols.length]), x, y - 0.24, 0.02, 0, Math.PI, 0);
  }
  for (let i = 0; i < n; i++) {
    const u0 = i / n, u1 = (i + 1) / n;
    K.noCast(K.beam(g, K.c('#3a2a20'), -w / 2 + u0 * w, h - Math.sin(u0 * Math.PI) * 0.9, 0, -w / 2 + u1 * w, h - Math.sin(u1 * Math.PI) * 0.9, 0, 0.025));
  }
  g.userData.anim = (t) => { bulbs.forEach((b, i) => { b.scale.setScalar(0.9 + Math.sin(t * 3 + i) * 0.12); }); };
  return g;
}

// the wedge of darkness the Umbral Spotlight throws across the stage (normal blending: it
// darkens); it points along +x — turn it with rotation.y = −angle
export function buildUmbralWedge(len = 14, wid = 0.55) {
  const geo = new THREE.CircleGeometry(len, 24, -wid, wid * 2).rotateX(Math.PI / 2);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x12061e, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
  m.renderOrder = 2;
  return m;
}
