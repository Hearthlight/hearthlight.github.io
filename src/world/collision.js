// Circle-vs-world collision (tile walkability + circle/rect colliders) with a
// spatial hash, axis-separated sliding movement, and an A* pathfinder on the
// tile grid for villagers.

const CELL = 2;

export class Collision {
  // walkable(tx, tz) -> bool ; colliders: [{x,z,r} | {rect:[x,z,w,h]}]
  constructor(w, h, walkable, colliders = []) {
    this.w = w; this.h = h;
    this.walkable = walkable;
    this.setColliders(colliders);
  }

  setColliders(colliders) {
    this.colliders = colliders;
    this.hash = new Map();
    for (const c of colliders) this._insert(c);
    this.grid = null;
  }

  add(c) { this.colliders.push(c); this._insert(c); this.grid = null; }
  remove(c) {
    this.colliders = this.colliders.filter((x) => x !== c);
    this.setColliders(this.colliders);
  }

  _bounds(c) {
    if (c.rect) return [c.rect[0], c.rect[1], c.rect[0] + c.rect[2], c.rect[1] + c.rect[3]];
    return [c.x - c.r, c.z - c.r, c.x + c.r, c.z + c.r];
  }
  _insert(c) {
    const [x0, z0, x1, z1] = this._bounds(c);
    for (let cz = Math.floor(z0 / CELL); cz <= Math.floor(z1 / CELL); cz++)
      for (let cx = Math.floor(x0 / CELL); cx <= Math.floor(x1 / CELL); cx++) {
        const k = cx + ',' + cz;
        let a = this.hash.get(k);
        if (!a) { a = []; this.hash.set(k, a); }
        a.push(c);
      }
  }

  // Is a circle at (x,z) with radius r blocked?
  blocked(x, z, r = 0.28, ignore = null) {
    // tiles
    const tx0 = Math.floor(x - r), tx1 = Math.floor(x + r), tz0 = Math.floor(z - r), tz1 = Math.floor(z + r);
    for (let tz = tz0; tz <= tz1; tz++) for (let tx = tx0; tx <= tx1; tx++) {
      if (this.walkable(tx, tz)) continue;
      // circle vs tile rect
      const nx = Math.max(tx, Math.min(x, tx + 1)), nz = Math.max(tz, Math.min(z, tz + 1));
      if ((x - nx) ** 2 + (z - nz) ** 2 < r * r) return true;
    }
    // colliders
    const seen = new Set();
    for (let cz = Math.floor((z - r) / CELL); cz <= Math.floor((z + r) / CELL); cz++)
      for (let cx = Math.floor((x - r) / CELL); cx <= Math.floor((x + r) / CELL); cx++) {
        const a = this.hash.get(cx + ',' + cz);
        if (!a) continue;
        for (const c of a) {
          if (seen.has(c) || c === ignore || c.disabled) continue;
          seen.add(c);
          if (c.rect) {
            const [rx, rz, rw, rh] = c.rect;
            const nx = Math.max(rx, Math.min(x, rx + rw)), nz = Math.max(rz, Math.min(z, rz + rh));
            if ((x - nx) ** 2 + (z - nz) ** 2 < r * r) return true;
          } else if ((x - c.x) ** 2 + (z - c.z) ** 2 < (r + c.r) ** 2) return true;
        }
      }
    return false;
  }

  // Move with sliding. Returns the actual displacement applied.
  move(pos, dx, dz, r = 0.28) {
    let moved = false;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / 0.2));
    const sx = dx / steps, sz = dz / steps;
    for (let i = 0; i < steps; i++) {
      if (sx && !this.blocked(pos.x + sx, pos.z, r)) { pos.x += sx; moved = true; }
      else if (sx) {
        // corner nudge: slide around small obstacles
        for (const nz of [0.12, -0.12]) if (!this.blocked(pos.x + sx, pos.z + nz, r) && !this.blocked(pos.x, pos.z + nz * 0.5, r)) { pos.z += nz * 0.5; break; }
      }
      if (sz && !this.blocked(pos.x, pos.z + sz, r)) { pos.z += sz; moved = true; }
      else if (sz) {
        for (const nx of [0.12, -0.12]) if (!this.blocked(pos.x + nx, pos.z + sz, r) && !this.blocked(pos.x + nx * 0.5, pos.z, r)) { pos.x += nx * 0.5; break; }
      }
    }
    return moved;
  }

  // Tile grid for pathfinding (cached). 1 = walkable.
  buildGrid(radius = 0.3) {
    const g = new Uint8Array(this.w * this.h);
    for (let z = 0; z < this.h; z++) for (let x = 0; x < this.w; x++) {
      g[z * this.w + x] = this.blocked(x + 0.5, z + 0.5, radius) ? 0 : 1;
    }
    this.grid = g;
    return g;
  }

  path(fx, fz, tx, tz, maxNodes = 6000) {
    if (!this.grid) this.buildGrid();
    const W = this.w, H = this.h, g = this.grid;
    const sx = Math.floor(fx), sz = Math.floor(fz);
    let ex = Math.floor(tx), ez = Math.floor(tz);
    const inb = (x, z) => x >= 0 && z >= 0 && x < W && z < H;
    if (!inb(sx, sz) || !inb(ex, ez)) return null;
    if (!g[ez * W + ex]) {
      // nearest walkable tile to the goal
      let best = null, bd = 1e9;
      for (let r = 1; r < 4 && !best; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        const x = ex + dx, z = ez + dz;
        if (inb(x, z) && g[z * W + x]) { const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = [x, z]; } }
      }
      if (!best) return null;
      [ex, ez] = best;
    }
    const start = sz * W + sx, goal = ez * W + ex;
    const open = new MinHeap();
    const gScore = new Map([[start, 0]]);
    const came = new Map();
    const hf = (i) => { const x = i % W, z = (i / W) | 0; return Math.abs(x - ex) + Math.abs(z - ez); };
    open.push(start, hf(start));
    let n = 0;
    while (open.size && n++ < maxNodes) {
      const cur = open.pop();
      if (cur === goal) {
        const out = [];
        let c = cur;
        while (c !== undefined) { out.push([(c % W) + 0.5, ((c / W) | 0) + 0.5]); c = came.get(c); }
        out.reverse();
        out[out.length - 1] = [tx, tz];
        return smoothPath(out, this);
      }
      const cx = cur % W, cz = (cur / W) | 0;
      for (const [dx, dz, cost] of NB) {
        const x = cx + dx, z = cz + dz;
        if (!inb(x, z)) continue;
        const ni = z * W + x;
        if (!g[ni] && ni !== goal) continue;
        if (dx && dz && (!g[cz * W + x] || !g[z * W + cx])) continue; // no corner cutting
        const t = gScore.get(cur) + cost;
        if (t < (gScore.get(ni) ?? Infinity)) {
          gScore.set(ni, t);
          came.set(ni, cur);
          open.push(ni, t + hf(ni));
        }
      }
    }
    return null;
  }
}

const NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];

// Drop intermediate waypoints that have clear line-of-sight.
function smoothPath(pts, col) {
  if (pts.length <= 2) return pts;
  const out = [pts[0]];
  let i = 0;
  while (i < pts.length - 1) {
    let j = pts.length - 1;
    while (j > i + 1 && !clearLine(pts[i], pts[j], col)) j--;
    out.push(pts[j]);
    i = j;
  }
  return out;
}

function clearLine(a, b, col) {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.ceil(d / 0.25);
  for (let k = 1; k < n; k++) {
    const x = a[0] + ((b[0] - a[0]) * k) / n, z = a[1] + ((b[1] - a[1]) * k) / n;
    if (col.blocked(x, z, 0.3)) return false;
  }
  return true;
}

class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(v, p) {
    const a = this.a;
    a.push([p, v]);
    let i = a.length - 1;
    while (i > 0) {
      const pi = (i - 1) >> 1;
      if (a[pi][0] <= a[i][0]) break;
      [a[pi], a[i]] = [a[i], a[pi]];
      i = pi;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top[1];
  }
}

// "Get unstuck": is (x, z) a trap — inside something, or a little pocket of
// ground (between trees, rocks…) smaller than `room` tiles? And the nearest
// spot with room around it within maxR tiles (south — in front — first).
// `ok(x, z)` can veto ground (water, outside an arena…).
function roomy(col, x, z, room, ok) {
  const open = (px, pz) => !col.blocked(px, pz, 0.45) && (!ok || ok(px, pz));
  const t0 = Math.floor(x) + ',' + Math.floor(z), seen = new Set(), q = [[Math.floor(x), Math.floor(z)]];
  let n = 0;
  while (q.length && n < room) {
    const [tx, tz] = q.shift(), k = tx + ',' + tz;
    if (seen.has(k) || seen.size > room * 4) continue;
    seen.add(k);
    // (the hero's own tile leads on even when its middle is taken — they stand at its edge,
    // against a fountain's rim)
    if (!open(tx + 0.5, tz + 0.5)) { if (k === t0) q.push([tx + 1, tz], [tx - 1, tz], [tx, tz + 1], [tx, tz - 1]); continue; }
    n++;
    q.push([tx + 1, tz], [tx - 1, tz], [tx, tz + 1], [tx, tz - 1]);
  }
  return n >= room;
}

// (r: how much of the hero must overlap something — the stuck watch asks for the centre itself
// being inside, not a hero merely leaning on a tree)
export function stuckAt(col, x, z, { room = 40, ok = null, r = 0.3 } = {}) {
  return col.blocked(x, z, r) || !roomy(col, x, z, room, ok);
}

export function findUnstuck(col, x, z, { maxR = 12, room = 40, ok = null } = {}) {
  const open = (px, pz) => !col.blocked(px, pz, 0.45) && (!ok || ok(px, pz));
  for (let r = 1.5; r <= maxR; r += 0.75) {
    const n = Math.max(12, Math.round(r * 7));
    for (let k = 0; k < n; k++) {
      const a = Math.PI / 2 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * ((Math.PI * 2) / n);
      const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      if (open(px, pz) && !col.blocked(px, pz, 0.8) && roomy(col, px, pz, room, ok)) return { x: px, z: pz };
    }
  }
  return null;
}
