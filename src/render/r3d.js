// Low-resolution toon 3D renderer for the pixel-art world.
//
// - Scene units: 1 unit = 1 tile = 16 texels. x = east, y = up, z = south.
// - Oblique "3/4" camera: orthographic at 45° pitch with the vertical frustum
//   compressed by √2, so ground AND vertical walls both map 1 texel -> 1 pixel
//   (the classic top-down pixel-art projection, but with real depth & shadows).
// - Rendered into a small target, then a post pass adds depth-based outlines
//   and a painterly colour grade (cool violet shadows, warm cream highlights).

import * as THREE from 'three';

THREE.ColorManagement.enabled = false;

export const TS = 16;          // texels per unit
export const LIGHT = Math.PI;   // intensity that yields 1.0 x albedo
const SQRT2 = Math.SQRT2;

export class R3D {
  constructor() {
    this.canvas = document.createElement('canvas');
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: this.canvas, antialias: false, alpha: false,
        // (no preserved buffer: every render is copied to the 2D layers right away, in the same task —
        // keeping it costs a buffer copy a frame on phones' GPUs)
        preserveDrawingBuffer: false, powerPreference: 'high-performance',
      });
    } catch (e) {
      this.ok = false;
      throw new Error('WebGL is not available in this browser.');
    }
    this.ok = true;
    this.renderer = renderer;
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setClearColor(0x14121c, 1);

    this.scene = new THREE.Scene();
    this.ppu = TS;
    this.w = 2; this.h = 2;
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 160);
    this.target = new THREE.Vector3();

    // ---- lights
    this.hemi = new THREE.HemisphereLight(0xffffff, 0xa89bb8, 0.62 * LIGHT);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff4dc, 0.55 * LIGHT);
    this.sun.castShadow = true;
    const sh = this.sun.shadow;
    sh.mapSize.set(2048, 2048);
    sh.camera.near = 1; sh.camera.far = 140;
    sh.camera.left = -20; sh.camera.right = 20; sh.camera.top = 20; sh.camera.bottom = -20;
    sh.bias = -0.0006;
    sh.normalBias = 0.02;
    this.scene.add(this.sun, this.sun.target);
    this.sunDir = new THREE.Vector3(0.45, 1, 0.55).normalize();

    // toon ramp shared by all materials (sampled on .r)
    const ramp = new Uint8Array([
      0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255,
      130, 130, 130, 255, 150, 150, 150, 255,
      255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
    ]);
    this.gradient = new THREE.DataTexture(ramp, 10, 1, THREE.RGBAFormat);
    this.gradient.minFilter = this.gradient.magFilter = THREE.NearestFilter;
    this.gradient.generateMipmaps = false;
    this.gradient.needsUpdate = true;

    // ---- post pass
    this.post = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: null },
        tDepth: { value: null },
        res: { value: new THREE.Vector2(1, 1) },
        edgeThr: { value: 0.0016 },
        outline: { value: new THREE.Vector3(0.46, 0.4, 0.52) },
        outlineMix: { value: 0.85 },
        shadowTint: { value: new THREE.Vector3(0.84, 0.84, 1.12) },
        lightTint: { value: new THREE.Vector3(1.05, 1.02, 0.93) },
        sat: { value: 1.1 },
        grade: { value: new THREE.Vector3(1, 1, 1) },
        vignette: { value: 0.35 },
        // Party Mode split screen: a second full view composited along a line
        tColorB: { value: null },
        tDepthB: { value: null },
        splitOn: { value: 0 },
        splitN: { value: new THREE.Vector2(1, 0) },
        splitA: { value: 0 },
        cells: { value: new THREE.Vector2(1, 1) },
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: /* glsl */`
        uniform sampler2D tColor; uniform sampler2D tDepth;
        uniform sampler2D tColorB; uniform sampler2D tDepthB;
        uniform vec2 res; uniform float edgeThr; uniform vec3 outline; uniform float outlineMix;
        uniform vec3 shadowTint; uniform vec3 lightTint; uniform float sat; uniform vec3 grade; uniform float vignette;
        uniform float splitOn; uniform vec2 splitN; uniform float splitA; uniform vec2 cells;
        varying vec2 vUv;
        float D(vec2 o){ return texture2D(tDepth, vUv + o).x; }
        float DB(vec2 o){ return texture2D(tDepthB, vUv + o).x; }
        void main(){
          vec2 px = 1.0 / res;
          // which view does this pixel belong to? (side of the split line)
          float side = splitOn > 0.5 ? dot(vUv * res - res * 0.5, splitN) : -1.0;
          vec3 c; float m;
          if (side > 0.0) {
            c = texture2D(tColorB, vUv).rgb;
            float d = DB(vec2(0.0));
            m = max(max(d - DB(vec2(-px.x, 0.0)), d - DB(vec2(px.x, 0.0))),
                    max(d - DB(vec2(0.0, px.y)), d - DB(vec2(0.0, -px.y))));
          } else {
            c = texture2D(tColor, vUv).rgb;
            float d = D(vec2(0.0));
            // outer outline: pixel sits behind a neighbour by more than the surface slope
            m = max(max(d - D(vec2(-px.x, 0.0)), d - D(vec2(px.x, 0.0))),
                    max(d - D(vec2(0.0, px.y)), d - D(vec2(0.0, -px.y))));
          }
          float edge = step(edgeThr, m);
          c = mix(c, c * outline, edge * outlineMix);
          float l = dot(c, vec3(0.299, 0.587, 0.114));
          c = mix(vec3(l), c, sat);
          c = mix(c * shadowTint, c, smoothstep(0.06, 0.62, l));
          c = mix(c, c * lightTint, smoothstep(0.62, 1.0, l));
          c *= grade;
          vec2 q = fract(vUv * cells) - 0.5;
          c *= 1.0 - dot(q, q) * vignette;
          // the split line: a dark seam with a cream core
          if (splitOn > 0.5) {
            float a = abs(side);
            if (a < 2.5) c = mix(c, vec3(0.16, 0.11, 0.2), splitA);
            if (a < 0.75) c = mix(c, vec3(1.0, 0.95, 0.82), splitA);
          }
          gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
        }`,
      depthTest: false,
      depthWrite: false,
    });
    this.postScene = new THREE.Scene();
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.post));
  }

  resize(w, h) {
    this.w = w; this.h = h;
    this.renderer.setSize(w, h, false);
    if (this.rt) this.rt.dispose();
    this.rt = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat,
    });
    this.rt.depthTexture = new THREE.DepthTexture(w, h);
    this.rt.depthTexture.type = THREE.UnsignedIntType;
    this.post.uniforms.tColor.value = this.rt.texture;
    this.post.uniforms.tDepth.value = this.rt.depthTexture;
    this.post.uniforms.res.value.set(w, h);
    if (this.rtB) { this.rtB.dispose(); this.rtB = null; }
  }

  // second full-size target for the two-view (Voronoi) split screen
  ensureRtB() {
    if (this.rtB) return this.rtB;
    this.rtB = new THREE.WebGLRenderTarget(this.w, this.h, {
      minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat,
    });
    this.rtB.depthTexture = new THREE.DepthTexture(this.w, this.h);
    this.rtB.depthTexture.type = THREE.UnsignedIntType;
    return this.rtB;
  }

  // Centre the view on ground point (x, z) in world units.
  setView(x, z, ppu = this.ppu) {
    this.ppu = ppu;
    const cam = this.camera;
    const hw = this.w / 2 / ppu, hh = this.h / 2 / ppu / SQRT2;
    cam.left = -hw; cam.right = hw; cam.top = hh; cam.bottom = -hh;
    cam.updateProjectionMatrix();
    // snap to the texel/pixel grid so the ground never shimmers
    const sx = Math.round(x * ppu) / ppu;
    const sz = Math.round(z * ppu) / ppu;
    this.target.set(sx, 0, sz);
    const dist = 60;
    cam.position.set(sx, dist, sz + dist);
    cam.up.set(0, 1, 0);
    cam.lookAt(this.target);
    cam.updateMatrixWorld();

    // shadow camera follows the view, snapped to its own texel grid
    const sun = this.sun;
    // (the view plus a margin for what stands just outside it and casts into it: 5 tiles — 10
    // drew three shadow casters in four for nothing)
    const span = Math.max(hw, this.h / 2 / ppu) + 5;
    const s = sun.shadow.camera;
    s.left = -span; s.right = span; s.top = span; s.bottom = -span;
    s.updateProjectionMatrix();
    const texel = (span * 2) / sun.shadow.mapSize.x;
    const q = (v) => Math.round(v / texel) * texel;
    sun.target.position.set(q(sx), 0, q(sz));
    sun.position.copy(sun.target.position).addScaledVector(this.sunDir, 70);
    sun.target.updateMatrixWorld();
  }

  // Aim any camera at ground point (x, z) for a vw×vh-pixel panel (same
  // oblique projection & texel snapping as setView). Returns the snapped centre.
  aimCamera(cam, x, z, ppu, vw, vh) {
    const hw = vw / 2 / ppu, hh = vh / 2 / ppu / SQRT2;
    cam.left = -hw; cam.right = hw; cam.top = hh; cam.bottom = -hh;
    cam.near = 1; cam.far = 160;
    cam.updateProjectionMatrix();
    const sx = Math.round(x * ppu) / ppu, sz = Math.round(z * ppu) / ppu;
    cam.position.set(sx, 60, sz + 60);
    cam.up.set(0, 1, 0);
    cam.lookAt(sx, 0, sz);
    cam.updateMatrixWorld();
    return { x: sx, z: sz };
  }

  // move the sun's shadow frustum over a panel before rendering it
  aimShadow(x, z, vw, vh, ppu) {
    const sun = this.sun;
    const span = Math.max(vw / 2 / ppu, vh / 2 / ppu) + 5;
    const s = sun.shadow.camera;
    s.left = -span; s.right = span; s.top = span; s.bottom = -span;
    s.updateProjectionMatrix();
    const texel = (span * 2) / sun.shadow.mapSize.x;
    const q = (v) => Math.round(v / texel) * texel;
    sun.target.position.set(q(x), 0, q(z));
    sun.position.copy(sun.target.position).addScaledVector(this.sunDir, 70);
    sun.target.updateMatrixWorld();
  }

  // Render several views, then the post pass.
  //  grid:  views[i] = { cam, rect: {x, y, w, h} } drawn side by side
  //  split: two full-screen views composited along a line through the
  //         centre with normal `split.n` (pixels), seam opacity `split.a`
  // `prep(view)` runs before each view (lights, shadows).
  renderViews(views, { split = null, cells = [1, 1], prep = null } = {}) {
    const r = this.renderer;
    const u = this.post.uniforms;
    // (the world's matrices once for all the views — only the lights move between them)
    const sc = this.scene;
    sc.updateMatrixWorld();
    sc.matrixWorldAutoUpdate = false;
    const lights = sc.children.filter((o) => o.isLight);
    const before = (v) => { if (prep) prep(v); for (const l of lights) l.updateMatrixWorld(); };
    try { this.drawViews(views, split, cells, before); } finally { sc.matrixWorldAutoUpdate = true; }
    r.setRenderTarget(null);
    r.render(this.postScene, this.postCam);
    u.splitOn.value = 0;
    u.cells.value.set(1, 1);
  }

  drawViews(views, split, cells, prep) {
    const r = this.renderer;
    const u = this.post.uniforms;
    u.cells.value.set(cells[0], cells[1]);
    if (split && views.length === 2) {
      const rtB = this.ensureRtB();
      [this.rt, rtB].forEach((rt, i) => {
        if (prep) prep(views[i]);
        r.setRenderTarget(rt);
        r.render(this.scene, views[i].cam);
      });
      u.tColorB.value = rtB.texture; u.tDepthB.value = rtB.depthTexture;
      u.splitOn.value = 1;
      u.splitN.value.set(split.n.x, split.n.y);
      u.splitA.value = split.a;
    } else {
      u.splitOn.value = 0;
      const rt = this.rt;
      for (const v of views) {
        if (prep) prep(v);
        const { x, y, w, h } = v.rect;
        const gy = this.h - y - h; // GL viewports start at the bottom
        rt.viewport.set(x, gy, w, h);
        rt.scissor.set(x, gy, w, h);
        rt.scissorTest = true;
        r.setRenderTarget(rt);
        r.render(this.scene, v.cam);
      }
      rt.viewport.set(0, 0, this.w, this.h);
      rt.scissor.set(0, 0, this.w, this.h);
      rt.scissorTest = false;
    }
  }

  // world (units) -> world-canvas pixel
  project(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    return { x: ((v.x + 1) / 2) * this.w, y: ((1 - v.y) / 2) * this.h, z: v.z };
  }

  // world-canvas pixel -> ground point (y = 0)
  unproject(px, py) {
    const dx = (px - this.w / 2) / this.ppu;
    const dz = (py - this.h / 2) / this.ppu;
    return { x: this.target.x + dx, z: this.target.z + dz };
  }

  render() {
    const r = this.renderer;
    r.setRenderTarget(this.rt);
    r.render(this.scene, this.camera);
    r.setRenderTarget(null);
    r.render(this.postScene, this.postCam);
  }
}

// ---------------------------------------------------------------------------
// Texture & material helpers
// ---------------------------------------------------------------------------
export function pixelTexture(canvas, { repeat = false } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.NoColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

const matCache = new Map();
export function toon(r3d, opts = {}) {
  const key = opts.key || null;
  if (key && matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshToonMaterial({
    color: opts.color !== undefined ? opts.color : 0xffffff,
    map: opts.map || null,
    gradientMap: r3d.gradient,
    transparent: !!opts.transparent,
    alphaTest: opts.alphaTest || 0,
    side: opts.side || THREE.FrontSide,
    emissive: opts.emissive !== undefined ? opts.emissive : 0x000000,
    emissiveMap: opts.emissiveMap || null,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    depthWrite: opts.depthWrite !== undefined ? opts.depthWrite : true,
    vertexColors: !!opts.vertexColors,
  });
  if (opts.shadowSide) m.shadowSide = opts.shadowSide;
  if (key) matCache.set(key, m);
  return m;
}

export { THREE };
