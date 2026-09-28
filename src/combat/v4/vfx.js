// Spectacle (Adventure v4): the fights' 3D effects. Slash arcs that sweep with
// the swings, shockwaves, explosions (a flash, a fireball, embers, smoke puffs,
// a scorch mark and a moment of light), lightning that flickers and chains, ice
// spikes, fire columns, pillars of light, whirlwinds, meteors with their trails,
// projectile trails, hit sparks and poofs. Unlit cel colours (they read on the
// sunny steppe as well as at night) with glowing additive cores and flashes,
// rendered in the same low-res scene as the world (so they stay crisp pixels);
// the small bits share one instanced mesh per kind, the big shapes are pooled.

import { THREE } from '../../render/r3d.js';

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const out2 = (k) => 1 - (1 - k) * (1 - k);
const out3 = (k) => 1 - (1 - k) ** 3;
const clamp01 = (k) => Math.max(0, Math.min(1, k));
const FLAT = 0.6;                     // balls are squashed a little: the 3/4 camera draws spheres as eggs
const RIM = '#2c1f38';                // the dark edge that makes effects read on any ground
// an explosion's lump: white-hot, yellow, orange, ember red, then smoke
const BURN = [[0, '#ffffff'], [0.1, '#fff3a6'], [0.28, '#ffb040'], [0.5, '#ff6a1a'], [0.72, '#8a3a3a'], [1, '#6a5a70']];
// …and the other elements' blasts
export const BLASTS = {
  fire: BURN,
  ice: [[0, '#ffffff'], [0.14, '#e8f8ff'], [0.34, '#9fdcff'], [0.58, '#5a9ae0'], [0.8, '#56679a'], [1, '#7a8098']],
  poison: [[0, '#ffffff'], [0.14, '#e0ffb0'], [0.34, '#8fdc5a'], [0.58, '#4a9a3a'], [0.8, '#3a5a3a'], [1, '#5a6a5a']],
  shock: [[0, '#ffffff'], [0.14, '#fffbd0'], [0.34, '#ffe066'], [0.58, '#d0a020'], [0.8, '#6a5a3a'], [1, '#6a6070']],
  gloom: [[0, '#ffffff'], [0.12, '#e8c8ff'], [0.32, '#b06ae0'], [0.56, '#6a3a9e'], [0.8, '#3a2450'], [1, '#4a3a5a']],
  holy: [[0, '#ffffff'], [0.16, '#fffbe0'], [0.38, '#ffe89a'], [0.62, '#e0b03a'], [0.84, '#8a7050'], [1, '#8a8070']],
  song: [[0, '#ffffff'], [0.14, '#ffe0f0'], [0.34, '#f59ac8'], [0.58, '#c0508a'], [0.8, '#6a3a5a'], [1, '#6a5a6a']],
};
const rampC = new THREE.Color(), rampD = new THREE.Color();
function ramp(stops, k) {
  for (let i = 1; i < stops.length; i++) if (k <= stops[i][0]) { const [a, ca] = stops[i - 1], [b, cb] = stops[i]; return rampC.set(ca).lerp(rampD.set(cb), (k - a) / (b - a)); }
  return rampC.set(stops[stops.length - 1][1]);
}

// the colours of the elements & schools, for everyone who asks
export const VFX_COL = {
  fire: '#ff8a3a', ice: '#9fdcff', poison: '#8fdc5a', shock: '#ffe066', holy: '#ffe89a',
  arcane: '#c9a2ff', song: '#f59ac8', nature: '#9fe07a', gloom: '#b06ae0', phys: '#fff3c4',
};

// ------------------------------------------------------------------ shared shapes
let G = null;
function shapes() {
  if (G) return G;
  G = {
    ring: new THREE.RingGeometry(0.78, 1, 48).rotateX(-Math.PI / 2),
    thin: new THREE.RingGeometry(0.93, 1, 56).rotateX(-Math.PI / 2),
    disc: new THREE.CircleGeometry(1, 36).rotateX(-Math.PI / 2),
    wall: fadeTube(1, 1, 28),         // an open cylinder, bright at its foot, fading upwards
    flame: fadeTube(0.12, 1, 14),     // …narrowing to a point: flames, tornadoes
    ball: new THREE.IcosahedronGeometry(1, 1),
    gem: new THREE.IcosahedronGeometry(1, 0),
    box: new THREE.BoxGeometry(1, 1, 1),
    shard: new THREE.OctahedronGeometry(1, 0),
    spike: new THREE.ConeGeometry(0.22, 1, 5).translate(0, 0.5, 0),
    arcs: new Map(),
  };
  return G;
}

function fadeTube(top, bottom, seg) {
  const g = new THREE.CylinderGeometry(top, bottom, 1, seg, 6, true).translate(0, 0.5, 0);
  const p = g.attributes.position, c = [];
  for (let i = 0; i < p.count; i++) c.push(1, 1, 1, (1 - clamp01(p.getY(i))) ** 1.3);
  g.setAttribute('color', new THREE.Float32BufferAttribute(c, 4));
  return g;
}

// a slash: a flat crescent around +z, pointed at both ends, thickest near its
// bright head (local angle +arc/2), its tail fading out
function crescent(arc) {
  const key = Math.round(arc * 100), S = shapes();
  if (S.arcs.has(key)) return S.arcs.get(key);
  const N = 30, pos = [], col = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const k = i / N, a = -arc / 2 + arc * k;
    const w = 0.36 * Math.sin(Math.PI * Math.min(1, k * 1.12)) ** 0.8 + 0.015;
    const r0 = 1 - w * 0.7, r1 = 1 + w * 0.3, s = Math.sin(a), c = Math.cos(a);
    pos.push(s * r0, 0, c * r0, s * r1, 0, c * r1);
    const b = 0.08 + 0.92 * k ** 1.5;
    col.push(1, 1, 1, b * 0.55, 1, 1, 1, b);
    if (i < N) { const j = i * 2; idx.push(j, j + 1, j + 2, j + 1, j + 3, j + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  g.setIndex(idx);
  S.arcs.set(key, g);
  return g;
}

// ------------------------------------------------------------------ pixel sprites
let TEX = null;
function textures() {
  if (TEX) return TEX;
  const mk = (n, draw) => {
    const c = document.createElement('canvas');
    c.width = c.height = n;
    draw(c.getContext('2d'), n);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.NoColorSpace;
    return t;
  };
  const W = (g, a, x, y, w, h) => { g.fillStyle = `rgba(255,255,255,${a})`; g.fillRect(x, y, w, h); };
  TEX = {
    // a four-pointed flare
    star: mk(16, (g) => {
      W(g, 0.35, 7, 0, 2, 16); W(g, 0.35, 0, 7, 16, 2);
      W(g, 0.7, 7, 2, 2, 12); W(g, 0.7, 2, 7, 12, 2);
      W(g, 0.55, 5, 5, 6, 6); W(g, 1, 6, 6, 4, 4); W(g, 1, 7, 4, 2, 8); W(g, 1, 4, 7, 8, 2);
    }),
    // a soft round glow in stepped rings
    glow: mk(16, (g) => {
      for (const [r, a] of [[8, 0.12], [6.5, 0.22], [5, 0.38], [3.5, 0.6], [2, 1]]) {
        g.fillStyle = `rgba(255,255,255,${a})`;
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if ((x + 0.5 - 8) ** 2 + (y + 0.5 - 8) ** 2 <= r * r) g.fillRect(x, y, 1, 1);
      }
    }),
    // a burst of rays (crits)
    rays: mk(32, (g) => {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU, L = i % 2 ? 9 : 15;
        for (let d = 3; d < L; d++) W(g, d < 7 ? 1 : 0.6, Math.round(16 + Math.cos(a) * d - 0.5), Math.round(16 + Math.sin(a) * d - 0.5), 1, 1);
      }
      W(g, 1, 13, 13, 6, 6); W(g, 1, 12, 14, 8, 4); W(g, 1, 14, 12, 4, 8);
    }),
  };
  return TEX;
}

const additive = (vc = false) => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, vertexColors: vc, fog: false });
const cel = (vc = false) => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, side: THREE.DoubleSide, vertexColors: vc, fog: false });

// ------------------------------------------------------------------ small bits, one draw call per kind
// mode 'glow': additive, fades by dimming · 'solid': opaque, shrinks away
class Bits {
  constructor(root, geo, mat, max, mode) {
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.setColorAt(0, new THREE.Color(0));
    this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = mode === 'glow' ? 6 : 0;
    root.add(this.mesh);
    this.max = max; this.mode = mode; this.list = [];
  }
  add(p) { if (this.list.length >= this.max) this.list.shift(); this.list.push(p); }
  update(dt, T) {
    const { m4, q, e, v, s, c } = T;
    let n = 0;
    for (const p of this.list) {
      p.age += dt;
      if (p.age >= p.life) continue;
      const k = p.age / p.life;
      p.vy -= p.g * dt;
      const dr = Math.max(0, 1 - p.drag * dt);
      p.vx *= dr; p.vz *= dr; if (p.drag > 0 && p.g === 0) p.vy *= dr;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < p.floor && p.vy < 0) { p.y = p.floor; p.vy *= -0.3; p.vx *= 0.55; p.vz *= 0.55; p.spin *= 0.5; }
      const size = p.s0 + (p.s1 - p.s0) * out2(k);
      const sc = this.mode === 'solid' ? size * Math.min(1, (1 - k) * 3) : size;
      e.set(p.rx + p.age * p.spin, p.ry + p.age * p.spin * 0.7, 0);
      q.setFromEuler(e);
      v.set(p.x, p.y, p.z); s.set(sc * p.sx, sc * p.sy, sc * p.sz);
      m4.compose(v, q, s);
      this.mesh.setMatrixAt(n, m4);
      if (this.mode === 'glow') { const f = (1 - k) ** 1.1; c.setRGB(p.r * f, p.gc * f, p.b * f); }
      else c.setRGB(p.r, p.gc, p.b);
      this.mesh.setColorAt(n, c);
      n++;
    }
    this.list = this.list.filter((p) => p.age < p.life);
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

// ------------------------------------------------------------------ the effects
export class Vfx {
  // opts: lighting (the lamp pool: explosions & bolts light up the night), shake(s)
  constructor(root, opts = {}) {
    this.root = new THREE.Group();
    root.add(this.root);
    this.opts = opts;
    this.pieces = [];
    this.free = new Map();
    this.lights = [];
    const S = shapes();
    this.bits = {
      ember: new Bits(this.root, S.box, cel(), 420, 'solid'),
      glow: new Bits(this.root, S.gem, cel(), 260, 'solid'),
      shard: new Bits(this.root, S.shard, cel(), 200, 'solid'),
      rock: new Bits(this.root, S.box, new THREE.MeshBasicMaterial({ color: 0xffffff }), 160, 'solid'),
      puff: new Bits(this.root, S.gem, new THREE.MeshBasicMaterial({ color: 0xffffff }), 160, 'solid'),
      ice: new Bits(this.root, S.shard, new THREE.MeshBasicMaterial({ color: 0xffffff }), 120, 'solid'),
    };
    this.T = { m4: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), v: new THREE.Vector3(), s: new THREE.Vector3(), c: new THREE.Color() };
    this.tmp = new THREE.Color();
  }

  dispose() {
    for (const l of this.lights) this.dropLight(l);
    this.root.parent && this.root.parent.remove(this.root);
  }

  // ---------------------------------------------------------------- the pool
  take(kind) {
    const list = this.free.get(kind);
    let o = list && list.pop();
    if (!o) o = this.make(kind);
    o.visible = true;
    o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1);
    this.root.add(o);
    return o;
  }

  make(kind) {
    const S = shapes(), T = textures();
    let o;
    switch (kind) {
      case 'ring': case 'thin': case 'ball': case 'gem': o = new THREE.Mesh(S[kind], cel()); break;
      case 'flash': o = new THREE.Mesh(S.ball, additive()); break;
      case 'lump': o = new THREE.Mesh(S.ball, new THREE.MeshBasicMaterial({ color: 0xffffff })); break;
      case 'wall': case 'flame': o = new THREE.Mesh(S[kind], cel(true)); break;
      case 'wallA': case 'flameA': o = new THREE.Mesh(kind === 'wallA' ? S.wall : S.flame, additive(true)); break;
      case 'ringA': o = new THREE.Mesh(S.ring, additive()); break;
      case 'decal': o = new THREE.Mesh(S.disc, new THREE.MeshBasicMaterial({ color: 0x241820, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); break;
      case 'spike': o = new THREE.Mesh(S.spike, new THREE.MeshBasicMaterial({ color: 0xd8f2ff })); break;
      case 'star': case 'glowS': case 'rays': o = new THREE.Sprite(new THREE.SpriteMaterial({ map: kind === 'star' ? T.star : kind === 'rays' ? T.rays : T.glow, color: 0xffffff, transparent: true, depthWrite: false })); o.renderOrder = 7; break;
      case 'arc': {
        o = new THREE.Group();
        const outer = new THREE.Mesh(crescent(2.3), cel(true)), core = new THREE.Mesh(crescent(2.3), cel(true)), rim = new THREE.Mesh(crescent(2.3), cel(true));
        rim.renderOrder = -1; core.renderOrder = 1;
        core.scale.set(0.93, 1, 0.93);
        o.add(rim, outer, core);
        o.userData.parts = [outer, core, rim];
        break;
      }
      case 'bolt': {
        o = new THREE.Group();
        const core = additive(), glow = cel(), rim = cel(), segs = [];
        for (let i = 0; i < 22; i++) { const a = new THREE.Mesh(S.box, core), b = new THREE.Mesh(S.box, glow), c = new THREE.Mesh(S.box, rim); c.renderOrder = -1; o.add(c, b, a); segs.push([a, b, c]); }
        o.userData = { core, glow, rim, segs };
        break;
      }
      default: o = new THREE.Object3D();
    }
    o.userData.kind = kind;
    o.frustumCulled = false;
    return o;
  }

  give(o) {
    this.root.remove(o);
    o.visible = false;
    const k = o.userData.kind;
    if (!this.free.has(k)) this.free.set(k, []);
    this.free.get(k).push(o);
  }

  // a piece lives `life` seconds (after `delay`), fn(k 0..1, dt) animates it
  add(objs, life, fn, delay = 0) {
    const list = Array.isArray(objs) ? objs : [objs];
    for (const o of list) o.visible = delay <= 0;
    const piece = { objs: list, life, fn, t: -delay };
    this.pieces.push(piece);
    return piece;
  }

  // run fn once, a little later
  later(delay, fn) { let fired = false; this.add([], 0.001, () => { if (!fired) { fired = true; fn(); } }, delay); }

  update(dt) {
    for (const p of this.pieces) {
      p.t += dt;
      if (p.t < 0) continue;
      for (const o of p.objs) o.visible = true;
      const k = Math.min(1, p.t / p.life);
      p.fn(k, dt);
      if (k >= 1) { p.done = true; for (const o of p.objs) this.give(o); }
    }
    if (this.pieces.some((p) => p.done)) this.pieces = this.pieces.filter((p) => !p.done);
    for (const b of Object.values(this.bits)) b.update(dt, this.T);
    for (const l of this.lights) {
      l.t += dt;
      const k = l.t / l.life;
      l.src.power = l.power * Math.max(0, 1 - k) ** 1.5;
      if (k >= 1) l.done = true;
    }
    if (this.lights.some((l) => l.done)) { for (const l of this.lights) if (l.done) this.dropLight(l); this.lights = this.lights.filter((l) => !l.done); }
  }

  col(c) { return this.tmp.set(c); }
  tint(o, c, a = 1) {
    const m = o.material;
    m.color.set(c);
    if (m.blending === THREE.AdditiveBlending) m.color.multiplyScalar(a);
    else m.opacity = Math.max(0, Math.min(1, a));
  }
  shake(s) { if (this.opts.shake) this.opts.shake(s); }

  // ---------------------------------------------------------------- small bits
  bit(kind, x, y, z, o = {}) {
    const c = this.col(o.color || '#ffffff');
    const s = o.size || 0.08;
    this.bits[kind].add({
      x, y, z, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, g: o.g ?? 9, drag: o.drag ?? 0.6, floor: o.floor ?? 0.04,
      age: 0, life: o.life || 0.5, s0: s, s1: o.s1 ?? s, sx: o.sx || 1, sy: o.sy || 1, sz: o.sz || 1,
      r: c.r, gc: c.g, b: c.b, spin: o.spin ?? rand(-12, 12), rx: rand(0, TAU), ry: rand(0, TAU),
    });
  }

  // sparks flung out of a point
  sparks(x, y, z, { n = 6, color = '#fff3c4', speed = 4, up = 2, life = 0.4, size = 0.07, g = 9, kind = 'ember' } = {}) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), sp = speed * rand(0.4, 1);
      this.bit(kind, x, y, z, { vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: up * rand(0.3, 1.3), life: life * rand(0.6, 1.2), size: size * rand(0.7, 1.3), color, g });
    }
  }

  // chunks of ground flung by a slam
  debris(x, z, { n = 8, r = 0.5, color = '#8a6a4a', speed = 3.2, up = 4.5, size = 0.13 } = {}) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), d = rand(0, r);
      this.bit('rock', x + Math.cos(a) * d, 0.1, z + Math.sin(a) * d, { vx: Math.cos(a) * speed * rand(0.4, 1), vz: Math.sin(a) * speed * rand(0.4, 1), vy: up * rand(0.5, 1.1), life: rand(0.6, 1), size: size * rand(0.6, 1.4), color: i % 3 ? color : '#5a4636', g: 14, drag: 0.3 });
    }
  }

  // round smoke puffs that swell, drift up and shrink away
  smoke(x, y, z, { n = 4, color = '#b8aec4', size = 0.32, life = 1.1, rise = 0.9, spread = 0.5 } = {}) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), d = rand(0, spread);
      this.bit('puff', x + Math.cos(a) * d, y + rand(0, 0.3), z + Math.sin(a) * d, { vx: Math.cos(a) * 0.4, vz: Math.sin(a) * 0.3, vy: rise * rand(0.6, 1.2), g: 0, drag: 1.2, life: life * rand(0.7, 1.1), size: size * rand(0.6, 1), s1: size * rand(1.1, 1.45), color, spin: rand(-1, 1), sy: FLAT });
    }
  }

  // one glowing puff of a trail
  trail(x, y, z, { color = '#ffd66b', size = 0.14, life = 0.25 } = {}) {
    this.bit('glow', x + rand(-0.03, 0.03), y + rand(-0.03, 0.03), z + rand(-0.03, 0.03), { color, size, s1: size * 0.2, life, g: 0, drag: 0, spin: 0 });
  }

  // a trail from (a) to (b), a puff every `step` units (older puffs a touch smaller)
  trailLine(a, b, opts = {}, step = 0.14) {
    const L = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z), n = Math.min(12, Math.max(1, Math.round(L / step)));
    for (let i = 1; i <= n; i++) {
      const k = i / n;
      this.trail(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, a.z + (b.z - a.z) * k, { ...opts, life: (opts.life || 0.25) * (0.75 + 0.25 * k) });
    }
  }

  // ---------------------------------------------------------------- flashes & stars
  flash(x, y, z, { r = 1, color = '#fff3c4', life = 0.22 } = {}) {
    const o = this.take('flash');
    o.position.set(x, y, z);
    this.add(o, life, (k) => { const s = r * (0.35 + 0.65 * out3(k)); o.scale.set(s, s * FLAT, s); this.tint(o, color, (1 - k) ** 1.6); });
  }

  // a camera-facing flare (sprites are stretched by the oblique camera: squash them back)
  star(x, y, z, { size = 1, color = '#fff3c4', life = 0.25, kind = 'star', grow = 0.4, spin = 0 } = {}) {
    const o = this.take(kind);
    o.position.set(x, y, z);
    o.material.rotation = rand(0, TAU) * (spin ? 1 : 0);
    this.add(o, life, (k, dt) => {
      const s = size * (1 + grow * out2(k));
      o.scale.set(s, s / Math.SQRT2, 1);
      if (spin) o.material.rotation += spin * dt;
      o.material.color.set(color);
      o.material.opacity = k < 0.3 ? 1 : (1 - (k - 0.3) / 0.7) ** 1.3;
    });
  }

  light(x, y, z, { color = '#ffb040', power = 2.4, life = 0.4, dist = 7 } = {}) {
    const L = this.opts.lighting;
    if (!L) return;
    const src = { x, y, z, color, power, dist, always: true };
    L.sources.push(src);
    this.lights.push({ src, power, life, t: 0 });
  }
  dropLight(l) { const S = this.opts.lighting && this.opts.lighting.sources; const i = S ? S.indexOf(l.src) : -1; if (i >= 0) S.splice(i, 1); }

  // ---------------------------------------------------------------- swings
  // a slash arc at (x, y, z) facing `angle` (atan2(dir.x, dir.z)); dir ±1 = which way it sweeps
  slash(x, y, z, angle, { r = 1.3, arc = 2.3, color = '#fff3c4', core = '#ffffff', dir = 1, life = 0.2, bank = 0, sweep = 1.4, width = 1, vertical = false } = {}) {
    const o = this.take('arc'), [outer, core2, rim] = o.userData.parts;
    outer.geometry = crescent(arc); core2.geometry = crescent(arc * 0.9); rim.geometry = crescent(arc * 1.06);
    o.position.set(x, y, z);
    for (const m of [outer, core2, rim]) { const s = m === core2 ? 0.92 : m === rim ? 1.1 : 1; m.rotation.set(vertical ? -Math.PI / 2 : 0, 0, bank); m.scale.set(s * dir, 1, s); }
    rim.position.y = vertical ? 0 : -0.02;
    this.add(o, life, (k) => {
      const s = Math.min(1, k / 0.55);
      o.rotation.y = angle + dir * (-sweep / 2 + sweep * out3(s));
      const sc = r * (0.86 + 0.18 * out2(s));
      o.scale.set(sc, sc * width, sc);
      const f = k < 0.4 ? 1 : 1 - (k - 0.4) / 0.6;
      this.tint(outer, color, f); this.tint(core2, core, f); this.tint(rim, RIM, f * 0.8);
    });
  }

  // a spinning disc of blades around something that moves (the knight's whirlwind)
  whirl(anchor, { r = 1.8, color = '#fff3c4', life = 1.6, speed = 14 } = {}) {
    const blades = [0, 1, 2].map(() => this.take('arc'));
    const ring = this.take('thin');
    ring.renderOrder = 0;
    blades.forEach((o, i) => { const [a, b, c] = o.userData.parts; a.geometry = crescent(1.7); b.geometry = crescent(1.6); c.geometry = crescent(1.75); for (const m of [a, b, c]) { m.rotation.set(0, 0, i === 1 ? 0.18 : -0.1); m.scale.set(m === b ? 0.93 : m === c ? 1.07 : 1, 1, m === b ? 0.93 : m === c ? 1.07 : 1); } c.position.y = -0.02; o.userData.off = (i / 3) * TAU; });
    const piece = this.add([...blades, ring], life, (k) => {
      const p = anchor();
      const ramp = Math.min(1, k * 8, (1 - k) * 6);
      blades.forEach((o, i) => {
        o.position.set(p.x, p.y + 0.55 + i * 0.12, p.z);
        o.rotation.y = o.userData.off + k * life * speed;
        o.scale.setScalar(r * (0.8 + 0.2 * ramp));
        const [a, b, c] = o.userData.parts;
        this.tint(a, color, 0.9 * ramp); this.tint(b, '#ffffff', 0.7 * ramp); this.tint(c, RIM, 0.45 * ramp);
      });
      ring.position.set(p.x, 0.07, p.z);
      ring.scale.setScalar(r * 1.05);
      this.tint(ring, color, 0.5 * ramp);
    });
    return { end: () => { piece.t = Math.max(piece.t, piece.life * 0.84); } };
  }

  // ---------------------------------------------------------------- impacts
  shockwave(x, z, { r = 2, color = '#fff3c4', life = 0.42, wall = 0.6, y = 0.06 } = {}) {
    const ring = this.take('ring'), thin = this.take('thin'), rim = this.take('thin');
    ring.position.set(x, y, z); thin.position.set(x, y + 0.01, z); rim.position.set(x, y - 0.005, z);
    rim.renderOrder = -1; ring.renderOrder = 0; thin.renderOrder = 1;
    const parts = [ring, thin, rim];
    let w = null;
    if (wall > 0) { w = this.take('wall'); w.position.set(x, y, z); parts.push(w); }
    this.add(parts, life, (k) => {
      const e = out3(k);
      ring.scale.setScalar(Math.max(0.05, r * (0.15 + 0.85 * e)));
      thin.scale.setScalar(Math.max(0.05, r * (0.1 + 1.0 * out2(k))));
      this.tint(ring, color, (1 - k) ** 1.1);
      this.tint(thin, '#ffffff', (1 - k) ** 2 * 0.8);
      rim.scale.setScalar(Math.max(0.05, r * (0.15 + 0.85 * e) * 1.06));
      this.tint(rim, RIM, (1 - k) ** 1.3 * 0.4);
      if (w) { const rr = Math.max(0.05, r * (0.12 + 0.8 * e)); w.scale.set(rr, wall * (1 - k * 0.7), rr); this.tint(w, color, (1 - k) ** 1.5 * 0.8); }
    });
  }

  // a flat, slowly fading scorch mark (or frost, or a crater's shadow)
  scorch(x, z, { r = 1, life = 3.5, color = '#241820', a = 0.5 } = {}) {
    const o = this.take('decal');
    o.position.set(x, 0.028, z);
    o.rotation.y = rand(0, TAU);
    o.scale.set(r, 1, r * rand(0.8, 1));
    this.add(o, life, (k) => { this.tint(o, color, a * (k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3)); });
  }

  explosion(x, z, { r = 1.6, color = '#ffb040', hot = '#fff3c4', smoke = true, scorch = true, y = 0.4, big = false, blast = BURN } = {}) {
    this.flash(x, y + 0.2, z, { r: r * 0.7, color: hot, life: 0.12 });
    // the fireball: lumps that swell white-hot, cool to orange and ember, then shrink away as smoke
    const n = big ? 7 : 5;
    for (let i = 0; i < n; i++) {
      const o = this.take('lump'), a = (i / n) * TAU + rand(-0.4, 0.4), d = i === 0 ? 0 : rand(0.25, r * 0.45), s = r * (i === 0 ? 0.5 : rand(0.28, 0.42));
      const x0 = x + Math.cos(a) * d, z0 = z + Math.sin(a) * d, lift = rand(0.2, 0.8) + (i === 0 ? 0.3 : 0), life = rand(0.5, 0.7);
      this.add(o, life, (k) => {
        o.position.set(x0 + Math.cos(a) * d * 0.4 * out2(k), y * 0.6 + lift * out2(k), z0 + Math.sin(a) * d * 0.4 * out2(k));
        const sc = s * (k < 0.2 ? 0.3 + 3.5 * k : 1 - (k - 0.2) * 1.2);
        o.scale.set(Math.max(0.01, sc), Math.max(0.01, sc * FLAT * 1.1), Math.max(0.01, sc));
        o.material.color.copy(ramp(blast, Math.min(1, k * 1.15 + i * 0.02)));
      }, i * 0.025);
    }
    this.shockwave(x, z, { r: r * 1.35, color, life: 0.4, wall: 0.5 });
    this.sparks(x, y + 0.2, z, { n: big ? 22 : 14, color: i2(color, hot), speed: 3 + r * 2, up: 3.5, life: 0.7, size: 0.08 });
    if (smoke) this.later(0.32, () => this.smoke(x, y + 0.6, z, { n: big ? 4 : 2, size: 0.1 + r * 0.05, spread: r * 0.35, color: '#8a8098', life: 0.7 }));
    if (scorch) this.scorch(x, z, { r: r * 0.75 });
    this.light(x, 1, z, { color, power: big ? 3.4 : 2.4, life: big ? 0.6 : 0.4, dist: 5 + r * 2 });
  }

  // ---------------------------------------------------------------- elements
  // a jagged bolt: from the sky onto (x, z), or between two points (a chain)
  lightning(x, z, { color = '#fff27a', top = 9, life = 0.3, from = null, y = 0, fork = true, width = 1 } = {}) {
    const o = this.take('bolt'), U = o.userData;
    const A = from || { x: x + rand(-1.2, 1.2), y: top, z: z - rand(0.5, 2) }, B = { x, y, z };
    const segs = U.segs;
    const build = () => {
      let used = 0;
      const line = (a, b, n, jit, w) => {
        let px = a.x, py = a.y, pz = a.z;
        for (let i = 1; i <= n && used < segs.length; i++) {
          const k = i / n, j = i === n ? 0 : jit * (1 - Math.abs(k - 0.5));
          const nx = a.x + (b.x - a.x) * k + rand(-j, j), ny = a.y + (b.y - a.y) * k + rand(-j, j) * 0.4, nz = a.z + (b.z - a.z) * k + rand(-j, j);
          place(segs[used++], px, py, pz, nx, ny, nz, w);
          if (fork && w > 0.5 && i === Math.floor(n * 0.45) && used < segs.length - 5) line({ x: nx, y: ny, z: nz }, { x: nx + rand(-1.4, 1.4), y: Math.max(0, ny - rand(1.2, 2.4)), z: nz + rand(-0.8, 0.8) }, 4, jit * 0.7, w * 0.55);
          px = nx; py = ny; pz = nz;
        }
      };
      line(A, B, from ? 7 : 9, from ? 0.35 : 0.7, width);
      for (let i = 0; i < segs.length; i++) for (const m of segs[i]) m.visible = i < used;
    };
    const place = ([a, b, c], x1, y1, z1, x2, y2, z2, w) => {
      const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1, L = Math.hypot(dx, dy, dz) || 0.01;
      for (const [m, t] of [[a, 0.09 * w], [b, 0.26 * w], [c, 0.4 * w]]) {
        m.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
        m.quaternion.setFromUnitVectors(UP, V.set(dx / L, dy / L, dz / L));
        m.scale.set(t, L + t * 0.5, t);
      }
    };
    build();
    let flick = 0;
    this.add(o, life, (k, dt) => {
      flick -= dt;
      if (flick <= 0 && k < 0.7) { flick = 0.05; build(); }
      const f = (k < 0.5 ? 1 : 1 - (k - 0.5) / 0.5) * (0.75 + Math.random() * 0.25);
      U.core.color.set('#ffffff').multiplyScalar(f); U.glow.color.set(color); U.glow.opacity = f * 0.85; U.rim.color.set(RIM); U.rim.opacity = f * 0.45;
    });
    if (!from) {
      this.flash(x, 0.5, z, { r: 1.1, color, life: 0.18 });
      this.shockwave(x, z, { r: 1.4, color, life: 0.3, wall: 0.3 });
      this.sparks(x, 0.2, z, { n: 10, color, speed: 4, up: 3, life: 0.4 });
      this.scorch(x, z, { r: 0.6, life: 2 });
      this.light(x, 3, z, { color: '#fff3a6', power: 3.5, life: 0.25, dist: 10 });
    }
  }

  chain(a, b, { color = '#ffe066', life = 0.24 } = {}) {
    this.lightning(b.x, b.z, { from: { x: a.x, y: a.y, z: a.z }, y: b.y, color, life, fork: false, width: 0.8 });
    this.star(b.x, b.y, b.z, { size: 0.8, color, life: 0.18 });
  }

  // ice spikes burst from the ground around (x, z), then shatter
  iceSpikes(x, z, { r = 1.2, n = 7, life = 0.9, h = 1 } = {}) {
    const list = [];
    for (let i = 0; i < n; i++) {
      const o = this.take('spike'), a = (i / n) * TAU + rand(-0.3, 0.3), d = i === 0 ? 0 : r * rand(0.35, 1);
      o.position.set(x + Math.cos(a) * d, 0, z + Math.sin(a) * d);
      o.rotation.set(rand(-0.35, 0.35), rand(0, TAU), rand(-0.35, 0.35));
      o.userData.h = h * rand(0.6, 1.15) * (i === 0 ? 1.3 : 1);
      o.material.color.set(i % 3 ? '#cfeeff' : '#ffffff');
      list.push(o);
    }
    this.add(list, life, (k) => {
      for (const o of list) {
        const g = k < 0.12 ? out3(k / 0.12) : k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1;
        o.scale.set(Math.max(0.01, g), Math.max(0.01, o.userData.h * g), Math.max(0.01, g));
      }
    });
    this.sparks(x, 0.3, z, { n: 10, color: '#dff4ff', speed: 3, up: 3, life: 0.5, kind: 'shard', size: 0.06 });
    this.shockwave(x, z, { r: r * 1.2, color: '#9fdcff', life: 0.35, wall: 0.3 });
    this.scorch(x, z, { r: r * 0.9, color: '#dff4ff', a: 0.35, life: 2.5 });
    // …and the shatter
    this.later(life * 0.8, () => { for (let i = 0; i < 12; i++) { const a = rand(0, TAU); this.bit('ice', x + Math.cos(a) * r * 0.5, 0.4, z + Math.sin(a) * r * 0.5, { vx: Math.cos(a) * rand(1, 3), vz: Math.sin(a) * rand(1, 3), vy: rand(1, 3), size: rand(0.05, 0.1), life: 0.6, color: '#e8f8ff', g: 12 }); } });
  }

  // a roaring column of fire
  fireColumn(x, z, { r = 0.8, h = 3, life = 0.8 } = {}) {
    const layers = [['#ff6a1a', 1, 1, 'flame'], ['#ffb040', 0.7, 0.85, 'flame'], ['#fff3a6', 0.45, 0.8, 'flameA']].map(([c, rs, hs, kind]) => ({ o: this.take(kind), c, rs, hs, ph: rand(0, TAU) }));
    for (const L of layers) L.o.position.set(x, 0, z);
    this.add(layers.map((L) => L.o), life, (k) => {
      const g = k < 0.15 ? out3(k / 0.15) : 1, f = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
      for (const L of layers) {
        const w = r * L.rs * (1 + Math.sin(k * 40 + L.ph) * 0.08);
        L.o.scale.set(w, h * L.hs * g * (1 + Math.sin(k * 31 + L.ph) * 0.06), w);
        L.o.rotation.y = k * 8 + L.ph;
        this.tint(L.o, L.c, f);
      }
    });
    for (let i = 0; i < 16; i++) this.bit('ember', x + rand(-r, r) * 0.6, rand(0.2, h * 0.6), z + rand(-r, r) * 0.6, { vy: rand(1.5, 3.5), vx: rand(-0.5, 0.5), vz: rand(-0.3, 0.3), g: -1, life: rand(0.5, 1), size: rand(0.05, 0.09), color: i % 2 ? '#ffb040' : '#ff6a1a' });
    this.shockwave(x, z, { r: r * 1.6, color: '#ff8a3a', life: 0.35, wall: 0 });
    this.scorch(x, z, { r: r * 1.1 });
    this.light(x, 1.2, z, { color: '#ff8a3a', power: 3, life: life, dist: 8 });
  }

  // a pillar of light (heals, blessings, level ups)
  pillar(x, z, { r = 0.8, h = 5, color = '#ffe89a', life = 0.9 } = {}) {
    const outer = this.take('wallA'), inner = this.take('wallA'), ring = this.take('ringA');
    outer.position.set(x, 0, z); inner.position.set(x, 0, z); ring.position.set(x, 0.06, z);
    this.add([outer, inner, ring], life, (k) => {
      const g = k < 0.15 ? out3(k / 0.15) : 1, f = k < 0.55 ? 1 : 1 - (k - 0.55) / 0.45;
      outer.scale.set(r * (1 - 0.4 * k), h * g, r * (1 - 0.4 * k));
      inner.scale.set(r * 0.45, h * 1.1 * g, r * 0.45);
      ring.scale.setScalar(r * (1 + 1.2 * out2(k)));
      this.tint(outer, color, f * 0.9); this.tint(inner, '#ffffff', f); this.tint(ring, color, f);
    });
    for (let i = 0; i < 10; i++) this.bit('glow', x + rand(-r, r) * 0.7, rand(0.1, 1), z + rand(-r, r) * 0.7, { vy: rand(1.5, 3), g: 0, drag: 0, life: rand(0.6, 1), size: rand(0.05, 0.09), s1: 0.01, color: i % 2 ? color : '#ffffff' });
    this.light(x, 1.5, z, { color, power: 2.2, life, dist: 7 });
  }

  // a meteor falling onto (x, z) over `delay` seconds, trailing fire (the blast is the caller's)
  meteor(x, z, { delay = 0.6, size = 0.42, color = '#ffb040', hot = '#fff3a6', ember = '#ff6a1a', dx = -3, dz = -4, h = 11 } = {}) {
    const core = this.take('lump'), shell = this.take('ball');
    const x0 = x + dx, z0 = z + dz;
    let puff = 0, last = null;
    this.add([core, shell], delay, (k, dt) => {
      const e = k * k;
      const px = x0 + (x - x0) * e, py = h * (1 - e) + 0.2, pz = z0 + (z - z0) * e;
      core.position.set(px, py, pz); shell.position.set(px, py, pz);
      core.scale.set(size * 0.62, size * 0.62 * FLAT, size * 0.62); const sh = size * (1 + Math.sin(k * 50) * 0.08); shell.scale.set(sh, sh * FLAT, sh);
      core.material.color.set(hot); this.tint(shell, color, 0.75);
      const here = { x: px, y: py, z: pz };
      if (last) { this.trailLine(last, here, { color: Math.random() < 0.6 ? color : hot, size: size * 0.75, life: 0.32 }, 0.16); if ((puff -= dt) <= 0) { puff = 0.05; this.bit('ember', px, py, pz, { vx: rand(-1, 1), vy: rand(0, 1.5), vz: rand(-1, 1), g: 3, life: 0.4, size: 0.06, color: ember }); } }
      last = here;
    });
  }

  // a shimmering bubble around someone while alive() says so (shields)
  bubble(anchor, alive, { color = '#9fdcff', r = 0.72 } = {}) {
    const o = this.take('flash'), ring = this.take('ringA');
    const piece = this.add([o, ring], 60, (k) => {
      const p = anchor(), t = k * 60;
      o.position.set(p.x, p.y + 0.72, p.z);
      const s = r * (1 + Math.sin(t * 5) * 0.04);
      o.scale.set(s, s * 1.05, s);
      this.tint(o, color, 0.22 + Math.sin(t * 7) * 0.06);
      ring.position.set(p.x, 0.06, p.z); ring.scale.setScalar(r * 0.95);
      this.tint(ring, color, 0.5);
      if (!alive()) piece.t = piece.life;
    });
  }

  // a glowing wall of light around someone (Bulwark)
  dome(anchor, { r = 4, color = '#ffd66b', life = 6 } = {}) {
    const wall = this.take('wallA'), ring = this.take('ringA'), inner = this.take('wallA');
    this.add([wall, ring, inner], life, (k) => {
      const p = anchor(), g = k < 0.08 ? out3(k / 0.08) : 1, f = k > 0.9 ? 1 - (k - 0.9) / 0.1 : 1;
      wall.position.set(p.x, 0, p.z); inner.position.set(p.x, 0, p.z); ring.position.set(p.x, 0.07, p.z);
      wall.scale.set(r * g, 2.2 * g, r * g); inner.scale.set(r * g * 0.97, 1.2 * g, r * g * 0.97);
      ring.scale.setScalar(r * g);
      const pulse = 0.75 + Math.sin(k * life * 6) * 0.15;
      this.tint(wall, color, 0.55 * f * pulse); this.tint(inner, '#ffffff', 0.3 * f); this.tint(ring, color, f);
      if (Math.random() < 0.5) { const a = rand(0, TAU); this.bit('glow', p.x + Math.cos(a) * r, rand(0.1, 1.6), p.z + Math.sin(a) * r, { vy: 0.8, g: 0, drag: 0, life: 0.5, size: 0.06, s1: 0.01, color }); }
    });
  }

  // ---------------------------------------------------------------- hits & poofs
  hit(x, y, z, { color = '#fff3c4', big = false, crit = false } = {}) {
    this.star(x, y, z, { size: crit ? 2 : big ? 1 : 0.75, color: crit ? '#ffc93a' : color, life: crit ? 0.3 : 0.18, kind: crit ? 'rays' : 'star', grow: crit ? 0.35 : 0.3 });
    this.star(x, y, z, { size: crit ? 1 : big ? 0.62 : 0.5, color: '#ffffff', life: crit ? 0.22 : 0.12, kind: 'star', grow: 0.2 });
    this.sparks(x, y, z, { n: crit ? 12 : big ? 8 : 4, color: crit ? '#ffe066' : color, speed: crit ? 5 : 3.5, up: 2.2, life: 0.35, size: 0.06 });
    if (crit || big) this.flash(x, y, z, { r: crit ? 0.7 : 0.45, color: '#ffffff', life: 0.12 });
  }

  // a gloom creature poofs into stardust
  pop(x, y, z, { color = '#b06ae0', size = 1 } = {}) {
    this.star(x, y, z, { size: 1.4 * size, color: '#ffffff', life: 0.22, kind: 'glowS', grow: 0.8 });
    this.shockwave(x, z, { r: 1.1 * size, color, life: 0.35, wall: 0.25 });
    this.sparks(x, y, z, { n: Math.round(12 * size), color, speed: 3.5 * size, up: 3, life: 0.6, kind: 'shard', size: 0.07 });
    this.sparks(x, y, z, { n: Math.round(8 * size), color: '#fff3a6', speed: 2.5, up: 3.5, life: 0.7, size: 0.05 });
    this.smoke(x, y - 0.2, z, { n: Math.max(1, Math.round(2 * size)), color: '#5a3a7a', size: 0.17 * size, life: 0.7, rise: 0.7 });
  }
}

const UP = new THREE.Vector3(0, 1, 0), V = new THREE.Vector3();
// halfway between two colours (for sparks: a little hotter than the fire)
function i2(a, b) { return '#' + new THREE.Color(a).lerp(new THREE.Color(b), 0.45).getHexString(); }
