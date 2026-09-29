// UI drawing kit: paper panels, tags, buttons, hearts, key hints.
import { drawText, measure, wrap, LINE_H } from '../engine/font.js';
import { COLORS } from '../art/palette.js';
import { getLang, t } from '../i18n.js';

// Translate a word that needs a different French in one spot ("Pet" the verb
// vs the creator's "Pet" tab): looks up "Pet [creator tab]" first.
export function tc(s, where) {
  const k = `${s} [${where}]`, r = t(k);
  return r !== k ? r : t(s);
}

// Key caps as printed on the player's keyboard. Bindings are physical keys
// (KeyW = where QWERTY has W), so AZERTY players move with Z/Q/S/D.
const CAPS_QWERTY = { KeyW: 'W', KeyA: 'A', KeyS: 'S', KeyD: 'D', KeyQ: 'Q', KeyR: 'R', KeyE: 'E', KeyM: 'M', KeyJ: 'J', KeyB: 'B', KeyX: 'X' };
const CAPS_AZERTY = { ...CAPS_QWERTY, KeyW: 'Z', KeyA: 'Q', KeyQ: 'A', KeyM: ',' };
const CAPS_QWERTZ = { ...CAPS_QWERTY, KeyY: 'Z', KeyZ: 'Y' };
let layoutMap = null;
try {
  if (typeof navigator !== 'undefined' && navigator.keyboard && navigator.keyboard.getLayoutMap) {
    navigator.keyboard.getLayoutMap().then((m) => { layoutMap = m; }, () => {});
  }
} catch (e) { /* no layout info: guess from the language */ }
export function keyCap(code) {
  const k = (layoutMap && layoutMap.get(code)) || (getLang() === 'fr' ? CAPS_AZERTY : getLang() === 'de' ? CAPS_QWERTZ : CAPS_QWERTY)[code] || code.replace(/^Key/, '');
  const cap = k.toUpperCase();
  return /^[A-Z0-9]$/.test(cap) ? cap : `[${cap}]`;
}
export const moveKeys = () => ['KeyW', 'KeyA', 'KeyS', 'KeyD'].map(keyCap).join('');

// ------------------------------------------------------------------ controls
// What to press on the device in hand — a key, a gamepad's button (by its
// family: Xbox A B X Y, PlayStation ✕ ○ □ △, Nintendo B A Y X), a phone's:
// `ctl('interact')` → E · A · ✕. `bindInput(game.input)` once, at the start.
let INPUT = null;
export function bindInput(input) { INPUT = input; }
export function device() {
  const d = INPUT && INPUT.lastDevice;
  return d === 'gamepad' ? 'pad' : d === 'phone' ? 'phone' : d === 'touch' ? 'touch' : 'keys';
}
const KEYS_OF = { interact: 'KeyE', jump: 'Space', cancel: 'Escape', pause: 'Escape', menu: 'Tab', map: 'KeyM', journal: 'KeyJ', hero: 'KeyH', hotPrev: 'KeyQ', hotNext: 'KeyR', special: 'KeyF', dodge: 'KeyC', ult: 'KeyG', bike: 'KeyB', run: 'ShiftLeft', hud: 'KeyV' };
const PAD_OF = {
  xbox: { interact: 'A', jump: 'B', cancel: 'B', special: 'X', dodge: 'Y', pause: 'Start', start: 'Start', menu: 'Select', map: 'Select', hotPrev: 'LB', hotNext: 'RB', ult: 'R3', bike: 'L3', run: 'RT', hud: 'LT' },
  ps: { interact: '✕', jump: '○', cancel: '○', special: '□', dodge: '△', pause: 'Options', start: 'Options', menu: 'Create', map: 'Create', hotPrev: 'L1', hotNext: 'R1', ult: 'R3', bike: 'L3', run: 'R2', hud: 'L2' },
  nintendo: { interact: 'B', jump: 'A', cancel: 'A', special: 'Y', dodge: 'X', pause: '+', start: '+', menu: '−', map: '−', hotPrev: 'L', hotNext: 'R', ult: 'R3', bike: 'L3', run: 'ZR', hud: 'ZL' },
};
const PHONE_OF = { interact: 'A', jump: 'B', cancel: 'B', special: 'X', dodge: 'Y', ult: 'U', run: 'A' };
// a key code as a player would read it: E, Space, Enter, ⌫…
const KEY_WORDS = { Space: 'Space', Enter: 'Enter', NumpadEnter: 'Enter', ShiftLeft: 'Shift', ShiftRight: 'Shift', ControlRight: 'Ctrl', Tab: 'Tab', Backspace: '⌫', Escape: 'Esc', Slash: '/', Period: '.', Comma: ',', Quote: '\'' };
export function keyLabel(code) {
  if (KEY_WORDS[code]) return code === 'Space' ? t('Space') : KEY_WORDS[code];
  if (/^Numpad\d$/.test(code)) return 'Num' + code.slice(-1);
  return keyCap(code).replace(/^\[|\]$/g, '');
}
export function padName(action, style = INPUT ? INPUT.padStyle : 'xbox') { return (PAD_OF[style] || PAD_OF.xbox)[action] || ''; }
export function ctl(action, dev = device()) {
  if (dev === 'pad') return padName(action) || '?';
  if (dev === 'phone' && PHONE_OF[action]) return PHONE_OF[action];
  if (dev === 'phone') return t('Menu');
  const code = KEYS_OF[action];
  if (!code) return '?';
  return code === 'Space' ? t('Space') : code === 'Escape' ? 'Esc' : code === 'Tab' ? 'Tab' : code === 'ShiftLeft' ? 'Shift' : keyCap(code);
}

// a gamepad's face buttons in their colours (the others are little dark caps)
const FACE = { A: '#5fb85a', B: '#e0584f', X: '#4f8fe0', Y: '#e8b83a', '✕': '#6f9cf0', '○': '#e8646a', '□': '#d884c0', '△': '#4fc098' };
export const isFace = (label) => !!FACE[label];
// a round button, 11 px across, centred on (cx, cy)
export function faceGlyph(ctx, cx, cy, label) {
  const rows = [3, 7, 9, 9, 11, 11, 11, 9, 9, 7, 3];
  const x0 = Math.round(cx) - 5, y0 = Math.round(cy) - 5;
  rows.forEach((w, j) => { ctx.fillStyle = '#2a1f33'; ctx.fillRect(x0 + (11 - w) / 2 - 1, y0 + j, w + 2, 1); });
  rows.forEach((w, j) => { if (j === 0 || j === 10) return; ctx.fillStyle = FACE[label] || '#8a7a98'; ctx.fillRect(x0 + (11 - w) / 2 + (w >= 9 ? 1 : 0), y0 + j, w - (w >= 9 ? 2 : 0), 1); });
  ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(x0 + 3, y0 + 1, 5, 1);
  drawText(ctx, label, x0 + 6, y0 + 2, { color: '#fff7e6', align: 'center' });
}

// Shorten text with "…" so it fits maxW pixels.
export function fitText(text, maxW, scale = 1) {
  text = String(text);
  if (measure(text, scale) <= maxW) return text;
  let s = text;
  while (s.length > 1 && measure(s + '…', scale) > maxW) s = s.slice(0, -1);
  return s.trimEnd() + '…';
}

// Split a label into two balanced lines (at a space) when it is wider than maxW.
export function splitTwo(text, maxW, scale = 1) {
  text = String(text);
  if (measure(text, scale) <= maxW) return [text];
  const words = text.split(' ');
  if (words.length < 2) return [text];
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const w = Math.max(measure(a, scale), measure(b, scale));
    if (!best || w < best.w) best = { w, lines: [a, b] };
  }
  return best.lines;
}

export const UI = {
  paper: '#fbf1dc', paperShade: '#efdfc0', edge: '#c9a77c', dark: '#5a3b2a', ink: '#3b2a2e', inkSoft: '#7a6060',
  sel: '#f6d38f', selEdge: '#e0a526', heart: '#ec5f73', gold: '#e0a526',
};

// Cream paper panel with a brown frame and a soft drop shadow.
export function panel(ctx, x, y, w, h, style = 'paper') {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  if (style === 'dark') {
    ctx.fillStyle = 'rgba(20,14,28,0.35)';
    ctx.fillRect(x + 1, y + 2, w, h);
    ctx.fillStyle = '#2a1f33';
    ctx.fillRect(x + 1, y, w - 2, h);
    ctx.fillRect(x, y + 1, w, h - 2);
    ctx.fillStyle = '#3d2f48';
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = '#4c3c58';
    ctx.fillRect(x + 1, y + 1, w - 2, 1);
    return;
  }
  const P = style === 'wood'
    ? { out: '#3b2a22', frame: '#8e5d3e', frameL: '#b07b50', fill: '#6b4330', fillL: '#7a5238' }
    : style === 'blue'
      ? { out: '#2f3d6b', frame: '#6b8fc8', frameL: '#9fbbe6', fill: '#e8eef8', fillL: '#f6f9ff' }
      : { out: UI.dark, frame: UI.edge, frameL: '#e0c89a', fill: UI.paper, fillL: '#fff8ea' };
  // shadow
  ctx.fillStyle = 'rgba(30,18,30,0.28)';
  ctx.fillRect(x + 2, y + 3, w - 2, h - 1);
  // outline with notched corners
  ctx.fillStyle = P.out;
  ctx.fillRect(x + 2, y, w - 4, h);
  ctx.fillRect(x, y + 2, w, h - 4);
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  // frame
  ctx.fillStyle = P.frame;
  ctx.fillRect(x + 2, y + 1, w - 4, h - 2);
  ctx.fillRect(x + 1, y + 2, w - 2, h - 4);
  ctx.fillStyle = P.frameL;
  ctx.fillRect(x + 2, y + 1, w - 4, 1);
  // fill
  ctx.fillStyle = P.fill;
  ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
  ctx.fillStyle = P.fillL;
  ctx.fillRect(x + 3, y + 3, w - 6, 1);
  if (style === 'paper') {
    ctx.fillStyle = UI.paperShade;
    ctx.fillRect(x + 3, y + h - 4, w - 6, 1);
  }
}

// Small rounded tag (name plates, tabs)
export function tag(ctx, x, y, text, bg = '#6b4330', fg = '#fff7e6') {
  const w = measure(text) + 8, h = 12;
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = 'rgba(30,18,30,0.3)';
  ctx.fillRect(x + 1, y + 2, w, h);
  ctx.fillStyle = bg;
  ctx.fillRect(x + 1, y, w - 2, h);
  ctx.fillRect(x, y + 1, w, h - 2);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x + 1, y + 1, w - 2, 1);
  drawText(ctx, text, x + 4, y + 2, { color: fg });
  return w;
}

// A panel's Close button: a ✕ and the word, big enough for a finger, drawn right-aligned at
// `right`; returns its rect (the caller closes on a click or a tap in it — and says which
// key does too, with ctl('cancel'))
export function closeButton(ctx, right, y, { hot = false } = {}) {
  const label = t('Close'), w = measure(label) + 20, h = 14, x = Math.round(right - w);
  button(ctx, x, y, w, h, '', { hot, color: hot ? null : '#8e5d3e' });
  const ink = hot ? '#3b2a2e' : '#fff7e6', cx = x + 7, cy = y + 7;
  ctx.fillStyle = ink;
  for (let i = -2; i <= 2; i++) { ctx.fillRect(cx + i, cy + i, 1, 1); ctx.fillRect(cx + i, cy - i, 1, 1); }
  drawText(ctx, label, x + 13, y + 3, { color: ink });
  return { x, y, w, h };
}

export function button(ctx, x, y, w, h, label, { hot = false, disabled = false, color = null } = {}) {
  x = Math.round(x); y = Math.round(y);
  const base = disabled ? '#b8aa9a' : color || (hot ? '#e0a526' : '#8e5d3e');
  const light = disabled ? '#cfc2b2' : hot ? '#f6d38f' : '#b07b50';
  ctx.fillStyle = 'rgba(30,18,30,0.3)';
  ctx.fillRect(x + 1, y + 2, w, h);
  ctx.fillStyle = '#3b2a22';
  ctx.fillRect(x + 1, y, w - 2, h); ctx.fillRect(x, y + 1, w, h - 2);
  ctx.fillStyle = base;
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = light;
  ctx.fillRect(x + 1, y + 1, w - 2, 1);
  drawText(ctx, label, x + w / 2, y + Math.round((h - 9) / 2) + 1, { color: hot ? '#3b2a2e' : '#fff7e6', align: 'center' });
}

export function heart(ctx, x, y, full = 1, scale = 1) {
  const H = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
  for (let j = 0; j < H.length; j++) for (let i = 0; i < 7; i++) {
    if (H[j][i] !== '#') continue;
    const filled = i / 7 < full;
    ctx.fillStyle = filled ? (j === 1 && i === 1 ? '#ffb3bf' : UI.heart) : '#d8c8b8';
    ctx.fillRect(x + i * scale, y + j * scale, scale, scale);
  }
}

// Keyboard hint pill: [E] Talk
export function keyHint(ctx, x, y, key, label, { center = true, dark = true } = {}) {
  // (a gamepad's A / B / X / Y: the round button itself)
  const face = isFace(key) && device() !== 'keys';
  const kw = face ? 13 : measure(key) + 6;
  const lw = label ? measure(label) + 6 : 0;
  const w = kw + lw + (label ? 2 : 0);
  let px = Math.round(center ? x - w / 2 : x), py = Math.round(y);
  ctx.fillStyle = 'rgba(20,14,28,0.35)';
  ctx.fillRect(px + 1, py + 2, w, 12);
  if (dark) {
    ctx.fillStyle = '#2a1f33';
    ctx.fillRect(px + 1, py, w - 2, 12); ctx.fillRect(px, py + 1, w, 10);
  }
  if (face) faceGlyph(ctx, px + 7, py + 6, key);
  else {
    ctx.fillStyle = '#fff7e6';
    ctx.fillRect(px + 2, py + 2, kw - 2, 8);
    ctx.fillStyle = '#c9a77c';
    ctx.fillRect(px + 2, py + 9, kw - 2, 1);
    drawText(ctx, key, px + 1 + kw / 2, py + 1, { color: '#3b2a2e', align: 'center' });
  }
  if (label) drawText(ctx, label, px + kw + 3, py + 2, { color: '#fff7e6' });
  return w;
}

// Speech/thought bubble with short text, pointing down at (x, y)
// (wrapW: longer lines wrap onto a few rows)
export function bubble(ctx, x, y, text, { color = '#3b2a2e', bg = '#fff7e6', wrapW = 0 } = {}) {
  const lines = wrapW && measure(text) > wrapW ? wrap(text, wrapW) : [text];
  const w = Math.max(...lines.map((l) => measure(l))) + 8, h = 3 + lines.length * 10;
  const bx = Math.round(x - w / 2), by = Math.round(y - h - 4);
  ctx.fillStyle = 'rgba(20,14,28,0.3)';
  ctx.fillRect(bx + 1, by + 2, w, h);
  ctx.fillStyle = '#5a3b2a';
  ctx.fillRect(bx + 1, by, w - 2, h); ctx.fillRect(bx, by + 1, w, h - 2);
  ctx.fillStyle = bg;
  ctx.fillRect(bx + 1, by + 1, w - 2, h - 2);
  ctx.fillStyle = '#5a3b2a';
  ctx.fillRect(Math.round(x) - 1, by + h, 3, 1); ctx.fillRect(Math.round(x), by + h + 1, 1, 2);
  ctx.fillStyle = bg;
  ctx.fillRect(Math.round(x), by + h - 1, 1, 2);
  lines.forEach((l, i) => drawText(ctx, l, bx + 4, by + 2 + i * 10, { color }));
}

// Emote bubbles drawn as tiny pixel icons (heart, !, ?, note, zzz, ...)
const EMOTES = {
  heart: ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'],
  exclaim: ['..##..', '..##..', '..##..', '..##..', '......', '..##..'],
  question: ['.####.', '##..##', '...##.', '..##..', '......', '..##..'],
  note: ['...###', '...#.#', '...#..', '.###..', '####..', '.##...'],
  zzz: ['#####.', '...##.', '..##..', '.##...', '#####.', '......'],
  sweat: ['...#..', '..###.', '.#####', '.#####', '..###.', '......'],
  sparkle: ['...#...', '...#...', '.#####.', '...#...', '...#...', '.......'],
  dots: ['......', '......', '......', '......', '#.#.#.', '......'],
  star: ['...#...', '..###..', '#######', '.#####.', '.##.##.', '.#...#.'],
};
const EMOTE_COL = { heart: '#ec5f73', exclaim: '#d9594c', question: '#4d7fc4', note: '#8a64b8', zzz: '#4d7fc4', sweat: '#7cc4e8', sparkle: '#e0a526', dots: '#3b2a2e', star: '#e0a526' };

export function emote(ctx, x, y, kind, t = 0) {
  const g = EMOTES[kind];
  if (!g) return;
  const w = 13, h = 12;
  const bob = Math.round(Math.sin(t * 6) * 1);
  const bx = Math.round(x - w / 2), by = Math.round(y - h - 3 + bob);
  ctx.fillStyle = '#5a3b2a';
  ctx.fillRect(bx + 1, by, w - 2, h); ctx.fillRect(bx, by + 1, w, h - 2);
  ctx.fillStyle = '#fff7e6';
  ctx.fillRect(bx + 1, by + 1, w - 2, h - 2);
  ctx.fillStyle = '#5a3b2a';
  ctx.fillRect(Math.round(x) - 1, by + h, 3, 1); ctx.fillRect(Math.round(x), by + h + 1, 1, 1);
  ctx.fillStyle = EMOTE_COL[kind];
  const gw = g[0].length;
  for (let j = 0; j < g.length; j++) for (let i = 0; i < gw; i++) if (g[j][i] === '#') ctx.fillRect(bx + Math.floor((w - gw) / 2) + i, by + 3 + j, 1, 1);
}

export function textBlock(ctx, text, x, y, maxW, opts = {}) {
  const lines = wrap(text, maxW);
  lines.forEach((l, i) => drawText(ctx, l, x, y + i * (opts.lh || LINE_H), opts));
  return lines.length * (opts.lh || LINE_H);
}

export function coinIcon(ctx, x, y) {
  const g = ['.####.', '#yyyy#', '#yoyy#', '#yyyy#', '#yyyo#', '.####.'];
  const c = { '#': '#b8862a', y: '#f6c65b', o: '#fff0a0' };
  for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) { const ch = g[j][i]; if (ch !== '.') { ctx.fillStyle = c[ch]; ctx.fillRect(x + i, y + j, 1, 1); } }
}

export { drawText, measure, wrap, LINE_H, COLORS };
