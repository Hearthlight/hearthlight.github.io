// Wind in the leaves: a material patched so its vertices sway in the vertex shader — crowns as
// a block with their tops a little freer, blades & stems from their foot — while gusts roll
// across the land. The sway moves in whole texels (1/16 unit), so leaves step like a sprite's
// frames instead of shimmering. One clock & one strength for the whole world: WIND (World3D
// ticks it, the weather sets how hard it blows). Shadows stay put: a texel of sway doesn't show.

import { THREE } from './r3d.js';

export const WIND = {
  t: { value: 0 },
  amp: { value: 0.06 },                                   // (units at a gust's peak: calm ≈ 0.05, rain ≈ 0.12)
  dir: { value: new THREE.Vector2(0.94, 0.34) },          // (mostly west → east, a little south)
};

// how much a vertex bends, from its place in the part's own geometry
const WEIGHT = {
  crown: '0.75 + 0.25 * position.y',                       // (a ball or cone of leaves, -1..1 or -0.5..0.5)
  blade: 'clamp(position.y + 0.5, 0.0, 1.0)',              // (a unit box stood on its foot: 0 at the ground)
  top: '1.0',                                              // (a head riding on a blade's tip)
};

// patch a leafy material (shared: every mesh using it sways). amp: this part's share of the wind;
// weight: 'crown' | 'blade' | 'top' | a GLSL expression of `position`
export function windy(m, { amp = 1, weight = 'crown' } = {}) {
  if (!m || m.userData.windy) return m;
  m.userData.windy = true;
  const w = WEIGHT[weight] || weight;
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, renderer) => {
    if (prev) prev(sh, renderer);
    sh.uniforms.uWindT = WIND.t;
    sh.uniforms.uWindAmp = WIND.amp;
    sh.uniforms.uWindDir = WIND.dir;
    sh.vertexShader = sh.vertexShader
      .replace('void main() {', 'uniform float uWindT;\nuniform float uWindAmp;\nuniform vec2 uWindDir;\nvoid main() {')
      .replace('#include <project_vertex>', `vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
  mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
#endif
{
  vec3 wp = ( modelMatrix * mvPosition ).xyz;
  float ph = dot( wp.xz, vec2( 0.31, 0.23 ) );
  float gust = 0.55 + 0.45 * sin( uWindT * 0.43 - dot( wp.xz, uWindDir ) * 0.09 );
  float s = sin( uWindT * 1.9 + ph ) * 0.65 + sin( uWindT * 3.3 + ph * 1.7 ) * 0.35;
  vec2 off = uWindDir * ( s * gust * uWindAmp * ${amp.toFixed(3)} * ( ${w} ) );
  mvPosition.xz += floor( off * 16.0 + 0.5 ) / 16.0;
}
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`);
  };
  const key = m.customProgramCacheKey ? m.customProgramCacheKey.bind(m) : null;
  m.customProgramCacheKey = () => (key ? key() : '') + '|wind' + amp + weight;
  m.needsUpdate = true;
  return m;
}

// the weather's wind: how hard it blows (eased toward, never snapped)
const BLOW = { sun: 0.055, cloudy: 0.085, rain: 0.13, snow: 0.1, storm: 0.16 };
export function windFor(weather, dt) {
  const to = BLOW[weather] ?? BLOW.sun;
  WIND.amp.value += (to - WIND.amp.value) * Math.min(1, dt * 0.5);
  return WIND.amp.value;
}
