// Treasure chests that tumble out of the sky (or pop out of the ground) when
// a nest, a camp, a guardian or a secret gives way. Shared by Party Mode's
// Explore act and the solo game's wild lands: each passes its own `onOpen`
// (what's inside: relics, gear, stardust, coins…).

import { THREE, toon } from '../render/r3d.js';
import { drawText } from '../engine/font.js';
import { audio } from '../engine/audio.js';
import { t } from '../i18n.js';

const rand = (a, b) => a + Math.random() * (b - a);

export class Chests {
  constructor(party, root, onOpen) {
    this.party = party;
    this.root = root;
    this.onOpen = onOpen;          // (chest, player)
    this.list = [];
  }

  get world() { return this.party.world; }

  // (golden: a secret's chest, all gold and extra stardust; pop: it jumps out of the ground)
  drop(x, z, { rich = false, golden = false, pop = false, floor = 0, mimic = false } = {}) {
    const r3d = this.party.r3d;
    const g = new THREE.Group();
    const gold = toon(r3d, { color: 0xf2c14e, emissive: 0x6a4a10, emissiveIntensity: 1, key: 'chest-gold' });
    const wood = golden ? toon(r3d, { color: 0xd89a2a, emissive: 0x4a3008, emissiveIntensity: 1, key: 'chest-golddeep' }) : toon(r3d, { color: 0x9a6440, key: 'chest-wood' });
    const dark = golden ? toon(r3d, { color: 0xa8742a, key: 'chest-goldrim' }) : toon(r3d, { color: 0x6b4330, key: 'chest-dark' });
    const B = (w, h, d, m, px, py, pz, parent = g) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(px, py, pz); b.castShadow = true; b.receiveShadow = true; parent.add(b); return b; };
    B(0.72, 0.4, 0.5, wood, 0, 0.2, 0);
    B(0.76, 0.06, 0.54, dark, 0, 0.03, 0);
    for (const sx of [-0.26, 0.26]) B(0.07, 0.42, 0.54, gold, sx, 0.21, 0);
    const lid = new THREE.Group();
    lid.position.set(0, 0.4, -0.25);
    B(0.74, 0.16, 0.52, wood, 0, 0.08, 0.25, lid);
    for (const sx of [-0.26, 0.26]) B(0.07, 0.18, 0.54, gold, sx, 0.08, 0.25, lid);
    B(0.12, 0.14, 0.05, gold, 0, 0.02, 0.52, lid);
    g.add(lid);
    const y = pop ? floor + 0.05 : 3;
    g.position.set(x, y, z);
    this.root.add(g);
    const c = { x, z, y, vy: pop ? 7.5 : 0, g, lid, landed: false, opened: false, t: 0, rich, golden, floor, mimic, twitch: 0 };
    this.list.push(c);
    if (pop) { this.world.fx.emit('dust', x, 0.1, z, 10); this.world.fx.emit('sparkle', x, 0.6, z, 16, { color: '#ffd66b' }); audio.sfx('boing', { volume: 0.6 }); }
    return c;
  }

  update(dt) {
    const w = this.world;
    for (const c of this.list) {
      c.t += dt;
      if (!c.landed) {
        c.vy -= 20 * dt; c.y += c.vy * dt;
        if (c.y <= c.floor) {
          c.y = c.floor;
          if (c.vy < -4) { c.vy = -c.vy * 0.3; w.fx.emit('dust', c.x, 0.1, c.z, 8); audio.sfx('land', { volume: 0.7 }); }
          else { c.vy = 0; c.landed = true; }
        }
      } else if (!c.opened && Math.random() < dt * (c.golden ? 6 : c.mimic ? 0.4 : 2)) w.fx.emit('sparkle', c.x + rand(-0.4, 0.4), c.golden ? rand(0.3, 1.2) : 0.6, c.z + rand(-0.3, 0.3), 1, { color: '#ffd66b' });
      // (a mimic can't keep quite still: it twitches, its lid lifts a crack)
      if (c.mimic && c.landed && !c.opened) {
        if (c.twitch > 0) c.twitch -= dt; else if (Math.random() < dt * 0.3) c.twitch = 0.4;
        c.lid.rotation.x = c.twitch > 0 ? -0.18 + Math.sin(c.twitch * 40) * 0.05 : 0;
      }
      if (c.opened) {
        c.openT += dt;
        c.lid.rotation.x = -Math.min(1.9, c.openT * 6);
        if (c.openT > 9) { const k = Math.max(0, 1 - (c.openT - 9) / 0.6); c.g.scale.setScalar(Math.max(0.01, k)); if (k <= 0) { this.root.remove(c.g); c.gone = true; } }
      }
      c.g.position.set(c.x, c.y, c.z);
      c.g.rotation.y = Math.sin(c.t * 0.5) * 0.05;
      c.g.rotation.z = c.twitch > 0 ? Math.sin(c.twitch * 50) * 0.06 : 0;
    }
    this.list = this.list.filter((c) => !c.gone);
  }

  // a closed, landed chest within reach of a player
  near(p, r = 1.5) {
    for (const c of this.list) if (!c.opened && c.landed && Math.hypot(c.x - p.pos.x, c.z - p.pos.z) < r) return c;
    return null;
  }

  open(c, p) {
    const w = this.world;
    if (c.mimic && this.party.combat) { this.bite(c, p); return; }
    c.opened = true; c.openT = 0;
    audio.sfx('unlock', { volume: 0.8 });
    audio.jingle('purchase');
    w.fx.emit('flash', c.x, 0.7, c.z, 1, { color: '#ffd66b' });
    w.fx.emit('firework', c.x, 0.8, c.z, 24, { color: '#ffd66b' });
    if (this.onOpen) this.onOpen(c, p);
  }

  // it was never a chest at all: a mimic springs out (beat it: it coughs up a rich chest)
  bite(c, p) {
    const P = this.party, C = P.combat;
    c.opened = true; c.gone = true;
    this.root.remove(c.g);
    const e = C.spawn('mimic', c.x, c.z, { quiet: true });
    e.spawnT = 0;
    e.faceTo(p.pos.x, p.pos.z);
    e.onDeath = () => { this.drop(e.x, e.z, { rich: true, pop: true }); this.world.fx.emit('sparkle', e.x, 0.8, e.z, 20, { color: '#ffd66b' }); };
    C.bubble(e, t('CHOMP!'), 1.2);
    P.toast(t('It’s a mimic!'), '#ff9aa8');
    audio.sfx('snap'); audio.sfx('growl', { volume: 0.7 });
    P.cam.shake = Math.max(P.cam.shake || 0, 0.35);
  }

  // an "A" bobbing over the chests someone could open
  drawPrompts(ctx, v, key = 'A') {
    const P = this.party;
    for (const c of this.list) {
      if (c.opened || !c.landed) continue;
      if (!P.players.some((p) => p.connected && Math.hypot(p.pos.x - c.x, p.pos.z - c.z) < 4)) continue;
      const u = P.toUi(v, c.x, 1.1, c.z);
      const bob = Math.round(Math.sin(P.t * 5) * 1.5);
      ctx.fillStyle = '#3b2a2e'; ctx.fillRect(Math.round(u.x) - 5, Math.round(u.y) - 12 + bob, 11, 11);
      ctx.fillStyle = '#4f955a'; ctx.fillRect(Math.round(u.x) - 4, Math.round(u.y) - 11 + bob, 9, 9);
      drawText(ctx, key, u.x + 1, u.y - 10 + bob, { color: '#fff7e6', align: 'center' });
    }
  }

  dispose() { for (const c of this.list) this.root.remove(c.g); this.list = []; }
}
