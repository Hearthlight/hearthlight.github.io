// Village props: lamps, benches, fences, fountain, well, boats, stall, pier,
// bridge… Each builder returns { obj, colliders, lights, anim } pieces.

import { THREE, pixelTexture, toon } from '../render/r3d.js';
import { Painter, paintPlanks, paintWall, paintWood, paintAwning, paintRoof, drawIcon } from '../art/surfaces.js';
import { polyGeometry, quad, tri, bakeMeshes, bakeTree, softBoxGeo } from './geom.js';
import { ramp, mix } from '../engine/color.js';
import { rng, hash2 } from '../engine/util.js';
import { flameCluster, embers } from './flame.js';
import { leafTexture } from './treekit.js';

const U = 1 / 16;
export const KOI = { len: 9, arch: 0.42 };
let R3 = null;
const M = {}; // shared materials (lazy)

function mats(r3d) {
  if (R3 === r3d) return M;
  R3 = r3d;
  const woodTex = pixelTexture(paintWood(16, 16, '#8e5d3e', { seed: 3 }), { repeat: true });
  const darkWoodTex = pixelTexture(paintWood(16, 16, '#5a3b2a', { seed: 4 }), { repeat: true });
  const stoneTex = pixelTexture(paintWall(32, 32, 'stone', { wallColor: '#b0a9ae' }, 12, { foundation: false }), { repeat: true });
  Object.assign(M, {
    wood: toon(r3d, { map: woodTex, key: 'p-wood' }),
    darkWood: toon(r3d, { map: darkWoodTex, key: 'p-dwood' }),
    iron: toon(r3d, { color: 0x3b3a46, key: 'p-iron' }),
    stone: toon(r3d, { map: stoneTex, key: 'p-stone' }),
    stoneLight: toon(r3d, { color: 0xc9c2c4, key: 'p-stonel' }),
    glass: toon(r3d, { color: 0xf3e2b0, emissive: 0xffc15a, emissiveIntensity: 0, key: 'p-lampglass' }),
    red: toon(r3d, { color: 0xc8454f, key: 'p-red' }),
    white: toon(r3d, { color: 0xf4efe4, key: 'p-white' }),
    water: toon(r3d, { color: 0x5aa8cf, emissive: 0x2a6f9a, emissiveIntensity: 0.25, key: 'p-water' }),
    paper: toon(r3d, { color: 0xfbf1dc, key: 'p-paper' }),
    leaf: toon(r3d, { color: 0x5fa453, key: 'p-leaf' }),
    rope: toon(r3d, { color: 0xd9c090, key: 'p-rope' }),
  });
  return M;
}

function bigEnough(m) {
  const g = m.geometry;
  if (!g.boundingSphere) g.computeBoundingSphere();
  return g.boundingSphere.radius * Math.max(m.scale.x, m.scale.y, m.scale.z) >= 0.12;
}

const bake = (g) => bakeMeshes(g, toon(R3, { color: 0xffffff, vertexColors: true, key: 'p-vc' }));

// ---- little painted textures shared by the props
const TEX = {};
const tex = (key, make) => TEX[key] || (TEX[key] = make());
// bark: furrows running along the log, a lighter ridge between them
function barkMat(color = '#7a5238') {
  return toon(R3, { key: 'p-bark-' + color, map: tex('bark' + color, () => {
    const R = ramp(color), p = new Painter(16, 16), r = rng(7);
    p.rect(0, 0, 16, 16, R.m);
    for (let x = 0; x < 16; x += 4) {
      let xx = x;
      for (let y = 0; y < 16; y++) { if (r() < 0.25) xx += r() < 0.5 ? -1 : 1; p.px((xx + 16) % 16, y, R.d); if (r() < 0.3) p.px((xx + 17) % 16, y, R.o); }
      p.vline((x + 2) % 16, Math.floor(r() * 8), 5, R.l);
    }
    const t = pixelTexture(p.c, { repeat: true }); t.repeat.set(2, 1); return t;
  }) });
}
// a sawn end: pale wood, a few growth rings, a darker bark rim
function ringsMat(color = '#d9b07a') {
  return toon(R3, { key: 'p-rings-' + color, map: tex('rings' + color, () => {
    const R = ramp(color), p = new Painter(16, 16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x - 7.5, y - 7.5);
      p.px(x, y, d > 7.2 ? '#5a3b2a' : d > 6.3 ? R.d : d < 1.3 ? R.d : Math.round(d) % 3 === 0 ? mix(R.m, R.d, 0.55) : R.m);
    }
    return pixelTexture(p.c);
  }) });
}
function mesh(geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}
const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);

// ---------------------------------------------------------------------------
export function buildProp(r3d, o, ctx = {}) {
  const m = mats(r3d);
  const g = new THREE.Group();
  const out = { obj: g, colliders: [], lights: [], anim: null, kind: o.type };
  const X = o.x, Z = o.y;
  const f = PROPS[o.type];
  if (!f) return null;
  f(g, o, out, m, r3d, ctx);
  g.position.set(X, 0, Z);
  // (a bolt, a lid, a little bar casts no shadow worth its draw call)
  g.traverse((c) => { if (c.isMesh) { c.castShadow = !c.userData.noCast && bigEnough(c); c.receiveShadow = true; } });
  return out;
}

const PROPS = {
  lamp(g, o, out, m) {
    // a village lamp post: a stepped foot, a slim post with collars, a four-paned lantern under a
    // little iron roof — and on some, a basket of flowers hung from a hook
    const iron = m.iron;
    g.add(mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.1, 8), iron, 0, 0.05, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.2, 8), iron, 0, 0.2, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.32, 6), iron, 0, 0.96, 0));
    for (const y of [0.34, 1.02, 1.58]) g.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 8), iron, 0, y, 0));
    g.add(mesh(B(0.3, 0.05, 0.3), iron, 0, 1.64, 0));
    const lantern = mesh(B(0.23, 0.27, 0.23), m.glass, 0, 1.8, 0);
    lantern.userData.noCast = true; lantern.userData.keep = true;
    g.add(lantern);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(mesh(B(0.035, 0.29, 0.035), iron, x * 0.12, 1.8, z * 0.12));
    const cap = mesh(new THREE.ConeGeometry(0.25, 0.16, 4), iron, 0, 2.02, 0);
    cap.rotation.y = Math.PI / 4;
    g.add(cap);
    g.add(mesh(new THREE.SphereGeometry(0.045, 6, 4), iron, 0, 2.13, 0));
    if (hash2(Math.floor(o.x), Math.floor(o.y), 17) < 0.5) {
      const s = hash2(Math.floor(o.x), 2, 18) < 0.5 ? 1 : -1;
      const arm = mesh(B(0.3, 0.03, 0.03), iron, s * 0.15, 1.42, 0);
      arm.userData.noCast = true;
      g.add(arm);
      const basket = mesh(new THREE.SphereGeometry(0.13, 8, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toon(R3, { color: 0x8e5d3e, key: 'p-basket' }), s * 0.28, 1.28, 0);
      g.add(basket);
      g.add(mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 8), toon(R3, { color: 0x4f8f45, key: 'p-basketleaf' }), s * 0.28, 1.29, 0));
      const cols = [0xec5f73, 0xffd66b, 0xf4a4b6, 0xfff8ec, 0xb9a2e3], rr = rng(Math.floor(o.x * 13 + o.y * 7));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2, f = mesh(B(0.06, 0.05, 0.06), toon(R3, { color: cols[Math.floor(rr() * cols.length)], key: 'petal-l' + (i % 5) }), s * 0.28 + Math.cos(a) * 0.08, 1.33 + rr() * 0.03, Math.sin(a) * 0.08);
        f.userData.noCast = true;
        g.add(f);
      }
      for (const a of [0.6, 2.4, 4.2]) { const v = mesh(B(0.03, 0.14, 0.03), toon(R3, { color: 0x5fa453, key: 'p-leaf' }), s * 0.28 + Math.cos(a) * 0.12, 1.2, Math.sin(a) * 0.12); v.userData.noCast = true; g.add(v); }
    }
    bake(g);
    out.colliders.push({ x: o.x, z: o.y, r: 0.15 });
    out.lights.push({ x: o.x, y: 1.75, z: o.y + 0.05, color: 0xff9c52, power: 1.4, lamp: true });
  },
  bunting(g, o, out, m) {
    // little flags on a string sagging from one lamp's cap to the next (o.x2, o.y2: the other lamp),
    // high enough to pass over everyone's heads
    const dx = o.x2 - o.x, dz = o.y2 - o.y, L = Math.hypot(dx, dz), n = Math.max(4, Math.round(L / 0.3));
    const y0 = 2.08, sag = 0.12 + L * 0.012;
    const at = (k) => [dx * k, y0 - Math.sin(k * Math.PI) * sag, dz * k];
    for (let i = 0; i < 10; i++) {
      const a = at(i / 10), b = at((i + 1) / 10), len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      const s = mesh(B(0.02, 0.02, len), m.rope, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
      s.lookAt(b[0], b[1], b[2]);
      s.userData.noCast = true;
      g.add(s);
    }
    const pos = [], col = [], cols = [0xec5f73, 0xffd66b, 0x8fd6b4, 0x7cb6e0, 0xf6a05a, 0xb9a2e3];
    const ux = (dx / L) * 0.12, uz = (dz / L) * 0.12, c = new THREE.Color();
    for (let i = 1; i < n; i++) {
      const p = at(i / n);
      c.setHex(cols[(i + Math.floor(o.x)) % cols.length]);
      // (both windings, so either face shows the same, sky-lit flag)
      pos.push(p[0] - ux, p[1], p[2] - uz, p[0] + ux, p[1], p[2] + uz, p[0], p[1] - 0.22, p[2]);
      pos.push(p[0] + ux, p[1], p[2] + uz, p[0] - ux, p[1], p[2] - uz, p[0], p[1] - 0.22, p[2]);
      for (let k = 0; k < 2; k++) col.push(c.r, c.g, c.b, c.r, c.g, c.b, c.r * 0.85, c.g * 0.85, c.b * 0.85);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    // (lit as if they faced the sky: a flag seen edge-on to the sun would go dark)
    const nrm = new Float32Array(pos.length);
    for (let i = 0; i < nrm.length; i += 3) { nrm[i + 1] = 0.8; nrm[i + 2] = 0.6; }
    geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    const flags = new THREE.Mesh(geo, toon(R3, { vertexColors: true, key: 'p-bunting' }));
    flags.userData.keep = true;
    g.add(flags);
    bake(g);
  },
  // ---------------- life around the houses: each one says who lives there ----------------
  pots(g, o, out, m) {
    // two or three terracotta pots of different sizes: a leafy shrub, flowers, a trailing herb
    const rr = rng(Math.floor(o.x * 23 + o.y * 7)), clay = toon(R3, { color: 0xc0643c, key: 'p-clay' }), rim = toon(R3, { color: 0xd98458, key: 'p-clayrim' });
    const soil = toon(R3, { color: 0x4e3326, key: 'soil' }), leaf = toon(R3, { color: 0x5fa453, key: 'p-leaf' }), leafD = toon(R3, { color: 0x4a8a45, key: 'p-leafd' });
    const cols = [0xec5f73, 0xffd66b, 0xf4a4b6, 0xfff8ec, 0xb9a2e3, 0xf0934a];
    const n = 2 + Math.floor(rr() * 2);
    for (let i = 0; i < n; i++) {
      const s = 0.7 + rr() * 0.5, x = (i - (n - 1) / 2) * 0.34 + (rr() - 0.5) * 0.06, z = (i % 2) * 0.1;
      g.add(mesh(new THREE.CylinderGeometry(0.13 * s, 0.09 * s, 0.24 * s, 8), clay, x, 0.12 * s, z));
      g.add(mesh(new THREE.CylinderGeometry(0.145 * s, 0.145 * s, 0.05 * s, 8), rim, x, 0.24 * s, z));
      g.add(mesh(new THREE.CylinderGeometry(0.12 * s, 0.12 * s, 0.02, 8), soil, x, 0.255 * s, z));
      const kind = Math.floor(rr() * 3);
      if (kind === 0) { const b = mesh(new THREE.IcosahedronGeometry(1, 0), rr() < 0.5 ? leaf : leafD, x, 0.34 * s, z); b.scale.set(0.16 * s, 0.14 * s, 0.14 * s); g.add(b); }
      else for (let k = 0; k < 4; k++) {
        const a = k * 1.7 + rr(), px = x + Math.cos(a) * 0.06 * s, pz = z + Math.sin(a) * 0.05 * s, h = (0.12 + rr() * 0.1) * s;
        g.add(mesh(B(0.025, h, 0.025), leaf, px, 0.25 * s + h / 2, pz));
        const f = mesh(B(0.07, 0.05, 0.07), toon(R3, { color: cols[Math.floor(rr() * cols.length)], key: 'petal-p' + k }), px, 0.26 * s + h, pz);
        f.userData.noCast = true; g.add(f);
      }
    }
    bake(g);
    out.colliders.push({ x: o.x, z: o.y, r: 0.24 });
  },
  seedlings(g, o, out, m) {
    // a nursery bench: a low slatted table of seedling trays, and a watering can
    const wood = m.wood, tray = toon(R3, { color: 0x7a5238, key: 'p-tray' }), soil = toon(R3, { color: 0x4e3326, key: 'soil' }), sprout = toon(R3, { color: 0x7fc45a, key: 'p-sprout' });
    for (const [x, z] of [[-0.4, -0.15], [0.4, -0.15], [-0.4, 0.15], [0.4, 0.15]]) g.add(mesh(B(0.05, 0.32, 0.05), wood, x, 0.16, z));
    g.add(mesh(B(0.95, 0.04, 0.42), wood, 0, 0.34, 0));
    for (const x of [-0.24, 0.24]) {
      g.add(mesh(B(0.42, 0.06, 0.34), tray, x, 0.39, 0));
      g.add(mesh(B(0.38, 0.02, 0.3), soil, x, 0.42, 0));
      for (let i = 0; i < 12; i++) { const s = mesh(B(0.035, 0.07, 0.035), sprout, x - 0.14 + (i % 4) * 0.095, 0.46, -0.1 + Math.floor(i / 4) * 0.1); s.userData.noCast = true; g.add(s); }
    }
    const can = toon(R3, { color: 0x6f9aa8, key: 'p-can' });
    g.add(mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.18, 8), can, 0.62, 0.09, 0.2));
    const sp = mesh(B(0.2, 0.03, 0.03), can, 0.74, 0.14, 0.2); sp.rotation.z = 0.6; g.add(sp);
    bake(g);
    out.colliders.push({ x: o.x, z: o.y, r: 0.45 });
  },
  sawhorse(g, o, out, m) {
    // a carpenter's sawhorse with a plank half sawn through, sawdust underneath
    for (const x of [-0.38, 0.38]) for (const s of [-1, 1]) { const l = mesh(B(0.06, 0.52, 0.06), m.wood, x, 0.24, s * 0.1); l.rotation.x = s * 0.4; g.add(l); }
    g.add(mesh(B(0.95, 0.07, 0.08), m.darkWood, 0, 0.47, 0));
    const plank = toon(R3, { key: 'p-plank', map: tex('plank', () => pixelTexture(paintPlanks(16, 4, { dir: 'h', color: '#d4a674', seed: 5 }))) });
    const pl = mesh(B(1.3, 0.05, 0.22), plank, 0.1, 0.53, 0.02); pl.rotation.y = 0.12; g.add(pl);
    const dust = mesh(new THREE.CircleGeometry(0.22, 8), toon(R3, { color: 0xe8cf9c, key: 'p-sawdust' }), 0.2, 0.012, 0.05);
    dust.rotation.x = -Math.PI / 2; dust.scale.y = 0.7; dust.userData.noCast = true; g.add(dust);
    bake(g);
    out.colliders.push({ x: o.x, z: o.y, r: 0.42 });
  },
  sacks(g, o, out, m) {
    // flour sacks against the bakery wall, one open and white inside, a scoop in it
    const burlap = toon(R3, { key: 'p-burlap', map: tex('burlap', () => {
      const p = new Painter(8, 8), r = rng(3); p.rect(0, 0, 8, 8, '#d9c49a');
      for (let i = 0; i < 16; i++) p.px(Math.floor(r() * 8), Math.floor(r() * 8), r() < 0.5 ? '#c4ad80' : '#e8d8b4');
      p.hline(0, 3, 8, '#c8453a'); return pixelTexture(p.c);
    }) });
    for (const [x, z, s, r] of [[-0.22, 0, 1, 0.1], [0.2, 0.05, 0.9, -0.2], [0, -0.16, 0.85, 0.4]]) {
      const b = mesh(softBoxGeo(0.34 * s, 0.42 * s, 0.26 * s, 0.35), burlap, x, 0.21 * s, z); b.rotation.y = r; g.add(b);
    }
    g.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 8), toon(R3, { color: 0xfbf8f2, key: 'p-flour' }), 0.2, 0.39, 0.05));
    bake(g);
    out.colliders.push({ x: o.x, z: o.y, r: 0.36 });
  },
  breadrack(g, o, out, m) {
    // a little rack of loaves by the bakery door: baguettes & round loaves on two shelves
    for (const x of [-0.3, 0.3]) g.add(mesh(B(0.05, 0.7, 0.05), m.darkWood, x, 0.35, 0));
    const crust = toon(R3, { color: 0xc98a4a, key: 'p-crust' }), light = toon(R3, { color: 0xe0a860, key: 'p-crust2' });
    for (const y of [0.3, 0.58]) {
      g.add(mesh(B(0.66, 0.04, 0.26), m.wood, 0, y, 0));
      for (let i = 0; i < 3; i++) { const l = mesh(softBoxGeo(0.16, 0.09, 0.12, 0.4), i % 2 ? light : crust, -0.2 + i * 0.2, y + 0.07, 0); g.add(l); }
    }
    const bag = mesh(softBoxGeo(0.4, 0.06, 0.06, 0.4), light, 0, 0.7, 0.02); bag.rotation.z = 0.25; g.add(bag);
    bake(g);
    out.colliders.push({ x: o.x, z: o.y, r: 0.3 });
  },
  terrace(g, o, out, m) {
    // a café table on the terrace: a round top on a pedestal, two chairs, cups, a striped parasol
    const iron = m.iron, top = toon(R3, { color: 0xf4efe4, key: 'p-tabletop' });
    g.add(mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 12), top, 0, 0.56, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.54, 6), iron, 0, 0.28, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.03, 8), iron, 0, 0.015, 0));
    const seat = toon(R3, { color: 0x3f9b98, key: 'p-chair' });
    for (const s of [-1, 1]) {
      g.add(mesh(B(0.26, 0.04, 0.26), seat, s * 0.42, 0.34, 0.02));
      g.add(mesh(B(0.04, 0.3, 0.26), seat, s * 0.54, 0.5, 0.02));
      for (const [dx, dz] of [[-0.1, -0.1], [0.1, -0.1], [-0.1, 0.1], [0.1, 0.1]]) g.add(mesh(B(0.03, 0.33, 0.03), iron, s * 0.42 + dx, 0.165, 0.02 + dz));
    }
    const cup = toon(R3, { color: 0xfbf1dc, key: 'p-cup' });
    for (const x of [-0.1, 0.12]) g.add(mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.05, 6), cup, x, 0.6, 0.05));
    g.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.5, 6), toon(R3, { color: 0xf4efe4, key: 'p-white' }), 0, 0.95, 0));
    const pp = new Painter(32, 4);
    for (let x = 0; x < 32; x++) pp.vline(x, 0, 4, Math.floor(x / 4) % 2 ? '#fbf1dc' : '#8a5a9e');
    const para = mesh(new THREE.ConeGeometry(0.72, 0.3, 8, 1, true), toon(R3, { key: 'p-parasol', map: tex('parasol', () => pixelTexture(pp.c)), side: THREE.DoubleSide, shadowSide: THREE.DoubleSide }), 0, 1.62, 0);
    g.add(para);
    bake(g);
    out.colliders.push({ x: o.x, z: o.y, r: 0.55 });
  },
  bookcart(g, o, out, m) {
    // the library's book cart: two shelves of books in every colour, two wheels, a handle
    g.add(mesh(B(0.7, 0.05, 0.32), m.wood, 0, 0.22, 0));
    g.add(mesh(B(0.7, 0.05, 0.32), m.wood, 0, 0.5, 0));
    for (const x of [-0.33, 0.33]) g.add(mesh(B(0.04, 0.56, 0.3), m.darkWood, x, 0.36, 0));
    const cols = [0xc8454f, 0x4d7fc4, 0x5fa453, 0xf2c14e, 0x8a5a9e, 0xe8883a, 0x3f9b98];
    const rr = rng(Math.floor(o.x * 5 + o.y));
    for (const y of [0.25, 0.53]) for (let x = -0.28; x < 0.28; x += 0.07) { const h = 0.13 + rr() * 0.07; const bk = mesh(B(0.055, h, 0.2), toon(R3, { color: cols[Math.floor(rr() * cols.length)], key: 'p-book' + Math.floor(x * 100) % 7 }), x, y + h / 2, 0); bk.rotation.z = (rr() - 0.5) * 0.15; g.add(bk); }
    for (const s of [-1, 1]) { const w = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.04, 10), m.iron, s * 0.3, 0.1, 0.18); w.rotation.x = Math.PI / 2; g.add(w); }
    g.add(mesh(B(0.04, 0.04, 0.32), m.iron, 0.42, 0.6, 0));
    bake(g);
    out.colliders.push({ x: o.x, z: o.y, r: 0.38 });
  },
  birdhouse(g, o, out, m) {
    // a birdhouse on a pole: a pitched roof, a round door, a perch — and a blue tit on it
    g.add(mesh(B(0.07, 1.25, 0.07), m.darkWood, 0, 0.62, 0));
    g.add(mesh(B(0.3, 0.3, 0.26), toon(R3, { color: 0x8fb7d6, key: 'p-birdhouse' }), 0, 1.38, 0));
    for (const s of [-1, 1]) { const r = mesh(B(0.24, 0.04, 0.34), toon(R3, { color: 0xc8454f, key: 'p-red' }), s * 0.09, 1.6, 0); r.rotation.z = s * -0.6; g.add(r); }
    const hole = mesh(new THREE.CircleGeometry(0.05, 8), toon(R3, { color: 0x2a1f26, key: 'loghole' }), 0, 1.42, 0.131); hole.userData.noCast = true; g.add(hole);
    g.add(mesh(B(0.02, 0.02, 0.1), m.darkWood, 0, 1.33, 0.16));
    const bird = toon(R3, { color: 0x4d7fc4, key: 'p-tit' }), belly = toon(R3, { color: 0xf2c14e, key: 'p-titbelly' });
    g.add(mesh(B(0.07, 0.06, 0.06), bird, 0.05, 1.37, 0.2));
    g.add(mesh(B(0.05, 0.04, 0.05), belly, 0.05, 1.35, 0.225));
    bake(g);
    out.colliders.push({ x: o.x, z: o.y, r: 0.12 });
  },
  nets(g, o, out, m) {
    // a drying rack for the fishing nets: two posts, a pole, a net hung over it with cork floats
    for (const x of [-0.55, 0.55]) g.add(mesh(B(0.08, 1.2, 0.08), m.darkWood, x, 0.6, 0));
    const pole = mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.3, 6), m.wood, 0, 1.14, 0);
    pole.rotation.z = Math.PI / 2;
    g.add(pole);
    const net = toon(R3, { key: 'p-net', alphaTest: 0.5, side: THREE.DoubleSide, map: tex('net', () => {
      const p = new Painter(24, 20);
      for (let y = 0; y < 20; y++) for (let x = 0; x < 24; x++) if ((x + y) % 4 === 0 || (x - y + 40) % 4 === 0) p.px(x, y, y > 15 ? '#8a7a5a' : '#b8a57a');
      return pixelTexture(p.c);
    }) });
    const drape = mesh(new THREE.PlaneGeometry(1.05, 0.95), net, 0, 0.66, 0.02);
    drape.userData.noCast = true;
    g.add(drape);
    const cork = toon(R3, { color: 0xe8883a, key: 'p-cork' });
    for (let i = 0; i < 5; i++) { const c = mesh(new THREE.SphereGeometry(0.04, 6, 4), cork, -0.44 + i * 0.22, 0.2, 0.04); c.userData.noCast = true; g.add(c); }
    bake(g);
    out.colliders.push({ rect: [o.x - 0.62, o.y - 0.1, 1.24, 0.2] });
  },
  crabpots(g, o, out, m) {
    // crab pots stacked by the shore: slatted cages, a coil of rope, a buoy
    const cage = toon(R3, { key: 'p-cage', alphaTest: 0.5, map: tex('cage', () => {
      const p = new Painter(8, 8);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (x % 3 === 0 || y === 0 || y === 7) p.px(x, y, (x + y) % 2 ? '#6b4a34' : '#8e6a4a');
      return pixelTexture(p.c);
    }) });
    for (const [x, y, z, r] of [[-0.18, 0.17, 0, 0.1], [0.2, 0.17, 0.04, -0.2], [0.02, 0.51, 0.02, 0.3]]) { const c = mesh(B(0.36, 0.32, 0.3), cage, x, y, z); c.rotation.y = r; g.add(c); }
    const coil = mesh(new THREE.TorusGeometry(0.12, 0.04, 5, 10), m.rope, 0.46, 0.04, 0.12); coil.rotation.x = Math.PI / 2; g.add(coil);
    g.add(mesh(new THREE.SphereGeometry(0.1, 8, 6), m.red, -0.46, 0.1, 0.14));
    bake(g);
    out.colliders.push({ x: o.x, z: o.y, r: 0.4 });
  },
  rocker(g, o, out, m) {
    // a rocking chair on the farmhouse porch, a folded blanket on it, rocking gently in the breeze
    const chair = new THREE.Group();
    const w = m.wood;
    for (const x of [-0.18, 0.18]) {
      const r = mesh(new THREE.TorusGeometry(0.34, 0.025, 4, 12, 1.1), m.darkWood, x, 0.36, 0.02); r.rotation.set(0, Math.PI / 2, Math.PI + 1.02); chair.add(r);
      chair.add(mesh(B(0.04, 0.3, 0.04), w, x, 0.2, 0.12)); chair.add(mesh(B(0.04, 0.72, 0.04), w, x, 0.4, -0.14));
      chair.add(mesh(B(0.04, 0.04, 0.3), w, x, 0.46, 0));
    }
    chair.add(mesh(B(0.4, 0.04, 0.3), w, 0, 0.32, 0));
    for (let k = 0; k < 3; k++) chair.add(mesh(B(0.4, 0.06, 0.03), w, 0, 0.5 + k * 0.12, -0.15));
    chair.add(mesh(B(0.3, 0.05, 0.2), toon(R3, { color: 0xc8454f, key: 'p-blanket2' }), 0.02, 0.36, 0.02));
    chair.userData.keep = true;
    chair.traverse((c) => { c.userData.keep = true; });
    g.add(chair);
    if (o.rot) g.rotation.y = o.rot;
    out.anim = 'rock'; out.animPart = chair;
    out.colliders.push({ x: o.x, z: o.y, r: 0.26 });
  },
  raincask(g, o, out, m) {
    // a rain barrel under a downpipe from the gutter, its water catching the sky
    PROPS.barrel(g, { x: o.x, y: o.y }, { colliders: [], lights: [] }, m);
    const water = mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.02, 12), toon(R3, { color: 0x5a8fb8, emissive: 0x2a5f8a, emissiveIntensity: 0.2, key: 'p-caskwater' }), 0, 0.66, 0);
    water.userData.noCast = true; g.add(water);
    const pipe = toon(R3, { color: 0x6a6571, key: 'p-pipe' });
    g.add(mesh(B(0.07, 1.25, 0.07), pipe, 0.12, 1.33, -0.24));
    const el = mesh(B(0.07, 0.07, 0.2), pipe, 0.12, 0.74, -0.15); el.rotation.x = 0.7; g.add(el);
    bake(g);
    out.colliders.push({ x: o.x, z: o.y, r: 0.3 });
  },
  laundry(g, o, out, m) {
    // a washing line between two T-posts (o.x2: the far post), shirts & sheets pegged out, swaying
    const L = o.x2 - o.x;
    for (const x of [0, L]) { g.add(mesh(B(0.07, 1.45, 0.07), m.darkWood, x, 0.72, 0)); g.add(mesh(B(0.07, 0.07, 0.34), m.darkWood, x, 1.42, 0)); }
    const line = mesh(B(L, 0.015, 0.015), m.rope, L / 2, 1.36, 0.06); line.userData.noCast = true; g.add(line);
    const clothes = [], rr = rng(Math.floor(o.x * 9 + o.y * 3));
    const kinds = [['shirt', '#7cb6e0'], ['sheet', '#fbf6ea'], ['shirt', '#e97d8f'], ['towel', '#f6d38f'], ['sheet', '#dcecf7'], ['shirt', '#8fd6b4']];
    let x = 0.3;
    for (const [k, c] of kinds) {
      const w = k === 'sheet' ? 0.62 : k === 'towel' ? 0.34 : 0.38, h = k === 'sheet' ? 0.62 : k === 'towel' ? 0.42 : 0.42;
      if (x + w > L - 0.15) break;
      const P = new Painter(12, 12), R = ramp(c);
      P.rect(0, 0, 12, 12, R.m); P.hline(0, 0, 12, R.l); P.hline(0, 11, 12, R.d);
      if (k === 'shirt') { P.ctx.clearRect(0, 4, 2, 8); P.ctx.clearRect(10, 4, 2, 8); P.rect(5, 1, 2, 2, R.d); P.vline(6, 3, 8, R.d); }
      if (k === 'towel') { P.hline(0, 3, 12, '#c8454f'); P.hline(0, 8, 12, '#c8454f'); }
      if (k === 'sheet') for (let yy = 2; yy < 12; yy += 3) P.hline(0, yy, 12, R.l);
      const cm = toon(R3, { map: pixelTexture(P.c), side: THREE.DoubleSide, alphaTest: 0.5 });
      const piv = new THREE.Group(); piv.position.set(x + w / 2, 1.36, 0.06);
      const cl = mesh(new THREE.PlaneGeometry(w, h), cm, 0, -h / 2, 0);
      cl.userData.keep = true; piv.add(cl); piv.userData.keep = true;
      for (const px of [-w / 2 + 0.05, w / 2 - 0.05]) { const peg = mesh(B(0.025, 0.06, 0.03), m.wood, px, 0, 0.01); peg.userData.keep = true; peg.userData.noCast = true; piv.add(peg); }
      g.add(piv); clothes.push(piv);
      x += w + 0.12 + rr() * 0.1;
    }
    bake(g);
    out.anim = 'laundry'; out.animPart = clothes;
    out.colliders.push({ x: o.x, z: o.y, r: 0.12 }, { x: o.x2, z: o.y, r: 0.12 });
  },
  wheelbarrow(g, o, out, m) {
    // a wheelbarrow of pumpkins & carrots by the barn
    const tub = toon(R3, { color: 0x6f9150, key: 'p-barrow' });
    const t = mesh(new THREE.CylinderGeometry(0.34, 0.24, 0.2, 4, 1, true), toon(R3, { color: 0x6f9150, key: 'p-barrow2', side: THREE.DoubleSide }), 0, 0.36, 0);
    t.rotation.y = Math.PI / 4; t.scale.set(1.2, 1, 0.8); g.add(t);
    g.add(mesh(B(0.42, 0.03, 0.3), tub, 0, 0.27, 0));
    const wh = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 10), m.iron, 0.46, 0.13, 0); wh.rotation.x = Math.PI / 2; g.add(wh);
    for (const s of [-1, 1]) { const h = mesh(B(0.62, 0.035, 0.035), m.wood, -0.3, 0.36, s * 0.16); h.rotation.z = -0.25; g.add(h); g.add(mesh(B(0.03, 0.26, 0.03), m.wood, -0.12, 0.13, s * 0.12)); }
    const pump = toon(R3, { color: 0xe8883a, key: 'p-pumpkin' });
    for (const [x, z, s] of [[-0.06, 0.02, 1], [0.12, -0.04, 0.8]]) { const p = mesh(new THREE.SphereGeometry(0.11 * s, 8, 6), pump, x, 0.44, z); p.scale.y = 0.8; g.add(p); }
    const car = toon(R3, { color: 0xf0934a, key: 'p-carrot' });
    for (let i = 0; i < 3; i++) { const c = mesh(new THREE.ConeGeometry(0.025, 0.16, 5), car, 0.06 + i * 0.05, 0.47, 0.08); c.rotation.z = 1.4; g.add(c); }
    if (o.rot) g.rotation.y = o.rot;
    bake(g);
    out.colliders.push({ x: o.x, z: o.y, r: 0.4 });
  },
  surfboard(g, o, out, m) {
    // a surfboard leaning on the beach hut's wall, a stripe down its middle
    const P = new Painter(6, 24);
    P.rect(0, 0, 6, 24, '#f6d38f'); P.vline(2, 0, 24, '#e8883a'); P.vline(3, 0, 24, '#e8883a'); P.hline(0, 0, 6, '#fbf1dc');
    const b = mesh(softBoxGeo(0.34, 1.6, 0.05, 0.45), toon(R3, { map: pixelTexture(P.c) }), 0, 0.78, 0);
    b.rotation.x = -0.18;
    g.add(b);
    bake(g);
    out.colliders.push({ x: o.x, z: o.y, r: 0.18 });
  },
  bench(g, o, out, m) {
    // a park bench: a slatted seat & back on two cast-iron ends with armrests
    for (const z of [-0.12, 0.0, 0.12]) g.add(mesh(B(1.3, 0.045, 0.1), m.wood, 0, 0.4, z));
    for (const y of [0.6, 0.75]) { const s = mesh(B(1.3, 0.09, 0.035), m.wood, 0, y, -0.2 - (y - 0.6) * 0.15); s.rotation.x = -0.15; g.add(s); }
    for (const x of [-0.58, 0.58]) {
      g.add(mesh(B(0.055, 0.4, 0.055), m.iron, x, 0.2, 0.13));
      const back = mesh(B(0.055, 0.86, 0.055), m.iron, x, 0.43, -0.2); back.rotation.x = -0.12; g.add(back);
      g.add(mesh(B(0.055, 0.045, 0.4), m.iron, x, 0.37, -0.03));
      const arm = mesh(B(0.06, 0.05, 0.42), m.iron, x, 0.6, -0.02); arm.rotation.x = 0.1; g.add(arm);
      g.add(mesh(B(0.06, 0.2, 0.05), m.iron, x, 0.5, 0.17));
    }
    bake(g);
    out.colliders.push({ x: o.x - 0.4, z: o.y, r: 0.3 }, { x: o.x + 0.4, z: o.y, r: 0.3 });
    out.seat = { x: o.x, z: o.y };
  },
  fence(g, o, out, m) {
    const v = !!o.v, lean = (hash2(Math.floor(o.x * 2), Math.floor(o.y * 2), 9) - 0.5) * 0.08;
    const post = mesh(B(0.13, 0.6, 0.13), m.wood, 0, 0.3, 0);
    post.rotation.z = lean;
    g.add(post);
    const tip = mesh(new THREE.ConeGeometry(0.1, 0.11, 4), m.wood, lean * -0.3, 0.65, 0);
    tip.rotation.y = Math.PI / 4;
    g.add(tip);
    for (const y of [0.22, 0.45]) g.add(mesh(v ? B(0.06, 0.08, 1.0) : B(1.0, 0.08, 0.06), m.wood, v ? 0 : 0.5, y, v ? 0.5 : 0));
    bake(g);
    out.colliders.push({ rect: v ? [o.x - 0.12, o.y - 0.05, 0.24, 1.1] : [o.x - 0.1, o.y - 0.12, 1.2, 0.24] });
  },
  sign(g, o, out, m) {
    g.add(mesh(B(0.1, 0.9, 0.1), m.darkWood, 0, 0.45, 0));
    const p = new Painter(14, 8);
    p.rect(0, 0, 14, 8, '#6b4330'); p.rect(1, 1, 12, 6, '#d2a86e'); p.hline(1, 1, 12, '#e8c48a');
    const arrow = o.text && o.text.includes('→') ? 'r' : o.text && o.text.includes('↓') ? 'd' : o.text && o.text.includes('↑') ? 'u' : 'l';
    const A = '#5a3b2a';
    if (arrow === 'r') { p.hline(3, 4, 7, A); p.px(8, 3, A); p.px(8, 5, A); p.px(9, 4, A); }
    else if (arrow === 'd') { p.vline(7, 2, 4, A); p.hline(5, 4, 5, A); p.hline(6, 5, 3, A); }
    else if (arrow === 'u') { p.vline(7, 2, 4, A); p.hline(6, 3, 3, A); p.hline(5, 4, 5, A); }
    else { p.hline(4, 4, 7, A); p.px(5, 3, A); p.px(5, 5, A); p.px(4, 4, A); }
    const face = toon(R3, { map: pixelTexture(p.c) });
    g.add(mesh(B(0.85, 0.5, 0.06), [m.darkWood, m.darkWood, m.darkWood, m.darkWood, face, m.darkWood], 0, 0.8, 0.06));
    bake(g);
    out.colliders.push({ x: o.x, z: o.y, r: 0.14 });
    out.interact = { kind: 'sign', text: o.text };
  },
  mailbox(g, o, out, m) {
    g.add(mesh(B(0.1, 0.8, 0.1), m.darkWood, 0, 0.4, 0));
    const body = toon(R3, { color: 0x4d7fc4, key: 'mailbox' });
    g.add(mesh(B(0.36, 0.28, 0.5), body, 0, 0.92, 0));
    const top = mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.5, 8, 1, false, 0, Math.PI), body, 0, 1.06, 0);
    top.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    g.add(top);
    const flag = mesh(B(0.04, 0.26, 0.12), m.red, 0.2, 1.08, -0.05);
    flag.userData.keep = true;
    g.add(flag);
    out.flag = flag;
    bake(g);
    out.colliders.push({ x: o.x, z: o.y, r: 0.2 });
    out.interact = { kind: 'mailbox' };
  },
  crate(g, o, out, m) {
    const p = paintPlanks(16, 16, { dir: 'h', color: '#b07b50', seed: 11 });
    const t = toon(R3, { map: pixelTexture(p), key: 'crate' });
    g.add(mesh(B(0.8, 0.62, 0.62), t, 0, 0.31, 0));
    g.add(mesh(B(0.86, 0.06, 0.68), m.darkWood, 0, 0.65, 0));
    // corner posts and a brace across the front
    for (const x of [-0.39, 0.39]) for (const z of [-0.3, 0.3]) g.add(mesh(B(0.07, 0.62, 0.07), m.darkWood, x, 0.31, z));
    const brace = mesh(B(0.84, 0.07, 0.03), m.darkWood, 0, 0.31, 0.315);
    brace.rotation.z = 0.62;
    g.add(brace);
    brace.userData.noCast = true;
    if (o.id === 'shipping') {
      const lp = new Painter(10, 6);
      lp.rect(0, 0, 10, 6, '#fbf1dc'); lp.rect(1, 1, 8, 4, '#f6c65b'); lp.px(4, 2, '#b8862a'); lp.px(5, 2, '#b8862a'); lp.px(4, 3, '#b8862a'); lp.px(5, 3, '#b8862a');
      const lab = mesh(new THREE.PlaneGeometry(0.4, 0.24), toon(R3, { map: pixelTexture(lp.c) }), 0, 0.36, 0.315);
      lab.userData.noCast = true;
      g.add(lab);
      out.interact = { kind: 'shipping' };
    }
    bake(g);
    out.colliders.push({ x: o.x, z: o.y, r: 0.4 });
  },
  barrel(g, o, out, m) {
    // a coopered barrel: staves bellying out, two iron hoops at each end, a lid of boards
    const t = toon(R3, { key: 'barrel2', map: tex('barrel2', () => {
      const p = new Painter(24, 16), R = ramp('#9a6a44');
      p.rect(0, 0, 24, 16, R.m);
      for (let x = 0; x < 24; x += 3) { p.vline(x, 0, 16, R.d); p.vline(x + 1, 0, 16, R.l); }
      for (const y of [1, 4, 11, 14]) { p.hline(0, y, 24, '#4b4854'); p.hline(0, y + 1, 24, '#7a7584'); }
      return pixelTexture(p.c);
    }) });
    const prof = [[0.24, 0], [0.285, 0.12], [0.305, 0.35], [0.285, 0.58], [0.24, 0.7]].map(([x, y]) => new THREE.Vector2(x, y));
    g.add(mesh(new THREE.LatheGeometry(prof, 12), t, 0, 0, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.02, 12), toon(R3, { key: 'p-barrellid', map: tex('barrellid', () => pixelTexture(paintPlanks(8, 8, { dir: 'v', color: '#8a5d3e', seed: 3 }))) }), 0, 0.69, 0));
    bake(g);
    out.colliders.push({ x: o.x, z: o.y, r: 0.3 });
  },
  well(g, o, out, m) {
    // a stone well: a round wall under a pale lip, two posts carrying a little shingled roof, a
    // windlass with the rope wound on it and a bucket hanging over the water
    // (hollow: a ring of a lip, the shaft's inner wall darkening all the way down to the water)
    g.add(mesh(new THREE.CylinderGeometry(0.72, 0.77, 0.62, 16, 1, true), m.stone, 0, 0.31, 0));
    const shaft = toon(R3, { key: 'p-wellshaft', side: THREE.BackSide, map: tex('wellshaft', () => {
      const p = new Painter(48, 20);
      p.ctx.drawImage(paintWall(48, 20, 'stone', { wallColor: '#8f8994' }, 5, { foundation: false }), 0, 0);
      for (let y = 0; y < 20; y++) p.rect(0, y, 48, 1, `rgba(20,14,30,${Math.min(0.92, 0.12 + Math.pow(y / 19, 1.1) * 0.85).toFixed(2)})`);
      return pixelTexture(p.c);
    }) });
    const inner = mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.6, 16, 1, true), shaft, 0, 0.33, 0);
    inner.userData.noCast = true;
    g.add(inner);
    const lip = mesh(new THREE.RingGeometry(0.53, 0.8, 16), m.stoneLight, 0, 0.63, 0);
    lip.rotation.x = -Math.PI / 2;
    g.add(lip);
    g.add(mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.08, 16, 1, true), toon(R3, { color: 0xaaa3a8, key: 'p-welllip' }), 0, 0.59, 0));
    const water = mesh(new THREE.CircleGeometry(0.55, 16), toon(R3, { key: 'p-wellwater2', map: tex('wellwater2', () => {
      const p = new Painter(16, 16);
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.px(x, y, '#141c2c');
      for (const [x, y] of [[5, 5], [6, 5], [7, 5], [4, 6], [5, 6], [9, 10], [10, 10]]) p.px(x, y, '#4a6a8e');
      return pixelTexture(p.c);
    }) }), 0, 0.06, 0);
    water.rotation.x = -Math.PI / 2;
    water.userData.noCast = true;
    g.add(water);
    for (const x of [-0.62, 0.62]) g.add(mesh(B(0.1, 1.28, 0.1), m.darkWood, x, 1.18, 0));
    // the roof: two shingled slopes under a ridge board
    const rt = toon(R3, { key: 'p-wellroof', side: THREE.DoubleSide, map: tex('wellroof', () => pixelTexture(paintRoof(28, 12, '#b0473f', { seed: 21, kind: 'shingle', moss: 0.6 }))) });
    rt.shadowSide = THREE.DoubleSide;
    g.add(new THREE.Mesh(polyGeometry([
      quad([-0.86, 1.6, 0.56], [0.86, 1.6, 0.56], [0.86, 1.98, 0], [-0.86, 1.98, 0]),
      quad([0.86, 1.6, -0.56], [-0.86, 1.6, -0.56], [-0.86, 1.98, 0], [0.86, 1.98, 0]),
    ]), rt));
    g.add(mesh(B(1.82, 0.08, 0.1), m.darkWood, 0, 2.0, 0));
    for (const z of [-0.54, 0.54]) g.add(mesh(B(1.78, 0.05, 0.05), m.darkWood, 0, 1.59, z));
    // the windlass, its crank, the rope and the bucket
    const drum = mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.14, 8), m.rope, 0, 1.3, 0);
    drum.rotation.z = Math.PI / 2;
    g.add(drum);
    g.add(mesh(B(0.04, 0.22, 0.04), m.iron, 0.72, 1.22, 0));
    g.add(mesh(B(0.04, 0.04, 0.18), m.iron, 0.72, 1.12, 0.07));
    g.add(mesh(B(0.025, 0.36, 0.025), m.rope, 0.12, 1.08, 0.04));
    g.add(mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.17, 8), m.wood, 0.12, 0.83, 0.04));
    g.add(mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.03, 8), m.iron, 0.12, 0.87, 0.04));
    bake(g);
    out.colliders.push({ x: o.x, z: o.y, r: 0.8 });
    out.interact = { kind: 'well' };
  },
  fountain(g, o, out, m) {
    // the square's fountain: a stone basin on an eight-sided step, a fluted pedestal, two bowls
    // spilling over in little falls (their streaks run down), the water turning slowly, foam
    // where the falls land
    const stone = toon(R3, { color: 0xbab3b6, key: 'p-stonef' }), pale = toon(R3, { color: 0xcfc8ca, key: 'p-stonep' });
    const step = mesh(new THREE.CylinderGeometry(1.74, 1.8, 0.08, 8), toon(R3, { color: 0xa9a2a6, key: 'p-stonestep' }), 0, 0.04, 0);
    step.rotation.y = Math.PI / 8;
    g.add(step);
    g.add(mesh(new THREE.CylinderGeometry(1.4, 1.46, 0.46, 20, 1, true), toon(R3, { map: m.stone.map, side: THREE.DoubleSide, key: 'p-stone2' }), 0, 0.27, 0));
    const lip = mesh(new THREE.RingGeometry(1.24, 1.54, 20), pale, 0, 0.5, 0);
    lip.rotation.x = -Math.PI / 2;
    g.add(lip);
    g.add(mesh(new THREE.CylinderGeometry(1.54, 1.54, 0.08, 20, 1, true), stone, 0, 0.46, 0));
    const flute = toon(R3, { key: 'p-flute', map: tex('flute', () => {
      const p = new Painter(20, 8); p.rect(0, 0, 20, 8, '#c9c2c4');
      for (let x = 0; x < 20; x += 3) { p.vline(x, 0, 8, '#a9a2a6'); p.vline(x + 1, 0, 8, '#dcd6d8'); }
      const t = pixelTexture(p.c, { repeat: true }); t.repeat.set(1, 2); return t;
    }) });
    g.add(mesh(new THREE.CylinderGeometry(0.34, 0.37, 0.1, 10), stone, 0, 0.44, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.72, 10), flute, 0, 0.82, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.66, 0.28, 0.22, 16), stone, 0, 1.27, 0));
    const rim2 = mesh(new THREE.TorusGeometry(0.64, 0.04, 4, 16), pale, 0, 1.38, 0);
    rim2.rotation.x = Math.PI / 2;
    g.add(rim2);
    g.add(mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.32, 8), flute, 0, 1.54, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.31, 0.14, 0.1, 12), stone, 0, 1.73, 0));
    g.add(mesh(new THREE.SphereGeometry(0.08, 8, 6), pale, 0, 1.86, 0));
    const tip = mesh(new THREE.ConeGeometry(0.05, 0.12, 6), pale, 0, 1.97, 0);
    g.add(tip);
    // water: three turning surfaces, rippled
    const wm = toon(R3, { key: 'p-fwater', emissive: 0x2a6f9a, emissiveIntensity: 0.3, map: tex('fwater', () => {
      const p = new Painter(32, 32), r = rng(5);
      p.rect(0, 0, 32, 32, '#5aa8cf');
      for (let i = 0; i < 26; i++) { const x = Math.floor(r() * 32), y = Math.floor(r() * 32), w = 2 + Math.floor(r() * 4); p.hline(x, y, w, '#7cc0e2'); if (r() < 0.4) p.px(x + 1, y, '#dff4fb'); }
      return pixelTexture(p.c);
    }) });
    const discs = [];
    for (const [r, y] of [[1.3, 0.4], [0.6, 1.36], [0.27, 1.76]]) {
      const d = mesh(new THREE.CylinderGeometry(r, r, 0.03, 20), wm, 0, y, 0);
      d.userData.noCast = true; d.userData.keep = true;
      g.add(d); discs.push(d);
    }
    // the falls, spilling over the two bowls' rims
    const sm = toon(R3, { key: 'p-fstream', side: THREE.DoubleSide, alphaTest: 0.5, emissive: 0x4f99c7, emissiveIntensity: 0.3, map: tex('fstream', () => {
      const p = new Painter(6, 16), r = rng(9);
      for (let x = 0; x < 6; x++) for (let y = 0; y < 16; y++) p.px(x, y, x === 0 || x === 5 ? (r() < 0.5 ? '#7cc0e2' : null) : '#8fd0ee');
      for (let i = 0; i < 9; i++) { const x = 1 + Math.floor(r() * 4), y = Math.floor(r() * 16); p.vline(x, y, 3, '#e7f6f4'); }
      const t = pixelTexture(p.c, { repeat: true }); return t;
    }) });
    for (const [n, r, y0, y1, w] of [[8, 0.68, 1.37, 0.4, 0.13], [4, 0.33, 1.77, 1.36, 0.09]]) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + (n === 4 ? Math.PI / 4 : 0);
        const s = mesh(new THREE.PlaneGeometry(w, y0 - y1), sm, Math.sin(a) * r, (y0 + y1) / 2, Math.cos(a) * r);
        s.rotation.y = a;
        s.userData.noCast = true;
        g.add(s);
      }
    }
    // foam where they land
    const foam = mesh(new THREE.RingGeometry(0.62, 0.84, 24), toon(R3, { key: 'p-ffoam', alphaTest: 0.5, emissive: 0xbfe4f0, emissiveIntensity: 0.2, map: tex('ffoam', () => {
      const p = new Painter(32, 32), r = rng(11);
      for (let i = 0; i < 160; i++) p.px(Math.floor(r() * 32), Math.floor(r() * 32), r() < 0.5 ? '#eef9f6' : '#cfe9f2');
      return pixelTexture(p.c);
    }) }), 0, 0.42, 0);
    foam.rotation.x = -Math.PI / 2;
    foam.userData.noCast = true; foam.userData.keep = true;
    g.add(foam);
    bake(g);
    out.anim = 'fountain';
    out.animPart = { stream: sm, discs, foam };
    out.colliders.push({ x: o.x, z: o.y, r: 1.45 });
    out.fountain = { x: o.x, y: 1.9, z: o.y };
    out.lights.push({ x: o.x, y: 0.8, z: o.y + 1.3, color: 0x9fdcff, power: 1.0 });
    out.interact = { kind: 'fountain' };
  },
  board(g, o, out, m) {
    for (const x of [-0.6, 0.6]) g.add(mesh(B(0.1, 1.3, 0.1), m.darkWood, x, 0.65, 0));
    const p = new Painter(20, 13);
    p.rect(0, 0, 20, 13, '#5a3b2a'); p.rect(1, 1, 18, 11, '#c49a64');
    for (let i = 0; i < 30; i++) p.px(1 + (i * 7) % 18, 1 + (i * 5) % 11, '#b08654');
    const notes = [[2, 2, 5, 4, '#fbf1dc'], [8, 3, 4, 5, '#f7d6e0'], [13, 2, 5, 4, '#fff3a6'], [4, 7, 5, 4, '#dcecf7']];
    for (const [x, y, w, h, c] of notes) { p.rect(x, y, w, h, c); p.px(x + 1, y, '#d9594c'); p.hline(x + 1, y + 2, w - 2, '#9a8a80'); }
    const face = toon(R3, { map: pixelTexture(p.c), key: 'boardface' });
    g.add(mesh(B(1.3, 0.85, 0.08), [m.darkWood, m.darkWood, m.darkWood, m.darkWood, face, m.darkWood], 0, 1.0, 0.05));
    const roof = mesh(B(1.5, 0.08, 0.35), toon(R3, { color: 0x6d4a8a, key: 'boardroof' }), 0, 1.5, 0.08);
    roof.rotation.x = 0.25;
    g.add(roof);
    out.colliders.push({ x: o.x - 0.5, z: o.y, r: 0.2 }, { x: o.x + 0.5, z: o.y, r: 0.2 }, { x: o.x, z: o.y, r: 0.2 });
    bake(g);
    out.interact = { kind: 'board' };
  },
  planter(g, o, out, m) {
    // a wooden planter spilling over: leafy tufts, flowers at two heights, a trailing vine
    const box = toon(R3, { key: 'p-planterbox', map: tex('planterbox', () => pixelTexture(paintPlanks(16, 8, { dir: 'h', color: '#9a6a44', seed: 6 }))) });
    g.add(mesh(B(0.8, 0.34, 0.5), box, 0, 0.17, 0));
    for (const x of [-0.39, 0.39]) g.add(mesh(B(0.06, 0.38, 0.54), m.darkWood, x, 0.19, 0));
    g.add(mesh(B(0.72, 0.04, 0.42), toon(R3, { color: 0x5e3d2c, key: 'soil' }), 0, 0.35, 0));
    const cols = [0xf4a4b6, 0xffd66b, 0xec5f73, 0xfff8ec, 0xb9a2e3];
    const rr = rng(Math.floor(o.x * 31 + o.y * 7));
    const leafA = toon(R3, { color: 0x5fa453, key: 'p-leaf' }), leafB = toon(R3, { color: 0x4a8a45, key: 'p-leafd' });
    for (let i = 0; i < 6; i++) {
      const lf = mesh(new THREE.IcosahedronGeometry(1, 0), i % 2 ? leafA : leafB, -0.28 + i * 0.11, 0.4, (rr() - 0.5) * 0.24);
      lf.scale.set(0.1, 0.07, 0.09);
      g.add(lf);
    }
    for (let i = 0; i < 9; i++) {
      const x = -0.3 + (i % 5) * 0.15 + (rr() - 0.5) * 0.05, z = i < 5 ? -0.09 : 0.11, h = 0.12 + rr() * 0.1;
      g.add(mesh(B(0.03, h, 0.03), leafA, x, 0.36 + h / 2, z));
      const f = mesh(B(0.09, 0.06, 0.09), toon(R3, { color: cols[Math.floor(rr() * cols.length)], key: 'flower' + i % 5 }), x, 0.37 + h, z);
      f.rotation.y = rr();
      g.add(f);
    }
    const vine = mesh(B(0.12, 0.2, 0.03), leafB, 0.2, 0.26, 0.26);
    vine.userData.noCast = true;
    g.add(vine);
    bake(g);
    out.colliders.push({ x: o.x, z: o.y, r: 0.42 });
  },
  logs(g, o, out, m) {
    // a woodpile: sawn logs in bark, their pale ends ringed
    const mats3 = [barkMat(), ringsMat(), ringsMat()];
    const pos = [[-0.22, 0.15, 0, 0.16], [0.22, 0.15, 0.03, 0.17], [0.0, 0.43, 0.01, 0.15]];
    for (const [x, y, z, r] of pos) {
      const l = mesh(new THREE.CylinderGeometry(r, r * 1.04, 1.1 - r, 9), mats3, x, y, z);
      l.rotation.z = Math.PI / 2;
      l.rotation.x = (x * 7) % 0.6;
      g.add(l);
    }
    // a split quarter and a few chips
    const chip = toon(R3, { color: 0xd9b07a, key: 'p-chip' });
    for (const [x, z, a] of [[0.62, 0.3, 0.4], [0.55, -0.3, 1.9], [-0.64, 0.24, 2.6]]) { const c = mesh(B(0.12, 0.03, 0.06), chip, x, 0.015, z); c.rotation.y = a; c.userData.noCast = true; g.add(c); }
    bake(g);
    out.colliders.push({ x: o.x, z: o.y, r: 0.5 });
  },
  boat(g, o, out, m) {
    const shape = new THREE.Shape();
    shape.moveTo(-1.0, 0);
    shape.quadraticCurveTo(-0.6, 0.42, 0, 0.42);
    shape.quadraticCurveTo(0.6, 0.42, 1.0, 0);
    shape.quadraticCurveTo(0.6, -0.42, 0, -0.42);
    shape.quadraticCurveTo(-0.6, -0.42, -1.0, 0);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.32, bevelEnabled: false, curveSegments: 6 });
    geo.rotateX(-Math.PI / 2);
    const hullCol = hash2(Math.floor(o.x), Math.floor(o.y), 3) < 0.5 ? 0x4d7fc4 : 0xd9594c;
    const hull = mesh(geo, [toon(R3, { color: 0x6b4330, key: 'boatin' }), toon(R3, { color: hullCol, key: 'boathull' + hullCol })], 0, 0, 0);
    g.add(hull);
    g.add(mesh(B(0.12, 0.05, 0.7), m.wood, 0.1, 0.33, 0));
    const oar = mesh(B(0.9, 0.04, 0.08), m.wood, -0.2, 0.36, 0.2);
    oar.rotation.y = 0.3;
    g.add(oar);
    if (o.flip) g.rotation.y = Math.PI * 0.9;
    else g.rotation.y = 0.15;
    out.colliders.push({ x: o.x - 0.5, z: o.y, r: 0.45 }, { x: o.x + 0.5, z: o.y, r: 0.45 });
  },
  easel(g, o, out, m) {
    const legs = [[-0.2, 0.1], [0.2, 0.1], [0, -0.2]];
    for (const [x, z] of legs) {
      const l = mesh(B(0.05, 1.1, 0.05), m.wood, x, 0.55, z);
      l.rotation.z = -x * 0.3; l.rotation.x = z * 0.4;
      g.add(l);
    }
    const p = new Painter(14, 11);
    p.rect(0, 0, 14, 11, '#fbf6ea');
    p.rect(1, 1, 12, 4, '#9fd0f5'); p.rect(1, 5, 12, 5, '#7dba5c');
    p.px(9, 2, '#ffd66b'); p.px(10, 2, '#ffd66b'); p.px(9, 3, '#ffd66b');
    p.px(3, 6, '#f4a4b6'); p.px(5, 7, '#fff8ec'); p.px(7, 6, '#f4a4b6'); p.px(11, 8, '#b9a2e3');
    const face = toon(R3, { map: pixelTexture(p.c) });
    const c = mesh(B(0.85, 0.66, 0.05), [m.white, m.white, m.white, m.white, face, m.white], 0, 1.0, 0.12);
    c.rotation.x = -0.15;
    g.add(c);
    bake(g);
    out.colliders.push({ x: o.x, z: o.y, r: 0.3 });
  },
  stones(g, o, out, m) {
    // a ring of standing stones: rough slabs narrowing to worn tops, lichen, a spiral carved in
    // some, moss on their heads; a low altar stone in the middle
    const face = toon(R3, { key: 'p-menhir', map: tex('menhir', () => {
      const p = new Painter(12, 24), R = ramp('#9d98a3'), r = rng(19);
      p.rect(0, 0, 12, 24, R.m);
      for (let i = 0; i < 40; i++) p.px(Math.floor(r() * 12), Math.floor(r() * 24), r() < 0.5 ? R.l : R.d);
      for (let i = 0; i < 6; i++) { const x = Math.floor(r() * 11), y = Math.floor(r() * 23); p.px(x, y, '#c8c070'); p.px(x + 1, y, '#a8b060'); p.px(x, y + 1, '#c8c070'); }
      p.vline(0, 0, 24, R.d); p.vline(11, 0, 24, R.o);
      return pixelTexture(p.c);
    }) });
    const carved = toon(R3, { key: 'p-menhir2', map: tex('menhir2', () => {
      const p = new Painter(12, 24);
      p.ctx.drawImage(face.map.image, 0, 0);
      const pts = [[6, 10], [7, 10], [7, 11], [6, 12], [5, 12], [4, 11], [4, 10], [4, 9], [5, 8], [6, 7], [7, 7], [8, 8], [9, 9], [9, 10], [9, 11], [9, 12], [8, 13], [7, 14], [6, 14], [5, 14]];
      for (const [x, y] of pts) p.px(x, y, '#5f5a66');
      for (const [x, y] of pts) p.px(x, y + 1, '#c4c0c8');
      return pixelTexture(p.c);
    }) });
    const moss = toon(R3, { color: 0x6f9150, key: 'moss' });
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const h = 0.9 + hash2(i, 3, 3) * 0.6;
      const geo = new THREE.BoxGeometry(0.44, h, 0.34, 1, 3, 1);
      const pos = geo.attributes.position;
      for (let k = 0; k < pos.count; k++) {
        const t = (pos.getY(k) + h / 2) / h;                 // 0 at the foot, 1 at the top
        const sq = 1 - t * t * 0.35;
        pos.setX(k, pos.getX(k) * sq + (hash2(k, i, 5) - 0.5) * 0.04);
        pos.setZ(k, pos.getZ(k) * (1 - t * 0.2));
        if (t > 0.99) pos.setY(k, pos.getY(k) - Math.abs(pos.getX(k)) * 0.5);   // (a worn, rounded head)
      }
      geo.computeVertexNormals();
      const f = i % 2 ? carved : face;
      const s = mesh(geo, f, Math.cos(a) * 1.9, h / 2, Math.sin(a) * 1.5);
      s.rotation.y = -a; s.rotation.z = (hash2(i, 4, 4) - 0.5) * 0.2;
      g.add(s);
      const cap = mesh(new THREE.IcosahedronGeometry(1, 0), moss, Math.cos(a) * 1.9, h - 0.04, Math.sin(a) * 1.5);
      cap.scale.set(0.2, 0.06, 0.15);
      cap.rotation.y = -a;
      g.add(cap);
      out.colliders.push({ x: o.x + Math.cos(a) * 1.9, z: o.y + Math.sin(a) * 1.5, r: 0.28 });
    }
    const mat = toon(R3, { color: 0x9d98a3, key: 'standing' });
    const altar = mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.25, 8), mat, 0, 0.12, 0);
    g.add(altar);
    bake(g);
    out.colliders.push({ x: o.x, z: o.y, r: 0.5 });
    out.altar = { x: o.x, z: o.y };
  },
  stall(g, o, out, m) {
    g.add(mesh(B(2.2, 0.8, 0.7), m.wood, 0, 0.4, 0));
    g.add(mesh(B(2.3, 0.06, 0.8), m.darkWood, 0, 0.83, 0));
    for (const x of [-1.05, 1.05]) for (const z of [-0.3, 0.3]) g.add(mesh(B(0.08, 1.9, 0.08), m.darkWood, x, 0.95, z));
    const awT = paintAwning(40, 18, '#fbf1dc', '#e97d8f');
    const aMat = toon(R3, { map: pixelTexture(awT), side: THREE.DoubleSide, alphaTest: 0.5, shadowSide: THREE.DoubleSide });
    const aw = new THREE.Mesh(polyGeometry([quad([-1.25, 1.62, 0.65], [1.25, 1.62, 0.65], [1.25, 2.0, -0.35], [-1.25, 2.0, -0.35])]), aMat);
    g.add(aw);
    // crates of produce heaped on the counter, a little chalk board of prices
    const crateT = toon(R3, { key: 'p-stallcrate', map: tex('stallcrate', () => pixelTexture(paintPlanks(16, 8, { dir: 'h', color: '#c49a64', seed: 4 }))) });
    const heaps = [[0xe0463f, 0xc8352f], [0xf0934a, 0xe07a30], [0x7fbf5a, 0x5fa453]];
    const rr = rng(Math.floor(o.x * 7 + o.y * 3));
    heaps.forEach(([c1, c2], k) => {
      const x = -0.7 + k * 0.7;
      g.add(mesh(B(0.56, 0.14, 0.4), crateT, x, 0.93, 0.02));
      for (let i = 0; i < 9; i++) {
        const f = mesh(new THREE.IcosahedronGeometry(1, 0), toon(R3, { color: i % 3 ? c1 : c2, key: 'good-' + (i % 3 ? c1 : c2) }), x + ((i % 3) - 1) * 0.15 + (rr() - 0.5) * 0.04, 1.04 + (i === 4 ? 0.06 : 0), 0.02 + (Math.floor(i / 3) - 1) * 0.11);
        f.scale.setScalar(0.075);
        f.userData.noCast = true;
        g.add(f);
      }
    });
    const chalk = new Painter(10, 7);
    chalk.rect(0, 0, 10, 7, '#6b4330'); chalk.rect(1, 1, 8, 5, '#2f3a36');
    chalk.hline(2, 2, 3, '#e8ece4'); chalk.hline(6, 2, 2, '#ffd66b'); chalk.hline(2, 4, 2, '#e8ece4'); chalk.hline(5, 4, 3, '#ffd66b');
    g.add(mesh(B(0.42, 0.3, 0.03), [m.darkWood, m.darkWood, m.darkWood, m.darkWood, toon(R3, { map: pixelTexture(chalk.c) }), m.darkWood], 0.9, 0.62, 0.37));
    bake(g);
    out.colliders.push({ rect: [o.x - 1.15, o.y - 0.4, 2.3, 0.8] });
    out.interact = { kind: 'stall' };
  },
  driftwood(g, o, out, m) {
    const l = mesh(new THREE.CylinderGeometry(0.07, 0.1, 1.1, 6), toon(R3, { color: 0xb8a58a, key: 'drift' }), 0, 0.08, 0);
    l.rotation.z = Math.PI / 2; l.rotation.y = hash2(Math.floor(o.x), 1, 1) * 2;
    g.add(l);
  },
  umbrella(g, o, out, m) {
    g.add(mesh(B(0.06, 1.7, 0.06), m.white, 0, 0.85, 0));
    const p = new Painter(32, 4);
    for (let x = 0; x < 32; x++) p.vline(x, 0, 4, Math.floor(x / 4) % 2 ? '#f4efe4' : '#3f9b98');
    const c = mesh(new THREE.ConeGeometry(1.2, 0.45, 8, 1, true), toon(R3, { map: pixelTexture(p.c), side: THREE.DoubleSide, shadowSide: THREE.DoubleSide }), 0, 1.75, 0);
    g.add(c);
    const towel = mesh(B(0.7, 0.02, 1.2), toon(R3, { key: 'p-towel', map: tex('towel', () => {
      const p = new Painter(12, 20);
      for (let y = 0; y < 20; y++) p.hline(0, y, 12, y < 2 || y > 17 ? '#fbf1dc' : Math.floor(y / 3) % 2 ? '#f0a3bd' : '#f7d6e0');
      for (let x = 0; x < 12; x += 2) { p.px(x, 0, '#e98aa6'); p.px(x + 1, 19, '#e98aa6'); }
      return pixelTexture(p.c);
    }) }), 0.8, 0.01, 0.3);
    towel.rotation.y = 0.12;
    towel.userData.noCast = true;
    g.add(towel);
    g.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.24, 8), toon(R3, { color: 0x3f9b98, key: 'p-bucket' }), 1.3, 0.12, -0.25));
    g.add(mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.04, 8), toon(R3, { color: 0xffd66b, key: 'p-ball' }), 0.4, 0.02, 0.95));
    out.colliders.push({ x: o.x, z: o.y, r: 0.12 });
  },
  buoy(g, o, out, m) {
    g.add(mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.3, 8), m.red, 0, 0.1, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.18, 8), m.white, 0, 0.32, 0));
    out.anim = 'bob';
  },
  bigtree() {},

  // ---------------- new regions ----------------
  ferry(g, o, out, m) {
    // a little island ferry: flat stern, pointed bow, white cabin & a red funnel
    const shape = new THREE.Shape();
    shape.moveTo(-2.5, -0.85);
    shape.lineTo(1.2, -0.85);
    shape.quadraticCurveTo(2.6, -0.7, 3.1, 0);
    shape.quadraticCurveTo(2.6, 0.7, 1.2, 0.85);
    shape.lineTo(-2.5, 0.85);
    shape.lineTo(-2.5, -0.85);
    const hullGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.62, bevelEnabled: false, curveSegments: 10 });
    hullGeo.rotateX(-Math.PI / 2);
    hullGeo.translate(0, -0.3, 0);
    const deckTex = pixelTexture(paintPlanks(32, 16, { dir: 'h', color: '#c49a64', seed: 12 }), { repeat: true });
    deckTex.repeat.set(0.4, 0.8);
    const hull = mesh(hullGeo, [toon(R3, { map: deckTex, key: 'ferrydeck2' }), toon(R3, { color: 0xf4efe4, key: 'ferryhull' })], 0, 0, 0);
    g.add(hull);
    // navy stripe & red waterline
    const stripe = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false, curveSegments: 10 });
    stripe.rotateX(-Math.PI / 2); stripe.scale(1.012, 1, 1.02); stripe.translate(0, 0.12, 0);
    g.add(mesh(stripe, toon(R3, { color: 0x3f5f9e, key: 'ferrystripe' }), 0, 0, 0));
    // cabin
    const white = toon(R3, { color: 0xf4efe4, key: 'ferrycabin' });
    const win = toon(R3, { color: 0x7cb6e0, emissive: 0xffc15a, emissiveIntensity: 0, key: 'ferrywin' });
    g.add(mesh(B(1.9, 0.9, 1.3), white, -1.15, 0.77, 0));
    for (const x of [-1.75, -1.15, -0.55]) for (const z of [-0.66, 0.66]) g.add(mesh(B(0.34, 0.28, 0.02), win, x, 0.86, z));
    g.add(mesh(B(0.02, 0.28, 0.5), win, -0.19, 0.86, 0));
    const roof = mesh(B(2.2, 0.1, 1.55), toon(R3, { color: 0x3f9b98, key: 'ferryroof' }), -1.15, 1.27, 0);
    g.add(roof);
    const funnel = mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.55, 10), toon(R3, { color: 0xc8454f, key: 'ferryfunnel' }), -1.5, 1.6, 0);
    g.add(funnel);
    g.add(mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 10), toon(R3, { color: 0x3b3844, key: 'ferryfunneltop' }), -1.5, 1.9, 0));
    // bow railings & a life ring
    const rail = toon(R3, { color: 0xe9e4f0, key: 'ferryrail' });
    for (const z of [-0.78, 0.78]) {
      for (let i = 0; i < 4; i++) g.add(mesh(B(0.04, 0.3, 0.04), rail, 0.1 + i * 0.6, 0.45, z * (1 - Math.max(0, i - 1.5) * 0.14)));
      g.add(mesh(B(1.9, 0.04, 0.04), rail, 1.0, 0.6, z * 0.92));
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 6, 12), toon(R3, { color: 0xf0934a, key: 'lifering' }));
    ring.position.set(-1.15, 0.8, 0.67);
    g.add(ring);
    // stern flag
    g.add(mesh(B(0.04, 0.8, 0.04), m.darkWood, -2.4, 0.7, 0));
    const fp = new Painter(8, 5); fp.rect(0, 0, 8, 5, '#3f6f9e'); fp.rect(0, 2, 8, 1, '#f4efe4'); fp.px(3, 1, '#ffd66b');
    const flag = mesh(new THREE.PlaneGeometry(0.42, 0.26), toon(R3, { map: pixelTexture(fp.c), side: THREE.DoubleSide }), -2.62, 0.95, 0);
    flag.rotation.y = Math.PI / 2;
    g.add(flag);
    g.rotation.y = Math.PI / 2;
    out.ferry = true;
    out.interact = { kind: 'ferry' };
    out.anim = 'bob';
    out.windows = win;
  },
  scarecrow(g, o, out, m) {
    // a scarecrow: a patched shirt on a cross of poles, straw bursting from the cuffs & collar, a
    // sack head with stitched eyes & grin under a straw hat with a band, a crow perched on an arm
    g.add(mesh(B(0.1, 1.5, 0.1), m.darkWood, 0, 0.75, 0));
    g.add(mesh(B(1.1, 0.08, 0.08), m.darkWood, 0, 1.15, 0));
    const shirt = toon(R3, { key: 'p-scareshirt', map: tex('scareshirt', () => {
      const p = new Painter(16, 16), R = ramp('#7cb6e0');
      p.rect(0, 0, 16, 16, R.m);
      for (let y = 0; y < 16; y += 4) p.hline(0, y, 16, R.l);
      for (let x = 0; x < 16; x += 4) p.vline(x, 0, 16, R.l);
      p.rect(9, 8, 5, 5, '#e0a045'); for (let x = 9; x < 14; x += 2) { p.px(x, 8, '#7a5238'); p.px(x, 12, '#7a5238'); }
      p.rect(2, 3, 4, 3, '#c8454f'); p.px(2, 3, '#7a2a30'); p.px(5, 5, '#7a2a30');
      p.vline(7, 0, 16, R.d); p.px(8, 4, '#f4efe4'); p.px(8, 9, '#f4efe4');
      return pixelTexture(p.c);
    }) });
    g.add(mesh(B(0.5, 0.5, 0.3), shirt, 0, 1.05, 0));
    for (const s of [-1, 1]) g.add(mesh(B(0.3, 0.18, 0.2), shirt, s * 0.36, 1.17, 0));
    const head = toon(R3, { key: 'p-scarehead', map: tex('scarehead', () => {
      const p = new Painter(8, 8), R = ramp('#e9cf9b');
      p.rect(0, 0, 8, 8, R.m);
      for (let i = 0; i < 10; i++) p.px((i * 5) % 8, (i * 3) % 8, R.d);
      p.rect(1, 2, 2, 2, '#3b2a2e'); p.rect(5, 2, 2, 2, '#3b2a2e');
      p.hline(1, 5, 6, '#3b2a2e'); p.px(2, 6, '#3b2a2e'); p.px(4, 6, '#3b2a2e'); p.px(6, 6, '#3b2a2e');
      return pixelTexture(p.c);
    }) });
    const headPlain = toon(R3, { color: 0xe9cf9b, key: 'scarehead' });
    g.add(mesh(B(0.34, 0.32, 0.3), [headPlain, headPlain, headPlain, headPlain, head, headPlain], 0, 1.5, 0));
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.06, 10), toon(R3, { color: 0xe8c46a, key: 'strawhat' }));
    hat.position.y = 1.68; g.add(hat);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.18, 8), toon(R3, { color: 0xf0d27e, key: 'strawcrown' }));
    crown.position.y = 1.78; g.add(crown);
    g.add(mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.05, 8), toon(R3, { color: 0xc8454f, key: 'p-hatband' }), 0, 1.72, 0));
    // straw poking out
    const straw = toon(R3, { color: 0xe0bf62, key: 'straw' });
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const w = mesh(B(0.12, 0.03, 0.03), straw, s * (0.56 + k * 0.02), 1.1 + k * 0.05 - 0.05, (k - 1) * 0.05); w.rotation.z = s * (k - 1) * 0.5; w.userData.noCast = true; g.add(w); }
    for (let k = 0; k < 4; k++) { const w = mesh(B(0.03, 0.1, 0.03), straw, -0.1 + k * 0.07, 1.32, 0.12); w.rotation.z = (k - 1.5) * 0.3; w.userData.noCast = true; g.add(w); }
    // the crow
    const crowM = toon(R3, { color: 0x2f2a3a, key: 'p-crow' });
    const cx = 0.46;
    g.add(mesh(B(0.14, 0.12, 0.2), crowM, cx, 1.32, 0));
    g.add(mesh(B(0.1, 0.1, 0.1), crowM, cx, 1.41, 0.09));
    g.add(mesh(B(0.04, 0.03, 0.06), toon(R3, { color: 0xe0a526, key: 'gold' }), cx, 1.4, 0.16));
    const tail = mesh(B(0.08, 0.03, 0.12), crowM, cx, 1.31, -0.14); tail.rotation.x = -0.4; g.add(tail);
    bake(g);
    out.colliders.push({ x: o.x, z: o.y, r: 0.2 });
    out.interact = { kind: 'scarecrow' };
  },
  beehive(g, o, out, m) {
    // a painted hive on a little stand: two stacked boxes (one cream, one honey) with hand-holds,
    // a gabled lid, the entrance slot over a landing board
    const paint = (c, key) => toon(R3, { key: 'p-hive-' + key, map: tex('hive' + key, () => {
      const R = ramp(c), p = new Painter(8, 4);
      p.rect(0, 0, 8, 4, R.m); p.hline(0, 0, 8, R.l); p.hline(0, 3, 8, R.d);
      p.rect(3, 1, 2, 1, R.d);
      return pixelTexture(p.c);
    }) });
    for (const [x, z] of [[-0.18, -0.15], [0.18, -0.15], [-0.18, 0.15], [0.18, 0.15]]) g.add(mesh(B(0.06, 0.18, 0.06), m.darkWood, x, 0.09, z));
    g.add(mesh(B(0.52, 0.05, 0.46), m.darkWood, 0, 0.2, 0));
    g.add(mesh(B(0.46, 0.2, 0.42), paint('#f4efe4', 'w'), 0, 0.33, 0));
    g.add(mesh(B(0.46, 0.2, 0.42), paint('#e8c46a', 'y'), 0, 0.53, 0));
    g.add(mesh(B(0.26, 0.02, 0.12), m.darkWood, 0, 0.23, 0.26));
    g.add(mesh(B(0.2, 0.035, 0.02), toon(R3, { color: 0x3b2a2e, key: 'ink' }), 0, 0.25, 0.212));
    const lid = toon(R3, { color: 0xb0473f, key: 'p-hivelid', side: THREE.DoubleSide });
    g.add(new THREE.Mesh(polyGeometry([
      quad([-0.3, 0.63, 0.26], [0.3, 0.63, 0.26], [0.3, 0.76, 0], [-0.3, 0.76, 0]),
      quad([0.3, 0.63, -0.26], [-0.3, 0.63, -0.26], [-0.3, 0.76, 0], [0.3, 0.76, 0]),
    ]), lid));
    g.add(mesh(B(0.48, 0.1, 0.44), toon(R3, { color: 0xf4efe4, key: 'hivewhite' }), 0, 0.64, 0));
    // a few bees about the door
    const bee = toon(R3, { color: 0xf2c14e, key: 'p-bee' });
    for (const [x, y, z] of [[0.12, 0.34, 0.34], [-0.2, 0.46, 0.3], [0.26, 0.6, 0.2]]) { const b = mesh(B(0.04, 0.03, 0.03), bee, x, y, z); b.userData.noCast = true; g.add(b); }
    bake(g);
    out.colliders.push({ x: o.x, z: o.y, r: 0.3 });
    out.interact = { kind: 'beehive' };
    out.bees = true;
  },
  haybale(g, o, out, m) {
    // a round bale on its side: straw wrapped round in a spiral, two bands of twine, wisps about
    const side = toon(R3, { key: 'p-hayside', map: tex('hayside', () => {
      const p = new Painter(32, 16), r = rng(13);
      p.rect(0, 0, 32, 16, '#dcb85a');
      for (let i = 0; i < 90; i++) { const x = Math.floor(r() * 32), y = Math.floor(r() * 16), v = r(); p.hline(x, y, 2 + Math.floor(r() * 4), v < 0.35 ? '#b8923c' : v < 0.8 ? '#ecd183' : '#f7e6a8'); }
      for (const y of [4, 11]) { p.hline(0, y, 32, '#9a7438'); p.hline(0, y + 1, 32, '#c9a452'); }
      const t = pixelTexture(p.c, { repeat: true }); t.repeat.set(2, 1); return t;
    }) });
    const end = toon(R3, { key: 'p-hayend', map: tex('hayend', () => {
      const p = new Painter(16, 16);
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const dx = x - 7.5, dy = y - 7.5, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx) / (Math.PI * 2);
        const s = (d / 2.2 - a + 10) % 1;                  // (the straw rolled into a spiral)
        p.px(x, y, d > 7.4 ? '#a8843a' : s < 0.3 ? '#b8923c' : s < 0.7 ? '#d8b55c' : '#ecd183');
      }
      return pixelTexture(p.c);
    }) });
    const hb = mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.78, 12), [side, end, end], 0, 0.4, 0);
    hb.rotation.z = Math.PI / 2;
    hb.rotation.y = (hash2(Math.floor(o.x), Math.floor(o.y), 4) - 0.5) * 0.9;
    g.add(hb);
    const wisp = toon(R3, { color: 0xe3c56c, key: 'p-wisp' });
    for (const [x, z, a] of [[0.5, 0.35, 0.3], [-0.46, 0.4, 2.2], [0.1, 0.5, 1.2]]) { const w = mesh(B(0.18, 0.02, 0.03), wisp, x, 0.01, z); w.rotation.y = a; w.userData.noCast = true; g.add(w); }
    bake(g);
    out.colliders.push({ x: o.x, z: o.y, r: 0.42 });
  },
  tent(g, o, out, m) {
    // a ridge tent of orange canvas: panels sewn together, a patch, the door flaps tied back on a
    // dark inside, a ridge pole with a pennant, guy ropes out to pegs
    const w = 1.8, d = 2.0, hgt = 1.3;
    const canvasTex = (shade) => tex('tent' + shade, () => {
      const R = ramp(shade), p = new Painter(32, 20), r = rng(3);
      p.rect(0, 0, 32, 20, R.m);
      for (let i = 0; i < 40; i++) p.px(Math.floor(r() * 32), Math.floor(r() * 20), r() < 0.5 ? R.l : mix(R.m, R.d, 0.5));
      for (let x = 7; x < 32; x += 11) { p.vline(x, 0, 20, R.d); for (let y = 1; y < 20; y += 3) p.px(x + 1, y, R.l); }
      p.hline(0, 0, 32, R.l); p.hline(0, 19, 32, R.d);                  // (a hem along the ground)
      p.rect(20, 7, 5, 4, mix(R.m, '#e8c070', 0.5)); for (let x = 20; x < 25; x += 2) { p.px(x, 7, R.d); p.px(x, 10, R.d); }
      return pixelTexture(p.c);
    });
    const cm = (shade, key) => { const t = toon(R3, { map: canvasTex(shade), side: THREE.DoubleSide, key }); t.shadowSide = THREE.DoubleSide; return t; };
    const L = cm('#e8883a', 'tentcanvasL'), Rm = cm('#d4702c', 'tentcanvasR');
    const uv = [[0, 0], [1, 0], [1, 1], [0, 1]];
    g.add(new THREE.Mesh(polyGeometry([quad([-w / 2, 0, -d / 2], [-w / 2, 0, d / 2], [0, hgt, d / 2], [0, hgt, -d / 2], uv)]), L));
    g.add(new THREE.Mesh(polyGeometry([quad([w / 2, 0, d / 2], [w / 2, 0, -d / 2], [0, hgt, -d / 2], [0, hgt, d / 2], uv)]), Rm));
    const back = toon(R3, { color: 0xd4702c, key: 'tentback', side: THREE.DoubleSide });
    g.add(new THREE.Mesh(polyGeometry([tri([w / 2, 0, -d / 2], [-w / 2, 0, -d / 2], [0, hgt, -d / 2])]), back));
    // the front: the doorway open on the dark inside, its two flaps rolled & tied to the sides
    g.add(new THREE.Mesh(polyGeometry([tri([-w / 2, 0, d / 2 - 0.02], [w / 2, 0, d / 2 - 0.02], [0, hgt, d / 2 - 0.02])]), toon(R3, { color: 0x2a1f26, key: 'tentdoor2', side: THREE.DoubleSide })));
    const flap = toon(R3, { color: 0xf0a060, key: 'tentfront', side: THREE.DoubleSide });
    g.add(new THREE.Mesh(polyGeometry([
      tri([-w / 2, 0, d / 2], [-0.36, 0, d / 2 + 0.03], [0, hgt, d / 2]),
      tri([0.36, 0, d / 2 + 0.03], [w / 2, 0, d / 2], [0, hgt, d / 2]),
    ]), flap));
    for (const s of [-1, 1]) {
      // (along the doorway's edge, rising from its foot to the ridge)
      const roll = mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.8, 6), toon(R3, { color: 0xe07a38, key: 'tentroll' }), s * 0.24, 0.42, d / 2 + 0.06);
      roll.rotation.z = s * 0.27;
      g.add(roll);
    }
    // poles, the ridge, a pennant
    g.add(mesh(B(0.06, 1.62, 0.06), m.darkWood, 0, 0.81, d / 2 + 0.06));
    g.add(mesh(B(0.06, 1.4, 0.06), m.darkWood, 0, 0.7, -d / 2 - 0.04));
    g.add(mesh(B(0.05, 0.05, d + 0.2), m.darkWood, 0, hgt + 0.02, 0));
    const P = new Painter(10, 6); P.grid(['yyyyyyyyy.', 'yrryyyy...', 'yrryy.....', 'yyyy......', 'yy........', '..........'], { y: '#ffd66b', r: '#c8454f' });
    const pen = new THREE.Group(); pen.position.set(0, 1.56, d / 2 + 0.06);
    const flagM = mesh(new THREE.PlaneGeometry(0.36, 0.22), toon(R3, { map: pixelTexture(P.c), alphaTest: 0.5, side: THREE.DoubleSide }), 0.19, 0, 0);
    flagM.userData.noCast = true;
    pen.add(flagM); pen.userData.keep = true; flagM.userData.keep = true;
    g.add(pen);
    out.anim = 'flag'; out.animPart = pen;
    // guy ropes to pegs in front and behind, and one out from each side
    const rope = (x0, y0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, y0, z1 - z0);
      const r = mesh(B(0.02, len, 0.02), m.rope, (x0 + x1) / 2, y0 / 2, (z0 + z1) / 2);
      r.lookAt(new THREE.Vector3(x1, 0, z1).add(g.position));
      r.rotateX(Math.PI / 2);
      r.userData.noCast = true;
      g.add(r);
      const peg = mesh(B(0.05, 0.1, 0.05), m.darkWood, x1, 0.05, z1);
      peg.userData.noCast = true;
      g.add(peg);
    };
    rope(0, 1.5, d / 2 + 0.06, 0, d / 2 + 0.85);
    rope(0, 1.3, -d / 2 - 0.04, 0, -d / 2 - 0.8);
    rope(-0.55, 0.5, 0.2, -1.2, 0.35);
    rope(0.55, 0.5, -0.2, 1.2, -0.35);
    bake(g);
    out.colliders.push({ rect: [o.x - w / 2, o.y - d / 2, w, d] });
    out.interact = { kind: 'tent' };
  },
  campfire(g, o, out, m) {
    const stoneM = toon(R3, { color: 0x8a858e, key: 'campstone' });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.add(mesh(B(0.16, 0.12, 0.14), stoneM, Math.cos(a) * 0.38, 0.06, Math.sin(a) * 0.3));
    }
    const logM = toon(R3, { color: 0x6b4330, key: 'camplog' });
    for (const r of [0.5, -0.5]) { const l = mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.6, 6), logM, 0, 0.08, 0); l.rotation.z = Math.PI / 2; l.rotation.y = r; g.add(l); }
    const coals = embers(R3);
    coals.position.y = 0.04;
    g.add(coals);
    const flames = flameCluster(R3, 1.05);
    flames.position.y = 0.08;
    g.add(flames);
    out.fire = [flames];
    // (a red-orange light: a paler orange turned the grass round the fire yellow)
    out.lights.push({ x: o.x, y: 0.7, z: o.y + 0.2, color: 0xff5f2a, power: 2.0, flicker: true, lamp: true, fire: true, dist: 9 });
    out.colliders.push({ x: o.x, z: o.y, r: 0.45 });
    out.interact = { kind: 'campfire' };
  },
  logseat(g, o, out, m) {
    // a log to sit on round the fire: bark, sawn ends, a little bracket fungus and moss
    const l = mesh(new THREE.CylinderGeometry(0.19, 0.2, 1.0, 9), [barkMat(), ringsMat(), ringsMat()], 0, 0.19, 0);
    l.rotation.z = Math.PI / 2;
    g.add(l);
    const moss = mesh(new THREE.IcosahedronGeometry(1, 0), toon(R3, { color: 0x6f9150, key: 'moss' }), -0.18, 0.34, -0.05);
    moss.scale.set(0.2, 0.05, 0.12);
    g.add(moss);
    const fungus = mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.03, 7, 1, false, 0, Math.PI), toon(R3, { color: 0xe8b060, key: 'p-fungus' }), 0.28, 0.24, 0.19);
    fungus.rotation.y = Math.PI / 2;
    fungus.userData.noCast = true;
    g.add(fungus);
    if (o.rot) g.rotation.y = o.rot;
    bake(g);
    out.colliders.push({ x: o.x, z: o.y, r: 0.3 });
  },
  lantern(g, o, out, m) {
    g.add(mesh(B(0.08, 1.2, 0.08), m.darkWood, 0, 0.6, 0));
    g.add(mesh(B(0.3, 0.06, 0.08), m.darkWood, 0.12, 1.18, 0));
    const l = mesh(B(0.18, 0.22, 0.18), m.glass, 0.24, 1.02, 0);
    l.userData.noCast = true;
    g.add(l);
    out.lights.push({ x: o.x + 0.24, y: 1.0, z: o.y + 0.1, color: 0xff9c52, power: 1.0, lamp: true });
    out.colliders.push({ x: o.x, z: o.y, r: 0.1 });
  },
  shrine(g, o, out, m) {
    // a little forest shrine: a two-step stone base, a wooden sanctuary with lattice doors under a
    // curved roof (its eaves sweep up), red posts carrying a straw rope with paper streamers, a
    // glowing bell on a red & white cord, an offering box with a golden bowl
    const stoneT = toon(R3, { key: 'p-shrinestone', map: tex('shrinestone', () => pixelTexture(paintWall(24, 8, 'stone', { wallColor: '#aaa4ab' }, 31, { foundation: false }), { repeat: true })) });
    g.add(mesh(B(1.44, 0.2, 1.0), stoneT, 0, 0.1, 0));
    g.add(mesh(B(1.2, 0.12, 0.84), toon(R3, { color: 0xbcb6bd, key: 'p-shrinestep' }), 0, 0.26, -0.02));
    const wood = toon(R3, { key: 'p-shrinewood', map: tex('shrinewood', () => {
      const p = new Painter(16, 12), R = ramp('#7a3b33');
      p.rect(0, 0, 16, 12, R.m);
      // the lattice doors
      p.rect(3, 2, 10, 9, '#3a2228');
      for (let x = 4; x < 13; x += 2) p.vline(x, 2, 9, R.l);
      for (let y = 3; y < 11; y += 2) p.hline(3, y, 10, R.l);
      p.vline(8, 2, 9, R.d); p.px(7, 6, '#f2c14e'); p.px(9, 6, '#f2c14e');
      p.hline(0, 0, 16, R.d); p.hline(0, 11, 16, R.o);
      return pixelTexture(p.c);
    }) });
    const plain = toon(R3, { color: 0x6a3530, key: 'p-shrineside' });
    g.add(mesh(B(0.8, 0.58, 0.52), [plain, plain, plain, plain, wood, plain], 0, 0.61, -0.1));
    // the curved roof: steep by the ridge, flattening & lifting at the eaves
    const rt = toon(R3, { key: 'p-shrineroof', side: THREE.DoubleSide, map: tex('shrineroof', () => pixelTexture(paintRoof(28, 14, '#6b4a8a', { seed: 41, kind: 'tile', moss: 1.5 }))) });
    rt.shadowSide = THREE.DoubleSide;
    const X = 0.86, zs = [0, 0.3, 0.6], ys = [1.42, 1.18, 1.14];
    const polys = [];
    for (const s of [1, -1]) {
      for (let k = 0; k < 2; k++) {
        const za = zs[k] * s - 0.1, zb = zs[k + 1] * s - 0.1, ya = ys[k], yb = ys[k + 1];
        const uv = [[0, 1 - k * 0.6], [1, 1 - k * 0.6], [1, k ? 0 : 0.4], [0, k ? 0 : 0.4]];
        polys.push(s > 0 ? quad([-X, ya, za], [X, ya, za], [X, yb, zb], [-X, yb, zb], [uv[0], uv[1], uv[2], uv[3]]) : quad([X, ya, za], [-X, ya, za], [-X, yb, zb], [X, yb, zb], [uv[0], uv[1], uv[2], uv[3]]));
      }
    }
    g.add(new THREE.Mesh(polyGeometry(polys), rt));
    const dark = toon(R3, { color: 0x3a2a3a, key: 'p-shrineridge' });
    g.add(mesh(B(1.86, 0.1, 0.12), dark, 0, 1.46, -0.1));
    for (const s of [-1, 1]) { const c = mesh(B(0.06, 0.26, 0.05), dark, s * 0.9, 1.56, -0.1); c.rotation.z = s * -0.5; g.add(c); }
    // the posts, the straw rope and its paper streamers
    const red = toon(R3, { color: 0xc8454f, key: 'shrinepost' });
    for (const x of [-0.5, 0.5]) { g.add(mesh(B(0.12, 0.92, 0.12), red, x, 0.78, 0.26)); g.add(mesh(B(0.18, 0.06, 0.18), dark, x, 0.34, 0.26)); }
    const straw = mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.0, 6), toon(R3, { color: 0xd9c090, key: 'p-rope' }), 0, 1.06, 0.3);
    straw.rotation.z = Math.PI / 2;
    g.add(straw);
    const paper = toon(R3, { color: 0xfbf6ea, key: 'p-shide', side: THREE.DoubleSide });
    for (const x of [-0.25, 0.25]) {
      for (let k = 0; k < 3; k++) { const z = mesh(B(0.07, 0.07, 0.01), paper, x + (k % 2 ? 0.03 : -0.03), 0.99 - k * 0.07, 0.31); z.userData.noCast = true; g.add(z); }
    }
    // the bell & its cord, the offering box
    const bell = mesh(new THREE.SphereGeometry(0.07, 8, 6), toon(R3, { color: 0xf2c14e, emissive: 0xffd66b, emissiveIntensity: 0.6, key: 'bellglow' }), 0, 0.98, 0.3);
    bell.userData.keep = true;
    g.add(bell);
    for (let k = 0; k < 4; k++) { const c = mesh(B(0.035, 0.1, 0.035), k % 2 ? paper : red, 0, 0.86 - k * 0.1, 0.31); c.userData.noCast = true; g.add(c); }
    const boxT = toon(R3, { key: 'p-offerbox', map: tex('offerbox', () => pixelTexture(paintPlanks(8, 8, { dir: 'h', color: '#8a5d3e', seed: 2 }))) });
    g.add(mesh(B(0.44, 0.2, 0.26), boxT, 0, 0.42, 0.34));
    for (let k = 0; k < 4; k++) g.add(mesh(B(0.44, 0.02, 0.03), dark, 0, 0.53, 0.25 + k * 0.06));
    g.add(mesh(new THREE.CylinderGeometry(0.1, 0.07, 0.05, 10), toon(R3, { color: 0xe0a526, key: 'gold' }), 0.3, 0.35, 0.44));
    bake(g);
    out.colliders.push({ rect: [o.x - 0.65, o.y - 0.45, 1.3, 0.9] });
    out.interact = { kind: 'shrine' };
    out.lights.push({ x: o.x, y: 0.8, z: o.y + 0.5, color: 0xffd08a, power: 0.6 });
  },
  // A fall off the rock's edge: a curtain of water streaming down (its streaks scroll — world3d's
  // 'fall' anim), a white lip where it tips over, foam churning at its foot (o: the edge's middle)
  waterfall(g, o, out, m) {
    const W = 48, H = 20, p = new Painter(W, H), r = rng(Math.floor(o.x * 13 + o.y * 7));
    for (let x = 0; x < W; x++) {
      const edge = Math.min(x, W - 1 - x);
      const base = edge < 2 ? '#3a78a8' : edge < 5 ? '#4f94c4' : '#5fa8d8';
      for (let y = 0; y < H; y++) p.px(x, y, base);
      // (streaks: a few light runs down each column, wrapping round so the scroll never jumps)
      if (edge < 1) continue;
      const n = edge < 4 ? 1 : 2 + Math.floor(r() * 2);
      for (let k = 0; k < n; k++) {
        const y0 = Math.floor(r() * H), len = 3 + Math.floor(r() * 6), white = r() < (edge < 4 ? 0.15 : 0.45);
        for (let q = 0; q < len; q++) p.px(x, (y0 + q) % H, q === 0 || (white && q < len - 1) ? '#e7f6f4' : '#9fd0f5');
      }
    }
    const t = pixelTexture(p.c, { repeat: true });
    const sheetMat = toon(R3, { map: t, emissive: 0x4f99c7, emissiveIntensity: 0.22 });
    const sheet = mesh(new THREE.PlaneGeometry(3, 1.25), sheetMat, 0, 0.62, 0);
    sheet.userData.noCast = true;
    g.add(sheet);
    // the lip: where the stream tips over the edge
    const white = toon(R3, { color: 0xeef9f6, emissive: 0xbfe4f0, emissiveIntensity: 0.25, key: 'fall-foam' });
    g.add(mesh(B(3.05, 0.08, 0.16), white, 0, 1.26, -0.06));
    g.add(mesh(B(2.6, 0.05, 0.1), toon(R3, { color: 0x9fd0f5, key: 'fall-lip' }), 0, 1.31, -0.14));
    // foam at its foot, churning (anim: world3d)
    const foam = [];
    for (let i = 0; i < 6; i++) {
      const f = mesh(new THREE.IcosahedronGeometry(1, 0), white, -1.25 + i * 0.5 + (r() - 0.5) * 0.15, 0.03, 0.12 + r() * 0.2);
      const s0 = 0.2 + r() * 0.12;
      f.scale.set(s0 * 1.4, s0 * 0.45, s0);
      f.userData.s = s0;
      f.userData.noCast = true;
      g.add(f);
      foam.push(f);
    }
    out.anim = 'fall';
    out.animPart = { sheet, foam };
    out.splash = { x: o.x, z: o.y + 0.35 };
  },
  farmstand(g, o, out, m) {
    g.add(mesh(B(1.9, 0.72, 0.6), m.wood, 0, 0.36, 0));
    g.add(mesh(B(2.0, 0.08, 0.7), m.darkWood, 0, 0.74, 0));
    for (const x of [-0.9, 0.9]) g.add(mesh(B(0.1, 1.9, 0.1), m.darkWood, x, 0.95, -0.25));
    const aw = paintAwning(32, 12, '#fbf1dc', '#d9594c');
    const aMat = toon(R3, { map: pixelTexture(aw), side: THREE.DoubleSide });
    aMat.shadowSide = THREE.DoubleSide;
    const awn = new THREE.Mesh(polyGeometry([quad([-1.05, 1.62, 0.45], [1.05, 1.62, 0.45], [1.05, 1.95, -0.35], [-1.05, 1.95, -0.35])]), aMat);
    g.add(awn);
    // produce: eggs, honey jars, milk bottles
    const eggM = toon(R3, { color: 0xf1e2c8, key: 'egg' }), honM = toon(R3, { color: 0xf2b63d, emissive: 0x6a4a10, emissiveIntensity: 0.2, key: 'honeyjar' }), milkM = toon(R3, { color: 0xf4f1ec, key: 'milk' });
    g.add(mesh(B(0.5, 0.1, 0.34), m.wood, -0.6, 0.83, 0));
    for (let i = 0; i < 5; i++) g.add(mesh(B(0.08, 0.1, 0.08), eggM, -0.78 + (i % 3) * 0.16, 0.92, -0.07 + Math.floor(i / 3) * 0.14));
    for (let i = 0; i < 3; i++) { g.add(mesh(B(0.12, 0.14, 0.12), honM, -0.05 + i * 0.17, 0.85, 0.05)); g.add(mesh(B(0.13, 0.03, 0.13), m.red, -0.05 + i * 0.17, 0.93, 0.05)); }
    for (let i = 0; i < 3; i++) { g.add(mesh(B(0.09, 0.2, 0.09), milkM, 0.55 + i * 0.13, 0.88, 0)); g.add(mesh(B(0.05, 0.05, 0.05), toon(R3, { color: 0x7cb6e0, key: 'milkcap' }), 0.55 + i * 0.13, 1.0, 0)); }
    const sp = new Painter(24, 8);
    sp.rect(0, 0, 24, 8, '#4a2e25'); sp.rect(1, 1, 22, 6, '#e9cf9b');
    sp.rect(4, 3, 3, 3, '#fbf6ea'); sp.px(5, 2, '#fbf6ea');
    sp.rect(10, 3, 4, 3, '#f2b63d'); sp.hline(10, 2, 4, '#c8454f');
    sp.rect(18, 2, 2, 4, '#f4f1ec'); sp.px(18, 1, '#7cb6e0'); sp.px(19, 1, '#7cb6e0');
    const sign = mesh(B(0.95, 0.3, 0.05), toon(R3, { map: pixelTexture(sp.c) }), 0, 0.45, 0.33);
    g.add(sign);
    bake(g);
    out.colliders.push({ rect: [o.x - 0.95, o.y - 0.3, 1.9, 0.6] });
  },
  flowerbed(g, o, out, m) {
    const w = o.w || 2, h = o.h || 0.8;
    const edge = toon(R3, { color: 0xa9a3a8, key: 'bedstone' });
    g.add(mesh(B(w + 0.14, 0.16, h + 0.14), edge, 0, 0.08, 0));
    g.add(mesh(B(w, 0.18, h), toon(R3, { color: 0x6b4a34, key: 'bedsoil' }), 0, 0.1, 0));
    const cols = [0xec5f73, 0xffd66b, 0xf4efe4, 0xb9a2e3, 0xf0934a, 0xe97d8f];
    const stem = toon(R3, { color: 0x5fa453, key: 'bedstem' });
    const rr = rng(Math.floor(o.x * 13 + o.y * 7));
    const n = Math.round(w * h * 9);
    for (let i = 0; i < n; i++) {
      const x = (rr() - 0.5) * (w - 0.2), z = (rr() - 0.5) * (h - 0.2), ht = 0.14 + rr() * 0.12;
      g.add(mesh(B(0.04, ht, 0.04), stem, x, 0.19 + ht / 2, z));
      const ci = Math.floor(rr() * cols.length);
      g.add(mesh(B(0.1, 0.08, 0.1), toon(R3, { color: cols[ci], key: 'petal' + ci }), x, 0.2 + ht, z));
    }
    bake(g);
    out.colliders.push({ rect: [o.x - w / 2 - 0.07, o.y - h / 2 - 0.07, w + 0.14, h + 0.14] });
  },
  swings(g, o, out, m) {
    const post = toon(R3, { color: 0xc8454f, key: 'swingpost' }), rope = m.rope, seat = m.wood;
    for (const x of [-1.1, 1.1]) {
      const a = mesh(B(0.08, 1.8, 0.08), post, x, 0.9, -0.3); a.rotation.x = 0.25; g.add(a);
      const b = mesh(B(0.08, 1.8, 0.08), post, x, 0.9, 0.3); b.rotation.x = -0.25; g.add(b);
    }
    g.add(mesh(B(2.4, 0.08, 0.08), post, 0, 1.76, 0));
    const swings = [];
    for (const x of [-0.5, 0.5]) {
      const sw = new THREE.Group(); sw.position.set(x, 1.74, 0);
      sw.add(mesh(B(0.03, 1.3, 0.03), rope, -0.18, -0.65, 0), mesh(B(0.03, 1.3, 0.03), rope, 0.18, -0.65, 0), mesh(B(0.44, 0.05, 0.2), seat, 0, -1.3, 0));
      g.add(sw); swings.push(sw);
    }
    out.anim = 'swing'; out.animPart = swings;
    out.colliders.push({ x: o.x - 1.1, z: o.y, r: 0.3 }, { x: o.x + 1.1, z: o.y, r: 0.3 });
  },
  slide(g, o, out, m) {
    const blue = toon(R3, { color: 0x4d7fc4, key: 'slideblue' }), yel = toon(R3, { color: 0xf2c14e, key: 'slideyel' });
    for (const [x, z] of [[-0.3, -0.5], [0.3, -0.5], [-0.3, -0.05], [0.3, -0.05]]) g.add(mesh(B(0.08, 1.2, 0.08), blue, x, 0.6, z));
    g.add(mesh(B(0.7, 0.08, 0.55), yel, 0, 1.2, -0.28));
    for (let i = 0; i < 4; i++) g.add(mesh(B(0.5, 0.05, 0.12), m.wood, 0, 0.25 + i * 0.28, -0.75 - i * 0.02));
    const ramp = mesh(B(0.5, 0.06, 1.6), yel, 0, 0.62, 0.62);
    ramp.rotation.x = 0.72;
    g.add(ramp);
    for (const x of [-0.27, 0.27]) { const r = mesh(B(0.04, 0.12, 1.6), blue, x, 0.7, 0.62); r.rotation.x = 0.72; g.add(r); }
    bake(g);
    out.colliders.push({ rect: [o.x - 0.4, o.y - 0.8, 0.8, 0.9] });
  },
  sandbox(g, o, out, m) {
    for (const [x, z, w, d] of [[0, -0.7, 1.6, 0.14], [0, 0.7, 1.6, 0.14], [-0.8, 0, 0.14, 1.54], [0.8, 0, 0.14, 1.54]]) g.add(mesh(B(w, 0.2, d), m.wood, x, 0.1, z));
    g.add(mesh(B(1.46, 0.12, 1.26), toon(R3, { color: 0xe9cf9b, key: 'sand' }), 0, 0.06, 0));
    g.add(mesh(B(0.18, 0.14, 0.18), toon(R3, { color: 0xd9364a, key: 'bucket' }), 0.3, 0.19, 0.2));
    g.add(mesh(B(0.3, 0.18, 0.25), toon(R3, { color: 0xe0c89a, key: 'castle' }), -0.25, 0.21, -0.15));
    bake(g);
    out.colliders.push({ rect: [o.x - 0.85, o.y - 0.75, 1.7, 1.5] });
  },
  bandstand(g, o, out, m) {
    const floor = mesh(new THREE.CylinderGeometry(1.8, 1.9, 0.3, 8), toon(R3, { color: 0xf4efe4, key: 'bandfloor' }), 0, 0.15, 0);
    floor.rotation.y = Math.PI / 8;
    g.add(floor);
    g.add(mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.04, 8), toon(R3, { color: 0xc49a64, key: 'banddeck' }), 0, 0.32, 0));
    const postM = toon(R3, { color: 0xf4efe4, key: 'gazebopost' });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      if (i === 1 || i === 2) continue;
      g.add(mesh(B(0.1, 1.7, 0.1), postM, Math.cos(a) * 1.6, 1.15, Math.sin(a) * 1.6));
      out.colliders.push({ x: o.x + Math.cos(a) * 1.6, z: o.y + Math.sin(a) * 1.6, r: 0.13 });
    }
    const roof = mesh(new THREE.ConeGeometry(2.25, 1.2, 8), toon(R3, { color: 0xc8454f, key: 'bandroof', shadowSide: THREE.DoubleSide }), 0, 2.55, 0);
    roof.rotation.y = Math.PI / 8;
    g.add(roof);
    const trim = mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.14, 8, 1, true), toon(R3, { color: 0xffd66b, key: 'bandtrim', side: THREE.DoubleSide }), 0, 1.98, 0);
    trim.rotation.y = Math.PI / 8;
    g.add(trim);
    g.add(mesh(new THREE.SphereGeometry(0.13, 8, 6), toon(R3, { color: 0xf2c14e, key: 'gold' }), 0, 3.2, 0));
    // bunting lights around the eaves
    const cols = [0xf6a05a, 0xec5f73, 0xffd66b, 0x8fd6b4, 0xb9a2e3];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const b = mesh(B(0.12, 0.14, 0.12), toon(R3, { color: cols[i % 5], emissive: cols[i % 5], emissiveIntensity: 0.6, key: 'bunt' + (i % 5) }), Math.cos(a) * 2.05, 1.85, Math.sin(a) * 2.05);
      b.userData.noCast = true;
      g.add(b);
    }
    out.lights.push({ x: o.x, y: 1.6, z: o.y, color: 0xffc070, power: 1.2, lamp: true });
    bake(g);
    out.interact = { kind: 'bandstand' };
  },
  snowman(g, o, out, m) {
    const snow = toon(R3, { color: 0xf1f5fc, key: 'snowball' });
    for (const [y, r] of [[0.32, 0.36], [0.82, 0.27], [1.22, 0.2]]) {
      const b = mesh(new THREE.IcosahedronGeometry(1, 1), snow, 0, y, 0);
      b.scale.setScalar(r);
      g.add(b);
    }
    const coal = toon(R3, { color: 0x2a2433, key: 'coal' });
    for (const x of [-0.07, 0.07]) g.add(mesh(B(0.05, 0.05, 0.03), coal, x, 1.27, 0.18));
    for (const y of [0.72, 0.84, 0.96]) g.add(mesh(B(0.05, 0.05, 0.03), coal, 0, y, 0.26));
    const nose = mesh(new THREE.ConeGeometry(0.035, 0.18, 5), toon(R3, { color: 0xe8883a, key: 'carrot' }), 0, 1.21, 0.24);
    nose.rotation.x = Math.PI / 2;
    g.add(nose);
    g.add(mesh(B(0.44, 0.08, 0.44), toon(R3, { color: o.scarf ? 0x3f9b98 : 0xc8454f, key: 'snowscarf' + (o.scarf ? 1 : 0) }), 0, 1.05, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.15, 0.16, 0.2, 8), toon(R3, { color: 0x3b3844, key: 'snowhat' }), 0, 1.46, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 8), toon(R3, { color: 0x3b3844, key: 'snowhat' }), 0, 1.37, 0));
    for (const sx of [-1, 1]) { const a = mesh(B(0.04, 0.4, 0.04), m.darkWood, sx * 0.34, 0.9, 0); a.rotation.z = sx * -0.9; g.add(a); }
    bake(g);
    out.colliders.push({ x: o.x, z: o.y, r: 0.36 });
    out.interact = { kind: 'snowman' };
  },
  icehole(g, o, out, m) {
    g.add(mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.34, 8), m.wood, 0, 0.17, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 8), m.darkWood, 0, 0.36, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.2, 8), toon(R3, { color: 0x7cb6e0, key: 'bucket2' }), 0.34, 0.1, 0.12));
    bake(g);
    out.colliders.push({ x: o.x, z: o.y, r: 0.22 });
  },
  torii(g, o, out, m) {
    const red = toon(R3, { color: 0xd9433a, key: 'torii' }), dark = toon(R3, { color: 0x3b2a2e, key: 'toriitop' });
    for (const x of [-1.25, 1.25]) {
      g.add(mesh(new THREE.CylinderGeometry(0.11, 0.13, 2.3, 8), red, x, 1.15, 0));
      g.add(mesh(B(0.34, 0.14, 0.34), dark, x, 0.07, 0));
    }
    const top = mesh(B(3.3, 0.16, 0.34), dark, 0, 2.38, 0);
    g.add(top);
    g.add(mesh(B(3.0, 0.14, 0.26), red, 0, 2.22, 0));
    g.add(mesh(B(2.6, 0.12, 0.2), red, 0, 1.86, 0));
    g.add(mesh(B(0.14, 0.34, 0.16), dark, 0, 2.02, 0.02));
    bake(g);
    out.colliders.push({ x: o.x - 1.25, z: o.y, r: 0.18 }, { x: o.x + 1.25, z: o.y, r: 0.18 });
  },
  koibridge(g, o, out, m) {
    // a little red arched bridge over the koi pond (plank tiles underneath carry you): a deck of
    // boards laid across, red posts with bronze knobs, a handrail, a red beam along each side
    const red = toon(R3, { color: 0xd9433a, key: 'torii' });
    const deckM = toon(R3, { key: 'p-koideck', map: tex('koideck', () => pixelTexture(paintPlanks(16, 16, { dir: 'h', color: '#8a4a38', seed: 8 }), { repeat: true })) });
    const bronze = toon(R3, { color: 0xc9a040, key: 'p-bronze' }), redD = toon(R3, { color: 0xa8322c, key: 'p-koibeam' });
    const len = KOI.len, N = 9;
    for (let i = 0; i < N; i++) {
      const t0 = i / N, t1 = (i + 1) / N, tm = (t0 + t1) / 2;
      const z = -len / 2 + tm * len, y = 0.16 + Math.sin(tm * Math.PI) * KOI.arch;
      const tilt = -Math.cos(tm * Math.PI) * KOI.arch * Math.PI / len * 0.9;
      const seg = mesh(B(1.9, 0.12, len / N + 0.04), deckM, 0, y, z);
      seg.rotation.x = tilt;
      g.add(seg);
      for (const x of [-0.92, 0.92]) {
        const py = 0.16 + Math.sin(t0 * Math.PI) * KOI.arch;
        g.add(mesh(B(0.1, 0.5, 0.1), red, x, py + 0.3, z - len / N / 2));
        g.add(mesh(new THREE.SphereGeometry(0.07, 6, 4), bronze, x, py + 0.6, z - len / N / 2));
        const rail = mesh(B(0.1, 0.07, len / N + 0.06), red, x, y + 0.5, z);
        rail.rotation.x = tilt;
        g.add(rail);
        const beam = mesh(B(0.08, 0.14, len / N + 0.06), redD, x * 1.04, y - 0.06, z);
        beam.rotation.x = tilt;
        g.add(beam);
      }
    }
    for (const x of [-0.92, 0.92]) for (const z of [-len / 2, len / 2]) {
      g.add(mesh(B(0.15, 0.74, 0.15), red, x, 0.37, z));
      const k = mesh(new THREE.SphereGeometry(0.09, 8, 6), bronze, x, 0.8, z);
      k.scale.y = 1.2;
      g.add(k);
      g.add(mesh(new THREE.ConeGeometry(0.04, 0.1, 6), bronze, x, 0.93, z));
    }
    bake(g);
    out.colliders.push({ rect: [o.x - 1.02, o.y - len / 2, 0.12, len] }, { rect: [o.x + 0.9, o.y - len / 2, 0.12, len] });
  },
  leafpile(g, o, out, m) {
    const cols = [0xd9543c, 0xe8883a, 0xeab83a, 0xc8453a];
    const rr = rng(Math.floor(o.x * 17 + o.y * 5));
    for (let i = 0; i < 14; i++) {
      const a = rr() * Math.PI * 2, d = rr() * 0.45;
      const b = mesh(B(0.2, 0.06, 0.16), toon(R3, { color: cols[i % 4], key: 'leafp' + (i % 4) }), Math.cos(a) * d, 0.06 + (0.45 - d) * 0.55 + rr() * 0.08, Math.sin(a) * d * 0.8);
      b.rotation.set(rr() * 0.6, rr() * 3, rr() * 0.6);
      g.add(b);
    }
    const mound = mesh(new THREE.IcosahedronGeometry(1, 1), toon(R3, { color: 0xc8703a, key: 'leafmound' }), 0, 0.02, 0);
    mound.scale.set(0.5, 0.26, 0.42);
    g.add(mound);
    out.leafpile = true;
  },
  hollowlog(g, o, out, m) {
    const bark = barkMat('#8e6a4a'), inner = ringsMat(), hole = toon(R3, { color: 0x2a1f26, key: 'loghole' });
    const log = new THREE.Group();
    log.rotation.y = 0.35;
    g.add(log);
    const body = mesh(new THREE.CylinderGeometry(0.44, 0.48, 2.2, 10), [bark, inner, inner], 0, 0.44, 0);
    body.rotation.z = Math.PI / 2;
    log.add(body);
    for (const x of [-1.11, 1.11]) { const h = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 10), hole, x, 0.44, 0); h.rotation.z = Math.PI / 2; log.add(h); }
    for (const x of [-0.6, 0.1, 0.7]) log.add(mesh(B(0.06, 0.1, 0.9), toon(R3, { color: 0x6b4a34, key: 'logring' }), x, 0.72, 0));
    log.add(mesh(B(0.5, 0.12, 0.34), toon(R3, { color: 0x5fa453, key: 'moss2' }), 0.25, 0.9, 0.05));
    const mush = toon(R3, { color: 0xd9594c, key: 'logmush' });
    for (const [x, z] of [[-0.5, 0.55], [0.75, 0.52]]) { log.add(mesh(B(0.05, 0.12, 0.05), m.white, x, 0.1, z)); log.add(mesh(B(0.14, 0.06, 0.14), mush, x, 0.18, z)); }
    out.colliders.push({ x: o.x - 0.6, z: o.y - 0.2, r: 0.5 }, { x: o.x + 0.6, z: o.y + 0.2, r: 0.5 });
    out.interact = { kind: 'hollowlog' };
  },
  blanket(g, o, out, m) {
    const p = new Painter(20, 14);
    for (let y = 0; y < 14; y++) for (let x = 0; x < 20; x++) p.px(x, y, ((x >> 2) + (y >> 2)) % 2 ? '#c8454f' : '#fbf1dc');
    p.rect(0, 0, 20, 1, '#a8323c'); p.rect(0, 13, 20, 1, '#a8323c');
    const b = mesh(new THREE.PlaneGeometry(1.25, 0.9), toon(R3, { map: pixelTexture(p.c) }), 0, 0.02, 0);
    b.rotation.x = -Math.PI / 2; b.rotation.z = 0.15;
    b.userData.noCast = true;
    g.add(b);
    g.add(mesh(B(0.34, 0.22, 0.24), toon(R3, { color: 0xc49a64, key: 'basket' }), 0.3, 0.13, -0.1));
    g.add(mesh(B(0.3, 0.05, 0.05), toon(R3, { color: 0x8e5d3e, key: 'baskethandle' }), 0.3, 0.3, -0.1));
    g.add(mesh(B(0.1, 0.1, 0.1), toon(R3, { color: 0xe0463f, key: 'appleR' }), -0.25, 0.07, 0.15));
  },
  starflower(g, o, out, m) {
    const stem = toon(R3, { color: 0x6fae5a, key: 'starstem' });
    const petal = toon(R3, { color: 0xfff3c4, emissive: 0xffe28a, emissiveIntensity: 0.3, key: 'starflower' });
    const rr = rng(Math.floor(o.x * 31 + o.y * 17));
    for (let i = 0; i < 3; i++) {
      const x = (rr() - 0.5) * 0.5, z = (rr() - 0.5) * 0.4, h = 0.18 + rr() * 0.14;
      g.add(mesh(B(0.03, h, 0.03), stem, x, h / 2, z));
      const f = mesh(new THREE.OctahedronGeometry(0.07, 0), petal, x, h + 0.03, z);
      f.userData.noCast = true;
      g.add(f);
    }
    out.glows = [petal];
    out.lights.push({ x: o.x, y: 0.35, z: o.y + 0.2, color: 0xffe28a, power: 0.45 });
  },
  stonelantern(g, o, out, m) {
    // a stone lantern: a six-sided foot, a post, a platform, the light box in four stone pillars,
    // a wide roof with a knob — mossy on its north side
    const st = toon(R3, { color: 0xa9a3a8, key: 'shrinestone' }), stL = toon(R3, { color: 0xc4bec4, key: 'p-stonel2' });
    g.add(mesh(new THREE.CylinderGeometry(0.2, 0.23, 0.1, 6), st, 0, 0.05, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.075, 0.1, 0.4, 6), stL, 0, 0.3, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.21, 0.15, 0.08, 6), st, 0, 0.54, 0));
    const lamp = mesh(B(0.17, 0.17, 0.17), m.glass, 0, 0.665, 0);
    lamp.userData.noCast = true; lamp.userData.keep = true;
    g.add(lamp);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(mesh(B(0.05, 0.19, 0.05), stL, x * 0.1, 0.665, z * 0.1));
    g.add(mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.03, 6), st, 0, 0.77, 0));
    g.add(mesh(new THREE.ConeGeometry(0.31, 0.16, 6), stL, 0, 0.86, 0));
    g.add(mesh(new THREE.SphereGeometry(0.05, 6, 4), stL, 0, 0.96, 0));
    const moss = mesh(new THREE.IcosahedronGeometry(1, 0), toon(R3, { color: 0x6f9150, key: 'moss' }), -0.05, 0.84, -0.14);
    moss.scale.set(0.16, 0.05, 0.1);
    g.add(moss);
    bake(g);
    out.lights.push({ x: o.x, y: 0.7, z: o.y + 0.15, color: 0xffc070, power: 0.8, lamp: true });
    out.colliders.push({ x: o.x, z: o.y, r: 0.2 });
  },
  rowboat(g, o, out, m) {
    PROPS.boat(g, o, out, m);
    if (o.island) out.interact = { kind: 'rowback' };
  },
  glowcap(g, o, out, m) {
    const stem = toon(R3, { color: 0xe9f0e0, key: 'glowstem' });
    const cap = toon(R3, { color: 0x7fe3e0, emissive: 0x4fd8e0, emissiveIntensity: 0.4, key: 'glowcap' });
    const rr = rng(Math.floor(o.x * 97 + o.y * 13));
    const n = 2 + Math.floor(rr() * 3);
    for (let i = 0; i < n; i++) {
      const x = (rr() - 0.5) * 0.5, z = (rr() - 0.5) * 0.4, s = 0.6 + rr() * 0.6;
      g.add(mesh(B(0.06 * s, 0.22 * s, 0.06 * s), stem, x, 0.11 * s, z));
      const c = mesh(new THREE.CylinderGeometry(0.02, 0.14 * s, 0.1 * s, 7), cap, x, 0.24 * s, z);
      c.userData.noCast = true;
      g.add(c);
    }
    out.glows = [cap];
    out.lights.push({ x: o.x, y: 0.4, z: o.y + 0.2, color: 0x6fe0ff, power: 0.7, glowcap: true });
  },
  willow(g, o, out, m) {
    // a weeping willow: a stout leaning trunk with roots, a low wide crown of flattened tufts (the
    // valley's trees' leaves) and long fronds hanging all round it, swaying
    const bark = barkMat('#6b4a34');
    const trunk = mesh(new THREE.CylinderGeometry(0.42, 0.7, 2.7, 8), bark, 0, 1.35, 0);
    trunk.rotation.z = 0.06;
    g.add(trunk);
    for (let i = 0; i < 4; i++) {
      const a = i * 1.6 + 0.4, root = mesh(new THREE.CylinderGeometry(0.1, 0.22, 0.9, 6), bark, Math.cos(a) * 0.55, 0.22, Math.sin(a) * 0.5);
      root.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
      g.add(root);
    }
    const leaf = toon(R3, { key: 'p-willowtuft', map: tex('willowtuft', () => leafTexture('#86b85e', 91)) });
    const leafD = toon(R3, { key: 'p-willowtuftd', map: tex('willowtuftd', () => leafTexture('#6a9e50', 92)) });
    const ico = new THREE.IcosahedronGeometry(1, 1), rr = rng(Math.floor(o.x * 11 + o.y * 5));
    const tufts = [[0, 3.55, 0, 1.05]];
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2 + rr() * 0.4; tufts.push([Math.cos(a) * 1.55, 3.1 + rr() * 0.3, Math.sin(a) * 1.25, 0.8 + rr() * 0.2]); }
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.5; tufts.push([Math.cos(a) * 0.75, 3.55 + rr() * 0.25, Math.sin(a) * 0.6, 0.85]); }
    tufts.forEach(([x, y, z, r], i) => {
      const t = mesh(ico, i && i < 10 ? leafD : leaf, x, y, z);
      t.scale.set(r, r * 0.62, r * 0.84);
      t.rotation.y = rr() * 6;
      g.add(t);
    });
    // the fronds: long strands of little leaves, in two greens, from the crown's rim to near the grass
    const strand = (c1, c2) => {
      const p = new Painter(4, 24), r2 = rng(c1.length * 7);
      for (let y = 0; y < 24; y++) for (let x = 0; x < 4; x++) if ((x + (y >> 1)) % 3 !== 0 || r2() < 0.3) p.px(x, y, r2() < 0.6 ? c1 : c2);
      return pixelTexture(p.c);
    };
    const vines = new THREE.Group();
    const vm = [toon(R3, { key: 'p-frond1', map: tex('frond1', () => strand('#9fcc6a', '#7fae5a')), alphaTest: 0.5, side: THREE.DoubleSide }), toon(R3, { key: 'p-frond2', map: tex('frond2', () => strand('#8fbe62', '#6a9e50')), alphaTest: 0.5, side: THREE.DoubleSide })];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2 + rr() * 0.15;
      const rad = 1.9 + rr() * 0.5, len = 1.5 + rr() * 1.3;
      const v = mesh(new THREE.PlaneGeometry(0.22, len), vm[i % 2], Math.cos(a) * rad, 3.05 - len / 2, Math.sin(a) * rad * 0.82);
      v.rotation.y = -a + Math.PI / 2;
      v.userData.noCast = i % 2 === 1;
      vines.add(v);
    }
    g.add(vines);
    bakeTree(g, toon(R3, { color: 0xffffff, vertexColors: true, key: 'p-vc' }));
    out.anim = 'sway';
    out.animPart = vines;
    out.colliders.push({ x: o.x, z: o.y, r: 0.8 });
  },
  gazebo(g, o, out, m) {
    // a lakeside gazebo: a plank floor on a stone step, white posts with a railing between them
    // (open to the south), an eight-sided roof of teal shingles under a scalloped trim, a gold finial
    const floorT = toon(R3, { key: 'p-gazebofloor', map: tex('gazebofloor', () => pixelTexture(paintPlanks(32, 32, { dir: 'h', color: '#c49a64', seed: 14 }))) });
    const base = mesh(new THREE.CylinderGeometry(1.84, 1.9, 0.08, 8), toon(R3, { color: 0xa9a3a8, key: 'p-stonestep' }), 0, 0.04, 0);
    base.rotation.y = Math.PI / 8;
    g.add(base);
    const floor = mesh(new THREE.CylinderGeometry(1.7, 1.72, 0.12, 8), [toon(R3, { color: 0xa87a4a, key: 'p-gazeboedge' }), floorT, floorT], 0, 0.14, 0);
    floor.rotation.y = Math.PI / 8;
    g.add(floor);
    const postM = toon(R3, { color: 0xf4efe4, key: 'gazebopost' });
    const P = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      P.push([Math.cos(a) * 1.55, Math.sin(a) * 1.55]);
      if (i === 2) continue; // entrance faces south
      g.add(mesh(B(0.1, 1.6, 0.1), postM, P[i][0], 0.99, P[i][1]));
      out.colliders.push({ x: o.x + P[i][0], z: o.y + P[i][1], r: 0.12 });
    }
    // railings between the posts (not across the entrance), with balusters
    for (let i = 0; i < 8; i++) {
      const j = (i + 1) % 8;
      if (i === 1 || i === 2) continue;
      const [x0, z0] = P[i], [x1, z1] = P[j], L = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(z1 - z0, x1 - x0);
      const rail = mesh(B(L, 0.05, 0.06), postM, (x0 + x1) / 2, 0.62, (z0 + z1) / 2);
      rail.rotation.y = -ang;
      g.add(rail);
      for (let k = 1; k < 4; k++) g.add(mesh(B(0.035, 0.42, 0.035), postM, x0 + (x1 - x0) * k / 4, 0.41, z0 + (z1 - z0) * k / 4));
    }
    // the roof: shingles laid round the cone, a scalloped trim under its eaves, a finial
    const rt = tex('gazeboroof', () => { const t = pixelTexture(paintRoof(112, 40, '#3f9b98', { seed: 23, kind: 'shingle', moss: 0.5, eave: false })); t.wrapS = THREE.RepeatWrapping; t.repeat.set(2, 1); return t; });
    const roof = mesh(new THREE.ConeGeometry(2.2, 1.1, 8, 1, true), toon(R3, { map: rt, key: 'p-gazeboroof', side: THREE.DoubleSide, shadowSide: THREE.DoubleSide }), 0, 2.33, 0);
    roof.rotation.y = Math.PI / 8;
    g.add(roof);
    const trim = mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.14, 8, 1, true), toon(R3, { key: 'p-gazebotrim', side: THREE.DoubleSide, alphaTest: 0.5, map: tex('gazebotrim', () => {
      const p = new Painter(64, 4);
      for (let x = 0; x < 64; x++) { p.vline(x, 0, 2, '#f4efe4'); if (x % 4 !== 3) p.px(x, 2, '#f4efe4'); if (x % 4 === 1 || x % 4 === 2) p.px(x, 3, '#e8e0d0'); }
      return pixelTexture(p.c);
    }) }), 0, 1.72, 0);
    trim.rotation.y = Math.PI / 8;
    trim.userData.noCast = true;
    g.add(trim);
    g.add(mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.14, 8), postM, 0, 2.92, 0));
    g.add(mesh(new THREE.SphereGeometry(0.12, 8, 6), toon(R3, { color: 0xf2c14e, key: 'gold' }), 0, 3.06, 0));
    g.add(mesh(new THREE.ConeGeometry(0.04, 0.2, 6), toon(R3, { color: 0xf2c14e, key: 'gold' }), 0, 3.24, 0));
    const bench = mesh(B(1.4, 0.07, 0.35), m.wood, 0, 0.47, -0.9);
    g.add(bench);
    for (const x of [-0.6, 0.6]) g.add(mesh(B(0.07, 0.3, 0.3), m.darkWood, x, 0.3, -0.9));
    bake(g);
    out.interact = { kind: 'gazebo' };
  },
  telescope(g, o, out, m) {
    const brass = toon(R3, { color: 0xe0a526, key: 'gold' });
    for (const [x, z] of [[-0.2, 0.15], [0.2, 0.15], [0, -0.22]]) { const l = mesh(B(0.05, 0.9, 0.05), m.darkWood, x, 0.45, z); l.rotation.z = -x * 0.35; l.rotation.x = z * 0.4; g.add(l); }
    g.add(mesh(B(0.18, 0.1, 0.18), brass, 0, 0.92, 0));
    // the tube points up and away to the north-east, like it's tracking a star
    const tube = new THREE.Group();
    tube.position.set(0, 0.98, 0);
    tube.rotation.set(-0.55, 0, -0.75);
    tube.add(mesh(new THREE.CylinderGeometry(0.09, 0.12, 1.2, 10), toon(R3, { color: 0x3f4f7a, key: 'scope' }), 0, 0.3, 0));
    tube.add(mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 10), brass, 0, 0.88, 0));
    tube.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 8), brass, 0, -0.34, 0));
    g.add(tube);
    bake(g);
    out.colliders.push({ x: o.x, z: o.y, r: 0.3 });
    out.interact = { kind: 'telescope' };
  },
  grotto(g, o, out, m) {
    const st = toon(R3, { color: 0x8a858e, key: 'grottostone' }), dk = toon(R3, { color: 0x6a6571, key: 'grottodark' });
    const rock = new THREE.DodecahedronGeometry(1, 0);
    for (const [x, y, z, s] of [[-1.1, 0.6, 0, 0.8], [1.1, 0.6, 0, 0.8], [0, 1.45, -0.1, 0.9], [-0.7, 1.2, -0.3, 0.7], [0.7, 1.2, -0.3, 0.7]]) {
      const r = mesh(rock, x === 0 ? dk : st, x, y, z);
      r.scale.setScalar(s);
      g.add(r);
    }
    const hole = mesh(new THREE.PlaneGeometry(1.1, 1.1), toon(R3, { color: 0x1b1426, key: 'grottohole' }), 0, 0.55, 0.35);
    hole.userData.noCast = true;
    g.add(hole);
    bake(g);
    out.colliders.push({ x: o.x - 1.1, z: o.y, r: 0.7 }, { x: o.x + 1.1, z: o.y, r: 0.7 });
    out.interact = { kind: 'grotto' };
  },
};

// ---------------------------------------------------------------------------
// Batched decorations: lavender rows & wheat fields (instanced)
export function buildLavender(r3d, list) {
  mats(r3d);
  const g = new THREE.Group();
  if (!list.length) return g;
  const K = 8;
  const bush = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), toon(r3d, { color: 0x6f9a5a, key: 'lavleaf' }), list.length);
  const spikes = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon(r3d, { color: 0xffffff, key: 'lavflower' }), list.length * K);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const c = new THREE.Color();
  const cols = [0x8a64c8, 0x9b7ad8, 0xb89ae8, 0x7a58b8];
  list.forEach((o, i) => {
    bush.setMatrixAt(i, m4.compose(p.set(o.x, 0.2, o.y), q.identity(), s.set(0.5, 0.28, 0.42)));
    for (let k = 0; k < K; k++) {
      const a = k * 2.4 + i * 0.7;
      const r = 0.12 + ((k * 37 + i * 11) % 7) / 7 * 0.22;
      const h = 0.22 + ((k * 13 + i * 5) % 5) / 5 * 0.12;
      spikes.setMatrixAt(i * K + k, m4.compose(p.set(o.x + Math.cos(a) * r, 0.42 + h / 2, o.y + Math.sin(a) * r * 0.8), q.identity(), s.set(0.07, h, 0.07)));
      spikes.setColorAt(i * K + k, c.set(cols[(k + i) % cols.length]));
    }
  });
  for (const im of [bush, spikes]) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); g.add(im); }
  return g;
}

export function buildReeds(r3d, list) {
  const g = new THREE.Group();
  if (!list.length) return g;
  const K = 6;
  const stems = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon(r3d, { color: 0xffffff, key: 'reedstem' }), list.length * K);
  const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon(r3d, { color: 0x6b4330, key: 'cattail' }), list.length * 2);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
  const c = new THREE.Color();
  let hi = 0;
  list.forEach((o, i) => {
    for (let k = 0; k < K; k++) {
      const a = k * 1.9 + i, r = 0.08 + (k % 3) * 0.08;
      const h = 0.5 + ((k * 7 + i * 3) % 5) * 0.12;
      q.setFromEuler(e.set(Math.sin(a) * 0.12, 0, Math.cos(a) * 0.12));
      stems.setMatrixAt(i * K + k, m4.compose(p.set(o.x + Math.cos(a) * r, h / 2, o.y + Math.sin(a) * r * 0.8), q, s.set(0.045, h, 0.045)));
      stems.setColorAt(i * K + k, c.set(k % 2 ? 0x6f9a4c : 0x8aa85a));
      if (k < 2) heads.setMatrixAt(hi++, m4.compose(p.set(o.x + Math.cos(a) * r, h * 0.92, o.y + Math.sin(a) * r * 0.8), q, s.set(0.08, 0.18, 0.08)));
    }
  });
  heads.count = hi;
  for (const im of [stems, heads]) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); g.add(im); }
  return g;
}

export function buildLilypads(r3d, list) {
  const g = new THREE.Group();
  if (!list.length) return g;
  const pad = new THREE.CylinderGeometry(1, 1, 1, 9, 1);
  const pads = new THREE.InstancedMesh(pad, toon(r3d, { color: 0x5f9a4c, key: 'lilypad' }), list.length);
  const flowers = list.filter((o) => o.flower);
  const fl = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), toon(r3d, { color: 0xf7b8d0, emissive: 0x6a3040, emissiveIntensity: 0.2, key: 'lotus' }), Math.max(1, flowers.length));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  list.forEach((o, i) => {
    const r = 0.2 + hash2(Math.floor(o.x * 10), Math.floor(o.y * 10), 71) * 0.14;
    pads.setMatrixAt(i, m4.compose(p.set(o.x, 0.02, o.y), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), i), s.set(r, 0.02, r * 0.85)));
  });
  flowers.forEach((o, i) => fl.setMatrixAt(i, m4.compose(p.set(o.x + 0.05, 0.1, o.y), q.identity(), s.set(0.08, 0.07, 0.08))));
  fl.count = flowers.length;
  for (const im of [pads, fl]) { im.instanceMatrix.needsUpdate = true; im.receiveShadow = true; im.computeBoundingSphere(); g.add(im); }
  return g;
}

export function buildWheat(r3d, fields) {
  const g = new THREE.Group();
  const stalks = [];
  for (const f of fields) {
    for (let z = f.y + 0.3; z < f.y + f.h - 0.2; z += 0.5) for (let x = f.x + 0.25; x < f.x + f.w - 0.1; x += 0.34) {
      const j = hash2(Math.floor(x * 10), Math.floor(z * 10), 3);
      stalks.push([x + (j - 0.5) * 0.1, z, 0.42 + j * 0.16]);
    }
  }
  const st = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon(r3d, { color: 0xc9a44e, key: 'wheatstalk' }), stalks.length);
  const hd = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon(r3d, { color: 0xf0cf6a, key: 'wheathead' }), stalks.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  stalks.forEach(([x, z, h], i) => {
    st.setMatrixAt(i, m4.compose(p.set(x, h / 2, z), q.identity(), s.set(0.05, h, 0.05)));
    hd.setMatrixAt(i, m4.compose(p.set(x, h + 0.06, z), q.identity(), s.set(0.09, 0.16, 0.09)));
  });
  for (const im of [st, hd]) { im.instanceMatrix.needsUpdate = true; im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); g.add(im); }
  return g;
}

// ---------------------------------------------------------------------------
// Pier (from ground plank tiles) & the east bridge
// ---------------------------------------------------------------------------
export function buildPier(r3d, rects) {
  const m = mats(r3d);
  const g = new THREE.Group();
  const H = 0.22;
  for (const [x, y, w, h] of rects) {
    const top = toon(r3d, { map: pixelTexture(paintPlanks(w * 16, h * 16, { dir: 'h', seed: x * 7 + y })) });
    const side = toon(r3d, { color: 0x5a3b2a, key: 'pierside' });
    const deck = mesh(B(w, 0.12, h), [side, side, top, side, side, side], x + w / 2, H - 0.06, y + h / 2);
    g.add(deck);
    // posts along both long edges
    const posts = [];
    if (h > w) { for (let z = y + 0.5; z < y + h; z += 2) posts.push([x + 0.05, z], [x + w - 0.05, z]); }
    else { for (let xx = x + 0.3; xx < x + w; xx += 2) posts.push([xx, y + 0.05], [xx, y + h - 0.05]); }
    for (const [px, pz] of posts) {
      const p = mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.8, 6), m.darkWood, px, -0.2, pz);
      g.add(p);
      g.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 6), m.wood, px, 0.21, pz));
    }
  }
  g.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  return g;
}

export function buildBridge(r3d, x0, z0, len, broken) {
  const m = mats(r3d);
  const g = new THREE.Group();
  const width = 2;
  const deckTex = pixelTexture(paintPlanks(len * 16, width * 16, { dir: 'v', seed: 77, color: '#a8744a' }));
  const top = toon(r3d, { map: deckTex, alphaTest: 0.5 });
  const side = toon(r3d, { color: 0x5a3b2a, key: 'bridgeside' });
  if (!broken) {
    g.add(mesh(B(len, 0.14, width), [side, side, top, side, side, side], x0 + len / 2, 0.2, z0 + width / 2));
    for (let x = x0; x <= x0 + len + 0.01; x += len / 3) {
      for (const z of [z0 + 0.05, z0 + width - 0.05]) {
        g.add(mesh(B(0.12, 0.62, 0.12), m.darkWood, x, 0.5, z));
      }
    }
    for (const z of [z0 + 0.05, z0 + width - 0.05]) g.add(mesh(B(len, 0.08, 0.08), m.wood, x0 + len / 2, 0.78, z));
    // arch supports
    for (const x of [x0 + 1, x0 + len - 1]) g.add(mesh(B(0.2, 0.9, 0.2), m.darkWood, x, -0.2, z0 + width / 2));
  } else {
    // broken: stubs at each bank + a couple of loose planks
    const stub = 1.2;
    for (const [sx, sl] of [[x0, stub], [x0 + len - stub + 0.2, stub - 0.2]]) {
      const p = paintPlanks(Math.round(sl * 16), width * 16, { dir: 'v', seed: 78, color: '#9a6a44' });
      const t = toon(r3d, { map: pixelTexture(p) });
      g.add(mesh(B(sl, 0.14, width), [side, side, t, side, side, side], sx + sl / 2, 0.2, z0 + width / 2));
      g.add(mesh(B(0.12, 0.62, 0.12), m.darkWood, sx + (sx === x0 ? 0.1 : sl - 0.1), 0.5, z0 + 0.05));
      g.add(mesh(B(0.12, 0.4, 0.12), m.darkWood, sx + (sx === x0 ? 0.1 : sl - 0.1), 0.4, z0 + width - 0.05));
    }
    const loose = [[x0 + len * 0.45, 0.06, z0 + 0.6, 0.6], [x0 + len * 0.6, 0.04, z0 + 1.5, -0.4]];
    for (const [x, y, z, r] of loose) {
      const pl = mesh(B(0.26, 0.06, 1.3), m.wood, x, y, z);
      pl.rotation.y = r;
      g.add(pl);
    }
    const rope = mesh(B(len * 0.6, 0.03, 0.03), m.rope, x0 + len / 2, 0.45, z0 + 0.05);
    rope.rotation.z = 0.05;
    g.add(rope);
  }
  g.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  return g;
}

export { drawIcon };
