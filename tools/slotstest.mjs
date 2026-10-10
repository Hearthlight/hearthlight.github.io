// The saved stories of Party Mode (src/party/slots.mjs), on a fake storage:   node tools/slotstest.mjs
// An old world becomes the first story; new, switch, delete, import keep every key of every story
// byte for byte; a fifth story is refused; a storage that fails or a tab closed at any write of a
// move loses nothing; the solo save, the host’s options and everything else are never touched.
import test from 'node:test';
import assert from 'node:assert/strict';
import { STORIES_KEY, MAX_STORIES, StoryError, stories, ensureStory, switchStory, newStory, deleteStory, addStory, replaceStory, findStory, touchStory, playing, liveData, summarize, storyKey } from '../src/party/slots.mjs';
import { exportSave, validateSave } from '../src/party/saves.mjs';

const P = 'hearthlight.party.';
// a storage like the browser’s, that can refuse a write (`failAt`: the nth write throws — once, or
// from then on with `dead`: the tab closed there), or run out of room (`quota`, in characters)
class Storage {
  constructor(data = {}) { this.data = new Map(Object.entries(data)); this.writes = 0; this.failAt = 0; this.dead = false; this.quota = Infinity; this.failed = false; }
  get length() { return this.data.size; }
  key(i) { return [...this.data.keys()][i] ?? null; }
  getItem(k) { return this.data.has(k) ? this.data.get(k) : null; }
  hit() { this.writes++; if (this.failAt && (this.writes === this.failAt || (this.dead && this.writes > this.failAt))) { this.failed = true; throw new Error('QuotaExceededError'); } }
  setItem(k, v) {
    this.hit();
    let size = k.length + String(v).length;
    for (const [key, raw] of this.data) if (key !== k) size += key.length + raw.length;
    if (size > this.quota) { this.failed = true; throw new Error('QuotaExceededError'); }
    this.data.set(k, String(v));
  }
  removeItem(k) { this.hit(); this.data.delete(k); }
  copy() { return new Storage(Object.fromEntries(this.data)); }
  get size() { let n = 0; for (const [k, v] of this.data) n += k.length + v.length; return n; }
}

// a world as the game saves it: the heroes, the saga, the session, the fog (not JSON) and the rest
const world = (ch, names, level, extra = {}) => ({
  [P + 'v1']: JSON.stringify(Object.fromEntries(names.map((n, i) => ['phone-' + n, { cls: 'mage', level: Math.max(1, level - i), xp: 12 * i, hats: ['chapka'], talents: { mage: ['a1'] }, gear: { w: 2 }, dust: 40 + i }]))),
  [P + 'saga.v1']: JSON.stringify({ v: 1, ch, q: { c1_intro: { s: 2, n: 0, done: ch > 1 } }, f: { lanternLit: true }, open: ['valley'], lit: [], dun: {}, got: {}, seen: {} }),
  [P + 'session.v1']: JSON.stringify({ savedAt: 1700000000000 + ch * 86400000, players: names, positions: { ['phone-' + names[0]]: { x: 12.5, z: -3.25 } }, activity: 'explore' }),
  [P + 'fog.v1']: 'AAEC' + 'Aw=='.padStart(4 + ch * 4, 'Q'),
  [P + 'camps.v1']: JSON.stringify(['c' + ch, 'steppe:3']),
  [P + 'waystones.v1']: JSON.stringify(['Marigold Cove', 'L’Arbre « creux » é\ud800']),
  ...extra,
});
const A = world(3, ['Alex', 'Mia', 'Lucas'], 12, { [P + 'lairs.v1']: '{"bear":1700000000000}', [P + 'races.v1']: '{"r1":41.5}' });
const B = world(1, ['Zoé', 'Léo'], 4);
const C = world(7, ['Inès'], 31, { [P + 'roosts.v1']: '["r2"]', [P + 'secrets.v1']: '{"solved":{}}', [P + 'world.v1']: '{"found":["steppe"]}', [P + 'rares.v1']: '{}' });
// what no story owns: the solo save, the host’s options, the settings, an online key, a stranger’s key
const OTHERS = { 'hearthlight.save.v1': '{"version":1,"day":12,"player":{"name":"Alex"}}', [P + 'opts.v1']: '{"diff":"hard","ff":true}', 'hearthlight.settings.v1': '{"lang":"fr"}', 'hearthlight.cloud.v1': '{"key":"k","revision":3}', 'hl.partyToken': 'secret', 'unrelated': 'x' };
const fresh = (live = {}) => new Storage({ ...OTHERS, ...live });
const index = (s) => JSON.parse(s.getItem(STORIES_KEY));
// every story’s keys, wherever they are (the live keys for the current one)
const held = (s) => { const st = index(s); return Object.fromEntries(st.list.map((e) => [e.id, e.id === st.cur && !st.move ? liveData(s) : e.parked])); };
const others = (s) => Object.fromEntries(Object.keys(OTHERS).map((k) => [k, s.getItem(k)]));
const untouched = (s) => assert.deepEqual(others(s), OTHERS, 'the solo save, the options and the rest are as they were');
// the storage holds exactly these stories (in any order), and nothing else moved
function holds(s, ...worlds) {
  const got = Object.values(held(s)).map((w) => JSON.stringify(Object.entries(w).sort())).sort();
  assert.deepEqual(got, worlds.map((w) => JSON.stringify(Object.entries(w).sort())).sort());
  untouched(s);
  for (const k of s.data.keys()) assert.ok(k === STORIES_KEY || storyKey(k) || k in OTHERS, 'no stray key: ' + k);
}

test('an old world becomes the first story, untouched; no world, no story', () => {
  const s = fresh(A), before = Object.fromEntries(s.data);
  const S = stories(s, 1e12);
  assert.equal(S.error, null); assert.equal(S.list.length, 1); assert.equal(S.cur, S.list[0].id);
  assert.deepEqual({ ...S.list[0], id: 0 }, { id: 0, cur: true, ch: 3, begun: true, players: ['Alex', 'Mia', 'Lucas'], level: 12, savedAt: 1700000000000 + 3 * 86400000, blank: false });
  for (const [k, v] of Object.entries(before)) assert.equal(s.getItem(k), v);        // (every key byte for byte)
  assert.equal(s.data.size, Object.keys(before).length + 1);
  holds(s, A);
  // (asked again: nothing more is written)
  const w = s.writes; stories(s); stories(s); assert.equal(s.writes, w);
  const empty = fresh();
  assert.deepEqual(stories(empty), { list: [], cur: null, free: true, error: null });
  assert.equal(empty.getItem(STORIES_KEY), null); assert.equal(empty.writes, 0);
  // (Together with no story yet: the first one, silently)
  const id = ensureStory(empty, 5);
  assert.equal(ensureStory(empty), id); assert.equal(stories(empty).list.length, 1); assert.ok(stories(empty).list[0].blank);
  holds(empty, {});
});

test('new, then back and forth: every key of every story byte for byte', () => {
  const s = fresh(A), a = stories(s).cur;
  const b = newStory(s, 2e12);
  assert.notEqual(b, a); assert.deepEqual(liveData(s), {}, 'a new story starts with no world and no heroes');
  assert.equal(stories(s).cur, b); holds(s, A, {});
  for (const [k, v] of Object.entries(B)) s.setItem(k, v);                             // (the party plays story B)
  holds(s, A, B);
  for (let i = 0; i < 5; i++) {
    switchStory(s, a); assert.deepEqual(liveData(s), A); assert.equal(stories(s).cur, a); holds(s, A, B);
    switchStory(s, b); assert.deepEqual(liveData(s), B); assert.equal(stories(s).cur, b); holds(s, A, B);
  }
  assert.equal(switchStory(s, b), b);                                                   // (the one already there: nothing moves)
  // the list: the most recent first, each recognised by its own chapter, names and level
  const L = stories(s).list;
  assert.deepEqual(L.map((x) => [x.id, x.ch, x.level, x.players.join()]), [[a, 3, 12, 'Alex,Mia,Lucas'], [b, 1, 4, 'Zoé,Léo']]);
  assert.throws(() => switchStory(s, 'nope'), (e) => e instanceof StoryError && e.code === 'missing');
  holds(s, A, B);
});

test('four stories, and a fifth is refused; a story nobody played yet is the one a new story opens', () => {
  const s = fresh(A), ids = [stories(s).cur];
  for (const w of [B, C, world(2, ['Emma'], 6)]) { ids.push(newStory(s)); for (const [k, v] of Object.entries(w)) s.setItem(k, v); }
  assert.equal(stories(s).list.length, MAX_STORIES); assert.ok(!stories(s).free);
  const before = Object.fromEntries(s.data);
  assert.throws(() => newStory(s), (e) => e instanceof StoryError && e.code === 'full');
  assert.throws(() => addStory(s, B), (e) => e.code === 'full');
  assert.deepEqual(Object.fromEntries(s.data), before, 'a refusal changes nothing');
  holds(s, A, B, C, world(2, ['Emma'], 6));
  // (two places: « New story » twice in a row opens the same untouched one)
  const t2 = fresh(A), n1 = newStory(t2), back = stories(t2).list.find((x) => x.id !== n1).id;
  switchStory(t2, back);
  assert.equal(newStory(t2), n1); assert.equal(newStory(t2), n1); assert.equal(stories(t2).list.length, 2);
  holds(t2, A, {});
  // (four places, one of them never played in: it is free — for a new story, for a backup)
  switchStory(t2, back);
  for (const w of [B, C]) { addStory(t2, w); }
  assert.equal(stories(t2).list.length, MAX_STORIES); assert.ok(stories(t2).free); holds(t2, A, B, C, {});
  const kept = addStory(t2, world(2, ['Emma'], 6));
  assert.equal(kept, n1); assert.ok(!stories(t2).free); holds(t2, A, B, C, world(2, ['Emma'], 6)); assert.deepEqual(liveData(t2), A);
  assert.throws(() => addStory(t2, world(5, ['Noah'], 20)), (e) => e.code === 'full');
});

test('a new story keeps the name, the look and the class of the big screen’s own players, at level 1', () => {
  const heroes = { 'keys-wasd': { cls: 'cook', level: 22, xp: 300, hats: ['crown'], name: 'Papa', named: true, look: { hair: 3 }, gear: { w: 5 }, dust: 900 }, 'pad-0': { cls: 'bard', level: 9, look: { hair: 1 } }, 'phone-x': { cls: 'mage', level: 30, name: 'Mia' } };
  const s = fresh({ ...A, [P + 'v1']: JSON.stringify(heroes) });
  newStory(s);
  assert.deepEqual(Object.keys(liveData(s)), [P + 'v1']);
  assert.deepEqual(JSON.parse(s.getItem(P + 'v1')), { 'keys-wasd': { cls: 'cook', level: 1, xp: 0, hats: [], name: 'Papa', named: true, look: { hair: 3 } }, 'pad-0': { cls: 'bard', level: 1, xp: 0, hats: [], look: { hair: 1 } } });
  assert.ok(stories(s).list.find((x) => x.cur).blank);
});

test('delete: a parked story, then the one in the live keys', () => {
  const s = fresh(A), a = stories(s).cur, b = newStory(s);
  for (const [k, v] of Object.entries(B)) s.setItem(k, v);
  const c = newStory(s);
  for (const [k, v] of Object.entries(C)) s.setItem(k, v);
  deleteStory(s, b); holds(s, A, C); assert.equal(stories(s).cur, c);
  assert.throws(() => deleteStory(s, b), (e) => e.code === 'missing');
  deleteStory(s, c); holds(s, A);
  assert.deepEqual(liveData(s), {}, 'the deleted story’s keys are gone from the live ones');
  assert.equal(stories(s).cur, null); assert.equal(index(s).list[0].id, a);
  // (no story in the live keys: the last played comes back)
  assert.equal(ensureStory(s), a); assert.deepEqual(liveData(s), A); holds(s, A);
  deleteStory(s, a);
  assert.deepEqual(stories(s), { list: [], cur: null, free: true, error: null });
  untouched(s);
  assert.notEqual(ensureStory(s), a, 'a place is never given the id of a deleted story');
});

test('a storage that refuses any one write of a switch, a new story or a delete loses nothing', () => {
  const seen = {};
  for (const what of ['switch', 'new', 'delete', 'delete-live', 'replace-live']) {
    const codes = [];
    for (let n = 1; n < 80; n++) {
      const s = fresh(A), a = stories(s).cur, b = newStory(s);
      for (const [k, v] of Object.entries(B)) s.setItem(k, v);
      const c = newStory(s);
      for (const [k, v] of Object.entries(C)) s.setItem(k, v);
      const before = Object.fromEntries(s.data);
      s.writes = 0; s.failAt = n;
      let threw = null;
      try {
        if (what === 'switch') switchStory(s, a); else if (what === 'new') newStory(s); else if (what === 'delete') deleteStory(s, a); else if (what === 'delete-live') deleteStory(s, c); else replaceStory(s, c, B);
      } catch (e) { threw = e; }
      if (!s.failed) { assert.equal(threw, null); assert.ok(n > (what === 'delete' ? 1 : 3), what + ' writes something'); seen[what] = [n - 1, codes.join('')]; break; }
      codes.push(threw && threw.code === 'storage' ? 'b' : 's');
      assert.ok(threw instanceof StoryError, `${what}, write ${n}: the failure is told`);
      s.failAt = 0;
      if (threw.code === 'storage') assert.deepEqual(Object.fromEntries(s.data), before, `${what}, write ${n}: everything is back as it was`);
      else assert.equal(threw.code, 'stuck');
      // (the next time the stories are asked for, they are all there — the one given up excepted, if its turn had come)
      const S = stories(s);
      assert.equal(S.error, null);
      const kept = Object.values(held(s)).map((w) => JSON.stringify(Object.entries(w).sort()));
      const must = what === 'delete' ? [B, C] : what === 'delete-live' ? [A, B] : what === 'replace-live' ? [A, B] : [A, B, C];
      for (const w of must) assert.ok(kept.includes(JSON.stringify(Object.entries(w).sort())), `${what}, write ${n}: a story is missing`);
      for (const w of kept) assert.ok([A, B, C, {}].some((x) => JSON.stringify(Object.entries(x).sort()) === w), `${what}, write ${n}: a story is not whole`);
      untouched(s);
      // (and what was asked can be asked again)
      if (what === 'switch') { switchStory(s, a); assert.deepEqual(liveData(s), A); holds(s, A, B, C); }
    }
  }
  // (a refused write before the last: everything back as it was — `b`; the last one, the index’s: the move ends at the next launch — `s`)
  assert.equal(seen.delete[1], 'b');
  for (const what of ['switch', 'new', 'delete-live', 'replace-live']) assert.match(seen[what][1], /^b{9,}s$/, what);
});

test('a tab closed at any write of a move: the next launch finds every story whole', () => {
  for (const what of ['switch', 'new', 'delete-live', 'replace-live']) {
    let ends = 0;
    for (let n = 1; n < 80; n++) {
      const s = fresh(A), a = stories(s).cur, b = newStory(s);
      for (const [k, v] of Object.entries(B)) s.setItem(k, v);
      const c = newStory(s);
      for (const [k, v] of Object.entries(C)) s.setItem(k, v);
      s.writes = 0; s.failAt = n; s.dead = true;
      try { if (what === 'switch') switchStory(s, a); else if (what === 'new') newStory(s); else if (what === 'delete-live') deleteStory(s, c); else replaceStory(s, c, B); } catch (e) { /* the tab is gone */ }
      if (!s.failed) { ends = n; break; }
      const next = s.copy(), S = stories(next);
      assert.equal(S.error, null, `${what}, closed at write ${n}`);
      const kept = Object.values(held(next)).map((w) => JSON.stringify(Object.entries(w).sort()));
      const must = what === 'delete-live' ? [A, B] : what === 'replace-live' ? [A, B] : [A, B, C];
      for (const w of must) assert.ok(kept.filter((x) => x === JSON.stringify(Object.entries(w).sort())).length >= 1, `${what}, closed at write ${n}: a story is missing`);
      for (const w of kept) assert.ok([A, B, C, {}].some((x) => JSON.stringify(Object.entries(x).sort()) === w), `${what}, closed at write ${n}: a story is a mix of two`);
      assert.deepEqual(others(next), OTHERS);
      // (the story in the live keys is one whole story, never half of two)
      if (S.cur) assert.ok([A, B, C, {}].some((x) => JSON.stringify(Object.entries(x).sort()) === JSON.stringify(Object.entries(liveData(next)).sort())));
      else assert.deepEqual(liveData(next), {});
      assert.equal(index(next).move, undefined);
      if (what === 'switch') { switchStory(next, S.list.find((x) => x.level === 12).id); assert.deepEqual(liveData(next), A); holds(next, A, B, C); }
    }
    assert.ok(ends > 3, what + ' was run to its end');
  }
});

test('a full storage: a clear refusal, nothing lost, and it works again once there is room', () => {
  const s = fresh(A), a = stories(s).cur, b = newStory(s);
  for (const [k, v] of Object.entries(B)) s.setItem(k, v);
  const before = Object.fromEntries(s.data);
  // (no room for the copy of the live story)
  s.quota = s.size + 10;
  assert.throws(() => switchStory(s, a), (e) => e instanceof StoryError && e.code === 'storage');
  assert.deepEqual(Object.fromEntries(s.data), before);
  assert.throws(() => newStory(s), (e) => e.code === 'storage');
  assert.deepEqual(Object.fromEntries(s.data), before);
  assert.equal(stories(s).error, null); assert.equal(stories(s).cur, b); holds(s, A, B);
  // (room for the copy, not for the other story’s keys beside it: back to the story that was live)
  for (let q = s.size; q < s.size * 3; q += 7) {
    const u = new Storage(before); u.quota = q;
    let err = null;
    try { switchStory(u, a); } catch (e) { err = e; }
    if (!err) { assert.deepEqual(liveData(u), A); holds(u, A, B); break; }
    assert.equal(err.code, 'storage'); assert.deepEqual(Object.fromEntries(u.data), before, 'quota ' + q);
  }
  s.quota = Infinity;
  switchStory(s, a); assert.deepEqual(liveData(s), A); holds(s, A, B);
});

test('a backup comes in as a story of its own, or in the place the players give up — never over another', () => {
  const s = fresh(A), a = stories(s).cur;
  // (the file as Export makes it: the story in the live keys, the options and the solo save)
  const file = validateSave(JSON.parse(JSON.stringify(exportSave(new Storage({ ...B, 'hearthlight.save.v1': '{"version":1,"day":3}', [P + 'opts.v1']: '{"diff":"easy"}' })))));
  const b = addStory(s, file.data, 3e12);
  assert.equal(stories(s).cur, a); assert.deepEqual(liveData(s), A, 'the story being played is not touched');
  holds(s, A, B);                                                     // (the file’s options and solo save are not a story’s)
  assert.deepEqual(stories(s).list.find((x) => x.id === b).players, ['Zoé', 'Léo']);
  switchStory(s, b); assert.deepEqual(liveData(s), B); holds(s, A, B);
  // (a parked story replaced; then the live one)
  replaceStory(s, a, C); holds(s, C, B); assert.deepEqual(liveData(s), B);
  replaceStory(s, b, A); holds(s, C, A); assert.deepEqual(liveData(s), A); assert.equal(stories(s).cur, b);
  assert.throws(() => addStory(s, { 'hearthlight.save.v1': '{}', [P + 'opts.v1']: '{}' }), (e) => e.code === 'empty');
  assert.throws(() => replaceStory(s, 'nope', B), (e) => e.code === 'missing');
  holds(s, C, A);
  // (a backup of a story that never left: it is found, not doubled)
  assert.equal(findStory(s, { ...A, [P + 'opts.v1']: '{}', 'hearthlight.save.v1': '{}' }), b); assert.equal(findStory(s, C), a);
  assert.equal(findStory(s, B), null); assert.equal(findStory(s, {}), null); assert.equal(findStory(fresh(), A), null);
  // (the very first thing a new browser does: restore a backup)
  const n = fresh(), id = addStory(n, file.data);
  assert.equal(stories(n).cur, null); assert.deepEqual(liveData(n), {});
  assert.equal(ensureStory(n), id); assert.deepEqual(liveData(n), B); holds(n, B);
  // (an export is what it always was: the live story, the options, the solo save — and no index)
  const out = exportSave(s);
  assert.deepEqual(Object.keys(out.data).sort(), [...Object.keys(A), P + 'opts.v1', 'hearthlight.save.v1'].sort());
});

test('an index this version cannot read is left alone, and the game plays on the live keys', () => {
  for (const raw of ['{"v":2,"cur":"s1","list":[]}', 'not json', '{"v":1,"cur":"s9","seq":1,"list":[]}', '{"v":1,"cur":null,"seq":1,"list":[{"id":"s1","parked":{"hearthlight.save.v1":"x"}}]}', '{"v":1,"cur":null,"seq":1,"list":[{"id":"s1","parked":null}]}']) {
    const s = fresh({ ...A, [STORIES_KEY]: raw }), before = Object.fromEntries(s.data);
    assert.deepEqual(stories(s), { list: [], cur: null, free: false, error: 'unreadable' });
    for (const f of [() => ensureStory(s), () => newStory(s), () => switchStory(s, 's1'), () => deleteStory(s, 's1'), () => addStory(s, B), () => replaceStory(s, 's1', B)]) assert.throws(f, (e) => e.code === 'unreadable');
    assert.equal(touchStory(s), false); assert.equal(playing(s, null), true);
    assert.deepEqual(Object.fromEntries(s.data), before); assert.equal(s.writes, 0);
  }
});

test('keys nobody owns (an older version played meanwhile) become a story of their own', () => {
  const s = fresh(A), a = stories(s).cur;
  deleteStory(s, a); addStory(s, B);
  for (const [k, v] of Object.entries(C)) s.setItem(k, v);            // (written by a game that knows no stories)
  const S = stories(s);
  assert.equal(S.list.length, 2); assert.equal(S.list.find((x) => x.cur).level, 31); holds(s, B, C);
});

test('the party saves: the current story is recognised by its last players first, and only it', () => {
  const s = fresh(A), a = stories(s).cur;
  assert.equal(touchStory(s), false, 'nothing changed: nothing written');
  s.setItem(P + 'session.v1', JSON.stringify({ savedAt: 5e12, players: ['Mia', 'Noah'], positions: {}, activity: 'explore' }));
  s.setItem(P + 'saga.v1', JSON.stringify({ v: 1, ch: 4, q: { c4: { s: 0 } }, f: {} }));
  assert.equal(touchStory(s), true); assert.equal(touchStory(s), false);
  let L = stories(s).list[0];
  assert.deepEqual([L.ch, L.players, L.savedAt], [4, ['Mia', 'Noah', 'Alex', 'Lucas'], 5e12]);
  // (parked, it keeps them; the other story has its own)
  const b = newStory(s, 6e12);
  L = stories(s).list.find((x) => x.id === a);
  assert.deepEqual([L.ch, L.players, L.savedAt, L.cur], [4, ['Mia', 'Noah', 'Alex', 'Lucas'], 5e12, false]);
  assert.deepEqual(stories(s).list.map((x) => x.id), [b, a], 'the most recent first');
  assert.ok(playing(s, b)); assert.ok(!playing(s, a));
  assert.equal(summarize({}).begun, false); assert.equal(summarize({ [P + 'saga.v1']: '{"v":1,"ch":1,"q":{}}' }).begun, false);
  // (nobody played yet: a lobby opened and closed — level-1 heroes, the plaza on the map; any activity started, and it is a story to keep)
  const lobby = { [P + 'v1']: '{"bot0":{"cls":"mage","level":1,"xp":0,"hats":[]}}', [P + 'fog.v1']: 'AAEC' };
  const u = fresh(lobby), first = stories(u).cur;
  assert.ok(stories(u).list[0].blank); assert.equal(newStory(u), first, 'a new story is that same untouched one'); assert.deepEqual(liveData(u), lobby);
  for (const more of [{ [P + 'session.v1']: '{"savedAt":5,"players":["Al"],"activity":"waves"}' }, { [P + 'saga.v1']: '{"v":1,"ch":1,"q":{"c1_intro":{"s":0}}}' }, { [P + 'v1']: '{"bot0":{"level":2}}' }]) {
    const v = fresh({ ...lobby, ...more }), was = stories(v).cur;
    assert.ok(!stories(v).list[0].blank); assert.notEqual(newStory(v), was); holds(v, { ...lobby, ...more }, {});
  }
  assert.equal(summarize({ [P + 'v1']: '{"a":{"level":"7"},"b":null,"c":{"level":3.9}}', [P + 'session.v1']: '{"players":[" Al ",7,"Al",""],"savedAt":"x"}' }).level, 3);
  assert.deepEqual(summarize({ [P + 'session.v1']: '{"players":[" Al ",7,"Al",""],"savedAt":"x"}' }).players, ['Al']);
});
