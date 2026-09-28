// The Gloomstage’s look from inside (World v7, chapter 10): blackened stage boards with
// chalk marks, walls hung with violet velvet, gates that are curtains rising — and its
// props: sandbags on ropes, costume racks, a dressing-room mirror ringed with bulbs,
// crates stencilled GLOOM, a painted moon, and the lights a theatre is never without: the
// ghost light (one bare bulb left burning on an empty stage), work lamps, footlights,
// Crumble’s workbench.

import { THREE } from '../render/r3d.js';

const TX = 16;
const hash = (x, z) => { const v = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return v - Math.floor(v); };

export const BACKSTAGE_THEME = {
  wallH: 3.2, sideH: 2.2, lowH: 0.6,
  paintFloor(p, d) {
    const W = d.W * TX, H = d.H * TX, ctx = p.ctx, img = ctx.createImageData(W, H), px = img.data;
    const set = (i, c, k = 1) => { px[i] = c[0] * k; px[i + 1] = c[1] * k; px[i + 2] = c[2] * k; px[i + 3] = 255; };
    const near = new Float32Array(d.W * d.H).fill(9);
    for (let z = 0; z < d.H; z++) for (let x = 0; x < d.W; x++) {
      if (d.g[d.I(x, z)] === 0) continue;
      let m = 9;
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (d.at(x + dx, z + dz) === 0) m = Math.min(m, Math.hypot(dx, dz));
      near[d.I(x, z)] = m;
    }
    for (let Z = 0; Z < H; Z++) for (let X = 0; X < W; X++) {
      const tx = (X / TX) | 0, tz = (Z / TX) | 0, v = d.g[d.I(tx, tz)], i = (Z * W + X) * 4;
      if (v === 0) { set(i, [10, 8, 14]); continue; }
      // long stage boards running north–south, a dark plum-brown and worn
      const col = (X / 6) | 0, off = (hash(col, 5) * 48) | 0, row = ((Z + off) / 48) | 0;
      const c = [[96, 72, 78], [86, 64, 70], [106, 82, 86]][(hash(col, row) * 3) | 0];
      const wall = near[d.I(tx, tz)], k = wall < 1.2 ? 0.72 : wall < 2 ? 0.88 : 1;
      set(i, c, k);
      if (X % 6 === 0 || (Z + off) % 48 === 0) set(i, [58, 42, 50], k);
      else if ((X + 3) % 6 === 0 && hash(col, row + 7) > 0.6) set(i, [102, 78, 84], k);
      if (hash(X, Z) > 0.993) set(i, [150, 130, 138], k);
    }
    ctx.putImageData(img, 0, 0);
    // chalk marks where actors stand: crosses and arrows, the odd « X »
    let h = 1301;
    const rnd = () => { h = (h * 1103515245 + 12345) & 0x7fffffff; return h / 0x7fffffff; };
    for (let z = 0; z < d.H; z++) for (let x = 0; x < d.W; x++) {
      if (d.g[d.I(x, z)] !== 1 || rnd() > 0.02) continue;
      const X = x * TX + 4, Z = z * TX + 4;
      p.rect(X, Z + 3, 7, 1, '#d8d0e0'); p.rect(X + 3, Z, 1, 7, '#d8d0e0');
    }
  },
  buildWalls(d, walls) {
    const K = d.K, n = walls.length;
    const velvet = K.tex('velvet', 16, 24, (p) => {
      p.rect(0, 0, 16, 24, '#5a2a6a');
      for (let x = 0; x < 16; x += 4) { p.rect(x, 0, 1, 24, '#3a1a4a'); p.rect(x + 2, 0, 1, 24, '#7a3a8a'); }
      p.rect(0, 0, 16, 2, '#c89a3a'); p.rect(0, 20, 16, 4, '#2a1030');
    });
    const dark = K.c('#2a1a30'), gold = K.c('#c89a3a');
    const box = K.geo('bs-wall', () => new THREE.BoxGeometry(1, 1, 1));
    const mk = (m, cnt) => { const im = new THREE.InstancedMesh(box, m, cnt); im.castShadow = true; im.receiveShadow = true; im.count = 0; d.root.add(im); return im; };
    const tall = mk(velvet, n), side = mk(dark, n), low = mk(dark, n), rail = mk(gold, n);
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    const put = (im, x, y, z, w, h, dd) => { p.set(x, y, z); s.set(w, h, dd); im.setMatrixAt(im.count++, M.compose(p, q, s)); };
    for (const [x, z, hgt, south, north] of walls) {
      if (south) { put(tall, x + 0.5, hgt / 2, z + 0.5, 1, hgt, 1); put(rail, x + 0.5, hgt + 0.05, z + 0.9, 1, 0.1, 0.2); }
      else if (north && hgt <= 0.7) put(low, x + 0.5, hgt / 2, z + 0.5, 1, hgt, 0.5);
      else put(side, x + 0.5, hgt / 2, z + 0.5, 1, hgt, 1);
    }
    for (const im of [tall, side, low, rail]) { im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); }
  },
  dress(d) { void d; },
  // a curtain across the way, that rises out of sight
  gate(d, G) {
    const K = d.K, g = K.grp(d.root, G.x, 0, G.z), bars = [];
    const red = K.c('#8a1a2a'), redD = K.c('#6a1020'), gold = K.c('#c89a3a');
    const along = (u, y, o = 0) => (G.horiz ? [u, y, o] : [o, y, u]);
    const n = Math.max(4, Math.round(G.w * 2));
    for (let i = 0; i < n; i++) bars.push(K.put(g, K.box(G.horiz ? G.w / n + 0.02 : 0.16, 2.8, G.horiz ? 0.16 : G.w / n + 0.02), i % 2 ? red : redD, ...along(-G.w / 2 + (i + 0.5) * (G.w / n), 1.4, (i % 2) * 0.06)));
    K.put(g, K.box(G.horiz ? G.w + 0.4 : 0.3, 0.18, G.horiz ? 0.3 : G.w + 0.4), gold, ...along(0, 0.1, 0.1));
    // (it flies up into the dark, well out of sight)
    G.g = g; G.bars = bars; G.depth = -40;
  },
};

export const BACKSTAGE_PROPS = {
  // a sandbag hanging from a rope out of the dark above
  sandbag(K, g, s) {
    K.put(g, K.box(0.04, 3, 0.04), K.c('#c8b890'), 0, 2.2 * s + 1.5, 0);
    K.put(g, K.ball(0.3 * s, 7, 5), K.c('#a89060'), 0, 1.9 * s, 0).scale.y = 1.3;
    return null;
  },
  // a costume rack: a rail on two stands, gowns and a cape
  rack(K, g, s) {
    for (const x of [-0.8, 0.8]) K.put(g, K.box(0.06, 1.7 * s, 0.06), K.c('#6a6070'), x * s, 0.85 * s, 0);
    K.put(g, K.box(1.7 * s, 0.05, 0.05), K.c('#6a6070'), 0, 1.7 * s, 0);
    for (const [i, c] of ['#7a3a9a', '#c8303a', '#f2c14e', '#3a5a9a', '#5a2a6a'].entries()) K.put(g, K.cone(0.22 * s, 1.1 * s, 6), K.c(c), -0.6 * s + i * 0.3 * s, 1.12 * s, 0);
    return { r: 0.5 * s };
  },
  // a dressing-room mirror ringed with bulbs (a warm light)
  mirror(K, g, s) {
    K.put(g, K.box(1.2 * s, 0.8 * s, 0.5 * s), K.c('#4a2a3a'), 0, 0.4 * s, 0);
    K.put(g, K.box(1.0 * s, 1.1 * s, 0.06), K.c('#b8c8d8'), 0, 1.4 * s, -0.2);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; K.noCast(K.put(g, K.ball(0.06, 5, 4), K.glow('#fff4c0', '#ffd66b', 1.6), Math.cos(a) * 0.6 * s, 1.4 * s + Math.sin(a) * 0.62 * s, -0.15)); }
    return { light: { y: 1.4 * s, color: '#ffe0a0', power: 1.1, dist: 5 }, r: 0.6 * s };
  },
  // a crate stencilled GLOOM
  gloomcrate(K, g, s) {
    const m = K.tex('gloomcrate', 12, 12, (p) => { p.rect(0, 0, 12, 12, '#6a5040'); p.rect(0, 0, 12, 1, '#4a3428'); p.rect(0, 11, 12, 1, '#4a3428'); p.rect(0, 0, 1, 12, '#4a3428'); p.rect(11, 0, 1, 12, '#4a3428'); for (let x = 2; x < 10; x += 2) p.rect(x, 5, 1, 2, '#2a1030'); });
    K.put(g, K.box(0.9 * s, 0.9 * s, 0.9 * s), m, 0, 0.45 * s, 0);
    return { r: 0.5 * s };
  },
  // a lamp high in the rigging, out of sight: only its warm wash on the boards shows
  wash(K, g, s) { void K; void g; return { light: { y: 5.5, color: '#ffe4b8', power: 1.3 * s, dist: 13 } }; },
  // the ghost light: one bare bulb in a cage on a stand, left burning on an empty stage
  ghostlight(K, g, s) {
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; K.beam(g, K.c('#3a3440'), 0, 0.5 * s, 0, Math.cos(a) * 0.4 * s, 0, Math.sin(a) * 0.4 * s, 0.05); }
    K.put(g, K.cyl(0.04, 0.05, 1.5 * s, 6), K.c('#3a3440'), 0, 1.0 * s, 0);
    K.noCast(K.put(g, K.ball(0.14, 8, 6), K.glow('#fff8e0', '#ffe8a0', 2), 0, 1.85 * s, 0));
    for (let i = 0; i < 4; i++) K.put(g, K.box(0.02, 0.36, 0.02), K.c('#2a2430'), Math.cos(i * 1.57) * 0.16, 1.85 * s, Math.sin(i * 1.57) * 0.16);
    return { light: { y: 1.9 * s, color: '#fff0c8', power: 1.7, dist: 9 }, r: 0.3 };
  },
  // a work lamp: a clamp light on a stand, its shade tipped down
  worklight(K, g, s) {
    K.put(g, K.cyl(0.05, 0.07, 1.9 * s, 6), K.c('#3a3440'), 0, 0.95 * s, 0);
    K.put(g, K.cyl(0.3, 0.3, 0.06, 8), K.c('#3a3440'), 0, 0.03, 0);
    const head = K.grp(g, 0, 1.95 * s, 0.1);
    head.rotation.x = 0.7;
    K.put(head, K.cone(0.26, 0.3, 10), K.c('#8a3a3a'), 0, 0, 0);
    K.noCast(K.put(head, K.ball(0.1, 6, 5), K.glow('#fff4d0', '#ffd890', 1.8), 0, -0.1, 0));
    return { light: { y: 1.8 * s, dz: 0.6, color: '#ffe0a8', power: 1.5, dist: 8.5 }, r: 0.3 };
  },
  // footlights: a row of warm bulbs in a brass trough along the front of a stage
  footlights(K, g, s) {
    const w = 6 * s;
    K.put(g, K.box(w, 0.18, 0.4), K.c('#8a6a2a'), 0, 0.09, 0);
    const bulb = K.glow('#fff4c8', '#ffd66b', 1.6);
    for (let i = 0; i < 9; i++) K.noCast(K.put(g, K.ball(0.09, 6, 5), bulb, -w / 2 + 0.3 + i * ((w - 0.6) / 8), 0.24, 0.05));
    return { light: { y: 0.6, dz: -0.8, color: '#ffe0a0', power: 1.7, dist: 8 }, r: 0 };
  },
  // Crumble’s workbench: tools, a blueprint of a robot, a mug that says BEST HERALD
  workbench(K, g, s) {
    K.put(g, K.box(2 * s, 0.1, 0.9 * s), K.c('#8a6a4a'), 0, 0.9 * s, 0);
    for (const x of [-0.9, 0.9]) for (const z of [-0.35, 0.35]) K.put(g, K.box(0.08, 0.9 * s, 0.08), K.c('#5a4430'), x * s, 0.45 * s, z * s);
    const bp = K.tex('blueprint', 12, 8, (p) => { p.rect(0, 0, 12, 8, '#3a6ab0'); p.rect(4, 1, 4, 4, '#c8e0ff'); p.rect(5, 2, 2, 2, '#3a6ab0'); p.rect(3, 5, 1, 2, '#c8e0ff'); p.rect(8, 5, 1, 2, '#c8e0ff'); p.px(1, 1, '#c8e0ff'); p.px(10, 6, '#c8e0ff'); });
    K.put(g, K.box(0.9 * s, 0.02, 0.6 * s), bp, -0.3 * s, 0.96 * s, 0, 0.2);
    K.put(g, K.box(0.1, 0.1, 0.5), K.c('#8a8a98'), 0.6 * s, 1.0 * s, 0, 0.6);
    K.put(g, K.cyl(0.08, 0.08, 0.16, 8), K.c('#f4ecd8'), 0.75 * s, 1.03 * s, -0.25);
    return { r: 0.9 * s };
  },
  // the stage’s backdrop: a painted night sky (stars, a big moon, a cloud or two) framed by
  // red velvet curtains and a gold-fringed valance
  backdrop(K, g, s) {
    const w = 36 * s;
    const sky = K.tex('backdrop', 96, 16, (p) => {
      const bands = ['#1a1840', '#22205a', '#2a2a6a', '#34347a', '#3e3e86'];
      for (let y = 0; y < 16; y++) p.rect(0, y, 96, 1, bands[Math.min(4, Math.floor(y / 3.4))]);
      let h = 7;
      const rnd = () => { h = (h * 1103515245 + 12345) & 0x7fffffff; return h / 0x7fffffff; };
      for (let i = 0; i < 60; i++) p.px((rnd() * 96) | 0, (rnd() * 12) | 0, rnd() < 0.3 ? '#fff4c0' : '#c8c8f0');
      for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) if (x * x + y * y <= 26) p.px(70 + x, 6 + y, x * x + y * y > 18 ? '#e8dca0' : '#f8f0c8');
      p.px(68, 4, '#e0d498'); p.px(72, 7, '#e0d498'); p.px(69, 8, '#e0d498');
      for (const [cx, cy] of [[20, 11], [44, 12], [86, 12]]) { p.rect(cx - 6, cy, 12, 2, '#5a5a9a'); p.rect(cx - 3, cy - 1, 6, 1, '#5a5a9a'); }
    }, { glowPaint: (q) => { for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) if (x * x + y * y <= 26) q.px(70 + x, 6 + y, '#a09060'); }, intensity: 0.8 });
    K.put(g, K.box(w, 6, 0.1), sky, 0, 3, 0);
    const red = K.c('#a8202e'), redD = K.c('#7a1420'), gold = K.c('#c89a3a');
    for (const sd of [-1, 1]) {
      for (let i = 0; i < 4; i++) K.put(g, K.box(0.5, 6.4, 0.3), i % 2 ? redD : red, sd * (w / 2 - 0.25 - i * 0.45), 3.2, 0.25 + i * 0.05);
      K.put(g, K.box(0.2, 0.2, 0.4), gold, sd * (w / 2 - 1.8), 2.2, 0.5);
    }
    K.put(g, K.box(w + 0.4, 0.9, 0.35), red, 0, 6.2, 0.35);
    for (let i = 0; i < Math.round(w * 2); i++) K.put(g, K.box(0.12, 0.26, 0.06), gold, -w / 2 + 0.25 + i * 0.5, 5.65, 0.52);
    return { r: 0 };
  },
  // (Release v9) the fly tower's catwalks: a grated walkway hung high up on cables, a rail on
  // each side, coils of rope and a work lamp clamped on — `s` tiles long, north–south
  // (`catwalkx`: east–west)
  catwalk(K, g, s) { return walkway(K, g, s, false); },
  catwalkx(K, g, s) { return walkway(K, g, s, true); },
  // a pin rail against the wall: belaying pins with ropes running up into the dark, a
  // counterweight arbor with its iron bricks — `s` tiles long, north–south
  pinrail(K, g, s) {
    const L = s, wood = K.c('#6a4a30'), rope = K.c('#d9c090'), iron = K.c('#4a4450');
    K.put(g, K.box(0.18, 0.18, L), wood, 0, 1.2, 0);
    for (let i = 0; i < Math.round(L * 2); i++) {
      const z = -L / 2 + 0.25 + i * 0.5;
      K.put(g, K.box(0.05, 0.4, 0.05), wood, 0.1, 1.25, z);
      K.beam(g, rope, 0.1, 1.3, z, 0.05 + Math.sin(i) * 0.08, 7.5, z + Math.cos(i) * 0.1, 0.035);
    }
    K.put(g, K.box(0.5, 1.6, 0.4), iron, -0.1, 3.6, L / 2 - 0.6);
    for (let k = 0; k < 4; k++) K.put(g, K.box(0.56, 0.14, 0.46), K.c('#5a5462'), -0.1, 2.95 + k * 0.3, L / 2 - 0.6);
    return { r: 0 };
  },
  // three ropes hanging to the floor from a pulley block high above, a knot at the foot
  ropes(K, g, s) {
    const rope = K.c('#d9c090'), block = K.c('#6a4a30');
    K.put(g, K.box(0.4, 0.3, 0.3), block, 0, 6.8 * s, 0);
    for (const [x, z] of [[-0.15, 0], [0.15, 0.08], [0, -0.14]]) { K.beam(g, rope, x, 0.05, z, x * 0.4, 6.7 * s, z * 0.4, 0.04); K.put(g, K.ball(0.07, 6, 4), rope, x, 0.2, z); }
    return { r: 0.15 };
  },
  // the orchestra pit, in front of the stage: a sunken dark floor behind a low wooden wall,
  // music stands and chairs, a cello, the timpani, a harp — and the orchestra of nobody:
  // notes rising by themselves, now and then (`s` tiles wide, east–west)
  orchestra(K, g, s) {
    const W = s, dark = K.c('#140c18'), wood = K.c('#5a3a2a'), rim = K.c('#c89a3a'), black = K.c('#2a2430');
    K.noCast(K.put(g, K.box(W, 0.02, 1.8), dark, 0, 0.012, 0));
    K.put(g, K.box(W, 0.5, 0.16), wood, 0, 0.25, 0.9);
    K.put(g, K.box(W, 0.05, 0.2), rim, 0, 0.52, 0.9);
    const n = Math.max(2, Math.round(W / 1.6));
    for (let i = 0; i < n; i++) {
      const x = -W / 2 + 0.8 + i * ((W - 1.6) / Math.max(1, n - 1));
      K.put(g, K.box(0.04, 0.9, 0.04), black, x, 0.45, -0.2);
      K.put(g, K.box(0.36, 0.26, 0.03), black, x, 0.9, -0.12, 0, -0.5);
      K.put(g, K.box(0.34, 0.05, 0.34), wood, x + 0.1, 0.36, -0.6);
      K.put(g, K.box(0.34, 0.4, 0.05), wood, x + 0.1, 0.55, -0.78);
      const kind = i % 3;
      if (kind === 0) { K.put(g, K.ball(0.26, 8, 6), K.c('#8a4a2a'), x + 0.35, 0.55, -0.45).scale.set(0.8, 1.3, 0.45); K.put(g, K.box(0.05, 0.7, 0.05), K.c('#3a2418'), x + 0.35, 1.05, -0.45); }
      else if (kind === 1) { const t2 = K.put(g, K.cyl(0.32, 0.22, 0.34, 12), K.c('#c87a3a'), x + 0.35, 0.3, -0.45); void t2; K.put(g, K.cyl(0.33, 0.33, 0.03, 12), K.c('#f4ecd8'), x + 0.35, 0.48, -0.45); }
      else { K.beam(g, rim, x + 0.25, 0.05, -0.45, x + 0.4, 1.25, -0.5, 0.05); K.beam(g, rim, x + 0.4, 1.25, -0.5, x + 0.72, 0.9, -0.45, 0.06); for (let k = 0; k < 4; k++) K.beam(g, K.c('#f4e8c0'), x + 0.3 + k * 0.08, 0.15 + k * 0.05, -0.47, x + 0.42 + k * 0.07, 1.15 - k * 0.07, -0.49, 0.012); }
    }
    // the conductor's podium, and a baton left on it
    K.put(g, K.box(0.7, 0.3, 0.7), rim, 0, 0.15, -0.95);
    K.put(g, K.box(0.03, 0.03, 0.45), K.c('#f4f0e8'), 0.1, 0.33, -0.95, 0.4);
    const notes = [];
    for (let k = 0; k < 4; k++) { const q = K.noCast(K.put(g, K.box(0.12, 0.16, 0.02), K.glow('#e8c0ff', '#b88cf0', 1.2), 0, -5, 0)); notes.push({ q, t: k * 1.3, x: -W / 2 + Math.random() * W }); }
    return {
      light: { y: 0.8, color: '#b88cf0', power: 0.7, dist: 5 }, r: 0,
      anim: (tm, dt) => { for (const N of notes) { N.t += dt || 0.016; const k = (N.t % 5.2) / 5.2; if (k < 0.02) N.x = -W / 2 + 0.5 + Math.random() * (W - 1); N.q.position.set(N.x, 0.6 + k * 3.2, -0.3 + Math.sin(k * 9) * 0.2); N.q.visible = k < 0.8; } },
    };
  },
  // a painted cardboard moon on a stick
  paintedmoon(K, g, s) {
    K.put(g, K.box(0.08, 2.2 * s, 0.08), K.c('#4a3220'), 0, 1.1 * s, 0);
    const m = K.put(g, K.cyl(0.7 * s, 0.7 * s, 0.06, 18), K.glow('#f4e8b0', '#c8b060', 0.3), 0, 2.3 * s, 0, 0, Math.PI / 2);
    void m;
    return { r: 0.2 };
  },
};

// a catwalk high in the fly tower (along z, or along x): grating, rails, the cables it hangs
// from, a coil of rope, a clamp lamp
function walkway(K, g, s, alongX) {
  const L = s, y = 3.3, steel = K.c('#4a4252'), brass = K.c('#c8a050'), toe = K.c('#8a765e'), rope = K.c('#d9c090');
  // (the grating: a steel plate punched in squares, one per tile along the walk)
  const grate = K.tex('catgrate' + (alongX ? 'x' : 'z') + L, 8, 8, (p) => {
    p.rect(0, 0, 8, 8, '#8a8296'); p.rect(0, 0, 8, 1, '#a49cae'); p.rect(0, 7, 8, 1, '#5e566a');
    for (let j = 1; j < 7; j += 2) for (let i = 1; i < 7; i += 2) p.rect(i, j, 1, 1, '#2a2432');
  }, { rx: alongX ? L : 1, ry: alongX ? 1 : L });
  const put = (w, h, d, m, a, b, c) => (alongX ? K.put(g, K.box(d, h, w), m, c, b, a) : K.put(g, K.box(w, h, d), m, a, b, c));
  put(1.1, 0.08, L, grate, 0, y, 0);
  for (const sd of [-1, 1]) {
    put(0.04, 0.16, L, toe, sd * 0.56, y + 0.1, 0);
    put(0.06, 0.06, L, brass, sd * 0.55, y + 0.8, 0);
    put(0.04, 0.04, L, steel, sd * 0.55, y + 0.42, 0);
    const n = Math.max(1, Math.round(L / 1.5));
    for (let i = 0; i <= n; i++) {
      const c = -L / 2 + i * (L / n);
      put(0.06, 0.8, 0.06, steel, sd * 0.55, y + 0.4, c);
      if (i % 2 === 0) { if (alongX) K.beam(g, steel, c, y + 0.8, sd * 0.55, c, 8, sd * 0.35, 0.03); else K.beam(g, steel, sd * 0.55, y + 0.8, c, sd * 0.35, 8, c, 0.03); }
    }
  }
  if (alongX) K.put(g, K.cyl(0.22, 0.22, 0.12, 10), rope, L * 0.25, y + 0.1, 0); else K.put(g, K.cyl(0.22, 0.22, 0.12, 10), rope, 0, y + 0.1, L * 0.25);
  // work lamps clamped under it, every few tiles: warm pools on the boards below
  const bulb = K.glow('#fff4d0', '#ffd890', 1.6), shade = K.c('#8a3a3a');
  for (let c = -L / 2 + 2.5; c < L / 2 - 1; c += 5) {
    const lamp = alongX ? K.grp(g, c, y - 0.12, 0.58) : K.grp(g, 0.58, y - 0.12, c);
    K.put(lamp, K.cone(0.2, 0.26, 8), shade, 0, 0, 0, 0, Math.PI);
    K.noCast(K.put(lamp, K.ball(0.08, 6, 4), bulb, 0, -0.12, 0));
  }
  return { light: { y: y - 0.4, color: '#ffd9a0', power: 1.0, dist: Math.min(9, 3 + L / 3) } };
}
