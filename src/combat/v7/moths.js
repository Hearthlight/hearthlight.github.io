// World v7, chapter 8: the gloom of Emberleaf, Glowtide and Elderbough, as foes.
//   scarecrow   a gloomed scarecrow in Emberleaf’s fields: lobs pumpkins on marked spots
//               and flaps its sleeves (a short marked cone).
//   mothling    a big gloom moth of Elderbough: flutters close, marks a line, dives down it.
//   mothqueen   the Moth Queen, who drinks the light (the Heartwood’s boss): her swarm
//               shields her (nothing touches her while it’s round her) — hang a firefly
//               jar on one of the arena’s hooks and the swarm goes to it: she’s bare. Wing
//               gusts (a marked cone), dust (marked circles that leave a slowing haze), a
//               dive down a marked line; from phase 2 the moths drink the jars faster, and
//               in phase 3 she drinks a jar dry herself.
// Every blow is shown before it lands.

import { THREE } from '../../render/r3d.js';
import { toward, hover, speedOf, lob } from '../v3/ai.js';
import { cone, later, tickLater, hurtIn, checkPhase, leash } from '../v3/bosses.js';
import { t } from '../../i18n.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export const MOTH_ENEMIES = {
  scarecrow: { name: 'Gloom Scarecrow', hp: 74, speed: 1.6, r: 0.4, h: 1.6, dmg: 14, xp: 16, cost: 3, knockRes: 0.4 },
  mothling: { name: 'Mothling', hp: 58, speed: 3.2, r: 0.42, h: 1.0, dmg: 13, xp: 15, cost: 3, flying: true, knockRes: 0.1 },
  mothqueen: { name: 'the Moth Queen', title: 'The Moth Queen, who drinks the light', hp: 5600, speed: 2.6, r: 1.1, h: 2.4, dmg: 22, xp: 900, cost: 99, boss: true, flying: true, knockRes: 1 },
};

export const MOTH_ZONE_FOES = {
  autumn: ['scarecrow', 'rootling', 'kit', 'murkmoth', 'scarecrow', 'fox'],
  glow: ['jelly', 'murkmoth', 'reefcrab', 'ghost', 'jelly'],
  elder: ['rootling', 'mothling', 'murkmoth', 'beetle', 'mothling', 'stag'],
};

// ------------------------------------------------------------------ models
const mats = new Map();
function mat(r3d, c, e = null, ei = 1) {
  const k = c + '|' + e + '|' + ei;
  if (!mats.has(k)) mats.set(k, new THREE.MeshToonMaterial({ color: c, emissive: e || 0x000000, emissiveIntensity: e ? ei : 1, gradientMap: r3d.gradient }));
  return mats.get(k);
}
function own(g) { g.traverse((m) => { if (m.isMesh) m.material = m.material.clone(); }); return g; }
function box(g, w, h, d, m, x, y, z) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; g.add(b); return b; }
function ball(g, r, m, x, y, z, sx = 1, sy = 1, sz = 1) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), m); b.position.set(x, y, z); b.scale.set(sx, sy, sz); b.castShadow = true; g.add(b); return b; }
const grp = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
const GLOOM = '#a86ae0';

// a wing’s shape: a subdivided card bent up towards its tip and cupped along its length,
// so it catches the light like a wing instead of lying flat like a playing card
export function wingGeo(w, h) {
  const g = new THREE.PlaneGeometry(w, h, 8, 5).rotateX(-Math.PI / 2), a = g.attributes.position;
  for (let i = 0; i < a.count; i++) {
    // (u: 0 at the root, by the body — 1 at the tip)
    const u = (a.getX(i) + w / 2) / w, z = a.getZ(i) / (h / 2);
    a.setY(i, a.getY(i) + 0.16 * w * u * u - 0.07 * h * (1 - z * z));
  }
  g.computeVertexNormals();
  return g;
}
// a wing with an eye-spot, painted (so it reads as a moth from above)
let wingTex = null;
function wingMaterial(r3d) {
  if (!wingTex) {
    const c = document.createElement('canvas'); c.width = 32; c.height = 24;
    const g = c.getContext('2d');
    // (a wing's shape: rounded, wider at the tip — the rest stays see-through)
    g.beginPath(); g.moveTo(0, 8); g.quadraticCurveTo(10, -2, 30, 3); g.quadraticCurveTo(34, 14, 26, 22); g.quadraticCurveTo(12, 25, 0, 16); g.closePath();
    g.save(); g.clip();
    g.fillStyle = '#8a7a9a'; g.fillRect(0, 0, 32, 24);
    g.fillStyle = '#6a5a7a'; for (let x = 0; x < 32; x += 5) g.fillRect(x, 0, 1, 24);
    g.fillStyle = '#b8a8c8'; g.fillRect(0, 19, 32, 5);
    const eye = (x, y, r0) => { g.fillStyle = '#2a1f36'; g.beginPath(); g.arc(x, y, r0, 0, 6.3); g.fill(); g.fillStyle = '#e8c86a'; g.beginPath(); g.arc(x, y, r0 * 0.7, 0, 6.3); g.fill(); g.fillStyle = '#2a1f36'; g.beginPath(); g.arc(x, y, r0 * 0.38, 0, 6.3); g.fill(); g.fillStyle = '#fff'; g.fillRect(x - 1, y - 2, 1, 1); };
    eye(20, 10, 6);
    g.restore();
    g.strokeStyle = '#3a2a4a'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, 8); g.quadraticCurveTo(10, -2, 30, 3); g.quadraticCurveTo(34, 14, 26, 22); g.quadraticCurveTo(12, 25, 0, 16); g.stroke();
    wingTex = new THREE.CanvasTexture(c); wingTex.magFilter = THREE.NearestFilter; wingTex.minFilter = THREE.NearestFilter;
  }
  return new THREE.MeshToonMaterial({ map: wingTex, gradientMap: r3d.gradient, side: THREE.DoubleSide, alphaTest: 0.5 });
}

export const MOTH_MODELS = {
  // a scarecrow of sacking and straw on a pole, a pumpkin under one arm, a gloom-lit grin
  scarecrow(r3d) {
    const g = new THREE.Group(), body = grp(g);
    const sack = mat(r3d, '#b89868'), straw = mat(r3d, '#e8c860'), coat = mat(r3d, '#6a4a7a'), pole = mat(r3d, '#6a4a30'), glow = mat(r3d, '#e8d0ff', GLOOM, 1.4);
    box(body, 0.1, 1.6, 0.1, pole, 0, 0.8, 0);
    box(body, 0.6, 0.62, 0.34, coat, 0, 1.0, 0);
    const arms = [];
    for (const s of [-1, 1]) { const A = grp(body, s * 0.34, 1.22, 0); box(A, 0.5, 0.14, 0.14, coat, s * 0.25, 0, 0); box(A, 0.12, 0.2, 0.08, straw, s * 0.52, -0.02, 0); arms.push(A); }
    const head = grp(body, 0, 1.55, 0);
    ball(head, 0.26, sack, 0, 0, 0, 1, 0.95, 1);
    for (const s of [-1, 1]) box(head, 0.07, 0.07, 0.02, glow, s * 0.09, 0.03, 0.24);
    box(head, 0.16, 0.04, 0.02, glow, 0, -0.09, 0.24);
    const hat = grp(head, 0, 0.22, 0); box(hat, 0.6, 0.04, 0.6, straw, 0, 0, 0); box(hat, 0.3, 0.2, 0.3, straw, 0, 0.1, 0);
    g.userData = { body, arms, head };
    return own(g);
  },
  // a big grey-violet moth: eye-spotted wings, feathery antennae
  mothling(r3d) {
    const g = new THREE.Group(), body = grp(g, 0, 0.9, 0);
    const fur = mat(r3d, '#6a5a7a'), eye = mat(r3d, '#fff0a0', '#ffd66b', 1.3), ant = mat(r3d, '#c8b890');
    ball(body, 0.2, fur, 0, 0, 0, 1, 0.9, 1.5);
    ball(body, 0.15, fur, 0, 0.05, 0.26);
    for (const s of [-1, 1]) { box(body, 0.07, 0.07, 0.03, eye, s * 0.07, 0.09, 0.4); const a = box(body, 0.03, 0.3, 0.03, ant, s * 0.08, 0.28, 0.34); a.rotation.z = -s * 0.5; a.rotation.x = 0.5; }
    const wm = wingMaterial(r3d), wings = [];
    for (const s of [-1, 1]) { const W = grp(body, s * 0.12, 0.05, 0); const w = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.62).rotateX(-Math.PI / 2), wm); w.position.set(s * 0.45, 0, -0.04); if (s < 0) w.scale.x = -1; W.add(w); wings.push({ W, s }); }
    g.userData = { body, wings };
    return own(g);
  },
  // the Moth Queen: a great furred moth, a crown of golden antennae, four wings with eyes
  mothqueen(r3d) {
    const g = new THREE.Group(), body = grp(g, 0, 2.0, 0);
    const fur = mat(r3d, '#7a6a8a'), furL = mat(r3d, '#b8a8c8'), gold = mat(r3d, '#f2c14e', '#c89020', 0.4), eye = mat(r3d, '#e8d0ff', GLOOM, 1.8), leg = mat(r3d, '#3a2a4a');
    ball(body, 0.6, fur, 0, 0, -0.2, 1, 0.9, 1.6);
    ball(body, 0.5, furL, 0, 0.1, 0.55, 1.1, 1, 0.9);
    const head = grp(body, 0, 0.2, 1.05);
    ball(head, 0.38, fur, 0, 0, 0);
    for (const s of [-1, 1]) { ball(head, 0.14, eye, s * 0.2, 0.08, 0.26); const A = grp(head, s * 0.14, 0.3, 0.1); box(A, 0.05, 0.8, 0.05, gold, 0, 0.4, 0).rotation.z = -s * 0.25; for (let k = 0; k < 5; k++) box(A, 0.3, 0.03, 0.03, gold, s * 0.1, 0.25 + k * 0.12, 0).rotation.z = -s * 0.4; }
    // a little crown
    for (let k = 0; k < 5; k++) { const c = box(head, 0.08, 0.2, 0.08, gold, (k - 2) * 0.1, 0.38, -0.04); c.rotation.z = (k - 2) * 0.15; }
    for (let k = 0; k < 3; k++) for (const s of [-1, 1]) { const L = box(body, 0.05, 0.6, 0.05, leg, s * 0.4, -0.45, 0.3 - k * 0.35); L.rotation.z = s * 0.6; }
    const wm = wingMaterial(r3d), wings = [];
    for (const [s, f] of [[-1, 0], [1, 0], [-1, 1], [1, 1]]) {
      const W = grp(body, s * 0.35, 0.1, f ? -0.7 : 0.2);
      const w = new THREE.Mesh(wingGeo(f ? 2.2 : 2.8, f ? 1.6 : 2.0), wm);
      w.position.set(s * (f ? 1.1 : 1.4), 0, f ? -0.3 : 0); if (s < 0) w.scale.x = -1; w.castShadow = true;
      W.add(w); wings.push({ W, s, f });
    }
    g.userData = { body, head, wings };
    return own(g);
  },
};

// a haze of moth dust: slows whoever stands in it
function dustHaze(C, x, z, r, life) {
  const m = new THREE.Mesh(C.geo.disc, new THREE.MeshBasicMaterial({ color: 0xc8b8e0, transparent: true, opacity: 0.4, depthWrite: false }));
  m.scale.setScalar(r); m.position.set(x, 0.04, z);
  C.root.add(m);
  C.fxMeshes.push({ m, t: life, life, fn: (q, k) => {
    m.material.opacity = 0.4 * Math.min(1, k * 3);
    if (Math.random() < 0.3) C.world.fx.emit('sparkle', x + rand(-r, r), 0.5, z + rand(-r, r), 1, { color: '#d8c8f0' });
    for (const p of C.alivePlayers()) if (Math.hypot(p.pos.x - x, p.pos.z - z) < r && p.actor.jumpY < 0.3) p.actor.zoneSlow = Math.min(p.actor.zoneSlow ?? 1, 0.6);
  } });
}

function flap(e, speed, amp) { for (const { W, s, f } of e.obj.userData.wings || []) W.rotation.z = s * (Math.sin(e.t * speed + (f ? 0.6 : 0)) * amp + 0.1); }

export const MOTH_BRAINS = {
  scarecrow: {
    init(e) { e.state = 'stand'; e.timer = rand(1.2, 2.2); },
    think(e, dt, tgt, C) {
      tickLater(e, dt);
      if (!tgt) return;
      e.timer -= dt;
      if (e.state === 'stand') {
        hover(e, C, tgt, speedOf(e, C) * 0.8, dt, 3.5, 6);
        if (e.timer > 0) return;
        const d = Math.hypot(tgt.pos.x - e.x, tgt.pos.z - e.z);
        if (d < 3.2) {
          const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, l = d || 1, dir = { x: dx / l, z: dz / l };
          e.state = 'busy'; e.timer = 1.1; e.anim = 'flap';
          cone(C, e.x, e.z, dir, 3.2, 1.1, 0.7, 0xff5a6a);
          later(e, 0.7, () => { hurtIn(C, e, (p) => { const px = p.pos.x - e.x, pz = p.pos.z - e.z, dd = Math.hypot(px, pz); return dd < 3.2 && (px * dir.x + pz * dir.z) / (dd || 1) > Math.cos(0.55); }, e.def.dmg, { knock: 4 }); C.sfx('whoosh', e); });
        } else {
          e.state = 'busy'; e.timer = 1.4; e.anim = 'lob';
          lob(C, e, { x: tgt.pos.x + rand(-0.5, 0.5), z: tgt.pos.z + rand(-0.5, 0.5) }, { r: 1.3, dmg: e.def.dmg, t: 1.1, look: 'bomb', knock: 3 });
        }
      } else if (e.timer <= 0) { e.state = 'stand'; e.timer = rand(1.6, 2.6); }
    },
    pose(e) { const u = e.obj.userData; e.obj.rotation.y = Math.atan2(e.face.x, e.face.z); u.body.rotation.z = Math.sin(e.t * 2) * 0.06; for (const [i, A] of u.arms.entries()) A.rotation.z = e.anim === 'flap' && e.state === 'busy' ? Math.sin(e.t * 20) * 0.5 : Math.sin(e.t * 1.5 + i) * 0.08; },
  },
  mothling: {
    init(e) { e.state = 'flutter'; e.timer = rand(1.4, 2.4); e.y = 0.3; },
    think(e, dt, tgt, C) {
      tickLater(e, dt);
      e.y = e.dive ? 0.1 : 0.3 + Math.sin(e.t * 3) * 0.25;
      if (!tgt) return;
      e.timer -= dt;
      if (e.dive) {
        e.dive.t -= dt;
        C.moveEnemy(e, e.dive.dir.x * 8 * dt, e.dive.dir.z * 8 * dt, true, true);
        hurtIn(C, e, (p) => Math.hypot(p.pos.x - e.x, p.pos.z - e.z) < 0.9 && !(e.dive.hit.has(p)) && e.dive.hit.add(p), e.def.dmg, { knock: 3 });
        if (e.dive.t <= 0) e.dive = null;
        return;
      }
      if (e.state === 'flutter') {
        hover(e, C, tgt, speedOf(e, C), dt, 2.5, 4.5, true);
        if (e.timer <= 0) {
          const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, l = Math.hypot(dx, dz) || 1, dir = { x: dx / l, z: dz / l };
          e.state = 'aim'; e.timer = 0.8; e.face = dir;
          C.telegraphLine(e, dir, Math.min(7, l + 2), 0.8);
          later(e, 0.8, () => { e.dive = { dir, t: 0.6, hit: new Set() }; e.state = 'flutter'; e.timer = rand(2, 3); C.sfx('whoosh', e); });
        }
      }
    },
    pose(e) { flap(e, e.dive ? 30 : 16, 0.6); e.obj.rotation.y = Math.atan2(e.face.x, e.face.z); },
  },
  mothqueen: {
    init(e) { e.state = 'drift'; e.timer = 2.4; e.phase = 1; e.y = 0.6; e.last = null; e.immune = 'Her swarm shields her!'; },
    think(e, dt, tgt, C) {
      tickLater(e, dt);
      leash(e, C);
      // (is her swarm with her, or off at a jar?)
      const S = e.swarm, bare = S && S.state === 'lured';
      if (bare && e.immune) { e.immune = null; e.hintText = 'Her swarm has gone to the jar — strike!'; C.popText(e.x, e.def.h + 1.4, e.z, t('Exposed!'), '#e8ff8a', true); C.sfx('charge', e); }
      else if (!bare && !e.immune) { e.immune = 'Her swarm shields her!'; e.hintText = null; }
      e.y = 0.6 + Math.sin(e.t * 1.4) * 0.2;
      if (e.state !== 'roar' && checkPhase(e, C, (ph) => { C.bubble(e, ph === 2 ? t('More light… MORE!') : t('I shall drink every last drop of it!'), 2); if (e.onPhase) e.onPhase(e, ph); })) return;
      if (e.state === 'roar') { if (e.timer <= 0) { e.state = 'drift'; e.timer = 1; } e.timer -= dt; return; }
      if (!tgt) return;
      e.timer -= dt;
      if (e.state === 'drift') {
        hover(e, C, tgt, speedOf(e, C), dt, 3.5, 7, true);
        if (e.timer > 0) return;
        const opts = ['gust', 'dust', 'dive'];
        if (e.phase >= 3) opts.push('drink', 'drink');
        let a = pick(opts);
        if (a === e.last) a = pick(opts.filter((o) => o !== a));
        e.last = a;
        this[a](e, C, tgt);
      } else if (e.state === 'busy' && e.timer <= 0) { e.state = 'drift'; e.timer = rand(1.3, 2) / (e.phase >= 3 ? 1.25 : 1); }
      if (e.dive) {
        e.dive.t -= dt;
        C.moveEnemy(e, e.dive.dir.x * 11 * dt, e.dive.dir.z * 11 * dt, true, true);
        hurtIn(C, e, (p) => Math.hypot(p.pos.x - e.x, p.pos.z - e.z) < 1.6 && !e.dive.hit.has(p) && e.dive.hit.add(p), e.def.dmg, { knock: 5 });
        if (e.dive.t <= 0) e.dive = null;
      }
    },
    // a beat of her great wings: a marked cone
    gust(e, C, tgt) {
      const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, l = Math.hypot(dx, dz) || 1, dir = { x: dx / l, z: dz / l };
      e.face = dir; e.state = 'busy'; e.timer = 1.4; e.anim = 'gust'; e.animT = 0;
      cone(C, e.x, e.z, dir, 6, 0.9, 0.9, 0xc8b8e0);
      later(e, 0.9, () => { hurtIn(C, e, (p) => { const px = p.pos.x - e.x, pz = p.pos.z - e.z, d = Math.hypot(px, pz); return d < 6 && (px * dir.x + pz * dir.z) / (d || 1) > Math.cos(0.9); }, e.def.dmg * 0.8, { knock: 7 }); C.sfx('whoosh', e); C.world.fx.emit('dust', e.x + dir.x * 3, 0.5, e.z + dir.z * 3, 14, { color: '#d8c8f0' }); });
      C.bubble(e, pick([t('Flutter off, little lights.'), t('Shoo, candles!')]), 1);
    },
    // moth dust on marked circles; a slowing haze where it lands
    dust(e, C) {
      e.state = 'busy'; e.timer = 1.6; e.anim = 'dust'; e.animT = 0;
      for (const p of C.alivePlayers().slice(0, 5)) {
        const x = p.pos.x + rand(-0.8, 0.8), z = p.pos.z + rand(-0.6, 0.6);
        C.zone({ x, z, r: 1.4, delay: 1.1, dmg: e.def.dmg * 0.6 * (C.enemyDmg || 1), knock: 1, kind: 'bomb', gloom: true, arc: { x: e.x, y: 3, z: e.z }, look: 'bomb' });
        later(e, 1.1, () => dustHaze(C, x, z, 1.6, 5));
      }
      C.sfx('charge', e);
    },
    // a dive down a marked line
    dive(e, C, tgt) {
      const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, l = Math.hypot(dx, dz) || 1, dir = { x: dx / l, z: dz / l };
      e.face = dir; e.state = 'busy'; e.timer = 1.8;
      C.telegraphLine(e, dir, Math.min(11, l + 3), 1.0);
      later(e, 1.0, () => { e.dive = { dir, t: 0.7, hit: new Set() }; C.sfx('whoosh', e); C.sfx('roar', e); });
    },
    // (phase 3) she drinks a hung jar dry
    drink(e, C) {
      e.state = 'busy'; e.timer = 1.4; e.anim = 'drink'; e.animT = 0;
      if (e.onDrink) e.onDrink(e);
      C.bubble(e, pick([t('Mmm. Fireflies.'), t('Delicious little lights…')]), 1.2);
    },
    pose(e, dt) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      e.animT = (e.animT || 0) + dt;
      const gusting = e.anim === 'gust' && e.state === 'busy';
      flap(e, gusting ? 14 : e.dive ? 18 : 5, gusting ? 0.55 : 0.28);
      u.body.position.y = 2.0 + Math.sin(e.t * 2) * 0.12;
      u.head.rotation.x = e.anim === 'drink' && e.state === 'busy' ? 0.5 : Math.sin(e.t * 1.2) * 0.08;
    },
  },
};
