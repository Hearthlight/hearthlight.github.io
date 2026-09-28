// World v7, chapter 10: aboard the Gloomstage — the last of the Duchess’s people, and the
// Duchess herself in her Grand Finale.
//   stagehand   black-clad stagehands (the spotlights call them): they hurry up, swing a
//               sandbag round in a marked arc.
//   snuffbot3   Crumble’s Snuffbot Mk III, at last with moves of its own: snuffer-caps
//               dropped on marked circles (whoever’s caught is trapped under a cap until a
//               friend comes to lift it, or three hops knock it off), a wax flood (rings
//               spreading out — jump them), then its pilot dome overheats (×1.5).
//   grandiva    the Duchess, in her Grand Finale — three acts. Act I: her aria, the Grand
//               Snuffer’s rings, her follow-spot (from her Debut). Act II: the stage
//               machinery — trapdoors open on marked squares (fall in: a bump, and back up),
//               sandbags drop on marked circles, and (Release v9) painted flats slide across
//               the stage down marked lanes — a castle, a forest, a moonlit sea: out of the
//               lane, or be swept along with the scenery. Act III: the Umbral Spotlight, lit with
//               every stolen flame, sweeps the stage in a wedge of darkness; while it shines
//               nothing touches her — the Lantern Cannon (the room’s script) shatters it for
//               a while (she’s dazzled, ×2). At the end of her strength she stops (`e.onEnd`):
//               the chapter takes it from there.
// Every blow is shown before it lands.

import { THREE } from '../../render/r3d.js';
import { toward, hover, speedOf, lob } from '../v3/ai.js';
import { flat, cone, later, tickLater, hurtIn, checkPhase, leash } from '../v3/bosses.js';
import { TROUPE_MODELS } from './troupe.js';
import { DUCHESS_MODELS, DUCHESS_BRAINS } from './duchess.js';
import { t } from '../../i18n.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const DIVA = DUCHESS_BRAINS.diva;

export const FINALE_ENEMIES = {
  stagehand: { name: 'Stagehand', hp: 150, speed: 2.6, r: 0.38, h: 1.4, dmg: 20, xp: 24, cost: 4, knockRes: 0.4 },
  snuffbot3: { name: 'Snuffbot Mk III', title: 'Crumble’s Snuffbot Mk III', hp: 5200, speed: 1.4, r: 1.3, h: 3.0, dmg: 26, xp: 900, cost: 99, boss: true, knockRes: 1, elem: 'fire' },
  grandiva: { name: 'the Duchess', title: 'Duchess Gloria Gloomsworth, in her Grand Finale', hp: 12000, speed: 1.9, r: 1.0, h: 3.4, dmg: 28, xp: 2000, cost: 99, boss: true, knockRes: 1 },
};

// ------------------------------------------------------------------ models
const mats = new Map();
function mat(r3d, c, e = null, ei = 1) {
  const k = c + '|' + e + '|' + ei;
  if (!mats.has(k)) mats.set(k, new THREE.MeshToonMaterial({ color: c, emissive: e || 0x000000, emissiveIntensity: e ? ei : 1, gradientMap: r3d.gradient }));
  return mats.get(k);
}
function own(g) { g.traverse((m) => { if (m.isMesh) m.material = Array.isArray(m.material) ? m.material.map((q) => q.clone()) : m.material.clone(); }); return g; }
function box(g, w, h, d, m, x, y, z) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; g.add(b); return b; }
function cyl(g, rt, rb, h, m, x, y, z, n = 10) { const b = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, n), m); b.position.set(x, y, z); b.castShadow = true; g.add(b); return b; }
function ball(g, r, m, x, y, z) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), m); b.position.set(x, y, z); b.castShadow = true; g.add(b); return b; }
const grp = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

export const FINALE_MODELS = {
  // a stagehand: all in black, a flat cap, a sandbag on a rope
  stagehand(r3d) {
    const g = new THREE.Group(), body = grp(g);
    const black = mat(r3d, '#1e1a24'), skin = mat(r3d, '#d5c2ee'), eye = mat(r3d, '#e8d0ff', '#a86ae0', 1.4), sand = mat(r3d, '#a89060');
    const legs = [];
    for (const s of [-1, 1]) { const L = grp(body, s * 0.13, 0.45, 0); box(L, 0.16, 0.45, 0.18, black, 0, -0.22, 0); legs.push(L); }
    box(body, 0.5, 0.5, 0.32, black, 0, 0.72, 0);
    const head = grp(body, 0, 1.18, 0);
    box(head, 0.42, 0.4, 0.4, skin, 0, 0, 0);
    box(head, 0.46, 0.12, 0.5, black, 0, 0.2, 0.04);
    for (const s of [-1, 1]) box(head, 0.07, 0.05, 0.02, eye, s * 0.1, 0, 0.205);
    const arm = grp(body, 0.32, 0.9, 0);
    box(arm, 0.12, 0.42, 0.12, black, 0, -0.2, 0);
    const rope = grp(arm, 0, -0.42, 0);
    box(rope, 0.03, 0.5, 0.03, mat(r3d, '#c8b890'), 0, -0.25, 0);
    const bag = ball(rope, 0.2, sand, 0, -0.55, 0); bag.scale.y = 1.3;
    g.userData = { body, legs, arm, rope };
    return own(g);
  },
  // Mk III: the Snuffbot, bigger, silvered, a crown of candles and a cap-launcher on its back
  snuffbot3(r3d) {
    const g = TROUPE_MODELS.snuffbot(r3d);
    g.userData.body.scale.setScalar(1.2);
    g.traverse((m) => { if (m.isMesh && m.material && m.material.color && m.material.color.getHexString() === 'c8983e') { m.material.color.set('#b8b8c8'); } });
    const u = g.userData, crown = grp(u.torso, 0, 0.72, 0);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; cyl(crown, 0.07, 0.07, 0.3, mat(r3d, '#f4ecd8'), Math.cos(a) * 0.7, 0.15, Math.sin(a) * 0.7, 6); ball(crown, 0.07, mat(r3d, '#ffd66b', '#ffb040', 1.6), Math.cos(a) * 0.7, 0.36, Math.sin(a) * 0.7); }
    const launcher = grp(u.torso, 0, 0.4, -0.95);
    cyl(launcher, 0.3, 0.3, 0.6, mat(r3d, '#4a4452'), 0, 0, 0, 10).rotation.x = -0.6;
    u.crown = crown; u.launcher = launcher;
    return g;
  },
  // the Duchess, in her finale gown, and the stolen flames orbiting her
  grandiva(r3d) {
    const g = DUCHESS_MODELS.diva(r3d);
    g.userData.body.scale.setScalar(1.55);
    const flames = [];
    for (const [i, c] of ['#ffd66b', '#8fd6b4', '#9fd8ff', '#ff9a6a', '#c8a8ff', '#ffe08a', '#b8f0a0'].entries()) {
      const f = ball(g, 0.18, mat(r3d, c, c, 0.8), 0, 3, 0); f.userData.k = i; f.castShadow = false; flames.push(f);
    }
    g.userData.flames = flames;
    return g;
  },
};

// a snuffer-cap over a hero: they’re stuck until a friend lifts it, or three hops knock it off
function capOver(C, p, life, onFree) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.6, 12, 1, true), new THREE.MeshToonMaterial({ color: '#b8b8c8', side: THREE.DoubleSide }));
  m.position.set(p.pos.x, 0.8, p.pos.z);
  C.root.add(m);
  p.capped = { hops: 0, air: false, x: p.pos.x, z: p.pos.z };
  C.popText(p.pos.x, 2.4, p.pos.z, t('Snuffed! (hop, or wait for a friend)'), '#ffd66b');
  C.fxMeshes.push({ m, t: life, life, fn: (q) => {
    const B = p.capped;
    if (!B || !p.fighter || p.fighter.down) { q.t = 0; p.capped = null; return; }
    p.actor.pos.x = B.x; p.actor.pos.z = B.z;
    const air = !!p.actor.airborne; if (air && !B.air) B.hops++; B.air = air;
    m.position.y = 0.8 + (air ? 0.3 : 0);
    const friend = C.alivePlayers().find((o) => o !== p && Math.hypot(o.pos.x - B.x, o.pos.z - B.z) < 1.5);
    if (friend || B.hops >= 3 || q.t < 0.05) { q.t = 0; p.capped = null; C.world.fx.emit('dust', B.x, 1, B.z, 10); C.sfx('bonk'); if (onFree) onFree(); }
  } });
}

// a trapdoor, opened: a dark square that swallows whoever stands on it (a bump, and back)
function trapdoor(C, x, z, s, life, home) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(s, 0.02, s), new THREE.MeshBasicMaterial({ color: 0x08060c }));
  m.position.set(x, 0.03, z);
  C.root.add(m);
  C.fxMeshes.push({ m, t: life, life, fn: () => {
    for (const p of C.alivePlayers()) {
      if (p.actor.jumpY > 0.3 || Math.abs(p.pos.x - x) > s / 2 || Math.abs(p.pos.z - z) > s / 2) continue;
      C.hurtPlayer(p, 30 * (C.enemyDmg || 1), { knock: 0 });
      C.world.fx.emit('dust', p.pos.x, 0.3, p.pos.z, 10);
      p.actor.pos.x = home.x + rand(-2, 2); p.actor.pos.z = home.z + 5;
      C.popText(p.pos.x, 2.4, p.pos.z, t('Down the trapdoor!'), '#ff9a8a');
    }
  } });
}

export const FINALE_BRAINS = {
  stagehand: {
    init(e) { e.state = 'chase'; e.timer = rand(1, 1.8); },
    think(e, dt, tgt, C) {
      tickLater(e, dt);
      if (!tgt) return;
      e.timer -= dt;
      if (e.state === 'chase') {
        const d = toward(e, C, tgt, speedOf(e, C), dt, 1.5);
        if (d < 2.4 && e.timer <= 0) {
          const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, l = Math.hypot(dx, dz) || 1, dir = { x: dx / l, z: dz / l };
          e.state = 'swing'; e.timer = 1.1; e.face = dir;
          cone(C, e.x, e.z, dir, 2.6, 2.2, 0.7, 0xff5a6a);
          later(e, 0.7, () => { hurtIn(C, e, (p) => { const px = p.pos.x - e.x, pz = p.pos.z - e.z, dd = Math.hypot(px, pz); return dd < 2.6 && (px * dir.x + pz * dir.z) / (dd || 1) > Math.cos(1.1); }, e.def.dmg, { knock: 4 }); C.sfx('whoosh', e); });
        }
      } else if (e.timer <= 0) { e.state = 'chase'; e.timer = rand(1.2, 2); }
    },
    pose(e) { const u = e.obj.userData; e.obj.rotation.y = Math.atan2(e.face.x, e.face.z); const w = Math.sin(e.t * 9); u.legs[0].rotation.x = w * 0.4; u.legs[1].rotation.x = -w * 0.4; u.rope.rotation.x = e.state === 'swing' ? e.t * 14 : Math.sin(e.t * 3) * 0.3; },
  },

  snuffbot3: {
    init(e) { e.state = 'chase'; e.timer = 2; e.phase = 1; e.last = null; e.exposed = 0; },
    onHit(e) { if (e.exposed > 0) e.flash = 0.12; },
    think(e, dt, tgt, C) {
      tickLater(e, dt);
      leash(e, C);
      if (e.exposed > 0) e.exposed -= dt;
      if (e.state !== 'roar' && checkPhase(e, C, (ph) => { C.bubble(e, ph === 2 ? t('Mark THREE has a SECOND gear!') : t('And a THIRD! Oh no, not the third—'), 2); })) return;
      if (e.state === 'roar') { if (e.timer <= 0) { e.state = 'chase'; e.timer = 1; } return; }
      if (!tgt) return;
      if (e.state === 'chase') {
        toward(e, C, tgt, speedOf(e, C) * (e.phase >= 3 ? 1.2 : 1), dt, 2.6);
        if (e.timer > 0) return;
        const opts = ['caps', 'stomp', 'flood'];
        let a = pick(opts);
        if (a === e.last) a = pick(opts.filter((o) => o !== a));
        e.last = a;
        this[a](e, C, tgt);
      } else if (e.state === 'busy' && e.timer <= 0) { e.state = 'chase'; e.timer = rand(1.1, 1.7) / (e.phase >= 3 ? 1.25 : 1); }
    },
    // snuffer-caps on marked circles
    caps(e, C) {
      e.state = 'busy'; e.timer = 1.8; e.anim = 'caps'; e.animT = 0;
      C.bubble(e, pick([t('Caps ON!'), t('Everybody under a hat!')]), 1.2);
      for (const p of C.alivePlayers().slice(0, e.phase >= 2 ? 4 : 2)) {
        const x = p.pos.x, z = p.pos.z;
        C.telegraphCircle(x, z, 1.1, 1.1);
        later(e, 1.1, () => {
          for (const q of C.alivePlayers()) if (!q.capped && Math.hypot(q.pos.x - x, q.pos.z - z) < 1.1 && q.actor.jumpY < 0.4) { C.hurtPlayer(q, e.def.dmg * 0.5 * (C.enemyDmg || 1), { knock: 0, src: e }); capOver(C, q, 5); }
          C.sfx('slam', e);
        });
      }
    },
    // a stomp on a marked circle
    stomp(e, C, tgt) {
      const x = tgt.pos.x, z = tgt.pos.z;
      e.state = 'busy'; e.timer = 1.6; e.anim = 'slam'; e.animT = 0;
      C.telegraphCircle(x, z, 2.2, 1.0);
      later(e, 1.0, () => { hurtIn(C, e, (p) => Math.hypot(p.pos.x - x, p.pos.z - z) < 2.2 && p.actor.jumpY < 0.6, e.def.dmg * 1.2, { knock: 5, launch: 3 }); C.vfx.shockwave(x, z, { r: 2.4, color: '#e8c46a', life: 0.5, wall: 0.8 }); C.shakeAt(e, 0.5); C.sfx('thud', e); });
    },
    // a flood of hot wax: rings spreading out (jump them) — then the dome overheats
    flood(e, C) {
      e.state = 'busy'; e.timer = 2.8; e.anim = 'vent'; e.animT = 0;
      C.bubble(e, t('WAX FLOOD! …Why did I build a wax flood?'), 1.6);
      for (const [k, r0] of [[0, 2.6], [0.6, 4.6], [1.2, 6.6]]) {
        later(e, k, () => {
          flat(C, new THREE.RingGeometry(Math.max(0.1, r0 - 0.6), r0 + 0.6, 40).rotateX(-Math.PI / 2), e.x, e.z, 0xf4e4c0, 0.7);
          later(e, 0.7, () => { hurtIn(C, e, (p) => { const d = Math.hypot(p.pos.x - e.x, p.pos.z - e.z); return Math.abs(d - r0) < 0.7 && p.actor.jumpY < 0.5; }, e.def.dmg * 0.8, { knock: 3, elem: 'fire' }); C.vfx.shockwave(e.x, e.z, { r: r0, color: '#f4e4c0', life: 0.4, wall: 0.5 }); });
        });
      }
      later(e, 2.0, () => { e.exposed = 4.5; C.popText(e.x, e.def.h + 1, e.z, t('The dome’s overheating — hit it!'), '#ffb070', true); C.sfx('geyser', e); });
    },
    pose(e, dt) {
      // (the Snuffbot 3000’s own animation, and the crown’s candles bobbing)
      const base = e.brainBase || (e.brainBase = e.combat && null);
      void base;
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      e.animT = (e.animT || 0) + dt;
      const moving = e.state === 'chase';
      for (const [i, L] of u.legs.entries()) L.rotation.x = moving ? Math.sin(e.t * 6 + i * Math.PI) * 0.35 : 0;
      u.body.position.y = moving ? Math.abs(Math.sin(e.t * 6)) * 0.08 : 0;
      u.crown.rotation.y = e.t * 0.8;
      u.launcher.rotation.x = e.anim === 'caps' && e.state === 'busy' ? -0.4 + Math.sin(e.t * 20) * 0.1 : 0;
      if (u.hatch && u.hatch.material) u.hatch.material.emissiveIntensity = e.exposed > 0 ? 1.4 + Math.sin(e.t * 12) * 0.4 : 0.2;
    },
  },

  grandiva: {
    init(e) { e.state = 'chase'; e.timer = 2; e.phase = 1; e.last = null; e.fright = 0; e.dazzle = 0; e.sweep = 0; },
    onHit(e) { if (e.dazzle > 0) e.flash = 0.12; },
    think(e, dt, tgt, C) {
      tickLater(e, dt);
      leash(e, C);
      DIVA.spot.call(DIVA, e, C, dt);
      tickFlats(e, C, dt);
      const H = e.home || { x: e.x, z: e.z };
      // (the end of her strength: she stops, and the chapter takes over)
      if (!e.ended && e.hp < e.maxHp * 0.12) { e.ended = true; e.immune = '…'; e.state = 'end'; if (e.onEnd) e.onEnd(e); return; }
      if (e.state === 'end') return;
      // Act III: the Umbral Spotlight sweeps; while it shines, nothing touches her
      if (e.phase >= 3) {
        e.dazzle = Math.max(0, e.dazzle - dt);
        if (e.dazzle > 0) { e.immune = null; e.hintText = 'The Spotlight is shattered — she’s dazzled! Strike!'; e.state = 'dazzled'; return; }
        if (e.state === 'dazzled') { e.state = 'chase'; e.timer = 1; }
        e.immune = 'The Umbral Spotlight shields her!'; e.hintText = 'Stand on the Lantern Cannon’s plate to fire at the Spotlight!';
        e.sweep += dt * (0.5 + (e.umbralK || 0) * 0.15);
        const a0 = e.sweep, len = 14, wid = 0.55;
        e.umbralT = (e.umbralT || 0) - dt;
        if (e.umbralT <= 0) {
          e.umbralT = 0.5;
          for (const p of C.alivePlayers()) {
            const px = p.pos.x - H.x, pz = p.pos.z - H.z, d = Math.hypot(px, pz); if (d > len || d < 0.8) continue;
            let da = Math.atan2(pz, px) - a0; da = Math.atan2(Math.sin(da), Math.cos(da));
            if (Math.abs(da) < wid) { C.hurtPlayer(p, e.def.dmg * 0.35 * (C.enemyDmg || 1), { knock: 0, src: e }); C.popText(p.pos.x, 2.2, p.pos.z, t('Dimmed!'), '#8a78b0'); }
          }
        }
        if (e.onSweep) e.onSweep(e, a0, len, wid);
      } else if (e.immune === 'The Umbral Spotlight shields her!') e.immune = null;
      if (e.state !== 'roar' && checkPhase(e, C, (ph) => { C.bubble(e, ph === 2 ? t('ACT TWO! Stage machinery — GO!') : t('ACT THREE! Light the UMBRAL SPOTLIGHT!'), 2.4); if (e.onAct) e.onAct(e, ph); })) return;
      if (e.state === 'roar') { if (e.timer <= 0) { e.state = 'chase'; e.timer = 1; } return; }
      if (!tgt) return;
      if (e.state === 'chase') {
        hover(e, C, tgt, speedOf(e, C), dt, 3.5, 7);
        if (e.timer > 0) return;
        const opts = e.phase === 1 ? ['aria', 'snuffer', 'spotlight', 'fan'] : e.phase === 2 ? ['trapdoors', 'sandbags', 'flats', 'flats', 'aria', 'snuffer'] : ['aria', 'sandbags', 'snuffer'];
        if (e.spotOn) opts.splice(opts.indexOf('spotlight'), opts.indexOf('spotlight') >= 0 ? 1 : 0);
        let a = pick(opts);
        if (a === e.last) a = pick(opts.filter((o) => o !== a));
        e.last = a;
        (this[a] || DIVA[a]).call(this[a] ? this : DIVA, e, C, tgt);
      } else if (e.state === 'busy' && e.timer <= 0) { e.state = 'chase'; e.timer = rand(1, 1.6) / (e.phase >= 3 ? 1.2 : 1); }
    },
    // (Act II) trapdoors open on marked squares
    trapdoors(e, C) {
      e.state = 'busy'; e.timer = 1.8; e.anim = 'point'; e.animT = 0;
      C.bubble(e, pick([t('Trapdoors! Mind your step, darlings.'), t('The floor is… MINE.')]), 1.4);
      const H = e.home || { x: e.x, z: e.z };
      for (const p of C.alivePlayers().slice(0, 5)) {
        const x = Math.round(p.pos.x) + 0.5, z = Math.round(p.pos.z) + 0.5, s = 2;
        flat(C, new THREE.PlaneGeometry(s, s).rotateX(-Math.PI / 2), x, z, 0xff5a6a, 1.1);
        later(e, 1.1, () => { trapdoor(C, x, z, s, 3.5, H); C.sfx('unlock', e); });
      }
    },
    // (Act II) a scene change: painted flats run across the stage down marked lanes
    flats(e, C) {
      e.state = 'busy'; e.timer = 2.4; e.anim = 'point'; e.animT = 0;
      C.bubble(e, pick([t('Scene change! Flats — IN!'), t('Mind the scenery, darlings!'), t('A new set! Isn’t it DIVINE?')]), 1.4);
      const H = e.home || { x: e.x, z: e.z }, ps = C.alivePlayers();
      // (a lane through a hero or two, and one more somewhere else — never through the Duchess)
      const zs = ps.slice(0, 2).map((p) => p.pos.z);
      zs.push(H.z + rand(-9, 9));
      const lanes = [];
      for (const z of zs) if (Math.abs(z - e.z) > 1.4 && !lanes.some((q) => Math.abs(q - z) < 2.2)) lanes.push(z);
      lanes.forEach((z, i) => {
        const dir = Math.random() < 0.5 ? 1 : -1, look = (i + (e.flatN = (e.flatN || 0) + 1)) % 3;
        flat(C, new THREE.PlaneGeometry(36, 1.8).rotateX(-Math.PI / 2), H.x, z, 0xff5a6a, 1.2);
        later(e, 1.2, () => startFlat(e, C, H, z, dir, look));
      });
    },
    // (Act II) sandbags drop from the fly tower on marked circles
    sandbags(e, C) {
      e.state = 'busy'; e.timer = 1.6; e.anim = 'point'; e.animT = 0;
      C.bubble(e, pick([t('Fly crew — DROP!'), t('Sandbags! It’s tradition!')]), 1.2);
      for (const p of C.alivePlayers()) for (let k = 0; k < 2; k++) {
        const x = p.pos.x + rand(-1.8, 1.8), z = p.pos.z + rand(-1.4, 1.4);
        later(e, k * 0.25, () => C.zone({ x, z, r: 1.0, delay: 1.1, dmg: e.def.dmg * 0.8 * (C.enemyDmg || 1), knock: 3, kind: 'bomb', gloom: true, arc: { x, y: 8, z }, look: 'bomb' }));
      }
    },
    onDeath(e, C) { for (const F of e.slidingFlats || []) C.root.remove(F.m); e.slidingFlats = []; },
    pose(e, dt) {
      DIVA.pose.call(DIVA, e, dt);
      const u = e.obj.userData;
      // (the stolen flames orbit her; in Act III they burn brighter)
      (u.flames || []).forEach((f, i) => { const a = e.t * 1.2 + (i / u.flames.length) * Math.PI * 2; f.position.set(Math.cos(a) * 1.4, 3.6 + Math.sin(e.t * 2 + i) * 0.2, Math.sin(a) * 1.4); f.scale.setScalar(e.phase >= 3 ? 1.4 : 1); f.visible = !e.freedFlames; });
    },
  },
};

// ------------------------------------------------------------------ the sliding flats (Act II)
// a painted flat, 3.4 wide and 3 tall, on a little wheeled truck: a castle, a forest, a moonlit sea
const FLAT_TEX = [];
function flatTexture(look) {
  if (FLAT_TEX[look]) return FLAT_TEX[look];
  const c = document.createElement('canvas'); c.width = 34; c.height = 30;
  const g = c.getContext('2d'), r = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  if (look === 0) {          // a castle at dusk
    r(0, 0, 34, 30, '#3a2a5a'); r(0, 18, 34, 12, '#4a6a3a');
    r(6, 8, 22, 14, '#9a8aa8'); for (const x of [4, 14, 24]) { r(x, 4, 6, 18, '#b0a0c0'); for (let k = 0; k < 3; k++) r(x + k * 2, 2, 1, 2, '#b0a0c0'); }
    r(15, 14, 4, 8, '#3a2a3a'); r(8, 10, 2, 3, '#ffd66b'); r(25, 9, 2, 3, '#ffd66b'); r(27, 2, 1, 1, '#fff4c0'); r(3, 3, 1, 1, '#fff4c0');
  } else if (look === 1) {   // a forest
    r(0, 0, 34, 30, '#8ac0d8'); r(0, 22, 34, 8, '#5a8a3a');
    for (const [x, h] of [[2, 16], [9, 20], [17, 14], [23, 19], [29, 15]]) { r(x + 2, 30 - 8, 2, 8, '#6a4a30'); for (let k = 0; k < h / 2; k++) r(x + 3 - k / 2.5, 30 - 8 - h + k * 2, 1 + k / 1.25, 2, k % 2 ? '#3a7a3a' : '#4a9a4a'); }
  } else {                   // a moonlit sea
    r(0, 0, 34, 30, '#1a2a5a'); r(0, 17, 34, 13, '#2a4a8a');
    for (let y = 18; y < 30; y += 3) for (let x = (y % 2) * 3; x < 34; x += 6) r(x, y, 3, 1, '#6a9ad8');
    for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) if (x * x + y * y <= 17) r(24 + x, 7 + y, 1, 1, '#f4ecc8');
    r(6, 14, 8, 3, '#8a5a3a'); r(9, 8, 1, 6, '#8a5a3a'); r(10, 8, 4, 4, '#f4f0e8');
  }
  g.strokeStyle = '#c89a3a'; g.lineWidth = 2; g.strokeRect(1, 1, 32, 28);
  const tx = new THREE.CanvasTexture(c); tx.magFilter = THREE.NearestFilter; tx.minFilter = THREE.NearestFilter;
  FLAT_TEX[look] = tx;
  return tx;
}

function startFlat(e, C, H, z, dir, look) {
  if (!e.alive) return;
  const m = new THREE.Group();
  const face = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3, 0.16), [
    new THREE.MeshLambertMaterial({ color: 0x5a4030 }), new THREE.MeshLambertMaterial({ color: 0x5a4030 }), new THREE.MeshLambertMaterial({ color: 0x5a4030 }), new THREE.MeshLambertMaterial({ color: 0x5a4030 }),
    new THREE.MeshLambertMaterial({ map: flatTexture(look) }), new THREE.MeshLambertMaterial({ color: 0x8a6a4a }),
  ]);
  face.position.y = 1.7; face.castShadow = true; m.add(face);
  const truck = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.2, 0.9), new THREE.MeshLambertMaterial({ color: 0x3a2a30 })); truck.position.y = 0.12; m.add(truck);
  for (const x of [-1.4, 1.4]) { const brace = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.2, 0.1), new THREE.MeshLambertMaterial({ color: 0x6a4a30 })); brace.position.set(x, 1.1, -0.35); brace.rotation.x = 0.35; m.add(brace); }
  const x0 = H.x - dir * 19;
  m.position.set(x0, 0, z);
  C.root.add(m);
  (e.slidingFlats || (e.slidingFlats = [])).push({ m, x: x0, z, dir, x1: H.x + dir * 19, hit: new Set() });
  C.sfx('whoosh', e);
}

function tickFlats(e, C, dt) {
  if (!e.slidingFlats || !e.slidingFlats.length) return;
  for (const F of e.slidingFlats) {
    F.x += F.dir * 24 * dt;
    F.m.position.x = F.x;
    if (Math.random() < dt * 20) C.world.fx.emit('dust', F.x - F.dir * 1.6, 0.1, F.z, 1);
    for (const p of C.alivePlayers()) {
      if (F.hit.has(p) || Math.abs(p.pos.z - F.z) > 0.95 || Math.abs(p.pos.x - F.x) > 1.9 || p.actor.jumpY > 1.6) continue;
      F.hit.add(p);
      C.hurtPlayer(p, e.def.dmg * 0.7 * (C.enemyDmg || 1), { dir: { x: F.dir, z: 0 }, knock: 7, src: e });
      C.popText(p.pos.x, 2.2, p.pos.z, t('Swept off with the scenery!'), '#e8c0ff');
    }
    if ((F.x - F.x1) * F.dir > 0) { F.done = true; C.root.remove(F.m); }
  }
  e.slidingFlats = e.slidingFlats.filter((F) => !F.done);
}
