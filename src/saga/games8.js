// Step mini-games (World v7, chapter 8), in the same frame as games7.js:
//   { do: ’net’, at: [x, z], r, n, per, flies, model(r3d) }
//      fireflies drift about; each glows and fades in turn — swing the net (A) at one
//      while it’s bright. n of them (+per for every hero after the first).
//   { do: ’carry’, from: [x, z], hooks: [[x, z]…], jar(r3d), hook(r3d) }
//      a cart of jars: A takes one (it slows you), A at an empty hook hangs it there and
//      it lights up. Every hook lit, and the step is done.
//   { do: ’rhythm’, at: [x, z], r, bpm, beats: [beat…], need }
//      notes slide along a lane to a ring: A as one reaches it. `need` of them (a share,
//      0..1) and the act is a hit — a miss too many and it starts over.
// Each run lives while its step does; `bot(S)` finishes it for the harness.

import { THREE } from '../render/r3d.js';
import { drawText } from '../engine/font.js';
import { audio } from '../engine/audio.js';
import { t } from '../i18n.js';

const rand = (a, b) => a + Math.random() * (b - a);

export const GAMES8 = {
  // ------------------------------------------------------------------ fireflies in a net
  net: {
    begin(G, R) {
      const st = R.st, K = G.P.r3d;
      R.caught = 0;
      R.flies = Array.from({ length: st.flies || 10 }, (_, i) => {
        const obj = st.model(K), a = rand(0, Math.PI * 2), d = rand(0, (st.r || 7) * 0.8);
        const f = { obj, x: st.at[0] + Math.cos(a) * d, z: st.at[1] + Math.sin(a) * d, y: rand(0.7, 1.8), vx: 0, vz: 0, ph: i * 0.9 + rand(0, 2), per: rand(2.2, 3.2), gone: 0 };
        R.root.add(obj);
        return f;
      });
    },
    need(G, R) { return R.st.n + Math.max(0, G.heroes().length - 1) * (R.st.per ?? 2); },
    bright(R, f) { return ((R.t + f.ph) % f.per) / f.per < 0.3; },
    update(G, R, dt, held) {
      const st = R.st;
      for (const f of R.flies) {
        if (f.gone > 0) { f.gone -= dt; f.obj.visible = false; if (f.gone <= 0) { const a = rand(0, 6.28), d = rand(0, (st.r || 7) * 0.8); f.x = st.at[0] + Math.cos(a) * d; f.z = st.at[1] + Math.sin(a) * d; } continue; }
        f.obj.visible = true;
        // (a lazy drift, turning now and then, kept inside the glade)
        if (!held) {
          f.vx += rand(-1, 1) * dt * 2; f.vz += rand(-1, 1) * dt * 2;
          const dx = f.x - st.at[0], dz = f.z - st.at[1], d = Math.hypot(dx, dz), R0 = st.r || 7;
          if (d > R0) { f.vx -= (dx / d) * dt * 3; f.vz -= (dz / d) * dt * 3; }
          const sp = Math.hypot(f.vx, f.vz); if (sp > 1.2) { f.vx *= 1.2 / sp; f.vz *= 1.2 / sp; }
          f.x += f.vx * dt; f.z += f.vz * dt;
        }
        const on = this.bright(R, f);
        f.obj.position.set(f.x, f.y + Math.sin(R.t * 2 + f.ph) * 0.2, f.z);
        if (f.obj.userData.glow) f.obj.userData.glow(on ? 1 : 0.15);
      }
    },
    near(G, R, p) {
      const f = R.flies.filter((q) => q.gone <= 0).sort((a, b) => Math.hypot(a.x - p.pos.x, a.z - p.pos.z) - Math.hypot(b.x - p.pos.x, b.z - p.pos.z))[0];
      if (!f || Math.hypot(f.x - p.pos.x, f.z - p.pos.z) > 1.6) return null;
      return { kind: 'secret', label: 'Swing the net', hint: 'Swing when it glows!', use: () => this.swing(G, R, f, p) };
    },
    swing(G, R, f, p) {
      const P = G.P;
      audio.sfx('whoosh', { volume: 0.5, pitch: 6 });
      if (!this.bright(R, f)) {
        // (too early: it darts off)
        f.vx = (f.x - p.pos.x) * 3; f.vz = (f.z - p.pos.z) * 3;
        if (P.combat) P.combat.popText(f.x, f.y + 0.6, f.z, t('Too dark — wait for the glow!'), '#c9d8ff');
        return;
      }
      f.gone = 1.4; R.caught++;
      audio.sfx('chime', { volume: 0.6, pitch: 5 + (R.caught % 5) * 2 });
      P.world.fx.emit('sparkle', f.x, f.y, f.z, 10, { color: '#e8ff8a' });
      if (P.combat) P.combat.popText(f.x, f.y + 0.6, f.z, t('Caught!'), '#e8ff8a');
      G.S.refreshCard();
      if (R.caught >= this.need(G, R)) { audio.jingle('questDone'); G.win(R); }
    },
    obj(G, R) { return t(' ({n}/{total})', { n: R.caught, total: this.need(G, R) }); },
    target(G, R) { return { x: R.st.at[0], z: R.st.at[1] }; },
  },

  // ------------------------------------------------------------------ jars to their hooks
  carry: {
    begin(G, R) {
      const st = R.st, K = G.P.r3d, S = G.S;
      R.held = new Map();          // hero → the jar model they carry
      R.hooks = st.hooks.map(([x, z], i) => {
        const obj = st.hook(K), lit = !!S.st.got[R.qid + ':hook:' + i];
        obj.position.set(x, G.y(x, z), z); R.root.add(obj);
        const H = { i, x, z, obj, lit, jar: null, src: null };
        if (lit) this.hang(G, R, H, true);
        return H;
      });
    },
    end(G, R) {
      for (const [p, jar] of R.held) { if (jar.parent) jar.parent.remove(jar); if (p.actor) p.actor.speedMul = 1; }
      const L = G.P.lighting;
      if (L) L.sources = L.sources.filter((s) => !s.gameJar);
    },
    hang(G, R, H, quiet = false) {
      H.lit = true;
      const jar = R.st.jar(G.P.r3d);
      jar.position.set(H.x, G.y(H.x, H.z) + 1.9, H.z + 0.15); R.root.add(jar); H.jar = jar;
      const L = G.P.lighting;
      if (L && !H.src) { H.src = { x: H.x, y: 2.1, z: H.z + 0.3, color: 0xd8ff8a, power: 1.2, dist: 6, lamp: true, gameJar: true }; L.sources.push(H.src); }
      if (!quiet) { G.P.world.fx.emit('sparkle', H.x, 2, H.z, 14, { color: '#e8ff8a' }); audio.sfx('chime', { volume: 0.6, pitch: 7 }); }
    },
    update(G, R, dt, held) {
      for (const [p, jar] of R.held) {
        if (!G.heroes().includes(p)) { if (jar.parent) jar.parent.remove(jar); R.held.delete(p); continue; }
        // (held up in front, bobbing)
        jar.position.set(p.pos.x + 0.35, (p.actor.baseY || 0) + (p.actor.jumpY || 0) + 1.25 + Math.sin(R.t * 6) * 0.04, p.pos.z + 0.2);
        if (p.actor) p.actor.speedMul = 0.8;
      }
      for (const H of R.hooks) if (H.jar) H.jar.rotation.z = Math.sin(R.t * 1.4 + H.i) * 0.08;
      void held; void dt;
    },
    near(G, R, p) {
      const st = R.st, carrying = R.held.has(p);
      if (!carrying && Math.hypot(p.pos.x - st.from[0], p.pos.z - st.from[1]) < 2.2 && R.hooks.some((H) => !H.lit)) {
        return { kind: 'secret', label: 'Take a jar', hint: 'A jar of fireflies — moths can’t eat that light', use: () => this.take(G, R, p) };
      }
      if (carrying) {
        const H = R.hooks.find((q) => !q.lit && Math.hypot(q.x - p.pos.x, q.z - p.pos.z) < 1.6);
        if (H) return { kind: 'secret', label: 'Hang it', hint: 'Hang the jar on the hook', use: () => this.put(G, R, H, p) };
      }
      return null;
    },
    take(G, R, p) {
      if (R.held.has(p)) return;
      const jar = R.st.jar(G.P.r3d);
      R.root.add(jar); R.held.set(p, jar);
      audio.sfx('pickup', { volume: 0.6 });
    },
    put(G, R, H, p) {
      const jar = R.held.get(p);
      if (!jar || H.lit) return;
      if (jar.parent) jar.parent.remove(jar);
      R.held.delete(p); if (p.actor) p.actor.speedMul = 1;
      this.hang(G, R, H);
      G.S.st.got[R.qid + ':hook:' + H.i] = 1; G.S.save();
      const n = R.hooks.filter((q) => q.lit).length;
      G.S.refreshCard();
      if (n >= R.hooks.length) { audio.jingle('questDone'); G.win(R); }
      else G.P.toast(t('Jar {n}/{total}', { n, total: R.hooks.length }), '#e8ff8a');
    },
    obj(G, R) { return t(' ({n}/{total})', { n: R.hooks.filter((q) => q.lit).length, total: R.hooks.length }); },
    target(G, R) {
      const anyHeld = R.held.size > 0, H = R.hooks.find((q) => !q.lit);
      return anyHeld && H ? { x: H.x, z: H.z } : { x: R.st.from[0], z: R.st.from[1] };
    },
  },

  // ------------------------------------------------------------------ leaf piles to jump in
  // { do: ’piles’, piles: [[x, z]…], find: n, model(r3d, i), finds: [text…] }
  //   land a jump on a pile and it bursts; the n-th one burst holds what you’re after
  piles: {
    begin(G, R) {
      const st = R.st, K = G.P.r3d, S = G.S;
      R.air = new Map(); R.burst = 0;
      // (a pile never sits under a tree: the nearest clear ground)
      const col = G.P.big && G.P.big.col, clear = (x, z) => !col || !col.blocked(x, z, 0.7);
      R.piles = st.piles.map(([x0, z0], i) => {
        let x = x0, z = z0;
        for (let r = 0.5; r <= 4 && !clear(x, z); r += 0.5) for (let a = 0; a < 6.28 && !clear(x, z); a += 0.8) { if (clear(x0 + Math.cos(a) * r, z0 + Math.sin(a) * r)) { x = x0 + Math.cos(a) * r; z = z0 + Math.sin(a) * r; } }
        const done = !!S.st.got[R.qid + ':pile:' + i], obj = st.model(K, i);
        obj.position.set(x, G.y(x, z), z); obj.visible = !done; R.root.add(obj);
        if (done) R.burst++;
        return { i, x, z, obj, done };
      });
    },
    update(G, R, dt, held) {
      if (held) return;
      for (const p of G.heroes()) {
        const air = !!(p.actor && p.actor.airborne), was = R.air.get(p);
        R.air.set(p, air);
        if (!was || air) continue;
        const L = R.piles.find((q) => !q.done && Math.hypot(q.x - p.pos.x, q.z - p.pos.z) < 1.1);
        if (L) this.burst(G, R, L, p);
      }
      for (const L of R.piles) if (!L.done) L.obj.rotation.y = Math.sin(R.t * 0.8 + L.i) * 0.05;
    },
    burst(G, R, L, p) {
      const P = G.P, st = R.st;
      L.done = true; L.obj.visible = false; R.burst++;
      G.S.st.got[R.qid + ':pile:' + L.i] = 1; G.S.save();
      P.world.fx.emit('burst', L.x, 0.4, L.z, 18);
      audio.sfx('dig', { volume: 0.7, pitch: 6 }); audio.sfx('boing', { volume: 0.4, pitch: 4 });
      if (R.burst >= (st.find || 5)) {
        if (P.combat) P.combat.popText(L.x, 1.8, L.z, t(st.found || 'Found it!'), '#ffe08a', true);
        audio.jingle('questDone');
        G.win(R);
      } else if (P.combat) P.combat.popText(L.x, 1.6, L.z, t((st.finds || ['Just leaves.'])[(R.burst - 1) % (st.finds || ['x']).length]), '#fff7e6');
      G.S.refreshCard();
    },
    near(G, R, p) {
      const L = R.piles.find((q) => !q.done && Math.hypot(q.x - p.pos.x, q.z - p.pos.z) < 1.6);
      return L ? { kind: 'secret', label: 'Jump in', hint: 'Land a jump on the pile!', use: () => this.burst(G, R, L, p) } : null;
    },
    obj(G, R) { return t(' ({n}/{total})', { n: R.burst, total: R.piles.length }); },
    target(G, R) { const L = R.piles.find((q) => !q.done); return L ? { x: L.x, z: L.z } : null; },
  },

  // ------------------------------------------------------------------ keep the beat
  rhythm: {
    begin(G, R) { R.state = 'idle'; R.wait = 0; R.hitsBy = new Map(); },
    reset(G, R) {
      const st = R.st, spb = 60 / (st.bpm || 100);
      R.notes = (st.beats || []).map((b) => ({ t: 1.6 + b * spb, hit: false, miss: false }));
      R.clock = 0; R.hits = 0; R.misses = 0; R.fx = [];
      R.dur = (R.notes.length ? R.notes[R.notes.length - 1].t : 4) + 1.2;
    },
    update(G, R, dt, held) {
      const st = R.st, P = G.P, heroes = G.heroes();
      if (held) return;
      const on = heroes.some((p) => Math.hypot(p.pos.x - st.at[0], p.pos.z - st.at[1]) < (st.r || 6));
      if (R.state === 'idle') {
        R.wait -= dt;
        if (on && R.wait <= 0) { this.reset(G, R); R.state = 'run'; P.showBanner(t(st.go || 'Keep the beat!'), t('press {a} as each note reaches the ring', { a: P.keyName('a') })); audio.sfx('whistle', { volume: 0.6 }); if (st.onStart) st.onStart(G.S); }
        return;
      }
      R.clock += dt;
      // (a press from anyone: the nearest note in reach is theirs)
      for (const p of heroes) {
        if (!(p.input && p.input.pressed('interact'))) continue;
        const n = R.notes.find((q) => !q.hit && !q.miss && Math.abs(q.t - R.clock) < 0.2);
        if (n) {
          n.hit = true; R.hits++;
          const good = Math.abs(n.t - R.clock) < 0.09;
          R.fx.push({ t: 0.5, text: good ? t('Perfect!') : t('Good'), col: good ? '#ffe08a' : '#b8f0a0' });
          audio.sfx('pluck', { volume: 0.55, pitch: [0, 4, 7, 12][R.hits % 4] });
          if (st.onHit) st.onHit(G.S, R.hits);
        }
        if (p.input.edges) p.input.edges.delete('interact');
      }
      for (const n of R.notes) if (!n.hit && !n.miss && R.clock - n.t > 0.22) { n.miss = true; R.misses++; R.fx.push({ t: 0.5, text: t('Miss'), col: '#ff9a8a' }); if (st.onMiss) st.onMiss(G.S); }
      R.fx = R.fx.filter((f) => (f.t -= dt) > 0);
      if (R.clock >= R.dur) {
        const share = R.hits / Math.max(1, R.notes.length);
        if (share >= (st.need || 0.6)) { R.state = 'done'; audio.jingle('questDone'); G.win(R); }
        else { R.state = 'idle'; R.wait = 2; P.toast(t(st.fail || 'The crowd shuffles its feet… from the top!', { n: R.hits, total: R.notes.length }), '#ff9a8a'); audio.sfx('error', { volume: 0.5 }); }
        G.S.refreshCard();
      }
    },
    near(G, R, p) {
      // (A keeps the beat on the stage: nothing else answers it)
      if (R.state !== 'run' || Math.hypot(p.pos.x - R.st.at[0], p.pos.z - R.st.at[1]) > (R.st.r || 6)) return null;
      return { kind: 'secret', label: 'Beat', hint: 'Press as the note reaches the ring', use: () => {} };
    },
    obj(G, R) { return R.state === 'run' ? t(' ({n}/{total})', { n: R.hits, total: R.notes.length }) : ''; },
    target(G, R) { return { x: R.st.at[0], z: R.st.at[1] }; },
    // the lane, across the bottom of the screen
    drawUi(G, R, ctx, W, H) {
      if (R.state !== 'run') return;
      const w = Math.min(300, W - 40), x0 = Math.round(W / 2 - w / 2), y = H - 58, ring = x0 + 24, speed = 90;
      ctx.fillStyle = 'rgba(30,20,40,0.78)'; ctx.fillRect(x0 - 4, y - 12, w + 8, 24);
      ctx.fillStyle = '#5a4a6a'; ctx.fillRect(x0, y - 1, w, 2);
      // the ring
      ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ring, y, 8, 0, Math.PI * 2); ctx.stroke();
      for (const n of R.notes) {
        if (n.hit) continue;
        const nx = Math.round(ring + (n.t - R.clock) * speed);
        if (nx < x0 - 6 || nx > x0 + w + 6) continue;
        ctx.fillStyle = n.miss ? '#6a5a6a' : '#ff9ab0';
        ctx.fillRect(nx - 4, y - 4, 8, 8);
        ctx.fillStyle = '#fff4f8'; ctx.fillRect(nx - 2, y - 3, 3, 2);
      }
      const f = R.fx[R.fx.length - 1];
      if (f) drawText(ctx, f.text, ring, y - 24, { color: f.col, align: 'center', outline: '#241a2e' });
    },
  },
};
void THREE;
