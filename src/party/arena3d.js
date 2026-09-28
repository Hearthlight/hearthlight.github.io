// The Festival Ring, built from boxes: a stone wall with four gates, tiered
// wooden stands packed with spectators, the announcer's box over the north
// gate, braziers, flags and bunting, stone pillars and two bouncy drums on
// the sand. Everything that repeats is instanced (the whole crowd is a
// handful of draw calls); the site (arena.js) animates it.

import { THREE, toon } from '../render/r3d.js';

export const WALL_K = 0.55;                  // the wall's centre line, outside the sand's edge
export const GATE_W = 1.3;                   // half a gate's opening
const ROW_K = 0.8, ROW_D = 0.8, ROW_H0 = 0.42, ROW_H = 0.4;

// gates: angle on the ellipse, tangent (along the wall) and outward normal
export const GATES = [
  { id: 'north', a: -Math.PI / 2, tx: 1, tz: 0, nx: 0, nz: -1, color: '#f4c542', h: 1.95 },
  { id: 'east', a: 0, tx: 0, tz: 1, nx: 1, nz: 0, color: '#5aa8f2', h: 1.55 },
  { id: 'south', a: Math.PI / 2, tx: 1, tz: 0, nx: 0, nz: 1, color: '#62c46c', h: 0.95 },
  { id: 'west', a: Math.PI, tx: 0, tz: 1, nx: -1, nz: 0, color: '#ef6479', h: 1.55 },
];
// the stands wrap round the back and the sides; the south (the camera's side) stays open
const STANDS = [
  { id: 'west', a0: Math.PI - 0.62, a1: Math.PI + 0.55, rows: 3 },
  { id: 'north', a0: -Math.PI + 0.55, a1: -0.55, rows: 4 },
  { id: 'east', a0: -0.55, a1: 0.62, rows: 3 },
];
const SHIRTS = ['#ef6479', '#f4c542', '#5aa8f2', '#62c46c', '#b88cf0', '#f59a4a', '#e8e0d0', '#4f73b6', '#d45a8a', '#7ad0c0', '#c8864a', '#9ad06a'];
const SKINS = ['#f6d2b4', '#e8b890', '#c98f64', '#9a6644', '#6e4630', '#f2c8a8'];
const HAIRS = ['#3b2a22', '#6b4330', '#a8744a', '#e0b050', '#2a2433', '#c8583a', '#e8e0d8', '#8a5a9a'];
const FESTIVE = ['#ef6479', '#f4c542', '#5aa8f2', '#62c46c', '#b88cf0'];

// where the gong stands: beside the lane from the north gate up to the road
export function gongSpot(A) { return { x: A.x + 2.8, z: A.z - A.rz - (ROW_K + 4 * ROW_D) - 1.3 }; }

// ------------------------------------------------------------------ the ellipse
export function ringAt(A, a, k = 0) { return { x: A.x + Math.cos(a) * (A.rx + k), z: A.z + Math.sin(a) * (A.rz + k) }; }
const speed = (A, a, k) => Math.hypot(Math.sin(a) * (A.rx + k), Math.cos(a) * (A.rz + k));
export const gateHalf = (A, g, k, w = GATE_W) => w / (g.tz === 0 ? A.rx + k : A.rz + k);
export const angDist = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const nearGate = (A, a, k, w) => GATES.some((g) => angDist(a, g.a) < gateHalf(A, g, k, w));

// split [a0, a1] into pieces about `step` tiles long
function arcSegs(A, a0, a1, k, step) {
  const out = [];
  let a = a0;
  while (a < a1 - 1e-5) { const da = Math.min(a1 - a, step / speed(A, a, k)); out.push([a, a + da]); a += da; }
  return out;
}
// the pieces of an arc that aren't gates (w = half-width kept clear)
function openArcs(A, a0, a1, k, w) {
  const cuts = [];
  for (const g of GATES) for (const ga of [g.a - Math.PI * 2, g.a, g.a + Math.PI * 2]) {
    const h = gateHalf(A, g, k, w);
    if (ga + h > a0 && ga - h < a1) cuts.push([ga - h, ga + h]);
  }
  cuts.sort((p, q) => p[0] - q[0]);
  const out = [];
  let a = a0;
  for (const [c0, c1] of cuts) { if (c0 > a) out.push([a, Math.min(c0, a1)]); a = Math.max(a, c1); }
  if (a < a1) out.push([a, a1]);
  return out.filter(([p, q]) => q - p > 1e-3);
}

// ------------------------------------------------------------------ instancing
const Q = new THREE.Quaternion(), EU = new THREE.Euler(), V = new THREE.Vector3(), SC = new THREE.Vector3();
export function tf(x, y, z, ry, sx, sy, sz, rx = 0, out = null) { EU.set(rx, ry, 0, 'YXZ'); Q.setFromEuler(EU); return (out || new THREE.Matrix4()).compose(V.set(x, y, z), Q, SC.set(sx, sy, sz)); }
const yaw = (dx, dz) => Math.atan2(-dz, dx);         // rotation.y that points local +x along (dx, dz)

class Batch {
  constructor(geo, mat, { cast = true, receive = true } = {}) { this.geo = geo; this.mat = mat; this.m = []; this.c = []; this.cast = cast; this.receive = receive; }
  add(m, color) { this.m.push(m); this.c.push(new THREE.Color(color)); return this.m.length - 1; }
  build() {
    const im = new THREE.InstancedMesh(this.geo, this.mat, Math.max(1, this.m.length));
    im.count = this.m.length;
    for (let i = 0; i < this.m.length; i++) { im.setMatrixAt(i, this.m[i]); im.setColorAt(i, this.c[i]); }
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = this.cast; im.receiveShadow = this.receive;
    im.computeBoundingSphere();
    return im;
  }
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'));
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// a flat pennant pointing +x from the pole (double-sided)
function pennantGeo() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.5, 0, 0, -0.5, 0, 1, 0, 0], 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
  return g;
}

// ------------------------------------------------------------------ the build
export function buildArena(r3d, A) {
  const g = new THREE.Group();
  g.name = 'festival-ring';
  const colliders = [], lights = [];
  const flat = (key, opts = {}) => toon(r3d, { color: 0xffffff, key: 'ring-' + key, ...opts });
  const mat = (c, e) => toon(r3d, { color: c, emissive: e || 0x000000, key: 'ring' + c + (e || '') });
  const box = new THREE.BoxGeometry(1, 1, 1);
  const B = (w, h, d, m, x, y, z, ry = 0, parent = g) => {
    const b = new THREE.Mesh(box, m);
    b.scale.set(w, h, d); b.position.set(x, y, z); b.rotation.y = ry;
    b.castShadow = true; b.receiveShadow = true;
    parent.add(b);
    return b;
  };
  const rnd = mulberry(20260927);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

  const stone = new Batch(box, flat('stone'));
  const wood = new Batch(box, flat('wood'));
  const trim = new Batch(box, flat('trim'), { cast: false });

  // ---------------------------------------------------------------- the wall
  const wallArcs = openArcs(A, -Math.PI, Math.PI, WALL_K, GATE_W);
  for (const [a0, a1] of wallArcs) {
    const segs = arcSegs(A, a0, a1, WALL_K, 0.85);
    segs.forEach(([s0, s1], i) => {
      const p0 = ringAt(A, s0, WALL_K), p1 = ringAt(A, s1, WALL_K), am = (s0 + s1) / 2;
      const len = Math.hypot(p1.x - p0.x, p1.z - p0.z) + 0.04, ry = yaw(p1.x - p0.x, p1.z - p0.z);
      const mx = (p0.x + p1.x) / 2, mz = (p0.z + p1.z) / 2;
      const h = Math.sin(am) < 0 ? 0.62 : 0.48;
      stone.add(tf(mx, h / 2, mz, ry, len, h, 0.42), i % 3 === 0 ? '#b8ae9c' : i % 3 === 1 ? '#c9bfac' : '#aea492');
      stone.add(tf(mx, 0.06, mz, ry, len + 0.02, 0.12, 0.5), '#8e8474');                 // plinth
      wood.add(tf(mx, h + 0.045, mz, ry, len + 0.03, 0.09, 0.52), '#7a4e34');           // cap
      if (i % 4 === 2) {
        // a post with a little pennant every few blocks
        wood.add(tf(p1.x, h + 0.3, p1.z, ry, 0.12, 0.6, 0.12), '#6b4330');
        trim.add(tf(p1.x, h + 0.64, p1.z, ry, 0.16, 0.08, 0.16), '#f4c542');
      }
    });
    const n = Math.max(2, Math.ceil(arcLen(A, a0, a1, WALL_K) / 0.5));
    for (let i = 0; i <= n; i++) { const p = ringAt(A, a0 + (a1 - a0) * (i / n), WALL_K); colliders.push({ x: p.x, z: p.z, r: 0.3 }); }
  }

  // ---------------------------------------------------------------- the gates
  const gates = [];
  const bannerTex = {};
  for (const G of GATES) {
    const c = ringAt(A, G.a, WALL_K);
    const t = { x: G.tx, z: G.tz }, n = { x: G.nx, z: G.nz };
    const ry = yaw(t.x, t.z);
    const gate = { ...G, x: c.x, z: c.z, open: 1, target: 1, leaves: [], cols: [], braziers: [] };
    // two stone pillars
    for (const s of [-1, 1]) {
      const px = c.x + t.x * s * (GATE_W + 0.3), pz = c.z + t.z * s * (GATE_W + 0.3);
      B(0.64, G.h, 0.64, mat(0xb8ae9c), px, G.h / 2, pz, ry);
      B(0.76, 0.14, 0.76, mat(0x8e8474), px, G.h + 0.07, pz, ry);
      B(0.76, 0.16, 0.76, mat(0x8e8474), px, 0.08, pz, ry);
      colliders.push({ x: px, z: pz, r: 0.42 });
      if (G.id === 'south') {
        // the south gate stays low (it's in front of the fight): flags on its pillars instead
        B(0.08, 1.2, 0.08, mat(0x6b4330), px, G.h + 0.6, pz);
        const f = new THREE.Mesh(pennantGeo(), toon(r3d, { color: new THREE.Color(G.color), key: 'ring-pen' + G.color, side: THREE.DoubleSide }));
        f.scale.set(0.62, 0.34, 1); f.position.set(px + 0.04, G.h + 1.02, pz); f.rotation.y = s > 0 ? 0 : Math.PI;
        g.add(f);
        gate.flags = (gate.flags || []).concat([f]);
      }
    }
    if (G.id !== 'south') {
      // lintel & a banner in the gate's colour hanging on the arena side
      B(GATE_W * 2 + 1.2, 0.24, 0.52, mat(0x7a4e34), c.x, G.h - 0.12, c.z, ry);
      const tex = bannerTex[G.color] || (bannerTex[G.color] = bannerTexture(G.color));
      const ban = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.62), toon(r3d, { map: tex, key: 'ring-ban' + G.color, side: THREE.DoubleSide }));
      ban.position.set(c.x - n.x * 0.28, G.h - 0.55, c.z - n.z * 0.28);
      ban.rotation.y = Math.atan2(-n.x, -n.z);
      g.add(ban);
    }
    // two door leaves, hinged on the pillars, swinging outwards
    const dh = G.id === 'south' ? 0.78 : 1.15;
    for (const s of [-1, 1]) {
      const hx = c.x + t.x * s * GATE_W, hz = c.z + t.z * s * GATE_W;
      const pivot = new THREE.Group();
      pivot.position.set(hx, 0, hz);
      const closed = yaw(-t.x * s, -t.z * s), open = yaw(n.x, n.z);
      let d = open - closed; d = Math.atan2(Math.sin(d), Math.cos(d));
      pivot.userData = { closed, d };
      const lw = GATE_W - 0.03;
      for (let k = 0; k < 3; k++) B(lw / 3 - 0.02, dh - (k === 1 ? 0 : 0.06), 0.1, mat(k === 1 ? 0x9a6a44 : 0x8a5c3a), lw * (k + 0.5) / 3, dh / 2, 0, 0, pivot);
      for (const y of [0.24, dh - 0.26]) B(lw, 0.1, 0.13, mat(0x5a3b2a), lw / 2, y, 0, 0, pivot);
      B(0.08, 0.08, 0.15, mat(0xe0a526), lw - 0.16, dh * 0.55, 0, 0, pivot);
      pivot.rotation.y = closed + d;
      g.add(pivot);
      gate.leaves.push(pivot);
    }
    for (const f of [-0.62, 0.62]) { const col = { x: c.x + t.x * f, z: c.z + t.z * f, r: 0.66, disabled: true }; colliders.push(col); gate.cols.push(col); }
    // braziers on the sand, either side of the gate
    for (const s of [-1, 1]) {
      const bx = c.x + t.x * s * (GATE_W + 0.55) - n.x * 1.05, bz = c.z + t.z * s * (GATE_W + 0.55) - n.z * 1.05;
      B(0.3, 0.52, 0.3, mat(0x8e8474), bx, 0.26, bz);
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.16, 0.2, 8), mat(0x4a3d48));
      bowl.position.set(bx, 0.62, bz); bowl.castShadow = true; g.add(bowl);
      const fire = B(0.26, 0.26, 0.26, mat(0xffb040, 0xff8a20), bx, 0.8, bz);
      const core = B(0.14, 0.2, 0.14, mat(0xfff0a0, 0xffe070), bx, 0.86, bz);
      fire.castShadow = core.castShadow = false;
      gate.braziers.push({ x: bx, z: bz, fire, core });
      colliders.push({ x: bx, z: bz, r: 0.3 });
      lights.push({ x: bx, y: 1.0, z: bz, color: 0xffa040, power: 1.25, lamp: true });
    }
    gates.push(gate);
  }

  // ---------------------------------------------------------------- the stands
  const seat = new Batch(box, flat('seat'), { cast: false });
  const booth = { half: GATE_W + 1.5 };
  const seats = [];                            // spectator spots
  const vip = [];                              // villagers' front-row seats, nearest the box first
  let outerN = 0;
  for (const S of STANDS) {
    for (let r = 0; r < S.rows; r++) {
      const k0 = ROW_K + r * ROW_D, kc = k0 + ROW_D / 2, h = ROW_H0 + r * ROW_H;
      for (const [a0, a1] of openArcs(A, S.a0, S.a1, kc, GATE_W + 0.35)) {
        arcSegs(A, a0, a1, kc, 1.0).forEach(([s0, s1], i) => {
          const p0 = ringAt(A, s0, kc), p1 = ringAt(A, s1, kc), am = (s0 + s1) / 2;
          const len = Math.hypot(p1.x - p0.x, p1.z - p0.z) + 0.05, ry = yaw(p1.x - p0.x, p1.z - p0.z);
          wood.add(tf((p0.x + p1.x) / 2, h / 2, (p0.z + p1.z) / 2, ry, len, h, ROW_D + 0.02), r % 2 ? '#9a6a44' : '#a8744a');
          const f = ringAt(A, am, k0 + 0.12);
          seat.add(tf(f.x, h + 0.03, f.z, ry, len, 0.06, 0.24), i % 2 ? '#e2b67a' : '#d9a86c');
          if (i % 3 === 1) { const q = ringAt(A, am, k0 + 0.01); trim.add(tf(q.x, h * 0.55, q.z, ry, 0.1, h * 0.5, 0.03), FESTIVE[(i + r) % FESTIVE.length]); }
        });
        // spectators along the row (the box over the north gate hides the middle of the first rows)
        const kk = kc + 0.1;
        for (const [s0] of arcSegs(A, a0, a1, kk, 0.6)) {
          const a = s0 + 0.3 / speed(A, s0, kk);
          if (a > a1) continue;
          const underBox = S.id === 'north' && r < 3 && angDist(a, -Math.PI / 2) < booth.half / (A.rx + kk);
          if (underBox) continue;
          const p = ringAt(A, a, kk);
          if (S.id === 'north' && r === 0 && angDist(a, -Math.PI / 2) < (booth.half + 3.4) / (A.rx + kk)) { vip.push({ x: p.x, z: p.z, y: h, a }); continue; }
          if (rnd() < 0.2) continue;
          seats.push({ x: p.x, y: h, z: p.z, a, row: r, side: S.id });
        }
      }
      if (r === S.rows - 1) outerN = Math.max(outerN, k0 + ROW_D);
      // the stands are solid: fence their outside edge, and the passages through them
      if (r === S.rows - 1) {
        const ko = k0 + ROW_D - 0.25;
        for (const [a0, a1] of openArcs(A, S.a0, S.a1, ko, GATE_W + 0.35)) {
          const n = Math.max(2, Math.ceil(arcLen(A, a0, a1, ko) / 0.5));
          for (let i = 0; i <= n; i++) { const p = ringAt(A, a0 + (a1 - a0) * (i / n), ko); colliders.push({ x: p.x, z: p.z, r: 0.34 }); }
          for (const ae of [a0, a1]) for (let k = ROW_K; k <= ko + 0.01; k += 0.45) { const p = ringAt(A, ae, k); colliders.push({ x: p.x, z: p.z, r: 0.34 }); }
        }
      }
    }
  }
  vip.sort((p, q) => angDist(p.a, -Math.PI / 2) - angDist(q.a, -Math.PI / 2));
  for (const v of vip.splice(8)) seats.push({ ...v, row: 0, side: 'north' });   // the villagers need eight

  // ---------------------------------------------------------------- the crowd
  const crowd = buildCrowd(r3d, seats, A, rnd, pick);
  g.add(crowd.group);

  // ---------------------------------------------------------------- the announcer's box over the north gate
  const NG = gates[0];
  const bz0 = NG.z - 0.08, bz1 = NG.z - 2.3, bx0 = NG.x - booth.half, bx1 = NG.x + booth.half;
  const by = NG.h + 0.02;
  B(bx1 - bx0, 0.16, bz0 - bz1, mat(0x8a5c3a), (bx0 + bx1) / 2, by + 0.08, (bz0 + bz1) / 2);
  B(bx1 - bx0 + 0.1, 0.06, bz0 - bz1 + 0.1, mat(0xc9a06a), (bx0 + bx1) / 2, by + 0.19, (bz0 + bz1) / 2);
  for (const x of [bx0 + 0.15, bx1 - 0.15]) B(0.2, by, 0.2, mat(0x6b4330), x, by / 2, bz1 + 0.15);
  // railing at the front, with the festival's cloth hanging from it
  B(bx1 - bx0, 0.08, 0.1, mat(0x6b4330), (bx0 + bx1) / 2, by + 0.72, bz0 - 0.05);
  for (let x = bx0 + 0.1; x <= bx1 - 0.05; x += 0.62) B(0.07, 0.52, 0.07, mat(0x6b4330), x, by + 0.46, bz0 - 0.05);
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(bx1 - bx0 - 0.3, 0.5), toon(r3d, { map: clothTexture(), key: 'ring-cloth', side: THREE.DoubleSide }));
  cloth.position.set((bx0 + bx1) / 2, by - 0.12, bz0 + 0.03);
  g.add(cloth);
  // the canopy: four poles and a striped awning
  const awnY = by + 1.55;
  for (const x of [bx0 + 0.12, bx1 - 0.12]) for (const z of [bz0 - 0.12, bz1 + 0.12]) B(0.1, awnY - by, 0.1, mat(0x6b4330), x, by + (awnY - by) / 2, z);
  const awn = new THREE.Mesh(box, [mat(0xd8485a), mat(0xd8485a), toon(r3d, { map: stripeTexture(), key: 'ring-awn' }), mat(0xd8485a), mat(0xd8485a), mat(0xd8485a)]);
  awn.scale.set(bx1 - bx0 + 0.5, 0.1, bz0 - bz1 + 0.5); awn.position.set((bx0 + bx1) / 2, awnY + 0.05, (bz0 + bz1) / 2); awn.rotation.x = -0.12;
  awn.castShadow = true; g.add(awn);
  const val = new THREE.Mesh(new THREE.PlaneGeometry(bx1 - bx0 + 0.5, 0.26), toon(r3d, { map: valanceTexture(), key: 'ring-val', transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }));
  val.position.set((bx0 + bx1) / 2, awnY - 0.1, bz0 + 0.27);
  g.add(val);
  const flagsBox = [];
  for (const x of [bx0 - 0.1, bx1 + 0.1]) {
    B(0.07, 0.9, 0.07, mat(0x6b4330), x, awnY + 0.45, bz0 + 0.1);
    const f = new THREE.Mesh(pennantGeo(), toon(r3d, { color: 0xf4c542, key: 'ring-pen#f4c542', side: THREE.DoubleSide }));
    f.scale.set(0.7, 0.36, 1); f.position.set(x + 0.03, awnY + 0.72, bz0 + 0.1);
    g.add(f); flagsBox.push(f);
  }
  const boxSpot = { x: NG.x, z: (bz0 + bz1) / 2 + 0.25, y: by + 0.22 };
  lights.push({ x: NG.x, y: awnY - 0.2, z: (bz0 + bz1) / 2, color: 0xffd08a, power: 1.1, lamp: true });

  // ---------------------------------------------------------------- flags round the back, bunting
  const poles = [];
  const pk = ROW_K + 4 * ROW_D + 0.3;
  for (const [a0, a1] of openArcs(A, STANDS[1].a0, STANDS[1].a1, pk, GATE_W + 0.8)) {
    for (const [s0] of arcSegs(A, a0, a1, pk, 3.6)) poles.push({ ...ringAt(A, s0 + 0.1, pk), h: 3.1 });
  }
  for (const S of [STANDS[0], STANDS[2]]) {
    const kk = ROW_K + 3 * ROW_D + 0.3;
    for (const [a0, a1] of openArcs(A, S.a0, S.a1, kk, GATE_W + 0.8)) for (const [s0] of arcSegs(A, a0, a1, kk, 3.2)) poles.push({ ...ringAt(A, s0 + 0.08, kk), h: 2.6 });
  }
  for (const a of [Math.PI / 2 - 0.62, Math.PI / 2 - 0.3, Math.PI / 2 + 0.3, Math.PI / 2 + 0.62]) poles.push({ ...ringAt(A, a, 1.1), h: 1.7 });
  const pen = new Batch(pennantGeo(), toon(r3d, { color: 0xffffff, key: 'ring-pen-inst', side: THREE.DoubleSide }), { cast: false });
  const flags = [];
  poles.forEach((p, i) => {
    wood.add(tf(p.x, p.h / 2, p.z, 0, 0.1, p.h, 0.1), '#6b4330');
    trim.add(tf(p.x, p.h + 0.05, p.z, 0, 0.16, 0.12, 0.16), '#f4c542');
    colliders.push({ x: p.x, z: p.z, r: 0.14 });
    const col = FESTIVE[i % FESTIVE.length];
    flags.push({ i: pen.add(tf(p.x, p.h - 0.28, p.z, 0.4, 0.8, 0.42, 1), col), x: p.x, y: p.h - 0.28, z: p.z, ph: i * 1.7, len: p.h > 2 ? 0.8 : 0.55 });
  });
  // bunting along the back of the north stands, pole to pole
  const bunt = new Batch(new THREE.ConeGeometry(0.12, 0.26, 3), flat('bunt'), { cast: false });
  const northPoles = poles.filter((p) => p.h > 3).sort((p, q) => p.x - q.x);
  for (let i = 0; i < northPoles.length - 1; i++) {
    const p = northPoles[i], q = northPoles[i + 1], L = Math.hypot(q.x - p.x, q.z - p.z);
    if (L > 5) continue;
    const n = Math.max(3, Math.round(L / 0.42));
    for (let j = 1; j < n; j++) {
      const k = j / n, sag = Math.sin(k * Math.PI) * 0.45;
      bunt.add(tf(p.x + (q.x - p.x) * k, p.h - 0.2 - sag, p.z + (q.z - p.z) * k, 0, 1, 1, 1, Math.PI), FESTIVE[(i + j) % FESTIVE.length]);
    }
  }

  // ---------------------------------------------------------------- on the sand: pillars & drums
  const pillars = [];
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const x = A.x + sx * A.rx * 0.46, z = A.z + sz * A.rz * 0.4;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.52, 0.86, 10), mat(0xc9bfac));
    col.position.set(x, 0.43, z); col.castShadow = true; col.receiveShadow = true; g.add(col);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.16, 10), mat(new THREE.Color(FESTIVE[(sx + 1) + (sz + 1) / 2]).getHex()));
    band.position.set(x, 0.62, z); g.add(band);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.54, 0.1, 10), mat(0x8e8474));
    top.position.set(x, 0.91, z); top.castShadow = true; g.add(top);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.14, 10), mat(0x8e8474));
    foot.position.set(x, 0.07, z); foot.receiveShadow = true; g.add(foot);
    // a lantern on top: iron frame, warm glow, a little roof — the ring's night lights
    B(0.3, 0.05, 0.3, mat(0x3b3440), x, 0.99, z);
    for (const [ox, oz] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) B(0.04, 0.3, 0.04, mat(0x3b3440), x + ox, 1.16, z + oz);
    const glow = B(0.18, 0.24, 0.18, mat(0xffe0a0, 0xffb040), x, 1.15, z);
    glow.castShadow = false;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.2, 4), mat(0xb8483a));
    roof.position.set(x, 1.42, z); roof.rotation.y = Math.PI / 4; roof.castShadow = true; g.add(roof);
    B(0.06, 0.08, 0.06, mat(0xe0a526), x, 1.56, z);
    colliders.push({ x, z, r: 0.6 });
    pillars.push({ x, z, glow });
    lights.push({ x, y: 1.3, z, color: 0xffd08a, power: 1.0, lamp: true });
  }
  const drums = [];
  for (const sx of [-1, 1]) {
    const x = A.x + sx * A.rx * 0.7, z = A.z + A.rz * 0.18;
    const grp = new THREE.Group(); grp.position.set(x, 0, z); g.add(grp);
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.3, 14), mat(sx < 0 ? 0xd8485a : 0x4f73b6));
    shell.position.y = 0.15; shell.castShadow = true; grp.add(shell);
    for (const y of [0.05, 0.27]) { const hoop = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.05, 14), mat(0xf4e2b8)); hoop.position.y = y; grp.add(hoop); }
    const skin = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.04, 14), toon(r3d, { map: drumTexture(), key: 'ring-drum' }));
    skin.position.y = 0.31; grp.add(skin);
    drums.push({ x, z, r: 0.72, grp, squash: 0 });
  }

  // ---------------------------------------------------------------- the gong, by the lane up to the road
  const gongAt = gongSpot(A);
  const gx = gongAt.x, gz = gongAt.z;
  B(0.12, 1.7, 0.12, mat(0x6b4330), gx - 0.62, 0.85, gz);
  B(0.12, 1.7, 0.12, mat(0x6b4330), gx + 0.62, 0.85, gz);
  B(1.4, 0.12, 0.14, mat(0x6b4330), gx, 1.7, gz);
  const gong = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 20), mat(0xe0a526, 0x7a5210));
  gong.rotation.x = Math.PI / 2; gong.position.set(gx, 1.05, gz + 0.02); gong.castShadow = true;
  g.add(gong);
  const boss = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.07, 12), mat(0xf6d06a));
  boss.rotation.x = Math.PI / 2; boss.position.set(gx, 1.05, gz + 0.06);
  g.add(boss);
  colliders.push({ x: gx - 0.62, z: gz, r: 0.18 }, { x: gx + 0.62, z: gz, r: 0.18 });

  for (const b of [stone, wood, trim, seat, bunt]) g.add(b.build());
  const penMesh = pen.build();
  g.add(penMesh);

  return { group: g, colliders, lights, gates, crowd, vip, boxSpot, flags, flagsBox, penMesh, pillars, drums, gong, gongAt, outer: outerN };
}

function arcLen(A, a0, a1, k) {
  let L = 0;
  const n = 24;
  for (let i = 0; i < n; i++) L += speed(A, a0 + (a1 - a0) * ((i + 0.5) / n), k) * (a1 - a0) / n;
  return L;
}

// ------------------------------------------------------------------ the crowd
// bodies, heads (with a face on the front), hair or party hats, and a few
// little flags — every spectator is one instance of each
function buildCrowd(r3d, seats, A, rnd, pick) {
  const group = new THREE.Group();
  const box = new THREE.BoxGeometry(1, 1, 1);
  const face = canvasTex(8, 8, (x) => {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 8, 8);
    x.fillStyle = '#2a2433'; x.fillRect(2, 3, 1, 2); x.fillRect(5, 3, 1, 2);
    x.fillStyle = '#f0a0a8'; x.fillRect(1, 5, 1, 1); x.fillRect(6, 5, 1, 1);
  });
  const skinMat = toon(r3d, { color: 0xffffff, key: 'crowd-skin' });
  const faceMat = toon(r3d, { color: 0xffffff, map: face, key: 'crowd-face' });
  const mk = (geo, m, n) => { const im = new THREE.InstancedMesh(geo, m, Math.max(1, n)); im.count = n; im.castShadow = false; im.receiveShadow = true; return im; };
  const n = seats.length;
  const body = mk(box, toon(r3d, { color: 0xffffff, key: 'crowd-body' }), n);
  const head = mk(box, [skinMat, skinMat, skinMat, skinMat, faceMat, skinMat], n);
  const hair = mk(box, toon(r3d, { color: 0xffffff, key: 'crowd-hair' }), n);
  const hat = mk(new THREE.ConeGeometry(0.1, 0.24, 6), toon(r3d, { color: 0xffffff, key: 'crowd-hat' }), n);
  const stick = mk(box, toon(r3d, { color: 0x6b4330, key: 'crowd-stick' }), n);
  const flag = mk(pennantGeo(), toon(r3d, { color: 0xffffff, key: 'crowd-flag', side: THREE.DoubleSide }), n);
  const people = seats.map((s) => {
    const dx = A.x - s.x, dz = A.z - s.z;
    const ry = Math.atan2(dx, dz);
    return {
      ...s, ry, ph: rnd() * Math.PI * 2, jump: 0, jv: 0, wave: 0,
      tall: 0.9 + rnd() * 0.2, hat: rnd() < 0.2, flag: rnd() < 0.16,
      shirt: new THREE.Color(pick(SHIRTS)), skin: new THREE.Color(pick(SKINS)), hair: new THREE.Color(pick(HAIRS)), hatC: new THREE.Color(pick(FESTIVE)), flagC: new THREE.Color(pick(FESTIVE)),
    };
  });
  people.forEach((p, i) => {
    body.setColorAt(i, p.shirt); head.setColorAt(i, p.skin); hair.setColorAt(i, p.hat ? p.hatC : p.hair); hat.setColorAt(i, p.hatC); flag.setColorAt(i, p.flagC); stick.setColorAt(i, new THREE.Color('#6b4330'));
  });
  for (const im of [body, head, hair, hat, flag, stick]) if (im.instanceColor) im.instanceColor.needsUpdate = true;
  group.add(body, head, hair, hat, stick, flag);
  const M = new THREE.Matrix4(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const crowd = {
    group, people, body, head, hair, hat, stick, flag,
    // pose everyone: hops, the Mexican wave, flags waving
    pose(t) {
      for (let i = 0; i < people.length; i++) {
        const p = people[i];
        const y = p.y + p.jump + Math.max(0, Math.sin(t * 2.2 + p.ph)) * 0.012 + p.wave;
        const s = p.tall;
        body.setMatrixAt(i, tf(p.x, y + 0.17 * s, p.z, p.ry, 0.3, 0.34 * s, 0.22, 0, M));
        head.setMatrixAt(i, tf(p.x, y + 0.34 * s + 0.12, p.z, p.ry, 0.24, 0.23, 0.23, 0, M));
        if (p.hat) { hair.setMatrixAt(i, tf(p.x, y + 0.34 * s + 0.255, p.z, p.ry, 0.25, 0.04, 0.25, 0, M)); hat.setMatrixAt(i, tf(p.x, y + 0.34 * s + 0.38, p.z, p.ry, 1, 1, 1, 0, M)); }
        else { hair.setMatrixAt(i, tf(p.x, y + 0.34 * s + 0.26, p.z, p.ry, 0.26, 0.07, 0.26, 0, M)); hat.setMatrixAt(i, zero); }
        if (p.flag) {
          const up = p.jump > 0.02 || p.wave > 0.05 ? 0.14 : 0;
          const sx = p.x + Math.cos(p.ry) * 0.2, sz = p.z - Math.sin(p.ry) * 0.2;
          stick.setMatrixAt(i, tf(sx, y + 0.4 + up, sz, p.ry, 0.03, 0.5, 0.03, 0, M));
          flag.setMatrixAt(i, tf(sx, y + 0.58 + up, sz, p.ry + Math.PI / 2 + Math.sin(t * 9 + p.ph) * 0.4, 0.3, 0.18, 1, 0, M));
        } else { stick.setMatrixAt(i, zero); flag.setMatrixAt(i, zero); }
      }
      for (const im of [body, head, hair, hat, stick, flag]) im.instanceMatrix.needsUpdate = true;
    },
  };
  crowd.pose(0);
  for (const im of [body, head, hair, hat, stick, flag]) im.computeBoundingSphere();
  return crowd;
}

// ------------------------------------------------------------------ textures
function bannerTexture(color) {
  return canvasTex(24, 10, (x) => {
    x.fillStyle = color; x.fillRect(0, 0, 24, 10);
    x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(0, 8, 24, 2);
    x.fillStyle = '#fff3c4';
    for (const [px, py] of [[11, 2], [12, 2], [10, 3], [11, 3], [12, 3], [13, 3], [11, 4], [12, 4], [10, 5], [13, 5]]) x.fillRect(px, py, 1, 1);
    for (let i = 0; i < 24; i += 4) { x.fillStyle = '#fff3c4'; x.fillRect(i + 1, 0, 2, 1); }
    x.fillStyle = '#3b2a22'; x.fillRect(0, 0, 1, 10); x.fillRect(23, 0, 1, 10);
  });
}
function clothTexture() {
  return canvasTex(48, 8, (x) => {
    for (let i = 0; i < 48; i++) { x.fillStyle = FESTIVE[Math.floor(i / 4) % FESTIVE.length]; x.fillRect(i, 0, 1, 8); }
    x.fillStyle = 'rgba(255,243,196,0.9)'; x.fillRect(0, 1, 48, 1);
    x.fillStyle = 'rgba(0,0,0,0.2)'; x.fillRect(0, 7, 48, 1);
  });
}
function stripeTexture() {
  return canvasTex(16, 16, (x) => { for (let i = 0; i < 16; i++) { x.fillStyle = Math.floor(i / 2) % 2 ? '#fff3e0' : '#d8485a'; x.fillRect(i, 0, 1, 16); } });
}
function valanceTexture() {
  return canvasTex(32, 6, (x) => {
    for (let i = 0; i < 32; i++) {
      x.fillStyle = Math.floor(i / 4) % 2 ? '#fff3e0' : '#d8485a';
      const h = 3 + Math.round(Math.sin(((i % 4) + 0.5) / 4 * Math.PI) * 3);
      x.fillRect(i, 0, 1, h);
    }
  });
}
function drumTexture() {
  return canvasTex(16, 16, (x) => {
    x.fillStyle = '#f4e8d0'; x.fillRect(0, 0, 16, 16);
    x.fillStyle = '#e8d6b4';
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) if ((i * 7 + j * 3) % 11 === 0) x.fillRect(i, j, 1, 1);
    x.fillStyle = '#f0b848';
    for (const [px, py] of [[7, 4], [8, 4], [6, 6], [7, 6], [8, 6], [9, 6], [5, 7], [6, 7], [7, 7], [8, 7], [9, 7], [10, 7], [7, 8], [8, 8], [6, 9], [9, 9], [7, 5], [8, 5], [6, 8], [9, 8], [5, 10], [10, 10]]) x.fillRect(px, py, 1, 1);
  });
}

function mulberry(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t2 = Math.imul(a ^ (a >>> 15), 1 | a); t2 = (t2 + Math.imul(t2 ^ (t2 >>> 7), 61 | t2)) ^ t2; return ((t2 ^ (t2 >>> 14)) >>> 0) / 4294967296; };
}
