// Render the big Party Mode world to a PNG (1 px per tile) for layout checks:
//   node tools/bigmap.mjs [out.png] [seed]
//   node tools/bigmap.mjs out.png - --crop x0,z0,x1,z1 [--scale 6]
//     (a close-up: n px per tile, a grid line every 10 tiles, places as white dots)
import fs from 'node:fs';
import zlib from 'node:zlib';
import { generateBig } from '../src/world/big/gen.js';
import { TT } from '../src/world/tiles.js';
import { BIG } from '../src/world/big/layout.js';

const out = process.argv[2] || 'screenshots/bigmap.png';
const seed = +(process.argv[3] && process.argv[3] !== '-' ? process.argv[3] : BIG.SEED);
const argOf = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const m = generateBig(seed);
console.log('generated in', m.ms, 'ms');

const C = {
  [TT.GRASS]: '#6eaf58', [TT.MEADOW]: '#7dba5c', [TT.FOREST]: '#2f6a45', [TT.PATH]: '#c9a36c', [TT.PLAZA]: '#b3adb3',
  [TT.SAND]: '#e9cf9b', [TT.WATER]: '#3a7cae', [TT.PLANK_H]: '#b07b50', [TT.PLANK_V]: '#b07b50', [TT.SOIL]: '#744d36', [TT.ROCK]: '#8a858e',
  [TT.FIELD]: '#d9b45a', [TT.HILL]: '#8fc46a', [TT.SNOW]: '#eef3fb', [TT.ICE]: '#a9cdec', [TT.LEAVES]: '#c8703a',
  [TT.MARSH]: '#5f7a45', [TT.PETALS]: '#8fc47a', [TT.DUNE]: '#f0cf82', [TT.MESA]: '#b8583a', [TT.CANYON]: '#d88a5a',
  [TT.BASALT]: '#4a4048', [TT.LAVA]: '#ff6a2a', [TT.ASH]: '#8a8488', [TT.OBSIDIAN]: '#2a2032', [TT.MYCEL]: '#7a5aa8',
  [TT.GLACIER]: '#bfe0f6', [TT.CREVASSE]: '#2c4a7a', [TT.BOG]: '#4a4a32', [TT.RUINS]: '#b8b0a0', [TT.CLOUD]: '#ffffff',
  [TT.SKY]: '#b8d4f4', [TT.STEPPE]: '#d9c46a', [TT.HEATH]: '#9a8a9a', [TT.CORAL]: '#4ac8d0',
  [TT.ARENA]: '#e6ca94', [TT.JUNGLE]: '#2f6e3c', [TT.TAR]: '#1e1824',
  [TT.BAMBOO]: '#a8b45a', [TT.PADDY]: '#6aa888', [TT.SALT]: '#f0e8ee', [TT.AUTUMN]: '#c8503a', [TT.ROOTS]: '#46643a',
  [TT.MOOR]: '#5a4a58', [TT.CRYSTAL]: '#c4b4ec', [TT.COBBLE]: '#9a949c', [TT.METAL]: '#b8924a', [TT.TUNDRA]: '#8a9a8c', [TT.UMBRAL]: '#2a1c3a',
  [TT.CRAG]: '#7a7480', [TT.SINTER]: '#e4d6c0',
};
const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const px = Buffer.alloc(m.W * m.H * 3);
for (let i = 0; i < m.W * m.H; i++) {
  const c = rgb(C[m.ground[i]] || '#ff00ff'), e = m.elev[i];
  // (relief: the higher, the lighter; a dark line along each cliff's foot)
  const k = (1 + Math.max(0, e - 1) * 0.07) * (i >= m.W && m.elev[i - m.W] > e ? 0.62 : 1);
  px[i * 3] = Math.min(255, c[0] * k); px[i * 3 + 1] = Math.min(255, c[1] * k); px[i * 3 + 2] = Math.min(255, c[2] * k);
}
// valley outline
for (let x = 0; x < 240; x++) for (const z of [0, 127]) { const i = (z - m.Z0) * m.W + (x - m.X0); px[i * 3] = 255; px[i * 3 + 1] = 255; px[i * 3 + 2] = 255; }
for (let z = 0; z < 128; z++) for (const x of [0, 239]) { const i = (z - m.Z0) * m.W + (x - m.X0); px[i * 3] = 255; px[i * 3 + 1] = 255; px[i * 3 + 2] = 255; }

function png(w, h, rgbBuf) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgbBuf.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  const crcT = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; }
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const crop = argOf('--crop');
if (crop) {
  const [x0, z0, x1, z1] = crop.split(',').map(Number), S = +(argOf('--scale') || 6), w = (x1 - x0) * S, h = (z1 - z0) * S, cp = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const tx = x0 + Math.floor(x / S), tz = z0 + Math.floor(y / S), i = (tz - m.Z0) * m.W + (tx - m.X0), o = (y * w + x) * 3;
    const inb = tx >= m.X0 && tz >= m.Z0 && tx < m.X0 + m.W && tz < m.Z0 + m.H;
    const grid = (tx % 10 === 0 && x % S === 0) || (tz % 10 === 0 && y % S === 0);
    for (let c = 0; c < 3; c++) cp[o + c] = inb ? (grid ? px[i * 3 + c] * 0.7 : px[i * 3 + c]) : 0;
  }
  for (const q of m.pois || []) {
    const cx = Math.round((q.x - x0) * S), cz = Math.round((q.z - z0) * S);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = cx + dx, Y = cz + dy; if (X >= 0 && Y >= 0 && X < w && Y < h) { const o = (Y * w + X) * 3; cp[o] = 255; cp[o + 1] = 255; cp[o + 2] = 255; } }
  }
  fs.writeFileSync(out, png(w, h, cp));
  console.log('wrote', out, w + 'x' + h);
  process.exit(0);
}
fs.writeFileSync(out, png(m.W, m.H, px));
console.log('wrote', out, m.W + 'x' + m.H, 'carved', m.carved.length);
