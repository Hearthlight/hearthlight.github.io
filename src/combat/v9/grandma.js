// Release v9: Grandmother Kraken, the sixth world boss — out on the Wide Sea, and fought from boats.
// She is the Gloom Kraken's grandmother: old, huge, a monocle on a chain, a knitted shawl, and a
// scarf of gloom on her needles. Nobody can reach her from the water (« Too deep! »), but:
//   · her arms rise round the arena — RAM them with a boat at speed (row together for a big ram):
//     each ram hurts her, a severed arm hurts her more;
//   · after three rams she rears up to see who's there — her eye is open: throw June's lanterns
//     (the special button, from a boat nearby) for big damage, until she ducks back down;
//   · arms slam along marked lines: a boat caught is knocked about, and may tip its crew out;
//   · phase 2: a whirlpool drags boats towards her — row away, or be swallowed and spat out;
//   · phase 3: nets of kelp yarn thrown at the boats (marked circles): caught, row hard to get free.
// Swimmers near her get a slap of water (back in a boat!).

import { THREE } from '../../render/r3d.js';
import { SEA_MODELS } from '../v7/sea.js';
import { flat, later, tickLater, hurtIn, checkPhase } from '../v3/bosses.js';
import { audio } from '../../engine/audio.js';
import { t } from '../../i18n.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const norm = (x, z) => { const l = Math.hypot(x, z) || 1; return { x: x / l, z: z / l }; };
const ARENA = 11;             // (her arms rise within this; the boats wait at its edge)
const RAMS_TO_PEEK = 3;

export const GRANDMA_ENEMIES = {
  grandmakraken: { name: 'Grandmother Kraken', title: 'Grandmother Kraken, the Knitter of the Deep', hp: 2600, speed: 0, r: 3.0, h: 4.6, dmg: 26, xp: 400, cost: 99, boss: true, knockRes: 1, elem: 'shock' },
  gm_arm: { name: 'Grandmother’s arm', hp: 110, speed: 0, r: 0.65, h: 1.4, dmg: 20, xp: 12, cost: 3, knockRes: 1 },
};

// ------------------------------------------------------------------ models
const mats = new Map();
function mat(r3d, c, e = null, ei = 1) {
  const k = c + '|' + e + '|' + ei;
  if (!mats.has(k)) mats.set(k, new THREE.MeshToonMaterial({ color: c, emissive: e || 0x000000, emissiveIntensity: e ? ei : 1, gradientMap: r3d.gradient }));
  return mats.get(k);
}
function tint(g, from, to) { g.traverse((m) => { if (m.isMesh && m.material && m.material.color && m.material.color.getHexString() === from) m.material.color.set(to); }); }

export const GRANDMA_MODELS = {
  // the Kraken's own shape, older and paler, much bigger — a gold monocle on a chain before
  // her great eye, a striped knitted shawl round her mantle, two needles and a ball of yarn
  grandmakraken(r3d) {
    const g = SEA_MODELS.kraken(r3d), u = g.userData;
    tint(g, '5a4a8e', '#7e7098'); tint(g, '3e3270', '#5a4e78'); tint(g, '8a7ac0', '#c8c0dc');
    const gold = mat(r3d, '#e0b03a'), shawlA = mat(r3d, '#c8454f'), shawlB = mat(r3d, '#f2c14e'), yarn = mat(r3d, '#a86ae0', '#6a3a9e', 0.4), wood = mat(r3d, '#c8a070');
    // the monocle, and its chain down the mantle
    const mono = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.08, 6, 20), gold); mono.position.set(0, 0.1, 0.72); mono.rotation.x = -0.6; u.head.add(mono);
    for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), gold); c.position.set(0.72 + i * 0.05, -0.2 - i * 0.28, 0.6 - i * 0.04); u.head.add(c); }
    // the shawl: stripes of red and gold round the mantle's foot
    for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.TorusGeometry(1.9 - i * 0.12, 0.2, 6, 24), i % 2 ? shawlB : shawlA); s.rotation.x = Math.PI / 2; s.position.set(0, 1.35 + i * 0.32, -0.25); s.castShadow = true; u.body.add(s); }
    // the knitting: two needles crossed through a ball of gloom yarn, up on top
    const knit = new THREE.Group(); knit.position.set(0, 5.1, -0.4); u.body.add(knit);
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), yarn); knit.add(ball);
    for (const s of [-1, 1]) { const n = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), wood); n.rotation.z = s * 0.7; knit.add(n); const tip = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), gold); tip.position.set(-s * 0.78, 0.92, 0); knit.add(tip); }
    // the scarf, trailing down from the needles into the water
    const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.2, 0.08), yarn); scarf.position.set(0.9, -0.9, 0.3); scarf.rotation.z = -0.3; knit.add(scarf);
    // (scaled inside a holder: the spawn pop-in sets the outer group's scale)
    g.scale.setScalar(1.5);
    const holder = new THREE.Group(); holder.add(g);
    holder.userData = { ...u, knit, mono };
    return holder;
  },
  gm_arm(r3d) {
    const g = SEA_MODELS.tentacle(r3d);
    tint(g, '5a4a8e', '#7e7098'); tint(g, '3e3270', '#5a4e78');
    // (a woolly cuff at the base: she knitted it herself)
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.16, 6, 14), mat(r3d, '#c8454f')); cuff.rotation.x = Math.PI / 2; cuff.position.y = 0.3; g.userData.arm.add(cuff);
    return g;
  },
};

// ------------------------------------------------------------------ helpers
const boatsOf = (C) => ((C.party.vehicles && C.party.vehicles.list) || []).filter((v) => v.kind === 'rowboat' || v.kind === 'sailboat');
const crewed = (C) => boatsOf(C).filter((v) => v.riders.some(Boolean));
const riders = (v) => v.riders.filter(Boolean);
function onWater(C, x, z) { const V = C.party.vehicles; return V ? V.water(x, z) : true; }

// ------------------------------------------------------------------ brains
export const GRANDMA_BRAINS = {
  grandmakraken: {
    init(e) {
      e.state = 'knit'; e.timer = 2; e.phase = 1; e.armT = 1.2; e.rams = 0; e.whirlT = 4; e.netT = 5; e.slapT = 3;
      e.immune = 'Too deep!'; e.hintText = 'Too deep — ram her arms with a boat!';
    },
    think(e, dt, tgt, C) {
      tickLater(e, dt);
      if (!e.ready) {
        e.ready = true; this.boats(e, C); C.bubble(e, t('Oh! Visitors! Mind my knitting, dears.'), 3);
        // (what the bar under her name says: « ram » to one hero, « ram » to a party)
        e.hints = C.party.solo ? { deep: 'Too deep — ram her arms with a boat!', eye: 'Her eye is open — throw your lanterns!' } : { deep: 'Too deep — ram her arms with the boats!', eye: 'Her eye is open — throw all your lanterns!' };
        e.hintText = e.hints.deep;
      }
      if (e.state !== 'peek' && checkPhase(e, C, (ph) => C.bubble(e, ph === 2 ? t('Round and round, like a ball of wool!') : t('I’ll knit you all a nice warm NET!'), 2.4))) return;
      if (e.state === 'roar') { if (e.timer <= 0) { e.state = 'knit'; e.timer = 1; } return; }
      const arms = C.enemies.filter((q) => q.alive && q.summoner === e);
      this.rams(e, C, arms);
      this.lanterns(e, C, dt);
      this.netted(e, C, dt);
      if (e.phase >= 2) this.whirl(e, C, dt);
      // (swimmers too close: a slap of the water — back in a boat!)
      e.slapT -= dt;
      if (e.slapT <= 0) { e.slapT = 3.5; const sw = C.alivePlayers().filter((p) => p.swimming && Math.hypot(p.pos.x - e.x, p.pos.z - e.z) < 8); if (sw.length) this.slap(e, C, sw[0]); }
      if (e.state === 'peek') { this.peek(e, C, dt); return; }
      // her arms: up through the water round the boats, a few at a time
      e.armT -= dt;
      const want = 2 + e.phase, boats = crewed(C);
      if (e.armT <= 0 && arms.length < want) { e.armT = e.phase >= 3 ? 1.1 : 1.6; this.arm(e, C, boats.length ? pick(boats) : tgt ? { x: tgt.pos.x, z: tgt.pos.z } : null); }
      if (e.phase >= 3) { e.netT -= dt; if (e.netT <= 0) { e.netT = 6.5; this.nets(e, C); } }
      if (e.rams >= RAMS_TO_PEEK) this.rise(e, C, arms);
      if (tgt) e.face = { x: tgt.pos.x - e.x, z: tgt.pos.z - e.z };
    },
    // two rowboats (and a sailboat for a crowd) waiting at the arena's edge
    boats(e, C) {
      const V = C.party.vehicles;
      if (!V) return;
      const near = boatsOf(C).filter((v) => Math.hypot(v.x - e.x, v.z - e.z) < ARENA + 6).length;
      const n = C.party.solo ? 1 : Math.min(4, Math.ceil(C.alivePlayers().length / 2) + 1);
      for (let i = near; i < n; i++) {
        for (let k = 0; k < 24; k++) {
          const a = (i / Math.max(1, n)) * Math.PI * 2 + k * 0.26 + Math.PI / 2, x = e.x + Math.cos(a) * (ARENA - 1.5), z = e.z + Math.sin(a) * (ARENA - 1.5);
          if (!onWater(C, x, z)) continue;
          const kind = i === 2 && !C.party.solo ? 'sailboat' : 'rowboat';
          V.spawn(kind, x, z, { heading: Math.atan2(e.x - x, e.z - z) });
          break;
        }
      }
    },
    // an arm rises somewhere round a boat (not under it), on open water
    arm(e, C, at) {
      if (!at) return;
      for (let k = 0; k < 10; k++) {
        const a = rand(0, Math.PI * 2), d = rand(3.2, 5.5);
        let x = at.x + Math.cos(a) * d, z = at.z + Math.sin(a) * d;
        const off = Math.hypot(x - e.x, z - e.z);
        if (off < e.def.r + 2 || off > ARENA) { const dir = norm(x - e.x, z - e.z); const r = Math.max(e.def.r + 2.5, Math.min(ARENA - 1, off)); x = e.x + dir.x * r; z = e.z + dir.z * r; }
        if (!onWater(C, x, z)) continue;
        const q = C.spawn('gm_arm', x, z, { level: e.level, quiet: true });
        q.summoner = e;
        C.world.fx.emit('splash', x, 0.3, z, 14);
        C.sfx('splash', q);
        return;
      }
    },
    // a boat at speed into one of her arms: a RAM (rowing together makes it a big one)
    rams(e, C, arms) {
      for (const v of crewed(C)) {
        const sp = Math.abs(v.speed || 0);
        if (sp < 3) continue;
        for (const q of arms) {
          if (q.ramCd > 0 || q.state === 'rise' || q.state === 'sink') continue;
          if (Math.hypot(v.x - q.x, v.z - q.z) > q.def.r + (v.kind === 'sailboat' ? 1.8 : 1.2)) continue;
          const big = (v.sync || 0) > (v.ramSync || 0) && C.party.t - Math.max(...riders(v).map((p) => p.rowAt || -9)) < 1.2;
          v.ramSync = v.sync || 0;
          const k = Math.min(1.7, sp / 5) * (big ? 1.35 : 1), by = riders(v)[0];
          q.ramCd = 0.8;
          C.hurtEnemy(q, q.maxHp * 0.75 * k + 1, { p: by, knock: 0, kind: 'dot', noCombo: true, color: '#ffd66b' });
          C.hurtEnemy(e, e.maxHp * 0.03 * k, { p: by, knock: 0, kind: 'dot', noCombo: true, color: '#ffd66b' });
          e.rams += 1;
          C.popText(q.x, 2.4, q.z, big ? t('BIG RAM!') : t('RAM!'), '#ffd66b', true);
          C.vfx.star(q.x, 1.2, q.z, { size: big ? 2 : 1.5, kind: 'rays', color: '#ffe89a', life: 0.3 });
          C.world.fx.emit('splash', v.x, 0.3, v.z, 16);
          C.party.cam.shake = Math.max(C.party.cam.shake || 0, big ? 0.4 : 0.25);
          audio.sfx('thud', { volume: 0.8 }); audio.sfx('splash', { volume: 0.7 });
          for (const p of riders(v)) C.party.buzz(p, [30, 20, 60]);
          v.speed = -sp * 0.35;
          if (e.rams === 1) C.bubble(e, t('Ooh! Who’s pinching my arms?'), 1.8);
          break;
        }
      }
      for (const q of arms) q.ramCd = Math.max(0, (q.ramCd || 0) - 1 / 60);
    },
    // three rams: up she comes to see who's there — the eye is open
    rise(e, C, arms) {
      e.rams = 0; e.state = 'peek'; e.timer = e.phase >= 3 ? 5 : 6.5;
      e.immune = null; e.hintText = (e.hints && e.hints.eye) || 'Her eye is open — throw your lanterns!';
      for (const q of arms) { q.state = 'sink'; q.timer = 0.8; q.immune = 'Splash!'; }
      C.bubble(e, pick([t('Now where are my spectacles… oh! THERE you are!'), t('Speak up, dearie, I can’t see a thing!')]), 2.2);
      const P = C.party, key = P.keyName ? P.keyName('x') : 'X';
      P.toast(P.solo ? t('Her eye is open! Throw your lantern ({x}) from a boat close by!', { x: key }) : t('Her eye is open! Throw your lanterns ({x}) from the boats close by!', { x: key }), '#ffd66b');
      C.shakeAt(e, 0.35); audio.sfx('splash', { volume: 0.9, pitch: -6 });
    },
    // riders close by throw June's lanterns into her eye
    peek(e, C, dt) {
      e.timer -= dt;
      for (const v of crewed(C)) {
        if (Math.hypot(v.x - e.x, v.z - e.z) > e.def.r + 7) continue;
        for (const p of riders(v)) {
          p.lanternCd = Math.max(0, (p.lanternCd || 0) - dt);
          if (!p.input.pressed('x') || p.lanternCd > 0 || !p.fighter) continue;
          p.input.edges.delete('x');
          p.lanternCd = 0.55;
          // (a lantern lobbed in an arc at her eye: it can't miss her, it's how much it lands)
          const m = C.shotMesh('wisp'); m.position.set(p.pos.x, 1.4, p.pos.z); C.root.add(m);
          (e.lanterns || (e.lanterns = [])).push({ p, m, x: p.pos.x, z: p.pos.z, t: 0, T: 0.7, sx: p.pos.x, sz: p.pos.z });
          audio.sfx('whoosh', { volume: 0.4 });
        }
      }
      if (e.timer <= 0) {
        e.state = 'knit'; e.timer = 1; e.armT = 0.8;
        e.immune = 'Too deep!'; e.hintText = (e.hints && e.hints.deep) || 'Too deep — ram her arms with a boat!';
        C.bubble(e, pick([t('Hmph. Back to my knitting.'), t('Kids these days. No manners.')]), 1.8);
      }
    },
    // the lanterns in flight: into her eye, a burst of light and a big bite of her health
    lanterns(e, C, dt) {
      if (!e.lanterns || !e.lanterns.length) return;
      const ex = e.x, ez = e.z, ey = 3.6;
      for (const L of e.lanterns) {
        L.t += dt;
        const k = Math.min(1, L.t / L.T);
        L.m.position.set(L.sx + (ex - L.sx) * k, 1.4 + (ey - 1.4) * k + Math.sin(k * Math.PI) * 2.4, L.sz + (ez - L.sz) * k);
        L.m.rotation.y += dt * 9;
        if (Math.random() < 0.6) C.vfx.bit('glow', L.m.position.x, L.m.position.y, L.m.position.z, { vy: 0.3, g: 0, drag: 1, life: 0.3, size: 0.08, s1: 0.02, color: '#ffd66b' });
        if (k < 1) continue;
        L.done = true; C.root.remove(L.m);
        if (!e.alive) continue;
        const crit = Math.random() < ((L.p.fighter && L.p.fighter.mods.crit) || 0.05);
        C.hurtEnemy(e, e.maxHp * 0.013 * (crit ? 1.8 : 1), { p: L.p, knock: 0, kind: 'dot', noCombo: true, color: crit ? '#ffffff' : '#ffd66b' });
        C.vfx.star(ex, ey, ez, { size: crit ? 2.4 : 1.8, kind: 'rays', color: '#ffe89a', life: 0.3 });
        C.vfx.light(ex, ey, ez, { color: '#ffd070', power: 2.4, life: 0.3, dist: 8 });
        if (crit) C.popText(ex, ey + 1.2, ez, t('Bullseye!'), '#ffd66b', true);
        audio.sfx('glow', { volume: 0.6 });
      }
      e.lanterns = e.lanterns.filter((L) => !L.done);
    },
    // phase 2: the sea turns round her — boats are drawn in, and swallowed at the middle
    whirl(e, C, dt) {
      e.whirlT -= dt;
      if (!e.whirl && e.whirlT <= 0 && e.state !== 'peek') { e.whirl = { t: 6, warm: 1.2 }; C.telegraphCircle(e.x, e.z, ARENA - 1, 1.2); C.bubble(e, t('Round and round we go!'), 1.6); audio.sfx('whoosh', { volume: 0.8 }); }
      const w = e.whirl;
      if (!w) return;
      if (w.warm > 0) { w.warm -= dt; return; }
      w.t -= dt;
      if (w.t <= 0) { e.whirl = null; e.whirlT = 10; return; }
      if (Math.random() < dt * 40) { const a = Math.random() * Math.PI * 2, r = rand(e.def.r, ARENA); C.world.fx.emit('water', e.x + Math.cos(a) * r, 0.2, e.z + Math.sin(a) * r, 1); }
      for (const v of boatsOf(C)) {
        const dx = e.x - v.x, dz = e.z - v.z, d = Math.hypot(dx, dz);
        if (d > ARENA + 2 || d < 0.1) continue;
        const pull = (1.4 + (ARENA - d) * 0.12) * dt;
        const nx = v.x + (dx / d) * pull + (-dz / d) * pull * 0.7, nz = v.z + (dz / d) * pull + (dx / d) * pull * 0.7;
        if (onWater(C, nx, nz)) { v.x = nx; v.z = nz; }
        if (d < e.def.r + 1.3 && riders(v).length) this.gulp(e, C, v);
      }
    },
    gulp(e, C, v) {
      C.bubble(e, pick([t('Nom nom— PTOOEY! Far too salty!'), t('Gulp! …Bleh. You taste of seaweed.')]), 2);
      for (const p of riders(v)) C.hurtPlayer(p, p.fighter ? p.fighter.maxHp * 0.2 : 20, { knock: 0, src: e });
      for (let k = 0; k < 16; k++) {
        const a = rand(0, Math.PI * 2), x = e.x + Math.cos(a) * (ARENA - 1), z = e.z + Math.sin(a) * (ARENA - 1);
        if (onWater(C, x, z)) { v.x = x; v.z = z; v.speed = 0; v.heading = Math.atan2(e.x - x, e.z - z); break; }
      }
      C.world.fx.emit('splash', v.x, 0.4, v.z, 24);
      audio.sfx('splash', { volume: 0.9 }); audio.sfx('boing', { volume: 0.6 });
    },
    // phase 3: nets of kelp yarn thrown at the boats — whoever's still under one is caught
    nets(e, C) {
      for (const v of crewed(C)) {
        const lead = { x: v.x + Math.sin(v.heading) * v.speed * 0.8, z: v.z + Math.cos(v.heading) * v.speed * 0.8 };
        C.telegraphCircle(lead.x, lead.z, 1.9, 1.3);
        later(e, 1.3, () => {
          if (Math.hypot(v.x - lead.x, v.z - lead.z) > 2.1) return;
          v.netted = 2.6;
          C.popText(v.x, 2.2, v.z, t('Caught in the yarn! Row hard!'), '#b88cf0', true);
          C.world.fx.emit('splash', v.x, 0.3, v.z, 10);
          audio.sfx('snap', { volume: 0.6 });
        });
      }
      C.bubble(e, t('Knit one, purl one… CATCH!'), 1.6);
    },
    // a boat in a net barely moves; each stroke of the oars tears at it
    netted(e, C, dt) {
      for (const v of boatsOf(C)) {
        if (!(v.netted > 0)) continue;
        v.netted -= dt;
        for (const p of riders(v)) if (C.party.t - (p.rowAt || -9) < dt * 1.5) v.netted -= 0.35;
        v.speed = Math.max(-0.6, Math.min(0.6, v.speed || 0));
        if (Math.random() < dt * 8) C.vfx.bit('shard', v.x + rand(-0.6, 0.6), 0.4, v.z + rand(-0.6, 0.6), { vy: 1, g: 3, life: 0.5, size: 0.08, color: '#a86ae0' });
        if (v.netted <= 0) { C.popText(v.x, 2, v.z, t('Free!'), '#8fd6b4'); audio.sfx('snap', { volume: 0.5 }); }
      }
    },
    slap(e, C, p) {
      const x = p.pos.x, z = p.pos.z;
      flat(C, new THREE.CircleGeometry(1.6, 24).rotateX(-Math.PI / 2), x, z, 0xff5a6a, 0.9);
      later(e, 0.9, () => {
        hurtIn(C, e, (q) => Math.hypot(q.pos.x - x, q.pos.z - z) < 1.8, e.def.dmg * 0.8 * (C.enemyDmg || 1), { knock: 5 });
        C.world.fx.emit('splash', x, 0.4, z, 18); C.sfx('splash', e);
      });
      C.bubble(e, t('Out of the water, young one! You’ll catch your death!'), 1.8);
    },
    onDeath(e, C) { for (const L of e.lanterns || []) C.root.remove(L.m); e.lanterns = []; for (const q of C.enemies) if (q.alive && q.summoner === e) { q.state = 'sink'; q.timer = 0.8; } },
    pose(e, dt) {
      const u = e.obj.userData, peek = e.state === 'peek';
      e.obj.rotation.y = Math.atan2(e.face.x, e.face.z) * 0.3;
      const y = peek ? 0.4 + Math.sin(e.t * 2) * 0.1 : -1.4 + Math.sin(e.t * 1.1) * 0.18;
      u.body.position.y += (y - u.body.position.y) * Math.min(1, dt * 2.5);
      u.lid.position.y = peek ? 1.05 : 0.62 + (Math.sin(e.t * 0.6) > 0.96 ? -0.45 : 0);
      u.eye.material.emissiveIntensity = peek ? 1.6 + Math.sin(e.t * 10) * 0.4 : 0.4;
      u.knit.rotation.y = Math.sin(e.t * 3) * 0.3; u.knit.position.y = 5.1 + (peek ? 0 : Math.abs(Math.sin(e.t * 6)) * 0.12);
      u.mantle.scale.y = 1.55 + Math.sin(e.t * 1.6) * 0.04;
    },
  },

  // (the ones still in flight when she dies)
  // one of her arms: rises (untouchable), sways (ram it!), now and then slams a marked line
  // at a boat, lies there (a big target), sinks
  gm_arm: {
    init(e) { e.state = 'rise'; e.timer = 0.9; e.immune = 'Ram it with a boat!'; e.hitOnce = new Set(); },
    onDeath(e, C) {
      const k = e.summoner;
      if (k && k.alive) { C.hurtEnemy(k, k.maxHp * 0.04, { knock: 0, kind: 'dot', noCombo: true, color: '#ffd66b' }); C.bubble(k, pick([t('Ow! My knitting arm!'), t('Now that was uncalled for!')]), 1.4); }
    },
    think(e, dt, tgt, C) {
      tickLater(e, dt);
      const k = e.summoner;
      if (!k || !k.alive) e.state = 'sink';
      if (e.state === 'rise') { if (e.timer <= 0) { e.state = 'sway'; e.timer = rand(2, 3.5); e.immune = 'Ram it with a boat!'; } return; }
      if (e.state === 'sway') { if (e.timer <= 0) this.aim(e, C); return; }
      if (e.state === 'raise' && e.timer <= 0) { this.slam(e, C); return; }
      if (e.state === 'lie' && e.timer <= 0) { e.state = 'sink'; e.timer = 0.8; return; }
      if (e.state === 'sink' && e.timer <= 0) { e.alive = false; e.fading = 0; e.remove(); }
    },
    aim(e, C) {
      const boats = crewed(C), ps = C.alivePlayers();
      const at = boats.length ? boats.reduce((b, v) => (Math.hypot(v.x - e.x, v.z - e.z) < Math.hypot(b.x - e.x, b.z - e.z) ? v : b)) : ps.length ? { x: ps[0].pos.x, z: ps[0].pos.z } : null;
      if (!at || Math.hypot(at.x - e.x, at.z - e.z) > 12) { e.state = 'sink'; e.timer = 0.8; return; }
      const dx = at.x - e.x, dz = at.z - e.z, l = Math.hypot(dx, dz) || 1;
      e.dir = { x: dx / l, z: dz / l }; e.len = 7;
      e.state = 'raise'; e.timer = 1.3;
      C.telegraphLine(e, e.dir, e.len, 1.3);
      C.sfx('whoosh', e);
    },
    slam(e, C) {
      e.state = 'lie'; e.timer = 1.8;
      const d = e.dir, L = e.len, onLine = (x, z, w) => { const px = x - e.x, pz = z - e.z, u = px * d.x + pz * d.z; return u > 0 && u < L && Math.abs(px * d.z - pz * d.x) < w; };
      hurtIn(C, e, (p) => onLine(p.pos.x, p.pos.z, 0.9), e.def.dmg * (C.enemyDmg || 1), { knock: 3 });
      // a boat under it: knocked about, and it may tip its crew into the sea
      for (const v of boatsOf(C)) {
        if (!onLine(v.x, v.z, 1.2)) continue;
        v.speed = -3; v.heading += rand(-1.2, 1.2);
        C.world.fx.emit('splash', v.x, 0.4, v.z, 18);
        if (Math.random() < 0.35 && C.party.vehicles) for (const p of riders(v)) { C.party.vehicles.leave(p, true); C.popText(p.pos.x, 2.2, p.pos.z, t('Overboard!'), '#9fdcff'); }
      }
      for (let s = 1; s < L; s += 1.2) C.world.fx.emit('splash', e.x + d.x * s, 0.3, e.z + d.z * s, 4);
      C.shakeAt(e, 0.35);
      C.sfx('thud', e);
    },
    pose(e, dt) {
      const u = e.obj.userData;
      if (e.dir) e.obj.rotation.y = Math.atan2(e.dir.x, e.dir.z);
      let lift = 0, bend = 0, curl = 0.08;
      if (e.state === 'rise') lift = Math.max(0, e.timer / 0.9);
      else if (e.state === 'sway') { bend = Math.sin(e.t * 2.4) * 0.25; curl = 0.1 + Math.sin(e.t * 3) * 0.05; }
      else if (e.state === 'raise') { bend = -0.3 * Math.min(1, (1.3 - e.timer) / 0.5); curl = 0.12; }
      else if (e.state === 'lie') bend = Math.PI / 2 - 0.08;
      else if (e.state === 'sink') { lift = 1 - Math.max(0, e.timer / 0.8); bend = u.arm.rotation.x; }
      u.arm.position.y = -7 * lift;
      u.arm.rotation.x += (bend - u.arm.rotation.x) * Math.min(1, dt * (e.state === 'lie' ? 16 : 6));
      u.segs.forEach((s, i) => { if (i) s.rotation.x = curl + Math.sin(e.t * 3 + i) * 0.06; });
    },
  },
};
