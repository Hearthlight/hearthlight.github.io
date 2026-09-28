// World v7: a whole chapter (or several) played by the bots, in the background — for the
// browser pane, whose scripts time out after 45 s. Start it and poll `window.__ap`:
//   (await import('/tools/sagarun.js')).start('party', 4, [6], 'ranger', { debut: 'shot_debut' })
//   window.__ap  → 'run' · 'progress {…}' (after each chapter) · 'done {…}' · 'err …'
// `marks` maps a scene's `st.mark(name)` (or 'room:<id>') to a screenshot name.

export async function run(mode, n, chs = [1], cls = 'ranger', marks = {}) {
  const V = window.V = await import('/tools/sagatest.js?' + Date.now());
  const res = { mode, n, ch: {} };
  const t0 = performance.now();
  if (mode === 'solo') await V.solo(cls);
  else {
    await V.ready(); V.watchErrors();
    const T = window.T = await import('/tools/partybots.js?' + Date.now());
    await T.boot(n); await T.autoplay('saga', [], { until: () => true });
  }
  const S = V.saga();
  const { QUESTS } = await import('/src/saga/chapters/index.js');
  for (const ch of chs) {
    await V.toChapter(ch);
    // (chapter 1’s first quest is started by the story itself)
    if (ch === 1 && !S.st.q.c1_intro) S.start('c1_intro');
    const log = []; window.__log = log;
    const all = Object.entries(QUESTS).filter(([, Q]) => Q.ch === ch).map(([id]) => id);
    // (a choice's other branch never happens)
    const want = () => all.filter((id) => !(id === 'c5_mirage_buy' && S.has('mirageReported')) && !(id === 'c5_mirage_tell' && S.has('mirageBought')));
    // (a mini-game to play again counts once it has been played)
    const fin = (id) => (QUESTS[id].repeat ? S.plays(id) > 0 : S.done(id));
    await V.autoplay({ side: true, maxSteps: 700, log, marks, prefer: (id) => QUESTS[id] && QUESTS[id].ch === ch && !(QUESTS[id].repeat && S.plays(id) > 0), until: () => want().every(fin) });
    res.ch[ch] = { done: want().filter(fin).length, of: want().length, missing: want().filter((id) => !fin(id)), tail: log.slice(-3) };
    window.__ap = 'progress ' + JSON.stringify(res);
  }
  res.errs = V.errs();
  res.min = +((performance.now() - t0) / 60000).toFixed(1);
  return res;
}

export function start(...args) {
  window.__ap = 'run';
  run(...args).then((r) => { window.__ap = 'done ' + JSON.stringify(r); }).catch((e) => { window.__ap = 'err ' + e + ' ' + String(e && e.stack || '').slice(0, 400); });
  return 'started';
}
