// The world map on the phone (Phone v6). The big screen sends the world's picture
// once, then — every second while the map is open — the fog, the marks, everyone's
// whereabouts and the lands' names; the phone draws it all itself, so it pans and
// zooms right under your fingers: drag (a flick keeps it gliding), pinch, double-tap,
// the +/− buttons, « me » and « the whole world ». Tap a mark or a friend: their name.
// The lands' names never sit on top of each other (more of them as you zoom in).

import { drawText, measure } from '../engine/font.js';
import { panel, UI, fitText } from '../ui/ui.js';
import { drawMark, drawFlag, MARK_MAJOR } from '../party/mapmarks.js';
import { paintVeilData, fogFromBits, FOG } from '../world/big/minimap.js';
import { t } from '../i18n.js';

const LEVELS = [0.5, 1, 2, 3, 4, 6];      // pixels a tile (below them: the whole world)
const MAXK = 8;
const hitR = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
const URGENT = new Set(['target', 'invasion', 'hill']);     // (these always show)

export class PadMap {
  constructor() {
    this.base = null; this.v = ''; this.fogStr = null; this.veil = null; this.d = null;
    this.view = null; this.anim = null; this.vel = null; this.touch = new Map(); this.pinch = null;
    this.tip = null; this.hits = []; this.lastTap = null; this.legend = false; this.recenter = true;
  }

  // ---- what the big screen sends
  onBase(m) {
    this.v = m.v; this.X0 = m.X0; this.Z0 = m.Z0; this.W = m.W; this.H = m.H; this.fogStr = null;
    const img = new Image();
    img.onload = () => { this.base = img; };
    img.src = m.src;
  }
  onUpdate(m) {
    this.d = m;
    this.R = m.r || null;           // (World v7) the continent shown whole: [x0, z0, w, h]
    if (this.W && m.fog !== this.fogStr) { this.fogStr = m.fog; this.paintVeil(); }
  }
  paintVeil() {
    const FW = Math.ceil(this.W / FOG), FH = Math.ceil(this.H / FOG);
    const c = this.veil || (this.veil = document.createElement('canvas'));
    c.width = this.W; c.height = this.H;
    const g = c.getContext('2d'), img = g.createImageData(this.W, this.H);
    paintVeilData(img.data, fogFromBits(this.fogStr, FW * FH), FW, FH, this.W, this.H);
    g.putImageData(img, 0, 0);
  }
  ready() { return !!(this.base && this.d && this.veil); }
  me() { const p = this.d && this.d.p.find((q) => q[4]); return p ? { x: p[0], z: p[1] } : null; }
  here() { const z = this.d && this.d.z.find((q) => q[4]); return (this.d && this.d.ti) || (z ? z[0] : ''); }
  // (where you're heading: that place's spot — its tip offers « stop » then)
  heading(x, z) { const D = this.d && this.d.dest; return !!D && Math.hypot(D[0] - x, D[1] - z) < 1.6; }

  // ---- the view: the world point in the box's middle, k pixels a tile
  fitK(B) { const R = this.R; return Math.min(B.w / (R ? R[2] : this.W), B.h / (R ? R[3] : this.H)); }
  clamp(B, v = this.view) {
    v.k = Math.max(this.fitK(B), Math.min(MAXK, v.k));
    const hw = B.w / 2 / v.k, hh = B.h / 2 / v.k;
    v.cx = hw * 2 >= this.W ? this.X0 + this.W / 2 : Math.max(this.X0 + hw, Math.min(this.X0 + this.W - hw, v.cx));
    // (the whole world on a tall phone sits a little higher: the legend goes under it)
    const spare = B.h - (this.R ? this.R[3] : this.H) * v.k, lh = this.d ? 38 + this.d.k.length * 12 : 0;
    v.cz = hh * 2 >= this.H ? this.Z0 + this.H / 2 + (spare > lh ? lh / 2 / v.k : 0) : Math.max(this.Z0 + hh, Math.min(this.Z0 + this.H - hh, v.cz));
    return v;
  }
  toScreen(B, x, z) { const v = this.view; return { x: B.x + B.w / 2 + (x - v.cx) * v.k, y: B.y + B.h / 2 + (z - v.cz) * v.k }; }
  toWorld(B, px, py) { const v = this.view; return { x: v.cx + (px - B.x - B.w / 2) / v.k, z: v.cz + (py - B.y - B.h / 2) / v.k }; }
  // a smooth move to another view (the zoom eases in log space)
  goTo(B, to, dur = 0.28) {
    const from = { ...this.view };
    this.anim = { from, to: this.clamp(B, { ...from, ...to }), t: 0, dur };
    this.vel = null;
  }
  // the next zoom level in (1) or out (-1), keeping the world point under (px, py) there
  step(B, dir, px = B.x + B.w / 2, py = B.y + B.h / 2) {
    const fit = this.fitK(B), levels = [fit, ...LEVELS.filter((k) => k > fit * 1.3)], k = this.view.k;
    let nk = dir > 0 ? levels.find((q) => q > k * 1.05) : [...levels].reverse().find((q) => q < k / 1.05);
    if (nk === undefined) nk = dir > 0 ? levels[levels.length - 1] : fit;
    const w = this.toWorld(B, px, py);
    this.goTo(B, { k: nk, cx: w.x - (px - B.x - B.w / 2) / nk, cz: w.z - (py - B.y - B.h / 2) / nk });
  }
  world(B) { const R = this.R; this.goTo(B, { k: this.fitK(B), cx: R ? R[0] + R[2] / 2 : this.X0 + this.W / 2, cz: R ? R[1] + R[3] / 2 : this.Z0 + this.H / 2 }, 0.35); }
  centreMe(B) { const m = this.me(); if (m) this.goTo(B, { cx: m.x, cz: m.z, k: Math.max(2, this.view.k) }, 0.35); }
  // (at rest, from one pixel a tile up: whole pixels — crisp)
  settle(B) { const k = this.view.k; if (k >= 0.95) { const nk = Math.max(1, Math.round(k)); if (Math.abs(nk - k) > 0.01) this.goTo(B, { k: nk }, 0.16); } }

  update(dt, B) {
    if (!this.view) return;
    if (this.anim) {
      const A = this.anim;
      A.t += dt;
      const e = Math.min(1, A.t / A.dur), s = e < 0.5 ? 2 * e * e : 1 - (-2 * e + 2) ** 2 / 2;
      this.view.k = Math.exp(Math.log(A.from.k) + (Math.log(A.to.k) - Math.log(A.from.k)) * s);
      this.view.cx = A.from.cx + (A.to.cx - A.from.cx) * s;
      this.view.cz = A.from.cz + (A.to.cz - A.from.cz) * s;
      if (e >= 1) this.anim = null;
    } else if (this.vel && !this.touch.size) {
      this.view.cx -= this.vel.x * dt; this.view.cz -= this.vel.z * dt;
      const f = Math.exp(-dt * 4.5);
      this.vel.x *= f; this.vel.z *= f;
      if (Math.hypot(this.vel.x, this.vel.z) * this.view.k < 6) this.vel = null;
      this.clamp(B);
    }
    if (this.tip && this.tip.until < performance.now()) this.tip = null;
    this.goBox = null;
  }

  // ---- fingers (UI pixels, times in ms)
  down(B, id, p, now) {
    this.anim = null; this.vel = null;
    this.touch.set(id, { x: p.x, y: p.y, x0: p.x, y0: p.y, t0: now, moved: false, hist: [[now, p.x, p.y]] });
    if (this.touch.size === 2) {
      const [a, b] = [...this.touch.values()];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      this.pinch = { d0: Math.max(8, Math.hypot(a.x - b.x, a.y - b.y)), k0: this.view.k, w: this.toWorld(B, mid.x, mid.y) };
      for (const q of this.touch.values()) q.moved = true;
    }
  }
  move(B, id, p, now) {
    const q = this.touch.get(id);
    if (!q) return;
    const dx = p.x - q.x, dy = p.y - q.y;
    q.x = p.x; q.y = p.y;
    if (Math.hypot(p.x - q.x0, p.y - q.y0) > 4) q.moved = true;
    q.hist.push([now, p.x, p.y]);
    if (q.hist.length > 6) q.hist.shift();
    if (this.pinch && this.touch.size >= 2) {
      const [a, b] = [...this.touch.values()];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, d = Math.hypot(a.x - b.x, a.y - b.y);
      const k = Math.max(this.fitK(B), Math.min(MAXK, (this.pinch.k0 * d) / this.pinch.d0));
      this.view.k = k;
      this.view.cx = this.pinch.w.x - (mx - B.x - B.w / 2) / k;
      this.view.cz = this.pinch.w.z - (my - B.y - B.h / 2) / k;
      this.clamp(B);
    } else if (q.moved && !this.pinch) {
      this.view.cx -= dx / this.view.k; this.view.cz -= dy / this.view.k;
      this.clamp(B);
    }
  }
  up(B, id, p, now, cancel) {
    const q = this.touch.get(id);
    this.touch.delete(id);
    if (!q) return;
    if (this.pinch) {
      if (this.touch.size < 2) { this.pinch = null; this.settle(B); for (const r of this.touch.values()) { r.x0 = r.x; r.y0 = r.y; r.hist = [[now, r.x, r.y]]; } }
      return;
    }
    if (cancel) return;
    if (!q.moved && now - q.t0 < 400) {
      // a tap: what's there — or, the second of a double-tap, zoom in right there (a tap on the tip's
      // « go there » is pad.js's)
      const dbl = this.lastTap && now - this.lastTap.t < 330 && Math.hypot(p.x - this.lastTap.x, p.y - this.lastTap.y) < 14;
      this.lastTap = dbl ? null : { t: now, x: p.x, y: p.y };
      if (dbl) { this.tip = null; this.step(B, 1, p.x, p.y); } else this.pick(p.x, p.y);
      return;
    }
    // a flick keeps it gliding
    const h = q.hist, a = h[0], b = h[h.length - 1], secs = (b[0] - a[0]) / 1000;
    if (secs > 0.01 && now - b[0] < 90) {
      const vx = (b[1] - a[1]) / secs, vy = (b[2] - a[2]) / secs;
      if (Math.hypot(vx, vy) > 70) this.vel = { x: vx / this.view.k, z: vy / this.view.k };
    }
  }
  pick(px, py) {
    let best = null, bd = 11;
    for (const h of this.hits) { const d = Math.hypot(h.x - px, h.y - py); if (d < bd) { bd = d; best = h; } }
    // (a place you may go to: its tip stays while you decide)
    this.tip = best ? { h: best, until: performance.now() + (best.g ? 9000 : 3500) } : null;
  }

  // ---- drawing
  draw(ctx, B, time) {
    if (!this.view || this.recenter) {
      const m = this.me(), k = this.view ? this.view.k : 2;
      this.view = this.clamp(B, { cx: m ? m.x : this.X0 + this.W / 2, cz: m ? m.z : this.Z0 + this.H / 2, k });
      this.recenter = false;
    }
    const k = this.view.k;
    ctx.save();
    ctx.beginPath(); ctx.rect(B.x, B.y, B.w, B.h); ctx.clip();
    ctx.fillStyle = '#241a30'; ctx.fillRect(B.x, B.y, B.w, B.h);
    // the world (only the part in view): crisp from one pixel a tile up, smooth below
    const crisp = k >= 0.95, o = this.toScreen(B, this.X0, this.Z0);
    const ox = crisp ? Math.round(o.x) : o.x, oy = crisp ? Math.round(o.y) : o.y;
    const sx0 = Math.max(0, Math.floor((B.x - ox) / k)), sy0 = Math.max(0, Math.floor((B.y - oy) / k));
    const sx1 = Math.min(this.W, Math.ceil((B.x + B.w - ox) / k)), sy1 = Math.min(this.H, Math.ceil((B.y + B.h - oy) / k));
    ctx.imageSmoothingEnabled = !crisp;
    if (sx1 > sx0 && sy1 > sy0) for (const img of [this.base, this.veil]) ctx.drawImage(img, sx0, sy0, sx1 - sx0, sy1 - sy0, ox + sx0 * k, oy + sy0 * k, (sx1 - sx0) * k, (sy1 - sy0) * k);
    ctx.imageSmoothingEnabled = false;
    // everyone claims their spot, then the big marks and the lands' names, then the
    // little marks wherever they still fit (a name matters more than a dot) — zoomed far
    // out, the names go before the big marks too (that view is about the lands)
    const room = [];
    this.hits = [];
    this.drawPlayers(ctx, B, time, room, true);
    const wr = { x0: Math.max(B.x, ox), y0: Math.max(B.y, oy), x1: Math.min(B.x + B.w, ox + this.W * k), y1: Math.min(B.y + B.h, oy + this.H * k) };
    let big, names;
    if (k < 0.45) {
      const urgent = this.placeMarks(B, room, true, false, true);
      names = this.placeNames(B, room, wr);
      big = urgent.concat(this.placeMarks(B, room.concat(names.map((n) => n.r)), true, true, false));
    }
    else { big = this.placeMarks(B, room, true); names = this.placeNames(B, room, wr); }
    const small = this.placeMarks(B, room.concat(names.map((n) => n.r)), false);
    this.drawWay(ctx, B, time);
    for (const it of [...small, ...big]) this.drawMarkAt(ctx, it, time);
    this.drawPlayers(ctx, B, time, [], false);
    this.drawNames(ctx, names);
    if (this.tip) this.drawTip(ctx, B);
    ctx.restore();
    // (the whole world on a tall phone: the legend fills the room under it)
    const free = B.y + B.h - (o.y + this.H * k);
    if (this.legend || free > 40 + this.d.k.length * 12) this.drawLegend(ctx, B, !this.legend && free);
  }

  // the marks in view: the big ones (major) or the little ones; zoomed far out only the
  // big ones show, and a little one never sits on something else
  // (yield: a big mark gives way too, rather than sit on a name; urgent: only — or never —
  // the marks that always show)
  placeMarks(B, room, major, yieldToo = false, urgent = null) {
    const k = this.view.k, keep = [], list = this.d.m;
    if (!major && k < 0.45) return keep;
    for (let i = list.length - 1; i >= 0; i--) {              // (the important ones claim their spot first)
      const [kind, x, z, on, name, st, a, g] = list[i];
      if (MARK_MAJOR.has(kind) !== major) continue;
      if (urgent !== null && URGENT.has(kind) !== urgent) continue;
      const q = this.toScreen(B, x, z);
      if (q.x < B.x - 6 || q.y < B.y - 6 || q.x > B.x + B.w + 6 || q.y > B.y + B.h + 6) continue;
      const r = { x0: q.x - 5, y0: q.y - 5, x1: q.x + 5, y1: q.y + 5 };
      if ((!major || yieldToo) && k < 1.5 && room.some((o) => hitR(o, r))) continue;
      room.push(r);
      keep.unshift({ m: { k: kind, on, a }, q, name, st, x, z, g });
    }
    return keep;
  }
  drawMarkAt(ctx, it, time) {
    drawMark(ctx, it.m, it.q.x, it.q.y, time);
    this.hits.push({ x: it.q.x, y: it.q.y, wx: it.x, wz: it.z, name: it.name, st: it.st, g: it.g });
  }

  // the way to where you're heading: dots in your colour, and a flag at the place (party/guide.js)
  drawWay(ctx, B, time) {
    const D = this.d.dest, rt = this.d.rt;
    if (!D) return;
    if (rt && rt.length > 3) {
      let last = null, acc = 0;
      for (let k = 0; k < rt.length; k += 2) {
        const q = this.toScreen(B, rt[k], rt[k + 1]);
        if (last) acc += Math.hypot(q.x - last.x, q.y - last.y);
        if (!last || acc >= 4) {
          ctx.fillStyle = '#241a2e'; ctx.fillRect(Math.round(q.x) - 1, Math.round(q.y) - 1, 3, 3);
          ctx.fillStyle = D[3] || '#fff3c4'; ctx.fillRect(Math.round(q.x), Math.round(q.y), 1, 1);
          acc = 0;
        }
        last = q;
      }
    }
    const q = this.toScreen(B, D[0], D[1]);
    drawFlag(ctx, q.x, q.y + 1, D[3] || '#fff3c4', time);
  }

  // friends as dots in their colours; you bigger, with a ring that breathes — and an
  // arrow on the edge when you're out of view
  // (claim: just note where everyone is; else draw them)
  drawPlayers(ctx, B, time, room, claim) {
    let mine = null;
    for (const p of this.d.p) {
      const [x, z, color, name, me] = p;
      if (me) { mine = p; continue; }
      const q = this.toScreen(B, x, z), px = Math.round(q.x), py = Math.round(q.y);
      if (claim) { room.push({ x0: px - 4, y0: py - 4, x1: px + 4, y1: py + 4 }); continue; }
      ctx.fillStyle = '#241a2e'; ctx.fillRect(px - 3, py - 3, 7, 7);
      ctx.fillStyle = color; ctx.fillRect(px - 2, py - 2, 5, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(px - 2, py - 2, 5, 1);
      this.hits.push({ x: px, y: py, wx: x, wz: z, name, st: '' });
    }
    if (!mine) return;
    const [x, z, color, name] = mine;
    const q = this.toScreen(B, x, z), px = Math.round(q.x), py = Math.round(q.y);
    if (claim) { room.push({ x0: px - 9, y0: py - 9, x1: px + 9, y1: py + 9 }); return; }
    if (px >= B.x && py >= B.y && px < B.x + B.w && py < B.y + B.h) {
      const r = 6 + Math.round((Math.sin(time * 4) + 1) * 1.5);
      ctx.fillStyle = color;
      for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; ctx.fillRect(Math.round(px + Math.cos(a) * r), Math.round(py + Math.sin(a) * r), 1, 1); }
      ctx.fillStyle = '#241a2e'; ctx.fillRect(px - 4, py - 4, 9, 9);
      ctx.fillStyle = '#fff7e6'; ctx.fillRect(px - 3, py - 3, 7, 7);
      ctx.fillStyle = color; ctx.fillRect(px - 2, py - 2, 5, 5);
      this.hits.push({ x: px, y: py, wx: x, wz: z, name, st: t('You are here') });
    } else {
      // (out of view: an arrow on the edge, pointing your way)
      const cx = B.x + B.w / 2, cy = B.y + B.h / 2, dx = px - cx, dy = py - cy;
      const s = Math.min((B.w / 2 - 9) / Math.abs(dx || 1e-3), (B.h / 2 - 9) / Math.abs(dy || 1e-3));
      const ax = Math.round(cx + dx * s), ay = Math.round(cy + dy * s), a = Math.atan2(dy, dx);
      const tip = (r, w) => [[Math.cos(a) * r, Math.sin(a) * r], [Math.cos(a + 2.4) * w, Math.sin(a + 2.4) * w], [Math.cos(a - 2.4) * w, Math.sin(a - 2.4) * w]];
      for (const [pts, c] of [[tip(8, 7), '#241a2e'], [tip(6, 5), color]]) {
        ctx.fillStyle = c; ctx.beginPath(); pts.forEach(([u, v], i) => (i ? ctx.lineTo(ax + u, ay + v) : ctx.moveTo(ax + u, ay + v))); ctx.closePath(); ctx.fill();
      }
      this.hits.push({ x: ax, y: ay, wx: x, wz: z, name, st: t('You are here') });
    }
  }

  // the lands' names: yours first, then the biggest; each where it fits without covering
  // a mark or another name (nudged up or down a little)
  placeNames(B, room, wr) {
    const placed = [];
    const zs = [...this.d.z].sort((a, b) => b[4] - a[4] || b[3] - a[3]);
    for (const [name, x, z, , here] of zs) {
      const q = this.toScreen(B, x, z), w = measure(name) + 6;
      let ok = null;
      for (const dy of [0, -11, 11, -22, 22]) {
        const r = { x0: q.x - w / 2, y0: q.y - 5 + dy, x1: q.x + w / 2, y1: q.y + 6 + dy };
        if (r.x0 < wr.x0 + 2 || r.x1 > wr.x1 - 2 || r.y0 < wr.y0 + 2 || r.y1 > wr.y1 - 2) continue;
        if (placed.some((o) => hitR(o.r, r)) || room.some((o) => hitR(o, r))) continue;
        ok = r; break;
      }
      if (ok) placed.push({ r: ok, name, x: q.x, here, w });
    }
    return placed;
  }
  drawNames(ctx, placed) {
    for (const { r, name, x, here, w } of placed) {
      ctx.fillStyle = 'rgba(20,14,28,0.55)'; ctx.fillRect(Math.round(r.x0), Math.round(r.y0), Math.round(w), 11);
      drawText(ctx, name, Math.round(x), Math.round(r.y0) + 2, { color: here ? '#ffe070' : '#fff3c4', align: 'center', outline: '#241a2e' });
    }
  }

  // what you tapped: a little paper label (it follows the map as you move it) — a place you may
  // go to has a button under its name: « go there », or « stop » where you're already heading
  drawTip(ctx, B) {
    const h = this.tip.h, q = this.toScreen(B, h.wx, h.wz);
    const lines = [h.name, h.st].filter(Boolean).map((l) => fitText(l, B.w - 20));
    if (!lines.length) return;
    const stop = h.g && this.heading(h.wx, h.wz), go = h.g ? (stop ? t('Stop guiding') : t('Go there')) : '';
    const w = Math.max(...lines.map((l) => measure(l)), go ? measure(go) + 16 : 0) + 10, hh = lines.length * 10 + 5 + (go ? 18 : 0);
    const x = Math.round(Math.max(B.x + 2, Math.min(B.x + B.w - w - 2, q.x - w / 2)));
    let y = Math.round(q.y - 9 - hh);
    if (y < B.y + 2) y = Math.round(q.y + 9);
    ctx.fillStyle = '#3b2a22'; ctx.fillRect(x - 1, y - 1, w + 2, hh + 2);
    ctx.fillStyle = '#fff8ea'; ctx.fillRect(x, y, w, hh);
    lines.forEach((l, i) => drawText(ctx, l, x + 5, y + 3 + i * 10, { color: i ? UI.inkSoft : UI.ink }));
    if (!go) return;
    const by = y + hh - 17, bw = w - 8;
    ctx.fillStyle = '#3b2a22'; ctx.fillRect(x + 4, by, bw, 14);
    ctx.fillStyle = stop ? '#a8483a' : '#4f955a'; ctx.fillRect(x + 5, by + 1, bw - 2, 11);
    drawText(ctx, go, x + 4 + bw / 2, by + 3, { color: '#fff7e6', align: 'center' });
    this.goBox = { x: x + 2, y: by - 2, w: bw + 4, h: 18, h0: h, stop };
  }

  // the legend, over the bottom of the map (or in the room under the whole world):
  // what each mark is and how much is done
  drawLegend(ctx, B, under = 0) {
    const keys = this.d.k, stats = this.d.s, top = stats ? 22 : 10;
    const pw = Math.min(B.w - 12, 190), ph = top + 4 + keys.length * 12;
    const px = Math.round(B.x + (B.w - pw) / 2), py = Math.round(under ? B.y + B.h - under + Math.max(6, (under - ph) / 2) : B.y + B.h - ph - 6);
    panel(ctx, px, py, pw, ph);
    // (a map without lands to find has no count)
    if (stats) drawText(ctx, fitText(t('{n}/{total} lands · {p}% explored', { n: stats[0], total: stats[1], p: stats[2] }), pw - 16), px + pw / 2, py + 8, { color: UI.ink, align: 'center' });
    keys.forEach(([kind, name, n, tot], i) => {
      const y = py + top + i * 12;
      drawMark(ctx, { k: kind, on: kind === 'stone' }, px + 14, y + 4, 0);
      drawText(ctx, fitText(name, pw - (tot ? 70 : 34)), px + 24, y, { color: UI.ink });
      if (tot) drawText(ctx, `${n}/${tot}`, px + pw - 10, y, { color: n >= tot ? '#4f955a' : '#b8862a', align: 'right' });
    });
    this.legendBox = { x: px, y: py, w: pw, h: ph };
  }
}
