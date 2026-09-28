// Companions: an animal you beat the gloom out of may decide it likes you. It
// joins your companions for good (one of each kind), and the one you choose
// trots along behind you, nipping at any gloom that comes near (a nod to the
// animal orbs of the great couch brawlers). Pick who follows you — or send
// them all home — on your phone (menu → My companions) or, in the solo game,
// on the menu's Hero page. Kept in each player's profile (the solo save).

import { THREE } from '../render/r3d.js';
import { buildDino, animDino } from '../models/dinos3d.js';
import { audio } from '../engine/audio.js';
import { t } from '../i18n.js';

// (Dino Isle's little ones: a young raptor with a big head, a compsognathus)
const dino = (kind, scale, baby) => (c, r3d) => { const rig = buildDino(r3d, kind, { scale, saddle: false, baby }); rig.root.userData.rig = rig; return rig.root; };
export const BUDDY_KINDS = {
  fox: { name: 'Fox', the: 'the fox', hint: 'Free a gloomy fox in the woods', build: (c) => c.fox('#d9713a'), scale: 1, speed: 5.4, bite: 7, every: 1.25, reach: 0.5, hop: 13, sfx: 'snap', h: 0.75 },
  deer: { name: 'Fawn', the: 'the fawn', hint: 'Free a gloomy stag once you have one to ride', build: (c) => c.deer(false), scale: 0.74, speed: 4.8, bite: 12, every: 2.1, reach: 0.65, hop: 9, sfx: 'bonk', h: 1.0 },
  crab: { name: 'Crab', the: 'the crab', hint: 'Free a shellback on the shore', build: (c) => c.crab(), scale: 1.9, speed: 3.8, bite: 9, every: 1.6, reach: 0.45, hop: 18, sfx: 'snap', h: 0.6 },
  raptor: { name: 'Young raptor', the: 'the young raptor', hint: 'Free a gloom raptor on Dino Isle', build: dino('raptor', 0.5, true), scale: 1, speed: 6.2, bite: 11, every: 1.1, reach: 0.5, hop: 0, sfx: 'snap', h: 0.95 },
  compy: { name: 'Compy', the: 'the compy', hint: 'Free a compsognathus on Dino Isle', build: dino('compy', 1.15, false), scale: 1, speed: 6.4, bite: 5, every: 0.7, reach: 0.35, hop: 0, sfx: 'chirp', h: 0.65 },
};
export const BUDDY_ORDER = ['fox', 'deer', 'crab', 'raptor', 'compy'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export class Buddies {
  constructor(party) {
    this.party = party;
    this.list = [];
    this.ringGeo = new THREE.RingGeometry(0.2, 0.28, 18).rotateX(-Math.PI / 2);
  }

  of(p) { return this.list.find((b) => b.owner === p) || null; }

  // ------------------------------------------------------------------ the collection
  pets(p) { const pr = this.party.profileOf(p); return pr.pets || (pr.pets = { owned: [], active: null }); }
  owned(p) { return this.pets(p).owned.filter((k) => BUDDY_KINDS[k]); }
  active(p) { const s = this.pets(p); return s.active && BUDDY_KINDS[s.active] && s.owned.includes(s.active) ? s.active : null; }

  // where companions come along: the lobby, out exploring, the Festival Ring's
  // waves (not its brawls, nor the festival's games); in the solo game, outdoors
  allowed(p) {
    const P = this.party;
    if (p.connected === false) return false;
    if (P.solo) return P.world.mapId === 'overworld';
    if (P.phase === 'lobby') return true;
    return P.exploring() || !!(P.act && P.act.mode === 'waves');
  }

  // a freed animal picks a friend: whoever freed it, or someone nearby who
  // hasn't got one of its kind yet
  adoptFrom(e, p) {
    const kind = e.def.animal;
    if (!BUDDY_KINDS[kind]) return null;
    const P = this.party;
    let owner = p && p.connected !== false && !this.owned(p).includes(kind) ? p : null;
    if (!owner) {
      let bd = 12;
      for (const q of P.players) {
        if (q.connected === false || this.owned(q).includes(kind)) continue;
        const d = Math.hypot(q.pos.x - e.x, q.pos.z - e.z);
        if (d < bd) { bd = d; owner = q; }
      }
    }
    if (!owner) return null;
    return this.give(owner, kind, e.x, e.z);
  }

  // a new friend joins the collection, and follows you right away
  give(owner, kind, x, z) {
    const P = this.party, K = BUDDY_KINDS[kind], s = this.pets(owner), first = !s.owned.length;
    if (!s.owned.includes(kind)) s.owned.push(kind);
    s.active = kind;
    P.profileDirty = true;
    const old = this.of(owner);
    if (old) this.release(old, true);
    const b = this.spawn(owner, kind, x, z);
    b.heartT = 2.5;
    P.world.fx.emit('heart', x, 1, z, 1);
    audio.sfx('pet', { volume: 0.6 });
    if (first) {
      const how = owner.kind === 'phone' ? t('Choose who follows you on your phone: menu → My companions') : P.solo ? t('Choose who follows you on the menu’s Hero page') : '';
      P.showBanner(t('{name} has a new companion: {animal}!', { name: owner.name, animal: t(K.the) }), how);
    } else P.toast(t('A {animal} follows {name} now ♥', { animal: t(K.name).toLowerCase(), name: owner.name }), owner.color);
    if (owner.setEmote) owner.setEmote('heart', 1.6);
    this.sendList(owner);
    return b;
  }

  // the phone (or the Hero page) picked who follows — or sent them home (null)
  choose(p, kind) {
    kind = kind || null;
    const s = this.pets(p);
    if (kind && !this.owned(p).includes(kind)) return;
    if (kind === this.active(p)) { this.sendList(p); return; }
    s.active = kind;
    this.party.profileDirty = true;
    const b = this.of(p);
    if (b) this.release(b, true);
    if (kind) {
      const n = this.allowed(p) && this.summon(p);
      if (n) { n.heartT = 2.5; audio.sfx('pet', { volume: 0.5 }); }
      this.party.toast(t('{animal} follows {name} now ♥', { animal: cap(t(BUDDY_KINDS[kind].the)), name: p.name }), p.color);
    } else this.party.toast(t('{name}’s companion went home', { name: p.name }), p.color);
    this.sendList(p);
  }

  sendList(p) {
    if (p.kind !== 'phone' || p.connected === false) return;
    const own = this.owned(p);
    this.party.net.send(p.id, { t: 'pets', list: BUDDY_ORDER.map((k) => ({ id: k, name: t(BUDDY_KINDS[k].name), have: own.includes(k), hint: t(BUDDY_KINDS[k].hint) })), active: this.active(p) });
  }

  // ------------------------------------------------------------------ out in the world
  spawn(owner, kind, x, z) {
    const K = BUDDY_KINDS[kind], P = this.party, w = P.world;
    const obj = K.build(w.critters, P.r3d);
    obj.scale.multiplyScalar(K.scale);
    obj.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    obj.position.set(x, 0, z);
    w.over.root.add(obj);
    const ring = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color: owner.color, transparent: true, opacity: 0.75, depthWrite: false }));
    ring.renderOrder = 1;
    w.over.root.add(ring);
    const b = { owner, kind, K, obj, rig: obj.userData.rig || null, ring, x, z, face: { x: 1, z: 0 }, t: Math.random() * 5, cd: 0.8, lunge: 0, stuck: 0, heartT: 0, bites: 0 };
    this.list.push(b);
    w.fx.emit('sparkle', x, 0.6, z, 10, { color: '#8fd6b4' });
    return b;
  }

  // (out it pops, just behind you)
  summon(p) {
    const w = this.party.world, d = p.actor.dir || { x: 0, z: 1 };
    let x = p.pos.x - d.x * 0.8, z = p.pos.z - d.z * 0.8;
    if (w.overCol.blocked(x, z, 0.2)) { x = p.pos.x; z = p.pos.z; }
    return this.spawn(p, this.active(p), x, z);
  }

  release(b, poof = false) {
    const w = this.party.world;
    if (poof) { w.fx.emit('smoke', b.x, 0.3, b.z, 4); w.fx.emit('sparkle', b.x, 0.5, b.z, 5, { color: '#8fd6b4' }); }
    w.over.root.remove(b.obj);
    w.over.root.remove(b.ring);
    this.list = this.list.filter((q) => q !== b);
  }

  clear() { for (const b of this.list.slice()) this.release(b); }

  // everyone's chosen companion is out with them, wherever companions may go
  sync() {
    const P = this.party;
    for (const b of this.list.slice()) if (!P.players.includes(b.owner) || !this.allowed(b.owner) || b.kind !== this.active(b.owner)) this.release(b);
    for (const p of P.players) if (this.active(p) && !this.of(p) && this.allowed(p)) this.summon(p);
  }

  // after a teleport (arena, respawn): everyone's buddy pops in beside them
  regroup() {
    for (const b of this.list) {
      const o = b.owner;
      b.x = o.pos.x - 0.6; b.z = o.pos.z + 0.4;
    }
  }

  update(dt, frozen) {
    this.sync();
    const P = this.party, C = P.combat, w = P.world, col = w.overCol;
    for (const b of this.list.slice()) {
      const o = b.owner;
      b.t += dt;
      b.cd -= dt;
      if (b.heartT > 0) b.heartT -= dt;
      if (frozen) { this.place(b, false, 0); continue; }
      // gloom close to my human? go get it
      let tgt = null;
      if (C && !C.pvp) {
        let bd = 4.8;
        for (const e of C.enemies) {
          // (sleeping gloom is left alone: waking a nest is the players' call)
          if (!e.hurtable || e.state === 'sleep' || (e.y > 1.3 && !e.def.boss)) continue;
          const d = Math.hypot(e.x - o.pos.x, e.z - o.pos.z);
          if (d < bd) { bd = d; tgt = e; }
        }
      }
      let tx, tz, speed = b.K.speed;
      if (tgt) { tx = tgt.x; tz = tgt.z; speed *= 1.2; }
      else {
        // (trailing behind you on the move, sitting by your side when you stop)
        const walk = o.actor.moving || o.mount, d = o.actor.dir, back = walk ? 0.95 : 0.3, side = (o.slot % 2 ? 1 : -1) * (walk ? 0.55 : 0.9);
        tx = o.pos.x - d.x * back - d.z * side;
        tz = o.pos.z - d.z * back + d.x * side;
      }
      const dx = tx - b.x, dz = tz - b.z, dist = Math.hypot(dx, dz);
      const far = Math.hypot(o.pos.x - b.x, o.pos.z - b.z);
      if (far > 13 || b.stuck > 2.2) { this.warp(b); continue; }
      const stop = tgt ? tgt.r + b.K.reach : 0.3;
      b.moving = dist > stop + 0.05;
      if (b.moving) {
        const step = Math.min(dist - stop, speed * dt * (dist > 3 ? 1.35 : 1));
        const pos = { x: b.x, z: b.z };
        col.move(pos, (dx / dist) * step, (dz / dist) * step, 0.2);
        const got = Math.hypot(pos.x - b.x, pos.z - b.z);
        b.stuck = got < step * 0.3 && dist > 1.5 ? b.stuck + dt : 0;
        b.x = pos.x; b.z = pos.z;
        b.face = { x: dx / dist, z: dz / dist };
        b.pace = got / Math.max(dt, 1e-3);
      } else if (tgt && b.cd <= 0) {
        // nip!
        b.cd = b.K.every;
        b.lunge = 0.16;
        b.bites++;
        const lv = o.fighter ? 1 + ((o.fighter.eff || o.fighter.level) - 1) * 0.06 : 1;
        C.hurtEnemy(tgt, b.K.bite * lv, { p: o.fighter ? o : null, dir: b.face, knock: 1.3, kind: 'melee', quiet: true });
        audio.sfx(b.K.sfx, { volume: 0.35 });
      } else if (!tgt) {
        // (sitting by you, it looks up at you)
        const lx = o.pos.x - b.x, lz = o.pos.z - b.z, ll = Math.hypot(lx, lz) || 1, k = Math.min(1, dt * 4);
        b.face = { x: b.face.x + (lx / ll - b.face.x) * k, z: b.face.z + (lz / ll - b.face.z) * k };
      }
      if (b.lunge > 0) b.lunge -= dt;
      // a happy hop now and then
      if (!b.moving && !tgt && Math.random() < dt * 0.25) b.hopT = 0.35;
      this.place(b, b.moving, dt);
    }
  }

  warp(b) {
    const o = b.owner, w = this.party.world;
    w.fx.emit('smoke', b.x, 0.3, b.z, 4);
    b.x = o.pos.x - o.actor.dir.x * 0.8; b.z = o.pos.z - o.actor.dir.z * 0.8;
    if (w.overCol.blocked(b.x, b.z, 0.2)) { b.x = o.pos.x; b.z = o.pos.z; }
    b.stuck = 0;
    w.fx.emit('sparkle', b.x, 0.5, b.z, 6, { color: '#8fd6b4' });
  }

  place(b, moving, dt) {
    const w = this.party.world;
    const gy = w.groundY({ x: b.x, z: b.z }) || 0;
    let y = moving && b.K.hop ? Math.abs(Math.sin(b.t * b.K.hop)) * 0.08 : 0;
    if (b.hopT > 0) { b.hopT -= 1 / 60; y += Math.sin((b.hopT / 0.35) * Math.PI) * 0.3; }
    const l = b.lunge > 0 ? Math.sin((b.lunge / 0.16) * Math.PI) * 0.25 : 0;
    b.obj.position.set(b.x + b.face.x * l, gy + y, b.z + b.face.z * l);
    b.obj.rotation.y = Math.atan2(-b.face.z, b.face.x);
    b.ring.position.set(b.x, gy + 0.02, b.z);
    const tail = b.obj.userData.tail;
    if (tail) tail.rotation.y = Math.sin(b.t * (moving ? 14 : 6)) * 0.5;
    // (the little dinosaurs run on their own legs)
    if (b.rig) animDino(b.rig, dt, { speed: moving ? Math.min(b.pace || b.K.speed, b.K.speed * 1.4) * 0.5 : 0, act: b.lunge > 0 ? 1 : 0, roar: b.hopT > 0 ? 0.6 : 0 });
  }

  // a heart over new friends, for a moment
  drawLabels(ctx, v, heartFn) {
    const P = this.party;
    for (const b of this.list) {
      if (b.heartT <= 0) continue;
      const u = P.toUi(v, b.x, b.K.h + 0.3, b.z);
      heartFn(ctx, Math.round(u.x) - 3, Math.round(u.y - 6 - (2.5 - b.heartT) * 3));
    }
  }
}
