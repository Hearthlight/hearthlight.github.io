// Birds that come down on the village: songbirds glide in onto a roof ridge, a fence post, a lamp
// or the washing line, sit a while (look about, hop along the ridge, preen) and take off again
// when someone comes close; gulls stand on the pier's edge. Only near whoever is playing, only
// by day and not in the rain. Perches: the valley's houses & props, and the big world's town
// houses as they stream in.

import { THREE, toon } from '../render/r3d.js';
import { bakeTree } from '../models/geom.js';

const N_SONG = 12, N_GULL = 3;
const NEAR = 24, SHY = 2.7;

export class PerchBirds {
  constructor(world) {
    this.world = world;
    this.root = new THREE.Group();
    this.root.name = 'perch-birds';
    this.static = [];
    this.birds = [];
  }

  build() {
    const w = this.world, over = w.over, C = w.critters;
    for (const b of Object.values(over.buildings)) for (const p of b.perches || []) this.static.push(p);
    for (const o of w.mapData.objects) {
      if (o.type === 'fence') this.static.push({ x: o.x, y: 0.71, z: o.y, kind: 'post' });
      else if (o.type === 'lamp') this.static.push({ x: o.x, y: 2.18, z: o.y, kind: 'lamp' });
      else if (o.type === 'laundry') this.static.push({ x0: o.x + 0.3, x1: o.x2 - 0.3, y: 1.37, z: o.y + 0.06, kind: 'line' });
      else if (o.type === 'well') this.static.push({ x0: o.x - 0.7, x1: o.x + 0.7, y: 2.05, z: o.y, kind: 'ridge' });
    }
    for (const [x, z] of over.pierPosts || []) this.static.push({ x, y: 0.24, z, kind: 'pier', gull: true });
    const vc = toon(w.r3d, { color: 0xffffff, vertexColors: true, key: 'p-vc' });
    const add = (obj, gull, i) => {
      bakeTree(obj, vc);
      obj.scale.setScalar(gull ? 1 : 1.35);
      obj.visible = false;
      obj.traverse((m) => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = true; } });
      this.root.add(obj);
      this.birds.push({ obj, gull, state: 'away', t: 2 + i * 1.7 + Math.random() * 6, ph: Math.random() * 6, i });
    };
    for (let i = 0; i < N_SONG; i++) add(C.songbird(i), false, i);
    for (let i = 0; i < N_GULL; i++) add(C.gull(), true, i);
    w.over.root.add(this.root);
    return this;
  }

  // every perch in play: the valley's, and the big world's town houses that are built & shown
  perches() {
    const big = this.world.big, out = this.static;
    if (!big || !big.pois) return out;
    const more = [];
    for (const p of big.pois.live) for (const q of p.built.perches || []) more.push(q);
    return more.length ? out.concat(more) : out;
  }

  // a free spot near one of the players (on screen, not under their feet)
  pick(b, focus) {
    const all = this.perches(), cands = [];
    for (const p of all) {
      if (!!p.gull !== b.gull) continue;
      const x = p.x0 !== undefined ? p.x0 + Math.random() * (p.x1 - p.x0) : p.x;
      let ok = false;
      for (const f of focus) { const d = Math.hypot(f.x - x, f.z - p.z); if (d > 4 && d < NEAR - 4) { ok = true; break; } }
      if (!ok) continue;
      if (this.birds.some((o) => o !== b && o.state !== 'away' && Math.hypot(o.px - x, o.pz - p.z) < 0.45 && Math.abs(o.py - p.y) < 0.3)) continue;
      cands.push({ p, x });
    }
    return cands.length ? cands[Math.floor(Math.random() * cands.length)] : null;
  }

  update(dt, t, focus, hour, weather) {
    if (!this.birds.length) return;
    const quiet = hour < 5.8 || hour > 19.6 || weather === 'rain';
    for (const b of this.birds) {
      const o = b.obj, u = o.userData;
      b.t -= dt;
      if (b.state === 'away') {
        if (b.t > 0 || quiet) continue;
        const c = this.pick(b, focus);
        if (!c) { b.t = 3 + Math.random() * 4; continue; }
        // (in from off to one side and above, gliding the last stretch)
        b.px = c.x; b.py = c.p.y; b.pz = c.p.z; b.perch = c.p;
        const a = Math.random() * Math.PI * 2, r = 7 + Math.random() * 4;
        b.sx = b.px + Math.cos(a) * r; b.sy = b.py + 4 + Math.random() * 2; b.sz = b.pz + Math.sin(a) * r * 0.6;
        b.k = 0; b.dur = 2.2 + Math.random() * 0.8; b.state = 'in'; o.visible = true;
      } else if (b.state === 'in' || b.state === 'out') {
        b.k = Math.min(1, b.k + dt / b.dur);
        const k = b.state === 'in' ? 1 - Math.pow(1 - b.k, 2) : b.k * b.k;
        const x = b.sx + (b.px - b.sx) * k, z = b.sz + (b.pz - b.sz) * k;
        // (a dip in the arc on the way in, a climb on the way out)
        const y = b.sy + (b.py - b.sy) * k + Math.sin(k * Math.PI) * (b.state === 'in' ? -0.8 : 0.6);
        o.position.set(x, y, z);
        o.rotation.set(0, Math.atan2(-(b.pz - b.sz), b.px - b.sx), 0);
        const flap = b.state === 'in' && b.k > 0.72 ? 0.25 : 1;          // (wings still, gliding in)
        if (u.wings) { const f = Math.sin(t * 30 + b.ph) * 0.9 * flap; u.wings[0].rotation.x = -f; u.wings[1].rotation.x = f; }
        if (b.k >= 1) {
          if (b.state === 'in') { b.state = 'sit'; b.t = 14 + Math.random() * 30; b.face = o.rotation.y; b.hop = 0; o.position.set(b.px, b.py, b.pz); if (u.wings) for (const w of u.wings) w.rotation.x = 0; }
          else { b.state = 'away'; o.visible = false; b.t = 6 + Math.random() * 14; }
        }
      } else if (b.state === 'sit') {
        // take off: someone close, time's up, night or rain coming, or its perch gone from the world
        let near = false;
        for (const f of focus) if (Math.hypot(f.x - b.px, f.z - b.pz) < SHY) { near = true; break; }
        const gone = b.perch && b.perch.live === false;
        if (near || b.t <= 0 || quiet || gone) {
          b.state = 'out'; b.k = 0; b.dur = 1.6 + Math.random() * 0.6;
          const a = near ? Math.atan2(b.pz - focus[0].z, b.px - focus[0].x) : Math.random() * Math.PI * 2;
          b.sx = b.px; b.sy = b.py; b.sz = b.pz;
          b.px = b.sx + Math.cos(a) * 9; b.py = b.sy + 6; b.pz = b.sz + Math.sin(a) * 6;
          continue;
        }
        // (now and then: turn to look about, a hop along the ridge, a peck or a preen)
        b.hop -= dt;
        if (b.hop <= 0) {
          b.hop = 0.8 + Math.random() * 2.2;
          const r = Math.random(), P = b.perch;
          if (r < 0.45) b.face = Math.random() * Math.PI * 2;
          else if (r < 0.7 && P && P.x0 !== undefined) { b.px = Math.max(P.x0, Math.min(P.x1, b.px + (Math.random() - 0.5) * 0.6)); b.jump = 0.25; }
          else b.peck = 0.3;
        }
        if (b.jump > 0) b.jump -= dt;
        if (b.peck > 0) b.peck -= dt;
        const yj = b.jump > 0 ? Math.sin((b.jump / 0.25) * Math.PI) * 0.06 : 0;
        o.position.set(o.position.x + (b.px - o.position.x) * Math.min(1, dt * 10), b.py + yj, b.pz);
        o.rotation.set(0, b.face, b.peck > 0 ? -0.5 : 0);
      }
    }
  }
}
