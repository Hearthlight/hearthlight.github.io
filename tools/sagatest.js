// World v7 test helpers, for the browser pane (import in the page):
//   const V = await import(’/tools/sagatest.js’);
//   await V.solo();                     // a fresh solo game, on the plaza, knight
//   V.saga().start(’c1_intro’);         // start a quest
//   await V.play(600, { shots: { 120: ’name’ } });   // step frames, reading every line
// Frames are stepped by hand (the pane may be hidden: no requestAnimationFrame),
// with a little real time now and then so the ground’s paint workers answer.

const g = () => window.game;
const D = () => window.game.debug;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function watchErrors() {
  if (window.__v7errs) return window.__errs;
  window.__v7errs = true;
  window.__errs = window.__errs || [];
  window.addEventListener('error', (e) => window.__errs.push(String(e.message)));
  window.addEventListener('unhandledrejection', (e) => window.__errs.push('rej: ' + String((e.reason && e.reason.message) || e.reason)));
  const ce = console.error.bind(console);
  console.error = (...a) => { window.__errs.push('console: ' + a.map(String).join(' ').slice(0, 200)); ce(...a); };
  return window.__errs;
}

export async function ready() {
  for (let i = 0; i < 80 && !(window.game && g().world && g().world.overCol); i++) await sleep(250);
}

// a fresh solo game on the plaza (the story’s opening skipped)
export async function solo(cls = 'knight', name = 'Alex') {
  await ready();
  watchErrors();
  D().pause(true);
  await D().newGame(name);
  await D().skip(200);
  g().state.flags.wildIntro = true;
  g().world.wild.chooseClass(cls);
  D().tp(91.5, 75);
  await D().step(10, 1 / 60);
  return g().world.wild;
}

export const saga = () => (g().mode === 'party' ? g().party && g().party.saga : g().world.wild && g().world.wild.saga);
export const stage = () => (g().mode === 'party' ? g().party.stage : g().world.wild.stage);
const dlg = () => (g().mode === 'party' ? g().party.dialogue : g().dialogue);

// (for pictures, `marks.clean`: the line typed out to its end, yesterday's notices gone)
async function clean() {
  for (let k = 0; k < 240 && dlg().cur && dlg().cur.shown < dlg().cur.total; k++) await D().step(2, 1 / 60);
  for (const o of [g().party, g().world && g().world.hud]) if (o && o.toasts) o.toasts.length = 0;
  await D().step(1, 1 / 60);
}

// step n frames; lines are read (E / a bot’s A) once fully shown; shots at given frames
export async function play(n, { shots = {}, press = true, log = [], until = null, real = 0, lineShots = null, marks = null } = {}) {
  for (let f = 0; f < n; f += 10) {
    await D().step(10, 1 / 60);
    if (window.__mark) { const m = window.__mark; window.__mark = null; if (marks && marks[m]) { await sleep(120); await D().step(1, 1 / 60); if (marks.clean) await clean(); await D().shot(marks[m], 2); } }
    // (let timers, sockets and the paint workers have their turn now and then)
    if (f % 60 === 0) await sleep(real || 1);
    if (window.__stop) throw new Error('stopped');
    for (const [k, name] of Object.entries(shots)) if (f <= +k && +k < f + 10) { await sleep(60); await D().shot(name, 2); }
    // (a vote on the phones: every bot picks the first option, like a solo menu's first line)
    if (press && g().mode === 'party' && g().party.vote) { const P = g().party, v = P.vote; for (const p of P.players) if (p.connected && !v.picks.has(p.slot)) P.onVotePick(p, { id: v.id, i: 0 }); }
    // (a letter, full screen: read, then put away)
    const L = dlg().letter;
    if (press && L && L.t > 5.5) {
      if (marks && marks.letter && !marks['done:letter']) { marks['done:letter'] = 1; await sleep(80); await D().shot(marks.letter, 2); }
      if (g().mode === 'party') g().party.dialogue.skip(); else D().key('KeyE', 2);
    }
    const c = dlg().cur;
    if (press && c && c.shown >= c.total && !c.choices) {
      const line = c.lines.join(' ').replace(/\{[^}]*\}/g, '');
      log.push(line.slice(0, 60));
      // (a shot of the moment a line is on screen)
      if (lineShots) for (const [k, name] of Object.entries(lineShots)) if (line.includes(k) && !lineShots['done:' + k]) { lineShots['done:' + k] = 1; await sleep(80); await D().shot(name, 2); }
      if (g().mode === 'party') { const P = g().party; P.dialogue.skip(); }
      else D().key('KeyE', 2);
    } else if (press && c && c.choices && c.shown >= c.total) {
      if (g().mode === 'party') g().party.dialogue.pick(0); else D().key('KeyE', 2);
    }
    if (until && until()) break;
  }
  return log;
}

export function errs() { return (window.__errs || []).slice(-20); }

// jump the saga to chapter n: every main quest before it done (with its flags),
// the lands those chapters opened, then chapter n begins
export async function toChapter(n) {
  const S = saga(), { CHAPTERS, QUESTS } = await import('/src/saga/chapters/index.js');
  const FLAGS = { 1: ['snuffed', 'lantern', 'ember1', 'ember2', 'ember3', 'lanternLit', 'lanternFull', 'grottoDone'], 2: ['post', 'tree0', 'tree1', 'tree2', 'mill0', 'mill1', 'mill2', 'millsTurn', 'rootwayDone', 'hearthDeepwood'], 3: ['mineShut', 'quarryOpen', 'hearthstone', 'steppeLit', 'chime0', 'chime1', 'chime2'], 4: ['crumbleFreed', 'crown', 'marshWarm', 'cbell0', 'cbell1', 'cbell2'], 5: ['marshSnuffed', 'mirageBought', 'mirageReported', 'southLit'], 6: ['towed', 'jar', 'marshBack'], 7: ['dawnLit', 'teacupLine'], 8: ['heartLit'], 9: ['ladyPeace'], 10: ['finaleWon', 'dawn10', 'theEnd'] };
  for (const C of CHAPTERS) {
    if (C.id >= n) continue;
    for (const f of FLAGS[C.id] || []) S.flag(f);
    for (const [id, Q] of Object.entries(QUESTS)) if (Q.ch === C.id && Q.kind !== 'side') S.st.q[id] = { s: Q.steps.length, done: true, day: 1 };
    for (const z of [...(C.zones || []), ...(C.opens || [])]) if (!S.st.open.includes(z)) S.st.open.push(z);
    const lit = { 1: 'valley', 2: 'deepwood', 3: 'steppe', 4: 'marsh', 5: 'sunken', 6: 'volcano', 7: 'harbor', 8: 'elder', 9: 'moor', 10: 'scar' }[C.id];
    if (C.id === 7) S.st.f.teacupAt = 'east';
    if (lit && !S.st.lit.includes(lit)) S.st.lit.push(lit);
  }
  // (and chapter n itself and what follows it start afresh, even on a save that got further)
  for (const [id, Q] of Object.entries(QUESTS)) if (Q.ch >= n) {
    delete S.st.q[id];
    for (const k of Object.keys(S.st.got)) if (k.startsWith(id + ':')) delete S.st.got[k];
    for (const st of Q.steps) if (st.camp) delete S.st.f['camp:' + st.camp.id];
  }
  S.pickups = S.pickups.filter((pk) => !(QUESTS[pk.qid] && QUESTS[pk.qid].ch >= n));
  for (const [c, fl] of Object.entries(FLAGS)) if (+c >= n) for (const f of fl) delete S.st.f[f];
  for (const [c, id] of Object.entries({ 1: 'grotto', 2: 'rootway', 3: 'oldmine', 4: 'frostbell', 5: 'sunkenbell', 6: 'forgeheart', 7: 'lanternpagoda', 8: 'heartwood', 9: 'hollowmoor', 10: 'gloomstage' })) if (+c >= n && S.st.dun) delete S.st.dun[id];
  if (n <= 7) { for (const k of Object.keys(S.st.f)) if (/^lpOut/.test(k)) delete S.st.f[k]; if (n < 7) delete S.st.f.teacupAt; }
  // (the marsh: lit after chapter 4, snuffed again in chapter 5, back after chapter 6)
  S.st.lit = S.st.lit.filter((l) => l !== 'marsh');
  if (n === 5 || n >= 7) S.st.lit.push('marsh');
  if (S.P.murk) S.P.murk.refresh();
  await S.beginChapter(n);
  await D().step(10, 1 / 60);
  return S.activeIds();
}

// ------------------------------------------------------------------ the saga played by itself
// Walks every step of the tracked quest (and side quests if asked): talks,
// goes, clears camps and dungeons (foes are knocked out on the spot), picks
// things up, reads every line. `until(saga)` stops it. Works in solo and in
// Party (the heroes are teleported together).
// `prefer(qid)`: the quests to play first (say, a chapter’s own side quests while the
// next chapter’s main quest is already under way)
export async function autoplay({ until = null, maxSteps = 400, side = false, log = [], shots = null, lineShots = null, marks = null, prefer = null } = {}) {
  const po = { log, lineShots, marks };
  const S = saga(), P = S.P, C = () => P.combat;
  const heroes = () => P.players.filter((p) => p.connected || P.solo);
  const tp = async (x, z) => {
    if (P.solo) { D().tp(x, z); } else { heroes().forEach((p, i) => { p.actor.pos = { x: x + (i % 3) * 0.8 - 0.8, z: z + Math.floor(i / 3) * 0.8 }; }); P.cam.snap(P.camPlayers()); }
    await D().step(6, 1 / 60);
  };
  const clear = () => { const c = C(); if (!c) return; for (const e of c.enemies) if (e.alive && !e.def.boss) c.kill(e, heroes()[0]); };
  const settle = async (n = 120) => play(n, { ...po, until: () => !stage().active && !dlg().cur && !S.busyTalk && !S.running });
  for (let k = 0; k < maxSteps; k++) {
    if (until && until(S)) return log;
    await settle(60);
    if (stage().active || dlg().cur) { await play(600, { ...po, until: () => !stage().active && !dlg().cur }); continue; }
    // in a dungeon: go room by room
    if (S.dungeons && S.dungeons.cur) { await dungeonStep(S, tp, clear, log, po); continue; }
    const ids = S.activeIds().filter((id) => side || (S.st.q[id] && !/side/.test(''))).sort((a, b) => (S.stepDef(a) && S.stepDef(a).do === 'talk' ? 1 : 0) - (S.stepDef(b) && S.stepDef(b).do === 'talk' ? 1 : 0));
    let qid = S.tracked() || ids[0];
    if (prefer) {
      const pq = ids.find((id) => prefer(id));
      if (pq) qid = pq;
      else if (side) {
        const give = [...S.offerIds()].find((n) => { const o = S.offerOf(n); return o && o.kind === 'give' && prefer(o.qid); });
        if (give) { log.push('take ' + S.offerOf(give).qid); S.talk(give, heroes()[0]); await play(1200, { ...po, until: () => !S.busyTalk && !dlg().cur }); continue; }
      }
    }
    if (!qid) {
      // someone has a quest to give?
      const give = [...S.offerIds()][0];
      if (give && side) { S.talk(give, heroes()[0]); await play(1200, { ...po, until: () => !S.busyTalk && !dlg().cur }); continue; }
      log.push('— nothing to do'); return log;
    }
    const st = S.stepDef(qid);
    if (!st) { await D().step(20, 1 / 60); continue; }
    log.push(`${qid}#${S.stepOf(qid)} ${st.do}`);
    if (st.do === 'talk') {
      const n = S.npcFor(st.npc), tg = S.targetOf(qid);
      if (tg) await tp(tg.x, tg.z + 1.2);
      S.talk(st.npc, heroes()[0]);
      await play(1200, { ...po, until: () => !S.busyTalk && !dlg().cur });
    } else if (st.do === 'go') { await tp(st.at[0], st.at[1]); await D().step(20, 1 / 60); }
    else if (st.do === 'camp') {
      await tp(st.camp.at[0], st.camp.at[1] + 3);
      for (let i = 0; i < 20 && !S.has('camp:' + st.camp.id); i++) { await D().step(20, 1 / 60); clear(); }
    } else if (st.do === 'collect') {
      // (in the song’s order, when there is one)
      const want = st.order ? st.order[(S.st.q[qid].n || 0)] : null;
      const pk = S.pickups.find((q) => q.qid === qid && !q.got && (want == null || q.i === want));
      if (pk) { await tp(pk.x, pk.z); S.pick(pk, heroes()[0]); }
      else { clear(); await D().step(30, 1 / 60); }
    } else if (st.do === 'escort') {
      const R = S.escorts.runs.get(qid);
      if (!R) { await D().step(20, 1 / 60); continue; }
      if (st.flock) {
        // (lead them along the straight way to the goal, a step at a time, waiting for
        // everyone to catch up — and going back for anyone left far behind)
        let hx = st.from[0], hz = st.from[1] + 1;
        await tp(hx, hz); await D().step(20, 1 / 60);
        for (let i = 0; i < 400 && S.escorts.runs.has(qid); i++) {
          const out = R.walkers.filter((w) => !w.home);
          const far = out.map((w) => [w, Math.hypot(w.x - hx, w.z - hz)]).sort((a, b) => b[1] - a[1])[0];
          if (far && far[1] > 5) { hx = far[0].x; hz = far[0].z + 0.8; }
          else if (!far || far[1] < 2.6) { const dx = st.goal[0] - hx, dz = st.goal[1] - hz, l = Math.hypot(dx, dz) || 1; hx += (dx / l) * Math.min(l, 1.4); hz += (dz / l) * Math.min(l, 1.4); }
          await tp(hx, hz);
          await D().step(20, 1 / 60);
        }
      } else {
        for (let i = 0; i < 400 && S.escorts.runs.has(qid); i++) {
          const w = R.walkers[0];
          await tp(w.x + 1.2, w.z + 1.2);
          const c = C(); if (c) for (const e of c.enemies) if (e.alive && e.sagaTag === 'escort') c.kill(e, heroes()[0]);
          await D().step(20, 1 / 60);
        }
      }
    } else if (st.do === 'race') { for (const pt of st.points) { await tp(pt[0], pt[1]); await D().step(12, 1 / 60); } await D().step(20, 1 / 60);
    } else if (st.do === 'check') {
      // (what a player would do by hand — tame and ride — the step can do for the bots)
      const tg = S.targetOf(qid); if (tg) await tp(tg.x, tg.z + 1.5);
      if (st.bot) st.bot(S);
      await D().step(30, 1 / 60);
    } else if (st.do === 'sneak') {
      // (walking, not running: straight to the spot)
      await tp(st.back[0], st.back[1]); await D().step(10, 1 / 60);
      await tp(st.at[0], st.at[1]); await D().step(30, 1 / 60);
    } else if (['whack', 'lamps', 'kite', 'net', 'carry', 'rhythm', 'piles', 'seek', 'snap', 'defend', 'chase'].includes(st.do)) {
      // (the mini-games: stand where they’re played a moment — then the bots win them)
      const tg = S.targetOf(qid) || (st.at && { x: st.at[0], z: st.at[1] });
      if (tg) await tp(tg.x, tg.z + 0.5);
      await D().step(st.do === 'whack' ? 330 : 150, 1 / 60);
      if (po.marks && po.marks['game:' + qid] && !S['shot:' + qid]) { S['shot:' + qid] = 1; await sleep(120); await D().shot(po.marks['game:' + qid], 2); }
      if (st.do === 'lamps') { const R = S.games.runs.get(qid); if (R) for (const L of R.lamps) if (!L.lit) { await tp(L.x, L.z + 1); await D().step(4, 1 / 60); } }
      // (the ghosts: walk to each, and hear it out — their words are the story)
      if (st.do === 'seek') { const R = S.games.runs.get(qid); if (R) for (const gh of R.ghosts) if (!gh.heard) { await tp(gh.x, gh.z + 1.6); await D().step(40, 1 / 60); if (po.marks && po.marks['ghost:' + gh.i]) { await sleep(100); await D().shot(po.marks['ghost:' + gh.i], 2); } const f = (await import('/src/saga/games9.js')).GAMES9.seek; f.listen(S.games, R, gh); await play(900, { ...po, until: () => !dlg().cur && !R.busy }); } }
      S.games.bot(qid);
      await D().step(30, 1 / 60);
    } else if (st.do === 'kill') {
      const tg = S.targetOf(qid); if (tg) await tp(tg.x, tg.z);
      await D().step(30, 1 / 60);
      // (a story fight: its tagged foes, bosses too)
      const c = C(); if (c) for (const e of c.enemies) if (e.alive && (st.tag ? e.sagaTag === st.tag : !e.def.boss)) c.kill(e, heroes()[0]);
      await D().step(30, 1 / 60);
    }
    else await D().step(30, 1 / 60);
    if (shots) await shots(S, qid, st);
  }
  return log;
}

async function dungeonStep(S, tp, clear, log, po = {}) {
  // (still coming in: the fade, an outdoor instance’s first chunks)
  if (S.dungeons.entering) { await D().step(20, 1 / 60); await sleep(30); return; }
  const d = S.dungeons.cur, P = S.P, C = P.combat;
  const room = d.rooms.find((r) => !(r.state === 'clear' || r.solved || r.done === true || r.state === 'taken' || (r.kind === 'start') || ((r.kind === 'wax' || r.kind === 'logs' || r.kind === 'thinice' || ((r.kind === 'vent' || r.kind === 'jars' || r.kind === 'clock') && !r.run) || r.kind === 'spot') && r.passed)));
  if (!room) { await D().step(30, 1 / 60); return; }
  log.push('room ' + room.id + ' ' + room.kind);
  const c = { x: d.ox + room.x + room.w / 2, z: d.oz + room.z + room.h / 2 };
  if (room.kind === 'fight') { await tp(c.x, c.z + 1); await D().step(40, 1 / 60); if (po.marks && po.marks['room:' + room.id]) { await sleep(100); await D().shot(po.marks['room:' + room.id], 2); } for (let i = 0; i < 12 && room.state !== 'clear'; i++) { await D().step(20, 1 / 60); clear(); } }
  else if (room.kind === 'plates') { for (const pl of d.plates.filter((q) => q.r === room)) await tp(d.ox + pl.x, d.oz + pl.z); await D().step(20, 1 / 60); }
  else if (room.kind === 'wax') { await tp(c.x, c.z); await D().step(40, 1 / 60); room.passed = true; }
  else if (room.kind === 'logs') { await tp(c.x, c.z); await D().step(40, 1 / 60); if (po.marks && po.marks['room:' + room.id]) { await sleep(100); await D().shot(po.marks['room:' + room.id], 2); } room.passed = true; await tp(c.x, d.oz + room.z + 1.5); }
  else if (room.kind === 'simon') {
    // (listen, then ring the bells back in the order they sang)
    await tp(c.x, c.z + 2);
    for (let g = 0; g < 40 && !room.solved; g++) {
      await D().step(10, 1 / 60);
      const S2 = room.sim;
      if (!S2 || S2.state !== 'input') continue;
      if (po.marks && po.marks['room:' + room.id] && !room.shot) { room.shot = 1; await sleep(100); await D().shot(po.marks['room:' + room.id], 2); }
      for (const k of S2.seq.slice(S2.i)) { const b = room.sb[k]; await tp(d.ox + b.x, d.oz + b.z); await D().step(4, 1 / 60); await tp(c.x, c.z + 2); await D().step(4, 1 / 60); }
    }
  }
  else if (room.kind === 'points') {
    // (find the levers that send the cart into the barricade, pull them, press the button)
    const N = room.pn, R = N.R;
    for (let m = 0; m < 1 << N.levers.length; m++) {
      const st = { ...N.state };
      N.levers.forEach((lv, i) => { if ((m >> i) & 1) for (const j of lv.flips) st[j] = 1 - st[j]; });
      let at = 'd';
      for (let k = 0; k < 12; k++) { const nx = R.next[at]; if (nx === undefined) break; at = Array.isArray(nx) ? nx[st[at]] : nx; }
      if (at === R.goal) { N.levers.forEach((lv, i) => { if ((m >> i) & 1) lv.up = 1 - lv.up; }); Object.assign(N.state, st); N.show(); break; }
    }
    if (po.marks && po.marks['room:' + room.id]) { await tp(c.x, c.z + 2); await D().step(20, 1 / 60); await sleep(100); await D().shot(po.marks['room:' + room.id], 2); }
    await tp(d.ox + N.go.x, d.oz + N.go.z); await D().step(10, 1 / 60); await tp(c.x, c.z + 2);
    for (let g = 0; g < 40 && !room.solved; g++) await D().step(15, 1 / 60);
  }
  else if (room.kind === 'vent' && !room.run) {
    // (cap what must be capped, then ride the vents: wait on each until it throws)
    if (room.group) for (const V of room.vt.slice(0, room.vt.length - 1)) if (!V.capped) { await tp(d.ox + V.lever.x, d.oz + V.lever.z); await D().step(4, 1 / 60); await tp(d.ox + V.lever.x + 1.6, d.oz + V.lever.z + 1.2); await D().step(4, 1 / 60); }
    const order = room.group ? [room.vt[room.vt.length - 1]] : room.vt;
    for (const V of order) {
      await tp(d.ox + V.x, d.oz + V.z);
      const me = P.players.find((p) => p.connected || P.solo);
      for (let i = 0; i < 40; i++) { await D().step(6, 1 / 60); if (me.flight) { while (me.flight) await D().step(4, 1 / 60); break; } }
      if (po.marks && po.marks['room:' + room.id] && !room.shot) { room.shot = 1; await sleep(100); await D().shot(po.marks['room:' + room.id], 2); }
    }
    if (!room.passed && room.goal) { await tp(d.ox + room.goal[0], d.oz + room.goal[1]); await D().step(10, 1 / 60); }
    room.passed = true;
  }
  else if (room.kind === 'vent') {
    // (a fight among the vents: the scene, then its boss)
    await tp(c.x, c.z + room.h * 0.3);
    await play(900, { ...po, until: () => !stage().active && !dlg().cur });
    for (let i = 0; i < 40 && !room.done; i++) {
      await D().step(20, 1 / 60);
      if (po.marks && po.marks['room:' + room.id] && !room.shot) { room.shot = 1; await sleep(100); await D().shot(po.marks['room:' + room.id], 2); }
      if (C && i > 3) for (const e of C.enemies) if (e.alive && (e.miniGroup || e.def.boss) && Math.hypot(e.x - c.x, e.z - c.z) < 30) C.kill(e, P.players[0]);
      await play(200, { ...po, until: () => !stage().active && !dlg().cur });
    }
  }
  else if (room.kind === 'tide' && !room.run) {
    // (ring the bell — the bells, together — and go through while the sea is out)
    const T2 = room.tide;
    for (const b of T2.bells) { await tp(d.ox + b.x, d.oz + b.z); await D().step(3, 1 / 60); }
    for (let g = 0; g < 20 && !(T2.outT > 0); g++) { for (const b of T2.bells) { await tp(d.ox + b.x + 2, d.oz + b.z + 2); await D().step(2, 1 / 60); await tp(d.ox + b.x, d.oz + b.z); await D().step(2, 1 / 60); } }
    if (po.marks && po.marks['room:' + room.id]) { await tp(c.x, c.z + 2); await D().step(40, 1 / 60); await sleep(100); await D().shot(po.marks['room:' + room.id], 2); }
    const G = d.gate((room.opens || [])[0]);
    if (G) { await tp(d.ox + G.x, d.oz + G.z - 2); await D().step(10, 1 / 60); }
    await D().step(20, 1 / 60);
  }
  else if (room.kind === 'tide') {
    // (a fight in the water: the scene, then the bells to drain it, then its foes)
    await tp(c.x, c.z + room.h * 0.3);
    await play(900, { ...po, until: () => !stage().active && !dlg().cur });
    for (let i = 0; i < 60 && !room.done; i++) {
      const T2 = room.tide;
      if (T2 && T2.outT <= 0 && room.state === 'running') for (const b of T2.bells) { await tp(d.ox + b.x, d.oz + b.z); await D().step(2, 1 / 60); }
      await tp(c.x, c.z + room.h * 0.3);
      await D().step(20, 1 / 60);
      if (po.marks && po.marks['room:' + room.id] && T2 && T2.outT > 0 && !room.shot) { room.shot = 1; await sleep(100); await D().shot(po.marks['room:' + room.id], 2); }
      if (C && i > 3) for (const e of C.enemies) if (e.alive && (e.miniGroup || e.def.boss) && Math.hypot(e.x - c.x, e.z - c.z) < 30) C.kill(e, P.players[0]);
      await play(200, { ...po, until: () => !stage().active && !dlg().cur });
    }
  }
  else if (room.kind === 'clock' && !room.run) {
    // (the way through: THEN, NOW — or, where it takes both, the bots simply step past)
    const { solveClock, turn: turnClock } = await import('/src/saga/clocks.js');
    await tp(c.x, d.oz + room.z + room.h - 2); await D().step(20, 1 / 60);
    if (po.marks && po.marks['room:' + room.id] && !room.shot) { room.shot = 1; await sleep(100); await D().shot(po.marks['room:' + room.id], 2); }
    const era = solveClock(d, room);
    if (era) turnClock(d, room, P.players.filter((p) => p.connected || P.solo), era);
    if (po.marks && po.marks['room2:' + room.id] && !room.shot2) { room.shot2 = 1; await D().step(20, 1 / 60); await sleep(100); await D().shot(po.marks['room2:' + room.id], 2); }
    await tp(c.x, d.oz + (room.goalZ || room.z + 1) - 1.2);
    for (let g = 0; g < 10 && !room.passed; g++) await D().step(10, 1 / 60);
    room.passed = true;
    for (const id of room.opens || []) { const G = d.gate(id); if (G) d.setGate(G, true); }
  }
  else if (room.kind === 'clock') {
    // (the ballroom: the scene, the clocks turned to NOW (for the pictures), then down she goes)
    const { turn: turnClock } = await import('/src/saga/clocks.js');
    await tp(c.x, c.z + room.h * 0.3);
    await play(900, { ...po, until: () => !stage().active && !dlg().cur });
    for (let i = 0; i < 60 && !room.done; i++) {
      await D().step(20, 1 / 60);
      if (room.ck && room.ck.era !== 'now') turnClock(d, room, P.players.filter((p) => p.connected || P.solo), 'now');
      if (po.marks && po.marks['room:' + room.id] && !room.shot && i > 6) { room.shot = 1; await sleep(100); await D().shot(po.marks['room:' + room.id], 2); }
      if (C && (i > 14 || room.shot)) for (const q of C.enemies) if (q.alive && (q.miniGroup || q.def.boss) && Math.hypot(q.x - c.x, q.z - c.z) < 30) C.kill(q, P.players[0]);
      await play(200, { ...po, until: () => !stage().active && !dlg().cur });
    }
  }
  else if (room.kind === 'jars' && !room.run) {
    // (hang a jar on every hook — the swarms go off to them — then walk on through)
    const { botJars } = await import('/src/saga/jars.js');
    await tp(c.x, c.z + room.h * 0.3);
    await D().step(30, 1 / 60);
    if (po.marks && po.marks['room:' + room.id] && !room.shot) { room.shot = 1; await sleep(100); await D().shot(po.marks['room:' + room.id], 2); }
    botJars(room);
    for (let g = 0; g < 20; g++) await D().step(10, 1 / 60);
    await tp(c.x, d.oz + room.z + 0.6);
    for (let g = 0; g < 10 && !room.passed; g++) await D().step(10, 1 / 60);
    room.passed = true;
    for (const id of room.opens || []) { const G = d.gate(id); if (G) d.setGate(G, true); }
  }
  else if (room.kind === 'jars') {
    // (the Queen's chamber: the scene, a jar hung to bare her (for the pictures), then down she goes)
    const { botJars } = await import('/src/saga/jars.js');
    await tp(c.x, c.z + room.h * 0.3);
    await play(900, { ...po, until: () => !stage().active && !dlg().cur });
    for (let i = 0; i < 60 && !room.done; i++) {
      await D().step(20, 1 / 60);
      if (i === 4) botJars(room);
      if (po.marks && po.marks['room:' + room.id] && !room.shot && i > 8) { room.shot = 1; await sleep(100); await D().shot(po.marks['room:' + room.id], 2); }
      if (C && (i > 14 || room.shot)) for (const q of C.enemies) if (q.alive && (q.miniGroup || q.def.boss) && Math.hypot(q.x - c.x, q.z - c.z) < 30) C.kill(q, P.players[0]);
      await play(200, { ...po, until: () => !stage().active && !dlg().cur });
    }
  }
  else if (room.kind === 'beam' && !room.run) {
    // (turn the mirrors the one right way, then wait for the paper to burn and the lotuses to bloom)
    const { solveBeam } = await import('/src/saga/beam.js');
    solveBeam(room);
    // (off to the side, clear of the mirrors' plates: a bot on one would turn it — and eight
    // bots stand in a little crowd)
    const B = room.bm || {}, plates = [...(B.mirrors || []).map((M) => M.plate).filter(Boolean), ...((B.dawn && B.dawn.plates) || [])];
    const clear = (x, z) => plates.every((pl) => Math.hypot(pl.x - x, pl.z - z) > 2.2);
    let spot = null;
    for (let dz = room.h - 2.5; dz > 1.5 && !spot; dz -= 1) for (let dx = 2; dx < room.w - 3.5 && !spot; dx += 1) if (clear(room.x + dx, room.z + dz) && clear(room.x + dx + 1.6, room.z + dz + 1.6)) spot = { x: room.x + dx, z: room.z + dz };
    await tp(spot ? d.ox + spot.x : c.x - 6, spot ? d.oz + spot.z : d.oz + room.z + room.h - 2.5);
    for (let g = 0; g < 40 && !room.solved; g++) {
      await D().step(15, 1 / 60);
      if (po.marks && po.marks['room:' + room.id] && !room.shot && g > 3) { room.shot = 1; await sleep(100); await D().shot(po.marks['room:' + room.id], 2); }
    }
    const G = d.gate((room.opens || [])[0]);
    if (G) { await tp(d.ox + G.x, d.oz + G.z + 1.5); await D().step(10, 1 / 60); }
  }
  else if (room.kind === 'beam') {
    // (a fight on the roof: the scene, then the dragon — caught in the beam once, for the pictures)
    await tp(c.x, c.z + room.h * 0.3);
    await play(900, { ...po, until: () => !stage().active && !dlg().cur });
    for (let i = 0; i < 60 && !room.done; i++) {
      await D().step(20, 1 / 60);
      const e = room.boss;
      if (e && e.alive && e.state === 'perch' && room.bm && room.bm.dawn && !room.caught) {
        // (aim the Dawn Mirror at the perch it landed on)
        const B = room.bm.dawn, a = Math.atan2(e.z - d.oz - B.z, e.x - d.ox - B.x);
        const k = ((Math.round((a + Math.PI / 2) / (Math.PI / 4)) % 8) + 8) % 8;
        B.dir = k; room.caught = true;
        await D().step(20, 1 / 60);
      }
      if (po.marks && po.marks['room:' + room.id] && !room.shot && e && e.burn > 0) { room.shot = 1; await sleep(100); await D().shot(po.marks['room:' + room.id], 2); }
      if (C && (i > 34 || room.shot)) for (const q of C.enemies) if (q.alive && (q.miniGroup || q.def.boss) && Math.hypot(q.x - c.x, q.z - c.z) < 30) C.kill(q, P.players[0]);
      await play(200, { ...po, until: () => !stage().active && !dlg().cur });
    }
  }
  else if (room.kind === 'thinice') {
    await tp(c.x, d.oz + room.z + room.h - 0.6); await D().step(20, 1 / 60);
    if (po.marks && po.marks['room:' + room.id]) { await sleep(100); await D().shot(po.marks['room:' + room.id], 2); }
    room.passed = true; await tp(c.x, d.oz + room.z - 1);
  }
  else if (room.kind === 'torches') {
    // (in the order the glowworms count out)
    for (const tb of [...(room.tb || [])].sort((a, b) => a.n - b.n)) { await tp(d.ox + tb.x, d.oz + tb.z + 1); await D().step(8, 1 / 60); }
    if (po.marks && po.marks['room:' + room.id]) { await sleep(100); await D().shot(po.marks['room:' + room.id], 2); }
    await D().step(20, 1 / 60);
  }
  else if (room.kind === 'script') {
    await tp(c.x, c.z + room.h * 0.3);
    await play(900, { ...po, until: () => !stage().active && !dlg().cur });
    if (po.marks && po.marks['room:' + room.id]) { await sleep(100); await D().shot(po.marks['room:' + room.id], 2); }
    for (let i = 0; i < 60 && !room.done; i++) {
      await D().step(20, 1 / 60);
      if (C) for (const e of C.enemies) if (e.alive && (e.miniGroup || e.def.boss || e.summoner || e.sagaTag === room.id)) {   // (the Mole Brothers: the room's own foes)
        // (a boss who stops rather than falls — the Grand Finale: act by act, the cannon fired once)
        if (e.onEnd) {
          if (e.ended) continue;
          const f = e.hp / e.maxHp;
          if (f > 0.7) e.hp = e.maxHp * 0.62;
          else if (f > 0.4) e.hp = e.maxHp * 0.3;
          else if (room.plate && !room.fired && e.phase >= 3) {
            await tp(room.plate.x, room.plate.z); await play(200, { ...po, until: () => room.fired });
            if (po.marks && po.marks['fired:' + room.id]) { await D().step(24, 1 / 60); await sleep(100); if (po.marks.clean) await clean(); await D().shot(po.marks['fired:' + room.id], 2); }
            await tp(c.x, c.z + room.h * 0.3);
          }
          else e.hp = e.maxHp * 0.1;
        } else C.kill(e, P.players[0]);
      }
      await play(200, { ...po, until: () => !stage().active && !dlg().cur });
    }
  } else if (room.kind === 'spot') {
    // (in, the room’s own scene if it has one, a look — then the lights out and straight through)
    await tp(c.x, d.oz + room.z + room.h - 2.5);
    await play(900, { ...po, until: () => !stage().active && !dlg().cur });
    if (po.marks && po.marks['room:' + room.id]) { await D().step(90, 1 / 60); await sleep(100); if (po.marks.clean) await clean(); await D().shot(po.marks['room:' + room.id], 2); }
    if (room.sp) room.sp.dark = 99;
    await tp(c.x, d.oz + room.goalZ - 0.7);
    for (let i = 0; i < 10 && !room.passed; i++) await D().step(10, 1 / 60);
    if (room.sp) room.sp.dark = 0;
  } else if (room.kind === 'end') {
    for (let i = 0; i < 20 && room.state !== 'ready'; i++) await D().step(20, 1 / 60);
    await tp(d.ox + room.item[0], d.oz + room.item[1] + 0.5);
    await play(900, { ...po, until: () => !S.dungeons.cur && !stage().active && !dlg().cur });
  }
}
