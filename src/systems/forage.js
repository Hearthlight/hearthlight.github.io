// Daily forageables (mushrooms, shells, flowers, wood…), berry bushes,
// story pickups (lost pages) and night-time fireflies.

import { THREE, toon } from '../render/r3d.js';
import { TT } from '../world/tiles.js';
import { rng, hash2 } from '../engine/util.js';
import { OX, OZ } from '../world/overworld.js';

const P = 1 / 16;

// candidate spawn rules: [itemId, terrain types, count per day, near trees?, region?]
const REGIONS = {
  bluffs: (x, z) => x < 44 && z > 80,
  island: (x, z) => x > 144 && z > 104,
  mainland: (x, z) => !(x > 144 && z > 104),
};
const RULES = [
  ['mushroom', [TT.FOREST, TT.GRASS], 14, 'trees'],
  ['branch', [TT.FOREST, TT.GRASS, TT.MEADOW], 22, 'trees'],
  ['pinecone', [TT.FOREST], 7, 'pines'],
  ['shell', [TT.SAND], 12, null, 'mainland'],
  ['shell', [TT.SAND], 4, null, 'island'],
  ['seaglass', [TT.SAND], 2, null],
  ['daisy', [TT.GRASS, TT.MEADOW, TT.HILL], 12, null],
  ['poppy', [TT.MEADOW], 9, null],
  ['bluebell', [TT.MEADOW], 7, null],
  ['apple', [TT.GRASS], 5, 'apple'],
  ['feather', [TT.ROCK, TT.SAND, TT.GRASS], 4, null, 'bluffs'],
  ['starfish', [TT.SAND], 3, null, 'island'],
];

export class Forage {
  constructor(game, map) {
    this.game = game;
    this.map = map;
    this.root = new THREE.Group();
    this.items = [];
    this.fireflies = [];
    this.ffGroup = new THREE.Group();
    this.mats = {};
  }

  mat(c, e) {
    const k = c + (e || '');
    if (!this.mats[k]) this.mats[k] = toon(this.game.r3d, { color: c, emissive: e || 0x000000, emissiveIntensity: e ? 0.8 : 1 });
    return this.mats[k];
  }

  model(id) {
    const g = new THREE.Group();
    const B = (w, h, d, c, x, y, z, e) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w * P, h * P, d * P), this.mat(c, e)); b.position.set(x * P, y * P, z * P); b.castShadow = true; g.add(b); return b; };
    switch (id) {
      case 'mushroom': B(2, 3, 2, '#f4ead8', 0, 1.5, 0); B(5, 2, 5, '#d9594c', 0, 4, 0); B(1, 1, 1, '#fff8ec', -1, 5.1, 1); B(1, 1, 1, '#fff8ec', 1.4, 5.1, -0.6); break;
      case 'branch': { const b = B(9, 2, 2, '#8e5d3e', 0, 1, 0); b.rotation.y = 0.6; B(3, 1, 1, '#6b4330', 2, 2, 1).rotation.y = -0.4; break; }
      case 'pinecone': B(3, 4, 3, '#8e5d3e', 0, 2, 0); B(2, 1, 2, '#b07b50', 0, 4.5, 0); break;
      case 'shell': B(4, 2, 3, '#f7c9b8', 0, 1, 0); B(2, 1, 1, '#e3a896', 0, 2.2, 0.5); break;
      case 'seaglass': B(3, 2, 2, '#8fd6c8', 0, 1, 0, '#4fb0a0'); break;
      case 'daisy': B(1, 4, 1, '#5fa453', 0, 2, 0); B(3, 1, 3, '#fff8ec', 0, 4.5, 0); B(1, 1, 1, '#ffd66b', 0, 5.1, 0); break;
      case 'poppy': B(1, 5, 1, '#5fa453', 0, 2.5, 0); B(3, 2, 3, '#e0403f', 0, 5.5, 0); B(1, 1, 1, '#3b2a2e', 0, 6.6, 0); break;
      case 'bluebell': B(1, 5, 1, '#5fa453', 0, 2.5, 0); B(2, 3, 2, '#6a8ae0', 1, 4.5, 0); B(2, 2, 2, '#8aa6f0', -1, 5.5, 0); break;
      case 'apple': B(3, 3, 3, '#e0463f', 0, 1.5, 0); B(1, 1, 1, '#6b4330', 0, 3.4, 0); break;
      case 'page': {
        const b = B(5, 1, 6, '#fbf1dc', 0, 0.5, 0, '#fff3a6'); b.rotation.y = 0.4; B(3, 1, 1, '#9a8a80', 0, 1.1, -1); break;
      }
      case 'kite': B(6, 1, 6, '#d9364a', 0, 0.6, 0).rotation.y = 0.78; break;
      case 'feather': { const f = B(1, 1, 7, '#f4f1ec', 0, 0.5, 0); f.rotation.y = 0.5; B(2, 1, 4, '#dfe3ea', 0.6, 0.6, 0.4).rotation.y = 0.5; B(1, 1, 2, '#9a95a0', -1.2, 0.5, -2.2).rotation.y = 0.5; break; }
      case 'starfish': for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const arm = B(2, 1, 4, '#f0934a', Math.cos(a) * 1.4, 0.5, Math.sin(a) * 1.4); arm.rotation.y = -a + Math.PI / 2; } B(2, 1, 2, '#f6b06a', 0, 0.8, 0); break;
      case 'bottle': { const b = B(2, 2, 5, '#9fd6c8', 0, 1, 0, '#4fb0a0'); b.rotation.y = 0.9; B(1, 1, 1, '#8e5d3e', 1.8, 1, -1.6); B(1, 1, 2, '#fbf1dc', 0, 1.2, 0).rotation.y = 0.9; break; }
      default: B(3, 3, 3, '#e0a526', 0, 1.5, 0);
    }
    return g;
  }

  // spawn a fresh set for today (deterministic per day)
  spawnDay(day, trees) {
    for (const it of this.items) this.root.remove(it.obj);
    this.items = [];
    const r = rng(day * 7919 + 13);
    const m = this.map;
    const occupied = new Set();
    for (const [id, types, count, near, region] of RULES) {
      const inRegion = region ? REGIONS[region] : null;
      let placed = 0, tries = 0;
      while (placed < count && tries++ < 400) {
        let x, z;
        if (near && trees && trees.length) {
          const list = near === 'pines' ? trees.filter((t) => t.type === 'pine') : near === 'apple' ? trees.filter((t) => t.type === 'apple') : trees.filter((t) => t.type !== 'palm');
          if (!list.length) break;
          const t = list[Math.floor(r() * list.length)];
          const a = r() * Math.PI * 2;
          x = t.x + Math.cos(a) * (0.8 + r() * 0.8);
          z = t.y + Math.sin(a) * (0.7 + r() * 0.6) + 0.3;
        } else if (region === 'island') {
          x = 146 + r() * 28; z = 104 + r() * 18;
        } else if (region === 'bluffs') {
          x = 2 + r() * 42; z = 80 + r() * 18;
        } else {
          x = 2 + r() * (m.w - 4); z = 2 + r() * (m.h - 4);
        }
        if (inRegion && !inRegion(x, z)) continue;
        const tx = Math.floor(x), tz = Math.floor(z);
        if (tx < 1 || tz < 1 || tx >= m.w - 1 || tz >= m.h - 1) continue;
        const t = m.ground[tz * m.w + tx];
        if (!types.includes(t)) continue;
        if (occupied.has(tx + ',' + tz)) continue;
        if (this.game.overCol && this.game.overCol.blocked(x, z, 0.3)) continue;
        // keep the forest interior mostly clear of pickups deep under canopy
        occupied.add(tx + ',' + tz);
        this.add(id, x, z, `d${day}-${id}-${placed}`);
        placed++;
      }
    }
  }

  add(id, x, z, key, opts = {}) {
    if (this.game.state.forage.taken[key]) return null;
    const obj = this.model(id);
    obj.position.set(x, 0, z);
    obj.rotation.y = hash2(Math.floor(x * 10), Math.floor(z * 10), 3) * Math.PI;
    this.root.add(obj);
    const it = { id, x, z, key, obj, story: !!opts.story, glowNight: !!opts.glowNight };
    this.items.push(it);
    return it;
  }

  remove(it) {
    this.root.remove(it.obj);
    this.items = this.items.filter((i) => i !== it);
    this.game.state.forage.taken[it.key] = true;
  }

  nearest(x, z, r = 0.9) {
    let best = null, bd = r * r;
    for (const it of this.items) {
      const d = (it.x - x) ** 2 + (it.z - z) ** 2;
      if (d < bd) { bd = d; best = it; }
    }
    return best;
  }

  // ---- fireflies ------------------------------------------------------------
  setupFireflies(r3d, glowTex) {
    const mat = new THREE.SpriteMaterial({ map: glowTex, color: 0xd8ff7a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    this.ffMat = mat;
    const zones = [[OX + 80, OZ + 22, 9, 10], [OX + 84, OZ + 36, 8, 8], [OX + 10, OZ + 8, 7, 4], [OX + 60, OZ + 36, 5, 4],
      [73, 27, 6, 4], [141, 34, 6, 4], [152, 67, 7, 3], [36, 78, 5, 3], [160, 113, 6, 3], [112, 23, 7, 3], [47, 20, 5, 3]];
    const r = rng(5);
    for (let i = 0; i < 48; i++) {
      const [cx, cz, rx, rz] = zones[i % zones.length];
      const sp = new THREE.Sprite(mat);
      sp.scale.set(0.5, 0.5, 1);
      const f = { home: { x: cx + (r() - 0.5) * rx * 2, z: cz + (r() - 0.5) * rz * 2 }, x: 0, z: 0, y: 0.7, phase: r() * 10, sprite: sp, caught: false, zone: i % zones.length };
      f.x = f.home.x; f.z = f.home.z;
      sp.position.set(f.x, f.y, f.z);
      this.ffGroup.add(sp);
      this.fireflies.push(f);
    }
    r3d.scene.add(this.ffGroup);
  }

  updateFireflies(dt, t, night, mapIsOverworld) {
    const vis = night && mapIsOverworld;
    this.ffGroup.visible = vis;
    if (!vis) return;
    const blink = (f) => 0.5 + 0.5 * Math.sin(t * 2.2 + f.phase * 3);
    for (const f of this.fireflies) {
      if (f.caught) { f.sprite.visible = false; continue; }
      f.sprite.visible = true;
      f.x = f.home.x + Math.sin(t * 0.4 + f.phase) * 1.2 + Math.sin(t * 1.1 + f.phase * 2) * 0.3;
      f.z = f.home.z + Math.cos(t * 0.35 + f.phase) * 0.9;
      f.y = 0.6 + Math.sin(t * 1.3 + f.phase) * 0.25;
      f.sprite.position.set(f.x, f.y, f.z);
      const b = blink(f);
      f.sprite.scale.set(0.25 + b * 0.35, 0.25 + b * 0.35, 1);
    }
    this.ffMat.opacity = 0.9;
  }

  nearestFirefly(x, z, r = 1.3) {
    let best = null, bd = r * r;
    for (const f of this.fireflies) {
      if (f.caught || !f.sprite.visible) continue;
      const d = (f.x - x) ** 2 + (f.z - z) ** 2;
      if (d < bd) { bd = d; best = f; }
    }
    return best;
  }

  resetFireflies() { for (const f of this.fireflies) f.caught = false; }
}
