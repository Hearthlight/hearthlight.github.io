// World v7 M14: a balance pass — n bot heroes (their level synced to the land’s) against a
// camp of that land’s gloom at its level (sized like a real camp for the heroes around it),
// fighting for real (partybots’ `fight`): how long it takes, how many heroes go down. The
// heroes are at the camp’s own level (and, `geared`, carry what a hero of that level would).
// Group scaling should keep the time about the same for 1, 4 or 8 heroes, and the level
// curves the same at 5, 20 or 40. Each land’s camp comes twice — its smaller gloom alone
// (`camp: 'small'`), then with a brute among them (`'brute'`) — and each is fought `reps`
// times from a fresh start (no combo, no cooldowns): the median counts, the bots’ aim is noisy.
//   (await import('/tools/balance.js?' + Date.now())).start(4, undefined, true)   → poll window.__bal
// (one party size per page load: reload between runs)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// a spot of open ground in a land of each level band, and what lives there: its smaller gloom
// (in the order it joins a camp) and a brute
const SITES = [
  { lv: 5, zone: 'deepwood', at: [100, -30], foes: ['gloomling', 'fox', 'rootling', 'gloomling'], brute: 'boar' },
  { lv: 20, zone: 'marsh', at: [300, 60], foes: ['toad', 'shaman', 'gloomling', 'toad'], brute: 'stormram' },
  { lv: 40, zone: 'scar', at: [1360, 60], foes: ['wisp', 'clockwork', 'bogling', 'yeti'], brute: 'ogre' },
];
// (a boss alone: `run(n, BOSS, true, 2)` — the Frost Colossus and its shield)
export const BOSS = [{ lv: 40, zone: 'scar', at: [1360, 60], boss: 'colossus' }];

// (like a real hero of that level: every talent point spent, a good weapon, two charms, a rune)
async function equip(P, p) {
  const { TALENT } = await import('/src/combat/v4/talents.js');
  const cls = p.cls || 'knight', ids = Object.keys(TALENT).filter((id) => TALENT[id].cls === cls);
  for (let pass = 0; pass < 8; pass++) for (const id of ids) P.progress.onMsg(p, { t: 'talent', id });
  const pr = P.progress.prof(p);
  pr.gear.bag = []; pr.gear.charms = [null, null]; pr.gear.rune = null; pr.gear.weapons = {};
  // (the same gear every run: it is drawn from a seed, not from luck — a lone hero’s weapon would
  // weigh more than what is being measured)
  const luck = Math.random;
  let seed = 9001 + (p.slot || 0) * 131 + (P.progress.level(p) || 1) * 17;
  Math.random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  try { for (let k = 0; k < 6; k++) P.progress.give(p, true, 3); } finally { Math.random = luck; }
  for (const it of pr.gear.bag) {
    if (it.kind === 'weapon' && it.cls !== cls) continue;
    if (it.kind === 'weapon' && pr.gear.weapons[cls]) continue;
    if (it.kind === 'rune' && pr.gear.rune) continue;
    if (it.kind !== 'weapon' && it.kind !== 'rune' && pr.gear.charms.every(Boolean)) continue;
    P.progress.onMsg(p, { t: 'gear', op: 'equip', id: it.id });
  }
  P.progress.refresh(p);
}

// every hero at the camp’s own level, whatever the fights before taught them — and, `geared`,
// carrying what a hero of that level would
async function pin(ctx, lv, geared) {
  const { P, heroes } = ctx;
  for (const p of heroes()) {
    const pr = P.progress.prof(p), f = p.fighter;
    pr.level = f.level = lv; pr.xp = f.xp = 0;
    pr.talents = {}; pr.gear.bag = []; pr.gear.weapons = {}; pr.gear.charms = [null, null]; pr.gear.rune = null;
    if (geared) await equip(P, p); else P.progress.refresh(p);
    f.eff = P.combat.effOf(p); P.combat.refreshStats(p, true);
  }
}

// one fight: the heroes on open ground by the site, a fresh camp in front of them
async function camp(ctx, site, brute = false) {
  const { P, T, D, n, heroes, makeElite } = ctx, B = P.big, C = P.combat, [x0, z0] = site.at;
  let sx = x0, sz = z0;
  for (let r = 0; r < 20; r++) { let ok = false; for (let k = 0; k < 12 && !ok; k++) { const a = (k / 12) * Math.PI * 2, x = x0 + Math.cos(a) * r, z = z0 + Math.sin(a) * r; if (!B.col.blocked(x, z, 2)) { sx = x; sz = z; ok = true; } } if (ok) break; }
  heroes().forEach((p, i) => { p.actor.pos = { x: sx + (i % 4) * 0.8 - 1.2, z: sz + 3 + Math.floor(i / 4) * 0.8 }; if (p.fighter && p.fighter.down) C.revive(p, 1, null); });
  P.cam.snap(P.camPlayers());
  for (const q of C.enemies) if (q.alive) { q.alive = false; q.fading = 0; q.remove(); }
  for (let k = 0; k < 8; k++) { await D.step(5, 1 / 60); await sleep(40); }
  // (the story may have something to say on the way: nobody fights while it talks)
  await T.skipTalk(60);
  C.comboState = null;
  for (const p of heroes()) { const f = p.fighter, pr = P.progress.prof(p); if (f) { pr.level = f.level = site.lv; pr.xp = f.xp = 0; f.eff = C.effOf(p); C.refreshStats(p, true); } }
  for (const p of heroes()) { const f = p.fighter; if (f) { f.hp = f.maxHp; f.cd = 0; f.ult = 0; for (const u in f.ults) f.ults[u] = 0; f.combo = 0; f.buffT = 0; } }
  // (a real camp — encounters.js: two places, one or two more further out, one more for every two
  // heroes around; a brute takes two of them and, from four heroes up, a second one four more; an
  // elite, never a brute, for every four heroes)
  const places = 2 + Math.min(2, Math.floor(site.lv / 12)) + Math.floor(n / 2), big = brute && site.brute ? (n >= 4 && places >= 6 ? 2 : 1) : 0;
  const types = site.boss ? [site.boss] : Array.from({ length: big }, () => site.brute).concat(Array.from({ length: places - [0, 2, 6][big] }, (_, i) => site.foes[i % site.foes.length]));
  const foes = types.map((type, i) => C.spawn(type, sx - 3 + (i % 6) * 1.6, sz - 3 - Math.floor(i / 6) * 1.6, { level: site.lv }));
  if (!site.boss) foes.filter((e) => !e.def.brute).slice(0, Math.floor(n / 4)).forEach((e) => { makeElite(e); e.level++; });
  for (const e of foes) { e.spawnT = 0; if (e.state === 'sleep') C.wake(e); }
  const t0 = P.t, was = new Set(), d0 = { ...T.dodgeStats };
  let downs = 0;
  for (let k = 0; k < (site.boss ? 120 : 60) && foes.some((e) => e.alive); k++) {
    await T.fight(60);
    if (P.dialogue.active) await T.skipTalk(60);
    for (const p of heroes()) { if (p.fighter && p.fighter.down && !was.has(p)) { was.add(p); downs++; } if (p.fighter && !p.fighter.down) was.delete(p); }
    if (window.__stop) throw new Error('stopped');
  }
  const eff = heroes()[0] && heroes()[0].fighter ? heroes()[0].fighter.eff : '?';
  const out = { secs: +(P.t - t0).toFixed(1), left: foes.filter((e) => e.alive).length, downs, eff, foes: foes.length, hp: Math.round(foes[foes.length - 1].maxHp), pool: Math.round(foes.reduce((s, e) => s + e.maxHp, 0)),
    // (Release v9: the bots dodge what's telegraphed — how often they were in a marked spot, and got out)
    seen: T.dodgeStats.seen - d0.seen, dodged: T.dodgeStats.stepped - d0.stepped };
  for (const q of C.enemies) if (q.alive) { q.alive = false; q.fading = 0; q.remove(); }
  return out;
}

export async function run(n = 1, sites = SITES, geared = false, reps = 3, clsList = null) {
  const V = await import('/tools/sagatest.js?' + Date.now());
  await V.ready(); V.watchErrors();
  const T = await import('/tools/partybots.js?' + Date.now());
  await T.boot(n); await T.autoplay('saga', [], { until: () => true });
  const P = window.game.party, D = window.game.debug, S = V.saga();
  const { ZONES } = await import('/src/world/big/layout.js');
  const { makeElite } = await import('/src/combat/v3/bestiary.js');
  S.st.open = ZONES.map((z) => z.id);
  if (S.P.murk) S.P.murk.refresh(true);
  const heroes = () => P.players.filter((p) => p.connected);
  const ctx = { P, T, D, n, heroes, makeElite }, res = [];
  // (Release v9: `clsList` picks the heroes, e.g. the four new ones for a party of four)
  if (clsList) heroes().forEach((p, i) => { P.combat.setClass(p, clsList[i % clsList.length]); P.saveProfile(p); });
  for (const site of sites) for (const brute of site.boss || !site.brute ? [false] : [false, true]) {
    await pin(ctx, site.lv, geared);
    const runs = [];
    for (let r = 0; r < reps; r++) runs.push(await camp(ctx, site, brute));
    const by = runs.slice().sort((a, b) => a.secs - b.secs), mid = by[Math.floor(by.length / 2)];
    res.push({ n, geared, lv: site.lv, camp: site.boss ? 'boss' : brute ? 'brute' : 'small', ...mid, downs: runs.reduce((s, q) => s + q.downs, 0), all: runs.map((q) => q.secs), seen: runs.reduce((s, q) => s + q.seen, 0), dodged: runs.reduce((s, q) => s + q.dodged, 0) });
    window.__bal = 'progress ' + JSON.stringify(res);
  }
  res.errs = V.errs();
  return res;
}

// (Release v9) every hero class alone, one after the other in the same party of one: the same
// camps (a brute in each), geared or not — which class is too weak or too strong?
//   (await import('/tools/balance.js?' + Date.now())).classes(undefined, true, 2)   → poll window.__bal
export async function runClasses(sites = SITES, geared = true, reps = 2, only = null) {
  const V = await import('/tools/sagatest.js?' + Date.now());
  await V.ready(); V.watchErrors();
  const T = await import('/tools/partybots.js?' + Date.now());
  const { CLASS_ORDER } = await import('/src/combat/classes.js');
  await T.boot(1); await T.autoplay('saga', [], { until: () => true });
  const P = window.game.party, D = window.game.debug, S = V.saga();
  const { ZONES } = await import('/src/world/big/layout.js');
  const { makeElite } = await import('/src/combat/v3/bestiary.js');
  S.st.open = ZONES.map((z) => z.id);
  if (S.P.murk) S.P.murk.refresh(true);
  const heroes = () => P.players.filter((p) => p.connected);
  const ctx = { P, T, D, n: 1, heroes, makeElite }, res = {};
  for (const cls of only || CLASS_ORDER) {
    const p = heroes()[0];
    P.combat.setClass(p, cls); P.saveProfile(p);
    res[cls] = [];
    for (const site of sites) {
      await pin(ctx, site.lv, geared);
      const runs = [];
      for (let r = 0; r < reps; r++) runs.push(await camp(ctx, site, true));
      const by = runs.slice().sort((a, b) => a.secs - b.secs), mid = by[Math.floor(by.length / 2)];
      res[cls].push({ lv: site.lv, secs: mid.secs, left: mid.left, downs: runs.reduce((s2, q) => s2 + q.downs, 0), all: runs.map((q) => q.secs), dodged: runs.reduce((s2, q) => s2 + q.dodged, 0) + '/' + runs.reduce((s2, q) => s2 + q.seen, 0) });
      window.__bal = 'progress ' + JSON.stringify(res);
    }
  }
  res.errs = V.errs();
  return res;
}
export function classes(...args) {
  window.__bal = 'run';
  runClasses(...args).then((r) => { window.__bal = 'done ' + JSON.stringify(r); }).catch((e) => { window.__bal = 'err ' + e + ' ' + String(e && e.stack || '').slice(0, 300); });
  return 'started';
}

export function start(...args) {
  window.__bal = 'run';
  run(...args).then((r) => { window.__bal = 'done ' + JSON.stringify(r) + ' errs ' + JSON.stringify(r.errs); }).catch((e) => { window.__bal = 'err ' + e + ' ' + String(e && e.stack || '').slice(0, 300); });
  return 'started';
}
