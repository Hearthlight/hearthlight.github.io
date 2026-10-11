// The talent tree on one page: a hero’s three branches side by side — each a column: its name,
// its picture, the points in it, its five rows — and what the picked talent does. One look for
// the phone (pad/pad.js), the solo menu’s Hero page and a keyboard or gamepad player’s own menu
// on the big screen (solo/herotab.js): each places the tree and the words, and adds its own
// buttons. A talent tells where it stands without a colour to read: gold pips for the ranks
// learned, a « + » where a point can go in now, a « ✓ » once learned to the end; a row still
// shut sits dimmed under a padlock that says what it asks for (the branch’s points over the
// row’s price for the next one); the capstone — an ultimate — stands on gold between two stars.

import { drawText, measure, wrap } from '../engine/font.js';
import { UI, fitText } from './ui.js';
import { drawIcon } from '../combat/v4/icons.js';
import { TREES, TALENT, ROW_NEED, whyNot, canLearn, rankOf, spentIn, valueAt } from '../combat/v4/talents.js';
import { t } from '../i18n.js';

const BROWN = '#8a5234', GREEN = '#4f955a', DARK = '#3b2a22', NIGHT = '#2a1f33', FAINT = '#b8a080', GOLD = '#b8862a';
export const CELL = 21;               // an icon and the pips under it
const DROP = 3;

// the points a branch can hold, and its first row still shut ({ row, need } — null: all open)
export const branchMax = (B) => B.talents.reduce((n, T) => n + T.max, 0);
export function nextGate(cls, picks, b) {
  const n = spentIn(cls, picks, b), r = ROW_NEED.findIndex((need) => n < need);
  return r < 0 ? null : { row: r + 1, need: ROW_NEED[r] };
}

// Where the tree goes in a box: three columns (`maxCol` wide at most, the lot centred), a head
// each — the branch’s name over its picture and points; beside the picture where the box is too
// short for that — and the rows under it (the capstone a little lower: room for its gold and
// the padlock over it). Returns the heads and every talent’s place: `x y` its icon, `cx` its
// middle, `top` its row’s, `r` what a finger or the mouse aims at.
export function treeLayout(cls, x, y, w, h, maxCol = 96) {
  const trees = TREES[cls], rows = ROW_NEED.length;
  const cw = Math.min(maxCol, Math.floor(w / trees.length)), x0 = Math.round(x + (w - cw * trees.length) / 2);
  const fit = (head) => Math.floor((h - head - 7 - CELL - DROP) / (rows - 1));
  const tall = fit(32) >= CELL + 9, head = tall ? 32 : 20;
  const rowH = Math.max(CELL + 3, Math.min(CELL + 20, fit(head))), top = y + head + 3;
  const d = Math.min(18, Math.floor(cw / 4)), cells = [];
  trees.forEach((B, b) => {
    const mid = x0 + b * cw + Math.floor(cw / 2);
    for (const T of B.talents) {
      const cx = mid + Math.round((T.col * 2 - 1) * d), ry = top + (T.row - 1) * rowH, iy = ry + (T.ult ? DROP : 0);
      cells.push({ T, b, cx, x: cx - 9, y: iy, top: ry, r: { x: cx - d, y: iy - Math.floor((rowH - CELL) / 2), w: d * 2, h: rowH } });
    }
  });
  return { cls, x: x0, y, w: cw * trees.length, h: head + 5 + (rows - 1) * rowH + CELL + DROP, cw, tall, rowH, top, cells, heads: trees.map((B, b) => ({ b, x: x0 + b * cw, y, w: cw, h: head })) };
}

// ---- the little marks
function padlock(ctx, x, y, color, hole = UI.paper) {     // 5 × 7
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y, 3, 1); ctx.fillRect(x, y + 1, 1, 2); ctx.fillRect(x + 4, y + 1, 1, 2);
  ctx.fillRect(x, y + 3, 5, 4);
  ctx.fillStyle = hole; ctx.fillRect(x + 2, y + 4, 1, 2);
}
// on an icon’s corner, 7 × 7: « + » a point can go in · « ✓ » learned to the end
function mark(ctx, x, y, plus, lit) {
  ctx.fillStyle = NIGHT; ctx.fillRect(x, y, 7, 7);
  ctx.fillStyle = plus ? (lit ? '#7ed06f' : GREEN) : '#ffd66b'; ctx.fillRect(x + 1, y + 1, 5, 5);
  ctx.fillStyle = plus ? '#fff7e6' : DARK;
  if (plus) { ctx.fillRect(x + 3, y + 2, 1, 3); ctx.fillRect(x + 2, y + 3, 3, 1); }
  else for (const [i, j] of [[1, 3], [2, 4], [3, 3], [4, 2], [5, 1]]) ctx.fillRect(x + i, y + j, 1, 1);
}
// the ranks, under the icon: a socket each, gold once learned
function pips(ctx, cx, y, rank, max, open) {
  const w = max * 5 + 1, x = Math.round(cx - w / 2);
  ctx.fillStyle = NIGHT; ctx.fillRect(x, y, w, 5);
  for (let i = 0; i < max; i++) { ctx.fillStyle = i < rank ? '#ffd66b' : open ? '#8a7a90' : '#5a4a60'; ctx.fillRect(x + 1 + i * 5, y + 1, 4, 3); }
}

// the points left to spend, on a tag (green while there are some); returns its width
export function pointsTag(ctx, x, y, n, h = 14) {
  const text = t('Points: {n}', { n }), w = measure(text) + 12;
  ctx.fillStyle = DARK; ctx.fillRect(x + 1, y, w - 2, h); ctx.fillRect(x, y + 1, w, h - 2);
  ctx.fillStyle = n ? GREEN : '#a89a8a'; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x + 1, y + 1, w - 2, 1);
  drawText(ctx, text, x + 6, y + Math.round((h - 9) / 2) + 1, { color: '#fff7e6' });
  return w;
}
export const pointsTagW = (n) => measure(t('Points: {n}', { n })) + 12;

// The tree itself, in its layout `L`. `sel`: the picked talent’s id, or '#0'… for a branch.
export function drawTree(ctx, L, { picks, level, sel = null, time = 0 }) {
  const cls = L.cls, gap = L.rowH - CELL, lit = Math.floor(time * 2.5) % 2 === 0;
  TREES[cls].forEach((B, b) => {
    const H = L.heads[b], inB = spentIn(cls, picks, b), gate = nextGate(cls, picks, b), mid = H.x + Math.floor(H.w / 2);
    const mine = L.cells.filter((c) => c.b === b), count = inB + '/' + branchMax(B), ink = inB ? GREEN : '#8a7a70';
    // the lane, and its head (the heads share their rims: the longest names need every texel
    // of a narrow phone): the branch’s name, its picture, the points in it
    ctx.fillStyle = 'rgba(107,67,48,0.08)'; ctx.fillRect(H.x + 1, H.y + H.h, H.w - 1, L.h - H.h);
    ctx.fillStyle = DARK; ctx.fillRect(H.x, H.y, H.w + 1, H.h);
    ctx.fillStyle = inB ? '#fff3c4' : '#efe0c0'; ctx.fillRect(H.x + 1, H.y + 1, H.w - 1, H.h - 2);
    if (inB) { ctx.fillStyle = '#e0a526'; ctx.fillRect(H.x + 1, H.y + 1, H.w - 1, 2); }
    if (L.tall) {
      const gx = Math.round(mid - (22 + measure(count)) / 2);
      drawText(ctx, fitText(t(B.name), H.w - 2), mid + 1, H.y + 4, { color: BROWN, align: 'center' });
      drawIcon(ctx, B.icon, gx, H.y + 13);
      drawText(ctx, count, gx + 22, H.y + 18, { color: ink });
    } else {
      drawIcon(ctx, B.icon, H.x + 1, H.y + 1);
      drawText(ctx, fitText(t(B.name), H.w - 23), H.x + 21, H.y + 2, { color: BROWN });
      drawText(ctx, count, H.x + 21, H.y + 11, { color: ink });
    }
    // a row still shut: a dashed line across the lane and, on it, a padlock with what the row
    // asks for — the next one to open says how far the branch is (« 4/6 »)
    for (let r = 2; r <= ROW_NEED.length; r++) {
      const need = ROW_NEED[r - 1], y = L.top + (r - 1) * L.rowH - gap + (gap < 9 ? 0 : Math.max(1, Math.floor((gap - 7) / 2)));
      if (inB >= need) continue;
      const next = gate.row === r, text = next ? inB + '/' + need : String(need), tw = measure(text) + 7, tx = Math.round(mid - tw / 2), c = next ? BROWN : FAINT;
      ctx.fillStyle = next ? '#a8927a' : '#d8c8a8';
      for (let x = H.x + 4; x < H.x + H.w - 5; x += 4) if (x + 2 < tx - 2 || x > tx + tw + 1 || gap < 8) ctx.fillRect(x, y + 3, 2, 1);
      if (gap < 8) continue;
      padlock(ctx, tx, y, c, '#f4e8d0');
      drawText(ctx, text, tx + 7, y, { color: c });
    }
    // an open row hangs from the one above
    ctx.fillStyle = '#e0b04a';
    for (const c of mine) {
      if (c.T.row < 2 || inB < ROW_NEED[c.T.row - 1]) continue;
      const above = mine.filter((q) => q.T.row === c.T.row - 1).map((q) => q.cx), y0 = c.top - gap, y1 = c.y - (c.T.ult ? 2 : 0);
      if (!above.length || above.includes(c.cx)) { ctx.fillRect(c.cx - 1, y0, 2, y1 - y0); continue; }
      const my = y0 + Math.max(1, Math.floor(gap / 2) - 1), a = Math.min(c.cx, ...above), z = Math.max(c.cx, ...above);
      ctx.fillRect(a - 1, my, z - a + 2, 2);
      for (const u of above) ctx.fillRect(u - 1, y0, 2, my - y0);
      ctx.fillRect(c.cx - 1, my, 2, y1 - my);
    }
    for (const c of mine) {
      const T = c.T, rk = rankOf(picks, T.id), open = inB >= ROW_NEED[T.row - 1], can = canLearn(cls, picks, T.id, level), x = c.x, y = c.y;
      if (sel === T.id) {
        // (the picked one: a frame that leaves the padlocks over and under it alone)
        const q = T.ult ? [x - 7, y - 4, 32, 28] : [x - 3, y - 1, 24, 23];
        ctx.fillStyle = DARK; ctx.fillRect(...q);
        ctx.fillStyle = '#fff3a6'; ctx.fillRect(q[0] + 1, q[1] + 1, q[2] - 2, q[3] - 2);
      }
      if (T.ult) {
        // the capstone, an ultimate: on gold (bright once learned), a star on either side
        ctx.fillStyle = DARK; ctx.fillRect(x - 4, y - 2, 26, 23); ctx.fillRect(x - 5, y - 1, 28, 21);
        ctx.fillStyle = rk ? '#ffd66b' : open ? '#d9a63a' : '#a8905c'; ctx.fillRect(x - 4, y - 1, 26, 21);
        ctx.fillStyle = rk ? '#fff3c4' : 'rgba(255,255,255,0.25)'; ctx.fillRect(x - 4, y - 1, 26, 1);
        for (const sx of [x - 13, x + 26]) drawText(ctx, '★', sx, y + 6, { color: rk ? '#e0a526' : open ? GOLD : '#cdb88e' });
      }
      drawIcon(ctx, T.icon, x, y, { dim: !open });
      // (open, but no point to put in it: a light veil)
      if (open && !rk && !can) { ctx.fillStyle = 'rgba(28,20,36,0.3)'; ctx.fillRect(x + 1, y + 1, 16, 16); }
      if (!T.ult) pips(ctx, c.cx, y + 16, rk, T.max, open);
      if (can) mark(ctx, x + 13, y - 3, true, lit);
      else if (rk >= T.max) mark(ctx, x + 13, y - 3, false);
    }
  });
  // (the picked branch: its head rimmed with gold)
  const H = typeof sel === 'string' && sel[0] === '#' && L.heads[+sel.slice(1)];
  if (H) { ctx.fillStyle = GOLD; ctx.fillRect(H.x, H.y, H.w + 1, 1); ctx.fillRect(H.x, H.y + H.h - 1, H.w + 1, 1); ctx.fillRect(H.x, H.y, 1, H.h); ctx.fillRect(H.x + H.w, H.y, 1, H.h); }
}

// ---- the words
const lineUp = (text, w, color, sp = 0) => wrap(String(text), w).map((s, i) => ({ s, color, sp: i ? 0 : sp }));
// (never a silent cut: what doesn’t fit `h` ends on « … »)
function flow(ctx, lines, x, y, w, h) {
  let n = 0, yy = 0;
  if (h < 9) return y;
  for (const l of lines) { if (yy + (l.sp || 0) + 9 > h) break; yy += (l.sp || 0) + 10; n++; }
  const out = lines.slice(0, Math.max(1, n));
  if (out.length < lines.length) { const last = out[out.length - 1] = { ...out[out.length - 1] }; last.s = fitText(last.s.replace(/[\s.,;:!?]+$/, '') + '…', last.right ? w - measure(last.right) - 6 : w); }
  yy = y;
  for (const l of out) {
    yy += l.sp || 0;
    drawText(ctx, l.s, x, yy, { color: l.color });
    if (l.right) drawText(ctx, l.right, x + w, yy, { color: l.rc, align: 'right' });
    yy += 10;
  }
  return yy;
}

// What is picked, in a box: a talent — its name, its rank, what it does at this rank and at
// the next —, a branch ('#0'…: what it is about), or, with nothing picked, the three branches
// when they fit; `hint` (how to pick) goes under a branch when there is room; `big`: the
// talent’s picture twice the size beside its name (a phone has the room). Returns a talent’s
// { T, rank, why } — why: whyNot’s words, null when a point can go in — else null.
export function drawInfo(ctx, x, y, w, h, { cls, picks, level, sel = null, hint = '', big = false }) {
  const trees = TREES[cls], T = typeof sel === 'string' && sel[0] !== '#' ? TALENT[sel] : null;
  if (T && T.cls === cls) {
    const rk = rankOf(picks, T.id), say = (k) => t(T.desc, { n: valueAt(T, k) }), rank = t('Rank {r}/{m}', { r: rk, m: T.max }), rc = rk ? GREEN : UI.inkSoft;
    let L = [];
    if (big) {
      // the picture (on gold for an ultimate), its name and rank beside it
      const N = lineUp(t(T.name), w - 44, T.ult ? GOLD : BROWN).slice(0, 2), ny = y + (N.length > 1 ? 4 : 9);
      ctx.fillStyle = DARK; ctx.fillRect(x, y, 40, 40);
      ctx.fillStyle = T.ult ? (rk ? '#ffd66b' : '#d9a63a') : '#efe0c0'; ctx.fillRect(x + 1, y + 1, 38, 38);
      drawIcon(ctx, T.icon, x + 2, y + 2, { s: 2 });
      N.forEach((l, i) => drawText(ctx, l.s, x + 45, ny + i * 10, { color: l.color }));
      drawText(ctx, rank, x + 45, ny + N.length * 10 + 2, { color: rc });
      y += 43; h -= 43;
    } else {
      L = lineUp(t(T.name), w, T.ult ? GOLD : BROWN);
      const last = L[L.length - 1];
      if (measure(last.s) + measure(rank) + 8 <= w) { last.right = rank; last.rc = rc; } else L.push({ s: rank, color: rc });
    }
    L.push(...lineUp(say(Math.max(1, rk)), w, UI.ink, big ? 0 : 2));
    if (rk > 0 && rk < T.max && T.n) L.push(...lineUp(t('Next rank: {what}', { what: say(rk + 1) }), w, '#7d4f93', 2));
    flow(ctx, L, x, y, w, h);
    return { T, rank: rk, why: whyNot(cls, picks, T.id, level) };
  }
  const about = (B, b, sp) => { const L = lineUp(t(B.name), w, BROWN, sp); L[L.length - 1].right = spentIn(cls, picks, b) + '/' + branchMax(B); L[L.length - 1].rc = spentIn(cls, picks, b) ? GREEN : '#8a7a70'; return L.concat(lineUp(t(B.desc), w, UI.ink)); };
  const height = (L) => L.reduce((n, l) => n + (l.sp || 0) + 10, 0) - 1;
  const b = typeof sel === 'string' && sel[0] === '#' ? +sel.slice(1) : -1, tip = hint ? lineUp(hint, w, UI.inkSoft, 5) : [];
  if (trees[b] && big) {
    // a branch, its picture as big as a talent’s
    const B = trees[b], inB = spentIn(cls, picks, b), N = lineUp(t(B.name), w - 44, BROWN).slice(0, 2), ny = y + (N.length > 1 ? 4 : 9);
    ctx.fillStyle = DARK; ctx.fillRect(x, y, 40, 40);
    ctx.fillStyle = inB ? '#fff3c4' : '#efe0c0'; ctx.fillRect(x + 1, y + 1, 38, 38);
    drawIcon(ctx, B.icon, x + 2, y + 2, { s: 2 });
    N.forEach((l, i) => drawText(ctx, l.s, x + 45, ny + i * 10, { color: l.color }));
    drawText(ctx, inB + '/' + branchMax(B), x + 45, ny + N.length * 10 + 2, { color: inB ? GREEN : '#8a7a70' });
    const D = lineUp(t(B.desc), w, UI.ink);
    flow(ctx, height(D.concat(tip)) <= h - 43 ? D.concat(tip) : D, x, y + 43, w, h - 43);
    return null;
  }
  let L = trees[b] ? about(trees[b], b, 0) : trees.flatMap((B, i) => about(B, i, i ? 4 : 0));
  if (height(L) > h) L = tip.map((l, i) => (i ? l : { ...l, sp: 0 }));
  else if (height(L.concat(tip)) <= h) L = L.concat(tip);
  flow(ctx, L, x, y, w, h);
  return null;
}

// why a point can’t go into the picked talent, where its button would be (learned to the end:
// green, under a ✓; its row shut: a padlock)
export function drawWhy(ctx, x, y, w, h, { T, rank, why }) {
  const done = rank >= T.max, shut = !done && why.indexOf('{n}') >= 0, mw = w - (done || shut ? 20 : 10);
  let lines = wrap(t(why, { n: ROW_NEED[T.row - 1] }), mw);
  const n = Math.max(1, Math.floor((h - 1) / 10));
  if (lines.length > n) { lines = lines.slice(0, n); lines[n - 1] = fitText(lines[n - 1] + '…', mw); }
  ctx.fillStyle = 'rgba(107,67,48,0.1)'; ctx.fillRect(x, y, w, h);
  const tw = Math.max(...lines.map((s) => measure(s))), lead = done || shut ? 9 : 0, tx = Math.round(x + (w - tw - lead) / 2) + lead, ty = y + Math.round((h - lines.length * 10 + 1) / 2);
  if (done) drawText(ctx, '✓', tx - 9, ty, { color: GREEN });
  else if (shut) padlock(ctx, tx - 9, ty, UI.inkSoft, '#eadcc0');
  lines.forEach((s, i) => drawText(ctx, s, tx, ty + i * 10, { color: done ? GREEN : UI.inkSoft }));
}
