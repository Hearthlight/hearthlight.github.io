// Campfires (Party Mode's free roam). Anyone lights one from the phone (the
// Campfire button in the evening, or the menu; the host menu for keyboard
// players): it crackles, lights the night, warms and slowly heals whoever
// stays close — sit still and you sit down by it. At night, A by a fire =
// Sleep. Once everyone is asleep by a fire (each group by its own), the
// night flies by: the screen fades out, the fires burn down, and it's a new
// morning with everyone rested. The gloom close by wakes the sleepers up.
// Indoors (Party Mode's rooms), a bed does as well as a fire.

import { buildProp } from '../models/props.js';
import { THREE } from '../render/r3d.js';
import { audio } from '../engine/audio.js';
import { drawText, measure } from '../engine/font.js';
import { panel, UI } from '../ui/ui.js';
import { TT } from '../world/tiles.js';
import { t } from '../i18n.js';

const NIGHT = (h) => h >= 19.5 || h < 6;
const EVENING = (h) => h >= 17.5 || h < 6;
const REACH = 2.4;            // close enough to feel the warmth (and sleep)
const MAX = 4;                // fires burning at once (a new one puts out the oldest)
const BURN = 360;             // seconds a fire burns
const WET = new Set([TT.WATER, TT.CORAL, TT.LAVA, TT.SKY, TT.CREVASSE]);

export class Campfires {
  constructor(party) {
    this.party = party;
    this.list = [];
    this.root = new THREE.Group();
    party.world.over.root.add(this.root);
    this.night = null;          // the night flying by: { stage: fade | dark | dawn, t }
    this.allT = 0;
  }

  get world() { return this.party.world; }
  live() { return this.party.players.filter((p) => p.connected && !(p.fighter && p.fighter.down)); }
  burning() { return this.list.filter((f) => f.life > 0); }
  near(p, r = REACH) {
    let best = null, bd = r;
    for (const f of this.list) { const d = Math.hypot(f.x - p.pos.x, f.z - p.pos.z); if (f.life > 0 && d < bd) { bd = d; best = f; } }
    return best;
  }
  // somewhere to sleep: a fire within reach, or a bed indoors (rooms.js)
  rest(p) { const R = this.party.rooms; return this.near(p) || (R && R.bedNear(p)) || null; }
  gloomNear(p, r) {
    const C = this.party.combat;
    return !!(C && C.enemies.some((e) => e.alive && e.hurtable && Math.hypot(e.x - p.pos.x, e.z - p.pos.z) < r));
  }
  // free roam only (the story's evenings are the story's)
  // (out in the open: not inside a dungeon instance)
  roaming() { const P = this.party; return P.exploring() && (!P.act.stage || P.act.stage === 'roam') && !(P.dungeons && P.dungeons.cur); }
  canSleep() { return this.roaming() && NIGHT(this.party.state.hour); }

  // ------------------------------------------------------------------ lighting one
  // a step ahead of p, on dry open ground (or null)
  spotFor(p) {
    const w = this.world, col = w.overCol, B = this.party.big, d = p.actor.dir || { x: 0, z: 1 };
    const a0 = Math.atan2(d.z, d.x);
    for (const r of [1.6, 2.1, 1.2]) for (const k of [0, 1, -1, 2, -2, 3, -3, 4]) {
      const a = a0 + k * 0.6, x = p.pos.x + Math.cos(a) * r, z = p.pos.z + Math.sin(a) * r;
      if (WET.has(w.tileAt(x, z)) || (B && B.onDeck && B.onDeck(x, z)) || col.blocked(x, z, 0.55)) continue;
      return { x, z };
    }
    return null;
  }

  // why p can't light a fire right now (null: go ahead)
  why(p) {
    if (!this.party.exploring() || this.night) return 'Not now!';
    if (p.indoors) return 'Not indoors!';
    if (p.vehicle || p.mount || p.swimming || p.dive || p.sleeping) return 'Find some dry ground first!';
    if (this.gloomNear(p, 10)) return 'Not with the gloom around!';
    if (this.near(p, 3)) return 'There’s a fire right here!';
    if (!this.spotFor(p)) return 'Find some dry ground first!';
    return null;
  }

  build(p) {
    const P = this.party, why = this.why(p);
    if (why) { P.toast(t(why), p.color); P.buzz(p, 30); audio.sfx('error', { volume: 0.4 }); return null; }
    const s = this.spotFor(p);
    while (this.burning().length >= MAX) this.douse(this.burning()[0]);
    const b = buildProp(P.r3d, { type: 'campfire', x: s.x, y: s.z });
    const f = {
      x: s.x, z: s.z, obj: b.obj, flames: b.fire[0], life: BURN, t: 0,
      light: { x: s.x, y: 0.7, z: s.z + 0.2, color: 0xff8a3a, power: 2.2, dist: 9, lamp: true },
      col: { x: s.x, z: s.z, r: 0.55 },
    };
    f.obj.scale.setScalar(0.01);
    this.root.add(f.obj);
    P.lighting.sources.push(f.light);
    this.world.overCol.add(f.col);
    this.list.push(f);
    p.actor.face(s.x, s.z);
    audio.sfx('crackle', { volume: 0.9 }); audio.sfx('poof', { volume: 0.35 });
    P.world.fx.emit('flash', s.x, 0.4, s.z, 1, { color: '#ffb040' });
    P.world.fx.emit('sparkle', s.x, 0.6, s.z, 14, { color: '#ffb040' });
    P.toast(t('{name} lights a campfire', { name: p.name }), p.color);
    P.buzz(p, 25);
    return f;
  }

  douse(f) { if (f) f.life = Math.min(f.life, 0); }

  remove(f) {
    this.root.remove(f.obj);
    const S = this.party.lighting.sources, i = S.indexOf(f.light);
    if (i >= 0) S.splice(i, 1);
    this.world.overCol.remove(f.col);
    this.list = this.list.filter((q) => q !== f);
  }

  // ------------------------------------------------------------------ sleeping
  sleep(p, f) {
    const a = p.actor;
    p.sleeping = true; p.frozen = true; a.sleeping = true; a.sitting = false; p.campSit = false;
    a.expr = 'blink';
    if (f.bed) {
      // tucked up in bed, head on the pillow (a friend already in it: side by side)
      const n = this.party.players.filter((q) => q.bedSpot && q.bedSpot.bed === f.bed).length;
      p.bedSpot = { bed: f.bed, x: f.x, z: f.z, back: { x: a.pos.x, z: a.pos.z } };
      a.pos = { x: f.x + (n ? (n % 2 ? 0.26 : -0.26) : 0), z: f.z + 0.1 };
      p.bedY = 0.16;
      a.dir = { x: 0, z: 1 }; a.model.facing = a.model.targetFacing = 0;
    } else a.face(f.x, f.z);
    p.emote = 'zzz'; p.emoteT = 1e9;
    audio.sfx('snore', { volume: 0.4 });
    const L = this.live(), n = L.filter((q) => q.sleeping).length;
    if (n < L.length) this.party.toast(t(f.bed ? '{name} is tucked up in bed ({n}/{total})' : '{name} is sleeping by the fire ({n}/{total})', { name: p.name, n, total: L.length }), p.color);
  }

  wake(p) {
    if (!p.sleeping) return;
    const a = p.actor;
    p.sleeping = false; p.frozen = false; a.sleeping = false; a.expr = null;
    if (p.bedSpot) {
      // up, beside the bed (unless the party already moved on without us)
      const b = p.bedSpot;
      if (Math.hypot(a.pos.x - b.x, a.pos.z - b.z) < 1) a.pos = { x: b.back.x, z: b.back.z };
      p.bedSpot = null; p.bedY = null;
    }
    if (p.emote === 'zzz') { p.emote = null; p.emoteT = 0; }
    a.jumpV = 2.4;
  }

  wakeAll() { for (const p of this.party.players) this.wake(p); }

  // A by a fire at night: sleep; A, B or the stick while asleep: wake up
  handleInput() {
    const P = this.party;
    if (this.night || P.busy || P.dialogue.active || P.vote) return;
    const ok = this.canSleep();
    for (const p of P.players) {
      if (!p.connected) continue;
      const inp = p.input;
      const eat = () => { for (const k of ['a', 'interact', 'b', 'jump']) inp.edges.delete(k); };
      if (p.sleeping) {
        const v = inp.moveVector();
        if (inp.pressed('a') || inp.pressed('b') || Math.hypot(v.x, v.y) > 0.6) { eat(); this.wake(p); }
        continue;
      }
      if (!ok || p.vehicle || p.mount || p.swimming || (p.fighter && p.fighter.down) || !(inp.pressed('a') || inp.pressed('interact'))) continue;
      const f = this.rest(p);
      if (!f) continue;
      eat();
      if (this.gloomNear(p, 10)) { P.toast(t('Not with the gloom around!'), p.color); continue; }
      this.sleep(p, f);
    }
  }

  // ------------------------------------------------------------------ frame
  update(dt, frozen) {
    const P = this.party, now = P.t;
    // (another activity, back to the lobby: the fires go out, the sleepers get up)
    if (!P.exploring() && !this.night) {
      for (const f of this.list) this.douse(f);
      if (P.players.some((p) => p.sleeping || p.campSit)) for (const p of P.players) { this.wake(p); if (p.campSit) { p.campSit = false; p.actor.sitting = false; } }
    }
    // the fires: grow in, flicker, burn down, smoulder, go
    for (const f of [...this.list]) {
      f.t += dt;
      if (!frozen) f.life -= dt;
      const grow = Math.min(1, f.t * 3), k = f.life > 30 ? 1 : f.life > 0 ? 0.3 + 0.7 * (f.life / 30) : 0;
      f.obj.scale.setScalar(Math.max(0.01, grow) * 1.25);
      f.flames.visible = f.life > 0;
      f.flames.scale.set(k * (1 + Math.sin(now * 13 + f.x) * 0.07), k * (1 + Math.sin(now * 17 + f.z) * 0.14), k);
      f.light.power = 2.2 * k * (0.88 + Math.sin(now * 11 + f.x * 3) * 0.12);
      if (f.life > 0 && Math.random() < dt * 6 * k) P.world.fx.emit('sparkle', f.x + (Math.random() - 0.5) * 0.3, 0.75, f.z + (Math.random() - 0.5) * 0.3, 1, { color: Math.random() < 0.5 ? '#ffb040' : '#ffd66b' });
      if (f.life <= 0 && Math.random() < dt * 1.4) P.world.fx.emit('smoke', f.x, 0.35, f.z, 1);
      if (f.life < -14) this.remove(f);
    }
    this.updateNight(dt);
    if (frozen || this.night) return;
    // by the fire: warm (slow healing out of a fight), sit down when you stand still
    const nearFire = this.list.some((f) => f.life > 0 && P.players.some((p) => Math.hypot(f.x - p.pos.x, f.z - p.pos.z) < REACH + 3));
    for (const p of P.players) {
      const a = p.actor, f = !p.vehicle && !p.mount && !p.swimming ? this.near(p) : null;
      const calm = f && !this.gloomNear(p, 10);
      if (calm && p.fighter && !p.fighter.down && p.fighter.hp < p.fighter.maxHp) {
        p.fighter.hp = Math.min(p.fighter.maxHp, p.fighter.hp + p.fighter.maxHp * 0.04 * dt);
        if (Math.random() < dt * 0.8) P.world.fx.emit('heart', p.pos.x, 1.5, p.pos.z, 1);
      }
      if (p.sleeping) {
        if (p.bedSpot) { if (Math.random() < dt * 0.25) audio.sfx('snore', { volume: 0.25 }); continue; }
        if (this.gloomNear(p, 7)) { this.wakeAll(); P.toast(t('The gloom! Everyone up!'), '#ec5f73'); for (const q of P.players) P.buzz(q, [60, 40, 60]); break; }
        if (!f && !this.near(p, REACH + 1)) this.wake(p);       // the fire went out
        else if (Math.random() < dt * 0.25) audio.sfx('snore', { volume: 0.25 });
        continue;
      }
      p.campIdle = calm && !a.moving && !a.airborne ? (p.campIdle || 0) + dt : 0;
      if (p.campIdle > 1.2 && !p.campSit) { p.campSit = true; a.sitting = true; a.face(f.x, f.z); }
      else if (p.campSit && (a.moving || !calm)) { p.campSit = false; a.sitting = false; }
    }
    this.fireAmb = nearFire ? Math.min(1, (this.fireAmb || 0) + dt) : Math.max(0, (this.fireAmb || 0) - dt);
    // everyone asleep (each by a fire): the night flies by
    const L = this.live();
    if (L.length && L.every((p) => p.sleeping)) { this.allT += dt; if (this.allT > 1.6) this.startNight(); } else this.allT = 0;
  }

  startNight() {
    const P = this.party;
    // (the solo game sleeps its own way: a new day, saved, waking by the fire)
    if (P.sleepHere) { this.allT = 0; P.sleepHere(); return; }
    this.night = { stage: 'fade', t: 0 };
    this.allT = 0;
    P.busy++;
    P.fadeTo(1, 1.6);
    audio.jingle('sleep');
  }

  updateNight(dt) {
    const P = this.party, N = this.night;
    if (!N) return;
    N.t += dt;
    if (N.stage === 'fade' && (P.fade >= 1 || N.t > 4)) { N.stage = 'dark'; N.t = 0; this.morning(); }
    else if (N.stage === 'dark' && N.t > 2.6) {
      N.stage = 'dawn'; N.t = 0;
      P.fadeTo(0, 1.4);
      this.wakeAll();
      audio.jingle('newDay');
      P.showBanner(t('Good morning!'), t('Day {n} · everyone slept like a log', { n: P.state.day }));
    } else if (N.stage === 'dawn' && (P.fade <= 0 || N.t > 4)) { this.night = null; P.busy = Math.max(0, P.busy - 1); }
  }

  // the night went by: a new day, rested heroes, the fires burnt down to embers
  morning() {
    const P = this.party, s = P.state;
    if (s.hour >= 12) s.day++;          // (after midnight, the clock already turned the day)
    s.hour = 6.6;
    for (const p of P.players) if (p.fighter && !p.fighter.down) p.fighter.hp = p.fighter.maxHp;
    for (const f of this.list) f.life = Math.min(f.life, -4);
  }

  // ------------------------------------------------------------------ the phone
  ctxFor(p, base) {
    if (this.night) return { a: null, b: null, x: null, y: null, hint: 'Zzz… the night flies by' };
    if (p.sleeping) {
      const awake = this.live().filter((q) => !q.sleeping);
      return awake.length
        ? { a: 'Wake up', b: null, x: null, y: null, hint: p.bedSpot ? 'Zzz… waiting for {names} to go to sleep' : 'Zzz… waiting for {names} to sleep by a fire', vars: { names: awake.map((q) => q.name).join(', ') } }
        : { a: 'Wake up', b: null, x: null, y: null, hint: 'Zzz…' };
    }
    if (p.vehicle || p.mount || p.swimming || !this.roaming()) return null;
    const f = this.rest(p), out = { ...base };
    if (f && this.canSleep() && !this.gloomNear(p, 10)) { out.a = 'Sleep'; out.hint = f.bed ? 'Sleep in the bed: once everyone sleeps, the night flies by' : 'Sleep by the fire: once everyone sleeps, the night flies by'; out.vars = null; }
    else if (!f && !p.indoors && EVENING(this.party.state.hour) && !this.near(p, 3) && !this.gloomNear(p, 10)) out.camp = 1;
    return out;
  }

  // ------------------------------------------------------------------ the big screen
  drawUi(ctx) {
    const P = this.party, W = P.display.w, H = P.display.h;
    this.cardRect = null;
    if (this.night && this.night.stage !== 'dawn') {
      const a = this.night.stage === 'dark' ? Math.min(1, this.night.t * 2) : Math.max(0, (P.fade - 0.6) / 0.4);
      ctx.globalAlpha = a;
      drawText(ctx, t('The night flies by…'), W / 2, Math.round(H * 0.42), { color: '#fff3c4', align: 'center', scale: 2, outline: '#3b2a2e' });
      const z = 'Z z z'.slice(0, 1 + Math.floor(P.t * 3) % 5);
      drawText(ctx, z, W / 2, Math.round(H * 0.42) + 26, { color: '#9fb2ff', align: 'center', outline: '#241a2e' });
      ctx.globalAlpha = 1;
      return;
    }
    // some asleep, some not: who are we waiting for?
    const L = this.live(), zz = L.filter((p) => p.sleeping);
    if (!zz.length || zz.length === L.length) return;
    const awake = L.filter((p) => !p.sleeping).map((p) => p.name).join(', ');
    const line1 = t(zz.some((p) => p.bedSpot) ? 'Zzz… {n}/{total} asleep' : 'Zzz… {n}/{total} asleep by the fire', { n: zz.length, total: L.length });
    const line2 = t('Waiting for {names}', { names: awake });
    const w = Math.min(W - 12, Math.max(measure(line1), measure(line2)) + 20), h = 30;
    const { x, y } = P.topCard(w, h);
    panel(ctx, x, y, w, h);
    this.cardRect = { x, y, w, h };
    drawText(ctx, line1, x + w / 2, y + 7, { color: UI.ink, align: 'center' });
    drawText(ctx, line2, x + w / 2, y + 18, { color: '#8a5234', align: 'center', maxChars: 60 });
  }

  dispose() {
    for (const f of [...this.list]) this.remove(f);
    this.wakeAll();
    if (this.night) { this.night = null; this.party.busy = Math.max(0, this.party.busy - 1); }
    this.root.parent && this.root.parent.remove(this.root);
  }
}
