// World v7, chapter 8 — Emberleaf, Glowtide and Elderbough’s props: fireflies and their
// jars, the festival’s hook posts and stage, pumpkins, the Understudies’ cardboard
// replacements, the Gloomstage’s siphon, leaf piles.

import { kit, THREE } from './kit.js';
import { buildJar } from '../../saga/jars.js';

// a firefly: a speck of green-gold light (userData.glow(0..1) — they come and go)
export function buildFirefly(r3d) {
  const K = kit(r3d), g = new THREE.Group();
  const body = K.noCast(K.put(g, K.ball(0.07, 6, 4), K.glow('#f0ff9a', '#e8ff7a', 1.8), 0, 0, 0));
  body.material = body.material.clone();
  const halo = K.noCast(K.put(g, K.ball(0.32, 8, 6), K.light('#e8ff8a', 0.35), 0, 0, 0));
  halo.material = halo.material.clone();
  g.userData.glow = (k) => { body.material.emissiveIntensity = 0.3 + k * 1.8; halo.material.opacity = 0.05 + k * 0.4; halo.scale.setScalar(0.6 + k * 0.6); };
  return g;
}

export function buildJarModel(r3d) { return buildJar(kit(r3d)); }

// a hook post for a firefly jar: a pole, an arm, a hook — and a paper cone to shade the jar
export function buildHookPost(r3d) {
  const K = kit(r3d), g = new THREE.Group();
  const wood = K.c('#6a4a30'), iron = K.c('#3a3040');
  K.put(g, K.box(0.12, 2.3, 0.12), wood, 0, 1.15, 0);
  K.put(g, K.box(0.5, 0.08, 0.08), wood, 0.18, 2.2, 0);
  K.put(g, K.box(0.03, 0.18, 0.03), iron, 0.36, 2.08, 0.15);
  const ribbon = K.put(g, K.box(0.06, 0.4, 0.02), K.c('#e0483a'), 0.02, 1.9, 0.07);
  void ribbon;
  return g;
}

// a pumpkin (carved: a grin that glows)
export function buildPumpkin(r3d, { carved = false, s = 1 } = {}) {
  const K = kit(r3d), g = new THREE.Group(), orange = K.c('#e8782a'), orangeD = K.c('#c85a1a');
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; K.put(g, K.ball(0.26 * s, 8, 6), i % 2 ? orange : orangeD, Math.cos(a) * 0.14 * s, 0.24 * s, Math.sin(a) * 0.14 * s).scale.set(0.8, 1, 0.8); }
  K.put(g, K.cyl(0.04 * s, 0.05 * s, 0.14 * s, 5), K.c('#5a7a3a'), 0, 0.5 * s, 0);
  if (carved) {
    const lit = K.glow('#ffd66b', '#ffb040', 1.6);
    for (const x of [-0.1, 0.1]) K.noCast(K.put(g, K.box(0.07 * s, 0.07 * s, 0.03), lit, x * s, 0.3 * s, 0.37 * s));
    K.noCast(K.put(g, K.box(0.2 * s, 0.05 * s, 0.03), lit, 0, 0.17 * s, 0.37 * s));
  }
  return g;
}

// the festival stage: boards on trestles, a painted backdrop of a harvest moon, bunting
export function buildFestivalStage(r3d) {
  const K = kit(r3d), g = new THREE.Group();
  const plank = K.c('#a8784a'), plankD = K.c('#7a5234'), cloth = K.c('#8a3a5a');
  K.put(g, K.box(5, 0.5, 3), plank, 0, 0.25, 0);
  for (let i = 0; i < 6; i++) K.put(g, K.box(0.05, 0.02, 3), plankD, -2.5 + i, 0.51, 0);
  const back = K.tex('harvestmoon', 24, 12, (p) => { p.rect(0, 0, 24, 12, '#2a2a5a'); p.rect(15, 2, 6, 6, '#f4d880'); p.rect(16, 1, 4, 8, '#f4d880'); for (let x = 0; x < 24; x += 3) p.rect(x, 9, 2, 3, '#c85a1a'); p.px(4, 3, '#ffffff'); p.px(9, 5, '#ffffff'); });
  K.put(g, K.box(5, 2.4, 0.1), back, 0, 1.7, -1.45);
  for (const s of [-1, 1]) { K.put(g, K.box(0.2, 3, 0.2), plankD, s * 2.5, 1.5, -1.4); K.put(g, K.box(0.6, 2.4, 0.08), cloth, s * 2.2, 1.7, -1.3); }
  // bunting across the top
  for (let i = 0; i < 9; i++) { const f = K.put(g, K.cone(0.14, 0.28, 3), K.c(['#e0483a', '#f2c14e', '#5aa05a'][i % 3]), -2.2 + i * 0.55, 2.8, -1.3, 0, Math.PI); f.scale.z = 0.3; }
  const p1 = buildPumpkin(r3d, { carved: true, s: 0.9 }); p1.position.set(-2.1, 0.5, 1.1); g.add(p1);
  const p2 = buildPumpkin(r3d, { carved: true, s: 0.9 }); p2.position.set(2.1, 0.5, 1.1); g.add(p2);
  return g;
}

// a cardboard cut-out of an Understudy on a little stand (the Duchess’s replacements)
export function buildCutout(r3d, who = 'minnow') {
  const K = kit(r3d), g = new THREE.Group();
  const col = { minnow: '#8a3a86', fidget: '#6a4a9a', brick: '#5a3a7a' }[who], sc = { minnow: 0.85, fidget: 1, brick: 1.35 }[who];
  const card = K.tex('cutout-' + who, 12, 20, (p) => {
    p.rect(0, 0, 12, 20, '#c8a878');
    p.rect(3, 1, 6, 6, '#d5c2ee'); p.rect(4, 3, 1, 1, '#241a2e'); p.rect(7, 3, 1, 1, '#241a2e'); p.rect(5, 5, 2, 1, '#7a3440');
    p.rect(2, 7, 8, 7, col); for (let y = 8; y < 14; y += 2) p.rect(2, y, 8, 1, '#f4eaff');
    p.rect(3, 14, 2, 5, '#2a2433'); p.rect(7, 14, 2, 5, '#2a2433');
    if (who === 'minnow') p.rect(3, 0, 6, 2, '#1a1a1a');
    if (who === 'fidget') { p.rect(3, 0, 6, 1, '#1a1a1a'); p.rect(3, 3, 2, 1, '#e0e0f0'); p.rect(7, 3, 2, 1, '#e0e0f0'); }
    if (who === 'brick') p.rect(4, 6, 4, 1, '#1a1a1a');
  });
  K.put(g, K.box(0.7 * sc, 1.2 * sc, 0.04), card, 0, 0.6 * sc + 0.1, 0);
  K.put(g, K.box(0.1, 0.5 * sc, 0.4), K.c('#a8845a'), 0, 0.25 * sc, -0.2).rotation.x = 0.4;
  return g;
}

// the Gloomstage’s siphon: a long hose from its hull down into the crown, violet light
// pulsing up it (userData.anim)
export function buildSiphon(r3d, len = 10) {
  const K = kit(r3d), g = new THREE.Group();
  K.put(g, K.cyl(0.35, 0.35, len, 10), K.c('#3a2a4a'), 0, len / 2, 0);
  for (let i = 0; i < 6; i++) K.put(g, K.cyl(0.42, 0.42, 0.14, 10), K.c('#6a5a7a'), 0, 0.6 + i * (len / 6), 0);
  const pulses = [];
  for (let i = 0; i < 4; i++) { const p = K.noCast(K.put(g, K.ball(0.4, 8, 6), K.glow('#c9a2f0', '#a86ae0', 1.6), 0, 0, 0)); pulses.push(p); }
  K.put(g, K.cone(0.9, 1.2, 8), K.c('#4a3a5a'), 0, -0.4, 0, 0, Math.PI);
  g.userData.anim = (tm) => { pulses.forEach((p, i) => { p.position.y = ((tm * 3 + i * (len / 4)) % len); p.scale.setScalar(0.8 + Math.sin(tm * 6 + i) * 0.15); }); };
  return g;
}

// a heap of autumn leaves (userData.burst() — scattered, and gone)
export function buildLeafPile(r3d, seed = 0) {
  const K = kit(r3d), g = new THREE.Group(), cols = ['#d9543c', '#e8883a', '#eab83a', '#c8453a'];
  for (let i = 0; i < 9; i++) { const a = i * 2.4 + seed, d = (i % 3) * 0.22; K.put(g, K.ball(0.34 - d * 0.4, 6, 4), K.c(cols[(i + seed) % 4]), Math.cos(a) * d, 0.18 + (i % 3) * 0.08, Math.sin(a) * d).scale.y = 0.55; }
  return g;
}
