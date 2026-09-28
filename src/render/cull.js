// Split views: before each view is drawn, whatever can't be seen in it — nor cast a shadow
// into it — is hidden, so the renderer doesn't walk the whole world eight times over.
// Items are the scene's children, one level down wherever a group spreads wide (the valley's
// root, the streamed chunks, the landmarks, the mounts…). Each keeps a box relative to its own
// position, refreshed a few at a time: a walking hero carries theirs along.

import { THREE } from './r3d.js';

const WIDE = 80;          // a group wider than this is split into its children
const MARGIN = 5;         // (tiles) around a view: things that moved since their box was taken
const REFRESH = 15;       // every item's box is taken again within this many frames
const _b = new THREE.Box3(), _p = new THREE.Vector3();

export class ViewCull {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.frame = 0;
    this.hidden = [];
  }

  box(o) {
    let c = o.userData.cull;
    // (the first box is dated back a little at random, so the refreshes spread over the frames)
    if (!c) c = o.userData.cull = { min: new THREE.Vector3(), max: new THREE.Vector3(), t: this.frame - Math.floor(Math.random() * REFRESH), wide: false, empty: false };
    else c.t = this.frame;
    _b.setFromObject(o);
    c.empty = _b.isEmpty();
    if (c.empty) return c;
    c.wide = _b.max.x - _b.min.x > WIDE || _b.max.z - _b.min.z > WIDE;
    _p.setFromMatrixPosition(o.matrixWorld);
    c.min.copy(_b.min).sub(_p); c.max.copy(_b.max).sub(_p);
    return c;
  }

  // (once a frame, before the views) the list of items, and a few boxes taken again
  begin() {
    this.frame++;
    const out = this.items; out.length = 0;
    const walk = (o, depth) => {
      for (const ch of o.children) {
        if (!ch.visible || ch.isLight || ch.isCamera || ch.frustumCulled === false) continue;
        const u = ch.userData.cull;
        // (a wide group stays wide: its box, the whole world's, is taken again only now and then)
        const c = u && this.frame - u.t < (u.wide ? REFRESH * 20 : REFRESH) ? u : this.box(ch);
        if (c.empty) continue;
        if (c.wide && depth < 3 && ch.children.length) walk(ch, depth + 1);
        else if (!c.wide) out.push(ch);
      }
    };
    walk(this.scene, 0);
  }

  // hide what view v can't see (ppu: its pixels per tile; sun: the direction to the sun)
  apply(v, ppu, sun) {
    this.restore();
    const HW = v.rect.w / 2 / ppu + MARGIN, HH = v.rect.h / 2 / ppu + MARGIN, cx = v.cx, cz = v.cz;
    const sy = Math.max(0.2, sun.y), kx = sun.x / sy, kz = sun.z / sy;
    for (const o of this.items) {
      const c = o.userData.cull, e = o.matrixWorld.elements, px = e[12], py = e[13], pz = e[14];
      const x0 = c.min.x + px, x1 = c.max.x + px, y0 = c.min.y + py, y1 = c.max.y + py, z0 = c.min.z + pz, z1 = c.max.z + pz;
      // seen: the box's footprint on screen (the camera looks north, 45° down: up the screen is z − y)
      if (x1 >= cx - HW && x0 <= cx + HW && z0 - y1 <= cz + HH && z1 - y0 >= cz - HH) continue;
      // its shadow on the ground, reaching into the view (or onto something tall just south of it)
      const H = Math.min(Math.max(0, y1), 12);
      const sx0 = x0 - Math.max(0, kx) * H, sx1 = x1 - Math.min(0, kx) * H, sz0 = z0 - Math.max(0, kz) * H, sz1 = z1 - Math.min(0, kz) * H;
      if (sx1 >= cx - HW && sx0 <= cx + HW && sz0 <= cz + HH + 8 && sz1 >= cz - HH) continue;
      o.visible = false;
      this.hidden.push(o);
    }
  }

  restore() {
    for (const o of this.hidden) o.visible = true;
    this.hidden.length = 0;
  }
}
