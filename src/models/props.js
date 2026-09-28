// Village props: lamps, benches, fences, fountain, well, boats, stall, pier,
// bridge… Each builder returns { obj, colliders, lights, anim } pieces.

import { THREE, pixelTexture, toon } from '../render/r3d.js';
import { Painter, paintPlanks, paintWall, paintWood, paintAwning, drawIcon } from '../art/surfaces.js';
import { polyGeometry, quad, tri } from './geom.js';
import { ramp } from '../engine/color.js';
import { rng, hash2 } from '../engine/util.js';

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
  g.traverse((c) => { if (c.isMesh) { c.castShadow = c.userData.noCast ? false : true; c.receiveShadow = true; } });
  return out;
}

const PROPS = {
  lamp(g, o, out, m) {
    g.add(mesh(B(0.26, 0.12, 0.26), m.iron, 0, 0.06, 0));
    g.add(mesh(B(0.09, 1.55, 0.09), m.iron, 0, 0.8, 0));
    g.add(mesh(B(0.34, 0.06, 0.34), m.iron, 0, 1.58, 0));
    const lantern = mesh(B(0.26, 0.3, 0.26), m.glass, 0, 1.76, 0);
    lantern.userData.noCast = true;
    g.add(lantern);
    const cap = mesh(new THREE.ConeGeometry(0.25, 0.2, 4), m.iron, 0, 2.0, 0);
    cap.rotation.y = Math.PI / 4;
    g.add(cap);
    out.colliders.push({ x: o.x, z: o.y, r: 0.15 });
    out.lights.push({ x: o.x, y: 1.7, z: o.y + 0.05, color: 0xffb862, power: 1.4, lamp: true });
  },
  bench(g, o, out, m) {
    g.add(mesh(B(1.3, 0.08, 0.38), m.wood, 0, 0.36, 0));
    g.add(mesh(B(1.3, 0.28, 0.07), m.wood, 0, 0.62, -0.17));
    for (const x of [-0.55, 0.55]) {
      g.add(mesh(B(0.08, 0.34, 0.3), m.iron, x, 0.17, 0));
      g.add(mesh(B(0.08, 0.34, 0.06), m.iron, x, 0.6, -0.17));
    }
    out.colliders.push({ x: o.x - 0.4, z: o.y, r: 0.3 }, { x: o.x + 0.4, z: o.y, r: 0.3 });
    out.seat = { x: o.x, z: o.y };
  },
  fence(g, o, out, m) {
    const v = !!o.v;
    g.add(mesh(B(0.13, 0.58, 0.13), m.wood, 0, 0.29, 0));
    g.add(mesh(new THREE.ConeGeometry(0.1, 0.1, 4), m.wood, 0, 0.63, 0));
    for (const y of [0.22, 0.44]) g.add(mesh(v ? B(0.06, 0.08, 1.0) : B(1.0, 0.08, 0.06), m.wood, v ? 0 : 0.5, y, v ? 0.5 : 0));
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
    g.add(flag);
    out.flag = flag;
    out.colliders.push({ x: o.x, z: o.y, r: 0.2 });
    out.interact = { kind: 'mailbox' };
  },
  crate(g, o, out, m) {
    const p = paintPlanks(16, 16, { dir: 'h', color: '#b07b50', seed: 11 });
    const t = toon(R3, { map: pixelTexture(p), key: 'crate' });
    g.add(mesh(B(0.8, 0.62, 0.62), t, 0, 0.31, 0));
    g.add(mesh(B(0.86, 0.06, 0.68), m.darkWood, 0, 0.65, 0));
    if (o.id === 'shipping') {
      const lp = new Painter(10, 6);
      lp.rect(0, 0, 10, 6, '#fbf1dc'); lp.rect(1, 1, 8, 4, '#f6c65b'); lp.px(4, 2, '#b8862a'); lp.px(5, 2, '#b8862a'); lp.px(4, 3, '#b8862a'); lp.px(5, 3, '#b8862a');
      const lab = mesh(new THREE.PlaneGeometry(0.4, 0.24), toon(R3, { map: pixelTexture(lp.c) }), 0, 0.36, 0.315);
      lab.userData.noCast = true;
      g.add(lab);
      out.interact = { kind: 'shipping' };
    }
    out.colliders.push({ x: o.x, z: o.y, r: 0.4 });
  },
  barrel(g, o, out, m) {
    const p = new Painter(24, 16);
    const R = ramp('#9a6a44');
    p.rect(0, 0, 24, 16, R.m);
    for (let x = 0; x < 24; x += 3) p.vline(x, 0, 16, R.d);
    for (const y of [2, 12]) { p.hline(0, y, 24, '#4b4854'); p.hline(0, y + 1, 24, '#6a6571'); }
    const t = toon(R3, { map: pixelTexture(p.c), key: 'barrel' });
    g.add(mesh(new THREE.CylinderGeometry(0.27, 0.3, 0.7, 10), t, 0, 0.35, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.02, 10), m.darkWood, 0, 0.71, 0));
    out.colliders.push({ x: o.x, z: o.y, r: 0.3 });
  },
  well(g, o, out, m) {
    const ring = mesh(new THREE.CylinderGeometry(0.7, 0.75, 0.6, 14, 1, true), m.stone, 0, 0.3, 0);
    ring.material = m.stone;
    g.add(ring);
    g.add(mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.08, 14), m.stoneLight, 0, 0.62, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.05, 14), toon(R3, { color: 0x243a5a, key: 'wellwater' }), 0, 0.45, 0));
    for (const x of [-0.6, 0.6]) g.add(mesh(B(0.1, 1.2, 0.1), m.darkWood, x, 1.1, 0));
    g.add(mesh(B(1.3, 0.08, 0.08), m.darkWood, 0, 1.45, 0));
    const roofMat = toon(R3, { color: 0xb0473f, key: 'wellroof' });
    const r1 = mesh(B(1.5, 0.06, 0.62), roofMat, 0, 1.72, 0.22); r1.rotation.x = 0.7; g.add(r1);
    const r2 = mesh(B(1.5, 0.06, 0.62), roofMat, 0, 1.72, -0.22); r2.rotation.x = -0.7; g.add(r2);
    g.add(mesh(B(0.2, 0.2, 0.2), m.wood, 0.1, 0.95, 0));
    g.add(mesh(B(0.02, 0.4, 0.02), m.rope, 0.1, 1.2, 0));
    out.colliders.push({ x: o.x, z: o.y, r: 0.8 });
    out.interact = { kind: 'well' };
  },
  fountain(g, o, out, m) {
    const basin = mesh(new THREE.CylinderGeometry(1.35, 1.45, 0.5, 20, 1, true), toon(R3, { map: m.stone.map, side: THREE.DoubleSide, key: 'p-stone2' }), 0, 0.25, 0);
    g.add(basin);
    const rim = mesh(new THREE.TorusGeometry(1.38, 0.1, 6, 24), m.stoneLight, 0, 0.5, 0);
    rim.rotation.x = Math.PI / 2;
    g.add(rim);
    const water = mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.04, 20), m.water, 0, 0.38, 0);
    water.userData.noCast = true;
    g.add(water);
    g.add(mesh(new THREE.CylinderGeometry(0.2, 0.28, 1.1, 10), m.stoneLight, 0, 0.6, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.55, 0.3, 0.2, 14), m.stoneLight, 0, 1.18, 0));
    const w2 = mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.04, 14), m.water, 0, 1.27, 0);
    w2.userData.noCast = true;
    g.add(w2);
    g.add(mesh(new THREE.SphereGeometry(0.12, 8, 6), m.stoneLight, 0, 1.42, 0));
    out.colliders.push({ x: o.x, z: o.y, r: 1.45 });
    out.fountain = { x: o.x, y: 1.45, z: o.y };
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
    out.interact = { kind: 'board' };
  },
  planter(g, o, out, m) {
    g.add(mesh(B(0.8, 0.34, 0.5), m.wood, 0, 0.17, 0));
    g.add(mesh(B(0.72, 0.04, 0.42), toon(R3, { color: 0x5e3d2c, key: 'soil' }), 0, 0.35, 0));
    const cols = [0xf4a4b6, 0xffd66b, 0xec5f73, 0xfff8ec, 0xb9a2e3];
    const rr = rng(Math.floor(o.x * 31 + o.y * 7));
    for (let i = 0; i < 7; i++) {
      const x = -0.28 + (i % 4) * 0.19, z = i < 4 ? -0.08 : 0.1;
      g.add(mesh(B(0.04, 0.16, 0.04), m.leaf, x, 0.43, z));
      g.add(mesh(B(0.11, 0.08, 0.11), toon(R3, { color: cols[Math.floor(rr() * cols.length)], key: 'flower' + i % 5 }), x, 0.53, z));
    }
    out.colliders.push({ x: o.x, z: o.y, r: 0.42 });
  },
  logs(g, o, out, m) {
    const barkMat = toon(R3, { color: 0x7a5238, key: 'logbark' });
    const endMat = toon(R3, { color: 0xd9b07a, key: 'logend' });
    const pos = [[-0.22, 0.14, 0], [0.22, 0.14, 0], [0, 0.4, 0], [0.44, 0.4, 0]];
    for (const [x, y, z] of pos.slice(0, 3)) {
      const l = mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.1, 8), [barkMat, endMat, endMat], x, y, z);
      l.rotation.z = Math.PI / 2;
      g.add(l);
    }
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
    out.colliders.push({ x: o.x, z: o.y, r: 0.3 });
  },
  stones(g, o, out, m) {
    const mat = toon(R3, { color: 0x9d98a3, key: 'standing' });
    const moss = toon(R3, { color: 0x6f9150, key: 'moss' });
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const h = 0.9 + hash2(i, 3, 3) * 0.6;
      const s = mesh(B(0.42, h, 0.34), mat, Math.cos(a) * 1.9, h / 2, Math.sin(a) * 1.5);
      s.rotation.y = -a; s.rotation.z = (hash2(i, 4, 4) - 0.5) * 0.2;
      g.add(s);
      const cap = mesh(B(0.44, 0.08, 0.36), moss, Math.cos(a) * 1.9, h, Math.sin(a) * 1.5);
      cap.rotation.y = -a;
      g.add(cap);
      out.colliders.push({ x: o.x + Math.cos(a) * 1.9, z: o.y + Math.sin(a) * 1.5, r: 0.28 });
    }
    const altar = mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.25, 8), mat, 0, 0.12, 0);
    g.add(altar);
    out.colliders.push({ x: o.x, z: o.y, r: 0.5 });
    out.altar = { x: o.x, z: o.y };
  },
  stall(g, o, out, m) {
    g.add(mesh(B(2.2, 0.8, 0.7), m.wood, 0, 0.4, 0));
    g.add(mesh(B(2.3, 0.06, 0.8), m.darkWood, 0, 0.83, 0));
    for (const x of [-1.05, 1.05]) for (const z of [-0.3, 0.3]) g.add(mesh(B(0.08, 1.9, 0.08), m.darkWood, x, 0.95, z));
    const tex = paintAwning(40, 18, '#fbf1dc', '#e97d8f');
    const aMat = toon(R3, { map: pixelTexture(tex), side: THREE.DoubleSide, alphaTest: 0.5, shadowSide: THREE.DoubleSide });
    const aw = new THREE.Mesh(polyGeometry([quad([-1.25, 1.62, 0.65], [1.25, 1.62, 0.65], [1.25, 2.0, -0.35], [-1.25, 2.0, -0.35])]), aMat);
    g.add(aw);
    const goods = [0xe0463f, 0xf0934a, 0xffd66b, 0x7fbf5a, 0xb9a2e3];
    for (let i = 0; i < 9; i++) g.add(mesh(B(0.14, 0.12, 0.14), toon(R3, { color: goods[i % 5], key: 'good' + (i % 5) }), -0.8 + i * 0.2, 0.92, (i % 2) * 0.18 - 0.1));
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
    const towel = mesh(B(0.7, 0.02, 1.2), toon(R3, { color: 0xf0a3bd, key: 'towel' }), 0.8, 0.01, 0.3);
    towel.userData.noCast = true;
    g.add(towel);
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
    g.add(mesh(B(0.1, 1.5, 0.1), m.darkWood, 0, 0.75, 0));
    g.add(mesh(B(1.1, 0.08, 0.08), m.darkWood, 0, 1.15, 0));
    g.add(mesh(B(0.5, 0.5, 0.3), toon(R3, { color: 0x7cb6e0, key: 'scareshirt' }), 0, 1.05, 0));
    g.add(mesh(B(0.34, 0.32, 0.3), toon(R3, { color: 0xe9cf9b, key: 'scarehead' }), 0, 1.5, 0));
    g.add(mesh(B(0.05, 0.05, 0.02), toon(R3, { color: 0x3b2a2e, key: 'ink' }), -0.07, 1.54, 0.16));
    g.add(mesh(B(0.05, 0.05, 0.02), toon(R3, { color: 0x3b2a2e, key: 'ink' }), 0.07, 1.54, 0.16));
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.06, 10), toon(R3, { color: 0xe8c46a, key: 'strawhat' }));
    hat.position.y = 1.68; g.add(hat);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.18, 8), toon(R3, { color: 0xf0d27e, key: 'strawcrown' }));
    crown.position.y = 1.78; g.add(crown);
    for (const x of [-0.55, 0.55]) g.add(mesh(B(0.12, 0.12, 0.08), toon(R3, { color: 0xe0bf62, key: 'straw' }), x, 1.1, 0));
    out.colliders.push({ x: o.x, z: o.y, r: 0.2 });
    out.interact = { kind: 'scarecrow' };
  },
  beehive(g, o, out, m) {
    const w = toon(R3, { color: 0xf4efe4, key: 'hivewhite' }), y = toon(R3, { color: 0xe8c46a, key: 'hiveyellow' });
    g.add(mesh(B(0.5, 0.2, 0.45), m.darkWood, 0, 0.1, 0));
    g.add(mesh(B(0.46, 0.22, 0.42), w, 0, 0.31, 0));
    g.add(mesh(B(0.46, 0.22, 0.42), y, 0, 0.53, 0));
    g.add(mesh(B(0.56, 0.08, 0.52), toon(R3, { color: 0x8e5d3e, key: 'hiveroof' }), 0, 0.68, 0));
    g.add(mesh(B(0.12, 0.04, 0.02), toon(R3, { color: 0x3b2a2e, key: 'ink' }), 0, 0.26, 0.22));
    out.colliders.push({ x: o.x, z: o.y, r: 0.3 });
    out.interact = { kind: 'beehive' };
    out.bees = true;
  },
  haybale(g, o, out, m) {
    const hb = mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.8, 10), [toon(R3, { color: 0xe0bf62, key: 'hay' }), toon(R3, { color: 0xc9a44e, key: 'hayend' }), toon(R3, { color: 0xc9a44e, key: 'hayend' })], 0, 0.38, 0);
    hb.rotation.z = Math.PI / 2;
    g.add(hb);
    out.colliders.push({ x: o.x, z: o.y, r: 0.42 });
  },
  tent(g, o, out, m) {
    const canvasM = toon(R3, { color: 0xe8883a, key: 'tentcanvas', side: THREE.DoubleSide, shadowSide: THREE.DoubleSide });
    const w = 1.8, d = 2.0, hgt = 1.3;
    const left = polyGeometry([quad([-w / 2, 0, -d / 2], [-w / 2, 0, d / 2], [0, hgt, d / 2], [0, hgt, -d / 2])]);
    const right = polyGeometry([quad([w / 2, 0, d / 2], [w / 2, 0, -d / 2], [0, hgt, -d / 2], [0, hgt, d / 2])]);
    g.add(new THREE.Mesh(left, canvasM), new THREE.Mesh(right, toon(R3, { color: 0xd4702c, key: 'tentcanvas2', side: THREE.DoubleSide, shadowSide: THREE.DoubleSide })));
    const front = polyGeometry([tri([-w / 2, 0, d / 2], [w / 2, 0, d / 2], [0, hgt, d / 2])]);
    g.add(new THREE.Mesh(front, toon(R3, { color: 0xf0a060, key: 'tentfront', side: THREE.DoubleSide })));
    const door = polyGeometry([tri([-0.35, 0, d / 2 + 0.02], [0.35, 0, d / 2 + 0.02], [0, hgt * 0.72, d / 2 + 0.02])]);
    g.add(new THREE.Mesh(door, toon(R3, { color: 0x3b2a2e, key: 'tentdoor' })));
    const back = polyGeometry([tri([w / 2, 0, -d / 2], [-w / 2, 0, -d / 2], [0, hgt, -d / 2])]);
    g.add(new THREE.Mesh(back, canvasM));
    g.add(mesh(B(0.06, 1.5, 0.06), m.darkWood, 0, 0.75, d / 2 + 0.05));
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
    const flames = new THREE.Group();
    const fM = [toon(R3, { color: 0xffd66b, emissive: 0xffc040, emissiveIntensity: 1.3, key: 'flame1' }), toon(R3, { color: 0xf0934a, emissive: 0xff7a30, emissiveIntensity: 1.2, key: 'flame2' })];
    for (let i = 0; i < 6; i++) {
      const f = mesh(new THREE.ConeGeometry(0.11 + (i % 2) * 0.06, 0.5 + (i % 3) * 0.14, 5), fM[i % 2], Math.cos(i * 1.3) * 0.12, 0.3, Math.sin(i * 1.3) * 0.1);
      f.userData.noCast = true;
      flames.add(f);
    }
    const core = mesh(new THREE.ConeGeometry(0.1, 0.34, 5), toon(R3, { color: 0xfff3c4, emissive: 0xfff0b0, emissiveIntensity: 1.5, key: 'flamecore' }), 0, 0.26, 0);
    core.userData.noCast = true;
    flames.add(core);
    g.add(flames);
    out.fire = [flames];
    out.lights.push({ x: o.x, y: 0.7, z: o.y + 0.2, color: 0xff8a3a, power: 2.2, flicker: true, lamp: true, dist: 9 });
    out.colliders.push({ x: o.x, z: o.y, r: 0.45 });
    out.interact = { kind: 'campfire' };
  },
  logseat(g, o, out, m) {
    const l = mesh(new THREE.CylinderGeometry(0.17, 0.18, 1.0, 8), [toon(R3, { color: 0x7a5238, key: 'logbark' }), toon(R3, { color: 0xd9b07a, key: 'logend' }), toon(R3, { color: 0xd9b07a, key: 'logend' })], 0, 0.17, 0);
    l.rotation.z = Math.PI / 2;
    if (o.rot) l.rotation.y = o.rot;
    g.add(l);
    out.colliders.push({ x: o.x, z: o.y, r: 0.3 });
  },
  lantern(g, o, out, m) {
    g.add(mesh(B(0.08, 1.2, 0.08), m.darkWood, 0, 0.6, 0));
    g.add(mesh(B(0.3, 0.06, 0.08), m.darkWood, 0.12, 1.18, 0));
    const l = mesh(B(0.18, 0.22, 0.18), m.glass, 0.24, 1.02, 0);
    l.userData.noCast = true;
    g.add(l);
    out.lights.push({ x: o.x + 0.24, y: 1.0, z: o.y + 0.1, color: 0xffb862, power: 1.0, lamp: true });
    out.colliders.push({ x: o.x, z: o.y, r: 0.1 });
  },
  shrine(g, o, out, m) {
    const st = toon(R3, { color: 0xa9a3a8, key: 'shrinestone' });
    g.add(mesh(B(1.3, 0.25, 0.9), st, 0, 0.12, 0));
    for (const x of [-0.45, 0.45]) g.add(mesh(B(0.14, 0.9, 0.14), toon(R3, { color: 0xc8454f, key: 'shrinepost' }), x, 0.7, 0.2));
    const roofM = toon(R3, { color: 0x6b4a8a, key: 'shrineroof', shadowSide: THREE.DoubleSide });
    const r1 = mesh(B(1.4, 0.07, 0.6), roofM, 0, 1.3, 0.32); r1.rotation.x = 0.5; g.add(r1);
    const r2 = mesh(B(1.4, 0.07, 0.6), roofM, 0, 1.3, -0.12); r2.rotation.x = -0.5; g.add(r2);
    g.add(mesh(B(0.5, 0.4, 0.3), st, 0, 0.45, -0.1));
    const bowl = mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.08, 10), toon(R3, { color: 0xe0a526, key: 'gold' }), 0, 0.3, 0.3);
    g.add(bowl);
    g.add(mesh(new THREE.SphereGeometry(0.06, 6, 5), toon(R3, { color: 0xf2c14e, emissive: 0xffd66b, emissiveIntensity: 0.6, key: 'bellglow' }), 0, 1.05, 0.25));
    out.colliders.push({ rect: [o.x - 0.65, o.y - 0.45, 1.3, 0.9] });
    out.interact = { kind: 'shrine' };
    out.lights.push({ x: o.x, y: 0.8, z: o.y + 0.5, color: 0xffd08a, power: 0.6 });
  },
  waterfall(g, o, out, m) {
    const p = new Painter(48, 32);
    for (let x = 0; x < 48; x++) for (let y = 0; y < 32; y++) {
      const k = (x * 7 + Math.floor(y / 2) * 3) % 11;
      p.px(x, y, k < 2 ? '#e7f6f4' : k < 5 ? '#9fd0f5' : k < 8 ? '#79bddc' : '#4f99c7');
    }
    const t = pixelTexture(p.c, { repeat: true });
    t.repeat.set(1, 1);
    const mat = toon(R3, { map: t, emissive: 0x4f99c7, emissiveIntensity: 0.25, side: THREE.DoubleSide });
    const fall = mesh(new THREE.PlaneGeometry(3, 1.6), mat, 0, 0.5, 0);
    fall.userData.noCast = true;
    g.add(fall);
    out.anim = 'fall';
    out.animPart = fall;
    out.splash = { x: o.x, z: o.y + 0.6 };
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
    out.colliders.push({ rect: [o.x - 0.4, o.y - 0.8, 0.8, 0.9] });
  },
  sandbox(g, o, out, m) {
    for (const [x, z, w, d] of [[0, -0.7, 1.6, 0.14], [0, 0.7, 1.6, 0.14], [-0.8, 0, 0.14, 1.54], [0.8, 0, 0.14, 1.54]]) g.add(mesh(B(w, 0.2, d), m.wood, x, 0.1, z));
    g.add(mesh(B(1.46, 0.12, 1.26), toon(R3, { color: 0xe9cf9b, key: 'sand' }), 0, 0.06, 0));
    g.add(mesh(B(0.18, 0.14, 0.18), toon(R3, { color: 0xd9364a, key: 'bucket' }), 0.3, 0.19, 0.2));
    g.add(mesh(B(0.3, 0.18, 0.25), toon(R3, { color: 0xe0c89a, key: 'castle' }), -0.25, 0.21, -0.15));
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
    out.colliders.push({ x: o.x, z: o.y, r: 0.36 });
    out.interact = { kind: 'snowman' };
  },
  icehole(g, o, out, m) {
    g.add(mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.34, 8), m.wood, 0, 0.17, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 8), m.darkWood, 0, 0.36, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.2, 8), toon(R3, { color: 0x7cb6e0, key: 'bucket2' }), 0.34, 0.1, 0.12));
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
    out.colliders.push({ x: o.x - 1.25, z: o.y, r: 0.18 }, { x: o.x + 1.25, z: o.y, r: 0.18 });
  },
  koibridge(g, o, out, m) {
    // a little red arched bridge over the koi pond (plank tiles underneath carry you)
    const red = toon(R3, { color: 0xd9433a, key: 'torii' }), deckM = toon(R3, { color: 0x8a4a38, key: 'koideck' });
    const len = KOI.len, N = 9;
    for (let i = 0; i < N; i++) {
      const t0 = i / N, t1 = (i + 1) / N, tm = (t0 + t1) / 2;
      const z = -len / 2 + tm * len, y = 0.16 + Math.sin(tm * Math.PI) * KOI.arch;
      const seg = mesh(B(1.9, 0.12, len / N + 0.04), deckM, 0, y, z);
      seg.rotation.x = -Math.cos(tm * Math.PI) * KOI.arch * Math.PI / len * 0.9;
      g.add(seg);
      for (const x of [-0.92, 0.92]) {
        g.add(mesh(B(0.1, 0.5, 0.1), red, x, y + 0.3, z - len / N / 2));
        const rail = mesh(B(0.12, 0.1, len / N + 0.06), red, x, y + 0.56, z);
        rail.rotation.x = seg.rotation.x;
        g.add(rail);
      }
    }
    for (const x of [-0.92, 0.92]) for (const z of [-len / 2, len / 2]) g.add(mesh(B(0.14, 0.72, 0.14), red, x, 0.36, z));
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
    const bark = toon(R3, { color: 0x8e6a4a, key: 'logbark3' }), inner = toon(R3, { color: 0xd9b07a, key: 'loginner2' }), hole = toon(R3, { color: 0x2a1f26, key: 'loghole' });
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
    const st = toon(R3, { color: 0xa9a3a8, key: 'shrinestone' });
    g.add(mesh(B(0.34, 0.1, 0.34), st, 0, 0.05, 0));
    g.add(mesh(B(0.14, 0.5, 0.14), st, 0, 0.35, 0));
    g.add(mesh(B(0.32, 0.08, 0.32), st, 0, 0.62, 0));
    const lamp = mesh(B(0.22, 0.2, 0.22), m.glass, 0, 0.76, 0);
    lamp.userData.noCast = true;
    g.add(lamp);
    const roof = mesh(new THREE.ConeGeometry(0.3, 0.2, 4), st, 0, 0.96, 0);
    roof.rotation.y = Math.PI / 4;
    g.add(roof);
    out.lights.push({ x: o.x, y: 0.8, z: o.y + 0.15, color: 0xffc070, power: 0.8, lamp: true });
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
    const trunk = mesh(new THREE.CylinderGeometry(0.45, 0.7, 2.6, 8), toon(R3, { color: 0x6b4a34, key: 'willowbark' }), 0, 1.3, 0);
    g.add(trunk);
    const leaf = toon(R3, { color: 0x7fae5a, key: 'willowleaf' });
    const blob = new THREE.IcosahedronGeometry(1, 2);
    for (const [x, y, z, r] of [[0, 3.1, 0, 1.9], [-1.4, 2.8, 0.2, 1.3], [1.5, 2.9, 0.1, 1.35], [0.1, 3.9, -0.3, 1.3], [-0.5, 3.3, 1.0, 1.1], [0.8, 3.2, 1.0, 1.1]]) {
      const b = mesh(blob, leaf, x, y, z);
      b.scale.set(r, r * 0.85, r);
      g.add(b);
    }
    const vines = new THREE.Group();
    const vm = toon(R3, { color: 0x8fbe62, key: 'willowvine' });
    const rr = rng(7);
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2 + rr() * 0.2;
      const rad = 2.0 + rr() * 0.6;
      const len = 1.4 + rr() * 1.4;
      const v = mesh(B(0.07, len, 0.07), vm, Math.cos(a) * rad, 3.0 - len / 2, Math.sin(a) * rad * 0.85);
      vines.add(v);
    }
    g.add(vines);
    out.anim = 'sway';
    out.animPart = vines;
    out.colliders.push({ x: o.x, z: o.y, r: 0.8 });
  },
  gazebo(g, o, out, m) {
    const floor = mesh(new THREE.CylinderGeometry(1.7, 1.8, 0.16, 8), toon(R3, { color: 0xc49a64, key: 'gazebofloor' }), 0, 0.08, 0);
    g.add(floor);
    const postM = toon(R3, { color: 0xf4efe4, key: 'gazebopost' });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      if (i === 2) continue; // entrance faces south
      g.add(mesh(B(0.1, 1.6, 0.1), postM, Math.cos(a) * 1.55, 0.95, Math.sin(a) * 1.55));
      out.colliders.push({ x: o.x + Math.cos(a) * 1.55, z: o.y + Math.sin(a) * 1.55, r: 0.12 });
    }
    const roof = mesh(new THREE.ConeGeometry(2.2, 1.1, 8), toon(R3, { color: 0x3f9b98, key: 'gazeboroof', shadowSide: THREE.DoubleSide }), 0, 2.3, 0);
    roof.rotation.y = Math.PI / 8;
    g.add(roof);
    g.add(mesh(new THREE.SphereGeometry(0.12, 8, 6), toon(R3, { color: 0xf2c14e, key: 'gold' }), 0, 2.9, 0));
    const bench = mesh(B(1.4, 0.1, 0.35), m.wood, 0, 0.45, -0.9);
    g.add(bench);
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
