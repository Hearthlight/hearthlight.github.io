// Gear: a rune for your weapon (it gives your hits an element) and two
// charms (little stat perks) — and, since Adventure v4, the weapons
// themselves (see v4/weapons.js). Found in chests (camps, bosses, the valley's
// nests), kept in a bag on your phone, runes & charms upgraded with stardust.
// Three levels: I (common), II (rare), III (epic). Pure data — the phone reads it too.

import { WEAPONS, RARITY, TRAITS, LEGENDS, weaponName } from '../v4/weapons.js';

export const RUNES = {
  fire: { name: 'Fire Rune', elem: 'fire', color: '#ff8a3a', desc: 'Your hits often burn · +{n}% damage' },
  ice: { name: 'Frost Rune', elem: 'ice', color: '#9fdcff', desc: 'Your hits often chill · +{n}% damage' },
  poison: { name: 'Venom Rune', elem: 'poison', color: '#8fdc5a', desc: 'Your hits often poison · +{n}% damage' },
  shock: { name: 'Storm Rune', elem: 'shock', color: '#ffe066', desc: 'Your hits often shock · +{n}% damage' },
};
const L3 = (a, b, c) => (lv) => [a, b, c][Math.max(0, Math.min(2, lv - 1))];
export const CHARMS = {
  heart: { name: 'Heart Charm', desc: '+{n}% max health', n: L3(12, 22, 34), color: '#ef6479', mod: (m, n) => { m.hpPct += n / 100; } },
  sharp: { name: 'Sharp Charm', desc: '+{n}% damage', n: L3(8, 15, 24), color: '#f4c542', mod: (m, n) => { m.dmg *= 1 + n / 100; } },
  lucky: { name: 'Lucky Charm', desc: '+{n}% critical hits', n: L3(5, 10, 16), color: '#62c46c', mod: (m, n) => { m.crit += n / 100; } },
  swift: { name: 'Swift Charm', desc: '+{n}% move speed', n: L3(6, 11, 17), color: '#5aa8f2', mod: (m, n) => { m.speed *= 1 + n / 100; } },
  thorn: { name: 'Thorn Charm', desc: 'Gloom that hits you takes {n}% back', n: L3(25, 45, 70), color: '#8a5ab0', mod: (m, n) => { m.thorns += n / 100; } },
  leech: { name: 'Leech Charm', desc: 'Heal {n} with every hit', n: L3(1, 2, 3), color: '#d45a8a', mod: (m, n) => { m.lifesteal += n; } },
  quick: { name: 'Quick Charm', desc: 'Special recharges {n}% faster', n: L3(10, 18, 27), color: '#b88cf0', mod: (m, n) => { m.cdr *= 1 - n / 100; } },
  roll: { name: 'Feather Charm', desc: 'Dodge again {n}% sooner', n: L3(20, 32, 45), color: '#dff4ff', mod: (m, n) => { m.rollCd *= 1 - n / 100; } },
  glow: { name: 'Glow Charm', desc: '+{n}% experience', n: L3(12, 22, 35), color: '#fff3a6', mod: (m, n) => { m.xp *= 1 + n / 100; } },
};
export const RUNE_CHANCE = L3(0.22, 0.32, 0.45);      // how often light hits carry the element
export const RUNE_DMG = L3(4, 8, 13);                 // % damage
export const UPGRADE = [0, 60, 160];                  // stardust to reach level II, III
export const BAG = 16;
export const ROMAN = ['', 'I', 'II', 'III'];
export const LEVEL_COLOR = ['', '#c9c4cc', '#5aa8f2', '#b86aff'];

let seq = Date.now() % 100000;
export function rollItem(level = 1, rnd = Math.random) {
  const lv = Math.max(1, Math.min(3, level));
  if (rnd() < 0.35) return { id: 'g' + (seq++).toString(36), kind: 'rune', type: Object.keys(RUNES)[Math.floor(rnd() * 4)], lv };
  const keys = Object.keys(CHARMS);
  return { id: 'g' + (seq++).toString(36), kind: 'charm', type: keys[Math.floor(rnd() * keys.length)], lv };
}

// the loot level: mostly common, rarer with better chests & stronger heroes
export function lootLevel(rich = false, heroLevel = 1, rnd = Math.random) {
  const r = rnd() + (rich ? 0.45 : 0) + Math.min(0.25, heroLevel * 0.02);
  return r > 1.25 ? 3 : r > 0.85 ? 2 : 1;
}

export function itemName(it) {
  if (it.kind === 'weapon') return weaponName(it);
  const D = it.kind === 'rune' ? RUNES[it.type] : CHARMS[it.type];
  return D ? D.name : '?';
}
export function itemColor(it) {
  if (it.kind === 'weapon') return RARITY[it.rarity] ? RARITY[it.rarity].color : '#fff';
  const D = it.kind === 'rune' ? RUNES[it.type] : CHARMS[it.type]; return D ? D.color : '#fff';
}
// the frame colour, the little tag (I, II, III — a weapon's item level), what melting gives
export const itemBorder = (it) => (it.kind === 'weapon' ? itemColor(it) : LEVEL_COLOR[it.lv]);
export const itemTag = (it) => (it.kind === 'weapon' ? String(it.lv) : ROMAN[it.lv]);
export const itemUpgrade = (it) => (it.kind === 'weapon' ? 0 : UPGRADE[it.lv] || 0);
export const meltValue = (it) => (it.kind === 'weapon' ? 20 * it.rarity : 15 * it.lv);
export function isWorn(G, it) { return G.rune === it.id || (G.charms || []).includes(it.id) || !!(G.weapons && G.weapons[it.cls] === it.id); }

// a weapon's lines, for the screens: [English key, vars, colour]
export function weaponLines(it) {
  const W = WEAPONS[it.type], out = [];
  out.push(['{rarity} {kind} · level {lv}', { rarity: RARITY[it.rarity].name, kind: W.name, lv: it.lv }, RARITY[it.rarity].color]);
  if (it.legend) out.push([LEGENDS[it.legend].desc, null, '#b86a1a']);
  for (const tr of it.traits || []) if (TRAITS[tr]) out.push(['{trait}: {what}', { trait: TRAITS[tr].name, what: TRAITS[tr].desc }, '#4f7fb8']);
  out.push([W.desc, null, null]);
  return out;
}

// what an item does, for the phone (English key + its number)
export function itemDesc(it) {
  if (it.kind === 'weapon') return { key: WEAPONS[it.type].desc, vars: {} };
  if (it.kind === 'rune') return { key: RUNES[it.type].desc, vars: { n: RUNE_DMG(it.lv) } };
  const C = CHARMS[it.type];
  return { key: C.desc, vars: { n: C.n(it.lv) } };
}

// apply a hero's gear to their stats (and their weapon's element)
export function gearMods(mods, gear) {
  if (!gear) return mods;
  const find = (id) => (gear.bag || []).find((q) => q.id === id);
  const rune = find(gear.rune);
  if (rune && RUNES[rune.type]) { mods.elem = RUNES[rune.type].elem; mods.elemChance = Math.max(mods.elemChance, RUNE_CHANCE(rune.lv)); mods.dmg *= 1 + RUNE_DMG(rune.lv) / 100; }
  for (const id of gear.charms || []) { const c = find(id); if (c && CHARMS[c.type]) CHARMS[c.type].mod(mods, CHARMS[c.type].n(c.lv)); }
  return mods;
}

export function freshGear() { return { bag: [], rune: null, charms: [null, null], weapons: {} }; }
