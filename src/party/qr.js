// QR codes for the party lobby (phones scan the big screen to join).
// Uses the tiny `qrcode-generator` library (MIT), kept in vendor/ like Three.js.

import { makeCanvas } from '../engine/gfx.js';

let lib = null;

async function load() {
  if (!lib) {
    const m = await import('../../vendor/qrcode/qrcode.js');
    lib = m.default || m;
  }
  return lib;
}

// A 1-pixel-per-module canvas with a 2-module quiet zone: scale it up with
// nearest-neighbour when drawing.
export async function qrCanvas(text, { dark = '#241a2e', light = '#fffaf0' } = {}) {
  const qrcode = await load();
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount(), q = 2;
  const c = makeCanvas(n + q * 2, n + q * 2);
  c.ctx.fillStyle = light;
  c.ctx.fillRect(0, 0, c.width, c.height);
  c.ctx.fillStyle = dark;
  for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) if (qr.isDark(r, col)) c.ctx.fillRect(col + q, r + q, 1, 1);
  c.text = text;
  return c;
}
