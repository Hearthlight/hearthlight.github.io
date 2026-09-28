// Small geometry helpers: quads & triangles with explicit UVs, boxes with
// per-face materials, and a mesh-flag utility.
import { THREE } from '../render/r3d.js';

// Build a BufferGeometry from a list of polygons: { v: [[x,y,z]...], uv: [[u,v]...] }
// Polygons are fanned from their first vertex. Winding: counter-clockwise when
// seen from the visible side.
export function polyGeometry(polys) {
  const pos = [], uvs = [];
  for (const p of polys) {
    for (let i = 1; i < p.v.length - 1; i++) {
      for (const k of [0, i, i + 1]) {
        pos.push(...p.v[k]);
        uvs.push(...p.uv[k]);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  return g;
}

export function quad(a, b, c, d, uv = [[0, 0], [1, 0], [1, 1], [0, 1]]) {
  return { v: [a, b, c, d], uv };
}

export function tri(a, b, c, uv = [[0, 0], [1, 0], [0.5, 1]]) {
  return { v: [a, b, c], uv };
}

export function shadowFlags(obj, cast = true, receive = true) {
  obj.traverse((o) => {
    if (o.isMesh) { o.castShadow = cast; o.receiveShadow = receive; }
  });
  return obj;
}

// Box helper: size & position in units; mats: single material or array of 6
export function box(w, h, d, mats, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
  m.position.set(x, y, z);
  return m;
}

// Merge several geometries (all non-indexed with position/normal/uv)
export function mergeGeometries(geos) {
  const attrs = ['position', 'normal', 'uv'];
  const out = {};
  for (const a of attrs) out[a] = [];
  for (let g of geos) {
    if (g.index) g = g.toNonIndexed();
    for (const a of attrs) {
      const at = g.getAttribute(a);
      if (!at) continue;
      out[a].push(...at.array);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out.position, 3));
  if (out.normal.length) g.setAttribute('normal', new THREE.Float32BufferAttribute(out.normal, 3));
  if (out.uv.length) g.setAttribute('uv', new THREE.Float32BufferAttribute(out.uv, 2));
  return g;
}
