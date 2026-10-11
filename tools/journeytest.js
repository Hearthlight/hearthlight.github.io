// The story’s journeys played by themselves (saga/aboard.js: the heroes aboard a craft, and an
// arrival where nobody drifts) — for the browser pane, with ?debug=1:
//   const J = await import('/tools/journeytest.js');
//   J.start('party', 4);                       // every journey, four bot phones; poll window.__jt
//   J.start('party', 8, ['balloon', 'temple']);
//   J.start('solo', 1, ['balloon'], { how: 'skip' });
//   J.awake(); J.brisk();                      // before a long sagarun in a hidden pane (see below)
// Every stick is held (each bot its own way) from before the scene to after it; `how`: 'read'
// (each line read, then turned), 'mash' (A hammered: the lines fly by), 'skip' (the host skips
// once the craft is under way); `camera`: 'together' · 'seats' · 'groups'; `swim`: how many
// heroes are in the water when it starts (the ones a current used to carry off on arrival);
// `film: [from, to, every]`: a close-up every few frames (the hops in and out, a wave, a grip).
// Pictures: screenshots/jt_<mode><n>_<journey>_mid.png and …_arr.png (each with its _zoom, from
// close by). The result, for each journey: the frames it took, how far anybody moved between
// landing and the scene’s end (`drift`) and once the sticks were let go (`after`), who is
// hidden, away, in the water or in a wall, how far apart they stand, who the one picture has
// lost (`strays`), a question or a vehicle their landing set off (`vote`, `rides`), and `ok`.

import { THREE } from '../src/render/r3d.js';

const _v = new THREE.Vector3();
const g = () => window.game;
const D = () => window.game.debug;
// (a turn of the event loop — sockets, the paint workers — that a hidden pane does not slow down as it does timers)
const turn = () => new Promise((r) => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
const sleep = async (ms) => { const end = performance.now() + ms; while (performance.now() < end) await turn(); };

// A hidden pane lets a timer fire once a second at best (once a minute after a while): the bots’
// taps, the tools’ little waits and a whole replay crawl. `awake()` gives the page short timers
// of its own, spun on the event loop — for a test session only (call it before sagarun too).
export function awake() {
  if (window.__awake) return;
  window.__awake = true;
  const real = window.setTimeout.bind(window), clear = window.clearTimeout.bind(window), off = new Set();
  let ids = 1e9;
  window.setTimeout = (fn, ms = 0, ...args) => {
    if (typeof fn !== 'function' || ms > 4000) return real(fn, ms, ...args);
    const id = ids++, end = performance.now() + ms, c = new MessageChannel();
    c.port1.onmessage = () => { if (off.delete(id)) return; if (performance.now() >= end) fn(...args); else c.port2.postMessage(0); };
    c.port2.postMessage(0);
    return id;
  };
  window.clearTimeout = (id) => { if (id >= 1e9) off.add(id); else clear(id); };
}
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]];
const KEYS = ['KeyD'];

// the journeys: the chapter to be in, the quest step whose script it is (or `fly`: a line of the
// world), where the heroes stand when it starts, the scene’s marks to picture
export const JOURNEYS = {
  post: { ch: 2, q: 'c2_trees', i: 3, at: [88, -25], mid: 'pelicanFlight', arr: 'pelicanLanding' },
  chase: { ch: 3, q: 'c3_chase', i: 0, at: [-197, 91], mid: 'cartChase', midWait: 170, arr: 'yard' },
  balloon: { ch: 4, q: 'c4_cloud', i: 0, at: [386.5, -66], mid: 'balloonFlight', arr: 'cloudHarbour' },
  nest: { ch: 5, q: 'c5_lagoon', i: 0, at: [-148, 176], mid: 'boatRide', arr: 'boatLanding' },
  forum: { ch: 5, q: 'c5_clapper', i: 0, at: [231.6, 211], mid: 'boatRide', arr: 'boatLanding', swim: 1 },
  temple: { ch: 5, q: 'c5_temple', i: 0, at: [30.5, 213.5], mid: 'boatRide', arr: 'boatLanding', swim: 2 },
  flak: { ch: 6, q: 'c6_flak', i: 0, at: [91.5, 247], mid: 'flak', arr: 'crash', swim: 2 },
  crossing: { ch: 7, q: 'c7_cross', i: 1, at: [475, 218], mid: 'crossing', arr: 'whaleBack' },
  spout: { ch: 7, q: 'c7_whale', i: 1, at: [600, 62], mid: 'spout', arr: 'lanternport' },
  teacup: { ch: 8, fly: async (S) => { const { MASTS } = await import('/src/saga/teacup.js'); return S.teacup.fly(MASTS[1], MASTS[0]); }, at: [776, 69], mid: 'teacupFlight', arr: 'teacupLanding', swim: 1 },
  teacupBack: { ch: 8, fly: async (S) => { const { MASTS } = await import('/src/saga/teacup.js'); return S.teacup.fly(MASTS[0], MASTS[1]); }, at: [474, 218], mid: 'teacupFlight', arr: 'teacupLanding' },
  pelican: { ch: 4, fly: (S) => { const a = S.post.byId('marigold'), b = S.post.byId('breezy'); S.post.find(a, true); S.post.find(b, true); return S.post.fly(a, b); }, at: null, mid: 'pelicanFlight', arr: 'pelicanLanding' },
  // (not a journey: a scene that hides the heroes to show somewhere else — here with two of them
  // swimming in the straits’ current when it starts: they must be where they were when it ends)
  fired: { ch: 8, q: 'c8_fired', i: 0, at: [474, 218.5], mid: 'fired', arr: 'tumble', swim: 2, plain: true },
  boarding: { ch: 10, q: 'c10_finale', i: 1, at: [1350, 101], mid: 'searchlights', arr: 'boarding', dungeon: true },
};

// A long replay cares for what happens more than for every picture: `brisk(n)` draws one stepped
// frame in n (a screenshot still draws its own) — several times faster through wooded lands.
export function brisk(n = 5) {
  if (window.__brisk) return;
  window.__brisk = true;
  const G = g(), draw = G.draw.bind(G), frame = G.frame.bind(G);
  let k = 0, stepping = false;
  G.frame = (dt) => { stepping = true; try { frame(dt); } finally { stepping = false; } };
  G.draw = () => { if (!stepping || ++k % n === 0) draw(); };
}

const party = () => g().mode === 'party';
const host = () => (party() ? g().party : g().world.wild);
const heroes = () => { const P = host(); return P.players.filter((p) => p.connected || P.solo); };

async function calm(V) {
  const P = host(), S = V.saga();
  for (let k = 0; k < 300 && (P.stage.active || P.dialogue.cur || P.dialogue.active || S.running || S.busyTalk || P.vote); k++) {
    if (P.stage.active) P.stage.skip();
    // (a question left open — a roost’s bell rung by a bot hammering A: « stay here », its last answer)
    if (party() && P.vote) { const v = P.vote; for (const p of P.players) if (p.connected) P.onVotePick(p, { id: v.id, i: v.options.length - 1 }); }
    const c = P.dialogue.cur;
    if (c) { if (party()) { if (c.choices) P.dialogue.pick(0); else P.dialogue.skip(); } else await D().key('KeyE', 2); }
    await D().step(6, 1 / 60); await turn();
  }
}

function place(spots) {
  const P = host();
  heroes().forEach((p, k) => { const s = spots[k % spots.length]; p.actor.pos = { x: s[0], z: s[1] }; p.actor.vel = { x: 0, z: 0 }; if (p.fighter) p.fighter.inv = 999; });
  if (P.cam && P.cam.snap) P.cam.snap(P.camPlayers ? P.camPlayers() : null);
}

// one journey; returns its report
export async function run(name, { how = 'read', swim = null, shots = true, tag = '', film = null } = {}) {
  const V = window.V, T = window.T, P = host(), S = V.saga(), J = JOURNEYS[name];
  const { QUESTS } = await import('/src/saga/chapters/index.js');
  await V.toChapter(J.ch);
  await calm(V);
  const hs = heroes(), n = hs.length;
  let at = J.at;
  if (!at) { const R = S.post.byId('marigold'); at = [R.x, R.z + 1.5]; }
  // where they stand: a little crowd — and `wet` of them in the nearest water
  const wet = Math.min(n > 1 ? n - 1 : 1, swim == null ? J.swim || 0 : swim), spots = [];
  for (let k = 0; k < n; k++) spots.push([at[0] + (k % 3) * 0.9 - 0.9, at[1] + Math.floor(k / 3) * 0.9]);
  if (wet && P.swim) {
    const water = [];
    for (let r = 1; r < 12 && water.length < wet; r += 0.5) for (let a = 0; a < 16 && water.length < wet; a++) {
      const x = at[0] + Math.cos(a * 0.3927) * r, z = at[1] + Math.sin(a * 0.3927) * r;
      if (P.swim.isWater(x, z) && P.swim.isWater(x + 0.4, z) && P.swim.isWater(x - 0.4, z) && water.every((q) => Math.hypot(q[0] - x, q[1] - z) > 0.8)) water.push([x, z]);
    }
    water.forEach((q, k) => { spots[n - 1 - k] = q; });
  }
  place(spots);
  await D().step(30, 1 / 60); await sleep(250); await D().step(30, 1 / 60);
  const swimmers = hs.filter((p) => p.swimming).length;
  // the sticks, held from now on
  if (party()) T.bots.forEach((b, k) => T.stick(b, DIRS[k % 8][0], DIRS[k % 8][1])); else for (const k of KEYS) g().input.keys.add(k);
  await sleep(120); await D().step(2, 1 / 60);
  const pre = `jt_${party() ? 'party' : 'solo'}${n}${tag}_${name}`;
  const rep = { name, n, how, swimmers, frames: 0, marks: [], lines: 0, drift: 0, after: 0 };
  let done = false, err = null;
  const step = J.q ? QUESTS[J.q].steps[J.i] : null;
  Promise.resolve(step ? step.run(S, hs[0]) : J.fly(S)).then(() => { done = true; }, (e) => { done = true; err = String(e && e.stack || e); });
  const pos = () => hs.map((p) => [p.pos.x, p.pos.z]);
  // (from close by: the craft and who is in it — or the little crowd where it landed)
  const zoom = async (file, aboard) => {
    const tr = P.stage.trip, d = g().display, c = new THREE.Vector3();
    // (several craft strung out along a line: the first of them)
    const rs = aboard && tr ? tr.riders.filter((r) => r.craft === tr.riders[0].craft) : [];
    if (rs.length) { for (const r of rs) { r.holder.getWorldPosition(_v); c.add(_v); } c.multiplyScalar(1 / rs.length); }
    else { for (const p of hs) c.add(_v.set(p.pos.x, 0.8, p.pos.z)); c.multiplyScalar(1 / hs.length); }
    const v = party() ? P.cam.views[0] : P.view, q = v && v.project ? v.project(c.x, c.y, c.z) : null;
    const ox = (d.devW - d.ww * d.wscale) / 2 / d.wscale, oy = (d.devH - d.wh * d.wscale) / 2 / d.wscale, w = 150, h = 100;
    if (q) await D().shot(file, 6, [ox + Math.max(0, Math.min(d.ww - w, Math.round(q.x - w / 2))), oy + Math.max(0, Math.min(d.wh - h, Math.round(q.y - h / 2 - 8))), w, h]);
  };
  let f = 0, landed = null, last = null, skipped = false, mashT = 0, asked = 0, begun = false;
  for (; f < 9000 && !done; f += 2) {
    await D().step(2, 1 / 60);
    if (f % 30 === 0) await turn();
    // (a question opened over the scene, or as it ended: whose bell was within reach of A?)
    if (party() && P.vote && !asked) asked = P.vote.title + ' @' + f;
    // (`film: [from, to, every]`: a close-up every few frames — the hops in and out, a wave, a grip)
    if (film && f >= film[0] && f <= film[1] && (f - film[0]) % film[2] === 0) await zoom(pre + '_film' + String(f).padStart(4, '0'), !!(P.stage.trip && P.stage.trip.riders.some((r) => r.holder.visible)));
    if (window.__mark) {
      const m = window.__mark; window.__mark = null; rep.marks.push(m + '@' + f);
      const which = m === J.mid ? 'mid' : m === J.arr ? 'arr' : null;
      if (which === 'mid' && how === 'skip' && !skipped) { skipped = true; P.stage.skip(); }
      if (which && shots && !(how === 'skip')) {
        const wait = which === 'mid' ? J.midWait || 24 : 40;
        await sleep(which === 'arr' ? 400 : 140); await D().step(wait, 1 / 60); f += wait; await sleep(60);
        await D().shot(pre + '_' + which, 2);
        await zoom(pre + '_' + which + '_zoom', which === 'mid');
      }
      // (down for good: the last of them has finished their hop out of the craft)
      if (which === 'arr') { for (let k = 0; k < 90 && P.stage.trip && P.stage.trip.out.length; k++) { await D().step(2, 1 / 60); f += 2; } landed = pos(); }
    }
    // (once they are down, nobody moves until the scene’s last line)
    if (landed && P.stage.active) { last = pos(); rep.drift = Math.max(rep.drift, ...last.map((q, k) => Math.hypot(q[0] - landed[k][0], q[1] - landed[k][1]))); }
    const c = P.dialogue.cur;
    // (hammering A: from the scene’s first frame — not before: at a mast’s foot, A rings its bell)
    begun = begun || P.stage.active || !!c;
    if (how === 'mash' && begun) { if (party()) { if ((mashT += 2) % 6 === 0) T.tap(T.bots[(mashT / 6) % T.bots.length], 'a'); if (c && c.choices && c.shown >= c.total) P.dialogue.pick(0); } else if (f % 6 === 0) D().key('KeyE', 2); }
    else if (c && c.shown >= c.total) {
      rep.lines++;
      if (how === 'read') { await D().step(70, 1 / 60); f += 70; if (landed && P.stage.active) { last = pos(); rep.drift = Math.max(rep.drift, ...last.map((q, k) => Math.hypot(q[0] - landed[k][0], q[1] - landed[k][1]))); } }
      if (party()) { if (c.choices) P.dialogue.pick(0); else P.dialogue.skip(); } else await D().key('KeyE', 2);
    }
  }
  rep.frames = f; rep.err = err;
  // control is back: the sticks let go, then nobody walks by themselves
  if (party()) T.bots.forEach((b) => T.stick(b, 0, 0)); else for (const k of KEYS) g().input.keys.delete(k);
  await sleep(150); await D().step(6, 1 / 60);
  // (…and a second more of A: whoever still hammers it where they were put down opens no question)
  if (how === 'mash' && party()) for (let k = 0; k < 60; k += 6) { T.tap(T.bots[(k / 6) % T.bots.length], 'a'); await D().step(6, 1 / 60); await turn(); if (P.vote && !asked) asked = P.vote.title + ' (after)'; }
  // (a journey that ends inside a dungeon: the dungeon’s own way in has put them down)
  if (J.dungeon) rep.dungeon = !!(S.dungeons && S.dungeons.cur);
  const p0 = pos();
  await D().step(90, 1 / 60); await sleep(60);
  const p1 = pos();
  rep.after = Math.max(...p1.map((q, k) => Math.hypot(q[0] - p0[k][0], q[1] - p0[k][1])));
  const col = P.world.overCol;
  rep.hidden = hs.filter((p) => p.hidden || p.actor.hidden || !p.actor.model.root.visible).length;
  rep.away = hs.filter((p) => p.away).length;
  rep.water = hs.filter((p) => p.swimming || (P.swim && P.swim.isWater(p.pos.x, p.pos.z))).length;
  rep.wall = J.dungeon ? 0 : hs.filter((p) => col.blocked(p.pos.x, p.pos.z, 0.2)).length;
  rep.spread = +Math.max(0, ...p1.flatMap((a) => p1.map((b) => Math.hypot(a[0] - b[0], a[1] - b[1])))).toFixed(1);
  rep.riders = P.stage.trip ? 'trip left' : 0;
  rep.vote = asked || (party() && P.vote ? P.vote.title : 0);
  // (and no vehicle set going by where they were put down: a balloon called to its dock, a boat boarded)
  rep.rides = P.vehicles ? P.vehicles.list.filter((v) => v.flying || v.riders.some(Boolean)).length : 0;
  // (all together: the one picture holds them all — nobody is a stray the camera would fetch back)
  rep.strays = party() && P.together && P.together() ? (P.strays || []).length : 0;
  rep.next = S.running || (S.tracked && S.tracked()) || '';
  rep.scene = P.stage.active;
  rep.drift = +rep.drift.toFixed(2); rep.after = +rep.after.toFixed(2);
  rep.at = p1.map((q) => [+q[0].toFixed(1), +q[1].toFixed(1)]);
  rep.ok = !err && !rep.scene && !rep.hidden && !rep.away && (!rep.water || J.plain) && (!rep.wall || J.plain) && rep.drift < 0.05 && (rep.after < 0.05 || J.plain) && rep.spread < 9 && !rep.riders && !rep.strays && !rep.vote && !rep.rides;
  if (shots && how === 'skip') { await sleep(100); await D().shot(pre + '_skipped', 2); }
  return rep;
}

export async function all(mode = 'party', n = 4, names = Object.keys(JOURNEYS), opts = {}) {
  awake();
  const V = window.V = await import('/tools/sagatest.js?' + Date.now());
  await V.ready(); V.watchErrors();
  if (!(mode === 'party' ? g().mode === 'party' && g().party.saga : g().mode === 'game' && g().world.wild)) {
    if (mode === 'solo') await V.solo(opts.cls || 'knight');
    else { const T = window.T = await import('/tools/partybots.js?' + Date.now()); await T.boot(n); await T.autoplay('saga', [], { until: () => true }); }
  }
  if (opts.camera && mode === 'party') g().party.settings.camera = opts.camera;
  const res = { mode, n, how: opts.how || 'read', camera: mode === 'party' ? g().party.settings.camera : '-', runs: [] };
  for (const name of names) {
    const r = await run(name, opts);
    res.runs.push(r);
    window.__jt = 'progress ' + JSON.stringify(res);
  }
  res.errs = V.errs();
  res.ok = res.runs.every((r) => r.ok) && !res.errs.length;
  return res;
}

export function start(...args) {
  window.__jt = 'run';
  all(...args).then((r) => { window.__jt = 'done ' + JSON.stringify(r); }).catch((e) => { window.__jt = 'err ' + e + ' ' + String(e && e.stack || '').slice(0, 500); });
  return 'started';
}
