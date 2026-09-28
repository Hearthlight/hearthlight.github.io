// Step mini-games (World v7, chapter 9), in the same frame as games7.js:
//   { do: ’seek’, ghosts: [{ id, at: [x, z], lines: [text…], look }], reveal, near, verb }
//      ghosts nobody can see — until a lantern comes within `reveal` tiles. Then they
//      fade in; A beside one hears what it has to say. Every ghost heard, and it’s done.
//   { do: ’snap’, spots: [{ at: [x, z], period, burst, twin }], r }
//      geysers erupting on their own rhythms; near one, a gauge shows the spray — press A
//      while it’s in the gold band (the peak) to catch its rainbow. One from each.
//   { do: ’defend’, at: [x, z], r, time, hp, every, foes: [type…], level, model(r3d) }
//      a machine charging in the open: while a hero is near, its charge climbs; gloom
//      comes in waves and goes for it (whoever isn’t fighting a hero walks on it). Charged,
//      and it’s done; knocked over, and it starts again.
//   { do: ’chase’, area: [x, z, r], speed, tire, model(r3d) }
//      a critter that runs from the nearest hero, round and round inside the area; it tires
//      as it runs. Get beside it (A) to catch it.
// Each run lives while its step does; `bot(S)` finishes it for the harness.

import { THREE } from '../render/r3d.js';
import { CharModel } from '../models/chars.js';
import { NPCS } from '../data/npcs.js';
import { drawText } from '../engine/font.js';
import { audio } from '../engine/audio.js';
import { t } from '../i18n.js';
import { GEYSER_HUSH } from '../models/landmarks.js';

const rand = (a, b) => a + Math.random() * (b - a);

// a see-through, pale-blue version of someone (every material its own)
export function ghostModel(r3d, look, scale = 1) {
  const m = new CharModel(r3d, look, { scale });
  const pale = new THREE.Color('#b8d8ff'), glow = new THREE.Color('#5a7ab8');
  const ghost = (mt) => { const c = mt.clone(); c.transparent = true; c.depthWrite = false; c.opacity = 0.55; if (c.color) c.color.lerp(pale, 0.55); if (c.emissive) { c.emissive = glow.clone(); c.emissiveIntensity = 0.35; } return c; };
  m.root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    o.material = Array.isArray(o.material) ? o.material.map(ghost) : ghost(o.material);
    o.castShadow = false;
  });
  if (m.blob) m.blob.visible = false;
  m.setAlpha = (a) => m.root.traverse((o) => { if (o.isMesh && o.material) for (const mt of [].concat(o.material)) mt.opacity = a; });
  return m;
}

export const GAMES9 = {
  // ------------------------------------------------------------------ ghosts in the lantern’s light
  seek: {
    begin(G, R) {
      const st = R.st, S = G.S;
      R.ghosts = st.ghosts.map((gh, i) => {
        // (`solid`: real people lost in the steam — hidden by it, not see-through)
        const d = NPCS[gh.id], look = gh.look || (d && d.look) || {}, sc = (d && d.scale) || 1;
        let m;
        if (st.solid) { m = new CharModel(G.P.r3d, look, { scale: sc }); m.setAlpha = (a) => { m.root.visible = a > 0.3; }; }
        else m = ghostModel(G.P.r3d, look, sc);
        const [x, z] = gh.at;
        m.root.position.set(x, G.y(x, z), z); R.root.add(m.root);
        return { ...gh, i, x, z, m, a: 0, heard: !!S.st.got[R.qid + ':ghost:' + i], seen: false, ph: rand(0, 6) };
      });
    },
    update(G, R, dt) {
      const st = R.st, heroes = G.heroes();
      for (const g of R.ghosts) {
        const near = heroes.some((p) => Math.hypot(p.pos.x - g.x, p.pos.z - g.z) < (st.reveal || 4.5));
        const want = st.solid ? (g.heard ? 0 : near ? 1 : 0) : g.heard ? (near ? 0.25 : 0) : near ? 0.62 : 0;
        g.a += (want - g.a) * Math.min(1, dt * 3);
        g.m.root.visible = g.a > 0.02; g.m.setAlpha(g.a);
        g.m.root.position.y = G.y(g.x, g.z) + 0.25 + Math.sin(R.t * 1.6 + g.ph) * 0.12;
        const p = heroes.slice().sort((a, b) => Math.hypot(a.pos.x - g.x, a.pos.z - g.z) - Math.hypot(b.pos.x - g.x, b.pos.z - g.z))[0];
        if (p) g.m.setFacing(Math.atan2(p.pos.x - g.x, p.pos.z - g.z));
        g.m.update(dt, { moving: false, expr: st.solid ? 'worried' : 'sad' });
        if (near && !g.seen) { g.seen = true; audio.sfx('chime', { volume: 0.4, pitch: -5 }); G.P.world.fx.emit('sparkle', g.x, 1.4, g.z, 10, { color: '#c8e0ff' }); }
        // (a cold breath now and then, even unseen: something is out there — or steam, thick round the lost)
        if (st.solid) { if (Math.random() < dt * 6) G.P.world.fx.emit('smoke', g.x + rand(-2, 2), 0.3, g.z + rand(-1.5, 1.5), 1, { color: '#f4f4f8' }); }
        else if (!g.heard && Math.random() < dt * 0.5) G.P.world.fx.emit('sparkle', g.x + rand(-0.5, 0.5), 1 + Math.random(), g.z, 1, { color: '#b8d0f0' });
      }
    },
    near(G, R, p) {
      const g = R.ghosts.find((q) => !q.heard && q.a > 0.3 && Math.hypot(q.x - p.pos.x, q.z - p.pos.z) < 1.8);
      if (!g) return null;
      return { kind: 'secret', label: R.st.verb || 'Listen', hint: R.st.solid ? 'Someone lost in the steam' : 'A ghost — it’s trying to say something', use: () => this.listen(G, R, g) };
    },
    async listen(G, R, g) {
      const S = G.S;
      if (g.heard || R.busy) return;
      R.busy = true;
      try { for (const line of g.lines) await S.say(g.id, line, { expr: 'sad' }); } finally { R.busy = false; }
      g.heard = true; S.st.got[R.qid + ':ghost:' + g.i] = 1; S.save();
      audio.sfx('chime', { volume: 0.6, pitch: 4 });
      G.P.world.fx.emit('sparkle', g.x, 1.6, g.z, 16, { color: '#e8f0ff' });
      S.refreshCard();
      if (R.ghosts.every((q) => q.heard)) { audio.jingle('questDone'); G.win(R); }
    },
    obj(G, R) { return t(' ({n}/{total})', { n: R.ghosts.filter((q) => q.heard).length, total: R.ghosts.length }); },
    target(G, R) { return R.st.near ? { x: R.st.near[0], z: R.st.near[1] } : null; },
  },

  // ------------------------------------------------------------------ a rainbow at the peak
  snap: {
    begin(G, R) {
      const st = R.st, S = G.S, K = G.P.r3d;
      // (the landmark geysers under these spots hold their own bursts: one spray, the step’s)
      for (const sp of st.spots) GEYSER_HUSH.push(sp.at);
      R.spots = st.spots.map((sp, i) => {
        const [x, z] = sp.at, col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 1, 10), new THREE.MeshBasicMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0.75, depthWrite: false }));
        col.position.set(x, 0, z); col.frustumCulled = false; R.root.add(col);
        const bow = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.08, 6, 24, Math.PI), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, vertexColors: false }));
        bow.position.set(x, 0, z); R.root.add(bow);
        void K;
        return { ...sp, i, x, z, col, bow, h: 0, got: !!S.st.got[R.qid + ':snap:' + i], cool: 0 };
      });
    },
    end(G, R) { for (const sp of R.st.spots) { const i = GEYSER_HUSH.indexOf(sp.at); if (i >= 0) GEYSER_HUSH.splice(i, 1); } },
    // (the spray’s height, 0..1: each geyser keeps its own rhythm)
    height(R, sp) {
      const per = sp.period || 5, u = ((R.t + (sp.phase || 0)) % per) / per, burst = sp.burst || 0.3;
      const k = (v, a, w) => (v > a && v < a + w ? Math.sin(((v - a) / w) * Math.PI) : 0);
      return Math.max(k(u, 1 - burst, burst), sp.twin ? k(u, 1 - burst * 2.3, burst * 0.9) * 0.95 : 0);
    },
    update(G, R, dt) {
      for (const sp of R.spots) {
        sp.h = this.height(R, sp); sp.cool -= dt;
        const H = 0.2 + sp.h * 7;
        sp.col.scale.set(1 + sp.h * 0.3, H, 1 + sp.h * 0.3); sp.col.position.y = H / 2; sp.col.visible = sp.h > 0.02;
        if (sp.h > 0.1 && Math.random() < dt * 12) G.P.world.fx.emit('water', sp.x + rand(-0.4, 0.4), H, sp.z, 2);
        sp.bow.material.opacity = Math.max(0, sp.bow.material.opacity - dt * 0.6);
        sp.bow.position.y = 1.5 + sp.h * 5;
      }
    },
    near(G, R, p) {
      const sp = R.spots.find((q) => !q.got && Math.hypot(q.x - p.pos.x, q.z - p.pos.z) < (R.st.r || 4.5));
      return sp ? { kind: 'secret', label: 'Catch the rainbow', hint: 'Press at the spray’s peak!', use: () => this.snap(G, R, sp, p) } : null;
    },
    snap(G, R, sp, p) {
      if (sp.got || sp.cool > 0) return;
      const P = G.P;
      if (sp.h >= 0.8) {
        sp.got = true; G.S.st.got[R.qid + ':snap:' + sp.i] = 1; G.S.save();
        sp.bow.material.opacity = 1;
        for (const [k, c] of ['#ff6a6a', '#ffb04a', '#ffe06a', '#8fe08a', '#6ab0ff', '#a87aff'].entries()) P.world.fx.emit('sparkle', sp.x - 1.2 + k * 0.5, 2 + sp.h * 5, sp.z, 4, { color: c });
        audio.sfx('chord', { volume: 0.7 }); audio.sfx('chime', { volume: 0.5, pitch: 12 });
        if (P.combat) P.combat.popText(sp.x, 3 + sp.h * 5, sp.z, t('A rainbow, caught!'), '#ffe08a', true);
        G.S.refreshCard();
        if (R.spots.every((q) => q.got)) { audio.jingle('questDone'); G.win(R); }
      } else {
        sp.cool = 0.8;
        audio.sfx('error', { volume: 0.4 });
        if (P.combat) P.combat.popText(sp.x, 2.4, sp.z, sp.h > 0.3 ? t('Too soon — wait for the peak!') : t('Nothing but steam…'), '#c9d8ff');
      }
      void p;
    },
    obj(G, R) { return t(' ({n}/{total})', { n: R.spots.filter((q) => q.got).length, total: R.spots.length }); },
    target(G, R) { const sp = R.spots.find((q) => !q.got); return sp ? { x: sp.x, z: sp.z } : null; },
    // (the gauge over whoever stands by an uncaught geyser)
    draw(G, R, ctx, v) {
      for (const p of G.heroes()) {
        const sp = R.spots.find((q) => !q.got && Math.hypot(q.x - p.pos.x, q.z - p.pos.z) < (R.st.r || 4.5));
        if (!sp) continue;
        const u = G.P.toUi(v, p.pos.x, 2.4 + (p.actor.baseY || 0), p.pos.z), x = Math.round(u.x + 12), y = Math.round(u.y - 30);
        ctx.fillStyle = '#241a2e'; ctx.fillRect(x - 1, y - 1, 6, 26);
        ctx.fillStyle = '#4a3a5a'; ctx.fillRect(x, y, 4, 24);
        ctx.fillStyle = '#e0b040'; ctx.fillRect(x, y, 4, Math.round(24 * 0.2));
        const hh = Math.round(24 * sp.h);
        ctx.fillStyle = sp.h >= 0.8 ? '#fff4a0' : '#9fd8ff'; ctx.fillRect(x, y + 24 - hh, 4, hh);
      }
    },
  },

  // ------------------------------------------------------------------ hold the square while it charges
  defend: {
    begin(G, R) {
      const st = R.st, [x, z] = st.at;
      R.obj = st.model(G.P.r3d); R.obj.position.set(x, G.y(x, z), z); R.root.add(R.obj);
      this.reset(G, R, true);
    },
    reset(G, R, first = false) {
      R.charge = 0; R.hp = R.st.hp || 100; R.spawnT = 2; R.state = 'idle';
      const C = G.P.combat;
      if (C && !first) for (const e of C.enemies) if (e.alive && e.sagaTag === 'defend') { e.alive = false; e.fading = 0.3; }
    },
    end(G, R) { const C = G.P.combat; if (C) for (const e of C.enemies) if (e.alive && e.sagaTag === 'defend') { e.alive = false; e.fading = 0.3; } },
    update(G, R, dt, held) {
      const st = R.st, P = G.P, C = P.combat, [x, z] = st.at, heroes = G.heroes();
      if (R.obj.userData.anim) R.obj.userData.anim(R.t, R.charge);
      if (held) return;
      const near = heroes.some((p) => Math.hypot(p.pos.x - x, p.pos.z - z) < (st.r || 8));
      if (R.state === 'idle') { if (near) { R.state = 'run'; P.showBanner(t(st.go || 'Hold them off!'), t(st.sub || 'keep the gloom off it while it charges')); audio.sfx('whistle', { volume: 0.7 }); } return; }
      if (R.state !== 'run') return;
      if (near) R.charge = Math.min(1, R.charge + dt / (st.time || 45));
      // waves: from the square’s edges
      R.spawnT -= dt;
      const live = C ? C.enemies.filter((e) => e.alive && e.sagaTag === 'defend') : [];
      if (C && R.spawnT <= 0 && live.length < 3 + heroes.length * 2) {
        R.spawnT = (st.every || 5) / Math.sqrt(Math.max(1, heroes.length));
        const n = 1 + Math.floor(heroes.length / 2) + (R.charge > 0.5 ? 1 : 0);
        for (let k = 0; k < n; k++) {
          const a = rand(0, Math.PI * 2), r = (st.r || 8) + 2;
          const e = C.spawn(st.foes[Math.floor(Math.random() * st.foes.length)], x + Math.cos(a) * r, z + Math.sin(a) * r, { level: st.level || 38, quiet: true });
          e.saga = true; e.sagaTag = 'defend';
        }
      }
      // (whoever isn’t busy with a hero walks on the machine — and hits it)
      for (const e of live) {
        const busy = heroes.some((p) => Math.hypot(p.pos.x - e.x, p.pos.z - e.z) < 2.5);
        const dx = x - e.x, dz = z - e.z, d = Math.hypot(dx, dz) || 1;
        if (!busy && d > 1.3 && C) C.moveEnemy(e, (dx / d) * e.def.speed * 0.9 * dt, (dz / d) * e.def.speed * 0.9 * dt, true);
        if (d < 1.5) { e.hitT = (e.hitT || 0) - dt; if (e.hitT <= 0) { e.hitT = 1.2; R.hp -= 8; P.world.fx.emit('smoke', x, 1.2, z, 5, { color: '#6a4a8e' }); audio.sfx('bonk', { volume: 0.5 }); } }
      }
      if (R.hp <= 0) {
        P.toast(t(st.lost || 'The machine’s knocked over! It’s set up again — from the start.'), '#ff9a8a');
        audio.sfx('error', { volume: 0.6 });
        this.reset(G, R); R.state = 'idle';
        return;
      }
      if (R.charge >= 1) {
        R.state = 'done';
        for (const e of live) { e.alive = false; e.fading = 0.4; P.world.fx.emit('smoke', e.x, 1, e.z, 6, { color: '#6a4a8e' }); }
        audio.jingle('questDone');
        G.win(R);
      }
      G.S.refreshCard();
    },
    obj(G, R) { return R.state === 'run' ? t(' — {n}%', { n: Math.floor(R.charge * 100) }) : ''; },
    target(G, R) { return { x: R.st.at[0], z: R.st.at[1] }; },
    draw(G, R, ctx, v) {
      if (R.state !== 'run') return;
      const [x, z] = R.st.at, u = G.P.toUi(v, x, 3.2, z), w = 40, bx = Math.round(u.x - w / 2), by = Math.round(u.y - 18);
      ctx.fillStyle = '#241a2e'; ctx.fillRect(bx - 1, by - 1, w + 2, 10);
      ctx.fillStyle = '#3a2a4a'; ctx.fillRect(bx, by, w, 4); ctx.fillRect(bx, by + 5, w, 3);
      ctx.fillStyle = '#ffd66b'; ctx.fillRect(bx, by, Math.round(w * R.charge), 4);
      ctx.fillStyle = R.hp > 40 ? '#8fd67a' : '#ff6a5a'; ctx.fillRect(bx, by + 5, Math.round(w * Math.max(0, R.hp) / (R.st.hp || 100)), 3);
    },
  },

  // ------------------------------------------------------------------ catch the runaway
  chase: {
    begin(G, R) {
      const st = R.st, [x, z] = st.area;
      R.obj = st.model(G.P.r3d); R.root.add(R.obj);
      R.x = x; R.z = z; R.dx = 0; R.dz = 1; R.run = 0; R.caught = false; R.hop = 0;
    },
    update(G, R, dt, held) {
      const st = R.st, [ax, az, ar] = st.area, heroes = G.heroes();
      if (!held && !R.caught) {
        const p = heroes.slice().sort((a, b) => Math.hypot(a.pos.x - R.x, a.pos.z - R.z) - Math.hypot(b.pos.x - R.x, b.pos.z - R.z))[0];
        const d = p ? Math.hypot(p.pos.x - R.x, p.pos.z - R.z) : 99;
        const tired = Math.min(0.7, R.run / (st.tire || 25));
        let vx = 0, vz = 0;
        if (d < 6) {
          // (away from the hero, bent along the edge of the area so it circles instead of sticking)
          vx = (R.x - p.pos.x) / d; vz = (R.z - p.pos.z) / d;
          const ex = R.x - ax, ez = R.z - az, ed = Math.hypot(ex, ez);
          if (ed > ar * 0.75) { const tx = -ez / ed, tz = ex / ed, side = Math.sign(tx * vx + tz * vz) || 1; vx = vx * 0.3 + tx * side; vz = vz * 0.3 + tz * side; vx -= (ex / ed) * 0.4; vz -= (ez / ed) * 0.4; }
          const l = Math.hypot(vx, vz) || 1, sp = (st.speed || 5.2) * (1 - tired);
          vx = (vx / l) * sp; vz = (vz / l) * sp;
          R.run += dt;
          if (Math.random() < dt * 2) audio.sfx(st.sound || 'chirp', { volume: 0.4, pitch: rand(-2, 6) });
        }
        R.x += vx * dt; R.z += vz * dt;
        const ex = R.x - ax, ez = R.z - az, ed = Math.hypot(ex, ez);
        if (ed > ar) { R.x = ax + (ex / ed) * ar; R.z = az + (ez / ed) * ar; }
        if (Math.hypot(vx, vz) > 0.1) { R.dx = vx; R.dz = vz; }
        R.hop += dt * (Math.hypot(vx, vz) > 0.1 ? 12 : 3);
      }
      R.obj.position.set(R.x, G.y(R.x, R.z) + Math.abs(Math.sin(R.hop)) * 0.25, R.z);
      R.obj.rotation.y = Math.atan2(R.dx, R.dz);
      if (R.obj.userData.anim) R.obj.userData.anim(R.t, R.caught);
    },
    near(G, R, p) {
      if (R.caught || Math.hypot(R.x - p.pos.x, R.z - p.pos.z) > 1.2) return null;
      return { kind: 'secret', label: 'Catch', hint: 'Grab it!', use: () => this.catch(G, R, p) };
    },
    catch(G, R, p) {
      if (R.caught) return;
      R.caught = true;
      audio.sfx('pickup', { volume: 0.7 }); audio.jingle('questDone');
      G.P.world.fx.emit('sparkle', R.x, 1, R.z, 14, { color: '#ffe08a' });
      if (G.P.combat) G.P.combat.popText(R.x, 1.6, R.z, t(R.st.caught || 'Caught!'), '#ffe08a', true);
      G.win(R);
      void p;
    },
    obj(G, R) { return ''; },
    target(G, R) { return { x: R.x, z: R.z }; },
  },
};
void drawText;
