// Party Mode: up to eight friends on one big screen, each steering their own
// villager from a phone (or the keyboard / a gamepad). The lobby lives in the
// village plaza; the adventure is a shared story with mini-games (story.js).

import { THREE } from '../render/r3d.js';
import { SEE, SEE_MAX } from '../render/seethrough.js';
import { Player, Npc } from '../entities/actors.js';
import { PartyNet } from './net.js';
import { RemoteHost } from './remote-host.js';
import { RemoteInput, KeyInput, PadInput, KEY_LAYOUTS } from './inputs.js';
import { TvMenus, keyOf } from './tvmenu.js';
import { SplitCam, Zoom } from './camera.js';
import { Host, crown, copyText } from './host.js';
import { BigWorld } from '../world/big/bigworld.js';
import { ZONES } from '../world/big/layout.js';
import { ZoneRuntime } from './zones.js';
import { Swim } from './swim.js';
import { Vehicles } from './vehicles.js';
import { qrCanvas } from './qr.js';
import { PartyStory, LANTERN, CHAPTERS } from './story.js';
import { SkyLantern } from './lantern.js';
import { ArenaAct, ArenaSite } from './arena.js';
import { Mounts } from './mounts.js';
import { Encounters } from './encounters.js';
import { Lairs } from './lairs.js';
import { Rares } from './rares.js';
import { Progress } from './progress.js';
import { Travel } from './travel.js';
import { Secrets } from './secrets.js';
import { Races } from './races.js';
import { drawWorldMap, drawWorldPanel, mapImage, mapBase, mapUpdate, MapView, mapRegion } from './worldmap.js';
import { Events } from './events.js';
import { Campfires } from './camp.js';
import { Rooms } from './rooms.js';
import { DinoLife } from './dinos.js';
import { weatherIcon, dayLabel, timeLabel } from '../ui/hud.js';
import { Buddies } from './buddies.js';
import { ExploreAct } from './explore.js';
import { Combat } from '../combat/combat.js';
import { CLASSES, CLASS_ORDER, padIcons } from '../combat/classes.js';
import { ULTS } from '../combat/v4/talents.js';
import { t, tn, onLang, getLang, setAudience } from '../i18n.js';
import { drawClassIcon } from '../combat/icons.js';
import { cleanLook, randomLook } from '../data/looks.js';
import { NPCS } from '../data/npcs.js';
import { newState } from '../state.js';
import { drawText, measure, wrap } from '../engine/font.js';
import { panel, UI, emote as drawEmote, bubble, heart, fitText, ctl, closeButton, button } from '../ui/ui.js';
import { Dialogue } from '../ui/dialogue.js';
import { audio } from '../engine/audio.js';
import { TT } from '../world/tiles.js';
import { POINTS, areaAt } from '../world/overworld.js';
import { clamp } from '../engine/util.js';
import { findUnstuck, stuckAt } from '../world/collision.js';
import { Stage } from '../saga/stage.js';
import { CHAPTERS as SAGA_CHAPTERS } from '../saga/chapters/index.js';
import { ViewCull } from '../render/cull.js';
import { StuckWatch, nearWater } from '../entities/stuck.js';

export const PARTY_COLORS = [
  { name: 'Red', c: '#ef6479' }, { name: 'Blue', c: '#5aa8f2' }, { name: 'Yellow', c: '#f4c542' }, { name: 'Green', c: '#62c46c' },
  { name: 'Purple', c: '#b88cf0' }, { name: 'Orange', c: '#f5954c' }, { name: 'Pink', c: '#f79bcb' }, { name: 'Teal', c: '#3ec8bc' },
];
const VOICES = [70, 58, 76, 64, 72, 60, 80, 66];
export const LOBBY = { x: POINTS.fountain[0], z: POINTS.fountain[1] + 3.6 };
const NO_INPUT = { pressed: () => false, repeat: () => false, down: () => false, consume() {}, mouse: { pressed: false, moved: false }, mouseIn: () => false };

// The shared dialogue box: A shows the whole line at once, A again moves on — as fast as
// you like, with just a blink between the two so a double press can't skip a line unseen.
class PartyDialogue extends Dialogue {
  update(dt, input) {
    const c = this.cur;
    if (c) {
      c.age = (c.age || 0) + dt;
      if (c.shown >= c.total) c.readT = (c.readT || 0) + dt;
      const locked = c.shown < c.total ? c.age < 0.12 : (c.readT || 0) < 0.22;
      if (locked) { super.update(dt, NO_INPUT); return; }
    }
    super.update(dt, input);
  }

  // the host skips the current line (or letter)
  skip() {
    if (this.letter) { const L = this.letter; this.letter = null; L.resolve(); return; }
    const c = this.cur;
    if (!c) return;
    c.shown = c.total;
    if (c.choices) this.pick(c.sel || 0); else this.finish();
  }
}

export class PartyPlayer {
  constructor(party, slot, src) {
    this.party = party;
    this.slot = slot;
    this.color = PARTY_COLORS[slot].c;
    this.colorName = PARTY_COLORS[slot].name;
    this.id = src.id;
    this.kind = src.kind;
    this.input = src.input;
    this.name = String(src.name || '').trim().slice(0, 12) || `Player ${slot + 1}`;
    this.look = cleanLook(src.look || randomLook());
    this.ready = src.kind !== 'phone';
    this.connected = true;
    this.goneAt = 0;
    this.actor = new Player(party.r3d, this.look);
    this.actor.map = 'overworld';
    this.stars = 0;
    this.score = 0;
    this.emote = null; this.emoteT = 0;
    this.speech = null; this.speechT = 0;
    this.frozen = false;
    this.ctxKey = '';
    this.portraitDue = 0.1;
    this.who = 'p' + slot;
    // a ring of the player’s colour on the ground: easy to find yourself
    const ring = new THREE.Mesh(PartyPlayer.ringGeo || (PartyPlayer.ringGeo = new THREE.RingGeometry(0.3, 0.42, 24).rotateX(-Math.PI / 2)),
      new THREE.MeshBasicMaterial({ color: this.color, transparent: true, opacity: 0.8, depthWrite: false }));
    ring.renderOrder = 1;
    this.ring = ring;
  }
  get pos() { return this.actor.pos; }
  get vel() { return this.actor.vel || { x: 0, z: 0 }; }
  get label() { return this.name; }
  setEmote(k, t = 1.6) { this.emote = k; this.emoteT = t; }
  say(text, t = 3) { this.speech = text; this.speechT = t; }
}

export class Party {
  constructor(game, options = {}) {
    this.pendingSaves = new Map();
    this.options = options;
    this.resumePending = !!options.resume;
    this.game = game;
    this.r3d = game.r3d;
    this.display = game.display;
    this.lighting = game.lighting;
    this.settings = game.settings;
    this.net = new PartyNet();
    this.remotePlay = new RemoteHost(this);
    this.net.onJoin = (id) => this.onPadJoin(id);
    this.net.onLeave = (id) => this.onPadLeave(id);
    this.net.onRoom = () => { this.refreshQr(); this.remotePlay.dispose(); this.sendInvite(); };
    this.net.onMsg = (id, d) => this.onPadMsg(id, d);
    this.players = [];
    this.byId = new Map();
    this.seats = new Map();       // pad id -> slot, so a phone that drops out gets its seat back
    this.cam = new SplitCam(this.r3d);
    this.cam.bossNear = (x, z) => {
      let best = null, bd = 22;
      if (this.combat) for (const e of this.combat.enemies) if (e.alive && e.def.boss) { const d = Math.hypot(e.x - x, e.z - z); if (d < bd) { bd = d; best = e; } }
      return best;
    };
    this.zoom = new Zoom(this);
    this.mapView = new MapView();          // the big screen’s world map: zoomed in, or the whole world
    this.host = new Host(this);
    this.tvmenus = new TvMenus(this);      // their own menu on the big screen, for players without a phone
    this.paused = null;           // { by } while the host has paused the game
    this.dialogue = new PartyDialogue(this);
    this.t = 0;
    this.toasts = [];
    this.npcs = [];
    this.fade = 1; this.fadeTarget = 0; this.fadeRes = null;
    this.busy = 0;
    this.waits = [];
    this.prevKeys = new Set();
    this.padsDown = new Set();
    this.banner = null;
    this.npcWorld = { collisionFor: () => this.world.overCol, fx: this.world.fx, mapId: 'overworld', transferNpc() {} };
    this.groupInput = {
      pressed: (a) => this.anyPressed(a),
      repeat: () => false,
      down: () => false,
      consume: (...a) => this.consume(...a),
      mouse: game.input.mouse,
      mouseIn: (...r) => game.input.mouseIn(...r),
    };
  }

  get world() { return this.game.world; }
  get state() { return this.game.state; }
  get portraits() { return this.game.portraits; }
  get mapId() { return 'overworld'; }

  // out exploring the world? (the wild lands’ systems only run then; the solo
  // game’s Wild answers the same question for its hero)
  exploring() { return this.actKind === 'explore' && !!this.act && !this.act.suspended && this.act instanceof ExploreAct; }

  // the name of a button in texts ("{a} to ride it"): what the players press — a phone’s letter,
  // the keyboard’s key, a gamepad’s button — both when their hands differ (« A/E »)
  keyName(k) {
    const names = [...new Set(this.players.filter((p) => p.connected).map((p) => keyOf(p, k)))];
    return names.length ? names.join('/') : k.toUpperCase();
  }

  // the world’s saved progress (waystones, camps, lairs, secrets, races, zones,
  // the map’s fog): Party Mode keeps it in this browser, the solo game in its save
  loadSave(name, def) {
    let v = null;
    try { v = localStorage.getItem('hearthlight.party.' + name + '.v1'); } catch (e) { /* private mode */ }
    if (v === null) return def;
    try { return JSON.parse(v); } catch (e) { return v; }
  }
  writeSave(name, v) {
    const raw = typeof v === 'string' ? v : JSON.stringify(v), key = 'hearthlight.party.' + name + '.v1';
    this.pendingSaves.set(key, raw);
    try { localStorage.setItem(key, raw); return true; } catch (e) { this.saveFailed(); return false; }
  }
  get active() { return this.players.filter((p) => p.connected || this.t - p.goneAt < 1); }

  // ------------------------------------------------------------------ enter / exit
  enter() {
    setAudience('group');            // (French speaks to the whole party: « vous »)
    const g = this.game, w = this.world;
    g.mode = 'party';
    this.display.setWorldTarget(900, 506);
    g.state = newState({ name: 'Friends', look: {} });
    const s = g.state;
    Object.assign(s.flags, { bridgeFixed: true, millFixed: true, homeOpen: true, partyMode: true });
    s.hour = 9.4; s.weather = 'sun'; s.day = 3;
    w.clearProjects();
    w.over.setBridge(true);
    w.over.millSpeed = 0.55;
    w.beam.visible = false;
    w.festival.visible = false;
    w.over.lighthouseLamp.lamp.emissiveIntensity = 0;
    for (const m of Object.values(w.maps)) m.root.visible = false;
    w.maps.overworld.root.visible = true;
    w.forage.spawnDay(3, w.trees);
    w.farm.refreshAll();
    w.fx.clear();
    // the big world around the valley (streams its ground in, owns collision)
    this.big = new BigWorld(this);
    this.big.attach();
    this.zones = new ZoneRuntime(this);
    this.swim = new Swim(this);
    this.swim.spots = this.big.map.dives.map((d) => ({ ...d }));
    this.swim.onFind = (p, spot) => (spot.pick ? spot.pick(p) : this.onDiveFind(p, spot));     // (a saga’s spot picks itself)
    this.vehicles = new Vehicles(this);
    this.mounts = new Mounts(this);
    this.dinos = new DinoLife(this);
    this.encounters = new Encounters(this);
    this.lairs = new Lairs(this);
    this.rares = new Rares(this);
    this.progress = new Progress(this);
    this.travel = new Travel(this);
    this.secrets = new Secrets(this);
    this.races = new Races(this);
    this.events = new Events(this);
    this.camp = new Campfires(this);
    this.rooms = new Rooms(this);
    this.arena = new ArenaSite(this);
    this.setupLighting();
    this.buddies = new Buddies(this);
    if (!this.langHooked) {
      this.langHooked = true;
      onLang((l) => { if (this.arena) this.arena.relabel(); if (this.game.party === this) { this.net.broadcast({ t: 'lang', v: l }); for (const p of this.players) p.ctxKey = ''; } });
    }
    this.cam.bounds = this.big.bounds();
    this.zoom.reset();
    this.zoom.set(this.host.opts.zoom || 'auto');
    this.phase = 'lobby';
    this.countdown = 0;
    this.lantern = new SkyLantern(this, LANTERN, CHAPTERS);
    this.stage = new Stage(this);
    this.sceneMusic = null;
    this.act = null;
    this.loadProfiles();
    for (const local of this.options.reload?.locals || []) {
      if (local.kind === 'keys') local.layout = 'wasd';      // (one keyboard player now)
      const id = local.kind === 'keys' ? 'keys-' + local.layout : 'pad-' + local.index;
      if (this.byId.has(id)) continue;
      const profile = this.profiles[id] || {};
      const input = local.kind === 'keys' ? new KeyInput(this.game.input.keys, local.layout) : new PadInput(local.index);
      const name = (profile.named && profile.name) || (local.kind === 'keys' ? t('Keys') : t('Pad {n}', { n: local.index + 1 }));
      const p = this.addPlayer({ id, kind: local.kind, input, name, look: profile.look || randomLook() });
      if (p) p.ready = true;
    }
    this.net.start(this.options);
    audio.playMusic('day', { fade: 1.5 });
    audio.setAmbient({ birds: 0.7, crickets: 0, waves: 0.35, rain: 0, wind: 0.15, fire: 0, night: 0 });
    this.fade = 1; this.fadeTarget = 0;
  }

  exit() {
    this.saveNow();
    this.remotePlay?.dispose();
    setAudience('one');
    this.net.broadcast({ t: 'screen', s: 'message', title: t('Party over'), text: t('The big screen closed the party. Thanks for playing!') });
    this.net.broadcast({ t: 'phase', p: 'adventure' });
    this.net.stop();
    for (const p of this.players) { this.r3d.scene.remove(p.actor.model.root); this.world.over.root.remove(p.ring); }
    for (const n of this.npcs) this.r3d.scene.remove(n.model.root);
    if (this.act) this.act.dispose();
    this.stopCombat();
    this.lantern.dispose();
    this.buddies.clear();
    this.arena.dispose();
    this.arena = null;
    this.mounts.dispose(); this.mounts = null;
    this.dinos.dispose(); this.dinos = null;
    this.encounters.dispose(); this.encounters = null;
    this.lairs.dispose(); this.lairs = null;
    if (this.rares) { this.rares.dispose(); this.rares = null; }
    this.travel.dispose(); this.travel = null;
    this.secrets.dispose(); this.secrets = null;
    this.races.dispose(); this.races = null;
    this.events.dispose(); this.events = null;
    this.camp.dispose(); this.camp = null;
    this.rooms.dispose(); this.rooms = null;
    this.vehicles.dispose(); this.swim.dispose();
    this.big.detach();
    this.big = null;
    this.players = []; this.npcs = [];
    this.paused = null;
    audio.muffle(false);
    this.zoom.reset();
    this.display.setWorldTarget(null);
    this.game.party = null;
    this.game.toTitle();
  }

  setupLighting() {
    const w = this.world, L = this.lighting;
    L.clear();
    for (const b of Object.values(w.over.buildings)) {
      for (const m of b.glowMats) L.glowMats.push(m);
      for (const l of b.lights) L.addSource(l);
    }
    for (const p of w.over.props) { if (p.obj && p.obj.visible === false) continue; for (const l of p.lights) L.addSource(l); }
    if (this.arena) for (const l of this.arena.lights) L.addSource(l);
    L.lampMats = w.overLampMats || [];
    L.indoor = null;
  }

  async refreshQr() {
    if (!this.net.code || this.game.party !== this) return;
    const url = this.net.inviteUrl;
    if (this.qr && this.qr.text === url) return;
    try { const qr = await qrCanvas(url); if (this.net.inviteUrl === url && this.game.party === this) { this.qr = qr; this.qrError = false; } } catch (e) { this.qr = null; this.qrError = true; }
  }

  // the invitation for a phone's Invite page (one phone, or all of them)
  sendInvite(p = null) {
    const n = this.net;
    if (n.status !== 'open') return;
    const m = { t: 'invite', link: n.inviteUrl, room: n.joinUrl, code: n.code, lan: !n.remote, home: !!n.playUrl };
    if (p) { if (p.kind === 'phone') n.send(p.id, m); } else n.broadcast(m);
  }

  // the invitation (the host menu's Invite tab): one link for everyone — whoever opens it picks
  // the big screen (their phone as a controller) or their own screen (the game streamed, their
  // own camera). A relay on this Wi-Fi only (the desktop app, the dev server) reaches the house.
  inviteItems() {
    const n = this.net, open = n.status === 'open', url = open ? n.inviteUrl : '';
    const sub = !url ? 'Opening the room…' : !n.playUrl ? 'Scan the code with a phone: it becomes a controller. No phone? E or Enter, or A on a gamepad, plays on this screen.'
      : n.remote ? 'Scan it here or send the link: each friend picks — in front of the big screen (their phone as a controller) or at home (the game on their own screen).'
        : 'Scan it here or open it on another screen of the house: each friend picks — the big screen (their phone as a controller) or their own screen.';
    return [{ id: 'inv:link', kind: 'invite', label: 'One link for everyone', url, code: n.code, sub, action: url ? 'Copy the link' : null }];
  }

  // ------------------------------------------------------------------ players
  onPadJoin(id) {
    const p = this.byId.get(id);
    if (p) { p.connected = true; p.goneAt = 0; this.syncPad(p); }
    else this.net.send(id, { t: 'who' }); // a phone we don’t know yet (e.g. after this page reloaded)
  }

  onPadLeave(id) {
    this.remotePlay.stop(id);
    if (this.waiting) this.waiting.delete(id);
    const p = this.byId.get(id);
    if (!p) return;
    p.connected = false;
    p.goneAt = this.t;
    p.input.release();
  }

  onPadMsg(id, d) {
    if (!d || typeof d !== 'object') return;
    let p = this.byId.get(id);
    if (d.t === 'rtc') { this.remotePlay.signal(id, d); return; }
    if (d.t === 'hi') {
      const remote = d.remote === true;
      if (remote && (!this.net.remoteKey || d.key !== this.net.remoteKey)) { this.net.send(id, { t: 'remoteError', message: 'Ask the host for a new remote invitation.' }); return; }
      if (!p) {
        p = this.addPlayer({ id, kind: 'phone', input: new RemoteInput(), name: d.name, look: d.look, cls: d.cls });
        if (!p) {
          this.net.send(id, { t: 'screen', s: 'message', title: t('Party full'), text: t('Eight friends are already playing. Cheer them on!') });
          (this.waiting = this.waiting || new Set()).add(id);     // (asked again when a seat frees up)
          return;
        }
        if (this.waiting) this.waiting.delete(id);
      } else {
        p.connected = true; p.goneAt = 0; // a phone coming back keeps its seat (and its name)
      }
      // (a friend at home — play.html — watches their own camera, streamed to them: drawRemote)
      p.remote = remote;
      this.host.onJoin(p);
      this.syncPad(p);
      if (remote) this.remotePlay.start(id);
      return;
    }
    if (!p) return;
    p.connected = true;
    p.goneAt = 0;
    switch (d.t) {
      case 'in': case 'b': if (!this.paused) p.input.onMsg(d); break;
      case 'hact': this.host.onMsg(p, d); break;
      case 'look': this.setLook(p, d.look); break;
      case 'ready':
        if (this.phase !== 'lobby') break;
        p.ready = !!d.v;
        if (p.ready) { audio.sfx('confirm', { volume: 0.6 }); p.setEmote('heart', 1.4); this.world.fx.emit('sparkle', p.pos.x, 1.6, p.pos.z, 8, { color: p.color }); }
        break;
      case 'pick':
        if (this.vote && d.id === this.vote.id) this.onVotePick(p, d);
        else if (this.act && this.act.onPick) this.act.onPick(p, d);
        break;
      case 'tame': if (this.mounts) this.mounts.onTameMsg(p, d); break;
      case 'talent': case 'talentReset': case 'gear': if (this.progress) this.progress.onMsg(p, d); break;
      case 'mount': if (this.mounts && typeof d.v === 'string') this.mounts.choose(p, d.v); break;
      case 'pet': this.buddies.choose(p, typeof d.v === 'string' ? d.v : null); break;
      case 'cls': if (CLASSES[d.v]) { p.cls = d.v; this.saveProfile(p); if (this.combat) this.combat.setClass(p, d.v); this.world.fx.emit('sparkle', p.pos.x, 1.2, p.pos.z, 8, { color: CLASSES[d.v].color }); } break;
      case 'bye': this.removePlayer(p); break;
      // the host starts the party from the lobby (nobody else does — not even "everyone’s ready")
      case 'start': if (this.phase === 'lobby' && this.host.isHost(p) && !this.vote && !this.choosing) this.chooseActivity(); break;
      case 'unstuck': this.unstick(p); break;
      case 'camp': if (this.camp && this.phase !== 'lobby') this.camp.build(p); break;
      // the world map on the phone (its own screen: nobody else’s view changes)
      case 'mapReq': {
        // (the phone draws the map itself: the world once, then what’s changed)
        if (d.v === 2) { const b = mapBase(this); if (b && d.base !== b.v) this.net.send(p.id, b); const u = mapUpdate(this, p); if (u) this.net.send(p.id, u); break; }
        const src = mapImage(this, d.w, d.h, d.near ? (this.rooms ? this.rooms.mapPos(p) : p.pos) : null);
        if (src) this.net.send(p.id, { t: 'map', src, near: !!d.near });
        break;
      }
      default: break;
    }
  }

  // "Get unstuck" (the phone’s menu, or the host’s for everyone): stuck inside
  // something or in a little pocket → the nearest open ground; seemingly free
  // but still asking (a ledge, an island…) → the nearest waystone. `all`: only
  // the ones really stuck move.
  unstick(p, all = false) {
    if (!p || !p.actor || this.busy || (p.fighter && p.fighter.down)) return;
    if (this.rooms && this.rooms.inside(p)) { if (!all) this.rooms.leave(p); return; }
    const a = p.actor, col = this.world.overCol, B = this.combat && this.combat.bounds;
    const inRing = B ? (x, z) => ((x - B.x) / B.rx) ** 2 + ((z - B.z) / B.rz) ** 2 < 0.9 : null;
    const stuck = !p.swimming && !p.vehicle && stuckAt(col, a.pos.x, a.pos.z, { ok: inRing });
    if (!stuck && all) return;
    if (p.vehicle && this.vehicles) this.vehicles.leave(p, true);
    if (p.mount && this.mounts) this.mounts.dismount(p, true);
    let s = stuck || B ? findUnstuck(col, a.pos.x, a.pos.z, { ok: inRing }) : null;
    if (!s) {
      const T = this.travel, stones = T ? T.attuned() : [];
      let best = null, bd = 1e9;
      for (const st of stones) { const d = Math.hypot(st.x - a.pos.x, st.z - a.pos.z); if (d < bd) { bd = d; best = st; } }
      s = best ? best.land || (best.land = T.openNear(best.x, best.z, 2.2, 9)) : this.spawnPoint(p.slot);
    }
    this.world.fx.emit('smoke', a.pos.x, 0.6, a.pos.z, 8);
    a.pos = { x: s.x, z: s.z };
    a.jumpY = 0; a.jumpV = 0;
    this.world.fx.emit('sparkle', s.x, 1.2, s.z, 14, { color: p.color });
    audio.sfx('poof', { volume: 0.6 });
    if (p.stuckWatch) p.stuckWatch.reset();
    p.stuckOffer = false;
    this.toast(t('{name} got unstuck!', { name: p.name }), p.color);
  }

  addPlayer(src) {
    let slot = src.id && this.seats.has(src.id) ? this.seats.get(src.id) : -1;
    if (slot >= 0 && this.players.some((q) => q.slot === slot)) slot = -1;
    if (slot < 0) for (let i = 0; i < 8; i++) if (!this.players.some((q) => q.slot === i)) { slot = i; break; }
    if (slot < 0) return null;
    const p = new PartyPlayer(this, slot, src);
    p.cls = this.profileOf(p).cls || (CLASSES[src.cls] ? src.cls : CLASS_ORDER[slot % CLASS_ORDER.length]);
    // two Alexes? call the newcomer "Alex 2"
    const base = p.name;
    for (let n = 2; this.players.some((q) => q.name === p.name); n++) p.name = `${base.slice(0, 10)} ${n}`;
    this.seats.set(src.id, slot);
    this.players.push(p);
    this.players.sort((a, b) => a.slot - b.slot);
    this.byId.set(src.id, p);
    this.r3d.scene.add(p.actor.model.root);
    this.world.over.root.add(p.ring);
    const w = this.world;
    p.actor.onJump = () => {
      if (this.zones && this.zones.onJump(p)) return;
      audio.sfx('jump', { volume: 0.45 });
      w.fx.emit('dust', p.pos.x, 0.05, p.pos.z + 0.1, 3);
    };
    p.actor.onLand = () => {
      const pp = p.pos;
      audio.sfx('land', { volume: 0.35 });
      w.fx.emit('dust', pp.x, 0.05, pp.z + 0.1, 3, { color: w.tileAt(pp.x, pp.z) === TT.SNOW ? '#ffffff' : undefined });
      for (const lp of w.over.leafpiles || []) {
        if (Math.hypot(lp.x - pp.x, lp.z - pp.z) < 0.85) { w.fx.emit('burst', lp.x, 0.3, lp.z, 18); audio.sfx('whoosh', { volume: 0.4 }); lp.squash = 1; }
      }
      if (this.combat) this.combat.onLand(p);
      if (this.act) this.act.onLand(p);
    };
    // arrive with a pop
    const sp = this.spawnPoint(slot);
    p.actor.pos = { x: sp.x, z: sp.z };
    p.actor.dir = { x: 0, z: 1 };
    p.actor.jumpV = 4;
    w.fx.emit('sparkle', sp.x, 1.2, sp.z, 14, { color: p.color });
    audio.sfx('sparkle', { volume: 0.6 });
    this.toast(t('{name} joined!', { name: p.name }), p.color);
    p.tagT = 6;
    // (keyboard & gamepad players: where their own menu is — talents, gear, their look…)
    if (p.kind !== 'phone') p.say(t('My menu: {key}', { key: keyOf(p, 'm') }), 7);
    if (this.phase !== 'lobby') p.ready = true;
    if (this.combat) this.combat.equip(p);
    if (this.act) this.act.onJoin(p);
    if (this.vote) this.sendVote(p);
    return p;
  }

  removePlayer(p) {
    this.saveProfile(p); this.flushProfiles();
    this.remotePlay.stop(p.id);
    // a seat is free: phones that found the party full get asked again
    if (this.waiting) { for (const id of this.waiting) this.net.send(id, { t: 'who' }); this.waiting.clear(); }
    this.r3d.scene.remove(p.actor.model.root);
    this.world.over.root.remove(p.ring);
    this.tvmenus.close(p, true); this.tvmenus.tabs.delete(p);
    this.players = this.players.filter((q) => q !== p);
    this.byId.delete(p.id);
    this.host.onLeave(p);
    if (this.mounts) this.mounts.onLeave(p);
    if (this.combat) this.combat.unequip(p);
    this.portraits.invalidate('party' + p.slot);
    this.toast(t('{name} left the party', { name: p.name }), '#b9a2e3');
    if (this.act) this.act.onLeave(p);
  }

  spawnPoint(slot) {
    if (this.phase === 'lobby' || !this.players.some((q) => q.slot !== slot)) {
      const a = (slot / 8) * Math.PI * 2 + 0.4;
      return { x: LOBBY.x + Math.cos(a) * 2.4, z: LOBBY.z + 1.2 + Math.sin(a) * 1.3 };
    }
    // mid-adventure: pop in next to a friend
    const q = this.players.find((o) => o.slot !== slot && o.connected) || this.players[0];
    return { x: q.pos.x + 0.8, z: q.pos.z + 0.5 };
  }

  setLook(p, look) {
    p.look = cleanLook(look);
    p.actor.setLook(p.look);
    p.portraitDue = 0.3;
    if (this.phase === 'lobby') { this.world.fx.emit('sparkle', p.pos.x, 1.2, p.pos.z, 4, { color: '#fff3c4' }); this.flashTag(p, 2.5); }
  }

  sendPortrait(p) {
    if (p.kind !== 'phone') return;
    this.portraits.invalidate('party' + p.slot);
    const c = this.portraits.get('party' + p.slot, p.look, 'happy');
    this.net.send(p.id, { t: 'portrait', src: c.toDataURL() });
  }

  // tell a phone everything it needs to redraw from scratch
  syncPad(p) {
    if (p.kind !== 'phone') return;
    this.net.send(p.id, { t: 'lang', v: getLang() });
    this.net.send(p.id, { t: 'you', slot: p.slot, color: p.color, name: p.name });
    this.net.send(p.id, { t: 'phase', p: this.phase === 'lobby' ? 'lobby' : 'adventure', ready: p.ready });
    // (clears whatever the phone showed before — e.g. "party full" from an earlier try)
    this.net.send(p.id, { t: 'screen', s: 'play' });
    this.net.send(p.id, { t: 'cls', v: p.cls, list: CLASS_ORDER });
    this.sendHats(p);
    if (this.mounts) this.mounts.sendList(p);
    this.buddies.sendList(p);
    if (this.progress) { p.progKey = ''; this.progress.sync(p); }
    this.host.tell(p);
    this.sendInvite(p);
    if (this.host.isHost(p)) this.host.sentKey = '';
    this.net.send(p.id, { t: 'pause', v: !!this.paused, by: this.paused ? this.paused.by : '' });
    p.ctxKey = '';
    p.portraitDue = 0.05;
    if (this.act) this.act.syncPad(p);
    if (this.vote) this.sendVote(p);
  }

  sendCtx(p, ctx) {
    if (p.kind !== 'phone') return;
    const key = JSON.stringify(ctx);
    if (key === p.ctxKey) return;
    p.ctxKey = key;
    this.net.send(p.id, { t: 'ctx', ...ctx });
  }

  // treasure hats this phone has dug up (the look editor shows them)
  sendHats(p) { if (p.kind === 'phone') this.net.send(p.id, { t: 'hats', list: (this.profileOf(p).hats || []).map((h) => (h === 'furhat' ? 'chapka' : h)) }); }

  // what a player presses for A / B / X / Y / U / their menu (M), on their own device
  keyOf(p, k) { return keyOf(p, k); }

  buzz(p, pattern = 40) {
    if (p.kind === 'phone') this.net.send(p.id, { t: 'buzz', p: pattern });
    else if (p.kind === 'gamepad') this.game.input.buzz(pattern, p.input.index);
  }

  // keyboard & gamepad friends on the big screen itself
  pollLocalJoins() {
    const keys = this.game.input.keys;
    const edge = (codes) => codes.some((c) => keys.has(c) && !this.prevKeys.has(c));
    for (const [lay, L] of Object.entries(KEY_LAYOUTS)) {
      if (!edge(L.join)) continue;
      if (this.players.some((p) => p.kind === 'keys' && p.input.layoutId === lay)) continue;
      const pr = this.profiles['keys-' + lay] || {};
      const p = this.addPlayer({ id: 'keys-' + lay, kind: 'keys', input: new KeyInput(keys, lay), name: (pr.named && pr.name) || t('Keys'), look: pr.look || randomLook() });
      if (p) p.input.update();
    }
    this.prevKeys = new Set(keys);
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of pads) {
      if (!gp) continue;
      const on = gp.buttons[0] && gp.buttons[0].pressed;
      const was = this.padsDown.has(gp.index);
      if (on && !was && !this.players.some((p) => p.kind === 'gamepad' && p.input.index === gp.index)) {
        const pr = this.profiles['pad-' + gp.index] || {};
        // (a name they chose comes back; "Pad 2" is said in today's language)
        const p = this.addPlayer({ id: 'pad-' + gp.index, kind: 'gamepad', input: new PadInput(gp.index), name: (pr.named && pr.name) || t('Pad {n}', { n: gp.index + 1 }), look: pr.look || randomLook() });
        if (p) p.input.update();
      }
      if (on) this.padsDown.add(gp.index); else this.padsDown.delete(gp.index);
    }
  }

  anyPressed(a) {
    if (this.game.input.pressed(a)) return true;
    return this.players.some((p) => p.connected && p.input.pressed(a === 'interact' ? 'a' : a));
  }

  consume(...a) {
    this.game.input.consume(...a);
    for (const p of this.players) p.input.edges.clear();
  }

  // ------------------------------------------------------------------ Dialogue hooks
  npcDef(who) {
    const p = this.playerOf(who);
    if (p) return { name: p.name, short: p.name, voice: { pitch: VOICES[p.slot], wave: 'triangle' } };
    return NPCS[who];
  }
  playerOf(who) { return typeof who === 'string' && /^p\d$/.test(who) ? this.players.find((p) => p.slot === +who[1]) : null; }
  portraitOf(who, expr) {
    const p = this.playerOf(who);
    if (p) return this.portraits.get('party' + p.slot, p.look, expr);
    const d = NPCS[who];
    return d ? this.portraits.get(who, d.look, expr, d.scale || (d.kid ? 0.86 : 1)) : null;
  }
  onSpeak(who, talking) {
    const n = this.npcs.find((x) => x.id === who);
    if (n) { n.talking = talking || n.talking; n.speaking = talking; }
    const p = this.playerOf(who);
    if (p) p.actor.expr = talking ? 'talk' : null;
  }
  say(who, text, opts = {}) { return this.dialogue.say(who, text, opts); }

  // ------------------------------------------------------------------ helpers for scripts
  wait(sec) { return new Promise((res) => this.waits.push({ t: sec, res })); }
  fadeTo(to, dur = 0.4) {
    // (a new fade lets the one before it go: two scripts fading at once never wait forever)
    if (this.fadeRes) { const r = this.fadeRes; this.fadeRes = null; r(); }
    this.fadeTarget = to; this.fadeSpeed = 1 / Math.max(0.05, dur);
    return new Promise((res) => { this.fadeRes = res; if (this.fade === to) { this.fadeRes = null; res(); } });
  }
  // show a player’s name over their head for a moment
  flashTag(p, sec = 3) { p.tagT = Math.max(p.tagT || 0, sec); }

  // The objective card (top left) slides in when the goal changes, stays a
  // few seconds, then tucks itself away: phones always show it anyway.
  showObjective(text, sub = '', secs = 7, extra = '') {
    const o = this.obj;
    if (!text) { this.obj = null; return; }
    if (o && o.text === text && o.sub === sub && o.extra === extra && o.t < o.secs - 0.5) { o.secs = Math.max(o.secs, o.t + secs); return; }
    this.obj = { text, sub, extra, t: o && o.text === text && o.t < o.secs ? Math.min(o.t, 0.3) : 0, secs };
  }

  toast(text, color = '#fff3c4') { this.toasts.push({ text, color, t: 0, life: Math.max(3.2, 1.2 + String(text).length / 16) }); if (this.toasts.length > 4) this.toasts.shift(); }
  showBanner(title, sub = '') { this.banner = { title, sub, t: 0 }; }

  spawnNpc(id, x, z, face = { x: 0, z: 1 }) {
    let n = this.npcs.find((q) => q.id === id);
    if (!n) {
      n = new Npc(this.r3d, id);
      this.npcs.push(n);
      this.r3d.scene.add(n.model.root);
    }
    n.map = 'overworld';
    n.pos = { x, z };
    n.path = null;
    n.restDir = face;
    n.dir = face;
    n.hidden = false;
    n.activity = null;
    return n;
  }

  removeNpc(id) {
    const n = this.npcs.find((q) => q.id === id);
    if (!n) return;
    this.r3d.scene.remove(n.model.root);
    this.npcs = this.npcs.filter((q) => q !== n);
  }

  // place everyone around a point (after cutscenes & between games)
  gatherAt(x, z, spread = 1.1) {
    const ps = this.players;
    ps.forEach((p, i) => {
      const a = (i / Math.max(1, ps.length)) * Math.PI * 2 + 0.3;
      let px = x + Math.cos(a) * spread * (ps.length > 1 ? 1 : 0), pz = z + Math.sin(a) * spread * 0.7 * (ps.length > 1 ? 1 : 0);
      const col = this.world.overCol;
      if (col.blocked(px, pz, 0.26)) { px = x; pz = z; }
      p.actor.pos = { x: px, z: pz };
      p.actor.vel = { x: 0, z: 0 };
      this.flashTag(p, 4);
    });
    this.cam.snap(this.camPlayers());
  }

  // who the big screen frames: friends at home have their own camera (unless everyone does)
  camPlayers() {
    const a = this.players.filter((p) => p.connected || this.t - p.goneAt < 8), here = a.filter((p) => !p.remote);
    return here.length ? here : a.length ? a : this.players;
  }
  // everyone in the world, wherever they watch from (the scenery wakes up around each of them)
  allPlayers() { const a = this.players.filter((p) => p.connected || this.t - p.goneAt < 8); return a.length ? a : this.players; }

  centroid() {
    const ps = this.camPlayers();
    if (!ps.length) return { x: LOBBY.x, z: LOBBY.z };
    let x = 0, z = 0;
    for (const p of ps) { x += p.pos.x; z += p.pos.z; }
    return { x: x / ps.length, z: z / ps.length };
  }

  // ------------------------------------------------------------------ update
  update(dt) {
    const g = this.game, w = this.world, s = this.state;
    this.t += dt;
    // (a player in their big-screen menu: the menu reads their buttons, their hero feels none)
    for (const p of this.players) (this.tvmenus.realOf(p) || p.input).update(dt);
    this.host.update(dt);
    if (g.party !== this) return;          // the host ended the party
    this.tvmenus.update(dt);
    // (French says « vous » to a party, « tu » to a lone player)
    let n = 0;
    for (const p of this.players) if (p.connected) n++;
    setAudience(n > 1 ? 'group' : 'one');
    // M on the big screen’s keyboard shows the world map
    const mKey = g.input.keys.has('KeyM');
    if (mKey && !this.prevM && !this.host.menu) this.bigMapOpen = !this.bigMapOpen;
    // (the map open: its Close button, Esc / Start / B on the big screen, or a local player's B, closes it)
    if (this.bigMapOpen && !this.host.menu) {
      const C = this.mapCloseR, gi = g.input, byB = this.players.find((p) => p.kind !== 'phone' && p.connected && p.input.pressed('b'));
      if (gi.pressed('cancel') || gi.pressed('pause') || byB || (gi.mouse.pressed && C && gi.mouseIn(C.x, C.y, C.w, C.h))) {
        this.bigMapOpen = false; gi.mouse.pressed = false; gi.consume();
        if (byB) byB.input.edges.delete('b');
      }
    }
    this.prevM = mKey;
    // (the lobby's join card: its link copied in one click)
    const CR = this.copyR;
    if (CR && this.phase === 'lobby' && !this.host.menu && g.input.mouse.pressed && g.input.mouseIn(CR.x, CR.y, CR.w, CR.h)) {
      g.input.mouse.pressed = false;
      const url = this.net.inviteUrl;
      copyText(url).then((ok) => { this.copiedT = ok ? 2.5 : 0; this.toast(t(ok ? 'Link copied — send it to your friends!' : 'Couldn’t copy: the link is on the screen'), '#8fd67a'); });
      audio.sfx('select', { volume: 0.6 });
    }
    if (this.copiedT > 0) this.copiedT -= dt;
    // (the map open: the mouse zooms & moves it; ± zoom it rather than the camera)
    if (this.bigMapOpen && !this.host.menu) this.mapView.mouse(g.input, this.centroid()); else if (!this.bigMapOpen) this.mapView.reset();
    // + / − / 0 on the big screen’s keyboard: zoom in, out, back to auto
    const zk = ['Equal', 'NumpadAdd', 'Minus', 'NumpadSubtract', 'Digit0', 'Numpad0'].find((c) => g.input.keys.has(c)) || null;
    if (zk && zk !== this.prevZoomKey && !this.host.menu) this.host.act(zk.startsWith('Digit0') || zk === 'Numpad0' ? 'zauto' : 'zoom', zk === 'Equal' || zk === 'NumpadAdd' ? 1 : -1);
    this.prevZoomKey = zk;
    // the wheel too (not over someone’s own menu, the map or the host’s menu: they scroll or zoom those)
    this.wheelCd = Math.max(0, (this.wheelCd || 0) - dt);
    if (g.input.mouse.wheel && !this.wheelCd && !this.bigMapOpen && !this.host.menu && !this.tvmenus.pointing()) { this.host.act('zoom', g.input.mouse.wheel < 0 ? 1 : -1); g.input.mouse.wheel = 0; this.wheelCd = 0.25; }
    this.saveT = (this.saveT || 0) + dt;
    if (this.saveT >= 30) { this.saveT = 0; this.saveNow(); }
    if (this.paused) { this.updatePaused(dt); return; }
    w.t += dt;
    if (this.waits.length) {
      for (const q of this.waits) q.t -= dt;
      const done = this.waits.filter((q) => q.t <= 0);
      this.waits = this.waits.filter((q) => q.t > 0);
      for (const q of done) q.res();
    }
    if (this.fade !== this.fadeTarget) {
      const d = this.fadeTarget - this.fade, step = dt * (this.fadeSpeed || 2);
      this.fade = Math.abs(d) <= step ? this.fadeTarget : this.fade + Math.sign(d) * step;
      if (this.fade === this.fadeTarget && this.fadeRes) { const r = this.fadeRes; this.fadeRes = null; r(); }
    }
    if (this.vote) this.updateVote(dt);
    this.lantern.update(dt);
    this.profileT = (this.profileT || 0) - dt;
    if (this.profileDirty && this.profileT <= 0) this.flushProfiles();

    // free roam after the finale: L takes everyone back to the lobby
    const L = g.input.keys.has('KeyL');
    if (L && !this.prevL && this.act && this.act.freeRoam && !this.busy) this.backToLobby();
    this.prevL = L;

    if (this.phase === 'lobby') this.updateLobby(dt);
    // (a gamepad picked up mid-adventure joins with A, like a phone that turns up late)
    else if (!this.busy && !this.cinematic && !this.vote) this.pollLocalJoins();
    if (this.dialogue.active) this.dialogue.update(dt, this.groupInput);
    if (this.stage) this.stage.update(dt);
    if (this.vehicles && this.phase !== 'lobby' && !this.cinematic) this.vehicles.handleInput();
    if (this.mounts && !this.cinematic) this.mounts.handleInput();
    if (this.camp && this.phase !== 'lobby' && !this.cinematic) this.camp.handleInput();
    if (this.act) this.act.update(dt);
    this.arena.update(dt);

    // time drifts gently (the story moves it on between chapters)
    if (this.phase !== 'lobby' && !this.busy && !this.dialogue.active && !(this.act && this.act.holdClock)) s.hour = Math.min(23.5, s.hour + dt / 90);

    // players (a big hit freezes the action for a heartbeat)
    const col = w.overCol;
    const frozenAll = this.busy > 0 || this.dialogue.active || this.cinematic || !!this.vote;
    const sdt = this.combat && this.combat.hitstop > 0 ? 0 : dt;
    if (this.combat) this.combat.preActors(sdt);
    if (this.vehicles && !frozenAll) this.vehicles.update(sdt);
    for (const p of this.players) {
      const a = p.actor;
      // (the act can hold one still: a blessing picked on the big screen — its stick moves the cursor)
      const frozen = frozenAll || p.frozen || !p.connected || !!this.act?.holds?.(p);
      if (p.vehicle) {
        // riding: the vehicle placed us; just pose
        a.update(sdt, p.input, col, true);
      } else {
        a.baseY = (p.bedY != null ? p.bedY : w.groundY(a.pos)) + (a.sink || 0);
        const tl = w.tileAt(a.pos.x, a.pos.z);
        a.onIce = tl === TT.ICE || tl === TT.GLACIER;
        if (this.swim && !frozen) this.swim.pre(p, sdt);
        if (p.mount) this.mounts.pre(p);
        // (on foot, any water can be waded into — you start swimming there; mounts keep their own rules)
        a.update(sdt, p.input, p.mount ? this.mounts.colFor(p) || col : this.swim ? this.swim.swimCol : col, frozen);
        if (this.swim) this.swim.post(p, sdt);
        if (p.mount) this.mounts.post(p, sdt);
      }
      p.ring.position.set(a.pos.x, p.swimming || (p.mount && p.mount.swim) ? 0.03 : (p.mount ? p.mount.y - a.jumpY : a.baseY || 0) + 0.02, a.pos.z);
      p.ring.visible = !p.hidden && !p.vehicle && !p.dive;
      a.model.root.visible = !p.hidden;
      if (p.tagT > 0) p.tagT -= dt;
      if (p.emoteT > 0 && (p.emoteT -= dt) <= 0) p.emote = null;
      if (p.speechT > 0 && (p.speechT -= dt) <= 0) p.speech = null;
      if (p.portraitDue > 0 && (p.portraitDue -= dt) <= 0) this.sendPortrait(p);
    }
    this.separatePlayers(col);
    // (a hero pushing and going nowhere, or boxed in: « Get unstuck » comes forward — stuck.js)
    const roam = this.exploring() && this.phase !== 'lobby';
    for (const p of this.players) {
      if (!p.connected) { p.stuckOffer = false; continue; }
      const v = p.input.moveVector(), sw = p.stuckWatch || (p.stuckWatch = new StuckWatch());
      p.stuckOffer = sw.update(dt, {
        pushing: Math.hypot(v.x, v.y) > 0.5, pos: p.pos,
        busy: !roam || frozenAll || p.frozen || !!p.vehicle || !!p.mount || !!p.swimming || !!p.dive || !!p.sleeping || !!(p.fighter && p.fighter.down) || this.tvmenus.isOpen(p),
        boxedAt: () => !nearWater(this.world, p.pos.x, p.pos.z) && stuckAt(col, p.pos.x, p.pos.z, { r: 0.1, room: 12 }),
      });
    }
    if (this.rooms && !frozenAll) this.rooms.update(sdt);
    if (this.mounts && !frozenAll) this.mounts.update(sdt);
    if (this.dinos && !frozenAll) this.dinos.update(sdt);
    if (this.encounters && !frozenAll) this.encounters.update(sdt);
    if (this.lairs && !frozenAll) this.lairs.update(sdt);
    if (this.rares && !frozenAll) this.rares.update(sdt);
    if (this.travel && !frozenAll) this.travel.update(sdt);
    if (this.secrets && !frozenAll) this.secrets.update(sdt);
    if (this.races && !frozenAll) this.races.update(sdt);
    if (this.events && !frozenAll) this.events.update(sdt);
    if (this.camp) this.camp.update(sdt, frozenAll);
    if (this.progress) this.progress.update(dt);
    if (this.zones && !frozenAll) this.zones.update(dt);
    this.lastDt = dt;
    // (frozen for a scene or a talk: the floating numbers and barks still fade away)
    if (this.combat && !frozenAll) this.combat.update(dt); else if (this.combat) this.combat.updateNums(dt);
    this.buddies.update(sdt, frozenAll);
    // footprints in the snow
    for (const p of this.players) {
      if (!p.actor.moving || p.actor.airborne || w.tileAt(p.pos.x, p.pos.z) !== TT.SNOW) continue;
      p.printT = (p.printT || 0) - dt;
      if (p.printT <= 0) {
        p.printT = p.actor.running ? 0.14 : 0.2;
        p.printSide = -(p.printSide || 1);
        const d = p.actor.dir;
        w.fx.emit('print', p.pos.x - d.z * 0.1 * p.printSide, 0.02, p.pos.z + d.x * 0.1 * p.printSide + 0.05, 1);
      }
    }
    // villagers
    for (const n of this.npcs) { n.baseY = n.seatY !== undefined ? n.seatY : w.groundY(n.pos) + (n.actSeat || 0); n.update(dt, this.npcWorld); }
    // the valley around everyone
    const focus = this.allPlayers().map((p) => p.pos);
    if (!focus.length) focus.push(LOBBY);
    w.updateScenery(dt, focus);
    w.critters.update(dt, w.t, this.allPlayers().map((p) => p.actor).concat(focus.length ? [] : [{ pos: LOBBY }]), s.hour);
    w.fx.update(dt);
    // phones: button labels, hints, and your health & special when fighting
    for (const p of this.players) {
      if (p.kind !== 'phone' || !p.connected) continue;
      let ctx = this.vote ? { a: null, b: null, hint: 'Vote on your phone!' }
        : this.phase === 'lobby' ? { a: 'Wave', b: 'Hop', hint: '' }
          : this.act ? this.act.ctxFor(p) : { a: null, b: 'Hop', hint: '' };
      if (!this.vote && this.phase !== 'lobby' && !this.dialogue.active) {
        const vc = this.vehicles && this.vehicles.ctxFor(p);
        if (p.vehicle && vc) ctx = { ...vc, x: null };
        else if (p.swimming) ctx = vc && vc.a ? { ...this.swim.ctxFor(p), a: vc.a, hint: vc.hint, vars: vc.vars } : this.swim.ctxFor(p);
        else if (vc && vc.a) ctx = { ...ctx, a: vc.a, hint: vc.hint, vars: vc.vars };
      }
      if (!this.vote && !this.dialogue.active && !p.vehicle && !p.swimming && this.mounts) ctx = this.mounts.ctxFor(p, ctx) || ctx;
      if (!this.vote && !this.dialogue.active && this.camp && this.phase !== 'lobby') ctx = this.camp.ctxFor(p, ctx) || ctx;
      // a scene is playing: everyone watches the big screen (the host may skip it)
      const scene = this.stage && this.stage.active;
      if (scene && !this.vote) ctx = { a: this.dialogue.active ? 'Next' : null, b: null, x: null, y: this.host.isHost(p) ? 'Skip' : null, hint: p.remote ? 'A scene is playing — watch your screen!' : 'A scene is playing — watch the big screen!' };
      const C = this.combat, fi = p.fighter;
      if (C && fi && !fi.down && !p.mount && !p.vehicle && !p.swimming && !this.vote && !scene && (C.pvp || C.enemies.some((e) => e.alive && Math.hypot(e.x - p.pos.x, e.z - p.pos.z) < 9))) ctx = { ...ctx, y: 'Dodge' };
      if (ctx.x === undefined && (this.vote || this.dialogue.active)) ctx.x = null;
      const ic = padIcons({ a: ctx.a, x: ctx.x === undefined && fi ? (fi.moves || fi.cls).special.name : ctx.x, y: ctx.y }, fi, p.mount && p.mount.D);
      ctx = { ...ctx, a: ctx.a ? t(ctx.a) : ctx.a, b: ctx.b ? t(ctx.b) : ctx.b, x: ctx.x ? t(ctx.x) : ctx.x, y: ctx.y ? t(ctx.y) : null, hint: ctx.hint ? t(ctx.hint, ctx.vars) : '' };
      if (ic && !(fi && fi.down)) ctx.ic = ic;
      delete ctx.vars;
      const f = p.fighter;
      if (f) {
        ctx.hp = Math.max(0, Math.round((f.hp / f.maxHp) * 20)) * 5;
        ctx.lv = f.level;
        ctx.cd = f.cd > 0 ? Math.ceil((f.cd / (f.cls.special.cd * f.mods.cdr)) * 10) * 10 : 0;
        ctx.cls = f.clsId;
        if (f.ultId && !f.down && !p.mount && !p.vehicle) { ctx.ult = Math.floor(f.ult); ctx.uic = ULTS[f.ultId].icon; }
        if (ctx.x === undefined) ctx.x = t(f.cls.special.name);
        if (f.down) { ctx.a = null; ctx.b = null; ctx.x = null; ctx.y = null; ctx.hint = t(this.combat.pvp ? 'Bonked! Back in a moment…' : 'Having a little nap… a friend can help you up!'); }
      }
      if (p.mount) { const h = p.mount; ctx.cd = h.abilCd > 0 ? Math.ceil((h.abilCd / h.D.ability.cd) * 10) * 10 : 0; }
      if (p.stuckOffer && !scene) ctx.stuck = 1;          // (the phone offers « Get unstuck » up front)
      this.sendCtx(p, ctx);
    }
    for (const q of this.toasts) q.t += dt;
    if (this.obj) this.obj.t += dt;
    this.toasts = this.toasts.filter((q) => q.t < (q.life || 3.2));
    if (this.banner) { this.banner.t += dt; if (this.banner.t > 3.6) this.banner = null; }
    this.updateAmbience(dt);
    this.updateCamera(dt);
  }

  // camera & zoom (in the lobby, look past the join card on the left)
  updateCamera(dt) {
    const cp = this.camPlayers();
    this.zoom.update(dt, cp);
    const card = Math.min(170, Math.round(this.display.w * 0.34)) + 12;
    const tv = this.tvmenus.shiftTiles();
    this.cam.shift = this.phase === 'lobby' ? { x: -((card * this.display.scale) / this.display.wscale) / 2 / this.cam.ppu, z: 0.6 } : tv ? { x: -tv, z: 0 } : null;
    this.cam.focus = this.phase !== 'lobby' && this.act && this.act.camFocus ? this.act.camFocus() : null;
    if (cp.length) this.cam.update(dt, cp);
    else this.cam.update(dt, [{ pos: LOBBY, vel: { x: 0, z: 0 } }]);
    // each friend at home: a camera of their own (a scene's camera is everyone's)
    const views = this.cam.views.slice(), C = this.cam;
    for (const p of this.players) {
      if (!p.remote || !p.connected || cp.includes(p)) { p.rcam = null; continue; }
      const rc = p.rcam || (p.rcam = new SplitCam(this.r3d));
      Object.assign(rc, { ppu: C.ppu, bounds: C.bounds, focus: C.focus, director: C.director, roomOf: C.roomOf, bossNear: C.bossNear, shake: C.shake });
      rc.update(dt, [p], !p.rcamT);
      p.rcamT = (p.rcamT || 0) + dt;
      views.push(...rc.views);
    }
    if (this.big) this.big.update(dt, views, this.cam.ppu, this.t);
  }

  // A friend at home (play.html) sees their own camera: the world drawn again from it into
  // `rd` (remote-host.js's canvases, the big screen's sizes), with the shared HUD, the
  // dialogue & the scenes — not the big screen's own menus.
  drawRemote(p, rd) {
    if (!p.rcam || !p.rcam.views.length) return false;
    const cam = this.cam, d = this.display;
    this.cam = p.rcam; this.display = rd; this.remoteFor = p;
    try { this.draw(); } finally { this.cam = cam; this.display = d; this.remoteFor = null; }
    return true;
  }

  // something found at the bottom of the sea
  onDiveFind(p, spot) {
    const w = this.world, C = this.combat;
    const names = { pearl: 'a pearl', shell: 'a rainbow shell', relic: 'an old relic' };
    w.fx.emit('sparkle', p.pos.x, 1.2, p.pos.z, 18, { color: spot.loot === 'relic' ? '#ffd66b' : '#dff4ff' });
    audio.sfx(spot.loot === 'relic' ? 'shard' : 'pickup', { volume: 0.7 });
    p.pearls = (p.pearls || 0) + (spot.loot === 'pearl' ? 1 : 0);
    if (C && p.fighter) C.gainXp(p, spot.loot === 'relic' ? 30 : 10);
    if (this.act && this.act.onTreasure) this.act.onTreasure(p, spot.loot);
    this.toast(t('{name} found {thing}!', { name: p.name, thing: t(names[spot.loot]) }), p.color);
    p.setEmote('star', 1.6);
    this.buzz(p, [30, 40, 60]);
  }

  // where someone is: a valley place, or the big world’s zone
  placeName(x, z) {
    const R = this.rooms && this.rooms.near(x, z);
    if (R) return R.def.name;
    if (this.dungeons && this.dungeons.inside(x, z)) return this.dungeons.cur.def.name;
    if (this.big && !this.big.inValley(x, z)) return this.big.zoneAt(x, z).name;
    return areaAt(Math.floor(x), Math.floor(z));
  }

  // the host paused: the world holds its breath (menus, zoom & phones still work)
  updatePaused(dt) {
    for (const q of this.toasts) q.t += dt;
    this.toasts = this.toasts.filter((q) => q.t < (q.life || 3.2));
    this.updateCamera(dt);
  }

  // ------------------------------------------------------------------ host actions
  async restartActivity() {
    const kind = this.actKind;
    if (!kind || this.switching) return;
    this.switching = true;
    await this.fadeTo(1, 0.4);
    this.resetActs();
    this.gatherAt(LOBBY.x, LOBBY.z);
    this.startAct(kind);
    this.switching = false;
  }

  async switchActivity(kind) {
    if (this.switching) return;
    if (this.phase === 'lobby') {
      if (this.vote) this.vote = null;
      this.choosing = false;
      for (const p of this.players) if (p.kind === 'phone') this.net.send(p.id, { t: 'screen', s: 'play' });
      this.startAct(kind);
      return;
    }
    this.switching = true;
    await this.fadeTo(1, 0.4);
    this.resetActs();
    this.gatherAt(LOBBY.x, LOBBY.z);
    this.startAct(kind);
    this.switching = false;
  }

  // friends bump softly instead of overlapping
  separatePlayers(col) {
    const ps = this.players;
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i].actor, b = ps[j].actor;
      if (ps[i].hidden || ps[j].hidden || ps[i].vehicle || ps[j].vehicle) continue;
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
      const d = Math.hypot(dx, dz), min = 0.52;
      if (d >= min) continue;
      const nx = d > 1e-4 ? dx / d : 1, nz = d > 1e-4 ? dz / d : 0;
      const push = (min - d) / 2;
      col.move(a.pos, -nx * push, -nz * push, a.radius);
      col.move(b.pos, nx * push, nz * push, b.radius);
    }
  }

  updateLobby(dt) {
    this.pollLocalJoins();
    const reload = this.options.reload;
    if (reload?.activity) {
      // Let returning phones reconnect before resuming; local players need no new join press.
      if (this.players.some((p) => p.connected)) this.reloadT = (this.reloadT || 0) + dt;
      if (this.reloadT >= 1) {
        const activity = reload.activity; this.options.reload = null; this.options.resume = false;
        this.startAct(activity); return;
      }
      return;
    }
    // drop phones that left while we were still in the lobby
    for (const p of this.players.slice()) if (!p.connected && this.t - p.goneAt > 20) this.removePlayer(p);
    for (const p of this.players) {
      if (!p.input.pressed('a')) continue;
      this.flashTag(p, 3);
      if (p.kind === 'phone') { p.setEmote(['heart', 'note', 'star', 'sparkle'][Math.floor(Math.random() * 4)], 1.4); audio.sfx('heart', { volume: 0.35 }); }
      else { this.setLook(p, randomLook()); this.saveProfile(p); audio.sfx('select', { volume: 0.5 }); }
    }
    if (this.vote || this.choosing) return;
    const here = this.players.filter((p) => p.connected);
    const allReady = here.length > 0 && here.every((p) => p.ready);
    // tell the phones who’s ready (the host’s Start button shows it)
    const H = this.hostLed();
    const info = { t: 'lobby', ready: here.filter((p) => p.ready).length, total: here.length, host: H ? H.name : '' };
    const key = JSON.stringify(info);
    if (key !== this.lobbyKey) { this.lobbyKey = key; this.net.broadcast(info); }
    if (allReady && !H) {
      const before = Math.ceil(this.countdown);
      this.countdown = (this.countdown || 3.99) - dt;
      if (Math.ceil(this.countdown) !== before && this.countdown > 0) audio.sfx('tick', { volume: 0.6 });
      if (this.countdown <= 0) this.chooseActivity();
    } else this.countdown = 0;
  }

  // the phone wearing the crown, if it’s here: it starts the party
  hostLed() { const h = this.host.player; return h && h.connected && h.kind === 'phone' ? h : null; }

  // everyone’s ready: what shall we play? (a vote on the phones)
  async chooseActivity() {
    if (this.options.resume) { this.options.resume = false; this.startAct('explore'); return; }
    this.choosing = true;
    this.countdown = 0;
    // (World v7: the Adventure — the saga — comes first, where the party left it)
    const sg = this.loadSave('saga', null), ch = SAGA_CHAPTERS.find((c) => c.id === ((sg && sg.ch) || 1)) || SAGA_CHAPTERS[0];
    const opts = [
      { id: 'explore', label: t('The Adventure'), sub: sg && sg.q && sg.q.c1_intro ? t('Chapter {n} — {title}', { n: ch.id, title: t(ch.title) }) : t('the story begins in Marigold Cove'), color: '#ffd66b' },
      { id: 'story', label: t('The Starfall Festival'), sub: t('a cozy story with mini-games'), color: '#8fd67a' },
      { id: 'waves', label: t('Arena: gloom waves'), sub: t('team up against wave after wave'), color: '#b88cf0' },
    ];
    if (this.players.filter((p) => p.connected).length >= 2) {
      opts.push({ id: 'brawl', label: t('Arena: brawl'), sub: t('friendly free-for-all!'), color: '#ef6479' });
      opts.push({ id: 'king', label: t('Arena: king of the ring'), sub: t('hold the golden circle alone'), color: '#f4c542' });
    }
    const i = await this.ask(t('What shall we play?'), opts, 25);
    this.choosing = false;
    if (this.phase === 'lobby') this.startAct(opts[i].id);
  }

  startAct(kind, opts = {}) {
    if (this.act) this.act.dispose();
    this.act = null;
    this.stopCombat();
    this.actKind = kind;
    this.phase = 'adventure';
    this.countdown = 0;
    audio.sfx('confirm');
    for (const p of this.players) { p.ready = true; p.stars = p.stars || 0; this.syncPad(p); this.flashTag(p, 6); }
    this.obj = null;
    if (kind === 'story') {
      this.act = new PartyStory(this);
      if (opts.debugChapter) this.act.debugChapter(opts.debugChapter); else this.act.start();
    } else if (kind === 'explore') {
      this.act = new ExploreAct(this, opts);
      this.act.start();
    } else {
      this.act = new ArenaAct(this, { mode: kind, ...opts });
      this.act.start();
    }
  }

  // (tools) jump straight into the story, or one chapter of it
  startAdventure(debugChapter = null) { this.startAct('story', { debugChapter }); }

  // ------------------------------------------------------------------ fighting
  startCombat(opts = {}) {
    this.stopCombat();
    this.combat = new Combat(this, opts);
    return this.combat;
  }

  stopCombat() {
    if (!this.combat) return;
    for (const p of this.players) this.saveProfile(p);
    this.combat.dispose();
    this.combat = null;
    this.cam.shake = 0;
  }

  // ------------------------------------------------------------------ profiles (class & level per phone)
  loadProfiles() {
    try { this.profiles = JSON.parse(localStorage.getItem('hearthlight.party.v1') || '{}') || {}; } catch (e) { this.profiles = {}; }
  }
  profileOf(p) {
    if (!this.profiles[p.id]) this.profiles[p.id] = { cls: null, level: 1, xp: 0, hats: [] };
    return this.profiles[p.id];
  }
  saveProfile(p) {
    const pr = this.profileOf(p);
    pr.cls = p.cls;
    pr.name = p.name;
    if (p.kind !== 'phone') pr.look = p.look;       // (a phone brings its own)
    if (p.fighter) { pr.level = p.fighter.level; pr.xp = p.fighter.xp; }
    this.profileDirty = true;
  }
  flushProfiles() {
    this.profileT = 2;
    const raw = JSON.stringify(this.profiles); this.pendingSaves.set('hearthlight.party.v1', raw);
    try { localStorage.setItem('hearthlight.party.v1', raw); this.profileDirty = false; return true; } catch (e) { this.saveFailed(); return false; }
  }

  restorePositions() {
    if (!this.resumePending) return false;
    this.resumePending = false;
    const positions = this.loadSave('session', {}).positions || {}, m = this.big.map;
    let restored = false;
    for (const p of this.players) {
      const pos = positions[p.id];
      if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.z) || pos.x < m.X0 || pos.z < m.Z0 || pos.x >= m.X0 + m.W || pos.z >= m.Z0 + m.H) continue;
      const at = !this.world.overCol.blocked(pos.x, pos.z, 0.8) ? pos : findUnstuck(this.world.overCol, pos.x, pos.z);
      if (at) { p.actor.pos = { x: at.x, z: at.z }; restored = true; }
    }
    return restored;
  }

  saveFailed() {
    this.saveError = true;
    if (!this.saveWarnAt || Date.now() - this.saveWarnAt > 30000) { this.saveWarnAt = Date.now(); this.toast(t('Save failed. Export a backup before leaving.'), '#ef6479'); }
  }

  saveNow() {
    this.saveError = false;
    for (const p of this.players) this.saveProfile(p);
    this.flushProfiles();
    if (this.saga) this.saga.save();
    if (this.big?.worldMap) this.big.worldMap.save();
    const previous = this.loadSave('session', {});
    const positions = { ...previous.positions };
    if (this.exploring() && !this.busy && !this.cinematic) for (const p of this.players) {
      const pos = this.rooms ? this.rooms.mapPos(p) : p.pos;
      if (Number.isFinite(pos.x) && Number.isFinite(pos.z)) positions[p.id] = { x: pos.x, z: pos.z };
    }
    // (a lobby opened and closed again isn't a game to continue: only once something was played)
    if (this.actKind || previous.savedAt) this.writeSave('session', { savedAt: Date.now(), players: this.players.map((p) => p.name), positions, activity: this.actKind || previous.activity || 'explore' });
    this.game.partySaveAvailable = true;
    return !this.saveError;
  }

  // ------------------------------------------------------------------ votes (on the phones)
  // (owner & cancel: the one who opened it can call it off at once with that option — a waystone
  // touched by mistake doesn't hold everyone still for the whole vote)
  ask(title, options, time = 22, { owner = null, cancel = -1 } = {}) {
    return new Promise((resolve) => {
      const id = (this.voteSeq = (this.voteSeq || 0) + 1);
      this.vote = { id, title, options, picks: new Map(), t: time, time, resolve, cursor: new Map(), owner, cancel };
      this.voteRects = null;
      for (const p of this.players) this.sendVote(p);
      audio.jingle('questStart');
    });
  }

  sendVote(p) {
    const v = this.vote;
    if (!v || p.kind !== 'phone') return;
    this.net.send(p.id, { t: 'screen', s: 'choice', id: v.id, title: v.title, options: v.options.map((o) => ({ label: o.label, sub: o.sub || '', color: o.color })), note: t('Vote! Majority wins') });
    if (v.picks.has(p.slot)) this.net.send(p.id, { t: 'tally', id: v.id, counts: this.tally() });
  }

  tally() {
    const v = this.vote, counts = v.options.map(() => 0);
    for (const i of v.picks.values()) counts[i]++;
    return counts;
  }

  onVotePick(p, d) {
    const v = this.vote;
    if (!v || d.id !== v.id || typeof d.i !== 'number' || d.i < 0 || d.i >= v.options.length) return;
    v.picks.set(p.slot, d.i);
    audio.sfx('select', { volume: 0.6 });
    if (v.owner === p.slot && d.i === v.cancel) { v.called = d.i; return; }
    const counts = this.tally();
    for (const q of this.players) if (q.kind === 'phone' && v.picks.has(q.slot)) this.net.send(q.id, { t: 'tally', id: v.id, counts });
  }

  updateVote(dt) {
    const v = this.vote;
    v.t -= dt;
    // keyboard & gamepad players vote on the big screen — the keyboard's player with the mouse too
    const g = this.game.input, kb = this.players.find((p) => p.kind === 'keys' && p.connected && !v.picks.has(p.slot));
    if (kb && this.voteRects && !this.host.menu && !this.bigMapOpen) for (const r of this.voteRects) if (g.mouseIn(r.x, r.y, r.w, r.h)) {
      if (g.mouse.moved) v.cursor.set(kb.slot, r.i);
      if (g.mouse.pressed) { g.mouse.pressed = false; this.onVotePick(kb, { id: v.id, i: r.i }); }
    }
    for (const p of this.players) {
      if (p.kind === 'phone' || v.picks.has(p.slot)) continue;
      let c = v.cursor.get(p.slot) || 0;
      if (p.input.pressed('up') || p.input.pressed('left')) c = (c + v.options.length - 1) % v.options.length;
      if (p.input.pressed('down') || p.input.pressed('right')) c = (c + 1) % v.options.length;
      v.cursor.set(p.slot, c);
      if (p.input.pressed('a')) this.onVotePick(p, { id: v.id, i: c });
    }
    const voters = this.players.filter((p) => p.connected);
    const allIn = voters.length > 0 && voters.every((p) => v.picks.has(p.slot));
    // (settled early: the leader can't be caught by the votes still to come)
    const counts = this.tally(), left = voters.filter((p) => !v.picks.has(p.slot)).length;
    const [top, next = 0] = [...counts].sort((a, b) => b - a);
    const settled = top - next > left;
    if (allIn || settled || v.called !== undefined || v.t <= 0) {
      const max = Math.max(...counts);
      const best = counts.map((n, i) => (n === max ? i : -1)).filter((i) => i >= 0);
      const win = v.called !== undefined ? v.called : best[Math.floor(Math.random() * best.length)];
      this.vote = null;
      for (const p of this.players) if (p.kind === 'phone') this.net.send(p.id, { t: 'screen', s: 'play' });
      audio.sfx('confirm');
      this.toast(t('{choice}!', { choice: v.options[win].label }), v.options[win].color || '#ffd66b');
      for (const p of this.players) p.input.edges.clear();
      v.resolve(win);
    }
  }

  drawVote(ctx) {
    const W = this.display.w, H = this.display.h, v = this.vote;
    const pw = Math.min(W - 40, 310), rows = v.options.length;
    const ph = 44 + rows * 22;
    const px = Math.round((W - pw) / 2), py = Math.round(H / 2 - ph / 2 - 10);
    panel(ctx, px, py, pw, ph);
    drawText(ctx, v.title, px + pw / 2, py + 9, { color: '#8a5234', align: 'center' });
    // (no phone here: everyone votes on this screen)
    const phones = this.players.some((p) => p.kind === 'phone' && p.connected), secs = Math.max(0, Math.ceil(v.t));
    drawText(ctx, phones ? t('Vote on your phone · {n}s', { n: secs }) : t('Vote on this screen · {n}s', { n: secs }), px + pw / 2, py + 21, { color: UI.inkSoft, align: 'center' });
    // (the keyboard's player can click an answer: it lights up under the mouse)
    const counts = this.tally(), rects = [], gi = this.game.input;
    const mouse = !this.remoteFor && this.players.some((p) => p.kind === 'keys' && p.connected && !v.picks.has(p.slot));
    v.options.forEach((o, i) => {
      const y = py + 34 + i * 22, r = { x: px + 10, y: y - 2, w: pw - 20, h: 22, i };
      rects.push(r);
      ctx.fillStyle = o.color || '#c9a77c'; ctx.fillRect(px + 10, y, 4, 18);
      ctx.fillStyle = mouse && gi.mouseIn(r.x, r.y, r.w, r.h) ? '#fff3c4' : '#f3e3c3'; ctx.fillRect(px + 14, y, pw - 24, 18);
      drawText(ctx, o.label, px + 20, y + 2, { color: UI.ink });
      if (o.sub) drawText(ctx, o.sub, px + 20, y + 10, { color: UI.inkSoft });
      let dx = px + pw - 16;
      for (const p of this.players) {
        const picked = v.picks.get(p.slot) === i;
        const cursor = p.kind !== 'phone' && !v.picks.has(p.slot) && (v.cursor.get(p.slot) || 0) === i;
        if (!picked && !cursor) continue;
        ctx.fillStyle = '#3b2a2e'; ctx.fillRect(dx - 7, y + 4, 9, 9);
        ctx.fillStyle = p.color; ctx.fillRect(dx - 6, y + 5, 7, 7);
        if (cursor && Math.floor(this.t * 3) % 2) { ctx.fillStyle = '#fff7e6'; ctx.fillRect(dx - 4, y + 7, 3, 3); }
        dx -= 11;
      }
      if (counts[i]) drawText(ctx, `${counts[i]}`, dx - 4, y + 5, { color: '#8a5234', align: 'right' });
    });
    if (!this.remoteFor) this.voteRects = rects;
  }

  updateAmbience(dt) {
    this.ambT = (this.ambT || 0) - dt;
    if (this.ambT > 0) return;
    this.ambT = 1;
    const s = this.state;
    const c = this.cam.views[0] ? { x: this.cam.views[0].cx, z: this.cam.views[0].cz } : LOBBY;
    const area = this.placeName(c.x, c.z);
    const night = s.hour >= 20 || s.hour < 5.5;
    const mood = this.zones && this.zones.mood();
    const room = this.rooms && this.rooms.near(c.x, c.z);
    const fightTrack = this.lairs && this.lairs.fight ? 'boss'
      : this.events && this.events.invasion && this.events.invasion.phase === 'fight' ? 'battle'
        : this.races && this.races.race && this.races.race.phase === 'run' ? 'race' : null;
    if (this.sceneMusic) { if (audio.currentTrack !== this.sceneMusic) audio.playMusic(this.sceneMusic, { fade: 1 }); }
    else if (fightTrack) { if (audio.currentTrack !== fightTrack) audio.playMusic(fightTrack, { fade: 1.2 }); }
    else if (room) { const tr = room.def.music || 'interior'; if (audio.currentTrack !== tr) audio.playMusic(tr, { fade: 1.5 }); }
    else if (this.act && this.act.music) { if (audio.currentTrack !== this.act.music) audio.playMusic(this.act.music, { fade: 2 }); }
    else if (mood && mood.music && this.phase !== 'lobby') { if (audio.currentTrack !== mood.music) audio.playMusic(mood.music, { fade: 3 }); }
    else {
      const track = night ? 'night' : area === 'Turtle Isle' ? 'island' : ['Whisperwood', 'Whisperwood Camp', 'Old Oak Shrine', 'Glowcap Grove', 'Maple Hollow', 'Reedmarsh'].includes(area) ? 'forest' : area === 'Frostpine Ridge' ? 'title' : s.hour >= 17.5 ? 'evening' : 'day';
      if (audio.currentTrack !== track) audio.playMusic(track, { fade: 3 });
    }
    const amb = {
      birds: !night ? (area === 'Frostpine Ridge' ? 0.15 : 0.6) : 0, crickets: night ? 0.8 : 0, waves: 0.3,
      rain: 0, wind: area === 'Frostpine Ridge' ? 0.5 : 0.15, fire: this.camp ? (this.camp.fireAmb || 0) * 0.7 : 0, night: night ? 0.5 : 0,
    };
    if (mood && mood.amb && !room) { Object.assign(amb, mood.amb); if (night) { amb.birds = 0; amb.night = 0.5; amb.crickets = Math.max(amb.crickets || 0, 0.4); } }
    // indoors: the world outside goes quiet (a fireplace crackles)
    if (room) Object.assign(amb, { birds: 0, crickets: night ? 0.12 : 0, waves: 0, rain: 0, wind: 0, night: 0, fire: room.room.fires.length ? 0.45 : 0 });
    else Object.assign(amb, this.world.placeSounds(c));      // (the fountain, a saw, the café, near the first view)
    audio.setAmbient(amb);
    this.lighting.weatherDim = (this.act && this.act.dim) || 0;
  }

  // who’s standing behind the leaves in this view: tree crowns in front of
  // them dither away (see render/seethrough.js)
  fillSee(v) {
    const S = SEE.spots.value, ppu = v.ppu || this.cam.ppu || 16, H = this.r3d.h, R = v.rect;
    let n = 0;
    const add = (x, y, z, r) => {
      if (n >= SEE_MAX) return;
      const q = v.project(x, y, z);
      if (q.x < R.x - 30 || q.x > R.x + R.w + 30 || q.y < R.y - 30 || q.y > R.y + R.h + 30) return;
      S[n++].set(q.x, H - q.y, q.z * 0.5 + 0.5, r * ppu);
    };
    for (const p of this.players) if (p.connected && !p.hidden) add(p.pos.x, 0.85 + (p.actor.baseY || 0) + (p.actor.jumpY || 0), p.pos.z, 1.15);
    const C = this.combat;
    if (C) for (const e of C.enemies) if (e.alive && !e.under) add(e.x, (e.y || 0) + (e.def.h || 1) * 0.5, e.z, (e.r || 0.4) + 0.5);
    SEE.count.value = n;
  }

  // ------------------------------------------------------------------ draw
  draw() {
    const d = this.display, r3d = this.r3d, cam = this.cam, L = this.lighting, w = this.world;
    const s = this.state;
    const v0 = cam.views[0];
    L.update(s.hour, { x: v0.cx, z: v0.cz });
    const RM = this.rooms;
    if (RM) RM.beginDraw(cam.views);
    // (several views: each draws only what it can see — see render/cull.js)
    const cull = cam.views.length > 1 ? (this.cull || (this.cull = new ViewCull(r3d.scene))) : null;
    if (cull) cull.begin();
    r3d.renderViews(cam.views, {
      split: cam.layout.type === 'split' ? cam.split : null,
      cells: cam.layout.type === 'grid' ? [cam.layout.cols, cam.layout.rows] : [1, 1],
      prep: (v) => {
        const inRoom = RM && RM.light(v), ppu = v.ppu || cam.ppu;
        r3d.aimShadow(v.cx, v.cz, v.rect.w, v.rect.h, ppu);
        if (!inRoom) L.assignPool({ x: v.cx, z: v.cz }, L.lampLevel);
        this.fillSee(v);
        if (cull) cull.apply(v, ppu, r3d.sunDir);
      },
    });
    if (cull) cull.restore();
    if (RM) RM.endDraw();
    SEE.count.value = 0;
    const wctx = d.wctx;
    wctx.drawImage(r3d.canvas, 0, 0);
    for (const v of cam.views) {
      wctx.save();
      this.clipPath(wctx, v, false);
      const indoor = RM && RM.viewRoom(v);
      if (!indoor) w.drawAmbientDots(wctx, v);
      w.fx.draw(wctx, v);
      if (this.act) this.act.drawWorld(wctx, v);
      if (this.swim) this.swim.drawSpots(wctx, v, this.t);
      if (this.zones && !indoor) this.zones.drawView(wctx, v, this.paused || this.remoteFor ? 0 : (this.lastDt || 1 / 60));
      wctx.restore();
    }
    // falling snow / petals / leaves where the first group is
    const drift = cam.views.length === 1 ? this.driftAt(v0) : null;
    if (drift) w.fx.drawDrift(wctx, d.ww, d.wh, 1 / 60, drift.kind, drift.level);
    this.drawSeams(wctx);
    if (cam.flash > 0) { wctx.fillStyle = `rgba(255,248,230,${cam.flash * 0.35})`; wctx.fillRect(0, 0, d.ww, d.wh); }
    if (this.fade > 0) { wctx.fillStyle = `rgba(20,14,28,${this.fade})`; wctx.fillRect(0, 0, d.ww, d.wh); }
    // ---- UI layer
    const ctx = d.ctx;
    ctx.clearRect(0, 0, d.w, d.h);
    this.miniRect = null;
    if (this.fade < 1) {
      for (const v of cam.views) {
        ctx.save(); this.clipPath(ctx, v, true);
        this.drawLabels(ctx, v);
        if (this.combat) this.combat.drawLabels(ctx, v);
        ctx.restore();
      }
      for (const cell of cam.spare) this.drawMapPanel(ctx, cell);
      // grid panels: whose view is this? a row of colour chips in the corner
      if (cam.layout.type === 'grid') for (const v of cam.views) {
        const a = d.worldToUi(v.rect.x, v.rect.y);
        let x = Math.round(a.x) + 4, y = Math.round(a.y) + 4;
        if (y < 30) y = 30;
        for (const m of v.members) { ctx.fillStyle = '#241a2e'; ctx.fillRect(x - 1, y - 1, 8, 8); ctx.fillStyle = m.color; ctx.fillRect(x, y, 6, 6); x += 9; }
      }
    }
    // (a scene clears the screen for itself: bars, title cards, the dialogue)
    const scene = this.stage && (this.stage.active || this.stage.barK > 0);
    if (this.phase === 'lobby') this.drawLobby(ctx);
    else if (!scene) this.drawHud(ctx);
    if (!scene) {
      if (this.combat) this.combat.drawUi(ctx);
      if (this.act) this.act.drawUi(ctx);
      if (this.races && this.phase !== 'lobby') this.races.drawUi(ctx);
      if (this.events && this.phase !== 'lobby') this.events.drawUi(ctx);
      if (this.camp && this.phase !== 'lobby') this.camp.drawUi(ctx);
      this.drawObjective(ctx);
      // (over the HUD: an arrow must never hide under the minimap)
      if (this.fade < 1) for (const v of cam.views) this.drawOthers(ctx, v);
    }
    if (this.stage) this.stage.draw(ctx, d.w, d.h);
    if (this.vote) this.drawVote(ctx);
    const own = !this.remoteFor;              // (the big screen's own menus stay on the big screen)
    if (own) this.tvmenus.draw(ctx);
    this.dialogue.draw(ctx);
    this.drawToasts(ctx);
    if (own && this.bigMapOpen) this.drawBigMap(ctx);
    if (own && this.zoom.flashT > 0 && !this.host.menu) this.drawZoomFlash(ctx);
    if (this.paused && !(own && this.host.menu)) this.drawPaused(ctx);
    if (own && this.host.menu) this.host.drawMenu(ctx);
  }

  // a moment’s note when the host changes the zoom: "Far view", "Auto (…)"
  drawZoomFlash(ctx) {
    const Z = this.zoom, W = this.display.w;
    const txt = Z.describe(), lv = Z.levels();
    const ws = Z.mode === 'auto' ? (Z.target || Z.normal()) : Z.mode, cur = lv.findIndex((l) => l.ws === ws);
    const w = measure(txt) + 22 + lv.length * 4, x = Math.round(W / 2 - w / 2), y = 26;
    ctx.globalAlpha = Math.min(1, Z.flashT * 3);
    ctx.fillStyle = '#241a2e'; ctx.fillRect(x - 1, y - 1, w + 2, 15);
    ctx.fillStyle = '#3b2e4a'; ctx.fillRect(x, y, w, 13);
    ctx.fillStyle = '#f6d38f';
    ctx.fillRect(x + 5, y + 3, 3, 1); ctx.fillRect(x + 5, y + 7, 3, 1); ctx.fillRect(x + 4, y + 4, 1, 3); ctx.fillRect(x + 8, y + 4, 1, 3);
    ctx.fillRect(x + 8, y + 7, 1, 1); ctx.fillRect(x + 9, y + 8, 1, 1); ctx.fillRect(x + 10, y + 9, 1, 1);
    drawText(ctx, txt, x + 14, y + 3, { color: '#fff3c4' });
    lv.forEach((l, j) => { ctx.fillStyle = j === cur ? '#f6c65b' : '#6a5a7a'; ctx.fillRect(x + w - 4 - (lv.length - j) * 4, y + 4, 3, 5); });
    ctx.globalAlpha = 1;
  }

  drawPaused(ctx) {
    const W = this.display.w, H = this.display.h;
    ctx.fillStyle = 'rgba(20,14,28,0.35)'; ctx.fillRect(0, 0, W, H);
    const title = t('Paused'), sub = t('{name} paused the game', { name: this.paused.by || '' });
    const hint = t('the host can resume from their phone · Esc or Start on the big screen');
    const pw = Math.max(measure(sub), measure(hint)) + 30, ph = 50;
    const px = Math.round((W - pw) / 2), py = Math.round(H * 0.13);
    panel(ctx, px, py, pw, ph);
    drawText(ctx, title, W / 2, py + 8, { color: '#8a5234', align: 'center', scale: 2 });
    drawText(ctx, sub, W / 2, py + 27, { color: UI.ink, align: 'center' });
    drawText(ctx, hint, W / 2, py + 38, { color: UI.inkSoft, align: 'center' });
  }

  driftAt(v) {
    const dr = this.world.biomeDrift({ x: v.cx, z: v.cz });
    return dr && dr.level > 0 ? dr : null;
  }

  // clip to a view’s region (world-canvas px, or UI px when `ui`)
  clipPath(ctx, v, ui) {
    const d = this.display;
    const pts = v.half ? halfPoly(d.ww, d.wh, v.half) : [[v.rect.x, v.rect.y], [v.rect.x + v.rect.w, v.rect.y], [v.rect.x + v.rect.w, v.rect.y + v.rect.h], [v.rect.x, v.rect.y + v.rect.h]];
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
      const q = ui ? d.worldToUi(x, y) : { x, y };
      if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
    });
    ctx.closePath();
    ctx.clip();
  }

  // grid seams (the diagonal split seam is drawn by the post pass)
  drawSeams(wctx) {
    const cam = this.cam, d = this.display;
    if (cam.layout.type !== 'grid') return;
    const cells = cam.views.map((v) => v.rect).concat(cam.spare);
    wctx.fillStyle = '#2a1d34';
    for (const r of cells) {
      if (r.x > 0) wctx.fillRect(r.x - 2, r.y, 4, r.h);
      if (r.y > 0) wctx.fillRect(r.x, r.y - 2, r.w, 4);
    }
    wctx.fillStyle = 'rgba(255,243,210,0.55)';
    for (const r of cells) {
      if (r.x > 0) wctx.fillRect(r.x, r.y, 1, r.h);
      if (r.y > 0) wctx.fillRect(r.x, r.y, r.w, 1);
    }
    void d;
  }

  toUi(v, x, y, z) { const p = v.project(x, y, z); return this.display.worldToUi(p.x, p.y); }

  // names, emotes & speech above heads; villager bubbles; objective markers
  drawLabels(ctx, v) {
    const now = this.t, said = [];
    for (const n of this.npcs) {
      if (n.hidden) continue;
      const u = this.toUi(v, n.pos.x, (n.def.kid ? 1.35 : 1.6) + (n.baseY || 0) + (n.jumpY || 0), n.pos.z);
      if (n.emoteKind) drawEmote(ctx, u.x, u.y - 2, n.emoteKind, now);
      else if (n.bubble) said.push({ x: u.x, y: u.y - 4, text: n.bubble });
      else if (!this.busy && !this.dialogue.active && this.players.some((p) => Math.hypot(p.pos.x - n.pos.x, p.pos.z - n.pos.z) < 1.9)) {
        const nm = t(n.def.short), tw = measure(nm) + 6;
        ctx.fillStyle = 'rgba(30,20,36,0.6)';
        ctx.fillRect(Math.round(u.x - tw / 2), Math.round(u.y - 12), tw, 10);
        drawText(ctx, nm, u.x, u.y - 11, { color: '#fff7e6', align: 'center' });
      }
    }
    // Above each head: just a little arrow in the player’s colour (it blinks
    // red when health runs low). Names only show for a few seconds — when
    // someone joins, respawns, levels up or waves — so a crowd stays readable.
    const tags = [];
    for (const p of this.players) {
      if (p.hidden) continue;
      const a = p.actor;
      const u = this.toUi(v, p.pos.x, 1.72 + (a.baseY || 0) + a.jumpY, p.pos.z);
      const f = p.fighter;
      const low = !!(f && !f.down && f.hp < f.maxHp * 0.3);
      if (!(p.tagT > 0) && p.connected) { playerPip(ctx, u.x, u.y - 1, p.color, low, now); if (p.emote) drawEmote(ctx, u.x, u.y - 9, p.emote, now); else if (p.speech) bubble(ctx, u.x, u.y - 6, p.speech); continue; }
      tags.push({ p, x: u.x, y: u.y - 4, w: measure(p.name) + 6, ay: u.y, a: p.connected ? Math.min(1, p.tagT * 2.5) : 1 });
    }
    tags.sort((a, b) => b.y - a.y);
    for (let i = 0; i < tags.length; i++) {
      const a = tags[i];
      for (let k = 0; k < 6; k++) {
        const hit = tags.slice(0, i).find((b) => Math.abs(b.x - a.x) < (a.w + b.w) / 2 + 1 && Math.abs(b.y - a.y) < 10);
        if (!hit) break;
        a.y = hit.y - 10;
      }
    }
    for (const g of tags) {
      const p = g.p;
      ctx.globalAlpha = g.a;
      nameTag(ctx, g.x, g.y, p.name, p.color, !p.connected);
      ctx.globalAlpha = 1;
      if (p.emote) drawEmote(ctx, g.x, g.y - 10, p.emote, now);
      else if (p.speech) bubble(ctx, g.x, g.y - 11, p.speech);
    }
    // villagers’ words go on top of the crowd’s name tags
    for (const b of said) bubble(ctx, b.x, b.y, b.text, { wrapW: 150 });
    // (a hero who seems stuck: how to get out, over their head)
    // (two heroes stuck side by side: their bubbles stack rather than overlap)
    const stuckSays = [];
    for (const p of this.players) {
      if (!p.stuckOffer || p.hidden || this.dialogue.active) continue;
      const u = this.toUi(v, p.pos.x, 2.2 + (p.actor.baseY || 0), p.pos.z);
      const say = p.kind === 'phone' ? t('Stuck? Look at your phone') : t('Stuck? {key} → Get unstuck', { key: keyOf(p, 'm') });
      let y = u.y - 14;
      for (const q of stuckSays) if (Math.abs(q.x - u.x) < 110 && Math.abs(q.y - y) < 24) y = q.y - 24;
      stuckSays.push({ x: u.x, y });
      bubble(ctx, u.x, y + Math.sin(this.t * 3) * 1.5, say, { wrapW: 180 });
    }
    if (this.arena) this.arena.drawLabels(ctx, v);
    if (this.mounts) this.mounts.drawLabels(ctx, v);
    if (this.races) this.races.drawLabels(ctx, v);
    // (no "press A" over doors and boats while a scene plays)
    const scene = this.stage && (this.stage.active || this.stage.barK > 0);
    if (this.rooms && !scene) this.rooms.drawLabels(ctx, v);
    if (this.act) this.act.drawLabels(ctx, v);
    if (this.vehicles && !scene) this.vehicles.drawLabels(ctx, v, this);
  }

  // Friends this view doesn't show (at home with their own camera, or far off): an arrow on
  // its edge in their colour, pointing their way, with their name and how far. Friends the
  // same way share one arrow; the minimap's corner stays clear.
  drawOthers(ctx, v) {
    if (this.phase === 'lobby' || (this.stage && (this.stage.active || this.stage.barK > 0)) || this.fade > 0.3) return;
    const d = this.display, R = v.rect, a = d.worldToUi(R.x, R.y), b = d.worldToUi(R.x + R.w, R.y + R.h);
    const own = !this.remoteFor ? this.cam.views : [v];
    const mid = v.members.length ? this.toUi(v, v.members[0].pos.x, 1, v.members[0].pos.z) : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const cx = Math.max(a.x + 40, Math.min(b.x - 40, mid.x)), cy = Math.max(a.y + 40, Math.min(b.y - 40, mid.y));
    const x0 = a.x + 12, x1 = b.x - 12, y0 = a.y + 34, y1 = b.y - 30, M = this.miniRect, m0 = v.members[0];
    const groups = [];
    for (const p of this.players) {
      if (!p.connected || p.hidden || own.some((w) => w.members.includes(p))) continue;
      const pos = this.rooms ? this.rooms.mapPos(p) : p.pos, u = this.toUi(v, pos.x, 1, pos.z);
      if (u.x > x0 && u.x < x1 && u.y > y0 && u.y < y1) continue;           // (in sight: its own pip says where)
      const dx = u.x - cx, dy = u.y - cy, k = Math.min(dx ? ((dx > 0 ? x1 : x0) - cx) / dx : 1e9, dy ? ((dy > 0 ? y1 : y0) - cy) / dy : 1e9);
      let X = Math.round(cx + dx * k), Y = Math.round(cy + dy * k);
      if (M && X > M.x - 10 && Y > M.y - 16) { if (X >= x1 - 1) Y = M.y - 16; else X = M.x - 12; }
      if (v.half) { const q = d.uiToWorld(X, Y); if (!v.owns(q.x, q.y)) continue; }
      const L = Math.hypot(dx, dy) || 1, dist = Math.round(Math.hypot(pos.x - (m0 ? m0.pos.x : v.cx), pos.z - (m0 ? m0.pos.z : v.cz)));
      const g = groups.find((q) => Math.abs(q.X - X) < 16 && Math.abs(q.Y - Y) < 16);
      if (g) { g.ps.push(p); g.dist = Math.min(g.dist, dist); } else groups.push({ X, Y, ux: dx / L, uy: dy / L, ps: [p], dist });
    }
    for (const { X, Y, ux, uy, ps, dist } of groups) {
      // the arrow: a dark rim, the first friend's colour; the others' colours as chips behind it
      const tri = (r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(X + ux * r * 1.3, Y + uy * r * 1.3); ctx.lineTo(X - ux * r * 0.7 - uy * r, Y - uy * r * 0.7 + ux * r); ctx.lineTo(X - ux * r * 0.7 + uy * r, Y - uy * r * 0.7 - ux * r); ctx.closePath(); ctx.fill(); };
      tri(8, '#241a2e'); tri(6, ps[0].color);
      const names = ps.length > 2 ? ps[0].name + ' +' + (ps.length - 1) : ps.map((p) => p.name).join(', ');
      const label = names + (dist >= 12 ? ' · ' + dist + ' m' : ''), tw = measure(label) + 6 + (ps.length > 1 ? ps.length * 4 : 0);
      // (the name beside the arrow, on the side away from the edge)
      const across = Math.abs(ux) > Math.abs(uy);
      const lx0 = across ? (ux > 0 ? X - 12 - tw : X + 12) : X - tw / 2, ly0 = across ? Y - 5 : uy > 0 ? Y - 21 : Y + 11;
      const lx = Math.round(Math.max(a.x + 2, Math.min(b.x - tw - 2, lx0))), ly = Math.round(Math.max(a.y + 2, Math.min(b.y - 12, ly0)));
      ctx.fillStyle = 'rgba(20,14,28,0.72)'; ctx.fillRect(lx, ly, tw, 10);
      let tx = lx + 3;
      if (ps.length > 1) for (const p of ps) { ctx.fillStyle = p.color; ctx.fillRect(tx, ly + 3, 3, 4); tx += 4; }
      else { ctx.fillStyle = ps[0].color; ctx.fillRect(lx, ly + 9, tw, 1); }
      drawText(ctx, label, tx + (ps.length > 1 ? 1 : 0), ly + 1, { color: '#fff7e6' });
    }
  }

  drawMapPanel(ctx, cell) {
    const d = this.display;
    const a = d.worldToUi(cell.x, cell.y), b = d.worldToUi(cell.x + cell.w, cell.y + cell.h);
    const x = Math.round(a.x), y = Math.round(a.y), pw = Math.round(b.x - a.x), ph = Math.round(b.y - a.y);
    ctx.fillStyle = '#2a1d34'; ctx.fillRect(x, y, pw, ph);
    drawText(ctx, t('Where is everyone?'), x + pw / 2, y + 4, { color: '#f6d38f', align: 'center' });
    // frame everyone (and the goal), as close as the panel allows
    const pts = this.players.map((p) => (this.rooms ? this.rooms.mapPos(p) : p.pos)), tgt = this.act && this.act.target;
    if (tgt) pts.push(tgt);
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const q of pts) { x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); z0 = Math.min(z0, q.z); z1 = Math.max(z1, q.z); }
    const bw = pw - 12, bh = ph - 24;
    const k = Math.max(0.35, Math.min(3, Math.min(bw / (x1 - x0 + 40), bh / (z1 - z0 + 30))));
    this.drawWorldMap(ctx, x + 6, y + 16, bw, bh, (x0 + x1) / 2, (z0 + z1) / 2, k);
  }

  // the corner minimap: the world around the first view
  drawMiniMap(ctx, x, y, w, h) {
    const v = this.cam.views[0];
    this.miniRect = { x: x - 2, y: y - 2, w: w + 4, h: h + 4 };        // (the friends' arrows keep off it)
    ctx.fillStyle = '#2a1d34'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    if (v && this.dungeons && this.dungeons.inside(v.cx, v.cz) && this.dungeons.drawMini(ctx, x, y, w, h, this.players.filter((p) => p.connected))) return;
    const c = v ? (this.rooms && this.rooms.doorOf(v)) || { x: v.cx, z: v.cz } : LOBBY;
    this.drawWorldMap(ctx, x, y, w, h, c.x, c.z, 1, { small: true });
  }

  // the world map in a box around (cx, cz) at k screen px per tile, with
  // the activity’s marks, the goal and everyone on it
  drawWorldMap(ctx, x, y, w, h, cx, cz, k, opts = {}) { return drawWorldMap(this, ctx, x, y, w, h, cx, cz, k, opts); }

  // the whole world, full screen (host menu or M on the big screen)
  drawBigMap(ctx) {
    if (!this.big || !this.big.worldMap) return;
    const W = this.display.w, H = this.display.h;
    ctx.fillStyle = 'rgba(20,14,28,0.82)'; ctx.fillRect(0, 0, W, H);
    const R = mapRegion(this);
    drawText(ctx, t(R.id === 'dawn' ? 'The Dawnlands' : 'The Hearthlands'), W / 2, 6, { color: '#fff3c4', align: 'center', outline: '#241a2e' });
    this.mapView.hint = t('Wheel or + / - to zoom · drag to move');
    drawWorldPanel(this, ctx, 0, 14, W, H - 14, { counts: true, view: this.mapView });
    this.mapCloseR = closeButton(ctx, W - 4, 1);
  }

  drawToasts(ctx) {
    // (a player's menu open on the right: the notes & the banner keep to the screen left of it)
    const W = this.tvmenus.open ? Math.max(140, this.display.w - this.tvmenus.width() - 10) : this.display.w, b = this.banner;
    // toasts step down under the banner (and the race card) rather than hide behind them
    const avoid = [];
    if (b) {
      const big = measure(b.title) * 2 <= W - 24, by = Math.round(this.display.h * 0.2);
      const bw = Math.max(measure(b.title) * (big ? 2 : 1), b.sub ? measure(b.sub) : 0);
      avoid.push({ x0: W / 2 - bw / 2 - 4, x1: W / 2 + bw / 2 + 4, y0: by - 3, y1: by + (b.sub ? 30 : 20) });
    }
    const scene = this.stage && (this.stage.active || this.stage.barK > 0);
    for (const rc of [this.races && this.races.cardRect, this.events && this.events.cardRect, this.camp && this.camp.cardRect, !scene && this.combat && this.combat.barRect]) if (rc) avoid.push({ x0: rc.x - 2, x1: rc.x + rc.w + 2, y0: rc.y - 2, y1: rc.y + rc.h + 2 });
    avoid.sort((p, q) => p.y0 - q.y0);
    let y = this.phase === 'lobby' ? 56 : 31;
    this.toasts.forEach((t) => {
      const a = Math.min(1, t.t * 4, ((t.life || 3.2) - t.t) * 3);
      // (long ones — a puzzle room’s rules — wrap)
      const lines = wrap(t.text, Math.min(W * 0.55, 300));
      const tw = Math.max(...lines.map((l) => measure(l))) + 14, th = 3 + lines.length * 10;
      const x = Math.round(W - tw - 6);
      for (const r of avoid) if (x < r.x1 && x + tw > r.x0 && y < r.y1 && y + th > r.y0) y = r.y1 + 2;
      const ty = y;
      y += th + 2;
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(30,20,40,0.82)'; ctx.fillRect(x, ty, tw, th);
      ctx.fillStyle = t.color; ctx.fillRect(x, ty, 3, th);
      lines.forEach((l, k) => drawText(ctx, l, x + 8, ty + 3 + k * 10, { color: '#fff7e6' }));
      ctx.globalAlpha = 1;
    });
    if (this.banner) {
      const b = this.banner, a = Math.min(1, b.t * 3, (3.6 - b.t) * 2);
      ctx.globalAlpha = Math.max(0, a);
      const y = Math.round(this.display.h * 0.2);
      // big letters when it fits, else normal size (long names, long languages)
      const big = measure(b.title) * 2 <= W - 24;
      drawText(ctx, b.title, W / 2, y + (big ? 0 : 6), { color: '#fff3c4', align: 'center', scale: big ? 2 : 1, outline: '#3b2a2e' });
      if (b.sub) drawText(ctx, b.sub, W / 2, y + 20, { color: '#f6d38f', align: 'center', outline: '#3b2a2e' });
      ctx.globalAlpha = 1;
    }
  }

  // ------------------------------------------------------------------ lobby screen
  drawLobby(ctx) {
    const W = this.display.w, H = this.display.h, now = this.t, tr = t;
    const cardH = 56;
    // join card on the left
    const py = 8, px = 8, card = !this.remoteFor;          // (a friend at home doesn't need the QR code)
    const pw = card ? Math.min(196, Math.round(W * 0.38)) : -16, ph = H - cardH - 14 - py;
    this.copyR = null;
    if (card) {
    panel(ctx, px, py, pw, ph);
    const net = this.net;
    // (a gamepad plugged in but nobody's: it can join; somebody on this screen: their menu)
    const pads = navigator.getGamepads ? [...navigator.getGamepads()] : [];
    const padFree = pads.some((gp) => gp && gp.connected !== false && !this.players.some((q) => q.kind === 'gamepad' && q.input.index === gp.index));
    const local = this.players.some((q) => q.kind !== 'phone');
    const tipText = padFree ? t('🎮 A gamepad is here: press A to join!')
      : local ? t('No phone? Your own menu (talents, gear…) is on this screen: Select on a gamepad, Tab on the keyboard.')
        : t('No phone? Press E or Enter on the keyboard, or A on a gamepad, to play on this screen.');
    const tips = wrap(tipText, pw - 16);
    const tipsY = py + ph - 7 - tips.length * 10;
    tips.forEach((l, i) => drawText(ctx, l, px + pw / 2, tipsY + i * 10, { color: padFree ? '#4f955a' : UI.inkSoft, align: 'center' }));
    drawText(ctx, t('Join the party!'), px + pw / 2, py + 8, { color: '#8a5234', align: 'center' });
    if (net.status === 'unavailable' || net.status === 'full') {
      // (no relay here, or the online one has no room left: the desktop app has its own)
      const why = net.status === 'full' ? t('The online party server is full right now. Try again in a few minutes — or get the desktop app: phones on your Wi-Fi join it directly.')
        : t('Phones can’t join this copy of the game: play online or in the desktop app (or start it with python3 tools/devserver.py).');
      const lines = wrap(why, pw - 20);
      lines.forEach((l, i) => drawText(ctx, l, px + 10, py + 26 + i * 11, { color: '#a8483a' }));
    } else if (!net.code || !this.qr) {
      drawText(ctx, net.status === 'down' ? t('Reconnecting…') : t('Opening the room…'), px + pw / 2, py + 60, { color: UI.inkSoft, align: 'center' });
    } else {
      const q = this.qr;
      const room = tipsY - py - 88;              // (under it: the code, the address, the copy button, a line)
      const m = Math.max(1, Math.floor(Math.min(pw - 20, room) / q.width));
      const qs = q.width * m, qx = px + Math.round((pw - qs) / 2), qy = py + 20;
      ctx.fillStyle = '#8e5d3e'; ctx.fillRect(qx - 2, qy - 2, qs + 4, qs + 4);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(q, qx, qy, qs, qs);
      let y = qy + qs + 6;
      const lw = measure(t('code')) + 4, cw = measure(net.code, 2);
      const cx0 = px + Math.round((pw - lw - cw) / 2);
      drawText(ctx, t('code'), cx0, y + 5, { color: UI.inkSoft });
      drawText(ctx, net.code, cx0 + lw, y, { color: '#3b2a2e', scale: 2 });
      y += 19;
      const url = net.joinUrl.replace(/^https?:\/\//, '').replace(/#.*$/, '');
      drawText(ctx, fitText(url, pw - 8), px + pw / 2, y, { color: '#4f73b6', align: 'center' });
      if (net.status === 'down') drawText(ctx, t('Reconnecting…'), px + pw / 2, y + 11, { color: '#a8483a', align: 'center' });
      else {
        // (friends far away: the whole invitation link — code included — copied in one click)
        const lab = this.copiedT > 0 ? t('Copied! Paste it to your friends') : t('Copy the invitation link');
        const bw = Math.min(pw - 16, measure(lab) + 16), bx = px + Math.round((pw - bw) / 2), by = y + 13;
        const gi = this.game.input, hot = gi.mouseIn(bx, by, bw, 14);
        button(ctx, bx, by, bw, 14, fitText(lab, bw - 8), { hot, color: this.copiedT > 0 ? '#4f955a' : null });
        this.copyR = { x: bx - 2, y: by - 2, w: bw + 4, h: 18 };
        if (net.playUrl) drawText(ctx, fitText(t('Far away? They can play from home with it'), pw - 10), px + pw / 2, by + 18, { color: '#3f8a4a', align: 'center' });
      }
    }
    }

    // player cards along the bottom
    const n = 8, gap = 3;
    const cw = Math.floor((W - 16 - gap * (n - 1)) / n), ch = cardH;
    const cy = H - ch - 6;
    for (let i = 0; i < n; i++) {
      const cx = 8 + i * (cw + gap);
      const p = this.players.find((q) => q.slot === i);
      const col = PARTY_COLORS[i].c;
      if (!p) {
        ctx.fillStyle = 'rgba(30,20,40,0.5)'; ctx.fillRect(cx, cy, cw, ch);
        ctx.fillStyle = col; ctx.fillRect(cx, cy, cw, 2);
        drawText(ctx, `P${i + 1}`, cx + cw / 2, cy + 14, { color: col, align: 'center', scale: 2 });
        drawText(ctx, Math.floor(now * 1.2 + i * 0.5) % 3 === 0 ? tr('join!') : '···', cx + cw / 2, cy + 36, { color: 'rgba(255,247,230,0.55)', align: 'center' });
        continue;
      }
      panel(ctx, cx, cy, cw, ch);
      ctx.fillStyle = col; ctx.fillRect(cx + 3, cy + 3, cw - 6, 3);
      const pc = this.portraits.get('party' + p.slot, p.look, p.ready ? 'happy' : 'neutral');
      const ps = 30, pxp = cx + Math.round((cw - ps) / 2);
      ctx.fillStyle = '#efdfc0'; ctx.fillRect(pxp, cy + 7, ps, ps - 4);
      if (pc) ctx.drawImage(pc, 4, 2, pc.width - 8, pc.height - 10, pxp, cy + 7, ps, ps - 4);
      drawText(ctx, p.name, cx + cw / 2, cy + 35, { color: UI.ink, align: 'center', maxChars: Math.max(3, Math.floor((cw - 6) / 5)) });
      const st = !p.connected ? [tr('away…'), '#a8483a'] : p.ready ? [tr('READY'), '#3f8a4a'] : [tr('styling…'), '#8a6a4a'];
      drawText(ctx, fitText(st[0], cw - 6), cx + cw / 2, cy + 44, { color: st[1], align: 'center' });
      // device badge
      const dev = p.kind === 'phone' ? '' : p.kind === 'keys' ? tr('keyboard') : tr('pad');
      if (dev) { const dw = measure(dev) + 4; ctx.fillStyle = '#5a3b2a'; ctx.fillRect(cx + cw - dw - 3, cy + 8, dw, 9); drawText(ctx, dev, cx + cw - dw - 1, cy + 9, { color: '#fff7e6' }); }
      else if (CLASSES[p.cls]) { ctx.fillStyle = '#3b2a22'; ctx.fillRect(cx + cw - 17, cy + 7, 14, 14); ctx.fillStyle = '#f3e3c3'; ctx.fillRect(cx + cw - 16, cy + 8, 12, 12); drawClassIcon(ctx, p.cls, cx + cw - 16, cy + 8); }
      if (p.ready && p.connected) { ctx.fillStyle = '#4f955a'; ctx.fillRect(cx + 4, cy + 8, 9, 9); drawText(ctx, '✓', cx + 8, cy + 9, { color: '#fff7e6', align: 'center' }); }
      if (this.host.isHost(p)) crown(ctx, cx + Math.round(cw / 2) - 4, cy - 3);
    }
    // title & status over the plaza
    const fx = pw + 16 + (W - pw - 16) / 2;
    drawText(ctx, tr('Hearthlight Party'), fx, py, { color: '#fff3c4', align: 'center', scale: 2, outline: '#3b2a2e' });
    drawText(ctx, tr('stories, adventures & the arena · 1 to 8 players'), fx, py + 20, { color: '#f6d38f', align: 'center', outline: '#3b2a2e' });
    wrap(tr('♛ the first phone is the host · {key}: the menu (invitations, options…)', { key: ctl('pause') }), W - pw - 28).slice(0, 2).forEach((l, i) => drawText(ctx, l, fx, py + 32 + i * 10, { color: '#d9c8e8', align: 'center', outline: '#3b2a2e' }));
    const here = this.players.filter((p) => p.connected);
    let msg;
    if (!here.length) msg = tr('Waiting for friends to join…');
    else if (this.countdown > 0) msg = tr('Everyone’s ready! Starting in {n}…', { n: Math.ceil(this.countdown) });
    else if (this.choosing) msg = here.some((p) => p.kind === 'phone') ? tr('Vote on your phone!') : tr('Vote on this screen!');
    else {
      const k = here.filter((p) => !p.ready).length, H = this.hostLed();
      if (H && !k) msg = tr('Everyone’s ready! ♛ {name} starts the party', { name: H.name });
      else msg = tn('{n} friend here', '{n} friends here', here.length) + ' · ' + (k ? tn('waiting for {n} to press Ready on their phone', 'waiting for {n} to press Ready on their phones', k) : '') + (H ? (k ? ' · ' : '') + tr('♛ {name} starts the party', { name: H.name }) : '');
    }
    // (a long line — German, Spanish… — takes two)
    const ml = wrap(msg, W - pw - 36).slice(0, 2);
    const mw = Math.max(...ml.map((l) => measure(l))) + 16, mx = Math.round(fx - mw / 2), my = cy - 4 - ml.length * 11 - 2;
    ctx.fillStyle = 'rgba(30,20,40,0.8)'; ctx.fillRect(mx, my, mw, ml.length * 11 + 2);
    ml.forEach((l, i) => drawText(ctx, l, mx + mw / 2, my + 3 + i * 11, { color: this.countdown > 0 ? '#ffd66b' : '#fff7e6', align: 'center' }));
  }

  // the adventure HUD is drawn by the activity (charms, badges…); the
  // objective card is shared
  // the clock (top right): the day, the time, the sky
  drawHud(ctx) {
    const s = this.state, W = this.display.w;
    const txt = dayLabel(s.day) + ' · ' + timeLabel(s.hour), w = measure(txt) + 30;
    panel(ctx, W - w - 5, 4, w, 23);
    weatherIcon(ctx, W - w + 1, 7, s.weather, s.hour);
    drawText(ctx, txt, W - 11, 11, { color: UI.ink, align: 'right' });
  }

  // where the objective card sits right now (the race & event cards keep clear of it)
  objectiveRect() {
    const o = this.obj;
    if (!o || o.t >= o.secs || this.vote || this.dialogue.active || this.phase === 'lobby') return null;
    const W = this.display.w;
    const k = Math.max(0, Math.min(1, o.t * 5, (o.secs - o.t) * 4));
    const ease = 1 - (1 - k) * (1 - k);
    const w = Math.round(Math.min(W * 0.5, Math.max(measure(o.text), measure(o.sub), Math.min(measure(o.extra), W * 0.5 - 20)) + 20));
    const lines = wrap(o.text, w - 18).slice(0, 2);
    const ex = o.extra ? wrap(o.extra, w - 18).slice(0, 2) : [];
    const h = 9 + lines.length * 11 + (o.sub ? 11 : 0) + ex.length * 10;
    return { x: Math.round(6 - (1 - ease) * (w + 12)), y: 4, w, h, lines, ex };
  }

  // a card at the top of the screen, beside (or under) the objective card
  topCard(w, h) {
    const W = this.display.w, o = this.objectiveRect();
    let x = Math.round(W / 2 - w / 2), y = 26;
    if (o && x < o.x + o.w + 4 && y < o.y + o.h + 2) {
      x = o.x + o.w + 6;
      if (x + w > W - 4) { x = Math.round(W / 2 - w / 2); y = o.y + o.h + 4; }
    }
    return { x, y };
  }

  drawObjective(ctx) {
    const o = this.obj, R = this.objectiveRect();
    if (!R) return;
    const { x, w, h, lines, ex } = R;
    panel(ctx, x, 4, w, h);
    lines.forEach((l, i) => drawText(ctx, l, x + 8, 10 + i * 11, { color: UI.ink }));
    if (o.sub) drawText(ctx, o.sub, x + 8, 10 + lines.length * 11, { color: '#8a5234', maxChars: 60 });
    ex.forEach((l, i) => drawText(ctx, l, x + 8, 10 + lines.length * 11 + (o.sub ? 11 : 0) + i * 10, { color: '#7d4f93' }));
  }

  // everyone along the bottom: colour, name, a value (stars, level, K.O.s…)
  // and, when fighting, a health bar with the special’s gauge on top
  drawBadges(ctx, value, valueColor = '#ffd66b') {
    const W = this.display.w, H = this.display.h, now = this.t;
    const ps = this.players;
    if (!ps.length) return;
    const fighting = ps.some((p) => p.fighter);
    const bh = fighting ? 17 : 14;
    const bw = Math.min(62, Math.floor((W - 12) / ps.length) - 3);
    let x = Math.round(W / 2 - (ps.length * (bw + 3) - 3) / 2);
    const y = H - bh - 3;
    for (const p of ps) {
      const f = p.fighter;
      ctx.fillStyle = 'rgba(30,20,40,0.82)'; ctx.fillRect(x, y, bw, bh);
      ctx.fillStyle = p.color; ctx.fillRect(x, y, 3, bh);
      const v = value ? String(value(p)) : '';
      const vw = v ? measure(v) + 4 : 0;
      drawText(ctx, p.name, x + 6, y + 3, { color: !p.connected ? '#8a7a98' : f && f.down ? '#b9a2e3' : '#fff7e6', maxChars: Math.max(3, Math.floor((bw - 10 - vw) / 5)) });
      if (v) drawText(ctx, v, x + bw - 3, y + 3, { color: valueColor, align: 'right' });
      if (f) {
        const hx = x + 5, hw = bw - 8, hy = y + bh - 4;
        ctx.fillStyle = '#3a2a3a'; ctx.fillRect(hx, hy, hw, 2);
        const k = Math.max(0, f.hp / f.maxHp);
        ctx.fillStyle = f.down ? '#8a7a98' : k > 0.5 ? '#6fd66a' : k > 0.25 ? '#f2c14e' : (Math.floor(now * 4) % 2 ? '#ff5a6a' : '#c83a4a');
        ctx.fillRect(hx, hy, Math.round(hw * k), 2);
        // the special’s gauge along the top edge, bright when it’s ready
        const full = f.cls.special.cd * f.mods.cdr, g = f.cd > 0 ? 1 - f.cd / full : 1;
        ctx.fillStyle = g >= 1 ? f.cls.color : 'rgba(143,183,255,0.55)';
        ctx.fillRect(x + 3, y, Math.round((bw - 3) * g), 1);
        if (f.down) drawText(ctx, 'zZ', x + bw - 3, y - 7, { color: '#b9a2e3', align: 'right', outline: '#241a2e' });
        // the ultimate’s gauge: a thin gold line under the name, a blinking U once it’s ready
        if (f.ultId && !f.down) {
          ctx.fillStyle = f.ult >= 100 ? (Math.floor(now * 4) % 2 ? '#ffd66b' : '#fff3a6') : 'rgba(255,214,107,0.55)';
          ctx.fillRect(x + 5, hy - 2, Math.round(hw * Math.min(1, f.ult / 100)), 1);
          if (f.ult >= 100) drawText(ctx, 'U', x + bw - 3, y - 7, { color: '#ffd66b', align: 'right', outline: '#241a2e' });
        }
      }
      if (this.buddies && this.buddies.of(p)) heart(ctx, x + bw - 7, y - 5);
      if (this.host.isHost(p)) crown(ctx, x + 3, y - 6);
      else if (p.kind !== 'phone' && p.connected) menuCap(ctx, x + 3, y - 9, keyOf(p, 'm'), this.tvmenus.isOpen?.(p));
      x += bw + 3;
    }
  }

  // ------------------------------------------------------------------ after the finale
  resetActs() {
    if (this.stage && this.stage.active) this.stage.end();
    this.sceneMusic = null;
    if (this.act) this.act.dispose();
    this.act = null;
    this.actKind = null;
    // the old activity’s scripts wait on lines, timers & votes that will
    // never come back: they just stop there
    this.dialogue.cur = null; this.dialogue.letter = null;
    this.waits = [];
    if (this.vote) { this.vote = null; for (const p of this.players) if (p.kind === 'phone') this.net.send(p.id, { t: 'screen', s: 'play' }); }
    this.choosing = false;
    this.obj = null;
    this.stopCombat();
    for (const n of this.npcs) this.r3d.scene.remove(n.model.root);
    this.npcs = [];
    this.lantern.reset();
    this.buddies.clear();
    for (const p of this.players) { p.stars = 0; p.frozen = false; p.hidden = false; p.carry = null; p.actor.model.setProp(null); }
    this.state.hour = 9.4;
    this.cinematic = false;
    this.busy = 0;
  }

  async restartAdventure(kind = 'story') {
    await this.fadeTo(1, 0.5);
    this.resetActs();
    this.gatherAt(LOBBY.x, LOBBY.z);
    this.startAct(kind);
  }

  async backToLobby() {
    await this.fadeTo(1, 0.5);
    this.resetActs();
    this.phase = 'lobby';
    this.countdown = 0;
    for (const p of this.players) { p.ready = p.kind !== 'phone'; this.syncPad(p); }
    this.gatherAt(LOBBY.x, LOBBY.z);
    await this.fadeTo(0, 0.6);
  }
}

// a small ▼ over a player’s head (their colour, outlined so it reads anywhere)
// a keyboard or gamepad player's menu key, on a tab above their badge: ☰ Tab
function menuCap(ctx, x, y, key, open) {
  const w = measure(key) + 13;
  ctx.fillStyle = '#241a2e'; ctx.fillRect(x - 1, y - 1, w + 2, 10);
  ctx.fillStyle = open ? '#e0a526' : '#5a3b2a'; ctx.fillRect(x, y, w, 9);
  ctx.fillStyle = '#fff7e6'; for (const k of [2, 4, 6]) ctx.fillRect(x + 2, y + k, 5, 1);
  drawText(ctx, key, x + 10, y + 1, { color: '#fff7e6' });
}

function playerPip(ctx, x, y, color, low, t) {
  const X = Math.round(x), Y = Math.round(y - 6 + Math.sin(t * 4 + x) * 1);
  ctx.fillStyle = '#241a2e';
  ctx.fillRect(X - 4, Y - 1, 9, 4); ctx.fillRect(X - 3, Y + 3, 7, 1); ctx.fillRect(X - 2, Y + 4, 5, 1); ctx.fillRect(X - 1, Y + 5, 3, 1);
  ctx.fillStyle = low && Math.floor(t * 4) % 2 ? '#ff5a6a' : color;
  ctx.fillRect(X - 3, Y, 7, 2); ctx.fillRect(X - 2, Y + 2, 5, 1); ctx.fillRect(X - 1, Y + 3, 3, 1);
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(X - 3, Y, 7, 1);
}

function nameTag(ctx, x, y, text, color, away) {
  const w = measure(text) + 6, h = 10;
  const bx = Math.round(x - w / 2), by = Math.round(y - h);
  ctx.fillStyle = 'rgba(20,14,28,0.55)'; ctx.fillRect(bx + 1, by + 1, w, h);
  ctx.fillStyle = away ? '#8a7a98' : color; ctx.fillRect(bx, by, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(bx, by, w, 1);
  drawText(ctx, text, x, by + 1, { color: '#241a2e', align: 'center' });
}

// the part of the screen rectangle on one side of a line (split views)
function halfPoly(W, H, h) {
  const pts = [[0, 0], [W, 0], [W, H], [0, H]];
  const f = ([x, y]) => ((x - h.ox) * h.nx + (y - h.oy) * h.ny) * h.s;
  const out = [];
  for (let i = 0; i < 4; i++) {
    const a = pts[i], b = pts[(i + 1) % 4], fa = f(a), fb = f(b);
    if (fa >= 0) out.push(a);
    if ((fa >= 0) !== (fb >= 0)) { const k = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]); }
  }
  return out;
}
