// Life in the big world's zones: each one has its music, its ambience, its
// weather (drawn per view, so a split screen shows every group's own sky),
// a colour wash, weather events (sandstorms, blizzards, gusts…) and a few
// playful mechanics: bouncy giant mushrooms, floaty clouds, lava embers,
// geysers, dust devils. First visits get a banner and are remembered.

import { TT } from '../world/tiles.js';
import { audio } from '../engine/audio.js';
import { t } from '../i18n.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const NIGHT = (h) => h >= 20 || h < 5.5;

// per zone: music, ambience, weather (day/night), colour wash, events
export const ZONE_FX = {
  valley: {},
  deepwood: { music: 'forest', amb: { birds: 0.7, wind: 0.15, crickets: 0 }, weather: ['leaves', 0.35], night: ['fireflies', 0.8], wash: ['#1e3a24', 0.06] },
  heights: { music: 'heights', amb: { birds: 0.35, wind: 0.55 }, weather: ['seeds', 0.4], night: ['stars', 0.5], wash: ['#e8dcff', 0.04, 'soft-light'], event: { kind: 'gust', every: [14, 24], dur: 2.8 } },
  bouncecap: { music: 'mushroom', amb: { birds: 0.2, crickets: 0.4, wind: 0.1 }, weather: ['spores', 0.7], night: ['spores', 1.2], wash: ['#6a3aa0', 0.08, 'soft-light'] },
  glacier: { music: 'glacier', amb: { birds: 0.05, wind: 0.6, crickets: 0 }, weather: ['snow', 0.55], night: ['aurora', 1], wash: ['#b8d8ff', 0.07, 'soft-light'], event: { kind: 'blizzard', every: [70, 110], dur: 16 } },
  cloud: { music: 'clouds', amb: { birds: 0.1, wind: 0.35 }, weather: ['sparkle', 0.8], night: ['stars', 1], wash: ['#7a8ad8', 0.035, 'multiply'] },
  steppe: { music: 'steppe', amb: { birds: 0.6, wind: 0.35, crickets: 0.2 }, weather: ['seeds', 0.5], night: ['fireflies', 0.4], wash: ['#ffd88a', 0.05, 'soft-light'] },
  canyon: { music: 'canyon', amb: { birds: 0.15, wind: 0.45 }, weather: ['dust', 0.35], night: ['stars', 0.6], wash: ['#ff9a5a', 0.06, 'soft-light'], devils: true },
  dunes: { music: 'desert', amb: { birds: 0, wind: 0.5 }, weather: ['heat', 0.6], night: ['stars', 0.8], wash: ['#ffcc70', 0.07, 'soft-light'], event: { kind: 'sandstorm', every: [70, 110], dur: 18 } },
  sunken: { music: 'sunken', amb: { waves: 0.6, birds: 0.15 }, weather: ['mist', 0.4], night: ['fireflies', 0.3], wash: ['#6ad0c8', 0.06, 'soft-light'] },
  lagoon: { music: 'lagoon', amb: { waves: 0.7, birds: 0.5 }, weather: ['sparkle', 0.35], night: ['stars', 0.6], wash: ['#8af0f0', 0.05, 'soft-light'] },
  straits: { music: 'straits', amb: { waves: 0.95, wind: 0.5 }, weather: ['spray', 0.5], night: ['stars', 0.4], wash: ['#284a80', 0.06, 'soft-light'], event: { kind: 'squall', every: [80, 120], dur: 20 } },
  marsh: { music: 'marsh', amb: { crickets: 0.7, birds: 0.2, waves: 0.1 }, weather: ['mist', 0.75], night: ['fireflies', 2.4], wash: ['#6a8a5a', 0.08, 'soft-light'], croak: true },
  volcano: { music: 'volcano', amb: { fire: 0.55, wind: 0.3, birds: 0 }, weather: ['ash', 0.7], night: ['ash', 0.9], wash: ['#ff4a1a', 0.07, 'soft-light'], embers: true },
  sea: { music: 'island', amb: { waves: 0.9, birds: 0.4 }, weather: ['spray', 0.2], night: ['stars', 0.5], wash: null },
  dino: { music: 'jungle', amb: { birds: 0.85, crickets: 0.35, waves: 0.25, wind: 0.1 }, weather: ['mist', 0.4], night: ['fireflies', 1.8], wash: ['#2a9a4a', 0.06, 'soft-light'], event: { kind: 'shower', every: [95, 140], dur: 16 } },
  // ---- World v7: the Wide Sea & the Dawnlands
  wide: { music: 'voyage', amb: { waves: 1, wind: 0.5, birds: 0.1 }, weather: ['spray', 0.35], night: ['stars', 0.8], wash: ['#1c3c6c', 0.05, 'soft-light'], event: { kind: 'squall', every: [90, 140], dur: 18 } },
  whale: { music: 'whale', amb: { waves: 0.8, birds: 0.5 }, weather: ['spray', 0.2], night: ['stars', 0.7], wash: null },
  harbor: { music: 'harbor', amb: { waves: 0.5, birds: 0.6 }, weather: ['spray', 0.12], night: ['fireflies', 0.5], wash: ['#ffd8a0', 0.035, 'soft-light'] },
  jade: { music: 'jade', amb: { birds: 0.6, waves: 0.15, wind: 0.2 }, weather: ['mist', 0.7], night: ['fireflies', 1.2], wash: ['#7ad0a0', 0.05, 'soft-light'] },
  salt: { music: 'salt', amb: { wind: 0.45, birds: 0.1 }, weather: ['sparkle', 0.5], night: ['stars', 1.4], wash: ['#e8f0ff', 0.06, 'soft-light'] },
  autumn: { music: 'autumn', amb: { birds: 0.5, wind: 0.3, crickets: 0.2 }, weather: ['leaves', 0.8], night: ['fireflies', 0.6], wash: ['#ff8a4a', 0.05, 'soft-light'] },
  glow: { music: 'glow', amb: { waves: 0.6, crickets: 0.5, birds: 0.2 }, weather: ['mist', 0.3], night: ['fireflies', 2.8], wash: ['#2a8a9a', 0.06, 'soft-light'] },
  elder: { music: 'elder', amb: { birds: 0.8, wind: 0.2, waves: 0.15 }, weather: ['leaves', 0.3], night: ['fireflies', 1.6], wash: ['#3a6a3a', 0.06, 'soft-light'] },
  moor: { music: 'moor', amb: { wind: 0.6, birds: 0.15, crickets: 0.1 }, weather: ['mist', 0.9], night: ['fireflies', 0.3], wash: ['#6a5a7a', 0.08, 'soft-light'], event: { kind: 'drizzle', every: [80, 130], dur: 16 } },
  prism: { music: 'prism', amb: { wind: 0.2, birds: 0.3, fire: 0.12 }, weather: ['mist', 0.5], night: ['stars', 1], wash: ['#ffe0a0', 0.05, 'soft-light'] },
  clock: { music: 'clock', amb: { birds: 0.45, wind: 0.4 }, weather: ['seeds', 0.3], night: ['stars', 1.1], wash: ['#ffe8b0', 0.04, 'soft-light'], event: { kind: 'gust', every: [16, 28], dur: 2.6 } },
  tundra: { music: 'tundra', amb: { wind: 0.7, birds: 0.05 }, weather: ['snow', 0.4], night: ['aurora', 1.4], wash: ['#a8e0e0', 0.06, 'soft-light'], event: { kind: 'blizzard', every: [90, 140], dur: 14 } },
  scar: { music: 'scar', amb: { wind: 0.5, fire: 0.2 }, weather: ['ash', 0.5], night: ['ash', 0.8], wash: ['#6a2aa0', 0.1, 'soft-light'] },
};
const EVENTS = {
  gust: { name: 'A gust of wind!', sub: '' },
  blizzard: { name: 'Blizzard!', sub: 'the snow comes down sideways' },
  sandstorm: { name: 'Sandstorm!', sub: 'stick together until it passes', solo: 'hold on until it passes' },
  squall: { name: 'A squall blows in!', sub: 'hold on to your hats', solo: 'hold on to your hat' },
  shower: { name: 'A tropical shower!', sub: 'the ferns drink it all up' },
  drizzle: { name: 'A Highland drizzle!', sub: 'the heather drinks it all up' },
};

export class ZoneRuntime {
  constructor(party) {
    this.party = party;
    this.pools = new Map();          // view id -> weather particles
    this.events = {};                // zone id -> { kind, t, dur, next, dir }
    this.seenBy = new Map();         // player slot -> zone id
    this.embers = [];
    this.devils = [];
    this.fx = {};
    this.save = party.loadSave('world', {}) || {};
    this.save.zones = this.save.zones || [];
  }

  get big() { return this.party.big; }
  zoneIdAt(x, z) { return this.big ? this.big.zoneAt(x, z).id : 'valley'; }
  fxOf(id) { return ZONE_FX[id] || {}; }

  store() { this.party.writeSave('world', this.save); }

  // ------------------------------------------------------------------ frame
  update(dt) {
    const P = this.party;
    if (!this.big) return;
    const hour = P.state.hour;
    // first visits & arrivals (friends arriving together get one line)
    const arrivals = new Map();
    for (const p of P.players) {
      if (!p.connected) continue;
      const id = this.zoneIdAt(p.pos.x, p.pos.z);
      const was = this.seenBy.get(p.slot);
      if (id === was) continue;
      this.seenBy.set(p.slot, id);
      if (!was || id === 'valley' || id === 'sea' || (P.act && P.act.quietZones)) continue;
      const zone = this.big.zoneAt(p.pos.x, p.pos.z);
      if (!this.save.zones.includes(id)) {
        this.save.zones.push(id);
        this.store();
        P.showBanner(t(zone.name), t('★ New place discovered ★'));
        audio.jingle('questStart');
        P.world.fx.emit('sparkle', p.pos.x, 1.4, p.pos.z, 14, { color: '#fff3a6' });
      } else if (!(P.travel && P.travel.going)) {       // (a waystone trip has its own banner)
        if (!arrivals.has(id)) arrivals.set(id, { zone, ps: [] });
        arrivals.get(id).ps.push(p);
      }
    }
    const here = P.players.filter((p) => p.connected).length;
    for (const { zone, ps } of arrivals.values()) {
      const place = t(zone.name);
      if (P.solo) { P.showBanner(place, ''); continue; }      // (the solo game names places with a banner)
      if (ps.length === 1) P.toast(t('{name} reached {place}', { name: ps[0].name, place }), ps[0].color);
      else if (ps.length === here) P.toast(t('Everyone reached {place}', { place }), '#fff3c4');
      else P.toast(t('{names} reached {place}', { names: ps.map((p) => p.name).join(', '), place }), ps[0].color);
    }
    // weather events per zone that has someone in it
    const occupied = new Set(P.players.filter((p) => p.connected).map((p) => this.zoneIdAt(p.pos.x, p.pos.z)));
    for (const id of occupied) {
      const E = this.fxOf(id).event;
      if (!E) continue;
      let ev = this.events[id];
      if (!ev) ev = this.events[id] = { kind: E.kind, t: 0, dur: 0, next: rnd(E.every[0], E.every[1]) * 0.5, dir: { x: 1, z: 0 } };
      if (ev.t > 0) { ev.t -= dt; if (ev.t <= 0) ev.next = rnd(E.every[0], E.every[1]); }
      else if ((ev.next -= dt) <= 0) {
        ev.t = ev.dur = E.dur;
        const a = id === 'heights' ? rnd(-0.5, 0.5) : rnd(0, Math.PI * 2);
        ev.dir = { x: Math.cos(a), z: Math.sin(a) * 0.6 };
        if (ev.kind !== 'gust') { P.showBanner(t(EVENTS[ev.kind].name), t((P.solo && EVENTS[ev.kind].solo) || EVENTS[ev.kind].sub)); audio.sfx('thunder', { volume: ev.kind === 'squall' ? 0.6 : 0.3 }); }
        audio.sfx('gust', { volume: 0.8 });
        for (const p of P.players) if (this.zoneIdAt(p.pos.x, p.pos.z) === id) P.buzz(p, [40, 30, 40]);
      }
    }
    this.mechanics(dt, hour);
  }

  // what the weather does to someone standing in it
  eventAt(x, z) { const ev = this.events[this.zoneIdAt(x, z)]; return ev && ev.t > 0 ? ev : null; }

  mechanics(dt, hour) {
    const P = this.party, w = P.world, C = P.combat;
    for (const p of P.players) {
      p.actor.zoneSlow = 1;
      if (!p.connected || p.hidden) continue;
      const a = p.actor, x = p.pos.x, z = p.pos.z;
      const tile = w.tileAt(x, z), id = this.zoneIdAt(x, z);
      // pushy weather: gusts, blizzards, squalls
      const ev = this.eventAt(x, z);
      if (ev && ev.kind !== 'shower' && ev.kind !== 'drizzle') {
        const k = ev.kind === 'gust' ? Math.sin(Math.PI * (1 - ev.t / ev.dur)) * 2.6 : ev.kind === 'sandstorm' ? 0.5 : 1.1;
        w.overCol.move(a.pos, ev.dir.x * k * dt, ev.dir.z * k * dt, a.radius);
        if (ev.kind === 'sandstorm' || ev.kind === 'blizzard') a.zoneSlow = 0.8;
      }
      // tar pits: slow, sticky going (and the odd bubble)
      if (tile === TT.TAR && !a.airborne && !p.mount && !p.vehicle) {
        a.zoneSlow = Math.min(a.zoneSlow, 0.5);
        if (a.moving && Math.random() < dt * 3) w.fx.emit('smoke', x + rnd(-0.2, 0.2), 0.1, z + 0.1, 1, { color: '#2a2234' });
        if (Math.random() < dt * 0.6) audio.sfx('blub', { volume: 0.3 });
      }
      // floaty clouds: you fall slowly up here
      if (tile === TT.CLOUD && a.airborne && a.jumpV < 2) a.jumpV += 11 * dt;
      // the heights' updrafts at the cliff edge lift a jumper a little
      void id;
    }
    // lava spits embers onto the ground nearby (a warning, then a hot little splash)
    const volc = P.players.filter((p) => p.connected && this.zoneIdAt(p.pos.x, p.pos.z) === 'volcano');
    this.emberT = (this.emberT || 2) - dt;
    if (volc.length && this.emberT <= 0) {
      this.emberT = rnd(1.2, 2.6) / Math.min(3, volc.length);
      const p = volc[Math.floor(Math.random() * volc.length)];
      const lava = this.findTile(p.pos.x, p.pos.z, 7, TT.LAVA);
      if (lava) {
        const tx = p.pos.x + rnd(-2.5, 2.5), tz = p.pos.z + rnd(-2, 2);
        if (w.tileAt(tx, tz) !== TT.LAVA) { this.embers.push({ fx: lava.x, fz: lava.z, x: tx, z: tz, t: 0, dur: 1.1 }); audio.sfx('blub', { volume: 0.5 }); }
      }
    }
    for (const e of this.embers) {
      e.t += dt;
      const k = Math.min(1, e.t / e.dur), x = e.fx + (e.x - e.fx) * k, z = e.fz + (e.z - e.fz) * k, y = 0.4 + Math.sin(k * Math.PI) * 2.4;
      if (Math.random() < 0.6) w.fx.emit('sparkle', x, y, z, 1, { color: Math.random() < 0.5 ? '#ffb040' : '#ff6a2a' });
      if (e.t >= e.dur && !e.done) {
        e.done = true;
        w.fx.emit('firework', e.x, 0.3, e.z, 10, { color: '#ff8a3a' });
        audio.sfx('sizzle', { volume: 0.6 });
        for (const q of P.players) {
          if (Math.hypot(q.pos.x - e.x, q.pos.z - e.z) > 0.9 || q.actor.jumpY > 0.6) continue;
          if (C && q.fighter) C.hurtPlayer(q, 6, { dir: { x: q.pos.x - e.x || 0.1, z: q.pos.z - e.z }, knock: 3 });
          else { q.actor.jumpV = 5; q.setEmote('exclaim', 1); }
          q.say(t('Hot hot hot!'), 1.4);
        }
      }
    }
    this.embers = this.embers.filter((e) => !e.done);
    // dust devils wander the canyon; walk into one for a spin
    const canyon = P.players.filter((p) => p.connected && this.zoneIdAt(p.pos.x, p.pos.z) === 'canyon');
    if (canyon.length && this.devils.length < 2 && Math.random() < dt * 0.08) {
      const p = canyon[Math.floor(Math.random() * canyon.length)];
      const a = Math.random() * Math.PI * 2;
      this.devils.push({ x: p.pos.x + Math.cos(a) * 9, z: p.pos.z + Math.sin(a) * 6, vx: -Math.cos(a) * 1.4, vz: -Math.sin(a) * 1.0, life: 14, hit: new Set() });
    }
    for (const d of this.devils) {
      d.life -= dt; d.x += d.vx * dt; d.z += d.vz * dt;
      if (Math.random() < dt * 30) w.fx.emit('dust', d.x + rnd(-0.3, 0.3), rnd(0.1, 1.6), d.z + rnd(-0.2, 0.2), 1, { color: '#d9a878' });
      for (const q of P.players) {
        if (d.hit.has(q) || Math.hypot(q.pos.x - d.x, q.pos.z - d.z) > 0.8) continue;
        d.hit.add(q);
        q.actor.jumpV = 7.5; q.spinT = 1.2; q.setEmote('star', 1.2);
        audio.sfx('whoosh', { volume: 0.6 });
      }
    }
    this.devils = this.devils.filter((d) => d.life > 0);
    for (const p of P.players) if (p.spinT > 0) { p.spinT -= dt; p.actor.model.facing += dt * 24; p.actor.model.targetFacing = p.actor.model.facing; }
    // frogs, lava bubbles & ice: little sounds of the places
    this.sndT = (this.sndT || 3) - dt;
    if (this.sndT <= 0) {
      this.sndT = rnd(2.5, 5);
      const zs = new Set(P.players.filter((p) => p.connected).map((p) => this.zoneIdAt(p.pos.x, p.pos.z)));
      if (zs.has('marsh') && (NIGHT(hour) || Math.random() < 0.5)) audio.sfx('croak', { volume: 0.5 });
      if (zs.has('volcano') && Math.random() < 0.6) audio.sfx('blub', { volume: 0.35 });
      if (zs.has('glacier') && Math.random() < 0.3) audio.sfx('crackle', { volume: 0.4 });
      if (zs.has('dino')) { const q = Math.random(); if (q < 0.18) audio.sfx('roar', { volume: 0.16 }); else if (q < 0.4) audio.sfx('honk', { volume: 0.3 }); else if (q < 0.55) audio.sfx('screech', { volume: 0.25 }); else if (q < 0.7 && !NIGHT(hour)) audio.sfx('chirp', { volume: 0.3 }); }
    }
  }

  findTile(x, z, r, type) {
    const w = this.party.world;
    for (let k = 0; k < 24; k++) {
      const a = Math.random() * Math.PI * 2, d = rnd(1, r), tx = x + Math.cos(a) * d, tz = z + Math.sin(a) * d;
      if (w.tileAt(tx, tz) === type) return { x: tx, z: tz };
    }
    return null;
  }

  // jumping by a giant mushroom bounces you sky-high
  onJump(p) {
    const B = this.big;
    if (!B || this.zoneIdAt(p.pos.x, p.pos.z) !== 'bouncecap') return false;
    const cap = B.nearestObject(p.pos.x, p.pos.z, 1.45, 'bigshroom');
    if (!cap) return false;
    p.actor.jumpV = 12.5;
    audio.sfx('boing', { volume: 0.8 });
    const w = this.party.world;
    w.fx.emit('sparkle', cap.x, 2.2, cap.y - 0.15, 10, { color: '#f7a4e0' });
    w.fx.emit('sparkle', cap.x, 1.8, cap.y - 0.15, 6, { color: '#8ff0e8' });
    return true;
  }

  // the zone music & ambience for where most people are
  mood() {
    const P = this.party;
    const counts = new Map();
    for (const p of P.players) if (p.connected) { const id = this.zoneIdAt(p.pos.x, p.pos.z); counts.set(id, (counts.get(id) || 0) + 1); }
    let best = null, n = 0;
    for (const [id, k] of counts) if (k > n) { n = k; best = id; }
    return best ? this.fxOf(best) : null;
  }

  // ------------------------------------------------------------------ drawing (world layer, per view)
  drawView(ctx, v, dt) {
    if (!this.big) return;
    const P = this.party, hour = P.state.hour, night = NIGHT(hour);
    const id = this.zoneIdAt(v.cx, v.cz), Z = this.fxOf(id);
    const r = v.rect;
    // the colour wash
    if (Z.wash) {
      ctx.globalCompositeOperation = Z.wash[2] || 'source-over';
      ctx.globalAlpha = Z.wash[1] * (Z.wash[2] ? 4 : 1);
      ctx.fillStyle = Z.wash[0];
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    const ev = this.events[id] && this.events[id].t > 0 ? this.events[id] : null;
    let [kind, level] = (night && Z.night) || Z.weather || [null, 0];
    if (ev && ev.kind === 'sandstorm') { kind = 'sand'; level = 1.6; }
    else if (ev && ev.kind === 'blizzard') { kind = 'blizzard'; level = 1.5; }
    else if (ev && ev.kind === 'squall') { kind = 'rain'; level = 1.3; }
    else if (ev && (ev.kind === 'shower' || ev.kind === 'drizzle')) { kind = 'rain'; level = ev.kind === 'drizzle' ? 0.6 : 0.9; }
    else if (ev && ev.kind === 'gust') { kind = 'gust'; level = 1; }
    // hazes, then the weather through them
    if (ev && ev.kind === 'sandstorm') { const k = Math.min(1, Math.min(ev.dur - ev.t, ev.t) / 2); ctx.fillStyle = `rgba(214,160,90,${0.34 * k})`; ctx.fillRect(r.x, r.y, r.w, r.h); }
    if (ev && ev.kind === 'blizzard') { const k = Math.min(1, Math.min(ev.dur - ev.t, ev.t) / 2); ctx.fillStyle = `rgba(235,242,255,${0.3 * k})`; ctx.fillRect(r.x, r.y, r.w, r.h); }
    if (ev && ev.kind === 'squall') { ctx.fillStyle = 'rgba(40,50,80,0.16)'; ctx.fillRect(r.x, r.y, r.w, r.h); }
    this.drawWeather(ctx, v, kind, level, dt, ev);
    // embers & dust devils (world-space)
    for (const e of this.embers) {
      if (e.t > e.dur * 0.2) continue;
      const q = v.project(e.x, 0.05, e.z);
      if (!v.owns(q.x, q.y)) continue;
      ctx.fillStyle = Math.floor(P.t * 12) % 2 ? 'rgba(255,90,40,0.8)' : 'rgba(255,200,80,0.8)';
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; ctx.fillRect(Math.round(q.x + Math.cos(a) * 13), Math.round(q.y + Math.sin(a) * 9), 1, 1); }
    }
    for (const d of this.devils) {
      const q = v.project(d.x, 0, d.z);
      if (!v.owns(q.x, q.y)) continue;
      for (let i = 0; i < 14; i++) {
        const hy = i * 2.2, a = P.t * 9 + i * 0.7, rr = 2 + i * 0.55;
        ctx.fillStyle = i % 3 ? 'rgba(217,168,120,0.55)' : 'rgba(255,230,190,0.6)';
        ctx.fillRect(Math.round(q.x + Math.cos(a) * rr), Math.round(q.y - hy), 2, 1);
      }
    }
  }

  drawWeather(ctx, v, kind, level, dt, ev) {
    const r = v.rect;
    let pool = this.pools.get(v.id);
    if (!pool) this.pools.set(v.id, (pool = { kind: null, ps: [] }));
    if (!kind || level <= 0.01) { pool.ps.length = 0; pool.kind = null; return; }
    if (pool.kind !== kind) { pool.ps.length = 0; pool.kind = kind; }
    if (kind === 'aurora') { this.drawAurora(ctx, r); return; }
    const DENS = { snow: 0.0009, blizzard: 0.0028, leaves: 0.00022, seeds: 0.00018, spores: 0.0004, sparkle: 0.00025, dust: 0.0003, heat: 0.00012, mist: 0.00003, spray: 0.0002, fireflies: 0.00016, stars: 0.00012, ash: 0.0007, sand: 0.0026, rain: 0.0016, gust: 0.0007 };
    const want = Math.floor(r.w * r.h * (DENS[kind] || 0.0003) * level);
    const P = this.party, T = P.t;
    while (pool.ps.length < want) pool.ps.push({ x: Math.random() * r.w, y: Math.random() * r.h, s: 0.6 + Math.random() * 0.8, ph: Math.random() * 6.3, c: Math.random() });
    if (pool.ps.length > want) pool.ps.length = want;
    const dir = ev ? ev.dir : { x: 1, z: 0 };
    for (const f of pool.ps) {
      let vx = 0, vy = 0;
      switch (kind) {
        case 'snow': vy = 14 * f.s; vx = Math.sin(T * 1.1 + f.ph) * 6 - 2; break;
        case 'blizzard': vy = 30 * f.s; vx = dir.x * 110 * f.s + 20; break;
        case 'leaves': vy = 14 * f.s; vx = Math.sin(T * 1.1 + f.ph) * 14 + 8; break;
        case 'seeds': vy = Math.sin(T * 0.7 + f.ph) * 4; vx = 10 * f.s; break;
        case 'spores': vy = -6 * f.s; vx = Math.sin(T * 0.8 + f.ph) * 5; break;
        case 'dust': vy = Math.sin(T + f.ph) * 3; vx = 22 * f.s; break;
        case 'sand': vy = 8 * f.s; vx = (dir.x >= 0 ? 1 : -1) * 150 * f.s; break;
        case 'ash': vy = 10 * f.s; vx = Math.sin(T * 0.6 + f.ph) * 5 + 3; break;
        case 'rain': vy = 170 * f.s; vx = -40; break;
        case 'gust': vy = dir.z * 60; vx = dir.x * 190 * f.s; break;
        case 'spray': vy = -10 * f.s; vx = 16 * f.s; break;
        case 'mist': vx = 5 * f.s; break;
        default: break;
      }
      f.x += vx * dt; f.y += vy * dt;
      if (f.y > r.h + 6) { f.y = -6; f.x = Math.random() * r.w; }
      if (f.y < -8) { f.y = r.h + 4; f.x = Math.random() * r.w; }
      if (f.x > r.w + 40) { f.x = -30; f.y = Math.random() * r.h; }
      if (f.x < -40) { f.x = r.w + 30; f.y = Math.random() * r.h; }
      const x = Math.round(r.x + f.x), y = Math.round(r.y + f.y);
      if (v.half && !v.owns(x, y)) continue;
      switch (kind) {
        case 'snow': ctx.fillStyle = f.c < 0.5 ? '#ffffff' : '#dde6f4'; ctx.fillRect(x, y, f.c > 0.75 ? 2 : 1, f.c > 0.75 ? 2 : 1); break;
        case 'blizzard': ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(x, y, 3, 1); break;
        case 'leaves': { ctx.fillStyle = ['#d9543c', '#e8883a', '#8ab04a', '#eab83a'][Math.floor(f.c * 4)]; const flip = Math.sin(T * 4 + f.ph) > 0; ctx.fillRect(x, y, flip ? 2 : 1, flip ? 1 : 2); break; }
        case 'seeds': ctx.fillStyle = 'rgba(255,250,235,0.85)'; ctx.fillRect(x, y, 1, 1); if (f.c > 0.5) { ctx.fillRect(x - 1, y - 1, 1, 1); ctx.fillRect(x + 1, y - 1, 1, 1); } break;
        case 'spores': { const tw = 0.5 + 0.5 * Math.sin(T * 3 + f.ph); ctx.fillStyle = f.c < 0.5 ? `rgba(143,240,232,${0.4 + tw * 0.5})` : `rgba(247,164,224,${0.4 + tw * 0.5})`; ctx.fillRect(x, y, 1, 1); if (tw > 0.85) ctx.fillRect(x, y - 1, 1, 3); break; }
        case 'sparkle': case 'stars': { const tw = Math.sin(T * 2.5 + f.ph * 3); if (tw < 0.4) break; ctx.fillStyle = kind === 'stars' ? 'rgba(255,248,220,0.7)' : 'rgba(255,255,255,0.9)'; ctx.fillRect(x, y, 1, 1); if (tw > 0.93) { ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); } break; }
        case 'dust': ctx.fillStyle = 'rgba(230,180,130,0.45)'; ctx.fillRect(x, y, 2, 1); break;
        case 'heat': { const wv = Math.sin(T * 3 + f.ph) * 2; ctx.fillStyle = 'rgba(255,240,200,0.12)'; ctx.fillRect(x + wv, y, 14, 1); break; }
        case 'sand': ctx.fillStyle = f.c < 0.5 ? 'rgba(160,100,50,0.7)' : 'rgba(255,225,170,0.75)'; ctx.fillRect(x, y, 4 + Math.floor(f.c * 5), 1); break;
        case 'ash': ctx.fillStyle = f.c < 0.12 ? (Math.sin(T * 6 + f.ph) > 0 ? '#ffb040' : '#ff6a2a') : f.c < 0.6 ? 'rgba(90,86,94,0.8)' : 'rgba(180,176,184,0.7)'; ctx.fillRect(x, y, 1, 1); break;
        case 'rain': ctx.fillStyle = 'rgba(190,210,235,0.55)'; for (let i = 0; i < 5; i++) ctx.fillRect(x + Math.round(i * 0.25), y - i, 1, 1); break;
        case 'gust': ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x, y, 6 + Math.floor(f.c * 10), 1); break;
        case 'spray': ctx.fillStyle = 'rgba(230,245,255,0.6)'; ctx.fillRect(x, y, 1, 1); break;
        case 'mist': { ctx.fillStyle = `rgba(225,240,225,${0.05 + 0.03 * Math.sin(T * 0.4 + f.ph)})`; ctx.fillRect(x - 40, y, 80 + Math.floor(f.c * 60), 3 + Math.floor(f.c * 5)); break; }
        case 'fireflies': { const on = Math.sin(T * 2 + f.ph * 5) > 0.1; if (!on) break; const fx = Math.round(x + Math.sin(T * 0.9 + f.ph) * 6), fy = Math.round(y + Math.cos(T * 0.7 + f.ph) * 4); ctx.fillStyle = 'rgba(220,255,140,0.22)'; ctx.fillRect(fx - 2, fy - 1, 5, 3); ctx.fillRect(fx - 1, fy - 2, 3, 5); ctx.fillStyle = 'rgba(240,255,160,0.6)'; ctx.fillRect(fx - 1, fy, 3, 1); ctx.fillStyle = '#fbffc8'; ctx.fillRect(fx, fy, 1, 1); break; }
        default: break;
      }
    }
  }

  drawAurora(ctx, r) {
    const T = this.party.t;
    for (let band = 0; band < 3; band++) {
      const base = r.y + r.h * (0.08 + band * 0.07);
      for (let x = 0; x < r.w; x += 2) {
        const y = base + Math.sin(x * 0.02 + T * 0.4 + band) * 10 + Math.sin(x * 0.05 - T * 0.7) * 4;
        const a = 0.08 + 0.06 * Math.sin(x * 0.03 + T + band * 2);
        ctx.fillStyle = band === 1 ? `rgba(180,120,255,${a})` : `rgba(90,255,190,${a})`;
        ctx.fillRect(r.x + x, Math.round(y), 2, 14 + band * 4);
      }
    }
  }
}
