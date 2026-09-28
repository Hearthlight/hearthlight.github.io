// The gloom: grumpy creatures the storm left behind. Gloomlings are little
// ink-blobs with glowing eyes; animals caught in the gloom fight too — beat
// the gloom out of them and they turn back into themselves. The boss is the
// Grumblecloud, the storm itself, sulking over the valley.

import { THREE, toon } from '../render/r3d.js';
import { tickEnemy } from './v3/status.js';
import { NEW_ENEMIES, BRAINS, MODELS } from './v3/bestiary.js';

const GLOOM = new THREE.Color('#4a2a66');
const rand = (a, b) => a + Math.random() * (b - a);

export const ENEMIES = {
  gloomling: { name: 'Gloomling', hp: 24, speed: 2.3, r: 0.32, h: 0.7, dmg: 8, xp: 5, cost: 1, knockRes: 0 },
  biggloom: { name: 'Big Gloomling', hp: 75, speed: 1.7, r: 0.52, h: 1.1, dmg: 14, xp: 14, cost: 3, knockRes: 0.5 },
  fox: { name: 'Gloomy Fox', hp: 34, speed: 3.9, r: 0.32, h: 0.7, dmg: 7, xp: 9, cost: 2, animal: 'fox', knockRes: 0.1 },
  stag: { name: 'Gloomy Stag', hp: 85, speed: 2.2, r: 0.5, h: 1.3, dmg: 18, xp: 16, cost: 4, animal: 'deer', knockRes: 0.6 },
  crow: { name: 'Gloom Crow', hp: 22, speed: 3.2, r: 0.32, h: 0.5, dmg: 9, xp: 8, cost: 2, flying: true, knockRes: 0 },
  puffcap: { name: 'Puffcap', hp: 34, speed: 0, r: 0.38, h: 0.9, dmg: 7, xp: 8, cost: 2, knockRes: 1 },
  shellback: { name: 'Shellback', hp: 75, speed: 1.35, r: 0.56, h: 0.8, dmg: 12, xp: 15, cost: 4, animal: 'crab', armor: 'front', knockRes: 0.7 },
  boss: { name: 'Grumblecloud', hp: 650, speed: 1.6, r: 1.3, h: 1.4, dmg: 22, xp: 120, cost: 99, boss: true, flying: true, knockRes: 1 },
};
Object.assign(ENEMIES, NEW_ENEMIES);

// ------------------------------------------------------------------ models
function mat(r3d, c, e = null, ei = 0.9) {
  return new THREE.MeshToonMaterial({ color: c, emissive: e || 0x000000, emissiveIntensity: e ? ei : 1, gradientMap: r3d.gradient });
}
function box(g, w, h, d, m, x, y, z) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true;
  g.add(b);
  return b;
}

function gloomlingModel(r3d, big) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const k = big ? 1.6 : 1;
  const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34 * k, 1), mat(r3d, big ? '#3e2458' : '#4d2f6e'));
  blob.scale.set(1, 0.82, 0.95); blob.position.y = 0.3 * k; blob.castShadow = true;
  body.add(blob);
  const belly = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2 * k, 1), mat(r3d, '#6a4a8e'));
  belly.scale.set(1, 0.7, 0.5); belly.position.set(0, 0.24 * k, 0.2 * k);
  body.add(belly);
  const eye = mat(r3d, '#fff3a0', '#ffe066', 1.2);
  for (const sx of [-0.12, 0.12]) box(body, 0.09 * k, 0.11 * k, 0.04, eye, sx * k, 0.38 * k, 0.3 * k);
  const pupil = mat(r3d, '#241a2e');
  for (const sx of [-0.12, 0.12]) box(body, 0.04 * k, 0.05 * k, 0.03, pupil, sx * k + 0.015, 0.37 * k, 0.325 * k);
  // a sulky little sprout
  box(body, 0.04, 0.16 * k, 0.04, mat(r3d, '#2d6a5a'), 0, 0.62 * k, 0);
  const leaf = box(body, 0.14 * k, 0.03, 0.08 * k, mat(r3d, '#3f8a72'), 0.06 * k, 0.7 * k, 0);
  leaf.rotation.z = -0.4;
  if (big) for (const sx of [-1, 1]) { const horn = box(body, 0.08, 0.2, 0.08, mat(r3d, '#2a1a3a'), sx * 0.3, 0.9, 0); horn.rotation.z = -sx * 0.4; }
  g.userData.body = body;
  return g;
}

// a sporeling: a small gloomling wearing a spotted mushroom cap
function sporelingModel(r3d) {
  const inner = gloomlingModel(r3d, false);
  const body = inner.userData.body;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), mat(r3d, '#c85aa0'));
  cap.position.y = 0.5; cap.castShadow = true;
  body.add(cap);
  for (const [x, z] of [[0.1, 0.1], [-0.12, 0.05], [0.02, -0.14]]) box(body, 0.06, 0.03, 0.06, mat(r3d, '#fff0f8'), x, 0.68, z);
  inner.scale.setScalar(0.62);
  const g = new THREE.Group();
  g.add(inner);
  g.userData.body = body;
  return g;
}

function crowModel(r3d) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const black = mat(r3d, '#2e2438'), dark = mat(r3d, '#403250');
  box(body, 0.26, 0.2, 0.42, black, 0, 0, 0);
  box(body, 0.2, 0.2, 0.2, dark, 0, 0.1, 0.24);
  box(body, 0.06, 0.05, 0.14, mat(r3d, '#d9a441'), 0, 0.08, 0.4);
  for (const sx of [-0.06, 0.06]) box(body, 0.04, 0.04, 0.02, mat(r3d, '#ff6b8b', '#ff4a6a', 1.2), sx, 0.15, 0.34);
  box(body, 0.16, 0.04, 0.2, black, 0, 0.02, -0.28);
  const wings = [];
  for (const sx of [-1, 1]) {
    const w = new THREE.Group();
    w.position.set(sx * 0.13, 0.05, 0);
    box(w, 0.36, 0.03, 0.26, dark, sx * 0.18, 0, 0);
    body.add(w);
    wings.push(w);
  }
  g.userData.body = body;
  g.userData.wings = wings;
  return g;
}

function puffcapModel(r3d) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.42, 8), mat(r3d, '#e8dcc8'));
  stem.position.y = 0.21; stem.castShadow = true;
  body.add(stem);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(r3d, '#6a3a8e'));
  cap.scale.set(1, 0.75, 1); cap.position.y = 0.4; cap.castShadow = true;
  body.add(cap);
  const spot = mat(r3d, '#c9a2f0', '#9a6ad0', 0.5);
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const s = box(body, 0.1, 0.03, 0.1, spot, Math.cos(a) * 0.24, 0.62, Math.sin(a) * 0.24); s.rotation.y = a; }
  const eye = mat(r3d, '#fff3a0', '#ffe066', 1.2);
  for (const sx of [-0.07, 0.07]) box(body, 0.06, 0.08, 0.03, eye, sx, 0.3, 0.17);
  g.userData.body = body;
  return g;
}

function faceTexture(happy = false) {
  const c = document.createElement('canvas');
  c.width = 32; c.height = 20;
  const x = c.getContext('2d');
  x.fillStyle = happy ? '#f4f0fa' : '#5a4a72'; x.fillRect(0, 0, 32, 20);
  if (happy) {
    // all better: squinty happy eyes, pink cheeks, a little smile
    x.fillStyle = '#3b2a4a';
    x.fillRect(6, 8, 2, 1); x.fillRect(8, 7, 2, 1); x.fillRect(10, 8, 2, 1);
    x.fillRect(20, 8, 2, 1); x.fillRect(22, 7, 2, 1); x.fillRect(24, 8, 2, 1);
    x.fillRect(13, 13, 1, 1); x.fillRect(14, 14, 4, 1); x.fillRect(18, 13, 1, 1);
    x.fillStyle = '#f5a8c0'; x.fillRect(4, 11, 4, 2); x.fillRect(24, 11, 4, 2);
  } else {
    x.fillStyle = '#fff3a0';
    x.fillRect(6, 6, 6, 5); x.fillRect(20, 6, 6, 5);
    x.fillStyle = '#241a2e';
    x.fillRect(9, 7, 3, 4); x.fillRect(20, 7, 3, 4);
    x.fillRect(5, 4, 8, 2); x.fillRect(19, 4, 8, 2);           // cross brows
    x.fillRect(11, 14, 10, 2); x.fillRect(9, 16, 3, 1); x.fillRect(20, 16, 3, 1); // frown
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
}

function bossModel(r3d) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const puffs = [[0, 0, 0, 1.05], [-0.95, -0.1, 0.1, 0.78], [0.95, -0.1, 0.1, 0.82], [-0.5, 0.55, -0.2, 0.72], [0.55, 0.5, -0.25, 0.75], [0, 0.35, -0.6, 0.8], [-1.55, -0.3, -0.1, 0.5], [1.6, -0.25, -0.1, 0.52]];
  const cloud = mat(r3d, '#6e6488'), cloudD = mat(r3d, '#51466a');
  for (const [x, y, z, r] of puffs) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), y < 0 ? cloudD : cloud);
    m.position.set(x, y, z); m.castShadow = true;
    body.add(m);
  }
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.8), new THREE.MeshBasicMaterial({ map: faceTexture(), transparent: false }));
  face.position.set(0, 0.05, 1.04);
  body.add(face);
  g.userData.body = body;
  g.userData.face = face;
  g.userData.happy = faceTexture(true);
  return g;
}

// animals caught in the gloom: a purple wash (restored when cleansed) and
// angry glowing eyes
function gloomAnimal(r3d, critters, kind) {
  const src = kind === 'fox' ? critters.fox('#d9713a') : kind === 'deer' ? critters.deer(true) : critters.crab();
  const g = new THREE.Group();
  g.add(src);
  if (kind === 'crab') { src.scale.setScalar(2.1); box(src, 0.36, 0.1, 0.28, mat(r3d, '#3a2350'), 0, 0.2, 0); }
  if (kind === 'deer') src.scale.setScalar(1.15);
  src.traverse((m) => {
    if (!m.isMesh) return;
    m.material = m.material.clone();
    m.userData.orig = m.material.color.clone();
    m.material.color.lerp(GLOOM, 0.6);
  });
  const glow = mat(r3d, '#ff6b8b', '#ff3a5a', 1.3);
  const eyes = kind === 'fox' ? [[0.33, 0.35, 0.06], [0.33, 0.35, -0.06]] : kind === 'deer' ? [[0.5, 0.9, 0.08], [0.5, 0.9, -0.08]] : [[0.2, 0.42, 0.1], [0.2, 0.42, -0.1]];
  g.userData.eyes = eyes.map(([x, y, z]) => box(g, 0.06, 0.06, 0.06, glow, x, y, z));
  g.userData.animal = src;
  g.userData.body = g;
  return g;
}

// ------------------------------------------------------------------ Enemy
export class Enemy {
  constructor(combat, type, x, z, opts = {}) {
    this.combat = combat;
    this.type = type;
    this.def = ENEMIES[type];
    const d = this.def, C = combat, r3d = C.r3d;
    const scale = opts.hpScale || 1;
    this.maxHp = Math.round(d.hp * scale);
    // (shields & bubbles grow like the health: a level-40 shield is no paper wall)
    this.hpK = scale;
    this.hp = this.maxHp;
    this.x = x; this.z = z; this.y = d.flying && !d.boss ? 2.2 : 0;
    this.vx = 0; this.vz = 0; this.vy = 0;
    this.r = d.r;
    this.state = opts.sleep ? 'sleep' : 'chase';
    this.t = rand(0, 1);
    this.timer = rand(0.5, 1.5);
    this.face = { x: 0, z: 1 };
    this.stun = 0; this.flash = 0; this.knock = null; this.hitOnce = new Set();
    this.alive = true;
    this.nest = opts.nest || null;
    this.ph = Math.random() * 10;
    this.obj = MODELS[type] ? MODELS[type](r3d)
      : type === 'sporeling' ? sporelingModel(r3d)
      : d.animal ? gloomAnimal(r3d, C.world.critters, d.animal)
      : type === 'crow' ? crowModel(r3d)
        : type === 'puffcap' ? puffcapModel(r3d)
          : type === 'boss' ? bossModel(r3d)
            : gloomlingModel(r3d, type === 'biggloom');
    this.mats = [];
    this.obj.traverse((m) => { if (m.isMesh && m.material && m.material.emissive) this.mats.push({ m: m.material, e: m.material.emissive.clone(), i: m.material.emissiveIntensity }); });
    this.obj.position.set(x, this.y, z);
    this.brain = BRAINS[type] || null;
    if (this.brain && this.brain.init) this.brain.init(this);
    if (this.brain) this.obj.position.set(x, this.y, z);
    if (type === 'boss') { this.y = 3.4; this.phase2 = false; this.cycle = 0; this.tiredT = 9; }
    if (type === 'puffcap') { this.pop = 0; this.state = opts.sleep ? 'sleep' : 'pop'; this.shots = 0; }
    C.root.add(this.obj);
    // a purple shadow wisp under everything gloomy
    const sh = new THREE.Mesh(C.shadowGeo, C.gloomShadowMat);
    sh.scale.setScalar(d.r * 2.4);
    sh.position.set(x, 0.02, z);
    C.root.add(sh);
    this.shadow = sh;
  }

  get hurtable() { return this.alive && !(this.spawnT > 0) && !this.under && !(this.type === 'puffcap' && this.pop < 0.5); }

  // ---- per frame
  update(dt) {
    const C = this.combat, d = this.def;
    this.t += dt;
    if (this.flash > 0) { this.flash -= dt; this.setFlash(this.flash > 0 ? 1 : 0); }
    if (this.spawnT > 0) {
      // popping out of a gloom puddle (or tumbling from the sky)
      this.spawnT -= dt;
      const k = 1 - Math.max(0, this.spawnT) / 0.6;
      this.obj.scale.setScalar(0.2 + k * 0.8);
      if (this.y > 0) { this.vy -= 22 * dt; this.y = Math.max(0, this.y + this.vy * dt); }
      this.obj.position.set(this.x, this.y, this.z);
      this.shadow.position.set(this.x, 0.02, this.z);
      if (this.spawnT > 0) return;
      this.obj.scale.setScalar(1);
    }
    // knock-back & juggling
    if (this.knock) {
      this.knock.t -= dt;
      C.moveEnemy(this, this.knock.vx * dt, this.knock.vz * dt);
      if (this.knock.t <= 0) this.knock = null;
    }
    if (!d.flying || this.state === 'fallen') {
      if (this.y > 0 || this.vy > 0) {
        this.vy -= 22 * dt; this.y += this.vy * dt;
        if (this.y <= 0) { this.y = 0; if (this.vy < -6) C.world.fx.emit('dust', this.x, 0.05, this.z, 4); this.vy = 0; }
      }
    }
    tickEnemy(C, this, dt);
    if (!this.alive) return;
    if (this.stun > 0) {
      this.stun -= dt;
      if (Math.random() < dt * 4) C.world.fx.emit('sparkle', this.x, d.h + 0.4, this.z, 1, { color: '#fff3a6' });
    } else if (this.frozen > 0) {
      // frozen solid — waiting for a big hit
    } else if (this.state === 'sleep') {
      if (Math.random() < dt * 0.6) C.world.fx.emit('smoke', this.x, d.h, this.z, 1, { color: '#7a5a9a' });
    } else this.think(dt);
    this.pose(dt);
    this.obj.position.set(this.x, this.y, this.z);
    this.shadow.position.set(this.x, 0.02, this.z);
    this.shadow.visible = this.alive;
  }

  setFlash(on) {
    for (const q of this.mats) {
      if (on) { q.m.emissive.setRGB(1, 1, 1); q.m.emissiveIntensity = 0.85; }
      else { q.m.emissive.copy(q.e); q.m.emissiveIntensity = q.i; }
    }
    if (!on) this.tinted = null;           // a status tint comes back after the flash
  }

  faceTo(x, z) {
    const dx = x - this.x, dz = z - this.z, l = Math.hypot(dx, dz) || 1;
    this.face = { x: dx / l, z: dz / l };
  }

  think(dt) {
    const C = this.combat, d = this.def;
    const tgt = C.targetFor(this);
    const T = this.type;
    this.timer -= dt;
    if (this.brain) { if (!tgt && T !== 'totem' && T !== 'mender') { this.wander(dt); return; } this.brain.think(this, dt, tgt, C); return; }
    if (!tgt) { this.wander(dt); return; }
    const dx = tgt.pos.x - this.x, dz = tgt.pos.z - this.z, dist = Math.hypot(dx, dz);
    const sp = d.speed * (C.enemySpeed || 1) * (C.diffSpeed || 1);
    if (T === 'gloomling' || T === 'biggloom' || T === 'sporeling') {
      if (this.state === 'chase') {
        this.faceTo(tgt.pos.x, tgt.pos.z);
        if (dist > d.r + 0.75) C.moveEnemy(this, (dx / dist) * sp * dt, (dz / dist) * sp * dt, true);
        else { this.state = 'windup'; this.timer = T === 'biggloom' ? 0.55 : 0.42; }
      } else if (this.state === 'windup') {
        if (this.timer <= 0) { this.state = 'lunge'; this.timer = 0.2; this.hitOnce.clear(); C.sfx('growl', this); }
      } else if (this.state === 'lunge') {
        C.moveEnemy(this, this.face.x * 7 * dt, this.face.z * 7 * dt);
        C.enemyTouch(this, d.dmg, 3, 0.55);
        if (this.timer <= 0) { this.state = 'recover'; this.timer = 0.5; }
      } else if (this.state === 'recover') { if (this.timer <= 0) this.state = 'chase'; }
    } else if (T === 'fox') {
      if (this.state === 'chase') {
        this.faceTo(tgt.pos.x, tgt.pos.z);
        if (dist > 1.1) C.moveEnemy(this, (dx / dist) * sp * dt, (dz / dist) * sp * dt, true);
        else { this.state = 'windup'; this.timer = 0.24; }
      } else if (this.state === 'windup') {
        if (this.timer <= 0) { this.state = 'bite'; this.timer = 0.14; this.hitOnce.clear(); C.sfx('growl', this); }
      } else if (this.state === 'bite') {
        C.moveEnemy(this, this.face.x * 5 * dt, this.face.z * 5 * dt);
        C.enemyTouch(this, d.dmg, 2, 0.5);
        if (this.timer <= 0) { this.state = 'retreat'; this.timer = rand(0.7, 1.1); }
      } else if (this.state === 'retreat') {
        this.faceTo(this.x - dx, this.z - dz);
        C.moveEnemy(this, (-dx / (dist || 1)) * sp * 0.9 * dt, (-dz / (dist || 1)) * sp * 0.9 * dt, true);
        if (this.timer <= 0) this.state = 'chase';
      }
    } else if (T === 'stag') {
      if (this.state === 'chase') {
        this.faceTo(tgt.pos.x, tgt.pos.z);
        const want = dist > 7 ? 1 : dist < 3.5 ? -0.7 : 0;
        if (want) C.moveEnemy(this, (dx / dist) * sp * want * dt, (dz / dist) * sp * want * dt, true);
        if (this.timer <= 0 && dist < 9) { this.state = 'aim'; this.timer = 0.95; this.aim = { x: dx / dist, z: dz / dist }; C.telegraphLine(this, this.aim, 8, 0.95); }
      } else if (this.state === 'aim') {
        this.face = this.aim;
        if (Math.random() < dt * 12) C.world.fx.emit('dust', this.x - this.aim.x * 0.4, 0.05, this.z - this.aim.z * 0.4, 2);
        if (this.timer <= 0) { this.state = 'charge'; this.timer = 1.3; this.hitOnce.clear(); C.sfx('charge', this); }
      } else if (this.state === 'charge') {
        const moved = C.moveEnemy(this, this.aim.x * 9.5 * dt, this.aim.z * 9.5 * dt);
        C.enemyTouch(this, d.dmg, 7, 0.75, 1.2);
        if (Math.random() < dt * 20) C.world.fx.emit('dust', this.x, 0.05, this.z, 1);
        if (!moved) { this.stun = 1.7; this.state = 'chase'; this.timer = rand(2, 3); C.shakeAt(this, 0.3); C.sfx('bonk', this); C.bubble(this, 'BONK!'); }
        else if (this.timer <= 0) { this.state = 'chase'; this.timer = rand(1.8, 3.2); }
      }
    } else if (T === 'crow') {
      if (this.state === 'chase' || this.state === 'sleep') {
        this.ang = (this.ang ?? Math.random() * 6) + dt * 1.3;
        const tx = tgt.pos.x + Math.cos(this.ang) * 3.3, tz = tgt.pos.z + Math.sin(this.ang) * 2.4;
        C.moveEnemy(this, (tx - this.x) * dt * 2, (tz - this.z) * dt * 2, false, true);
        this.faceTo(tx, tz);
        this.y += (2.3 - this.y) * dt * 3;
        if (this.timer <= 0) { this.state = 'mark'; this.timer = 0.55; this.aimAt = { x: tgt.pos.x, z: tgt.pos.z }; C.telegraphCircle(this.aimAt.x, this.aimAt.z, 0.8, 0.55); }
      } else if (this.state === 'mark') {
        this.y += (2.8 - this.y) * dt * 4;
        this.faceTo(this.aimAt.x, this.aimAt.z);
        if (this.timer <= 0) { this.state = 'swoop'; this.timer = 0.75; this.from = { x: this.x, z: this.z }; this.hitOnce.clear(); C.sfx('caw', this); }
      } else if (this.state === 'swoop') {
        const k = 1 - this.timer / 0.75;
        const ex = this.aimAt.x + (this.aimAt.x - this.from.x) * 0.6, ez = this.aimAt.z + (this.aimAt.z - this.from.z) * 0.6;
        this.x = this.from.x + (ex - this.from.x) * k; this.z = this.from.z + (ez - this.from.z) * k;
        this.y = 0.55 + Math.abs(k - 0.5) * 4.4;
        if (this.y < 1.4) C.enemyTouch(this, d.dmg, 3, 0.6);
        if (this.timer <= 0) { this.state = 'chase'; this.timer = rand(2.4, 3.8); }
      }
    } else if (T === 'puffcap') {
      if (this.state === 'pop') {
        this.pop = Math.min(1, this.pop + dt * 2.5);
        if (this.pop >= 1) { this.state = 'shoot'; this.timer = 0.8; this.shots = 0; }
      } else if (this.state === 'shoot') {
        this.faceTo(tgt.pos.x, tgt.pos.z);
        if (this.timer <= 0 && dist < 10) {
          this.timer = 2.1; this.shots++;
          C.enemyShot(this, tgt, { speed: 4.6, r: 0.24, dmg: d.dmg, life: 2.6, look: 'spore' });
          this.squashT = 0.3;
          if (this.shots >= 3) { this.state = 'burrow'; this.timer = 0.6; }
        }
      } else if (this.state === 'burrow') {
        this.pop = Math.max(0, this.pop - dt * 2.5);
        if (this.pop <= 0) {
          const s = C.freeSpot(this.x, this.z, 4.5);
          if (s) { this.x = s.x; this.z = s.z; }
          C.world.fx.emit('dust', this.x, 0.05, this.z, 5, { color: '#8a6aa8' });
          this.state = 'pop';
        }
      }
    } else if (T === 'shellback') {
      if (this.state === 'chase') {
        this.faceTo(tgt.pos.x, tgt.pos.z);
        if (dist > 1.25) C.moveEnemy(this, (dx / dist) * sp * dt, (dz / dist) * sp * dt, true);
        else { this.state = 'windup'; this.timer = 0.5; }
      } else if (this.state === 'windup') {
        if (this.timer <= 0) { this.state = 'pinch'; this.timer = 0.15; this.hitOnce.clear(); C.sfx('snap', this); }
      } else if (this.state === 'pinch') {
        C.enemyTouch(this, d.dmg, 3.5, 0.9);
        if (this.timer <= 0) { this.state = 'recover'; this.timer = 0.7; }
      } else if (this.state === 'recover') { if (this.timer <= 0) this.state = 'chase'; }
    } else if (T === 'boss') this.bossThink(dt, tgt);
  }

  // The Grumblecloud: lightning, gloomlings, gusts — and naps
  bossThink(dt, tgt) {
    const C = this.combat;
    const mid = C.partyCentre();
    if (!this.phase2 && this.hp < this.maxHp * 0.5) { this.phase2 = true; C.bubble(this, 'GRRRUMBLE!'); C.shakeAt(this, 0.6); C.sfx('thunder', this); for (const q of this.mats) q.m.color && q.m.color.lerp(new THREE.Color('#8a3a5a'), 0.35); }
    if (this.state === 'tired') {
      this.y += (0.95 - this.y) * dt * 3;
      if (Math.random() < dt * 1.5) C.bubble(this, 'z z z', 0.8);
      if (this.timer <= 0) { this.state = 'chase'; this.timer = 1.2; this.tiredT = this.phase2 ? 8 : 10; C.sfx('thunder', this); }
      return;
    }
    // drift over the party
    const tx = mid.x + Math.sin(this.t * 0.4) * 3, tz = mid.z - 1.5 + Math.cos(this.t * 0.33) * 1.5;
    this.x += (tx - this.x) * dt * 0.6; this.z += (tz - this.z) * dt * 0.6;
    this.y += (3.4 - this.y) * dt * 2;
    this.faceTo(mid.x, mid.z + 6);
    this.tiredT -= dt;
    if (this.tiredT <= 0) { this.state = 'tired'; this.timer = 4.2; C.bubble(this, '*yawn*'); return; }
    if (this.timer > 0) return;
    this.cycle++;
    const live = C.alivePlayers();
    if (this.cycle % 4 === 0) {
      // rain down some gloomlings
      const n = 2 + Math.min(4, live.length);
      for (let i = 0; i < n; i++) { const s = C.freeSpot(this.x, this.z + 1, 3.5); if (s) C.spawn('gloomling', s.x, s.z, { drop: true }); }
      C.sfx('thunder', this);
      this.timer = 2.4;
    } else if (this.cycle % 3 === 0) {
      // a big grumpy gust that shoves everyone away
      C.gust(this.x, this.z, 6.5);
      C.bubble(this, 'HMPH!');
      this.timer = 2.0;
    } else {
      const strikes = this.phase2 ? 5 : 3;
      for (let i = 0; i < strikes; i++) {
        const p = live[(i + this.cycle) % Math.max(1, live.length)] || tgt;
        const px = p.pos.x + (i >= live.length ? rand(-2.5, 2.5) : p.vel.x * 0.35), pz = p.pos.z + (i >= live.length ? rand(-2, 2) : p.vel.z * 0.35);
        C.lightning(px, pz, 1.15, this.def.dmg, 0.95 + i * 0.12);
      }
      this.timer = this.phase2 ? 2.0 : 2.6;
    }
  }

  wander(dt) {
    if (this.timer <= 0) { this.timer = rand(1.2, 2.6); const a = Math.random() * Math.PI * 2; this.wdir = { x: Math.cos(a), z: Math.sin(a) }; }
    if (this.wdir && this.def.speed) { this.combat.moveEnemy(this, this.wdir.x * 0.6 * dt, this.wdir.z * 0.6 * dt, true); this.face = this.wdir; }
  }

  // ---- looks
  pose(dt) {
    const u = this.obj.userData, T = this.type, t = this.t + this.ph;
    if (this.brain && this.brain.pose) { this.brain.pose(this, dt); return; }
    const heading = Math.atan2(this.face.x, this.face.z);
    const body = u.body || this.obj;
    if (T === 'gloomling' || T === 'biggloom' || T === 'sporeling') {
      this.obj.rotation.y = heading;
      const moving = this.state === 'chase' || this.state === 'lunge';
      const hop = moving ? Math.abs(Math.sin(t * 9)) : 0;
      const wind = this.state === 'windup' ? Math.sin(t * 40) * 0.05 : 0;
      body.position.y = hop * 0.14;
      body.scale.set(1 + (this.state === 'windup' ? 0.12 : 0) - hop * 0.08 + wind, 1 - (this.state === 'windup' ? 0.18 : 0) + hop * 0.12, 1 + (this.state === 'windup' ? 0.12 : 0));
      if (this.state === 'sleep') body.scale.set(1.08, 0.86 + Math.sin(t * 2) * 0.04, 1.08);
    } else if (T === 'crow') {
      this.obj.rotation.y = heading;
      const flap = this.state === 'sleep' ? -0.15 : Math.sin(t * (this.state === 'swoop' ? 6 : 16));
      u.wings[0].rotation.z = flap * 0.7; u.wings[1].rotation.z = -flap * 0.7;
      body.rotation.x = this.state === 'swoop' ? 0.5 : 0;
    } else if (T === 'puffcap') {
      body.scale.set(1, Math.max(0.05, this.pop) * (1 - (this.squashT > 0 ? 0.2 : 0)), 1);
      if (this.squashT > 0) this.squashT -= dt;
      body.rotation.y = heading * 0.3;
    } else if (T === 'boss') {
      body.position.y = Math.sin(t * 1.4) * 0.12;
      body.rotation.z = Math.sin(t * 0.7) * 0.05;
      this.obj.rotation.y = heading * 0.4;
      body.scale.set(1 + Math.sin(t * 2) * 0.03, 1 + Math.cos(t * 2) * 0.03, 1);
    } else {
      // animals: critter models face +x
      this.obj.rotation.y = Math.atan2(-this.face.z, this.face.x);
      const a = u.animal;
      if (a) {
        const run = this.state === 'chase' || this.state === 'retreat' || this.state === 'charge' || this.state === 'bite';
        a.position.y = run ? Math.abs(Math.sin(t * (this.state === 'charge' ? 18 : 12))) * 0.06 : 0;
        a.rotation.z = this.state === 'aim' ? -0.25 : this.state === 'windup' ? -0.15 : 0;
      }
    }
  }

  // beaten: poof of gloom — animals turn back into themselves
  cleanse() {
    const u = this.obj.userData;
    if (u.animal) {
      u.animal.traverse((m) => { if (m.isMesh && m.userData.orig) m.material.color.copy(m.userData.orig); });
      for (const e of u.eyes || []) e.visible = false;
      for (const q of this.mats) q.m.emissive.setRGB(0, 0, 0);
      return true;
    }
    return false;
  }

  remove() {
    this.combat.root.remove(this.obj);
    this.combat.root.remove(this.shadow);
    if (this.ice) this.combat.root.remove(this.ice);
  }
}
