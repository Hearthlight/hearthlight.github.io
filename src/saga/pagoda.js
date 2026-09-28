// The Lantern Pagoda’s look (World v7, chapter 7): a dungeon theme for saga/dungeon.js
// — polished plank floors with a red runner up every floor, lacquered walls with
// paper windows facing the camera, vermilion doors studded with gold — and its
// props: paper lanterns, a gong, incense, hanging scrolls, a bonsai, a tea table.

import { THREE } from '../render/r3d.js';

const TX = 16;
const hash = (x, z) => { const v = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return v - Math.floor(v); };

export const PAGODA_THEME = {
  wallH: 2.8, sideH: 1.9, lowH: 0.6,
  paintFloor(p, d) {
    const W = d.W * TX, H = d.H * TX, ctx = p.ctx, img = ctx.createImageData(W, H), px = img.data;
    const WOOD = [[112, 62, 38], [124, 70, 44], [102, 56, 34], [132, 78, 48]];
    const set = (i, c, k = 1) => { px[i] = c[0] * k; px[i + 1] = c[1] * k; px[i + 2] = c[2] * k; px[i + 3] = 255; };
    const near = new Float32Array(d.W * d.H).fill(9);
    for (let z = 0; z < d.H; z++) for (let x = 0; x < d.W; x++) {
      if (d.g[d.I(x, z)] === 0) continue;
      let m = 9;
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (d.at(x + dx, z + dz) === 0) m = Math.min(m, Math.hypot(dx, dz));
      near[d.I(x, z)] = m;
    }
    // (the runners: a red carpet with a gold edge up the middle of each room)
    const runner = (X, Z) => {
      const tx = X / TX, tz = Z / TX;
      for (const r of d.rooms) {
        if (r.tiles) continue;
        const cx = r.x + r.w / 2, hw = r.runnerW || 1.6;
        if (tz >= r.z + 0.6 && tz < r.z + r.h - 0.6 && Math.abs(tx - cx) < hw) return Math.abs(tx - cx) > hw - 0.25 ? 2 : 1;
      }
      return 0;
    };
    for (let Z = 0; Z < H; Z++) for (let X = 0; X < W; X++) {
      const tx = (X / TX) | 0, tz = (Z / TX) | 0, v = d.g[d.I(tx, tz)], i = (Z * W + X) * 4;
      if (v === 0) { set(i, [16, 10, 12]); continue; }
      // planks running east–west, four to a tile, their ends staggered
      const row = (Z / 4) | 0, off = (hash(row, 3) * 40) | 0, col = ((X + off) / 40) | 0;
      const c = WOOD[(hash(row, col) * 4) | 0];
      const wall = near[d.I(tx, tz)], k = wall < 1.2 ? 0.66 : wall < 2 ? 0.84 : 1;
      set(i, c, k);
      if (Z % 4 === 0) set(i, [70, 38, 24], k);
      else if ((X + off) % 40 === 0) set(i, [80, 44, 28], k);
      else if (hash(X, Z) > 0.985) set(i, [150, 96, 60], k);
      const rn = runner(X, Z);
      if (rn === 1) set(i, (X + Z) % 7 === 0 ? [176, 48, 44] : [160, 38, 38], k);
      else if (rn === 2) set(i, [226, 180, 80], k);
      // (the roof: glazed green tiles in rows, under the open sky)
      const rf = d.rooms.find((r) => r.tiles && tx >= r.x && tx < r.x + r.w && tz >= r.z && tz < r.z + r.h);
      if (rf) { const u = X % 8, w = Z % 6, c2 = (hash((X / 8) | 0, (Z / 6) | 0) * 3) | 0; set(i, w === 0 ? [40, 70, 62] : u === 0 ? [52, 92, 80] : [[70, 128, 108], [78, 140, 118], [64, 118, 100]][c2], 1); if (w === 1 && u > 1 && u < 6) set(i, [110, 176, 150], 1); }
    }
    ctx.putImageData(img, 0, 0);
  },
  buildWalls(d, walls) {
    const K = d.K, n = walls.length;
    const shoji = K.tex('pagodawall', 16, 24, (p) => {
      p.rect(0, 0, 16, 24, '#a8302a');
      p.rect(0, 0, 16, 2, '#3a2418'); p.rect(0, 22, 16, 2, '#3a2418');
      p.rect(2, 5, 12, 12, '#3a2418'); p.rect(3, 6, 10, 10, '#f4ecd8');
      for (const q of [6, 9]) { p.rect(q, 6, 1, 10, '#6a4a30'); p.rect(3, q + 1, 10, 1, '#6a4a30'); }
      p.rect(0, 19, 16, 1, '#e0a840');
    }, { glowPaint: (q) => q.rect(3, 6, 10, 10, '#806040'), intensity: 0.5 });
    const lacq = K.c('#a8302a'), dark = K.c('#3a2418'), gold = K.c('#e0a840');
    const box = K.geo('pg-wall', () => new THREE.BoxGeometry(1, 1, 1));
    const mk = (m, cnt) => { const im = new THREE.InstancedMesh(box, m, cnt); im.castShadow = true; im.receiveShadow = true; im.count = 0; d.root.add(im); return im; };
    const tall = mk(shoji, n), side = mk(lacq, n), low = mk(dark, n), posts = mk(dark, n), trim = mk(gold, n);
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    const put = (im, x, y, z, w, h, dd) => { p.set(x, y, z); s.set(w, h, dd); im.setMatrixAt(im.count++, M.compose(p, q, s)); };
    for (const [x, z, hgt, south, north] of walls) {
      if (south) {
        put(tall, x + 0.5, hgt / 2, z + 0.5, 1, hgt, 1);
        if ((x + z) % 3 === 0) put(posts, x + 0.5, hgt / 2 + 0.05, z + 1.02, 0.18, hgt + 0.1, 0.1);
        put(trim, x + 0.5, hgt + 0.04, z + 0.9, 1, 0.08, 0.2);
      } else if (north && hgt <= 0.7) {
        put(low, x + 0.5, hgt / 2, z + 0.5, 1, hgt, 0.5);
        if (x % 2 === 0) put(posts, x + 0.5, hgt + 0.1, z + 0.5, 0.14, 0.3, 0.14);
      } else put(side, x + 0.5, hgt / 2, z + 0.5, 1, hgt, 1);
    }
    for (const im of [tall, side, low, posts, trim]) { im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); }
  },
  dress(d) { void d; },
  // vermilion double doors, studded with gold, that sink into the floor
  gate(d, G) {
    const K = d.K, g = K.grp(d.root, G.x, 0, G.z), bars = [];
    const red = K.c('#b8302a'), redD = K.c('#8a2420'), gold = K.glow('#f2c14e', '#c89020', 0.3), dark = K.c('#3a2418');
    const along = (u, y, o = 0) => (G.horiz ? [u, y, o] : [o, y, u]);
    for (const u of [-G.w / 2 - 0.12, G.w / 2 + 0.12]) bars.push(K.put(g, K.box(0.4, 2.7, 0.4), dark, ...along(u, 1.35)));
    for (const s of [-1, 1]) {
      const leaf = K.put(g, K.box(G.horiz ? G.w / 2 - 0.04 : 0.2, 2.3, G.horiz ? 0.2 : G.w / 2 - 0.04), s < 0 ? red : redD, ...along(s * (G.w / 4), 1.15));
      bars.push(leaf);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) K.put(g, K.ball(0.05, 5, 4), gold, ...along(s * (G.w / 4) + (c - 1) * (G.w / 8), 0.5 + r * 0.65, 0.12));
      K.put(g, K.cyl(0.12, 0.12, 0.04, 8), gold, ...along(s * 0.2, 1.2, 0.12), 0, Math.PI / 2, 0);
    }
    K.put(g, K.box(G.horiz ? G.w + 0.6 : 0.5, 0.3, G.horiz ? 0.5 : G.w + 0.6), red, ...along(0, 2.55));
    G.g = g; G.bars = bars; G.depth = 2.6;
  },
};

export const PAGODA_PROPS = {
  // a red paper lantern on a black post (a warm pool of light)
  plantern(K, g, s) {
    K.put(g, K.box(0.1, 1.8 * s, 0.1), K.c('#2a1a14'), 0, 0.9 * s, 0);
    K.put(g, K.box(0.5 * s, 0.06, 0.06), K.c('#2a1a14'), 0.2 * s, 1.78 * s, 0);
    const L = K.grp(g, 0.42 * s, 1.36 * s, 0);
    const body = K.noCast(K.put(L, K.ball(0.26 * s, 10, 8), K.glow('#e8483a', '#ff6a3a', 0.9), 0, 0, 0));
    body.scale.set(1, 1.2, 1);
    for (const y of [-0.3, 0.3]) K.put(L, K.cyl(0.13 * s, 0.13 * s, 0.07, 8), K.c('#2a1a14'), 0, y * s, 0);
    K.noCast(K.put(L, K.box(0.03, 0.2 * s, 0.03), K.c('#f2c14e'), 0, -0.44 * s, 0));
    return { light: { y: 1.4 * s, dx: 0.42 * s, color: '#ff9a60', power: 1.3, flicker: true, dist: 6.5 }, r: 0.2, anim: (tm) => { L.rotation.z = Math.sin(tm * 1.3 + g.position.x) * 0.06; } };
  },
  // a bronze gong in a lacquered frame
  gong(K, g, s) {
    const red = K.c('#a8302a'), gold = K.glow('#e0a840', '#c89020', 0.25);
    for (const x of [-0.7, 0.7]) K.put(g, K.box(0.14, 1.9 * s, 0.14), red, x * s, 0.95 * s, 0);
    K.put(g, K.box(1.7 * s, 0.14, 0.18), red, 0, 1.9 * s, 0);
    K.put(g, K.cyl(0.55 * s, 0.55 * s, 0.08, 18), gold, 0, 1.15 * s, 0, 0, Math.PI / 2);
    K.put(g, K.cyl(0.18 * s, 0.18 * s, 0.1, 12), K.c('#a8782a'), 0, 1.15 * s, 0.03, 0, Math.PI / 2);
    return { r: 0.45 * s };
  },
  // a bronze incense burner, a thread of smoke
  incense(K, g, s, d) {
    K.put(g, K.cyl(0.32 * s, 0.24 * s, 0.4 * s, 10), K.c('#8a6a3a'), 0, 0.4 * s, 0);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; K.put(g, K.box(0.06, 0.24 * s, 0.06), K.c('#6a4a2a'), Math.cos(a) * 0.2 * s, 0.12 * s, Math.sin(a) * 0.2 * s); }
    K.put(g, K.cone(0.2 * s, 0.24 * s, 8), K.c('#a8823a'), 0, 0.72 * s, 0);
    let tt = 0;
    return { r: 0.3 * s, anim: (tm, dt) => { tt -= dt || 0.016; if (tt <= 0 && d) { tt = 0.4; d.P.world.fx.emit('smoke', d.ox + g.position.x, 0.9 * s, d.oz + g.position.z, 1, { color: '#d8d0e0' }); } } };
  },
  // a hanging scroll: a mountain, a sun, a line of ink
  scroll(K, g, s) {
    const m = K.tex('pgscroll', 10, 20, (p) => {
      p.rect(0, 0, 10, 20, '#efe4c8'); p.rect(0, 0, 10, 1, '#6a3a24'); p.rect(0, 19, 10, 1, '#6a3a24');
      p.rect(3, 3, 3, 3, '#c8383e'); for (let x = 1; x < 9; x++) p.rect(x, 13 - Math.min(x, 9 - x), 1, 4 + Math.min(x, 9 - x), '#4a5a6a');
      p.rect(5, 8, 1, 3, '#2a2433');
    });
    K.put(g, K.box(0.62 * s, 1.24 * s, 0.03), m, 0, 1.5 * s, 0);
    K.put(g, K.cyl(0.03, 0.03, 0.74 * s, 6), K.c('#6a3a24'), 0, 2.14 * s, 0, 0, 0, Math.PI / 2);
    return null;
  },
  // a little pine in a blue pot
  bonsai(K, g, s) {
    K.put(g, K.cyl(0.3 * s, 0.24 * s, 0.26 * s, 8), K.c('#3a5a9a'), 0, 0.13 * s, 0);
    K.put(g, K.cyl(0.05, 0.08, 0.5 * s, 5), K.c('#6a4a30'), 0.05, 0.5 * s, 0, 0, 0, 0.4);
    for (const [x, y, z, r] of [[0.2, 0.72, 0, 0.22], [-0.12, 0.62, 0.05, 0.18], [0.02, 0.86, -0.05, 0.16]]) K.put(g, K.ball(r * s, 7, 5), K.c('#4a8a4a'), x * s, y * s, z * s).scale.y = 0.6;
    return { r: 0.3 * s };
  },
  // a low tea table with two cups
  teatable(K, g, s) {
    K.put(g, K.box(1.1 * s, 0.1, 0.7 * s), K.c('#4a2a1a'), 0, 0.36 * s, 0);
    for (const [x, z] of [[-0.45, -0.25], [0.45, -0.25], [-0.45, 0.25], [0.45, 0.25]]) K.put(g, K.box(0.08, 0.34 * s, 0.08), K.c('#3a2014'), x * s, 0.17 * s, z * s);
    for (const x of [-0.2, 0.22]) K.put(g, K.cyl(0.07, 0.06, 0.1, 8), K.c('#e8e0d0'), x * s, 0.46 * s, 0);
    K.put(g, K.ball(0.12 * s, 8, 6), K.c('#6a8a5a'), 0, 0.52 * s, 0.1);
    return { r: 0.55 * s };
  },
};
