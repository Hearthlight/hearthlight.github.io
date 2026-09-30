// An on-screen keyboard, for a name typed with a gamepad (or the phone that
// drives the solo game): letters in a grid, two accent keys, a die for a name
// out of the hat, OK. The first letter comes out big, the rest small, like a
// name. A types · B rubs out (on an empty name: back) · X a random name ·
// Start OK. The stick or the D-pad walk the grid; a mouse can click it too.

import { drawText, measure } from '../engine/font.js';
import { panel, UI, fitText, ctl } from './ui.js';
import { audio } from '../engine/audio.js';
import { t } from '../i18n.js';

const ROWS = [
  'ABCDEFGHIJ'.split(''),
  'KLMNOPQRST'.split(''),
  'UVWXYZ-’éü'.split(''),
  ['⇧', ' ', '⌫', '🎲', 'OK'],
];
// (a chat message: punctuation, figures and a heart instead of the name's die — src/ui/chat.js)
const CHAT_ROWS = [
  'ABCDEFGHIJ'.split(''),
  'KLMNOPQRST'.split(''),
  'UVWXYZ,.!?'.split(''),
  '1234567890'.split(''),
  'éü-’:)(♥…'.split(''),
  ['⇧', ' ', '⌫', 'OK'],
];
// (Release v9) the two accent keys dress the last letter, one press after another — é: é è ê,
// á à â, ñ, ç…; ü: ü ö ä ë ï, ß — or type é / ü themselves after anything else
const ACUTE = ['aáàâa', 'eéèêe', 'iíìîi', 'oóòôo', 'uúùûu', 'nñn', 'cçc'];
const UMLAUT = ['aäa', 'oöo', 'uüu', 'eëe', 'iïi', 'sßs', 'yÿy'];
function dress(ch, chain) {
  const low = ch.toLowerCase(), up = ch !== low;
  for (const c of chain) { const i = c.indexOf(low); if (i >= 0 && i < c.length - 1) { const n = c[i + 1]; return up && n !== 'ß' ? n.toUpperCase() : n; } }
  return null;
}
// (no villager's name: Theo stays Theo)
const NAMES = ['Alex', 'Sam', 'Robin', 'Charlie', 'Noa', 'Lou', 'Mika', 'Jules', 'Milo', 'Luna', 'Nico', 'Ada', 'Leo', 'Zoé', 'Léa', 'Hugo',
  'Maya', 'Eli', 'Nina', 'Oscar', 'Iris', 'Tom', 'Emma', 'Lucas', 'Jade', 'Rémi', 'Noor', 'Aiko', 'Omar', 'Elsa', 'Yann', 'Suki'];

export class Osk {
  constructor(value = '', { max = 12, title = 'Your name', keys = null, hint = null, chat = false } = {}) {
    this.v = value;
    this.chat = chat;
    this.rows = chat ? CHAT_ROWS : ROWS;
    this.keys = keys;             // { a, b, x, ok }: the buttons' names, when they aren't the big screen's
    this.hint = hint;             // (a line of its own under the keys: a name typed on a keyboard)
    this.max = max;
    this.title = title;
    this.r = 0; this.c = 0;
    this.caps = !value;           // (a new name starts with a capital)
    this.done = false;            // OK pressed
    this.back = false;            // B on an empty name: leave it be
    this.t = 0;
  }

  get key() { return this.rows[this.r][Math.min(this.c, this.rows[this.r].length - 1)]; }

  update(dt, input) {
    this.t += dt;
    const move = (dr, dc) => {
      const was = this.key;
      if (dr) {
        // (into the short bottom row and out of it, the column follows the width)
        const R = this.rows, from = R[this.r].length, r = (this.r + dr + R.length) % R.length, to = R[r].length;
        this.c = Math.min(to - 1, Math.round((this.c + 0.5) * to / from - 0.5));
        this.r = r;
      } else this.c = (this.c + dc + this.rows[this.r].length) % this.rows[this.r].length;
      if (this.key !== was) audio.sfx('select', { volume: 0.3 });
    };
    if (input.repeat('up')) move(-1, 0);
    if (input.repeat('down')) move(1, 0);
    if (input.repeat('left')) move(0, -1);
    if (input.repeat('right')) move(0, 1);
    if (input.pressed('interact')) { input.consume('interact'); this.press(this.key); }
    if (input.pressed('cancel')) { input.consume('cancel', 'jump'); if (this.v) this.press('⌫'); else { this.back = true; audio.sfx('cancel', { volume: 0.5 }); } }
    if (input.pressed('special') && !this.chat) this.press('🎲');
    if (input.pressed('start')) { input.consume('start', 'pause'); this.press('OK'); }
    for (const r of this.rects || []) if (input.mouseIn(r.x, r.y, r.w, r.h)) {
      if (input.mouse.moved) { this.r = r.r; this.c = r.c; }
      if (input.mouse.pressed) { input.mouse.pressed = false; this.r = r.r; this.c = r.c; this.press(this.key); }
    }
  }

  press(k) {
    if (k === 'OK') { if (!this.v.trim()) { audio.sfx('error'); return; } this.done = true; audio.sfx('confirm'); return; }
    if (k === '⌫') { this.v = this.v.slice(0, -1); if (!this.v) this.caps = true; audio.sfx('typewriter', { volume: 0.35 }); return; }
    if (k === '⇧') { this.caps = !this.caps; audio.sfx('select', { volume: 0.4 }); return; }
    if (k === '🎲') {
      let n = this.v;
      while (n === this.v) n = NAMES[Math.floor(Math.random() * NAMES.length)];
      this.v = n; this.caps = false;
      audio.sfx('page');
      return;
    }
    if ((k === 'é' || k === 'ü') && this.v) {
      const d = dress(this.v.slice(-1), k === 'é' ? ACUTE : UMLAUT);
      if (d) { this.v = this.v.slice(0, -1) + d; audio.sfx('typewriter', { volume: 0.4 }); return; }
    }
    if (this.v.length >= this.max) { audio.sfx('error'); return; }
    if (k === ' ' && (!this.v || this.v.endsWith(' '))) return;
    this.v += this.caps ? k.toUpperCase() : k.toLowerCase();
    // (a capital for the first letter, and after a space or a hyphen — a message: after . ! ?)
    this.caps = this.chat ? /[.!?]$/.test(this.v.trimEnd()) && k === ' ' : k === ' ' || k === '-';
    audio.sfx('typewriter', { volume: 0.4 });
  }

  // a letter typed on a real keyboard, as it was typed
  type(ch) {
    if (this.v.length >= this.max) { audio.sfx('error'); return; }
    if (ch === ' ' && (!this.v || this.v.endsWith(' '))) return;
    this.v += ch;
    this.caps = ch === ' ' || ch === '-';
    audio.sfx('typewriter', { volume: 0.4 });
  }

  // (x0, y0: the corner of the W × H area it sits in the middle of)
  draw(ctx, W, H, x0 = 0, y0 = 0) {
    const R = this.rows, cell = 17, gap = 2, gw = 10 * cell + 9 * gap;
    const pw = gw + 20, ph = R.length * (cell + gap) + 62;
    const px = x0 + Math.round(W / 2 - pw / 2), py = y0 + Math.round(H / 2 - ph / 2);
    ctx.fillStyle = 'rgba(20,14,28,0.5)'; ctx.fillRect(x0, y0, W, H);
    panel(ctx, px, py, pw, ph);
    drawText(ctx, t(this.title), px + pw / 2, py + 7, { color: '#8a5234', align: 'center' });
    // the name so far, with a blinking caret
    const bx = px + 10, by = py + 18;
    ctx.fillStyle = '#3b2a22'; ctx.fillRect(bx, by, gw, 14);
    ctx.fillStyle = '#fffaf0'; ctx.fillRect(bx + 1, by + 1, gw - 2, 12);
    // (a message longer than the box: its end, where the caret is)
    let shown = fitText(this.v, gw - 40);
    if (this.chat && shown !== this.v) { const cs = [...this.v]; let k = cs.length; while (k > 0 && measure('…' + cs.slice(k - 1).join('')) < gw - 40) k--; shown = '…' + cs.slice(k).join(''); }
    drawText(ctx, shown, bx + 5, by + 3, { color: UI.ink });
    if (Math.floor(this.t * 2.5) % 2 === 0) { ctx.fillStyle = '#e0a526'; ctx.fillRect(bx + 6 + measure(shown), by + 3, 1, 8); }
    drawText(ctx, `${this.v.length}/${this.max}`, bx + gw - 4, by + 3, { color: '#b8a080', align: 'right' });
    // the keys
    this.rects = [];
    R.forEach((row, r) => {
      const last = r === R.length - 1, cw = last ? Math.floor((gw - (row.length - 1) * gap) / row.length) : cell;
      row.forEach((k, c) => {
        const x = bx + c * (cw + gap), y = by + 20 + r * (cell + gap), on = r === this.r && c === Math.min(this.c, row.length - 1);
        const special = last;
        ctx.fillStyle = on ? '#e0a526' : '#3b2a22'; ctx.fillRect(x, y, cw, cell);
        ctx.fillStyle = on ? '#fff3c4' : special ? '#e8d6b4' : '#f6ead0'; ctx.fillRect(x + 1, y + 1, cw - 2, cell - 3);
        const label = k === ' ' ? t('space') : k === 'OK' ? t('OK') : k === '⇧' ? (this.caps ? 'ABC' : 'abc') : special ? k : this.caps ? k.toUpperCase() : k.toLowerCase();
        drawText(ctx, fitText(label, cw - 4), x + cw / 2, y + 4, { color: k === 'OK' ? '#4f955a' : UI.ink, align: 'center' });
        this.rects.push({ x, y, w: cw, h: cell, r, c });
      });
    });
    const K = this.keys || { a: ctl('interact'), b: ctl('cancel'), x: ctl('special'), ok: ctl('start') };
    const hint = this.hint || (this.chat ? t('{a} type · {b} rub out · {start} send', { a: K.a, b: K.b, start: K.ok }) : t('{a} type · {b} rub out · {x} random name · {start} OK', { a: K.a, b: K.b, x: K.x, start: K.ok }));
    drawText(ctx, fitText(hint, pw - 12), px + pw / 2, py + ph - 12, { color: '#b8a080', align: 'center' });
  }
}
