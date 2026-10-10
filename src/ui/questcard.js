// The story at a glance, drawn: what the trackers (Party’s big screen, the solo HUD), the journals
// (a player’s menu on the big screen, the solo game’s) and the phone’s Quest page share — a
// quest’s brief, its steps as a checklist (done ✓, the one under way ▸, how many are left) and
// where to go. The words come from Saga.card() (src/saga/saga.js), already translated; they
// carry the font’s marks ({key}…{/}): nothing here cuts a line without minding them.

import { drawText, measure, wrap } from '../engine/font.js';
import { panel, UI } from './ui.js';
import { t, tn } from '../i18n.js';

// (a quest’s brief — why we do this — in a soft ink: the words it marks stand out of it; and the
// tint behind a quest a journal has opened: paler than a selected row’s, its dim lines stay readable)
export const BRIEF = '#75605c', OPEN = '#fbe8bd';

// a line cut to a width with « … », its marks kept whole and closed
export function fitRich(text, maxW, scale = 1) {
  text = String(text);
  if (measure(text, scale) <= maxW) return text;
  let out = '', open = false;
  for (const [i, part] of text.split(/(\{[^}]*\})/).entries()) {
    if (i % 2) { out += part; open = part !== '{/}'; continue; }
    for (const ch of part) {
      if (measure(out + ch + '…', scale) > maxW) return out.trimEnd() + '…' + (open ? '{/}' : '');
      out += ch;
    }
  }
  return out;
}

// wrapped to a width, `rows` lines at most: what’s left over ends the last one with « … »
export function wrapFit(text, maxW, rows = 2, scale = 1) {
  const L = wrap(text, maxW, scale);
  return L.length <= rows ? L : [...L.slice(0, rows - 1), fitRich(L.slice(rows - 1).join(' '), maxW, scale)];
}

// the narrowest width (a multiple of 4, so a clock ticking in the line doesn’t make it wobble)
// at which a text takes no more rows than at maxW: two even lines rather than a long and a short
function evenWidth(text, maxW, rows) {
  const n = Math.min(rows, wrap(text, maxW).length);
  let lo = Math.min(maxW, 60), hi = maxW;
  while (hi - lo > 3) { const mid = (lo + hi) >> 1; if (wrap(text, mid).length <= n) hi = mid; else lo = mid + 1; }
  return Math.min(maxW, Math.ceil(hi / 4) * 4);
}

// A step’s line and its `tail` — what moves at its end while you play: « (2/3) », a race’s
// clock — in gold (on paper; `color`: on a dark ground)…
export const GOLD = '#a8691a';
const split = (line, tail, color) => { line = String(line); const on = !!tail && line.endsWith(tail); return [on ? line.slice(0, -tail.length) : line, on ? `{${color}}${tail}{/}` : '']; };
export const tailed = (line, tail, color = GOLD) => split(line, tail, color).join('');
// …and on `rows` lines at most, the tail always there: the words before it give way (« … »)
export function wrapTail(line, tail, maxW, rows = 2, color = GOLD) {
  const [body, end] = split(line, tail, color), L = wrap(body + end, maxW);
  if (L.length <= rows) return L;
  const B = wrap(body, maxW);
  return [...B.slice(0, rows - 1), fitRich(B.slice(rows - 1).join(' '), maxW - (end ? measure(tail) : 0)) + end];
}

// « Where: Honeydew Fields · 45 m » (tiles for metres; no distance from another world, nor right
// there) — `short`: the place and the distance alone
export function whereText(w, short = false) {
  const far = w.d >= 5 ? t('{n} m', { n: w.d }) : '';
  if (!w.place) return far;
  return short ? (far ? w.place + ' · ' + far : w.place) : far ? t('Where: {place} · {n} m', { place: w.place, n: w.d }) : t('Where: {place}', { place: w.place });
}

// A quest of the card as rows of text wrapped to w: its brief, the last `done` steps ticked (the
// earlier ones counted), the step under way, how many are to come, where it is. A row:
// { text, color, x (indent), mark, mc (its colour), gap (above it), now (the step under way) }
export function questRows(q, w, { done = 3, brief = true, where = true } = {}) {
  const rows = [], IN = 9;
  const add = (lines, color, o = {}) => lines.forEach((l, i) => rows.push({ text: l, color, x: o.x || 0, mark: i ? '' : o.mark || '', mc: o.mc, gap: i ? 0 : o.gap || 0, now: !!o.now }));
  if (brief && q.brief) add(wrap(q.brief, w), BRIEF);
  const gap = rows.length ? 3 : 0, old = Math.max(0, q.done.length - done);
  if (old) add([tn('{n} earlier step done', '{n} earlier steps done', old)], '#a89478', { x: IN, mark: '✓', mc: '#a89478', gap });
  q.done.slice(old).forEach((s, i) => add(wrap(s, w - IN), '#96826e', { x: IN, mark: '✓', mc: '#5a9a52', gap: i || old ? 0 : gap }));
  add(wrap(tailed(q.now, q.tail), w - IN), UI.ink, { x: IN, mark: '▸', mc: '#d0901a', gap: q.done.length ? 0 : gap, now: true });
  if (q.left) add([tn('then {n} more step', 'then {n} more steps', q.left)], '#a89478', { x: IN, mark: '·', mc: '#a89478' });
  const wh = where && q.where ? whereText(q.where) : '';
  if (wh) add(wrap(wh, w), '#8a5234', { gap: 3 });
  return rows;
}
export const rowsHeight = (rows, lh = 10) => rows.reduce((h, r) => h + lh + r.gap, 0);
export function drawRows(ctx, rows, x, y, lh = 10) {
  for (const r of rows) {
    y += r.gap;
    if (r.mark) drawText(ctx, r.mark, x + (r.x ? 1 : 0), y, { color: r.mc || r.color });
    drawText(ctx, r.text, x + r.x, y, { color: r.color });
    y += lh;
  }
  return y;
}

// ------------------------------------------------------------------ the big screen’s tracker
// Party’s objective card (top left): { text, tail, sub, extra, title, brief, t, secs, stay }. One
// that `stay`s is the Adventure’s tracker: it opens wide for `secs` when the goal changes — the
// quest’s title, the step, the quest’s brief when the quest is new, where the first group is —
// then settles to the title and the step on two rows at most, which never leave (`mini` 1, the
// minimal display: the step alone, on one row; 2, a boss’s bar to keep clear of: that row even
// when the goal changes). `room`: the width it may take (a player’s menu is open beside it).
export function trackerLayout(o, W, mini = 0, room = W) {
  const big = o.t < o.secs && mini < 2, key = [big, mini, W, room, o.title, o.text, o.brief, o.sub, o.extra].join('|');
  if (o.lay && o.lay.key === key) return o.lay;
  const max = Math.min(room, Math.round(W * 0.5)), rows = [], step = (w, n) => wrapTail(o.text, o.tail, w, n);
  let w, top = 6;
  if (big) {
    w = Math.round(Math.min(max, Math.max(measure(o.text), measure(o.sub), o.title ? measure(o.title) + 10 : 0, Math.min(measure(o.extra), max - 20), Math.min(measure(o.brief || ''), max - 20)) + 20));
    if (o.title) rows.push({ text: fitRich(o.title, w - 28), color: '#8a5234', star: true, h: 11 });
    for (const l of step(w - 18, 2)) rows.push({ text: l, color: UI.ink, h: 11 });
    if (o.brief) wrapFit(o.brief, w - 18, 4).forEach((l, i) => rows.push({ text: l, color: BRIEF, h: 10, gap: i ? 0 : 1 }));
    if (o.sub) rows.push({ text: fitRich(o.sub, w - 18), color: '#a8754e', h: 11, gap: o.brief ? 1 : 0 });
    for (const l of o.extra ? wrapFit(o.extra, w - 18, 2) : []) rows.push({ text: l, color: '#7d4f93', h: 10 });
  } else if (mini || !o.title) {
    const l = step(max - 28, 1)[0];
    w = measure(l) + 28; top = 5;
    rows.push({ text: l, color: UI.ink, star: true, h: 10 });
  } else {
    const rest = Math.min(room, Math.round(W * 0.44)), tw = evenWidth(o.text, rest - 18, 2), title = fitRich(o.title, rest - 28);
    w = Math.max(tw, measure(title) + 10) + 18;
    rows.push({ text: title, color: '#8a5234', star: true, h: 10 });
    for (const l of step(w - 18, 2)) rows.push({ text: l, color: UI.ink, h: 10 });
  }
  const h = top + rows.reduce((a, r) => a + r.h + (r.gap || 0), 0) + 2;
  return (o.lay = { key, big, w, h, top, rows });
}
// (R: where it is right now — the layout’s rows in a frame that may still be growing or closing)
export function drawTracker(ctx, R) {
  const { x, y, w, h } = R;
  panel(ctx, x, y, w, h);
  ctx.save();
  ctx.beginPath(); ctx.rect(x + 3, y + 3, w - 6, h - 6); ctx.clip();
  let ty = y + R.top;
  for (const r of R.rows) {
    ty += r.gap || 0;
    if (r.star) drawText(ctx, '★', x + 8, ty, { color: '#e0a526' });
    drawText(ctx, r.text, x + (r.star ? 18 : 8), ty, { color: r.color });
    ty += r.h;
  }
  ctx.restore();
}
