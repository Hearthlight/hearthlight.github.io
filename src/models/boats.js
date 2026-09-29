// Boats, built like the real thing: a clinker hull lofted from its sections (strakes that follow the
// sheer and run out at the stem, ribs & floorboards inside, a rail along each gunwale, a transom), a
// line of foam where it sits in the water, and liveries that vary from boat to boat. The sailboat
// has a gaff sail & a jib that fill with wind (they swing to whichever side the wind blows), a round
// mast with its hoops, a bowsprit & stays, a rudder & its tiller, a lantern, a burgee streaming with
// the wind; the rowboat has its oars in their rowlocks. Painted at 16 texels a unit.

import { THREE, pixelTexture, toon } from '../render/r3d.js';
import { Painter } from '../art/surfaces.js';
import { ramp, mix } from '../engine/color.js';
import { rng } from '../engine/util.js';
import { bakeTree } from './geom.js';

const TX = 16;

// the hulls' lines (units): length & the stern's z, beam, the gunwale amidships & its rise to the
// bow and to the stern, the keel's depth, the transom's share of the beam, the floor, the planking's
// thickness, the sections' fullness (a superellipse's power), where the forefoot starts to curve up
const HULL = {
  sail: { len: 5.0, z0: -2.3, beam: 1.8, sheer: 0.54, rise: 0.34, aft: 0.08, keel: -0.34, transom: 0.66, floor: 0.19, t: 0.05, n: 3.4, foot: 0.8 },
  row: { len: 2.7, z0: -1.25, beam: 1.24, sheer: 0.44, rise: 0.2, aft: 0.05, keel: -0.2, transom: 0.56, floor: 0.13, t: 0.04, n: 3.0, foot: 0.78 },
};

const SAIL_LOOKS = [
  { hull: '#c8454f', strake: '#f1e6cc', rail: '#6b4330', sail: '#f5ecd7', jib: '#d9594c', mark: '#c8454f', burgee: '#f2c14e' },
  { hull: '#2f5a86', strake: '#eef0ea', rail: '#6b4330', sail: '#c9774a', jib: '#f5ecd7', mark: '#f5ecd7', burgee: '#d9594c' },
  { hull: '#efe8da', strake: '#3f8f6a', rail: '#8a5a36', sail: '#f5ecd7', jib: '#3f8f6a', mark: '#3f8f6a', burgee: '#d9594c' },
  { hull: '#3b7a55', strake: '#f2c14e', rail: '#6b4330', sail: '#f5ecd7', jib: '#f2c14e', mark: '#e0a93a', burgee: '#5aa8f2' },
];
const ROW_LOOKS = [
  { hull: '#b27a48', strake: '#3f7fb5', rail: '#6b4330', blade: '#3f7fb5', cushion: '#d9594c' },
  { hull: '#efe8da', strake: '#c8454f', rail: '#8a5a36', blade: '#c8454f', cushion: '#3f7fb5' },
  { hull: '#b27a48', strake: '#4f9a5f', rail: '#6b4330', blade: '#f2c14e', cushion: '#f2c14e' },
  { hull: '#3f8f8f', strake: '#f1e6cc', rail: '#6b4330', blade: '#f1e6cc', cushion: '#d9594c' },
];

// ---- the lines
function station(H, s) {
  const b = s < 0.42 ? H.transom + (1 - H.transom) * Math.sin((s / 0.42) * Math.PI / 2)
    : Math.pow(Math.max(0, Math.cos(((s - 0.42) / 0.58) * Math.PI / 2)), 0.7);
  const Y = H.sheer + H.rise * Math.pow(s, 2.6) + H.aft * Math.pow(1 - s, 3);
  const up = s > H.foot ? Math.pow((s - H.foot) / (1 - H.foot), 1.8) : 0;
  return { s, z: H.z0 + s * H.len, B: (H.beam / 2) * b, Y, K: H.keel + (Y * 0.55 - H.keel) * up };
}
// a point of a station's section — φ 0 at the gunwale, π/2 at the keel — as [half-width, height]
// (the topsides flare a little: the gunwale is the widest)
function sec(S, phi, n, inset = 0) {
  const c = Math.max(0, Math.cos(phi)), s = Math.sin(phi), B = Math.max(0, S.B - inset), K = Math.min(S.Y, S.K + inset);
  return [B * Math.pow(c, 2 / n) * (1 - 0.1 * s), S.Y - (S.Y - K) * Math.pow(s, 2 / n)];
}
// where a section comes down to height y (the whole section when it never does)
function phiAt(S, y, n, inset = 0) {
  const K = Math.min(S.Y, S.K + inset);
  if (y <= K) return Math.PI / 2;
  return Math.asin(Math.min(1, Math.pow(Math.max(0, (S.Y - y) / (S.Y - K)), n / 2)));
}
const halfAt = (S, y, n, inset = 0) => (y <= Math.min(S.Y, S.K + inset) ? 0 : sec(S, phiAt(S, y, n, inset), n, inset)[0]);

// a geometry built vertex by vertex, each triangle turned to face the way it's told
function G() {
  const P = [], UV = [], I = [];
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  return {
    P,
    v(x, y, z, u = 0, w = 0) { P.push(x, y, z); UV.push(u, w); return P.length / 3 - 1; },
    f(a, b, c, nx, ny, nz) {
      A.fromArray(P, a * 3); B.fromArray(P, b * 3).sub(A); C.fromArray(P, c * 3).sub(A);
      const n = B.cross(C);
      if (n.x * nx + n.y * ny + n.z * nz < 0) I.push(a, c, b); else I.push(a, b, c);
    },
    q(a, b, c, d, nx, ny, nz) { this.f(a, b, c, nx, ny, nz); this.f(a, c, d, nx, ny, nz); },
    geo() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
      g.setIndex(I);
      g.computeVertexNormals();
      return g;
    },
  };
}

// ---- paint
const TEX = {};
const tex = (k, make) => TEX[k] || (TEX[k] = make());
// the planking outside: a rubbing strake, a fine line in the livery's colour, then clinker strakes
// (the lap's shadow at the top of each, its edge catching the light at the foot), copper rivets,
// butt joints staggered from strake to strake, a little wear toward the water
function hullTex(L, W, H) {
  return tex('hull' + L.hull + L.strake + L.rail + W, () => {
    const p = new Painter(W, H), r = rng(W + 7), HC = ramp(L.hull), SC = ramp(L.strake), RC = ramp(L.rail);
    for (let y = 0; y < H; y++) {
      const col = y === 0 ? RC.l : y === 1 ? RC.d : y === 2 ? SC.l : y === 3 ? SC.m : [HC.d, HC.m, HC.m, HC.l][(y - 4) % 4];
      p.hline(0, y, W, col);
    }
    for (let s = 0; 4 + s * 4 < H; s++) {
      const y = 4 + s * 4, C = HC;
      for (let x = (s * 3) % 6 + 2; x < W; x += 6) p.px(x, y + 2, C.h);
      for (let x = Math.floor(r() * 20) + 6; x < W - 2; x += 18 + Math.floor(r() * 12)) p.vline(x, y + 1, 2, C.o);
      if (s > 1) for (let i = 0; i < W * 0.05 * s; i++) p.px(r() * W, y + 1 + Math.floor(r() * 3), C.d);
    }
    return pixelTexture(p.c);
  });
}
// the planking inside, bare wood: strakes, and the steamed ribs across them every seven texels
function innerTex(wood, W, H) {
  return tex('inner' + wood + W, () => {
    const p = new Painter(W, H), R = ramp(wood), r = rng(5);
    const seam = mix(R.m, R.d, 0.6), rib = mix(R.l, R.h, 0.5), shade = mix(R.m, R.d, 0.45);
    for (let y = 0; y < H; y++) p.hline(0, y, W, [seam, R.m, R.m, R.l][y % 4]);
    for (let i = 0; i < W * H * 0.025; i++) p.px(r() * W, r() * H, r() < 0.5 ? seam : R.l);
    for (let x = 3; x < W - 1; x += 8) { p.vline(x, 1, H, rib); p.vline(x + 1, 1, H, R.l); p.vline(x + 2, 1, H, shade); }
    return pixelTexture(p.c);
  });
}
// floorboards (and the foredeck): planks along the boat, soft gaps, a butt joint & its nails now and
// then, a knot
function boardsTex(color, W, H, seed) {
  return tex('boards' + color + W, () => {
    const p = new Painter(W, H), R = ramp(color), r = rng(seed), gap = mix(R.m, R.d, 0.8);
    for (let y = 0; y < H; y++) {
      const k = y % 4, base = (Math.floor(y / 4) * 7 + seed) % 3 === 0 ? R.l : R.m;
      p.hline(0, y, W, k === 3 ? gap : k === 0 ? mix(base, R.h, 0.35) : base);
    }
    for (let y = 0; y < H; y += 4) {
      for (let x = Math.floor(r() * 30) + 8; x < W - 4; x += 30 + Math.floor(r() * 20)) { p.vline(x, y, 3, gap); p.px(x - 2, y + 1, R.d); p.px(x + 2, y + 1, R.d); }
      if (r() < 0.5) p.px(Math.floor(r() * W), y + 1 + Math.floor(r() * 2), R.d);
    }
    return pixelTexture(p.c);
  });
}
// canvas: cloths running up the sail (a seam every five texels), the tabling round its edges,
// doubled corners, a row of reef points and, maybe, a star
function sailTex(cloth, mark, W, H) {
  return tex('sail' + cloth + (mark || '') + W + 'x' + H, () => {
    const p = new Painter(W, H), C = ramp(cloth);
    p.rect(0, 0, W, H, C.m);
    for (let x = 4; x < W; x += 5) p.vline(x, 0, H, mix(C.m, C.d, 0.55));
    p.hline(0, 0, W, C.o); p.hline(0, 1, W, C.l); p.hline(0, H - 1, W, C.o); p.hline(0, H - 2, W, C.l);
    p.vline(0, 0, H, C.d); p.vline(W - 1, 0, H, C.o); p.vline(W - 2, 0, H, C.l);
    for (let i = 0; i < 6; i++) { p.hline(W - 7 + i, H - 3 - i, 6 - i, C.l); p.hline(1, H - 3 - i, 6 - i, C.l); p.hline(W - 7 + i, 2 + i, 6 - i, C.l); }
    const ry = H - 1 - Math.round(H * 0.22);
    p.hline(1, ry - 1, W - 2, C.l);
    for (let x = 3; x < W - 3; x += 4) { p.px(x, ry, C.o); p.px(x, ry + 1, C.d); }
    if (mark) {
      const S = ['....o....', '....o....', '...ooo...', 'ooooooooo', '.ooooooo.', '..ooooo..', '..oo.oo..', '.oo...oo.', '.o.....o.'];
      const M = ramp(mark);
      p.grid(S, { o: M.m }, Math.round(W * 0.56) - 4, Math.round(H * 0.3) - 4);
    }
    return pixelTexture(p.c);
  });
}

// ---- parts
const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };
const UPV = new THREE.Vector3(0, 1, 0);
// a round spar or a rope from a to b
function rod(a, b, r, mat, sides = 6, r2 = r) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), len = d.length();
  const m = mesh(new THREE.CylinderGeometry(r2, r, len, sides), mat);
  m.position.copy(A).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(UPV, d.normalize());
  return m;
}
// a sail: a grid over its corners (tack, clew, throat, peak — a triangle when the last two meet),
// bellied along `dir`, deepest a third of the way back & half-way up
function sailGeo(tack, clew, throat, peak, depth, dir, nu = 7, nv = 8) {
  const g = G(), lerp = (p, q, k) => p.map((v, i) => v + (q[i] - v) * k);
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const a = i / nu, b = j / nv, p = lerp(lerp(tack, clew, a), lerp(throat, peak, a), b);
    const bel = depth * Math.sin(Math.PI * Math.pow(a, 0.8)) * (0.35 + 0.65 * Math.sin(Math.PI * (0.1 + 0.8 * b)));
    g.v(p[0] + dir[0] * bel, p[1] + dir[1] * bel, p[2] + dir[2] * bel, a, b);
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i;
    g.q(a, a + 1, a + nu + 2, a + nu + 1, dir[0], dir[1], dir[2]);
  }
  return g.geo();
}

// the hull: outside & inside planking, floorboards, the transom (both faces), the rails, the foam
function hull(g, H, L, r3d, foamed = true) {
  const NS = 20, NP = 8, W = Math.ceil(H.len * TX), HT = 32, HI = 24, HF = 32;
  const st = []; for (let i = 0; i <= NS; i++) st.push(station(H, i / NS));
  const out = G(), inn = G(), flo = G(), foam = G();
  const U = (z) => (z - H.z0) * TX / W;
  for (const sd of [-1, 1]) {
    // outside, gunwale to keel; inside, gunwale to floor
    for (const [geo, inset, vt, nx, ny] of [[out, 0, HT, sd, -0.5], [inn, H.t, HI, -sd, 0.5]]) {
      const base = geo.P.length / 3;
      for (const S of st) {
        const top = inset ? phiAt(S, H.floor, H.n, inset) : Math.PI / 2;
        let gth = 0, pv = null;
        for (let j = 0; j <= NP; j++) {
          const [x, y] = sec(S, (j / NP) * top, H.n, inset);
          if (pv) gth += Math.hypot(x - pv[0], y - pv[1]);
          pv = [x, y];
          geo.v(sd * x, y, S.z, U(S.z), 1 - (gth * TX) / vt);
        }
      }
      for (let i = 0; i < NS; i++) for (let j = 0; j < NP; j++) {
        const a = base + i * (NP + 1) + j, b = a + NP + 1;
        geo.q(a, b, b + 1, a + 1, nx, ny, 0);
      }
    }
    // the foam where the hull meets the water (a hand's breadth above it, so the boat can bob)
    const base = foam.P.length / 3, yf = 0.05;
    let n = 0;
    for (const S of st) {
      if (S.K > yf - 0.02) break;
      const hw = halfAt(S, yf, H.n);
      foam.v(sd * (hw + 0.01), yf, S.z); foam.v(sd * (hw + 0.09 + 0.02 * Math.sin(S.z * 9)), yf, S.z); n++;
    }
    for (let i = 0; i < n - 1; i++) foam.q(base + i * 2, base + i * 2 + 1, base + i * 2 + 3, base + i * 2 + 2, 0, 1, 0);
    const last = st[n - 1], tip = foam.v(0, yf, last.z + 0.3);
    foam.f(base + (n - 1) * 2, base + (n - 1) * 2 + 1, tip, 0, 1, 0);
    if (sd > 0) {
      const pb = 0, sb = base;   // (round the bow, and across the stern)
      foam.f(pb + (n - 1) * 2, sb + (n - 1) * 2, tip, 0, 1, 0);
      const hw0 = halfAt(st[0], yf, H.n);
      const a = foam.v(-hw0 - 0.08, yf, H.z0), b = foam.v(hw0 + 0.08, yf, H.z0), c = foam.v(hw0 + 0.04, yf, H.z0 - 0.09), d = foam.v(-hw0 - 0.04, yf, H.z0 - 0.09);
      foam.q(a, b, c, d, 0, 1, 0);
    }
  }
  // floorboards
  const fb = flo.P.length / 3;
  for (const S of st) { const hw = halfAt(S, H.floor, H.n, H.t); flo.v(-hw, H.floor, S.z, U(S.z), 0.5 - (hw * TX) / HF); flo.v(hw, H.floor, S.z, U(S.z), 0.5 + (hw * TX) / HF); }
  for (let i = 0; i < NS; i++) flo.q(fb + i * 2, fb + i * 2 + 1, fb + i * 2 + 3, fb + i * 2 + 2, 0, 1, 0);
  // the transom, outside & in
  const S0 = st[0];
  for (const [geo, inset, vt, z, nz] of [[out, 0, HT, H.z0, -1], [inn, H.t, HI, H.z0 + H.t, 1]]) {
    const top = inset ? phiAt(S0, H.floor, H.n, inset) : Math.PI / 2, loop = [];
    for (let j = 0; j <= NP; j++) loop.push(sec(S0, (j / NP) * top, H.n, inset));
    const pts = [...loop.map(([x, y]) => [-x, y]), ...loop.reverse().map(([x, y]) => [x, y])];
    const c = geo.v(0, S0.Y, z, (1.2 * TX) / W, 1);
    const ids = pts.map(([x, y]) => geo.v(x, y, z, ((x + 1.2) * TX) / W, 1 - ((S0.Y - y) * TX) / vt));
    for (let k = 0; k < ids.length - 1; k++) geo.f(c, ids[k], ids[k + 1], 0, 0, nz);
  }
  const hullMat = toon(r3d, { map: hullTex(L, W, HT), key: 'boat-hull-' + L.hull + L.strake + W });
  g.add(mesh(out.geo(), hullMat));
  g.add(mesh(inn.geo(), toon(r3d, { map: innerTex('#c8955e', W, HI), key: 'boat-in' + W })));
  g.add(mesh(flo.geo(), toon(r3d, { map: boardsTex('#a87a4e', W, HF, 5), key: 'boat-floor' + W })));
  const fm = mesh(foam.geo(), toon(r3d, { color: 0xe4f7f4, key: 'boat-foam' }));
  fm.userData.noCast = true;
  if (foamed) g.add(fm);
  // the rails: a varnished cap along each gunwale, across the transom; the stem head
  const railM = toon(r3d, { color: new THREE.Color(L.rail).getHex(), key: 'boat-rail' + L.rail });
  for (const sd of [-1, 1]) for (let i = 0; i < NS; i++) {
    const a = st[i], b = st[i + 1];
    g.add(rod([sd * (a.B - H.t * 0.5), a.Y + 0.02, a.z], [sd * (Math.max(0.02, b.B) - H.t * 0.5), b.Y + 0.02, b.z + (i === NS - 1 ? 0.02 : 0.03)], 0.042, railM, 4));
  }
  g.add(mesh(new THREE.BoxGeometry(2 * S0.B, 0.07, 0.09), railM, 0, S0.Y + 0.02, H.z0 + 0.02));
  const bow = st[NS];
  g.add(mesh(new THREE.BoxGeometry(0.09, 0.2, 0.1), railM, 0, bow.Y + 0.06, bow.z - 0.02));
  return { st, W };
}

// a thwart across the hull at z, its top at y
function thwart(g, H, z, y, mat, d = 0.24) {
  const S = station(H, (z - H.z0) / H.len), hw = halfAt(S, y - 0.03, H.n, H.t);
  g.add(mesh(new THREE.BoxGeometry(2 * hw, 0.06, d), mat, 0, y - 0.03, z));
  g.add(mesh(new THREE.BoxGeometry(0.06, y - 0.03 - H.floor, 0.06), mat, 0, (y - 0.03 + H.floor) / 2, z));
}

// ---------------------------------------------------------------------------
export function buildBoat(r3d, kind, { look = 0, moored = false, foam = true } = {}) {
  const g = new THREE.Group(), H = HULL[kind];
  const vc = toon(r3d, { color: 0xffffff, vertexColors: true, key: 'p-vc' });
  const C = (c, key) => toon(r3d, { color: c, key: 'boat-' + key });
  const L = (kind === 'sail' ? SAIL_LOOKS : ROW_LOOKS)[((look % 4) + 4) % 4];
  hull(g, H, L, r3d, foam);
  const seat = C(0xd3a877, 'seat'), dark = C(0x5a3b2a, 'dark'), rope = C(0xd9c090, 'rope'), stay = C(0x5b4a3c, 'stay');
  const spar = C(0xd9a45e, 'spar');
  if (kind === 'sail') {
    for (const z of [0.55, -0.25, -1.05]) thwart(g, H, z, 0.32, seat);
    thwart(g, H, -1.9, 0.34, seat, 0.5);
    // the foredeck, planked, cambered, up to the bow; its beam
    const zd = 0.85, D = G(), nd = 10, dW = Math.ceil(H.len * TX), dB = D.P.length / 3;
    for (let i = 0; i <= nd; i++) {
      const s = (zd - H.z0) / H.len + (i / nd) * (1 - (zd - H.z0) / H.len), S = station(H, s);
      const u = ((S.z - H.z0) * TX) / dW;
      D.v(-S.B, S.Y - 0.01, S.z, u, 0.5 - (S.B * TX) / 32); D.v(0, S.Y + 0.035, S.z, u, 0.5); D.v(S.B, S.Y - 0.01, S.z, u, 0.5 + (S.B * TX) / 32);
    }
    for (let i = 0; i < nd; i++) { const a = dB + i * 3; D.q(a, a + 1, a + 4, a + 3, 0, 1, 0); D.q(a + 1, a + 2, a + 5, a + 4, 0, 1, 0); }
    g.add(mesh(D.geo(), toon(r3d, { map: boardsTex('#c99a66', dW, 32, 8), key: 'boat-deck' + dW })));
    const Sd = station(H, (zd - H.z0) / H.len);
    g.add(mesh(new THREE.BoxGeometry(2 * Sd.B - 0.06, 0.08, 0.08), C(new THREE.Color(L.rail).getHex(), 'rail' + L.rail), 0, Sd.Y + 0.01, zd));
    // mast (through the deck, tapering), its hoops & truck; bowsprit & stays
    const zm = 1.0, top = 4.62;
    g.add(mesh(new THREE.CylinderGeometry(0.052, 0.078, top - H.floor, 8), spar, 0, (top + H.floor) / 2, zm));
    g.add(mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 8), dark, 0, top + 0.02, zm));
    for (const y of [2.05, 2.6, 3.1]) g.add(mesh(new THREE.TorusGeometry(0.085, 0.022, 4, 10).rotateX(Math.PI / 2), dark, 0, y, zm - 0.02));
    const bowS = station(H, 1), sprit = [0, bowS.Y + 0.12, bowS.z + 0.78];
    g.add(rod([0, bowS.Y + 0.02, bowS.z - 0.25], sprit, 0.042, spar, 6, 0.034));
    g.add(rod([0, top - 0.12, zm], sprit, 0.026, stay, 4));
    const Ss = station(H, (zm - 0.25 - H.z0) / H.len);
    for (const sd of [-1, 1]) g.add(rod([0, 3.55, zm], [sd * (Ss.B - 0.03), Ss.Y + 0.04, zm - 0.25], 0.024, stay, 4));
    // the jib on the forestay, its clew sheeted to leeward (a group: it flips over with the wind)
    const jib = new THREE.Group(); jib.position.set(0, 0, 0);
    const jt = [0, sprit[1] + 0.12, sprit[2] - 0.12], jh = [0, top - 0.62, zm + 0.42], jc = [-0.95, 1.18, zm + 0.42];
    const jn = new THREE.Vector3(...jh).sub(new THREE.Vector3(...jt)).cross(new THREE.Vector3(...jc).sub(new THREE.Vector3(...jt))).normalize();
    if (jn.x > 0) jn.negate();
    const jibGeo = sailGeo(jt, jc, jh, jh, 0.24, jn.toArray());
    const jibM = toon(r3d, { map: sailTex(L.jib, null, 26, 44), side: THREE.DoubleSide, key: 'boat-jib' + L.jib });
    const jm = mesh(jibGeo, jibM); jib.add(jm);
    g.add(jib);
    // the mainsail: gaff & boom swing round the mast (a group), the canvas bellied to leeward
    const sail = new THREE.Group(); sail.position.set(0, 0, zm);
    const tack = [0, 1.46, -0.09], clew = [0, 1.53, -2.72], throat = [0, 3.5, -0.09], peak = [0, 4.38, -2.02];
    const cloth = mesh(sailGeo(tack, clew, throat, peak, 0.34, [-1, 0, 0]), toon(r3d, { map: sailTex(L.sail, L.mark, 44, 50), side: THREE.DoubleSide, key: 'boat-sail' + L.sail + L.mark }));
    sail.add(cloth);
    sail.add(rod([0, 1.44, 0.02], [0, 1.52, -2.86], 0.048, spar, 6, 0.04));
    sail.add(rod([0, 3.48, 0.02], [0, 4.43, -2.1], 0.042, spar, 6, 0.034));
    sail.add(rod([0, 4.43, -2.1], [0, top - 0.05, 0], 0.018, stay, 4));
    g.add(sail);
    // rudder & tiller; a lantern on the stern; a coil of rope on the foredeck
    const S0 = station(H, 0);
    g.add(mesh(new THREE.BoxGeometry(0.07, 0.95, 0.42), C(new THREE.Color(L.hull).getHex(), 'hullc' + L.hull), 0, 0.12, H.z0 - 0.2));
    g.add(mesh(new THREE.BoxGeometry(0.09, 0.08, 0.46), dark, 0, 0.62, H.z0 - 0.2));
    g.add(rod([0, 0.62, H.z0 - 0.02], [0, 0.66, H.z0 + 0.72], 0.034, spar, 6, 0.028));
    const lx = -(S0.B - 0.12);
    g.add(mesh(new THREE.BoxGeometry(0.05, 0.36, 0.05), dark, lx, S0.Y + 0.2, H.z0 + 0.1));
    g.add(mesh(new THREE.BoxGeometry(0.15, 0.04, 0.15), dark, lx, S0.Y + 0.4, H.z0 + 0.1));
    g.add(mesh(new THREE.BoxGeometry(0.11, 0.14, 0.11), toon(r3d, { color: 0xffe2a0, emissive: 0xffb040, emissiveIntensity: 0.55, key: 'boat-lamp' }), lx, S0.Y + 0.49, H.z0 + 0.1));
    g.add(mesh(new THREE.ConeGeometry(0.1, 0.08, 4).rotateY(Math.PI / 4), dark, lx, S0.Y + 0.6, H.z0 + 0.1));
    const Sc = station(H, (1.95 - H.z0) / H.len);
    g.add(mesh(new THREE.TorusGeometry(0.13, 0.04, 4, 10).rotateX(Math.PI / 2), rope, 0.2, Sc.Y + 0.06, 1.95));
    g.add(mesh(new THREE.TorusGeometry(0.07, 0.035, 4, 8).rotateX(Math.PI / 2), rope, 0.2, Sc.Y + 0.1, 1.95));
    // the burgee at the masthead (streams with the wind)
    const burgee = new THREE.Group(); burgee.position.set(0, top + 0.02, zm);
    const bg = G(); const b0 = bg.v(0, 0.1, 0), b1 = bg.v(0, -0.08, 0), b2 = bg.v(0, 0.0, 0.52);
    bg.f(b0, b1, b2, 1, 0, 0);
    const bm = mesh(bg.geo(), toon(r3d, { color: new THREE.Color(L.burgee).getHex(), side: THREE.DoubleSide, key: 'boat-burgee' + L.burgee }));
    burgee.add(bm); burgee.add(mesh(new THREE.BoxGeometry(0.02, 0.2, 0.02), dark, 0, 0.02, 0));
    g.add(burgee);
    Object.assign(g.userData, { sail, jib, burgee });
  } else {
    thwart(g, H, 0.1, 0.25, seat);
    thwart(g, H, -0.78, 0.26, seat, 0.36);
    thwart(g, H, 0.95, 0.34, seat, 0.2);
    // a cushion on the stern seat, the painter coiled up at the bow
    g.add(mesh(new THREE.BoxGeometry(0.46, 0.06, 0.3), C(new THREE.Color(L.cushion).getHex(), 'cush' + L.cushion), 0, 0.29, -0.8));
    g.add(mesh(new THREE.BoxGeometry(0.48, 0.02, 0.32), C(0xf4efe4, 'piping'), 0, 0.275, -0.8));
    g.add(mesh(new THREE.TorusGeometry(0.09, 0.03, 4, 8).rotateX(Math.PI / 2), rope, 0.08, 0.36, 1.0));
    // the rowlocks & the oars (they pivot there: the vehicle sweeps them through the water)
    const zr = 0.36, Sr = station(H, (zr - H.z0) / H.len), bladeM = C(new THREE.Color(L.blade).getHex(), 'blade' + L.blade);
    const oars = [];
    for (const sd of [-1, 1]) {
      g.add(mesh(new THREE.BoxGeometry(0.05, 0.1, 0.1), dark, sd * (Sr.B - 0.02), Sr.Y + 0.08, zr));
      const pivot = new THREE.Group(); pivot.position.set(sd * (Sr.B - 0.02), Sr.Y + 0.1, zr);
      const o = new THREE.Group(); o.rotation.z = moored ? 0 : -sd * 0.4;
      o.add(rod([-sd * 0.5, 0, 0], [sd * 1.18, 0, 0], 0.03, spar, 6));
      o.add(rod([-sd * 0.62, 0, 0], [-sd * 0.46, 0, 0], 0.036, dark, 6));
      o.add(mesh(new THREE.BoxGeometry(0.42, 0.025, 0.14), spar, sd * 1.36, 0, 0));
      o.add(mesh(new THREE.BoxGeometry(0.1, 0.03, 0.145), bladeM, sd * 1.53, 0, 0));
      pivot.add(o);
      pivot.userData.side = sd;
      if (moored) { pivot.position.set(sd * 0.2, 0.37, 0.45); pivot.rotation.y = sd * Math.PI / 2 + 0.05; }
      g.add(pivot);
      oars.push(pivot);
    }
    if (!moored) g.userData.oars = oars;
  }
  bakeTree(g, vc);
  g.traverse((m) => { if (m.isMesh) { m.castShadow = !m.userData.noCast; m.receiveShadow = true; } });
  return g;
}
