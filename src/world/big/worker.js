// Terrain painting off the main thread: the big screen sends the world once,
// then asks for chunks; each comes back as RGBA (alpha = liquid info).

import { paintChunk } from './paint.js';

let map = null;

self.onmessage = (e) => {
  const m = e.data;
  if (m.type === 'map') { map = m.map; return; }
  if (m.type === 'paint' && map) {
    const t0 = performance.now();
    let rgba;
    try { rgba = paintChunk(map, m.cx, m.cz); } catch (err) { self.postMessage({ type: 'error', key: m.key, msg: String(err && err.stack || err) }); return; }
    self.postMessage({ type: 'chunk', key: m.key, cx: m.cx, cz: m.cz, rgba, ms: performance.now() - t0 }, [rgba.buffer]);
  }
};
