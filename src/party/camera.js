// Party Mode camera. One shared view while the whole party fits on screen. When it
// drifts apart the screen splits, in one of two styles (`style`, the Settings’ Split screen):
// - `seats`, fixed places: a grid by the number of players, each of its cells the home of
//   one player by seat — always the same — and friends who walk together share the picture
//   their places make (two side by side: a wide one), so nobody looks for themselves;
// - `groups`: along the line between two groups (each camera slides towards its group, so
//   the split opens and closes smoothly), a grid of panels for three or more, the groups
//   taking cells by where they stand.
// A cell nobody has shows the valley map, so everyone can find each other again.

import { THREE } from '../render/r3d.js';
import { t } from '../i18n.js';

// how much of the screen a player needs around their feet (world units):
// the head, the name tag above it and a little breathing room
const EXT = { x: 0.8, top: 2.6, bottom: 0.6 };
const MARGIN = { x: 1.2, top: 1.4, bottom: 1.3 };

export const LAYOUTS = [
  { i: 0, k: 1, type: 'single', cols: 1, rows: 1 },
  { i: 1, k: 2, type: 'split', cols: 1, rows: 1 },
  { i: 2, k: 4, type: 'grid', cols: 2, rows: 2 },
  { i: 3, k: 6, type: 'grid', cols: 3, rows: 2 },
  { i: 4, k: 8, type: 'grid', cols: 4, rows: 2 },
];

// The fixed places: the grid for n players (2: left | right · 3–4: 2×2 · 5–6: 3×2 · 7–8: 4×2)
const SEAT_GRIDS = [[1, 1], [1, 1], [2, 1], [2, 2], [2, 2], [3, 2], [3, 2], [4, 2], [4, 2]];
const seatGrids = new Map();
function seatLayout(cols, rows) {
  const id = cols + 'x' + rows;
  if (!seatGrids.has(id)) seatGrids.set(id, { i: LAYOUTS.length, k: cols * rows, type: 'grid', seats: true, cols, rows });
  return seatGrids.get(id);
}

let nextId = 1;

export class View {
  constructor() {
    this.id = nextId++;
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 160);
    this.rect = { x: 0, y: 0, w: 2, h: 2 };
    this.cx = 0; this.cz = 0;    // smoothed ground centre
    this.ppu = 0;                // its own pixels per tile (a room's panel), else the camera's
    this.tx = 0; this.tz = 0;    // where it wants to be
    this.members = [];
    this.clip = null;            // clip polygon (world-canvas px) for split views
    this.v3 = new THREE.Vector3();
  }

  // world (units) -> world-canvas pixel, through this view's camera
  project(x, y, z) {
    const v = this.v3.set(x, y, z).project(this.cam);
    return { x: this.rect.x + ((v.x + 1) / 2) * this.rect.w, y: this.rect.y + ((1 - v.y) / 2) * this.rect.h, z: v.z };
  }

  // is a world-canvas point inside this view's region?
  owns(px, py) {
    const r = this.rect;
    if (px < r.x || py < r.y || px >= r.x + r.w || py >= r.y + r.h) return false;
    if (!this.half) return true;
    const h = this.half;
    return ((px - h.ox) * h.nx + (py - h.oy) * h.ny) * h.s >= 0;
  }
}

function playerBox(p) {
  // (high up in a balloon or a glider, the view looks up with them)
  const x = p.pos.x, z = p.pos.z, lift = Math.max(0, ((p.actor && p.actor.baseY) || 0) - 1);
  return { x0: x - EXT.x, x1: x + EXT.x, z0: z - EXT.top - lift, z1: z + EXT.bottom - lift * 0.6 };
}
const union = (a, b) => ({ x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1), z0: Math.min(a.z0, b.z0), z1: Math.max(a.z1, b.z1) });

// Greedy complete-linkage clustering: keep merging the pair whose combined
// footprint is smallest, as long as it still fits a fw×fh panel.
function link(cl, fw, fh) {
  for (;;) {
    let best = null;
    for (let i = 0; i < cl.length; i++) for (let j = i + 1; j < cl.length; j++) {
      const b = union(cl[i].box, cl[j].box);
      const cost = Math.max((b.x1 - b.x0) / fw, (b.z1 - b.z0) / fh);
      if (cost <= 1 && (!best || cost < best.cost)) best = { i, j, b, cost };
    }
    if (!best) break;
    const a = cl[best.i], b = cl[best.j];
    cl.splice(best.j, 1);
    cl[best.i] = { members: a.members.concat(b.members), box: best.b, n: (a.n || 1) + (b.n || 1) };
  }
  return cl;
}
export function clusterize(players, fw, fh) {
  const cl = link(players.map((p) => ({ members: [p], box: playerBox(p) })), fw, fh);
  for (const c of cl) { c.cx = (c.box.x0 + c.box.x1) / 2; c.cz = (c.box.z0 + c.box.z1) / 2 + (EXT.top - EXT.bottom) / 2 * 0.5; }
  return cl;
}

// The rectangles a set of cells makes in a cols-wide grid: the biggest first (a wide one
// before a tall one, the top left before the others), then what is left, the same way.
function cellRects(cells, cols, rows) {
  const left = new Set(cells), out = [];
  while (left.size) {
    let best = null;
    for (const c of left) {
      const x0 = c % cols, y0 = (c - x0) / cols;
      for (let w = 1; x0 + w <= cols && left.has(c + w - 1); w++) for (let h = 1; y0 + h <= rows; h++) {
        let full = true;
        for (let x = 0; x < w && full; x++) full = left.has(c + (h - 1) * cols + x);
        if (!full) break;
        const a = w * h;
        if (!best || a > best.a || (a === best.a && (w > best.w || (w === best.w && c < best.c)))) best = { c, w, h, a };
      }
    }
    for (let y = 0; y < best.h; y++) for (let x = 0; x < best.w; x++) left.delete(best.c + y * cols + x);
    out.push(best);
  }
  return out;
}

export class SplitCam {
  constructor(r3d) {
    this.r3d = r3d;
    this.layout = LAYOUTS[0];
    this.views = [new View()];
    this.spare = [];               // grid cells with no group (they show the map)
    this.split = null;             // { n: {x, y}, a } for the post pass
    this.fitDown = 0;
    this.flash = 0;                // brief blink on layout cuts
    this.ppu = 16;
    this.bounds = { w: 240, h: 128 };
    this.n = { x: 1, z: 0 };       // smoothed split direction
    this.roomOf = null;            // (members) → the room frame they're all in (rooms.js)
    this.bossNear = null;          // (x, z) → a boss close by (party.js), for the view to lean its way
    this.style = 'groups';         // `together` (one picture, never split), or how it splits: `seats` (fixed places), `groups`
    this.homes = new Map();        // fixed places: player → their cell (kept for the session)
    this.grid = null;              // …in a grid of [cols, rows]
    this.kept = new Map();         // …the cell of each seat that had one (a phone that comes back)
    this.parts = null;             // …and who walks with whom while the screen is split
    this.joins = [];               // …friends about to share a picture: { members, t }
  }

  get W() { return this.r3d.w; }
  get H() { return this.r3d.h; }

  panelSize(L) {
    if (L.type === 'single') return [this.W, this.H];
    if (L.type === 'split') return null;
    return [Math.floor(this.W / L.cols), Math.floor(this.H / L.rows)];
  }

  // usable world span of a panel, shrunk by the safety margins
  fit(pw, ph, k = 1) {
    return [(pw / this.ppu - MARGIN.x * 2) * k, (ph / this.ppu - MARGIN.top - MARGIN.bottom) * k];
  }

  // clusters for a layout, or null when the party can't be shown with it
  tryLayout(L, players, k = 1) {
    if (L.type === 'split') {
      if (players.length < 2) return null;
      for (const [pw, ph] of [[this.W / 2, this.H], [this.W, this.H / 2]]) {
        const [fw, fh] = this.fit(pw, ph, k);
        const cl = clusterize(players, fw, fh);
        if (cl.length <= 2) return cl;
      }
      return null;
    }
    const [pw, ph] = this.panelSize(L);
    const [fw, fh] = this.fit(pw, ph, k);
    const cl = clusterize(players, fw, fh);
    return cl.length <= L.k ? cl : null;
  }

  // snap everything onto the party (after teleports)
  snap(players) {
    this.layout = null;
    this.update(0, players, true);
  }

  update(dt, players, instant = false) {
    // a scene holds the camera (saga/stage.js): one full-screen view where it says
    if (this.director) { this.directed(dt, players); return; }
    if (!players.length) return;
    // (the split’s style changed: everything framed afresh)
    if (this.style !== this.styled) { this.styled = this.style; this.layout = null; instant = true; }
    for (const v of this.views) if (v.flash > 0) v.flash = Math.max(0, v.flash - dt * 5);
    if (this.style === 'seats') this.seatViews(dt, players, instant);
    else this.groupViews(dt, players, instant);
    // the views glide to where they want to be
    const k = instant ? 1 : 1 - Math.exp(-dt * 5);
    for (const v of this.views) {
      // (a jump across the world — into a room, back out — cuts rather than glides)
      if (Math.abs(v.tx - v.cx) > 90 || Math.abs(v.tz - v.cz) > 90) { v.cx = v.tx; v.cz = v.tz; }
      else { v.cx += (v.tx - v.cx) * k; v.cz += (v.tz - v.cz) * k; }
    }
    if (instant) for (const v of this.views) { v.cx = v.tx; v.cz = v.tz; }
    // screen shake (big hits, thunder): a few pixels, decaying fast
    let sx = 0, sz = 0;
    if (this.shake > 0) {
      sx = (Math.random() - 0.5) * this.shake * 0.8; sz = (Math.random() - 0.5) * this.shake * 0.6;
      this.shake = Math.max(0, this.shake - dt * 1.6);
    }
    for (const v of this.views) this.r3d.aimCamera(v.cam, v.cx + sx, v.cz + sz, v.ppu || this.ppu, v.rect.w, v.rect.h);
  }

  // ---- `groups`: the screen is cut around the groups, as they form and break
  groupViews(dt, players, instant) {
    const W = this.W, H = this.H;
    // 1) which layout? (the smallest that fits; shrink back only after a
    //    moment of comfortable fit, so the screen doesn't flicker)
    let need = LAYOUTS.length - 1, clusters = null;
    if (this.forceSingle) { need = 0; clusters = clusterize(players, 1e9, 1e9); }   // the auto zoom keeps everyone in one view
    else for (const L of LAYOUTS) { const c = this.tryLayout(L, players); if (c) { need = L.i; clusters = c; break; } }
    if (!clusters) clusters = clusterize(players, ...this.fit(W / 4, H / 2)).slice(0, 8);
    let L = this.layout;
    const prev = L;
    if (this.forceSingle && L && L.i > 0) { L = LAYOUTS[0]; this.fitDown = 0; }
    else if (!L || need > L.i) { L = LAYOUTS[need]; this.fitDown = 0; }
    else if (need < L.i) {
      const tight = this.tryLayout(LAYOUTS[need], players, 0.8);
      this.fitDown = tight ? this.fitDown + dt : 0;
      if (this.fitDown > 0.9) { L = LAYOUTS[need]; this.fitDown = 0; }
    } else this.fitDown = 0;
    if (L !== LAYOUTS[need]) clusters = this.tryLayout(L, players) || clusters;
    const changed = L !== prev;
    const seamless = changed && prev && ((prev.type === 'single' && L.type === 'split') || (prev.type === 'split' && L.type === 'single'));
    this.layout = L;
    if (changed && prev && !seamless && !instant) this.flash = 1;
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 5);

    // 2) views for the groups
    const old = this.views;
    if (L.type === 'single') {
      const v = changed ? new View() : old[0];
      if (changed && prev && prev.type === 'split') { v.cx = (old[0].cx + old[1].cx) / 2; v.cz = (old[0].cz + old[1].cz) / 2; }
      const all = clusters.length === 1 ? clusters[0] : clusterize(players, 1e9, 1e9)[0];
      v.members = all.members;
      v.rect = { x: 0, y: 0, w: W, h: H };
      v.half = null;
      this.aimAt(v, all.cx, all.cz, all.members);
      this.views = [v];
      this.spare = [];
      this.split = null;
      if (changed && (!prev || !seamless)) { v.cx = v.tx; v.cz = v.tz; }
    } else if (L.type === 'split') {
      const cl = clusters.length === 2 ? clusters : this.twoGroups(players);
      let [A, B] = cl;
      // keep each group on the same side as last frame
      if (!changed && old.length === 2 && overlap(old[0].members, B.members) > overlap(old[0].members, A.members)) [A, B] = [B, A];
      const vA = changed ? new View() : old[0], vB = changed ? new View() : old[1];
      if (changed) {
        const from = prev && prev.type === 'single' ? old[0] : null;
        for (const v of [vA, vB]) { if (from) { v.cx = from.cx; v.cz = from.cz; } }
      }
      vA.members = A.members; vB.members = B.members;
      // direction between the groups, smoothed so the seam doesn't jitter
      let dx = B.cx - A.cx, dz = B.cz - A.cz;
      const L2 = Math.hypot(dx, dz);
      if (L2 > 0.5) {
        const k = instant || changed ? 1 : 1 - Math.exp(-dt * 4);
        this.n.x += (dx / L2 - this.n.x) * k; this.n.z += (dz / L2 - this.n.z) * k;
        const nl = Math.hypot(this.n.x, this.n.z) || 1; this.n.x /= nl; this.n.z /= nl;
      }
      const n = this.n;
      // each camera sits so its group is centred in its half of the screen,
      // or both meet in the middle when the groups are close
      const ex = Math.abs(n.x) > 1e-3 ? (W / 2) / Math.abs(n.x) : Infinity;
      const ey = Math.abs(n.z) > 1e-3 ? (H / 2) / Math.abs(n.z) : Infinity;
      const E = Math.min(ex, ey) / this.ppu;
      const along = dx * n.x + dz * n.z;
      const R = Math.max(0, Math.min(E / 2, along / 2));
      this.aimAt(vA, A.cx + n.x * R, A.cz + n.z * R, A.members, true);
      this.aimAt(vB, B.cx - n.x * R, B.cz - n.z * R, B.members, true);
      if (changed && !(prev && prev.type === 'single')) { for (const v of [vA, vB]) { v.cx = v.tx; v.cz = v.tz; } }
      for (const v of [vA, vB]) v.rect = { x: 0, y: 0, w: W, h: H };
      this.views = [vA, vB];
      this.spare = [];
      // screen-space seam normal (post pass works with y up)
      this.splitN = { x: n.x, y: n.z };
      const s = (this.views[1].cx - this.views[0].cx) * n.x + (this.views[1].cz - this.views[0].cz) * n.z;
      const a = Math.max(0, Math.min(1, s / 0.9));
      this.split = { n: { x: n.x, y: -n.z }, a };
      vA.half = { ox: W / 2, oy: H / 2, nx: n.x, ny: n.z, s: -1 };
      vB.half = { ox: W / 2, oy: H / 2, nx: n.x, ny: n.z, s: 1 };
    } else {
      // grid: cells in reading order; groups keep their cell while they can
      const cells = [];
      const cw = Math.floor(W / L.cols / 2) * 2, ch = Math.floor(H / L.rows / 2) * 2;
      for (let r = 0; r < L.rows; r++) for (let c = 0; c < L.cols; c++) {
        const x = c * cw, y = r * ch;
        cells.push({ x, y, w: c === L.cols - 1 ? W - x : cw, h: r === L.rows - 1 ? H - y : ch });
      }
      const order = clusters.slice().sort((a, b) => (a.cz - b.cz) || (a.cx - b.cx));
      // rows by depth, then left→right
      const rows = [];
      for (let r = 0; r < L.rows; r++) rows.push(order.slice(Math.round((r * order.length) / L.rows), Math.round(((r + 1) * order.length) / L.rows)).sort((a, b) => a.cx - b.cx));
      const assigned = new Array(cells.length).fill(null);
      if (!changed) {
        // stability: a group that keeps most of its members keeps its cell
        const pending = [];
        for (const c of order) {
          const i = old.findIndex((v) => v.cell !== undefined && !assigned[v.cell] && overlap(v.members, c.members) * 2 > c.members.length);
          if (i >= 0) assigned[old[i].cell] = { c, v: old[i] }; else pending.push(c);
        }
        for (const c of pending) { const i = assigned.findIndex((x) => !x); if (i >= 0) assigned[i] = { c, v: new View() }; }
      } else {
        let i = 0;
        for (const row of rows) for (const c of row) assigned[i++] = { c, v: new View() };
      }
      this.views = [];
      this.spare = [];
      assigned.forEach((a, i) => {
        if (!a) { this.spare.push(cells[i]); return; }
        const v = a.v;
        v.cell = i;
        v.rect = cells[i];
        v.half = null;
        v.members = a.c.members;
        this.aimAt(v, a.c.cx, a.c.cz, a.c.members);
        if (changed || instant || v.tx === undefined || !old.includes(v)) { v.cx = v.tx; v.cz = v.tz; }
        this.views.push(v);
      });
      this.split = null;
    }
  }

  // ---- `seats`: everyone’s picture stays where their seat puts it
  seatViews(dt, players, instant) {
    const W = this.W, H = this.H, prev = this.layout, old = this.views;
    // 1) one view while the party fits; back to it only after a moment of comfortable fit
    let one = !!this.forceSingle || players.length < 2;
    if (!one && !(prev && prev.seats)) one = !!this.tryLayout(LAYOUTS[0], players);
    else if (!one) { this.fitDown = this.tryLayout(LAYOUTS[0], players, 0.8) ? this.fitDown + dt : 0; one = this.fitDown > 0.9; }
    const G = this.seat(players, one);
    const L = one ? LAYOUTS[0] : seatLayout(G[0], G[1]), changed = L !== prev;
    this.layout = L;
    this.split = null;
    if (changed) this.fitDown = 0;
    if (changed && prev && !instant) this.flash = 1;
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 5);
    if (one) {
      const v = changed ? new View() : old[0], all = clusterize(players, 1e9, 1e9)[0];
      v.members = all.members;
      v.rect = { x: 0, y: 0, w: W, h: H };
      v.half = null;
      this.aimAt(v, all.cx, all.cz, all.members);
      if (changed) { v.cx = v.tx; v.cz = v.tz; }
      this.views = [v];
      this.spare = [];
      this.parts = null;
      return;
    }
    // 2) who walks with whom: friends who fit a frame the size of one place. Someone who no
    //    longer fits is apart at once; friends share a picture after most of a second of
    //    comfortable fit, so the screen doesn’t flicker
    const [fw, fh] = this.fit(Math.floor((W - this.hid()) / L.cols / 2) * 2, Math.floor(H / L.rows / 2) * 2);
    let parts = this.parts;
    if (!parts || changed || instant) { parts = clusterize(players, fw, fh).map((c) => c.members); this.joins = []; }
    else {
      parts = parts.map((g) => g.filter((p) => players.includes(p))).filter((g) => g.length);
      for (const p of players) if (!parts.some((g) => g.includes(p))) parts.push([p]);
      parts = parts.flatMap((g) => (g.length > 1 ? clusterize(g, fw, fh).map((c) => c.members) : [g]));
      const joins = [];
      for (const c of link(parts.map((g) => ({ members: g, box: g.map(playerBox).reduce(union) })), fw * 0.8, fh * 0.8)) {
        if (!(c.n > 1)) continue;
        // (a friend more coming close doesn’t start the wait again)
        let wait = dt;
        for (const j of this.joins) if (j.members.every((p) => c.members.includes(p))) wait = Math.max(wait, j.t + dt);
        if (wait > 0.9) parts = parts.filter((g) => !c.members.includes(g[0])).concat([c.members]);
        else joins.push({ members: c.members, t: wait });
      }
      this.joins = joins;
    }
    for (const g of parts) g.sort((a, b) => a.slot - b.slot);
    this.parts = parts;
    // 3) each group’s places: those that touch make one picture, the others one each — all
    //    framed on the group. A picture whose places stay keeps its camera (it glides); a new
    //    one is a cut, with a blink
    const views = [];
    for (const g of parts) {
      const c = clusterize(g, 1e9, 1e9)[0];
      for (const r of cellRects(g.map((p) => this.homes.get(p)), L.cols, L.rows)) {
        const id = r.c + ':' + r.w + 'x' + r.h;
        let v = changed ? null : old.find((q) => q.span === id);
        const fresh = !v;
        if (fresh) v = new View();
        v.span = id; v.cell = r.c;
        v.rect = this.cellRect(r.c, r.w, r.h);
        v.half = null;
        v.members = g;
        this.aimAt(v, c.cx, c.cz, g);
        if (fresh) { v.cx = v.tx; v.cz = v.tz; if (!changed && !instant) v.flash = 1; }
        views.push(v);
      }
    }
    this.views = views.sort((a, b) => a.cell - b.cell);
    // (the places nobody has: the map, one panel where they touch)
    const taken = new Set(this.homes.values()), free = [];
    for (let i = 0; i < L.cols * L.rows; i++) if (!taken.has(i)) free.push(i);
    this.spare = cellRects(free, L.cols, L.rows).map((r) => this.cellRect(r.c, r.w, r.h));
  }

  // Who has which place. A place is kept for the session: a player who leaves frees theirs,
  // a newcomer takes a free one, and while the screen is split nobody moves — the grid only
  // grows, by a row or a column. With everyone in one view (`together`) the places are dealt
  // again by seat when the grid changes shape or the seats are out of order.
  seat(players, together) {
    const H = this.homes, want = SEAT_GRIDS[Math.min(8, players.length)];
    const bySeat = (a, b) => (a.slot || 0) - (b.slot || 0);
    for (const p of [...H.keys()]) if (!players.includes(p)) H.delete(p);
    let G = this.grid;
    const news = players.filter((p) => !H.has(p)).sort(bySeat);
    const inOrder = () => { const o = [...H].sort((a, b) => a[1] - b[1]); return o.every((e, i) => !i || bySeat(o[i - 1][0], e[0]) < 0); };
    if (!G || G[0] < 2 || (together && (G[0] !== want[0] || G[1] !== want[1] || !inOrder()))) {
      G = this.grid = want;
      H.clear();
      this.kept.clear();
      players.slice().sort(bySeat).forEach((p, i) => H.set(p, i));
      for (const [p, i] of H) this.kept.set(p.slot, i);
      return G;
    }
    while (H.size + news.length > G[0] * G[1] && G[0] * G[1] < 8) {
      // (no place left: a row under a single one, else a column — the cells stay where they are)
      const from = G[0], to = G[1] < 2 ? [from, 2] : [from + 1, 2], move = (i) => Math.floor(i / from) * to[0] + (i % from);
      for (const [p, i] of H) H.set(p, move(i));
      this.kept = new Map([...this.kept].map(([slot, i]) => [slot, move(i)]));
      G = this.grid = to;
    }
    for (const p of news) {
      // (back after a moment away: their own place if it’s still free; else the first free one
      // that keeps the seats in order, else the first free one)
      const taken = new Set(H.values()), free = [];
      for (let i = 0; i < G[0] * G[1]; i++) if (!taken.has(i)) free.push(i);
      let lo = -1, hi = 1e9;
      for (const [q, i] of H) { if (bySeat(q, p) < 0) lo = Math.max(lo, i); else hi = Math.min(hi, i); }
      const mine = this.kept.get(p.slot), fits = free.filter((i) => i > lo && i < hi);
      H.set(p, free.includes(mine) ? mine : fits.length ? fits[0] : free[0]);
      this.kept.set(p.slot, H.get(p));
    }
    return G;
  }

  // What a card hides on the left of the screen (`inset`, world px — the lobby’s): the places
  // share the rest; the first column runs under the card and frames its heroes beside it.
  hid() { return Math.floor(Math.min(this.inset || 0, this.W * 0.5) / 2) * 2; }

  // a place’s rectangle on the world canvas (w × h places from cell i, for a picture they share)
  cellRect(i, w = 1, h = 1) {
    const L = this.layout, W = this.W, H = this.H, x0 = this.hid(), cw = Math.floor((W - x0) / L.cols / 2) * 2, ch = Math.floor(H / L.rows / 2) * 2;
    const cx = i % L.cols, cy = (i - cx) / L.cols, x = cx ? x0 + cx * cw : 0, y = cy * ch;
    return { x, y, w: (cx + w >= L.cols ? W : x0 + (cx + w) * cw) - x, h: cy + h >= L.rows ? H - y : h * ch };
  }

  // a player’s own place while the screen is split in fixed places (else null)
  homeRect(p) { return this.layout && this.layout.seats && this.homes.has(p) ? this.cellRect(this.homes.get(p)) : null; }

  // the view a player looks at: the one over their own place, else the first that shows them
  viewOf(p) {
    const R = this.homeRect(p);
    return (R && this.views.find((v) => R.x >= v.rect.x && R.y >= v.rect.y && R.x < v.rect.x + v.rect.w && R.y < v.rect.y + v.rect.h))
      || this.views.find((v) => v.members.includes(p)) || this.views[0];
  }

  directed(dt, players) {
    const D = this.director, W = this.W, H = this.H;
    let v = this.views.length === 1 && this.layout === LAYOUTS[0] ? this.views[0] : null;
    if (!v) { v = new View(); this.flash = 0; }
    this.layout = LAYOUTS[0];
    v.members = players; v.rect = { x: 0, y: 0, w: W, h: H }; v.half = null; v.cell = undefined; v.span = null;
    v.cx = v.tx = D.x; v.cz = v.tz = D.z; v.ppu = D.ppu || this.ppu;
    this.views = [v]; this.spare = []; this.split = null;
    let sx = 0, sz = 0;
    if (this.shake > 0) { sx = (Math.random() - 0.5) * this.shake * 0.8; sz = (Math.random() - 0.5) * this.shake * 0.6; this.shake = Math.max(0, this.shake - dt * 1.6); }
    this.r3d.aimCamera(v.cam, v.cx + sx, v.cz + sz, v.ppu, W, H);
  }

  // a centre for a view: the group's middle, a little ahead of where it's
  // heading, kept inside the map
  aimAt(v, x, z, members, loose = false) {
    v.ppu = 0;
    const R = this.roomOf && this.roomOf(members);
    if (R) { this.aimRoom(v, x, z, members, R); return; }
    let vx = 0, vz = 0;
    for (const m of members) { vx += (m.vel && m.vel.x) || 0; vz += (m.vel && m.vel.z) || 0; }
    vx /= members.length || 1; vz /= members.length || 1;
    x += vx * 0.22; z += vz * 0.18;
    if (this.shift && this.layout && this.layout.type === 'single') { x += this.shift.x; z += this.shift.z; }
    if (this.layout && this.layout.seats && v.rect.x <= 0) x -= this.hid() / 2 / this.ppu;     // (beside the lobby’s card)
    const hw = v.rect.w / 2 / this.ppu, hh = v.rect.h / 2 / this.ppu;
    // (a boss close by: the view leans towards its middle, as in solo — a big one isn't
    // cut off at the top of a wide screen — but never so far that a hero leaves it)
    const e = !loose && this.layout && this.layout.type === 'single' && this.bossNear && this.bossNear(x, z);
    if (e) {
      const hz = hh / 0.72;
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (const m of members) { const b = playerBox(m); x0 = Math.min(x0, b.x0); x1 = Math.max(x1, b.x1); z0 = Math.min(z0, b.z0); z1 = Math.max(z1, b.z1); }
      const h = (e.def.h || 2) + (e.y || 0), dx = e.x - x, dz = e.z - h * 0.5 - z, l = Math.hypot(dx, dz) || 1, m = Math.min(6.5, l * 0.45);
      x += (dx / l) * m; z += (dz / l) * m;
      // (its head under the boss bar: the top fifth of the screen belongs to the HUD)
      z = Math.min(z, e.z - h * 1.1 - 0.6 + hz * 0.64);
      // (and every hero above the players' cards along the bottom)
      x = Math.max(x1 + MARGIN.x - hw, Math.min(x0 - MARGIN.x + hw, x));
      z = Math.max(z1 + MARGIN.bottom - hz * 0.8, Math.min(z0 - MARGIN.top + hz, z));
    }
    const B = this.bounds, bx0 = B.x0 ?? 0, bz0 = B.z0 ?? 0, bx1 = B.x1 ?? B.w, bz1 = B.z1 ?? B.h;
    // an activity's stage (the arena): centred when it all fits, else kept in view
    const F = this.focus;
    if (F && !loose && this.layout && this.layout.type === 'single') {
      const hz = hh / 0.72;                   // the ground is foreshortened on screen
      x = hw * 2 >= F.x1 - F.x0 ? (F.x0 + F.x1) / 2 : Math.max(F.x0 + hw, Math.min(F.x1 - hw, x));
      z = hz * 2 >= F.z1 - F.z0 ? (F.z0 + F.z1) / 2 : Math.max(F.z0 + hz, Math.min(F.z1 - hz, z));
    }
    if (!loose) {
      x = Math.max(bx0 + hw, Math.min(bx1 - hw, x));
      z = Math.max(bz0 + hh - 2, Math.min(bz1 - hh, z));
    } else {
      x = Math.max(bx0 + hw * 0.5, Math.min(bx1 - hw * 0.5, x));
      z = Math.max(bz0 + hh * 0.5 - 2, Math.min(bz1 - hh * 0.5, z));
    }
    v.tx = x; v.tz = z;
  }

  // a view of people inside a room (rooms.js): a small room centred, a big one
  // followed, its back wall showing above it; a split's offset carries over
  aimRoom(v, x, z, members, R) {
    const c = clusterize(members, 1e9, 1e9)[0];
    // (a room's panel beside the others comes twice as close when the room fits it)
    const L = this.layout, split = !!L && L.type === 'split', across = Math.abs(this.n.x) >= Math.abs(this.n.z);
    const vw = split && across ? v.rect.w / 2 : v.rect.w, vh = split && !across ? v.rect.h / 2 : v.rect.h;
    const k = L && L.type !== 'single' && (R.w + (split ? 2 : 3)) * this.ppu * 2 <= vw && (R.d + 3.6) * this.ppu * 2 <= vh ? 2 : 1;
    v.ppu = this.ppu * k;
    const hw = v.rect.w / 2 / v.ppu, hh = v.rect.h / 2 / v.ppu;
    const cx = R.w <= hw * 2 - 1 ? R.x0 + R.w / 2 : Math.max(R.x0 + hw - 0.5, Math.min(R.x0 + R.w - hw + 0.5, c.cx));
    const lo = R.z0 - 2.55 + hh, hi = R.z0 + R.d + 0.45 - hh;
    const cz = lo >= hi ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, c.cz - 0.6));
    v.tx = cx + (x - c.cx) / k; v.tz = cz + (z - c.cz) / k;
  }

  // fall back: the two groups that are furthest apart
  twoGroups(players) {
    let best = null;
    for (let i = 0; i < players.length; i++) for (let j = i + 1; j < players.length; j++) {
      const d = Math.hypot(players[i].pos.x - players[j].pos.x, players[i].pos.z - players[j].pos.z);
      if (!best || d > best.d) best = { i, j, d };
    }
    const a = players[best.i], b = players[best.j];
    const A = [], B = [];
    for (const p of players) (Math.hypot(p.pos.x - a.pos.x, p.pos.z - a.pos.z) <= Math.hypot(p.pos.x - b.pos.x, p.pos.z - b.pos.z) ? A : B).push(p);
    const mk = (m) => { const c = clusterize(m, 1e9, 1e9)[0]; return c; };
    return [mk(A), mk(B)];
  }

  // which views show a given player
  viewsOf(p) { return this.views.filter((v) => v.members.includes(p)); }

  // would the whole party fit in one w×h-pixel view at this ppu? (k < 1 asks
  // for some room to spare)
  fitsOne(players, w, h, ppu, k = 1) {
    const fw = (w / ppu - MARGIN.x * 2) * k, fh = (h / ppu - MARGIN.top - MARGIN.bottom) * k;
    return clusterize(players, fw, fh).length <= 1;
  }

  // how many groups the party makes for a w×h view at this ppu
  groupsFor(players, w, h, ppu) {
    return clusterize(players, w / ppu - MARGIN.x * 2, h / ppu - MARGIN.top - MARGIN.bottom).length;
  }
}

// ------------------------------------------------------------------ zoom
// Party Mode zoom works on the world canvas scale (device pixels per world
// pixel), always an integer so the pixel art stays crisp. Changing level
// eases the camera's pixels-per-tile between the two framings, then settles
// back on 16 at the new scale. 'auto' zooms out a little as the party
// spreads, in again when it gathers, and leaves splitting to the SplitCam.
const AUTO_RANGE = [34, 100];   // tiles across the screen Auto may use
const TOGETHER_FAR = 72;        // (all together) the widest picture a second step out may give

export class Zoom {
  constructor(party) {
    this.party = party;
    this.mode = 'auto';          // 'auto' | a fixed world scale
    this.ws = 0;                 // scale in use
    this.anim = null;            // { from, to, t, dur, then }
    this.inT = 0;
    this.split = false;
  }

  get display() { return this.party.display; }

  // the scales that make sense on this screen (far → close)
  levels() {
    const d = this.display, out = [];
    for (let ws = 1; ws <= 12; ws++) {
      const tw = d.devW / ws / 16, th = d.devH / ws / 16;
      if (tw < 22 || th < 12) break;
      if (tw <= 140) out.push({ ws, tiles: Math.round(tw) });
    }
    if (!out.length) out.push({ ws: 1, tiles: Math.round(d.devW / 16) });
    return out;
  }

  normal() {
    const lv = this.levels(), a = this.display.autoWscale || 2;
    return lv.reduce((b, l) => (Math.abs(l.ws - a) < Math.abs(b.ws - a) ? l : b), lv[0]).ws;
  }

  // named relative to the screen's natural scale
  label(ws) {
    const d = ws - this.normal();
    return d <= -2 ? 'Very far view' : d === -1 ? 'Far view' : d === 0 ? 'Normal view' : d === 1 ? 'Close view' : 'Very close view';
  }

  set(mode) {
    const lv = this.levels();
    if (mode === 'auto') this.mode = 'auto';
    else { const ws = Math.max(lv[0].ws, Math.min(lv[lv.length - 1].ws, Math.round(Number(mode) || this.normal()))); this.mode = ws; }
  }

  // step the fixed zoom in (+1) or out (-1) from what's on screen
  step(dir) {
    const lv = this.levels();
    const cur = this.mode === 'auto' ? (this.target || this.ws || this.normal()) : this.mode;
    let i = lv.findIndex((l) => l.ws === cur);
    if (i < 0) i = lv.findIndex((l) => l.ws === this.normal());
    i = Math.max(0, Math.min(lv.length - 1, i + dir));
    this.mode = lv[i].ws;
  }

  // the levels Auto may use (far → close): the screen’s own, one closer, one further — and, when
  // the party stays in one picture, a second one further while the heroes still read (TOGETHER_FAR)
  autoLevels() {
    const normal = this.normal(), one = this.party.cam.style === 'together';
    return this.levels().filter((l) => l.ws === normal || (Math.abs(l.ws - normal) <= 1 && l.tiles >= AUTO_RANGE[0] && l.tiles <= AUTO_RANGE[1]) || (one && normal - l.ws === 2 && l.tiles <= TOGETHER_FAR));
  }

  // (all together) how far apart the party may stand, in tiles: what one picture holds at the
  // furthest zoom it may use — the lobby’s, beside its join card
  reach() {
    const d = this.display, P = this.party, lv = this.autoLevels();
    const ws = this.mode !== 'auto' ? this.mode : P.phase === 'lobby' || !lv.length ? this.normal() : lv[0].ws;
    const w = d.devW / ws - (P.cam.inset || 0) * ((this.ws || ws) / ws), h = d.devH / ws;
    return { w: w / 16 - MARGIN.x * 2, h: h / 16 - MARGIN.top - MARGIN.bottom };
  }

  // Auto: the closest level (within AUTO_RANGE) where everyone fits, zooming
  // in only after the party has fitted comfortably for a moment
  auto(dt, players) {
    const P = this.party, cam = P.cam, d = this.display;
    const normal = this.normal(), lv = this.autoLevels();
    if (!lv.length || !players.length) return normal;
    // everyone in the same room: come in close (as close as the room allows)
    const R = cam.roomOf && cam.roomOf(players);
    if (R && !R.big) {
      this.split = false; this.inT = 0;
      const snug = this.levels().filter((l) => l.ws <= normal + 2 && d.devW / l.ws / 16 >= R.w + 3 && d.devH / l.ws / 16 >= R.d + 3.6);
      return snug.length ? snug[snug.length - 1].ws : normal;
    }
    const fits = (ws, k) => cam.fitsOne(players, d.devW / ws, d.devH / ws, 16, k);
    const far = lv[0].ws;
    // (all together: the picture never splits — as far out as it goes, and the party is held there)
    if (cam.style === 'together') { this.split = false; if (!fits(far, 1)) { this.inT = 0; return far; } }
    // too spread even when zoomed out: let the SplitCam split at a normal scale
    else if (this.split ? !fits(far, 0.85) : !fits(far, 1)) {
      this.split = true;
      this.inT = 0;
      // (small pictures — three groups or more, the fixed places of three players or more —
      // are looked at from a little further)
      const small = cam.style === 'seats' ? players.length > 2 : cam.groupsFor(players, d.devW / normal, d.devH / normal, 16) > 2;
      const out = this.levels().filter((l) => l.ws < normal).pop();
      return small && out ? out.ws : normal;
    }
    this.split = false;
    let best = far;
    for (let i = lv.length - 1; i >= 0; i--) if (fits(lv[i].ws, 1)) { best = lv[i].ws; break; }
    const cur = this.target || normal;
    if (best <= cur || !lv.some((l) => l.ws === cur)) { this.inT = 0; return best; }
    // could come closer: one step at a time, after a comfortable moment
    const next = lv.find((l) => l.ws > cur);
    if (next && fits(next.ws, 0.8)) this.inT += dt; else this.inT = 0;
    if (next && this.inT > 1.4) { this.inT = 0; return next.ws; }
    return cur;
  }

  update(dt, players) {
    const P = this.party, d = this.display;
    if (this.flashT > 0) this.flashT -= dt;
    const lv = this.levels();
    let want = P.phase === 'lobby' && this.mode === 'auto' ? this.normal() : this.mode === 'auto' ? this.auto(dt, players) : this.mode;
    want = Math.max(lv[0].ws, Math.min(lv[lv.length - 1].ws, want));
    P.cam.forceSingle = P.cam.style === 'together' || (this.mode === 'auto' && P.phase !== 'lobby' && !this.split);
    if (!this.ws) { this.ws = want; this.target = want; d.setWorldScale(want); P.cam.ppu = 16; return; }
    if (want !== this.target && !this.anim) this.go(want);
    const A = this.anim;
    if (A) {
      A.t = Math.min(A.dur, A.t + dt);
      const k = A.t / A.dur, e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      P.cam.ppu = A.from + (A.to - A.from) * e;
      if (A.t >= A.dur) {
        this.anim = null;
        if (A.then) { this.ws = A.then; d.setWorldScale(A.then); }
        P.cam.ppu = 16;
      }
    }
  }

  // ease between framings: zooming out switches scale first (same framing at a
  // higher ppu) then eases down; zooming in eases up, then switches scale
  go(ws) {
    const P = this.party, d = this.display, from = this.ws || ws;
    this.target = ws;
    if (ws === from) return;
    if (ws < from) {
      this.ws = ws;
      d.setWorldScale(ws);
      this.anim = { from: 16 * from / ws, to: 16, t: 0, dur: 0.45, then: null };
    } else this.anim = { from: 16, to: 16 * ws / from, t: 0, dur: 0.45, then: ws };
    P.cam.ppu = this.anim.from;
  }

  // what the zoom is doing, in words (menus, phone, the little flash)
  describe() {
    const ws = this.mode === 'auto' ? (this.target || this.normal()) : this.mode;
    if (this.mode === 'auto') return t('Auto ({level})', { level: t(this.label(ws)) });
    const s = t(this.label(ws));
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // leaving Party Mode
  reset() { this.ws = 0; this.target = 0; this.anim = null; this.flashT = 0; }
}

function overlap(a, b) { let n = 0; for (const x of a) if (b.includes(x)) n++; return n; }
