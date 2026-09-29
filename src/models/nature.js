// Trees, bushes and rocks — toon-shaded blob canopies with speckled leaf
// textures, instanced so the whole forest costs a handful of draw calls.

import { THREE, pixelTexture, toon } from '../render/r3d.js';
import { seeThrough } from '../render/seethrough.js';
import { windy } from '../render/wind.js';
import { paintNoise, Painter } from '../art/surfaces.js';
import { ramp } from '../engine/color.js';
import { rng, hash2 } from '../engine/util.js';
import { broadleaf, palm, leafTexture as tuftTexture, palmTexture } from './treekit.js';

// leaf & bark colours (the crowns' shapes: treekit.js)
const SPECIES = {
  oak: { leaf: '#5aa452', trunk: '#7a5238' },
  cherry: { leaf: '#f2a3bf', trunk: '#6e4a3c' },
  apple: { leaf: '#6fb85a', trunk: '#7a5238', fruit: '#e0463f' },
  maple_r: { leaf: '#d9543c', trunk: '#5e4032' },
  maple_o: { leaf: '#e8883a', trunk: '#5e4032' },
  maple_y: { leaf: '#eab83a', trunk: '#6b4a34' },
  big: { leaf: '#4f9a52', trunk: '#6b4a34' },
};

function leafTexture(color, seed) {
  const R = ramp(color);
  const p = new Painter(32, 32);
  p.rect(0, 0, 32, 32, R.m);
  const r = rng(seed);
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(r() * 32), y = Math.floor(r() * 32);
    const v = r();
    if (v < 0.45) { p.px(x, y, R.d); p.px(x + 1, y, R.d); }
    else if (v < 0.8) { p.px(x, y, R.l); }
    else { p.px(x, y, R.h); p.px(x, y + 1, R.l); }
  }
  const t = pixelTexture(p.c, { repeat: true });
  t.repeat.set(4, 2);
  return t;
}

function barkTexture(color) {
  const R = ramp(color);
  const p = new Painter(8, 16);
  p.rect(0, 0, 8, 16, R.m);
  for (let x = 0; x < 8; x += 3) p.vline(x, 0, 16, R.d);
  p.vline(1, 0, 16, R.l);
  for (let i = 0; i < 6; i++) p.px((i * 5) % 8, (i * 7) % 16, R.o);
  const t = pixelTexture(p.c, { repeat: true });
  t.repeat.set(2, 1);
  return t;
}

// objects: [{type, x, y (tiles, base point), ...}] -> THREE.Group with instanced
// meshes, split into spatial chunks so off-screen forest is frustum-culled.
const TREE_CHUNK = 24;
export function buildTrees(r3d, objects) {
  const group = new THREE.Group();
  const colliders = [];
  const buckets = new Map();
  for (const o of objects) {
    const sp = speciesOf(o);
    if (!['oak', 'cherry', 'apple', 'big', 'pine', 'palm', 'maple_r', 'maple_o', 'maple_y', 'snowpine'].includes(sp)) continue;
    const key = Math.floor(o.x / TREE_CHUNK) + ',' + Math.floor(o.y / TREE_CHUNK);
    let b = buckets.get(key);
    if (!b) { b = []; buckets.set(key, b); }
    b.push(o);
  }
  for (const list of buckets.values()) {
    const res = buildTreeChunk(r3d, list);
    group.add(res.group);
    colliders.push(...res.colliders);
  }
  return { group, colliders };
}

// maples come in three autumn colours, picked per tree
function speciesOf(o) {
  if (o.type === 'bigtree') return 'big';
  if (o.type === 'maple') return ['maple_r', 'maple_o', 'maple_y'][Math.floor(hash2(Math.floor(o.x * 7), Math.floor(o.y * 7), 61) * 3)];
  return o.type;
}

const GEO = {};
function geos() {
  if (!GEO.blob) {
    GEO.blob = new THREE.IcosahedronGeometry(1, 2);
    GEO.tuft = new THREE.IcosahedronGeometry(1, 1);
    GEO.trunk = new THREE.CylinderGeometry(0.5, 0.62, 1, 6);
    GEO.trunk.translate(0, 0.5, 0);
    GEO.cone = new THREE.ConeGeometry(1, 1, 7);
    GEO.fruit = new THREE.BoxGeometry(1, 1, 1);
  }
  return GEO;
}

function buildTreeChunk(r3d, objects) {
  const group = new THREE.Group();
  const { blob: blobGeo, trunk: trunkGeo, cone: coneGeo } = geos();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const col = new THREE.Color();
  const colliders = [];

  const bySpecies = {};
  for (const o of objects) {
    const sp = speciesOf(o);
    (bySpecies[sp] = bySpecies[sp] || []).push(o);
  }

  const addInstanced = (geo, mat, list) => {
    if (!list.length) return null;
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((it, i) => {
      im.setMatrixAt(i, it.m);
      if (it.c) im.setColorAt(i, it.c);
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = true; im.receiveShadow = true;
    im.computeBoundingSphere();
    group.add(im);
    return im;
  };

  for (const [sp, list] of Object.entries(bySpecies)) {
    if (sp === 'pine') { buildPines(r3d, group, list, coneGeo, trunkGeo, colliders); continue; }
    if (sp === 'snowpine') { buildPines(r3d, group, list, coneGeo, trunkGeo, colliders, true); continue; }
    if (sp === 'palm') { buildPalms(r3d, group, list, colliders); continue; }
    const S = SPECIES[sp];
    const leafMat = windy(seeThrough(toon(r3d, { map: tuftTexture(S.leaf, sp.length * 7, { blossom: sp === 'cherry' }), key: 'leaf-' + sp })), { amp: sp === 'big' ? 0.7 : 1 });
    const trunkMat = toon(r3d, { map: barkTexture(S.trunk), key: 'bark-' + sp });
    const tufts = [], trunks = [], fruits = [];
    const e = new THREE.Euler();
    for (const o of list) {
      const h = hash2(Math.floor(o.x * 10), Math.floor(o.y * 10), 5);
      const sc = o.forest ? 0.92 + h * 0.3 : 1.0 + h * 0.12;
      const bx = o.x, bz = o.y - 0.15;
      const tint = 0.92 + hash2(Math.floor(o.x * 3), Math.floor(o.y * 3), 6) * 0.14;
      const kind = sp === 'big' ? 'big' : sp.startsWith('maple') ? 'maple' : sp;
      broadleaf(kind, bx, bz, h + o.x * 0.013 + o.y * 0.007, sc, (part, x, y, z, sx, sy, sz, ry, rx, rz, tn) => {
        const m = m4.clone().compose(p.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), s.set(sx, sy, sz));
        if (part === 'tuft') tufts.push({ m, c: col.setRGB(tn[0] * tint, tn[1] * tint, tn[2] * tint).clone() });
        else if (part === 'fruit') fruits.push({ m });
        else trunks.push({ m });
      }, { fruit: !!S.fruit });
      colliders.push({ x: bx, z: bz + 0.1, r: sp === 'big' ? 0.6 : 0.24 });
    }
    addInstanced(trunkGeo, trunkMat, trunks);
    // (small tufts: a coarser ball looks the same at 16 pixels and costs a quarter)
    addInstanced(sp === 'big' ? blobGeo : GEO.tuft, leafMat, tufts);
    if (fruits.length) addInstanced(GEO.fruit, toon(r3d, { color: S.fruit, key: 'fruit' }), fruits);
  }
  return { group, colliders };
}

function buildPines(r3d, group, list, coneGeo, trunkGeo, colliders, snowy = false) {
  const leafMat = windy(seeThrough(snowy ? toon(r3d, { map: leafTexture('#2f6a55', 79), key: 'leaf-snowpine' }) : toon(r3d, { map: leafTexture('#3f7f55', 77), key: 'leaf-pine' })), { amp: 0.75 });
  const trunkMat = toon(r3d, { map: barkTexture('#6b4330'), key: 'bark-pine' });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const cones = [], trunks = [], caps = [];
  const tiers = [[0.62, 1.05, 0.95], [1.2, 0.95, 0.76], [1.72, 0.85, 0.52], [2.12, 0.6, 0.3]];
  for (const o of list) {
    const h = hash2(Math.floor(o.x * 10), Math.floor(o.y * 10), 15);
    const sc = 0.9 + h * 0.35;
    const bx = o.x, bz = o.y - 0.15;
    trunks.push({ m: m4.clone().compose(p.set(bx, 0, bz), q.identity(), s.set(0.22 * sc, 0.8 * sc, 0.22 * sc)) });
    const rot = h * 3;
    tiers.forEach(([y, hh, r], i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot + i * 0.7);
      cones.push({ m: m4.clone().compose(p.set(bx, (y + hh / 2) * sc, bz), q.clone(), s.set(r * sc, hh * sc, r * sc)) });
      // snow resting on each tier
      if (snowy) caps.push({ m: m4.clone().compose(p.set(bx, (y + hh * 0.72) * sc, bz), q.clone(), s.set(r * 0.66 * sc, hh * 0.5 * sc, r * 0.66 * sc)) });
    });
    colliders.push({ x: bx, z: bz + 0.1, r: 0.22 });
  }
  const im1 = new THREE.InstancedMesh(trunkGeo, trunkMat, trunks.length);
  trunks.forEach((t, i) => im1.setMatrixAt(i, t.m));
  const im2 = new THREE.InstancedMesh(coneGeo, leafMat, cones.length);
  cones.forEach((t, i) => im2.setMatrixAt(i, t.m));
  const all = [im1, im2];
  if (caps.length) {
    const im3 = new THREE.InstancedMesh(coneGeo, windy(seeThrough(toon(r3d, { color: 0xf1f5fc, key: 'snowcap' })), { amp: 0.75, weight: '0.8' }), caps.length);
    caps.forEach((t, i) => im3.setMatrixAt(i, t.m));
    all.push(im3);
  }
  for (const im of all) { im.castShadow = im.receiveShadow = true; im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); group.add(im); }
}

function buildPalms(r3d, group, list, colliders) {
  const G = geos();
  if (!G.cyl) { G.cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 8); G.cyl.translate(0, 0.5, 0); G.coco = new THREE.IcosahedronGeometry(1, 1); }
  const mats = {
    ptrunk: toon(r3d, { color: 0xa8845a, key: 'palm-trunk' }),
    pring: toon(r3d, { color: 0x7a5a3a, key: 'palm-ring' }),
    frond: windy(seeThrough(toon(r3d, { map: palmTexture(), alphaTest: 0.5, key: 'palm-frond' })), { amp: 1.3 }),
    coco: toon(r3d, { color: 0x6b4a2c, key: 'coco' }),
  };
  const geo = { ptrunk: G.cyl, pring: G.cyl, frond: G.fruit, coco: G.coco };
  const parts = { ptrunk: [], pring: [], frond: [], coco: [] };
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler(), c = new THREE.Color();
  for (const o of list) {
    palm(o.x, o.y - 0.1, hash2(Math.floor(o.x * 10), Math.floor(o.y * 10), 17), (part, x, y, z, sx, sy, sz, ry, rx, rz, tn) => {
      parts[part].push({ m: m4.clone().compose(p.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), s.set(sx, sy, sz)), c: tn ? c.setRGB(tn[0], tn[1], tn[2]).clone() : null });
    });
    colliders.push({ x: o.x, z: o.y, r: 0.22 });
  }
  for (const [k, l] of Object.entries(parts)) {
    if (!l.length) continue;
    const im = new THREE.InstancedMesh(geo[k], mats[k], l.length);
    l.forEach((it, i) => { im.setMatrixAt(i, it.m); if (it.c) im.setColorAt(i, it.c); });
    im.castShadow = im.receiveShadow = true;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();
    group.add(im);
  }
}

// Bushes (optionally with berries) & rocks
export function buildBushesRocks(r3d, objects) {
  const group = new THREE.Group();
  const colliders = [];
  const bushMat = windy(toon(r3d, { map: leafTexture('#4f9a4c', 21), key: 'leaf-bush' }), { amp: 0.5 });
  const rockGeo = new THREE.IcosahedronGeometry(1, 0);
  const blob = new THREE.IcosahedronGeometry(1, 1);
  const berryMats = { red: toon(r3d, { color: 0xd9364a, key: 'berry-r' }), blue: toon(r3d, { color: 0x4b5fd0, key: 'berry-b' }) };
  const rockMats = {
    grey: toon(r3d, { color: 0x9a95a0, key: 'rock-grey', flat: true }),
    beach: toon(r3d, { color: 0xb3a28c, key: 'rock-beach' }),
    field: toon(r3d, { color: 0xa39c9e, key: 'rock-field' }),
  };
  const berryBushes = [];
  for (const o of objects) {
    if (o.type === 'bush') {
      const g = new THREE.Group();
      const h = hash2(Math.floor(o.x * 10), Math.floor(o.y * 10), 31);
      for (const [dx, dy, dz, r] of [[0, 0.34, 0, 0.42], [-0.3, 0.26, 0.1, 0.3], [0.32, 0.27, 0.06, 0.32], [0.05, 0.52, -0.05, 0.28]]) {
        const m = new THREE.Mesh(blob, bushMat);
        m.position.set(dx, dy, dz);
        m.scale.setScalar(r * (0.95 + h * 0.2));
        g.add(m);
      }
      const berries = [];
      if (o.berries) {
        const bm = h < 0.5 ? berryMats.red : berryMats.blue;
        const rr = rng(Math.floor(o.x * 97 + o.y * 13));
        for (let i = 0; i < 7; i++) {
          const a = rr() * Math.PI * 2;
          const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), bm);
          b.position.set(Math.cos(a) * 0.38, 0.28 + rr() * 0.3, Math.sin(a) * 0.3 + 0.12);
          g.add(b);
          berries.push(b);
        }
        berryBushes.push({ obj: o, group: g, berries, kind: h < 0.5 ? 'red' : 'blue' });
      }
      g.position.set(o.x, 0, o.y);
      group.add(g);
      colliders.push({ x: o.x, z: o.y, r: 0.4 });
    } else if (o.type === 'rock') {
      const m = new THREE.Mesh(rockGeo, o.beach ? rockMats.beach : o.grey ? rockMats.grey : rockMats.field);
      const h = hash2(Math.floor(o.x * 10), Math.floor(o.y * 10), 41);
      m.scale.set(0.42 + h * 0.15, 0.3 + h * 0.1, 0.36 + h * 0.1);
      m.rotation.set(h * 2, h * 5, h);
      m.position.set(o.x, 0.12, o.y);
      group.add(m);
      colliders.push({ x: o.x, z: o.y, r: 0.36 });
    }
  }
  group.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return { group, colliders, berryBushes };
}

export { paintNoise };
