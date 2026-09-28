// Escort steps (World v7, chapter 5): someone to see safely somewhere.
//   { do: 'escort', path: [[x, z]…], build(r3d), speed, near, ambush: { i: [foes] } }
//     they walk the path while a hero stays close, stop when left alone, and wait
//     out an ambush (the step's foes, spawned around them when they reach mark i);
//   { do: 'escort', flock: n, from: [x, z], goal: [x, z], build(r3d, k), reach, snatch }
//     a little flock follows the nearest hero's lantern to the goal; one that lags
//     alone too long is snatched back to where it started.
// The walkers are plain models (a camel, turtle hatchlings), not villagers: they
// only live while the step does.

import { t } from '../i18n.js';
import { audio } from '../engine/audio.js';

export class Escorts {
  constructor(saga) { this.S = saga; this.runs = new Map(); }
  get P() { return this.S.P; }

  begin(qid, st) {
    if (this.runs.has(qid)) return;
    const P = this.P, root = P.world.over.root, R = { qid, st, walkers: [], i: 1, ambush: null, lonely: 0 };
    const add = (obj, x, z) => { root.add(obj); const w = { obj, x, z, x0: x, z0: z, dx: 0, dz: 1, lag: 0, home: false, moving: false }; R.walkers.push(w); return w; };
    if (st.flock) for (let k = 0; k < st.flock; k++) { const a = (k / st.flock) * Math.PI * 2; add(st.build(P.r3d, k), st.from[0] + Math.cos(a) * 1.1, st.from[1] + Math.sin(a) * 0.8); }
    else add(st.build(P.r3d), st.path[0][0], st.path[0][1]);
    this.runs.set(qid, R);
    this.place(R);
  }

  end(qid) {
    const R = this.runs.get(qid);
    if (!R) return;
    for (const w of R.walkers) if (w.obj.parent) w.obj.parent.remove(w.obj);
    this.runs.delete(qid);
  }
  dispose() { for (const qid of [...this.runs.keys()]) this.end(qid); }

  heroes() { const P = this.P; return P.players.filter((p) => (p.connected || this.S.solo) && !p.away && !(p.fighter && p.fighter.down)); }

  update(dt) {
    const S = this.S, P = this.P;
    const held = P.busy > 0 || P.dialogue.active || (S.stage && S.stage.active);
    for (const R of [...this.runs.values()]) {
      if (S.stepDef(R.qid) !== R.st) { this.end(R.qid); continue; }
      if (!held) { if (R.st.flock) this.flock(R, dt); else this.walk(R, dt); }
      else for (const w of R.walkers) w.moving = false;
      this.place(R);
    }
  }

  place(R) {
    const w0 = this.P.world;
    for (const w of R.walkers) {
      w.obj.position.set(w.x, w0.groundY ? w0.groundY({ x: w.x, z: w.z }) : 0, w.z);
      w.obj.rotation.y = Math.atan2(w.dx, w.dz);
      if (w.obj.userData.anim) w.obj.userData.anim(this.S.t || 0, w.moving, w.home);
    }
  }

  // a step towards (tx, tz); true once there
  stepTo(w, tx, tz, sp, dt, stop = 0) {
    const dx = tx - w.x, dz = tz - w.z, d = Math.hypot(dx, dz);
    if (d <= stop + 0.02) { w.moving = false; return true; }
    const k = Math.min(1, (sp * dt) / (d - stop));
    w.x += dx * k; w.z += dz * k;
    w.dx = dx / d; w.dz = dz / d;
    w.moving = true;
    return k >= 1;
  }

  walk(R, dt) {
    const S = this.S, P = this.P, st = R.st, w = R.walkers[0];
    // an ambush: they cower until it is beaten
    if (R.ambush) {
      w.moving = false;
      if (R.ambush.some((e) => e.alive)) return;
      R.ambush = null;
      P.toast(t(st.clear || 'All clear — on we go!'), '#8fd6b4');
    }
    const near = this.heroes().some((p) => Math.hypot(p.pos.x - w.x, p.pos.z - w.z) < (st.near || 5));
    if (!near) {
      w.moving = false;
      R.lonely += dt;
      if (R.lonely > 2.5 && !R.saidLonely) { R.saidLonely = true; P.toast(t(st.lost || 'They won’t go on alone. Stay close!'), '#ffd66b'); }
      return;
    }
    R.lonely = 0; R.saidLonely = false;
    const [tx, tz] = st.path[R.i];
    if (!this.stepTo(w, tx, tz, st.speed || 2.2, dt)) return;
    // a mark on the way: an ambush?
    const foes = st.ambush && st.ambush[R.i];
    R.i++;
    if (foes && P.combat) {
      const lv = st.lv || (S.chapter && S.chapter.lv) || 1;
      R.ambush = foes.map((type, k) => {
        const a = (k / foes.length) * Math.PI * 2 + 0.4;
        const e = P.combat.spawn(type, w.x + Math.cos(a) * 4.5, w.z + Math.sin(a) * 4.5, { level: lv });
        e.saga = true; e.sagaTag = 'escort';
        return e;
      });
      P.toast(t(st.ambushText || 'Ambush! Keep them safe!'), '#ff9a8a');
      audio.sfx('error', { volume: 0.5 });
    }
    if (R.i >= st.path.length) { this.end(R.qid); S.runStep(R.qid); }
  }

  flock(R, dt) {
    const S = this.S, P = this.P, st = R.st, [gx, gz] = st.goal, heroes = this.heroes();
    // (nothing happens until someone comes to fetch them)
    if (!R.met) { if (!R.walkers.some((w) => heroes.some((p) => Math.hypot(p.pos.x - w.x, p.pos.z - w.z) < (st.reach || 6)))) return; R.met = true; }
    let home = 0;
    R.walkers.forEach((w, k) => {
      if (w.home) { home++; w.moving = false; return; }
      let best = null, bd = st.reach || 6;
      for (const p of heroes) { const d = Math.hypot(p.pos.x - w.x, p.pos.z - w.z); if (d < bd) { bd = d; best = p; } }
      if (best) {
        w.lag = 0;
        // (each keeps its own place in the little queue behind the lantern)
        const a = (k / R.walkers.length) * Math.PI * 2 + S.t * 0.3;
        this.stepTo(w, best.pos.x + Math.cos(a) * 1.1, best.pos.z + Math.sin(a) * 0.8, st.speed || 2.8, dt, 0.2);
      } else {
        w.moving = false;
        w.lag += dt;
        if (w.lag > (st.snatch || 5)) {
          // a crab scuttles out and carries it back to the nest
          w.lag = 0;
          P.world.fx.emit('dust', w.x, 0.3, w.z, 10, { color: '#e8d8b0' });
          w.x = w.x0; w.z = w.z0;
          audio.sfx('error', { volume: 0.5 });
          P.toast(t(st.snatched || 'A crab snatched a straggler back to the start!'), '#ff9a8a');
        }
      }
      if (Math.hypot(w.x - gx, w.z - gz) < (st.r || 2.5)) {
        w.home = true; home++;
        P.world.fx.emit('splash', w.x, 0.2, w.z, 8);
        audio.sfx('pickup', { volume: 0.6, pitch: k * 2 });
        P.toast(t('{n}/{total} safe!', { n: R.walkers.filter((q) => q.home).length, total: R.walkers.length }), '#8fd6b4');
      }
    });
    if (home === R.walkers.length) { this.end(R.qid); S.runStep(R.qid); }
  }

  targetOf(qid) {
    const R = this.runs.get(qid);
    if (!R) return null;
    if (R.st.flock) {
      if (!R.met) return { x: R.st.from[0], z: R.st.from[1] };
      // (the one lagging furthest behind, else the goal)
      const lost = R.walkers.filter((w) => !w.home).sort((a, b) => b.lag - a.lag)[0];
      return lost && lost.lag > 1 ? { x: lost.x, z: lost.z } : { x: R.st.goal[0], z: R.st.goal[1] };
    }
    const w = R.walkers[0];
    return { x: w.x, z: w.z };
  }
}
