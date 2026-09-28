// Persistent game state + save/load (localStorage, versioned).

import { NPC_ORDER } from './data/npcs.js';
import { ITEMS, STACK_MAX } from './data/items.js';
import { OX, OZ } from './world/overworld.js';

const KEY = 'hearthlight.save.v1';
import { detectLang } from './i18n.js';

const SETTINGS_KEY = 'hearthlight.settings.v1';
export const DAY_START = 6;
export const DAY_END = 26; // 2am
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const BAG_SIZE = 24;
export const HOTBAR = 8;

export function newState(profile) {
  const friendship = {};
  for (const id of NPC_ORDER) friendship[id] = { pts: 0, talked: -1, gifted: -1, met: false, known: [] };
  return {
    version: 1,
    world: 3,
    created: Date.now(),
    player: {
      name: profile.name || 'Sprout',
      look: profile.look,
      pet: profile.pet || { kind: 'cat', color: 'ginger', name: 'Mochi' },
      map: 'overworld', x: 90.5, z: 104.4, facing: Math.PI,
    },
    day: 1,
    hour: 7.5,
    weather: 'sun',
    tomorrowWeather: 'sun',
    coins: 150,
    bag: Array(BAG_SIZE).fill(null),
    hot: 0,
    flags: {},
    quests: {},
    friendship,
    farm: {},
    forage: { day: 0, taken: {} },
    house: { level: 1, furniture: [], wall: 'cream', floor: 'wood' },
    unlocked: { hat: [], top: [], acc: [] },
    collection: {},
    mail: [],
    shipping: [],
    fund: { coins: 0, wood: 0 },
    stats: { fish: 0, crops: 0, gifts: 0, earned: 0, steps: 0 },
    board: null,
  };
}

// ---- inventory helpers ------------------------------------------------------
export function countItem(s, id) {
  let n = 0;
  for (const slot of s.bag) if (slot && slot.id === id) n += slot.qty;
  return n;
}

export function addItem(s, id, qty = 1) {
  const def = ITEMS[id];
  const stackable = !def || !['tool', 'key'].includes(def.cat) || ['shard', 'page', 'bottle'].includes(id);
  let left = qty;
  if (stackable) {
    for (const slot of s.bag) {
      if (slot && slot.id === id && slot.qty < STACK_MAX) {
        const add = Math.min(left, STACK_MAX - slot.qty);
        slot.qty += add; left -= add;
        if (!left) return 0;
      }
    }
  }
  while (left > 0) {
    const i = s.bag.findIndex((x) => !x);
    if (i < 0) return left; // bag full
    const add = stackable ? Math.min(left, STACK_MAX) : 1;
    s.bag[i] = { id, qty: add };
    left -= add;
  }
  return 0;
}

export function removeItem(s, id, qty = 1) {
  if (countItem(s, id) < qty) return false;
  let left = qty;
  for (let i = s.bag.length - 1; i >= 0 && left > 0; i--) {
    const slot = s.bag[i];
    if (slot && slot.id === id) {
      const take = Math.min(left, slot.qty);
      slot.qty -= take; left -= take;
      if (slot.qty <= 0) s.bag[i] = null;
    }
  }
  return true;
}

export function hasItem(s, id, qty = 1) { return countItem(s, id) >= qty; }

// ---- save / load --------------------------------------------------------------
export function saveGame(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    return true;
  } catch (e) {
    console.warn('save failed', e);
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || s.version !== 1) return null;
    return migrate(s);
  } catch (e) {
    return null;
  }
}

// Older saves were made before the valley grew: shift them into the new map.
function migrate(s) {
  if (!s.world || s.world < 2) {
    if (s.player.map === 'overworld') { s.player.x += OX; s.player.z += OZ; }
    const farm = {};
    for (const [k, v] of Object.entries(s.farm || {})) { const [x, z] = k.split(',').map(Number); farm[(x + OX) + ',' + (z + OZ)] = v; }
    s.farm = farm;
    s.flags = s.flags || {};
    s.flags.berries = {};
    s.world = 2;
  }
  // the valley grew east again (180 → 240 wide): re-lay the exploration fog
  if (s.world < 3) {
    const f = s.flags && s.flags.fog;
    if (f && f.length === 23 * 16) {
      let nf = '';
      for (let cz = 0; cz < 16; cz++) nf += f.slice(cz * 23, cz * 23 + 23) + '0'.repeat(30 - 23);
      s.flags.fog = nf;
    }
    s.world = 3;
  }
  for (const id of NPC_ORDER) if (!s.friendship[id]) s.friendship[id] = { pts: 0, talked: -1, gifted: -1, met: false, known: [] };
  // (Big Sniff’s fur hat got a name of its own: 'furhat' is the steppe folk’s felt hat)
  if (s.unlocked && s.unlocked.hat) s.unlocked.hat = s.unlocked.hat.map((h) => (h === 'furhat' ? 'chapka' : h));
  if (s.player && s.player.look && s.player.look.hat === 'furhat') s.player.look.hat = 'chapka';
  return s;
}

export function hasSave() {
  try { return !!localStorage.getItem(KEY); } catch (e) { return false; }
}

export function deleteSave() {
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
}

export const DEFAULT_SETTINGS = { master: 0.8, music: 0.7, sfx: 0.8, ambient: 0.6, daySpeed: 1, zoom: 0, textSpeed: 1, hud: 'full', adventure: 'normal', lang: null, rumble: true };

export function loadSettings() {
  let st;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const old = raw ? JSON.parse(raw) : {};
    st = { ...DEFAULT_SETTINGS, ...old };
    // (the minimap switched off, before there were displays: the compact one)
    if (old.minimap === false && !old.hud) st.hud = 'compact';
    delete st.minimap;
  } catch (e) {
    st = { ...DEFAULT_SETTINGS };
  }
  if (!st.lang) st.lang = detectLang();
  return st;
}

export function saveSettings(st) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(st)); } catch (e) { /* ignore */ }
}

export function fmtTime(hour) {
  const h = Math.floor(hour) % 24;
  const m = Math.floor((hour % 1) * 60 / 10) * 10;
  const ap = h < 12 ? 'am' : 'pm';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')}${ap}`;
}

export function weekday(day) { return WEEKDAYS[(day - 1) % 7]; }

export function hearts(pts) { return Math.min(10, Math.floor(pts / 100)); }

// ---- exploration fog (map page): the valley in 8×8-tile cells ---------------
export const FOG_CELL = 8;
export const FOG_W = 30, FOG_H = 16; // 240 x 128 tiles in 8-tile cells
export function fogSeen(s, cx, cz) {
  if (cx < 0 || cz < 0 || cx >= FOG_W || cz >= FOG_H) return false;
  const f = s.flags.fog;
  return !!f && f.charCodeAt(cz * FOG_W + cx) === 49;
}
export function fogReveal(s, x, z, r = 13) {
  let f = s.flags.fog || '0'.repeat(FOG_W * FOG_H);
  let changed = false;
  const c0 = Math.floor((x - r) / FOG_CELL), c1 = Math.floor((x + r) / FOG_CELL);
  const r0 = Math.floor((z - r) / FOG_CELL), r1 = Math.floor((z + r) / FOG_CELL);
  for (let cz = Math.max(0, r0); cz <= Math.min(FOG_H - 1, r1); cz++) {
    for (let cx = Math.max(0, c0); cx <= Math.min(FOG_W - 1, c1); cx++) {
      const mx = (cx + 0.5) * FOG_CELL, mz = (cz + 0.5) * FOG_CELL;
      if (Math.hypot(mx - x, (mz - z) * 1.2) > r + FOG_CELL * 0.6) continue;
      const i = cz * FOG_W + cx;
      if (f[i] !== '1') { f = f.slice(0, i) + '1' + f.slice(i + 1); changed = true; }
    }
  }
  if (changed || !s.flags.fog) s.flags.fog = f;
  return changed;
}
