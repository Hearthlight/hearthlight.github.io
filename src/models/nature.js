// Trees, bushes and rocks — toon-shaded blob canopies with speckled leaf
// textures, instanced so the whole forest costs a handful of draw calls.

import { THREE, pixelTexture, toon } from '../render/r3d.js';
import { seeThrough } from '../render/seethrough.js';
import { paintNoise, Painter } from '../art/surfaces.js';
import { ramp } from '../engine/color.js';
import { rng, hash2 } from '../engine/util.js';

const SPECIES = {
  oak: { leaf: '#5aa452', trunk: '#7a5238', blobs: [[0, 1.55, 0, 0.82], [-0.55, 1.28, 0.12, 0.58], [0.56, 1.3, 0.08, 0.6], [0.02, 2.12, -0.06, 0.58], [0.12, 1.18, 0.42, 0.52]], trunkH: 1.15, trunkW: 0.3 },
  cherry: { leaf: '#f2a3bf', trunk: '#6e4a3c', blobs: [[0, 1.6, 0, 0.8], [-0.6, 1.35, 0.1, 0.56], [0.62, 1.38, 0.05, 0.58], [0.05, 2.15, -0.05, 0.55], [-0.1, 1.25, 0.45, 0.5]], trunkH: 1.2, trunkW: 0.28 },
  apple: { leaf: '#6fb85a', trunk: '#7a5238', blobs: [[0, 1.45, 0, 0.8], [-0.52, 1.2, 0.1, 0.56], [0.55, 1.22, 0.06, 0.58], [0, 2.0, -0.05, 0.52]], trunkH: 1.05, trunkW: 0.28, fruit: '#e0463f' },
  maple_r: { leaf: '#d9543c', trunk: '#5e4032', blobs: [[0, 1.6, 0, 0.84], [-0.58, 1.3, 0.1, 0.6], [0.6, 1.34, 0.05, 0.6], [0.05, 2.2, -0.05, 0.6], [-0.1, 1.22, 0.46, 0.52]], trunkH: 1.2, trunkW: 0.28 },
  maple_o: { leaf: '#e8883a', trunk: '#5e4032', blobs: [[0, 1.55, 0, 0.82], [-0.55, 1.28, 0.12, 0.58], [0.56, 1.3, 0.08, 0.6], [0.02, 2.12, -0.06, 0.58], [0.12, 1.18, 0.42, 0.52]], trunkH: 1.15, trunkW: 0.28 },
  maple_y: { leaf: '#eab83a', trunk: '#6b4a34', blobs: [[0, 1.5, 0, 0.8], [-0.52, 1.24, 0.1, 0.56], [0.55, 1.26, 0.06, 0.58], [0, 2.05, -0.05, 0.54]], trunkH: 1.1, trunkW: 0.26 },
  big: { leaf: '#4f9a52', trunk: '#6b4a34', blobs: [[0, 3.2, 0, 1.7], [-1.3, 2.7, 0.3, 1.2], [1.35, 2.75, 0.2, 1.25], [0.1, 4.3, -0.1, 1.2], [0.2, 2.5, 0.95, 1.05], [-0.8, 3.8, 0.4, 0.9], [0.9, 3.9, 0.3, 0.9]], trunkH: 2.6, trunkW: 0.7 },
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
    const leafMat = seeThrough(toon(r3d, { map: leafTexture(S.leaf, sp.length * 7), key: 'leaf-' + sp }));
    const trunkMat = toon(r3d, { map: barkTexture(S.trunk), key: 'bark-' + sp });
    const blobs = [], trunks = [], fruits = [];
    for (const o of list) {
      const h = hash2(Math.floor(o.x * 10), Math.floor(o.y * 10), 5);
      const sc = o.forest ? 0.92 + h * 0.3 : 1.0 + h * 0.12;
      const bx = o.x, bz = o.y - 0.15;
      const rot = h * Math.PI * 2;
      trunks.push({ m: m4.clone().compose(p.set(bx, 0, bz), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot), s.set(S.trunkW * sc, S.trunkH * sc, S.trunkW * sc)) });
      const tint = 0.9 + hash2(Math.floor(o.x * 3), Math.floor(o.y * 3), 6) * 0.18;
      for (const [dx, dy, dz, r] of S.blobs) {
        const c = Math.cos(rot), si = Math.sin(rot);
        const rx = dx * c - dz * si, rz = dx * si + dz * c;
        const jitter = 0.92 + hash2(Math.floor((o.x + dx) * 13), Math.floor((o.y + dy) * 13), 7) * 0.16;
        blobs.push({
          m: m4.clone().compose(p.set(bx + rx * sc, dy * sc, bz + rz * sc), q.identity(), s.set(r * sc * jitter, r * sc * jitter * 0.92, r * sc * jitter)),
          c: col.setRGB(tint, tint, tint).clone(),
        });
      }
      if (S.fruit) {
        const rr = rng(Math.floor(o.x * 100 + o.y));
        for (let i = 0; i < 7; i++) {
          const a = rr() * Math.PI * 2, e = rr() * 0.9;
          const [bxo, byo, bzo, br] = S.blobs[i % S.blobs.length];
          const fx = bx + (bxo + Math.cos(a) * br * 0.98) * sc;
          const fy = (byo + Math.sin(e) * br * 0.7) * sc;
          const fz = bz + (bzo + Math.sin(a) * br * 0.98) * sc + 0.05;
          fruits.push({ m: m4.clone().compose(p.set(fx, fy, fz), q.identity(), s.set(0.09, 0.09, 0.09)) });
        }
      }
      colliders.push({ x: bx, z: bz + 0.1, r: sp === 'big' ? 0.6 : 0.24 });
    }
    addInstanced(trunkGeo, trunkMat, trunks);
    addInstanced(blobGeo, leafMat, blobs);
    if (fruits.length) addInstanced(GEO.fruit, toon(r3d, { color: S.fruit, key: 'fruit' }), fruits);
  }
  return { group, colliders };
}

function buildPines(r3d, group, list, coneGeo, trunkGeo, colliders, snowy = false) {
  const leafMat = seeThrough(snowy ? toon(r3d, { map: leafTexture('#2f6a55', 79), key: 'leaf-snowpine' }) : toon(r3d, { map: leafTexture('#3f7f55', 77), key: 'leaf-pine' }));
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
    const im3 = new THREE.InstancedMesh(coneGeo, seeThrough(toon(r3d, { color: 0xf1f5fc, key: 'snowcap' })), caps.length);
    caps.forEach((t, i) => im3.setMatrixAt(i, t.m));
    all.push(im3);
  }
  for (const im of all) { im.castShadow = im.receiveShadow = true; im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); group.add(im); }
}

function buildPalms(r3d, group, list, colliders) {
  const trunkMat = toon(r3d, { color: 0xa8845a, key: 'palm-trunk' });
  const ringMat = toon(r3d, { color: 0x7a5a3a, key: 'palm-ring' });
  const leafMat = seeThrough(toon(r3d, { color: 0x5fae5a, key: 'palm-leaf' }));
  for (const o of list) {
    const g = new THREE.Group();
    let x = 0, y = 0;
    for (let i = 0; i < 6; i++) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.14 - i * 0.008, 0.16 - i * 0.008, 0.45, 6), i % 2 ? ringMat : trunkMat);
      x += 0.05 + i * 0.012;
      seg.position.set(x, y + 0.225, 0);
      seg.rotation.z = -0.08 - i * 0.03;
      g.add(seg);
      y += 0.43;
    }
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.28), leafMat);
      leaf.position.set(x + Math.cos(a) * 0.5, y + 0.02, Math.sin(a) * 0.5);
      leaf.rotation.y = -a;
      leaf.rotation.z = -0.45;
      g.add(leaf);
    }
    const coco = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), toon(r3d, { color: 0x6b4a2c, key: 'coco' }));
    coco.position.set(x + 0.12, y - 0.1, 0.1);
    g.add(coco);
    g.position.set(o.x, 0, o.y - 0.1);
    g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    group.add(g);
    colliders.push({ x: o.x, z: o.y, r: 0.22 });
  }
}

// Bushes (optionally with berries) & rocks
export function buildBushesRocks(r3d, objects) {
  const group = new THREE.Group();
  const colliders = [];
  const bushMat = toon(r3d, { map: leafTexture('#4f9a4c', 21), key: 'leaf-bush' });
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
