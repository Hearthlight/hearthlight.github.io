// The split screen looked at, for the browser pane (its scripts time out after 45 s):
//   const S = await import('/tools/splittest.js');
//   S.start('setup', 4)                  // 4 bots in the Adventure, its opening skipped: poll window.__sp
//   S.start('scene', 'pairs', 'pairs')   // a situation set up, and screenshots/pairs.png
//   S.start('edge')                      // two heroes along the edge of fitting for 10 s: the cuts counted
// Situations (SCENES): who stands with whom, by seat — groups far from each other on the valley’s
// green. `S.sig()` is what the camera does, in a line: each view’s cells and the seats in it
// ("2x2 | 0+1:1,2 | 2:3 | 3:4": a wide picture for seats 1 and 2, seats 3 and 4 in their own).

const g = () => window.game;
const D = () => window.game.debug;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const NAMES = ['Alexandre', 'Marie-Hélène', 'Jean-Baptist', 'Zoé', 'Clémentine', 'Théo', 'Maximilienne', 'Anne-Sophie'];
// (open ground in the valley, far enough from each other for any zoom)
const SPOTS = [[118, 40], [206, 40], [30, 40], [118, 96], [206, 96], [30, 96], [74, 68], [162, 68]];
// seats standing together (a seat nobody names stands alone, at its own spot)
export const SCENES = {
  together: [[0, 1, 2, 3, 4, 5, 6, 7]],
  away: [[0, 2, 3, 4, 5, 6, 7], [1]],          // seat 2 walks away
  pairs: [[0, 1], [2, 3], [4, 5], [6, 7]],
  columns: [[0, 2], [1, 3], [4, 6], [5, 7]],   // one above the other
  diagonal: [[0, 3], [1, 2]],                  // places that don’t touch
  row: [[0, 1, 2, 3], [4, 5, 6, 7]],
  three: [[0, 1, 3], [2]],                     // an L of places
  apart: [],
};

export async function setup(n = 4, names = NAMES) {
  const T = window.T = await import('/tools/partybots.js?' + Date.now());
  for (let i = 0; i < 80 && !(g() && g().world && g().world.overCol); i++) await sleep(250);
  await T.boot(n, names);
  T.mode('explore');
  const P = g().party;
  for (let i = 0; i < 40; i++) { await sleep(30); await D().step(10); }
  for (let i = 0; i < 40 && ((P.stage && P.stage.active) || P.dialogue.active); i++) { if (P.stage && P.stage.active) P.stage.skip(); else P.dialogue.skip(); await sleep(40); await D().step(20); }
  P.state.hour = 10;
  return sig();
}

// the nearest free ground to (x, z)
function free(x, z) {
  const col = g().party.world.overCol;
  for (let r = 0; r < 12; r += 0.5) for (let a = 0; a < 6.3; a += 0.4) { const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (!col.blocked(px, pz, 0.3)) return { x: px, z: pz }; }
  return { x, z };
}

// groups of seats, each at a spot (side by side, `gap` tiles between heroes)
export async function place(groups, gap = 1.6) {
  const P = g().party, ps = P.players, seen = new Set();
  const all = (typeof groups === 'string' ? SCENES[groups] : groups).map((q) => q.filter((i) => i < ps.length)).filter((q) => q.length);
  ps.forEach((p, i) => { if (!all.some((q) => q.includes(i))) all.push([i]); });
  all.forEach((q, k) => {
    const [sx, sz] = SPOTS[k % SPOTS.length];
    q.forEach((i, j) => { if (seen.has(i)) return; seen.add(i); ps[i].actor.pos = free(sx + (j - (q.length - 1) / 2) * gap, sz + (j % 2) * 0.6); ps[i].actor.vel = { x: 0, z: 0 }; });
  });
  P.cam.snap(P.camPlayers());
  // (the paint workers answer, the merges wait their moment)
  for (let i = 0; i < 24; i++) { await sleep(50); await D().step(5); }
  return sig();
}

// the camera in a line: the layout, then each view (its cells: the seats it shows), the map panels
export function sig() {
  const C = g().party.cam, L = C.layout, cw = C.W / L.cols, ch = C.H / L.rows;
  const cells = (r) => { const out = []; for (let y = Math.round(r.y / ch); y < Math.round((r.y + r.h) / ch); y++) for (let x = Math.round(r.x / cw); x < Math.round((r.x + r.w) / cw); x++) out.push(y * L.cols + x); return out.join('+'); };
  return [L.type === 'grid' ? L.cols + 'x' + L.rows : L.type].concat(C.views.map((v) => (L.type === 'grid' ? cells(v.rect) + ':' : '') + v.members.map((p) => p.slot + 1).join(',')), C.spare.length ? ['map:' + C.spare.length] : []).join(' | ');
}

export async function shot(name, scale = 0.5) { await sleep(120); await D().step(3); const d = g().display; return D().shot(name, d.wscale * scale); }
export async function scene(what, name, gap) { const s = await place(what, gap); if (name) await shot(name); return s; }

// seats a and b walk side by side along the edge of fitting one cell, for `secs`: how often the
// picture is cut (each change of the camera’s line), and the lines it went through
export async function edge(a = 0, b = 1, secs = 10, swing = 1.5) {
  const P = g().party, C = P.cam, pa = P.players[a], pb = P.players[b];
  await place([[a, b]], 2);
  const L = C.layout, [fw] = C.fit(Math.floor(C.W / (L.type === 'grid' ? L.cols : 2)), C.H);
  const x0 = pa.pos.x, z0 = pa.pos.z, far = fw - 1.6;      // (their boxes just fill the frame)
  let last = sig(), cuts = 0; const seen = [last], at = [];
  for (let f = 0; f < secs * 60; f++) {
    const k = f / 60, d = far + Math.sin(k * 2.2) * swing;
    pa.actor.pos = { x: x0 + k * 0.8, z: z0 }; pb.actor.pos = { x: x0 + k * 0.8 + d, z: z0 + 0.4 };
    await D().step(1);
    const s = sig();
    if (s !== last) { cuts++; at.push(+k.toFixed(2)); last = s; if (!seen.includes(s)) seen.push(s); }
    if (f % 120 === 0) await sleep(1);
  }
  return { cuts, at, seen };
}

export function start(what, ...args) {
  window.__sp = 'run';
  const fn = { setup, place, scene, shot, edge }[what];
  fn(...args).then((r) => { window.__sp = 'done ' + JSON.stringify(r); }).catch((e) => { window.__sp = 'err ' + e + ' ' + String((e && e.stack) || '').slice(0, 400); });
  return 'started';
}
