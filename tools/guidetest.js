// The guide (src/party/guide.js) played through in the story, for the browser pane (its scripts time
// out after 45 s: start, then poll window.__gt { stage, ok, fails }):
//   (await import('/tools/guidetest.js')).start('party')   // the big map (M, the arrows, E, a click),
//                                                           // a phone's « go there », arrival
//   (await import('/tools/guidetest.js')).start('solo')    // the menu's world map (the arrows, E)
import * as T from '/tools/partybots.js';

const g = () => window.game, D = () => window.game.debug;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const key = (code, down) => document.body.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code, bubbles: true }));
async function tapKey(code) { key(code, true); await D().step(1); await sleep(20); key(code, false); await D().step(2); }
async function until(fn, n = 600) { for (let i = 0; i < n && !fn(); i++) await D().step(1); return fn(); }

export function start(mode = 'party') {
  const R = window.__gt = { stage: 'start', mode, ok: [], fails: [] };
  const check = (name, cond) => (cond ? R.ok : R.fails).push(name);
  (async () => {
    for (let i = 0; i < 100 && !(g().world && g().world.overCol); i++) await sleep(100);
    if (mode === 'solo') await solo(R, check); else await party(R, check);
    check('0 errors', !(window.__errs || []).length);
    R.errs = (window.__errs || []).slice(0, 5);
    R.stage = 'done';
  })().catch((e) => { R.fails.push('crash: ' + (e && e.stack || e)); R.stage = 'done'; });
}

async function party(R, check) {
  R.stage = 'boot';
  await T.boot(1);
  T.mode('explore');
  for (let i = 0; i < 30; i++) { await sleep(50); await D().step(3); }
  const P = g().party, G = P.guides;
  // (the chapter's opening scene: the host skips it — nobody joins during a scene)
  for (let i = 0; i < 40 && (P.cinematic || P.dialogue.active || (P.stage && P.stage.active)); i++) { await T.press(T.bots[0], 'y'); await T.skipTalk(4); await D().step(10); }
  // a keyboard player joins on the big screen
  await tapKey('Enter');
  for (let i = 0; i < 10; i++) { await sleep(40); await D().step(2); }
  const kb = P.players.find((p) => p.kind === 'keys');
  check('a keyboard player joins', !!kb);
  check('the story’s marks are places', G.places().length > 0);
  if (!kb) return;
  R.stage = 'map';
  await tapKey('KeyM');
  check('M opens the map, the hero waits', P.bigMapOpen && G.froze.has(kb));
  await D().step(2);
  const s0 = G.pick.sel;
  for (let i = 0; i < 3 && G.pick.sel === s0; i++) await tapKey('KeyD');
  check('the arrows hop from place to place', !!G.pick.sel && G.pick.sel !== s0);
  const chosen = G.pick.current();
  await tapKey('KeyE');
  check('E goes there, the map closes', !P.bigMapOpen && !!kb.guide && !!chosen && kb.guide.id === chosen.id && !G.froze.size);
  await until(() => kb.guide && (kb.guide.path || kb.guide.none));
  check('the way is found', !!(kb.guide && kb.guide.path));
  if (kb.guide && kb.guide.path) {
    const w = kb.guide, n = w.path.length / 2;
    for (let k = 0; k < n && kb.guide; k += 4) { kb.actor.pos = { x: w.path[k * 2], z: w.path[k * 2 + 1] }; await D().step(1); }
    kb.actor.pos = { x: w.path[(n - 1) * 2], z: w.path[(n - 1) * 2 + 1] };
    for (let i = 0; i < 3; i++) await D().step(1);
    check('walked to its end: arrived', !kb.guide);
  }
  // the mouse: a click on a place (the input turns `_click` into `mouse.pressed` at a frame's start)
  R.stage = 'mouse';
  await tapKey('KeyM'); await D().step(2);
  const spot = G.pick.spots.find((s) => s.show && s.inside && Math.hypot(s.pl.x - kb.pos.x, s.pl.z - kb.pos.z) > 12);
  const m = g().input.mouse;
  if (spot) { m.x = spot.x; m.y = spot.y; await D().step(2); g().input._click = true; await D().step(2); }
  check('a click on a place goes there', !!spot && !!kb.guide && kb.guide.id === spot.pl.id && !P.bigMapOpen);
  // a phone: its map's places, « go there », the way on its map, « stop »
  R.stage = 'phone';
  const b = T.bots[0], bp = T.me(b);
  b.msgs.length = 0;
  b.send({ t: 'mapReq', v: 2 });
  for (let i = 0; i < 20 && !b.msgs.some((q) => q.t === 'wmap'); i++) { await sleep(60); await D().step(1); }
  const u = b.msgs.filter((q) => q.t === 'wmap').pop(), goable = u ? u.m.filter((q) => q[7]) : [];
  check('the phone’s map lists places to go to', goable.length > 0);
  if (goable.length) {
    const pl = goable[0];
    b.send({ t: 'goto', x: pl[1], z: pl[2] });
    for (let i = 0; i < 40 && !(bp.guide && (bp.guide.path || bp.guide.none)); i++) { await sleep(40); await D().step(2); }
    check('« go there » from the phone', !!bp.guide);
    b.msgs.length = 0;
    b.send({ t: 'mapReq', v: 2 });
    for (let i = 0; i < 20 && !b.msgs.some((q) => q.t === 'wmap'); i++) { await sleep(60); await D().step(1); }
    const u2 = b.msgs.filter((q) => q.t === 'wmap').pop();
    check('its map shows the flag', !!(u2 && u2.dest));
    b.send({ t: 'goto', x: pl[1], z: pl[2], stop: 1 });
    for (let i = 0; i < 10; i++) { await sleep(40); await D().step(1); }
    check('« stop » from the phone', !bp.guide);
  }
}

async function solo(R, check) {
  R.stage = 'new game';
  window.__errs = [];
  window.addEventListener('error', (e) => window.__errs.push(String(e.message)));
  const d = D();
  d.pause(true);
  await d.newGame('Alex');
  await d.skip(200);
  g().state.flags.wildIntro = true;
  g().world.wild.chooseClass('ranger');
  d.tp(52, 40);
  for (let i = 0; i < 8; i++) { d.step(3); await sleep(80); }
  const w = g().world, W = w.wild, M = w.menu;
  check('the solo game has its guide', !!W.guides && W.guides.places().length > 0);
  R.stage = 'menu';
  M.show('map'); d.step(2);
  for (let i = 0; i < 3 && M.mapViewNow() !== 'world'; i++) await tapKey('KeyE');
  check('the menu’s world map', M.mapViewNow() === 'world');
  await tapKey('ArrowRight');
  check('the arrows pick a place', !!(M.pick && M.pick.current()));
  const chosen = M.pick && M.pick.current();
  await tapKey('KeyE');
  check('E goes there, the menu closes', !M.open && !!W.me.guide && !!chosen && W.me.guide.id === chosen.id);
  for (let i = 0; i < 200 && W.me.guide && !W.me.guide.path && !W.me.guide.none; i++) d.step(1);
  check('the way is found', !!(W.me.guide && W.me.guide.path));
}
