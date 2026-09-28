// The Sky Lantern on the village plaza: a paper lantern on a wooden frame
// with five charm hooks. It lights up as Star Charms come home and floats
// off into the night at the end of the Starfall Festival.

import { THREE, toon } from '../render/r3d.js';

export class SkyLantern {
  constructor(party, at, charms) {
    this.party = party;
    this.at = at;
    const r3d = party.r3d, w = party.world;
    const g = new THREE.Group();
    g.position.set(at.x, 0, at.z);
    const m = (c, e, k) => toon(r3d, { color: c, emissive: e || 0x000000, emissiveIntensity: e ? 1 : 1, key: 'skyl' + k });
    const B = (wd, h, d, mat, x, y, z, parent = g) => { const b = new THREE.Mesh(new THREE.BoxGeometry(wd, h, d), mat); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; parent.add(b); return b; };
    const wood = m(0x8e5d3e, 0, 'w'), woodL = m(0xb07b50, 0, 'wl'), rope = m(0xe8d6b4, 0, 'r');
    B(2.2, 0.18, 1.4, m(0x9d98a3, 0, 's'), 0, 0.09, 0);
    for (const x of [-0.95, 0.95]) B(0.14, 3.5, 0.14, wood, x, 1.8, 0);
    B(2.1, 0.14, 0.18, woodL, 0, 3.5, 0);
    const lamp = new THREE.Group();
    lamp.position.set(0, 2.25, 0);
    g.add(lamp);
    this.paper = new THREE.MeshToonMaterial({ color: 0xfff1d0, emissive: 0xffb860, emissiveIntensity: 0.25, gradientMap: r3d.gradient });
    B(0.95, 1.15, 0.95, this.paper, 0, 0, 0, lamp);
    for (const [x, z] of [[-0.48, -0.48], [0.48, -0.48], [-0.48, 0.48], [0.48, 0.48]]) B(0.06, 1.2, 0.06, m(0xc8454f, 0, 'rib'), x, 0, z, lamp);
    B(1.05, 0.08, 1.05, m(0xc8454f, 0, 'rib'), 0, 0.6, 0, lamp);
    B(1.05, 0.08, 1.05, m(0xc8454f, 0, 'rib'), 0, -0.6, 0, lamp);
    B(0.04, 0.7, 0.04, rope, 0, 0.95, 0, lamp);
    // five charm hooks around the bottom rim
    this.charms = [];
    const star = new THREE.OctahedronGeometry(0.13, 0);
    charms.forEach((ch, i) => {
      const a = (i / charms.length) * Math.PI * 2 + 0.3;
      B(0.02, 0.28, 0.02, rope, Math.cos(a) * 0.46, -0.78, Math.sin(a) * 0.46, lamp);
      const s = new THREE.Mesh(star, new THREE.MeshToonMaterial({ color: 0x6a6178, gradientMap: r3d.gradient }));
      s.scale.set(1, 1.2, 0.5);
      s.position.set(Math.cos(a) * 0.46, -0.98, Math.sin(a) * 0.46);
      lamp.add(s);
      this.charms.push({ mesh: s, color: ch.color, id: ch.id, dark: s.material });
    });
    this.lamp = lamp;
    this.root = g;
    w.over.root.add(g);
    this.col = { rect: [at.x - 1.1, at.z - 0.7, 2.2, 1.4] };
    w.overCol.add(this.col);
    this.rising = null;
    this.lit = 0;
  }

  lightCharm(id) {
    const c = this.charms.find((x) => x.id === id);
    if (!c || c.on) return;
    c.on = true;
    this.lit++;
    c.mesh.material = new THREE.MeshToonMaterial({ color: c.color, emissive: c.color, emissiveIntensity: 0.8, gradientMap: this.party.r3d.gradient });
    this.paper.emissiveIntensity = 0.25 + this.lit * 0.15;
  }

  reset() {
    for (const c of this.charms) { c.on = false; c.mesh.material = c.dark; }
    this.lit = 0;
    this.paper.emissiveIntensity = 0.25;
    this.rising = null;
    this.lamp.position.y = 2.25;
    this.lamp.visible = true;
  }

  rise() { this.rising = { t: 0 }; }

  update(dt) {
    const P = this.party;
    this.lamp.rotation.z = Math.sin(P.t * 0.9) * 0.04;
    if (this.rising) {
      this.rising.t += dt;
      this.lamp.position.y = 2.25 + this.rising.t * this.rising.t * 0.35;
      this.paper.emissiveIntensity = 1.1;
      if (Math.random() < dt * 6) P.world.fx.emit('sparkle', this.at.x, this.lamp.position.y - 0.6, this.at.z, 1, { color: '#ffd66b' });
      if (this.lamp.position.y > 40) this.lamp.visible = false;
    }
  }

  dispose() {
    this.party.world.over.root.remove(this.root);
    this.party.world.overCol.remove(this.col);
  }
}
