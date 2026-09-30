// The way to a far place across a big map — the guide's (party/guide.js): a weighted A* over the
// tiles that likes paths and roads, run a slice at a time so a long way never stalls a frame.
// Two ways of going: 'foot' (paths, roads, bridges and plazas cheap, open ground dearer, wading
// dearer still, a swim only when nothing else goes) and 'van' (the asphalt and its tunnels; off
// the road dear, never the water nor a road closed to cars). One search at a time per map.
import { TT } from '../tiles.js';

const EASY = new Set([TT.PATH, TT.ASPHALT, TT.PLAZA, TT.COBBLE, TT.PLANK_H, TT.PLANK_V].filter((k) => k !== undefined));
const WET = new Set([TT.WATER, TT.CORAL]);
const DX = [1, -1, 0, 0, 1, 1, -1, -1], DZ = [0, 0, 1, -1, 1, -1, 1, -1];
const STEP = [1, 1, 1, 1, Math.SQRT2, Math.SQRT2, Math.SQRT2, Math.SQRT2];
const HW = 1.25;               // (the heuristic’s weight: a little greedy, a lot quicker)

export class Route {
  constructor(col, map) {
    this.col = col; this.m = map;
    const N = map.W * map.H;
    this.g = new Float32Array(N); this.from = new Int32Array(N);
    this.seen = new Uint16Array(N); this.shut = new Uint16Array(N);
    this.cc = new Uint8Array(N); this.cs = new Uint16Array(N);
    this.stamp = 0;
    this.hf = new Float32Array(4096); this.hi = new Int32Array(4096); this.hn = 0;
    // (a tunnel: its two mouths joined, for the van — pedestrians stay out)
    this.portals = new Map();
    for (const tn of map.tunnels || []) {
      const a = tn.pts[0], b = tn.pts[tn.pts.length - 1];
      let len = 0;
      for (let k = 1; k < tn.pts.length; k++) len += Math.hypot(tn.pts[k][0] - tn.pts[k - 1][0], tn.pts[k][1] - tn.pts[k - 1][1]);
      const ia = this.near(a[0], a[1], 3, 'van'), ib = this.near(b[0], b[1], 3, 'van');
      if (ia < 0 || ib < 0) continue;
      for (const [i, j] of [[ia, ib], [ib, ia]]) (this.portals.get(i) || this.portals.set(i, []).get(i)).push({ j, c: len });
    }
  }

  // what a step onto tile i costs (0: you can't) — the van never into water, a closed road nor
  // (off the paths) through a building or a tree
  price(i, prof) {
    if (this.cs[i] === this.stamp) return this.cc[i] / 8;
    const m = this.m, x = i % m.W, z = (i / m.W) | 0, X = m.X0 + x, Z = m.Z0 + z, t = m.ground[i];
    let c = 0;
    const deck = m.deck && m.deck[i];
    if (this.col.walkable(X, Z, prof === 'foot')) {
      if (deck || EASY.has(t)) c = prof === 'van' && t !== TT.ASPHALT && !deck ? 7 : 1;
      else if (WET.has(t)) c = prof === 'foot' ? 25 : 0;
      else if (this.col.blocked(X + 0.5, Z + 0.5, 0.25, null, false)) c = 0;
      else c = prof === 'van' ? 7 : t === TT.SHALLOW ? 1.8 : 2.4;
      if (c && prof === 'van' && this.closed && this.closed(X + 0.5, Z + 0.5)) c = 0;
    }
    this.cs[i] = this.stamp; this.cc[i] = Math.round(c * 8);
    return c;
  }

  // the nearest tile a traveller can stand on, within r of (x, z) (world tiles) — -1: none
  near(x, z, r, prof) {
    const m = this.m, cx = Math.floor(x - m.X0), cz = Math.floor(z - m.Z0);
    if (!this.stamp) this.fresh();
    let best = -1, bd = Infinity;
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      const tx = cx + dx, tz = cz + dz, d = dx * dx + dz * dz;
      if (tx < 0 || tz < 0 || tx >= m.W || tz >= m.H || d >= bd || d > r * r) continue;
      const i = tz * m.W + tx, c = this.price(i, prof);
      if (c && c < 20 && d < bd) { bd = d; best = i; }
    }
    return best;
  }

  fresh() {
    if (++this.stamp > 65000) { this.stamp = 1; this.seen.fill(0); this.shut.fill(0); this.cs.fill(0); }
  }

  // a new search from (fx, fz) to (tx, tz), world tiles — null when either end has no ground near
  start(fx, fz, tx, tz, prof = 'foot', closed = null) {
    this.fresh();
    this.closed = closed;
    const s = this.near(fx, fz, 4, prof), goal = this.near(tx, tz, 10, prof);
    if (s < 0 || goal < 0) return null;
    const m = this.m, job = { stamp: this.stamp, prof, s, goal, gx: goal % m.W, gz: (goal / m.W) | 0, n: 0, state: 'run', path: null, best: s, bh: 0 };
    this.hn = 0;
    this.seen[s] = this.stamp; this.g[s] = 0; this.from[s] = -1;
    job.bh = this.h(s, job);
    this.push(s, job.bh);
    return job;
  }

  h(i, job) {
    const W = this.m.W, dx = Math.abs(i % W - job.gx), dz = Math.abs(((i / W) | 0) - job.gz);
    return (Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz)) * HW;
  }

  // up to `budget` more steps; the job's state: 'run' → 'found' (job.path: [x, z, x, z…] from start to
  // goal, tile middles), 'near' (no way there: the way to the nearest ground that is — a place over a
  // drop, across a creek) or 'none'
  step(job, budget = 6000) {
    if (job.state !== 'run') return job.state;
    if (job.stamp !== this.stamp) { job.state = 'none'; return 'none'; }      // (another search took over)
    const m = this.m, W = m.W, H = m.H, st = this.stamp, prof = job.prof;
    while (budget-- > 0) {
      if (!this.hn || job.n > 900000) {
        if (job.best !== job.s) { job.path = this.trace(job.best); job.state = 'near'; } else job.state = 'none';
        return job.state;
      }
      const cur = this.pop();
      if (this.shut[cur] === st) continue;
      this.shut[cur] = st; job.n++;
      if (cur === job.goal) { job.path = this.trace(cur); job.state = 'found'; return 'found'; }
      const hc = this.h(cur, job);
      if (hc < job.bh) { job.bh = hc; job.best = cur; }
      const cx = cur % W, cz = (cur / W) | 0, g0 = this.g[cur];
      for (let k = 0; k < 8; k++) {
        const x = cx + DX[k], z = cz + DZ[k];
        if (x < 0 || z < 0 || x >= W || z >= H) continue;
        const ni = z * W + x;
        if (this.shut[ni] === st) continue;
        const c = this.price(ni, prof);
        if (!c) continue;
        // (no cutting a corner past something in the way)
        if (k >= 4 && (!this.price(cz * W + x, prof) || !this.price(z * W + cx, prof))) continue;
        this.relax(cur, ni, g0 + c * STEP[k], job);
      }
      if (prof === 'van') { const P = this.portals.get(cur); if (P) for (const q of P) if (this.shut[q.j] !== st) this.relax(cur, q.j, g0 + q.c, job); }
    }
    return 'run';
  }

  relax(cur, ni, g, job) {
    const st = this.stamp;
    if (this.seen[ni] === st && g >= this.g[ni]) return;
    this.seen[ni] = st; this.g[ni] = g; this.from[ni] = cur;
    this.push(ni, g + this.h(ni, job));
  }

  trace(i) {
    const m = this.m, out = [];
    for (let k = i; k >= 0; k = this.from[k]) out.push(k);
    out.reverse();
    const pts = new Float32Array(out.length * 2);
    out.forEach((k, j) => { pts[j * 2] = m.X0 + (k % m.W) + 0.5; pts[j * 2 + 1] = m.Z0 + ((k / m.W) | 0) + 0.5; });
    return pts;
  }

  // (a binary heap of tiles by estimated cost)
  push(i, f) {
    if (this.hn >= this.hf.length) {
      const nf = new Float32Array(this.hf.length * 2), ni = new Int32Array(this.hi.length * 2);
      nf.set(this.hf); ni.set(this.hi); this.hf = nf; this.hi = ni;
    }
    const F = this.hf, I = this.hi;
    let k = this.hn++;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (F[p] <= f) break;
      F[k] = F[p]; I[k] = I[p]; k = p;
    }
    F[k] = f; I[k] = i;
  }
  pop() {
    const F = this.hf, I = this.hi, top = I[0], n = --this.hn;
    if (n > 0) {
      const f = F[n], i = I[n];
      let k = 0;
      for (;;) {
        let c = k * 2 + 1;
        if (c >= n) break;
        if (c + 1 < n && F[c + 1] < F[c]) c++;
        if (F[c] >= f) break;
        F[k] = F[c]; I[k] = I[c]; k = c;
      }
      F[k] = f; I[k] = i;
    }
    return top;
  }
}
