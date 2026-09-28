// Canvas & pixel helpers used by the procedural art modules.
import { hexToRgb } from './color.js';

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  c.ctx = ctx;
  return c;
}

// Build a sprite from rows of characters. `map` maps chars -> hex color.
// '.' and ' ' are transparent.
export function fromGrid(rows, map, target = null, ox = 0, oy = 0) {
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const c = target || makeCanvas(w, h);
  const ctx = c.getContext('2d');
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const col = map[ch];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
  return c;
}

export function flipH(src) {
  const c = makeCanvas(src.width, src.height);
  c.ctx.translate(src.width, 0);
  c.ctx.scale(-1, 1);
  c.ctx.drawImage(src, 0, 0);
  return c;
}

// Pixel buffer wrapper for fast per-pixel procedural drawing.
export class PixelBuffer {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.data = new Uint8ClampedArray(w * h * 4);
  }
  set(x, y, hex, a = 255) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const [r, g, b] = typeof hex === 'string' ? hexToRgbCached(hex) : hex;
    const i = (y * this.w + x) * 4;
    if (a >= 255) {
      this.data[i] = r; this.data[i + 1] = g; this.data[i + 2] = b; this.data[i + 3] = 255;
    } else {
      const t = a / 255, ia = this.data[i + 3] / 255;
      const oa = t + ia * (1 - t);
      if (oa <= 0) return;
      this.data[i] = (r * t + this.data[i] * ia * (1 - t)) / oa;
      this.data[i + 1] = (g * t + this.data[i + 1] * ia * (1 - t)) / oa;
      this.data[i + 2] = (b * t + this.data[i + 2] * ia * (1 - t)) / oa;
      this.data[i + 3] = oa * 255;
    }
  }
  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    const i = (y * this.w + x) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }
  alpha(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.data[(y * this.w + x) * 4 + 3];
  }
  rect(x, y, w, h, hex, a) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, hex, a);
  }
  toCanvas() {
    const c = makeCanvas(this.w, this.h);
    const img = new ImageData(this.data, this.w, this.h);
    c.ctx.putImageData(img, 0, 0);
    return c;
  }
  // Add a 1px outline around opaque pixels (only on transparent neighbors).
  outline(hex, { diagonal = false, onlyBelow = false } = {}) {
    const src = new Uint8ClampedArray(this.data);
    const A = (x, y) => (x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : src[(y * this.w + x) * 4 + 3]);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (A(x, y) > 0) continue;
      let n = onlyBelow ? A(x, y - 1) : A(x - 1, y) || A(x + 1, y) || A(x, y - 1) || A(x, y + 1);
      if (!n && diagonal) n = A(x - 1, y - 1) || A(x + 1, y - 1) || A(x - 1, y + 1) || A(x + 1, y + 1);
      if (n) this.set(x, y, hex);
    }
  }
}

const rgbCache = new Map();
export function hexToRgbCached(hex) {
  let v = rgbCache.get(hex);
  if (!v) { v = hexToRgb(hex); rgbCache.set(hex, v); }
  return v;
}

// Draw a filled ellipse into a PixelBuffer (pixel-perfect).
export function ellipse(buf, cx, cy, rx, ry, hex) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) buf.set(x, y, hex);
    }
  }
}

// Soft drop shadow ellipse drawn directly on a 2D context.
export function shadowEllipse(ctx, cx, cy, rx, ry, alpha = 0.22) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#1b1426';
  ctx.beginPath();
  ctx.ellipse(Math.round(cx), Math.round(cy), rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// 9-slice panel from a small source canvas with border size b.
export function nineSlice(ctx, src, b, x, y, w, h) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  const sw = src.width, sh = src.height;
  const mw = sw - b * 2, mh = sh - b * 2;
  const iw = w - b * 2, ih = h - b * 2;
  // corners
  ctx.drawImage(src, 0, 0, b, b, x, y, b, b);
  ctx.drawImage(src, sw - b, 0, b, b, x + w - b, y, b, b);
  ctx.drawImage(src, 0, sh - b, b, b, x, y + h - b, b, b);
  ctx.drawImage(src, sw - b, sh - b, b, b, x + w - b, y + h - b, b, b);
  // edges (tiled to keep pixel patterns crisp)
  for (let i = 0; i < iw; i += mw) {
    const cw = Math.min(mw, iw - i);
    ctx.drawImage(src, b, 0, cw, b, x + b + i, y, cw, b);
    ctx.drawImage(src, b, sh - b, cw, b, x + b + i, y + h - b, cw, b);
  }
  for (let j = 0; j < ih; j += mh) {
    const ch = Math.min(mh, ih - j);
    ctx.drawImage(src, 0, b, b, ch, x, y + b + j, b, ch);
    ctx.drawImage(src, sw - b, b, b, ch, x + w - b, y + b + j, b, ch);
  }
  // center
  for (let j = 0; j < ih; j += mh) for (let i = 0; i < iw; i += mw) {
    const cw = Math.min(mw, iw - i), ch = Math.min(mh, ih - j);
    ctx.drawImage(src, b, b, cw, ch, x + b + i, y + b + j, cw, ch);
  }
}
