// Dev helper: fake phones for testing Party Mode from the browser console.
//   const T = await import('/tools/partybots.js');
//   await T.boot(6);          // title → party lobby with 6 bot phones joined
//   await T.chapter('koi');   // jump straight into a chapter
//   T.mode('waves');          // or 'explore' (the Adventure) | 'brawl' | 'story'
//   await T.autoplay('saga'); // the bots play the Adventure's chapters (World v7)
//   await T.vote(/waves/i);   // every bot picks the matching vote option
//   await T.fight(300);       // bots chase the nearest gloom and swing
// Bots talk to the real /ws relay, exactly like the phone controller does.

import { randomLook } from '../src/data/looks.js';
import { THREE } from '../src/render/r3d.js';

const g = () => window.game;
const D = () => window.game.debug;
export const bots = [];

export async function settle(n = 5) { await new Promise((r) => setTimeout(r, 60)); await D().step(n); }

export async function addBot(name, look, cls) {
  const id = 'bot' + bots.length;
  const ws = new WebSocket(`ws://${location.host}/ws?role=pad&code=${g().party.net.code}&id=${id}`);
  const bot = { id, ws, msgs: [], send: (o) => ws.readyState === 1 && ws.send(JSON.stringify(o)) };
  ws.onmessage = (e) => { bot.msgs.push(JSON.parse(e.data)); if (bot.msgs.length > 300) bot.msgs.splice(0, 100); };
  await new Promise((r) => { ws.onopen = r; });
  bot.send({ t: 'hi', name, look: look || randomLook(), cls: cls || ['knight', 'mage', 'ranger', 'bard', 'lamplighter', 'gardener', 'cook', 'tinkerer'][bots.length % 8] });
  bots.push(bot);
  return bot;
}

export function stick(b, x, y) { b.send({ t: 'in', x: +x.toFixed(2), y: +y.toFixed(2) }); }
export function tap(b, k = 'a') { b.send({ t: 'b', k, v: 1 }); setTimeout(() => b.send({ t: 'b', k, v: 0 }), 25); }
export async function press(b, k = 'a') { b.send({ t: 'b', k, v: 1 }); await settle(2); b.send({ t: 'b', k, v: 0 }); await settle(2); }

export async function boot(n = 6, names = ['Alex', 'Mia', 'Lucas', 'Emma', 'Noah', 'Zoé', 'Léo', 'Inès']) {
  window.__errs = [];
  window.addEventListener('error', (e) => window.__errs.push(String(e.message) + ' @' + e.filename + ':' + e.lineno));
  window.addEventListener('unhandledrejection', (e) => window.__errs.push('rej ' + String(e.reason && e.reason.stack || e.reason)));
  D().pause(true);
  g().toParty();
  for (let i = 0; i < 30 && !g().party.qr; i++) { await new Promise((r) => setTimeout(r, 150)); await D().step(2); }
  for (let i = 0; i < n; i++) await addBot(names[i % names.length]);
  await settle(20);
  return g().party;
}

export async function skipTalk(max = 40) {
  const P = g().party;
  for (let i = 0; i < max && P.dialogue.active; i++) { await D().step(60); await press(bots[0]); }
}

export async function readyAll() { await D().step(50); for (const b of bots) await press(b); await D().step(10); }

export const act = () => g().party.act;
export const me = (b) => g().party.players.find((p) => p.id === b.id);

// start an activity straight away (skips the lobby vote)
export function mode(kind) { const P = g().party; if (P.phase === 'lobby') P.startAct(kind); }

// the host phone (whoever wears the crown) uses its menu: host('pause'),
// host('zoom', -1), host('act:waves'), host('skipall')…
export async function host(id, dir = 0) {
  const P = g().party, b = bots.find((x) => x.id === P.host.id);
  if (b) b.send({ t: 'hact', id, dir }); else P.host.act(id, dir);
  await settle(4);
}

// every bot (and keyboard player) votes for the option matching `m` (index, option id or regexp
// on the label — ids work in every language)
export async function vote(m = 0) {
  const P = g().party, v = P.vote;
  if (!v) return false;
  const i = typeof m === 'number' ? m : typeof m === 'string' ? Math.max(0, v.options.findIndex((o) => o.id === m)) : Math.max(0, v.options.findIndex((o) => m.test(o.label)));
  for (const b of bots) b.send({ t: 'pick', id: v.id, i });
  for (const p of P.players) if (p.kind !== 'phone') P.onVotePick(p, { id: v.id, i });
  await settle(10);
  return v.options[i].label;
}

// (Release v9) what the gloom has marked on the ground — a zone about to land, a telegraphed line,
// cone, ring or circle: is (x, z) inside one, and how long before it lands?
const _ray = new THREE.Raycaster(), _o = new THREE.Vector3(), _d = new THREE.Vector3(0, -1, 0);
export function danger(C, x, z) {
  let left = Infinity;
  for (const q of C.zones) if (!q.done && !q.p && Math.hypot(x - q.x, z - q.z) < q.r + 0.45) left = Math.min(left, q.delay - q.t);
  const marks = C.fxMeshes.filter((q) => (q.line || q.dark) && q.t > 0 && q.m.parent);
  if (marks.length) {
    _ray.set(_o.set(x, 6, z), _d);
    for (const q of marks) if (_ray.intersectObject(q.m, false).length) left = Math.min(left, q.t);
  }
  return left < Infinity ? left : null;
}
// the nearest spot out of it that can be walked to (16 directions, a little further each ring)
function escape(C, x, z) {
  const P = g().party, col = (P.big && P.big.col) || g().world.overCol;
  const open = (ex, ez) => !col || !col.blocked(ex, ez, 0.3);
  for (const r of [0.9, 1.7, 2.6, 3.6, 4.8]) {
    let best = null, bd = 1e9;
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2, ex = x + Math.cos(a) * r, ez = z + Math.sin(a) * r;
      if (danger(C, ex, ez) !== null || !open(ex, ez) || !open((x + ex) / 2, (z + ez) / 2)) continue;
      if (C.bounds && (Math.abs(ex - C.bounds.x) > C.bounds.rx || Math.abs(ez - C.bounds.z) > C.bounds.rz)) continue;
      const d = Math.hypot(ex - x, ez - z) + Math.random() * 0.2;
      if (d < bd) { bd = d; best = { x: Math.cos(a), z: Math.sin(a) }; }
    }
    if (best) return best;
  }
  return null;
}
export const dodgeStats = { seen: 0, ignored: 0, stepped: 0, rolled: 0 };

// bots chase the nearest gloom (or each other in a brawl) and swing; X now and then
// (Release v9) and they dodge what's telegraphed, like a fair player: they notice it after a
// short reaction (0.2–0.4 s), miss one in six, step out, and roll when it's about to land
export async function fight(frames = 240, { special = 0.12, dodge = true } = {}) {
  const P = g().party;
  for (let f = 0; f < frames; f += 6) {
    const C = P.combat;
    if (C) for (const b of bots) {
      const p = me(b);
      if (!p || !p.fighter || p.fighter.down) continue;
      const left = dodge && !C.pvp ? danger(C, p.pos.x, p.pos.z) : null;
      if (left === null) b.alarm = null;
      else {
        if (!b.alarm) { b.alarm = { t: 0, react: 0.2 + Math.random() * 0.2, miss: Math.random() < 1 / 6 }; dodgeStats.seen++; if (b.alarm.miss) dodgeStats.ignored++; }
        b.alarm.t += 0.1;
        const out = !b.alarm.miss && b.alarm.t >= b.alarm.react ? escape(C, p.pos.x, p.pos.z) : null;
        if (out) {
          if (b.holdA > 0) { b.holdA = 0; b.send({ t: 'b', k: 'a', v: 0 }); }
          stick(b, out.x, out.z);
          if (!b.alarm.stepped) { b.alarm.stepped = true; dodgeStats.stepped++; }
          if (left < 0.5 && p.fighter.rollCd <= 0 && !p.fighter.roll && !b.alarm.rolled) { b.alarm.rolled = true; dodgeStats.rolled++; tap(b, 'y'); }
          continue;
        }
      }
      let best = null, bd = 1e9;
      const tg = C.pvp ? P.players.filter((q) => q !== p && q.fighter && !q.fighter.down).map((q) => ({ x: q.pos.x, z: q.pos.z }))
        : C.enemies.filter((e) => e.alive && e.hurtable).map((e) => ({ x: e.x, z: e.z, r: e.r || 0.3 }));
      // (distance to the edge: big foes are reached sooner)
      for (const e of tg) { const d = Math.hypot(e.x - p.pos.x, e.z - p.pos.z) - (e.r || 0.3) + 0.3; if (d < bd) { bd = d; best = e; } }
      if (!best) { stick(b, 0, 0); continue; }
      const dx = best.x - p.pos.x, dz = best.z - p.pos.z, l = Math.hypot(dx, dz) || 1;
      const reach = p.fighter.cls.light[0].kind === 'melee' ? Math.min(1.8, (p.fighter.cls.light[0].range || 1.2)) : 5;
      // (a charged heavy now and then: A held ~0.6 s; the ultimate as soon as it's full)
      if (b.holdA > 0) { if (--b.holdA === 0) b.send({ t: 'b', k: 'a', v: 0 }); stick(b, (dx / l) * 0.2, (dz / l) * 0.2); continue; }
      if (bd > reach) stick(b, dx / l, dz / l);
      else if (p.fighter.ultId && p.fighter.ult >= 100) { stick(b, 0, 0); tap(b, 'u'); }
      else if (Math.random() < 0.08) { stick(b, 0, 0); b.send({ t: 'b', k: 'a', v: 1 }); b.holdA = 6; }
      else { stick(b, (dx / l) * 0.3, (dz / l) * 0.3); tap(b, Math.random() < special ? 'x' : 'a'); }
    }
    // let the relay deliver the phones' messages before the next frames
    await new Promise((r) => setTimeout(r, 18));
    await D().step(6);
  }
  for (const b of bots) stick(b, 0, 0);
}

// (cheat) beat every gloom creature on screen — and the rest of an arena wave
export async function clearWave() {
  const P = g().party, C = P.combat;
  if (P.act && P.act.queue) P.act.queue.length = 0;
  if (C) for (const e of C.enemies) if (e.alive) C.hurtEnemy(e, 9999, { p: P.players[0], kind: 'aoe' });
  await D().step(90);
}

// walk every bot to a spot (teleport, then settle)
export async function warp(x, z) {
  const P = g().party;
  P.players.forEach((p, i) => { p.actor.pos = { x: x + (i % 3) - 1, z: z + Math.floor(i / 3) * 0.8 }; });
  P.cam.snap(P.camPlayers());
  await D().step(20);
}

export async function toSpot() {
  const P = g().party, T = P.act.target;
  if (!T) return;
  P.players.forEach((p, i) => { p.actor.pos = { x: T.x + (i % 3) - 1, z: T.z + Math.floor(i / 3) * 0.8 }; });
  await D().step(40);
}

// start a chapter directly and get to the running game
export async function chapter(id) {
  const P = g().party;
  if (P.phase === 'lobby') P.startAdventure(id); else P.act.debugChapter(id);
  await D().step(20);
  await toSpot();
  await skipTalk(10);
  await D().step(60);
  await readyAll();
  await D().step(240);
  return P.act.game;
}

// finish the running game and roll through results & the charm hand-over
export async function finish() {
  const P = g().party;
  if (P.act.game) P.act.game.left = 0.05;
  await D().step(260);
  for (let i = 0; i < 6 && P.act.overlay; i++) { await D().step(60); await press(bots[0]); }
  await D().step(90);
  await skipTalk(20);
  await D().step(60);
}

// Play the whole adventure on fast-forward: vote, travel, rules, a few
// seconds of each game, results, charms, finale, awards, then `after`
// ('lobby' | 'again'). Returns a log of what happened.
// autoplay('lobby' | 'again'): the Starfall Festival's games, then back to the lobby (or again)
// autoplay('saga', log, { until }): the Adventure — the saga played by the bots (tools/sagatest.js)
export async function autoplay(after = 'lobby', log = [], opts = {}) {
  const P = g().party, S = () => P.act;
  const step = (n) => D().step(n);
  const saga = after === 'saga';
  if (P.phase === 'lobby') {
    for (const b of bots) b.send({ t: 'ready', v: true });
    await settle(10);
    // (the crowned phone starts the party)
    bots[0].send({ t: 'start' });
    await settle(10); await step(300);
    if (P.vote) { log.push('mode:' + await vote(saga ? 'explore' : 'story')); await step(60); }
  }
  if (saga) {
    const V = await import('./sagatest.js');
    return V.autoplay({ log, until: opts.until || ((Sg) => Sg.done('c1_relight')), ...opts });
  }
  for (let guard = 0; guard < 400; guard++) {
    const s = S();
    if (!s) { await step(30); continue; }
    if (P.vote) {
      const v = P.vote;
      const i = v.options.findIndex((o) => o.id === (after === 'again' ? 'again' : 'lobby'));
      const pickI = i >= 0 ? i : 0;
      log.push('vote:' + await vote(pickI));
      if (v.options[pickI].id === 'lobby' || v.options[pickI].id === 'again') { await step(120); break; }
      continue;
    }
    if (P.dialogue.active) { await step(60); await press(bots[0]); continue; }
    if (s.gatherInfo) { await toSpot(); log.push('arrived'); continue; }
    if (s.overlay && s.overlay.kind === 'rules') { await step(40); for (const b of bots) await press(b); continue; }
    if (s.game && s.game.running) { await step(120); log.push('game:' + s.game.def.id); s.game.left = 0.05; await step(10); continue; }
    if (s.overlay && (s.overlay.kind === 'results' || s.overlay.kind === 'awards')) { log.push(s.overlay.kind); await step(200); await press(bots[0]); continue; }
    await step(30);
  }
  return log;
}
