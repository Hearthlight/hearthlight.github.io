// World v7: the Murk (« la Grisaille ») — the grey-violet fog lying over every
// land the story hasn't reached. Nobody walks, swims, rides or sails into it
// (the big world's collision asks `shut`); a soft wall of fog puffs rolls
// along its edge wherever a camera looks, a veil darkens the land behind it,
// and every map shows it. When a Great Hearth is relit it rolls back (the
// puffs sink and fade), and on a villain's visit it rolls in.

import { THREE } from '../render/r3d.js';
import { ZONES, BIG } from '../world/big/layout.js';
import { t } from '../i18n.js';

const CH = BIG.CHUNK;
const FOG = new THREE.Color('#4a3560');

function puffTexture() {
  const S = 32, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  for (const [r, a] of [[16, 0.05], [14, 0.13], [11.5, 0.3], [8.5, 0.58], [5, 0.9]]) {
    g.fillStyle = `rgba(255,255,255,${a})`;
    g.beginPath(); g.arc(S / 2, S / 2, r, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  return t;
}

export class Murk {
  constructor(P, saga) {
    this.P = P;
    this.saga = saga;
    this.shut = new Uint8Array(64);            // zone index → 1 while the Murk lies there
    this.root = new THREE.Group();
    this.root.name = 'murk';
    P.world.over.root.add(this.root);
    this.chunks = new Map();                   // key → { g, puffs, veil, k }
    this.k = 1;                                // how far the fog has rolled in (0..1)
    this.kTo = 1;
    this.t = 0; this.scanT = 0; this.hintT = 0;
    // soft round fog puffs: flat cards turned to face the (fixed-angle) camera, a
    // stepped radial fade painted on them (pixel bands, like the lamps' glow)
    this.puffGeo = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 4);
    const tex = puffTexture();
    this.puffMat = new THREE.MeshBasicMaterial({ map: tex, color: 0x8a72a8, transparent: true, opacity: 0.62, depthWrite: false });
    this.puffMat2 = new THREE.MeshBasicMaterial({ map: tex, color: 0x5a4474, transparent: true, opacity: 0.55, depthWrite: false });
    this.refresh(true);
    if (P.big && P.big.col) P.big.col.murk = this;
  }

  get big() { return this.P.big; }
  zoneIdx(tx, tz) { const m = this.big.map; return m.zone[(tz - m.Z0) * m.W + (tx - m.X0)]; }
  // is the tile (whole coordinates) under the Murk?
  at(tx, tz) {
    const m = this.big && this.big.map;
    if (!m || tx < m.X0 || tz < m.Z0 || tx >= m.X0 + m.W || tz >= m.Z0 + m.H) return false;
    return !!this.shut[m.zone[(tz - m.Z0) * m.W + (tx - m.X0)]];
  }

  // which lands the story has reached (the valley, the Ring's bubble and the open sea never close)
  refresh(instant = false) {
    const was = this.shut.slice();
    ZONES.forEach((z, i) => { this.shut[i] = z.id !== 'valley' && z.id !== 'sea' && !this.saga.isOpen(z.id) ? 1 : 0; });
    let changed = false;
    for (let i = 0; i < this.shut.length; i++) if (was[i] !== this.shut[i]) changed = true;
    if (changed || instant) {
      // (lands that just opened keep their puffs a moment to roll them back)
      for (const c of this.chunks.values()) c.stale = true;
      if (!instant) this.fading = { was, t: 0 };
      this.rebuild();
    }
    if (this.P.big && this.P.big.worldMap && this.P.big.worldMap.setMurk) this.P.big.worldMap.setMurk(this.shut);
  }

  // the fog rolls in (1) or back (-1): a scene's flourish
  pulse(dir) {
    if (dir > 0) { this.k = 0; this.kTo = 1; }
    else { this.k = 1; this.kTo = 1; this.rollBack = 2.2; }
  }

  rebuild() {
    for (const [key, c] of this.chunks) if (c.stale && !this.fading) { this.root.remove(c.g); this.chunks.delete(key); }
  }

  dispose() {
    if (this.P.big && this.P.big.col && this.P.big.col.murk === this) this.P.big.col.murk = null;
    this.P.world.over.root.remove(this.root);
    for (const c of this.chunks.values()) { if (c.veil) { c.veil.geometry.dispose(); c.veil.material.map.dispose(); c.veil.material.dispose(); } }
    this.chunks.clear();
  }

  // the focus points the fog should be built around
  focus() {
    const P = this.P;
    if (P.solo) return [{ x: P.world.cam.x, z: P.world.cam.z }];
    return (P.cam.views || []).map((v) => ({ x: v.cx, z: v.cz }));
  }

  // ------------------------------------------------------------------ one chunk's fog
  build(cx, cz, shut) {
    const m = this.big.map, x0 = m.X0 + cx * CH, z0 = m.Z0 + cz * CH;
    const cell = (x, z) => x >= m.X0 && z >= m.Z0 && x < m.X0 + m.W && z < m.Z0 + m.H && !!shut[m.zone[(z - m.Z0) * m.W + (x - m.X0)]];
    let any = false;
    for (let z = z0; z < z0 + CH && !any; z++) for (let x = x0; x < x0 + CH; x++) if (cell(x, z)) { any = true; break; }
    if (!any) return null;
    const g = new THREE.Group();
    // the veil: 1 texel a tile, smoothed, darkest deep inside
    const cv = document.createElement('canvas');
    cv.width = CH + 2; cv.height = CH + 2;
    const cx2 = cv.getContext('2d'), img = cx2.createImageData(CH + 2, CH + 2);
    for (let z = -1; z <= CH; z++) for (let x = -1; x <= CH; x++) {
      if (!cell(x0 + x, z0 + z)) continue;
      let open = 0;
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (!cell(x0 + x + dx, z0 + z + dz)) open++;
      const i = ((z + 1) * (CH + 2) + (x + 1)) * 4;
      img.data[i] = 58; img.data[i + 1] = 42; img.data[i + 2] = 78; img.data[i + 3] = Math.round(150 - open * 4.5);
    }
    cx2.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(cv);
    tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter;
    tex.offset.set(1 / (CH + 2), 1 / (CH + 2)); tex.repeat.set(CH / (CH + 2), CH / (CH + 2));
    const veil = new THREE.Mesh(new THREE.PlaneGeometry(CH, CH).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    veil.position.set(x0 + CH / 2, 0.08, z0 + CH / 2);
    veil.renderOrder = 3;
    g.add(veil);
    // the wall of puffs along the edge (and a few deeper in)
    const spots = [];
    let h = (cx * 73856093) ^ (cz * 19349663);
    const rnd = () => { h = (h * 1103515245 + 12345) & 0x7fffffff; return h / 0x7fffffff; };
    for (let z = z0; z < z0 + CH; z++) for (let x = x0; x < x0 + CH; x++) {
      if (!cell(x, z)) continue;
      let edge = false;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) if (!cell(x + dx, z + dz)) { edge = true; break; }
      if (edge ? rnd() < 0.55 : rnd() < 0.018) spots.push([x + 0.5 + (rnd() - 0.5), z + 0.5 + (rnd() - 0.5), edge ? 0.9 + rnd() * 1.1 : 1.4 + rnd() * 1.4, rnd() * 6.28, edge]);
    }
    const n = Math.max(1, spots.length);
    const puffs = new THREE.InstancedMesh(this.puffGeo, this.puffMat, n);
    const puffs2 = new THREE.InstancedMesh(this.puffGeo, this.puffMat2, n);
    puffs.frustumCulled = false; puffs2.frustumCulled = false;
    puffs.renderOrder = 4; puffs2.renderOrder = 4;
    g.add(puffs, puffs2);
    const zi = spots.map(([x, z]) => m.zone[(Math.floor(z) - m.Z0) * m.W + (Math.floor(x) - m.X0)]);
    const c = { g, veil, puffs, puffs2, spots, zi, n: spots.length, fade: 1 };
    this.place(c, 0);
    this.root.add(g);
    return c;
  }

  place(c, time) {
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    const k = this.k;
    c.spots.forEach(([x, z, r, ph, edge], i) => {
      const gone = this.fading && !this.shut[c.zi[i]] ? Math.max(0, 1 - this.fading.t / 2.2) : 1;
      const w = r * k * gone * (1 + Math.sin(time * 0.9 + ph) * 0.12);
      p.set(x + Math.sin(time * 0.35 + ph) * 0.35, (edge ? 0.9 : 1.4) * k + Math.sin(time * 0.6 + ph * 2) * 0.18 + (1 - gone) * 1.5, z);
      s.set(w * 1.5, w * 1.05, w * 1.05);
      c.puffs2.setMatrixAt(i, M.compose(p, q, s));
      p.y += 0.45 * w; p.x += 0.5 * w * Math.sin(ph); p.z += 0.2; s.multiplyScalar(0.72);
      c.puffs.setMatrixAt(i, M.compose(p, q, s));
    });
    c.puffs.instanceMatrix.needsUpdate = true; c.puffs2.instanceMatrix.needsUpdate = true;
  }

  // ------------------------------------------------------------------ frame
  update(dt) {
    if (!this.big) return;
    this.t += dt;
    if (this.k < this.kTo) this.k = Math.min(this.kTo, this.k + dt * 0.45);
    if (this.fading) {
      this.fading.t += dt;
      if (this.fading.t > 2.4) { this.fading = null; for (const c of this.chunks.values()) c.stale = true; this.rebuild(); }
    }
    // build the fog around every camera, drop it far away
    this.scanT -= dt;
    if (this.scanT <= 0) {
      this.scanT = 0.4;
      const m = this.big.map, want = new Set();
      const shutNow = this.fading ? this.fading.was.map((v, i) => v || this.shut[i]) : this.shut;
      for (const f of this.focus()) {
        const fx = Math.floor((f.x - m.X0) / CH), fz = Math.floor((f.z - m.Z0) / CH);
        for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
          const cx = fx + dx, cz = fz + dz;
          if (cx < 0 || cz < 0 || cx * CH >= m.W || cz * CH >= m.H) continue;
          const key = cx + ',' + cz;
          want.add(key);
          if (!this.chunks.has(key)) this.chunks.set(key, this.build(cx, cz, shutNow) || { g: null, empty: true });
        }
      }
      for (const [key, c] of this.chunks) if (!want.has(key)) { if (c.g) this.root.remove(c.g); if (c.veil) { c.veil.geometry.dispose(); c.veil.material.map.dispose(); c.veil.material.dispose(); } this.chunks.delete(key); }
    }
    for (const c of this.chunks.values()) if (c.g) {
      this.place(c, this.t);
      if (c.veil) c.veil.material.opacity = this.k * (this.fading ? 1 - Math.min(1, this.fading.t / 2.2) * (c.stale ? 1 : 0) : 1);
    }
    // someone pushing into it: a word, now and then
    this.hintT -= dt;
    if (this.hintT <= 0) {
      for (const p of this.P.players) {
        if (!p.connected && !this.P.solo) continue;
        const d = p.actor ? p.actor.dir : p.dir;
        if (!d) continue;
        const tx = Math.floor(p.pos.x + d.x * 0.9), tz = Math.floor(p.pos.z + d.z * 0.9);
        if (!this.at(tx, tz) || this.at(Math.floor(p.pos.x), Math.floor(p.pos.z))) continue;
        const z = ZONES[this.zoneIdx(tx, tz)];
        this.hintT = 6;
        this.P.toast(t('The Murk is too thick to cross. ({zone} opens later in the story.)', { zone: t(z.name) }), '#b9a2e3');
        this.P.world.fx.emit('smoke', tx + 0.5, 0.8, tz + 0.5, 6, { color: '#6a4a8e' });
        break;
      }
    }
  }
}
