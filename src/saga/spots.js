// The spotlights (room kind `spot`, World v7 chapter 10 — aboard the Gloomstage): pools of
// light sweep the floor on set paths; anyone caught in one is « Spotted! » — stagehands
// pour out of the wings and the hero is marched back to the room’s door. Wait behind the
// scenery flats, time the dash, or throw the lighting board’s lever to put every light out
// for a few seconds.
//   lights: [{ path: [[x, z]…], r, speed, follow }]   a pool of light moving back and forth
//                                     along its path (`follow`: it drifts after the nearest
//                                     hero instead — the follow-spot)
//   flats: [[x, z, w, d]]            painted scenery flats: solid, and their shadow hides
//                                     whoever keeps close (a place to wait for the light)
//   board: [x, z]                    the lighting board’s lever: step on it, and it’s dark
//                                     for `dark` seconds (then it has to cool down)
//   goalZ                            past this line the room is passed (opens `opens`) — keep
//                                     it a tile inside the room (≥ z + 1), where heroes count
//   back: [x, z]                     where the spotted are marched back to
//   lure(d, r) → [x, z] | null       (set by a script) something brighter the follow-spot
//                                     goes after instead of the heroes

import { THREE } from '../render/r3d.js';
import { audio } from '../engine/audio.js';
import { t } from '../i18n.js';

export function buildSpots(d, r) {
  const K = d.K, root = K.grp(d.root, 0, 0, 0);
  const S = { root, lights: [], board: null, dark: 0, cool: 0 };
  for (const L of r.lights || []) {
    const [x0, z0] = L.path[0];
    const g = K.grp(root, x0, 0, z0);
    const pool = K.noCast(K.put(g, K.cyl(1, 1, 0.02, 28), K.light('#fff4c8', 0.42), 0, 0.03, 0));
    pool.scale.set(L.r || 1.8, 1, L.r || 1.8);
    const beam = K.noCast(K.put(g, K.cone(1, 1, 18), K.light('#fff4c8', 0.1), 0, 4, 0));
    beam.scale.set((L.r || 1.8) * 0.95, 8, (L.r || 1.8) * 0.95);
    const light = { x: d.ox + x0, y: 3, z: d.oz + z0, color: '#fff0c8', power: 1.4, dist: 6, lamp: true };
    d.lights.push(light);
    S.lights.push({ ...L, g, pool, beam, light, x: x0, z: z0, u: L.phase || 0, dir: 1, r: L.r || 1.8 });
  }
  S.flats = [];
  const shade = new THREE.MeshBasicMaterial({ color: 0x0a0610, transparent: true, opacity: 0.45, depthWrite: false });
  for (const [x, z, w, dd] of r.flats || []) {
    const g = K.grp(root, x, 0, z);
    // (its shadow on the boards: the safe place)
    K.noCast(K.put(g, K.box(w + 1.6, 0.02, dd + 2.2), shade, 0, 0.025, 0));
    S.flats.push({ x, z, w: w / 2 + 0.8, d: dd / 2 + 1.1 });
    const paint = K.tex('flat' + ((x * 7 + z) % 3 | 0), 16, 16, (p) => {
      p.rect(0, 0, 16, 16, '#6a8a5a'); p.rect(0, 10, 16, 6, '#5a7a4a');
      for (let i = 0; i < 4; i++) { p.rect(2 + i * 4, 4 - (i % 2), 2, 8, '#4a3a2a'); p.rect(1 + i * 4, 1 - (i % 2), 4, 4, '#3a6a3a'); }
      p.rect(0, 0, 16, 1, '#2a2018'); p.rect(0, 15, 16, 1, '#2a2018');
    }, { rx: w / 2, ry: 1 });
    K.put(g, K.box(w, 2.2, dd), paint, 0, 1.1, 0);
    for (const s of [-1, 1]) K.put(g, K.box(0.08, 1.2, 0.6), K.c('#4a3220'), s * (w / 2 - 0.2), 0.6, -dd / 2 - 0.3).rotation.x = -0.5;
    d.colliders.push({ rect: [x - w / 2, z - dd / 2, w, dd] });
  }
  if (r.board) {
    const [x, z] = r.board, g = K.grp(root, x, 0, z);
    K.put(g, K.box(1.2, 1, 0.6), K.c('#2a2430'), 0, 0.5, -0.4);
    for (let i = 0; i < 5; i++) K.put(g, K.box(0.08, 0.3, 0.08), K.c(['#e0483a', '#f2c14e', '#5aa05a', '#4a8ae8', '#e0e0e0'][i]), -0.4 + i * 0.2, 1.1, -0.4);
    const plate = K.noCast(K.put(g, K.cyl(0.45, 0.5, 0.06, 14), K.glow('#e0c080', '#c8904a', 0.3), 0, 0.03, 0.6));
    plate.material = plate.material.clone();
    d.colliders.push({ x, z: z - 0.4, r: 0.5 });
    S.board = { x, z: z + 0.6, plate, near: false };
  }
  return S;
}

export function spotRoom(d, r, inside, dt) {
  const S = r.sp;
  if (!S) return;
  const P = d.P, C = P.combat;
  if (r.run && r.state === 'idle' && inside.length) { r.state = 'running'; r.run(d.D.saga, d, r); }
  else if (r.state === 'running' && r.tick) r.tick(d.D.saga, d, r, dt);
  const lx = (p) => p.pos.x - d.ox, lz = (p) => p.pos.z - d.oz;
  // the lighting board: every light out for a while
  S.dark = Math.max(0, S.dark - dt); S.cool = Math.max(0, S.cool - dt);
  if (S.board) {
    const on = inside.some((p) => Math.hypot(lx(p) - S.board.x, lz(p) - S.board.z) < 0.6);
    if (on && !S.board.near && S.cool <= 0) {
      S.dark = r.dark || 5; S.cool = (r.dark || 5) + 4;
      audio.sfx('unlock', { volume: 0.7, pitch: -6 }); audio.sfx('whoosh', { volume: 0.4, pitch: -10 });
      P.toast(t(r.darkSaid || 'Lights out! Go, go, go!'), '#fff3c4');
    }
    S.board.near = on;
    S.board.plate.material.emissiveIntensity = S.cool > 0 ? 0.1 : on ? 1.2 : 0.3 + Math.sin(d.t * 3) * 0.12;
  }
  const lit = S.dark <= 0;
  // (nobody is caught while a scene is playing)
  const watching = !(d.D.saga && d.D.saga.stage && d.D.saga.stage.active);
  // (in a flat’s shadow, nobody sees you)
  const hid = (p) => S.flats.some((f) => Math.abs(lx(p) - f.x) < f.w && Math.abs(lz(p) - f.z) < f.d);
  for (const L of S.lights) {
    // (along its path and back, or after the nearest hero)
    if (L.follow) {
      const lure = r.lure ? r.lure(d, r) : null;
      const p = lure ? null : inside.filter((q) => !hid(q)).sort((a, b) => Math.hypot(lx(a) - L.x, lz(a) - L.z) - Math.hypot(lx(b) - L.x, lz(b) - L.z))[0];
      const to = lure || (p ? [lx(p), lz(p)] : null);
      if (to && lit) { const dx = to[0] - L.x, dz = to[1] - L.z, l = Math.hypot(dx, dz); if (l > 0.05) { const k = Math.min(l, dt * (L.speed || 2.2) * (lure ? 1.6 : 1)); L.x += (dx / l) * k; L.z += (dz / l) * k; } }
    } else {
      const pts = L.path, n = pts.length - 1, seg = Math.min(n - 1, Math.floor(L.u));
      L.u += dt * (L.speed || 0.35) * L.dir;
      if (L.u >= n) { L.u = n; L.dir = -1; } else if (L.u <= 0) { L.u = 0; L.dir = 1; }
      const k = L.u - seg, [ax, az] = pts[seg], [bx, bz] = pts[Math.min(n, seg + 1)];
      L.x = ax + (bx - ax) * k; L.z = az + (bz - az) * k;
    }
    L.g.position.set(L.x, 0, L.z);
    L.pool.visible = lit; L.beam.visible = lit;
    L.light.x = d.ox + L.x; L.light.z = d.oz + L.z; L.light.power = lit ? 1.4 : 0;
    if (!lit || !watching) continue;
    // caught!
    for (const p of inside) {
      if (p.spottedT > 0 || Math.hypot(lx(p) - L.x, lz(p) - L.z) > L.r || hid(p)) continue;
      p.spottedT = 1.4;
      audio.sfx('whistle', { volume: 0.8 }); audio.sfx('error', { volume: 0.5 });
      if (C) C.popText(p.pos.x, 2.4, p.pos.z, t('Spotted!'), '#fff4c8', true);
      // (stagehands pour out of the wings)
      if (C && r.hands !== false && !(r.handsT > 0)) {
        r.handsT = 6;
        for (let k = 0; k < (r.handsN || 2); k++) { const e = C.spawn(r.handType || 'stagehand', d.ox + r.x + (k % 2 ? r.w - 2 : 2), d.oz + L.z, { level: d.def.lv[0], quiet: true }); e.saga = true; e.sagaTag = 'spot'; }
      }
    }
  }
  r.handsT = Math.max(0, (r.handsT || 0) - dt);
  // (the spotted are marched back to the door)
  for (const p of inside) {
    if (!(p.spottedT > 0)) continue;
    p.spottedT -= dt;
    if (p.spottedT > 0) continue;
    const [bx, bz] = r.back || [r.x + r.w / 2, r.z + r.h - 1.5];
    if (P.solo) P.gatherAt(d.ox + bx, d.oz + bz); else p.actor.pos = { x: d.ox + bx + (Math.random() - 0.5), z: d.oz + bz };
    P.toast(t(r.caught || 'Marched back to the door by a very stern stagehand.'), '#ff9a8a');
  }
  if (!r.passed && r.goalZ && inside.some((p) => lz(p) < r.goalZ && !(p.spottedT > 0))) {
    r.passed = true;
    for (const id of r.opens || []) { const G = d.gate(id); if (G) d.setGate(G, true); }
    if (r.done) P.showBanner(t(r.done), '');
  }
}
