// The big world's gloom creatures: how each one fights. Every brain reads
// clearly — a flash, a dashed line or a warning circle before anything hurts
// — and each asks something different of the party:
//   burrower  tunnels under you and bursts up (dodge the circle)
//   imp       runs in, lights its fuse and pops (it hurts its friends too)
//   wisp      hovers out of reach, fans of ice shards (chill)
//   toad      tongue-grabs from afar, then a poison burp
//   shaman    summons sporelings and lobs homing spores (go for it first)
//   mender    heals its friends with a green beam (interrupt it!)
//   knight    shield up front (flank it, or break it with heavy hits)
//   beetle    armour shrugs off light hits; curls up and rolls, bouncing off walls
//   harpy     high circles, a long telegraphed dive, feather fans
//   slinger   keeps its distance and lobs bombs; runs if you close in
//   reefcrab  scuttles sideways round you, blocks from the front, bubbles
//   ghost     fades away and reappears behind someone
//   slug      slow, leaves a burning trail, spits lava
//   stormcrow dive-bombs with a thunderclap
//   totem     shields everyone around it — topple it first
//   worm      a big one: travels under the sand and erupts along a line
//   yeti      snowballs from afar, a chilling ground pound up close
// Elites (a golden ring and a ★) are tougher, hit harder and have a trick.

import { THREE } from '../../render/r3d.js';
import { audio } from '../../engine/audio.js';
import { t } from '../../i18n.js';
import { MODELS, eliteAura } from './bestiary3d.js';
import { BOSS_ENEMIES, BOSS_BRAINS, BOSS_MODELS } from './bosses.js';
import { DINO_ENEMIES, DINO_BRAINS, DINO_MODELS } from '../v5/dinofoes.js';
import { TYRANT_ENEMIES, TYRANT_BRAINS, TYRANT_MODELS } from '../v5/tyrant.js';
import { NEWGLOOM_ENEMIES, NEWGLOOM_BRAINS, NEWGLOOM_MODELS } from '../v5/newgloom.js';
import { TROUPE_ENEMIES, TROUPE_BRAINS, TROUPE_MODELS } from '../v7/troupe.js';
import { WOODS_ENEMIES, WOODS_BRAINS, WOODS_MODELS } from '../v7/woods.js';
import { CANYON_ENEMIES, CANYON_BRAINS, CANYON_MODELS } from '../v7/canyon.js';
import { FROST_ENEMIES, FROST_BRAINS, FROST_MODELS } from '../v7/frost.js';
import { SEA_ENEMIES, SEA_BRAINS, SEA_MODELS } from '../v7/sea.js';
import { DUCHESS_ENEMIES, DUCHESS_BRAINS, DUCHESS_MODELS } from '../v7/duchess.js';
import { DAWN_ENEMIES, DAWN_BRAINS, DAWN_MODELS, DAWN_ZONE_FOES } from '../v7/dawn.js';
import { MOTH_ENEMIES, MOTH_BRAINS, MOTH_MODELS, MOTH_ZONE_FOES } from '../v7/moths.js';
import { MANOR_ENEMIES, MANOR_BRAINS, MANOR_MODELS, MANOR_ZONE_FOES } from '../v7/manor.js';
import { FINALE_ENEMIES, FINALE_BRAINS, FINALE_MODELS } from '../v7/finale.js';
import { WORLD_BOSSES, WORLD_BRAINS, WORLD_MODELS } from '../v7/world.js';
import { GRANDMA_ENEMIES, GRANDMA_BRAINS, GRANDMA_MODELS } from '../v9/grandma.js';
import { toward, hover, speedOf, beam, lob, hazard } from './ai.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const NEW_ENEMIES = {
  burrower: { name: 'Dune Burrower', hp: 46, speed: 3.4, r: 0.4, h: 0.7, dmg: 14, xp: 12, cost: 2, knockRes: 0.3 },
  imp: { name: 'Ember Imp', hp: 22, speed: 3.7, r: 0.3, h: 0.75, dmg: 22, xp: 8, cost: 2, knockRes: 0, elem: 'fire' },
  wisp: { name: 'Frost Wisp', hp: 26, speed: 2.8, r: 0.32, h: 0.5, dmg: 9, xp: 10, cost: 2, flying: true, elem: 'ice', knockRes: 0.2 },
  toad: { name: 'Bog Toad', hp: 70, speed: 1.4, r: 0.5, h: 0.8, dmg: 12, xp: 14, cost: 3, elem: 'poison', knockRes: 0.5 },
  shaman: { name: 'Spore Shaman', hp: 55, speed: 1.9, r: 0.36, h: 1.0, dmg: 8, xp: 16, cost: 4, knockRes: 0.2 },
  sporeling: { name: 'Sporeling', hp: 12, speed: 3.1, r: 0.24, h: 0.45, dmg: 5, xp: 2, cost: 0.5, knockRes: 0 },
  mender: { name: 'Gloom Mender', hp: 40, speed: 2.6, r: 0.3, h: 0.9, dmg: 0, xp: 14, cost: 3, knockRes: 0.1 },
  knight: { name: 'Shieldbearer', hp: 70, speed: 1.5, r: 0.42, h: 1.1, dmg: 16, xp: 18, cost: 4, knockRes: 0.6, shield: 60, armorPts: 0.25 },
  beetle: { name: 'Armour Beetle', hp: 80, speed: 1.6, r: 0.5, h: 0.8, dmg: 16, xp: 16, cost: 4, knockRes: 0.8, armorPts: 0.6 },
  harpy: { name: 'Cloud Harpy', hp: 48, speed: 3.2, r: 0.4, h: 0.8, dmg: 12, xp: 14, cost: 3, flying: true, knockRes: 0.2 },
  slinger: { name: 'Canyon Slinger', hp: 34, speed: 2.8, r: 0.32, h: 0.7, dmg: 14, xp: 12, cost: 3, knockRes: 0.1 },
  reefcrab: { name: 'Reef Crab', hp: 60, speed: 2.4, r: 0.45, h: 0.7, dmg: 11, xp: 13, cost: 3, armor: 'front', knockRes: 0.6 },
  ghost: { name: 'Drowned Sailor', hp: 50, speed: 2.2, r: 0.36, h: 1.3, dmg: 15, xp: 16, cost: 3, knockRes: 0.3 },
  slug: { name: 'Lava Slug', hp: 90, speed: 0.9, r: 0.45, h: 0.6, dmg: 12, xp: 15, cost: 3, elem: 'fire', knockRes: 0.7 },
  stormcrow: { name: 'Storm Crow', hp: 30, speed: 3.4, r: 0.32, h: 0.5, dmg: 13, xp: 11, cost: 2, flying: true, elem: 'shock', knockRes: 0 },
  totem: { name: 'Gloom Totem', hp: 90, speed: 0, r: 0.4, h: 1.5, dmg: 0, xp: 20, cost: 4, knockRes: 1 },
  worm: { name: 'Sandworm', hp: 280, speed: 2.4, r: 0.8, h: 1.2, dmg: 22, xp: 45, cost: 8, knockRes: 0.9 },
  yeti: { name: 'Frost Yeti', hp: 160, speed: 1.7, r: 0.6, h: 1.7, dmg: 20, xp: 32, cost: 6, elem: 'ice', knockRes: 0.8 },
};

// which gloom lives where (the Explore camps pick from these)
export const ZONE_FOES = {
  deepwood: ['gloomling', 'fox', 'stag', 'crow', 'mender', 'biggloom', 'rootling'],
  heights: ['wisp', 'harpy', 'stormcrow', 'knight', 'mender', 'kite', 'kite'],
  bouncecap: ['shaman', 'puffcap', 'gloomling', 'biggloom'],
  glacier: ['wisp', 'yeti', 'knight', 'gloomling', 'frostimp', 'frostimp'],
  cloud: ['harpy', 'stormcrow', 'wisp'],
  steppe: ['slinger', 'beetle', 'knight', 'fox', 'mender', 'tumble', 'tumble'],
  canyon: ['slinger', 'beetle', 'knight', 'stormcrow', 'mole', 'mole', 'fuse'],
  dunes: ['burrower', 'slinger', 'beetle'],
  sunken: ['ghost', 'reefcrab', 'mender', 'jelly'],
  lagoon: ['reefcrab', 'slinger', 'crow', 'jelly', 'jelly'],
  marsh: ['toad', 'shaman', 'mender', 'gloomling'],
  volcano: ['imp', 'slug', 'knight', 'imp'],
  dino: ['raptor', 'raptor', 'dilo', 'ptera', 'ankylo', 'compy', 'raptor'],
};
export const ZONE_BIG = { dunes: 'worm', glacier: 'yeti', volcano: 'slug', marsh: 'toad', canyon: 'beetle', heights: 'knight', dino: 'trike' };
export const AFFIXES = ['swift', 'bulwark', 'vampiric', 'splitter'];

// ------------------------------------------------------------------ brains
export const BRAINS = {
  burrower: {
    init(e) { e.state = e.state === 'sleep' ? 'sleep' : 'under'; e.under = e.state !== 'sleep'; },
    think(e, dt, tgt, C) {
      const u = e.obj.userData, sp = speedOf(e, C);
      if (!tgt) return;
      if (e.state === 'chase') { e.state = 'under'; e.under = true; }
      if (e.state === 'under') {
        e.under = true;
        const d = toward(e, C, tgt, sp * 1.35, dt, 0.2);
        if (Math.random() < dt * 14) C.world.fx.emit('dust', e.x, 0.05, e.z, 1, { color: '#c8a468' });
        if (d < 0.7) { e.state = 'rise'; e.timer = 0.75; C.telegraphCircle(e.x, e.z, 1.15, 0.75); C.sfx('dig', e); }
      } else if (e.state === 'rise') {
        if (Math.random() < dt * 20) C.world.fx.emit('dust', e.x + rand(-0.5, 0.5), 0.1, e.z + rand(-0.5, 0.5), 1, { color: '#c8a468' });
        if (e.timer <= 0) {
          e.under = false; e.state = 'up'; e.timer = 1.9; e.hitOnce.clear();
          C.vfx.shockwave(e.x, e.z, { r: 1.3, color: '#e0c088', life: 0.35, wall: 0.6 }); C.vfx.debris(e.x, e.z, { n: 10, r: 0.5, color: '#c8a468', up: 6 });
          C.sfx('slam', e);
          for (const p of C.alivePlayers()) {
            const dd = Math.hypot(p.pos.x - e.x, p.pos.z - e.z);
            if (dd < 1.25 && p.actor.jumpY < 0.5) { C.hurtPlayer(p, e.def.dmg * (e.dmgMul || 1), { dir: { x: p.pos.x - e.x, z: p.pos.z - e.z }, knock: 2.5, src: e }); p.actor.jumpV = Math.max(p.actor.jumpV, 7); }
          }
        }
      } else if (e.state === 'up') {
        const d = toward(e, C, tgt, 0, dt, 99);
        if (d < 1.2 && e.timer < 1.5 && !e.bit) { e.bit = true; C.enemyTouch(e, e.def.dmg * 0.7, 2, 0.8); C.sfx('snap', e); }
        if (e.timer <= 0) { e.state = 'dig'; e.timer = 0.45; e.bit = false; }
      } else if (e.state === 'dig') {
        if (e.timer <= 0) { e.state = 'under'; e.under = true; C.world.fx.emit('dust', e.x, 0.1, e.z, 8, { color: '#c8a468' }); }
      }
      void u;
    },
    pose(e) {
      const u = e.obj.userData, under = e.under && e.state !== 'up';
      const k = e.state === 'dig' ? Math.max(0, e.timer / 0.45) : 1;
      u.body.visible = !under || e.state === 'dig';
      u.mound.visible = under && e.state !== 'dig';
      u.body.position.y = e.state === 'dig' ? -(1 - k) * 0.7 : 0;
      u.drill.rotation.z += 0.4;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      if (u.mound.visible) u.mound.scale.set(1 + Math.sin(e.t * 20) * 0.08, 1, 1 + Math.cos(e.t * 20) * 0.08);
      e.shadow.visible = !under;
    },
  },

  imp: {
    think(e, dt, tgt, C) {
      if (!tgt) return;
      const sp = speedOf(e, C);
      if (e.state === 'chase') {
        const d = toward(e, C, tgt, sp, dt, 0.8);
        if (d < 1.4) { e.state = 'fuse'; e.timer = 1.0; C.sfx('sizzle', e); C.bubble(e, '!!'); }
      } else if (e.state === 'fuse') {
        toward(e, C, tgt, sp * 0.35, dt, 0.5);
        if (Math.random() < dt * 30) C.world.fx.emit('sparkle', e.x, 0.9, e.z, 1, { color: '#ffd23a' });
        if (e.timer <= 0) BRAINS.imp.boom(e, C);
      }
    },
    // pop! players AND gloom nearby get singed (chain reactions welcome)
    boom(e, C) {
      if (e.boomed) return;
      e.boomed = true;
      C.blast(e.x, e.z, 1.8, e.def.dmg * (e.dmgMul || 1), 4, { gloom: true, elem: 'fire', boom: true, color: '#ff8a3a' });
      for (const o of C.enemies) if (o !== e && o.hurtable && Math.hypot(o.x - e.x, o.z - e.z) < 1.9) C.hurtEnemy(o, 14, { dir: { x: o.x - e.x, z: o.z - e.z }, knock: 2.5, kind: 'aoe', elem: 'fire', noCombo: true });
      if (e.alive) { e.alive = false; e.fading = 0.01; e.silent = true; }
    },
    onDeath(e, C) { if (e.state === 'fuse') BRAINS.imp.boom(e, C); },
    pose(e) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      const hop = e.state === 'chase' ? Math.abs(Math.sin(e.t * 14)) * 0.12 : 0;
      u.body.position.y = hop;
      const fuse = e.state === 'fuse';
      const s = fuse ? 1 + (1 - Math.max(0, e.timer)) * 0.35 + Math.sin(e.t * 40) * 0.05 : 1;
      u.body.scale.setScalar(s);
      if (fuse) e.setFlash(Math.floor(e.t * (8 + (1 - e.timer) * 20)) % 2 === 0 ? 1 : 0);
      u.flame.scale.y = 1 + Math.sin(e.t * 18) * 0.2;
    },
  },

  wisp: {
    init(e) { e.y = 1.7; },
    think(e, dt, tgt, C) {
      if (!tgt) return;
      const sp = speedOf(e, C);
      e.y += (1.7 + Math.sin(e.t * 2) * 0.15 - e.y) * dt * 3;
      if (e.state === 'chase') {
        hover(e, C, tgt, sp, dt, 4.2, 6.5, true);
        if (e.timer <= 0) { e.state = 'aim'; e.timer = 0.55; }
      } else if (e.state === 'aim') {
        e.faceTo(tgt.pos.x, tgt.pos.z);
        if (Math.random() < dt * 20) C.world.fx.emit('sparkle', e.x, e.y, e.z, 1, { color: '#dff4ff' });
        if (e.timer <= 0) {
          for (const k of [-0.28, 0, 0.28]) {
            const a = Math.atan2(tgt.pos.z - e.z, tgt.pos.x - e.x) + k;
            C.enemyShot(e, { pos: { x: e.x + Math.cos(a) * 6, z: e.z + Math.sin(a) * 6 }, vel: { x: 0, z: 0 } }, { speed: 6.5, r: 0.2, dmg: e.def.dmg * (e.dmgMul || 1), life: 1.6, look: 'ice' });
          }
          e.state = 'chase'; e.timer = rand(2.2, 3.2);
        }
      }
    },
    pose(e) {
      const u = e.obj.userData;
      u.body.rotation.y += 0.03;
      u.shards.forEach((s, i) => { s.position.y = (i % 2 ? 0.1 : -0.08) + Math.sin(e.t * 3 + i) * 0.05; });
      const k = e.state === 'aim' ? 1.25 : 1;
      u.body.scale.setScalar(k);
    },
  },

  toad: {
    think(e, dt, tgt, C) {
      if (!tgt) return;
      const sp = speedOf(e, C), u = e.obj.userData;
      if (e.state === 'chase') {
        const d = toward(e, C, tgt, sp, dt, 3.2);
        if (e.timer <= 0 && d < 6) { e.state = 'aim'; e.timer = 0.8; e.aim = { x: (tgt.pos.x - e.x) / (d || 1), z: (tgt.pos.z - e.z) / (d || 1) }; C.telegraphLine(e, e.aim, 5.2, 0.8); C.sfx('croak', e); }
        else if (d < 1.5 && e.timer <= 0) { e.state = 'belch'; e.timer = 0.5; }
      } else if (e.state === 'aim') {
        e.face = e.aim;
        if (e.timer <= 0) { e.state = 'tongue'; e.timer = 0.35; e.grab = null; C.sfx('snap', e); }
      } else if (e.state === 'tongue') {
        const k = 1 - Math.max(0, e.timer) / 0.35, len = Math.sin(k * Math.PI) * 5.2;
        e.tongueLen = len;
        if (!e.grab) for (const p of C.alivePlayers()) {
          const px = p.pos.x - e.x, pz = p.pos.z - e.z, along = px * e.aim.x + pz * e.aim.z, across = Math.abs(-px * e.aim.z + pz * e.aim.x);
          if (along > 0.3 && along < len + 0.3 && across < 0.55 && p.actor.jumpY < 0.8) {
            const r = C.hurtPlayer(p, e.def.dmg * (e.dmgMul || 1), { dir: { x: -e.aim.x, z: -e.aim.z }, knock: 0.1, src: e });
            if (r !== 'parry') { e.grab = p; C.popText(p.pos.x, 2.2, p.pos.z, t('Gulp!'), '#ef7a9a'); }
            break;
          }
        }
        if (e.grab) {
          // reel them in
          const p = e.grab, a = p.actor, tx = e.x + e.aim.x * 1.1, tz = e.z + e.aim.z * 1.1;
          a.pos.x += (tx - a.pos.x) * Math.min(1, dt * 9); a.pos.z += (tz - a.pos.z) * Math.min(1, dt * 9);
        }
        if (e.timer <= 0) { e.tongueLen = 0; e.state = e.grab ? 'belch' : 'chase'; e.timer = e.grab ? 0.35 : rand(2.2, 3.4); }
      } else if (e.state === 'belch') {
        if (e.timer <= 0) {
          const cx = e.x + e.face.x * 1.1, cz = e.z + e.face.z * 1.1;
          C.blast(cx, cz, 1.5, e.def.dmg * 0.6 * (e.dmgMul || 1), 2, { gloom: true, elem: 'poison', color: '#8fdc5a' });
          C.vfx.smoke(cx, 0.4, cz, { n: 5, color: '#8fdc5a', size: 0.16, life: 0.9 });
          C.sfx('croak', e);
          e.state = 'chase'; e.timer = rand(2.5, 3.5); e.grab = null;
        }
      }
      u.tongue.visible = (e.tongueLen || 0) > 0.05;
    },
    pose(e) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      const L = e.tongueLen || 0;
      u.tongue.scale.z = Math.max(0.01, L); u.tongue.position.z = 0.4 + L / 2;
      const puff = e.state === 'belch' ? 1.2 : e.state === 'aim' ? 1.08 : 1;
      u.body.scale.set(puff, e.state === 'chase' ? 1 + Math.abs(Math.sin(e.t * 5)) * 0.05 : puff, puff);
    },
  },

  shaman: {
    think(e, dt, tgt, C) {
      if (!tgt) return;
      const sp = speedOf(e, C);
      hover(e, C, tgt, sp, dt, 4, 7);
      e.summonT = (e.summonT ?? 2) - dt;
      if (e.summonT <= 0) {
        e.summonT = 7;
        const mine = C.enemies.filter((o) => o.alive && o.summoner === e).length;
        if (mine < 5) {
          e.cast = 0.6;
          for (let i = 0; i < 2; i++) { const s = C.freeSpot(e.x, e.z, 1.8); if (s) { const o = C.spawn('sporeling', s.x, s.z); o.summoner = e; } }
          C.vfx.smoke(e.x, 0.5, e.z, { n: 4, color: '#b88cf0', size: 0.16, life: 0.8 }); C.vfx.sparks(e.x, 0.6, e.z, { n: 8, color: '#b88cf0', kind: 'shard' });
          C.sfx('poof', e);
        }
      } else if (e.timer <= 0) {
        e.timer = rand(2.6, 3.4); e.cast = 0.4;
        C.enemyShot(e, tgt, { speed: 4.8, r: 0.22, dmg: e.def.dmg * (e.dmgMul || 1), life: 2.6, look: 'spore' });
      }
      if (e.cast > 0) e.cast -= dt;
    },
    pose(e) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      u.body.position.y = Math.abs(Math.sin(e.t * 6)) * 0.04;
      u.staff.rotation.x = e.cast > 0 ? -0.9 : Math.sin(e.t * 2) * 0.1;
    },
  },

  mender: {
    init(e) { e.y = 0.7; },
    think(e, dt, tgt, C) {
      const sp = speedOf(e, C);
      e.y += (0.75 + Math.sin(e.t * 3) * 0.08 - e.y) * dt * 3;
      // run from the heroes, stay near the hurt
      let hurt = null, hs = 1;
      for (const o of C.enemies) { if (o === e || !o.alive || o.def.boss || o.type === 'mender' || o.type === 'totem') continue; const k = o.hp / o.maxHp; const d = Math.hypot(o.x - e.x, o.z - e.z); if (k < 0.92 && d < 9 && k < hs) { hs = k; hurt = o; } }
      if (e.hitT > 0) { e.hitT -= dt; e.healing = null; }
      if (hurt) {
        const d = Math.hypot(hurt.x - e.x, hurt.z - e.z);
        e.faceTo(hurt.x, hurt.z);
        if (d > 3) C.moveEnemy(e, ((hurt.x - e.x) / d) * sp * dt, ((hurt.z - e.z) / d) * sp * dt, true);
        if (!(e.hitT > 0) && d < 4.5) {
          e.healing = hurt;
          hurt.hp = Math.min(hurt.maxHp, hurt.hp + hurt.maxHp * 0.16 * dt);
          if (Math.random() < dt * 8) { beam(C, { x: e.x, z: e.z }, hurt, 0x8fe8b0); C.world.fx.emit('heart', hurt.x, hurt.y + hurt.def.h + 0.2, hurt.z, 1); }
        }
      } else e.healing = null;
      if (tgt) { const d = Math.hypot(tgt.pos.x - e.x, tgt.pos.z - e.z); if (d < 3.2) C.moveEnemy(e, ((e.x - tgt.pos.x) / (d || 1)) * sp * 1.3 * dt, ((e.z - tgt.pos.z) / (d || 1)) * sp * 1.3 * dt, true); }
    },
    onHit(e) { e.hitT = 1.2; },
    pose(e) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      const f = Math.sin(e.t * (e.healing ? 22 : 12));
      u.wings[0].rotation.y = f * 0.6; u.wings[1].rotation.y = -f * 0.6;
    },
  },

  knight: {
    init(e) { e.shieldHp = e.def.shield * (e.hpK || 1); e.onShieldBreak = () => { e.obj.userData.shield.visible = false; e.angry = true; }; },
    think(e, dt, tgt, C) {
      if (!tgt) return;
      const sp = speedOf(e, C) * (e.angry ? 1.35 : 1);
      if (e.state === 'chase') {
        const d = toward(e, C, tgt, sp, dt, 1.4);
        if (d < 1.9 && e.timer <= 0) { e.state = 'windup'; e.timer = 0.5; C.bubble(e, '!'); }
      } else if (e.state === 'windup') {
        if (e.timer <= 0) { e.state = 'bash'; e.timer = 0.26; e.hitOnce.clear(); C.sfx('slam', e); }
      } else if (e.state === 'bash') {
        C.moveEnemy(e, e.face.x * 7 * dt, e.face.z * 7 * dt);
        C.enemyTouch(e, e.def.dmg * (e.dmgMul || 1), 5, 0.7);
        if (e.timer <= 0) { e.state = 'recover'; e.timer = 0.9; }
      } else if (e.state === 'recover') {
        // turning slowly — this is when you get round its shield
        const a = Math.atan2(e.face.z, e.face.x), b = Math.atan2(tgt.pos.z - e.z, tgt.pos.x - e.x);
        let d = b - a; d = Math.atan2(Math.sin(d), Math.cos(d));
        const na = a + Math.max(-dt * 1.2, Math.min(dt * 1.2, d));
        e.face = { x: Math.cos(na), z: Math.sin(na) };
        if (e.timer <= 0) { e.state = 'chase'; e.timer = rand(0.8, 1.4); }
      }
    },
    pose(e) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      u.body.position.y = e.state === 'chase' ? Math.abs(Math.sin(e.t * 7)) * 0.04 : 0;
      u.mace.rotation.x = e.state === 'windup' ? -1.2 : e.state === 'bash' ? 0.6 : 0;
      u.shield.position.z = e.state === 'bash' ? 0.42 : 0.3;
    },
  },

  beetle: {
    think(e, dt, tgt, C) {
      if (!tgt) return;
      const sp = speedOf(e, C);
      if (e.state === 'chase') {
        const d = toward(e, C, tgt, sp, dt, 1.3);
        if (e.timer <= 0 && d < 9) { e.state = 'curl'; e.timer = 0.65; e.aim = { x: (tgt.pos.x - e.x) / (d || 1), z: (tgt.pos.z - e.z) / (d || 1) }; C.telegraphLine(e, e.aim, 8, 0.65); }
        else if (d < 1.6 && !e.nipped) { e.nipped = true; C.enemyTouch(e, e.def.dmg * 0.6 * (e.dmgMul || 1), 2, 0.6); setTimeout(() => { e.nipped = false; }, 900); }
      } else if (e.state === 'curl') {
        e.face = e.aim;
        if (e.timer <= 0) { e.state = 'roll'; e.timer = 1.7; e.bounces = 0; e.hitOnce.clear(); C.sfx('charge', e); }
      } else if (e.state === 'roll') {
        const moved = C.moveEnemy(e, e.aim.x * 9 * dt, e.aim.z * 9 * dt);
        C.enemyTouch(e, e.def.dmg * (e.dmgMul || 1), 5, 0.6);
        if (Math.random() < dt * 20) C.world.fx.emit('dust', e.x, 0.05, e.z, 1);
        if (!moved) {
          if (e.bounces < 2) { e.bounces++; e.aim = { x: -e.aim.x + rand(-0.3, 0.3), z: -e.aim.z + rand(-0.3, 0.3) }; const l = Math.hypot(e.aim.x, e.aim.z); e.aim.x /= l; e.aim.z /= l; e.hitOnce.clear(); C.sfx('bonk', e); C.shakeAt(e, 0.15); }
          else e.timer = 0;
        }
        if (e.timer <= 0) { e.state = 'dizzy'; e.timer = 1.3; e.stagger = 1.3; C.bubble(e, '@_@'); }
      } else if (e.state === 'dizzy') {
        if (e.timer <= 0) { e.state = 'chase'; e.timer = rand(3, 4.5); }
      }
    },
    pose(e) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      const ball = e.state === 'curl' || e.state === 'roll';
      u.head.visible = !ball;
      for (const l of u.legs) l.visible = !ball;
      u.body.rotation.x = e.state === 'roll' ? e.t * 14 : 0;
      u.body.position.y = e.state === 'roll' ? 0.2 : 0;
      u.body.scale.y = ball ? 1.25 : 1;
      for (const [i, l] of u.legs.entries()) l.rotation.y = e.state === 'chase' ? Math.sin(e.t * 16 + i) * 0.4 : 0;
    },
  },

  harpy: {
    init(e) { e.y = 2.6; },
    think(e, dt, tgt, C) {
      if (!tgt) return;
      if (e.state === 'chase') {
        e.ang = (e.ang ?? Math.random() * 6) + dt * 1.1;
        const tx = tgt.pos.x + Math.cos(e.ang) * 4.2, tz = tgt.pos.z + Math.sin(e.ang) * 3;
        C.moveEnemy(e, (tx - e.x) * dt * 2, (tz - e.z) * dt * 2, false, true);
        e.faceTo(tx, tz);
        e.y += (2.6 - e.y) * dt * 3;
        if (e.timer <= 0) {
          e.cycle = (e.cycle || 0) + 1;
          if (e.cycle % 3 === 0) {
            for (const k of [-0.3, 0, 0.3]) { const a = Math.atan2(tgt.pos.z - e.z, tgt.pos.x - e.x) + k; C.enemyShot(e, { pos: { x: e.x + Math.cos(a) * 6, z: e.z + Math.sin(a) * 6 }, vel: { x: 0, z: 0 } }, { speed: 7, r: 0.18, dmg: e.def.dmg * 0.7 * (e.dmgMul || 1), life: 1.4, look: 'feather' }); }
            e.timer = rand(1.6, 2.2);
          } else {
            const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, d = Math.hypot(dx, dz) || 1;
            e.aim = { x: dx / d, z: dz / d }; e.dist = d + 3;
            e.state = 'mark'; e.timer = 0.7;
            C.telegraphLine(e, e.aim, e.dist, 0.7);
            C.sfx('caw', e);
          }
        }
      } else if (e.state === 'mark') {
        e.face = e.aim;
        e.y += (3.1 - e.y) * dt * 4;
        if (e.timer <= 0) { e.state = 'dive'; e.timer = e.dist / 12; e.hitOnce.clear(); }
      } else if (e.state === 'dive') {
        C.moveEnemy(e, e.aim.x * 12 * dt, e.aim.z * 12 * dt, false, true);
        e.y += (0.6 - e.y) * dt * 10;
        if (e.y < 1.3) C.enemyTouch(e, e.def.dmg * (e.dmgMul || 1), 3.5, 0.6);
        if (e.timer <= 0) { e.state = 'chase'; e.timer = rand(2.4, 3.4); }
      }
    },
    pose(e) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      const f = e.state === 'dive' ? 0.9 : Math.sin(e.t * 9);
      u.wings[0].rotation.z = f * 0.6; u.wings[1].rotation.z = -f * 0.6;
      u.body.rotation.x = e.state === 'dive' ? 0.6 : 0;
    },
  },

  slinger: {
    think(e, dt, tgt, C) {
      if (!tgt) return;
      const sp = speedOf(e, C);
      const d = Math.hypot(tgt.pos.x - e.x, tgt.pos.z - e.z);
      if (d < 3.4) {
        // too close! run for it
        C.moveEnemy(e, ((e.x - tgt.pos.x) / (d || 1)) * sp * 1.25 * dt, ((e.z - tgt.pos.z) / (d || 1)) * sp * 1.25 * dt, true);
        e.faceTo(e.x * 2 - tgt.pos.x, e.z * 2 - tgt.pos.z);
      } else hover(e, C, tgt, sp, dt, 5, 8);
      if (e.timer <= 0 && d < 10) {
        e.timer = rand(2.4, 3.2); e.throw = 0.4;
        const at = { x: tgt.pos.x + (tgt.vel ? tgt.vel.x * 0.8 : 0), z: tgt.pos.z + (tgt.vel ? tgt.vel.z * 0.8 : 0) };
        lob(C, e, at, { r: 1.35, dmg: e.def.dmg * (e.dmgMul || 1), t: 1.15 });
        C.sfx('flick', e);
      }
      if (e.throw > 0) e.throw -= dt;
    },
    pose(e) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      u.body.position.y = Math.abs(Math.sin(e.t * 10)) * 0.06;
      u.sling.rotation.x = e.throw > 0 ? -2.2 : Math.sin(e.t * 12) * 0.3;
    },
  },

  reefcrab: {
    think(e, dt, tgt, C) {
      if (!tgt) return;
      const sp = speedOf(e, C);
      const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, d = Math.hypot(dx, dz) || 1;
      e.faceTo(tgt.pos.x, tgt.pos.z);
      e.side = e.side || 1;
      if (Math.random() < dt * 0.4) e.side *= -1;
      // scuttle sideways round you, drifting to about two tiles
      const want = d > 2.3 ? 0.8 : d < 1.6 ? -0.6 : 0;
      C.moveEnemy(e, ((-dz / d) * e.side + (dx / d) * want) * sp * dt, ((dx / d) * e.side + (dz / d) * want) * sp * dt, true);
      if (e.timer <= 0) {
        if (d < 1.8) { e.pinch = 0.25; e.hitOnce.clear(); C.enemyTouch(e, e.def.dmg * (e.dmgMul || 1), 3, 0.8); C.sfx('snap', e); e.timer = rand(1.4, 2); }
        else { C.enemyShot(e, tgt, { speed: 3.6, r: 0.3, dmg: e.def.dmg * 0.8 * (e.dmgMul || 1), life: 2.6, look: 'bubble' }); e.timer = rand(2.2, 3); }
      }
      if (e.pinch > 0) e.pinch -= dt;
    },
    pose(e) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      for (const [i, l] of u.legs.entries()) l.rotation.y = Math.sin(e.t * 18 + i * 1.7) * 0.5;
      for (const [i, c] of u.claws.entries()) c.rotation.x = e.pinch > 0 ? -0.6 : Math.sin(e.t * 3 + i) * 0.1;
    },
  },

  ghost: {
    init(e) { e.y = 0.15; e.alpha = 1; },
    think(e, dt, tgt, C) {
      if (!tgt) return;
      const sp = speedOf(e, C);
      if (e.state === 'chase') {
        e.under = false;
        const d = toward(e, C, tgt, sp * 0.8, dt, 1.2);
        if (e.timer <= 0) { e.state = 'fade'; e.timer = 0.5; C.sfx('poof', e); }
        else if (d < 1.4 && !e.cut) { e.state = 'slash'; e.timer = 0.3; e.hitOnce.clear(); }
      } else if (e.state === 'fade') {
        e.alpha = Math.max(0, e.timer / 0.5);
        if (e.timer <= 0) {
          e.under = true;
          // behind someone
          const q = pick(C.alivePlayers()) || tgt, dir = q.actor.dir;
          e.x = q.pos.x - dir.x * 1.4; e.z = q.pos.z - dir.z * 1.4;
          e.faceTo(q.pos.x, q.pos.z);
          e.state = 'appear'; e.timer = 0.6;
          C.telegraphCircle(e.x, e.z, 0.9, 0.6);
        }
      } else if (e.state === 'appear') {
        e.alpha = 1 - Math.max(0, e.timer / 0.6);
        if (e.timer <= 0) { e.under = false; e.state = 'slash'; e.timer = 0.3; e.hitOnce.clear(); C.sfx('whoosh', e); }
      } else if (e.state === 'slash') {
        C.enemyTouch(e, e.def.dmg * (e.dmgMul || 1), 3.2, 1.0, 1.6);
        if (e.timer <= 0) { e.state = 'chase'; e.timer = rand(3.2, 4.6); }
      }
    },
    pose(e) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      u.body.position.y = Math.sin(e.t * 2.4) * 0.08;
      e.obj.traverse((m) => { if (m.isMesh && m.material) { m.material.transparent = true; m.material.opacity = (m.material === u.robe ? 0.7 : 0.9) * (e.alpha ?? 1); } });
      u.blade.rotation.y = e.state === 'slash' ? -1.4 + (0.3 - e.timer) * 9 : 0;
      e.shadow.visible = (e.alpha ?? 1) > 0.3;
    },
  },

  slug: {
    think(e, dt, tgt, C) {
      if (!tgt) return;
      const sp = speedOf(e, C);
      toward(e, C, tgt, sp, dt, 1.2);
      // a burning trail behind it
      e.trailT = (e.trailT ?? 0) - dt;
      if (e.trailT <= 0) { e.trailT = 0.45; hazard(C, { x: e.x - e.face.x * 0.5, z: e.z - e.face.z * 0.5, r: 0.55, life: 3.6, dmg: 5, elem: 'fire', color: 0xff6a1a }); }
      if (e.timer <= 0) { e.timer = rand(2.8, 3.6); C.enemyShot(e, tgt, { speed: 5, r: 0.24, dmg: e.def.dmg * (e.dmgMul || 1), life: 2, look: 'lava' }); }
    },
    pose(e) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      u.body.scale.set(1 + Math.sin(e.t * 4) * 0.05, 1 - Math.sin(e.t * 4) * 0.05, 1 + Math.sin(e.t * 4 + 1) * 0.06);
    },
  },

  stormcrow: {
    init(e) { e.y = 2.3; },
    think(e, dt, tgt, C) {
      if (!tgt) return;
      if (e.state === 'chase') {
        e.ang = (e.ang ?? Math.random() * 6) + dt * 1.5;
        const tx = tgt.pos.x + Math.cos(e.ang) * 3.2, tz = tgt.pos.z + Math.sin(e.ang) * 2.4;
        C.moveEnemy(e, (tx - e.x) * dt * 2.2, (tz - e.z) * dt * 2.2, false, true);
        e.faceTo(tx, tz);
        e.y += (2.4 - e.y) * dt * 3;
        if (e.timer <= 0) { e.state = 'mark'; e.timer = 0.6; e.at = { x: tgt.pos.x, z: tgt.pos.z }; C.telegraphCircle(e.at.x, e.at.z, 1.3, 0.6); C.sfx('caw', e); }
      } else if (e.state === 'mark') {
        e.faceTo(e.at.x, e.at.z);
        if (Math.random() < dt * 20) C.world.fx.emit('sparkle', e.x, e.y, e.z, 1, { color: '#ffe066' });
        if (e.timer <= 0) { e.state = 'dive'; e.timer = 0.4; e.from = { x: e.x, z: e.z, y: e.y }; }
      } else if (e.state === 'dive') {
        const k = 1 - Math.max(0, e.timer) / 0.4;
        e.x = e.from.x + (e.at.x - e.from.x) * k; e.z = e.from.z + (e.at.z - e.from.z) * k; e.y = e.from.y * (1 - k) + 0.3;
        if (e.timer <= 0) {
          // thunderclap!
          C.blast(e.at.x, e.at.z, 1.3, e.def.dmg * (e.dmgMul || 1), 3, { gloom: true, elem: 'shock', color: '#ffe066' });
          C.vfx.lightning(e.at.x, e.at.z, { color: '#ffe066' });
          C.sfx('zap', e);
          e.state = 'chase'; e.timer = rand(2.6, 3.8);
        }
      }
    },
    pose(e) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      const f = e.state === 'dive' ? 0.8 : Math.sin(e.t * 15);
      u.wings[0].rotation.z = f * 0.7; u.wings[1].rotation.z = -f * 0.7;
      u.body.rotation.x = e.state === 'dive' ? 0.8 : 0;
    },
  },

  totem: {
    think(e, dt, tgt, C) {
      e.pulseT = (e.pulseT ?? 1.5) - dt;
      if (e.pulseT <= 0) {
        e.pulseT = 4;
        let any = false;
        for (const o of C.enemies) {
          if (o === e || !o.alive || o.def.boss || o.type === 'totem' || Math.hypot(o.x - e.x, o.z - e.z) > 6) continue;
          o.bubbleHp = Math.max(o.bubbleHp || 0, 22 * (o.hpK || 1));
          any = true;
        }
        if (any) { C.vfx.shockwave(e.x, e.z, { r: 2.2, color: '#b86aff', life: 0.45, wall: 0.5 }); C.sfx('chord', e); }
      }
      void tgt;
    },
    pose(e) {
      const u = e.obj.userData;
      u.flame.scale.set(1, 1 + Math.sin(e.t * 12) * 0.2, 1);
      u.flame.rotation.y += 0.05;
    },
  },

  worm: {
    init(e) { e.under = e.state !== 'sleep'; e.state = e.state === 'sleep' ? 'sleep' : 'under'; },
    think(e, dt, tgt, C) {
      if (!tgt) return;
      const sp = speedOf(e, C);
      if (e.state === 'chase') { e.state = 'under'; e.under = true; }
      if (e.state === 'under') {
        e.under = true;
        const d = toward(e, C, tgt, sp * 1.2, dt, 3);
        if (Math.random() < dt * 20) C.world.fx.emit('dust', e.x + rand(-0.5, 0.5), 0.05, e.z + rand(-0.5, 0.5), 1, { color: '#c8a468' });
        if (d < 5 && e.timer <= 0) {
          const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, l = Math.hypot(dx, dz) || 1;
          e.aim = { x: dx / l, z: dz / l };
          e.state = 'rumble'; e.timer = 0.9;
          C.telegraphLine(e, e.aim, 7, 0.9);
          C.shakeAt(e, 0.2); C.sfx('growl', e);
        }
      } else if (e.state === 'rumble') {
        if (e.timer <= 0) { e.state = 'erupt'; e.timer = 0.55; e.under = false; e.hitOnce.clear(); C.sfx('slam', e); }
      } else if (e.state === 'erupt') {
        C.moveEnemy(e, e.aim.x * 12 * dt, e.aim.z * 12 * dt, false, true);
        for (const p of C.alivePlayers()) {
          if (e.hitOnce.has(p)) continue;
          if (Math.hypot(p.pos.x - e.x, p.pos.z - e.z) < e.r + 0.5 && p.actor.jumpY < 0.8) { e.hitOnce.add(p); if (C.hurtPlayer(p, e.def.dmg * (e.dmgMul || 1), { dir: e.aim, knock: 4, src: e }) !== 'parry') p.actor.jumpV = 8; }
        }
        if (Math.random() < dt * 30) C.world.fx.emit('dust', e.x, 0.3, e.z, 2, { color: '#d8b878' });
        if (e.timer <= 0) { e.state = 'up'; e.timer = 2.4; }
      } else if (e.state === 'up') {
        const d = toward(e, C, tgt, 0, dt, 99);
        e.biteT = (e.biteT ?? 0) - dt;
        if (d < 2 && e.biteT <= 0) { e.biteT = 0.9; e.hitOnce.clear(); C.enemyTouch(e, e.def.dmg * 0.8 * (e.dmgMul || 1), 3.5, 1.2, 1.4); C.sfx('snap', e); }
        if (e.timer <= 0) { e.state = 'under'; e.under = true; e.timer = rand(1.5, 2.5); C.world.fx.emit('dust', e.x, 0.2, e.z, 12, { color: '#c8a468' }); }
      }
    },
    pose(e) {
      const u = e.obj.userData, under = e.under;
      u.body.visible = !under || e.state === 'rumble';
      u.body.position.y = under ? (e.state === 'rumble' ? -0.9 + Math.sin(e.t * 30) * 0.08 : -2) : e.state === 'erupt' ? 0.3 : 0;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      u.segs.forEach((s, i) => { s.position.y = Math.sin(e.t * 6 - i * 0.8) * 0.12; s.rotation.y = Math.sin(e.t * 3 - i * 0.6) * 0.15; });
      u.mouth.scale.setScalar(e.state === 'up' ? 1 + Math.abs(Math.sin(e.t * 4)) * 0.15 : 1);
      e.shadow.visible = !under;
    },
  },

  yeti: {
    think(e, dt, tgt, C) {
      if (!tgt) return;
      const sp = speedOf(e, C);
      if (e.state === 'chase') {
        const d = toward(e, C, tgt, sp, dt, 1.6);
        if (e.timer <= 0) {
          if (d > 4) { e.state = 'throw'; e.timer = 0.6; }
          else if (d < 2.6) { e.state = 'pound'; e.timer = 0.75; C.telegraphCircle(e.x, e.z, 2.4, 0.75); C.sfx('growl', e); }
        }
      } else if (e.state === 'throw') {
        e.faceTo(tgt.pos.x, tgt.pos.z);
        if (e.timer <= 0) { C.enemyShot(e, tgt, { speed: 6, r: 0.4, dmg: e.def.dmg * (e.dmgMul || 1), life: 2, look: 'snowball' }); e.state = 'chase'; e.timer = rand(2.2, 3); }
      } else if (e.state === 'pound') {
        if (e.timer <= 0) {
          C.blast(e.x, e.z, 2.4, e.def.dmg * (e.dmgMul || 1), 4.5, { gloom: true, elem: 'ice', color: '#bfe8ff' });
          C.world.fx.emit('sparkle', e.x, 0.4, e.z, 18, { color: '#dff4ff' });
          C.shakeAt(e, 0.35);
          e.state = 'chase'; e.timer = rand(2.4, 3.2);
        }
      }
    },
    pose(e) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      const walk = e.state === 'chase' ? Math.sin(e.t * 6) : 0;
      u.arms[0].rotation.x = e.state === 'pound' ? -2.6 + (0.75 - e.timer) * 0.5 : e.state === 'throw' ? -2.4 : walk * 0.4;
      u.arms[1].rotation.x = e.state === 'pound' ? -2.6 + (0.75 - e.timer) * 0.5 : -walk * 0.4;
      u.body.position.y = Math.abs(walk) * 0.05;
    },
  },
};

// sporelings fight like little gloomlings (the Enemy class handles them)
export const GLOOMLIKE = new Set(['sporeling']);
export { lob, hazard, tickHazards } from './ai.js';

// ------------------------------------------------------------------ elites
export function makeElite(e, affix = pick(AFFIXES)) {
  e.elite = true; e.affix = affix;
  e.maxHp = Math.round(e.maxHp * 2.4); e.hp = e.maxHp;
  e.dmgMul = (e.dmgMul || 1) * 1.25;
  const aura = eliteAura(e.combat.r3d, e.r);
  e.obj.add(aura);
  e.aura = aura;
  if (affix === 'bulwark') e.bubbleHp = 40 * (e.hpK || 1);
}

// the bubble a totem (or the bulwark affix) puts round a foe
export function drawBubbles(C) {
  for (const e of C.enemies) {
    const on = e.alive && e.bubbleHp > 0;
    if (on && !e.bubbleMesh) {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xb86aff, transparent: true, opacity: 0.22, depthWrite: false }));
      e.bubbleMesh = m;
      C.root.add(m);
    }
    if (e.bubbleMesh) {
      e.bubbleMesh.visible = on;
      if (on) { e.bubbleMesh.position.set(e.x, e.y + e.def.h * 0.5, e.z); e.bubbleMesh.scale.setScalar(Math.max(e.r * 1.8, e.def.h * 0.75)); }
      if (!e.alive) { C.root.remove(e.bubbleMesh); e.bubbleMesh = null; }
    }
    // elites regrow their bubble, splitters are handled on death
    if (e.alive && e.affix === 'bulwark' && !(e.bubbleHp > 0)) { e.bubbleT = (e.bubbleT || 0) + 1 / 60; if (e.bubbleT > 8) { e.bubbleT = 0; e.bubbleHp = 40 * (e.hpK || 1); } }
  }
}

export function onEnemyDeath(C, e, p) {
  const B = BRAINS[e.type];
  if (B && B.onDeath) B.onDeath(e, C, p);
  if (e.affix === 'splitter') for (let i = 0; i < 2; i++) { const s = C.freeSpot(e.x, e.z, 1.2); if (s) C.spawn('sporeling', s.x, s.z); }
  if (e.bubbleMesh) { C.root.remove(e.bubbleMesh); e.bubbleMesh = null; }
}

// the zone bosses live in bosses.js but fight through the same machinery
Object.assign(NEW_ENEMIES, BOSS_ENEMIES, DINO_ENEMIES, TYRANT_ENEMIES, NEWGLOOM_ENEMIES, TROUPE_ENEMIES, WOODS_ENEMIES, CANYON_ENEMIES, FROST_ENEMIES, SEA_ENEMIES, DUCHESS_ENEMIES, DAWN_ENEMIES, MOTH_ENEMIES, MANOR_ENEMIES, FINALE_ENEMIES, WORLD_BOSSES, GRANDMA_ENEMIES);
Object.assign(BRAINS, BOSS_BRAINS, DINO_BRAINS, TYRANT_BRAINS, NEWGLOOM_BRAINS, TROUPE_BRAINS, WOODS_BRAINS, CANYON_BRAINS, FROST_BRAINS, SEA_BRAINS, DUCHESS_BRAINS, DAWN_BRAINS, MOTH_BRAINS, MANOR_BRAINS, FINALE_BRAINS, WORLD_BRAINS, GRANDMA_BRAINS);
Object.assign(MODELS, BOSS_MODELS, DINO_MODELS, TYRANT_MODELS, NEWGLOOM_MODELS, TROUPE_MODELS, WOODS_MODELS, CANYON_MODELS, FROST_MODELS, SEA_MODELS, DUCHESS_MODELS, DAWN_MODELS, MOTH_MODELS, MANOR_MODELS, FINALE_MODELS, WORLD_MODELS, GRANDMA_MODELS);
Object.assign(ZONE_FOES, DAWN_ZONE_FOES, MOTH_ZONE_FOES, MANOR_ZONE_FOES);
// (the fuse imp thinks like the ember imp: run up, light up, go off)
BRAINS.fuse = BRAINS.imp;

export { MODELS };
void audio;
