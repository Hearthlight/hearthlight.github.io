// Waystones & fast travel. Every zone has a waystone; walk up to one and it's
// attuned for good (the Market Plaza's always is). Press A at an attuned stone
// and everyone votes where to go; the host can also send the party anywhere
// from the ♛ menu (Travel tab). A few friends from the valley wait by the
// stones with tips for their zone — and Pim, the wandering merchant, trades
// mystery gear for stardust at the Nomad Camp.

import { audio } from '../engine/audio.js';
import { TT } from '../world/tiles.js';
import { t } from '../i18n.js';
import { ZONES } from '../world/big/layout.js';
import { FOODS } from './mounts.js';
import { drawMarks } from './mapmarks.js';

const ZNAME = Object.fromEntries(ZONES.map((z) => [z.id, z.name]));
const REACH = 1.9;
export const SHOP_PRICE = 80;

// who waits where, and what they'd tell you
// (each also wishes for one of the animals' treats — bring it for a present)
const TRAVELERS = [
  { npc: 'finn', zone: 'canyon', wants: 'acorn', tips: ['The minecart rails run right through the canyon. Hop in!', 'Beetles shrug off quick hits — try a big charged one!', 'Slingers run away when you close in. Corner them!'] },
  { npc: 'mabel', zone: 'glacier', wants: 'honey', tips: ['The Frost Colossus sleeps by the ice arch. Break its armour first!', 'Bears adore honeycomb. So do I, dear.', 'Sleds go faster downhill. Mind the rocks!'] },
  { npc: 'juniper', zone: 'bouncecap', wants: 'bug', tips: ['Jump next to a giant mushroom — boing!', 'Spore shamans call little friends. Stop them first!', 'Frogs love juicy bugs, the glowing kind.'] },
  { npc: 'marlo', zone: 'lagoon', wants: 'kelp', tips: ['Where the water glints, dive with B. Pearls!', 'Turtles love kelp — and they carry you across the sea!', 'Whirlpools spin you round and spit you out. Great fun.'] },
  { npc: 'merchant', zone: 'steppe', shop: true, tips: [] },
];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export class Travel {
  constructor(party) {
    this.party = party;
    const B = party.big;
    let saved = [];
    saved = party.loadSave('waystones', []) || [];
    this.stones = B ? B.map.pois.filter((p) => p.kind === 'waystone').map((p) => ({ name: p.name, zone: p.zone, x: p.x, z: p.z, attuned: saved.includes(p.name) || p.zone === 'valley', seen: p.zone === 'valley', land: null })) : [];
    this.travelers = [];
    this.busy = false;
    this.going = false;
  }

  active() { return this.party.exploring(); }
  store() { this.party.writeSave('waystones', this.stones.filter((s) => s.attuned).map((s) => s.name)); }
  attuned() { return this.stones.filter((s) => s.attuned); }
  title(s) { return cap(t(s.name)); }

  // dry, open ground around a point (a spiral out from it, starting at angle a0)
  openNear(x, z, r0, r1, a0 = Math.PI / 2) {
    const B = this.party.big;
    const dry = (px, pz) => { const tt = B.tileAt(px, pz); return tt !== TT.WATER && tt !== TT.CORAL && tt !== TT.LAVA && tt !== TT.SKY && tt !== TT.VOID && !B.col.blocked(px, pz, 0.45); };
    for (let r = r0; r <= r1; r += 0.5) {
      for (let k = 0; k < 16; k++) {
        const a = a0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 8);
        const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
        if (dry(px, pz) && dry(px + 0.8, pz) && dry(px - 0.8, pz) && dry(px, pz + 0.8) && dry(px, pz - 0.8)) return { x: px, z: pz };
      }
    }
    return { x, z: z + r0 };
  }

  update() {
    const P = this.party, on = this.active();
    for (const s of this.stones) {
      for (const p of P.players) {
        if (!p.connected) continue;
        const d = Math.hypot(p.pos.x - s.x, p.pos.z - s.z);
        if (d < 30) s.seen = true;
        if (on && !s.attuned && d < REACH) this.attune(s, p);
      }
    }
    // the travellers only wait by their stones while exploring
    if (on && !this.travelers.length) this.placeTravelers();
    else if (!on && this.travelers.length) this.clearTravelers();
    for (const n of this.travelers) if (n.offer && P.t > n.offer.until) n.offer = null;
  }

  attune(s, p) {
    const P = this.party;
    s.attuned = true;
    this.store();
    P.showBanner(t('Waystone attuned: {name}', { name: this.title(s) }), t('press {a} at any waystone to travel', { a: P.keyName('a') }));
    audio.jingle('shard');
    P.world.fx.emit('sparkle', s.x, 1.4, s.z, 22, { color: '#9fdcff' });
    P.world.fx.emit('ring', s.x, 0.2, s.z, 1, { color: '#9fdcff' });
    P.buzz(p, [20, 40, 60]);
  }

  placeTravelers() {
    const P = this.party;
    // (the solo game has its own wanderers: P.travelerList)
    for (const T of P.travelerList || TRAVELERS) {
      const s = this.stones.find((q) => q.zone === T.zone);
      if (!s) continue;
      const at = this.openNear(s.x, s.z, 3, 8, 0);
      const n = P.spawnNpc(T.npc, at.x, at.z, { x: -0.3, z: 1 });
      if (!n) continue;
      n.tips = T.tips; n.shop = !!T.shop; n.traveler = true; n.offer = null; n.wants = T.wants || null; n.granted = false; n.hello = T.hello || null;
      n.restDir = { x: -0.3, z: 1 };
      this.travelers.push(n);
    }
  }

  clearTravelers() { for (const n of this.travelers) this.party.removeNpc(n.id); this.travelers = []; }

  // a waystone within reach of a player
  near(p) {
    for (const s of this.stones) if (Math.hypot(p.pos.x - s.x, p.pos.z - s.z) < REACH) return s;
    return null;
  }

  // can the party travel right now? (a reason if not)
  blocked(p) {
    const P = this.party, A = P.act;
    if (this.going || this.busy || P.vote || P.busy) return 'busy';
    if (A && (A.stage === 'boss' || A.stage === 'intro')) return t('Not now!');
    const C = P.combat;
    if (p && C && C.enemies.some((e) => e.alive && !e.fading && Math.hypot(e.x - p.pos.x, e.z - p.pos.z) < 11)) return t('Not while the gloom is on you!');
    if (P.lairs && P.lairs.fight) return t('Not during a boss fight!');
    if (P.races && P.races.race) return t('Not during a race!');
    return null;
  }

  // A at an attuned stone: everyone votes where to go
  async use(p, s) {
    const P = this.party;
    if (!s.attuned) { this.attune(s, p); return; }
    const why = this.blocked(p);
    if (why) { if (why !== 'busy') P.toast(why, p.color); return; }
    const dests = this.attuned().filter((q) => q !== s);
    if (!dests.length) { P.toast(t('Attune more waystones to travel between them'), p.color); return; }
    // the farthest ones first (that's where you'd want to go), home always offered
    dests.sort((a, b) => Math.hypot(b.x - s.x, b.z - s.z) - Math.hypot(a.x - s.x, a.z - s.z));
    const plaza = dests.find((q) => q.zone === 'valley');
    const pickd = dests.filter((q) => q !== plaza).slice(0, plaza ? 4 : 5);
    if (plaza) pickd.push(plaza);
    const opts = pickd.map((q) => ({ label: this.title(q), sub: t(ZNAME[q.zone] || ''), color: q.zone === 'valley' ? '#ffd66b' : '#9fdcff' }));
    opts.push({ label: t('Stay here'), sub: t('keep exploring'), color: '#8fd67a' });
    this.busy = true;
    P.world.fx.emit('sparkle', s.x, 1.6, s.z, 14, { color: '#9fdcff' });
    audio.sfx('sparkle', { volume: 0.7 });
    const i = await P.ask(P.solo ? t('Travel where?') : t('{name} touched the waystone. Travel where?', { name: p.name }), opts, 18);
    this.busy = false;
    if (i >= 0 && i < pickd.length && this.active()) this.go(pickd[i]);
  }

  async go(s) {
    const P = this.party;
    if (this.going || !this.active()) return;
    this.going = true;
    P.busy++;
    audio.sfx('whoosh', { volume: 0.8 });
    for (const p of P.players) if (p.connected) P.world.fx.emit('sparkle', p.pos.x, 0.8, p.pos.z, 10, { color: '#9fdcff' });
    await P.fadeTo(1, 0.5);
    for (const p of P.players) if (p.vehicle && P.vehicles) P.vehicles.leave(p, true);
    if (!s.land) s.land = this.openNear(s.x, s.z, 2.2, 9);
    P.gatherAt(s.land.x, s.land.z, 1.4);
    for (const p of P.players) p.actor.face(s.x, s.z);
    // wait (a little) for the land to stream in under everyone's feet
    for (let i = 0; i < 60 && P.big && !P.big.ready(s.land.x, s.land.z, 8); i++) await P.wait(0.05);
    await P.fadeTo(0, 0.5);
    P.busy--;
    this.going = false;
    P.showBanner(this.title(s), t(ZNAME[s.zone] || ''));
    audio.sfx('shard', { volume: 0.6 });
    P.world.fx.emit('sparkle', s.x, 1.2, s.z, 24, { color: '#9fdcff' });
    P.world.fx.emit('ring', s.x, 0.2, s.z, 1, { color: '#9fdcff' });
  }

  goByName(name) {
    const s = this.stones.find((q) => q.name === name && q.attuned);
    if (!s || !this.active()) return;
    const why = this.blocked(null);
    if (why) { if (why !== 'busy') this.party.toast(why, '#9fdcff'); return; }
    this.go(s);
  }

  // A at a traveller: a tip, or Pim's trade (A twice to buy)
  chat(n, p) {
    const P = this.party;
    let say;
    if (n.shop) {
      const G = P.progress, pr = G ? G.prof(p) : null;
      if (pr && n.offer && n.offer.slot === p.slot && P.t < n.offer.until) {
        n.offer = null;
        if (pr.dust >= SHOP_PRICE) {
          pr.dust -= SHOP_PRICE;
          G.give(p, Math.random() < 0.35);
          say = t('Pleasure doing business, {name}!', { name: p.name });
          audio.sfx('buy');
          P.world.fx.emit('sparkle', n.pos.x, 1.4, n.pos.z, 16, { color: '#ffe89a' });
        } else say = t('Come back with {n} stardust, {name}!', { n: SHOP_PRICE, name: p.name });
      } else if (pr && pr.dust >= SHOP_PRICE) {
        n.offer = { slot: p.slot, until: P.t + 5 };
        say = t('A mystery rune or charm for {n} ★? Press {a} again!', { n: SHOP_PRICE, a: P.keyName('a') });
      } else say = t('Stardust for a surprise? Bring me {n} ★! (you have {have})', { n: SHOP_PRICE, have: pr ? pr.dust : 0 });
    } else if (n.wants && !n.granted && p.food === n.wants) {
      // the treat they wished for: a present in return
      n.granted = true; p.food = null;
      const G = P.progress;
      if (G) { G.give(p, true, 2); G.addDust(p, 40); }
      say = t('For me? Oh, thank you, {name}! Take this, it’s yours.', { name: p.name });
      audio.jingle('friendUp');
      n.setEmote('heart', 2);
      P.world.fx.emit('heart', n.pos.x, 1.8, n.pos.z, 3);
      P.showBanner(t('{name} brought {npc} {food}!', { name: p.name, npc: n.def.short, food: t(FOODS[n.wants].a) }), t('a rare present and 40 stardust in return'));
    } else if (n.wants && !n.granted && Math.random() < 0.5) say = t('If you find {food}, bring it to me — I’d trade you something nice!', { food: t(FOODS[n.wants].a) });
    else say = t(n.tips[Math.floor(Math.random() * n.tips.length)]);
    n.bubble = say; n.bubbleT = n.shop ? 4.5 : 3.5; n.lookAt = p.pos; n.talking = true; n.speaking = false;
    const v = n.def && n.def.voice;
    audio.blip({ pitch: v ? v.pitch : 52, wave: v ? v.wave : 'triangle' });
  }

  // the host menu's Travel tab
  menuItems() {
    return this.attuned().map((s) => ({ id: 'travel:' + s.name, kind: 'button', label: s.name, cap: true, sub: ZNAME[s.zone] || '', color: s.zone === 'valley' ? '#e0a526' : '#5a7ab8', confirm: true }));
  }

  // little crystals on the world map: blue when attuned, grey when only seen
  // on the part of the world map someone has explored (so it stays there between sessions)
  revealed(o) { const WM = this.party.big && this.party.big.worldMap; return !!(WM && WM.revealed(o.x, o.z)); }

  mapMarks(out = []) {
    for (const s of this.stones) if (s.attuned || s.seen || this.revealed(s)) out.push({ k: 'stone', x: s.x, z: s.z, on: s.attuned, name: this.title(s), st: s.attuned ? t('Attuned: you can travel here') : t('Not attuned yet') });
    return out;
  }
  drawMapMarks(ctx, M) { drawMarks(ctx, M, this.mapMarks(), this.party.t); }

  dispose() { this.clearTravelers(); }
}

export { stoneIcon } from './mapmarks.js';
