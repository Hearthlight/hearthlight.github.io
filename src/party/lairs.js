// Boss lairs. Five of the wild zones hide something huge by one of their
// landmarks: the Sand Queen under the worm bones, the Frost Colossus by the
// ice arch, the Frog King on his throne, the Magma Golem at the forge gate,
// the Tyrant King in his nest on Dino Isle. And five world bosses (World v7,
// `world: true`, combat/v7/world.js), bigger still, at a spot of their own
// (`at`): Old Thunderhoof on the steppe, the Paper Tiger on the Jade Terraces,
// the Moonmoth over Elderbough, the Crystal Behemoth at Prism Springs, the
// Aurora Wyrm under the tundra's snow — a world banner, three chests.
// Walk up to the glowing sigil and it wakes (boss music, a big banner, a
// health bar with its three phases). Run far enough and it sulks back home,
// healed. Beat it: a golden sigil, two chests, XP all round — and a while
// later it'll be back for a rematch (Release v9: a quarter of an hour of real
// time, remembered in the save — a reload doesn't keep it beaten for ever).
// And (Release v9) a sixth world boss out at sea, fought from boats: Grandmother
// Kraken (`sea: true`, combat/v9/grandma.js) — no chests on the waves: her hat
// and her treasure go straight to whoever sets her free.

import { THREE, toon } from '../render/r3d.js';
import { ENEMIES } from '../combat/enemies.js';
import { TT } from '../world/tiles.js';
import { audio } from '../engine/audio.js';
import { t } from '../i18n.js';
import { drawMarks } from './mapmarks.js';
import { zoneLevels, killXp } from '../saga/levels.js';
import { ZONES } from '../world/big/layout.js';
import { TREASURE_HATS } from '../data/looks.js';

const ZONE_NAMES = Object.fromEntries(ZONES.map((z) => [z.id, z.name]));

const STIR = 17, WAKE = 10, FLEE = 26, REMATCH = 900;   // (seconds of real time before a rematch)

export const LAIRS = [
  { boss: 'sandqueen', poi: 'worm_bones', zone: 'dunes', color: 0xe0b060, freed: 'The Sand Queen sinks back to sleep, calm at last!' },
  { boss: 'colossus', poi: 'ice_arch', zone: 'glacier', color: 0x9fdcff, freed: 'The Frost Colossus melts into a gentle snowman!' },
  { boss: 'frogking', poi: 'frog_throne', zone: 'marsh', color: 0x8fdc5a, freed: 'The Frog King is free of the gloom — long live the King!' },
  { boss: 'golem', poi: 'forge_gate', zone: 'volcano', color: 0xff8a3a, freed: 'The Magma Golem cools down and dozes off!' },
  { boss: 'rex', poi: 'rex_nest', zone: 'dino', color: 0xf2c14e, freed: 'The Tyrant King bows his great head — and stomps off into the ferns!' },
  // (World v7) the world bosses
  { boss: 'thunderhoof', at: [-96, 90], zone: 'steppe', color: 0xc8a878, world: true, freed: 'Old Thunderhoof shakes off the gloom and ambles away, grazing.' },
  { boss: 'papertiger', at: [793, -40], zone: 'jade', color: 0xf08a3a, world: true, freed: 'The Paper Tiger unfolds into a hundred paper cranes, and they fly home.' },
  { boss: 'moonmoth', at: [1000, 47], zone: 'elder', color: 0xe0e8ff, world: true, freed: 'The Moonmoth drifts up to the moon, pale and peaceful.' },
  { boss: 'behemoth', at: [1310, 236], zone: 'prism', color: 0xff9ad8, world: true, freed: 'The Crystal Behemoth settles into the springs and hums, clear as a bell.' },
  { boss: 'aurorawyrm', at: [1120, -128], zone: 'tundra', color: 0x6aff9a, world: true, freed: 'The Aurora Wyrm dives into the snow — and the sky lights up green above it.' },
  // (Release v9) out on the Wide Sea, fought from boats
  { boss: 'grandmakraken', at: [652, 98], zone: 'wide', color: 0x9fdcff, world: true, sea: true, hat: 'bobblehat', freed: 'Grandmother Kraken takes off her monocle, dabs her eye with her scarf, and sinks back into the deep, humming.' },
];

export class Lairs {
  constructor(party) {
    this.party = party;
    this.root = new THREE.Group();
    this.root.name = 'lairs';
    party.world.over.root.add(this.root);
    // (saved as { boss: when it was beaten, in real time }; an older save listed names only)
    const saved = party.loadSave('lairs', {}), now = Date.now();
    const beaten = Array.isArray(saved) ? Object.fromEntries(saved.map((b) => [b, now])) : saved || {};
    this.list = [];
    const B = party.big;
    if (!B) return;
    for (const L of LAIRS) {
      const poi = L.at ? { x: L.at[0], z: L.at[1] } : B.map.pois.find((p) => p.kind === L.poi);
      if (!poi) continue;
      const c = L.sea ? poi : this.spot(poi, L.at ? 0 : 5);
      const at = beaten[L.boss], back = at && now - at > REMATCH * 1000;
      this.list.push({ ...L, x: c.x, z: c.z, state: at && !back ? 'beaten' : 'idle', boss: null, sigil: null, seen: false, beatenAt: at && !back ? at : 0, awayT: 0, told: false, type: L.boss });
    }
    if (Array.isArray(saved) || Object.keys(beaten).some((b) => now - beaten[b] > REMATCH * 1000)) this.store();
  }

  // the nearest dry, open ground by the landmark (a spiral out from it)
  // (a spot given outright is taken as it is, if it’s open ground)
  spot(poi, r0 = 5) {
    const B = this.party.big;
    const dry = (x, z) => { const tt = B.tileAt(x, z); return tt !== TT.WATER && tt !== TT.CORAL && tt !== TT.LAVA && tt !== TT.SKY && !B.col.blocked(x, z, 0.5); };
    for (let r = r0; r <= 22; r += 1) {
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI * 2 + Math.PI / 2;           // south first: in front, for the camera
        const x = poi.x + Math.cos(a) * r, z = poi.z + Math.sin(a) * r;
        if (!dry(x, z)) continue;
        let ok = true;
        for (let q = 0; q < 12 && ok; q++) { const b = (q / 12) * Math.PI * 2; for (const rr of [1.5, 3]) if (!dry(x + Math.cos(b) * rr, z + Math.sin(b) * rr)) ok = false; }
        if (ok) return { x, z };
      }
    }
    return { x: poi.x, z: poi.z + 6 };
  }

  get fight() { return this.list.find((l) => l.state === 'fight') || null; }
  active() { const P = this.party; return P.exploring() && !!P.combat; }

  update(dt) {
    const P = this.party, C = P.combat, on = this.active();
    for (const L of this.list) {
      let d = 1e9;
      for (const p of P.players) if (p.connected) d = Math.min(d, Math.hypot(p.pos.x - L.x, p.pos.z - L.z));
      if (d < 40 && !L.sigil) this.build(L);
      if (L.sigil) { L.sigil.visible = d < 60; if (L.sigil.visible) this.animate(L, dt); }
      if (d < 30) L.seen = true;
      if (!on) { if (L.state === 'fight') this.retreat(L, true); continue; }
      if (L.state === 'idle') {
        if (d < STIR && !L.told) { L.told = true; P.toast(t('Something huge stirs nearby…'), '#ff9aa8'); audio.sfx('growl', { volume: 0.8, pitch: -8 }); P.cam.shake = Math.max(P.cam.shake || 0, 0.25); }
        if (d > STIR + 10) L.told = false;
        if (d < WAKE) this.wake(L);
      } else if (L.state === 'fight') {
        const e = L.boss;
        if (!e || !e.alive) { if (e && e.hp <= 0) this.victory(L); else this.retreat(L); continue; }
        if (d > FLEE) { L.awayT += dt; if (L.awayT > 5) this.retreat(L); } else L.awayT = 0;
      } else if (L.state === 'beaten' && L.beatenAt > 0 && Date.now() - L.beatenAt > REMATCH * 1000 && d > 40) {
        L.state = 'idle'; L.told = false;
        this.recolor(L);
      }
    }
  }

  // how strong the party is: a guardian meets it halfway (tougher for veterans)
  level() {
    const ps = this.party.players.filter((p) => p.connected && p.fighter);
    return ps.length ? ps.reduce((a, p) => a + p.fighter.level, 0) / ps.length : 1;
  }

  wake(L) {
    const P = this.party, C = P.combat;
    // (World v7: a guardian is its land's top level + 1, and grows with the heroes near it)
    const e = C.spawn(L.type, L.x, L.z, { level: zoneLevels(L.zone)[1] + 1 });
    e.home = { x: L.x, z: L.z };
    e.lair = L;
    L.boss = e; L.state = 'fight'; L.awayT = 0;
    const def = ENEMIES[L.type];
    P.showBanner(t(def.title), L.world ? t('World boss — {land}', { land: t(ZONE_NAMES[L.zone] || '') }) : t('A guardian of the wild, lost in the gloom'));
    if (L.world) P.toast(P.solo ? t('A world boss has woken! Mind its marks — and its temper.') : t('A world boss has woken! Call everyone — it grows with every hero who comes.'), '#ff9aa8');
    P.cam.shake = Math.max(P.cam.shake || 0, 0.7);
    audio.sfx('thunder', { volume: 0.9 });
    audio.sfx('growl', { volume: 0.9, pitch: -10 });
    for (let i = 0; i < 16; i++) P.world.fx.emit('smoke', L.x + (Math.random() - 0.5) * 4, 0.6, L.z + (Math.random() - 0.5) * 4, 1, { color: '#6a4a8e' });
  }

  // everyone ran off: it goes back to sleep, healed
  retreat(L, quiet = false) {
    const e = L.boss;
    if (e && e.alive) { e.alive = false; e.fading = 0; e.remove(); }
    L.boss = null; L.state = 'idle'; L.told = false;
    if (!quiet) this.party.toast(t('{boss} gives up and goes back to its lair…', { boss: t(ENEMIES[L.type].title) }), '#b9a2e3');
  }

  victory(L) {
    const P = this.party, C = P.combat;
    L.state = 'beaten'; L.beatenAt = Date.now(); L.boss = null;
    P.showBanner(t('{boss} is free!', { boss: t(ENEMIES[L.type].title) }), t(L.freed));
    audio.jingle('festival');
    for (let i = 0; i < 12; i++) P.world.fx.emit('firework', L.x + (Math.random() - 0.5) * 8, 3 + Math.random() * 3, L.z + (Math.random() - 0.5) * 6, 30, { color: ['#ffd66b', '#f59ac8', '#8fd6b4', '#9fd0f5'][i % 4] });
    if (L.sea) this.seaReward(L);
    else if (P.act && P.act.dropChest) { P.act.dropChest(L.x - 1, L.z + 0.5, { rich: true }); P.act.dropChest(L.x + 1, L.z + 0.5, { rich: true }); if (L.world) P.act.dropChest(L.x, L.z + 2, { rich: true, golden: true }); }
    const R = L.sea ? 40 : 30;     // (at sea the boats drift about)
    for (const p of P.players) if (p.fighter && C && Math.hypot(p.pos.x - L.x, p.pos.z - L.z) < R) { if (p.fighter.down) C.revive(p, 0.6, null); C.gainXp(p, Math.round(killXp(zoneLevels(L.zone)[1] + 1, p.fighter.level) * (L.world ? 6 : 4))); }
    if (P.act && P.act.stat) for (const p of P.players) if (Math.hypot(p.pos.x - L.x, p.pos.z - L.z) < 30) P.act.stat(p, 'bosses');
    this.recolor(L);
    this.store();
    if (this.onVictory) this.onVictory(L);
  }

  store() { this.party.writeSave('lairs', Object.fromEntries(this.list.filter((l) => l.state === 'beaten').map((l) => [l.type, l.beatenAt || Date.now()]))); }

  // (at sea) no chests bobbing on the waves: her hat and her treasure, straight to each hero
  seaReward(L) {
    const P = this.party, C = P.combat, hat = L.hat && TREASURE_HATS[L.hat] ? L.hat : null;
    for (const p of P.players) {
      if (!p.connected || Math.hypot(p.pos.x - L.x, p.pos.z - L.z) > 40) continue;
      if (hat && P.solo) { const s = P.world.state; if (s && s.unlocked && !s.unlocked.hat.includes(hat)) { s.unlocked.hat.push(hat); P.toast(t('You get: {hat} — try it on at your wardrobe', { hat: t(TREASURE_HATS[hat]) }), '#ffd66b'); } }
      else if (hat) { const prof = P.profileOf(p); if (!(prof.hats || []).includes(hat)) { prof.hats = Array.from(new Set([...(prof.hats || []), hat])); P.saveProfile(p); if (P.sendHats) P.sendHats(p); P.toast(t('{name} gets {hat}!', { name: p.name, hat: t(TREASURE_HATS[hat]) }), p.color); } }
      if (P.progress && P.progress.give) { P.progress.give(p, { rich: true }); P.progress.give(p, { rich: true }); }
    }
    if (C) for (let i = 0; i < 20; i++) C.drop('dust', L.x + (Math.random() - 0.5) * 6, L.z + (Math.random() - 0.5) * 6);
  }

  // ------------------------------------------------------------------ the sigil
  build(L) {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.4, 3.8, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x8a3aff, transparent: true, opacity: 0.55, depthWrite: false }));
    ring.position.y = 0.04; g.add(ring);
    const inner = new THREE.Mesh(new THREE.RingGeometry(1.6, 1.8, 6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x8a3aff, transparent: true, opacity: 0.45, depthWrite: false }));
    inner.position.y = 0.045; g.add(inner);
    const fill = new THREE.Mesh(new THREE.CircleGeometry(3.8, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x2a1640, transparent: true, opacity: 0.22, depthWrite: false }));
    fill.position.y = 0.035; g.add(fill);
    // four little stones with gloom flames round it
    const stones = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.4), toon(this.party.r3d, { color: 0x4a3a5a, key: 'lair-stone' }));
      s.position.set(Math.cos(a) * 4.3, 0.4, Math.sin(a) * 4.3); s.castShadow = true; g.add(s);
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.22), toon(this.party.r3d, { color: 0xb86aff, emissive: 0x8a3aff, key: 'lair-flame' }));
      f.position.set(Math.cos(a) * 4.3, 0.95, Math.sin(a) * 4.3); g.add(f);
      stones.push(f);
    }
    g.position.set(L.x, this.party.big.groundY({ x: L.x, z: L.z }), L.z);
    this.root.add(g);
    L.sigil = g; L.parts = { ring, inner, fill, flames: stones };
    this.recolor(L);
  }

  recolor(L) {
    const P = L.parts;
    if (!P) return;
    const beaten = L.state === 'beaten';
    const col = beaten ? 0xffd66b : L.color;
    P.ring.material.color.setHex(beaten ? 0xffd66b : 0x8a3aff);
    P.inner.material.color.setHex(col);
    P.fill.material.color.setHex(beaten ? 0x6a5a2a : 0x2a1640);
    for (const f of P.flames) f.material = toon(this.party.r3d, { color: beaten ? 0xffb040 : 0xb86aff, emissive: beaten ? 0xff7a1a : 0x8a3aff, key: 'lair-flame' + beaten });
  }

  animate(L, dt) {
    const P = L.parts, time = this.party.t;
    P.inner.rotation.y += dt * 0.6;
    P.ring.material.opacity = 0.45 + Math.sin(time * 2) * 0.12;
    for (const [i, f] of P.flames.entries()) f.scale.y = 1 + Math.sin(time * 12 + i) * 0.25;
    if (L.state !== 'beaten' && Math.random() < dt * 3) this.party.world.fx.emit('smoke', L.x + (Math.random() - 0.5) * 6, 0.3, L.z + (Math.random() - 0.5) * 6, 1, { color: '#6a4a8e' });
  }

  // skulls on the world map (a golden crown once beaten)
  // on the part of the world map someone has explored (so it stays there between sessions)
  revealed(o) { const WM = this.party.big && this.party.big.worldMap; return !!(WM && WM.revealed(o.x, o.z)); }

  mapMarks(out = []) {
    for (const L of this.list) if (L.seen || L.state === 'beaten' || this.revealed(L)) out.push({ k: 'lair', x: L.x, z: L.z, on: L.state === 'beaten', name: t(ENEMIES[L.type].title), st: L.state === 'beaten' ? t('Freed') : L.world ? t('World boss') : t('Boss lair') });
    return out;
  }
  drawMapMarks(ctx, M) { drawMarks(ctx, M, this.mapMarks(), this.party.t); }

  dispose() {
    for (const L of this.list) if (L.state === 'fight') this.retreat(L, true);
    this.party.world.over.root.remove(this.root);
  }
}

export { lairIcon } from './mapmarks.js';
