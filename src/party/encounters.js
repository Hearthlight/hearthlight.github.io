// Gloom camps. Out in the big world every zone has a couple of camps —
// ragged purple tents round a gloom fire — guarded by that zone’s creatures
// (a totem shielding them now and then, an elite once the party is strong,
// the zone’s big one later on). Sneak up, wake them, beat them: the fire
// turns warm again, flowers pop up and a chest tumbles out of the sky.
// Camps come back a few minutes after everyone has left.

import { THREE, toon } from '../render/r3d.js';
import { ZONE_FOES, ZONE_BIG, NEW_ENEMIES, makeElite } from '../combat/v3/bestiary.js';
import { ARENA_SITE, ZONES } from '../world/big/layout.js';
import { HERDS as DINO_HERDS } from './dinos.js';
import { TT } from '../world/tiles.js';
import { audio } from '../engine/audio.js';
import { t } from '../i18n.js';
import { drawMarks } from './mapmarks.js';
import { levelAt, rollLevel, killXp } from '../saga/levels.js';

const ZNAME = Object.fromEntries(ZONES.map((z) => [z.id, z.name]));
// (at night, bats come down from the trees & the cliffs to join these zones’ camps)
const NIGHT_BATS = new Set(['deepwood', 'bouncecap', 'canyon', 'marsh']);
// (and gloom jellyfish rise from the warm seas when someone walks these shores)
const WARM = new Set(['lagoon', 'sunken', 'dino', 'sea']);
const WAKE = 8, SPAWN = 32, DESPAWN = 48, RESPAWN = 240;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let q = Math.imul(a ^ (a >>> 15), 1 | a); q = (q + Math.imul(q ^ (q >>> 7), 61 | q)) ^ q; return ((q ^ (q >>> 14)) >>> 0) / 4294967296; }; }


// distance from (x, z) to the segment a–b
const segDist = (x, z, [ax, az], [bx, bz]) => { const dx = bx - ax, dz = bz - az, k = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - ax - dx * k, z - az - dz * k); };
export class Encounters {
  constructor(party) {
    this.party = party;
    this.root = new THREE.Group();
    this.root.name = 'gloom-camps';
    party.world.over.root.add(this.root);
    this.camps = [];
    this.cleared = new Set();
    this.cleared = new Set(party.loadSave('camps', []));
    this.bloomT = 20; this.bloom = [];
    this.place();
  }

  get big() { return this.party.big; }

  // two camps per zone, in open ground, away from herds, landmarks & the Festival Ring
  place() {
    const B = this.big;
    if (!B) return;
    const m = B.map, r = mulberry(m.seed + 4242), A = ARENA_SITE;
    const herds = this.party.mounts ? this.party.mounts.wild.map((w) => w.herd) : [];
    for (const zone of Object.keys(ZONE_FOES)) {
      let made = 0;
      const tryAt = (x, z) => {
        if (m.inValley(Math.floor(x), Math.floor(z))) return;
        const zz = B.zoneAt(x, z);
        if (!zz || zz.id !== zone) return;
        if (((x - A.x) / (A.rx + 12)) ** 2 + ((z - A.z) / (A.rz + 12)) ** 2 < 1) return;
        if (!this.open(x, z)) return;
        if (this.camps.some((c) => Math.hypot(c.x - x, c.z - z) < (zone === 'dino' ? 24 : 40))) return;
        if (herds.some((h) => Math.hypot(h.x - x, h.z - z) < (zone === 'dino' ? 8 : 14))) return;     // (Dino Isle is small & crowded)
        if (zone === 'dino' && DINO_HERDS.some((h) => Math.hypot(h.x - x, h.z - z) < h.roam + 8)) return;   // (the gentle giants graze away from the gloom)
        if (m.pois.some((p) => Math.hypot(p.x - x, p.z - z) < (p.kind === 'rex_nest' ? 20 : 9))) return;
        if ((m.sledRuns || []).some((run) => run.pts.some((q, i) => i && segDist(x, z, run.pts[i - 1], q) < 14))) return;     // (the sled runs stay clear)
        const id = zone + ':' + made;
        // (each camp keeps its level, somewhere in its land’s range)
        const level = rollLevel(ZONES.find((q) => q.id === zone).lv || [1, 5], ((made * 0.618 + zone.length * 0.137 + x * 0.013) % 1 + 1) % 1);
        this.camps.push({ id, zone, x, z, level, state: this.cleared.has(id) ? 'cleared' : 'idle', foes: [], props: null, seen: false, clearedAt: -1e9 });
        made++;
      };
      for (let k = 0; k < 3000 && made < 2; k++) tryAt(Math.floor(m.X0 + r() * m.W) + 0.5, Math.floor(m.Z0 + r() * m.H) + 0.5);
      // (a small zone — an island — the map-wide draw can miss: look around its seeds)
      const S = ZONES.find((q) => q.id === zone).seeds;
      for (let k = 0; k < 2000 && made < 2 && S && S.length; k++) { const s = S[k % S.length]; tryAt(Math.floor(s[0] + (r() - 0.5) * 60) + 0.5, Math.floor(s[1] + (r() - 0.5) * 44) + 0.5); }
    }
  }

  // a 7-tile clearing of walkable ground (no water, no trees)
  open(x, z) {
    const B = this.big;
    for (let dz = -3; dz <= 3; dz += 1.5) for (let dx = -3; dx <= 3; dx += 1.5) {
      const tt = B.tileAt(x + dx, z + dz);
      if (tt === TT.WATER || tt === TT.CORAL || tt === TT.LAVA || tt === TT.SKY || tt === TT.CREVASSE || tt === TT.ARENA || tt === TT.TAR) return false;
      if (B.col.blocked(x + dx, z + dz, 0.4)) return false;
    }
    return !(this.party.mounts && this.party.mounts.tallNear && this.party.mounts.tallNear(x, z, 4) > 1);
  }

  active() { const P = this.party; return P.exploring() && !!P.combat; }

  // a bloom of gloom jellyfish rises from the sea near someone walking a warm
  // shore (they float over the sand to meet you); they sink back if you leave
  blooms(dt, on) {
    const P = this.party, C = P.combat, B = this.big;
    this.bloom = this.bloom.filter((e) => e.alive);
    if (!on || !B) { for (const e of this.bloom) { e.alive = false; e.fading = 0; e.remove(); } this.bloom = []; return; }
    if (this.bloom.length) {
      if (!P.players.some((p) => p.connected && this.bloom.some((e) => Math.hypot(e.x - p.pos.x, e.z - p.pos.z) < 30))) { for (const e of this.bloom) { e.alive = false; e.fading = 0; e.remove(); } this.bloom = []; }
      return;
    }
    this.bloomT -= dt;
    if (this.bloomT > 0) return;
    this.bloomT = rand(8, 14);
    const shore = P.players.filter((p) => p.connected && p.fighter && !p.swimming && !p.vehicle && !p.indoors && B.tileAt(p.pos.x, p.pos.z) === TT.SAND && !B.inValley(p.pos.x, p.pos.z) && WARM.has((B.zoneAt(p.pos.x, p.pos.z) || {}).id));
    if (!shore.length || Math.random() > 0.35) return;
    const p = pick(shore);
    if (C.enemies.some((e) => e.alive && e.state !== 'sleep' && Math.hypot(e.x - p.pos.x, e.z - p.pos.z) < 18)) return;
    // the nearest open water, a few tiles off the beach
    let spot = null;
    for (let r = 3; r <= 7 && !spot; r++) for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2, x = p.pos.x + Math.cos(a) * r, z = p.pos.z + Math.sin(a) * r, tt = B.tileAt(x, z);
      if (tt === TT.WATER || tt === TT.CORAL) { spot = { x, z }; break; }
    }
    if (!spot) return;
    const n = Math.min(5, 2 + Math.floor(P.players.filter((q) => q.connected).length / 2));
    for (let i = 0; i < n; i++) {
      const e = C.spawn('jelly', spot.x + rand(-1.6, 1.6), spot.z + rand(-1.6, 1.6), { level: rollLevel(levelAt(B, p.pos.x, p.pos.z)) });
      this.bloom.push(e);
    }
    this.bloomT = rand(70, 110);
    P.toast(t('Gloom jellyfish rise from the sea!'), '#b88cf0');
    audio.sfx('blub', { volume: 0.7 });
  }

  // (World v7: camps keep their land’s level; the heroes near them make them bigger)
  level() {
    const ps = this.party.players.filter((p) => p.connected && p.fighter);
    return ps.length ? ps.reduce((a, p) => a + (p.fighter.eff || p.fighter.level), 0) / ps.length : 1;
  }

  update(dt) {
    const P = this.party, C = P.combat;
    const on = this.active();
    const now = P.t;
    this.blooms(dt, on);
    for (const c of this.camps) {
      let d = 1e9;
      for (const p of P.players) if (p.connected) d = Math.min(d, Math.hypot(p.pos.x - c.x, p.pos.z - c.z));
      if (d < SPAWN + 10 && !c.props) this.build(c);
      if (c.props) { c.props.visible = d < DESPAWN + 20; this.animate(c, dt, now); }
      if (d < 30) c.seen = true;
      if (!on) { if (c.foes.length) this.despawn(c); continue; }
      if (c.state === 'idle' && d < SPAWN) this.spawn(c);
      else if (c.state === 'camp') {
        c.foes = c.foes.filter((e) => e.alive || e.fading > 0);
        if (d < WAKE || c.foes.some((e) => e.alive && e.state !== 'sleep')) { for (const e of c.foes) if (e.alive) C.wake(e); c.state = 'fight'; this.announce(c); }
        else if (d > DESPAWN) this.despawn(c);
      } else if (c.state === 'fight') {
        if (!c.foes.some((e) => e.alive)) this.clear(c);
        else if (d > DESPAWN + 10) this.despawn(c);
      } else if (c.state === 'cleared' && !c.once && now - c.clearedAt > RESPAWN && d > DESPAWN && c.clearedAt > 0) {
        c.state = 'idle';
        this.cleared.delete(c.id); this.store();
        if (c.props) this.relight(c, false);
      }
    }
  }

  spawn(c) {
    const P = this.party, C = P.combat;
    const lv = c.level || 1, n = C.heroesNear(c.x, c.z, 34);
    const pool = c.pool || ZONE_FOES[c.zone];
    // bigger camps further out, and more of them for every two heroes around
    const count = c.saga && c.saga.n ? c.saga.n + Math.floor(n / 2) : Math.min(12, 3 + Math.min(3, Math.floor(lv / 8)) + Math.floor(n / 2));
    const types = [];
    for (let i = 0; i < count; i++) {
      const ty = pick(pool);
      types.push(ty);
      // (little ones come in swarms)
      for (let k = 1; k < ((NEW_ENEMIES[ty] && NEW_ENEMIES[ty].swarm) || 1); k++) types.push(ty);
    }
    if (c.pool) { if (c.big) types.push(c.big); }
    else if (lv >= 4 && ZONE_BIG[c.zone] && Math.random() < 0.5) types[0] = ZONE_BIG[c.zone];
    const h = P.state ? P.state.hour : 12;
    if (NIGHT_BATS.has(c.zone) && (h >= 20 || h < 5)) for (let i = 0; i < 3 + Math.floor(n / 3); i++) types.push('bat');
    if (!c.pool && Math.random() < 0.45) types.push('totem');
    c.foes = [];
    types.forEach((ty, i) => {
      const a = (i / types.length) * Math.PI * 2 + rand(-0.3, 0.3), rr = ty === 'totem' ? 0.8 : rand(1.6, 3.2);
      const s = ty === 'totem' ? { x: c.x + 1.4, z: c.z - 1 } : C.freeSpot(c.x + Math.cos(a) * rr, c.z + Math.sin(a) * rr, 0.8) || { x: c.x + Math.cos(a) * rr, z: c.z + Math.sin(a) * rr };
      const e = C.spawn(ty, s.x, s.z, { sleep: true, level: lv + (ty === ZONE_BIG[c.zone] ? 1 : 0) });
      e.camp = c;
      c.foes.push(e);
    });
    // an elite past the first lands, and one more for every three heroes around
    const elites = lv >= 3 && !c.saga ? (Math.random() < 0.55 ? 1 : 0) + Math.floor(n / 3) : c.saga ? Math.floor(n / 3) : 0;
    for (let k = 0; k < elites; k++) { const e = c.foes.find((q) => q.type !== 'totem' && !q.elite); if (e) { makeElite(e); e.level++; } }
    c.state = 'camp';
  }

  despawn(c) {
    for (const e of c.foes) if (e.alive) { e.alive = false; e.fading = 0; e.remove(); }
    c.foes = [];
    if (c.state !== 'cleared') c.state = 'idle';
  }

  announce(c) {
    const P = this.party;
    if (c.told) return;
    c.told = true;
    P.toast(t('A gloom camp! ({zone})', { zone: t(ZNAME[c.zone] || c.zone) }), '#b88cf0');
    audio.sfx('growl', { volume: 0.6 });
  }

  clear(c) {
    const P = this.party;
    c.state = 'cleared'; c.clearedAt = P.t; c.told = false;
    this.cleared.add(c.id); this.store();
    this.relight(c, true);
    if (c.saga && P.saga) P.saga.onCampCleared(c);
    if (c.saga) P.showBanner(t(c.saga.done || 'The gloom is gone!'), '');
    else P.showBanner(t('Gloom camp cleared!'), t('Camps: {n} of {total}', { n: this.camps.filter((q) => q.state === 'cleared' && !q.saga).length, total: this.camps.filter((q) => !q.saga).length }));
    audio.jingle('questDone');
    // (now and then, once you’ve cleared a camp or two, the chest bites back)
    if (P.act && P.act.dropChest) P.act.dropChest(c.x, c.z + 0.6, { mimic: this.cleared.size > 1 && Math.random() < 0.2 });
    for (const p of P.players) if (p.fighter && P.combat && Math.hypot(p.pos.x - c.x, p.pos.z - c.z) < 20) P.combat.gainXp(p, killXp(c.level || 1, p.fighter.level) * 3);
    P.world.fx.emit('sparkle', c.x, 1, c.z, 24, { color: '#fff3a6' });
    if (P.act && P.act.stat) for (const p of P.players) if (Math.hypot(p.pos.x - c.x, p.pos.z - c.z) < 20) P.act.stat(p, 'camps');
  }

  store() { this.party.writeSave('camps', [...this.cleared]); }

  // ------------------------------------------------------------------ the camp itself
  build(c) {
    const r3d = this.party.r3d;
    const g = new THREE.Group();
    const m = (col, e) => toon(r3d, { color: col, emissive: e || 0x000000, key: 'camp' + col + (e || '') });
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(3.4, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x2a1640, transparent: true, opacity: 0.35, depthWrite: false }));
    puddle.position.y = 0.02; g.add(puddle);
    for (const [x, z, s, rot] of [[-1.8, -1.2, 1.1, 0.4], [1.6, 1.4, 0.9, -0.3]]) {
      const tent = new THREE.Mesh(new THREE.ConeGeometry(0.9 * s, 1.3 * s, 4), m('#4a2a66'));
      tent.position.set(x, 0.65 * s, z); tent.rotation.y = rot + Math.PI / 4; tent.castShadow = true; g.add(tent);
      const flap = new THREE.Mesh(new THREE.BoxGeometry(0.3 * s, 0.5 * s, 0.05), m('#2a1640'));
      flap.position.set(x + Math.sin(rot) * 0.55 * s, 0.25 * s, z + Math.cos(rot) * 0.55 * s); flap.rotation.y = rot; g.add(flap);
    }
    // the fire (gloomy now, warm once the camp is cleared)
    const logs = new THREE.Group();
    for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.12), m('#5a3b2a')); l.rotation.y = i * 1.05; l.position.y = 0.05; logs.add(l); }
    g.add(logs);
    const fire = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.4, 0.34), m('#b86aff', '#8a3aff'));
    fire.position.y = 0.3; g.add(fire);
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.3, 0.16), m('#f0d8ff', '#d8a8ff'));
    core.position.y = 0.36; g.add(core);
    for (const [x, z] of [[-0.6, 0.5], [0.7, -0.4], [0.1, 0.8], [-0.3, -0.7]]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.2), m('#6a6a72')); st.position.set(x, 0.07, z); g.add(st); }
    // a pole with a torn gloomy flag
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2, 0.08), m('#3a2a2a'));
    pole.position.set(-0.4, 1, -2.3); pole.castShadow = true; g.add(pole);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.36, 0.03), m('#6a3a8e'));
    flag.position.set(-0.08, 1.75, -2.3); g.add(flag);
    // flowers that bloom when it’s cleansed
    const flowers = new THREE.Group();
    for (let i = 0; i < 14; i++) {
      const a = i * 2.4, rr = 1.2 + (i % 4) * 0.6;
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), m(['#f59ac8', '#fff3a6', '#8fd6b4', '#b9e6ff'][i % 4]));
      f.position.set(Math.cos(a) * rr, 0.06, Math.sin(a) * rr);
      flowers.add(f);
    }
    g.add(flowers);
    g.position.set(c.x, this.big.groundY({ x: c.x, z: c.z }), c.z);
    this.root.add(g);
    c.props = g;
    c.fx = { fire, core, flag, flowers, puddle };
    this.relight(c, c.state === 'cleared');
  }

  relight(c, clean) {
    const F = c.fx, r3d = this.party.r3d;
    if (!F) return;
    F.fire.material = toon(r3d, { color: clean ? 0xffb040 : 0xb86aff, emissive: clean ? 0xff7a1a : 0x8a3aff, key: 'campfire' + clean });
    F.core.material = toon(r3d, { color: clean ? 0xfff0a0 : 0xf0d8ff, emissive: clean ? 0xffd23a : 0xd8a8ff, key: 'campcore' + clean });
    F.flag.material = toon(r3d, { color: clean ? 0x62c46c : 0x6a3a8e, key: 'campflag' + clean });
    F.flowers.visible = clean;
    F.puddle.visible = !clean;
  }

  animate(c, dt, now) {
    const F = c.fx;
    if (!F || !c.props.visible) return;
    F.fire.scale.y = 1 + Math.sin(now * 14 + c.x) * 0.2;
    F.core.scale.y = 1 + Math.sin(now * 19 + c.z) * 0.25;
    F.flag.rotation.y = Math.sin(now * 2 + c.x) * 0.3;
    if (Math.random() < dt * 2) this.party.world.fx.emit(c.state === 'cleared' ? 'sparkle' : 'smoke', c.x, 0.8, c.z, 1, { color: c.state === 'cleared' ? '#ffb862' : '#7a5a9a' });
  }

  // on the world map: purple tents, green once cleansed
  // on the part of the world map someone has explored (so it stays there between sessions)
  revealed(o) { const WM = this.party.big && this.party.big.worldMap; return !!(WM && WM.revealed(o.x, o.z)); }

  mapMarks(out = []) {
    for (const c of this.camps) if (c.seen || c.state === 'cleared' || this.revealed(c)) out.push({ k: 'camp', x: c.x, z: c.z, on: c.state === 'cleared', name: t('Gloom camp'), st: c.state === 'cleared' ? t('Cleared') : t(ZNAME[c.zone] || '') });
    return out;
  }
  drawMapMarks(ctx, M) { drawMarks(ctx, M, this.mapMarks(), this.party.t); }

  dispose() {
    for (const c of this.camps) if (c.foes.length) this.despawn(c);
    for (const e of this.bloom) if (e.alive) { e.alive = false; e.fading = 0; e.remove(); }
    this.party.world.over.root.remove(this.root);
  }
}

export { campIcon } from './mapmarks.js';
