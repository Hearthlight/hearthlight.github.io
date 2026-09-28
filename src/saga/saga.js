// World v7: the saga — the main story, its chapters and quests, shared by the
// solo game (hosted by Wild, a party of one) and Party Mode (hosted by the
// Adventure act). One state per game (solo: the save; Party: localStorage),
// one lantern, one map: the heroes share it all.
//
// A chapter (chapters/chN.js) brings NPCs (placed while `when(S)` holds),
// quests (steps: talk · go · kill · camp · collect · dungeon · flag · scene),
// scenes (stage.js) and the lands it opens when it ends (the Murk rolls back).
// Scripts get this saga as `S`: S.say / S.ask / S.scene / S.give / S.flag…

import { t } from '../i18n.js';
import { audio } from '../engine/audio.js';
import { drawText, measure } from '../engine/font.js';
import { questXp } from './levels.js';
import { CHAPTERS, QUESTS } from './chapters/index.js';
import { ZONES } from '../world/big/layout.js';
import { Murk } from './murk.js';
import { Dungeons } from './dungeon.js';
import { PelicanPost } from './pelican.js';
import { Escorts } from './escort.js';
import { StepGames } from './games7.js';
import { TeacupLine } from './teacup.js';

const GAME_STEPS = new Set(['whack', 'lamps', 'kite', 'net', 'carry', 'rhythm', 'piles', 'seek', 'snap', 'defend', 'chase']);

const TALK_R = 1.7;
const FRESH = () => ({ v: 1, ch: 1, q: {}, f: {}, open: ['valley'], lit: [], dun: {}, got: {}, seen: {} });

export class Saga {
  constructor(P) {
    this.P = P;
    this.solo = !!P.solo;
    this.st = this.load();
    this.npcs = new Map();              // id → the Npc the saga placed
    this.pickups = [];                  // glinting things to pick up for a quest
    this.escorts = new Escorts(this);   // someone to see safely somewhere
    this.games = new StepGames(this);   // stomp, relight, fly a kite
    this.camps = new Map();             // id → camp (in P.encounters)
    this.syncT = 0; this.checkT = 0;
    this.busyTalk = false;
    this.dead = false;
    this.hooks = [];
    this.applyValley();
    this.murk = P.big ? (P.murk = new Murk(P, this)) : null;
    this.dungeons = P.big ? (P.dungeons = new Dungeons(P, this)) : null;
    this.post = P.big ? new PelicanPost(P, this) : null;
    this.teacup = P.big ? new TeacupLine(P, this) : null;
    this.catchUp();
    // (the current chapter's lands are open — even on a save from before a chapter grew)
    for (const z of this.chapter.zones || []) if (!this.st.open.includes(z)) this.st.open.push(z);
    if (this.murk) this.murk.refresh(true);
    // (a saved game: the steps under way get their camps and pickups back)
    for (const qid of this.activeIds()) {
      const st = this.stepDef(qid);
      if (!st) continue;
      if (st.do === 'camp') this.ensureCamp(st.camp);
      if (st.do === 'collect' && st.spots) this.placePickups(qid, st);
      if (st.do === 'escort') this.escorts.begin(qid, st);
      if (GAME_STEPS.has(st.do)) this.games.begin(qid, st);
    }
  }

  // ------------------------------------------------------------------ the valley’s lighthouse
  // (lit before the Duchess comes, dark from her visit until it’s relit)
  applyValley() { this.lighthouse(!this.has('snuffed') || this.done('c1_relight')); }
  lighthouse(on) {
    const w = this.P.world;
    if (w.beam) w.beam.visible = on && (!w.mapId || w.mapId === 'overworld');
    const L = w.over && w.over.lighthouseLamp;
    if (L && L.lamp) L.lamp.emissiveIntensity = on ? 1.5 : 0.05;
    if (this.P.state) { this.P.state.flags.shardsPlaced = on; this.P.state.flags.lighthouseLit = on; }
  }
  onLighthouse(on) { this.lighthouse(on); }

  // ------------------------------------------------------------------ save
  load() {
    const s = this.P.loadSave('saga', null);
    if (!s || s.v !== 1) return FRESH();
    return { ...FRESH(), ...s };
  }
  save() { if (!this.dead) this.P.writeSave('saga', this.st); }
  reset() { this.st = FRESH(); this.save(); }
  dispose() {
    this.dead = true;
    if (this.props) { for (const q of this.props.values()) { this.P.world.over.root.remove(q.obj); if (q.col) this.P.world.overCol.remove(q.col); } this.props.clear(); }
    if (this.murk) { this.murk.dispose(); if (this.P.murk === this.murk) this.P.murk = null; this.murk = null; }
    if (this.dungeons) { this.dungeons.dispose(); if (this.P.dungeons === this.dungeons) this.P.dungeons = null; this.dungeons = null; }
    for (const id of [...this.npcs.keys()]) this.dropNpc(id);
    for (const pk of this.pickups) if (pk.obj && pk.obj.parent) pk.obj.parent.remove(pk.obj);
    this.pickups = [];
    if (this.P.swim) this.P.swim.spots = this.P.swim.spots.filter((s) => !s.pick);
    this.escorts.dispose();
    this.games.dispose();
  }

  get stage() { return this.P.stage; }
  get chapter() { return CHAPTERS.find((c) => c.id === this.st.ch) || CHAPTERS[0]; }
  flag(k, v = true) { if (v === undefined) return this.st.f[k]; this.st.f[k] = v; this.save(); return v; }
  has(k) { return !!this.st.f[k]; }
  isOpen(zoneId) { return zoneId === 'sea' || this.st.open.includes(zoneId); }

  // ------------------------------------------------------------------ quests
  qs(id) { return this.st.q[id] || null; }
  active(id) { const q = this.st.q[id]; return !!q && !q.done; }
  done(id) { const q = this.st.q[id]; return !!q && q.done; }
  stepOf(id) { const q = this.st.q[id]; return q ? q.s : -1; }
  stepDef(id) { const Q = QUESTS[id], q = this.st.q[id]; return Q && q && !q.done ? Q.steps[q.s] || null : null; }
  activeIds() { return Object.keys(this.st.q).filter((id) => !this.st.q[id].done && QUESTS[id]); }

  // can this quest be offered now?
  available(id) {
    const Q = QUESTS[id];
    if (!Q || this.st.q[id]) return false;
    if (Q.ch && Q.ch > this.st.ch) return false;
    if (Q.after && ![].concat(Q.after).every((a) => this.done(a))) return false;
    if (Q.when && !Q.when(this)) return false;
    return true;
  }

  start(id, { silent = false } = {}) {
    const Q = QUESTS[id];
    if (!Q || this.st.q[id]) return;
    this.st.q[id] = { s: 0, n: 0, done: false };
    this.save();
    if (!silent) {
      audio.jingle('questStart');
      this.P.toast(t(Q.kind === 'side' ? 'New side quest: {q}' : 'New quest: {q}', { q: t(Q.title) }), Q.kind === 'side' ? '#8fd6b4' : '#ffd66b');
    }
    this.enterStep(id);
  }

  // step setup: spawn what it needs (camps, pickups), run its opening
  enterStep(id) {
    const st = this.stepDef(id);
    if (!st) return;
    if (st.do === 'camp') this.ensureCamp(st.camp);
    if (st.do === 'collect' && st.spots) this.placePickups(id, st);
    if (st.do === 'escort') this.escorts.begin(id, st);
    if (GAME_STEPS.has(st.do)) this.games.begin(id, st);
    if (st.enter) st.enter(this);
    if (st.do === 'scene' && !this.busyTalk) this.runStep(id);
  }

  async advance(id) {
    const q = this.st.q[id], Q = QUESTS[id];
    if (!q || q.done) return;
    q.s++; q.n = 0;
    this.save();
    if (this.solo && this.P.world) this.P.world.saveSoon = true;   // (a checkpoint: the solo game saves when it's calm)
    if (q.s >= Q.steps.length) { await this.complete(id); return; }
    audio.sfx('chime', { volume: 0.5 });
    this.enterStep(id);
    this.refreshCard();
  }

  async complete(id) {
    const q = this.st.q[id], Q = QUESTS[id];
    if (!q || q.done) return;
    q.done = true; q.day = this.P.state ? this.P.state.day : 0;
    this.save();
    audio.jingle('questDone');
    this.P.showBanner(t('Quest complete: {q}', { q: t(Q.title) }), this.rewardText(Q));
    this.reward(Q);
    if (Q.done) await Q.done(this);
    // (a mini-game to play again: counted, then offered afresh)
    if (Q.repeat) {
      this.st.f['plays:' + id] = (this.st.f['plays:' + id] || 0) + 1;
      delete this.st.q[id];
      for (const k of Object.keys(this.st.got)) if (k.startsWith(id + ':')) delete this.st.got[k];
      this.save();
    }
    // (a chapter’s last quest turns the page)
    if (Q.next && this.st.ch < Q.next) await this.beginChapter(Q.next);
    // what comes next: quests that follow on by themselves
    for (const [nid, N] of Object.entries(QUESTS)) if (N.auto && this.available(nid)) this.start(nid);
    this.refreshCard();
  }
  // (an older save: chapters its finished quests have already opened, and their first quests)
  catchUp() {
    for (const [id, Q] of Object.entries(QUESTS)) if (Q.next && this.done(id) && this.st.ch < Q.next) {
      this.st.ch = Q.next;
      const C = CHAPTERS.find((c) => c.id === Q.next);
      for (const z of (C && C.zones) || []) if (!this.st.open.includes(z)) this.st.open.push(z);
    }
    for (const [nid, N] of Object.entries(QUESTS)) if (N.auto && this.available(nid)) this.start(nid, { silent: true });
  }

  rewardText(Q) {
    const bits = [t('+{n} XP', { n: this.xpOf(Q) })];
    if (Q.dust) bits.push(t('+{n} stardust', { n: Q.dust }));
    return bits.join(' · ');
  }
  xpOf(Q) { return Q.xp || Math.round(questXp(Q.lv || this.chapter.lv || 1, Q.kind === 'side' ? 'side' : 'main') * (Q.repeat ? 0.3 : 1)); }
  plays(id) { return this.st.f['plays:' + id] || 0; }

  reward(Q) {
    const P = this.P, C = P.combat;
    for (const p of P.players) {
      if (!p.connected && !this.solo) continue;
      if (C && p.fighter) C.gainXp(p, this.xpOf(Q));
      if (Q.dust && P.progress) { const pr = P.profileOf(p); pr.dust = (pr.dust || 0) + Q.dust; }
      if (Q.gear && P.progress && P.progress.give) P.progress.give(p, { rich: Q.gear === 'rich' });
    }
    if (Q.coins && this.solo && P.world.addCoins) P.world.addCoins(Q.coins);
    if (P.progress && P.progress.sendAll) P.progress.sendAll();
  }

  // the step’s own script (talks, scenes), then on to the next one
  async runStep(id, p = null) {
    const st = this.stepDef(id);
    if (!st || this.running) return;
    this.running = id;
    try {
      if (st.run) await st.run(this, p);
      if (this.stepDef(id) === st) await this.advance(id);
    } catch (e) { console.error('saga step', id, e); if (window.__errs) window.__errs.push('saga: ' + e.message); }
    this.running = null;
  }

  // ------------------------------------------------------------------ chapters
  async beginChapter(n) {
    const C = CHAPTERS.find((c) => c.id === n);
    if (!C) return;
    this.st.ch = n;
    for (const z of C.zones || []) if (!this.st.open.includes(z)) this.st.open.push(z);
    this.save();
    // (the Murk rolls back from the chapter's lands at once)
    if (this.P.murk) this.P.murk.refresh();
    if (C.begin) await C.begin(this);
    for (const [id, Q] of Object.entries(QUESTS)) if (Q.ch === n && Q.auto && this.available(id)) this.start(id);
  }

  // the Murk rolls back from these lands (the scene is the chapter’s business)
  openZones(ids) {
    for (const z of ids) if (!this.st.open.includes(z)) this.st.open.push(z);
    this.save();
    if (this.P.murk) this.P.murk.refresh();
  }

  // ------------------------------------------------------------------ talking
  // who’s placed: every chapter up to this one says who stands where
  wanted() {
    const out = new Map();
    for (const C of CHAPTERS) {
      if (C.id > this.st.ch) continue;
      for (const N of C.npcs || []) {
        if (N.when && !N.when(this)) continue;
        const at = typeof N.at === 'function' ? N.at(this) : N.at;
        if (at) out.set(N.id, { ...N, at });
      }
    }
    return out;
  }

  // things a chapter stands in the world (a cave’s mouth, a roost…), while `when` holds
  syncProps() {
    const P = this.P;
    this.props = this.props || new Map();
    const want = new Set();
    for (const C of CHAPTERS) {
      if (C.id > this.st.ch) continue;
      for (const Pr of C.props || []) {
        if (Pr.when && !Pr.when(this)) continue;
        want.add(Pr.id);
        if (this.props.has(Pr.id)) continue;
        const obj = Pr.build(P.r3d, this);
        obj.position.set(Pr.at[0], 0, Pr.at[1]);
        P.world.over.root.add(obj);
        const col = Pr.r ? { x: Pr.at[0], z: Pr.at[1] + (Pr.rz || 0), r: Pr.r } : null;
        if (col) P.world.overCol.add(col);
        this.props.set(Pr.id, { obj, col });
      }
    }
    for (const [id, q] of this.props) if (!want.has(id)) { P.world.over.root.remove(q.obj); if (q.col) P.world.overCol.remove(q.col); this.props.delete(id); }
  }

  syncNpcs() {
    this.syncProps();
    const P = this.P, want = this.wanted();
    for (const [id, n] of this.npcs) if (!want.has(id) && !(this.stage && this.stage.actorOf(id))) this.dropNpc(id);
    for (const [id, N] of want) {
      if (this.stage && this.stage.actorOf(id)) continue;
      if (this.solo && N.villager) continue;          // (in solo the real villager is there)
      let n = this.npcs.get(id);
      const near = P.players.some((p) => Math.abs(p.pos.x - N.at[0]) < 70 && Math.abs(p.pos.z - N.at[1]) < 50);
      if (!near) { if (n) this.dropNpc(id); continue; }
      if (!n || !P.npcs.includes(n)) {
        n = P.spawnNpc(id, N.at[0], N.at[1], N.face || { x: 0, z: 1 });
        if (!n) continue;
        n.saga = N; n.activity = N.act || null;
        this.npcs.set(id, n);
      }
    }
  }
  // (solo) where a villager should stand while the saga needs them
  villagerSpot(id) {
    const N = this.wanted().get(id);
    if (!N || !N.villager || !this.offerOf(id)) return null;
    return { map: 'overworld', x: N.at[0], z: N.at[1], act: 'wait', face: N.face || { x: 0, z: 1 } };
  }
  // the NPC standing for someone of the saga (the real villager in solo)
  npcFor(id) {
    const n = this.npcs.get(id);
    if (n) return n;
    if (this.solo && this.P.world.npcById) { const v = this.P.world.npcById(id); if (v && v.map === 'overworld' && !v.hidden) return v; }
    return null;
  }

  dropNpc(id) {
    const n = this.npcs.get(id);
    this.npcs.delete(id);
    if (n && !(this.stage && this.stage.actorOf(id))) this.P.removeNpc(id);
  }

  // what an NPC has for you: a step to talk through (?), a quest to give (!)
  offerOf(id) {
    for (const qid of this.activeIds()) { const st = this.stepDef(qid); if (st && st.do === 'talk' && st.npc === id) return { kind: 'step', qid, st }; }
    // (a quest to play again waits behind anything new the same person has)
    let again = null;
    for (const [qid, Q] of Object.entries(QUESTS)) if (Q.giver === id && this.available(qid)) { if (!Q.repeat) return { kind: 'give', qid, Q }; again = again || { kind: 'give', qid, Q }; }
    return again;
  }

  // everyone who has something for the heroes right now
  offerIds() {
    const out = new Set();
    for (const qid of this.activeIds()) { const st = this.stepDef(qid); if (st && st.do === 'talk') out.add(st.npc); }
    for (const [qid, Q] of Object.entries(QUESTS)) if (Q.giver && this.available(qid)) out.add(Q.giver);
    return out;
  }

  // (A near someone of the saga — Party’s act and the solo Wild ask this first)
  nearThing(p) {
    if (this.busyTalk || (this.stage && this.stage.active)) return null;
    for (const [id, n] of this.npcs) {
      if (n.hidden || Math.hypot(n.pos.x - p.pos.x, n.pos.z - p.pos.z) > TALK_R) continue;
      return { kind: 'secret', label: 'Talk', hint: 'Talk to {npc}', vars: { npc: (n.def && n.def.short) || id }, use: (q) => this.talk(id, q || p) };
    }
    const g = this.games.nearThing(p);
    if (g) return g;
    for (const pk of this.pickups) {
      if (pk.got || pk.dive || Math.hypot(pk.x - p.pos.x, pk.z - p.pos.z) > 1.4) continue;
      return { kind: 'secret', label: pk.verb || 'Pick up', hint: pk.hint || 'Something glints here', use: (q) => this.pick(pk, q || p) };
    }
    const th = this.post ? this.post.nearThing(p) : null;
    return th || (this.teacup ? this.teacup.nearThing(p) : null);
  }

  async talk(id, p) {
    if (this.busyTalk) return;
    const n = this.npcFor(id);
    const N = n && n.saga;
    this.busyTalk = true;
    this.P.busy++;
    if (n) { n.talking = true; n.lookAt = p.pos; }
    try {
      const o = this.offerOf(id);
      if (o && o.kind === 'step') { await this.runStep(o.qid, p); }
      else if (o && o.kind === 'give') { if (o.Q.offer) await o.Q.offer(this, p); this.start(o.qid); }
      else if (N && N.talk) await N.talk(this, p);
      else if (N && N.lines) await this.say(id, N.lines[(this.lineN = (this.lineN || 0) + 1) % N.lines.length]);
    } catch (e) { console.error('saga talk', e); if (window.__errs) window.__errs.push('saga talk: ' + e.message); }
    if (n) { n.talking = false; n.forceExpr = null; }
    this.P.busy--;
    this.busyTalk = false;
  }

  // ------------------------------------------------------------------ words (the dialogue box translates)
  get me() { return this.stage ? this.stage.lead : 'player'; }
  say(who, text, opts = {}) {
    if (this.stage && this.stage.active) return this.stage.say(who, text, opts);
    const n = this.npcs.get(who) || (this.P.npcs || []).find((q) => q.id === who);
    if (n) { if (opts.emote) n.setEmote(opts.emote, 1.6); if (opts.hop) n.hop(); n.forceExpr = opts.expr && opts.expr !== 'talk' ? opts.expr : null; }
    return this.P.dialogue.say(who, text, opts).then((r) => { if (n) n.forceExpr = null; return r; });
  }
  // a choice: the phones vote in Party; a menu in solo
  ask(question, options, who = null) {
    if (this.solo) return this.P.dialogue.choose(who || 'narrator', question, options, { cancel: options.length - 1 });
    return this.P.ask(t(question), options.map((o) => ({ label: t(o) })), 20);
  }
  scene(fn, opts) { return this.stage.play(fn, opts); }
  toast(text, vars, color = '#ffd66b') { this.P.toast(t(text, vars), color); }
  banner(title, sub = '', vars) { this.P.showBanner(t(title, vars), sub ? t(sub, vars) : ''); }

  // ------------------------------------------------------------------ fights & things to find
  onKill(e, p) {
    for (const qid of this.activeIds()) {
      const st = this.stepDef(qid);
      if (!st || st.do !== 'kill') continue;
      if (st.what && !st.what.includes(e.type) && !(st.tag && e.sagaTag === st.tag)) continue;
      if (!st.what && st.tag && e.sagaTag !== st.tag) continue;
      if (st.at && Math.hypot(e.x - st.at[0], e.z - st.at[1]) > (st.r || 30)) continue;
      const q = this.st.q[qid];
      q.n++;
      this.save();
      if (q.n >= st.n) this.runStep(qid, p); else this.refreshCard();
    }
    // things only some foes carry
    for (const qid of this.activeIds()) {
      const st = this.stepDef(qid);
      if (!st || st.do !== 'collect' || !st.drop || !st.drop.includes(e.type) || Math.random() > (st.chance ?? 0.5)) continue;
      this.gain(qid, st, p);
    }
  }

  gain(qid, st, p) {
    const q = this.st.q[qid];
    q.n++;
    this.save();
    this.toast('{item} {n}/{total}', { item: t(st.item), n: Math.min(q.n, st.n), total: st.n }, '#fff3c4');
    audio.sfx('chime', { volume: 0.6 });
    if (q.n >= st.n) this.runStep(qid, p); else this.refreshCard();
  }

  // glinting pickups for a collect step (they stay picked in the save)
  // (`dive`: they lie at the bottom — dive where bubbles rise; `order`: they must be
  // taken in the order given, a wrong one puts them all back)
  placePickups(qid, st) {
    for (const [i, s] of st.spots.entries()) {
      const key = qid + ':' + this.stepOf(qid) + ':' + i;
      if (this.st.got[key] || this.pickups.some((pk) => pk.key === key)) continue;
      const pk = { key, qid, i, x: s[0], z: s[1], hint: st.hint, verb: st.verb || null, got: false, glint: 0, sound: st.sound || null, dive: !!st.dive };
      // (`drift`: it floats along a path, round and round — a bottle on the current)
      if (st.drift) { pk.path = st.drift[i]; pk.u = (i * 0.37) % 1; pk.speed = st.speed || 1.2; }
      if (st.model) { pk.obj = st.model(this.P.r3d, i); pk.obj.position.set(pk.x, 0, pk.z); this.P.world.over.root.add(pk.obj); }
      this.pickups.push(pk);
      if (st.dive && this.P.swim) this.P.swim.spots.push({ x: s[0], z: s[1], taken: false, pick: (p) => this.pick(pk, p) });
    }
  }
  pick(pk, p) {
    if (pk.got) return;
    const st = this.stepDef(pk.qid);
    if (st && st.order) {
      const q = this.st.q[pk.qid], want = st.order[q.n || 0];
      audio.sfx('tone', { volume: 0.7, pitch: st.notes ? st.notes[pk.i] : [0, 4, 7, 12, 16][pk.i % 5] });
      if (pk.i !== want) {
        // (the wrong one: the ones taken so far go back)
        for (const k of Object.keys(this.st.got)) if (k.startsWith(pk.qid + ':' + this.stepOf(pk.qid) + ':')) delete this.st.got[k];
        q.n = 0;
        this.placePickups(pk.qid, st);
        audio.sfx('error', { volume: 0.6 });
        this.P.toast(t(st.wrong || 'Not in that order. Everything goes back to the start.'), '#ff9a8a');
        this.refreshCard();
        return;
      }
    }
    pk.got = true; this.st.got[pk.key] = 1;
    if (pk.obj && pk.obj.parent) pk.obj.parent.remove(pk.obj);
    this.pickups = this.pickups.filter((q) => q !== pk);
    this.P.world.fx.emit('sparkle', pk.x, 0.6, pk.z, 14, { color: '#fff3a6' });
    if (st && st.do === 'collect') this.gain(pk.qid, st, p);
  }

  // a camp the story needs cleared (it lives among the land’s camps, once)
  ensureCamp(def) {
    const E = this.P.encounters;
    if (!E || !def) return;
    if (E.camps.some((c) => c.id === 'saga:' + def.id)) return;
    E.camps.push({ id: 'saga:' + def.id, zone: def.zone || 'valley', x: def.at[0], z: def.at[1], level: def.level || 2, pool: def.foes, big: def.big, once: true, saga: def,
      state: this.st.f['camp:' + def.id] ? 'cleared' : 'idle', foes: [], props: null, seen: false, clearedAt: this.st.f['camp:' + def.id] ? 1 : -1e9 });
  }
  onCampCleared(c) {
    if (!c.saga) return;
    this.st.f['camp:' + c.saga.id] = 1;
    this.save();
    for (const qid of this.activeIds()) { const st = this.stepDef(qid); if (st && st.do === 'camp' && st.camp.id === c.saga.id) this.runStep(qid); }
  }

  onDungeon(id) {
    this.st.dun[id] = (this.st.dun[id] || 0) + 1;
    this.save();
    for (const qid of this.activeIds()) { const st = this.stepDef(qid); if (st && st.do === 'dungeon' && st.id === id) this.runStep(qid); }
  }

  // ------------------------------------------------------------------ frame
  update(dt) {
    if (this.dead) return;
    const P = this.P;
    if (this.murk) this.murk.update(dt);
    if (this.dungeons) this.dungeons.update(dt);
    if (this.post) this.post.update(dt);
    // (the chapters’ props move every frame; a chapter may watch the world too)
    this.t = (this.t || 0) + dt;
    if (this.props) for (const q of this.props.values()) if (q.obj.userData.anim) q.obj.userData.anim(this.t, this);
    for (const C of CHAPTERS) if (C.update && C.id <= this.st.ch) C.update(this, dt);
    // nobody stays lost inside the Murk (an old save, a stray teleport): back to the plaza
    this.lostT = (this.lostT || 0) - dt;
    if (this.lostT <= 0 && this.murk) {
      this.lostT = 2;
      for (const p of P.players) if ((p.connected || this.solo) && !p.roomExit && !p.dungeonExit && this.murk.at(Math.floor(p.pos.x), Math.floor(p.pos.z))) { const s = this.safeSpot(); if (this.solo) P.gatherAt(s.x, s.z); else { p.actor.pos = { x: s.x, z: s.z }; P.cam.snap(P.camPlayers()); } }
    }
    this.syncT -= dt;
    if (this.syncT <= 0) { this.syncT = 0.5; this.syncNpcs(); }
    for (const pk of this.pickups) {
      if (pk.path) {
        // (along the path at its speed, looping; the model bobs with the swell)
        const pts = pk.path, n = pts.length;
        let len = 0; for (let k = 0; k < n; k++) len += Math.hypot(pts[(k + 1) % n][0] - pts[k][0], pts[(k + 1) % n][1] - pts[k][1]);
        pk.u = (pk.u + (dt * pk.speed) / (len || 1)) % 1;
        let d = pk.u * len;
        for (let k = 0; k < n; k++) {
          const [ax, az] = pts[k], [bx, bz] = pts[(k + 1) % n], L = Math.hypot(bx - ax, bz - az);
          if (d <= L) { pk.x = ax + ((bx - ax) * d) / (L || 1); pk.z = az + ((bz - az) * d) / (L || 1); break; }
          d -= L;
        }
      }
      if (pk.obj) { pk.obj.position.set(pk.x, Math.sin(this.t * 2 + pk.i) * 0.08, pk.z); pk.obj.rotation.y = this.t * 0.4 + pk.i; }
      pk.glint -= dt;
      if (pk.glint > 0) continue;
      // (a thing to find by ear: no glint — a note now and then, heard from close by)
      if (pk.dive) {
        // (bubbles rising where it lies)
        pk.glint = 0.5 + Math.random() * 0.4;
        if (P.players.some((p) => Math.abs(p.pos.x - pk.x) < 18 && Math.abs(p.pos.z - pk.z) < 14)) P.world.fx.emit('water', pk.x + (Math.random() - 0.5) * 0.4, 0.1, pk.z + (Math.random() - 0.5) * 0.4, 2);
      } else if (pk.sound) {
        pk.glint = 1.2 + Math.random() * 0.8;
        const d = Math.min(...P.players.filter((p) => p.connected || this.solo).map((p) => Math.hypot(p.pos.x - pk.x, p.pos.z - pk.z)));
        if (d < 12) { P.world.fx.emit('note', pk.x, 0.5, pk.z, 1); audio.sfx(pk.sound, { volume: 0.5 * (1 - d / 12) + 0.08, pitch: -6 + Math.random() * 4 }); }
      } else { pk.glint = 0.4 + Math.random() * 0.5; if (P.players.some((p) => Math.abs(p.pos.x - pk.x) < 18 && Math.abs(p.pos.z - pk.z) < 14)) P.world.fx.emit('sparkle', pk.x + (Math.random() - 0.5) * 0.3, 0.15, pk.z, 2, { color: '#ffe89a' }); }
    }
    // a land whose Great Hearth is out keeps its colours drained
    const L = P.lighting, dr = this.chapter.drain ? this.chapter.drain(this) : 0;
    if (L && !(this.stage && this.stage.active)) L.drain += (dr - L.drain) * Math.min(1, dt * 1.5);
    // (and a town under the Murk stays in its gloom)
    const gl = this.chapter.gloom ? this.chapter.gloom(this) : 0;
    if (L && !(this.stage && this.stage.active) && (gl > 0 || this.gloomOn)) { L.gloom += (gl - L.gloom) * Math.min(1, dt * 1.2); this.gloomOn = gl > 0 || L.gloom > 0.01; if (!this.gloomOn) L.gloom = 0; }
    this.escorts.update(dt);
    this.games.update(dt);
    // (a race’s clock runs every frame; only a dialogue or a scene holds it)
    if (this.race && !P.dialogue.active && !(this.stage && this.stage.active)) this.race.left -= dt;
    if (P.busy > 0 || P.dialogue.active || (this.stage && this.stage.active) || this.busyTalk || this.running) return;
    this.checkT -= dt;
    if (this.checkT > 0) return;
    this.checkT = 0.25;
    for (const qid of this.activeIds()) {
      const st = this.stepDef(qid);
      if (!st) continue;
      if (st.do === 'go') {
        const r = st.r || 3;
        const p = P.players.find((q) => (q.connected || this.solo) && Math.hypot(q.pos.x - st.at[0], q.pos.z - st.at[1]) < r);
        if (p) { this.runStep(qid, p); return; }
      } else if (st.do === 'flag' && this.st.f[st.flag]) { this.runStep(qid); return; }
      else if (st.do === 'check' && st.check(this)) { this.runStep(qid); return; }
      else if (st.do === 'camp' && this.st.f['camp:' + st.camp.id]) { this.runStep(qid); return; }
      else if (st.do === 'dungeon' && this.st.dun[st.id]) { this.runStep(qid); return; }
      else if (st.do === 'scene') { this.runStep(qid); return; }
      else if (st.do === 'race' && this.raceTick(qid, st)) return;
      else if (st.do === 'sneak' && this.sneakTick(qid, st)) return;
    }
    for (const [qid, Q] of Object.entries(QUESTS)) if (Q.auto && !Q.giver && this.available(qid)) this.start(qid);
  }

  // a race against the clock: reach the first flag and the clock starts; the
  // others in order before it runs out — or back to the start (flags checked 4× a
  // second, the clock ticks in update)
  raceTick(qid, st) {
    const P = this.P, r = st.r || 3.2;
    const heroes = P.players.filter((q) => q.connected || this.solo);
    const near = (pt) => heroes.some((q) => Math.hypot(q.pos.x - pt[0], q.pos.z - pt[1]) < r);
    const R = this.race && this.race.qid === qid ? this.race : null;
    if (!R) {
      if (!near(st.points[0])) return false;
      this.race = { qid, i: 1, left: st.time, shown: Math.ceil(st.time) };
      P.showBanner(t(st.go || 'Go!'), t('{n} seconds', { n: st.time }));
      audio.sfx('whistle', { volume: 0.8 });
      this.refreshCard();
      return false;
    }
    if (near(st.points[R.i])) {
      R.i++;
      audio.sfx('chime', { volume: 0.7, pitch: R.i * 2 });
      if (R.i >= st.points.length) { this.race = null; this.runStep(qid); return true; }
      P.toast(t('Flag {n}/{total}', { n: R.i - 1, total: st.points.length - 1 }), '#ffe08a');
    }
    const s = Math.ceil(R.left);
    if (s !== R.shown) { R.shown = s; if (s <= 5 && s > 0) { P.toast(String(s), '#ff9a8a'); audio.sfx('tick', { volume: 0.6 }); } this.refreshCard(); }
    if (R.left <= 0) { this.race = null; P.toast(t(st.fail || 'Too slow! Back to the start to try again.'), '#ff9a8a'); audio.sfx('error', { volume: 0.6 }); this.refreshCard(); }
    return false;
  }

  // creeping up on a sleeper: reach the spot without running (or fighting) near it —
  // a running step wakes it, and everyone is sent back to where they started
  sneakTick(qid, st) {
    const P = this.P, heroes = P.players.filter((q) => (q.connected || this.solo) && !q.away);
    const [wx, wz] = st.watch || st.at;
    const loud = heroes.find((q) => Math.hypot(q.pos.x - wx, q.pos.z - wz) < (st.wake || 9) && q.actor.running);
    if (loud) {
      audio.sfx('growl', { volume: 0.9, pitch: -6 });
      P.toast(t(st.woke || 'Too loud! It wakes with a snort — back to where you started, on tiptoe this time.'), '#ff9a8a');
      if (this.onSneakWoke) this.onSneakWoke(qid, st);
      const [bx, bz] = st.back;
      if (this.solo) P.gatherAt(bx, bz); else heroes.forEach((q, i) => { q.actor.pos = { x: bx + (i % 3) * 0.8 - 0.8, z: bz + Math.floor(i / 3) * 0.8 }; });
      return false;
    }
    if (heroes.some((q) => Math.hypot(q.pos.x - st.at[0], q.pos.z - st.at[1]) < (st.r || 1.6))) { this.runStep(qid); return true; }
    return false;
  }

  // somewhere safe inside the story’s lands: the plaza of the valley
  safeSpot() { return { x: 91.5, z: 76 }; }

  // ------------------------------------------------------------------ what to show
  tracked() {
    const ids = this.activeIds();
    if (!ids.length) return null;
    const main = ids.find((id) => QUESTS[id].kind !== 'side');
    return main || ids[0];
  }

  objLines(qid) {
    const st = this.stepDef(qid), q = this.st.q[qid];
    if (!st) return [];
    const txt = typeof st.text === 'function' ? st.text(this) : st.text;
    let n = st.n ? t(' ({n}/{total})', { n: Math.min(q.n, st.n), total: st.n }) : '';
    if (st.do === 'race' && this.race && this.race.qid === qid) n = t(' — {s} s', { s: Math.max(0, Math.ceil(this.race.left)) });
    if (GAME_STEPS.has(st.do)) n = this.games.objText(qid);
    return [t(txt || '…', st.vars) + n];
  }

  objective(qid = this.tracked()) {
    if (!qid) return null;
    const Q = QUESTS[qid];
    return { id: qid, title: t(Q.title), lines: this.objLines(qid), side: Q.kind === 'side' };
  }

  // the journal’s rows: { id: ’saga:…’, saga, done, def: { title, main }, obj }
  journal() {
    const out = [];
    for (const [id, q] of Object.entries(this.st.q)) {
      const Q = QUESTS[id];
      if (!Q) continue;
      out.push({ id: 'saga:' + id, saga: true, done: q.done, step: q.s, def: { title: Q.title, main: Q.kind !== 'side' }, obj: q.done ? '' : this.objLines(id).join(' ') });
    }
    return out.sort((a, b) => (a.done - b.done) || ((b.def.main ? 1 : 0) - (a.def.main ? 1 : 0)));
  }

  target() {
    const qid = this.tracked();
    if (!qid) return null;
    return this.targetOf(qid);
  }
  targetOf(qid) {
    const st = this.stepDef(qid);
    if (!st) return null;
    if (st.target) { const tg = st.target(this); return tg ? { x: tg[0], z: tg[1] } : null; }
    if (st.do === 'race') { const i = this.race && this.race.qid === qid ? this.race.i : 0, pt = st.points[Math.min(i, st.points.length - 1)]; return { x: pt[0], z: pt[1] }; }
    if (st.do === 'escort') return this.escorts.targetOf(qid);
    if (GAME_STEPS.has(st.do)) { const g = this.games.targetOf(qid); if (g) return g; }
    if (st.at) return { x: st.at[0], z: st.at[1] };
    if (st.camp) return { x: st.camp.at[0], z: st.camp.at[1] };
    if (st.do === 'talk') {
      const n = this.npcFor(st.npc);
      if (n) return { x: n.pos.x, z: n.pos.z };
      if (this.solo && this.P.world.npcTarget) { const tg = this.P.world.npcTarget(st.npc); if (tg && tg.map === 'overworld') return { x: tg.x, z: tg.z }; }
      const N = this.wanted().get(st.npc);
      if (N) return { x: N.at[0], z: N.at[1] };
    }
    if (st.do === 'collect' && st.spots) {
      // (things found by ear: the marker shows where to listen, not where they are)
      if (st.near) return { x: st.near[0], z: st.near[1] };
      const pk = this.pickups.find((q) => q.qid === qid && !q.got); if (pk) return { x: pk.x, z: pk.z };
    }
    return null;
  }

  refreshCard() { if (this.onChange) this.onChange(); }

  // marks on every map: who has a quest (!) or a step (?), and where to go
  mapMarks(out) {
    for (const [id, N] of this.wanted()) {
      const o = this.offerOf(id);
      if (!o) continue;
      out.push({ k: o.kind === 'give' ? 'questGive' : 'questTalk', x: N.at[0], z: N.at[1], on: true, name: t(o.kind === 'give' ? QUESTS[o.qid].title : 'Talk to {npc}', { npc: id }) });
    }
    const tg = this.target();
    if (tg) out.push({ k: 'questGoal', x: tg.x, z: tg.z, on: true, name: (this.objective() || {}).title || '' });
    if (this.post) this.post.mapMarks(out);
    if (this.teacup) this.teacup.mapMarks(out);
  }

  // ! and ? over the heads of those with something for you
  drawLabels(ctx, v) {
    this.games.drawLabels(ctx, v);
    const who = new Map(this.npcs);
    if (this.solo) for (const id of this.offerIds()) if (!who.has(id)) { const n = this.npcFor(id); if (n) who.set(id, n); }
    for (const [id, n] of who) {
      if (n.hidden) continue;
      const o = this.offerOf(id);
      if (!o) continue;
      const u = this.P.toUi(v, n.pos.x, 2.35 + (n.baseY || 0), n.pos.z);
      const bob = Math.round(Math.sin(this.P.t * 4 + n.pos.x) * 1.5);
      const ch = o.kind === 'give' ? '!' : '?';
      drawText(ctx, ch, u.x, u.y - 6 + bob, { color: o.kind === 'give' ? '#ffd23a' : '#ffe99a', align: 'center', scale: 2, outline: '#3b2a2e' });
    }
  }
}

export { CHAPTERS, QUESTS, ZONES };
void measure;
