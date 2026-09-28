// The big world's landmarks: windmills, the Mother Cap, igloos, temples,
// waystones… Built the first time their chunk streams in (then kept, just
// hidden when nobody looks), with their colliders, lamps, moving parts and
// the raised platforms you can stand on.

import { THREE } from '../../render/r3d.js';
import { buildBuilding } from '../../models/buildings.js';
import { BIG } from './layout.js';

export class Pois {
  constructor(big) {
    this.big = big;
    this.r3d = big.r3d;
    this.root = new THREE.Group();
    this.list = big.map.pois.map((p, i) => ({ ...p, id: i, built: null }));
    this.byChunk = new Map();
    const m = big.map;
    for (const p of this.list) {
      const k = Math.floor((p.x - m.X0) / BIG.CHUNK) + ',' + Math.floor((p.z - m.Z0) / BIG.CHUNK);
      (this.byChunk.get(k) || this.byChunk.set(k, []).get(k)).push(p);
    }
    this.lm = null;
    import('../../models/landmarks.js').then((mod) => { this.lm = mod; if (this.onReady) this.onReady(); }).catch(() => { this.lm = false; });
    this.live = new Set();
    this.lights = [];
  }

  // a chunk came into view (or left it)
  show(key, on) {
    for (const p of this.byChunk.get(key) || []) {
      if (on && !p.built) this.build(p);
      if (p.built) { p.built.obj.visible = on; if (on) this.live.add(p); else this.live.delete(p); }
    }
  }

  build(p) {
    let res = null;
    if (p.kind === 'house') {
      // (World v7) a town house of the Dawnlands, built like the valley's
      const b = buildBuilding(this.r3d, p.b);
      res = { obj: b.group, colliders: [{ rect: [p.b.x, p.b.y, p.b.w, p.b.h] }], lights: b.lights || [], world: true, glow: b.glowMats };
    } else if (p.kind === 'lighthouse') {
      const b = buildBuilding(this.r3d, { id: 'isle-lighthouse', x: Math.round(p.x) - 1, y: Math.round(p.z) - 1, w: 3, h: 3, door: Math.round(p.x), style: { kind: 'lighthouse' } });
      if (b.lamp) b.lamp.emissiveIntensity = 1.4;
      res = { obj: b.group, colliders: [{ x: p.x, z: p.z, r: 1.5 }], lights: [], world: true };
    } else if (this.lm && this.lm.buildLandmark) {
      res = this.lm.buildLandmark(this.r3d, p.kind, { seed: p.id * 13 + 7, poi: p });
      if (!res) return;
    } else return;           // models not loaded yet: try again next time it streams in
    const obj = res.obj;
    if (!res.world) obj.position.set(p.x, 0, p.z);
    obj.traverse((o) => { if (o.isMesh) { o.castShadow = o.userData.noCast ? false : true; o.receiveShadow = true; } });
    this.root.add(obj);
    const off = res.world ? { x: 0, z: 0 } : { x: p.x, z: p.z };
    for (const c of res.colliders || []) {
      const cc = c.rect ? { rect: [c.rect[0] + off.x, c.rect[1] + off.z, c.rect[2], c.rect[3]] } : { x: c.x + off.x, z: c.z + off.z, r: c.r };
      this.big.col.add(cc);
    }
    for (const l of res.lights || []) {
      const s = { ...l, x: l.x + off.x, z: l.z + off.z };
      this.big.party.lighting.addSource(s);
      this.lights.push(s);         // (the solo game adds them back after a trip indoors)
    }
    for (const d of res.decks || []) this.big.addDeck([d.rect[0] + off.x, d.rect[1] + off.z, d.rect[2], d.rect[3]], d.y);
    p.built = { obj, anim: res.anim || null, glow: res.glow || null };
  }

  update(dt, time, hour) {
    const lamps = this.big.party.lighting.lampLevel || 0;
    for (const p of this.live) {
      if (p.built.anim && !p.stopped) p.built.anim(time, dt, hour);
      if (p.built.glow) for (const m of p.built.glow) m.emissiveIntensity = lamps;       // (windows lit at night)
    }
  }

  dispose() { this.root.clear(); }
}
