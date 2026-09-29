// Party Mode's rooms (Adventure v4): the valley's houses and shops and the
// wild lands' landmarks (yurts, igloos, windmills…) open their doors. Each
// room is built the first time someone walks in, far east of the map (past
// ROOM_X), so every player — split screens included — goes in on their own:
// the camera frames the room (camera.js asks roomOf), its walls take over from
// the big world's collision (collide.js asks blocked / walkable here), and its
// view is lit like an interior (light, before each view is drawn). Inside it's
// calm: you get your breath back, a bed lets you sleep the night away (camp.js
// asks bedNear), and each chest has something for each of you every day. Out
// by the door you came in by: walk down onto the mat, or A there.

import { THREE } from '../render/r3d.js';
import { INTERIORS, Interior3D } from '../world/interiors.js';
import { BUILDINGS } from '../world/overworld.js';
import { wildDoors } from '../world/wildrooms.js';
import { Collision } from '../world/collision.js';
import { audio } from '../engine/audio.js';
import { drawText, measure } from '../engine/font.js';
import { t } from '../i18n.js';

export const ROOM_X = 2000;                  // everything east of this is a room (World v7: past the Dawnlands; dungeons from x 3000)
const SLOT = { x: 2200, z: -100, dx: 160, dz: 100, cols: 4 };
const HEAL = 0.05;                           // of your health a second, indoors
const ACTX = { millRunning: true };
// who keeps which of the valley's rooms, and where they stand
const KEEPERS = {
  bakery: ['rosa', 'counter'], store: ['ivy', 'counter'], cafe: ['sol', 'counter'], library: ['mabel', 'desk'], carpenter: ['theo', 'counter'],
  shack: ['finn', 'counter'], wren: ['wren', 'paint'], farmhouse: ['bram', 'counter'], marlo: ['marlo', 'table'], hall: ['hollis', 'desk'],
};
// what they say when you chat across the counter
const LINES = {
  rosa: ['Fresh from the oven — mind, it’s hot!', 'Nothing a warm bun can’t fix.'],
  ivy: ['Seeds for every season!', 'Take a sniff of the sweet peas!'],
  sol: ['A cup of something warm before the road?', 'The café is always open for adventurers.'],
  mabel: ['Shh… the books are napping.', 'Every map of the wild lands started on these shelves.'],
  theo: ['Mind the sawdust!', 'A good hammer never lets you down.'],
  finn: ['The fish are biting today.', 'Smell that sea air? Best medicine there is.'],
  wren: ['Don’t mind the paint on my nose.', 'The light is lovely in here, isn’t it?'],
  bram: ['Wipe your boots, the floor’s just swept!', 'The hens send their regards.'],
  marlo: ['Welcome aboard my little hut!', 'Tide’s turning — stay a while.'],
  hollis: ['The town hall is always open to you.', 'Paperwork… my old enemy.'],
};

export class Rooms {
  constructor(P) {
    this.P = P;
    this.X = ROOM_X;
    // (built rooms stay in the scene for the next party, hidden)
    this.cache = P.r3d.partyRooms || (P.r3d.partyRooms = new Map());
    this.list = [];
    this.doors = [];
    for (const b of BUILDINGS) if (INTERIORS[b.id]) this.doors.push({ x: b.door + 0.5, z: b.y + b.h + 0.35, room: b.id, key: b.id });
    for (const d of wildDoors(P.big.map.pois)) this.doors.push({ ...d, key: d.kind + '@' + Math.round(d.x) + ',' + Math.round(d.z) });
    this.looted = new Set();                  // door|player|day: each chest, once a day each
    this.vr = new Map();                      // view → the room it shows (this frame)
    this.col = P.world.overCol;
    this.col.rooms = this;
    P.cam.roomOf = (members) => { const R = this.roomOf(members); return R ? R.frame : null; };
  }

  // ------------------------------------------------------------------ the rooms
  get(id) {
    let R = this.list.find((q) => q.id === id);
    if (R) return R;
    R = this.cache.get(id);
    if (!R) {
      const def = INTERIORS[id], i = this.cache.size;
      const ox = SLOT.x + (i % SLOT.cols) * SLOT.dx, oz = SLOT.z + Math.floor(i / SLOT.cols) * SLOT.dz;
      const room = new Interior3D(this.P.r3d, id, def).build();
      room.root.position.set(ox, 0, oz);
      const col = new Collision(def.w, def.d, (x, z) => x >= 0 && z >= 0 && x < def.w && z < def.d, room.colliders);
      R = {
        id, def, room, col, ox, oz, t: -9,
        frame: { x0: ox, z0: oz, w: def.w, d: def.d },
        focus: { x: ox + def.w / 2, z: oz + def.d / 2 },
        lights: room.lights.map((l) => ({ ...l, x: l.x + ox, z: l.z + oz, base: l.power })),
      };
      this.cache.set(id, R);
    }
    R.room.root.visible = true;
    this.list.push(R);
    return R;
  }

  // the room around (x, z): anything east of ROOM_X belongs to the nearest one
  near(x, z) {
    if (x < ROOM_X) return null;
    let best = null, bd = 60;
    for (const R of this.list) { const d = Math.max(Math.abs(x - R.focus.x), Math.abs(z - R.focus.z)); if (d < bd) { bd = d; best = R; } }
    return best;
  }
  inside(p) { return this.near(p.pos.x, p.pos.z); }
  // everyone in a view in the same room: that room
  roomOf(members) {
    let R = null;
    for (const m of members) { const q = m.pos && this.near(m.pos.x, m.pos.z); if (!q || (R && q !== R)) return null; R = q; }
    return R;
  }
  viewRoom(v) { return this.vr.get(v) || null; }

  // (collide.js, for anything east of ROOM_X)
  blocked(x, z, r, ignore) { const R = this.near(x, z); return !R || R.col.blocked(x - R.ox, z - R.oz, r, ignore); }
  walkable(tx, tz) { const R = this.near(tx + 0.5, tz + 0.5); return !!R && R.col.walkable(tx - R.ox, tz - R.oz); }

  // where someone is on the world map (indoors: the door they came in by)
  mapPos(p) { const R = this.inside(p); return R ? p.roomExit || this.exitFor(R) : p.pos; }
  doorOf(v) {
    const R = this.vr.get(v) || this.near(v.cx, v.cz);
    if (!R) return null;
    const m = v.members.find((q) => q.roomExit && this.inside(q) === R);
    return m ? m.roomExit : this.exitFor(R);
  }
  exitFor(R) { const d = this.doors.find((q) => q.room === R.id); return d ? { x: d.x, z: d.z + 0.3 } : this.P.spawnPoint(0); }

  // ------------------------------------------------------------------ in & out
  // free roam only, on foot, out of the fray
  open() { const P = this.P; return P.exploring() && (!P.act.stage || P.act.stage === 'roam'); }
  canUse(p) {
    const P = this.P, race = P.races && P.races.race;
    if (!this.open() || P.busy || P.dialogue.active || P.vote || P.cinematic || !p.connected || p.frozen || p.sleeping) return false;
    if (p.vehicle || p.mount || p.swimming || p.dive || (p.fighter && p.fighter.down)) return false;
    return !(race && race.racers.has(p.slot));
  }
  fighting(p) { const C = this.P.combat; return !!(C && C.enemies.some((e) => e.alive && e.state !== 'sleep' && Math.hypot(e.x - p.pos.x, e.z - p.pos.z) < 7)); }

  doorNear(p) {
    for (const d of this.doors) if (Math.abs(d.x - p.pos.x) < 0.75 && Math.abs(d.z - p.pos.z) < 0.7) return d;
    return null;
  }
  atMat(p, R) { return Math.abs(p.pos.x - R.ox - (R.def.door + 0.5)) < 0.75 && p.pos.z - R.oz > R.def.d - 0.95; }
  chestNear(p, R) {
    for (const it of R.room.interactables) if (it.kind === 'chest' && Math.hypot(it.x + R.ox - p.pos.x, it.z + R.oz - p.pos.z) < 1.3) return it;
    return null;
  }
  // a bed within reach (camp.js: sleep in it at night)
  bedNear(p) {
    const R = this.inside(p);
    if (!R) return null;
    for (const it of R.room.interactables) {
      if (it.kind !== 'bed') continue;
      const x = it.x + R.ox, z = it.z + R.oz;
      if (Math.abs(p.pos.x - x) < 1.3 && Math.abs(p.pos.z - z) < 1.6) return { x, z, bed: it, life: 1 };
    }
    return null;
  }

  enter(p, d) {
    const P = this.P, R = this.get(d.room), a = p.actor, def = R.def;
    p.roomExit = { x: d.x, z: d.z + 0.3, key: d.key };
    a.pos = { x: R.ox + def.door + 0.5, z: R.oz + def.d - 0.55 };
    a.vel = { x: 0, z: 0 }; a.jumpY = 0; a.jumpV = 0;
    a.dir = { x: 0, z: -1 }; a.model.facing = a.model.targetFacing = Math.PI;
    p.doorPush = 0;
    R.t = P.t;
    this.keeper(R);
    audio.sfx('door');
    P.toast(t('{name} went into {place}', { name: p.name, place: t(def.name) }), p.color);
    P.buzz(p, 20);
    this.bringBuddy(p);
  }

  leave(p) {
    const P = this.P, a = p.actor, R = this.inside(p);
    if (p.sleeping && P.camp) P.camp.wake(p);
    const e = p.roomExit || (R ? this.exitFor(R) : P.spawnPoint(p.slot));
    a.pos = { x: e.x, z: e.z };
    a.vel = { x: 0, z: 0 }; a.jumpY = 0; a.jumpV = 0;
    a.dir = { x: 0, z: 1 }; a.model.facing = a.model.targetFacing = 0;
    p.roomExit = null; p.doorPush = 0;
    audio.sfx('door');
    this.bringBuddy(p);
  }

  // the room's keeper at the counter (unless they're out and about)
  keeper(R) {
    const P = this.P, K = KEEPERS[R.id], s = K && R.def.spots[K[1]];
    if (!s || (R.keeper && P.npcs.includes(R.keeper)) || P.npcs.some((n) => n.id === K[0])) return;
    R.keeper = P.spawnNpc(K[0], R.ox + s[0], R.oz + s[1], { x: 0, z: 1 });
    R.keeper.counter = true;           // (explore.js: a chat reaches over the counter)
  }

  chat(n, p) {
    const L = LINES[n.id] || ['Make yourself at home!'];
    n.chatI = ((n.chatI ?? -1) + 1) % L.length;
    n.bubble = t(L[n.chatI]); n.bubbleT = 3.2; n.lookAt = p.pos; n.talking = true; n.speaking = false;
    const vo = n.def.voice || {};
    audio.blip({ pitch: vo.pitch || 52, wave: vo.wave || 'triangle' });
  }

  bringBuddy(p) { const B = this.P.buddies, b = B && B.of(p); if (b) B.warp(b); }

  // what A does here (explore's nearThing): go in, come out, open the chest
  nearThing(p) {
    if (!this.canUse(p)) return null;
    const R = this.inside(p);
    if (!R) {
      const d = this.doorNear(p);
      return d ? { kind: 'room', what: 'enter', d, label: 'Enter', hint: '{place}: come on in!', vars: { place: t(INTERIORS[d.room].name) } } : null;
    }
    const c = this.chestNear(p, R);
    if (c) return { kind: 'room', what: 'chest', R, c, label: 'Open', hint: 'Something new in it every day — for each of you!' };
    if (this.atMat(p, R)) return { kind: 'room', what: 'leave', R, label: 'Leave', hint: 'Back outside' };
    return null;
  }
  use(th, p) {
    if (th.what === 'enter') this.enter(p, th.d);
    else if (th.what === 'leave') this.leave(p);
    else if (th.what === 'chest') this.openChest(p, th.R, th.c);
  }
  // the phone's line while you're indoors
  hint(p) {
    const R = this.inside(p);
    if (!R) return null;
    return { hint: '{place}: rest a while — and at night, sleep in a bed', vars: { place: t(R.def.name) } };
  }

  // a room's chest: something for each of you, once a day
  openChest(p, R, c) {
    const P = this.P, e = c.entry, x = c.x + R.ox, z = c.z + R.oz;
    const key = (p.roomExit ? p.roomExit.key : R.id) + '|' + p.slot + '|' + P.state.day;
    if (this.looted.has(key)) {
      P.toast(t('{name}: nothing new in there today — come back tomorrow!', { name: p.name }), p.color);
      audio.sfx('error', { volume: 0.4 });
      return;
    }
    this.looted.add(key);
    if (e) e.openT = 2.4;
    audio.sfx('unlock');
    audio.jingle('shard');
    P.world.fx.emit('sparkle', x, 1.0, z, 18, { color: '#ffd66b' });
    P.world.fx.emit('ring', x, 0.1, z, 1, { color: '#ffd66b' });
    if (P.progress) { P.progress.give(p, false, 1); P.progress.addDust(p, 8); }
    if (P.combat && p.fighter) P.combat.gainXp(p, 15);
    P.buzz(p, [30, 40, 60]);
  }

  // ------------------------------------------------------------------ frame
  update(dt) {
    const P = this.P, open = this.open();
    for (const R of this.list) R.busy = false;
    for (const p of P.players) {
      const R = this.inside(p), v = p.input.moveVector();
      p.indoors = !!R;
      if (R) {
        R.busy = true;
        // (the valley needs everyone now: out you go)
        if (!open) { this.leave(p); continue; }
        // cosy: your breath comes back
        const f = p.fighter;
        if (f && !f.down && f.hp < f.maxHp) {
          f.hp = Math.min(f.maxHp, f.hp + f.maxHp * HEAL * dt);
          if (Math.random() < dt * 0.8) P.world.fx.emit('heart', p.pos.x, 1.5, p.pos.z, 1);
        }
        // walking down onto the mat takes you out
        if (this.canUse(p) && v.y > 0.5 && this.atMat(p, R)) { p.doorPush = (p.doorPush || 0) + dt; if (p.doorPush > 0.2) this.leave(p); }
        else p.doorPush = 0;
        continue;
      }
      // walking up into a door takes you in
      const d = open && v.y < -0.5 && this.canUse(p) ? this.doorNear(p) : null;
      if (d && !this.fighting(p)) { p.doorPush = (p.doorPush || 0) + dt; if (p.doorPush > 0.2) this.enter(p, d); }
      else p.doorPush = 0;
    }
    // the rooms someone's in: flickering fires, little animations, chest lids
    for (const R of this.list) {
      if (!R.busy) continue;
      for (const l of R.lights) if (l.flicker) l.power = l.base * (0.85 + Math.sin(P.t * 13 + R.ox) * 0.08 + Math.sin(P.t * 7.3) * 0.07);
      for (const an of R.room.anims) an(P.t, ACTX);
      R.room.updateSun(P.state.hour, P.state.weather);
      for (const f of R.room.furniture) {
        if (!f.lid) continue;
        if (f.openT > 0) f.openT -= dt;
        const to = f.openT > 0 ? -1.25 : 0;
        f.lid.rotation.x += (to - f.lid.rotation.x) * Math.min(1, dt * 10);
        if (f.shine) f.shine.visible = f.openT > 0.3;
      }
    }
  }

  // ------------------------------------------------------------------ light (per view)
  // Before the views are drawn: which shows a room, and the outdoors as the
  // day made it (to put back after a room's view).
  beginDraw(views) {
    this.vr.clear();
    let any = false, all = true;
    for (const v of views) { const R = (this.P.dungeons && this.P.dungeons.roomOf(v.members)) || this.roomOf(v.members); if (R) { this.vr.set(v, R); any = true; } else all = false; }
    this.allIn = any && all;
    this.dirty = false;
    if (!any) return;
    const r = this.P.r3d, L = this.P.lighting, u = r.post.uniforms;
    const o = this.out || (this.out = { hemi: new THREE.Color(), gnd: new THREE.Color(), sun: new THREE.Color(), dir: new THREE.Vector3(), grade: new THREE.Vector3() });
    o.hemi.copy(r.hemi.color); o.gnd.copy(r.hemi.groundColor); o.hi = r.hemi.intensity;
    o.sun.copy(r.sun.color); o.si = r.sun.intensity; o.dir.copy(r.sunDir);
    o.glow = L.glowMat.opacity; o.lamps = L.lampLevel;
    o.grade.copy(u.grade.value); o.vig = u.vignette.value; o.sat = u.sat.value;
  }

  // light a view: a room's like an interior (true), the outdoors as it was (false)
  light(v) {
    const R = this.vr.get(v);
    if (!R) { if (this.dirty) this.restore(); return false; }
    const P = this.P, r = P.r3d, L = P.lighting, o = this.out;
    if (R.dungeon) R.focus = { x: v.cx, z: v.cz };     // (a dungeon is big: light around the view)
    const S = L.sources;
    L.sources = R.lights;
    // (an outdoor instance: daylight at its own hour; a dark place: lit like an interior)
    if (R.room.def.outdoor) L.hour = L.updateInstance(R.room.def.hour, R.focus, { mats: false });
    else L.updateIndoor(P.state.hour, R.focus, R.room);
    L.sources = S;
    this.dirty = true;
    if (!this.allIn) {
      // (the colour grade is the outdoors' for the whole screen: this view's
      // lights make up the difference)
      const u = r.post.uniforms, g = u.grade.value;
      const kr = g.x / o.grade.x, kg = g.y / o.grade.y, kb = g.z / o.grade.z;
      for (const c of [r.hemi.color, r.hemi.groundColor, r.sun.color]) { c.r *= kr; c.g *= kg; c.b *= kb; }
      for (const l of L.pool) if (l.intensity > 0) { l.color.r *= kr; l.color.g *= kg; l.color.b *= kb; }
      g.copy(o.grade); u.vignette.value = o.vig; u.sat.value = o.sat;
    }
    return true;
  }

  restore() {
    const r = this.P.r3d, L = this.P.lighting, o = this.out;
    r.hemi.color.copy(o.hemi); r.hemi.groundColor.copy(o.gnd); r.hemi.intensity = o.hi;
    r.sun.color.copy(o.sun); r.sun.intensity = o.si; r.sunDir.copy(o.dir);
    L.glowMat.opacity = o.glow; L.lampLevel = o.lamps;
    this.dirty = false;
  }

  endDraw() { if (this.dirty) this.restore(); }

  // ------------------------------------------------------------------ the big screen
  drawLabels(ctx, v) {
    const P = this.P;
    if (P.busy || !this.open()) return;
    const R = this.vr.get(v);
    if (R) {
      // the room's name under its doorstep, for a moment after someone comes in
      // (the top of the screen is the banners')
      const age = P.t - R.t;
      if (age > 3.4) return;
      const u = P.toUi(v, R.ox + R.def.w / 2, 0, R.oz + R.def.d + 0.75);
      ctx.globalAlpha = Math.max(0, Math.min(1, (3.4 - age) * 2));
      drawText(ctx, t(R.def.name), u.x, u.y, { color: '#fff3c4', align: 'center', outline: '#3b2a2e', scale: 2 });
      ctx.globalAlpha = 1;
      return;
    }
    // a door someone's standing by: its name above it, and a little ▲
    for (const d of this.doors) {
      if (!P.players.some((p) => p.connected && !p.indoors && Math.abs(p.pos.x - d.x) < 2.4 && Math.abs(p.pos.z - d.z) < 2.2)) continue;
      const u = P.toUi(v, d.x, 2.1, d.z - 0.4), nm = t(INTERIORS[d.room].name), tw = measure(nm) + 6;
      const x = Math.round(u.x - tw / 2), y = Math.round(u.y - 10);
      ctx.fillStyle = 'rgba(30,20,36,0.62)'; ctx.fillRect(x, y, tw, 10);
      drawText(ctx, nm, u.x, y + 1, { color: '#fff7e6', align: 'center' });
      const bob = Math.round(Math.sin(P.t * 4) * 1), X = Math.round(u.x), Y = y - 5 + bob;
      ctx.fillStyle = '#241a2e'; ctx.fillRect(X - 3, Y + 1, 7, 3); ctx.fillRect(X - 2, Y, 5, 1); ctx.fillRect(X - 1, Y - 1, 3, 1);
      ctx.fillStyle = '#ffd66b'; ctx.fillRect(X - 2, Y + 2, 5, 1); ctx.fillRect(X - 1, Y + 1, 3, 1); ctx.fillRect(X, Y, 1, 1);
    }
  }

  dispose() {
    for (const p of this.P.players) if (this.inside(p)) this.leave(p);
    for (const R of this.list) { R.room.root.visible = false; if (R.keeper && this.P.npcs.includes(R.keeper)) this.P.removeNpc(R.keeper.id); R.keeper = null; }
    this.list = [];
    if (this.col.rooms === this) this.col.rooms = null;
    this.P.cam.roomOf = null;
  }
}
