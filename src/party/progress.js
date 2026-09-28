// Growing stronger between fights: talent points and gear, kept per phone.
// The phone shows your hero's tree and your bag; this is the big screen's
// side — it checks what the phone asks for, updates the profile, refreshes
// the fighter and tells the phone. Chests drop gear; stardust pays upgrades.

import { canLearn, pointsFor, picksOf, spent, rankOf, migrateTalents, TALENT } from '../combat/v4/talents.js';
import { rollItem, lootLevel, itemName, itemTag, meltValue, freshGear, UPGRADE, BAG, ROMAN } from '../combat/v3/gear.js';
import { rollWeapon, RARITY } from '../combat/v4/weapons.js';
import { CLASSES } from '../combat/classes.js';
import { audio } from '../engine/audio.js';
import { t } from '../i18n.js';

export class Progress {
  constructor(party) { this.party = party; }

  prof(p) {
    const pr = this.party.profileOf(p);
    if (!pr.talents) pr.talents = {};
    // the little v3 trees grew into full ones: the points come back to spend
    if (migrateTalents(pr)) { this.party.profileDirty = true; this.party.toast(t('{name}: your talent trees have grown — your points are back to spend!', { name: p.name }), p.color); }
    if (!pr.gear) pr.gear = freshGear();
    if (!pr.gear.weapons) pr.gear.weapons = {};
    if (typeof pr.dust !== 'number') pr.dust = 0;
    return pr;
  }

  level(p) { return p.fighter ? p.fighter.level : this.prof(p).level || 1; }

  // everything the phone's Talents & Gear screens need
  sync(p) {
    if (p.kind !== 'phone' || !p.connected) return;
    const pr = this.prof(p), cls = p.cls || 'knight', lv = this.level(p);
    const picks = picksOf(pr, cls);
    const msg = { t: 'prog', cls, level: lv, points: Math.max(0, pointsFor(lv) - spent(picks)), talents: picks, gear: pr.gear, dust: pr.dust };
    const key = JSON.stringify(msg);
    if (key === p.progKey) return;
    p.progKey = key;
    this.party.net.send(p.id, msg);
  }

  refresh(p) {
    const C = this.party.combat;
    if (C && p.fighter) C.refreshStats(p, false);
    this.party.profileDirty = true;
    this.sync(p);
  }

  onMsg(p, d) {
    const pr = this.prof(p), cls = p.cls || 'knight';
    if (d.t === 'talent') {
      const picks = picksOf(pr, cls);
      if (!canLearn(cls, picks, d.id, this.level(p))) return;
      picks[d.id] = rankOf(picks, d.id) + 1;
      audio.sfx('levelup', { volume: 0.4 });
      const T = TALENT[d.id];
      if (T.ult) this.party.toast(t('{name} learned the ultimate {ult}! Fight to fill its gauge, then press {u}.', { name: p.name, ult: t(T.name), u: this.party.keyOf ? this.party.keyOf(p, 'u') : 'U' }), p.color);
      this.party.world.fx.emit('sparkle', p.pos.x, 1.4, p.pos.z, 14, { color: CLASSES[cls].color });
      this.refresh(p);
    } else if (d.t === 'talentReset') {
      pr.talents[cls] = {};
      this.refresh(p);
    } else if (d.t === 'gear') {
      const G = pr.gear, it = G.bag.find((q) => q.id === d.id);
      if (!it) return;
      if (d.op === 'equip') {
        if (it.kind === 'weapon') G.weapons[it.cls] = it.id;
        else if (it.kind === 'rune') G.rune = it.id;
        else if (!G.charms.includes(it.id)) { const i = typeof d.slot === 'number' && d.slot >= 0 && d.slot < 2 ? d.slot : G.charms[0] ? 1 : 0; G.charms[i] = it.id; }
        audio.sfx('place', { volume: 0.5 });
      } else if (d.op === 'unequip') {
        if (it.kind === 'weapon' && G.weapons[it.cls] === it.id) delete G.weapons[it.cls];
        if (G.rune === it.id) G.rune = null;
        G.charms = G.charms.map((q) => (q === it.id ? null : q));
      } else if (d.op === 'upgrade') {
        const cost = it.kind === 'weapon' ? 0 : UPGRADE[it.lv];
        if (!cost || pr.dust < cost) return;
        pr.dust -= cost; it.lv++;
        audio.sfx('levelup', { volume: 0.5 });
        this.party.toast(t('{name} upgraded {item} to {lv}!', { name: p.name, item: t(itemName(it)), lv: ROMAN[it.lv] }), p.color);
      } else if (d.op === 'drop') {
        if (G.rune === it.id) G.rune = null;
        if (it.kind === 'weapon' && G.weapons[it.cls] === it.id) delete G.weapons[it.cls];
        G.charms = G.charms.map((q) => (q === it.id ? null : q));
        G.bag = G.bag.filter((q) => q !== it);
        pr.dust += meltValue(it);
      }
      this.refresh(p);
    }
  }

  // a piece of gear for someone (a full bag turns it into stardust): a rune,
  // a charm, or a weapon for their hero (now and then a legendary one)
  give(p, rich = false, min = 1) {
    const pr = this.prof(p), lvl = this.level(p);
    const rarity = Math.max(min, lootLevel(rich, lvl));
    const weapon = Math.random() < (rich ? 0.45 : 0.35);
    const legend = weapon && Math.random() < (rich ? 0.1 : 0.025) + (min >= 2 ? 0.05 : 0);
    const it = weapon ? rollWeapon(p.cls || 'knight', legend ? 4 : rarity, lvl) : rollItem(rarity);
    const P = this.party;
    if (pr.gear.bag.length >= BAG) {
      const n = weapon ? 30 * it.rarity : 25 * it.lv;
      pr.dust += n;
      P.toast(t('{name}’s bag is full — {n} stardust instead', { name: p.name, n }), p.color);
    } else {
      pr.gear.bag.push(it);
      if (weapon) P.toast(t(legend ? '{name} found a LEGENDARY weapon: {item}!' : '{name} found {item} ({rarity})!', { name: p.name, item: t(itemName(it)), rarity: t(RARITY[it.rarity].name) }), legend ? '#ffb040' : p.color);
      else P.toast(t('{name} found {item} {lv}!', { name: p.name, item: t(itemName(it)), lv: itemTag(it) }), p.color);
      P.buzz(p, legend ? [40, 30, 40, 30, 120] : [20, 40, 20]);
    }
    this.refresh(p);
    return it;
  }

  // a chest opened: everyone close by gets something
  chestLoot(c, opener) {
    for (const p of this.party.players) {
      if (!p.connected) continue;
      if (p !== opener && Math.hypot(p.pos.x - c.x, p.pos.z - c.z) > 8) continue;
      this.give(p, !!c.rich, c.golden ? 2 : 1);     // golden chests: rare or better
    }
  }

  // stardust picked up counts towards upgrades
  addDust(p, n = 1) { const pr = this.prof(p); pr.dust += n; this.party.profileDirty = true; }

  // a new level: tell the phone there's a point to spend
  onLevel(p) {
    const pr = this.prof(p), cls = p.cls || 'knight';
    const left = pointsFor(this.level(p)) - spent(picksOf(pr, cls));
    if (left > 0 && p.kind === 'phone') this.party.toast(t('{name} has a talent point to spend!', { name: p.name }), p.color);
    // (no phone: their menu on the big screen — solo nudges on its own)
    else if (left > 0 && !this.party.solo && this.party.keyOf) this.party.toast(t('{name} has a talent point to spend! ({key}: the menu)', { name: p.name, key: this.party.keyOf(p, 'm') }), p.color);
    this.sync(p);
  }

  update(dt) { this.t = (this.t || 0) - dt; if (this.t > 0) return; this.t = 0.5; for (const p of this.party.players) this.sync(p); }
}
