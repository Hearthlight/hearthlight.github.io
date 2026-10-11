// Every dungeon’s puzzle rooms played by hand (tools/puzzletest.js walks the heroes): each one
// is first failed on purpose — to see what failing costs and that help comes — then solved from
// what the room shows, as a party of four or a hero alone would. For the browser pane:
//   const Y = await import('/tools/puzzleplays.js');
//   Y.run('forgeheart', 'party', 4)          // or ('forgeheart', 'solo', 1) — poll window.__pz
//   window.__pz → 'run' · 'done {…}' (each room: what happened, was it passed) · 'err …'
// Pictures land in screenshots/pz_<room>_<moment>.png.

import * as Z from './puzzletest.js';

const CH = { grotto: 1, rootway: 2, oldmine: 3, frostbell: 4, sunkenbell: 5, forgeheart: 6, lanternpagoda: 7, heartwood: 8, hollowmoor: 9, gloomstage: 10 };
const all = () => Z.heroes().map((p, i) => i);
const R = (id) => Z.dun().roomById(id);
const gate = (id) => Z.dun().gate(id);
const flying = () => Z.heroes().some((p) => p.flight);
// a hero stands on a vent until it throws, and lands
async function ride(list, V) {
  await Z.goAll(list.map((i, k) => [i, V.x + (k % 2 ? 0.32 : -0.32) * (list.length > 1 ? 1 : 0), V.z + (k > 1 ? 0.3 : -0.3) * (list.length > 1 ? 1 : 0)]));
  await Z.until(flying, 6);
  await Z.until(() => !flying(), 4);
  await Z.wait(0.4);
}

const PLAYS = {
  // ---------------------------------------------------------------- 1 · mirrors, no penalty
  async grotto(log, tag) {
    const r = await Z.room('plates');
    await Z.wait(1.5); log.push(['plates in', Z.info('plates')]); await Z.shot(tag + 'plates_clue');
    // (nobody moves for a minute: the arrow comes)
    await Z.wait(62); log.push(['plates help', Z.info('plates')]); await Z.shot(tag + 'plates_help');
    for (const pl of r.bm.plates) { await Z.go(0, pl.x, pl.z); await Z.wait(0.8); }
    await Z.wait(1.5); log.push(['plates', Z.info('plates')]); await Z.shot(tag + 'plates_done');
  },
  // ---------------------------------------------------------------- 2 · the fireflies’ count
  async rootway(log, tag) {
    const r = await Z.room('glow');
    const by = (n) => { const tb = r.tb.find((q) => q.n === n); return [tb.x + (tb.x < 24 ? 1.1 : -1.1), tb.z + 0.25]; };
    await Z.wait(1.5); log.push(['glow in', Z.info('glow')]); await Z.shot(tag + 'glow_clue');
    // (failed on purpose, three times: the nearest brazier first)
    for (const n of [3, 2, 4]) { await Z.go(0, ...by(n)); await Z.wait(0.6); await Z.go(0, 24, 108.5); }
    log.push(['glow wrong x3', Z.info('glow'), Z.said(3)]); await Z.shot(tag + 'glow_wrong');
    await Z.until(() => r.helped >= 1, 60); await Z.wait(0.4); log.push(['glow hint', Z.info('glow')]); await Z.shot(tag + 'glow_hint');
    await Z.wait(72); log.push(['glow arrows', Z.info('glow')]); await Z.shot(tag + 'glow_help');
    for (const n of [1, 2, 3, 4]) { const ok = await Z.go(0, ...by(n)); await Z.wait(0.5); log.push(['brazier ' + n, ok, r.tb.filter((q) => q.lit).length]); }
    await Z.wait(1.5); log.push(['glow', Z.info('glow')]); await Z.shot(tag + 'glow_done');
  },
  // ---------------------------------------------------------------- 3 · the points
  async oldmine(log, tag) {
    for (const [id, undo] of [['switch', 'j2'], ['crystals', 'blue']]) {
      const r = await Z.room(id), N = r.pn;
      const pull = async (lid) => { const lv = N.levers.find((q) => q.id === lid); const ok = await Z.go(0, lv.x + 0.75, lv.z + 0.25); await Z.wait(0.4); return ok; };
      const send = async () => { const ok = await Z.go(0, N.go.x + 0.2, N.go.z + 0.8); await Z.until(() => N.cart, 2); await Z.until(() => !N.cart || r.solved, 12); await Z.wait(0.5); return ok; };
      await Z.wait(1.5); log.push([id + ' in', Z.info(id)]); await Z.shot(tag + id + '_clue');
      // (failed on purpose: every lever pulled, as anybody would at first)
      for (const lv of N.levers) await pull(lv.id);
      await Z.shot(tag + id + '_all');
      await send();
      log.push([id + ' all levers', Z.info(id), Z.said(1)]);
      // (the lever too many, pulled back: the glowing rails show which)
      await pull(undo);
      await Z.shot(tag + id + '_set');
      await send();
      await Z.wait(1.5); log.push([id, Z.info(id)]); await Z.shot(tag + id + '_done');
    }
  },
  // ---------------------------------------------------------------- 4 · memory: a tune, a path
  async frostbell(log, tag) {
    const r = await Z.room('bells'), n = Z.heroes().length;
    await Z.wait(1); await Z.shot(tag + 'bells_clue');
    // (each hero by a bell — a hero alone runs between them — and the tune watched as it is sung)
    const post = (k) => [r.sb[k].x, r.sb[k].z + 1.9];
    if (n >= 4) await Z.goAll([0, 1, 2, 3].map((k) => [k, ...post(k)]));
    // (the tune as it is watched: each bell that lights up while the bells sing — whatever the
    // heroes are doing meanwhile; a new tune starts the list afresh)
    const heard = [], was = r.sb.map(() => 0);
    let st0 = '';
    Z.dun().anims.push(() => {
      const S = r.sim;
      if (!S) return;
      if (S.state !== st0) { if (S.state === 'pause' || (S.state === 'play' && st0 !== 'pause')) heard.length = 0; st0 = S.state; }
      r.sb.forEach((b, k) => { if (S.state === 'play' && b.glow > was[k] + 0.3) heard.push(k); was[k] = b.glow; });
    });
    const listen = () => Z.until(() => r.sim && r.sim.state === 'input', 25);
    const ring = async (k) => { const i = n >= 4 ? k : 0; await Z.go(i, r.sb[k].x, r.sb[k].z + 0.3); await Z.wait(0.15); if (n >= 4) await Z.go(i, ...post(k)); else await Z.go(0, 28, 144.8); };
    await listen(); log.push(['bells tune 1', heard.join(''), r.sim.seq.join('')]);
    // (failed on purpose: a wrong bell)
    await ring((heard[0] + 2) % 4); await Z.wait(0.5); log.push(['bells sour', Z.info('bells'), Z.said(1)]);
    for (let round = 0; round < 6 && !r.solved; round++) {
      await listen();
      log.push(['bells round', r.sim.round, heard.join(''), r.sim.seq.join('')]);
      if (round === 0) await Z.shot(tag + 'bells_turn');
      for (const k of [...heard]) await ring(k);
      await Z.wait(0.6);
    }
    await Z.wait(1.5); log.push(['bells', Z.info('bells')]); await Z.shot(tag + 'bells_done');

    // the frozen river: the thick white slabs, a row at a time (a gust: wait it out)
    const c = await Z.room('crevasse', 0.9), I = c.ice, at = (s) => [I.x0 + s.col * I.size + I.size / 2, I.z0 + s.row * I.size + I.size / 2];
    await Z.wait(1); log.push(['crevasse in', Z.info('crevasse')]); await Z.shot(tag + 'crevasse_clue');
    // (failed on purpose: straight up the middle, on the blue ice)
    const thin = c.slabs.find((s) => s.row === I.rows - 1 && s.thin);
    await Z.go(0, ...at(thin), true, { avoid: [] }); await Z.wait(1.6);
    log.push(['crevasse dunk', Z.info('crevasse'), Z.said(1)]);
    const thick = c.slabs.filter((s) => !s.thin), way = [];
    let cur = thick.find((s) => s.row === I.rows - 1);
    for (const seen = new Set(); cur && cur.row > 0;) {
      way.push(cur); seen.add(cur);
      cur = thick.find((s) => s.row === cur.row - 1 && s.col === cur.col) || thick.find((s) => s.row === cur.row && Math.abs(s.col - cur.col) === 1 && !seen.has(s));
    }
    if (cur) way.push(cur);
    for (const i of all()) {
      for (const s of way) {
        // (snow over the ice: stand still until it clears — what the hint says)
        if ((c.gustW || 0) > 0.3) { if (i === 0 && !c.shotGust) { c.shotGust = 1; await Z.shot(tag + 'crevasse_gust'); } await Z.until(() => !((c.gustW || 0) > 0.05), 6); }
        await Z.goAll([[i, ...at(s)]], { avoid: [] });
      }
      await Z.goAll([[i, at(way[way.length - 1])[0], I.z0 - 1.2]], { avoid: [] });
    }
    await Z.wait(1); log.push(['crevasse', Z.info('crevasse')]); await Z.shot(tag + 'crevasse_done');
  },
  // ---------------------------------------------------------------- 5 · the tide: together, on a clock
  async sunkenbell(log, tag) {
    const n = Z.heroes().length, rest = all().slice(1);
    // the forecourt: one bell, a dash
    let r = await Z.room('forecourt'), T = r.tide, G = gate('g2');
    await Z.wait(1.5); log.push(['forecourt in', Z.info('forecourt')]); await Z.shot(tag + 'forecourt_clue');
    // (failed on purpose: the bell rung, and nobody runs)
    await Z.go(0, T.bells[0].x, T.bells[0].z + 0.3); await Z.wait(11.5);
    log.push(['forecourt too slow', Z.info('forecourt'), Z.said(1)]);
    await Z.go(0, T.bells[0].x + 2.5, T.bells[0].z + 1.5);
    await Z.go(0, T.bells[0].x, T.bells[0].z + 0.3);
    await Z.until(() => G.open, 2);
    log.push(['forecourt across', await Z.goAll(all().map((i) => [i, G.x - 0.4 + (i % 4) * 0.6, G.z - 2.2 - (i > 3 ? 0.7 : 0)]))]);
    await Z.wait(0.5); log.push(['forecourt', Z.info('forecourt')]);

    // the tide pools: a relay of three little bells
    r = await Z.room('tidepools'); T = r.tide; G = gate('g4');
    await Z.tpAll(T.bells[0].x + 0.3, T.bells[0].z - 2.8);
    await Z.wait(1.5); log.push(['tidepools in', Z.info('tidepools')]); await Z.shot(tag + 'tidepools_clue');
    // (failed on purpose: the first bell, then straight for the sluice)
    await Z.go(0, T.bells[0].x - 0.3, T.bells[0].z - 0.3);
    const direct = await Z.go(0, G.x, G.z + 1.2);
    await Z.wait(1); log.push(['tidepools straight for the sluice', direct, 'sea out ' + T.outT.toFixed(1), Z.info('tidepools'), Z.said(2)]);
    await Z.until(() => T.outT <= 0 && T.cool <= 0, 8);
    // (the crabs that came out on the wet sand are fought off, as a party would)
    const C = Z.P().combat; if (C) for (const e of C.enemies) if (e.alive && !e.def.boss) C.kill(e, Z.heroes()[0]);
    await Z.tpAll(T.bells[0].x + 0.3, T.bells[0].z - 2.8); await Z.wait(0.5);
    // (bell to bell — walking, which a hero alone can afford — and everyone through)
    const t0 = Z.dun().t;
    for (const b of T.bells) { await Z.goAll(all().map((i) => [i, b.x - 0.3 + (i % 2) * 0.6, b.z - 0.3 + Math.floor(i / 2) * 0.6, false])); log.push(['tidepools bell', +(Z.dun().t - t0).toFixed(1), 'sea out ' + T.outT.toFixed(1)]); if (b === T.bells[1]) await Z.shot(tag + 'tidepools_relay'); }
    log.push(['tidepools across', await Z.goAll(all().map((i) => [i, G.x - 0.4 + (i % 4) * 0.6, G.z - 2.2 - (i > 3 ? 0.7 : 0), false])), 'sea out ' + T.outT.toFixed(1)]);
    await Z.wait(0.5); log.push(['tidepools', Z.info('tidepools')]);

    // the bells that ring together: a ringer each — or one hero, very quick
    r = await Z.room('twinbells'); T = r.tide; G = gate('g5');
    await Z.wait(1.5); log.push(['twinbells in', T.bells.length + ' bells', Z.info('twinbells')]); await Z.shot(tag + 'twinbells_clue');
    const by = (k) => [T.bells[k].x, T.bells[k].z + 2];
    const ringers = T.bells.map((b, k) => Math.min(k, n - 1));
    // (failed on purpose: one bell alone)
    await Z.go(0, T.bells[0].x, T.bells[0].z + 0.3); await Z.wait(0.5);
    log.push(['twinbells one alone', Z.info('twinbells'), Z.said(1)]);
    await Z.go(0, ...by(0)); await Z.wait(6.5);
    if (n >= T.bells.length) {
      await Z.goAll(T.bells.map((b, k) => [k, ...by(k)]));
      await Z.shot(tag + 'twinbells_ready');
      await Z.goAll(T.bells.map((b, k) => [k, b.x, b.z + 0.3]));
    } else for (const [k, b] of T.bells.entries()) await Z.go(ringers[k], b.x, b.z + 0.3);
    await Z.until(() => G.open, 2);
    log.push(['twinbells rung', 'window ' + r.tog.toFixed(1), 'sea out ' + T.outT.toFixed(1), G.open]);
    log.push(['twinbells across', await Z.goAll(all().map((i) => [i, G.x - 0.4 + (i % 4) * 0.6, G.z - 2.2 - (i > 3 ? 0.7 : 0)]))]);
    await Z.wait(0.5); log.push(['twinbells', Z.info('twinbells')]); await Z.shot(tag + 'twinbells_done');
    void rest;
  },
  // ---------------------------------------------------------------- 6 · the vents: one pressure
  async forgeheart(log, tag) {
    let r = await Z.room('moat');
    await Z.wait(1.5); log.push(['moat in', Z.info('moat')]); await Z.shot(tag + 'moat_clue');
    await ride(all(), r.vt[0]);
    log.push(['moat', Z.info('moat')]);

    // the lake: three vents, one breath
    r = await Z.room('pressure');
    await Z.wait(1.5); log.push(['pressure in', Z.info('pressure')]); await Z.shot(tag + 'pressure_clue');
    // (failed on purpose: a vent ridden as it is — its ring is red, in the lava)
    await ride([0], r.vt[1]);
    log.push(['pressure short', Z.info('pressure'), Z.said(1)]);
    // (one lever: the rings move, still red; a second: the last vent’s ring is on the far bank)
    log.push(['pressure lever 1', await Z.go(0, r.vt[0].lever.x + 0.7, r.vt[0].lever.z - 0.4), r.vt[0].capped]); await Z.wait(0.8); await Z.shot(tag + 'pressure_one');
    log.push(['pressure lever 2', await Z.go(1 % Z.heroes().length, r.vt[1].lever.x + 0.7, r.vt[1].lever.z - 0.4), r.vt[1].capped]); await Z.wait(0.8); await Z.shot(tag + 'pressure_two');
    await ride([0], r.vt[2]);
    log.push(['pressure first across', Z.info('pressure')]);
    // (somebody is across: every lid lifts, the others ride whichever vent they like)
    if (Z.heroes().length > 1) { await ride(all().slice(1), r.vt[0]); log.push(['pressure the others', Z.info('pressure')]); }
    await Z.shot(tag + 'pressure_done');

    // the chain: islet to islet, the vent behind shut for the one ahead
    r = await Z.room('chain');
    const [A, B, C] = r.vt, n = Z.heroes().length, lead = all().slice(0, Math.max(1, n - 1)), last = n > 1 ? [n - 1] : [];
    await Z.wait(1.5); log.push(['chain in', Z.info('chain')]); await Z.shot(tag + 'chain_clue');
    await ride(lead, A);
    log.push(['chain islet 1', Z.info('chain')]); await Z.shot(tag + 'chain_islet1');
    // (failed on purpose: the next vent ridden with the one behind still blowing)
    await ride([0], B);
    log.push(['chain short', Z.info('chain'), Z.said(1)]);
    await Z.go(0, A.lever.x - 0.75, A.lever.z + 0.2); await Z.wait(0.8);
    log.push(['chain vent 1 shut', A.capped, Z.info('chain')]); await Z.shot(tag + 'chain_shut1');
    // (the friend left on the bank can no longer follow: the vent they need is shut)
    if (last.length) { await Z.goAll([[last[0], A.x, A.z]], { avoid: [] }); await Z.wait(4); log.push(['chain friend behind, on a shut vent', Z.where(last[0])]); }
    await ride(lead, B);
    log.push(['chain islet 2', Z.info('chain')]);
    await Z.go(0, B.lever.x - 0.75, B.lever.z + 0.2); await Z.wait(0.8);
    await Z.shot(tag + 'chain_shut2');
    await ride(lead, C);
    log.push(['chain lead across', Z.info('chain')]);
    // (every lid lifts: the one behind rides all three)
    if (last.length) { for (const V of [A, B, C]) await ride(last, V); log.push(['chain the one behind', Z.where(last[0]), Z.info('chain')]); }
    await Z.shot(tag + 'chain_done');
  },
  // ---------------------------------------------------------------- 7 · the beam: wired, sprung
  async lanternpagoda(log, tag) {
    let r = await Z.room('hall');
    await Z.wait(1.5); log.push(['hall in', Z.info('hall')]); await Z.shot(tag + 'hall_clue');
    for (const pl of r.bm.plates) { await Z.go(0, pl.x, pl.z); await Z.wait(0.6); if (!r.solved) await Z.shot(tag + 'hall_step' + r.bm.plates.indexOf(pl)); }
    await Z.wait(1.5); log.push(['hall', Z.info('hall')]); await Z.shot(tag + 'hall_done');

    // the wired mirrors
    r = await Z.room('screens');
    const [red, blue, green] = r.bm.plates;
    await Z.wait(1.5); log.push(['screens in', Z.info('screens')]); await Z.shot(tag + 'screens_clue');
    // (the obvious first step — the red plate sets the first mirror right — is the wrong one)
    await Z.go(0, red.x, red.z); await Z.wait(2.5); await Z.shot(tag + 'screens_red');
    await Z.go(0, green.x, green.z); await Z.wait(1.5);
    log.push(['screens red + green', Z.info('screens')]);
    await Z.go(0, red.x - 1.5, red.z); await Z.go(0, red.x, red.z); await Z.wait(0.6);
    await Z.go(0, blue.x, blue.z); await Z.wait(3.5);
    log.push(['screens', Z.info('screens')]); await Z.shot(tag + 'screens_done');

    // the prism and the two springs
    r = await Z.room('split');
    const [first, west, east] = r.bm.plates, n = Z.heroes().length;
    await Z.wait(1.5); log.push(['split in', Z.info('split')]); await Z.shot(tag + 'split_clue');
    await Z.go(0, first.x, first.z); await Z.wait(1.6);
    // (failed on purpose: one hero for both — a party’s springs do not wait that long)
    await Z.go(0, west.x, west.z); await Z.wait(0.4); await Z.shot(tag + 'split_one');
    const made = await Z.go(0, east.x, east.z); await Z.wait(0.6);
    log.push(['split one hero', made, 'solved ' + !!r.solved, Z.said(1)]);
    if (!r.solved) {
      await Z.goAll([[0, west.x, west.z], [1 % n, east.x, east.z]]);
      await Z.wait(1.2);
    }
    log.push(['split', Z.info('split')]); await Z.shot(tag + 'split_done');
  },
  // ---------------------------------------------------------------- 8 · the jars: a decoy, a dash
  async heartwood(log, tag) {
    let r = await Z.room('swarm'), J = r.jr;
    const take = async (i, k = 0) => { const ok = await Z.go(i, J.racks[k].x, J.racks[k].z + 0.75); await Z.wait(0.2); return ok && J.held.has(Z.heroes()[i]); };
    const hang = async (i, k) => { const H = J.hooks[k]; const ok = await Z.go(i, H.px, H.pz + 0.15); await Z.wait(0.3); return ok && H.lit; };
    await Z.wait(1.5); log.push(['swarm in', Z.info('swarm')]); await Z.shot(tag + 'swarm_clue');
    log.push(['swarm jar', await take(0), await hang(0, 0)]);
    await Z.wait(4);
    log.push(['swarm across', await Z.goAll(all().map((i) => [i, 21.6 + (i % 4) * 0.6, 109.4])), Z.info('swarm')]);

    // the glowcaps: three hooks, and the order matters
    r = await Z.room('glowcaps'); J = r.jr;
    await Z.tpAll(27, 99.6);
    await Z.wait(1.5); log.push(['glowcaps in', Z.info('glowcaps')]); await Z.shot(tag + 'glowcaps_clue');
    log.push(['glowcaps wall 1', await take(0), await hang(0, 0)]); await Z.wait(1.5);
    // (failed on purpose: the second wall’s hook next — the moths sit by it)
    log.push(['glowcaps straight to the last hook', await take(0), await hang(0, 2), Z.info('glowcaps'), Z.said(1)]);
    await Z.shot(tag + 'glowcaps_snatched');
    // (the far hook first: the moths go to it; then the one they guarded)
    log.push(['glowcaps decoy', await take(0), await hang(0, 1)]); await Z.wait(7); await Z.shot(tag + 'glowcaps_decoy');
    log.push(['glowcaps wall 2', await take(0), await hang(0, 2)]); await Z.wait(1.5);
    log.push(['glowcaps across', await Z.goAll(all().map((i) => [i, 21.6 + (i % 4) * 0.6, 82.6])), Z.info('glowcaps')]);
    await Z.shot(tag + 'glowcaps_done');

    // the swarm that chases
    r = await Z.room('chase'); J = r.jr;
    await Z.tpAll(14, 45.5);
    const n = Z.heroes().length;
    await Z.wait(1.5); log.push(['chase in', Z.info('chase')]); await Z.shot(tag + 'chase_clue');
    // (failed on purpose: a jar run straight to the hook by the door)
    log.push(['chase straight to the door', await take(0), await hang(0, 1), Z.info('chase'), Z.said(1)]);
    await Z.shot(tag + 'chase_snatched');
    await Z.go(0, 9, 46.5); await Z.until(() => J.swarms[0].state === 'home' && Math.hypot(J.swarms[0].x - 22, J.swarms[0].z - 29.5) < 0.5, 12);
    if (n > 1) {
      // (a party: one runs a jar the other way — the moths after it — while a friend hangs the one that counts)
      log.push(['chase bait takes a jar', await take(1), 'carrier', await take(0)]);
      await Z.goAll([[1, 16, 37]]);
      await Z.until(() => J.swarms[0].state === 'chase', 3);
      const H = J.hooks[1];
      await Z.goAll([[1, 8.5, 31], [0, H.px, H.pz + 0.15]]);
      await Z.wait(0.3);
      log.push(['chase hung by the door', H.lit, 'bait kept its jar ' + J.held.has(Z.heroes()[1])]);
    } else {
      // (a hero alone: a first jar on the near hook — the moths drink it —, a second to the door)
      log.push(['chase decoy', await take(0), await hang(0, 0)]);
      await Z.shot(tag + 'chase_decoy');
      log.push(['chase second jar', await take(0), await hang(0, 1), 'decoy still lit ' + J.hooks[0].lit]);
    }
    await Z.wait(6); await Z.shot(tag + 'chase_hung');
    log.push(['chase across', await Z.goAll(all().map((i) => [i, 21.6 + (i % 4) * 0.6, 27.6])), Z.info('chase')]);
  },
  // ---------------------------------------------------------------- 9 · THEN and NOW, and clocks that tire
  async hollowmoor(log, tag) {
    let r = await Z.room('hall');
    const plate = (ck) => [ck.x, ck.z + 1.2];
    await Z.wait(1.5); log.push(['hall in', Z.info('hall')]); await Z.shot(tag + 'hall_clue');
    await Z.go(0, ...plate(r.ck.clocks[0])); await Z.wait(1);
    log.push(['hall across', await Z.goAll(all().map((i) => [i, 21.6 + (i % 4) * 0.6, 119.3])), Z.info('hall')]);
    log.push(['hall on to the next door', await Z.goAll(all().map((i) => [i, 21.6 + (i % 4) * 0.5, 113.4])), gate('g2').open]);

    // the stairhall: a tired clock, a dash
    r = await Z.room('stairhall');
    const n = Z.heroes().length, W = r.ck.clocks[0];
    await Z.wait(1.5); log.push(['stairhall in', Z.info('stairhall')]); await Z.shot(tag + 'stairhall_clue');
    // (failed on purpose: the clock wound, a stroll instead of a dash)
    await Z.go(0, ...plate(W)); await Z.wait(0.3); await Z.shot(tag + 'stairhall_then');
    await Z.go(0, 28, 104, false); await Z.wait(n > 2 ? 1.5 : 7.5);
    log.push(['stairhall too slow', Z.info('stairhall'), Z.said(2)]);
    // (wound, and run: a hero alone has the time; a party leaves somebody on the plate)
    await Z.go(0, ...plate(W));
    if (n > 1) { log.push(['stairhall friends across', await Z.goAll(all().slice(1).map((i) => [i, 20 + i * 0.7, 98.5]))]); }
    log.push(['stairhall the last one runs', await Z.go(0, 28, 99.2), 'era ' + r.ck.era]);
    await Z.until(() => r.ck.era === 'now', 9); await Z.shot(tag + 'stairhall_now');
    log.push(['stairhall across', await Z.goAll(all().map((i) => [i, 21.6 + (i % 4) * 0.6, 87.8])), Z.info('stairhall')]);

    // the gallery: both times in the way, two tired clocks
    r = await Z.room('gallery');
    const [A, B] = r.ck.clocks;
    await Z.wait(1.5); log.push(['gallery in', Z.info('gallery')]); await Z.shot(tag + 'gallery_clue');
    if (n > 2) {
      // (failed on purpose: wound and run alone — a party’s clock does not tick that long)
      await Z.go(0, ...plate(A)); const made = await Z.go(0, 10, 36.4); await Z.wait(1);
      log.push(['gallery alone', made, Z.where(0), Z.info('gallery'), Z.said(1)]);
    }
    // (one keeps the south clock ticking; the others cross to the ledge, before the bookshelves)
    await Z.go(0, ...plate(A)); await Z.wait(0.3);
    if (n > 1) log.push(['gallery friends to the ledge', await Z.goAll(all().slice(1).map((i) => [i, 14 + i * 1.2, 36.4])), 'era ' + r.ck.era]);
    else log.push(['gallery dash', await Z.go(0, 10, 36.4), 'era ' + r.ck.era]);
    await Z.shot(tag + 'gallery_ledge');
    if (n > 1) {
      // (the clock let go: NOW — no more shelves; a friend winds the north clock for the one behind)
      await Z.go(0, 10, 46); await Z.until(() => r.ck.era === 'now', 9);
      log.push(['gallery north', await Z.goAll(all().slice(1).map((i) => [i, 24 + i * 1.2, 33]))]);
      await Z.go(1, ...plate(B)); await Z.wait(0.3);
      log.push(['gallery the one behind crosses', await Z.go(0, 10, 36.4), 'era ' + r.ck.era]);
      await Z.shot(tag + 'gallery_swap');
      await Z.go(1, 30, 33); await Z.until(() => r.ck.era === 'now', 9);
      log.push(['gallery all north', await Z.go(0, 22, 33)]);
    } else { await Z.until(() => r.ck.era === 'now', 12); await Z.go(0, 30, 33); }
    // (THEN again for the last door: wound from the north — whoever winds it runs last)
    await Z.go(n > 1 ? 1 : 0, ...plate(B)); await Z.wait(0.3); await Z.shot(tag + 'gallery_door');
    if (n > 1) log.push(['gallery through the door', await Z.goAll(all().filter((i) => i !== 1).map((i) => [i, 20 + i * 0.8, 28]))]);
    log.push(['gallery the winder runs', await Z.go(n > 1 ? 1 : 0, 26, 28), Z.info('gallery')]);
    await Z.shot(tag + 'gallery_done');
  },
  // ---------------------------------------------------------------- 10 · the lights
  async gloomstage(log, tag) {
    let r = await Z.room('wings'), S = r.sp;
    const far = (L, x, away) => Math.abs(L.x - x) > away && Math.sign(L.dir) === Math.sign(L.path[1][0] - L.path[0][0]) * Math.sign(L.x - x);
    await Z.wait(1.5); log.push(['wings in', Z.info('wings')]); await Z.shot(tag + 'wings_clue');
    // (failed on purpose: straight up the middle)
    await Z.go(0, 22, 151); await Z.until(() => Z.heroes()[0].spottedT > 0, 8); await Z.shot(tag + 'wings_spotted');
    await Z.wait(2.5); log.push(['wings spotted', Z.info('wings'), Z.said(1)]);
    // (shadow to shadow: wait for each lane’s light to pass and go)
    await Z.goAll(all().map((i) => [i, 13.4 + i * 0.9, 155.9]));
    await Z.shot(tag + 'wings_shadow');
    await Z.until(() => far(S.lights[0], 17, 9), 12);
    await Z.goAll(all().map((i) => [i, 19.4 + i * 0.9, 147.5]));
    log.push(['wings lane 1', Z.info('wings')]);
    await Z.until(() => far(S.lights[1], 15, 9), 12);
    log.push(['wings lane 2', await Z.goAll(all().map((i) => [i, 10.6 + i * 0.9, 140.6])), Z.info('wings')]);
    log.push(['wings across', await Z.goAll(all().map((i) => [i, 14.4 + i * 0.6, 137.7])), Z.info('wings')]);
    await Z.shot(tag + 'wings_done');

    // the fly tower: the board’s dark is a dash to the next shadow, no more
    r = await Z.room('flytower', 1.6); S = r.sp;
    await Z.quiet(); await Z.wait(1);
    log.push(['flytower in', Z.info('flytower')]); await Z.shot(tag + 'flytower_clue');
    const n = Z.heroes().length, others = all().slice(1), act = () => r.act && r.act.on && r.act.t % 17 < 6;
    const shadow2 = (i) => [31.2 + (i % 2) * 0.9, 46.9 + (i > 1 ? 0.35 : 0)], out = (i) => [33.6 + (i % 2) * 0.7, 39.7 + (i > 1 ? 0.3 : 0)];
    // (failed on purpose: the lights put out, and a stroll up the tower — the dark does not last)
    await Z.go(0, S.board.x, S.board.z); await Z.wait(0.1);
    await Z.go(0, 33, 60, false); await Z.until(() => Z.heroes()[0].spottedT > 0, 9); await Z.shot(tag + 'flytower_spotted');
    await Z.until(() => !(Z.heroes()[0].spottedT > 0), 3); await Z.wait(0.5);
    log.push(['flytower caught in the first lane', Z.where(0), Z.info('flytower'), Z.said(1)]);
    await Z.goAll(all().map((i) => [i, 33 + (i % 2) * 0.9, 65.8 + (i > 1 ? 0.7 : 0)]));
    await Z.go(0, S.board.x, S.board.z); await Z.wait(0.3); await Z.shot(tag + 'flytower_dark');
    if (n > 1) {
      // (a party: one stays on the plate; the others walk to the second row of flats, wait for
      // the Understudies to have the follow-spot, and go)
      log.push(['flytower friends to the shadow', await Z.goAll(others.map((i) => [i, ...shadow2(i), false])), 'lights out ' + (S.dark > 0)]);
      await Z.shot(tag + 'flytower_shadow');
      await Z.until(act, 20);
      log.push(['flytower friends across', await Z.goAll(others.map((i) => [i, ...out(i)])), Z.info('flytower')]);
      // (the one on the plate: the old way — a lane at a time, behind each light as it goes by)
      await Z.go(0, 34.6, 64);
      await Z.until(() => S.dark <= 0 && far(S.lights[0], 33, 6), 14);
      log.push(['flytower holder lane 1', await Z.go(0, 33.4, 56.6)]);
      await Z.until(() => far(S.lights[1], 33, 6), 14);
      log.push(['flytower holder lane 2', await Z.go(0, ...shadow2(1))]);
    } else {
      // (a hero alone: the dark is the time of a dash to the second row of flats)
      log.push(['flytower to the shadow', await Z.go(0, ...shadow2(0)), 'dark left ' + S.dark.toFixed(1)]);
      await Z.wait(2); await Z.shot(tag + 'flytower_shadow');
    }
    await Z.until(act, 20);
    log.push(['flytower across', await Z.go(0, ...out(0)), Z.info('flytower')]);
    await Z.shot(tag + 'flytower_done');
  },
};

export async function play(id, mode = 'party', n = 4) {
  const log = [], tag = 'pz' + (mode === 'solo' ? 's' : n) + '_';
  await Z.start(mode, n, CH[id]);
  await Z.enter(id);
  await PLAYS[id](log, tag);
  const d = Z.dun(), rooms = d.rooms.filter((r) => d.puzzle(r)).map((r) => [r.id, !d.open(r) || !!r.passed || !!r.solved]);
  return { id, mode, n, rooms, log, errs: Z.errs() };
}
export function run(...a) {
  window.__pz = 'run';
  play(...a).then((r) => { window.__pz = 'done ' + JSON.stringify(r); }).catch((e) => { window.__pz = 'err ' + e + ' ' + String((e && e.stack) || '').slice(0, 500); });
  return 'started';
}
// Help, by degrees, in every puzzle room: the heroes walk in and do nothing at all — the room’s
// order is the objective, then its plainer word comes, then the arrows (a picture of each:
// screenshots/pzh_<room>.png). → window.__pz: 'done [[room, order, the word, when, arrows, when]…]'
// (`quick`: help after 4 and 9 seconds instead of each room’s own minute or two — the waits
// themselves are tried in the plays above)
export function helpTour(mode = 'party', n = 4, ids = Object.keys(CH), quick = true) {
  window.__pz = 'run';
  (async () => {
    const out = [];
    for (const id of ids) {
      window.__pz = 'run ' + id;
      await Z.start(mode, n, CH[id]); await Z.enter(id);
      const d = Z.dun();
      for (const r of d.rooms.filter((q) => d.puzzle(q))) {
        if (quick) r.hintAt = [4, 9];
        await Z.room(r.id); await Z.quiet(); await Z.wait(1);
        const row = [id + '/' + r.id, Z.info(r.id).obj];
        const ok1 = await Z.until(() => r.helped >= 1, 200, true);
        row.push(r.hint ? Z.info(r.id).obj : '(arrows at once)', ok1 ? Math.round(r.stuck) : 'never');
        // (some rooms have no arrow to show: their last help is of another kind — the wind
        // drops, the lights slow down)
        const ok2 = await Z.until(() => d.arrows.some((m) => m.visible) || r.helped >= 2, 200, true);
        await Z.until(() => d.arrows.some((m) => m.visible), 6);
        await Z.wait(0.3);
        row.push(Z.info(r.id).arrows || '(none)', ok2 ? Math.round(r.stuck) : 'never', r.fails || 0);
        await Z.shot('pzh_' + r.id);
        out.push(row);
      }
    }
    window.__pz = 'done ' + JSON.stringify(out) + ' errs ' + JSON.stringify(Z.errs());
  })().catch((e) => { window.__pz = 'err ' + e + ' ' + String((e && e.stack) || '').slice(0, 400); });
  return 'started';
}
// several dungeons, one after another, with the same party (or the same hero alone):
//   Y.runAll('solo', 1)  ·  window.__pz: 'run <id>' · 'done […]' — each one’s result in window.__pzs
export function runAll(mode = 'party', n = 4, ids = Object.keys(CH)) {
  window.__pz = 'run'; window.__pzs = {};
  (async () => {
    for (const id of ids) {
      window.__pz = 'run ' + id;
      try { window.__pzs[id] = await play(id, mode, n); } catch (e) { window.__pzs[id] = { id, err: String(e) + ' ' + String((e && e.stack) || '').slice(0, 300) }; }
    }
    window.__pz = 'done ' + JSON.stringify(Object.values(window.__pzs).map((r) => [r.id, r.err || r.rooms, r.errs]));
  })();
  return 'started';
}
