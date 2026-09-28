// Color helpers: hex <-> rgb/hsl, mixing, and hue-shifted shading ramps
// (shadows drift toward blue-violet, highlights toward warm yellow — the
// classic pixel-art trick that keeps shading lively instead of muddy).

export function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r, g, b) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}

export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return [h, s, l];
}

export function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

export function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}

export function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// Move hue h toward target by up to `amt` degrees along the shortest arc.
function hueToward(h, target, amt) {
  let d = ((target - h + 540) % 360) - 180;
  const step = Math.sign(d) * Math.min(Math.abs(d), amt);
  return h + step;
}

export function shift(hex, { dh = 0, toward = null, ds = 0, dl = 0 } = {}) {
  const [r, g, b] = hexToRgb(hex);
  let [h, s, l] = rgbToHsl(r, g, b);
  if (toward !== null) h = hueToward(h, toward, dh);
  else h += dh;
  s = Math.max(0, Math.min(1, s + ds));
  l = Math.max(0, Math.min(1, l + dl));
  return rgbToHex(...hslToRgb(h, s, l));
}

export const darken = (hex, amt) => shift(hex, { toward: 250, dh: amt * 40, ds: amt * 0.15, dl: -amt });
export const lighten = (hex, amt) => shift(hex, { toward: 55, dh: amt * 30, ds: -amt * 0.1, dl: amt });

// Build a 5-step ramp from a mid tone: o(utline) d(ark) m(id) l(ight) h(ighlight)
export function ramp(mid, opts = {}) {
  const { outline = 0.36, dark = 0.13, light = 0.1, high = 0.2 } = opts;
  const [r, g, b] = hexToRgb(mid);
  const [, s] = rgbToHsl(r, g, b);
  const grey = s < 0.08; // keep greys neutral-ish
  const tint = (amt, toward, dl, ds) =>
    shift(mid, { toward, dh: grey ? amt * 0.25 : amt, ds: grey ? ds * 0.3 : ds, dl });
  return {
    o: tint(24, 255, -outline, 0.12),
    d: tint(12, 250, -dark, 0.06),
    m: mid,
    l: tint(10, 55, light, -0.02),
    h: tint(18, 55, high, -0.08),
  };
}

// Parse a color to a packed 0xAABBGGRR int (for ImageData writes on little-endian).
export function packRGBA(hex, a = 255) {
  const [r, g, b] = hexToRgb(hex);
  return ((a & 255) << 24) | (b << 16) | (g << 8) | r;
}
