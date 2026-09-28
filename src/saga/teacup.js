// The Teacup line (World v7, from chapter 7): Captain Wendy’s airship between the
// mooring masts of Lighthouse Isle (the Hearthlands) and Lanternport (the
// Dawnlands) — A at a mast’s foot and off you go, a real flight over the Wide Sea
// (the land streaming in below, over Whale Isle’s back), skippable. In Party the
// whole party flies. The first crossing is chapter 7’s own cold open.

import { buildAirship } from '../models/v7/props7.js';
import { MAST_W, MAST_E } from './chapters/ch7.js';
import { audio } from '../engine/audio.js';
import { t } from '../i18n.js';

const MASTS = [
  { id: 'west', x: MAST_W[0], z: MAST_W[1], name: 'Lighthouse Isle' },
  { id: 'east', x: MAST_E[0], z: MAST_E[1], name: 'Lanternport' },
];
const WHALE = [602, 60];

export class TeacupLine {
  constructor(P, saga) { this.P = P; this.S = saga; this.flying = false; }
  get open() { return this.S.has('teacupLine'); }
  heroes() { const P = this.P; return P.players.filter((p) => p.connected || P.solo); }

  near(p) {
    if (!this.open) return null;
    return MASTS.find((M) => Math.hypot(p.pos.x - M.x, p.pos.z - M.z) < 2.6) || null;
  }
  nearThing(p) {
    const M = this.near(p);
    if (!M) return null;
    const to = MASTS.find((q) => q !== M);
    return { kind: 'secret', label: 'Fly', hint: 'Fly the Dauntless Teacup to {name}', vars: { name: t(to.name) }, use: (q) => this.use(q || p, M, to) };
  }

  async use(p, from, to) {
    const P = this.P;
    if (this.flying || P.busy || (this.S.stage && this.S.stage.active)) return;
    audio.sfx('bell', { volume: 0.7 });
    const i = await P.ask(P.solo ? t('Fly the Dauntless Teacup to {name}?', { name: t(to.name) }) : t('{name} rang the mast’s bell. Fly to {to}?', { name: p.name, to: t(to.name) }), [{ label: t('All aboard!'), color: '#ffe08a' }, { label: t('Stay here'), sub: t('keep exploring'), color: '#8fd67a' }], 18);
    if (i === 0) await this.fly(from, to);
  }

  // up from one mast, out over the sea (and Whale Isle’s back), down at the other
  async fly(from, to) {
    const P = this.P, S = this.S;
    if (this.flying || !S.stage) return;
    this.flying = true;
    P.busy++;
    const heroes = this.heroes();
    for (const p of heroes) { if (p.mount && P.mounts) P.mounts.dismount(p, true); if (p.vehicle && P.vehicles) P.vehicles.leave(p, true); }
    try {
      await S.scene(async (st) => {
        const ship = buildAirship(P.r3d);
        S.flag('teacupAt', 'flying');
        st.prop('teacup', ship, from.x - 0.4, 3.4, from.z + 1.6);
        for (const p of heroes) { p.away = true; p.hidden = true; if (p.actor) p.actor.hidden = true; }
        await st.cam(from.x, from.z + 1, { dur: 0.4, ppu: st.basePpu() });
        st.sfx('whoosh', { volume: 0.7 });
        await st.move('teacup', { y: 8 }, 1.2);
        // (the camera rides along, high above)
        const a0 = ship.userData.anim;
        ship.userData.anim = (tm, dt) => { if (a0) a0(tm, dt); if (st.cv && !st.tw) { st.cv.x = ship.position.x; st.cv.z = ship.position.z - ship.position.y + 0.6; } };
        st.cv.ppu = Math.max(8, Math.round(st.basePpu() / 16) * 8); st.applyCam();
        st.mark('teacupFlight');
        await st.move('teacup', { x: WHALE[0], z: WHALE[1] }, 3.4, { ease: 'lin' });
        await st.move('teacup', { x: to.x - 0.4, z: to.z + 1.6 }, 3.4, { ease: 'lin' });
        ship.userData.anim = a0;
        st.cv.ppu = st.basePpu(); st.applyCam();
        await st.move('teacup', { y: 3.4 }, 1.2);
        heroes.forEach((p, i) => {
          const x = to.x + 1.5 + (i % 4) * 0.8, z = to.z + 2.4 + Math.floor(i / 4) * 0.8;
          if (P.solo) P.gatherAt(x, z); else p.actor.pos = { x, z };
          p.away = false; p.hidden = false; if (p.actor) p.actor.hidden = false;
          P.world.fx.emit('dust', x, 0.2, z, 6);
        });
        if (!P.solo && P.cam) P.cam.snap(P.camPlayers());
        st.sfx('thud', { volume: 0.5 });
        await st.wait(0.3);
      }, { bars: false });
    } finally {
      for (const p of heroes) { p.away = false; p.hidden = false; if (p.actor) p.actor.hidden = false; }
      S.flag('teacupAt', to.id);
      P.busy--;
      this.flying = false;
    }
    P.showBanner(t(to.name), t('The Dauntless Teacup'));
    P.toast(t('Tea: full. Passengers: accounted for. Landing: mostly gentle.'), '#ffe08a');
  }

  mapMarks(out) {
    if (!this.open) return;
    for (const M of MASTS) out.push({ k: 'roost', x: M.x, z: M.z, on: true, name: t(M.name), st: t('The Dauntless Teacup: fly across the Wide Sea') });
  }
}
