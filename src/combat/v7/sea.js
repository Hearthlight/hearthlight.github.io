// World v7, chapter 5: the gloom of the drowned temple, as foes.
//   kraken     the Gloom Kraken (the Sunken Bell Temple's boss): a great mantle and a
//              golden eye, low in the flooded arena. While the sea is in, nothing
//              reaches it (« Too deep! ») — its tentacles rise through the water and
//              slam down marked lines, a whirlpool drags heroes to its middle (phase
//              2), a tentacle grabs whoever stands in its marked ring (phase 3: hit
//              the tentacle to free them). Ring the great Sunken Bell and the whole
//              arena drains: the Kraken is stranded on the tiles, its eye wide open
//              (×2), its tentacles limp — until it drags the sea back in.
//   tentacle   one of its arms: rises, lifts (the line is marked), slams, lies there
//              a moment (hit it: a severed arm costs the Kraken dearly), sinks.
// Every blow is shown before it lands.

import { THREE } from '../../render/r3d.js';
import { flat, later, tickLater, hurtIn, checkPhase } from '../v3/bosses.js';
import { t } from '../../i18n.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export const SEA_ENEMIES = {
  kraken: { name: 'the Gloom Kraken', title: 'the Gloom Kraken, terror of the Sunken City', hp: 3400, speed: 0, r: 2.2, h: 3.6, dmg: 22, xp: 600, cost: 99, boss: true, knockRes: 1, elem: 'shock' },
  tentacle: { name: 'Kraken tentacle', hp: 150, speed: 0, r: 0.55, h: 1.2, dmg: 20, xp: 15, cost: 3, knockRes: 1 },
};

// ------------------------------------------------------------------ models
const mats = new Map();
function mat(r3d, c, e = null, ei = 1) {
  const k = c + '|' + e + '|' + ei;
  if (!mats.has(k)) mats.set(k, new THREE.MeshToonMaterial({ color: c, emissive: e || 0x000000, emissiveIntensity: e ? ei : 1, gradientMap: r3d.gradient }));
  return mats.get(k);
}
function own(g) { g.traverse((m) => { if (m.isMesh) m.material = m.material.clone(); }); return g; }
function box(g, w, h, d, m, x, y, z) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; g.add(b); return b; }
function ball(g, r, m, x, y, z, sx = 1, sy = 1, sz = 1) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2), m); b.position.set(x, y, z); b.scale.set(sx, sy, sz); b.castShadow = true; g.add(b); return b; }
function cyl(g, rt, rb, h, m, x, y, z, n = 10) { const b = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, n), m); b.position.set(x, y, z); b.castShadow = true; g.add(b); return b; }
const grp = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
const SKIN = '#5a4a8e', SKIN_D = '#3e3270', SPOT = '#8a7ac0', SUCK = '#e8c8e0', GLOOM = '#a86ae0';

export const SEA_MODELS = {
  // the Kraken: a tall mantle speckled with pale spots, fins on top, one great gold
  // eye with a gloom-violet slit, a frowning ridge; stumps of arms round its base
  kraken(r3d) {
    const g = new THREE.Group(), body = grp(g, 0, 0, 0);
    const skin = mat(r3d, SKIN), dark = mat(r3d, SKIN_D), spot = mat(r3d, SPOT);
    const mantle = ball(body, 1.6, skin, 0, 2.6, -0.3, 1.25, 1.55, 1.1);
    for (let i = 0; i < 9; i++) { const a = i * 2.4, y = 2.2 + (i % 3) * 0.7; ball(body, 0.18 + (i % 2) * 0.08, spot, Math.cos(a) * 1.6, y, Math.sin(a) * 1.3 - 0.3, 1, 1, 0.4).lookAt(0, y, -0.3); }
    for (const s of [-1, 1]) { const f = box(body, 0.1, 1.1, 0.9, dark, s * 1.2, 4.4, -0.5); f.rotation.z = s * 0.6; }
    // (the great eye sits high on the mantle's front, looking up at whoever comes in)
    const head = grp(body, 0, 2.5, 1.2);
    ball(head, 1.05, skin, 0, -0.9, -0.2, 1.3, 0.85, 0.9);
    const brow = box(head, 2.0, 0.26, 0.34, dark, 0, 0.66, 0.42); brow.rotation.x = 0.5;
    const white = ball(head, 0.86, mat(r3d, '#f4f0e8'), 0, 0.1, 0.28, 1, 1, 0.5);
    white.rotation.x = -0.6;
    const eye = ball(head, 0.62, mat(r3d, '#ffd66b', '#e0a020', 0.6), 0, 0.1, 0.46, 1, 1, 0.5);
    eye.rotation.x = -0.6;
    const pupil = box(head, 0.16, 0.8, 0.04, mat(r3d, '#1a1024'), 0, 0.1, 0.8);
    pupil.rotation.x = -0.6;
    const lid = box(head, 1.5, 0.64, 0.24, skin, 0, 0.62, 0.52); lid.rotation.x = -0.6;
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, st = cyl(body, 0.32, 0.46, 1.1, i % 2 ? skin : dark, Math.cos(a) * 1.5, 0.3, Math.sin(a) * 1.3 + 0.2); st.rotation.z = Math.cos(a) * 0.5; st.rotation.x = -Math.sin(a) * 0.5; }
    g.userData = { body, head, eye, pupil, lid, mantle };
    return own(g);
  },
  // an arm: seven tapering segments round a hinge at the base, suckers underneath
  tentacle(r3d) {
    const g = new THREE.Group(), arm = grp(g, 0, 0, 0);
    const skin = mat(r3d, SKIN), dark = mat(r3d, SKIN_D), suck = mat(r3d, SUCK);
    const segs = [];
    let parent = arm, r = 0.5;
    for (let i = 0; i < 7; i++) {
      const s = grp(parent, 0, i ? 1.0 : 0, 0);
      cyl(s, r * 0.82, r, 1.05, i % 2 ? skin : dark, 0, 0.5, 0, 8);
      for (const y of [0.25, 0.7]) ball(s, r * 0.28, suck, 0, y, r * 0.8, 1, 1, 0.5);
      segs.push(s); parent = s; r *= 0.84;
    }
    const tip = ball(segs[6], 0.2, dark, 0, 1.1, 0);
    g.userData = { arm, segs, tip };
    return own(g);
  },
};

// ------------------------------------------------------------------ brains
// (the arena's sea is the room's tide: `e.pool = { cx, cz, full() }`, set by the script)
const full = (e) => !e.pool || e.pool.full();

export const SEA_BRAINS = {
  kraken: {
    init(e) { e.state = 'lurk'; e.timer = 2; e.phase = 1; e.tentT = 1.2; e.whirlT = 6; e.grabT = 5; e.exposed = 0; },
    onHit(e) { if (e.state === 'stranded') e.flash = 0.12; },
    think(e, dt, tgt, C) {
      tickLater(e, dt);
      e.immuneT = (e.immuneT || 0) - dt;
      if (e.state !== 'stranded' && checkPhase(e, C, (ph) => C.bubble(e, ph === 2 ? t('BLOOOORP! (it is very cross)') : t('GLUB GLUB GLUB!!'), 2))) return;
      if (e.state === 'roar') { if (e.timer <= 0) { e.state = 'lurk'; e.timer = 1; } return; }
      this.whirl(e, C, dt);
      const arms = C.enemies.filter((q) => q.alive && q.summoner === e);
      // the arena drained: stranded, the eye wide open, the arms limp
      if (!full(e)) {
        e.immune = null; e.hintText = 'Stranded! Hit its eye!';
        if (e.state !== 'stranded') {
          e.state = 'stranded'; e.whirl = null;
          C.bubble(e, pick([t('BLORP?!'), t('…glub?')]), 1.6);
          C.shakeAt(e, 0.4);
          for (const q of arms) { q.state = 'lie'; q.timer = 99; q.grabbed = null; }
        }
        return;
      }
      e.immune = 'Too deep!'; e.hintText = 'Too deep to hit — ring the great bell!';
      if (e.state === 'stranded') {
        // (it drags the sea back in: a wave rolls out from it — jump it)
        e.state = 'lurk'; e.tentT = 2.5;
        C.bubble(e, t('GLUB! (the sea comes rushing back)'), 1.8);
        for (const q of arms) { q.state = 'sink'; q.timer = 0.8; }
        this.wave(e, C);
        return;
      }
      if (!tgt) return;
      // arms up through the water, two or three at a time
      e.tentT -= dt;
      const want = e.phase >= 2 ? 3 : 2;
      if (e.tentT <= 0 && arms.length < want) { e.tentT = e.phase >= 3 ? 1.4 : 2.0; this.arm(e, C, tgt, e.phase >= 3 && (e.grabT -= 1) <= 0); }
      e.whirlT -= dt;
      if (e.phase >= 2 && e.whirlT <= 0 && !e.whirl) { e.whirlT = 11; this.startWhirl(e, C, tgt); }
      e.face = { x: tgt.pos.x - e.x, z: tgt.pos.z - e.z };
    },
    // an arm rises somewhere round the heroes (not right under them)
    arm(e, C, tgt, grab) {
      const a = rand(0, Math.PI * 2), d = rand(4.5, 6.5);
      const x = tgt.pos.x + Math.cos(a) * d, z = tgt.pos.z + Math.sin(a) * d;
      const s = C.freeSpot(x, z, 2) || { x, z };
      if (Math.hypot(s.x - e.x, s.z - e.z) < 3) return;
      const q = C.spawn('tentacle', s.x, s.z, { level: e.level, quiet: true });
      q.summoner = e; q.saga = true; q.pool = e.pool; q.grab = grab;
      if (grab) e.grabT = 4;
      C.world.fx.emit('splash', s.x, 0.3, s.z, 14);
      C.sfx('splash', q);
    },
    // a whirlpool round someone: drags whoever is in it to the middle, and bites there
    startWhirl(e, C, tgt) {
      const w = { x: tgt.pos.x, z: tgt.pos.z, r: 4, t: 4.2, warm: 1.1, tick: 0 };
      e.whirl = w;
      C.telegraphCircle(w.x, w.z, w.r, w.warm);
      C.bubble(e, t('Round and round and DOWN!'), 1.6);
      C.sfx('whoosh', e);
    },
    whirl(e, C, dt) {
      const w = e.whirl;
      if (!w) return;
      w.t -= dt;
      if (w.warm > 0) { w.warm -= dt; return; }
      if (w.t <= 0) { e.whirl = null; return; }
      if (Math.random() < dt * 30) { const a = Math.random() * Math.PI * 2, r = Math.random() * w.r; C.world.fx.emit('water', w.x + Math.cos(a) * r, 0.2, w.z + Math.sin(a) * r, 1); }
      w.tick -= dt;
      for (const p of C.alivePlayers()) {
        const dx = w.x - p.pos.x, dz = w.z - p.pos.z, d = Math.hypot(dx, dz);
        if (d > w.r || d < 0.05) continue;
        // (round and in: a pull towards the middle, a little sideways)
        const k = Math.min(d, dt * 1.7);
        p.actor.pos.x += (dx / d) * k + (-dz / d) * k * 0.6; p.actor.pos.z += (dz / d) * k + (dx / d) * k * 0.6;
        if (d < 1.3 && w.tick <= 0) C.hurtPlayer(p, e.def.dmg * 0.45 * (C.enemyDmg || 1), { dir: { x: -dx, z: -dz }, knock: 0.5, src: e });
      }
      if (w.tick <= 0) w.tick = 0.5;
    },
    // (when the sea rushes back: rings of water to jump)
    wave(e, C) {
      for (const [k, r] of [[0.2, 4], [0.7, 7.5], [1.2, 11]]) {
        later(e, k, () => {
          flat(C, new THREE.RingGeometry(Math.max(0.1, r - 0.6), r + 0.6, 48).rotateX(-Math.PI / 2), e.x, e.z, 0x8fd6e8, 0.7);
          later(e, 0.7, () => {
            hurtIn(C, e, (p) => Math.abs(Math.hypot(p.pos.x - e.x, p.pos.z - e.z) - r) < 0.8 && p.actor.jumpY < 0.5, e.def.dmg * 0.7 * (C.enemyDmg || 1), { knock: 3 });
            C.vfx.shockwave(e.x, e.z, { r, color: '#bfe8ff', life: 0.4, wall: 0.6 });
            C.sfx('splash', e);
          });
        });
      }
    },
    pose(e, dt) {
      const u = e.obj.userData, stranded = e.state === 'stranded';
      e.animT = (e.animT || 0) + dt;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z) * 0.35;
      // (low in the water while the sea is in; slumped forward on the tiles when stranded)
      const y = stranded ? 0 : -1.2 + Math.sin(e.t * 1.2) * 0.15;
      u.body.position.y += (y - u.body.position.y) * Math.min(1, dt * 3);
      u.body.rotation.x += ((stranded ? 0.35 : Math.sin(e.t * 0.8) * 0.05) - u.body.rotation.x) * Math.min(1, dt * 3);
      u.lid.position.y = stranded ? 1.05 : 0.62 + (Math.sin(e.t * 0.7) > 0.97 ? -0.45 : 0);
      u.eye.material.emissiveIntensity = stranded ? 1.5 + Math.sin(e.t * 12) * 0.5 : 0.5;
      u.pupil.scale.x = stranded ? 0.55 : 1;
      u.mantle.scale.y = 1.55 + Math.sin(e.t * 2) * 0.04;
    },
  },

  tentacle: {
    init(e) { e.state = 'rise'; e.timer = 0.9; e.immune = 'Splash!'; e.hitOnce = new Set(); },
    onDeath(e, C) {
      // (a severed arm hurts the Kraken dearly)
      const k = e.summoner;
      // (straight through its immunity: `dot` skips the guard)
      if (k && k.alive) { C.hurtEnemy(k, k.maxHp * 0.05, { knock: 0, kind: 'dot', noCombo: true, color: '#ffd66b' }); C.bubble(k, t('BLORP! (ouch)'), 1.2); }
      if (e.grabbed) { e.grabbed.held = null; e.grabbed = null; }
    },
    think(e, dt, tgt, C) {
      tickLater(e, dt);
      e.immuneT = (e.immuneT || 0) - dt;
      const k = e.summoner;
      if (!k || !k.alive) { e.state = 'sink'; }
      if (e.state === 'rise') { if (e.timer <= 0) { e.immune = null; if (e.grab) this.aimGrab(e, C, tgt); else this.aim(e, C, tgt); } return; }
      if (e.state === 'raise' && e.timer <= 0) { this.slam(e, C); return; }
      if (e.state === 'grabbing' && e.timer <= 0) { this.close(e, C); return; }
      if (e.state === 'hold') {
        const p = e.grabbed;
        if (!p || !p.fighter || p.fighter.down || e.timer <= 0) { this.release(e, C, true); return; }
        // (held fast at the tip, squeezed now and then)
        p.actor.pos.x = e.x + e.dir.x * 1.2; p.actor.pos.z = e.z + e.dir.z * 1.2;
        e.tick = (e.tick || 0) - dt;
        if (e.tick <= 0) { e.tick = 0.6; C.hurtPlayer(p, e.def.dmg * 0.35 * (C.enemyDmg || 1), { knock: 0, src: e }); }
        return;
      }
      if (e.state === 'lie' && e.timer <= 0) { e.state = 'sink'; e.timer = 0.8; e.immune = 'Splash!'; return; }
      if (e.state === 'sink' && e.timer <= 0) { e.alive = false; e.fading = 0; e.remove(); }
    },
    aim(e, C, tgt) {
      if (!tgt) { e.state = 'sink'; e.timer = 0.8; return; }
      const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, l = Math.hypot(dx, dz) || 1;
      e.dir = { x: dx / l, z: dz / l }; e.len = 7.5;
      e.state = 'raise'; e.timer = 1.25;
      C.telegraphLine(e, e.dir, e.len, 1.25);
      C.sfx('whoosh', e);
    },
    slam(e, C) {
      e.state = 'lie'; e.timer = 2.4;
      const d = e.dir, L = e.len;
      hurtIn(C, e, (p) => { const px = p.pos.x - e.x, pz = p.pos.z - e.z, u = px * d.x + pz * d.z; return u > 0 && u < L && Math.abs(px * d.z - pz * d.x) < 0.8; }, e.def.dmg * (C.enemyDmg || 1), { knock: 4 });
      for (let k = 1; k < L; k += 1.2) C.world.fx.emit('splash', e.x + d.x * k, 0.3, e.z + d.z * k, 4);
      C.shakeAt(e, 0.35);
      C.sfx('thud', e);
    },
    // (phase 3) a ring round someone: whoever is still in it when it closes is grabbed
    aimGrab(e, C, tgt) {
      if (!tgt) { e.state = 'sink'; e.timer = 0.8; return; }
      const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, l = Math.hypot(dx, dz) || 1;
      e.dir = { x: dx / l, z: dz / l }; e.len = Math.min(l, 6.5);
      e.target = { x: e.x + e.dir.x * e.len, z: e.z + e.dir.z * e.len };
      e.state = 'grabbing'; e.timer = 1.2;
      C.telegraphCircle(e.target.x, e.target.z, 1.5, 1.2);
    },
    close(e, C) {
      const p = C.alivePlayers().find((q) => Math.hypot(q.pos.x - e.target.x, q.pos.z - e.target.z) < 1.5);
      if (!p) { e.state = 'lie'; e.timer = 1.6; e.len = Math.hypot(e.target.x - e.x, e.target.z - e.z); C.sfx('thud', e); return; }
      e.state = 'hold'; e.timer = 3; e.grabbed = p; p.held = e;
      e.len = 1.2;
      C.bubble(e.summoner || e, t('GOT ONE!'), 1.2);
      C.popText(p.pos.x, 2.2, p.pos.z, t('Grabbed! Hit the tentacle!'), '#ff9a8a', true);
      C.sfx('splash', e);
    },
    release(e, C, thrown) {
      const p = e.grabbed;
      e.grabbed = null;
      if (p) { p.held = null; if (thrown && p.fighter && !p.fighter.down) { C.hurtPlayer(p, e.def.dmg * 0.8 * (C.enemyDmg || 1), { dir: { x: e.dir.x, z: e.dir.z }, knock: 7, src: e }); p.actor.jumpV = Math.max(p.actor.jumpV, 6); } }
      e.state = 'sink'; e.timer = 0.8; e.immune = 'Splash!';
    },
    pose(e, dt) {
      const u = e.obj.userData;
      e.animT = (e.animT || 0) + dt;
      if (e.dir) e.obj.rotation.y = Math.atan2(e.dir.x, e.dir.z);
      // up out of the water; raised high; flat along its line; curled round someone; down again
      let lift = 0, bend = 0, curl = 0.08;
      if (e.state === 'rise') lift = Math.max(0, e.timer / 0.9);
      else if (e.state === 'raise') { bend = -0.25 * Math.min(1, (1.25 - e.timer) / 0.5); curl = 0.12; }
      else if (e.state === 'lie') bend = Math.PI / 2 - 0.08;
      else if (e.state === 'grabbing') { bend = -0.2; curl = 0.2 + Math.sin(e.t * 10) * 0.05; }
      else if (e.state === 'hold') { bend = 1.1; curl = 0.5; }
      else if (e.state === 'sink') { lift = 1 - Math.max(0, e.timer / 0.8); bend = u.arm.rotation.x; }
      u.arm.position.y = -7 * lift;
      u.arm.rotation.x += (bend - u.arm.rotation.x) * Math.min(1, dt * (e.state === 'lie' ? 16 : 6));
      u.segs.forEach((s, i) => { if (i) s.rotation.x = curl + Math.sin(e.t * 3 + i) * 0.06; });
    },
  },
};
