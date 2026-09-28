// The app's icon, drawn in code like everything in Hearthlight: a lit lantern on a night-blue
// tile, 32×32 pixels scaled up to 1024 — written to desktop/build/icon.png for electron-builder.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const here = path.dirname(fileURLToPath(import.meta.url));
const PAL = { '.': null, k: '#241a2e', n: '#2c2448', N: '#3a3060', b: '#8a5234', B: '#5a3422', g: '#ffd66b', G: '#fff3c4', o: '#f08a3a', w: '#fff8e8', h: '#c89a3a' };
// (a lantern: handle, cap, glass with its flame, base — with a warm halo)
const ART = [
  '................................',
  '................................',
  '..............kkkk..............',
  '.............k....k.............',
  '.............k....k.............',
  '...........kkkkkkkkkk...........',
  '..........khhhhhhhhhhk..........',
  '.........kBbbbbbbbbbbBk.........',
  '.........kkkkkkkkkkkkkk.........',
  '..........kgGGGGGGGGgk..........',
  '..........kgGGGwwGGGgk..........',
  '..........kgGGwwwwGGgk..........',
  '..........kgGGwoowGGgk..........',
  '..........kgGwoooowGgk..........',
  '..........kgGwoggowGgk..........',
  '..........kgGwoggowGgk..........',
  '..........kgGGwoowGGgk..........',
  '..........kgGGGwwGGGgk..........',
  '..........kgGGGGGGGGgk..........',
  '..........kggggggggggk..........',
  '.........kkkkkkkkkkkkkk.........',
  '.........kBbbbbbbbbbbBk.........',
  '..........khhhhhhhhhhk..........',
  '...........kkkkkkkkkk...........',
  '................................',
];
const S = 32, SCALE = 32, W = S * SCALE;
const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const px = new Uint8Array(S * S * 4);
for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
  // the tile: rounded night blue, a glow round the lantern
  const cx = x - 15.5, cy = y - 16, d = Math.hypot(cx, cy * 1.1), edge = Math.max(Math.abs(x - 15.5), Math.abs(y - 15.5));
  const corner = Math.hypot(Math.max(0, Math.abs(x - 15.5) - 11), Math.max(0, Math.abs(y - 15.5) - 11)) > 4.6;
  let c = corner ? null : edge > 15 ? PAL.k : d < 7 ? '#5a4a78' : d < 10 ? PAL.N : PAL.n;
  const a = ART[y - 2] && ART[y - 2][x];
  if (a && a !== '.' && !corner) c = PAL[a];
  const o = (y * S + x) * 4;
  if (c) { const [r, g, b] = hex(c); px[o] = r; px[o + 1] = g; px[o + 2] = b; px[o + 3] = 255; }
}
// scale up, crisp
const raw = Buffer.alloc((W * 4 + 1) * W);
for (let y = 0; y < W; y++) {
  raw[y * (W * 4 + 1)] = 0;
  for (let x = 0; x < W; x++) { const s = ((y / SCALE | 0) * S + (x / SCALE | 0)) * 4, d = y * (W * 4 + 1) + 1 + x * 4; raw[d] = px[s]; raw[d + 1] = px[s + 1]; raw[d + 2] = px[s + 2]; raw[d + 3] = px[s + 3]; }
}
const crc = (buf) => { let c = ~0; for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(W, 4); ihdr[8] = 8; ihdr[9] = 6;
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
fs.mkdirSync(path.join(here, '../build'), { recursive: true });
fs.writeFileSync(path.join(here, '../build/icon.png'), png);
console.log(`icon: desktop/build/icon.png (${W}×${W}, ${Math.round(png.length / 1024)} KiB)`);
