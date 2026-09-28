// World v7, chapter 4: the gloom of the glacier and the Frostbell Halls, as foes.
//   frostimp   an ice imp: keeps its distance and lobs snowballs, now and then
//              marks a lane and belly-slides down it.
//   chief      Chief Frostbite, the ice imps’ chief (the Halls’ mini-boss): snowball
//              volleys on marked spots, a long belly-slide down a marked lane, ice
//              spikes bursting along marked lines, his imps from phase 2.
//   tenor      the Frost Tenor, the Duchess’s leading man (the Halls’ boss): his arias
//              ring out (rings to jump), ice shards rain on marked spots, he glides
//              down a marked lane leaving frost behind, calls a chorus of imps from
//              phase 2; in phase 3 he draws breath for his HIGH C — hide behind an ice
//              pillar (the note shatters it) or take it full on; then, out of breath,
//              he can be hit hard (×1.6).
// Every blow is shown before it lands.

import { THREE } from '../../render/r3d.js';
import { toward, hover, speedOf, lob } from '../v3/ai.js';
import { flat, cone, later, tickLater, hurtIn, checkPhase, leash } from '../v3/bosses.js';
import { t } from '../../i18n.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export const FROST_ENEMIES = {
  frostimp: { name: 'Ice Imp', hp: 30, speed: 3.1, r: 0.3, h: 0.7, dmg: 11, xp: 10, cost: 2, knockRes: 0.1, elem: 'ice' },
  chief: { name: 'Chief Frostbite', title: 'Chief Frostbite, of the ice imps', hp: 700, speed: 2.2, r: 0.8, h: 1.6, dmg: 16, xp: 150, cost: 20, boss: true, knockRes: 0.85, elem: 'ice' },
  tenor: { name: 'the Frost Tenor', title: 'the Frost Tenor, Her Radiance’s leading man', hp: 2600, speed: 1.4, r: 1.0, h: 2.9, dmg: 20, xp: 480, cost: 99, boss: true, knockRes: 1, elem: 'ice' },
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
function coneM(g, r, h, m, x, y, z, n = 6) { const b = new THREE.Mesh(new THREE.ConeGeometry(r, h, n), m); b.position.set(x, y, z); b.castShadow = true; g.add(b); return b; }
function cyl(g, rt, rb, h, m, x, y, z, n = 10) { const b = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, n), m); b.position.set(x, y, z); b.castShadow = true; g.add(b); return b; }
const grp = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
const GLOOM = '#a86ae0';

function impBody(r3d, k, chief) {
  const g = new THREE.Group(), body = grp(g);
  const skin = mat(r3d, chief ? '#8ab8e0' : '#a8d4f0'), belly = mat(r3d, '#e8f4ff'), ice = mat(r3d, '#dff4ff', '#8ad0ff', 0.4), eye = mat(r3d, '#f0d8ff', GLOOM, 1.5);
  ball(body, 0.3 * k, skin, 0, 0.34 * k, 0, 1, 1.05, 0.95);
  ball(body, 0.2 * k, belly, 0, 0.3 * k, 0.14 * k, 1, 1, 0.55);
  for (const s of [-1, 1]) { box(body, 0.08 * k, 0.06 * k, 0.03, eye, s * 0.1 * k, 0.46 * k, 0.26 * k); coneM(body, 0.06 * k, 0.28 * k, ice, s * 0.16 * k, 0.66 * k, 0, 5).rotation.z = -s * 0.4; }
  const arms = [];
  for (const s of [-1, 1]) { const A = grp(body, s * 0.28 * k, 0.4 * k, 0.04); ball(A, 0.08 * k, skin, 0, -0.1 * k, 0.04, 1, 1.4, 1); arms.push(A); }
  const legs = [];
  for (const s of [-1, 1]) { const L = grp(body, s * 0.12 * k, 0.08 * k, 0); ball(L, 0.08 * k, skin, 0, 0, 0.03, 1.1, 0.7, 1.4); legs.push(L); }
  const snow = ball(arms[1], 0.13 * k, mat(r3d, '#f4f8ff'), 0, -0.26 * k, 0.1);
  return { g, body, arms, legs, snow, ice };
}

export const FROST_MODELS = {
  frostimp(r3d) { const m = impBody(r3d, 1, false); m.g.userData = { body: m.body, arms: m.arms, legs: m.legs, snow: m.snow }; return own(m.g); },
  // the chief: bigger, a crown of icicles, a fur cape, a belly made for sliding
  chief(r3d) {
    const m = impBody(r3d, 2.1, true);
    const crown = grp(m.body, 0, 1.05, 0);
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; coneM(crown, 0.08, 0.36 + (i % 2) * 0.18, m.ice, Math.cos(a) * 0.28, 0.12, Math.sin(a) * 0.28, 5); }
    const cape = box(m.body, 1.1, 0.9, 0.12, mat(r3d, '#f0ece4'), 0, 0.72, -0.42); cape.rotation.x = 0.2;
    for (let i = 0; i < 6; i++) box(m.body, 0.12, 0.06, 0.13, mat(r3d, '#3a3844'), -0.45 + i * 0.18, 0.5 + (i % 2) * 0.3, -0.44);
    m.g.userData = { body: m.body, arms: m.arms, legs: m.legs, snow: m.snow, crown };
    return own(m.g);
  },
  // the Frost Tenor: a tall singer made of ice, in a frozen tailcoat, a cape of
  // shards, a crystal pompadour, pages of an aria circling him
  tenor(r3d) {
    const g = new THREE.Group(), body = grp(g, 0, 0.35, 0);
    const coat = mat(r3d, '#2e4a7a'), coatD = mat(r3d, '#1e3258'), shirt = mat(r3d, '#f4f8ff'), ice = mat(r3d, '#dff4ff', '#8ad0ff', 0.55);
    const face = mat(r3d, '#c8e8ff', '#6ab0e8', 0.3), eye = mat(r3d, '#f0d8ff', GLOOM, 1.6), gold = mat(r3d, '#f2c14e', '#c89020', 0.3), dark = mat(r3d, '#1a1826');
    const legs = [];
    for (const s of [-1, 1]) { const L = grp(body, s * 0.22, 0.9, 0); box(L, 0.24, 0.95, 0.26, dark, 0, -0.48, 0); box(L, 0.3, 0.14, 0.4, dark, 0, -0.95, 0.06); legs.push(L); }
    // the tailcoat and its tails
    box(body, 0.9, 1.0, 0.56, coat, 0, 1.4, 0);
    for (const s of [-1, 1]) { const tail = box(body, 0.34, 0.8, 0.1, coatD, s * 0.2, 0.9, -0.3); tail.rotation.x = 0.25; }
    box(body, 0.34, 0.8, 0.02, shirt, 0, 1.45, 0.29);
    for (let i = 0; i < 3; i++) box(body, 0.06, 0.06, 0.02, gold, 0, 1.2 + i * 0.2, 0.31);
    const tie = grp(body, 0, 1.84, 0.3);
    for (const s of [-1, 1]) coneM(tie, 0.1, 0.2, dark, s * 0.1, 0, 0, 4).rotation.z = s * Math.PI / 2;
    // arms: one flung out to the audience, one on the heart
    const arms = [];
    for (const s of [-1, 1]) { const A = grp(body, s * 0.52, 1.78, 0); box(A, 0.2, 0.85, 0.22, coat, 0, -0.4, 0); ball(A, 0.12, face, 0, -0.86, 0.04); arms.push(A); }
    // the crystal head: a proud chin, a mouth that opens to sing, a pompadour of ice
    const head = grp(body, 0, 2.25, 0.02);
    box(head, 0.56, 0.58, 0.5, face, 0, 0, 0);
    box(head, 0.3, 0.14, 0.14, face, 0, -0.3, 0.12);
    for (const s of [-1, 1]) { box(head, 0.1, 0.06, 0.03, eye, s * 0.13, 0.08, 0.26); box(head, 0.14, 0.03, 0.03, ice, s * 0.13, 0.16, 0.26); }
    const mouth = box(head, 0.2, 0.06, 0.04, dark, 0, -0.12, 0.26);
    for (let i = 0; i < 5; i++) { const c = coneM(head, 0.12, 0.5, ice, -0.2 + i * 0.1, 0.36, 0.08 - i * 0.05, 5); c.rotation.x = -0.9 + i * 0.1; c.rotation.z = (i - 2) * 0.12; }
    // the cape of shards
    const cape = grp(body, 0, 1.85, -0.3);
    for (let i = 0; i < 7; i++) { const sh = coneM(cape, 0.18, 1.4 + (i % 3) * 0.3, ice, -0.54 + i * 0.18, -0.7 - (i % 3) * 0.15, -0.05, 4); sh.rotation.x = Math.PI + 0.15; }
    // pages of his aria, circling
    const pages = [];
    for (let i = 0; i < 4; i++) { const p = box(g, 0.34, 0.44, 0.02, mat(r3d, '#fbf6ec'), 0, 2, 0); pages.push(p); }
    const heart = box(body, 0.2, 0.2, 0.04, mat(r3d, '#e0c8ff', GLOOM, 1.2), -0.22, 1.62, 0.3);
    g.userData = { body, legs, arms, head, mouth, cape, pages, heart };
    return own(g);
  },
};

// ------------------------------------------------------------------ brains
// ice spikes bursting along a line (they rise and sink back)
let spikeGeo = null;
function spike(C, x, z) {
  spikeGeo = spikeGeo || new THREE.ConeGeometry(0.26, 1.4, 5).translate(0, 0.7, 0);
  const m = new THREE.Mesh(spikeGeo, C.mat(0xcfeeff, 0x6ac0ff));
  m.position.set(x + rand(-0.15, 0.15), -1.4, z); m.rotation.set(rand(-0.25, 0.25), rand(0, 6), rand(-0.25, 0.25));
  m.castShadow = true;
  C.root.add(m);
  C.fxMeshes.push({ m, t: 0.9, life: 0.9, fn: (q, k) => { q.m.position.y = k > 0.8 ? -1.4 * ((k - 0.8) / 0.2) : k < 0.3 ? -1.4 * (1 - k / 0.3) : 0; } });
}
function spikeLine(e, C, dir, len, delay, dmg) {
  C.telegraphLine(e, dir, len, delay);
  for (let k = 1; k <= len; k++) later(e, delay + k * 0.05, () => {
    const x = e.x + dir.x * k, z = e.z + dir.z * k;
    hurtIn(C, e, (p) => Math.hypot(p.pos.x - x, p.pos.z - z) < 0.85 && p.actor.jumpY < 0.7, dmg, { knock: 3, launch: 4, elem: 'ice' });
    spike(C, x, z);
  });
}
function slideAt(e, C, tgt, dist, speed) {
  const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, l = Math.hypot(dx, dz) || 1;
  e.lane = { x: dx / l, z: dz / l }; e.dist = Math.min(dist, l + 3); e.slideV = speed;
  e.state = 'mark'; e.timer = 0.7;
  e.faceTo(tgt.pos.x, tgt.pos.z);
  C.telegraphLine(e, e.lane, e.dist, 0.7);
}
function sliding(e, C, dt, dmg, knock, r) {
  C.moveEnemy(e, e.lane.x * e.slideV * dt, e.lane.z * e.slideV * dt);
  C.enemyTouch(e, dmg, knock, r);
  if (Math.random() < dt * 30) C.world.fx.emit('sparkle', e.x, 0.2, e.z, 1, { color: '#dff4ff' });
}
function impPose(e, dt) {
  const u = e.obj.userData;
  e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
  const slide = e.state === 'slide';
  u.body.rotation.x += ((slide ? 1.2 : 0) - u.body.rotation.x) * Math.min(1, dt * 12);
  u.body.position.y = slide ? -0.1 : e.state === 'chase' ? Math.abs(Math.sin(e.t * 12)) * 0.06 : 0;
  u.legs.forEach((L, i) => { L.rotation.x = e.state === 'chase' ? Math.sin(e.t * 12 + i * Math.PI) * 0.6 : 0; });
  u.arms[1].rotation.x = e.anim === 'throw' && e.animT < 0.35 ? -2.4 : slide ? -2.6 : 0;
  u.arms[0].rotation.x = slide ? -2.6 : 0;
  e.animT = (e.animT || 0) + dt;
  u.snow.visible = !(e.anim === 'throw' && e.animT < 0.4);
}

export const FROST_BRAINS = {
  frostimp: {
    init(e) { e.state = 'chase'; e.timer = rand(1, 2); },
    think(e, dt, tgt, C) {
      tickLater(e, dt);
      if (!tgt) return;
      const sp = speedOf(e, C);
      if (e.state === 'chase') {
        hover(e, C, tgt, sp, dt, 3.2, 5.2);
        if (e.timer > 0) return;
        if (Math.random() < 0.3) { slideAt(e, C, tgt, 8, 10); return; }
        e.timer = rand(1.8, 2.6); e.anim = 'throw'; e.animT = 0;
        lob(C, e, { x: tgt.pos.x, z: tgt.pos.z }, { r: 1, dmg: e.def.dmg, t: 1.0, look: 'snowball', elem: 'ice', knock: 2 });
      } else if (e.state === 'mark' && e.timer <= 0) { e.state = 'slide'; e.timer = e.dist / e.slideV; e.hitOnce.clear(); C.sfx('whoosh', e); }
      else if (e.state === 'slide') { sliding(e, C, dt, e.def.dmg, 3, 0.5); if (e.timer <= 0) { e.state = 'chase'; e.timer = rand(1.4, 2.2); } }
    },
    pose: impPose,
  },

  // ---------------------------------------------------------------- Chief Frostbite
  chief: {
    init(e) { e.state = 'chase'; e.timer = 1.4; e.phase = 1; e.last = null; },
    think(e, dt, tgt, C) {
      tickLater(e, dt);
      leash(e, C);
      if (e.state !== 'roar' && e.state !== 'slide' && checkPhase(e, C, (ph) => C.bubble(e, ph === 2 ? t('Imps! To your chief!') : t('Now I’m ANGRY-cold!'), 2))) return;
      if (e.state === 'roar') { if (e.timer <= 0) { e.state = 'chase'; e.timer = 0.8; } return; }
      if (!tgt) return;
      const sp = speedOf(e, C) * (e.phase >= 3 ? 1.2 : 1);
      if (e.state === 'chase') {
        toward(e, C, tgt, sp, dt, 2.2);
        if (e.timer > 0) return;
        const opts = ['volley', 'slide', 'spikes'];
        if (e.phase >= 2 && C.enemies.filter((q) => q.alive && q.summoner === e).length < 3) opts.push('call');
        let a = pick(opts);
        if (a === e.last) a = pick(opts.filter((o) => o !== a));
        e.last = a;
        if (a === 'slide') { slideAt(e, C, tgt, 13, 11); C.bubble(e, pick([t('Belly-slide!'), t('Wheee-HA!')]), 0.9); return; }
        this[a](e, C, tgt);
      } else if (e.state === 'mark' && e.timer <= 0) { e.state = 'slide'; e.timer = e.dist / e.slideV; e.hitOnce.clear(); C.sfx('whoosh', e); }
      else if (e.state === 'slide') { sliding(e, C, dt, e.def.dmg * 1.3, 5, 1.0); if (e.timer <= 0) { e.state = 'busy'; e.timer = 0.9; C.shakeAt(e, 0.3); } }
      else if (e.state === 'busy' && e.timer <= 0) { e.state = 'chase'; e.timer = rand(0.9, 1.5); }
    },
    volley(e, C) {
      e.state = 'busy'; e.timer = 1.4; e.anim = 'throw'; e.animT = 0;
      for (const p of C.alivePlayers()) for (let k = 0; k < (e.phase >= 2 ? 3 : 2); k++) {
        const x = p.pos.x + rand(-1.8, 1.8), z = p.pos.z + rand(-1.4, 1.4);
        later(e, k * 0.2, () => lob(C, e, { x, z }, { r: 1.1, dmg: e.def.dmg * 0.8, t: 1.05, look: 'snowball', elem: 'ice', knock: 2 }));
      }
      C.sfx('whoosh', e);
    },
    spikes(e, C, tgt) {
      const dx = tgt.pos.x - e.x, dz = tgt.pos.z - e.z, l = Math.hypot(dx, dz) || 1, dir = { x: dx / l, z: dz / l };
      e.state = 'busy'; e.timer = 1.6; e.anim = 'stomp'; e.animT = 0;
      for (const off of e.phase >= 2 ? [-0.5, 0, 0.5] : [0]) { const c = Math.cos(off), s = Math.sin(off); spikeLine(e, C, { x: dir.x * c - dir.z * s, z: dir.x * s + dir.z * c }, 9, 0.85, e.def.dmg * 0.9); }
      C.bubble(e, t('ICICLES!'), 0.9);
      C.sfx('thud', e);
    },
    call(e, C) {
      e.state = 'busy'; e.timer = 1.2;
      C.bubble(e, t('Imps! To your chief!'), 1.4);
      for (let i = 0; i < 2; i++) {
        const s = C.freeSpot(e.x + rand(-2.5, 2.5), e.z + rand(-2.5, 2.5), 2) || { x: e.x, z: e.z + 1.5 };
        const q = C.spawn('frostimp', s.x, s.z, { level: e.level });
        q.summoner = e;
      }
    },
    pose(e, dt) {
      impPose(e, dt);
      const u = e.obj.userData;
      if (u.crown) u.crown.rotation.y = Math.sin(e.t * 2) * 0.1;
    },
  },

  // ---------------------------------------------------------------- the Frost Tenor
  tenor: {
    init(e) { e.state = 'chase'; e.timer = 2; e.phase = 1; e.last = null; e.hiC = 0; },
    onHit(e) { if (e.exposed > 0) e.flash = 0.12; },
    think(e, dt, tgt, C) {
      tickLater(e, dt);
      leash(e, C);
      if (e.exposed > 0) e.exposed -= dt;
      if (e.state !== 'roar' && e.state !== 'glide' && e.state !== 'breath' && checkPhase(e, C, (ph) => C.bubble(e, ph === 2 ? t('Chorus! From the top!') : t('And now… my HIGH C!'), 2.2))) return;
      if (e.state === 'roar') { if (e.timer <= 0) { e.state = 'chase'; e.timer = 1; } return; }
      if (!tgt) return;
      const sp = speedOf(e, C);
      if (e.state === 'chase') {
        hover(e, C, tgt, sp, dt, 4, 7);
        if (e.timer > 0) return;
        // (phase 3: every other move is the high C, while there are pillars to hide behind)
        if (e.phase >= 3 && (e.hiC = (e.hiC + 1) % 2) === 1) { this.highC(e, C); return; }
        const opts = ['aria', 'shards', 'glide'];
        if (e.phase >= 2 && C.enemies.filter((q) => q.alive && q.summoner === e).length < 3) opts.push('chorus');
        let a = pick(opts);
        if (a === e.last) a = pick(opts.filter((o) => o !== a));
        e.last = a;
        this[a](e, C, tgt);
      } else if (e.state === 'mark' && e.timer <= 0) { e.state = 'glide'; e.timer = e.dist / e.slideV; e.hitOnce.clear(); C.sfx('whoosh', e); }
      else if (e.state === 'glide') {
        sliding(e, C, dt, e.def.dmg * 1.1, 5, 1.1);
        // (a trail of frost behind him that stings for a moment)
        e.trailT = (e.trailT || 0) - dt;
        if (e.trailT <= 0) { e.trailT = 0.12; C.zone({ x: e.x, z: e.z, r: 0.8, delay: 0.35, dmg: e.def.dmg * 0.4 * (C.enemyDmg || 1), knock: 1, gloom: true, elem: 'ice' }); }
        if (e.timer <= 0) { e.state = 'busy'; e.timer = 0.8; }
      } else if (e.state === 'breath') {
        if (Math.random() < dt * 20) C.world.fx.emit('sparkle', e.x + rand(-1, 1), 2.4, e.z + rand(-1, 1), 1, { color: '#dff4ff' });
        if (e.timer <= 0) this.sing(e, C);
      } else if (e.state === 'busy' && e.timer <= 0) { e.state = 'chase'; e.timer = rand(1.0, 1.6) / (e.phase >= 3 ? 1.2 : 1); }
    },
    // three rings of song, one after another: jump them
    aria(e, C) {
      e.state = 'busy'; e.timer = 2.6; e.anim = 'sing'; e.animT = 0;
      C.bubble(e, pick([t('♪ La-la-LAAA! ♪'), t('♪ O sole MIO! ♪'), t('♪ Fi-GA-ro! ♪')]), 1.4);
      for (const [k, r] of [[0, 3], [0.55, 5], [1.1, 7]]) {
        later(e, k, () => {
          flat(C, new THREE.RingGeometry(Math.max(0.1, r - 0.6), r + 0.6, 40).rotateX(-Math.PI / 2), e.x, e.z, 0x8ad0ff, 0.7);
          later(e, 0.7, () => {
            hurtIn(C, e, (p) => { const pd = Math.hypot(p.pos.x - e.x, p.pos.z - e.z); return Math.abs(pd - r) < 0.8 && p.actor.jumpY < 0.5; }, e.def.dmg * 0.8, { knock: 3, elem: 'ice' });
            C.vfx.shockwave(e.x, e.z, { r, color: '#bfe8ff', life: 0.4, wall: 0.5 });
            C.sfx('tone', e);
          });
        });
      }
    },
    // ice shards rain from the frozen sky onto marked spots round everyone
    shards(e, C) {
      e.state = 'busy'; e.timer = 1.7; e.anim = 'sing'; e.animT = 0;
      for (const p of C.alivePlayers()) for (let k = 0; k < (e.phase >= 2 ? 4 : 3); k++) {
        const x = p.pos.x + rand(-2.2, 2.2), z = p.pos.z + rand(-1.8, 1.8);
        later(e, 0.15 + k * 0.18, () => C.zone({ x, z, r: 1.1, delay: 1.1, dmg: e.def.dmg * 0.8 * (C.enemyDmg || 1), knock: 2, kind: 'bomb', gloom: true, elem: 'ice', arc: { x: x + rand(-1, 1), y: 9, z: z - 2 }, look: 'ice' }));
      }
      C.bubble(e, t('Encore!'), 1);
    },
    glide(e, C, tgt) { slideAt(e, C, tgt, 14, 12); C.bubble(e, pick([t('Glissando!'), t('Make way for the star!')]), 1); },
    chorus(e, C) {
      e.state = 'busy'; e.timer = 1.3; e.anim = 'bow'; e.animT = 0;
      C.bubble(e, t('Chorus! From the top!'), 1.4);
      for (let i = 0; i < 3; i++) {
        const s = C.freeSpot(e.x + rand(-3, 3), e.z + rand(-3, 3), 2) || { x: e.x, z: e.z + 2 };
        const q = C.spawn('frostimp', s.x, s.z, { level: e.level });
        q.summoner = e;
      }
    },
    // the HIGH C: a long breath (the whole hall is marked), then the note — anyone
    // with no ice pillar between them and him takes it; the pillar that hid them shatters
    highC(e, C) {
      const live = (e.pillars || []).filter((q) => !q.broken);
      if (!live.length) { this.aria(e, C); return; }
      e.state = 'breath'; e.timer = 2.4; e.anim = 'breath'; e.animT = 0;
      C.bubble(e, t('Mi-mi-mi-mi… (hide!)'), 2.2);
      C.telegraphCircle(e.x, e.z, 13, 2.4);
      C.sfx('charge', e);
    },
    sing(e, C) {
      e.state = 'busy'; e.timer = 1.2; e.anim = 'hiC'; e.animT = 0;
      C.sfx('screech', e); C.shakeAt(e, 0.8);
      C.vfx.shockwave(e.x, e.z, { r: 13, color: '#e8f8ff', life: 0.6, wall: 1.2 });
      const live = (e.pillars || []).filter((q) => !q.broken), used = new Set();
      for (const p of C.alivePlayers()) {
        // (a pillar between him and you, close to the line, shelters you)
        const cover = live.find((q) => {
          const ax = p.pos.x - e.x, az = p.pos.z - e.z, L = Math.hypot(ax, az) || 1;
          const u = ((q.x - e.x) * ax + (q.z - e.z) * az) / (L * L);
          if (u <= 0 || u >= 1) return false;
          const cx = e.x + ax * u, cz = e.z + az * u;
          return Math.hypot(q.x - cx, q.z - cz) < q.r + 0.35;
        });
        if (cover) { used.add(cover); continue; }
        if (Math.hypot(p.pos.x - e.x, p.pos.z - e.z) < 13) C.hurtPlayer(p, e.def.dmg * 2.2 * (C.enemyDmg || 1), { dir: { x: p.pos.x - e.x, z: p.pos.z - e.z }, knock: 7, from: 'boss', elem: 'ice' });
      }
      // the note shatters the pillars that stood in its way (or the nearest one)
      const broke = used.size ? [...used] : [live.sort((a, b) => Math.hypot(a.x - e.x, a.z - e.z) - Math.hypot(b.x - e.x, b.z - e.z))[0]];
      for (const q of broke) { if (q.shatter) q.shatter(); else q.broken = true; C.world.fx.emit('sparkle', q.x, 1.5, q.z, 24, { color: '#dff4ff' }); }
      e.exposed = 3.2;
      later(e, 0.6, () => C.bubble(e, t('…hff… hff… bravo… me…'), 1.8));
    },
    pose(e, dt) {
      const u = e.obj.userData;
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z);
      e.animT = (e.animT || 0) + dt;
      const gliding = e.state === 'glide';
      u.body.position.y = 0.35 + Math.sin(e.t * 2) * 0.08;
      u.body.rotation.x = gliding ? 0.25 : 0;
      u.legs.forEach((L, i) => { L.rotation.x = e.state === 'chase' ? Math.sin(e.t * 4 + i * Math.PI) * 0.2 : 0; });
      const singing = e.anim === 'sing' && e.state === 'busy', breath = e.state === 'breath', hi = e.anim === 'hiC' && e.state === 'busy';
      const open = hi ? 0.5 : singing ? 0.25 + Math.abs(Math.sin(e.t * 9)) * 0.15 : breath ? 0.05 : 0.02;
      u.mouth.scale.y = 1 + open * 20;
      u.head.rotation.x = hi ? -0.45 : breath ? -0.2 : singing ? -0.15 + Math.sin(e.t * 3) * 0.05 : 0;
      u.arms[0].rotation.z = hi || singing ? 1.6 + Math.sin(e.t * 4) * 0.1 : e.anim === 'bow' && e.state === 'busy' ? 0.4 : 0.3;
      u.arms[1].rotation.x = hi ? -2.8 : breath ? -1.2 : singing ? -0.8 : -0.2;
      u.body.scale.set(1, breath ? 1 + Math.min(1, e.animT / 2) * 0.12 : 1, breath ? 1 + Math.min(1, e.animT / 2) * 0.18 : 1);
      u.cape.rotation.x = gliding ? 0.5 : Math.sin(e.t * 1.5) * 0.08;
      u.pages.forEach((p, i) => { const a = e.t * 1.2 + (i / u.pages.length) * Math.PI * 2; p.position.set(Math.cos(a) * 1.4, 2.2 + Math.sin(e.t * 2 + i) * 0.3, Math.sin(a) * 1.4); p.rotation.y = -a; p.rotation.z = Math.sin(e.t + i) * 0.3; });
      u.heart.material.emissiveIntensity = e.exposed > 0 ? 2.6 + Math.sin(e.t * 18) * 0.6 : 1.2;
    },
  },
};
