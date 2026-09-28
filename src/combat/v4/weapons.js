// Weapons (Adventure v4). Every hero has four kinds of weapon, each with its
// own model, combo, heavy and feel — the knight's frying pan, rolling pin,
// mallet and wooden sword; the mage's star wand, staff, crystal orb and tome;
// the ranger's slingshot, bow, boomerang and blowpipe; the bard's lute, drum,
// flute and harp. A weapon is an item in the gear bag: common, rare, epic or
// legendary, with an item level, one trait from rare up (two when epic), and
// legendaries have a name and an effect of their own. Each hero class keeps
// its own weapon (gear.weapons[cls]); no weapon = the hero's first kind.
// Pure data + helpers (the phone reads it too).

import { WEAPONS9, WEAPON_ORDER9, LEGENDS9 } from '../v9/weapons9.js';

const I = (g, s) => ({ g, s });

// ------------------------------------------------------------------ the kinds
// light / heavy replace the hero's (see classes.js for the fields); new ones:
// fan (n shots spread over `spread`), returns (a boomerang), chain (zaps to n
// neighbours), pulse (ball lightning), cloud (a poison cloud where it lands),
// quake (a small shockwave where a swing lands), lunge (a step forward).
export const WEAPONS = {
  // ---- the knight
  pan: { cls: 'knight', name: 'Frying Pan', prop: 'pan', icon: I('pan', 'phys'), desc: 'Rosa’s best: solid swings and a big slam.' },
  rollingpin: {
    cls: 'knight', name: 'Rolling Pin', prop: 'rollingpin', icon: I('rollingpin', 'phys'), desc: 'Quick: a four-hit combo of lighter blows.',
    light: [
      { kind: 'melee', dmg: 7, range: 1.15, arc: 2.2, knock: 1.1, windup: 0.05, recover: 0.1, pose: 'swing', sfx: 'whack' },
      { kind: 'melee', dmg: 7, range: 1.15, arc: 2.2, knock: 1.1, windup: 0.05, recover: 0.1, pose: 'backswing', sfx: 'whack' },
      { kind: 'melee', dmg: 8, range: 1.15, arc: 2.2, knock: 1.4, windup: 0.05, recover: 0.12, pose: 'swing', sfx: 'whack' },
      { kind: 'melee', dmg: 13, range: 1.3, arc: 2.5, knock: 3.8, launch: 4, windup: 0.1, recover: 0.26, pose: 'smash', sfx: 'bonk', hitstop: 0.05 },
    ],
    heavy: { kind: 'aoe', name: 'Rolling Thunder', dmg: 20, at: 1.1, r: 1.8, knock: 4.5, stun: 0.5, windup: 0.12, recover: 0.32, pose: 'smash', sfx: 'slam', hitstop: 0.06, shake: 0.25 },
  },
  mallet: {
    cls: 'knight', name: 'Mallet', prop: 'mallet', icon: I('hammer', 'phys'), desc: 'Slow and mighty: its third blow shakes the ground.',
    light: [
      { kind: 'melee', dmg: 15, range: 1.3, arc: 2.2, knock: 2.8, windup: 0.14, recover: 0.26, pose: 'swing', sfx: 'bonk' },
      { kind: 'melee', dmg: 15, range: 1.3, arc: 2.2, knock: 2.8, windup: 0.14, recover: 0.26, pose: 'backswing', sfx: 'bonk' },
      { kind: 'melee', dmg: 24, range: 1.45, arc: 2.6, knock: 5, launch: 5, windup: 0.2, recover: 0.4, pose: 'smash', sfx: 'slam', hitstop: 0.08, quake: 1.6 },
    ],
    heavy: { kind: 'aoe', name: 'Big Bonk', dmg: 36, at: 1.0, r: 2.6, knock: 6.5, launch: 4, stun: 0.9, windup: 0.3, recover: 0.5, pose: 'smash', sfx: 'slam', hitstop: 0.1, shake: 0.5, echo: true, elem: 'shock' },
  },
  sword: {
    cls: 'knight', name: 'Wooden Sword', prop: 'sword', icon: I('sword', 'phys'), desc: 'Long reach and a lunge; the heavy spins all around.',
    light: [
      { kind: 'melee', dmg: 9, range: 1.75, arc: 1.7, knock: 1.6, windup: 0.07, recover: 0.15, pose: 'swing', sfx: 'whack' },
      { kind: 'melee', dmg: 9, range: 1.75, arc: 1.7, knock: 1.6, windup: 0.07, recover: 0.15, pose: 'backswing', sfx: 'whack' },
      { kind: 'melee', dmg: 14, range: 1.95, arc: 1.2, knock: 3.6, windup: 0.1, recover: 0.28, pose: 'point', sfx: 'whoosh', lunge: 5, hitstop: 0.05 },
    ],
    heavy: { kind: 'aoe', name: 'Twirl Slash', dmg: 24, at: 0, r: 2.1, knock: 3.8, windup: 0.14, recover: 0.36, pose: 'swing', sfx: 'whoosh', hitstop: 0.06, shake: 0.2, twirl: true },
  },
  // ---- the mage
  wand: { cls: 'mage', name: 'Star Wand', prop: 'wand', icon: I('wand', 'arcane'), desc: 'Homing star bolts and a fiery comet.' },
  staff: {
    cls: 'mage', name: 'Staff', prop: 'staff', icon: I('staff', 'frost'), desc: 'Slow orbs that go right through the gloom.',
    light: [{ kind: 'shot', dmg: 12, speed: 8, r: 0.34, life: 1.2, pierce: 3, homing: 1, windup: 0.08, recover: 0.3, pose: 'point', look: 'orb', sfx: 'zap' }],
    heavy: { kind: 'shot', name: 'Sunorb', dmg: 26, speed: 5.5, r: 0.62, life: 1.8, pierce: 99, knock: 3, windup: 0.16, recover: 0.4, pose: 'point', look: 'orb', sfx: 'zap', hitstop: 0.05, shake: 0.2, elem: 'fire' },
  },
  orb: {
    cls: 'mage', name: 'Crystal Orb', prop: 'orb', icon: I('orb', 'storm'), desc: 'Quick sparks that jump from gloom to gloom.',
    light: [{ kind: 'shot', dmg: 7, speed: 13, r: 0.24, life: 0.55, homing: 6, windup: 0.04, recover: 0.16, pose: 'point', look: 'zap', sfx: 'zap', chain: 2 }],
    heavy: { kind: 'shot', name: 'Ball Lightning', dmg: 8, speed: 3.2, r: 0.5, life: 2.6, pierce: 99, knock: 0.8, windup: 0.12, recover: 0.4, pose: 'point', look: 'zap', sfx: 'zap', pulse: 0.22, elem: 'shock' },
  },
  tome: {
    cls: 'mage', name: 'Spellbook', prop: 'tome', icon: I('book', 'arcane'), desc: 'Fans of little bolts; the heavy is a spiral of eight.',
    light: [{ kind: 'shot', dmg: 6, speed: 10, r: 0.22, life: 0.7, fan: 3, spread: 0.5, windup: 0.06, recover: 0.24, pose: 'point', look: 'page', sfx: 'zap' }],
    heavy: { kind: 'shot', name: 'Spiral', dmg: 10, speed: 8, r: 0.26, life: 0.9, fan: 8, spread: Math.PI * 2, homing: 2, windup: 0.12, recover: 0.4, pose: 'point', look: 'page', sfx: 'zap', shake: 0.15 },
  },
  // ---- the ranger
  slingshot: { cls: 'ranger', name: 'Slingshot', prop: 'slingshot', icon: I('slingshot', 'nature'), desc: 'Rapid acorns and pinecone bombs.' },
  bow: {
    cls: 'ranger', name: 'Bow', prop: 'bow', icon: I('bow', 'nature'), desc: 'Arrows fly far and pierce; the heavy goes through everything.',
    light: [{ kind: 'shot', dmg: 11, speed: 18, r: 0.18, life: 0.7, pierce: 1, windup: 0.08, recover: 0.26, pose: 'point', look: 'arrow', sfx: 'flick' }],
    heavy: { kind: 'shot', name: 'Piercing Shot', dmg: 30, speed: 24, r: 0.3, life: 0.9, pierce: 99, knock: 4, windup: 0.14, recover: 0.36, pose: 'point', look: 'arrow', sfx: 'whoosh', hitstop: 0.05, shake: 0.15 },
  },
  boomerang: {
    cls: 'ranger', name: 'Boomerang', prop: 'boomerang', icon: I('boomerang', 'nature'), desc: 'It flies out, hits everything on the way, and comes back.',
    light: [{ kind: 'shot', dmg: 9, speed: 11, r: 0.3, life: 1.1, pierce: 99, returns: 1, windup: 0.06, recover: 0.32, pose: 'point', look: 'boomerang', sfx: 'whoosh' }],
    heavy: { kind: 'shot', name: 'Three Boomerangs', dmg: 12, speed: 11, r: 0.32, life: 1.2, pierce: 99, returns: 1, fan: 3, spread: 0.9, windup: 0.12, recover: 0.4, pose: 'point', look: 'boomerang', sfx: 'whoosh' },
  },
  blowpipe: {
    cls: 'ranger', name: 'Blowpipe', prop: 'blowpipe', icon: I('dart', 'nature'), desc: 'Fast venomous darts; the heavy leaves a toxic cloud.',
    light: [{ kind: 'shot', dmg: 5, speed: 16, r: 0.15, life: 0.6, windup: 0.03, recover: 0.11, pose: 'point', look: 'dart', sfx: 'flick', elem: 'poison', move: 1 }],
    heavy: { kind: 'shot', name: 'Spore Dart', dmg: 8, speed: 14, r: 0.22, life: 0.8, windup: 0.1, recover: 0.3, pose: 'point', look: 'dart', sfx: 'flick', elem: 'poison', cloud: { r: 1.8, life: 4 } },
  },
  // ---- the bard
  lute: { cls: 'bard', name: 'Lute', prop: 'lute', icon: I('lute', 'song'), desc: 'Knock-back notes and a power chord.' },
  drum: {
    cls: 'bard', name: 'Drum', prop: 'drum', icon: I('drum', 'storm'), desc: 'Beats that boom all around you.',
    light: [
      { kind: 'aoe', dmg: 7, at: 0, r: 1.7, knock: 2.2, windup: 0.06, recover: 0.22, pose: 'strum', sfx: 'bonk', ring: '#e0a526' },
      { kind: 'aoe', dmg: 7, at: 0, r: 1.7, knock: 2.2, windup: 0.06, recover: 0.22, pose: 'strum', sfx: 'bonk', ring: '#e0a526' },
      { kind: 'aoe', dmg: 11, at: 0, r: 2.2, knock: 3.5, windup: 0.08, recover: 0.3, pose: 'strum', sfx: 'slam', ring: '#ffd66b', shake: 0.12 },
    ],
    heavy: { kind: 'aoe', name: 'Big Boom', dmg: 22, at: 0, r: 3.2, knock: 7, stun: 0.6, windup: 0.18, recover: 0.4, pose: 'strum', sfx: 'slam', shake: 0.3, ring: '#ffd66b' },
  },
  flute: {
    cls: 'bard', name: 'Flute', prop: 'flute', icon: I('flute', 'song'), desc: 'Swift notes that fly far and pierce.',
    light: [{ kind: 'shot', dmg: 6, speed: 12, r: 0.25, life: 0.7, pierce: 4, knock: 1.6, windup: 0.04, recover: 0.13, pose: 'point', look: 'note2', sfx: 'pluck' }],
    heavy: { kind: 'shot', name: 'Melody', dmg: 9, speed: 12, r: 0.28, life: 0.8, pierce: 4, knock: 2.5, fan: 5, spread: 0.3, windup: 0.1, recover: 0.36, pose: 'point', look: 'note', sfx: 'chord' },
  },
  harp: {
    cls: 'bard', name: 'Harp', prop: 'harp', icon: I('harp', 'holy'), desc: 'Gentle notes that find their way to the gloom.',
    light: [{ kind: 'shot', dmg: 7, speed: 8, r: 0.3, life: 1.1, homing: 5, pierce: 1, knock: 1.5, windup: 0.06, recover: 0.2, pose: 'strum', look: 'note', sfx: 'pluck' }],
    heavy: { kind: 'shot', name: 'Arpeggio', dmg: 9, speed: 8, r: 0.3, life: 1.3, homing: 5, pierce: 1, fan: 5, spread: 1.2, windup: 0.12, recover: 0.4, pose: 'strum', look: 'note2', sfx: 'chord' },
  },
};
export const WEAPON_ORDER = {
  knight: ['pan', 'rollingpin', 'mallet', 'sword'], mage: ['wand', 'staff', 'orb', 'tome'],
  ranger: ['slingshot', 'bow', 'boomerang', 'blowpipe'], bard: ['lute', 'drum', 'flute', 'harp'],
  ...WEAPON_ORDER9,
};
Object.assign(WEAPONS, WEAPONS9);          // (Release v9: the four new heroes' weapons)

// ------------------------------------------------------------------ rarity & traits
export const RARITY = [
  null,
  { name: 'Common', color: '#c9c4cc', dmg: 0, traits: 0 },
  { name: 'Rare', color: '#5aa8f2', dmg: 0.06, traits: 1 },
  { name: 'Epic', color: '#b86aff', dmg: 0.12, traits: 2 },
  { name: 'Legendary', color: '#ffb040', dmg: 0.2, traits: 1 },
];
export const TRAITS = {
  blazing: { name: 'Blazing', desc: 'Hits often burn', mod: (m) => { m.elem = m.elem || 'fire'; m.elemChance = Math.max(m.elemChance, 0.28); } },
  frost: { name: 'Frostbitten', desc: 'Hits often chill', mod: (m) => { m.elem = m.elem || 'ice'; m.elemChance = Math.max(m.elemChance, 0.28); } },
  storm: { name: 'Stormy', desc: 'Hits often shock', mod: (m) => { m.elem = m.elem || 'shock'; m.elemChance = Math.max(m.elemChance, 0.28); } },
  venom: { name: 'Venomous', desc: 'Hits often poison', mod: (m) => { m.elem = m.elem || 'poison'; m.elemChance = Math.max(m.elemChance, 0.28); } },
  vampiric: { name: 'Vampiric', desc: 'Every hit heals you 2', mod: (m) => { m.lifesteal += 2; } },
  swift: { name: 'Swift', desc: 'Attack 12% faster', mod: (m) => { m.recover *= 0.88; } },
  mighty: { name: 'Mighty', desc: '+12% damage', mod: (m) => { m.dmg *= 1.12; } },
  giant: { name: 'Giant', desc: 'Attacks reach 20% further', mod: (m) => { m.range *= 1.2; } },
  echo: { name: 'Echoing', desc: 'Your special recharges 15% faster', mod: (m) => { m.cdr *= 0.85; } },
  lucky: { name: 'Lucky', desc: '+8% critical hits', mod: (m) => { m.crit += 0.08; } },
};
export const TRAIT_ORDER = Object.keys(TRAITS);

// the legendaries: a name, the kind they are, and an effect of their own (m.legend)
export const LEGENDS = {
  castiron: { type: 'pan', name: 'Rosa’s Cast Iron', desc: 'Pan Slam also heals your friends around you.' },
  thunder: { type: 'mallet', name: 'Thundermallet', desc: 'Your blows often call down lightning.' },
  suntail: { type: 'staff', name: 'Suntail Staff', desc: 'Your orbs burst into flames when they fade.' },
  moontome: { type: 'tome', name: 'The Moonlit Tome', desc: 'Every fifth spell adds a full moon that seeks the gloom.' },
  galewing: { type: 'bow', name: 'Galewing', desc: 'Your arrows split in three when they hit.' },
  homecoming: { type: 'boomerang', name: 'Homecoming', desc: 'Your boomerangs fly out and back twice.' },
  hearthlute: { type: 'lute', name: 'Heart of the Hearth', desc: 'Hearth Song’s light also scorches the gloom.' },
  thunderdrum: { type: 'drum', name: 'Thunderdrum', desc: 'Your beats often strike lightning.' },
  ...LEGENDS9,
};

// ------------------------------------------------------------------ items
let seq = Date.now() % 100000;
const pick = (list, rnd) => list[Math.floor(rnd() * list.length)];

// a weapon for a hero class (rarity 1..4, item level ~ the hero's level)
export function rollWeapon(cls, rarity = 1, level = 1, rnd = Math.random) {
  let type = pick(WEAPON_ORDER[cls] || WEAPON_ORDER.knight, rnd), legend = null;
  if (rarity >= 4) {
    const L = Object.entries(LEGENDS).filter(([, d]) => WEAPONS[d.type].cls === cls);
    const [id, d] = pick(L, rnd);
    legend = id; type = d.type;
  }
  const traits = [];
  const n = RARITY[rarity].traits;
  while (traits.length < n) { const t = pick(TRAIT_ORDER, rnd); if (!traits.includes(t)) traits.push(t); }
  return { id: 'w' + (seq++).toString(36), kind: 'weapon', type, cls, rarity, lv: Math.max(1, Math.round(level)), traits, legend };
}

export function weaponName(it) { return it.legend ? LEGENDS[it.legend].name : WEAPONS[it.type] ? WEAPONS[it.type].name : '?'; }
export function weaponOf(prof, cls) {
  const G = prof && prof.gear;
  const id = G && G.weapons && G.weapons[cls];
  return id ? (G.bag || []).find((q) => q.id === id && q.kind === 'weapon') || null : null;
}
// damage bonus: rarity + item level
export const weaponDmg = (it) => (it ? RARITY[it.rarity].dmg + it.lv * 0.006 : 0);

// the hero's moves with this weapon in hand (the class's own when it has none)
export function weaponMoves(cls, it) {
  const W = it && WEAPONS[it.type];
  if (!W || !W.light) return cls;
  return { ...cls, light: W.light, heavy: W.heavy };
}

export function weaponMods(m, it) {
  if (!it) return m;
  m.dmg *= 1 + weaponDmg(it);
  for (const tr of it.traits || []) if (TRAITS[tr]) TRAITS[tr].mod(m);
  if (it.legend) m.legend = it.legend;
  return m;
}
