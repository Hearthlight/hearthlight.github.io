// The dawn beam (room kind `beam`, World v7 chapter 7 — the Lantern Pagoda): the
// kites’ light comes in through a golden lens and runs across the floor as a beam.
//   sun: [x, z, ’n’|’s’|’e’|’w’]     the lens, and the way it shines
//   mirrors: [[x, z, o, fixed]]      bronze mirrors: o 0 = ’/’, 1 = ’\’ — step on the
//                                    plate in front of one to turn it
//   prisms: [[x, z]]                 split the beam both ways, square to it
//   screens: [[x, z, ’x’|’z’, len]]  paper screens (and walls): a second in the beam
//                                    and they burn away
//   lotus: [[x, z]]                  lanterns the beam must light — all at once — to
//                                    open `opens`
//   dawn: { at: [x, z], r }          (the roof) the Dawn Mirror: the light falls on it
//                                    from the sky; step on one of the eight plates
//                                    round it and it shines that way
// Anything in the room answering `onBeam(e)` (the Paper Dragon) is caught in it.
//   look: 'cave'                     (the Glimmer Grotto) a crack of Old Glimmer’s light
//                                    through the rock instead of a lens, and sea crystals
//                                    that blaze instead of lotus lanterns

import { THREE } from '../render/r3d.js';
import { audio } from '../engine/audio.js';
import { t } from '../i18n.js';

const DIRS = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
const EIGHT = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]].map(([x, z]) => { const l = Math.hypot(x, z); return [x / l, z / l]; });
const Y = 1.15;

export function buildBeam(d, r) {
  const K = d.K, root = K.grp(d.root, 0, 0, 0);
  const B = { root, segs: [], mirrors: [], prisms: [], screens: [], lotus: [], lens: null, dawn: null, sig: '', lit: 0 };
  const bronze = K.c('#c8923a'), bronzeD = K.c('#8a5a2a'), wood = K.c('#6a3a2a'), lacq = K.c('#b8302a'), gold = K.glow('#f2c14e', '#c89020', 0.4);
  const plateM = K.glow('#e8c070', '#c8923a', 0.3);
  B.core = new THREE.MeshBasicMaterial({ color: 0xfff4c0, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  B.halo = new THREE.MeshBasicMaterial({ color: 0xffc860, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
  // the lens the light comes through (and its shaft, down from the sky)
  const cave = r.look === 'cave';
  if (r.sun) {
    const [x, z, dir] = r.sun, g = K.grp(root, x, 0, z);
    if (cave) {
      // (a boulder under the crack, a crystal on it catching the light)
      K.put(g, K.geo('beam-rock', () => new THREE.DodecahedronGeometry(0.6, 0)), K.c('#5a5462'), 0, 0.4, 0).scale.set(1, 0.7, 1);
      K.put(g, K.cone(0.14, 0.5, 5), K.glow('#9fe8ff', '#5ad0ff', 0.9), 0.2, 0.9, 0);
    } else {
      K.put(g, K.cyl(0.4, 0.5, 0.7, 8), lacq, 0, 0.35, 0);
      K.put(g, K.cyl(0.46, 0.46, 0.08, 8), gold, 0, 0.72, 0);
    }
    const lens = K.noCast(K.put(g, K.ball(0.34, 10, 8), K.glow('#fff4c0', '#ffd66b', 1.4), 0, Y, 0));
    lens.scale.set(1, 1, 0.5); lens.rotation.y = Math.atan2(DIRS[dir][0], DIRS[dir][1]);
    const shaft = K.noCast(K.put(g, K.box(0.9, 7, 0.9), K.light('#ffe8a0', 0.14), 0, 4.5, 0));
    shaft.renderOrder = 3;
    B.lens = { x, z, dir, g };
    d.lights.push({ x: d.ox + x, y: 1.4, z: d.oz + z + 0.3, color: '#ffe0a0', power: 1.2, dist: 5, lamp: true });
  }
  for (const [x, z, o, fixed] of r.mirrors || []) {
    const g = K.grp(root, x, 0, z);
    K.put(g, K.box(0.5, 0.14, 0.5), wood, 0, 0.07, 0);
    K.put(g, K.box(0.1, 0.9, 0.1), wood, 0, 0.55, 0);
    const turn = K.grp(g, 0, Y, 0);
    K.put(turn, K.cyl(0.46, 0.46, 0.08, 16), bronzeD, 0, 0, 0, 0, Math.PI / 2);
    const face = K.put(turn, K.cyl(0.4, 0.4, 0.1, 16), K.glow('#f4d890', '#c89a4a', 0.25), 0, 0, 0.02, 0, Math.PI / 2);
    face.material = face.material.clone();
    K.put(turn, K.ball(0.07, 6, 4), gold, 0, 0.5, 0);
    const M = { x, z, o, fixed: !!fixed, g, turn, face, ry: o ? -Math.PI / 4 : Math.PI / 4, plate: null, near: false, hot: 0 };
    turn.rotation.y = M.ry;
    if (!fixed) {
      const px = x, pz = z + 1.15, pl = K.grp(root, px, 0, pz);
      const disc = K.noCast(K.put(pl, K.cyl(0.36, 0.4, 0.06, 12), plateM, 0, 0.03, 0));
      disc.material = disc.material.clone();
      // (a curved arrow: this one turns the mirror)
      for (let k = 0; k < 5; k++) { const a = -0.9 + k * 0.45; K.noCast(K.put(pl, K.box(0.08, 0.03, 0.08), K.c('#5a3a1a'), Math.sin(a) * 0.22, 0.07, -Math.cos(a) * 0.22)); }
      M.plate = { x: px, z: pz, disc };
    }
    d.colliders.push({ x, z, r: 0.34 });
    B.mirrors.push(M);
  }
  for (const [x, z] of r.prisms || []) {
    const g = K.grp(root, x, 0, z);
    K.put(g, K.cyl(0.3, 0.38, 0.8, 6), lacq, 0, 0.4, 0);
    const cr = K.noCast(K.put(g, K.geo('v7octa', () => new THREE.OctahedronGeometry(0.34, 0)), K.glow('#e8f4ff', '#a8d0ff', 0.4), 0, Y, 0));
    cr.material = cr.material.clone();
    d.colliders.push({ x, z, r: 0.34 });
    B.prisms.push({ x, z, g, cr, hot: 0 });
  }
  for (const [x, z, axis, len] of r.screens || []) {
    const g = K.grp(root, x, 0, z, axis === 'z' ? Math.PI / 2 : 0);
    const frame = K.c('#3a2418'), paper = K.tex('shoji' + len, 16, 16, (p) => { p.rect(0, 0, 16, 16, '#f4ecd8'); for (const q of [0, 5, 10, 15]) { p.rect(q, 0, 1, 16, '#6a4a30'); p.rect(0, q, 16, 1, '#6a4a30'); } p.px(3, 3, '#e8dcc0'); p.px(12, 8, '#e8dcc0'); }, { rx: len / 1.5, ry: 1 });
    const pan = K.put(g, K.box(len, 1.9, 0.08), paper, 0, 1.05, 0);
    pan.material = pan.material.clone();
    for (const s of [-1, 1]) K.put(g, K.box(0.14, 2.1, 0.16), frame, s * len / 2, 1.05, 0);
    K.put(g, K.box(len + 0.1, 0.12, 0.16), frame, 0, 2.05, 0);
    const col = axis === 'z' ? { rect: [x - 0.12, z - len / 2, 0.24, len] } : { rect: [x - len / 2, z - 0.12, len, 0.24] };
    d.colliders.push(col);
    B.screens.push({ x, z, axis, len, g, pan, col, heat: 0, burnt: false });
  }
  for (const [x, z] of r.lotus || []) {
    const g = K.grp(root, x, 0, z);
    K.put(g, cave ? K.geo('beam-rock', () => new THREE.DodecahedronGeometry(0.6, 0)) : K.cyl(0.14, 0.2, 0.7, 8), cave ? K.c('#5a5462') : wood, 0, cave ? 0.3 : 0.35, 0);
    const petals = [], pm = cave ? K.glow('#9fe8ff', '#5ad0ff', 0.1) : K.glow('#f4c8d8', '#ff8ab0', 0.1);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, p = K.grp(g, Math.cos(a) * 0.12, 0.78, Math.sin(a) * 0.12);
      const m = K.put(p, cave ? K.cone(0.09, 0.5, 5) : K.box(0.18, 0.34, 0.06), pm, 0, cave ? 0.24 : 0.16, 0);
      m.material = pm.clone();
      p.rotation.y = -a + Math.PI / 2; p.rotation.x = -0.35;
      petals.push({ p, m });
    }
    const heart = K.noCast(K.put(g, K.ball(0.12, 8, 6), K.glow('#fff0a0', '#ffd66b', 0.2), 0, 0.86, 0));
    heart.material = heart.material.clone();
    const L = { x: d.ox + x, z: d.oz + z + 0.2, y: 1.3, color: '#ffc8a0', power: 0, dist: 5, lamp: true };
    d.lights.push(L);
    d.colliders.push({ x, z, r: 0.3 });
    B.lotus.push({ x, z, g, petals, heart, light: L, lit: false, k: 0 });
  }
  if (r.dawn) {
    const [x, z] = r.dawn.at, g = K.grp(root, x, 0, z), rr = r.dawn.r || 2;
    K.put(g, K.cyl(0.9, 1.1, 0.5, 12), lacq, 0, 0.25, 0);
    K.put(g, K.cyl(0.95, 0.95, 0.08, 12), gold, 0, 0.52, 0);
    const turn = K.grp(g, 0, Y + 0.1, 0);
    K.put(turn, K.cyl(0.7, 0.7, 0.1, 18), bronzeD, 0, 0, 0, 0, Math.PI / 2);
    K.noCast(K.put(turn, K.cyl(0.62, 0.62, 0.12, 18), K.glow('#fff0c0', '#ffd66b', 0.6), 0, 0, 0.03, 0, Math.PI / 2));
    const shaft = K.noCast(K.put(g, K.box(1.2, 9, 1.2), K.light('#ffe8a0', 0.12), 0, 5.6, 0));
    shaft.renderOrder = 3;
    const plates = EIGHT.map(([dx, dz], k) => {
      const pl = K.grp(root, x + dx * rr, 0, z + dz * rr);
      const disc = K.noCast(K.put(pl, K.cyl(0.4, 0.44, 0.06, 12), plateM, 0, 0.03, 0));
      disc.material = disc.material.clone();
      // (an arrow: stand here and the light goes this way)
      K.noCast(K.put(pl, K.cone(0.18, 0.3, 3), K.c('#5a3a1a'), 0, 0.08, 0.1, 0, Math.PI / 2));
      pl.rotation.y = Math.atan2(dx, dz);
      return { k, x: x + dx * rr, z: z + dz * rr, disc, near: false };
    });
    d.colliders.push({ x, z, r: 1 });
    B.dawn = { x, z, g, turn, plates, dir: r.dawn.dir ?? 4 };
    turn.rotation.y = Math.atan2(EIGHT[B.dawn.dir][0], EIGHT[B.dawn.dir][1]);
    d.lights.push({ x: d.ox + x, y: 2, z: d.oz + z + 0.4, color: '#ffe0a0', power: 1.6, dist: 7, lamp: true });
  }
  return B;
}

// follow the light: its segments, and what it touches
export function traceBeam(r, B, { ignoreScreens = false } = {}) {
  const segs = [], hitM = new Set(), hitP = new Set(), hitS = new Set(), hitL = new Set();
  const x0 = r.x + 0.5, x1 = r.x + r.w - 0.5, z0 = r.z + 0.5, z1 = r.z + r.h - 0.5;
  const rays = [];
  if (B.lens) rays.push([B.lens.x, B.lens.z, ...DIRS[B.lens.dir], null]);
  if (B.dawn && B.dawn.on !== false) rays.push([B.dawn.x, B.dawn.z, ...EIGHT[B.dawn.dir], null]);
  const seen = new Set();
  while (rays.length && segs.length < 24) {
    const [x, z, dx, dz, from] = rays.shift();
    const key = x.toFixed(2) + ',' + z.toFixed(2) + ',' + dx.toFixed(2) + ',' + dz.toFixed(2);
    if (seen.has(key)) continue;
    seen.add(key);
    // (to the room’s wall)
    let best = Infinity, what = null;
    const tx = dx > 0.01 ? (x1 - x) / dx : dx < -0.01 ? (x0 - x) / dx : Infinity, tz = dz > 0.01 ? (z1 - z) / dz : dz < -0.01 ? (z0 - z) / dz : Infinity;
    best = Math.min(tx, tz);
    const axis = Math.abs(dx) < 0.01 || Math.abs(dz) < 0.01;
    const test = (ex, ez, tol, w) => {
      const a = (ex - x) * dx + (ez - z) * dz, p = Math.abs((ex - x) * dz - (ez - z) * dx);
      if (a > 0.05 && p < tol && a < best) { best = a; what = w; }
    };
    if (axis) {
      for (const M of B.mirrors) if (M !== from) test(M.x, M.z, 0.42, M);
      for (const Pr of B.prisms) if (Pr !== from) test(Pr.x, Pr.z, 0.42, Pr);
      for (const L of B.lotus) test(L.x, L.z, 0.45, L);
      if (!ignoreScreens) for (const S of B.screens) {
        if (S.burnt) continue;
        // (a screen across the beam: the beam runs square to its length)
        const across = S.axis === 'x' ? Math.abs(dx) < 0.01 : Math.abs(dz) < 0.01;
        if (!across) continue;
        const a = S.axis === 'x' ? (S.z - z) * dz : (S.x - x) * dx, off = S.axis === 'x' ? Math.abs(x - S.x) : Math.abs(z - S.z);
        if (a > 0.05 && off < S.len / 2 && a < best) { best = a; what = S; }
      }
    }
    const ex = x + dx * best, ez = z + dz * best;
    segs.push([x, z, ex, ez]);
    if (!what) continue;
    if (B.mirrors.includes(what)) {
      hitM.add(what);
      // ’/’ sends east→north, north→east, west→south, south→west; ’\’ the others
      const [nx, nz] = what.o ? [dz, dx] : [-dz, -dx];
      rays.push([what.x, what.z, nx, nz, what]);
    } else if (B.prisms.includes(what)) {
      hitP.add(what);
      rays.push([what.x, what.z, dz, dx, what], [what.x, what.z, -dz, -dx, what]);
    } else if (B.lotus.includes(what)) hitL.add(what);
    else hitS.add(what);
  }
  return { segs, hitM, hitP, hitS, hitL };
}

// the room each frame
export function beamRoom(d, r, inside, dt) {
  const B = r.bm;
  if (!B) return;
  const P = d.P, C = P.combat;
  if (r.run && r.state === 'idle' && inside.length) { r.state = 'running'; r.run(d.D.saga, d, r); }
  else if (r.state === 'running' && r.tick) r.tick(d.D.saga, d, r, dt);
  const onPlate = (x, z) => inside.some((p) => !p.flight && Math.hypot(p.pos.x - d.ox - x, p.pos.z - d.oz - z) < 0.55);
  // stepped on: a mirror turns
  for (const M of B.mirrors) {
    if (M.plate) {
      const nr = onPlate(M.plate.x, M.plate.z);
      if (nr && !M.near && !r.solved) { M.o = 1 - M.o; audio.sfx('unlock', { volume: 0.6, pitch: M.o ? 3 : -2 }); P.world.fx.emit('sparkle', d.ox + M.x, 1.4, d.oz + M.z, 6, { color: '#ffe08a' }); }
      M.near = nr;
      M.plate.disc.material.emissiveIntensity = nr ? 1 : 0.3;
    }
    const to = M.o ? -Math.PI / 4 : Math.PI / 4;
    M.ry += (to - M.ry) * Math.min(1, dt * 10);
    M.turn.rotation.y = M.ry;
  }
  if (B.dawn) for (const pl of B.dawn.plates) {
    const nr = onPlate(pl.x, pl.z);
    if (nr && !pl.near && B.dawn.dir !== pl.k) { B.dawn.dir = pl.k; audio.sfx('unlock', { volume: 0.7, pitch: pl.k }); }
    pl.near = nr;
    pl.disc.material.emissiveIntensity = B.dawn.dir === pl.k ? 1.1 : nr ? 0.8 : 0.25;
  }
  if (B.dawn) { const to = Math.atan2(EIGHT[B.dawn.dir][0], EIGHT[B.dawn.dir][1]); let dr = to - B.dawn.turn.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); B.dawn.turn.rotation.y += dr * Math.min(1, dt * 8); }
  // the light’s way through the room
  const T = traceBeam(r, B);
  // (segments: a bright core in a soft halo, pooled)
  T.segs.forEach(([ax, az, bx, bz], i) => {
    let s = B.segs[i];
    if (!s) {
      const core = new THREE.Mesh(d.K.box(1, 1, 1), B.core), halo = new THREE.Mesh(d.K.box(1, 1, 1), B.halo);
      core.renderOrder = 4; halo.renderOrder = 4; core.frustumCulled = false; halo.frustumCulled = false;
      B.root.add(core, halo);
      s = B.segs[i] = { core, halo };
    }
    const L = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az), cx = (ax + bx) / 2, cz = (az + bz) / 2;
    const w = 0.13 + Math.sin(d.t * 18 + i) * 0.015;
    for (const [m, k] of [[s.core, 1], [s.halo, 3.2]]) { m.visible = true; m.position.set(cx, Y, cz); m.rotation.set(0, ry, 0); m.scale.set(w * k, w * k, L); }
  });
  for (let i = T.segs.length; i < B.segs.length; i++) { B.segs[i].core.visible = false; B.segs[i].halo.visible = false; }
  // (sparks where it strikes)
  if (Math.random() < dt * 14) { const sg = T.segs[Math.floor(Math.random() * T.segs.length)]; if (sg) P.world.fx.emit('sparkle', d.ox + sg[2], Y, d.oz + sg[3], 1, { color: '#fff0a0' }); }
  for (const M of B.mirrors) { M.hot = T.hitM.has(M) ? 1 : Math.max(0, M.hot - dt * 3); M.face.material.emissiveIntensity = 0.25 + M.hot * 1.3; }
  for (const Pr of B.prisms) { Pr.hot = T.hitP.has(Pr) ? 1 : Math.max(0, Pr.hot - dt * 3); Pr.cr.material.emissiveIntensity = 0.4 + Pr.hot * 1.6; Pr.cr.rotation.y += dt * (0.6 + Pr.hot * 3); }
  // paper burns
  for (const S of B.screens) {
    if (S.burnt) continue;
    if (T.hitS.has(S)) {
      S.heat += dt;
      if (Math.random() < dt * 20) P.world.fx.emit('smoke', d.ox + S.x + (Math.random() - 0.5) * 0.4, 1 + Math.random(), d.oz + S.z, 1, { color: '#8a7a6a' });
      S.pan.material.color.setRGB(1, 1 - S.heat * 0.4, 1 - S.heat * 0.7);
      if (S.heat > 1) {
        S.burnt = true; S.col.disabled = true; S.g.visible = false;
        audio.sfx('crackle', { volume: 0.8 }); audio.sfx('poof', { volume: 0.5 });
        for (let k = 0; k < 14; k++) P.world.fx.emit('firework', d.ox + S.x + (Math.random() - 0.5) * S.len * (S.axis === 'x' ? 1 : 0.1), 1 + Math.random() * 1.5, d.oz + S.z + (Math.random() - 0.5) * S.len * (S.axis === 'z' ? 1 : 0.1), 1, { color: Math.random() < 0.5 ? '#ffb040' : '#ff6a2a' });
        P.world.fx.emit('smoke', d.ox + S.x, 1.2, d.oz + S.z, 10, { color: '#6a5a4a' });
        if (!r.burnTold) { r.burnTold = true; P.toast(t(r.burnt || 'The paper catches — and the beam goes on through!'), '#ffd66b'); }
      }
    } else S.heat = Math.max(0, S.heat - dt * 0.3);
  }
  // lotus lanterns: lit while the beam is on them
  let all = B.lotus.length > 0;
  for (const L of B.lotus) {
    const on = T.hitL.has(L) || (r.solved && r.keepLit !== false);
    if (on && !L.lit) { audio.sfx('chime', { volume: 0.6, pitch: 7 + B.lotus.indexOf(L) * 3 }); P.world.fx.emit('sparkle', d.ox + L.x, 1.2, d.oz + L.z, 10, { color: '#ffc8e0' }); }
    L.lit = on;
    L.k += ((on ? 1 : 0) - L.k) * Math.min(1, dt * 6);
    L.heart.material.emissiveIntensity = 0.2 + L.k * 1.8;
    for (const { p, m } of L.petals) { p.rotation.x = -0.35 - L.k * 0.55; m.material.emissiveIntensity = 0.1 + L.k * 0.9; }
    L.light.power = L.k * 1.3;
    if (!on) all = false;
  }
  if (!r.solved && all) {
    B.lit += dt;
    if (B.lit > 0.4) {
      r.solved = true;
      for (const id of r.opens || []) { const G = d.gate(id); if (G) d.setGate(G, true); }
      audio.sfx('chord', { volume: 0.7 }); audio.jingle('questDone');
      P.showBanner(t(r.done || 'The lotus lanterns bloom!'), '');
      if (r.onClear) r.onClear(d.D.saga, d, r);
    }
  } else if (!all) B.lit = 0;
  // whatever answers the light (the Paper Dragon, grounded)
  if (C) for (const e of C.enemies) {
    if (!e.alive || !e.onBeam) continue;
    const pts = e.beamPoints ? e.beamPoints(e) : [[e.x, e.z]];
    const hit = T.segs.some(([ax, az, bx, bz]) => pts.some(([px, pz]) => segDist(px - d.ox, pz - d.oz, ax, az, bx, bz) < (e.beamR || 0.9)));
    if (hit) e.onBeam(e, C, dt);
  }
}

function segDist(px, pz, ax, az, bx, bz) {
  const vx = bx - ax, vz = bz - az, L2 = vx * vx + vz * vz || 1e-6;
  const k = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / L2));
  return Math.hypot(px - ax - vx * k, pz - az - vz * k);
}

// (the harness) the mirrors’ turns that light every lotus, by trying them all
export function solveBeam(r) {
  const B = r.bm, M = B.mirrors.filter((m) => !m.fixed), n = M.length;
  for (let mask = 0; mask < 1 << n; mask++) {
    M.forEach((m, i) => { m.o = (mask >> i) & 1; });
    const T = traceBeam(r, B, { ignoreScreens: true });
    if (B.lotus.every((L) => T.hitL.has(L))) return true;
  }
  return false;
}
