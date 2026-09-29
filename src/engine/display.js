// Two integer-scaled pixel layers stacked on top of each other:
//  - world: the low-res 3D render (+ world-space 2D effects), chunky pixels
//  - ui:    the 2D interface layer (transparent), slightly finer pixels
// Internal resolutions adapt to the window so there are no letterbox bars.

const UI_MIN_W = 420, UI_MIN_H = 250;
const UI_MIN_W_PORTRAIT = 240, UI_MIN_H_PORTRAIT = 380;
// a phone (a finger, a small screen): chunkier pixels still — its short side down to 232 UI
// pixels (an iPhone's 3× screen then shows 5 device pixels a UI pixel, not 4)
const PHONE_SHORT = 232;
const isPhone = () => {
  const touch = (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) || (navigator.maxTouchPoints || 0) > 0;
  return touch && Math.min(window.innerWidth || 1024, window.innerHeight || 768) < 540;
};
const WORLD_TARGET_W = 400, WORLD_TARGET_H = 290;

export class Display {
  constructor(worldCanvas, uiCanvas) {
    this.worldCanvas = worldCanvas;
    this.canvas = uiCanvas; // input & UI live on the top canvas
    this.wctx = worldCanvas.getContext('2d', { alpha: false });
    this.ctx = uiCanvas.getContext('2d');
    this.zoomBias = 0;
    this.listeners = [];
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  onResize(fn) { this.listeners.push(fn); }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const W = Math.max(320, Math.floor((window.innerWidth || 1024) * dpr));
    const H = Math.max(240, Math.floor((window.innerHeight || 768) * dpr));
    this.dpr = dpr;
    this.devW = W; this.devH = H;

    // UI layer
    // phones in portrait get chunkier UI pixels so text stays readable
    this.portrait = H > W * 1.15;
    this.phone = isPhone();
    const mw = this.portrait ? (this.phone ? PHONE_SHORT : UI_MIN_W_PORTRAIT) : UI_MIN_W, mh = this.portrait ? UI_MIN_H_PORTRAIT : (this.phone ? PHONE_SHORT : UI_MIN_H);
    const us = Math.max(1, Math.floor(Math.min(W / mw, H / mh)));
    this.scale = us;
    this.w = Math.floor(W / us);
    this.h = Math.floor(H / us);
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.canvas.style.width = `${(this.w * us) / dpr}px`;
    this.canvas.style.height = `${(this.h * us) / dpr}px`;
    this.ctx.imageSmoothingEnabled = false;

    // World layer (even dimensions keep the camera centre on a pixel boundary)
    const tgt = this.worldTarget;
    let ws = tgt
      ? Math.max(1, Math.round(Math.min(W / tgt.w, H / tgt.h) + 0.25))
      : Math.max(1, Math.round(Math.min(W / WORLD_TARGET_W, H / WORLD_TARGET_H)) + this.zoomBias);
    this.autoWscale = Math.max(1, ws);
    // Party Mode zoom: an explicit integer scale (keeps pixels crisp)
    if (this.forcedWscale) ws = Math.min(this.forcedWscale, Math.floor(Math.min(W / 160, H / 100)));
    ws = Math.max(1, ws);
    this.wscale = ws;
    this.ww = Math.ceil(W / ws / 2) * 2;
    this.wh = Math.ceil(H / ws / 2) * 2;
    this.worldCanvas.width = this.ww;
    this.worldCanvas.height = this.wh;
    this.worldCanvas.style.width = `${(this.ww * ws) / dpr}px`;
    this.worldCanvas.style.height = `${(this.wh * ws) / dpr}px`;
    this.wctx.imageSmoothingEnabled = false;

    for (const fn of this.listeners) fn(this);
  }

  setZoomBias(b) { this.zoomBias = b; this.resize(); }

  // Party Mode on a TV/projector wants a wider view than the solo game
  setWorldTarget(w, h) { this.worldTarget = w ? { w, h } : null; this.forcedWscale = null; this.resize(); }

  // Party Mode zoom: device pixels per world pixel (null = automatic)
  setWorldScale(ws) {
    const want = ws ? Math.max(1, Math.round(ws)) : null;
    if (want === this.forcedWscale) return;
    this.forcedWscale = want;
    this.resize();
  }

  // world-layer pixel -> ui-layer pixel (both canvases are centred)
  worldToUi(x, y) {
    return {
      x: (x - this.ww / 2) * (this.wscale / this.scale) + this.w / 2,
      y: (y - this.wh / 2) * (this.wscale / this.scale) + this.h / 2,
    };
  }

  uiToWorld(x, y) {
    return {
      x: (x - this.w / 2) * (this.scale / this.wscale) + this.ww / 2,
      y: (y - this.h / 2) * (this.scale / this.wscale) + this.wh / 2,
    };
  }

  // Convert a client (CSS px) position to UI pixel coords.
  toInternal(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * this.w,
      y: ((clientY - r.top) / r.height) * this.h,
    };
  }
}
