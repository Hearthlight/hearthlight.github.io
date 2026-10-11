// Step mini-games (round 12), in the same frame as games7.js — four new kinds, and each one is
// a round: its rule on a card, three, two, one, a clock and a score everybody can read, then a
// result with three ranks (their thresholds follow the number of heroes), a prize in stardust
// and the best score kept.
//   { do: ’toss’, at: [x, z], w, rows: [d…], time, ranks, per, friend, shot, every, up }
//      a fairground range: boards swing up beyond the rail (`at`: its middle, w tiles wide);
//      stand in front of one and throw (A) — it flies straight north. A gloom’s board 1, a
//      golden one 3, a friend’s −2.
//   { do: ’herd’, at: [x, z], r, pen: [x, z], gate, n, per, time, model(r3d) }
//      a flock that runs from whoever comes near: walk behind it, into the pen. A whistles (they
//      bolt). Half-way a golden one turns up: 3.
//   { do: ’tug’, at: [x, z], side, foe(r3d), yaw, cry, time, gain, drag, ranks }
//      a rope and something stubborn at its other end: hammer A to pull — and hands off when it
//      digs in (a pull then is a slip). The flag over your line wins; the score is the time left.
//   { do: ’cook’, at: [x, z], crates: [[x, z]…], colors, time, ranks, per }
//      orders: so many things on a skewer, in an order. Take one at its crate (A), put it on the
//      skewer (A at the stall) — only the next one fits. The score: skewers finished.
// A step carries its words, in English: `rule` (one line, on the opening card), `verb` and
// `hint` (the button and the line under it, on the phones and the chips), `oops`, `lost`.
// `ranks` are the three thresholds for one hero, `per` what each hero more adds to them.
// Each run lives while its step does; the harness’s `bot` plays a decent round at once.

import { THREE } from '../render/r3d.js';
import { drawText, measure, wrap } from '../engine/font.js';
import { audio } from '../engine/audio.js';
import { t } from '../i18n.js';
import { kit } from '../models/v7/kit.js';
import { buildRangeRail, buildRangeBack, buildRangeBoard, buildRangeShot, buildPen, gild, buildButtercup, buildDango, buildDangoCrate, buildDangoStall, DANGO } from '../models/v7/games12.js';
import { buildFluffhorn } from '../models/v7/props7.js';

const rand = (a, b) => a + Math.random() * (b - a);
const far = (p, x, z) => Math.hypot(p.pos.x - x, p.pos.z - z);
const turn = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const pop = (G, x, y, z, text, color, big = false) => { const C = G.P.combat; if (C) C.popText(x, y, z, text, color, big); };
const fx = (G, kind, x, y, z, n, o) => G.P.world.fx.emit(kind, x, y, z, n, o);
const gain = (R, p, n) => { R.score = Math.max(0, R.score + n); if (p) R.by.set(p, (R.by.get(p) || 0) + n); };
const ranksOf = (st, n, base, per) => (st.ranks || base).map((v, i) => Math.max(0, Math.round(v + (n - 1) * (st.per || per)[i])));
const CARD = 6.4, RESULT = 7;
// (a step names its beasts: `foe: ’buttercup’`, `model: ’fluffhorn’` — or gives a builder)
const MODELS = { buttercup: buildButtercup, fluffhorn: buildFluffhorn };
const model = (m, r3d) => (typeof m === 'function' ? m(r3d) : MODELS[m](r3d));

// ------------------------------------------------------------------ the round
// What the four share. A kind `K` gives: time, r, ranks(G, R, n), build, start, tick, near, and
// what it needs of stop / reset / clear / anim / hud / draw / score / rankText / botScore
function round(K) {
  const M = {
    K,
    begin(G, R) {
      Object.assign(R, { state: 'idle', wait: 0, score: 0, by: new Map(), left: R.st.time || K.time, n: 1, stars: 0, mark: 0 });
      R.rk = K.ranks(G, R, 1);
      K.build(G, R);
    },
    end(G, R) { if (K.stop) K.stop(G, R); if (K.clear) K.clear(G, R); },
    here(G, R, p) { return K.here ? K.here(G, R, p) : far(p, R.st.at[0], R.st.at[1]) < (R.st.r || K.r); },
    // (is anybody about? A round nobody plays any more folds without a word, and shows nothing)
    about(G, R) { const d = (R.st.r || K.r || 8) + 9; return G.heroes().some((p) => far(p, R.st.at[0], R.st.at[1]) < d); },
    update(G, R, dt, held) {
      const heroes = G.heroes();
      if (K.anim) K.anim(G, R, dt);
      if (R.state === 'done') { G.win(R); return; }
      if (held) return;
      const here = heroes.filter((p) => M.here(G, R, p));
      if (R.state === 'idle') {
        R.wait -= dt;
        // (after a round without a rank: everybody steps out first — nobody is kept playing)
        if (R.rearm) { if (!here.length) R.rearm = false; return; }
        if (here.length && R.wait <= 0) { R.state = 'card'; R.cardT = CARD; R.shown = 4; R.away = 0; stage(G); audio.sfx('open', { volume: 0.5 }); G.S.refreshCard(); }
        return;
      }
      if (R.state === 'card') {
        R.n = Math.max(1, heroes.length); R.rk = K.ranks(G, R, R.n);
        // (everybody walked off: the card folds, nothing starts)
        R.away = here.length ? 0 : R.away + dt;
        if (R.away > 1.5) { R.state = 'idle'; R.wait = 0.4; G.S.refreshCard(); return; }
        R.cardT -= dt;
        const s = Math.ceil(R.cardT);
        if (s !== R.shown && s <= 3) { R.shown = s; if (s > 0) audio.sfx('tick', { volume: 0.6 }); }
        if (R.cardT <= 0) M.go(G, R, heroes);
        return;
      }
      if (R.state === 'run') {
        R.gone = M.about(G, R) ? 0 : (R.gone || 0) + dt;
        if (R.gone > 3) { if (K.stop) K.stop(G, R); R.state = 'idle'; R.wait = 1; R.gone = 0; if (K.reset) K.reset(G, R); G.S.refreshCard(); return; }
        R.left -= dt; R.goT -= dt;
        K.tick(G, R, dt, heroes);
        const s = Math.ceil(R.left);
        if (s !== R.shownS) { R.shownS = s; G.S.refreshCard(); if (s <= 5 && s > 0) audio.sfx('tick', { volume: 0.5 }); }
        if (R.left <= 0 || R.over) M.finish(G, R);
        return;
      }
      if (R.state === 'result') {
        R.resT += dt;
        // (its stars land one by one)
        const due = Math.min(R.stars, Math.floor((R.resT - 0.5) / 0.45) + 1);
        if (R.resT > 0.5 && R.pops < due) { R.pops = due; audio.sfx('chime', { volume: 0.7, pitch: [0, 4, 7][due - 1] }); G.P.cam.shake = Math.max(G.P.cam.shake || 0, 0.12); }
        if (R.resT > RESULT || !M.about(G, R)) M.close(G, R);
      }
    },
    go(G, R, heroes) {
      Object.assign(R, { state: 'run', score: 0, by: new Map(), left: R.st.time || K.time, goT: 1.1, over: false, lost: false, shownS: -1 });
      R.n = Math.max(1, heroes.length); R.rk = K.ranks(G, R, R.n);
      K.start(G, R, heroes);
      audio.sfx('whistle', { volume: 0.8 });
      G.S.refreshCard();
    },
    finish(G, R) {
      const P = G.P, S = G.S;
      R.left = Math.max(0, R.left);
      if (K.stop) K.stop(G, R);
      if (K.clock && !R.over) R.lost = true;        // (the clock ran out on the rope: no win)
      const sc = R.final = K.score ? K.score(G, R) : R.score;
      R.stars = R.lost ? 0 : R.rk.filter((v) => sc >= v).length;
      const key = 'best:' + R.qid, was = S.st.f[key];
      R.was = was; R.record = R.stars > 0 && (was === undefined || sc > was);
      if (R.record) S.st.f[key] = sc;
      S.st.f['stars:' + R.qid] = R.stars;
      // the prize: stardust for every hero, by the rank
      R.prize = R.stars * (R.st.prize ?? 4);
      if (R.prize && P.progress && P.progress.addDust) { for (const p of G.heroes()) P.progress.addDust(p, R.prize); if (P.progress.sendAll) P.progress.sendAll(); }
      S.save();
      Object.assign(R, { state: 'result', resT: 0, pops: 0 });
      stage(G);
      audio.sfx(R.stars ? 'fanfare' : 'error', { volume: R.stars ? 0.6 : 0.5 });
      for (const p of G.heroes()) { if (R.stars && p.setEmote) p.setEmote(R.stars > 2 ? 'star' : 'note', 1.6); P.buzz(p, R.stars ? [40, 40, 90] : 60); }
      S.refreshCard();
    },
    close(G, R) {
      if (R.state !== 'result') return;
      if (R.stars > 0) { R.state = 'done'; G.win(R); return; }
      // (no rank: it sets itself up again — step back in)
      R.state = 'idle'; R.wait = 1; R.rearm = true;
      if (K.reset) K.reset(G, R);
      G.S.refreshCard();
    },
    near(G, R, p) {
      if (R.state === 'result') return R.resT > 1.8 && M.here(G, R, p) ? { kind: 'secret', label: 'Continue', hint: '', use: () => M.close(G, R) } : null;
      return R.state === 'run' ? K.near(G, R, p) : null;
    },
    obj(G, R) {
      if (R.state !== 'run') return '';
      if (K.clock) return t(' — {s} s', { s: Math.max(0, Math.ceil(R.left)) });
      return t(' ({n}/{total}) — {s} s', { n: R.score, total: R.rk.find((v) => v > R.score) || R.rk[2], s: Math.max(0, Math.ceil(R.left)) });
    },
    target(G, R) { const at = (R.state === 'run' && K.goal && K.goal(G, R)) || R.st.at; return { x: at[0], z: at[1] }; },
    draw(G, R, ctx, v) { if (K.draw) K.draw(G, R, ctx, v); },
    drawUi(G, R, ctx, W, H) {
      if (!M.about(G, R)) return;
      if (R.state === 'card') drawCard(G, R, K, ctx, W, H);
      else if (R.state === 'run') drawHud(G, R, K, ctx, W, H);
      else if (R.state === 'result') drawResult(G, R, K, ctx, W, H);
    },
    // (the harness: a decent round, straight to its result — then on)
    bot(G, R) {
      if (R.state === 'done') return;
      if (R.state === 'result') { M.close(G, R); return; }
      if (R.state !== 'run') M.go(G, R, G.heroes());
      R.score = R.rk[1];
      if (K.botScore) K.botScore(G, R);
      M.finish(G, R);
    },
  };
  return M;
}

// ------------------------------------------------------------------ what the round draws
const STAR = ['....#....', '....#....', '...###...', '#########', '.#######.', '..#####..', '..#####..', '.###.###.', '.#.....#.'];
function star(ctx, x, y, on, s = 1) {
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = on ? '#ffd23a' : '#4a3a5a';
  STAR.forEach((row, j) => { for (let i = 0; i < 9; i++) if (row[i] === '#') ctx.fillRect(x + i * s, y + j * s, s, s); });
  if (on) { ctx.fillStyle = '#fff7c4'; ctx.fillRect(x + 4 * s, y + 2 * s, s, 2 * s); ctx.fillRect(x + 2 * s, y + 3 * s, 2 * s, s); }
}
function sheet(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(24,16,34,0.9)'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#ffd66b'; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1);
}
// the round’s cards take the middle of the screen: a banner that is up bows out (Party’s lane),
// and one that comes meanwhile keeps its place — the card sits under it
const stage = (G) => { const L = G.P.lane; if (L && L.bow) L.bow(); };
const under = (G, y) => { const L = G.P.lane, r = L && L.showing && L.rect; return r ? Math.max(y, r.y + r.h + 4) : y; };
const titleOf = (G, R) => { const o = G.S.objective(R.qid); return (o && o.title) || ''; };
const rankWord = (K, G, R, i) => (K.rankText ? K.rankText(G, R, i) : String(R.rk[i]));

// the opening card: the game’s name, its rule in one line, the three ranks — then 3, 2, 1
function drawCard(G, R, K, ctx, W, H) {
  const st = R.st, title = titleOf(G, R), pw = Math.min(W - 24, 300), rule = wrap(t(st.rule || '', { a: G.P.keyName('a') }), pw - 24).slice(0, 3);
  const ph = 34 + rule.length * 10 + 42, x = Math.round(W / 2 - pw / 2), y = under(G, Math.round(H * 0.1)), k = Math.min(1, (CARD - R.cardT) * 6);
  ctx.globalAlpha = k;
  sheet(ctx, x, y, pw, ph);
  drawText(ctx, title, W / 2, y + 8, { color: '#fff3c4', align: 'center', scale: measure(title, 2) < pw - 16 ? 2 : 1, shadow: '#2a1f33' });
  rule.forEach((l, i) => drawText(ctx, l, W / 2, y + 30 + i * 10, { color: '#fff7e6', align: 'center' }));
  // ★ a   ★★ b   ★★★ c
  const words = [0, 1, 2].map((i) => rankWord(K, G, R, i)), ws = words.map((s, i) => (i + 1) * 10 + 3 + measure(s)), gap = 14;
  let rx = Math.round(W / 2 - (ws.reduce((a, b) => a + b, 0) + gap * 2) / 2);
  const ry = y + 34 + rule.length * 10;
  words.forEach((s, i) => {
    for (let j = 0; j <= i; j++) star(ctx, rx + j * 10, ry, true);
    drawText(ctx, s, rx + (i + 1) * 10 + 3, ry + 1, { color: '#ffe08a' });
    rx += ws[i] + gap;
  });
  // (its foot: the best so far, then three, two, one)
  const best = G.S.st.f['best:' + R.qid], s = Math.ceil(R.cardT), fy = y + ph - 24;
  ctx.fillStyle = '#4a3a5a'; ctx.fillRect(x + 8, fy - 4, pw - 16, 1);
  if (s <= 3 && s > 0) drawText(ctx, String(s), W / 2, fy, { color: '#ffe08a', align: 'center', scale: 2, shadow: '#2a1f33' });
  else drawText(ctx, t('Get ready…'), W / 2, fy + 5, { color: '#b9a2e3', align: 'center' });
  if (best !== undefined) drawText(ctx, t('Best: {n}', { n: K.clock ? t('{s} s', { s: best }) : best }), x + pw - 8, fy + 5, { color: '#b9a2e3', align: 'right' });
  ctx.globalAlpha = 1;
}

// the round’s own little board: the clock, the score, the three stars lighting up
function drawHud(G, R, K, ctx, W, H) {
  const sc = K.score ? K.score(G, R) : R.score, s = Math.max(0, Math.ceil(R.left));
  // (on the left, clear of the middle of the picture: the round itself is what to look at)
  const w = 132, h = 30, x = 8, y = Math.round(H * 0.3);
  R.hud = { x, y, w, h };
  sheet(ctx, x, y, w, h);
  // the clock, a bar under it running out
  drawText(ctx, t('{s} s', { s }), x + 8, y + 6, { color: s <= 10 ? (Math.floor(R.t * 4) % 2 ? '#ff9aa8' : '#fff7e6') : '#fff7e6', scale: 2 });
  ctx.fillStyle = '#4a3a5a'; ctx.fillRect(x + 6, y + h - 5, w - 12, 2);
  ctx.fillStyle = s <= 10 ? '#ff9aa8' : '#8fd6b4'; ctx.fillRect(x + 6, y + h - 5, Math.round((w - 12) * Math.max(0, R.left) / (R.st.time || K.time)), 2);
  if (K.clock) { if (K.hudSide) K.hudSide(G, R, ctx, x + 62, y + 4, w - 68); }
  else {
    const big = R.mark > 0 ? 1 : 0;
    drawText(ctx, String(sc), x + w - 44, y + 6 - big, { color: R.mark > 0 ? '#ffe08a' : '#fff7e6', align: 'right', scale: 2 });
    for (let i = 0; i < 3; i++) star(ctx, x + w - 38 + i * 11, y + 4, sc >= R.rk[i]);
    const next = R.rk.find((v) => v > sc);
    drawText(ctx, next ? '→ ' + next : '', x + w - 6, y + 16, { color: '#b9a2e3', align: 'right' });
  }
  if (K.hud) K.hud(G, R, ctx, W, H, { x, y, w, h });
  if (R.goT > 0) drawText(ctx, t('GO!'), W / 2, Math.round(H * 0.34), { color: '#8fd67a', align: 'center', scale: R.goT > 0.95 ? 4 : 3, outline: '#241a2e' });
}

// the result: the stars, the score, what the next rank asks, the best so far, who did what, the prize
function drawResult(G, R, K, ctx, W, H) {
  const P = G.P, st = R.st, sc = R.final, rows = P.solo || R.n < 2 || K.team ? [] : G.heroes().map((p) => ({ p, n: R.by.get(p) || 0 })).sort((a, b) => b.n - a.n);
  const two = rows.length > 4, rh = rows.length ? Math.ceil(rows.length / (two ? 2 : 1)) * 10 + 5 : 0;
  const pw = Math.min(W - 24, 240), ph = 92 + rh, x = Math.round(W / 2 - pw / 2), y = under(G, Math.round(H * 0.07)), k = Math.min(1, R.resT * 5);
  ctx.globalAlpha = k;
  sheet(ctx, x, y, pw, ph);
  drawText(ctx, titleOf(G, R), W / 2, y + 6, { color: '#fff3c4', align: 'center' });
  for (let i = 0; i < 3; i++) { const on = i < R.pops, grow = on && R.resT - 0.5 - i * 0.45 < 0.12 ? 1 : 0; star(ctx, W / 2 - 46 + i * 33 - grow * 2, y + 18 - grow * 2, on, 3); }
  const line = R.lost ? t(st.lost || 'Pulled over the line!') : K.scoreText ? K.scoreText(G, R, sc) : t('Score: {n}', { n: sc });
  drawText(ctx, line, W / 2, y + 50, { color: '#fff7e6', align: 'center', scale: measure(line, 2) < pw - 12 ? 2 : 1 });
  const next = R.lost ? -1 : R.rk.findIndex((v) => v > sc);
  const more = R.lost ? '' : next < 0 ? t('Top rank!') : t('Next rank: {n}', { n: rankWord(K, G, R, next) });
  const best = R.record ? t('New best!') : R.was !== undefined ? t('Best: {n}', { n: K.clock ? t('{s} s', { s: R.was }) : R.was }) : '';
  drawText(ctx, [more, best].filter(Boolean).join(' · '), W / 2, y + 70, { color: R.record ? '#ffe08a' : '#b9a2e3', align: 'center' });
  rows.forEach(({ p, n }, i) => {
    const cw = two ? (pw - 20) / 2 : pw - 60, rx = x + (two ? 10 + (i % 2) * cw : 30), ry = y + 82 + Math.floor(i / (two ? 2 : 1)) * 10;
    ctx.fillStyle = p.color; ctx.fillRect(Math.round(rx), ry + 1, 5, 5);
    drawText(ctx, String(p.name).slice(0, two ? 9 : 14), rx + 8, ry, { color: '#fff7e6' });
    drawText(ctx, String(n), rx + cw - 8, ry, { color: i ? '#e8d6b4' : '#ffe08a', align: 'right' });
  });
  const foot = R.stars ? t('+{n} stardust', { n: R.prize }) : t('Step back in to try again');
  drawText(ctx, foot, W / 2, y + ph - 12, { color: R.stars ? '#8fd6b4' : '#ff9a8a', align: 'center' });
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------ the range
const toss = round({
  time: 45,
  ranks: (G, R, n) => ranksOf(R.st, n, [10, 20, 30], [6, 11, 16]),
  here(G, R, p) { const st = R.st; return Math.abs(p.pos.x - st.at[0]) < (st.w || 9) / 2 + 0.7 && p.pos.z > st.at[1] + 0.1 && p.pos.z < st.at[1] + 3.2; },
  build(G, R) {
    const st = R.st, r3d = G.P.r3d, [x0, z0] = st.at, w = st.w || 9, rows = st.rows || [2, 3.5, 5], col = G.P.world.overCol;
    const rail = buildRangeRail(r3d, w); rail.position.set(x0, G.y(x0, z0), z0); R.root.add(rail);
    R.back = buildRangeBack(r3d, w); R.back.position.set(x0, G.y(x0, z0 - rows[rows.length - 1] - 1.3), z0 - rows[rows.length - 1] - 1.3); R.root.add(R.back);
    // (nobody walks among the boards)
    R.cols = [];
    for (let x = -w / 2 - 0.2; x <= w / 2 + 0.2; x += 0.5) { const c = { x: x0 + x, z: z0, r: 0.3 }; col.add(c); R.cols.push(c); }
    // the boards: rows of them, every other row half a step aside
    R.slots = [];
    rows.forEach((d, r) => {
      const n = Math.floor(w / 1.5) - (r % 2);
      for (let i = 0; i < n; i++) { const x = x0 + (i - (n - 1) / 2) * 1.5, z = z0 - d; R.slots.push({ x, z, y: G.y(x, z), r, obj: {}, kind: null, k: 0, state: 'down', t: 0, rest: rand(0, 1) }); }
    });
    R.shots = []; R.cool = new Map(); R.spawnT = 0;
  },
  clear(G, R) { for (const c of R.cols) G.P.world.overCol.remove(c); },
  start(G, R) { R.spawnT = 0.4; R.hits = new Map(); },
  stop(G, R) { for (const s of R.slots) if (s.state === 'rise' || s.state === 'up') s.state = 'sink'; for (const b of R.shots) R.root.remove(b.obj); R.shots = []; },
  raise(G, R, s, kind) {
    for (const o of Object.values(s.obj)) o.visible = false;
    let o = s.obj[kind];
    if (!o) { o = s.obj[kind] = buildRangeBoard(G.P.r3d, kind, R.st.friend || 'hen'); o.position.set(s.x, s.y, s.z); R.root.add(o); }
    o.visible = true; o.userData.spin(0);
    Object.assign(s, { kind, state: 'rise', t: 0, x0: s.x });
    audio.sfx('flick', { volume: 0.3, pitch: kind === 'gold' ? 9 : rand(-3, 3) });
  },
  anim(G, R, dt) {
    if (R.back.userData.anim) R.back.userData.anim(R.t);
    for (const s of R.slots) {
      const o = s.kind && s.obj[s.kind];
      if (s.state === 'down') s.rest -= dt;
      if (!o) continue;
      s.t += dt;
      if (s.state === 'rise') { s.k = Math.min(1, s.k + dt / 0.16); if (s.k >= 1) { s.state = 'up'; s.t = 0; } }
      else if (s.state === 'up') { if (s.t > s.stay) s.state = 'sink'; }
      else if (s.state === 'sink') { s.k = Math.max(0, s.k - dt / 0.25); if (s.k <= 0) { s.state = 'down'; s.rest = 0.5; } }
      else if (s.state === 'hit') { s.k = Math.max(0, s.k - dt / 0.14); o.userData.spin(s.t * 14); if (s.k <= 0) { s.state = 'down'; s.rest = 0.7; o.userData.spin(0); } }
      o.userData.set(s.k);
    }
  },
  tick(G, R, dt) {
    const st = R.st, n = R.n, time = st.time || 45, last = st.at[1] - (st.rows || [2, 3.5, 5]).slice(-1)[0];
    R.mark -= dt;
    for (const [p, c] of R.cool) R.cool.set(p, c - dt);
    R.spawnT -= dt;
    const up = R.slots.filter((s) => s.state === 'rise' || s.state === 'up').length;
    if (R.spawnT <= 0 && up < 2 + Math.ceil(n * 0.8)) {
      const free = R.slots.filter((s) => s.state === 'down' && s.rest <= 0);
      const s = free[Math.floor(Math.random() * free.length)], q = Math.random();
      if (s) {
        const kind = q < (st.friends ?? 0.17) ? 'friend' : q < (st.friends ?? 0.17) + 0.12 ? 'gold' : 'foe';
        s.stay = (kind === 'gold' ? 1.5 : kind === 'friend' ? 2.2 : 2.7) * (st.up || 1);
        this.raise(G, R, s, kind);
      }
      R.spawnT = ((st.every || 0.8) / Math.sqrt(n)) * (0.65 + 0.35 * Math.max(0, R.left / time));
    }
    // what flies: straight north, in a low arc
    for (const b of R.shots) {
      const pz = b.z;
      b.z -= 13 * dt; b.vy -= 6.5 * dt; b.y += b.vy * dt;
      b.obj.position.set(b.x, b.y, b.z); b.obj.rotation.x -= dt * 12;
      const s = R.slots.find((q) => (q.state === 'up' || (q.state === 'rise' && q.k > 0.5)) && Math.abs(q.x - b.x) < 0.55 && pz >= q.z - 0.15 && b.z <= q.z + 0.15);
      if (s) { this.hit(G, R, s, b); b.gone = true; }
      else if (b.z < last - 1.2 || b.y < 0.1 + b.y0) { b.gone = true; fx(G, 'dust', b.x, b.y0 + 0.15, b.z, 5, { color: st.puff || '#fff7e6' }); audio.sfx('step', { volume: 0.25 }); }
      if (b.gone) R.root.remove(b.obj);
    }
    R.shots = R.shots.filter((b) => !b.gone);
  },
  throw(G, R, p) {
    if (R.state !== 'run' || (R.cool.get(p) || 0) > 0) return;
    R.cool.set(p, 0.36);
    const a = p.actor, y0 = a.baseY || 0, obj = buildRangeShot(G.P.r3d, R.st.shot || 'sack');
    a.face(p.pos.x, p.pos.z - 4); a.squash = 0.7;
    R.root.add(obj);
    R.shots.push({ p, obj, x: p.pos.x, y: y0 + 1.15, z: p.pos.z - 0.35, vy: 2.3, y0 });
    audio.sfx('swish', { volume: 0.4, pitch: rand(-2, 3) });
  },
  hit(G, R, s, b) {
    const P = G.P, st = R.st, p = b.p, y = s.y + 1;
    s.state = 'hit'; s.t = 0;
    if (s.kind === 'friend') {
      gain(R, p, -2);
      pop(G, s.x, y + 0.6, s.z, t(st.oops || 'Not that one! −2'), '#ff9a8a', true);
      audio.sfx('error', { volume: 0.5 }); audio.sfx(st.cry || 'cluck', { volume: 0.7 });
      fx(G, 'dust', s.x, y, s.z, 10, { color: '#fff7e6' });
      P.buzz(p, [70, 40, 70]); P.cam.shake = Math.max(P.cam.shake || 0, 0.18);
    } else {
      const gold = s.kind === 'gold', n = (R.hits.get(p) || 0) + 1;
      R.hits.set(p, n);
      gain(R, p, gold ? 3 : 1); R.mark = 0.25;
      pop(G, s.x, y + 0.6, s.z, gold ? '+3' : '+1', gold ? '#ffe08a' : p.color || '#fff7e6', gold);
      audio.sfx(gold ? 'coin' : 'whack', { volume: 0.6, pitch: gold ? 4 : Math.min(9, n * 0.5) });
      fx(G, gold ? 'sparkle' : 'dust', s.x, y, s.z, gold ? 16 : 8, { color: gold ? '#fff3a6' : st.puff || '#c9a2f0' });
      P.buzz(p, gold ? [30, 30, 60] : 25);
    }
    G.S.refreshCard();
  },
  near(G, R, p) {
    const st = R.st;
    return toss.here(G, R, p) ? { kind: 'secret', label: st.verb || 'Throw', hint: st.hint || '', use: () => this.throw(G, R, p) } : null;
  },
  // (each thrower’s line of fire, in their colour: who aims at what)
  draw(G, R, ctx, v) {
    if (R.state !== 'run') return;
    const P = G.P, st = R.st, z1 = st.at[1] - (st.rows || [2, 3.5, 5]).slice(-1)[0] - 0.4;
    for (const p of G.heroes()) {
      if (!toss.here(G, R, p)) continue;
      const a = P.toUi(v, p.pos.x, (p.actor.baseY || 0) + 0.1, st.at[1] - 0.5), b = P.toUi(v, p.pos.x, (p.actor.baseY || 0) + 0.1, z1);
      ctx.globalAlpha = (R.cool.get(p) || 0) > 0 ? 0.3 : 0.75;
      ctx.fillStyle = p.color || '#fff7e6';
      for (let y = a.y; y > b.y; y -= 6) ctx.fillRect(Math.round(a.x), Math.round(y), 1, 3);
      ctx.globalAlpha = 1;
    }
  },
});

// ------------------------------------------------------------------ the herd
const herd = round({
  time: 60, r: 8,
  count: (R, n) => Math.min(16, (R.st.n || 6) + (n - 1) * (R.st.per ?? 2)),
  goal: (G, R) => R.st.pen,             // (the arrow of the round points at the pen)
  ranks(G, R, n) { const N = this.count(R, n); return [Math.ceil(N * 0.5), N - 1, N + 3]; },
  build(G, R) {
    const st = R.st, [px, pz] = st.pen, col = G.P.world.overCol;
    R.pen = buildPen(G.P.r3d, st.penR || 2.4, st.gate ?? Math.PI); R.pen.position.set(px, G.y(px, pz), pz); R.root.add(R.pen);
    R.cols = R.pen.userData.cols.map((c) => ({ x: px + c.x, z: pz + c.z, r: c.r }));
    for (const c of R.cols) col.add(c);
    R.herd = []; R.rings = []; R.cool = new Map(); R.gold = null;
    R.ringGeo = new THREE.RingGeometry(0.86, 1, 28).rotateX(-Math.PI / 2);
    this.flock(G, R, this.count(R, Math.max(1, G.heroes().length)));
  },
  clear(G, R) { for (const c of R.cols) G.P.world.overCol.remove(c); R.ringGeo.dispose(); },
  // a spot out in the field, away from the pen and from everybody
  spot(G, R, edge = false) {
    const st = R.st, [cx, cz] = st.at, FR = st.r || 8, [px, pz] = st.pen, col = G.P.world.overCol;
    for (let i = 0; i < 60; i++) {
      const a = rand(0, Math.PI * 2), d = edge ? FR - 1.2 : rand(1, FR - 1.5), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d * 0.8;
      if (Math.hypot(x - px, z - pz) < (edge ? 8 : 5.5) || col.blocked(x, z, 0.4)) continue;
      if (!edge && G.heroes().some((p) => far(p, x, z) < 2.5)) continue;
      return { x, z };
    }
    return { x: cx, z: cz };
  },
  one(G, R, gold = false) {
    const s = this.spot(G, R, gold), obj = model(R.st.model, G.P.r3d);
    if (gold) gild(G.P.r3d, obj);
    R.root.add(obj);
    const a = { obj, x: s.x, z: s.z, vx: 0, vz: 0, f: rand(0, 6), home: false, gold, scare: 0, wait: rand(0, 3), tx: s.x, tz: s.z, ph: rand(0, 6) };
    R.herd.push(a);
    return a;
  },
  flock(G, R, n) {
    for (const a of R.herd) R.root.remove(a.obj);
    R.herd = []; R.gold = null;
    for (let i = 0; i < n; i++) this.one(G, R);
  },
  start(G, R) { this.flock(G, R, this.count(R, R.n)); for (const a of R.herd) fx(G, 'dust', a.x, 0.3, a.z, 3); },
  reset(G, R) { this.flock(G, R, this.count(R, R.n)); },
  home(G, R, a, p) {
    a.home = true; a.wait = 0;
    gain(R, p, a.gold ? 3 : 1); R.mark = 0.25;
    const y = G.y(a.x, a.z);
    pop(G, a.x, y + 1.5, a.z, a.gold ? '+3' : '+1', a.gold ? '#ffe08a' : (p && p.color) || '#fff7e6', a.gold);
    fx(G, 'sparkle', a.x, y + 0.8, a.z, a.gold ? 18 : 8, { color: a.gold ? '#fff3a6' : '#ffd66b' });
    fx(G, 'heart', a.x, y + 1.2, a.z, 1);
    audio.sfx(a.gold ? 'coin' : 'chime', { volume: 0.6, pitch: Math.min(12, R.score) });
    audio.sfx(R.st.cry || 'squeak', { volume: 0.5, pitch: rand(-9, -5) });
    if (p) G.P.buzz(p, a.gold ? [30, 30, 60] : 25);
    G.S.refreshCard();
    if (R.gold && R.herd.every((q) => q.home)) R.over = true;
  },
  anim(G, R, dt) {
    if (R.pen.userData.anim) R.pen.userData.anim(R.t);
    for (const a of R.herd) {
      const sp = Math.hypot(a.vx, a.vz), y = G.y(a.x, a.z);
      if (sp > 0.3) a.f += turn(Math.atan2(a.vx, a.vz) - a.f) * Math.min(1, dt * 10);
      a.obj.position.set(a.x, y + (sp > 1.2 ? Math.abs(Math.sin(R.t * 13 + a.ph)) * 0.16 : 0), a.z);
      a.obj.rotation.y = a.f;
      if (a.obj.userData.anim) a.obj.userData.anim(R.t + a.ph);
    }
    for (const g of R.rings) { g.t += dt; const k = g.t / 0.5; g.m.scale.setScalar(0.6 + k * 5.6); g.m.material.opacity = 0.6 * (1 - k); if (k >= 1) { R.root.remove(g.m); g.m.material.dispose(); g.gone = true; } }
    R.rings = R.rings.filter((g) => !g.gone);
    // (out of a round they graze, a step now and then)
    if (R.state !== 'run') for (const a of R.herd) this.graze(G, R, a, dt, a.home);
  },
  graze(G, R, a, dt, home) {
    const [px, pz] = R.st.pen, PR = (R.st.penR || 2.4) - 0.9;
    a.wait -= dt;
    if (a.wait <= 0) { a.wait = rand(1.5, 4); const an = rand(0, 6.28), d = rand(0.4, 1.2); a.tx = home ? px + Math.cos(an) * rand(0, PR) : a.x + Math.cos(an) * d; a.tz = home ? pz + Math.sin(an) * rand(0, PR) : a.z + Math.sin(an) * d; }
    const dx = a.tx - a.x, dz = a.tz - a.z, d = Math.hypot(dx, dz);
    if (d > 0.08 && (home || !G.P.world.overCol.blocked(a.tx, a.tz, 0.4))) { a.vx = (dx / d) * 0.7; a.vz = (dz / d) * 0.7; a.x += a.vx * dt; a.z += a.vz * dt; } else { a.vx = a.vz = 0; }
  },
  tick(G, R, dt, heroes) {
    const st = R.st, [cx, cz] = st.at, FR = st.r || 8, [px, pz] = st.pen, PR = st.penR || 2.4, gate = st.gate ?? Math.PI, time = st.time || 60;
    R.mark -= dt;
    for (const [p, c] of R.cool) R.cool.set(p, c - dt);
    // (half-way — or as soon as the others are all in: the golden one, quicker on its hooves)
    if (!R.gold && (R.left < time / 2 || R.herd.every((a) => a.home))) {
      R.gold = this.one(G, R, true);
      G.P.toast(t(st.goldText || 'A golden one! It counts for 3!'), '#f6c65b');
      fx(G, 'sparkle', R.gold.x, 1, R.gold.z, 18, { color: '#fff3a6' }); audio.sfx('shard', { volume: 0.6 });
    }
    const out = R.herd.filter((a) => !a.home);
    let mx = 0, mz = 0;
    for (const a of out) { mx += a.x; mz += a.z; }
    if (out.length) { mx /= out.length; mz /= out.length; }
    for (const a of R.herd) {
      if (a.home) { this.graze(G, R, a, dt, true); continue; }
      a.scare -= dt;
      let vx = 0, vz = 0, sp = 0, near = null, nd = 99;
      for (const p of heroes) { const d = far(p, a.x, a.z); if (d < nd) { nd = d; near = p; } }
      // away from whoever is near (a whistle: from further off, and faster)
      const F = a.scare > 0 ? 7 : 3.4;
      if (near && nd < F) { vx = (a.x - near.pos.x) / (nd || 1); vz = (a.z - near.pos.z) / (nd || 1); sp = (a.scare > 0 ? 4.6 : 2.3 + 1.5 * (1 - nd / F)) * (a.gold ? 1.25 : 1); }
      // …together, but not on each other’s hooves
      if (sp > 0 && out.length > 1) { const dx = mx - a.x, dz = mz - a.z, d = Math.hypot(dx, dz); if (d > 1.6) { vx += (dx / d) * 0.3; vz += (dz / d) * 0.3; } }
      for (const b of out) { if (b === a) continue; const dx = a.x - b.x, dz = a.z - b.z, d = Math.hypot(dx, dz); if (d < 0.85 && d > 0) { vx += (dx / d) * 0.9; vz += (dz / d) * 0.9; sp = Math.max(sp, 0.9); } }
      // the open gate draws them in once they are close to it
      const gx = px + Math.cos(gate) * (PR + 0.4), gz = pz + Math.sin(gate) * (PR + 0.4), gd = Math.hypot(gx - a.x, gz - a.z);
      if (gd < 2.4) { const d = Math.hypot(px - a.x, pz - a.z) || 1; vx += ((px - a.x) / d) * 1.6; vz += ((pz - a.z) / d) * 1.6; sp = Math.max(sp, 2.4); }
      // and the field keeps them
      const ex = a.x - cx, ez = a.z - cz, ed = Math.hypot(ex, ez);
      if (ed > FR - 0.8 && gd > 3.5) { vx -= (ex / ed) * 1.6; vz -= (ez / ed) * 1.6; sp = Math.max(sp, 1.6); }
      const l = Math.hypot(vx, vz), k = Math.min(1, dt * 7);
      if (l > 0.01 && sp > 0) { a.vx += ((vx / l) * sp - a.vx) * k; a.vz += ((vz / l) * sp - a.vz) * k; } else { a.vx *= 1 - k; a.vz *= 1 - k; }
      let nx = a.x + a.vx * dt, nz = a.z + a.vz * dt;
      // the fence: in by the gate only (they slide along the rails)
      const dn = Math.hypot(nx - px, nz - pz);
      if (dn < PR + 0.4 && dn > PR - 0.7) {
        const ang = Math.atan2(nz - pz, nx - px);
        if (Math.abs(turn(ang - gate)) > 0.5) { nx = px + Math.cos(ang) * (PR + 0.4); nz = pz + Math.sin(ang) * (PR + 0.4); }
      }
      if (!G.P.world.overCol.blocked(nx, nz, 0.25) || dn < PR + 1) { a.x = nx; a.z = nz; }
      if (Math.hypot(a.x - px, a.z - pz) < PR - 0.7) this.home(G, R, a, near);
    }
  },
  whistle(G, R, p) {
    if (R.state !== 'run' || (R.cool.get(p) || 0) > 0) return;
    R.cool.set(p, 1.4);
    const y = (p.actor.baseY || 0) + 0.06;
    const m = new THREE.Mesh(R.ringGeo, new THREE.MeshBasicMaterial({ color: p.color || '#fff7e6', transparent: true, opacity: 0.6, depthWrite: false }));
    m.position.set(p.pos.x, y, p.pos.z); m.renderOrder = 2; R.root.add(m); R.rings.push({ m, t: 0 });
    audio.sfx('whistle', { volume: 0.5, pitch: 7 });
    fx(G, 'note', p.pos.x, y + 1.9, p.pos.z, 2);
    let n = 0;
    for (const a of R.herd) if (!a.home && far(p, a.x, a.z) < 6.2) { a.scare = 0.9; n++; fx(G, 'dust', a.x, 0.3, a.z, 3); }
    if (n) audio.sfx(R.st.cry || 'squeak', { volume: 0.4, pitch: rand(-10, -6) });
    G.P.buzz(p, 20);
  },
  near(G, R, p) {
    const st = R.st;
    if (far(p, st.at[0], st.at[1]) > (st.r || 8) + 3) return null;
    return { kind: 'secret', label: st.verb || 'Whistle', hint: st.hint || '', use: () => this.whistle(G, R, p) };
  },
  // (an arrow over the gate: this way in)
  draw(G, R, ctx, v) {
    if (R.state !== 'run' && R.state !== 'card') return;
    const st = R.st, [px, pz] = st.pen, gate = st.gate ?? Math.PI, PR = st.penR || 2.4;
    const u = G.P.toUi(v, px + Math.cos(gate) * PR, G.y(px, pz) + 2.3, pz + Math.sin(gate) * PR), bob = Math.round(Math.sin(R.t * 5) * 2);
    drawText(ctx, '↓', u.x, u.y - 6 + bob, { color: '#ffd23a', align: 'center', scale: 2, outline: '#3b2a2e' });
  },
});

// ------------------------------------------------------------------ the rope
const WIN = 2.1, STEP = 0.72;
const tug = round({
  time: 60, r: 4.5, clock: true, team: true,
  ranks: (G, R, n) => ranksOf(R.st, n, [0, 22, 38], [0, -1, -1.5]),
  rankText: (G, R, i) => (i ? t('{s} s left', { s: R.rk[i] }) : t('win')),
  score: (G, R) => Math.floor(Math.max(0, R.left)),
  scoreText: (G, R, sc) => t('{s} s left', { s: sc }),
  build(G, R) {
    const st = R.st, [x0, z0] = st.at, y0 = G.y(x0, z0), K = kit(G.P.r3d), dir = st.side || 1;
    R.foe = model(st.foe, G.P.r3d); R.foe.rotation.y = st.yaw ?? (dir > 0 ? Math.PI : 0); R.root.add(R.foe);
    R.rope = K.noCast(K.put(R.root, K.box(1, 1, 1), K.c('#c8a878'), 0, 0, 0));
    R.flag = K.noCast(K.put(R.root, K.box(0.07, 0.4, 0.22), K.c('#e0483a'), 0, 0, 0));
    // the lines in the grass: the middle, yours (gold), the other one
    for (const [dx, c, w] of [[0, '#fff7e6', 0.1], [-WIN * dir, '#ffd23a', 0.16], [WIN * dir, '#b88cf0', 0.16]]) K.noCast(K.put(R.root, K.box(w, 0.03, 2.6), K.c(c), x0 + dx, y0 + 0.03, z0));
    Object.assign(R, { pos: 0, team: [], ps: new Map(), mode: 'idle', modeT: 0, jolt: 0, y0 });
    this.place(G, R);
  },
  // everything on the rope slides with it: the beast, the flag, the team
  place(G, R) {
    const st = R.st, [x0, z0] = st.at, dir = st.side || 1, sh = -R.pos * WIN * dir, n = Math.max(1, R.team.length), y = R.y0 + (st.ropeY || 1);
    const fx0 = x0 + dir * (st.foeAt || 2.9) + sh, tail = x0 - dir * (1.3 + n * STEP) + sh, head = fx0 - dir * (st.foeHalf || 1);
    R.foe.position.set(fx0, R.y0, z0);
    R.rope.position.set((tail + head) / 2, y - Math.abs(R.jolt) * 0.03, z0); R.rope.scale.set(Math.abs(head - tail), 0.09, 0.09);
    R.flag.position.set(x0 + sh, y - 0.2, z0);
    return (i) => ({ x: x0 - dir * (1.5 + i * STEP) + sh, z: z0 + (i % 2 ? 0.17 : -0.17) });
  },
  start(G, R, heroes) {
    const st = R.st;
    Object.assign(R, { pos: 0, mode: 'pull', modeT: rand(4, 6), ps: new Map(), jolt: 0, pulls: 0 });
    R.team = heroes.filter((p) => far(p, st.at[0], st.at[1]) < (st.r || 4.5) + 3).sort((a, b) => (a.pos.x - b.pos.x) * -(st.side || 1));
  },
  free(G, R) { for (const p of R.team) if (p.actor) { p.actor.lean = 0; p.actor.lock = 0; } },
  stop(G, R) {
    this.free(G, R);
    if (R.state === 'run') {
      R.mode = R.lost ? 'won' : 'lost';
      // (the rope let go: the winners jump for joy — or everybody lands in the dust)
      for (const p of R.team) { if (!R.lost) p.actor.jumpV = 4.6; else fx(G, 'dust', p.pos.x, 0.2, p.pos.z, 8); }
      if (R.lost) audio.sfx('thud', { volume: 0.7 });
    }
    R.team = [];
  },
  reset(G, R) { R.pos = 0; R.mode = 'idle'; this.place(G, R); },
  botScore(G, R) { R.pos = 1; R.left = R.rk[1] + 4; R.lost = false; R.over = true; },
  anim(G, R, dt) {
    R.jolt *= 1 - Math.min(1, dt * 9);
    if (R.foe.userData.anim) R.foe.userData.anim(R.t, R.mode === 'warn' ? 'pull' : R.mode);
    // (after the round it slides back to the middle)
    if (R.state !== 'run' && R.state !== 'result' && Math.abs(R.pos) > 0.01) R.pos *= 1 - Math.min(1, dt * 3);
    this.place(G, R);
  },
  tick(G, R, dt, heroes) {
    const st = R.st, [x0, z0] = st.at, dir = st.side || 1, time = st.time || 60, P = G.P;
    // whoever comes close takes the rope; whoever is gone lets go
    for (const p of heroes) if (!R.team.includes(p) && far(p, x0, z0) < (st.r || 4.5)) R.team.push(p);
    // (…or was taken elsewhere: « Rejoin », a knock-out — the rope does not pull anybody back)
    R.team = R.team.filter((p) => { const s = R.ps.get(p); return heroes.includes(p) && !(p.fighter && p.fighter.down) && (!s || !s.at || far(p, s.at.x, s.at.z) < 2.5); });
    const n = Math.max(1, R.team.length);
    // the beast: it pulls, it warns, it digs in
    R.modeT -= dt;
    if (R.modeT <= 0) {
      if (R.mode === 'pull') { R.mode = 'warn'; R.modeT = 0.65; audio.sfx(st.cry || 'honk', { volume: 0.8, pitch: st.cryPitch ?? -12 }); }
      else if (R.mode === 'warn') { R.mode = 'dig'; R.modeT = rand(1.3, 2.1); audio.sfx('thud', { volume: 0.6 }); fx(G, 'dust', R.foe.position.x, R.y0 + 0.2, z0, 10); P.cam.shake = Math.max(P.cam.shake || 0, 0.15); for (const p of R.team) P.buzz(p, 80); }
      else { R.mode = 'pull'; R.modeT = rand(3.4, 6.2) * Math.max(0.8, R.left / time + 0.3); audio.sfx('go', { volume: 0.5 }); }
    }
    if (R.mode !== 'dig') R.pos -= (st.drag || 0.015) * (1 + 0.4 * (1 - R.left / time)) * dt;
    const slot = this.place(G, R);
    R.team.forEach((p, i) => {
      const a = p.actor, s = R.ps.get(p) || R.ps.set(p, { stun: 0, last: -9, lean: 0, n: 0 }).get(p), at = slot(i);
      s.stun -= dt; s.lean = Math.max(0, s.lean - dt * 6); s.at = at;
      a.lock = 0.2; a.pos.x = at.x; a.pos.z = at.z;
      a.dir = { x: dir, z: 0 }; a.model.targetFacing = Math.atan2(dir, 0);
      a.lean = s.stun > 0 ? 0.5 : -(0.14 + s.lean * 0.3);
    });
    if (R.pos >= 1) { R.over = true; audio.sfx('cheer', { volume: 0.7 }); }
    else if (R.pos <= -1) { R.over = true; R.lost = true; }
  },
  pull(G, R, p) {
    const s = R.ps.get(p), P = G.P, n = Math.max(1, R.team.length);
    if (R.state !== 'run' || !s || s.stun > 0) return;
    if (R.mode === 'dig') {
      // (a pull against four hooves in the ground: a slip)
      s.stun = 0.7; R.pos -= 0.05 / n; R.jolt = -1;
      pop(G, p.pos.x, (p.actor.baseY || 0) + 2.3, p.pos.z, t('Slip!'), '#ff9a8a', true);
      audio.sfx('boing', { volume: 0.6, pitch: -4 }); fx(G, 'dust', p.pos.x, 0.2, p.pos.z, 6);
      P.buzz(p, [60, 30, 60]);
      return;
    }
    // (a blur of presses pulls no harder than a steady hand)
    const gap = R.t - s.last; s.last = R.t;
    R.pos += ((R.st.gain || 0.019) * Math.min(1, Math.max(0.35, gap / 0.14))) / n;
    s.lean = 1; s.n++; R.jolt = 1; R.pulls++;
    audio.sfx('step', { volume: 0.35, pitch: Math.min(8, R.pos * 8) });
    if (s.n % 4 === 0) { fx(G, 'dust', p.pos.x, 0.15, p.pos.z, 3); P.buzz(p, 15); }
    if (R.pulls % (5 + n * 2) === 0) pop(G, p.pos.x, (p.actor.baseY || 0) + 2.2, p.pos.z, t('Heave!'), p.color || '#fff7e6');
  },
  near(G, R, p) {
    const st = R.st;
    if (!R.team.includes(p)) return null;
    return { kind: 'secret', label: R.mode === 'dig' ? 'Wait…' : 'PULL!', hint: st.hint || '', use: () => this.pull(G, R, p) };
  },
  // the word of the moment, and the rope as a line: your side in gold
  hud(G, R, ctx, W, H) {
    const dig = R.mode === 'dig', warn = R.mode === 'warn', word = dig ? t('STOP!') : warn ? t('Careful…') : t('PULL!');
    if (R.goT <= 0) drawText(ctx, word, W / 2, Math.round(H * 0.3), { color: dig ? '#ff7a6a' : warn ? '#ffe08a' : '#8fd67a', align: 'center', scale: dig ? 3 : 2, outline: '#241a2e' });
  },
  hudSide(G, R, ctx, x, y, w) {
    const mid = x + w / 2, half = w / 2 - 4, px = Math.round(mid - R.pos * half * (R.st.side || 1));
    ctx.fillStyle = '#c8a878'; ctx.fillRect(x, y + 9, w, 2);
    ctx.fillStyle = '#fff7e6'; ctx.fillRect(Math.round(mid), y + 5, 1, 10);
    const mine = (R.st.side || 1) > 0 ? x + 2 : x + w - 4, its = (R.st.side || 1) > 0 ? x + w - 4 : x + 2;
    ctx.fillStyle = '#ffd23a'; ctx.fillRect(mine, y + 3, 2, 14);
    ctx.fillStyle = '#b88cf0'; ctx.fillRect(its, y + 3, 2, 14);
    ctx.fillStyle = '#e0483a'; ctx.fillRect(px - 2, y + 2, 4, 9); ctx.fillStyle = '#fff7e6'; ctx.fillRect(px - 1, y + 2, 1, 16);
  },
  // (a ! over the beast as it gathers itself)
  draw(G, R, ctx, v) {
    if (R.state !== 'run' || R.mode === 'pull') return;
    const u = G.P.toUi(v, R.foe.position.x, R.y0 + (R.st.foeH || 2.3), R.st.at[1]);
    drawText(ctx, '!', u.x, u.y - 8 + Math.round(Math.sin(R.t * 20) * 1.5), { color: R.mode === 'dig' ? '#ff7a6a' : '#ffe08a', align: 'center', scale: 2, outline: '#3b2a2e' });
  },
});

// ------------------------------------------------------------------ the orders
const cook = round({
  time: 60, r: 8, team: true,
  // (more hands, longer skewers — and past six, the stall itself is the limit)
  ranks: (G, R, n) => ranksOf(R.st, Math.min(n, 6), [3, 5, 8], [0.5, 1, 1.4]),
  len: (n) => 3 + (n >= 3 ? 1 : 0) + (n >= 6 ? 1 : 0),
  cols: (R) => R.st.colors || DANGO,
  build(G, R) {
    const st = R.st, r3d = G.P.r3d, [x0, z0] = st.at, col = G.P.world.overCol, C = this.cols(R);
    R.stall = buildDangoStall(r3d); R.stall.position.set(x0, G.y(x0, z0), z0); R.root.add(R.stall);
    R.blocks = [{ x: x0 - 0.7, z: z0, r: 0.55 }, { x: x0 + 0.7, z: z0, r: 0.55 }];
    R.crates = st.crates.map(([x, z], k) => {
      const obj = buildDangoCrate(r3d, C[k % C.length]);
      obj.position.set(x, G.y(x, z), z); R.root.add(obj);
      R.blocks.push({ x, z, r: 0.55 });
      return { k: k % C.length, x, z, obj };
    });
    for (const c of R.blocks) col.add(c);
    Object.assign(R, { held: new Map(), order: [], next: [], fill: 0, len: 3, doneT: 0 });
  },
  clear(G, R) { for (const c of R.blocks) G.P.world.overCol.remove(c); this.drop(G, R); },
  drop(G, R) { for (const h of R.held.values()) R.root.remove(h.obj); R.held.clear(); },
  // an order: no colour more than half of it
  roll(R) {
    const n = this.cols(R).length, most = Math.ceil(R.len / 2);
    for (;;) { const o = Array.from({ length: R.len }, () => Math.floor(Math.random() * n)); if (o.every((k) => o.filter((q) => q === k).length <= most)) return o; }
  },
  show(G, R) { const C = this.cols(R); R.stall.userData.show(R.order.slice(0, R.fill).map((k) => C[k]), R.len); },
  start(G, R) { this.drop(G, R); R.len = this.len(R.n); R.order = this.roll(R); R.next = this.roll(R); R.fill = 0; R.doneT = 0; this.show(G, R); },
  stop(G, R) { this.drop(G, R); },
  reset(G, R) { R.order = []; R.fill = 0; this.show(G, R); },
  anim(G, R) {
    for (const c of R.crates) if (c.obj.userData.anim) c.obj.userData.anim(R.t + c.k);
    for (const [p, h] of R.held) {
      if (!G.heroes().includes(p)) { R.root.remove(h.obj); R.held.delete(p); continue; }
      h.obj.position.set(p.pos.x, (p.actor.baseY || 0) + (p.actor.jumpY || 0) + 1.95 + Math.sin(R.t * 6 + p.slot) * 0.04, p.pos.z);
    }
  },
  tick(G, R, dt) {
    R.mark -= dt;
    // (a skewer done: a beat to look at it, then the next order)
    if (R.doneT > 0 && (R.doneT -= dt) <= 0) { R.order = R.next; R.next = this.roll(R); R.fill = 0; this.show(G, R); audio.sfx('page', { volume: 0.4 }); }
  },
  take(G, R, p, c) {
    if (R.state !== 'run') return;
    const was = R.held.get(p);
    if (was) R.root.remove(was.obj);
    const obj = buildDango(G.P.r3d, this.cols(R)[c.k], 0.24);
    R.root.add(obj); R.held.set(p, { k: c.k, obj });
    audio.sfx('pickup', { volume: 0.5, pitch: c.k * 3 });
    fx(G, 'dust', c.x, 0.9, c.z, 3, { color: this.cols(R)[c.k] });
  },
  put(G, R, p) {
    const h = R.held.get(p), st = R.st, P = G.P, [x0, z0] = st.at, y = G.y(x0, z0);
    if (R.state !== 'run' || !h || R.doneT > 0) return;
    if (h.k !== R.order[R.fill]) {
      // (not the next one: it stays in hand — somebody else’s turn first)
      pop(G, p.pos.x, (p.actor.baseY || 0) + 2.5, p.pos.z, t(st.wrong || 'Not that one yet!'), '#ff9a8a');
      audio.sfx('error', { volume: 0.4 }); P.buzz(p, [50, 30, 50]);
      return;
    }
    R.root.remove(h.obj); R.held.delete(p);
    R.fill++; R.by.set(p, (R.by.get(p) || 0) + 1);
    this.show(G, R);
    audio.sfx('tone', { volume: 0.6, pitch: [0, 4, 7, 12, 16][R.fill - 1] });
    fx(G, 'sparkle', x0, y + 1.3, z0, 6, { color: this.cols(R)[h.k] });
    P.buzz(p, 20);
    if (R.fill >= R.len) {
      R.score++; R.mark = 0.3; R.doneT = 0.45;
      pop(G, x0, y + 2.4, z0, '+1', '#ffe08a', true);
      audio.sfx('coin', { volume: 0.6 }); audio.sfx('chime', { volume: 0.5, pitch: 7 });
      fx(G, 'sparkle', x0, y + 1.4, z0, 16, { color: '#fff3a6' });
      G.S.refreshCard();
    }
  },
  near(G, R, p) {
    const st = R.st, h = R.held.get(p);
    const c = R.crates.find((q) => far(p, q.x, q.z) < 1.5);
    if (c && (!h || h.k !== c.k)) return { kind: 'secret', label: st.verb || 'Take', hint: st.hint || '', use: () => this.take(G, R, p, c) };
    if (h && far(p, st.at[0], st.at[1]) < 2.1) return { kind: 'secret', label: st.putVerb || 'Put', hint: st.hint || '', use: () => this.put(G, R, p) };
    return null;
  },
  // the order, big, under the round’s board: what is on, what comes next — and the one after
  hud(G, R, ctx, W, H, box) {
    const C = this.cols(R), n = R.len, s = n > 4 ? 10 : 13, w = n * (s + 3) + 3, x = box.x + 6, y = box.y + box.h + 3;
    if (!R.order.length) return;
    sheet(ctx, box.x, y, box.w, 21);
    R.order.forEach((k, i) => {
      const bx = x + 2 + i * (s + 3), by = y + 4 + ((13 - s) >> 1), now = i === R.fill && R.doneT <= 0;
      if (now) { ctx.fillStyle = Math.floor(R.t * 5) % 2 ? '#ffe08a' : '#fff7e6'; ctx.fillRect(bx - 2, by - 2, s + 4, s + 4); }
      ctx.fillStyle = '#241a2e'; ctx.fillRect(bx - 1, by - 1, s + 2, s + 2);
      ctx.fillStyle = C[k]; ctx.fillRect(bx + 2, by, s - 4, s); ctx.fillRect(bx, by + 2, s, s - 4); ctx.fillRect(bx + 1, by + 1, s - 2, s - 2);
      if (i < R.fill) { ctx.fillStyle = '#241a2e'; ctx.fillRect(bx + 3, by + 6, 2, 2); ctx.fillRect(bx + 5, by + 8, 2, 2); ctx.fillRect(bx + 7, by + 6, 2, 2); ctx.fillRect(bx + 9, by + 4, 2, 2); }
    });
    // (the next order, small: fetch ahead)
    const px = box.x + box.w - 6 - n * 8;
    ctx.fillStyle = '#b9a2e3'; for (let i = 0; i < 3; i++) ctx.fillRect(px - 8 + i, y + 7 + i, 1, 6 - i * 2);
    R.next.forEach((k, i) => { ctx.fillStyle = '#241a2e'; ctx.fillRect(px + i * 8, y + 6, 8, 8); ctx.fillStyle = C[k]; ctx.fillRect(px + 1 + i * 8, y + 7, 6, 6); });
  },
  // (an arrow over the crate the skewer waits for — or over the stall, for whoever carries it)
  draw(G, R, ctx, v) {
    if (R.state !== 'run' || R.doneT > 0) return;
    const want = R.order[R.fill], P = G.P, c = R.crates.find((q) => q.k === want), bob = Math.round(Math.sin(R.t * 5) * 2);
    const ready = [...R.held.values()].some((h) => h.k === want), tg = ready ? { x: R.st.at[0], z: R.st.at[1], h: 2.9 } : c && { x: c.x, z: c.z, h: 1.9 };
    if (!tg) return;
    const u = P.toUi(v, tg.x, G.y(tg.x, tg.z) + tg.h, tg.z);
    drawText(ctx, '↓', u.x, u.y - 6 + bob, { color: this.cols(R)[want], align: 'center', scale: 2, outline: '#3b2a2e' });
  },
});

export const GAMES12 = { toss, herd, tug, cook };
