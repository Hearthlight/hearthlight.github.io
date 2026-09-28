// See-through crowns: tree tops (and other tall leafy things) thin out into a
// pixel dither wherever they hide a hero or a gloom creature from the camera,
// so a party can still play in a forest. The party fills SEE per view before
// rendering it (screen spot, depth and radius of whoever stands behind the
// leaves); the solo game leaves it empty, so nothing changes there.

import { THREE } from './r3d.js';

export const SEE_MAX = 16;
export const SEE = {
  spots: { value: Array.from({ length: SEE_MAX }, () => new THREE.Vector4()) },   // x, y (GL px), depth (0..1), radius (px)
  count: { value: 0 },
};

// patch a material so its fragments dither away in front of the SEE spots
export function seeThrough(m) {
  if (!m || m.userData.seeThrough) return m;
  m.userData.seeThrough = true;
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, renderer) => {
    if (prev) prev(sh, renderer);
    sh.uniforms.uSee = SEE.spots;
    sh.uniforms.uSeeN = SEE.count;
    sh.fragmentShader = sh.fragmentShader.replace('void main() {', `uniform vec4 uSee[${SEE_MAX}];
uniform int uSeeN;
void main() {
  for (int i = 0; i < ${SEE_MAX}; i++) {
    if (i >= uSeeN) break;
    vec4 s = uSee[i];
    vec2 d = gl_FragCoord.xy - s.xy;
    float r2 = dot(d, d);
    if (gl_FragCoord.z < s.z && r2 < s.w * s.w) {
      // a screen-door dither: one pixel in four stays near the middle, half at the rim
      vec2 f = mod(floor(gl_FragCoord.xy), 2.0);
      float keep = r2 < s.w * s.w * 0.4 ? (f.x < 0.5 && f.y < 0.5 ? 1.0 : 0.0) : mod(f.x + f.y, 2.0);
      if (keep < 0.5) discard;
    }
  }`);
  };
  const key = m.customProgramCacheKey ? m.customProgramCacheKey.bind(m) : null;
  m.customProgramCacheKey = () => (key ? key() : '') + '|see-through';
  m.needsUpdate = true;
  return m;
}
