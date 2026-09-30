// Illustrated abilities: every move, special, ultimate, talent and weapon has
// a little 16×16 pixel icon. Each glyph is drawn with a few canvas shapes on
// a tiny canvas, then snapped to crisp pixels (no half-transparent edges),
// outlined and shaded, and framed in its school's colours. No image files —
// and no Three.js either: the phone draws the very same icons.

export const SCHOOLS = {
  phys: { a: '#8a7a70', b: '#4a3d38', rim: '#c9b8a8', ink: '#f4eadc' },
  fire: { a: '#d8602a', b: '#7a2418', rim: '#ffb04a', ink: '#ffe9a0' },
  frost: { a: '#4a8ad8', b: '#1f3a78', rim: '#9fdcff', ink: '#e8f8ff' },
  nature: { a: '#5aa860', b: '#24522e', rim: '#b8e68a', ink: '#eaffd0' },
  arcane: { a: '#8a5ad0', b: '#3a2068', rim: '#d0a8ff', ink: '#f4e8ff' },
  holy: { a: '#e0b03a', b: '#8a5e14', rim: '#fff3a6', ink: '#fffbe0' },
  shadow: { a: '#5a3a78', b: '#1e1428', rim: '#b88cf0', ink: '#eadcff' },
  storm: { a: '#d0b83a', b: '#5a4a14', rim: '#fff7a0', ink: '#ffffff' },
  song: { a: '#e07aa8', b: '#6a2a4a', rim: '#ffc0dc', ink: '#fff0f6' },
};

// ------------------------------------------------------------------ the glyphs
// (g: a 2D context on a 16×16 canvas; c: { m: main, l: light, d: dark })
const P = Math.PI;
function poly(g, pts, col) { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); }
function circ(g, x, y, r, col) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, P * 2); g.fill(); }
function line(g, x1, y1, x2, y2, w, col) { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
function arc(g, x, y, r, a0, a1, w, col) { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.arc(x, y, r, a0, a1); g.stroke(); }
function box(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(x, y, w, h); }
function star(g, x, y, r1, r2, n, col, rot = -P / 2) { const pts = []; for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r2 : r1, a = rot + (i / (n * 2)) * P * 2; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } poly(g, pts, col); }

const GLYPHS = {
  // weapons
  pan: (g, c) => { line(g, 1.8, 14.2, 6.6, 9.4, 2.4, '#8a5a36'); circ(g, 10, 6, 5.2, c.m); circ(g, 10, 6, 4, c.d); circ(g, 10.4, 6.4, 2.6, '#fff7ee'); circ(g, 10.8, 6.8, 1.2, '#ffc93a'); },
  sword: (g, c) => { poly(g, [[13, 2], [14, 3], [6, 11], [5, 10]], c.l); line(g, 4, 9, 8, 13, 2, c.d); line(g, 3.5, 12.5, 2, 14, 2.2, c.m); },
  hammer: (g, c) => { line(g, 4, 14, 9, 7, 2, c.d); poly(g, [[6, 3], [11, 1], [15, 6], [10, 9]], c.m); poly(g, [[7, 3.5], [11, 2], [12, 3.5], [8, 5]], c.l); },
  rollingpin: (g, c) => { line(g, 2, 12, 14, 4, 4.2, c.m); line(g, 4, 10.5, 12, 5, 1.2, c.l); circ(g, 1.8, 12.6, 1.4, c.d); circ(g, 14.2, 3.4, 1.4, c.d); },
  wand: (g, c) => { line(g, 3, 14, 10, 7, 1.8, c.d); star(g, 11, 5, 4.4, 1.9, 5, c.m); circ(g, 11, 5, 1, c.l); },
  staff: (g, c) => { line(g, 4, 15, 11, 5, 1.8, c.d); circ(g, 12, 4, 3, c.m); circ(g, 11.2, 3.2, 1.1, c.l); arc(g, 12, 4, 4, P * 0.8, P * 1.9, 1, c.l); },
  orb: (g, c) => { circ(g, 8, 8, 5.6, c.m); circ(g, 6.3, 6.2, 1.8, c.l); arc(g, 8, 8, 4, P * 0.1, P * 0.7, 1, c.d); box(g, 5, 13, 6, 2, c.d); },
  book: (g, c) => { poly(g, [[2, 4], [8, 5.5], [14, 4], [14, 13], [8, 14], [2, 13]], c.m); line(g, 8, 5.5, 8, 14, 1, c.d); line(g, 4, 7, 6.5, 7.6, 0.8, c.l); line(g, 4, 9.5, 6.5, 10, 0.8, c.l); star(g, 11, 9, 2.2, 1, 4, c.l); },
  slingshot: (g, c) => { line(g, 8, 15, 8, 9, 2, c.d); line(g, 8, 9, 4, 3, 2, c.d); line(g, 8, 9, 12, 3, 2, c.d); arc(g, 8, 4, 4, P * 0.15, P * 0.85, 1, c.l); circ(g, 8, 7.5, 1.6, c.m); },
  bow: (g, c) => { arc(g, 3, 8, 9, -P / 2.6, P / 2.6, 2, c.m); line(g, 6.5, 0.8, 6.5, 15.2, 0.8, c.l); line(g, 2, 8, 14, 8, 1.2, c.d); poly(g, [[15, 8], [12, 6], [12, 10]], c.l); },
  boomerang: (g, c) => { poly(g, [[2, 5], [5, 3], [10, 9], [14, 4], [15, 7], [10, 13]], c.m); line(g, 4, 5, 9.5, 10.5, 1, c.l); },
  dart: (g, c) => { line(g, 2, 14, 12, 4, 1.4, c.d); poly(g, [[14, 2], [10.5, 3.5], [12.5, 5.5]], c.l); poly(g, [[2, 14], [2, 11], [5, 13]], c.m); poly(g, [[2, 14], [5, 14], [3, 11]], c.m); },
  lute: (g, c) => { circ(g, 6, 10.5, 4.2, c.m); circ(g, 6, 10.5, 1.4, c.d); line(g, 8, 8, 14, 2, 1.8, c.d); box(g, 12.5, 1, 2.5, 2.5, c.l); },
  drum: (g, c) => { box(g, 3, 6, 10, 7, c.m); poly(g, [[3, 6], [13, 6], [13, 7.5], [3, 7.5]], c.l); line(g, 3, 9, 13, 12, 0.8, c.d); line(g, 3, 12, 13, 9, 0.8, c.d); line(g, 10, 1, 14, 5, 1.2, c.d); },
  flute: (g, c) => { line(g, 2, 13, 14, 3, 2.2, c.m); for (const k of [0.3, 0.5, 0.7]) circ(g, 2 + 12 * k, 13 - 10 * k, 0.6, c.d); line(g, 13, 2, 15, 1, 1, c.l); },
  harp: (g, c) => { line(g, 3, 14, 3, 3, 2.4, c.d); arc(g, 9, 9, 7, P * 1.05, P * 1.75, 2.4, c.m); line(g, 3, 14, 13, 14, 2, c.m); line(g, 13, 14, 13, 5, 1.6, c.m); for (const x of [5.5, 7.5, 9.5, 11.5]) line(g, x, 5 + Math.abs(x - 8) * 0.6, x, 13, 0.7, c.l); },
  // moves & schools
  shield: (g, c) => { poly(g, [[2, 3], [8, 1], [14, 3], [13, 10], [8, 15], [3, 10]], c.m); poly(g, [[8, 3], [12, 4.5], [11.5, 9.5], [8, 13]], c.l); line(g, 8, 2, 8, 14, 1, c.d); },
  whirl: (g, c) => { arc(g, 8, 8, 6, 0, P * 1.4, 2, c.m); arc(g, 8, 8, 3.5, P, P * 2.4, 2, c.l); circ(g, 8, 8, 1.2, c.d); },
  tornado: (g, c) => { line(g, 2, 2, 14, 2, 2.2, c.m); line(g, 3.5, 5.5, 12.5, 5.5, 2, c.l); line(g, 5, 9, 11, 9, 1.8, c.m); line(g, 6.5, 12, 9.5, 12, 1.6, c.l); circ(g, 8, 14.5, 1, c.m); },
  quake: (g, c) => { poly(g, [[1, 13], [15, 13], [15, 15], [1, 15]], c.d); line(g, 8, 13, 6, 9, 1.4, c.l); line(g, 6, 9, 9, 6, 1.4, c.l); line(g, 9, 6, 7, 2, 1.4, c.l); arc(g, 8, 13, 6, P * 1.1, P * 1.9, 1.2, c.m); },
  shock: (g, c) => { arc(g, 8, 9, 6.5, P * 1.05, P * 1.95, 1.6, c.m); arc(g, 8, 9, 4, P * 1.05, P * 1.95, 1.6, c.l); circ(g, 8, 10, 2, c.m); box(g, 1, 12, 14, 2, c.d); },
  flame: (g, c) => { poly(g, [[8, 1], [12, 6], [13, 10], [11, 14], [5, 14], [3, 10], [4, 7], [6, 8]], c.m); poly(g, [[8, 6], [10, 9], [10, 12], [8, 13.5], [6, 12], [6.5, 10]], c.l); },
  snow: (g, c) => { for (let i = 0; i < 3; i++) { const a = (i * P) / 3; line(g, 8 - Math.cos(a) * 6.5, 8 - Math.sin(a) * 6.5, 8 + Math.cos(a) * 6.5, 8 + Math.sin(a) * 6.5, 1.5, c.l); } circ(g, 8, 8, 2, c.m); },
  bolt: (g, c) => { poly(g, [[10, 1], [3, 9], [7.5, 9], [5, 15], [13, 6], [8.5, 6]], c.m); poly(g, [[9, 3], [5.5, 8], [8, 8]], c.l); },
  chain: (g, c) => { poly(g, [[3, 1], [7, 5], [5, 6], [10, 10], [8, 11], [13, 15], [6, 11.5], [8, 10.5], [2, 6.5], [4.5, 5.5]], c.m); },
  star: (g, c) => { star(g, 8, 8.5, 7, 3, 5, c.m); star(g, 8, 8.5, 3.2, 1.4, 5, c.l); },
  comet: (g, c) => { line(g, 2, 14, 10, 6, 3.2, c.d); line(g, 3, 13, 10, 6, 1.4, c.l); circ(g, 11, 5, 3.4, c.m); circ(g, 10.2, 4.2, 1.2, c.l); },
  meteor: (g, c) => { poly(g, [[1, 1], [9, 6], [6, 9]], c.d); circ(g, 9.5, 9.5, 4.4, c.m); circ(g, 8.5, 8.5, 1.6, c.l); box(g, 2, 14, 12, 1.5, c.d); },
  sparkles: (g, c) => { star(g, 5, 5, 4, 1.2, 4, c.m, 0); star(g, 11, 10, 4.5, 1.3, 4, c.l, 0); star(g, 12, 3, 2, 0.6, 4, c.m, 0); },
  acorn: (g, c) => { poly(g, [[3, 6], [13, 6], [12, 11], [8, 15], [4, 11]], c.m); poly(g, [[2, 6], [14, 6], [12, 3], [4, 3]], c.d); line(g, 8, 3, 9, 0.5, 1.2, c.d); circ(g, 6, 9, 1, c.l); },
  pinecone: (g, c) => { poly(g, [[8, 1], [13, 7], [11, 13], [8, 15], [5, 13], [3, 7]], c.m); for (const [x, y] of [[8, 5], [6, 8], [10, 8], [8, 11]]) line(g, x - 1.8, y, x + 1.8, y + 1, 0.8, c.d); },
  arrow: (g, c) => { line(g, 2, 14, 12, 4, 1.2, c.d); poly(g, [[15, 1], [10, 3], [13, 6]], c.m); poly(g, [[2, 14], [1.5, 10.5], [4, 12]], c.l); poly(g, [[2, 14], [5.5, 14.5], [4, 12]], c.l); },
  arrows: (g, c) => { for (const k of [-3, 0, 3]) { line(g, 2 + k, 14, 11 + k, 5, 1, c.d); poly(g, [[13 + k, 3], [9 + k, 4.5], [11.5 + k, 7]], c.m); } },
  crosshair: (g, c) => { arc(g, 8, 8, 5.5, 0, P * 2, 1.4, c.m); line(g, 8, 0.5, 8, 5, 1.2, c.l); line(g, 8, 11, 8, 15.5, 1.2, c.l); line(g, 0.5, 8, 5, 8, 1.2, c.l); line(g, 11, 8, 15.5, 8, 1.2, c.l); circ(g, 8, 8, 1.2, c.m); },
  bomb: (g, c) => { circ(g, 7, 10, 5, c.m); circ(g, 5.5, 8.5, 1.5, c.l); line(g, 10, 5.5, 12.5, 2.5, 1.4, c.d); star(g, 13.5, 1.8, 2.4, 0.8, 4, c.l, 0); },
  burst: (g, c) => { star(g, 8, 8, 7.5, 3.5, 8, c.m); star(g, 8, 8, 4, 2, 8, c.l); },
  dash: (g, c) => { for (const [y, w] of [[4, 8], [8, 11], [12, 7]]) line(g, 14 - w, y, 14, y, 1.8, y === 8 ? c.l : c.m); circ(g, 3.5, 8, 2.2, c.m); },
  boot: (g, c) => { poly(g, [[4, 1], [9, 1], [9, 9], [14, 11], [14, 14], [3, 14]], c.m); box(g, 4, 3, 5, 1.5, c.l); line(g, 1, 6, 3, 6, 1, c.l); line(g, 0.5, 9, 2.5, 9, 1, c.l); },
  wing: (g, c) => { poly(g, [[2, 12], [4, 5], [9, 1], [15, 1], [12, 5], [14, 6], [10, 9], [12, 10], [6, 13]], c.m); line(g, 4, 11, 11, 3, 1, c.l); },
  feather: (g, c) => { poly(g, [[13, 1], [15, 3], [6, 13], [3, 13], [3, 10]], c.m); line(g, 2, 14, 13, 3, 1, c.d); line(g, 6, 9, 9, 9, 0.8, c.l); },
  note: (g, c) => { line(g, 11, 2, 11, 11, 1.4, c.d); poly(g, [[11, 2], [15, 4], [15, 6], [11, 4]], c.m); circ(g, 8.5, 12, 3, c.m); circ(g, 7.7, 11.2, 1, c.l); },
  notes: (g, c) => { line(g, 6, 3, 6, 11, 1.2, c.d); line(g, 13, 1, 13, 9, 1.2, c.d); line(g, 6, 3, 13, 1, 1.8, c.m); circ(g, 4, 11.5, 2.4, c.m); circ(g, 11, 9.5, 2.4, c.m); circ(g, 3.4, 11, 0.8, c.l); },
  heart: (g, c) => { circ(g, 5.5, 6, 3.5, c.m); circ(g, 10.5, 6, 3.5, c.m); poly(g, [[2.2, 7.3], [13.8, 7.3], [8, 14]], c.m); circ(g, 5, 5, 1.2, c.l); },
  cross: (g, c) => { box(g, 6, 2, 4, 12, c.m); box(g, 2, 6, 12, 4, c.m); box(g, 7, 3, 1.5, 10, c.l); },
  pillar: (g, c) => { poly(g, [[5, 0], [11, 0], [12, 15], [4, 15]], c.m); poly(g, [[7, 0], [9, 0], [9.5, 15], [6.5, 15]], c.l); star(g, 8, 13, 3, 1, 4, c.l, 0); },
  dome: (g, c) => { arc(g, 8, 13, 6.5, P, P * 2, 2.2, c.m); arc(g, 8, 13, 4, P * 1.1, P * 1.9, 1, c.l); box(g, 1, 13, 14, 2, c.d); star(g, 8, 9.5, 2, 0.8, 4, c.l, 0); },
  skull: (g, c) => { circ(g, 8, 7, 5.5, c.m); box(g, 5, 10, 6, 4, c.m); circ(g, 6, 7, 1.5, c.d); circ(g, 10, 7, 1.5, c.d); box(g, 6.5, 12, 1, 2, c.d); box(g, 8.5, 12, 1, 2, c.d); },
  eye: (g, c) => { poly(g, [[1, 8], [5, 4], [11, 4], [15, 8], [11, 12], [5, 12]], c.m); circ(g, 8, 8, 2.8, c.d); circ(g, 8.8, 7.2, 0.9, c.l); },
  fist: (g, c) => { box(g, 3, 5, 10, 8, c.m); for (const x of [3, 5.5, 8, 10.5]) box(g, x, 4, 2, 2, c.l); box(g, 1, 8, 3, 4, c.m); box(g, 3, 13, 10, 2, c.d); },
  clock: (g, c) => { circ(g, 8, 8, 6.5, c.m); circ(g, 8, 8, 5, c.l); line(g, 8, 8, 8, 4, 1.2, c.d); line(g, 8, 8, 11, 9.5, 1.2, c.d); },
  crown: (g, c) => { poly(g, [[2, 12], [2, 4], [5, 8], [8, 3], [11, 8], [14, 4], [14, 12]], c.m); box(g, 2, 12, 12, 2, c.d); circ(g, 8, 9, 1.2, c.l); },
  drop: (g, c) => { poly(g, [[8, 1], [12, 8], [8, 14], [4, 8]], c.m); circ(g, 8, 10, 4, c.m); circ(g, 6.6, 9, 1.2, c.l); },
  leaf: (g, c) => { poly(g, [[2, 14], [3, 7], [8, 3], [14, 2], [13, 8], [9, 13]], c.m); line(g, 2, 14, 11, 5, 1, c.l); },
  moon: (g, c) => { circ(g, 8, 8, 6.5, c.m); circ(g, 11, 6, 5.5, 'rgba(0,0,0,1)'); },
  sun: (g, c) => { for (let i = 0; i < 8; i++) { const a = (i / 8) * P * 2; line(g, 8 + Math.cos(a) * 4, 8 + Math.sin(a) * 4, 8 + Math.cos(a) * 7, 8 + Math.sin(a) * 7, 1.2, c.l); } circ(g, 8, 8, 4, c.m); },
  spiral: (g, c) => { g.strokeStyle = c.m; g.lineWidth = 1.6; g.beginPath(); for (let i = 0; i <= 40; i++) { const a = i * 0.4, r = 0.4 + i * 0.16; const x = 8 + Math.cos(a) * r, y = 8 + Math.sin(a) * r; if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); },
  magnet: (g, c) => { arc(g, 8, 7, 5, P, 0, 3, c.m); box(g, 1.5, 7, 3, 6, c.m); box(g, 11.5, 7, 3, 6, c.m); box(g, 1.5, 11, 3, 2, c.l); box(g, 11.5, 11, 3, 2, c.l); },
  gem: (g, c) => { poly(g, [[4, 2], [12, 2], [15, 6], [8, 15], [1, 6]], c.m); poly(g, [[4, 2], [8, 6], [1, 6]], c.l); poly(g, [[8, 6], [15, 6], [8, 15]], c.d); },
  target: (g, c) => { circ(g, 8, 8, 6.5, c.m); circ(g, 8, 8, 4.5, c.l); circ(g, 8, 8, 2.5, c.m); circ(g, 8, 8, 1, c.l); },
  rune: (g, c) => { poly(g, [[8, 1], [14, 8], [8, 15], [2, 8]], c.m); line(g, 8, 4, 8, 12, 1.2, c.l); line(g, 5.5, 7, 10.5, 9, 1.2, c.l); },
  paw: (g, c) => { circ(g, 8, 10.5, 3.6, c.m); for (const [x, y] of [[3.5, 6], [6.5, 3.5], [9.5, 3.5], [12.5, 6]]) circ(g, x, y, 1.7, c.m); },
  // the phone's menus & the map (Phone v6)
  bag: (g, c) => { arc(g, 8, 5.5, 3.2, P, P * 2, 1.6, c.d); poly(g, [[2, 6], [14, 6], [15, 14.5], [1, 14.5]], c.m); poly(g, [[2, 6], [14, 6], [13.5, 9.5], [2.5, 9.5]], c.l); box(g, 6.8, 8.6, 2.4, 2.4, '#ffd66b'); },
  pet: (g, c) => { poly(g, [[1.5, 1], [6.5, 4.5], [2.5, 8]], c.m); poly(g, [[14.5, 1], [9.5, 4.5], [13.5, 8]], c.m); poly(g, [[2.6, 2.6], [5, 4.6], [3, 6]], c.d); poly(g, [[13.4, 2.6], [11, 4.6], [13, 6]], c.d); circ(g, 8, 9, 5.6, c.m); poly(g, [[2.4, 9.5], [8, 15], [13.6, 9.5], [8, 12]], c.l); box(g, 4.8, 7.6, 1.6, 1.8, c.d); box(g, 9.6, 7.6, 1.6, 1.8, c.d); box(g, 7.2, 12.2, 1.6, 1.3, c.d); },
  map: (g, c) => { poly(g, [[1, 3], [5.5, 1.5], [5.5, 13.5], [1, 15]], c.m); poly(g, [[5.5, 1.5], [10.5, 3], [10.5, 15], [5.5, 13.5]], c.l); poly(g, [[10.5, 3], [15, 1.5], [15, 13.5], [10.5, 15]], c.m); for (const [x, y] of [[2.5, 11.5], [4.2, 9.6], [6.4, 8.8], [8.6, 9.4]]) box(g, x, y, 1.3, 1.3, c.d); line(g, 11, 5, 14, 8, 1.5, '#d8483a'); line(g, 14, 5, 11, 8, 1.5, '#d8483a'); },
  horseshoe: (g, c) => { arc(g, 8, 7.5, 5, 0, P, 3.2, c.m); box(g, 1.4, 2, 3.2, 6, c.m); box(g, 11.4, 2, 3.2, 6, c.m); box(g, 1.4, 1.2, 3.2, 1.6, c.d); box(g, 11.4, 1.2, 3.2, 1.6, c.d); for (const [x, y] of [[2.5, 5], [12.5, 5], [3.4, 10.5], [11.6, 10.5], [8, 12.6]]) box(g, x, y, 1, 1, c.d); arc(g, 8, 7.5, 5.2, 0.35, 1.3, 1, c.l); },
  armory: (g, c) => { poly(g, [[1, 4], [6, 2], [11, 4], [10.2, 10], [6, 14], [1.8, 10]], c.m); poly(g, [[6, 4], [9.5, 5], [9, 9.5], [6, 12.3]], c.l); poly(g, [[14.2, 0.8], [15.2, 1.8], [8.2, 9.8], [7.2, 8.8]], '#eef4ff'); line(g, 6.2, 8.2, 9.8, 11.8, 1.6, c.d); line(g, 7.2, 11.2, 4.8, 13.6, 1.8, '#a07040'); },
  shirt: (g, c) => { poly(g, [[5, 2], [11, 2], [15, 5], [13, 8.5], [11.5, 7.5], [11.5, 14], [4.5, 14], [4.5, 7.5], [3, 8.5], [1, 5]], c.m); poly(g, [[6, 2], [10, 2], [9, 4.2], [7, 4.2]], c.d); box(g, 5.5, 9, 5, 1.3, c.l); },
  campfire: (g, c) => { line(g, 2, 14, 13, 10.5, 2.2, '#8a5a36'); line(g, 3, 10.5, 14, 14, 2.2, '#6b4330'); poly(g, [[8, 1], [11.5, 5.5], [12, 9], [10, 12], [6, 12], [4, 9], [4.5, 6], [6.5, 7]], c.m); poly(g, [[8, 5.5], [10, 8.5], [9.5, 11], [6.5, 11], [6.2, 9]], c.l); },
  bike: (g, c) => { arc(g, 4, 11, 3.3, 0, P * 2, 1.7, c.l); arc(g, 12, 11, 3.3, 0, P * 2, 1.7, c.l); line(g, 4, 11, 7, 6, 1.6, c.m); line(g, 7, 6, 11, 6, 1.6, c.m); line(g, 11, 6, 12, 11, 1.6, c.m); line(g, 7, 6, 8.5, 11, 1.6, c.m); line(g, 8.5, 11, 4, 11, 1.6, c.m); line(g, 10.2, 3.6, 12.6, 3.6, 1.6, c.d); line(g, 5.4, 4.6, 8.4, 4.6, 1.8, c.d); },
  buoy: (g, c) => { g.lineCap = 'butt'; g.lineWidth = 3.4; g.strokeStyle = c.l; g.beginPath(); g.arc(8, 8, 5, 0, P * 2); g.stroke(); g.strokeStyle = c.m; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(8, 8, 5, (i * P) / 2 + P / 4 - 0.45, (i * P) / 2 + P / 4 + 0.45); g.stroke(); } },
  door: (g, c) => { box(g, 1.5, 1, 9, 14, c.d); box(g, 2.5, 2, 7, 12.5, c.m); box(g, 3.5, 3, 5, 5, c.l); circ(g, 8, 9, 0.9, '#ffd66b'); line(g, 9, 9, 13.5, 9, 1.8, '#8fe08a'); poly(g, [[15.6, 9], [12, 5.6], [12, 12.4]], '#8fe08a'); },
  cog: (g, c) => { for (let i = 0; i < 8; i++) { const a = (i * P) / 4; line(g, 8 + Math.cos(a) * 4, 8 + Math.sin(a) * 4, 8 + Math.cos(a) * 6.6, 8 + Math.sin(a) * 6.6, 2.6, c.m); } circ(g, 8, 8, 4.8, c.m); circ(g, 8, 8, 2, 'rgba(0,0,0,1)'); circ(g, 6.4, 6.4, 0.8, c.l); },
  people: (g, c) => { circ(g, 11, 4.2, 2.6, c.m); poly(g, [[7, 13.5], [7.5, 9], [11, 7.6], [14.5, 9], [15, 13.5]], c.m); circ(g, 5, 5.2, 2.6, c.l); poly(g, [[1, 14.5], [1.5, 10], [5, 8.6], [8.5, 10], [9, 14.5]], c.l); },
  flag: (g, c) => { line(g, 3, 15, 3, 1.5, 1.6, c.d); poly(g, [[3.5, 2], [14, 3.5], [11, 6.5], [14, 9.5], [3.5, 9]], c.m); poly(g, [[3.5, 2], [14, 3.5], [12.5, 5], [3.5, 4]], c.l); },
  camera: (g, c) => { box(g, 1, 5, 14, 9, c.m); box(g, 3.5, 3, 4.5, 2.5, c.m); circ(g, 8.5, 9.5, 3.5, c.d); circ(g, 8.5, 9.5, 2.1, c.l); circ(g, 7.7, 8.7, 0.7, '#ffffff'); box(g, 12, 6.5, 2, 1.3, '#ffd66b'); },
  waystone: (g, c) => { poly(g, [[4.5, 14.5], [3.5, 5], [5.5, 1.5], [10.5, 1.5], [12.5, 5], [11.5, 14.5]], c.m); line(g, 8, 4.5, 8, 11.5, 1.5, c.l); line(g, 6, 6.5, 10, 9, 1.3, c.l); box(g, 1.5, 13.5, 13, 2, c.d); },
  globe: (g, c) => { circ(g, 8, 8, 6.6, c.m); poly(g, [[4, 4], [7.5, 3], [8, 6], [6, 8], [6.5, 11], [4, 12], [2.5, 8]], c.l); poly(g, [[10, 7], [13, 6], [13.5, 10], [11, 12.5], [10, 10]], c.l); arc(g, 8, 8, 6, P * 1.15, P * 1.45, 1, '#ffffff'); },
  info: (g, c) => { circ(g, 8, 8, 6.8, c.m); box(g, 7, 7, 2, 5.5, c.l); box(g, 5.8, 12, 4.4, 1.3, c.l); box(g, 5.8, 7, 2, 1.3, c.l); circ(g, 8, 4.5, 1.3, c.l); },
  close: (g, c) => { line(g, 4, 4, 12, 12, 2.8, c.m); line(g, 12, 4, 4, 12, 2.8, c.m); },
  menu: (g, c) => { for (const y of [3.5, 8, 12.5]) line(g, 2.5, y, 13.5, y, 2.4, c.m); },
  // an envelope with a heart on it: inviting friends
  invite: (g, c) => { box(g, 1, 4.5, 13.5, 10, c.d); box(g, 2, 5.5, 11.5, 8, c.m); poly(g, [[2, 5.5], [7.75, 10.5], [13.5, 5.5]], c.l); line(g, 2.2, 5.7, 7.75, 10.4, 1, c.d); line(g, 13.3, 5.7, 7.75, 10.4, 1, c.d); circ(g, 11.3, 2.9, 1.9, '#ec5f73'); circ(g, 14.1, 2.9, 1.9, '#ec5f73'); poly(g, [[9.5, 3.4], [15.9, 3.4], [12.7, 7.2]], '#ec5f73'); },
  // (Release v9) the Lamplighter, the Gardener, the Cook and the Tinkerer
  lantern: (g, c) => { line(g, 2, 15, 9, 4, 1.6, '#8a5a36'); line(g, 9, 4, 12, 4, 1.4, c.d); box(g, 10.5, 5, 4, 5, c.d); box(g, 11, 5.6, 3, 3.8, c.m); box(g, 11.6, 6.2, 1.2, 2, c.l); box(g, 10, 4.2, 5, 1.2, c.d); },
  flare: (g, c) => { star(g, 8, 8, 7, 2.2, 8, c.m, 0); star(g, 8, 8, 4.2, 1.6, 8, c.l, P / 8); circ(g, 8, 8, 2, '#ffffff'); },
  beacon: (g, c) => { line(g, 5, 15, 5, 4, 1.8, '#8a5a36'); line(g, 5, 3.5, 10, 3.5, 1.4, c.d); box(g, 8.5, 4.5, 4, 5, c.d); box(g, 9, 5.1, 3, 3.8, c.m); arc(g, 10.5, 7, 4.6, -P * 0.35, P * 0.35, 1, c.l); arc(g, 10.5, 7, 6.4, -P * 0.25, P * 0.25, 0.8, c.l); },
  seed: (g, c) => { poly(g, [[8, 2.5], [11.5, 7], [11, 11.5], [8, 13.5], [5, 11.5], [4.5, 7]], c.m); poly(g, [[8, 4], [9.6, 7], [9, 10], [8, 11]], c.l); line(g, 8, 2.5, 8, 1, 1.2, c.d); },
  vine: (g, c) => { arc(g, 6, 11, 4, -P * 0.9, P * 0.1, 1.8, c.d); arc(g, 10, 5, 4, P * 0.1, P * 1.1, 1.8, c.d); poly(g, [[3, 5], [6, 3], [6, 6]], c.m); poly(g, [[13, 11], [10, 13], [10, 10]], c.m); poly(g, [[11, 1], [14, 2], [12, 4]], c.l); },
  sprout: (g, c) => { box(g, 5, 9, 6, 6, c.d); box(g, 6, 10, 4, 4, '#8a5a36'); line(g, 8, 10, 8, 5, 1.4, c.m); poly(g, [[8, 6], [3, 4], [2, 1.5], [6, 2.5]], c.m); poly(g, [[8, 5], [13, 3], [14, 0.8], [10, 1.5]], c.l); },
  whisk: (g, c) => { line(g, 2, 15, 6.5, 10.5, 2, '#8a5a36'); for (const k of [-0.5, 0, 0.5]) { g.strokeStyle = c.m; g.lineWidth = 1.1; g.beginPath(); g.ellipse(10, 6, 2.4 + Math.abs(k) * 1.6, 5.4, P / 4 + k * 0.5, 0, P * 2); g.stroke(); } circ(g, 6.8, 10.2, 1.2, c.d); },
  tart: (g, c) => { poly(g, [[1.5, 10], [14.5, 10], [13, 14], [3, 14]], c.d); poly(g, [[2, 9.5], [14, 9.5], [12.6, 12.6], [3.4, 12.6]], '#d9a45a'); poly(g, [[3.5, 9.5], [8, 5], [12.5, 9.5]], c.m); circ(g, 8, 4.5, 1.4, '#ec5f73'); line(g, 5, 8.2, 11, 8.2, 0.8, c.l); },
  wrench: (g, c) => { line(g, 3, 13, 10, 6, 2.6, c.m); circ(g, 11.5, 4.5, 3.4, c.m); poly(g, [[11.5, 4.5], [15, 1], [15.5, 4.5]], 'rgba(0,0,0,1)'); circ(g, 3, 13, 1.6, c.d); line(g, 4.5, 11.5, 9, 7, 0.8, c.l); },
  spring: (g, c) => { for (let i = 0; i < 4; i++) { const y = 12.5 - i * 2.6; line(g, 3, y, 13, y - 1.3, 1.4, i % 2 ? c.l : c.m); } box(g, 2, 13, 12, 2, c.d); box(g, 4, 1.5, 8, 2, '#ec5f73'); },
  kettle: (g, c) => { poly(g, [[3, 14], [13, 14], [12, 7], [4, 7]], c.m); box(g, 6, 5, 4, 2, c.d); circ(g, 8, 4.2, 1.1, c.l); line(g, 12, 9, 15, 6.5, 1.6, c.m); arc(g, 8, 8.5, 5.5, P * 1.15, P * 1.85, 1.2, c.d); line(g, 5, 9, 5, 12.5, 1, c.l); },
  torch: (g, c) => { line(g, 4, 15, 9, 7, 2, '#8a5a36'); poly(g, [[10, 1], [13, 4.5], [12.5, 8], [9.5, 9.5], [7.5, 7.5], [8, 4]], c.m); poly(g, [[10.3, 3.5], [11.7, 5.5], [11, 7.6], [9.4, 7.4], [9.2, 5.5]], c.l); },
  mirror: (g, c) => { line(g, 3, 15, 6.5, 11, 2.2, '#8a5a36'); circ(g, 9.5, 6.5, 5, c.d); circ(g, 9.5, 6.5, 3.8, c.m); line(g, 7.8, 5, 9.2, 3.6, 1.2, '#ffffff'); },
  can: (g, c) => { poly(g, [[4, 14], [11, 14], [11, 6], [4, 6]], c.m); arc(g, 7.5, 6, 3.6, P, 0, 1.4, c.d); line(g, 11, 11, 15, 5, 1.6, c.m); box(g, 14, 3.5, 2, 2.4, c.l); box(g, 5, 8, 2, 4, c.l); },
  shears: (g, c) => { line(g, 4, 12, 12, 2, 1.8, c.l); line(g, 5, 2.5, 11.5, 11, 1.8, c.l); circ(g, 3.5, 12.8, 2.2, c.m); circ(g, 12.5, 12.2, 2.2, c.m); circ(g, 8.2, 7, 1, c.d); },
  rake: (g, c) => { line(g, 3, 15, 11, 4, 1.8, '#8a5a36'); line(g, 7, 1.5, 15, 7.5, 1.6, c.m); for (let i = 0; i < 4; i++) line(g, 8 + i * 2, 2.2 + i * 1.5, 7 + i * 2, 4.6 + i * 1.5, 1.1, c.l); },
  puffer: (g, c) => { poly(g, [[2, 11], [8, 7], [8, 14]], c.d); circ(g, 9, 10.5, 3.6, c.m); for (const [x, y, r] of [[13, 6, 1.6], [11, 3, 1.2], [14.5, 2.5, 1]]) circ(g, x, y, r, c.l); },
  ladle: (g, c) => { line(g, 3, 2, 9, 10, 1.8, c.m); circ(g, 10.5, 11.5, 3.6, c.m); circ(g, 10.5, 11.5, 2.4, c.d); circ(g, 10, 11, 1, '#e8b070'); },
  spatula: (g, c) => { line(g, 2, 15, 7.5, 9.5, 2, '#8a5a36'); poly(g, [[7, 9], [9, 3], [14, 1.5], [13.5, 7]], c.m); line(g, 9.5, 6.5, 12.5, 4, 0.9, c.d); line(g, 9, 8, 12.8, 6.4, 0.9, c.d); },
  pepper: (g, c) => { poly(g, [[5, 15], [11, 15], [10, 6], [6, 6]], c.m); circ(g, 8, 5, 2.4, c.d); box(g, 7.2, 1.5, 1.6, 2.5, c.l); for (const [x, y] of [[12.5, 4], [14, 7], [13, 1.5]]) box(g, x, y, 1.2, 1.2, '#3b2a22'); },
  rivet: (g, c) => { poly(g, [[2, 9], [9, 6], [10, 10], [3, 13]], c.m); box(g, 9, 6.5, 3, 3.5, c.d); line(g, 4, 13, 5, 15, 2, c.d); poly(g, [[12, 7.5], [15.5, 7.2], [15.5, 9], [12, 9.3]], c.l); },
  toolbox: (g, c) => { box(g, 1.5, 7, 13, 7, c.m); box(g, 1.5, 7, 13, 2, c.d); arc(g, 8, 7, 3, P, 0, 1.4, c.d); box(g, 7, 9.5, 2, 2, c.l); },
  pause: (g, c) => { box(g, 3.5, 2.5, 3.2, 11, c.m); box(g, 9.3, 2.5, 3.2, 11, c.m); },
  play: (g, c) => { poly(g, [[4, 2.5], [13.5, 8], [4, 13.5]], c.m); },
  screen: (g, c) => { box(g, 1, 2, 14, 10, c.d); box(g, 2, 3, 12, 8, c.m); box(g, 3, 4, 4, 3, c.l); box(g, 10, 4, 3, 2, c.l); box(g, 6, 12, 4, 1.5, c.d); box(g, 4, 13.5, 8, 1.5, c.d); },
  plus: (g, c) => { box(g, 6.4, 2.2, 3.2, 11.6, c.m); box(g, 2.2, 6.4, 11.6, 3.2, c.m); },
  // (the chat's speech bubble)
  chat: (g, c) => { poly(g, [[1.5, 2.5], [14.5, 2.5], [14.5, 11], [7.5, 11], [3.5, 14.5], [4.5, 11], [1.5, 11]], c.m); box(g, 4.2, 6, 1.8, 1.8, c.d); box(g, 7.1, 6, 1.8, 1.8, c.d); box(g, 10, 6, 1.8, 1.8, c.d); },
  minus: (g, c) => { box(g, 2.2, 6.4, 11.6, 3.2, c.m); },
};
export const GLYPH_IDS = Object.keys(GLYPHS);

// each glyph's own colours [main, light, dark] (metal, wood, flame, ice…); the school tints the frame
const COL = {
  pan: ['#8a8a9a', '#dcdce8', '#3a3a48'], sword: ['#a07040', '#eef4ff', '#8a6a3a'], hammer: ['#9a9aaa', '#e4e4f0', '#8a5a36'],
  rollingpin: ['#e8c890', '#fff3d8', '#a8743a'], wand: ['#ffd66b', '#fffbe0', '#8a5a36'], staff: ['#8fb7ff', '#ffffff', '#7a5230'],
  orb: ['#b88cf0', '#ffffff', '#5a3a8a'], book: ['#9a3a4a', '#fff3c4', '#3a1a24'], slingshot: ['#c8864a', '#e8d6b4', '#6b4330'],
  bow: ['#b0783a', '#ece4d4', '#6b4330'], boomerang: ['#d8a060', '#fff0d0', '#8a5a2a'], dart: ['#8fd67a', '#e0ffd0', '#6b4330'],
  lute: ['#d08a4a', '#ffd8a0', '#6b3a20'], drum: ['#c8454f', '#fff3e0', '#6a2a2a'], flute: ['#c8a868', '#fff0d0', '#5a3a20'],
  harp: ['#e0b03a', '#fff8d0', '#8a5e14'], shield: ['#8a9ab8', '#e8f0ff', '#3a4a68'], whirl: ['#e0e4f4', '#ffffff', '#7a80a0'],
  tornado: ['#d0dcf0', '#ffffff', '#7080a8'], quake: ['#c8a878', '#fff0c8', '#5a4030'], shock: ['#ffd66b', '#fffbe0', '#8a6a2a'],
  flame: ['#ff8a2a', '#ffe066', '#a02a10'], snow: ['#a8dcff', '#ffffff', '#3a7ac8'], bolt: ['#ffe04a', '#ffffff', '#b08a10'],
  chain: ['#ffe04a', '#fffbd0', '#8a6a10'], star: ['#ffd66b', '#fffbe0', '#b8862a'], comet: ['#ffcf6a', '#fffbe0', '#ff7a2a'],
  meteor: ['#e0602a', '#ffd06a', '#5a2a20'], sparkles: ['#fff3a6', '#ffffff', '#d0a82a'], acorn: ['#c8864a', '#f0c890', '#6b4330'],
  pinecone: ['#a0683a', '#d8a868', '#4a2a1a'], arrow: ['#e8e8f0', '#ffffff', '#8a6a4a'], arrows: ['#e8e8f0', '#ffffff', '#8a6a4a'],
  crosshair: ['#ff6a6a', '#ffffff', '#8a2a2a'], bomb: ['#5a4a68', '#ffd66b', '#8a6a4a'], burst: ['#ffb040', '#fff3a6', '#c83a1a'],
  dash: ['#b8e0ff', '#ffffff', '#5a8ab8'], boot: ['#a0643a', '#e8b880', '#5a3420'], wing: ['#f4f4ff', '#ffffff', '#a0a8c8'],
  feather: ['#8fd6b4', '#e0fff0', '#3a8a6a'], note: ['#f59ac8', '#ffe0f0', '#8a3a6a'], notes: ['#f59ac8', '#ffe0f0', '#8a3a6a'],
  heart: ['#ec5f73', '#ffc0cc', '#8a2a3a'], cross: ['#8fe08a', '#e8ffe0', '#3a8a3a'], pillar: ['#ffe68a', '#ffffff', '#c8a03a'],
  dome: ['#ffd66b', '#fffbe0', '#8a6a2a'], skull: ['#e8e0d0', '#ffffff', '#2a2030'], eye: ['#e8f0ff', '#ffffff', '#3a5a8a'],
  fist: ['#e8b890', '#ffe0c8', '#8a5a3a'], clock: ['#c8a868', '#fff8e0', '#5a3a20'], crown: ['#ffd66b', '#fffbe0', '#b8862a'],
  drop: ['#8fe06a', '#e8ffd0', '#3a8a2a'], leaf: ['#6fc05a', '#c8f0a0', '#2a6a2a'], moon: ['#d8e0ff', '#ffffff', '#6a70a0'],
  sun: ['#ffd040', '#fff8c0', '#e08a1a'], spiral: ['#d0a8ff', '#ffffff', '#6a3aa8'], magnet: ['#e04848', '#ffffff', '#8a2020'],
  gem: ['#7ad0ff', '#e8fbff', '#2a6a9a'], target: ['#ec5f73', '#ffffff', '#8a2a3a'], rune: ['#b88cf0', '#f0e0ff', '#5a3a8a'],
  paw: ['#c8a080', '#f0d8c0', '#6a4a3a'],
  bag: ['#b07b50', '#d8a870', '#5a3a28'], pet: ['#e8803a', '#fff7ee', '#2a2433'], map: ['#e8d0a0', '#fff0cc', '#8a5a36'], horseshoe: ['#b8bcc8', '#ffffff', '#4a4a5a'], armory: ['#5a7ab8', '#9fc0ec', '#3a3028'],
  shirt: ['#b07ad0', '#e8c8ff', '#5a3478'], campfire: ['#ff8a2a', '#ffe066', '#a02a10'], bike: ['#ff7a4a', '#eef0f8', '#3a3048'],
  buoy: ['#e04848', '#fff7ee', '#8a2020'], door: ['#b07b50', '#e0a870', '#5a3a28'], cog: ['#b8b8c8', '#ffffff', '#5a5a6a'],
  people: ['#6a8ac8', '#f0a0b0', '#2a3a58'], invite: ['#f3e3c3', '#fff8ea', '#8e5d3e'], flag: ['#ec5f73', '#ffc0cc', '#6b4330'], camera: ['#7a7a8a', '#9fdcff', '#2a2a38'],
  waystone: ['#9a94a8', '#9fdcff', '#5a5466'], globe: ['#3a7cae', '#7cc464', '#1f3a58'], info: ['#5a8ad0', '#ffffff', '#2a3a68'],
  close: ['#fff7ee', '#ffffff', '#8a2020'], menu: ['#fff7ee', '#ffffff', '#5a4a60'], pause: ['#fff7ee', '#ffffff', '#5a4a60'],
  lantern: ['#ffc94a', '#fff3c4', '#3b2a2e'], flare: ['#ffe066', '#fffbe0', '#e0a526'], beacon: ['#ffc94a', '#fff3c4', '#3b2a2e'],
  seed: ['#c8a060', '#f0d8a0', '#6b4330'], vine: ['#6fc05a', '#c8f0a0', '#2a6a2a'], sprout: ['#6fc05a', '#b8f08a', '#3b2a22'],
  whisk: ['#dcdce8', '#ffffff', '#6a6571'], tart: ['#ffb3bf', '#fff3e0', '#6b4330'], wrench: ['#a8a4b0', '#e8e8f0', '#4a4652'],
  spring: ['#c8c4d0', '#ffffff', '#4a4652'], kettle: ['#c8804a', '#ffe0b0', '#6b4330'], torch: ['#ff8a2a', '#ffe066', '#a02a10'],
  mirror: ['#bfe8ff', '#ffffff', '#8a5a36'], can: ['#6fa8c8', '#d8f0ff', '#2a4a68'], shears: ['#c8454f', '#e8e8f0', '#3b2a2e'],
  rake: ['#a8a4b0', '#e8e8f0', '#6b4330'], puffer: ['#e0c050', '#fff3a6', '#8a5a36'], ladle: ['#c8c4d0', '#ffffff', '#4a4652'],
  spatula: ['#a8a4b0', '#e8e8f0', '#4a4652'], pepper: ['#8a5a36', '#e8c890', '#3b2a22'], rivet: ['#8a8492', '#e0e0ea', '#3b3844'],
  toolbox: ['#c8454f', '#ffd66b', '#6a2a2a'], play: ['#fff7ee', '#ffffff', '#5a4a60'], screen: ['#5a8ad0', '#fff3c4', '#2a2433'], plus: ['#fff7ee', '#ffffff', '#5a4a60'], minus: ['#fff7ee', '#ffffff', '#5a4a60'],
  chat: ['#fff7ee', '#ffffff', '#3f6a7a'],
};

// ------------------------------------------------------------------ painting
const cache = new Map();
const OUT = '#1c1424';

function canvas(w, h) {
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
  return c;
}

// the glyph, snapped to pixels and outlined (16×16, transparent around)
function glyphCanvas(id) {
  const key = 'g:' + id;
  if (cache.has(key)) return cache.get(key);
  const c = canvas(16, 16), g = c.getContext('2d');
  // (an id from the network: only the glyphs we have)
  const draw = Object.hasOwn(GLYPHS, id) ? GLYPHS[id] : GLYPHS.star;
  const [m, l, d] = Object.hasOwn(COL, id) ? COL[id] : COL.star;
  draw(g, { m, l, d });
  const img = g.getImageData(0, 0, 16, 16), D = img.data;
  const solid = new Uint8Array(256);
  for (let i = 0; i < 256; i++) solid[i] = D[i * 4 + 3] > 110 ? 1 : 0;
  // pure black in a glyph means "cut out" (the moon's bite)
  for (let i = 0; i < 256; i++) if (solid[i] && D[i * 4] < 12 && D[i * 4 + 1] < 12 && D[i * 4 + 2] < 12) solid[i] = 0;
  const out = g.createImageData(16, 16), O = out.data;
  const [or, og, ob] = [0x1c, 0x14, 0x24];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const i = y * 16 + x, o = i * 4;
    if (solid[i]) { O[o] = D[o]; O[o + 1] = D[o + 1]; O[o + 2] = D[o + 2]; O[o + 3] = 255; continue; }
    // a one-pixel outline around the shape
    const n = (x > 0 && solid[i - 1]) || (x < 15 && solid[i + 1]) || (y > 0 && solid[i - 16]) || (y < 15 && solid[i + 16]);
    if (n) { O[o] = or; O[o + 1] = og; O[o + 2] = ob; O[o + 3] = 255; }
  }
  g.clearRect(0, 0, 16, 16);
  g.putImageData(out, 0, 0);
  cache.set(key, c);
  return c;
}

// the whole icon: 18×18 — a frame in the school's colours, a gradient, the glyph
function iconCanvas(id, school) {
  const key = 'i:' + id + ':' + school;
  if (cache.has(key)) return cache.get(key);
  const sc = SCHOOLS[school] || SCHOOLS.phys;
  const c = canvas(18, 18), g = c.getContext('2d');
  g.fillStyle = OUT; g.fillRect(0, 0, 18, 18);
  g.fillStyle = sc.rim; g.fillRect(1, 1, 16, 16);
  // a deep background in the school's colour (so the glyph pops), lit from the top left
  for (let y = 0; y < 14; y++) {
    const k = y / 13;
    g.fillStyle = mix(mix(sc.a, '#140c1c', 0.35), mix(sc.b, '#0c0810', 0.45), k);
    g.fillRect(2, 2 + y, 14, 1);
  }
  g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(2, 2, 14, 1); g.fillRect(2, 2, 1, 14);
  g.drawImage(glyphCanvas(id), 1, 1);
  cache.set(key, c);
  return c;
}

function hex(c) { if (c[0] === '#') return parseInt(c.slice(1), 16); const m = /(\d+),(\d+),(\d+)/.exec(c); return (+m[1] << 16) | (+m[2] << 8) | +m[3]; }
function mix(a, b, k) {
  const pa = hex(a), pb = hex(b);
  const ch = (s) => Math.round(((pa >> s) & 255) * (1 - k) + ((pb >> s) & 255) * k);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

// Just the glyph (16×16 × s, outlined, transparent around) — the phone's menu tiles & buttons
export function drawGlyph(ctx, id, x, y, s = 1) {
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(glyphCanvas(id), Math.round(x), Math.round(y), 16 * s, 16 * s);
  ctx.imageSmoothingEnabled = prev;
}

// A round version for the phone's buttons: the glyph (× s) on a disc of radius r
// in the school's colours, crisp to the pixel (the same row-by-row disc as the pad's).
export function roundIcon(icon, r, s = 2) {
  const ic = icon || { g: 'star', s: 'phys' };
  const key = 'r:' + ic.g + ':' + ic.s + ':' + r + ':' + s;
  if (cache.has(key)) return cache.get(key);
  const sc = SCHOOLS[ic.s] || SCHOOLS.phys, d = r * 2 + 1;
  const c = canvas(d, d), g = c.getContext('2d');
  const half = (y) => Math.floor(Math.sqrt(r * r - y * y + r * 0.8));
  for (let y = -r; y <= r; y++) {
    g.fillStyle = mix(mix(sc.a, '#140c1c', 0.2), mix(sc.b, '#0c0810', 0.4), (y + r) / (2 * r));
    g.fillRect(r - half(y), r + y, half(y) * 2 + 1, 1);
  }
  g.fillStyle = 'rgba(255,255,255,0.16)';
  for (let y = -r + 2; y < -r * 0.2; y++) { const w = Math.floor(Math.sqrt(r * r - y * y) * 0.7); g.fillRect(r - w, r + y, w, 1); }
  // the glyph, kept inside the disc
  g.save();
  g.beginPath();
  for (let y = -r; y <= r; y++) g.rect(r - half(y), r + y, half(y) * 2 + 1, 1);
  g.clip();
  g.imageSmoothingEnabled = false;
  const gs = 16 * s, o = r - Math.floor(gs / 2) + (s > 1 ? 0 : 1);
  g.drawImage(glyphCanvas(ic.g), o, o, gs, gs);
  g.restore();
  cache.set(key, c);
  return c;
}

// Draw an icon (18×18 × s) at (x, y). Options:
//   cd: 0..1 of a cooldown still to go (a dark wipe from the top, with a bright edge)
//   dim: not learned / not available (dark & greyed)
//   glow: ready to unleash (a pulsing golden rim) — pass the time in `t`
//   rank / max: little pips along the bottom (talents)
export function drawIcon(ctx, icon, x, y, { s = 1, cd = 0, dim = false, glow = false, t = 0, rank = null, max = null } = {}) {
  const ic = icon || { g: 'star', s: 'phys' };
  x = Math.round(x); y = Math.round(y);
  const c = iconCanvas(ic.g, ic.s);
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(c, x, y, 18 * s, 18 * s);
  ctx.imageSmoothingEnabled = prev;
  if (dim) { ctx.fillStyle = 'rgba(28,20,36,0.62)'; ctx.fillRect(x + s, y + s, 16 * s, 16 * s); }
  if (cd > 0) {
    const h = Math.round(16 * s * Math.min(1, cd));
    ctx.fillStyle = 'rgba(16,10,24,0.66)'; ctx.fillRect(x + s, y + s, 16 * s, h);
    ctx.fillStyle = 'rgba(255,243,196,0.7)'; ctx.fillRect(x + s, y + s + h, 16 * s, s);
  }
  if (glow) {
    const on = Math.floor(t * 6) % 2;
    ctx.fillStyle = on ? '#fff3a6' : '#ffd66b';
    ctx.fillRect(x - s, y - s, 20 * s, s); ctx.fillRect(x - s, y + 18 * s, 20 * s, s);
    ctx.fillRect(x - s, y - s, s, 20 * s); ctx.fillRect(x + 18 * s, y - s, s, 20 * s);
  }
  if (max) {
    for (let i = 0; i < max; i++) {
      const px = x + 18 * s - (max - i) * 3 * s - s, py = y + 18 * s - 3 * s;
      ctx.fillStyle = OUT; ctx.fillRect(px - s, py - s, 3 * s, 3 * s);
      ctx.fillStyle = i < (rank || 0) ? '#ffd66b' : '#5a4a60'; ctx.fillRect(px, py, s, s);
    }
  }
}
