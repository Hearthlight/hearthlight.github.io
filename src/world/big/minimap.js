// The world map of the big world: a small canvas (one pixel per tile, shaded
// a little so plateaus, shores and forests read) under a fog of 8×8-tile
// cells that lifts wherever someone has been. Drawn as a corner minimap, a
// spare split-screen panel, or the full map on the big screen.

import { TT, HIGH } from '../tiles.js';
import { hash2 } from '../../engine/util.js';
import { ZONES } from './layout.js';

export const FOG = 8;
const MAPC = {
  [TT.GRASS]: '#6eaf58', [TT.MEADOW]: '#7dba5c', [TT.FOREST]: '#2f6a45', [TT.PATH]: '#d4b07a', [TT.PLAZA]: '#b3adb3',
  [TT.SAND]: '#ead39f', [TT.WATER]: '#3a7cae', [TT.PLANK_H]: '#b07b50', [TT.PLANK_V]: '#b07b50', [TT.SOIL]: '#744d36', [TT.ROCK]: '#8a858e',
  [TT.FIELD]: '#d9b45a', [TT.HILL]: '#8fc46a', [TT.SNOW]: '#eef3fb', [TT.ICE]: '#a9cdec', [TT.LEAVES]: '#c8703a',
  [TT.MARSH]: '#5f7a45', [TT.PETALS]: '#8fc47a', [TT.DUNE]: '#eac27e', [TT.MESA]: '#b85e3c', [TT.CANYON]: '#cf8a5e',
  [TT.BASALT]: '#4a4050', [TT.LAVA]: '#f0602a', [TT.ASH]: '#8a8488', [TT.OBSIDIAN]: '#2a2032', [TT.MYCEL]: '#6a4c98',
  [TT.GLACIER]: '#bfe0f6', [TT.CREVASSE]: '#2c4a7a', [TT.BOG]: '#55503a', [TT.RUINS]: '#c4bca8', [TT.CLOUD]: '#ffffff',
  [TT.SKY]: '#a8bce8', [TT.STEPPE]: '#d4bc60', [TT.HEATH]: '#9a8aa2', [TT.CORAL]: '#4ac8d0', [TT.ARENA]: '#e6ca94',
  [TT.JUNGLE]: '#2f6e3c', [TT.TAR]: '#241c2c',
  [TT.BAMBOO]: '#a8b05a', [TT.PADDY]: '#62a292', [TT.SALT]: '#efe8ee', [TT.AUTUMN]: '#c8503a', [TT.ROOTS]: '#44683a',
  [TT.MOOR]: '#5e5460', [TT.CRYSTAL]: '#c4b6ec', [TT.COBBLE]: '#9a949c', [TT.METAL]: '#c09a4e', [TT.TUNDRA]: '#8c9c8a', [TT.UMBRAL]: '#2e2040',
  [TT.CRAG]: '#7a7480', [TT.SINTER]: '#e4d6c0',
};
const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// the fog over a W×H map (RGBA into D): parchment-dark where nobody has been, a
// dithered edge beside what's known — the big screen's veil, and the phone's
export function paintVeilData(D, fog, FW, FH, W, H) {
  const seen = (cx, cz) => cx >= 0 && cz >= 0 && cx < FW && cz < FH && !!fog[cz * FW + cx];
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    const cx = (x / FOG) | 0, cz = (z / FOG) | 0;
    if (fog[cz * FW + cx]) continue;
    const i = x - cx * FOG, j = z - cz * FOG;
    const edge = (i === 0 && seen(cx - 1, cz)) || (i === FOG - 1 && seen(cx + 1, cz)) || (j === 0 && seen(cx, cz - 1)) || (j === FOG - 1 && seen(cx, cz + 1));
    if (edge && (x + z) % 2) continue;
    const o = (z * W + x) * 4, a = hash2(x >> 1, z >> 1, 9) < 0.5;
    D[o] = a ? 58 : 52; D[o + 1] = a ? 47 : 42; D[o + 2] = a ? 70 : 64; D[o + 3] = a ? 189 : 199;
  }
}
// (and back from the bits the phone gets)
export function fogFromBits(s, n) {
  const fog = new Uint8Array(n);
  try { const bits = atob(s || ''); for (let i = 0; i < n && i < bits.length * 8; i++) fog[i] = (bits.charCodeAt(i >> 3) >> (i & 7)) & 1; } catch (e) { /* ignore */ }
  return fog;
}

export class WorldMap {
  constructor(big) {
    this.big = big;
    const m = big.map;
    this.W = m.W; this.H = m.H; this.X0 = m.X0; this.Z0 = m.Z0;
    this.FW = Math.ceil(m.W / FOG); this.FH = Math.ceil(m.H / FOG);
    this.fog = new Uint8Array(this.FW * this.FH);
    this.revealN = 0; this.bitsOf = -1;
    this.base = document.createElement('canvas');
    this.base.width = m.W; this.base.height = m.H;
    this.paintBase();
    this.veil = document.createElement('canvas');
    this.veil.width = m.W; this.veil.height = m.H;
    this.vctx = this.veil.getContext('2d');
    this.load();
    // (a map handed out whole has no fog)
    if (m.fog === false) this.fog.fill(1);
    this.paintVeil();
  }

  paintBase() {
    const m = this.big.map, ctx = this.base.getContext('2d');
    const img = ctx.createImageData(m.W, m.H), D = img.data;
    const C = {};
    for (const [k, v] of Object.entries(MAPC)) C[k] = rgb(v);
    const at = (x, z) => (x < 0 || z < 0 || x >= m.W || z >= m.H ? TT.WATER : m.ground[z * m.W + x]);
    const E = m.elev, ev = (x, z) => (x < 0 || z < 0 || x >= m.W || z >= m.H ? 0 : E ? E[z * m.W + x] : HIGH.has(m.ground[z * m.W + x]) ? 1 : 0);
    for (let z = 0; z < m.H; z++) for (let x = 0; x < m.W; x++) {
      const t = at(x, z), c = C[t] || [255, 0, 255], e = ev(x, z);
      let k = 1;
      if (e > ev(x, z + 1)) k = 0.72;                                   // cliff edges
      else if (e < ev(x, z - 1)) k = 0.8;
      else if (e >= 2 && e > ev(x - 1, z)) k = 1.06;                    // (a sunlit west flank)
      else if (t === TT.WATER || t === TT.CORAL) {
        let near = false;
        for (let d = 1; d <= 3 && !near; d++) near = at(x + d, z) !== t || at(x - d, z) !== t || at(x, z + d) !== t || at(x, z - d) !== t;
        k = near ? 1.08 : 0.92;
      } else if (hash2(x, z, 5) < 0.12) k = 0.94;
      if (e >= 2) k *= 1 + (e - 1) * 0.05;                              // (the higher, the lighter)
      const o = (z * m.W + x) * 4;
      D[o] = Math.min(255, c[0] * k); D[o + 1] = Math.min(255, c[1] * k); D[o + 2] = Math.min(255, c[2] * k); D[o + 3] = 255;
    }
    // trees as darker specks
    for (const o of this.big.scatter.list) {
      if (!['oak', 'pine', 'snowpine', 'maple', 'palm', 'bigshroom', 'willow', 'acacia', 'treefern', 'cycad'].includes(o.type)) continue;
      const x = Math.floor(o.x - m.X0), z = Math.floor(o.y - m.Z0);
      if (x < 0 || z < 0 || x >= m.W || z >= m.H) continue;
      const i = (z * m.W + x) * 4;
      const dark = o.type === 'bigshroom' ? [200, 110, 190] : o.type === 'palm' ? [70, 140, 70] : [40, 90, 58];
      D[i] = dark[0]; D[i + 1] = dark[1]; D[i + 2] = dark[2];
    }
    ctx.putImageData(img, 0, 0);
  }

  // the fog as a canvas: parchment where nobody has been, a soft edge
  paintVeil() {
    const img = this.vctx.createImageData(this.W, this.H);
    paintVeilData(img.data, this.fog, this.FW, this.FH, this.W, this.H);
    this.vctx.putImageData(img, 0, 0);
  }

  veilCell(cx, cz) {
    const ctx = this.vctx;
    for (let j = 0; j < FOG; j++) for (let i = 0; i < FOG; i++) {
      const x = cx * FOG + i, z = cz * FOG + j;
      // dithered edge next to a discovered neighbour
      const edge = (i === 0 && this.seen(cx - 1, cz)) || (i === FOG - 1 && this.seen(cx + 1, cz)) || (j === 0 && this.seen(cx, cz - 1)) || (j === FOG - 1 && this.seen(cx, cz + 1));
      if (edge && (x + z) % 2) continue;
      // (a thin veil: the shape of the whole world shows through, faintly — like a sketched map)
      ctx.fillStyle = hash2(x >> 1, z >> 1, 9) < 0.5 ? 'rgba(58,47,70,0.74)' : 'rgba(52,42,64,0.78)';
      ctx.fillRect(x, z, 1, 1);
    }
  }

  seen(cx, cz) { return cx >= 0 && cz >= 0 && cx < this.FW && cz < this.FH && !!this.fog[cz * this.FW + cx]; }
  seenAt(x, z) { return this.seen(Math.floor((x - this.X0) / FOG), Math.floor((z - this.Z0) / FOG)); }

  // lift the fog around (x, z); returns true when something new showed up
  reveal(x, z, r = 14) {
    let changed = false;
    const c0 = Math.floor((x - r - this.X0) / FOG), c1 = Math.floor((x + r - this.X0) / FOG);
    const d0 = Math.floor((z - r - this.Z0) / FOG), d1 = Math.floor((z + r - this.Z0) / FOG);
    for (let cz = d0; cz <= d1; cz++) for (let cx = c0; cx <= c1; cx++) {
      if (cx < 0 || cz < 0 || cx >= this.FW || cz >= this.FH || this.fog[cz * this.FW + cx]) continue;
      const mx = this.X0 + cx * FOG + FOG / 2, mz = this.Z0 + cz * FOG + FOG / 2;
      if (Math.hypot(mx - x, mz - z) > r + 4) continue;
      this.fog[cz * this.FW + cx] = 1;
      changed = true;
      this.vctx.clearRect(cx * FOG - 1, cz * FOG - 1, FOG + 2, FOG + 2);
      for (const [nx, nz] of [[cx - 1, cz], [cx + 1, cz], [cx, cz - 1], [cx, cz + 1]]) if (nx >= 0 && nz >= 0 && nx < this.FW && nz < this.FH && !this.fog[nz * this.FW + nx]) { this.vctx.clearRect(nx * FOG, nz * FOG, FOG, FOG); this.veilCell(nx, nz); }
    }
    if (changed) { this.dirty = true; this.revealN++; }
    return changed;
  }

  explored() { let n = 0; for (const f of this.fog) n += f; return n / this.fog.length; }

  // the middle of what's been discovered of each zone (for its label)
  // has anyone been near (x, z)? (marks only show on the explored part of the map)
  revealed(x, z) {
    const cx = Math.floor((x - this.X0) / FOG), cz = Math.floor((z - this.Z0) / FOG);
    return cx >= 0 && cz >= 0 && cx < this.FW && cz < this.FH && !!this.fog[cz * this.FW + cx];
  }

  zoneCentres() {
    const m = this.big.map, acc = new Map();
    for (let cz = 0; cz < this.FH; cz++) for (let cx = 0; cx < this.FW; cx++) {
      if (!this.fog[cz * this.FW + cx]) continue;
      const x = cx * FOG + FOG / 2, z = cz * FOG + FOG / 2;
      if (x >= m.W || z >= m.H) continue;
      const zi = m.zone[Math.floor(z) * m.W + Math.floor(x)];
      let a = acc.get(zi);
      if (!a) acc.set(zi, (a = { x: 0, z: 0, n: 0 }));
      a.x += x; a.z += z; a.n++;
    }
    const out = [];
    for (const [zi, a] of acc) if (a.n >= 2) out.push({ zone: ZONES[zi], x: this.X0 + a.x / a.n, z: this.Z0 + a.z / a.n, n: a.n });
    return out;
  }

  // ---- persistence (Party Mode: this browser; the solo game: its save)
  load() {
    try {
      const s = this.big.party.loadSave('fog', null);
      if (typeof s !== 'string' || !s) return;
      const bits = atob(s);
      const OLD = 100 * 50;
      if (bits.length === Math.ceil(OLD / 8) && this.fog.length !== OLD) {
        // (a fog saved before World v7: 100×50 cells, before the map grew 7 rows north & east)
        for (let i = 0; i < OLD; i++) if ((bits.charCodeAt(i >> 3) >> (i & 7)) & 1) this.fog[(Math.floor(i / 100) + 7) * this.FW + (i % 100)] = 1;
        this.dirty = true;
        return;
      }
      for (let i = 0; i < this.fog.length && i < bits.length * 8; i++) this.fog[i] = (bits.charCodeAt(i >> 3) >> (i & 7)) & 1;
    } catch (e) { /* ignore */ }
  }
  save() {
    if (!this.dirty) return;
    this.dirty = false;
    try { this.big.party.writeSave('fog', this.fogBits()); } catch (e) { /* ignore */ }
  }
  // the fog as bits in base64 (the save; the phone's map)
  fogBits() {
    if (this.bitsOf === this.revealN) return this.bits;
    const bytes = new Uint8Array(Math.ceil(this.fog.length / 8));
    for (let i = 0; i < this.fog.length; i++) if (this.fog[i]) bytes[i >> 3] |= 1 << (i & 7);
    let s = ''; for (const b of bytes) s += String.fromCharCode(b);
    this.bits = btoa(s); this.bitsOf = this.revealN;
    return this.bits;
  }

  // (World v7) the Murk over the lands the story hasn't reached: a violet
  // hatch at a quarter of the map's size (zone index → shut)
  setMurk(shut) {
    const m = this.big.map, W4 = Math.ceil(m.W / 4), H4 = Math.ceil(m.H / 4);
    this.murkShut = shut;
    if (!shut.some((v) => v)) { this.murkC = null; return; }
    const c = this.murkC || document.createElement('canvas');
    c.width = W4; c.height = H4;
    const g = c.getContext('2d'), img = g.createImageData(W4, H4);
    for (let z = 0; z < H4; z++) for (let x = 0; x < W4; x++) {
      const i = Math.min(m.H - 1, z * 4 + 2) * m.W + Math.min(m.W - 1, x * 4 + 2);
      if (!shut[m.zone[i]]) continue;
      const o = (z * W4 + x) * 4, hatch = (x + z) % 3 === 0;
      img.data[o] = hatch ? 90 : 52; img.data[o + 1] = hatch ? 68 : 38; img.data[o + 2] = hatch ? 118 : 72; img.data[o + 3] = hatch ? 210 : 170;
    }
    g.putImageData(img, 0, 0);
    this.murkC = c;
    this.murkV = (this.murkV || 0) + 1;
  }

  // draw the part of the world around (cx, cz) that fits a w×h box at `k`
  // screen pixels per tile; returns a world → screen mapping for markers
  draw(ctx, x, y, w, h, cx, cz, k) {
    const tw = w / k, th = h / k;
    let sx = cx - tw / 2 - this.X0, sz = cz - th / 2 - this.Z0;
    sx = Math.max(0, Math.min(this.W - tw, sx)); sz = Math.max(0, Math.min(this.H - th, sz));
    if (tw >= this.W) sx = (this.W - tw) / 2;
    if (th >= this.H) sz = (this.H - th) / 2;
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = '#2a1d34'; ctx.fillRect(x, y, w, h);
    ctx.drawImage(this.base, sx, sz, tw, th, x, y, w, h);
    if (this.murkC) ctx.drawImage(this.murkC, sx / 4, sz / 4, tw / 4, th / 4, x, y, w, h);
    ctx.drawImage(this.veil, sx, sz, tw, th, x, y, w, h);
    ctx.restore();
    return (wx, wz) => ({ x: x + (wx - this.X0 - sx) * k, y: y + (wz - this.Z0 - sz) * k });
  }
}
