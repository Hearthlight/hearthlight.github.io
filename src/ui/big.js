// Bigger things for a finger, and for eyes at arm’s length (the first screens on a phone):
// a button whose word doubles when it has the room, arrows a thumb can’t miss, a line of text
// at the largest scale that fits.
import { drawText, measure, wrap } from '../engine/font.js';
import { fitText } from './ui.js';

// the largest scale (`max`, down to 1) at which `text` fits `maxW` on one line
export function fitScale(text, maxW, max = 2) {
  for (let s = max; s > 1; s--) if (measure(text, s) <= maxW) return s;
  return 1;
}

// a text on up to `maxLines` lines, doubled when that fits: { lines, scale, h } (h: its height)
export function bigLines(text, maxW, maxLines = 2) {
  const two = wrap(text, maxW, 2);
  if (two.length <= maxLines && two.every((l) => measure(l, 2) <= maxW)) return { lines: two, scale: 2, h: two.length * 18 - 2 };
  const one = wrap(text, maxW);
  return { lines: one, scale: 1, h: one.length * 11 - 2 };
}
// (x: the left edge, or the middle with `align: 'center'`)
export function drawLines(ctx, L, x, y, opts = {}) {
  L.lines.forEach((l, i) => drawText(ctx, l, x, y + i * (L.scale === 2 ? 18 : 11), { ...opts, scale: L.scale }));
}

export function bigButton(ctx, x, y, w, h, label, { color = '#8e5d3e', hot = false, down = false, scale = 0, ink = null } = {}) {
  x = Math.round(x); y = Math.round(y) + (down ? 1 : 0);
  ctx.fillStyle = 'rgba(30,18,30,0.3)'; ctx.fillRect(x + 1, y + 2, w, h);
  ctx.fillStyle = '#3b2a22'; ctx.fillRect(x + 1, y, w - 2, h); ctx.fillRect(x, y + 1, w, h - 2);
  ctx.fillStyle = hot ? '#e0a526' : color; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  if (down) { ctx.fillStyle = 'rgba(20,10,20,0.2)'; ctx.fillRect(x + 1, y + 1, w - 2, h - 2); }
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x + 1, y + 1, w - 2, 1);
  ctx.fillStyle = 'rgba(20,10,20,0.16)'; ctx.fillRect(x + 1, y + h - 3, w - 2, 2);
  const s = scale || (h >= 22 ? fitScale(label, w - 10) : 1);
  drawText(ctx, s === 1 ? fitText(label, w - 6) : label, x + w / 2, y + Math.round((h - 9 * s) / 2) + s, { color: ink || (hot ? '#3b2a2e' : '#fff7e6'), align: 'center', scale: s });
  return s;
}

// ◂ ▸ on a button (dir −1 · 1)
export function arrowButton(ctx, x, y, w, h, dir, { down = false, color = '#8e5d3e' } = {}) {
  x = Math.round(x); y = Math.round(y) + (down ? 1 : 0);
  ctx.fillStyle = '#3b2a22'; ctx.fillRect(x + 1, y, w - 2, h); ctx.fillRect(x, y + 1, w, h - 2);
  ctx.fillStyle = down ? '#b07b50' : color; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(x + 1, y + 1, w - 2, 1);
  ctx.fillStyle = '#fff7e6';
  const cx = x + Math.floor(w / 2), cy = y + Math.floor(h / 2);
  for (let i = 0; i < 5; i++) ctx.fillRect(cx + (dir < 0 ? -3 + i : 2 - i), cy - i, 1, i * 2 + 1);
}

// the die of « a name out of the hat », on a button
export function diceButton(ctx, x, y, w, h, { down = false } = {}) {
  bigButton(ctx, x, y, w, h, '', { color: '#6a4a88', down });
  const s = h >= 20 && w >= 20 ? 2 : 1;
  drawText(ctx, '🎲', x + w / 2, Math.round(y) + (down ? 1 : 0) + Math.round((h - 7 * s) / 2), { color: '#fff7e6', align: 'center', scale: s });
}
