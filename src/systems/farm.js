// Garden: soil plots, planting, watering, growth & harvest, with little
// voxel crop models for every growth stage.

import { THREE, toon } from '../render/r3d.js';
import { CROPS, ITEMS } from '../data/items.js';
import { TT } from '../world/tiles.js';
import { t } from '../i18n.js';

const P = 1 / 16;

export class Farm {
  constructor(game, map) {
    this.game = game;
    this.map = map;
    this.root = new THREE.Group();
    this.meshes = new Map();
    this.wet = new Map();
    this.mats = {};
  }

  isSoil(tx, tz) {
    const m = this.map;
    if (tx < 0 || tz < 0 || tx >= m.w || tz >= m.h) return false;
    return m.ground[tz * m.w + tx] === TT.SOIL;
  }

  key(tx, tz) { return tx + ',' + tz; }
  plot(tx, tz) { return this.game.state.farm[this.key(tx, tz)] || null; }

  mat(c, emissive) {
    const k = c + (emissive || '');
    if (!this.mats[k]) this.mats[k] = toon(this.game.r3d, { color: c, emissive: emissive || 0x000000, emissiveIntensity: emissive ? 0.7 : 1 });
    return this.mats[k];
  }

  plant(tx, tz, crop) {
    this.game.state.farm[this.key(tx, tz)] = { crop, growth: 0, watered: this.game.state.weather === 'rain', stage: 0 };
    this.refresh(tx, tz);
  }

  water(tx, tz) {
    const p = this.plot(tx, tz);
    if (!p || p.watered) return false;
    p.watered = true;
    this.refresh(tx, tz);
    return true;
  }

  ready(p) {
    const c = CROPS[p.crop];
    return c && p.growth >= c.days;
  }

  stageOf(p) {
    const c = CROPS[p.crop];
    if (!c) return 0;
    if (p.growth >= c.days) return 3;
    if (p.growth >= Math.ceil(c.days * 0.6)) return 2;
    if (p.growth >= 1) return 1;
    return 0;
  }

  harvest(tx, tz) {
    const p = this.plot(tx, tz);
    if (!p || !this.ready(p)) return null;
    const c = CROPS[p.crop];
    if (c.regrow) { p.growth = c.days - c.regrow; }
    else delete this.game.state.farm[this.key(tx, tz)];
    this.refresh(tx, tz);
    return c.item;
  }

  // Called each new morning
  grow(rained) {
    for (const [k, p] of Object.entries(this.game.state.farm)) {
      if (p.watered || rained) p.growth += 1;
      p.watered = !!rained;
    }
    this.refreshAll();
  }

  refreshAll() {
    for (const k of [...this.meshes.keys()]) { this.root.remove(this.meshes.get(k)); this.meshes.delete(k); }
    for (const k of [...this.wet.keys()]) { this.root.remove(this.wet.get(k)); this.wet.delete(k); }
    for (const k of Object.keys(this.game.state.farm)) {
      const [x, z] = k.split(',').map(Number);
      this.refresh(x, z);
    }
  }

  refresh(tx, tz) {
    const k = this.key(tx, tz);
    const old = this.meshes.get(k);
    if (old) { this.root.remove(old); this.meshes.delete(k); }
    const oldWet = this.wet.get(k);
    if (oldWet) { this.root.remove(oldWet); this.wet.delete(k); }
    const p = this.plot(tx, tz);
    if (!p) return;
    if (p.watered) {
      if (!Farm.wetMat) Farm.wetMat = new THREE.MeshBasicMaterial({ color: 0x2a1812, transparent: true, opacity: 0.35, depthWrite: false });
      const w = new THREE.Mesh(new THREE.PlaneGeometry(0.94, 0.94), Farm.wetMat);
      w.rotation.x = -Math.PI / 2;
      w.position.set(tx + 0.5, 0.006, tz + 0.5);
      this.root.add(w);
      this.wet.set(k, w);
    }
    const g = this.cropModel(p);
    g.position.set(tx + 0.5, 0, tz + 0.5);
    g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    this.root.add(g);
    this.meshes.set(k, g);
  }

  cropModel(p) {
    const c = CROPS[p.crop];
    const g = new THREE.Group();
    const st = this.stageOf(p);
    const leaf = this.mat(c.leaf);
    const B = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w * P, h * P, d * P), m); b.position.set(x * P, y * P, z * P); g.add(b); return b; };
    // seed mound
    B(6, 1, 5, this.mat('#5e3d2c'), 0, 0.5, 0);
    if (st === 0) {
      // (just sown: a fresh dark mound, its seeds, and a little stake with the crop's colour —
      // a planted square must read as planted at a glance)
      B(8, 2, 7, this.mat('#3f271d'), 0, 1, 0); B(6, 1, 5, this.mat('#6e4a34'), 0, 2.2, 0);
      for (const [x, z] of [[-2, -1], [0, 1], [2, -1]]) B(1, 1, 1, this.mat('#f0dca0'), x, 3, z);
      B(1, 7, 1, this.mat('#a8784a'), -3, 3.5, -3);
      B(5, 4, 1, this.mat('#6b4330'), -3, 6.5, -2.7); B(3, 2, 1, this.mat(c.color), -3, 6.5, -2.2);
      return g;
    }
    if (st === 1) {
      B(1, 3, 1, leaf, 0, 2, 0);
      B(3, 1, 2, leaf, -1.5, 3.5, 0).rotation.z = 0.4;
      B(3, 1, 2, leaf, 1.5, 3.5, 0).rotation.z = -0.4;
      return g;
    }
    const tall = c.tall;
    if (st === 2) {
      B(1, tall ? 8 : 4, 1, leaf, 0, tall ? 4 : 2, 0);
      for (const [x, y, r] of [[-2, 4, 0.5], [2, 5, -0.5], [-1.5, 7, 0.4]]) B(4, 1, 3, leaf, x, tall ? y + 2 : y - 1, 0).rotation.z = r;
      return g;
    }
    // stage 3: mature
    const fruit = this.mat(c.color, c.glow ? c.color : null);
    switch (p.crop) {
      case 'turnip':
        B(5, 4, 5, fruit, 0, 2, 0); B(3, 2, 3, this.mat('#c07ab8'), 0, 4.5, 0);
        B(2, 5, 1, leaf, -1, 7, 0).rotation.z = 0.3; B(2, 5, 1, leaf, 1, 7, 0).rotation.z = -0.3;
        break;
      case 'carrot':
        B(3, 3, 3, fruit, 0, 1.5, 0);
        for (const x of [-1.5, 0, 1.5]) B(1, 6, 1, leaf, x, 5.5, 0).rotation.z = x * 0.2;
        break;
      case 'strawberry':
        for (const [x, z] of [[-2, 1], [2, 0], [0, -2], [0, 2]]) B(3, 1, 3, leaf, x, 3, z);
        B(2, 2, 2, fruit, -2, 2, 2); B(2, 2, 2, fruit, 2.5, 2.5, 1); B(2, 2, 2, fruit, 0, 1.5, -1);
        break;
      case 'sunflower':
        B(1, 14, 1, leaf, 0, 7, 0);
        B(3, 1, 2, leaf, -2, 6, 0).rotation.z = 0.5; B(3, 1, 2, leaf, 2, 9, 0).rotation.z = -0.5;
        B(7, 7, 2, fruit, 0, 16, 1); B(3, 3, 1, this.mat('#6b4330'), 0, 16, 2.2);
        break;
      case 'pumpkin': {
        const pm = new THREE.Mesh(new THREE.SphereGeometry(4 * P, 8, 6), fruit);
        pm.scale.set(1.2, 0.85, 1.1); pm.position.y = 3.5 * P; g.add(pm);
        B(1, 3, 1, this.mat('#5a7a3a'), 0, 7.5, 0);
        B(4, 1, 3, leaf, -4, 1, 2); B(4, 1, 3, leaf, 4, 1, -2);
        break;
      }
      case 'moonbloom':
        B(1, 7, 1, leaf, 0, 3.5, 0);
        B(4, 1, 4, fruit, 0, 7.5, 0); B(2, 2, 2, this.mat('#fff3a6', '#fff3a6'), 0, 8.5, 0);
        B(1, 1, 5, fruit, 0, 7.5, 0); B(5, 1, 1, fruit, 0, 7.5, 0);
        break;
      default:
        B(4, 4, 4, fruit, 0, 2, 0);
    }
    return g;
  }

  itemName(id) { return ITEMS[id] ? t(ITEMS[id].name) : id; }
}
