// The firefly jars (room kind `jars`, World v7 chapter 8 — the Heartwood): moth swarms
// fill the Great Tree’s passages and eat whatever light comes near; the one light they
// can’t eat is alive — fireflies in a jar. Walk into a rack and you pick up a jar (it
// slows you a little); walk onto an empty hook with one and it hangs there, lit. A
// swarm within `lure` tiles of a lit hook leaves its post and settles round it.
//   racks: [[x, z]]                      jar stands (a jar for anyone who walks in)
//   hooks: [[x, z]]                      posts to hang a jar on
//   swarms: [{ at: [x, z], r, lure, chase }]  a swarm: blocks a round of floor (you’re
//                                        pushed out); `chase`: it goes after a carried
//                                        jar within that many tiles — and snatches it
//   doors: [{ at: [x, z], w, horiz, hook }]  glowcap walls: open while hook `hook` is lit
//   goalZ                                past this line the room is passed (opens `opens`)
// (the Moth Queen’s arena adds `r.queen`: her own swarm follows her unless a jar calls it)

import { THREE } from '../render/r3d.js';
import { audio } from '../engine/audio.js';
import { t } from '../i18n.js';

const N = 26;          // moths in a swarm

export function buildJars(d, r) {
  const K = d.K, root = K.grp(d.root, 0, 0, 0);
  const J = { root, racks: [], hooks: [], swarms: [], doors: [], held: new Map() };
  const wood = K.c('#6a4a30'), woodD = K.c('#4a3220'), iron = K.c('#3a3040');
  for (const [x, z] of r.racks || []) {
    const g = K.grp(root, x, 0, z);
    K.put(g, K.box(1.1, 0.12, 0.5), wood, 0, 0.7, 0);
    for (const s of [-1, 1]) K.put(g, K.box(0.1, 0.7, 0.44), woodD, s * 0.5, 0.35, 0);
    for (const dx of [-0.3, 0, 0.3]) { const j = buildJar(K); j.position.set(dx, 0.76, 0); g.add(j); }
    d.colliders.push({ x, z: z - 0.1, r: 0.35 });
    d.lights.push({ x: d.ox + x, y: 1.2, z: d.oz + z + 0.3, color: '#d8ff8a', power: 0.9, dist: 4.5, lamp: true });
    J.racks.push({ x, z, g });
  }
  for (const [x, z] of r.hooks || []) {
    const g = K.grp(root, x, 0, z);
    K.put(g, K.box(0.12, 2.2, 0.12), woodD, 0, 1.1, 0);
    K.put(g, K.box(0.6, 0.08, 0.08), woodD, 0.24, 2.16, 0);
    K.put(g, K.box(0.04, 0.2, 0.04), iron, 0.5, 2.02, 0);
    // (a ring on the floor: stand here with a jar to hang it)
    const ring = K.noCast(K.put(g, K.cyl(0.5, 0.5, 0.03, 16), K.glow('#b8d880', '#8ab050', 0.2), 0.3, 0.02, 0.5));
    ring.material = ring.material.clone();
    const L = { x: d.ox + x + 0.5, y: 1.8, z: d.oz + z + 0.3, color: '#d8ff8a', power: 0, dist: 6.5, lamp: true };
    d.lights.push(L);
    J.hooks.push({ x, z, px: x + 0.3, pz: z + 0.5, g, ring, jar: null, lit: false, light: L, life: 0 });
  }
  for (const s of r.swarms || []) {
    const geo = K.geo('moth-fleck', () => new THREE.PlaneGeometry(0.3, 0.2));
    const im = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xc8b8e0, side: THREE.DoubleSide }), N);
    im.frustumCulled = false; root.add(im);
    const shade = K.noCast(K.put(root, K.cyl(1, 1, 0.02, 20), K.light('#1a1024', 0.45), s.at[0], 0.03, s.at[1]));
    shade.material = shade.material.clone(); shade.material.blending = THREE.NormalBlending;
    const haze = K.noCast(K.put(root, K.ball(1, 10, 8), K.light('#8a7aa8', 0.16), s.at[0], 1.1, s.at[1]));
    haze.scale.set(1, 0.6, 1);
    const moths = Array.from({ length: N }, (_, k) => ({ a: (k / N) * 6.28, rr: 0.3 + ((k * 37) % 10) / 10, h: 0.4 + ((k * 13) % 10) / 6, sp: 1.2 + ((k * 7) % 5) / 4 }));
    J.swarms.push({ ...s, x: s.at[0], z: s.at[1], hx: s.at[0], hz: s.at[1], im, shade, haze, moths, state: 'home', to: null, r: s.r || 1.8 });
  }
  for (const D of r.doors || []) {
    // a wall of glowcap mushrooms: shut and dark, or lit and parted
    const g = K.grp(root, D.at[0], 0, D.at[1]), caps = [];
    const n = Math.round(D.w * 1.6);
    for (let k = 0; k < n; k++) {
      const u = -D.w / 2 + (k + 0.5) * (D.w / n), c = K.grp(g, D.horiz === false ? 0 : u, 0, D.horiz === false ? u : 0);
      K.put(c, K.cyl(0.12, 0.16, 1.6 + (k % 3) * 0.3, 6), K.c('#e8dcc0'), 0, 0.8 + (k % 3) * 0.15, 0);
      const cap = K.noCast(K.put(c, K.ball(0.42, 8, 6), K.glow('#6a5a8a', '#9a8ae0', 0.15), 0, 1.65 + (k % 3) * 0.3, 0));
      cap.scale.y = 0.55; cap.material = cap.material.clone();
      caps.push({ c, cap });
    }
    const col = D.horiz === false ? { rect: [D.at[0] - 0.4, D.at[1] - D.w / 2, 0.8, D.w] } : { rect: [D.at[0] - D.w / 2, D.at[1] - 0.4, D.w, 0.8] };
    d.colliders.push(col);
    J.doors.push({ ...D, g, caps, col, open: 0 });
  }
  return J;
}

// a glass jar of fireflies (a lid, a string, specks of light inside)
export function buildJar(K) {
  const g = new THREE.Group();
  const glass = K.c('#d8f0e8').clone(); glass.transparent = true; glass.opacity = 0.55; glass.depthWrite = false;
  K.noCast(K.put(g, K.cyl(0.13, 0.12, 0.3, 10), glass, 0, 0.15, 0));
  K.put(g, K.cyl(0.14, 0.14, 0.05, 10), K.c('#8a6a3a'), 0, 0.32, 0);
  const fly = K.glow('#f0ff9a', '#e8ff7a', 1.8);
  for (let k = 0; k < 4; k++) K.noCast(K.put(g, K.ball(0.03, 5, 4), fly, Math.cos(k * 1.7) * 0.06, 0.08 + k * 0.05, Math.sin(k * 1.7) * 0.06));
  K.noCast(K.put(g, K.ball(0.1, 8, 6), K.light('#e8ff8a', 0.35), 0, 0.15, 0));
  return g;
}

// the room each frame
export function jarsRoom(d, r, inside, dt) {
  const J = r.jr;
  if (!J) return;
  const P = d.P;
  if (r.run && r.state === 'idle' && inside.length) { r.state = 'running'; r.run(d.D.saga, d, r); }
  else if (r.state === 'running' && r.tick) r.tick(d.D.saga, d, r, dt);
  const lx = (p) => p.pos.x - d.ox, lz = (p) => p.pos.z - d.oz;
  // racks: walk in, pick up a jar
  for (const R of J.racks) for (const p of inside) {
    if (J.held.has(p) || Math.hypot(lx(p) - R.x, lz(p) - R.z - 0.6) > 1) continue;
    const jar = buildJar(d.K); d.root.add(jar); J.held.set(p, jar);
    audio.sfx('pickup', { volume: 0.6 });
    if (!r.carryTold) { r.carryTold = true; P.toast(t(r.carry || 'A jar of fireflies! Walk onto a hook’s ring to hang it.'), '#e8ff8a'); }
  }
  // carried jars ride along (and slow you a little)
  for (const [p, jar] of J.held) {
    if (!inside.includes(p)) { if (jar.parent) jar.parent.remove(jar); J.held.delete(p); if (p.actor) p.actor.speedMul = 1; continue; }
    jar.position.set(lx(p) + 0.32, (p.actor.jumpY || 0) + 1.15 + Math.sin(d.t * 6) * 0.04, lz(p) + 0.2);
    if (p.actor) p.actor.speedMul = 0.8;
  }
  // hooks: step on the ring with a jar and it hangs there
  for (const H of J.hooks) {
    if (!H.lit) for (const p of inside) {
      if (!J.held.has(p) || Math.hypot(lx(p) - H.px, lz(p) - H.pz) > 0.8) continue;
      const jar = J.held.get(p); J.held.delete(p); if (p.actor) p.actor.speedMul = 1;
      jar.position.set(H.x + 0.5, 1.72, H.z); H.jar = jar; H.lit = true; H.life = r.jarLife || 0;
      audio.sfx('chime', { volume: 0.6, pitch: 7 }); P.world.fx.emit('sparkle', d.ox + H.x + 0.5, 1.8, d.oz + H.z, 12, { color: '#e8ff8a' });
      break;
    }
    // (in the Queen’s arena, a hung jar’s light is drunk away in time)
    if (H.lit && H.life > 0) { H.life -= dt; if (H.life <= 0) { if (H.jar && H.jar.parent) H.jar.parent.remove(H.jar); H.jar = null; H.lit = false; audio.sfx('poof', { volume: 0.5 }); P.world.fx.emit('smoke', d.ox + H.x + 0.5, 1.8, d.oz + H.z, 8, { color: '#5a4a6a' }); } }
    H.light.power += ((H.lit ? 1.4 : 0) - H.light.power) * Math.min(1, dt * 5);
    H.ring.material.emissiveIntensity = H.lit ? 0.9 : 0.2 + Math.sin(d.t * 3) * 0.1;
    if (H.jar) H.jar.rotation.z = Math.sin(d.t * 1.4 + H.x) * 0.08;
  }
  // swarms: to a lit hook, after a carried jar, or home — and nobody walks through one
  for (const S of J.swarms) {
    const home = S.follow ? { x: S.follow.x - d.ox, z: S.follow.z - d.oz } : { x: S.hx, z: S.hz };
    let tx = home.x, tz = home.z, st = 'home';
    const lure = J.hooks.filter((H) => H.lit && Math.hypot(H.x - S.hx, H.z - S.hz) < (S.lure || 9)).sort((a, b) => Math.hypot(a.x - S.x, a.z - S.z) - Math.hypot(b.x - S.x, b.z - S.z))[0];
    if (lure) { tx = lure.x + 0.5; tz = lure.z + 0.2; st = 'lured'; }
    else if (S.chase) {
      const c = [...J.held.keys()].filter((p) => Math.hypot(lx(p) - S.x, lz(p) - S.z) < S.chase).sort((a, b) => Math.hypot(lx(a) - S.x, lz(a) - S.z) - Math.hypot(lx(b) - S.x, lz(b) - S.z))[0];
      if (c) { tx = lx(c); tz = lz(c); st = 'chase'; }
    }
    if (st !== S.state && st === 'lured' && !r.lureTold) { r.lureTold = true; P.toast(t(r.lured || 'The moths leave their post for the jar’s light!'), '#e8ff8a'); }
    S.state = st;
    const dx = tx - S.x, dz = tz - S.z, L = Math.hypot(dx, dz), sp = st === 'chase' ? (S.speed || 2.4) : 3.2;
    if (L > 0.05) { const k = Math.min(L, dt * sp); S.x += (dx / L) * k; S.z += (dz / L) * k; }
    // (a jar caught by a chasing swarm is snatched)
    if (st === 'chase') for (const [p, jar] of J.held) if (Math.hypot(lx(p) - S.x, lz(p) - S.z) < S.r * 0.8) {
      if (jar.parent) jar.parent.remove(jar); J.held.delete(p); if (p.actor) p.actor.speedMul = 1;
      audio.sfx('flick', { volume: 0.7 }); P.world.fx.emit('smoke', p.pos.x, 1.3, p.pos.z, 10, { color: '#5a4a6a' });
      P.toast(t(r.snatched || 'The moths snatch your jar! Back to the rack.'), '#ff9a8a');
    }
    // (nobody walks through a swarm — unless it’s gone to a jar out of the way)
    if (!S.follow || st !== 'lured') for (const p of inside) {
      const ex = lx(p) - S.x, ez = lz(p) - S.z, e = Math.hypot(ex, ez);
      if (e > S.r || e < 0.01) continue;
      const push = S.r - e;
      p.actor.pos.x += (ex / e) * push; p.actor.pos.z += (ez / e) * push;
      if ((S.nudged || 0) < d.t) { S.nudged = d.t + 2.5; P.toast(t(r.blocked || 'A cloud of moths — too thick to push through. They’re after light…'), '#c9a2f0'); audio.sfx('flick', { volume: 0.5 }); }
    }
    // the moths: a whirl round the swarm’s middle
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e3 = new THREE.Euler(), pv = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
    S.moths.forEach((m, k) => {
      const a = m.a + d.t * m.sp * (k % 2 ? 1 : -1), rr = m.rr * S.r;
      pv.set(S.x + Math.cos(a) * rr, m.h + Math.sin(d.t * 5 + k) * 0.15, S.z + Math.sin(a) * rr * 0.8);
      e3.set(-0.8, a, Math.sin(d.t * 30 + k) * 0.6); q.setFromEuler(e3);
      S.im.setMatrixAt(k, M.compose(pv, q, sc));
    });
    S.im.instanceMatrix.needsUpdate = true;
    S.shade.position.set(S.x, 0.03, S.z); S.shade.scale.set(S.r, 1, S.r);
    S.haze.position.set(S.x, 1.1, S.z); S.haze.scale.set(S.r * 0.95, S.r * 0.55, S.r * 0.95);
  }
  // glowcap doors: open while their hook is lit
  for (const D of J.doors) {
    const lit = !!(J.hooks[D.hook] && J.hooks[D.hook].lit);
    D.open += ((lit ? 1 : 0) - D.open) * Math.min(1, dt * 3);
    D.col.disabled = D.open > 0.5;
    for (const [k, c] of D.caps.entries()) { c.c.scale.y = 1 - D.open * 0.85; c.cap.material.emissiveIntensity = 0.15 + D.open * 1.4 + Math.sin(d.t * 3 + k) * 0.05; }
    if (lit && !D.told) { D.told = true; audio.sfx('chord', { volume: 0.5 }); P.toast(t(r.glowcaps || 'The glowcaps light up — and bow aside!'), '#b8f0a0'); }
  }
  // across: the room is passed
  if (!r.passed && r.goalZ && inside.some((p) => lz(p) < r.goalZ)) {
    r.passed = true;
    for (const id of r.opens || []) { const G = d.gate(id); if (G) d.setGate(G, true); }
    if (r.done) P.showBanner(t(r.done), '');
  }
}

// (the harness) hang every hook, and send the swarms off to them
export function botJars(r) {
  const J = r.jr;
  if (!J) return;
  for (const H of J.hooks) if (!H.lit) { H.lit = true; H.life = 0; }
}
