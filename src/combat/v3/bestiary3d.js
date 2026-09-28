// Models for the big world's gloom creatures — boxes and a few rounder bits,
// gloomy purples with glowing eyes, each with its zone's flavour (sand,
// embers, frost, bog, spores, coral, storm…). Every model returns a group
// with userData handles the brains animate (body, legs, wings, tongue…).

import { THREE } from '../../render/r3d.js';

const mats = new Map();
function mat(r3d, c, e = null, ei = 1, opts = {}) {
  const k = c + '|' + e + '|' + ei + '|' + (opts.opacity || 1);
  if (!opts.fresh && mats.has(k)) return mats.get(k);
  const m = new THREE.MeshToonMaterial({ color: c, emissive: e || 0x000000, emissiveIntensity: e ? ei : 1, gradientMap: r3d.gradient, transparent: !!opts.opacity, opacity: opts.opacity || 1, depthWrite: !opts.opacity });
  if (!opts.fresh) mats.set(k, m);
  return m;
}
// enemies tint & flash their materials, so every enemy gets its own copies
function own(g) { g.traverse((m) => { if (m.isMesh) m.material = m.material.clone(); }); return g; }
function box(g, w, h, d, m, x, y, z) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true;
  g.add(b);
  return b;
}
function ball(g, r, m, x, y, z, sx = 1, sy = 1, sz = 1, detail = 1) {
  const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail), m);
  b.position.set(x, y, z); b.scale.set(sx, sy, sz); b.castShadow = true;
  g.add(b);
  return b;
}
const grp = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
const eyes = (r3d, g, y, z, gap, s = 0.07, c = '#fff3a0', e = '#ffe066') => {
  const out = [];
  for (const sx of [-gap, gap]) { out.push(box(g, s, s * 1.2, 0.04, mat(r3d, c, e, 1.2), sx, y, z)); box(g, s * 0.45, s * 0.55, 0.03, mat(r3d, '#241a2e'), sx + 0.01, y - 0.01, z + 0.02); }
  return out;
};

export const MODELS = {
  // a sandy mole-worm with a drill nose (and, underground, just a moving mound)
  burrower(r3d) {
    const g = new THREE.Group(), body = grp(g);
    ball(body, 0.36, mat(r3d, '#8a6a7a'), 0, 0.32, 0, 1, 0.9, 1.1);
    ball(body, 0.24, mat(r3d, '#c8a07a'), 0, 0.26, 0.2, 1, 0.8, 0.7);
    const drill = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.34, 6), mat(r3d, '#d8b870'));
    drill.rotation.x = Math.PI / 2; drill.position.set(0, 0.36, 0.44); drill.castShadow = true; body.add(drill);
    eyes(r3d, body, 0.48, 0.3, 0.12);
    for (const sx of [-0.28, 0.28]) box(body, 0.14, 0.06, 0.2, mat(r3d, '#5a4a5a'), sx, 0.08, 0.16);
    const mound = grp(g);
    ball(mound, 0.42, mat(r3d, '#c8a468'), 0, 0.02, 0, 1, 0.35, 1);
    for (let i = 0; i < 5; i++) box(mound, 0.1, 0.06, 0.1, mat(r3d, '#e0c088'), Math.cos(i * 1.3) * 0.3, 0.1, Math.sin(i * 1.3) * 0.3);
    mound.visible = false;
    g.userData = { body, drill, mound };
    return own(g);
  },
  // a little fire imp with horns and a flame for hair (it flashes when fused)
  imp(r3d) {
    const g = new THREE.Group(), body = grp(g);
    ball(body, 0.26, mat(r3d, '#b8483a'), 0, 0.3, 0, 1, 1.05, 0.95);
    ball(body, 0.16, mat(r3d, '#e8744a'), 0, 0.26, 0.14, 1, 0.8, 0.6);
    eyes(r3d, body, 0.36, 0.23, 0.09, 0.06, '#fff6c0', '#ffd23a');
    for (const sx of [-1, 1]) { const h = box(body, 0.06, 0.16, 0.06, mat(r3d, '#3a2230'), sx * 0.14, 0.56, 0); h.rotation.z = -sx * 0.35; }
    const flame = grp(body, 0, 0.6, -0.02);
    box(flame, 0.16, 0.2, 0.16, mat(r3d, '#ff9a3a', '#ff6a1a', 1.4), 0, 0.06, 0);
    box(flame, 0.09, 0.16, 0.09, mat(r3d, '#fff0a0', '#ffd23a', 1.5), 0, 0.16, 0);
    for (const sx of [-0.12, 0.12]) box(body, 0.06, 0.14, 0.06, mat(r3d, '#3a2230'), sx, 0.07, 0);
    const tail = box(body, 0.04, 0.04, 0.26, mat(r3d, '#3a2230'), 0, 0.2, -0.3);
    g.userData = { body, flame, tail };
    return own(g);
  },
  // a floating cluster of ice crystals around a cold blue core
  wisp(r3d) {
    const g = new THREE.Group(), body = grp(g);
    ball(body, 0.16, mat(r3d, '#dff4ff', '#6ac0ff', 1.3), 0, 0, 0, 1, 1, 1, 0);
    const shards = [];
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), mat(r3d, '#9fdcff', '#3a7ac0', 0.5));
      const a = (i / 6) * Math.PI * 2;
      s.position.set(Math.cos(a) * 0.28, (i % 2 ? 0.1 : -0.08), Math.sin(a) * 0.28); s.scale.set(0.7, 1.5, 0.7); s.castShadow = true;
      body.add(s); shards.push(s);
    }
    eyes(r3d, body, 0.02, 0.15, 0.06, 0.05, '#241a2e', null);
    g.userData = { body, shards };
    return own(g);
  },
  // a big squat bog toad; the tongue shoots out along its facing
  toad(r3d) {
    const g = new THREE.Group(), body = grp(g);
    ball(body, 0.46, mat(r3d, '#4a6a3a'), 0, 0.36, 0, 1.15, 0.72, 1);
    ball(body, 0.34, mat(r3d, '#b8b86a'), 0, 0.28, 0.14, 1, 0.6, 0.8);
    for (const [x, z] of [[0.18, 0.1], [-0.2, -0.05], [0.05, -0.2]]) box(body, 0.1, 0.03, 0.1, mat(r3d, '#6a3a8e'), x, 0.66, z);
    for (const sx of [-0.2, 0.2]) { ball(body, 0.12, mat(r3d, '#e8e0a0'), sx, 0.66, 0.2, 1, 1, 1, 0); box(body, 0.05, 0.08, 0.04, mat(r3d, '#241a2e'), sx, 0.67, 0.31); }
    box(body, 0.44, 0.03, 0.05, mat(r3d, '#2a3a24'), 0, 0.34, 0.44);
    for (const sx of [-0.4, 0.4]) box(body, 0.22, 0.12, 0.34, mat(r3d, '#3a5a2e'), sx, 0.08, -0.12);
    const tongue = box(g, 0.12, 0.08, 1, mat(r3d, '#ef7a9a'), 0, 0.36, 0.5);
    tongue.visible = false;
    g.userData = { body, tongue };
    return own(g);
  },
  // a spore shaman: mushroom cap, a staff, a little cape
  shaman(r3d) {
    const g = new THREE.Group(), body = grp(g);
    box(body, 0.36, 0.44, 0.3, mat(r3d, '#4d2f6e'), 0, 0.3, 0);
    box(body, 0.4, 0.3, 0.06, mat(r3d, '#7a4ab0'), 0, 0.3, -0.18);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(r3d, '#c85aa0'));
    cap.position.y = 0.52; cap.castShadow = true; body.add(cap);
    for (const [x, z] of [[0.15, 0.12], [-0.14, 0.16], [0.02, -0.2], [-0.2, -0.05]]) box(body, 0.08, 0.04, 0.08, mat(r3d, '#fff0f8'), x, 0.72, z);
    eyes(r3d, body, 0.44, 0.16, 0.08, 0.06, '#c8ffe8', '#6affc0');
    const staff = grp(body, 0.26, 0.3, 0.06);
    box(staff, 0.05, 0.9, 0.05, mat(r3d, '#6b4330'), 0, 0.1, 0);
    ball(staff, 0.09, mat(r3d, '#8ff0e8', '#3ac0b0', 1.2), 0, 0.6, 0, 1, 1, 1, 0);
    g.userData = { body, staff };
    return own(g);
  },
  // a gloomy moth with glowing green wings (heals its friends)
  mender(r3d) {
    const g = new THREE.Group(), body = grp(g);
    ball(body, 0.2, mat(r3d, '#5a3a7a'), 0, 0, 0, 0.9, 1.3, 0.9);
    ball(body, 0.13, mat(r3d, '#5a3a7a'), 0, 0.3, 0.02);
    eyes(r3d, body, 0.32, 0.12, 0.06, 0.05, '#c8ffd8', '#5aff9a');
    for (const sx of [-1, 1]) box(body, 0.03, 0.16, 0.03, mat(r3d, '#3a2a4a'), sx * 0.06, 0.48, 0.02);
    const wings = [];
    for (const sx of [-1, 1]) {
      const w = grp(body, sx * 0.08, 0.12, -0.04);
      box(w, 0.5, 0.36, 0.03, mat(r3d, '#8fe8b0', '#3ac07a', 0.6, { opacity: 0.85 }), sx * 0.26, 0, 0);
      box(w, 0.2, 0.12, 0.035, mat(r3d, '#fff3c4', '#ffe066', 0.8), sx * 0.3, 0.02, 0);
      wings.push(w);
    }
    g.userData = { body, wings };
    return own(g);
  },
  // an armoured gloom behind a big round shield
  knight(r3d) {
    const g = new THREE.Group(), body = grp(g);
    box(body, 0.46, 0.52, 0.36, mat(r3d, '#4d2f6e'), 0, 0.42, 0);
    box(body, 0.5, 0.2, 0.4, mat(r3d, '#8a8494'), 0, 0.62, 0);
    const helm = box(body, 0.42, 0.34, 0.4, mat(r3d, '#a8a2b0'), 0, 0.88, 0);
    box(body, 0.3, 0.05, 0.02, mat(r3d, '#241a2e'), 0, 0.9, 0.2);
    eyes(r3d, body, 0.9, 0.205, 0.08, 0.05, '#ff9aa8', '#ff3a5a');
    box(body, 0.06, 0.14, 0.06, mat(r3d, '#e05a5a'), 0, 1.1, 0);
    for (const sx of [-0.13, 0.13]) box(body, 0.14, 0.2, 0.16, mat(r3d, '#3a2450'), sx, 0.1, 0);
    const shield = grp(body, 0.05, 0.5, 0.3);
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 12), mat(r3d, '#8a5c3a'));
    sh.rotation.x = Math.PI / 2; sh.castShadow = true; shield.add(sh);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 4, 16), mat(r3d, '#c9c4cc'));
    shield.add(rim);
    box(shield, 0.14, 0.14, 0.1, mat(r3d, '#c9c4cc'), 0, 0, 0.04);
    const mace = grp(body, -0.32, 0.5, 0.1);
    box(mace, 0.06, 0.5, 0.06, mat(r3d, '#6b4330'), 0, 0, 0);
    box(mace, 0.16, 0.16, 0.16, mat(r3d, '#8a8494'), 0, 0.26, 0);
    g.userData = { body, shield, mace, helm };
    return own(g);
  },
  // a round armoured beetle (it rolls into a ball to charge)
  beetle(r3d) {
    const g = new THREE.Group(), body = grp(g);
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2), mat(r3d, '#2a5a6a'));
    shell.position.y = 0.2; shell.scale.set(1, 0.9, 1.15); shell.castShadow = true; body.add(shell);
    box(body, 0.04, 0.3, 1.0, mat(r3d, '#1a3a44'), 0, 0.6, 0);
    for (const [x, z] of [[0.22, 0.2], [-0.22, 0.2], [0.26, -0.15], [-0.26, -0.15]]) box(body, 0.14, 0.04, 0.14, mat(r3d, '#6ad0c8', '#2a8a8a', 0.5), x, 0.62, z);
    const head = box(body, 0.34, 0.22, 0.2, mat(r3d, '#1a2a34'), 0, 0.22, 0.56);
    eyes(r3d, body, 0.26, 0.67, 0.1, 0.05);
    const legs = [];
    for (const z of [0.25, 0, -0.25]) for (const sx of [-1, 1]) legs.push(box(body, 0.2, 0.05, 0.05, mat(r3d, '#1a2a34'), sx * 0.52, 0.12, z));
    g.userData = { body, shell, head, legs };
    return own(g);
  },
  // a big purple sky bird with a crest
  harpy(r3d) {
    const g = new THREE.Group(), body = grp(g);
    ball(body, 0.28, mat(r3d, '#5a3a8a'), 0, 0.3, 0, 0.9, 0.9, 1.3);
    ball(body, 0.18, mat(r3d, '#7a5ab0'), 0, 0.5, 0.3);
    box(body, 0.1, 0.07, 0.16, mat(r3d, '#f2b63d'), 0, 0.48, 0.5);
    eyes(r3d, body, 0.56, 0.42, 0.08, 0.05, '#ff9aa8', '#ff3a5a');
    for (let i = 0; i < 3; i++) { const f = box(body, 0.05, 0.2, 0.05, mat(r3d, '#ef6479'), 0, 0.68 + i * 0.02, 0.26 - i * 0.09); f.rotation.x = -0.4 - i * 0.2; }
    const wings = [];
    for (const sx of [-1, 1]) {
      const w = grp(body, sx * 0.18, 0.36, 0);
      box(w, 0.7, 0.05, 0.36, mat(r3d, '#4a2a7a'), sx * 0.36, 0, 0);
      box(w, 0.3, 0.04, 0.2, mat(r3d, '#b88cf0'), sx * 0.68, 0.01, -0.06);
      wings.push(w);
    }
    box(body, 0.3, 0.05, 0.3, mat(r3d, '#4a2a7a'), 0, 0.3, -0.42);
    g.userData = { body, wings };
    return own(g);
  },
  // a gloomling bandit with a sling and a bag of gloom bombs
  slinger(r3d) {
    const g = new THREE.Group(), body = grp(g);
    ball(body, 0.3, mat(r3d, '#4d2f6e'), 0, 0.3, 0, 1, 0.9, 0.95);
    box(body, 0.5, 0.1, 0.46, mat(r3d, '#c8454f'), 0, 0.48, 0);
    box(body, 0.16, 0.08, 0.1, mat(r3d, '#c8454f'), -0.12, 0.44, -0.28);
    eyes(r3d, body, 0.36, 0.28, 0.1);
    box(body, 0.22, 0.24, 0.16, mat(r3d, '#8a5c3a'), -0.26, 0.26, -0.12);
    const sling = grp(body, 0.3, 0.4, 0.1);
    box(sling, 0.04, 0.34, 0.04, mat(r3d, '#6b4330'), 0, 0.1, 0);
    ball(sling, 0.08, mat(r3d, '#2a1a3a', '#6a3a8e', 0.6), 0, 0.3, 0, 1, 1, 1, 0);
    g.userData = { body, sling };
    return own(g);
  },
  // a crab crusted with coral
  reefcrab(r3d) {
    const g = new THREE.Group(), body = grp(g);
    box(body, 0.66, 0.26, 0.5, mat(r3d, '#d86a5a'), 0, 0.28, 0);
    box(body, 0.5, 0.12, 0.4, mat(r3d, '#e88a6a'), 0, 0.46, 0);
    for (const [x, z, c] of [[0.14, 0.08, '#f58ab0'], [-0.18, -0.1, '#ffd46a'], [0.02, -0.14, '#8af0c8'], [-0.08, 0.14, '#c88af0']]) box(body, 0.1, 0.14, 0.1, mat(r3d, c), x, 0.58, z);
    eyes(r3d, body, 0.5, 0.26, 0.1, 0.06, '#fff3a0', '#ffe066');
    const claws = [];
    for (const sx of [-1, 1]) { const c = grp(body, sx * 0.42, 0.34, 0.24); box(c, 0.22, 0.2, 0.26, mat(r3d, '#c8584a'), 0, 0, 0.06); box(c, 0.1, 0.08, 0.16, mat(r3d, '#e8a08a'), sx * 0.04, 0.1, 0.14); claws.push(c); }
    const legs = [];
    for (const z of [0.12, -0.12]) for (const sx of [-1, 1]) legs.push(box(body, 0.2, 0.05, 0.05, mat(r3d, '#b8483a'), sx * 0.42, 0.12, z));
    g.userData = { body, claws, legs };
    return own(g);
  },
  // a drowned sailor: a see-through hooded ghost with a cutlass
  ghost(r3d) {
    const g = new THREE.Group(), body = grp(g);
    const robe = mat(r3d, '#6ac8c0', '#2a8a8a', 0.5, { opacity: 0.7, fresh: true });
    box(body, 0.44, 0.7, 0.36, robe, 0, 0.55, 0);
    box(body, 0.36, 0.3, 0.3, robe, 0, 0.14, -0.04);
    box(body, 0.4, 0.36, 0.38, mat(r3d, '#2a4a58', null, 1, { opacity: 0.85, fresh: true }), 0, 1.02, 0);
    eyes(r3d, body, 0.98, 0.2, 0.08, 0.06, '#dffff8', '#8affe8');
    box(body, 0.46, 0.06, 0.46, mat(r3d, '#3a3040'), 0, 1.22, 0);
    const blade = grp(body, 0.32, 0.6, 0.12);
    box(blade, 0.05, 0.12, 0.05, mat(r3d, '#6b4330'), 0, 0, 0);
    const bl = box(blade, 0.06, 0.06, 0.62, mat(r3d, '#c9d8e0'), 0, 0.04, 0.34);
    bl.rotation.x = -0.1;
    g.userData = { body, blade, robe };
    return own(g);
  },
  // a fat lava slug with glowing cracks
  slug(r3d) {
    const g = new THREE.Group(), body = grp(g);
    ball(body, 0.36, mat(r3d, '#6a2a24'), 0, 0.22, 0, 1, 0.6, 1.5);
    ball(body, 0.24, mat(r3d, '#6a2a24'), 0, 0.36, 0.4, 1, 1, 1);
    for (const [x, z] of [[0.1, 0.1], [-0.12, -0.2], [0.14, -0.35], [-0.08, 0.3]]) box(body, 0.16, 0.03, 0.06, mat(r3d, '#ffb040', '#ff6a1a', 1.5), x, 0.44, z);
    for (const sx of [-0.1, 0.1]) { box(body, 0.03, 0.18, 0.03, mat(r3d, '#6a2a24'), sx, 0.62, 0.46); box(body, 0.07, 0.07, 0.07, mat(r3d, '#fff3a0', '#ffd23a', 1.2), sx, 0.72, 0.46); }
    g.userData = { body };
    return own(g);
  },
  // a crow crackling with storm light
  stormcrow(r3d) {
    const g = new THREE.Group(), body = grp(g);
    ball(body, 0.22, mat(r3d, '#2a2a4a'), 0, 0.3, 0, 0.9, 0.9, 1.3);
    ball(body, 0.14, mat(r3d, '#2a2a4a'), 0, 0.44, 0.24);
    box(body, 0.08, 0.06, 0.16, mat(r3d, '#ffe066', '#ffd23a', 1), 0, 0.42, 0.42);
    eyes(r3d, body, 0.48, 0.36, 0.06, 0.05, '#fff6a0', '#ffe066');
    const wings = [];
    for (const sx of [-1, 1]) {
      const w = grp(body, sx * 0.14, 0.34, 0);
      box(w, 0.5, 0.04, 0.26, mat(r3d, '#3a3a6a'), sx * 0.26, 0, 0);
      box(w, 0.2, 0.05, 0.08, mat(r3d, '#ffe066', '#ffd23a', 1.2), sx * 0.4, 0.01, 0.08);
      wings.push(w);
    }
    g.userData = { body, wings };
    return own(g);
  },
  // a carved gloom totem that shields its friends
  totem(r3d) {
    const g = new THREE.Group(), body = grp(g);
    const stone = ['#5a4a6a', '#6a5a7a', '#4a3a5a'];
    for (let i = 0; i < 3; i++) {
      box(body, 0.5 - i * 0.06, 0.4, 0.5 - i * 0.06, mat(r3d, stone[i]), 0, 0.2 + i * 0.4, 0);
      eyes(r3d, body, 0.26 + i * 0.4, 0.26 - i * 0.03, 0.1, 0.06, '#e8b8ff', '#b86aff');
    }
    for (const sx of [-1, 1]) { const w = box(body, 0.28, 0.08, 0.1, mat(r3d, '#3a2a4a'), sx * 0.34, 0.9, 0); w.rotation.z = sx * 0.4; }
    const flame = grp(body, 0, 1.3, 0);
    box(flame, 0.2, 0.26, 0.2, mat(r3d, '#b86aff', '#8a3aff', 1.4), 0, 0, 0);
    box(flame, 0.1, 0.2, 0.1, mat(r3d, '#f0d8ff', '#d8a8ff', 1.5), 0, 0.12, 0);
    g.userData = { body, flame };
    return own(g);
  },
  // the sandworm: a big segmented body with a round, toothy mouth
  worm(r3d) {
    const g = new THREE.Group(), body = grp(g);
    const segs = [];
    for (let i = 0; i < 5; i++) {
      const s = grp(body, 0, 0, -i * 0.5);
      ball(s, 0.5 - i * 0.05, mat(r3d, i % 2 ? '#a88060' : '#b89070'), 0, 0.4, 0, 1, 1, 0.8);
      box(s, 0.9 - i * 0.1, 0.08, 0.1, mat(r3d, '#6a4a3a'), 0, 0.42, 0.12);
      segs.push(s);
    }
    const mouth = grp(body, 0, 0.45, 0.42);
    box(mouth, 0.6, 0.6, 0.1, mat(r3d, '#3a1a2a'), 0, 0, 0);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const tth = box(mouth, 0.08, 0.14, 0.08, mat(r3d, '#f4efe4'), Math.cos(a) * 0.22, Math.sin(a) * 0.22, 0.06); tth.rotation.z = a; }
    eyes(r3d, body, 0.95, 0.3, 0.2, 0.08, '#ff9aa8', '#ff3a5a');
    g.userData = { body, segs, mouth };
    return own(g);
  },
  // a big white yeti with a blue face
  yeti(r3d) {
    const g = new THREE.Group(), body = grp(g);
    box(body, 0.8, 0.8, 0.6, mat(r3d, '#eef3fb'), 0, 0.72, 0);
    box(body, 0.5, 0.42, 0.42, mat(r3d, '#eef3fb'), 0, 1.3, 0.04);
    box(body, 0.34, 0.26, 0.06, mat(r3d, '#6a9ac8'), 0, 1.28, 0.26);
    eyes(r3d, body, 1.34, 0.3, 0.08, 0.06, '#241a2e', null);
    box(body, 0.18, 0.06, 0.04, mat(r3d, '#2a3a5a'), 0, 1.2, 0.3);
    const arms = [];
    for (const sx of [-1, 1]) { const a = grp(body, sx * 0.5, 1.02, 0); box(a, 0.24, 0.72, 0.26, mat(r3d, '#dde6f4'), 0, -0.32, 0); box(a, 0.26, 0.2, 0.28, mat(r3d, '#6a9ac8'), 0, -0.72, 0); arms.push(a); }
    for (const sx of [-0.2, 0.2]) box(body, 0.26, 0.34, 0.3, mat(r3d, '#dde6f4'), sx, 0.17, 0);
    g.userData = { body, arms };
    return own(g);
  },
};

// the golden glow of an elite: a ring under it and a crown of sparks
export function eliteAura(r3d, r) {
  const m = new THREE.Mesh(new THREE.RingGeometry(r * 1.2, r * 1.45, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd66b, transparent: true, opacity: 0.7, depthWrite: false }));
  m.position.y = 0.04;
  return m;
}
