// Dino Isle's gloom (Adventure v5): dinosaurs the gloom got into. Each asks
// something different of you, and every attack shows before it lands:
//   raptor   a pack circles you at a distance, then one pounces along a line
//   dilo     flares its frill and spits a venom glob (a poison puddle where it
//            lands); too close, and it screeches you back
//   ptera    wheels overhead, then dives along the line its shadow draws
//   ankylo   armoured in front; spins round with its club tail (a ring: jump it)
//   compy    little swarms: quick nips, and they scatter when hit
//   trike    lowers its horns and charges down a lane (its frill blocks hits
//            from the front: go round it)
// Beat the gloom out of them and they're themselves again: they scamper off
// happy — a raptor or a compsognathus may join your companions, a freed
// triceratops lets you ride it.

import { dinoEnemyModel, animDino, buildDino } from '../../models/dinos3d.js';
import { toward, hover, speedOf, lob, hazard } from '../v3/ai.js';

const rand = (a, b) => a + Math.random() * (b - a);

export const DINO_ENEMIES = {
  raptor: { name: 'Gloom Raptor', hp: 42, speed: 4.3, r: 0.42, h: 1.3, dmg: 12, xp: 12, cost: 2, knockRes: 0.2, animal: 'raptor' },
  dilo: { name: 'Gloom Dilophosaur', hp: 62, speed: 2.4, r: 0.5, h: 1.7, dmg: 13, xp: 15, cost: 3, knockRes: 0.3, elem: 'poison' },
  ptera: { name: 'Gloom Pteranodon', hp: 38, speed: 3.6, r: 0.55, h: 0.8, dmg: 13, xp: 13, cost: 3, flying: true, knockRes: 0.2 },
  ankylo: { name: 'Gloom Ankylosaur', hp: 150, speed: 1.35, r: 0.85, h: 1.3, dmg: 18, xp: 28, cost: 5, knockRes: 0.85, armor: 'front' },
  compy: { name: 'Compsognathus', hp: 12, speed: 4.8, r: 0.26, h: 0.55, dmg: 5, xp: 3, cost: 0.5, knockRes: 0, swarm: 3, animal: 'compy' },
  trike: { name: 'Gloom Triceratops', hp: 200, speed: 1.9, r: 1.0, h: 1.9, dmg: 24, xp: 38, cost: 7, knockRes: 0.9, armor: 'front', mount: 'trike' },
};

// the models: the dinosaur, gloomy, with its clean colours kept for when it's freed
function model(kind, scale = 1) {
  return (r3d) => {
    const g = dinoEnemyModel(r3d, kind, { scale });
    const clean = buildDino(r3d, kind, { gloom: false, saddle: false });
    const a = [], b = [];
    g.userData.rig.root.traverse((m) => { if (m.isMesh) a.push(m); });
    clean.root.traverse((m) => { if (m.isMesh) b.push(m); });
    a.forEach((m, i) => { if (b[i]) m.userData.orig = b[i].material.color.clone(); });
    g.userData.animal = g.userData.rig.root;
    g.userData.eyes = [];
    return g;
  };
}
export const DINO_MODELS = {
  raptor: model('raptor'), dilo: model('dilo'), ptera: model('ptera', 1.2), ankylo: model('ankylo', 1.1),
  compy: model('compy', 1.25), trike: model('trike', 1.15),
};

// pose the rig (turned to face e.face) — shared by every brain
function pose(e, dt, opts = {}) {
  const u = e.obj.userData;
  e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
  const still = e.stun > 0 || e.frozen > 0 || e.state === 'sleep';
  if (u.rig) animDino(u.rig, dt || 1 / 60, { ...opts, speed: still ? 0 : opts.speed || 0 });
  // (gloom wisps curling off its back)
  if (e.alive && !e.freed && Math.random() < (dt || 1 / 60) * (2 + e.def.r * 3)) {
    e.combat.world.fx.emit('sparkle', e.x + rand(-0.4, 0.4) * e.def.r * 2, e.y + e.def.h * 0.85, e.z + rand(-0.4, 0.4) * e.def.r * 2, 1, { color: Math.random() < 0.5 ? '#b88cf0' : '#8a5ac8' });
  }
}
const dirTo = (e, x, z) => { const dx = x - e.x, dz = z - e.z, d = Math.hypot(dx, dz) || 1; return { x: dx / d, z: dz / d, d }; };

export const DINO_BRAINS = {
  // ---- a raptor pack: circle, feint, pounce
  raptor: {
    init(e) { e.circle = Math.random() < 0.5 ? 1 : -1; e.ring = rand(3.2, 4.4); e.timer = rand(1.6, 3.2); e.sp = 0; },
    think(e, dt, tgt, C) {
      const sp = speedOf(e, C), D = dirTo(e, tgt.pos.x, tgt.pos.z);
      if (e.state === 'chase') {
        const a = Math.atan2(e.z - tgt.pos.z, e.x - tgt.pos.x) + e.circle * dt * 1.2;
        const tx = tgt.pos.x + Math.cos(a) * e.ring, tz = tgt.pos.z + Math.sin(a) * e.ring;
        const M = dirTo(e, tx, tz), v = Math.min(sp, M.d * 3);
        C.moveEnemy(e, M.x * v * dt, M.z * v * dt, true);
        e.faceTo(tgt.pos.x, tgt.pos.z);
        e.sp = v;
        if (e.timer <= 0 && D.d < 7.5) {
          e.state = 'mark'; e.timer = 0.55; e.aim = { x: D.x, z: D.z }; e.dist = Math.min(D.d + 1.4, 7);
          C.telegraphLine(e, e.aim, e.dist, 0.55); C.sfx('chirp', e);
        }
      } else if (e.state === 'mark') {
        e.face = e.aim; e.sp = 0;
        if (e.timer <= 0) { e.state = 'pounce'; e.timer = e.dist / 12; e.hitOnce.clear(); e.vy = 5; e.y = 0.02; }
      } else if (e.state === 'pounce') {
        C.moveEnemy(e, e.aim.x * 12 * dt, e.aim.z * 12 * dt);
        C.enemyTouch(e, e.def.dmg * (e.dmgMul || 1), 3.2, 0.5);
        if (e.timer <= 0) { e.state = 'recover'; e.timer = 0.75; }
      } else if (e.state === 'recover') {
        e.sp = 0;
        if (e.timer <= 0) { e.state = 'chase'; e.timer = rand(2.2, 3.6); e.circle = -e.circle; e.ring = rand(3.2, 4.4); }
      }
    },
    pose(e, dt) { pose(e, dt, { speed: e.sp, act: e.state === 'pounce' ? 1 : e.state === 'mark' ? 0.5 : 0 }); },
  },

  // ---- the dilophosaurus: frill, spit, screech
  dilo: {
    init(e) { e.sp = 0; e.scr = 0; },
    think(e, dt, tgt, C) {
      const sp = speedOf(e, C), D = dirTo(e, tgt.pos.x, tgt.pos.z);
      if (e.scr > 0) e.scr -= dt;
      if (e.state === 'chase') {
        if (D.d < 2.2 && e.scr <= 0) { e.state = 'screech'; e.timer = 0.5; C.telegraphCircle(e.x, e.z, 2.5, 0.5); e.sp = 0; return; }
        hover(e, C, tgt, sp, dt, 4, 6.5); e.sp = sp * 0.8;
        if (e.timer <= 0 && D.d < 9) { e.state = 'flare'; e.timer = 0.65; C.sfx('growl', e); }
      } else if (e.state === 'flare') {
        e.faceTo(tgt.pos.x, tgt.pos.z); e.sp = 0;
        if (e.timer <= 0) {
          const at = { x: tgt.pos.x + (tgt.vel ? tgt.vel.x * 0.7 : 0), z: tgt.pos.z + (tgt.vel ? tgt.vel.z * 0.7 : 0) };
          lob(C, e, at, { r: 1.2, dmg: e.def.dmg * (e.dmgMul || 1), t: 0.9, elem: 'poison', look: 'venom', knock: 2 });
          C.vfx.later(0.92, () => hazard(C, { x: at.x, z: at.z, r: 1.15, life: 5, dmg: 0, elem: 'poison', color: 0xd8f050, spark: '#b8f07a', edge: 0x3a5a1a }));
          C.sfx('spit', e);
          e.state = 'chase'; e.timer = rand(2.6, 3.6);
        }
      } else if (e.state === 'screech') {
        if (e.timer <= 0) {
          C.sfx('screech', e);
          C.vfx.shockwave(e.x, e.z, { r: 2.5, color: '#e8583a', life: 0.4, wall: 0.8 });
          for (const p of C.alivePlayers()) {
            const q = dirTo({ x: e.x, z: e.z }, p.pos.x, p.pos.z);
            if (q.d < 2.6 && p.actor.jumpY < 0.6) C.hurtPlayer(p, e.def.dmg * 0.6 * (e.dmgMul || 1), { dir: { x: q.x, z: q.z }, knock: 6, src: e });
          }
          e.state = 'chase'; e.scr = 4.5; e.timer = rand(1.2, 2);
        }
      }
    },
    pose(e, dt) { pose(e, dt, { speed: e.sp, act: e.state === 'flare' ? Math.min(1, (0.65 - e.timer) / 0.3) : e.state === 'screech' ? 1 : 0, roar: e.state === 'screech' ? 1 : 0 }); },
  },

  // ---- the pteranodon: wheels high, then dives down its line
  ptera: {
    init(e) { e.y = 2.9; },
    think(e, dt, tgt, C) {
      if (e.state === 'chase') {
        e.ang = (e.ang ?? Math.random() * 6) + dt * 1.0;
        const tx = tgt.pos.x + Math.cos(e.ang) * 4.6, tz = tgt.pos.z + Math.sin(e.ang) * 3.2;
        C.moveEnemy(e, (tx - e.x) * dt * 2, (tz - e.z) * dt * 2, false, true);
        e.faceTo(tx, tz);
        e.y += (2.9 - e.y) * dt * 3;
        if (e.timer <= 0) {
          const D = dirTo(e, tgt.pos.x, tgt.pos.z);
          e.aim = { x: D.x, z: D.z }; e.dist = D.d + 3;
          e.state = 'mark'; e.timer = 0.75;
          C.telegraphLine(e, e.aim, e.dist, 0.75);
          C.sfx('screech', e);
        }
      } else if (e.state === 'mark') {
        e.face = e.aim;
        e.y += (3.3 - e.y) * dt * 4;
        if (e.timer <= 0) { e.state = 'dive'; e.timer = e.dist / 13; e.hitOnce.clear(); }
      } else if (e.state === 'dive') {
        C.moveEnemy(e, e.aim.x * 13 * dt, e.aim.z * 13 * dt, false, true);
        e.y += (0.55 - e.y) * dt * 10;
        if (e.y < 1.3) C.enemyTouch(e, e.def.dmg * (e.dmgMul || 1), 3.6, 0.6);
        if (e.timer <= 0) { e.state = 'chase'; e.timer = rand(2.4, 3.4); }
      }
    },
    pose(e, dt) {
      const u = e.obj.userData;
      pose(e, dt, { air: e.state !== 'dive', glide: e.state === 'dive' });
      if (u.rig) u.rig.body.rotation.z = e.state === 'dive' ? -0.55 : e.state === 'mark' ? 0.25 : 0;
    },
  },

  // ---- the ankylosaurus: armoured in front, a club tail swung all round
  ankylo: {
    init(e) { e.sp = 0; e.spin = 0; },
    think(e, dt, tgt, C) {
      const sp = speedOf(e, C);
      if (e.state === 'chase') {
        const d = toward(e, C, tgt, sp, dt, 1.7); e.sp = d > 1.7 ? sp : 0;
        if (e.timer <= 0 && d < 3) { e.state = 'wind'; e.timer = 0.8; C.telegraphCircle(e.x, e.z, 2.4, 0.8); C.sfx('growl', e); e.sp = 0; }
      } else if (e.state === 'wind') {
        if (e.timer <= 0) { e.state = 'spin'; e.timer = 0.9; e.hitOnce.clear(); C.sfx('whoosh', e); C.vfx.whirl(() => ({ x: e.x, y: e.y - 0.25, z: e.z }), { r: 2.2, color: '#f0dca0', life: 0.9 }); }
      } else if (e.state === 'spin') {
        e.spin += dt * 16;
        e.face = { x: Math.sin(e.spin), z: Math.cos(e.spin) };
        for (const p of C.alivePlayers()) {
          if (e.hitOnce.has(p)) continue;
          const q = dirTo({ x: e.x, z: e.z }, p.pos.x, p.pos.z);
          if (q.d < 2.4 && p.actor.jumpY < 0.7) { e.hitOnce.add(p); C.hurtPlayer(p, e.def.dmg * (e.dmgMul || 1), { dir: { x: q.x, z: q.z }, knock: 4.6, src: e }); }
        }
        if (e.timer <= 0) { e.state = 'rest'; e.timer = 1.3; C.world.fx.emit('dust', e.x, 0.1, e.z, 10); }
      } else if (e.state === 'rest') {
        e.sp = 0;
        if (e.timer <= 0) { e.state = 'chase'; e.timer = rand(1.6, 2.6); }
      }
    },
    pose(e, dt) { pose(e, dt, { speed: e.sp, act: e.state === 'spin' ? 1 : e.state === 'wind' ? 0.4 : 0 }); },
  },

  // ---- compsognathus: a swarm of quick little nips
  compy: {
    init(e) { e.sp = 0; e.flee = 0; e.jit = Math.random() * 6; },
    think(e, dt, tgt, C) {
      const sp = speedOf(e, C), D = dirTo(e, tgt.pos.x, tgt.pos.z);
      if (e.flee > 0) {
        e.flee -= dt;
        C.moveEnemy(e, -D.x * sp * dt, -D.z * sp * dt, true); e.faceTo(e.x - D.x, e.z - D.z); e.sp = sp;
        return;
      }
      if (e.state === 'chase') {
        e.jit += dt * 5;
        const wx = Math.cos(e.jit) * 0.5, wz = Math.sin(e.jit * 1.3) * 0.5;
        const M = dirTo(e, tgt.pos.x + wx, tgt.pos.z + wz);
        if (D.d > 0.7) { C.moveEnemy(e, M.x * sp * dt, M.z * sp * dt, true); e.sp = sp; } else e.sp = 0;
        e.faceTo(tgt.pos.x, tgt.pos.z);
        if (D.d < 0.9 && e.timer <= 0) { e.state = 'nip'; e.timer = 0.25; e.hitOnce.clear(); e.vy = 3.2; e.y = 0.02; C.sfx('chirp', e); }
      } else if (e.state === 'nip') {
        C.moveEnemy(e, e.face.x * 5 * dt, e.face.z * 5 * dt);
        C.enemyTouch(e, e.def.dmg * (e.dmgMul || 1), 1.6, 0.4);
        if (e.timer <= 0) { e.state = 'chase'; e.timer = rand(0.8, 1.4); e.flee = rand(0.4, 0.8); }
      }
    },
    // (hit: it scatters for a moment)
    onHit(e) { e.flee = 0.6; },
    pose(e, dt) { pose(e, dt, { speed: e.sp, act: e.state === 'nip' ? 1 : 0 }); },
  },

  // ---- a gloomy triceratops: paws the ground, then charges down a lane
  trike: {
    init(e) { e.sp = 0; },
    think(e, dt, tgt, C) {
      const sp = speedOf(e, C), D = dirTo(e, tgt.pos.x, tgt.pos.z);
      if (e.state === 'chase') {
        hover(e, C, tgt, sp, dt, 3.5, 6); e.sp = sp * 0.7;
        if (e.timer <= 0 && D.d < 10) {
          e.state = 'paw'; e.timer = 0.9; e.aim = { x: D.x, z: D.z }; e.dist = Math.min(12, D.d + 4);
          C.telegraphLine(e, e.aim, e.dist, 0.9); C.sfx('roar', e);
        }
      } else if (e.state === 'paw') {
        e.face = e.aim; e.sp = 0.8;
        if (Math.random() < dt * 12) C.world.fx.emit('dust', e.x - e.aim.x * 0.8, 0.1, e.z - e.aim.z * 0.8, 1);
        if (e.timer <= 0) { e.state = 'charge'; e.timer = e.dist / 11; e.hitOnce.clear(); }
      } else if (e.state === 'charge') {
        const ok = C.moveEnemy(e, e.aim.x * 11 * dt, e.aim.z * 11 * dt);
        e.sp = 11;
        if (Math.random() < dt * 30) C.world.fx.emit('dust', e.x - e.aim.x, 0.1, e.z - e.aim.z, 1);
        C.enemyTouch(e, e.def.dmg * (e.dmgMul || 1), 5.5, 0.7);
        if (!ok || e.timer <= 0) {
          if (!ok) { C.sfx('slam', e); C.party.cam.shake = Math.max(C.party.cam.shake || 0, 0.3); e.stun = 1.2; }
          e.state = 'rest'; e.timer = 1.0;
        }
      } else if (e.state === 'rest') {
        e.sp = 0;
        if (e.timer <= 0) { e.state = 'chase'; e.timer = rand(2, 3); }
      }
    },
    pose(e, dt) { pose(e, dt, { speed: e.sp, act: e.state === 'charge' || e.state === 'paw' ? 1 : 0, roar: e.state === 'paw' ? 0.4 : 0 }); },
  },
};

