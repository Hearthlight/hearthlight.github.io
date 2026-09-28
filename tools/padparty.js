// Party Mode with gamepads (pretend ones, tools/fakepad.js) beside the bots' phones: joining
// from the lobby, a player's own menu on the big screen (their page, renaming on the
// letters, the talents, the gear), a second pad waiting its turn, a hero that stands still
// while its menu is open, a pad picked up mid-adventure, rumbles — in the background:
//   (await import('/tools/padparty.js?' + Date.now())).start(2)   → poll window.__pp
// `shots`: a prefix for pictures of it (e.g. 'tv').

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function run(bots = 2, shots = '') {
  const V = await import('/tools/sagatest.js?' + Date.now());
  await V.ready(); V.watchErrors();
  const T = await import('/tools/partybots.js?' + Date.now());
  const F = await import('/tools/fakepad.js?' + Date.now());
  const { picksOf, spent } = await import('/src/combat/v4/talents.js');
  await T.boot(bots);
  F.install(2, ['xbox', 'ps']);
  const P = window.game.party, D = window.game.debug, res = {};
  const shot = async (name) => { if (shots) { await sleep(120); await D.shot(shots + '_' + name, 2); } };
  const pads = () => P.players.filter((p) => p.kind === 'gamepad');
  // two gamepads join from the lobby
  await F.press(0, 'a'); await D.step(4); await F.press(1, 'a'); await D.step(6);
  res.joined = pads().map((p) => p.name + ':' + p.input.style);
  // the lobby: pad 0's own menu (no hero yet: just their page), renamed on the letters
  await F.press(0, 'select'); await D.step(8);
  const c0 = P.tvmenus.cur;
  res.lobby = { open: P.tvmenus.isOpen(pads()[0]), pages: c0 ? c0.tab.pages.map((q) => q[0]) : null };
  await F.press(0, 'a'); await D.step(4);                     // "Change your name" → the letters
  res.osk = !!(c0 && c0.tab.osk);
  for (let i = pads()[0].name.length; i > 0; i--) await F.press(0, 'b');   // (rub out "Pad 1", « Manette 1 »…)
  await F.seq(0, ['down', 'right', 'right', 'a', 'right', 'right', 'a']);  // M, o
  await shot('osk');
  await F.press(0, 'select'); await D.step(4);                // OK
  res.renamed = pads()[0].name;
  await shot('lobby');
  await F.press(0, 'b'); await D.step(4);
  res.closed = !P.tvmenus.open;
  // the adventure: the bots start it (its opening words skipped)
  await T.autoplay('saga', [], { until: () => true });
  const quiet = async () => { for (let i = 0; i < 60 && (P.dialogue.active || P.busy || (P.stage && P.stage.active)); i++) { if (P.stage && P.stage.active) P.stage.skip(); if (P.dialogue.active) P.dialogue.skip(); await D.step(10); await sleep(30); } };
  await quiet();
  for (let k = 0; k < 6; k++) { await D.step(10); await sleep(60); }
  const p0 = pads()[0], p1 = pads()[1];
  res.fighters = [!!p0.fighter, !!p1.fighter];
  // a few levels for pad 0: points to spend (the toast names its menu button)
  if (p0.fighter) { p0.fighter.level = 9; P.progress.onLevel(p0); }
  res.toast = (P.toasts.find((q) => /talent/i.test(q.text)) || {}).text || null;
  const before = spent(picksOf(P.progress.prof(p0), p0.cls || 'knight'));
  await F.press(0, 'select'); await D.step(8);
  const c = P.tvmenus.cur;
  res.page = c && c.tab.page;
  await D.step(4);
  await shot('talents');
  await F.press(0, 'a'); await D.step(6);                     // learn the first talent that can be
  res.learned = spent(picksOf(P.progress.prof(p0), p0.cls || 'knight')) - before;
  await F.press(0, 'x'); await D.step(6); res.next = P.tvmenus.cur && P.tvmenus.cur.tab.page;
  await shot('gear');
  await F.press(0, 'x'); await F.press(0, 'x'); await F.press(0, 'x'); await D.step(4);
  await shot('you');
  // pad 1 asks meanwhile: it waits, then gets it
  await F.press(1, 'select'); await D.step(4);
  res.queued = P.tvmenus.queue.map((q) => q.name);
  await F.press(0, 'b'); await D.step(6);
  res.handedOver = P.tvmenus.isOpen(p1);
  // while it's open, pad 1's hero stands still — the camera slides the heroes left
  const at = { ...p1.actor.pos };
  F.stick(1, 1, 0); await D.step(30); F.stick(1, 0, 0);
  res.stood = +Math.hypot(p1.actor.pos.x - at.x, p1.actor.pos.z - at.z).toFixed(2);
  res.shift = P.cam.shift ? +P.cam.shift.x.toFixed(2) : 0;
  await shot('hero1');
  await F.press(1, 'select'); await D.step(6);
  res.back = !P.tvmenus.open && p1.input.kind === 'gamepad' && typeof p1.input.index === 'number' && !p1.input.real;
  // and now it walks again
  const at2 = { ...p1.actor.pos };
  F.stick(1, 1, 0); await D.step(30); F.stick(1, 0, 0);
  res.walks = +Math.hypot(p1.actor.pos.x - at2.x, p1.actor.pos.z - at2.z).toFixed(2);
  // a third gamepad, picked up mid-adventure
  F.install(3, 'nintendo');
  await F.press(2, 'a'); await D.step(8);
  res.late = pads().length;
  // a hit, out in the woods: that pad rumbles (and only that one)
  await quiet();
  await T.warp(100, -30); for (let k = 0; k < 4; k++) { await D.step(10); await sleep(60); }
  for (const q of P.combat.enemies) if (q.alive) { q.alive = false; q.fading = 0; q.remove(); }
  window.__rumble = [];
  const C = P.combat, e = C.spawn('gloomling', p0.actor.pos.x + 0.9, p0.actor.pos.z, { level: 3 });
  e.spawnT = 0; if (e.state === 'sleep') C.wake(e);
  p0.actor.dir = { x: 1, z: 0 };
  for (let i = 0; i < 4; i++) await F.press(0, 'a', 6);
  res.rumble = [...new Set((window.__rumble || []).map((r) => r[0]))];
  res.errs = V.errs();
  return res;
}

export function start(...args) {
  window.__pp = 'run';
  run(...args).then((r) => { window.__pp = 'done ' + JSON.stringify(r); }).catch((e) => { window.__pp = 'err ' + e + ' ' + String(e && e.stack || '').slice(0, 400); });
  return 'started';
}
