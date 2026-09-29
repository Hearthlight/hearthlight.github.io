// Interior furniture & fittings. Boxy toon models with painted pixel faces.
// Each builder returns { obj, size:[w,d] (tiles), solid:bool, light?, interact? }.

import { THREE, pixelTexture, toon } from '../render/r3d.js';
import { Painter, paintWood, paintPlanks, paintWall } from '../art/surfaces.js';
import { ramp, mix as mixHex } from '../engine/color.js';
import { softBoxGeo, bakeMeshes } from './geom.js';
import { rng } from '../engine/util.js';

let R = null;
const cache = {};
function M(key, fn) {
  if (!cache[key]) cache[key] = fn();
  return cache[key];
}
const col = (c) => M('c' + c, () => toon(R, { color: c }));
const tex = (key, painter, opts = {}) => M('t' + key, () => toon(R, { map: pixelTexture(painter()), ...opts }));

function mk(w, h, d, mat, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}
// box whose +z face gets a special material
function front(w, h, d, side, face, x, y, z, parent) {
  return mk(w, h, d, [side, side, side, side, face, side], x, y, z, parent);
}

function woodMat(c = '#8e5d3e') {
  return M('wood' + c, () => toon(R, { map: pixelTexture(paintWood(16, 16, c, { seed: 5 }), { repeat: true }) }));
}

// Painted fronts ------------------------------------------------------------
function shelfFront(w, h, kind) {
  const p = new Painter(w, h);
  const W = ramp('#7a5238');
  p.rect(0, 0, w, h, W.m);
  p.rect(1, 1, w - 2, h - 2, W.o);
  const r = rng(w * 31 + h + kind.length);
  const rows = Math.floor((h - 2) / 7);
  for (let i = 0; i < rows; i++) {
    const y = 1 + i * 7;
    p.hline(1, y + 6, w - 2, W.l);
    let x = 2;
    while (x < w - 3) {
      if (kind === 'books') {
        const bw = 1 + Math.floor(r() * 2), bh = 3 + Math.floor(r() * 3);
        const bc = ['#c8454f', '#4e73b6', '#5fa453', '#e0a526', '#8a64b8', '#e97d8f', '#f4efe4'][Math.floor(r() * 7)];
        p.rect(x, y + 6 - bh, bw, bh, bc);
        p.px(x, y + 6 - bh, '#ffffff33');
        x += bw + (r() < 0.2 ? 1 : 0);
      } else if (kind === 'bread') {
        p.rect(x, y + 3, 4, 3, '#d9a05a'); p.hline(x, y + 3, 4, '#f0c887'); p.px(x + 1, y + 4, '#b8763a');
        x += 5;
      } else if (kind === 'jars') {
        const jc = ['#e0463f', '#f2c14e', '#7fbf5a', '#b9a2e3'][Math.floor(r() * 4)];
        p.rect(x, y + 2, 3, 4, '#dcecf7'); p.rect(x, y + 3, 3, 3, jc); p.hline(x, y + 1, 3, '#8e5d3e');
        x += 4;
      } else if (kind === 'seeds') {
        const sc = ['#f4a4b6', '#ffd66b', '#9fd0f5', '#b5de7a', '#f28a6b'][Math.floor(r() * 5)];
        p.rect(x, y + 1, 4, 5, '#fbf1dc'); p.rect(x + 1, y + 2, 2, 2, sc); p.hline(x, y + 5, 4, '#c9a77c');
        x += 5;
      } else if (kind === 'tools') {
        p.vline(x + 1, y + 1, 5, '#6b4330'); p.rect(x, y + 1, 3, 2, '#9a95a0');
        x += 4;
      } else if (kind === 'fish') {
        p.rect(x, y + 3, 5, 2, '#7cb6e0'); p.px(x + 5, y + 3, '#4e73b6'); p.px(x + 5, y + 4, '#4e73b6'); p.px(x + 1, y + 3, '#ffffff');
        x += 7;
      } else if (kind === 'bottles') {
        const bc = ['#8fd6b4', '#7cb6e0', '#9fd6c8', '#b9a2e3'][Math.floor(r() * 4)];
        p.rect(x, y + 2, 3, 4, bc); p.px(x + 1, y + 1, '#8e5d3e'); p.px(x + 1, y + 3, '#fbf1dc');
        x += 4;
      } else if (kind === 'cups') {
        p.rect(x, y + 3, 3, 3, '#f4efe4'); p.px(x + 3, y + 4, '#f4efe4'); p.hline(x, y + 3, 3, '#ffffff');
        x += 4;
      } else x += 4;
    }
  }
  return p.c;
}

// rugs: a braided oval (a stadium, its rings a constant width), a rectangle with a fringe
function braidRug(W, H, color) {
  const p = new Painter(W, H), c = ramp(color), cream = '#f4e6c8';
  const r = H / 2, half = Math.max(0, W / 2 - r);
  const cols = [c.d, c.m, c.l, c.m, cream, c.m, c.d, c.l];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = Math.max(0, Math.abs(x + 0.5 - W / 2) - half), dy = y + 0.5 - H / 2, d = Math.hypot(dx, dy);
    if (d > r) continue;
    const ring = Math.floor((r - d) / 2), base = ring === 0 ? c.o : cols[ring % cols.length];
    // (the braid's twist: every other stitch along the ring a shade darker)
    const along = Math.floor((Math.atan2(dy, dx || (x < W / 2 ? -0.01 : 0.01)) * r + (dx ? 0 : x)) / 1.5);
    p.px(x, y, (along + ring) % 2 ? base : mixHex(base, c.o, 0.22));
  }
  return p.c;
}
function flatRug(W, H, F, color) {
  const p = new Painter(W + F * 2, H), c = ramp(color), cream = '#f4e6c8', X = F;
  p.rect(X, 0, W, H, c.o);
  p.rect(X + 1, 1, W - 2, H - 2, c.d);
  for (let x = X + 2; x < X + W - 2; x += 2) { p.px(x, 2, c.l); p.px(x + 1, H - 3, c.l); }
  for (let y = 2; y < H - 2; y += 2) { p.px(X + 2, y + 1, c.l); p.px(X + W - 3, y, c.l); }
  p.rect(X + 4, 4, W - 8, H - 8, cream);
  p.rect(X + 5, 5, W - 10, H - 10, c.m);
  // the medallion: a diamond, its heart light
  const cx = X + W / 2, cy = H / 2, rr = Math.min(W, H) / 2 - 7;
  for (let y = 5; y < H - 5; y++) for (let x = X + 5; x < X + W - 5; x++) {
    const k = Math.abs(x + 0.5 - cx) / (rr * 1.4) + Math.abs(y + 0.5 - cy) / rr;
    if (k < 1) p.px(x, y, k > 0.78 ? cream : k < 0.3 ? c.h : c.l);
  }
  for (const [x, y] of [[X + 7, 7], [X + W - 8, 7], [X + 7, H - 8], [X + W - 8, H - 8]]) { p.px(x, y, cream); p.px(x - 1, y, c.l); p.px(x + 1, y, c.l); p.px(x, y - 1, c.l); p.px(x, y + 1, c.l); }
  for (let y = 1; y < H - 1; y += 2) { p.hline(0, y, F, cream); p.hline(X + W, y, F, cream); }
  return p.c;
}
// a small piece merged into as few draws as it has materials (the new clutter)
const baked = (g) => { bakeMeshes(g, M('vc', () => toon(R, { color: 0xffffff, vertexColors: true, key: 'p-vc' }))); return g; };
const cyl = (rt, rb, h, mat, x, y, z, parent, seg = 8) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); parent.add(m); return m; };
const ball = (r, mat, x, y, z, parent, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); parent.add(m); return m; };
const painted = (key, w, h, fn, opts = {}) => M('pt' + key, () => { const p = new Painter(w, h); fn(p); return toon(R, { map: pixelTexture(p.c), ...opts }); });

// Builders -------------------------------------------------------------------
export const FURN = {
  bed(o) {
    const g = new THREE.Group();
    const blanket = ramp(o.color || '#d06b8e');
    mk(1.0, 0.35, 1.9, woodMat('#7a5238'), 0, 0.18, 0, g);
    mk(0.9, 0.12, 1.8, col('#f4efe4'), 0, 0.41, 0.02, g);
    const bp = new Painter(15, 22);
    bp.rect(0, 0, 15, 22, blanket.m);
    for (let y = 2; y < 22; y += 4) bp.hline(0, y, 15, blanket.l);
    for (let x = 3; x < 15; x += 5) bp.vline(x, 0, 22, blanket.d);
    bp.hline(0, 0, 15, blanket.h);
    const bm = toon(R, { map: pixelTexture(bp.c) });
    mk(0.94, 0.08, 1.3, [bm, bm, bm, bm, col(blanket.d), bm], 0, 0.5, 0.32, g);
    mk(0.7, 0.12, 0.34, col('#ffffff'), 0, 0.53, -0.66, g);
    mk(1.02, 0.7, 0.1, woodMat('#6b4330'), 0, 0.45, -0.95, g);
    return { obj: g, size: [1, 2], solid: true, interact: { kind: 'bed' } };
  },
  table(o) {
    const g = new THREE.Group();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 14), woodMat('#a8744a'));
    top.position.y = 0.62; top.castShadow = top.receiveShadow = true; g.add(top);
    mk(0.1, 0.6, 0.1, woodMat('#6b4330'), 0, 0.3, 0, g);
    mk(0.5, 0.05, 0.5, woodMat('#6b4330'), 0, 0.03, 0, g);
    if (o.cloth) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.6, 0.12, 14), col(o.cloth)); c.position.y = 0.62; g.add(c); }
    if (o.items) for (const [x, z, c] of o.items) mk(0.14, 0.12, 0.14, col(c), x, 0.72, z, g);
    return { obj: g, size: [1, 1], solid: true };
  },
  longtable(o) {
    const g = new THREE.Group();
    mk(o.w || 2, 0.08, 0.9, woodMat('#a8744a'), 0, 0.62, 0, g);
    for (const x of [-(o.w || 2) / 2 + 0.12, (o.w || 2) / 2 - 0.12]) for (const z of [-0.35, 0.35]) mk(0.08, 0.6, 0.08, woodMat('#6b4330'), x, 0.3, z, g);
    if (o.items) for (const [x, z, c] of o.items) mk(0.16, 0.1, 0.12, col(c), x, 0.71, z, g);
    return { obj: g, size: [o.w || 2, 1], solid: true };
  },
  chair(o) {
    const g = new THREE.Group();
    const wm = woodMat(o.color || '#8e5d3e');
    mk(0.42, 0.06, 0.42, wm, 0, 0.36, 0, g);
    for (const x of [-0.17, 0.17]) for (const z of [-0.17, 0.17]) mk(0.06, 0.36, 0.06, wm, x, 0.18, z, g);
    mk(0.42, 0.4, 0.06, wm, 0, 0.6, -0.18, g);
    if (o.rot) g.rotation.y = o.rot;
    return { obj: g, size: [1, 1], solid: false, interact: { kind: 'sit' } };
  },
  stool(o) {
    const g = new THREE.Group();
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 10), col(o.color || '#d06b8e'));
    s.position.y = 0.46; g.add(s);
    mk(0.06, 0.44, 0.06, col('#4b4854'), 0, 0.22, 0, g);
    return { obj: g, size: [1, 1], solid: false };
  },
  // a rug painted at 16 texels a unit, its outline in the pixels: an oval braided rag rug (rings of
  // a constant width, twisted, a cream ring now and then), or a rectangular one with its border, a
  // medallion, corner motifs and a fringe at each end
  rug(o) {
    const g = new THREE.Group();
    const round = o.round !== false;
    const rx = o.rx || (round ? 1.1 : 1), rz = o.rz || (round ? 0.8 : 0.75);
    const W = Math.round(rx * 32), H = Math.round(rz * 32), F = round ? 0 : 3;
    const m = new THREE.Mesh(new THREE.PlaneGeometry((W + F * 2) / 16, H / 16), M('rug' + o.color + W + 'x' + H + round, () => toon(R, { map: pixelTexture(round ? braidRug(W, H, o.color || '#d9a05a') : flatRug(W, H, F, o.color || '#c8454f')), alphaTest: 0.5 })));
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.012;
    m.receiveShadow = true;
    g.add(m);
    return { obj: g, size: [2, 2], solid: false, flat: true };
  },
  plant(o) {
    const g = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.3, 8), col('#c8704a'));
    pot.position.y = 0.15; pot.castShadow = true; g.add(pot);
    const leaf = col(o.color || '#5fa453');
    for (const [x, y, z, s] of [[0, 0.55, 0, 0.26], [-0.14, 0.45, 0.08, 0.18], [0.15, 0.47, 0.05, 0.19], [0, 0.72, -0.03, 0.16]]) {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), leaf);
      b.position.set(x, y, z); b.castShadow = true; g.add(b);
    }
    return { obj: g, size: [1, 1], solid: true };
  },
  lamp(o) {
    const g = new THREE.Group();
    mk(0.26, 0.05, 0.26, col('#4b4854'), 0, 0.03, 0, g);
    mk(0.05, 1.1, 0.05, col('#4b4854'), 0, 0.58, 0, g);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 0.28, 8), toon(R, { color: '#f6d38f', emissive: '#ffc15a', emissiveIntensity: 0.6 }));
    shade.position.y = 1.2; g.add(shade);
    return { obj: g, size: [1, 1], solid: true, light: { y: 1.1, power: 1.3 } };
  },
  shelf(o) {
    const g = new THREE.Group();
    const w = o.w || 1.5;
    const face = toon(R, { map: pixelTexture(shelfFront(Math.round(w * 16), 30, o.kind || 'books')) });
    front(w, 1.85, 0.42, woodMat('#6b4330'), face, 0, 0.93, 0, g);
    return { obj: g, size: [Math.ceil(w), 1], solid: true, interact: o.kind === 'books' ? { kind: 'books' } : null };
  },
  counter(o) {
    const g = new THREE.Group();
    const w = o.w || 3;
    const c = ramp(o.color || '#a8744a');
    const p = new Painter(Math.round(w * 16), 14);
    p.rect(0, 0, p.w, 14, c.m);
    for (let x = 0; x < p.w; x += 8) p.vline(x, 0, 14, c.d);
    p.hline(0, 0, p.w, c.l);
    p.rect(0, 12, p.w, 2, c.o);
    const face = toon(R, { map: pixelTexture(p.c) });
    front(w, 0.88, 0.62, woodMat(o.color || '#a8744a'), face, 0, 0.44, 0, g);
    mk(w + 0.08, 0.07, 0.72, woodMat('#6b4330'), 0, 0.91, 0, g);
    if (o.register) {
      mk(0.32, 0.2, 0.24, col('#e0a526'), -w / 2 + 0.45, 1.05, -0.05, g);
      mk(0.26, 0.08, 0.12, col('#f6d06a'), -w / 2 + 0.45, 1.18, -0.12, g);
    }
    if (o.items) for (const [x, c2, h] of o.items) mk(0.2, h || 0.14, 0.2, col(c2), x, 0.95 + (h || 0.14) / 2, 0.05, g);
    return { obj: g, size: [Math.ceil(w), 1], solid: true, counter: true };
  },
  stove(o) {
    const g = new THREE.Group();
    const p = new Painter(16, 14);
    p.rect(0, 0, 16, 14, '#4b4854'); p.rect(2, 4, 12, 8, '#2a2433'); p.rect(3, 5, 10, 6, '#e8883a'); p.hline(3, 5, 10, '#ffd66b'); p.rect(5, 1, 2, 2, '#9a95a0'); p.rect(10, 1, 2, 2, '#9a95a0');
    const face = toon(R, { map: pixelTexture(p.c), emissive: '#ff9a3a', emissiveMap: pixelTexture(p.c), emissiveIntensity: 0.35 });
    front(1, 0.9, 0.62, col('#5a5866'), face, 0, 0.45, 0, g);
    mk(0.2, 0.9, 0.2, col('#5a5866'), 0.3, 1.3, -0.2, g);
    return { obj: g, size: [1, 1], solid: true, light: { y: 0.6, power: 0.8, color: 0xff9a4a } };
  },
  fireplace(o) {
    const g = new THREE.Group();
    const stone = M('fpstone', () => toon(R, { map: pixelTexture(paintWall(32, 32, 'stone', { wallColor: '#b0a9ae' }, 3, { foundation: false }), { repeat: true }) }));
    const p = new Painter(24, 22);
    p.rect(0, 0, 24, 22, '#8a858e');
    p.rect(4, 8, 16, 14, '#2a2433');
    p.rect(6, 16, 12, 6, '#1b1426');
    for (const [x, c] of [[8, '#ffd66b'], [10, '#e8883a'], [12, '#ffd66b'], [14, '#e8883a']]) { p.vline(x, 14, 6, c); p.vline(x + 1, 16, 4, c); }
    p.rect(7, 19, 10, 2, '#6b4330');
    const face = toon(R, { map: pixelTexture(p.c), emissive: '#ffb050', emissiveMap: pixelTexture(p.c), emissiveIntensity: 0.55 });
    front(1.5, 1.35, 0.5, stone, face, 0, 0.68, 0, g);
    mk(1.8, 0.1, 0.62, woodMat('#6b4330'), 0, 1.4, 0, g);
    mk(0.9, 1.0, 0.4, stone, 0, 1.95, -0.05, g);
    return { obj: g, size: [2, 1], solid: true, light: { y: 0.6, z: 0.5, power: 1.6, color: 0xff9a4a, flicker: true }, fire: true };
  },
  window(o) {
    // wall-mounted window; glass color is driven by the time of day
    const g = new THREE.Group();
    const frame = col('#f4efe4');
    mk(1.1, 0.08, 0.1, frame, 0, -0.5, 0, g);
    mk(1.1, 0.08, 0.1, frame, 0, 0.5, 0, g);
    mk(0.08, 1.0, 0.1, frame, -0.51, 0, 0, g);
    mk(0.08, 1.0, 0.1, frame, 0.51, 0, 0, g);
    mk(0.05, 1.0, 0.1, frame, 0, 0, 0, g);
    mk(1.0, 0.05, 0.1, frame, 0, 0, 0, g);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.95), toon(R, { color: '#9fd0f5', emissive: '#9fd0f5', emissiveIntensity: 0.6 }));
    glass.position.z = -0.02;
    g.add(glass);
    mk(1.3, 0.06, 0.2, woodMat('#8e5d3e'), 0, -0.56, 0.05, g);
    if (o.curtain) {
      const cm = col(o.curtain);
      mk(0.22, 1.1, 0.06, cm, -0.62, 0.02, 0.06, g);
      mk(0.22, 1.1, 0.06, cm, 0.62, 0.02, 0.06, g);
    }
    return { obj: g, size: [1, 1], wall: true, glass: glass.material };
  },
  painting(o) {
    const g = new THREE.Group();
    const p = new Painter(16, 12);
    p.rect(0, 0, 16, 12, '#8e5d3e');
    p.rect(1, 1, 14, 10, '#f6c9a0');
    p.rect(1, 6, 14, 5, '#3a7cae');
    p.rect(10, 3, 3, 3, '#ffd66b');
    p.rect(3, 4, 2, 3, '#f4efe4'); p.px(3, 3, '#d65a4f'); p.px(4, 3, '#d65a4f');
    p.hline(1, 6, 14, '#e7f6f4');
    if (o.kind === 'meadow') { p.rect(1, 6, 14, 5, '#7dba5c'); p.px(4, 8, '#f4a4b6'); p.px(8, 9, '#fff8ec'); p.px(12, 8, '#b9a2e3'); }
    if (o.kind === 'portrait') { p.rect(1, 1, 14, 10, '#b9a2e3'); p.rect(5, 3, 6, 6, '#f3c9a8'); p.rect(5, 2, 6, 2, '#c9c4cc'); p.px(6, 5, '#3b2a2e'); p.px(9, 5, '#3b2a2e'); }
    const face = toon(R, { map: pixelTexture(p.c) });
    front(o.w || 1, (o.w || 1) * 0.75, 0.06, col('#6b4330'), face, 0, 0, 0, g);
    return { obj: g, size: [1, 1], wall: true };
  },
  clock(o) {
    const g = new THREE.Group();
    const p = new Painter(10, 10);
    p.rect(0, 0, 10, 10, '#6b4330'); p.rect(1, 1, 8, 8, '#fbf1dc'); p.vline(5, 2, 4, '#3b2a2e'); p.hline(5, 5, 3, '#3b2a2e');
    const face = toon(R, { map: pixelTexture(p.c) });
    front(0.6, 0.6, 0.06, col('#6b4330'), face, 0, 0, 0, g);
    return { obj: g, size: [1, 1], wall: true };
  },
  desk(o) {
    const g = new THREE.Group();
    const w = o.w || 2;
    const p = new Painter(Math.round(w * 16), 12);
    const c = ramp('#6b4330');
    p.rect(0, 0, p.w, 12, c.m); p.rect(2, 2, p.w / 2 - 3, 8, c.d); p.rect(p.w / 2 + 1, 2, p.w / 2 - 3, 8, c.d);
    p.px(p.w / 4, 6, '#e0a526'); p.px((p.w * 3) / 4, 6, '#e0a526');
    front(w, 0.8, 0.7, woodMat('#6b4330'), toon(R, { map: pixelTexture(p.c) }), 0, 0.4, 0, g);
    mk(0.5, 0.05, 0.35, col('#fbf1dc'), -0.3, 0.83, 0, g);
    mk(0.1, 0.25, 0.1, col('#3f7f7c'), 0.5, 0.93, -0.1, g);
    if (o.lamp) { mk(0.08, 0.35, 0.08, col('#4b4854'), w / 2 - 0.3, 0.98, -0.15, g); mk(0.3, 0.14, 0.24, toon(R, { color: '#8fce66', emissive: '#ffd66b', emissiveIntensity: 0.4 }), w / 2 - 0.3, 1.18, -0.1, g); }
    return { obj: g, size: [Math.ceil(w), 1], solid: true };
  },
  sofa(o) {
    const g = new THREE.Group();
    const c = col(o.color || '#8a64b8'), d = col(ramp(o.color || '#8a64b8').d);
    mk(1.8, 0.35, 0.75, c, 0, 0.25, 0, g);
    mk(1.8, 0.5, 0.2, d, 0, 0.55, -0.3, g);
    mk(0.2, 0.45, 0.75, d, -0.85, 0.35, 0, g);
    mk(0.2, 0.45, 0.75, d, 0.85, 0.35, 0, g);
    mk(0.36, 0.2, 0.1, col('#fbf1dc'), -0.45, 0.55, -0.12, g);
    return { obj: g, size: [2, 1], solid: true, interact: { kind: 'sit' } };
  },
  tank(o) {
    const g = new THREE.Group();
    mk(1.1, 0.5, 0.5, woodMat('#6b4330'), 0, 0.25, 0, g);
    const water = toon(R, { color: '#7cc4e8', emissive: '#4f99c7', emissiveIntensity: 0.35, transparent: true });
    water.opacity = 0.85;
    mk(1.0, 0.55, 0.42, water, 0, 0.78, 0, g);
    mk(0.16, 0.08, 0.02, col('#f0934a'), -0.2, 0.8, 0.22, g);
    mk(0.12, 0.07, 0.02, col('#ffd66b'), 0.25, 0.7, 0.22, g);
    return { obj: g, size: [1, 1], solid: true, light: { y: 0.8, power: 0.5, color: 0x7cc4e8 } };
  },
  radio(o) {
    const g = new THREE.Group();
    const p = new Painter(8, 6); p.rect(0, 0, 8, 6, '#c8704a'); p.rect(1, 1, 4, 4, '#6b4330'); p.px(6, 2, '#f2c14e'); p.px(6, 4, '#f2c14e');
    front(0.5, 0.36, 0.26, col('#c8704a'), toon(R, { map: pixelTexture(p.c) }), 0, 0.18, 0, g);
    return { obj: g, size: [1, 1], solid: true, interact: { kind: 'radio' } };
  },
  teddy(o) {
    const g = new THREE.Group();
    const b = col('#b07b50');
    mk(0.3, 0.28, 0.24, b, 0, 0.14, 0, g);
    mk(0.28, 0.24, 0.22, b, 0, 0.4, 0.02, g);
    mk(0.08, 0.08, 0.05, col('#3b2a2e'), -0.06, 0.42, 0.13, g);
    mk(0.08, 0.08, 0.05, col('#3b2a2e'), 0.06, 0.42, 0.13, g);
    mk(0.08, 0.08, 0.06, b, -0.1, 0.55, 0, g); mk(0.08, 0.08, 0.06, b, 0.1, 0.55, 0, g);
    return { obj: g, size: [1, 1], solid: false };
  },
  petbed(o) {
    const g = new THREE.Group();
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.16, 12), col('#8e5d3e'));
    r.position.y = 0.08; g.add(r);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.1, 12), col('#e97d8f'));
    c.position.y = 0.14; g.add(c);
    return { obj: g, size: [1, 1], solid: false, petbed: true };
  },
  dresser(o) {
    const g = new THREE.Group();
    const p = new Painter(20, 14);
    const c = ramp('#a8744a');
    p.rect(0, 0, 20, 14, c.m);
    for (const y of [1, 5, 9]) { p.rect(1, y, 18, 3, c.d); p.hline(1, y, 18, c.l); p.px(9, y + 1, '#e0a526'); p.px(10, y + 1, '#e0a526'); }
    front(1.25, 0.88, 0.5, woodMat('#a8744a'), toon(R, { map: pixelTexture(p.c) }), 0, 0.44, 0, g);
    mk(0.5, 0.6, 0.06, col('#bfe3f2'), 0, 1.25, -0.2, g);
    mk(0.6, 0.06, 0.1, woodMat('#6b4330'), 0, 1.56, -0.2, g);
    return { obj: g, size: [1, 1], solid: true, interact: { kind: 'wardrobe' } };
  },
  candles(o) {
    const g = new THREE.Group();
    for (const [x, h] of [[-0.1, 0.18], [0.05, 0.26], [0.14, 0.14]]) {
      mk(0.07, h, 0.07, col('#fbf1dc'), x, h / 2, 0, g);
      mk(0.04, 0.05, 0.04, toon(R, { color: '#ffd66b', emissive: '#ffb050', emissiveIntensity: 1 }), x, h + 0.03, 0, g);
    }
    return { obj: g, size: [1, 1], solid: false, light: { y: 0.3, power: 0.6, color: 0xffb050, flicker: true } };
  },
  vase(o) {
    const g = new THREE.Group();
    const v = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.3, 8), col('#7cb6e0'));
    v.position.y = 0.15; g.add(v);
    for (const [x, z, c] of [[0, 0, '#f4a4b6'], [-0.08, 0.04, '#ffd66b'], [0.08, 0.02, '#fff8ec'], [0.02, -0.06, '#b9a2e3']]) {
      mk(0.02, 0.2, 0.02, col('#5fa453'), x, 0.38, z, g);
      mk(0.08, 0.07, 0.08, col(c), x, 0.5, z, g);
    }
    return { obj: g, size: [1, 1], solid: false };
  },
  strings(o) {
    const g = new THREE.Group();
    const n = 7;
    for (let i = 0; i < n; i++) {
      const x = -1.2 + (i / (n - 1)) * 2.4;
      const y = -Math.sin((i / (n - 1)) * Math.PI) * 0.18;
      mk(0.07, 0.07, 0.07, toon(R, { color: ['#ffd66b', '#f4a4b6', '#8fd6b4'][i % 3], emissive: ['#ffd66b', '#f4a4b6', '#8fd6b4'][i % 3], emissiveIntensity: 0.8 }), x, y, 0, g);
    }
    return { obj: g, size: [3, 1], wall: true };
  },
  globe(o) {
    const g = new THREE.Group();
    mk(0.28, 0.06, 0.28, woodMat('#6b4330'), 0, 0.03, 0, g);
    mk(0.05, 0.5, 0.05, col('#e0a526'), 0, 0.3, 0, g);
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), col('#4e73b6'));
    s.position.y = 0.7; g.add(s);
    const land = new THREE.Mesh(new THREE.IcosahedronGeometry(0.225, 0), col('#7fbf5a'));
    land.position.y = 0.7; land.scale.set(0.9, 0.7, 0.9); g.add(land);
    return { obj: g, size: [1, 1], solid: true };
  },
  piano(o) {
    const g = new THREE.Group();
    const p = new Painter(24, 8);
    p.rect(0, 0, 24, 8, '#f4efe4');
    for (let x = 1; x < 24; x += 3) p.vline(x, 0, 8, '#9a95a0');
    for (let x = 2; x < 24; x += 3) if (x % 7 !== 0) p.rect(x, 0, 2, 5, '#2a2433');
    mk(1.6, 1.0, 0.55, col('#3b2a2e'), 0, 0.5, -0.1, g);
    const keys = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.3), toon(R, { map: pixelTexture(p.c) }));
    keys.rotation.x = -Math.PI / 2 + 0.2;
    keys.position.set(0, 0.72, 0.25);
    g.add(keys);
    return { obj: g, size: [2, 1], solid: true, interact: { kind: 'piano' } };
  },
  barrel(o) {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.72, 10), woodMat('#9a6a44'));
    b.position.y = 0.36; b.castShadow = true; g.add(b);
    if (o.fill) { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.04, 10), col(o.fill)); f.position.y = 0.72; g.add(f); }
    return { obj: g, size: [1, 1], solid: true };
  },
  crate(o) {
    const g = new THREE.Group();
    mk(0.7, 0.55, 0.6, M('crateTex', () => toon(R, { map: pixelTexture(paintPlanks(16, 16, { dir: 'h', color: '#b07b50', seed: 3 })) })), 0, 0.28, 0, g);
    if (o.fill) for (let i = 0; i < 5; i++) mk(0.14, 0.12, 0.14, col(o.fill), -0.2 + i * 0.1, 0.6, (i % 2) * 0.12 - 0.06, g);
    return { obj: g, size: [1, 1], solid: true };
  },
  coffee(o) {
    const g = new THREE.Group();
    mk(0.5, 0.55, 0.4, col('#b8b4c0'), 0, 0.28, 0, g);
    mk(0.2, 0.08, 0.2, col('#3b2a2e'), 0, 0.3, 0.22, g);
    mk(0.12, 0.1, 0.12, col('#f4efe4'), 0, 0.08, 0.22, g);
    mk(0.08, 0.08, 0.08, toon(R, { color: '#8fd6b4', emissive: '#8fd6b4', emissiveIntensity: 0.8 }), 0.15, 0.48, 0.2, g);
    return { obj: g, size: [1, 1], solid: true };
  },
  workbench(o) {
    const g = new THREE.Group();
    mk(2, 0.12, 0.8, woodMat('#b07b50'), 0, 0.72, 0, g);
    for (const x of [-0.9, 0.9]) mk(0.14, 0.7, 0.7, woodMat('#6b4330'), x, 0.35, 0, g);
    mk(0.5, 0.08, 0.12, col('#9a95a0'), -0.3, 0.82, 0.1, g);
    mk(0.3, 0.14, 0.3, woodMat('#d2a86e'), 0.4, 0.85, -0.05, g);
    return { obj: g, size: [2, 1], solid: true };
  },
  lumber(o) {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) mk(1.8, 0.14, 0.26, woodMat(['#c49a64', '#b07b50'][i % 2]), 0, 0.07 + i * 0.15, (i % 2) * 0.28 - 0.14, g);
    return { obj: g, size: [2, 1], solid: true };
  },
  board(o) {
    const g = new THREE.Group();
    const p = new Painter(24, 16);
    p.rect(0, 0, 24, 16, '#5a3b2a'); p.rect(1, 1, 22, 14, '#c49a64');
    const notes = [[2, 2, 6, 5, '#fbf1dc'], [10, 3, 5, 6, '#f7d6e0'], [17, 2, 5, 5, '#fff3a6'], [4, 9, 7, 5, '#dcecf7'], [14, 10, 7, 4, '#fbf1dc']];
    for (const [x, y, w, h, c] of notes) { p.rect(x, y, w, h, c); p.px(x + 1, y, '#d9594c'); p.hline(x + 1, y + 2, w - 2, '#9a8a80'); }
    front(1.5, 1.0, 0.08, col('#5a3b2a'), toon(R, { map: pixelTexture(p.c) }), 0, 0, 0, g);
    return { obj: g, size: [2, 1], wall: true };
  },
  map(o) {
    const g = new THREE.Group();
    const p = new Painter(28, 18);
    p.rect(0, 0, 28, 18, '#8e5d3e'); p.rect(1, 1, 26, 16, '#e9dcc8');
    p.rect(1, 12, 26, 5, '#7cb6e0'); p.rect(1, 1, 26, 3, '#5f9a55');
    p.rect(18, 1, 2, 12, '#7cb6e0'); p.rect(9, 6, 5, 4, '#b0a9ae'); p.px(24, 12, '#d65a4f'); p.px(24, 11, '#f4efe4');
    front(1.8, 1.15, 0.05, col('#6b4330'), toon(R, { map: pixelTexture(p.c) }), 0, 0, 0, g);
    return { obj: g, size: [2, 1], wall: true };
  },
  flag(o) {
    const g = new THREE.Group();
    mk(0.05, 1.6, 0.05, col('#e0a526'), 0, 0.8, 0, g);
    mk(0.12, 0.08, 0.12, col('#e0a526'), 0, 1.62, 0, g);
    const p = new Painter(10, 14); p.rect(0, 0, 10, 14, o.color || '#e8883a'); p.rect(0, 5, 10, 3, '#fbf1dc'); p.px(4, 6, '#ec5f73');
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), toon(R, { map: pixelTexture(p.c), side: THREE.DoubleSide }));
    f.position.set(0.27, 1.2, 0);
    g.add(f);
    return { obj: g, size: [1, 1], solid: true };
  },
  easel(o) {
    const g = new THREE.Group();
    for (const [x, z] of [[-0.2, 0.1], [0.2, 0.1], [0, -0.2]]) { const l = mk(0.05, 1.1, 0.05, woodMat('#b07b50'), x, 0.55, z, g); l.rotation.z = -x * 0.3; }
    const p = new Painter(14, 11); p.rect(0, 0, 14, 11, '#fbf6ea'); p.rect(1, 1, 12, 5, '#f6c9a0'); p.rect(1, 6, 12, 4, '#3a7cae'); p.px(9, 3, '#ffd66b');
    front(0.85, 0.66, 0.05, col('#fbf6ea'), toon(R, { map: pixelTexture(p.c) }), 0, 1.0, 0.12, g);
    return { obj: g, size: [1, 1], solid: true };
  },
  lens(o) {
    // the great lantern of Old Glimmer
    const g = new THREE.Group();
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.7, 10), col('#8a858e'));
    ped.position.y = 0.35; g.add(ped);
    const glass = toon(R, { color: '#cfe6f0', emissive: '#ffd88a', emissiveIntensity: 0 });
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.9, 12), glass);
    lens.position.y = 1.15; g.add(lens);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.35, 12), col('#e0a526'));
    cap.position.y = 1.78; g.add(cap);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const slot = mk(0.12, 0.12, 0.12, toon(R, { color: '#5a5866', emissive: '#8fe0ff', emissiveIntensity: 0 }), Math.cos(a) * 0.62, 0.72, Math.sin(a) * 0.62, g);
      slot.userData.slot = i;
    }
    return { obj: g, size: [2, 2], solid: true, interact: { kind: 'lens' }, lens: glass };
  },
  stairs(o) {
    const g = new THREE.Group();
    for (let i = 0; i < 5; i++) mk(0.9, 0.12, 0.3, woodMat('#8e5d3e'), 0, 0.1 + i * 0.22, -i * 0.28 + 0.5, g);
    return { obj: g, size: [1, 2], solid: true };
  },
  armchair(o) {
    const g = new THREE.Group();
    const c = col(o.color || '#3f9b98'), d = col(ramp(o.color || '#3f9b98').d);
    mk(0.8, 0.35, 0.7, c, 0, 0.25, 0, g);
    mk(0.8, 0.55, 0.18, d, 0, 0.6, -0.28, g);
    mk(0.16, 0.45, 0.7, d, -0.36, 0.38, 0, g);
    mk(0.16, 0.45, 0.7, d, 0.36, 0.38, 0, g);
    return { obj: g, size: [1, 1], solid: true, interact: { kind: 'sit' } };
  },
  note(o) {
    const g = new THREE.Group();
    const p = new Painter(8, 6); p.rect(0, 0, 8, 6, '#fbf1dc'); p.hline(1, 2, 6, '#9a8a80'); p.hline(1, 4, 4, '#9a8a80'); p.px(6, 4, '#ec5f73');
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.26), toon(R, { map: pixelTexture(p.c) }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = 0.2;
    m.position.y = 0.7;
    g.add(m);
    return { obj: g, size: [1, 1], solid: false, interact: { kind: 'note' } };
  },
};

// ---- farm, mill & sea furniture ------------------------------------------------
function patches(w, h, base, spot, seed) {
  const p = new Painter(w, h);
  p.rect(0, 0, w, h, base);
  const r = rng(seed);
  for (let i = 0; i < 3; i++) {
    const cx = r() * w, cy = r() * h, rr = 2 + r() * 3;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((x - cx) ** 2 + (y - cy) ** 2 * 1.4 < rr * rr) p.px(x, y, spot);
  }
  return p.c;
}
Object.assign(FURN, {
  cow(o) {
    const g = new THREE.Group();
    const hide = M('cowhide' + (o.color || ''), () => toon(R, { map: pixelTexture(patches(16, 10, o.color || '#f4efe4', '#3b3844', o.seed || 7)) }));
    const dark = col('#3b3844'), pink = col('#f4a4b6'), horn = col('#efe3cc');
    const body = mk(1.3, 0.62, 0.66, hide, 0, 0.72, 0, g);
    for (const [x, z] of [[-0.45, -0.22], [-0.45, 0.22], [0.45, -0.22], [0.45, 0.22]]) mk(0.16, 0.42, 0.16, hide, x, 0.21, z, g);
    for (const [x, z] of [[-0.45, -0.22], [-0.45, 0.22], [0.45, -0.22], [0.45, 0.22]]) mk(0.17, 0.08, 0.17, dark, x, 0.04, z, g);
    mk(0.3, 0.14, 0.3, pink, -0.2, 0.36, 0, g);
    const head = new THREE.Group();
    head.position.set(0.72, 0.92, 0);
    g.add(head);
    mk(0.36, 0.4, 0.42, hide, 0.08, 0, 0, head);
    mk(0.14, 0.2, 0.36, pink, 0.3, -0.1, 0, head);
    mk(0.04, 0.06, 0.06, dark, 0.27, 0.08, 0.12, head); mk(0.04, 0.06, 0.06, dark, 0.27, 0.08, -0.12, head);
    mk(0.06, 0.14, 0.06, horn, 0.02, 0.26, 0.16, head); mk(0.06, 0.14, 0.06, horn, 0.02, 0.26, -0.16, head);
    mk(0.12, 0.08, 0.18, hide, 0.0, 0.12, 0.28, head); mk(0.12, 0.08, 0.18, hide, 0.0, 0.12, -0.28, head);
    const tail = mk(0.06, 0.4, 0.06, dark, -0.67, 0.62, 0, g);
    void body;
    const ph = (o.x || 0) * 1.7;
    return {
      obj: g, size: [2, 1], solid: true, interact: { kind: 'cow' },
      anim: (t) => { head.rotation.z = -0.25 + Math.sin(t * 0.7 + ph) * 0.2; head.position.y = 0.92 + Math.min(0, Math.sin(t * 0.7 + ph)) * 0.18; tail.rotation.x = Math.sin(t * 2.2 + ph) * 0.35; },
    };
  },
  chicken(o) {
    // a hen: a plump soft body, a tail of feathers cocked up, a wing folded on each side, a red comb
    // & wattle, a yellow beak and legs
    const g = new THREE.Group();
    const c = o.color || '#f4efe4';
    const w = col(c), wd = col(mixHex(c, '#6b4a34', 0.25)), red = col('#d9364a'), y = col('#f2c14e');
    const bodyG = new THREE.Group();
    g.add(bodyG);
    const soft = (sw, sh, sd, mat, x, yy, z, parent) => { const m = new THREE.Mesh(softBoxGeo(sw, sh, sd, 0.3), mat); m.position.set(x, yy, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
    soft(0.3, 0.24, 0.24, w, 0, 0.26, 0, bodyG);
    const tail = soft(0.12, 0.18, 0.18, wd, -0.16, 0.38, 0, bodyG); tail.rotation.z = 0.4;
    for (const z of [-0.12, 0.12]) soft(0.18, 0.12, 0.03, wd, -0.02, 0.28, z, bodyG);
    soft(0.16, 0.16, 0.15, w, 0.14, 0.44, 0, bodyG);
    mk(0.09, 0.05, 0.035, red, 0.13, 0.54, 0, bodyG);
    mk(0.03, 0.05, 0.03, red, 0.23, 0.39, 0, bodyG);
    mk(0.06, 0.035, 0.045, y, 0.25, 0.43, 0, bodyG);
    mk(0.025, 0.03, 0.02, col('#1a1422'), 0.2, 0.47, 0.075, bodyG); mk(0.025, 0.03, 0.02, col('#1a1422'), 0.2, 0.47, -0.075, bodyG);
    mk(0.035, 0.14, 0.035, y, 0, 0.07, 0.06, g); mk(0.035, 0.14, 0.035, y, 0, 0.07, -0.06, g);
    mk(0.08, 0.015, 0.05, y, 0.03, 0.007, 0.06, g); mk(0.08, 0.015, 0.05, y, 0.03, 0.007, -0.06, g);
    const ph = (o.x || 0) * 3.1 + (o.z || 0);
    if (o.rot !== undefined) g.rotation.y = o.rot;
    return {
      obj: g, size: [1, 1], solid: false, interact: { kind: 'chicken' },
      anim: (t) => { const peck = Math.max(0, Math.sin(t * 1.9 + ph)) ** 6; bodyG.rotation.z = -peck * 0.7; bodyG.position.y = -peck * 0.05; },
    };
  },
  haypile(o) {
    const g = new THREE.Group();
    const hay = col('#e0bf62'), hayD = col('#c9a44e');
    const w = o.w || 1.4;
    mk(w, 0.3, 0.9, hay, 0, 0.15, 0, g);
    mk(w * 0.7, 0.22, 0.6, hayD, 0.05, 0.38, -0.05, g);
    for (let i = 0; i < 6; i++) { const b = mk(0.3, 0.04, 0.04, hay, -w / 2 + 0.2 + i * (w - 0.4) / 5, 0.52, (i % 2) * 0.2 - 0.1, g); b.rotation.y = i * 0.9; }
    return { obj: g, size: [Math.ceil(w), 1], solid: true };
  },
  trough(o) {
    const g = new THREE.Group();
    const wd = woodMat('#8e5d3e');
    mk(1.4, 0.3, 0.5, wd, 0, 0.3, 0, g);
    mk(1.3, 0.06, 0.4, col('#7cb6e0'), 0, 0.43, 0, g);
    for (const x of [-0.55, 0.55]) mk(0.1, 0.18, 0.4, wd, x, 0.09, 0, g);
    return { obj: g, size: [2, 1], solid: true };
  },
  nest(o) {
    const g = new THREE.Group();
    mk(1.4, 0.5, 0.5, woodMat('#b07b50'), 0, 0.5, 0, g);
    for (let i = 0; i < 3; i++) {
      mk(0.36, 0.16, 0.36, col('#e0bf62'), -0.45 + i * 0.45, 0.83, 0, g);
      if (i !== 1) mk(0.1, 0.12, 0.1, col('#f1e2c8'), -0.45 + i * 0.45, 0.93, 0.04, g);
    }
    for (const x of [-0.6, 0.6]) mk(0.08, 0.25, 0.4, woodMat('#8e5d3e'), x, 0.12, 0, g);
    return { obj: g, size: [2, 1], solid: true, interact: { kind: 'nest' } };
  },
  stallfence(o) {
    const g = new THREE.Group();
    const wd = woodMat('#a8744a');
    const len = o.len || 1.6;
    mk(0.1, 0.8, 0.1, wd, 0, 0.4, -len / 2, g); mk(0.1, 0.8, 0.1, wd, 0, 0.4, len / 2, g);
    mk(0.06, 0.08, len, wd, 0, 0.7, 0, g); mk(0.06, 0.08, len, wd, 0, 0.4, 0, g);
    return { obj: g, size: [1, Math.ceil(len)], solid: true, thin: true };
  },
  gear(o) {
    const g = new THREE.Group();
    const wd = woodMat('#8e5d3e');
    const wheel = new THREE.Group();
    wheel.position.set(0, o.y0 || 1.3, 0.12);
    g.add(wheel);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.08, 6, 16), wd);
    wheel.add(rim);
    for (let i = 0; i < 4; i++) { const sp = mk(1.24, 0.08, 0.08, wd, 0, 0, 0, wheel); sp.rotation.z = (i * Math.PI) / 4; }
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; mk(0.12, 0.14, 0.12, wd, Math.cos(a) * 0.72, Math.sin(a) * 0.72, 0, wheel).rotation.z = a; }
    mk(0.16, 0.16, 0.3, col('#6a6571'), 0, 0, 0, wheel);
    return { obj: g, size: [2, 1], wall: true, anim: (t, w) => { wheel.rotation.z = w && w.millRunning ? -t * 0.8 : 0; } };
  },
  millstone(o) {
    const g = new THREE.Group();
    const st = col('#a9a3a8'), stD = col('#8a858e');
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.9, 0.35, 14), stD);
    base.position.y = 0.18; base.castShadow = true; g.add(base);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.24, 14), st);
    top.position.y = 0.48; top.castShadow = true; g.add(top);
    mk(0.12, 0.26, 0.12, col('#6b4330'), 0, 0.72, 0, g);
    const beam = mk(1.3, 0.1, 0.1, woodMat('#8e5d3e'), 0, 0.86, 0, g);
    mk(0.3, 0.1, 0.3, col('#f4efe4'), 0.6, 0.66, 0.5, g);
    return { obj: g, size: [2, 2], solid: true, interact: { kind: 'millstone' }, anim: (t, w) => { const a = w && w.millRunning ? t * 0.9 : 0; top.rotation.y = a; beam.rotation.y = a; } };
  },
  sacks(o) {
    const g = new THREE.Group();
    const c = col('#efe3cc'), d = col('#d8c7a4');
    for (const [x, z, h] of [[-0.25, 0, 0.5], [0.22, 0.05, 0.44], [0, -0.3, 0.46]]) {
      mk(0.4, h, 0.34, c, x, h / 2, z, g);
      mk(0.2, 0.08, 0.16, d, x, h + 0.04, z, g);
    }
    mk(0.16, 0.12, 0.02, col('#c8454f'), -0.25, 0.3, 0.18, g);
    return { obj: g, size: [1, 1], solid: true };
  },
  wheel(o) {
    const g = new THREE.Group();
    const wd = woodMat('#8e5d3e');
    const wh = new THREE.Group();
    g.add(wh);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.04, 6, 14), wd);
    wh.add(rim);
    for (let i = 0; i < 8; i++) {
      const sp = mk(0.94, 0.05, 0.05, wd, 0, 0, 0, wh);
      sp.rotation.z = (i * Math.PI) / 8;
    }
    mk(0.14, 0.14, 0.1, col('#e0a526'), 0, 0, 0.02, wh);
    return { obj: g, size: [1, 1], wall: true };
  },
  hammock(o) {
    const g = new THREE.Group();
    const rope = col('#d9c090');
    for (const x of [-1.1, 1.1]) mk(0.12, 1.4, 0.12, woodMat('#8e5d3e'), x, 0.7, 0, g);
    const p = new Painter(16, 8);
    for (let x = 0; x < 16; x++) for (let y = 0; y < 8; y++) p.px(x, y, (x >> 1) % 2 ? '#e9dcc8' : '#3f9b98');
    const cloth = mk(1.8, 0.08, 0.6, toon(R, { map: pixelTexture(p.c) }), 0, 0.62, 0, g);
    cloth.scale.y = 1;
    for (const x of [-0.95, 0.95]) { const r = mk(0.3, 0.03, 0.03, rope, x, 0.85, 0, g); r.rotation.z = x > 0 ? 0.6 : -0.6; }
    mk(0.45, 0.14, 0.3, col('#f4efe4'), -0.5, 0.72, 0, g);
    return { obj: g, size: [2, 1], solid: true, interact: { kind: 'sit' } };
  },
  anchor(o) {
    const g = new THREE.Group();
    const ir = col('#4b4854');
    mk(0.08, 0.7, 0.08, ir, 0, 0.45, 0, g);
    mk(0.4, 0.07, 0.07, ir, 0, 0.72, 0, g);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.025, 5, 10), ir); ring.position.y = 0.86; g.add(ring);
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 5, 12, Math.PI), ir); arc.rotation.z = Math.PI; arc.position.y = 0.32; g.add(arc);
    return { obj: g, size: [1, 1], solid: true };
  },
  shipbottle(o) {
    const g = new THREE.Group();
    mk(0.5, 0.08, 0.2, woodMat('#6b4330'), 0, 0.04, 0, g);
    for (const x of [-0.16, 0.16]) mk(0.06, 0.1, 0.12, woodMat('#6b4330'), x, 0.12, 0, g);
    const glass = toon(R, { color: '#cfeee6', transparent: true, opacity: 0.55, depthWrite: false });
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.5, 10), glass);
    b.rotation.z = Math.PI / 2; b.position.y = 0.26; g.add(b);
    mk(0.08, 0.06, 0.06, col('#8e5d3e'), 0.29, 0.26, 0, g);
    mk(0.22, 0.06, 0.08, col('#8e5d3e'), -0.02, 0.2, 0, g);
    mk(0.02, 0.14, 0.02, col('#5a3b2a'), -0.02, 0.28, 0, g);
    mk(0.1, 0.1, 0.01, col('#fbf1dc'), 0.02, 0.29, 0, g);
    return { obj: g, size: [1, 1], solid: true };
  },
  hometelescope(o) {
    const g = new THREE.Group();
    for (const [x, z] of [[-0.18, 0.14], [0.18, 0.14], [0, -0.2]]) { const l = mk(0.05, 0.8, 0.05, woodMat('#6b4330'), x, 0.4, z, g); l.rotation.z = -x * 0.35; }
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.9, 10), col('#3f4f7a'));
    tube.rotation.x = -0.9; tube.position.set(0, 0.95, -0.05); tube.castShadow = true; g.add(tube);
    mk(0.2, 0.06, 0.2, col('#e0a526'), 0, 0.82, 0, g);
    return { obj: g, size: [1, 1], solid: true, interact: { kind: 'telescope' } };
  },
  chest(o) {
    const g = new THREE.Group();
    const wd = woodMat('#8e5d3e'), gold = col('#e0a526');
    mk(0.9, 0.46, 0.56, wd, 0, 0.23, 0, g);
    const lid = new THREE.Group(); lid.position.set(0, 0.46, -0.28); g.add(lid);
    mk(0.92, 0.2, 0.58, wd, 0, 0.1, 0.28, lid);
    for (const x of [-0.3, 0.3]) { mk(0.08, 0.48, 0.6, gold, x, 0.23, 0, g); mk(0.08, 0.22, 0.6, gold, x, 0.1, 0.28, lid); }
    mk(0.14, 0.16, 0.06, gold, 0, 0.36, 0.3, g);
    const shine = mk(0.7, 0.08, 0.4, toon(R, { color: '#ffd66b', emissive: '#ffc040', emissiveIntensity: 1.2 }), 0, 0.45, 0, g);
    shine.visible = false;
    return { obj: g, size: [1, 1], solid: true, interact: { kind: 'chest' }, lid, shine, light: { y: 0.8, power: 0.5, color: 0xffd08a } };
  },
  crystal(o) {
    const g = new THREE.Group();
    const c = toon(R, { color: o.color || '#8fe0ff', emissive: o.color || '#6fd0ff', emissiveIntensity: 0.9 });
    for (const [x, z, h, r] of [[0, 0, 0.6, 0.1], [0.15, 0.08, 0.38, -0.3], [-0.14, 0.06, 0.44, 0.35], [0.05, -0.12, 0.3, 0.1]]) {
      const m = new THREE.Mesh(new THREE.ConeGeometry(0.07, h, 5), c);
      m.position.set(x, h / 2, z); m.rotation.z = r; g.add(m);
    }
    return { obj: g, size: [1, 1], solid: true, light: { y: 0.4, power: 0.9, color: 0x7fd8ff } };
  },
  puddle(o) {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.CircleGeometry(1, 12), toon(R, { color: '#2f4f76', emissive: '#1f3a5a', emissiveIntensity: 0.25 }));
    m.rotation.x = -Math.PI / 2; m.scale.set(o.rx || 1, o.rz || 0.6, 1); m.position.y = 0.012; g.add(m);
    return { obj: g, size: [1, 1], flat: true };
  },
  rocks(o) {
    const g = new THREE.Group();
    const st = col('#6a6571'), st2 = col('#58545f');
    for (const [x, z, sc] of [[0, 0, 0.5], [0.4, 0.2, 0.32], [-0.35, 0.15, 0.38]]) {
      const r = new THREE.Mesh(new THREE.DodecahedronGeometry(sc, 0), x ? st2 : st);
      r.position.set(x, sc * 0.6, z); r.castShadow = true; g.add(r);
    }
    return { obj: g, size: [1, 1], solid: true };
  },
  terrarium(o) {
    const g = new THREE.Group();
    mk(0.62, 0.08, 0.42, woodMat('#6b4330'), 0, 0.04, 0, g);
    mk(0.58, 0.06, 0.38, col('#6f9a55'), 0, 0.1, 0, g);
    const glass = toon(R, { color: '#cfeee6', transparent: true, opacity: 0.35, depthWrite: false });
    mk(0.6, 0.42, 0.4, glass, 0, 0.32, 0, g);
    for (const [x, z, h] of [[-0.18, -0.08, 0.26], [0.16, 0.06, 0.2], [-0.05, 0.1, 0.16]]) mk(0.05, h, 0.05, col('#4f9a4c'), x, 0.12 + h / 2, z, g);
    mk(0.14, 0.05, 0.12, col('#5fa453'), -0.18, 0.37, -0.08, g);
    mk(0.08, 0.05, 0.07, col('#6fae4c'), 0.1, 0.16, -0.06, g);
    mk(0.02, 0.02, 0.02, col('#2a2433'), 0.13, 0.19, -0.04, g);
    return { obj: g, size: [1, 1], solid: true };
  },
  minilight(o) {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.1 - i * 0.012, 0.115 - i * 0.012, 0.14, 10), col(i % 2 ? '#d65a4f' : '#f4efe4'));
      band.position.y = 0.07 + i * 0.14; band.castShadow = true; g.add(band);
    }
    mk(0.12, 0.1, 0.12, toon(R, { color: '#fff3c4', emissive: '#ffd66b', emissiveIntensity: 1.2 }), 0, 0.62, 0, g);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.1, 8), col('#d65a4f')); cap.position.y = 0.72; g.add(cap);
    mk(0.3, 0.05, 0.3, woodMat('#8e5d3e'), 0, 0.02, 0, g);
    return { obj: g, size: [1, 1], solid: true, light: { y: 0.7, power: 0.8, color: 0xffd08a } };
  },
  musicbox(o) {
    const g = new THREE.Group();
    mk(0.44, 0.24, 0.32, woodMat('#b07b50'), 0, 0.12, 0, g);
    const lid = mk(0.46, 0.05, 0.34, woodMat('#8e5d3e'), 0, 0.33, -0.12, g);
    lid.rotation.x = -0.9;
    mk(0.3, 0.02, 0.2, col('#e0a526'), 0, 0.25, 0.02, g);
    mk(0.04, 0.1, 0.04, col('#f4a4b6'), 0, 0.3, 0.02, g);
    mk(0.06, 0.06, 0.08, col('#e0a526'), 0.25, 0.14, 0, g);
    return { obj: g, size: [1, 1], solid: true, interact: { kind: 'musicbox' } };
  },
  lanternset(o) {
    const g = new THREE.Group();
    mk(0.05, 1.6, 0.05, woodMat('#6b4330'), -0.5, 0.8, 0, g); mk(0.05, 1.6, 0.05, woodMat('#6b4330'), 0.5, 0.8, 0, g);
    mk(1.05, 0.03, 0.03, col('#3b2a2e'), 0, 1.55, 0, g);
    ['#ec5f73', '#ffd66b', '#8fd6b4'].forEach((c, i) => {
      mk(0.02, 0.12, 0.02, col('#3b2a2e'), -0.3 + i * 0.3, 1.47, 0, g);
      mk(0.2, 0.24, 0.2, toon(R, { color: c, emissive: c, emissiveIntensity: 0.8 }), -0.3 + i * 0.3, 1.3, 0, g);
    });
    return { obj: g, size: [1, 1], solid: true, light: { y: 1.3, power: 0.9, color: 0xffb0a0 } };
  },
  lanternhook(o) {
    const g = new THREE.Group();
    mk(0.06, 0.4, 0.06, col('#3b3a46'), 0, 0.2, 0, g);
    const glass = toon(R, { color: '#f3e2b0', emissive: '#ffc15a', emissiveIntensity: 1 });
    mk(0.22, 0.26, 0.22, glass, 0, -0.08, 0, g);
    return { obj: g, size: [1, 1], wall: true, light: { y: -0.1, power: 1.0, color: 0xffc070 } };
  },
});

// ---- the little things people keep about them (each one merged into a draw or two) ----------------
Object.assign(FURN, {
  // a row of pegs on the wall and what hangs there: a coat, a scarf & a straw hat — or a saw, a coil of
  // rope and a hammer
  pegs(o) {
    const g = new THREE.Group(), w = o.w || 1.1, wd = woodMat('#8e5d3e');
    mk(w, 0.1, 0.05, wd, 0, 0, 0.02, g);
    for (let i = 0; i < 3; i++) mk(0.05, 0.05, 0.12, woodMat('#6b4330'), -w / 2 + (i + 0.5) * (w / 3), 0, 0.08, g);
    const x0 = -w / 3, x2 = w / 3;
    if (o.kind === 'tools') {
      mk(0.56, 0.16, 0.02, col('#b8b4c0'), x0 + 0.1, -0.16, 0.1, g).rotation.z = 0.12;
      mk(0.16, 0.12, 0.05, woodMat('#b07b50'), x0 - 0.2, -0.12, 0.11, g);
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.035, 4, 10), col('#d9c090')); coil.position.set(0, -0.19, 0.1); g.add(coil);
      mk(0.05, 0.36, 0.04, woodMat('#b07b50'), x2, -0.2, 0.1, g);
      mk(0.2, 0.08, 0.07, col('#6a6571'), x2, -0.02, 0.1, g);
    } else {
      const coat = o.coat || '#4e73b6', C = ramp(coat);
      const face = painted('coat' + coat, 6, 10, (p) => { p.rect(0, 0, 6, 10, C.m); p.rect(2, 0, 2, 3, C.d); p.vline(3, 3, 7, C.d); p.px(2, 4, '#e0a526'); p.px(2, 7, '#e0a526'); p.hline(0, 9, 6, C.d); });
      front(0.36, 0.62, 0.08, col(C.d), face, x0, -0.33, 0.1, g);
      mk(0.4, 0.1, 0.1, col(C.l), x0, -0.03, 0.1, g);
      const sc = painted('scarf' + (o.scarf || '#e97d8f'), 2, 8, (p) => { for (let y = 0; y < 8; y++) p.hline(0, y, 2, y % 3 === 2 ? '#fbf1dc' : o.scarf || '#e97d8f'); });
      front(0.1, 0.5, 0.03, col(o.scarf || '#e97d8f'), sc, 0.04, -0.27, 0.1, g);
      front(0.1, 0.42, 0.03, col(o.scarf || '#e97d8f'), sc, -0.06, -0.24, 0.11, g);
      const hat = new THREE.Group(); hat.position.set(x2, -0.12, 0.13); hat.rotation.x = 1.25; hat.rotation.z = 0.15; g.add(hat);
      cyl(0.24, 0.24, 0.03, col('#e8c46a'), 0, 0, 0, hat, 12);
      cyl(0.12, 0.14, 0.12, col('#e0b858'), 0, 0.07, 0, hat, 10);
      cyl(0.145, 0.145, 0.035, col('#c8454f'), 0, 0.03, 0, hat, 10);
    }
    return { obj: baked(g), size: [1, 1], wall: true };
  },
  // a shelf on the wall: plates standing up, jars, little pots of green, or books
  wallshelf(o) {
    const g = new THREE.Group(), w = o.w || 1, wd = woodMat('#8e5d3e');
    mk(w, 0.05, 0.22, wd, 0, 0, 0.11, g);
    for (const x of [-w / 2 + 0.12, w / 2 - 0.12]) { const b = mk(0.04, 0.16, 0.14, wd, x, -0.1, 0.07, g); b.rotation.x = 0.5; }
    const k = o.kind || 'plates', n = Math.max(2, Math.round(w / 0.3));
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + (i + 0.5) * (w / n);
      if (k === 'plates') {
        const c = ['#f4efe4', '#dcecf7', '#f4efe4', '#f7d6e0'][i % 4];
        const pl = cyl(0.12, 0.12, 0.025, col(c), x, 0.14, 0.07, g, 12); pl.rotation.x = Math.PI / 2 - 0.2;
        const mid = cyl(0.07, 0.07, 0.03, col(['#4e73b6', '#6fa0d0', '#c8454f', '#4e73b6'][i % 4]), x, 0.14, 0.073, g, 10); mid.rotation.x = Math.PI / 2 - 0.2;
      } else if (k === 'jars') {
        const c = ['#e0463f', '#f2c14e', '#7fbf5a', '#b9a2e3'][i % 4];
        cyl(0.06, 0.06, 0.16, col('#dcecf7'), x, 0.1, 0.1, g);
        cyl(0.055, 0.055, 0.11, col(c), x, 0.08, 0.1, g);
        cyl(0.065, 0.065, 0.03, col('#8e5d3e'), x, 0.19, 0.1, g);
      } else if (k === 'pots') {
        cyl(0.07, 0.05, 0.1, col('#c8704a'), x, 0.08, 0.1, g);
        ball(0.08, col(['#5fa453', '#7fbf5a', '#4f955a'][i % 3]), x, 0.17, 0.1, g, 1, 0.8, 1);
      } else {
        const h = 0.18 + (i % 3) * 0.04;
        mk(0.06, h, 0.15, col(['#c8454f', '#4e73b6', '#5fa453', '#e0a526', '#8a64b8'][i % 5]), x, 0.025 + h / 2, 0.1, g).rotation.z = i === n - 1 ? 0.3 : 0;
      }
    }
    return { obj: baked(g), size: [1, 1], wall: true };
  },
  // a cluster of little framed pictures: the sea & a boat, somebody dear, a flower
  frames(o) {
    const g = new THREE.Group(), fr = col('#6b4330');
    const pics = [
      ['sea', 8, 6, -0.3, 0.06, (p) => { p.rect(0, 0, 8, 6, '#6b4330'); p.rect(1, 1, 6, 2, '#bfe3f2'); p.rect(1, 3, 6, 2, '#3a7cae'); p.px(5, 1, '#ffd66b'); p.px(3, 2, '#fbf1dc'); p.px(3, 3, '#c8454f'); p.px(2, 3, '#c8454f'); }],
      ['dear', 6, 8, 0.22, 0.12, (p) => { p.rect(0, 0, 6, 8, '#e0a526'); p.rect(1, 1, 4, 6, '#f7d6e0'); p.rect(2, 2, 2, 2, '#f3c9a8'); p.hline(2, 1, 2, '#8a5a36'); p.rect(1, 5, 4, 2, o.coat || '#4e73b6'); }],
      ['flower', 5, 4, -0.02, -0.3, (p) => { p.rect(0, 0, 5, 4, '#6b4330'); p.rect(1, 1, 3, 2, '#fbf1dc'); p.px(2, 1, '#e97d8f'); p.px(2, 2, '#5fa453'); }],
    ];
    for (const [key, w, h, x, y, fn] of pics) front(w / 16, h / 16, 0.05, fr, painted('frame' + key + (o.coat || ''), w, h, fn), x, y, 0.03, g);
    return { obj: baked(g), size: [1, 1], wall: true };
  },
  // copper pans & a ladle on a rail
  pans(o) {
    const g = new THREE.Group(), cu = col('#c8703a'), cuL = col('#e8a060'), ir = col('#3b3a46');
    const w = o.w || 1.1;
    mk(w, 0.04, 0.04, ir, 0, 0, 0.06, g);
    [[-0.34, 0.15], [0.02, 0.12], [0.36, 0.1]].forEach(([x, r], i) => {
      mk(0.02, 0.1, 0.02, ir, x, -0.05, 0.06, g);
      if (i === 1) { mk(0.03, 0.34, 0.02, col('#b8b4c0'), x, -0.24, 0.07, g); ball(0.06, col('#b8b4c0'), x, -0.42, 0.08, g, 1, 0.7, 1); return; }
      mk(0.04, 0.22, 0.03, ir, x, -0.18, 0.07, g);
      const pan = cyl(r, r, 0.05, cu, x, -0.3 - r, 0.08, g, 12); pan.rotation.x = Math.PI / 2;
      const rim = cyl(r * 0.72, r * 0.72, 0.055, cuL, x, -0.3 - r, 0.085, g, 12); rim.rotation.x = Math.PI / 2;
    });
    return { obj: baked(g), size: [1, 1], wall: true };
  },
  // bundles of herbs drying, hung head down from a rail
  herbs(o) {
    const g = new THREE.Group(), w = o.w || 1.1, twine = col('#d9c090');
    mk(w, 0.05, 0.05, woodMat('#8e5d3e'), 0, 0, 0.05, g);
    const cols = ['#6f9a55', '#8a64b8', '#9ab85a', '#5f8a4a', '#c9a44e'];
    const n = Math.max(3, Math.round(w / 0.24));
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + (i + 0.5) * (w / n), len = 0.14 + (i % 2) * 0.06;
      mk(0.015, len, 0.015, twine, x, -len / 2, 0.07, g);
      const b = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.3, 6), col(cols[i % cols.length]));
      b.position.set(x, -len - 0.13, 0.08); g.add(b);
      mk(0.05, 0.04, 0.05, twine, x, -len + 0.01, 0.08, g);
    }
    return { obj: baked(g), size: [1, 1], wall: true };
  },
  // a fishing net hung up to dry, cork floats along its top, a glass float in a knot of it
  nets(o) {
    const g = new THREE.Group();
    const net = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.9), painted('net', 21, 15, (p) => {
      for (let y = 0; y < 15; y++) for (let x = 0; x < 21; x++) if ((x + y) % 4 === 0 || (x - y + 40) % 4 === 0) p.px(x, y, (x + y) % 8 === 0 ? '#9a8a6a' : '#c9b78a');
      p.hline(0, 0, 21, '#8e7a55');
    }, { alphaTest: 0.5, side: THREE.DoubleSide }));
    net.position.set(0, -0.4, 0.05); g.add(net);
    for (const [x, c] of [[-0.5, '#e8883a'], [-0.1, '#f4efe4'], [0.3, '#e8883a']]) { const f = cyl(0.07, 0.07, 0.12, col(c), x, 0.03, 0.07, g); f.rotation.z = Math.PI / 2; }
    ball(0.11, toon(R, { color: '#8fd6c8', emissive: '#5fb8a8', emissiveIntensity: 0.25 }), 0.35, -0.55, 0.1, g);
    mk(0.2, 0.02, 0.02, col('#9a8a6a'), 0.35, -0.44, 0.1, g);
    return { obj: baked(g), size: [2, 1], wall: true };
  },
  // two oars crossed on the wall
  oars(o) {
    const g = new THREE.Group(), wd = woodMat('#c49a64'), tip = col(o.color || '#3f7fb5');
    for (const s of [-1, 1]) {
      const og = new THREE.Group(); og.rotation.z = s * 0.62; og.position.z = 0.05 + (s > 0 ? 0.03 : 0); g.add(og);
      mk(0.05, 1.3, 0.04, wd, 0, 0, 0, og);
      mk(0.14, 0.34, 0.03, wd, 0, -0.62, 0, og);
      mk(0.145, 0.09, 0.035, tip, 0, -0.76, 0, og);
      mk(0.07, 0.14, 0.05, woodMat('#6b4330'), 0, 0.62, 0, og);
    }
    return { obj: baked(g), size: [1, 1], wall: true };
  },
  // a fish on a plaque, for whoever lives here and caught it
  trophy(o) {
    const g = new THREE.Group();
    const plaque = painted('plaque', 12, 6, (p) => { const c = ramp('#6b4330'); p.rect(0, 0, 12, 6, c.m); p.rect(1, 1, 10, 4, c.d); p.hline(0, 0, 12, c.l); p.px(5, 5, '#e0a526'); p.px(6, 5, '#e0a526'); });
    front(0.75, 0.38, 0.05, col('#5a3b2a'), plaque, 0, 0, 0.02, g);
    const fish = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.25), painted('fishmount', 10, 4, (p) => {
      p.rect(1, 1, 6, 2, '#6fa0d0'); p.hline(2, 0, 4, '#4e73b6'); p.hline(2, 3, 4, '#bfe3f2'); p.px(0, 2, '#4e73b6'); p.px(1, 1, '#1a1422');
      p.px(7, 1, '#4e73b6'); p.px(7, 2, '#4e73b6'); p.px(8, 0, '#4e73b6'); p.px(8, 3, '#4e73b6'); p.px(9, 0, '#3f5f9e'); p.px(9, 3, '#3f5f9e'); p.px(3, 2, '#e8f4fb');
    }, { alphaTest: 0.5 }));
    fish.position.set(0, 0.01, 0.055); g.add(fish);
    return { obj: baked(g), size: [1, 1], wall: true };
  },
  // a woven basket: vegetables from the garden, balls of wool, loaves, apples
  basket(o) {
    const g = new THREE.Group();
    const weave = painted('weave', 16, 4, (p) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 16; x++) p.px(x, y, (x + (y >> 1) * 2) % 4 < 2 ? '#c89a58' : '#a87a42'); p.hline(0, 0, 16, '#8a5a32'); });
    cyl(0.26, 0.2, 0.26, weave, 0, 0.13, 0, g, 10);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.03, 4, 12), col('#8a5a32')); rim.rotation.x = Math.PI / 2; rim.position.y = 0.26; g.add(rim);
    const k = o.kind || 'veg';
    if (k === 'veg') {
      ball(0.13, col('#e8883a'), -0.06, 0.3, 0.02, g, 1.2, 0.8, 1.2); mk(0.03, 0.06, 0.03, col('#5f8a4a'), -0.06, 0.4, 0.02, g);
      for (const [x, z, r] of [[0.12, -0.06, 0.5], [0.14, 0.07, -0.4]]) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.26, 6), col('#f0934a')); c.position.set(x, 0.3, z); c.rotation.z = Math.PI / 2 + r; g.add(c); ball(0.05, col('#7fbf5a'), x - 0.13, 0.32 + r * 0.05, z, g); }
      ball(0.07, col('#c8454f'), 0.02, 0.29, -0.13, g);
    } else if (k === 'yarn') {
      for (const [x, z, c] of [[-0.08, 0.02, '#e97d8f'], [0.09, -0.04, '#6fa0d0'], [0.02, 0.1, '#f2c14e']]) ball(0.09, col(c), x, 0.3, z, g);
      for (const s of [-1, 1]) { const n = mk(0.02, 0.4, 0.02, col('#b8b4c0'), 0.04 * s, 0.4, -0.05, g); n.rotation.z = s * 0.4; }
    } else if (k === 'bread') {
      for (const [x, z, r] of [[-0.08, 0, 0.3], [0.08, 0.04, -0.2], [0, -0.08, 1.4]]) { const l = ball(0.1, col('#d9a05a'), x, 0.3, z, g, 1.5, 0.75, 0.9); l.rotation.y = r; }
    } else {
      for (let i = 0; i < 6; i++) ball(0.065, col(i % 3 ? '#d9364a' : '#8fce66'), Math.cos(i * 1.2) * 0.11, 0.29 + (i % 2) * 0.04, Math.sin(i * 1.2) * 0.1, g);
    }
    return { obj: baked(g), size: [1, 1], solid: false };
  },
  // a few books, stacked where somebody left them
  bookstack(o) {
    const g = new THREE.Group(), cols = ['#4e73b6', '#c8454f', '#5fa453', '#8a64b8', '#e0a526'];
    const n = o.n || 3;
    for (let i = 0; i < n; i++) {
      const b = new THREE.Group(); b.position.y = 0.035 + i * 0.07; b.rotation.y = (i % 2 ? 0.25 : -0.15) + i * 0.1; g.add(b);
      mk(0.36, 0.065, 0.26, col(cols[(i + (o.seed || 0)) % cols.length]), 0, 0, 0, b);
      mk(0.33, 0.05, 0.24, col('#f4efe4'), 0.02, 0, 0, b);
    }
    return { obj: baked(g), size: [1, 1], solid: false };
  },
  // curls of wood shavings on the floor (by a workbench)
  shavings(o) {
    const g = new THREE.Group(), w = o.w || 1.2, d = o.d || 0.8, W = Math.round(w * 16), H = Math.round(d * 16);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), painted('shavings' + W + 'x' + H, W, H, (p) => {
      const r = rng(W * 7 + H);
      for (let i = 0; i < W * H * 0.06; i++) {
        const x = Math.floor(r() * W), y = Math.floor(r() * H), cx = W / 2, cy = H / 2;
        if (((x - cx) / cx) ** 2 + ((y - cy) / cy) ** 2 > 1 - r() * 0.3) continue;
        const c = r() < 0.5 ? '#e8c890' : '#d9b07a';
        p.px(x, y, c); if (r() < 0.6) p.px(x + 1, y, c); if (r() < 0.4) p.px(x + 1, y + 1, '#c49a64');
      }
    }, { alphaTest: 0.5 }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.013; m.receiveShadow = true; g.add(m);
    return { obj: g, size: [1, 1], flat: true };
  },
  // an A-frame chalkboard: a steaming cup, a slice of cake and a heart in chalk (no words to read)
  chalkboard(o) {
    const g = new THREE.Group(), wd = woodMat('#8e5d3e');
    const face = painted('chalk', 10, 13, (p) => {
      p.rect(0, 0, 10, 13, '#6b4330'); p.rect(1, 1, 8, 11, '#2f3b36');
      p.rect(2, 3, 3, 3, '#e8e4dc'); p.px(5, 4, '#e8e4dc'); p.px(3, 1, '#9aa89e'); p.px(4, 2, '#9aa89e');
      p.hline(2, 8, 4, '#f4c6cf'); p.hline(3, 7, 3, '#f4c6cf'); p.hline(2, 9, 4, '#fbf1dc');
      p.px(7, 8, '#e97d8f'); p.px(8, 8, '#e97d8f'); p.px(7, 9, '#e97d8f'); p.px(8, 9, '#e97d8f'); p.px(7, 7, '#e97d8f'); p.px(8, 10, '#e97d8f');
      p.hline(2, 11, 6, '#9aa89e');
    });
    const b = front(0.62, 0.8, 0.05, wd, face, 0, 0.52, 0.06, g); b.rotation.x = -0.18;
    const back = mk(0.62, 0.8, 0.05, wd, 0, 0.52, -0.1, g); back.rotation.x = 0.18;
    return { obj: baked(g), size: [1, 1], solid: true };
  },
  // a teapot & two cups, on a table (y: its top)
  teaset(o) {
    const g = new THREE.Group(), c = col(o.color || '#f4efe4'), acc = col(o.accent || '#6fa0d0');
    ball(0.1, c, 0, 0.08, 0, g, 1.1, 0.85, 1.1);
    cyl(0.045, 0.06, 0.03, acc, 0, 0.165, 0, g);
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.12, 5), c); sp.position.set(0.12, 0.1, 0); sp.rotation.z = -0.9; g.add(sp);
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.014, 4, 8), c); h.position.set(-0.11, 0.09, 0); g.add(h);
    for (const [x, z] of [[0.22, 0.12], [-0.2, 0.14]]) { cyl(0.07, 0.07, 0.012, c, x, 0.006, z, g, 10); cyl(0.04, 0.032, 0.06, c, x, 0.04, z, g); cyl(0.034, 0.034, 0.005, acc, x, 0.068, z, g); }
    return { obj: baked(g), size: [1, 1], solid: false };
  },
  // thank-you cards standing in a row (on a mantelpiece)
  cards(o) {
    const g = new THREE.Group();
    ['#f7d6e0', '#fff3a6', '#dcecf7', '#e6f4d8'].forEach((c, i) => {
      const f = painted('card' + c, 3, 4, (p) => { p.rect(0, 0, 3, 4, c); p.px(1, 1, '#e97d8f'); p.px(1, 2, '#c8454f'); });
      const m = front(0.17, 0.22, 0.015, col(c), f, -0.3 + i * 0.2, 0.11, 0, g); m.rotation.y = (i % 2 ? 0.25 : -0.2);
    });
    return { obj: baked(g), size: [1, 1], wall: true };
  },
});

export function buildFurniture(r3d, o) {
  R = r3d;
  const f = FURN[o.type];
  if (!f) return null;
  const res = f(o);
  res.obj.traverse((m) => { if (m.isMesh) { m.castShadow = m.castShadow !== false; m.receiveShadow = true; } });
  return res;
}
