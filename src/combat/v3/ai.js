// Little helpers the gloom's brains share: moving, keeping distance,
// lobbed bombs, beams and burning puddles on the ground.

import { THREE } from '../../render/r3d.js';
import { applyToPlayer } from './status.js';

export function toward(e, C, tgt, sp, dt, stop = 0.9) {
  const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, d = Math.hypot(dx, dz) || 1;
  e.faceTo(tgt.pos.x, tgt.pos.z);
  if (d > stop) C.moveEnemy(e, (dx / d) * sp * dt, (dz / d) * sp * dt, true);
  return d;
}
// stay between min & max tiles away, circling a little
export function hover(e, C, tgt, sp, dt, min, max, fly = false) {
  const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, d = Math.hypot(dx, dz) || 1;
  e.faceTo(tgt.pos.x, tgt.pos.z);
  e.orbit = e.orbit ?? (Math.random() < 0.5 ? 1 : -1);
  const want = d < min ? -1 : d > max ? 1 : 0;
  const ox = (-dz / d) * e.orbit * 0.6, oz = (dx / d) * e.orbit * 0.6;
  C.moveEnemy(e, ((dx / d) * want + ox) * sp * dt, ((dz / d) * want + oz) * sp * dt, true, fly);
  return d;
}
export function speedOf(e, C) { return e.def.speed * (C.enemySpeed || 1) * (C.diffSpeed || 1) * (e.affix === 'swift' ? 1.4 : 1); }
export function beam(C, a, b, color) {
  const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) || 0.01;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.16, L).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false }));
  m.position.set((a.x + b.x) / 2, 0.9, (a.z + b.z) / 2);
  m.rotation.y = Math.atan2(dx, dz);
  C.root.add(m);
  C.fxMeshes.push({ m, t: 0.12, life: 0.12, grow: 0 });
}

// a lobbed bomb: a warning circle where it'll land, the bomb arcs over
export function lob(C, e, to, { r = 1.3, dmg = 12, t = 1.1, elem = null, look = 'bomb', knock = 3 } = {}) {
  C.zone({ x: to.x, z: to.z, r, delay: t, dmg: dmg * (C.enemyDmg || 1), knock, kind: 'bomb', gloom: true, elem, arc: { x: e.x, y: e.y + 0.9, z: e.z }, look });
}

// ------------------------------------------------------------------ hazards on the ground
// (a slug's burning trail): players standing in them catch the element
export function hazard(C, { x, z, r, life, dmg, elem, color, spark = '#ffb040', edge = null }) {
  C.hazards = C.hazards || [];
  const m = new THREE.Mesh(C.geo.disc, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, depthWrite: false }));
  m.scale.setScalar(r); m.position.set(x, 0.03, z);
  C.root.add(m);
  // (a dark rim, so it reads on ground of its own colour)
  let ring = null;
  if (edge) { ring = new THREE.Mesh(C.geo.ring, new THREE.MeshBasicMaterial({ color: edge, transparent: true, opacity: 0.8, depthWrite: false })); ring.scale.setScalar(r); ring.position.set(x, 0.035, z); C.root.add(ring); }
  C.hazards.push({ x, z, r, life, t: 0, dmg, elem, m, ring, tick: 0, spark });
}

export function tickHazards(C, dt) {
  if (!C.hazards || !C.hazards.length) return;
  for (const h of C.hazards) {
    h.t += dt; h.tick -= dt;
    const k = 1 - h.t / h.life;
    h.m.material.opacity = 0.55 * Math.max(0, k) + Math.sin(h.t * 10) * 0.05;
    if (h.ring) h.ring.material.opacity = 0.8 * Math.max(0, Math.min(1, k * 2));
    if (Math.random() < dt * 3) C.world.fx.emit('sparkle', h.x, 0.2, h.z, 1, { color: h.spark || '#ffb040' });
    if (h.tick <= 0) {
      h.tick = 0.5;
      for (const p of C.alivePlayers()) if (Math.hypot(p.pos.x - h.x, p.pos.z - h.z) < h.r + 0.2 && p.actor.jumpY < 0.3) { applyToPlayer(C, p, h.elem); }
    }
    if (h.t >= h.life) { C.root.remove(h.m); if (h.ring) C.root.remove(h.ring); h.done = true; }
  }
  C.hazards = C.hazards.filter((h) => !h.done);
}

