// The clocks (room kind `clock`, World v7 chapter 9 — Hollowmoor Manor): a grandfather
// clock in the room; step on the plate at its foot and the room shifts between THEN (the
// manor in its heyday: warm candlelight, furniture where it stood, doors that were open)
// and NOW (dust, cold, rubble, floors fallen in). What stands in one time is gone in the
// other. Everyone in the room shares its time.
//   clocks: [[x, z]…]                   its clocks (each plate, just south of one, turns the
//                                        whole room — `clock: [x, z]` for just the one)
//   era: ’now’ | ’then’                 the time the room starts in
//   then / now: { walls: [[x, z, w, d, kind]], pits: [[x, z, w, d]] }
//                                        what exists only in that time: furniture, bricked
//                                        doors, rubble (solid); holes in the floor (fall in:
//                                        a bump and back to `back`)
//   goalZ                                past this line the room is passed (opens `opens`)

import { THREE } from '../render/r3d.js';
import { audio } from '../engine/audio.js';
import { t } from '../i18n.js';

// the pieces each time is made of
function block(K, g, w, d, kind) {
  const h = kind === 'shelf' ? 2.2 : kind === 'brick' ? 2.6 : kind === 'sofa' ? 0.9 : kind === 'piano' ? 1.2 : kind === 'rubble' ? 1.2 : kind === 'beam' ? 0.8 : 1.6;
  if (kind === 'shelf') {
    K.put(g, K.box(w, h, d), K.c('#6a4228'), 0, h / 2, 0);
    for (let k = 0; k < 3; k++) for (let i = 0; i < Math.floor(w * 3); i++) K.put(g, K.box(0.14, 0.4, d * 0.7), K.c(['#8a3a3a', '#3a5a8a', '#5a7a3a', '#b8903a'][(i + k) % 4]), -w / 2 + 0.2 + i * 0.32, 0.4 + k * 0.66, 0.05);
  } else if (kind === 'brick') {
    const br = K.tex('manorbrick', 16, 16, (p) => { p.rect(0, 0, 16, 16, '#8a5a4a'); for (let y = 0; y < 16; y += 4) { p.rect(0, y, 16, 1, '#5a3a30'); for (let x = (y / 4) % 2 ? 0 : 4; x < 16; x += 8) p.rect(x, y, 1, 4, '#5a3a30'); } }, { rx: w / 2, ry: 1.3 });
    K.put(g, K.box(w, h, d), br, 0, h / 2, 0);
  } else if (kind === 'sofa') {
    K.put(g, K.box(w, 0.5, d), K.c('#7a3a5a'), 0, 0.25, 0);
    K.put(g, K.box(w, 0.8, 0.25), K.c('#6a2a4a'), 0, 0.5, -d / 2 + 0.12);
    for (const s of [-1, 1]) K.put(g, K.box(0.25, 0.65, d), K.c('#6a2a4a'), s * (w / 2 - 0.12), 0.4, 0);
  } else if (kind === 'piano') {
    K.put(g, K.box(w, 0.9, d), K.c('#1e1a24'), 0, 0.75, 0);
    K.put(g, K.box(w * 0.9, 0.06, 0.3), K.c('#f4f0e8'), 0, 1.22, d / 2 - 0.2);
    for (const [x, z] of [[-w / 2 + 0.2, -d / 2 + 0.2], [w / 2 - 0.2, -d / 2 + 0.2], [0, d / 2 - 0.2]]) K.put(g, K.box(0.12, 0.3, 0.12), K.c('#1e1a24'), x, 0.15, z);
  } else if (kind === 'rubble') {
    for (let i = 0; i < Math.max(3, Math.round(w * d)); i++) { const s = 0.35 + ((i * 37) % 10) / 20; K.put(g, K.ball(s, 5, 4), K.c(['#6a625a', '#7a7068', '#5a524a'][i % 3]), (((i * 53) % 10) / 10 - 0.5) * w * 0.8, s * 0.6, (((i * 29) % 10) / 10 - 0.5) * d * 0.8); }
    K.put(g, K.box(w * 0.9, 0.12, 0.16), K.c('#5a3a24'), 0, 0.9, 0, 0.3, 0, 0.3);
  } else if (kind === 'beam') {
    K.put(g, K.box(w, 0.3, 0.3), K.c('#5a3a24'), 0, 0.5, 0, 0, 0, 0.15);
    for (let i = 0; i < 3; i++) K.put(g, K.ball(0.3, 5, 4), K.c('#6a625a'), -w / 3 + i * (w / 3), 0.25, 0.2);
  } else K.put(g, K.box(w, h, d), K.c('#6a4228'), 0, h / 2, 0);
}

export function buildClockRoom(d, r) {
  const K = d.K, root = K.grp(d.root, 0, 0, 0);
  const T = { root, era: r.era || 'now', sets: {}, near: false, flash: 0 };
  for (const era of ['then', 'now']) {
    const E = r[era] || {}, g = K.grp(root, 0, 0, 0), cols = [];
    for (const [x, z, w, dd, kind = 'brick'] of E.walls || []) {
      const b = K.grp(g, x, 0, z); block(K, b, w, dd, kind);
      const c = { rect: [x - w / 2, z - dd / 2, w, dd] }; d.colliders.push(c); cols.push(c);
    }
    const pits = [];
    for (const [x, z, w, dd] of E.pits || []) {
      // (a hole in the floor: dark, broken boards round its edge)
      const p = K.grp(g, x, 0, z);
      K.noCast(K.put(p, K.box(w, 0.02, dd), K.c('#0a0610'), 0, 0.02, 0));
      for (let i = 0; i < Math.round(w * 2); i++) K.put(p, K.box(0.5, 0.06, 0.18), K.c('#5a3a24'), -w / 2 + 0.25 + i * 0.5, 0.05, -dd / 2 - 0.05, (i % 2 ? 0.3 : -0.2));
      pits.push({ x, z, w, d: dd });
    }
    T.sets[era] = { g, cols, pits };
  }
  // the grandfather clocks, and their plates
  T.clocks = (r.clocks || [r.clock]).map(([cx, cz]) => {
    const cg = K.grp(root, cx, 0, cz);
    const wood = K.c('#4a2a1a'), brass = K.glow('#e0b050', '#a87a2a', 0.3);
    K.put(cg, K.box(0.9, 2.6, 0.55), wood, 0, 1.3, 0);
    K.put(cg, K.box(1.0, 0.2, 0.6), wood, 0, 2.7, 0);
    K.put(cg, K.cyl(0.34, 0.34, 0.06, 16), K.c('#f4ecd8'), 0, 2.1, 0.29, 0, Math.PI / 2);
    const hands = K.grp(cg, 0, 2.1, 0.33);
    K.put(hands, K.box(0.04, 0.2, 0.02), K.c('#241a2e'), 0, 0.08, 0); K.put(hands, K.box(0.03, 0.28, 0.02), K.c('#241a2e'), 0, 0.12, 0);
    const pend = K.grp(cg, 0, 1.6, 0.3);
    K.put(pend, K.box(0.03, 0.8, 0.02), brass, 0, -0.4, 0);
    K.put(pend, K.cyl(0.14, 0.14, 0.04, 12), brass, 0, -0.85, 0, 0, Math.PI / 2);
    d.colliders.push({ x: cx, z: cz, r: 0.5 });
    const plate = K.noCast(K.put(root, K.cyl(0.5, 0.55, 0.06, 16), K.glow('#e0c080', '#c8904a', 0.3), cx, 0.03, cz + 1.2));
    plate.material = plate.material.clone();
    return { x: cx, z: cz, hands, pend, plate, near: false };
  });
  // the room’s candles (then) and its cold light (now)
  T.warm = []; T.cold = [];
  for (const [lx, lz] of r.lamps || [[r.x + 2, r.z + 2], [r.x + r.w - 2, r.z + 2], [r.x + 2, r.z + r.h - 2], [r.x + r.w - 2, r.z + r.h - 2]]) {
    const w = { x: d.ox + lx, y: 1.8, z: d.oz + lz, color: '#ffc070', power: 0, dist: 7, lamp: true }; d.lights.push(w); T.warm.push(w);
    const c = { x: d.ox + lx, y: 1.8, z: d.oz + lz, color: '#8ab0e8', power: 0, dist: 6, lamp: true }; d.lights.push(c); T.cold.push(c);
  }
  show(T, T.era, true);
  return T;
}

function show(T, era, instant = false) {
  T.era = era;
  for (const [k, S] of Object.entries(T.sets)) {
    const on = k === era;
    S.g.visible = on;
    for (const c of S.cols) c.disabled = !on;
  }
  if (instant) { for (const w of T.warm) w.power = era === 'then' ? 1.3 : 0; for (const c of T.cold) c.power = era === 'now' ? 0.9 : 0; }
}

// the room each frame
export function clockRoom(d, r, inside, dt) {
  const T = r.ck;
  if (!T) return;
  const P = d.P;
  if (r.run && r.state === 'idle' && inside.length) { r.state = 'running'; r.run(d.D.saga, d, r); }
  else if (r.state === 'running' && r.tick) r.tick(d.D.saga, d, r, dt);
  const lx = (p) => p.pos.x - d.ox, lz = (p) => p.pos.z - d.oz;
  // a plate: step on it and the room’s time turns over
  const then = T.era === 'then';
  for (const ck of T.clocks) {
    const on = inside.some((p) => !p.flight && Math.hypot(lx(p) - ck.x, lz(p) - (ck.z + 1.2)) < 0.6);
    if (on && !ck.near) turn(d, r, inside);
    ck.near = on;
    ck.plate.material.emissiveIntensity = on ? 1.2 : 0.3 + Math.sin(d.t * 2.5) * 0.12;
    // (the clock: its pendulum swings and its hands turn — only in THEN; NOW it’s stopped at twenty to nine)
    ck.pend.rotation.z = then ? Math.sin(d.t * 3) * 0.3 : 0.05;
    ck.hands.children[0].rotation.z = then ? -d.t * 0.05 : -2.1; ck.hands.children[1].rotation.z = then ? -d.t * 0.6 : 0;
  }
  for (const w of T.warm) w.power += ((T.era === 'then' ? 1.3 : 0) - w.power) * Math.min(1, dt * 4);
  for (const c of T.cold) c.power += ((then ? 0 : 0.9) - c.power) * Math.min(1, dt * 4);
  if (Math.random() < dt * (then ? 2 : 4)) P.world.fx.emit(then ? 'sparkle' : 'smoke', d.ox + r.x + 1 + Math.random() * (r.w - 2), then ? 1.5 : 0.4, d.oz + r.z + 1 + Math.random() * (r.h - 2), 1, { color: then ? '#ffd8a0' : '#9a9aa8' });
  // a pit underfoot: down you go — a bump, and back to the door
  const S = T.sets[T.era];
  for (const p of inside) {
    if (p.flight || (p.actor && p.actor.jumpY > 0.3)) continue;
    if (!S.pits.some((q) => Math.abs(lx(p) - q.x) < q.w / 2 - 0.1 && Math.abs(lz(p) - q.z) < q.d / 2 - 0.1)) continue;
    const [bx, bz] = r.back || [r.x + r.w / 2, r.z + r.h - 1.5];
    const C = P.combat;
    if (C && p.fighter) C.hurtPlayer(p, 8 * (1 + (d.def.lv[0] - 1) * 0.1), { from: 'trap' });
    P.world.fx.emit('dust', p.pos.x, 0.3, p.pos.z, 10, { color: '#6a625a' });
    if (P.solo) P.gatherAt(d.ox + bx, d.oz + bz); else p.actor.pos = { x: d.ox + bx + (Math.random() - 0.5), z: d.oz + bz };
    audio.sfx('thud', { volume: 0.6 });
    P.toast(t(r.fell || 'The floor gives way! Down to the cellar — and back up the stairs.'), '#ff9a8a');
  }
  if (!r.passed && r.goalZ && inside.some((p) => lz(p) < r.goalZ)) {
    r.passed = true;
    for (const id of r.opens || []) { const G = d.gate(id); if (G) d.setGate(G, true); }
    if (r.done) P.showBanner(t(r.done), '');
  }
}

// turn the room’s time over (the plate, or the Lady herself)
export function turn(d, r, inside, to = null) {
  const T = r.ck, P = d.P, era = to || (T.era === 'then' ? 'now' : 'then');
  if (era === T.era) return;
  show(T, era);
  audio.sfx('bell', { volume: 0.7, pitch: era === 'then' ? 7 : -5 }); audio.sfx('whoosh', { volume: 0.5, pitch: era === 'then' ? 4 : -6 });
  if (P.stage && P.stage.flash) P.stage.flash(era === 'then' ? '#f0d8a8' : '#a8b8d8', 0.35);
  // (nobody gets left inside something that has just come back into being)
  const S = T.sets[era];
  for (const p of inside) {
    const lx = p.pos.x - d.ox, lz = p.pos.z - d.oz;
    for (const c of S.cols) {
      const [x, z, w, dd] = c.rect;
      if (lx < x - 0.3 || lx > x + w + 0.3 || lz < z - 0.3 || lz > z + dd + 0.3) continue;
      const opts = [[x - 0.45, lz], [x + w + 0.45, lz], [lx, z - 0.45], [lx, z + dd + 0.45]].sort((a, b) => Math.hypot(a[0] - lx, a[1] - lz) - Math.hypot(b[0] - lx, b[1] - lz));
      const [nx, nz] = opts[0];
      if (P.solo) P.gatherAt(d.ox + nx, d.oz + nz); else p.actor.pos = { x: d.ox + nx, z: d.oz + nz };
    }
  }
  if (!r.toldEra) { r.toldEra = true; P.toast(t(era === 'then' ? (r.thenSaid || 'The clock strikes — and the room is as it was, long ago.') : (r.nowSaid || 'The clock stops — and the dust comes back.')), era === 'then' ? '#ffd8a0' : '#b8c8e8'); }
}

// (the harness) the way through: which time lets a hero from the room’s door to its far side
export function solveClock(d, r) {
  // try each time: a simple flood fill over the room’s tiles (walls and pits of that time block)
  for (const era of [r.ck.era, r.ck.era === 'then' ? 'now' : 'then']) {
    const E = r[era] || {}, blocked = (x, z) => (E.walls || []).some(([bx, bz, w, dd]) => Math.abs(x - bx) < w / 2 + 0.3 && Math.abs(z - bz) < dd / 2 + 0.3) || (E.pits || []).some(([bx, bz, w, dd]) => Math.abs(x - bx) < w / 2 && Math.abs(z - bz) < dd / 2);
    const seen = new Set(), q = [[Math.floor(r.x + r.w / 2), r.z + r.h - 2]];
    let ok = false;
    while (q.length) {
      const [x, z] = q.shift(), k = x + ',' + z;
      if (seen.has(k) || x < r.x + 1 || x >= r.x + r.w - 1 || z < r.z || z >= r.z + r.h - 1 || d.at(x, z) !== 1 || blocked(x + 0.5, z + 0.5)) continue;
      seen.add(k);
      if (z <= (r.goalZ || r.z + 1)) { ok = true; break; }
      q.push([x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]);
    }
    if (ok) return era;
  }
  return null;
}
void THREE;
