// The Party Mode trailer, shot by shot (recorded with tools/reel.js, cut by
// tools/reelcut.py after tools/trailer.edl.json). On a fresh ?debug=1 page:
//   const TR = await import('/tools/trailer.js');
//   await TR.all();          // every shot → screenshots/reel/<shot>.mkv + its sound log (~10 min)
//   await TR.mix();          // the soundtrack: the festival track + each shot's own sounds → mix.wav
//   python3 tools/reelcut.py cut tools/trailer.edl.json screenshots/reel/hearthlight_trailer.mp4 screenshots/reel/mix.wav
// One shot again: await TR.boot({ crew: 7 }); await TR.toExplore(); TR.full(); TR.heroes(); await TR.camp();
// (the lobby & vote need a fresh boot() without crew: the friends join on camera)
import * as R from './reel.js';
import * as T from './partybots.js';

const g = () => window.game;
const P = () => window.game.party;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const FPS = 30, BAR = (60 / 112) * 4;          // the festival track: 112 bpm, 4/4

const LOOK = (skin, hair, hairColor, top, topColor, topColor2, bottom, bottomColor, hat = 'none', hatColor = 'navy', extra = {}) =>
  ({ skin, hair, hairColor, eyes: 'storm', top, topColor, topColor2, bottom, bottomColor, shoes: 'brown', hat, hatColor, acc: 'none', facial: 'none', ...extra });
export const ALEX = LOOK('peach', 'long', 'ginger', 'hoodie', 'orange', 'white', 'skirt', 'navy', 'beret', 'navy');
export const CREW = [
  { name: 'Mia', cls: 'mage', look: LOOK('porcelain', 'curly', 'snow', 'apron', 'sage', 'pink', 'skirt', 'grey', 'none', 'lime', { eyes: 'forest', shoes: 'tan' }) },
  { name: 'Sam', cls: 'ranger', look: LOOK('cocoa', 'long', 'cherry', 'dress', 'teal', 'navy', 'shorts', 'blue') },
  { name: 'Leo', cls: 'bard', look: LOOK('honey', 'long', 'butter', 'vest', 'lime', 'pink', 'pants', 'blue', 'none', 'teal', { eyes: 'forest', shoes: 'red' }) },
  { name: 'Zoe', cls: 'knight', look: LOOK('tan', 'short', 'rose', 'dress', 'sage', 'cream', 'skirt', 'sage', 'witch', 'navy', { eyes: 'ocean', shoes: 'red' }) },
  { name: 'Ben', cls: 'mage', look: LOOK('porcelain', 'pixie', 'sky', 'coat', 'sage', 'pink', 'shorts', 'brown', 'beret', 'cream', { eyes: 'rose', shoes: 'red', facial: 'beard' }) },
  { name: 'Nina', cls: 'ranger', look: LOOK('umber', 'pixie', 'snow', 'striped', 'cream', 'pink', 'skirt', 'grey', 'beanie', 'lavender', { eyes: 'hazel', shoes: 'red', acc: 'freckles' }) },
  { name: 'Max', cls: 'bard', look: LOOK('cocoa', 'braids', 'mint', 'apron', 'lime', 'cream', 'skirt', 'sage', 'straw', 'sage', { eyes: 'violet', shoes: 'red', facial: 'mustache' }) },
];

// [[seconds, fn], …] → an `each` that fires them on their frame
export const cue = (plan) => async (f) => { for (const [s, fn] of plan) if (f === Math.round(s * FPS)) await fn(); };
export const bot = (name) => T.bots.find((b) => P().byId.get(b.id) && P().byId.get(b.id).name === name);
export const pl = (name) => P().players.find((p) => p.name === name);

// ------------------------------------------------------------------ boot
export async function boot({ phone = true, zoom = 3, crew = 0 } = {}) {
  // a fresh world: every place still to discover
  for (const k of Object.keys(localStorage)) if (k.startsWith('hearthlight.party.')) localStorage.removeItem(k);
  await R.setup();
  window.__errs = [];
  window.addEventListener('error', (e) => window.__errs.push(String(e.message) + ' @' + e.filename + ':' + e.lineno));
  window.addEventListener('unhandledrejection', (e) => window.__errs.push('rej ' + String((e.reason && e.reason.stack) || e.reason)));
  g().toParty();
  for (let i = 0; i < 60 && !P().net.code; i++) { await sleep(150); await g().debug.step(2); }
  if (phone) {
    R.size(1440, 1080);
    const ph = await R.phone(P().net.code, { name: 'Alex', cls: 'knight', look: { ...ALEX, hair: 'short', hairColor: 'chestnut', hat: 'none' } });
    for (let i = 0; i < 40 && !ph.pad.S.me; i++) { await sleep(100); await g().debug.step(2); ph.pad.draw(); }
    R.placePhone();
  }
  P().zoom.set(zoom);
  for (const c of CREW.slice(0, crew)) await T.addBot(c.name, c.look, c.cls);
  await R.run(1);
  return P();
}

// ------------------------------------------------------------------ 1. the lobby: join with your phone
export async function lobby(name = 'lobby') {
  const alex = pl('Alex');
  alex.actor.pos = { x: 91.2, z: 79.4 };
  alex.actor.dir = { x: 0, z: 1 };
  await R.run(0.6);
  const plan = [
    [0.45, () => R.press('rhair')], [1.0, () => R.press('rhairColor')], [1.45, () => R.press('rhairColor')],
    [2.0, () => R.press('tab2')], [2.45, () => R.press('rhat')], [2.9, () => R.press('rhat')],
    [3.35, () => R.press('rhat')], [3.8, () => R.press('rhat')], [4.35, () => R.press('rhat')],
    [5.2, () => R.press('ready')],
  ];
  CREW.forEach((c, i) => plan.push([0.25 + i * 0.5, () => T.addBot(c.name, c.look, c.cls)]));
  CREW.forEach((c, i) => plan.push([4.6 + i * 0.22, () => { const b = bot(c.name); if (b) b.send({ t: 'ready', v: true }); }]));
  return R.clip(name, BAR * 3, cue(plan), {
    captions: [{ text: 'Your phone is the controller', sub: 'scan the code · up to 8 players · no app to install', at: 0.35, dur: BAR * 3 - 0.5, y: 158 }],
  });
}

// ------------------------------------------------------------------ 2. walk, wave, start & vote
export async function vote(name = 'vote', picks = [1, 1, 0, 1, 2, 1, 1]) {
  const plan = [
    [0.05, () => R.stick(0.95, 0.3)], [0.75, () => R.stick(0.3, -0.95)], [1.15, () => R.press('a', 0.2)], [1.4, () => R.stick(null)],
    [1.7, () => R.press('hstart')], [2.55, () => R.press('opt1')],
  ];
  CREW.forEach((c, i) => plan.push([2.2 + i * 0.2, () => { const b = bot(c.name), v = P().vote; if (b && v) b.send({ t: 'pick', id: v.id, i: picks[i] }); }]));
  return R.clip(name, BAR * 2, cue(plan), {
    captions: [{ text: 'Vote on what to play', at: 0.3, dur: BAR * 2 - 0.4, x: 244, y: 187 }],
  });
}

// ------------------------------------------------------------------ out in the world
import { TREES } from '../src/combat/v4/talents.js';

// everyone's input: bots by message, Alex through the phone page
export function input(p, m) {
  const b = T.bots.find((x) => x.id === p.id);
  if (b) b.send(m);
  else if (p.name === 'Alex' && R.R.phone) R.R.phone.pad.send(m);
}
export const steer = (p, x, y) => input(p, { t: 'in', x: +x.toFixed(2), y: +y.toFixed(2) });
export function tapKey(p, k = 'a', hold = 0.05) { input(p, { t: 'b', k, v: 1 }); R.R.after.push({ tm: R.R.tm + hold, fn: () => input(p, { t: 'b', k, v: 0 }) }); }

// the big screen without the phone beside it
export function full(zoom = 3) {
  if (R.R.phone) R.R.phone.side = false;
  R.size(1920, 1080);
  if (zoom) P().zoom.set(zoom);
}

// no "X, Y and Z reached …" toasts in the film (the zone banners stay)
export function quiet() {
  const Pa = P();
  if (Pa.__quiet) return;
  Pa.__quiet = true;
  const toast = Pa.toast.bind(Pa);
  Pa.toast = (msg, ...a) => (/reached|joined|left the party|talent point/.test(msg) ? null : toast(msg, ...a));
}

// the whole party (or some of it) to a spot, in rows
export async function go(x, z, { hour = null, who = null, cols = 4, gap = 1.3, secs = 2, dir = { x: 0, z: 1 } } = {}) {
  const Pa = P(), ps = who || Pa.players;
  for (const p of ps) { steer(p, 0, 0); if (p.vehicle) Pa.vehicles.leave(p, true); if (p.mount) Pa.mounts.dismount(p, true); }
  await sleep(80); await g().debug.step(2);
  ps.forEach((p, i) => { p.actor.pos = { x: x + ((i % cols) - (cols - 1) / 2) * gap, z: z + Math.floor(i / cols) * gap }; p.actor.jumpY = 0; p.actor.jumpV = 0; p.actor.dir = { ...dir }; });
  if (hour != null) Pa.state.hour = hour;
  Pa.cam.snap(Pa.camPlayers());
  for (let i = 0; i < secs * 5; i++) { await sleep(60); await g().debug.step(12); }
  Pa.cam.snap(Pa.camPlayers());
}

// heroes at level 30 with a full branch (its ultimate at the end)
export const BRANCH = { Alex: 1, Mia: 0, Sam: 1, Leo: 1, Zoe: 2, Ben: 1, Nina: 0, Max: 0 };
export function heroes(lv = 30) {
  const Pa = P();
  for (const p of Pa.players) {
    const pr = Pa.profileOf(p), picks = {};
    for (const Tl of TREES[p.cls][BRANCH[p.name] || 0].talents) picks[Tl.id] = Tl.max;
    pr.level = lv; pr.xp = 0;
    (pr.talents = pr.talents || {})[p.cls] = picks;
    if (p.fighter) { p.fighter.level = lv; Pa.combat.refreshStats(p, true); }
  }
}

// the fighting AI, one decision per call (never steps the game itself)
export function fightTick({ special = 0.1, ult = false, who = null } = {}) {
  const Pa = P(), C = Pa.combat;
  if (!C) return;
  for (const p of who || Pa.players) {
    const f = p.fighter;
    if (!f || f.down || p.mount || p.vehicle) continue;
    const foes = C.pvp ? Pa.players.filter((q) => q !== p && q.fighter && !q.fighter.down).map((q) => ({ x: q.pos.x, z: q.pos.z, r: 0.3 }))
      : C.enemies.filter((e) => e.alive && e.hurtable).map((e) => ({ x: e.x, z: e.z, r: e.r || 0.3 }));
    let best = null, bd = 1e9;
    for (const e of foes) { const d = Math.hypot(e.x - p.pos.x, e.z - p.pos.z) - e.r + 0.3; if (d < bd) { bd = d; best = e; } }
    if (!best) { steer(p, 0, 0); continue; }
    const dx = best.x - p.pos.x, dz = best.z - p.pos.z, l = Math.hypot(dx, dz) || 1;
    const reach = f.cls.light[0].kind === 'melee' ? 1.2 : 4.5;
    if (ult && f.ult >= 100 && bd < reach + 1.5) { tapKey(p, 'u'); continue; }
    if (bd > reach) steer(p, dx / l, dz / l);
    else { steer(p, (dx / l) * 0.3, (dz / l) * 0.3); tapKey(p, Math.random() < special ? 'x' : 'a'); }
  }
}

// straight from the lobby into free roam (no vote, no welcome chat)
export async function toExplore() {
  const Pa = P();
  if (Pa.phase === 'lobby') Pa.startAct('explore');
  for (let i = 0; i < 80 && Pa.act.stage !== 'roam'; i++) { if (Pa.dialogue.active) Pa.dialogue.skip(); await R.run(0.2); }
  quiet();
  await R.run(0.5);
}

// keep a group in formation while it travels: `dir` × speed plus a pull back
// to each one's place around the group's centre (set by formationStart)
export function formationStart(ps) {
  const cx = ps.reduce((a, p) => a + p.pos.x, 0) / ps.length, cz = ps.reduce((a, p) => a + p.pos.z, 0) / ps.length;
  for (const p of ps) p.__off = { x: p.pos.x - cx, z: p.pos.z - cz };
}
export function formation(ps, dx, dz, { speed = () => 1, pull = 0.45, wobble = 0.08, f = 0 } = {}) {
  const cx = ps.reduce((a, p) => a + p.pos.x, 0) / ps.length, cz = ps.reduce((a, p) => a + p.pos.z, 0) / ps.length;
  ps.forEach((p, i) => {
    const o = p.__off || { x: 0, z: 0 }, m = speed(p);
    let x = dx * m + (cx + o.x - p.pos.x) * pull + Math.sin(i * 1.9 + f * 0.07) * wobble;
    let y = dz * m + (cz + o.z - p.pos.z) * pull;
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    steer(p, x, y);
  });
}
export const MOUNT_SPEED = { stag: 1.6, boar: 1.45, hen: 1.3, bear: 1.25, frog: 1.25, turtle: 0.95 };
export function mountAll(kinds) {
  const Pa = P();
  Pa.players.forEach((p, i) => { const h = Pa.mounts.give(p, kinds[i % kinds.length], { x: p.pos.x, z: p.pos.z }); Pa.mounts.ride(p, h); });
}

// a zone's "New place discovered" banner, again (it shows on the next frame)
export function rediscover() {
  const Z = P().zones, here = new Set(P().players.map((p) => Z.zoneIdAt(p.pos.x, p.pos.z)));
  Z.save.zones = Z.save.zones.filter((id) => !here.has(id));
  for (const p of P().players) Z.seenBy.set(p.slot, 'valley');
}

// the whole party strolls through one land
export const BIOMES = {
  bouncecap: { x: -148, z: -73, hour: 17.5, dir: [0.8, 0.6] },
  glacier: { x: 281, z: -26, hour: 11, dir: [0.7, 0.7] },
  dunes: { x: -153, z: 166, hour: 13, dir: [0.8, 0.6] },
  ember: { x: 420, z: 62, hour: 18.2, dir: [0.8, 0.6] },
  cloud: { x: 437, z: -73, hour: 9.5, dir: [0.8, 0.6] },
  lagoon: { x: 229, z: 201, hour: 12, dir: [0.8, 0.6] },
};
export async function biome(id, secs = 1.3, { zoom = 3, name = 'b_' + id, record = true, captions = [] } = {}) {
  const B = BIOMES[id], ps = P().players;
  P().zoom.set(zoom);
  await go(B.x, B.z, { hour: B.hour, gap: 1.35, secs: 2.5, dir: { x: B.dir[0], z: B.dir[1] } });
  formationStart(ps);
  if (!record) return;
  rediscover();
  const r = await R.clip(name, secs, (f) => { if (f % 2 === 0) formation(ps, B.dir[0], B.dir[1], { f, speed: () => 0.95 }); if (f === 12) tapKey(ps[2], 'b'); if (f === 20) tapKey(ps[5], 'b'); }, { captions });
  for (const p of ps) steer(p, 0, 0);
  return r;
}

// two groups run apart on the Windy Heights: the screen splits between them
export async function split(name = 'split', secs = BAR * 2 + 0.4) {
  const ps = P().players, A = ps.filter((p, i) => i % 2 === 0), B = ps.filter((p, i) => i % 2 === 1);
  P().zoom.set(4);
  await go(52, -98, { hour: 16.5, who: A, cols: 2, gap: 1.3, secs: 0.4, dir: { x: -1, z: 0 } });
  await go(60, -98, { hour: 16.5, who: B, cols: 2, gap: 1.3, secs: 2.5, dir: { x: 1, z: 0 } });
  formationStart(A); formationStart(B);
  const r = await R.clip(name, secs, (f) => {
    if (f < 8) return;
    if (f % 2 === 0) { formation(A, -1, 0.15, { f }); formation(B, 1, -0.1, { f }); }
    if (f === 30) tapKey(A[1], 'b');
    if (f === 44) tapKey(B[2], 'b');
  }, { captions: [{ text: 'Split up · the screen splits too', sub: 'every group gets its own view', at: 0.5, dur: secs - 0.7 }] });
  for (const p of ps) steer(p, 0, 0);
  return r;
}

// a fight: the party walks in, the AI swings, ultimates go off on cue
// (ults: [[seconds, name], …])
export async function fight(name, { x, z, hour = 15, zoom = 3, secs = BAR * 2 + 0.4, ults = [], captions = [], warm = 0, face = { x: -1, z: 0 }, special = 0.12, ring = 0, focus = null } = {}) {
  const Pa = P(), ps = Pa.players;
  Pa.zoom.set(zoom);
  await go(x, z, { hour, gap: 1.2, secs: ring ? 0.3 : 2.5, dir: face });
  if (ring) {   // around the foe: the camera centres on it
    ps.forEach((p, i) => { const a = (i / ps.length) * Math.PI * 2 + 0.3; p.actor.pos = { x: x + Math.cos(a) * ring, z: z + Math.sin(a) * ring * 0.8 }; p.actor.face(x, z); });
    Pa.cam.snap(Pa.camPlayers());
    for (let i = 0; i < 12; i++) { await sleep(60); await g().debug.step(12); }
  }
  for (const p of ps) if (p.fighter) { p.fighter.hp = p.fighter.maxHp; p.fighter.ult = 0; p.fighter.down = false; }
  if (warm) await R.run(warm, (f) => { if (f % 3 === 0) fightTick({ special }); });
  const plan = ults.map(([s, who]) => [s, () => { const p = pl(who); if (p && p.fighter) { p.fighter.ult = 100; tapKey(p, 'u', 0.1); } }]);
  // (a boss: the camera keeps it in the middle)
  const keep = Pa.act.camFocus;
  if (focus) Pa.act.camFocus = () => { const e = focus(); return e ? { x0: e.x - 0.5, x1: e.x + 0.5, z0: e.z - 0.5, z1: e.z + 0.5 } : null; };
  try {
    return await R.clip(name, secs, async (f) => { if (f % 3 === 0) fightTick({ special }); await cue(plan)(f); }, { captions });
  } finally {
    Pa.act.camFocus = keep;
    for (const p of ps) steer(p, 0, 0);
  }
}

// a camp (or a lair) back as it was, ready to be woken again
export function resetCamp(x, z) {
  const E = P().encounters;
  for (const c of E.camps) if (Math.hypot(c.x - x, c.z - z) < 12) {
    E.despawn(c);
    if (c.state === 'cleared') { E.cleared.delete(c.id); E.store(); if (c.props) E.relight(c, false); }
    c.state = 'idle'; c.told = false; c.clearedAt = -1e9;
  }
}
export function resetLair(type) {
  const Ls = P().lairs, L = Ls.list.find((l) => l.type === type);
  if (L && L.state !== 'idle') { Ls.retreat(L, true); L.state = 'idle'; Ls.store(); if (Ls.recolor) Ls.recolor(L); }
  return L;
}

export const calm = () => { for (const L of P().lairs.list) resetLair(L.type); };
export const camp = () => { calm(); resetCamp(-43, 71); return fight('camp', {
  x: -38, z: 71, hour: 15.5, zoom: 4, ults: [[1.6, 'Mia'], [3.0, 'Ben']],
  captions: [{ text: 'Fight the gloom together', at: 0.4, dur: BAR * 2 - 0.2 }],
}); };
export const boss = (type = 'golem', hour = 18.6) => { calm(); const L = resetLair(type); return fight('boss', {
  x: L.x, z: L.z + 0.4, ring: 4.5, zoom: 4, hour, warm: 0.8, ults: [[1.4, 'Zoe'], [2.6, 'Alex'], [3.4, 'Mia']], focus: () => L.boss,
  captions: [{ text: 'Giant guardians to beat', at: 0.4, dur: BAR * 2 - 0.2 }],
}); };

// the Festival Ring: ring the gong, skip Hollis's welcome, wave 1 with the crowd
export async function arena(name = 'arena', secs = BAR * 2 + 0.4, {
  zoom = 3, ults = [[2.6, 'Ben']], warm = 1.2, hideUi = false, over = [], hold = 0,
  captions = [{ text: 'The Festival Ring', sub: 'gloom waves · brawl · king of the ring', at: 0.5, dur: secs - 0.7 }],
} = {}) {
  const Pa = P();
  calm();
  Pa.zoom.set(zoom);
  for (const p of Pa.players) steer(p, 0, 0);
  if (!Pa.act.pickGate) {
    await Pa.act.toArena('waves');
    for (let i = 0; i < 100 && !(Pa.act.stage === 'fight' && Pa.act.wave >= 1); i++) { if (Pa.dialogue.active) Pa.dialogue.skip(); await R.run(0.1); }
  }
  if (warm) await R.run(warm, (f) => { if (f % 3 === 0) fightTick({ special: 0.1 }); });
  const plan = ults.map(([s, who]) => [s, () => { const p = pl(who); if (p && p.fighter) { p.fighter.ult = 100; tapKey(p, 'u', 0.1); } }]);
  R.R.hideUi = hideUi;
  try {
    // (`hold`: everyone waits on the star a moment before running at the gloom)
    return await R.clip(name, secs, async (f, tm) => { if (tm >= hold && f % 3 === 0) fightTick({ special: 0.1 }); await cue(plan)(f); }, { captions, over });
  } finally { R.R.hideUi = false; for (const p of Pa.players) steer(p, 0, 0); }
}

// ------------------------------------------------------------------ title & end cards (on the 4-px grid)
const fadeIn = (tm, at = 0.15, d = 0.5) => Math.max(0, Math.min(1, (tm - at) / d));
// (shown from the very first frame: it is the video's thumbnail)
export function titleCard(c, tm) {
  const W = c.canvas.width;
  const gr = c.createLinearGradient(0, 0, 0, 120);
  gr.addColorStop(0, 'rgba(20,14,28,0.7)'); gr.addColorStop(1, 'rgba(20,14,28,0)');
  c.fillStyle = gr; c.fillRect(0, 0, W, 120);
  R.logo(c, W / 2, 16, tm, 4);
  R.outlined(c, 'a cozy pixel-art party game', W / 2, 62, { scale: 2 });
  R.outlined(c, '1–8 players · one screen · phones as controllers', W / 2, 86, { scale: 1, color: '#f6d38f' });
  c.globalAlpha = 1;
}
export function endCard(c, tm) {
  const W = c.canvas.width, H = c.canvas.height;
  c.globalAlpha = fadeIn(tm, 0.05, 0.5);
  c.fillStyle = 'rgba(20,14,28,0.38)'; c.fillRect(0, 0, W, H);
  R.logo(c, W / 2, 44, tm, 4);
  c.globalAlpha = fadeIn(tm, 0.5, 0.4);
  R.outlined(c, 'Party Mode for 1–8 friends', W / 2, 98, { scale: 2 });
  R.outlined(c, 'your phones are the controllers · a whole world · a co-op story', W / 2, 122, { scale: 1, color: '#f6d38f' });
  c.globalAlpha = fadeIn(tm, 1.1, 0.4);
  R.outlined(c, '+ a cozy solo life-sim story', W / 2, 146, { scale: 2, color: '#fff3c4' });
  c.globalAlpha = fadeIn(tm, 1.7, 0.4);
  R.outlined(c, 'every pixel and every sound is made in code · plays in the browser', W / 2, 206, { scale: 1, color: '#d9c8e8' });
  c.globalAlpha = 1;
}

// the end card over the title screen's vista (a fresh page, before the party)
export async function ending(name = 'ending', secs = BAR * 2.5 + 0.3) {
  await R.setup();
  await R.run(0.2);
  R.R.hideUi = true;
  try { return await R.clip(name, secs, null, { over: [endCard] }); } finally { R.R.hideUi = false; }
}

// the opening: the Ring from above, no HUD, the logo (right after arena())
export const opening = () => arena('opening', BAR * 2 + 0.3, { warm: 0, hold: 1.4, hideUi: true, captions: [], over: [titleCard], ults: [[1.7, 'Mia'], [2.6, 'Ben'], [3.3, 'Zoe']] });

// out of the vote's welcome chat into free roam
export async function skipIntro() {
  const Pa = P();
  for (let i = 0; i < 100 && !(Pa.exploring() && Pa.act.stage === 'roam'); i++) { if (Pa.dialogue.active) Pa.dialogue.skip(); await R.run(0.2); }
  quiet();
}

// a caption carried across a montage of clips (fade in on the first, out on the last)
export function across(text, i, n, clipSecs, used = [0.1, 1.17]) {
  return [{ text, at: i === 0 ? used[0] + 0.05 : 0, dur: i === n - 1 ? used[1] - 0.02 : 99, fadeIn: i === 0, fadeOut: i === n - 1 }];
}

// the soundtrack of the edit list, rendered offline (screenshots/reel/mix.wav)
export async function mix(edlUrl = '/tools/trailer.edl.json') {
  const edl = await (await fetch(edlUrl + '?' + Date.now())).json();
  return R.soundtrack(R.plan(edl).shots, { length: edl.length, music: edl.music, gains: { sfx: 0.6 } });
}

// every shot, in one go (on a freshly loaded page)
export async function all(log = (m) => console.log('[trailer]', m)) {
  const out = {};
  const shot = async (k, fn) => { log(k); out[k] = await fn(); };
  await shot('ending', () => ending());
  await shot('boot', () => boot());
  await shot('lobby', () => lobby());
  await shot('vote', () => vote());
  full(3);
  await skipIntro();
  heroes();
  const B = ['bouncecap', 'glacier', 'dunes', 'ember', 'cloud', 'lagoon'];
  for (let i = 0; i < B.length; i++) await shot('b_' + B[i], () => biome(B[i], 1.3, { captions: across('A whole world to explore', i, B.length) }));
  await shot('split', () => split());
  await shot('camp', () => camp());
  const V = [['v_sail', sail], ['v_balloon', balloon], ['v_ride', ride]];
  for (let i = 0; i < V.length; i++) await shot(V[i][0], () => V[i][1](V[i][0], 1.8, { captions: across('Sail · fly · ride together', i, V.length, 1.8, [0.1, 1.7]) }));
  await shot('campfire', () => campfire());
  await shot('boss', () => boss());
  await shot('opening', () => opening());
  await shot('arena', () => arena('arena', BAR * 2 + 0.4, { warm: 0.2, ults: [[1.8, 'Alex']] }));
  await shot('hens', () => hens());
  out.errs = window.__errs;
  return out;
}

// the Starfall Festival: straight to a chapter's mini-game (Hen Round-Up)
export async function toChapter(id) {
  const Pa = P();
  for (const p of Pa.players) steer(p, 0, 0);
  Pa.startAct('story', { debugChapter: id });
  for (let i = 0; i < 300; i++) {
    const s = Pa.act;
    if (s.game && s.game.running) break;
    if (Pa.dialogue.active) Pa.dialogue.skip();
    else if (s.gatherInfo) await T.toSpot();
    else if (s.overlay && s.overlay.kind === 'rules') for (const p of Pa.players) tapKey(p, 'a');
    await R.run(0.2);
  }
  return Pa.act.game;
}

export function henTick() {
  const G = P().act.game;
  if (!G || !G.hens) return;
  const taken = new Set();
  for (const p of P().players) {
    let tx, tz;
    if (p.carry) { tx = G.coopAt.x; tz = G.coopAt.z; }
    else {
      // (each friend after a hen of their own: the chase spreads out)
      let best = null, bd = 1e9;
      for (const h of G.hens) { if (h.home || h.carrier || taken.has(h)) continue; const d = Math.hypot(h.x - p.pos.x, h.z - p.pos.z); if (d < bd) { bd = d; best = h; } }
      if (!best) { steer(p, 0, 0); continue; }
      taken.add(best);
      tx = best.x; tz = best.z;
      if (bd < 0.85) tapKey(p, 'a');
    }
    const dx = tx - p.pos.x, dz = tz - p.pos.z, l = Math.hypot(dx, dz) || 1;
    steer(p, dx / l, dz / l);
  }
}

export async function hens(name = 'hens', secs = BAR * 2 + 0.4, { zoom = 3, warm = 1.5 } = {}) {
  P().zoom.set(zoom);
  await toChapter('hens');
  if (warm) await R.run(warm, (f) => { if (f % 3 === 0) henTick(); });
  try {
    return await R.clip(name, secs, (f) => { if (f % 3 === 0) henTick(); }, {
      captions: [{ text: 'A co-op story with mini-games', at: 0.4, dur: secs - 0.6 }],
    });
  } finally { for (const p of P().players) steer(p, 0, 0); }
}

// back out into the wild (after the ring or the festival)
export async function roam() {
  const Pa = P();
  if (Pa.exploring() && Pa.act.stage === 'roam') return;
  for (const p of Pa.players) steer(p, 0, 0);
  Pa.startAct('explore');
  for (let i = 0; i < 100 && Pa.act.stage !== 'roam'; i++) { if (Pa.dialogue.active) Pa.dialogue.skip(); await R.run(0.2); }
  await R.run(0.5);
}

// a campfire at night: Alex lights it, friends sit around
export async function campfire(name = 'campfire', secs = BAR * 2 + 0.4, { x = -69, z = 41, hour = 21.4, zoom = 5 } = {}) {
  const Pa = P(), ps = Pa.players, alex = pl('Alex');
  await roam();
  calm();
  Pa.zoom.set(zoom);
  await go(x, z, { hour, secs: 2.5, dir: { x: 0, z: -1 } });
  alex.actor.pos = { x, z: z + 2.1 }; alex.actor.dir = { x: 0, z: -1 };
  const s = Pa.camp.spotFor(alex) || { x, z };
  ps.forEach((p, i) => { if (p === alex) return; const a = Math.PI / 2 + ((i) / ps.length) * Math.PI * 2; p.actor.pos = { x: s.x + Math.cos(a) * 2.2, z: s.z + Math.sin(a) * 1.7 }; p.actor.face(s.x, s.z); });
  Pa.cam.snap(Pa.camPlayers());
  await R.run(0.6);
  try {
    return await R.clip(name, secs, cue([[0.35, () => Pa.camp.build(alex)], [2.6, () => tapKey(pl('Mia'), 'a')], [3.1, () => tapKey(pl('Leo'), 'a')]]), {
      captions: [{ text: 'Cozy nights by the campfire', at: 0.6, dur: secs - 0.8 }],
    });
  } finally { for (const p of ps) steer(p, 0, 0); }
}

// ------------------------------------------------------------------ getting around
export const vehicle = (kind, x, z) => P().vehicles.list.filter((v) => v.kind === kind).sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))[0];
function aboard(v, ps) { for (const p of ps) { if (p.vehicle) P().vehicles.leave(p, true); p.actor.pos = { x: v.x, z: v.z }; P().vehicles.board(p, v); } }

// all eight on the sailboat, the skipper steering out to sea
export async function sail(name = 'v_sail', secs = 1.8, { hour = 16, zoom = 4, head = [0.9, 0.45], captions = [] } = {}) {
  const Pa = P(), ps = Pa.players;
  await roam(); calm(); Pa.zoom.set(zoom);
  const v = vehicle('sailboat', 104, 112);
  await go(v.x, v.z - 3, { hour, secs: 1 });
  aboard(v, ps);
  const skip = v.riders[0];
  await R.run(2.5, (f) => { if (f % 3 === 0) steer(skip, head[0], head[1]); });
  const r = await R.clip(name, secs, (f) => { if (f % 3 === 0) steer(skip, head[0], head[1]); if (f === 8) tapKey(v.riders[3], 'a'); }, { captions });
  steer(skip, 0, 0);
  return r;
}

// five friends in the balloon over the Cloud Isles
export async function balloon(name = 'v_balloon', secs = 1.8, { hour = 10, zoom = 4, lead = 1.6, captions = [] } = {}) {
  const Pa = P(), ps = Pa.players;
  await roam(); calm(); Pa.zoom.set(zoom);
  const v = vehicle('balloon', 389, -71);
  if (v.flying) await R.run(8);
  await go(v.x, v.z + 2, { hour, secs: 1.5 });
  aboard(v, ps.slice(0, 5));
  await go(v.x + 2, v.z + 3, { who: ps.slice(5), secs: 0.5, cols: 3 });
  tapKey(ps[0], 'a');
  // (the camera looks up at the basket, not at its shadow on the clouds)
  const keep = Pa.act.camFocus;
  Pa.act.camFocus = () => ({ x0: v.x - 0.5, x1: v.x + 0.5, z0: v.z - v.y - 0.5, z1: v.z - v.y + 0.5 });
  try { return await follow(ps.slice(0, 5), async () => { await R.run(lead); return R.clip(name, secs, null, { captions }); }); } finally { Pa.act.camFocus = keep; }
}

// the camera watches only some of the party for a moment (the others wait off screen)
export async function follow(who, fn) {
  const Pa = P(), keep = Pa.camPlayers;
  Pa.camPlayers = () => who;
  try { return await fn(); } finally { Pa.camPlayers = keep; }
}

// two in a minecart down the Red Canyon's rails
export async function cart(name = 'v_cart', secs = 1.8, { hour = 15, zoom = 4 } = {}) {
  const Pa = P(), ps = Pa.players;
  await roam(); calm(); Pa.zoom.set(zoom);
  const v = vehicle('minecart', -214, 28);
  await go(v.x, v.z + 2, { hour, secs: 1.5, who: ps.slice(0, 2) });
  await go(v.x + 3, v.z + 3, { secs: 0.5, who: ps.slice(2), cols: 3 });
  aboard(v, ps.slice(0, 2));
  tapKey(ps[0], 'a');
  return follow(ps.slice(0, 2), async () => {
    await R.run(0.8, (f) => { if (f % 10 === 0) tapKey(ps[1], 'a'); });
    return R.clip(name, secs, (f) => { if (f % 12 === 0) tapKey(ps[f % 24 ? 0 : 1], 'a'); });
  });
}

// four friends on four mounts across the Windy Heights
export async function ride(name = 'v_ride', secs = 1.8, { hour = 16.8, zoom = 4, kinds = ['stag', 'bear', 'hen', 'frog'], captions = [] } = {}) {
  const Pa = P(), ps = Pa.players, riders = ps.slice(0, 4);
  await roam(); calm(); Pa.zoom.set(zoom);
  await go(46, -99, { hour, secs: 0.5, who: riders, cols: 2, gap: 2.6, dir: { x: 1, z: 0 } });
  await go(58, -108, { secs: 1.5, who: ps.slice(4), cols: 4 });
  riders.forEach((p, i) => { const h = Pa.mounts.give(p, kinds[i], { x: p.pos.x, z: p.pos.z }); Pa.mounts.ride(p, h); });
  formationStart(riders);
  const sp = (p) => (1.25 / MOUNT_SPEED[p.mount ? p.mount.kind : 'bear']) * 0.95;
  const each = (f) => { if (f % 2 === 0) formation(riders, 1, 0.05, { speed: sp, f, wobble: 0.04 }); };
  return follow(riders, async () => {
    await R.run(0.8, each);
    try { return await R.clip(name, secs, each, { captions }); } finally { for (const p of riders) { steer(p, 0, 0); if (p.mount) Pa.mounts.dismount(p, true); Pa.mounts.stable(p); } }
  });
}
