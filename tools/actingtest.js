// The story’s scenes as frame strips, for the browser pane (acting is judged from pictures):
//   const A = await import('/tools/actingtest.js');
//   A.rec({ tag: 'ch1' });               // every scene played from now on is saved as a strip
//   A.start('party', 4, [1]);            // a chapter played by the bots (tools/sagarun.js), strips on
//   A.gallery();                         // every gesture of the vocabulary, on one sheet
//   A.skipTest('party', 4, [1]);         // each scene skipped at each of its pages: what is left behind
// A strip: `screenshots/act-<tag>-<n>-<first words>.png`, a grid of frames (the middle of the
// picture, twice its size) with the second and the line on screen under each. Frames where a
// gesture is at its height are kept first (`window.__actMark`, set by saga/acting.js), the
// others are spread evenly. Poll `window.__ap` (the chapter) and `window.__strips` (their names).

const g = () => window.game;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const VILLAINS = /^(duchess|gloria|crumble|m?minnow|m?fidget|m?brick)$/;
const stageOf = () => (g().mode === 'party' ? g().party && g().party.stage : g().world.wild && g().world.wild.stage);
const dlgOf = () => (g().mode === 'party' ? g().party.dialogue : g().dialogue);

let R = null;

// a piece of the picture (crop in the UI’s pixels), the world’s own pixels k times their size
// (Party Mode draws the world finer than the UI: the two canvases cover the same screen)
function grab(crop, k) {
  const d = g().display, [cx, cy, cw, ch] = crop;
  const sw = d.worldCanvas.width / d.w, su = d.canvas.width / d.w;
  const c = document.createElement('canvas');
  c.width = Math.round(cw * sw * k); c.height = Math.round(ch * sw * k);
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.drawImage(d.worldCanvas, cx * sw, cy * sw, cw * sw, ch * sw, 0, 0, c.width, c.height);
  x.drawImage(d.canvas, cx * su, cy * su, cw * su, ch * su, 0, 0, c.width, c.height);
  return c;
}

async function post(name, cells, cols) {
  if (!cells.length) return;
  const cw = cells[0].cv.width, ch = cells[0].cv.height, cap = 13, rows = Math.ceil(cells.length / cols);
  const out = document.createElement('canvas');
  out.width = cols * cw; out.height = rows * (ch + cap);
  const x = out.getContext('2d');
  x.fillStyle = '#16101c'; x.fillRect(0, 0, out.width, out.height);
  x.font = '10px monospace'; x.textBaseline = 'top';
  cells.forEach((c, i) => {
    const px = (i % cols) * cw, py = Math.floor(i / cols) * (ch + cap);
    x.drawImage(c.cv, px, py);
    x.fillStyle = c.mark ? '#ffd66b' : '#b9a2e3';
    x.fillText(`${c.t.toFixed(1)}s ${c.mark ? '[' + c.mark + '] ' : ''}${c.line}`.slice(0, Math.floor(cw / 6.1)), px + 2, py + ch + 1);
  });
  const blob = await new Promise((res) => out.toBlob(res, 'image/png'));
  await fetch('/__shot?name=' + encodeURIComponent(name), { method: 'POST', body: blob });
  (window.__strips = window.__strips || []).push(name);
}

// record every scene from now on (opts: tag, max frames a strip, cols, crop [x, y, w, h] in
// screen pixels, scale, all: scenes without a villain too, every: frames between two candidates)
export function rec(opts = {}) {
  const G = g();
  if (R) { Object.assign(R.o, opts); R.n = opts.n || 0; return R; }
  R = { o: { tag: 'x', max: 9, cols: 3, crop: [160, 54, 192, 136], scale: 2, all: false, every: 12, ...opts }, n: 0, cur: null, frame: G.frame.bind(G) };
  G.frame = (dt) => {
    R.frame(dt);
    const st = stageOf(), o = R.o;
    if (!st) return;
    if (st.active && !st.skipping) {
      if (!R.cur) R.cur = { t: 0, f: 0, cells: [], villain: false, first: '' };
      const S = R.cur, c = dlgOf().cur;
      S.t += dt; S.f++;
      if (c && VILLAINS.test(c.who)) S.villain = true;
      for (const id of st.actors.keys()) if (VILLAINS.test(id)) S.villain = true;
      const line = c ? (c.who + ': ' + c.lines.join(' ').replace(/\{[^}]*\}/g, '')) : '';
      if (c && !S.first && c.who !== 'narrator') S.first = c.lines.join(' ').replace(/\{[^}]*\}/g, '').replace(/[^A-Za-z ]/g, '').trim().split(/\s+/).slice(0, 3).join('-').toLowerCase();
      const mark = window.__actMark || null;
      window.__actMark = null;
      if (mark || S.f % o.every === 0) S.cells.push({ cv: grab(o.crop, o.scale), t: S.t, line, mark });
      if (S.cells.length > 400) S.cells = S.cells.filter((q, i) => q.mark || i % 2 === 0);
    } else if (R.cur) {
      const S = R.cur; R.cur = null;
      if (!S.villain && !o.all) return;
      // (the gestures’ frames first — one a gesture, the same one twice running dropped — then the rest evenly)
      const marked = S.cells.filter((q, i, a) => q.mark && !a.slice(Math.max(0, i - 6), i).some((p) => p.mark === q.mark));
      let pick = marked.length > o.max ? marked.filter((q, i) => Math.floor(i * o.max / marked.length) !== Math.floor((i - 1) * o.max / marked.length)) : marked.slice();
      const plain = S.cells.filter((q) => !q.mark), need = o.max - pick.length;
      for (let i = 0; i < need && plain.length; i++) pick.push(plain[Math.min(plain.length - 1, Math.floor((i + 0.5) * plain.length / need))]);
      pick = [...new Set(pick)].sort((a, b) => a.t - b.t);
      const name = `act-${o.tag}-${String(++R.n).padStart(2, '0')}-${S.first || 'scene'}`;
      (window.__scenes = window.__scenes || []).push({ name, sec: +S.t.toFixed(1), marks: marked.length });
      post(name, pick, o.cols);
    }
  };
  return R;
}
export function stop() { if (R) { g().frame = R.frame; R = null; } }

// a chapter played by the bots with the strips on (mode 'party' | 'solo')
export async function start(mode = 'party', n = 4, chs = [1], opts = {}) {
  const SR = await import('/tools/sagarun.js?' + Date.now());
  window.__strips = []; window.__scenes = [];
  rec({ ...opts, tag: (opts.tag || '') + 'ch' + chs.join('_') + (mode === 'solo' ? 's' : 'p' + n) });
  return SR.start(mode, n, chs, opts.cls || 'knight');
}

// every gesture on one sheet: an actor on the plaza plays them one by one (the frame at each one’s height)
export async function gallery(who = 'minnow', names = null, opts = {}) {
  const st = stageOf(), D = g().debug, cells = [], o = { crop: [214, 78, 84, 92], scale: 2, cols: 9, at: [84.5, 94], ...opts };
  // (an open stretch of the beach, in solo)
  if (g().mode !== 'party' && o.at) { D.tp(o.at[0], o.at[1]); await D.step(20, 1 / 60); }
  const { GESTURES } = await import('/src/saga/acting.js');
  window.__gal = 'run';
  const list = names || Object.keys(GESTURES);
  const done = st.play(async (s) => {
    const P = s.P, hp = P.players[0].pos, x = hp.x + 3, z = hp.z + 1;
    s.actor(who, x, z, { face: { x: opts.fx || 0, z: opts.fz === undefined ? 1 : opts.fz } });
    await s.cam(x, z - 0.2, { dur: 0, ppu: (opts.ppu || 2) * s.basePpu() });
    s.bars(false);
    await s.wait(0.6);
    for (const name of list) {
      window.__actMark = null;
      const p = s.act.play(who, name);
      let got = null;
      for (let f = 0; f < 240 && !got; f++) { await s.wait(1 / 60); if (window.__actMark) got = grab(o.crop, o.scale); }
      for (let f = 0; f < 20 && !got; f++) await s.wait(1 / 60);
      cells.push({ cv: got || grab(o.crop, o.scale), t: 0, line: name, mark: null });
      s.act.rest(who); await p; await s.wait(0.25);
    }
  }, { noSkip: true });
  for (let k = 0; k < 4000 && st.active; k++) { await D.step(4, 1 / 60); if (k % 30 === 0) await sleep(1); }
  await done;
  await post('act-gallery-' + who + (opts.tag || ''), cells, o.cols);
  window.__gal = 'done ' + cells.length;
}

// the state a scene leaves behind: who is still there, how they stand, the props, the light
export function snapshot() {
  const P = g().mode === 'party' ? g().party : g().world.wild, st = P.stage, L = P.lighting;
  const r = (v) => Math.round(v * 100) / 100;
  return JSON.stringify({
    npcs: (P.npcs || []).map((n) => [n.id, r(n.pos.x), r(n.pos.z), n.hidden ? 'h' : '', n.seatY === undefined ? '' : r(n.seatY), n.pose ? 'POSE' : '', n.forceExpr || '', r(n.model.body.rotation.x), r(n.model.body.rotation.z)].join(',')).sort(),
    heroes: P.players.map((p) => [r(p.actor.pos.x), r(p.actor.pos.z), p.actor.pose ? 'POSE' : '', p.hidden ? 'h' : ''].join(',')),
    props: [...st.props.keys()].sort(), acts: st.act ? st.act.left() : null,
    light: L ? [r(L.gloom), r(L.sepia), L.sources.filter((s) => s.stage).length] : null,
    cam: [st.cv ? 1 : 0, st.active ? 1 : 0],
  });
}

// Each scene named (a quest step’s `run`, by its function’s name) played to its end, then again
// and skipped at its first line, its middle one and its last (`points: 'all'`: at every line):
// what a skipped scene leaves behind must be what a watched one leaves — poll `window.__sk`
export async function skipTest(names, { points = 3 } = {}) {
  const V = await import('/tools/sagatest.js'), S = V.saga(), P = S.P, st = V.stage(), D = g().debug;
  const { CHAPTERS } = await import('/src/saga/chapters/index.js');
  const find = (name) => { for (const C of CHAPTERS) for (const Q of Object.values(C.quests)) for (const s of Q.steps) if (s.run && s.run.name === name) return s.run; return null; };
  const press = () => { if (g().mode === 'party') P.dialogue.skip(); else D.key('KeyE', 2); };
  const out = {};
  window.__sk = 'run';
  // (play the scene; at its k-th line, skip it — k < 0: never)
  const runTo = async (fn, k) => {
    let lines = 0, last = null;
    const p = fn(S);
    for (let f = 0; f < 30000; f++) {
      await D.step(4, 1 / 60);
      if (f % 25 === 0) await sleep(1);
      const d = dlgOf(), c = d.cur;
      if (c && c !== last) { last = c; if (lines++ === k) st.skip(); }
      if (c && c.shown >= c.total && !c.choices) press();
      if (d.letter && d.letter.t > 1) press();
      if (!st.active && !d.cur && f > 10) break;
    }
    await p;
    // (the saga puts the chapter’s own folk back in their places in its own time)
    for (let k = 0; k < 6; k++) { await D.step(30, 1 / 60); await sleep(1); }
    return { snap: snapshot(), lines };
  };
  const diff = (a, b) => { const A = JSON.parse(a), B = JSON.parse(b), o = []; for (const k of Object.keys(A)) if (JSON.stringify(A[k]) !== JSON.stringify(B[k])) o.push(k + ': ' + JSON.stringify(A[k]).slice(0, 160) + ' ≠ ' + JSON.stringify(B[k]).slice(0, 160)); return o; };
  for (const name of names) {
    const fn = find(name);
    if (!fn) { out[name] = 'not found'; continue; }
    try {
      const base = await runTo(fn, -1);
      const ks = points === 'all' ? [...Array(base.lines).keys()] : [...new Set([0, Math.floor(base.lines / 2), base.lines - 1])];
      const bad = [];
      for (const k of ks) { const r = await runTo(fn, k); if (r.snap !== base.snap) bad.push({ k, diff: diff(base.snap, r.snap) }); }
      out[name] = { lines: base.lines, tried: ks.length, bad };
    } catch (e) { out[name] = 'err ' + e; }
    window.__sk = 'progress ' + JSON.stringify(out);
  }
  out.errs = (window.__errs || []).slice(-8);
  window.__sk = 'done ' + JSON.stringify(out);
}
