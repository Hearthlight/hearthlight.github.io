// World v7: the Pelican Post — the world’s flight paths. A roost stands by
// every hub; once Perkins has opened the Post (chapter 2) you find a roost by
// walking up to it, and at any roost you can fly to any other you’ve found:
// carried in a pelican’s pouch, high over the world (the land streams in below),
// and dropped off… slightly off. In Party the whole flock flies, one pelican
// each. Roosts under the Murk wait for the story.

import { buildPelican } from '../models/v7/pelican.js';
import { THREE } from '../render/r3d.js';
import { ZONES } from '../world/big/layout.js';
import { TT } from '../world/tiles.js';
import { audio } from '../engine/audio.js';
import { t } from '../i18n.js';

const ZNAME = Object.fromEntries(ZONES.map((z) => [z.id, z.name]));
let shadowGeo = null;
const SHADOW = () => (shadowGeo = shadowGeo || new THREE.CircleGeometry(0.9, 16).rotateX(-Math.PI / 2).scale(1.4, 1, 1));
const QUIPS = ['Pelican Post! Delivered.{p} Roughly.', 'Here you are! Give or take a field.', 'Slightly off. It’s a tradition.', 'Landed! Mostly on purpose.', 'All passengers accounted for! I counted twice. Got two different numbers.'];

export class PelicanPost {
  constructor(P, saga) {
    this.P = P; this.S = saga;
    const saved = P.loadSave('roosts', []) || [];
    this.roosts = P.big ? P.big.map.pois.filter((q) => q.kind === 'roost').map((q) => ({ id: q.rid, name: q.name, zone: q.zone, x: q.x, z: q.z, found: saved.includes(q.rid) })) : [];
    this.flying = false;
  }

  get open() { return this.S.has('post'); }
  store() { this.P.writeSave('roosts', this.roosts.filter((r) => r.found).map((r) => r.id)); }
  shut(R) { const M = this.P.murk; return !!(M && M.at(Math.floor(R.x), Math.floor(R.z))); }
  byId(id) { return this.roosts.find((r) => r.id === id) || null; }
  heroes() { const P = this.P; return P.players.filter((p) => p.connected || P.solo); }

  update() {
    if (!this.open || this.flying) return;
    for (const R of this.roosts) {
      if (R.found || this.shut(R)) continue;
      const p = this.heroes().find((q) => Math.hypot(q.pos.x - R.x, q.pos.z - R.z) < 3.2);
      if (p) this.find(R);
    }
  }
  find(R, quiet = false) {
    if (R.found) return;
    R.found = true;
    this.store();
    if (quiet) return;
    const P = this.P;
    P.showBanner(t('Pelican roost found: {name}', { name: t(R.name) }), t('press {a} at any roost to fly', { a: P.keyName('a') }));
    audio.sfx('mail', { volume: 0.8 });
    P.world.fx.emit('sparkle', R.x, 2.6, R.z, 16, { color: '#ffe08a' });
  }

  // a found roost within reach
  near(p) {
    if (!this.open) return null;
    for (const R of this.roosts) if (R.found && Math.hypot(p.pos.x - R.x, p.pos.z - R.z) < 2.3) return R;
    return null;
  }
  nearThing(p) {
    const R = this.near(p);
    return R ? { kind: 'secret', label: 'Fly', hint: 'Fly Pelican Post from {name}', vars: { name: t(R.name) }, use: (q) => this.use(q || p, R) } : null;
  }

  // A at a roost: everyone picks where to fly
  async use(p, R) {
    const P = this.P;
    if (this.flying || P.busy || (this.S.stage && this.S.stage.active)) return;
    const dests = this.roosts.filter((q) => q.found && q !== R && !this.shut(q));
    if (!dests.length) { P.toast(t('Find another roost to fly to!'), p.color || '#ffe08a'); return; }
    dests.sort((a, b) => Math.hypot(b.x - R.x, b.z - R.z) - Math.hypot(a.x - R.x, a.z - R.z));
    const home = dests.find((q) => q.id === 'marigold');
    const pickd = dests.filter((q) => q !== home).slice(0, home ? 4 : 5);
    if (home) pickd.push(home);
    const opts = pickd.map((q) => ({ label: t(q.name), sub: t(ZNAME[q.zone] || ''), color: '#ffe08a' }));
    opts.push({ label: t('Stay here'), sub: t('keep exploring'), color: '#8fd67a' });
    audio.sfx('mail', { volume: 0.6 });
    const i = await P.ask(P.solo ? t('Fly where?') : t('{name} rang the roost’s bell. Fly where?', { name: p.name }), opts, 18);
    if (i >= 0 && i < pickd.length) await this.fly(R, pickd[i]);
  }

  // where you actually come down: a few steps off the roost (it’s tradition)
  landing(to, k = 0) {
    const P = this.P, B = P.big;
    const dry = (x, z) => { const tt = B.tileAt(x, z); return tt !== TT.WATER && tt !== TT.CORAL && tt !== TT.LAVA && tt !== TT.SKY && !B.col.blocked(x, z, 0.45); };
    const a0 = (to.x * 7.3 + to.z * 3.1 + k * 2.4) % (Math.PI * 2);
    for (let r = 3; r <= 9; r += 0.5) for (let j = 0; j < 12; j++) {
      const a = a0 + j * 0.52, x = to.x + Math.cos(a) * r, z = to.z + Math.sin(a) * r;
      if (dry(x, z) && dry(x + 0.7, z) && dry(x - 0.7, z) && dry(x, z + 0.7)) return { x, z };
    }
    return { x: to.x, z: to.z + 2 };
  }
  hide(p, on) { p.away = on; p.hidden = on; if (p.actor) p.actor.hidden = on; }

  // the flight: up from the roost, high over the land, down near the other roost
  async fly(from, to, { quip = true } = {}) {
    const P = this.P, S = this.S;
    if (this.flying || !S.stage) return;
    this.flying = true;
    P.busy++;
    const heroes = this.heroes();
    for (const p of heroes) { if (p.mount && P.mounts) P.mounts.dismount(p, true); if (p.vehicle && P.vehicles) P.vehicles.leave(p, true); }
    const land = this.landing(to);
    const dx = to.x - from.x, dz = to.z - from.z, dist = Math.hypot(dx, dz) || 1, ang = Math.atan2(dx, dz);
    const cruise = Math.max(2.4, Math.min(9, dist / 40));
    try {
      await S.scene(async (st) => {
        const base = st.basePpu(), high = Math.max(8, Math.round(base / 16) * 8);
        // one pelican each, in a loose V behind the leader
        const birds = heroes.slice(0, 8).map((p, i) => {
          const o = buildPelican(P.r3d, { rider: p.color || '#ec5f73' });
          o.scale.setScalar(1.5);
          // (a soft shadow on the ground under each bird, to show how high it flies)
          const sh = new THREE.Mesh(SHADOW(), new THREE.MeshBasicMaterial({ color: 0x1a1426, transparent: true, opacity: 0.28, depthWrite: false }));
          sh.renderOrder = 2; o.add(sh); o.userData.shadow = sh;
          const a1 = o.userData.anim;
          o.userData.anim = (tt, dt) => { a1(tt, dt); sh.position.set(0, (0.04 - o.position.y) / 1.5, 0); const k = 1 + o.position.y * 0.05; sh.scale.set(k, k, k); sh.material.opacity = 0.3 - Math.min(0.15, o.position.y * 0.012); };
          const row = Math.ceil(i / 2), side = i === 0 ? 0 : i % 2 ? -1 : 1;
          const off = { x: Math.cos(ang) * side * row * 1.8 - Math.sin(ang) * row * 1.6, z: -Math.sin(ang) * side * row * 1.8 - Math.cos(ang) * row * 1.6 };
          o.rotation.y = ang;
          st.prop('pel' + i, o, from.x + off.x, 0, from.z + off.z + 1.4);
          return { o, off, key: 'pel' + i };
        });
        for (const p of heroes) this.hide(p, true);
        // the camera rides with the leader (it aims where a thing that high shows up)
        const lead = birds[0].o, a0 = lead.userData.anim;
        lead.userData.anim = (tt, dt) => { a0(tt, dt); if (st.cv && !st.tw) { st.cv.x = lead.position.x; st.cv.z = lead.position.z - lead.position.y + 0.6; } };
        await st.cam(from.x, from.z + 0.4, { dur: 0.4, ppu: base });
        st.sfx('whoosh', { volume: 0.7 });
        for (const b of birds) b.o.userData.mode = 'fly';
        st.music(null);
        // up…
        await Promise.all(birds.map((b) => st.move(b.key, { y: 9 }, 1.3)));
        st.cv.ppu = high; st.applyCam();
        // …over the land…
        for (const b of birds) b.o.userData.mode = 'glide';
        st.mark('pelicanFlight');
        await Promise.all(birds.map((b) => st.move(b.key, { x: to.x + b.off.x, z: to.z + b.off.z + 1.4 }, cruise, { ease: 'lin' })));
        // …and down, a little off
        for (const b of birds) b.o.userData.mode = 'fly';
        st.cv.ppu = base; st.applyCam();
        await Promise.all(birds.map((b, i) => { const L = i ? this.landing(to, i) : land; return st.move(b.key, { x: L.x, y: 0.4, z: L.z + 1 }, 1.2); }));
        heroes.forEach((p, i) => {
          const L = i ? this.landing(to, i) : land;
          if (P.solo) P.gatherAt(L.x, L.z); else p.actor.pos = { x: L.x, z: L.z };
          this.hide(p, false);
          p.actor.jumpV = 4;
          P.world.fx.emit('dust', L.x, 0.2, L.z, 8);
        });
        if (!P.solo && P.cam) P.cam.snap(P.camPlayers());
        st.sfx('thud', { volume: 0.6 });
        // the pelicans are off again
        for (const b of birds) { b.o.userData.mode = 'fly'; st.move(b.key, { y: 12, x: b.o.position.x - Math.sin(ang) * 14, z: b.o.position.z - Math.cos(ang) * 14 }, 1.6); }
        await st.wait(0.6);
      }, { bars: false });
    } finally {
      for (const p of heroes) this.hide(p, false);
      P.busy--;
      this.flying = false;
    }
    this.find(to, true);
    P.showBanner(t(to.name), t(ZNAME[to.zone] || ''));
    if (quip) P.toast(t(QUIPS[Math.floor(Math.random() * QUIPS.length)]).replace(/\{p\}/g, ''), '#ffe08a');
  }

  mapMarks(out) {
    if (!this.open) return;
    for (const R of this.roosts) {
      const seen = R.found || (this.P.big && this.P.big.worldMap && this.P.big.worldMap.revealed(R.x, R.z));
      if (seen && !this.shut(R)) out.push({ k: 'roost', x: R.x, z: R.z, on: R.found, name: t(R.name), st: R.found ? t('Pelican Post: you can fly here') : t('A roost you haven’t found yet') });
    }
  }
}
