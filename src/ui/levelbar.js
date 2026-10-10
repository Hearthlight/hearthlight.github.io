// Levels, as players read them (twenty of them: saga/levels.js): the experience bar with
// its notch, a place’s levels in words — in the colour that says how they sit next to a
// hero —, and what the next step brings. Shared by the big screen’s badges, the solo HUD,
// the Hero page, the level-up card and the phone.

import { drawText, measure, wrap } from '../engine/font.js';
import { shownLevel, shownRange, landFit, xpBar } from '../saga/levels.js';
import { t } from '../i18n.js';

// the bar’s colours on a dark strip (badges, the phone’s header) and on paper (panels)
export const XP_DARK = { rim: null, back: '#5c4a6a', fill: '#ffd66b', lit: '#fff7e6', dim: '#c9b8e0' };
export const XP_PAPER = { rim: '#3b2a22', back: '#e6d6b6', fill: '#e0a526', lit: '#8a5234', dim: '#8a5234' };
// …and a place’s fit (landFit: nothing to learn · easy · just right · a challenge · too strong)
const FIT_DARK = ['#a8a4ac', '#7ee070', '#ffe066', '#ffa040', '#ff6a5a'];
const FIT_PAPER = ['#8a7a70', '#4f955a', '#a8761a', '#c9622a', '#c8454f'];
export const fitColor = (lv, own, paper = false) => (paper ? FIT_PAPER : FIT_DARK)[landFit(lv, own)];

// The experience bar (bar: xpBar(level, xp)): gold up to where you are, a notch where the
// level’s first half ends — a talent point waits there —, the level-up at its end.
export function drawXpBar(ctx, x, y, w, h, bar, C = XP_DARK) {
  let ix = x, iy = y, iw = w, ih = h;
  if (C.rim) { ctx.fillStyle = C.rim; ctx.fillRect(x, y, w, h); ix++; iy++; iw -= 2; ih -= 2; }
  ctx.fillStyle = C.back; ctx.fillRect(ix, iy, iw, ih);
  const fw = bar.max ? iw : Math.min(iw, Math.max(bar.have > 0 ? 1 : 0, Math.round(iw * bar.k)));
  ctx.fillStyle = C.fill; ctx.fillRect(ix, iy, fw, ih);
  if (ih >= 3) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(ix, iy, fw, 1); }
  if (!bar.mid || bar.max) return;
  // the notch: a tick through the bar, a pixel taller than it (bright once it’s behind you)
  const nx = ix + Math.round(iw * bar.mid);
  ctx.fillStyle = bar.half ? C.lit : C.dim;
  ctx.fillRect(nx, y - 1, 1, h + 2);
}

// "Lv 5" over its bar, right-aligned at `right` (a badge, the phone’s header: `wide`, the
// least the bar spans); returns the width it took
export function drawLevelTag(ctx, right, y, lv, bar, color = '#ffd66b', wide = 30) {
  const text = t('Lv{n}', { n: lv }), w = Math.max(wide, measure(text));
  drawText(ctx, text, right, y, { color, align: 'right' });
  if (bar) drawXpBar(ctx, right - w, y + 9, w, 3, bar);
  return w;
}

// a small arrow by a hero’s experience bar: the land lifts them to its level (up, green) or
// holds them down to it (down, blue); (x, y): its top left, 5 × 3; `ink`: its colour on paper
export function liftMark(ctx, x, y, dir, ink = null) {
  ctx.fillStyle = ink || (dir > 0 ? '#7ee070' : '#9fb8ff');
  for (let i = 0; i < 3; i++) ctx.fillRect(x + 2 - i, y + (dir > 0 ? i : 2 - i), 1 + i * 2, 1);
}

// "levels 2–4" (a single one: "level 20") — given a hero’s own level (the game’s scale), in
// the colour of how the place sits next to them
export function levelsText(lv, own = 0, paper = false) {
  const [a, b] = shownRange(lv), text = a === b ? t('level {n}', { n: a }) : t('levels {a}–{b}', { a, b });
  return own ? `{${fitColor(lv, own, paper)}}${text}{/}` : text;
}
// …and the short form, for a map’s labels: "Lv2–4"
export function levelsTag(lv, own = 0) {
  const [a, b] = shownRange(lv), text = t('Lv{n}', { n: a === b ? a : `${a}–${b}` });
  return own ? `{${fitColor(lv, own)}}${text}{/}` : text;
}

// what comes next for a hero of that level, spelled out: the notch (unless it’s behind them),
// then the level-up — or nothing more at the top
export function nextSteps(level, xp = 0) {
  const bar = xpBar(level, xp), n = shownLevel(level);
  if (bar.max) return [t('The highest level: as strong as a hero gets.')];
  if (!bar.mid) return [t('At the end of the bar: a last talent point.')];
  const up = t('Level {n}: more health and strength, a talent point.', { n: n + 1 });
  return bar.half ? [up] : [t('Halfway: a talent point.'), up];
}

// what levels are for, in plain words: the first level-up card on a phone says it all (the
// solo game’s panel, the first line)…
export const levelWords = () => [
  t('Each level makes your hero tougher and stronger, and brings two talent points.'),
  t('Lands have levels too: their names and the map show them.'),
  t('In a party everyone fights at the land’s level: a friend who joins late can play at once.'),
];
// …and the Hero page keeps it in a line
export const levelLine = () => t('Each level: more health, more strength, two talent points.');

// the land changes the level a hero fights at (dir: 1 lifted, -1 held down; n: that level):
// the sentence, and its colour on paper (a friendly lift in a party, a warning alone)
export function liftWords(dir, n, solo = false) {
  return dir < 0 ? t('This land is below your level: here you fight at level {n}.', { n })
    : solo ? t('This land is above your level: here you fight at level {n}.', { n })
      : t('This land lifts you to level {n}: here everyone fights at its level.', { n });
}
export const liftInk = (dir, solo = false) => (dir < 0 ? '#4f73b6' : solo ? '#c9622a' : '#4f7f3a');

// lines of text in a column, top to bottom; returns the y under them
export function drawLines(ctx, lines, x, y, w, color, step = 10, max = 99) {
  let n = 0;
  for (const line of lines) for (const l of wrap(line, w)) { if (n++ >= max) return y; drawText(ctx, l, x, y, { color }); y += step; }
  return y;
}
