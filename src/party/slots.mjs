// Several saved stories in Party Mode. The story being played stays in the live keys, where every
// system reads and writes it (`hearthlight.party.v1`: the heroes, `hearthlight.party.<name>.v1`:
// the world); the others wait, whole, under one key. The host’s options belong to no story.
// Pure functions over a storage object: localStorage in the game, a fake one in tools/slotstest.mjs.
//
// The live keys change hands in three steps, each read back before the next: (1) the index is
// written with a copy of the story leaving the live keys and where the move goes (`move`); (2) the
// live keys become the story to play; (3) the index forgets the move. From (1) to (3) every story
// is whole in the index: stopped anywhere — a closed tab, a full storage — the next `stories()`
// ends the move, and a step that fails puts everything back as it was.
export const STORIES_KEY = 'hearthlight.stories.v1';
export const MAX_STORIES = 4;
const LIVE = /^hearthlight\.party(?:\.[a-zA-Z][a-zA-Z0-9]*\.v1|\.v1)$/, PRE = 'hearthlight.party.', OPTS = PRE + 'opts.v1';
export const storyKey = (key) => LIVE.test(key) && key !== OPTS;
const plain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const parse = (raw) => { try { return JSON.parse(raw); } catch { return null; } };
const bundle = (v) => plain(v) && Object.entries(v).every(([k, raw]) => storyKey(k) && typeof raw === 'string');
const same = (a, b) => Object.keys(a).length === Object.keys(b).length && Object.keys(a).every((k) => a[k] === b[k]);
const local = () => globalThis.localStorage;

// what went wrong, as a code the screens put into words (src/party/stories.js): `full` — four
// stories already; `storage` — the browser would not keep it (nothing changed); `unreadable` — an
// index this version cannot read (left alone); `stuck` — a move the storage cannot end yet;
// `missing` — no such story; `empty` — nothing of a story in what was brought
export class StoryError extends Error {
  constructor(code, cause) { super('Stories: ' + code); this.name = 'StoryError'; this.code = code; this.cause = cause; }
}

// ------------------------------------------------------------------ a story’s keys
export function liveData(storage = local()) {
  const data = {};
  for (let i = 0; i < storage.length; i++) { const k = storage.key(i); if (storyKey(k)) data[k] = storage.getItem(k); }
  return data;
}
// (keys of the old story first: their room is free before the new ones are written)
function setLive(storage, data) {
  for (const k of Object.keys(liveData(storage))) if (!(k in data)) storage.removeItem(k);
  for (const [k, raw] of Object.entries(data)) if (storage.getItem(k) !== raw) storage.setItem(k, raw);
  if (!same(liveData(storage), data)) throw new Error('The story did not reach the live keys');
}
// only what belongs to a story, out of a backup’s keys
export const storyPart = (data) => Object.fromEntries(Object.entries(plain(data) ? data : {}).filter(([k, raw]) => storyKey(k) && typeof raw === 'string'));

// what a returning group recognises a story by: its chapter, whether the Adventure ever began,
// who played (the last session first, then the names known before), the highest hero, the last save
export function summarize(data, known = []) {
  const saga = parse(data[PRE + 'saga.v1'] ?? 'null'), session = parse(data[PRE + 'session.v1'] ?? 'null'), heroes = parse(data[PRE + 'v1'] ?? 'null');
  const players = [];
  for (const n of [...(Array.isArray(session?.players) ? session.players : []), ...(Array.isArray(known) ? known : [])]) {
    const name = typeof n === 'string' ? n.trim().slice(0, 16) : '';
    if (name && !players.includes(name)) players.push(name);
  }
  let level = 1;
  if (plain(heroes)) for (const h of Object.values(heroes)) if (plain(h) && Number.isFinite(h.level)) level = Math.max(level, Math.floor(h.level));
  const ch = plain(saga) && Number.isInteger(saga.ch) && saga.ch > 0 ? saga.ch : 1;
  return { ch, begun: plain(saga) && (ch > 1 || (plain(saga.q) && Object.keys(saga.q).length > 0)), players: players.slice(0, 8), level, savedAt: Number.isFinite(session?.savedAt) ? session.savedAt : null };
}
// nothing played yet — a lobby opened and closed leaves heroes at level 1 and the plaza on the
// map: no activity ever started (the session’s key), the Adventure neither
const blank = (data) => { const sum = summarize(data); return !(PRE + 'session.v1' in data) && !sum.begun && sum.level <= 1; };
// a new story’s heroes start afresh; whoever plays on the big screen itself — the keyboard, a
// gamepad — keeps the name, the look and the class they chose (a phone’s own live in the phone)
function freshHeroes(live) {
  const old = parse(live[PRE + 'v1'] ?? 'null'), out = {};
  if (plain(old)) for (const [id, h] of Object.entries(old)) {
    if (!/^(?:keys|pad)-/.test(id) || !plain(h) || !(h.named || h.look)) continue;
    out[id] = { cls: typeof h.cls === 'string' ? h.cls : null, level: 1, xp: 0, hats: [] };
    if (h.named && typeof h.name === 'string') Object.assign(out[id], { name: h.name, named: true });
    if (plain(h.look)) out[id].look = h.look;
  }
  return Object.keys(out).length ? { [PRE + 'v1']: JSON.stringify(out) } : {};
}

// ------------------------------------------------------------------ the index
// { v, cur, seq, list: [{ id, madeAt, savedAt, ch, begun, players, level, parked }], move? }: the
// current story’s `parked` is null (its keys are the live ones), every other holds its keys; while
// a move is under way (`move: { to }`) they all do.
function valid(st) {
  if (!plain(st) || st.v !== 1 || !Array.isArray(st.list) || st.list.length > 16 || !Number.isInteger(st.seq)) return false;
  const ids = new Set(), moving = st.move !== undefined;
  for (const s of st.list) {
    if (!plain(s) || typeof s.id !== 'string' || !s.id || ids.has(s.id)) return false;
    ids.add(s.id);
    if (moving || s.id !== st.cur ? !bundle(s.parked) : s.parked !== null) return false;
  }
  if (st.cur !== null && !ids.has(st.cur)) return false;
  return !moving || (plain(st.move) && (st.move.to === null || ids.has(st.move.to)));
}
function read(storage) {
  const raw = storage.getItem(STORIES_KEY);
  if (raw === null) return { st: null, raw };
  const st = parse(raw);
  if (!valid(st)) throw new StoryError('unreadable');
  return { st, raw };
}
function putBack(storage, raw) {
  try { if (raw === null) storage.removeItem(STORIES_KEY); else if (storage.getItem(STORIES_KEY) !== raw) storage.setItem(STORIES_KEY, raw); } catch { /* the caller reports the first failure */ }
}
// the index written and read back; whatever fails leaves the one before (`prev`)
function write(storage, st, prev) {
  if (!valid(st)) throw new StoryError('unreadable');
  const raw = JSON.stringify(st);
  try { storage.setItem(STORIES_KEY, raw); } catch (e) { putBack(storage, prev); throw new StoryError('storage', e); }
  if (storage.getItem(STORIES_KEY) !== raw) { putBack(storage, prev); throw new StoryError('storage'); }
  return raw;
}
const entry = (id, data, now, known) => { const sum = summarize(data, known); return { id, madeAt: now, ...sum, savedAt: sum.savedAt ?? now, parked: data }; };
// the story leaving the live keys: its copy and what it is recognised by, into its entry
function park(st, live) {
  const cur = st.list.find((s) => s.id === st.cur);
  if (!cur) return;
  const sum = summarize(live, cur.players);
  Object.assign(cur, sum, { savedAt: sum.savedAt ?? cur.savedAt ?? cur.madeAt, parked: live });
}

// steps (2) and (3) of a move the index (`st`, written as `raw`) holds; `undo` ({ raw, live }: the
// index and the live keys before the move) is what a failed step (2) goes back to
function finish(storage, st, raw, undo = null) {
  const to = st.move.to, target = st.list.find((s) => s.id === to);
  try { setLive(storage, target ? target.parked : {}); } catch (e) {
    let back = false;
    // (the story that was live goes back first: if that fails too, the move stays in the index
    // and the next stories() ends it)
    if (undo) try { setLive(storage, undo.live); putBack(storage, undo.raw); back = storage.getItem(STORIES_KEY) === undo.raw; } catch { /* stuck */ }
    throw new StoryError(back ? 'storage' : 'stuck', e);
  }
  const done = { ...st, cur: to, list: st.list.map((s) => (s.id === to ? { ...s, parked: null } : s)) };
  delete done.move;
  try { write(storage, done, raw); } catch (e) { throw new StoryError('stuck', e); }
  return done;
}
// step (1), then the rest. `st`: the index as it must read while the live keys change hands —
// every story with its keys, the one leaving the live keys with their copy (`live`, set by `park`)
function move(storage, st, to, prev, live) {
  const raw = write(storage, { ...st, move: { to } }, prev);
  // (that copy as the storage kept it, against the live keys as they are: not one is touched before)
  const kept = parse(storage.getItem(STORIES_KEY)), left = st.list.findIndex((s) => s.parked === live);
  if (left >= 0 && !same(kept.list[left].parked, liveData(storage))) { putBack(storage, prev); throw new StoryError('storage'); }
  return finish(storage, kept, raw, { raw: prev, live });
}

// the index as it must be before anything is asked of it: a move left half-way is ended, a world
// saved before there were stories becomes the first one, keys nobody owns (an older version of the
// game played meanwhile) a story of their own. Null: no story yet.
function open(storage, now) {
  let { st, raw } = read(storage);
  if (st && st.move) { st = finish(storage, st, raw); raw = storage.getItem(STORIES_KEY); }
  const live = liveData(storage);
  if (Object.keys(live).length && (!st || st.cur === null)) {
    st = st || { v: 1, cur: null, seq: 0, list: [] };
    const id = 's' + (++st.seq);
    st.list.push({ ...entry(id, live, now), parked: null });
    st.cur = id;
    write(storage, st, raw);
  }
  return st;
}

// ------------------------------------------------------------------ what the game asks
// the stories, the most recent first: { id, cur, ch, begun, players, level, savedAt, blank }
// (`blank`: nobody played it yet); `free`: a new one has a place — an empty one, or a blank story’s.
// `error`: null, or why they cannot be offered (`unreadable`, `storage`: the game plays on the live
// keys as it always did; `stuck`: the live keys are not a story right now — no party until it ends)
export function stories(storage = null, now = Date.now()) {
  let st, live;
  // (a browser that keeps nothing — private mode, storage switched off — has no stories to offer)
  try { storage = storage || local(); st = open(storage, now); live = liveData(storage); } catch (e) { return { list: [], cur: null, free: false, error: e instanceof StoryError ? e.code : 'storage' }; }
  if (!st) return { list: [], cur: null, free: true, error: null };
  const list = st.list.map((s) => {
    const on = s.id === st.cur, sum = on ? summarize(live, s.players) : s;
    return { id: s.id, cur: on, ch: sum.ch, begun: sum.begun, players: sum.players, level: sum.level, savedAt: sum.savedAt ?? s.savedAt ?? s.madeAt, blank: blank(on ? live : s.parked) };
  }).sort((a, b) => b.savedAt - a.savedAt || b.cur - a.cur);
  return { list, cur: st.cur, free: list.length < MAX_STORIES || list.some((s) => s.blank), error: null };
}

// a story in the live keys, whatever happens: the current one; none yet — the first, begun
// silently; none current — the last played
export function ensureStory(storage = local(), now = Date.now()) {
  const st = open(storage, now);
  if (st && st.cur !== null) return st.cur;
  if (st && st.list.length) return switchStory(storage, st.list.reduce((a, b) => ((b.savedAt ?? b.madeAt) > (a.savedAt ?? a.madeAt) ? b : a)).id, now);
  const first = st || { v: 1, cur: null, seq: 0, list: [] }, id = 's' + (++first.seq);
  first.list.push({ ...entry(id, {}, now), parked: null });
  first.cur = id;
  write(storage, first, storage.getItem(STORIES_KEY));
  return id;
}

// the live keys put away, the chosen story’s in their place
export function switchStory(storage = local(), id, now = Date.now()) {
  const st = open(storage, now);
  if (!st || !st.list.some((s) => s.id === id)) throw new StoryError('missing');
  if (st.cur === id) return id;
  const live = liveData(storage);
  park(st, live);
  move(storage, st, id, storage.getItem(STORIES_KEY), live);
  return id;
}

// a story from its first scene, heroes at level 1 — or the one nobody played yet, if one waits
export function newStory(storage = local(), now = Date.now()) {
  const st = open(storage, now);
  if (!st) return ensureStory(storage, now);
  const live = liveData(storage), spare = st.list.find((s) => blank(s.id === st.cur ? live : s.parked));
  if (spare) return switchStory(storage, spare.id, now);
  if (st.list.length >= MAX_STORIES) throw new StoryError('full');
  const id = 's' + (++st.seq);
  park(st, live);
  st.list.push(entry(id, freshHeroes(live), now));
  move(storage, st, id, storage.getItem(STORIES_KEY), live);
  return id;
}

// gone for good (the screens ask first, naming it)
export function deleteStory(storage = local(), id, now = Date.now()) {
  const st = open(storage, now);
  if (!st || !st.list.some((s) => s.id === id)) throw new StoryError('missing');
  const prev = storage.getItem(STORIES_KEY), live = liveData(storage), on = st.cur === id;
  st.list = st.list.filter((s) => s.id !== id);
  if (!on) { write(storage, st, prev); return; }
  st.cur = null;
  move(storage, st, null, prev, live);
}

// a story brought from outside (a file, an online backup) takes a free place — the live keys are
// not touched; `at`: when it was saved, if its own keys do not say
export function addStory(storage = local(), data, now = Date.now(), at = null) {
  const part = storyPart(data);
  if (!Object.keys(part).length) throw new StoryError('empty');
  const st = open(storage, now) || { v: 1, cur: null, seq: 0, list: [] };
  if (st.list.length >= MAX_STORIES) {
    // (a place nobody played in yet is a free one)
    const live = liveData(storage), spare = st.list.find((s) => s.id !== st.cur && blank(s.parked)) || st.list.find((s) => s.id === st.cur && blank(live));
    if (!spare) throw new StoryError('full');
    return replaceStory(storage, spare.id, part, now, at);
  }
  const id = 's' + (++st.seq), e = entry(id, part, now);
  if (summarize(part).savedAt === null && Number.isFinite(at)) e.savedAt = at;
  st.list.push(e);
  write(storage, st, storage.getItem(STORIES_KEY));
  return id;
}
// … or the place of a story the players chose to give up (asked first, naming it)
export function replaceStory(storage = local(), id, data, now = Date.now(), at = null) {
  const part = storyPart(data);
  if (!Object.keys(part).length) throw new StoryError('empty');
  const st = open(storage, now);
  if (!st || !st.list.some((s) => s.id === id)) throw new StoryError('missing');
  const prev = storage.getItem(STORIES_KEY), live = liveData(storage), on = st.cur === id, e = entry(id, part, now);
  if (summarize(part).savedAt === null && Number.isFinite(at)) e.savedAt = at;
  st.list = st.list.map((s) => (s.id === id ? e : s));
  if (!on) { write(storage, st, prev); return id; }
  // (the story being played: the live keys change too — by the same three steps)
  const raw = write(storage, { ...st, move: { to: id } }, prev);
  finish(storage, parse(raw), raw, { raw: prev, live });
  return id;
}

// the story that holds exactly these keys, if one does (the backup of a story that never left)
export function findStory(storage = local(), data, now = Date.now()) {
  const part = storyPart(data), st = Object.keys(part).length ? open(storage, now) : null;
  if (!st) return null;
  const live = liveData(storage), hit = st.list.find((s) => same(s.id === st.cur ? live : s.parked, part));
  return hit ? hit.id : null;
}

// the party saved: the current story’s entry follows (a write only when what it is recognised by changed)
export function touchStory(storage = null) {
  try {
    storage = storage || local();
    const { st, raw } = read(storage);
    const cur = st && !st.move ? st.list.find((s) => s.id === st.cur) : null;
    if (!cur) return false;
    const sum = summarize(liveData(storage), cur.players);
    if (sum.ch === cur.ch && sum.begun === cur.begun && sum.level === cur.level && sum.players.join('\n') === (cur.players || []).join('\n')) return false;
    Object.assign(cur, sum, { savedAt: sum.savedAt ?? cur.savedAt });
    write(storage, st, raw);
    return true;
  } catch { return false; }
}

// are the live keys still story `id`’s? (another tab of the game may have changed stories: a party
// must not save one story’s progress into another’s keys)
export function playing(storage = null, id = null) {
  try { const { st } = read(storage || local()); return st ? st.cur === id && !st.move : id === null; } catch { return true; }
}
