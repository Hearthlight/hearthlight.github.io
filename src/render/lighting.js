// Time-of-day lighting: sun/moon arc & colour, sky ambient, colour grade,
// window/lamp glow, and a small pool of point lights that follows the camera
// so every lamp in view can glow at night without blowing the light budget.

import { THREE, LIGHT } from './r3d.js';
import { clamp, lerp } from '../engine/util.js';

// hour -> look. Hours run 5..26 (26 = 2am next day).
const KEYS = [
  { h: 0, sky: '#4a4f8e', gnd: '#35294a', hemi: 0.48, sun: '#9fb2ff', si: 0.13, grade: [0.74, 0.78, 0.98], lamps: 1, vig: 0.6 },
  { h: 4.5, sky: '#4c5290', gnd: '#36294c', hemi: 0.48, sun: '#a4b6ff', si: 0.14, grade: [0.78, 0.8, 1.0], lamps: 1, vig: 0.58 },
  { h: 5.8, sky: '#c9a3b8', gnd: '#5a4a6a', hemi: 0.45, sun: '#ffab80', si: 0.28, grade: [0.98, 0.88, 0.93], lamps: 0.6, vig: 0.5 },
  { h: 7.0, sky: '#ffe2c4', gnd: '#8a7a8e', hemi: 0.56, sun: '#ffd49a', si: 0.46, grade: [1.04, 0.98, 0.94], lamps: 0.0, vig: 0.4 },
  { h: 9.0, sky: '#fff6e6', gnd: '#a89bb8', hemi: 0.62, sun: '#fff1d6', si: 0.55, grade: [1.0, 1.0, 1.0], lamps: 0, vig: 0.35 },
  { h: 13.0, sky: '#ffffff', gnd: '#aea2bd', hemi: 0.64, sun: '#fffaf0', si: 0.58, grade: [1.0, 1.0, 1.0], lamps: 0, vig: 0.33 },
  { h: 16.5, sky: '#fff0dc', gnd: '#a89bb8', hemi: 0.62, sun: '#ffe8c2', si: 0.54, grade: [1.02, 1.0, 0.97], lamps: 0, vig: 0.35 },
  { h: 18.2, sky: '#f8cfa8', gnd: '#8e6e7a', hemi: 0.55, sun: '#ffab62', si: 0.52, grade: [1.08, 0.96, 0.86], lamps: 0.15, vig: 0.42 },
  { h: 19.3, sky: '#c890a8', gnd: '#5e4a6a', hemi: 0.44, sun: '#ff8a6a', si: 0.26, grade: [0.96, 0.84, 0.94], lamps: 0.75, vig: 0.55 },
  { h: 20.4, sky: '#5a62a4', gnd: '#3a2c50', hemi: 0.52, sun: '#a8b8ff', si: 0.16, grade: [0.82, 0.84, 1.0], lamps: 1, vig: 0.55 },
  { h: 24.0, sky: '#4a4f8e', gnd: '#35294a', hemi: 0.48, sun: '#9fb2ff', si: 0.13, grade: [0.74, 0.78, 0.98], lamps: 1, vig: 0.6 },
  { h: 28.5, sky: '#4c5290', gnd: '#36294c', hemi: 0.48, sun: '#a4b6ff', si: 0.14, grade: [0.78, 0.8, 1.0], lamps: 1, vig: 0.58 },
];

const cA = new THREE.Color(), cB = new THREE.Color();
function mixColor(a, b, t, out) {
  cA.set(a); cB.set(b);
  return out.copy(cA).lerp(cB, t);
}

export class Lighting {
  constructor(r3d, poolSize = 14) {
    this.r3d = r3d;
    this.pool = [];
    for (let i = 0; i < poolSize; i++) {
      const l = new THREE.PointLight(0xffb862, 0, 5, 1.3);
      l.castShadow = false;
      r3d.scene.add(l);
      this.pool.push(l);
    }
    this.sources = [];      // {x,y,z,color,power,lamp?}
    this.glowMats = [];     // materials with emissiveMap (windows)
    this.lampMats = [];     // lamp glass
    this.glows = [];        // additive sprites
    this.lampLevel = 0;
    this.indoor = null;
    this.weatherDim = 0;    // 0..1 (rain/clouds)
    this.gloom = 0;         // 0..1 (World v7) a shadow over the sun: the Gloomstage, the Murk
    this.drain = 0;         // 0..1 colours drained (a land whose Great Hearth is out)
    this.sepia = 0;         // 0..1 an old photograph's tint (a scene's flashback)
    this.glowTex = makeGlowTexture();
    this.glowMat = new THREE.SpriteMaterial({ map: this.glowTex, color: 0xffc070, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 });
    // (a fire's own halo: red-orange and low — the lamps' pale gold turned the grass round a
    // campfire yellow-green and washed its flames out)
    this.fireGlowMat = new THREE.SpriteMaterial({ map: this.glowTex, color: 0xff6a2c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 });
  }

  addSource(s) {
    this.sources.push(s);
    if (s.lamp) {
      const sp = new THREE.Sprite(s.fire ? this.fireGlowMat : this.glowMat);
      sp.position.set(s.x, s.fire ? 0.2 : s.y, s.z);
      sp.scale.set(s.fire ? 2.4 : 1.8, s.fire ? 2.0 : 1.8, 1);
      sp.renderOrder = 5;
      this.r3d.scene.add(sp);
      this.glows.push(sp);
    }
  }

  // hour: 6..26 ; returns the evaluated look. `mats: false` leaves the
  // world’s windows & lamps alone (a split view lit for an outdoor instance)
  update(hour, focus, { mats = true } = {}) {
    this.hour = hour;
    const r = this.r3d;
    let h = hour;
    if (h < KEYS[0].h) h += 24;
    let i = 0;
    while (i < KEYS.length - 2 && KEYS[i + 1].h <= h) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    const t = clamp((h - a.h) / (b.h - a.h), 0, 1);
    const k = { t };

    // weather: overcast dims & desaturates
    const wd = this.weatherDim;
    mixColor(a.sky, b.sky, t, r.hemi.color);
    mixColor(a.gnd, b.gnd, t, r.hemi.groundColor);
    r.hemi.intensity = lerp(a.hemi, b.hemi, t) * LIGHT * (1 - wd * 0.12);
    mixColor(a.sun, b.sun, t, r.sun.color);
    r.sun.intensity = lerp(a.si, b.si, t) * LIGHT * (1 - wd * 0.75);
    if (wd > 0) r.hemi.color.lerp(new THREE.Color('#c8cad8'), wd * 0.5);
    const g = r.post.uniforms.grade.value;
    g.set(lerp(a.grade[0], b.grade[0], t), lerp(a.grade[1], b.grade[1], t), lerp(a.grade[2], b.grade[2], t));
    if (wd > 0) g.multiplyScalar(1 - wd * 0.08);
    r.post.uniforms.vignette.value = lerp(a.vig, b.vig, t);
    r.post.uniforms.sat.value = (1.1 - wd * 0.2) * (1 - this.drain * 0.62) * (1 - this.sepia * 0.78);
    if (this.sepia > 0) g.lerp(new THREE.Vector3(1.18, 0.98, 0.7), this.sepia);
    const gl = this.gloom;
    if (gl > 0) {
      r.sun.intensity *= 1 - gl * 0.8;
      r.hemi.intensity *= 1 - gl * 0.3;
      r.hemi.color.lerp(new THREE.Color('#8a78b0'), gl * 0.45);
      g.lerp(new THREE.Vector3(0.84, 0.76, 1.0), gl * 0.4);
      r.post.uniforms.vignette.value = Math.max(r.post.uniforms.vignette.value, 0.5 + gl * 0.35);
    }
    const lamps = Math.max(lerp(a.lamps, b.lamps, t), wd * 0.35, gl * 0.7);
    this.lampLevel = lamps;

    // sun path: east (morning) -> south -> west (evening); moon at night
    let dir;
    if (hour >= 5.5 && hour <= 19.8) {
      const u = clamp((hour - 5.5) / (19.8 - 5.5), 0, 1);
      const ang = u * Math.PI;
      dir = new THREE.Vector3(Math.cos(ang) * 0.95, 0.22 + Math.sin(ang) * 1.05, 0.62);
    } else {
      const u = ((hour < 12 ? hour + 24 : hour) - 19.8) / 10;
      dir = new THREE.Vector3(0.5 - u, 1.0, 0.55);
    }
    r.sunDir.copy(dir.normalize());

    // emissive windows / lamps
    if (mats) {
      for (const m of this.glowMats) m.emissiveIntensity = lamps * 0.95;
      for (const m of this.lampMats) m.emissiveIntensity = lamps * 1.2;
    }
    this.glowMat.opacity = lamps * 0.55;
    this.fireGlowMat.opacity = lamps * 0.42;

    // point light pool
    this.assignPool(focus, lamps);
    return k;
  }

  // (World v7) an outdoor instance: the outdoors at its own fixed hour, without
  // the zone’s weather, the Murk’s gloom or the drain of whatever is outside
  updateInstance(hour, focus, opts) {
    const keep = [this.weatherDim, this.gloom, this.drain, this.hour];
    this.weatherDim = 0; this.gloom = 0; this.drain = 0;
    this.update(hour, focus, opts);
    [this.weatherDim, this.gloom, this.drain] = keep;
    return keep[3];
  }

  // Interiors: warm constant ambience + a soft key light from the window side,
  // lamps & fireplaces through the light pool, window glass follows the sky.
  updateIndoor(hour, focus, room) {
    const r = this.r3d;
    const dark = !!(room && room.def && room.def.dark);
    const night = hour >= 20 || hour < 6 || dark;
    const dusk = hour >= 17.5 && hour < 20;
    r.hemi.color.set(dark ? '#9a90c8' : night ? '#d8c8e8' : '#fff2dc');
    r.hemi.groundColor.set(night ? '#4a3c58' : '#8a7a8e');
    r.hemi.intensity = (dark ? (room.def.ambient || 0.2) : night ? 0.42 : dusk ? 0.55 : 0.64) * LIGHT;
    r.sun.color.set(night ? '#b8b0e0' : dusk ? '#ffc890' : '#fff0dc');
    r.sun.intensity = (dark ? 0.05 : night ? 0.16 : 0.42) * LIGHT;
    r.sunDir.set(-0.35, 1, 0.75).normalize();
    const g = r.post.uniforms.grade.value;
    if (dark) g.set(0.8, 0.86, 1.02); else if (night) g.set(0.92, 0.88, 0.96); else if (dusk) g.set(1.05, 0.97, 0.9); else g.set(1.03, 1.0, 0.96);
    r.post.uniforms.vignette.value = dark ? 0.85 : night ? 0.7 : 0.5;
    r.post.uniforms.sat.value = 1.1;
    const lamps = night ? 1 : dusk ? 0.75 : 0.35;
    this.lampLevel = lamps;
    const sky = night ? '#2c3570' : dusk ? '#f6b08a' : hour < 7.5 ? '#f3c6b0' : '#9fd0f5';
    for (const m of room.glass) { m.color.set(sky); m.emissive.set(sky); m.emissiveIntensity = night ? 0.25 : 0.65; }
    this.glowMat.opacity = 0; this.fireGlowMat.opacity = 0;
    this.assignPool(focus, lamps);
  }

  assignPool(focus, level) {
    const pool = this.pool;
    if (level <= 0.01 || !focus) { for (const l of pool) l.intensity = 0; return; }
    const fx = focus.x, fz = focus.z;
    const cand = [];
    for (const s of this.sources) {
      if (s.off) continue;
      const d = s.always ? -1 : (Math.abs(s.x - fx) + Math.abs(s.z - fz) * 1.2) * (s.lamp ? 0.7 : 1);
      if (d < 24) cand.push([d, s]);
    }
    cand.sort((p, q) => p[0] - q[0]);
    for (let i = 0; i < pool.length; i++) {
      const l = pool[i];
      const c = cand[i];
      if (!c) { l.intensity = 0; continue; }
      const s = c[1];
      l.position.set(s.x, s.y, s.z);
      l.color.set(s.color || 0xffb862);
      l.distance = s.dist || (s.lamp ? 8 : 4.6);
      l.intensity = (s.always ? Math.max(level, 0.6) : level) * (s.power || 1) * LIGHT * (s.lamp || s.always ? 1.1 : 0.8);
    }
  }

  clear() {
    for (const sp of this.glows) this.r3d.scene.remove(sp);
    this.glows = [];
    this.sources = [];
    this.glowMats = [];
    this.lampMats = [];
  }
}

function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const ctx = c.getContext('2d');
  // stepped radial glow (pixel-y bands instead of a smooth gradient)
  const steps = [[16, 0.08], [12, 0.16], [9, 0.28], [6, 0.45], [3.5, 0.7]];
  for (const [r, a] of steps) {
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const dx = x + 0.5 - 16, dy = y + 0.5 - 16;
      if (dx * dx + dy * dy <= r * r) ctx.fillRect(x, y, 1, 1);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
}
