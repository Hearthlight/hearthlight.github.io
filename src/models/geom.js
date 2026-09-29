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

// Merge a model's still parts into as few meshes as it has materials: the plain-coloured ones
// all into one mesh with vertex colours, the textured ones by texture. A part marked `keep`
// (animated, glowing, looked up later), transparent or multi-material stays as it is.
export function bakeMeshes(g, vcMat, shallow = false) {
  const groups = new Map(), drop = [];
  g.traverse((m) => { if (m.isMesh && Array.isArray(m.material)) packGroups(m); });
  g.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(g.matrixWorld).invert(), rel = new THREE.Matrix4();
  // (shallow: only g's own leaf meshes, the moving parts below it left as they are)
  const each = shallow ? (fn) => [...g.children].forEach((m) => { if (!m.children.length) fn(m); }) : (fn) => g.traverse(fn);
  each((m) => {
    if (!m.isMesh || m.userData.keep || m.userData.flag || m.userData.swing || Array.isArray(m.material) || m.material.transparent) return;
    const mt = m.material;
    const plain = !mt.map && !mt.emissiveMap && !mt.vertexColors && !mt.alphaTest && mt.side === THREE.FrontSide && (!mt.emissive || mt.emissive.getHex() === 0);
    const key = (plain ? 'vc' : mt.uuid) + (m.userData.noCast ? ':n' : '');
    let G = groups.get(key);
    if (!G) groups.set(key, (G = { mat: mt, plain, noCast: !!m.userData.noCast, geos: [] }));
    const geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    geo.applyMatrix4(rel.multiplyMatrices(inv, m.matrixWorld));
    if (plain) {
      const n = geo.attributes.position.count, c = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { c[i * 3] = mt.color.r; c[i * 3 + 1] = mt.color.g; c[i * 3 + 2] = mt.color.b; }
      geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
    }
    G.geos.push(geo);
    drop.push(m);
  });
  for (const m of drop) m.parent.remove(m);
  for (const G of groups.values()) {
    const mesh = new THREE.Mesh(mergeGeos(G.geos, G.plain), G.plain ? vcMat : G.mat);
    mesh.userData.noCast = G.noCast;
    g.add(mesh);
  }
}
function mergeGeos(geos, color) {
  const names = ['position', 'normal', 'uv', ...(color ? ['color'] : [])];
  const g = new THREE.BufferGeometry();
  for (const a of names) {
    const size = a === 'uv' ? 2 : 3;
    let n = 0;
    for (const s of geos) n += s.attributes.position.count * size;
    const arr = new Float32Array(n);
    let o = 0;
    for (const s of geos) {
      const at = s.attributes[a], cnt = s.attributes.position.count * size;
      if (at) arr.set(at.array.subarray(0, cnt), o);
      o += cnt;
    }
    g.setAttribute(a, new THREE.BufferAttribute(arr, size));
  }
  return g;
}

// A box with bevelled, rounded edges (three segments a side, corners pulled onto a radius of
// k × its smallest side): the soft voxel look of the characters' heads, for animals & props
const SOFT = new Map();
export function softBoxGeo(w, h, d, k = 0.3) {
  const key = w + ',' + h + ',' + d + ',' + k;
  let g = SOFT.get(key);
  if (g) return g;
  const r = Math.min(w, h, d) * k;
  g = new THREE.BoxGeometry(w, h, d, 3, 3, 3);
  const pos = g.attributes.position, hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const cx = Math.max(-hx, Math.min(hx, x)), cy = Math.max(-hy, Math.min(hy, y)), cz = Math.max(-hz, Math.min(hz, z));
    const dx = x - cx, dy = y - cy, dz = z - cz, len = Math.hypot(dx, dy, dz);
    if (len > 1e-6) pos.setXYZ(i, cx + (dx / len) * r, cy + (dy / len) * r, cz + (dz / len) * r);
  }
  g.computeVertexNormals();
  SOFT.set(key, g);
  return g;
}

// A box painted with a few materials over its six faces draws once per face; sorted by material
// with its groups merged, it draws once per material (a house's walls: 6 draws → 3)
export function packGroups(mesh) {
  const g = mesh.geometry, mats = mesh.material;
  if (!Array.isArray(mats) || !g.index || !g.groups.length) return mesh;
  const uniq = [...new Set(mats)];
  const idx = g.index.array, out = [], groups = [];
  uniq.forEach((mt, u) => {
    const start = out.length;
    for (const gr of g.groups) if (mats[gr.materialIndex] === mt) for (let i = gr.start; i < gr.start + gr.count; i++) out.push(idx[i]);
    if (out.length > start) groups.push([start, out.length - start, u]);
  });
  if (groups.length === g.groups.length) return mesh;
  const ng = g.clone();
  ng.setIndex(out);
  ng.clearGroups();
  for (const [st, n, u] of groups) ng.addGroup(st, n, u);
  mesh.geometry = ng;
  mesh.material = uniq.length === 1 ? uniq[0] : uniq;
  return mesh;
}

// An animal or a jointed model: each moving part (a group: head, tail, wings…) merged on its own,
// so a sheep of twenty puffs draws in three
export function bakeTree(g, vcMat) {
  for (const c of [...g.children]) if (!c.isMesh && c.children.length) bakeTree(c, vcMat);
  bakeMeshes(g, vcMat, true);
}
