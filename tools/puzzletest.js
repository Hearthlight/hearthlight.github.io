// The dungeons’ puzzle rooms played by hand, for the browser pane — the way players would:
// heroes walk (3.3 tiles a second) or run (5.4) round the walls, slowed by water or a jar,
// and step only on what they mean to step on; nothing is solved by reaching into a room’s state.
//   const Z = await import('/tools/puzzletest.js');
//   await Z.start('party', 4, 6);        // four bot phones (or 'solo', 1), the story at chapter 6
//   await Z.enter('forgeheart');         // into its dungeon, the story at the step that waits there
//   await Z.room('pressure');            // everyone by the room’s south door
//   await Z.go(0, 13.4, 117.6);          // hero 0 runs there (the dungeon’s own tiles); false: no way
//   await Z.goAll([[0, 16, 115.6], [1, 28, 115.6]]);   // several at once
//   await Z.wait(2); await Z.shot('pressure');
//   Z.info('pressure')                   // the room’s state, as words
//   Z.plays('forgeheart', 'party', 4)    // a whole dungeon’s puzzles: failed on purpose, then
//                                        // solved from their clues — poll window.__pz
// Frames are stepped by hand (the pane may be hidden).

const g = () => window.game;
const D = () => window.game.debug;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let V = null, T = null;

// A hidden pane’s timers are slowed to one a second — then one a minute: the bots’ little waits
// (and the harness’s) would take hours. Timers kept by a worker run on time: call this once per
// page, before a long run (`start` does). Tests only; the game itself is not touched.
export function unthrottle() {
  if (window.__timers) return;
  const src = 'const T = new Map(); onmessage = (e) => { const [id, ms] = e.data; if (ms < 0) { clearTimeout(T.get(id)); T.delete(id); } else T.set(id, setTimeout(() => { T.delete(id); postMessage(id); }, ms)); };';
  const w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
  const cbs = new Map(), st = window.setTimeout.bind(window), ct = window.clearTimeout.bind(window);
  let n = 1e9;
  w.onmessage = (e) => { const f = cbs.get(e.data); cbs.delete(e.data); if (f) f(); };
  window.setTimeout = (fn, ms = 0, ...a) => { if (typeof fn !== 'function') return st(fn, ms); const id = ++n; cbs.set(id, () => fn(...a)); w.postMessage([id, +ms || 0]); return id; };
  window.clearTimeout = (id) => { if (cbs.has(id)) { cbs.delete(id); w.postMessage([id, -1]); } else ct(id); };
  window.__timers = true;
}

export const P = () => (g().mode === 'party' ? g().party : g().world.wild);
export const saga = () => P().saga;
export const dun = () => saga().dungeons.cur;
export const heroes = () => P().players.filter((p) => p.connected || P().solo);
export const toasts = [];

export async function start(mode = 'party', n = 4, ch = 1, cls = 'knight') {
  unthrottle();
  // (once a page: the party, or the hero alone; then any chapter, one after another)
  if (!V) {
    V = window.V = await import('/tools/sagatest.js?' + Date.now());
    await V.ready();
    // (a reloaded page picks its party up again: a hero alone starts from the title)
    if (mode === 'solo' && g().mode === 'party' && g().party) { g().party.exit(); g().toTitle(); await D().step(10, 1 / 60); }
    if (mode === 'solo') await V.solo(cls);
    else {
      await V.ready(); V.watchErrors();
      T = window.T = await import('/tools/partybots.js?' + Date.now());
      await T.boot(n); await T.autoplay('saga', [], { until: () => true });
    }
    await quiet();
    // (every word the game says while we play: the hints are among them)
    const Pp = P(), was = Pp.toast.bind(Pp);
    Pp.toast = (text, ...a) => { toasts.push(String(text)); return was(text, ...a); };
  }
  const S = saga();
  if (S.dungeons.cur) { S.dungeons.exit(); for (let i = 0; i < 200 && (S.dungeons.leaving || S.dungeons.cur); i++) { await D().step(6, 1 / 60); await sleep(10); } }
  toasts.length = 0;
  await V.toChapter(ch);
  await quiet();
  for (const p of heroes()) if (p.fighter) p.fighter.inv = 999;
  return heroes().length;
}

// (a scene under way: read to its end)
export async function quiet() {
  const dlg = () => (g().mode === 'party' ? g().party.dialogue : g().dialogue);
  for (let k = 0; k < 8; k++) {
    await V.play(1500, { until: () => !V.stage().active && !dlg().cur && !saga().busyTalk && !saga().running });
    await D().step(30, 1 / 60);
    if (!V.stage().active && !dlg().cur) break;
  }
}

export async function enter(id) {
  const S = saga();
  // (the story at the step that waits in this dungeon: its rooms’ lines are the objective)
  const { QUESTS } = await import('/src/saga/chapters/index.js');
  for (const [qid, Q] of Object.entries(QUESTS)) {
    const k = Q.steps.findIndex((st) => st.do === 'dungeon' && st.id === id);
    if (k < 0) continue;
    for (const [oid, O] of Object.entries(QUESTS)) if (oid !== qid && S.st.q[oid] && !S.st.q[oid].done && O.kind !== 'side') S.st.q[oid] = { s: O.steps.length, done: true, day: 1 };
    S.st.q[qid] = { s: k, n: 0, day: 1 };
    S.refreshCard();
  }
  if (S.dungeons.cur) { S.dungeons.exit(); for (let i = 0; i < 200 && (S.dungeons.leaving || S.dungeons.cur); i++) { await D().step(6, 1 / 60); await sleep(10); } }
  S.dungeons.enter(id);
  for (let i = 0; i < 200 && (S.dungeons.entering || !S.dungeons.cur); i++) { await D().step(6, 1 / 60); await sleep(20); }
  await wait(1);
  for (const p of heroes()) if (p.fighter) p.fighter.inv = 999;
  return dun() && dun().def.id;
}

const setPos = (p, x, z) => { if (P().solo) { const w = g().world; w.player.pos.x = x; w.player.pos.z = z; } else { p.actor.pos.x = x; p.actor.pos.z = z; } };
const snap = () => { if (P().solo) g().world.snapCamera(); else P().cam.snap(P().camPlayers()); };

// everyone to a spot of the dungeon (its own tiles), in a little crowd
export async function tpAll(x, z) {
  const d = dun(), n = heroes().length;
  heroes().forEach((p, i) => setPos(p, d.ox + x + (i % 4) * 0.7 - (Math.min(4, n) - 1) * 0.35, d.oz + z + Math.floor(i / 4) * 0.7));
  snap();
  await D().step(4, 1 / 60);
}
export async function tp(i, x, z) { const d = dun(); setPos(heroes()[i], d.ox + x, d.oz + z); await D().step(2, 1 / 60); }
// by a room’s south door (where the heroes walk in)
export async function room(id, dz = 2.2) { const r = dun().roomById(id); await tpAll(r.x + r.w / 2, r.z + r.h - dz); await sleep(150); await D().step(10, 1 / 60); return r; }

// (a long wait — for help to come — is stepped in bigger frames: nobody moves)
export async function wait(sec) {
  if (sec > 8) { for (let k = 0; k < sec * 20; k += 4) { await D().step(4, 1 / 20); if (k % 40 === 0) await sleep(1); } return; }
  for (let f = 0; f < sec * 60; f += 6) { await D().step(6, 1 / 60); if (f % 60 === 0) await sleep(1); }
}
export async function until(fn, sec = 20, coarse = false) {
  if (coarse) { for (let k = 0; k < sec * 20 && !fn(); k += 2) { await D().step(2, 1 / 20); if (k % 40 === 0) await sleep(1); } return !!fn(); }
  for (let f = 0; f < sec * 60 && !fn(); f += 3) { await D().step(3, 1 / 60); if (f % 60 === 0) await sleep(1); }
  return !!fn();
}

// what a room has that acts when stepped on: [x, z, radius] — a hero on the way somewhere
// else walks round them all
export function triggers(r) {
  const out = [];
  for (const tb of r.tb || []) out.push([tb.x, tb.z, 1.5]);
  for (const b of r.sb || []) out.push([b.x, b.z, 1.2]);
  if (r.pn) { for (const L of r.pn.levers) out.push([L.x, L.z, 1.1]); out.push([r.pn.go.x, r.pn.go.z, 1.1]); }
  if (r.tide) for (const b of r.tide.bells) out.push([b.x, b.z, b.great ? 1.7 : 1.1 * (r.bellScale || 1)]);
  for (const v of r.vt || []) { out.push([v.x, v.z, 1.0]); if (v.lever) out.push([v.lever.x, v.lever.z, 1.1]); }
  if (r.bm) for (const pl of r.bm.plates) out.push([pl.x, pl.z, 0.68]);
  if (r.jr) { for (const R of r.jr.racks) out.push([R.x, R.z + 0.6, 1.1]); for (const H of r.jr.hooks) out.push([H.px, H.pz, 0.92]); for (const S of r.jr.swarms) out.push([S.x, S.z, S.r + 0.3]); }
  if (r.ck) for (const ck of r.ck.clocks) out.push([ck.x, ck.z + 1.2, 0.72]);
  if (r.sp && r.sp.board) out.push([r.sp.board.x, r.sp.board.z, 0.72]);
  return out;
}

// a way from a hero to a spot, round the walls and round everything that acts when stepped on
// (but what stands at the spot itself, or under the hero’s feet): [[x, z]…] in world tiles, or null
export function wayTo(p, tx, tz, avoid) {
  const d = dun(), K = 4, Dn = P().dungeons, x0 = d.ox, z0 = d.oz, W = d.W * K, H = d.H * K;
  const sx = Math.round((p.pos.x - x0) * K), sz = Math.round((p.pos.z - z0) * K), ex = Math.round((tx - x0) * K), ez = Math.round((tz - z0) * K);
  // (standing inside one of them — a swarm settled on the hook just used: out by the shortest
  // way, never deeper in)
  const zones = avoid.filter(([ax, az, ar]) => Math.hypot(tx - x0 - ax, tz - z0 - az) > ar).map(([ax, az, ar]) => [ax, az, Math.min(ar, Math.hypot(p.pos.x - x0 - ax, p.pos.z - z0 - az) - 0.15)]);
  // (a little wider than a hero: the game itself keeps them that far off walls and water)
  const bad = (cx, cz) => { const lx = cx / K, lz = cz / K; return Dn.blocked(x0 + lx, z0 + lz, 0.42) || zones.some(([ax, az, ar]) => Math.hypot(lx - ax, lz - az) < ar); };
  const prev = new Map(), key = (x, z) => z * W + x, q = [[sx, sz]], tight = Dn.blocked(p.pos.x, p.pos.z, 0.42);
  prev.set(key(sx, sz), -1);
  for (let h = 0; h < q.length && h < 200000; h++) {
    const [x, z] = q[h];
    if (x === ex && z === ez) break;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + dx, nz = z + dz, k = key(nx, nz);
      if (nx < 0 || nz < 0 || nx >= W || nz >= H || prev.has(k)) continue;
      // (the last step is onto the spot itself; the first ones out of a tight spot, for a hero
      // the test put down against a prop)
      if (!(nx === ex && nz === ez) && !(tight && Math.hypot(nx - sx, nz - sz) <= 3) && bad(nx, nz)) continue;
      prev.set(k, key(x, z)); q.push([nx, nz]);
    }
  }
  if (!prev.has(key(ex, ez))) return null;
  const pts = [[tx, tz]];
  for (let k = prev.get(key(ex, ez)); k !== -1 && k !== undefined; k = prev.get(k)) pts.push([x0 + (k % W) / K, z0 + Math.floor(k / W) / K]);
  pts.pop();
  return pts.reverse();
}

// heroes walk or run, all at once: [[i, x, z, run = true]…] (the dungeon’s own tiles). A hero
// stops when something else moves it (a throw, a fall, a stagehand, a swarm). → who arrived
export async function goAll(list, { max = 40, avoid = null } = {}) {
  const d = dun(), hs = heroes(), done = list.map(() => null);
  // (round the friends who stand still, too: heroes do not walk through one another)
  const still = hs.filter((p, i) => !list.some((q) => q[0] === i)).map((p) => [p.pos.x - d.ox, p.pos.z - d.oz, 0.62]);
  const plan = ([i, x, z]) => {
    const r = d.roomAt(hs[i].pos.x, hs[i].pos.z) || d.roomAt(d.ox + x, d.oz + z);
    return wayTo(hs[i], d.ox + x, d.oz + z, [...(avoid || (r ? triggers(r) : [])), ...still]);
  };
  const ways = list.map(plan);
  ways.forEach((w, k) => { if (!w) done[k] = false; });
  const last = list.map(() => null), held = [], best = list.map(() => [1e9, 0]);
  for (let f = 0; f < max * 60 && done.some((v) => v === null); f++) {
    list.forEach(([i, , , run = true], k) => {
      if (done[k] !== null) return;
      const p = hs[i], a = p.actor, w = ways[k];
      if (p.flight || p.spottedT > 0) { done[k] = false; return; }
      let left = ((run ? 5.4 : 3.3) * (a.speedMul ?? 1) * (a.zoneSlow ?? 1)) / 60, x = p.pos.x, z = p.pos.z;
      while (left > 0 && w.length) {
        const [wx, wz] = w[0], L = Math.hypot(wx - x, wz - z);
        if (L <= left) { x = wx; z = wz; left -= L; w.shift(); } else { x += ((wx - x) / L) * left; z += ((wz - z) / L) * left; left = 0; }
      }
      setPos(p, x, z);
      last[k] = [x, z];
      if (!w.length) done[k] = true;
    });
    await D().step(1, 1 / 60);
    // (moved by the game. Far: sent back, thrown — the walk is over. A little: nudged by a
    // friend, pushed out of a cloud of moths — the way is looked for again from there; six
    // seconds without getting any nearer, and the hero gives up)
    list.forEach((q, k) => {
      const p = hs[q[0]];
      if (done[k] !== null || !last[k]) return;
      const off = Math.hypot(p.pos.x - last[k][0], p.pos.z - last[k][1]), left = Math.hypot(p.pos.x - d.ox - q[1], p.pos.z - d.oz - q[2]);
      if (off > 1.2) { done[k] = false; return; }
      if (off > 0.02 && (held[k] = (held[k] || 0) + 1) % 8 === 1) { const w = plan(q); if (w) ways[k] = w; }
      if (left < best[k][0] - 0.05) best[k] = [left, f]; else if (f - best[k][1] > 360) done[k] = false;
    });
    if (f % 30 === 0) await sleep(1);
  }
  return done.map((v) => v === true);
}
export async function go(i, x, z, run = true, opts) { return (await goAll([[i, x, z, run]], opts))[0]; }

export async function shot(name, scale = 2) { await sleep(150); await D().step(1, 1 / 60); await D().shot(name, scale); return name; }
export function where(i = 0) { const d = dun(), p = heroes()[i]; return [+(p.pos.x - d.ox).toFixed(1), +(p.pos.z - d.oz).toFixed(1)]; }

export function info(id) {
  const d = dun(), r = d.roomById(id), o = { kind: r.kind, solved: !!r.solved, passed: !!r.passed, hint: r.helped || 0, stuck: +(r.stuck || 0).toFixed(0), fails: r.fails || 0 };
  o.gates = (r.opens || []).map((gid) => gid + (d.gate(gid).open ? ':open' : ':shut')).join(' ');
  o.who = heroes().map((p) => [+(p.pos.x - d.ox).toFixed(1), +(p.pos.z - d.oz).toFixed(1)].join(',')).join(' ');
  const ob = saga().objective();
  o.obj = ob ? ob.lines[0] : null;
  o.arrows = d.arrows.filter((m) => m.visible).map((m) => [+m.position.x.toFixed(1), +m.position.z.toFixed(1)].join(',')).join(' ');
  return o;
}
// Everything a hero has to step on or up to, in the dungeon we are in: can it be reached on
// foot? → [[room, what, how near a hero can stand, how near it has to be]…], the ones that
// cannot first (a lever set down outside a round room’s floor, a bell behind a pool…)
export function audit() {
  const d = dun(), Dn = P().dungeons, out = [];
  const near = (x, z) => { let b = 9; for (let dx = -2; dx <= 2; dx += 0.05) for (let dz = -2; dz <= 2; dz += 0.05) if (Math.hypot(dx, dz) < b && !Dn.blocked(d.ox + x + dx, d.oz + z + dz, 0.38)) b = Math.hypot(dx, dz); return +b.toFixed(2); };
  const add = (r, what, x, z, need) => out.push([r.id, what, near(x, z), need]);
  for (const r of d.rooms) {
    for (const tb of r.tb || []) add(r, 'brazier', tb.x, tb.z, 1.35);
    for (const b of r.sb || []) add(r, 'bell', b.x, b.z, 1.05);
    if (r.pn) { for (const L of r.pn.levers) add(r, 'lever ' + L.id, L.x, L.z, 0.95); add(r, 'button', r.pn.go.x, r.pn.go.z, 0.95); }
    if (r.tide) for (const b of r.tide.bells) add(r, 'tide bell', b.x, b.z, b.great ? 1.6 : r.bellScale || 1);
    for (const v of r.vt || []) { add(r, 'vent ' + v.k, v.x, v.z, 0.9); if (v.lever) add(r, 'lid lever ' + v.k, v.lever.x, v.lever.z, 0.95); }
    if (r.bm) { r.bm.plates.forEach((pl, k) => add(r, 'mirror plate ' + k, pl.x, pl.z, 0.55)); if (r.bm.dawn) r.bm.dawn.plates.forEach((pl) => add(r, 'dawn plate ' + pl.k, pl.x, pl.z, 0.55)); }
    if (r.jr) { r.jr.racks.forEach((R, k) => add(r, 'rack ' + k, R.x, R.z + 0.6, 1)); r.jr.hooks.forEach((H, k) => add(r, 'hook ' + k, H.px, H.pz, 0.8)); }
    if (r.ck) r.ck.clocks.forEach((ck, k) => add(r, 'clock plate ' + k, ck.x, ck.z + 1.2, 0.6));
    if (r.sp && r.sp.board) add(r, 'lighting board', r.sp.board.x, r.sp.board.z, 0.6);
    for (const pl of d.plates.filter((q) => q.r === r)) add(r, 'plate', pl.x, pl.z, 0.75);
  }
  return out.sort((a, b) => (b[2] - b[3]) - (a[2] - a[3]));
}
export const errs = () => (window.__errs || []).slice(-10);
export const said = (n = 6) => toasts.slice(-n);
