// The wild lands in the solo game: Party Mode's big world and its systems,
// run for one hero. Those systems talk to a `party` object; `Wild` stands in
// for it (players, camera, toasts, banners, questions, saves…), backed by the
// solo World scene. The valley — story, villagers, farm, shops — carries on
// exactly as before; it just opens onto the wild lands now.

import { THREE } from '../render/r3d.js';
import { SEE, SEE_MAX } from '../render/seethrough.js';
import { BigWorld } from '../world/big/bigworld.js';
import { ZoneRuntime } from '../party/zones.js';
import { Swim } from '../party/swim.js';
import { Vehicles } from '../party/vehicles.js';
import { Mounts, FOODS } from '../party/mounts.js';
import { Encounters } from '../party/encounters.js';
import { Lairs } from '../party/lairs.js';
import { Rares } from '../party/rares.js';
import { Progress } from '../party/progress.js';
import { Chests } from '../party/chests.js';
import { Travel } from '../party/travel.js';
import { Secrets } from '../party/secrets.js';
import { Races } from '../party/races.js';
import { Events } from '../party/events.js';
import { ArenaSite, ArenaAct, ARENA, GONG } from '../party/arena.js';
import { BLESSINGS } from '../combat/blessings.js';
import { Npc } from '../entities/actors.js';
import { WANDERERS } from './wanderers.js';
import { DIFFS } from '../party/host.js';
import { Combat } from '../combat/combat.js';
import { CLASSES, CLASS_ORDER, DODGE_ICON } from '../combat/classes.js';
import { drawIcon } from '../combat/v4/icons.js';
import { spent, picksOf, pointsFor, ULTS } from '../combat/v4/talents.js';
import { Campfires } from '../party/camp.js';
import { DinoLife } from '../party/dinos.js';
import { Buddies } from '../party/buddies.js';
import { wildDoors } from '../world/wildrooms.js';
import { INTERIORS } from '../world/interiors.js';
import { drawClassIcon } from '../combat/icons.js';
import { VALLEY } from '../world/big/layout.js';
import { areaAt } from '../world/overworld.js';
import { fogSeen, FOG_W, FOG_H } from '../state.js';
import { drawText, measure, wrap } from '../engine/font.js';
import { UI, bubble, keyCap, panel, emote, ctl, device, isFace, faceGlyph } from '../ui/ui.js';
import { audio } from '../engine/audio.js';
import { t } from '../i18n.js';
import { drawMarks, collectMarks } from '../party/mapmarks.js';
import { Stage } from '../saga/stage.js';
import { Saga } from '../saga/saga.js';

// ------------------------------------------------------------------ the hero's controls
// Party Mode's systems read a player's input as A / B / X / Y (+ 'interact',
// 'jump', 'special'); this maps the solo game's actions onto that, after the
// solo World has had its say (a press it used — talking, a door — is gone).
const MAP = { a: 'interact', interact: 'interact', b: 'jump', jump: 'jump', x: 'special', special: 'special', y: 'dodge', ult: 'ult', u: 'ult', run: 'run', left: 'left', right: 'right', up: 'up', down: 'down' };

// a press a system uses is gone for the solo game too (no jump after a dive…)
class Edges extends Set {
  constructor(src) { super(); this.src = src; }
  delete(k) { if (MAP[k] && this.src) this.src.consume(MAP[k]); return super.delete(k); }
}

export class SoloInput {
  constructor(input) {
    this.src = input;
    this.kind = 'keys';
    this.cur = new Set();
    this.prev = new Set();
    this.edges = new Edges(input);
    this.off = false;            // cutscenes, menus: nothing reaches the systems
  }
  update() {
    const I = this.src;
    this.prev = this.cur;
    this.cur = new Set();
    this.edges = new Edges(I);
    if (this.off) return;
    for (const [k, a] of Object.entries(MAP)) {
      if (I.down(a)) this.cur.add(k);
      if (I.pressed(a)) Set.prototype.add.call(this.edges, k);
    }
  }
  moveVector() { return this.off ? { x: 0, y: 0 } : this.src.moveVector(); }
  down(a) { return this.cur.has(a); }
  pressed(a) { return this.edges.has(a); }
  released(a) { return this.prev.has(a) && !this.cur.has(a); }
  release() { this.cur.clear(); Set.prototype.clear.call(this.edges); }
}

// ------------------------------------------------------------------ the hero
export class SoloHero {
  constructor(wild) {
    this.wild = wild;
    this.slot = 0;
    this.id = 'solo';
    this.kind = 'keys';          // 'phone' while a phone drives the game
    this.color = '#ef6479';
    this.colorName = 'Red';
    this.who = 'player';
    this.connected = true;
    this.goneAt = 0;
    this.input = new SoloInput(wild.game.input);
    this.hidden = false;
    this.frozen = false;
    this.emote = null; this.emoteT = 0;
    this.speech = null; this.speechT = 0;
    this.cls = null;
  }
  get actor() { return this.wild.world.player; }
  get pos() { return this.actor.pos; }
  get vel() { return this.actor.vel || { x: 0, z: 0 }; }
  get name() { return this.wild.state.player.name; }
  get label() { return this.name; }
  get look() { return this.wild.state.player.look; }
  setEmote(k, time = 1.6) { const w = this.wild.world; w.playerEmoteKind = k; w.playerEmoteT = time; }
  say(text, time = 3) { this.speech = text; this.speechT = time; }
}

// ------------------------------------------------------------------ the one camera view
// (the shape Party Mode's split-screen views have: rect, centre, project…)
class SoloView {
  constructor(wild) {
    this.wild = wild;
    this.id = 'solo';
    this.v3 = new THREE.Vector3();
    this.rect = { x: 0, y: 0, w: 2, h: 2 };
    this.members = [];
    this.cx = 0; this.cz = 0;
  }
  sync() {
    const r3d = this.wild.r3d;
    this.rect.w = r3d.w; this.rect.h = r3d.h;
    this.cx = r3d.target.x; this.cz = r3d.target.z;
    this.cam = r3d.camera;
    this.members = this.wild.players;
  }
  project(x, y, z) {
    const r3d = this.wild.r3d, v = this.v3.set(x, y, z).project(r3d.camera);
    return { x: ((v.x + 1) / 2) * r3d.w, y: ((1 - v.y) / 2) * r3d.h, z: v.z };
  }
  owns() { return true; }
}

// A / B / X / Y and the ultimate, as actions: `ctl` names them for the keyboard, the gamepad or the phone
const ACT = { a: 'interact', b: 'jump', x: 'special', y: 'dodge', u: 'ult' };
// a hint that talks about the phone's buttons ("Tap A to row…") — the action chips say it better
const NAMES_BUTTONS = /\b(press|tap|hold|with|then)\s+[ABXY]\b|\b[ABXY]\s*:|\b[ABXY] (to|again|together|when|while|at)\b/i;
const DIVE_ITEM = { pearl: 'pearl', shell: 'shell', relic: 'relic' };
const SHOP_PRICE = 80;
// phone-minded hints, said the solo way
const SOLO_HINTS = {
  'Offer {food} — then win its trust on your phone': 'Offer {food}, then win its trust: press when the marker is in the green',
  'You’re the captain: steer with the stick': 'You’re the captain: steer where you want to go',
  'Steer with the stick · warm air over cliffs & lava lifts you': 'Steer as you glide · warm air over cliffs & lava lifts you',
};

export class Wild {
  constructor(world) {
    this.world = world;
    this.game = world.game;
    this.r3d = world.r3d;
    this.display = world.display;
    this.lighting = world.lighting;
    this.solo = true;
    this.t = 0;
    this.me = new SoloHero(this);
    this.players = [this.me];
    this.view = new SoloView(this);
    const wild = this;
    this.cam = {
      shake: 0, flash: 0, ppu: 16, layout: { type: 'single' }, views: [this.view],
      snap() { wild.world.snapCamera(); },
    };
    // (Party Mode's systems talk to phones: here, the one playing the solo game, if any)
    const game = this.game;
    this.net = { send: (id, d) => game.phone && game.phone.send(d), broadcast: (d) => game.phone && game.phone.send(d) };
    // the wild lands' own folk: wanderers by the waystones, Pim, the Festival Ring's crowd
    this.npcs = [];
    this.npcCache = new Map();
    this.npcWorld = { collisionFor: () => world.overCol, fx: world.fx, mapId: 'overworld', transferNpc() {} };
    this.travelerList = WANDERERS;
    this.vote = null;
    this.phase = 'adventure';
    this.actKind = 'explore';
    this.profileDirty = false;
    // the adventure's difficulty lives in the settings
    const settings = world.settings;
    this.host = { diff: () => DIFFS[settings.adventure] || DIFFS.normal, opts: { ff: false } };
    // Party Mode's systems drop their chests through the activity: here it's us
    // (the Festival Ring's waves take its place for a while, then hand back)
    this.facade = {
      suspended: false, stage: 'roam', quietZones: false, target: null,
      dropChest: (x, z, opts) => this.chests && this.chests.drop(x, z, opts),
      stat() {},
      resume: () => this.backFromRing(),
    };
    this.act = this.facade;
  }

  get state() { return this.game.state; }
  get dialogue() { return this.world.dialogue; }
  get busy() { return this.world.busy + (this.world.cinematic ? 1 : 0); }
  set busy(v) { this.world.busy = Math.max(0, this.world.busy + (v - this.busy)); }
  get ring() { return this.act instanceof ArenaAct ? this.act : null; }
  get portraits() { return this.game.portraits; }
  get mapId() { return this.world.mapId; }

  // ------------------------------------------------------------------ life cycle
  start() {
    const s = this.state;
    if (!s.wild) s.wild = {};
    this.big = new BigWorld(this);
    this.big.attach();
    this.syncValleyFog();
    this.zones = new ZoneRuntime(this);
    // swimming: the glinting spots refill every morning
    this.swim = new Swim(this);
    const dv = this.loadSave('dives', null);
    const taken = dv && dv.day === s.day ? dv.taken : [];
    this.swim.spots = this.big.map.dives.map((d, i) => ({ ...d, i, taken: taken.includes(i) }));
    this.swim.onFind = (p, spot) => (spot.pick ? spot.pick(p) : this.onDiveFind(p, spot));     // (a saga's spot picks itself)
    this.vehicles = new Vehicles(this);
    this.mounts = new Mounts(this);
    this.dinos = new DinoLife(this);
    this.buddies = new Buddies(this);
    // fights: the hero, gloom camps, the guardians in their lairs, chests, talents & gear
    this.root = new THREE.Group();
    this.root.name = 'wild';
    this.world.over.root.add(this.root);
    this.chests = new Chests(this, this.root, (c, p) => this.onChestOpen(c, p));
    this.progress = new Progress(this);
    // (a new level: a talent point to spend on the Hero page)
    const onLevel = this.progress.onLevel.bind(this.progress);
    this.progress.onLevel = (p) => { onLevel(p); this.nudgeTalents(); };
    this.me.cls = CLASSES[this.profileOf().cls] ? this.profileOf().cls : 'knight';
    this.startCombat();
    // (health & the ultimate's gauge as they were when the game was saved)
    const v = this.loadSave('vitals', null), f = this.me.fighter;
    if (v && f && !v.down) { f.hp = Math.max(1, Math.min(f.maxHp, v.hp)); f.ult = v.ult || 0; }
    this.encounters = new Encounters(this);
    this.lairs = new Lairs(this);
    this.rares = new Rares(this);
    // waystones & wanderers, sealed chests & buried treasure, races, world events, the Festival Ring
    this.arena = new ArenaSite(this);
    this.travel = new Travel(this);
    this.secrets = new Secrets(this);
    this.races = new Races(this);
    this.events = new Events(this);
    this.camp = new Campfires(this);
    this.doors = wildDoors(this.big.map.pois);
    this.relight();
    this.stage = new Stage(this);
    this.sceneMusic = null;
    this.saga = new Saga(this);
  }

  startCombat(opts = {}) {
    this.stopCombat();
    const C = (this.combat = new Combat(this, { pvp: false, ...opts }));
    C.canAct = () => this.armed();
    C.onAllDown = () => this.nap();
    C.onKill = (e, p) => {
      if (this.saga) this.saga.onKill(e, p);
      // a gloomy stag, freed, trusts you: a mount — or a new companion
      const ride = e.def.animal === 'deer' ? 'stag' : e.def.mount;
      if (e.freed && p && ride && this.mounts && this.mounts.freeFriend(p, ride, e.x, e.z)) { e.remove(); e.fading = 0; return; }
      if (e.freed && this.buddies && this.buddies.adoptFrom(e, p)) { e.remove(); e.fading = 0; }
    };
    return C;
  }
  stopCombat() {
    if (!this.combat) return;
    this.saveProfile(this.me);
    this.combat.dispose();
    this.combat = null;
    this.cam.shake = 0;
  }

  stop() {
    if (!this.big) return;
    if (this.saga) { this.saga.dispose(); this.saga = null; }
    for (const p of this.players) if (p.vehicle) this.vehicles.leave(p, true);
    if (this.ring) { this.ring.dispose(); this.act = this.facade; }
    for (const k of ['events', 'races', 'secrets', 'travel']) if (this[k]) { this[k].dispose(); this[k] = null; }
    if (this.arena) { this.arena.dispose(); this.arena = null; }
    for (const n of [...this.npcs, ...this.npcCache.values()]) this.r3d.scene.remove(n.model.root);
    this.npcs = []; this.npcCache.clear();
    if (this.lairs) { this.lairs.dispose(); this.lairs = null; }
    if (this.rares) { this.rares.dispose(); this.rares = null; }
    if (this.encounters) { this.encounters.dispose(); this.encounters = null; }
    this.stopCombat();
    if (this.chests) { this.chests.dispose(); this.chests = null; }
    if (this.root) this.world.over.root.remove(this.root);
    const a = this.world.player;
    if (a) { a.speedMul = 1; a.down = false; a.lean = 0; a.doubleJump = false; a.model.root.visible = true; }
    if (this.mounts) { this.mounts.dispose(); this.mounts = null; }
    if (this.dinos) { this.dinos.dispose(); this.dinos = null; }
    if (this.buddies) { this.buddies.clear(); this.buddies = null; }
    if (this.vehicles) { this.vehicles.dispose(); this.vehicles = null; }
    if (this.swim) { this.swim.dispose(); this.swim = null; }
    this.me.swimming = false;
    this.big.detach();
    this.big = null;
  }

  // the parts of the valley you've already explored show on the world map too
  // (the solo map's 8-tile fog cells line up with the world map's)
  syncValleyFog() {
    const WM = this.big.worldMap, f = this.state.flags.fog;
    if (!f) return;
    const ox = Math.round(-WM.X0 / 8), oz = Math.round(-WM.Z0 / 8);
    let changed = false;
    for (let cz = 0; cz < FOG_H; cz++) for (let cx = 0; cx < FOG_W; cx++) {
      if (!fogSeen(this.state, cx, cz)) continue;
      const i = (cz + oz) * WM.FW + (cx + ox);
      if (!WM.fog[i]) { WM.fog[i] = 1; changed = true; }
    }
    if (changed) { WM.paintVeil(); WM.dirty = true; WM.revealN++; }
  }

  // the world's lamps (landmarks') join the valley's after a trip indoors
  relight() {
    if (!this.big || !this.big.pois) return;
    for (const s of [...(this.big.pois.lights || []), ...((this.arena && this.arena.lights) || [])]) if (!this.lighting.sources.includes(s)) this.lighting.addSource(s);
  }

  // ------------------------------------------------------------------ what Party Mode's systems ask
  exploring() { const w = this.world; return w.mapId === 'overworld' && !w.cinematic && !w.sail && !!this.big && this.act === this.facade; }
  // world events (invasions, migrations, shooting stars) only out in the wild lands
  eventsAllowed() { return this.outside(); }
  outside(x = this.me.pos.x, z = this.me.pos.z) { return !!this.big && !this.big.inValley(x, z); }
  camPlayers() { return this.players; }
  placeName(x, z) {
    if (this.dungeons && this.dungeons.inside(x, z)) return this.dungeons.cur.def.name;
    return this.big && !this.big.inValley(x, z) ? this.big.zoneAt(x, z).name : areaAt(Math.floor(x), Math.floor(z));
  }
  toUi(v, x, y, z) { return this.world.toUi(x, y, z); }
  // where a save puts you back when it's somewhere a reload can't rebuild (a dungeon's door)
  resumeSpot() { return (this.dungeons && this.dungeons.mapPos(this.me)) || null; }
  // what a save takes along besides the position: the hero's level, health and gauge
  beforeSave() {
    const f = this.me.fighter;
    this.saveProfile(this.me);
    if (f) this.writeSave('vitals', { hp: Math.round(f.hp), ult: Math.floor(f.ult || 0), down: !!f.down });
  }

  // the solo save keeps the wild lands' progress (a new game starts it afresh)
  loadSave(name, def) { const w = this.state.wild || (this.state.wild = {}); return w[name] !== undefined ? w[name] : def; }
  writeSave(name, v) { (this.state.wild || (this.state.wild = {}))[name] = v; }

  // the hero's profile: hero class, level, talents, gear, stardust, mounts
  profileOf() {
    const s = this.state;
    if (!s.hero) s.hero = { cls: null, level: 1, xp: 0, hats: [] };
    return s.hero;
  }
  saveProfile(p) {
    const pr = this.profileOf(p);
    pr.cls = p.cls;
    if (p.fighter) { pr.level = p.fighter.level; pr.xp = p.fighter.xp; }
  }

  // ---- folk of the wild lands (their models are kept for next time)
  spawnNpc(id, x, z, face = { x: 0, z: 1 }) {
    if (id === 'merchant' && this.world.marketDay()) return null;       // (Pim's at the valley market on Sundays)
    let n = this.npcs.find((q) => q.id === id);
    if (!n) {
      n = this.npcCache.get(id);
      if (!n) { n = new Npc(this.r3d, id); this.npcCache.set(id, n); }
      this.r3d.scene.add(n.model.root);
      this.npcs.push(n);
    }
    n.map = 'overworld';
    n.pos = { x, z };
    n.path = null; n.restDir = face; n.dir = face; n.hidden = false; n.activity = null; n.seatY = undefined;
    n.bubble = null; n.talking = false; n.emoteKind = null;
    return n;
  }
  removeNpc(id) {
    const n = this.npcs.find((q) => q.id === id);
    if (!n) return;
    this.r3d.scene.remove(n.model.root);
    this.npcs = this.npcs.filter((q) => q !== n);
  }

  // ---- questions, words, places
  ask(title, options) {
    // (the last choice is always the "no thanks" one: Esc picks it)
    return this.dialogue.choose('narrator', title, options.map((o) => (o.sub ? `${o.label} — ${o.sub}` : o.label)), { cancel: options.length - 1 });
  }
  say(who, text, vars) { return this.world.say(who, text, null, vars); }
  gatherAt(x, z) {
    if (this.me.mount) this.mounts.dismount(this.me, true);
    this.world.player.pos = { x, z };
    this.world.snapCamera();
  }
  anyPressed(a) { return this.me.input.pressed(a); }
  consume(a) { this.me.input.edges.delete(a); }
  drawBadges() {}
  // a card at the top of the screen (races, world events): under the place banners
  topCard(w) { return { x: Math.round(this.display.w / 2 - w / 2), y: 46 }; }

  toast(text) { this.world.hud.toast(text, null, UI.ink); }
  showBanner(title, sub = '') { this.world.hud.showBanner(title, sub); }
  // a hit, a block, a finisher…: the gamepad rumbles, the phone (when one drives the game) buzzes
  buzz(p, pattern = 40) {
    if (device() === 'pad') this.game.input.buzz(pattern);
    else if (this.game.phone.connected) this.game.phone.send({ t: 'buzz', p: pattern });
  }
  flashTag() {}
  fadeTo(to, dur = 0.4) { return this.world.fade(to, dur); }
  wait(sec) { return this.world.wait(sec); }

  // the Hero page: switch heroes (not mid-fight)
  chooseClass(id) {
    const me = this.me, C = this.combat;
    if (!CLASSES[id] || !C || me.cls === id) return false;
    if (this.fighting()) { this.toast(t('Not in the middle of a fight!')); audio.sfx('cancel', { volume: 0.5 }); return false; }
    C.setClass(me, id);
    this.saveProfile(me);
    const p = me.pos;
    this.world.fx.emit('sparkle', p.x, 1.2, p.z, 18, { color: CLASSES[id].color });
    this.toast(t('You’re a {hero} now!', { hero: t(CLASSES[id].name) }));
    return true;
  }

  nudgeTalents() {
    const f = this.me.fighter;
    if (!f || this.me.kind === 'phone') return;
    const pr = this.progress.prof(this.me), owned = spent(picksOf(pr, f.clsId));
    if (pointsFor(f.level) > owned && !(this.nudgedAt > this.t - 20)) { this.nudgedAt = this.t; this.toast(this.heroHint('A talent point to spend! ({key}: your Hero page)')); }
  }

  // the first steps out of the valley: gloom roams out here — the hero chosen when you made
  // your character is ready for it (the Hero page changes it any time)
  async firstSteps() {
    const w = this.world, s = this.state;
    s.flags.wildIntro = true;
    await w.run(async () => {
      const C = CLASSES[this.me.cls] || CLASSES.knight;
      await w.say('narrator', 'Beyond the valley, the wild lands stretch as far as the eye can see. Gloom creatures roam out here.');
      await w.say('narrator', C.ready);
      this.saveProfile(this.me);
      const k = (x) => this.keyName(x);
      await w.say('narrator', '{a} to attack — hold it for a big one. {x} for your special, {y} to dodge. Change your hero any time on the Hero page ({h}).', null, { a: k('a'), x: k('x'), y: k('y'), h: this.heroKey() });
    });
  }

  // the key (or button) behind A / B / X / Y right now
  keyName(k) {
    if (this.me.kind === 'phone') return k.toUpperCase();
    return ctl(ACT[k] || 'interact');
  }
  get keyA() { return this.keyName('a'); }
  // (the shared systems ask what a player presses: here, you)
  keyOf(p, k) { return k === 'm' ? this.heroKey() : this.keyName(k); }
  // the way to the Hero page: H on a keyboard; a gamepad has the menu, then its Hero tab
  heroKey() { return device() === 'pad' ? t('{start} → Hero', { start: ctl('menu') }) : device() === 'phone' ? t('Menu') : keyCap('KeyH'); }
  heroHint(line) { return t(line, { key: this.heroKey() }); }

  // swimming, boating or flying: the solo game's own actions wait
  afloat() { const m = this.me; return !!(m.swimming || m.vehicle); }

  // the hero carries their weapon out in the wild lands (and when gloom is close)
  armed() {
    const w = this.world, m = this.me;
    if (!this.big || w.mapId !== 'overworld' || w.cinematic || w.sail || w.fishing.active || w.player.riding || !m.fighter || m.swimming || m.vehicle || m.mount) return false;
    return this.outside() || this.gloomNear(10);
  }
  gloomNear(r) {
    const C = this.combat, p = this.me.pos;
    return !!(C && C.enemies.some((e) => e.alive && e.state !== 'sleep' && Math.hypot(e.x - p.x, e.z - p.z) < r));
  }

  // what's playing: the boss's tune, a battle, a race (null: the place's own music)
  get fightTrack() {
    const R = this.ring;
    if (R) return R.combat && R.combat.enemies.some((e) => e.alive && e.def.boss) ? 'boss' : R.stage === 'fight' ? 'battle' : 'festival';
    if (this.lairs && this.lairs.fight) return 'boss';
    if (this.events && this.events.invasion && this.events.invasion.phase === 'fight') return 'battle';
    if (this.races && this.races.race && this.races.race.phase === 'run') return 'race';
    return null;
  }

  // ------------------------------------------------------------------ frame
  // before the hero moves: inputs, boarding, mounts, vehicles
  update(dt) {
    if (!this.big) return;
    const w = this.world;
    this.t += dt;
    if (this.stage) this.stage.update(dt);
    this.me.input.off = w.busy > 0 || w.cinematic || w.menu.open || w.shop.open_ || w.dialogue.active || !!this.game.overlay;
    this.me.input.update();
    if (this.me.speechT > 0 && (this.me.speechT -= dt) <= 0) this.me.speech = null;
    const out = w.mapId === 'overworld';
    if (out && !this.me.input.off && !this.state.flags.wildIntro && this.outside() && !this.afloat() && !this.me.mount && !w.sail) { this.firstSteps(); return; }
    if (out && !this.me.input.off) {
      this.vehicles.handleInput();
      this.mounts.handleInput();
      if (this.camp) this.camp.handleInput();
      // A near a chest, a secret, a race, a wanderer, a waystone or the gong does that (not a swing)
      const inp = this.me.input, th = inp.pressed('a') && !this.me.mount && !this.afloat() ? this.nearThing(this.me) : null;
      if (th) { inp.edges.delete('a'); inp.edges.delete('interact'); this.doThing(th); }
      // walking up into a door goes in (like the valley's)
      const dr = !this.me.mount && !this.afloat() && this.doorNear(this.me);
      if (dr && this.game.input.down('up')) { this.doorPush = (this.doorPush || 0) + dt; if (this.doorPush > 0.18) { this.doorPush = 0; this.enterWild(dr); } }
      else this.doorPush = 0;
    }
    if (out) this.vehicles.update(dt);
    // gloom close by: you hop off your bicycle, weapon in hand
    if (out && w.player.riding && !this.me.input.off && this.gloomNear(5)) { w.toggleBike(); this.toast(t('You hop off your bicycle!')); }
    const C = this.combat;
    if (C) {
      if (this.armed()) C.preActors(dt);
      else if (this.me.fighter) { const a = this.world.player; if (!this.me.mount) a.speedMul = 1; a.lean = a.lean && !this.me.mount ? 0 : a.lean; this.me.frozen = !!this.me.taming; this.me.hidden = !!this.me.away; }
    }
    if (this.cam.shake > 0) this.cam.shake = Math.max(0, this.cam.shake - dt * 1.6);
    if (this.cam.flash > 0) this.cam.flash = Math.max(0, this.cam.flash - dt * 3);
  }

  // move the hero (swimming, riding, in a boat…); false = the solo game moves them as usual
  movePlayer(dt, input, col, frozen) {
    const me = this.me, a = this.world.player;
    if (!this.big || this.world.mapId !== 'overworld') return false;
    frozen = frozen || me.frozen;
    if (me.vehicle) { a.update(dt, input, col, true); return true; }
    if (this.swim && !frozen) this.swim.pre(me, dt);
    if (me.mount) this.mounts.pre(me);
    // (on foot, any water can be waded into — you start swimming there; mounts keep their own rules)
    a.update(dt, input, me.mount ? this.mounts.colFor(me) || col : this.swim ? this.swim.swimCol : col, frozen);
    if (this.swim) this.swim.post(me, dt);
    if (me.mount) this.mounts.post(me, dt);
    return true;
  }

  // after the hero moved: the world's systems
  afterMove(dt) {
    if (!this.big) return;
    const w = this.world, out = w.mapId === 'overworld';
    const frozen = w.busy > 0 || w.cinematic || w.dialogue.active || w.menu.open || w.shop.open_ || !!this.game.overlay;
    const C = this.combat, sdt = C && C.hitstop > 0 ? 0 : dt;
    if (this.mounts) this.mounts.update(sdt);
    if (this.dinos && out) this.dinos.update(sdt);
    if (this.buddies) this.buddies.update(sdt, frozen || !out);
    if (this.progress) this.progress.update(dt);
    this.rest(dt, frozen);
    // (these tidy themselves away indoors: travellers, races, events)
    if (!frozen) for (const S of [this.travel, this.secrets, this.races, this.events]) if (S) S.update(sdt);
    if (this.camp) this.camp.update(sdt, frozen || !out);
    this.updateNpcs(dt, out);
    // (fainting at 2 am in the middle of the waves: the Festival Ring lets you off)
    if (!out && this.ring) { this.ring.dispose(); this.act = this.facade; this.startCombat(); }
    if (!out) { this.calm(); return; }
    if (this.arena) this.arena.update(dt);
    const R = this.ring;
    if (R) { this.lastRing = R; R.update(sdt); if (R.overlay && R.overlay.kind === 'bless') this.pickBlessing(R); }
    if (!frozen) {
      if (this.encounters) this.encounters.update(sdt);
      if (this.lairs) this.lairs.update(sdt);
      if (this.rares) this.rares.update(sdt);
      if (this.chests) this.chests.update(dt);
    }
    if (this.zones && !w.cinematic) this.zones.update(dt);
    if (this.saga) this.saga.update(dt);
    // (frozen for a scene or a talk: the floating numbers and barks still fade away)
    if (C && !frozen) C.update(dt); else if (C) C.updateNums(dt);
    this.guardValley();
    w.player.model.root.visible = !this.me.hidden;
  }

  // the wild lands' folk: standing about, chatting, cheering in the stands
  updateNpcs(dt, out) {
    const w = this.world;
    for (const n of this.npcs) {
      n.model.root.visible = out && !n.hidden;
      if (!out) continue;
      n.baseY = n.seatY !== undefined ? n.seatY : w.groundY(n.pos);
      n.update(dt, this.npcWorld);
      if (n.bubbleT > 0 && (n.bubbleT -= dt) <= 0) { n.bubble = null; n.talking = false; }
    }
  }

  // between two waves at the Festival Ring: three blessings to choose from
  pickBlessing(R) {
    const c = R.cards.get(this.me.slot);
    if (!c || c.picked || c.asked) return;
    c.asked = true;
    const w = this.world;
    w.dialogue.choose('hollis', 'Well fought! A blessing from the Festival Ring — pick one:', c.cards.map((b) => `${t(BLESSINGS[b].name)} — ${t(BLESSINGS[b].desc)}`)).then((i) => {
      if (!c.picked && R.cards.get(this.me.slot) === c) R.grant(this.me, c.cards[Math.max(0, i)] || c.cards[0]);
    });
  }

  // out of a fight, the hero gets their breath back (quickly at home, slowly out there)
  rest(dt, frozen) {
    const f = this.me.fighter;
    if (!f || f.down || f.hp >= f.maxHp || frozen || f.hurtT > 0 || this.gloomNear(14)) { this.restT = 0; return; }
    this.restT = (this.restT || 0) + dt;
    if (this.restT > 4) f.hp = Math.min(f.maxHp, f.hp + f.maxHp * (this.outside() && this.world.mapId === 'overworld' ? 0.03 : 0.15) * dt);
  }

  // indoors: the camps & guardians settle down, the gloom wanders off
  calm() {
    const C = this.combat;
    if (!C || !C.enemies.length) return;
    if (this.encounters) for (const c of this.encounters.camps) if (c.foes.length) this.encounters.despawn(c);
    if (this.lairs) for (const L of this.lairs.list) if (L.state === 'fight') this.lairs.retreat(L, true);
    for (const e of C.enemies) if (e.alive || e.fading > 0) { e.alive = false; e.fading = 0; e.remove(); }
    C.enemies = [];
  }

  // a fight's on: E swings the weapon (the pet can wait for a cuddle)
  fighting() { return this.armed() && this.gloomNear(8); }
  // (and a boat, the balloon or your mount to hop on)
  busyHands() {
    const me = this.me;
    if (this.fighting() || this.ring || this.nearThing(me)) return true;
    if (!this.big || me.vehicle || me.mount) return false;
    if (this.camp && this.camp.near(me) && this.camp.canSleep()) return true;
    return !!((this.vehicles && this.vehicles.nearFor(me)) || (this.mounts && this.mounts.wantsA(me)));
  }

  // what's within reach (A does it instead of attacking)
  nearThing(p) {
    if (!this.big || this.world.mapId !== 'overworld' || (p.fighter && p.fighter.down) || this.busy) return null;
    const c = this.chests && this.chests.near(p);
    if (c) return { kind: 'chest', c, label: 'Open' };
    const dr = !p.mount && !p.vehicle && !p.swimming && this.doorNear(p);
    if (dr) return { kind: 'door', d: dr, label: 'Enter' };
    if (this.act !== this.facade) return null;
    const sg = this.saga && this.saga.nearThing(p);
    if (sg) return sg;
    // in the thick of a fight, A is for fighting
    if (this.gloomNear(7)) return null;
    const sec = (this.secrets && this.secrets.near(p)) || (this.races && this.races.near(p));
    if (sec) return sec;
    for (const n of this.npcs) {
      if (n.hidden || Math.hypot(n.pos.x - p.pos.x, n.pos.z - p.pos.z) >= 1.6) continue;
      if (n.shop) return { kind: 'npc', n, label: 'Trade' };
      if (n.wants && !this.gifted(n.id) && p.food === n.wants) return { kind: 'npc', n, label: 'Give' };
      return { kind: 'npc', n, label: 'Chat' };
    }
    const st = this.travel && this.travel.near(p);
    if (st) return { kind: 'stone', s: st, label: 'Travel' };
    if (this.arena && Math.hypot(GONG.x - p.pos.x, GONG.z - p.pos.z) < 1.8) return { kind: 'gong', label: 'Ring' };
    const dino = this.dinos && this.dinos.nearThing(p);
    if (dino) return dino;
    // out in the wild lands of an evening: a campfire (to warm up, and sleep by at night)
    const h = this.state.hour;
    if (this.camp && this.outside(p.pos.x, p.pos.z) && !(this.dungeons && this.dungeons.cur) && (h >= 17.5 || h < 6) && !p.vehicle && !p.mount && !p.swimming && !this.camp.near(p, 3.5) && !this.camp.why(p)) return { kind: 'camp', label: 'Light a campfire' };
    return null;
  }

  doThing(th) {
    const me = this.me;
    if (th.kind === 'chest') this.chests.open(th.c, me);
    else if (th.kind === 'secret') th.use(me);
    else if (th.kind === 'npc') this.chatNpc(th.n);
    else if (th.kind === 'stone') this.travel.use(me, th.s);
    else if (th.kind === 'gong') this.ringGong();
    else if (th.kind === 'camp') this.camp.build(me);
    else if (th.kind === 'door') this.enterWild(th.d);
    else if (th.kind === 'dino') this.dinos.pat(th.d, me);
  }

  // ------------------------------------------------------------------ the wild lands' rooms
  doorNear(p) {
    for (const d of this.doors || []) if (Math.abs(d.x - p.pos.x) < 0.75 && Math.abs(d.z - p.pos.z) < 0.7) return d;
    return null;
  }

  // in through a landmark's door (the valley's rooms do the rest; out by the same door)
  enterWild(d) {
    const w = this.world;
    if (this.me.mount || this.afloat()) return;
    this.state.roomExit = { x: d.x, z: d.z + 0.35 };
    w.run(() => w.enterRoom(d.room));
  }

  // a room's chest: something new in it every day
  async openRoomChest(f) {
    const w = this.world, s = this.state, key = w.mapId + '@' + (s.roomExit ? Math.round(s.roomExit.x) + ',' + Math.round(s.roomExit.z) : '');
    const opened = this.loadSave('roomChests', {});
    const e = f.entry;
    if (opened[key] === s.day) { await w.say(null, 'The chest is empty — something new turns up in it every day.'); return; }
    opened[key] = s.day; this.writeSave('roomChests', opened);
    audio.sfx('unlock');
    for (let i = 1; i <= 10; i++) { if (e && e.lid) e.lid.rotation.x = -1.25 * (i / 10); await w.wait(0.03); }
    if (e && e.shine) e.shine.visible = true;
    w.fx.emit('sparkle', f.x, 1.0, f.z, 18, { color: '#ffd66b' });
    const coins = 40 + Math.floor(Math.random() * 60);
    w.addCoins(coins);
    this.progress.give(this.me, false, 1);
    this.progress.addDust(this.me, 8);
    audio.jingle('shard');
    await w.say(null, 'Inside: {coins} coins, a little stardust — and something for your adventures!', null, { coins });
    if (e && e.lid) e.lid.rotation.x = 0;
    if (e && e.shine) e.shine.visible = false;
  }

  // sleeping by a campfire out in the wild lands: the night goes by like at home
  // (a new day, saved), and you wake up by the fire
  sleepHere() {
    const me = this.me, w = this.world, f = this.camp.near(me, 4);
    const at = f ? { x: f.x + 0.9, z: f.z + 0.8 } : { x: me.pos.x, z: me.pos.z };
    w.run(async () => { await w.sleep(false, at); this.camp.wakeAll(); for (const q of this.camp.list) this.camp.douse(q); });
  }

  gifted(id) { return !!this.loadSave('gifts', {})[id]; }

  // a chat with a wanderer (or a trade with Pim), in the dialogue box
  chatNpc(n) {
    const w = this.world, me = this.me, G = this.progress;
    n.talking = true; n.lookAt = me.pos; n.bubble = null;
    const met = this.loadSave('met', {});
    w.run(async () => {
      if (n.shop) {
        const pr = G.prof(me), price = SHOP_PRICE;
        if (pr.dust >= price) {
          const i = await w.ask(n.id, 'A mystery rune or charm for {n} ★? You have {have} ★.', ['Yes please!', 'Maybe later'], 1, { n: price, have: pr.dust });
          if (i === 0) {
            pr.dust -= price;
            audio.sfx('buy');
            w.fx.emit('sparkle', n.pos.x, 1.4, n.pos.z, 16, { color: '#ffe89a' });
            G.give(me, Math.random() < 0.35);
            await w.say(n.id, 'Pleasure doing business, {name}!', 'happy', { name: me.name });
          } else await w.say(n.id, 'I’ll be here. Well — somewhere!');
        } else await w.say(n.id, 'Stardust for a surprise? Bring me {n} ★! (you have {have})', null, { n: price, have: pr.dust });
      } else if (n.wants && !this.gifted(n.id) && me.food === n.wants) {
        // the treat they wished for: a present in return
        me.food = null;
        const gifts = this.loadSave('gifts', {});
        gifts[n.id] = true;
        this.writeSave('gifts', gifts);
        audio.jingle('friendUp');
        n.setEmote('heart', 2);
        w.fx.emit('heart', n.pos.x, 1.8, n.pos.z, 3);
        await w.say(n.id, 'For me? Oh, thank you, {name}! Take this, it’s yours.', 'happy', { name: me.name });
        G.give(me, true, 2); G.addDust(me, 40);
        this.toast(t('+{n} stardust', { n: 40 }));
      } else if (n.hello && !met[n.id]) {
        met[n.id] = true;
        this.writeSave('met', met);
        await w.say(n.id, n.hello);
        if (n.wants) await w.say(n.id, 'If you find {food}, bring it to me — I’d trade you something nice!', null, { food: t(FOODS[n.wants].a) });
      } else if (n.wants && !this.gifted(n.id) && Math.random() < 0.4) await w.say(n.id, 'If you find {food}, bring it to me — I’d trade you something nice!', null, { food: t(FOODS[n.wants].a) });
      else await w.say(n.id, n.tips[Math.floor(Math.random() * n.tips.length)]);
      n.talking = false;
    });
  }

  // ---- the Festival Ring: ring the gong for Gloom Waves
  async ringGong() {
    const w = this.world;
    if (this.gongBusy || !this.arena) return;
    this.gongBusy = true;
    this.arena.bong();
    this.me.setEmote('exclaim', 1.2);
    await w.run(async () => {
      const i = await w.ask('narrator', 'The gong booms across the steppe. Fight wave after wave of gloom at the Festival Ring?', ['Let’s go!', 'Not now'], 1);
      if (i === 0) this.toRing();
    });
    this.gongBusy = false;
  }

  toRing() {
    if (this.act !== this.facade) return;
    for (const c of this.encounters ? this.encounters.camps : []) if (c.foes.length) this.encounters.despawn(c);
    this.act = this.lastRing = new ArenaAct(this, { mode: 'waves', parent: this.facade });
    this.act.start();
  }

  // Party Mode's "back to exploring": out by the gong, a reward for the waves held
  async backFromRing() {
    const A = this.lastRing, w = this.world;
    this.startCombat();
    this.gatherAt(GONG.x + 0.4, GONG.z - 1.6);
    w.player.face(ARENA.x, ARENA.z);
    await this.fadeTo(0, 0.5);
    const held = A ? Math.max(0, A.wave - (A.won ? 0 : 1)) : 0;
    if (held > 0) {
      w.addCoins(held * 25);
      if (A.won) this.chests.drop(GONG.x + 1.5, GONG.z - 3, { rich: true, golden: true });
      this.showBanner(A.won ? t('Champion of the Festival Ring!') : t('Waves held: {n}', { n: held }), A.won ? t('a golden chest by the gong') : t('+{n} coins from the crowd', { n: held * 25 }));
    } else this.showBanner(t('Back to exploring'), '');
  }

  // the gloom never follows you far into the valley
  guardValley() {
    const C = this.combat;
    if (!C) return;
    for (const e of C.enemies) {
      if (!e.alive || e.def.boss || (e.camp && e.camp.saga) || e.saga) continue;
      if (e.x > VALLEY.x0 + 6 && e.x < VALLEY.x1 - 6 && e.z > VALLEY.z0 + 6 && e.z < VALLEY.z1 - 6) {
        e.alive = false; e.fading = 0; e.remove();
        this.world.fx.emit('smoke', e.x, 0.5, e.z, 8, { color: '#6a4a8e' });
      }
    }
  }

  // everyone's napping (it's only you): wake up somewhere safe
  async nap() {
    if (this.napping) return;
    this.napping = true;
    const w = this.world, C = this.combat;
    w.busy++;
    this.showBanner(t('You took a little nap…'), t('the gloom lost interest and wandered off'));
    await this.wait(2);
    await this.fadeTo(1, 0.6);
    const L = this.lairs && this.lairs.fight;
    if (L) this.lairs.retreat(L, true);
    const home = this.safeSpot();
    for (const e of C.enemies) if (e.alive && Math.hypot(e.x - this.me.pos.x, e.z - this.me.pos.z) < 30) { e.alive = false; e.fading = 0; e.remove(); }
    if (this.me.mount) this.mounts.dismount(this.me, true);
    w.player.pos = { x: home.x, z: home.z };
    const f = this.me.fighter;
    f.st = null; f.knock = null; f.roll = null; f.act = null; f.dash = null;
    C.comboState = null;
    C.revive(this.me, 1, null);
    w.snapCamera();
    await this.wait(0.3);
    await this.fadeTo(0, 0.6);
    w.busy--;
    this.napping = false;
    this.toast(t('You wake up at {place}, good as new', { place: t(home.name) }));
  }

  // the nearest attuned waystone (or the Market Plaza's)
  safeSpot() {
    const p = this.me.pos, T = this.travel;
    const stones = T ? T.attuned() : [];
    let best = null, bd = 1e9;
    for (const s of stones) { const d = Math.hypot(s.x - p.x, s.z - p.z); if (d < bd) { bd = d; best = s; } }
    if (best) { const L = best.land || T.openNear(best.x, best.z, 2.2, 9); return { x: L.x, z: L.z, name: best.name }; }
    return { x: 95.5, z: 73.5, name: 'Market Plaza' };
  }

  // what's inside a chest out here: gear, stardust, coins, a snack
  onChestOpen(c, p) {
    const C = this.combat;
    if (C) {
      for (let i = 0; i < (c.golden ? 40 : 14); i++) C.drop('dust', c.x, c.z);
      C.drop(Math.random() < 0.6 ? 'tart' : 'coffee', c.x, c.z);
    }
    // (coins show up in their own toast)
    this.world.addCoins(c.golden ? 120 + Math.floor(Math.random() * 60) : c.rich ? 60 + Math.floor(Math.random() * 40) : 20 + Math.floor(Math.random() * 25));
    if (this.progress) this.progress.chestLoot(c, p);
  }

  // stream the ground in around the camera (after the camera moved)
  stream(dt) {
    if (!this.big || this.world.mapId !== 'overworld') return;
    this.view.sync();
    this.cam.ppu = this.world.ppu;
    this.big.update(dt, [this.view], this.cam.ppu, this.world.t);
  }

  // the zone's music & ambience while out in the wild lands (null in the valley)
  mood() {
    if (!this.zones || this.world.mapId !== 'overworld' || !this.outside()) return null;
    return this.zones.mood();
  }

  // what the hero holds: nothing while swimming, riding or in a boat (undefined = the solo game decides)
  propFor() {
    const m = this.me;
    if (m.swimming || m.vehicle || m.mount) return null;
    if (m.mallow) return 'marshmallow';     // (by a campfire: camp.js)
    if (this.armed()) return m.fighter.down ? null : m.fighter.prop || m.fighter.cls.weapon;
    return undefined;
  }

  // the pet waits on the shore while you swim or sail
  petAway() { return this.afloat(); }

  // treasure from the bottom of the sea goes in your bag
  onDiveFind(p, spot) {
    const w = this.world;
    w.fx.emit('sparkle', p.pos.x, 1.2, p.pos.z, 18, { color: spot.loot === 'relic' ? '#ffd66b' : '#dff4ff' });
    audio.sfx(spot.loot === 'relic' ? 'shard' : 'pickup', { volume: 0.7 });
    w.giveItem(DIVE_ITEM[spot.loot] || 'shell', 1);
    p.setEmote('star', 1.6);
    const s = this.state, dv = this.loadSave('dives', null);
    const taken = dv && dv.day === s.day ? dv.taken : [];
    taken.push(spot.i);
    this.writeSave('dives', { day: s.day, taken });
  }

  // ------------------------------------------------------------------ what the buttons do (the chips)
  ctx() {
    const me = this.me, w = this.world;
    if (!this.big || w.mapId !== 'overworld' || me.input.off) return null;
    const vc = this.vehicles && this.vehicles.ctxFor(me);
    let c = null;
    if (me.vehicle && vc) c = { ...vc, x: null };
    else if (me.swimming) c = vc && vc.a ? { ...this.swim.ctxFor(me), a: vc.a, hint: vc.hint, vars: vc.vars } : this.swim.ctxFor(me);
    else if (vc && vc.a && !w.focus) c = { a: vc.a, hint: vc.hint, vars: vc.vars };
    if (!me.vehicle && !me.swimming && this.mounts) c = this.mounts.ctxFor(me, c || {}) || c;
    // something within reach, a race, an event, the Festival Ring… and the fight itself
    const f = me.fighter;
    const th = !me.vehicle && !me.swimming && !me.mount ? this.nearThing(me) : null;
    const R = this.ring, rc = R ? R.ctxFor(me) : null;
    const race = !R && ((this.races && this.races.ctxFor(me)) || (this.events && this.events.ctxFor(me)));
    const sh = !R && this.secrets && this.secrets.hint(me);
    if (th) c = { ...(c || {}), a: th.label, hint: th.hint || '', vars: th.vars };
    else if (rc) c = { ...(c || {}), a: rc.a, hint: rc.hint, x: f && !f.down && f.cd <= 0 && R.stage === 'fight' ? f.cls.special.name : null, y: R.stage === 'fight' ? 'Dodge' : null };
    else if (this.armed() && f && !f.down && this.gloomNear(12)) {
      const near = this.gloomNear(9);
      c = { ...(c || {}), a: (c && c.a) || (near ? (f.charging ? 'Release!' : 'Attack') : null), x: f.cd > 0 ? null : f.cls.special.name, y: near ? 'Dodge' : (c && c.y), hint: (c && c.hint) || 'Tap A to attack, hold A to charge, X for your special' };
    }
    if (race && !th) c = { ...(c || {}), hint: race.hint, vars: race.vars };
    else if (sh && !th && !(c && c.hint)) c = { ...(c || {}), hint: sh };
    // a campfire close by: Sleep (at night) — or Wake up
    if (this.camp) { const cc = this.camp.ctxFor(me, c || {}); if (cc && (cc.a === 'Sleep' || cc.a === 'Wake up' || me.sleeping)) c = cc; }
    if (!c) return null;
    // the solo game's own prompt (E Talk…) wins over a generic one
    if (w.focus && !me.vehicle && !me.swimming) c = { ...c, a: null };
    return c;
  }

  // ------------------------------------------------------------------ drawing
  // tree crowns thin out in front of the hero (and the gloom) — see render/seethrough.js
  fillSee() {
    const S = SEE.spots.value, w = this.world, ppu = w.ppu, H = this.r3d.h;
    let n = 0;
    const add = (x, y, z, r) => {
      if (n >= SEE_MAX) return;
      const q = this.view.project(x, y, z);
      if (q.x < -30 || q.x > this.r3d.w + 30 || q.y < -30 || q.y > H + 30) return;
      S[n++].set(q.x, H - q.y, q.z * 0.5 + 0.5, r * ppu);
    };
    if (w.mapId === 'overworld' && w.player && !w.cinematic) {
      const a = w.player;
      add(a.pos.x, 0.85 + (a.baseY || 0) + (a.jumpY || 0), a.pos.z, 1.15);
      const C = this.combat;
      if (C) for (const e of C.enemies) if (e.alive && !e.under) add(e.x, (e.y || 0) + (e.def.h || 1) * 0.5, e.z, (e.r || 0.4) + 0.5);
    }
    SEE.count.value = n;
  }

  // world layer: the zone's colour wash & weather, glinting dive spots
  drawWorld(wctx, dt) {
    if (!this.big || this.world.mapId !== 'overworld') return;
    this.view.sync();
    if (this.swim) this.swim.drawSpots(wctx, this.view, this.t);
    if (this.zones) this.zones.drawView(wctx, this.view, dt);
    if (this.cam.flash > 0) { wctx.fillStyle = `rgba(255,248,230,${this.cam.flash * 0.35})`; wctx.fillRect(0, 0, this.r3d.w, this.r3d.h); }
  }

  // UI layer: labels over the world, what the buttons do
  drawUi(ctx) {
    const w = this.world;
    if (!this.big || w.mapId !== 'overworld') return;
    const v = this.view;
    const quiet = w.dialogue.active || w.menu.open || w.shop.open_ || w.cinematic;
    if (this.combat) this.combat.drawLabels(ctx, v);
    if (this.arena) this.arena.drawLabels(ctx, v);
    if (this.ring) this.ring.drawLabels(ctx, v);
    this.drawFolk(ctx, v, quiet);
    if (!quiet && this.saga) this.saga.drawLabels(ctx, v);
    if (!quiet && this.dungeons) this.dungeons.drawLabels(ctx, v);
    if (!quiet) {
      if (this.races) this.races.drawLabels(ctx, v);
      // an arrow to the next race flag (or the attacked waystone)
      if (!this.ring) (this.races && this.races.drawArrows(ctx, v)) || (this.events && this.events.drawArrows(ctx, v));
      if (this.chests) this.chests.drawPrompts(ctx, v, this.keyA);
      if (this.mounts) this.mounts.drawLabels(ctx, v);
      if (this.vehicles) this.vehicles.drawLabels(ctx, v, this, drawText);
      if (this.me.speech) { const u = w.toUi(this.me.pos.x, 1.72 + (w.player.baseY || 0), this.me.pos.z); bubble(ctx, u.x, u.y - 6, this.me.speech); }
    }
    if (this.combat && !w.menu.open) this.combat.drawUi(ctx);
    if (!w.menu.open) {
      if (this.races) this.races.drawUi(ctx);
      if (this.events) this.events.drawUi(ctx);
      if (this.ring) this.ring.drawUi(ctx);
      if (this.saga && !quiet) this.saga.games.drawUi(ctx, w.display.w, w.display.h);
    }
  }

  // names, emotes & chit-chat over the wild lands' folk
  drawFolk(ctx, v, quiet) {
    const w = this.world, me = this.me.pos;
    for (const n of this.npcs) {
      if (n.hidden) continue;
      const u = w.toUi(n.pos.x, (n.def.kid ? 1.35 : 1.6) + (n.baseY || 0) + (n.jumpY || 0), n.pos.z);
      if (n.emoteKind) emote(ctx, u.x, u.y - 2, n.emoteKind, this.t);
      else if (n.bubble) bubble(ctx, u.x, u.y - 4, n.bubble);
      else if (!quiet && n.seatY === undefined && Math.hypot(me.x - n.pos.x, me.z - n.pos.z) < 3) {
        const nm = t(n.def.short), tw = measure(nm) + 6;
        ctx.fillStyle = 'rgba(30,20,36,0.6)';
        ctx.fillRect(Math.round(u.x - tw / 2), Math.round(u.y - 12), tw, 10);
        drawText(ctx, nm, u.x, u.y - 11, { color: '#fff7e6', align: 'center' });
      }
    }
  }

  // the hero's health, level & special under the clock (out in the wild, or hurt)
  // (`minimal`: the HUD's smallest display — only while hurt or in a fight)
  drawHero(ctx, x, y, minimal = false) {
    const f = this.me.fighter, w = this.world;
    if (!f || !this.big || w.mapId !== 'overworld' || w.cinematic || (!this.armed() && f.hp >= f.maxHp)) return 0;
    if (minimal && f.hp >= f.maxHp && !this.fighting()) return 0;
    const pw = 78, ph = 23, bx = x + 20, bw = pw - 25;
    panel(ctx, x, y, pw, ph);
    drawClassIcon(ctx, f.clsId, x + 5, y + 5);
    // health (it blinks when it's low)
    const k = Math.max(0, f.hp / f.maxHp), low = k < 0.3 && Math.floor(this.t * 4) % 2 === 0;
    ctx.fillStyle = '#3b2a2e'; ctx.fillRect(bx, y + 4, bw, 6);
    ctx.fillStyle = '#7a3442'; ctx.fillRect(bx + 1, y + 5, bw - 2, 4);
    ctx.fillStyle = low ? '#ffd0d8' : '#ec5f73'; ctx.fillRect(bx + 1, y + 5, Math.round((bw - 2) * k), 4);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(bx + 1, y + 5, Math.round((bw - 2) * k), 1);
    // the special's gauge (in the hero's colour once it's ready), and the level
    const full = (f.moves ? f.moves.special.cd : f.cls.special.cd) * (f.mods.cdr || 1), g = f.cd > 0 ? Math.max(0, 1 - f.cd / full) : 1;
    ctx.fillStyle = '#3b2a2e'; ctx.fillRect(bx, y + 13, 26, 5);
    ctx.fillStyle = g >= 1 ? f.cls.color : '#8a7aa0'; ctx.fillRect(bx + 1, y + 14, Math.round(24 * g), 3);
    if (g >= 1 && Math.floor(this.t * 3) % 3 === 0) { ctx.fillStyle = '#fff7e6'; ctx.fillRect(bx + 1 + Math.floor(this.t * 20) % 24, y + 14, 2, 1); }
    drawText(ctx, t('Lv.{n}', { n: f.level }), x + pw - 5, y + 11, { color: UI.inkSoft, align: 'right' });
    return ph + 3;
  }

  // "[E] Row  [Space] Get out  [F] Dash" above the hotbar (and the tip), and a short hint
  // a WoW-like action bar over the hotbar while you fight: attack, heavy, special, dodge (with
  // their keys and cooldowns); returns where the things above it should stop (or `bottom`)
  drawActionBar(ctx, bottom, avoid = null) {
    const w = this.world, f = this.me.fighter;
    this.barShown = false;
    if (!this.big || !f || f.down || w.mapId !== 'overworld' || w.dialogue.active || w.menu.open || w.shop.open_ || w.cinematic || !this.armed()) return bottom;
    if (this.me.kind === 'phone' || this.game.input.touchMode) return bottom;
    if (w.hud.mode() === 'minimal' && !this.fighting()) return bottom;    // (the smallest display: only in a fight)
    const cls = f.cls, I = cls.icons || {}, M = f.moves || cls;
    const specFull = (M.special ? M.special.cd : cls.special.cd) * (f.mods.cdr || 1), rollFull = 0.7 * (f.mods.rollCd || 1);
    const slots = [
      { icon: I.light, key: this.keyName('a'), glow: false },
      { icon: I.heavy, key: this.keyName('a') + '+', glow: f.charging },
      { icon: I.special, key: this.keyName('x'), cd: f.cd > 0 ? f.cd / specFull : 0 },
      { icon: DODGE_ICON, key: this.keyName('y'), cd: f.rollCd > 0 ? f.rollCd / rollFull : 0 },
    ];
    if (f.ultId) slots.push({ icon: ULTS[f.ultId].icon, key: this.keyName('u'), cd: f.ult < 100 ? 1 - f.ult / 100 : 0, glow: f.ult >= 100, ult: true });
    const W = this.display.w, gap = 4, bw = slots.length * (18 + gap) - gap;
    let x0 = Math.round(W / 2 - bw / 2);
    const y0 = Math.min(bottom, this.display.h - 38) - 22;
    // (beside the toasts when they reach this far)
    if (avoid && x0 - 4 < avoid.x1 && y0 + 20 > avoid.y0) x0 = Math.min(W - bw - 6, avoid.x1 + 8);
    ctx.fillStyle = 'rgba(20,14,28,0.55)'; ctx.fillRect(x0 - 3, y0 - 3, bw + 6, 24);
    slots.forEach((s, i) => {
      const x = x0 + i * (18 + gap);
      drawIcon(ctx, s.icon, x, y0, { cd: s.cd || 0, glow: s.glow, t: this.t });
      // the key in the corner (like a keybind on WoW's bar; a gamepad's round button)
      if (isFace(s.key) && device() === 'pad') { faceGlyph(ctx, x + 15, y0 + 15, s.key); return; }
      const kw = measure(s.key) + 3;
      ctx.fillStyle = 'rgba(20,14,28,0.85)'; ctx.fillRect(x + 18 - kw, y0 + 10, kw, 9);
      drawText(ctx, s.key, x + 18 - kw / 2, y0 + 11, { color: '#fff3c4', align: 'center' });
    });
    this.barShown = true;
    return y0 - 5;
  }

  drawChips(ctx, bottom, avoid = null) {
    const w = this.world;
    if (!this.big || w.mapId !== 'overworld' || w.dialogue.active || w.menu.open || w.shop.open_ || w.cinematic) return;
    const c = this.ctx();
    if (!c || this.game.input.touchMode || this.me.kind === 'phone') return;
    const W = this.display.w, H = this.display.h;
    const items = [];
    // (the action bar already shows the fight's buttons)
    const FIGHT = new Set(['Attack', 'Release!', 'Dodge', this.me.fighter && this.me.fighter.cls.special.name]);
    for (const k of ['a', 'b', 'x', 'y']) if (c[k] && !(this.barShown && FIGHT.has(c[k]))) items.push({ key: this.keyName(k), label: t(c[k]) });
    const hk = c.hint && (SOLO_HINTS[c.hint] || c.hint);
    const hint = hk && !NAMES_BUTTONS.test(hk) ? t(hk, c.vars) : '';
    if (!items.length && !hint) return;
    const face = (it) => isFace(it.key) && device() === 'pad';
    const cw = (it) => (face(it) ? 13 : measure(it.key) + 6) + measure(it.label) + 10;
    const rowW = items.reduce((a, it) => a + cw(it), 0) - 4;
    const lines = hint ? wrap(hint, Math.min(W - 40, 300)) : [];
    const pw = Math.max(rowW, ...lines.map((l) => measure(l))) + 14, ph = (items.length ? 14 : 0) + lines.length * 10 + 6;
    let px = Math.round(W / 2 - pw / 2), py = Math.min(H - 38, bottom) - ph;
    // (out of the toasts' way: beside them if there's room, else above)
    if (avoid && px < avoid.x1 + 4 && py + ph > avoid.y0 - 2) {
      if (avoid.x1 + 8 + pw <= W - 4) px = avoid.x1 + 8;
      else py = Math.min(py, avoid.y0 - 4 - ph);
    }
    const cx = px + pw / 2;
    ctx.fillStyle = 'rgba(30,20,40,0.78)'; ctx.fillRect(px, py, pw, ph);
    let x = Math.round(cx - rowW / 2), y = py + 4;
    if (items.length) {
      for (const it of items) {
        const kw = face(it) ? 13 : measure(it.key) + 6;
        if (face(it)) faceGlyph(ctx, x + 6, y + 4, it.key);
        else {
          ctx.fillStyle = '#fff3c4'; ctx.fillRect(x, y - 1, kw, 11);
          ctx.fillStyle = '#5a3b2a'; ctx.fillRect(x, y + 9, kw, 1);
          drawText(ctx, it.key, x + kw / 2, y, { color: '#3b2a2e', align: 'center' });
        }
        drawText(ctx, it.label, x + kw + 3, y, { color: '#fff7e6' });
        x += cw(it);
      }
      y += 14;
    }
    lines.forEach((l, i) => drawText(ctx, l, cx, y + i * 10, { color: '#f6d38f', align: 'center' }));
  }

  // the world map's marks: camps, lairs, waystones, secrets, races, events, the Festival Ring
  mapMarks(out = []) {
    if (this.arena) out.push({ k: 'arena', x: ARENA.x, z: ARENA.z, name: t('Festival Ring'), st: t('Ring the gong to fight there') });
    return out;
  }
  drawMapMarks(ctx, M) { drawMarks(ctx, M, collectMarks(this), this.t); }
}
