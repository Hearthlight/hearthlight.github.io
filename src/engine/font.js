// Hand-made proportional bitmap font ("Cove 7") rendered from a glyph atlas.
// Cap height 7px, x-height 5px, 2px descenders. Supports inline color tags:
//   "Bring me {gold}3 berries{/} please"   (named colors or {#rrggbb})
// and one mark for the words that must be understood, bold and in colour:
//   "Go to {key}Bram’s fields{/}, west of here"
// (bold the pixel-font way: each glyph drawn twice, a pixel apart — see GB below)

import { COLORS } from '../art/palette.js';

const G = {
  'A': ['.##.', '#..#', '#..#', '####', '#..#', '#..#', '#..#'],
  'B': ['###.', '#..#', '#..#', '###.', '#..#', '#..#', '###.'],
  'C': ['.##.', '#..#', '#...', '#...', '#...', '#..#', '.##.'],
  'D': ['###.', '#..#', '#..#', '#..#', '#..#', '#..#', '###.'],
  'E': ['####', '#...', '#...', '###.', '#...', '#...', '####'],
  'F': ['####', '#...', '#...', '###.', '#...', '#...', '#...'],
  'G': ['.##.', '#..#', '#...', '#.##', '#..#', '#..#', '.###'],
  'H': ['#..#', '#..#', '#..#', '####', '#..#', '#..#', '#..#'],
  'I': ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
  'J': ['..##', '...#', '...#', '...#', '#..#', '#..#', '.##.'],
  'K': ['#..#', '#..#', '#.#.', '##..', '#.#.', '#..#', '#..#'],
  'L': ['#...', '#...', '#...', '#...', '#...', '#...', '####'],
  'M': ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  'N': ['#..#', '##.#', '##.#', '#.##', '#.##', '#..#', '#..#'],
  'O': ['.##.', '#..#', '#..#', '#..#', '#..#', '#..#', '.##.'],
  'P': ['###.', '#..#', '#..#', '###.', '#...', '#...', '#...'],
  'Q': ['.##.', '#..#', '#..#', '#..#', '#..#', '#.#.', '.#.#'],
  'R': ['###.', '#..#', '#..#', '###.', '#.#.', '#..#', '#..#'],
  'S': ['.##.', '#..#', '#...', '.##.', '...#', '#..#', '.##.'],
  'T': ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  'U': ['#..#', '#..#', '#..#', '#..#', '#..#', '#..#', '.##.'],
  'V': ['#...#', '#...#', '#...#', '#...#', '.#.#.', '.#.#.', '..#..'],
  'W': ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  'X': ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  'Y': ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  'Z': ['####', '...#', '..#.', '.#..', '#...', '#...', '####'],

  'a': ['....', '....', '.###', '#..#', '#..#', '#..#', '.###'],
  'b': ['#...', '#...', '###.', '#..#', '#..#', '#..#', '###.'],
  'c': ['...', '...', '.##', '#..', '#..', '#..', '.##'],
  'd': ['...#', '...#', '.###', '#..#', '#..#', '#..#', '.###'],
  'e': ['....', '....', '.##.', '#..#', '####', '#...', '.###'],
  'f': ['.##', '#..', '###', '#..', '#..', '#..', '#..'],
  'g': ['....', '....', '.###', '#..#', '#..#', '#..#', '.###', '...#', '.##.'],
  'h': ['#...', '#...', '###.', '#..#', '#..#', '#..#', '#..#'],
  'i': ['#', '.', '#', '#', '#', '#', '#'],
  'j': ['..#', '...', '..#', '..#', '..#', '..#', '..#', '#.#', '.#.'],
  'k': ['#...', '#...', '#..#', '#.#.', '##..', '#.#.', '#..#'],
  'l': ['#.', '#.', '#.', '#.', '#.', '#.', '.#'],
  'm': ['.....', '.....', '####.', '#.#.#', '#.#.#', '#.#.#', '#.#.#'],
  'n': ['....', '....', '###.', '#..#', '#..#', '#..#', '#..#'],
  'o': ['....', '....', '.##.', '#..#', '#..#', '#..#', '.##.'],
  'p': ['....', '....', '###.', '#..#', '#..#', '#..#', '###.', '#...', '#...'],
  'q': ['....', '....', '.###', '#..#', '#..#', '#..#', '.###', '...#', '...#'],
  'r': ['...', '...', '#.#', '##.', '#..', '#..', '#..'],
  's': ['....', '....', '.###', '#...', '.##.', '...#', '###.'],
  't': ['.#.', '.#.', '###', '.#.', '.#.', '.#.', '..#'],
  'u': ['....', '....', '#..#', '#..#', '#..#', '#..#', '.###'],
  'v': ['.....', '.....', '#...#', '#...#', '.#.#.', '.#.#.', '..#..'],
  'w': ['.....', '.....', '#...#', '#...#', '#.#.#', '#.#.#', '.#.#.'],
  'x': ['....', '....', '#..#', '#..#', '.##.', '#..#', '#..#'],
  'y': ['....', '....', '#..#', '#..#', '#..#', '#..#', '.###', '...#', '.##.'],
  'z': ['....', '....', '####', '...#', '.##.', '#...', '####'],

  '0': ['.##.', '#..#', '#.##', '#..#', '##.#', '#..#', '.##.'],
  '1': ['.#.', '##.', '.#.', '.#.', '.#.', '.#.', '###'],
  '2': ['.##.', '#..#', '...#', '..#.', '.#..', '#...', '####'],
  '3': ['###.', '...#', '...#', '.##.', '...#', '...#', '###.'],
  '4': ['#..#', '#..#', '#..#', '####', '...#', '...#', '...#'],
  '5': ['####', '#...', '#...', '###.', '...#', '...#', '###.'],
  '6': ['.##.', '#...', '#...', '###.', '#..#', '#..#', '.##.'],
  '7': ['####', '...#', '...#', '..#.', '.#..', '.#..', '.#..'],
  '8': ['.##.', '#..#', '#..#', '.##.', '#..#', '#..#', '.##.'],
  '9': ['.##.', '#..#', '#..#', '.###', '...#', '...#', '.##.'],

  ' ': ['...', '...', '...', '...', '...', '...', '...'],
  '.': ['.', '.', '.', '.', '.', '.', '#'],
  ',': ['..', '..', '..', '..', '..', '..', '.#', '#.'],
  '!': ['#', '#', '#', '#', '#', '.', '#'],
  '?': ['.##.', '#..#', '...#', '..#.', '.#..', '....', '.#..'],
  ':': ['.', '.', '#', '.', '.', '.', '#'],
  ';': ['..', '..', '.#', '..', '..', '..', '.#', '#.'],
  "'": ['#', '#', '.', '.', '.', '.', '.'],
  '"': ['#.#', '#.#', '...', '...', '...', '...', '...'],
  '-': ['...', '...', '...', '###', '...', '...', '...'],
  '+': ['...', '...', '.#.', '###', '.#.', '...', '...'],
  '=': ['...', '...', '###', '...', '###', '...', '...'],
  '(': ['.#', '#.', '#.', '#.', '#.', '#.', '.#'],
  ')': ['#.', '.#', '.#', '.#', '.#', '.#', '#.'],
  '[': ['##', '#.', '#.', '#.', '#.', '#.', '##'],
  ']': ['##', '.#', '.#', '.#', '.#', '.#', '##'],
  '/': ['...#', '...#', '..#.', '.##.', '.#..', '#...', '#...'],
  '\\': ['#...', '#...', '.#..', '.##.', '..#.', '...#', '...#'],
  '_': ['....', '....', '....', '....', '....', '....', '....', '####'],
  '*': ['...', '...', '#.#', '.#.', '#.#', '...', '...'],
  '#': ['.....', '.#.#.', '#####', '.#.#.', '#####', '.#.#.', '.....'],
  '%': ['#...#', '#..#.', '...#.', '..#..', '.#...', '.#..#', '#...#'],
  '&': ['.##..', '#..#.', '.##..', '.#.#.', '#..#.', '#...#', '.###.'],
  '<': ['...', '..#', '.#.', '#..', '.#.', '..#', '...'],
  '>': ['...', '#..', '.#.', '..#', '.#.', '#..', '...'],
  '~': ['....', '....', '....', '.#.#', '#.#.', '....', '....'],
  '^': ['.#.', '#.#', '...', '...', '...', '...', '...'],
  '@': ['.###.', '#...#', '#.###', '#.#.#', '#.###', '#....', '.###.'],
  '$': ['.#.', '###', '#..', '###', '..#', '###', '.#.'],
  // Special symbols (mapped from unicode)
  '♥': ['.....', '.....', '##.##', '#####', '#####', '.###.', '..#..'],
  '♡': ['.....', '.....', '##.##', '#.#.#', '#...#', '.#.#.', '..#..'],
  '★': ['..#..', '..#..', '#####', '.###.', '.###.', '##.##', '#...#'],
  '♪': ['..##', '..#.', '..#.', '..#.', '###.', '###.', '....'],
  '•': ['..', '..', '..', '##', '##', '..', '..'],
  '…': ['.....', '.....', '.....', '.....', '.....', '.....', '#.#.#'],
  '→': ['.....', '...#.', '....#', '#####', '....#', '...#.', '.....'],
  '←': ['.....', '.#...', '#....', '#####', '#....', '.#...', '.....'],
  '↑': ['..#..', '.###.', '#.#.#', '..#..', '..#..', '..#..', '.....'],
  '↓': ['.....', '..#..', '..#..', '..#..', '#.#.#', '.###.', '..#..'],
  '·': ['.', '.', '.', '#', '.', '.', '.'],
  '°': ['###', '#.#', '###', '...', '...', '...', '...'],
  '✓': ['.....', '....#', '...#.', '#.#..', '.#...', '.....', '.....'],
  '✕': ['.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '.....'],
  // (a PlayStation pad's buttons, a Nintendo's minus, and a little gamepad)
  '○': ['.....', '.###.', '#...#', '#...#', '#...#', '.###.', '.....'],
  '□': ['.....', '#####', '#...#', '#...#', '#...#', '#####', '.....'],
  '△': ['.....', '..#..', '..#..', '.#.#.', '.#.#.', '#####', '.....'],
  '−': ['...', '...', '...', '###', '...', '...', '...'],
  '⌫': ['..######', '.#.....#', '#..#.#.#', '#...#..#', '#..#.#.#', '.#.....#', '..######'],
  '⏸': ['##.##', '##.##', '##.##', '##.##', '##.##', '##.##', '##.##'],
  '🎲': ['#######', '#.....#', '#.#...#', '#..#..#', '#...#.#', '#.....#', '#######'],
  '🎮': ['.#######.', '#########', '##.###.##', '#...#.#.#', '##.###.##', '###...###', '##.....##'],
  '×': ['.....', '.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  '↖': ['####.', '##...', '#.#..', '#..#.', '....#', '.....', '.....'],
  '♛': ['.....', '#.#.#', '#.#.#', '#####', '#####', '#####', '.....'],
  '◂': ['...', '..#', '.##', '###', '.##', '..#', '...'],
  '▸': ['...', '#..', '##.', '###', '##.', '#..', '...'],
  '¢': ['.....', '..#..', '.###.', '#.#..', '#.#..', '.###.', '..#..'],
  // French (and friends): accents sit in the two rows above the x-height;
  // accented capitals trade one row of letter for the mark
  'é': ['...#', '..#.', '.##.', '#..#', '####', '#...', '.###'],
  'è': ['.#..', '..#.', '.##.', '#..#', '####', '#...', '.###'],
  'ê': ['.##.', '#..#', '.##.', '#..#', '####', '#...', '.###'],
  'ë': ['#..#', '....', '.##.', '#..#', '####', '#...', '.###'],
  'à': ['.#..', '..#.', '.###', '#..#', '#..#', '#..#', '.###'],
  'â': ['.##.', '#..#', '.###', '#..#', '#..#', '#..#', '.###'],
  'ä': ['#..#', '....', '.###', '#..#', '#..#', '#..#', '.###'],
  'î': ['.#.', '#.#', '...', '.#.', '.#.', '.#.', '.#.'],
  'ï': ['#.#', '...', '.#.', '.#.', '.#.', '.#.', '.#.'],
  'ô': ['.##.', '#..#', '.##.', '#..#', '#..#', '#..#', '.##.'],
  'ö': ['#..#', '....', '.##.', '#..#', '#..#', '#..#', '.##.'],
  'ù': ['.#..', '..#.', '#..#', '#..#', '#..#', '#..#', '.###'],
  'û': ['.##.', '....', '#..#', '#..#', '#..#', '#..#', '.###'],
  'ü': ['#..#', '....', '#..#', '#..#', '#..#', '#..#', '.###'],
  'ÿ': ['#..#', '....', '#..#', '#..#', '#..#', '#..#', '.###', '...#', '.##.'],
  'ç': ['...', '...', '.##', '#..', '#..', '#..', '.##', '.#.', '##.'],
  'œ': ['......', '......', '.#.##.', '#.#..#', '#.####', '#.#...', '.#.###'],
  'æ': ['......', '......', '.####.', '...#.#', '.#####', '#..#..', '.##.##'],
  'É': ['..#.', '####', '#...', '###.', '#...', '#...', '####'],
  'È': ['.#..', '####', '#...', '###.', '#...', '#...', '####'],
  'Ê': ['.##.', '####', '#...', '###.', '#...', '#...', '####'],
  'Ë': ['#..#', '####', '#...', '###.', '#...', '#...', '####'],
  'À': ['.#..', '.##.', '#..#', '####', '#..#', '#..#', '#..#'],
  'Â': ['.##.', '#..#', '.##.', '#..#', '####', '#..#', '#..#'],
  'Î': ['.#.', '###', '.#.', '.#.', '.#.', '.#.', '###'],
  'Ô': ['.##.', '.##.', '#..#', '#..#', '#..#', '#..#', '.##.'],
  'Ù': ['.#..', '#..#', '#..#', '#..#', '#..#', '#..#', '.##.'],
  'Û': ['.##.', '#..#', '#..#', '#..#', '#..#', '#..#', '.##.'],
  'Ç': ['.##.', '#..#', '#...', '#...', '#...', '#..#', '.##.', '..#.', '.##.'],
  'Œ': ['.#####', '#.#...', '#.#...', '#.###.', '#.#...', '#.#...', '.#####'],
  // (Release v9) Spanish, German, Italian
  'á': ['...#', '..#.', '.###', '#..#', '#..#', '#..#', '.###'],
  'í': ['..#', '.#.', '...', '.#.', '.#.', '.#.', '.#.'],
  'ì': ['#..', '.#.', '...', '.#.', '.#.', '.#.', '.#.'],
  'ó': ['...#', '..#.', '.##.', '#..#', '#..#', '#..#', '.##.'],
  'ò': ['.#..', '..#.', '.##.', '#..#', '#..#', '#..#', '.##.'],
  'ú': ['...#', '..#.', '#..#', '#..#', '#..#', '#..#', '.###'],
  'ñ': ['.#.#', '#.#.', '###.', '#..#', '#..#', '#..#', '#..#'],
  'ß': ['.##.', '#..#', '#.#.', '#..#', '#..#', '#..#', '#.#.'],
  'Á': ['..#.', '.##.', '#..#', '####', '#..#', '#..#', '#..#'],
  'Ä': ['#..#', '.##.', '#..#', '####', '#..#', '#..#', '#..#'],
  'Í': ['..#', '###', '.#.', '.#.', '.#.', '.#.', '###'],
  'Ì': ['#..', '###', '.#.', '.#.', '.#.', '.#.', '###'],
  'Ó': ['..#.', '.##.', '#..#', '#..#', '#..#', '#..#', '.##.'],
  'Ò': ['.#..', '.##.', '#..#', '#..#', '#..#', '#..#', '.##.'],
  'Ö': ['#..#', '.##.', '#..#', '#..#', '#..#', '#..#', '.##.'],
  'Ú': ['..#.', '#..#', '#..#', '#..#', '#..#', '#..#', '.##.'],
  'Ü': ['#..#', '....', '#..#', '#..#', '#..#', '#..#', '.##.'],
  'Ñ': ['.#.#', '#.#.', '#..#', '##.#', '#.##', '#..#', '#..#'],
  '¿': ['....', '..#.', '....', '..#.', '.#..', '#...', '#..#', '.##.'],
  '¡': ['.', '.', '#', '.', '#', '#', '#', '#', '#'],
  '«': ['.....', '.....', '..#.#', '.#.#.', '#.#..', '.#.#.', '..#.#'],
  '»': ['.....', '.....', '#.#..', '.#.#.', '..#.#', '.#.#.', '#.#..'],
  '€': ['..###', '.#...', '####.', '.#...', '####.', '.#...', '..###'],
  '\u00a0': ['...', '...', '...', '...', '...', '...', '...'],
  '\u202f': ['..', '..', '..', '..', '..', '..', '..'],
};

export const FONT_H = 9;       // glyph cell height incl. descenders
export const BASELINE = 7;     // rows above baseline
export const LINE_H = 11;

// The bold: every stroke two pixels thick — a glyph drawn twice, a pixel apart. Where that
// would close a one-pixel gap (the legs of an m, a w’s teeth), the letter is redrawn by hand
// here; the few others get the gap’s column doubled first; signs with such gaps stay as they are.
const GB = {
  '0': ['.####.', '##..##', '##.###', '##..##', '###.##', '##..##', '.####.'],
  'K': ['##.##', '##.##', '####.', '###..', '####.', '##.##', '##.##'],
  'M': ['##...##', '###.###', '##.#.##', '##.#.##', '##...##', '##...##', '##...##'],
  'N': ['##..##', '###.##', '###.##', '##.###', '##.###', '##..##', '##..##'],
  'V': ['##..##', '##..##', '##..##', '##..##', '.####.', '.####.', '..##..'],
  'W': ['##...##', '##...##', '##...##', '##.#.##', '##.#.##', '###.###', '##...##'],
  'X': ['##..##', '##..##', '.####.', '..##..', '.####.', '##..##', '##..##'],
  'Y': ['##..##', '##..##', '.####.', '..##..', '..##..', '..##..', '..##..'],
  'j': ['..##', '....', '..##', '..##', '..##', '..##', '..##', '#.##', '.##.'],
  'k': ['##...', '##...', '##.##', '####.', '###..', '####.', '##.##'],
  'm': ['.......', '.......', '######.', '##.#.##', '##.#.##', '##.#.##', '##.#.##'],
  'r': ['....', '....', '##.#', '###.', '##..', '##..', '##..'],
  'v': ['......', '......', '##..##', '##..##', '.####.', '.####.', '..##..'],
  'w': ['.......', '.......', '##...##', '##...##', '##.#.##', '##.#.##', '.##.##.'],
  'î': ['.##.', '#..#', '....', '.##.', '.##.', '.##.', '.##.'],
  'ï': ['#..#', '....', '.##.', '.##.', '.##.', '.##.', '.##.'],
  'œ': ['........', '........', '.##.###.', '##.##.##', '##.#####', '##.##...', '.##.####'],
  'æ': ['........', '........', '.######.', '...##.##', '.#######', '##.##...', '.###.###'],
  'ñ': ['.##.#', '#.##.', '####.', '##.##', '##.##', '##.##', '##.##'],
  'Ñ': ['.##..#', '#..##.', '##..##', '###.##', '##.###', '##..##', '##..##'],
};
function boldRows(ch, rows, w) {
  if (GB[ch]) return GB[ch];
  if (!rows.some((r) => r.includes('#'))) return rows;          // (a space stays a space)
  const pad = rows.map((r) => r.padEnd(w, '.')), gap = new Array(w).fill(false);
  for (const r of pad) for (let i = 1; i < w - 1; i++) if (r[i] === '.' && r[i - 1] === '#' && r[i + 1] === '#') gap[i] = true;
  if (gap.includes(true) && !/[\p{L}\p{N}]/u.test(ch)) return rows;
  return pad.map((r) => {
    let wide = '', out = '';
    for (let i = 0; i < w; i++) wide += r[i] + (gap[i] ? r[i] : '');
    for (let i = 0; i <= wide.length; i++) out += wide[i] === '#' || wide[i - 1] === '#' ? '#' : '.';
    return out;
  });
}

const glyphs = {};
let atlas = null, atlasB = null;
const tinted = new Map();

function build() {
  // Normalize rows & compute the two atlases’ layouts (regular: w at x · bold: bw at bx)
  let x = 0, bx = 0;
  for (const ch of Object.keys(G)) {
    const rows = G[ch];
    const w = Math.max(...rows.map((r) => r.length));
    const brows = boldRows(ch, rows, w), bw = Math.max(...brows.map((r) => r.length));
    glyphs[ch] = { w, x, rows, bw, bx, brows };
    x += w + 1; bx += bw + 1;
  }
  const paint = (width, rowsOf, xOf) => {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = FONT_H;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(c.width, c.height);
    for (const ch of Object.keys(glyphs)) {
      const g = glyphs[ch];
      rowsOf(g).forEach((row, y) => {
        for (let i = 0; i < row.length; i++) {
          if (row[i] === '#') {
            const p = (y * c.width + xOf(g) + i) * 4;
            img.data[p] = img.data[p + 1] = img.data[p + 2] = 255;
            img.data[p + 3] = 255;
          }
        }
      });
    }
    ctx.putImageData(img, 0, 0);
    return c;
  };
  atlas = paint(x, (g) => g.rows, (g) => g.x);
  atlasB = paint(bx, (g) => g.brows, (g) => g.bx);
}

function atlasFor(color, bold = false) {
  if (!atlas) build();
  const key = bold ? 'b' + color : color, src = bold ? atlasB : atlas;
  let c = tinted.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    const cx = c.getContext('2d');
    cx.drawImage(src, 0, 0);
    cx.globalCompositeOperation = 'source-in';
    cx.fillStyle = color;
    cx.fillRect(0, 0, c.width, c.height);
    tinted.set(key, c);
  }
  return c;
}

const ACCENTS = /[̀-ͯ]/g;
// (asked for every glyph drawn: characters without a glyph of their own are looked up once)
const NORM = new Map();
function normChar(ch) {
  if (glyphs[ch] || G[ch]) return ch;
  let n = NORM.get(ch);
  if (n === undefined) { n = normSlow(ch); NORM.set(ch, n); }
  return n;
}
function normSlow(ch) {
  const plain = ch.normalize('NFD').replace(ACCENTS, '');
  if (G[plain]) return plain;
  if (ch === '’' || ch === '‘') return "'";
  if (ch === '“' || ch === '”') return '"';
  if (ch === '—' || ch === '–') return '-';
  return '?';
}

export function glyphWidth(ch) {
  if (!atlas) build();
  return glyphs[normChar(ch)].w;
}

// The {key} mark’s colour beside a text of colour `base`: a strong warm ink where the text is
// dark (paper panels), a bright gold where it is light (dark panels, text over the world)
const KEY_INK = '#a8420f', KEY_GOLD = '#ffcf4a';
const KEY_OF = new Map();
export function keyColor(base) {
  let c = KEY_OF.get(base);
  if (c) return c;
  const s = String(base || '');
  let rgb = null;
  if (s[0] === '#') { const h = s.length < 6 ? s.slice(1).replace(/./g, '$&$&') : s.slice(1); rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); }
  else { const m = s.match(/[\d.]+/g); if (m && m.length >= 3) rgb = m.slice(0, 3).map(Number); }
  const light = rgb ? (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255 : 0;
  c = light > 0.6 ? KEY_GOLD : KEY_INK;
  KEY_OF.set(base, c);
  return c;
}

// Parse "{gold}text{/}" tags into segments [{text,color,bold}]
export function parseRich(text, baseColor, bold = false) {
  const segs = [];
  const stack = [{ color: baseColor, bold }];
  let buf = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') {
      const end = text.indexOf('}', i);
      if (end > i) {
        const tag = text.slice(i + 1, end), top = stack[stack.length - 1];
        if (buf) { segs.push({ text: buf, color: top.color, bold: top.bold }); buf = ''; }
        if (tag === '/') { if (stack.length > 1) stack.pop(); }
        else if (tag === 'key') stack.push({ color: keyColor(baseColor), bold: true });
        else stack.push({ color: tag.startsWith('#') ? tag : COLORS[tag] || baseColor, bold: top.bold });
        i = end;
        continue;
      }
    }
    buf += ch;
  }
  if (buf) { const top = stack[stack.length - 1]; segs.push({ text: buf, color: top.color, bold: top.bold }); }
  return segs;
}

export function stripTags(text) {
  return String(text).replace(/\{[^}]*\}/g, '');
}

// (bold: the whole text is; a {key} mark inside it counts by itself)
export function measure(text, scale = 1, bold = false) {
  if (!atlas) build();
  text = String(text);
  let w = 0, max = 0;
  if (!bold && text.indexOf('{key}') < 0) {
    for (const ch of stripTags(text)) {
      if (ch === '\n') { max = Math.max(max, w); w = 0; continue; }
      w += glyphs[normChar(ch)].w + 1;
    }
  } else for (const seg of parseRich(text, null, bold)) {
    for (const ch of seg.text) {
      if (ch === '\n') { max = Math.max(max, w); w = 0; continue; }
      const g = glyphs[normChar(ch)];
      w += (seg.bold ? g.bw : g.w) + 1;
    }
  }
  max = Math.max(max, w);
  return Math.max(0, max - 1) * scale;
}

// Draw text. opts: { color, shadow (color|false), outline, align: 'left'|'center'|'right', scale,
// maxChars, bold (the whole text) }. Returns width drawn.
export function drawText(ctx, text, x, y, opts = {}) {
  if (!atlas) build();
  const { color = COLORS.ink, shadow = null, align = 'left', scale = 1, maxChars = Infinity, outline = null, bold = false } = opts;
  text = String(text);
  const w = measure(text, scale, bold);
  let cx = Math.round(align === 'center' ? x - w / 2 : align === 'right' ? x - w : x);
  const cy = Math.round(y);
  if (outline) {
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      drawRun(ctx, text, cx + ox * scale, cy + oy * scale, outline, scale, maxChars, true, bold);
    }
  }
  if (shadow) drawRun(ctx, text, cx, cy + scale, shadow, scale, maxChars, true, bold);
  drawRun(ctx, text, cx, cy, color, scale, maxChars, false, bold);
  return w;
}

function drawRun(ctx, text, x, y, color, scale, maxChars, flat, bold) {
  const segs = parseRich(text, color, bold);
  let cx = x, count = 0;
  for (const seg of segs) {
    const img = atlasFor(flat ? color : seg.color, seg.bold);
    for (const ch of seg.text) {
      if (count >= maxChars) return;
      count++;
      if (ch === '\n') continue;
      const g = glyphs[normChar(ch)], gx = seg.bold ? g.bx : g.x, gw = seg.bold ? g.bw : g.w;
      ctx.drawImage(img, gx, 0, gw, FONT_H, cx, y, gw * scale, FONT_H * scale);
      cx += (gw + 1) * scale;
    }
  }
}

// Lines cut out of one rich text: a tag left open at the end of a line is closed there and
// opened again on the next (colours and the {key} mark carry across line breaks). `open`: the
// tags already open before the first line.
export function carryTags(lines, open = []) {
  open = open.slice();
  return lines.map((l) => {
    const pre = open.map((g) => `{${g}}`).join('');
    for (const m of l.matchAll(/\{([^}]*)\}/g)) { if (m[1] === '/') open.pop(); else open.push(m[1]); }
    return pre + l + '{/}'.repeat(open.length);
  });
}

// Word-wrap text (tags preserved) into lines that fit maxWidth.
export function wrap(text, maxWidth, scale = 1) {
  const out = [], open = [];
  let pre = '';                         // the tags open where the line being built starts
  const push = (line) => {
    for (const m of line.matchAll(/\{([^}]*)\}/g)) { if (m[1] === '/') open.pop(); else open.push(m[1]); }
    out.push(pre + line + '{/}'.repeat(open.length));
    pre = open.map((g) => `{${g}}`).join('');
  };
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const test = line ? line + ' ' + word : word;
      if (!line || measure(pre + test, scale) <= maxWidth) line = test;
      else { push(line); line = word; }
    }
    push(line);
  }
  return out;
}

// Cut a rich text after n visible characters: never inside a tag, what is open closed again.
export function cutRich(text, n) {
  text = String(text);
  let out = '', count = 0;
  const open = [];                      // where each open tag starts in `out`
  for (let i = 0; i < text.length && count < n; i++) {
    if (text[i] === '{') {
      const end = text.indexOf('}', i);
      if (end > i) {
        if (text.slice(i + 1, end) === '/') { if (open.length) { open.pop(); out += '{/}'; } } else { open.push(out.length); out += text.slice(i, end + 1); }
        i = end;
        continue;
      }
    }
    const ch = String.fromCodePoint(text.codePointAt(i));
    out += ch; count++;
    if (ch.length > 1) i++;
  }
  // (a mark opened after the last letter kept: gone)
  while (open.length && out.endsWith('}') && out.lastIndexOf('{') === open[open.length - 1]) out = out.slice(0, open.pop());
  return out + '{/}'.repeat(open.length);
}

export function visibleLength(text) {
  return [...stripTags(text)].length;
}
