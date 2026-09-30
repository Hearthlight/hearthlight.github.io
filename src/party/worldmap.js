// The world map, shared by Party Mode (the big screen's full-screen map, the
// spare split-screen panel) and the solo game (the menu's map page, the
// minimap out in the wild lands). `P` is the party — or the solo game's Wild —
// whose systems put their marks on it.

import { drawText, measure } from '../engine/font.js';
import { makeCanvas } from '../engine/gfx.js';
import { ZONES, C1, C2 } from '../world/big/layout.js';
import { collectMarks, drawMarks, drawMark } from './mapmarks.js';
import { t } from '../i18n.js';

// the map around (cx, cz) at k screen pixels per tile, with everyone's marks;
// returns the world → screen mapping
export function drawWorldMap(P, ctx, x, y, w, h, cx, cz, k, opts = {}) {
  const WM = P.big && P.big.worldMap;
  if (!WM) return null;
  const Mraw = WM.draw(ctx, x, y, w, h, cx, cz, k);
  // (every mark's spot is noted, so the big map can keep its place names off them)
  const pts = (P.mapPts = []);
  const M = (px, pz) => { const q = Mraw(px, pz); pts.push(q); return q; };
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  drawMarks(ctx, M, collectMarks(P, opts.target), P.t);
  // (where each guided player is heading, and the way there — party/guide.js)
  if (P.guides) P.guides.drawOnMap(ctx, Mraw, opts.small);
  const r = opts.small ? 2 : 3;
  for (const p of P.players) {
    const at = P.rooms ? P.rooms.mapPos(p) : p.pos, q = M(at.x, at.z), px = Math.round(q.x), pz = Math.round(q.y);
    ctx.fillStyle = '#241a2e'; ctx.fillRect(px - r, pz - r, r * 2 + 1, r * 2 + 1);
    ctx.fillStyle = p.color; ctx.fillRect(px - r + 1, pz - r + 1, r * 2 - 1, r * 2 - 1);
    if (!opts.small) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(px - r + 1, pz - r + 1, r * 2 - 1, 1); }
  }
  ctx.restore();
  return Mraw;
}

// (World v7) the part of the world a map shows whole: the continent you're on —
// the Hearthlands (with Pelican Rock off their east coast) or the Dawnlands (with
// Whale Isle). You can still zoom and pan over the whole world.
export function mapRegion(P, who = null) {
  // (a map that says what it shows whole: its region, its name for a title)
  const m = P.big && P.big.map;
  if (m && m.region) return { x0: m.region[0], z0: m.region[1], x1: m.region[2], z1: m.region[3], id: 'map', title: m.title ? t(m.title) : '' };
  const p = who || P.players.find((q) => q.connected !== false) || P.players[0];
  const at = p ? (P.rooms ? P.rooms.mapPos(p) : p.pos) : null;
  if (at && at.x >= 540 && at.x < 2000) return { x0: 540, z0: C2.z0 - 8, x1: C2.x1 + 8, z1: C2.z1 + 8, id: 'dawn' };
  return { x0: C1.x0, z0: C1.z0, x1: C1.x1 + 48, z1: C1.z1, id: 'hearth' };
}

// the whole world as a picture for a phone's screen (w × h of its pixels: the
// pixel font stays crisp there), with everyone's marks — a data URL
export function mapImage(P, w, h, near = null) {
  if (!P.big || !P.big.worldMap) return null;
  w = Math.max(120, Math.min(640, Math.round(w) || 240)); h = Math.max(100, Math.min(640, Math.round(h) || 200));
  const c = makeCanvas(w, h);
  c.ctx.fillStyle = '#1c1428'; c.ctx.fillRect(0, 0, w, h);
  // (near: a closer look around that spot, two pixels a tile, with the lands' names)
  if (near) {
    const M = drawWorldMap(P, c.ctx, 0, 0, w, h, near.x, near.z, 2);
    const WM = P.big.worldMap;
    // (names off the middle: that's where you are)
    if (M) for (const z of WM.zoneCentres()) { const q = M(z.x, z.z); if (q.x > 20 && q.x < w - 20 && q.y > 8 && q.y < h - 8 && Math.hypot(q.x - w / 2, q.y - h / 2) > 16) drawText(c.ctx, t(z.zone.name), q.x, q.y - 4, { color: '#fff3c4', align: 'center', outline: '#241a2e' }); }
  } else drawWorldPanel(P, c.ctx, 2, 14, w - 4, h - 16, { counts: true });
  return c.toDataURL();
}

// Zoom & pan for the big screen's maps (Party Mode's full map, the solo menu's): k = 0 is
// the whole world, then 1…4 pixels a tile. The wheel zooms where you point, a drag moves
// it, ± (the host's zoom rocker, a gamepad's buttons) zoom around the middle.
export class MapView {
  constructor() { this.k = 0; this.cx = 0; this.cz = 0; this.frame = null; this.drag = null; this.hint = ''; }
  reset() { this.k = 0; this.drag = null; }
  clamp(WM, mw, mh) {
    const hw = mw / 2 / this.k, hh = mh / 2 / this.k;
    this.cx = hw * 2 >= WM.W ? WM.X0 + WM.W / 2 : Math.max(WM.X0 + hw, Math.min(WM.X0 + WM.W - hw, this.cx));
    this.cz = hh * 2 >= WM.H ? WM.Z0 + WM.H / 2 : Math.max(WM.Z0 + hh, Math.min(WM.Z0 + WM.H - hh, this.cz));
  }
  // one step in (1) or out (-1); (px, py): a screen point to keep where it is; home: where to zoom in from the whole world
  step(dir, px = null, py = null, home = null) {
    const L = [0, 1, 2, 3, 4], f = this.frame;
    const i = Math.max(0, L.indexOf(this.k)), j = Math.max(0, Math.min(L.length - 1, i + dir));
    if (j === i) return false;
    const nk = L[j];
    if (nk && f && px !== null) {
      // the world point under the cursor stays under it
      const wx = f.X0 + (px - f.ox) / f.k, wz = f.Z0 + (py - f.oy) / f.k;
      this.cx = wx - (px - f.x - f.w / 2) / nk; this.cz = wz - (py - f.y - f.h / 2) / nk;
    } else if (nk && !this.k && home) { this.cx = home.x; this.cz = home.z; }
    this.k = nk;
    return true;
  }
  // the mouse: the wheel zooms, a drag moves (returns true when it used the mouse)
  mouse(input, home = null) {
    const f = this.frame, m = input.mouse;
    if (!f) return false;
    const over = m.x >= f.x && m.y >= f.y && m.x < f.x + f.w && m.y < f.y + f.h;
    if (over && m.wheel) { this.step(m.wheel < 0 ? 1 : -1, m.x, m.y, home); return true; }
    if (m.pressed && over) this.drag = { x: m.x, y: m.y, moved: false };
    if (this.drag && m.down) {
      const dx = m.x - this.drag.x, dy = m.y - this.drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) this.drag.moved = true;
      if (this.drag.moved && this.k) { this.cx -= dx / this.k; this.cz -= dy / this.k; this.drag.x = m.x; this.drag.y = m.y; }
      return this.drag.moved;
    }
    if (this.drag && !m.down) { const moved = this.drag.moved; this.drag = null; return moved; }
    return false;
  }
}

// what the legend lists, with how much of each is done
export function legendKeys(P) {
  if (P.act && P.act.legendKeys) return P.act.legendKeys();
  const keys = [], key = (k, label, n, total) => keys.push({ k, name: t(label), n, total });
  if (P.travel) key('stone', 'Waystone', P.travel.attuned().length, P.travel.stones.length);
  if (P.secrets) key('secret', 'Sealed chest', P.secrets.list.filter((q) => P.secrets.save.solved[q.id]).length, P.secrets.list.length);
  if (P.races) key('race', 'Race', P.races.list.filter((c) => P.races.best[c.id]).length, P.races.list.length);
  if (P.encounters) key('camp', 'Gloom camp', P.encounters.cleared.size, P.encounters.camps.length);
  if (P.lairs) key('lair', 'Boss lair', P.lairs.list.filter((L) => L.state === 'beaten').length, P.lairs.list.length);
  if (P.actKind === 'explore' && P.act && P.act.nests) key('nest', 'Gloom nest', P.act.nests.filter((n) => n.state === 'clean').length, P.act.nests.length);
  return keys;
}

// ---- the phone's own map (Phone v6): the phone draws the world itself, so it zooms
// and pans right under your fingers. The world's picture goes over once…
export function mapBase(P) {
  const WM = P.big && P.big.worldMap;
  if (!WM) return null;
  if (!WM.baseMsg) WM.baseMsg = { t: 'wmapBase', v: WM.W + 'x' + WM.H + ':' + P.big.map.seed, src: WM.base.toDataURL('image/png'), X0: WM.X0, Z0: WM.Z0, W: WM.W, H: WM.H };
  return WM.baseMsg;
}
// …then, every second or so while the map is open: the fog, the marks, everyone's
// whereabouts, the lands' names and the legend's counts (`me`: that phone's player)
export function mapUpdate(P, me) {
  const WM = P.big && P.big.worldMap;
  if (!WM) return null;
  const r1 = (v) => Math.round(v * 10) / 10;
  const at = (p) => (P.rooms ? P.rooms.mapPos(p) : p.pos);
  const lands = P.big.map.lands !== false, land = ZONES.filter((z) => z.id !== 'sea');
  const found = P.zones ? land.filter((z) => z.id === 'valley' || P.zones.save.zones.includes(z.id)).length : 1;
  const here = lands && me && P.big.zoneAt ? P.big.zoneAt(at(me).x, at(me).z) : null;
  const R = mapRegion(P, me);
  // (the marks — a named one is a place you can be guided to: its last 1 — and an act's own places)
  const own = P.guides ? P.guides.places().filter((q) => q.own) : [];
  const way = P.guides && me ? P.guides.padWay(me) : null;
  return {
    t: 'wmap', fog: WM.fogBits(), r: [R.x0, R.z0, R.x1 - R.x0, R.z1 - R.z0],
    m: collectMarks(P).concat(own).map((m) => [m.k, r1(m.x), r1(m.z), m.on ? 1 : 0, m.name || '', m.st || '', m.a ? 1 : 0, m.name && P.guides ? 1 : 0]),
    z: lands ? WM.zoneCentres().map((c) => [t(c.zone.name), r1(c.x), r1(c.z), c.n, here && here.id === c.zone.id ? 1 : 0]) : [],
    p: P.players.filter((p) => p.connected !== false).map((p) => [r1(at(p).x), r1(at(p).z), p.color, p.name, p === me ? 1 : 0]),
    k: legendKeys(P).map((q) => [q.k, q.name, q.n, q.total]),
    s: lands ? [found, land.length, Math.round(WM.explored() * 100)] : null,
    ...(R.title ? { ti: R.title } : {}),
    ...(way ? { rt: way.rt, dest: way.dest } : {}),
  };
}

// the whole world fitted into a box: a framed map, the names of the lands
// you've found, and a legend underneath with how much of each is done
export function drawWorldPanel(P, ctx, x, y, w, h, { counts = true, view = null } = {}) {
  const WM = P.big && P.big.worldMap;
  if (!WM) return null;
  // the legend first (it decides how much room the map gets)
  const keys = legendKeys(P).map((q) => ({ ...q, icon: (px, py) => drawMark(ctx, { k: q.k, on: q.k === 'stone' }, px, py), count: q.total ? `${q.n}/${q.total}` : '', done: q.total && q.n >= q.total }));
  for (const it of keys) it.w = measure(it.name) + (counts && it.count ? measure(it.count) + 4 : 0) + 20;
  const rows = [[]];
  let rw = 0;
  for (const it of keys) { if (rw + it.w > w - 30 && rows[rows.length - 1].length) { rows.push([]); rw = 0; } rows[rows.length - 1].push(it); rw += it.w; }
  const legendH = keys.length ? rows.length * 11 + 6 : 0;
  // the map: the continent you're on as big as fits — or, zoomed in (a MapView), a window on the world
  const R = mapRegion(P), RW = R.x1 - R.x0, RH = R.z1 - R.z0;
  const fit = Math.min((w - 24) / RW, (h - 20 - legendH) / RH);
  const zoomed = !!(view && view.k > fit * 1.05);
  const k = zoomed ? view.k : fit;
  const mw = zoomed ? w - 24 : Math.floor(RW * k), mh = zoomed ? h - 20 - legendH : Math.floor(RH * k);
  const mx = Math.round(x + (w - mw) / 2), my = Math.round(y + (h - legendH - mh) / 2);
  if (zoomed) view.clamp(WM, mw, mh);
  ctx.fillStyle = '#8e5d3e'; ctx.fillRect(mx - 3, my - 3, mw + 6, mh + 6);
  ctx.fillStyle = '#3b2a22'; ctx.fillRect(mx - 1, my - 1, mw + 2, mh + 2);
  const M = drawWorldMap(P, ctx, mx, my, mw, mh, zoomed ? view.cx : (R.x0 + R.x1) / 2, zoomed ? view.cz : (R.z0 + R.z1) / 2, k);
  if (view) { const o = M(WM.X0, WM.Z0); view.frame = { x: mx, y: my, w: mw, h: mh, k, ox: o.x, oy: o.y, fit, X0: WM.X0, Z0: WM.Z0 }; }
  // names of the places you've found, nudged up or down off the marks (and each other)
  const marks = P.mapPts || [], placed = [], lands = P.big.map.lands !== false;
  for (const c of lands ? WM.zoneCentres() : []) {
    const q = M(c.x, c.z), name = t(c.zone.name), nw = measure(name) + 4;
    if (q.x < mx || q.x > mx + mw || q.y < my || q.y > my + mh) continue;               // (the other continent's lands: off this map)
    let best = null;
    for (const dy of [0, -9, 9, -18, 18, -27, 27]) {
      const x0 = q.x - nw / 2, y0 = q.y - 4 + dy, r = { x0, x1: x0 + nw, y0: y0 - 1, y1: y0 + 8 };
      const hits = marks.filter((m) => m.x + 4 > r.x0 && m.x - 4 < r.x1 && m.y + 4 > r.y0 && m.y - 4 < r.y1).length
        + placed.filter((o) => o.x0 < r.x1 && o.x1 > r.x0 && o.y0 < r.y1 && o.y1 > r.y0).length * 3;
      if (!best || hits < best.hits) best = { r, y: y0, hits };
      if (!hits) break;
    }
    placed.push(best.r);
    const lx = Math.max(mx + nw / 2, Math.min(mx + mw - nw / 2, q.x));      // (kept inside the frame)
    ctx.fillStyle = 'rgba(20,14,28,0.5)'; ctx.fillRect(Math.round(lx - nw / 2), best.y - 2, nw, 11);
    drawText(ctx, name, lx, best.y, { color: '#fff3c4', align: 'center', outline: '#241a2e' });
  }
  // the waystones stay on top of the names (they're where you travel from)
  if (P.travel) P.travel.drawMapMarks(ctx, M);
  // (zoomed in: how to move about)
  if (zoomed && view.hint) drawText(ctx, view.hint, mx + 4, my + mh - 11, { color: '#f6d38f', outline: '#241a2e' });
  // how much of it you know
  const land = ZONES.filter((z) => z.id !== 'sea');
  const found = P.zones ? land.filter((z) => z.id === 'valley' || P.zones.save.zones.includes(z.id)).length : 1;
  if (lands) drawText(ctx, t('{n}/{total} lands · {p}% explored', { n: found, total: land.length, p: Math.round(WM.explored() * 100) }), mx + mw, my - 12, { color: '#f6d38f', align: 'right', outline: '#241a2e' });
  // the legend (one row if it fits, else two)
  rows.forEach((row, j) => {
    const lw = row.reduce((a, it) => a + it.w, 0) - 10;
    let lx = Math.round(x + w / 2 - lw / 2);
    const ly = my + mh + 6 + j * 11;
    ctx.fillStyle = 'rgba(20,14,28,0.85)'; ctx.fillRect(lx - 6, ly - 3, lw + 12, 12);
    for (const it of row) {
      it.icon(lx + 3, ly + 4);
      drawText(ctx, it.name, lx + 10, ly, { color: '#e8d6b4', outline: '#241a2e' });
      if (counts && it.count) drawText(ctx, it.count, lx + 14 + measure(it.name), ly, { color: it.done ? '#8fd67a' : '#ffd66b', outline: '#241a2e' });
      lx += it.w;
    }
  });
  return { M, mx, my, mw, mh, k };
}
