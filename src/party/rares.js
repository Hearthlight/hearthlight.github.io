// World v7, M13: the rares — named gloom with a silver plate, one in each of the Dawnlands,
// by a landmark of its land. Stronger than their kind (a level or two up, three times the
// health), they never stray far from home — and each wears a hat nobody else has: it’s yours
// when they fall (Party: every hero near; solo: into your wardrobe). They come back, a while
// later, for anyone who missed them. Solo and Party alike (`P.rares`).

import { TREASURE_HATS } from '../data/looks.js';
import { zoneLevels } from '../saga/levels.js';
import { TT } from '../world/tiles.js';
import { audio } from '../engine/audio.js';
import { t } from '../i18n.js';

const NEAR = 34, GONE = 70, BACK = 20 * 60 * 1000;          // (back after twenty minutes of real time)

export const RARES = [
  { id: 'inkwell', name: 'Captain Inkwell', type: 'inkimp', zone: 'harbor', at: [754, 42], hat: 'tricorn', said: 'Arr. Ink, ink, and a bottle of ink!' },
  { id: 'lanternfly', name: 'Lady Lanternfly', type: 'paperlantern', zone: 'jade', at: [796, -88], hat: 'lanternhat', said: 'Such a pretty light you carry. Give it here.' },
  { id: 'reginald', name: 'Sir Reginald, the Gloomiest Hen', type: 'gloomhen', zone: 'salt', at: [780, 232], hat: 'henhat', said: 'BAWK. (He is very, very gloomy.)' },
  { id: 'turnipjaw', name: 'Old Jack Turnipjaw', type: 'scarecrow', zone: 'autumn', at: [906, 184], hat: 'pumpkinhat', said: 'Caw. Caw, I said. Nobody listens to a scarecrow.' },
  { id: 'marshlantern', name: 'The Marsh Lantern', type: 'jelly', zone: 'glow', at: [1030, 275], hat: 'jellyhat', said: '(It glows at you, meaningfully.)' },
  { id: 'unripe', name: 'Sir Acorn the Unripe', type: 'rootling', zone: 'elder', at: [975, 112], hat: 'leafcrown', said: 'I shall be an OAK one day! A mighty OAK!' },
  { id: 'wispington', name: 'Sir Wispington', type: 'wisp', zone: 'moor', at: [1205, 100], hat: 'ghosthat', said: 'Oooo. Oooooo. …Sorry, force of habit.' },
  { id: 'prismo', name: 'Prismo the Magnificent', type: 'beetle', zone: 'prism', at: [1256, 220], hat: 'prismcrown', said: 'Behold my shell! It does RAINBOWS.' },
  { id: 'mainspring', name: 'Major Mainspring', type: 'clockwork', zone: 'clock', at: [1262, -120], hat: 'windkey', said: 'Tick-tock, left-right, ATTEN-TION!' },
  { id: 'bigsniff', name: 'Big Sniff', type: 'yeti', zone: 'tundra', at: [1010, -96], hat: 'chapka', said: '(Big Sniff sniffs. Big Sniff does not like what Big Sniff smells.)' },
];

export class Rares {
  constructor(P) {
    this.P = P;
    this.seenAt = P.loadSave('rares', {});                      // id → when it last fell (ms)
    this.list = [];
    const B = P.big;
    if (!B) return;
    for (const R of RARES) { const c = this.spot(R.at[0], R.at[1]); this.list.push({ ...R, x: c.x, z: c.z, e: null, seen: false }); }
  }

  // the nearest dry, open ground by its spot
  spot(x0, z0) {
    const B = this.P.big;
    const dry = (x, z) => { const tt = B.tileAt(x, z); return tt !== TT.WATER && tt !== TT.LAVA && tt !== TT.SKY && !B.col.blocked(x, z, 0.7); };
    for (let r = 0; r <= 14; r++) for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2, x = x0 + Math.cos(a) * r, z = z0 + Math.sin(a) * r; if (dry(x, z)) return { x, z }; }
    return { x: x0, z: z0 };
  }

  heroes() { const P = this.P; return P.players.filter((p) => p.connected || P.solo); }
  away(R) { const at = this.seenAt[R.id]; return !!at && Date.now() - at < BACK; }

  update(dt) {
    void dt;
    const P = this.P, C = P.combat;
    if (!C || !P.big || (P.exploring && !P.exploring())) return;
    for (const R of this.list) {
      let d = 1e9;
      for (const p of this.heroes()) d = Math.min(d, Math.hypot(p.pos.x - R.x, p.pos.z - R.z));
      if (d < 26) R.seen = true;
      if (!R.e) {
        if (d < NEAR && !this.away(R) && (!P.murk || !P.murk.at(Math.floor(R.x), Math.floor(R.z)))) this.wake(R);
      } else if (!R.e.alive) {
        if (R.e.hp <= 0) this.fall(R);
        R.e = null;
      } else if (d > GONE) { R.e.alive = false; R.e.fading = 0; R.e.remove(); R.e = null; }
    }
  }

  wake(R) {
    const C = this.P.combat;
    const e = C.spawn(R.type, R.x, R.z, { level: zoneLevels(R.zone)[1] + 2, rare: true, hpScale: 3, dmgScale: 1.25 });
    e.rareName = R.name; e.home = { x: R.x, z: R.z }; e.rareOf = R.id;
    R.e = e;
    C.bubble(e, t(R.said), 2.6);
  }

  // it falls: its hat for every hero near (the first time), stardust, a toast
  fall(R) {
    const P = this.P, C = P.combat;
    this.seenAt[R.id] = Date.now();
    P.writeSave('rares', this.seenAt);
    audio.jingle('shard');
    const hat = t(TREASURE_HATS[R.hat]);
    for (const p of this.heroes()) {
      if (Math.hypot(p.pos.x - R.x, p.pos.z - R.z) > 30) continue;
      if (P.solo) {
        const s = P.world.state;
        if (s && s.unlocked && !s.unlocked.hat.includes(R.hat)) { s.unlocked.hat.push(R.hat); P.showBanner(t('{rare} dropped the {hat}!', { rare: t(R.name), hat }), t('Try it on at your wardrobe')); }
        else P.toast(t('{rare} falls — you already have the {hat}.', { rare: t(R.name), hat }), '#dfe4ee');
      } else {
        const prof = P.profileOf(p);
        if (!(prof.hats || []).includes(R.hat)) {
          prof.hats = Array.from(new Set([...(prof.hats || []), R.hat]));
          P.saveProfile(p); P.sendHats(p);
          P.showBanner(t('{rare} dropped the {hat}!', { rare: t(R.name), hat }), t('a treasure hat — yours to keep'));
        }
      }
      if (P.progress && P.progress.give) P.progress.give(p, { rich: true });
    }
    if (C) for (let i = 0; i < 16; i++) C.drop('dust', R.x, R.z);
    P.world.fx.emit('sparkle', R.x, 1.5, R.z, 24, { color: '#dfe4ee' });
  }

  // silver stars on the world map, once seen
  mapMarks(out = []) {
    for (const R of this.list) if (R.seen) out.push({ k: 'rare', x: R.x, z: R.z, on: this.away(R), name: t(R.name), st: this.away(R) ? t('Beaten — back later') : t('A rare: it wears the {hat}', { hat: t(TREASURE_HATS[R.hat]) }) });
    return out;
  }

  dispose() {
    for (const R of this.list) if (R.e && R.e.alive) { R.e.alive = false; R.e.fading = 0; R.e.remove(); }
    this.list = [];
  }
}
