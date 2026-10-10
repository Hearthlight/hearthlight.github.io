// World v7: levels. Every land has a fixed level range (layout.js ZONES[].lv),
// monsters keep their level (and their stats follow the heroes' own curves,
// gear & talents included), fights grow with the number of heroes standing
// near them, and heroes fight at an effective level: brought down to the
// land in solo, down or up to it in Party Mode (so a phone that joins late
// plays at once). Pure helpers — combat.js, encounters, lairs & the saga use them.

import { ZONES } from '../world/big/layout.js';
import { MAX_LEVEL } from '../combat/v4/talents.js';

export { MAX_LEVEL };
export const XP_NEED = (lv) => 40 + 30 * lv + lv * lv;

// ---- what players read: twenty levels, two of the game’s own each (1–2 → 1 … 39–40 → 20).
// Lands, monsters, quests and every formula keep the scale of forty; a level becomes a shown
// one only where it reaches somebody’s eyes (never the other way round).
export const shownLevel = (lv) => Math.max(1, Math.ceil((lv || 1) / 2));
export const shownRange = (lv) => [shownLevel(lv[0]), shownLevel(lv[1])];

// the experience bar of a shown level: its two levels end to end — `k` how full, `mid` where
// the first one ends (the notch: a talent point there, the level-up at the end; 0 = no notch,
// the last stretch before the cap), `have`/`need` the numbers, `half` once the notch is passed
export function xpBar(level, xp = 0) {
  if (level >= MAX_LEVEL) return { k: 1, mid: 0, have: 0, need: 0, half: false, max: true };
  const half = level % 2 === 0, a = half ? level - 1 : level;
  const n1 = XP_NEED(a), n2 = a + 1 < MAX_LEVEL ? XP_NEED(a + 1) : 0;
  const have = (half ? n1 : 0) + Math.max(0, Math.min(xp, XP_NEED(level))), need = n1 + n2;
  return { k: have / need, mid: n2 ? n1 / need : 0, have, need, half, max: false };
}

// how a place’s levels sit next to a hero’s own: 0 nothing left to learn there · 1 easy ·
// 2 just right · 3 a challenge · 4 too strong — judged on the levels as they are read, so
// that a hero of level 4 never sees « levels 4–5 » marked as beyond them
export function landFit(lv, own) {
  const [a, b] = shownRange(lv), n = shownLevel(own);
  return n > b + 2 ? 0 : n > b ? 1 : n >= a ? 2 : n >= a - 1 ? 3 : 4;
}

// places with a level of their own that aren't lands (dungeons, the Ring…): { x0, z0, x1, z1, lv, name }
export const REGIONS = [];
export function setRegion(id, rect, lv, name = '') {
  const i = REGIONS.findIndex((r) => r.id === id);
  const r = { id, ...rect, lv, name };
  if (i >= 0) REGIONS[i] = r; else REGIONS.push(r);
}

const ZLV = Object.fromEntries(ZONES.map((z) => [z.id, z.lv || [1, 5]]));
export const zoneLevels = (id) => ZLV[id] || [1, 5];

// the level range at (x, z): a region, the land there, or the valley's
export function levelAt(big, x, z) {
  for (const r of REGIONS) if (x >= r.x0 && x < r.x1 && z >= r.z0 && z < r.z1) return r.lv;
  if (!big) return ZLV.valley;
  return big.zoneAt(x, z).lv || ZLV.valley;
}
// …and the place itself, for the words about it: { id, name, lv }
export function placeAt(big, x, z) {
  for (const r of REGIONS) if (x >= r.x0 && x < r.x1 && z >= r.z0 && z < r.z1) return r;
  const zone = big ? big.zoneAt(x, z) : ZONES[0];
  return { id: zone.id, name: zone.name, lv: zone.lv || ZLV.valley };
}

// a monster's level in a range (steady for a given seed)
export function rollLevel(lv, seed = Math.random()) {
  const [a, b] = lv;
  return Math.min(b, a + Math.floor((seed % 1) * (b - a + 1)));
}

// the heroes' curves (combat.js): health ×(1+0.08(lv−1)), damage ×(1+0.06(lv−1)),
// plus what gear & talents add on the way (a weapon, charms, a rune, talents)
export const hpL = (lv) => (1 + 0.06 * (lv - 1)) * (1 + 0.03 * (lv - 1));
export const dmgL = (lv) => (1 + 0.08 * (lv - 1)) * (1 + 0.012 * (lv - 1));

// heroes near a fight: every one of them makes it bigger
export const groupHp = (n, boss) => 1 + (boss ? 0.9 : 0.8) * Math.max(0, n - 1);
export const groupDmg = (n) => 1 + 0.04 * Math.max(0, n - 1);

// the level gap (monster − hero): what a hero deals and takes
export function gapDealt(gap) {
  const g = Math.max(-5, Math.min(5, gap));
  return g > 0 ? 1 - 0.06 * g : 1 - 0.04 * g;
}
export function gapTaken(gap) {
  const g = Math.max(-5, Math.min(5, gap));
  return g > 0 ? 1 + 0.08 * g : 1 + 0.05 * g;
}

// the level a hero fights at, here — a party is brought up to the land's floor; alone, to two
// below it (quest XP alone can leave a hero 5–7 levels short in chapters 4 to 7: a wall, not a
// challenge — they still feel the gap, just not all of it)
export function effLevel(own, lv, solo) {
  const hi = lv[1] + 2;
  return solo ? Math.max(lv[0] - 2, Math.min(own, hi)) : Math.max(lv[0], Math.min(own, hi));
}

// XP for a defeat, by the monster's level and the hero's own (grey ones give none)
export function killXp(elvl, own, { elite = false, rare = false, boss = false } = {}) {
  const gap = elvl - own;
  const k = gap <= -6 ? 0 : gap <= -3 ? 0.5 : gap <= 2 ? 1 : gap === 3 ? 1.15 : 1.3;
  return Math.round((4 + 2 * elvl) * k * (boss ? 10 : rare ? 5 : elite ? 2 : 1));
}
// XP for a quest of a level: main ≈ 45 % of a level, side 25 %, a dungeon's end 60 %
export function questXp(lv, kind = 'main') {
  return Math.round(XP_NEED(Math.max(1, lv)) * (kind === 'side' ? 0.25 : kind === 'dungeon' ? 0.6 : 0.45));
}

// WoW-like colours for a monster's level next to a hero's
export function levelColor(elvl, own, boss = false) {
  const gap = elvl - own;
  if (boss || gap >= 10) return '#ff4a5a';
  if (gap >= 5) return '#ff6a5a';
  if (gap >= 3) return '#ffa040';
  if (gap >= -2) return '#ffe066';
  if (gap >= -5) return '#7ee070';
  return '#a8a4ac';
}
