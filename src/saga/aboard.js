// World v7: the heroes aboard. When a scene takes the party somewhere in a craft — Wendy’s balloon,
// Tariq’s boat, the Dauntless Teacup, an ore cart, a pelican’s pouch — the real heroes leave the
// ground (hidden and `away`: no game counts them, nothing moves them) and a look-alike of each
// rides in the craft: their own model, in the place the craft has for them, turning and bobbing
// with it, looking about, waving now and then, holding on when the picture shakes; in Party an
// arrow of each player’s colour over their head (their name for a moment as they board), their
// emotes and their words. `land` puts everybody down beside the craft, on ground they can stand
// on, a step apart. The stage owns the trip (`st.trip`): however the scene ends — played, skipped,
// failed — nobody is left aboard, hidden or away. One hero in solo, up to eight in Party.
//
//   const trip = aboard(st);                                   // everybody off the ground
//   trip.seat(craft, BASKET);                                  // …and into the craft (a stage prop)
//   trip.crew(craft, 'wendy', BASKET);                         // the pilot too
//   trip.ride(craft);                                          // the camera goes with it
//   await st.move('balloon', { … });
//   trip.land(x, z, { face: [wx, wz] });                       // everybody out, beside it

import { CharModel } from '../models/chars.js';
import { NPCS } from '../data/npcs.js';
import { THREE } from '../render/r3d.js';
import { TT } from '../world/tiles.js';
import { drawText, measure } from '../engine/font.js';
import { drawSpeech, drawBubbles } from '../ui/chat.js';

// k places in a row across the craft, `dx` apart, at height y and z (along the craft, bow at +z)
const row = (k, dx, y, z) => Array.from({ length: Math.max(0, k) }, (_, i) => [(i - (k - 1) / 2) * dx, y, z]);

// ---- where each craft has room. `seats(n)`: n places [x, y, z, turn] in the craft’s own frame,
// in units of the world (the craft’s `scale(n)` — a bigger one for a bigger party — is taken off
// by the trip; `turn`: the way that seat faces, from the craft’s bow); `crew`: its pilot’s place;
// `sit`: on a thwart rather than standing behind a rim; `fwd`: they face the way the craft goes
// (else the picture); `grip`: hands on the rim; `dangle`: legs swinging over an edge; `rowed`:
// its pilot rows; `tiers`: rows one behind the other
export const BASKET = {
  // Wendy’s balloon: two in front, two behind, Wendy at the burner between them; the big basket
  // (five heroes and more) has three rows. Each row stands a little higher than the one in front
  // of it, as for a class photograph: every face shows
  scale: (n) => (n > 4 ? 1.45 : 1),
  seats: (n) => (n <= 4 ? [...row(Math.min(2, n), 0.8, 0.45, 0.5), ...row(n - 2, 0.8, 0.65, -0.5)]
    : [...row(3, 0.74, 0.84, 0.86), ...(n > 6 ? row(2, 1.48, 1.04, 0) : []), ...row(n - 3 - (n > 6 ? 2 : 0), 0.74, 1.24, -0.86)]),
  crew: (n) => (n > 4 ? [0, 1.04, 0] : [0, 0.55, 0]),
  tiers: true,
};
// the Dauntless Teacup: perched on the saucer’s rim, legs over the edge, backs to the cup («
// hold onto your saucers! ») — from the south, the cup itself is under her envelope. The heroes
// take the front of the rim, Wendy its port end
const rim = (a) => [Math.sin(a) * 1.55, 0.56, Math.cos(a) * 1.55, a], apart = (n) => Math.min(0.62, 3.7 / Math.max(1, n - 1));
export const TEACUP = {
  node: (o) => o.userData.body || o,
  seats: (n) => Array.from({ length: n }, (_, i) => rim((i - (n - 1) / 2) * apart(n))),
  crew: (n) => rim(-Math.min(2.45, ((n + 1) / 2) * apart(n) + 0.2)),
  fwd: true, grip: -0.35, dangle: true,
};
export const ROWBOAT = {
  // Tariq’s boat: he rows amidships; a hero on the stern seat, one in the bow — a longer boat for
  // more, two abreast
  scale: (n) => (n <= 2 ? 1 : n <= 4 ? 1.25 : 1.5),
  seats: (n) => (n <= 2 ? [[0, 0.3, -0.8], [0, 0.36, 0.92]].slice(0, n)
    : n <= 4 ? [...row(2, 0.56, 0.34, -1.0), ...row(n - 2, 0.5, 0.42, 0.98)]
      : [...row(2, 0.64, 0.4, -1.0), ...row(2, 0.6, 0.3, 0.98), ...row(Math.min(2, n - 4), 0.58, 0.42, -1.62), ...row(n - 6, 0.46, 0.5, 1.56)]),
  crew: (n) => [0, n <= 2 ? 0.26 : n <= 4 ? 0.33 : 0.39, n <= 2 ? 0.1 : n <= 4 ? 0.12 : 0.15],
  sit: true, fwd: true, rowed: true,
};
export const CART = {
  // an ore cart: one, or two in tandem, hands on its rim
  seats: (n) => (n <= 1 ? [[0, 0.3, 0]] : [[0, 0.3, 0.33], [0, 0.3, -0.33]]),
  fwd: true, grip: -0.7,
};
export const POUCH = {
  // a pelican’s pouch: head and shoulders over its edge
  node: (o) => o.userData.seat || o,
  seats: () => [[0, 0, 0]],
  sit: true, fwd: true, grip: -1.0,
};

// a craft that has no life of its own (a model that only sits there) gets some: it bobs and
// sways inside the group the scene moves about; `scale` for a big party’s bigger craft
export function afloat(model, { scale = 1, bob = 0.05, sway = 0.025, rate = 1.3 } = {}) {
  const g = new THREE.Group(), own = model.userData.anim, ph = Math.random() * 6;
  model.scale.setScalar(scale);
  g.add(model);
  g.userData.body = model;
  if (model.userData.oars) g.userData.oars = model.userData.oars;
  g.userData.anim = (tm, dt) => {
    if (own) own(tm, dt);
    model.position.y = Math.sin(tm * rate + ph) * bob;
    model.rotation.z = Math.sin(tm * rate * 0.7 + ph) * sway;
  };
  return g;
}

// what a press of A would set off beside whoever stands near: a waystone, a roost’s or a mast’s
// bell, a boat to board — [x, z, its reach and a hair: on a small roof every spot counts]
function bells(P) {
  const S = P.saga, out = [];
  for (const q of (P.travel && P.travel.stones) || []) out.push([q.x, q.z, 2.05]);
  for (const q of (S && S.post && S.post.roosts) || []) out.push([q.x, q.z, 2.45]);
  for (const q of (S && S.teacup && S.teacup.masts) || []) out.push([q.x, q.z, 2.75]);
  for (const v of (P.vehicles && P.vehicles.list) || []) out.push([v.x, v.z, v.def.reach + 0.15]);
  return out;
}

// ---- ground to stand on: n spots near (x, z), a step apart, the nearest first — dry, free, out
// of the Murk and the tar, reached from the first without crossing a wall or water (nobody lands
// across a ledge), and, where there is room, out of reach of any bell: whoever hammers A through
// a scene’s last line opens no question as they land
export function standing(P, x, z, n, gap = n > 4 ? 1.4 : 1.25) {
  const w = P.world, col = w.overCol, near = bells(P);
  const ok = (px, pz) => { const tt = w.tileAt(px, pz); return tt !== -1 && tt !== TT.TAR && !col.blocked(px, pz, 0.32) && !(P.murk && P.murk.at(Math.floor(px), Math.floor(pz))); };
  const quiet = (px, pz) => near.every((q) => Math.hypot(px - q[0], pz - q[1]) > q[2]);
  const clear = (a, bx, bz) => { const L = Math.hypot(bx - a.x, bz - a.z), k = Math.ceil(L / 0.35); for (let i = 1; i < k; i++) if (!ok(a.x + ((bx - a.x) * i) / k, a.z + ((bz - a.z) * i) / k)) return false; return true; };
  let foot = null, loud = null;
  for (let r = 0; r <= 10 && !foot; r += 0.4) for (let k = 0, m = r ? Math.ceil(r * 9) : 1; k < m && !foot; k++) {
    const a = (k / m) * Math.PI * 2 + Math.PI / 2, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
    if (!ok(px, pz)) continue;
    if (quiet(px, pz)) foot = { x: px, z: pz }; else loud = loud || { x: px, z: pz };
  }
  foot = foot || loud;
  if (!foot) return Array.from({ length: n }, () => ({ x, z }));
  // (round the first, the nearest spots a step from each other — a little crowd, not a queue —,
  // rather side by side than one behind the other; a small roof or a rock is searched closely:
  // quiet spots first, a shorter step if it takes one, a spot near a bell at the last)
  const cand = [];
  for (let j = -24; j <= 24; j++) for (let i = -24; i <= 24; i++) {
    if (!i && !j) continue;
    const px = foot.x + i * 0.35, pz = foot.z + j * 0.35;
    cand.push({ x: px, z: pz, d: Math.hypot(px - foot.x, (pz - foot.z) * 1.25) });
  }
  cand.sort((a, b) => a.d - b.d);
  const out = [foot], room = (c, step) => out.every((q) => Math.hypot(q.x - c.x, (q.z - c.z) * 1.15) >= step);
  for (const [hush, step] of [[true, gap], [true, gap * 0.8], [true, gap * 0.62], [false, gap], [false, gap * 0.8]]) for (const c of cand) {
    if (out.length >= n) break;
    if (room(c, step) && ok(c.x, c.z) && (!hush || quiet(c.x, c.z)) && clear(foot, c.x, c.z)) out.push({ x: c.x, z: c.z });
  }
  // (a rock in the sea with room for three: the others share their spots)
  for (let k = 0, m = out.length; out.length < n; k++) out.push({ ...out[k % m] });
  return out;
}

const WAVE = 1.5, GRIP = 0.7;                 // a wave’s time; how long they hold on after a shake
const _v = new THREE.Vector3();

export class Trip {
  constructor(st, heroes = null) {
    this.st = st; this.P = st.P;
    const P = this.P;
    this.heroes = heroes || P.players.filter((p) => p.connected || P.solo);
    this.riders = [];                    // { p | id, model, holder, craft, … }: who sits where
    this.cam = null;                     // the craft the camera goes with
    this.inn = [];                       // heroes hopping up into their seat
    this.out = [];                       // heroes on their way down from the craft
    this.t = 0; this.waveT = 2 + Math.random(); this.shook = 0; this.cheerT = 0;
    this.landed = false; this.over = false;
    // off the ground: down from a mount, out of a boat, out of the water, awake — then off stage
    for (const p of this.heroes) {
      if (p.mount && P.mounts) P.mounts.dismount(p, true);
      if (p.vehicle && P.vehicles) P.vehicles.leave(p, true);
      if (p.sleeping && P.camp && P.camp.wake) P.camp.wake(p);
      if (p.swimming && P.swim) { p.swimming = false; P.swim.leave(p); }
    }
    this.hide(true);
    if (st.trip && st.trip !== this) st.trip.end();
    st.trip = this;
  }

  hide(on) { for (const p of this.P.players) { p.away = on; p.hidden = on; if (p.actor) p.actor.hidden = on; } }

  // ------------------------------------------------------------------ who sits where
  // the heroes not seated yet (or `who`) take the craft’s places; a craft too small takes as
  // many as `max`, the next craft the others. `hop`: they jump in from where they stand, one
  // after the other (await `settled()` before the craft leaves)
  seat(craft, plan, { max = 8, who = null, hop = false } = {}) {
    const free = (who || this.heroes.filter((p) => !this.riders.some((r) => r.p === p))).slice(0, max);
    if (this.st.skipping || !free.length) return free;
    const seats = plan.seats(free.length);
    free.forEach((p, i) => {
      const r = this.put(craft, plan, seats[Math.min(i, seats.length - 1)], { p, look: p.actor.model.look, i: this.riders.length, n: free.length });
      if (!hop) return;
      r.holder.visible = false;
      p.away = false; p.hidden = false; p.actor.hidden = false;
      this.inn.push({ p, r, k: 0, T: 0.4, wait: 0.12 + this.inn.length * 0.1, fx: p.pos.x, fz: p.pos.z });
    });
    return free;
  }
  // (await it: everybody is in their seat — or down on their spot)
  async settled() {
    while ((this.inn.length || this.out.length) && !this.st.skipping && !this.over) await this.st.wait(0.05);
    this.snap();
  }
  snap() {
    for (const o of this.inn) { const a = o.p.actor; a.jumpY = 0; a.jumpV = 0; o.p.away = true; o.p.hidden = true; a.hidden = true; o.r.holder.visible = true; }
    for (const o of this.out) { const a = o.p.actor; a.pos = { x: o.to.x, z: o.to.z }; a.jumpY = 0; a.jumpV = 0; this.show(o.p); }
    this.inn = []; this.out = [];
  }
  // the pilot: someone of the cast, in the craft’s own place for them
  crew(craft, id, plan, { n = this.heroes.length, at = null, rowing = !!plan.rowed } = {}) {
    const def = NPCS[id], st = this.st, own = this.P.npcs && this.P.npcs.find((q) => q.id === id);
    // (not on the ground as well: the scene takes the cast’s own, unseen, until it ends — there
    // already, or about to be put where the craft arrives)
    if (st.actorOf(id)) st.hide(id);
    else st.actor(id, own ? own.pos.x : craft.position.x, own ? own.pos.z : craft.position.z, { face: (own && (own.restDir || own.dir)) || { x: 0, z: 1 }, hidden: true });
    if (st.skipping || !def) return null;
    return this.put(craft, plan, at || plan.crew(n), { id, look: def.look, size: def.scale || (def.kid ? 0.86 : 1), i: this.riders.length + 3, n, rowing });
  }
  put(craft, plan, at, r) {
    const node = plan.node ? plan.node(craft) : craft.userData.body || craft;
    const holder = new THREE.Group(), model = new CharModel(this.P.r3d, r.look, { scale: r.size || 1 });
    if (model.blob) model.blob.visible = false;
    // (in the craft’s frame, but the size of the world’s folk and turned as the world is: a
    // head flattens along the world’s depth, whichever way the craft heads)
    node.updateWorldMatrix(true, false);
    const s = node.getWorldScale(_v).x || 1;
    holder.position.set(at[0] / s, at[1] / s, at[2] / s);
    holder.scale.setScalar(1 / s);
    holder.add(model.root);
    node.add(holder);
    Object.assign(r, { model, holder, craft, plan, turn: at[3] || 0, ph: r.i * 2.4 + Math.random(), lookT: 0.4 + Math.random() * 2, yaw: 0, yawTo: 0, nod: 0, nodTo: 0, wave: 0, on: 0 });
    model.setFacing(this.facing(r));
    this.riders.push(r);
    return r;
  }
  facing(r) { return r.plan.fwd ? r.craft.rotation.y + (r.turn || 0) : 0; }

  // the oars of a boat somebody rows
  oars(craft, rate = 1.5) { this.rowed = craft ? { craft, rate, ph: 0 } : null; }
  // the camera goes with a craft (it aims where a thing that high shows up): (dx, dz) aside
  ride(craft, { dx = 0, dz = 0.6, ky = 1 } = {}) { this.cam = craft ? { craft, dx, dz, ky } : null; }
  // everybody throws their arms up (lift-off, land in sight)
  cheer(sec = 1.1) { this.cheerT = sec; }

  // ------------------------------------------------------------------ frame
  update(dt) {
    const st = this.st, P = this.P;
    this.t += dt;
    const c = this.cam;
    if (c && st.cv && !st.tw) { const o = c.craft.position; st.cv.x = o.x + c.dx; st.cv.z = o.z - o.y * c.ky + c.dz; st.applyCam(); }
    // (a shake of the picture — flak, a blast, a bump: everybody holds on for a moment)
    if (((P.cam && P.cam.shake) || 0) > 0.12) this.shook = GRIP;
    this.shook = Math.max(0, this.shook - dt); this.cheerT = Math.max(0, this.cheerT - dt);
    if (this.rowed) {
      const R = this.rowed; R.ph = (R.ph + dt * R.rate) % 1;
      const ph = R.ph * Math.PI * 2;
      for (const o of R.craft.userData.oars || []) { const sd = o.userData.side; o.rotation.set(0, -sd * Math.sin(ph) * 0.5, sd * (0.04 - Math.cos(ph) * 0.1)); }
    }
    // one of the heroes waves at the picture, now and then
    const hs = this.riders.filter((r) => r.p);
    if ((this.waveT -= dt) <= 0 && hs.length) { this.waveT = 1.6 + Math.random() * 2.2; hs[Math.floor(Math.random() * hs.length)].wave = WAVE; }
    for (const r of this.riders) this.pose(r, dt);
    // into the craft: a jump from the ground up to their seat
    for (const o of this.inn) {
      if (o.wait > 0) { o.wait -= dt; continue; }
      const a = o.p.actor;
      o.r.holder.getWorldPosition(_v);
      if (!o.go) { o.go = true; const y = Math.max(0, _v.y - (a.baseY || 0)); a.jumpY = 0.02; a.jumpV = (y + 10.5 * o.T * o.T) / o.T; st.sfx('jump', { volume: 0.3 }); a.dir = { x: _v.x - o.fx, z: _v.z - o.fz }; if (a.model) a.model.targetFacing = Math.atan2(a.dir.x, a.dir.z); }
      o.k = Math.min(1, o.k + dt / o.T);
      a.pos = { x: o.fx + (_v.x - o.fx) * o.k, z: o.fz + (_v.z - o.fz) * o.k };
      if (o.k >= 1) { o.done = true; a.jumpY = 0; a.jumpV = 0; o.p.away = true; o.p.hidden = true; a.hidden = true; o.r.holder.visible = true; o.r.on = 0; }
    }
    if (this.inn.length) this.inn = this.inn.filter((o) => !o.done);
    // out of the craft: a hop down to their own spot
    for (const o of this.out) {
      if (o.wait > 0) { o.wait -= dt; continue; }
      const a = o.p.actor;
      if (!o.go) { o.go = true; this.show(o.p); a.jumpY = Math.max(0.05, o.y); a.jumpV = Math.max(1.2, (10.5 * o.T * o.T - o.y) / o.T); }
      o.k = Math.min(1, o.k + dt / o.T);
      a.pos = { x: o.fx + (o.to.x - o.fx) * o.k, z: o.fz + (o.to.z - o.fz) * o.k };
      if (o.k >= 1) { o.done = true; P.world.fx.emit('dust', o.to.x, 0.15, o.to.z, 5); }
    }
    if (this.out.length) { this.out = this.out.filter((o) => !o.done); if (!this.out.length && P.cam && P.cam.snap) P.cam.snap(P.camPlayers ? P.camPlayers() : null); }
  }

  // a passenger’s life: turned as the craft (or to the picture), a look about, a wave, a grip
  pose(r, dt) {
    const m = r.model, plan = r.plan, tm = this.t + r.ph;
    r.on += dt;
    r.holder.rotation.y = -r.craft.rotation.y;
    const grip = this.shook > 0, cheer = this.cheerT > 0 && !grip, wave = r.wave > 0 && !grip && !cheer;
    if (r.wave > 0) r.wave -= dt;
    m.targetFacing = this.facing(r);
    // the head: here, there, down over the rim — back to the front when things happen
    if ((r.lookT -= dt) <= 0) {
      r.lookT = 1.3 + Math.random() * 2.6;
      const k = Math.random();
      r.yawTo = k < 0.35 ? 0 : (Math.random() - 0.5) * 1.5;
      r.nodTo = k > 0.72 ? 0.3 : 0;
    }
    const yawTo = grip ? 0 : wave ? this.toPicture(r) : r.yawTo, nodTo = grip || wave || cheer ? 0 : r.nodTo, e = Math.min(1, dt * 5);
    r.yaw += (yawTo - r.yaw) * e; r.nod += (nodTo - r.nod) * e;
    let armR, armL;
    if (r.rowing && this.rowed) { const ph = this.rowed.ph * Math.PI * 2; armR = armL = -1.15 + Math.sin(ph) * 0.55; }
    else if (grip) armR = armL = -1.25 + Math.sin(tm * 38) * 0.12;
    else if (cheer) armR = armL = -2.75 + Math.sin(tm * 14) * 0.2;
    else if (wave) { armR = -2.7 + Math.sin(tm * 13) * 0.32; armL = plan.grip; }
    else armR = armL = plan.grip;
    m.update(dt, { sit: !!plan.sit, armPose: armR, armPoseL: armL, expr: grip ? 'shock' : cheer || wave ? 'happy' : null });
    m.head.rotation.y = r.yaw; m.head.rotation.x = r.nod;
    m.arms[1].rotation.z = wave ? 0.35 + Math.sin(tm * 13) * 0.22 : 0;
    // (a breath of the body’s own on top of the craft’s: nobody is a statue; a shiver when it shakes)
    m.body.rotation.z = grip ? Math.sin(tm * 31) * 0.05 : Math.sin(tm * 1.7) * 0.025;
    if (plan.dangle) { const k = grip ? 0 : 0.28; m.legs[0].rotation.x = -0.25 + Math.sin(tm * 2.3) * k; m.legs[1].rotation.x = -0.25 - Math.sin(tm * 2.3) * k; }
    m.root.position.y = cheer ? Math.abs(Math.sin(tm * 9)) * 0.07 : 0;
  }
  // the head’s turn that looks out of the picture (the south), from where the body faces
  toPicture(r) { let d = -this.facing(r); while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return Math.max(-1.2, Math.min(1.2, d)); }

  // ------------------------------------------------------------------ arriving
  // where everybody will stand, by (x, z) — worked out ahead when the craft must know (a pelican
  // comes down by its own passenger’s spot)
  spots(x, z) { return (this.where = standing(this.P, x, z, this.heroes.length)); }

  // everybody out: a hop from their seat down to their spot; `face`: who they turn to. The
  // crew stays aboard (`crew: false`: gone with the heroes’ seats)
  land(x, z, { face = null, crew = true, hop = 0.42 } = {}) {
    const P = this.P, st = this.st;
    if (this.inn.length) this.snap();
    const spots = x === undefined ? this.where || this.spots(this.heroes[0].pos.x, this.heroes[0].pos.z) : this.spots(x, z);
    this.landed = true;
    this.heroes.forEach((p, i) => {
      const r = this.riders.find((q) => q.p === p), to = spots[i], a = p.actor;
      a.vel = { x: 0, z: 0 };
      const fx = face ? face[0] - to.x : 0, fz = face ? face[1] - to.z : 1, fl = Math.hypot(fx, fz) || 1;
      a.dir = { x: fx / fl, z: fz / fl };
      if (a.model) a.model.targetFacing = Math.atan2(a.dir.x, a.dir.z);
      if (r && !st.skipping && hop > 0) {
        r.holder.getWorldPosition(_v);
        a.pos = { x: _v.x, z: _v.z };
        this.out.push({ p, to, fx: _v.x, fz: _v.z, y: Math.max(0, _v.y - P.world.groundY(to)), T: hop + Math.min(0.25, _v.y * 0.06), k: 0, wait: i * 0.07 });
      } else { a.pos = { x: to.x, z: to.z }; a.jumpY = 0; a.jumpV = 0; this.show(p); }
      if (P.flashTag) P.flashTag(p, 4);
    });
    // (whoever is not a hero of this trip — a phone that joined on the way — is back as well)
    for (const p of P.players) if (!this.heroes.includes(p)) this.show(p);
    for (const r of this.riders.slice()) if (r.p && !this.out.some((o) => o.p === r.p)) this.drop(r);
    if (!crew) for (const r of this.riders.slice()) this.drop(r);
    if (!this.out.length && P.cam && P.cam.snap) P.cam.snap(P.camPlayers ? P.camPlayers() : null);
    return spots;
  }
  show(p) {
    p.away = false; p.hidden = false; if (p.actor) p.actor.hidden = false;
    const r = this.riders.find((q) => q.p === p);
    if (r) this.drop(r);
  }
  drop(r) { if (r.holder.parent) r.holder.parent.remove(r.holder); this.riders = this.riders.filter((q) => q !== r); }

  // the scene is over (the stage calls it, whatever happened): nobody aboard, hidden or away
  end() {
    if (this.over) return;
    this.over = true;
    const P = this.P;
    for (const o of this.inn) { const a = o.p.actor; a.pos = { x: o.fx, z: o.fz }; }
    this.snap();
    for (const r of this.riders.slice()) this.drop(r);
    this.hide(false);
    this.cam = null; this.rowed = null;
    // (a windy land holds its breath while they find their feet: no gust to push them about
    // the moment control is back)
    const Z = this.landed && P.zones, h = this.heroes[0], ev = Z && Z.events && h ? Z.events[Z.zoneIdAt(h.pos.x, h.pos.z)] : null;
    if (ev && ev.kind === 'gust') { ev.t = 0; ev.next = Math.max(ev.next || 0, 10); }
    if (this.landed && P.cam && P.cam.snap) P.cam.snap(P.camPlayers ? P.camPlayers() : null);
    if (this.st.trip === this) this.st.trip = null;
  }

  // ------------------------------------------------------------------ whose head is whose (Party)
  draw(ctx, W) {
    const P = this.P, v = P.cam && P.cam.views && P.cam.views[0];
    if (P.solo || !v || !P.toUi) return;
    const now = this.t, said = [], tags = [];
    for (const r of this.riders) {
      const p = r.p;
      if (!p || !r.holder.visible) continue;
      r.holder.getWorldPosition(_v);
      const u = P.toUi(v, _v.x, _v.y + (r.plan.sit ? 1.52 : 1.72), _v.z);
      // (their name as they board, then a little arrow of their colour — smaller than on the
      // ground: they sit close; none where the rows stand one behind the other, on each other’s faces)
      if (r.on < 2.4) tags.push({ p, x: u.x, y: u.y - 4, w: measure(p.name) + 6, a: Math.min(1, (2.4 - r.on) * 2.5) });
      else if (!r.plan.tiers) {
        const X = Math.round(u.x), Y = Math.round(u.y - 5);
        ctx.fillStyle = '#241a2e';
        ctx.fillRect(X - 3, Y - 1, 7, 3); ctx.fillRect(X - 2, Y + 2, 5, 1); ctx.fillRect(X - 1, Y + 3, 3, 1);
        ctx.fillStyle = p.color;
        ctx.fillRect(X - 2, Y, 5, 1); ctx.fillRect(X - 1, Y + 1, 3, 1); ctx.fillRect(X, Y + 2, 1, 1);
      }
      if (p.emote) said.push({ x: u.x, y: u.y - 16, icon: p.emote }); else drawSpeech(ctx, p, u.x, u.y - 16, now, said);
    }
    // (names side by side in a small craft: stacked rather than one over the other)
    tags.sort((a, b) => b.y - a.y);
    tags.forEach((g, i) => {
      for (let k = 0; k < 8; k++) { const hit = tags.slice(0, i).find((b) => Math.abs(b.x - g.x) < (g.w + b.w) / 2 + 1 && Math.abs(b.y - g.y) < 10); if (!hit) break; g.y = hit.y - 10; }
      const bx = Math.round(g.x - g.w / 2), by = Math.round(g.y - 10);
      ctx.globalAlpha = g.a;
      ctx.fillStyle = 'rgba(20,14,28,0.55)'; ctx.fillRect(bx + 1, by + 1, g.w, 10);
      ctx.fillStyle = g.p.color; ctx.fillRect(bx, by, g.w, 10);
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(bx, by, g.w, 1);
      drawText(ctx, g.p.name, g.x, by + 1, { color: '#241a2e', align: 'center' });
      ctx.globalAlpha = 1;
    });
    if (said.length) drawBubbles(ctx, said, 120, now, [2, W - 2]);
  }
}

// a trip begins: every hero off the ground (the stage keeps it until the scene ends)
export function aboard(st, heroes = null) { return new Trip(st, heroes); }
