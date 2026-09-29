// Meshes for one chunk's scatter: every piece of every kind goes into one
// InstancedMesh per (geometry, material), so a whole chunk of forest costs a
// handful of draw calls. Geometries & materials are shared by all chunks.

import { THREE, pixelTexture, toon } from '../../render/r3d.js';
import { seeThrough } from '../../render/seethrough.js';
import { windy } from '../../render/wind.js';
import { Painter } from '../../art/surfaces.js';
import { ramp } from '../../engine/color.js';
import { rng, hash2 } from '../../engine/util.js';
import { broadleaf, palm, leafTexture as tuftTexture, palmTexture } from '../../models/treekit.js';

let R3D = null;
const GEO = {}, MAT = {};
function geos() {
  if (GEO.blob) return GEO;
  GEO.blob = new THREE.IcosahedronGeometry(1, 2);
  GEO.blob1 = new THREE.IcosahedronGeometry(1, 1);
  GEO.trunk = new THREE.CylinderGeometry(0.5, 0.62, 1, 6).translate(0, 0.5, 0);
  GEO.cone = new THREE.ConeGeometry(1, 1, 7);
  GEO.box = new THREE.BoxGeometry(1, 1, 1);
  GEO.cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 8).translate(0, 0.5, 0);
  GEO.hex = new THREE.CylinderGeometry(0.5, 0.55, 1, 6).translate(0, 0.5, 0);
  GEO.cap = new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  GEO.rock = new THREE.IcosahedronGeometry(1, 0);
  GEO.oct = new THREE.OctahedronGeometry(1, 0);
  return GEO;
}

function leafTexture(color, seed) {
  const R = ramp(color);
  const p = new Painter(32, 32);
  p.rect(0, 0, 32, 32, R.m);
  const r = rng(seed);
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(r() * 32), y = Math.floor(r() * 32), v = r();
    if (v < 0.45) { p.px(x, y, R.d); p.px(x + 1, y, R.d); } else if (v < 0.8) p.px(x, y, R.l); else { p.px(x, y, R.h); p.px(x, y + 1, R.l); }
  }
  const tx = pixelTexture(p.c, { repeat: true });
  tx.repeat.set(4, 2);
  return tx;
}
function barkTexture(color) {
  const R = ramp(color);
  const p = new Painter(8, 16);
  p.rect(0, 0, 8, 16, R.m);
  for (let x = 0; x < 8; x += 3) p.vline(x, 0, 16, R.d);
  p.vline(1, 0, 16, R.l);
  for (let i = 0; i < 6; i++) p.px((i * 5) % 8, (i * 7) % 16, R.o);
  const tx = pixelTexture(p.c, { repeat: true });
  tx.repeat.set(2, 1);
  return tx;
}
const mat = (key, make) => MAT[key] || (MAT[key] = make());
// (leaves thin out in front of whoever stands behind them, in party mode)
// (and sway in the wind: stiff pines, supple bamboo)
const LEAF_WIND = { pine: 0.75, snowpine: 0.75, bush: 0.5, fern: 0.6, acacia: 0.8, mangrove: 0.7, treefern: 0.9, cycad: 0.6, bamboo: 1.1 };
const leaf = (key, color, seed) => mat('leaf-' + key, () => windy(seeThrough(toon(R3D, { map: leafTexture(color, seed), key: 'bigleaf-' + key })), { amp: LEAF_WIND[key] ?? 1 }));
const SEE_FLAT = new Set(['capw', 'palmleaf', 'snow', 'puff']);
// crowns in tufts (treekit.js), the same as the valley's trees
const crown = (key, color, seed, blossom = false) => mat('crown-' + key, () => windy(seeThrough(toon(R3D, { map: tuftTexture(color, seed, { blossom }), key: 'bigcrown-' + key }))));
const bark = (key, color) => mat('bark-' + key, () => toon(R3D, { map: barkTexture(color), key: 'bigbark-' + key }));
// (grass & reeds bend from their foot, a reed's head rides its tip, snow sits on a pine's tier)
const FLAT_WIND = { reed: { weight: 'blade' }, reedtip: { weight: 'top' }, tallgrass: { weight: 'blade', amp: 1.2 }, snow: { weight: '0.8', amp: 0.75 } };
const flat = (key, color, extra = {}) => mat('flat-' + key, () => { let m = toon(R3D, { color, key: 'bigflat-' + key, ...extra }); if (SEE_FLAT.has(key)) m = seeThrough(m); return FLAT_WIND[key] ? windy(m, FLAT_WIND[key]) : m; });

// a bush's layout
const BLOBS = {
  bush: [[0, 0.34, 0, 0.42], [-0.3, 0.26, 0.1, 0.3], [0.32, 0.27, 0.06, 0.32], [0.05, 0.52, -0.05, 0.28]],
};
const MAPLES = ['#d9543c', '#e8883a', '#eab83a'];
const REDS = ['#c23a2c', '#e0602c', '#eea636', '#a8322a'];          // Emberleaf Wood
const PRISMS = [0xff9ad6, 0x9adcff, 0xfff09a, 0xb4ffc4, 0xc8a8ff];
const SHROOM_CAPS = [0xc85aa8, 0x8a5ad8, 0x4ac0c8, 0xe8705a, 0xf0a0d0];

const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3(), eu = new THREE.Euler(), col = new THREE.Color();
const Y = new THREE.Vector3(0, 1, 0);

export function buildChunkObjects(r3d, objs) {
  R3D = r3d;
  const G = geos();
  const buckets = new Map();
  const put = (key, geo, material, x, y, z, sx, sy, sz, ry = 0, color = null, rx = 0, rz = 0) => {
    let b = buckets.get(key);
    if (!b) buckets.set(key, (b = { geo, material, m: [], c: [] }));
    eu.set(rx, ry, rz);
    q.setFromEuler(eu);
    b.m.push(m4.compose(pv.set(x, y, z), q, sv.set(sx, sy, sz)).clone());
    b.c.push(color);
  };
  for (const o of objs) {
    const s = o.s || 1, h = o.v || 0, x = o.x, z = o.y - 0.15, rot = h * Math.PI * 2;
    switch (o.type) {
      case 'oak': case 'maple': case 'cherry': case 'redmaple': {
        const sp = o.type === 'maple' || o.type === 'redmaple' ? 'maple' : o.type;
        const v = o.type === 'maple' ? Math.floor(h * 3) : o.type === 'redmaple' ? Math.floor(h * 4) : '';
        const lm = o.type === 'maple' ? crown('maple' + v, MAPLES[v], 61 + v) : o.type === 'redmaple' ? crown('red' + v, REDS[v], 151 + v) : o.type === 'cherry' ? crown('cherry', '#f2a3bf', 42, true) : crown('oak', '#5aa452', 21);
        const sc = o.forest ? 0.92 + h * 0.3 : 1 + h * 0.12;
        const tint = 0.92 + hash2(Math.floor(x * 3), Math.floor(z * 3), 6) * 0.14, bk = bark('oak', '#7a5238');
        broadleaf(sp, x, z, h + x * 0.013 + z * 0.007, sc, (part, px, py, pz, sx, sy, sz, ry, rx, rz, tn) => {
          if (part === 'tuft') put('blob-' + o.type + v, G.blob1, lm, px, py, pz, sx, sy, sz, ry, col.setRGB(tn[0] * tint, tn[1] * tint, tn[2] * tint).clone(), rx, rz);
          else put('trunk-' + o.type, G.trunk, bk, px, py, pz, sx, sy, sz, ry, null, rx, rz);
        });
        break;
      }
      case 'pine': case 'snowpine': {
        const sc = 0.9 + h * 0.35;
        const lm = o.type === 'snowpine' ? leaf('snowpine', '#2f6a55', 79) : leaf('pine', '#3f7f55', 77);
        put('trunk-pine', G.trunk, bark('pine', '#6b4330'), x, 0, z, 0.22 * sc, 0.8 * sc, 0.22 * sc);
        [[0.62, 1.05, 0.95], [1.2, 0.95, 0.76], [1.72, 0.85, 0.52], [2.12, 0.6, 0.3]].forEach(([y, hh, r], i) => {
          put('cone-' + o.type, G.cone, lm, x, (y + hh / 2) * sc, z, r * sc, hh * sc, r * sc, h * 3 + i * 0.7);
          if (o.type === 'snowpine') put('snowcap', G.cone, flat('snow', 0xf1f5fc), x, (y + hh * 0.72) * sc, z, r * 0.66 * sc, hh * 0.5 * sc, r * 0.66 * sc, h * 3 + i * 0.7);
        });
        break;
      }
      case 'palm': {
        const fm = mat('palm-frond', () => windy(seeThrough(toon(R3D, { map: palmTexture(), alphaTest: 0.5, key: 'bigpalm-frond' })), { amp: 1.3 }));
        palm(x, z + 0.05, h + x * 0.011, (part, px, py, pz, sx, sy, sz, ry, rx, rz, tn) => {
          if (part === 'frond') put('palm-frond', G.box, fm, px, py, pz, sx, sy, sz, ry, col.setRGB(tn[0], tn[1], tn[2]).clone(), rx, rz);
          else if (part === 'coco') put('coco', G.blob1, flat('coco', 0x6b4a2c), px, py, pz, sx, sy, sz);
          else put(part === 'pring' ? 'palm-ring' : 'palm-trunk', G.cyl, flat(part === 'pring' ? 'palmring' : 'palmtrunk', part === 'pring' ? 0x7a5a3a : 0xa8845a), px, py, pz, sx, sy, sz, ry, null, rx, rz);
        });
        break;
      }
      case 'bush': case 'fern': {
        const lm = o.type === 'fern' ? leaf('fern', '#4f8a3c', 23) : leaf('bush', '#4f9a4c', 21);
        const k = o.type === 'fern' ? 0.7 : 0.95 + h * 0.2;
        for (const [dx, dy, dz, r] of BLOBS.bush) put('blob-' + o.type, G.blob1, lm, x + dx * k, dy * k, z + dz * k + 0.15, r * k, r * k * (o.type === 'fern' ? 0.7 : 1), r * k);
        break;
      }
      case 'rock': case 'boulder': {
        const k = o.type === 'boulder' ? 2.2 : 1;
        const c = o.hot ? 0x5a4a52 : 0x9a95a0;
        put('rock' + (o.hot ? '-hot' : ''), G.rock, flat('rock' + (o.hot ? 'hot' : ''), c), x, 0.12 * k, z + 0.15, (0.42 + h * 0.15) * k, (0.3 + h * 0.1) * k, (0.36 + h * 0.1) * k, h * 5, null, h * 2, h);
        break;
      }
      case 'cactus': {
        const g = flat('cactus', 0x4f9a5a), sc = 0.8 + h * 0.5;
        put('cactus', G.cyl, g, x, 0, z, 0.3 * sc, 1.5 * sc, 0.3 * sc);
        put('cactus', G.cyl, g, x + 0.2 * sc, 0.55 * sc, z, 0.18 * sc, 0.5 * sc, 0.18 * sc, 0, null, 0, -1.2);
        put('cactus', G.cyl, g, x + 0.36 * sc, 0.62 * sc, z, 0.17 * sc, 0.5 * sc, 0.17 * sc);
        if (h > 0.5) { put('cactus', G.cyl, g, x - 0.2 * sc, 0.8 * sc, z, 0.16 * sc, 0.4 * sc, 0.16 * sc, 0, null, 0, 1.2); put('cactus', G.cyl, g, x - 0.34 * sc, 0.86 * sc, z, 0.15 * sc, 0.4 * sc, 0.15 * sc); }
        if (h > 0.8) put('cactus-flower', G.box, flat('cflower', 0xf28ab0), x, 1.5 * sc, z, 0.14, 0.1, 0.14);
        break;
      }
      case 'bigshroom': {
        const sc = 1.1 + h * 0.9;
        put('shroom-stem', G.cyl, flat('stem', 0xf0e4d0), x, 0, z, 0.36 * sc, 1.5 * sc, 0.36 * sc, 0, null, (h - 0.5) * 0.15, (h - 0.5) * 0.15);
        const c = SHROOM_CAPS[Math.floor(h * SHROOM_CAPS.length)];
        put('shroom-cap', G.cap, flat('capw', 0xffffff), x, 1.45 * sc, z, 1.05 * sc, 0.62 * sc, 1.05 * sc, 0, col.setHex(c).clone());
        put('shroom-gills', G.cyl, flat('gills', 0xe8d8c8), x, 1.42 * sc, z, 2.0 * sc, 0.05, 2.0 * sc);
        for (let i = 0; i < 5; i++) { const a = i * 1.26 + h; put('shroom-spot', G.box, flat('spot', 0xfff8ec), x + Math.cos(a) * 0.62 * sc, 1.45 * sc + 0.36 * sc, z + Math.sin(a) * 0.62 * sc, 0.2 * sc, 0.06, 0.2 * sc, a); }
        break;
      }
      case 'shrooms': {
        for (let i = 0; i < 3; i++) {
          const a = h * 6 + i * 2.1, r = 0.25, sx = x + Math.cos(a) * r, sz = z + Math.sin(a) * r, k = 0.5 + ((h * 7 + i) % 1) * 0.5;
          put('mini-stem', G.cyl, flat('stem', 0xf0e4d0), sx, 0, sz, 0.1 * k, 0.35 * k, 0.1 * k);
          put('mini-cap', G.cap, flat('capw', 0xffffff), sx, 0.33 * k, sz, 0.24 * k, 0.16 * k, 0.24 * k, 0, col.setHex(SHROOM_CAPS[(Math.floor(h * 5) + i) % 5]).clone());
        }
        break;
      }
      case 'crystal': {
        const c = [0x8ff0e8, 0xf7a4e0, 0xb9a2e3][Math.floor(h * 3)];
        for (let i = 0; i < 3; i++) put('crystal', G.oct, flat('crystal', 0xffffff, { emissive: 0x4a4a7a, emissiveIntensity: 0.6 }), x + (i - 1) * 0.18, 0.3 + (i % 2) * 0.1, z, 0.14, 0.4 + (i % 2) * 0.15, 0.14, i, col.setHex(c).clone(), (i - 1) * 0.3, 0);
        break;
      }
      case 'deadtree': {
        const g = flat('deadwood', 0x6a5a52), sc = 0.9 + h * 0.4;
        put('dead', G.trunk, g, x, 0, z, 0.2 * sc, 1.6 * sc, 0.2 * sc, rot);
        for (let i = 0; i < 3; i++) { const a = rot + i * 2.1; put('dead', G.box, g, x + Math.cos(a) * 0.25 * sc, (0.9 + i * 0.25) * sc, z + Math.sin(a) * 0.25 * sc, 0.6 * sc, 0.07, 0.07, -a, null, 0, 0.6); }
        break;
      }
      case 'acacia': {
        const sc = 1 + h * 0.3;
        put('trunk-acacia', G.trunk, bark('acacia', '#6b4a34'), x, 0, z, 0.18 * sc, 1.9 * sc, 0.18 * sc, rot, null, 0, 0.1);
        const lm = leaf('acacia', '#7a9a4a', 91);
        put('acacia-top', G.blob, lm, x + 0.2 * sc, 2.0 * sc, z, 1.5 * sc, 0.34 * sc, 1.2 * sc);
        put('acacia-top', G.blob, lm, x - 0.5 * sc, 1.8 * sc, z + 0.2, 0.9 * sc, 0.26 * sc, 0.8 * sc);
        break;
      }
      case 'willow': {
        const sc = 1 + h * 0.3;
        put('trunk-willow', G.trunk, bark('willow', '#5e4a36'), x, 0, z, 0.36 * sc, 1.3 * sc, 0.36 * sc, rot);
        const lm = leaf('willow', '#6a9a4a', 95);
        put('willow-top', G.blob, lm, x, 2.0 * sc, z, 1.25 * sc, 0.9 * sc, 1.2 * sc);
        for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2 + h; put('willow-strand', G.box, lm, x + Math.cos(a) * 1.05 * sc, 1.25 * sc, z + Math.sin(a) * 0.95 * sc, 0.14, 1.2 * sc, 0.14, a); }
        break;
      }
      case 'mangrove': {
        const g = bark('mangrove', '#5a4636');
        for (let i = 0; i < 4; i++) { const a = h * 6 + i * 1.57; put('mangrove-root', G.box, g, x + Math.cos(a) * 0.3, 0.3, z + Math.sin(a) * 0.3, 0.08, 0.7, 0.08, 0, null, Math.sin(a) * 0.5, -Math.cos(a) * 0.5); }
        put('mangrove-trunk', G.trunk, g, x, 0.5, z, 0.16, 0.9, 0.16);
        put('mangrove-top', G.blob, leaf('mangrove', '#4a7a3c', 97), x, 1.7, z, 0.9, 0.55, 0.9);
        break;
      }
      case 'reeds': {
        const g = flat('reed', 0x7a9a4a), tip = flat('reedtip', 0x6a4a2a);
        for (let i = 0; i < 5; i++) {
          const a = h * 9 + i * 1.3, r = 0.12 + (i % 3) * 0.08, hh = 0.5 + ((h * 13 + i) % 1) * 0.4;
          put('reed', G.box, g, x + Math.cos(a) * r, hh / 2, z + Math.sin(a) * r, 0.04, hh, 0.04, 0, null, Math.sin(a) * 0.12, Math.cos(a) * 0.12);
          if (i % 2 === 0) put('reedtip', G.box, tip, x + Math.cos(a) * r, hh + 0.05, z + Math.sin(a) * r, 0.07, 0.16, 0.07);
        }
        break;
      }
      case 'tallgrass': {
        const g = flat('tallgrass', 0xc8b058);
        for (let i = 0; i < 4; i++) { const a = h * 7 + i * 1.6; put('tallgrass', G.box, g, x + Math.cos(a) * 0.16, 0.22, z + Math.sin(a) * 0.16, 0.05, 0.44, 0.05, 0, null, Math.sin(a) * 0.3, Math.cos(a) * 0.3); }
        break;
      }
      case 'icespike': {
        const sc = 0.8 + h * 0.8;
        put('icespike', G.oct, flat('ice', 0xcfe6f7, { emissive: 0x2a4a7a, emissiveIntensity: 0.25 }), x, 0.7 * sc, z, 0.3 * sc, 0.9 * sc, 0.3 * sc, rot, null, 0.1, 0);
        put('icespike', G.oct, flat('ice', 0xcfe6f7, { emissive: 0x2a4a7a, emissiveIntensity: 0.25 }), x + 0.3, 0.35 * sc, z + 0.1, 0.18 * sc, 0.45 * sc, 0.18 * sc, rot + 1, null, 0, 0.3);
        break;
      }
      case 'spire': {
        const sc = 0.8 + h * 1.2;
        put('spire', G.hex, flat('basalt', 0x3a3240), x, 0, z, 0.7, 1.1 * sc, 0.7, rot);
        put('spire', G.hex, flat('basalt', 0x3a3240), x + 0.45, 0, z + 0.2, 0.5, 0.6 * sc, 0.5, rot + 0.4);
        break;
      }
      case 'puff': {
        const g = flat('puff', 0xffffff);
        for (let i = 0; i < 3; i++) put('puff', G.blob1, g, x + (i - 1) * 0.35, 0.25 + (i % 2) * 0.1, z, 0.35 + (i % 2) * 0.1, 0.25, 0.3);
        break;
      }
      case 'column': {
        const g = flat('stone', 0xc8c0b0), broken = h < 0.55, hh = broken ? 0.6 + h * 1.4 : 2.4;
        put('col-base', G.box, g, x, 0.1, z, 0.75, 0.2, 0.75);
        put('col-shaft', G.hex, g, x, 0.2, z, 0.55, hh, 0.55, rot);
        if (!broken) put('col-top', G.box, g, x, 0.2 + hh + 0.1, z, 0.8, 0.2, 0.8);
        break;
      }
      case 'rubble': {
        const g = flat('stone2', 0xb0a898);
        for (let i = 0; i < 3; i++) { const a = h * 5 + i * 2; put('rubble', G.box, g, x + Math.cos(a) * 0.3, 0.12, z + Math.sin(a) * 0.3, 0.4, 0.24, 0.3, a, null, 0, (i - 1) * 0.2); }
        break;
      }
      // ---- Dino Isle
      case 'treefern': {
        // a shaggy trunk under a crown of arching fronds (two segments each), a fiddlehead on top
        const sc = 0.85 + h * 0.4, top = 2.2 * sc, lm = leaf('treefern', '#4f9a3c', 131);
        put('tf-trunk', G.cyl, bark('treefern', '#5a4030'), x, 0, z, 0.26 * sc, top, 0.26 * sc, rot);
        put('tf-base', G.cyl, bark('treefern', '#5a4030'), x, 0, z, 0.4 * sc, 0.35, 0.4 * sc, rot);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + h * 3, c = Math.cos(a), sn = Math.sin(a);
          put('tf-frond', G.box, lm, x + c * 0.42 * sc, top + 0.05, z + sn * 0.42 * sc, 0.84 * sc, 0.05, 0.3 * sc, -a, null, 0, 0.12);
          put('tf-frond', G.box, lm, x + c * 1.08 * sc, top - 0.2 * sc, z + sn * 1.08 * sc, 0.62 * sc, 0.05, 0.24 * sc, -a, null, 0, -0.72);
        }
        put('tf-curl', G.blob1, flat('fiddle', 0x8acc5a), x, top + 0.14, z, 0.14, 0.16, 0.14);
        break;
      }
      case 'cycad': {
        const sc = 0.8 + h * 0.4, lm = leaf('cycad', '#3f7f3a', 133);
        put('cy-trunk', G.cyl, bark('cycad', '#8a7340'), x, 0, z, 0.52 * sc, 0.72 * sc, 0.52 * sc, rot);
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2 + h * 5, c = Math.cos(a), sn = Math.sin(a), up = i % 2 ? 0.55 : 0.28;
          put('cy-frond', G.box, lm, x + c * 0.45 * sc, 0.78 * sc + up * 0.4, z + sn * 0.45 * sc, 0.95 * sc, 0.05, 0.22 * sc, -a, null, 0, up);
        }
        put('cy-cone', G.cone, flat('cycone', 0xd98a3a), x, 0.95 * sc, z, 0.16 * sc, 0.34 * sc, 0.16 * sc, rot);
        break;
      }
      case 'bigleaf': {
        // elephant ears: big leaves on stems, fanned out
        const sc = 0.8 + h * 0.45, g = flat('bigleaf', 0x5aa845), v = flat('bigleafv', 0x3f8a36);
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + h * 4, c = Math.cos(a), sn = Math.sin(a), hh = (0.55 + (i % 2) * 0.25) * sc;
          put('bl-stem', G.cyl, v, x + c * 0.14, 0, z + sn * 0.14, 0.05, hh, 0.05, 0, null, sn * 0.35, -c * 0.35);
          put('bl-leaf', G.blob1, i % 2 ? g : v, x + c * 0.48 * sc, hh + 0.02, z + sn * 0.48 * sc, 0.5 * sc, 0.05, 0.32 * sc, -a, null, 0, -0.35);
        }
        break;
      }
      case 'horsetail': {
        // a clump of giant horsetails: jointed stems with dark rings
        const g = flat('horsetail', 0x7aa84a), ring = flat('htring', 0x3f5a2a);
        for (let i = 0; i < 5; i++) {
          const a = h * 7 + i * 1.3, r = 0.1 + (i % 3) * 0.1, hh = 0.9 + ((h * 11 + i * 0.37) % 1) * 0.9, sx = x + Math.cos(a) * r, sz = z + Math.sin(a) * r;
          put('ht-stem', G.cyl, g, sx, 0, sz, 0.12, hh, 0.12);
          for (let y = 0.3; y < hh - 0.1; y += 0.32) put('ht-ring', G.cyl, ring, sx, y, sz, 0.15, 0.04, 0.15);
          put('ht-tip', G.cone, ring, sx, hh + 0.08, sz, 0.08, 0.18, 0.08);
        }
        break;
      }
      // ---- World v7: the Dawnlands
      case 'bamboo': {
        // a clump of tall jointed canes, leaf sprays up top
        const sc = 0.85 + h * 0.4, cane = flat('bamboo', 0x86b04e), node = flat('bamboonode', 0x557a34), lm = leaf('bamboo', '#78ac4a', 141);
        for (let i = 0; i < 6; i++) {
          const a = h * 9 + i * 1.05, r = 0.12 + (i % 3) * 0.13, hh = (2.6 + ((h * 13 + i * 0.37) % 1) * 1.8) * sc, bx = x + Math.cos(a) * r, bz = z + Math.sin(a) * r, lean = (i - 2.5) * 0.035;
          put('bb-cane', G.cyl, cane, bx, 0, bz, 0.13, hh, 0.13, 0, null, lean, -lean);
          for (let y = 0.55; y < hh - 0.2; y += 0.62) put('bb-node', G.cyl, node, bx + lean * y, y, bz + lean * y, 0.155, 0.05, 0.155);
          put('bb-leaves', G.blob1, lm, bx + lean * hh + Math.cos(a) * 0.3, hh - 0.1, bz + lean * hh + Math.sin(a) * 0.3, 0.55, 0.16, 0.3, a);
          if (i % 2) put('bb-leaves', G.blob1, lm, bx + lean * hh * 0.7 - Math.cos(a) * 0.3, hh * 0.72, bz + lean * hh * 0.7, 0.45, 0.13, 0.26, a + 1.4);
        }
        break;
      }
      case 'pumpkin': {
        const n = 1 + Math.floor(h * 3), g = flat('pumpkin', 0xe8843a), st = flat('pumpstem', 0x5a7a2a);
        for (let i = 0; i < n; i++) {
          const a = h * 7 + i * 2.2, r = i ? 0.38 : 0, k = i ? 0.7 : 1, sx = x + Math.cos(a) * r, sz = z + Math.sin(a) * r;
          put('pumpkin', G.blob, g, sx, 0.2 * k, sz, 0.34 * k, 0.24 * k, 0.32 * k, a);
          put('pumpkin-rib', G.blob, g, sx, 0.2 * k, sz, 0.22 * k, 0.26 * k, 0.36 * k, a, col.setHex(0xd06a2e).clone());
          put('pumpstem', G.cyl, st, sx, 0.42 * k, sz, 0.06, 0.12, 0.06, 0, null, 0.3, 0);
        }
        break;
      }
      case 'elderoak': {
        // an old giant: a thick flared trunk, roots gripping the moss, a wide dark crown
        const sc = (1.05 + h * 0.45) * (o.big || 1), bk = bark('elder', '#5e4a38'), lm = leaf('elder', '#3f7a3a', 143), moss = flat('mossy', 0x5a8a3e);
        put('eo-trunk', G.trunk, bk, x, 0, z, 0.62 * sc, 2.4 * sc, 0.62 * sc, rot);
        for (let i = 0; i < 5; i++) { const a = rot + i * 1.26; put('eo-root', G.box, bk, x + Math.cos(a) * 0.5 * sc, 0.12, z + Math.sin(a) * 0.5 * sc, 0.8 * sc, 0.22, 0.22, -a, null, 0, -0.35); }
        put('eo-moss', G.blob1, moss, x - 0.15, 0.9 * sc, z + 0.3 * sc, 0.28 * sc, 0.36 * sc, 0.14, rot);
        for (const [dx, dy, dz, r] of [[0, 3.1, 0, 1.35], [-0.95, 2.7, 0.2, 1.0], [1.0, 2.75, 0.1, 1.05], [0.1, 3.9, -0.1, 0.95], [-0.5, 3.5, 0.6, 0.8], [0.6, 3.4, -0.6, 0.85]]) {
          const c = Math.cos(rot), si = Math.sin(rot);
          put('eo-blob', G.blob, lm, x + (dx * c - dz * si) * sc, dy * sc, z + (dx * si + dz * c) * sc, r * sc, r * sc * 0.85, r * sc);
        }
        break;
      }
      case 'mossrock': {
        put('rock', G.rock, flat('rock', 0x9a95a0), x, 0.2, z + 0.15, 0.6 + h * 0.2, 0.42, 0.5, h * 5, col.setHex(0x8a8a86).clone(), h * 2, h);
        put('mosscap', G.blob1, flat('mossy', 0x5a8a3e), x, 0.44, z + 0.12, 0.5 + h * 0.15, 0.14, 0.42, h * 5);
        break;
      }
      case 'glowshroom': {
        for (let i = 0; i < 4; i++) {
          const a = h * 6 + i * 1.7, r = 0.1 + (i % 2) * 0.18, sx = x + Math.cos(a) * r, sz = z + Math.sin(a) * r, k = 0.4 + ((h * 7 + i * 0.3) % 1) * 0.5;
          put('gs-stem', G.cyl, flat('gsstem', 0xe8f4f0), sx, 0, sz, 0.08 * k, 0.4 * k, 0.08 * k);
          put('gs-cap', G.cap, flat('glowcap', 0x6ae8d8, { emissive: 0x2ad0c0, emissiveIntensity: 0.25 }), sx, 0.38 * k, sz, 0.22 * k, 0.14 * k, 0.22 * k);
        }
        break;
      }
      case 'crookedtree': {
        // a twisted moor tree, leaning away from the wind, a few dark leaves
        const g = bark('crooked', '#4a3a3e'), sc = 0.9 + h * 0.5, lean = (h - 0.5) * 0.8;
        put('ct-trunk', G.trunk, g, x, 0, z, 0.2 * sc, 1.0 * sc, 0.2 * sc, rot, null, 0, lean * 0.4);
        put('ct-trunk', G.trunk, g, x - lean * 0.45 * sc, 0.95 * sc, z, 0.15 * sc, 0.9 * sc, 0.15 * sc, rot, null, 0, -lean * 0.8);
        for (let i = 0; i < 4; i++) { const a = rot + i * 1.7; put('ct-branch', G.box, g, x - lean * 0.2 + Math.cos(a) * 0.35 * sc, (1.4 + i * 0.18) * sc, z + Math.sin(a) * 0.35 * sc, 0.75 * sc, 0.06, 0.06, -a, null, 0, 0.5 + i * 0.1); }
        put('ct-leaves', G.blob1, leaf('crooked', '#4a5a3e', 145), x - lean * 0.6 * sc, 1.85 * sc, z, 0.6 * sc, 0.35 * sc, 0.5 * sc);
        break;
      }
      case 'menhir': {
        const sc = 0.9 + h * 0.6;
        put('menhir', G.box, flat('menhir', 0x8e8894), x, 0.85 * sc, z, 0.55, 1.7 * sc, 0.34, rot * 0.3, null, (h - 0.5) * 0.14, (h - 0.5) * 0.1);
        put('menhir-lichen', G.box, flat('menlichen', 0xc8a860), x + 0.12, 0.5 * sc, z + 0.17, 0.2, 0.18, 0.02, rot * 0.3);
        break;
      }
      case 'gorse': {
        const lm = leaf('gorse', '#3e5a34', 147), k = 0.8 + h * 0.3;
        for (const [dx, dy, dz, r] of BLOBS.bush) put('blob-gorse', G.blob1, lm, x + dx * k, dy * k, z + dz * k + 0.15, r * k, r * k * 0.9, r * k);
        for (let i = 0; i < 6; i++) { const a = h * 11 + i * 1.1; put('gorse-flower', G.box, flat('gorseflower', 0xf2d04a), x + Math.cos(a) * 0.36 * k, (0.3 + (i % 3) * 0.12) * k, z + 0.15 + Math.sin(a) * 0.3 * k, 0.07, 0.07, 0.07); }
        break;
      }
      case 'prismspire': {
        // a cluster of tall hexagonal crystals, each its own colour of the rainbow
        for (let i = 0; i < 5; i++) {
          const a = h * 8 + i * 1.3, r = i ? 0.28 : 0, hh = (i ? 0.8 + ((h * 5 + i * 0.4) % 1) * 0.9 : 2.1 + h * 0.9), c = PRISMS[(Math.floor(h * 5) + i) % 5];
          const tilt = i ? 0.35 : 0.05;
          put('ps-body', G.hex, flat('prism', 0xffffff, { emissive: 0x6a5aa8, emissiveIntensity: 0.35 }), x + Math.cos(a) * r, 0, z + Math.sin(a) * r, 0.34 - (i ? 0.1 : 0), hh, 0.34 - (i ? 0.1 : 0), a, col.setHex(c).clone(), Math.sin(a) * tilt, -Math.cos(a) * tilt);
          put('ps-tip', G.cone, flat('prism', 0xffffff, { emissive: 0x6a5aa8, emissiveIntensity: 0.35 }), x + Math.cos(a) * (r + Math.sin(tilt) * hh * 0.9), hh + 0.12, z + Math.sin(a) * (r + Math.sin(tilt) * hh * 0.9), 0.3 - (i ? 0.09 : 0), 0.34, 0.3 - (i ? 0.09 : 0), a, col.setHex(c).clone(), Math.sin(a) * tilt, -Math.cos(a) * tilt);
        }
        break;
      }
      case 'saltheap': {
        const g = flat('saltheap', 0xf4eef2);
        put('saltheap', G.cone, g, x, 0.35, z, 0.6 + h * 0.2, 0.7, 0.6 + h * 0.2, rot);
        if (h > 0.4) put('saltheap', G.cone, g, x + 0.6, 0.22, z + 0.2, 0.38, 0.44, 0.38, rot + 1);
        break;
      }
      case 'cog': {
        // a great brass cogwheel half sunk in the ground, rusting at the rim
        const br = flat('brass', 0xb08c42), dk = flat('brassdk', 0x6a5428), r = 0.7 + h * 0.4, a0 = h * 3;
        put('cog-disc', G.cyl, br, x, r * 0.62, z, r * 1.6, 0.18, r * 1.6, 0, null, Math.PI / 2 - 0.25, 0);
        put('cog-hub', G.cyl, dk, x, r * 0.62, z + 0.12, 0.34, 0.24, 0.34, 0, null, Math.PI / 2 - 0.25, 0);
        for (let i = 0; i < 10; i++) { const a = a0 + (i / 10) * Math.PI * 2, ty = r * 0.62 + Math.sin(a) * r * 0.86; if (ty < 0) continue; put('cog-tooth', G.box, br, x + Math.cos(a) * r * 0.86, ty, z - Math.sin(a) * 0.2, 0.24, 0.24, 0.2, 0, null, 0, -a); }
        break;
      }
      case 'lichenrock': {
        put('rock', G.rock, flat('rock', 0x9a95a0), x, 0.14, z + 0.15, 0.5 + h * 0.2, 0.34, 0.44, h * 5, col.setHex(0x8e9690).clone(), h * 2, h);
        put('lichen', G.blob1, flat('lichen', 0xd8a84a), x + 0.1, 0.36, z + 0.2, 0.22, 0.05, 0.18, h, col.setHex(h < 0.5 ? 0xd8a84a : 0xd6764a).clone());
        break;
      }
      case 'tundrashrub': {
        const lm = leaf('tundra', '#7a7a4a', 149);
        for (let i = 0; i < 3; i++) { const a = h * 6 + i * 2.1; put('ts-blob', G.blob1, lm, x + Math.cos(a) * 0.22, 0.12, z + Math.sin(a) * 0.2, 0.3, 0.14, 0.26); }
        break;
      }
      // (World v7 M14) Emberpeak’s slopes: vents in the ash with a sulphur crust and a
      // plume of steam, and shards of obsidian glowing faintly red at the core
      case 'fumarole': {
        put('fum-mound', G.cone, flat('ashmound', 0x4a3e46), x, 0.14, z, 0.8, 0.28, 0.8, rot);
        const sul = flat('sulphur', 0xc8b450, { emissive: 0x3a3008, emissiveIntensity: 0.2 });
        put('fum-crust', G.blob1, sul, x + 0.12, 0.24, z + 0.05, 0.32, 0.05, 0.24, rot);
        put('fum-crust', G.blob1, sul, x - 0.16, 0.22, z - 0.08, 0.22, 0.05, 0.18, rot + 1.3);
        put('fum-mouth', G.cyl, flat('ventdark', 0x1a1418), x, 0.25, z, 0.16, 0.04, 0.16);
        const steam = mat('flat-steam', () => { const m = toon(R3D, { color: 0xf4f0f4, key: 'bigflat-steam', transparent: true }); m.opacity = 0.42; m.depthWrite = false; return m; });
        for (let i = 0; i < 3; i++) put('fum-steam', G.blob1, steam, x + (i - 1) * 0.1 + h * 0.12, 0.65 + i * 0.55, z - i * 0.06, 0.22 + i * 0.1, 0.22 + i * 0.1, 0.22 + i * 0.1);
        break;
      }
      case 'obsidian': {
        const g = flat('obsidian', 0x1e1a24, { emissive: 0x6a1a10, emissiveIntensity: 0.25 }), sc = 0.7 + h * 0.9;
        put('ob-shard', G.oct, g, x, 0.7 * sc, z, 0.3 * sc, 1.0 * sc, 0.26 * sc, rot, null, (h - 0.5) * 0.4, 0.15);
        put('ob-shard', G.oct, g, x + 0.3, 0.35 * sc, z + 0.12, 0.18 * sc, 0.5 * sc, 0.16 * sc, rot + 1, null, 0.25, -0.3);
        break;
      }
      case 'umbralspire': {
        const g = flat('umbral', 0x2a1e3a, { emissive: 0x6a2ab0, emissiveIntensity: 0.3 }), sc = 0.8 + h * 1.1;
        put('us-shard', G.oct, g, x, 0.9 * sc, z, 0.34 * sc, 1.2 * sc, 0.28 * sc, rot, null, (h - 0.5) * 0.3, 0.1);
        put('us-shard', G.oct, g, x + 0.35, 0.45 * sc, z + 0.15, 0.2 * sc, 0.6 * sc, 0.18 * sc, rot + 1, null, 0.2, -0.35);
        put('us-shard', G.oct, g, x - 0.3, 0.35 * sc, z + 0.1, 0.16 * sc, 0.45 * sc, 0.14 * sc, rot + 2, null, -0.2, 0.3);
        break;
      }
      case 'floatrock': {
        // a lump of rock hanging in the air over the Scar, a violet shard glowing under it
        const y = 1.4 + h * 1.2;
        put('fr-rock', G.rock, flat('rockdark', 0x3a3244), x, y, z, 0.7 + h * 0.3, 0.45, 0.6, rot, null, h, 0.2);
        put('fr-rock', G.rock, flat('rockdark', 0x3a3244), x, y - 0.35, z, 0.4, 0.4, 0.36, rot + 1, null, 0.5, 0.5);
        put('fr-shard', G.oct, flat('umbralglow', 0xc890ff, { emissive: 0x9a50f0, emissiveIntensity: 0.8 }), x, y - 0.75, z, 0.14, 0.28, 0.14, rot);
        break;
      }
      case 'karst': {
        // a limestone tower over the paddies, streaked grey, a pine clinging to its top
        const sc = 0.9 + h * 0.5, g = flat('karst', 0xb4b0a4), top = 3.6 * sc;
        put('karst', G.rock, g, x, top * 0.35, z, 1.15 * sc, top * 0.5, 1.0 * sc, rot, col.setHex(0xa8a498).clone());
        put('karst', G.rock, g, x + 0.15, top * 0.72, z - 0.1, 0.85 * sc, top * 0.4, 0.8 * sc, rot + 1);
        put('karst-green', G.blob1, leaf('karst', '#4f8a3c', 151), x + 0.1, top * 1.02, z - 0.1, 0.8 * sc, 0.3 * sc, 0.7 * sc);
        put('karst-green', G.blob1, leaf('karst', '#4f8a3c', 151), x - 0.6 * sc, top * 0.55, z + 0.4, 0.4 * sc, 0.2 * sc, 0.3 * sc);
        put('cone-pine', G.cone, leaf('pine', '#3f7f55', 77), x + 0.3, top * 1.02 + 0.5 * sc, z - 0.2, 0.35 * sc, 0.9 * sc, 0.35 * sc);
        break;
      }
      case 'rail': {
        const ry = o.ang, c = Math.cos(ry), sn = Math.sin(ry);
        put('sleeper', G.box, flat('sleeper', 0x5a3b2a), x, 0.03, z, 1.05, 0.06, 0.2, ry);
        for (const sx of [-0.32, 0.32]) put('railbar', G.box, flat('railbar', 0x6a6571), x + sx * c, 0.09, z - sx * sn, 0.07, 0.07, 0.6, ry);
        break;
      }
      default: break;
    }
  }
  const group = new THREE.Group();
  for (const b of buckets.values()) {
    const im = new THREE.InstancedMesh(b.geo, b.material, b.m.length);
    for (let i = 0; i < b.m.length; i++) { im.setMatrixAt(i, b.m[i]); if (b.c[i]) im.setColorAt(i, b.c[i]); }
    if (im.instanceColor) {
      for (let i = 0; i < b.m.length; i++) if (!b.c[i]) im.setColorAt(i, col.setRGB(1, 1, 1));
      im.instanceColor.needsUpdate = true;
    }
    im.instanceMatrix.needsUpdate = true;
    // (tiny pieces — lichen, rail bars, pebbles — cast no shadow worth drawing)
    if (!b.geo.boundingSphere) b.geo.computeBoundingSphere();
    let big = 0;
    for (const m of b.m) { const e = m.elements; big = Math.max(big, Math.hypot(e[0], e[1], e[2]), Math.hypot(e[4], e[5], e[6]), Math.hypot(e[8], e[9], e[10])); }
    im.castShadow = b.geo.boundingSphere.radius * big >= 0.12; im.receiveShadow = true;
    im.computeBoundingSphere();
    group.add(im);
  }
  return group;
}

// glowing caps, spots & crystals light up at dusk (level 0..1)
export function setNightGlow(level) {
  const cap = MAT['flat-capw'], spot = MAT['flat-spot'], gills = MAT['flat-gills'];
  if (cap) { cap.emissive.setHex(0x9a50c8); cap.emissiveIntensity = level * 0.42; }
  if (spot) { spot.emissive.setHex(0xfff4c8); spot.emissiveIntensity = level * 1.6; }
  if (gills) { gills.emissive.setHex(0x8ff0e8); gills.emissiveIntensity = level * 1.2; }
  // (World v7) the Glowtide's mushrooms and the Prism Fields' crystals
  const gc = MAT['flat-glowcap'], pr = MAT['flat-prism'];
  if (gc) gc.emissiveIntensity = 0.25 + level * 1.3;
  if (pr) pr.emissiveIntensity = 0.35 + level * 0.6;
}

export function disposeChunkObjects(group) {
  group.traverse((o) => {
    if (o.isInstancedMesh) o.dispose();
    else if (o.isMesh) {
      // (piers: their own plank textures; shared materials have no map)
      o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) if (m.map) { m.map.dispose(); m.dispose(); }
    }
  });
}
