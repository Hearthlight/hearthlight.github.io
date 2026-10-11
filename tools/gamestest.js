// The round mini-games (src/saga/games12.js) played « by hand » through the API, in the solo
// game or in Party with n bot phones — for the browser pane (poll `window.__gt`):
//   const GT = await import('/tools/gamestest.js');
//   GT.start('party', 4, 'c2_range', { shots: 'range4', lang: 'fr' })     // or 'solo', 1
//   window.__gt → 'run' · 'done {…}' (score, stars, the ranks, seconds played) · 'err …'
// `phone: true` adds a real phone page to the party (an iframe) and saves its screen with the round’s.
// The heroes walk and press as players would: they line up with a board and throw, walk round
// the flock, tap on the rope (`rate` presses a second, `sloppy`: the share of taps made while
// the beast digs in), fetch what the skewer asks for. `shots`: a name — its card, its round
// (`at` seconds in) and its result are saved as <name>_card / _run / _result.
// `GT.rounds(mode, n, qid, k)` plays k rounds and lists their scores (to set the ranks).

const g = () => window.game, D = () => window.game.debug;
// (real time without a timer: a tab out of sight for five minutes has its timers held back to one
// a minute — a message to oneself is not)
const sleep = (ms) => new Promise((r) => { const t0 = performance.now(), c = new MessageChannel(); c.port1.onmessage = () => (performance.now() - t0 >= ms ? r() : c.port2.postMessage(0)); c.port2.postMessage(0); });

let V = null, booted = null;
async function boot(mode, n, lang) {
  V = window.V = V || await import('/tools/sagatest.js?' + Date.now());
  if (booted === mode + n) return V.saga();
  if (mode === 'solo') { await V.solo('knight'); (await import('/src/i18n.js')).setAudience('one'); }
  else {
    await V.ready(); V.watchErrors();
    D().pause(true);                 // (frames by hand only: a pane in sight would run its own between ours)
    const T = window.T = await import('/tools/partybots.js?' + Date.now());
    await T.boot(n); await T.autoplay('saga', [], { until: () => true });
  }
  if (lang) { const { setLang } = await import('/src/i18n.js'); g().settings.lang = lang; await setLang(lang); }
  await V.toChapter(7);
  // (whatever scene the story was in the middle of: let it end)
  const S = V.saga(), quiet = () => !V.stage().active && !S.P.dialogue.active && !S.busyTalk && !S.running && !S.P.busy;
  for (let i = 0; i < 6 && !quiet(); i++) await V.play(1500, { until: quiet });
  booted = mode + n;
  return S;
}

const heroes = (S) => S.P.players.filter((p) => p.connected || S.P.solo);
// a hero walks towards a point (running speed), as a stick would take them
function walk(p, x, z, dt, sp = 5.2) {
  const a = p.actor, dx = x - a.pos.x, dz = z - a.pos.z, d = Math.hypot(dx, dz);
  if (d < 0.05) return true;
  const k = Math.min(1, (sp * dt) / d);
  a.pos.x += dx * k; a.pos.z += dz * k;
  if (d > 0.2) { a.dir = { x: dx / d, z: dz / d }; a.model.targetFacing = Math.atan2(dx, dz); }
  return d < 0.25;
}
const press = (S, p) => { const th = S.nearThing(p); if (th && th.use) { th.use(p); return th.label; } return null; };

// ------------------------------------------------------------------ how each kind is played
const PLAY = {
  tug(S, R, hs, f, o) {
    const every = Math.max(2, Math.round(30 / (o.rate || 5)) * 2);
    hs.forEach((p, i) => { if ((f + i * 2) % every) return; if (R.mode === 'dig' && Math.random() > (o.sloppy || 0)) return; press(S, p); });
  },
  toss(S, R, hs, f, o, dt) {
    const st = R.st, up = R.slots.filter((s) => (s.state === 'up' || s.state === 'rise') && (s.kind !== 'friend' || Math.random() < (o.sloppy || 0) * 0.02));
    hs.forEach((p, i) => {
      // (each one takes the board nearest to them that nobody nearer has)
      const mine = up.filter((s) => !hs.some((q, j) => j < i && q.__tg === s)).sort((a, b) => Math.abs(a.x - p.pos.x) - Math.abs(b.x - p.pos.x) - (a.kind === 'gold' ? 1.5 : 0) + (b.kind === 'gold' ? 1.5 : 0))[0];
      p.__tg = mine || null;
      const x = mine ? mine.x : st.at[0] + (i - (hs.length - 1) / 2) * 1.1;
      const there = walk(p, x, st.at[1] + 1.1 + (i % 2) * 0.7, dt, o.speed || 4.4);
      if (mine && Math.abs(mine.x - p.pos.x) < 0.3 && there !== false && f % (o.cadence || 6) === 0) press(S, p);
    });
  },
  herd(S, R, hs, f, o, dt) {
    const st = R.st, [px, pz] = st.pen, gate = st.gate ?? Math.PI, PR = st.penR || 2.4, gx = px + Math.cos(gate) * (PR + 1.2), gz = pz + Math.sin(gate) * (PR + 1.2);
    const out = R.herd.filter((a) => !a.home).sort((a, b) => Math.hypot(b.x - gx, b.z - gz) - Math.hypot(a.x - gx, a.z - gz));
    hs.forEach((p, i) => {
      const a = out[i % Math.max(1, out.length)];
      if (!a) return;
      // behind it, on the line from the gate through it
      const dx = a.x - gx, dz = a.z - gz, d = Math.hypot(dx, dz) || 1;
      walk(p, a.x + (dx / d) * 2.1, a.z + (dz / d) * 2.1, dt, o.speed || 4.6);
      if (o.whistle && f % 160 === i * 20) press(S, p);
    });
  },
  cook(S, R, hs, f, o, dt) {
    const st = R.st;
    hs.forEach((p, i) => {
      const h = R.held.get(p);
      // (the first hands fetch what comes next on the skewer, the others what follows)
      const idx = Math.min(R.len - 1, R.fill + Math.min(i, R.len - 1 - R.fill)), want = R.doneT > 0 ? R.next[Math.min(i, R.len - 1)] : R.order[idx];
      // (near enough is enough: with eight around a stall nobody stands on the very spot)
      const d = (x, z) => Math.hypot(p.pos.x - x, p.pos.z - z);
      const an = 0.4 + (i / Math.max(1, hs.length)) * Math.PI * 2, sx = st.at[0] + Math.cos(an) * 1.5, sz = st.at[1] + Math.sin(an) * 1.5;      // (each one their own side of the stall)
      if (h && R.doneT <= 0 && h.k === R.order[R.fill]) { walk(p, sx, sz, dt, o.speed || 4.6); if (d(st.at[0], st.at[1]) < 1.9 && f % 8 === 0) press(S, p); return; }
      if (h && R.order.slice(R.fill).includes(h.k)) { walk(p, st.at[0] + Math.cos(an) * 2.3, st.at[1] + Math.sin(an) * 2.3, dt, o.speed || 4.6); return; }
      const c = R.crates.find((q) => q.k === want);
      if (c) { walk(p, c.x + (c.x < st.at[0] ? 0.9 : c.x > st.at[0] ? -0.9 : 0), c.z + (Math.abs(c.x - st.at[0]) < 1 ? -0.9 : 0.3), dt, o.speed || 4.6); if (d(c.x, c.z) < 1.35 && f % 8 === 0) press(S, p); }
    });
  },
};
const WHERE = {
  tug: (st) => [st.at[0] - (st.side || 1) * 2.6, st.at[1] + 0.4],
  toss: (st) => [st.at[0], st.at[1] + 1.4],
  herd: (st) => [st.at[0] - 3, st.at[1] + 4],
  cook: (st) => [st.at[0], st.at[1] + 2.4],
};

// a real phone page (pad.html) in an iframe of the game’s tab: one more player of the party —
// `padShot(name)` draws it and saves its screen (the labels its buttons wear)
export async function phone() {
  let f = document.getElementById('gt-pad');
  if (!f) {
    f = document.createElement('iframe'); f.id = 'gt-pad';
    f.style.cssText = 'position:fixed;left:0;top:0;width:780px;height:360px;opacity:0.01;pointer-events:none;border:0';
    f.src = '/pad.html#' + g().party.net.code;
    document.body.appendChild(f);
  }
  const P = g().party, mine = () => P.players.find((p) => p.kind === 'phone' && p.connected && !/^bot/.test(p.id));
  for (let i = 0; i < 60 && !(f.contentWindow && f.contentWindow.pad); i++) await sleep(250);
  const pad = f.contentWindow.pad;
  for (let i = 0; i < 20 && !mine(); i++) { if (i === 4) pad.join(); await sleep(250); await D().step(5, 1 / 60); }
  pad.S.view = 'pad';
  return pad;
}
export async function padShot(name) {
  const f = document.getElementById('gt-pad');
  if (!f) return;
  for (let i = 0; i < 4; i++) { await sleep(120); await D().step(2, 1 / 60); }      // (the relay brings its labels)
  f.contentWindow.pad.S.view = 'pad';
  f.contentWindow.pad.draw();
  const c = f.contentDocument.querySelector('canvas'), blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  await fetch('/__shot?name=' + name, { method: 'POST', body: blob });
}

async function frames(n, each = null) {
  for (let f = 0; f < n; f++) { await D().step(1, 1 / 60); if (each && each(f) === false) return f; if (f % 30 === 0) await sleep(6); }
  return n;
}
// (between two pictures nothing needs drawing: the game’s own draw is set aside meanwhile —
// a round is played several times faster)
function quick(on) { const G = g(); if (!G.__draw) G.__draw = G.draw; G.draw = on ? () => {} : G.__draw; }
function tidy(S) { for (const o of [S.P, g().world && g().world.hud]) if (o && o.toasts) o.toasts.length = 0; if (S.P.lane) S.P.lane.clear(); }

// one round of quest `qid`'s game, from its card to its result
export async function play(mode, n, qid, o = {}) {
  const S = await boot(mode, n, o.lang), P = S.P;
  if (o.phone && !P.solo) await phone();
  const hs = heroes(S);
  for (const p of hs) if (p.fighter) p.fighter.inv = 999;
  if (P.state) P.state.hour = o.hour ?? 11;
  if (!S.st.q[qid]) S.start(qid, { silent: true });
  await frames(10);
  const R = S.games.runs.get(qid), st = R.st, kind = st.do, [wx, wz] = WHERE[kind](st);
  // (out of it first: a round lost a moment ago only sets itself up again once everybody has left)
  hs.forEach((p) => { p.actor.pos.x = wx + 30; p.actor.pos.z = wz + 20; });
  await frames(6);
  hs.forEach((p, i) => { p.actor.pos.x = wx + (i % 4) * 0.8 - 1.2; p.actor.pos.z = wz + Math.floor(i / 4) * 0.8; });
  if (P.solo) D().tp(wx, wz); else P.cam.snap(P.camPlayers());
  for (let i = 0; i < 8; i++) { await frames(8); await sleep(100); }      // (the ground’s paint)
  tidy(S);
  const shot = async (name) => { if (!o.shots) return; quick(false); tidy(S); await D().step(2, 1 / 60); await sleep(80); await D().step(1, 1 / 60); await D().shot('g12_' + o.shots + '_' + name, o.scale || 2); quick(true); };
  quick(true);
  await frames(400, () => R.state !== 'card' || R.cardT > 3.4);
  await shot('card');
  await frames(600, () => R.state !== 'run');
  const at = Math.round((o.at || 14) * 30) * 2;
  // (two frames a turn: the hands play thirty times a second)
  let f = 0;
  while (R.state === 'run' && f < 6000) {
    await D().step(2, 1 / 60); f += 2;
    PLAY[kind](S, R, hs, f, o, 2 / 60);
    if (f % 60 === 0) await sleep(6);
    if (f === at) { await shot('run'); if (o.phone && o.shots) { quick(false); await padShot('g12_' + o.shots + '_pad'); quick(true); } }
    if (o.at2 && f === Math.round(o.at2 * 30) * 2) await shot('run2');
  }
  await frames(150);
  await shot('result');
  const res = { qid, mode, n: hs.length, score: R.final, stars: R.stars, ranks: R.rk, secs: +(f / 60).toFixed(1), lost: !!R.lost, by: [...R.by.values()] };
  await frames(60);
  if (R.state === 'result') press(S, hs[0]);
  await V.play(1500, { until: () => !S.st.q[qid] && !S.busyTalk && !S.running });
  res.plays = S.plays(qid); res.errs = V.errs();
  quick(false);
  return res;
}

export async function rounds(mode, n, qid, k = 3, o = {}) {
  const out = [];
  let ranks = null;
  for (let i = 0; i < k; i++) { const r = await play(mode, n, qid, { ...o, shots: i ? null : o.shots }); ranks = r.ranks; out.push(r.lost ? 'lost' : r.score + (r.stars ? '★'.repeat(r.stars) : '')); window.__gt = 'run ' + JSON.stringify(out); }
  return { qid, n, ranks, out };
}

// (`tag`: a file screenshots/g12_done_<tag>.png is written when it is over — something to wait for)
async function flag(tag) {
  const c = document.createElement('canvas'); c.width = c.height = 1;
  await fetch('/__shot?name=g12_done_' + tag, { method: 'POST', body: await new Promise((r) => c.toBlob(r, 'image/png')) });
}
export function start(mode, n, qid, o = {}) {
  window.__gt = 'run';
  quick(false);
  (o.rounds ? rounds(mode, n, qid, o.rounds, o) : play(mode, n, qid, o)).then((r) => { window.__gt = 'done ' + JSON.stringify(r); }).catch((e) => { window.__gt = 'err ' + e + ' ' + String((e && e.stack) || '').slice(0, 400); }).then(() => o.tag && flag(o.tag));
  return 'started';
}
