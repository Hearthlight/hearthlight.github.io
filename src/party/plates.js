// « This one is mine »: whose picture is whose when the big screen is split (camera.js).
// With fixed places, each player’s own cell wears their plate — their face and their name, on
// their colour — at its top corner on the screen’s side, and a line of that colour runs along
// the edges of the screen the cell touches: a friend who looks up from their phone finds their
// corner at once. A grid of groups gets the plates of each view’s members in its corner.
// The plates hang under the clock’s row, step down under the objective card (`P.objectiveRect()`)
// and go see-through while a hero stands behind them; `P.plateRects` says where they are, for
// the toasts and the arrows to friends to keep off them.

import { drawText, measure } from '../engine/font.js';
import { makeCanvas } from '../engine/gfx.js';
import { UI, fitText } from '../ui/ui.js';

const PH = 17, FACE = 15;       // a plate’s height; the face on it, FACE × FACE
const EDGE = 2;                 // how thick the line of colour along the screen’s edges is
const TOP = 30, TOP_LOBBY = 56; // where the top row’s plates hang: under the clock, under the lobby’s title
const faces = new WeakMap();    // a portrait’s canvas → the little face cut from it
const slid = new WeakMap();     // a player → how far their plate has stepped down (eased)
const shown = new WeakMap();    // a player → how opaque their plate is (eased)

// The head of a portrait (44 × 44) at half its size, drawn at ×1. Each pixel is the mean of
// its four — or, where they hold a line (an eye, the mouth, the rim of the hair), of the
// darker ones when they are half of them or more: the features stay crisp.
function faceOf(pc) {
  let f = faces.get(pc);
  if (f) return f;
  f = makeCanvas(FACE, FACE);
  const n = FACE * 2, src = pc.getContext('2d').getImageData(Math.round((pc.width - n) / 2), 2, n, n).data;
  const img = f.ctx.createImageData(FACE, FACE), out = img.data, lum = (i) => src[i] * 0.3 + src[i + 1] * 0.59 + src[i + 2] * 0.11;
  for (let y = 0; y < FACE; y++) for (let x = 0; x < FACE; x++) {
    let four = [(y * 2 * n + x * 2) * 4, (y * 2 * n + x * 2 + 1) * 4, ((y * 2 + 1) * n + x * 2) * 4, ((y * 2 + 1) * n + x * 2 + 1) * 4].filter((i) => src[i + 3] >= 128);
    if (four.length < 2) continue;
    const ls = four.map(lum), lo = Math.min(...ls), hi = Math.max(...ls);
    if (hi - lo > 44) { const dark = four.filter((i) => lum(i) < (lo + hi) / 2); four = dark.length * 2 >= four.length ? dark : four.filter((i) => !dark.includes(i)); }
    const o = (y * FACE + x) * 4;
    for (let c = 0; c < 3; c++) out[o + c] = four.reduce((s, i) => s + src[i + c], 0) / four.length;
    out[o + 3] = 255;
  }
  f.ctx.putImageData(img, 0, 0);
  faces.set(pc, f);
  return f;
}

const plateW = (name) => measure(name) + FACE + 9;   // (the rim, the face, the name and its margins)

// a plate at (x, y), w wide: the face on paper, the name on the player’s colour, a dark rim
// (`flip`: hung on the right, the face on the outside; no name: the face alone)
function plate(ctx, x, y, w, p, face, name, flip) {
  ctx.fillStyle = 'rgba(30,18,30,0.3)'; ctx.fillRect(x + 1, y + 2, w, PH - 1);
  ctx.fillStyle = '#3b2a2e'; ctx.fillRect(x + 1, y, w - 2, PH); ctx.fillRect(x, y + 1, w, PH - 2);
  ctx.fillStyle = p.color; ctx.fillRect(x + 1, y + 1, w - 2, PH - 2);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x + 1, y + 1, w - 2, 1);
  ctx.fillStyle = 'rgba(36,26,46,0.2)'; ctx.fillRect(x + 1, y + PH - 2, w - 2, 1);
  const fx = flip ? x + w - FACE - 1 : x + 1;
  ctx.fillStyle = UI.paper; ctx.fillRect(fx, y + 1, FACE, FACE);
  if (face) ctx.drawImage(face, fx, y + 1);
  if (name) drawText(ctx, name, flip ? x + 4 : x + FACE + 5, y + 4, { color: '#241a2e' });
}

export function drawPlates(P, ctx) {
  const cam = P.cam, L = cam.layout, d = P.display;
  P.plateRects = [];                     // (what is drawn after them may keep off the plates)
  if (!L || L.type !== 'grid' || P.remoteFor) return;
  const ui = (r) => { const a = d.worldToUi(r.x, r.y), b = d.worldToUi(r.x + r.w, r.y + r.h); return { x0: Math.round(a.x), y0: Math.round(a.y), x1: Math.round(b.x), y1: Math.round(b.y) }; };
  const top = P.phase === 'lobby' ? TOP_LOBBY : TOP, card = P.objectiveRect(), ease = Math.min(1, (P.lastDt || 1 / 60) * 12);
  // how far down a plate at (x, y), w wide, steps to keep under the objective card (eased)
  const step = (who, x, y, w) => {
    const under = card && x < card.x + card.w + 2 && x + w > card.x - 2 && y < card.y + card.h + 2 ? card.y + card.h + 3 - y : 0;
    let s = slid.get(who) || 0;
    s = Math.abs(under - s) < 0.5 ? under : s + (under - s) * ease;
    slid.set(who, s);
    return Math.round(s);
  };
  // a plate in view v: see-through while one of its heroes stands behind it
  const put = (p, v, x, y, w, name, flip) => {
    const behind = v.members.some((m) => {
      const u = P.toUi(v, m.pos.x, 0.8 + ((m.actor && m.actor.baseY) || 0), m.pos.z);
      return u.x > x - 7 && u.x < x + w + 7 && u.y > y - 9 && u.y < y + PH + 11;
    });
    const a = (shown.get(p) ?? 1) + ((behind ? 0.3 : 1) - (shown.get(p) ?? 1)) * ease;
    shown.set(p, a);
    const pc = P.portraits.get('party' + p.slot, p.look, 'neutral');
    ctx.globalAlpha = a;
    plate(ctx, x, y, w, p, pc ? faceOf(pc) : null, name, flip);
    ctx.globalAlpha = 1;
    P.plateRects.push({ x, y, w, h: PH });
  };
  if (L.seats) {
    for (const [p, i] of cam.homes) {
      const R = cam.cellRect(i), c = ui(R), edge = { l: R.x <= 0, r: R.x + R.w >= cam.W, t: R.y <= 0, b: R.y + R.h >= cam.H };
      // the screen’s edges along this place, in its player’s colour (a notch where two places meet)
      const x0 = c.x0 + (edge.l ? 0 : 2), x1 = c.x1 - (edge.r ? 0 : 2), y0 = c.y0 + (edge.t ? 0 : 2), y1 = c.y1 - (edge.b ? 0 : 2);
      const line = (x, y, w, h, sx, sy) => { ctx.fillStyle = 'rgba(36,26,46,0.6)'; ctx.fillRect(x + sx, y + sy, w, h); ctx.fillStyle = p.color; ctx.fillRect(x, y, w, h); };
      if (edge.t) line(x0, c.y0, x1 - x0, EDGE, 0, 1);
      if (edge.b) line(x0, c.y1 - EDGE, x1 - x0, EDGE, 0, -1);
      if (edge.l) line(c.x0, y0, EDGE, y1 - y0, 1, 0);
      if (edge.r) line(c.x1 - EDGE, y0, EDGE, y1 - y0, -1, 0);
      // the plate: the top corner on the screen’s side, against the line when there is one (a
      // place in the middle: on the outer side of the picture it shares, so its heart stays clear)
      // (in the lobby the first column runs under the join card: its plates hang beside it)
      const v = cam.viewOf(p), first = R.x <= v.rect.x, last = R.x + R.w >= v.rect.x + v.rect.w;
      const left = edge.l && cam.hid() ? Math.round(d.worldToUi(cam.hid(), 0).x) + 2 : c.x0 + (edge.l ? EDGE : 4);
      const flip = edge.r || (!edge.l && (first !== last ? last : c.x0 + c.x1 > d.w)), room = c.x1 - left - 4;
      const name = fitText(p.name, Math.max(0, room - FACE - 9)), w = Math.min(room, plateW(name));
      // (…and the top row’s over the line between the rows, clear of the title and of their heroes)
      const x = flip ? c.x1 - (edge.r ? EDGE : 4) - w : left, y = !edge.t ? c.y0 + 4 : P.phase === 'lobby' && !edge.b ? c.y1 - PH - 4 : top;
      put(p, v, x, y + step(p, x, y, w), w, name, flip);
    }
    return;
  }
  // a grid of groups: each view’s members in a row from its corner (the faces alone when the
  // names don’t fit)
  for (const v of cam.views) {
    const c = ui(v.rect), room = c.x1 - c.x0 - 8, x = c.x0 + 4, y = v.rect.y <= 0 ? top : c.y0 + 4;
    let list = v.members.map((p) => ({ p, name: p.name, w: plateW(p.name) }));
    if (list.reduce((s, q) => s + q.w + 2, -2) > room) list = v.members.map((p) => ({ p, name: '', w: FACE + 2 }));
    const down = step(v, x, y, list.reduce((s, q) => s + q.w + 2, -2));
    let at = x;
    for (const q of list) { put(q.p, v, at, y + down, q.w, q.name, false); at += q.w + 2; }
  }
}
