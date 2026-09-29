// The weather on the land. While it rains, puddles gather on paths, cobbles, soil & mud (always on
// the same spots, a hash of the tile) and dry out slowly after; drops ring on them and on the water;
// roofs darken, wet. At dawn, mist lies on the lakes, the rivers & the sea, drifting with the wind,
// and lifts as the morning warms. Around whoever is playing (every player in Party Mode).

import { THREE, pixelTexture, toon } from '../render/r3d.js';
import { Painter } from '../art/surfaces.js';
import { TT } from '../world/tiles.js';
import { hash2, rng } from '../engine/util.js';
import { WET_ROOFS } from '../models/buildings.js';
import { WIND } from '../render/wind.js';

// how likely a tile of each ground is to hold a puddle
const PUDDLY = new Map([[TT.PATH, 0.11], [TT.PLAZA, 0.06], [TT.COBBLE, 0.07], [TT.SOIL, 0.05], [TT.RUINS, 0.07], [TT.CANYON, 0.04], [TT.MARSH, 0.08], [TT.BOG, 0.08], [TT.MOOR, 0.07]]);
const WET = new Set([TT.WATER, TT.CORAL, TT.PADDY]);
const SHAPES = [[22, 12], [16, 9], [12, 7]], PER = 70, WX = 26, WZ = 18, N_MIST = 9;

// a puddle: a blob of sky-grey water, its bank's shadow along the top, a glint of light below
function puddleTex(w, h, seed) {
  const p = new Painter(w, h), r = rng(seed);
  const cx = w / 2, cy = h / 2, bump = [r(), r(), r(), r()].map((v) => 0.12 * v);
  const inside = (x, y) => { const a = Math.atan2(y - cy, x - cx), n = 1 + bump[0] * Math.sin(a * 2 + bump[1] * 20) + bump[2] * Math.sin(a * 3 + bump[3] * 20); return ((x + 0.5 - cx) / (w / 2)) ** 2 + ((y + 0.5 - cy) / (h / 2)) ** 2 < n * 0.92; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!inside(x, y)) continue;
    p.px(x, y, !inside(x, y - 1) || !inside(x - 1, y) ? '#4f6684' : !inside(x, y + 1) ? '#8ea6c0' : '#6d86a4');
  }
  const gy = Math.round(h * 0.62), gx = Math.round(w * 0.55);
  p.hline(gx, gy, Math.max(2, Math.round(w * 0.22)), '#c4d6e6'); p.px(gx - 3, gy - 1, '#a9bfd4'); p.px(Math.round(w * 0.3), Math.round(h * 0.4), '#8ea6c0');
  return pixelTexture(p.c);
}
// mist: a soft sheet, its edge in a few steps of thinning (dithered, like the pixels round it)
function mistTex() {
  const W = 40, H = 18, p = new Painter(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot((x + 0.5 - W / 2) / (W / 2), (y + 0.5 - H / 2) / (H / 2));
    const a = d < 0.45 ? 1 : d < 0.7 ? 0.7 : d < 0.88 ? ((x + y) % 2 ? 0.45 : 0.2) : d < 1 ? ((x + y) % 2 ? 0.18 : 0) : 0;
    if (a > 0) { p.ctx.globalAlpha = a; p.px(x, y, '#f2f6fa'); }
  }
  p.ctx.globalAlpha = 1;
  return pixelTexture(p.c);
}

export class WeatherDecor {
  constructor(world) {
    this.world = world;
    this.root = new THREE.Group();
    this.root.name = 'weather';
    this.wet = 0;            // 0..1: how wet the land is (rises in the rain, dries slowly after)
    this.shown = -1;
    this.scanT = 0;
    this.mist = [];
  }

  build() {
    const r3d = this.world.r3d;
    this.puddles = SHAPES.map(([w, h], i) => {
      const mat = toon(r3d, { map: puddleTex(w, h, 11 + i * 7), transparent: true, depthWrite: false, key: 'puddle' + i });
      const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(w / 16, h / 16).rotateX(-Math.PI / 2), mat, PER);
      m.count = 0; m.frustumCulled = false; m.renderOrder = 1;
      this.root.add(m);
      return m;
    });
    this.spots = [];
    const mt = new THREE.MeshBasicMaterial({ map: mistTex(), color: 0xf2f6fa, transparent: true, depthWrite: false, opacity: 0 });
    for (let i = 0; i < N_MIST; i++) {
      const mm = new THREE.Mesh(new THREE.PlaneGeometry(5, 2.25).rotateX(-Math.PI / 2), mt.clone());
      mm.visible = false; mm.frustumCulled = false; mm.renderOrder = 2;
      this.root.add(mm);
      this.mist.push({ m: mm, life: 0, age: 0, x: 0, z: 0 });
    }
    this.world.over.root.add(this.root);
    return this;
  }

  // the puddles in the windows round each player: their tiles, where on them, how big
  scan(focus) {
    const w = this.world, M = new THREE.Matrix4(), q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3();
    const seen = new Set(), n = [0, 0, 0];
    this.spots = [];
    for (const f of focus) {
      const x0 = Math.floor(f.x - WX), x1 = Math.floor(f.x + WX), z0 = Math.floor(f.z - WZ), z1 = Math.floor(f.z + WZ);
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
        const key = x * 4096 + z;
        if (seen.has(key)) continue;
        seen.add(key);
        const odds = PUDDLY.get(w.tileAt(x + 0.5, z + 0.5));
        if (!odds || hash2(x, z, 71) >= odds) continue;
        const k = Math.floor(hash2(x, z, 72) * 3);
        if (n[k] >= PER) continue;
        const px = x + 0.25 + hash2(x, z, 73) * 0.5, pz = z + 0.25 + hash2(x, z, 74) * 0.5, gy = w.groundY({ x: px, z: pz });
        const s = 0.75 + hash2(x, z, 75) * 0.4;
        M.compose(P.set(px, gy + 0.014, pz), q, S.set(hash2(x, z, 76) < 0.5 ? -s : s, 1, s));
        this.puddles[k].setMatrixAt(n[k]++, M);
        this.spots.push([px, gy, pz]);
      }
    }
    this.puddles.forEach((m, k) => { m.count = n[k]; m.instanceMatrix.needsUpdate = true; });
  }

  update(dt, focus, hour, weather) {
    const w = this.world, raining = weather === 'rain' || weather === 'storm';
    // wet in a minute of rain, dry in a few after
    this.wet = raining ? Math.min(1, this.wet + dt / 25) : Math.max(0, this.wet - dt / 150);
    if (Math.abs(this.wet - this.shown) > 0.004) {
      this.shown = this.wet;
      const k = this.wet;
      for (const m of this.puddles) m.material.opacity = Math.min(1, k * 1.4) * 0.85;
      for (const m of WET_ROOFS) m.color.setRGB(1 - 0.3 * k, 1 - 0.27 * k, 1 - 0.18 * k);
    }
    const on = this.wet > 0.02;
    for (const m of this.puddles) m.visible = on;
    if (on) {
      this.scanT -= dt;
      if (this.scanT <= 0) { this.scanT = 0.5; this.scan(focus); }
    }
    // the drops: rings on the puddles & the water in view
    if (raining && focus.length) {
      let n = dt * 46;
      while (n > 0 && (n >= 1 || Math.random() < n)) {
        n -= 1;
        const f = focus[Math.floor(Math.random() * focus.length)], x = f.x + (Math.random() - 0.5) * 34, z = f.z + (Math.random() - 0.5) * 20;
        if (WET.has(w.tileAt(x, z))) { w.fx.emit('plink', x, w.groundY({ x, z }) + 0.02, z, 1); continue; }
        const sp = this.spots.length && this.spots[Math.floor(Math.random() * this.spots.length)];
        if (sp && this.wet > 0.4 && Math.abs(sp[0] - f.x) < 17 && Math.abs(sp[2] - f.z) < 10) w.fx.emit('plink', sp[0] + (Math.random() - 0.5) * 0.5, sp[1] + 0.02, sp[2] + (Math.random() - 0.5) * 0.25, 1);
      }
    }
    // dawn mist on the water
    const dawn = Math.min(1, Math.max(0, (hour - 4.6) / 1.2)) * Math.min(1, Math.max(0, (9.1 - hour) / 1.4)) * (weather === 'storm' ? 0 : 1);
    for (const M of this.mist) {
      if (M.life > 0) {
        M.age += dt;
        const k = M.age / M.life;
        M.x += WIND.dir.value.x * 0.12 * dt; M.z += WIND.dir.value.y * 0.12 * dt;
        M.m.position.set(M.x, M.y, M.z);
        M.m.material.opacity = Math.sin(Math.PI * Math.min(1, k)) * 0.42 * Math.max(dawn, 0.15 * (1 - k));
        if (k >= 1) { M.life = 0; M.m.visible = false; }
      } else if (dawn > 0.05 && focus.length && Math.random() < dt * 0.8) {
        // (somewhere on the water near someone)
        const f = focus[Math.floor(Math.random() * focus.length)];
        for (let i = 0; i < 10; i++) {
          const x = f.x + (Math.random() - 0.5) * 36, z = f.z + (Math.random() - 0.5) * 22;
          if (!WET.has(w.tileAt(x, z)) || !WET.has(w.tileAt(x + 2, z)) || !WET.has(w.tileAt(x - 2, z))) continue;
          Object.assign(M, { x, z, y: w.groundY({ x, z }) + 0.3 + Math.random() * 0.25, age: 0, life: 14 + Math.random() * 10 });
          M.m.scale.set(0.8 + Math.random() * 0.6, 1, 0.8 + Math.random() * 0.5);
          M.m.visible = true;
          break;
        }
      }
    }
  }
}
