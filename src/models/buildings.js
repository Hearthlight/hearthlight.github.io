// Procedural 3D buildings: painted facades, gable/hip roofs of tiles, slates,
// shakes, thatch or tin (a ridge cap, boards along the edges, dormers), chimneys
// with pots, awnings, signs, a lantern by the door, night-glowing windows.

import { THREE, pixelTexture, toon } from '../render/r3d.js';
import { paintFacade, paintRoof, paintWall, paintAwning, paintWindow, paintPlanks, wallFill, Painter, drawIcon, paintWood } from '../art/surfaces.js';
import { polyGeometry, quad, tri, shadowFlags, bakeMeshes } from './geom.js';
import { ramp, mix } from '../engine/color.js';
import { hashStr, clamp, rng } from '../engine/util.js';

const U = 1 / 16;

function mat(r3d, canvas, extra = {}) {
  return toon(r3d, { map: pixelTexture(canvas), ...extra });
}
const C = (r3d, key, color, extra = {}) => toon(r3d, { color, key: 'bld-' + key, ...extra });
const DORMER_ROOFS = new Map();
// every roof's material, to darken in the rain (systems/weather.js)
export const WET_ROOFS = new Set();
const wet = (m) => (WET_ROOFS.add(m), m);

// what a roof is made of: the building's own choice, else what its walls suggest
function roofKind(st) {
  if (st.roofKind) return st.roofKind;
  if (st.scallop) return 'scallop';
  if (st.wall === 'logs') return 'shakes';
  if (st.wall === 'stone') return 'slate';
  if (st.wall === 'boards') return 'shingle';
  return 'tile';
}

// the ridge cap: rounded tiles in a row (clay & scales), a board (slates, shingles, shakes), a
// folded sheet (tin): one texture on every face (the front shows the tiles' rounded ends)
function ridgeMat(r3d, color, rk, len) {
  const R = ramp(color), w = Math.max(4, Math.round(len * 16));
  const top = new Painter(w, 4);
  const round = rk === 'tile' || rk === 'scallop';
  for (let x = 0; x < w; x++) top.vline(x, 0, 4, round ? [R.d, R.m, R.l, R.m, mix(R.m, R.d, 0.5)][x % 5] : rk === 'tin' ? R.l : mix(R.m, R.d, 0.35));
  if (!round) { top.hline(0, 0, w, R.l); top.hline(0, 3, w, R.d); for (let x = 3; x < w; x += 7) top.vline(x, 1, 2, R.d); }
  else top.hline(0, 3, w, R.o);
  return toon(r3d, { map: pixelTexture(top.c) });
}

// Smoke from a chimney at its own hours: an oven all day, a hearth morning & evening, a workshop's
// stove while work goes on (each house lights up at its own minute); greyer & fainter by night
const SMOKE = { oven: [[5, 19.5, 3.6]], hearth: [[6, 10.5, 2.4], [16.5, 23.5, 2.6]], work: [[8, 18, 2.2]], always: [[0, 24, 2.2]] };
export function chimneySmoke(fx, c, dt, hour, night) {
  const off = (((c.seed || 0) >> 2) % 12) / 12;
  let rate = 0;
  for (const [a, b, r] of SMOKE[c.smoke] || SMOKE.hearth) if (hour >= a + off && hour < b - off * 0.5) rate = r;
  if (!rate || Math.random() > dt * rate) return;
  const col = night > 0.5 ? '#5e5a72' : night > 0.15 ? '#aaa4b8' : '#ebe7ef';
  fx.emit('chimney', c.x + (Math.random() - 0.5) * 0.06, c.y, c.z, 1, { color: col, hi: night > 0.5 ? '#77738a' : '#ffffff', alpha: night > 0.5 ? 0.7 : 1 });
}

// b: { id, x, y, w, h, door, style } (tiles). Returns { group, glowMats, lights, chimneys, colliders, doorWorld }
// style: roof, roofKind, wall, wallColor, trim, pitch, wallH, storeys (2: a row of windows upstairs),
// hip, roofShape ('gambrel'), gable ('door' | 'left' | 'right': a front gable over part of the front),
// annex ('left' | 'right', annexKind 'shed' | 'room': a lean-to at one end), porch, tower ('left' |
// 'right': a round corner tower), ivy ('left' | 'right', roses), stack ('left' | 'right': a stone
// chimney up a gable end), chimney (a brick one on the roof), smoke ('oven' | 'hearth' | 'work' |
// 'always' | false), awning, sign, flowerbox, shutter, round, arched, doorKind ('double'), dormers
export function buildBuilding(r3d, b) {
  const st = b.style || {};
  if (st.kind === 'lighthouse') return buildLighthouse(r3d, b);
  if (st.kind === 'windmill') return buildWindmill(r3d, b);
  const seed = hashStr(b.id);
  const g = new THREE.Group();
  const glowMats = [], colliders = [], chimneys = [];
  const D = b.h, zB = b.y, zF = b.y + D, zM = b.y + D / 2;
  const storeys = st.storeys || 1;
  const wallH = st.wallH || (storeys === 2 ? 3.2 : 2);
  const groundH = Math.min(wallH, 2);          // (the ground floor: awnings, signs & porches hang there)
  const kind = st.wall || 'plaster';
  const wallStyle = {
    trim: st.trim, wallColor: st.wallColor, round: st.round, flowerbox: st.flowerbox, shutter: st.shutter, curtain: st.curtain || '#f4f1ec',
    doorColor: st.doorColor, storeys, arched: st.arched, doorKind: st.doorKind, upFlowers: st.upFlowers, upWindows: st.upWindows,
  };
  const TR = ramp(st.trim || '#6b4330');
  const roofColor = st.roof || '#c75b4e';
  const rk = roofKind(st);
  // a lean-to at one end takes a slice of the footprint: the house proper is the rest
  const aw = st.annex ? Math.round(Math.min(1.5, b.w * 0.3) * 16) / 16 : 0;
  const x0 = b.x + (st.annex === 'left' ? aw : 0), x1 = b.x + b.w - (st.annex === 'right' ? aw : 0), W = x1 - x0;

  // ---- walls
  const facade = paintFacade({
    wTiles: W, hPx: Math.round(wallH * 16), kind, style: wallStyle,
    doorX: b.door - x0, seed, sign: st.signOnWall ? st.sign : null, windows: st.windows || null,
  });
  const frontMat = toon(r3d, { map: pixelTexture(facade.color), emissive: 0xffffff, emissiveMap: pixelTexture(facade.glow), emissiveIntensity: 0 });
  const sideMat = mat(r3d, paintWall(D * 16, Math.round(wallH * 16), kind, wallStyle, seed + 1));
  const topMat = toon(r3d, { color: 0x3b2a2e });
  const walls = new THREE.Mesh(new THREE.BoxGeometry(W, wallH, D), [sideMat, sideMat, topMat, topMat, frontMat, sideMat]);
  walls.position.set(x0 + W / 2, wallH / 2, zB + D / 2);
  g.add(walls);

  // ---- roof: a gable (the default), a hip, or a barn's gambrel (steep to a knee, then shallow)
  const ox = 0.25, oz = 0.3;
  const yb = wallH - U;
  const run = D / 2 + oz;
  const gambrel = st.roofShape === 'gambrel';
  const hip = !!st.hip && !gambrel;
  const kr = run * 0.42, yk = yb + kr * 1.45;
  const rise = gambrel ? Math.round((yk + (run - kr) * 0.5 - wallH) * 16) / 16 : Math.round((D / 2) * (st.pitch || 0.85) * 16) / 16;
  const yr = wallH + rise;
  const projH = Math.round((rise + U + run) * 16) + (gambrel ? 8 : 0);
  const roofW = Math.round((W + ox * 2) * 16);
  const roofTex = pixelTexture(paintRoof(roofW, projH, roofColor, { seed, kind: rk }));
  const roofMat = wet(toon(r3d, { map: roofTex }));
  roofMat.shadowSide = THREE.DoubleSide;
  const gableMat = mat(r3d, paintWall(D * 16, Math.round(rise * 16) + 2, kind === 'brick' || kind === 'stone' ? 'boards' : kind, { ...wallStyle, wallColor: st.gableColor || st.wallColor }, seed + 2, { foundation: false }));
  gableMat.shadowSide = THREE.DoubleSide;
  const ra = [x0 - ox, yb, zF + oz], rb = [x1 + ox, yb, zF + oz];
  const bb = [x1 + ox, yb, zB - oz], ba = [x0 - ox, yb, zB - oz];
  let roofPolys, gablePolys = [];
  if (gambrel) {
    const zkF = zF + oz - kr, zkB = zB - oz + kr;
    const LA = Math.hypot(kr, yk - yb), LB = Math.hypot(run - kr, yr - yk), a = LA / (LA + LB);
    const kF0 = [x0 - ox, yk, zkF], kF1 = [x1 + ox, yk, zkF], kB0 = [x0 - ox, yk, zkB], kB1 = [x1 + ox, yk, zkB];
    const rc = [x1 + ox, yr, zM], rd = [x0 - ox, yr, zM];
    const lo = [[0, 0], [1, 0], [1, a], [0, a]], hi = [[0, a], [1, a], [1, 1], [0, 1]];
    roofPolys = [quad(ra, rb, kF1, kF0, lo), quad(kF0, kF1, rc, rd, hi), quad(bb, ba, kB0, kB1, lo), quad(kB1, kB0, rd, rc, hi)];
    for (const zk of [zkF, zkB]) {
      const kb = new THREE.Mesh(new THREE.BoxGeometry(W + ox * 2 + 0.04, 0.09, 0.12), C(r3d, 'trim-' + TR.m, TR.m));
      kb.position.set(x0 + W / 2, yk + 0.02, zk);
      g.add(kb);
    }
    // the gable ends: pentagons tucked under the roof's outline
    const prof = [[zF, yb], [zB, yb], [zkB, yk - 0.03], [zM, yr - 0.03], [zkF, yk - 0.03]];
    const uvOf = ([z, y]) => [(z - zB) / D, (y - yb) / (yr - yb)];
    gablePolys = [
      { v: prof.map(([z, y]) => [x1, y, z]), uv: prof.map(uvOf) },
      { v: [prof[1], prof[0], prof[4], prof[3], prof[2]].map(([z, y]) => [x0, y, z]), uv: [prof[1], prof[0], prof[4], prof[3], prof[2]].map(uvOf) },
    ];
  } else if (!hip) {
    const rc = [x1 + ox, yr, zM], rd = [x0 - ox, yr, zM];
    roofPolys = [quad(ra, rb, rc, rd), quad(bb, ba, rd, rc)];
    gablePolys = [
      tri([x1, yb, zF], [x1, yb, zB], [x1, yr, zM]),
      tri([x0, yb, zB], [x0, yb, zF], [x0, yr, zM]),
    ];
  } else {
    const inset = Math.min(run, (W + ox * 2) / 2 - 0.3);
    const rc = [x1 + ox - inset, yr, zM], rd = [x0 - ox + inset, yr, zM];
    const u0 = inset / (W + ox * 2), u1 = 1 - u0;
    roofPolys = [
      quad(ra, rb, rc, rd, [[0, 0], [1, 0], [u1, 1], [u0, 1]]),
      quad(bb, ba, rd, rc, [[0, 0], [1, 0], [u1, 1], [u0, 1]]),
      tri(rb, bb, rc, [[0, 0], [1, 0], [0.5, 1]]),
      tri(ba, ra, rd, [[0, 0], [1, 0], [0.5, 1]]),
    ];
  }
  g.add(new THREE.Mesh(polyGeometry(roofPolys), roofMat));
  if (gablePolys.length) g.add(new THREE.Mesh(polyGeometry(gablePolys), gableMat));
  // roof underside (so the overhang reads solid & casts shadow)
  g.add(new THREE.Mesh(polyGeometry([quad(rb, ra, ba, bb)]), toon(r3d, { color: 0x4a2e25, key: 'roofUnder' })));

  // ---- the roof's edges: a thick front edge, boards up the gables, a ridge cap
  const RR = ramp(roofColor);
  const thatch = rk === 'thatch';
  const len = W + ox * 2;
  const trimM = C(r3d, 'trim-' + TR.m, TR.m);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(len + 0.02, thatch ? 0.18 : 0.1, thatch ? 0.14 : 0.07), thatch ? C(r3d, 'thatch-lip-' + RR.d, RR.d) : trimM);
  edge.position.set(x0 + W / 2, yb - (thatch ? 0.05 : 0.035), zF + oz - (thatch ? 0.04 : 0.0));
  g.add(edge);
  const slope = Math.hypot(run, rise), ang = Math.atan2(rise, run);
  if (!hip && !gambrel) {
    for (const xv of [x0 - ox + 0.035, x1 + ox - 0.035]) {
      for (const s of [1, -1]) {
        // (stopping short of the ridge, so the cap covers their ends)
        const vb = new THREE.Mesh(new THREE.BoxGeometry(0.07, thatch ? 0.14 : 0.08, slope - 0.1), thatch ? C(r3d, 'thatch-lip-' + RR.d, RR.d) : trimM);
        vb.rotation.x = s * ang;
        vb.position.set(xv, (yb + yr) / 2 + Math.cos(ang) * 0.035 - Math.sin(ang) * 0.06, zM + s * (run / 2 + Math.sin(ang) * 0.035 + Math.cos(ang) * 0.06));
        g.add(vb);
      }
    }
  }
  const rlen = hip ? Math.max(0.4, len - 2 * Math.min(run, len / 2 - 0.3)) + 0.06 : len + 0.06;
  // (where the birds come down: along the ridge)
  const perches = rlen > 0.9 ? [{ x0: x0 + W / 2 - rlen / 2 + 0.25, x1: x0 + W / 2 + rlen / 2 - 0.25, y: rk === 'thatch' ? yr + 0.2 : yr + 0.08, z: zM, kind: 'ridge' }] : [];
  if (thatch) {
    // a thatched ridge: a fat roll of straw pinned with crossed hazel spars
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, rlen, 8), C(r3d, 'thatch-ridge-' + RR.d, mix(RR.m, RR.d, 0.5)));
    roll.rotation.z = Math.PI / 2;
    roll.position.set(x0 + W / 2, yr - 0.02, zM);
    g.add(roll);
    const spar = C(r3d, 'thatch-spar', 0xe9d7a6);
    for (let x = x0 + W / 2 - rlen / 2 + 0.3; x < x0 + W / 2 + rlen / 2 - 0.2; x += 0.42) {
      for (const s of [1, -1]) {
        const sp = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.34), spar);
        sp.rotation.set(0.9, 0, s * 0.5);
        sp.position.set(x, yr + 0.02, zM + 0.14);
        sp.userData.noCast = true;
        g.add(sp);
      }
    }
  } else {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(rlen, 0.12, 0.2), ridgeMat(r3d, roofColor, rk, rlen));
    cap.position.set(x0 + W / 2, yr + 0.015, zM);
    g.add(cap);
  }

  // ---- a front gable over part of the front: where it stands, nothing else goes on the roof
  let gSpan = null;
  if (st.gable && !hip && !gambrel) {
    const gw = Math.min(W - 0.6, st.gableW || 2.2);
    const xc = st.gable === 'left' ? x0 + gw / 2 + 0.3 : st.gable === 'right' ? x1 - gw / 2 - 0.3 : clamp(b.door + 0.5, x0 + gw / 2 + 0.3, x1 - gw / 2 - 0.3);
    gSpan = [xc - gw / 2 - 0.35, xc + gw / 2 + 0.35];
    addFrontGable(r3d, g, glowMats, { xc, gw, zF, oz, yb, yr, run, kind, wallStyle, roofColor, rk, T: TR, seed });
  }
  const clearOfGable = (x, m = 0) => !gSpan || x < gSpan[0] - m || x > gSpan[1] + m;

  // ---- dormers: a window poking out of the roof, on the wider houses
  let cxChim = st.chimney ? x0 + clamp(st.chimney + 0.5, 0.5, W - 0.5) : null;
  if (cxChim !== null && !clearOfGable(cxChim, 0.3)) cxChim = cxChim < (gSpan[0] + gSpan[1]) / 2 ? Math.max(x0 + 0.5, gSpan[0] - 0.6) : Math.min(x1 - 0.5, gSpan[1] + 0.6);
  const dormerXs = [];
  if (!hip && !gambrel && !st.clock && !st.barn && st.dormers !== 0 && W >= 5 && (!gSpan || W >= 7)) {
    const want = gSpan ? 1 : st.dormers || (W >= 7 ? 2 : 1);
    // (over the door, or a third of the way along: each house its own, so a row of them isn't alike)
    const one = [clamp(b.door + 0.5, x0 + 1.2, x1 - 1.2), x0 + W * 0.3, x0 + W * 0.7], k = (seed >> 5) % 3;
    const cands = want === 2 ? [x0 + W * 0.27, x0 + W * 0.73] : [...one.slice(k), ...one.slice(0, k)];
    for (const x of cands) {
      if (dormerXs.length >= want) break;
      if (cxChim !== null && Math.abs(x - cxChim) < 1.05) continue;
      if (!clearOfGable(x, 0.7)) continue;
      if (st.tower && Math.abs(x - (st.tower === 'left' ? x0 + 0.77 : x1 - 0.77)) < 1.9) continue;
      if (dormerXs.some((d) => Math.abs(d - x) < 1.4)) continue;
      dormerXs.push(x);
    }
    for (const xd of dormerXs) addDormer(r3d, g, glowMats, { xd, zM, zF, oz, yb, yr, run, kind, wallStyle, roofColor, rk, seed: seed + Math.round(xd * 7), T: TR });
  }

  // ---- chimney: a brick stack, a stone cap and a pot or two; some smoke (see smokeOf)
  const smoke = st.smoke !== undefined ? st.smoke : ((seed >> 4) % 5 < 2 ? 'hearth' : false);
  if (cxChim !== null) {
    const cx = cxChim;
    const cz = zM + 0.55;
    const slopeY = gambrel ? yr - (cz - zM) * 0.5 : yr - (cz - zM) * (rise / run);
    const top = yr + 0.5;
    const h = top - (slopeY - 0.2);
    const brick = mat(r3d, paintWall(8, Math.ceil(h * 16), 'brick', { wallColor: '#a4574a' }, seed + 3, { foundation: false }));
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.46, h, 0.46), brick);
    ch.position.set(cx, slopeY - 0.2 + h / 2, cz);
    g.add(ch);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.1, 0.56), C(r3d, 'chimcap2', 0xb9b1b6));
    cap.position.set(cx, top + 0.05, cz);
    g.add(cap);
    const pots = (seed >> 3) % 2 ? [-0.1, 0.11] : [0];
    const potM = C(r3d, 'chimpot', 0xc0643c), soot = C(r3d, 'chimsoot', 0x2a2030);
    for (const px of pots) {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.2, 7), potM);
      pot.position.set(cx + px, top + 0.2, cz);
      g.add(pot);
      const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 7), soot);
      hole.position.set(cx + px, top + 0.305, cz);
      hole.userData.noCast = true;
      g.add(hole);
    }
    chimneys.push({ x: cx + pots[0], y: top + 0.35, z: cz, smoke, seed });
  }
  // ---- a stone chimney stack up a gable end
  if (st.stack && !hip) {
    const side = st.stack === 'left' ? -1 : 1;
    const res = addStack(r3d, g, { x: side < 0 ? b.x : b.x + b.w, zc: zM, yr, wallH, side, seed });
    chimneys.push({ ...res.top, smoke: st.stackSmoke !== undefined ? st.stackSmoke : smoke || 'hearth', seed: seed + 1 });
    colliders.push(res.collider);
  }

  // ---- a lean-to at one end
  if (st.annex) {
    const ax0 = st.annex === 'left' ? b.x : x1, ax1 = st.annex === 'left' ? x0 : b.x + b.w;
    addAnnex(r3d, g, glowMats, { ax0, ax1, zB, zF, wallH: groundH, kind, wallStyle, roofColor, rk, T: TR, seed, shed: st.annexKind !== 'room', side: st.annex === 'left' ? -1 : 1 });
  }

  // ---- a round tower on a front corner
  if (st.tower) {
    const r = 0.82, side = st.tower === 'left' ? -1 : 1;
    const cx = side < 0 ? x0 + r - 0.05 : x1 - r + 0.05, cz = zF - 0.55;
    colliders.push(addTower(r3d, g, glowMats, { cx, cz, r, h: wallH + 1.25, kind, wallStyle, roofColor, rk, T: TR, seed }));
  }

  // ---- awning over the front
  if (st.awning) {
    const [c1, c2] = st.awning;
    const aw2 = W - 0.5, drop = 0.35, out = 0.6;
    const ay = groundH - 0.62;
    const tex = paintAwning(Math.round(aw2 * 16), Math.round((drop + out) * 16) + 2, c1, c2);
    const aMat = toon(r3d, { map: pixelTexture(tex), alphaTest: 0.5, side: THREE.DoubleSide });
    aMat.shadowSide = THREE.DoubleSide;
    const ax0 = x0 + 0.25, ax1 = x1 - 0.25;
    g.add(new THREE.Mesh(polyGeometry([quad(
      [ax0, ay - drop - 2 * U, zF + out], [ax1, ay - drop - 2 * U, zF + out], [ax1, ay, zF + 0.02], [ax0, ay, zF + 0.02],
    )]), aMat));
  }

  // ---- a porch along the front: a lean-to roof on posts over a plank deck
  const dx = b.door + 0.5;
  let porch = null;
  if (st.porch && !st.awning) {
    porch = addPorch(r3d, g, { x0, x1, zF, groundH, T: TR, seed, dx, vine: st.porch === true ? 'grapes' : st.porch });
    colliders.push(...porch.colliders);
  }

  // ---- hanging sign
  if (st.sign && !st.signOnWall) {
    const sx = b.door + 1.35;
    const sp = new Painter(12, 9);
    sp.rect(0, 0, 12, 9, '#4a2e25');
    sp.rect(1, 1, 10, 7, '#e9cf9b');
    sp.hline(1, 1, 10, '#fff1c9');
    sp.hline(1, 7, 10, '#c9a77c');
    drawIcon(sp, st.sign, 3.5, 2);
    const signMat = toon(r3d, { map: pixelTexture(sp.c) });
    const woodMat = toon(r3d, { color: 0x4a2e25, key: 'signwood' });
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.56, 0.06), [woodMat, woodMat, woodMat, woodMat, signMat, signMat]);
    board.position.set(sx + 0.1, groundH - 0.95, zF + 0.45);
    g.add(board);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), woodMat);
    arm.position.set(sx + 0.1, groundH - 0.62, zF + 0.25);
    g.add(arm);
    board.userData.swing = true;
  }

  // ---- doorstep (a porch has its deck instead)
  const step = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 0.3), toon(r3d, { color: 0x9a94a0, key: 'step' }));
  step.position.set(dx, 0.05, zF + 0.15);
  step.visible = !porch;
  g.add(step);

  // ---- ivy (or a climbing rose) up one corner and along under the eave
  if (st.ivy) {
    const side = st.ivy === 'left' ? -1 : 1;
    addIvy(r3d, g, { xs: side < 0 ? x0 + 0.12 : x1 - 0.12, xe: side < 0 ? Math.min(dx - 0.9, x0 + W * 0.45) : Math.max(dx + 0.9, x1 - W * 0.45), zF, h: Math.min(wallH, 2.6), seed, roses: !!st.roses });
  }

  // ---- a lantern on a bracket beside the door (the side the sign doesn't hang on)
  let lampAt = null;
  if (!st.columns && !st.barn && !st.awning && st.lantern !== false) {
    const side = st.sign && !st.signOnWall ? -1 : 1;
    const clear = (lx) => lx > x0 + 0.3 && lx < x1 - 0.3 && !facade.windows.some((wn) => wn.y > 20 * (storeys - 1) && lx + 0.12 > x0 + (wn.x - 3) / 16 && lx - 0.12 < x0 + (wn.x + wn.w + 3) / 16);
    const lx = [dx + side * 0.74, dx + side * 0.62, ...(side === 1 ? [dx - 0.62, dx - 0.74] : [])].find(clear);
    if (lx !== undefined) {
      lampAt = { x: lx, y: 1.2, z: zF + 0.16 };
      addWallLantern(r3d, g, glowMats, lampAt);
    }
  }

  // ---- clock / flag / columns for the town hall
  if (st.clock) addClockTower(r3d, g, x0 + W / 2, yr, zM, st.roof);
  if (st.columns) addPortico(r3d, g, dx, zF, Math.min(wallH, groundH + 0.3), st.trim, roofColor);
  if (st.barn) addBarn(r3d, g, { x0, x1, W, zF, zM, yr, dx, trim: st.trim || '#f4efe4', roof: roofColor });

  step.userData.noCast = true;
  bakeMeshes(g, toon(r3d, { color: 0xffffff, vertexColors: true, key: 'p-vc' }));
  shadowFlags(g, true, true);
  g.traverse((o) => { if (o.isMesh && o.userData.noCast) o.castShadow = false; });

  // light spots in front of windows & door (for night lighting)
  const lights = facade.windows.map((wn) => ({
    x: x0 + (wn.x + wn.w / 2) / 16, y: wallH - (wn.y + wn.h / 2) / 16, z: zF + 0.6, color: 0xffb35c, power: 1,
  }));
  lights.push(lampAt ? { x: lampAt.x, y: lampAt.y, z: lampAt.z + 0.35, color: 0xffa24a, power: 0.8 } : { x: dx, y: 1.0, z: zF + 0.6, color: 0xffb35c, power: 0.7 });

  return { group: g, glowMats: [frontMat, ...glowMats], lights, chimneys, colliders, perches, doorWorld: { x: dx, z: zF } };
}

// A gabled dormer on the front slope: a little wall with a window (lit at night), its own
// roof of the same stuff, sunk back into the main roof.
function addDormer(r3d, g, glowMats, { xd, zM, zF, oz, yb, yr, run, kind, wallStyle, roofColor, rk, seed, T }) {
  const dw = 1.1, sunk = 0.3, hr = 0.3, S = (yr - yb) / run;
  const zd = zM + run * 0.74;                                // its face, low on the slope
  const ys = yb + (zF + oz - zd) * S;                        // the roof's height there
  const hf = Math.min(0.58, yr - 0.14 - hr - ys);            // (its ridge stays under the main one)
  if (hf < 0.4) return;
  const yw = ys + hf, yrd = yw + hr;
  const back = zd - zM - (yr - yrd) / S + 0.06;              // back to where it meets the roof
  // the face: wall + a window, glowing at night
  const fw = Math.round(dw * 16), fh = Math.round((hf + sunk) * 16);
  const p = new Painter(fw, fh), gl = new Painter(fw, fh);
  gl.rect(0, 0, fw, fh, '#000000');
  wallFill(p, 0, 0, fw, fh, kind === 'brick' || kind === 'stone' || kind === 'logs' ? 'boards' : kind, wallStyle, seed);
  p.rect(0, 0, 1, fh, T.d); p.rect(fw - 1, 0, 1, fh, T.d);
  paintWindow(p, gl, 5, 2, 8, 7, T, { curtain: wallStyle.curtain });
  const face = toon(r3d, { map: pixelTexture(p.c), emissive: 0xffffff, emissiveMap: pixelTexture(gl.c), emissiveIntensity: 0 });
  glowMats.push(face);
  const side = C(r3d, 'dormer-side-' + T.m, T.d);
  const body = new THREE.Mesh(new THREE.BoxGeometry(dw, hf + sunk, back), [side, side, side, side, face, side]);
  body.position.set(xd, ys - sunk + (hf + sunk) / 2, zd - back / 2);
  g.add(body);
  // its roof: two small slopes meeting in a ridge that runs back into the main roof
  const ov = 0.12, hw = dw / 2 + 0.09, zf = zd + ov, zb = zd - back;
  const L = Math.hypot(hw, yrd - yw + 0.03);
  // (one material for every dormer of that roof & size: they merge into one draw)
  const rw = Math.round((back + ov) * 16), rh = Math.max(6, Math.round(L * 16)), rkey = 'dormer-roof-' + roofColor + rk + rw + 'x' + rh;
  let rm = DORMER_ROOFS.get(rkey);
  if (!rm) {
    rm = wet(toon(r3d, { map: pixelTexture(paintRoof(rw, rh, roofColor, { seed: rw * 7 + rh, kind: rk, moss: 0, ridge: false })), side: THREE.DoubleSide }));
    rm.shadowSide = THREE.DoubleSide;
    DORMER_ROOFS.set(rkey, rm);
  }
  const uv = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const roof = new THREE.Mesh(polyGeometry([
    quad([xd - hw, yw - 0.03, zf], [xd - hw, yw - 0.03, zb], [xd, yrd, zb], [xd, yrd, zf], uv),
    quad([xd + hw, yw - 0.03, zb], [xd + hw, yw - 0.03, zf], [xd, yrd, zf], [xd, yrd, zb], uv),
  ]), rm);
  g.add(roof);
  // the little gable over the window, and a trim board along its edges
  const gm = C(r3d, 'dormer-gable-' + T.m, mix(T.m, '#f4efe4', 0.15), { side: THREE.DoubleSide });
  g.add(new THREE.Mesh(polyGeometry([tri([xd - dw / 2, yw - 0.01, zd + 0.005], [xd + dw / 2, yw - 0.01, zd + 0.005], [xd, yrd - 0.02, zd + 0.005])]), gm));
  const tm = C(r3d, 'trim-' + T.m, T.m);
  const a = Math.atan2(yrd - yw + 0.03, hw);
  for (const s of [-1, 1]) {
    const bd = new THREE.Mesh(new THREE.BoxGeometry(L + 0.02, 0.07, 0.06), tm);
    bd.rotation.z = -s * a;
    bd.position.set(xd + (s * hw) / 2, (yw - 0.03 + yrd) / 2 + 0.03, zf + 0.01);
    g.add(bd);
  }
}

// A front gable: the front wall rising into a triangle over part of the house, a window in it
// (lit at night), its own roof whose ridge runs back into the main one, boards along its rakes
function addFrontGable(r3d, g, glowMats, { xc, gw, zF, oz, yb, yr, run, kind, wallStyle, roofColor, rk, T, seed }) {
  const S = (yr - yb) / run, ov = 0.16, hw = gw / 2;
  const yg = Math.min(yr - 0.14, yb + (hw + ov) * 0.95);        // its ridge (under the main one)
  const zE = zF + oz + 0.04;                                       // its eave, just past the main eave
  const zBack = zF + oz - (yg - yb) / S + 0.05;                   // where its ridge meets the main roof
  // the face: a triangle of wall, an oculus or a little window low in it
  const fw = Math.round(gw * 16), fh = Math.max(6, Math.round((yg - yb) * 16));
  const p = new Painter(fw, fh), gl = new Painter(fw, fh);
  gl.rect(0, 0, fw, fh, '#000000');
  wallFill(p, 0, 0, fw, fh, kind === 'logs' ? 'boards' : kind, { ...wallStyle, noBeam: true }, seed + 5);
  const cx = Math.round(fw / 2), cy = Math.round(fh * 0.52);
  if (kind === 'stone' || kind === 'brick' || wallStyle.arched) {
    // a round window with a cross of glazing bars
    for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) {
      const d = Math.hypot(x, y);
      if (d <= 4.4) p.px(cx + x, cy + y, d > 3.3 ? T.o : x + y < -2 ? '#bfe3f2' : '#6b9cc4');
      if (d <= 3.3) gl.px(cx + x, cy + y, '#ffc76a');
    }
    p.vline(cx, cy - 3, 7, T.m); p.hline(cx - 3, cy, 7, T.m);
  } else {
    paintWindow(p, gl, cx - 4, cy - 3, 8, 7, T, { curtain: wallStyle.curtain });
  }
  // (a timber house shows its frame in the gable too)
  if (kind === 'timber') { p.rect(0, fh - 2, fw, 2, T.m); p.rect(cx - 1, 0, 2, cy - 5, T.m); }
  const face = toon(r3d, { map: pixelTexture(p.c), emissive: 0xffffff, emissiveMap: pixelTexture(gl.c), emissiveIntensity: 0 });
  glowMats.push(face);
  g.add(new THREE.Mesh(polyGeometry([tri([xc - hw, yb, zF + 0.02], [xc + hw, yb, zF + 0.02], [xc, yg, zF + 0.02])]), face));
  // its roof: two slopes from the ridge down to the main eave's height, running back into the roof
  const L = Math.hypot(hw + ov, yg - yb);
  const rw = Math.max(8, Math.round((zE - zBack) * 16)), rh = Math.max(8, Math.round(L * 16));
  const rm = wet(toon(r3d, { map: pixelTexture(paintRoof(rw, rh, roofColor, { seed: seed + 13, kind: rk, moss: 0.4, ridge: false })), side: THREE.DoubleSide }));
  rm.shadowSide = THREE.DoubleSide;
  const uv = [[0, 0], [1, 0], [1, 1], [0, 1]];
  g.add(new THREE.Mesh(polyGeometry([
    quad([xc - hw - ov, yb, zE], [xc - hw - ov, yb, zBack], [xc, yg, zBack], [xc, yg, zE], uv),
    quad([xc + hw + ov, yb, zBack], [xc + hw + ov, yb, zE], [xc, yg, zE], [xc, yg, zBack], uv),
  ]), rm));
  // boards along its two rakes, a ridge cap running back, a little finial at the apex
  const tm = C(r3d, 'trim-' + T.m, T.m);
  const a = Math.atan2(yg - yb, hw + ov);
  for (const s of [-1, 1]) {
    const bd = new THREE.Mesh(new THREE.BoxGeometry(L + 0.04, 0.08, 0.07), rk === 'thatch' ? C(r3d, 'thatch-lip-' + ramp(roofColor).d, ramp(roofColor).d) : tm);
    bd.rotation.z = -s * a;
    bd.position.set(xc + (s * (hw + ov)) / 2, (yb + yg) / 2 + 0.035, zE + 0.01);
    g.add(bd);
  }
  const rc = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, zE - zBack), ridgeMat(r3d, roofColor, rk, zE - zBack));
  rc.position.set(xc, yg + 0.02, (zE + zBack) / 2);
  g.add(rc);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.06), tm);
  fin.position.set(xc, yg + 0.1, zE + 0.02);
  g.add(fin);
}

// A stone chimney stack up a gable end: broad at the hearth, narrowing to the flue, a cap & pot
function addStack(r3d, g, { x, zc, yr, wallH, side, seed }) {
  const H = yr + 0.65, lowH = wallH * 0.62;
  const stone = mat(r3d, paintWall(12, Math.ceil(H * 16), 'stone', { wallColor: '#aaa3a6' }, seed + 21, { foundation: false }));
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.72, lowH, 0.82), stone);
  base.position.set(x + side * 0.34, lowH / 2, zc);
  g.add(base);
  const sh = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.24, 0.82), stone);
  sh.position.set(x + side * 0.34, lowH + 0.04, zc);
  sh.rotation.z = side * 0.45;
  g.add(sh);
  const fl = new THREE.Mesh(new THREE.BoxGeometry(0.5, H - lowH, 0.56), stone);
  fl.position.set(x + side * 0.27, lowH + (H - lowH) / 2, zc);
  g.add(fl);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.09, 0.66), C(r3d, 'chimcap2', 0xb9b1b6));
  cap.position.set(x + side * 0.27, H + 0.04, zc);
  g.add(cap);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.18, 7), C(r3d, 'chimpot', 0xc0643c));
  pot.position.set(x + side * 0.27, H + 0.17, zc);
  g.add(pot);
  const x0 = side < 0 ? x - 0.72 : x;
  return { top: { x: x + side * 0.27, y: H + 0.3, z: zc }, collider: { rect: [x0, zc - 0.42, 0.72, 0.84] } };
}

// A lean-to at one end, inside the footprint: low walls under a roof sloping down to the front —
// an open woodshed (planks & logs stacked inside) or a little room with its own window
function addAnnex(r3d, g, glowMats, { ax0, ax1, zB: zB0, zF, wallH, kind, wallStyle, roofColor, rk, T, seed, shed, side }) {
  // (only the front of the end: from the camera, what stands behind it can't be seen anyway)
  const zB = Math.max(zB0, zF - 1.9), AW = ax1 - ax0, D = zF - zB, hLo = Math.min(1.3, wallH * 0.64), hHi = hLo + 0.42;
  const fw = Math.round(AW * 16), fh = Math.round(hLo * 16);
  const wk = kind === 'stone' || kind === 'brick' ? 'boards' : kind === 'timber' ? 'plaster' : kind;
  const p = new Painter(fw, fh), gl = new Painter(fw, fh);
  gl.rect(0, 0, fw, fh, '#000000');
  wallFill(p, 0, 0, fw, fh, wk, { ...wallStyle, noBeam: true }, seed + 31);
  const F = ramp('#8f8a93');
  p.rect(0, fh - 2, fw, 2, F.m); p.hline(0, fh - 2, fw, F.l);
  if (shed) {
    // open front: two posts, a lintel, the dark inside; planks stacked on the left, log ends on the right
    p.rect(2, 3, fw - 4, fh - 5, '#2a1f26');
    const wood = ramp('#b98a5a');
    for (let y = fh - 4; y > fh * 0.45; y -= 2) { p.hline(3, y, Math.floor(fw * 0.45), wood.m); p.hline(3, y - 1, Math.floor(fw * 0.45), wood.d); }
    for (let y = fh - 5; y > fh * 0.35; y -= 3) for (let x = Math.floor(fw * 0.55); x < fw - 4; x += 3) { p.rect(x, y, 2, 2, '#d9b07a'); p.px(x, y, '#e8c898'); p.px(x + 1, y + 1, '#8e5d3e'); }
    p.rect(0, 0, 2, fh - 2, T.m); p.rect(fw - 2, 0, 2, fh - 2, T.m); p.rect(0, 1, fw, 2, T.m); p.hline(0, 3, fw, T.d);
  } else {
    paintWindow(p, gl, Math.round(fw / 2 - 4), 4, 8, 7, T, { curtain: wallStyle.curtain, flowerbox: wallStyle.flowerbox });
    p.rect(0, 0, 2, fh - 2, T.m); p.rect(fw - 2, 0, 2, fh - 2, T.m);
  }
  const face = toon(r3d, { map: pixelTexture(p.c), emissive: 0xffffff, emissiveMap: pixelTexture(gl.c), emissiveIntensity: 0 });
  if (!shed) glowMats.push(face);
  const sideM = mat(r3d, paintWall(Math.round(D * 16), fh, wk, wallStyle, seed + 32));
  const top = C(r3d, 'annex-top', 0x3b2a2e);
  const box = new THREE.Mesh(new THREE.BoxGeometry(AW, hLo, D), [sideM, sideM, top, top, face, sideM]);
  box.position.set(ax0 + AW / 2, hLo / 2, zB + D / 2);
  g.add(box);
  // the outer end's wall, up under the sloping roof
  const ox = side < 0 ? ax0 : ax1;
  const endM = C(r3d, 'annex-end-' + (wallStyle.wallColor || kind), mix(ramp(wallStyle.wallColor || '#b9a58a').m, '#6b5a50', 0.25), { side: THREE.DoubleSide });
  g.add(new THREE.Mesh(polyGeometry([tri([ox, hLo, zF], [ox, hLo, zB], [ox, hHi, zB])]), endM));
  // the roof: from the house's end wall at the back down to the front, overhanging
  const zf = zF + 0.28, zb = zB - 0.1, L = Math.hypot(zf - zb, hHi - hLo + 0.06);
  const ext0 = side < 0 ? 0.22 : 0.02, ext1 = side < 0 ? 0.02 : 0.22;
  const rm = wet(toon(r3d, { map: pixelTexture(paintRoof(Math.round((AW + 0.24) * 16), Math.round(L * 16), roofColor, { seed: seed + 33, kind: rk === 'thatch' ? 'shakes' : rk, moss: 0.8, ridge: false })), side: THREE.DoubleSide }));
  rm.shadowSide = THREE.DoubleSide;
  g.add(new THREE.Mesh(polyGeometry([quad([ax0 - ext0, hLo - 0.06, zf], [ax1 + ext1, hLo - 0.06, zf], [ax1 + ext1, hHi, zb], [ax0 - ext0, hHi, zb])]), rm));
  const eb = new THREE.Mesh(new THREE.BoxGeometry(AW + 0.26, 0.07, 0.06), C(r3d, 'trim-' + T.m, T.m));
  eb.position.set(ax0 + AW / 2 + (ext1 - ext0) / 2, hLo - 0.09, zf);
  g.add(eb);
}

// A round tower on a front corner: its walls in the house's stone, two arched windows looking
// out (lit at night), a cornice, a pointed roof and a finial
function addTower(r3d, g, glowMats, { cx, cz, r, h, kind, wallStyle, roofColor, rk, T, seed }) {
  const circ = Math.round(2 * Math.PI * r * 16), th = Math.round(h * 16);
  const p = new Painter(circ, th), gl = new Painter(circ, th);
  gl.rect(0, 0, circ, th, '#000000');
  wallFill(p, 0, 0, circ, th, kind, { ...wallStyle, noBeam: true }, seed + 41);
  const F = ramp('#8f8a93');
  p.rect(0, th - 3, circ, 3, F.m); p.hline(0, th - 3, circ, F.l);
  const mid = Math.round(circ / 2);
  for (const [wy, wh] of [[Math.round(th * 0.14), 10], [Math.round(th * 0.5), 9]]) paintWindow(p, gl, mid - 3, wy, 6, wh, T, { arched: true, curtain: wallStyle.curtain });
  const m = toon(r3d, { map: pixelTexture(p.c), emissive: 0xffffff, emissiveMap: pixelTexture(gl.c), emissiveIntensity: 0 });
  glowMats.push(m);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.04, h, 16, 1, false, -Math.PI), m);
  body.position.set(cx, h / 2, cz);
  g.add(body);
  const corn = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.09, r + 0.05, 0.14, 16), C(r3d, 'trim-' + T.m, T.m));
  corn.position.set(cx, h + 0.02, cz);
  g.add(corn);
  const rt = pixelTexture(paintRoof(Math.round(circ * 0.6), Math.round(r * 1.9 * 16), roofColor, { seed: seed + 42, kind: rk, moss: 0.5, eave: false }));
  rt.wrapS = THREE.RepeatWrapping; rt.repeat.set(2, 1);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(r + 0.2, r * 1.9, 16, 1, true, -Math.PI), wet(toon(r3d, { map: rt, side: THREE.DoubleSide })));
  roof.position.set(cx, h + 0.08 + r * 0.95, cz);
  g.add(roof);
  const gold = C(r3d, 'gold', 0xf2c14e);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), gold);
  ball.position.set(cx, h + 0.08 + r * 1.9 + 0.04, cz);
  g.add(ball);
  const spike = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.26, 6), gold);
  spike.position.set(cx, h + 0.08 + r * 1.9 + 0.22, cz);
  g.add(spike);
  return { x: cx, z: cz, r: r + 0.03 };
}

// A veranda along the front: a plank deck, posts with braces, a beam, and open rafters running back
// to the wall under a climbing vine — seen from above, the house's front still shows between them
function addPorch(r3d, g, { x0, x1, zF, groundH, T, seed, dx, vine }) {
  const depth = 0.95, yTop = groundH - 0.3, yLow = yTop - 0.12;
  const px0 = x0 + 0.04, px1 = x1 - 0.04, PW = px1 - px0;
  const deckT = pixelTexture(paintPlanks(Math.round(PW * 16), Math.round(depth * 16), { dir: 'h', color: '#a8744a', seed: seed + 51 }));
  const edgeM = C(r3d, 'porch-edge', 0x6b4a34);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(PW, 0.1, depth), [edgeM, edgeM, toon(r3d, { map: deckT }), edgeM, edgeM, edgeM]);
  deck.position.set(px0 + PW / 2, 0.05, zF + depth / 2);
  deck.userData.noCast = true;
  g.add(deck);
  const post = C(r3d, 'trim-' + T.m, T.m), colliders = [];
  const n = Math.max(2, Math.round(PW / 2.2) + 1), zp = zF + depth - 0.06;
  for (let i = 0; i < n; i++) {
    const x = px0 + 0.08 + (i * (PW - 0.16)) / (n - 1);
    if (Math.abs(x - dx) < 0.62) continue;                    // (never in front of the door)
    const pm = new THREE.Mesh(new THREE.BoxGeometry(0.1, yLow, 0.1), post);
    pm.position.set(x, yLow / 2, zp);
    g.add(pm);
    for (const s of [-1, 1]) { const br = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.05), post); br.position.set(x + s * 0.1, yLow - 0.14, zp); br.rotation.z = s * -0.7; br.userData.noCast = true; g.add(br); }
    colliders.push({ x, z: zp, r: 0.09 });
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(PW + 0.2, 0.1, 0.1), post);
  beam.position.set(px0 + PW / 2, yLow + 0.02, zp);
  g.add(beam);
  const ledger = new THREE.Mesh(new THREE.BoxGeometry(PW + 0.1, 0.08, 0.08), post);
  ledger.position.set(px0 + PW / 2, yTop, zF + 0.04);
  g.add(ledger);
  // rafters from the wall out past the beam, a slat across them
  const L = depth + 0.2, a = Math.atan2(yTop - yLow, depth);
  for (let x = px0 + 0.1; x <= px1 - 0.05; x += 0.42) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, L), post);
    r.rotation.x = a;
    r.position.set(x, (yTop + yLow) / 2 + 0.05, zF + L / 2);
    r.userData.noCast = true;
    g.add(r);
  }
  // a vine along the beam & over a few rafters: leaves, and fruit or flowers here and there
  if (vine) {
    const rr = rng(seed + 57), ico = new THREE.IcosahedronGeometry(1, 0);
    const leaves = [C(r3d, 'ivy1', 0x4f8f45), C(r3d, 'ivy2', 0x3f7a3f), C(r3d, 'ivy3', 0x6aa84f)];
    const fruit = C(r3d, 'vine-' + vine, vine === 'grapes' ? 0x7a4a9a : 0xf4a4b6);
    for (let x = px0 + 0.05; x < px1; x += 0.2) {
      if (rr() < 0.25) continue;
      const lz = zp + (rr() - 0.5) * 0.14 - (rr() < 0.4 ? rr() * 0.6 : 0);
      const m = new THREE.Mesh(ico, leaves[Math.floor(rr() * 3)]);
      m.position.set(x + (rr() - 0.5) * 0.1, yLow + 0.1 + (zp - lz) * 0.12, lz);
      const sz = 0.1 + rr() * 0.06;
      m.scale.set(sz * 1.3, sz * 0.6, sz);
      m.userData.noCast = true;
      g.add(m);
      if (rr() < 0.3) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.06), fruit); f.position.set(m.position.x, m.position.y - 0.09, m.position.z + 0.03); f.userData.noCast = true; g.add(f); }
    }
    // (and up the two end posts)
    for (const x of [px0 + 0.08, px1 - 0.08]) for (let y = 0.2; y < yLow; y += 0.22) { const m = new THREE.Mesh(ico, leaves[Math.floor(rr() * 3)]); m.position.set(x + (rr() - 0.5) * 0.08, y, zp + 0.06); m.scale.set(0.09, 0.08, 0.05); m.userData.noCast = true; g.add(m); }
  }
  return { colliders };
}

// Ivy up a front corner and along under the eave — or a climbing rose, flowering
function addIvy(r3d, g, { xs, xe, zF, h, seed, roses }) {
  const rr = rng(seed + 61), ico = new THREE.IcosahedronGeometry(1, 0);
  const leaves = [C(r3d, 'ivy1', 0x4f8f45), C(r3d, 'ivy2', 0x3f7a3f), C(r3d, 'ivy3', 0x6aa84f)];
  const bloom = [C(r3d, 'rose1', 0xe0506a), C(r3d, 'rose2', 0xf4a4b6), C(r3d, 'rose3', 0xfff0f4)];
  const pts = [];
  for (let y = 0.12; y < h - 0.3; y += 0.17) pts.push([xs + (rr() - 0.5) * 0.14, y]);
  const n = Math.max(2, Math.round(Math.abs(xe - xs) / 0.2));
  for (let i = 1; i <= n; i++) pts.push([xs + ((xe - xs) * i) / n, h - 0.3 - rr() * 0.12 - (i / n) * 0.25]);
  pts.forEach(([x, y], i) => {
    const s = 0.1 + rr() * 0.07 - (i > pts.length - 4 ? 0.03 : 0);
    const m = new THREE.Mesh(ico, leaves[Math.floor(rr() * 3)]);
    m.position.set(x, y, zF + 0.04);
    m.scale.set(s * 1.2, s, s * 0.45);
    m.rotation.set(rr() * 3, rr() * 3, rr() * 3);
    m.userData.noCast = true;
    g.add(m);
    if (roses && rr() < 0.45) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 0.03), bloom[Math.floor(rr() * 3)]);
      f.position.set(x + (rr() - 0.5) * 0.1, y + (rr() - 0.5) * 0.08, zF + 0.1);
      f.userData.noCast = true;
      g.add(f);
    }
  });
}

// A lantern on an iron bracket beside the door (warm at night)
function addWallLantern(r3d, g, glowMats, { x, y, z }) {
  const iron = C(r3d, 'iron', 0x3b3a46);
  const glass = C(r3d, 'lantern-glass', 0xf3e2b0, { emissive: 0xffb454, emissiveIntensity: 0 });
  if (!glowMats.includes(glass)) glowMats.push(glass);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.2), iron);
  arm.position.set(x, y + 0.2, z - 0.06);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.03), iron);
  plate.position.set(x, y + 0.16, z - 0.15);
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.14), glass);
  box.position.set(x, y, z);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.1, 4), iron);
  cap.rotation.y = Math.PI / 4;
  cap.position.set(x, y + 0.15, z);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.1), iron);
  foot.position.set(x, y - 0.12, z);
  for (const m of [arm, plate, box, cap, foot]) { m.userData.noCast = true; g.add(m); }
}

// The town hall's front: steps up to the door, two columns, a pediment over them
function addPortico(r3d, g, dx, zF, wallH, trim, roofColor) {
  const stone = C(r3d, 'portico', 0xe7ddc8), colMat = C(r3d, 'column', 0xf1ead8);
  // two broad stone steps, their slabs jointed
  for (const [w, d, y, k] of [[2.6, 0.95, 0.05, 0], [2.2, 0.66, 0.14, 1]]) {
    const P = new Painter(Math.round(w * 16), Math.round(d * 16));
    P.rect(0, 0, P.w, P.h, k ? '#ddd3c2' : '#cfc4b2');
    for (let x = 7 + k * 4; x < P.w; x += 11) P.vline(x, 0, P.h, '#b3a894');
    P.hline(0, 0, P.w, k ? '#ece4d6' : '#ddd3c2');
    for (let i = 0; i < 12; i++) P.px(Math.floor(((i * 37) % 97) / 97 * P.w), Math.floor(((i * 53) % 89) / 89 * P.h), '#c2b7a4');
    const top = toon(r3d, { map: pixelTexture(P.c) }), side = C(r3d, 'portico-step', k ? 0xbdb29f : 0xada290);
    const s = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), [side, side, top, side, side, side]);
    s.position.set(dx, y, zF + d / 2);
    s.userData.noCast = true;
    g.add(s);
  }
  for (const cx of [dx - 0.95, dx + 0.95]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, wallH - 0.42, 8), colMat);
    c.position.set(cx, 0.19 + (wallH - 0.42) / 2, zF + 0.62);
    g.add(c);
    for (const [y, s] of [[0.24, 0.34], [wallH - 0.2, 0.32]]) {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(s, 0.08, s), stone);
      cap.position.set(cx, y, zF + 0.62);
      g.add(cap);
    }
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.16, 0.86), stone);
  beam.position.set(dx, wallH - 0.08, zF + 0.43);
  g.add(beam);
  // the pediment: a low triangle facing the square, a round window in it
  const P = new Painter(40, 10), T = ramp(trim || '#4b3a3a');
  for (let y = 0; y < 10; y++) { const hw = Math.round((y + 1) * 2); P.hline(20 - hw, y, hw * 2, y === 9 ? '#c9bfae' : '#efe6d4'); P.px(20 - hw, y, '#b8ad9a'); P.px(19 + hw, y, '#b8ad9a'); }
  P.rect(18, 4, 4, 4, T.d); P.rect(19, 5, 2, 2, '#f3d9a0');
  const pm = toon(r3d, { map: pixelTexture(P.c), alphaTest: 0.5, side: THREE.DoubleSide });
  const ped = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.62), pm);
  ped.position.set(dx, wallH + 0.3, zF + 0.86);
  g.add(ped);
  const rf = C(r3d, 'portico-roof-' + roofColor, ramp(roofColor || '#4f6aa3').m);
  for (const s of [-1, 1]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.07, 0.9), rf);
    r.rotation.z = s * -0.44;
    r.position.set(dx + s * 0.64, wallH + 0.33, zF + 0.43);
    g.add(r);
  }
}

// The barn: big X-braced double doors, a hay loft door, a cupola with a weathervane on the ridge
function addBarn(r3d, g, { x0, x1, W, zF, zM, yr, dx, trim, roof }) {
  const T = ramp(trim), D = ramp('#b8443f');
  const w = 44, h = 26, p = new Painter(w, h);
  p.rect(0, 0, w, h, T.m);
  for (const [ox] of [[2], [23]]) {
    p.rect(ox, 2, 19, h - 2, D.m);
    for (let x = ox + 2; x < ox + 19; x += 3) p.vline(x, 2, h - 2, D.d);
    // the white X brace and its frame
    p.rect(ox, 2, 19, 2, T.m); p.rect(ox, h - 3, 19, 2, T.m); p.rect(ox, 2, 2, h - 2, T.m); p.rect(ox + 17, 2, 2, h - 2, T.m);
    for (let i = 0; i < h - 5; i++) { const k = i / (h - 6); p.rect(ox + 2 + Math.round(k * 14), 4 + i, 2, 1, T.l); p.rect(ox + 15 - Math.round(k * 14), 4 + i, 2, 1, T.l); }
  }
  p.rect(21, 2, 2, h - 2, T.d); p.px(19, 14, '#3b3a46'); p.px(25, 14, '#3b3a46');
  const dm = toon(r3d, { map: pixelTexture(p.c) });
  const doors = new THREE.Mesh(new THREE.BoxGeometry(w / 16, h / 16, 0.06), [dm, dm, dm, dm, dm, dm]);
  doors.position.set(dx, h / 32, zF + 0.03);
  g.add(doors);
  // the cupola: a louvred box in white trim with its own little roof, a rooster weathervane
  const cx = x0 + W / 2, cz = zM;
  const lp = new Painter(10, 9);
  lp.rect(0, 0, 10, 9, T.m); lp.vline(0, 0, 9, T.d); lp.hline(0, 8, 10, T.d);
  lp.rect(2, 1, 6, 7, '#4a3238');
  for (let y = 2; y < 8; y += 2) lp.hline(2, y, 6, '#b8443f');
  const lm = toon(r3d, { map: pixelTexture(lp.c) });
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.56, 0.6), lm);
  box.position.set(cx, yr + 0.2, cz);
  g.add(box);
  const RC = ramp(roof);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.56, 0.42, 4), C(r3d, 'cupola-' + roof, RC.m));
  cap.rotation.y = Math.PI / 4;
  cap.position.set(cx, yr + 0.69, cz);
  g.add(cap);
  const rim = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.06, 0.78), C(r3d, 'trim-' + T.m, T.m));
  rim.position.set(cx, yr + 0.49, cz);
  g.add(rim);
  const iron = C(r3d, 'iron', 0x3b3a46);
  const rod = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.62, 0.04), iron);
  rod.position.set(cx, yr + 1.1, cz);
  g.add(rod);
  for (const [w, d] of [[0.5, 0.04], [0.04, 0.5]]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), iron);
    arm.position.set(cx, yr + 1.02, cz);
    arm.userData.noCast = true;
    g.add(arm);
  }
  const P = new Painter(12, 11);
  P.grid(['....oo......', '...occo.....', '..occcco....', '...o.cco....', '......cco.oo', '.....ccccoco', '....ccccccco', '.....ccccco.', '......cco...', '.......o....', '......ooo...'], { c: '#3b3a46', o: '#2a2833' });
  const rooster = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.46), toon(r3d, { map: pixelTexture(P.c), alphaTest: 0.5, side: THREE.DoubleSide }));
  rooster.position.set(cx, yr + 1.5, cz);
  rooster.userData.flag = true;
  g.add(rooster);
}

function addClockTower(r3d, g, cx, yr, zM, roofColor) {
  const towerH = 1.3;
  const p = new Painter(16, Math.round(towerH * 16));
  p.rect(0, 0, 16, p.h, '#d8d0c4');
  p.rect(0, p.h - 2, 16, 2, '#a8a0a8');
  // clock face
  p.rect(3, 3, 10, 10, '#4b3a3a'); p.rect(4, 4, 8, 8, '#fbf1dc');
  p.px(7, 5, '#3b2a2e'); p.px(7, 6, '#3b2a2e'); p.px(7, 7, '#3b2a2e'); p.px(8, 8, '#3b2a2e'); p.px(9, 8, '#3b2a2e');
  p.px(4, 4, '#e0d4bc'); p.px(11, 11, '#e0d4bc');
  const m = toon(r3d, { map: pixelTexture(p.c) });
  const t = new THREE.Mesh(new THREE.BoxGeometry(1, towerH, 1), [m, m, m, m, m, m]);
  t.position.set(cx, yr - 0.3 + towerH / 2, zM + 0.3);
  g.add(t);
  const R = ramp(roofColor || '#4f6aa3');
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.9, 4, 1), toon(r3d, { color: new THREE.Color(R.m) }));
  cone.rotation.y = Math.PI / 4;
  cone.position.set(cx, yr - 0.3 + towerH + 0.45, zM + 0.3);
  g.add(cone);
  // flag
  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, 0.05), toon(r3d, { color: 0x6a6571, key: 'pole' }));
  pole.position.set(cx, yr - 0.3 + towerH + 1.2, zM + 0.3);
  g.add(pole);
  const fp = new Painter(10, 6);
  fp.rect(0, 0, 10, 6, '#e8883a'); fp.rect(0, 2, 10, 2, '#fbf1dc'); fp.px(4, 2, '#ec5f73'); fp.px(5, 3, '#ec5f73');
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.38), toon(r3d, { map: pixelTexture(fp.c), side: THREE.DoubleSide }));
  flag.position.set(cx + 0.33, yr - 0.3 + towerH + 1.45, zM + 0.3);
  flag.userData.flag = true;
  g.add(flag);
}

// ---------------------------------------------------------------------------
// Lighthouse "Old Glimmer"
// ---------------------------------------------------------------------------
function buildLighthouse(r3d, b) {
  const g = new THREE.Group();
  const cx = b.x + b.w / 2, cz = b.y + b.h / 2;
  const towerH = 6.8;
  // base
  const baseTex = paintWall(48, 16, 'stone', { wallColor: '#a9a3a8' }, 91, { foundation: false });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.6, 0.9, 16), toon(r3d, { map: pixelTexture(baseTex) }));
  base.position.set(cx, 0.45, cz);
  g.add(base);
  // striped tower
  const tp = new Painter(64, Math.round(towerH * 16));
  for (let y = 0; y < tp.h; y++) {
    const band = Math.floor(y / 14) % 2 === 0;
    const R = ramp(band ? '#f4efe4' : '#d65a4f');
    tp.hline(0, y, 64, y % 14 === 0 ? R.l : y % 14 === 13 ? R.d : R.m);
  }
  // windows & door on the front (texture centre faces south)
  for (const wy of [18, 46]) { tp.rect(29, wy, 6, 8, '#3b2a2e'); tp.rect(30, wy + 1, 4, 6, '#9ccbe8'); tp.px(30, wy + 1, '#ffffff'); tp.hline(29, wy + 8, 6, '#e0d4bc'); }
  tp.rect(27, tp.h - 20, 10, 20, '#3b2a2e'); tp.rect(28, tp.h - 19, 8, 19, '#8e5d3e');
  tp.vline(30, tp.h - 18, 18, '#6b4330'); tp.vline(33, tp.h - 18, 18, '#6b4330'); tp.px(34, tp.h - 10, '#f2c14e');
  const towerMat = toon(r3d, { map: pixelTexture(tp.c) });
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.3, towerH, 20, 1, false, -Math.PI), towerMat);
  tower.position.set(cx, 0.9 + towerH / 2, cz);
  g.add(tower);
  const yTop = 0.9 + towerH;
  // gallery
  const gal = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.1, 0.18, 20), toon(r3d, { color: 0x4b4854, key: 'gallery' }));
  gal.position.set(cx, yTop + 0.09, cz);
  g.add(gal);
  // (a railing of bars: a band of rails, see-through between them)
  const RP = new Painter(64, 6);
  for (let x = 0; x < 64; x++) { RP.px(x, 0, '#3b3a46'); RP.px(x, 1, '#5a5866'); if (x % 4 === 0) RP.vline(x, 2, 4, '#3b3a46'); }
  RP.hline(0, 4, 64, '#3b3a46');
  const railT = pixelTexture(RP.c); railT.wrapS = THREE.RepeatWrapping; railT.repeat.set(2, 1);
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.18, 0.34, 20, 1, true), toon(r3d, { map: railT, key: 'rail2', side: THREE.DoubleSide, alphaTest: 0.5 }));
  rail.position.set(cx, yTop + 0.35, cz);
  g.add(rail);
  // lantern room (glass) — emissive when lit
  const glassMat = toon(r3d, { color: 0x9fc4d6, emissive: 0xffd88a, emissiveIntensity: 0 });
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.8, 12), glassMat);
  glass.position.set(cx, yTop + 0.58, cz);
  g.add(glass);
  const domeT = pixelTexture(paintRoof(48, 14, '#c8454f', { seed: 44, kind: 'tin', moss: 0, eave: false }));
  domeT.wrapS = THREE.RepeatWrapping; domeT.repeat.set(2, 1);
  const dome = new THREE.Mesh(new THREE.ConeGeometry(0.82, 0.75, 12), wet(toon(r3d, { map: domeT })));
  dome.position.set(cx, yTop + 1.35, cz);
  g.add(dome);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), toon(r3d, { color: 0xf2c14e, key: 'gold' }));
  knob.position.set(cx, yTop + 1.8, cz);
  g.add(knob);
  shadowFlags(g, true, true);
  return {
    group: g, glowMats: [], lamp: glassMat, lights: [], chimneys: [],
    lampPos: { x: cx, y: yTop + 0.6, z: cz }, doorWorld: { x: b.door + 0.5, z: b.y + b.h },
  };
}

// ---------------------------------------------------------------------------
// Windmill (Honeydew Fields) — the sails turn once Bram gets it running
// ---------------------------------------------------------------------------
function buildWindmill(r3d, b) {
  const g = new THREE.Group();
  const cx = b.x + b.w / 2, cz = b.y + b.h / 2;
  const towerH = 4.2;
  const tp = new Painter(64, Math.round(towerH * 16));
  const R = ramp('#efe3cc');
  tp.rect(0, 0, 64, tp.h, R.m);
  for (let y = 3; y < tp.h; y += 5) tp.hline(0, y, 64, (y / 5) % 2 ? R.d : '#e6d8bd');
  for (let x = 0; x < 64; x += 8) tp.vline(x, 0, tp.h, '#e0d0b2');
  tp.rect(0, tp.h - 6, 64, 6, '#a9a3a8');
  for (let x = 1; x < 64; x += 6) tp.hline(x, tp.h - 4, 4, '#8f8a94');
  // door & windows face south (texture centre)
  tp.rect(27, tp.h - 22, 10, 22, '#3b2a2e'); tp.rect(28, tp.h - 21, 8, 21, '#8e5d3e');
  tp.vline(31, tp.h - 20, 20, '#6b4330'); tp.px(34, tp.h - 11, '#f2c14e');
  tp.rect(28, tp.h - 25, 8, 2, '#6b4330');
  const winY = [16, 34];
  for (const wy of winY) { tp.rect(29, wy, 6, 7, '#3b2a2e'); tp.rect(30, wy + 1, 4, 5, '#f3d9a0'); tp.hline(29, wy + 7, 6, '#c9b797'); }
  const gp = new Painter(64, tp.h);
  for (const wy of winY) gp.rect(30, wy + 1, 4, 5, '#ffe0a0');
  const towerMat = toon(r3d, { map: pixelTexture(tp.c), emissive: 0xffffff, emissiveMap: pixelTexture(gp.c), emissiveIntensity: 0 });
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.42, towerH, 8, 1, false, -Math.PI - Math.PI / 8), towerMat);
  tower.position.set(cx, towerH / 2, cz);
  g.add(tower);
  // cap roof
  const capT = pixelTexture(paintRoof(72, 26, '#b5524a', { seed: 45, kind: 'shingle', moss: 0.6, eave: false }));
  capT.wrapS = THREE.RepeatWrapping; capT.repeat.set(2, 1);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.35, 1.5, 8), wet(toon(r3d, { map: capT })));
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), toon(r3d, { color: 0x6b4330, key: 'millspar' }));
  knob.position.set(cx, towerH + 1.56, cz);
  g.add(knob);
  cap.rotation.y = Math.PI / 8;
  cap.position.set(cx, towerH + 0.75, cz);
  g.add(cap);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.16, 8), toon(r3d, { color: 0x6b4330, key: 'millrim' }));
  rim.rotation.y = Math.PI / 8;
  rim.position.set(cx, towerH + 0.02, cz);
  g.add(rim);
  // sails
  const spinner = new THREE.Group();
  spinner.position.set(cx, towerH - 0.2, cz + 1.28);
  const spar = toon(r3d, { color: 0x6b4330, key: 'millspar' });
  const sp = new Painter(8, 28);
  sp.rect(0, 0, 8, 28, '#f4efe4');
  for (let y = 0; y < 28; y += 4) sp.hline(0, y, 8, '#8e5d3e');
  sp.vline(0, 0, 28, '#8e5d3e'); sp.vline(7, 0, 28, '#8e5d3e'); sp.vline(4, 0, 28, '#d8cdb8');
  const sailMat = toon(r3d, { map: pixelTexture(sp.c), side: THREE.DoubleSide });
  sailMat.shadowSide = THREE.DoubleSide;
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group();
    arm.rotation.z = (i * Math.PI) / 2 + Math.PI / 4;
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.5, 0.08), spar);
    beam.position.y = 1.25;
    arm.add(beam);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 1.95), sailMat);
    sail.position.set(0.32, 1.45, 0.02);
    arm.add(sail);
    spinner.add(arm);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.3, 8), spar);
  hub.rotation.x = Math.PI / 2;
  spinner.add(hub);
  g.add(spinner);
  // doorstep
  const step = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 0.3), toon(r3d, { color: 0x9a94a0, key: 'step' }));
  step.position.set(b.door + 0.5, 0.05, b.y + b.h + 0.05);
  g.add(step);
  shadowFlags(g, true, true);
  step.castShadow = false;
  const lights = [
    { x: cx, y: 1.6, z: cz + 1.9, color: 0xffb35c, power: 0.8 },
    { x: b.door + 0.5, y: 1.0, z: b.y + b.h + 0.6, color: 0xffb35c, power: 0.6 },
  ];
  return {
    group: g, glowMats: [towerMat], lights, chimneys: [], spinner,
    doorWorld: { x: b.door + 0.5, z: b.y + b.h },
  };
}

export { paintWood };
