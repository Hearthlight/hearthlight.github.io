// Streams the big world around the camera views: 32×32-tile chunks get a
// ground texture painted in workers (a blocky tile-colour preview stands in
// until it arrives), an animated overlay for water, lava & the sea of clouds,
// and their instanced scatter. Chunks nobody looks at are disposed after a
// moment; painted textures stay in a small LRU cache for quick returns.

import { THREE, toon } from '../../render/r3d.js';
import { TT } from '../tiles.js';
import { BIG } from './layout.js';
import { buildChunkObjects, disposeChunkObjects } from './objects3d.js';
import { ZONES } from './layout.js';
import { buildPier } from '../../models/props.js';

const CH = BIG.CHUNK, TEX = CH * 16;
const KEEP = 2.5;              // seconds a chunk survives out of view
const CACHE = 80;              // painted chunks kept in memory

// preview colours per tile type (roughly the painted average)
const PREVIEW = {
  [TT.GRASS]: '#6eaf58', [TT.MEADOW]: '#7dba5c', [TT.FOREST]: '#3f7a4a', [TT.PATH]: '#c09a6c', [TT.PLAZA]: '#a19aa3',
  [TT.SAND]: '#e9cf9b', [TT.WATER]: '#3a7cae', [TT.PLANK_H]: '#3a7cae', [TT.PLANK_V]: '#3a7cae', [TT.SOIL]: '#744d36', [TT.ROCK]: '#8a858e',
  [TT.FIELD]: '#80583a', [TT.HILL]: '#7dba5c', [TT.SNOW]: '#f1f5fc', [TT.ICE]: '#a9cdec', [TT.LEAVES]: '#b85f30',
  [TT.MARSH]: '#577343', [TT.PETALS]: '#8fc47a', [TT.DUNE]: '#e8bd7c', [TT.MESA]: '#b85e3c', [TT.CANYON]: '#c07c58',
  [TT.BASALT]: '#4a4050', [TT.LAVA]: '#d8481a', [TT.ASH]: '#857e86', [TT.OBSIDIAN]: '#342648', [TT.MYCEL]: '#5c4688',
  [TT.GLACIER]: '#b0d4f0', [TT.CREVASSE]: '#22407a', [TT.BOG]: '#4e4630', [TT.RUINS]: '#a49e90', [TT.CLOUD]: '#f4f6ff',
  [TT.SKY]: '#bcc6ee', [TT.STEPPE]: '#c4b058', [TT.HEATH]: '#848268', [TT.CORAL]: '#52cad4', [TT.ARENA]: '#e6ca94',
  [TT.JUNGLE]: '#33703e', [TT.TAR]: '#1e1824',
  [TT.BAMBOO]: '#929446', [TT.PADDY]: '#44847e', [TT.SALT]: '#e0d6de', [TT.AUTUMN]: '#a23822', [TT.ROOTS]: '#345230',
  [TT.MOOR]: '#4a3f4a', [TT.CRYSTAL]: '#b4a6de', [TT.COBBLE]: '#78727a', [TT.METAL]: '#8a6c30', [TT.TUNDRA]: '#728272', [TT.UMBRAL]: '#20162c',
  [TT.CRAG]: '#8a858e', [TT.SINTER]: '#d4c8b2',
};
const PRGB = {};
for (const [k, v] of Object.entries(PREVIEW)) PRGB[k] = [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16)];

const LIQ_VERT = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
// alpha = (kind << 6) | distance to shore; kind 0 water, 1 lava, 2 clouds, 3 reef
const LIQ_FRAG = /* glsl */`
  uniform sampler2D tMap; uniform float uTime; uniform vec3 uTint; uniform vec2 uOrigin; uniform vec2 uFlow;
  varying vec2 vUv;
  float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  void main() {
    vec2 lp = floor(vUv * ${TEX}.0);
    float a = floor(texture2D(tMap, (lp + 0.5) / ${TEX}.0).a * 255.0 + 0.5);
    if (a < 0.5) discard;
    float kind = floor(a / 64.0), d = a - kind * 64.0;
    vec2 px = lp + uOrigin;
    float f = floor(uTime * 2.4);
    if (d > 61.5) {
      // (World v7) a fall down a cliff: streaks of water (or lava) racing down, lanes of their own
      float lane = floor(px.x / 2.0), sp = h21(vec2(lane, 3.7));
      float yy = px.y - uTime * (44.0 + sp * 28.0) - sp * 60.0;
      float s = mod(floor(yy / 3.0), 4.0 + floor(sp * 5.0));
      if (s < 1.0) { gl_FragColor = kind > 0.5 ? vec4(1.0, 0.9, 0.45, 0.8) : vec4(uTint, 0.75); return; }
      if (s < 2.0 && mod(px.x, 2.0) < 1.0) { gl_FragColor = kind > 0.5 ? vec4(1.0, 0.55, 0.15, 0.55) : vec4(vec3(0.8, 0.93, 1.0) * uTint, 0.5); return; }
      discard;
    }
    if (kind > 0.5 && kind < 1.5) {
      // lava: a glowing rim, bright blobs welling up, a slow warm pulse
      float g = floor(uTime * 1.3);
      if (d <= 1.5) { gl_FragColor = vec4(1.0, 0.62, 0.18, 0.55 + 0.25 * step(0.5, h21(floor(px / 3.0) + g))); return; }
      vec2 c = floor((px + vec2(g * 1.0, g * 0.6)) / 5.0);
      float n = h21(c + g * 0.37);
      if (n > 0.955) { gl_FragColor = vec4(1.0, 0.93, 0.55, 0.95); return; }
      if (n > 0.9) { gl_FragColor = vec4(1.0, 0.7, 0.25, 0.75); return; }
      gl_FragColor = vec4(1.0, 0.42, 0.08, 0.1 + 0.07 * sin(uTime * 1.7 + (px.x + px.y) * 0.04));
      return;
    }
    if (kind > 1.5 && kind < 2.5) {
      // the sea of clouds: soft wisps drifting past below the islands
      vec2 q = px + vec2(uTime * 7.0, uTime * 1.2);
      vec2 cell = floor(q / vec2(28.0, 9.0));
      float hv = h21(cell);
      if (hv < 0.22) {
        float gy = floor(h21(cell + 1.3) * 9.0), gx = floor(h21(cell + 2.7) * 12.0), len = 6.0 + floor(h21(cell + 4.1) * 12.0);
        vec2 l = q - cell * vec2(28.0, 9.0);
        if (floor(l.y) == gy && l.x >= gx && l.x < gx + len) { gl_FragColor = vec4(1.0, 1.0, 1.0, 0.6); return; }
        if (floor(l.y) == gy + 1.0 && l.x >= gx + 2.0 && l.x < gx + len - 2.0) { gl_FragColor = vec4(0.94, 0.95, 1.0, 0.45); return; }
      }
      discard;
    }
    // water (and reef shallows): foam at the shore, glints further out
    vec3 foam = vec3(0.906, 0.965, 0.957) * uTint;
    float wob = floor(h21(floor(px / 8.0)) * 4.0);
    float phase = mod(f + wob, 4.0);
    float reach = phase < 1.0 ? 1.5 : phase < 2.0 ? 2.5 : phase < 3.0 ? 3.5 : 2.5;
    if (d <= reach) {
      float solid = step(d, reach - 1.0) + step(d, 1.5);
      if (solid < 0.5 && mod(px.x + px.y + f, 2.0) > 0.5) discard;
      gl_FragColor = vec4(foam, solid > 0.5 ? 0.9 : 0.6);
      return;
    }
    if (d > 5.0 && d <= 6.5 && mod(floor(px.x / 2.0) + f, 5.0) < 1.0) { gl_FragColor = vec4(foam, 0.35); return; }
    if (kind > 2.5) {
      // sunlight dancing on the reef
      vec2 cq = floor((px + vec2(f, f * 0.5)) / 6.0);
      if (h21(cq) > 0.9 && mod(px.x - px.y, 6.0) < 1.0) { gl_FragColor = vec4(0.85, 1.0, 0.98, 0.5); return; }
    }
    // currents: long streaks drifting with the flow
    if (dot(uFlow, uFlow) > 0.01) {
      vec2 fl = normalize(uFlow), nl = vec2(-fl.y, fl.x);
      float along = dot(px, fl) - uTime * 22.0 * length(uFlow), across = dot(px, nl);
      vec2 sc = floor(vec2(along / 30.0, across / 6.0));
      if (h21(sc) < 0.2 && mod(along, 30.0) < 12.0 && abs(fract(across / 6.0) - 0.5) < 0.09) { gl_FragColor = vec4(foam, 0.5); return; }
    }
    if (d > 8.0) {
      vec2 cell = vec2(floor((px.x + f * 2.0) / 24.0), floor(px.y / 10.0));
      float hv = h21(cell + f * 7.13);
      if (hv < 0.16) {
        float gx = cell.x * 24.0 + floor(h21(cell + 3.1) * 16.0) - f * 2.0;
        float gy = cell.y * 10.0 + floor(h21(cell + 5.7) * 8.0);
        float len = 2.0 + floor(h21(cell + 9.3) * 3.0);
        vec3 g1 = vec3(0.475, 0.741, 0.863) * uTint, g2 = vec3(0.663, 0.863, 0.933) * uTint;
        if (px.y == gy && px.x >= gx && px.x < gx + len) { gl_FragColor = vec4(hv < 0.06 ? g2 : g1, 0.86); return; }
        if (px.y == gy - 1.0 && px.x >= gx + 1.0 && px.x < gx + len - 1.0 && hv < 0.08) { gl_FragColor = vec4(g1, 0.63); return; }
      }
    }
    discard;
  }`;

export class ChunkStreamer {
  constructor(big) {
    this.big = big;
    this.r3d = big.r3d;
    this.map = big.map;
    this.CX = Math.ceil(big.map.W / CH); this.CZ = Math.ceil(big.map.H / CH);
    this.root = new THREE.Group();
    this.chunks = new Map();          // key -> chunk
    this.cache = new Map();           // key -> rgba (LRU)
    this.pending = new Map();         // key -> worker index
    this.stats = { painted: 0, paintMs: 0, built: 0, buildMs: 0 };
    this.geo = new THREE.PlaneGeometry(CH, CH).rotateX(-Math.PI / 2);
    const uv = this.geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));   // texture row 0 = north
    this.shared = { uTime: { value: 0 }, uTint: { value: new THREE.Color(1, 1, 1) } };
    this.flows = big.flows || [];
    this.startWorkers();
  }

  startWorkers() {
    const n = Math.max(2, Math.min(4, (navigator.hardwareConcurrency || 4) - 2));
    this.workers = [];
    const m = this.map;
    const payload = { X0: m.X0, Z0: m.Z0, W: m.W, H: m.H, ground: m.ground, zone: m.zone, elev: m.elev || null, arena: m.arena || null };
    for (let i = 0; i < n; i++) {
      const w = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
      w.onmessage = (e) => this.onWorker(i, e.data);
      w.onerror = (e) => { console.error('chunk worker', e.message || e); this.workers[i].dead = true; };
      w.postMessage({ type: 'map', map: payload });
      this.workers.push({ w, busy: 0, dead: false });
    }
  }

  dispose() {
    for (const k of [...this.chunks.keys()]) this.drop(k);
    for (const x of this.workers) x.w.terminate();
    this.workers = [];
    this.cache.clear();
  }

  key(cx, cz) { return cx + ',' + cz; }

  // are the chunks around (x, z) painted? (a teleport waits for this before fading in)
  readyAround(x, z, r) {
    const { X0, Z0 } = this.map;
    const cx0 = Math.floor((x - r - X0) / CH), cx1 = Math.floor((x + r - X0) / CH);
    const cz0 = Math.floor((z - r - Z0) / CH), cz1 = Math.floor((z + r - Z0) / CH);
    for (let cz = cz0; cz <= cz1; cz++) for (let cx = cx0; cx <= cx1; cx++) {
      const c = this.chunks.get(this.key(cx, cz));
      if (!c || c.state !== 'ready') return false;
    }
    return true;
  }

  // which chunks the views need, nearest first
  wanted(views, ppu) {
    const out = new Map();
    const { X0, Z0 } = this.map;
    for (const v of views) {
      const hw = v.rect.w / 2 / ppu, hh = v.rect.h / 2 / ppu;
      const x0 = v.cx - hw - 3, x1 = v.cx + hw + 3, z0 = v.cz - hh - 2, z1 = v.cz + hh + 6;
      const cx0 = Math.max(0, Math.floor((x0 - X0) / CH)), cx1 = Math.min(this.CX - 1, Math.floor((x1 - X0) / CH));
      const cz0 = Math.max(0, Math.floor((z0 - Z0) / CH)), cz1 = Math.min(this.CZ - 1, Math.floor((z1 - Z0) / CH));
      for (let cz = cz0; cz <= cz1; cz++) for (let cx = cx0; cx <= cx1; cx++) {
        const mx = X0 + (cx + 0.5) * CH, mz = Z0 + (cz + 0.5) * CH;
        const d = Math.hypot(mx - v.cx, mz - v.cz);
        const k = this.key(cx, cz);
        if (!out.has(k) || out.get(k).d > d) out.set(k, { cx, cz, d });
      }
    }
    return [...out.values()].sort((a, b) => a.d - b.d);
  }

  update(dt, views, ppu, time, tint) {
    this.shared.uTime.value = time;
    if (tint) this.shared.uTint.value.copy(tint);
    const now = performance.now() / 1000;
    const want = this.wanted(views, ppu);
    const t0 = performance.now();
    let uploads = 0;
    for (const w of want) {
      const k = this.key(w.cx, w.cz);
      let c = this.chunks.get(k);
      if (!c) c = this.create(w.cx, w.cz);
      c.seen = now;
      // painted pixels: from the cache, else ask a worker
      if (c.state !== 'ready') {
        const px = this.cache.get(k);
        if (px && uploads < 3) { this.cache.delete(k); this.cache.set(k, px); this.applyPixels(c, px); uploads++; }
        else if (!px && !this.pending.has(k)) this.request(w.cx, w.cz);
      }
      // the scatter, within a small time budget per frame
      if (!c.objs && performance.now() - t0 < 4) this.buildObjects(c);
    }
    // forget what nobody has looked at for a while
    for (const [k, c] of this.chunks) if (now - c.seen > KEEP) this.drop(k);
  }

  create(cx, cz) {
    const k = this.key(cx, cz), m = this.map;
    const x0 = m.X0 + cx * CH, z0 = m.Z0 + cz * CH;
    // blocky preview: one texel per tile
    const pv = new Uint8Array(CH * CH * 4);
    let liquid = false;
    for (let j = 0; j < CH; j++) for (let i = 0; i < CH; i++) {
      const x = x0 + i, z = z0 + j;
      const t = x < m.X0 + m.W && z < m.Z0 + m.H ? m.ground[(z - m.Z0) * m.W + (x - m.X0)] : TT.WATER;
      const c = PRGB[t] || [255, 0, 255], o = (j * CH + i) * 4;
      pv[o] = c[0]; pv[o + 1] = c[1]; pv[o + 2] = c[2]; pv[o + 3] = 255;
      if (t === TT.WATER || t === TT.LAVA || t === TT.SKY || t === TT.CORAL || t === TT.PLANK_H || t === TT.PLANK_V) liquid = true;
    }
    const prev = new THREE.DataTexture(pv, CH, CH, THREE.RGBAFormat);
    prev.magFilter = prev.minFilter = THREE.NearestFilter; prev.generateMipmaps = false; prev.colorSpace = THREE.NoColorSpace; prev.needsUpdate = true;
    const mat = toon(this.r3d, { map: prev });
    const mesh = new THREE.Mesh(this.geo, mat);
    mesh.position.set(x0 + CH / 2, 0, z0 + CH / 2);
    mesh.receiveShadow = true;
    this.root.add(mesh);
    const c = { k, cx, cz, x0, z0, mesh, mat, tex: prev, state: 'preview', liquid, water: null, objs: null, seen: 0 };
    this.chunks.set(k, c);
    return c;
  }

  request(cx, cz) {
    const k = this.key(cx, cz);
    let best = -1;
    for (let i = 0; i < this.workers.length; i++) if (!this.workers[i].dead && (best < 0 || this.workers[i].busy < this.workers[best].busy)) best = i;
    if (best < 0 || this.workers[best].busy >= 3) return;
    this.workers[best].busy++;
    this.pending.set(k, best);
    this.workers[best].w.postMessage({ type: 'paint', key: k, cx, cz });
  }

  onWorker(i, d) {
    const wk = this.workers[i];
    if (wk) wk.busy = Math.max(0, wk.busy - 1);
    if (d.type === 'error') { console.error('chunk paint failed', d.key, d.msg); this.pending.delete(d.key); return; }
    if (d.type !== 'chunk') return;
    this.pending.delete(d.key);
    this.stats.painted++; this.stats.paintMs += d.ms;
    this.cache.set(d.key, d.rgba);
    while (this.cache.size > CACHE) this.cache.delete(this.cache.keys().next().value);
    const c = this.chunks.get(d.key);
    if (c && c.state !== 'ready') { this.cache.delete(d.key); this.cache.set(d.key, d.rgba); this.applyPixels(c, d.rgba); }
  }

  applyPixels(c, rgba) {
    const tex = new THREE.DataTexture(rgba, TEX, TEX, THREE.RGBAFormat);
    tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.colorSpace = THREE.NoColorSpace; tex.needsUpdate = true;
    const old = c.tex;
    c.mat.map = tex;
    c.mat.needsUpdate = false;
    c.tex = tex;
    old.dispose();
    c.state = 'ready';
    if (c.liquid && !c.water) {
      const flow = this.flowAt(c.x0 + CH / 2, c.z0 + CH / 2);
      const wm = new THREE.ShaderMaterial({
        uniforms: { tMap: { value: tex }, uTime: this.shared.uTime, uTint: this.shared.uTint, uOrigin: { value: new THREE.Vector2(c.x0 * 16, c.z0 * 16) }, uFlow: { value: new THREE.Vector2(flow.x, flow.z) } },
        vertexShader: LIQ_VERT, fragmentShader: LIQ_FRAG, transparent: true, depthWrite: false,
      });
      const wmesh = new THREE.Mesh(this.geo, wm);
      wmesh.position.set(c.x0 + CH / 2, 0.004, c.z0 + CH / 2);
      wmesh.renderOrder = 1;
      this.root.add(wmesh);
      c.water = wmesh;
    }
  }

  flowAt(x, z) {
    for (const f of this.flows) if (x >= f.x0 && x < f.x1 && z >= f.z0 && z < f.z1) return f;
    return { x: 0, z: 0 };
  }

  buildObjects(c) {
    const list = this.big.scatter.byChunk.get(c.k) || [];
    const t0 = performance.now();
    c.objs = list.length ? buildChunkObjects(this.r3d, list) : new THREE.Group();
    const rects = this.deckRects(c);
    if (rects.length) c.objs.add(buildPier(this.r3d, rects));
    this.root.add(c.objs);
    if (this.big.pois) this.big.pois.show(c.k, true);
    this.addLights(c);
    this.stats.built++; this.stats.buildMs += performance.now() - t0;
  }

  // lava glows day and night; the mushroom woods' pools glow after dusk
  addLights(c) {
    const m = this.map, L = this.big.party.lighting, out = [];
    for (let j = 3; j < CH; j += 7) for (let i = 3; i < CH; i += 7) {
      const x = c.x0 + i, z = c.z0 + j;
      if (x >= m.X0 + m.W || z >= m.Z0 + m.H) continue;
      const idx = (z - m.Z0) * m.W + (x - m.X0), t = m.ground[idx];
      if (t === TT.LAVA) out.push({ x: x + 0.5, y: 0.6, z: z + 0.5, color: 0xff6a2a, power: 1.5, dist: 6.5, always: true });
      else if (t === TT.WATER && ZONES[m.zone[idx]].id === 'bouncecap') out.push({ x: x + 0.5, y: 0.5, z: z + 0.5, color: 0x7ad0ff, power: 0.9, dist: 5 });
    }
    for (const s of out) L.sources.push(s);
    c.lights = out;
  }

  // new bridges & boardwalks in this chunk, as rectangles of planks
  deckRects(c) {
    const m = this.map, out = [];
    const seen = new Uint8Array(CH * CH);
    const is = (i, j) => { const x = c.x0 + i, z = c.z0 + j; return i >= 0 && j >= 0 && i < CH && j < CH && x < m.X0 + m.W && z < m.Z0 + m.H && m.deck[(z - m.Z0) * m.W + (x - m.X0)] === 2 && !seen[j * CH + i]; };
    for (let j = 0; j < CH; j++) for (let i = 0; i < CH; i++) {
      if (!is(i, j)) continue;
      let w = 0; while (is(i + w, j)) w++;
      let h = 0;
      outer: while (j + h < CH) { for (let k = 0; k < w; k++) if (!is(i + k, j + h)) break outer; h++; }
      for (let b = 0; b < h; b++) for (let a = 0; a < w; a++) seen[(j + b) * CH + i + a] = 1;
      out.push([c.x0 + i, c.z0 + j, w, h]);
    }
    return out;
  }

  drop(k) {
    const c = this.chunks.get(k);
    if (!c) return;
    this.root.remove(c.mesh);
    c.mat.dispose(); c.tex.dispose();
    if (c.water) { this.root.remove(c.water); c.water.material.dispose(); }
    if (c.objs) { this.root.remove(c.objs); disposeChunkObjects(c.objs); }
    if (this.big.pois) this.big.pois.show(k, false);
    if (c.lights) { const L = this.big.party.lighting; L.sources = L.sources.filter((s) => !c.lights.includes(s)); }
    this.chunks.delete(k);
  }
}
