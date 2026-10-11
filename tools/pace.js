// The pace of levels, measured: the story played by the bots (tools/sagatest.js), chapter by
// chapter, with every gain of experience written down — where each hero stood on the way in and
// on the way out of a chapter, how many levels it gave, and what gave them (main quests, side
// quests, defeats, the camps’ ends).
//   const K = await import('/tools/pace.js?' + Date.now());
//   K.start('party', 4, [1, 2], { fresh: true })      // the main quests only, from level 1
//   K.start('party', 4, [3], { side: true, camps: true })   // every side quest, the lands’ camps
//   K.start('solo', 1, [1, 2, 3], { fresh: true, fast: 2 })
//   window.__pace → 'run' · 'progress {…}' · 'done {…}' · 'err …'
//   window.__paceLog → every gain: [chapter, hero, source, level of the thing, weight, xp, the
//   hero’s level before, after, the experience before] (source: main · side · kill · camp ·
//   lair · other; weight: 10 a boss, 5 a rare, 2 an elite, 1 — or the quest’s id);
//   `await K.save('name')` keeps the result and the log in screenshots/name.png (a JSON text)
// The heroes keep their levels from a chapter to the next and from a page to the next (the
// profiles are saved): `fresh` starts from level 1, `level` from that level (36.7: level 36,
// the bar seven tenths full).
// Also: what a party of a level meets at a land’s own camp (`campStart`), and a party ahead of
// the story, saved to a file and brought back to try an old save on new rules (`veterans`,
// `dump`, `restore`).
// The aim (saga/levels.js): with the main quests alone, a party enters chapter n at about level
// 4n − 3; with every side quest and camp, no more than two above.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const D = () => window.game.debug;

// every gain of experience, with what gave it
function hook(P, S, QUESTS, log, at) {
  const C = P.combat, ctx = [];
  if (C.__pace) { C.__pace.log = log; C.__pace.at = at; return; }
  const H = C.__pace = { log, at };
  const idOf = new Map(Object.entries(QUESTS).map(([id, Q]) => [Q, id]));
  const wrap = (o, name, mk) => { if (!o || !o[name]) return; const f = o[name]; o[name] = function (...a) { ctx.push(mk(...a)); try { return f.apply(this, a); } finally { ctx.pop(); } }; };
  wrap(C, 'kill', (e) => ['kill', e.level || 0, e.def.boss ? 10 : e.rare ? 5 : e.elite ? 2 : 1]);
  wrap(S, 'reward', (Q) => [Q.kind === 'side' ? 'side' : 'main', Q.lv || 0, idOf.get(Q) || '?']);
  wrap(P.encounters, 'clear', (c) => ['camp', c.level || 0, 3]);
  wrap(P.lairs, 'victory', (L) => ['lair', 0, L.world ? 6 : 4]);
  const gain = C.gainXp;
  C.gainXp = function (p, n) {
    const f = p.fighter, was = f ? f.level : 0, x0 = f ? f.xp : 0, src = ctx[ctx.length - 1] || ['other', 0, 0];
    const r = gain.call(this, p, n);
    if (f) H.log.push([H.at.ch, P.players.indexOf(p), ...src, Math.round(n), was, f.level, x0]);
    return r;
  };
}

const heroes = (P) => P.players.filter((p) => p.connected || P.solo);
const lvOf = (P, XP_NEED) => heroes(P).map((p) => (p.fighter ? +(p.fighter.level + p.fighter.xp / XP_NEED(p.fighter.level)).toFixed(2) : 0));

// a land’s own camp, cleared as the bots clear the story’s
async function wildCamps(P, zones, tp) {
  const E = P.encounters, C = P.combat, out = [];
  for (const c of E.camps.filter((q) => !q.saga && zones.includes(q.zone) && q.state !== 'cleared')) {
    await tp(c.x, c.z + 3);
    for (let i = 0; i < 30 && c.state !== 'cleared'; i++) {
      await D().step(20, 1 / 60); await sleep(1);
      for (const e of C.enemies) if (e.alive && Math.hypot(e.x - c.x, e.z - c.z) < 14) C.kill(e, heroes(P)[0]);
    }
    out.push(c.id + (c.state === 'cleared' ? '' : '?'));
  }
  return out;
}

export async function run(mode, n, chs = [1], { side = false, camps = false, fresh = false, level = 0, cls = 'knight', fast = 1 } = {}) {
  if (fresh) for (const k of Object.keys(localStorage)) if (k.startsWith('hearthlight.')) localStorage.removeItem(k);
  // (`fast: 2`: half the pictures for the same game time — frames of 1/30 s, as a slow machine
  // gives anyway; the story and its experience do not depend on it, a long run takes half as long)
  if (fast > 1 && !D().slowStep) { const dbg = D(), slow = dbg.slowStep = dbg.step; dbg.step = (k = 1, dt = 1 / 60) => slow(Math.max(1, Math.ceil(k / fast)), Math.min(0.05, dt * fast)); }
  const V = window.V = await import('/tools/sagatest.js?' + Date.now());
  const { XP_NEED } = await import('/src/saga/levels.js');
  const res = { mode, n, side, camps, ch: {} }, t0 = performance.now();
  if (mode === 'solo') await V.solo(cls);
  else {
    await V.ready(); V.watchErrors();
    const T = window.T = await import('/tools/partybots.js?' + Date.now());
    await T.boot(n); await T.autoplay('saga', [], { until: () => true });
  }
  const S = V.saga(), P = S.P, C = P.combat;
  const { QUESTS, CHAPTERS } = await import('/src/saga/chapters/index.js');
  const log = window.__paceLog = window.__paceLog || [], at = { ch: 0 };
  hook(P, S, QUESTS, log, at);
  if (level) for (const p of heroes(P)) { const f = p.fighter; f.level = Math.floor(level); f.xp = Math.round((level % 1) * XP_NEED(f.level)); f.eff = C.effOf(p); C.refreshStats(p, true); P.saveProfile(p); }
  const tp = async (x, z) => {
    if (P.solo) D().tp(x, z); else { heroes(P).forEach((p, i) => { p.actor.pos = { x: x + (i % 3) * 0.8 - 0.8, z: z + Math.floor(i / 3) * 0.8 }; }); P.cam.snap(P.camPlayers()); }
    await D().step(6, 1 / 60);
  };
  for (const ch of chs) {
    await V.toChapter(ch);
    if (ch === 1 && !S.st.q.c1_intro) S.start('c1_intro');
    at.ch = ch;
    const k0 = log.length, into = lvOf(P, XP_NEED), plog = [];
    const all = Object.entries(QUESTS).filter(([, Q]) => Q.ch === ch && (side || Q.kind !== 'side')).map(([id]) => id);
    const want = () => all.filter((id) => !(id === 'c5_mirage_buy' && S.has('mirageReported')) && !(id === 'c5_mirage_tell' && S.has('mirageBought')));
    const fin = (id) => (QUESTS[id].repeat ? S.plays(id) > 0 : S.done(id));
    await V.autoplay({ side, maxSteps: 700, log: plog, prefer: (id) => QUESTS[id] && QUESTS[id].ch === ch && (side || QUESTS[id].kind !== 'side') && !(QUESTS[id].repeat && S.plays(id) > 0), until: () => want().every(fin) });
    const cleared = camps ? await wildCamps(P, CHAPTERS.find((q) => q.id === ch).zones || [], tp) : [];
    // what gave the first hero’s experience, in levels of that moment
    const by = {};
    for (const g of log.slice(k0)) if (g[1] === 0) by[g[2]] = +((by[g[2]] || 0) + (g[5] * (heroes(P)[0].fighter.mods.xp || 1)) / XP_NEED(g[6])).toFixed(3);
    res.ch[ch] = { in: into, out: lvOf(P, XP_NEED), by, done: want().filter(fin).length, of: want().length, missing: want().filter((id) => !fin(id)), camps: cleared, tail: plog.slice(-2) };
    for (const p of heroes(P)) P.saveProfile(p);
    if (P.flushProfiles) P.flushProfiles();
    window.__pace = 'progress ' + JSON.stringify(res);
  }
  res.errs = V.errs();
  res.min = +((performance.now() - t0) / 60000).toFixed(1);
  return res;
}

// What a party of a level meets at a land’s own camp — the real one, at the level the land
// gives it, the heroes (geared, every talent point spent: tools/balance.js) fighting at the
// level the land holds them at: how long it takes, how much it hurts (the health lost, in
// health bars a hero), who goes down, and what a hero earns there.
//   K.campStart(4, 'dino', 30, 3)   → window.__pace
// (`land`: other levels for the land and its camp, for this page only — [27, 30] is Dino Isle
// as it was before the levels were spread four a chapter: the same fight, yesterday’s numbers)
export async function camp(n, zone, level, reps = 3, land = null) {
  const V = window.V = await import('/tools/sagatest.js?' + Date.now());
  await V.ready(); V.watchErrors();
  const T = window.T = await import('/tools/partybots.js?' + Date.now());
  const { equip } = await import('/tools/balance.js?' + Date.now());
  const { XP_NEED } = await import('/src/saga/levels.js');
  const { ZONES } = await import('/src/world/big/layout.js');
  await T.boot(n); await T.autoplay('saga', [], { until: () => true });
  const S = V.saga(), P = S.P, C = P.combat, E = P.encounters;
  S.st.open = ZONES.map((z) => z.id);
  if (P.murk) P.murk.refresh(true);
  // (the story’s opening has the floor first: nothing wakes while it talks)
  const quiet = () => V.play(3000, { until: () => !V.stage().active && !P.dialogue.cur && !S.busyTalk && !S.running });
  await quiet();
  const c = E.camps.find((q) => q.zone === zone && !q.saga);
  if (!c) throw new Error('no camp in ' + zone);
  if (land) { const lv = ZONES.find((z) => z.id === zone).lv; c.level = Math.round(land[1] - (lv[1] - c.level)); lv[0] = land[0]; lv[1] = land[1]; }
  for (const p of heroes(P)) {
    const pr = P.progress.prof(p), f = p.fighter;
    pr.level = f.level = level; pr.xp = f.xp = 0; pr.talents = {};
    await equip(P, p);
  }
  let hurt = 0;
  const hp = C.hurtPlayer;
  C.hurtPlayer = function (q, ...a) { const f = q.fighter, h0 = f ? f.hp + (f.shield || 0) : 0; const r = hp.call(this, q, ...a); if (f) hurt += Math.max(0, h0 - Math.max(0, f.hp) - (f.shield || 0)); return r; };
  const place = async (dz) => { heroes(P).forEach((p, i) => { p.actor.pos = { x: c.x + (i % 4) * 0.8 - 1.2, z: c.z + dz + Math.floor(i / 4) * 0.8 }; }); P.cam.snap(P.camPlayers()); await D().step(6, 1 / 60); };
  const runs = [];
  for (let r = 0; r < reps; r++) {
    E.despawn(c); c.state = 'idle'; c.told = false; E.cleared.delete(c.id);
    await place(14);
    await quiet();
    for (let k = 0; k < 12 && !c.foes.length; k++) { await D().step(10, 1 / 60); await sleep(40); }
    if (!c.foes.length) throw new Error('the camp does not come: ' + c.state);
    for (const p of heroes(P)) { const f = p.fighter; if (f.down) C.revive(p, 1, null); f.level = level; f.xp = 0; f.eff = C.effOf(p); C.refreshStats(p, true); f.hp = f.maxHp; f.cd = 0; f.ult = 0; for (const u in f.ults) f.ults[u] = 0; f.combo = 0; f.buffT = 0; f.inv = 0; }
    C.comboState = null;
    const foes = c.foes.slice(), lv = foes.map((e) => e.level).sort((a, b) => a - b), pool = Math.round(foes.reduce((s, e) => s + e.maxHp, 0));
    await place(5);
    hurt = 0;
    const t0 = P.t, was = new Set(), bar = heroes(P).reduce((s, p) => s + p.fighter.maxHp, 0) / heroes(P).length;
    let downs = 0;
    for (let k = 0; k < 90 && c.state !== 'cleared'; k++) {
      await T.fight(60);
      if (P.dialogue.active) await T.skipTalk(60);
      for (const p of heroes(P)) { const f = p.fighter; if (f.down && !was.has(p)) { was.add(p); downs++; } if (!f.down) was.delete(p); }
      if (window.__stop) throw new Error('stopped');
    }
    const f0 = heroes(P)[0].fighter;
    runs.push({ secs: +(P.t - t0).toFixed(1), left: c.foes.filter((e) => e.alive).length, foes: foes.length, lv: lv[0] + '–' + lv[lv.length - 1], pool, eff: f0.eff, bars: +(hurt / heroes(P).length / bar).toFixed(2), downs, xp: +(((f0.level - level) + f0.xp / XP_NEED(f0.level)) * 100).toFixed(1) });
    window.__pace = 'progress ' + JSON.stringify(runs);
  }
  C.hurtPlayer = hp;
  const mid = (k) => runs.map((q) => q[k]).sort((a, b) => a - b)[Math.floor(runs.length / 2)];
  return { n, zone, land: ZONES.find((z) => z.id === zone).lv, camp: c.level, level, secs: mid('secs'), bars: mid('bars'), downs: runs.reduce((s, q) => s + q.downs, 0), xp: mid('xp'), runs, errs: V.errs() };
}
export function campStart(...args) {
  window.__pace = 'run';
  camp(...args).then((r) => { window.__pace = 'done ' + JSON.stringify(r); }).catch((e) => { window.__pace = 'err ' + e + ' ' + String(e && e.stack || '').slice(0, 400); });
  return 'started';
}

// A party ahead of the story, saved: n heroes of a level (geared, their talent points spent),
// the story at the start of a chapter — `dump` writes the whole save to a file, `restore`
// brings it back (a save made before a change, tried after it).
//   await K.veterans(4, 6, 30); await K.dump('save_ch6_lv30')   …later:   await K.restore('save_ch6_lv30'), reload
export async function veterans(n, ch, level, xp = 0.4) {
  for (const k of Object.keys(localStorage)) if (k.startsWith('hearthlight.')) localStorage.removeItem(k);
  const V = window.V = await import('/tools/sagatest.js?' + Date.now());
  await V.ready(); V.watchErrors();
  const T = window.T = await import('/tools/partybots.js?' + Date.now());
  const { equip } = await import('/tools/balance.js?' + Date.now());
  const { XP_NEED } = await import('/src/saga/levels.js');
  await T.boot(n); await T.autoplay('saga', [], { until: () => true });
  const S = V.saga(), P = S.P, C = P.combat;
  await V.toChapter(ch);
  heroes(P).forEach((p, i) => { const pr = P.progress.prof(p), f = p.fighter; pr.level = f.level = level + (i % 2); pr.xp = f.xp = Math.round(XP_NEED(f.level) * xp); pr.talents = {}; });
  const { TREES, spentIn } = await import('/src/combat/v4/talents.js');
  for (const p of heroes(P)) {
    await equip(P, p);
    // (their talents the way players spend them: a branch up to its ultimate, then the next)
    const pr = P.progress.prof(p), cls = p.fighter.clsId, learn = (id) => P.progress.onMsg(p, { t: 'talent', id });
    pr.talents = {};
    for (const b of [0, 1, 2]) {
      const rows = TREES[cls][b].talents.slice().sort((x, y) => x.row - y.row);
      for (let k = 0; k < 4; k++) for (const T of rows) if (!T.ult && spentIn(cls, pr.talents[cls] || {}, b) < 11) learn(T.id);
      for (const T of rows) if (T.ult) learn(T.id);
    }
    P.progress.refresh(p);
    p.fighter.eff = C.effOf(p); C.refreshStats(p, true); P.saveProfile(p);
  }
  P.saveNow();
  return who(P);
}
// who is there: each hero’s level, experience, talent points spent and ultimates
export const who = (P = window.game.party) => heroes(P).map((p) => ({ id: p.id, cls: p.fighter.clsId, level: p.fighter.level, xp: p.fighter.xp, eff: p.fighter.eff, spent: Object.values(P.progress.prof(p).talents[p.fighter.clsId] || {}).reduce((a, b) => a + b, 0), ults: p.fighter.ultIds || [] }));
export async function dump(name) {
  const all = {};
  for (const k of Object.keys(localStorage)) if (k.startsWith('hearthlight.')) all[k] = localStorage.getItem(k);
  return (await fetch('/__shot?name=' + name, { method: 'POST', body: JSON.stringify(all) })).text();
}
export async function restore(name) {
  const all = await (await fetch('/screenshots/' + name + '.png?' + Date.now())).json();
  for (const k of Object.keys(localStorage)) if (k.startsWith('hearthlight.')) localStorage.removeItem(k);
  for (const [k, v] of Object.entries(all)) localStorage.setItem(k, v);
  return Object.keys(all).length;
}

// the result and the whole log, kept on disk: screenshots/<name>.png (a JSON text under a
// picture’s name — the dev server writes what it is given)
export async function save(name) {
  const body = JSON.stringify({ res: window.__pace, log: window.__paceLog || [] });
  return (await fetch('/__shot?name=' + name, { method: 'POST', body })).text();
}

export function start(...args) {
  window.__pace = 'run';
  run(...args).then((r) => { window.__pace = 'done ' + JSON.stringify(r); }).catch((e) => { window.__pace = 'err ' + e + ' ' + String(e && e.stack || '').slice(0, 400); });
  return 'started';
}
