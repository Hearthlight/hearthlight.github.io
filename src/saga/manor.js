// Hollowmoor Manor’s look (World v7, chapter 9): herringbone parquet under faded rugs,
// walls papered in grey-green with a dado rail, tall doors — and its props: candelabras,
// portraits (the Lady, and a girl with a songbook), dust-sheeted armchairs, a cold hearth.

import { THREE } from '../render/r3d.js';

const TX = 16;
const hash = (x, z) => { const v = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return v - Math.floor(v); };

export const MANOR_THEME = {
  wallH: 3.0, sideH: 2.0, lowH: 0.6,
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
    const rugAt = (tx, tz) => d.rooms.find((r) => r.rug && tx >= r.x + 3 && tx < r.x + r.w - 3 && tz >= r.z + 3 && tz < r.z + r.h - 3);
    for (let Z = 0; Z < H; Z++) for (let X = 0; X < W; X++) {
      const tx = (X / TX) | 0, tz = (Z / TX) | 0, v = d.g[d.I(tx, tz)], i = (Z * W + X) * 4;
      if (v === 0) { set(i, [14, 12, 16]); continue; }
      // herringbone: blocks of 8×2 texels, turned every other row
      const bx = Math.floor((X + (Math.floor(Z / 8) % 2) * 4) / 8), bz = Math.floor(Z / 8), turn = (bx + bz) % 2;
      const u = turn ? X % 8 : Z % 8, w = turn ? Z % 8 : X % 8;
      const tone = [[122, 86, 58], [110, 76, 50], [134, 96, 64]][Math.floor(hash(bx, bz) * 3)];
      const wall = near[d.I(tx, tz)], k = wall < 1.2 ? 0.66 : wall < 2 ? 0.84 : 1;
      set(i, tone, k);
      if (w % 2 === 0 && u > 0) set(i, [80, 54, 36], k);
      if (u === 0) set(i, [70, 48, 32], k);
      // a faded rug in the middle of the rooms that have one
      const R = rugAt(tx, tz);
      if (R) {
        // (a faded red rug: a gold border, a diamond lattice)
        const edge = tx === R.x + 3 || tx === R.x + R.w - 4 || tz === R.z + 3 || tz === R.z + R.h - 4;
        const lx = X % 16, lz = Z % 16, dia = Math.abs(lx - 8) + Math.abs(lz - 8);
        const c = edge ? (X + Z) % 4 < 2 ? [196, 156, 88] : [168, 128, 70] : dia === 7 || dia === 8 ? [196, 150, 96] : dia < 3 ? [150, 70, 64] : [132, 52, 52];
        set(i, c, k * 0.95);
      }
      if (hash(X, Z) > 0.994) set(i, [168, 158, 150], k);   // dust
    }
    ctx.putImageData(img, 0, 0);
  },
  buildWalls(d, walls) {
    const K = d.K, n = walls.length;
    const paper = K.tex('manorwall', 16, 24, (p) => {
      p.rect(0, 0, 16, 24, '#5a6a5a');
      for (let y = 0; y < 16; y += 4) for (let x = (y / 4) % 2 ? 2 : 0; x < 16; x += 4) { p.px(x + 1, y + 1, '#6a7a68'); p.px(x + 2, y + 2, '#6a7a68'); p.px(x + 1, y + 3, '#4a5a4a'); }
      p.rect(0, 15, 16, 2, '#3a2a1e'); p.rect(0, 17, 16, 7, '#4a3424'); for (let x = 0; x < 16; x += 4) p.rect(x, 18, 3, 5, '#5a4030');
      p.rect(0, 0, 16, 1, '#2a2018');
    });
    const plain = K.c('#4a5a4a'), dark = K.c('#2a2018'), trim = K.c('#8a6a4a');
    const box = K.geo('mn-wall', () => new THREE.BoxGeometry(1, 1, 1));
    const mk = (m, cnt) => { const im = new THREE.InstancedMesh(box, m, cnt); im.castShadow = true; im.receiveShadow = true; im.count = 0; d.root.add(im); return im; };
    const tall = mk(paper, n), side = mk(plain, n), low = mk(dark, n), rail = mk(trim, n);
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    const put = (im, x, y, z, w, h, dd) => { p.set(x, y, z); s.set(w, h, dd); im.setMatrixAt(im.count++, M.compose(p, q, s)); };
    for (const [x, z, hgt, south, north] of walls) {
      if (south) { put(tall, x + 0.5, hgt / 2, z + 0.5, 1, hgt, 1); put(rail, x + 0.5, hgt + 0.04, z + 0.9, 1, 0.08, 0.2); }
      else if (north && hgt <= 0.7) put(low, x + 0.5, hgt / 2, z + 0.5, 1, hgt, 0.5);
      else put(side, x + 0.5, hgt / 2, z + 0.5, 1, hgt, 1);
    }
    for (const im of [tall, side, low, rail]) { im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); }
  },
  dress(d) { void d; },
  // tall double doors of dark oak with brass handles, that swing up out of the way
  gate(d, G) {
    const K = d.K, g = K.grp(d.root, G.x, 0, G.z), bars = [];
    const oak = K.c('#4a2e1e'), oakL = K.c('#6a4228'), brass = K.glow('#e0b050', '#a87a2a', 0.3);
    const along = (u, y, o = 0) => (G.horiz ? [u, y, o] : [o, y, u]);
    for (const u of [-G.w / 2 - 0.12, G.w / 2 + 0.12]) bars.push(K.put(g, K.box(0.36, 2.8, 0.36), oak, ...along(u, 1.4)));
    for (const s of [-1, 1]) {
      bars.push(K.put(g, K.box(G.horiz ? G.w / 2 - 0.04 : 0.18, 2.4, G.horiz ? 0.18 : G.w / 2 - 0.04), s < 0 ? oak : oakL, ...along(s * (G.w / 4), 1.2)));
      for (const y of [0.7, 1.7]) K.put(g, K.box(G.horiz ? G.w / 2 - 0.4 : 0.2, 0.7, G.horiz ? 0.2 : G.w / 2 - 0.4), oakL, ...along(s * (G.w / 4), y, 0.02));
      K.put(g, K.ball(0.07, 6, 4), brass, ...along(s * 0.25, 1.2, 0.12));
    }
    K.put(g, K.box(G.horiz ? G.w + 0.6 : 0.5, 0.3, G.horiz ? 0.5 : G.w + 0.6), oak, ...along(0, 2.7));
    G.g = g; G.bars = bars; G.depth = 2.6;
  },
};

export const MANOR_PROPS = {
  // a tall iron candelabra, three candles (a warm pool of light)
  candelabra(K, g, s) {
    const iron = K.c('#2a2430');
    K.put(g, K.cyl(0.25 * s, 0.3 * s, 0.1, 8), iron, 0, 0.05, 0);
    K.put(g, K.box(0.06, 1.5 * s, 0.06), iron, 0, 0.75 * s, 0);
    K.put(g, K.box(0.7 * s, 0.05, 0.05), iron, 0, 1.45 * s, 0);
    const flames = [];
    for (const x of [-0.32, 0, 0.32]) { K.put(g, K.cyl(0.05, 0.05, 0.22 * s, 6), K.c('#f4ecd8'), x * s, 1.58 * s, 0); flames.push(K.noCast(K.put(g, K.cone(0.05, 0.12, 5), K.glow('#fff0a0', '#ffb040', 1.6), x * s, 1.76 * s, 0))); }
    return { light: { y: 1.8 * s, color: '#ffc070', power: 1.1, flicker: true, dist: 6 }, r: 0.3 * s, anim: (tm) => { flames.forEach((f, i) => { f.scale.y = 0.85 + Math.sin(tm * 11 + i * 2) * 0.2; }); } };
  },
  // a portrait in a gilt frame on an easel (its painting chosen by the scale’s sign)
  portrait(K, g, s) {
    const who = s < 0 ? 'girl' : 'lady', sc = Math.abs(s);
    const pic = K.tex('portrait-' + who, 12, 14, (p) => {
      p.rect(0, 0, 12, 14, who === 'girl' ? '#6a4a6a' : '#4a5a6a');
      if (who === 'lady') { p.rect(3, 2, 6, 6, '#e8e4e0'); p.rect(3, 1, 6, 2, '#b8bcc8'); p.rect(4, 4, 1, 1, '#2a2a3a'); p.rect(7, 4, 1, 1, '#2a2a3a'); p.rect(2, 8, 8, 6, '#9aa0b0'); p.rect(3, 8, 6, 1, '#e8eef8'); }
      else { p.rect(3, 2, 6, 6, '#f4e8f0'); p.rect(2, 1, 8, 3, '#1e1624'); p.rect(2, 3, 2, 6, '#1e1624'); p.rect(4, 4, 1, 1, '#241a2e'); p.rect(7, 4, 1, 1, '#241a2e'); p.rect(5, 6, 2, 1, '#c8384e'); p.rect(2, 8, 8, 6, '#7a4a9a'); p.rect(6, 10, 4, 3, '#f4ecd8'); }
    });
    K.put(g, K.box(0.9 * sc, 1.05 * sc, 0.06), pic, 0, 1.4 * sc, 0);
    K.put(g, K.box(1.02 * sc, 1.17 * sc, 0.04), K.c('#c8983e'), 0, 1.4 * sc, -0.04);
    for (const x of [-0.35, 0.35]) K.put(g, K.box(0.06, 1.2 * sc, 0.06), K.c('#4a2e1e'), x * sc, 0.6 * sc, -0.2).rotation.x = 0.15;
    return { r: 0.35 * sc };
  },
  // an armchair under a dust sheet
  dustchair(K, g, s) {
    const sheet = K.c('#d8d4cc');
    K.put(g, K.box(0.8 * s, 0.5 * s, 0.8 * s), sheet, 0, 0.3 * s, 0);
    K.put(g, K.box(0.8 * s, 0.7 * s, 0.2 * s), sheet, 0, 0.75 * s, -0.3 * s);
    for (const x of [-0.4, 0.4]) K.put(g, K.box(0.14 * s, 0.4 * s, 0.8 * s), sheet, x * s, 0.6 * s, 0);
    return { r: 0.45 * s };
  },
  // a cold stone hearth (it lights when the Lady is at peace: userData.lit)
  coldhearth(K, g, s, d) {
    const stone = K.c('#7a7078');
    K.put(g, K.box(2 * s, 1.6 * s, 0.6 * s), stone, 0, 0.8 * s, 0);
    K.put(g, K.box(1.1 * s, 1.0 * s, 0.4 * s), K.c('#1a1418'), 0, 0.5 * s, 0.12 * s);
    K.put(g, K.box(2.3 * s, 0.14 * s, 0.8 * s), K.c('#5a4a4a'), 0, 1.65 * s, 0.05);
    const fire = K.noCast(K.put(g, K.cone(0.35 * s, 0.7 * s, 6), K.glow('#ffd66b', '#ff9a3a', 1.4), 0, 0.4 * s, 0.2 * s));
    fire.visible = false;
    // (the chapter lights it: its fire, and a light pushed into the dungeon’s lights)
    g.userData.light = (on) => {
      fire.visible = on;
      if (on && d && !g.userData.L) { g.userData.L = { x: d.ox + g.position.x, y: 1, z: d.oz + g.position.z + 0.6, color: '#ffa860', power: 1.8, base: 1.8, flicker: true, dist: 9 }; d.lights.push(g.userData.L); }
    };
    return { r: 0.8 * s, anim: (tm) => { if (fire.visible) fire.scale.y = 0.85 + Math.sin(tm * 10) * 0.18; } };
  },
};
