// The Teacup line (World v7, from chapter 7): Captain Wendy’s airship between the
// mooring masts of Lighthouse Isle (the Hearthlands) and Lanternport (the
// Dawnlands) — A at a mast’s foot and off you go, a real flight over the Wide Sea
// (the land streaming in below, over Whale Isle’s back), skippable. In Party the
// whole party flies. The first crossing is chapter 7’s own cold open.

import { buildAirship } from '../models/v7/props7.js';
import { MAST_W, MAST_E } from './chapters/ch7.js';
import { audio } from '../engine/audio.js';
import { t } from '../i18n.js';
import { aboard, TEACUP } from './aboard.js';

// (`land`: where her passengers get down, from the mast — the open ground beside it, clear of
// the mast’s bell)
export const MASTS = [
  { id: 'west', x: MAST_W[0], z: MAST_W[1], name: 'Lighthouse Isle', land: [-4.8, 1.6] },
  { id: 'east', x: MAST_E[0], z: MAST_E[1], name: 'Lanternport', land: [5.2, -2.6] },
];
const WHALE = [602, 60];

export class TeacupLine {
  constructor(P, saga) { this.P = P; this.S = saga; this.flying = false; this.masts = MASTS; }
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
    try {
      await S.scene(async (st) => {
        // (she leaves her mooring and takes the other one: the moored Teacup is this very ship)
        const ship = buildAirship(P.r3d);
        S.flag('teacupAt', 'flying'); S.syncProps();
        st.prop('teacup', ship, from.x, 1.3, from.z - 3.7);
        // everybody aboard, perched on her saucer, Wendy too
        const trip = aboard(st, this.heroes());
        trip.crew(ship, 'wendy', TEACUP); trip.seat(ship, TEACUP);
        await st.cam(from.x, from.z - 4.2, { dur: 0.4, ppu: st.basePpu() });
        st.sfx('whoosh', { volume: 0.7 });
        trip.cheer();
        await st.move('teacup', { y: 8 }, 1.4);
        // (the camera rides along, high above)
        trip.ride(ship);
        st.cv.ppu = Math.max(8, Math.round(st.basePpu() / 16) * 8); st.applyCam();
        st.mark('teacupFlight');
        await st.move('teacup', { x: WHALE[0], z: WHALE[1] }, 3.4, { ease: 'lin' });
        await st.move('teacup', { x: to.x, z: to.z - 3.7 }, 3.4, { ease: 'lin' });
        st.cv.ppu = st.basePpu(); st.applyCam();
        await st.move('teacup', { y: 1.3 }, 1.4);
        trip.ride(null);
        st.sfx('thud', { volume: 0.5 });
        const [lx, lz] = to.land || [2.2, -1.2];
        trip.land(to.x + lx, to.z + lz);
        st.cam(to.x + lx / 2, to.z + lz / 2 - 1, { dur: 0.5 });
        st.mark('teacupLanding');
        await trip.settled();
        await st.wait(0.4);
      }, { bars: false });
    } finally {
      S.flag('teacupAt', to.id); S.syncProps();
      P.busy = Math.max(0, P.busy - 1);
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
