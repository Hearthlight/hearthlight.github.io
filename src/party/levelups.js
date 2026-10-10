// Levels, as a party lives them. Players read twenty levels, two of the game’s own each
// (saga/levels.js): half-way through one — the notch on the bar — a hero earns a talent
// point, with a chime and a word for them alone; at its end comes the level-up, ONE calm
// moment: a gold pillar on each hero, a single banner for all who rose within the same
// couple of seconds (several levels at once: one banner, with the last; a late joiner
// catching up level after level: a banner now and then, a word over their head between),
// a card on each one’s phone — in the solo game, a small panel — with what the level brought.
// Also says, once per land and hero, when a land lifts someone to its level.
// Owned by Combat, so Party Mode and the solo game share it.

import { audio } from '../engine/audio.js';
import { t } from '../i18n.js';
import { MAX_LEVEL, shownLevel, placeAt, effLevel } from '../saga/levels.js';
import { pointsFor, picksOf, spent } from '../combat/v4/talents.js';

const QUIET = 1.2;        // seconds without another level-up before the banner comes
const LONGEST = 2.6;      // …and the longest it waits for more
const AGAIN = 45;         // a late joiner catching up: their name on a banner no more often than this

// "Alex" · "Alex and Mia" · "Alex, Mia and Lucas"
const names = (ps) => {
  const n = ps.map((p) => p.name);
  return n.length === 1 ? n[0] : n.length === 2 ? t('{a} and {b}', { a: n[0], b: n[1] }) : t('{a}, {b} and {c}', { a: n[0], b: n[1], c: n[2] });
};

// the level a party is at: its heroes’ own levels, evened out (the game’s scale)
export function partyLevel(P) {
  const ps = P.players.filter((p) => p.connected !== false);
  const lv = ps.map((p) => (p.fighter ? p.fighter.level : P.profileOf(p).level || 1));
  return lv.length ? Math.round(lv.reduce((a, b) => a + b, 0) / lv.length) : 1;
}

export class LevelUps {
  constructor(combat) {
    this.C = combat;
    this.pending = new Map();     // hero → { p, n }: risen, waiting for the shared banner
    this.quiet = 0; this.age = 0;
    this.lands = [];              // heroes a land has just lifted: { p, place, n }
    this.card = null;             // the solo game’s level-up panel (solo/wild.js draws it)
    this.snd = {};
  }

  get P() { return this.C.party; }

  points(p) {
    const f = p.fighter;
    return f ? Math.max(0, pointsFor(f.level) - spent(picksOf(this.P.profileOf(p), f.clsId))) : 0;
  }

  // where a hero stands, for the words about it: { id, name, lv }
  place(p) {
    const at = p.roomExit || p.pos;
    return placeAt(this.P.big, at.x, at.z);
  }

  // (a whole party levelling at once: one chime, not eight)
  sound(name, volume) {
    const now = performance.now();
    if (now - (this.snd[name] || 0) < 200) return;
    this.snd[name] = now;
    audio.sfx(name, { volume });
  }

  // a hero’s level (the game’s own) went up from `was`
  gained(p, was) {
    const C = this.C, P = this.P, f = p.fighter, now = f.level, n = shownLevel(now);
    const top = now >= MAX_LEVEL, pts = this.points(p);
    if (n === shownLevel(was) && !top) {
      // half-way: a talent point — a chime, a sparkle and a word for that hero alone (on
      // their phone when they hold one, else over their head: friends side by side, one
      // above the other)
      if (P.solo && p.kind !== 'phone') P.nudgeTalents();
      else if (P.solo || p.kind !== 'phone') C.popText(p.pos.x, 2.2 + ((p.slot || 0) % 4) * 0.36, p.pos.z, t('A talent point!'), '#9fe08a');
      P.world.fx.emit('sparkle', p.pos.x, 1.4, p.pos.z, 10, { color: '#9fe08a' });
      this.sound('chime', 0.55);
      P.buzz(p, [25, 40, 25]);
      this.send(p, { half: 1, pts });
      return;
    }
    C.vfx.pillar(p.pos.x, p.pos.z, { r: 0.75, h: 5, color: '#ffd66b', life: 1.1 });
    C.vfx.star(p.pos.x, 1.3, p.pos.z, { size: 2, kind: 'rays', color: '#ffd66b', life: 0.5 });
    // (a party reads it on the banner: the word over a hero’s head is for the solo game, for
    // the top, and for a hero the land lifts, catching up level after level — their name
    // was on a banner a moment ago)
    const quiet = P.solo || n === shownLevel(was) || (f.eff > now && P.t - p.lvSaid < AGAIN);
    if (quiet) C.popText(p.pos.x, 2.4, p.pos.z, n === shownLevel(was) ? t('Top level!') : t('Level {n}!', { n }), '#ffd66b', true);
    this.sound('levelup', 0.7);
    P.buzz(p, [40, 30, 40, 30, 90]);
    P.flashTag(p, 3);
    // what it brought, in plain numbers, where the hero stands: health and strength follow
    // the level they fight at (`eff`), which the land may already hold — then nothing changes
    // here; `tell`: the first card of a hero, with what levels are for
    const pr = P.profileOf(p), from = 2 * shownLevel(was) - 1, e0 = effLevel(from, this.place(p).lv, !!P.solo);
    const reads = P.solo || (p.kind === 'phone' && p.connected);
    const card = { lv: n, hp: [C.hpAt(f, e0), f.maxHp], str: [Math.round(C.strAt(f, e0) * 100), Math.round(C.strAt(f, f.eff) * 100)], got: now - from, pts, top: top ? 1 : 0, eff: shownLevel(f.eff), tell: reads && !pr.lvTold ? 1 : 0 };
    if (card.tell) pr.lvTold = 1;
    if (P.solo) this.card = { ...card, t: 0, life: card.tell ? 14 : 8 };
    else this.send(p, card);
    if (quiet) return;
    this.pending.set(p, { p, n });
    this.quiet = 0;
  }

  // the card on a hero’s phone (pad.js)
  send(p, card) { const P = this.P; if (!P.solo && p.kind === 'phone' && p.connected) P.net.send(p.id, { t: 'lvup', ...card }); }

  // the level a hero fights at changed with the place: said once per place and hero, and
  // only when it lifts them (friends lifted together share the line)
  synced(p) {
    const f = p.fighter;
    if (!f || shownLevel(f.eff) <= shownLevel(f.level)) return;
    const place = this.place(p), key = place.id + ':' + place.name, told = p.landTold || (p.landTold = new Set());
    if (!place.name || told.has(key)) return;
    told.add(key);
    this.lands.push({ p, key, place: t(place.name), n: shownLevel(f.eff) });
  }

  // a phone’s own picture of its hero’s level (the header’s bar, the Hero page): the level and
  // experience as the game counts them, the level they fight at here, the place and its levels
  sync() {
    const P = this.P, phone = P.solo && P.game.phone;
    for (const p of P.players) {
      const f = p.fighter;
      if (!f || !(P.solo ? phone && phone.connected : p.kind === 'phone' && p.connected)) continue;
      const place = this.place(p);
      const msg = { t: 'lv', lv: f.level, xp: f.xp, eff: f.eff || f.level, land: place.lv, place: place.name ? t(place.name) : '', solo: P.solo ? 1 : 0 };
      const key = JSON.stringify(msg);
      // (said again now and then: a phone that reloaded its page has forgotten)
      if (key === p.lvKey && P.t - p.lvSent < 5) continue;
      p.lvKey = key; p.lvSent = P.t;
      if (P.solo) phone.send(msg); else P.net.send(p.id, msg);
    }
  }

  update(dt) {
    const P = this.P;
    if ((this.syncT = (this.syncT || 0) - dt) <= 0) { this.syncT = 0.5; this.sync(); }
    // (the solo panel’s time runs only while solo/wild.js shows it)
    const c = this.card;
    if (c && c.shown) { c.shown = false; if ((c.t += dt) > c.life) this.card = null; }
    if (this.lands.length) this.sayLands();
    if (!this.pending.size) return;
    this.quiet += dt; this.age += dt;
    if (this.quiet < QUIET && this.age < LONGEST) return;
    // (a banner still fresh — the quest that brought the level — keeps the screen a moment;
    // a scene keeps it whole: the banner comes when it ends)
    if ((P.banner && P.banner.t < 2.4 && this.age < 5) || (P.stage && P.stage.active)) return;
    const list = [...this.pending.values()];
    this.pending.clear();
    this.age = 0;
    for (const q of list) q.p.lvSaid = P.t;
    this.announce(list);
  }

  // one banner for everyone who rose together
  announce(list) {
    const P = this.P, k = list.length, n = list[0].n, same = list.every((q) => q.n === n);
    const all = k > 1 && k === P.players.filter((p) => p.connected && p.fighter).length;
    const who = k <= 3 ? names(list.map((q) => q.p)) : '';
    const title = k === 1 ? t('{name} reaches level {n}!', { name: who, n })
      : same ? (who ? t('{names} reach level {n}!', { names: who, n }) : all ? t('Everyone reaches level {n}!', { n }) : t('{k} heroes reach level {n}!', { k, n }))
        : who ? t('{names} level up!', { names: who }) : all ? t('Everyone levels up!') : t('{k} heroes level up!', { k });
    const sub = same || k > 4 ? t('More health, more strength, a talent point to spend')
      : list.map((q) => t('{name}: level {n}', { name: q.p.name, n: q.n })).join(' · ');
    P.showBanner(title, sub);
  }

  sayLands() {
    const P = this.P, groups = new Map();
    for (const q of this.lands) { const key = q.key + ':' + q.n; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(q); }
    this.lands = [];
    const here = P.players.filter((p) => p.connected && p.fighter).length;
    for (const g of groups.values()) {
      const { place, n } = g[0], k = g.length;
      if (P.solo) P.toast(t('{place} is above your level: here you fight at level {n}', { place, n }));
      else if (k <= 3) P.toast(t('{place} lifts {names} to level {n}', { place, names: names(g.map((q) => q.p)), n }), k === 1 ? g[0].p.color : '#fff3c4');
      else P.toast(k === here ? t('{place} lifts everyone to level {n}', { place, n }) : t('{place} lifts {k} heroes to level {n}', { place, k, n }), '#fff3c4');
    }
  }
}
