// Party Mode fighting classes. Every hero fights with something from the
// cove: Rosa's frying pan, a star wand, an acorn slingshot, Sol's old lute.
//
// Attack kinds (see combat.js):
//   melee  — arc in front of you (range, arc), hits once per swing
//   shot   — projectile (speed, r, life, pierce, homing, gravity, explode)
//   aoe    — area around a point ahead of you (at, r)
//   spin   — keeps hitting around you for `dur` while you move slowly
//   heal   — heals & revives friends around you
//   starfall, volley — class specials
// Times in seconds: windup (before it hits), active, recover (after).

import { CLASSES9, ORDER9 } from './v9/classes9.js';

export const CLASSES = {
  knight: {
    name: 'Knight', weapon: 'pan', color: '#e0a526', icon: 'pan',
    icons: { light: { g: 'pan', s: 'phys' }, heavy: { g: 'quake', s: 'storm' }, special: { g: 'whirl', s: 'phys' }, air: { g: 'shock', s: 'phys' } },
    desc: 'Whacks the gloom with Rosa’s best frying pan. Tough, loves a crowd.',
    role: 'Close combat · sturdy', stats: { tough: 5, reach: 1, speed: 2, help: 2 },
    kit: 'June’s old frying pan. Heavy as a promise — and you picked it up like it weighed nothing.',
    ready: 'Good thing you’ve got that frying pan.',
    hp: 150, speed: 1, armor: 0.15,
    light: [
      { kind: 'melee', dmg: 10, range: 1.25, arc: 2.3, knock: 1.6, windup: 0.08, recover: 0.16, pose: 'swing', sfx: 'whack' },
      { kind: 'melee', dmg: 10, range: 1.25, arc: 2.3, knock: 1.6, windup: 0.08, recover: 0.16, pose: 'backswing', sfx: 'whack' },
      { kind: 'melee', dmg: 17, range: 1.4, arc: 2.6, knock: 4.2, launch: 4.5, windup: 0.13, recover: 0.3, pose: 'smash', sfx: 'bonk', hitstop: 0.06 },
    ],
    heavy: { kind: 'aoe', name: 'Pan Slam', dmg: 28, at: 1.0, r: 2.1, knock: 5.5, launch: 3, stun: 0.7, windup: 0.18, recover: 0.4, pose: 'smash', sfx: 'slam', hitstop: 0.08, shake: 0.35, elem: 'shock' },
    special: { kind: 'spin', name: 'Whirlwind', cd: 7, dur: 1.5, dmg: 8, r: 1.6, knock: 2.6, every: 0.24, move: 0.7, armor: 0.5, sfx: 'whoosh' },
    air: { kind: 'aoe', name: 'Belly Flop', dmg: 14, at: 0, r: 1.5, knock: 3.5, onLand: true, sfx: 'slam', shake: 0.2 },
  },
  mage: {
    name: 'Mage', weapon: 'wand', color: '#8fb7ff', icon: 'wand',
    icons: { light: { g: 'star', s: 'arcane' }, heavy: { g: 'comet', s: 'fire' }, special: { g: 'sparkles', s: 'frost' } },
    desc: 'Star bolts, comets and a sky full of falling stars. Fragile — stay back!',
    role: 'Magic from afar · fragile', stats: { tough: 1, reach: 5, speed: 2, help: 2 },
    kit: 'June’s star wand. It hasn’t sparkled in years — and look at it now, in your hand.',
    ready: 'Good thing you’ve got that star wand.',
    hp: 95, speed: 1, armor: 0,
    light: [
      { kind: 'shot', dmg: 9, speed: 11, r: 0.28, life: 0.9, homing: 3, windup: 0.05, recover: 0.2, pose: 'point', look: 'star', sfx: 'zap' },
    ],
    heavy: { kind: 'shot', name: 'Comet', dmg: 12, speed: 7.5, r: 0.42, life: 1.0, explode: { r: 1.7, dmg: 24, knock: 4.5 }, windup: 0.12, recover: 0.35, pose: 'point', look: 'comet', sfx: 'zap', hitstop: 0.05, shake: 0.25, elem: 'fire' },
    special: { kind: 'starfall', name: 'Starfall', cd: 9, count: 6, r: 1.15, dmg: 15, knock: 3, range: 7, sfx: 'sparkle', elem: 'ice' },
    air: null,
  },
  ranger: {
    name: 'Ranger', weapon: 'slingshot', color: '#8fd67a', icon: 'acorn',
    icons: { light: { g: 'acorn', s: 'nature' }, heavy: { g: 'pinecone', s: 'nature' }, special: { g: 'arrows', s: 'nature' } },
    desc: 'Rapid acorns and pinecone bombs, fast on their feet. Keep moving!',
    role: 'Quick shots · on the move', stats: { tough: 2, reach: 4, speed: 5, help: 1 },
    kit: 'June’s slingshot. She could knock an acorn off a squirrel’s head at forty paces. The squirrel never forgave her.',
    ready: 'Good thing you’ve got that slingshot.',
    hp: 110, speed: 1.15, armor: 0,
    light: [
      { kind: 'shot', dmg: 7, speed: 15, r: 0.2, life: 0.55, windup: 0.03, recover: 0.13, pose: 'point', look: 'acorn', move: 1, sfx: 'flick' },
    ],
    heavy: { kind: 'shot', name: 'Pinecone Bomb', dmg: 6, speed: 7, r: 0.3, life: 1.2, gravity: 11, lob: 5, explode: { r: 1.8, dmg: 24, knock: 5 }, windup: 0.12, recover: 0.3, pose: 'point', look: 'pinecone', sfx: 'flick', shake: 0.25, elem: 'poison' },
    special: { kind: 'volley', name: 'Acorn Volley', cd: 7, count: 7, spread: 1.25, dmg: 8, speed: 15, r: 0.2, life: 0.6, dash: 3.2, sfx: 'flick' },
    air: null,
  },
  bard: {
    name: 'Bard', weapon: 'lute', color: '#f59ac8', icon: 'note',
    icons: { light: { g: 'note', s: 'song' }, heavy: { g: 'shock', s: 'song' }, special: { g: 'heart', s: 'holy' } },
    desc: 'Knock-back notes and a song that heals — and wakes — the whole party.',
    role: 'Support · heals the group', stats: { tough: 3, reach: 2, speed: 3, help: 5 },
    kit: 'June’s lute. Sol swore it was out of tune. June swore it was the world that was.',
    ready: 'Good thing you’ve got that lute.',
    hp: 115, speed: 1, armor: 0.05,
    light: [
      { kind: 'shot', dmg: 8, speed: 8.5, r: 0.38, life: 0.34, pierce: 2, knock: 2.8, windup: 0.06, recover: 0.2, pose: 'strum', look: 'note', sfx: 'pluck' },
      { kind: 'shot', dmg: 8, speed: 8.5, r: 0.38, life: 0.34, pierce: 2, knock: 2.8, windup: 0.06, recover: 0.2, pose: 'strum', look: 'note2', sfx: 'pluck' },
      { kind: 'shot', dmg: 12, speed: 9, r: 0.45, life: 0.38, pierce: 3, knock: 4.5, windup: 0.08, recover: 0.28, pose: 'strum', look: 'note', sfx: 'pluck' },
    ],
    heavy: { kind: 'aoe', name: 'Power Chord', dmg: 16, at: 0, r: 2.3, knock: 6.5, windup: 0.14, recover: 0.35, pose: 'strum', sfx: 'chord', shake: 0.2, ring: '#f59ac8' },
    special: { kind: 'heal', name: 'Hearth Song', cd: 10, r: 5.5, heal: 0.4, revive: true, buff: { dmg: 0.2, t: 6 }, sfx: 'song' },
    air: null,
  },
};

export const CLASS_ORDER = ['knight', 'mage', 'ranger', 'bard', ...ORDER9];
Object.assign(CLASSES, CLASSES9);         // (Release v9: the Lamplighter, the Gardener, the Cook, the Tinkerer)
// the four bars of a hero's card (the creator, the Hero page): 1–5 each
export const STAT_NAMES = { tough: 'Toughness', reach: 'Reach', speed: 'Speed', help: 'Support' };
export const DODGE_ICON = { g: 'dash', s: 'phys' };

// the phone's buttons show the moves' icons (c: the buttons' English labels; md: the mount ridden)
export function padIcons(c, f, md = null) {
  const ic = {};
  if (c.a === 'Sleep') ic.a = { g: 'moon', s: 'arcane' }; else if (c.a === 'Wake up') ic.a = { g: 'sun', s: 'holy' };
  if (md) {
    if (c.a && c.a === md.attack.name) ic.a = md.attack.icon;
    if (c.x && c.x === md.ability.name) ic.x = md.ability.icon;
  } else if (f && !f.down) {
    const I = f.cls.icons || {}, sp = (f.moves || f.cls).special;
    if (c.a === 'Attack') ic.a = I.light; else if (c.a === 'Release!') ic.a = I.heavy;
    if (c.x && sp && c.x === sp.name) ic.x = I.special;
  }
  if (c.y === 'Dodge') ic.y = DODGE_ICON;
  return Object.keys(ic).length ? ic : null;
}
