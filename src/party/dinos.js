// Dino Isle's peaceful life (Adventure v5): long-necks amble through the
// meadows with their little ones (you can walk under their bellies),
// stegosaurs graze by the jungle's edge, pteranodons wheel over the island.
// Built when someone comes near the island, hidden when nobody's around. A
// pat (A) on a friendly dinosaur gets a happy hop and a hoot. Once freed, the
// Tyrant King dozes in his nest, crown and all (a pat: a happy rumble).

import { THREE } from '../render/r3d.js';
import { buildDino, animDino } from '../models/dinos3d.js';
import { crown } from '../combat/v5/tyrant.js';
import { TT } from '../world/tiles.js';
import { audio } from '../engine/audio.js';

const ISLE = { x: 408, z: 214 }, NEAR = 72;
export const HERDS = [
  { kind: 'brachio', x: 386, z: 216, n: 2, babies: 2, roam: 6.5, speed: 0.9 },
  { kind: 'brachio', x: 414, z: 232, n: 1, babies: 1, roam: 4.5, speed: 0.9 },
  { kind: 'stego', x: 437, z: 219, n: 2, babies: 0, roam: 3.5, speed: 1.1 },
];
// how far out each one's body keeps players (feet for the long-necks)
const BULK = { brachio: 0.5, stego: 0.85 };
const rnd = (a, b) => a + Math.random() * (b - a);
const LAND = new Set([TT.JUNGLE, TT.GRASS, TT.MEADOW, TT.SAND, TT.PATH]);

export class DinoLife {
  constructor(party) {
    this.party = party;
    this.root = new THREE.Group();
    this.root.name = 'dinos';
    party.world.over.root.add(this.root);
    this.list = [];
    this.fliers = [];
    this.on = false;
    this.honkT = 4;
    for (const H of HERDS) {
      const adults = [];
      for (let i = 0; i < H.n; i++) {
        const d = { kind: H.kind, herd: H, x: H.x + (i - (H.n - 1) / 2) * 5, z: H.z + (i % 2) * 2.5, face: { x: i % 2 ? -1 : 1, z: 0.2 }, yaw: 0, state: 'graze', t: rnd(0, 4), speed: 0, tx: 0, tz: 0, rig: null, scale: 1, variant: i % 2, happy: 0, hop: 0 };
        adults.push(d); this.list.push(d);
      }
      for (let i = 0; i < H.babies; i++) {
        const mum = adults[i % adults.length];
        this.list.push({ kind: H.kind, herd: H, baby: true, mum, off: { x: -2.2 - i * 0.9, z: 1.6 - i * 2.4 }, x: mum.x - 2, z: mum.z + 1.5, face: { x: 1, z: 0 }, yaw: 0, state: 'follow', t: rnd(0, 4), speed: 0, rig: null, scale: 0.34, variant: 0, happy: 0, hop: 0 });
      }
    }
    for (let i = 0; i < 5; i++) this.fliers.push({ kind: 'ptera', cx: ISLE.x + (i - 2) * 7, cz: ISLE.z - 3 + (i % 2) * 6, r: 9 + i * 2.6, a: i * 1.3, h: 5.5 + i * 0.8, sp: (0.16 + i * 0.025) * (i % 2 ? 1 : -1), rig: null, glide: 0, flapT: rnd(0, 3) });
  }

  get world() { return this.party.world; }

  // someone within reach of the island?
  near() {
    let d = 1e9;
    for (const p of this.party.players) if (p.connected !== false) d = Math.min(d, Math.hypot(p.pos.x - ISLE.x, (p.pos.z - ISLE.z) * 1.2));
    return d < NEAR;
  }

  build() {
    const r3d = this.party.r3d;
    for (const d of [...this.list, ...this.fliers]) {
      if (d.rig) continue;
      d.rig = buildDino(r3d, d.kind, { variant: d.variant || 0, scale: d.scale || 1, saddle: false, baby: !!d.baby });
      this.root.add(d.rig.root);
    }
  }

  land(x, z) {
    const tt = this.world.tileAt(x, z);
    return LAND.has(tt) && !(this.party.big && this.party.big.col.blocked(x, z, 0.2) && tt !== TT.JUNGLE);
  }

  update(dt) {
    const on = this.near();
    if (on !== this.on) { this.on = on; this.root.visible = on; if (on) this.build(); }
    if (!on) return;
    const P = this.party, fx = this.world.fx;
    for (const d of this.list) {
      d.t += dt;
      if (d.happy > 0) d.happy -= dt;
      if (d.hop > 0) d.hop = Math.max(0, d.hop - dt * 2.4);
      let speed = 0;
      // someone right by it: it stops and looks (a baby's curious, a giant's patient)
      let close = null;
      for (const p of P.players) if (!p.vehicle && Math.hypot(p.pos.x - d.x, p.pos.z - d.z) < (d.baby ? 1.9 : 3.2)) { close = p; break; }
      if (close) {
        if (d.baby) d.face = { x: close.pos.x - d.x, z: close.pos.z - d.z };
      } else if (d.baby) {
        // a little one trots after its mum, a bit behind
        const m = d.mum, c = Math.cos(m.yaw), s = Math.sin(m.yaw);
        const tx = m.x + d.off.x * c - d.off.z * s, tz = m.z + d.off.x * s + d.off.z * c;
        const dx = tx - d.x, dz = tz - d.z, dist = Math.hypot(dx, dz);
        if (dist > 0.4) { speed = Math.min(2.4, dist * 1.4); d.x += (dx / dist) * speed * dt; d.z += (dz / dist) * speed * dt; d.face = { x: dx / dist, z: dz / dist }; }
        else d.face = m.face;
      } else if (d.state === 'graze') {
        if (d.t > 5 + (d.variant ? 2 : 0)) {
          for (let k = 0; k < 12; k++) {
            const a = rnd(0, Math.PI * 2), r = rnd(1.5, d.herd.roam), x = d.herd.x + Math.cos(a) * r, z = d.herd.z + Math.sin(a) * r * 0.7;
            if (this.land(x, z)) { d.tx = x; d.tz = z; d.state = 'walk'; d.t = 0; break; }
          }
        }
      } else if (d.state === 'walk') {
        const dx = d.tx - d.x, dz = d.tz - d.z, dist = Math.hypot(dx, dz);
        if (dist < 0.3 || d.t > 16) { d.state = 'graze'; d.t = rnd(0, 2); }
        else { speed = d.herd.speed; d.x += (dx / dist) * speed * dt; d.z += (dz / dist) * speed * dt; d.face = { x: dx / dist, z: dz / dist }; }
      }
      // turn smoothly (they're big)
      const want = Math.atan2(-d.face.z, d.face.x);
      let da = want - d.yaw; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      d.yaw += da * Math.min(1, dt * (d.baby ? 5 : 1.6));
      if (!d.rig) continue;
      const y = (d.hop > 0 ? Math.sin(d.hop * Math.PI) * (d.baby ? 0.5 : 0.25) : 0);
      d.rig.root.position.set(d.x, y, d.z);
      d.rig.root.rotation.y = d.yaw;
      animDino(d.rig, dt, { speed, graze: d.state === 'graze' && !d.baby && d.happy <= 0, roar: d.happy > 0 ? Math.min(1, d.happy) * 0.6 : 0 });
      // players step around the feet & bodies (and walk right under a long-neck's belly)
      const bulk = BULK[d.kind] * (d.baby ? 0.4 : 1);
      const spots = d.kind === 'brachio' && !d.baby ? [[1.0, 0.55], [1.0, -0.55], [-1.05, 0.55], [-1.05, -0.55]].map(([fx2, fz]) => [d.x + fx2 * Math.cos(d.yaw) + fz * Math.sin(d.yaw), d.z - fx2 * Math.sin(d.yaw) + fz * Math.cos(d.yaw)]) : [[d.x, d.z]];
      for (const p of P.players) {
        if (p.vehicle) continue;
        for (const [sx, sz] of spots) {
          const qx = p.pos.x - sx, qz = p.pos.z - sz, q = Math.hypot(qx, qz);
          if (q < bulk + 0.28 && q > 1e-3) this.world.overCol.move(p.actor.pos, (qx / q) * (bulk + 0.28 - q), (qz / q) * (bulk + 0.28 - q), p.actor.radius);
        }
      }
    }
    this.updateKing(dt);
    // the long-necks hoot now and then when someone's around
    this.honkT -= dt;
    if (this.honkT <= 0) { this.honkT = rnd(9, 16); if (this.list.some((d) => d.kind === 'brachio' && P.players.some((p) => Math.hypot(p.pos.x - d.x, p.pos.z - d.z) < 18))) audio.sfx('honk', { volume: 0.55 }); }
    // pteranodons wheel overhead: a few wingbeats, then a long glide
    for (const f of this.fliers) {
      f.a += f.sp * dt;
      f.flapT -= dt;
      if (f.flapT <= 0) { f.glide = f.glide ? 0 : 1; f.flapT = f.glide ? rnd(2.5, 4.5) : rnd(0.8, 1.6); }
      const x = f.cx + Math.cos(f.a) * f.r, z = f.cz + Math.sin(f.a) * f.r * 0.7, y = f.h + Math.sin(f.a * 3) * 0.4;
      const vx = -Math.sin(f.a) * Math.sign(f.sp), vz = Math.cos(f.a) * 0.7 * Math.sign(f.sp);
      if (!f.rig) continue;
      f.rig.root.position.set(x, y, z);
      f.rig.root.rotation.set(0, Math.atan2(-vz, vx), 0);
      f.rig.root.rotation.x = -Math.sign(f.sp) * 0.25;
      animDino(f.rig, dt, { air: !f.glide, glide: !!f.glide });
      if (Math.random() < dt * 0.04) audio.sfx('screech', { volume: 0.2 });
    }
    void fx;
  }

  // the Tyrant King at home, once he's himself again (until a rematch)
  updateKing(dt) {
    // (just freed, he's still stomping home: he settles in a few seconds later)
    const P = this.party, L = P.lairs && P.lairs.list.find((l) => l.type === 'rex'), calm = !!(L && L.state === 'beaten' && P.t - L.beatenAt > 6);
    const nest = P.big && P.big.map.pois.find((q) => q.kind === 'rex_nest');
    if (!nest) return;
    if (calm && !this.king) {
      const rig = buildDino(P.r3d, 'rex', { saddle: false, scale: 1.35 });
      crown(P.r3d, rig).stars.visible = false;
      this.root.add(rig.root);
      this.king = { kind: 'rex', king: true, rig, x: nest.x, z: nest.z + 0.4, yaw: Math.atan2(-0.6, -0.8), face: { x: -0.8, z: 0.6 }, t: 0, yawn: 0, happy: 0, hop: 0 };
    }
    const K = this.king;
    if (!K) return;
    K.rig.root.visible = calm;
    if (!calm) return;
    K.t += dt;
    if (K.happy > 0) K.happy -= dt;
    if (K.yawn > 0) K.yawn -= dt; else if (Math.random() < dt * 0.08) K.yawn = 1.6;
    K.rig.root.position.set(K.x, 0, K.z);
    K.rig.root.rotation.y = K.yaw;
    animDino(K.rig, dt, { roar: K.happy > 0 ? 0.8 : K.yawn > 0 ? Math.sin((K.yawn / 1.6) * Math.PI) * 0.7 : 0 });
  }

  // what A does near a friendly dinosaur (explore's & the solo game's nearThing)
  nearThing(p) {
    if (!this.on || p.vehicle || p.mount) return null;
    const K = this.king;
    if (K && K.rig.root.visible && Math.hypot(K.x - p.pos.x, K.z - p.pos.z) < 5.4) return { kind: 'dino', d: K, label: 'Pat', hint: 'The Tyrant King, himself again. Give him a pat' };
    // (the nearest one, for its size: a little one right by you before the giant behind)
    let best = null, bk = 1;
    for (const d of this.list) {
      const reach = d.kind === 'brachio' && !d.baby ? 2.6 : d.baby ? 1.8 : 1.9, k = Math.hypot(d.x - p.pos.x, d.z - p.pos.z) / reach;
      if (k < bk) { bk = k; best = d; }
    }
    return best ? { kind: 'dino', d: best, label: 'Pat', hint: best.baby ? 'A baby dinosaur! Give it a pat' : 'A gentle giant. Give it a pat' } : null;
  }

  pat(d, p) {
    if (d.king) {
      // (a happy rumble from the old king)
      d.happy = 1.6;
      audio.sfx('roar', { volume: 0.5, pitch: 6 });
      this.world.fx.emit('heart', d.x, 4.2, d.z, 5);
      if (p.setEmote) p.setEmote('heart', 1.6);
      return;
    }
    d.happy = 1.4; d.hop = 1;
    if (d.baby) d.face = { x: p.pos.x - d.x, z: p.pos.z - d.z };
    audio.sfx(d.baby ? 'chirp' : 'honk', { volume: d.baby ? 0.6 : 0.7, pitch: d.baby ? 8 : 0 });
    const fx = this.world.fx, y = d.kind === 'brachio' && !d.baby ? 3.2 : d.baby ? 0.8 : 1.8;
    fx.emit('heart', d.x, y, d.z, d.baby ? 3 : 4);
    if (p.setEmote) p.setEmote('heart', 1.4);
  }

  dispose() {
    this.party.world.over.root.remove(this.root);
    this.list = []; this.fliers = [];
  }
}
