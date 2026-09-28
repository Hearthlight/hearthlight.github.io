// The Tyrant King, Dino Isle's guardian (Adventure v5): a great crowned
// T-rex the gloom got into, asleep in his nest of branches by Fernpeak. Three
// phases (at two thirds and a third of his health); every blow shows first:
//   chomp     a cone in front of him, then his jaws snap shut
//   sweep     a ring all round: his tail swings (jump it!)
//   charge    a lane glows, he paws the ground and thunders down it — ram
//             him into a rock or a tree and he's dizzy (hit him hard then)
//   bellow    (phase 2+) a roar that blows you back and calls his pack
//   quake     (phase 3) three stomps: rocks tumble down from the peak
// Beaten, he's himself again — green, gold-crowned — and stomps off.

import { THREE, toon } from '../../render/r3d.js';
import { dinoEnemyModel, buildDino, animDino } from '../../models/dinos3d.js';
import { toward, speedOf } from '../v3/ai.js';
import { cone, later, tickLater, hurtIn, checkPhase, leash } from '../v3/bosses.js';
import { t } from '../../i18n.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const SCALE = 1.5;

export const TYRANT_ENEMIES = {
  rex: { name: 'Tyrant King', title: 'The Tyrant King', hp: 1500, speed: 2.3, r: 1.5, h: 4.3, dmg: 30, xp: 320, cost: 99, boss: true, knockRes: 1, walkOff: 4.5 },
};

// ------------------------------------------------------------------ the model
// his crown (gold, a gloom-purple gem) and the stars of a dizzy spell, on his head
export function crown(r3d, rig) {
  const head = rig.head, g = new THREE.Group();
  g.position.set(0.2, 0.6, 0); head.add(g);
  const gold = toon(r3d, { color: '#f2c14e', emissive: '#6a4a10', emissiveIntensity: 0.5, key: 'rexgold' });
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.62), gold); g.add(band);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2, sp = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 4), gold);
    sp.position.set(Math.cos(a) * 0.26, 0.2, Math.sin(a) * 0.26); g.add(sp);
  }
  const gem = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.14), toon(r3d, { color: '#c89aff', emissive: '#8a3aff', emissiveIntensity: 1.2, key: 'rexgem' }));
  gem.position.set(0.32, 0.02, 0); g.add(gem);
  const stars = new THREE.Group(); stars.position.set(0.3, 1.25, 0); head.add(stars);
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), toon(r3d, { color: '#fff3a0', emissive: '#ffd84a', emissiveIntensity: 1.4, key: 'rexstar' }));
    const a = (i / 4) * Math.PI * 2; s.position.set(Math.cos(a) * 0.85, Math.sin(a * 2) * 0.12, Math.sin(a) * 0.85); stars.add(s);
  }
  stars.visible = false;
  return { crown: g, gem, stars };
}

function rexModel(r3d) {
  const g = dinoEnemyModel(r3d, 'rex', { scale: SCALE });
  const rig = g.userData.rig, clean = buildDino(r3d, 'rex', { gloom: false, saddle: false });
  const mine = crown(r3d, rig);
  crown(r3d, clean);                   // (the same meshes in the same order: the colours line up)
  mine.crown.traverse((m) => { if (m.isMesh) m.material = m.material.clone(); });
  mine.stars.traverse((m) => { if (m.isMesh) m.material = m.material.clone(); });
  const a = [], b = [];
  rig.root.traverse((m) => { if (m.isMesh) a.push(m); });
  clean.root.traverse((m) => { if (m.isMesh) b.push(m); });
  a.forEach((m, i) => { if (b[i]) m.userData.orig = b[i].material.color.clone(); });
  Object.assign(g.userData, { animal: rig.root, eyes: [], ...mine });
  return g;
}
export const TYRANT_MODELS = { rex: rexModel };

// ------------------------------------------------------------------ the brain
const dirTo = (e, x, z) => { const dx = x - e.x, dz = z - e.z, d = Math.hypot(dx, dz) || 1; return { x: dx / d, z: dz / d, d }; };
const inCone = (e, p, len, half) => { const D = dirTo(e, p.pos.x, p.pos.z); return D.d < len && D.x * e.aim.x + D.z * e.aim.z > Math.cos(half); };

export const TYRANT_BRAINS = {
  rex: {
    init(e) { e.phase = 1; e.timer = 1.8; e.sp = 0; e.spin = 0; e.dizzy = 0; e.bellowCd = 0; e.bite = 0; },
    think(e, dt, tgt, C) {
      tickLater(e, dt); leash(e, C);
      if (e.bellowCd > 0) e.bellowCd -= dt;
      if (e.dizzy > 0) {
        e.dizzy -= dt; e.sp = 0;
        if (e.dizzy <= 0) { e.state = 'recover'; e.timer = 0.5; }
        return;
      }
      if (checkPhase(e, C, (ph) => this.pack(e, C, ph))) { e.spin = 0; e.sp = 0; return; }
      if (e.state === 'roar') { e.sp = 0; if (e.timer <= 0) { e.state = 'chase'; e.timer = 0.8; } return; }
      const sp = speedOf(e, C) * (e.phase >= 3 ? 1.3 : 1);
      if (e.state === 'chase') {
        const d = toward(e, C, tgt, sp, dt, 3.4); e.sp = d > 3.4 ? sp : 0;
        if (e.timer > 0) return;
        const r = Math.random();
        if (this.behind(e, C) && r < 0.7) this.sweep(e, C);
        else if (d < 4.4) { if (r < 0.6) this.chomp(e, C, tgt); else this.sweep(e, C); }
        else if (e.phase >= 3 && r < 0.3) this.quake(e, C);
        else if (e.phase >= 2 && r < 0.55 && e.bellowCd <= 0) this.bellow(e, C);
        else if (r < 0.8 && this.lane(e, C, tgt)) { e.charges = e.phase >= 3 ? 2 : 1; this.aimCharge(e, C, tgt, 1.0); }
        else if (e.phase >= 2 && e.bellowCd <= 0) this.bellow(e, C);
        else e.timer = 0.6;
      } else if (e.state === 'chompAim') {
        e.face = e.aim; e.sp = 0;
        if (e.timer <= 0) {
          C.moveEnemy(e, e.aim.x * 0.8, e.aim.z * 0.8);
          hurtIn(C, e, (p) => inCone(e, p, 4.6, 0.62), e.def.dmg, { knock: 6 });
          C.sfx('snap', e); C.sfx('slam', e); C.shakeAt(e, 0.35);
          e.bite = 0.25; e.state = 'recover'; e.timer = 0.7;
        }
      } else if (e.state === 'sweepAim') {
        e.sp = 0;
        if (e.timer <= 0) {
          e.state = 'sweep'; e.timer = 0.5; e.spin = 0; e.hitOnce.clear();
          C.sfx('whoosh', e);
          C.vfx.whirl(() => ({ x: e.x, y: -0.2, z: e.z }), { r: 3.6, color: '#f0dca0', life: 0.55, speed: 12 });
        }
      } else if (e.state === 'sweep') {
        e.spin += dt * (Math.PI * 2 / 0.5);
        for (const p of C.alivePlayers()) {
          if (e.hitOnce.has(p)) continue;
          const D = dirTo(e, p.pos.x, p.pos.z);
          if (D.d < 3.8 && p.actor.jumpY < 0.7) { e.hitOnce.add(p); C.hurtPlayer(p, e.def.dmg * 0.75, { dir: { x: D.x, z: D.z }, knock: 6.5, src: e }); }
        }
        if (e.timer <= 0) { e.spin = 0; e.state = 'recover'; e.timer = 0.6; C.world.fx.emit('dust', e.x, 0.1, e.z, 12); }
      } else if (e.state === 'chargeAim') {
        e.face = e.aim; e.sp = 0.8;
        if (Math.random() < dt * 14) C.world.fx.emit('dust', e.x - e.aim.x * 1.2, 0.1, e.z - e.aim.z * 1.2, 1);
        if (e.timer <= 0) { e.state = 'charge'; e.timer = e.dist / 12; e.run = 0; e.hitOnce.clear(); C.sfx('roar', e); }
      } else if (e.state === 'charge') {
        const ok = C.moveEnemy(e, e.aim.x * 12 * dt, e.aim.z * 12 * dt);
        e.sp = 12; e.run += 12 * dt;
        if (Math.random() < dt * 30) C.world.fx.emit('dust', e.x - e.aim.x * 1.4, 0.1, e.z - e.aim.z * 1.4, 1);
        C.enemyTouch(e, e.def.dmg * 1.1, 7, 0.9);
        if (!ok && e.run < 2.5) { e.state = 'recover'; e.timer = 0.6; return; }        // (no run-up: he just stops)
        if (!ok) {
          // rammed a rock (or a tree): he's seeing stars
          e.dizzy = 2.6; e.state = 'dizzy'; e.sp = 0;
          C.sfx('slam', e); C.sfx('bonk', e); C.shakeAt(e, 0.8);
          C.world.fx.emit('dust', e.x + e.aim.x * 1.5, 0.6, e.z + e.aim.z * 1.5, 14);
          C.bubble(e, t('Dizzy!'), 1.6);
          return;
        }
        if (e.timer <= 0) {
          e.charges--;
          const q = e.charges > 0 && C.alivePlayers().length ? pick(C.alivePlayers()) : null;
          if (q && this.lane(e, C, q)) this.aimCharge(e, C, q, 0.6);
          else { e.state = 'recover'; e.timer = 0.9; }
        }
      } else if (e.state === 'bellowAim') {
        e.sp = 0;
        if (e.timer <= 0) {
          C.sfx('roar', e); later(e, 0.15, () => C.sfx('roar', e));
          C.shakeAt(e, 0.9);
          C.vfx.shockwave(e.x, e.z, { r: 7, color: '#e8583a', life: 0.6, wall: 1.2 });
          hurtIn(C, e, (p) => Math.hypot(p.pos.x - e.x, p.pos.z - e.z) < 7 && p.actor.jumpY < 0.6, e.def.dmg * 0.4, { knock: 8 });
          this.pack(e, C, e.phase);
          e.bellowCd = 11; e.state = 'recover'; e.timer = 1.0;
        }
      } else if (e.state === 'quake') {
        e.sp = 0;
        if (e.timer <= 0) {
          e.stomps--;
          C.sfx('stomp', e); C.shakeAt(e, 0.6);
          C.vfx.shockwave(e.x, e.z, { r: 3, color: '#c8b078', life: 0.4, wall: 0.6 });
          hurtIn(C, e, (p) => Math.hypot(p.pos.x - e.x, p.pos.z - e.z) < 3 && p.actor.jumpY < 0.6, e.def.dmg * 0.5, { knock: 4 });
          // rocks shaken loose from the peak, over everyone's heads
          for (const p of C.alivePlayers()) {
            const x = p.pos.x + rand(-1, 1), z = p.pos.z + rand(-1, 1);
            C.zone({ x, z, r: 1.3, delay: 1.1, dmg: e.def.dmg * 0.6, knock: 3, kind: 'bomb', gloom: true, arc: { x: x + rand(-3, 3), y: 10, z: z - 6 }, look: 'rock' });
          }
          e.timer = 0.6;
          if (e.stomps <= 0) { e.state = 'recover'; e.timer = 1.2; }
        }
      } else if (e.state === 'recover') {
        e.sp = 0;
        if (e.timer <= 0) { e.state = 'chase'; e.timer = rand(0.9, 1.6) / (e.phase >= 3 ? 1.4 : 1); }
      }
    },
    // someone creeping round his back? the tail knows
    behind(e, C) {
      return C.alivePlayers().some((p) => { const D = dirTo(e, p.pos.x, p.pos.z); return D.d < 4.2 && D.x * e.face.x + D.z * e.face.z < -0.35; });
    },
    chomp(e, C, tgt) {
      const D = dirTo(e, tgt.pos.x, tgt.pos.z);
      e.aim = { x: D.x, z: D.z }; e.face = e.aim;
      cone(C, e.x, e.z, e.aim, 4.6, 1.24, 0.65, 0xff5a6a);
      e.state = 'chompAim'; e.timer = 0.65;
      C.sfx('growl', e);
    },
    sweep(e, C) {
      C.telegraphCircle(e.x, e.z, 3.8, 0.75);
      e.state = 'sweepAim'; e.timer = 0.75;
    },
    // a lane he can actually thunder down (not straight into his nest's branches)
    lane(e, C, tgt) {
      const D = dirTo(e, tgt.pos.x, tgt.pos.z), col = C.world.overCol;
      for (const s of [1, 2, 3]) if (col.blocked(e.x + D.x * s, e.z + D.z * s, 0.45)) return false;
      return true;
    },
    aimCharge(e, C, tgt, secs) {
      const D = dirTo(e, tgt.pos.x, tgt.pos.z);
      e.aim = { x: D.x, z: D.z }; e.face = e.aim;
      e.dist = Math.min(14, D.d + 5);
      C.telegraphLine(e, e.aim, e.dist, secs);
      e.state = 'chargeAim'; e.timer = secs;
      C.sfx('growl', e);
    },
    bellow(e, C) {
      C.telegraphCircle(e.x, e.z, 7, 1.0);
      e.state = 'bellowAim'; e.timer = 1.0;
      C.bubble(e, t('ROOAAR!'), 1.2);
    },
    quake(e, C) {
      e.state = 'quake'; e.timer = 0.5; e.stomps = 3;
      C.bubble(e, t('STOMP! STOMP!'), 1.4);
    },
    // his pack comes running out of the ferns (raptors; a dilophosaurus & compys later on)
    pack(e, C, ph) {
      const have = C.enemies.filter((q) => q.alive && q.pack === e).length;
      const want = ph >= 3 ? ['raptor', 'raptor', 'dilo', 'compy', 'compy', 'compy'] : ['raptor', 'raptor'];
      for (const ty of want.slice(0, Math.max(0, 6 - have))) {
        const a = rand(0, Math.PI * 2), s = C.freeSpot(e.x + Math.cos(a) * 7, e.z + Math.sin(a) * 6, 1);
        if (!s) continue;
        const q = C.spawn(ty, s.x, s.z);
        q.pack = e;
      }
    },
    pose(e, dt) {
      const u = e.obj.userData, st = e.state;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z) + (e.spin || 0);
      if (e.bite > 0) e.bite -= dt;
      const roar = st === 'roar' || st === 'bellowAim' ? 1 : st === 'chompAim' ? 0.8 : e.dizzy > 0 ? 0.3 : 0;
      const act = st === 'charge' || st === 'chargeAim' ? 1 : 0;
      animDino(u.rig, dt || 1 / 60, { speed: e.stun > 0 || e.frozen > 0 ? 0 : e.sp || 0, act, roar });
      // dizzy: stars round his head, the head lolls
      u.stars.visible = e.dizzy > 0 && e.alive;
      if (u.stars.visible) { u.stars.rotation.y += (dt || 1 / 60) * 5; u.rig.head.rotation.x = Math.sin(e.t * 6) * 0.25; } else u.rig.head.rotation.x = 0;
      // the gem burns red once he's furious
      if (!e.freed && e.alive) u.gem.material.emissive.setHex(e.phase >= 3 ? 0xff3a3a : 0x8a3aff);
      if (e.alive && Math.random() < (dt || 1 / 60) * 6) e.combat.world.fx.emit('sparkle', e.x + rand(-1, 1), e.y + e.def.h * 0.8, e.z + rand(-1, 1), 1, { color: Math.random() < 0.5 ? '#b88cf0' : '#8a5ac8' });
    },
  },
};
