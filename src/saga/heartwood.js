// The Heartwood’s look (World v7, chapter 8): inside the Great Tree — floors of heartwood
// in growth rings round each chamber’s heart, amber sap welling from the cracks, glowing
// moss; walls and gates borrowed from the Rootway (the roots theme). And its props: a
// bead of amber with something caught inside, and the Heartlight’s knot.

const TX = 16;
const hash = (x, z) => { const v = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return v - Math.floor(v); };

export function heartwoodFloor(p, d) {
  const W = d.W * TX, H = d.H * TX, ctx = p.ctx, img = ctx.createImageData(W, H), px = img.data;
  const RING = [[168, 118, 70], [150, 102, 58], [182, 132, 80], [140, 94, 54]];
  const set = (i, c, k = 1) => { px[i] = c[0] * k; px[i + 1] = c[1] * k; px[i + 2] = c[2] * k; px[i + 3] = 255; };
  const near = new Float32Array(d.W * d.H).fill(9);
  for (let z = 0; z < d.H; z++) for (let x = 0; x < d.W; x++) {
    if (d.g[d.I(x, z)] === 0) continue;
    let m = 9;
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (d.at(x + dx, z + dz) === 0) m = Math.min(m, Math.hypot(dx, dz));
    near[d.I(x, z)] = m;
  }
  const roomAt = (tx, tz) => d.rooms.find((r) => tx >= r.x && tx < r.x + r.w && tz >= r.z && tz < r.z + r.h);
  for (let Z = 0; Z < H; Z++) for (let X = 0; X < W; X++) {
    const tx = (X / TX) | 0, tz = (Z / TX) | 0, v = d.g[d.I(tx, tz)], i = (Z * W + X) * 4;
    if (v === 0) { set(i, [18, 12, 8]); continue; }
    // (growth rings round the chamber’s middle; the corridors are plain grain)
    const r = roomAt(tx, tz);
    let band = 0;
    if (r) { const cx = (r.x + r.w / 2) * TX, cz = (r.z + r.h / 2) * TX, dd = Math.hypot((X - cx) * 1, (Z - cz) * 1.25) + Math.sin(X * 0.05 + Z * 0.04) * 3; band = Math.floor(dd / 7); if (dd % 7 < 1) band = -1; }
    else band = Math.floor((X + Math.sin(Z * 0.08) * 4) / 6);
    const c = band < 0 ? [110, 72, 40] : RING[((band % 4) + 4) % 4];
    const wall = near[d.I(tx, tz)], k = wall < 1.2 ? 0.64 : wall < 2 ? 0.82 : 1;
    set(i, c, k);
    if (hash(X, Z) > 0.992) set(i, [96, 62, 36], k);
  }
  ctx.putImageData(img, 0, 0);
  // amber sap welling from cracks, and glowing moss near the walls
  let h = 811;
  const rnd = () => { h = (h * 1103515245 + 12345) & 0x7fffffff; return h / 0x7fffffff; };
  for (let z = 0; z < d.H; z++) for (let x = 0; x < d.W; x++) {
    if (d.g[d.I(x, z)] !== 1) continue;
    const X = x * TX, Z = z * TX;
    if (rnd() < 0.035) { const sx = X + 3 + rnd() * 8, sz = Z + 3 + rnd() * 8, w = 3 + rnd() * 4; p.rect(sx, sz, w, 2, '#e8a030'); p.rect(sx + 1, sz + 2, w - 2, 1, '#b87818'); p.px(sx + 1, sz, '#ffe0a0'); }
    if (near[d.I(x, z)] < 1.6 && rnd() < 0.3) { const sx = X + rnd() * 13, sz = Z + rnd() * 13; p.rect(sx, sz, 2, 1, '#8ae0a0'); p.px(sx, sz + 1, '#5ab078'); }
  }
}

export const HEARTWOOD_PROPS = {
  // a bead of amber sap with a little gloom bug stuck inside it (forever, grumpily)
  amber(K, g, s) {
    const a = K.c('#e8a030').clone(); a.transparent = true; a.opacity = 0.8;
    K.noCast(K.put(g, K.ball(0.45 * s, 10, 8), a, 0, 0.35 * s, 0)).scale.y = 0.75;
    K.put(g, K.box(0.14 * s, 0.08 * s, 0.1 * s), K.c('#3a2a4a'), 0.05, 0.36 * s, 0.05);
    return { light: { y: 0.6, color: '#ffb040', power: 0.6, dist: 3.5 }, r: 0.4 * s };
  },
  // the Heartlight’s knot: a burl of old wood round a hollow where the light lives
  heartknot(K, g, s) {
    const bark = K.c('#6a4a30'), barkD = K.c('#4a3220');
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; K.put(g, K.box(0.5 * s, 1.6 * s, 0.5 * s), i % 2 ? bark : barkD, Math.cos(a) * 1.1 * s, 0.8 * s, Math.sin(a) * 0.9 * s, -a).rotation.x = 0.15; }
    const heart = K.noCast(K.put(g, K.ball(0.55 * s, 12, 10), K.glow('#8a7a6a', '#6a5a4a', 0.2), 0, 1.1 * s, 0));
    heart.material = heart.material.clone();
    g.userData.heart = heart;
    return { r: 1.3 * s };
  },
};
