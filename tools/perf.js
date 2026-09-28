// Frame times in Party Mode, for the browser pane (its scripts time out after 45 s):
//   (await import('/tools/perf.js')).start(8, 'apart')   // poll window.__pf
// n bots in the Adventure, then 'apart' (each in a land of their own: n views), 'apart4' (four
// lands) or 'together' (one view); frames stepped by hand, update and draw timed apart, draw calls
// counted.

const g = () => window.game;
const D = () => window.game.debug;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// (a spot in eight different lands of the Hearthlands)
const LANDS = [[-60, 55], [-200, 40], [60, -92], [120, -18], [300, 60], [250, -95], [-130, -70], [-40, 15]];

export async function measure(frames = 240) {
  const P = g().party, r = P.r3d.renderer;
  const up = P.update.bind(P), dr = P.draw.bind(P);
  let tu = 0, td = 0, calls = 0, tris = 0, n = 0;
  P.update = (dt) => { const t0 = performance.now(); const res = up(dt); tu += performance.now() - t0; return res; };
  P.draw = () => { r.info.reset(); const t0 = performance.now(); const res = dr(); td += performance.now() - t0; calls += r.info.render.calls; tris += r.info.render.triangles; n++; return res; };
  r.info.autoReset = false;
  const t0 = performance.now();
  for (let f = 0; f < frames; f += 10) { await D().step(10); if (f % 60 === 0) await sleep(1); }
  const total = performance.now() - t0;
  P.update = up; P.draw = dr; delete P.update; delete P.draw;
  r.info.autoReset = true;
  return { frame: +(total / frames).toFixed(2), update: +(tu / frames).toFixed(2), draw: +(td / Math.max(1, n)).toFixed(2), calls: Math.round(calls / Math.max(1, n)), tris: Math.round(tris / Math.max(1, n)), views: P.cam.views.length };
}

export async function run(n = 8, how = 'apart', frames = 240) {
  const T = window.T = await import('/tools/partybots.js?' + Date.now());
  if (!(g().party && g().party.players.length >= n)) {
    for (let i = 0; i < 80 && !(g() && g().world && g().world.overCol); i++) await sleep(250);
    await T.boot(n);
    T.mode('explore');
    for (let i = 0; i < 40; i++) { await sleep(30); await D().step(10); }
    await T.skipTalk(20);
  }
  const P = g().party;
  P.players.forEach((p, i) => {
    // ('apart': a land each · 'apart4': four lands, two by two · 'together': one view)
    const k = how === 'apart' ? i : how === 'apart4' ? i % 4 : 0, [lx, lz] = LANDS[k % LANDS.length];
    const x = lx + (i % 2) * 0.8, z = lz + (how === 'together' ? Math.floor(i / 2) * 0.8 : 0);
    p.actor.pos = { x, z };
  });
  P.cam.snap(P.camPlayers());
  // (let the paint workers answer and the chunks' scatter build)
  for (let i = 0; i < 40; i++) { await sleep(60); await D().step(3); }
  return measure(frames);
}

export function start(...args) {
  window.__pf = 'run';
  run(...args).then((r) => { window.__pf = 'done ' + JSON.stringify(r); }).catch((e) => { window.__pf = 'err ' + e + ' ' + String(e && e.stack || '').slice(0, 400); });
  return 'started';
}
