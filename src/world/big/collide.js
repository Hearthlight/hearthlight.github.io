// Collision for the big world: the same interface as world/collision.js
// (blocked / move / add / remove) over the big tile map, with colliders kept
// in a uniform grid of 2-tile cells. Swimmers (a flag on the query) may cross
// water; everyone else stops at the shore.

import { TT, TINFO, HIGH } from '../tiles.js';
import { Collision } from '../collision.js';

const CELL = 2;

export class BigCollision {
  constructor(m) {
    this.m = m;
    this.X0 = m.X0; this.Z0 = m.Z0; this.w = m.W; this.h = m.H;
    this.GW = Math.ceil(m.W / CELL) + 2; this.GH = Math.ceil(m.H / CELL) + 2;
    this.cells = new Array(this.GW * this.GH);
    this.colliders = [];
    this.grid = null;
    this.swim = false;           // set per query by swimmers (see move)
    this.bridge = null;          // (tx, tz) => the valley's bridge spans this water tile (once it's mended)
    this.rooms = null;           // Party Mode's rooms, far east of the map (party/rooms.js)
    this.murk = null;            // (World v7) the Murk: lands the story hasn't reached (saga/murk.js)
    this.dungeons = null;        // (World v7) the dungeon being played, far east of everything (saga/dungeon.js)
  }

  tile(x, z) {
    const m = this.m;
    if (x < m.X0 || z < m.Z0 || x >= m.X0 + m.W || z >= m.Z0 + m.H) return TT.VOID;
    return m.ground[(z - m.Z0) * m.W + (x - m.X0)];
  }

  walkable(tx, tz, swim = false) {
    const m = this.m;
    if (this.dungeons && tx >= this.dungeons.X) return this.dungeons.walkable(tx, tz);
    if (tx < m.X0 || tz < m.Z0 || tx >= m.X0 + m.W || tz >= m.Z0 + m.H) return !!this.rooms && tx >= this.rooms.X && this.rooms.walkable(tx, tz);
    const i = (tz - m.Z0) * m.W + (tx - m.X0);
    if (this.murk && this.murk.shut[m.zone[i]]) return false;
    if (m.deck[i]) return true;
    const t = m.ground[i];
    // the relief: a cliff's face, a ledge over a big drop — only paths (stairs) cross them
    // (block 3: an outdoor instance’s edge — thick woods nobody walks through)
    if (m.block ? m.block[i] === 3 || (m.block[i] && t !== TT.PATH && t !== TT.OBSIDIAN) : !HIGH.has(t) && t !== TT.PATH && tz > m.Z0 && HIGH.has(m.ground[i - m.W])) return false;
    if (t === TT.WATER || t === TT.CORAL) return swim || (!!this.bridge && this.bridge(tx, tz));
    if (!TINFO[t] || !TINFO[t].walk) return false;
    return true;
  }

  _cell(cx, cz) { return (cz + 1) * this.GW + (cx + 1); }
  _bounds(c) {
    if (c.rect) return [c.rect[0], c.rect[1], c.rect[0] + c.rect[2], c.rect[1] + c.rect[3]];
    return [c.x - c.r, c.z - c.r, c.x + c.r, c.z + c.r];
  }
  _each(c, fn) {
    const [x0, z0, x1, z1] = this._bounds(c);
    const a = Math.floor((x0 - this.X0) / CELL), b = Math.floor((x1 - this.X0) / CELL);
    const e = Math.floor((z0 - this.Z0) / CELL), f = Math.floor((z1 - this.Z0) / CELL);
    for (let cz = Math.max(-1, e); cz <= Math.min(this.GH - 2, f); cz++) for (let cx = Math.max(-1, a); cx <= Math.min(this.GW - 2, b); cx++) fn(this._cell(cx, cz));
  }

  add(c) {
    this.colliders.push(c);
    this._each(c, (k) => { (this.cells[k] || (this.cells[k] = [])).push(c); });
    this.grid = null;
  }

  addMany(list) { for (const c of list) this.add(c); }

  remove(c) {
    const i = this.colliders.indexOf(c);
    if (i >= 0) this.colliders.splice(i, 1);
    this._each(c, (k) => { const a = this.cells[k]; if (a) { const j = a.indexOf(c); if (j >= 0) a.splice(j, 1); } });
  }

  setColliders(list) { this.colliders = []; this.cells = new Array(this.GW * this.GH); this.addMany(list); }

  blocked(x, z, r = 0.28, ignore = null, swim = this.swim) {
    if (this.dungeons && x >= this.dungeons.X) return this.dungeons.blocked(x, z, r, ignore);
    if (this.rooms && x >= this.rooms.X) return this.rooms.blocked(x, z, r, ignore);
    const tx0 = Math.floor(x - r), tx1 = Math.floor(x + r), tz0 = Math.floor(z - r), tz1 = Math.floor(z + r);
    for (let tz = tz0; tz <= tz1; tz++) for (let tx = tx0; tx <= tx1; tx++) {
      if (this.walkable(tx, tz, swim)) continue;
      const nx = Math.max(tx, Math.min(x, tx + 1)), nz = Math.max(tz, Math.min(z, tz + 1));
      if ((x - nx) ** 2 + (z - nz) ** 2 < r * r) return true;
    }
    const a = Math.floor((x - r - this.X0) / CELL), b = Math.floor((x + r - this.X0) / CELL);
    const e = Math.floor((z - r - this.Z0) / CELL), f = Math.floor((z + r - this.Z0) / CELL);
    for (let cz = e; cz <= f; cz++) for (let cx = a; cx <= b; cx++) {
      if (cx < -1 || cz < -1 || cx > this.GW - 2 || cz > this.GH - 2) continue;
      const list = this.cells[this._cell(cx, cz)];
      if (!list) continue;
      for (const c of list) {
        if (c === ignore || c.disabled) continue;
        if (c.rect) {
          const [rx, rz, rw, rh] = c.rect;
          const nx = Math.max(rx, Math.min(x, rx + rw)), nz = Math.max(rz, Math.min(z, rz + rh));
          if ((x - nx) ** 2 + (z - nz) ** 2 < r * r) return true;
        } else if ((x - c.x) ** 2 + (z - c.z) ** 2 < (r + c.r) ** 2) return true;
      }
    }
    return false;
  }

  // Move with sliding (same feel as the valley's). `swim` lets water through.
  move(pos, dx, dz, r = 0.28, swim = false) {
    const prev = this.swim;
    this.swim = swim;
    let moved = false;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / 0.2));
    const sx = dx / steps, sz = dz / steps;
    for (let i = 0; i < steps; i++) {
      if (sx && !this.blocked(pos.x + sx, pos.z, r)) { pos.x += sx; moved = true; }
      else if (sx) { for (const nz of [0.12, -0.12]) if (!this.blocked(pos.x + sx, pos.z + nz, r) && !this.blocked(pos.x, pos.z + nz * 0.5, r)) { pos.z += nz * 0.5; break; } }
      if (sz && !this.blocked(pos.x, pos.z + sz, r)) { pos.z += sz; moved = true; }
      else if (sz) { for (const nx of [0.12, -0.12]) if (!this.blocked(pos.x + nx, pos.z + sz, r) && !this.blocked(pos.x + nx * 0.5, pos.z, r)) { pos.x += nx * 0.5; break; } }
    }
    this.swim = prev;
    return moved;
  }

  // The valley-sized walk grid (the Explore act still places things in the
  // valley with it); pathfinding stays a valley thing too.
  buildGrid(radius = 0.3) {
    const W = 240, H = 128, g = new Uint8Array(W * H);
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) g[z * W + x] = this.blocked(x + 0.5, z + 0.5, radius) ? 0 : 1;
    this.grid = g;
    return g;
  }

  path(fx, fz, tx, tz, maxNodes) {
    // a valley-only A* on demand (villagers never leave the valley)
    if (!this.valleyCol) {
      this.valleyCol = new Collision(240, 128, (x, z) => this.walkable(x, z), []);
      this.valleyCol.blocked = (x, z, r, ignore) => this.blocked(x, z, r, ignore);
    }
    return this.valleyCol.path(fx, fz, tx, tz, maxNodes);
  }
}
