// Procedural 3D buildings: painted facades, shingled gable/hip roofs,
// chimneys, awnings, signs, doorsteps and night-glowing windows.

import { THREE, pixelTexture, toon } from '../render/r3d.js';
import { paintFacade, paintRoof, paintWall, paintAwning, Painter, drawIcon, paintWood } from '../art/surfaces.js';
import { polyGeometry, quad, tri, shadowFlags } from './geom.js';
import { ramp } from '../engine/color.js';
import { hashStr } from '../engine/util.js';

const U = 1 / 16;

function mat(r3d, canvas, extra = {}) {
  return toon(r3d, { map: pixelTexture(canvas), ...extra });
}

// b: { id, x, y, w, h, door, style }  (tiles). Returns { group, glowMats, lights, door, chimneys }
export function buildBuilding(r3d, b) {
  const st = b.style || {};
  if (st.kind === 'lighthouse') return buildLighthouse(r3d, b);
  if (st.kind === 'windmill') return buildWindmill(r3d, b);
  const seed = hashStr(b.id);
  const g = new THREE.Group();
  const W = b.w, D = b.h;
  const x0 = b.x, x1 = b.x + W, zB = b.y, zF = b.y + D, zM = b.y + D / 2;
  const wallH = st.wallH || 2;
  const kind = st.wall || 'plaster';
  const wallStyle = { trim: st.trim, wallColor: st.wallColor, round: st.round, flowerbox: st.flowerbox, shutter: st.shutter, curtain: st.curtain || '#f4f1ec', doorColor: st.doorColor };

  // ---- walls
  const facade = paintFacade({
    wTiles: W, hPx: Math.round(wallH * 16), kind, style: wallStyle,
    doorX: b.door - b.x, seed, sign: st.signOnWall ? st.sign : null,
  });
  const frontMat = toon(r3d, { map: pixelTexture(facade.color), emissive: 0xffffff, emissiveMap: pixelTexture(facade.glow), emissiveIntensity: 0 });
  const sideMat = mat(r3d, paintWall(D * 16, Math.round(wallH * 16), kind, wallStyle, seed + 1));
  const topMat = toon(r3d, { color: 0x3b2a2e });
  const walls = new THREE.Mesh(new THREE.BoxGeometry(W, wallH, D), [sideMat, sideMat, topMat, topMat, frontMat, sideMat]);
  walls.position.set(x0 + W / 2, wallH / 2, zB + D / 2);
  g.add(walls);

  // ---- roof
  const ox = 0.25, oz = 0.3;
  const yb = wallH - U;
  const pitch = st.pitch || 0.85;
  const run = D / 2 + oz;
  const rise = Math.round((D / 2) * pitch * 16) / 16;
  const yr = wallH + rise;
  const roofColor = st.roof || '#c75b4e';
  const projH = Math.round((rise + U + run) * 16);
  const roofW = Math.round((W + ox * 2) * 16);
  const roofTex = pixelTexture(paintRoof(roofW, projH, roofColor, { seed, kind: st.scallop ? 'scallop' : 'shingle' }));
  const roofMat = toon(r3d, { map: roofTex });
  roofMat.shadowSide = THREE.DoubleSide;
  const gableMat = mat(r3d, paintWall(D * 16, Math.round(rise * 16) + 2, kind === 'brick' || kind === 'stone' ? 'boards' : kind, { ...wallStyle, wallColor: st.gableColor || st.wallColor }, seed + 2, { foundation: false }));
  gableMat.shadowSide = THREE.DoubleSide;
  const hip = !!st.hip;
  const ra = [x0 - ox, yb, zF + oz], rb = [x1 + ox, yb, zF + oz];
  const bb = [x1 + ox, yb, zB - oz], ba = [x0 - ox, yb, zB - oz];
  let roofPolys, gablePolys = [];
  if (!hip) {
    const rc = [x1 + ox, yr, zM], rd = [x0 - ox, yr, zM];
    roofPolys = [
      quad(ra, rb, rc, rd),
      quad(bb, ba, rd, rc),
    ];
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
  const roof = new THREE.Mesh(polyGeometry(roofPolys), roofMat);
  g.add(roof);
  if (gablePolys.length) g.add(new THREE.Mesh(polyGeometry(gablePolys), gableMat));
  // roof underside (so the overhang reads solid & casts shadow)
  const under = new THREE.Mesh(polyGeometry([quad(rb, ra, ba, bb)]), toon(r3d, { color: 0x4a2e25, key: 'roofUnder' }));
  g.add(under);

  // ---- chimney
  const chimneys = [];
  if (st.chimney) {
    const cx = x0 + Math.min(W - 0.5, Math.max(0.5, st.chimney + 0.5));
    const cz = zM + 0.55;
    const slopeY = yr - (cz - zM) * (rise / run);
    const top = yr + 0.55;
    const h = top - (slopeY - 0.2);
    const brick = mat(r3d, paintWall(8, Math.ceil(h * 16), 'brick', { wallColor: '#a4574a' }, seed + 3, { foundation: false }));
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.5, h, 0.5), brick);
    ch.position.set(cx, slopeY - 0.2 + h / 2, cz);
    g.add(ch);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.12, 0.62), toon(r3d, { color: 0x5a4a55, key: 'chimcap' }));
    cap.position.set(cx, top + 0.06, cz);
    g.add(cap);
    chimneys.push({ x: cx, y: top + 0.2, z: cz });
  }

  // ---- awning over the front
  if (st.awning) {
    const [c1, c2] = st.awning;
    const aw = W - 0.5, drop = 0.35, out = 0.6;
    const ay = wallH - 0.62;
    const tex = paintAwning(Math.round(aw * 16), Math.round((drop + out) * 16) + 2, c1, c2);
    const aMat = toon(r3d, { map: pixelTexture(tex), alphaTest: 0.5, side: THREE.DoubleSide });
    aMat.shadowSide = THREE.DoubleSide;
    const ax0 = x0 + 0.25, ax1 = x1 - 0.25;
    const awn = new THREE.Mesh(polyGeometry([quad(
      [ax0, ay - drop - 2 * U, zF + out], [ax1, ay - drop - 2 * U, zF + out], [ax1, ay, zF + 0.02], [ax0, ay, zF + 0.02],
    )]), aMat);
    g.add(awn);
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
    board.position.set(sx + 0.1, wallH - 0.95, zF + 0.45);
    g.add(board);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), woodMat);
    arm.position.set(sx + 0.1, wallH - 0.62, zF + 0.25);
    g.add(arm);
    board.userData.swing = true;
  }

  // ---- doorstep & mat
  const dx = b.door + 0.5;
  const step = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 0.3), toon(r3d, { color: 0x9a94a0, key: 'step' }));
  step.position.set(dx, 0.05, zF + 0.15);
  g.add(step);

  // ---- clock / flag / columns for the town hall
  if (st.clock) addClockTower(r3d, g, x0 + W / 2, yr, zM, st.roof);
  if (st.columns) {
    const colMat = toon(r3d, { color: 0xf1ead8, key: 'column' });
    for (const cx of [dx - 0.95, dx + 0.95]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, wallH - 0.3, 8), colMat);
      c.position.set(cx, (wallH - 0.3) / 2, zF + 0.55);
      g.add(c);
    }
    const port = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.18, 0.8), toon(r3d, { color: 0xe7ddc8, key: 'portico' }));
    port.position.set(dx, wallH - 0.25, zF + 0.4);
    g.add(port);
  }

  shadowFlags(g, true, true);
  step.castShadow = false;

  // light spots in front of windows & door (for night lighting)
  const lights = facade.windows.map((wn) => ({
    x: x0 + (wn.x + wn.w / 2) / 16, y: wallH - (wn.y + wn.h / 2) / 16, z: zF + 0.6, color: 0xffb35c, power: 1,
  }));
  lights.push({ x: dx, y: 1.0, z: zF + 0.6, color: 0xffb35c, power: 0.7 });

  return { group: g, glowMats: [frontMat], lights, chimneys, doorWorld: { x: dx, z: zF } };
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
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.18, 0.34, 20, 1, true), toon(r3d, { color: 0x3b3a46, key: 'rail', side: THREE.DoubleSide, transparent: false }));
  rail.position.set(cx, yTop + 0.35, cz);
  g.add(rail);
  // lantern room (glass) — emissive when lit
  const glassMat = toon(r3d, { color: 0x9fc4d6, emissive: 0xffd88a, emissiveIntensity: 0 });
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.8, 12), glassMat);
  glass.position.set(cx, yTop + 0.58, cz);
  g.add(glass);
  const dome = new THREE.Mesh(new THREE.ConeGeometry(0.82, 0.75, 12), toon(r3d, { color: 0xc8454f }));
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
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.35, 1.5, 8), toon(r3d, { color: 0xb5524a, key: 'millroof' }));
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
