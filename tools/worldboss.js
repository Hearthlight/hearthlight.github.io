// World v7 M13: the world bosses, woken one by one and walked through their three phases by
// heroes who can’t fall — in the background (poll `window.__wb`), a shot per phase:
//   (await import('/tools/worldboss.js?' + Date.now())).start('solo', 1, { thunderhoof: 'wb_thunder' })
//   window.__wb  → 'run' · 'done {…}' · 'err …'
// Every land is opened first (the Murk would send the heroes home).

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function run(mode = 'solo', n = 1, shots = {}, only = null) {
  const V = await import('/tools/sagatest.js?' + Date.now());
  if (mode === 'solo') await V.solo('knight');
  else {
    await V.ready(); V.watchErrors();
    const T = await import('/tools/partybots.js?' + Date.now());
    await T.boot(n); await T.autoplay('saga', [], { until: () => true });
  }
  const P = mode === 'solo' ? window.game.world.wild : window.game.party, D = window.game.debug, S = V.saga();
  const { ZONES } = await import('/src/world/big/layout.js');
  S.st.open = ZONES.map((z) => z.id);
  if (S.P.murk) S.P.murk.refresh(true);
  const heroes = () => P.players.filter((p) => p.connected || P.solo);
  const tp = async (x, z) => {
    if (P.solo) D.tp(x, z);
    else { heroes().forEach((p, i) => { p.actor.pos = { x: x + (i % 4) * 0.9 - 1.3, z: z + Math.floor(i / 4) * 0.9 }; }); P.cam.snap(P.camPlayers()); }
    for (let k = 0; k < 6; k++) { await D.step(5, 1 / 60); await sleep(60); }
  };
  const keepAlive = () => { for (const p of heroes()) if (p.fighter) { if (p.fighter.down && P.combat) P.combat.revive(p, 1, null); p.fighter.hp = p.fighter.maxHp; } };
  const res = {};
  // (a world boss beaten by an earlier test stays beaten in its save: woken afresh)
  for (const L of P.lairs.list) if (L.world && L.state === 'beaten') L.state = 'idle';
  for (const L of P.lairs.list.filter((l) => l.world && (!only || only.includes(l.type)))) {
    await tp(L.x, L.z + 7);
    for (let k = 0; k < 40 && L.state !== 'fight'; k++) { await D.step(10, 1 / 60); await tp(L.x, L.z + 6 - k * 0.1); }
    const e = L.boss;
    if (!e) { res[L.type] = 'no wake (' + L.state + ')'; continue; }
    for (const [f, tag] of [[0.95, 1], [0.55, 2], [0.2, 3]]) {
      e.hp = e.maxHp * f;
      for (let k = 0; k < 26; k++) { await D.step(10, 1 / 60); keepAlive(); if (k % 6 === 0) await sleep(30); if (window.__stop) throw new Error('stopped'); }
      if (shots[L.type]) { await sleep(80); await D.shot(shots[L.type] + '_' + tag, 2); }
    }
    e.hp = 0; P.combat.kill(e, heroes()[0]);
    for (let k = 0; k < 12; k++) await D.step(10, 1 / 60);
    res[L.type] = L.state;
    // (the gloom it left, gone)
    for (const q of P.combat.enemies) if (q.alive) { q.alive = false; q.fading = 0; q.remove(); }
  }
  res.errs = V.errs();
  return res;
}

// the rares: each woken by a hero nearby, a shot, felled — and its hat checked
export async function rares(mode = 'solo', n = 1, shots = {}) {
  const V = await import('/tools/sagatest.js?' + Date.now());
  if (mode === 'solo') await V.solo('ranger');
  else {
    await V.ready(); V.watchErrors();
    const T = await import('/tools/partybots.js?' + Date.now());
    await T.boot(n); await T.autoplay('saga', [], { until: () => true });
  }
  const P = mode === 'solo' ? window.game.world.wild : window.game.party, D = window.game.debug, S = V.saga();
  const { ZONES } = await import('/src/world/big/layout.js');
  S.st.open = ZONES.map((z) => z.id);
  if (S.P.murk) S.P.murk.refresh(true);
  const heroes = () => P.players.filter((p) => p.connected || P.solo);
  const tp = async (x, z) => {
    if (P.solo) D.tp(x, z);
    else { heroes().forEach((p, i) => { p.actor.pos = { x: x + (i % 4) * 0.9 - 1.3, z: z + Math.floor(i / 4) * 0.9 }; }); P.cam.snap(P.camPlayers()); }
    for (let k = 0; k < 6; k++) { await D.step(5, 1 / 60); await sleep(60); }
  };
  const res = {};
  for (const R of P.rares.list) {
    await tp(R.x, R.z + 5);
    for (let k = 0; k < 20 && !R.e; k++) await D.step(5, 1 / 60);
    if (!R.e) { res[R.id] = 'no spawn'; continue; }
    for (let k = 0; k < 12; k++) { await D.step(5, 1 / 60); for (const p of heroes()) if (p.fighter) p.fighter.hp = p.fighter.maxHp; }
    if (shots[R.id]) { await sleep(80); await D.shot(shots[R.id], 2); }
    const e = R.e;
    e.hp = 0; P.combat.kill(e, heroes()[0]);
    for (let k = 0; k < 6; k++) await D.step(10, 1 / 60);
    const hats = P.solo ? window.game.state.unlocked.hat : P.profileOf(heroes()[0]).hats || [];
    res[R.id] = (hats.includes(R.hat) ? 'hat ' : 'NO HAT ') + (P.rares.away(R) ? 'away' : 'back?');
    for (const q of P.combat.enemies) if (q.alive) { q.alive = false; q.fading = 0; q.remove(); }
  }
  res.errs = V.errs();
  return res;
}

// the early bosses’ own tricks, checked one by one: Barkbeard’s golden acorns (kicked back,
// he chokes: exposed), Grumbleclaw’s gloom lanterns (half damage while one burns, dazed when
// the last goes out), the Drillosaur stuck in its own tunnel when its charge meets nobody
export async function bosses(mode = 'solo', n = 1, shots = {}) {
  const V = await import('/tools/sagatest.js?' + Date.now());
  if (mode === 'solo') await V.solo('knight');
  else {
    await V.ready(); V.watchErrors();
    const T = await import('/tools/partybots.js?' + Date.now());
    await T.boot(n); await T.autoplay('saga', [], { until: () => true });
  }
  const P = mode === 'solo' ? window.game.world.wild : window.game.party, D = window.game.debug, S = V.saga();
  const { ZONES } = await import('/src/world/big/layout.js');
  S.st.open = ZONES.map((z) => z.id);
  if (S.P.murk) S.P.murk.refresh(true);
  const heroes = () => P.players.filter((p) => p.connected || P.solo);
  const tp = async (x, z) => {
    if (P.solo) D.tp(x, z);
    else { heroes().forEach((p, i) => { p.actor.pos = { x: x + (i % 4) * 0.9 - 1.3, z: z + Math.floor(i / 4) * 0.9 }; }); P.cam.snap(P.camPlayers()); }
    for (let k = 0; k < 4; k++) { await D.step(5, 1 / 60); await sleep(50); }
  };
  const keepAlive = () => { for (const p of heroes()) if (p.fighter) { if (p.fighter.down && P.combat) P.combat.revive(p, 1, null); p.fighter.hp = p.fighter.maxHp; } };
  const run = async (frames) => { for (let k = 0; k < frames; k += 5) { await D.step(5, 1 / 60); keepAlive(); } };
  const C = P.combat, res = {};
  const clearAll = () => { for (const q of C.enemies) if (q.alive) { q.alive = false; q.fading = 0; q.remove(); } };
  // (open ground on the steppe, well away from its camps)
  const X = -60, Z = 70;
  // ---- Barkbeard
  await tp(X, Z + 6); clearAll();
  let e = C.spawn('barkbeard', X, Z - 2, { level: 10 }); e.spawnT = 0; e.home = { x: X, z: Z - 2 };
  e.brain.acorns.call(e.brain, e, C);
  await run(100);
  const gold = (e.golden || []).length;
  if (shots.barkbeard) { await sleep(60); await D.shot(shots.barkbeard, 2); }
  if (gold) { const A = e.golden[0]; await tp(A.x, A.z); await run(50); }
  res.barkbeard = { golden: gold, exposed: +(e.exposed || 0).toFixed(1) };
  clearAll();
  // ---- Grumbleclaw
  await tp(X, Z + 6);
  e = C.spawn('grumbleclaw', X, Z - 1, { level: 8 }); e.spawnT = 0; e.home = { x: X, z: Z - 1 };
  e.hp = e.maxHp * 0.6;
  await run(160);
  const lamps = C.enemies.filter((q) => q.alive && q.lampOf === e);
  if (shots.grumbleclaw) { await sleep(60); await D.shot(shots.grumbleclaw, 2); }
  const hp0 = e.hp; C.hurtEnemy(e, 100, { p: heroes()[0], dir: { x: 0, z: -1 } }); const shielded = +(hp0 - e.hp).toFixed(1);
  for (const q of lamps) { q.hp = 0; C.kill(q, heroes()[0]); }
  await run(20);
  const hp1 = e.hp; C.hurtEnemy(e, 100, { p: heroes()[0], dir: { x: 0, z: -1 } }); const dazedHit = +(hp1 - e.hp).toFixed(1);
  res.grumbleclaw = { lamps: lamps.length, shieldedHit: shielded, dazedHit, exposed: +(e.exposed || 0).toFixed(1) };
  clearAll();
  // ---- the Drillosaur: a charge down an empty lane
  await tp(X - 12, Z + 8);
  e = C.spawn('drillosaur', X, Z - 2, { level: 14 }); e.spawnT = 0; e.home = { x: X, z: Z - 2 };
  e.brain.charge.call(e.brain, e, C, { pos: { x: X + 9, z: Z - 2 } });
  await run(150);
  if (shots.drillosaur) { await sleep(60); await D.shot(shots.drillosaur, 2); }
  res.drillosaur = { exposed: +(e.exposed || 0).toFixed(1), anim: e.anim, state: e.state };
  clearAll();
  res.errs = V.errs();
  return res;
}

export function start(...args) {
  window.__wb = 'run';
  (args[0] === 'rares' ? rares(...args.slice(1)) : args[0] === 'bosses' ? bosses(...args.slice(1)) : run(...args)).then((r) => { window.__wb = 'done ' + JSON.stringify(r); }).catch((e) => { window.__wb = 'err ' + e + ' ' + String(e && e.stack || '').slice(0, 400); });
  return 'started';
}
