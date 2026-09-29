// A fire's flames, shared by the valley's campfire (props.js), the big world's fires and braziers
// (landmarks.js) and the camps: tongues in layers — deep orange-red outside, orange, then a warm
// yellow and a small pale heart — rather than one yellow blob. The group is what flickers.
import { THREE, toon } from '../render/r3d.js';

const GEO = new Map();
const cone = (r, h) => { const k = r + ':' + h; if (!GEO.has(k)) GEO.set(k, new THREE.ConeGeometry(r, h, 5).translate(0, h / 2, 0)); return GEO.get(k); };
// (a flame shines by itself: its colour is all glow — a dark surface under it, so the fire's own
// light can't blow it out to white at night, and the night's grading doesn't dim it to nothing)
let MATS = null;
const glow = (r3d, key, c, k = 1.15) => toon(r3d, { color: 0x1a0804, emissive: c, emissiveIntensity: k, key });
const mats = (r3d) => MATS || (MATS = {
  outer: glow(r3d, 'flame-outer', 0xe0582e),
  mid: glow(r3d, 'flame-mid', 0xf68c36),
  inner: glow(r3d, 'flame-inner', 0xffc25a),
  core: glow(r3d, 'flame-core', 0xfff2d2),
  ember: glow(r3d, 'flame-ember', 0xb8391a, 0.9),
});

export function flameCluster(r3d, s = 1) {
  const M = mats(r3d), g = new THREE.Group();
  const tongue = (r, h, m, a, d, lean) => {
    const c = new THREE.Mesh(cone(r, h), m);
    c.position.set(Math.cos(a) * d * s, 0, Math.sin(a) * d * 0.8 * s);
    c.scale.setScalar(s);
    c.rotation.set(Math.sin(a) * lean, a * 2, -Math.cos(a) * lean);        // (leaning out from the middle)
    c.userData.noCast = true;
    g.add(c);
  };
  for (let i = 0; i < 5; i++) tongue(0.12 + (i % 2) * 0.03, 0.4 + (i % 3) * 0.11, M.outer, i * 1.26 + 0.3, 0.12, 0.24);
  for (let i = 0; i < 4; i++) tongue(0.1, 0.42 + (i % 2) * 0.14, M.mid, i * 1.57 + 0.9, 0.06, 0.12);
  for (let i = 0; i < 3; i++) tongue(0.07, 0.3 + (i % 2) * 0.1, M.inner, i * 2.1, 0.03, 0.06);
  tongue(0.045, 0.2, M.core, 0, 0, 0);
  return g;
}

// glowing coals among the logs (they don't flicker: they're what the flames stand on)
export function embers(r3d, s = 1) {
  const M = mats(r3d), g = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9 + 0.4, d = (0.08 + (i % 3) * 0.07) * s;
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.1 * s, 0.05 * s, 0.08 * s), M.ember);
    b.position.set(Math.cos(a) * d, 0.03 * s, Math.sin(a) * d * 0.8);
    b.rotation.y = a;
    b.userData.noCast = true;
    g.add(b);
  }
  return g;
}
