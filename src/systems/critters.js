// Wildlife around the valley. Each species knows where it lives (a box of
// the map + the ground it likes), when it's awake, how it moves (wander,
// hop, swim, perch…) and how shy it is. Critters near you are simulated &
// drawn; the first time you get a good look at one it goes in your log.

import { THREE, toon } from '../render/r3d.js';
import { buildFurniture } from '../models/furniture.js';
import { softBoxGeo, bakeTree } from '../models/geom.js';
import { FARM_POND, WILLOW_LAKE, KOI_POND, OX, OZ } from '../world/overworld.js';
import { TT } from '../world/tiles.js';

const MIRROR_POND = { x: OX + 10, z: OZ + 6.5, rx: 4.6, rz: 2.8 };
const P = 1 / 16;

// ---------------------------------------------------------------------------
// Species: habitat, schedule, behaviour
// ---------------------------------------------------------------------------
// zones: [{ box: [x0, z0, x1, z1], tiles: [...], n }]; move: wander | hop | swim | perch | fly (gulls)
export const SPECIES = {
  hen: { name: 'Hen', move: 'wander', speed: 0.9, shy: 0, day: true },
  duck: { name: 'Mallard', move: 'swim', speed: 0.5, shy: 0 },
  gull: { name: 'Seagull', move: 'wander', speed: 0.8, shy: 2.3, flies: true, day: true },
  turtle: { name: 'Sea Turtle', move: 'wander', speed: 0.25, shy: 1.6, hides: true },
  deer: {
    name: 'Deer', move: 'wander', speed: 0.7, shy: 3.6, flee: 4.2, graze: true,
    zones: [{ box: [4, 3, 40, 28], tiles: [TT.LEAVES], n: 4 }, { box: [60, 14, 100, 40], tiles: [TT.GRASS, TT.FOREST], n: 3 }, { box: [186, 4, 236, 38], tiles: [TT.SNOW], n: 2 }],
  },
  rabbit: {
    name: 'Rabbit', move: 'hop', speed: 1.2, shy: 2.8, flee: 4.5, day: true,
    zones: [{ box: [118, 44, 144, 88], tiles: [TT.MEADOW], n: 4 }, { box: [2, 30, 44, 86], tiles: [TT.GRASS], n: 4 }, { box: [186, 46, 236, 76], tiles: [TT.PETALS], n: 3 }],
  },
  hare: {
    name: 'Snow Hare', move: 'hop', speed: 1.3, shy: 2.8, flee: 4.8,
    zones: [{ box: [186, 4, 236, 40], tiles: [TT.SNOW], n: 4 }],
  },
  fox: {
    name: 'Red Fox', move: 'wander', speed: 1.1, shy: 2.6, flee: 3.4, curious: true, night: true,
    zones: [{ box: [4, 3, 40, 28], tiles: [TT.LEAVES], n: 2 }, { box: [40, 10, 100, 40], tiles: [TT.GRASS, TT.FOREST], n: 2 }],
  },
  arcticfox: {
    name: 'Snow Fox', move: 'wander', speed: 1.1, shy: 2.6, flee: 3.4, curious: true,
    zones: [{ box: [188, 4, 236, 38], tiles: [TT.SNOW], n: 2 }],
  },
  squirrel: {
    name: 'Squirrel', move: 'dart', speed: 2.4, shy: 2.2, flee: 3, day: true,
    zones: [{ box: [4, 3, 40, 28], tiles: [TT.LEAVES], n: 4 }, { box: [44, 52, 118, 90], tiles: [TT.GRASS], n: 3 }, { box: [40, 10, 100, 40], tiles: [TT.GRASS], n: 2 }],
  },
  frog: {
    name: 'Pond Frog', move: 'hop', speed: 0.9, shy: 1.4, flee: 2, waterside: true,
    zones: [{ box: [180, 74, 236, 94], tiles: [TT.MARSH], n: 7 }, { box: [44, 42, 64, 52], tiles: [TT.GRASS], n: 2 }, { box: [26, 70, 44, 84], tiles: [TT.GRASS], n: 2 }, { box: [148, 56, 170, 72], tiles: [TT.MEADOW], n: 2 }],
  },
  hedgehog: {
    name: 'Hedgehog', move: 'wander', speed: 0.35, shy: 1.5, hides: true, night: true,
    zones: [{ box: [40, 10, 100, 44], tiles: [TT.GRASS, TT.FOREST], n: 2 }, { box: [44, 52, 118, 90], tiles: [TT.GRASS], n: 2 }, { box: [4, 3, 40, 28], tiles: [TT.LEAVES], n: 1 }],
  },
  crab: {
    name: 'Shore Crab', move: 'crab', speed: 0.8, shy: 1.6, hides: true,
    zones: [{ box: [44, 88, 140, 100], tiles: [TT.SAND], n: 5 }, { box: [146, 104, 176, 122], tiles: [TT.SAND], n: 3 }, { box: [142, 88, 236, 100], tiles: [TT.SAND], n: 3 }],
  },
  songbird: {
    name: 'Songbird', move: 'hop', speed: 0.8, shy: 2.2, flies: true, day: true,
    zones: [{ box: [44, 52, 118, 90], tiles: [TT.GRASS, TT.PLAZA], n: 6 }, { box: [2, 30, 44, 86], tiles: [TT.GRASS], n: 3 }, { box: [186, 46, 236, 76], tiles: [TT.PETALS], n: 4 }],
  },
  heron: {
    name: 'Grey Heron', move: 'wade', speed: 0.3, shy: 3.2, flies: true,
    zones: [{ box: [180, 74, 236, 94], tiles: [TT.WATER], n: 3 }],
  },
  koi: { name: 'Koi', move: 'swim', speed: 0.6, shy: 0 },
  owl: {
    name: 'Tawny Owl', move: 'perch', speed: 0, shy: 2.4, flies: true, night: true,
    zones: [{ box: [186, 4, 236, 38], tiles: [TT.SNOW], n: 2 }, { box: [40, 10, 100, 40], tiles: [TT.GRASS, TT.FOREST], n: 2 }, { box: [4, 3, 40, 28], tiles: [TT.LEAVES], n: 1 }],
  },
  sheep: { name: 'Sheep', move: 'wander', speed: 0.5, shy: 0, graze: true },
};
export const SPECIES_ORDER = ['hen', 'sheep', 'duck', 'gull', 'turtle', 'crab', 'rabbit', 'hare', 'squirrel', 'deer', 'fox', 'arcticfox', 'songbird', 'frog', 'hedgehog', 'heron', 'koi', 'owl'];

// ---------------------------------------------------------------------------
export class Critters {
  constructor(world) {
    this.world = world;
    this.r3d = world.r3d;
    this.root = new THREE.Group();
    this.list = [];
  }

  mat(c, key) { return toon(this.r3d, { color: c, key: 'crit' + key }); }

  build() {
    const r = (a, b) => a + Math.random() * (b - a);
    // farmyard hens & the sheep in their pasture
    for (let i = 0; i < 6; i++) {
      const res = buildFurniture(this.r3d, { type: 'chicken', x: i * 1.7, z: i, color: ['#f4efe4', '#b8763a', '#e0924a'][i % 3] });
      this.add('hen', res.obj, { x: 26.5 + r(-3, 3), z: 52.6 + r(-1.2, 1.6) }, { home: { x: 26.5, z: 52.8 }, range: 3.4, anim: res.anim });
    }
    for (let i = 0; i < 5; i++) this.add('sheep', this.sheep(i === 4), { x: 16.5 + r(-2, 2), z: 47 + r(-1.5, 1.5) }, { home: { x: 16.5, z: 47 }, range: 2.4 });
    // water birds & fish
    const ponds = [[FARM_POND, 3], [WILLOW_LAKE, 4], [MIRROR_POND, 2]];
    for (const [Pd, n] of ponds) for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      this.add('duck', this.duck(i === 0), { x: Pd.x + Math.cos(a) * Pd.rx * 0.5, z: Pd.z + Math.sin(a) * Pd.rz * 0.5 }, { pond: Pd });
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      this.add('koi', this.koi(i), { x: KOI_POND.x + Math.cos(a) * 3, z: KOI_POND.z + Math.sin(a) * 1.8 }, { pond: { ...KOI_POND, rx: KOI_POND.rx * 0.95, rz: KOI_POND.rz * 0.9 }, swimAngle: a, swimR: 0.4 + (i % 3) * 0.18 });
    }
    // gulls on Driftwood Beach and the bluffs; turtles on Turtle Isle
    for (let i = 0; i < 5; i++) this.add('gull', this.gull(), this.spotFor('beach'), { zone: 'beach' });
    for (let i = 0; i < 4; i++) this.add('gull', this.gull(), this.spotFor('bluffs'), { zone: 'bluffs' });
    for (let i = 0; i < 3; i++) this.add('turtle', this.turtle(), this.spotFor('island'), { zone: 'island' });
    // wild things, spread through their habitats
    for (const [kind, sp] of Object.entries(SPECIES)) {
      if (!sp.zones) continue;
      for (const zone of sp.zones) for (let i = 0; i < zone.n; i++) {
        const pos = this.spotIn(zone, sp.waterside);
        if (!pos) continue;
        const obj = this.model(kind, i);
        this.add(kind, obj, pos, { zoneDef: zone, home: { ...pos }, range: kind === 'heron' ? 3 : 7 });
      }
    }
    return this;
  }

  add(kind, obj, pos, o = {}) {
    const sp = SPECIES[kind] || {};
    // (each moving part merged into one mesh: the koi's tail is found by its place, so it stays)
    if (kind !== 'koi') bakeTree(obj, toon(this.r3d, { color: 0xffffff, vertexColors: true, key: 'p-vc' }));
    obj.position.set(pos.x, 0, pos.z);
    const big = ['deer', 'sheep', 'heron', 'hen'].includes(kind);
    obj.traverse((m) => { if (m.isMesh) { m.castShadow = big; m.receiveShadow = true; } });
    this.root.add(obj);
    const c = { kind, sp, obj, x: pos.x, z: pos.z, y: 0, tx: pos.x, tz: pos.z, wait: Math.random() * 3, ph: Math.random() * 10, fear: 0, ...o };
    this.list.push(c);
    return c;
  }

  // a random spot of the right ground inside a zone
  spotIn(zone, waterside = false) {
    const m = this.world.mapData;
    const [x0, z0, x1, z1] = zone.box;
    for (let tries = 0; tries < 300; tries++) {
      const x = x0 + Math.random() * (x1 - x0), z = z0 + Math.random() * (z1 - z0);
      const tx = Math.floor(x), tz = Math.floor(z);
      if (tx < 0 || tz < 0 || tx >= m.w || tz >= m.h) continue;
      if (!zone.tiles.includes(m.ground[tz * m.w + tx])) continue;
      if (zone.tiles[0] === TT.WATER) {
        // herons wade near the reeds, not in the middle of a pool
        const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => m.ground[(tz + dz) * m.w + tx + dx] === TT.MARSH);
        if (!near) continue;
      } else if (this.world.overCol && this.world.overCol.blocked(x, z, 0.3)) continue;
      if (waterside) {
        let wet = false;
        for (let dz = -2; dz <= 2 && !wet; dz++) for (let dx = -2; dx <= 2; dx++) if (m.ground[(tz + dz) * m.w + tx + dx] === TT.WATER) { wet = true; break; }
        if (!wet && Math.random() < 0.8) continue;
      }
      return { x, z };
    }
    return null;
  }

  spotFor(zone) {
    const m = this.world.mapData;
    for (let tries = 0; tries < 200; tries++) {
      let x, z;
      if (zone === 'beach') { x = 50 + Math.random() * 60; z = 90 + Math.random() * 8; }
      else if (zone === 'bluffs') { x = 4 + Math.random() * 34; z = 84 + Math.random() * 10; }
      else { x = 149 + Math.random() * 22; z = 108 + Math.random() * 12; }
      const t = m.ground[Math.floor(z) * m.w + Math.floor(x)];
      const ok = zone === 'bluffs' ? t === TT.ROCK : t === TT.SAND;
      if (ok && !(this.world.overCol && this.world.overCol.blocked(x, z, 0.3))) return { x, z };
    }
    return { x: 80, z: 94 };
  }

  // -------------------------------------------------------------------------
  // Models (voxel style: a handful of boxes each)
  // -------------------------------------------------------------------------
  model(kind, i) {
    switch (kind) {
      case 'deer': return this.deer(i % 2 === 0);
      case 'rabbit': return this.rabbit(i % 2 ? '#a8845c' : '#c8a07a');
      case 'hare': return this.rabbit('#f4f4f8', true);
      case 'fox': return this.fox('#d9713a');
      case 'arcticfox': return this.fox('#f1f3f8', true);
      case 'squirrel': return this.squirrel();
      case 'frog': return this.frog(i);
      case 'hedgehog': return this.hedgehog();
      case 'crab': return this.crab();
      case 'songbird': return this.songbird(i);
      case 'heron': return this.heron();
      case 'owl': return this.owl();
      default: return new THREE.Group();
    }
  }

  // a soft (bevelled) box for the bigger parts, a plain one for the tiny bits
  box(g, w, h, d, c, x, y, z, key) {
    const soft = Math.min(w, h, d) >= 0.05;
    const m = new THREE.Mesh(soft ? softBoxGeo(w, h, d, 0.28) : new THREE.BoxGeometry(w, h, d), this.mat(c, key || c));
    m.position.set(x, y, z);
    g.add(m);
    return m;
  }
  // a round puff (wool, feathers, a tail's brush), squashed by sy
  puff(g, r, sy, c, x, y, z, key) {
    const m = new THREE.Mesh(this.ico || (this.ico = new THREE.IcosahedronGeometry(1, 1)), this.mat(c, key || c));
    m.scale.set(r, r * sy, r);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  }

  duck(male) {
    // a mallard: a rounded body riding low, a curl of tail, a blue flash on the wing; the drake
    // with his green head & white collar, the hen speckled brown
    const g = new THREE.Group();
    const body = male ? '#8a6a4a' : '#b08a62', back = male ? '#a8a4a0' : '#9a7a52';
    this.box(g, 0.36, 0.17, 0.24, body, 0, 0.09, 0);
    this.box(g, 0.24, 0.07, 0.2, back, -0.03, 0.18, 0);
    this.box(g, 0.1, 0.05, 0.03, '#3f6fc8', -0.04, 0.15, 0.115);
    this.box(g, 0.1, 0.05, 0.03, '#3f6fc8', -0.04, 0.15, -0.115);
    this.box(g, 0.1, 0.1, 0.14, back, -0.19, 0.16, 0);
    if (male) this.box(g, 0.05, 0.05, 0.04, '#2a2433', -0.25, 0.23, 0);
    this.box(g, 0.13, 0.15, 0.13, male ? '#2f7a4a' : '#9a7a52', 0.16, 0.26, 0);
    this.box(g, 0.1, 0.035, 0.07, '#f2b63d', 0.26, 0.24, 0);
    for (const z of [-0.05, 0.05]) this.box(g, 0.02, 0.02, 0.02, '#1a1422', 0.2, 0.29, z * 1.32);
    if (male) this.box(g, 0.14, 0.025, 0.14, '#f4efe4', 0.15, 0.18, 0);
    return g;
  }

  gull() {
    const g = new THREE.Group();
    const bodyG = new THREE.Group();
    g.add(bodyG);
    this.box(bodyG, 0.36, 0.18, 0.18, '#f4f1ec', 0, 0.26, 0);
    this.box(bodyG, 0.26, 0.06, 0.2, '#b8bcc8', -0.04, 0.34, 0);
    this.box(bodyG, 0.14, 0.14, 0.13, '#f4f1ec', 0.17, 0.38, 0);
    this.box(bodyG, 0.1, 0.035, 0.045, '#f2b63d', 0.28, 0.36, 0);
    this.box(bodyG, 0.02, 0.02, 0.046, '#e0463f', 0.3, 0.345, 0);
    for (const z of [-0.05, 0.05]) this.box(bodyG, 0.02, 0.02, 0.02, '#1a1422', 0.21, 0.41, z * 1.32);
    this.box(bodyG, 0.12, 0.05, 0.14, '#3b3844', -0.21, 0.3, 0);
    const wl = new THREE.Group(); wl.position.set(0, 0.32, 0.09); bodyG.add(wl);
    const wr = new THREE.Group(); wr.position.set(0, 0.32, -0.09); bodyG.add(wr);
    this.box(wl, 0.24, 0.03, 0.34, '#9aa0ae', 0, 0, 0.17);
    this.box(wr, 0.24, 0.03, 0.34, '#9aa0ae', 0, 0, -0.17);
    this.box(wl, 0.08, 0.031, 0.1, '#3b3844', -0.06, 0, 0.3);
    this.box(wr, 0.08, 0.031, 0.1, '#3b3844', -0.06, 0, -0.3);
    this.box(g, 0.03, 0.17, 0.03, '#f2b63d', 0, 0.09, 0.05);
    this.box(g, 0.03, 0.17, 0.03, '#f2b63d', 0, 0.09, -0.05);
    g.userData.wings = [wl, wr];
    g.userData.bodyG = bodyG;
    return g;
  }

  turtle() {
    // a sea turtle: a domed shell of plates with a pale rim, flippers, a head that pulls in
    const g = new THREE.Group();
    this.box(g, 0.46, 0.12, 0.38, '#c8b88a', 0, 0.09, 0);
    this.box(g, 0.42, 0.12, 0.34, '#5f8a4f', 0, 0.16, 0);
    this.box(g, 0.28, 0.08, 0.22, '#7aa65a', 0, 0.24, 0);
    for (const [x, z] of [[-0.08, -0.06], [0.08, 0.06], [-0.08, 0.07], [0.08, -0.06]]) this.box(g, 0.1, 0.02, 0.08, '#4f7a42', x, 0.285, z);
    const head = this.box(g, 0.15, 0.1, 0.12, '#9ab86a', 0.27, 0.13, 0);
    for (const z of [-0.04, 0.04]) this.box(head, 0.02, 0.02, 0.02, '#1a1422', 0.05, 0.02, z * 1.2);
    for (const [x, z, a] of [[0.15, 0.2, -0.5], [0.15, -0.2, 0.5], [-0.16, 0.18, 0.4], [-0.16, -0.18, -0.4]]) { const f = this.box(g, 0.14, 0.04, 0.07, '#9ab86a', x, 0.06, z); f.rotation.y = a; }
    g.userData.head = head;
    return g;
  }

  deer(stag) {
    // a roe deer: a rounded body, a pale belly & white rump patch, slim dark-socked legs, a long
    // neck; big ears; the stag with branching antlers
    const g = new THREE.Group();
    const body = new THREE.Group(); g.add(body);
    const fur = '#b07a4a', dark = '#6b4a34', light = '#f1e2c8';
    this.box(body, 0.74, 0.34, 0.3, fur, 0, 0.63, 0);
    this.box(body, 0.5, 0.1, 0.26, light, 0.02, 0.48, 0);
    this.box(body, 0.1, 0.2, 0.26, '#fbf6ea', -0.37, 0.66, 0);
    this.box(body, 0.06, 0.1, 0.1, '#fbf6ea', -0.42, 0.78, 0);
    for (const [x, z] of [[0.26, 0.09], [0.26, -0.09], [-0.26, 0.09], [-0.26, -0.09]]) {
      this.box(body, 0.07, 0.34, 0.07, fur, x, 0.36, z);
      this.box(body, 0.06, 0.2, 0.06, dark, x, 0.11, z);
    }
    const neck = new THREE.Group(); neck.position.set(0.3, 0.74, 0); body.add(neck);
    const nk = this.box(neck, 0.14, 0.38, 0.14, fur, 0.04, 0.16, 0);
    nk.rotation.z = -0.18;
    this.box(neck, 0.1, 0.16, 0.12, light, 0.09, 0.08, 0);
    const head = new THREE.Group(); head.position.set(0.08, 0.36, 0); neck.add(head);
    this.box(head, 0.24, 0.16, 0.15, fur, 0.07, 0, 0);
    this.box(head, 0.1, 0.1, 0.12, '#c8905a', 0.18, -0.02, 0);
    this.box(head, 0.04, 0.04, 0.06, '#2a2433', 0.24, -0.01, 0);
    for (const z of [-0.06, 0.06]) this.box(head, 0.03, 0.03, 0.02, '#1a1422', 0.1, 0.03, z * 1.28);
    for (const z of [-1, 1]) { const e = this.box(head, 0.05, 0.13, 0.08, fur, -0.03, 0.1, z * 0.1); e.rotation.x = z * 0.5; }
    if (stag) for (const z of [-1, 1]) {
      const a = this.box(head, 0.035, 0.26, 0.035, '#e9dcc8', -0.02, 0.22, z * 0.05); a.rotation.x = z * 0.25;
      const t1 = this.box(head, 0.1, 0.03, 0.03, '#e9dcc8', 0.03, 0.24, z * 0.08); t1.rotation.z = 0.5;
      const t2 = this.box(head, 0.08, 0.03, 0.03, '#e9dcc8', -0.05, 0.3, z * 0.1); t2.rotation.z = -0.5;
    }
    g.userData.neck = neck;
    return g;
  }

  rabbit(color, snowy = false) {
    // a rabbit: a round body & head, long ears (pink inside), a cotton tail, big dark eyes
    const g = new THREE.Group();
    const body = new THREE.Group(); g.add(body);
    this.box(body, 0.26, 0.18, 0.19, color, 0, 0.11, 0);
    this.box(body, 0.1, 0.08, 0.2, color, -0.06, 0.05, 0);
    this.box(body, 0.14, 0.14, 0.14, color, 0.14, 0.21, 0);
    this.box(body, 0.05, 0.05, 0.08, snowy ? '#f4f4f8' : '#f1e2c8', 0.21, 0.18, 0);
    for (const z of [-0.035, 0.035]) {
      const e = this.box(body, 0.05, 0.17, 0.035, color, 0.11, 0.35, z); e.rotation.x = z > 0 ? 0.18 : -0.18;
      const i = this.box(body, 0.02, 0.1, 0.02, '#f4a4b6', 0.13, 0.35, z * 1.4); i.rotation.x = e.rotation.x;
    }
    for (const z of [-0.05, 0.05]) this.box(body, 0.03, 0.03, 0.02, '#1a1422', 0.18, 0.24, z * 1.2);
    this.puff(body, 0.05, 1, snowy ? '#ffffff' : '#f4efe4', -0.15, 0.15, 0);
    g.userData.body = body;
    return g;
  }

  fox(color, snowy = false) {
    // a fox: a long body, white bib & muzzle, dark socks, pointed ears with dark tips, a big brush
    // of a tail with a white tip
    const g = new THREE.Group();
    const body = new THREE.Group(); g.add(body);
    const white = '#fbfbff', dark = snowy ? '#b8c4d8' : '#3b2a2e';
    this.box(body, 0.46, 0.19, 0.18, color, 0, 0.3, 0);
    this.box(body, 0.16, 0.12, 0.16, white, 0.16, 0.25, 0);
    for (const [x, z] of [[0.16, 0.06], [0.16, -0.06], [-0.16, 0.06], [-0.16, -0.06]]) {
      this.box(body, 0.05, 0.14, 0.05, color, x, 0.17, z);
      this.box(body, 0.05, 0.09, 0.05, dark, x, 0.05, z);
    }
    const head = new THREE.Group(); head.position.set(0.28, 0.42, 0); body.add(head);
    this.box(head, 0.18, 0.15, 0.17, color, 0, 0, 0);
    this.box(head, 0.13, 0.07, 0.09, white, 0.12, -0.04, 0);
    this.box(head, 0.03, 0.03, 0.04, '#1a1422', 0.19, -0.02, 0);
    for (const z of [-0.045, 0.045]) this.box(head, 0.02, 0.025, 0.02, '#1a1422', 0.09, 0.02, z * 1.9);
    for (const z of [-0.055, 0.055]) {
      this.box(head, 0.05, 0.08, 0.05, color, -0.02, 0.11, z);
      this.box(head, 0.04, 0.03, 0.04, dark, -0.02, 0.16, z);
    }
    const tail = new THREE.Group(); tail.position.set(-0.24, 0.34, 0); body.add(tail);
    const brush = this.box(tail, 0.28, 0.12, 0.12, color, -0.13, -0.02, 0);
    brush.rotation.z = 0.3;
    this.box(tail, 0.08, 0.1, 0.1, white, -0.29, -0.08, 0);
    g.userData.tail = tail;
    g.userData.head = head;
    return g;
  }

  squirrel() {
    const g = new THREE.Group();
    const body = new THREE.Group(); g.add(body);
    const c = '#b8683a';
    this.box(body, 0.16, 0.12, 0.1, c, 0, 0.08, 0);
    this.box(body, 0.1, 0.1, 0.1, c, 0.1, 0.15, 0);
    this.box(body, 0.03, 0.03, 0.03, '#2a2433', 0.15, 0.17, 0.04);
    for (const z of [-0.03, 0.03]) this.box(body, 0.02, 0.05, 0.02, c, 0.08, 0.22, z);
    this.box(body, 0.06, 0.05, 0.06, '#f1e2c8', 0.08, 0.06, 0);
    const tail = new THREE.Group(); tail.position.set(-0.08, 0.1, 0); body.add(tail);
    this.box(tail, 0.08, 0.22, 0.08, c, -0.03, 0.1, 0);
    this.puff(tail, 0.07, 1.1, '#d9853a', 0.02, 0.23, 0);
    g.userData.tail = tail;
    g.userData.body = body;
    return g;
  }

  frog(i) {
    const g = new THREE.Group();
    const body = new THREE.Group(); g.add(body);
    const c = i % 3 === 0 ? '#6fae4c' : i % 3 === 1 ? '#5f9a4c' : '#8fbf5a';
    this.box(body, 0.18, 0.08, 0.16, c, 0, 0.05, 0);
    for (const z of [-0.05, 0.05]) { this.box(body, 0.05, 0.05, 0.05, c, 0.06, 0.1, z); this.box(body, 0.025, 0.025, 0.025, '#2a2433', 0.08, 0.12, z); }
    for (const z of [-0.09, 0.09]) this.box(body, 0.1, 0.04, 0.05, c, -0.06, 0.02, z);
    this.box(body, 0.12, 0.02, 0.12, '#e8f0c8', 0.02, 0.012, 0);
    g.userData.body = body;
    return g;
  }

  hedgehog() {
    const g = new THREE.Group();
    const body = new THREE.Group(); g.add(body);
    const spikes = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), this.mat('#6b4a34', 'hedgespikes'));
    spikes.scale.set(0.17, 0.12, 0.13); spikes.position.set(-0.02, 0.1, 0); body.add(spikes);
    const tips = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), this.mat('#c8a47a', 'hedgetips'));
    tips.scale.set(0.12, 0.07, 0.1); tips.position.set(-0.04, 0.17, 0); tips.rotation.y = 0.6; body.add(tips);
    this.box(body, 0.1, 0.08, 0.1, '#d9b48a', 0.12, 0.06, 0);
    this.box(body, 0.03, 0.03, 0.03, '#2a2433', 0.18, 0.06, 0);
    g.userData.body = body;
    return g;
  }

  crab() {
    const g = new THREE.Group();
    const body = new THREE.Group(); g.add(body);
    const c = '#e0603f';
    this.box(body, 0.16, 0.07, 0.22, c, 0, 0.06, 0);
    for (const z of [-0.14, 0.14]) this.box(body, 0.08, 0.06, 0.07, c, 0.1, 0.07, z);
    for (const z of [-0.05, 0.05]) this.box(body, 0.02, 0.05, 0.02, '#2a2433', 0.07, 0.12, z);
    for (const z of [-0.09, -0.03, 0.03, 0.09]) this.box(body, 0.14, 0.02, 0.02, c, -0.02, 0.02, z * 1.3);
    g.userData.body = body;
    return g;
  }

  songbird(i) {
    const g = new THREE.Group();
    const bodyG = new THREE.Group(); g.add(bodyG);
    const [c, b] = [['#7a6a5a', '#e0603f'], ['#4d7fc4', '#f4efe4'], ['#e8c43a', '#6b6a3a']][i % 3];
    this.box(bodyG, 0.14, 0.1, 0.1, c, 0, 0.1, 0);
    this.box(bodyG, 0.07, 0.07, 0.08, b, 0.05, 0.09, 0);
    this.box(bodyG, 0.08, 0.08, 0.08, c, 0.08, 0.16, 0);
    this.box(bodyG, 0.04, 0.02, 0.03, '#f2b63d', 0.13, 0.15, 0);
    this.box(bodyG, 0.08, 0.02, 0.06, c, -0.1, 0.12, 0);
    const wl = new THREE.Group(); wl.position.set(0, 0.12, 0.05); bodyG.add(wl);
    const wr = new THREE.Group(); wr.position.set(0, 0.12, -0.05); bodyG.add(wr);
    this.box(wl, 0.1, 0.02, 0.14, c, 0, 0, 0.07);
    this.box(wr, 0.1, 0.02, 0.14, c, 0, 0, -0.07);
    g.userData.wings = [wl, wr];
    g.userData.bodyG = bodyG;
    return g;
  }

  heron() {
    // a grey heron: a slim body, a long S of a neck, a dagger bill, a black crest
    const g = new THREE.Group();
    const bodyG = new THREE.Group(); g.add(bodyG);
    const grey = '#9aa4b8', light = '#dfe6ee';
    this.box(bodyG, 0.36, 0.2, 0.2, grey, 0, 0.66, 0);
    this.box(bodyG, 0.22, 0.06, 0.2, '#7a8498', -0.05, 0.74, 0);
    this.box(bodyG, 0.12, 0.08, 0.06, '#3b3844', -0.2, 0.64, 0);
    const n1 = this.box(bodyG, 0.09, 0.2, 0.09, light, 0.16, 0.8, 0); n1.rotation.z = -0.35;
    const n2 = this.box(bodyG, 0.08, 0.18, 0.08, light, 0.19, 0.96, 0); n2.rotation.z = 0.3;
    this.box(bodyG, 0.14, 0.1, 0.1, light, 0.2, 1.08, 0);
    this.box(bodyG, 0.2, 0.03, 0.04, '#e8c43a', 0.36, 1.07, 0);
    this.box(bodyG, 0.12, 0.02, 0.06, '#3b3844', 0.14, 1.13, 0);
    for (const z of [-0.04, 0.04]) this.box(bodyG, 0.02, 0.02, 0.02, '#1a1422', 0.24, 1.1, z * 1.35);
    for (const z of [-0.05, 0.05]) this.box(g, 0.03, 0.56, 0.03, '#b89a6a', 0, 0.28, z);
    const wl = new THREE.Group(); wl.position.set(0, 0.72, 0.1); bodyG.add(wl);
    const wr = new THREE.Group(); wr.position.set(0, 0.72, -0.1); bodyG.add(wr);
    this.box(wl, 0.3, 0.03, 0.4, grey, 0, 0, 0.2);
    this.box(wr, 0.3, 0.03, 0.4, grey, 0, 0, -0.2);
    wl.visible = wr.visible = false;
    g.userData.wings = [wl, wr];
    g.userData.bodyG = bodyG;
    return g;
  }

  koi(i) {
    const g = new THREE.Group();
    const [c, s] = [['#f0934a', '#fff8ec'], ['#fff8ec', '#e0463f'], ['#f2b63d', '#fff8ec'], ['#e0463f', '#fff8ec']][i % 4];
    this.box(g, 0.3, 0.05, 0.1, c, 0, 0.012, 0);
    this.box(g, 0.1, 0.051, 0.08, s, 0.05, 0.013, 0);
    this.box(g, 0.08, 0.04, 0.12, c, -0.18, 0.012, 0);
    return g;
  }

  owl() {
    // a tawny owl on its stump: a round body with a pale speckled breast, a flat face disc with
    // big amber eyes, ear tufts, folded wings
    const g = new THREE.Group();
    const bodyG = new THREE.Group(); g.add(bodyG);
    this.box(g, 0.34, 0.26, 0.3, '#6b4a34', 0, 0.13, 0);
    this.box(g, 0.36, 0.04, 0.32, '#c8a47a', 0, 0.27, 0);
    this.box(bodyG, 0.22, 0.24, 0.2, '#a8845c', 0, 0.42, 0);
    this.box(bodyG, 0.15, 0.15, 0.03, '#f1e2c8', 0.0, 0.41, 0.1);
    for (const [x, y] of [[-0.03, 0.44], [0.04, 0.4], [-0.02, 0.37]]) this.box(bodyG, 0.02, 0.02, 0.02, '#8a6a4a', x, y, 0.12);
    const head = new THREE.Group(); head.position.set(0, 0.6, 0); bodyG.add(head);
    this.box(head, 0.23, 0.17, 0.2, '#a8845c', 0, 0, 0);
    this.box(head, 0.19, 0.12, 0.02, '#e9d4b0', 0, -0.005, 0.1);
    for (const x of [-0.05, 0.05]) { this.box(head, 0.07, 0.07, 0.02, '#f2b63d', x, 0.01, 0.11); this.box(head, 0.035, 0.035, 0.02, '#1a1422', x, 0.01, 0.12); }
    this.box(head, 0.03, 0.04, 0.03, '#e8c43a', 0, -0.035, 0.115);
    for (const x of [-0.08, 0.08]) { const t = this.box(head, 0.04, 0.07, 0.04, '#8a6a4a', x, 0.11, 0); t.rotation.z = x > 0 ? -0.3 : 0.3; }
    const wl = new THREE.Group(); wl.position.set(0, 0.46, 0); bodyG.add(wl);
    const wr = new THREE.Group(); wr.position.set(0, 0.46, 0); bodyG.add(wr);
    this.box(wl, 0.04, 0.2, 0.18, '#8a6a4a', -0.13, 0, 0);
    this.box(wr, 0.04, 0.2, 0.18, '#8a6a4a', 0.13, 0, 0);
    g.userData.head = head;
    g.userData.bodyG = bodyG;
    g.userData.wings = [wl, wr];
    return g;
  }

  sheep(lamb) {
    // a sheep: a cloud of wool (a core, puffs all round it, lighter ones on top), a black face
    // with a woolly topknot, ears out sideways, thin black legs, a stub of a tail
    const g = new THREE.Group();
    const body = new THREE.Group(); g.add(body);
    const s = lamb ? 0.75 : 1;
    this.puff(body, 0.27 * s, 0.8, '#ece6dc', 0, 0.46 * s, 0, 'wool-d');
    for (const [x, y, z, r] of [[0.17, 0.44, 0.1, 0.15], [0.17, 0.44, -0.1, 0.15], [-0.17, 0.45, 0.11, 0.16], [-0.17, 0.45, -0.11, 0.16], [0.0, 0.43, 0.15, 0.15], [0, 0.43, -0.15, 0.15], [-0.27, 0.49, 0, 0.12]]) this.puff(body, r * s, 0.9, '#f4f1ea', x * s, y * s, z * s, 'wool');
    for (const [x, z] of [[0.1, 0.05], [-0.1, -0.04], [0.02, -0.08], [-0.05, 0.08]]) this.puff(body, 0.13 * s, 0.75, '#fffdf6', x * s, 0.62 * s, z * s, 'wool-l');
    for (const [x, z] of [[0.17, 0.09], [0.17, -0.09], [-0.17, 0.09], [-0.17, -0.09]]) this.box(body, 0.06 * s, 0.3 * s, 0.06 * s, '#3b3844', x * s, 0.15 * s, z * s);
    const head = new THREE.Group(); head.position.set(0.34 * s, 0.52 * s, 0); body.add(head);
    this.box(head, 0.16 * s, 0.17 * s, 0.14 * s, '#3b3844', 0.05 * s, -0.01 * s, 0);
    this.puff(head, 0.09 * s, 0.8, '#fffdf6', 0.0, 0.09 * s, 0, 'wool-l');
    for (const z of [-1, 1]) { const e = this.box(head, 0.05 * s, 0.035 * s, 0.1 * s, '#3b3844', 0.0, 0.03 * s, z * 0.1 * s); e.rotation.x = z * -0.3; }
    for (const z of [-0.045, 0.045]) this.box(head, 0.02, 0.02, 0.02, '#f4efe4', 0.1 * s, 0.02 * s, z * s * 1.3);
    this.puff(body, 0.06 * s, 1, '#f4f1ea', -0.36 * s, 0.5 * s, 0, 'wool');
    g.userData.head = head;
    return g;
  }

  // -------------------------------------------------------------------------
  // `player` is the solo player, or a list of them (Party Mode): each critter
  // reacts to whoever is nearest.
  update(dt, t, player, hour) {
    const night = hour >= 20.5 || hour < 5.5;
    const ps = Array.isArray(player) ? player : [player];
    for (const c of this.list) {
      if (this.hideKinds && this.hideKinds.has(c.kind)) { c.obj.visible = false; continue; }
      let px = 0, pz = 0, dp = Infinity, near = false, who = null;
      for (const p of ps) {
        const dx = c.x - p.pos.x, dz = c.z - p.pos.z;
        if (Math.abs(dx) < 34 && Math.abs(dz) < 24) near = true;
        const d = Math.hypot(dx, dz);
        if (d < dp) { dp = d; px = p.pos.x; pz = p.pos.z; who = p; }
      }
      const awake = !(c.sp.day && night) && !(c.sp.night && !night && !(hour >= 17.5 || hour < 7));
      c.obj.visible = near && awake && !c.gone;
      if (!c.obj.visible) {
        if (c.gone && (c.goneT -= dt) <= 0) this.respawn(c);
        continue;
      }
      // spotted! (log the species the first time you get a good look)
      if (dp < 5 && this.onSpot) this.onSpot(c.kind, c, who);
      if (c.flying) { this.fly(c, dt, t); continue; }
      const shy = c.sp.shy || 0;
      if (c.sp.flies && dp < shy && !(c.kind === 'gull' && night)) { this.takeOff(c, px, pz); continue; }
      // hiders curl up / pull in when you come close
      if (c.sp.hides && dp < shy) { c.hiding = 1.5; }
      if (c.hiding > 0) { c.hiding -= dt; this.pose(c, t, false, true); continue; }
      // flee from the player (deer bound away, rabbits zig-zag)
      if (c.sp.flee && dp < shy) {
        const a = Math.atan2(c.z - pz, c.x - px) + (Math.random() - 0.5) * 0.8;
        c.tx = c.x + Math.cos(a) * c.sp.flee; c.tz = c.z + Math.sin(a) * c.sp.flee;
        c.fear = 1.6; c.wait = 0;
      }
      // curious foxes creep closer, then keep a polite distance
      if (c.sp.curious && dp > 4 && dp < 8 && c.fear <= 0 && Math.random() < dt * 0.3) { c.tx = px + (c.x - px) * 0.55; c.tz = pz + (c.z - pz) * 0.55; }
      let moving = false;
      if (c.sp.move === 'perch') { this.pose(c, t, false); continue; }
      if (c.fear > 0) c.fear -= dt;
      c.wait -= dt;
      if (c.wait <= 0 && c.fear <= 0) this.pickTarget(c, night);
      const dx = c.tx - c.x, dz = c.tz - c.z, d = Math.hypot(dx, dz);
      if (d > 0.05) {
        const speed = (c.sp.speed || 0.6) * (c.fear > 0 ? 3.2 : 1);
        const hopMove = c.sp.move === 'hop';
        const ok = !hopMove || Math.sin(t * 9 + c.ph) > -0.2;
        if (ok) {
          const step = Math.min(d, speed * dt);
          let nx = c.x + (dx / d) * step, nz = c.z + (dz / d) * step;
          if (!this.canStand(c, nx, nz)) { c.tx = c.x; c.tz = c.z; c.wait = 0.4; }
          else { c.x = nx; c.z = nz; moving = true; }
        }
        if (c.sp.move === 'crab') c.obj.rotation.y = Math.atan2(-dz, dx) + Math.PI / 2;
        else c.obj.rotation.y = Math.atan2(-dz, dx);
      }
      c.obj.position.set(c.x, 0, c.z);
      this.pose(c, t, moving);
    }
  }

  canStand(c, x, z) {
    if (c.pond) {
      const Pd = c.pond;
      return ((x - Pd.x) / (Pd.rx * 0.8)) ** 2 + ((z - Pd.z) / (Pd.rz * 0.8)) ** 2 <= 1;
    }
    const m = this.world.mapData;
    const tile = m.ground[Math.floor(z) * m.w + Math.floor(x)];
    if (c.sp.move === 'wade') return tile === TT.WATER || tile === TT.MARSH;
    if (tile === TT.WATER) return false;
    if (c.zoneDef && c.home && Math.hypot(x - c.home.x, z - c.home.z) > (c.range || 7) * 1.4) return false;
    return !(this.world.overCol && this.world.overCol.blocked(x, z, 0.18));
  }

  pickTarget(c, night) {
    const sp = c.sp;
    c.wait = 1.5 + Math.random() * (sp.move === 'dart' ? 1.5 : sp.graze ? 6 : 4);
    if (sp.move === 'swim' && c.kind === 'koi') {
      c.swimAngle = (c.swimAngle || 0) + 0.8 + Math.random() * 0.6;
      const Pd = c.pond;
      c.tx = Pd.x + Math.cos(c.swimAngle) * Pd.rx * (0.3 + c.swimR);
      c.tz = Pd.z + Math.sin(c.swimAngle) * Pd.rz * (0.3 + c.swimR);
      c.wait = 0.8 + Math.random();
      return;
    }
    if (c.kind === 'duck' && night) return;
    const reach = sp.move === 'dart' ? 2.6 : sp.move === 'wade' ? 1.2 : 1.8;
    const a = Math.random() * Math.PI * 2, d = 0.6 + Math.random() * reach;
    let nx = c.x + Math.cos(a) * d, nz = c.z + Math.sin(a) * d;
    if (c.home && Math.hypot(nx - c.home.x, nz - c.home.z) > (c.range || 3)) { nx = c.home.x + (Math.random() - 0.5) * 2; nz = c.home.z + (Math.random() - 0.5) * 2; }
    if (c.pond) {
      const Pd = c.pond;
      const k = ((nx - Pd.x) / (Pd.rx * 0.72)) ** 2 + ((nz - Pd.z) / (Pd.rz * 0.72)) ** 2;
      if (k > 1) { nx = Pd.x + (nx - Pd.x) / Math.sqrt(k); nz = Pd.z + (nz - Pd.z) / Math.sqrt(k); }
    }
    c.tx = nx; c.tz = nz;
  }

  // per-species idle & walk animation
  pose(c, t, moving, hiding = false) {
    const u = c.obj.userData, ph = c.ph;
    switch (c.kind) {
      case 'hen': if (c.anim) c.anim(t + ph); break;
      case 'duck': c.obj.position.y = Math.sin(t * 2 + ph) * 0.02; c.obj.rotation.z = Math.sin(t * 1.3 + ph) * 0.05; break;
      case 'koi': c.obj.position.y = 0; c.obj.rotation.z = 0; c.obj.children[2].rotation.y = Math.sin(t * 8 + ph) * 0.5; break;
      case 'gull': case 'songbird': {
        const [wl, wr] = u.wings; wl.rotation.x = wr.rotation.x = 0;
        u.bodyG.position.y = moving ? Math.abs(Math.sin(t * 12 + ph)) * 0.03 : 0;
        if (c.kind === 'songbird' && !moving) u.bodyG.rotation.z = -(Math.max(0, Math.sin(t * 3 + ph)) ** 8) * 0.6;
        break;
      }
      case 'turtle': u.head.position.x = hiding ? 0.17 : 0.27; break;
      case 'deer': {
        // graze: head down between steps
        const graze = !moving && Math.sin(t * 0.5 + ph) > 0.2;
        u.neck.rotation.z = graze ? -1.3 : c.fear > 0 ? 0.2 : Math.sin(t * 0.8 + ph) * 0.08;
        c.obj.position.y = moving && c.fear > 0 ? Math.abs(Math.sin(t * 7 + ph)) * 0.14 : 0;
        break;
      }
      case 'rabbit': case 'hare': case 'frog': {
        const hop = moving ? Math.max(0, Math.sin(t * 9 + ph)) : 0;
        u.body.position.y = hop * (c.kind === 'frog' ? 0.12 : 0.1);
        u.body.rotation.z = moving ? hop * 0.3 : 0;
        break;
      }
      case 'fox': case 'arcticfox': {
        u.tail.rotation.y = Math.sin(t * 3 + ph) * 0.4;
        u.head.rotation.y = moving ? 0 : Math.sin(t * 0.7 + ph) * 0.5;
        c.obj.position.y = moving ? Math.abs(Math.sin(t * 10 + ph)) * 0.03 : 0;
        break;
      }
      case 'squirrel': {
        u.tail.rotation.z = Math.sin(t * (moving ? 14 : 4) + ph) * 0.3;
        u.body.position.y = moving ? Math.abs(Math.sin(t * 16 + ph)) * 0.05 : 0;
        break;
      }
      case 'hedgehog': u.body.scale.set(hiding ? 0.8 : 1, hiding ? 0.85 : 1, 1); u.body.position.y = moving ? Math.abs(Math.sin(t * 8 + ph)) * 0.01 : 0; break;
      case 'crab': u.body.position.y = hiding ? -0.04 : moving ? Math.abs(Math.sin(t * 14 + ph)) * 0.02 : 0; break;
      case 'heron': u.bodyG.rotation.z = !moving && Math.sin(t * 0.3 + ph) > 0.7 ? -0.5 : 0; break;
      case 'owl': u.head.rotation.y = Math.sin(t * 0.6 + ph) * 1.2 * (Math.sin(t * 0.21 + ph) > 0 ? 1 : 0); break;
      case 'sheep': u.head.rotation.z = !moving && Math.sin(t * 0.4 + ph) > 0.1 ? -0.9 : 0; break;
      default: break;
    }
  }

  takeOff(c, px, pz) {
    const dp = Math.hypot(c.x - px, c.z - pz) || 1;
    c.flying = true;
    c.vx = (c.x - px) / dp * 2.5; c.vz = (c.z - pz) / dp * 2.5 - 0.8;
    if (c.obj.userData.wings) for (const wgt of c.obj.userData.wings) wgt.visible = true;
    if (this.world.fx) this.world.fx.emit('dust', c.x, 0.2, c.z, 3, { color: c.kind === 'heron' ? '#9aa4b8' : '#f4f1ec' });
  }

  fly(c, dt, t) {
    c.y += dt * (c.kind === 'songbird' ? 2.6 : 1.8);
    c.x += c.vx * dt; c.z += c.vz * dt;
    c.obj.position.set(c.x, c.y, c.z);
    c.obj.rotation.y = Math.atan2(-c.vz, c.vx);
    const w = c.obj.userData.wings;
    if (w) {
      const f = Math.sin(t * (c.kind === 'songbird' ? 30 : 16) + c.ph) * 0.9;
      if (c.kind === 'owl') { w[0].rotation.z = f; w[1].rotation.z = -f; } else { w[0].rotation.x = -f; w[1].rotation.x = f; }
    }
    if (c.y > 7) { c.gone = true; c.goneT = 20 + Math.random() * 25; c.obj.visible = false; }
  }

  respawn(c) {
    let p = null;
    if (c.zoneDef) p = this.spotIn(c.zoneDef);
    else if (c.zone) p = this.spotFor(c.zone);
    if (!p) p = { x: c.home ? c.home.x : c.x, z: c.home ? c.home.z : c.z };
    c.x = p.x; c.z = p.z; c.y = 0; c.tx = p.x; c.tz = p.z; c.gone = false; c.flying = false;
    if (c.home && c.zoneDef) c.home = { ...p };
    if (c.obj.userData.wings && ['heron', 'owl'].includes(c.kind)) for (const w of c.obj.userData.wings) w.visible = c.kind === 'owl';
    c.obj.position.set(c.x, 0, c.z);
  }

  // A tiny outlined portrait of a species for the log (rendered offscreen once)
  icon(kind) {
    this.icons = this.icons || new Map();
    if (this.icons.has(kind)) return this.icons.get(kind);
    const src = this.list.find((c) => c.kind === kind);
    const S = 28;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    if (!src) { this.icons.set(kind, c); return c; }
    const r = this.r3d.renderer;
    if (!this.iconScene) {
      this.iconScene = new THREE.Scene();
      this.iconScene.add(new THREE.HemisphereLight(0xfff8f0, 0x9a8aac, 2.6));
      const key = new THREE.DirectionalLight(0xfff0d8, 1.6); key.position.set(-1, 2, 3); this.iconScene.add(key);
      this.iconRT = new THREE.WebGLRenderTarget(S, S, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
      this.iconBuf = new Uint8Array(S * S * 4);
    }
    const obj = src.obj.clone(true);
    obj.position.set(0, 0, 0); obj.rotation.set(0, -0.6, 0); obj.visible = true;
    obj.traverse((m) => { m.visible = true; });
    this.iconScene.add(obj);
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
    const h = Math.max(size.x, size.y, size.z) * 0.62 + 0.02;
    const cam = new THREE.OrthographicCamera(-h, h, h, -h, 0.1, 20);
    cam.position.set(mid.x + 0.6, mid.y + 1.2, mid.z + 3);
    cam.lookAt(mid);
    const prevClear = r.getClearColor(new THREE.Color()), prevA = r.getClearAlpha();
    r.setClearColor(0x000000, 0); r.setRenderTarget(this.iconRT); r.clear(); r.render(this.iconScene, cam);
    r.readRenderTargetPixels(this.iconRT, 0, 0, S, S, this.iconBuf);
    r.setRenderTarget(null); r.setClearColor(prevClear, prevA);
    this.iconScene.remove(obj);
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(S, S), row = S * 4;
    for (let y = 0; y < S; y++) img.data.set(this.iconBuf.subarray((S - 1 - y) * row, (S - y) * row), y * row);
    const srcA = new Uint8ClampedArray(img.data);
    const A = (x, y) => (x < 0 || y < 0 || x >= S || y >= S ? 0 : srcA[(y * S + x) * 4 + 3]);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      if (srcA[i + 3] > 0) { img.data[i + 3] = 255; continue; }
      if (A(x - 1, y) || A(x + 1, y) || A(x, y - 1) || A(x, y + 1)) { img.data[i] = 43; img.data[i + 1] = 28; img.data[i + 2] = 44; img.data[i + 3] = 255; }
    }
    ctx.putImageData(img, 0, 0);
    this.icons.set(kind, c);
    return c;
  }
}
