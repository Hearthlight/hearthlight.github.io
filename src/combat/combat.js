// Party Mode brawling, in the spirit of the great couch beat-’em-ups: combos
// that juggle, charged heavies, class specials, knock-back, hit-stop and
// numbers flying everywhere — but cozy: nobody dies, gloom creatures poof
// into stardust (animals turn back into themselves) and downed friends take
// a nap until someone helps them up.

import { THREE, toon } from '../render/r3d.js';
import { CLASSES } from './classes.js';
import { ENEMIES, Enemy } from './enemies.js';
import { applyBlessings } from './blessings.js';
import { applyElement, guard, comboHit, tickCombo, drawCombo, tickPlayer, applyToPlayer, drawEnemyMarks, thaw, freezeNow, PARRY_WINDOW } from './v3/status.js';
import { tickHazards, drawBubbles, onEnemyDeath } from './v3/bestiary.js';
import { bossDamageMul } from './v3/bosses.js';
import { worldBossMul } from './v7/world.js';
import { talentMods, buildMoves, picksOf, ultOf, ULTS, MAX_LEVEL } from './v4/talents.js';
import { gearMods } from './v3/gear.js';
import { Vfx, VFX_COL, BLASTS } from './v4/vfx.js';
import { WEAPONS, weaponOf, weaponMoves, weaponMods } from './v4/weapons.js';
import { drawText, measure } from '../engine/font.js';
import { audio } from '../engine/audio.js';
import { TT } from '../world/tiles.js';
import { animDino } from '../models/dinos3d.js';
import { t } from '../i18n.js';
import * as K9 from './v9/kit9.js';
import { XP_NEED, levelAt, rollLevel, hpL, dmgL, groupHp, groupDmg, gapDealt, gapTaken, effLevel, killXp, levelColor } from '../saga/levels.js';

const rand = (a, b) => a + Math.random() * (b - a);
const WHITE = new THREE.Color('#ffffff');
// the glow a projectile leaves behind it (null: none)
const TRAIL = { seed: '#c8e07a', pod: '#6fc05a', tea: '#f4e8d0', wisp: '#ffb040', beam: '#fff3c4', pepper: '#c8b8a0', rivet: '#c8c4d0', tool: '#a8a4b0', star: '#fff3a6', comet: '#ffb040', ice: '#9fdcff', note: '#f59ac8', note2: '#c9a2ff', spore: '#b58ae8', lava: '#ff8a3a', bubble: '#bfe8ff', bomb: '#a86ae0', feather: '#b88cf0', acorn: '#e8dcc0', pinecone: '#c8a070', snowball: '#ffffff', arrow: '#e8dcc0', dynamite: '#ffd23a', dart: '#8fdc5a', boomerang: '#e0b070', orb: '#9fdcff', zap: '#ffe066', page: '#c9a2ff' };
const SWUNG = new Set(['pan', 'rollingpin', 'mallet', 'sword', 'lanternpole', 'torch', 'stormlamp', 'whisk', 'ladle', 'spatula', 'wrench', 'shears', 'rake']);      // weapons raised overhead to charge
const GLOOM = '#b06ae0';
export { XP_NEED };
const NEAR = 30;                   // heroes this close to a fight make it bigger

// the weapon arm's angle `t` seconds into an attack (its `pose`) — the creator's preview too
export function poseAt(A, t) {
  const k = Math.min(1, t / Math.max(0.01, A.windup)), after = Math.max(0, t - A.windup);
  switch (A.pose) {
    case 'swing': return k < 1 ? -2.4 * k : -2.4 + Math.min(1, after / 0.08) * 2.8;
    case 'backswing': return k < 1 ? 0.4 - 1.2 * k : -0.8 - Math.min(1, after / 0.08) * 1.6;
    case 'smash': return k < 1 ? -3.0 * k : -3.0 + Math.min(1, after / 0.07) * 3.5;
    case 'point': return k < 1 ? -1.2 - 0.3 * k : -1.5 + Math.min(1, after / 0.1) * 0.2;
    case 'strum': return -0.7 + Math.sin(t * 40) * 0.25;
    default: return undefined;
  }
}

export class Combat {
  constructor(party, opts = {}) {
    this.party = party;
    this.world = party.world;
    this.r3d = party.r3d;
    this.pvp = !!opts.pvp;
    this.root = new THREE.Group();
    this.world.over.root.add(this.root);
    this.enemies = [];
    this.shots = [];
    this.zones = [];
    this.drops = [];
    this.nums = [];
    this.fxMeshes = [];
    this.hitstop = 0;
    this.bounds = null;          // optional { x, z, rx, rz } fence for everyone
    this.enemySpeed = 1;
    this.enemyDmg = 1;
    this.onKill = null;          // (enemy, player|null)
    this.onDown = null;          // (player)
    this.onAllDown = null;
    this.shadowGeo = new THREE.CircleGeometry(0.5, 14).rotateX(-Math.PI / 2);
    this.gloomShadowMat = new THREE.MeshBasicMaterial({ color: 0x2a1640, transparent: true, opacity: 0.35, depthWrite: false });
    this.geo = {
      star: new THREE.OctahedronGeometry(0.16, 0), comet: new THREE.OctahedronGeometry(0.26, 0), acorn: new THREE.BoxGeometry(0.16, 0.2, 0.16),
      pine: new THREE.IcosahedronGeometry(0.2, 0), spore: new THREE.IcosahedronGeometry(0.16, 0), dust: new THREE.OctahedronGeometry(0.12, 0),
      ring: new THREE.RingGeometry(0.92, 1, 32).rotateX(-Math.PI / 2), disc: new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2),
    };
    this.noteTex = noteTexture();
    this.vfx = new Vfx(this.root, { lighting: party.lighting, shake: (s) => { party.cam.shake = Math.max(party.cam.shake || 0, s); } });
    for (const p of party.players) this.equip(p);
  }

  get players() { return this.party.players; }
  alivePlayers() { return this.players.filter((p) => p.connected && p.fighter && !p.fighter.down); }

  // the host’s difficulty & friendly-fire settings
  get diff() { return this.party.host ? this.party.host.diff() : { hp: 1, dmg: 1, speed: 1 }; }
  get diffSpeed() { return this.diff.speed; }
  get friendlyFire() { return !this.pvp && !!(this.party.host && this.party.host.opts.ff); }

  mat(c, e = null) { return toon(this.r3d, { color: c, emissive: e || 0x000000, emissiveIntensity: e ? 1 : 1, key: 'cb' + c + (e || '') }); }

  dispose() {
    this.vfx.dispose();
    this.world.over.root.remove(this.root);
    for (const p of this.players) this.unequip(p);
  }

  // ------------------------------------------------------------------ heroes
  equip(p) {
    const prof = this.party.profileOf(p);
    const clsId = CLASSES[p.cls] ? p.cls : CLASSES[prof.cls] ? prof.cls : 'knight';
    p.cls = clsId;
    const cls = CLASSES[clsId];
    const f = {
      clsId, cls, level: prof.level || 1, xp: prof.xp || 0,
      blessings: [], mods: applyBlessings([]),
      hp: 0, maxHp: 1, cd: 0, combo: 0, comboT: 0, act: null, queued: false, hold: 0, charging: false,
      spin: null, down: false, downT: 0, revive: 0, inv: 0, hurtT: 0, knock: null, buff: 0, buffT: 0, speedT: 0,
      airSlam: false, secondWind: 0, kos: 0, falls: 0, dmgDealt: 0, hits: 0,
      roll: null, rollCd: 0, counter: 0, st: null,
    };
    p.fighter = f;
    f.eff = this.effOf(p);
    this.refreshStats(p, true);
    p.actor.model.setProp(f.prop || cls.weapon);
    p.actor.doubleJump = f.mods.doubleJump;
  }

  unequip(p) {
    if (!p.fighter) return;
    p.actor.model.setProp(null);
    p.actor.speedMul = 1; p.actor.armPose = undefined; p.actor.armPoseL = undefined; p.actor.down = false; p.actor.doubleJump = false; p.actor.lean = 0;
    p.hidden = false; p.frozen = false;
    p.fighter = null;
  }

  setClass(p, clsId) {
    if (!CLASSES[clsId]) return;
    p.cls = clsId;
    if (p.fighter) { const keep = p.fighter; this.equip(p); p.fighter.blessings = keep.blessings; this.refreshStats(p, true); this.party.flashTag(p, 3); }
  }

  refreshStats(p, heal = false) {
    const f = p.fighter;
    const prof = this.party.profileOf(p);
    const picks = picksOf(prof, f.clsId);
    // the weapon in hand: its moves, its rarity & traits, its model
    const wpn = weaponOf(prof, f.clsId);
    f.weapon = wpn;
    const prop = wpn && WEAPONS[wpn.type] ? WEAPONS[wpn.type].prop : f.cls.weapon;
    if (prop !== f.prop) { f.prop = prop; if (!p.vehicle && !p.mount && !p.swimming && p.actor.model.propKind) p.actor.model.setProp(prop); }
    f.mods = weaponMods(gearMods(talentMods(applyBlessings(f.blessings), picks), prof.gear), wpn);
    f.moves = buildMoves(weaponMoves(f.cls, wpn), picks);
    f.ultId = ultOf(f.clsId, picks);
    f.ult = f.ultId ? f.ult || 0 : 0;
    f.elem = f.mods.elem; f.elemChance = f.mods.elemChance;
    const lv = (f.eff || f.level) - 1;
    const old = f.maxHp;
    f.maxHp = Math.round((f.cls.hp + f.mods.hp) * (1 + lv * 0.08) * (1 + f.mods.hpPct));
    f.hp = heal ? f.maxHp : Math.min(f.maxHp, f.hp + Math.max(0, f.maxHp - old));
    f.secondWind = f.mods.secondWind;
    p.actor.doubleJump = f.mods.doubleJump;
  }

  dmgMul(p) {
    const f = p.fighter;
    let aura = 0;
    for (const q of this.players) if (q !== p && q.fighter && q.fighter.mods.aura > aura && !q.fighter.down && Math.hypot(q.pos.x - p.pos.x, q.pos.z - p.pos.z) < 5) aura = q.fighter.mods.aura;
    return (1 + ((f.eff || f.level) - 1) * 0.06) * f.mods.dmg * (f.buffT > 0 ? 1 + f.buff : 1) * (1 + aura);
  }

  gainXp(p, n) {
    const f = p.fighter;
    if (!f) return;
    f.xp += Math.round(n * f.mods.xp);
    if (f.level >= MAX_LEVEL) f.xp = 0;
    while (f.xp >= XP_NEED(f.level) && f.level < MAX_LEVEL) {
      f.xp -= XP_NEED(f.level);
      f.level++;
      f.eff = this.effOf(p);
      this.refreshStats(p, true);
      this.vfx.pillar(p.pos.x, p.pos.z, { r: 0.75, h: 5, color: '#ffd66b', life: 1.1 });
      this.vfx.star(p.pos.x, 1.3, p.pos.z, { size: 2, kind: 'rays', color: '#ffd66b', life: 0.5 });
      this.popText(p.pos.x, 2.4, p.pos.z, t('LEVEL UP!'), '#ffd66b', true);
      audio.sfx('levelup', { volume: 0.7 });
      this.party.buzz(p, [40, 30, 40, 30, 90]);
      this.party.toast(t('{name} reached level {n}!', { name: p.name, n: f.level }), p.color);
      this.party.flashTag(p, 3);
      if (this.party.progress) this.party.progress.onLevel(p);
    }
    this.party.saveProfile(p);
  }

  // Before the actors move: speed, poses & who’s frozen
  preActors(dt) {
    for (const p of this.players) {
      const f = p.fighter, a = p.actor;
      if (!f) continue;
      a.down = f.down;
      p.frozen = f.down || (f.hurtT > 0) || (f.dash && f.dash.t > 0) || (f.roll && f.roll.t > 0) || !!p.taming;
      let sp = f.mods.speed * f.cls.speed * (f.speedT > 0 ? 1.3 : 1);
      if (f.st && f.st.chill > 0) sp *= 0.62;
      if (f.roll) { a.lean = 1.2; f.leaned = true; } else if (f.leaned) { a.lean = 0; f.leaned = false; }
      if (f.act && !(f.act.def.move >= 1)) sp *= f.act.def.kind === 'melee' ? 0.35 : 0.55;
      if (f.charging) sp *= 0.5;
      if (f.spin) sp *= (f.spin.def || f.moves.special).move || 1;
      a.speedMul = sp;
      // blink while invulnerable after a hit (`away`: a scene took them off stage — a pelican’s pouch…)
      p.hidden = !!p.away || (!f.down && f.inv > 0 && f.inv < 1.2 && Math.floor(f.inv * 16) % 2 === 0);
      a.armPose = this.armPoseOf(p);
      a.armPoseL = (f.prop === 'lute' || f.prop === 'harp') && !f.down ? -0.9 : undefined;
    }
  }

  armPoseOf(p) {
    const f = p.fighter;
    if (f.down) return undefined;
    if (f.spin) return -1.6;
    if (f.charging) return SWUNG.has(f.prop) ? -2.9 : -1.5 + Math.sin(this.party.t * 30) * 0.05;
    const act = f.act;
    if (!act) return f.prop === 'lute' || f.prop === 'harp' ? -0.7 : undefined;
    return poseAt(act.def, act.t);
  }

  // ------------------------------------------------------------------ frame
  update(dt) {
    if (this.hitstop > 0) { this.hitstop -= dt; this.updateNums(dt); return; }
    tickCombo(this, dt);
    tickHazards(this, dt);
    drawBubbles(this);
    this.updatePatches(dt);
    this.regroupT = (this.regroupT || 0) - dt;
    if (this.regroupT <= 0) { this.regroupT = 1; this.regroup(); }
    for (const p of this.players) if (p.fighter) this.updateFighter(p, dt);
    this.updateRevives(dt);
    for (const e of this.enemies) if (e.alive) { K9.tickStatus(this, e, dt); e.update(dt); } else if (e.vine || e.halo) K9.tickStatus(this, e, dt);
    this.separateEnemies();
    this.updateShots(dt);
    this.updateZones(dt);
    K9.tick(this, dt);
    this.updateDrops(dt);
    this.updateNums(dt);
    this.updateFxMeshes(dt);
    this.vfx.update(dt);
    for (const e of this.enemies) if (!e.alive && !(e.fading > 0) && (e.vine || e.halo)) K9.tickStatus(this, e, 0);   // (their rings go too)
    this.enemies = this.enemies.filter((e) => e.alive || e.fading > 0);
    for (const e of this.enemies) if (!e.alive) this.fadeOut(e, dt);
    if (this.bounds) for (const p of this.players) this.clampToBounds(p.actor.pos);
  }

  updateFighter(p, dt) {
    const f = p.fighter, a = p.actor, inp = p.input;
    f.inv = Math.max(0, f.inv - dt);
    f.cd = Math.max(0, f.cd - dt);
    f.hurtT = Math.max(0, f.hurtT - dt);
    if (f.buffT > 0) f.buffT -= dt;
    if (f.regenT > 0) { f.regenT -= dt; f.hp = Math.min(f.maxHp, f.hp + f.maxHp * 0.035 * dt); }
    if (f.speedT > 0) f.speedT -= dt;
    if (f.hasteT > 0) f.hasteT -= dt;
    if (f.shieldT > 0 && (f.shieldT -= dt) <= 0) f.shield = 0;
    this.tickUlt(p, dt);
    if (f.knock) { f.knock.t -= dt; this.world.overCol.move(a.pos, f.knock.vx * dt, f.knock.vz * dt, a.radius); if (f.knock.t <= 0) f.knock = null; }
    if (f.dash) { f.dash.t -= dt; this.world.overCol.move(a.pos, f.dash.vx * dt, f.dash.vz * dt, a.radius); if (f.dash.t <= 0) f.dash = null; }
    if (f.rollCd > 0) f.rollCd -= dt;
    if (f.counter > 0) f.counter -= dt;
    if (f.roll) {
      f.roll.t -= dt; f.roll.age += dt;
      this.world.overCol.move(a.pos, f.roll.vx * dt, f.roll.vz * dt, a.radius);
      if (Math.random() < dt * 30) this.world.fx.emit('dust', a.pos.x, 0.1, a.pos.z, 1);
      if (Math.random() < dt * 40) this.vfx.trail(a.pos.x, 0.7 + a.jumpY, a.pos.z, { color: '#dfe8ff', size: 0.22, life: 0.2 });
      if (f.roll.t <= 0) f.roll = null;
    }
    tickPlayer(this, p, dt);
    if (f.down) {
      f.downT += dt;
      if (this.pvp && f.downT > 2.6) this.respawn(p);
      else if (f.secondWind > 0 && f.downT > 2) { f.secondWind--; this.revive(p, 0.5, null); this.popText(p.pos.x, 2.2, p.pos.z, t('Second wind!'), '#8fd6b4'); }
      return;
    }
    if (!p.connected) return;
    if (f.mods.regen && f.hp < f.maxHp) f.hp = Math.min(f.maxHp, f.hp + f.mods.regen * dt);
    const canAct = (this.canAct ? this.canAct(p) : true) && !p.swimming && !p.vehicle && !p.mount;
    // Y: a dodge roll — i-frames, and a perfectly timed one parries
    if (canAct && inp.pressed('y') && f.rollCd <= 0 && !f.roll) { this.roll(p); return; }
    // the attack in progress
    if (f.act) {
      f.act.t += dt;
      const A = f.act.def;
      if (!f.act.done && f.act.t >= A.windup) { f.act.done = true; this.perform(p, A); }
      // (performing can end the move: a nap from an exploding imp, a thorny counter…)
      if (f.act) {
        const total = A.windup + (A.active || 0.05) + A.recover * f.mods.recover * (f.hasteT > 0 ? 0.7 : 1) * (f.deadeye > 0 ? 0.5 : 1);
        if (f.act.done && canAct && inp.pressed('a')) f.queued = true;
        if (f.act.t >= total) { f.act = null; if (f.queued && canAct) { f.queued = false; this.startLight(p); } }
      }
    }
    if (f.spin) this.updateSpin(p, dt);
    // new inputs
    if (canAct && inp.pressed('ult')) { if (!this.ultimate(p)) this.party.buzz(p, 15); }
    if (!f.act && !f.spin && canAct) {
      if (inp.pressed('x') && f.cd <= 0) this.special(p);
      else if (inp.pressed('a')) {
        if (a.airborne && f.moves.air && a.jumpY > 0.35) { f.airSlam = true; a.jumpV = Math.min(a.jumpV, -9); this.sfx('whoosh'); }
        else this.startLight(p);
      } else if (inp.pressed('x') && f.cd > 0) this.party.buzz(p, 15);
    }
    // hold A to charge a heavy attack
    if (canAct && inp.down('a') && !f.spin && !f.airSlam) {
      f.hold += dt;
      if (f.hold > 0.42 * f.mods.charge && !f.act && !f.charging) { f.charging = true; this.sfx('charge_up'); }
      if (f.charging && Math.random() < dt * 30) {
        // light gathers into the weapon
        const g = rand(0, Math.PI * 2), d = rand(0.7, 1.2), hx = a.pos.x + a.dir.x * 0.35, hy = 1.1 + a.jumpY + (a.baseY || 0), hz = a.pos.z + a.dir.z * 0.35;
        this.vfx.bit('glow', hx + Math.cos(g) * d, hy + rand(-0.4, 0.5), hz + Math.sin(g) * d, { vx: -Math.cos(g) * d * 3.2, vz: -Math.sin(g) * d * 3.2, vy: 0, g: 0, drag: 0, life: 0.3, size: 0.07, s1: 0.02, color: Math.random() < 0.5 ? f.cls.color : '#ffffff' });
        if (f.hold > 0.9 && Math.random() < dt * 6) this.vfx.star(hx, hy, hz, { size: 0.75, color: f.cls.color, life: 0.15 });
      }
    } else {
      if (f.charging && !f.act) this.startHeavy(p);
      f.charging = false;
      f.hold = 0;
    }
    f.comboT -= dt;
    if (f.comboT <= 0) f.combo = 0;
  }

  // a dodge roll where the stick points (or ahead): short i-frames; if a hit
  // lands in its first moments, it’s a PARRY
  roll(p) {
    const f = p.fighter, a = p.actor, v = p.input.moveVector();
    const l = Math.hypot(v.x, v.y);
    const d = l > 0.25 ? { x: v.x / l, z: v.y / l } : a.dir;
    const sp = f.mods.blink ? 18 : 9;
    f.roll = { t: 0.3, age: 0, vx: d.x * sp, vz: d.z * sp };
    f.inv = Math.max(f.inv, 0.32);
    f.rollCd = 0.7 * (f.mods.rollCd || 1);
    if (f.mods.rollReload) f.cd = Math.max(0, f.cd - f.mods.rollReload);
    if (f.mods.blink) { this.vfx.star(a.pos.x, 0.9, a.pos.z, { size: 1.5, color: '#c9a2ff', life: 0.25 }); this.vfx.sparks(a.pos.x, 0.9, a.pos.z, { n: 10, color: '#c9a2ff', kind: 'shard', speed: 3 }); }
    if (f.mods.caltrops) this.patch(a.pos.x, a.pos.z, 1.1, p, 'caltrops', 3);
    if (f.mods.rollBuff) { f.buff = Math.max(f.buffT > 0 ? f.buff : 0, f.mods.rollBuff); f.buffT = Math.max(f.buffT, 2); }
    f.act = null; f.charging = false; f.hold = 0; f.queued = false;
    a.dir = d; a.model.targetFacing = Math.atan2(d.x, d.z);
    a.squash = 0.6;
    this.sfx('whoosh');
    this.party.buzz(p, 12);
    if (f.cls.dodge) K9.dodge(this, p);
  }

  parry(q, e, shot) {
    const f = q.fighter;
    f.inv = Math.max(f.inv, 0.5);
    f.counter = 2.2;
    f.roll = null;
    this.hitstop = Math.max(this.hitstop, 0.12);
    this.popText(q.pos.x, 2.3, q.pos.z, t('PARRY!'), '#ffd66b', true);
    this.vfx.star(q.pos.x, 1.1, q.pos.z, { size: 2, kind: 'rays', color: '#ffd66b', life: 0.35 });
    this.vfx.shockwave(q.pos.x, q.pos.z, { r: 1.3, color: '#ffd66b', life: 0.3, wall: 0.35 });
    this.vfx.sparks(q.pos.x, 1.1, q.pos.z, { n: 12, color: '#fff3a6', speed: 5 });
    this.sfx('block'); this.sfx('crit');
    this.party.buzz(q, [20, 20, 60]);
    if (shot) {
      // the shot flies back at the gloom, harder and homing
      shot.team = this.pvp ? 'p' + q.slot : 'hero'; shot.owner = q; shot.src = null;
      shot.vx *= -1.35; shot.vz *= -1.35; shot.dmg *= 1.5; shot.life = 1.4; shot.homing = 4; shot.hit = new Set();
      this.popText(q.pos.x, 2.8, q.pos.z, t('Deflect!'), '#b9e6ff');
    } else if (e && e.alive && e.def.boss) {
      // bosses only reel a moment — but long enough for a finisher
      e.stagger = Math.max(e.stagger || 0, 1.1);
      e.stun = Math.max(e.stun, 0.35);
    } else if (e && e.alive) {
      e.stun = Math.max(e.stun, 1.6);
      e.stagger = Math.max(e.stagger || 0, 1.6);
      const dx = e.x - q.pos.x, dz = e.z - q.pos.z, l = Math.hypot(dx, dz) || 1;
      if (!e.def.boss) e.knock = { vx: (dx / l) * 5, vz: (dz / l) * 5, t: 0.14 };
    }
  }

  // the element a move carries: its own, or the hero’s weapon rune / talents
  elemFor(p, A) {
    if (!p || !p.fighter) return A.elem || null;
    const f = p.fighter;
    if (A.elem) return A.elem;
    if (f.sizzle > 0) return 'fire';
    if (f.elem && (A === f.moves.heavy || Math.random() < (f.elemChance || 0.25))) return f.elem;
    return null;
  }

  // aim: face the best target in a cone ahead (so thumbs on phones feel good)
  aim(p, range = 8, cone = 0.62) {
    const a = p.actor;
    let best = null, bs = -1e9;
    for (const q of this.targetsOf(p, true)) {
      const ex = q.x - a.pos.x, ez = q.z - a.pos.z, d = Math.hypot(ex, ez);
      if (d < 0.2 || d > range) continue;
      const cos = (ex * a.dir.x + ez * a.dir.z) / d;
      if (cos < cone) continue;
      const s = cos * 3 - d * 0.25;
      if (s > bs) { bs = s; best = { x: ex / d, z: ez / d, d }; }
    }
    if (best) { a.dir = { x: best.x, z: best.z }; a.model.targetFacing = Math.atan2(best.x, best.z); }
    return best;
  }

  // things a player can hit: gloom (or everyone else in a brawl, or friends
  // too when the host turned friendly fire on — never auto-aimed at)
  targetsOf(p, aiming = false) {
    const out = [];
    for (const e of this.enemies) if (e.hurtable) out.push({ x: e.x, z: e.z, e });
    if (this.pvp || (this.friendlyFire && !aiming)) for (const q of this.players) if (q !== p && q.fighter && !q.fighter.down && q.connected) out.push({ x: q.pos.x, z: q.pos.z, p: q });
    return out;
  }

  startLight(p) {
    const f = p.fighter, L = f.moves.light;
    let def = L[f.combo % L.length];
    if (f.mods.crescendo && def.kind === 'shot') { f.noteN = (f.noteN || 0) + 1; if (f.noteN % 10 === 0) { def = { ...def, dmg: def.dmg * 3, r: def.r * 1.7, knock: (def.knock || 2) * 1.6, pierce: (def.pierce || 0) + 3 }; this.popText(p.pos.x, 2.4, p.pos.z, t('Crescendo!'), '#f59ac8'); } }
    f.combo = (f.combo % L.length) + 1;
    f.comboT = 0.75;
    f.act = { def, t: 0, done: false };
    if (def.kind === 'melee') this.aim(p, 2.6, 0.3); else this.aim(p, 9, 0.55);
  }

  startHeavy(p) {
    const f = p.fighter;
    f.act = { def: f.moves.heavy, t: 0, done: false };
    this.aim(p, f.moves.heavy.kind === 'shot' ? 9 : 3, 0.4);
    f.combo = 0;
  }

  perform(p, A) {
    const f = p.fighter, a = p.actor;
    const dm = this.dmgMul(p);
    A = K9.before(this, p, A);
    if (A.sfx) this.sfx(A.sfx);
    if (A.kind === 'melee') {
      const range = A.range * f.mods.range;
      for (const tg of this.targetsOf(p)) {
        const dx = tg.x - a.pos.x, dz = tg.z - a.pos.z, d = Math.hypot(dx, dz);
        const reach = range + (tg.e ? tg.e.r : 0.3);
        if (d > reach) continue;
        const ang = Math.acos(Math.max(-1, Math.min(1, (dx * a.dir.x + dz * a.dir.z) / (d || 1))));
        if (d > 0.35 && ang > A.arc / 2) continue;
        if (tg.e && tg.e.y > 1.7) continue; // out of reach in the air
        this.hit(tg, A.dmg * dm, { p, dir: a.dir, knock: A.knock, launch: A.launch, stun: A.stun, heavy: A === f.moves.light[2] || !!A.hitstop || A === f.moves.heavy, kind: 'melee', elem: this.elemFor(p, A), lit: A.lit, blind: A.blind, root: A.root });
      }
      this.swingFx(p, A, range);
      if (A.lunge) f.dash = { vx: a.dir.x * A.lunge, vz: a.dir.z * A.lunge, t: 0.12 };
      if (A.quake) this.zone({ x: a.pos.x + a.dir.x * range * 0.8, z: a.pos.z + a.dir.z * range * 0.8, r: A.quake, delay: 0.06, dmg: A.dmg * dm * 0.45, knock: 2.5, launch: 3, p, kind: 'quake', color: f.cls.color, quiet: true });
    } else if (A.kind === 'shot') {
      const mc = TRAIL[A.look] || f.cls.color;
      this.vfx.star(a.pos.x + a.dir.x * 0.5, 1.05 + a.jumpY + (a.baseY || 0), a.pos.z + a.dir.z * 0.5, { size: A === f.moves.heavy ? 1 : 0.75, color: mc, life: 0.12 });
      const b = Math.atan2(a.dir.z, a.dir.x);
      if (A.fan) {
        const full = (A.spread || 0) >= Math.PI * 2 - 0.01;
        for (let i = 0; i < A.fan; i++) { const k = full ? (i / A.fan) * Math.PI * 2 : A.fan > 1 ? (i / (A.fan - 1) - 0.5) * (A.spread || 0.6) : 0; this.fire(p, A, dm, { x: Math.cos(b + k), z: Math.sin(b + k) }); }
      } else if (A.twin) { for (const k of [-0.2, 0.2]) this.fire(p, A, dm, { x: Math.cos(b + k), z: Math.sin(b + k) }); }
      else this.fire(p, A, dm);
      if (f.mods.legend === 'moontome' && (f.castN = (f.castN || 0) + 1) % 5 === 0) this.fire(p, { ...A, fan: 0, dmg: A.dmg * 4, r: 0.5, homing: 5, life: 1.6, speed: A.speed * 0.8, look: 'orb', pierce: 2 }, dm);
    } else if (A.kind === 'aoe') {
      const cx = a.pos.x + a.dir.x * (A.at || 0), cz = a.pos.z + a.dir.z * (A.at || 0);
      this.blast(cx, cz, A.r * f.mods.range, A.dmg * dm, A.knock, { p, launch: A.launch, stun: A.stun, color: A.ring || f.cls.color, elem: this.elemFor(p, A), lit: A.lit, blind: A.blind, root: A.root });
      if (A.shake) this.party.cam.shake = Math.max(this.party.cam.shake || 0, A.shake);
      if (A.taunt) for (const e of this.enemies) if (e.alive && Math.hypot(e.x - cx, e.z - cz) < A.r * f.mods.range + 2.5) { e.tauntBy = p; e.tauntT = A.taunt; }
      if (A.thunder) this.zone({ x: cx, z: cz, r: A.r * f.mods.range * 1.2, delay: 0.45, dmg: A.dmg * dm * 0.7, knock: A.knock * 0.6, p, kind: 'thunder', elem: 'shock' });
      if (A.echo) this.zone({ x: cx, z: cz, r: A.r * f.mods.range * 1.6, delay: 0.5, dmg: A.dmg * dm * 0.5, knock: A.knock * 0.7, p, kind: 'echo', color: f.cls.color });
      if (A.twirl) this.vfx.slash(a.pos.x, 0.8, a.pos.z, Math.atan2(a.dir.x, a.dir.z), { r: A.r * f.mods.range, arc: 6.1, color: f.cls.color, life: 0.3, sweep: 2.5 });
      if (A === f.moves.heavy && f.mods.legend === 'castiron') {
        for (const q of this.players) if (q.fighter && !q.fighter.down && q.connected && Math.hypot(q.pos.x - cx, q.pos.z - cz) < A.r + 1.5) { q.fighter.hp = Math.min(q.fighter.maxHp, q.fighter.hp + q.fighter.maxHp * 0.08); this.vfx.pillar(q.pos.x, q.pos.z, { r: 0.45, h: 2.5, color: '#8fd6b4', life: 0.6 }); }
      }
      if (f.mods.legend === 'thunderdrum' && Math.random() < 0.3) {
        const tg = this.enemies.filter((e) => e.alive && e.hurtable && Math.hypot(e.x - cx, e.z - cz) < A.r + 2), e = tg[Math.floor(Math.random() * tg.length)];
        if (e) { this.vfx.lightning(e.x, e.z); this.hurtEnemy(e, 12 * dm, { p, knock: 1, kind: 'aoe', elem: 'shock', noCombo: true }); }
      }
    } else K9.perform(this, p, A, dm);
    K9.after(this, p, A, dm);
    if (A.hitstop && f.hits) this.hitstop = Math.max(this.hitstop, A.hitstop);
  }

  fire(p, A, dm, dir = null, speedMul = 1) {
    const a = p.actor;
    const d = dir || a.dir;
    const s = {
      team: this.pvp ? 'p' + p.slot : 'hero', owner: p, def: A,
      x: a.pos.x + d.x * 0.4, y: 1.05 + (a.baseY || 0) + a.jumpY, z: a.pos.z + d.z * 0.4,
      vx: d.x * A.speed * speedMul, vz: d.z * A.speed * speedMul, vy: 0,
      r: A.r, dmg: A.dmg * dm, knock: A.knock || 1.4, life: A.life, pierce: A.pierce || 0, homing: A.homing || 0,
      gravity: A.gravity || 0, explode: A.explode ? { ...A.explode, dmg: A.explode.dmg * dm } : null, hit: new Set(), look: A.look,
      elem: this.elemFor(p, A), heavy: A === p.fighter.moves.heavy,
    };
    if (p.fighter.deadeye > 0) { s.pierce = 99; s.crit = true; }
    if (A.returns) { s.returns = A.returns * (p.fighter.mods.legend === 'homecoming' ? 2 : 1); s.life0 = A.life; }
    if (A.lob) {
      // lob to about `lob` tiles ahead (or at the aimed target)
      const tgt = this.aim(p, 7, 0.5);
      const dist = tgt ? Math.min(7, tgt.d) : A.lob;
      const tt = dist / A.speed;
      s.vy = (0.5 * A.gravity * tt * tt - 0.8) / tt;
    }
    s.mesh = this.shotMesh(A.look);
    if ((A.look === 'orb' || A.look === 'zap') && A.r > 0.4) s.mesh.scale.multiplyScalar(A.r / 0.34);
    s.mesh.position.set(s.x, s.y, s.z);
    this.root.add(s.mesh);
    this.shots.push(s);
    return s;
  }

  shotMesh(look) {
    let m;
    if (look === 'note' || look === 'note2') {
      m = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.noteTex[look === 'note' ? 0 : 1], transparent: true, depthWrite: false }));
      m.scale.set(0.5, 0.5, 1);
    } else if (look === 'acorn') { m = new THREE.Mesh(this.geo.acorn, this.mat(0x9a6440)); }
    else if (look === 'pinecone') { m = new THREE.Mesh(this.geo.pine, this.mat(0x8a5a36)); m.scale.set(1, 1.3, 1); }
    else if (look === 'comet') { m = new THREE.Mesh(this.geo.comet, this.mat(0xffe9a0, 0xffc94a)); }
    else if (look === 'spore') { m = new THREE.Mesh(this.geo.spore, this.mat(0xb58ae8, 0x7a4ab0)); }
    else if (look === 'ice') { m = new THREE.Mesh(this.geo.star, this.mat(0xdff4ff, 0x6ac0ff)); m.scale.set(0.8, 0.8, 1.8); }
    else if (look === 'bubble') { m = new THREE.Mesh(this.geo.spore, new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.6, depthWrite: false })); m.scale.setScalar(1.7); }
    else if (look === 'lava') { m = new THREE.Mesh(this.geo.spore, this.mat(0xffb040, 0xff6a1a)); m.scale.setScalar(1.3); }
    else if (look === 'snowball') { m = new THREE.Mesh(this.geo.spore, this.mat(0xf4f8ff)); m.scale.setScalar(2.2); }
    else if (look === 'feather') { m = new THREE.Mesh(this.geo.acorn, this.mat(0x8a5ab0)); m.scale.set(0.4, 0.3, 1.8); }
    else if (look === 'venom') { m = new THREE.Mesh(this.geo.spore, this.mat(0x8ae05a, 0x3a9a2a)); m.scale.setScalar(1.4); }
    else if (look === 'bomb') { m = new THREE.Mesh(this.geo.spore, this.mat(0x3a2450, 0x6a3a8e)); m.scale.setScalar(1.5); }
    else if (look === 'rock') { m = new THREE.Mesh(this.geo.spore, this.mat(0x8a8290)); m.scale.set(2.6, 2.1, 2.3); }
    else if (look === 'dynamite') { m = new THREE.Group(); const st = new THREE.Mesh(this.geo.acorn, this.mat(0xd8483a)); st.scale.set(0.7, 2.2, 0.7); const sp = new THREE.Mesh(this.geo.dust, this.mat(0xfff0a0, 0xffd23a)); sp.position.y = 0.26; m.add(st, sp); }
    else if (look === 'coin') { m = new THREE.Mesh(this.geo.spore, this.mat(0xf2c14e, 0x8a5aa8)); m.scale.set(1.5, 0.5, 1.5); }
    else if (look === 'arrow') { m = new THREE.Group(); const shaft = new THREE.Mesh(this.geo.box || (this.geo.box = new THREE.BoxGeometry(1, 1, 1)), this.mat(0xc8a070)); shaft.scale.set(0.05, 0.05, 0.6); const tip = new THREE.Mesh(this.geo.box, this.mat(0xdcdce8)); tip.scale.set(0.09, 0.09, 0.12); tip.position.z = 0.33; const fl = new THREE.Mesh(this.geo.box, this.mat(0xec5f73)); fl.scale.set(0.12, 0.03, 0.12); fl.position.z = -0.26; m.add(shaft, tip, fl); }
    else if (look === 'dart') { m = new THREE.Group(); const b = new THREE.Mesh(this.geo.box || (this.geo.box = new THREE.BoxGeometry(1, 1, 1)), this.mat(0x6ac04a)); b.scale.set(0.04, 0.04, 0.34); const f2 = new THREE.Mesh(this.geo.box, this.mat(0xfff3c4)); f2.scale.set(0.09, 0.09, 0.08); f2.position.z = -0.17; m.add(b, f2); }
    else if (look === 'boomerang') { m = new THREE.Group(); const k = this.geo.box || (this.geo.box = new THREE.BoxGeometry(1, 1, 1)); const a1 = new THREE.Mesh(k, this.mat(0xd8a060)); a1.scale.set(0.42, 0.06, 0.12); a1.position.x = 0.14; const a2 = new THREE.Mesh(k, this.mat(0xc8864a)); a2.scale.set(0.12, 0.06, 0.42); a2.position.z = 0.14; m.add(a1, a2); }
    else if (look === 'orb') { m = new THREE.Mesh(this.geo.orb || (this.geo.orb = new THREE.IcosahedronGeometry(0.2, 1)), this.mat(0xbfe8ff, 0x6ac0ff)); }
    else if (look === 'zap') { m = new THREE.Mesh(this.geo.star, this.mat(0xfffbd0, 0xffe066)); m.scale.set(0.9, 0.9, 0.9); }
    else if (look === 'page') { m = new THREE.Mesh(this.geo.star, this.mat(0xe8d0ff, 0xb88cf0)); m.scale.set(0.8, 0.8, 0.4); }
    // (Release v9) a seed, a thorn pod, a splash of boiling tea, a will-o'-the-wisp
    else if (look === 'seed') { m = new THREE.Mesh(this.geo.acorn, this.mat(0xc8a060)); m.scale.set(0.6, 0.8, 0.6); }
    else if (look === 'pod') { m = new THREE.Group(); const b = new THREE.Mesh(this.geo.spore, this.mat(0x4f955a)); b.scale.set(1.4, 1.7, 1.4); const sp = new THREE.Mesh(this.geo.star, this.mat(0xd8f0a0)); sp.scale.set(0.5, 0.9, 0.5); sp.position.y = 0.22; m.add(b, sp); }
    else if (look === 'tea') { m = new THREE.Mesh(this.geo.spore, this.mat(0xe8c890, 0x8a5a2a)); m.scale.setScalar(1.2); }
    else if (look === 'beam') { m = new THREE.Mesh(this.geo.star, this.mat(0xfffbe8, 0xffe89a)); m.scale.set(0.7, 0.7, 2.4); }
    else if (look === 'pepper') { m = new THREE.Mesh(this.geo.spore, this.mat(0x8a7a6a)); m.scale.setScalar(0.9); }
    else if (look === 'rivet') { m = new THREE.Mesh(this.geo.acorn, this.mat(0xc8c4d0)); m.scale.set(0.5, 0.5, 1.1); }
    else if (look === 'tool') { m = new THREE.Group(); const k = this.geo.box || (this.geo.box = new THREE.BoxGeometry(1, 1, 1)); const h = new THREE.Mesh(k, this.mat(0x8a8492)); h.scale.set(0.08, 0.08, 0.42); const j = new THREE.Mesh(k, this.mat(0x6a6571)); j.scale.set(0.2, 0.08, 0.1); j.position.z = 0.22; m.add(h, j); }
    else if (look === 'wisp') { m = new THREE.Mesh(this.geo.orb || (this.geo.orb = new THREE.IcosahedronGeometry(0.2, 1)), this.mat(0xfff0a0, 0xffa030)); m.scale.setScalar(1.3); }
    else { m = new THREE.Mesh(this.geo.star, this.mat(0xfff3a6, 0xffd66b)); m.scale.set(1, 1, 0.5); }
    m.castShadow = true;
    return m;
  }

  updateShots(dt) {
    const col = this.world.overCol;
    for (const s of this.shots) {
      s.life -= dt;
      if (s.homing) {
        let best = null, bd = 5;
        const tgs = s.team === 'gloom' ? this.alivePlayers().map((p) => ({ x: p.pos.x, z: p.pos.z })) : this.enemies.filter((e) => e.hurtable).map((e) => ({ x: e.x, z: e.z }));
        for (const q of tgs) { const d = Math.hypot(q.x - s.x, q.z - s.z); if (d < bd) { bd = d; best = q; } }
        if (best) {
          const sp = Math.hypot(s.vx, s.vz), want = Math.atan2(best.z - s.z, best.x - s.x);
          let cur = Math.atan2(s.vz, s.vx), d = want - cur;
          while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
          cur += Math.max(-s.homing * dt, Math.min(s.homing * dt, d));
          s.vx = Math.cos(cur) * sp; s.vz = Math.sin(cur) * sp;
        }
      }
      if (s.gravity) s.vy -= s.gravity * dt;
      s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
      s.mesh.position.set(s.x, s.y, s.z);
      if (s.look === 'arrow' || s.look === 'dart') s.mesh.rotation.set(0, Math.atan2(s.vx, s.vz), 0);
      else if (s.look === 'boomerang') s.mesh.rotation.y += dt * 22;
      else { s.mesh.rotation.y += dt * 9; s.mesh.rotation.x += dt * 5; }
      // a boomerang turns back halfway, and is caught
      if (s.returns && s.owner && s.owner.connected) {
        if (!s.back && s.life < s.life0 * 0.5) { s.back = true; s.hit = new Set(); s.life = 3; }
        if (s.back) {
          const o = s.owner.pos, dx = o.x - s.x, dz = o.z - s.z, l = Math.hypot(dx, dz) || 1, sp = Math.hypot(s.vx, s.vz);
          s.vx = (dx / l) * sp; s.vz = (dz / l) * sp;
          if (l < 0.6) {
            if (--s.returns > 0) { const d = s.owner.actor.dir; s.back = false; s.life = s.life0; s.hit = new Set(); s.vx = d.x * sp; s.vz = d.z * sp; }
            else s.caught = true;
          }
        }
      }
      // ball lightning: zaps the nearest gloom as it drifts
      if (s.def && s.def.pulse && s.team !== 'gloom') {
        s.pulseT = (s.pulseT ?? s.def.pulse) - dt;
        if (s.pulseT <= 0) {
          s.pulseT = s.def.pulse;
          let best = null, bd = 2.8;
          for (const e of this.enemies) { if (!e.hurtable) continue; const d = Math.hypot(e.x - s.x, e.z - s.z); if (d < bd) { bd = d; best = e; } }
          if (best) { this.vfx.chain({ x: s.x, y: s.y, z: s.z }, { x: best.x, y: best.y + best.def.h * 0.6, z: best.z }); this.hurtEnemy(best, s.dmg, { p: s.owner, knock: 0.5, kind: 'aoe', elem: 'shock', quiet: true }); }
        }
      }
      const tc = TRAIL[s.look];
      if (tc) {
        const here = { x: s.x, y: s.y, z: s.z };
        if (s.last) this.vfx.trailLine(s.last, here, { color: tc, size: s.look === 'acorn' ? 0.06 : Math.max(0.08, s.r * 0.55), life: s.look === 'acorn' ? 0.1 : s.look === 'comet' ? 0.32 : 0.22 }, s.look === 'acorn' ? 0.3 : 0.14);
        if (s.look === 'comet' && Math.random() < 0.5) this.vfx.bit('ember', s.x, s.y, s.z, { vx: rand(-1, 1), vy: rand(0, 1.2), vz: rand(-1, 1), g: 3, life: 0.35, size: 0.06, color: Math.random() < 0.5 ? '#ff6a1a' : '#ffd66b' });
        s.last = here;
      }
      let dead = s.caught || s.life <= 0 || (s.gravity && s.y <= 0.12) || col.blocked(s.x, s.z, 0.05) && this.world.tileAt(s.x, s.z) !== TT.WATER;
      if (!dead) {
        // who does it hit?
        if (s.team === 'gloom') {
          for (const p of this.players) {
            const f = p.fighter;
            if (!f || f.down || !p.connected || s.hit.has(p)) continue;
            if (Math.hypot(p.pos.x - s.x, p.pos.z - s.z) < s.r + 0.3 && s.y < 1.7 + p.actor.jumpY && s.y > p.actor.jumpY - 0.1) { s.hit.add(p); if (this.hurtPlayer(p, s.dmg, { dir: norm(s.vx, s.vz), knock: 2, src: s.src, shot: s, elem: s.elem }) !== 'parry') dead = true; break; }
          }
        } else {
          for (const e of this.enemies) {
            if (!e.hurtable || s.hit.has(e)) continue;
            if (Math.hypot(e.x - s.x, e.z - s.z) < s.r + e.r && s.y > e.y - 0.3 && s.y < e.y + e.def.h + 0.5) {
              s.hit.add(e);
              this.hit({ e, x: e.x, z: e.z }, s.dmg, { p: s.owner, dir: norm(s.vx, s.vz), knock: s.knock, kind: 'shot', heavy: !!s.heavy, elem: s.explode ? null : s.elem, crit: !!s.crit, lit: s.def && s.def.lit, blind: s.def && s.def.blind, root: s.def && !s.explode ? s.def.root : 0 });
              if (s.def && s.def.chain && s.owner) this.chainZap(e, s.owner, s.def.chain, s.dmg * 0.6);
              if (((s.def && s.def.split) || (s.look === 'arrow' && s.owner && s.owner.fighter && s.owner.fighter.mods.legend === 'galewing')) && !s.child && s.owner) this.splitShot(s, e);
              if (s.explode || s.pierce-- <= 0) { dead = true; break; }
            }
          }
          if (!dead && (this.pvp || this.friendlyFire)) for (const q of this.players) {
            if (q === s.owner || !q.fighter || q.fighter.down || s.hit.has(q)) continue;
            if (Math.hypot(q.pos.x - s.x, q.pos.z - s.z) < s.r + 0.3 && s.y < 1.7 + q.actor.jumpY) {
              s.hit.add(q);
              this.hit({ p: q, x: q.pos.x, z: q.pos.z }, s.dmg, { p: s.owner, dir: norm(s.vx, s.vz), knock: s.knock, kind: 'shot' });
              if (s.explode || s.pierce-- <= 0) { dead = true; break; }
            }
          }
        }
      }
      if (dead) {
        s.dead = true;
        this.root.remove(s.mesh);
        if (s.explode) {
          const rr = s.explode.r * (s.owner && s.owner.fighter ? s.owner.fighter.mods.range : 1);
          this.blast(s.x, s.z, rr, s.explode.dmg, s.explode.knock, { p: s.owner, color: s.look === 'pinecone' ? '#c8864a' : s.look === 'pod' ? '#6fc05a' : '#ffd66b', boom: s.look !== 'pod', elem: s.elem, root: s.def && s.def.root, lit: s.def && s.def.lit, blind: s.def && s.def.blind });
          if (s.def && s.def.burnGround && s.owner) this.patch(s.x, s.z, rr * 0.8, s.owner, 'fire', typeof s.def.burnGround === 'number' ? s.def.burnGround : 3.2);
          if (s.def && s.def.cluster && !s.child) for (let i = 0; i < s.def.cluster; i++) { const a = Math.random() * Math.PI * 2, d = rr * 0.9 + Math.random(); this.zone({ x: s.x + Math.cos(a) * d, z: s.z + Math.sin(a) * d, r: 1, delay: 0.25 + i * 0.12, dmg: s.explode.dmg * 0.4, knock: 2, p: s.owner, kind: 'cluster', elem: s.elem }); }
        }
        else if (s.look === 'spore') this.vfx.smoke(s.x, 0.4, s.z, { n: 3, color: '#9a7ab8', size: 0.2 });
        else if (!s.caught) this.vfx.hit(s.x, s.y, s.z, { color: TRAIL[s.look] || '#fff3c4' });
        if (s.def && s.def.cloud && s.owner) this.patch(s.x, s.z, s.def.cloud.r, s.owner, 'poison', s.def.cloud.life);
        if (s.look === 'orb' && !s.explode && s.owner && s.owner.fighter && s.owner.fighter.mods.legend === 'suntail') this.blast(s.x, s.z, 1.5, 10 * this.dmgMul(s.owner), 2.5, { p: s.owner, boom: true, elem: 'fire', color: '#ff8a3a' });
      }
    }
    this.shots = this.shots.filter((s) => !s.dead);
  }

  // a spark jumps from foe to foe (the Crystal Orb)
  chainZap(from, p, n, dmg) {
    let cur = from;
    const done = new Set([from]);
    for (let i = 0; i < n; i++) {
      let best = null, bd = 3.2;
      for (const e of this.enemies) { if (!e.hurtable || done.has(e)) continue; const d = Math.hypot(e.x - cur.x, e.z - cur.z); if (d < bd) { bd = d; best = e; } }
      if (!best) break;
      done.add(best);
      this.vfx.chain({ x: cur.x, y: cur.y + cur.def.h * 0.6, z: cur.z }, { x: best.x, y: best.y + best.def.h * 0.6, z: best.z }, { color: '#ffe066' });
      this.hurtEnemy(best, dmg, { p, knock: 0.6, kind: 'aoe', quiet: true, noCombo: true });
      cur = best;
    }
  }

  // Split Bolt: a star bolt that hits splits into two little ones
  splitShot(s, e) {
    const base = Math.atan2(s.vz, s.vx), sp = Math.hypot(s.vx, s.vz);
    for (const k of [-0.7, 0.7]) {
      const c = { ...s, child: true, hit: new Set([e]), dmg: s.dmg * 0.5, life: 0.5, x: e.x, z: e.z, vx: Math.cos(base + k) * sp, vz: Math.sin(base + k) * sp, homing: s.def && s.def.splitHome ? 6 : 2 };
      c.mesh = this.shotMesh(s.look); c.mesh.scale.multiplyScalar(0.7); c.mesh.position.set(c.x, c.y, c.z);
      this.root.add(c.mesh);
      this.shots.push(c);
    }
  }

  // Scorched Earth: a patch of burning ground that singes gloom
  // a patch of ground that hurts the gloom: burning (fire) or prickly caltrops (they slow)
  patch(x, z, r, p, kind = 'fire', life = 3.2) {
    const m = new THREE.Mesh(this.geo.disc, new THREE.MeshBasicMaterial({ color: kind === 'fire' ? 0xff7a2a : kind === 'poison' ? 0x6ac04a : 0x8a6a4a, transparent: true, opacity: 0.45, depthWrite: false }));
    m.scale.setScalar(r); m.position.set(x, 0.035, z);
    this.root.add(m);
    (this.patches || (this.patches = [])).push({ x, z, r, p, t: 0, life, tick: 0, m, kind });
    if (kind === 'caltrops') this.vfx.debris(x, z, { n: 8, r: r * 0.6, color: '#6a5040', up: 2, speed: 1.5, size: 0.08 });
  }

  updatePatches(dt) {
    if (!this.patches || !this.patches.length) return;
    for (const q of this.patches) {
      q.t += dt; q.tick -= dt;
      const fire = q.kind === 'fire';
      q.m.material.opacity = (fire ? 0.45 : 0.3) * (1 - q.t / q.life) + (fire ? Math.sin(q.t * 12) * 0.05 : 0);
      if (q.kind === 'poison' && Math.random() < dt * 8) this.vfx.smoke(q.x + rand(-q.r, q.r) * 0.6, 0.1, q.z + rand(-q.r, q.r) * 0.6, { n: 1, color: Math.random() < 0.5 ? '#8fdc5a' : '#5aa040', size: 0.14, rise: 0.4, life: 0.9 });
      if (fire && Math.random() < dt * 14) this.vfx.bit('ember', q.x + rand(-q.r, q.r) * 0.7, 0.1, q.z + rand(-q.r, q.r) * 0.7, { vy: rand(1, 2.4), g: -0.5, life: rand(0.4, 0.8), size: 0.07, color: Math.random() < 0.5 ? '#ffb040' : '#ff6a1a' });
      if (q.tick <= 0) { q.tick = 0.5; for (const e of this.enemies) if (e.hurtable && Math.hypot(e.x - q.x, e.z - q.z) < q.r + e.r) { if (fire) applyElement(this, e, 'fire', { p: q.p, power: q.p && q.p.fighter ? this.dmgMul(q.p) : 1 }); else if (q.kind === 'poison') applyElement(this, e, 'poison', { p: q.p }); else { applyElement(this, e, 'ice', { p: q.p }); this.hurtEnemy(e, 3, { p: q.p, knock: 0, kind: 'dot', quiet: true, noCombo: true, color: '#c8a070' }); } } }
      if (q.t >= q.life) { this.root.remove(q.m); q.done = true; }
    }
    this.patches = this.patches.filter((q) => !q.done);
  }

  // an explosion / slam: everything in the circle gets hit
  blast(x, z, r, dmg, knock, { p = null, launch = 0, stun = 0, color = '#ffd66b', boom = false, gloom = false, elem = null, lit = 0, blind = 0, root = 0 } = {}) {
    this.blastFx(x, z, r, { color, boom, gloom, elem });
    if (boom) { this.sfx('boom'); this.party.cam.shake = Math.max(this.party.cam.shake || 0, 0.3); }
    if (gloom) {
      for (const q of this.alivePlayers()) {
        const d = Math.hypot(q.pos.x - x, q.pos.z - z);
        if (d < r + 0.3) this.hurtPlayer(q, dmg, { dir: norm(q.pos.x - x, q.pos.z - z), knock, elem });
      }
      return;
    }
    const src = p || { slot: -1 };
    for (const tg of p ? this.targetsOf(p) : this.enemies.filter((e) => e.hurtable).map((e) => ({ e, x: e.x, z: e.z }))) {
      const d = Math.hypot(tg.x - x, tg.z - z);
      if (d > r + (tg.e ? tg.e.r : 0.3)) continue;
      if (tg.e && tg.e.y > 2 && !tg.e.def.boss) continue;
      this.hit(tg, dmg, { p, dir: d > 0.05 ? norm(tg.x - x, tg.z - z) : { x: 0, z: 1 }, knock, launch, stun, kind: 'aoe', heavy: true, elem, lit, blind, root });
    }
    void src;
  }

  // a swing’s arc: sweeps one way, then back, then a big overhead smash
  swingFx(p, A, range) {
    const f = p.fighter, a = p.actor, V = this.vfx;
    const el = this.elemFor(p, A), color = el ? VFX_COL[el] : f.cls.color;
    const y = 0.72 + (a.baseY || 0) + a.jumpY, ang = Math.atan2(a.dir.x, a.dir.z);
    const big = A === f.moves.light[2] || A === f.moves.heavy;
    if (A.pose === 'smash') {
      V.slash(a.pos.x, y + 0.1, a.pos.z, ang, { r: range * 0.9, arc: 2.2, color, dir: 1, life: 0.22, vertical: true, sweep: 1.2 });
      const hx = a.pos.x + a.dir.x * range * 0.8, hz = a.pos.z + a.dir.z * range * 0.8;
      V.later(0.05, () => { V.shockwave(hx, hz, { r: 1.1, color, life: 0.32, wall: 0.4 }); V.debris(hx, hz, { n: 5, r: 0.3 }); V.star(hx, 0.3, hz, { size: 1, color, life: 0.15 }); });
    } else V.slash(a.pos.x, y, a.pos.z, ang, { r: range * (big ? 1.05 : 0.92), arc: Math.min(3.4, A.arc * 0.95), color, dir: A.pose === 'backswing' ? -1 : 1, bank: A.pose === 'backswing' ? 0.22 : -0.22, life: big ? 0.26 : 0.19 });
  }

  // what a blast looks like: a shockwave & debris, an explosion, the element’s own touch
  blastFx(x, z, r, { color = '#ffd66b', boom = false, gloom = false, elem = null } = {}) {
    const V = this.vfx, ec = elem ? VFX_COL[elem] : null;
    if (boom) V.explosion(x, z, { r: Math.max(0.8, r * 0.8), color: ec || color, hot: elem === 'ice' ? '#ffffff' : '#fff3c4', big: r > 2.2, blast: BLASTS[elem] || (gloom ? BLASTS.gloom : color === '#f59ac8' ? BLASTS.song : BLASTS.fire) });
    else {
      V.shockwave(x, z, { r, color: ec || color, life: 0.42, wall: gloom ? 0.8 : 0.55 });
      V.debris(x, z, { n: Math.round(4 + r * 3), r: r * 0.45, color: gloom ? '#4a3a5a' : '#8a6a4a' });
      V.smoke(x, 0.15, z, { n: 2, size: 0.12 + r * 0.04, color: gloom ? '#6a4a8e' : '#c8bca8', spread: r * 0.5, rise: 0.5, life: 0.6 });
    }
    if (elem === 'ice') V.iceSpikes(x, z, { r: r * 0.75, n: Math.round(4 + r * 2), h: 0.6 + r * 0.25 });
    else if (elem === 'shock') { V.sparks(x, 0.4, z, { n: 12, color: '#ffe066', speed: 5, up: 2.5 }); for (let i = 0; i < 3; i++) { const a2 = rand(0, Math.PI * 2), d = r * rand(0.5, 0.9); V.chain({ x, y: 0.5, z }, { x: x + Math.cos(a2) * d, y: 0.15, z: z + Math.sin(a2) * d }, { color: '#ffe066', life: 0.2 }); } }
    else if (elem === 'poison') V.smoke(x, 0.2, z, { n: 5, color: '#8fdc5a', size: 0.16, spread: r * 0.6, rise: 0.6, life: 0.9 });
    else if (elem === 'fire' && !boom) { V.sparks(x, 0.3, z, { n: 14, color: '#ff8a3a', speed: 4, up: 3 }); V.scorch(x, z, { r: r * 0.6 }); }
    if (gloom && !boom) V.sparks(x, 0.3, z, { n: 8, color: GLOOM, speed: 3.5, up: 2.5, kind: 'shard' });
  }

  // ------------------------------------------------------------------ shields & ultimates
  // a shield soaks damage for a while (Pan Shield, Star Barrier, Guardian Angel)
  shieldUp(p, amount, secs) {
    const f = p.fighter;
    if (!f || f.down) return;
    const had = f.shield > 0 && f.shieldT > 0;
    f.shield = Math.max(f.shield || 0, Math.round(amount)); f.shieldT = secs;
    if (!had) this.vfx.bubble(() => ({ x: p.pos.x, y: (p.actor.baseY || 0) + p.actor.jumpY, z: p.pos.z }), () => f.shield > 0 && f.shieldT > 0 && !f.down, { color: '#9fdcff' });
  }

  // the gauge fills as you fight: hits, kills, hits taken
  ultGain(p, n) {
    const f = p && p.fighter;
    if (!f || !f.ultId || f.down || !(n > 0) || f.ultOn > 0) return;
    const was = f.ult;
    f.ult = Math.min(100, f.ult + n);
    if (was < 100 && f.ult >= 100) {
      this.popText(p.pos.x, 2.5, p.pos.z, t('Ultimate ready!'), '#ffd66b', true);
      this.vfx.star(p.pos.x, 1.3, p.pos.z, { size: 2, kind: 'rays', color: '#ffd66b', life: 0.6, spin: 2 });
      audio.sfx('levelup', { volume: 0.45 });
      this.party.buzz(p, [30, 30, 30, 30, 80]);
    }
  }

  // unleash it (the ULT button)
  ultimate(p) {
    const f = p.fighter, a = p.actor;
    if (!f || !f.ultId || f.ult < 100 || f.down) return false;
    const U = ULTS[f.ultId], V = this.vfx, x = a.pos.x, z = a.pos.z, dm = this.dmgMul(p);
    f.ult = 0; f.act = null; f.charging = false; f.hold = 0;
    f.inv = Math.max(f.inv, 0.6);
    f.ultOn = 2.2;            // (an ultimate’s own hits don’t fill the next one)
    this.popText(x, 2.7, z, t('{ult}!', { ult: t(U.name) }), '#ffd66b', true);
    V.star(x, 1.2, z, { size: 2, kind: 'rays', color: '#ffd66b', life: 0.5, spin: 3 });
    V.shockwave(x, z, { r: 3, color: '#ffd66b', life: 0.5, wall: 1 });
    this.hitstop = Math.max(this.hitstop, 0.08);
    this.party.cam.shake = Math.max(this.party.cam.shake || 0, 0.35);
    this.sfx('charge'); this.party.buzz(p, [60, 40, 120]);
    const near = (r) => this.enemies.filter((e) => e.alive && e.hurtable && Math.hypot(e.x - x, e.z - z) < r + e.r);
    switch (f.ultId) {
      case 'bulwark':
        f.bulwark = 6; f.ultOn = 6.5;
        V.dome(() => ({ x: p.pos.x, y: 0, z: p.pos.z }), { r: 4.2, color: '#ffd66b', life: 6 });
        this.sfx('block');
        break;
      case 'tempest':
        if (f.spinFx) f.spinFx.end();
        f.spin = { t: 5, next: 0, ult: true }; f.ultOn = 5.5; f.boltT = 0.3;
        f.spinFx = V.whirl(() => ({ x: p.pos.x, y: (a.baseY || 0) + a.jumpY, z: p.pos.z }), { r: 2.5, color: '#ffe066', life: 5, speed: 18 });
        break;
      case 'earthshaker':
        a.jumpV = Math.max(a.jumpV, 7);
        [2.6, 4.2, 5.8].forEach((r, i) => this.zone({ x, z, r, delay: 0.38 + i * 0.22, dmg: 26 * dm * (1 - i * 0.2), knock: 6, launch: 6, stun: 1.2, p, kind: 'quake', color: f.cls.color, quiet: true }));
        break;
      case 'meteors': f.meteors = { t: 4, next: 0 }; f.ultOn = 4.8; break;
      case 'zero': {
        V.iceSpikes(x, z, { r: 2, n: 8, h: 1.4 }); V.later(0.15, () => V.iceSpikes(x, z, { r: 4.5, n: 12, h: 1.2 })); V.later(0.3, () => V.iceSpikes(x, z, { r: 6.5, n: 14, h: 1 }));
        V.shockwave(x, z, { r: 7, color: '#9fdcff', life: 0.7, wall: 1.2 });
        for (const e of near(7)) {
          this.hurtEnemy(e, 18 * dm, { p, dir: norm(e.x - x, e.z - z), knock: 1, kind: 'aoe', elem: 'ice' });
          if (e.alive && !e.def.boss) freezeNow(this, e, 1.8); else if (e.alive) applyElement(this, e, 'ice', { p, strong: true });
        }
        this.sfx('crackle');
        break;
      }
      case 'barrage': f.barrage = { t: 3, next: 0 }; f.ultOn = 3.8; break;
      case 'deadeye': f.deadeye = 4; f.ultOn = 4.5; V.pillar(x, z, { r: 0.6, h: 3, color: '#9fe07a', life: 0.6 }); break;
      case 'carpet': {
        const d = a.dir, M = f.moves.heavy;
        for (let i = 0; i < 7; i++) {
          const bx = x + d.x * (1.8 + i * 1.15) + rand(-0.4, 0.4), bz = z + d.z * (1.8 + i * 1.15) + rand(-0.4, 0.4);
          this.zone({ x: bx, z: bz, r: 1.6, delay: 0.3 + i * 0.13, dmg: 22 * dm, knock: 4.5, p, kind: 'carpet', arc: { x, y: 1.4, z }, look: 'pinecone', elem: M.elem || 'poison' });
        }
        break;
      }
      case 'shadow': f.shadow = { n: 6, next: 0.05, hit: new Set() }; f.ultOn = 2.5; V.smoke(x, 0.5, z, { n: 5, color: '#3a2450', size: 0.25 }); break;
      case 'hymn': {
        for (const q of this.players) {
          const g = q.fighter;
          if (!g || !q.connected) continue;
          if (g.down) this.revive(q, 1, p); else g.hp = g.maxHp;
          g.inv = Math.max(g.inv, 3); g.buff = Math.max(g.buffT > 0 ? g.buff : 0, 0.2); g.buffT = Math.max(g.buffT, 6);
          V.pillar(q.pos.x, q.pos.z, { r: 0.9, h: 7, color: '#ffe89a', life: 1.4 });
          this.popText(q.pos.x, 2.2, q.pos.z, t('Healed!'), '#8fd6b4');
        }
        V.shockwave(x, z, { r: 8, color: '#ffe89a', life: 0.9, wall: 1.4 });
        this.sfx('song');
        break;
      }
      case 'symphony':
        for (let i = 0; i < 5; i++) this.zone({ x, z, r: 2.4 + i * 1.1, delay: 0.1 + i * 0.28, dmg: 12 * dm, knock: 7 + i, p, kind: 'song', color: '#f59ac8', quiet: true });
        break;
      case 'encore': {
        for (const q of this.players) {
          const g = q.fighter;
          if (!g || g.down || !q.connected) continue;
          g.cd = 0; g.speedT = Math.max(g.speedT, 6); g.hasteT = 6;
          V.star(q.pos.x, 1.3, q.pos.z, { size: 1.5, kind: 'rays', color: '#f59ac8', life: 0.5 });
          for (let i = 0; i < 4; i++) this.world.fx.emit('note', q.pos.x + rand(-0.6, 0.6), 1.6, q.pos.z, 1, { color: ['#f59ac8', '#ffd66b'][i % 2] });
        }
        V.shockwave(x, z, { r: 6, color: '#f59ac8', life: 0.6, wall: 0.8 });
        this.sfx('chord');
        break;
      }
      default: K9.ultimate(this, p, f.ultId, dm); break;
    }
    return true;
  }

  // the ultimates that last a while
  tickUlt(p, dt) {
    const f = p.fighter, a = p.actor, V = this.vfx;
    if (f.ultOn > 0) f.ultOn -= dt;
    if (f.bulwark > 0) {
      f.bulwark -= dt;
      for (const e of this.enemies) {
        if (!e.alive || e.def.boss) continue;
        const dx = e.x - p.pos.x, dz = e.z - p.pos.z, d = Math.hypot(dx, dz);
        if (d < 4.2) { this.moveEnemy(e, (dx / (d || 1)) * 6 * dt, (dz / (d || 1)) * 6 * dt); e.tauntBy = p; e.tauntT = 1; }
      }
    }
    if (f.spin && f.spin.ult && !f.spin.def) {
      f.boltT -= dt;
      if (f.boltT <= 0) {
        f.boltT = 0.4;
        const tg = this.enemies.filter((e) => e.alive && e.hurtable && Math.hypot(e.x - p.pos.x, e.z - p.pos.z) < 6.5);
        const e = tg[Math.floor(Math.random() * tg.length)];
        if (e) { V.lightning(e.x, e.z, { color: '#ffe066' }); this.blast(e.x, e.z, 1.2, 14 * this.dmgMul(p), 2, { p, elem: 'shock', color: '#ffe066' }); this.sfx('thunder'); }
      }
    }
    if (f.meteors) {
      f.meteors.t -= dt; f.meteors.next -= dt;
      if (f.meteors.next <= 0) {
        f.meteors.next = 0.24;
        const tg = this.enemies.filter((e) => e.alive && e.hurtable && Math.hypot(e.x - p.pos.x, e.z - p.pos.z) < 8);
        const e = tg.length && Math.random() < 0.7 ? tg[Math.floor(Math.random() * tg.length)] : null;
        const g = rand(0, Math.PI * 2), d = rand(1.5, 6);
        const mx = e ? e.x + rand(-0.6, 0.6) : p.pos.x + Math.cos(g) * d, mz = e ? e.z + rand(-0.6, 0.6) : p.pos.z + Math.sin(g) * d;
        this.zone({ x: mx, z: mz, r: 1.5, delay: 0.55, dmg: 20 * this.dmgMul(p), knock: 3.5, p, kind: 'star', elem: 'fire' });
      }
      if (f.meteors.t <= 0) f.meteors = null;
    }
    if (f.barrage) {
      f.barrage.t -= dt; f.barrage.next -= dt;
      if (f.barrage.next <= 0 && !f.down) {
        f.barrage.next = 0.075;
        const A = f.moves.light[0], g = Math.atan2(a.dir.z, a.dir.x) + rand(-0.6, 0.6);
        this.fire(p, { ...A, homing: 7, life: 1.2, dmg: A.dmg * 0.8, speed: A.speed * 1.1 }, this.dmgMul(p), { x: Math.cos(g), z: Math.sin(g) });
        if (Math.random() < 0.4) this.sfx('zap');
      }
      if (f.barrage.t <= 0) f.barrage = null;
    }
    if (f.deadeye > 0) { f.deadeye -= dt; if (Math.random() < dt * 10) V.bit('glow', p.pos.x + rand(-0.4, 0.4), rand(0.3, 1.6), p.pos.z + rand(-0.3, 0.3), { vy: 1.2, g: 0, drag: 0, life: 0.4, size: 0.06, s1: 0.01, color: '#9fe07a' }); }
    if (f.shadow) {
      f.shadow.next -= dt;
      if (f.shadow.next <= 0) {
        f.shadow.next = 0.16;
        let best = null, bd = 9;
        for (const e of this.enemies) { if (!e.alive || !e.hurtable || f.shadow.hit.has(e)) continue; const d = Math.hypot(e.x - p.pos.x, e.z - p.pos.z); if (d < bd) { bd = d; best = e; } }
        if (!best || f.shadow.n <= 0) { f.shadow = null; V.smoke(p.pos.x, 0.5, p.pos.z, { n: 4, color: '#3a2450', size: 0.22 }); }
        else {
          f.shadow.n--; f.shadow.hit.add(best);
          const from = { x: p.pos.x, y: 0.8, z: p.pos.z };
          const dx = best.x - p.pos.x, dz = best.z - p.pos.z, l = Math.hypot(dx, dz) || 1;
          a.pos.x = best.x + (dx / l) * (best.r + 0.5); a.pos.z = best.z + (dz / l) * (best.r + 0.5);
          a.dir = { x: -dx / l, z: -dz / l }; a.model.targetFacing = Math.atan2(a.dir.x, a.dir.z);
          f.inv = Math.max(f.inv, 0.3);
          V.trailLine(from, { x: a.pos.x, y: 0.8, z: a.pos.z }, { color: '#6a3a9e', size: 0.2, life: 0.35 }, 0.2);
          V.slash(best.x, 0.8, best.z, Math.atan2(dx, dz), { r: 1.1, color: '#b88cf0', life: 0.18 });
          this.hurtEnemy(best, 30 * this.dmgMul(p), { p, dir: { x: dx / l, z: dz / l }, knock: 3, heavy: true, kind: 'melee' });
          this.sfx('whoosh');
        }
      }
    }
  }

  // ------------------------------------------------------------------ specials
  special(p) {
    const f = p.fighter, a = p.actor, S = f.moves.special;
    f.cd = S.cd * f.mods.cdr;
    this.party.buzz(p, 30);
    if (f.mods.specialShield) this.shieldUp(p, f.maxHp * f.mods.specialShield, 5);
    if (S.sfx) this.sfx(S.sfx);
    const dm = this.dmgMul(p);
    if (S.kind === 'spin') {
      f.spin = { t: S.dur, next: 0 };
      if (f.spinFx) f.spinFx.end();
      f.spinFx = this.vfx.whirl(() => ({ x: a.pos.x, y: (a.baseY || 0) + a.jumpY, z: a.pos.z }), { r: S.r * f.mods.range * 1.05, color: S.elem ? VFX_COL[S.elem] : f.cls.color, life: S.dur });
      this.vfx.shockwave(a.pos.x, a.pos.z, { r: S.r * 1.3, color: f.cls.color, life: 0.35, wall: 0.4 });
    } else if (S.kind === 'starfall') {
      // aim at the thickest crowd nearby
      let at = { x: a.pos.x + a.dir.x * 3.5, z: a.pos.z + a.dir.z * 3.5 }, bestN = 0;
      for (const tg of this.targetsOf(p)) {
        const d = Math.hypot(tg.x - a.pos.x, tg.z - a.pos.z);
        if (d > S.range) continue;
        const n = this.targetsOf(p).filter((o) => Math.hypot(o.x - tg.x, o.z - tg.z) < 2.2).length;
        if (n > bestN) { bestN = n; at = { x: tg.x, z: tg.z }; }
      }
      for (let i = 0; i < S.count; i++) {
        const ang = Math.random() * Math.PI * 2, rr = i === 0 ? 0 : rand(0.6, 2);
        this.zone({ x: at.x + Math.cos(ang) * rr, z: at.z + Math.sin(ang) * rr, r: S.r, delay: 0.35 + i * 0.13, dmg: S.dmg * dm, knock: S.knock, p, kind: 'star', elem: this.elemFor(p, S) });
      }
      if (S.meteor) this.zone({ x: at.x, z: at.z, r: S.r * 2, delay: 0.55 + S.count * 0.13, dmg: S.dmg * dm * 2.5, knock: S.knock * 1.6, p, kind: 'star', elem: this.elemFor(p, S) });
    } else if (S.kind === 'volley') {
      const base = Math.atan2(a.dir.z, a.dir.x);
      this.vfx.slash(a.pos.x, 0.9, a.pos.z, Math.atan2(a.dir.x, a.dir.z), { r: 1.1, arc: S.spread * 1.3, color: f.cls.color, life: 0.18, sweep: 0.4 });
      this.vfx.star(a.pos.x + a.dir.x * 0.6, 1.05, a.pos.z + a.dir.z * 0.6, { size: 1.5, kind: 'rays', color: f.cls.color, life: 0.2 });
      for (let i = 0; i < S.count; i++) {
        const ang = base + (i / (S.count - 1) - 0.5) * S.spread;
        this.fire(p, { ...S, look: 'acorn' }, dm, { x: Math.cos(ang), z: Math.sin(ang) });
      }
      f.dash = { vx: -a.dir.x * S.dash * 2.2, vz: -a.dir.z * S.dash * 2.2, t: 0.16 };
      f.inv = Math.max(f.inv, 0.35);
    } else if (S.kind === 'heal') {
      this.vfx.pillar(a.pos.x, a.pos.z, { r: 1, h: 6, color: '#ffe89a', life: 1.1 });
      if (f.mods.legend === 'hearthlute') this.blast(a.pos.x, a.pos.z, S.r * 0.7, 14 * dm, 3, { p, color: '#ffe89a' });
      this.vfx.shockwave(a.pos.x, a.pos.z, { r: S.r, color: '#ffd66b', life: 0.7, wall: 0.3 });
      for (let i = 0; i < 8; i++) this.world.fx.emit('note', a.pos.x + rand(-1, 1), 1.4, a.pos.z + rand(-0.6, 0.6), 1, { color: ['#f59ac8', '#ffd66b', '#8fd6b4'][i % 3] });
      const friends = this.pvp ? [p] : this.players.filter((q) => q.fighter && q.connected && Math.hypot(q.pos.x - a.pos.x, q.pos.z - a.pos.z) < S.r);
      for (const q of friends) {
        const g = q.fighter;
        if (g.down) { if (S.revive) this.revive(q, 0.45, p); continue; }
        const amt = Math.round(g.maxHp * (this.pvp ? 0.3 : S.heal));
        g.hp = Math.min(g.maxHp, g.hp + amt);
        g.buff = S.buff.dmg; g.buffT = S.buff.t;
        if (S.regen) g.regenT = S.regen;
        if (S.shield) this.shieldUp(q, g.maxHp * S.shield, 6);
        this.popText(q.pos.x, 2.0, q.pos.z, '+' + amt, '#8fd6b4');
        this.world.fx.emit('heart', q.pos.x, 1.8, q.pos.z, 1);
        if (q !== p) this.vfx.pillar(q.pos.x, q.pos.z, { r: 0.55, h: 3.5, color: '#8fd6b4', life: 0.8 });
      }
    } else K9.special(this, p, S, dm);
  }

  updateSpin(p, dt) {
    const f = p.fighter, a = p.actor, S = f.spin.def || f.moves.special;
    f.spin.t -= dt;
    f.spin.next -= dt;
    a.model.facing += dt * 20; a.model.targetFacing = a.model.facing;
    const pull = f.spin.ult ? 2.4 : S.pull === true ? 1 : S.pull || 0;
    if (pull) for (const e of this.enemies) { if (!e.alive || e.def.boss || e.def.flying) continue; const dx = a.pos.x - e.x, dz = a.pos.z - e.z, d = Math.hypot(dx, dz); if (d < 4.5 + pull && d > 0.8) this.moveEnemy(e, (dx / d) * 3.2 * pull * dt, (dz / d) * 3.2 * pull * dt); }
    if (S.elem === 'fire' && Math.random() < dt * 20) this.world.fx.emit('sparkle', a.pos.x + rand(-1, 1), 0.6, a.pos.z + rand(-1, 1), 1, { color: '#ff9a3a' });
    if (Math.random() < dt * 20) this.world.fx.emit('dust', a.pos.x, 0.1, a.pos.z, 1);
    if (f.spin.next <= 0) {
      f.spin.next = S.every;
      const dm = this.dmgMul(p);
      for (const tg of this.targetsOf(p)) {
        const d = Math.hypot(tg.x - a.pos.x, tg.z - a.pos.z);
        const rr = S.r * f.mods.range * (f.spin.ult ? 1.5 : 1);
        if (d < rr + (tg.e ? tg.e.r : 0.3) && !(tg.e && tg.e.y > 1.7)) this.hit(tg, S.dmg * dm * (f.spin.ult ? 1.6 : 1), { p, dir: norm(tg.x - a.pos.x, tg.z - a.pos.z), knock: pull ? 0.4 : S.knock, kind: 'melee', elem: f.spin.ult && !f.spin.def ? 'shock' : S.elem || null });
      }
      this.sfx('whoosh');
    }
    if (f.spin.t <= 0) { f.spin = null; f.spinFx = null; a.model.targetFacing = Math.atan2(a.dir.x, a.dir.z); }
  }

  // knight belly flop: called when a player lands
  onLand(p) {
    const f = p.fighter;
    if (!f || !f.airSlam) return;
    f.airSlam = false;
    const A = f.moves.air;
    this.blast(p.pos.x, p.pos.z, A.r * f.mods.range, A.dmg * this.dmgMul(p), A.knock, { p, color: f.cls.color, stun: A.stun || 0, lit: A.lit, blind: A.blind, root: A.root });
    this.sfx('slam');
    this.party.cam.shake = Math.max(this.party.cam.shake || 0, A.shake || 0.2);
  }

  // ------------------------------------------------------------------ hits
  hit(tg, amount, info) {
    if (tg.e) this.hurtEnemy(tg.e, amount, info);
    else if (tg.p) this.hurtPlayer(tg.p, amount, { ...info, from: info.p });
  }

  hurtEnemy(e, amount, { p = null, dir = { x: 0, z: 1 }, knock = 1.5, launch = 0, stun = 0, heavy = false, kind = 'melee', quiet = false, elem = null, noCombo = false, color = null, crit: forceCrit = false, lit = 0, blind = 0, root = 0 } = {}) {
    if (!e.hurtable) return;
    if (e.state === 'sleep') this.wake(e);
    const dot = kind === 'dot';
    if (!dot && e.brain && e.brain.onHit) e.brain.onHit(e);
    const dl = Math.hypot(dir.x, dir.z) || 1;
    dir = { x: dir.x / dl, z: dir.z / dl };
    // shells shrug off light hits from the front
    if (e.def.armor === 'front' && !heavy && kind !== 'aoe') {
      const dot = dir.x * e.face.x + dir.z * e.face.z;
      if (dot < -0.35) { this.popText(e.x, e.def.h + 0.4, e.z, t('BLOCK'), '#c9c4cc'); this.sfx('block'); if (p) this.party.buzz(p, 10); return; }
    }
    let dmg = amount;
    // shields soak what hits them from the front, armour blunts light hits
    if (!dot) { const g = guard(this, e, dmg, { p, dir, heavy }); if (g < 0) return; dmg = g; }
    if (e.def.boss) dmg *= bossDamageMul(e) * worldBossMul(e, dir, elem);
    // frozen solid: a heavy hit shatters the ice
    if (e.frozen > 0 && heavy && !dot) {
      dmg *= 1.8; thaw(this, e, true);
      if (p && p.fighter && p.fighter.mods.shatter) this.vfx.later(0.05, () => this.blast(e.x, e.z, 1.8, 14 * this.dmgMul(p), 3, { p, elem: 'ice', color: '#9fdcff', boom: true }));
    }
    // Frostbite: chilled gloom takes more
    if (p && p.fighter && p.fighter.mods.chillMul && e.st && e.st.chill > 0 && !dot) dmg *= 1 + p.fighter.mods.chillMul;
    // juggling: hits in the air keep it up there
    const air = e.y > 0.35 && !e.def.flying && !e.def.boss && !dot;
    if (air) { dmg *= 1.15 + ((p && p.fighter && p.fighter.mods.juggle) || 0); e.vy = Math.max(e.vy, 3.4); }
    // a heavy hit on a staggered foe: FINISHER
    const finisher = !!(e.stagger > 0 && heavy && p && !dot);
    if (finisher) { dmg *= 2.5; e.stagger = 0; }
    // the counter after a parry
    const counter = !!(p && p.fighter && p.fighter.counter > 0 && !dot);
    if (counter) { dmg *= 1.6; p.fighter.counter = 0; }
    // everyone’s hits add up to the party’s combo
    if (!noCombo && !dot && p && !this.pvp) dmg *= comboHit(this, p);
    let crit = false;
    if (p && p.fighter && !dot && (forceCrit || K9.rushCrit(p) || Math.random() < p.fighter.mods.crit)) {
      dmg *= 2 * p.fighter.mods.critMul; crit = true;
      if (p.fighter.mods.critCdr) p.fighter.cd = Math.max(0, p.fighter.cd - p.fighter.mods.critCdr);
    }
    if (e.def.boss && e.state === 'tired') dmg *= 1.5;
    if (p && p.fighter && e.level && !this.pvp) dmg *= gapDealt(e.level - (p.fighter.eff || p.fighter.level));
    if (!dot) dmg *= K9.litMul(e);
    dmg = Math.max(1, Math.round(dmg));
    e.hp -= dmg;
    if (!dot) e.flash = 0.08;
    const kr = 1 - (e.def.knockRes || 0);
    if (knock && kr > 0) e.knock = { vx: dir.x * knock * 2.2 * kr, vz: dir.z * knock * 2.2 * kr, t: 0.14 };
    if (launch && kr > 0.3 && !e.def.flying) e.vy = launch * kr;
    if (stun) e.stun = Math.max(e.stun, stun * kr);
    if (e.state === 'windup' && heavy) { e.state = 'recover'; e.timer = 0.4; }
    if (dot) this.popText(e.x + rand(-0.2, 0.2), e.y + e.def.h + 0.2, e.z, String(dmg), color || '#ffb040');
    else this.damageNumber(e, dmg, crit);
    if (!dot) this.vfx.hit(e.x, e.y + e.def.h * 0.6, e.z, { color: elem ? VFX_COL[elem] : p && p.fighter ? p.fighter.cls.color : '#fff3c4', big: heavy, crit });
    if ((heavy || crit) && !dot) this.hitstop = Math.max(this.hitstop, crit ? 0.05 : 0.035);
    if (air && !quiet) this.popText(e.x, e.y + e.def.h + 0.7, e.z, t('Juggle!'), '#b9e6ff');
    if (counter) this.popText(e.x, e.def.h + 1.0, e.z, t('COUNTER!'), '#ffd66b', true);
    if (finisher) {
      this.popText(e.x, e.def.h + 1.2, e.z, t('FINISHER!'), '#ff9ad8', true);
      this.hitstop = Math.max(this.hitstop, 0.14);
      this.party.cam.shake = Math.max(this.party.cam.shake || 0, 0.4);
      this.vfx.star(e.x, e.y + 0.8, e.z, { size: 2, kind: 'rays', color: '#ff9ad8', life: 0.45, spin: 3 });
      this.vfx.shockwave(e.x, e.z, { r: 2.2, color: '#ff9ad8', life: 0.45, wall: 0.7 });
      this.vfx.sparks(e.x, e.y + 0.8, e.z, { n: 18, color: '#ff9ad8', speed: 6, up: 4 });
      this.sfx('crit');
      if (p) this.party.buzz(p, [30, 20, 80]);
    }
    if (elem) applyElement(this, e, elem, { p, power: p && p.fighter ? this.dmgMul(p) : 1, strong: heavy });
    if (lit || blind || root) K9.applyStatus(this, e, { lit, blind, root, p });
    if (p && !dot) K9.onHit(this, p, e, dmg, kind);
    if (kind === 'melee' && p && p.fighter && p.fighter.mods.legend === 'thunder' && Math.random() < 0.22) { this.vfx.lightning(e.x, e.z); this.vfx.later(0.02, () => { if (e.alive) this.hurtEnemy(e, 12 * this.dmgMul(p), { p, knock: 1, kind: 'aoe', elem: 'shock', noCombo: true, quiet: true }); }); }
    if (p && p.fighter) {
      const f = p.fighter;
      f.hits++; f.dmgDealt += dmg;
      if (!dot) this.ultGain(p, Math.min(8, dmg * 0.12) * (e.def.boss ? 0.6 : 1));
      if (f.mods.lifesteal) f.hp = Math.min(f.maxHp, f.hp + f.mods.lifesteal);
      if (!quiet) this.party.buzz(p, heavy ? 22 : 10);
    }
    if (crit) this.sfx('crit'); else if (heavy) this.sfx('bonk');
    if (e.hp <= 0) this.kill(e, p);
  }

  kill(e, p) {
    e.alive = false;
    const d = e.def;
    K9.onKill(this, e, p);
    if (e.ice) e.ice.visible = false;
    onEnemyDeath(this, e, p);
    this.vfx.pop(e.x, e.y + d.h * 0.5, e.z, { color: GLOOM, size: d.boss ? 2.2 : e.r > 0.45 ? 1.4 : 1 });
    if (d.boss) { this.vfx.explosion(e.x, e.z, { r: 2.6, color: GLOOM, hot: '#ffffff', big: true, scorch: false }); this.vfx.pillar(e.x, e.z, { r: 1.2, h: 8, color: '#fff3c4', life: 1.4 }); }
    this.sfx(d.boss ? 'thunder' : 'poof');
    // XP by the monster’s level, for every hero who fought near it
    for (const q of this.players) {
      if (!q.fighter || !q.connected || (q !== p && Math.hypot(q.pos.x - e.x, q.pos.z - e.z) > 24)) continue;
      const xp = e.level ? killXp(e.level, q.fighter.level, { elite: !!e.elite, rare: !!e.rare, boss: !!d.boss }) : d.xp;
      if (xp > 0) this.gainXp(q, xp);
    }
    if (p && p.fighter) {
      p.fighter.kos++;
      if (p.fighter.mods.fireworks) this.blast(e.x, e.z, 1.3, 10 * this.dmgMul(p), 3, { p, boom: true, color: '#f59ac8' });
      if (p.fighter.mods.killCdr) p.fighter.cd = Math.max(0, p.fighter.cd - p.fighter.mods.killCdr);
      this.ultGain(p, d.boss ? 30 : 6);
    }
    // Combustion: gloom that burns out explodes
    const burner = e.st && e.st.burn > 0 && e.st.burnBy;
    if (burner && burner.fighter && burner.fighter.mods.combust) this.vfx.later(0.05, () => this.blast(e.x, e.z, 1.7, 14 * this.dmgMul(burner), 3.5, { p: burner, boom: true, elem: 'fire', color: '#ff8a3a' }));
    // stardust & the odd treat
    const n = d.boss ? 30 : Math.max(2, Math.round(d.xp / 3));
    for (let i = 0; i < n; i++) this.drop('dust', e.x, e.z);
    const r = Math.random();
    if (d.boss) { this.drop('tart', e.x, e.z); this.drop('coffee', e.x, e.z); }
    else if (r < 0.09) this.drop('tart', e.x, e.z);
    else if (r < 0.13) this.drop('coffee', e.x, e.z);
    if (e.cleanse()) { e.freed = true; this.popText(e.x, 1.6, e.z, t('Freed!'), '#8fd6b4'); this.world.fx.emit('heart', e.x, 1.2, e.z, 1); }
    e.fading = e.freed ? 1.8 : 0.7;
    if (e.onDeath) e.onDeath(p);
    if (d.boss && e.type !== 'boss') {
      // a zone boss: a big poof of gloom, and it’s itself again (the Tyrant King walks off, roaring)
      e.fading = d.walkOff || 1.6;
      this.party.cam.shake = Math.max(this.party.cam.shake || 0, 0.6);
      for (let i = 0; i < 6; i++) this.world.fx.emit('smoke', e.x + rand(-1, 1), 1 + Math.random() * 2, e.z + rand(-1, 1), 3, { color: '#6a4a8e' });
    } else if (d.boss) {
      // the Grumblecloud just needed a good cry: it fluffs up white and drifts away
      e.farewell = true;
      e.fading = 5.5;
      const u = e.obj.userData;
      if (u.face && u.happy) { u.face.material.map = u.happy; u.face.material.needsUpdate = true; }
      this.bubble(e, t('…sorry. I just needed a good cry.'), 3.2);
      this.party.cam.shake = Math.max(this.party.cam.shake || 0, 0.5);
    }
    if (this.onKill) this.onKill(e, p);
  }

  fadeOut(e, dt) {
    // (a story's boss held on stage for its scene: it neither fades nor shrinks)
    if (e.hold) return;
    e.fading -= dt;
    if (e.farewell) {
      const k = 1 - Math.max(0, e.fading) / 5.5;
      if (k > 0.35) { e.y += dt * 0.7; e.x += dt * 0.8; }
      const s = 1 - k * 0.4;
      e.obj.scale.setScalar(Math.max(0.01, e.fading < 0.6 ? s * (e.fading / 0.6) : s));
      e.obj.position.set(e.x, e.y + Math.sin(k * 14) * 0.06, e.z);
      for (const q of e.mats) { q.m.color.lerp(WHITE, Math.min(1, dt * 1.6)); q.m.emissive.setRGB(0, 0, 0); }
      e.shadow.visible = false;
      if (Math.random() < dt * 6) this.world.fx.emit('sparkle', e.x + rand(-1.2, 1.2), e.y + rand(-0.3, 0.6), e.z, 1, { color: '#ffffff' });
    } else if (e.freed) {
      // the animal shakes off the gloom and scampers off, happy
      const run = { x: -(e.face.x || 1), z: -(e.face.z || 0) }, W = e.def.walkOff, sp = W ? 1.7 : 3.2;
      const roar = W && e.fading > W - 1.2 ? 1 : 0;
      if (W && !e.roared) { e.roared = true; this.sfx('roar', e); }
      if (!roar) { e.x += run.x * sp * dt; e.z += run.z * sp * dt; }
      const rig = e.obj.userData.rig;
      // (a dinosaur faces +z and runs on its own legs; a pteranodon flies off)
      e.obj.rotation.y = rig ? Math.atan2(run.x, run.z) : Math.atan2(-run.z, run.x);
      if (rig) animDino(rig, dt, { speed: roar ? 0 : sp, air: !!e.def.flying, roar });
      if (e.def.flying) e.y += dt * 1.6;
      e.obj.position.set(e.x, e.def.flying ? e.y : rig ? 0 : Math.abs(Math.sin(e.fading * 18)) * 0.12, e.z);
      if (e.fading < 0.4) e.obj.scale.setScalar(Math.max(0.01, e.fading / 0.4));
    } else {
      const k = Math.max(0, e.fading / 0.7);
      e.obj.scale.set(1 + (1 - k) * 0.5, Math.max(0.01, k), 1 + (1 - k) * 0.5);
    }
    if (e.fading <= 0) e.remove();
  }

  hurtPlayer(q, amount, { dir = { x: 0, z: 1 }, knock = 2, from = null, src = null, shot = null, elem = null } = {}) {
    const f = q.fighter;
    if (!f || f.down || !q.connected) return;
    // a roll timed just right: PARRY (a shot flies back where it came from)
    if ((src || shot) && !from && f.roll && f.roll.age < PARRY_WINDOW) { this.parry(q, src, shot); return 'parry'; }
    if (f.inv > 0) return;
    if (!from && f.mods.evade && Math.random() < f.mods.evade) {
      f.inv = Math.max(f.inv, 0.35);
      this.popText(q.pos.x, 2.1, q.pos.z, t('Dodged!'), '#dfe8ff');
      this.vfx.trailLine({ x: q.pos.x - dir.x * 0.6, y: 0.8, z: q.pos.z - dir.z * 0.6 }, { x: q.pos.x, y: 0.8, z: q.pos.z }, { color: '#dfe8ff', size: 0.16, life: 0.25 });
      return;
    }
    const armor = f.cls.armor + f.mods.armor + (f.spin ? (f.spin.def || f.moves.special).armor || 0 : 0) + ((q.mount && q.mount.D.armor) || 0) + (f.hp < f.maxHp / 3 ? f.mods.lowArmor : 0) + K9.steamArmor(q) + K9.ward(this, q);
    // friends hit a little harder than gloom does in a brawl, so rounds stay snappy
    if (src && src.dmgMul && !src.brain) amount *= src.dmgMul;
    // a monster above your level hits harder, one below softer
    if (!from && src && src.level) amount *= gapTaken(src.level - (f.eff || f.level));
    let dmg = Math.max(1, Math.round(amount * (from ? (this.pvp ? 1.4 : 0.5) : this.enemyDmg * this.diff.dmg) * (1 - Math.min(0.6, armor))));
    if (src && src.affix === 'vampiric' && src.alive) { src.hp = Math.min(src.maxHp, src.hp + dmg * 0.6); this.world.fx.emit('heart', src.x, src.y + src.def.h + 0.3, src.z, 1); }
    // a knight’s Bulwark shelters everyone inside it
    if (!from && this.players.some((k) => k.fighter && k.fighter.bulwark > 0 && Math.hypot(k.pos.x - q.pos.x, k.pos.z - q.pos.z) < 4.2)) dmg = Math.max(1, Math.round(dmg * 0.4));
    if (f.shield > 0) {
      const soak = Math.min(f.shield, dmg);
      f.shield -= soak; dmg -= soak;
      this.vfx.star(q.pos.x, 1.1, q.pos.z, { size: 1, color: '#9fdcff', life: 0.2 });
      if (f.shield <= 0) { f.shieldT = 0; this.vfx.sparks(q.pos.x, 1.1, q.pos.z, { n: 10, color: '#9fdcff', kind: 'shard' }); }
      if (dmg <= 0) { f.inv = from ? 0.3 : 0.5; this.popText(q.pos.x, 2.1, q.pos.z, t('Absorbed'), '#9fdcff'); return; }
    }
    this.ultGain(q, dmg * 0.25);
    f.hp -= dmg;
    f.inv = from ? 0.45 : 0.9;
    f.hurtT = 0.18;
    f.knock = { vx: dir.x * knock * 2.4, vz: dir.z * knock * 2.4, t: 0.16 };
    f.act = null; f.charging = false;
    q.actor.expr = 'surprised';
    setTimeout(() => { if (q.actor.expr === 'surprised') q.actor.expr = null; }, 400);
    this.popText(q.pos.x, 2.1, q.pos.z, '-' + dmg, '#ff6b7b');
    const el = elem || (src && src.def && src.def.elem);
    if (el && !from) applyToPlayer(this, q, el, src && src.level ? dmgL(src.level) : 0);
    if (f.mods.thorns && src && src.alive && src.hurtable && !from) this.hurtEnemy(src, dmg * f.mods.thorns, { p: q, knock: 0, kind: 'aoe', noCombo: true, quiet: true });
    this.vfx.hit(q.pos.x, 1.0 + q.actor.jumpY, q.pos.z, { color: el ? VFX_COL[el] || '#ff6b7b' : '#ff6b7b' });
    this.sfx('hurt');
    this.party.buzz(q, [60, 30, 40]);
    if (from && from.fighter) { from.fighter.hits++; from.fighter.dmgDealt += dmg; if (from.fighter.mods.lifesteal) from.fighter.hp = Math.min(from.fighter.maxHp, from.fighter.hp + from.fighter.mods.lifesteal); }
    if (f.hp <= 0) this.knockOut(q, from);
  }

  knockOut(q, from) {
    const f = q.fighter;
    if (f.spinFx) { f.spinFx.end(); f.spinFx = null; }
    f.hp = 0; f.down = true; f.downT = 0; f.revive = 0; f.act = null; f.spin = null; f.charging = false; f.falls++;
    q.actor.jumpV = 0; q.actor.jumpY = 0;
    this.world.fx.emit('dust', q.pos.x, 0.1, q.pos.z, 8);
    this.sfx('down');
    this.party.buzz(q, [200]);
    if (from && from.fighter) {
      from.fighter.kos++;
      this.popText(q.pos.x, 2.4, q.pos.z, t('K.O.!'), from.color, true);
      this.party.toast(t('{a} bonked {b}!', { a: from.name, b: q.name }), from.color);
    } else if (!this.pvp && this.players.length > 1) this.party.toast(t('{name} is down! Stand close to help them up', { name: q.name }), q.color);
    if (this.onDown) this.onDown(q, from);
    if (!this.pvp && this.alivePlayers().length === 0 && this.onAllDown) this.onAllDown();
  }

  revive(q, frac, by) {
    const f = q.fighter;
    f.down = false; f.hp = Math.max(1, Math.round(f.maxHp * frac)); f.inv = 1.5; f.downT = 0; f.revive = 0;
    this.vfx.pillar(q.pos.x, q.pos.z, { r: 0.6, h: 4, color: '#8fd6b4', life: 0.9 });
    this.popText(q.pos.x, 2.2, q.pos.z, t('Back up!'), '#8fd6b4');
    this.party.flashTag(q, 2.5);
    this.sfx('revive');
    if (by && by !== q) this.party.toast(t('{a} helped {b} up ♥', { a: by.name, b: q.name }), by.color);
    if (this.onRevive) this.onRevive(q, by);
  }

  respawn(q) {
    const f = q.fighter;
    const s = this.bounds ? this.freeSpot(this.bounds.x, this.bounds.z, Math.min(this.bounds.rx, this.bounds.rz) * 0.9) : null;
    if (s) { q.actor.pos = { x: s.x, z: s.z }; }
    f.down = false; f.hp = f.maxHp; f.inv = 2; f.downT = 0;
    this.world.fx.emit('sparkle', q.pos.x, 1.2, q.pos.z, 14, { color: q.color });
    this.party.flashTag(q, 2.5);
  }

  // friends standing next to a napping hero wake them up
  updateRevives(dt) {
    if (this.pvp) return;
    for (const q of this.players) {
      const f = q.fighter;
      if (!f || !f.down) continue;
      const helpers = this.alivePlayers().filter((h) => Math.hypot(h.pos.x - q.pos.x, h.pos.z - q.pos.z) < 1.4);
      if (helpers.length) {
        f.revive += dt * (1 + (helpers.length - 1) * 0.5);
        if (Math.random() < dt * 8) this.world.fx.emit('sparkle', q.pos.x, 0.6, q.pos.z, 1, { color: '#8fd6b4' });
        if (f.revive >= 1.6) this.revive(q, 0.4, helpers[0]);
      } else f.revive = Math.max(0, f.revive - dt * 0.5);
    }
  }

  // ------------------------------------------------------------------ enemies
  spawn(type, x, z, opts = {}) {
    // World v7: a monster keeps its level (its land’s, unless told), and grows
    // with the heroes standing near the fight (bosses a little more)
    const def = ENEMIES[type];
    const lv = Math.max(1, Math.round(opts.level || rollLevel(levelAt(this.party.big, x, z))));
    const n = this.heroesNear(x, z);
    const e = new Enemy(this, type, x, z, { ...opts, hpScale: (opts.hpScale || 1) * hpL(lv) * groupHp(n, def.boss) * this.diff.hp });
    e.level = lv; e.group = n; e.dmgBase = def.dmg * (opts.dmgScale || 1) * dmgL(lv);
    e.def = { ...def, dmg: e.dmgBase * groupDmg(n) };
    if (opts.rare) e.rare = opts.rare;
    if (!opts.sleep) e.spawnT = 0.6;
    if (opts.drop) { e.y = 3; e.vy = 0; }
    this.enemies.push(e);
    if (!opts.sleep && !opts.quiet) { this.vfx.shockwave(x, z, { r: 1.2, color: '#7a4aa8', life: 0.45, wall: 0.5 }); this.vfx.smoke(x, 0.2, z, { n: 5, color: '#6a4a8e', size: 0.3 }); }
    return e;
  }

  // how hard a burn or a poison bites a hero where they stand (the land’s level)
  statusPower(q) {
    const lv = levelAt(this.party.big, q.pos.x, q.pos.z);
    return dmgL(Math.round((lv[0] + lv[1]) / 2));
  }

  // the level the heroes fight at (for the colours of the monsters’ levels)
  refLevel() {
    let n = 0, s = 0;
    for (const p of this.players) if (p.connected && p.fighter) { n++; s += p.fighter.eff || p.fighter.level; }
    return n ? Math.round(s / n) : 1;
  }

  heroesNear(x, z, r = NEAR) {
    let n = 0;
    for (const p of this.players) if (p.connected && p.fighter && Math.abs(p.pos.x - x) < r && Math.abs(p.pos.z - z) < r) n++;
    return Math.max(1, n);
  }

  // once a second: a fight grows (or shrinks) with the heroes around it, and
  // each hero’s effective level follows the land they stand in
  regroup() {
    for (const e of this.enemies) {
      if (!e.alive || e.state === 'sleep' || !e.dmgBase) continue;
      const n = this.heroesNear(e.x, e.z);
      if (n === e.group) continue;
      const k = groupHp(n, e.def.boss) / groupHp(e.group, e.def.boss);
      e.maxHp = Math.max(1, Math.round(e.maxHp * k)); e.hp = Math.max(1, Math.round(e.hp * k)); e.hpK = (e.hpK || 1) * k;
      if (e.shieldHp > 0) e.shieldHp *= k;
      if (e.bubbleHp > 0) e.bubbleHp *= k;
      e.group = n; e.def.dmg = e.dmgBase * groupDmg(n);
    }
    for (const p of this.players) {
      const f = p.fighter;
      if (!f || !p.connected) continue;
      const eff = this.effOf(p);
      if (eff !== f.eff) { const was = f.eff; f.eff = eff; const hp = f.hp / (f.maxHp || 1); this.refreshStats(p); f.hp = Math.max(1, Math.round(f.maxHp * hp)); if (was && this.party.onSync) this.party.onSync(p, eff, was); }
    }
  }

  // the level a hero fights at where they stand
  effOf(p) {
    const f = p.fighter;
    if (!f) return 1;
    const x = p.roomExit ? p.roomExit.x : p.pos.x, z = p.roomExit ? p.roomExit.z : p.pos.z;
    return effLevel(f.level, levelAt(this.party.big, x, z), !!this.party.solo);
  }

  wake(e) {
    if (e.state !== 'sleep') return;
    e.state = e.type === 'puffcap' ? 'pop' : 'chase';
    e.timer = rand(0.3, 1);
    this.bubble(e, '!');
    this.sfx('growl', e);
  }

  targetFor(e) {
    if (e.blind > 0 && !e.def.boss) return null;
    if (e.decoyT > 0 && e.decoy && !e.decoy.done) { e.decoyT -= 1 / 60; return { pos: { x: e.decoy.x, z: e.decoy.z }, decoy: true }; }
    if (e.tauntT > 0) { e.tauntT -= 1 / 60; const q = e.tauntBy; if (q && q.fighter && !q.fighter.down && q.connected) return q; }
    let best = null, bd = 1e9;
    for (const p of this.alivePlayers()) {
      if (p.indoors || p.dive > 0 || (p.vehicle && (p.vehicle.flying || p.vehicle.kind === 'zipline'))) continue;
      const d = Math.hypot(p.pos.x - e.x, p.pos.z - e.z) - (p === e.lastTarget ? 1.5 : 0);
      if (d < bd) { bd = d; best = p; }
    }
    e.lastTarget = best;
    return best;
  }

  // move an enemy, respecting the world (flyers ignore it); returns false when blocked
  moveEnemy(e, dx, dz, soft = false, flying = false) {
    void soft;
    if (e.root > 0 && !e.knock && !e.def.flying && !flying) return false;
    if (e.slowK !== undefined && e.slowK !== 1) { dx *= e.slowK; dz *= e.slowK; }
    const ox = e.x, oz = e.z;
    if (e.def.flying || flying) { e.x += dx; e.z += dz; this.clampToBounds(e); return true; }
    const pos = { x: e.x, z: e.z };
    this.world.overCol.move(pos, dx, dz, Math.min(0.45, e.r));
    if (this.world.tileAt(pos.x, pos.z) === TT.WATER) return false;
    e.x = pos.x; e.z = pos.z;
    this.clampToBounds(e);
    const want = Math.hypot(dx, dz), got = Math.hypot(e.x - ox, e.z - oz);
    return want < 1e-4 || got > want * 0.5;
  }

  clampToBounds(o) {
    const b = this.bounds;
    if (!b) return;
    const dx = (o.x - b.x) / b.rx, dz = (o.z - b.z) / b.rz, d = Math.hypot(dx, dz);
    if (d > 1) { o.x = b.x + (dx / d) * b.rx; o.z = b.z + (dz / d) * b.rz; }
  }

  separateEnemies() {
    const es = this.enemies.filter((e) => e.alive && !e.def.flying);
    for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++) {
      const a = es[i], b = es[j];
      const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), min = a.r + b.r;
      if (d >= min || d < 1e-4) continue;
      const push = (min - d) / 2, nx = dx / d, nz = dz / d;
      a.x -= nx * push; a.z -= nz * push; b.x += nx * push; b.z += nz * push;
    }
    // and they don’t stand inside the heroes
    for (const e of es) for (const p of this.players) {
      const dx = e.x - p.pos.x, dz = e.z - p.pos.z, d = Math.hypot(dx, dz), min = e.r + 0.26;
      if (d < min && d > 1e-4) { e.x = p.pos.x + (dx / d) * min; e.z = p.pos.z + (dz / d) * min; }
    }
  }

  // enemies bump into players while attacking
  enemyTouch(e, dmg, knock, reach, arc = 1.2) {
    for (const p of this.alivePlayers()) {
      if (e.hitOnce.has(p)) continue;
      const dx = p.pos.x - e.x, dz = p.pos.z - e.z, d = Math.hypot(dx, dz);
      if (d > e.r + reach) continue;
      if (p.actor.jumpY > 0.75 && e.y < 1) continue; // hopped over it!
      const dot = (dx * e.face.x + dz * e.face.z) / (d || 1);
      if (d > e.r + 0.25 && dot < Math.cos(arc)) continue;
      e.hitOnce.add(p);
      this.hurtPlayer(p, dmg, { dir: norm(dx, dz), knock, src: e });
    }
  }

  enemyShot(e, tgt, { speed, r, dmg, life, look }) {
    const dx = tgt.pos.x + tgt.vel.x * 0.25 - e.x, dz = tgt.pos.z + tgt.vel.z * 0.25 - e.z, d = Math.hypot(dx, dz) || 1;
    const s = { team: 'gloom', src: e, elem: e.def.elem || null, x: e.x + (dx / d) * 0.4, y: 0.7, z: e.z + (dz / d) * 0.4, vx: (dx / d) * speed, vz: (dz / d) * speed, vy: 0, r, dmg, life, pierce: 0, homing: 0.6, gravity: 0, hit: new Set(), look };
    s.mesh = this.shotMesh(look);
    this.root.add(s.mesh);
    this.shots.push(s);
    this.sfx('spit', e);
  }

  // the Grumblecloud’s lightning: a warning circle, then the strike
  lightning(x, z, r, dmg, delay) { this.zone({ x, z, r, delay, dmg, knock: 3, kind: 'bolt', gloom: true }); }

  gust(x, z, r) {
    this.world.fx.emit('ring', x, 0.3, z, 1, { color: '#c9c4e8' });
    for (const p of this.alivePlayers()) {
      const dx = p.pos.x - x, dz = p.pos.z - z, d = Math.hypot(dx, dz);
      if (d > r) continue;
      p.fighter.knock = { vx: (dx / (d || 1)) * 9, vz: (dz / (d || 1)) * 9, t: 0.35 };
      this.party.buzz(p, 40);
    }
    this.sfx('whoosh');
  }

  zone(z) {
    z.t = 0;
    if (!z.quiet) {
      const warn = new THREE.Mesh(this.geo.ring, new THREE.MeshBasicMaterial({ color: z.gloom ? 0xff5a6a : 0xffe066, transparent: true, opacity: 0.8, depthWrite: false }));
      warn.scale.setScalar(z.r); warn.position.set(z.x, 0.04, z.z);
      const fill = new THREE.Mesh(this.geo.disc, new THREE.MeshBasicMaterial({ color: z.gloom ? 0xff5a6a : 0xffe066, transparent: true, opacity: 0.12, depthWrite: false }));
      fill.scale.setScalar(z.r); fill.position.set(z.x, 0.035, z.z);
      this.root.add(warn, fill);
      z.warn = warn; z.fill = fill;
    }
    if (z.kind === 'star') this.vfx.meteor(z.x, z.z, { delay: z.delay, size: 0.26 + z.r * 0.14, color: z.elem === 'ice' ? '#9fdcff' : '#ffd66b', hot: '#ffffff', ember: z.elem === 'ice' ? '#dff4ff' : '#ff6a1a', dx: rand(-3.5, -2), dz: rand(-4.5, -3) });
    if (z.arc) { z.bomb = this.shotMesh(z.look || 'bomb'); z.bomb.position.set(z.arc.x, z.arc.y, z.arc.z); this.root.add(z.bomb); }
    this.zones.push(z);
  }

  updateZones(dt) {
    for (const z of this.zones) {
      z.t += dt;
      const k = Math.min(1, z.t / z.delay);
      if (z.warn) { z.warn.material.opacity = 0.4 + Math.sin(z.t * 30) * 0.3 * k + 0.2; z.fill.material.opacity = 0.08 + k * 0.22; }
      if (z.star) { z.star.position.y = 8 * (1 - k); z.star.rotation.y += dt * 8; }
      if (z.bomb) { const a = z.arc; z.bomb.position.set(a.x + (z.x - a.x) * k, a.y * (1 - k) + 0.3 + Math.sin(k * Math.PI) * 2.6, a.z + (z.z - a.z) * k); z.bomb.rotation.x += dt * 9; }
      if (z.t >= z.delay) {
        z.done = true;
        if (z.warn) this.root.remove(z.warn, z.fill);
        if (z.star) this.root.remove(z.star);
        if (z.bomb) this.root.remove(z.bomb);
        if (z.kind === 'bolt') { this.bolt(z.x, z.z); this.blast(z.x, z.z, z.r, z.dmg, z.knock, { gloom: true, color: '#fff3a6' }); this.party.cam.shake = Math.max(this.party.cam.shake || 0, 0.35); this.sfx('thunder'); }
        else if (z.gloom) this.blast(z.x, z.z, z.r, z.dmg, z.knock, { gloom: true, boom: true, color: z.elem === 'fire' ? '#ff8a3a' : '#a86ae0', elem: z.elem || null });
        else if (z.kind === 'echo' || z.kind === 'quake' || z.kind === 'song') { this.blast(z.x, z.z, z.r, z.dmg, z.knock, { p: z.p, color: z.color || '#fff3c4', launch: z.launch || 0, stun: z.stun || 0 }); if (z.kind === 'quake') { this.party.cam.shake = Math.max(this.party.cam.shake || 0, 0.4); this.sfx('slam'); } if (z.kind === 'song') { this.sfx('chord'); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; this.world.fx.emit('note', z.x + Math.cos(a) * z.r, 1, z.z + Math.sin(a) * z.r, 1, { color: '#f59ac8' }); } } }
        else this.blast(z.x, z.z, z.r, z.dmg, z.knock, { p: z.p, boom: true, color: z.elem ? VFX_COL[z.elem] || '#fff3a6' : '#fff3a6', elem: z.elem || null });
      }
    }
    this.zones = this.zones.filter((z) => !z.done);
  }

  bolt(x, z) {
    this.vfx.lightning(x, z, { color: '#fff27a' });
  }


  telegraphLine(e, dir, len, life) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.7, len).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff5a6a, transparent: true, opacity: 0.0, depthWrite: false }));
    m.position.set(e.x + dir.x * len / 2, 0.04, e.z + dir.z * len / 2);
    m.rotation.y = Math.atan2(dir.x, dir.z);
    this.root.add(m);
    this.fxMeshes.push({ m, t: life, life, line: true });
  }

  telegraphCircle(x, z, r, life) {
    const m = new THREE.Mesh(this.geo.disc, new THREE.MeshBasicMaterial({ color: 0x2a1640, transparent: true, opacity: 0.2, depthWrite: false }));
    m.position.set(x, 0.03, z); m.scale.setScalar(r);
    this.root.add(m);
    this.fxMeshes.push({ m, t: life, life, dark: true });
    // and a pulsing red edge, so it reads on any ground
    const ring = new THREE.Mesh(this.geo.ring, new THREE.MeshBasicMaterial({ color: 0xff5a6a, transparent: true, opacity: 0.8, depthWrite: false }));
    ring.position.set(x, 0.04, z); ring.scale.setScalar(r);
    this.root.add(ring);
    this.fxMeshes.push({ m: ring, t: life, life, line: true });
  }

  updateFxMeshes(dt) {
    for (const q of this.fxMeshes) {
      q.t -= dt;
      const k = Math.max(0, q.t / (q.life || 1));
      if (q.fn) q.fn(q, k);
      else if (q.grow) { q.m.scale.setScalar(q.grow * (1 - k * 0.7)); q.m.material.opacity = k * 0.9; }
      else if (q.line) q.m.material.opacity = (1 - k) * 0.45 + Math.sin(q.t * 30) * 0.08;
      else if (q.dark) q.m.material.opacity = 0.15 + (1 - k) * 0.25;
      if (q.t <= 0) { this.root.remove(q.m); q.done = true; }
    }
    this.fxMeshes = this.fxMeshes.filter((q) => !q.done);
  }

  // ------------------------------------------------------------------ loot
  drop(kind, x, z) {
    const m = kind === 'dust' ? new THREE.Mesh(this.geo.dust, this.mat(0xfff3a6, 0xffc94a))
      : kind === 'tart' ? tartMesh(this) : coffeeMesh(this);
    if (kind === 'dust') m.scale.set(1, 1.3, 0.5);
    const a = Math.random() * Math.PI * 2, sp = kind === 'dust' ? rand(1, 3) : rand(0.5, 1.5);
    const d = { kind, x, z, y: 0.6, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: rand(3, 5), m, t: 0, life: kind === 'dust' ? 14 : 25 };
    m.position.set(x, 0.6, z);
    this.root.add(m);
    this.drops.push(d);
  }

  updateDrops(dt) {
    for (const d of this.drops) {
      d.t += dt;
      if (d.y > 0.25 || d.vy > 0) { d.vy -= 16 * dt; d.y = Math.max(0.25, d.y + d.vy * dt); d.x += d.vx * dt; d.z += d.vz * dt; if (d.y <= 0.25) { d.vy = 0; d.vx = 0; d.vz = 0; } }
      // magnet towards the nearest hero
      let best = null, bd = 1e9;
      for (const p of this.alivePlayers()) { const q = Math.hypot(p.pos.x - d.x, p.pos.z - d.z); if (q < bd) { bd = q; best = p; } }
      const pull = best ? (d.kind === 'dust' ? 1.6 : 0.9) * best.fighter.mods.magnet : 0;
      if (best && bd < pull && d.t > 0.35) { d.x += (best.pos.x - d.x) * Math.min(1, dt * 10); d.z += (best.pos.z - d.z) * Math.min(1, dt * 10); }
      if (best && bd < 0.45 && d.t > 0.3) { this.pickup(best, d); d.done = true; }
      d.m.position.set(d.x, d.y + Math.sin(d.t * 4) * 0.05, d.z);
      d.m.rotation.y += dt * 3;
      if (d.t > d.life) d.done = true;
      if (d.done) this.root.remove(d.m);
    }
    this.drops = this.drops.filter((d) => !d.done);
  }

  pickup(p, d) {
    const f = p.fighter;
    if (d.kind === 'dust') { this.gainXp(p, 1); p.dust = (p.dust || 0) + 1; if (this.party.progress) this.party.progress.addDust(p, 1); audio.sfx('coin', { volume: 0.25 }); }
    else if (d.kind === 'tart') {
      const amt = Math.round(f.maxHp * 0.35 * (1 + (d.bonus || 0)));
      f.hp = Math.min(f.maxHp, f.hp + amt);
      this.popText(p.pos.x, 2.0, p.pos.z, t('Tart! +{n}', { n: amt }), '#f59ac8');
      audio.sfx('pickup', { volume: 0.6 });
      this.world.fx.emit('heart', p.pos.x, 1.8, p.pos.z, 1);
    } else {
      f.speedT = 8 + (d.coffeeT || 0);
      this.popText(p.pos.x, 2.0, p.pos.z, t('Coffee! Zoom!'), '#c8864a');
      audio.sfx('pickup', { volume: 0.6 });
    }
  }

  // ------------------------------------------------------------------ helpers
  partyCentre() {
    const ps = this.alivePlayers();
    if (!ps.length) return this.bounds ? { x: this.bounds.x, z: this.bounds.z } : { x: 0, z: 0 };
    let x = 0, z = 0;
    for (const p of ps) { x += p.pos.x; z += p.pos.z; }
    return { x: x / ps.length, z: z / ps.length };
  }

  freeSpot(x, z, r) {
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, d = Math.random() * r;
      const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      if (this.world.overCol.blocked(px, pz, 0.4) || this.world.tileAt(px, pz) === TT.WATER) continue;
      if (this.bounds && ((px - this.bounds.x) / this.bounds.rx) ** 2 + ((pz - this.bounds.z) / this.bounds.rz) ** 2 > 0.9) continue;
      return { x: px, z: pz };
    }
    return null;
  }

  shakeAt(e, s) { this.party.cam.shake = Math.max(this.party.cam.shake || 0, s); }

  bubble(e, text, life = 1.1) { this.nums.push({ x: e.x, y: e.y + e.def.h + 0.6, z: e.z, text, color: '#fff7e6', t: 0, life, bubble: true, follow: e }); }

  // hits on the same foe in quick succession add up into one number, so a
  // crowd of heroes doesn’t bury the fight under digits
  damageNumber(e, dmg, crit) {
    const n = this.nums.find((q) => q.on === e && q.t < 0.35 && !q.big === !crit);
    if (n) { n.sum += dmg; n.text = String(n.sum); n.t = Math.min(n.t, 0.1); n.hits++; if (n.hits >= 3) n.color = '#ffd66b'; return; }
    this.popText(e.x, e.y + e.def.h + 0.3, e.z, String(dmg), crit ? '#ffd66b' : '#fff7e6', crit);
    const q = this.nums[this.nums.length - 1];
    q.on = e; q.sum = dmg; q.hits = 1;
  }

  popText(x, y, z, text, color, big = false) {
    this.nums.push({ x: x + rand(-0.15, 0.15), y, z, text, color, t: 0, life: big ? 1.3 : 0.9, big });
    if (this.nums.length > 90) this.nums.splice(0, this.nums.length - 90);
  }

  updateNums(dt) {
    for (const n of this.nums) {
      n.t += dt;
      if (n.follow) { n.x = n.follow.x; n.z = n.follow.z; n.y = n.follow.y + n.follow.def.h + 0.6; }
      else n.y += dt * (n.big ? 0.9 : 1.6);
    }
    this.nums = this.nums.filter((n) => n.t < n.life);
  }

  sfx(name, e) {
    void e;
    audio.sfx(name, { volume: 0.55 });
  }

  // ------------------------------------------------------------------ drawing (UI layer, per view)
  drawLabels(ctx, v) {
    const P = this.party;
    drawEnemyMarks(ctx, this, v);
    // enemy health bars (once hurt; always for elites & rares) with the level in
    // WoW colours next to them — the boss has its own bar
    const ref = this.refLevel();
    for (const e of this.enemies) {
      if (!e.alive || e.def.boss || e.state === 'sleep') continue;
      const special = e.elite || e.rare;
      if (e.hp >= e.maxHp && !special) continue;
      const u = P.toUi(v, e.x, e.y + e.def.h + 0.25, e.z);
      const w = e.def.r > 0.45 || special ? 22 : 16, x0 = Math.round(u.x - w / 2), y0 = Math.round(u.y);
      ctx.fillStyle = special ? (e.rare ? '#dfe4ee' : '#ffd66b') : '#241a2e'; ctx.fillRect(x0 - 1, y0 - 1, w + 2, 4);
      ctx.fillStyle = '#6a4a8e'; ctx.fillRect(x0, y0, w, 2);
      ctx.fillStyle = '#c9a2f0'; ctx.fillRect(x0, y0, Math.round(w * Math.max(0, e.hp / e.maxHp)), 2);
      if (e.level) drawText(ctx, (special ? '★' : '') + e.level, x0 - 2, y0 - 3, { color: special ? (e.rare ? '#dfe4ee' : '#ffd66b') : levelColor(e.level, ref), align: 'right', outline: '#241a2e' });
      // (a rare’s name over its silver bar)
      if (e.rareName) drawText(ctx, t(e.rareName), u.x, y0 + 5, { color: '#dfe4ee', align: 'center', outline: '#241a2e' });
    }
    // napping heroes: a revive ring
    for (const p of this.players) {
      const f = p.fighter;
      if (!f || !f.down || this.pvp) continue;
      const u = P.toUi(v, p.pos.x, 0.5, p.pos.z);
      const k = Math.min(1, f.revive / 1.6);
      ctx.fillStyle = '#241a2e';
      for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; ctx.fillRect(Math.round(u.x + Math.cos(a) * 9), Math.round(u.y + Math.sin(a) * 5), 2, 2); }
      ctx.fillStyle = '#8fd6b4';
      for (let i = 0; i < 24 * k; i++) { const a = (i / 24) * Math.PI * 2 - Math.PI / 2; ctx.fillRect(Math.round(u.x + Math.cos(a) * 9), Math.round(u.y + Math.sin(a) * 5), 2, 2); }
      if (Math.floor(P.t * 2) % 2) drawText(ctx, 'z Z', u.x + 6, u.y - 14, { color: '#b9a2e3', outline: '#241a2e' });
    }
    // damage numbers & shouts (the big shouts step out of each other’s way:
    // two ultimates at once stay readable)
    const shouts = [];
    for (const n of this.nums) {
      const u = P.toUi(v, n.x, n.y, n.z);
      if (n.big && !n.bubble) {
        const w = measure(n.text) * 2;
        for (let k = 0; k < 5; k++) { const hit = shouts.find((q) => Math.abs(q.x - u.x) < (q.w + w) / 2 + 2 && Math.abs(q.y - u.y) < 18); if (!hit) break; u.y = hit.y - 18; }
        shouts.push({ x: u.x, y: u.y, w });
      }
      const a = Math.min(1, (n.life - n.t) * 4);
      ctx.globalAlpha = Math.max(0, a);
      if (n.bubble) {
        const w = measure(n.text) + 6;
        ctx.fillStyle = '#241a2e'; ctx.fillRect(Math.round(u.x - w / 2) - 1, Math.round(u.y) - 1, w + 2, 11);
        ctx.fillStyle = '#fff7e6'; ctx.fillRect(Math.round(u.x - w / 2), Math.round(u.y), w, 9);
        drawText(ctx, n.text, u.x, u.y + 1, { color: '#6a3a8e', align: 'center' });
      } else drawText(ctx, n.text, u.x, u.y, { color: n.color, align: 'center', outline: '#241a2e', scale: n.big ? 2 : 1 });
      ctx.globalAlpha = 1;
    }
  }

  // the boss’s big health bar across the top of the screen
  drawUi(ctx) {
    drawCombo(ctx, this);
    this.barRect = null;
    // (the boss closest to the heroes: a lair’s boss out in the world shouldn’t take the bar of the one you’re fighting)
    let boss = null, bd = 1e9;
    for (const e of this.enemies) {
      if (!e.alive || !e.def.boss) continue;
      for (const p of this.players) { if (!p.pos) continue; const d = Math.hypot(p.pos.x - e.x, p.pos.z - e.z); if (d < bd) { bd = d; boss = e; } }
    }
    if (!boss || bd > 32) { this.drawGroupBar(ctx); return; }
    const W = this.party.display.w;
    const bw = Math.min(260, W - 80), bx = Math.round((W - bw) / 2), by = 44;
    // (the toasts step down under it: party.drawToasts)
    this.barRect = { x: bx - 2, y: by - 13, w: bw + 4, h: 32 };
    drawText(ctx, t(boss.def.title || 'The Grumblecloud'), W / 2, by - 11, { color: '#fff3c4', align: 'center', outline: '#241a2e' });
    ctx.fillStyle = '#241a2e'; ctx.fillRect(bx - 2, by - 2, bw + 4, 9);
    ctx.fillStyle = '#3a2a4a'; ctx.fillRect(bx, by, bw, 5);
    ctx.fillStyle = boss.phase2 || (boss.phase || 1) >= 3 ? '#e05a7a' : (boss.phase || 1) === 2 ? '#c06ad0' : '#9a7ad0';
    ctx.fillRect(bx, by, Math.round(bw * Math.max(0, boss.hp / boss.maxHp)), 5);
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(bx, by, Math.round(bw * Math.max(0, boss.hp / boss.maxHp)), 1);
    if (boss.def.title) for (const k of [0.33, 0.66]) { ctx.fillStyle = '#241a2e'; ctx.fillRect(bx + Math.round(bw * k), by - 1, 1, 7); }
    if (boss.shieldHp > 0 && boss.def.shield) { ctx.fillStyle = '#9fc8ff'; ctx.fillRect(bx, by + 5, Math.round(bw * Math.min(1, boss.shieldHp / (boss.def.shield * (boss.hpK || 1)))), 2); }
    if (boss.hintText) drawText(ctx, t(boss.hintText), W / 2, by + 9, { color: '#9fdcff', align: 'center', outline: '#241a2e' });
    else if (boss.exposed > 0) drawText(ctx, t('Its core is showing — hit it!'), W / 2, by + 9, { color: '#9fdcff', align: 'center', outline: '#241a2e' });
    if (boss.state === 'tired') drawText(ctx, t('It’s napping — get it!'), W / 2, by + 9, { color: '#8fd6b4', align: 'center', outline: '#241a2e' });
  }
}

// (World v7) a mini-boss band (the Understudies…): one bar for the whole group
Combat.prototype.drawGroupBar = function (ctx) {
  const group = this.enemies.filter((e) => e.miniGroup && (e.alive || e.fading > 0));
  if (!group.length || !group.some((e) => e.alive)) return;
  const W = this.party.display.w, bw = Math.min(200, W - 100), bx = Math.round((W - bw) / 2), by = 44;
  this.barRect = { x: bx - 2, y: by - 13, w: bw + 4, h: 30 };
  const max = group.reduce((a, e) => a + e.maxHp, 0), hp = group.reduce((a, e) => a + Math.max(0, e.alive ? e.hp : 0), 0);
  drawText(ctx, t(group[0].miniGroup), W / 2, by - 11, { color: '#f4eaff', align: 'center', outline: '#241a2e' });
  if (group[0].immuneHint && group.some((e) => e.alive && e.immune)) drawText(ctx, t(group[0].immuneHint), W / 2, by + 7, { color: '#8fd6e8', align: 'center', outline: '#241a2e' });
  ctx.fillStyle = '#241a2e'; ctx.fillRect(bx - 2, by - 2, bw + 4, 8);
  ctx.fillStyle = '#3a2a4a'; ctx.fillRect(bx, by, bw, 4);
  ctx.fillStyle = '#d98ad8'; ctx.fillRect(bx, by, Math.round(bw * hp / max), 4);
  let x = bx;
  for (const e of group) { x += Math.round(bw * e.maxHp / max); if (x < bx + bw - 1) { ctx.fillStyle = '#241a2e'; ctx.fillRect(x, by - 1, 1, 6); } }
};

function norm(x, z) { const l = Math.hypot(x, z) || 1; return { x: x / l, z: z / l }; }

function noteTexture() {
  const mk = (col, flip) => {
    const c = document.createElement('canvas');
    c.width = c.height = 12;
    const x = c.getContext('2d');
    const g = flip ? ['....##......', '....####....', '....#..##...', '....#...##..', '....#.......', '....#.......', '..###.......', '.####.......', '.###........', '............'] : ['.....#####..', '.....#...#..', '.....#...#..', '.....#...#..', '.....#...#..', '...###.###..', '..####.####.', '..###..###..', '............'];
    g.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === '#') { x.fillStyle = col; x.fillRect(i, j + 1, 1, 1); } });
    const t2 = new THREE.CanvasTexture(c);
    t2.magFilter = t2.minFilter = THREE.NearestFilter; t2.generateMipmaps = false;
    return t2;
  };
  return [mk('#f59ac8', false), mk('#b88cf0', true)];
}

function tartMesh(C) {
  const g = new THREE.Group();
  const crust = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.1, 10), C.mat(0xd9a45a));
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 10), C.mat(0xec5f73));
  top.position.y = 0.06;
  g.add(crust, top);
  return g;
}

function coffeeMesh(C) {
  const g = new THREE.Group();
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.2, 10), C.mat(0xfbf1dc));
  const cof = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.02, 10), C.mat(0x6b4330));
  cof.position.y = 0.1;
  g.add(cup, cof);
  return g;
}
