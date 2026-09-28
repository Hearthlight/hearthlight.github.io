// Release v9: what the four new heroes do (classes9.js), plugged into combat.js by a few hooks —
// the gloom's new statuses (lit, blind, root), the specials (the Lamplighter's beacon, the
// Gardener's sprouts, the Cook's snacks, the Tinkerer's tea turret), the vines and spring traps,
// the class dodges, the Cook's heat, and the twelve ultimates of their talent trees.

import { THREE, toon } from '../../render/r3d.js';
import { audio } from '../../engine/audio.js';
import { t } from '../../i18n.js';

const rand = (a, b) => a + Math.random() * (b - a);
const norm = (x, z) => { const l = Math.hypot(x, z) || 1; return { x: x / l, z: z / l }; };
const NEW = new Set(['lamplighter', 'gardener', 'cook', 'tinkerer']);
export const isNew9 = (id) => NEW.has(id);

// ------------------------------------------------------------------ statuses
// lit: every hit on it is 15% stronger (more with talents) · blind: a foe (not a boss) loses its
// target and wanders · root: it can't take a step
export function applyStatus(C, e, { lit = 0, blind = 0, root = 0, p = null } = {}) {
  if (!e.alive) return;
  const m = p && p.fighter ? p.fighter.mods : null;
  const legend = m && m.legend;
  if (lit) { e.lit = Math.max(e.lit || 0, lit * ((m && m.litT) || 1) * (legend === 'firstlight' ? 2 : 1)); e.litK = Math.max(e.litK || 0, 0.15 + ((m && m.litK) || 0) + (legend === 'firstlight' ? 0.1 : 0)); }
  if (blind) {
    const b = blind * ((m && m.blindT) || 1);
    if (e.def.boss) e.lit = Math.max(e.lit || 0, b);
    else {
      if (!(e.blind > 0)) C.popText(e.x, e.y + e.def.h + 0.5, e.z, '?', '#fff3a6');
      e.blind = Math.max(e.blind || 0, b * (1 - (e.def.knockRes || 0) * 0.5));
      if (e.state === 'windup') { e.state = 'recover'; e.timer = 0.3; }
    }
  }
  if (root && !e.def.flying) {
    const r = root * ((m && m.rootT) || 1) * (e.def.boss ? 0.35 : 1);
    if (!(e.root > 0)) C.vfx.debris(e.x, e.z, { n: 6, r: e.r, color: '#4f955a', up: 2, speed: 1, size: 0.08 });
    e.root = Math.max(e.root || 0, r);
    e.rootK = Math.max(e.rootK || 0, ((m && m.rootMul) || 0) + (legend === 'bramblecrown' ? 0.3 : 0));
  }
}

// every frame, for each foe: the statuses wear off, and show
export function tickStatus(C, e, dt) {
  if (e.lit > 0) {
    e.lit -= dt;
    // a golden ring of light round its middle (readable from the sofa, under the health bar)
    if (!e.halo) {
      e.halo = new THREE.Mesh(C.geo.ring, new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
      e.halo.scale.setScalar(Math.max(0.45, e.r * 1.25));
      C.root.add(e.halo);
    }
    e.halo.position.set(e.x, e.y + e.def.h * 0.5 + Math.sin(C.party.t * 4) * 0.06, e.z);
    e.halo.material.opacity = Math.min(0.9, e.lit * 1.5);
    if (Math.random() < dt * 5) C.vfx.bit('glow', e.x + rand(-0.3, 0.3), e.y + e.def.h * rand(0.4, 1.1), e.z + rand(-0.2, 0.2), { vy: rand(0.4, 1), g: 0, drag: 0.6, life: 0.6, size: 0.07, s1: 0.02, color: '#ffe89a' });
  }
  if (e.blind > 0) {
    e.blind -= dt;
    if (Math.random() < dt * 9) { const a = C.party.t * 6 + Math.random() * 6.3; C.vfx.bit('glow', e.x + Math.cos(a) * 0.35, e.y + e.def.h + 0.25, e.z + Math.sin(a) * 0.35, { vy: 0.2, g: 0, drag: 1, life: 0.3, size: 0.06, s1: 0.01, color: '#ffffff' }); }
  }
  if (e.root > 0) {
    e.root -= dt;
    if (!e.vine) {
      e.vine = new THREE.Mesh(C.geo.ring, new THREE.MeshBasicMaterial({ color: 0x4f955a, transparent: true, opacity: 0.85, depthWrite: false }));
      e.vine.scale.setScalar(e.r + 0.25);
      C.root.add(e.vine);
    }
    e.vine.position.set(e.x, 0.06, e.z);
    e.vine.rotation.y += dt * 1.5;
    if (Math.random() < dt * 4) C.vfx.bit('shard', e.x + rand(-e.r, e.r), 0.2, e.z + rand(-e.r, e.r), { vy: rand(0.6, 1.2), g: 1.5, life: 0.5, size: 0.07, color: Math.random() < 0.5 ? '#6fc05a' : '#3f8a3a' });
  }
  if (!(e.root > 0) && e.vine) { C.root.remove(e.vine); e.vine = null; }
  if (!e.alive && e.vine) { C.root.remove(e.vine); e.vine = null; }
  if (e.halo && (!(e.lit > 0) || !e.alive)) { C.root.remove(e.halo); e.halo = null; }
}

// the damage bonus on a lit (or rooted, with the right talents) foe
export const litMul = (e) => (e.lit > 0 ? 1 + (e.litK || 0.15) : 1) * (e.root > 0 && e.rootK ? 1 + e.rootK : 1);

// friends standing in a Warding Light beacon take less
export function ward(C, q) {
  if (!C.beacons) return 0;
  for (const b of C.beacons) { const w = b.p.fighter && b.p.fighter.mods.beaconWard; if (w && Math.hypot(q.pos.x - b.x, q.pos.z - b.z) < b.r) return w; }
  return 0;
}

// a foe beaten: the Cook's leftovers
export function onKill(C, e, p) {
  const m = p && p.fighter && p.fighter.mods;
  if (m && m.leftovers && Math.random() < m.leftovers) C.drop('tart', e.x, e.z);
}

// ------------------------------------------------------------------ moves
// before a move lands (it may change it): the Cook's Flambé burns its heat
export function before(C, p, A) {
  const f = p.fighter;
  if (A.heatBurst && f.heat > 0) {
    const k = 1 + (f.heat / 100) * (0.6 + (f.mods.flambe || 0));
    if (f.heat >= 50) C.popText(p.pos.x, 2.3, p.pos.z, t('Flambé!'), '#ff8a3a');
    f.heat = 0;
    return { ...A, dmg: A.dmg * k, r: A.r * (1 + (k - 1) * 0.3) };
  }
  return A;
}

// after a move lands: a spark at the thrust's tip, the flare's light, the glove on its spring
export function after(C, p, A, dm) {
  const f = p.fighter, a = p.actor, V = C.vfx;
  if (A.spark) {
    const r = A.spark * f.mods.range, x = a.pos.x + a.dir.x * A.range * 0.95, z = a.pos.z + a.dir.z * A.range * 0.95;
    V.star(x, 0.9, z, { size: 1.4, kind: 'rays', color: '#fff3a6', life: 0.22 });
    V.light(x, 1, z, { color: '#ffd66b', power: 2, life: 0.3, dist: 5 });
    C.blast(x, z, r, 6 * dm, 1.5, { p, color: '#fff3a6', blind: (f.mods.sparkBlind || 0.8), lit: 3 });
  }
  if (A.flare) {
    const x = a.pos.x + a.dir.x * (A.at || 0), z = a.pos.z + a.dir.z * (A.at || 0);
    V.flash(x, 1, z, { r: A.r * 1.4, color: '#fff3c4', life: 0.3 });
    V.light(x, 1.2, z, { color: '#fff0b0', power: 3.2, life: 0.5, dist: 8 });
    V.slash(a.pos.x, 0.9, a.pos.z, Math.atan2(a.dir.x, a.dir.z), { r: A.r + 0.6, arc: 2.6, color: '#ffe89a', life: 0.28, sweep: 1.8, width: 1.4 });
  }
  if (A.heatBurst && (f.mods.grease || f.mods.legend === 'souppot')) {
    const x = a.pos.x + a.dir.x * (A.at || 0), z = a.pos.z + a.dir.z * (A.at || 0);
    if (f.mods.grease) C.patch(x, z, A.r * 0.8, p, 'fire', 3);
    if (f.mods.legend === 'souppot') for (const q of C.alivePlayers()) if (Math.hypot(q.pos.x - x, q.pos.z - z) < A.r + 1.5) { const g = q.fighter; g.hp = Math.min(g.maxHp, g.hp + g.maxHp * 0.08); V.pillar(q.pos.x, q.pos.z, { r: 0.4, h: 2.2, color: '#e8b070', life: 0.5 }); }
  }
  if (f.steam > 0 && A.kind === 'melee') {
    const x = a.pos.x + a.dir.x * A.range * 0.8, z = a.pos.z + a.dir.z * A.range * 0.8;
    C.zone({ x, z, r: 1.4, delay: 0.05, dmg: A.dmg * dm * 0.6, knock: 2.5, launch: 3, p, kind: 'quake', color: '#c8c4d0', quiet: true });
  }
  if (A.glove) {
    const x = a.pos.x + a.dir.x * A.range * 0.9, z = a.pos.z + a.dir.z * A.range * 0.9;
    V.trailLine({ x: a.pos.x, y: 0.9, z: a.pos.z }, { x, y: 0.9, z }, { color: '#c8454f', size: 0.14, life: 0.18 }, 0.15);
    V.star(x, 0.9, z, { size: 1.1, color: '#ffffff', life: 0.15 });
  }
}

// the moves combat.js doesn't know: a line of vines, a spring trap
export function perform(C, p, A, dm) {
  const f = p.fighter, a = p.actor, V = C.vfx;
  if (A.kind === 'vines') {
    const len = A.len * f.mods.range, n = Math.max(3, Math.round(len / 0.9));
    for (let i = 0; i < n; i++) {
      const d = 0.9 + (i / (n - 1)) * (len - 0.6), x = a.pos.x + a.dir.x * d, z = a.pos.z + a.dir.z * d;
      V.later(i * 0.05, () => {
        vineBurst(C, x, z, A.r);
        C.blast(x, z, A.r, A.dmg * dm * (i === n - 1 ? 1.3 : 0.7), A.knock, { p, color: '#4f955a', root: A.root, launch: A.launch || 0 });
      });
    }
    audio.sfx('thud', { volume: 0.6 });
    return true;
  }
  if (A.kind === 'trap') {
    const x = a.pos.x + a.dir.x * A.at, z = a.pos.z + a.dir.z * A.at;
    const mine = (C.traps || []).filter((q) => q.p === p);
    const max = A.max + (f.mods.trapMax || 0);
    while (mine.length >= max) { const old = mine.shift(); removeTrap(C, old); }
    addTrap(C, p, x, z, A, dm);
    return true;
  }
  return false;
}

// vines bursting out of the ground: a green ring and leaves
function vineBurst(C, x, z, r) {
  const V = C.vfx;
  V.shockwave(x, z, { r, color: '#6fc05a', life: 0.3, wall: 0.7 });
  V.debris(x, z, { n: 7, r: r * 0.7, color: '#3f8a3a', up: 5, speed: 1.6, size: 0.1 });
  for (let i = 0; i < 4; i++) V.bit('shard', x + rand(-r, r) * 0.6, 0.3, z + rand(-r, r) * 0.6, { vy: rand(2, 4), g: 5, life: 0.6, size: 0.09, color: i % 2 ? '#6fc05a' : '#a8e07a' });
}

// ------------------------------------------------------------------ the specials
export function special(C, p, S, dm) {
  const f = p.fighter, a = p.actor, V = C.vfx;
  if (S.kind === 'beacon') {
    // the lantern planted where you stand: pulses of light for a while
    const b = { p, x: a.pos.x + a.dir.x * 0.6, z: a.pos.z + a.dir.z * 0.6, t: 0, life: S.dur * (f.mods.beaconT || 1), next: 0, S, dm, r: S.r * f.mods.range * (f.mods.beaconR || 1) };
    b.obj = beaconMesh(C);
    b.obj.position.set(b.x, 0, b.z);
    C.root.add(b.obj);
    b.light = { x: b.x, y: 1.6, z: b.z, color: 0xffd070, power: 2.4, dist: b.r * 2.2, lamp: true };
    if (C.party.lighting) C.party.lighting.sources.push(b.light);
    (C.beacons || (C.beacons = [])).push(b);
    V.pillar(b.x, b.z, { r: 0.5, h: 4, color: '#ffe89a', life: 0.6 });
    return true;
  }
  if (S.kind === 'sprouts') {
    const n = S.n + (f.mods.sproutN || 0), hw = f.mods.legend === 'heartwood' ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const ang = Math.atan2(a.dir.z, a.dir.x) + (i - (n - 1) / 2) * 0.9;
      addMinion(C, p, a.pos.x + Math.cos(ang) * 1.1, a.pos.z + Math.sin(ang) * 1.1, 'sprout', { life: S.life * (f.mods.sproutT || 1) * hw, dmg: S.dmg * (1 + (f.mods.sproutDmg || 0)), every: S.every, speed: S.speed, heal: S.heal * (1 + (f.mods.wiltHeal || 0)) * hw });
    }
    if (S.healNow) for (const q of C.alivePlayers()) if (Math.hypot(q.pos.x - a.pos.x, q.pos.z - a.pos.z) < 4) { const g = q.fighter, amt = Math.round(g.maxHp * S.healNow); g.hp = Math.min(g.maxHp, g.hp + amt); C.popText(q.pos.x, 2, q.pos.z, '+' + amt, '#8fd6b4'); }
    audio.sfx('sprout', { volume: 0.8 });
    return true;
  }
  if (S.kind === 'snack') {
    // three snacks tossed around you: tarts heal, coffee makes you quick (anyone can grab them)
    const tarts = S.tarts + (f.mods.snackN || 0), coffees = S.coffees;
    const toss = (kind) => { C.drop(kind, a.pos.x + rand(-0.8, 0.8), a.pos.z + rand(-0.8, 0.8)); const d = C.drops[C.drops.length - 1]; d.bonus = f.mods.tartHeal || 0; d.coffeeT = f.mods.coffeeT || 0; };
    for (let i = 0; i < tarts; i++) toss('tart');
    for (let i = 0; i < coffees; i++) toss('coffee');
    if (f.mods.snackBuff) for (const q of C.alivePlayers()) if (Math.hypot(q.pos.x - a.pos.x, q.pos.z - a.pos.z) < 5) { q.fighter.buff = Math.max(q.fighter.buffT > 0 ? q.fighter.buff : 0, f.mods.snackBuff); q.fighter.buffT = Math.max(q.fighter.buffT, 6); }
    C.popText(a.pos.x, 2.3, a.pos.z, t('Snack time!'), '#ffb3bf');
    V.star(a.pos.x, 1.2, a.pos.z, { size: 1.5, kind: 'rays', color: '#ffb3bf', life: 0.3 });
    return true;
  }
  if (S.kind === 'turret') {
    const x = a.pos.x + a.dir.x * 1.2, z = a.pos.z + a.dir.z * 1.2;
    addTurret(C, p, x, z, { life: S.life * (f.mods.turretT || 1) * (f.mods.legend === 'clockheart' ? 1.5 : 1), every: S.every * (f.mods.turretRate || 1) * (f.mods.legend === 'crumbles' ? 0.5 : 1), dmg: S.dmg * dm * (1 + (f.mods.turretDmg || 0)), range: S.range, speed: S.speed, big: false, twin: !!f.mods.turretTwin, elem: f.mods.turretIce ? 'ice' : null });
    return true;
  }
  return false;
}

// ------------------------------------------------------------------ the dodges
// (after combat.js has set up the roll: tweak it, and leave something behind)
export function dodge(C, p) {
  const f = p.fighter, a = p.actor, D = f.cls.dodge, V = C.vfx;
  if (!D) return;
  if (D.kind === 'flash') {
    V.flash(a.pos.x, 0.9, a.pos.z, { r: D.r * 1.2, color: '#fff3c4', life: 0.22 });
    V.light(a.pos.x, 1, a.pos.z, { color: '#fff0b0', power: 2.4, life: 0.3, dist: 6 });
    for (const e of C.enemies) if (e.alive && e.hurtable && Math.hypot(e.x - a.pos.x, e.z - a.pos.z) < D.r + e.r) applyStatus(C, e, { blind: D.blind, lit: 2, p });
  } else if (D.kind === 'petal') {
    const k = D.speed / 9;
    f.roll.vx *= k; f.roll.vz *= k; f.roll.t *= 1.15;
    patchHeal(C, p, a.pos.x, a.pos.z, 1.2, D.clover * (f.mods.cloverT || 1));
    for (let i = 0; i < 6; i++) V.bit('shard', a.pos.x + rand(-0.4, 0.4), 0.5, a.pos.z + rand(-0.4, 0.4), { vy: rand(1, 2), g: 2, life: 0.7, size: 0.08, color: i % 2 ? '#ffb3cf' : '#ffffff' });
  } else if (D.kind === 'slide') {
    const k = D.speed / 9;
    f.roll.vx *= k; f.roll.vz *= k; f.roll.t = D.t; f.inv = Math.max(f.inv, D.t);
    f.slide = { hit: new Set(), dmg: D.trip * C.dmgMul(p) };
    a.lean = 1.4;
  } else if (D.kind === 'spring') {
    // a hop backwards on spring-loaded boots
    f.roll.vx = -a.dir.x * D.speed; f.roll.vz = -a.dir.z * D.speed; f.roll.t = 0.34;
    a.jumpV = Math.max(a.jumpV || 0, D.jump);
    a.dir = { x: a.dir.x, z: a.dir.z }; a.model.targetFacing = Math.atan2(a.dir.x, a.dir.z);
    V.sparks(a.pos.x, 0.2, a.pos.z, { n: 6, color: '#c8c4d0', speed: 3, up: 3 });
    audio.sfx('boing', { volume: 0.6 });
  }
}

// ------------------------------------------------------------------ the Cook's heat
// light hits heat up the pan; full, your hits burn for a while
export function onHit(C, p, e, dmg, kind) {
  const f = p && p.fighter;
  if (!f || f.clsId !== 'cook' || kind !== 'melee' || f.sizzle > 0) return;
  f.heat = Math.min(100, (f.heat || 0) + 7 * (f.mods.heatK || 1) * (f.mods.legend === 'goldwhisk' ? 2 : 1));
  if (f.heat >= 100) {
    f.heat = 0; f.sizzle = 5 + (f.mods.sizzleT || 0);
    C.popText(p.pos.x, 2.4, p.pos.z, t('Sizzling!'), '#ff8a3a', true);
    C.vfx.star(p.pos.x, 1.2, p.pos.z, { size: 1.6, kind: 'rays', color: '#ff8a3a', life: 0.35 });
    audio.sfx('sizzle', { volume: 0.7 });
  }
}

// ------------------------------------------------------------------ every frame
export function tick(C, dt) {
  tickBeacons(C, dt);
  tickMinions(C, dt);
  tickTurrets(C, dt);
  tickTraps(C, dt);
  tickHeals(C, dt);
  for (const p of C.players) {
    const f = p.fighter;
    if (!f) continue;
    if (f.sizzle > 0) { f.sizzle -= dt; if (Math.random() < dt * 14) C.vfx.bit('ember', p.pos.x + rand(-0.3, 0.3), 0.9 + rand(0, 0.6), p.pos.z + rand(-0.2, 0.2), { vy: rand(1, 2), g: -0.5, life: 0.4, size: 0.06, color: Math.random() < 0.5 ? '#ffb040' : '#ff6a1a' }); }
    if (f.slide) {
      if (!f.roll) { f.slide = null; p.actor.lean = 0; }
      else for (const e of C.enemies) if (e.alive && e.hurtable && !f.slide.hit.has(e) && Math.hypot(e.x - p.pos.x, e.z - p.pos.z) < e.r + 0.5) { f.slide.hit.add(e); C.hurtEnemy(e, f.slide.dmg, { p, dir: norm(f.roll.vx, f.roll.vz), knock: 2, launch: 2.5, kind: 'melee', noCombo: true }); }
    }
    tickUlt(C, p, dt);
  }
}

// a pole planted in the ground, its lantern glowing at the top
function beaconMesh(C) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 0.08), C.mat(0x6b4330)); pole.position.y = 0.8;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.06), C.mat(0x3b2a2e)); arm.position.set(0.15, 1.58, 0);
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.38, 0.32), C.mat(0xffe08a, 0xffc04a)); lamp.position.set(0.32, 1.34, 0);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.4), C.mat(0x3b2a2e)); cap.position.set(0.32, 1.56, 0);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.34), C.mat(0x3b2a2e)); foot.position.set(0.32, 1.13, 0); g.add(foot);
  g.add(pole, arm, lamp, cap);
  g.lamp = lamp;
  return g;
}

function tickBeacons(C, dt) {
  if (!C.beacons || !C.beacons.length) return;
  for (const b of C.beacons) {
    b.t += dt; b.next -= dt;
    const pulse = 0.5 + Math.sin(b.t * 6) * 0.5;
    b.obj.lamp.scale.setScalar(1 + pulse * 0.15);
    if (b.light) b.light.power = 2 + pulse * 0.8;
    if (b.next <= 0) {
      b.next = b.S.every;
      C.vfx.shockwave(b.x, b.z, { r: b.r, color: '#ffe89a', life: 0.5, wall: 0.3 });
      for (const e of C.enemies) if (e.alive && e.hurtable && Math.hypot(e.x - b.x, e.z - b.z) < b.r + e.r) {
        C.hurtEnemy(e, b.S.dmg * b.dm * (b.p.fighter && b.p.fighter.mods.legend === 'glimmerwick' ? 1.6 : 1), { p: b.p, dir: norm(e.x - b.x, e.z - b.z), knock: 0.6, kind: 'aoe', quiet: true, noCombo: true, blind: b.S.blind, lit: b.S.lit, elem: b.p.fighter && (b.p.fighter.mods.beaconFire || b.p.fighter.mods.legend === 'glimmerwick') ? 'fire' : null });
      }
      const heal = b.S.heal * b.S.every * (b.p.fighter && b.p.fighter.mods.legend === 'glimmerwick' ? 2 : 1) * (1 + ((b.p.fighter && b.p.fighter.mods.beaconHeal) || 0));
      for (const q of C.alivePlayers()) if (Math.hypot(q.pos.x - b.x, q.pos.z - b.z) < b.r) { const g = q.fighter; g.hp = Math.min(g.maxHp, g.hp + g.maxHp * heal); }
    }
    if (b.t >= b.life || !b.p.fighter) b.done = true;
    if (b.done) {
      C.root.remove(b.obj);
      if (b.light && C.party.lighting) { const S = C.party.lighting.sources, i = S.indexOf(b.light); if (i >= 0) S.splice(i, 1); }
      C.vfx.smoke(b.x, 1.4, b.z, { n: 3, color: '#fff3c4', size: 0.2 });
    }
  }
  C.beacons = C.beacons.filter((b) => !b.done);
}

// ---- minions: the Gardener's sprouts (and her Pumpkin Giant)
function sproutMesh(C, big = false) {
  const g = new THREE.Group(), k = big ? 3.4 : 1.5;
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.3 * k, 0.32 * k, 0.28 * k), C.mat(big ? 0xe8803a : 0x6fc05a)); body.position.y = 0.2 * k;
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.2 * k, 0.06 * k, 0.02 * k), C.mat(0x2a3a20)); face.position.set(0, 0.24 * k, 0.15 * k);
  const leafA = new THREE.Mesh(new THREE.BoxGeometry(0.22 * k, 0.04 * k, 0.1 * k), C.mat(big ? 0x4f955a : 0xa8e07a)); leafA.position.set(-0.12 * k, 0.42 * k, 0); leafA.rotation.z = 0.5;
  const leafB = leafA.clone(); leafB.position.x = 0.12 * k; leafB.rotation.z = -0.5;
  const bud = new THREE.Mesh(new THREE.BoxGeometry(0.1 * k, 0.1 * k, 0.1 * k), C.mat(big ? 0x6b4330 : 0xffb3cf)); bud.position.y = 0.46 * k;
  g.add(body, face, leafA, leafB, bud);
  g.body = body;
  return g;
}

export function addMinion(C, p, x, z, kind, o) {
  const big = kind === 'pumpkin';
  const m = { p, x, z, kind, t: 0, next: 0.3, obj: sproutMesh(C, big), hop: 0, ...o };
  m.obj.position.set(x, 0, z);
  C.root.add(m.obj);
  C.vfx.debris(x, z, { n: big ? 14 : 6, r: big ? 1 : 0.3, color: '#6b4330', up: 4, speed: 2, size: big ? 0.16 : 0.08 });
  audio.sfx('sprout', { volume: big ? 0.9 : 0.4, pitch: big ? -6 : 0 });
  (C.minions || (C.minions = [])).push(m);
  return m;
}

function tickMinions(C, dt) {
  if (!C.minions || !C.minions.length) return;
  for (const m of C.minions) {
    m.t += dt; m.next -= dt; m.hop += dt * 9;
    const big = m.kind === 'pumpkin', reach = big ? 1.3 : 0.6;
    // the nearest gloom (not too far from its gardener)
    let best = null, bd = big ? 9 : 7;
    for (const e of C.enemies) { if (!e.alive || !e.hurtable || e.y > 1.5) continue; const d = Math.hypot(e.x - m.x, e.z - m.z); if (d < bd) { bd = d; best = e; } }
    if (best) {
      const dx = best.x - m.x, dz = best.z - m.z, d = Math.hypot(dx, dz) || 1;
      if (d > best.r + reach) { const pos = { x: m.x, z: m.z }; C.world.overCol.move(pos, (dx / d) * m.speed * dt, (dz / d) * m.speed * dt, big ? 0.5 : 0.2); m.x = pos.x; m.z = pos.z; }
      else if (m.next <= 0) {
        m.next = m.every;
        if (big) { C.blast(best.x, best.z, 2, m.dmg, 4, { p: m.p, color: '#e8803a', launch: 3, stun: 0.4 }); C.party.cam.shake = Math.max(C.party.cam.shake || 0, 0.2); audio.sfx('slam', { volume: 0.5 }); }
        else { C.hurtEnemy(best, m.dmg * C.dmgMul(m.p), { p: m.p, dir: norm(dx, dz), knock: 0.8, kind: 'melee', quiet: true, noCombo: true, root: m.p.fighter && m.p.fighter.mods.sproutRoot ? 0.5 : 0 }); audio.sfx('bite', { volume: 0.3 }); }
        m.obj.body.scale.set(1.25, 0.8, 1.25);
      }
      // (a decoy: the simple gloom near it chases the sprout instead)
      if (!best.def.boss && !best.brain && d < 3) { best.decoy = m; best.decoyT = 0.6; }
      m.obj.rotation.y = Math.atan2(dx, dz);
    } else {
      // no gloom: trot after the gardener
      const o = m.p.pos, dx = o.x - m.x, dz = o.z - m.z, d = Math.hypot(dx, dz);
      if (d > 1.6) { m.x += (dx / d) * m.speed * dt; m.z += (dz / d) * m.speed * dt; m.obj.rotation.y = Math.atan2(dx, dz); }
    }
    m.obj.body.scale.lerp(new THREE.Vector3(1, 1, 1), Math.min(1, dt * 8));
    m.obj.position.set(m.x, Math.abs(Math.sin(m.hop)) * (big ? 0.12 : 0.08), m.z);
    if (m.t >= m.life || !m.p.fighter) {
      m.done = true;
      C.root.remove(m.obj);
      // it wilts into a flower that heals the friends around it
      C.vfx.pillar(m.x, m.z, { r: big ? 1 : 0.5, h: big ? 4 : 2.5, color: '#8fd6b4', life: 0.7 });
      for (const q of C.alivePlayers()) if (Math.hypot(q.pos.x - m.x, q.pos.z - m.z) < (big ? 4 : 2.5)) { const g = q.fighter, amt = Math.round(g.maxHp * (m.heal || 0.1)); g.hp = Math.min(g.maxHp, g.hp + amt); C.popText(q.pos.x, 2, q.pos.z, '+' + amt, '#8fd6b4'); }
      if (m.p.fighter && m.p.fighter.mods.wiltSpore) C.blast(m.x, m.z, big ? 3 : 2.2, 10 * C.dmgMul(m.p), 1, { p: m.p, elem: 'poison', color: '#8fdc5a' });
    }
  }
  C.minions = C.minions.filter((m) => !m.done);
}

// ---- the Tinkerer's tea turret: a kettle on three legs
function turretMesh(C, big) {
  const g = new THREE.Group(), k = big ? 1.3 : 1;
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2, leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4 * k, 0.05), C.mat(0x5a5466)); leg.position.set(Math.cos(a) * 0.16 * k, 0.2 * k, Math.sin(a) * 0.16 * k); leg.rotation.z = Math.cos(a) * 0.25; leg.rotation.x = -Math.sin(a) * 0.25; g.add(leg); }
  const head = new THREE.Group(); head.position.y = 0.52 * k;
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * k, 0.24 * k, 0.26 * k, 10), C.mat(0xc8804a)); head.add(pot);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * k, 0.16 * k, 0.07 * k, 10), C.mat(0x8a5a36)); lid.position.y = 0.16 * k; head.add(lid);
  const knob = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), C.mat(0xffd66b, 0xffc04a)); knob.position.y = 0.22 * k; head.add(knob);
  const spout = new THREE.Mesh(new THREE.BoxGeometry(0.06 * k, 0.06 * k, 0.24 * k), C.mat(0xc8804a)); spout.position.set(0, 0.02, 0.26 * k); spout.rotation.x = -0.4; head.add(spout);
  g.add(head);
  g.head = head;
  return g;
}

export function addTurret(C, p, x, z, o) {
  const tu = { p, x, z, t: 0, next: 0.4, obj: turretMesh(C, o.big), ...o };
  tu.obj.position.set(x, 0, z);
  C.root.add(tu.obj);
  C.vfx.sparks(x, 0.4, z, { n: 8, color: '#c8c4d0', speed: 3 });
  audio.sfx('tick', { volume: 0.6 });
  (C.turrets || (C.turrets = [])).push(tu);
  return tu;
}

function tickTurrets(C, dt) {
  if (!C.turrets || !C.turrets.length) return;
  for (const tu of C.turrets) {
    tu.t += dt; tu.next -= dt;
    let best = null, bd = tu.range;
    for (const e of C.enemies) { if (!e.alive || !e.hurtable) continue; const d = Math.hypot(e.x - tu.x, e.z - tu.z); if (d < bd) { bd = d; best = e; } }
    if (best) {
      const dx = best.x - tu.x, dz = best.z - tu.z;
      tu.obj.head.rotation.y = Math.atan2(dx, dz);
      if (tu.next <= 0 && tu.p.fighter) {
        tu.next = tu.every;
        const g0 = Math.atan2(dz, dx);
        for (const k of tu.twin ? [-0.12, 0.12] : [0]) {
          const d = { x: Math.cos(g0 + k), z: Math.sin(g0 + k) };
          const s = C.fire(tu.p, { kind: 'shot', dmg: 1, speed: tu.speed, r: 0.22, life: tu.range / tu.speed + 0.2, homing: 3, look: 'tea', knock: 1.2, elem: tu.elem }, 1, d);
          s.dmg = tu.dmg; s.x = tu.x + d.x * 0.35; s.z = tu.z + d.z * 0.35; s.y = 0.62; s.mesh.position.set(s.x, s.y, s.z);
        }
        C.vfx.smoke(tu.x, 0.95, tu.z, { n: 1, color: '#ffffff', size: 0.12, rise: 0.8, life: 0.6 });
        if (Math.random() < 0.5) audio.sfx('tick', { volume: 0.25 }); else if (Math.random() < 0.3) audio.sfx('steam', { volume: 0.15 });
      }
    }
    if (Math.random() < dt * 3) C.vfx.smoke(tu.x, 0.9, tu.z, { n: 1, color: '#f4f0ff', size: 0.1, rise: 0.7, life: 0.8 });
    if (tu.t >= tu.life || !tu.p.fighter) { tu.done = true; C.root.remove(tu.obj); C.vfx.smoke(tu.x, 0.5, tu.z, { n: 4, color: '#b8aec4', size: 0.2 }); }
  }
  C.turrets = C.turrets.filter((q) => !q.done);
}

// ---- spring traps: snap on the first foe that steps in
function trapMesh(C) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.08, 10), C.mat(0x6a6571)); base.position.y = 0.04;
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.05, 10), C.mat(0xd8a040)); plate.position.y = 0.11;
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, tooth = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.06), C.mat(0xe0e0ea)); tooth.position.set(Math.cos(a) * 0.32, 0.12, Math.sin(a) * 0.32); g.add(tooth); }
  g.add(base, plate);
  g.plate = plate;
  return g;
}

function addTrap(C, p, x, z, A, dm) {
  const q = { p, x, z, r: A.r, dmg: A.dmg * dm, launch: A.launch, stun: A.stun, t: 0, life: A.life, obj: trapMesh(C), again: p.fighter && p.fighter.mods.legend === 'clockheart' ? 1 : 0, arm: 0.35, root: (p.fighter && p.fighter.mods.trapRoot) || 0 };
  q.obj.position.set(x, 0, z);
  C.root.add(q.obj);
  (C.traps || (C.traps = [])).push(q);
  C.vfx.sparks(x, 0.2, z, { n: 5, color: '#d8a040', speed: 2 });
  return q;
}
function removeTrap(C, q) { q.done = true; C.root.remove(q.obj); }

function tickTraps(C, dt) {
  if (!C.traps || !C.traps.length) return;
  for (const q of C.traps) {
    q.t += dt; q.arm -= dt;
    q.obj.plate.position.y = 0.11 + Math.max(0, Math.sin(q.t * 4)) * 0.01;
    if (q.arm <= 0) for (const e of C.enemies) if (e.alive && e.hurtable && !e.def.flying && Math.hypot(e.x - q.x, e.z - q.z) < q.r + e.r * 0.8) { snapTrap(C, q); break; }
    if (q.t >= q.life || !q.p.fighter) removeTrap(C, q);
  }
  C.traps = C.traps.filter((q) => !q.done);
}

function snapTrap(C, q) {
  C.vfx.star(q.x, 0.4, q.z, { size: 1.6, kind: 'rays', color: '#ffd66b', life: 0.25 });
  C.vfx.sparks(q.x, 0.3, q.z, { n: 10, color: '#e0e0ea', speed: 5, up: 5 });
  audio.sfx('boing', { volume: 0.8 }); audio.sfx('snap', { volume: 0.5 });
  C.blast(q.x, q.z, q.r + 0.5, q.dmg, 2, { p: q.p, color: '#ffd66b', launch: q.root ? 0 : q.launch, stun: q.stun, root: q.root });
  if (q.p.fighter && q.p.fighter.mods.trapBoom) C.blast(q.x, q.z, 1.8, q.dmg * 0.5, 3, { p: q.p, boom: true, elem: 'fire', color: '#ff8a3a' });
  if (q.again > 0) { q.again--; q.arm = 1.2; } else removeTrap(C, q);
}

// ---- healing ground: the Gardener's clover (and her Grove)
function patchHeal(C, p, x, z, r, life, per = 0.03) {
  const m = new THREE.Mesh(C.geo.disc, new THREE.MeshBasicMaterial({ color: 0x8fd67a, transparent: true, opacity: 0.35, depthWrite: false }));
  m.scale.setScalar(r); m.position.set(x, 0.04, z);
  C.root.add(m);
  (C.heals || (C.heals = [])).push({ p, x, z, r, t: 0, life, per, m, tick: 0 });
}

function tickHeals(C, dt) {
  if (!C.heals || !C.heals.length) return;
  for (const h of C.heals) {
    h.t += dt; h.tick -= dt;
    h.m.material.opacity = 0.35 * (1 - h.t / h.life) + Math.sin(h.t * 6) * 0.04;
    if (Math.random() < dt * 5) C.vfx.bit('glow', h.x + rand(-h.r, h.r) * 0.7, 0.2, h.z + rand(-h.r, h.r) * 0.7, { vy: rand(0.5, 1), g: 0, drag: 0.5, life: 0.7, size: 0.06, s1: 0.01, color: '#b8f0a0' });
    if (h.tick <= 0) {
      h.tick = 0.5;
      for (const q of C.alivePlayers()) if (Math.hypot(q.pos.x - h.x, q.pos.z - h.z) < h.r + 0.3) { const g = q.fighter; g.hp = Math.min(g.maxHp, g.hp + g.maxHp * h.per * 0.5); }
      if (h.slow) for (const e of C.enemies) if (e.alive && Math.hypot(e.x - h.x, e.z - h.z) < h.r) applyStatus(C, e, { root: 0.3, p: h.p });
    }
    if (h.t >= h.life) { h.done = true; C.root.remove(h.m); }
  }
  C.heals = C.heals.filter((h) => !h.done);
}

// ------------------------------------------------------------------ the ultimates
export const ULT9 = new Set(['lighthouse', 'dawn', 'wisps', 'grove', 'brambles', 'pumpkin', 'feast', 'tornado', 'rush', 'teaparty', 'springfield', 'steamsuit']);

export function ultimate(C, p, id, dm) {
  const f = p.fighter, a = p.actor, V = C.vfx, x = a.pos.x, z = a.pos.z;
  const near = (r) => C.enemies.filter((e) => e.alive && e.hurtable && Math.hypot(e.x - x, e.z - z) < r + e.r);
  switch (id) {
    // ---- the Lamplighter
    case 'lighthouse':
      // a great beam of light sweeps round and round you
      f.lighthouse = { t: 6, ang: Math.atan2(a.dir.z, a.dir.x), hit: new Map() }; f.ultOn = 6.5;
      f.lighthouseLight = { x, y: 2.2, z, color: 0xfff0b0, power: 3, dist: 12, lamp: true };
      if (C.party.lighting) C.party.lighting.sources.push(f.lighthouseLight);
      break;
    case 'dawn': {
      // dawn breaks: every gloom around is blinded, and glows
      V.flash(x, 2, z, { r: 10, color: '#fffbe8', life: 0.6 });
      V.shockwave(x, z, { r: 9, color: '#fff3c4', life: 0.8, wall: 2 });
      V.light(x, 3, z, { color: '#fff8e0', power: 4, life: 1.2, dist: 14 });
      for (const e of near(9)) {
        applyStatus(C, e, { blind: 4, lit: 8, p });
        if (e.def.boss) e.stun = Math.max(e.stun, 1.2);
        C.hurtEnemy(e, 14 * dm, { p, dir: norm(e.x - x, e.z - z), knock: 2, kind: 'aoe', quiet: true, noCombo: true });
      }
      audio.sfx('chime', { volume: 0.9 });
      break;
    }
    case 'wisps':
      f.wisps = { n: 8, next: 0.1 }; f.ultOn = 3;
      break;
    // ---- the Gardener
    case 'grove': {
      const h = { p, x, z, r: 5, t: 0, life: 6, per: 0.1, tick: 0, slow: true };
      h.m = new THREE.Mesh(C.geo.disc, new THREE.MeshBasicMaterial({ color: 0x8fd67a, transparent: true, opacity: 0.35, depthWrite: false }));
      h.m.scale.setScalar(h.r); h.m.position.set(x, 0.04, z); C.root.add(h.m);
      (C.heals || (C.heals = [])).push(h);
      V.pillar(x, z, { r: 1.2, h: 6, color: '#b8f0a0', life: 1 });
      for (let i = 0; i < 16; i++) { const g = (i / 16) * Math.PI * 2; V.bit('shard', x + Math.cos(g) * 4.6, 0.3, z + Math.sin(g) * 4.6, { vy: rand(2, 3), g: 3, life: 1, size: 0.1, color: i % 3 ? '#ffb3cf' : '#fff3a6' }); }
      audio.sfx('song', { volume: 0.6 });
      break;
    }
    case 'brambles': {
      for (let i = 0; i < 3; i++) V.later(i * 0.15, () => vineBurst(C, x, z, 2 + i * 2));
      for (const e of near(6.5)) { applyStatus(C, e, { root: 3.5, p }); C.hurtEnemy(e, 18 * dm, { p, dir: norm(e.x - x, e.z - z), knock: 0.5, kind: 'aoe', quiet: true, elem: 'poison' }); }
      audio.sfx('thud', { volume: 0.9 });
      break;
    }
    case 'pumpkin':
      addMinion(C, p, x + a.dir.x * 1.8, z + a.dir.z * 1.8, 'pumpkin', { life: 8, dmg: 24 * dm, every: 1, speed: 3, heal: 0.25 });
      audio.sfx('stomp', { volume: 0.8 });
      break;
    // ---- the Cook
    case 'feast': {
      for (const q of C.players) {
        const g = q.fighter;
        if (!g || !q.connected) continue;
        if (g.down) C.revive(q, 0.6, p); else g.hp = Math.min(g.maxHp, g.hp + g.maxHp * 0.6);
        g.buff = Math.max(g.buffT > 0 ? g.buff : 0, 0.25); g.buffT = Math.max(g.buffT, 8);
        V.pillar(q.pos.x, q.pos.z, { r: 0.8, h: 5, color: '#ffb3bf', life: 1 });
        C.popText(q.pos.x, 2.2, q.pos.z, t('Delicious!'), '#ffb3bf');
      }
      for (let i = 0; i < 4; i++) C.drop(i % 2 ? 'tart' : 'coffee', x + rand(-1.5, 1.5), z + rand(-1.5, 1.5));
      audio.sfx('fanfare', { volume: 0.5 });
      break;
    }
    case 'tornado':
      if (f.spinFx) f.spinFx.end();
      f.spin = { t: 4, next: 0, ult: true, def: { r: 1.3, dmg: 7, every: 0.22, knock: 2, move: 1.2, elem: 'fire' } }; f.ultOn = 4.5; f.speedT = Math.max(f.speedT, 4);
      f.spinFx = V.whirl(() => ({ x: p.pos.x, y: (a.baseY || 0) + a.jumpY, z: p.pos.z }), { r: 2.4, color: '#ff8a3a', life: 4, speed: 20 });
      break;
    case 'rush':
      f.rush = 5; f.ultOn = 5.5; f.hasteT = Math.max(f.hasteT || 0, 5);
      V.star(x, 1.3, z, { size: 2, kind: 'rays', color: '#ff8a3a', life: 0.5, spin: 3 });
      break;
    // ---- the Tinkerer
    case 'teaparty':
      for (let i = 0; i < 3; i++) { const g = (i / 3) * Math.PI * 2 + 0.5; addTurret(C, p, x + Math.cos(g) * 1.8, z + Math.sin(g) * 1.8, { life: 8, every: 0.4, dmg: 9 * dm, range: 8, speed: 11, big: true }); }
      break;
    case 'springfield':
      for (let i = 0; i < 8; i++) { const g = (i / 8) * Math.PI * 2, d = 2 + (i % 2) * 1.4; addTrap(C, p, x + Math.cos(g) * d, z + Math.sin(g) * d, { r: 0.9, dmg: 22, launch: 7, stun: 1.2, life: 12 }, dm); }
      audio.sfx('tick', { volume: 0.8 });
      break;
    case 'steamsuit':
      f.steam = 8; f.ultOn = 8.5;
      C.shieldUp(p, f.maxHp * 0.5, 8);
      V.smoke(x, 0.8, z, { n: 8, color: '#ffffff', size: 0.3 });
      audio.sfx('steam', { volume: 0.9 }); audio.sfx('clank', { volume: 0.6 });
      break;
    default: return false;
  }
  return true;
}

// the ultimates that last a while
function tickUlt(C, p, dt) {
  const f = p.fighter, a = p.actor, V = C.vfx;
  if (f.lighthouse) {
    const L = f.lighthouse;
    L.t -= dt; L.ang += dt * 2.2;
    if (f.lighthouseLight) { f.lighthouseLight.x = p.pos.x; f.lighthouseLight.z = p.pos.z; }
    const len = 8, dx = Math.cos(L.ang), dz = Math.sin(L.ang);
    if (Math.random() < dt * 30) { const d = rand(0.5, len); V.bit('glow', p.pos.x + dx * d, 1 + rand(-0.2, 0.3), p.pos.z + dz * d, { vy: 0.2, g: 0, drag: 1, life: 0.25, size: 0.12, s1: 0.04, color: '#fff3c4' }); }
    V.trailLine({ x: p.pos.x, y: 1.1, z: p.pos.z }, { x: p.pos.x + dx * len, y: 1.1, z: p.pos.z + dz * len }, { color: '#fff0b0', size: 0.18, life: 0.08 }, 0.6);
    for (const e of C.enemies) {
      if (!e.alive || !e.hurtable) continue;
      const ex = e.x - p.pos.x, ez = e.z - p.pos.z, along = ex * dx + ez * dz, across = Math.abs(ex * dz - ez * dx);
      if (along < 0 || along > len || across > 0.8 + e.r) continue;
      const last = L.hit.get(e) || -9;
      if (L.t < last - 0.5 || last === -9) { L.hit.set(e, L.t); applyStatus(C, e, { blind: 2, lit: 4, p }); C.hurtEnemy(e, 10 * C.dmgMul(p), { p, dir: norm(ex, ez), knock: 1, kind: 'aoe', quiet: true, noCombo: true }); }
    }
    for (const q of C.alivePlayers()) if (Math.hypot(q.pos.x - p.pos.x, q.pos.z - p.pos.z) < 3) q.fighter.hp = Math.min(q.fighter.maxHp, q.fighter.hp + q.fighter.maxHp * 0.04 * dt);
    if (L.t <= 0) { f.lighthouse = null; if (f.lighthouseLight && C.party.lighting) { const S = C.party.lighting.sources, i = S.indexOf(f.lighthouseLight); if (i >= 0) S.splice(i, 1); } f.lighthouseLight = null; }
  }
  if (f.wisps) {
    f.wisps.next -= dt;
    if (f.wisps.next <= 0 && f.wisps.n > 0) {
      f.wisps.next = 0.18; f.wisps.n--;
      const g = rand(0, Math.PI * 2);
      C.fire(p, { kind: 'shot', dmg: 16, speed: 7, r: 0.3, life: 2.2, homing: 8, pierce: 1, look: 'wisp', elem: 'fire', knock: 1.5 }, C.dmgMul(p), { x: Math.cos(g), z: Math.sin(g) });
      audio.sfx('sparkle', { volume: 0.35 });
    }
    if (f.wisps.n <= 0) f.wisps = null;
  }
  if (f.rush > 0) { f.rush -= dt; if (Math.random() < dt * 12) V.trail(p.pos.x, 0.8, p.pos.z, { color: '#ff8a3a', size: 0.2, life: 0.25 }); }
  if (f.steam > 0) {
    f.steam -= dt;
    if (Math.random() < dt * 10) V.smoke(p.pos.x + rand(-0.3, 0.3), 1.3, p.pos.z + rand(-0.3, 0.3), { n: 1, color: '#ffffff', size: 0.16, rise: 1, life: 0.7 });
  }
}

// the damage & crit a lasting ultimate gives (Rush Hour: every hit crits; Steam Suit: armour)
export const rushCrit = (p) => !!(p && p.fighter && p.fighter.rush > 0);
export const steamArmor = (p) => (p && p.fighter && p.fighter.steam > 0 ? 0.6 : 0);
