// Release v9: Grandmother Kraken played through — a solo hero rowing a boat into her arms,
// lanterns into her eye, both phases, the victory, her hat; or a party of n bots in the boats.
//   (await import('/tools/grandmatest.js?' + Date.now())).start('solo')   → poll window.__gk
//   (await import('/tools/grandmatest.js?' + Date.now())).start('party', 4)
//   (await import('/tools/grandmatest.js?' + Date.now())).start('solo', 4, 'gk')   (pictures: gk-wake, gk-peek…)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// (`shots`: a prefix for pictures — the wake, her first peek, a ram, the victory)
export async function run(mode = 'solo', n = 4, shots = '') {
  const V = await import('/tools/sagatest.js?' + Date.now());
  await V.ready(); V.watchErrors();
  const D = window.game.debug;
  let P, heroes;
  if (mode === 'solo') { await V.solo('ranger'); P = window.game.world.wild; heroes = () => [P.me]; }
  else { const T = window.T = await import('/tools/partybots.js?' + Date.now()); await T.boot(n); await T.autoplay('saga', [], { until: () => true }); P = window.game.party; heroes = () => P.players.filter((p) => p.connected); }
  await V.toChapter(7);
  for (const p of heroes()) if (p.fighter) for (let i = 0; i < 40 && p.fighter.level < 30; i++) P.combat.gainXp(p, 5000);
  const go = (x, z) => { if (P.solo) D.tp(x, z); else { heroes().forEach((p, i) => { p.actor.pos = { x: x + i * 0.9, z }; }); P.cam.snap(P.camPlayers()); } };
  go(652, 106);
  for (let i = 0; i < 30; i++) { await sleep(40); await D.step(4); }
  const L = P.lairs.list.find((l) => l.type === 'grandmakraken'), e = L.boss, res = { woke: !!e };
  if (!e) return res;
  const boats = P.vehicles.list.filter((v) => Math.hypot(v.x - L.x, v.z - L.z) < 14);
  heroes().forEach((p, i) => { const v = boats[i % boats.length]; if (v && v.riders.some((r) => !r)) P.vehicles.board(p, v); });
  res.boats = boats.map((v) => v.kind); res.aboard = heroes().filter((p) => p.vehicle).length;
  const t0 = P.t, phases = new Set(), took = new Set();
  const shot = async (name) => { if (!shots || took.has(name)) return; took.add(name); await sleep(100); await D.step(1); await D.shot(shots + '-' + name, P.solo ? 2 : 1); };
  await shot('wake');
  // (like a crew: head for the nearest swaying arm at speed; when she peeks, row in and throw)
  for (let k = 0; k < 2400 && e.alive; k++) {
    const arms = P.combat.enemies.filter((q) => q.alive && q.summoner === e && q.state === 'sway');
    for (const v of boats) {
      if (!v.riders.some(Boolean)) continue;
      if (e.state === 'peek') { v.heading = Math.atan2(e.x - v.x, e.z - v.z); if (Math.hypot(v.x - e.x, v.z - e.z) > e.def.r + 5) v.speed = Math.max(v.speed, 3); continue; }
      const a = arms.sort((x, y) => Math.hypot(x.x - v.x, x.z - v.z) - Math.hypot(y.x - v.x, y.z - v.z))[0];
      if (a) { v.heading = Math.atan2(a.x - v.x, a.z - v.z); v.speed = Math.max(v.speed, 5.5); } else v.heading = Math.atan2(v.x - e.x, v.z - e.z);
    }
    if (e.state === 'peek' && k % 20 === 0) { if (P.solo) await D.key('KeyF', 2); else for (const b of window.T.bots) window.T.tap(b, 'x'); }
    phases.add(e.phase);
    if (e.state === 'peek' && e.timer < (e.phase >= 3 ? 4 : 5.5)) await shot('peek');
    if (k === 300) await shot('fight');
    await D.step(2);
    if (k % 30 === 0) await sleep(15);
    if (window.__stop) throw new Error('stopped');
  }
  await D.step(30);
  await shot('victory');
  res.phases = [...phases]; res.won = !e.alive && L.state === 'beaten'; res.secs = Math.round(P.t - t0);
  res.hpLeft = heroes().map((p) => (p.fighter ? Math.round((100 * p.fighter.hp) / p.fighter.maxHp) : null));
  res.hat = P.solo ? window.game.state.unlocked.hat.includes('bobblehat') : heroes().map((p) => (P.profileOf(p).hats || []).includes('bobblehat'));
  res.errs = V.errs();
  return res;
}

export function start(...args) {
  window.__gk = 'run';
  run(...args).then((r) => { window.__gk = 'done ' + JSON.stringify(r); }).catch((e) => { window.__gk = 'err ' + e + ' ' + String(e && e.stack || '').slice(0, 300); });
  return 'started';
}
