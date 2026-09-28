// World v7: the Gloomstage — Duchess Gloria's flying opera house (a theatre
// on an airship hull under a striped balloon, spotlights sweeping, gloom
// trailing) — and the Grand Snuffer it lowers onto the world's Great Hearths.
// Local frame: centre of the hull's keel line, the stage's front facing +z.

import { kit, THREE } from './kit.js';

// where the Duchess stands (on the balcony), in the ship's frame
export const BALCONY = { x: 0, y: 3.1, z: 3.05 };

export function buildGloomstage(r3d, { fx = null } = {}) {
  const K = kit(r3d);
  const root = new THREE.Group();
  root.name = 'gloomstage';
  const body = K.grp(root);                 // (it bobs; the root is what scenes move)
  // ---- materials
  const hullWood = K.tex('gs-hull', 16, 16, (p) => {
    p.rect(0, 0, 16, 16, '#4e2f55');
    for (let y = 0; y < 16; y += 4) { p.hline(0, y, 16, '#3a2140'); for (let x = (y * 3) % 7; x < 16; x += 7) p.px(x, y + 2, '#633b6b'); }
  }, { rx: 1 });
  const gold = K.c('#e0a526'), goldD = K.c('#a8741a'), plum = K.c('#5e2f66'), plumD = K.c('#3f1d47'), velvet = K.c('#b8303e'), velvetD = K.c('#861f2c');
  const facade = K.tex('gs-facade', 44, 22, (p) => {
    p.rect(0, 0, 44, 22, '#d9c8e6');
    for (let x = 1; x < 44; x += 6) { p.rect(x, 2, 2, 20, '#f2e8f7'); p.vline(x + 2, 2, 20, '#b7a3c8'); }
    p.rect(0, 0, 44, 2, '#8a6aa0'); p.rect(0, 20, 44, 2, '#8a6aa0');
    for (let x = 4; x < 44; x += 6) { p.rect(x, 7, 2, 5, '#3a2a48'); p.px(x, 6, '#3a2a48'); p.px(x + 1, 6, '#3a2a48'); }
  }, { glowPaint: (q) => { for (let x = 4; x < 44; x += 6) { q.rect(x, 7, 2, 5, '#ffcf7a'); q.px(x, 6, '#ffcf7a'); q.px(x + 1, 6, '#ffcf7a'); } }, intensity: 0.9 });
  const balloonTex = K.tex('gs-balloon', 32, 16, (p) => {
    for (let x = 0; x < 32; x++) p.vline(x, 0, 16, Math.floor(x / 4) % 2 ? '#4a2352' : '#7a3a86');
    p.hline(0, 7, 32, '#e0a526'); p.hline(0, 8, 32, '#a8741a');
    for (let x = 1; x < 32; x += 4) p.px(x, 7, '#fff3a6');
  });
  const lamp = K.glow('#fff0c0', '#ffc860', 1.2), portGlow = K.glow('#ffd88a', '#ffb840', 1);
  // ---- the hull: a stepped keel, gold trim, glowing portholes
  K.put(body, K.box(15, 1.8, 6.4), hullWood, 0, 0.9, 0);
  K.put(body, K.box(12.6, 0.9, 4.6), plumD, 0, -0.35, 0);
  K.put(body, K.box(8.6, 0.7, 2.8), plumD, 0, -1.05, 0);
  for (const sx of [-1, 1]) {
    K.put(body, K.cyl(3.2, 3.2, 1.8, 12), hullWood, sx * 7.5, 0.9, 0).scale.set(0.35, 1, 1);
  }
  // a gold rail round the deck's edge (the deck itself stays dark planks)
  for (const sz of [-1, 1]) K.put(body, K.box(15.4, 0.3, 0.22), gold, 0, 1.95, sz * 3.25);
  for (const sx of [-1, 1]) K.put(body, K.box(0.22, 0.3, 6.7), gold, sx * 7.6, 1.95, 0);
  K.put(body, K.box(15.2, 0.16, 6.6), goldD, 0, 0.02, 0);
  // round glowing portholes with brass rims
  for (let x = -6; x <= 6; x += 2) {
    K.put(body, K.cyl(0.3, 0.3, 0.08, 10), goldD, x, 0.95, 3.22, 0, Math.PI / 2, 0);
    K.noCast(K.put(body, K.cyl(0.22, 0.22, 0.1, 10), portGlow, x, 0.95, 3.25, 0, Math.PI / 2, 0));
  }
  // a figurehead: a golden frowning mask on the prow
  const fig = K.grp(body, 8.6, 1.2, 0, 0);
  K.put(fig, K.cyl(0.8, 0.8, 0.2, 12), gold, 0, 0, 0, 0, 0, Math.PI / 2);
  for (const sz of [-0.3, 0.3]) K.put(fig, K.box(0.08, 0.14, 0.14), plumD, 0.12, 0.2, sz);
  K.put(fig, K.box(0.08, 0.1, 0.44), plumD, 0.12, -0.28, 0);
  // ---- the theatre on deck
  const hall = K.put(body, K.box(11, 5.4, 4), facade, 0, 1.9 + 2.7, -0.9);
  void hall;
  // the stage arch: gold frame, a warm glowing stage, red curtains drawn aside
  K.noCast(K.put(body, K.box(5.2, 3.6, 0.1), K.glow('#ffe2a0', '#ffb860', 0.85), 0, 3.7, 1.16));
  for (const sx of [-1, 1]) {
    K.put(body, K.box(1.2, 3.8, 0.3), velvet, sx * 2.1, 3.8, 1.25);
    K.put(body, K.box(0.35, 3.8, 0.34), velvetD, sx * 1.6, 3.8, 1.26);
    K.put(body, K.box(0.4, 4.4, 0.5), gold, sx * 2.85, 4.1, 1.25);
  }
  K.put(body, K.box(6.1, 0.55, 0.5), gold, 0, 6.2, 1.25);
  K.put(body, K.box(5.2, 0.6, 0.3), velvet, 0, 5.75, 1.3);            // the valance
  for (let x = -2.4; x <= 2.4; x += 0.6) K.put(body, K.box(0.18, 0.22, 0.32), goldD, x, 5.38, 1.32);
  // the pediment (a purple prism) and the mask of Gloom
  // (a three-sided cylinder turned on its side, one edge up: a roof ridge)
  const ped = K.put(body, K.geo('gs-ped', () => new THREE.CylinderGeometry(1.9, 1.9, 11.4, 3, 1, false, Math.PI / 2)), plum, 0, 7.75, -0.9, 0, 0, Math.PI / 2);
  ped.scale.set(1, 1, 1.15);
  const mask = K.grp(body, 0, 8.1, 1.05);
  K.put(mask, K.cyl(0.9, 0.9, 0.18, 14), gold, 0, 0, 0, 0, Math.PI / 2, 0);
  // (a tragedy mask: sad brows, a mouth curving down)
  for (const sx of [-1, 1]) { const b = K.put(mask, K.box(0.3, 0.1, 0.12), plumD, sx * 0.34, 0.22, 0.1); b.rotation.z = sx * 0.35; }
  for (const sx of [-0.33, 0.33]) K.put(mask, K.box(0.14, 0.1, 0.12), plumD, sx, 0.06, 0.1);
  K.put(mask, K.box(0.4, 0.1, 0.12), plumD, 0, -0.24, 0.1);
  for (const sx of [-0.28, 0.28]) K.put(mask, K.box(0.12, 0.14, 0.12), plumD, sx, -0.36, 0.1);
  // two towers with pointed roofs and pennants
  const flags = [];
  for (const sx of [-1, 1]) {
    K.put(body, K.cyl(0.95, 1.05, 6.6, 10), facade, sx * 5.6, 1.9 + 3.3, -0.4);
    K.put(body, K.cyl(1.15, 1.15, 0.3, 10), gold, sx * 5.6, 8.6, -0.4);
    K.put(body, K.cone(1.25, 2.4, 10), plum, sx * 5.6, 9.95, -0.4);
    K.put(body, K.box(0.08, 1.2, 0.08), goldD, sx * 5.6, 11.6, -0.4);
    const f = K.put(body, K.box(1.1, 0.5, 0.05), velvet, sx * 5.6 + 0.6, 11.9, -0.4);
    flags.push(f);
    for (let k = 0; k < 3; k++) K.noCast(K.put(body, K.box(0.34, 0.5, 0.1), portGlow, sx * 5.6, 3.2 + k * 1.6, 0.6));
  }
  // ---- the balcony where Her Radiance stands
  K.put(body, K.box(4.2, 0.26, 1.7), hullWood, BALCONY.x, BALCONY.y - 0.13, BALCONY.z);
  K.put(body, K.box(4.3, 0.12, 0.12), gold, BALCONY.x, BALCONY.y + 0.72, BALCONY.z + 0.84);
  for (let x = -2; x <= 2; x += 0.5) K.put(body, K.box(0.08, 0.72, 0.08), goldD, BALCONY.x + x, BALCONY.y + 0.36, BALCONY.z + 0.84);
  for (const sx of [-1, 1]) K.put(body, K.box(0.12, 0.72, 1.7), goldD, BALCONY.x + sx * 2.1, BALCONY.y + 0.36, BALCONY.z);
  // ---- the balloon, its gold band, fins and rigging
  const bal = K.put(body, K.ball(1, 20, 12), balloonTex, 0, 14, -0.6);
  bal.scale.set(9.6, 3.6, 4.2);
  for (const sx of [-1, 1]) K.put(body, K.box(0.14, 2.6, 2.2), plumD, -9.2, 14 + sx * 1.3, -0.6, 0, 0, sx * 0.4);
  K.put(body, K.box(0.14, 2.4, 3.4), plumD, -9.3, 14, -0.6);
  const rope = K.c('#d9c090');
  for (const [x, z] of [[-6, 2.6], [6, 2.6], [-6, -3], [6, -3], [-2.5, 2.8], [2.5, 2.8]]) K.beam(body, rope, x, 1.9, z, x * 0.8, 10.8, z * 0.7 - 0.6, 0.07);
  // ---- propellers (they spin)
  const props = [];
  for (const [x, y, z, s] of [[-8.4, 1, 2.2, 1], [-8.4, 1, -2.2, 1], [-10.2, 14, -0.6, 1.4]]) {
    const pr = K.grp(body, x, y, z);
    K.put(pr, K.cyl(0.25, 0.25, 0.5, 8), goldD, 0, 0, 0, 0, 0, Math.PI / 2);
    const blades = K.grp(pr, -0.3, 0, 0);
    for (let k = 0; k < 3; k++) { const b = K.put(blades, K.box(0.1, 1.5 * s, 0.34), plumD, 0, 0, 0); b.rotation.x = (k / 3) * Math.PI * 2; b.position.set(0, Math.cos((k / 3) * Math.PI * 2) * 0.7 * s, Math.sin((k / 3) * Math.PI * 2) * 0.7 * s); }
    props.push(blades);
  }
  // ---- spotlights on the prow corners, and their sweeping beams
  const beams = [];
  for (const sx of [-1, 1]) {
    const L = K.grp(body, sx * 6.4, 2.3, 2.6);
    K.put(L, K.cyl(0.35, 0.45, 0.7, 8), K.c('#3b3a46'), 0, 0, 0, 0, Math.PI / 2 - 0.5);
    K.noCast(K.put(L, K.cyl(0.3, 0.3, 0.08, 8), lamp, 0, -0.2, 0.3, 0, Math.PI / 2 - 0.5));
    const cone = K.noCast(new THREE.Mesh(K.geo('gs-beam', () => { const g = new THREE.ConeGeometry(2.2, 12, 14, 1, true); g.translate(0, -6, 0); return g; }), K.light('#fff3c4', 0.13)));
    cone.rotation.x = -0.5;
    cone.renderOrder = 4;
    L.add(cone);
    beams.push({ L: cone, sx });
  }
  // ---- gloom drifting under the hull
  const wisps = [];
  for (let k = 0; k < 7; k++) {
    const w = K.noCast(K.put(body, K.ball(1, 8, 6), K.light('#5a2a7a', 0.28), -6 + k * 2, -1.6 - (k % 2) * 0.4, (k % 3 - 1) * 1.6));
    w.scale.setScalar(1.2 + (k % 3) * 0.4);
    wisps.push(w);
  }
  root.userData.balcony = BALCONY;
  root.userData.anim = (t, dt) => {
    body.position.y = Math.sin(t * 0.9) * 0.25;
    body.rotation.z = Math.sin(t * 0.6) * 0.02;
    for (const b of props) b.rotation.x += dt * 12;
    flags.forEach((f, i) => { f.rotation.y = Math.sin(t * 5 + i) * 0.35; });
    for (const b of beams) { b.L.rotation.z = Math.sin(t * 0.8 + b.sx) * 0.45; b.L.rotation.x = -0.45 + Math.sin(t * 0.5 + b.sx * 2) * 0.15; }
    wisps.forEach((w, i) => { w.position.x = -6 + i * 2 + Math.sin(t * 0.7 + i) * 0.5; w.scale.setScalar(1.2 + (i % 3) * 0.4 + Math.sin(t * 1.3 + i) * 0.15); });
    if (fx && Math.random() < dt * 3) fx(root.position.x + (Math.random() - 0.5) * 12, root.position.y - 1.5, root.position.z + (Math.random() - 0.5) * 3);
  };
  root.traverse((o) => { if (o.isMesh && !o.userData.noCast) o.castShadow = true; });
  return root;
}

// the Grand Snuffer: a huge brass candle snuffer on a long chain
export function buildSnuffer(r3d, { chain = 14 } = {}) {
  const K = kit(r3d);
  const root = new THREE.Group();
  root.name = 'snuffer';
  const brass = K.tex('gs-brass', 16, 16, (p) => {
    p.rect(0, 0, 16, 16, '#b8913e');
    for (let y = 0; y < 16; y += 5) p.hline(0, y, 16, '#8a6a2a');
    for (let i = 0; i < 20; i++) p.px((i * 7) % 16, (i * 11) % 16, '#e8c46a');
  }, { rx: 1 });
  const dark = K.c('#4a3a2a');
  const bell = K.put(root, K.cone(2.5, 3.2, 16), brass, 0, 1.6, 0);
  void bell;
  K.put(root, K.cyl(2.55, 2.55, 0.25, 16), K.c('#8a6a2a'), 0, 0.12, 0);
  K.put(root, K.ball(0.55, 10, 8), brass, 0, 3.3, 0);
  K.put(root, K.cyl(0.32, 0.32, 0.12, 10), dark, 0, 3.9, 0, 0, Math.PI / 2, 0);
  // the gloom oozing off its rim
  const rim = K.noCast(K.put(root, K.cyl(2.7, 2.9, 0.4, 16, true), K.light('#7a3aa8', 0.35), 0, 0.2, 0));
  for (let k = 0; k < chain; k++) {
    const link = K.put(root, K.box(0.18, 0.7, 0.42), dark, 0, 4.3 + k * 0.62, 0);
    link.rotation.y = k % 2 ? Math.PI / 2 : 0;
  }
  root.userData.anim = (t) => { rim.material.opacity = 0.25 + Math.sin(t * 4) * 0.1; };
  return root;
}
