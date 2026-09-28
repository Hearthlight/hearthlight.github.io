// Assembles the 3D overworld scene from the map description: chunked ground
// textures, an animated water shader, buildings, forests, props & landmarks.

import { THREE, pixelTexture, toon } from '../render/r3d.js';
import { renderTerrain, WATER_VERT, WATER_FRAG } from '../art/terrain.js';
import { buildBuilding } from '../models/buildings.js';
import { buildTrees, buildBushesRocks } from '../models/nature.js';
import { buildProp, buildPier, buildBridge, buildLavender, buildWheat, buildReeds, buildLilypads } from '../models/props.js';
import { TT, TILE } from './tiles.js';
import { OX, OZ } from './overworld.js';

const CHUNK = 64; // tiles per ground chunk

export class World3D {
  constructor(r3d, map, lighting) {
    this.r3d = r3d;
    this.map = map;
    this.lighting = lighting;
    this.root = new THREE.Group();
    this.colliders = [];
    this.props = [];
    this.buildings = {};
    this.anims = [];
    this.chimneys = [];
    this.interactables = [];
    this.spinners = [];
    this.fires = [];
    this.glowcaps = [];
    this.flickerLights = [];
    this.hives = [];
    this.groundParts = [];   // ground, water & skirts (Party Mode streams its own)
    this.millSpeed = 0;
  }

  async build(onProgress = () => {}) {
    const r3d = this.r3d, map = this.map;
    const { w, h } = map;
    const terr = await renderTerrain(map, (p) => onProgress(p * 0.8));
    this.terrain = terr;

    // ground chunks
    const PW = terr.PW;
    for (let cz = 0; cz < h; cz += CHUNK) {
      for (let cx = 0; cx < w; cx += CHUNK) {
        const cw = Math.min(CHUNK, w - cx), ch = Math.min(CHUNK, h - cz);
        const c = document.createElement('canvas');
        c.width = cw * TILE; c.height = ch * TILE;
        const ctx = c.getContext('2d');
        const part = ctx.createImageData(c.width, c.height);
        for (let y = 0; y < c.height; y++) {
          const src = ((cz * TILE + y) * PW + cx * TILE) * 4;
          part.data.set(terr.img.data.subarray(src, src + c.width * 4), y * c.width * 4);
        }
        ctx.putImageData(part, 0, 0);
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(cw, ch), toon(r3d, { map: pixelTexture(c) }));
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(cx + cw / 2, 0, cz + ch / 2);
        mesh.receiveShadow = true;
        this.root.add(mesh);
        this.groundParts.push(mesh);
      }
    }
    terr.img = null; // free the big image
    onProgress(0.82);

    // skirts so the map edges never show the void
    const sea = toon(r3d, { color: 0x244d78, key: 'skirt-sea' });
    const forest = toon(r3d, { color: 0x2c5a40, key: 'skirt-forest' });
    const addSkirt = (mat, cx, cz, sw, sh) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), mat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(cx, -0.02, cz);
      this.root.add(m);
      this.groundParts.push(m);
    };
    addSkirt(sea, w / 2, h + 20, w + 80, 40);
    addSkirt(forest, w / 2, -20, w + 80, 40);
    addSkirt(forest, -20, 45, 40, 90);
    addSkirt(forest, w + 20, 45, 40, 90);
    addSkirt(sea, -20, 110, 40, 40);
    addSkirt(sea, w + 20, 110, 40, 40);

    // animated water (GPU)
    const info = new THREE.DataTexture(terr.waterInfo, terr.PW, terr.PH, THREE.RGFormat, THREE.UnsignedByteType);
    info.magFilter = info.minFilter = THREE.NearestFilter;
    info.generateMipmaps = false;
    info.needsUpdate = true;
    this.waterMat = new THREE.ShaderMaterial({
      uniforms: { tInfo: { value: info }, uTime: { value: 0 }, uSize: { value: new THREE.Vector2(terr.PW, terr.PH) }, uTint: { value: new THREE.Color(1, 1, 1) } },
      vertexShader: WATER_VERT, fragmentShader: WATER_FRAG, transparent: true, depthWrite: false,
    });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(w, h), this.waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(w / 2, 0.004, h / 2);
    water.renderOrder = 1;
    this.root.add(water);
    this.groundParts.push(water);
    terr.waterInfo = null;

    // buildings
    for (const b of map.buildings) {
      const res = buildBuilding(r3d, b);
      this.root.add(res.group);
      this.buildings[b.id] = { ...res, def: b };
      if (res.lamp) this.lighthouseLamp = res;
      if (res.spinner) this.spinners.push(res.spinner);
      this.chimneys.push(...res.chimneys);
      this.colliders.push({ rect: [b.x, b.y, b.w, b.h], building: b.id });
      res.group.traverse((o) => { if (o.userData.flag || o.userData.swing) this.anims.push(o); });
    }
    onProgress(0.88);

    // trees, bushes & rocks
    const trees = buildTrees(r3d, map.objects);
    this.root.add(trees.group);
    this.colliders.push(...trees.colliders);
    const br = buildBushesRocks(r3d, map.objects);
    this.root.add(br.group);
    this.colliders.push(...br.colliders);
    this.berryBushes = br.berryBushes;
    onProgress(0.94);

    // props
    const SKIP = ['oak', 'pine', 'cherry', 'apple', 'palm', 'bigtree', 'bush', 'rock', 'bridge', 'peach', 'lavender', 'wheat', 'maple', 'snowpine', 'reeds', 'lilypad'];
    for (const o of map.objects) {
      if (SKIP.includes(o.type)) continue;
      const p = buildProp(r3d, o);
      if (!p) continue;
      this.root.add(p.obj);
      this.colliders.push(...p.colliders);
      if (p.anim) this.anims.push({ obj: p.obj, kind: p.anim, base: p.obj.position.y, phase: o.x, part: p.animPart });
      if (p.fountain) this.fountain = p.fountain;
      if (p.interact) this.interactables.push({ ...p.interact, x: o.x, z: o.y, obj: p.obj, prop: p });
      if (p.flag) this.mailFlag = p.flag;
      if (p.ferry) { this.ferry = p; p.home = { x: o.x, z: o.y }; }
      if (p.fire) { this.fires.push(...p.fire); (this.firePos = this.firePos || []).push({ x: o.x, z: o.y }); }
      if (p.glows) for (const gm of p.glows) if (!this.glowcaps.includes(gm)) this.glowcaps.push(gm);
      if (p.bees) this.hives.push({ x: o.x, z: o.y });
      if (p.splash) this.waterfall = p.splash;
      for (const l of p.lights) if (l.flicker) this.flickerLights.push(l);
      this.props.push(p);
    }

    // batched lavender rows & wheat fields
    const lav = map.objects.filter((o) => o.type === 'lavender');
    this.root.add(buildLavender(r3d, lav));
    for (let i = 0; i < lav.length; i += 2) this.colliders.push({ x: lav[i].x, z: lav[i].y, r: 0.42 });
    this.root.add(buildWheat(r3d, map.objects.filter((o) => o.type === 'wheat')));
    this.root.add(buildReeds(r3d, map.objects.filter((o) => o.type === 'reeds')));
    this.root.add(buildLilypads(r3d, map.objects.filter((o) => o.type === 'lilypad')));
    this.leafpiles = this.props.filter((p) => p.leafpile).map((p) => ({ x: p.obj.position.x, z: p.obj.position.z, obj: p.obj, t: 0 }));

    // piers & docks (from plank tiles)
    this.root.add(buildPier(r3d, findPlankRects(map)));

    // east bridge
    this.bridgeSpan = findBridgeSpan(map);
    this.setBridge(false);

    this.r3d.scene.add(this.root);
    onProgress(1);
    return this;
  }

  // add a prop after the world was built (town projects)
  addProp(o) {
    const p = buildProp(this.r3d, o);
    if (!p) return null;
    this.root.add(p.obj);
    this.colliders.push(...p.colliders);
    if (p.anim) this.anims.push({ obj: p.obj, kind: p.anim, base: p.obj.position.y, phase: o.x, part: p.animPart });
    if (p.interact) this.interactables.push({ ...p.interact, x: o.x, z: o.y, obj: p.obj, prop: p });
    if (p.fire) { this.fires.push(...p.fire); (this.firePos = this.firePos || []).push({ x: o.x, z: o.y }); }
    for (const l of p.lights) if (l.flicker) this.flickerLights.push(l);
    this.props.push(p);
    return p;
  }

  setBridge(fixed) {
    if (this.bridgeObj) this.root.remove(this.bridgeObj);
    const s = this.bridgeSpan;
    this.bridgeObj = buildBridge(this.r3d, s.x0 - 0.4, s.z0, s.len + 0.8, !fixed);
    this.root.add(this.bridgeObj);
    this.bridgeFixed = fixed;
  }

  update(dt, t, tint) {
    const u = this.waterMat.uniforms;
    u.uTime.value = t;
    if (tint) u.uTint.value.copy(tint);
    for (let i = 0; i < this.fires.length; i++) {
      const f = this.fires[i];
      f.scale.y = 0.82 + Math.sin(t * 13 + i) * 0.1 + Math.sin(t * 7.7 + i * 2) * 0.08;
      f.scale.x = f.scale.z = 0.95 + Math.sin(t * 9 + i) * 0.05;
      f.rotation.y = t * 0.8;
    }
    for (const l of this.flickerLights) l.power = (l.basePower || (l.basePower = l.power)) * (0.82 + Math.sin(t * 13) * 0.1 + Math.sin(t * 7.3) * 0.08);
    for (const a of this.anims) {
      if (a.kind === 'bob') a.obj.position.y = a.base + Math.sin(t * 2 + a.phase) * 0.04;
      else if (a.kind === 'sway' && a.part) a.part.rotation.z = Math.sin(t * 1.4 + a.phase) * 0.05;
      else if (a.kind === 'swing' && a.part) a.part.forEach((sw, i) => { sw.rotation.x = Math.sin(t * 1.9 + i * 2.1) * (0.12 + 0.1 * Math.sin(t * 0.3 + i)); });
      else if (a.kind === 'fall' && a.part) { a.part.material.map.offset.y = -((t * 1.6) % 1); }
      else if (a.userData && a.userData.flag) a.rotation.y = Math.sin(t * 3) * 0.25;
      else if (a.userData && a.userData.swing) a.rotation.x = Math.sin(t * 1.3) * 0.06;
    }
    for (const s of this.spinners) s.rotation.z -= dt * this.millSpeed;
  }
}

function findPlankRects(map) {
  const { w, h, ground } = map;
  const seen = new Uint8Array(w * h);
  const rects = [];
  const skip = map.noPier || new Set();
  const isP = (x, y) => x >= 0 && y >= 0 && x < w && y < h && (ground[y * w + x] === TT.PLANK_H || ground[y * w + x] === TT.PLANK_V) && !skip.has(x + ',' + y);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!isP(x, y) || seen[y * w + x]) continue;
    let rw = 0;
    while (isP(x + rw, y) && !seen[y * w + x + rw]) rw++;
    let rh = 0;
    outer: while (y + rh < h) {
      for (let i = 0; i < rw; i++) if (!isP(x + i, y + rh) || seen[(y + rh) * w + x + i]) break outer;
      rh++;
    }
    for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) seen[(y + j) * w + x + i] = 1;
    rects.push([x, y, rw, rh]);
  }
  return rects;
}

function findBridgeSpan(map) {
  const { w, ground } = map;
  const row = 29 + OZ;
  let x0 = -1, x1 = -1;
  for (let x = 60 + OX; x < 80 + OX; x++) {
    if (ground[row * w + x] === TT.WATER) { if (x0 < 0) x0 = x; x1 = x; }
  }
  return { x0, z0: row, len: x1 - x0 + 1, tiles: [...Array(x1 - x0 + 1)].map((_, i) => x0 + i) };
}
