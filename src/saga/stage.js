// World v7: the scene director. A scene is an async function given this
// stage: the camera travels and punches in (whole zoom steps: pixels stay
// crisp), actors walk, hop, emote and talk, black bars slide in, title cards,
// flashes, shakes, the big effects and music cues. The same scene plays in
// solo (the world's camera) and in Party Mode (one full-screen view); the host
// (Y on the crowned phone, the host menu, Esc on the big screen) or the solo
// player (Esc) skips it — every step then resolves at once, so a skipped scene
// still leaves the world exactly as a watched one.

import { drawText, measure } from '../engine/font.js';
import { audio } from '../engine/audio.js';
import { t } from '../i18n.js';
import { ctl, device } from '../ui/ui.js';

const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
const BAR = 0.11;                        // the black bars' height (of the screen)

export class Stage {
  constructor(P) {
    this.P = P;
    this.active = false;
    this.skipping = false;
    this.barK = 0; this.barsOn = false;
    this.card = null;                    // { title, sub, t, dur }
    this.flashes = [];                   // { color, t, dur }
    this.cv = null;                      // { x, z, ppu } while a scene holds the camera
    this.tw = null;                      // camera tween
    this.waits = [];
    this.walks = [];
    this.actors = new Map();             // id → { n, solo villager?, spawned? }
    this.props = new Map();              // key → { obj, tw, keep } (the Gloomstage, the Snuffer…)
    this.t = 0;
    this.skipHold = 0;
  }

  get solo() { return !!this.P.solo; }
  get world() { return this.P.world; }
  get dialogue() { return this.P.dialogue; }

  // ------------------------------------------------------------------ host glue
  freeze(on) {
    if (this.solo) { this.world.cinematic = on; this.world.hideHud = on; }
    else this.P.cinematic = on;
  }
  viewCentre() {
    if (this.solo) { const w = this.world; return { x: w.cam.x, z: w.cam.z, ppu: w.ppu }; }
    const v = this.P.cam.views[0];
    return { x: v ? v.cx : 0, z: v ? v.cz : 0, ppu: (v && v.ppu) || this.P.cam.ppu || 16 };
  }
  applyCam() {
    const c = this.cv;
    if (this.solo) this.world.director = c ? { x: c.x, z: c.z, ppu: c.ppu } : null;
    else this.P.cam.director = c ? { x: c.x, z: c.z, ppu: c.ppu } : null;
  }
  // the zoom a scene starts from (whole steps of 8 pixels a tile)
  basePpu() { return this.solo ? this.world.ppuBase || 16 : this.P.cam.ppu || 16; }

  // ------------------------------------------------------------------ playing
  async play(fn, opts = {}) {
    // (one scene at a time: the next one waits its turn, frame by frame)
    while (this.active) await this.P.wait(0.05);
    this.active = true; this.skipping = false; this.opts = opts; this.skipHold = 0;
    this.freeze(true);
    this.barsOn = opts.bars !== false;
    const v = this.viewCentre();
    this.cv = { x: v.x, z: v.z, ppu: v.ppu };
    this.applyCam();
    let err = null;
    try { await fn(this); } catch (e) { err = e; console.error('scene failed', e); }
    this.end();
    if (err && window.__errs) window.__errs.push('scene: ' + (err.message || err));
  }

  end() {
    this.barsOn = false; this.card = null; this.tw = null;
    for (const w of this.walks) this.arrive(w);
    this.walks = [];
    for (const w of this.waits) w.res();
    this.waits = [];
    this.releaseActors();
    for (const [k, pr] of [...this.props]) { if (pr.tw) { const w = pr.tw; for (const ax of ['x', 'y', 'z']) if (w.to[ax] !== undefined) pr.obj.position[ax] = w.to[ax]; pr.tw = null; w.res(); } if (!pr.keep) this.dropProp(k); }
    if (this.skyTw) { this.skyTw.step(1e9); const r = this.skyTw.res; this.skyTw = null; r(); }
    if (this.P.lighting) { this.P.lighting.gloom = 0; this.P.lighting.sepia = 0; }
    this.cv = null; this.applyCam();
    this.P.sceneMusic = null;
    this.freeze(false);
    this.active = false; this.skipping = false;
  }

  skip() {
    if (!this.active || (this.opts && this.opts.noSkip) || this.skipping) return;
    this.skipping = true;
    audio.sfx('page', { volume: 0.5 });
    const d = this.dialogue;
    if (d && d.cur) { d.cur.shown = d.cur.total; if (d.cur.choices) d.pick(0); else d.finish(); }
    if (d && d.letter) { const L = d.letter; d.letter = null; L.resolve(); }
    for (const w of this.waits) w.res();
    this.waits = [];
    for (const w of this.walks) this.arrive(w);
    this.walks = [];
    if (this.tw) { this.cv.x = this.tw.tx; this.cv.z = this.tw.tz; this.tw.res(); this.tw = null; this.applyCam(); }
    if (this.skyTw) { this.skyTw.step(1e9); const r = this.skyTw.res; this.skyTw = null; r(); }
    for (const pr of this.props.values()) if (pr.tw) { const w = pr.tw; for (const ax of ['x', 'y', 'z']) if (w.to[ax] !== undefined) pr.obj.position[ax] = w.to[ax]; if (w.to.ry !== undefined) pr.obj.rotation.y = w.to.ry; if (w.to.s !== undefined) pr.obj.scale.setScalar(w.to.s); pr.tw = null; w.res(); }
    this.card = null;
  }

  // (solo: a click or a tap on « skip » in the top bar — a touch screen has no Esc; world.js asks
  // before the dialogue box takes the tap for its own line)
  tapSkip(inp) {
    const R = this.skipRect;
    if (!this.solo || !this.active || this.skipping || !R || !inp.mouse.pressed || !inp.mouseIn(R.x, R.y, R.w, R.h)) return false;
    inp.mouse.pressed = false; this.skip(); return true;
  }

  update(dt) {
    this.t += dt;
    const on = this.barsOn && this.active;
    this.barK = Math.max(0, Math.min(1, this.barK + (on ? dt : -dt) * 2.8));
    if (this.card) { this.card.t += dt; if (this.card.t > this.card.dur) { const c = this.card; this.card = null; if (c.res) c.res(); } }
    this.flashes = this.flashes.filter((f) => (f.t += dt) < f.dur);
    if (!this.active) return;
    // (while a scene holds everything, the big effects still play)
    const C = this.P.combat;
    if (C && C.vfx) C.vfx.update(dt);
    // the camera
    if (this.tw) {
      const w = this.tw;
      w.t += dt;
      const k = ease(w.t / w.dur);
      this.cv.x = w.fx + (w.tx - w.fx) * k; this.cv.z = w.fz + (w.tz - w.fz) * k;
      if (w.t >= w.dur) { this.tw = null; w.res(); }
    } else if (this.follow) {
      const n = this.follow;
      const k = 1 - Math.exp(-dt * 4);
      this.cv.x += (n.pos.x - this.cv.x) * k; this.cv.z += (n.pos.z - 0.4 - this.cv.z) * k;
    }
    if (this.cv) this.applyCam();
    if (this.skyTw && this.skyTw.step(dt)) { const r = this.skyTw.res; this.skyTw = null; r(); }
    // the props (their own little animations, and their moves)
    for (const pr of this.props.values()) {
      const o = pr.obj;
      if (pr.tw) {
        const w = pr.tw;
        w.t += dt;
        const k = w.ease === 'lin' ? Math.min(1, w.t / w.dur) : ease(w.t / w.dur);
        for (const ax of ['x', 'y', 'z']) if (w.to[ax] !== undefined) o.position[ax] = w.from[ax] + (w.to[ax] - w.from[ax]) * k;
        if (w.to.ry !== undefined) o.rotation.y = w.from.ry + (w.to.ry - w.from.ry) * k;
        if (w.to.s !== undefined) o.scale.setScalar(w.from.s + (w.to.s - w.from.s) * k);
        if (w.t >= w.dur) { pr.tw = null; w.res(); }
      }
      if (o.userData.anim) o.userData.anim(this.t, dt);
    }
    // the walks
    for (const w of this.walks) if (!w.n.path || !w.n.path.length) { this.arrive(w); w.done = true; }
    this.walks = this.walks.filter((w) => !w.done);
    // the timers
    for (const w of this.waits) w.t -= dt;
    const due = this.waits.filter((w) => w.t <= 0);
    this.waits = this.waits.filter((w) => w.t > 0);
    for (const w of due) w.res();
    // skipping: Esc (or a gamepad's / the phone's B) held a moment in solo; the crowned
    // phone's Y in Party (host.js) — and with no phone to wear the crown, B held on the big screen
    if (this.solo) {
      const inp = this.P.game.input;
      if (inp.keys && (inp.keys.has('Escape') || inp.keys.has('Backspace') || inp.down('cancel'))) { this.skipHold += dt; if (this.skipHold > 0.35) this.skip(); } else this.skipHold = 0;
      this.tapSkip(inp);
    } else if (this.P.hostLed && !this.P.hostLed()) {
      if (this.P.players.some((p) => p.connected && p.kind !== 'phone' && p.input.down('b'))) { this.skipHold += dt; if (this.skipHold > 0.35) this.skip(); } else this.skipHold = 0;
    } else for (const p of this.P.players) if (p.connected && this.P.host && this.P.host.isHost(p) && p.input.pressed('y')) { p.input.edges.delete('y'); this.skip(); }
  }

  // (a named moment, for tests that want a picture of it)
  mark(name) { if (!this.skipping && typeof window !== 'undefined') window.__mark = name; }

  // ------------------------------------------------------------------ the scene's words
  // (every one of them resolves at once when the scene is being skipped)
  wait(sec) {
    if (this.skipping || sec <= 0) return Promise.resolve();
    return new Promise((res) => this.waits.push({ t: sec, res }));
  }

  // glide the camera to (x, z) over dur seconds (0: cut); ppu snaps to a whole step
  cam(x, z, { dur = 1.2, ppu = null } = {}) {
    if (ppu) this.cv.ppu = ppu;
    if (this.skipping || dur <= 0) { this.cv.x = x; this.cv.z = z; this.follow = null; this.applyCam(); return Promise.resolve(); }
    this.follow = null;
    return new Promise((res) => { this.tw = { fx: this.cv.x, fz: this.cv.z, tx: x, tz: z, t: 0, dur, res }; });
  }
  // a comic punch-in / out (instant, whole steps)
  punch(ppu) { this.cv.ppu = ppu; this.applyCam(); if (!this.skipping) audio.sfx('select', { volume: 0.35, pitch: ppu > 16 ? 4 : -4 }); }
  followActor(id) { const a = this.actorOf(id); this.follow = a ? a.n || a : null; }
  shake(k = 0.5) { if (this.skipping) return; if (this.solo) this.P.cam.shake = Math.max(this.P.cam.shake || 0, k); else this.P.cam.shake = Math.max(this.P.cam.shake || 0, k); }
  bars(on) { this.barsOn = on; }
  flash(color = '#ffffff', dur = 0.35) { if (!this.skipping) this.flashes.push({ color, t: 0, dur }); }
  // a title card: small line over a big one
  title(title, sub = '', dur = 3.2) {
    if (this.skipping) return Promise.resolve();
    return new Promise((res) => { this.card = { title: t(title), sub: sub ? t(sub) : '', t: 0, dur, res }; audio.sfx('chime', { volume: 0.5 }); });
  }
  fade(to, dur = 0.5) { return this.skipping ? (this.P.fadeTo(to, 0.01) || Promise.resolve()) : (this.P.fadeTo(to, dur) || Promise.resolve()); }
  music(track) { this.P.sceneMusic = track || null; if (track && !this.skipping) audio.playMusic(track, { fade: 0.8 }); }
  sfx(name, o) { if (!this.skipping) audio.sfx(name, o); }
  jingle(name) { if (!this.skipping) audio.jingle(name); }
  get vfx() { return this.P.combat ? this.P.combat.vfx : null; }
  fx(kind, x, y, z, n, o) { if (!this.skipping) this.world.fx.emit(kind, x, y, z, n, o); }

  // a line of dialogue (the dialogue box translates it); opts: expr, vars, shake, speed, emote, auto
  say(who, text, opts = {}) {
    if (this.skipping) return Promise.resolve();
    const a = this.actorOf(who);
    if (a && a.n) { if (opts.emote) a.n.setEmote(opts.emote, 1.6); if (opts.hop) a.n.hop(); a.n.forceExpr = opts.expr && opts.expr !== 'talk' ? opts.expr : null; }
    if (opts.shake) this.shake(0.25 * opts.shake);
    return this.dialogue.say(who, text, { ...opts, auto: opts.auto }).then((r) => { if (a && a.n) a.n.forceExpr = null; return r; });
  }

  // ------------------------------------------------------------------ actors
  actorOf(id) { return this.actors.get(id) || null; }

  // bring someone on stage at (x, z): a villager (in solo, the real one), a
  // saga character or anyone with an NPC entry
  actor(id, x, z, { face = null, hidden = false } = {}) {
    const P = this.P;
    let a = this.actors.get(id);
    if (!a) {
      let n = null, villager = false;
      if (this.solo && this.world.npcById) {
        n = this.world.npcById(id);
        if (n) { villager = true; n.scripted = true; n.path = null; n.map = 'overworld'; this.world.updateNpcVisibility && this.world.updateNpcVisibility(); }
      }
      if (!n) n = P.spawnNpc(id, x, z, face);
      if (!n) return null;
      a = { id, n, villager, speed: n.speed };
      this.actors.set(id, a);
    }
    const n = a.n;
    n.pos = { x, z }; n.path = null; n.hidden = hidden; n.talking = false;
    if (face) { n.restDir = face; n.dir = face; }
    return a;
  }

  // walk to (x, z); resolves on arrival (straight lines; give waypoints for corners)
  walk(id, x, z, { speed = null, run = false, via = null } = {}) {
    const a = this.actorOf(id);
    if (!a) return Promise.resolve();
    const n = a.n, pts = [...(via || []), [x, z]];
    n.speed = speed || (run ? 4.2 : a.speed || 2.1);
    n.talking = false;
    if (this.skipping) { n.pos = { x, z }; n.path = null; return Promise.resolve(); }
    n.path = pts.map((q) => [q[0], q[1]]);
    return new Promise((res) => this.walks.push({ a, n, x, z, res }));
  }
  arrive(w) { w.n.pos = { x: w.x, z: w.z }; w.n.path = null; w.n.speed = w.a.speed; w.res(); }

  face(id, x, z) {
    const a = this.actorOf(id);
    if (!a) return;
    const n = a.n, dx = x - n.pos.x, dz = z - n.pos.z, l = Math.hypot(dx, dz) || 1;
    n.restDir = { x: dx / l, z: dz / l }; n.dir = n.restDir;
  }
  emote(id, kind, dur = 1.8) { const a = this.actorOf(id); if (a && !this.skipping) a.n.setEmote(kind, dur); }
  hop(id, delay = 0) { const a = this.actorOf(id); if (a && !this.skipping) a.n.hop(delay); }
  expr(id, ex) { const a = this.actorOf(id); if (a) a.n.forceExpr = ex; }
  hide(id, on = true) { const a = this.actorOf(id); if (a) a.n.hidden = on; }
  // leave someone where they stand after the scene (else they're sent home / removed)
  keep(id) { const a = this.actorOf(id); if (a) a.keep = true; }

  // ---- 3D props on stage: place, move (tween), remove
  prop(key, obj, x, y, z, { keep = false } = {}) {
    this.dropProp(key);
    obj.position.set(x, y, z);
    this.P.world.over.root.add(obj);
    this.props.set(key, { obj, tw: null, keep });
    return obj;
  }
  propOf(key) { const p = this.props.get(key); return p ? p.obj : null; }
  move(key, to, dur = 1, { ease: e = 'smooth' } = {}) {
    const pr = this.props.get(key);
    if (!pr) return Promise.resolve();
    const o = pr.obj;
    if (pr.tw) pr.tw.res();
    if (this.skipping || dur <= 0) {
      for (const ax of ['x', 'y', 'z']) if (to[ax] !== undefined) o.position[ax] = to[ax];
      if (to.ry !== undefined) o.rotation.y = to.ry;
      if (to.s !== undefined) o.scale.setScalar(to.s);
      pr.tw = null;
      return Promise.resolve();
    }
    return new Promise((res) => { pr.tw = { from: { x: o.position.x, y: o.position.y, z: o.position.z, ry: o.rotation.y, s: o.scale.x }, to, t: 0, dur, ease: e, res }; });
  }
  dropProp(key) {
    const pr = this.props.get(key);
    if (!pr) return;
    if (pr.tw) pr.tw.res();
    if (pr.obj.parent) pr.obj.parent.remove(pr.obj);
    if (pr.obj.userData.dispose) pr.obj.userData.dispose();
    this.props.delete(key);
  }

  releaseActors() {
    for (const a of this.actors.values()) {
      const n = a.n;
      n.forceExpr = null; n.path = null; n.speed = a.speed;
      if (a.keep) continue;
      if (a.villager) { n.scripted = false; if (this.world.npcResume) this.world.npcResume(a.id); }
      else if (!a.stay) this.P.removeNpc(a.id);
    }
    this.actors.clear();
    this.follow = null;
  }

  // the heroes: face a point, cheer, gasp…
  heroes() { return this.P.players.filter((p) => p.connected !== false); }
  heroesFace(x, z) {
    for (const p of this.heroes()) {
      const a = p.actor, dx = x - a.pos.x, dz = z - a.pos.z, l = Math.hypot(dx, dz) || 1;
      a.dir = { x: dx / l, z: dz / l };
      if (a.model) { a.model.targetFacing = Math.atan2(a.dir.x, a.dir.z); }
    }
  }
  heroesEmote(kind, dur = 1.8) { if (this.skipping) return; for (const p of this.heroes()) { if (p.setEmote) p.setEmote(kind, dur); else if (p.actor && p.actor.setEmote) p.actor.setEmote(kind, dur); } }
  // the one who speaks for the heroes (you in solo, the first phone in Party)
  get lead() { return this.solo ? 'player' : (this.P.players.find((p) => p.connected) || this.P.players[0] || { who: 'narrator' }).who; }

  // the sky: a shadow over the sun (gloom) and colours drained (drain), eased
  // an old photograph's tint over everything (a flashback), 0..1
  sepia(k = 1) { if (this.P.lighting) this.P.lighting.sepia = k; }
  lights(gloom, drain, dur = 0) {
    const L = this.P.lighting;
    if (!L) return Promise.resolve();
    if (this.skipping || dur <= 0) { L.gloom = gloom; if (drain !== null) L.drain = drain; return Promise.resolve(); }
    const g0 = L.gloom, d0 = L.drain;
    return new Promise((res) => {
      const w = { t: 0, dur, res: null };
      const step = (dt) => { w.t += dt; const k = ease(w.t / dur); L.gloom = g0 + (gloom - g0) * k; if (drain !== null) L.drain = d0 + (drain - d0) * k; return w.t >= dur; };
      this.skyTw = { step, res };
    });
  }

  // ------------------------------------------------------------------ drawing (over the world, under the dialogue box)
  draw(ctx, W, H) {
    for (const f of this.flashes) {
      ctx.globalAlpha = Math.max(0, 1 - f.t / f.dur) * 0.85;
      ctx.fillStyle = f.color; ctx.fillRect(0, 0, W, H);
    }
    ctx.globalAlpha = 1;
    if (this.barK > 0) {
      const h = Math.round(H * BAR * ease(this.barK));
      ctx.fillStyle = '#120c18';
      ctx.fillRect(0, 0, W, h); ctx.fillRect(0, H - h, W, h);
      this.skipRect = null;
      if (this.active && !this.skipping && h > 12 && !(this.opts && this.opts.noSkip)) {
        const dev = device();
        const hint = this.solo ? (dev === 'touch' ? t('Tap here to skip ▸▸') : dev === 'pad' || dev === 'phone' ? t('Hold {b} to skip', { b: ctl('cancel') }) : t('Hold Esc to skip'))
          : this.P.hostLed && !this.P.hostLed() ? t('Hold {b} to skip', { b: 'B' }) : t('The host can skip (Y)');
        ctx.globalAlpha = 0.55 + 0.2 * Math.sin(this.t * 3);
        // (in the top bar: the dialogue box covers the bottom one)
        drawText(ctx, hint, W - 6, Math.max(2, Math.round((h - 9) / 2)), { color: '#b9a2e3', align: 'right' });
        ctx.globalAlpha = 1;
        // (clickable in solo: the whole corner of the bar, big enough for a thumb)
        if (this.solo) { const w = measure(hint) + 16; this.skipRect = { x: W - w - 4, y: 0, w: w + 4, h }; }
      }
    }
    const c = this.card;
    if (c) {
      const k = Math.min(1, c.t / 0.35, (c.dur - c.t) / 0.45);
      ctx.globalAlpha = Math.max(0, k);
      const sc = W >= 700 ? 3 : 2, tw = measure(c.title, sc), sw = c.sub ? measure(c.sub) : 0;
      const pw = Math.max(tw, sw) + 34, ph = 9 * sc + (c.sub ? 20 : 12);
      const px = Math.round((W - pw) / 2), py = Math.round(H * 0.28 - ph / 2 + (1 - k) * 6);
      ctx.fillStyle = 'rgba(18,12,24,0.78)'; ctx.fillRect(px, py, pw, ph);
      ctx.fillStyle = '#ffd66b'; ctx.fillRect(px + 6, py + 3, pw - 12, 1); ctx.fillRect(px + 6, py + ph - 4, pw - 12, 1);
      if (c.sub) drawText(ctx, c.sub, W / 2, py + 7, { color: '#b9a2e3', align: 'center' });
      drawText(ctx, c.title, W / 2, py + (c.sub ? 17 : 6), { color: '#fff3c4', align: 'center', scale: sc, outline: '#3b2a2e' });
      ctx.globalAlpha = 1;
    }
  }
}
