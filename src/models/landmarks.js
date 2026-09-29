// Landmarks for the big world's zones (Party Mode v3): a windmill on the
// heights, the Mother Cap, ice & sandstone arches, temples, a shipwreck, the
// Frog King's court, the obsidian forge gate… Every builder works in the
// landmark's LOCAL frame: origin = centre of the footprint on the ground,
// fronts (doors, faces, signs) facing +z (south, towards the camera).
// buildLandmark() returns { obj, colliders, lights, anim, decks }.

import { THREE, pixelTexture, toon } from '../render/r3d.js';
import { Painter, paintPlanks, paintWall, paintWood, paintAwning, paintRoof } from '../art/surfaces.js';
import { polyGeometry, quad, tri } from './geom.js';
import { ramp } from '../engine/color.js';
import { rng } from '../engine/util.js';
import { installDawn, installPeaks, installFrontier } from './v7/landmarks7.js';
import { flameCluster, embers } from './flame.js';
import { buildProp } from './props.js';
import { buildBoat } from './boats.js';

export const LANDMARKS = {
  windmill: { w: 3, d: 3, desc: 'Windy Heights stone windmill with four turning lattice sails' },
  cairn: { w: 1, d: 1, desc: 'Stacked flat stones marking a trail, with a fluttering ribbon' },
  glider_pad: { w: 3, d: 2, desc: 'Wooden glider launch platform with railings and a striped windsock' },
  mother_cap: { w: 3, d: 3, desc: 'The Mother Cap: a giant mushroom house with a round door and glowing spots' },
  fairy_ring: { w: 4, d: 4, desc: 'A ring of small glowing mushrooms with drifting motes' },
  ice_arch: { w: 6, d: 2, desc: 'Frostpeak natural ice arch with icicles; walk under the middle' },
  igloo: { w: 3, d: 3, desc: 'Snow-block igloo with a south entrance tunnel and a lantern' },
  sled_ramp: { w: 3, d: 3, desc: 'Snowy wooden sled start ramp with a red flag and a starter hut' },
  cloud_temple: { w: 6, d: 5, desc: 'Cloud Isles temple: white columns, golden dome, pastel banners, rainbow' },
  balloon_dock: { w: 4, d: 4, desc: 'Wooden balloon mooring platform with posts, ropes and a ticket sign' },
  balloon: { w: 3, d: 3, desc: 'Hot-air balloon (vehicle): striped envelope over a wicker basket' },
  yurt: { w: 3, d: 3, desc: 'Golden Steppe felt yurt with coloured bands and a smoking crown' },
  baobab: { w: 3, d: 3, desc: 'Giant lone baobab: bottle trunk, stubby branches, flat wide crown' },
  mine_entrance: { w: 4, d: 2, desc: 'Red Canyon timber-framed mine mouth with rails and a lantern' },
  water_tower: { w: 2, d: 2, desc: 'Wooden water tower on stilts with a ladder' },
  rock_arch: { w: 6, d: 2, desc: 'Red sandstone natural arch; walk under the middle' },
  sand_temple: { w: 8, d: 7, desc: 'Sunscorch stepped temple with a south stair and a cat-sphinx' },
  oasis_tent: { w: 3, d: 2, desc: 'Striped oasis market tent with rugs, cushions and pots' },
  worm_bones: { w: 8, d: 3, desc: 'Giant sandworm skeleton: arching ribs and a half-buried skull' },
  sunken_statue: { w: 3, d: 3, desc: 'Sunken City: a serene robed giant holding up a lantern' },
  ruin_arch: { w: 4, d: 1, desc: 'Broken stone arch on two columns with fallen blocks' },
  dome_temple: { w: 4, d: 4, desc: 'Small round temple: six columns on a plinth under a dome' },
  stilt_hut: { w: 3, d: 3, desc: 'Coral Lagoon pearl-diver hut on stilts with a ladder and nets' },
  shipwreck: { w: 7, d: 3, desc: 'Beached wreck tilted on its side, broken mast and torn sail' },
  sea_stack: { w: 2, d: 2, desc: 'Tall sea rock pillar with birds, nests and grass on top' },
  frog_throne: { w: 6, d: 5, desc: "Croakmire: the Frog King's lily-pad court with a mushroom throne" },
  stilt_house: { w: 3, d: 3, desc: 'Marsh stilt house with a porch, lanterns and a tied rowboat' },
  lilypad: { w: 3, d: 3, desc: 'A big floating lily pad you can stand on, with a lotus' },
  forge_gate: { w: 5, d: 3, desc: 'Emberpeak obsidian gate with glowing runes over a lava groove' },
  geyser: { w: 2, d: 2, desc: 'Mineral mound steam vent that erupts in bursts' },
  onsen: { w: 5, d: 4, desc: 'Hot-spring bathhouse: deck, shed with a noren, steaming pool' },
  waystone: { w: 1, d: 1, desc: 'Fast-travel waystone with a pulsing star rune' },
  camp: { w: 4, d: 3, desc: 'A small camp: tent, crackling campfire, log seats and a crate' },
  // Dino Isle (Adventure v5)
  dino_skeleton: { w: 11, d: 3, desc: 'A giant long-neck skeleton standing on its four legs: walk under its belly' },
  rex_nest: { w: 5, d: 5, desc: "The Tyrant King's nest: a ring of branches, huge speckled eggs and old bones" },
  dino_nest: { w: 1, d: 1, desc: 'A little twig nest with a clutch of pastel eggs' },
  dino_station: { w: 5, d: 4, desc: 'The Dino Station: a research hut on stilts with a deck, a telescope & a radio mast' },
};

// ---------------------------------------------------------------------------
// shared materials, geometries & tiny helpers
// ---------------------------------------------------------------------------
let R3 = null;
const M = {}, TM = {}, GEO = {};
const UP = new THREE.Vector3(0, 1, 0);
const _v = new THREE.Vector3(), _s = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _m4 = new THREE.Matrix4(), _c = new THREE.Color();

// flat toon colour / glowing colour / textured (painted once) materials
const C = (key, color, extra = {}) => toon(R3, { color, key: 'lm-' + key, ...extra });
const GL = (key, color, emissive, intensity = 0.9, extra = {}) => toon(R3, { color, emissive, emissiveIntensity: intensity, key: 'lm-' + key, ...extra });
// (paint() returns a texture, or { map, emissiveMap } for glowing windows/runes)
function T(key, paint, extra = {}) {
  if (TM[key]) return TM[key];
  const p = paint(), maps = p.isTexture ? { map: p } : { emissive: 0xffffff, emissiveIntensity: 0.6, ...p };
  return (TM[key] = toon(R3, { ...maps, key: 'lm-' + key, ...extra }));
}
// a painted facade: color & glow painters of the same size -> { map, emissiveMap }
function lit(w, h, draw) {
  const p = new Painter(w, h), q = new Painter(w, h);
  q.rect(0, 0, w, h, '#000000');
  draw(p, q);
  return { map: tex(p.c), emissiveMap: tex(q.c) };
}
// canvas -> nearest-filtered texture (repeating when rx/ry given)
function tex(canvas, rx = 0, ry = rx) {
  const t = pixelTexture(canvas, { repeat: rx > 0 });
  if (rx > 0) t.repeat.set(rx, ry);
  return t;
}

function mats(r3d) {
  if (R3 === r3d) return M;
  R3 = r3d;
  for (const k in TM) delete TM[k];
  Object.assign(M, {
    wood: toon(r3d, { map: tex(paintWood(16, 16, '#8e5d3e', { seed: 3 }), 1), key: 'lm-wood' }),
    dark: toon(r3d, { map: tex(paintWood(16, 16, '#5a3b2a', { seed: 4 }), 1), key: 'lm-dwood' }),
    planks: toon(r3d, { map: tex(paintPlanks(16, 16, { dir: 'h', color: '#b07b50', seed: 21 }), 1), key: 'lm-planks' }),
    stone: toon(r3d, { map: tex(paintWall(32, 32, 'stone', { wallColor: '#b0a9ae' }, 12, { foundation: false }), 1), key: 'lm-stone' }),
    iron: C('iron', 0x3b3a46),
    rope: C('rope', 0xd9c090),
    white: C('white', 0xf4efe4),
    red: C('red', 0xc8454f),
    gold: C('gold', 0xe0a526),
    ink: C('ink', 0x2a2433),
    hole: C('hole', 0x16111a),
    snow: C('snow', 0xf1f5fc),
    leaf: C('leaf', 0x5fa453),
    lamp: GL('lamp', 0xfff0c0, 0xffb347, 0.95),
    flame1: GL('flame1', 0xffd66b, 0xffc040, 1.2),
    flame2: GL('flame2', 0xf0934a, 0xff7a30, 1.1),
    core: GL('flamecore', 0xfff3c4, 0xfff0b0, 1.3),
  });
  return M;
}

const geo = (key, make) => GEO[key] || (GEO[key] = make());
const B = (w, h, d) => geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
const BOX1 = () => geo('box1', () => new THREE.BoxGeometry(1, 1, 1));
const ICO = () => geo('ico1', () => new THREE.IcosahedronGeometry(1, 1));
const ROCK = () => geo('rock', () => new THREE.DodecahedronGeometry(1, 0));
const OCT = () => geo('oct', () => new THREE.OctahedronGeometry(1, 0));
const DOME = () => geo('dome', () => new THREE.SphereGeometry(1, 16, 7, 0, Math.PI * 2, 0, Math.PI / 2));
const CYL = () => geo('cyl8', () => new THREE.CylinderGeometry(0.5, 0.5, 1, 8));

// multiply a geometry's UVs (so textures keep ~16 texels per unit)
function uvs(g, su, sv = su) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return g;
}
// box whose faces repeat a texture every `unit` world units
function TB(w, h, d, unit = 1) {
  return geo(`t${w},${h},${d},${unit}`, () => {
    const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
    const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / unit, uv.getY(i) * dims[f][1] / unit); }
    return g;
  });
}

function put(g, geometry, material, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  if (rx || ry || rz) m.rotation.set(rx, ry, rz);
  g.add(m);
  return m;
}
const glow = (m) => { m.userData.noCast = true; return m; };
function grp(parent, x = 0, y = 0, z = 0, ry = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  parent.add(g);
  return g;
}
// a unit box stretched between two points (ropes, braces, sticks, bones)
function beam(g, mat, x1, y1, z1, x2, y2, z2, w = 0.08, d = w) {
  const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1, L = Math.hypot(dx, dy, dz) || 1e-3;
  const m = new THREE.Mesh(BOX1(), mat);
  m.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
  m.quaternion.setFromUnitVectors(UP, _v.set(dx / L, dy / L, dz / L));
  m.scale.set(w, L, d);
  g.add(m);
  return m;
}
// quaternion that turns +y towards (x, y, z)
const aim = (x, y, z) => new THREE.Quaternion().setFromUnitVectors(UP, new THREE.Vector3(x, y, z).normalize());
const eul = (x, y, z, order = 'XYZ') => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, order));
// one InstancedMesh for many copies: items = [x, y, z, sx, sy, sz, ry | Quaternion, rx, rz, color]
function inst(g, geometry, material, items) {
  const im = new THREE.InstancedMesh(geometry, material, items.length);
  const colored = items.some((it) => it[9] !== undefined && it[9] !== null);
  items.forEach((it, i) => {
    const q = typeof it[6] === 'object' && it[6] ? it[6] : _q.setFromEuler(_e.set(it[7] || 0, it[6] || 0, it[8] || 0));
    im.setMatrixAt(i, _m4.compose(_v.set(it[0], it[1], it[2]), q, _s.set(it[3], it[4], it[5])));
    if (colored) im.setColorAt(i, _c.set(it[9] ?? 0xffffff));
  });
  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.computeBoundingSphere();
  im.computeBoundingBox();
  g.add(im);
  return im;
}
// small hanging/standing lantern centred at (x, y, z) + its warm lamp light
function lantern(g, out, x, y, z, { s = 1, mat = M.lamp, color = 0xff9c52, power = 1.0, lx = x, ly = y, lz = z, flicker = false } = {}) {
  const l = grp(g, x, y, z);
  put(l, B(0.2 * s, 0.05 * s, 0.2 * s), M.iron, 0, -0.14 * s, 0);
  glow(put(l, B(0.16 * s, 0.22 * s, 0.16 * s), mat, 0, 0, 0));
  put(l, geo('lcap' + s, () => new THREE.ConeGeometry(0.17 * s, 0.13 * s, 4)), M.iron, 0, 0.17 * s, 0, Math.PI / 4);
  const L = { x: lx, y: ly, z: lz + 0.12, color, power, lamp: true };
  if (flicker) L.flicker = true;
  out.lights.push(L);
  return l;
}
// campfire-style flame cluster (cones), returned as a group to animate
function flames(g, x, y, z, s = 1) {
  const f = flameCluster(R3, s * 0.95);        // (models/flame.js: layered, like the valley's campfire)
  f.position.set(x, y, z);
  g.add(f);
  return f;
}
const flick = (f, t, k = 0) => { f.scale.y = 0.84 + Math.sin(t * 13 + k) * 0.1 + Math.sin(t * 7.7 + k * 2) * 0.07; f.scale.x = f.scale.z = 0.95 + Math.sin(t * 9 + k) * 0.05; f.rotation.y = t * 0.8 + k; };
// a canvas with a coloured ramp speckle (pixel noise) — handy for rock, felt, bark
function speckle(w, h, base, seed, n = 0.35) {
  const p = new Painter(w, h), R = ramp(base), r = rng(seed);
  p.rect(0, 0, w, h, R.m);
  for (let i = 0; i < w * h * n; i++) { const v = r(); p.px(r() * w, r() * h, v < 0.4 ? R.d : v < 0.8 ? R.l : v < 0.93 ? R.h : R.o); }
  return p;
}

// ---------------------------------------------------------------------------
const BUILD = {};

export function buildLandmark(r3d, kind, opts = {}) {
  const f = BUILD[kind];
  if (!f) return null;
  const m = mats(r3d);
  const seed = Number.isFinite(opts.seed) ? Math.abs(Math.floor(opts.seed)) % 1000003 : 0;
  const g = new THREE.Group();
  g.name = 'landmark:' + kind;
  // (chimneys: where smoke or steam rises, as the valley's chimneys — { x, y, z, smoke: 'hearth' | 'always'… })
  const out = { obj: g, colliders: [], lights: [], anim: null, decks: [], chimneys: [] };
  f(g, out, m, rng(seed * 7919 + 101), seed, opts.poi || {}, r3d);
  g.traverse((c) => { if (c.isMesh) { c.castShadow = !c.userData.noCast; c.receiveShadow = true; } });
  g.userData.landmark = kind;
  return out;
}
// box with a single painted top (UV 0..1) and repeating sides (decks, platforms)
function DB(w, h, d, unit = 1) {
  return geo(`d${w},${h},${d},${unit}`, () => {
    const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
    const dims = [[d, h], [d, h], [1, 1], [1, 1], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k, s = f === 2 || f === 3 ? 1 : 1 / unit; uv.setXY(i, uv.getX(i) * dims[f][0] * s, uv.getY(i) * dims[f][1] * s); }
    return g;
  });
}
const PENNANT = [0xc8454f, 0x3f9b98, 0xf2c14e, 0x6d4a8a, 0x4d7fc4, 0xe8883a];

// ---------------------------------------------------------------------------
// Windy Heights
// ---------------------------------------------------------------------------
BUILD.windmill = (g, out, m, r) => {
  const H = 4.2, R0 = 1.38, R1 = 1.02, a8 = Math.PI / 8;
  const ap = (y) => (R0 + (R1 - R0) * y / H) * Math.cos(a8); // south face distance at height y
  const lean = Math.atan((R0 - R1) * Math.cos(a8) / H);
  const stone = T('millstone', () => tex(paintWall(32, 32, 'stone', { wallColor: '#cfc4b0' }, 31, { foundation: false }), 1));
  const trim = C('milltrim', 0x8a8490);
  put(g, geo('millbase', () => new THREE.CylinderGeometry(R0 + 0.1, R0 + 0.14, 0.3, 8)), C('millbase', 0x8f8a93), 0, 0.15, 0, a8);
  put(g, geo('milltower', () => uvs(new THREE.CylinderGeometry(R1, R0, H, 8), 4, 2)), stone, 0, H / 2, 0, a8);
  // door, step & windows on the south face
  const doorT = T('milldoor', () => { const p = new Painter(11, 17); p.rect(0, 0, 11, 17, '#7a5238'); for (let x = 1; x < 11; x += 3) p.vline(x, 0, 17, '#5a3b2a'); p.hline(0, 4, 11, '#3b3a46'); p.hline(0, 12, 11, '#3b3a46'); p.hline(0, 0, 11, '#9a6a44'); p.px(8, 9, '#f2c14e'); return tex(p.c); });
  const dz = ap(0.6);
  put(g, B(0.9, 1.34, 0.1), trim, 0, 0.67, dz + 0.02, 0, -lean);
  put(g, B(0.66, 1.12, 0.1), [m.dark, m.dark, m.dark, m.dark, doorT, m.dark], 0, 0.58, dz + 0.06, 0, -lean);
  put(g, B(1.0, 0.1, 0.24), C('step', 0x9a94a0), 0, 0.05, 1.36);
  const winM = GL('millwin', 0xf3d9a0, 0xffb35c, 0.55);
  for (const y of [2.0, 2.95]) {
    put(g, B(0.44, 0.54, 0.1), trim, 0, y, ap(y) + 0.01, 0, -lean);
    glow(put(g, B(0.28, 0.38, 0.1), winM, 0, y, ap(y) + 0.04, 0, -lean));
  }
  // cap
  put(g, geo('millrim', () => new THREE.CylinderGeometry(R1 + 0.2, R1 + 0.16, 0.18, 8)), m.dark, 0, H + 0.09, 0, a8);
  const capM = T('millcap', () => tex(paintRoof(48, 18, '#a8744a', { seed: 5 }), 2, 1));
  put(g, geo('millcap', () => new THREE.ConeGeometry(R1 + 0.32, 1.55, 8)), capM, 0, H + 0.18 + 0.775, 0, a8);
  put(g, ICO(), m.dark, 0, H + 1.78, 0).scale.setScalar(0.13);
  // sails: four lattice arms on a hub in front of the cap
  const hubY = 3.95, hubZ = ap(hubY) + 0.3;
  put(g, B(0.18, 0.18, 0.5), m.dark, 0, hubY, hubZ - 0.22);
  const spin = grp(g, 0, hubY, hubZ);
  const sailM = T('millsail', () => {
    const p = new Painter(10, 32), wd = '#6b4330';
    for (let y = 0; y < 22; y++) for (let x = 1; x < 9; x++) p.px(x, y, x === 1 ? '#fffaf0' : x === 8 ? '#dcd2c0' : y % 4 === 2 ? '#ece4d4' : '#f4efe4');
    p.vline(0, 0, 32, wd); p.vline(9, 0, 32, wd); p.vline(5, 22, 10, wd);
    for (let y = 0; y < 32; y += 4) p.hline(0, y, 10, wd);
    p.hline(0, 31, 10, wd);
    return tex(p.c);
  }, { alphaTest: 0.5, side: THREE.DoubleSide, shadowSide: THREE.DoubleSide });
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group();
    arm.rotation.z = (i * Math.PI) / 2;
    spin.add(arm);
    put(arm, B(0.1, 2.5, 0.08), m.dark, 0, 1.3, 0);
    put(arm, geo('millsailpl', () => new THREE.PlaneGeometry(0.62, 2.0)), sailM, 0.37, 1.45, 0.03);
  }
  put(spin, geo('millhub', () => new THREE.CylinderGeometry(0.2, 0.2, 0.26, 8)), m.dark, 0, 0, 0.02, 0, Math.PI / 2);
  const ph = r() * 6;
  out.anim = (t) => { spin.rotation.z = Math.PI / 4 + ph - t * 0.7; };
  out.anim(0);
  // flour sacks & a lantern post by the door
  inst(g, ICO(), C('sack', 0xeee4cc), [[-0.82, 0.26, 1.18, 0.24, 0.3, 0.2, 0.3], [-0.5, 0.2, 1.27, 0.2, 0.22, 0.16, -0.4]]);
  put(g, B(0.08, 1.7, 0.08), m.dark, 0.92, 0.85, 1.32);
  put(g, B(0.34, 0.05, 0.05), m.dark, 0.79, 1.66, 1.32);
  put(g, B(0.02, 0.1, 0.02), m.iron, 0.66, 1.58, 1.32);
  lantern(g, out, 0.66, 1.42, 1.32, { s: 0.85 });
  out.lights.push({ x: 0, y: 2.4, z: 1.7, color: 0xffb35c, power: 0.6 });
  out.colliders.push({ x: 0, z: 0, r: 1.42 }, { x: 0.92, z: 1.32, r: 0.1 });
};

BUILD.cairn = (g, out, m, r, seed) => {
  const cols = [0xa8a2a8, 0x958f9a, 0xb5afb2, 0x8f8a93, 0xa39c9e, 0xbab4b8];
  const L = [[0.44, 0.13], [0.37, 0.12], [0.31, 0.11], [0.25, 0.1], [0.19, 0.09], [0.13, 0.075]];
  let y = 0, ry = 0;
  const items = [];
  L.forEach(([rad, hh], i) => {
    y += hh * 0.85;
    items.push([(r() - 0.5) * 0.08, y, (r() - 0.5) * 0.08, rad, hh, rad * 0.86, r() * 6, (r() - 0.5) * 0.12, (r() - 0.5) * 0.12, cols[i]]);
    if (i === 2) ry = y;
    y += hh * 0.85;
  });
  inst(g, ROCK(), C('cairn', 0xffffff), items);
  put(g, ICO(), C('moss', 0x6f9150), -0.14, 0.2, -0.12).scale.set(0.2, 0.06, 0.15);
  inst(g, ROCK(), C('pebble', 0x9d98a3), [[0.36, 0.05, 0.3, 0.09, 0.06, 0.08, 1], [-0.38, 0.04, 0.26, 0.07, 0.05, 0.06, 2], [0.3, 0.04, -0.36, 0.08, 0.05, 0.07, 3]]);
  // the ribbon: a band round the third stone + two fluttering tails
  const rib = C('ribbon' + (seed % 5), PENNANT[seed % 5]);
  put(g, geo('cairnband', () => new THREE.TorusGeometry(1, 0.1, 4, 12)), rib, 0, ry, 0, 0, Math.PI / 2).scale.set(0.3, 0.27, 0.28);
  const tail = grp(g, 0.05, ry - 0.01, 0.27);
  put(tail, B(0.07, 0.3, 0.015), rib, -0.04, -0.14, 0, 0, 0, 0.14);
  put(tail, B(0.06, 0.24, 0.015), rib, 0.04, -0.11, 0, 0, 0, -0.18);
  const ph = r() * 6;
  out.anim = (t) => { tail.rotation.x = 0.35 + Math.sin(t * 4.1 + ph) * 0.22 + Math.sin(t * 9.3) * 0.05; tail.rotation.z = Math.sin(t * 2.3 + ph) * 0.2; };
  out.anim(0);
  out.colliders.push({ x: 0, z: 0, r: 0.38 });
};

BUILD.glider_pad = (g, out, m, r) => {
  const Y = 0.4;
  const top = T('gliderdeck', () => {
    const p = new Painter(48, 32), Yl = '#f2c14e';
    p.ctx.drawImage(paintPlanks(48, 32, { dir: 'h', color: '#b07b50', seed: 33 }), 0, 0);
    for (const cx of [10, 24, 38]) for (let k = 0; k < 4; k++) for (const s of [-1, 1]) { p.px(cx + s * (4 - k), 21 + k, Yl); p.px(cx + s * (3 - k), 21 + k, Yl); }
    p.hline(1, 28, 46, '#f4efe4'); p.hline(1, 29, 46, '#d9d2c4');
    return tex(p.c);
  });
  put(g, DB(3, Y, 2), [m.dark, m.dark, top, m.dark, m.dark, m.dark], 0, Y / 2, 0);
  // railings on the north, west & east sides (open to the south)
  const P = [[-1.44, -0.94], [0, -0.94], [1.44, -0.94], [-1.44, 0], [1.44, 0], [-1.44, 0.94], [1.44, 0.94]];
  const items = P.map(([x, z]) => [x, Y + 0.31, z, 0.1, 0.62, 0.1]);
  for (const y of [Y + 0.58, Y + 0.3]) items.push([0, y, -0.94, 2.98, 0.07, 0.07], [-1.44, y, 0, 0.07, 0.07, 1.96], [1.44, y, 0, 0.07, 0.07, 1.96]);
  inst(g, BOX1(), m.wood, items);
  // a little glider plaque on the back rail
  const pl = T('gliderplaque', () => { const p = new Painter(10, 6), b = '#3f6f9e'; p.rect(0, 0, 10, 6, '#5a3b2a'); p.rect(1, 1, 8, 4, '#e9cf9b'); p.hline(2, 2, 6, b); p.px(1, 3, b); p.px(8, 3, b); p.px(4, 3, '#c8454f'); p.px(5, 3, '#c8454f'); p.px(4, 4, '#5a3b2a'); p.px(5, 4, '#5a3b2a'); return tex(p.c); });
  put(g, B(0.62, 0.36, 0.04), [m.dark, m.dark, m.dark, m.dark, pl, m.dark], -0.55, Y + 0.44, -0.9);
  // windsock on a pole at the north-east corner
  put(g, B(0.07, 2.2, 0.07), m.iron, 1.44, Y + 1.1, -0.94);
  const piv = grp(g, 1.44, Y + 2.08, -0.94);
  const sockM = T('sock', () => { const p = new Painter(8, 16); for (let y = 0; y < 16; y++) p.hline(0, y, 8, (y >> 2) % 2 ? '#f4efe4' : '#d9594c'); return tex(p.c); }, { side: THREE.DoubleSide, shadowSide: THREE.DoubleSide });
  put(piv, geo('sock', () => new THREE.CylinderGeometry(0.17, 0.07, 0.85, 8, 1, true)), sockM, -0.46, 0, 0, 0, 0, -Math.PI / 2);
  put(piv, geo('sockring', () => new THREE.TorusGeometry(0.17, 0.025, 4, 10)), m.iron, -0.03, 0, 0, Math.PI / 2);
  const ph = r() * 6;
  out.anim = (t) => { piv.rotation.set(0, 0.6 + Math.sin(t * 0.9 + ph) * 0.35 + Math.sin(t * 2.3) * 0.08, 0.22 + Math.sin(t * 1.7 + ph) * 0.12); };
  out.anim(0);
  lantern(g, out, -1.44, Y + 0.76, 0.94, { s: 0.8 });
  out.decks.push({ rect: [-1.5, -1.0, 3.0, 2.0], y: Y });
  out.colliders.push({ rect: [-1.5, -1.05, 3.0, 0.2] }, { rect: [-1.55, -1.0, 0.2, 2.0] }, { rect: [1.35, -1.0, 0.2, 2.0] });
};

// ---------------------------------------------------------------------------
// Bouncecap Woods
// ---------------------------------------------------------------------------
BUILD.mother_cap = (g, out, m, r, seed) => {
  const stemM = T('capstem', () => { const p = speckle(24, 16, '#efe2cc', 41, 0.18); for (let x = 1; x < 24; x += 4) p.vline(x, 0, 16, '#e0cfb4'); return tex(p.c, 2, 1); }, { emissive: 0x4a3a30, emissiveIntensity: 0.45 });
  const prof = [[1.12, 0], [1.02, 0.3], [0.93, 1.0], [0.88, 2.4], [0.92, 3.6], [1.05, 4.15], [0.02, 4.2]].map(([x, y]) => new THREE.Vector2(x, y));
  put(g, geo('capstem', () => new THREE.LatheGeometry(prof, 14)), stemM);
  // round door (leaning with the stem's taper), step & two glowing windows
  const frameM = C('capframe', 0xb89c78);
  const door = grp(g, 0, 0.52, 1.03);
  door.rotation.x = -0.19;
  const doorT = T('capdoor', () => { const p = new Painter(14, 14); p.rect(0, 0, 14, 14, '#8e5d3e'); for (let x = 2; x < 14; x += 3) p.vline(x, 0, 14, '#6b4330'); p.rect(5, 2, 4, 3, '#f3d9a0'); p.hline(5, 3, 4, '#6b4330'); return tex(p.c); });
  put(door, geo('capdoor', () => new THREE.CircleGeometry(0.46, 14)), doorT, 0, 0, 0);
  put(door, geo('capdoorf', () => new THREE.TorusGeometry(0.48, 0.07, 5, 16)), frameM, 0, 0, 0.01);
  put(door, ICO(), m.gold, 0.3, -0.03, 0.04).scale.setScalar(0.045);
  put(g, B(0.9, 0.08, 0.36), C('step', 0x9a94a0), 0, 0.04, 1.3);
  const winM = GL('capwin', 0xffe6a0, 0xffc060, 0.9);
  for (const [y, a] of [[1.7, -0.55], [2.45, 0.5]]) {
    const w = grp(g, Math.sin(a) * 0.9, y, Math.cos(a) * 0.9, a);
    glow(put(w, geo('capwin', () => new THREE.CircleGeometry(0.25, 10)), winM, 0, 0, 0.015));
    put(w, geo('capwinf', () => new THREE.TorusGeometry(0.26, 0.06, 4, 12)), frameM, 0, 0, 0.02);
    put(w, B(0.04, 0.46, 0.03), frameM, 0, 0, 0.03);
  }
  // the great cap: a wide dome (shallower north-south so the stem & windows
  // stay visible from the 3/4 camera), rolled rim, gills & glowing cream spots
  const capC = ['#b8479e', '#9a4ac8', '#c84a8a'][seed % 3], AX = 3.5, AY = 2.6, AZ = 2.4, Y0 = 4.2;
  const capM = T('capdome' + capC, () => {
    const p = new Painter(32, 16), Rc = ramp(capC), rr = rng(43);
    p.rect(0, 0, 32, 16, Rc.m);
    for (let i = 0; i < 70; i++) { const v = rr(); p.px(rr() * 32, rr() * 16, v < 0.55 ? Rc.l : v < 0.8 ? Rc.d : Rc.h); }
    return tex(p.c, 3, 1);
  });
  put(g, DOME(), capM, 0, Y0, 0).scale.set(AX, AY, AZ);
  put(g, geo('caprim', () => new THREE.TorusGeometry(3.42, 0.24, 6, 24)), C('caprim' + capC, ramp(capC).d), 0, Y0 + 0.02, 0, 0, Math.PI / 2).scale.set(1, AZ / AX, 1);
  put(g, geo('capgills', () => new THREE.CylinderGeometry(3.3, 3.3, 0.08, 20)), C('capgills', 0xe8c8d8), 0, Y0 - 0.02, 0).scale.set(1, 1, AZ / AX);
  const spots = [[0, 0.15, 0.55], [0, 0.75, 0.6], [-0.95, 0.6, 0.5], [0.95, 0.68, 0.5], [-0.42, 1.2, 0.42], [0.45, 1.25, 0.4], [-1.6, 1.0, 0.45], [1.65, 1.08, 0.45], [2.5, 0.8, 0.45], [-2.45, 0.6, 0.42], [3.3, 1.2, 0.4], [-3.1, 1.15, 0.38]].map(([th, p, s]) => {
    const sx = Math.sin(th) * Math.sin(p), sy = Math.cos(p), sz = Math.cos(th) * Math.sin(p);
    const n = new THREE.Vector3(sx / AX, sy / AY, sz / AZ).normalize();
    return [sx * AX + n.x * 0.03, Y0 + sy * AY + n.y * 0.03, sz * AZ + n.z * 0.03, s, 0.1, s * 0.85, aim(n.x, n.y, n.z)];
  });
  const spotM = GL('capspot', 0xfff3d6, 0xffe2a8, 0.75);
  glow(inst(g, ICO(), spotM, spots));
  // little mushrooms round the foot (a few glow)
  const stems = [], caps = [], gcaps = [];
  [[0.85, 1.35, 1.0], [1.45, 1.3, 0.8], [2.4, 1.3, 0.9], [-0.8, 1.42, 0.9], [-1.5, 1.3, 1.1], [-2.5, 1.25, 0.8], [3.0, 1.35, 0.7]].forEach(([a, rad, k], i) => {
    const x = Math.sin(a) * rad, z = Math.cos(a) * rad, h = 0.3 * k;
    stems.push([x, h / 2, z, 0.1 * k, h, 0.1 * k]);
    if (i % 3 === 1) gcaps.push([x, h, z, 0.2 * k, 0.16 * k, 0.2 * k]);
    else caps.push([x, h, z, 0.2 * k, 0.16 * k, 0.2 * k, 0, 0, 0, [0x8a5ad8, 0xf0a0d0, 0xe8705a][i % 3]]);
  });
  inst(g, CYL(), C('ministem', 0xf0e4d0), stems);
  inst(g, DOME(), C('minicap', 0xffffff), caps);
  glow(inst(g, DOME(), GL('minicapglow', 0x7fe3e0, 0x4fd8e0, 0.7), gcaps));
  // a lantern post by the door
  put(g, B(0.08, 1.4, 0.08), m.dark, -0.98, 0.7, 1.3);
  put(g, B(0.32, 0.05, 0.05), m.dark, -0.86, 1.38, 1.3);
  lantern(g, out, -0.74, 1.18, 1.3, { s: 0.85 });
  out.anim = (t) => { spotM.emissiveIntensity = 0.7 + Math.sin(t * 0.9) * 0.15; };
  out.lights.push({ x: 0, y: 2.1, z: 1.4, color: 0xffc070, power: 0.7 }, { x: 0, y: 3.6, z: 2.2, color: 0xff9ae0, power: 0.8 });
  out.colliders.push({ x: 0, z: 0, r: 1.5 });
};

BUILD.fairy_ring = (g, out, m, r) => {
  glow(put(g, geo('fairyring', () => new THREE.RingGeometry(1.8, 2.2, 32)), C('fairygrass', 0x4f8a3c), 0, 0.012, 0, 0, -Math.PI / 2));
  const cols = [[0x5fd0e0, 0x2fb8d0], [0xf07ac8, 0xe050b0], [0xa88ae8, 0x8060e0]];
  const capMats = cols.map(([c, e], k) => GL('fairycap' + k, c, e, 0.5));
  const stems = [], caps = [[], [], []];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + (r() - 0.5) * 0.3, rad = 2 + (r() - 0.5) * 0.2, k = 0.7 + r() * 0.6;
    for (const [dx, dz, kk] of [[0, 0, k], [0.17, 0.1, k * 0.55]]) {
      const x = Math.cos(a) * rad + dx, z = Math.sin(a) * rad + dz, h = 0.34 * kk;
      stems.push([x, h / 2, z, 0.1 * kk, h, 0.1 * kk]);
      caps[i % 3].push([x, h, z, 0.22 * kk, 0.17 * kk, 0.22 * kk]);
    }
  }
  inst(g, CYL(), C('fairystem', 0xf0ecdf), stems);
  caps.forEach((list, k) => glow(inst(g, DOME(), capMats[k], list)));
  const moteM = GL('fairymote', 0xfffbd0, 0xfff0a0, 1.2);
  const motes = [];
  for (let i = 0; i < 5; i++) motes.push(glow(put(g, B(0.06, 0.06, 0.06), moteM)));
  const ph = r() * 10;
  out.anim = (t) => {
    motes.forEach((mo, i) => {
      const a = t * 0.35 + i * 1.26 + ph;
      mo.position.set(Math.cos(a) * (1.1 + (i % 2) * 0.5), 0.5 + Math.sin(t * 1.3 + i * 2) * 0.3 + i * 0.12, Math.sin(a) * (1.0 + (i % 2) * 0.4));
      mo.rotation.y = t * 2 + i;
    });
    capMats.forEach((cm, k) => { cm.emissiveIntensity = 0.45 + Math.sin(t * 1.6 + k * 2.1) * 0.2; });
  };
  out.anim(0);
  out.lights.push({ x: 0, y: 0.5, z: 0.3, color: 0xa8f0ff, power: 0.9 });
};

// ---------------------------------------------------------------------------
// Frostpeak Glacier
// ---------------------------------------------------------------------------
const iceMat = () => T('ice', () => {
  const p = new Painter(16, 16);
  p.rect(0, 0, 16, 16, '#a6d2ee');
  for (let i = 0; i < 5; i++) { const x0 = (i * 5) % 16; for (let k = 0; k < 7; k++) p.px(x0 + k, (i * 3 + k) % 16, '#dcf1ff'); }
  for (let i = 0; i < 14; i++) p.px((i * 7) % 16, (i * 11) % 16, '#7fb4dc');
  for (let i = 0; i < 6; i++) p.px((i * 5 + 2) % 16, (i * 9 + 5) % 16, '#8cc0e4');
  p.px(3, 3, '#ffffff'); p.px(11, 9, '#ffffff');
  return tex(p.c, 1);
}, { emissive: 0x4a86c0, emissiveIntensity: 0.22 });

// an arch = two legs + boxes following an ellipse (centre line) from east to west
function archSegs(g, mat, { Rx, Ry, legH, N, thick, depth, jitter, r }) {
  const segs = [];
  for (let k = 0; k < N; k++) {
    const th = ((k + 0.5) / N) * Math.PI, c = Math.cos(th), s = Math.sin(th);
    const x = Rx * c, y = legH + Ry * s, ang = Math.atan2(Ry * c, -Rx * s);
    const nl = Math.hypot(Ry * c, Rx * s), nx = (Ry * c) / nl, ny = (Rx * s) / nl;
    const th2 = thick(c), dp = depth(s), len = (Math.PI * Math.sqrt((Rx * Rx + Ry * Ry) / 2)) / N * 1.3;
    put(g, TB(+len.toFixed(2), +th2.toFixed(2), +dp.toFixed(2), 1), mat, x, y, (r() - 0.5) * jitter, (r() - 0.5) * jitter * 1.5, 0, ang);
    segs.push({ x, y, c, s, ang, nx, ny, thick: th2, depth: dp, len });
  }
  return segs;
}

BUILD.ice_arch = (g, out, m, r) => {
  const ice = iceMat();
  for (const s of [-1, 1]) {
    put(g, TB(1.2, 1.3, 1.6), ice, s * 2.32, 0.65, (r() - 0.5) * 0.1, (r() - 0.5) * 0.2);
    put(g, TB(0.8, 0.5, 1.1), ice, s * 2.45, 0.25, 0.3, r() * 0.3);
  }
  const segs = archSegs(g, ice, { Rx: 2.3, Ry: 2.0, legH: 1.0, N: 9, thick: (c) => 0.62 + 0.45 * Math.abs(c), depth: (s) => 1.45 - 0.25 * s, jitter: 0.1, r });
  const snows = [], icicles = [];
  for (const sg of segs) {
    if (Math.abs(sg.c) < 0.72) snows.push([sg.x + sg.nx * (sg.thick / 2 + 0.04), sg.y + sg.ny * (sg.thick / 2 + 0.04), 0, sg.len * 0.8, 0.13, sg.depth * 0.9, 0, 0, sg.ang]);
    if (Math.abs(sg.c) < 0.6) {
      const ix = sg.x - sg.nx * sg.thick / 2, iy = sg.y - sg.ny * sg.thick / 2;
      for (const dz of [-0.4, 0.05, 0.45]) { const h = 0.25 + r() * 0.35; icicles.push([ix + (r() - 0.5) * 0.3, iy - h / 2 + 0.04, dz, 0.07 + r() * 0.04, h, 0.07 + r() * 0.04, 0, Math.PI, 0]); }
    }
  }
  inst(g, BOX1(), m.snow, snows);
  inst(g, geo('cone5', () => new THREE.ConeGeometry(1, 1, 5)), GL('icicle', 0xd8f0ff, 0x5a9ad0, 0.3), icicles);
  inst(g, OCT(), ice, [[-2.85, 0.22, 0.72, 0.22, 0.4, 0.2, 0.4], [2.8, 0.18, -0.62, 0.2, 0.32, 0.2, 1.1], [-1.55, 0.12, 0.78, 0.13, 0.2, 0.13, 2]]);
  out.lights.push({ x: 0, y: 2.2, z: 0.9, color: 0x9fd8ff, power: 0.6 });
  out.colliders.push({ rect: [-3.0, -0.85, 1.28, 1.7] }, { rect: [1.72, -0.85, 1.28, 1.7] });
};

BUILD.igloo = (g, out, m, r) => {
  const R = 1.36, dome = grp(g);
  dome.scale.y = 1.2;
  put(dome, DOME(), C('igcore', 0xb8cce2)).scale.setScalar(R - 0.1);
  const shades = [0xf6f9fe, 0xe4edf8, 0xd6e3f3, 0xeef4fc], items = [];
  [0.13, 0.43, 0.73, 1.03, 1.3].forEach((ph, k) => {
    const rr = R * Math.cos(ph), n = Math.max(4, Math.round((2 * Math.PI * rr) / 0.58)), len = ((2 * Math.PI * rr) / n) * 0.94;
    for (let i = 0; i < n; i++) {
      const th = ((i + (k % 2) * 0.5) / n) * Math.PI * 2;
      if (k < 2 && Math.abs(Math.atan2(Math.sin(th), Math.cos(th))) < 0.42) continue; // the tunnel
      items.push([Math.sin(th) * rr, R * Math.sin(ph), Math.cos(th) * rr, len, R * 0.27, 0.24, eul(-ph, th, 0, 'YXZ'), 0, 0, shades[(i + k) % 4]]);
    }
  });
  items.push([0, R + 0.02, 0, 0.5, 0.14, 0.5, 0, 0, 0, 0xf6f9fe]);
  inst(dome, BOX1(), C('igblock', 0xffffff), items);
  // entrance tunnel (half cylinder along z) with a dark, faintly warm doorway
  const tunM = T('igtun', () => {
    const p = new Painter(16, 16);
    p.rect(0, 0, 16, 16, '#eef4fb');
    for (let y = 0; y < 16; y += 5) { p.hline(0, y, 16, '#c9d9ea'); for (let x = y % 10 ? 2 : 6; x < 16; x += 8) p.vline(x, y, 5, '#c9d9ea'); }
    return tex(p.c, 2, 1);
  });
  put(g, geo('igtun', () => new THREE.CylinderGeometry(0.64, 0.64, 0.8, 10, 1, false, -Math.PI / 2, Math.PI)), tunM, 0, 0, 1.1, 0, -Math.PI / 2);
  glow(put(g, geo('igdoor', () => new THREE.CircleGeometry(0.44, 10, 0, Math.PI)), GL('igdoor', 0x1b2438, 0x3a2410, 0.5), 0, 0, 1.505));
  // lantern post, skis & snow drifts
  put(g, B(0.07, 0.95, 0.07), m.dark, 1.04, 0.475, 1.2);
  put(g, B(0.24, 0.04, 0.04), m.dark, 0.94, 0.93, 1.2);
  lantern(g, out, 0.84, 0.76, 1.2, { s: 0.75 });
  const ski = C('ski', 0xd9433a);
  put(g, B(0.09, 1.25, 0.03), ski, -1.34, 0.6, 0.62, 0.3, -0.2, 0.22);
  put(g, B(0.09, 1.25, 0.03), ski, -1.22, 0.6, 0.72, 0.3, -0.2, 0.18);
  inst(g, ICO(), m.snow, [[-1.1, 0.04, 1.18, 0.34, 0.14, 0.26], [1.12, 0.04, -0.98, 0.32, 0.13, 0.26], [0.62, 0.03, 1.36, 0.22, 0.1, 0.14]]);
  out.lights.push({ x: 0, y: 0.35, z: 1.75, color: 0xffb35c, power: 0.5 });
  out.colliders.push({ x: 0, z: 0, r: 1.45 }, { rect: [-0.66, 0.7, 1.32, 0.8] });
};

BUILD.sled_ramp = (g, out, m, r, seed) => {
  const Y = 1.25, W0 = -1.35, W1 = 0.15, xm = (W0 + W1) / 2;
  // the start platform (north third) with a snowy top & checkered start line
  put(g, TB(3, 0.14, 1.0), [m.dark, m.dark, m.planks, m.dark, m.dark, m.dark], 0, Y - 0.14, -1.0);
  const snowTop = T('sledsnow', () => {
    const p = new Painter(48, 16);
    p.rect(0, 0, 48, 16, '#f1f5fc');
    for (let i = 0; i < 30; i++) p.px((i * 13) % 48, (i * 7) % 16, '#dfe8f4');
    for (let x = 2; x < 24; x++) for (let y = 12; y < 16; y++) p.px(x, y, ((x >> 1) + (y >> 1)) % 2 ? '#2a2433' : '#f4efe4');
    return tex(p.c);
  });
  put(g, B(2.96, 0.07, 0.96), [m.snow, m.snow, snowTop, m.snow, m.snow, m.snow], 0, Y - 0.035, -1.0);
  inst(g, BOX1(), m.dark, [[-1.4, 0.52, -1.42, 0.14, 1.04, 0.14], [1.4, 0.52, -1.42, 0.14, 1.04, 0.14], [-1.4, 0.52, -0.58, 0.14, 1.04, 0.14], [1.4, 0.52, -0.58, 0.14, 1.04, 0.14], [0.3, 0.52, -0.58, 0.12, 1.04, 0.12], [W0 + 0.1, 0.4, 0.1, 0.12, 0.8, 0.12], [W1 - 0.1, 0.4, 0.1, 0.12, 0.8, 0.12]]);
  beam(g, m.dark, 0.38, 0.12, -0.53, 1.34, 0.98, -0.53, 0.07);
  beam(g, m.dark, 0.38, 0.98, -0.53, 1.34, 0.12, -0.53, 0.07);
  // the ramp down to the south: boards, packed snow track, side rails
  const run = 2.0, drop = Y - 0.02, ang = Math.atan2(drop, run), L = Math.hypot(run, drop);
  const rg = grp(g, xm, drop / 2 - 0.05, 0.5);
  rg.rotation.x = ang;
  put(rg, TB(1.5, 0.1, +L.toFixed(3)), [m.dark, m.dark, m.planks, m.dark, m.dark, m.dark]);
  const track = T('sledtrack', () => { const p = new Painter(16, 16); p.rect(0, 0, 16, 16, '#eef4fb'); for (const x of [4, 5, 10, 11]) p.vline(x, 0, 16, x % 2 ? '#d6e3f3' : '#bfd2ea'); for (let i = 0; i < 10; i++) p.px((i * 7) % 16, (i * 5) % 16, '#ffffff'); return tex(p.c, 1, 2); });
  put(rg, B(0.95, 0.05, +(L - 0.05).toFixed(3)), [m.snow, m.snow, track, m.snow, m.snow, m.snow], 0, 0.07, 0);
  for (const s of [-1, 1]) put(rg, B(0.1, 0.24, +(L - 0.3).toFixed(3)), C('sledrail', 0xc8454f), s * 0.72, 0.12, -0.1);
  // the starter's hut (window glows), red roof with snow
  const hx = 0.9, hz = -1.02, hw = 1.1, hd = 0.85, hh = 1.0, hy = Y - 0.07;
  const front = T('sledhut', () => lit(18, 16, (p, q) => {
    p.rect(0, 0, 18, 16, '#9a6a44');
    for (let x = 2; x < 18; x += 3) p.vline(x, 0, 16, '#7a5238');
    p.rect(4, 3, 8, 6, '#5a3b2a'); p.rect(5, 4, 6, 4, '#f3d9a0'); p.vline(8, 4, 4, '#5a3b2a'); p.hline(3, 9, 10, '#c49a64');
    q.rect(5, 4, 6, 4, '#ffc76a'); q.vline(8, 4, 4, '#000000');
  }));
  const side = C('hutside', 0x8a5a3a);
  put(g, B(hw, hh, hd), [side, side, side, side, front, side], hx, hy + hh / 2, hz);
  const roofM = C('sledroof', 0xb0473f), rise = 0.36, ra = 0.62;
  for (const s of [-1, 1]) {
    const sl = put(g, B(1.35, 0.07, 0.62), roofM, hx, hy + hh + rise / 2, hz + s * 0.25, 0, s * ra);
    put(g, B(1.3, 0.05, 0.55), m.snow, hx, sl.position.y + Math.cos(ra) * 0.06, sl.position.z + s * Math.sin(ra) * 0.06, 0, s * ra);
  }
  put(g, B(0.05, 0.05, 0.14), m.iron, 1.3, 1.98, hz + hd / 2 + 0.06);
  lantern(g, out, 1.3, 1.84, hz + hd / 2 + 0.12, { s: 0.7 });
  // the red flag at the top of the ramp
  put(g, B(0.06, 1.75, 0.06), m.white, -1.42, Y + 0.875, -0.6);
  const fp = grp(g, -1.42, Y + 1.58, -0.6);
  const flagM = T('sledflag', () => { const p = new Painter(10, 6); p.rect(0, 0, 10, 6, '#d9433a'); p.hline(0, 0, 10, '#e86a5a'); p.rect(3, 2, 3, 2, '#f4efe4'); p.hline(0, 5, 10, '#a8323c'); return tex(p.c); }, { side: THREE.DoubleSide, shadowSide: THREE.DoubleSide });
  put(fp, geo('flag6', () => new THREE.PlaneGeometry(0.6, 0.38)), flagM, 0.31, 0, 0);
  const ph = r() * 6;
  out.anim = (t) => { fp.rotation.y = Math.sin(t * 2.6 + ph) * 0.35 + Math.sin(t * 6.1) * 0.06; };
  out.anim(0);
  inst(g, ICO(), m.snow, [[-1.25, 0.04, 1.28, 0.22, 0.1, 0.16], [0.55, 0.05, 1.3, 0.34, 0.14, 0.18], [1.15, 0.06, 0.4, 0.3, 0.16, 0.34]]);
  out.decks.push({ rect: [-1.5, -1.5, 1.85, 1.0], y: Y });
  for (let i = 0; i < 4; i++) { const z0 = -0.5 + i * 0.5; out.decks.push({ rect: [W0, z0, W1 - W0, 0.5], y: +(Y * (1.5 - (z0 + 0.25)) / 2.0).toFixed(3) }); }
  out.colliders.push({ rect: [0.35, -1.5, 1.15, 0.95] }, { rect: [W0 - 0.1, -0.5, 0.16, 2.0] }, { rect: [W1 - 0.06, -0.5, 0.16, 2.0] }, { x: -1.4, z: -1.42, r: 0.1 }, { x: -1.4, z: -0.58, r: 0.1 });
};

// ---------------------------------------------------------------------------
// Cloud Isles
// ---------------------------------------------------------------------------
const PASTELS = ['#f7c4d8', '#bfeedd', '#d8c8f4', '#c4e0f7', '#fcd5b5', '#fff0b0'];
const marble = () => T('marble', () => {
  const p = new Painter(16, 16), rr = rng(51);
  p.rect(0, 0, 16, 16, '#f1ece4');
  for (let i = 0; i < 4; i++) { let x = rr() * 16, y = rr() * 16; for (let k = 0; k < 8; k++) { p.px(x, y, '#ddd6e0'); x += rr() < 0.5 ? 1 : 0; y += 1; } }
  for (let i = 0; i < 20; i++) p.px(rr() * 16, rr() * 16, '#faf6ef');
  return tex(p.c, 1);
});

BUILD.cloud_temple = (g, out, m, r, seed) => {
  const mb = marble(), white = C('templewhite', 0xf6f2ea), gold = GL('templegold', 0xf2c14e, 0x6a4a10, 0.25), cz = -0.2, CR = 1.75;
  put(g, TB(5.6, 0.25, 4.6), mb, 0, 0.125, 0);
  put(g, TB(4.8, 0.25, 3.8), mb, 0, 0.375, -0.1);
  // a ring of eight columns (open to the south) under a golden dome
  const shafts = [], bases = [], caps = [];
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + (i * Math.PI) / 4, x = Math.sin(a) * CR, z = cz + Math.cos(a) * CR;
    bases.push([x, 0.56, z, 0.46, 0.12, 0.46]);
    shafts.push([x, 1.77, z, 0.36, 2.3, 0.36]);
    caps.push([x, 2.99, z, 0.48, 0.14, 0.48]);
    out.colliders.push({ x, z, r: 0.24 });
  }
  inst(g, BOX1(), white, bases);
  inst(g, CYL(), white, shafts);
  inst(g, BOX1(), white, caps);
  put(g, geo('ctent', () => new THREE.CylinderGeometry(2.05, 2.05, 0.34, 16)), white, 0, 3.23, cz);
  put(g, geo('ctband', () => new THREE.CylinderGeometry(2.08, 2.08, 0.07, 16)), gold, 0, 3.36, cz);
  put(g, geo('ctdrum', () => new THREE.CylinderGeometry(1.6, 1.7, 0.36, 16)), white, 0, 3.58, cz);
  const domeM = T('golddome', () => { const p = new Painter(32, 16); p.rect(0, 0, 32, 16, '#f2c14e'); for (let x = 0; x < 32; x += 4) p.vline(x, 0, 16, '#d9a232'); p.hline(0, 2, 32, '#ffe08a'); p.hline(0, 3, 32, '#ffe08a'); p.hline(0, 15, 32, '#c89030'); return tex(p.c, 2, 1); }, { emissive: 0x6a4a10, emissiveIntensity: 0.25 });
  put(g, DOME(), domeM, 0, 3.76, cz).scale.set(1.6, 1.45, 1.6);
  put(g, ICO(), gold, 0, 5.28, cz).scale.setScalar(0.16);
  put(g, geo('spike', () => new THREE.ConeGeometry(0.07, 0.4, 6)), gold, 0, 5.6, cz);
  const runner = T('ctrunner' + (seed % 6), () => { const p = new Painter(12, 16), R = ramp(PASTELS[(seed + 4) % 6]); p.rect(0, 0, 12, 16, R.m); p.vline(0, 0, 16, '#e0a526'); p.vline(11, 0, 16, '#e0a526'); for (let y = 2; y < 16; y += 5) { p.px(5, y, R.l); p.px(6, y, R.l); p.px(5, y + 1, R.d); p.px(6, y + 1, R.d); } return tex(p.c); });
  glow(put(g, geo('ctrunnerpl', () => new THREE.PlaneGeometry(0.8, 1.6)), runner, 0, 0.505, 0.95, 0, -Math.PI / 2));
  // a floating orb on a pedestal in the middle
  put(g, TB(0.6, 0.7, 0.6), mb, 0, 0.85, cz);
  const orb = glow(put(g, ICO(), GL('templeorb', 0xfff4d0, 0xffe08a, 1.1), 0, 1.55, cz));
  orb.scale.setScalar(0.22);
  // pastel banners hanging from the entablature
  const bcols = [PASTELS[seed % 6], PASTELS[(seed + 2) % 6]], banners = [];
  [-1.35, -0.55, 0.55, 1.35].forEach((a, i) => {
    const pv = grp(g, Math.sin(a) * 2.1, 3.02, cz + Math.cos(a) * 2.1, a);
    pv.rotation.order = 'YXZ';
    put(pv, B(0.5, 0.04, 0.04), gold);
    const col = bcols[i % 2];
    const bm = T('cbanner' + col, () => {
      const p = new Painter(8, 16), R = ramp(col), Gd = '#e0a526';
      p.rect(0, 0, 8, 14, R.m); p.vline(0, 0, 14, R.d); p.vline(7, 0, 14, R.d); p.hline(1, 1, 6, R.l);
      for (let y = 14; y < 16; y++) for (let x = 0; x < 8; x++) if (Math.abs(x - 3.5) > (y - 13) * 1.6) p.px(x, y, R.m);
      p.rect(3, 5, 2, 2, Gd); p.px(3, 4, Gd); p.px(4, 7, Gd); p.px(2, 6, Gd); p.px(5, 5, Gd);
      return tex(p.c);
    }, { alphaTest: 0.5, side: THREE.DoubleSide, shadowSide: THREE.DoubleSide });
    put(pv, geo('cbannerpl', () => new THREE.PlaneGeometry(0.44, 0.95)), bm, 0, -0.5, 0.02);
    banners.push(pv);
  });
  // a little rainbow arching over it all, its feet on two puffy clouds
  [0xf28b8b, 0xf7b27a, 0xfbe38a, 0xa8e0a0, 0x9cd0f4, 0xa8b0f0, 0xd0b4f0].forEach((c, k) => {
    const rad = 2.8 - k * 0.15;
    glow(put(g, geo('rbow' + k, () => new THREE.TorusGeometry(rad, 0.075, 4, 28, Math.PI)), GL('rbow' + k, c, c, 0.3), 0, 2.9, -2.15));
  });
  glow(inst(g, ICO(), GL('cloud', 0xffffff, 0xc8d8f0, 0.25), [[-2.4, 2.85, -2.15, 0.55, 0.34, 0.42], [-1.95, 2.72, -1.95, 0.4, 0.26, 0.34], [2.4, 2.85, -2.15, 0.55, 0.34, 0.42], [1.95, 2.72, -1.95, 0.4, 0.26, 0.34]]));
  const ph = r() * 6;
  out.anim = (t) => {
    orb.position.y = 1.55 + Math.sin(t * 1.4 + ph) * 0.08;
    orb.rotation.y = t * 0.6;
    banners.forEach((b, i) => { b.rotation.x = Math.sin(t * 1.3 + i * 1.7 + ph) * 0.07; });
  };
  out.anim(0);
  out.lights.push({ x: 0, y: 1.6, z: cz + 0.3, color: 0xfff0c0, power: 1.0, lamp: true });
  out.decks.push({ rect: [-2.8, -2.3, 5.6, 4.6], y: 0.25 }, { rect: [-2.4, -2.0, 4.8, 3.8], y: 0.5 });
  out.colliders.push({ x: 0, z: cz, r: 0.4 });
};

BUILD.balloon_dock = (g, out, m, r, seed) => {
  const Y = 0.3;
  const top = T('bdock', () => {
    const p = new Painter(64, 64);
    p.ctx.drawImage(paintPlanks(64, 64, { dir: 'v', color: '#b07b50', seed: 61 }), 0, 0);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const d = Math.hypot(x - 31.5, y - 31.5); if (d > 17 && d < 20) p.px(x, y, d < 18.5 ? '#f2c14e' : '#e0a526'); }
    for (let k = 0; k < 11; k++) { const w = Math.max(0, 5 - Math.floor(k / 2)); p.rect(31.5 - w / 2, 32 + k, w, 1, '#f4efe4'); p.rect(31.5 - w / 2, 31 - k, w, 1, '#f4efe4'); p.rect(32 + k, 31.5 - w / 2, 1, w, '#f4efe4'); p.rect(31 - k, 31.5 - w / 2, 1, w, '#f4efe4'); }
    p.rect(30, 30, 4, 4, '#d9594c');
    return tex(p.c);
  });
  put(g, DB(4, Y, 4), [m.dark, m.dark, top, m.dark, m.dark, m.dark], 0, Y / 2, 0);
  const P = [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]];
  inst(g, geo('post6', () => new THREE.CylinderGeometry(0.5, 0.55, 1, 6)), m.dark, P.map(([x, z]) => [x, Y + 1.15, z, 0.22, 2.3, 0.22]));
  inst(g, geo('coil', () => new THREE.TorusGeometry(1, 0.4, 4, 8)), m.rope, P.map(([x, z]) => [x, Y + 0.18, z, 0.16, 0.16, 0.16, 0, Math.PI / 2]));
  inst(g, BOX1(), m.wood, P.map(([x, z]) => [x, Y + 2.33, z, 0.3, 0.08, 0.3]));
  // mooring ropes sagging between the posts (north, west, east)
  const sag = (x1, z1, x2, z2) => { const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2; beam(g, m.rope, x1, 2.5, z1, mx, 2.05, mz, 0.04); beam(g, m.rope, mx, 2.05, mz, x2, 2.5, z2, 0.04); };
  sag(-1.8, -1.8, 1.8, -1.8); sag(-1.8, -1.8, -1.8, 1.8); sag(1.8, -1.8, 1.8, 1.8);
  // pennants on the two front posts
  const flagM = C('pennant' + (seed % 6), PENNANT[seed % 6], { side: THREE.DoubleSide, shadowSide: THREE.DoubleSide }), flags = [];
  for (const x of [-1.8, 1.8]) {
    put(g, B(0.03, 0.4, 0.03), m.dark, x, Y + 2.57, 1.8);
    const fp = grp(g, x, Y + 2.72, 1.8);
    put(fp, geo('pennant', () => polyGeometry([tri([0, 0.12, 0], [0, -0.12, 0], [0.42, 0, 0])])), flagM);
    flags.push(fp);
  }
  // the ticket sign at the front
  const signT = T('ticketsign', () => {
    const p = new Painter(14, 8);
    p.rect(0, 0, 14, 8, '#5a3b2a'); p.rect(1, 1, 12, 6, '#e9cf9b');
    p.rect(3, 1, 3, 3, '#d9594c'); p.px(2, 2, '#d9594c'); p.px(6, 2, '#d9594c'); p.px(4, 4, '#8e5d3e'); p.px(4, 5, '#8e5d3e'); p.px(3, 5, '#8e5d3e'); p.px(5, 5, '#8e5d3e');
    p.rect(8, 3, 4, 3, '#f2c14e'); p.px(8, 4, '#e9cf9b'); p.px(11, 4, '#e9cf9b'); p.hline(9, 3, 2, '#fff3a6');
    return tex(p.c);
  });
  for (const x of [0.62, 1.38]) put(g, B(0.06, 1.0, 0.06), m.dark, x, Y + 0.5, 1.72);
  put(g, B(0.9, 0.5, 0.06), [m.dark, m.dark, m.dark, m.dark, signT, m.dark], 1.0, Y + 0.95, 1.75);
  // ballast bags & a crate
  inst(g, ICO(), C('burlap', 0xc9a46a), [[-1.45, Y + 0.1, -1.5, 0.2, 0.12, 0.15, 0.3], [-1.18, Y + 0.1, -1.56, 0.2, 0.12, 0.15, -0.2], [-1.32, Y + 0.24, -1.52, 0.19, 0.11, 0.14, 0.9]]);
  put(g, TB(0.45, 0.44, 0.45), m.wood, 1.4, Y + 0.22, -1.45, 0.3);
  for (const s of [-1, 1]) { put(g, B(0.3, 0.04, 0.04), m.iron, s * 1.65, Y + 2.0, 1.8); lantern(g, out, s * 1.52, Y + 1.83, 1.8, { s: 0.75 }); }
  const ph = r() * 6;
  out.anim = (t) => flags.forEach((f, i) => { f.rotation.y = (i ? Math.PI : 0) + Math.sin(t * 2.4 + ph + i) * 0.4; });
  out.anim(0);
  out.decks.push({ rect: [-2, -2, 4, 4], y: Y });
  out.colliders.push(...P.map(([x, z]) => ({ x, z, r: 0.15 })), { rect: [0.55, 1.68, 0.9, 0.12] }, { rect: [-2, -2, 4, 0.15] }, { rect: [-2, -2, 0.15, 4] }, { rect: [1.85, -2, 0.15, 4] }, { x: 1.4, z: -1.45, r: 0.3 }, { x: -1.32, z: -1.52, r: 0.3 });
};

const wickerMat = () => T('wicker', () => {
  const p = new Painter(26, 15);
  p.rect(0, 0, 26, 15, '#c49a64');
  for (let y = 2; y < 15; y++) for (let x = 0; x < 26; x++) { if ((x + (y >> 1) * 2) % 4 === 0) p.px(x, y, '#9a7048'); else if ((x + y) % 4 === 1) p.px(x, y, '#e0bf8a'); }
  p.rect(0, 0, 26, 2, '#6b4330'); p.hline(0, 14, 26, '#6b4330');
  return tex(p.c);
});

BUILD.balloon = (g, out, m, r, seed) => {
  const cols = [['#d9594c', '#f4efe4', '#f2c14e'], ['#3f9b98', '#fff0b0', '#e8883a'], ['#e97d8f', '#f7e3ef', '#8a64c8'], ['#4d7fc4', '#f4efe4', '#d9594c']][seed % 4];
  const envM = T('envelope' + (seed % 4), () => {
    const p = new Painter(24, 22), b = ramp(cols[2]);
    for (let x = 0; x < 24; x++) { const c = ramp((x >> 1) % 2 ? cols[1] : cols[0]); for (let y = 0; y < 22; y++) p.px(x, y, x % 2 ? c.m : c.l); }
    for (let x = 0; x < 24; x++) { p.px(x, 9, b.d); p.px(x, 10, b.m); p.px(x, 11, b.m); p.px(x, 12, b.d); p.px(x, 10 + (x % 4 < 2 ? 0 : 1), b.l); }
    p.hline(0, 21, 24, '#6b4330'); p.hline(0, 0, 24, ramp(cols[0]).d);
    return tex(p.c);
  });
  const prof = [[0.36, 0], [0.55, 0.12], [0.95, 0.45], [1.32, 0.95], [1.55, 1.5], [1.6, 1.95], [1.5, 2.45], [1.2, 2.9], [0.7, 3.25], [0.2, 3.4], [0.01, 3.42]].map(([x, y]) => new THREE.Vector2(x, y));
  const env = grp(g, 0, 2.3, 0);
  put(env, geo('envelope', () => new THREE.LatheGeometry(prof, 12)), envM);
  put(g, geo('loadring', () => new THREE.TorusGeometry(0.38, 0.035, 4, 12)), m.iron, 0, 2.22, 0, 0, Math.PI / 2);
  // the wicker basket (floor at y = 0)
  const wick = wickerMat();
  put(g, B(1.6, 0.1, 1.6), m.dark, 0, -0.05, 0);
  for (const [x, z, ry] of [[0, 0.75, 0], [0, -0.75, Math.PI], [0.75, 0, Math.PI / 2], [-0.75, 0, -Math.PI / 2]]) put(g, B(1.6, 0.95, 0.1), wick, x, 0.375, z, ry);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) beam(g, m.rope, sx * 0.72, 0.85, sz * 0.72, sx * 0.27, 2.22, sz * 0.27, 0.035);
  // burner on an X frame, and its flame
  for (const s of [-1, 1]) beam(g, m.iron, -0.5, 1.5, -0.5 * s, 0.5, 1.5, 0.5 * s, 0.05);
  put(g, geo('burner', () => new THREE.CylinderGeometry(0.12, 0.1, 0.22, 8)), m.iron, 0, 1.62, 0);
  const fl = grp(g, 0, 1.72, 0);
  glow(put(fl, geo('bflame', () => new THREE.ConeGeometry(0.1, 0.36, 6)), m.flame1, 0, 0.18, 0));
  glow(put(fl, geo('bflame2', () => new THREE.ConeGeometry(0.06, 0.24, 6)), m.core, 0, 0.12, 0));
  inst(g, BOX1(), C('burlap', 0xc9a46a), [[0.84, 0.45, 0.35, 0.1, 0.2, 0.14], [0.84, 0.45, -0.35, 0.1, 0.2, 0.14], [-0.84, 0.45, 0.35, 0.1, 0.2, 0.14], [0.35, 0.45, 0.84, 0.14, 0.2, 0.1]]);
  const ph = r() * 6;
  out.anim = (t) => { flick(fl, t, ph); const k = 1 + Math.sin(t * 1.3 + ph) * 0.012; env.scale.set(k, 1, k); };
  out.anim(0);
  out.lights.push({ x: 0, y: 1.9, z: 0.2, color: 0xff9a40, power: 1.2, lamp: true, flicker: true });
};

// ---------------------------------------------------------------------------
// Golden Steppe
// ---------------------------------------------------------------------------
function leafTex(color, seed) {
  const R = ramp(color), p = new Painter(32, 32), rr = rng(seed);
  p.rect(0, 0, 32, 32, R.m);
  for (let i = 0; i < 90; i++) { const x = Math.floor(rr() * 32), y = Math.floor(rr() * 32), v = rr(); if (v < 0.45) { p.px(x, y, R.d); p.px(x + 1, y, R.d); } else if (v < 0.8) p.px(x, y, R.l); else { p.px(x, y, R.h); p.px(x, y + 1, R.l); } }
  return tex(p.c, 4, 2);
}
const POT = () => geo('pot', () => new THREE.LatheGeometry([[0.01, 0], [0.14, 0.02], [0.22, 0.12], [0.24, 0.25], [0.18, 0.38], [0.1, 0.45], [0.13, 0.5], [0.09, 0.5]].map(([x, y]) => new THREE.Vector2(x, y)), 9));
const potMat = () => T('pot', () => { const p = new Painter(16, 8); p.rect(0, 0, 16, 8, '#c8704a'); p.hline(0, 3, 16, '#f2e0c0'); p.hline(0, 4, 16, '#a85a3a'); for (let x = 0; x < 16; x += 4) p.px(x, 3, '#3f9b98'); p.hline(0, 7, 16, '#a85a3a'); return tex(p.c, 2, 1); });

BUILD.yurt = (g, out, m, r, seed) => {
  const v = seed % 4, [c1, c2] = [['#c8454f', '#f2c14e'], ['#3f6f9e', '#f4efe4'], ['#3f9b98', '#e8883a'], ['#6d4a8a', '#ffd66b']][v];
  const wallM = T('yurtwall' + v, () => {
    const p = speckle(64, 20, '#efe3cc', 71, 0.12), A = ramp(c1), Bc = ramp(c2);
    p.hline(0, 4, 64, '#8e5d3e');
    p.rect(0, 6, 64, 6, A.m); p.hline(0, 6, 64, A.d); p.hline(0, 11, 64, A.d);
    for (let x = 0; x < 64; x += 6) { p.px(x + 2, 7, Bc.m); p.px(x + 1, 8, Bc.m); p.px(x + 3, 8, Bc.m); p.px(x + 2, 9, Bc.m); p.px(x + 2, 8, Bc.l); p.px(x + 5, 10, Bc.d); }
    p.hline(0, 15, 64, '#8e5d3e'); p.hline(0, 19, 64, '#b8a888');
    return tex(p.c, 2, 1);
  });
  put(g, geo('yurtwall', () => new THREE.CylinderGeometry(1.36, 1.38, 1.2, 14)), wallM, 0, 0.6, 0);
  const roofM = T('yurtroof' + v, () => { const p = speckle(64, 12, '#e8dcc4', 72, 0.1), A = ramp(c1); for (let x = 0; x < 64; x += 8) { p.vline(x, 0, 12, A.m); p.vline(x + 1, 0, 12, A.d); } p.rect(0, 10, 64, 2, A.m); return tex(p.c, 1, 1); });
  put(g, geo('yurtroof', () => new THREE.CylinderGeometry(0.32, 1.55, 0.72, 14)), roofM, 0, 1.56, 0);
  put(g, geo('yurtcrown', () => new THREE.CylinderGeometry(0.36, 0.36, 0.12, 10)), m.dark, 0, 1.96, 0);
  put(g, geo('yurthole', () => new THREE.CylinderGeometry(0.26, 0.26, 0.02, 10)), m.hole, 0, 2.03, 0);
  // painted door, rolled-up felt flap
  const doorT = T('yurtdoor' + v, () => { const p = new Painter(11, 15), A = ramp(c1), Bc = ramp(c2); p.rect(0, 0, 11, 15, A.d); p.rect(1, 1, 9, 13, A.m); p.rect(3, 3, 5, 4, Bc.m); p.rect(3, 9, 5, 3, Bc.m); p.px(5, 5, A.m); p.px(5, 10, A.m); p.hline(1, 1, 9, A.l); return tex(p.c); });
  put(g, B(0.86, 1.0, 0.1), m.dark, 0, 0.5, 1.36);
  put(g, B(0.7, 0.92, 0.1), [m.dark, m.dark, m.dark, m.dark, doorT, m.dark], 0, 0.46, 1.39);
  put(g, geo('yurtflap', () => new THREE.CylinderGeometry(0.08, 0.08, 0.84, 6)), C('felt', 0xe8dcc4), 0, 1.06, 1.42, 0, 0, Math.PI / 2);
  // pots, firewood, a lantern post & smoke from the crown
  inst(g, POT(), potMat(), [[1.08, 0, 1.06, 0.8, 0.8, 0.8], [-1.12, 0, 1.0, 0.65, 0.7, 0.65, 1]]);
  inst(g, geo('log', () => new THREE.CylinderGeometry(0.08, 0.08, 0.7, 6)), C('logbark', 0x7a5238), [[-1.25, 0.08, -0.95, 1, 1, 1, 0.9, 0, Math.PI / 2], [-1.1, 0.08, -1.08, 1, 1, 1, 0.9, 0, Math.PI / 2], [-1.18, 0.22, -1.0, 1, 1, 1, 0.9, 0, Math.PI / 2]]);
  put(g, B(0.06, 1.3, 0.06), m.dark, 1.02, 0.65, 1.12);
  put(g, B(0.22, 0.04, 0.04), m.dark, 0.93, 1.28, 1.12);
  lantern(g, out, 0.84, 1.1, 1.12, { s: 0.7 });
  out.chimneys.push({ x: 0, y: 2.08, z: 0, smoke: 'always', seed });
  out.colliders.push({ x: 0, z: 0, r: 1.45 });
};

BUILD.baobab = (g, out, m, r) => {
  const barkM = T('baobark', () => { const p = speckle(16, 16, '#a08878', 81, 0.2); for (let x = 1; x < 16; x += 4) { p.vline(x, 0, 16, '#8a7262'); p.vline(x + 1, (x * 3) % 16, 5, '#b8a090'); } return tex(p.c, 4, 2); });
  const prof = [[1.15, 0], [1.32, 0.35], [1.36, 1.0], [1.28, 1.8], [1.05, 2.6], [0.78, 3.3], [0.62, 3.9], [0.58, 4.3], [0.02, 4.35]].map(([x, y]) => new THREE.Vector2(x, y));
  put(g, geo('baotrunk', () => new THREE.LatheGeometry(prof, 12)), barkM);
  inst(g, BOX1(), barkM, [0.4, 1.9, 3.5, 5.1].map((a) => [Math.sin(a) * 1.2, 0.1, Math.cos(a) * 1.2, 0.34, 0.32, 0.75, a, 0.25]));
  // stubby branches, each ending in a flat tuft; one wide tuft on top
  const leafM = T('baoleaf', () => leafTex('#86a64e', 91)), tufts = [], pods = [], a0 = r() * 6;
  for (let i = 0; i < 6; i++) {
    const a = a0 + (i / 6) * Math.PI * 2 + (r() - 0.5) * 0.4, L = 1.5 + r() * 0.5, el = 0.45 + r() * 0.3;
    const dx = Math.sin(a) * Math.cos(el), dy = Math.sin(el), dz = Math.cos(a) * Math.cos(el);
    const x0 = dx * 0.35, y0 = 4.1, z0 = dz * 0.35, x1 = x0 + dx * L, y1 = y0 + dy * L, z1 = z0 + dz * L;
    const b = put(g, geo('baobranch', () => new THREE.CylinderGeometry(0.13, 0.24, 1, 6)), barkM, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    b.quaternion.copy(aim(dx, dy, dz));
    b.scale.set(1, L, 1);
    tufts.push([x1, y1 + 0.12, z1, 0.75 + r() * 0.3, 0.26, 0.65 + r() * 0.25, r() * 3]);
    if (i % 2 === 0) pods.push([x1 * 0.85, y1 - 0.55, z1 * 0.85]);
  }
  tufts.push([0, 5.05, 0, 0.95, 0.3, 0.85, 0]);
  inst(g, ICO(), leafM, tufts);
  for (const [x, y, z] of pods) beam(g, C('podstalk', 0x6b5a3a), x, y + 0.45, z, x, y + 0.1, z, 0.025);
  inst(g, ICO(), C('pod', 0xb8b48a), pods.map(([x, y, z]) => [x, y, z, 0.1, 0.2, 0.1]));
  out.colliders.push({ x: 0, z: 0, r: 1.35 });
};

// ---------------------------------------------------------------------------
// Red Canyon
// ---------------------------------------------------------------------------
const redRock = () => T('redrock', () => {
  const p = new Painter(16, 16), rr = rng(97);
  ['#c8704a', '#c8704a', '#c8704a', '#bc6442', '#bc6442', '#d4845a', '#c8704a', '#c8704a', '#c8704a', '#c8704a', '#b85a3c', '#b85a3c', '#d4845a', '#d4845a', '#c8704a', '#c8704a'].forEach((c, y) => p.hline(0, y, 16, c));
  for (let i = 0; i < 10; i++) { const x = rr() * 14, y = Math.floor(rr() * 16); p.hline(x, y, 2 + rr() * 3, rr() < 0.5 ? '#a84a34' : '#e0a070'); }
  return tex(p.c, 1);
});

BUILD.mine_entrance = (g, out, m, r) => {
  const rock = redRock(), dark = C('tunnel', 0x2a1c1e);
  put(g, TB(4.0, 3.0, 0.5), rock, 0, 1.5, -0.75);
  // the mouth: a dark back, walls & ceiling, an inner frame deeper in the dark
  put(g, B(1.8, 2.0, 0.6), m.hole, 0, 1.0, -0.65);
  for (const s of [-1, 1]) put(g, B(0.1, 2.0, 0.5), dark, s * 0.9, 1.0, -0.1);
  put(g, B(1.8, 0.1, 0.5), dark, 0, 2.0, -0.1);
  const inner = C('minewood', 0x4a3024);
  for (const s of [-1, 1]) put(g, B(0.16, 1.85, 0.16), inner, s * 0.74, 0.925, -0.3);
  put(g, B(1.64, 0.18, 0.18), inner, 0, 1.85, -0.3);
  // rocks heaped round the portal
  inst(g, ROCK(), C('canyonrockw', 0xffffff), [[-1.45, 0.7, -0.15, 0.5, 0.75, 0.55, 0.1, 0, 0, 0xb8603e], [-1.5, 1.9, -0.35, 0.45, 0.65, 0.5, 3.0, 0, 0, 0xc8704a], [1.45, 0.8, -0.1, 0.48, 0.85, 0.55, 3.2, 0, 0, 0xa84a34], [1.5, 2.0, -0.3, 0.44, 0.6, 0.5, 0.1, 0, 0, 0xc46a44], [0, 2.75, -0.35, 1.35, 0.5, 0.58, 0.05, 0, 0, 0xb85a3c], [-0.95, 2.6, -0.4, 0.6, 0.45, 0.5, 1.5, 0, 0, 0xd07a50], [1.0, 2.62, -0.4, 0.55, 0.42, 0.5, 3.1, 0, 0, 0xc8704a]]);
  // timber portal & sign
  for (const s of [-1, 1]) put(g, TB(0.24, 2.1, 0.24), m.wood, s * 1.0, 1.05, 0.3);
  put(g, TB(2.5, 0.3, 0.3), m.wood, 0, 2.2, 0.3);
  beam(g, m.wood, -1.0, 1.55, 0.36, -0.55, 2.05, 0.36, 0.12);
  beam(g, m.wood, 1.0, 1.55, 0.36, 0.55, 2.05, 0.36, 0.12);
  const signT = T('minesign', () => { const p = new Painter(14, 6), h = '#8e5d3e', s = '#5a5866'; p.rect(0, 0, 14, 6, '#5a3b2a'); p.rect(1, 1, 12, 4, '#d8b078'); for (let k = 0; k < 4; k++) { p.px(4 + k, 1 + k, h); p.px(9 - k, 1 + k, h); } p.hline(2, 1, 4, s); p.hline(8, 1, 4, s); p.px(2, 2, s); p.px(11, 2, s); return tex(p.c); });
  put(g, B(0.9, 0.36, 0.06), [m.dark, m.dark, m.dark, m.dark, signT, m.dark], 0, 2.58, 0.42);
  // rails running out of the mouth
  inst(g, BOX1(), m.dark, [-0.75, -0.4, -0.05, 0.3, 0.6, 0.9].map((z) => [0, 0.03, z, 0.95, 0.06, 0.16]));
  for (const x of [-0.32, 0.32]) put(g, B(0.05, 0.06, 2.0), m.iron, x, 0.08, 0);
  // a crate of ore
  put(g, TB(0.5, 0.44, 0.44), m.wood, 1.45, 0.22, 0.65, 0.2);
  inst(g, ROCK(), C('ore', 0xffffff, { emissive: 0x3a2000, emissiveIntensity: 0.3 }), [[1.35, 0.5, 0.62, 0.1, 0.08, 0.1, 0, 0, 0, 0xf2c14e], [1.52, 0.5, 0.7, 0.09, 0.07, 0.09, 1, 0, 0, 0xe8883a], [1.46, 0.53, 0.56, 0.08, 0.07, 0.08, 2, 0, 0, 0xf2c14e]]);
  // the hanging lantern (sways a little)
  const pv = grp(g, 0.72, 2.05, 0.46);
  put(pv, B(0.02, 0.26, 0.02), m.iron, 0, -0.13, 0);
  lantern(pv, out, 0, -0.38, 0, { s: 0.8, lx: 0.72, ly: 1.67, lz: 0.46, flicker: true });
  const ph = r() * 6;
  out.anim = (t) => { pv.rotation.z = Math.sin(t * 1.2 + ph) * 0.08; };
  out.anim(0);
  out.lights.push({ x: 0, y: 1.0, z: 0.1, color: 0xffa050, power: 0.5 });
  out.colliders.push({ rect: [-2.0, -1.0, 1.1, 2.0] }, { rect: [0.9, -1.0, 1.1, 2.0] }, { rect: [-0.9, -1.0, 1.8, 0.65] });
};

BUILD.water_tower = (g, out, m, r) => {
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) beam(g, m.wood, sx * 0.8, 0, sz * 0.8, sx * 0.62, 2.45, sz * 0.62, 0.14);
  const yb = 1.2, rb = 0.71;
  beam(g, m.dark, -rb, yb, rb, rb, yb, rb, 0.08); beam(g, m.dark, -rb, yb, -rb, rb, yb, -rb, 0.08);
  beam(g, m.dark, -rb, yb, -rb, -rb, yb, rb, 0.08); beam(g, m.dark, rb, yb, -rb, rb, yb, rb, 0.08);
  beam(g, m.dark, -0.78, 0.1, 0.78, 0.64, 2.3, 0.64, 0.07); beam(g, m.dark, 0.78, 0.1, 0.78, -0.64, 2.3, 0.64, 0.07);
  put(g, TB(1.9, 0.1, 1.9), [m.dark, m.dark, m.planks, m.dark, m.dark, m.dark], 0, 2.5, 0);
  const stave = T('staves', () => { const p = new Painter(16, 16); p.rect(0, 0, 16, 16, '#9a6a44'); for (let x = 0; x < 16; x += 2) p.vline(x, 0, 16, x % 4 ? '#8a5a3a' : '#7a5238'); for (let i = 0; i < 10; i++) p.px((i * 7) % 16, (i * 5) % 16, '#b07b50'); return tex(p.c, 5, 1); });
  put(g, geo('tank', () => new THREE.CylinderGeometry(0.82, 0.82, 1.2, 14)), stave, 0, 3.15, 0);
  for (const y of [2.78, 3.5]) put(g, geo('hoop', () => new THREE.CylinderGeometry(0.845, 0.845, 0.06, 14, 1, true)), m.iron, 0, y, 0);
  put(g, geo('tankroof', () => new THREE.ConeGeometry(0.98, 0.5, 14)), T('tankroof', () => tex(paintRoof(32, 12, '#b0473f', { seed: 8 }), 2, 1)), 0, 4.0, 0);
  put(g, ICO(), m.gold, 0, 4.3, 0).scale.setScalar(0.07);
  // ladder up the south side
  for (const x of [-0.2, 0.2]) put(g, B(0.05, 2.95, 0.05), m.dark, x, 1.475, 0.97);
  inst(g, BOX1(), m.wood, Array.from({ length: 9 }, (_, i) => [0, 0.3 + i * 0.29, 0.97, 0.4, 0.04, 0.05]));
  lantern(g, out, 0.8, 2.74, 0.8, { s: 0.75 });
  out.colliders.push({ x: -0.8, z: -0.8, r: 0.15 }, { x: 0.8, z: -0.8, r: 0.15 }, { x: -0.8, z: 0.8, r: 0.15 }, { x: 0.8, z: 0.8, r: 0.15 }, { rect: [-0.25, 0.9, 0.5, 0.12] });
};

BUILD.rock_arch = (g, out, m, r) => {
  const rock = redRock();
  for (const s of [-1, 1]) {
    put(g, TB(1.3, 1.1, 1.6), rock, s * 2.3, 0.55, (r() - 0.5) * 0.1, (r() - 0.5) * 0.2);
    put(g, TB(1.1, 0.9, 1.4), rock, s * 2.28, 1.4, (r() - 0.5) * 0.12, (r() - 0.5) * 0.25);
  }
  archSegs(g, rock, { Rx: 2.25, Ry: 1.9, legH: 1.3, N: 9, thick: (c) => 0.7 + 0.55 * Math.abs(c), depth: (s) => 1.4 - 0.3 * s, jitter: 0.14, r });
  inst(g, ICO(), C('drybush', 0x9a9a4a), [[-0.3, 3.6, 0.08, 0.34, 0.16, 0.3], [0.35, 3.58, -0.12, 0.24, 0.13, 0.2]]);
  inst(g, ROCK(), C('canyonrockw', 0xffffff), [[-1.3, 0.16, 0.72, 0.3, 0.22, 0.26, 0.4, 0, 0, 0xb85a3c], [2.6, 0.14, 0.82, 0.25, 0.18, 0.2, 1, 0, 0, 0xc8704a], [-2.72, 0.12, -0.78, 0.2, 0.15, 0.2, 2, 0, 0, 0xa84a34]]);
  out.colliders.push({ rect: [-3.0, -0.8, 1.35, 1.6] }, { rect: [1.65, -0.8, 1.35, 1.6] });
};

// ---------------------------------------------------------------------------
// Sunscorch Dunes
// ---------------------------------------------------------------------------
const sandstone = () => T('sandstone', () => {
  const p = new Painter(32, 32), rr = rng(44);
  p.rect(0, 0, 32, 32, '#e2bf86');
  for (let y = 0; y < 32; y += 4) {
    p.hline(0, y, 32, '#efd3a0'); p.hline(0, y + 3, 32, '#c9a26a');
    for (let x = (y / 4) % 2 ? 4 : 0; x < 32; x += 8) p.vline(x, y + 1, 2, '#c9a26a');
  }
  for (let i = 0; i < 40; i++) p.px(rr() * 32, rr() * 32, rr() < 0.5 ? '#d4ae74' : '#ecd0a0');
  return tex(p.c, 1);
});
const TURQ = () => GL('turq', 0x3fb8b0, 0x1a5a58, 0.3);

BUILD.sand_temple = (g, out, m, r) => {
  const ss = sandstone(), turq = TURQ(), stepM = C('templestep', 0xe6c48e);
  // three tiers (x half-widths, z ranges, heights)
  const tiers = [[3.8, -3.4, 1.8, 0, 1.4], [2.8, -3.0, 1.2, 1.4, 2.7], [1.8, -2.6, 0.6, 2.7, 3.9]];
  for (const [hw, z0, z1, y0, y1] of tiers) {
    put(g, TB(hw * 2, y1 - y0, z1 - z0, 2), ss, 0, (y0 + y1) / 2, (z0 + z1) / 2);
    put(g, B(hw * 2 + 0.04, 0.12, 0.04), turq, 0, y1 - 0.16, z1 + 0.01);
  }
  // carved turquoise glyph tiles on the tier fronts (either side of the stair) + the obelisk's
  const glyphs = [];
  for (const x of [1.5, 2.3, 3.1]) glyphs.push([x, 0.72, 1.82, 0.32, 0.32, 0.05], [-x, 0.72, 1.82, 0.32, 0.32, 0.05]);
  for (const x of [1.45, 2.2]) glyphs.push([x, 2.05, 1.22, 0.3, 0.3, 0.05], [-x, 2.05, 1.22, 0.3, 0.3, 0.05]);
  for (const y of [0.9, 1.5, 2.1]) glyphs.push([-2.6, y, 2.93, 0.18, 0.18, 0.04]);
  inst(g, BOX1(), turq, glyphs);
  // the south stair up to the top platform, with balustrades
  const N = 15, rise = 3.9 / N, run = 2.9 / N, steps = [];
  for (let i = 0; i < N; i++) {
    const zf = 3.5 - i * run, d = zf - 0.6;
    steps.push([0, i * rise + rise / 2, zf - d / 2, 1.6, rise, d]);
    out.decks.push({ rect: [-0.8, +(zf - run).toFixed(3), 1.6, +run.toFixed(3)], y: +((i + 1) * rise).toFixed(3) });
  }
  inst(g, BOX1(), stepM, steps);
  for (const s of [-1, 1]) beam(g, C('balustrade', 0xd9ae72), s * 0.95, 0.12, 3.4, s * 0.95, 4.05, 0.62, 0.3, 0.3);
  // the shrine on top: dark doorway in a turquoise frame, a glowing gem
  put(g, TB(2.2, 1.1, 1.4, 2), ss, 0, 4.45, -1.7);
  put(g, TB(2.5, 0.16, 1.7, 2), ss, 0, 5.08, -1.7);
  put(g, B(0.9, 1.0, 0.06), turq, 0, 4.4, -0.99);
  put(g, B(0.66, 0.84, 0.06), m.hole, 0, 4.33, -0.96);
  glow(put(g, OCT(), GL('templegem', 0x7ff0e0, 0x3fd0c8, 1.0), 0, 4.95, -0.92)).scale.set(0.1, 0.14, 0.06);
  // a cat-sphinx lying beside the stair, facing south
  const cat = C('sphinx', 0xe3be84), cz = 2.7, cx = 2.45;
  put(g, TB(1.3, 0.36, 1.5, 2), ss, cx, 0.18, cz);
  put(g, B(0.72, 0.5, 1.0), cat, cx, 0.6, cz - 0.1);
  put(g, B(0.8, 0.56, 0.5), cat, cx, 0.64, cz - 0.42);
  put(g, B(0.52, 0.14, 0.5), cat, cx, 0.43, cz + 0.52);
  const face = T('sphinxface', () => { const p = new Painter(10, 9), t = '#3fb8b0'; p.rect(0, 0, 10, 9, '#e3be84'); p.rect(2, 3, 2, 1, t); p.rect(6, 3, 2, 1, t); p.px(3, 3, '#2a2433'); p.px(6, 3, '#2a2433'); p.px(4, 5, '#c87a6a'); p.px(5, 5, '#c87a6a'); p.px(4, 6, '#8a6a4a'); p.px(5, 6, '#8a6a4a'); p.px(3, 7, '#8a6a4a'); p.px(6, 7, '#8a6a4a'); return tex(p.c); });
  put(g, B(0.6, 0.54, 0.46), [cat, cat, cat, cat, face, cat], cx, 1.12, cz + 0.28);
  const nemes = T('nemes', () => { const p = new Painter(12, 8); for (let x = 0; x < 12; x++) p.vline(x, 0, 8, x % 3 ? '#3fb8b0' : '#f2c14e'); return tex(p.c); });
  put(g, B(0.72, 0.62, 0.3), nemes, cx, 1.08, cz + 0.02);
  for (const s of [-1, 1]) put(g, geo('ear', () => new THREE.ConeGeometry(0.1, 0.24, 4)), cat, cx + s * 0.19, 1.48, cz + 0.26, Math.PI / 4);
  put(g, B(0.62, 0.08, 0.44), turq, cx, 0.86, cz + 0.28);
  put(g, B(0.1, 0.08, 0.7), cat, cx + 0.42, 0.42, cz - 0.3, 0.3);
  // an obelisk on the other side & two braziers at the foot of the stair
  put(g, TB(0.42, 2.3, 0.42, 2), ss, -2.6, 1.15, 2.7);
  put(g, geo('pyramidion', () => new THREE.ConeGeometry(0.31, 0.36, 4)), m.gold, -2.6, 2.48, 2.7, Math.PI / 4);
  const fires = [];
  for (const s of [-1, 1]) {
    put(g, B(0.24, 0.6, 0.24), C('bronze', 0x8a6a3a), s * 1.3, 0.3, 3.2);
    put(g, geo('bowl', () => new THREE.CylinderGeometry(0.28, 0.14, 0.2, 8)), C('bronze', 0x8a6a3a), s * 1.3, 0.7, 3.2);
    fires.push(flames(g, s * 1.3, 0.72, 3.2, 0.8));
    out.lights.push({ x: s * 1.3, y: 1.2, z: 3.35, color: 0xff9a40, power: 1.3, lamp: true, flicker: true });
  }
  out.anim = (t) => fires.forEach((f, i) => flick(f, t, i * 2.3));
  out.anim(0);
  out.lights.push({ x: 0, y: 4.5, z: -0.6, color: 0x7ff0e0, power: 0.7 });
  out.decks.push({ rect: [-1.8, -1.0, 3.6, 1.6], y: 3.9 });
  out.colliders.push({ rect: [-3.8, -3.4, 2.95, 5.2] }, { rect: [0.85, -3.4, 2.95, 5.2] }, { rect: [-0.85, -3.4, 1.7, 2.4] }, { rect: [-1.12, 1.8, 0.3, 1.75] }, { rect: [0.82, 1.8, 0.3, 1.75] }, { rect: [1.8, 1.95, 1.3, 1.5] }, { x: -2.6, z: 2.7, r: 0.35 }, { x: -1.3, z: 3.2, r: 0.25 }, { x: 1.3, z: 3.2, r: 0.25 });
};

BUILD.oasis_tent = (g, out, m, r, seed) => {
  const v = seed % 4, [c1, c2] = [['#fbf1dc', '#3f9b98'], ['#fbf1dc', '#c8454f'], ['#f2c14e', '#3f5f9e'], ['#fbf1dc', '#e8883a']][v];
  const awM = T('oasisawn' + v, () => tex(paintAwning(48, 34, c1, c2)), { alphaTest: 0.5, side: THREE.DoubleSide, shadowSide: THREE.DoubleSide });
  put(g, geo('oasisawn', () => polyGeometry([quad([-1.5, 1.85, 0.95], [1.5, 1.85, 0.95], [1.5, 2.15, -0.95], [-1.5, 2.15, -0.95])])), awM);
  const backM = T('oasisback' + v, () => { const p = new Painter(48, 34), A = ramp(c1), Bc = ramp(c2); for (let x = 0; x < 48; x++) p.vline(x, 0, 34, Math.floor(x / 4) % 2 ? Bc.m : A.m); p.rect(0, 31, 48, 3, Bc.d); p.hline(0, 0, 48, Bc.d); return tex(p.c); }, { side: THREE.DoubleSide, shadowSide: THREE.DoubleSide });
  put(g, geo('oasisback', () => new THREE.PlaneGeometry(3.0, 2.15)), backM, 0, 1.075, -0.92);
  for (const [x, z, h] of [[-1.45, 0.9, 1.85], [1.45, 0.9, 1.85], [-1.45, -0.9, 2.15], [1.45, -0.9, 2.15]]) put(g, B(0.08, h, 0.08), m.dark, x, h / 2, z);
  inst(g, ICO(), m.gold, [[-1.45, 1.9, 0.9, 0.07, 0.07, 0.07], [1.45, 1.9, 0.9, 0.07, 0.07, 0.07]]);
  // rugs, cushions, a low table with a teapot, pots
  const rug = T('rug1', () => { const p = new Painter(36, 22); p.rect(0, 0, 36, 22, '#3f4f8a'); p.rect(2, 2, 32, 18, '#a8323c'); for (let y = 4; y < 18; y += 4) for (let x = 5; x < 32; x += 6) { p.px(x, y, '#f2c14e'); p.px(x - 1, y + 1, '#f2c14e'); p.px(x + 1, y + 1, '#f2c14e'); p.px(x, y + 2, '#f2c14e'); } for (let x = 0; x < 36; x += 2) { p.px(x, 0, '#f4efe4'); p.px(x, 21, '#f4efe4'); } return tex(p.c); });
  glow(put(g, geo('rug1', () => new THREE.PlaneGeometry(2.2, 1.35)), rug, 0, 0.012, 0.05, 0, -Math.PI / 2));
  const rug2 = T('rug2', () => { const p = new Painter(18, 12); p.rect(0, 0, 18, 12, '#d9a232'); p.rect(1, 1, 16, 10, '#3f9b98'); p.rect(6, 4, 6, 4, '#f4efe4'); p.rect(7, 5, 4, 2, '#c8454f'); return tex(p.c); });
  glow(put(g, geo('rug2', () => new THREE.PlaneGeometry(1.1, 0.75)), rug2, 0.9, 0.02, 0.5, 0, -Math.PI / 2, 0.25));
  inst(g, BOX1(), C('cushion', 0xffffff), [[-0.55, 0.09, -0.42, 0.5, 0.16, 0.45, 0.2, 0, 0, 0xf2c14e], [0.25, 0.09, -0.5, 0.5, 0.16, 0.45, -0.15, 0, 0, 0x3f9b98], [-1.0, 0.09, 0.3, 0.45, 0.15, 0.45, 0.5, 0, 0, 0xc8454f]]);
  put(g, TB(0.62, 0.2, 0.42), m.dark, -0.1, 0.1, 0.22);
  put(g, ICO(), m.gold, -0.1, 0.3, 0.22).scale.set(0.11, 0.09, 0.11);
  put(g, B(0.12, 0.03, 0.03), m.gold, 0.0, 0.33, 0.22, 0, 0, 0.5);
  inst(g, POT(), potMat(), [[-1.12, 0, -0.62, 0.85, 0.9, 0.85], [-0.78, 0, -0.72, 0.6, 0.65, 0.6, 1], [1.15, 0, -0.6, 0.9, 1.0, 0.9, 2]]);
  inst(g, BOX1(), m.leaf, [0, 1.3, 2.6, 3.9, 5.2].map((a) => [1.15 + Math.sin(a) * 0.14, 0.62, -0.6 + Math.cos(a) * 0.14, 0.06, 0.34, 0.14, a, 0.5]));
  // a brass lantern hanging from the front edge
  put(g, B(0.02, 0.2, 0.02), m.iron, -1.2, 1.74, 0.88);
  lantern(g, out, -1.2, 1.52, 0.88, { s: 0.8, mat: GL('brasslamp', 0xffe0a0, 0xffa040, 1.0) });
  out.colliders.push({ x: -1.45, z: 0.9, r: 0.1 }, { x: 1.45, z: 0.9, r: 0.1 }, { rect: [-1.5, -1.0, 3.0, 0.16] }, { x: -1.0, z: -0.65, r: 0.28 }, { x: 1.15, z: -0.6, r: 0.25 });
};

BUILD.worm_bones = (g, out, m, r) => {
  const bone = C('bone', 0xeee2c8), sand = C('drift', 0xe8c98a);
  // ribs: half-rings across the body, growing towards the head (east)
  const ribs = [], feet = [], spine = [];
  const xs = [-3.2, -2.4, -1.6, -0.8, 0.0, 0.8, 1.6], rs = [0.72, 0.9, 1.04, 1.15, 1.23, 1.28, 1.3];
  xs.forEach((x, i) => {
    const R = rs[i], lean = -0.12 - i * 0.02;
    ribs.push([x, -0.15, 0, R, R * 1.55, R, eul(0, Math.PI / 2 + 0.42, lean, 'ZYX')]);
    const top = -0.15 + R * 1.55;
    spine.push([x + Math.sin(lean) * -top * 0.4, top + 0.08, 0, 0.36, 0.26, 0.42, 0, 0, 0.2]);
    const fx = Math.sin(0.42) * R, fz = Math.cos(0.42) * R * 0.95;
    feet.push([x + fx, 0.05, fz, 0.42, 0.16, 0.26], [x - fx, 0.05, -fz, 0.42, 0.16, 0.26]);
    out.colliders.push({ x: x + fx, z: fz, r: 0.2 }, { x: x - fx, z: -fz, r: 0.2 });
  });
  inst(g, geo('rib', () => new THREE.TorusGeometry(1, 0.085, 5, 12, Math.PI)), bone, ribs);
  for (let i = 0; i < 3; i++) spine.push([-3.5 - i * 0.18, 0.3 - i * 0.12, 0.05 * i, 0.26 - i * 0.05, 0.2 - i * 0.04, 0.3 - i * 0.05, i]);
  inst(g, BOX1(), bone, spine);
  // the skull, half buried, its round toothy maw facing south-east
  const sk = put(g, ICO(), bone, 2.75, 0.3, 0.0);
  sk.scale.set(1.0, 0.95, 0.98);
  const ph = 0.6, n = new THREE.Vector3(Math.sin(ph), 0, Math.cos(ph)), mc = new THREE.Vector3(2.75, 0.45, 0).addScaledVector(n, 0.82);
  const e2 = new THREE.Vector3(Math.cos(ph), 0, -Math.sin(ph));
  put(g, geo('maw', () => new THREE.TorusGeometry(0.55, 0.13, 6, 14)), bone, mc.x, mc.y, mc.z, ph);
  put(g, geo('throat', () => new THREE.CircleGeometry(0.5, 12)), m.hole, mc.x - n.x * 0.02, mc.y, mc.z - n.z * 0.02, ph);
  const teeth = [];
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2, rad = new THREE.Vector3(0, Math.cos(a), 0).addScaledVector(e2, Math.sin(a));
    teeth.push([mc.x + rad.x * 0.42 + n.x * 0.05, mc.y + rad.y * 0.42, mc.z + rad.z * 0.42 + n.z * 0.05, 0.07, 0.24, 0.07, aim(-rad.x, -rad.y, -rad.z)]);
  }
  inst(g, geo('cone5', () => new THREE.ConeGeometry(1, 1, 5)), C('tooth', 0xfff6e0), teeth);
  inst(g, ICO(), sand, [...feet, [2.75, 0.02, 0, 1.15, 0.3, 1.1], [-3.45, 0.02, 0, 0.45, 0.16, 0.4], [2.0, 0.03, 1.0, 0.5, 0.16, 0.36]]);
  out.colliders.push({ x: 2.75, z: 0, r: 1.0 });
};

// ---------------------------------------------------------------------------
// Sunken City
// ---------------------------------------------------------------------------
const mossStone = () => T('mossstone', () => {
  const p = speckle(32, 32, '#a8b0a4', 111, 0.15), rr = rng(112);
  for (let x = 0; x < 32; x += 8) p.vline(x, 0, 32, '#8e968c');
  for (let i = 0; i < 9; i++) { const x = Math.floor(rr() * 31), L = 4 + Math.floor(rr() * 14); for (let y = 0; y < L; y++) { p.px(x, y, y < L - 2 ? '#6f9150' : '#86a060'); if (y < L / 2) p.px(x + 1, y, '#7f9a58'); } }
  return tex(p.c, 1);
});
// a round rod between two points (masts, logs, stalks)
function rod(g, mat, x1, y1, z1, x2, y2, z2, rad = 0.1) {
  const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1, L = Math.hypot(dx, dy, dz) || 1e-3;
  const m = put(g, geo('rod7', () => new THREE.CylinderGeometry(1, 1, 1, 7)), mat, (x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
  m.quaternion.setFromUnitVectors(UP, _v.set(dx / L, dy / L, dz / L));
  m.scale.set(rad, L, rad);
  return m;
}

BUILD.sunken_statue = (g, out, m, r) => {
  const st = mossStone(), stF = C('statue', 0xa8b0a4);
  put(g, TB(2.7, 1.35, 2.7, 2), st, 0, -0.325, 0);
  put(g, TB(2.5, 0.15, 2.5, 2), st, 0, 0.425, 0);
  const robe = [[1.05, 0], [1.0, 0.4], [0.88, 1.2], [0.74, 2.0], [0.62, 2.7], [0.56, 3.05], [0.01, 3.1]].map(([x, y]) => new THREE.Vector2(x, y));
  put(g, geo('robe', () => uvs(new THREE.LatheGeometry(robe, 12), 3, 2)), st, 0, 0.5, 0);
  put(g, ICO(), stF, 0, 3.55, 0).scale.set(0.72, 0.3, 0.52);
  put(g, CYL(), stF, 0, 3.75, 0).scale.set(0.3, 0.3, 0.28);
  put(g, ICO(), C('statueface', 0xc2c9bc), 0, 4.06, 0.04).scale.set(0.34, 0.4, 0.33);
  put(g, DOME(), st, 0, 4.12, -0.14, 0, -0.55).scale.set(0.44, 0.5, 0.44);
  for (const s of [-1, 1]) put(g, B(0.11, 0.03, 0.02), m.ink, s * 0.12, 4.08, 0.365);
  // one arm raised with the lantern, the other folded at the chest
  beam(g, stF, 0.55, 3.5, 0.05, 0.78, 4.3, 0.22, 0.26);
  beam(g, stF, 0.78, 4.3, 0.22, 0.66, 5.05, 0.3, 0.22);
  put(g, ICO(), stF, 0.66, 5.1, 0.3).scale.setScalar(0.15);
  beam(g, stF, -0.55, 3.45, 0.05, -0.45, 2.95, 0.5, 0.24);
  beam(g, stF, -0.45, 2.95, 0.5, 0.2, 3.1, 0.62, 0.2);
  const lampM = GL('statuelamp', 0xfff0c0, 0xffc860, 1.1);
  put(g, B(0.03, 0.18, 0.03), m.iron, 0.66, 5.22, 0.3);
  put(g, B(0.46, 0.06, 0.46), m.iron, 0.66, 5.34, 0.3);
  glow(put(g, B(0.42, 0.5, 0.42), lampM, 0.66, 5.62, 0.3));
  put(g, geo('slcap', () => new THREE.ConeGeometry(0.3, 0.16, 4)), m.iron, 0.66, 5.95, 0.3, Math.PI / 4);
  put(g, geo('slring', () => new THREE.TorusGeometry(0.07, 0.02, 4, 8)), m.iron, 0.66, 6.08, 0.3);
  // moss clumps & little corals near the waterline
  inst(g, ICO(), C('moss', 0x6f9150), [[0.4, 3.72, -0.08, 0.2, 0.07, 0.16], [-0.42, 3.7, 0.06, 0.18, 0.06, 0.14], [1.08, 0.52, 1.0, 0.24, 0.07, 0.2], [-1.05, 0.52, -0.9, 0.26, 0.07, 0.2], [0.08, 4.52, -0.16, 0.16, 0.06, 0.14]]);
  inst(g, ICO(), C('coral', 0xffffff), [[-0.8, 0.08, 1.36, 0.12, 0.12, 0.08, 0, 0, 0, 0xf28ab0], [0.3, 0.14, 1.36, 0.09, 0.1, 0.07, 0, 0, 0, 0xf0934a], [1.0, 0.0, 1.36, 0.11, 0.12, 0.08, 0, 0, 0, 0x5fc8c0], [1.36, 0.1, 0.4, 0.08, 0.1, 0.1, 0, 0, 0, 0xf28ab0], [-1.36, 0.05, 0.6, 0.08, 0.1, 0.1, 0, 0, 0, 0xf0934a]]);
  out.anim = (t) => { lampM.emissiveIntensity = 1.0 + Math.sin(t * 1.8) * 0.12; };
  out.lights.push({ x: 0.66, y: 5.55, z: 0.5, color: 0xffd89a, power: 1.6, lamp: true, dist: 11 });
  out.colliders.push({ x: 0, z: 0, r: 1.4 });
};

BUILD.ruin_arch = (g, out, m, r) => {
  const st = T('ruinstone', () => tex(paintWall(32, 32, 'stone', { wallColor: '#c8c0b0' }, 121, { foundation: false }), 1));
  const drum = geo('drum', () => uvs(new THREE.CylinderGeometry(0.28, 0.3, 0.75, 8), 1, 0.5));
  for (const s of [-1, 1]) {
    const x = s * 1.45;
    put(g, TB(0.72, 0.2, 0.72, 2), st, x, 0.1, 0);
    for (let k = 0; k < 3; k++) put(g, drum, st, x + (r() - 0.5) * 0.04, 0.575 + k * 0.75, (r() - 0.5) * 0.04, r() * 3);
    put(g, TB(0.74, 0.22, 0.74, 2), st, x, 2.56, 0);
    out.colliders.push({ x, z: 0, r: 0.4 });
  }
  // the arch, broken off on the east side
  for (let k = 0; k < 5; k++) {
    const th = Math.PI - ((k + 0.5) * Math.PI) / 7;
    put(g, TB(0.62, 0.42, 0.55, 2), st, Math.cos(th) * 1.45, 2.67 + Math.sin(th) * 1.45, (r() - 0.5) * 0.05, (r() - 0.5) * 0.06, 0, th - Math.PI / 2);
  }
  inst(g, BOX1(), C('ruinblock', 0xb8b0a0), [[0.62, 0.2, 0.08, 0.6, 0.4, 0.5, 0.5, 0, 0.1], [1.72, 0.16, 0.2, 0.5, 0.32, 0.4, -0.3, 0.15, 0], [0.3, 0.08, 0.35, 0.22, 0.16, 0.2, 1.2], [-0.8, 0.06, -0.3, 0.16, 0.12, 0.14, 0.4]]);
  inst(g, ICO(), C('moss', 0x6f9150), [[-1.45, 2.69, 0.05, 0.3, 0.06, 0.26], [-0.2, 4.1, 0.02, 0.26, 0.06, 0.22], [0.62, 0.41, 0.06, 0.2, 0.05, 0.16]]);
  inst(g, BOX1(), C('ivy', 0x5f9a4c), [[-1.02, 3.2, 0.3, 0.06, 0.8, 0.06], [-0.55, 3.55, 0.3, 0.06, 0.6, 0.06], [-1.3, 2.3, 0.3, 0.07, 0.5, 0.06]]);
  out.colliders.push({ x: 0.62, z: 0.08, r: 0.32 });
};

BUILD.dome_temple = (g, out, m, r, seed) => {
  const mb = marble(), white = C('templewhite', 0xf6f2ea);
  put(g, geo('dtplinth', () => uvs(new THREE.CylinderGeometry(1.95, 2.0, 0.3, 16), 6, 0.3)), mb, 0, 0.15, 0);
  const CR = 1.5, shafts = [], bases = [], caps = [];
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (i * Math.PI) / 3, x = Math.sin(a) * CR, z = Math.cos(a) * CR;
    bases.push([x, 0.36, z, 0.42, 0.12, 0.42]);
    shafts.push([x, 1.37, z, 0.34, 1.9, 0.34]);
    caps.push([x, 2.39, z, 0.44, 0.14, 0.44]);
    out.colliders.push({ x, z, r: 0.22 });
  }
  inst(g, BOX1(), white, bases);
  inst(g, CYL(), white, shafts);
  inst(g, BOX1(), white, caps);
  put(g, geo('dtent', () => new THREE.CylinderGeometry(1.8, 1.8, 0.3, 16)), white, 0, 2.61, 0);
  const dc = ['#6fae9a', '#c8704a', '#6a7fae', '#e0b050'][seed % 4];
  const domeM = T('dtdome' + dc, () => { const p = new Painter(32, 12), R = ramp(dc); p.rect(0, 0, 32, 12, R.m); for (let x = 0; x < 32; x += 4) p.vline(x, 0, 12, R.d); p.hline(0, 11, 32, R.o); p.hline(0, 1, 32, R.l); return tex(p.c, 2, 1); });
  put(g, DOME(), domeM, 0, 2.76, 0).scale.set(1.55, 1.25, 1.55);
  put(g, ICO(), m.gold, 0, 4.06, 0).scale.setScalar(0.12);
  put(g, geo('spike', () => new THREE.ConeGeometry(0.07, 0.4, 6)), m.gold, 0, 4.3, 0);
  // a brazier on a pedestal in the middle
  put(g, geo('dtped', () => new THREE.CylinderGeometry(0.26, 0.32, 0.8, 8)), mb, 0, 0.7, 0);
  put(g, geo('bowl', () => new THREE.CylinderGeometry(0.28, 0.14, 0.2, 8)), C('bronze', 0x8a6a3a), 0, 1.2, 0);
  const f = flames(g, 0, 1.22, 0, 0.7);
  out.anim = (t) => flick(f, t);
  out.anim(0);
  out.lights.push({ x: 0, y: 1.6, z: 0.4, color: 0xff9a40, power: 1.2, lamp: true, flicker: true });
  out.decks.push({ rect: [-1.45, -1.45, 2.9, 2.9], y: 0.3 });
  out.colliders.push({ x: 0, z: 0, r: 0.35 });
};

// ---------------------------------------------------------------------------
// Coral Lagoon
// ---------------------------------------------------------------------------
const thatch = () => T('thatch', () => { const p = new Painter(16, 16), rr = rng(131); p.rect(0, 0, 16, 16, '#d8b060'); for (let i = 0; i < 40; i++) p.vline(Math.floor(rr() * 16), Math.floor(rr() * 16), 3, rr() < 0.5 ? '#b8903f' : '#ecc878'); for (let y = 3; y < 16; y += 5) p.hline(0, y, 16, '#a88038'); return tex(p.c, 3, 1); });
const HIPROOF = () => geo('hiproof', () => new THREE.ConeGeometry(1, 1, 4).rotateY(Math.PI / 4));

BUILD.stilt_hut = (g, out, m, r) => {
  const Y = 0.5;
  put(g, TB(3, 0.12, 3), [m.dark, m.dark, m.planks, m.dark, m.dark, m.dark], 0, Y - 0.06, 0);
  const poles = [];
  for (const x of [-1.35, 0, 1.35]) for (const z of [-1.35, 0, 1.35]) poles.push([x, (Y - 0.12 - 1.0) / 2, z, 0.16, Y + 0.88, 0.16]);
  inst(g, geo('pole6', () => new THREE.CylinderGeometry(0.5, 0.5, 1, 6)), m.dark, poles);
  // the hut: woven walls, bead-curtain door, two glowing windows, thatched hip roof
  const front = T('hutfront', () => lit(35, 20, (p, q) => {
    p.rect(0, 0, 35, 20, '#d8b878');
    for (let x = 0; x < 35; x += 2) p.vline(x, 0, 20, x % 4 ? '#c8a868' : '#b89858');
    p.hline(0, 0, 35, '#8a6a3a'); p.hline(0, 19, 35, '#8a6a3a');
    p.rect(14, 5, 8, 15, '#5a3b2a');
    for (let x = 15; x < 21; x += 2) for (let y = 6; y < 19; y += 2) p.px(x, y, ['#f28ab0', '#5fc8c0', '#f4efe4'][(x + y) % 3]);
    for (const wx of [4, 25]) { p.rect(wx, 6, 7, 6, '#5a3b2a'); p.rect(wx + 1, 7, 5, 4, '#f3d9a0'); p.vline(wx + 3, 7, 4, '#5a3b2a'); q.rect(wx + 1, 7, 5, 4, '#ffc76a'); q.vline(wx + 3, 7, 4, '#000000'); }
  }));
  const side = T('hutside', () => { const p = new Painter(16, 16); p.rect(0, 0, 16, 16, '#d8b878'); for (let x = 0; x < 16; x += 2) p.vline(x, 0, 16, x % 4 ? '#c8a868' : '#b89858'); return tex(p.c); });
  put(g, B(2.2, 1.25, 1.5), [side, side, side, side, front, side], 0, Y + 0.625, -0.6);
  put(g, HIPROOF(), thatch(), 0, Y + 1.25 + 0.55, -0.6).scale.set(1.98, 1.1, 1.34);
  put(g, CYL(), C('thatchtie', 0xb8903f), 0, Y + 2.38, -0.6).scale.set(0.2, 0.22, 0.2);
  // porch rails, the ladder down into the water
  const rails = [];
  for (const x of [-1.45, 1.45]) rails.push([x, Y + 0.3, 0.2, 0.08, 0.6, 0.08], [x, Y + 0.3, 1.45, 0.08, 0.6, 0.08], [x, Y + 0.58, 0.82, 0.06, 0.06, 1.3]);
  inst(g, BOX1(), m.wood, rails);
  for (const x of [-0.22, 0.22]) put(g, B(0.05, 1.6, 0.05), m.dark, x, 0.1, 1.52);
  inst(g, BOX1(), m.wood, [-0.45, -0.15, 0.15, 0.45].map((y) => [0, y, 1.52, 0.44, 0.04, 0.05]));
  // a fishing net drying on a rack, with floats
  const netM = T('net', () => { const p = new Painter(16, 16); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if ((x + y) % 4 === 0 || (x - y + 16) % 4 === 0) p.px(x, y, '#c8b088'); p.hline(0, 0, 16, '#8a6a3a'); return tex(p.c); }, { alphaTest: 0.5, side: THREE.DoubleSide, shadowSide: THREE.DoubleSide });
  for (const x of [0.55, 1.4]) put(g, B(0.06, 1.1, 0.06), m.dark, x, Y + 0.55, 1.25);
  put(g, B(0.95, 0.05, 0.05), m.dark, 0.975, Y + 1.08, 1.25);
  put(g, geo('netpl', () => new THREE.PlaneGeometry(0.85, 0.8)), netM, 0.975, Y + 0.64, 1.27, 0, 0.08);
  inst(g, ICO(), C('float', 0xf0934a), [0.65, 0.88, 1.1, 1.32].map((x) => [x, Y + 1.0, 1.29, 0.06, 0.06, 0.06]));
  // a giant clam with a glowing pearl, a basket of shells
  const shell = C('clam', 0xf0c8d0);
  put(g, DOME(), shell, -0.95, Y + 0.12, 0.95, 0, Math.PI).scale.set(0.28, 0.12, 0.22);
  put(g, DOME(), shell, -0.95, Y + 0.14, 0.76, 0, -1.1).scale.set(0.28, 0.12, 0.22);
  glow(put(g, ICO(), GL('pearl', 0xfff4fa, 0xf0d0ff, 0.8), -0.95, Y + 0.15, 0.95)).scale.setScalar(0.08);
  put(g, CYL(), wickerMat(), -0.35, Y + 0.1, 1.12).scale.set(0.42, 0.2, 0.42);
  inst(g, ICO(), C('shell', 0xffffff), [[-0.42, Y + 0.22, 1.08, 0.07, 0.04, 0.06, 0, 0, 0, 0xf28ab0], [-0.28, Y + 0.22, 1.16, 0.06, 0.04, 0.06, 1, 0, 0, 0xfff0d0], [-0.34, Y + 0.24, 1.02, 0.06, 0.04, 0.05, 2, 0, 0, 0x5fc8c0]]);
  put(g, B(0.02, 0.2, 0.02), m.iron, -1.2, Y + 1.12, 0.36);
  lantern(g, out, -1.2, Y + 0.92, 0.36, { s: 0.75 });
  out.decks.push({ rect: [-1.5, -1.5, 3, 3], y: Y });
  out.colliders.push({ rect: [-1.1, -1.35, 2.2, 1.5] }, { rect: [0.5, 1.2, 0.95, 0.1] }, { rect: [-1.5, 0.15, 0.1, 1.35] }, { rect: [1.4, 0.15, 0.1, 1.35] }, { x: -0.95, z: 0.9, r: 0.25 });
};

BUILD.shipwreck = (g, out, m, r) => {
  const hullT = T('hullwood', () => { const p = new Painter(16, 16); for (let y = 0; y < 16; y++) p.hline(0, y, 16, y % 4 === 3 ? '#4a3024' : y % 4 === 0 ? '#8a5e42' : '#74503a'); for (const [x, y] of [[3, 1], [11, 5], [6, 9], [13, 13]]) p.vline(x, y, 3, '#4a3024'); return tex(p.c, 1); });
  const deckT = T('wreckdeck', () => tex(paintPlanks(16, 16, { dir: 'h', color: '#a88a64', seed: 142 }), 1));
  const hull = geo('hullgeo', () => {
    const sh = new THREE.Shape();
    sh.moveTo(-3.0, -1.0); sh.lineTo(1.5, -1.0); sh.quadraticCurveTo(2.8, -0.8, 3.3, 0); sh.quadraticCurveTo(2.8, 0.8, 1.5, 1.0); sh.lineTo(-3.0, 1.0); sh.lineTo(-3.0, -1.0);
    const eg = new THREE.ExtrudeGeometry(sh, { depth: 1.3, bevelEnabled: false, curveSegments: 6 });
    eg.rotateX(-Math.PI / 2);
    const pos = eg.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), top = y > 0.65;
      pos.setZ(i, pos.getZ(i) * (top ? 1 : 0.5)); // a V-ish hull
      if (top) pos.setY(i, y + 0.6 * ((x + 0.2) / 3.2) ** 2); // the sheer rises fore & aft
      else pos.setY(i, y + (x > 1.0 ? 0.6 * ((x - 1.0) / 2.3) ** 2 : 0) + (x < -2.3 ? 0.3 * ((-2.3 - x) / 0.7) ** 2 : 0));
    }
    eg.computeVertexNormals();
    return eg;
  });
  // the hull lies on its side, half sunk in the sand, its planking towards us
  const hg = grp(g, -0.3, -0.36, 0.25);
  hg.rotation.x = -0.5;
  put(hg, hull, [deckT, hullT]);
  put(hg, B(0.12, 0.9, 0.46), hullT, -3.06, 0.6, 0);
  put(hg, B(1.1, 0.5, 0.05), m.hole, -1.1, 0.72, 0.78, 0, 0.36);
  inst(hg, BOX1(), m.dark, [[-1.62, 0.88, 0.82, 0.3, 0.07, 0.05, 0, 0.36, 0.3], [-0.62, 0.6, 0.8, 0.26, 0.07, 0.05, 0, 0.36, -0.4], [-1.2, 1.0, 0.86, 0.2, 0.06, 0.05, 0, 0.36, 0.1]]);
  inst(hg, BOX1(), C('keel', 0x4a3024), [[-0.8, 0.02, 0, 4.4, 0.1, 0.14]]);
  put(hg, TB(1.0, 0.55, 1.5), [hullT, hullT, deckT, hullT, hullT, hullT], -2.45, 1.55, 0);
  inst(hg, BOX1(), m.hole, [0.3, 0.9, 1.5].map((x) => [x, 0.98, 0.9, 0.16, 0.16, 0.03, 0, 0.37]).concat([[-2.7, 1.6, 0.76, 0.14, 0.14, 0.03], [-2.25, 1.6, 0.76, 0.14, 0.14, 0.03]]));
  rod(hg, m.dark, 3.15, 1.45, 0, 3.7, 1.95, 0, 0.06);
  // the broken mast, a yard hanging askew, a torn sail & rigging
  rod(hg, m.dark, 0.4, 1.3, 0, 0.4, 3.3, 0, 0.12);
  put(hg, geo('splinter', () => new THREE.ConeGeometry(0.09, 0.34, 5)), m.dark, 0.36, 3.44, 0, 0, 0, 0.25);
  put(hg, geo('splinter', () => new THREE.ConeGeometry(0.09, 0.34, 5)), m.dark, 0.45, 3.4, 0.03, 0, 0, -0.35);
  put(hg, B(2.0, 0.08, 0.08), m.dark, 0.35, 2.95, 0.12, 0, 0, 0.35);
  const sailT = T('tornsail', () => {
    const p = new Painter(20, 16), rr = rng(151);
    p.rect(0, 0, 20, 16, '#e8dcc0');
    for (let y = 1; y < 12; y += 4) p.hline(0, y, 20, '#d4c4a4');
    p.rect(14, 7, 3, 3, '#c8b890');
    for (let x = 0; x < 20; x++) { const cut = 10 + Math.floor(rr() * 6) - (x > 12 ? 4 : 0); p.clear(x, cut, 1, 16 - cut); }
    p.clear(5, 5, 2, 2); p.clear(12, 3, 3, 2);
    return tex(p.c);
  }, { alphaTest: 0.5, side: THREE.DoubleSide, shadowSide: THREE.DoubleSide });
  const sail = put(hg, geo('sailpl', () => new THREE.PlaneGeometry(1.6, 1.3)), sailT, 0.3, 2.28, 0.16, 0, 0, 0.33);
  beam(hg, m.rope, 0.4, 3.2, 0, 3.1, 1.75, 0, 0.03);
  beam(hg, m.rope, 0.4, 3.2, 0, -2.9, 1.65, 0, 0.03);
  // on the sand: the fallen foremast, barrels, loose planks
  rod(g, m.dark, -2.4, 0.13, 1.18, 0.4, 0.2, 1.3, 0.12);
  const staves = T('staves', () => { const p = new Painter(16, 16); p.rect(0, 0, 16, 16, '#9a6a44'); for (let x = 0; x < 16; x += 2) p.vline(x, 0, 16, x % 4 ? '#8a5a3a' : '#7a5238'); for (let i = 0; i < 10; i++) p.px((i * 7) % 16, (i * 5) % 16, '#b07b50'); return tex(p.c, 5, 1); });
  put(g, geo('barrel', () => new THREE.CylinderGeometry(0.26, 0.28, 0.62, 10)), staves, 2.75, 0.3, 0.95);
  put(g, geo('barrel', () => new THREE.CylinderGeometry(0.26, 0.28, 0.62, 10)), staves, 2.05, 0.25, 1.08, 0.4, 0, Math.PI / 2);
  inst(g, BOX1(), m.wood, [[1.1, 0.03, 1.2, 0.9, 0.05, 0.18, 0.3], [-1.3, 0.03, 1.2, 0.7, 0.05, 0.16, -0.5], [3.05, 0.03, -0.7, 0.6, 0.05, 0.15, 1.2]]);
  // a castaway's lantern hanging from the yard's low end
  const lp = new THREE.Vector3(1.25, 2.65, 0.14);
  hg.updateMatrix();
  lp.applyMatrix4(hg.matrix);
  put(g, B(0.02, 0.24, 0.02), m.rope, lp.x, lp.y - 0.12, lp.z);
  lantern(g, out, lp.x, lp.y - 0.38, lp.z, { s: 0.75 });
  const ph = r() * 6;
  out.anim = (t) => { sail.rotation.x = Math.sin(t * 1.7 + ph) * 0.12; };
  out.anim(0);
  out.colliders.push({ rect: [-3.45, -1.2, 6.45, 1.95] }, { x: 2.75, z: 0.95, r: 0.3 }, { x: 2.05, z: 1.08, r: 0.3 });
};

// ---------------------------------------------------------------------------
// Whirlpool Straits & the coasts
// ---------------------------------------------------------------------------
function gull(g, m, x, y, z, ry = 0) {
  const gg = grp(g, x, y, z, ry), wh = C('gullw', 0xf8f6f0), gr = C('gullg', 0x9aa0ac);
  put(gg, B(0.3, 0.16, 0.15), [wh, wh, gr, wh, wh, wh], 0, 0.12, 0);
  put(gg, B(0.1, 0.05, 0.1), gr, -0.18, 0.14, 0);
  const head = grp(gg, 0.13, 0.25, 0);
  put(head, B(0.12, 0.12, 0.11), wh);
  put(head, B(0.08, 0.035, 0.035), C('beak', 0xf2b63d), 0.09, -0.01, 0);
  put(head, B(0.02, 0.02, 0.115), m.ink, 0.03, 0.02, 0);
  return head;
}

BUILD.sea_stack = (g, out, m, r) => {
  const rocks = [[0, 0.55, 0, 0.98, 0.78, 0.92, 0.3, 0x8a7f7a], [0.05, 1.5, -0.04, 0.84, 0.72, 0.8, 1.4, 0xa39488], [-0.05, 2.38, 0.02, 0.76, 0.66, 0.74, 2.2, 0x9a8a80], [0.07, 3.2, -0.02, 0.68, 0.6, 0.66, 0.8, 0xab9c90], [0, 3.92, 0.02, 0.8, 0.42, 0.78, 1.9, 0xa39488]];
  inst(g, ROCK(), C('stackrock', 0xffffff), rocks.map(([x, y, z, sx, sy, sz, ry, c]) => [x, y, z, sx, sy, sz, ry, 0, 0, c]));
  // a grassy cap with tufts
  put(g, ICO(), C('stackgrass', 0x6fae5a), 0, 4.3, 0.02).scale.set(0.72, 0.16, 0.7);
  inst(g, BOX1(), C('tuft', 0x5f9a4c), [[0.3, 4.48, 0.22, 0.05, 0.22, 0.05, 0, 0.2], [-0.28, 4.47, -0.12, 0.05, 0.2, 0.05, 0, -0.2, 0.2], [0.08, 4.5, -0.32, 0.05, 0.24, 0.05, 0, 0, -0.25], [-0.42, 4.44, 0.28, 0.05, 0.18, 0.05, 0, 0.25]]);
  // nests with eggs (top & a ledge), guano streaks, gulls
  inst(g, geo('nest', () => new THREE.TorusGeometry(1, 0.42, 4, 8)), C('twigs', 0x8e6a3e), [[0.3, 4.45, 0.26, 0.17, 0.17, 0.17, 0, Math.PI / 2], [-0.5, 2.92, 0.44, 0.17, 0.17, 0.17, 0, Math.PI / 2]]);
  inst(g, ICO(), C('egg', 0xd8ecf0), [[0.26, 4.47, 0.24, 0.06, 0.07, 0.06], [0.35, 4.47, 0.3, 0.06, 0.07, 0.06], [-0.46, 2.94, 0.42, 0.06, 0.07, 0.06], [-0.55, 2.94, 0.48, 0.06, 0.07, 0.06]]);
  inst(g, BOX1(), C('guano', 0xf4f4ee), [[-0.48, 2.45, 0.7, 0.07, 0.5, 0.02], [0.32, 3.78, 0.66, 0.06, 0.45, 0.02]]);
  const heads = [gull(g, m, -0.22, 4.44, 0.12, 0.4), gull(g, m, 0.62, 2.12, 0.5, Math.PI - 0.3)];
  const foam = glow(put(g, geo('foam', () => new THREE.RingGeometry(0.98, 1.16, 20)), GL('foam', 0xeef8ff, 0xc8e8ff, 0.3), 0, 0.03, 0, 0, -Math.PI / 2));
  const ph = r() * 6;
  out.anim = (t) => {
    heads.forEach((h, i) => { h.position.y = 0.25 + Math.max(0, Math.sin(t * 3.1 + i * 2 + ph)) * 0.03; h.rotation.y = Math.sin(t * 0.7 + i * 1.7 + ph) * 0.5; });
    foam.scale.setScalar(1 + Math.sin(t * 1.4 + ph) * 0.04);
  };
  out.anim(0);
  out.colliders.push({ x: 0, z: 0, r: 1.0 });
};

// ---------------------------------------------------------------------------
// Croakmire
// ---------------------------------------------------------------------------
// a flat lily-pad shape with its notch facing south
function padGeo(key, R, depth, notch = 0.5) {
  return geo(key, () => {
    const sh = new THREE.Shape();
    sh.moveTo(0, 0);
    sh.absarc(0, 0, R, -Math.PI / 2 + notch / 2, (3 * Math.PI) / 2 - notch / 2, false);
    sh.lineTo(0, 0);
    const eg = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 28 });
    eg.rotateX(-Math.PI / 2);
    return eg;
  });
}
// radial veins & a light rim, mapped over a pad of radius R (world-unit UVs)
function padTex(key, R, px) {
  return T(key, () => {
    const p = new Painter(px, px), c = px / 2, rr = rng(px);
    p.rect(0, 0, px, px, '#5f9a4c');
    for (let y = 0; y < px; y++) for (let x = 0; x < px; x++) { const d = Math.hypot(x + 0.5 - c, y + 0.5 - c) / c; if (d > 0.9) p.px(x, y, '#7fb85a'); else if (rr() < 0.05) p.px(x, y, '#6aa856'); }
    for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; for (let d = 0.08; d < 0.88; d += 0.5 / c) p.px(c + Math.cos(a) * d * c, c + Math.sin(a) * d * c, '#4f8a3c'); }
    const t = tex(p.c);
    t.repeat.set(1 / (2 * R), 1 / (2 * R));
    t.offset.set(0.5, 0.5);
    return t;
  });
}
function lotus(g, x, y, z, k = 1) {
  const items = [];
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; items.push([x + Math.sin(a) * 0.13 * k, y + 0.05 * k, z + Math.cos(a) * 0.13 * k, 0.07 * k, 0.04 * k, 0.19 * k, eul(-0.45, a, 0, 'YXZ'), 0, 0, 0xf7b8d0]); }
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.3; items.push([x + Math.sin(a) * 0.06 * k, y + 0.1 * k, z + Math.cos(a) * 0.06 * k, 0.05 * k, 0.035 * k, 0.14 * k, eul(-0.95, a, 0, 'YXZ'), 0, 0, 0xfbe0ec]); }
  inst(g, OCT(), C('lotus', 0xffffff), items);
  put(g, CYL(), C('lotuscore', 0xffd66b), x, y + 0.09 * k, z).scale.set(0.09 * k, 0.05 * k, 0.09 * k);
}

BUILD.frog_throne = (g, out, m, r) => {
  const Y = 0.15, cz = -1.25, side = C('padside', 0x4f7a3c);
  put(g, padGeo('bigpad', 3, Y, 0.5), [padTex('bigpadtop', 3, 96), side]).scale.z = 0.85;
  // the throne: a toadstool seat backed by a tall toadstool, toadstool armrests, a gold crown on top
  const cream = C('stem', 0xf0e4d0), red = C('toadred', 0xd9433a), spot = C('toadspot', 0xfff4dc), bz = cz - 0.45;
  put(g, geo('thbase', () => new THREE.CylinderGeometry(0.45, 0.55, 0.55, 10)), cream, 0, Y + 0.275, cz);
  put(g, geo('thseat', () => new THREE.CylinderGeometry(0.62, 0.58, 0.16, 12)), red, 0, Y + 0.63, cz);
  put(g, geo('thstem', () => new THREE.CylinderGeometry(0.22, 0.28, 1.6, 8)), cream, 0, Y + 1.05, bz);
  put(g, DOME(), red, 0, Y + 1.8, bz).scale.set(0.95, 0.72, 0.95);
  const spots = [[0, 0.3, 0.2], [0.75, 0.8, 0.16], [-0.75, 0.85, 0.16], [0.1, 1.1, 0.15], [1.6, 1.0, 0.13], [-1.6, 0.95, 0.13]].map(([th, p, s]) => {
    const sx = Math.sin(th) * Math.sin(p), sy = Math.cos(p), sz = Math.cos(th) * Math.sin(p), n = new THREE.Vector3(sx / 0.95, sy / 0.72, sz / 0.95).normalize();
    return [sx * 0.95, Y + 1.8 + sy * 0.72, bz + sz * 0.95, s, 0.04, s, aim(n.x, n.y, n.z)];
  });
  spots.push([0.3, Y + 0.72, cz + 0.2, 0.1, 0.03, 0.1], [-0.25, Y + 0.72, cz + 0.3, 0.08, 0.03, 0.08]);
  inst(g, ICO(), spot, spots);
  inst(g, CYL(), cream, [[-0.72, Y + 0.25, cz + 0.1, 0.16, 0.5, 0.16], [0.72, Y + 0.25, cz + 0.1, 0.16, 0.5, 0.16]]);
  inst(g, DOME(), C('toadorange', 0xe8883a), [[-0.72, Y + 0.48, cz + 0.1, 0.26, 0.2, 0.26], [0.72, Y + 0.48, cz + 0.1, 0.26, 0.2, 0.26]]);
  put(g, geo('crownring', () => new THREE.CylinderGeometry(0.2, 0.18, 0.14, 8)), m.gold, 0, Y + 2.58, bz);
  inst(g, geo('cone4', () => new THREE.ConeGeometry(1, 1, 4)), m.gold, [0, 1.26, 2.51, 3.77, 5.03].map((a) => [Math.sin(a) * 0.17, Y + 2.72, bz + Math.cos(a) * 0.17, 0.05, 0.14, 0.05]));
  // reed banners with the royal frog, either side of the throne
  const banM = T('frogbanner', () => {
    const p = new Painter(8, 16), gd = '#f2c14e', lg = '#8fd06a';
    p.rect(0, 0, 8, 14, '#3f7a3c'); p.vline(0, 0, 14, '#2f5a2c'); p.vline(7, 0, 14, '#2f5a2c');
    for (let y = 14; y < 16; y++) for (let x = 0; x < 8; x++) if (Math.abs(x - 3.5) > (y - 13) * 1.6) p.px(x, y, '#3f7a3c');
    p.hline(2, 3, 4, gd); p.px(2, 2, gd); p.px(5, 2, gd); p.px(3, 2, gd);
    p.rect(1, 6, 6, 3, lg); p.rect(1, 5, 2, 2, lg); p.rect(5, 5, 2, 2, lg); p.px(1, 5, '#2a2433'); p.px(6, 5, '#2a2433'); p.hline(2, 8, 4, '#2f5a2c');
    return tex(p.c);
  }, { alphaTest: 0.5, side: THREE.DoubleSide, shadowSide: THREE.DoubleSide });
  const reed = C('reed', 0x7a8a4a), bans = [];
  inst(g, BOX1(), reed, [[-1.65, Y + 1.3, cz - 0.1, 0.07, 2.6, 0.07], [1.65, Y + 1.3, cz - 0.1, 0.07, 2.6, 0.07], [-1.65, Y + 2.45, cz - 0.08, 0.56, 0.04, 0.04], [1.65, Y + 2.45, cz - 0.08, 0.56, 0.04, 0.04]]);
  inst(g, BOX1(), C('cattail', 0x6b4330), [[-1.65, Y + 2.72, cz - 0.1, 0.12, 0.32, 0.12], [1.65, Y + 2.72, cz - 0.1, 0.12, 0.32, 0.12]]);
  for (const x of [-1.65, 1.65]) {
    const pv = grp(g, x, Y + 2.43, cz - 0.06);
    put(pv, geo('frogbanpl', () => new THREE.PlaneGeometry(0.5, 1.1)), banM, 0, -0.57, 0.02);
    bans.push(pv);
  }
  // firefly lanterns on bent reeds round the pad, and a few fireflies
  const orbM = GL('firefly', 0xd8f070, 0xa8e040, 0.75), orbs = [];
  for (const [x, z, s] of [[-2.3, 0.55, 1], [2.3, 0.6, -1], [1.6, -1.75, -1]]) {
    beam(g, reed, x, Y, z, x, Y + 1.5, z, 0.06);
    beam(g, reed, x, Y + 1.5, z, x + s * 0.36, Y + 1.72, z, 0.05);
    beam(g, m.rope, x + s * 0.36, Y + 1.72, z, x + s * 0.4, Y + 1.5, z, 0.015);
    const o = glow(put(g, ICO(), orbM, x + s * 0.4, Y + 1.42, z));
    o.scale.setScalar(0.12);
    orbs.push(o);
    out.colliders.push({ x, z, r: 0.1 });
  }
  const flies = [];
  for (let i = 0; i < 5; i++) flies.push(glow(put(g, B(0.05, 0.05, 0.05), orbM)));
  lotus(g, -1.3, Y, 0.9, 1);
  lotus(g, 1.15, Y, 1.3, 0.8);
  const ph = r() * 6;
  out.anim = (t) => {
    bans.forEach((b, i) => { b.rotation.x = Math.sin(t * 1.2 + i * 2 + ph) * 0.08; });
    orbs.forEach((o, i) => { o.position.y = Y + 1.42 + Math.sin(t * 1.7 + i * 2.2) * 0.04; });
    flies.forEach((f, i) => { const a = t * (0.4 + i * 0.05) + i * 1.3 + ph; f.position.set(Math.cos(a) * (1.1 + i * 0.25), Y + 0.7 + Math.sin(t * 1.9 + i) * 0.35 + i * 0.12, cz + 0.6 + Math.sin(a) * (0.9 + i * 0.15)); });
  };
  out.anim(0);
  out.lights.push({ x: -1.9, y: Y + 1.4, z: 0.7, color: 0xd8ff8a, power: 0.8, lamp: true }, { x: 1.9, y: Y + 1.4, z: 0.75, color: 0xd8ff8a, power: 0.8, lamp: true });
  out.decks.push({ rect: [-2.1, -1.8, 4.2, 3.6], y: Y });
  out.colliders.push({ x: 0, z: cz - 0.1, r: 0.75 }, { x: -1.65, z: cz - 0.1, r: 0.12 }, { x: 1.65, z: cz - 0.1, r: 0.12 });
};

BUILD.stilt_house = (g, out, m, r, seed, poi, r3d) => {
  const F = 0.9, zb = -1.45, zf = 0.05, zp = 1.05, H = 1.35, zm = (zb + zf) / 2;
  put(g, TB(2.5, 0.12, zp - zb), [m.dark, m.dark, m.planks, m.dark, m.dark, m.dark], 0, F - 0.06, (zb + zp) / 2);
  const posts = [];
  for (const x of [-1.15, 1.15]) for (const z of [-1.35, -0.1, 0.95]) posts.push([x, (F - 0.62) / 2, z, 0.14, F + 0.38, 0.14]);
  inst(g, geo('pole6', () => new THREE.CylinderGeometry(0.5, 0.5, 1, 6)), m.dark, posts);
  // the house: weathered boards, a glowing window with a flower box, round-windowed door
  const front = T('shfront', () => lit(40, 22, (p, q) => {
    p.rect(0, 0, 40, 22, '#8a6a4a'); for (let x = 0; x < 40; x += 3) p.vline(x, 0, 22, '#6e5238'); p.rect(0, 20, 40, 2, '#6f8a4a');
    p.rect(24, 5, 9, 17, '#4a3024'); p.rect(25, 6, 7, 16, '#6b4330'); p.rect(27, 8, 3, 3, '#f3d9a0'); p.px(30, 14, '#f2c14e'); q.rect(27, 8, 3, 3, '#ffc76a');
    p.rect(5, 6, 10, 7, '#4a3024'); p.rect(6, 7, 8, 5, '#f3d9a0'); p.vline(10, 7, 5, '#4a3024'); p.hline(6, 9, 8, '#4a3024');
    q.rect(6, 7, 8, 5, '#ffc76a'); q.vline(10, 7, 5, '#000000'); q.hline(6, 9, 8, '#000000');
    p.rect(4, 13, 12, 2, '#6b4330'); for (let x = 5; x < 15; x += 2) p.px(x, 12, ['#ec5f73', '#ffd66b', '#f4efe4'][x % 3]);
  }));
  const side = T('shside', () => { const p = new Painter(24, 22); p.rect(0, 0, 24, 22, '#8a6a4a'); for (let x = 0; x < 24; x += 3) p.vline(x, 0, 22, '#6e5238'); p.rect(0, 20, 24, 2, '#6f8a4a'); return tex(p.c); });
  put(g, B(2.5, H, zf - zb), [side, side, side, side, front, side], 0, F + H / 2, zm);
  // mossy gable roof & a chimney
  const roofM = T('shroof', () => tex(paintRoof(46, 18, '#6a7a4a', { seed: 17 })), { shadowSide: THREE.DoubleSide });
  const ang = 0.6, run = 0.87, rise = run * Math.tan(ang), ridge = F + H + rise - 0.05;
  for (const s of [-1, 1]) put(g, B(2.9, 0.08, run / Math.cos(ang)), roofM, 0, ridge - rise / 2, zm + (s * run) / 2, 0, s * ang);
  put(g, geo('shgable', () => polyGeometry([tri([1.25, F + H, zf], [1.25, F + H, zb], [1.25, ridge, zm]), tri([-1.25, F + H, zb], [-1.25, F + H, zf], [-1.25, ridge, zm])])), side);
  put(g, TB(0.34, 0.8, 0.34), m.stone, 0.7, ridge - 0.05, zm - 0.3);
  out.chimneys.push({ x: 0.7, y: ridge + 0.38, z: zm - 0.3, smoke: 'hearth', seed });
  // porch railing, steps, lanterns on the corner posts
  const rails = [[-1.2, F + 0.3, 0.1, 0.08, 0.6, 0.08], [1.2, F + 0.3, 0.1, 0.08, 0.6, 0.08], [-0.45, F + 0.3, 1.0, 0.08, 0.6, 0.08], [0.45, F + 0.3, 1.0, 0.08, 0.6, 0.08], [-1.2, F + 0.55, 1.0, 0.1, 1.1, 0.1], [1.2, F + 0.55, 1.0, 0.1, 1.1, 0.1]];
  rails.push([-1.2, F + 0.58, 0.55, 0.06, 0.06, 0.95], [1.2, F + 0.58, 0.55, 0.06, 0.06, 0.95], [-0.83, F + 0.58, 1.0, 0.8, 0.06, 0.06], [0.83, F + 0.58, 1.0, 0.8, 0.06, 0.06]);
  inst(g, BOX1(), m.wood, rails);
  inst(g, BOX1(), m.planks, [[0, 0.3375, 1.125, 0.9, 0.675, 0.15], [0, 0.225, 1.275, 0.9, 0.45, 0.15], [0, 0.1125, 1.425, 0.9, 0.225, 0.15]]);
  for (const s of [-1, 1]) lantern(g, out, s * 1.2, F + 1.22, 1.0, { s: 0.75 });
  // a little rowboat tied to the porch (the vehicles' own, its oars shipped)
  const boat = grp(g, 1.0, 0, 1.3);
  const dinghy = buildBoat(r3d, 'row', { look: seed % 4, moored: true, foam: false });
  dinghy.rotation.y = Math.PI / 2; dinghy.scale.setScalar(0.5); dinghy.position.y = 0.09;   // (pulled up on the bank)
  boat.add(dinghy);
  beam(g, m.rope, 1.2, 0.72, 1.0, 1.36, 0.22, 1.3, 0.02);
  const ph = r() * 6;
  out.anim = (t) => { boat.position.y = Math.sin(t * 1.8 + ph) * 0.02; boat.rotation.z = Math.sin(t * 1.3 + ph) * 0.03; };
  out.anim(0);
  out.decks.push({ rect: [-1.25, zf, 2.5, zp - zf], y: F }, { rect: [-0.45, 1.05, 0.9, 0.15], y: 0.675 }, { rect: [-0.45, 1.2, 0.9, 0.15], y: 0.45 }, { rect: [-0.45, 1.35, 0.9, 0.15], y: 0.225 });
  out.colliders.push({ rect: [-1.25, zb, 2.5, zf - zb] }, { rect: [-1.3, zf, 0.12, 1.0] }, { rect: [1.18, zf, 0.12, 1.0] }, { rect: [-1.25, 0.95, 0.8, 0.12] }, { rect: [0.45, 0.95, 0.8, 0.12] });
};

BUILD.lilypad = (g, out, m, r) => {
  const pad = grp(g);
  put(pad, padGeo('lilypadgeo', 1.3, 0.1, 0.55), [padTex('lilypadtop', 1.3, 42), C('padside', 0x4f7a3c)]);
  lotus(pad, 0.55, 0.1, -0.45, 1);
  const ph = r() * 6;
  out.anim = (t) => { pad.position.y = Math.sin(t * 1.6 + ph) * 0.015; pad.rotation.y = Math.sin(t * 0.4 + ph) * 0.04; };
  out.anim(0);
  out.decks.push({ rect: [-0.92, -0.92, 1.84, 1.84], y: 0.1 });
};

// ---------------------------------------------------------------------------
// Emberpeak
// ---------------------------------------------------------------------------
const RUNES = [
  ['..#..', '.###.', '#.#.#', '..#..', '..#..', '.#.#.', '#...#'], ['#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#', '#####'],
  ['#####', '#....', '####.', '#....', '#....', '#....', '#....'], ['..#..', '..#..', '#####', '..#..', '.#.#.', '#...#', '.....'],
  ['##.##', '#.#.#', '#...#', '#...#', '.#.#.', '..#..', '..#..'], ['#....', '##...', '#.#..', '#..#.', '#.#..', '##...', '#....'],
  ['.###.', '#...#', '#.#.#', '#...#', '.###.', '..#..', '.###.'],
];

BUILD.forge_gate = (g, out, m, r) => {
  const obs = T('obsidian', () => {
    const p = new Painter(16, 16), rr = rng(161);
    p.rect(0, 0, 16, 16, '#3a2c4c');
    for (let i = 0; i < 20; i++) p.px(rr() * 16, rr() * 16, '#2a2036');
    for (let i = 0; i < 6; i++) { const x = Math.floor(rr() * 16), y = Math.floor(rr() * 16); for (let k = 0; k < 5; k++) p.px(x + k, y - k, k < 2 ? '#8a78c0' : '#5a4a78'); }
    return tex(p.c, 1);
  }, { emissive: 0x1a0f24, emissiveIntensity: 0.4 });
  // two jagged pillars of obsidian shards
  const shards = [];
  for (const s of [-1, 1]) {
    const x = s * 1.85;
    shards.push([x, 1.55, 0, 0.52, 1.9, 0.48, 0.3 + r() * 0.3, 0, s * 0.05], [x - s * 0.36, 0.95, 0.18, 0.34, 1.15, 0.32, r(), 0, s * 0.28], [x + s * 0.26, 0.75, -0.2, 0.28, 0.9, 0.28, r(), 0, -s * 0.12], [x + s * 0.08, 2.9, 0.08, 0.28, 0.85, 0.28, r(), 0.15, -s * 0.1]);
  }
  inst(g, OCT(), obs, shards);
  // the lintel with glowing runes, jagged shards on top
  const runeM = T('runes', () => lit(78, 11, (p, q) => {
    p.rect(0, 0, 78, 11, '#3a2c4c'); p.hline(0, 0, 78, '#5a4a78'); p.hline(0, 10, 78, '#241a30');
    for (let k = 0; k < 7; k++) RUNES[k].forEach((row, y) => { for (let x = 0; x < 5; x++) if (row[x] === '#') { p.px(6 + k * 10 + x, 2 + y, '#ffb050'); q.px(6 + k * 10 + x, 2 + y, '#ff8a2a'); } });
  }), { emissiveIntensity: 1.0 });
  put(g, B(4.9, 0.7, 0.9), [obs, obs, obs, obs, runeM, obs], 0, 3.6, 0);
  inst(g, OCT(), obs, [[-1.2, 4.1, 0, 0.3, 0.55, 0.3, 0.4, 0, 0.3], [0.2, 4.2, 0.05, 0.35, 0.7, 0.3, 1.1, 0, -0.1], [1.5, 4.05, -0.05, 0.25, 0.45, 0.25, 2, 0, -0.35]]);
  // the threshold: a basalt slab split by a glowing lava groove
  put(g, TB(2.6, 0.08, 2.6), C('basalt', 0x4a4250), 0, 0.04, 0);
  inst(g, BOX1(), C('basaltcurb', 0x3a3440), [[-0.26, 0.09, 0, 0.1, 0.1, 2.8], [0.26, 0.09, 0, 0.1, 0.1, 2.8]]);
  const lava = T('lava', () => { const p = new Painter(8, 16), rr = rng(171); for (let y = 0; y < 16; y++) for (let x = 0; x < 8; x++) { const v = rr(); p.px(x, y, v < 0.08 ? '#ffe080' : v < 0.35 ? '#ff9a30' : v < 0.8 ? '#f06020' : '#b8301a'); } return tex(p.c, 1, 3); }, { emissive: 0xff4a10, emissiveIntensity: 0.75 });
  glow(put(g, B(0.42, 0.03, 2.8), lava, 0, 0.1, 0));
  const emberM = GL('ember', 0xffc060, 0xff8a20, 1.3), embers = [];
  for (let i = 0; i < 5; i++) embers.push(glow(put(g, B(0.06, 0.06, 0.06), emberM)));
  const ph = r() * 6;
  out.anim = (t) => {
    lava.map.offset.y = -t * 0.3;
    runeM.emissiveIntensity = 0.9 + Math.sin(t * 2.2) * 0.25;
    embers.forEach((e, i) => { const l = (t * 0.45 + i / 5 + ph) % 1; e.position.set(Math.sin(i * 2.3 + t) * 0.12, 0.15 + l * 2.2, -1.1 + i * 0.55 + Math.sin(t + i) * 0.1); e.scale.setScalar(1.2 - l); e.rotation.set(t * 2 + i, t * 3, 0); });
  };
  out.anim(0);
  out.lights.push({ x: 0, y: 3.2, z: 0.9, color: 0xff8a3a, power: 1.2, lamp: true }, { x: 0, y: 0.5, z: 0.6, color: 0xff5a1a, power: 1.4 });
  out.colliders.push({ x: -1.9, z: 0, r: 0.62 }, { x: 1.9, z: 0, r: 0.62 });
};

// (World v7) geysers a saga step erupts itself hold their own bursts: [x, z] entries
export const GEYSER_HUSH = [];
BUILD.geyser = (g, out, m, r) => {
  const moundM = T('mineral', () => { const p = new Painter(16, 20), rows = ['#f0e0c0', '#e0a060', '#faf4e8', '#c89a50', '#e8c890'], rr = rng(181); for (let y = 0; y < 20; y++) p.hline(0, y, 16, rows[Math.floor(y / 2) % rows.length]); for (let i = 0; i < 30; i++) p.px(rr() * 16, rr() * 20, '#fff8ec'); return tex(p.c, 3, 1); });
  const prof = [[1.0, 0], [0.95, 0.12], [0.8, 0.16], [0.72, 0.3], [0.58, 0.34], [0.5, 0.48], [0.36, 0.52], [0.26, 0.6], [0.2, 0.55], [0.01, 0.5]].map(([x, y]) => new THREE.Vector2(x, y));
  put(g, geo('geysermound', () => new THREE.LatheGeometry(prof, 14)), moundM);
  put(g, geo('geyserhole', () => new THREE.CylinderGeometry(0.2, 0.2, 0.02, 10)), C('geyserhole', 0x2a3a48), 0, 0.51, 0);
  glow(put(g, geo('geyserrim', () => new THREE.TorusGeometry(0.22, 0.035, 4, 12)), GL('geyserwater', 0x9fdcf0, 0x5ab0d8, 0.5), 0, 0.56, 0, 0, Math.PI / 2));
  inst(g, ICO(), C('crust', 0xffffff), [0.4, 1.5, 2.6, 3.7, 4.8, 5.8].map((a, i) => [Math.sin(a) * 0.88, 0.06, Math.cos(a) * 0.82, 0.14, 0.08, 0.12, a, 0, 0, i % 2 ? 0xe0a060 : 0xfaf4e8]));
  // steam: idle wisps, then a tall burst every few seconds
  const puffs = [], rr = rng(191);
  for (let i = 0; i < 9; i++) {
    const mat = toon(R3, { color: 0xf4f8ff, transparent: true, depthWrite: false });
    mat.opacity = 0;
    puffs.push({ p: glow(put(g, BOX1(), mat, 0, 0.6, 0)), mat, life: i / 9, dur: 2, vy: 0.5, sx: 0, sz: 0, big: false });
  }
  const CYC = 5.5, ph = r() * CYC;
  let wx = null, wz = null;
  out.anim = (t, dt = 0) => {
    dt = Math.min(Math.max(dt, 0), 0.1);
    if (wx === null && g.parent) { const v = new THREE.Vector3(); g.getWorldPosition(v); wx = v.x; wz = v.z; }
    const hushed = GEYSER_HUSH.length && wx !== null && GEYSER_HUSH.some(([x, z]) => Math.abs(x - wx) < 2.5 && Math.abs(z - wz) < 2.5);
    const c = ((t + ph) % CYC) / CYC, burst = !hushed && c < 0.32 ? Math.sin((c / 0.32) * Math.PI) : 0;
    for (const q of puffs) {
      q.life += dt / q.dur;
      if (q.life >= 1) {
        q.life -= 1;
        q.big = burst > 0.15;
        q.dur = q.big ? 1.1 + rr() * 0.3 : 1.8 + rr() * 0.6;
        q.vy = q.big ? 3.0 + rr() * 0.8 : 0.45 + rr() * 0.2;
        q.sx = (rr() - 0.5) * (q.big ? 0.5 : 0.25); q.sz = (rr() - 0.5) * 0.25;
      }
      const l = q.life, h = q.vy * q.dur * (l - (q.big ? 0.3 * l * l : 0));
      q.p.position.set(q.sx * l, 0.6 + h, q.sz * l);
      q.p.scale.setScalar((q.big ? 0.28 : 0.14) + l * (q.big ? 0.55 : 0.22));
      q.p.rotation.set(l * 1.5, l * 2 + q.sx * 5, 0);
      q.mat.opacity = (1 - l) * (q.big ? 0.85 : 0.5) * Math.min(1, l * 6);
    }
  };
  out.anim(0, 0);
  out.colliders.push({ x: 0, z: 0, r: 0.9 });
};

BUILD.onsen = (g, out, m, r, seed) => {
  // wooden deck (west), the steaming pool (east) ringed with stones
  put(g, TB(2.1, 0.2, 2.3), [m.dark, m.dark, m.planks, m.dark, m.dark, m.dark], -1.4, 0.1, 0.75);
  glow(put(g, B(2.35, 0.04, 2.9), GL('onsenwater4', 0x5aaec4, 0x2a7a96, 0.22), 1.0, 0.14, 0.02));
  const stones = [], rr = rng(201), sc = [0x9d98a3, 0x8f8a93, 0xa8a2a8, 0xb3adb0];
  const edge = (x0, z0, x1, z1, n) => { for (let i = 0; i < n; i++) { const k = (i + 0.5) / n, s = 0.16 + rr() * 0.08; stones.push([x0 + (x1 - x0) * k, 0.1, z0 + (z1 - z0) * k, s * 1.3, s, s * 1.1, rr() * 6, 0, 0, sc[i % 4]]); } };
  edge(-0.1, -1.45, 2.1, -1.45, 5); edge(2.16, -1.2, 2.16, 1.4, 5); edge(2.0, 1.5, 0.0, 1.5, 4); edge(-0.18, 1.3, -0.18, -1.2, 4);
  inst(g, ROCK(), C('onsenstone', 0xffffff), stones);
  // a bamboo fence behind & beside the pool
  const poles = [];
  for (let x = -0.3; x < 2.45; x += 0.2) poles.push([x, 0.8, -1.85, 0.1, 1.6, 0.1, 0, 0, 0, poles.length % 3 ? 0x9ab85a : 0x8aa84a]);
  for (let z = -1.65; z < 0.3; z += 0.2) poles.push([2.4, 0.75, z, 0.1, 1.5, 0.1, 0, 0, 0, poles.length % 3 ? 0x9ab85a : 0x8aa84a]);
  inst(g, CYL(), C('bamboo', 0xffffff), poles);
  inst(g, BOX1(), C('bamboodark', 0x6a8a3a), [[1.07, 0.5, -1.8, 2.8, 0.05, 0.05], [1.07, 1.3, -1.8, 2.8, 0.05, 0.05], [2.36, 0.5, -0.78, 0.05, 0.05, 2.2], [2.36, 1.25, -0.78, 0.05, 0.05, 2.2]]);
  // the bathhouse shed with its noren curtain
  const front = T('onsenfront', () => lit(29, 26, (p, q) => {
    p.rect(0, 0, 29, 26, '#6b4a34'); for (let x = 0; x < 29; x += 3) p.vline(x, 0, 26, '#5a3b2a'); p.rect(0, 23, 29, 3, '#8f8a93');
    p.rect(9, 6, 11, 17, '#2a1f26'); q.rect(10, 8, 9, 14, '#3a2410');
    for (const wx of [2, 22]) { p.rect(wx, 7, 5, 6, '#4a3024'); for (let y = 8; y < 12; y++) for (let x = wx + 1; x < wx + 4; x++) if ((x + y) % 2) p.px(x, y, '#f3d9a0'); q.rect(wx + 1, 8, 3, 4, '#ffb060'); }
  }));
  const side = T('onsenside', () => { const p = new Painter(24, 26); p.rect(0, 0, 24, 26, '#6b4a34'); for (let x = 0; x < 24; x += 3) p.vline(x, 0, 26, '#5a3b2a'); p.rect(0, 23, 24, 3, '#8f8a93'); return tex(p.c); });
  put(g, B(1.8, 1.6, 1.5), [side, side, side, side, front, side], -1.5, 0.8, -1.15);
  const roofM = T('onsenroof', () => tex(paintRoof(35, 17, '#4a5a6a', { seed: 9, kind: 'scallop' })), { shadowSide: THREE.DoubleSide });
  for (const s of [-1, 1]) put(g, B(2.0, 0.08, 0.98), roofM, -1.5, 1.82, -1.15 + s * 0.42, 0, s * 0.5);
  put(g, B(2.1, 0.12, 0.14), m.ink, -1.5, 2.04, -1.15);
  const norenM = T('noren', () => { const p = new Painter(6, 9), w = '#f4efe4'; p.rect(0, 0, 6, 9, '#34407a'); p.hline(0, 0, 6, '#262e5a'); for (const x of [1, 3]) { p.px(x, 1, w); p.px(x + 1, 2, w); p.px(x, 3, w); } p.px(0, 5, w); p.px(5, 5, w); p.hline(0, 6, 6, w); p.hline(1, 7, 4, w); return tex(p.c); }, { side: THREE.DoubleSide, shadowSide: THREE.DoubleSide });
  const norens = [];
  for (const x of [-1.67, -1.32]) { const pv = grp(g, x, 1.24, -0.37); put(pv, geo('norenpl', () => new THREE.PlaneGeometry(0.33, 0.5)), norenM, 0, -0.25, 0); norens.push(pv); }
  // a paper lantern at the corner, a bucket & a stool on the deck
  const paper = T('paperlamp', () => lit(8, 8, (p, q) => { p.rect(0, 0, 8, 8, '#f4e8d8'); p.hline(0, 0, 8, '#2a2433'); p.hline(0, 7, 8, '#2a2433'); p.rect(3, 2, 2, 4, '#c8454f'); p.hline(2, 3, 4, '#c8454f'); q.rect(0, 1, 8, 6, '#ffb070'); q.rect(3, 2, 2, 4, '#6a1a10'); }), { emissiveIntensity: 0.9 });
  put(g, B(0.02, 0.2, 0.02), m.iron, -0.66, 1.5, -0.3);
  glow(put(g, geo('paperlampgeo', () => new THREE.CylinderGeometry(0.14, 0.14, 0.32, 8)), paper, -0.66, 1.24, -0.3));
  put(g, geo('bucket', () => new THREE.CylinderGeometry(0.13, 0.11, 0.18, 8)), m.wood, -0.72, 0.29, 1.35);
  put(g, B(0.34, 0.18, 0.28), m.wood, -1.2, 0.29, 1.5);
  // steam off the water (as the chimneys' smoke: it drifts with the wind)
  for (const [x, z] of [[0.35, -0.8], [1.35, -0.1], [0.75, 0.9]]) out.chimneys.push({ x, y: 0.22, z, smoke: 'always', seed: seed + x * 10 });
  const ph = r() * 6;
  out.anim = (t) => { norens.forEach((n, i) => { n.rotation.x = Math.sin(t * 1.5 + i * 1.3 + ph) * 0.12; }); };
  out.anim(0);
  out.lights.push({ x: -0.66, y: 1.2, z: -0.1, color: 0xffa860, power: 1.1, lamp: true }, { x: 1.05, y: 0.6, z: 0.4, color: 0x9fe0f0, power: 0.5 });
  out.decks.push({ rect: [-2.45, -0.4, 2.1, 2.3], y: 0.2 });
  out.colliders.push({ rect: [-2.4, -1.9, 1.8, 1.5] }, { rect: [-0.4, -1.95, 2.9, 0.15] }, { rect: [2.32, -1.95, 0.15, 2.25] });
};

// ---------------------------------------------------------------------------
// Dino Isle
// ---------------------------------------------------------------------------
const fossil = () => C('fossil', 0xeee4cc), fossilD = () => C('fossild', 0xcdbf9e);
// a point along a Catmull-Rom curve through pts (k in 0..1)
function along(pts, k) {
  const n = pts.length - 1, f = Math.min(n - 1e-6, Math.max(0, k * n)), i = Math.floor(f), u = f - i;
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)];
  const cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
  return [cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])];
}

BUILD.dino_skeleton = (g, out, m, r) => {
  const bone = fossil(), joint = fossilD();
  // the spine: tail tip (west) → hips → shoulders → up the long neck (east)
  const spine = [[-6.2, 0.35], [-4.6, 1.3], [-2.9, 2.6], [-1.4, 3.35], [0, 3.55], [1.4, 3.6], [2.6, 4.5], [3.5, 5.6], [4.3, 6.4], [4.9, 6.6]];
  const verts = [], spines = [];
  for (let i = 0; i <= 34; i++) {
    const k = i / 34, [x, y] = along(spine, k), [x2, y2] = along(spine, Math.min(1, k + 0.01));
    const ang = Math.atan2(y2 - y, x2 - x), s = k < 0.3 ? 0.14 + k * 0.5 : k < 0.62 ? 0.3 : 0.3 - (k - 0.62) * 0.3;
    verts.push([x, y, 0, s * 1.2, s, s * 1.1, 0, 0, ang]);
    if (i % 2 === 0 && k > 0.12 && k < 0.66) spines.push([x, y + s * 0.9, 0, 0.07, s * 1.4, 0.12, 0, 0, ang]);
  }
  inst(g, BOX1(), bone, verts);
  inst(g, BOX1(), joint, spines);
  // the ribcage: ∩-shaped rib pairs hanging from the back
  const ribs = [];
  for (let i = 0; i < 8; i++) {
    const x = -1.35 + i * 0.4, [, y] = along(spine, 0.34 + i * 0.035), R = 1.0 - Math.abs(i - 3.5) * 0.07;
    ribs.push([x, y - R * 0.95, 0, R * 0.85, R * 0.95, R, eul(0, Math.PI / 2, 0)]);
  }
  inst(g, geo('drib', () => new THREE.TorusGeometry(1, 0.07, 5, 12, Math.PI)), bone, ribs);
  // four pillar legs with knobbly knees & wide feet (walk under the belly)
  for (const [hx, hy, fx] of [[-1.45, 3.2, -1.7], [1.35, 3.3, 1.6]]) for (const s of [-1, 1]) {
    const kx = (hx + fx) / 2 + (hx < 0 ? -0.2 : 0.2), ky = hy * 0.46;
    beam(g, bone, hx, hy, s * 0.72, kx, ky, s * 0.8, 0.3);
    beam(g, bone, kx, ky, s * 0.8, fx, 0.12, s * 0.82, 0.24);
    put(g, ICO(), joint, kx, ky, s * 0.8).scale.set(0.24, 0.26, 0.24);
    put(g, ICO(), joint, hx, hy, s * 0.72).scale.set(0.32, 0.3, 0.3);
    put(g, B(0.62, 0.14, 0.48), joint, fx, 0.07, s * 0.82);
    out.colliders.push({ x: fx, z: s * 0.82, r: 0.34 });
  }
  // the skull, high up at the end of the neck, peering south
  const sk = grp(g, 5.05, 6.55, 0.05, -0.35);
  put(sk, B(0.86, 0.46, 0.5), bone, 0.12, 0, 0);
  put(sk, B(0.5, 0.2, 0.42), joint, 0.3, -0.26, 0);
  for (const s of [-1, 1]) put(sk, B(0.18, 0.16, 0.06), m.hole, 0.02, 0.06, s * 0.24);
  put(sk, B(0.12, 0.08, 0.3), m.hole, 0.54, 0.1, 0);
  // the tail rests on the ground; old bones & a little dig site by its feet
  out.colliders.push({ x: -5.9, z: 0, r: 0.3 });
  inst(g, BOX1(), bone, [[-2.8, 0.06, 1.7, 0.6, 0.1, 0.14, 0.4], [-3.3, 0.06, 1.9, 0.42, 0.1, 0.12, -0.3], [2.9, 0.06, 1.6, 0.5, 0.1, 0.14, 1.2], [-0.2, 0.05, 1.9, 0.36, 0.08, 0.12, 0.7]]);
  put(g, B(0.5, 0.4, 0.4), m.wood, 3.4, 0.2, 1.2, 0.3);
  put(g, B(0.5, 0.06, 0.42), m.dark, 3.4, 0.43, 1.2, 0.3);
  beam(g, m.dark, 3.9, 0, 1.5, 4.1, 0.9, 1.3, 0.06);
  put(g, B(0.16, 0.08, 0.1), C('brush', 0xc8a060), 4.12, 0.95, 1.29);
  put(g, B(0.02, 0.9, 0.02), m.iron, 3.0, 0.45, 1.5);
  lantern(g, out, 3.0, 0.95, 1.5, { s: 0.7 });
};

BUILD.rex_nest = (g, out, m, r) => {
  const twigD = C('twigd', 0x5a3e28), leafy = C('nestleaf', 0x5a9a42);
  // a ring of branches, three layers, leaves tucked in
  const sticks = [], leaves = [];
  for (let layer = 0; layer < 3; layer++) for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + layer * 0.17, R = 2.1 - layer * 0.12, y = 0.12 + layer * 0.2;
    sticks.push([Math.cos(a) * R, y, Math.sin(a) * R * 0.85, 1.25 + r() * 0.4, 0.14, 0.14, -a + Math.PI / 2 + (r() - 0.5) * 0.5, 0, (r() - 0.5) * 0.3, layer % 2 ? 0x7a5a3a : 0x5a3e28]);
    if (i % 3 === layer) leaves.push([Math.cos(a) * (R + 0.1), y + 0.18, Math.sin(a) * (R + 0.1) * 0.85, 0.34, 0.12, 0.26, a]);
  }
  inst(g, BOX1(), C('twigw', 0xffffff), sticks);
  inst(g, ICO(), leafy, leaves);
  put(g, geo('nestbed', () => new THREE.CylinderGeometry(1.9, 1.7, 0.16, 16)), twigD, 0, 0.08, 0).scale.set(1, 1, 0.85);
  // three huge speckled eggs & a jumble of old bones
  const eggM = T('rexegg', () => { const p = new Painter(16, 16), rr = rng(441); p.rect(0, 0, 16, 16, '#efe6d0'); for (let i = 0; i < 26; i++) p.px(rr() * 16, rr() * 16, rr() < 0.6 ? '#8a6a4a' : '#b89a78'); return tex(p.c, 1); });
  for (const [x, z, s, tilt] of [[-0.5, -0.3, 1, 0.1], [0.45, -0.1, 0.92, -0.2], [0, 0.5, 0.86, 0.3]]) put(g, ICO(), eggM, x, 0.62 * s, z, 0, tilt, tilt * 0.5).scale.set(0.42 * s, 0.6 * s, 0.42 * s);
  const bone = fossil();
  inst(g, BOX1(), bone, [[1.3, 0.3, 0.9, 0.7, 0.1, 0.12, 0.6], [1.1, 0.34, 1.05, 0.12, 0.1, 0.5, 0.2], [-1.4, 0.3, 0.8, 0.6, 0.1, 0.12, -0.8]]);
  put(g, ICO(), bone, 1.55, 0.35, 0.7).scale.set(0.16, 0.12, 0.14);
  // a great fossil skull leaning on a rock behind the nest
  const sk = grp(g, 0, 0, -2.45);
  put(sk, ROCK(), C('nestrock', 0x7a7480), 0, 0.5, -0.2).scale.set(1.1, 0.7, 0.7);
  const head = grp(sk, 0, 1.05, 0.25, 0);
  put(head, B(1.3, 0.7, 0.8), bone, 0, 0, 0);
  put(head, B(0.9, 0.3, 0.75), fossilD(), 0.05, -0.45, 0.02);
  for (const s of [-1, 1]) put(head, B(0.2, 0.2, 0.06), m.hole, -0.2, 0.12, s * 0.4 + s * 0.01);
  const teeth = [];
  for (let k = 0; k < 7; k++) teeth.push([-0.45 + k * 0.15, -0.32, 0.38, 0.05, 0.14, 0.05, 0, Math.PI, 0]);
  inst(head, geo('cone5', () => new THREE.ConeGeometry(1, 1, 5)), C('tooth', 0xfff6e0), teeth);
  head.rotation.set(0, Math.PI / 2 + 0.2, 0.15);
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; out.colliders.push({ x: Math.cos(a) * 2.05, z: Math.sin(a) * 1.75, r: 0.42 }); }
  out.colliders.push({ x: 0, z: -2.6, r: 0.8 });
};

BUILD.dino_nest = (g, out, m, r, seed) => {
  const sticks = [];
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; sticks.push([Math.cos(a) * 0.46, 0.1, Math.sin(a) * 0.4, 0.42, 0.07, 0.07, -a + Math.PI / 2 + (r() - 0.5) * 0.4, 0, 0, i % 2 ? 0x7a5a3a : 0x5a3e28]); }
  inst(g, BOX1(), C('twigw', 0xffffff), sticks);
  put(g, geo('nestbed2', () => new THREE.CylinderGeometry(0.44, 0.38, 0.08, 10)), C('twigd', 0x5a3e28), 0, 0.05, 0);
  const cols = [[0xcfeede, 0x7ab8a0], [0xf4ead4, 0xb89a78], [0xe0d4f4, 0x9a86c4]][seed % 3];
  const egg = T('egg' + (seed % 3), () => { const p = new Painter(8, 8), rr = rng(450 + (seed % 3)); p.rect(0, 0, 8, 8, '#' + cols[0].toString(16).padStart(6, '0')); for (let i = 0; i < 9; i++) p.px(rr() * 8, rr() * 8, '#' + cols[1].toString(16).padStart(6, '0')); return tex(p.c, 1); });
  const n = 2 + (seed % 3);
  for (let i = 0; i < n; i++) { const a = i * 2.1 + seed; put(g, ICO(), egg, Math.cos(a) * 0.16, 0.2, Math.sin(a) * 0.13, 0, (r() - 0.5) * 0.4, (r() - 0.5) * 0.4).scale.set(0.13, 0.17, 0.13); }
  out.colliders.push({ x: 0, z: 0, r: 0.42 });
};

BUILD.dino_station = (g, out, m, r) => {
  const Y = 0.45;
  put(g, TB(4.4, 0.12, 3.4), [m.dark, m.dark, m.planks, m.dark, m.dark, m.dark], 0, Y - 0.06, 0);
  const poles = [];
  for (const x of [-2.05, 0, 2.05]) for (const z of [-1.55, 0, 1.55]) poles.push([x, (Y - 0.12) / 2, z, 0.16, Y, 0.16]);
  inst(g, geo('pole6', () => new THREE.CylinderGeometry(0.5, 0.5, 1, 6)), m.dark, poles);
  // plank walls, a door, two windows that glow at night, a footprint sign
  const front = T('stationfront', () => lit(51, 22, (p, q) => {
    p.rect(0, 0, 51, 22, '#b88a58');
    for (let y = 0; y < 22; y += 3) p.hline(0, y, 51, '#9a6e44');
    p.hline(0, 21, 51, '#6b4a2a');
    p.rect(21, 7, 9, 15, '#5a3b2a'); p.rect(22, 8, 7, 14, '#7a5238'); p.px(27, 15, '#f2c14e');
    for (const wx of [5, 38]) { p.rect(wx, 7, 8, 7, '#5a3b2a'); p.rect(wx + 1, 8, 6, 5, '#f3d9a0'); p.vline(wx + 4, 8, 5, '#5a3b2a'); q.rect(wx + 1, 8, 6, 5, '#ffc76a'); q.vline(wx + 4, 8, 5, '#000000'); }
    // the sign: a dinosaur footprint on a board over the door
    p.rect(19, 1, 13, 5, '#e8d4a0'); p.rect(19, 1, 13, 1, '#8a6a3a');
    for (const [dx, dy] of [[24, 3], [25, 4], [26, 3], [23, 2], [25, 2], [27, 2]]) p.px(dx, dy, '#4a7a3a');
  }));
  const side = T('stationside', () => { const p = new Painter(16, 16); p.rect(0, 0, 16, 16, '#b88a58'); for (let y = 0; y < 16; y += 3) p.hline(0, y, 16, '#9a6e44'); return tex(p.c); });
  put(g, B(3.2, 1.4, 2.0), [side, side, side, side, front, side], 0, Y + 0.7, -0.55);
  put(g, HIPROOF(), thatch(), 0, Y + 1.4 + 0.58, -0.55).scale.set(2.6, 1.16, 1.75);
  // the deck: rails, a telescope, crates, a big bone leaning by the door
  const rails = [];
  for (const x of [-2.15, 2.15]) rails.push([x, Y + 0.32, 0.6, 0.08, 0.64, 0.08], [x, Y + 0.32, 1.62, 0.08, 0.64, 0.08], [x, Y + 0.6, 1.1, 0.06, 0.06, 1.1]);
  rails.push([-1.3, Y + 0.32, 1.65, 0.08, 0.64, 0.08], [1.3, Y + 0.32, 1.65, 0.08, 0.64, 0.08], [-1.72, Y + 0.6, 1.65, 0.9, 0.06, 0.06], [1.72, Y + 0.6, 1.65, 0.9, 0.06, 0.06]);
  inst(g, BOX1(), m.wood, rails);
  const scope = grp(g, 1.55, Y, 1.0, -0.5);
  for (const s of [-1, 1]) beam(scope, m.dark, s * 0.18, 0, 0.12, 0, 0.7, 0, 0.04);
  beam(scope, m.dark, 0, 0, -0.2, 0, 0.7, 0, 0.04);
  put(scope, CYL(), C('brass', 0xd8a84a), 0.05, 0.82, 0, 0, 0, 1.1).scale.set(0.12, 0.62, 0.12);
  put(g, B(0.5, 0.42, 0.44), m.wood, -1.6, Y + 0.21, 0.95, 0.2);
  put(g, B(0.4, 0.34, 0.36), m.wood, -1.55, Y + 0.6, 0.93, -0.3);
  beam(g, fossil(), -0.75, Y, 0.62, -0.95, Y + 1.1, 0.5, 0.12);
  put(g, ICO(), fossilD(), -0.95, Y + 1.12, 0.5).scale.set(0.13, 0.11, 0.11);
  // a radio mast with a flag, a lantern by the door
  put(g, B(0.06, 2.4, 0.06), m.iron, 1.35, Y + 2.3, -1.2);
  for (const y of [2.6, 3.0, 3.35]) put(g, B(0.5 - (y - 2.6) * 0.3, 0.03, 0.03), m.iron, 1.35, Y + y, -1.2);
  const flag = put(g, B(0.46, 0.28, 0.02), C('stationflag', 0x4f9a5a), 1.62, Y + 3.2, -1.2);
  put(g, B(0.02, 0.4, 0.02), m.iron, -0.62, Y + 1.25, 0.5);
  lantern(g, out, -0.62, Y + 1.0, 0.52, { s: 0.7 });
  const ph = r() * 6;
  out.anim = (t) => { flag.rotation.y = Math.sin(t * 2.2 + ph) * 0.3; flag.scale.x = 0.9 + Math.sin(t * 3.1 + ph) * 0.1; };
  out.anim(0);
  out.decks.push({ rect: [-2.2, -1.7, 4.4, 3.4], y: Y });
  out.colliders.push({ rect: [-1.6, -1.55, 3.2, 2.0] }, { rect: [-2.25, -1.7, 0.12, 3.4] }, { rect: [2.13, -1.7, 0.12, 3.4] }, { rect: [-2.2, 1.6, 0.95, 0.12] }, { rect: [1.25, 1.6, 0.95, 0.12] });
};

// ---------------------------------------------------------------------------
// Everywhere
// ---------------------------------------------------------------------------
BUILD.waystone = (g, out, m, r) => {
  const stoneM = T('waystone2', () => { const p = speckle(16, 16, '#8a92ac', 201, 0.25); p.vline(0, 0, 16, '#727a94'); return tex(p.c, 2, 1); });
  put(g, geo('wsbase', () => new THREE.CylinderGeometry(0.5, 0.55, 0.14, 8)), C('wsbase', 0x8e94a8), 0, 0.07, 0, Math.PI / 8);
  put(g, geo('wsbase2', () => new THREE.CylinderGeometry(0.38, 0.42, 0.12, 8)), C('wsbase2', 0x9aa0b4), 0, 0.2, 0, Math.PI / 8);
  const prof = [[0.34, 0], [0.36, 0.3], [0.34, 0.75], [0.29, 0.92], [0.21, 1.04], [0.11, 1.11], [0.01, 1.13]].map(([x, y]) => new THREE.Vector2(x, y));
  put(g, geo('wsstone', () => new THREE.LatheGeometry(prof, 12)), stoneM, 0, 0.26, 0).scale.set(1, 1, 0.62);
  put(g, ICO(), C('moss', 0x6f9150), -0.2, 0.28, 0.12).scale.set(0.16, 0.05, 0.1);
  // the star rune in a ring, glowing dots on the plinth, a floating gem
  const starM = GL('waystar', 0x9ff8f0, 0x3fe0d8, 0.9);
  const star = geo('wsstar', () => { const sh = new THREE.Shape(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 2, rad = i % 2 ? 0.08 : 0.25; if (i) sh.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); else sh.moveTo(Math.cos(a) * rad, Math.sin(a) * rad); } return new THREE.ShapeGeometry(sh); });
  glow(put(g, star, starM, 0, 0.9, 0.222));
  glow(put(g, geo('wsring', () => new THREE.RingGeometry(0.28, 0.32, 16)), starM, 0, 0.9, 0.2));
  glow(inst(g, ICO(), starM, [[0, 0.15, 0.49, 0.035, 0.035, 0.035], [0.49, 0.15, 0, 0.035, 0.035, 0.035], [-0.49, 0.15, 0, 0.035, 0.035, 0.035], [0, 0.15, -0.49, 0.035, 0.035, 0.035]]));
  const gem = glow(put(g, OCT(), GL('waygem', 0x9ff8f0, 0x3fe0d8, 0.9), 0, 1.6, 0));
  gem.scale.set(0.11, 0.17, 0.11);
  const ph = r() * 6;
  out.anim = (t) => {
    starM.emissiveIntensity = 0.65 + 0.55 * (0.5 + 0.5 * Math.sin(t * 2.2));
    gem.rotation.y = t * 1.2 + ph;
    gem.position.y = 1.6 + Math.sin(t * 1.6 + ph) * 0.05;
  };
  out.anim(0);
  out.lights.push({ x: 0, y: 0.95, z: 0.5, color: 0x8ff0ff, power: 1.0, lamp: true });
  out.colliders.push({ x: 0, z: 0, r: 0.45 });
};

BUILD.camp = (g, out, m, r, seed, poi, r3d) => {
  // the valley's own camp pieces: the sewn ridge tent (in this camp's colour), log seats with their
  // moss & fungus, a crate; a campfire of stones & crossed logs, embers, flames and its smoke
  const v = seed % 4, tc = ['#e8883a', '#5f9a4c', '#4d7fc4', '#c8454f'][v];
  const piece = (o, x, z, ry = 0) => {
    const P = buildProp(r3d, { ...o, x: 0, y: 0 });
    P.obj.position.set(x, 0, z); P.obj.rotation.y = ry;
    g.add(P.obj);
    const c = Math.cos(ry), s = Math.sin(ry);
    for (const q of P.colliders) out.colliders.push(q.rect ? { rect: [q.rect[0] + x, q.rect[1] + z, q.rect[2], q.rect[3]] } : { x: x + q.x * c + q.z * s, z: z - q.x * s + q.z * c, r: q.r });
    return P;
  };
  const tent = piece({ type: 'tent', color: tc }, -1.0, -0.55);
  const fx = 0.8, fz = 0.25;
  inst(g, ROCK(), C('campstone', 0x8a858e), Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return [fx + Math.cos(a) * 0.38, 0.06, fz + Math.sin(a) * 0.3, 0.1, 0.08, 0.09, a]; }));
  for (const ry of [0.5, -0.5]) put(g, geo('camplog', () => new THREE.CylinderGeometry(0.06, 0.07, 0.6, 6)), C('camplog', 0x6b4330), fx, 0.08, fz, ry, 0, Math.PI / 2);
  const coals = embers(R3); coals.position.set(fx, 0.04, fz); g.add(coals);
  const fire = flames(g, fx, 0.08, fz, 1);
  for (const a of [0.3, 2.4, 4.5]) beam(g, m.dark, fx + Math.cos(a) * 0.45, 0, fz + Math.sin(a) * 0.4, fx, 1.05, fz, 0.04);
  put(g, B(0.015, 0.2, 0.015), m.iron, fx, 0.95, fz);
  put(g, geo('pot', () => new THREE.CylinderGeometry(0.16, 0.12, 0.2, 8)), m.iron, fx, 0.76, fz);
  out.chimneys.push({ x: fx, y: 0.95, z: fz, smoke: 'always', seed });
  piece({ type: 'logseat' }, fx, 1.25);
  piece({ type: 'logseat' }, 1.8, 0.2, Math.PI / 2);
  piece({ type: 'crate' }, -2.0, 1.0, 0.2);
  put(g, geo('bedroll', () => new THREE.CylinderGeometry(0.12, 0.12, 0.62, 8)), C('bedroll' + v, [0xc8454f, 0x3f6f9e, 0x6d4a8a, 0x3f9b98][v]), -0.3, 0.12, 0.95, 0.2, 0, Math.PI / 2);
  const pen = tent.animPart;
  out.anim = (t) => { flick(fire, t); if (pen) pen.rotation.y = Math.sin(t * 3.1 + seed) * 0.3; };
  out.anim(0);
  out.lights.push({ x: fx, y: 0.7, z: fz + 0.2, color: 0xff5f2a, power: 1.9, lamp: true, fire: true, flicker: true, dist: 9 });
  out.colliders.push({ x: fx, z: fz, r: 0.45 });
};

// World v7: the Dawnlands' landmarks, built with this file's helpers
const H7 = { THREE, put, grp, beam, inst, lantern, glow, geo, B, ICO, ROCK, OCT, CYL, C, GL, T, tex, lit, speckle, Painter, paintRoof, rng };
installDawn(BUILD, H7);
installPeaks(BUILD, H7);
installFrontier(BUILD, H7);
