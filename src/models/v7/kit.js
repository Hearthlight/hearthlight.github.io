// World v7: a small modelling kit for the new landmarks, props and the cast's
// special shapes — toon materials by colour, painted textures, boxes, cones,
// beams and groups, in the same spirit (and pixels) as models/landmarks.js.

import { THREE, pixelTexture, toon } from '../../render/r3d.js';
import { Painter } from '../../art/surfaces.js';
import { ramp } from '../../engine/color.js';
import { rng } from '../../engine/util.js';

export { THREE };
const UP = new THREE.Vector3(0, 1, 0), _v = new THREE.Vector3();

// materials are cached by key per renderer
export function kit(r3d) {
  const cache = r3d.v7mats || (r3d.v7mats = new Map());
  const geos = r3d.v7geos || (r3d.v7geos = new Map());
  const K = {
    r3d,
    // flat toon colour (hex number or '#rrggbb'); glowing colour
    c(color, extra = {}) {
      const key = 'v7c' + color + JSON.stringify(extra);
      if (!cache.has(key)) cache.set(key, toon(r3d, { color, key, ...extra }));
      return cache.get(key);
    },
    glow(color, emissive = color, intensity = 1) { return K.c(color, { emissive, emissiveIntensity: intensity }); },
    // a painted texture material (paint(p: Painter) draws on a w×h canvas)
    tex(key, w, h, paint, { rx = 0, ry = rx, glowPaint = null, intensity = 0.8 } = {}) {
      const k = 'v7t' + key;
      if (cache.has(k)) return cache.get(k);
      const p = new Painter(w, h);
      paint(p);
      const map = pixelTexture(p.c, { repeat: rx > 0 });
      if (rx > 0) map.repeat.set(rx, ry);
      const o = { map, key: k };
      if (glowPaint) {
        const q = new Painter(w, h); q.rect(0, 0, w, h, '#000000'); glowPaint(q);
        const em = pixelTexture(q.c, { repeat: rx > 0 });
        if (rx > 0) em.repeat.set(rx, ry);
        Object.assign(o, { emissive: 0xffffff, emissiveIntensity: intensity, emissiveMap: em });
      }
      const m = toon(r3d, o);
      cache.set(k, m);
      return m;
    },
    geo(key, make) { if (!geos.has(key)) geos.set(key, make()); return geos.get(key); },
    box(w, h, d) { return K.geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)); },
    cyl(rt, rb, h, n = 10) { return K.geo(`c${rt},${rb},${h},${n}`, () => new THREE.CylinderGeometry(rt, rb, h, n)); },
    cone(r, h, n = 10) { return K.geo(`k${r},${h},${n}`, () => new THREE.ConeGeometry(r, h, n)); },
    ball(r, w = 12, h = 8) { return K.geo(`s${r},${w},${h}`, () => new THREE.SphereGeometry(r, w, h)); },
    put(g, geometry, material, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0) {
      const m = new THREE.Mesh(geometry, material);
      m.position.set(x, y, z);
      if (rx || ry || rz) m.rotation.set(rx, ry, rz);
      m.castShadow = true; m.receiveShadow = true;
      g.add(m);
      return m;
    },
    grp(parent, x = 0, y = 0, z = 0, ry = 0) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; if (parent) parent.add(g); return g; },
    // a stick between two points
    beam(g, mat, x1, y1, z1, x2, y2, z2, w = 0.08) {
      const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1, L = Math.hypot(dx, dy, dz) || 1e-3;
      const m = new THREE.Mesh(K.box(1, 1, 1), mat);
      m.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
      m.quaternion.setFromUnitVectors(UP, _v.set(dx / L, dy / L, dz / L));
      m.scale.set(w, L, w);
      m.castShadow = true;
      g.add(m);
      return m;
    },
    noCast(m) { m.castShadow = false; m.userData.noCast = true; return m; },
    // a translucent additive shape (beams of light, auras)
    light(color, opacity = 0.35) {
      const key = 'v7l' + color + opacity;
      if (!cache.has(key)) cache.set(key, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
      return cache.get(key);
    },
    // painted helpers
    speckle(p, w, h, base, seed, n = 0.3) {
      const R = ramp(base), r = rng(seed);
      p.rect(0, 0, w, h, R.m);
      for (let i = 0; i < w * h * n; i++) { const v = r(); p.px(r() * w, r() * h, v < 0.45 ? R.d : v < 0.85 ? R.l : R.h); }
      return R;
    },
  };
  return K;
}
