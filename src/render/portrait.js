// Offscreen portrait renderer: renders a villager’s head & shoulders from the
// front into a small canvas (with a pixel outline) for dialogue boxes & menus.

import { THREE, LIGHT } from './r3d.js';
import { CharModel } from '../models/chars.js';

export class Portraits {
  constructor(r3d, size = 44) {
    this.r3d = r3d;
    this.size = size;
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight(0xfff8f0, 0x9a8aac, 0.78 * LIGHT));
    const key = new THREE.DirectionalLight(0xfff0d8, 0.5 * LIGHT);
    key.position.set(-1.2, 2.2, 3);
    this.scene.add(key);
    const h = 0.69;
    this.cam = new THREE.OrthographicCamera(-h, h, h, -h, 0.1, 30);
    this.rt = new THREE.WebGLRenderTarget(size, size, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    this.buf = new Uint8Array(size * size * 4);
    this.models = new Map();
    this.cache = new Map();
  }

  invalidate(key) {
    for (const k of [...this.cache.keys()]) if (k.startsWith(key + ':')) this.cache.delete(k);
    const m = this.models.get(key);
    if (m) { this.scene.remove(m.root); this.models.delete(key); }
  }

  get(key, look, expr = 'neutral', scale = 1) {
    const ck = key + ':' + expr;
    let c = this.cache.get(ck);
    if (c) return c;
    // (someone who isn’t a chibi at all — a whale — brings a painter of their own)
    if (look && typeof look.paint === 'function') { c = look.paint(this.size, expr); this.cache.set(ck, c); return c; }
    let m = this.models.get(key);
    if (!m) {
      m = new CharModel(this.r3d, look, { scale });
      m.blob.visible = false;
      this.models.set(key, m);
    }
    for (const other of this.models.values()) other.root.visible = other === m;
    if (!m.root.parent) this.scene.add(m.root);
    m.setExpression(expr);
    m.setFacing(0.18);
    const cy = 1.08 * scale;
    this.cam.position.set(0.25, cy + 0.55, 4);
    this.cam.lookAt(0, cy - 0.02, 0);
    this.cam.updateMatrixWorld();

    const r = this.r3d.renderer;
    const prevClear = r.getClearColor(new THREE.Color());
    const prevAlpha = r.getClearAlpha();
    r.setClearColor(0x000000, 0);
    r.setRenderTarget(this.rt);
    r.clear();
    r.render(this.scene, this.cam);
    r.readRenderTargetPixels(this.rt, 0, 0, this.size, this.size, this.buf);
    r.setRenderTarget(null);
    r.setClearColor(prevClear, prevAlpha);

    c = document.createElement('canvas');
    c.width = c.height = this.size;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(this.size, this.size);
    const S = this.size, row = S * 4;
    for (let y = 0; y < S; y++) img.data.set(this.buf.subarray((S - 1 - y) * row, (S - y) * row), y * row);
    // pixel outline around the silhouette
    const src = new Uint8ClampedArray(img.data);
    const A = (x, y) => (x < 0 || y < 0 || x >= S || y >= S ? 0 : src[(y * S + x) * 4 + 3]);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      if (src[i + 3] > 0) { img.data[i + 3] = 255; continue; }
      if (A(x - 1, y) || A(x + 1, y) || A(x, y - 1) || A(x, y + 1)) {
        img.data[i] = 43; img.data[i + 1] = 28; img.data[i + 2] = 44; img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    this.cache.set(ck, c);
    return c;
  }
}
