// World v7: a Pelican Post pelican — Perkins’s big white birds in their navy
// postal caps, a mail satchel, and a beak pouch you ride in (a hero peeks
// out). Local frame: feet on the ground at the origin, beak towards +z.
// `userData.anim(t, dt)` flaps or glides by `userData.mode`: sit, fly or glide.

import { kit, THREE } from './kit.js';

export function buildPelican(r3d, { rider = null, cap = true } = {}) {
  const K = kit(r3d);
  const g = new THREE.Group(), body = K.grp(g, 0, 0.9, 0);
  const white = K.c('#f6f2ea'), grey = K.c('#c8c4c0'), black = K.c('#2a2630'), beak = K.c('#f2b84a'), pouch = K.c('#f0a040'), foot = K.c('#e8883a');
  const navy = K.c('#2e4a7a'), gold = K.glow('#ffe08a', '#f2c14e', 0.4), leather = K.c('#8a5a34');
  // the body, a little grey on the back
  K.put(body, K.ball(0.55, 12, 8), white, 0, 0, 0).scale.set(1, 0.8, 1.35);
  K.put(body, K.ball(0.5, 10, 6), grey, 0, 0.16, -0.12).scale.set(0.9, 0.5, 1.2);
  // the tail
  for (let i = -1; i <= 1; i++) { const f = K.put(body, K.box(0.14, 0.05, 0.4), i ? grey : white, i * 0.12, 0.05, -0.78); f.rotation.x = 0.25; }
  // the neck and head
  const neck = K.grp(body, 0, 0.2, 0.55);
  K.put(neck, K.cyl(0.13, 0.17, 0.55, 8), white, 0, 0.26, 0.05).rotation.x = -0.35;
  const head = K.grp(neck, 0, 0.58, 0.18);
  K.put(head, K.ball(0.22, 10, 8), white, 0, 0, 0).scale.set(0.9, 0.95, 1.1);
  K.put(head, K.box(0.05, 0.14, 0.1), K.c('#f2e0a0'), 0, 0.2, -0.12).rotation.x = -0.5;
  for (const s of [-1, 1]) { K.put(head, K.ball(0.045, 6, 4), black, s * 0.14, 0.05, 0.1); K.put(head, K.ball(0.018, 4, 3), K.c('#ffffff'), s * 0.155, 0.07, 0.13); }
  if (cap) {
    K.put(head, K.cyl(0.17, 0.2, 0.12, 10), navy, 0, 0.22, -0.02);
    K.put(head, K.box(0.2, 0.03, 0.14), navy, 0, 0.17, 0.14);
    K.noCast(K.put(head, K.box(0.06, 0.06, 0.02), gold, 0, 0.24, 0.16));
  }
  // the great beak, and the pouch under it (someone might be riding in it)
  const bk = K.grp(head, 0, -0.02, 0.18);
  K.put(bk, K.box(0.14, 0.07, 1.0), beak, 0, 0.04, 0.5).rotation.x = 0.08;
  K.put(bk, K.box(0.04, 0.05, 0.14), K.c('#d8883a'), 0, 0.02, 1.02);
  const pch = K.grp(bk, 0, -0.14, 0.42);
  K.put(pch, K.ball(0.26, 10, 6), pouch, 0, 0, 0).scale.set(0.8, rider ? 1.05 : 0.6, 1.6);
  if (rider) {
    const hd = K.grp(pch, 0, 0.2, 0.05);
    K.put(hd, K.ball(0.16, 8, 6), K.c(rider), 0, 0, 0);
    for (const s of [-1, 1]) K.put(hd, K.ball(0.03, 4, 3), black, s * 0.06, 0.02, 0.14);
  }
  // the mail satchel
  K.put(body, K.box(0.1, 0.34, 0.42), leather, 0.52, -0.08, 0.05);
  K.put(body, K.box(0.12, 0.08, 0.3), K.c('#6a4028'), 0.53, 0.1, 0.05);
  // the wings: a long arm of feathers each, black tips
  const wings = [];
  for (const s of [-1, 1]) {
    const w = K.grp(body, s * 0.42, 0.18, 0.05);
    const arm = K.grp(w, 0, 0, 0);
    K.put(arm, K.box(0.9, 0.08, 0.5), white, s * 0.45, 0, 0);
    const tip = K.grp(arm, s * 0.9, 0, 0);
    K.put(tip, K.box(0.8, 0.06, 0.42), white, s * 0.4, 0, -0.03);
    for (let k = 0; k < 4; k++) K.put(tip, K.box(0.26, 0.04, 0.1), black, s * (0.72 + k * 0.03), -0.01, -0.16 + k * 0.1);
    wings.push({ w, arm, tip, s });
  }
  // the feet (tucked up in flight)
  const feet = [];
  for (const s of [-1, 1]) { const f = K.grp(body, s * 0.18, -0.45, 0.05); K.put(f, K.box(0.05, 0.4, 0.05), foot, 0, -0.2, 0); K.put(f, K.box(0.16, 0.03, 0.2), foot, 0, -0.42, 0.06); feet.push(f); }
  g.userData.mode = 'sit';
  g.userData.parts = { body, neck, head, bk, pch, wings, feet };
  const ph = Math.random() * 6;
  g.userData.anim = (t) => {
    const m = g.userData.mode;
    const flap = m === 'fly' ? Math.sin(t * 7 + ph) : m === 'glide' ? Math.sin(t * 1.4 + ph) * 0.15 : 0;
    for (const W of wings) {
      if (m === 'sit') { W.w.rotation.z = W.s * 1.3; W.w.rotation.y = W.s * -0.6; W.tip.rotation.z = W.s * 0.3; W.arm.scale.setScalar(0.62); }
      else { W.w.rotation.z = W.s * -flap * 0.6; W.w.rotation.y = 0; W.tip.rotation.z = W.s * -flap * 0.4; W.arm.scale.setScalar(1); }
    }
    for (const f of feet) f.rotation.x = m === 'sit' ? 0 : -1.2;
    head.rotation.x = m === 'sit' ? Math.sin(t * 0.8 + ph) * 0.08 : -0.1;
    body.position.y = 0.9 + (m === 'fly' ? Math.sin(t * 7 + ph + 1) * 0.06 : m === 'sit' ? Math.sin(t * 1.5 + ph) * 0.015 : 0);
    body.rotation.x = m === 'sit' ? 0 : 0.12;
  };
  g.userData.anim(0);
  return g;
}
