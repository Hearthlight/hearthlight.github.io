// New gloom out in the wide world (Adventure v5):
//   jelly    gloom jellyfish drifting over the warm coasts (Coral Lagoon, the
//            Sunken City); it glows, then pulses an electric ring — step out
//   bat      bat swarms that join the camps of the woods, the canyon and the
//            bog at night: erratic loops round you, then a dive along a line
//   mimic    now and then a camp's reward chest bites back: it hops after you,
//            chomps and spits coins — beat it and it coughs up a rich chest
// Freed, a jellyfish turns sea-glass blue and floats off into the sky.

import { THREE } from '../../render/r3d.js';
import { toward, hover, speedOf, lob } from '../v3/ai.js';

const rand = (a, b) => a + Math.random() * (b - a);

export const NEWGLOOM_ENEMIES = {
  jelly: { name: 'Gloom Jellyfish', hp: 30, speed: 1.2, r: 0.42, h: 1.2, dmg: 11, xp: 11, cost: 2, flying: true, elem: 'shock', knockRes: 0.3, swarm: 2 },
  bat: { name: 'Gloom Bat', hp: 16, speed: 5, r: 0.28, h: 0.4, dmg: 7, xp: 5, cost: 1, flying: true, knockRes: 0, swarm: 4 },
  mimic: { name: 'Mimic', hp: 110, speed: 2.6, r: 0.5, h: 0.9, dmg: 16, xp: 30, cost: 5, knockRes: 0.6 },
};

// ------------------------------------------------------------------ models
const mats = new Map();
function mat(r3d, c, e = null, ei = 1, opacity = 1) {
  const k = c + '|' + e + '|' + ei + '|' + opacity;
  if (!mats.has(k)) mats.set(k, new THREE.MeshToonMaterial({ color: c, emissive: e || 0x000000, emissiveIntensity: e ? ei : 1, gradientMap: r3d.gradient, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }));
  return mats.get(k);
}
function own(g) { g.traverse((m) => { if (m.isMesh) m.material = m.material.clone(); }); return g; }
function box(g, w, h, d, m, x, y, z) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; g.add(b); return b; }
function ball(g, r, m, x, y, z, sx = 1, sy = 1, sz = 1) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), m); b.position.set(x, y, z); b.scale.set(sx, sy, sz); b.castShadow = true; g.add(b); return b; }
const grp = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
const glowEyes = (r3d, g, y, z, gap, s, c = '#fff3a0', e = '#ffe066') => [-gap, gap].map((x) => box(g, s, s * 1.2, 0.04, mat(r3d, c, e, 1.3), x, y, z));
// (the colours it has once the gloom's gone)
const clean = (m, c) => { m.userData.orig = new THREE.Color(c); return m; };

export const NEWGLOOM_MODELS = {
  jelly(r3d) {
    const g = new THREE.Group(), size = grp(g), body = grp(size);
    size.scale.setScalar(1.4);
    const bell = clean(ball(body, 0.36, mat(r3d, '#8a5ac8', '#4a2a8a', 0.7, 0.85), 0, 0.34, 0, 1, 0.72, 1), '#8fdcf0');
    clean(ball(body, 0.17, mat(r3d, '#ff9ad8', '#ff5ab8', 1.2), 0, 0.3, 0), '#fff3c4');
    // a frilly rim, and the tendrils (in bundles that sway)
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; clean(box(body, 0.1, 0.07, 0.1, mat(r3d, '#6a3aa8'), Math.cos(a) * 0.33, 0.1, Math.sin(a) * 0.33), '#6ac0e0'); }
    const tendrils = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3, t = grp(body, Math.cos(a) * 0.18, 0.12, Math.sin(a) * 0.18);
      clean(box(t, 0.04, 0.42, 0.04, mat(r3d, '#b88cf0', '#6a3ab0', 0.6), 0, -0.21, 0), '#c8f0ff');
      clean(box(t, 0.035, 0.3, 0.035, mat(r3d, '#b88cf0', '#6a3ab0', 0.6), 0.02, -0.55, 0.02), '#c8f0ff');
      tendrils.push(t);
    }
    const eyes = glowEyes(r3d, body, 0.4, 0.33, 0.1, 0.07);
    g.userData = { body, bell, tendrils, eyes, animal: body };
    return own(g);
  },
  bat(r3d) {
    const g = new THREE.Group(), size = grp(g), body = grp(size);
    size.scale.setScalar(1.35);
    // (it's out at night: its wings glow faintly, its eyes burn)
    const fur = mat(r3d, '#5a3a78', '#2a1048', 0.6), skin = mat(r3d, '#8a5ab8', '#4a1a7a', 0.8);
    ball(body, 0.14, fur, 0, 0, 0, 1, 1, 1.15);
    const head = grp(body, 0, 0.06, 0.14);
    ball(head, 0.1, fur, 0, 0, 0);
    for (const sx of [-0.06, 0.06]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 4), skin); ear.position.set(sx, 0.11, -0.02); head.add(ear); }
    glowEyes(r3d, head, 0.02, 0.09, 0.045, 0.055, '#ffb0bc', '#ff3a5a');
    box(head, 0.025, 0.04, 0.02, mat(r3d, '#fff6e0'), 0.03, -0.06, 0.08);
    const wings = [];
    for (const s of [-1, 1]) {
      const w = grp(body, s * 0.1, 0.03, 0);
      box(w, 0.26, 0.03, 0.2, skin, s * 0.14, 0, 0);
      const tip = grp(w, s * 0.27, 0, 0);
      box(tip, 0.24, 0.025, 0.24, skin, s * 0.12, 0, -0.02);
      box(tip, 0.03, 0.03, 0.26, fur, s * 0.02, 0.01, 0);
      wings.push({ w, tip, s });
    }
    g.userData = { body, head, wings };
    return own(g);
  },
  mimic(r3d) {
    const g = new THREE.Group(), body = grp(g);
    body.scale.setScalar(1.35);
    const wood = mat(r3d, '#9a6440'), dark = mat(r3d, '#6b4330'), gold = mat(r3d, '#f2c14e', '#6a4a10', 1), teeth = mat(r3d, '#fff6e0'), gums = mat(r3d, '#8a2a3a');
    box(body, 0.72, 0.4, 0.5, wood, 0, 0.22, 0);
    box(body, 0.76, 0.06, 0.54, dark, 0, 0.05, 0);
    for (const sx of [-0.26, 0.26]) box(body, 0.07, 0.42, 0.54, gold, sx, 0.23, 0);
    box(body, 0.62, 0.05, 0.4, gums, 0, 0.41, 0);                                  // (the mouth, inside)
    for (let i = 0; i < 6; i++) { const t2 = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 4), teeth); t2.position.set(-0.25 + i * 0.1, 0.46, 0.22); body.add(t2); }
    const tongue = grp(body, 0, 0.44, 0.05);
    box(tongue, 0.16, 0.04, 0.3, mat(r3d, '#e05a7a'), 0, 0, 0.15);
    const eyes = glowEyes(r3d, body, 0.47, -0.05, 0.12, 0.07);
    const lid = grp(body, 0, 0.42, -0.25);
    box(lid, 0.74, 0.16, 0.52, wood, 0, 0.08, 0.25);
    for (const sx of [-0.26, 0.26]) box(lid, 0.07, 0.18, 0.54, gold, sx, 0.08, 0.25);
    box(lid, 0.12, 0.14, 0.05, gold, 0, 0.02, 0.52);
    for (let i = 0; i < 6; i++) { const t2 = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 4), teeth); t2.position.set(-0.25 + i * 0.1, -0.03, 0.47); t2.rotation.x = Math.PI; lid.add(t2); }
    const legs = [];
    for (const [x, z] of [[-0.24, 0.16], [0.24, 0.16], [-0.24, -0.16], [0.24, -0.16]]) legs.push(box(body, 0.1, 0.12, 0.1, dark, x, -0.02, z));
    g.userData = { body, lid, tongue, eyes, legs };
    return own(g);
  },
};

// ------------------------------------------------------------------ brains
const dirTo = (e, x, z) => { const dx = x - e.x, dz = z - e.z, d = Math.hypot(dx, dz) || 1; return { x: dx / d, z: dz / d, d }; };

export const NEWGLOOM_BRAINS = {
  // ---- a jellyfish: drifts after you, glows… and pulses
  jelly: {
    init(e) { e.y = 0.9; e.bob = Math.random() * 6; e.timer = rand(1.5, 3); e.glow = 0; },
    think(e, dt, tgt, C) {
      e.bob += dt;
      e.y += (0.85 + Math.sin(e.bob * 2.2) * 0.18 - e.y) * dt * 3;
      const D = dirTo(e, tgt.pos.x, tgt.pos.z);
      if (e.state === 'chase') {
        hover(e, C, tgt, speedOf(e, C), dt, 1.0, 2.2, true);
        if (e.timer <= 0) {
          if (D.d < 3) { e.state = 'charge'; e.timer = 0.85; C.telegraphCircle(e.x, e.z, 1.9, 0.85); C.sfx('charge', e); }
          else e.timer = 0.4;
        }
      } else if (e.state === 'charge') {
        e.glow = Math.min(1, e.glow + dt * 1.4);
        if (Math.random() < dt * 14) C.world.fx.emit('sparkle', e.x + rand(-0.4, 0.4), e.y + 0.2, e.z + rand(-0.4, 0.4), 1, { color: '#ffe066' });
        if (e.timer <= 0) {
          C.vfx.shockwave(e.x, e.z, { r: 1.9, color: '#ffe066', life: 0.35, wall: 0.6 });
          C.sfx('zap', e);
          for (const p of C.alivePlayers()) {
            const q = dirTo(e, p.pos.x, p.pos.z);
            if (q.d < 1.95) C.hurtPlayer(p, e.def.dmg * (e.dmgMul || 1), { dir: { x: q.x, z: q.z }, knock: 3, src: e, elem: 'shock' });
          }
          e.state = 'drift'; e.timer = 1.3;
        }
      } else if (e.state === 'drift') {
        e.glow = Math.max(0, e.glow - dt * 2);
        C.moveEnemy(e, -D.x * dt * 0.8, -D.z * dt * 0.8, false, true);
        if (e.timer <= 0) { e.state = 'chase'; e.timer = rand(2.2, 3.4); }
      }
    },
    pose(e, dt) {
      const u = e.obj.userData, k = e.state === 'charge' ? 3.2 : 1.6;
      e.obj.rotation.y += (dt || 1 / 60) * 0.4;
      const pulse = Math.sin(e.bob * k * 2);
      u.body.scale.set(1 + pulse * 0.07, 1 - pulse * 0.1, 1 + pulse * 0.07);
      u.tendrils.forEach((t, i) => { t.rotation.x = Math.sin(e.bob * 2 + i) * 0.35; t.rotation.z = Math.cos(e.bob * 1.7 + i * 1.3) * 0.3; });
      if (e.alive) u.bell.material.emissiveIntensity = 0.7 + (e.glow || 0) * 1.6;
    },
  },

  // ---- a bat: erratic loops round you, a screech, a dive
  bat: {
    init(e) { e.y = 1.6; e.ang = Math.random() * 6; e.dir = Math.random() < 0.5 ? 1 : -1; e.timer = rand(1.2, 3); },
    think(e, dt, tgt, C) {
      if (e.state === 'chase') {
        e.ang += dt * (1.7 + Math.sin(e.t * 3) * 0.9) * e.dir;
        const rr = 2.5 + Math.sin(e.t * 2.3) * 0.8;
        const tx = tgt.pos.x + Math.cos(e.ang) * rr + Math.sin(e.t * 9) * 0.4, tz = tgt.pos.z + Math.sin(e.ang) * rr * 0.8;
        C.moveEnemy(e, (tx - e.x) * dt * 3.2, (tz - e.z) * dt * 3.2, false, true);
        e.y += (1.5 + Math.sin(e.t * 7) * 0.3 - e.y) * dt * 5;
        e.faceTo(tx, tz);
        if (e.timer <= 0) {
          const D = dirTo(e, tgt.pos.x, tgt.pos.z);
          e.aim = { x: D.x, z: D.z }; e.dist = D.d + 2;
          C.telegraphLine(e, e.aim, e.dist, 0.5);
          C.sfx('screech', e);
          C.vfx.shockwave(e.x, e.z, { r: 0.9, color: '#d8a0ff', life: 0.3, wall: 0.4, y: e.y });
          e.state = 'mark'; e.timer = 0.5;
        }
      } else if (e.state === 'mark') {
        e.face = e.aim;
        e.y += (1.9 - e.y) * dt * 5;
        if (e.timer <= 0) { e.state = 'dive'; e.timer = e.dist / 11; e.hitOnce.clear(); }
      } else if (e.state === 'dive') {
        C.moveEnemy(e, e.aim.x * 11 * dt, e.aim.z * 11 * dt, false, true);
        e.y += (0.55 - e.y) * dt * 12;
        if (e.y < 1.1) C.enemyTouch(e, e.def.dmg * (e.dmgMul || 1), 2, 0.4);
        if (e.timer <= 0) { e.state = 'chase'; e.timer = rand(1.8, 3.2); e.dir = -e.dir; }
      }
    },
    // (a hit knocks it out of its dive)
    onHit(e) { if (e.state === 'dive' || e.state === 'mark') { e.state = 'chase'; e.timer = rand(0.9, 1.5); } },
    pose(e, dt) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      // (a faint trail of gloom sparks: you can follow it in the dark)
      if (e.alive && Math.random() < (dt || 1 / 60) * 7) e.combat.world.fx.emit('sparkle', e.x, e.y + 0.1, e.z, 1, { color: '#c89aff' });
      const fast = e.state === 'mark' ? 40 : e.state === 'dive' ? 0 : 26;
      const flap = e.state === 'dive' ? -0.2 : Math.sin(e.t * fast);
      for (const W of u.wings) { W.w.rotation.z = W.s * flap * 0.8; W.tip.rotation.z = W.s * flap * 0.5; }
      u.body.rotation.x = e.state === 'dive' ? 0.6 : Math.sin(e.t * 13) * 0.08;
    },
  },

  // ---- a mimic: it hops after you, chomps, and spits coins
  mimic: {
    init(e) { e.state = 'wake'; e.timer = 0.7; e.gape = 1; e.hopT = 0; },
    think(e, dt, tgt, C) {
      const sp = speedOf(e, C), D = dirTo(e, tgt.pos.x, tgt.pos.z);
      if (e.state === 'wake') {
        e.faceTo(tgt.pos.x, tgt.pos.z); e.gape = 1;
        if (e.timer <= 0) { e.state = 'chase'; e.timer = rand(0.8, 1.4); }
      } else if (e.state === 'chase') {
        // (hop, hop: the fall is the world's gravity)
        const air = e.y > 0.01;
        if (air) toward(e, C, tgt, sp * 1.6, dt, 1.2);
        else {
          e.faceTo(tgt.pos.x, tgt.pos.z);
          e.hopT -= dt;
          if (e.hopT <= 0 && D.d > 1.3) { e.vy = 5.2; e.y = 0.02; e.hopT = 0.16; C.sfx('flick', e); }
        }
        e.gape = air ? 0.35 : 0.1;
        if (e.timer <= 0 && !air) {
          if (D.d < 1.9) { e.state = 'chompAim'; e.timer = 0.45; e.aim = { x: D.x, z: D.z }; C.telegraphCircle(e.x + D.x * 1.0, e.z + D.z * 1.0, 1.0, 0.45); }
          else if (D.d < 7 && Math.random() < 0.45) { e.state = 'spit'; e.timer = 0.5; }
          else e.timer = 0.5;
        }
      } else if (e.state === 'chompAim') {
        e.face = e.aim; e.gape = 1;
        if (e.timer <= 0) {
          for (const p of C.alivePlayers()) {
            const q = dirTo(e, p.pos.x, p.pos.z);
            if (q.d < 2.0 && q.x * e.aim.x + q.z * e.aim.z > 0.3) C.hurtPlayer(p, e.def.dmg * (e.dmgMul || 1), { dir: { x: q.x, z: q.z }, knock: 4, src: e });
          }
          C.sfx('snap', e); C.sfx('slam', e);
          e.gape = 0; e.state = 'recover'; e.timer = 0.55;
        }
      } else if (e.state === 'spit') {
        e.faceTo(tgt.pos.x, tgt.pos.z); e.gape = 0.8;
        if (e.timer <= 0) {
          // a mouthful of (gloomy) coins
          for (let i = 0; i < 3; i++) lob(C, e, { x: tgt.pos.x + rand(-1.4, 1.4), z: tgt.pos.z + rand(-1.4, 1.4) }, { r: 0.8, dmg: e.def.dmg * 0.55, t: 0.8 + i * 0.12, look: 'coin', knock: 2 });
          C.sfx('coin', e);
          e.state = 'recover'; e.timer = 0.7;
        }
      } else if (e.state === 'recover') {
        e.gape = Math.max(0, e.gape - dt * 3);
        if (e.timer <= 0) { e.state = 'chase'; e.timer = rand(1.0, 1.8); }
      }
    },
    pose(e, dt) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      const want = -(e.gape || 0) * 1.25 + (e.state === 'chase' ? Math.sin(e.t * 14) * 0.08 : 0);
      u.lid.rotation.x += (want - u.lid.rotation.x) * Math.min(1, (dt || 1 / 60) * 18);
      u.tongue.rotation.x = Math.sin(e.t * 9) * 0.25 - (e.gape || 0) * 0.2;
      u.legs.forEach((l, i) => { l.position.y = -0.02 + (e.y > 0.05 ? 0 : Math.abs(Math.sin(e.t * 12 + i)) * 0.03); });
    },
  },
};
