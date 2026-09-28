// The big world's bosses, one lair per wild zone. Each has three phases (at
// two thirds and one third of its health) and every attack is announced —
// a line, a circle, a ring or a cone glows before it lands:
//   The Sand Queen   (Sunscorch Dunes)  erupts along fanned lines, sand geysers,
//                                        burrowers; last phase she sucks you in
//   The Frost Colossus (glacier)         ice armour (break it: its core shows),
//                                        slams, rolling snowballs, rings of spikes
//   The Frog King    (Croakmire)         royal leaps, tongue grabs, frog guards,
//                                        poison puddles and a royal belch
//   The Magma Golem  (Emberpeak)         lava fissures, fireballs, meteor rain;
//                                        last phase its plates fall off and a
//                                        flame beam sweeps round (jump it!)

import { THREE } from '../../render/r3d.js';
import { t } from '../../i18n.js';
import { toward, speedOf, lob, hazard } from './ai.js';
import { applyToPlayer } from './status.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const BOSS_ENEMIES = {
  sandqueen: { name: 'Sand Queen', title: 'The Sand Queen', hp: 1250, speed: 2.6, r: 1.2, h: 1.8, dmg: 26, xp: 260, cost: 99, boss: true, knockRes: 1 },
  colossus: { name: 'Frost Colossus', title: 'The Frost Colossus', hp: 1450, speed: 1.3, r: 1.3, h: 3.2, dmg: 28, xp: 280, cost: 99, boss: true, knockRes: 1, shield: 220, shieldAll: true },
  frogking: { name: 'Frog King', title: 'The Frog King', hp: 1250, speed: 1.6, r: 1.2, h: 2.0, dmg: 24, xp: 240, cost: 99, boss: true, knockRes: 1, elem: 'poison' },
  golem: { name: 'Magma Golem', title: 'The Magma Golem', hp: 1450, speed: 1.4, r: 1.3, h: 3.0, dmg: 30, xp: 300, cost: 99, boss: true, knockRes: 1, armorPts: 0.3, elem: 'fire' },
};

// ------------------------------------------------------------------ models
const mats = new Map();
function mat(r3d, c, e = null, ei = 1) {
  const k = c + '|' + e + '|' + ei;
  if (!mats.has(k)) mats.set(k, new THREE.MeshToonMaterial({ color: c, emissive: e || 0x000000, emissiveIntensity: e ? ei : 1, gradientMap: r3d.gradient }));
  return mats.get(k);
}
function own(g) { g.traverse((m) => { if (m.isMesh) m.material = m.material.clone(); }); return g; }
function box(g, w, h, d, m, x, y, z) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; g.add(b); return b; }
function ball(g, r, m, x, y, z, sx = 1, sy = 1, sz = 1) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), m); b.position.set(x, y, z); b.scale.set(sx, sy, sz); b.castShadow = true; g.add(b); return b; }
const grp = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

export const BOSS_MODELS = {
  sandqueen(r3d) {
    const g = new THREE.Group(), body = grp(g);
    const segs = [];
    for (let i = 0; i < 7; i++) {
      const s = grp(body, 0, 0, -i * 0.85);
      ball(s, 0.95 - i * 0.07, mat(r3d, i % 2 ? '#a07a5a' : '#b48a66'), 0, 0.8, 0, 1, 1, 0.85);
      box(s, 1.7 - i * 0.14, 0.12, 0.16, mat(r3d, '#6a4a3a'), 0, 0.85, 0.28);
      for (const sx of [-1, 1]) box(s, 0.12, 0.32, 0.12, mat(r3d, '#e8d8b0'), sx * (0.8 - i * 0.07), 0.9, 0);
      segs.push(s);
    }
    const head = grp(body, 0, 0.95, 0.75);
    box(head, 1.1, 1.1, 0.2, mat(r3d, '#3a1a2a'), 0, 0, 0);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const th = box(head, 0.12, 0.26, 0.12, mat(r3d, '#fbf6ec'), Math.cos(a) * 0.42, Math.sin(a) * 0.42, 0.1); th.rotation.z = a; }
    // her crown
    const crown = grp(body, 0, 1.85, 0.15);
    for (let i = 0; i < 7; i++) { const a = -1.2 + i * 0.4; const sp = box(crown, 0.14, 0.5 - Math.abs(i - 3) * 0.06, 0.14, mat(r3d, '#f2c14e', '#6a4a10', 0.6), Math.sin(a) * 0.6, 0.2, Math.cos(a) * 0.3 - 0.2); sp.rotation.z = -a * 0.4; }
    box(crown, 0.26, 0.26, 0.12, mat(r3d, '#b86aff', '#8a3aff', 1.2), 0, 0.18, 0.2);
    for (const sx of [-0.4, 0.4]) box(body, 0.2, 0.2, 0.1, mat(r3d, '#ff9aa8', '#ff3a5a', 1.3), sx, 1.45, 0.62);
    g.userData = { body, segs, head, crown };
    return own(g);
  },
  colossus(r3d) {
    const g = new THREE.Group(), body = grp(g);
    const ice = mat(r3d, '#9fd0f0'), iceD = mat(r3d, '#6aa8d8'), snow = mat(r3d, '#f4f8ff');
    const legs = [];
    for (const sx of [-0.5, 0.5]) { const l = grp(body, sx, 1.2, 0); box(l, 0.6, 1.2, 0.6, iceD, 0, -0.6, 0); box(l, 0.7, 0.25, 0.75, ice, 0, -1.1, 0.06); legs.push(l); }
    box(body, 1.8, 1.4, 1.1, ice, 0, 1.9, 0);
    box(body, 1.9, 0.3, 1.2, snow, 0, 2.66, 0);
    const core = box(body, 0.5, 0.5, 0.2, mat(r3d, '#dff8ff', '#3ad8ff', 1.4), 0, 1.95, 0.56);
    const head = grp(body, 0, 2.95, 0.05);
    box(head, 0.9, 0.7, 0.8, ice, 0, 0.2, 0);
    box(head, 1.0, 0.18, 0.9, snow, 0, 0.58, 0);
    for (const sx of [-0.2, 0.2]) box(head, 0.16, 0.12, 0.05, mat(r3d, '#dff8ff', '#6ae0ff', 1.5), sx, 0.25, 0.41);
    for (const [x, z] of [[-0.6, 0.3], [0.7, -0.2], [0.2, 0.45]]) { const sp = box(body, 0.2, 0.6, 0.2, mat(r3d, '#dff4ff'), x, 2.9, z); sp.rotation.z = x * 0.5; }
    const arms = [];
    for (const sx of [-1, 1]) { const a = grp(body, sx * 1.15, 2.4, 0); box(a, 0.5, 1.4, 0.55, iceD, 0, -0.6, 0); box(a, 0.8, 0.7, 0.8, ice, 0, -1.4, 0.05); arms.push(a); }
    g.userData = { body, legs, arms, head, core };
    return own(g);
  },
  frogking(r3d) {
    const g = new THREE.Group(), body = grp(g);
    ball(body, 1.0, mat(r3d, '#5a8a3a'), 0, 0.8, 0, 1.2, 0.75, 1.05);
    ball(body, 0.75, mat(r3d, '#e8d88a'), 0, 0.62, 0.35, 1, 0.62, 0.72);
    for (const [x, z] of [[0.35, 0.1], [-0.4, -0.2], [0.1, -0.5], [-0.1, 0.35]]) box(body, 0.22, 0.05, 0.22, mat(r3d, '#3a6a2a'), x, 1.43, z);
    for (const sx of [-0.42, 0.42]) { ball(body, 0.26, mat(r3d, '#f4f0d8'), sx, 1.45, 0.42); box(body, 0.1, 0.2, 0.08, mat(r3d, '#241a2e'), sx, 1.46, 0.66); }
    box(body, 1.0, 0.06, 0.08, mat(r3d, '#2a3a24'), 0, 0.82, 0.98);
    // the royal cape and crown
    const cape = box(body, 1.6, 1.0, 0.1, mat(r3d, '#c8454f'), 0, 0.9, -0.95);
    box(body, 1.62, 0.12, 0.14, mat(r3d, '#f4efe4'), 0, 1.36, -0.95);
    const crown = grp(body, 0, 1.72, 0.1);
    box(crown, 0.8, 0.22, 0.6, mat(r3d, '#f2c14e', '#6a4a10', 0.6), 0, 0, 0);
    for (let i = 0; i < 5; i++) box(crown, 0.12, 0.24, 0.12, mat(r3d, '#f2c14e', '#6a4a10', 0.6), -0.32 + i * 0.16, 0.2, 0.24);
    box(crown, 0.14, 0.14, 0.08, mat(r3d, '#ef4a5a', '#8a1a2a', 0.8), 0, 0.02, 0.32);
    const scepter = grp(body, 1.15, 0.8, 0.4);
    box(scepter, 0.08, 1.4, 0.08, mat(r3d, '#c8864a'), 0, 0.2, 0);
    ball(scepter, 0.16, mat(r3d, '#b86aff', '#8a3aff', 1.2), 0, 0.95, 0);
    const legs = [];
    for (const sx of [-1, 1]) { const l = grp(body, sx * 0.9, 0.5, -0.4); box(l, 0.7, 0.4, 0.4, mat(r3d, '#4a7a30'), 0, -0.2, 0); legs.push(l); }
    const tongue = box(g, 0.2, 0.14, 1, mat(r3d, '#ef7a9a'), 0, 0.8, 0.9);
    tongue.visible = false;
    g.userData = { body, crown, cape, scepter, legs, tongue };
    return own(g);
  },
  golem(r3d) {
    const g = new THREE.Group(), body = grp(g);
    const rock = mat(r3d, '#3a3240'), rockD = mat(r3d, '#2a2430'), lava = mat(r3d, '#ffb040', '#ff6a1a', 1.5);
    const legs = [];
    for (const sx of [-0.55, 0.55]) { const l = grp(body, sx, 1.1, 0); box(l, 0.7, 1.1, 0.7, rockD, 0, -0.55, 0); box(l, 0.1, 0.6, 0.72, lava, 0, -0.5, 0); legs.push(l); }
    const core = box(body, 1.3, 1.2, 0.9, mat(r3d, '#ff8a3a', '#ff5a10', 1.2), 0, 1.8, 0);
    const plates = grp(body);
    box(plates, 1.9, 1.5, 1.2, rock, 0, 1.85, 0);
    for (const [x, y] of [[-0.5, 1.6], [0.4, 2.1], [0.1, 1.4]]) box(plates, 0.5, 0.06, 1.22, lava, x, y, 0);
    box(plates, 2.1, 0.4, 1.3, rockD, 0, 2.7, 0);
    const head = grp(body, 0, 3.05, 0.1);
    box(head, 0.8, 0.6, 0.7, rock, 0, 0.1, 0);
    for (const sx of [-0.18, 0.18]) box(head, 0.16, 0.1, 0.05, mat(r3d, '#fff0a0', '#ffd23a', 1.6), sx, 0.16, 0.36);
    box(head, 0.4, 0.06, 0.05, lava, 0, -0.06, 0.36);
    const arms = [];
    for (const sx of [-1, 1]) { const a = grp(body, sx * 1.25, 2.5, 0); box(a, 0.6, 1.3, 0.6, rock, 0, -0.55, 0); box(a, 0.95, 0.8, 0.9, rockD, 0, -1.35, 0.05); box(a, 0.97, 0.12, 0.92, lava, 0, -1.2, 0.05); arms.push(a); }
    g.userData = { body, legs, arms, head, plates, core };
    return own(g);
  },
};

// ------------------------------------------------------------------ telegraphs the bosses need
// a ring-shaped band (spikes erupting in a ring), a cone (the royal belch), a
// rotating beam — drawn flat on the ground, pulsing until they land
function flat(C, geo, x, z, color, life, rotY = 0) {
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide }));
  m.position.set(x, 0.045, z); m.rotation.y = rotY;
  C.root.add(m);
  C.fxMeshes.push({ m, t: life, life, line: true });
  return m;
}
function band(C, x, z, r, life) { return flat(C, new THREE.RingGeometry(Math.max(0.1, r - 0.7), r + 0.7, 40).rotateX(-Math.PI / 2), x, z, 0x9fdcff, life); }
function cone(C, x, z, dir, len, spread, life, color = 0x8fdc5a) {
  const geo = new THREE.CircleGeometry(len, 20, -spread / 2, spread).rotateX(-Math.PI / 2);
  return flat(C, geo, x, z, color, life, Math.atan2(-dir.z, dir.x));
}
// after a delay, something happens (a boss's scheduled blows)
function later(e, secs, fn) { (e.later || (e.later = [])).push({ t: secs, fn }); }
function tickLater(e, dt) { if (!e.later) return; for (const q of e.later) { q.t -= dt; if (q.t <= 0) { q.done = true; q.fn(); } } e.later = e.later.filter((q) => !q.done); }

function hurtIn(C, e, test, dmg, { knock = 3, launch = 0, elem = null } = {}) {
  for (const p of C.alivePlayers()) {
    if (!test(p)) continue;
    const dx = p.pos.x - e.x, dz = p.pos.z - e.z;
    if (C.hurtPlayer(p, dmg, { dir: { x: dx, z: dz }, knock, src: e, elem }) !== 'parry' && launch) p.actor.jumpV = Math.max(p.actor.jumpV, launch);
  }
}

// phases at 2/3 and 1/3; a roar and a moment's pause between them
function phaseOf(e) { return e.hp > e.maxHp * 0.66 ? 1 : e.hp > e.maxHp * 0.33 ? 2 : 3; }
function checkPhase(e, C, onChange) {
  const ph = phaseOf(e);
  if (ph === (e.phase || 1)) return false;
  e.phase = ph;
  e.state = 'roar'; e.timer = 1.6;
  C.shakeAt(e, 0.6);
  C.sfx('growl', e); C.sfx('thunder', e);
  C.bubble(e, ph === 2 ? t('GRRR!') : t('ENOUGH!'), 1.6);
  if (onChange) onChange(ph);
  return true;
}
// bosses don't wander far from home
function leash(e, C) {
  if (!e.home) return;
  const dx = e.x - e.home.x, dz = e.z - e.home.z, d = Math.hypot(dx, dz);
  if (d > 12) { e.x = e.home.x + (dx / d) * 12; e.z = e.home.z + (dz / d) * 12; }
}

// ------------------------------------------------------------------ brains
export const BOSS_BRAINS = {
  sandqueen: {
    init(e) { e.state = 'under'; e.under = true; e.phase = 1; e.timer = 2; },
    think(e, dt, tgt, C) {
      tickLater(e, dt); leash(e, C);
      if (checkPhase(e, C, () => { e.under = false; })) return;
      if (!tgt) return;
      const sp = speedOf(e, C), u = e.obj.userData;
      if (e.state === 'roar') { if (e.timer <= 0) { e.state = 'under'; e.under = true; e.timer = 1.5; } return; }
      if (e.state === 'under') {
        e.under = true;
        const d = toward(e, C, tgt, sp * 1.3, dt, 2);
        if (Math.random() < dt * 25) C.world.fx.emit('dust', e.x + rand(-0.8, 0.8), 0.1, e.z + rand(-0.8, 0.8), 1, { color: '#c8a468' });
        if (e.timer <= 0) {
          if (e.phase >= 2 && Math.random() < 0.4) this.geysers(e, C);
          else if (d < 8) this.fan(e, C, tgt);
          else e.timer = 0.6;
        }
      } else if (e.state === 'fan') {
        if (e.timer <= 0) { e.state = 'erupt'; e.timer = 0.6; e.under = false; e.hitOnce.clear(); C.sfx('slam', e); C.shakeAt(e, 0.35); }
      } else if (e.state === 'erupt') {
        C.moveEnemy(e, e.aim.x * 9 * dt, e.aim.z * 9 * dt, false, true);
        for (const p of C.alivePlayers()) if (!e.hitOnce.has(p) && Math.hypot(p.pos.x - e.x, p.pos.z - e.z) < e.r + 0.6 && p.actor.jumpY < 0.9) { e.hitOnce.add(p); if (C.hurtPlayer(p, e.def.dmg, { dir: e.aim, knock: 4, src: e }) !== 'parry') p.actor.jumpV = 8.5; }
        if (Math.random() < dt * 40) C.world.fx.emit('dust', e.x, 0.4, e.z, 2, { color: '#d8b878' });
        if (e.timer <= 0) { e.state = 'dizzy'; e.timer = 1.6; e.stagger = 1.6; C.bubble(e, '@_@'); }
      } else if (e.state === 'dizzy') {
        if (e.timer <= 0) { e.state = 'surface'; e.timer = e.phase >= 3 ? 4 : 3.4; e.swept = false; }
      } else if (e.state === 'surface') {
        toward(e, C, tgt, 0, dt, 99);
        if (!e.swept && e.timer < 2) {
          // a tail sweep all round her
          e.swept = true;
          band(C, e.x, e.z, 2.4, 1.0);
          later(e, 1.0, () => { hurtIn(C, e, (p) => Math.abs(Math.hypot(p.pos.x - e.x, p.pos.z - e.z) - 2.4) < 0.9 && p.actor.jumpY < 0.7, e.def.dmg * 0.8, { knock: 5 }); C.vfx.shockwave(e.x, e.z, { r: 3.3, color: '#e0c088', life: 0.5, wall: 0.8 }); C.vfx.debris(e.x, e.z, { n: 14, r: 2.4, color: '#c8a468', speed: 4 }); C.sfx('whoosh', e); });
        }
        if (e.phase >= 3) {
          // she pulls everyone in; the middle hurts
          for (const p of C.alivePlayers()) { const dx = e.x - p.pos.x, dz = e.z - p.pos.z, d = Math.hypot(dx, dz); if (d < 9 && d > 0.5) C.world.overCol.move(p.actor.pos, (dx / d) * 1.5 * dt, (dz / d) * 1.5 * dt, p.actor.radius); }
          e.suckT = (e.suckT || 0) - dt;
          if (e.suckT <= 0) { e.suckT = 0.6; hurtIn(C, e, (p) => Math.hypot(p.pos.x - e.x, p.pos.z - e.z) < 2, e.def.dmg * 0.35, { knock: 1 }); }
          if (Math.random() < dt * 20) C.world.fx.emit('dust', e.x + rand(-3, 3), 0.2, e.z + rand(-3, 3), 1, { color: '#c8a468' });
        }
        if (e.timer <= 0) { e.state = 'under'; e.under = true; e.timer = rand(1.0, 1.6); this.summon(e, C); }
      }
      void u;
    },
    fan(e, C, tgt) {
      const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, l = Math.hypot(dx, dz) || 1;
      e.aim = { x: dx / l, z: dz / l };
      const base = Math.atan2(e.aim.z, e.aim.x);
      for (const k of [-0.5, 0.5]) {
        const a = base + k, dir = { x: Math.cos(a), z: Math.sin(a) };
        C.telegraphLine(e, dir, 9, 1.0);
        later(e, 1.0, () => { for (let s = 1; s <= 9; s += 1.5) { const x = e.x + dir.x * s, z = e.z + dir.z * s; C.vfx.later(s * 0.03, () => { C.vfx.shockwave(x, z, { r: 1, color: '#e0c088', life: 0.35, wall: 0.5 }); C.vfx.debris(x, z, { n: 4, r: 0.4, color: '#c8a468', up: 6 }); }); hurtIn(C, e, (p) => Math.hypot(p.pos.x - x, p.pos.z - z) < 0.9 && p.actor.jumpY < 0.7, e.def.dmg * 0.6, { knock: 3, launch: 7 }); } });
      }
      C.telegraphLine(e, e.aim, 9, 1.0);
      e.state = 'fan'; e.timer = 1.0;
      C.shakeAt(e, 0.2);
    },
    geysers(e, C) {
      const ps = C.alivePlayers();
      for (let i = 0; i < 3 + ps.length; i++) {
        const p = ps[i % ps.length];
        const x = p.pos.x + rand(-1.5, 1.5), z = p.pos.z + rand(-1.5, 1.5);
        C.telegraphCircle(x, z, 1.2, 0.9);
        later(e, 0.9 + i * 0.08, () => { C.vfx.shockwave(x, z, { r: 1.4, color: '#e0c088', life: 0.4, wall: 1.2 }); C.vfx.debris(x, z, { n: 9, r: 0.5, color: '#d8b878', up: 7, speed: 2 }); C.vfx.smoke(x, 0.4, z, { n: 3, color: '#e0c8a0', size: 0.18, rise: 1.4 }); hurtIn(C, e, (q) => Math.hypot(q.pos.x - x, q.pos.z - z) < 1.3 && q.actor.jumpY < 0.7, e.def.dmg * 0.55, { knock: 2, launch: 8 }); C.sfx('geyser', e); });
      }
      e.timer = 2;
    },
    summon(e, C) {
      if (e.phase < 2) return;
      const mine = C.enemies.filter((o) => o.alive && o.summoner === e).length;
      for (let i = mine; i < 4; i++) { const s = C.freeSpot(e.x, e.z, 4); if (s) { const o = C.spawn('burrower', s.x, s.z); o.summoner = e; } }
    },
    pose(e) {
      const u = e.obj.userData, under = e.under && e.state !== 'dizzy' && e.state !== 'surface';
      u.body.position.y = under ? (e.state === 'fan' ? -1.3 + Math.sin(e.t * 30) * 0.1 : -3) : e.state === 'erupt' ? 0.4 : 0;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      u.segs.forEach((s, i) => { s.position.y = Math.sin(e.t * 5 - i * 0.7) * 0.18; s.rotation.y = Math.sin(e.t * 2.5 - i * 0.5) * 0.18; });
      u.crown.rotation.y = e.state === 'roar' ? Math.sin(e.t * 20) * 0.2 : 0;
      e.shadow.visible = !under;
    },
  },

  colossus: {
    init(e) { e.phase = 1; e.shieldHp = e.def.shield * (e.hpK || 1); e.onShieldBreak = () => { e.exposed = 3.5; C0(e).bubble(e, t('My armour!'), 1.4); }; },
    think(e, dt, tgt, C) {
      tickLater(e, dt); leash(e, C);
      if (e.exposed > 0) e.exposed -= dt;
      if (checkPhase(e, C, (ph) => { e.shieldHp = e.def.shield * (e.hpK || 1) * (ph === 3 ? 0.6 : 1); if (ph >= 2) for (let i = 0; i < 2; i++) { const s = C.freeSpot(e.x, e.z, 4); if (s) C.spawn('wisp', s.x, s.z); } })) return;
      if (!tgt) return;
      const sp = speedOf(e, C) * (e.phase >= 3 ? 1.35 : 1);
      if (e.state === 'roar') { if (e.timer <= 0) { e.state = 'chase'; e.timer = 1; } return; }
      if (e.state === 'chase') {
        const d = toward(e, C, tgt, sp, dt, 2.4);
        if (e.timer <= 0) {
          const r = Math.random();
          if (d < 3.4) this.slam(e, C);
          else if (e.phase >= 2 && r < 0.45) this.spikes(e, C);
          else if (r < 0.75) this.snowballs(e, C, tgt);
          else e.timer = 0.8;
        }
      } else if (e.state === 'slam') {
        if (e.timer <= 0) { e.state = 'chase'; e.timer = rand(1.6, 2.4); }
      } else if (e.state === 'cast') {
        if (e.timer <= 0) { e.state = 'chase'; e.timer = rand(1.4, 2.2); }
      }
      // rolling snowballs
      for (const b of e.balls || []) {
        b.t += dt;
        if (b.t < 0) continue;
        if (!b.m) { b.m = C.shotMesh('snowball'); b.m.scale.setScalar(4.5); C.root.add(b.m); }
        b.x += b.dir.x * 7 * dt; b.z += b.dir.z * 7 * dt;
        b.m.position.set(b.x, 0.7, b.z); b.m.rotation.x += dt * 8;
        for (const p of C.alivePlayers()) if (!b.hit.has(p) && Math.hypot(p.pos.x - b.x, p.pos.z - b.z) < 1) { b.hit.add(p); C.hurtPlayer(p, e.def.dmg * 0.7, { dir: b.dir, knock: 5, src: e, elem: 'ice' }); }
        if (Math.random() < dt * 20) C.world.fx.emit('sparkle', b.x, 0.3, b.z, 1, { color: '#f4f8ff' });
        if (b.t > 2.6) { C.root.remove(b.m); b.done = true; C.vfx.sparks(b.x, 0.6, b.z, { n: 14, color: '#f4f8ff', kind: 'shard', speed: 3 }); }
      }
      if (e.balls) e.balls = e.balls.filter((b) => !b.done);
    },
    slam(e, C) {
      e.state = 'slam'; e.timer = 1.2;
      const hits = e.phase >= 3 ? 2 : 1;
      for (let k = 0; k < hits; k++) {
        const x = e.x + e.face.x * 1.6, z = e.z + e.face.z * 1.6;
        C.telegraphCircle(x, z, 3, 0.9 + k * 0.7);
        later(e, 0.9 + k * 0.7, () => { C.blast(x, z, 3, e.def.dmg, 5, { gloom: true, elem: 'ice', color: '#bfe8ff' }); C.shakeAt(e, 0.5); C.vfx.sparks(x, 0.4, z, { n: 16, color: '#dff4ff', kind: 'shard', speed: 4 }); });
      }
      e.arm = 1.0;
    },
    snowballs(e, C, tgt) {
      e.state = 'cast'; e.timer = 1.2; e.arm = 1.0;
      e.balls = e.balls || [];
      const base = Math.atan2(tgt.pos.z - e.z, tgt.pos.x - e.x);
      for (const k of [-0.45, 0, 0.45]) {
        const a = base + k, dir = { x: Math.cos(a), z: Math.sin(a) };
        C.telegraphLine({ x: e.x + dir.x * 1.5, z: e.z + dir.z * 1.5 }, dir, 16, 0.9);
        e.balls.push({ x: e.x + dir.x * 1.5, z: e.z + dir.z * 1.5, dir, t: -0.9, hit: new Set(), m: null });
      }
      C.sfx('growl', e);
    },
    spikes(e, C) {
      e.state = 'cast'; e.timer = 2.4; e.arm = 1.0;
      for (let i = 0; i < 3; i++) {
        const r = 2.2 + i * 2.1;
        later(e, i * 0.45, () => band(C, e.x, e.z, r, 0.8));
        later(e, 0.8 + i * 0.45, () => {
          C.vfx.shockwave(e.x, e.z, { r, color: '#9fdcff', life: 0.5, wall: 0.9 });
          for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; C.vfx.iceSpikes(e.x + Math.cos(a) * r, e.z + Math.sin(a) * r, { r: 0.4, n: 2, h: 0.9, life: 0.7 }); }
          hurtIn(C, e, (p) => Math.abs(Math.hypot(p.pos.x - e.x, p.pos.z - e.z) - r) < 0.8 && p.actor.jumpY < 0.7, e.def.dmg * 0.6, { knock: 2, launch: 7, elem: 'ice' });
          C.sfx('crackle', e);
        });
      }
    },
    pose(e) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      const walk = e.state === 'chase' ? Math.sin(e.t * 4) : 0;
      u.legs[0].rotation.x = walk * 0.4; u.legs[1].rotation.x = -walk * 0.4;
      if (e.arm > 0) e.arm = Math.max(0, e.arm - 1 / 60);
      const raise = e.arm > 0.4 ? -2.6 : e.arm > 0 ? -2.6 + (0.4 - e.arm) * 6 : 0;
      u.arms[0].rotation.x = raise || walk * 0.3; u.arms[1].rotation.x = raise || -walk * 0.3;
      u.core.scale.setScalar(e.exposed > 0 ? 1.3 + Math.sin(e.t * 12) * 0.1 : 1);
      u.body.position.y = e.state === 'roar' ? Math.sin(e.t * 30) * 0.05 : 0;
    },
  },

  frogking: {
    init(e) { e.phase = 1; e.timer = 1.5; },
    think(e, dt, tgt, C) {
      tickLater(e, dt); leash(e, C);
      if (checkPhase(e, C, (ph) => { this.guards(e, C, ph + 1); })) return;
      if (!tgt) return;
      const sp = speedOf(e, C), u = e.obj.userData;
      if (e.state === 'roar') { if (e.timer <= 0) { e.state = 'chase'; e.timer = 0.8; } return; }
      if (e.state === 'chase') {
        const d = toward(e, C, tgt, sp, dt, 3);
        if (e.timer <= 0) {
          const r = Math.random();
          if (e.phase >= 3 && r < 0.3) this.belch(e, C, tgt);
          else if (r < 0.55 || d > 7) this.leap(e, C, tgt, e.phase >= 3 ? 3 : 1);
          else this.tongue(e, C, tgt);
        }
      } else if (e.state === 'air') {
        const L = e.leap, k = Math.min(1, 1 - e.timer / L.dur);
        e.x = L.from.x + (L.to.x - L.from.x) * k; e.z = L.from.z + (L.to.z - L.from.z) * k;
        e.y = Math.sin(k * Math.PI) * 5;
        if (e.timer <= 0) {
          e.y = 0;
          C.blast(e.x, e.z, 2.6, e.def.dmg, 5, { gloom: true, color: '#8fdc5a' });
          C.shakeAt(e, 0.5); C.sfx('slam', e);
          C.world.fx.emit('splash', e.x, 0.3, e.z, 16);
          if (e.phase >= 2) hazard(C, { x: e.x, z: e.z, r: 1.6, life: 5, dmg: 4, elem: 'poison', color: 0x6ac03a });
          L.left--;
          if (L.left > 0 && C.alivePlayers().length) { const q = pick(C.alivePlayers()); this.leap(e, C, q, L.left, 0.7); }
          else { e.state = 'chase'; e.timer = rand(1.6, 2.4); }
        }
      } else if (e.state === 'aim') {
        e.face = e.aim;
        if (e.timer <= 0) { e.state = 'tongue'; e.timer = 0.4; e.grab = null; C.sfx('snap', e); }
      } else if (e.state === 'tongue') {
        const k = 1 - Math.max(0, e.timer) / 0.4, len = Math.sin(k * Math.PI) * 8;
        e.tongueLen = len;
        if (!e.grab) for (const p of C.alivePlayers()) {
          const px = p.pos.x - e.x, pz = p.pos.z - e.z, along = px * e.aim.x + pz * e.aim.z, across = Math.abs(-px * e.aim.z + pz * e.aim.x);
          if (along > 0.5 && along < len + 0.4 && across < 0.7 && p.actor.jumpY < 0.9) { if (C.hurtPlayer(p, e.def.dmg * 0.7, { dir: { x: -e.aim.x, z: -e.aim.z }, knock: 0.1, src: e }) !== 'parry') e.grab = p; break; }
        }
        if (e.grab) { const a = e.grab.actor; a.pos.x += (e.x + e.aim.x * 1.6 - a.pos.x) * Math.min(1, dt * 9); a.pos.z += (e.z + e.aim.z * 1.6 - a.pos.z) * Math.min(1, dt * 9); }
        if (e.timer <= 0) {
          e.tongueLen = 0;
          if (e.grab) { C.hurtPlayer(e.grab, e.def.dmg * 0.6, { dir: e.aim, knock: 6, src: e, elem: 'poison' }); C.popText(e.grab.pos.x, 2.4, e.grab.pos.z, t('Ptooey!'), '#8fdc5a'); }
          e.state = 'chase'; e.timer = rand(1.6, 2.4);
        }
      } else if (e.state === 'belch') {
        if (e.timer <= 0) {
          const dir = e.aim;
          hurtIn(C, e, (p) => { const dx = p.pos.x - e.x, dz = p.pos.z - e.z, d = Math.hypot(dx, dz); return d < 8 && (dx * dir.x + dz * dir.z) / (d || 1) > Math.cos(0.62); }, e.def.dmg * 0.8, { knock: 4, elem: 'poison' });
          for (let i = 0; i < 10; i++) { const s = rand(1, 7); C.vfx.smoke(e.x + dir.x * s + rand(-0.8, 0.8), 0.6, e.z + dir.z * s + rand(-0.8, 0.8), { n: 1, color: i % 2 ? '#8fdc5a' : '#5aa040', size: 0.2, rise: 0.4, life: 1 }); }
          C.sfx('croak', e); C.shakeAt(e, 0.3);
          e.state = 'chase'; e.timer = rand(1.6, 2.2);
        }
      }
      u.tongue.visible = (e.tongueLen || 0) > 0.05;
    },
    leap(e, C, tgt, count, dur = 1.2) {
      const to = { x: tgt.pos.x + (tgt.vel ? tgt.vel.x * 0.5 : 0), z: tgt.pos.z + (tgt.vel ? tgt.vel.z * 0.5 : 0) };
      if (e.home) { const dx = to.x - e.home.x, dz = to.z - e.home.z, d = Math.hypot(dx, dz); if (d > 11) { to.x = e.home.x + dx / d * 11; to.z = e.home.z + dz / d * 11; } }
      C.telegraphCircle(to.x, to.z, 2.6, dur);
      e.leap = { from: { x: e.x, z: e.z }, to, dur, left: count };
      e.state = 'air'; e.timer = dur;
      e.faceTo(to.x, to.z);
      C.sfx('boing', e);
    },
    tongue(e, C, tgt) {
      const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, l = Math.hypot(dx, dz) || 1;
      e.aim = { x: dx / l, z: dz / l };
      C.telegraphLine(e, e.aim, 8, 0.8);
      e.state = 'aim'; e.timer = 0.8;
      C.sfx('croak', e);
    },
    belch(e, C, tgt) {
      const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, l = Math.hypot(dx, dz) || 1;
      e.aim = { x: dx / l, z: dz / l };
      e.face = e.aim;
      cone(C, e.x, e.z, e.aim, 8, 1.25, 1.2);
      e.state = 'belch'; e.timer = 1.2;
      C.bubble(e, t('*BUUURP*'), 1.2);
    },
    guards(e, C, n) {
      for (let i = 0; i < n; i++) { const s = C.freeSpot(e.x, e.z, 4); if (s) C.spawn('toad', s.x, s.z); }
    },
    pose(e) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      const L = e.tongueLen || 0;
      u.tongue.scale.z = Math.max(0.01, L); u.tongue.position.z = 0.9 + L / 2;
      const air = e.state === 'air';
      for (const l of u.legs) l.rotation.x = air ? -0.9 : 0;
      u.body.scale.set(1, air ? 1.15 : e.state === 'belch' ? 1.12 : 1 + Math.abs(Math.sin(e.t * 3)) * 0.03, 1);
      u.cape.rotation.x = air ? 0.5 : Math.sin(e.t * 2) * 0.05;
      u.scepter.rotation.x = e.state === 'roar' ? -1.2 : 0;
    },
  },

  golem: {
    init(e) { e.phase = 1; e.timer = 1.5; },
    think(e, dt, tgt, C) {
      tickLater(e, dt); leash(e, C);
      if (checkPhase(e, C, (ph) => {
        if (ph === 3) { e.cracked = true; e.armorPts = 0; e.obj.userData.plates.visible = false; C.popText(e.x, 3.6, e.z, t('Its armour cracks!'), '#ffb040', true); C.vfx.debris(e.x, e.z, { n: 22, r: 1, color: '#3a3240', up: 6, speed: 4, size: 0.18 }); C.vfx.star(e.x, 2, e.z, { size: 2, kind: 'rays', color: '#ffb040', life: 0.4 }); C.shakeAt(e, 0.5); }
      })) return;
      if (!tgt) return;
      const sp = speedOf(e, C) * (e.cracked ? 1.4 : 1);
      if (e.state === 'roar') { if (e.timer <= 0) { e.state = 'chase'; e.timer = 1; } return; }
      if (e.state === 'chase') {
        toward(e, C, tgt, sp, dt, 2.6);
        if (e.timer <= 0) {
          const r = Math.random();
          if (e.phase >= 3 && r < 0.35) this.beam(e, C, tgt);
          else if (e.phase >= 2 && r < 0.6) this.meteors(e, C);
          else if (r < 0.75) this.fissures(e, C, tgt);
          else this.fireballs(e, C);
        }
      } else if (e.state === 'cast') {
        if (e.timer <= 0) { e.state = 'chase'; e.timer = rand(1.4, 2.2); }
      } else if (e.state === 'beam') {
        const B = e.beamS;
        B.t += dt;
        if (B.t > 0.8) {
          B.a += dt * 1.6 * B.dir;
          const dir = { x: Math.cos(B.a), z: Math.sin(B.a) };
          B.mesh.rotation.y = Math.atan2(-dir.z, dir.x);
          B.mesh.material.opacity = 0.85;
          for (const p of C.alivePlayers()) {
            if ((B.hit.get(p) || 0) > B.t) continue;
            const px = p.pos.x - e.x, pz = p.pos.z - e.z, along = px * dir.x + pz * dir.z, across = Math.abs(-px * dir.z + pz * dir.x);
            if (along > 0.5 && along < 8.5 && across < 0.55 && p.actor.jumpY < 0.5) { B.hit.set(p, B.t + 0.7); C.hurtPlayer(p, e.def.dmg * 0.5, { dir: { x: -dir.z * B.dir, z: dir.x * B.dir }, knock: 3, src: e, elem: 'fire' }); }
          }
          if (Math.random() < dt * 30) { const s = rand(1, 8); C.world.fx.emit('sparkle', e.x + dir.x * s, 0.5, e.z + dir.z * s, 1, { color: '#ffb040' }); }
        } else B.mesh.material.opacity = 0.25 + Math.sin(B.t * 30) * 0.2;
        if (B.t > 4.8) { C.root.remove(B.mesh); e.beamS = null; e.state = 'chase'; e.timer = rand(1.6, 2.4); }
      }
    },
    fissures(e, C, tgt) {
      e.state = 'cast'; e.timer = 1.6; e.arm = 1;
      const base = Math.atan2(tgt.pos.z - e.z, tgt.pos.x - e.x);
      for (const k of [-0.55, 0, 0.55]) {
        const a = base + k, dir = { x: Math.cos(a), z: Math.sin(a) };
        C.telegraphLine(e, dir, 9, 1.0);
        later(e, 1.0, () => {
          for (let s = 1; s <= 9; s += 1.2) { const x = e.x + dir.x * s, z = e.z + dir.z * s; C.vfx.later(s * 0.035, () => C.vfx.fireColumn(x, z, { r: 0.55, h: 1.8, life: 0.7 })); hazard(C, { x, z, r: 0.6, life: 3, dmg: 4, elem: 'fire', color: 0xff6a1a }); hurtIn(C, e, (p) => Math.hypot(p.pos.x - x, p.pos.z - z) < 0.8 && p.actor.jumpY < 0.6, e.def.dmg * 0.6, { knock: 3, elem: 'fire', launch: 6 }); }
          C.shakeAt(e, 0.4); C.sfx('boom', e);
        });
      }
    },
    fireballs(e, C) {
      e.state = 'cast'; e.timer = 1.2; e.arm = 1;
      const ps = C.alivePlayers();
      for (let i = 0; i < (e.phase >= 2 ? 5 : 3); i++) { const p = ps[i % ps.length]; if (p) lob(C, e, { x: p.pos.x + rand(-1, 1), z: p.pos.z + rand(-1, 1) }, { r: 1.4, dmg: e.def.dmg * 0.6, t: 1.1 + i * 0.12, elem: 'fire', look: 'lava' }); }
      C.sfx('charge', e);
    },
    meteors(e, C) {
      e.state = 'cast'; e.timer = 2.2; e.arm = 1;
      const ps = C.alivePlayers();
      for (let i = 0; i < 6 + ps.length * 2; i++) {
        const p = ps[i % ps.length], x = p.pos.x + rand(-3, 3), z = p.pos.z + rand(-3, 3);
        C.zone({ x, z, r: 1.2, delay: 1.2 + i * 0.1, dmg: e.def.dmg * 0.55 * (C.enemyDmg || 1), knock: 3, kind: 'bomb', gloom: true, elem: 'fire', arc: { x: x + 4, y: 14, z: z - 4 }, look: 'lava' });
      }
      C.bubble(e, t('RUMBLE…'), 1.2);
      C.sfx('thunder', e);
    },
    beam(e, C, tgt) {
      const a = Math.atan2(tgt.pos.z - e.z, tgt.pos.x - e.x);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.9).translate(4.5, 0, 0).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff8a3a, transparent: true, opacity: 0.3, depthWrite: false }));
      mesh.position.set(e.x, 0.12, e.z);
      mesh.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a));
      C.root.add(mesh);
      e.beamS = { t: 0, a, dir: Math.random() < 0.5 ? 1 : -1, mesh, hit: new Map() };
      e.state = 'beam';
      C.bubble(e, t('Jump the flame!'), 1.2);
      C.sfx('charge', e);
    },
    pose(e) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      const walk = e.state === 'chase' ? Math.sin(e.t * 4.5) : 0;
      u.legs[0].rotation.x = walk * 0.4; u.legs[1].rotation.x = -walk * 0.4;
      if (e.arm > 0) e.arm = Math.max(0, e.arm - 1 / 60);
      const raise = e.arm > 0.5 ? -2.4 : e.arm > 0 ? -2.4 + (0.5 - e.arm) * 5 : 0;
      u.arms[0].rotation.x = raise || walk * 0.3; u.arms[1].rotation.x = raise || -walk * 0.3;
      if (e.state === 'beam') { u.arms[0].rotation.z = 1.4; u.arms[1].rotation.z = -1.4; } else { u.arms[0].rotation.z = 0; u.arms[1].rotation.z = 0; }
      u.core.scale.setScalar(e.cracked ? 1.08 + Math.sin(e.t * 10) * 0.06 : 1);
      if (e.beamS) e.beamS.mesh.position.set(e.x, 0.12, e.z);
    },
    onDeath(e, C) { if (e.beamS) { C.root.remove(e.beamS.mesh); e.beamS = null; } for (const b of e.balls || []) if (b.m) C.root.remove(b.m); },
  },
};
BOSS_BRAINS.colossus.onDeath = (e, C) => { for (const b of e.balls || []) if (b.m) C.root.remove(b.m); e.balls = []; };

// the colossus' shield-break callback needs the combat it lives in
function C0(e) { return e.combat; }

// (the Tyrant King, Dino Isle's guardian, lives in v5/tyrant.js and shares these)
export { flat, cone, later, tickLater, hurtIn, checkPhase, leash };

// armour: the golem's cracks in the last phase, the colossus' exposed core,
// the Tyrant King dizzy after ramming a rock
export function bossDamageMul(e) {
  if (e.type === 'colossus' && e.exposed > 0) return 1.5;
  if (e.type === 'rex' && e.dizzy > 0) return 1.5;
  if (e.type === 'golem' && e.cracked) return 1.15;
  if ((e.type === 'snuffbot' || e.type === 'barkbeard') && e.exposed > 0) return 1.5;
  if (e.type === 'grumbleclaw') return e.lamps > 0 ? 0.5 : e.exposed > 0 ? 1.5 : 1;   // (his gloom lanterns shield him)
  if ((e.type === 'drillosaur' || e.type === 'tenor') && e.exposed > 0) return 1.6;
  if (e.type === 'brick' && e.dizzy > 0) return 1.8;          // (the Human Cannonball, seeing stars)
  if (e.type === 'kraken' && e.state === 'stranded') return 2;  // (the Gloom Kraken, high and dry)
  if (e.type === 'diva' && e.fright > 0) return 2;             // (the Duchess, and a hen)
  if (e.type === 'paperdragon' && e.burn > 0) return 2;       // (Old Lucky, caught in the dawn)
  if (e.type === 'snuffbot3' && e.exposed > 0) return 1.5;    // (Mk III, its dome overheating)
  if (e.type === 'grandiva' && (e.dazzle > 0 || e.fright > 0)) return 2;   // (the Finale: the Spotlight shattered)
  return 1;
}
