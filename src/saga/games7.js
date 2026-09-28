// Step mini-games (World v7, chapter 7): things done with feet and hands, in solo
// and in Party alike.
//   { do: ’whack’, at: [x, z], r, holes: [[x, z]…], n, per, time, up, every, model(r3d) }
//      gloom barnacles pop up out of their holes: stomp them (land a jump on one)
//      or whack them (A) before they sink back. n of them before the time runs out
//      (+per for every hero after the first); step into the ring to start, and a
//      round that runs out starts over.
//   { do: ’lamps’, lamps: [[x, z]…], start: [x, z], light, glow, moths: { every, max },
//     model(r3d) }
//      a town in the dark: relight its lamps (A at one). Away from their light your
//      lantern gutters — run dry and you’re back at the last lamp you lit — and
//      murk moths come for it in the dark (each nibble costs light).
//   { do: ’kite’, at: [x, z], r, climb, gust, model(r3d) }
//      a kite for every hero on the field: hold A to reel in, let go to let it out;
//      keep the string’s pull in the green band and it climbs. Everyone’s kite up
//      above the fog, and the step is done.
// Each run lives while its step does; `bot(S)` on a step finishes it for the harness.

import { THREE } from '../render/r3d.js';
import { drawText } from '../engine/font.js';
import { audio } from '../engine/audio.js';
import { t } from '../i18n.js';
import { GAMES8 } from './games8.js';
import { GAMES9 } from './games9.js';

const rand = (a, b) => a + Math.random() * (b - a);

export class StepGames {
  constructor(saga) { this.S = saga; this.runs = new Map(); }
  get P() { return this.S.P; }
  heroes() { const P = this.P; return P.players.filter((p) => (p.connected || this.S.solo) && !p.away); }
  held() { const S = this.S, P = this.P; return P.busy > 0 || P.dialogue.active || (S.stage && S.stage.active) || !!S.running; }
  y(x, z) { const w = this.P.world; return w.groundY ? w.groundY({ x, z }) : 0; }

  begin(qid, st) {
    if (this.runs.has(qid) || !GAMES[st.do]) return;
    const R = { qid, st, root: new THREE.Group(), t: 0 };
    this.P.world.over.root.add(R.root);
    // (a game that can't set itself up is dropped, not left half-built)
    try { GAMES[st.do].begin(this, R); } catch (e) { this.P.world.over.root.remove(R.root); throw e; }
    this.runs.set(qid, R);
  }
  end(qid) {
    const R = this.runs.get(qid);
    if (!R) return;
    if (GAMES[R.st.do].end) GAMES[R.st.do].end(this, R);
    if (R.root.parent) R.root.parent.remove(R.root);
    this.runs.delete(qid);
  }
  dispose() { for (const qid of [...this.runs.keys()]) this.end(qid); }

  update(dt) {
    const held = this.held();
    for (const R of [...this.runs.values()]) {
      if (this.S.stepDef(R.qid) !== R.st) { this.end(R.qid); continue; }
      R.t += dt;
      GAMES[R.st.do].update(this, R, dt, held);
    }
  }
  // (the step is won: on to the next one)
  win(R) { if (this.S.stepDef(R.qid) === R.st && !this.S.running) this.S.runStep(R.qid); }

  nearThing(p) {
    for (const R of this.runs.values()) { const f = GAMES[R.st.do].near; const th = f && f(this, R, p); if (th) return th; }
    return null;
  }
  objText(qid) { const R = this.runs.get(qid); return R && GAMES[R.st.do].obj ? GAMES[R.st.do].obj(this, R) : ''; }
  targetOf(qid) { const R = this.runs.get(qid); return R && GAMES[R.st.do].target ? GAMES[R.st.do].target(this, R) : null; }
  drawLabels(ctx, v) { for (const R of this.runs.values()) if (GAMES[R.st.do].draw) GAMES[R.st.do].draw(this, R, ctx, v); }
  drawUi(ctx, W, H) { for (const R of this.runs.values()) if (GAMES[R.st.do].drawUi) GAMES[R.st.do].drawUi(this, R, ctx, W, H); }
  // (the harness: done at once)
  bot(qid) { const R = this.runs.get(qid); if (R) this.win(R); }
}

// a little bar over someone’s head (lantern oil, a kite string’s pull)
function headBar(G, ctx, v, p, k, col, { w = 18, dy = 2.35 } = {}) {
  const u = G.P.toUi(v, p.pos.x, dy + (p.actor.baseY || 0) + (p.actor.jumpY || 0), p.pos.z);
  const x = Math.round(u.x - w / 2), y = Math.round(u.y - 16);
  ctx.fillStyle = '#241a2e'; ctx.fillRect(x - 1, y - 1, w + 2, 5);
  ctx.fillStyle = '#4a3a5a'; ctx.fillRect(x, y, w, 3);
  ctx.fillStyle = col; ctx.fillRect(x, y, Math.round(w * Math.max(0, Math.min(1, k))), 3);
  return { x, y };
}

const GAMES = {
  // ------------------------------------------------------------------ stomp the barnacles
  whack: {
    begin(G, R) {
      const st = R.st, K = G.P.r3d;
      R.state = 'idle'; R.score = 0; R.left = st.time || 40; R.spawnT = 0; R.count = 0; R.wait = 0;
      R.air = new Map();
      // (the holes: dark rings on the ground; a barnacle waits under each)
      const ringGeo = new THREE.RingGeometry(0.28, 0.46, 14).rotateX(-Math.PI / 2), ringMat = new THREE.MeshBasicMaterial({ color: 0x2a1f36, transparent: true, opacity: 0.55, depthWrite: false });
      R.holes = st.holes.map(([x, z]) => {
        const y = G.y(x, z), ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(x, y + 0.03, z); ring.renderOrder = 2; R.root.add(ring);
        const obj = st.model(K); obj.position.set(x, y - 0.6, z); obj.visible = false; R.root.add(obj);
        return { x, z, y, obj, state: 'down', k: 0, t: 0 };
      });
      // the ring to step into
      const edge = new THREE.Mesh(new THREE.RingGeometry((st.r || 7) - 0.18, st.r || 7, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.35, depthWrite: false }));
      edge.position.set(st.at[0], G.y(st.at[0], st.at[1]) + 0.04, st.at[1]); edge.renderOrder = 2;
      R.root.add(edge); R.edge = edge;
    },
    need(G, R) { return R.st.n + Math.max(0, G.heroes().length - 1) * (R.st.per ?? 3); },
    update(G, R, dt, held) {
      const st = R.st, P = G.P, heroes = G.heroes();
      const inRing = heroes.some((p) => Math.hypot(p.pos.x - st.at[0], p.pos.z - st.at[1]) < (st.r || 7));
      R.edge.material.opacity = R.state === 'run' ? 0.12 : 0.3 + Math.sin(R.t * 4) * 0.1;
      // (the barnacles rise, wait, sink — or squash)
      for (const h of R.holes) {
        h.t += dt;
        if (h.state === 'rising') { h.k = Math.min(1, h.k + dt / 0.14); if (h.k >= 1) { h.state = 'up'; h.t = 0; } }
        else if (h.state === 'up' && h.t > (st.up || 1.5) * (R.state === 'run' ? 1 : 0)) h.state = 'sinking';
        else if (h.state === 'sinking') { h.k = Math.max(0, h.k - dt / 0.2); if (h.k <= 0) h.state = 'down'; }
        else if (h.state === 'hit') { h.k = Math.max(0, h.k - dt / 0.3); if (h.k <= 0) h.state = 'down'; }
        h.obj.visible = h.k > 0.02;
        h.obj.position.y = h.y - 0.55 + h.k * 0.55;
        const sq = h.state === 'hit' ? 0.35 + h.k * 0.4 : 1;
        h.obj.scale.set(1 + (1 - sq) * 0.8, sq, 1 + (1 - sq) * 0.8);
        if (h.obj.userData.anim) h.obj.userData.anim(R.t + h.x, h.state);
      }
      if (held) return;
      if (R.state === 'idle') {
        R.wait -= dt;
        if (inRing && R.wait <= 0) { R.state = 'count'; R.count = 3.2; R.score = 0; R.left = st.time || 40; R.shown = 4; }
        return;
      }
      if (R.state === 'count') {
        R.count -= dt;
        const s = Math.ceil(R.count - 0.2);
        if (s !== R.shown) { R.shown = s; if (s > 0) { P.toast(String(s), '#ffe08a'); audio.sfx('tick', { volume: 0.6 }); } else { P.showBanner(t(st.go || 'Stomp!'), t('{n} of them in {s} seconds', { n: this.need(G, R), s: st.time || 40 })); audio.sfx('whistle', { volume: 0.8 }); } }
        if (R.count <= 0) { R.state = 'run'; R.spawnT = 0.2; G.S.refreshCard(); }
        return;
      }
      // the round
      R.left -= dt;
      R.spawnT -= dt;
      const n = Math.max(1, heroes.length), up = R.holes.filter((h) => h.state === 'up' || h.state === 'rising').length;
      if (R.spawnT <= 0 && up < Math.min(R.holes.length - 1, 1 + Math.ceil(n * 0.75))) {
        const free = R.holes.filter((h) => h.state === 'down' && h !== R.lastHole);
        const h = free[Math.floor(Math.random() * free.length)];
        if (h) { h.state = 'rising'; h.k = 0; h.t = 0; R.lastHole = h; audio.sfx('blub', { volume: 0.3, pitch: rand(-2, 4) }); }
        R.spawnT = ((st.every || 0.7) / Math.sqrt(n)) * (0.75 + 0.25 * Math.max(0, R.left / (st.time || 40)));
      }
      // (landing a jump on one squashes it)
      for (const p of heroes) {
        const air = !!(p.actor && p.actor.airborne), was = R.air.get(p);
        R.air.set(p, air);
        if (was && !air) {
          const h = R.holes.find((q) => (q.state === 'up' || q.state === 'rising') && Math.hypot(q.x - p.pos.x, q.z - p.pos.z) < 0.95);
          if (h) this.hit(G, R, h, p, true);
        }
      }
      const s = Math.ceil(R.left);
      if (s !== R.shownS) { R.shownS = s; G.S.refreshCard(); if (s <= 5 && s > 0) audio.sfx('tick', { volume: 0.5 }); }
      if (R.score >= this.need(G, R)) {
        R.state = 'done';
        for (const h of R.holes) if (h.state !== 'down') h.state = 'sinking';
        audio.jingle('questDone');
        G.win(R);
      } else if (R.left <= 0) {
        R.state = 'idle'; R.wait = 2.5;
        for (const h of R.holes) if (h.state !== 'down') h.state = 'sinking';
        P.toast(t(st.fail || 'Time! {n} of {total} — step back into the ring to try again.', { n: R.score, total: this.need(G, R) }), '#ff9a8a');
        audio.sfx('error', { volume: 0.6 });
        G.S.refreshCard();
      }
    },
    hit(G, R, h, p, stomp) {
      if (R.state !== 'run') return;
      h.state = 'hit'; h.k = 1;
      R.score++;
      const P = G.P;
      audio.sfx(stomp ? 'stomp' : 'whack', { volume: 0.6, pitch: Math.min(8, R.score * 0.4) });
      P.world.fx.emit('sparkle', h.x, 0.6 + h.y, h.z, 8, { color: '#c9a2f0' });
      P.world.fx.emit('water', h.x, 0.3 + h.y, h.z, 4);
      if (P.combat) P.combat.popText(h.x, 1.4 + h.y, h.z, stomp ? t('STOMP!') : t('Whack!'), stomp ? '#ffe08a' : '#fff7e6');
      G.S.refreshCard();
    },
    near(G, R, p) {
      if (R.state !== 'run') return null;
      const h = R.holes.filter((q) => q.state === 'up' || q.state === 'rising').sort((a, b) => Math.hypot(a.x - p.pos.x, a.z - p.pos.z) - Math.hypot(b.x - p.pos.x, b.z - p.pos.z))[0];
      if (!h || Math.hypot(h.x - p.pos.x, h.z - p.pos.z) > 1.4) return null;
      return { kind: 'secret', label: 'Whack', hint: 'Whack it — or land a jump on it!', use: () => this.hit(G, R, h, p, false) };
    },
    obj(G, R) {
      if (R.state === 'run') return t(' ({n}/{total}) — {s} s', { n: R.score, total: this.need(G, R), s: Math.max(0, Math.ceil(R.left)) });
      return '';
    },
    target(G, R) { return { x: R.st.at[0], z: R.st.at[1] }; },
  },

  // ------------------------------------------------------------------ relight a dark town
  lamps: {
    begin(G, R) {
      const st = R.st, S = G.S, K = G.P.r3d;
      R.light = new Map();
      R.max = st.light || 10;
      R.mothT = 3;
      R.lamps = st.lamps.map(([x, z], i) => {
        const obj = st.model(K), y = G.y(x, z);
        obj.position.set(x, y, z); R.root.add(obj);
        const L = { i, x, z, y, obj, lit: !!S.st.got[R.qid + ':lamp:' + i], src: null };
        this.show(G, R, L, true);
        return L;
      });
      R.srcs = new Map();
    },
    end(G, R) {
      const L = G.P.lighting;
      if (L) L.sources = L.sources.filter((s) => !s.gameLamp && !s.gameHero);
      const C = G.P.combat;
      if (C) for (const e of C.enemies) if (e.alive && e.sagaTag === 'lamps') { e.alive = false; e.fading = 0.3; }
    },
    show(G, R, L, quiet = false) {
      if (L.obj.userData.setLit) L.obj.userData.setLit(L.lit);
      const Lg = G.P.lighting;
      if (L.lit && !L.src && Lg) { L.src = { x: L.x, y: L.y + 2.2, z: L.z + 0.3, color: 0xffb060, power: 1.35, dist: 7, lamp: true, gameLamp: true }; Lg.sources.push(L.src); }
      if (!quiet && L.lit) { G.P.world.fx.emit('sparkle', L.x, L.y + 2.2, L.z, 16, { color: '#ffd66b' }); audio.sfx('crackle', { volume: 0.6 }); audio.sfx('chime', { volume: 0.5, pitch: 5 }); }
    },
    safe(G, R, p) {
      const g = R.st.glow || 3.8;
      if (Math.hypot(p.pos.x - R.st.start[0], p.pos.z - R.st.start[1]) < g + 1) return R.st.start;
      for (const L of R.lamps) if (L.lit && Math.hypot(p.pos.x - L.x, p.pos.z - L.z) < g) return [L.x, L.z + 1];
      return null;
    },
    update(G, R, dt, held) {
      const st = R.st, P = G.P, C = P.combat, heroes = G.heroes(), Lg = P.lighting;
      for (const L of R.lamps) if (L.obj.userData.anim) L.obj.userData.anim(R.t + L.i, L.lit);
      for (const p of heroes) {
        let s = R.light.get(p);
        if (!s) { s = { v: R.max, last: st.start, warned: false }; R.light.set(p, s); }
        // (the lantern’s own glow, shrinking with its oil)
        let src = R.srcs.get(p);
        if (!src && Lg) { src = { x: 0, y: 1.2, z: 0, color: 0xffd9a0, power: 1, dist: 5, always: true, gameHero: true }; Lg.sources.push(src); R.srcs.set(p, src); }
        if (src) { const k = Math.max(0, s.v / R.max); src.x = p.pos.x; src.z = p.pos.z + 0.3; src.y = 1.2 + (p.actor.baseY || 0); src.dist = 1.8 + 4.2 * k; src.power = 0.4 + 0.9 * k + Math.sin(R.t * 17 + p.slot) * 0.05 * (1 - k); }
        if (held) continue;
        const home = this.safe(G, R, p);
        if (home) { s.v = Math.min(R.max, s.v + dt * 8); s.warned = false; continue; }
        const moths = C ? C.enemies.filter((e) => e.alive && e.sagaTag === 'lamps' && Math.hypot(e.x - p.pos.x, e.z - p.pos.z) < 1.1).length : 0;
        s.v -= dt * (1 + moths * 1.4);
        if (s.v < R.max * 0.3 && !s.warned) { s.warned = true; if (P.solo || heroes.length === 1) P.toast(t(st.low || 'Your lantern is guttering — get back to the light!'), '#ffb070'); }
        if (s.v <= 0) {
          // (out: back to the last lamp this hero lit)
          s.v = R.max;
          const [bx, bz] = s.last;
          P.world.fx.emit('smoke', p.pos.x, 1, p.pos.z, 10, { color: '#6a5a7a' });
          if (P.solo) P.gatherAt(bx, bz + 0.8); else p.actor.pos = { x: bx + rand(-0.6, 0.6), z: bz + 0.8 };
          P.toast(t(st.out || 'Your lantern gutters out… back to the last lamp.'), '#ff9a8a');
          audio.sfx('error', { volume: 0.5 });
        }
      }
      for (const [p, src] of R.srcs) if (!heroes.includes(p)) { if (Lg) Lg.sources = Lg.sources.filter((q) => q !== src); R.srcs.delete(p); }
      if (held || !C || !st.moths) return;
      // murk moths come for the lanterns out in the dark
      R.mothT -= dt;
      if (R.mothT <= 0) {
        R.mothT = st.moths.every || 5;
        const dark = heroes.filter((p) => !this.safe(G, R, p));
        const live = C.enemies.filter((e) => e.alive && e.sagaTag === 'lamps').length;
        for (const p of dark.slice(0, 4)) {
          if (live >= (st.moths.max || 3) * Math.max(1, Math.ceil(heroes.length / 2))) break;
          const a = rand(0, Math.PI * 2), e = C.spawn(st.moths.type || 'murkmoth', p.pos.x + Math.cos(a) * 6, p.pos.z + Math.sin(a) * 4, { level: st.moths.level || 29, quiet: true });
          e.saga = true; e.sagaTag = 'lamps'; e.lamps = R;
        }
      }
    },
    near(G, R, p) {
      const L = R.lamps.find((q) => !q.lit && Math.hypot(q.x - p.pos.x, q.z - p.pos.z) < 1.7);
      if (!L) return null;
      return { kind: 'secret', label: 'Light', hint: 'Relight the lamp', use: (q) => this.light(G, R, L, q || p) };
    },
    light(G, R, L, p) {
      if (L.lit) return;
      L.lit = true;
      G.S.st.got[R.qid + ':lamp:' + L.i] = 1; G.S.save();
      this.show(G, R, L);
      const s = R.light.get(p); if (s) { s.v = R.max; s.last = [L.x, L.z]; }
      // (everyone’s safe spot moves up with the light)
      for (const q of R.light.values()) q.last = [L.x, L.z];
      const n = R.lamps.filter((q) => q.lit).length;
      G.S.refreshCard();
      if (n >= R.lamps.length) { audio.jingle('questDone'); G.win(R); }
      else G.P.toast(t('Lamp {n}/{total}', { n, total: R.lamps.length }), '#ffd66b');
    },
    obj(G, R) { return t(' ({n}/{total})', { n: R.lamps.filter((q) => q.lit).length, total: R.lamps.length }); },
    target(G, R) {
      // (the next dark lamp along the way)
      const L = R.lamps.find((q) => !q.lit);
      return L ? { x: L.x, z: L.z } : null;
    },
    draw(G, R, ctx, v) {
      for (const p of G.heroes()) {
        const s = R.light.get(p);
        if (!s || s.v >= R.max - 0.01) continue;
        const k = s.v / R.max;
        headBar(G, ctx, v, p, k, k > 0.5 ? '#ffd66b' : k > 0.25 ? '#ffa04a' : (Math.floor(R.t * 6) % 2 ? '#ff6a5a' : '#ffa04a'));
      }
    },
  },

  // ------------------------------------------------------------------ kites above the fog
  kite: {
    begin(G, R) { R.kites = new Map(); R.string = new THREE.LineBasicMaterial({ color: 0xf4efe4, transparent: true, opacity: 0.8 }); },
    end(G, R) { R.string.dispose(); },
    update(G, R, dt, held) {
      const st = R.st, P = G.P, heroes = G.heroes();
      for (const p of heroes) {
        let k = R.kites.get(p);
        const onField = Math.hypot(p.pos.x - st.at[0], p.pos.z - st.at[1]) < (st.r || 9);
        if (!k) {
          if (!onField) continue;
          const obj = st.model(P.r3d, p.color || '#ec5f73');
          R.root.add(obj);
          const geo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3));
          const line = new THREE.Line(geo, R.string); line.frustumCulled = false; R.root.add(line);
          k = { obj, line, h: 0, pull: 0.3, c: 0.5, gust: 0, up: false, snapT: 0 };
          R.kites.set(p, k);
          if (!R.told) { R.told = true; P.toast(t(st.how || 'Hold {a} to reel in, let go to let out — keep the pull in the green!', { a: P.keyName('a') }), '#8fd6b4'); }
        }
        if (!held && !k.up && onField) {
          // (the band drifts, the gusts tug; the higher it flies, the narrower the band)
          k.c = 0.5 + Math.sin(R.t * 0.7 + p.slot * 1.7) * 0.18;
          k.gust += (rand(-1, 1) * (st.gust || 1.1) - k.gust * 1.6) * dt;
          const reel = p.input && p.input.down('interact');
          k.pull = Math.max(0, Math.min(1, k.pull + (reel ? 0.75 : -0.55) * dt + k.gust * dt * 0.9));
          const w = 0.34 - k.h * 0.12, inBand = Math.abs(k.pull - k.c) < w / 2;
          k.snapT -= dt;
          if (k.pull > 0.97) {
            k.h = Math.max(0, k.h - 0.3); k.pull = 0.4;
            if (k.snapT <= 0) { k.snapT = 1.2; P.world.fx.emit('dust', p.pos.x, 2, p.pos.z, 6, { color: '#f4efe4' }); audio.sfx('snap', { volume: 0.6 }); if (P.combat) P.combat.popText(p.pos.x, 2.4, p.pos.z, t('Too tight!'), '#ff9a8a'); }
          } else if (inBand) k.h = Math.min(1, k.h + dt * (st.climb || 0.07));
          else if (k.pull < k.c - w / 2) k.h = Math.max(0, k.h - dt * 0.035);
          if (k.h >= 1) {
            k.up = true;
            audio.sfx('chime', { volume: 0.8, pitch: 7 });
            P.world.fx.emit('sparkle', k.obj.position.x, k.obj.position.y, k.obj.position.z, 18, { color: '#ffe08a' });
            P.toast(P.solo ? t(st.upText || 'Your kite is above the Murk!') : t('{name}’s kite is above the Murk!', { name: p.name }), '#ffe08a');
          }
        }
        // the kite and its string
        const hh = 1.6 + k.h * 5.2, sway = Math.sin(R.t * 1.3 + p.slot) * (0.3 + (1 - k.h) * 0.3);
        k.obj.position.set(p.pos.x + 0.8 + sway, (p.actor.baseY || 0) + hh, p.pos.z - 0.6 - k.h * 1.6);
        k.obj.rotation.z = sway * 0.4 + k.gust * 0.2;
        if (k.obj.userData.anim) k.obj.userData.anim(R.t, k.up);
        const a = k.line.geometry.attributes.position;
        a.setXYZ(0, p.pos.x + 0.25, (p.actor.baseY || 0) + 0.9, p.pos.z); a.setXYZ(1, k.obj.position.x, k.obj.position.y - 0.3, k.obj.position.z); a.needsUpdate = true;
        R.string.color.set(k.up ? '#ffe08a' : k.pull > 0.85 ? '#ff9a8a' : '#f4efe4');
      }
      if (held) return;
      const flying = [...R.kites.entries()].filter(([p]) => heroes.includes(p));
      if (flying.length && flying.length >= Math.min(heroes.length, Math.max(1, heroes.length)) && flying.every(([, k]) => k.up)) G.win(R);
    },
    near(G, R, p) {
      const st = R.st;
      if (Math.hypot(p.pos.x - st.at[0], p.pos.z - st.at[1]) > (st.r || 9)) return null;
      const k = R.kites.get(p);
      if (k && k.up) return null;
      // (A is the reel while you’re on the field: nothing else answers it)
      return { kind: 'secret', label: 'Reel the kite', hint: 'Hold to reel in, let go to let out', use: () => {} };
    },
    obj(G, R) {
      const hs = G.heroes(), up = hs.filter((p) => { const k = R.kites.get(p); return k && k.up; }).length;
      return hs.length > 1 ? t(' ({n}/{total})', { n: up, total: hs.length }) : '';
    },
    target(G, R) { return { x: R.st.at[0], z: R.st.at[1] }; },
    draw(G, R, ctx, v) {
      for (const [p, k] of R.kites) {
        if (k.up || !G.heroes().includes(p)) continue;
        // (the pull, with its green band; the height as a little kite climbing a line)
        const { x, y } = headBar(G, ctx, v, p, 0, '#000', { w: 26 });
        const w = 0.34 - k.h * 0.12, b0 = Math.round(x + 26 * Math.max(0, k.c - w / 2)), b1 = Math.round(x + 26 * Math.min(1, k.c + w / 2));
        ctx.fillStyle = '#5ab86a'; ctx.fillRect(b0, y, Math.max(1, b1 - b0), 3);
        const px = Math.round(x + 26 * k.pull);
        ctx.fillStyle = k.pull > 0.85 ? '#ff6a5a' : '#fff7e6'; ctx.fillRect(px - 1, y - 2, 2, 7);
        ctx.fillStyle = '#241a2e'; ctx.fillRect(x + 28, y - 13, 3, 16);
        ctx.fillStyle = '#ffe08a'; ctx.fillRect(x + 28, y + 2 - Math.round(15 * k.h), 3, Math.max(1, Math.round(15 * k.h)));
      }
    },
  },
};
// (chapter 8's: fireflies, jars, the beat)
Object.assign(GAMES, GAMES8, GAMES9);
void drawText;
