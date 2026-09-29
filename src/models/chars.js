// Voxel-chibi characters. Every villager and the player are built from the
// same boxy parts, each face painted as pixel art at 16 texels per unit, then
// palette-swapped from an appearance ("look") object.
//
// Pixel layout (1 px = 1/16 unit). Feet at y=0, facing +z (south).
//   shoes 0-2 · legs 2-5 · hips 5-7 · torso 7-12 · head 12-23 (+hair)

import { THREE, pixelTexture, toon } from '../render/r3d.js';
import { Painter } from '../art/surfaces.js';
import { ramp, mix } from '../engine/color.js';
import { SKIN, HAIR_COLORS, EYE_COLORS, CLOTH_COLORS, byId } from '../art/palette.js';
import { DEFAULT_LOOK } from '../data/looks.js';

export { HAIR_STYLES, TOP_STYLES, BOTTOM_STYLES, HAT_STYLES, ACC_STYLES, FACIAL_STYLES, DEFAULT_LOOK } from '../data/looks.js';

const P = 1 / 16;
// Head size in px: a square footprint (every facing shows the same silhouette)
// with soft, rounded edges. The whole head is then flattened along the camera's
// depth axis (world z, whichever way the character faces) so that under the
// steep 3/4 camera it reads as a chunky rounded cube instead of a tall box.
const HW = 12, HH = 11, HD = 12;
const HZ = HD / 2;
const ZS = HD / 8; // depth scale vs. the original 8-px-deep head (for hand-placed tufts)
const HEAD_FLAT = 0.45;

// A box with rounded edges & corners that keeps BoxGeometry's six face groups
// and UVs, so painted faces still land where they should.
const geoCache = new Map();
export function roundedBoxGeo(w, h, d, r) {
  const key = [w, h, d, r].join(',');
  let g = geoCache.get(key);
  if (g) return g;
  const seg = (n) => Math.max(2, Math.round(n / (r / 2)));
  g = new THREE.BoxGeometry(w, h, d, seg(w), seg(h), seg(d));
  const pos = g.attributes.position;
  const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const cx = Math.max(-hx, Math.min(hx, x)), cy = Math.max(-hy, Math.min(hy, y)), cz = Math.max(-hz, Math.min(hz, z));
    const dx = x - cx, dy = y - cy, dz = z - cz;
    const len = Math.hypot(dx, dy, dz);
    if (len > 1e-6) { const k = r / len; pos.setXYZ(i, cx + dx * k, cy + dy * k, cz + dz * k); }
  }
  g.computeVertexNormals();
  geoCache.set(key, g);
  return g;
}

export const EXPRESSIONS = ['neutral', 'blink', 'happy', 'talk', 'surprised', 'sad', 'love', 'angry', 'smug', 'worried', 'cry', 'shock', 'sleepy'];

function pal(look) {
  const L = { ...DEFAULT_LOOK, ...look };
  return {
    L,
    sk: byId(SKIN, L.skin).r,
    hc: byId(HAIR_COLORS, L.hairColor).r,
    ey: byId(EYE_COLORS, L.eyes).m,
    tc: byId(CLOTH_COLORS, L.topColor).r,
    t2: byId(CLOTH_COLORS, L.topColor2 || 'cream').r,
    bc: byId(CLOTH_COLORS, L.bottomColor).r,
    sc: byId(CLOTH_COLORS, L.shoes || 'brown').r,
    ht: byId(CLOTH_COLORS, L.hatColor || 'mustard').r,
  };
}

// ---------------------------------------------------------------------------
// Face painter (12 x 10)
// ---------------------------------------------------------------------------
export function paintFace(look, expr = 'neutral') {
  const { L, sk, ey } = pal(look);
  const base = new Painter(HW, HH);
  base.rect(0, 0, HW, HH, sk.m);
  base.hline(1, HH - 1, HW - 2, sk.d);
  base.px(0, HH - 2, sk.d); base.px(HW - 1, HH - 2, sk.d);
  // features are drawn one row down (the new top row is forehead under the bangs)
  const p = { px: (x, y, c) => base.px(x, y + 1, c), hline: (x, y, w, c) => base.hline(x, y + 1, w, c), rect: (x, y, w, h, c) => base.rect(x, y + 1, w, h, c), c: base.c };
  const dark = mix(ey, '#1a1422', 0.55);
  const eyeAt = [2, 8];
  const TEAR = '#8fc8f0';
  for (const x of eyeAt) {
    const inner = x < 6 ? x + 1 : x;             // the eye's side nearest the nose
    const outer = x < 6 ? x : x + 1;
    if (expr === 'blink' || expr === 'sleepy') { p.hline(x, 6, 2, dark); if (expr === 'sleepy') p.px(outer, 5, sk.d); }
    else if (expr === 'angry') {
      // brows slanting down to the nose, narrowed eyes
      p.px(outer, 3, dark); p.px(inner, 4, dark);
      p.hline(x, 5, 2, dark); p.px(x + (x < 6 ? 1 : 0), 6, ey);
    } else if (expr === 'smug') {
      // heavy lids, one brow up
      p.hline(x, 5, 2, dark); p.hline(x, 6, 2, ey);
      if (x > 6) { p.px(x, 3, dark); p.px(x + 1, 3, dark); }
    } else if (expr === 'worried') {
      // brows up in the middle
      p.px(inner, 3, dark); p.px(outer, 4, sk.d);
      p.hline(x, 5, 2, dark); p.px(x, 6, '#ffffff'); p.px(x + 1, 6, dark);
    } else if (expr === 'cry') {
      p.px(x, 5, dark); p.px(x + 1, 5, dark); p.px(inner, 4, dark);
      p.px(outer, 6, TEAR); p.px(outer, 7, TEAR); p.px(outer, 8, TEAR);
    } else if (expr === 'shock') {
      // saucer eyes
      p.hline(x, 3, 2, dark); p.px(x, 4, '#ffffff'); p.px(x + 1, 4, '#ffffff'); p.px(x, 5, '#ffffff'); p.px(x + 1, 5, dark); p.hline(x, 6, 2, dark);
    }
    else if (expr === 'happy' || expr === 'love') {
      if (expr === 'love') { p.px(x, 5, '#ec5f73'); p.px(x + 1, 5, '#ec5f73'); p.px(x, 6, '#ec5f73'); p.px(x + 1, 6, '#c8454f'); }
      else { p.px(x, 6, dark); p.px(x + 1, 5, dark); p.px(x + 1, 6, dark); p.px(x, 5, sk.m); }
    } else if (expr === 'sad') {
      p.hline(x, 5, 2, dark); p.hline(x, 6, 2, ey); p.px(x + (x < 6 ? 0 : 1), 4, sk.d);
    } else {
      p.hline(x, 4, 2, dark);
      p.px(x, 5, '#ffffff'); p.px(x + 1, 5, dark);
      p.hline(x, 6, 2, ey);
      if (expr === 'surprised') { p.hline(x, 3, 2, dark); p.px(x, 5, dark); p.px(x + 1, 4, '#ffffff'); }
    }
  }
  // cheeks
  if (L.acc !== 'shades') {
    const b = L.acc === 'blush' ? '#ee7f8f' : '#f5a3a3';
    p.px(1, 7, b); p.px(10, 7, b);
    if (L.acc === 'blush') { p.px(2, 7, b); p.px(9, 7, b); }
  }
  if (L.acc === 'freckles') { for (const [x, y] of [[1, 6], [3, 7], [8, 7], [10, 6]]) p.px(x, y, '#b86a4a'); }
  // mouth
  const M = '#7a3440', T = '#e36b6b';
  if (expr === 'happy' || expr === 'love') { p.px(4, 7, M); p.px(7, 7, M); p.hline(5, 8, 2, M); }
  else if (expr === 'angry') { p.hline(4, 8, 4, M); p.px(4, 7, sk.d); p.px(7, 7, sk.d); }
  else if (expr === 'smug') { p.hline(5, 8, 2, M); p.px(7, 7, M); }
  else if (expr === 'worried') { p.px(4, 8, M); p.px(5, 7, M); p.px(6, 8, M); p.px(7, 7, M); }
  else if (expr === 'cry') { p.rect(5, 7, 2, 2, M); p.px(5, 8, T); }
  else if (expr === 'shock') { p.rect(5, 7, 2, 2, M); p.px(4, 8, M); p.px(7, 8, M); }
  else if (expr === 'sleepy') { p.px(6, 8, M); }
  else if (expr === 'talk') { p.hline(5, 7, 2, M); p.hline(5, 8, 2, T); }
  else if (expr === 'surprised') { p.rect(5, 7, 2, 2, M); }
  else if (expr === 'sad') { p.hline(5, 7, 2, M); p.px(4, 8, M); p.px(7, 8, M); }
  else { p.hline(5, 8, 2, M); }
  if (L.acc === 'bandaid') { p.hline(8, 8, 3, '#f3d2a0'); p.px(9, 8, '#d9a86a'); }
  // facial hair
  if (L.facial === 'mustache') {
    const { hc } = pal(look);
    p.hline(3, 7, 6, hc.d); p.px(3, 8, hc.d); p.px(8, 8, hc.d); p.hline(4, 7, 4, hc.m);
  }
  if (L.facial === 'beard') {
    const { hc } = pal(look);
    p.rect(0, 7, 12, 3, hc.m); p.hline(1, 9, 10, hc.d); p.hline(4, 7, 4, hc.d);
    p.hline(5, 8, 2, M);
    p.px(0, 6, hc.d); p.px(11, 6, hc.d);
  }
  return p.c;
}

// ---------------------------------------------------------------------------
// Textures for parts
// ---------------------------------------------------------------------------
function hairTex(hc, w, h, { bangs = null, strands = 'v', seed = 1 } = {}) {
  const p = new Painter(w, h);
  p.rect(0, 0, w, h, hc.m);
  const rnd = (a) => { const v = Math.sin(a * 127.1 + seed * 311.7) * 43758.5453; return v - Math.floor(v); };
  if (strands === 'v') {
    // irregular strands running down, a sheen near the top, darker tips
    for (let x = 0; x < w; x++) {
      if (rnd(x) < 0.4) continue;
      const y0 = 1 + Math.floor(rnd(x + 50) * 3), len = 2 + Math.floor(rnd(x + 90) * h);
      for (let y = y0; y < Math.min(h, y0 + len); y++) p.px(x, y, hc.d);
    }
    for (let x = 0; x < w; x++) if (rnd(x + 200) > 0.3) p.px(x, rnd(x + 300) > 0.75 ? 1 : 0, hc.l);
  } else {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((y + seed) % 3 === 0 && rnd(x * 7 + y) < 0.55) p.px(x, y, hc.d);
  }
  if (h > 3) p.hline(0, h - 1, w, hc.d);
  if (bangs) {
    // bangs: jagged bottom edge; bangs[x] = number of rows of hair in column x
    for (let x = 0; x < w; x++) {
      const n = bangs[x % bangs.length];
      if (n < h) p.clear(x, n, 1, h - n);
      if (n > 0 && n <= h) p.px(x, n - 1, hc.d);
    }
  }
  return p.c;
}

// The top of the hair seen from above (row 0 = the back of the head). It is
// shown squashed by HEAD_FLAT, so it sticks to broad shapes that survive
// that: a darker rim, strands fanning from a whorl at the back, and a thick
// sheen arc across the front.
function crownTex(hc, w, d, seed = 3) {
  const p = new Painter(w, d);
  p.rect(0, 0, w, d, hc.m);
  const cx = (w - 1) / 2, wy = d * 0.2;
  for (let x = 0; x < w; x++) for (let y = 0; y < d; y++) {
    const nx = (x - cx) / (w / 2), ny = (y - (d - 1) / 2) / (d / 2);
    const rim = Math.max(Math.abs(nx), Math.abs(ny));
    if (rim >= 0.84) { p.px(x, y, hc.d); continue; }
    const a = Math.atan2(y - wy, x - cx);
    const fan = Math.floor(a * 3.2 + seed) % 2 === 0;
    if (fan && Math.hypot(x - cx, y - wy) > 1.6 && (x * 5 + y * 3 + seed) % 4 < 2) p.px(x, y, hc.d);
  }
  // whorl
  const wx = Math.round(cx), wyy = Math.round(wy);
  p.px(wx, wyy, hc.d); p.px(wx + 1, wyy, hc.d); p.px(wx, wyy + 1, hc.d);
  // sheen arc (3 rows thick in the middle so the flattening can't drop it)
  for (let x = 2; x < w - 2; x++) {
    const t = (x - cx) / (w / 2 - 2);
    const y0 = Math.round(d * 0.56 - (1 - t * t) * 1.2);
    p.px(x, y0, hc.l); p.px(x, y0 + 1, hc.l);
    if (Math.abs(t) < 0.55) p.px(x, y0 + 2, hc.l);
    if (Math.abs(t + 0.3) < 0.2) p.px(x, y0 + 1, hc.h);
  }
  return p.c;
}

function shirtFront(look) {
  const { L, tc, t2, sk } = pal(look);
  const p = new Painter(8, 5);
  const top = L.top;
  p.rect(0, 0, 8, 5, tc.m);
  p.hline(0, 4, 8, tc.d);
  p.vline(0, 0, 5, tc.d); p.vline(7, 0, 5, tc.d);
  switch (top) {
    case 'tee': p.hline(3, 0, 2, sk.m); p.px(3, 1, tc.d); p.px(4, 1, tc.d); break;
    case 'hoodie': p.hline(2, 0, 4, tc.d); p.px(3, 1, t2.l); p.px(4, 2, t2.l); p.rect(2, 3, 4, 1, tc.d); break;
    case 'sweater': for (let x = 0; x < 8; x += 2) { p.px(x, 1, tc.l); p.px(x + 1, 3, tc.d); } p.hline(2, 0, 4, tc.l); break;
    case 'striped': p.hline(0, 1, 8, t2.m); p.hline(0, 3, 8, t2.m); p.hline(3, 0, 2, sk.m); break;
    case 'overalls': p.rect(2, 1, 4, 4, t2.m); p.vline(2, 0, 2, t2.d); p.vline(5, 0, 2, t2.d); p.px(2, 1, '#e8c46a'); p.px(5, 1, '#e8c46a'); p.hline(3, 2, 2, t2.d); break;
    case 'dress': p.hline(3, 0, 2, sk.m); p.hline(0, 4, 8, tc.l); p.px(3, 2, tc.l); p.px(4, 2, tc.l); break;
    case 'vest': p.rect(3, 0, 2, 5, t2.m); p.px(3, 0, t2.l); p.px(2, 2, '#e8c46a'); p.px(2, 3, '#e8c46a'); break;
    case 'apron': p.rect(1, 1, 6, 4, '#fbf6ea'); p.hline(1, 1, 6, '#ffffff'); p.hline(2, 3, 4, '#e9dcc8'); p.hline(3, 0, 2, sk.m); break;
    case 'coat': p.vline(3, 0, 5, tc.d); p.px(4, 1, '#f3e9d2'); p.px(4, 3, '#f3e9d2'); p.hline(2, 0, 4, tc.l); break;
    case 'flannel': for (let y = 0; y < 5; y++) for (let x = 0; x < 8; x++) if ((x % 3 === 0) || (y % 3 === 1)) p.px(x, y, (x % 3 === 0 && y % 3 === 1) ? tc.o : tc.d); p.hline(3, 0, 2, t2.l); break;
    case 'jacket': p.rect(3, 0, 2, 5, t2.m); p.vline(2, 0, 5, tc.d); p.vline(5, 0, 5, tc.d); break;
    case 'smock': p.px(2, 2, '#ec5f73'); p.px(5, 3, '#4d7fc4'); p.px(4, 1, '#ffd66b'); p.hline(3, 0, 2, sk.m); break;
    case 'haori': p.px(3, 0, t2.m); p.px(4, 0, t2.m); p.px(3, 1, t2.m); p.px(4, 2, t2.m); p.px(5, 3, t2.m); p.hline(0, 3, 8, tc.d); break;
    default: break;
  }
  return p.c;
}

function flatTex(col, w, h, shade = null) {
  const p = new Painter(w, h);
  p.rect(0, 0, w, h, col);
  if (shade) p.hline(0, h - 1, w, shade);
  return p.c;
}

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------
const texCache = new Map();
function T(key, fn) {
  let t = texCache.get(key);
  if (!t) { t = pixelTexture(fn()); texCache.set(key, t); }
  return t;
}

export class CharModel {
  constructor(r3d, look, { scale = 1 } = {}) {
    this.r3d = r3d;
    this.root = new THREE.Group();
    this.scale = scale;
    this.walkPhase = 0;
    this.facing = 0;
    this.targetFacing = 0;
    this.expr = 'neutral';
    this.blinkT = 2 + Math.random() * 3;
    this.talkT = 0;
    this.setLook(look);
  }

  setLook(look) {
    this.look = { ...DEFAULT_LOOK, ...look };
    if (this.body) this.root.remove(this.body);
    this.faceTex = {};
    this.build();
  }

  mat(opts) { return toon(this.r3d, opts); }

  build() {
    const pl = pal(this.look);
    const { L, sk, hc, ey, tc, t2, bc, sc } = pl;
    const key = JSON.stringify(L);
    const body = new THREE.Group();
    this.body = body;
    this.root.add(body);
    body.scale.setScalar(this.scale);

    const mSkin = this.mat({ color: sk.m });
    const mSkinD = this.mat({ color: sk.d });
    const pantsR = L.top === 'overalls' ? t2 : bc;
    const mPants = this.mat({ color: pantsR.m });
    const mShoe = this.mat({ color: sc.d });
    const mShirt = this.mat({ color: tc.m });
    const bare = L.bottom === 'shorts';

    const box = (w, h, d, m, x, y, z, parent = body) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w * P, h * P, d * P), m);
      mesh.position.set(x * P, y * P, z * P);
      mesh.castShadow = true; mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // legs (pivot at hips, y=5)
    this.legs = [];
    for (const sx of [-2, 2]) {
      const pivot = new THREE.Group();
      pivot.position.set(sx * P, 5 * P, 0);
      body.add(pivot);
      box(3, 3, 3, bare ? mSkin : mPants, 0, -1.5, 0, pivot);
      box(3, 2, 4, mShoe, 0, -4, 0.5, pivot);
      this.legs.push(pivot);
    }
    // hips
    const skirtLike = L.bottom === 'skirt' || L.top === 'dress';
    if (skirtLike) {
      const skirtCol = L.top === 'dress' ? tc : bc;
      const geo = new THREE.CylinderGeometry(4.6 * P, 6 * P, 4 * P, 4, 1);
      geo.rotateY(Math.PI / 4);
      geo.scale(1, 1, 0.7);
      const sk2 = new THREE.Mesh(geo, this.mat({ color: skirtCol.m }));
      sk2.position.set(0, 5.5 * P, 0);
      sk2.castShadow = true;
      body.add(sk2);
    } else {
      box(8, 2, 5, mPants, 0, 6, 0);
    }
    // torso
    const front = this.mat({ map: T('shirt' + key, () => shirtFront(L)) });
    const shirtSide = this.mat({ color: tc.m });
    const shirtTop = this.mat({ color: tc.l });
    this.torso = box(8, 5, 5, [shirtSide, shirtSide, shirtTop, shirtSide, front, shirtSide], 0, 9.5, 0);
    if (L.top === 'coat' || L.top === 'apron') {
      // long coat / apron hem
      box(8.4, 2.2, 5.4, this.mat({ color: L.top === 'apron' ? '#fbf6ea' : tc.m }), 0, 6.4, L.top === 'apron' ? 0.3 : 0);
    }
    if (L.top === 'hoodie') box(6, 3, 2, this.mat({ color: tc.d }), 0, 11.5, -3.2);
    if (L.acc === 'scarf') box(9, 2, 6, this.mat({ color: t2.m }), 0, 12, 0);

    // arms (pivot at shoulders y=12)
    this.arms = [];
    const sleeve = L.top === 'vest' || L.top === 'overalls' && false ? this.mat({ color: t2.m }) : mShirt;
    for (const sx of [-5, 5]) {
      const pivot = new THREE.Group();
      pivot.position.set(sx * P, 12 * P, 0);
      body.add(pivot);
      box(2, 4, 3, sleeve, 0, -2, 0, pivot);
      box(2, 1.2, 2.6, mSkin, 0, -4.6, 0, pivot);
      this.arms.push(pivot);
    }

    // head (pivot at neck y=12): un-spin → flatten along world z → re-spin, so
    // the flattening follows the camera rather than the character's facing
    const neck = new THREE.Group();
    neck.position.set(0, 12 * P, 0);
    body.add(neck);
    this.unspin = new THREE.Group();
    const flat = new THREE.Group();
    flat.scale.z = HEAD_FLAT;
    this.spin = new THREE.Group();
    neck.add(this.unspin); this.unspin.add(flat); flat.add(this.spin);
    const head = new THREE.Group();
    this.spin.add(head);
    this.head = head;
    this.unspin.rotation.y = -this.facing; this.spin.rotation.y = this.facing;
    for (const ex of EXPRESSIONS) this.faceTex[ex] = T('face' + ex + key, () => paintFace(L, ex));
    this.faceMat = this.mat({ map: this.faceTex.neutral });
    // head sides: an ear, plus the eye & cheek near the front edge so faces
    // still read in profile. BoxGeometry maps +x from the front, -x from the back.
    const sideMat = (fromFront) => this.mat({ map: T('headside3' + L.skin + L.eyes + L.acc + fromFront, () => {
      const p = new Painter(HD, HH);
      const at = (x) => (fromFront ? x : HD - 1 - x);
      p.rect(0, 0, HD, HH, sk.m);
      p.hline(0, HH - 1, HD, sk.d);
      const ear = mix(sk.m, sk.d, 0.6), ex = Math.round(HD / 2) + 1;
      for (let y = 5; y < 8; y++) { p.px(at(ex), y, ear); p.px(at(ex + 1), y, ear); }
      p.px(at(ex), 6, sk.d);
      if (L.acc !== 'shades') {
        const dark = mix(ey, '#1a1422', 0.55);
        p.px(at(2), 5, dark); p.px(at(2), 6, dark); p.px(at(2), 7, ey);
        p.px(at(3), 8, L.acc === 'blush' ? '#ee7f8f' : '#f5a3a3');
      }
      return p.c;
    }) });
    const skull = new THREE.Mesh(roundedBoxGeo(HW * P, HH * P, HD * P, 2 * P), [sideMat(true), sideMat(false), mSkin, mSkinD, this.faceMat, mSkin]);
    skull.position.set(0, (HH / 2) * P, 0);
    skull.castShadow = true; skull.receiveShadow = true;
    head.add(skull);

    this.buildHair(head, pl, key, box);
    this.buildHat(head, pl, box);
    this.buildAcc(head, pl, box);

    // soft contact shadow
    if (!CharModel.blobGeo) {
      CharModel.blobGeo = new THREE.CircleGeometry(0.34, 12);
      CharModel.blobGeo.rotateX(-Math.PI / 2);
      CharModel.blobMat = new THREE.MeshBasicMaterial({ color: 0x1b1426, transparent: true, opacity: 0.22, depthWrite: false });
    }
    const blob = new THREE.Mesh(CharModel.blobGeo, CharModel.blobMat);
    blob.position.y = 0.01;
    blob.renderOrder = 1;
    this.root.add(blob);
    this.blob = blob;
  }

  buildHair(head, pl, key, box) {
    const { L, hc } = pl;
    const style = L.hair;
    if (style === 'bald') return;
    const mHair = this.mat({ color: hc.m });
    const mHairD = this.mat({ color: hc.d });
    const side = (w, h, seed, bangs, strands = 'v') => this.mat({ map: T(`hs2${L.hairColor}${w}x${h}${seed}${bangs ? bangs.join('') : ''}${strands}`, () => hairTex(hc, w, h, { bangs, strands, seed })), alphaTest: 0.5 });
    const bangsFor = {
      short: [3, 3, 2, 3, 2, 2, 3, 2, 3, 3, 4, 4, 4],
      bob: [5, 4, 3, 3, 2, 3, 3, 2, 3, 3, 4, 5, 5],
      long: [6, 5, 3, 2, 3, 2, 2, 3, 2, 3, 3, 5, 6],
      ponytail: [4, 3, 2, 2, 3, 2, 2, 3, 2, 2, 3, 4, 4],
      buns: [4, 3, 2, 3, 2, 2, 3, 2, 3, 2, 3, 4, 4],
      curly: [4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4],
      braids: [5, 4, 3, 2, 2, 3, 3, 2, 2, 3, 4, 5, 5],
      wavy: [5, 4, 3, 3, 2, 2, 3, 3, 2, 3, 4, 5, 5],
      spiky: [4, 2, 3, 1, 3, 2, 3, 1, 3, 2, 3, 2, 4],
      topbun: [3, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 2, 3],
      afro: [4, 4, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4],
      pixie: [4, 4, 3, 3, 2, 2, 1, 1, 1, 2, 2, 3, 3],
      side: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    }[style] || [3];

    if (style === 'side') {
      // tufts over the ears, bald crown
      for (const sx of [-6.6, 6.6]) box(1.6, 4, HD - 3, mHair, sx, 5.5, -1.5, head);
      box(13, 3, 1.6, mHair, 0, 4.5, -HZ - 0.3, head);
      return;
    }
    const big = style === 'afro' ? 2 : style === 'curly' ? 1 : 0;
    const capH = 5 + big, capW = 13 + big * 2, capD = HD + 1 + big * 2;
    const capY = HH - 4; // the cap covers the top 4 rows (+1 px above the head)
    // cap: rounded like the head, its front sits a hair in front of the face
    const capFront = side(capW, capH, 1, bangsFor.concat(Array(8).fill(bangsFor[0])));
    const capSide = side(capD, capH, 2, null);
    const capBack = side(capW, capH, 3, null);
    const crownM = this.mat({ map: T('crown3' + L.hairColor + style + capD, () => crownTex(hc, capW, capD)) });
    const cap = new THREE.Mesh(roundedBoxGeo(capW * P, capH * P, capD * P, 3 * P), [capSide, capSide, crownM, mHairD, capFront, capBack]);
    cap.position.set(0, (capY + capH / 2) * P, (HZ + 0.06 - capD / 2) * P);
    cap.castShadow = true; cap.receiveShadow = true;
    head.add(cap);

    const addSides = (bottom) => {
      const h = capY + 3 - bottom;
      const tex = side(HD, h, 5, null);
      for (const sx of [-6.75, 6.75]) box(1.5, h, HD, [tex, tex, mHair, mHairD, tex, tex], sx, bottom + h / 2, -1, head);
    };
    const addBack = (bottom) => {
      const h = HH - bottom;
      const tex = side(13, h, 6, null);
      box(13, h, 1.5, [mHair, mHair, mHair, mHairD, tex, tex], 0, bottom + h / 2, -HZ - 0.7, head);
    };

    switch (style) {
      case 'bob': addSides(3); addBack(2); break;
      case 'long': addSides(-2); addBack(-6); break;
      case 'wavy': addSides(-1); addBack(-4); break;
      case 'ponytail': {
        addBack(5);
        box(3, 3, 3, mHairD, 0, 8, -HZ - 1.5, head);
        box(3, 7, 3, mHair, 0, 3.5, -HZ - 2.5, head);
        box(2, 2, 2, mHairD, 0, -0.5, -HZ - 2.5, head);
        break;
      }
      case 'buns':
        addBack(4);
        for (const sx of [-5, 5]) box(4, 4, 4, mHair, sx, 12, -0.5, head);
        break;
      case 'topbun':
        addBack(4);
        box(5, 4, 5, mHair, 0, 13.5, -1.5, head);
        box(3, 1, 3, mHairD, 0, 11.8, -1.5, head);
        break;
      case 'braids':
        addBack(3);
        for (const sx of [-6.5, 6.5]) {
          box(2, 8, 2, mHair, sx, -1, HZ - 2, head);
          box(2.4, 1, 2.4, this.mat({ color: '#ec5f73' }), sx, -5, HZ - 2, head);
          box(1.6, 1.6, 1.6, mHairD, sx, -6.2, HZ - 2, head);
        }
        break;
      case 'curly':
        addSides(4); addBack(2);
        for (const [x, y, z] of [[-7.2, 10, 2], [7.2, 10, 2], [-7.2, 7, 0], [7.2, 7, -1], [-4, 13, 3], [4, 13, 2], [0, 13.5, -2], [-6, 12, -4], [6, 12, -4]]) box(2.5, 2.5, 2.5, mHair, x, y, z * ZS, head);
        break;
      case 'afro': {
        addSides(4); addBack(2);
        const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), this.mat({ map: T('afro' + L.hairColor, () => crownTex(hc, 16, 16, 5)) }));
        puff.scale.set(9.5 * P, 7.5 * P, 9.5 * P);
        puff.position.set(0, 11.5 * P, -1 * ZS * P);
        puff.castShadow = true;
        head.add(puff);
        break;
      }
      case 'spiky':
        addBack(4);
        for (const [x, z0] of [[-4, 1], [0, 2], [4, 1], [-2, -2], [2, -2], [0, -4]]) {
          const z = z0 * ZS;
          const c = new THREE.Mesh(new THREE.ConeGeometry(1.8 * P, 4 * P, 4), mHair);
          c.position.set(x * P, 13 * P, z * P);
          c.rotation.y = Math.PI / 4;
          c.castShadow = true;
          head.add(c);
        }
        break;
      case 'pixie':
        addBack(4);
        box(3, 2, 3, mHair, -4, 12.2, 2 * ZS, head);
        break;
      case 'short':
      default:
        addBack(4);
        break;
    }
  }

  buildHat(head, pl, box) {
    const { L, ht, t2 } = pl;
    const h = L.hat;
    if (!h || h === 'none') return;
    const m = (c) => this.mat({ color: c });
    const H = { m: m(ht.m), d: m(ht.d), l: m(ht.l), o: m(ht.o) };
    const rb = (w, hh, d, r, mat, x, y, z) => {
      const b = new THREE.Mesh(roundedBoxGeo(w * P, hh * P, d * P, r * P), mat);
      b.position.set(x * P, y * P, z * P); b.castShadow = true; b.receiveShadow = true; head.add(b); return b;
    };
    switch (h) {
      case 'beanie':
        rb(14, 4.4, HD + 2, 2, H.m, 0, 12.4, -0.5);
        box(14.6, 2, HD + 2.6, H.d, 0, 10.4, -0.5, head);
        rb(3, 3, 3, 1, H.l, 0, 15.2, -0.5);
        break;
      case 'straw':
        this.disc(head, 10.5, HZ + 4.5, 1.2, m('#e8c46a'), 11.3, 0);
        this.disc(head, 5.8, 5.8, 4, m('#f0d27e'), 13.9, -0.5);
        this.disc(head, 6, 6, 1.4, m(t2.m), 12.6, -0.5);
        break;
      case 'cap':
        rb(13.5, 3.8, HD + 2, 2, H.m, 0, 12.4, -0.5);
        box(11, 1, 5, H.d, 0, 10.9, HZ + 1.9, head);
        box(2, 1, 2, H.l, 0, 14.6, -0.5, head);
        break;
      case 'fisher':
        this.disc(head, 9.4, HZ + 3.9, 1.2, H.m, 11.2, 0.8);
        this.disc(head, 6.6, 6.6, 4, H.l, 13.5, -0.5);
        break;
      case 'tophat':
        this.disc(head, 8.4, HZ + 3.3, 1.2, H.o, 11.5, 0);
        this.disc(head, 5.2, 5.2, 8, H.o, 16, -0.5);
        this.disc(head, 5.4, 5.4, 1.4, m('#c8454f'), 12.8, -0.5);
        break;
      // (World v7) a wide-brimmed cowboy hat, a band round its pinched crown
      case 'cowboy':
        this.disc(head, 11, HZ + 5, 1.2, H.m, 11.2, 0);
        this.disc(head, 5.8, 5.4, 4.4, H.m, 13.6, -0.5);
        this.disc(head, 6, 5.6, 1.2, H.d, 12.2, -0.5);
        box(2.2, 1.4, 9, H.d, 0, 15.8, -0.5, head);
        break;
      // (World v7) a miner's hard hat with a lamp on the front
      case 'hardhat':
        rb(13.6, 5.2, HD + 1.6, 2.6, m('#f2c14e'), 0, 12.4, -0.5);
        box(15.4, 1, HD + 3.4, m('#d8a83a'), 0, 10.2, 0.2, head);
        box(2, 1.4, HD + 1.8, m('#e0b040'), 0, 15.1, -0.5, head);
        box(3.4, 2.6, 1.4, m('#fff4c0'), 0, 12.4, HZ + 1.1, head);
        box(4, 3.2, 0.8, m('#3a3844'), 0, 12.4, HZ + 0.5, head);
        break;
      // (World v7) the steppe folk's felt hat: a fur brim, a pointed crown, a tassel
      case 'furhat':
        this.disc(head, 8.6, HZ + 2.6, 3.2, m('#e8dcc4'), 11.2, 0);
        this.disc(head, 5.8, 5.6, 4, H.m, 14.2, -0.5);
        this.disc(head, 2.8, 2.8, 2.4, H.m, 17, -0.5);
        box(1.6, 3.2, 1.6, m('#c8383e'), 0, 18.8, -0.5, head);
        break;
      case 'flower': {
        const cols = ['#f4a4b6', '#fff3a6', '#ffffff', '#b9a2e3', '#f28a6b'];
        const n = 10;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          rb(2.2, 2, 2.2, 0.6, m(cols[i % cols.length]), Math.cos(a) * 6.6, 10.8 + (i % 2) * 0.6, Math.sin(a) * (HZ + 1) - 0.5);
        }
        box(13.5, 1, HD + 2.5, m('#5fa453'), 0, 10.2, -0.5, head);
        break;
      }
      case 'bow':
        rb(4, 3.4, 2, 0.8, H.m, 3.2, 11.8, 1.5);
        rb(4, 3.4, 2, 0.8, H.m, 7.4, 11.8, 1.5);
        box(1.6, 1.8, 2.4, H.d, 5.3, 11.8, 1.5, head);
        break;
      case 'beret':
        rb(15, 2.4, HD + 3, 1.1, H.m, -0.5, 12, -0.5).rotation.z = 0.12;
        box(1, 1.5, 1, H.d, 0, 13.6, -0.5, head);
        break;
      case 'bandana':
        box(13.6, 2.4, HD + 1.6, H.m, 0, 9.8, -0.5, head);
        box(3, 3, 1.5, H.d, 2, 8.5, -HZ - 1.5, head);
        break;
      case 'headphones':
        box(14, 1.5, 3, m('#3b3a46'), 0, 12.8, -0.5, head);
        for (const sx of [-7, 7]) rb(2, 4, 4, 0.8, H.m, sx, 6, -0.5);
        break;
      case 'catears':
        for (const sx of [-4.2, 4.2]) {
          const c = new THREE.Mesh(new THREE.ConeGeometry(2.2 * P, 4 * P, 4), H.m);
          c.position.set(sx * P, 12.8 * P, -0.5 * P);
          c.rotation.y = Math.PI / 4;
          c.castShadow = true;
          head.add(c);
        }
        break;
      case 'frog':
        rb(13.8, 4.6, HD + 2, 2, m('#7fbf5a'), 0, 12.2, -0.5);
        for (const sx of [-3.5, 3.5]) {
          rb(3.6, 3, 3.6, 1.2, m('#8fce66'), sx, 15, HZ - 2.5);
          box(2, 1.6, 1, m('#ffffff'), sx, 15.3, HZ - 0.6, head);
          box(1, 1, 1, m('#2a2433'), sx + 0.3, 15.3, HZ - 0.1, head);
        }
        break;
      case 'witch': {
        this.disc(head, 10, HZ + 4.5, 1, H.o, 11.4, 0);
        const cone = new THREE.Mesh(new THREE.ConeGeometry(5.8 * P, 11 * P, 8), H.d);
        cone.position.set(0.8 * P, 17 * P, -0.5 * P);
        cone.rotation.z = -0.18;
        cone.castShadow = true;
        head.add(cone);
        this.disc(head, 5.9, 5.9, 1.3, m('#e0a526'), 12.5, -0.5);
        break;
      }
      // ---- (World v7) the saga's cast
      case 'plume': {
        // the Duchess's opera hat: a wide brim, a tall crown, a huge curling feather
        this.disc(head, 11.5, HZ + 5.5, 1.1, H.d, 11.3, 0);
        this.disc(head, 6.2, 6.2, 5.5, H.m, 14.4, -0.5);
        this.disc(head, 6.4, 6.4, 1.3, m('#2a1830'), 12.4, -0.5);
        box(2.2, 2.2, 1, m('#ffd66b'), -2.6, 12.8, 5.4, head);
        const fe = m('#f4eaff'), fd = m('#c9a2f0');
        for (let i = 0; i < 6; i++) box(2.6 - i * 0.25, 3.2, 1.2, i % 2 ? fd : fe, 4.2 + i * 0.9, 16 + i * 1.7, -1 - i * 0.55, head).rotation.z = -0.35 - i * 0.12;
        break;
      }
      case 'bellhop':
        this.disc(head, 5, 5, 3.6, H.m, 12.6, -0.5);
        this.disc(head, 5.2, 5.2, 1, m('#ffd66b'), 11.3, -0.5);
        box(1.2, 1.4, 1.2, m('#ffd66b'), 0, 15, -0.5, head);
        break;
      case 'aviator':
        rb(14, 4.6, HD + 2, 2.2, H.m, 0, 12.2, -0.5);
        box(15, 2.2, 1.4, H.d, 0, 11.4, HZ + 0.4, head);
        for (const sx of [-1, 1]) { box(3.4, 3, 1.2, m('#9fdcff'), sx * 3.2, 13.6, HZ + 1, head); box(4, 3.6, 0.8, m('#6a5a4a'), sx * 3.2, 13.6, HZ + 0.6, head); }
        for (const sx of [-1, 1]) box(1.4, 5, 3, H.d, sx * 7.4, 8.8, -1, head);
        break;
      case 'crown':
        box(8, 2, 7, m('#f2c14e'), 0, 12, -0.5, head);
        for (const [x, z] of [[-3, 3], [0, 3], [3, 3], [-3, -4], [3, -4]]) box(1.4, 1.6, 1, m('#f6d06a'), x, 13.6, z, head);
        box(1.6, 1.6, 1, m('#e0405a'), 0, 12, 3.1, head);
        break;
      // (World v7, ch5) a flowered swim cap with a chin strap — the Synchronised Swimmers
      case 'swimcap':
        rb(14.2, 5.2, HD + 2.2, 2.6, H.m, 0, 11.6, -0.5);
        for (const sx of [-1, 1]) box(1.2, 5.6, 1.4, H.d, sx * 7.1, 7.8, 0.4, head);
        for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; rb(1.8, 1.8, 1, 0.5, m(i % 2 ? '#f4a4b6' : '#fff3a6'), 4.4 + Math.cos(a) * 1.5, 12.4 + Math.sin(a) * 1.5, HZ - 1); }
        box(1.4, 1.4, 1, m('#f28a6b'), 4.4, 12.4, HZ - 0.6, head);
        break;
      // (World v7, ch5) a desert head-wrap: folds of cloth, a jewel at the front, a tail behind
      case 'headwrap':
        rb(14.4, 3.4, HD + 2.4, 1.6, H.m, 0, 11, -0.5);
        rb(13.2, 3.2, HD + 1.2, 1.6, H.l, 0.4, 13.4, -0.8).rotation.z = 0.08;
        rb(10.4, 2.6, HD - 1.2, 1.2, H.m, -0.2, 15.4, -0.8);
        box(2, 2.2, 1, m('#4ac8d0'), 0, 12, HZ + 1.4, head);
        box(3.2, 7, 1.4, H.d, 3.4, 8, -HZ - 1.6, head).rotation.z = -0.12;
        break;
      // (World v7, ch5) the turtle folk's shell cap: a dome of plates, a lighter rim
      case 'turtle': {
        rb(15, 5.4, HD + 3, 2.6, m('#6a8a3a'), 0, 12.2, -0.5);
        box(16, 1.4, HD + 4, m('#c8b878'), 0, 10.2, -0.5, head);
        const plate = m('#8aa84a');
        for (const [x, z] of [[0, -0.5], [-3.6, 2.4], [3.6, 2.4], [-3.6, -3.4], [3.6, -3.4]]) box(3.2, 0.8, 3.2, plate, x, 15, z, head).rotation.y = Math.PI / 4;
        break;
      }
      // ---- treasure hats (dug up in Party Mode's exploration)
      case 'starcrown': {
        const gold = this.mat({ color: '#ffd84a', emissive: '#7a5a10', emissiveIntensity: 0.6 });
        rb(13, 2.6, HD + 1.6, 0.8, gold, 0, 11.6, -0.5);
        const star = this.mat({ color: '#fff6c8', emissive: '#ffd66b', emissiveIntensity: 0.7 });
        for (let i = 0; i < 5; i++) box(2.1, 2.1, 1.2, star, -4.8 + i * 2.4, 13.9 + (i === 2 ? 1.2 : i % 2 ? 0.5 : 0), HZ + 0.1, head).rotation.z = Math.PI / 4;
        box(2.2, 2.2, 1, this.mat({ color: '#9fc8ff', emissive: '#5a8ae0', emissiveIntensity: 0.9 }), 0, 11.6, HZ + 0.6, head);
        break;
      }
      case 'antlers': {
        const bone = m('#efe2cc');
        box(13.4, 1.6, HD + 1.8, m('#7a5238'), 0, 10.6, -0.5, head);
        for (const sx of [-1, 1]) {
          box(1.3, 5, 1.3, bone, sx * 4.2, 13.8, -0.5, head);
          box(3.2, 1.2, 1.2, bone, sx * 5.5, 15.4, -0.5, head);
          box(1.2, 2.6, 1.2, bone, sx * 6.8, 16.6, -0.5, head);
          box(1.2, 2.2, 1.2, bone, sx * 3.5, 17, -0.5, head);
        }
        break;
      }
      case 'acorncap':
        rb(14.2, 4.4, HD + 2.2, 2, m('#9a6440'), 0, 12.2, -0.5);
        box(14.8, 1.3, HD + 2.8, m('#7a4a2e'), 0, 10.4, -0.5, head);
        for (const [x, z] of [[-3.5, 2], [0, 3.5], [3.5, 2], [-2, -2], [2, -2.5]]) box(2.2, 0.7, 2.2, m('#b88458'), x, 14.5, z - 0.5, head);
        box(1.3, 2.8, 1.3, m('#6b4330'), 0.6, 15.8, -0.5, head);
        break;
      case 'glowcap': {
        this.disc(head, 9.6, HZ + 4, 2.2, m('#5a3a8e'), 12.2, -0.2);
        this.disc(head, 7, 7, 2.4, m('#6a4aa8'), 14.2, -0.5);
        this.disc(head, 4, 4, 1.6, m('#7a5ab8'), 16, -0.5);
        const glow = this.mat({ color: '#a8f5e6', emissive: '#4fd6be', emissiveIntensity: 0.9 });
        for (const [x, y, z] of [[-5, 13.3, 3], [4.6, 13.4, 2.5], [0, 15.5, 4], [-2.5, 16.7, -1], [3, 15.4, -3]]) box(2.4, 1.2, 2.4, glow, x, y, z, head);
        break;
      }
      case 'panhelm': {
        const iron = m('#4a4452');
        this.disc(head, 8.2, HZ + 2.4, 3.2, iron, 12.4, -0.5);
        this.disc(head, 7.1, HZ + 1.3, 0.8, m('#6a6478'), 14.2, -0.5);
        box(1.8, 1.3, 9, m('#6b4330'), 0, 12, -HZ - 6, head);
        box(2.4, 1.6, 1.4, iron, 0, 12, -HZ - 1.6, head);
        break;
      }
      case 'gloomhorns': {
        const horn = m('#5a3a7e'), tip = this.mat({ color: '#f7a8d0', emissive: '#e05a9a', emissiveIntensity: 0.7 });
        for (const sx of [-1, 1]) {
          const c = new THREE.Mesh(new THREE.ConeGeometry(1.7 * P, 4.6 * P, 5), horn);
          c.position.set(sx * 4 * P, 13.4 * P, 0.5 * P);
          c.rotation.z = -sx * 0.35;
          c.castShadow = true;
          head.add(c);
          box(1.1, 1.1, 1.1, tip, sx * 4.8, 15.5, 0.5, head);
        }
        break;
      }
      // ---- the rares’ hats (World v7 M13)
      case 'tricorn': {
        const felt = m('#2a2430'), gold = m('#e0b040');
        rb(13, 3, HD + 1, 1.2, felt, 0, 12.4, -0.5);
        for (const [x, z, ry] of [[0, HZ + 1.2, 0], [-5.4, -2.4, 1.05], [5.4, -2.4, -1.05]]) { const b = box(12, 2.4, 2, felt, x, 11.2, z, head); b.rotation.y = ry; box(12, 0.6, 2.2, gold, x, 12.5, z, head).rotation.y = ry; }
        box(2, 2, 1, m('#f4ecd8'), 0, 13.2, HZ + 1.6, head);
        break;
      }
      case 'lanternhat': {
        const paper = this.mat({ color: '#e84a3a', emissive: '#c8302a', emissiveIntensity: 0.6 }), gold = m('#e0b040');
        box(12.4, 1.2, HD + 0.4, gold, 0, 10.8, -0.5, head);
        this.disc(head, 4.4, 4.4, 5.2, paper, 14.6, -0.5);
        this.disc(head, 3.2, 3.2, 1, gold, 17.6, -0.5);
        this.disc(head, 3.2, 3.2, 1, gold, 11.9, -0.5);
        box(0.8, 3, 0.8, gold, 0, 9.4, HZ + 4.6, head);
        break;
      }
      case 'henhat': {
        const white = m('#f4f0e8'), red = m('#e0483a'), beak = m('#f2c14e');
        box(8, 5, 9, white, 0, 13.4, -1, head);
        box(5, 5, 4.6, white, 0, 16.6, 3.6, head);
        box(1.6, 2.6, 3.4, red, 0, 19.6, 3.6, head);
        box(2.2, 1.2, 1.8, beak, 0, 16.4, 6.4, head);
        box(1.2, 1.8, 1, red, 0, 14.9, 6, head);
        for (const sx of [-1, 1]) { box(1, 4, 7, m('#e0dcd0'), sx * 4.3, 13.6, -1.2, head); box(0.8, 0.8, 0.4, m('#241a2e'), sx * 1.6, 17.4, 5.9, head); }
        box(4, 4, 1.5, white, 0, 15.6, -5.4, head).rotation.x = -0.5;
        break;
      }
      case 'pumpkinhat': {
        const pk = m('#f08a3a'), pkD = m('#c8602a'), face = this.mat({ color: '#ffe08a', emissive: '#ffb040', emissiveIntensity: 1 });
        this.disc(head, 8.4, HZ + 2.6, 7, pk, 13.6, -0.5);
        for (const x of [-4.2, 0, 4.2]) box(1, 7.2, HZ * 2 + 5.4, pkD, x, 13.6, -0.5, head);
        for (const sx of [-1, 1]) box(2, 1.6, 1, face, sx * 2.6, 14.8, HZ + 2.2, head);
        box(4.4, 1.2, 1, face, 0, 12.2, HZ + 2.2, head);
        box(1.6, 2.6, 1.6, m('#5a7a3a'), 0.6, 18.2, -0.5, head);
        break;
      }
      case 'jellyhat': {
        const bell = this.mat({ color: '#f7a8d0', emissive: '#e05a9a', emissiveIntensity: 0.5 }), tent = this.mat({ color: '#c8a8ff', emissive: '#8a6ae0', emissiveIntensity: 0.6 });
        this.disc(head, 8, HZ + 2, 3.2, bell, 12.6, -0.5);
        this.disc(head, 5.6, 5.6, 2.2, bell, 15.2, -0.5);
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; box(0.9, 5 + (i % 2) * 2, 0.9, tent, Math.cos(a) * 7.4, 9 - (i % 2), Math.sin(a) * (HZ + 1.4) - 0.5, head); }
        break;
      }
      case 'leafcrown': {
        const cols = ['#e0782a', '#f2c14e', '#6ab04a', '#c8483a'];
        box(13, 1.4, HD + 1, m('#6b4330'), 0, 10.8, -0.5, head);
        for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; const b = box(2.6, 3.6, 1, m(cols[i % 4]), Math.cos(a) * 6.8, 13, Math.sin(a) * (HZ + 1) - 0.5, head); b.rotation.y = -a + Math.PI / 2; b.rotation.z = 0.3; }
        break;
      }
      case 'ghosthat': {
        const sheet = this.mat({ color: '#f4f4ff', emissive: '#c8d8ff', emissiveIntensity: 0.3 }), eye = m('#241a2e');
        box(9, 7, 8, sheet, 0, 14.4, -0.5, head);
        this.disc(head, 4.6, 4.2, 2.4, sheet, 18.6, -0.5);
        for (const x of [-3.4, -1.1, 1.1, 3.4]) box(2, 1.4, 8, sheet, x, 10.4, -0.5, head);
        for (const sx of [-1, 1]) box(1.4, 2, 0.6, eye, sx * 2, 15.4, 3.6, head);
        break;
      }
      case 'prismcrown': {
        const band = m('#d8d8e8'), cols = ['#ff9ad8', '#9fe8ff', '#fff4a0', '#b0f08a', '#c8a8ff'];
        box(13, 1.6, HD + 1, band, 0, 11, -0.5, head);
        for (let i = 0; i < 5; i++) {
          const c = new THREE.Mesh(new THREE.ConeGeometry(1.4 * P, 5 * P, 4), this.mat({ color: cols[i], emissive: cols[i], emissiveIntensity: 0.5 }));
          c.position.set((-4.8 + i * 2.4) * P, (14.2 + (i === 2 ? 1.2 : 0)) * P, (HZ + 0.2) * P); c.castShadow = true; head.add(c);
        }
        break;
      }
      case 'windkey': {
        const brass = this.mat({ color: '#d8a84a', emissive: '#8a6a2a', emissiveIntensity: 0.3 });
        box(1.6, 5, 1.6, brass, 0, 13, -0.5, head);
        for (const sx of [-1, 1]) { this.disc(head, 2.6, 2.6, 1, brass, 16.8, -0.5).position.x = sx * 2.8 * P; }
        box(8, 1.2, 1.2, brass, 0, 16.8, -0.5, head);
        break;
      }
      // (a second 'furhat' here once hid behind the steppe folk's felt hat: its own name)
      case 'chapka': {
        const fur = m('#4a3024'), furL = m('#ece4d4');
        rb(14.6, 7, HD + 2.6, 2.4, fur, 0, 14, -0.5);
        box(15.4, 2.6, HD + 3.4, furL, 0, 10.8, -0.5, head);
        for (const sx of [-1, 1]) box(1.8, 6.4, 5.6, furL, sx * 7.6, 8.2, -0.5, head);
        for (const [x, z] of [[-3, 3], [2.5, 1], [-1, -3], [4, -2.5]]) box(1.4, 0.8, 1.4, m('#6a4838'), x, 17.6, z - 0.5, head);
        break;
      }
      // (Release v9) Grandmother Kraken's own knitting: red and gold stripes, a big violet bobble
      case 'bobblehat': {
        const red = m('#c8454f'), gold = m('#f2c14e');
        rb(14.4, 2.4, HD + 2.4, 2, red, 0, 11.6, -0.5);
        rb(13.6, 2.2, HD + 1.6, 2, gold, 0, 13.6, -0.5);
        rb(12, 2.2, HD, 2, red, 0, 15.4, -0.5);
        box(15, 2.2, HD + 3, gold, 0, 10.2, -0.5, head);
        rb(4.6, 4.2, 4.6, 1.6, m('#a86ae0'), 0, 18.6, -0.5);
        break;
      }
      default: break;
    }
  }

  // flattened cylinder (round brims / crowns), sizes in px
  disc(parent, rx, rz, h, mat, y, z) {
    const g = new THREE.CylinderGeometry(1, 1, h * P, 12);
    const d = new THREE.Mesh(g, mat);
    d.scale.set(rx * P, 1, rz * P);
    d.position.set(0, y * P, z * P);
    d.castShadow = true; d.receiveShadow = true;
    parent.add(d);
    return d;
  }

  buildAcc(head, pl, box) {
    const { L } = pl;
    if (L.acc === 'glasses' || L.acc === 'shades') {
      const p = new Painter(12, 4);
      const f = L.acc === 'shades' ? '#2a2433' : '#4b3a3a';
      for (const x of [1, 7]) {
        p.rect(x, 0, 4, 4, f);
        if (L.acc === 'glasses') p.rect(x + 1, 1, 2, 2, 'rgba(0,0,0,0)');
        if (L.acc === 'glasses') p.clear(x + 1, 1, 2, 2);
        else p.px(x + 1, 1, '#6a6190');
      }
      p.hline(5, 1, 2, f);
      const m = this.mat({ map: pixelTexture(p.c), alphaTest: 0.5, transparent: false });
      const q = new THREE.Mesh(new THREE.PlaneGeometry(12 * P, 4 * P), m);
      q.position.set(0, 6.5 * P, (HZ + 0.15) * P);
      head.add(q);
    }
  }

  // Small held props attached to the right hand: rod, can, guitar, book, brush, hammer, lantern
  setProp(kind) {
    if (this.propKind === kind) return;
    this.propKind = kind;
    const arm = this.arms[1];
    if (this.prop) { arm.remove(this.prop); this.prop = null; }
    this.mallow = null;
    if (!kind) return;
    const g = new THREE.Group();
    const m = (c, e) => toon(this.r3d, { color: c, emissive: e || 0x000000, emissiveIntensity: e ? 1 : 1, key: 'prop' + c + (e || '') });
    const B = (w, h, d, mat, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w * P, h * P, d * P), mat); b.position.set(x * P, y * P, z * P); b.castShadow = true; g.add(b); return b; };
    if (kind === 'rod') { const r = B(1, 22, 1, m('#c49a64'), 0, 8, 6); r.rotation.x = 1.05; B(2, 2, 2, m('#6b4330'), 0, -4.5, 1); }
    else if (kind === 'can') { B(5, 4, 3, m('#4f8ab8'), 0, -6, 2.5); B(1, 1, 4, m('#4f8ab8'), 0, -5, 5.5); }
    else if (kind === 'guitar') { B(6, 7, 2, m('#c8704a'), -3, -4, 3.5); B(1.5, 9, 1.5, m('#6b4330'), 1, 2, 3.5).rotation.z = -0.9; B(2, 2, 2.2, m('#3b2a2e'), -3, -4, 3.6); }
    else if (kind === 'book') { B(5, 4, 1.4, m('#3f7f7c'), -2, -5, 3); B(4.6, 3.6, 1.5, m('#fbf1dc'), -2, -5, 3.1); }
    else if (kind === 'brush') { B(1, 7, 1, m('#b07b50'), 0, -5, 2).rotation.x = -0.6; B(1.4, 2, 1.4, m('#ec5f73'), 0, -8, 4); }
    else if (kind === 'hammer') { B(1, 7, 1, m('#8e5d3e'), 0, -5, 2); B(4, 2, 2, m('#6a6571'), 0, -8.5, 2); }
    else if (kind === 'lantern') { B(1, 3, 1, m('#5a3b2a'), 0, -5, 2); B(4, 4, 4, m('#ffc070', '#ffb050'), 0, -8.5, 2); }
    // a toasting stick by the campfire (its marshmallow browns: camp.js recolours `mallow`)
    else if (kind === 'marshmallow') {
      // (tilted up and out from the hand, so it reads from behind as well)
      const piv = new THREE.Group(); piv.position.set(0, -5.5 * P, 1.8 * P); piv.rotation.set(-0.22, 0, 0.16); g.add(piv);
      const S = (w, h, d, mat, y) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w * P, h * P, d * P), mat); b.position.y = y * P; b.castShadow = true; piv.add(b); return b; };
      S(0.8, 21, 0.8, m('#c49a64'), -9.5); S(0.5, 2.5, 0.5, m('#8e5d3e'), -21);
      const mat = this.mallowMat || (this.mallowMat = toon(this.r3d, { color: '#fff6e8' }));
      const mm = new THREE.Mesh(new THREE.CylinderGeometry(1.9 * P, 1.9 * P, 3.4 * P, 8), mat);
      mm.position.y = -18.5 * P; mm.castShadow = true; piv.add(mm);
      this.mallow = mm;
    }
    // Party Mode weapons
    else if (kind === 'pan') {
      B(1.2, 7, 1.2, m('#6b4330'), 0, -7.5, 1.5);
      const pan = new THREE.Mesh(new THREE.CylinderGeometry(3.6 * P, 3.2 * P, 1.1 * P, 12), m('#3b3844'));
      pan.rotation.x = Math.PI / 2; pan.position.set(0, -13.5 * P, 1.5 * P); pan.castShadow = true;
      g.add(pan);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(3.5 * P, 0.55 * P, 4, 14), m('#6a6571'));
      rim.position.set(0, -13.5 * P, 2.1 * P);
      g.add(rim);
    } else if (kind === 'wand') {
      B(0.9, 8, 0.9, m('#8e5d3e'), 0, -8, 2);
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(1.7 * P, 0), m('#ffe066', '#ffc94a'));
      star.position.set(0, -12.6 * P, 2 * P); star.scale.set(1, 1, 0.5);
      g.add(star);
      this.wandTip = star;
    } else if (kind === 'slingshot') {
      B(1.1, 5, 1.1, m('#8e5d3e'), 0, -6.5, 2);
      B(1, 3.2, 1, m('#8e5d3e'), -1.4, -10, 2).rotation.z = 0.4;
      B(1, 3.2, 1, m('#8e5d3e'), 1.4, -10, 2).rotation.z = -0.4;
      B(3.8, 0.5, 0.5, m('#c8454f'), 0, -11.2, 2);
    } else if (kind === 'lute') {
      B(5.5, 6, 2, m('#c8864a'), -3, -3.5, 3.5);
      B(4, 2.5, 2, m('#c8864a'), -3, -7.4, 3.5);
      B(1.8, 1.8, 2.2, m('#3b2a2e'), -3, -4.2, 3.7);
      B(1.3, 8, 1.3, m('#6b4330'), 0.8, 2.5, 3.5).rotation.z = -0.95;
      B(2, 1.5, 1.4, m('#6b4330'), 4.5, 5.2, 3.5).rotation.z = -0.4;
    }
    // Adventure v4 weapons
    else if (kind === 'rollingpin') {
      const cyl = (r, h, mat, y) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r * P, r * P, h * P, 8), mat); c.position.set(0, y * P, 1.8 * P); c.castShadow = true; g.add(c); return c; };
      cyl(0.6, 3, m('#a8743a'), -7); cyl(1.6, 9, m('#e8c890'), -13); cyl(0.6, 3, m('#a8743a'), -19);
      B(3.4, 0.5, 3.4, m('#fff3d8'), 0, -10.6, 1.8);
    } else if (kind === 'mallet') {
      B(1.2, 11, 1.2, m('#6b4330'), 0, -9.5, 1.8);
      B(4, 4, 6.5, m('#b07b50'), 0, -16, 1.8);
      B(4.2, 4.2, 1, m('#6b4330'), 0, -16, -0.9); B(4.2, 4.2, 1, m('#6b4330'), 0, -16, 4.5);
    } else if (kind === 'sword') {
      B(1.1, 3, 1.1, m('#6b4330'), 0, -7, 1.8);
      B(4.4, 1, 1.4, m('#8e5d3e'), 0, -9, 1.8);
      B(1.8, 11, 0.7, m('#d9b07a'), 0, -15.2, 1.8);
      B(0.6, 10, 0.72, m('#f0d8a8'), -0.5, -15, 1.8);
      B(1.1, 1.2, 0.7, m('#d9b07a'), 0, -21.2, 1.8);
      B(1.4, 1.4, 1.4, m('#e0a526'), 0, -5.2, 1.8);
    } else if (kind === 'staff') {
      B(1, 21, 1, m('#7a5230'), 0, -5, 2);
      const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(1.9 * P, 1), m('#bfe8ff', '#6ac0ff'));
      orb.position.set(0, 7.2 * P, 2 * P);
      g.add(orb);
      B(0.8, 3, 0.8, m('#e0a526'), -1.6, 6.2, 2).rotation.z = 0.5; B(0.8, 3, 0.8, m('#e0a526'), 1.6, 6.2, 2).rotation.z = -0.5;
      this.wandTip = orb;
    } else if (kind === 'orb') {
      const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(2.3 * P, 1), m('#e0c8ff', '#b88cf0'));
      orb.position.set(0, -11.5 * P, 3.2 * P);
      g.add(orb);
      B(3, 0.8, 3, m('#6b4330'), 0, -9, 3.2);
      this.wandTip = orb;
    } else if (kind === 'tome') {
      B(5.4, 6.4, 1.6, m('#6a3a8e'), -1.5, -9, 3);
      B(4.8, 5.8, 1.7, m('#fff3c4', '#fff0b0'), -1.5, -9, 3.1);
      B(1, 2, 1.9, m('#e0a526'), 1.2, -9, 3);
    } else if (kind === 'bow') {
      B(1, 6.2, 1, m('#b0783a'), 0, -5.2, 2.2).rotation.x = -0.45;
      B(1, 6.2, 1, m('#b0783a'), 0, -12.8, 2.2).rotation.x = 0.45;
      B(1.3, 2.2, 1.3, m('#6b4330'), 0, -9, 2.9);
      B(0.3, 13, 0.3, m('#fff3c4'), 0, -9, 0.6);
    } else if (kind === 'boomerang') {
      B(1.1, 6.5, 1.8, m('#d8a060'), 0, -9.5, 2);
      B(1.1, 1.8, 6, m('#c8864a'), 0, -12.2, 4.2);
      B(1.2, 1, 1.9, m('#ec5f73'), 0, -8, 2);
    } else if (kind === 'blowpipe') {
      const tube = B(1.1, 15, 1.1, m('#8fb070'), 0, -9, 4); tube.rotation.x = 1.15;
      for (const k of [-3, 1.5, 5]) { const r = B(1.4, 0.6, 1.4, m('#5a7a40'), 0, -9 + k * 0.4, 4 + k * 0.9); r.rotation.x = 1.15; }
    } else if (kind === 'drum') {
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(3.3 * P, 3.3 * P, 3.2 * P, 12), m('#c8454f'));
      drum.rotation.x = Math.PI / 2; drum.position.set(-3 * P, -4 * P, 4 * P); drum.castShadow = true; g.add(drum);
      const skin = new THREE.Mesh(new THREE.CylinderGeometry(3.1 * P, 3.1 * P, 0.4 * P, 12), m('#fff3e0'));
      skin.rotation.x = Math.PI / 2; skin.position.set(-3 * P, -4 * P, 5.7 * P); g.add(skin);
      B(0.8, 7, 0.8, m('#8e5d3e'), 0, -9, 2); B(1.6, 1.6, 1.6, m('#fff3e0'), 0, -12.8, 2);
    } else if (kind === 'flute') {
      const fl = B(0.8, 11, 0.8, m('#dcdce8'), 0, -9, 3.5); fl.rotation.x = 1.3;
      for (const k of [-2, 0, 2]) { const h = B(0.3, 0.3, 0.9, m('#3b2a2e'), 0, -9 + k * 0.27, 3.5 + k * 0.96); h.rotation.x = 1.3; }
    } else if (kind === 'harp') {
      B(0.9, 8, 0.9, m('#e0b03a'), -3.4, -4, 3.5);
      B(0.9, 8, 0.9, m('#e0b03a'), 1.2, -4, 3.5).rotation.z = -0.25;
      B(5.6, 1, 1, m('#e0b03a'), -1.2, -0.3, 3.5);
      B(5, 1.4, 1.4, m('#8a5e14'), -1.2, -8, 3.5);
      for (const x of [-2.4, -1.2, 0]) B(0.25, 6.8, 0.25, m('#fff8d0'), x, -4, 3.5);
    }
    // Release v9: the Lamplighter's, the Gardener's, the Cook's and the Tinkerer's things
    else if (kind === 'lanternpole' || kind === 'stormlamp') {
      const pole = kind === 'lanternpole';
      if (pole) { B(1, 22, 1, m('#7a5230'), 0, -8, 2); B(3.5, 0.8, 0.8, m('#3b2a2e'), 1.4, -18.6, 2); }
      else { B(0.9, 5, 0.9, m('#6a6571'), 0, -7, 2); B(0.5, 4, 0.5, m('#3b2a2e'), 0, -11, 2); }
      const lx = pole ? 3 : 0, ly = pole ? -21.5 : -15.5;
      B(3.2, 0.7, 3.2, m('#3b2a2e'), lx, ly + 2, 2);
      const glass = B(2.6, 3, 2.6, m('#ffe08a', '#ffc04a'), lx, ly, 2);
      B(3.2, 0.7, 3.2, m('#3b2a2e'), lx, ly - 1.9, 2);
      this.wandTip = glass;
    } else if (kind === 'torch') {
      B(1.2, 9, 1.2, m('#7a5230'), 0, -8.5, 2); B(1.8, 1.4, 1.8, m('#5a3b2a'), 0, -13.4, 2);
      const fl = B(1.8, 3, 1.8, m('#ffb040', '#ff7a1a'), 0, -15.6, 2); B(1, 1.6, 1, m('#fff0a0', '#ffe066'), 0, -17.4, 2);
      this.wandTip = fl;
    } else if (kind === 'mirror') {
      B(1.1, 5, 1.1, m('#8e5d3e'), 0, -7, 2);
      const fr = new THREE.Mesh(new THREE.CylinderGeometry(2.6 * P, 2.6 * P, 0.8 * P, 12), m('#e0b03a'));
      fr.rotation.x = Math.PI / 2; fr.position.set(0, -11.5 * P, 2 * P); g.add(fr);
      const gl = new THREE.Mesh(new THREE.CylinderGeometry(2 * P, 2 * P, 0.9 * P, 12), m('#dff4ff', '#9fdcff'));
      gl.rotation.x = Math.PI / 2; gl.position.set(0, -11.5 * P, 2.1 * P); g.add(gl);
      this.wandTip = gl;
    } else if (kind === 'wateringcan') {
      B(4.2, 4.6, 3.2, m('#6fa8c8'), -1.5, -9, 3); B(3.4, 0.8, 0.8, m('#4a7a98'), -1.5, -6.3, 3);
      B(1, 5.5, 1, m('#6fa8c8'), 2.6, -10, 3).rotation.z = -1.0; B(1.8, 1, 1.8, m('#d8f0ff'), 4.6, -11.6, 3);
    } else if (kind === 'shears') {
      B(0.9, 6, 0.6, m('#dcdce8'), -0.6, -12, 2).rotation.z = 0.2; B(0.9, 6, 0.6, m('#dcdce8'), 0.6, -12, 2.4).rotation.z = -0.2;
      B(1.4, 3, 1.4, m('#c8454f'), -0.7, -7, 2); B(1.4, 3, 1.4, m('#c8454f'), 0.7, -7, 2.4);
    } else if (kind === 'rake') {
      B(1, 20, 1, m('#8e5d3e'), 0, -6, 2); B(6, 0.9, 1, m('#8a8492'), 0, -16.4, 2);
      for (const x of [-2.4, -0.8, 0.8, 2.4]) B(0.5, 2, 0.5, m('#a8a4b0'), x, -17.6, 2.6);
    } else if (kind === 'puffer') {
      B(1, 3, 1, m('#8e5d3e'), 0, -6.5, 2);
      const bulb = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2 * P, 0), m('#e0c050')); bulb.position.set(0, -9.5 * P, 2.5 * P); g.add(bulb);
      B(0.9, 0.9, 3, m('#8a5a36'), 0, -9.5, 5.2);
    } else if (kind === 'whisk') {
      B(1.2, 5, 1.2, m('#8e5d3e'), 0, -7, 2);
      for (let i = 0; i < 3; i++) { const w = new THREE.Mesh(new THREE.TorusGeometry(1.6 * P, 0.25 * P, 4, 10), m('#dcdce8')); w.scale.set(1, 2, 1); w.position.set(0, -12 * P, 2 * P); w.rotation.y = (i / 3) * Math.PI; g.add(w); }
    } else if (kind === 'ladle') {
      B(0.8, 9, 0.8, m('#c8c4d0'), 0, -8.5, 2);
      const cup = new THREE.Mesh(new THREE.SphereGeometry(2 * P, 8, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), m('#c8c4d0')); cup.position.set(0, -13 * P, 3 * P); g.add(cup);
      B(3, 0.4, 3, m('#e8b070'), 0, -13.1, 3);
    } else if (kind === 'spatula') {
      B(1, 7, 1, m('#8e5d3e'), 0, -8, 2); B(3.6, 4, 0.5, m('#a8a4b0'), 0, -13.5, 2.4);
      for (const x of [-0.8, 0.8]) B(0.4, 2.6, 0.6, m('#4a4652'), x, -13.5, 2.4);
    } else if (kind === 'peppermill') {
      B(2, 6, 2, m('#8a5a36'), 0, -9, 2.5); B(2.4, 1, 2.4, m('#6b4330'), 0, -12.3, 2.5); B(0.8, 1.4, 0.8, m('#e8c890'), 0, -13.4, 2.5);
    } else if (kind === 'wrench') {
      B(1.3, 11, 1, m('#a8a4b0'), 0, -9.5, 2);
      B(4, 2.4, 1.2, m('#a8a4b0'), 0, -16, 2); B(1.2, 1.6, 1.3, m('#a8a4b0'), -1.4, -17.6, 2); B(1.2, 1.6, 1.3, m('#a8a4b0'), 1.4, -17.6, 2);
      B(1.5, 3, 1.4, m('#c8454f'), 0, -5.4, 2);
    } else if (kind === 'rivetgun') {
      B(1.4, 3.4, 1.4, m('#6b4330'), 0, -6.5, 2); B(2, 2.2, 5.5, m('#8a8492'), 0, -8.6, 4); B(0.8, 0.8, 2, m('#c8c4d0'), 0, -8.6, 7.4);
    } else if (kind === 'toolbox') {
      B(5, 3.4, 2.8, m('#c8454f'), 0, -9, 2.5); B(5.2, 0.8, 3, m('#8a2a2a'), 0, -7.4, 2.5); B(2, 0.6, 0.6, m('#3b2a2e'), 0, -6.4, 2.5);
    } else if (kind === 'magnet') {
      B(1, 4, 1, m('#8e5d3e'), 0, -6.5, 2);
      B(1.4, 4, 1.4, m('#e04848'), -1.6, -10.5, 2); B(1.4, 4, 1.4, m('#e04848'), 1.6, -10.5, 2); B(4.6, 1.4, 1.4, m('#e04848'), 0, -8.8, 2);
      B(1.5, 1.2, 1.5, m('#e8e8f0'), -1.6, -12.8, 2); B(1.5, 1.2, 1.5, m('#e8e8f0'), 1.6, -12.8, 2);
    }
    this.prop = g;
    arm.add(g);
  }

  // Bram's red bicycle, parented to the root so it turns with the rider
  setBike(on) {
    if (!!this.bike === !!on) return;
    if (!on) { this.root.remove(this.bike); this.bike = null; return; }
    const g = new THREE.Group();
    const m = (c, key) => toon(this.r3d, { color: c, key });
    const red = m('#d9364a', 'bikeRed'), dark = m('#3b3844', 'bikeTyre'), chrome = m('#c9c4cc', 'bikeChrome'), seat = m('#6b4330', 'bikeSeat');
    const B = (w, h, d, mat, x, y, z, parent = g) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); b.position.set(x, y, z); b.castShadow = true; parent.add(b); return b; };
    this.wheels = [];
    for (const z of [-0.36, 0.38]) {
      const w = new THREE.Group();
      w.position.set(0, 0.19, z);
      const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 5, 12), dark);
      tyre.rotation.y = Math.PI / 2;
      tyre.castShadow = true;
      w.add(tyre);
      for (let i = 0; i < 2; i++) { const sp = B(0.02, 0.3, 0.02, chrome, 0, 0, 0, w); sp.rotation.x = i * Math.PI / 2; }
      g.add(w);
      this.wheels.push(w);
    }
    const bar = B(0.05, 0.05, 0.62, red, 0, 0.36, 0.0);
    bar.rotation.x = -0.12;
    B(0.05, 0.3, 0.05, red, 0, 0.3, -0.18);
    B(0.05, 0.36, 0.05, red, 0, 0.36, 0.34).rotation.x = 0.25;
    B(0.16, 0.05, 0.22, seat, 0, 0.47, -0.2);
    B(0.44, 0.04, 0.04, chrome, 0, 0.56, 0.3);
    B(0.2, 0.14, 0.16, m('#c49a64', 'bikeBasket'), 0, 0.5, 0.46);
    B(0.1, 0.04, 0.1, m('#ffd66b', 'bikeLamp'), 0, 0.42, 0.52);
    this.bike = g;
    this.root.add(g);
  }

  // keep the contact shadow on the ground while the body hops
  setAir(h) {
    if (!this.blob) return;
    this.blob.position.y = 0.01 - h;
    const k = Math.max(0.55, 1 - h * 0.6);
    this.blob.scale.set(k, 1, k);
  }

  // turn instantly (portraits, the creator's turntable)
  setFacing(a) {
    this.facing = this.targetFacing = a;
    this.root.rotation.y = a;
    this.unspin.rotation.y = -a; this.spin.rotation.y = a;
  }

  setExpression(expr) {
    if (this.expr === expr) return;
    this.expr = expr;
    this.faceMat.map = this.faceTex[expr] || this.faceTex.neutral;
  }

  // state: { moving: bool, speed: 0..1 (walk=0.5, run=1), dir: {x,z}, talking: bool }
  update(dt, state = {}) {
    if (state.dir && (state.dir.x || state.dir.z)) this.targetFacing = Math.atan2(state.dir.x, state.dir.z);
    // shortest-arc turn
    let d = this.targetFacing - this.facing;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.facing += d * Math.min(1, dt * 14);
    this.root.rotation.y = this.facing;
    this.unspin.rotation.y = -this.facing; this.spin.rotation.y = this.facing;

    const moving = !!state.moving;
    const sp = state.speed || 0.5;
    if (moving) this.walkPhase += dt * (7 + sp * 7);
    else this.walkPhase *= Math.max(0, 1 - dt * 12);
    const sw = moving ? Math.sin(this.walkPhase) : Math.sin(this.walkPhase) * 0.3;
    const amp = moving ? 0.55 + sp * 0.25 : 0;
    const sit = !!state.sit && !moving;
    const air = state.air !== undefined && state.air !== null;
    if (air && !this.bike) {
      // mid-hop: knees tucked, arms flung up (higher while rising)
      const up = state.air > 0 ? 1 : 0.6;
      this.legs[0].rotation.x = -0.75; this.legs[1].rotation.x = 0.35;
      this.arms[0].rotation.x = -2.5 * up; this.arms[1].rotation.x = state.armPose !== undefined ? state.armPose : -2.5 * up;
      this.body.position.y = 0;
    } else if (this.bike) {
      // pedalling: legs circle, hands on the handlebars, wheels spin
      this.pedal = (this.pedal || 0) + (moving ? dt * (6 + sp * 6) : 0);
      this.legs[0].rotation.x = -0.9 + Math.sin(this.pedal) * 0.55;
      this.legs[1].rotation.x = -0.9 - Math.sin(this.pedal) * 0.55;
      this.arms[0].rotation.x = -1.15;
      this.arms[1].rotation.x = -1.15;
      this.body.position.y = 0.2 + (moving ? Math.abs(Math.sin(this.pedal)) * 0.4 * P : 0);
      for (const w of this.wheels) w.rotation.x += moving ? dt * (4 + sp * 8) : 0;
    } else {
      this.legs[0].rotation.x = sit ? -1.35 : sw * amp;
      this.legs[1].rotation.x = sit ? -1.35 : -sw * amp;
      this.arms[0].rotation.x = -sw * amp * 0.9;
      this.arms[1].rotation.x = state.armPose !== undefined ? state.armPose : sw * amp * 0.9;
      const bob = moving ? Math.abs(Math.cos(this.walkPhase)) * 1.1 * P : 0;
      this.body.position.y = bob - (sit ? 3 * P : 0);
    }
    if (state.armPoseL !== undefined && !air) this.arms[0].rotation.x = state.armPoseL;
    // arms out for balance while gliding on ice
    const slide = !!state.slide && !air;
    this.arms[0].rotation.z = slide ? -1.1 : 0;
    this.arms[1].rotation.z = slide ? 1.1 : 0;
    // knocked out (Party Mode): flat on the back, arms out — asleep by a campfire: arms by the sides
    const down = !!state.down;
    this.body.rotation.x = down ? -Math.PI / 2 : (state.lean || 0);
    if (down) { const k = state.sleep ? 0.22 : 1.2; this.body.position.y = 0.2; this.arms[0].rotation.z = -k; this.arms[1].rotation.z = k; this.legs[0].rotation.x = 0.1; this.legs[1].rotation.x = -0.1; }
    if (slide) { this.legs[0].rotation.x = 0.25; this.legs[1].rotation.x = -0.15; }
    // squash on landing, stretch while rising
    const sq = state.squash || 0, st = air && state.air > 0 ? Math.min(1, state.air / 6) : 0;
    const bs = this.scale;
    this.body.scale.set(bs * (1 + sq * 0.12 - st * 0.05), bs * (1 - sq * 0.16 + st * 0.08), bs * (1 + sq * 0.12 - st * 0.05));
    // idle breathing & head sway
    const t = performance.now() / 1000;
    if (!moving) this.head.rotation.z = Math.sin(t * 1.3 + this.root.id) * 0.03;
    else this.head.rotation.z = 0;
    this.head.position.y = !moving ? Math.round(Math.sin(t * 2.2 + this.root.id) * 0.5) * 0.4 * P : 0;

    // face: blinking & talking
    if (state.expr) { this.setExpression(state.expr); return; }
    this.blinkT -= dt;
    let ex = 'neutral';
    if (this.blinkT < 0) { ex = 'blink'; if (this.blinkT < -0.12) this.blinkT = 2.5 + Math.random() * 3.5; }
    if (state.talking) {
      this.talkT += dt;
      if (Math.floor(this.talkT * 9) % 2 === 0) ex = 'talk';
    }
    if (state.mood) ex = ex === 'blink' ? 'blink' : state.mood;
    this.setExpression(ex);
  }
}

// ---------------------------------------------------------------------------
// Pets
// ---------------------------------------------------------------------------
export const PET_KINDS = { cat: 'Cat', dog: 'Dog', bunny: 'Bunny' };
export const PET_COLORS = {
  ginger: '#e0924a', grey: '#9a96a4', black: '#3b3844', white: '#f2eee6', brown: '#8a5d42', golden: '#e0b060', cream: '#efe0c4', calico: '#f0e6d8',
};

export class PetModel {
  constructor(r3d, kind = 'cat', color = 'ginger') {
    this.r3d = r3d;
    this.root = new THREE.Group();
    this.kind = kind; this.color = color;
    this.phase = 0; this.facing = 0; this.targetFacing = 0;
    this.build();
  }
  build() {
    const c = ramp(PET_COLORS[this.color] || '#e0924a');
    const m = (col, key) => toon(this.r3d, { color: col, key: key ? 'pet' + key + col : undefined });
    const g = new THREE.Group();
    this.body = g;
    this.root.add(g);
    const box = (w, h, d, mat, x, y, z, parent = g) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w * P, h * P, d * P), mat);
      b.position.set(x * P, y * P, z * P);
      b.castShadow = true; b.receiveShadow = true;
      parent.add(b);
      return b;
    };
    const k = this.kind;
    const mM = m(c.m, 'm'), mD = m(c.d, 'd'), mL = m(c.l, 'l');
    const bodyL = k === 'bunny' ? 6 : 8, bodyH = k === 'bunny' ? 5 : 4, bodyW = k === 'bunny' ? 6 : 6;
    // body with a lighter belly/top stripe
    box(bodyW, bodyH, bodyL, mM, 0, 3 + bodyH / 2, 0);
    box(bodyW - 2, 0.6, bodyL - 2, mL, 0, 3 + bodyH + 0.2, -0.5);
    if (this.color === 'calico') { box(bodyW + 0.2, 2, 3, m('#e0924a'), 0, 3 + bodyH - 0.6, -1.5); box(bodyW + 0.2, 1.6, 2, m('#3b3844'), 0, 3 + bodyH - 0.6, 2); }
    this.legs = [];
    const lx = bodyW / 2 - 1.2, lz = bodyL / 2 - 1.4;
    for (const [x, z] of [[-lx, lz], [lx, lz], [-lx, -lz], [lx, -lz]]) {
      const piv = new THREE.Group();
      piv.position.set(x * P, 3.2 * P, z * P);
      g.add(piv);
      box(2, 3.2, 2, mD, 0, -1.6, 0, piv);
      this.legs.push(piv);
    }
    const head = new THREE.Group();
    head.position.set(0, (3 + bodyH - 0.5) * P, (bodyL / 2 - 0.2) * P);
    g.add(head);
    this.head = head;
    const HW = 7, HH = 6, HD = 5;
    const fp = new Painter(HW, HH);
    fp.rect(0, 0, HW, HH, c.m);
    fp.rect(1, 3, HW - 2, 3, k === 'dog' ? c.l : c.m);
    fp.px(1, 2, '#2a2433'); fp.px(5, 2, '#2a2433'); fp.px(1, 1, c.d); fp.px(5, 1, c.d);
    fp.px(3, 3, k === 'dog' ? '#2a2433' : '#e87a8a');
    fp.px(2, 4, c.d); fp.px(4, 4, c.d);
    fp.px(0, 4, '#f5a3a3'); fp.px(6, 4, '#f5a3a3');
    const face = toon(this.r3d, { map: pixelTexture(fp.c) });
    box(HW, HH, HD, [mM, mM, mL, mM, face, mM], 0, HH / 2, HD / 2 - 1, head);
    if (k === 'cat') {
      for (const sx of [-2.5, 2.5]) { box(2, 2, 1.2, mD, sx, HH + 0.8, 0.5, head); box(1, 1, 1.3, m('#f4a4b6', 'pink'), sx, HH + 0.4, 1.1, head); }
      this.tail = new THREE.Group();
      this.tail.position.set(0, (3 + bodyH) * P, (-bodyL / 2) * P);
      g.add(this.tail);
      box(1.4, 1.4, 4, mD, 0, 0.6, -2, this.tail);
      box(1.4, 3, 1.4, mD, 0, 2.6, -3.6, this.tail);
    } else if (k === 'dog') {
      box(3.4, 2.4, 2.4, mL, 0, 1.6, HD - 0.4, head);
      box(1.4, 1, 1, m('#2a2433', 'nose'), 0, 2.6, HD + 0.9, head);
      for (const sx of [-3.9, 3.9]) box(1.4, 4, 2.4, mD, sx, HH - 2.2, 0.8, head);
      this.tail = new THREE.Group();
      this.tail.position.set(0, (3 + bodyH) * P, (-bodyL / 2) * P);
      g.add(this.tail);
      box(1.4, 1.4, 3.5, mM, 0, 1.2, -1.4, this.tail).rotation.x = 0.7;
    } else {
      for (const sx of [-1.5, 1.5]) { box(1.6, 6, 1.2, mM, sx, HH + 3, 0.2, head); box(0.8, 4.4, 0.3, m('#f4a4b6', 'pink'), sx, HH + 2.8, 0.9, head); }
      this.tail = new THREE.Group();
      this.tail.position.set(0, (3 + bodyH / 2) * P, (-bodyL / 2) * P);
      g.add(this.tail);
      box(2.6, 2.6, 2, m('#ffffff', 'white'), 0, 0, -0.8, this.tail);
    }
    if (!PetModel.blobGeo) {
      PetModel.blobGeo = new THREE.CircleGeometry(0.3, 10);
      PetModel.blobGeo.rotateX(-Math.PI / 2);
    }
    const blob = new THREE.Mesh(PetModel.blobGeo, CharModel.blobMat || new THREE.MeshBasicMaterial({ color: 0x1b1426, transparent: true, opacity: 0.22, depthWrite: false }));
    blob.position.y = 0.01;
    this.root.add(blob);
    this.blob = blob;
  }
  update(dt, state = {}) {
    if (state.dir && (state.dir.x || state.dir.z)) this.targetFacing = Math.atan2(state.dir.x, state.dir.z);
    let d = this.targetFacing - this.facing;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.facing += d * Math.min(1, dt * 10);
    this.root.rotation.y = this.facing;
    const moving = !!state.moving;
    if (moving) this.phase += dt * 14; else this.phase *= 0.9;
    const s = Math.sin(this.phase) * (moving ? 0.6 : 0);
    this.legs[0].rotation.x = s; this.legs[3].rotation.x = s;
    this.legs[1].rotation.x = -s; this.legs[2].rotation.x = -s;
    const t = performance.now() / 1000;
    if (this.tail) this.tail.rotation.y = Math.sin(t * (state.happy ? 12 : 3)) * 0.4;
    this.body.position.y = moving ? Math.abs(Math.cos(this.phase)) * P : 0;
    this.body.scale.y = state.sit ? 0.85 : 1;
  }
}
