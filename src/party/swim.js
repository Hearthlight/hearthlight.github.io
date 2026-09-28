// Swimming: in Party Mode the water is open to everyone. You bob along at a
// gentle paddle with your head and shoulders above the surface, a ring of
// foam around you; A kicks a quick stroke, B dives for a moment (bubbles, a
// shadow under the water — and treasure where the water glints). Currents
// carry you, whirlpools spin you round. No fighting in the water.

import { THREE } from '../render/r3d.js';
import { TT } from '../world/tiles.js';
import { audio } from '../engine/audio.js';

const SINK = -0.56, DEEP = -1.9;
const rnd = (a, b) => a + Math.random() * (b - a);

export class Swim {
  constructor(party) {
    this.party = party;
    const w = party.world;
    this.col = w.overCol;
    // what swimmers collide with: the world, but water lets them through
    this.swimCol = {
      move: (pos, dx, dz, r) => w.overCol.move(pos, dx, dz, r, true),
      blocked: (x, z, r, ig) => w.overCol.blocked(x, z, r, ig, true),
    };
    this.foamGeo = new THREE.RingGeometry(0.26, 0.4, 16).rotateX(-Math.PI / 2);
    this.foamMat = new THREE.MeshBasicMaterial({ color: 0xe7f6f4, transparent: true, opacity: 0.8, depthWrite: false });
    this.foam = new Map();
    this.spots = [];          // glinting water with something at the bottom
  }

  get big() { return this.party.big; }

  isWater(x, z) {
    const w = this.party.world, t = w.tileAt(x, z);
    if (t !== TT.WATER && t !== TT.CORAL) return false;
    return !(this.big && this.big.onDeck(x, z));
  }

  // before the actor moves: are we swimming? diving? strokes?
  pre(p, dt) {
    const a = p.actor;
    const wet = !p.vehicle && !p.mount && this.isWater(a.pos.x, a.pos.z) && a.jumpY < 0.3;
    if (wet !== !!p.swimming) {
      p.swimming = wet;
      if (wet) this.enter(p); else this.leave(p);
    }
    if (!wet) return;
    p.dive = Math.max(0, (p.dive || 0) - dt);
    p.diveCd = Math.max(0, (p.diveCd || 0) - dt);
    p.stroke = Math.max(0, (p.stroke || 0) - dt);
    const inp = p.input;
    // B dives (and never jumps), A kicks a stroke
    if (inp.pressed('jump') || inp.pressed('b')) {
      inp.edges.delete('jump'); inp.edges.delete('b');
      if (!p.dive && !p.diveCd) this.startDive(p);
    }
    if (inp.pressed('a') && !p.dive) { inp.edges.delete('a'); inp.edges.delete('interact'); p.stroke = 0.35; audio.sfx('splash', { volume: 0.35 }); this.party.world.fx.emit('water', a.pos.x - a.dir.x * 0.3, 0.2, a.pos.z - a.dir.z * 0.3, 5); }
    a.zoneSlow = (a.zoneSlow ?? 1) * (p.dive ? 0.95 : p.stroke ? 0.9 : 0.6);
    a.baseY = p.dive ? DEEP : SINK + Math.sin(this.party.t * 3 + p.slot) * 0.03;
    a.jumpY = 0; a.jumpV = 0;
    const s = Math.sin(this.party.t * 7 + p.slot);
    a.armPose = -1.5 + s * 0.5; a.armPoseL = -1.5 - s * 0.5;
    if (p.fighter) p.fighter.inv = Math.max(p.fighter.inv, p.dive ? 0.2 : 0);
  }

  // after the move: currents, foam, splashes, bubbles, treasure
  post(p, dt) {
    const a = p.actor, w = this.party.world, fx = w.fx;
    const foam = this.foam.get(p.slot);
    if (!p.swimming) { if (foam) foam.visible = false; return; }
    // currents & whirlpools
    const flow = this.flowAt(a.pos.x, a.pos.z);
    if (flow) w.overCol.move(a.pos, flow.x * 2.1 * dt, flow.z * 2.1 * dt, a.radius, true);
    for (const wp of this.whirlpools()) {
      const dx = a.pos.x - wp.x, dz = a.pos.z - wp.z, d = Math.hypot(dx, dz);
      if (d > wp.r) continue;
      const k = 1 - d / wp.r;
      // round and round, and in… until it spits you out
      w.overCol.move(a.pos, (-dz / (d || 1) * 3.2 - dx / (d || 1) * 1.1) * k * dt, (dx / (d || 1) * 3.2 - dz / (d || 1) * 1.1) * k * dt, a.radius, true);
      a.model.facing += dt * 8 * k; a.model.targetFacing = a.model.facing;
      if (d < 0.7) { const ang = Math.random() * Math.PI * 2; a.pos.x = wp.x + Math.cos(ang) * (wp.r + 0.5); a.pos.z = wp.z + Math.sin(ang) * (wp.r + 0.5); fx.emit('splash', a.pos.x, 0.2, a.pos.z, 10); audio.sfx('whoosh', { volume: 0.5 }); p.setEmote('star', 1.2); }
    }
    if (foam) {
      foam.visible = !p.dive && !p.hidden;
      foam.position.set(a.pos.x, 0.012, a.pos.z);
      const k = 1 + Math.sin(this.party.t * 4 + p.slot) * 0.08 + (a.moving ? 0.12 : 0);
      foam.scale.set(k, 1, k * 0.9);
    }
    if (a.moving && !p.dive && Math.random() < dt * (p.stroke ? 16 : 7)) fx.emit('water', a.pos.x - a.dir.x * 0.35, 0.15, a.pos.z - a.dir.z * 0.35, 1);
    if (p.dive && Math.random() < dt * 12) fx.emit('sparkle', a.pos.x + rnd(-0.2, 0.2), 0.1, a.pos.z + rnd(-0.2, 0.2), 1, { color: '#dff4ff' });
    p.swimT = (p.swimT || 0) - dt;
    if (a.moving && p.swimT <= 0 && !p.dive) { p.swimT = 0.55; audio.footstep('water'); }
    if (p.dive && !p.surfacing && p.dive < 0.12) this.surface(p);
  }

  enter(p) {
    const a = p.actor, w = this.party.world;
    w.fx.emit('splash', a.pos.x, 0.2, a.pos.z, 12);
    w.fx.emit('ring', a.pos.x, 0.05, a.pos.z, 1, { color: '#e7f6f4' });
    audio.sfx('splash', { volume: 0.6 });
    let foam = this.foam.get(p.slot);
    if (!foam) { foam = new THREE.Mesh(this.foamGeo, this.foamMat); foam.renderOrder = 2; w.over.root.add(foam); this.foam.set(p.slot, foam); }
    foam.visible = true;
    p.actor.model.setProp(null);
  }

  leave(p) {
    const a = p.actor;
    a.armPose = undefined; a.armPoseL = undefined;
    p.dive = 0;
    const foam = this.foam.get(p.slot);
    if (foam) foam.visible = false;
    this.party.world.fx.emit('water', a.pos.x, 0.3, a.pos.z, 6);
    if (p.fighter) p.actor.model.setProp(p.fighter.prop || p.fighter.cls.weapon);
  }

  startDive(p) {
    const a = p.actor, w = this.party.world;
    p.dive = 1.15; p.diveCd = 1.8; p.surfacing = false;
    w.fx.emit('splash', a.pos.x, 0.25, a.pos.z, 10);
    audio.sfx('splash', { volume: 0.7, pitch: -3 });
    this.party.buzz(p, 20);
    // something glinting down there?
    for (const s of this.spots) {
      if (s.taken || Math.hypot(s.x - a.pos.x, s.z - a.pos.z) > 1.4) continue;
      s.taken = true;
      p.diveFind = s;
    }
  }

  surface(p) {
    const a = p.actor, w = this.party.world;
    p.surfacing = true;
    w.fx.emit('splash', a.pos.x, 0.3, a.pos.z, 8);
    audio.sfx('water', { volume: 0.5 });
    if (p.diveFind) { const s = p.diveFind; p.diveFind = null; if (this.onFind) this.onFind(p, s); }
  }

  flowAt(x, z) {
    const B = this.big;
    if (!B || !B.flows) return null;
    for (const f of B.flows) if (x >= f.x0 && x < f.x1 && z >= f.z0 && z < f.z1) return f;
    return null;
  }
  whirlpools() { return (this.big && this.big.whirlpools) || []; }

  // what the phone shows while you swim
  ctxFor(p) {
    return { a: 'Stroke', b: p.diveCd > 0 ? null : 'Dive', x: null, hint: p.dive ? 'Holding your breath…' : 'Swimming! A: stroke · B: dive where the water glints' };
  }

  // an extra shimmer where treasure lies (world layer)
  drawSpots(ctx, v, t) {
    for (const s of this.spots) {
      if (s.taken) continue;
      const q = v.project(s.x, 0.02, s.z);
      if (!v.owns(q.x, q.y)) continue;
      const on = Math.sin(t * 5 + s.x) > 0.3;
      ctx.fillStyle = on ? 'rgba(255,255,240,0.9)' : 'rgba(200,240,255,0.6)';
      ctx.fillRect(Math.round(q.x), Math.round(q.y), 1, 1);
      if (on) { ctx.fillRect(Math.round(q.x) - 2, Math.round(q.y), 1, 1); ctx.fillRect(Math.round(q.x) + 2, Math.round(q.y), 1, 1); ctx.fillRect(Math.round(q.x), Math.round(q.y) - 2, 1, 1); }
    }
  }

  dispose() { for (const f of this.foam.values()) this.party.world.over.root.remove(f); this.foam.clear(); }
}
