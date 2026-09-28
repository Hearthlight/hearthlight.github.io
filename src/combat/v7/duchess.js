// World v7, chapter 6: the Duchess herself, in her Debut, as a boss.
//   diva   Duchess Gloria Gloomsworth on the Gloomstage's stage. Act I: her aria (notes
//          rain on marked spots), a sweep of her fan (a marked cone), a pirouette across
//          the stage. Act II: her spotlight follows someone (a marked circle — stand in it
//          and you're « upstaged »: it burns, it slows). Act III: the Grand Snuffer comes
//          down on marked rings. And a hen — led to her by a hero (the chapter's script) —
//          freezes her with fright: she trembles, wide open (×2), until she shoos it off.
// Every blow is shown before it lands.

import { THREE } from '../../render/r3d.js';
import { hover, speedOf } from '../v3/ai.js';
import { flat, cone, later, tickLater, hurtIn, checkPhase, leash } from '../v3/bosses.js';
import { t } from '../../i18n.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export const DUCHESS_ENEMIES = {
  diva: { name: 'the Duchess', title: 'Duchess Gloria Gloomsworth, in her Debut', hp: 4200, speed: 1.7, r: 0.9, h: 3.1, dmg: 22, xp: 700, cost: 99, boss: true, knockRes: 1 },
};

// ------------------------------------------------------------------ the model
const mats = new Map();
function mat(r3d, c, e = null, ei = 1) {
  const k = c + '|' + e + '|' + ei;
  if (!mats.has(k)) mats.set(k, new THREE.MeshToonMaterial({ color: c, emissive: e || 0x000000, emissiveIntensity: e ? ei : 1, gradientMap: r3d.gradient }));
  return mats.get(k);
}
function own(g) { g.traverse((m) => { if (m.isMesh) m.material = m.material.clone(); }); return g; }
function box(g, w, h, d, m, x, y, z) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; g.add(b); return b; }
function ball(g, r, m, x, y, z, sx = 1, sy = 1, sz = 1) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), m); b.position.set(x, y, z); b.scale.set(sx, sy, sz); b.castShadow = true; g.add(b); return b; }
function cyl(g, rt, rb, h, m, x, y, z, n = 14) { const b = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, n), m); b.position.set(x, y, z); b.castShadow = true; g.add(b); return b; }
const grp = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

export const DUCHESS_MODELS = {
  // a diva: a bell of a gown, long gloves, a fan, and THE hat
  diva(r3d) {
    const g = new THREE.Group(), body = grp(g);
    body.scale.setScalar(1.35);
    const gown = mat(r3d, '#5a2a78'), gownL = mat(r3d, '#7a4a9a'), trim = mat(r3d, '#c9a2f0'), gold = mat(r3d, '#f2c14e', '#c89020', 0.3);
    const skin = mat(r3d, '#f4e8f0'), glove = mat(r3d, '#3a1a4a'), hair = mat(r3d, '#1e1624'), dark = mat(r3d, '#1a1024');
    const skirt = cyl(body, 0.36, 1.2, 1.5, gown, 0, 0.75, 0);
    cyl(body, 1.22, 1.24, 0.12, trim, 0, 0.06, 0);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; box(body, 0.08, 1.3, 0.04, gownL, Math.cos(a) * 0.8, 0.72, Math.sin(a) * 0.8).lookAt(0, 0.72, 0); }
    cyl(body, 0.4, 0.42, 0.1, gold, 0, 1.5, 0);
    const torso = grp(body, 0, 1.78, 0);
    box(torso, 0.62, 0.52, 0.4, gown, 0, 0, 0);
    box(torso, 0.7, 0.12, 0.44, trim, 0, 0.26, 0);
    ball(torso, 0.08, gold, 0, 0.14, 0.22);
    const arms = [];
    for (const s of [-1, 1]) { const A = grp(torso, s * 0.4, 0.16, 0); box(A, 0.14, 0.62, 0.16, glove, 0, -0.3, 0); arms.push(A); }
    // the fan, in her right hand
    const fan = grp(arms[1], 0, -0.62, 0.08);
    for (let i = 0; i < 7; i++) { const b = box(fan, 0.06, 0.5, 0.02, i % 2 ? gold : trim, 0, 0.25, 0); b.rotation.z = -0.9 + i * 0.3; b.position.x = Math.sin(-0.9 + i * 0.3) * 0.12; }
    const head = grp(body, 0, 2.3, 0);
    box(head, 0.5, 0.48, 0.44, skin, 0, 0, 0);
    box(head, 0.54, 0.2, 0.48, hair, 0, 0.2, -0.02);
    box(head, 0.5, 0.7, 0.12, hair, 0, -0.18, -0.24);
    for (const s of [-1, 1]) { box(head, 0.08, 0.1, 0.02, mat(r3d, '#9a5ae0', '#6a3aa8', 0.5), s * 0.11, 0.02, 0.225); box(head, 0.1, 0.02, 0.02, dark, s * 0.11, 0.09, 0.225); }
    const mouth = box(head, 0.12, 0.05, 0.02, mat(r3d, '#c8384e'), 0, -0.13, 0.225);
    box(head, 0.03, 0.03, 0.02, dark, 0.14, -0.08, 0.225);
    // THE hat: a wide brim, a tall crown, a curling plume
    const hat = grp(head, 0, 0.3, -0.06);
    hat.rotation.x = -0.42;
    cyl(hat, 0.62, 0.62, 0.05, gown, 0, 0, 0);
    cyl(hat, 0.3, 0.32, 0.32, gown, 0, 0.18, 0);
    cyl(hat, 0.33, 0.33, 0.06, gold, 0, 0.06, 0);
    const plume = grp(hat, 0.2, 0.3, -0.05);
    for (let i = 0; i < 7; i++) { const f = box(plume, 0.14 - i * 0.012, 0.3, 0.06, i % 2 ? trim : mat(r3d, '#f4eaff'), 0.06 + i * 0.07, 0.1 + i * 0.13, -i * 0.04); f.rotation.z = -0.3 - i * 0.14; }
    g.userData = { body, torso, arms, head, fan, mouth, hat, plume, skirt };
    return own(g);
  },
};

// ------------------------------------------------------------------ the brain
export const DUCHESS_BRAINS = {
  diva: {
    init(e) { e.state = 'chase'; e.timer = 2; e.phase = 1; e.last = null; e.fright = 0; },
    onHit(e) { if (e.fright > 0) e.flash = 0.12; },
    think(e, dt, tgt, C) {
      tickLater(e, dt);
      leash(e, C);
      this.spot(e, C, dt);
      // (a hen! she freezes, then shoos it off)
      if (e.fright > 0) {
        e.fright -= dt; e.state = 'fright';
        if (e.fright <= 0) { e.state = 'busy'; e.timer = 1; C.bubble(e, pick([t('SHOO! Shoo, you feathered CRITIC!'), t('Where was I? Ah yes — your DOOM!'), t('We do NOT speak of the hen.')]), 1.8); if (e.onShoo) e.onShoo(e); }
        return;
      }
      if (e.state !== 'roar' && checkPhase(e, C, (ph) => { C.bubble(e, ph === 2 ? t('Act Two! Lights — on ME!') : t('Act Three — the GRAND FINALE!'), 2.2); if (e.onAct) e.onAct(e, ph); })) return;
      if (e.state === 'roar') { if (e.timer <= 0) { e.state = 'chase'; e.timer = 1; } return; }
      if (!tgt) return;
      if (e.state === 'chase') {
        hover(e, C, tgt, speedOf(e, C), dt, 3.5, 6.5);
        if (e.timer > 0) return;
        const opts = ['aria', 'fan', 'twirl'];
        if (e.phase >= 2 && !e.spotOn) opts.push('spotlight', 'spotlight');
        if (e.phase >= 3) opts.push('snuffer', 'snuffer');
        let a = pick(opts);
        if (a === e.last) a = pick(opts.filter((o) => o !== a));
        e.last = a;
        this[a](e, C, tgt);
      } else if (e.state === 'busy' && e.timer <= 0) { e.state = 'chase'; e.timer = rand(1.1, 1.7) / (e.phase >= 3 ? 1.2 : 1); }
    },
    // her aria: notes rain down on marked spots round everyone
    aria(e, C) {
      e.state = 'busy'; e.timer = 1.9; e.anim = 'sing'; e.animT = 0;
      C.bubble(e, pick([t('♪ Behold my VOICE! ♪'), t('♪ La-la-LAAAA! ♪'), t('♪ Bravissimo… MEEE! ♪')]), 1.4);
      for (const p of C.alivePlayers()) for (let k = 0; k < (e.phase >= 2 ? 4 : 3); k++) {
        const x = p.pos.x + rand(-2.2, 2.2), z = p.pos.z + rand(-1.8, 1.8);
        later(e, 0.1 + k * 0.2, () => C.zone({ x, z, r: 1.05, delay: 1.1, dmg: e.def.dmg * 0.75 * (C.enemyDmg || 1), knock: 2, kind: 'bomb', gloom: true, arc: { x: e.x, y: 6, z: e.z }, look: 'note' }));
      }
      C.sfx('tone', e);
    },
    // a sweep of her fan: a marked cone in front of her
    fan(e, C, tgt) {
      const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, l = Math.hypot(dx, dz) || 1, dir = { x: dx / l, z: dz / l };
      e.face = dir; e.state = 'busy'; e.timer = 1.4; e.anim = 'fan'; e.animT = 0;
      cone(C, e.x, e.z, dir, 5, 0.7, 0.9, 0xc9a2f0);
      later(e, 0.9, () => { hurtIn(C, e, (p) => { const px = p.pos.x - e.x, pz = p.pos.z - e.z, d = Math.hypot(px, pz); return d < 5 && (px * dir.x + pz * dir.z) / (d || 1) > Math.cos(0.7); }, e.def.dmg * 0.9, { knock: 5 }); C.sfx('whoosh', e); });
      C.bubble(e, pick([t('Out of my LIGHT!'), t('Such bad manners!')]), 1);
    },
    // a pirouette across the stage (and a ring where she lands)
    twirl(e, C, tgt) {
      const a = rand(0, Math.PI * 2), d = rand(3.5, 5.5), x = tgt.pos.x + Math.cos(a) * d, z = tgt.pos.z + Math.sin(a) * d;
      const s = C.freeSpot(x, z, 2) || { x: e.x, z: e.z };
      e.state = 'busy'; e.timer = 1.5; e.anim = 'twirl'; e.animT = 0;
      C.telegraphCircle(s.x, s.z, 2, 0.9);
      later(e, 0.9, () => { e.x = s.x; e.z = s.z; hurtIn(C, e, (p) => Math.hypot(p.pos.x - s.x, p.pos.z - s.z) < 2, e.def.dmg * 0.8, { knock: 4 }); C.vfx.shockwave(s.x, s.z, { r: 2, color: '#c9a2f0', life: 0.4, wall: 0.5 }); C.sfx('whoosh', e); });
      C.bubble(e, t('Pirouette!'), 0.9);
    },
    // her spotlight picks someone out and follows them; inside it you're upstaged
    spotlight(e, C, tgt) {
      e.state = 'busy'; e.timer = 1.2; e.anim = 'point'; e.animT = 0;
      e.spotOn = { x: tgt.pos.x, z: tgt.pos.z, p: tgt, t: 6.5, warm: 0.9, tick: 0, m: null };
      C.bubble(e, pick([t('Spotlight on… YOU. How dreadful for you.'), t('Lights! On the peasant!')]), 1.6);
      C.sfx('charge', e);
    },
    spot(e, C, dt) {
      const S = e.spotOn;
      if (!S) return;
      S.t -= dt;
      if (!S.m) { S.m = new THREE.Mesh(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfff4c8, transparent: true, opacity: 0.35, depthWrite: false })); S.m.scale.setScalar(2.2); C.root.add(S.m); }
      if (S.t <= 0 || !e.alive) { C.root.remove(S.m); e.spotOn = null; return; }
      // (it drifts after its mark, a touch slower than you run)
      const p = S.p && S.p.fighter && !S.p.fighter.down ? S.p : C.alivePlayers()[0];
      if (p) { const dx = p.pos.x - S.x, dz = p.pos.z - S.z, l = Math.hypot(dx, dz); if (l > 0.05) { const k = Math.min(l, dt * 2.6); S.x += (dx / l) * k; S.z += (dz / l) * k; } }
      S.m.position.set(S.x, 0.05, S.z);
      S.m.material.opacity = S.warm > 0 ? 0.15 : 0.35 + Math.sin(e.t * 12) * 0.08;
      if (S.warm > 0) { S.warm -= dt; return; }
      S.tick -= dt;
      for (const q of C.alivePlayers()) {
        if (Math.hypot(q.pos.x - S.x, q.pos.z - S.z) > 2.2) continue;
        q.actor.zoneSlow = Math.min(q.actor.zoneSlow ?? 1, 0.7);
        if (S.tick <= 0) { C.hurtPlayer(q, e.def.dmg * 0.3 * (C.enemyDmg || 1), { knock: 0, src: e }); C.popText(q.pos.x, 2.2, q.pos.z, t('Upstaged!'), '#fff4c8'); }
      }
      if (S.tick <= 0) S.tick = 0.6;
    },
    // the Grand Snuffer comes down on marked rings
    snuffer(e, C) {
      e.state = 'busy'; e.timer = 2.2; e.anim = 'point'; e.animT = 0;
      C.bubble(e, pick([t('The SNUFFER! Cue the Snuffer!'), t('Lights OUT, darlings!')]), 1.6);
      for (const p of C.alivePlayers().slice(0, 4)) {
        const x = p.pos.x + rand(-0.8, 0.8), z = p.pos.z + rand(-0.6, 0.6);
        flat(C, new THREE.RingGeometry(2.1, 2.6, 36).rotateX(-Math.PI / 2), x, z, 0x7a3aa8, 1.6);
        C.telegraphCircle(x, z, 2.6, 1.6);
        later(e, 1.6, () => {
          hurtIn(C, e, (q) => Math.hypot(q.pos.x - x, q.pos.z - z) < 2.6, e.def.dmg * 1.4, { knock: 6 });
          C.vfx.shockwave(x, z, { r: 2.6, color: '#7a3aa8', life: 0.6, wall: 1.2 });
          C.world.fx.emit('smoke', x, 1, z, 12, { color: '#6a4a8e' });
          C.shakeAt(e, 0.5); C.sfx('thud', e);
        });
      }
    },
    pose(e, dt) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      e.animT = (e.animT || 0) + dt;
      const fright = e.state === 'fright', sing = e.anim === 'sing' && e.state === 'busy', twirl = e.anim === 'twirl' && e.state === 'busy';
      u.body.position.y = Math.sin(e.t * 2) * 0.03;
      u.body.rotation.y = twirl ? e.animT * 14 : 0;
      u.body.position.x = fright ? Math.sin(e.t * 50) * 0.04 : 0;
      u.skirt.scale.set(1 + Math.sin(e.t * 3) * 0.02, 1, 1 + Math.cos(e.t * 3) * 0.02);
      // (arms: flung wide to sing, one pointing, both over her face in a fright)
      u.arms[0].rotation.z = fright ? 2.6 : sing ? 2.2 + Math.sin(e.t * 4) * 0.2 : 0.3;
      u.arms[0].rotation.x = fright ? -1.2 : 0;
      u.arms[1].rotation.z = fright ? -2.6 : e.anim === 'fan' && e.state === 'busy' ? -1.8 + Math.min(1, e.animT / 0.9) * 2.4 : e.anim === 'point' && e.state === 'busy' ? -1.6 : sing ? -2.2 : -0.3;
      u.arms[1].rotation.x = fright ? -1.2 : e.anim === 'point' && e.state === 'busy' ? -1.4 : 0;
      u.mouth.scale.y = sing ? 2.5 + Math.sin(e.t * 12) * 1 : fright ? 3 : 1;
      u.head.rotation.x = sing ? -0.25 : fright ? 0.2 : 0;
      u.plume.rotation.z = Math.sin(e.t * 2.5) * 0.12;
    },
  },
};
