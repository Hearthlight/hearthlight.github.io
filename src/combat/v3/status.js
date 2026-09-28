// Deeper fights (Party v3): elements & statuses, shields & armour, the party's
// combo counter, juggles and finishers — the bits combat.js calls into.
//
//   fire   → burn: damage over time, embers
//   ice    → chill: slowed; three chills in a row → frozen solid (a heavy hit shatters it)
//   poison → stacks up to three, damage over time, green bubbles
//   shock  → a jolt (tiny stun) that jumps to a neighbour
// Staggered foes (parried, shield broken, frozen, dazed) take a FINISHER from a heavy hit.

import { THREE } from '../../render/r3d.js';
import { drawText, measure } from '../../engine/font.js';
import { audio } from '../../engine/audio.js';
import { t } from '../../i18n.js';

export const ELEMENTS = {
  fire: { name: 'Fire', color: '#ff8a3a', tint: new THREE.Color('#ff6a1a') },
  ice: { name: 'Ice', color: '#9fdcff', tint: new THREE.Color('#6ac0ff') },
  poison: { name: 'Poison', color: '#8fdc5a', tint: new THREE.Color('#5ac03a') },
  shock: { name: 'Shock', color: '#ffe066', tint: new THREE.Color('#ffd23a') },
};
export const PARRY_WINDOW = 0.17;            // seconds at the start of a roll
const rand = (a, b) => a + Math.random() * (b - a);

// ------------------------------------------------------------------ enemies
export function stOf(e) { return e.st || (e.st = { burn: 0, burnDps: 0, burnBy: null, chill: 0, chillN: 0, poison: 0, poisonN: 0, poisonBy: null, tick: 0 }); }

// an element lands on an enemy (power ~ the attacker's damage multiplier)
export function applyElement(C, e, elem, { p = null, power = 1, strong = false } = {}) {
  if (!e.alive || !elem) return;
  const s = stOf(e), boss = !!e.def.boss;
  if (elem === 'fire') {
    s.burn = boss ? 2 : 3.2; s.burnDps = 4.5 * power * (strong ? 1.5 : 1) * (p && p.fighter ? p.fighter.mods.burnMul || 1 : 1); s.burnBy = p;
  } else if (elem === 'ice') {
    const at = (p && p.fighter && p.fighter.mods.freezeAt) || 3;
    s.chill = 2.8; s.chillN = Math.min(at, s.chillN + (strong ? 2 : 1));
    if (s.chillN >= at && !boss && !(e.frozen > 0)) freeze(C, e, p && p.fighter ? p.fighter.mods.frozenMul || 1 : 1);
  } else if (elem === 'poison') {
    s.poison = 5; s.poisonN = Math.min((p && p.fighter && p.fighter.mods.poisonMax) || 3, s.poisonN + 1); s.poisonBy = p;
  } else if (elem === 'shock') {
    if (!boss) e.stun = Math.max(e.stun, strong ? 0.8 : 0.35);
    // …and it jumps to the nearest neighbour
    let best = null, bd = 3.2;
    for (const o of C.enemies) { if (o === e || !o.hurtable) continue; const d = Math.hypot(o.x - e.x, o.z - e.z); if (d < bd) { bd = d; best = o; } }
    if (best && !s.chained) {
      zap(C, e, best);
      stOf(best).chained = true;
      C.hurtEnemy(best, 6 * power, { p, dir: { x: best.x - e.x, z: best.z - e.z }, knock: 0.6, kind: 'aoe', quiet: true, elem: 'shock', noCombo: true });
      stOf(best).chained = false;
    }
  }
}

// frozen solid right now (Absolute Zero)
export function freezeNow(C, e, secs = 1.8) { if (!e.def.boss) freeze(C, e, secs / 1.8); }

function freeze(C, e, mul = 1) {
  const s = stOf(e);
  e.frozen = 1.8 * mul; s.chillN = 0; s.chill = 0;
  e.stagger = Math.max(e.stagger || 0, 1.8);
  if (!e.ice) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshToonMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.55, gradientMap: C.r3d.gradient, emissive: 0x3a7ac0, emissiveIntensity: 0.35, depthWrite: false }));
    m.scale.set(e.r * 2.6, e.def.h * 1.25 + 0.2, e.r * 2.6);
    e.ice = m;
    C.root.add(m);
  }
  e.ice.visible = true;
  if (C.vfx) { C.vfx.iceSpikes(e.x, e.z, { r: e.r * 1.6 + 0.3, n: 5, h: 0.5 + e.def.h * 0.4, life: 0.6 }); C.vfx.star(e.x, e.y + e.def.h * 0.6, e.z, { size: 1, color: '#dff4ff', life: 0.25 }); }
  C.popText(e.x, e.def.h + 0.8, e.z, t('Frozen!'), '#9fdcff');
  audio.sfx('crackle', { volume: 0.5, pitch: 6 });
}

export function thaw(C, e, shatter = false) {
  e.frozen = 0;
  if (e.ice) { e.ice.visible = false; }
  if (C.vfx) C.vfx.sparks(e.x, e.y + e.def.h * 0.5, e.z, { n: shatter ? 18 : 7, color: '#e8f8ff', speed: shatter ? 5 : 2.5, up: 3, kind: 'shard', size: shatter ? 0.09 : 0.06, life: 0.6 });
  if (shatter && C.vfx) { C.vfx.star(e.x, e.y + e.def.h * 0.5, e.z, { size: 2, kind: 'rays', color: '#dff4ff', life: 0.3 }); C.vfx.shockwave(e.x, e.z, { r: 1.4, color: '#9fdcff', life: 0.3, wall: 0.4 }); }
  if (shatter) { C.popText(e.x, e.def.h + 0.9, e.z, t('Shatter!'), '#dff4ff', true); audio.sfx('crackle', { volume: 0.7 }); }
}

function zap(C, a, b) {
  C.vfx.chain({ x: a.x, y: a.y + a.def.h * 0.6, z: a.z }, { x: b.x, y: b.y + b.def.h * 0.6, z: b.z }, { color: '#ffe066' });
  audio.sfx('zap', { volume: 0.4, pitch: 8 });
}

// per frame, before the enemy thinks: damage over time, slows, frozen & staggered
export function tickEnemy(C, e, dt) {
  const s = e.st;
  if (e.frozen > 0) {
    e.frozen -= dt;
    if (e.ice) e.ice.position.set(e.x, e.y + (e.def.h * 1.25 + 0.2) / 2 - 0.05, e.z);
    if (e.frozen <= 0) thaw(C, e);
  }
  if (e.stagger > 0) e.stagger -= dt;
  if (!s) { e.slowK = 1; return; }
  s.tick -= dt;
  const tickNow = s.tick <= 0;
  if (tickNow) s.tick = 0.5;
  if (s.burn > 0) {
    s.burn -= dt;
    if (tickNow) C.hurtEnemy(e, s.burnDps * 0.5, { p: s.burnBy, knock: 0, kind: 'dot', quiet: true, noCombo: true, color: '#ff9a3a' });
    if (Math.random() < dt * 16) C.vfx.bit('ember', e.x + rand(-0.25, 0.25) * (e.r * 2), e.y + e.def.h * rand(0.2, 0.9), e.z + rand(-0.2, 0.2), { vy: rand(1.2, 2.4), vx: rand(-0.3, 0.3), g: -0.6, life: rand(0.35, 0.6), size: rand(0.05, 0.08), color: Math.random() < 0.5 ? '#ffb040' : '#ff6a2a' });
  }
  if (s.poison > 0) {
    s.poison -= dt;
    if (tickNow) C.hurtEnemy(e, 1.6 * s.poisonN, { p: s.poisonBy, knock: 0, kind: 'dot', quiet: true, noCombo: true, color: '#8fdc5a' });
    if (Math.random() < dt * 5) C.vfx.bit('glow', e.x + rand(-0.2, 0.2), e.y + e.def.h * rand(0.5, 1), e.z, { vy: rand(0.4, 0.9), g: 0, drag: 0.5, life: 0.7, size: 0.07, s1: 0.12, color: '#8fdc5a' });
    if (s.poison <= 0) s.poisonN = 0;
  }
  if (s.chill > 0) {
    s.chill -= dt;
    if (Math.random() < dt * 6) C.vfx.bit('ice', e.x + rand(-0.3, 0.3), e.y + e.def.h * rand(0.4, 1), e.z + rand(-0.2, 0.2), { vy: rand(0.2, 0.8), g: 2, life: 0.5, size: 0.05, color: '#e8f8ff' });
    if (s.chill <= 0) s.chillN = 0;
  }
  e.slowK = e.frozen > 0 ? 0 : s.chill > 0 ? 0.55 : 1;
  // tint: the strongest status shows
  const tint = s.burn > 0 ? ELEMENTS.fire.tint : s.poison > 0 ? ELEMENTS.poison.tint : s.chill > 0 ? ELEMENTS.ice.tint : null;
  if (tint !== e.tinted && !(e.flash > 0)) {
    e.tinted = tint;
    for (const q of e.mats) { if (tint) { q.m.emissive.copy(tint); q.m.emissiveIntensity = 0.35; } else { q.m.emissive.copy(q.e); q.m.emissiveIntensity = q.i; } }
  }
}

// ------------------------------------------------------------------ shields & armour
// Returns the damage that gets through (or -1 when the hit was absorbed)
export function guard(C, e, dmg, { p, dir, heavy }) {
  const d = e.def;
  // (World v7) out of reach for now — in its pool, under the sea…: nothing lands
  if (e.immune) {
    if (!(e.immuneT > 0)) { e.immuneT = 0.35; C.popText(e.x, d.h + 0.5, e.z, t(e.immune), '#8fd6e8'); audio.sfx('splash', { volume: 0.35 }); }
    return -1;
  }
  // a totem's bubble soaks everything, from every side
  if (e.bubbleHp > 0) {
    e.bubbleHp -= dmg * (heavy ? 1.8 : 1);
    C.popText(e.x, d.h + 0.5, e.z, t('BLOCK'), '#d8a8ff');
    if (e.bubbleHp <= 0) { e.bubbleHp = 0; C.popText(e.x, d.h + 0.9, e.z, t('Pop!'), '#d8a8ff'); C.world.fx.emit('sparkle', e.x, d.h * 0.6, e.z, 12, { color: '#d8a8ff' }); audio.sfx('poof', { volume: 0.6 }); }
    return -1;
  }
  if (e.shieldHp > 0) {
    const front = (dir.x * e.face.x + dir.z * e.face.z) < -0.2 || d.shieldAll;
    if (front) {
      e.shieldHp -= dmg * (heavy ? 2.4 : 1);
      C.popText(e.x, d.h + 0.5, e.z, t('BLOCK'), '#9fc8ff');
      audio.sfx('block', { volume: 0.5 });
      if (p) C.party.buzz(p, 10);
      if (e.shieldHp <= 0) {
        e.shieldHp = 0;
        e.stagger = 2.2; e.stun = Math.max(e.stun, 1.2);
        C.popText(e.x, d.h + 0.9, e.z, t('Shield broken!'), '#ffd66b', true);
        C.world.fx.emit('sparkle', e.x, d.h * 0.6, e.z, 14, { color: '#9fc8ff' });
        audio.sfx('crit', { volume: 0.7 });
        if (e.onShieldBreak) e.onShieldBreak();
      }
      return -1;
    }
  }
  const ap = e.armorPts ?? d.armorPts;
  if (ap && !heavy) dmg *= 1 - ap;
  return dmg;
}

// ------------------------------------------------------------------ the party's combo
// every hit within a heartbeat of the last one counts; friends joining in
// make it a TEAM combo (bigger bonus)
export function comboHit(C, p) {
  const K = C.comboState || (C.comboState = { n: 0, t: 0, who: new Map(), best: 0, flash: 0 });
  if (K.t <= 0) { K.n = 0; K.who.clear(); }
  K.n++;
  K.t = 1.35;
  if (p) K.who.set(p, 2.2);
  K.best = Math.max(K.best, K.n);
  if (K.n % 10 === 0) { K.flash = 0.6; audio.sfx('chord', { volume: 0.35, pitch: Math.min(12, K.n / 5) }); }
  const team = [...K.who.values()].filter((v) => v > 0).length;
  return 1 + Math.min(0.5, (K.n - 1) * 0.025) + (team >= 3 ? 0.25 : team === 2 ? 0.15 : 0);
}

export function tickCombo(C, dt) {
  const K = C.comboState;
  if (!K) return;
  K.t -= dt; K.flash = Math.max(0, K.flash - dt);
  for (const [q, v] of K.who) K.who.set(q, v - dt);
}

export function drawCombo(ctx, C) {
  const K = C.comboState;
  if (!K || K.t <= 0 || K.n < 3) return;
  const P = C.party, W = P.display.w, H = P.display.h;
  const team = [...K.who.entries()].filter(([, v]) => v > 0).map(([q]) => q);
  const x = W - 12, y = C.comboY != null ? C.comboY : Math.round(H * 0.32);     // (the solo HUD puts it under the quest)
  const s = K.flash > 0 ? 3 : 2;
  const col = team.length >= 2 ? '#ffd66b' : '#fff3c4';
  drawText(ctx, t('COMBO'), x, y, { color: '#c9a2f0', align: 'right', outline: '#241a2e' });
  drawText(ctx, '×' + K.n, x, y + 10, { color: col, align: 'right', outline: '#241a2e', scale: s });
  const bw = 46, k = Math.max(0, K.t / 1.35);
  ctx.fillStyle = '#241a2e'; ctx.fillRect(x - bw - 1, y + 10 + s * 8 + 3, bw + 2, 4);
  ctx.fillStyle = col; ctx.fillRect(x - bw, y + 11 + s * 8 + 3, Math.round(bw * k), 2);
  if (team.length >= 2) {
    drawText(ctx, t('TEAM!'), x, y + 10 + s * 8 + 10, { color: '#ffd66b', align: 'right', outline: '#241a2e' });
    team.forEach((q, i) => { ctx.fillStyle = '#241a2e'; ctx.fillRect(x - 7 - i * 8, y + 10 + s * 8 + 21, 7, 7); ctx.fillStyle = q.color; ctx.fillRect(x - 6 - i * 8, y + 10 + s * 8 + 22, 5, 5); });
  }
}

// ------------------------------------------------------------------ heroes
export function stOfPlayer(f) { return f.st || (f.st = { burn: 0, chill: 0, poison: 0, poisonN: 0, tick: 0 }); }

export function applyToPlayer(C, q, elem, power = 0) {
  const f = q.fighter;
  if (!f || f.down || !elem) return;
  // (World v7: burns & poisons hurt as much as the land's monsters do)
  if (!power) power = C.statusPower ? C.statusPower(q) : 1;
  const s = stOfPlayer(f);
  if (elem === 'fire') s.burn = 2.6;
  else if (elem === 'ice') s.chill = 2.4;
  else if (elem === 'poison') { s.poison = 4; s.poisonN = Math.min(3, s.poisonN + 1); }
  else if (elem === 'shock') { f.hurtT = Math.max(f.hurtT || 0, 0.45); C.world.fx.emit('sparkle', q.pos.x, 1.3, q.pos.z, 6, { color: '#ffe066' }); }
  s.power = power;
}

export function tickPlayer(C, q, dt) {
  const f = q.fighter, s = f && f.st;
  if (!s || f.down) return;
  s.tick -= dt;
  const tickNow = s.tick <= 0;
  if (tickNow) s.tick = 0.5;
  const hurt = (n, color) => {
    f.hp -= n;
    C.popText(q.pos.x, 2.0, q.pos.z, '-' + Math.max(1, Math.round(n)), color);
    if (f.hp <= 0) { f.hp = 0; C.knockOut(q, null); }
  };
  if (s.burn > 0) { s.burn -= dt; if (tickNow) hurt(3 * (s.power || 1) * C.diff.dmg, '#ff9a3a'); if (Math.random() < dt * 12) C.world.fx.emit('sparkle', q.pos.x, 1 + Math.random() * 0.6, q.pos.z, 1, { color: '#ffb040' }); }
  if (s.poison > 0) { s.poison -= dt; if (tickNow) hurt(1.5 * s.poisonN * (s.power || 1) * C.diff.dmg, '#8fdc5a'); if (s.poison <= 0) s.poisonN = 0; if (Math.random() < dt * 5) C.world.fx.emit('smoke', q.pos.x, 1.4, q.pos.z, 1, { color: '#8fdc5a' }); }
  if (s.chill > 0) { s.chill -= dt; if (Math.random() < dt * 5) C.world.fx.emit('sparkle', q.pos.x, 1.4, q.pos.z, 1, { color: '#dff4ff' }); }
}

// little status pips over hurt enemies, and the finisher prompt
export function drawEnemyMarks(ctx, C, v) {
  const P = C.party;
  for (const e of C.enemies) {
    if (!e.alive || e.state === 'sleep') continue;
    const u = P.toUi(v, e.x, e.y + e.def.h + 0.25, e.z);
    const s = e.st;
    let x = Math.round(u.x) - 8;
    const y = Math.round(u.y) - 6;
    if (s) for (const [k, on] of [['fire', s.burn > 0], ['ice', s.chill > 0 || e.frozen > 0], ['poison', s.poison > 0]]) {
      if (!on) continue;
      ctx.fillStyle = '#241a2e'; ctx.fillRect(x - 1, y - 1, 5, 5);
      ctx.fillStyle = ELEMENTS[k].color; ctx.fillRect(x, y, 3, 3);
      x += 6;
    }
    // a shield bar
    if (e.shieldHp > 0 && e.def.shield) {
      const w = e.def.r > 0.45 ? 22 : 16, bx = Math.round(u.x - w / 2), by = Math.round(u.y) + 4;
      ctx.fillStyle = '#241a2e'; ctx.fillRect(bx - 1, by - 1, w + 2, 4);
      ctx.fillStyle = '#3a4a6a'; ctx.fillRect(bx, by, w, 2);
      ctx.fillStyle = '#9fc8ff'; ctx.fillRect(bx, by, Math.round(w * e.shieldHp / e.def.shield), 2);
    }
    if (e.elite) drawText(ctx, '★', u.x + 12, u.y - 8, { color: '#ffd66b', align: 'center', outline: '#241a2e' });
    // staggered: finish it!
    if (e.stagger > 0 && Math.floor(P.t * 6) % 2) drawText(ctx, '!', u.x, u.y - 18, { color: '#ffd66b', align: 'center', outline: '#241a2e', scale: 2 });
  }
}

void measure;
