// The main gameplay scene: maps & doors, player/pet/villagers, camera, clock,
// weather, interactions, tools, UI overlays and the helpers story scripts use.

import { THREE, toon } from '../render/r3d.js';
import { World3D } from '../world/world3d.js';
import { Interior3D, INTERIORS } from '../world/interiors.js';
import '../world/wildrooms.js';
import { Collision, findUnstuck, stuckAt } from '../world/collision.js';
import { TT, TINFO } from '../world/tiles.js';
import { buildOverworld, BUILDINGS, POINTS, areaAt, shoreY, OX, OZ, FERRY, LAKE, FROST, BLOSSOM, MAPLE, KOI_POND } from '../world/overworld.js';
import { KOI } from '../models/props.js';
import { Player, Npc, Pet } from '../entities/actors.js';
import { NPCS, NPC_ORDER } from '../data/npcs.js';
import { ITEMS, CROPS } from '../data/items.js';
import { Story, PAGE_SPOTS, PICK_SPOT, BOTTLE_SPOTS } from '../story/story.js';
import { Farm } from '../systems/farm.js';
import { Forage } from '../systems/forage.js';
import { Fishing } from '../systems/fishing.js';
import { Fx } from '../systems/fx.js';
import { Critters, SPECIES } from '../systems/critters.js';
import { PROJECTS, PROJECT_POINTS } from '../systems/projects.js';
import { applyHomeLevel } from '../world/interiors.js';
import { Hud, dayLabel } from '../ui/hud.js';
import { Menu } from '../ui/menu.js';
import { Shop, SHOPS } from '../ui/shop.js';
import { emote as drawEmote, keyHint, tag, bubble, UI, keyCap, ctl, button, device } from '../ui/ui.js';
import { StuckWatch, nearWater } from '../entities/stuck.js';
import { drawText, measure } from '../engine/font.js';
import { addItem, removeItem, countItem, hasItem, saveGame, DAY_START, DAY_END, HOTBAR, fogReveal } from '../state.js';
import { audio } from '../engine/audio.js';
import { clamp, lerp, wait as sleepMs } from '../engine/util.js';
import { t, tn, num } from '../i18n.js';
import { Wild } from '../solo/wild.js';
import { SEE } from '../render/seethrough.js';
import { chimneySmoke } from '../models/buildings.js';

const MINUTES_PER_SEC = 1.6; // game minutes per real second (≈12.5 real minutes per day)

export class World {
  constructor(game) {
    this.game = game;
    this.r3d = game.r3d;
    this.display = game.display;
    this.input = game.input;
    this.lighting = game.lighting;
    this.settings = game.settings;
    this.dialogue = game.dialogue;
    this.hud = new Hud(this);
    this.fx = new Fx(this);
    this.story = new Story(this);
    this.menu = new Menu(this);
    this.shop = new Shop(this);
    this.maps = {};
    this.npcs = [];
    this.cam = { x: 0, z: 0 };
    this.camTarget = null;
    this.fadeA = 0;
    this.fadeTarget = 0;
    this.fadeSpeed = 2;
    this.t = 0;
    this.busy = 0;          // >0 while a script runs
    this.cinematic = false;
    this.hideHud = false;
    this.playerEmoteKind = null;
    this.playerEmoteT = 0;
    this.lastArea = null;
    this.stepT = 0;
    this.ambientT = 0;
    this.drawText = drawText;
  }

  get state() { return this.game.state; }
  get mapId() { return this.player ? this.player.map : 'overworld'; }
  get portraits() { return this.game.portraits; }

  // ------------------------------------------------------------------ setup
  async build(onProgress = () => {}) {
    const r3d = this.r3d;
    this.mapData = buildOverworld();
    this.over = await new World3D(r3d, this.mapData, this.lighting).build((p) => onProgress(p * 0.9));
    const m = this.mapData;
    const bz = this.over.bridgeSpan.z0;
    this.bridgeTiles = new Set(this.over.bridgeSpan.tiles.flatMap((x) => [x + ',' + bz, x + ',' + (bz + 1)]));
    const walk = (x, z) => {
      if (x < 0 || z < 0 || x >= m.w || z >= m.h) return false;
      const t = m.ground[z * m.w + x];
      if (t === TT.WATER) return this.state && this.state.flags.bridgeFixed && this.bridgeTiles.has(x + ',' + z);
      // the face of a rock plateau: only paths (little stairs) climb it
      const above = z > 0 ? m.ground[(z - 1) * m.w + x] : -1;
      if (t !== TT.ROCK && t !== TT.HILL && t !== TT.PATH && (above === TT.ROCK || above === TT.HILL)) return false;
      return TINFO[t].walk;
    };
    this.overCol = new Collision(m.w, m.h, walk, this.over.colliders);
    this.maps.overworld = { id: 'overworld', root: this.over.root, collision: this.overCol, kind: 'overworld' };
    this.farm = new Farm(this, m);
    this.over.root.add(this.farm.root);
    this.forage = new Forage(this, m);
    this.over.root.add(this.forage.root);
    this.forage.setupFireflies(r3d, this.lighting.glowTex);
    this.fishing = new Fishing(this);
    this.critters = new Critters(this).build();
    this.critters.onSpot = (kind) => this.spotCritter(kind);
    this.over.root.add(this.critters.root);
    this.hud.buildMinimap(m, this.over);
    this.trees = m.objects.filter((o) => ['oak', 'pine', 'cherry', 'apple', 'palm', 'maple', 'snowpine'].includes(o.type));
    // lighthouse beam (visible once restored)
    const beamGeo = new THREE.ConeGeometry(3.2, 26, 16, 1, true);
    beamGeo.translate(0, -13, 0);
    beamGeo.rotateZ(Math.PI / 2);
    this.beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xffe8a0, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    const lh = this.over.lighthouseLamp;
    this.beam.position.set(lh.lampPos.x, lh.lampPos.y, lh.lampPos.z);
    this.beam.visible = false;
    this.over.root.add(this.beam);
    // drifting cloud shadows (ground only): a smooth, tiling density map,
    // thresholded & Bayer-dithered per world pixel so the edges stay crisp at
    // any map size
    this.cloudTex = makeCloudTexture();
    const cm = new THREE.ShaderMaterial({
      uniforms: { map: { value: this.cloudTex }, drift: { value: new THREE.Vector2() }, opacity: { value: 1 } },
      vertexShader: /* glsl */`
        varying vec2 vW;
        void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */`
        uniform sampler2D map; uniform vec2 drift; uniform float opacity;
        varying vec2 vW;
        float bayer2(vec2 a){ a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
        float bayer4(vec2 a){ return bayer2(0.5 * a) * 0.25 + bayer2(a); }
        void main(){
          float v = texture2D(map, vW / ${CLOUD_SPAN.toFixed(1)} + drift).r;
          float d = bayer4(floor(vW * 16.0));
          float a = v > 0.64 + d * 0.05 ? 48.0 : v > 0.58 + d * 0.05 ? 26.0 : 0.0;
          if (a <= 0.0) discard;
          gl_FragColor = vec4(30.0 / 255.0, 26.0 / 255.0, 60.0 / 255.0, a / 255.0 * opacity);
        }`,
      transparent: true, depthWrite: false,
    });
    this.clouds = new THREE.Mesh(new THREE.PlaneGeometry(m.w + 20, m.h + 20), cm);
    this.clouds.rotation.x = -Math.PI / 2;
    this.clouds.position.set(m.w / 2, 0.03, m.h / 2);
    this.clouds.renderOrder = 2;
    this.over.root.add(this.clouds);
    // butterflies (drawn in 2D, positions in 3D)
    this.butterflies = [];
    const bspots = [[62, 63], [124, 62], [128, 70], [132, 80], [91, 72], [104, 76], [122, 74], [74, 84], [56, 84],
      [20, 60], [34, 60], [8, 76], [156, 80], [166, 84], [150, 60], [138, 36], [160, 30], [120, 50], [92, 46], [62, 26]];
    for (let i = 0; i < 30; i++) {
      const [x, z] = bspots[i % bspots.length];
      this.butterflies.push({ hx: x + (Math.random() - 0.5) * 6, hz: z + (Math.random() - 0.5) * 4, x, z, y: 0.8, ph: Math.random() * 10, col: ['#fff3a6', '#f4a4b6', '#9fd0f5', '#ffffff', '#f0934a'][i % 5] });
    }
    // festival decorations group
    this.festival = new THREE.Group();
    this.festival.visible = false;
    this.over.root.add(this.festival);
    this.buildFestival();
    // bees buzzing around the hives (2D dots, like the butterflies)
    this.bees = [];
    for (const h of this.over.hives) for (let i = 0; i < 4; i++) this.bees.push({ hx: h.x, hz: h.z, ph: Math.random() * 10, x: h.x, y: 0.8, z: h.z });
    onProgress(1);
  }

  interiorFor(id) {
    if (this.maps[id]) return this.maps[id];
    const def = INTERIORS[id];
    if (!def) return null;
    const extra = id === 'home' ? this.homeFurniture() : [];
    const room = new Interior3D(this.r3d, id, def, id === 'home' ? { wall: this.state.house.wall, floor: this.state.house.floor } : {}).build(extra);
    if (id === 'grotto' && this.state.flags.treasureFound) {
      const chest = room.furniture.find((f) => f.def.type === 'chest');
      if (chest && chest.lid) { chest.lid.rotation.x = -1.25; chest.shine.visible = true; }
    }
    const col = new Collision(def.w, def.d, (x, z) => x >= 0 && z >= 0 && x < def.w && z < def.d, room.colliders);
    const entry = { id, root: room.root, collision: col, kind: 'interior', room, def };
    this.maps[id] = entry;
    return entry;
  }

  homeFurniture() {
    return this.state.house.furniture.map((f) => ({ ...ITEM_FURN(f.id), x: f.x, z: f.z, rot: f.rot || 0, placed: f }));
  }

  collisionFor(map) { const m = this.maps[map] || (map !== 'overworld' ? this.interiorFor(map) : null); return m ? m.collision : null; }

  // Start playing with the given (new or loaded) state
  enter(isNew) {
    const s = this.state;
    this.player = new Player(this.r3d, s.player.look);
    this.r3d.scene.add(this.player.model.root);
    this.pet = new Pet(this.r3d, s.player.pet);
    this.r3d.scene.add(this.pet.model.root);
    // hop! sounds, a puff of dust, and friends who hop along
    this.player.onJump = () => {
      if (this.wild && this.wild.zones && this.mapId === 'overworld' && this.wild.zones.onJump(this.wild.me)) return;
      audio.sfx('jump', { volume: 0.7 });
      this.fx.emit('dust', this.player.pos.x, 0.05, this.player.pos.z + 0.1, 3);
      if (this.pet.map === this.player.map && Math.hypot(this.pet.pos.x - this.player.pos.x, this.pet.pos.z - this.player.pos.z) < 3) this.pet.hop(0.14);
      for (const n of this.npcs) {
        if (n.map !== this.mapId || n.hidden || n.talking || !n.def.kid) continue;
        if (Math.hypot(n.pos.x - this.player.pos.x, n.pos.z - this.player.pos.z) < 3.5) { n.hop(0.18); if (Math.random() < 0.3) n.setEmote('note', 1.2); }
      }
    };
    this.player.onLand = () => {
      const pp = this.player.pos;
      audio.sfx('land', { volume: 0.55 });
      const tile = this.mapId === 'overworld' ? this.tileAt(pp.x, pp.z) : -1;
      this.fx.emit('dust', pp.x, 0.05, pp.z + 0.1, 4, { color: tile === TT.SNOW ? '#ffffff' : undefined });
      // cannonball into a leaf pile!
      for (const lp of (this.mapId === 'overworld' && this.over.leafpiles) || []) {
        if (Math.hypot(lp.x - pp.x, lp.z - pp.z) < 0.85) {
          this.fx.emit('burst', lp.x, 0.3, lp.z, 22);
          audio.sfx('whoosh', { volume: 0.5 });
          lp.squash = 1;
          const s = this.state;
          if (s.flags.leafDay !== s.day) { s.flags.leafDay = s.day; s.flags.leafJumps = 0; }
          s.flags.leafJumps = (s.flags.leafJumps || 0) + 1;
          if (s.flags.leafJumps === 3) this.hud.toast(t('Wheee! Maple Hollow approves.'), null, '#d9853a');
        }
      }
      // (a knight's belly flop out in the wild)
      if (this.wild && this.wild.combat && this.mapId === 'overworld') this.wild.combat.onLand(this.wild.me);
    };
    for (const id of [...NPC_ORDER, 'merchant']) {
      const n = new Npc(this.r3d, id);
      this.npcs.push(n);
      this.r3d.scene.add(n.model.root);
    }
    if (s.flags.bridgeFixed) this.over.setBridge(true);
    if (s.flags.shardsPlaced) this.beam.visible = true;
    // the valley opens onto Party Mode's wild lands
    this.wild = new Wild(this);
    this.wild.start();
    this.rebuildHome();
    this.applyProjects(false);
    this.placeFerry();
    this.over.millSpeed = s.flags.millFixed ? 0.55 : 0;
    this.forage.spawnDay(s.day, this.trees);
    this.spawnStoryPickups();
    this.farm.refreshAll();
    this.berryState();
    this.setMap(s.player.map, s.player.x, s.player.z, true);
    this.player.dir = { x: Math.sin(s.player.facing || 0), z: Math.cos(s.player.facing || 0) };
    this.pet.pos = { x: this.player.pos.x - 0.8, z: this.player.pos.z + 0.4 };
    this.placeNpcsNow();
    this.snapCamera();
    this.updateWeatherFx(true);
    this.savedAt = performance.now(); this.autoT = 0; this.saveSoon = false;
    if (isNew) {
      this.fadeA = 1; this.fadeTarget = 1;
      this.run(() => this.story.intro());
    } else {
      this.fadeA = 1; this.fadeTarget = 0;
      this.hud.showBanner(dayLabel(s.day), t('Welcome back'));
    }
    this.updateMusic(true);
  }

  // ------------------------------------------------------------------ maps
  setMap(id, x, z, instant = false) {
    const prev = this.player ? this.player.map : null;
    for (const m of Object.values(this.maps)) m.root.visible = false;
    const m = id === 'overworld' ? this.maps.overworld : this.interiorFor(id);
    m.root.visible = true;
    this.player.map = id;
    this.player.pos = { x, z };
    this.pet.map = id;
    this.pet.pos = { x: x - 0.7, z: z + 0.3 };
    this.fishing.cancel();
    this.forage.ffGroup.visible = false;
    this.beam.visible = id === 'overworld' && !!this.state.flags.shardsPlaced;
    // lighting sources for this map
    this.lighting.clear();
    if (id === 'overworld') {
      for (const b of Object.values(this.over.buildings)) {
        for (const mm of b.glowMats) this.lighting.glowMats.push(mm);
        for (const l of b.lights) this.lighting.addSource(l);
      }
      for (const p of this.over.props) for (const l of p.lights) this.lighting.addSource(l);
      this.lighting.lampMats = this.overLampMats || (this.overLampMats = collectLampMats(this.over.root));
      this.lighting.indoor = null;
      if (this.wild) this.wild.relight();
    } else {
      for (const l of m.room.lights) this.lighting.addSource(l);
      this.lighting.indoor = m.room;
    }
    if (this.handLight) this.lighting.sources.push(this.handLight);
    if (id !== 'overworld' && this.player.riding) { this.player.riding = false; this.player.model.setBike(false); }
    this.snapCamera();
    if (!instant && prev !== id) this.story.onEnterMap(id);
    this.updateMusic();
    this.updateNpcVisibility();
  }

  doorAt(tx, tz) {
    // overworld: building door tiles
    for (const b of BUILDINGS) {
      if (tx === b.door && tz === b.y + b.h - 1) return b;
    }
    return null;
  }

  async enterBuilding(b) {
    const s = this.state;
    if (b.id === 'home' && !hasItem(s, 'key_home') && !s.flags.homeOpen) { this.hud.toast(t('It’s locked. Mayor Hollis has the key.')); return; }
    if (b.id === 'lighthouse' && !s.flags.bridgeFixed) { this.hud.toast(t('The lighthouse door is locked tight.')); return; }
    const def = INTERIORS[b.id];
    if (!def) { this.hud.toast(t('The door is locked.')); return; }
    if (!['home', 'lighthouse', 'shack', 'barn', 'windmill'].includes(b.id) && (s.hour >= 22 || s.hour < 7)) {
      this.hud.toast(t('{place} is closed for the night. (Open 7am–10pm)', { place: t(def.name) }));
      return;
    }
    if (b.id === 'home') s.flags.homeOpen = true;
    await this.enterRoom(b.id);
  }

  async enterRoom(id) {
    const def = INTERIORS[id];
    audio.sfx('door');
    await this.fade(1, 0.22);
    this.setMap(id, def.door + 0.5, def.d - 0.55);
    this.player.dir = { x: 0, z: -1 };
    this.player.model.facing = this.player.model.targetFacing = Math.PI;
    this.hud.showBanner(t(def.name));
    await this.fade(0, 0.25);
  }

  async exitBuilding() {
    const id = this.mapId;
    const b = BUILDINGS.find((x) => x.id === id);
    // (a wild land's room goes back out of the door you came in by)
    const out = b ? { x: b.door + 0.5, z: b.y + b.h + 0.45 } : INTERIORS[id].wild ? this.state.roomExit || { x: 95.5, z: 72.5 } : INTERIORS[id].exitTo;
    audio.sfx('door');
    await this.fade(1, 0.22);
    this.setMap('overworld', out.x, out.z);
    this.player.dir = { x: 0, z: 1 };
    this.player.model.facing = this.player.model.targetFacing = 0;
    await this.fade(0, 0.25);
  }

  // ------------------------------------------------------------------ npcs
  scheduleFor(n) {
    const o = this.story.override(n.id);
    if (o) return o;
    const s = this.state;
    const sched = (n.def.scheduleAfterBridge && s.flags.bridgeFixed) ? n.def.scheduleAfterBridge : n.def.schedule;
    let cur = sched[sched.length - 1];
    for (const e of sched) if (s.hour >= e[0]) cur = e;
    if (s.hour < sched[0][0]) cur = sched[sched.length - 1];
    let [, map, spot] = cur;
    // Finn spends his evenings at the beach bonfire once it exists
    if (n.id === 'finn' && map === 'cafe' && (s.flags.projects || []).includes('bonfire') && s.hour < 21) { map = 'overworld'; spot = 'bonfire'; }
    // rainy days: outdoor folks head indoors
    if (s.weather === 'rain' && map === 'overworld' && !['finn', 'pip', 'marlo'].includes(n.id) && !n.def.outdoors) { map = n.def.home; spot = 'home'; }
    let x, z;
    if (map === 'overworld' && spot === 'ferryHelm') {
      // Marlo waits on the dock beside wherever the ferry is moored
      const f = s.flags.ferryAt === 'island' ? FERRY.island : FERRY.village;
      [x, z] = s.flags.ferryAt === 'island' ? [f.standX, f.standZ + 1.5] : [f.standX + 0.2, f.standZ - 1.1];
    } else if (map === 'overworld') {
      const pj = s.flags.projects || [];
      if (spot === 'plazaW' && n.id === 'pip' && pj.includes('playground')) [x, z] = PROJECT_POINTS.playground;
      else if (spot === 'guitar' && pj.includes('bandstand')) [x, z] = PROJECT_POINTS.bandstand;
      else if (spot === 'bonfire') [x, z] = PROJECT_POINTS.bonfire;
      else [x, z] = POINTS[spot] || POINTS.plaza;
    }
    else [x, z] = (INTERIORS[map].spots[spot] || [2, 2]);
    const ACT = {
      pierEnd: 'fish', sawing: 'saw', gardenS: 'garden', benchW: 'bench', benchE: 'bench', riverbank: 'river', beachE: 'sketch', fountainS: n.id === 'pip' ? 'play' : 'stroll', beachW: n.id === 'pip' ? 'play' : 'stroll', plazaW: n.id === 'pip' ? 'play' : 'stroll', plazaE: 'stroll', plazaN: 'stroll', bridgeW: 'river',
      farmStand: 'stand', merchantSpot: 'stand', fields: 'farm', barnYard: 'feed', campfire: 'campfire', bonfire: 'campfire', camp: 'ranger', lakeShore: 'lookout', ferryHelm: 'captain', islandBeach: 'stroll', tentDoor: 'sleep', shrine: 'pray',
    };
    const FACES = { farmStand: { x: 0, z: 1 }, merchantSpot: { x: 0, z: 1 }, ferryHelm: { x: 0, z: 1 }, lakeShore: { x: 0, z: -1 }, shrine: { x: 0, z: -1 } };
    return { map, x, z, spot, act: ACT[spot] || spot, hide: spot === 'tentDoor', face: map === 'overworld' ? FACES[spot] || null : { x: 0, z: 1 } };
  }

  placeNpcsNow() {
    for (const n of this.npcs) {
      const t = this.scheduleFor(n);
      n.map = t.map; n.pos = { x: t.x, z: t.z }; n.target = t; n.path = null; n.activity = t.act;
      n.restDir = t.face || { x: 0, z: 1 };
      n.pendingTransfer = null;
    }
    this.updateNpcVisibility();
  }

  npcResume(id) { const n = this.npcById(id); if (n) { n.scripted = false; n.talking = false; n.lookAt = null; } }

  routeNpc(n, t) {
    n.target = t;
    n.activity = null;
    const isle = (x, z) => x > 144 && z > 100;
    const onIsle = (map, x, z) => map === 'marlo' || (map === 'overworld' && isle(x, z));
    // the island isn't reachable on foot: Marlo takes her dinghy
    if (onIsle(n.map, n.pos.x, n.pos.z) !== onIsle(t.map, t.x, t.z)) {
      n.map = t.map; n.pos = { x: t.x, z: t.z }; n.path = null; n.activity = t.act; n.restDir = t.face;
      this.updateNpcVisibility();
      return;
    }
    if (n.map === t.map) {
      const col = this.collisionFor(n.map);
      n.path = col.path(n.pos.x, n.pos.z, t.x, t.z) || [[t.x, t.z]];
      return;
    }
    // different map: walk to the exit door first
    if (n.map !== 'overworld') {
      const def = INTERIORS[n.map];
      const col = this.collisionFor(n.map);
      n.path = col.path(n.pos.x, n.pos.z, def.door + 0.5, def.d - 0.3) || [[def.door + 0.5, def.d - 0.3]];
      const b = BUILDINGS.find((x) => x.id === n.map);
      n.pendingTransfer = { map: 'overworld', x: b.door + 0.5, z: b.y + b.h + 0.4 };
    } else {
      const b = BUILDINGS.find((x) => x.id === t.map);
      const dx = b.door + 0.5, dz = b.y + b.h + 0.4;
      n.path = this.overCol.path(n.pos.x, n.pos.z, dx, dz) || [[dx, dz]];
      const def = INTERIORS[t.map];
      n.pendingTransfer = { map: t.map, x: def.door + 0.5, z: def.d - 0.4 };
    }
  }

  transferNpc(n, map, x, z) {
    n.map = map; n.pos = { x, z };
    this.updateNpcVisibility();
    if (n.target) this.routeNpc(n, n.target);
  }

  updateNpcs(dt) {
    for (const n of this.npcs) {
      if (!n.talking && !n.scripted) {
        const t = this.scheduleFor(n);
        const tgt = n.target;
        const changed = !tgt || tgt.map !== t.map || Math.abs(tgt.x - t.x) > 0.01 || Math.abs(tgt.z - t.z) > 0.01;
        if (changed) {
          // off-screen teleport if far & not visible to the player
          const visible = n.map === this.mapId;
          if (!visible && t.map !== this.mapId) { n.map = t.map; n.pos = { x: t.x, z: t.z }; n.target = t; n.path = null; n.activity = t.act; n.restDir = t.face; }
          else this.routeNpc(n, t);
        }
      }
      n.update(dt, this);
      // Juniper turns in to her tent at night; Pim only visits on Sundays
      n.hidden = !!(n.target && n.target.hide && n.map === 'overworld' && (!n.path || !n.path.length) && Math.hypot(n.pos.x - n.target.x, n.pos.z - n.target.z) < 0.4);
      if (n.def.visitor) n.hidden = !this.marketDay();
    }
    this.updateNpcVisibility();
  }

  updateNpcVisibility() {
    for (const n of this.npcs) n.model.root.visible = n.map === this.mapId && !n.hidden;
  }

  npcById(id) { return this.npcs.find((n) => n.id === id); }
  marketDay() { const s = this.state; return (s.day - 1) % 7 === 6 && s.hour >= 9 && s.hour < 18; }
  npcDef(id) { return NPCS[id]; }

  npcTarget(id) {
    const n = this.npcById(id);
    if (!n) return null;
    if (n.map === this.mapId) return { map: n.map, x: n.pos.x, z: n.pos.z };
    if (n.map !== 'overworld' && this.mapId === 'overworld') {
      const b = BUILDINGS.find((x) => x.id === n.map);
      return { map: 'overworld', x: b.door + 0.5, z: b.y + b.h + 0.5 };
    }
    if (this.mapId !== 'overworld') {
      const def = INTERIORS[this.mapId];
      return { map: this.mapId, x: def.door + 0.5, z: def.d - 0.2 };
    }
    return null;
  }

  // ------------------------------------------------------------------ time
  advanceTime(dt) {
    const s = this.state;
    const speed = MINUTES_PER_SEC * (this.settings.daySpeed || 1);
    const before = s.hour;
    s.hour += (dt * speed) / 60;
    // (no night falls on you in a dungeon: its clock waits at the edge of the night)
    const W = this.wild, deep = W && W.dungeons && W.dungeons.heroIn(W.me);
    if (deep && s.hour >= DAY_END - 0.05) { s.hour = DAY_END - 0.05; return; }
    if (before < 24 && s.hour >= 24) this.hud.toast(t('It’s getting very late…'), null, '#c8454f');
    if (s.hour >= DAY_END) this.run(() => this.passOut());
  }

  async sleep(passedOut = false, wakeAt = 'home') {
    const s = this.state;
    this.busy++;
    audio.jingle('sleep');
    await this.fade(1, 0.8);
    this.hideHud = true;
    // day summary
    const earned = this.shipOvernight();
    const nextDay = s.day + 1;
    s.day = nextDay;
    s.hour = DAY_START;
    s.weather = s.tomorrowWeather || 'sun';
    s.tomorrowWeather = this.rollWeather(nextDay + 1);
    this.farm.grow(s.weather === 'rain');
    this.berryState(true);
    this.forage.spawnDay(s.day, this.trees);
    this.forage.resetFireflies();
    this.spawnStoryPickups();
    this.story.onNewDay();
    if (s.flags.bridgeFixed && !this.over.bridgeFixed) this.over.setBridge(true);
    s.board = null;
    // the ferry is back at the village pier every morning
    s.flags.ferryAt = 'village';
    this.placeFerry();
    // wake at home (or in the tent at Whisperwood Camp)
    // (a campfire out in the wild lands passes its spot: { x, z })
    const wake = wakeAt === 'tent' ? ['overworld', POINTS.tentDoor[0], POINTS.tentDoor[1]] : wakeAt && typeof wakeAt === 'object' ? ['overworld', wakeAt.x, wakeAt.z] : ['home', 2.6, 3.4];
    this.setMap(wake[0], wake[1], wake[2], true);
    this.player.dir = { x: 0, z: 1 };
    this.placeNpcsNow();
    this.updateWeatherFx(true);
    this.game.summary = { day: nextDay, earned, passedOut, weather: s.weather, tent: wakeAt === 'tent' || (!!wakeAt && typeof wakeAt === 'object') };
    s.player.map = wake[0]; s.player.x = wake[1]; s.player.z = wake[2];
    this.hud.saving(saveGame(s));
    await this.game.showSummary();
    this.hideHud = false;
    await this.fade(0, 0.8);
    this.hud.showBanner(dayLabel(s.day), t(s.weather === 'rain' ? 'A rainy day' : s.weather === 'cloudy' ? 'A cloudy day' : 'A sunny day'));
    audio.jingle('newDay');
    this.updateMusic(true);
    this.busy--;
    await this.story.onWake();
  }

  async passOut() {
    if (this.sleeping) return;
    this.sleeping = true;
    await this.say(null, 'You’re so sleepy… your eyes are closing…');
    // (out in the wild lands: you wake by the nearest waystone, not back home across the sea)
    const W = this.wild, pp = this.player.pos;
    const far = W && W.big && this.mapId === 'overworld' && !W.big.inValley(pp.x, pp.z) ? W.safeSpot() : null;
    await this.sleep(true, far ? { x: far.x, z: far.z } : 'home');
    this.sleeping = false;
  }

  rollWeather(day) {
    const r = Math.abs(Math.sin(day * 12.9898) * 43758.5453) % 1;
    if (day <= 2) return 'sun';
    return r < 0.62 ? 'sun' : r < 0.8 ? 'cloudy' : 'rain';
  }

  shipOvernight() {
    const s = this.state;
    let total = 0;
    for (const { id, qty } of s.shipping) total += (ITEMS[id].sell || 0) * qty;
    s.shipping = [];
    if (total) { s.coins += total; s.stats.earned += total; }
    return total;
  }

  // ------------------------------------------------------------------ helpers for scripts
  run(fn) {
    this.busy++;
    const p = (async () => {
      try { await fn(); }
      catch (e) { console.error(e); }
      finally { this.busy = Math.max(0, this.busy - 1); }
    })();
    return p;
  }

  say(who, text, expr, vars) { return this.dialogue.say(who, text, { expr, vars }); }
  ask(who, text, options, cancel, vars) { return this.dialogue.choose(who, text, options, { cancel, vars }); }
  letter(title, text, sign, vars) { return this.dialogue.showLetter(title, text, sign, vars); }
  wait(sec) { return new Promise((res) => { this.waits = this.waits || []; this.waits.push({ t: sec, res }); }); }

  fade(to, dur = 0.4) {
    if (this.fadeA === to && this.fadeTarget === to) return Promise.resolve();   // (already there)
    if (this.fadeRes) { const r = this.fadeRes; this.fadeRes = null; r(); }
    this.fadeTarget = to;
    this.fadeSpeed = 1 / Math.max(0.05, dur);
    return new Promise((res) => { this.fadeRes = res; });
  }

  async npcWalk(id, x, z) {
    const n = this.npcById(id);
    n.scripted = true;
    const col = this.collisionFor(n.map);
    n.path = col.path(n.pos.x, n.pos.z, x, z) || [[x, z]];
    n.target = { map: n.map, x, z };
    while (n.path && n.path.length) await this.wait(0.05);
    n.lookAt = this.player.pos;
    n.talking = true;
  }

  emoteNpc(id, kind) {
    const n = this.npcById(id);
    if (n) n.setEmote(kind, 2);
  }

  playerEmote(kind, t = 1.5) { this.playerEmoteKind = kind; this.playerEmoteT = t; }

  fxHeartAt(id) {
    const n = this.npcById(id);
    if (n && n.map === this.mapId) this.fx.emit('heart', n.pos.x, 1.7, n.pos.z, 2);
  }

  heldItem() { return this.state.bag[this.state.hot]; }

  giveItem(id, qty = 1, opts = {}) {
    const left = addItem(this.state, id, qty);
    if (left > 0) {
      this.hud.toast(t('Your bag is full!'), null, '#c8454f');
      return false;
    }
    if (!opts.quiet) this.hud.toast(t('+{n} {item}', { n: qty, item: ITEMS[id] ? t(ITEMS[id].name) : id }), id);
    if (!opts.silent) audio.sfx('pickup');
    this.story.check();
    return true;
  }

  takeItem(id, qty = 1) { const ok = removeItem(this.state, id, qty); if (ok) this.story.check(); return ok; }

  addCoins(n) {
    this.state.coins = Math.max(0, this.state.coins + n);
    if (n > 0) { this.state.stats.earned += n; audio.sfx('coin'); }
    if (n) this.hud.toast(t('{n}¢', { n: `${n > 0 ? '+' : ''}${num(n)}` }), 'coin', n > 0 ? '#b8862a' : '#8a5234');
  }

  // (World v7: the saga's quest leads, unless the journal picked another one)
  sagaPick() {
    const S = this.wild && this.wild.saga, pick = this.state.flags.pick;
    if (!S) return null;
    if (pick && pick.startsWith('saga:') && S.active(pick.slice(5))) return pick.slice(5);
    if (pick && !pick.startsWith('saga:') && this.state.quests[pick] && !this.state.quests[pick].done) return null;
    return S.tracked();
  }
  questTarget() {
    const S = this.wild && this.wild.saga, q = this.sagaPick();
    if (q) { const tg = S.targetOf(q); return tg ? { map: 'overworld', x: tg.x, z: tg.z } : null; }
    return this.story.target();
  }
  trackedQuest() {
    const S = this.wild && this.wild.saga, q = this.sagaPick();
    if (q) { const o = S.objective(q); if (o) return { id: 'saga:' + o.id, title: o.title, objective: o.lines[0], objectiveLines: o.lines, step: { obj: () => o.lines } }; }
    return this.story.tracked();
  }

  portraitOf(who, expr) {
    if (who === 'player') return this.portraits.get('player', this.state.player.look, expr);
    const d = NPCS[who];
    return this.portraits.get(who, d.look, expr, d.scale || (d.kid ? 0.86 : 1));
  }

  onSpeak(who, talking) {
    if (who === 'player') { this.player.expr = talking ? 'talk' : null; return; }
    const n = this.npcById(who);
    if (n) n.speaking = talking;
  }

  shopOpenFor(npc) {
    const d = npc.def;
    if (!d.shop) return null;
    const [open, close] = d.shopHours;
    const h = this.state.hour;
    const atStand = d.shopSpot && npc.map === 'overworld' && npc.target && npc.target.spot === d.shopSpot && (!npc.path || !npc.path.length);
    const atCounter = npc.map === d.home || (d.shop === 'fish' && npc.map === 'shack') || atStand;
    if (h >= open && h < close && atCounter) return { shop: d.shop, label: SHOPS[d.shop].label };
    return null;
  }

  openShop(id, npc) { this.shop.open(id, npc); }

  spawnStoryPickups() {
    const s = this.state;
    if (this.story.q('mabel_pages')) this.spawnPages();
    if (this.story.active('sol_pick')) this.spawnPick();
    if (this.story.active('marlo_bottles') && this.story.stepOf('marlo_bottles') === 0) this.spawnBottles();
  }

  spawnBottles() {
    const s = this.state;
    for (const b of BOTTLE_SPOTS) {
      if (s.forage.taken[b.key] || this.forage.items.find((i) => i.key === b.key)) continue;
      this.forage.add('bottle', b.x, b.z, b.key, { story: true });
    }
  }

  spawnPages() {
    const s = this.state;
    for (const p of PAGE_SPOTS) {
      if (s.forage.taken[p.key]) continue;
      if (this.forage.items.find((i) => i.key === p.key)) continue;
      this.forage.add('page', p.x, p.z, p.key, { story: true, glowNight: true });
    }
  }

  spawnPick() {
    const s = this.state;
    if (s.forage.taken[PICK_SPOT.key] || this.forage.items.find((i) => i.key === PICK_SPOT.key)) return;
    const it = this.forage.add('shell', PICK_SPOT.x, PICK_SPOT.z, PICK_SPOT.key, { story: true });
    if (it) it.giveId = 'pick';
  }

  berryState(newDay = false) {
    const s = this.state;
    s.flags.berries = s.flags.berries || {};
    for (const b of this.over.berryBushes) {
      const k = Math.round(b.obj.x * 10) + ',' + Math.round(b.obj.y * 10);
      let st = s.flags.berries[k];
      if (newDay && st && st.picked && s.day - st.picked >= 2) { delete s.flags.berries[k]; st = null; }
      for (const m of b.berries) m.visible = !st;
      b.key = k;
    }
  }

  // ------------------------------------------------------------------ interaction
  findInteraction() {
    const p = this.player, s = this.state;
    const fp = p.facingPoint;
    const map = this.mapId;
    let best = null, bestD = 1.35;
    const consider = (d, obj) => { if (d < bestD) { bestD = d; best = obj; } };
    // villagers
    for (const n of this.npcs) {
      if (n.map !== map || n.hidden) continue;
      const counter = n.activity && ((map !== 'overworld' && ['counter', 'desk'].includes(n.activity)) || n.activity === 'stand');
      const d = Math.hypot(n.pos.x - fp.x, n.pos.z - fp.z) - (counter ? 1.2 : 0);
      consider(d, { kind: 'npc', npc: n, label: 'Talk', x: n.pos.x, z: n.pos.z, y: n.def.kid ? 1.5 : 1.7 });
    }
    if (map === 'overworld') {
      // doors
      const tx = Math.floor(fp.x), tz = Math.floor(fp.z);
      const b = this.doorAt(tx, tz) || this.doorAt(Math.floor(p.pos.x), Math.floor(p.pos.z) - 1);
      if (b && p.dir.z < -0.3) consider(0.2, { kind: 'door', b, label: INTERIOR_LABEL(b), x: b.door + 0.5, z: b.y + b.h - 0.2, y: 1.6 });
      // props
      for (const it of this.over.interactables) {
        const d = Math.hypot(it.x - fp.x, it.z - fp.z) - (PROP_REACH[it.kind] || 0);
        consider(d, { kind: 'prop', prop: it, label: PROP_LABEL[it.kind] || 'Look', x: it.x, z: it.z, y: PROP_Y[it.kind] || 1.2 });
      }
      // berry bushes
      for (const bb of this.over.berryBushes) {
        if (s.flags.berries && s.flags.berries[bb.key]) continue;
        const d = Math.hypot(bb.obj.x - fp.x, bb.obj.y - fp.z) - 0.35;
        consider(d, { kind: 'berries', bush: bb, label: 'Pick berries', x: bb.obj.x, z: bb.obj.y, y: 0.9 });
      }
      // forage items
      const it = this.forage.nearest(fp.x, fp.z, 0.9);
      if (it) consider(Math.hypot(it.x - fp.x, it.z - fp.z), { kind: 'forage', item: it, label: 'Pick up', x: it.x, z: it.z, y: 0.5 });
      // fireflies (a net anywhere in the bag: nothing to pick first)
      const held = this.heldItem();
      if (hasItem(s, 'net')) {
        const f = this.forage.nearestFirefly(fp.x, fp.z, 1.4);
        if (f) consider(0.3, { kind: 'firefly', ff: f, label: 'Catch', x: f.x, z: f.z, y: f.y + 0.3 });
      }
      // garden (the seeds or the can don't have to be in hand: facing the soil says what's to do —
      // the seeds in hand first, else the first ones in the bag)
      const ptx = Math.floor(fp.x), ptz = Math.floor(fp.z);
      if (this.farm.isSoil(ptx, ptz)) {
        const plot = this.farm.plot(ptx, ptz), isSeed = (x) => x && ITEMS[x.id] && ITEMS[x.id].cat === 'seed';
        const seed = isSeed(held) ? held.id : (s.bag.find(isSeed) || {}).id;
        if (plot && this.farm.ready(plot)) consider(0.25, { kind: 'harvest', tx: ptx, tz: ptz, label: 'Harvest', x: ptx + 0.5, z: ptz + 0.5, y: 0.8 });
        else if (seed && !plot) consider(0.3, { kind: 'plant', seed, tx: ptx, tz: ptz, label: 'Plant', x: ptx + 0.5, z: ptz + 0.5, y: 0.5 });
        else if (plot && !plot.watered && hasItem(s, 'can')) consider(0.3, { kind: 'water', tx: ptx, tz: ptz, label: 'Water', x: ptx + 0.5, z: ptz + 0.5, y: 0.5 });
      }
      // fishing (the rod anywhere in the bag, when nothing else is in reach)
      if (hasItem(s, 'rod') && !best) {
        const w = this.waterAhead();
        if (w) consider(0.5, { kind: 'fish', target: w, label: 'Cast', x: w.x, z: w.z, y: 0.3 });
      }
      // festival lantern
      if (this.story.active('festival') && this.story.stepOf('festival') === 2 && Math.hypot(p.pos.x - (OX + 47), p.pos.z - (OZ + 65.2)) < 1.6) consider(0.1, { kind: 'lantern', label: 'Release lantern', x: OX + 47, z: OZ + 65.8, y: 1.2 });
    }
    if (map !== 'overworld') {
      const room = this.maps[map].room;
      const def = INTERIORS[map];
      for (const it of room.interactables) {
        const d = Math.hypot(it.x - fp.x, it.z - fp.z) - (it.kind === 'bed' ? 0.6 : it.kind === 'lens' ? 0.9 : 0.2);
        consider(d, { kind: 'furn', furn: it, label: FURN_LABEL[it.kind] || 'Look', x: it.x, z: it.z, y: it.kind === 'bed' ? 0.9 : 1.3 });
      }
      // placing furniture at home
      const held = this.heldItem();
      if (map === 'home' && held && ITEMS[held.id] && ITEMS[held.id].cat === 'furniture') {
        const spot = this.placeSpot();
        if (spot) consider(0.05, { kind: 'place', spot, label: 'Place', x: spot.x, z: spot.z, y: 0.8 });
      }
      if (map === 'home' && held && ITEMS[held.id] && ITEMS[held.id].cat === 'decor') consider(0.05, { kind: 'decor', label: ITEMS[held.id].wall ? 'Apply wallpaper' : 'Apply flooring', x: p.pos.x, z: p.pos.z, y: 1.8 });
      // exit
      if (p.pos.z > def.d - 0.9 && Math.abs(p.pos.x - (def.door + 0.5)) < 0.8 && p.dir.z > 0.3) consider(0.2, { kind: 'exit', label: 'Leave', x: def.door + 0.5, z: def.d, y: 0.8 });
    }
    // the pet (it follows at your heels: a cuddle only when there's nothing else within reach)
    if (this.pet.map === map && !best) consider(Math.hypot(this.pet.pos.x - fp.x, this.pet.pos.z - fp.z) + 0.15, { kind: 'pet', label: 'Pet', x: this.pet.pos.x, z: this.pet.pos.z, y: 0.9 });
    return best;
  }

  waterAhead() {
    const p = this.player;
    for (const dist of [1.6, 2.2, 1.1]) {
      const x = p.pos.x + p.dir.x * dist, z = p.pos.z + p.dir.z * dist;
      const tx = Math.floor(x), tz = Math.floor(z);
      const m = this.mapData;
      if (tx < 0 || tz < 0 || tx >= m.w || tz >= m.h) continue;
      if (m.ground[tz * m.w + tx] === TT.WATER && !(this.state.flags.bridgeFixed && this.bridgeTiles.has(tx + ',' + tz))) return { x, z };
    }
    return null;
  }

  placeSpot() {
    const p = this.player, def = INTERIORS.home;
    const x = Math.floor(p.pos.x + p.dir.x * 1.1) + 0.5, z = Math.floor(p.pos.z + p.dir.z * 1.1) + 0.5;
    if (x < 0.5 || z < 1 || x > def.w - 0.5 || z > def.d - 1) return null;
    const col = this.maps.home.collision;
    if (col.blocked(x, z, 0.4)) return null;
    return { x, z };
  }

  async doInteraction(it) {
    const s = this.state, p = this.player;
    switch (it.kind) {
      case 'npc': {
        const n = it.npc;
        n.talking = true;
        n.lookAt = p.pos;
        p.face(n.pos.x, n.pos.z);
        await this.story.talk(n);
        n.talking = false;
        n.speaking = false;
        break;
      }
      case 'pet': {
        this.pet.happyT = 2;
        this.pet.setEmote('heart', 1.6);
        audio.sfx(s.player.pet.kind === 'dog' ? 'woof' : s.player.pet.kind === 'bunny' ? 'squeak' : 'meow');
        this.fx.emit('heart', this.pet.pos.x, 0.9, this.pet.pos.z, 2);
        if (s.flags.petDay !== s.day) { s.flags.petDay = s.day; this.hud.toast(t('{pet} loves you!', { pet: s.player.pet.name }), null, '#ec5f73'); }
        break;
      }
      case 'door': await this.enterBuilding(it.b); break;
      case 'exit': await this.exitBuilding(); break;
      case 'prop': await this.useProp(it.prop); break;
      case 'furn': await this.useFurniture(it.furn); break;
      case 'berries': {
        s.flags.berries[it.bush.key] = { picked: s.day };
        for (const m of it.bush.berries) m.visible = false;
        const n = 2 + (s.day % 2);
        this.giveItem('berry', n);
        this.fx.emit('sparkle', it.x, 0.7, it.z, 6, { color: '#e97d8f' });
        audio.sfx('harvest');
        break;
      }
      case 'forage': this.pickup(it.item); break;
      case 'firefly': {
        it.ff.caught = true;
        this.giveItem('firefly', 1);
        audio.sfx('firefly');
        this.fx.emit('sparkle', it.ff.x, it.ff.y, it.ff.z, 8, { color: '#d8ff7a' });
        break;
      }
      case 'plant': {
        const id = it.seed;
        if (!ITEMS[id] || !hasItem(s, id)) break;
        const crop = ITEMS[id].crop;
        this.takeItem(id, 1);
        this.farm.plant(it.tx, it.tz, crop);
        this.fx.emit('soil', it.x, 0.1, it.z, 6);
        audio.sfx('plant');
        p.lock = 0.25;
        this.story.onPlant();
        break;
      }
      case 'water': {
        const big = s.flags.canUpgrade;
        const tiles = [[it.tx, it.tz]];
        if (big) { const dx = Math.round(p.dir.x), dz = Math.round(p.dir.z); tiles.push([it.tx + dz, it.tz + dx], [it.tx - dz, it.tz - dx]); }
        for (const [tx, tz] of tiles) if (this.farm.plot(tx, tz)) { this.farm.water(tx, tz); this.fx.emit('water', tx + 0.5, 0.5, tz + 0.5, 8); }
        audio.sfx('water');
        p.lock = 0.45;
        this.lastAction = 'water';
        break;
      }
      case 'harvest': {
        const id = this.farm.harvest(it.tx, it.tz);
        if (id) {
          this.giveItem(id, 1);
          s.stats.crops++;
          s.collection[id] = (s.collection[id] || 0) + 1;
          this.fx.emit('sparkle', it.x, 0.6, it.z, 10);
          audio.sfx('harvest');
        }
        break;
      }
      case 'fish': this.fishing.cast(it.target); p.face(it.target.x, it.target.z); break;
      case 'place': this.placeFurniture(it.spot); break;
      case 'decor': this.applyDecor(); break;
      case 'lantern': await this.story.festivalFinale(); break;
      default: break;
    }
  }

  pickup(item) {
    const id = item.giveId || item.id;
    if (!this.giveItem(id, 1)) return;
    this.forage.remove(item);
    this.fx.emit('sparkle', item.x, 0.4, item.z, 6);
    this.state.collection[id] = (this.state.collection[id] || 0) + 1;
    this.story.onPickup(id);
  }

  async useProp(prop) {
    const s = this.state;
    switch (prop.kind) {
      case 'sign': await this.say(null, 'The sign reads: "{text}"', undefined, { text: t(prop.text) }); break;
      case 'mailbox': {
        if (s.mail.length) {
          const m = s.mail.shift();
          if (this.over.props) this.mailFlag(false);
          if (!m.parcel) await this.letter(m.title, m.text, m.sign, m.vars);
          if (m.item) {
            const d = ITEMS[m.item];
            if (d && d.cat === 'clothes') {
              const [slot, v] = d.unlock;
              if (!s.unlocked[slot].includes(v)) s.unlocked[slot].push(v);
              audio.jingle('purchase');
              this.hud.toast(t('New outfit: {item}! Try it on at your wardrobe.', { item: t(d.name) }), null, '#8a5234');
            } else {
              // (a full bag: what doesn't fit waits in the mailbox as a parcel)
              const n = m.qty || 1, left = addItem(s, m.item, n);
              if (left < n) { this.hud.toast(t('+{n} {item}', { n: n - left, item: ITEMS[m.item] ? t(ITEMS[m.item].name) : m.item }), m.item); audio.sfx('pickup'); }
              if (left) {
                s.mail.unshift({ item: m.item, qty: left, parcel: true });
                if (this.over.props) this.mailFlag(true);
                this.hud.toast(t('Your bag is full — the parcel waits in the mailbox.'), null, '#c8454f');
              }
            }
          }
          const more = s.mail.filter((x) => !x.parcel).length;
          if (more) this.hud.toast(tn('{n} more letter waiting', '{n} more letters waiting', more));
        } else await this.say(null, 'Your mailbox is empty. Nana writes every now and then.');
        break;
      }
      case 'shipping': await this.game.openShipping(); break;
      case 'board': await this.story.readBoard(); break;
      case 'fountain': {
        if (s.flags.wishDay === s.day) { await this.say(null, 'The fountain burbles happily. One wish a day is plenty.'); break; }
        const pick = await this.ask(null, 'Toss a coin into the fountain and make a wish?', ['Make a wish (1¢)', 'Not now'], 1);
        if (pick === 0 && s.coins > 0) {
          s.flags.wishDay = s.day;
          this.addCoins(-1);
          audio.sfx('splash', { volume: 0.4 });
          this.fx.emit('sparkle', prop.x, 1.4, prop.z, 12);
          await this.say(null, ['You wish for good harvests. The water sparkles.', 'You wish for your friends to be happy. A warm breeze answers.', 'You wish for Nana to be safe on her travels. You feel she heard you.'][s.day % 3]);
          if (s.day % 5 === 0) { this.giveItem('seaglass', 1); }
        }
        break;
      }
      case 'well': await this.say(null, 'You peer into the old well. Something down there glints… probably just the moon.'); break;
      case 'ferry': await this.ferryRide(); break;
      case 'tent': {
        const pick = await this.ask(null, s.hour >= 18 ? 'Crawl into the tent and sleep under the stars?' : 'Take a nap in the tent until morning?', ['Sleep here', 'Not now'], 1);
        if (pick === 0) await this.sleep(false, 'tent');
        break;
      }
      case 'campfire': {
        const night = s.hour >= 19 || s.hour < 5;
        await this.say(null, night ? 'You sit by the crackling fire. Sparks drift up to join the stars…' : 'The campfire pops and hisses. It smells like pine and toasted marshmallows.');
        if (s.flags.smoreDay !== s.day) {
          s.flags.smoreDay = s.day;
          this.giveItem('smore', 1);
        }
        this.fx.emit('sparkle', prop.x, 0.8, prop.z, 10, { color: '#ffb862' });
        break;
      }
      case 'shrine': {
        if (s.flags.blessDay === s.day) { await this.say(null, 'The little bell is still humming from this morning. The Old Oak is watching over you today.'); break; }
        const pick = await this.ask(null, 'A tiny shrine beneath the Old Oak. Ring the bell and leave an offering (5¢)?', ['Ring the bell', 'Not now'], 1);
        if (pick === 0 && s.coins >= 5) {
          this.addCoins(-5);
          s.flags.blessDay = s.day;
          audio.sfx('bell');
          this.fx.emit('sparkle', prop.x, 1.2, prop.z + 0.3, 16, { color: '#fff3a6' });
          await this.say(null, ['Leaves rustle overhead like applause. {goldLight}Blessing of the Old Oak:{/} fish bite quicker and forage sparkles today.', 'A warm breeze circles you twice. {goldLight}Blessing of the Old Oak:{/} fish bite quicker and forage sparkles today.'][s.day % 2]);
        } else if (pick === 0) await this.say(null, 'Your pockets are empty. The Old Oak doesn’t seem to mind.');
        break;
      }
      case 'telescope': await this.stargaze(); break;
      case 'musicbox': audio.jingle('newDay'); this.fx.emit('note', f.x, 1.1, f.z, 5); await this.say(null, 'You wind the little music box. A gentle, faraway melody fills the room.'); break;
      case 'gazebo': {
        await this.say(null, s.hour >= 19 || s.hour < 5 ? 'You rest in the gazebo and listen to the frogs sing across Willow Lake.' : 'You rest in the gazebo for a while. Dragonflies skim the lake and the willow sways.');
        s.hour = Math.min(DAY_END - 1, s.hour + 0.5);
        break;
      }
      case 'scarecrow': await this.say(null, 'A cheerful scarecrow in a straw hat. The name stitched on its shirt says “Sir Reginald”. The crows seem to love him.'); break;
      case 'beehive': await this.say(null, s.hour >= 6 && s.hour < 19 ? 'The hive hums with busy, happy bees. It smells like warm honey.' : 'The hive is quiet. The bees are asleep, dreaming of clover.'); break;
      case 'grotto': await this.story.grotto(); break;
      case 'snowman': await this.say(null, ['A cheerful snowman with a carrot nose. Somebody gave him a very fancy hat.', 'The snowman’s scarf flaps in the wind. He looks proud of it.', 'You fix the snowman’s coal smile. Much better.'][s.day % 3]); break;
      case 'hollowlog': {
        if (s.flags.logDay !== s.day) {
          s.flags.logDay = s.day;
          await this.say(null, 'You peek inside the hollow log… a squirrel’s secret stash! It chitters at you, then lets you take a little something.');
          this.giveItem(['mushroom', 'pinecone', 'berry', 'apple'][s.day % 4], 1);
        } else await this.say(null, 'The hollow log is empty. Someone’s been nibbling in here.');
        break;
      }
      case 'bandstand': {
        const sol = this.npcById('sol');
        const playing = sol && sol.map === 'overworld' && sol.activity === 'guitar' && Math.hypot(sol.pos.x - prop.x, sol.pos.z - prop.z) < 3;
        if (playing) {
          audio.jingle('friendUp');
          this.fx.emit('note', prop.x, 1.8, prop.z, 4);
          await this.say(null, 'You sit on the bandstand steps while Sol plays. The whole plaza sways a little. For a few minutes, nothing else in the world matters.');
          if (s.flags.bandDay !== s.day) { s.flags.bandDay = s.day; this.story.friend('sol', 25); }
        } else await this.say(null, 'The bandstand is quiet right now. Sol plays here in the late afternoon and evening.');
        break;
      }
      case 'stall': await this.say(null, this.marketDay() ? 'Pim’s cart is heaped with curious things from far-away towns. Have a word with Pim!' : 'The market stall is covered for the week. A hand-painted card says: “Pim’s Wandering Market — every Sunday, 9 till 6!”'); break;
      default: break;
    }
  }

  mailFlag(up) { if (this.over.mailFlag) this.over.mailFlag.rotation.z = up ? -Math.PI / 2 : 0; }

  async useFurniture(f) {
    const s = this.state;
    switch (f.kind) {
      case 'bed': {
        // out in the wild lands, a bed for the night (you wake up outside, the game saved)
        if (INTERIORS[this.mapId] && INTERIORS[this.mapId].wild) {
          const pick = await this.ask(null, s.hour < 18 ? 'It’s still early… rest here until morning anyway?' : 'Rest here until morning?', ['Sleep', 'Not yet'], 1);
          if (pick === 0) await this.sleep(false, this.state.roomExit || { x: 95.5, z: 72.5 });
          break;
        }
        if (this.mapId !== 'home') { await this.say(null, 'This isn’t your bed. It looks very comfy, though.'); break; }
        const early = s.hour < 18;
        const pick = await this.ask(null, early ? 'It’s still early… go to sleep anyway?' : 'Go to sleep and end the day?', ['Sleep', 'Not yet'], 1);
        if (pick === 0) {
          if (this.story.stepOf('arrive') === 3) this.story.advance('arrive');
          await this.sleep(false);
        }
        break;
      }
      case 'note': await this.story.readNote(); break;
      case 'wardrobe':
        if (this.mapId === 'home') this.game.openWardrobe();
        else await this.say(null, 'A tidy dresser. Not yours to rummage in!');
        break;
      case 'books': await this.say(null, ['"Tides & Tidings: A History of Marigold Cove." It smells like old paper.', '"101 Things To Do With A Turnip." Number 1: eat it.', '"The Lighthouse Keeper’s Almanac." Someone underlined: a light is only as bright as those who tend it.'][Math.floor(this.t) % 3]); break;
      case 'sit': await this.say(null, 'You sit for a moment and listen to the room. Cozy.'); break;
      case 'radio': audio.sfx('select'); await this.say(null, 'The radio crackles with a soft, sleepy tune.'); break;
      case 'piano': audio.sfx('bell'); await this.say(null, 'You plink out a little melody. It’s… improving.'); break;
      case 'lens': await this.story.lens(); break;
      case 'cow': {
        audio.sfx('pet');
        this.fx.emit('heart', f.x + 0.5, 1.5, f.z, 2);
        if (s.friendship.bram && s.friendship.bram.met && s.flags.milkDay !== s.day) {
          s.flags.milkDay = s.day;
          await this.say(null, 'The cow gives a long, happy “mooo”. Bram said you’re welcome to a bottle of milk each day.');
          this.giveItem('milk', 1);
        } else await this.say(null, ['The cow chews thoughtfully and blinks her long lashes at you.', 'She leans into your scratches. Mooo.', 'Her tail swishes happily. She smells like sweet hay.'][Math.floor(this.t) % 3]);
        break;
      }
      case 'chicken': audio.sfx('squeak', { volume: 0.6 }); this.fx.emit('heart', f.x, 0.8, f.z, 1); this.hud.toast(t('Bawk!')); break;
      case 'nest': {
        if (!(s.friendship.bram && s.friendship.bram.met)) { await this.say(null, 'Warm eggs in a nest of straw. Better ask the farmer first.'); break; }
        if (s.flags.eggDay === s.day) { await this.say(null, 'The nests are empty. The hens are working on tomorrow’s batch.'); break; }
        s.flags.eggDay = s.day;
        this.giveItem('egg', 2);
        this.fx.emit('sparkle', f.x, 1.0, f.z, 6);
        break;
      }
      case 'millstone': await this.story.millstone(); break;
      case 'chest':
        if (INTERIORS[this.mapId] && INTERIORS[this.mapId].wild && this.wild) await this.wild.openRoomChest(f);
        else await this.story.openChest(f);
        break;
      case 'telescope': await this.stargaze(); break;
      case 'musicbox': audio.jingle('newDay'); this.fx.emit('note', f.x, 1.1, f.z, 5); await this.say(null, 'You wind the little music box. A gentle, faraway melody fills the room.'); break;
      default: break;
    }
    if (f.entry && f.entry.def.placed && this.mapId === 'home') {
      // placed furniture: offer to pick it up (after the normal use)
    }
  }

  placeFurniture(spot) {
    const s = this.state;
    const held = this.heldItem();
    const def = ITEMS[held.id];
    const rec = { id: held.id, x: spot.x, z: spot.z, rot: 0 };
    s.house.furniture.push(rec);
    this.takeItem(held.id, 1);
    const room = this.maps.home.room;
    const entry = room.addItem({ ...ITEM_FURN(held.id), x: spot.x, z: spot.z, placed: rec });
    this.maps.home.collision.setColliders(room.colliders);
    if (entry && entry.light) this.lighting.addSource(entry.light);
    audio.sfx('place');
    this.fx.emit('dust', spot.x, 0.2, spot.z, 8);
    this.hud.toast(t('Placed {item}', { item: t(def.name) }));
  }

  pickUpFurniture(entry) {
    const s = this.state;
    const rec = entry.def.placed;
    s.house.furniture = s.house.furniture.filter((f) => f !== rec);
    const room = this.maps.home.room;
    room.removeItem(entry);
    this.maps.home.collision.setColliders(room.colliders);
    this.giveItem(rec.id, 1);
  }

  applyDecor() {
    const s = this.state;
    const held = this.heldItem();
    const def = ITEMS[held.id];
    const room = this.maps.home.room;
    if (def.wall) {
      const old = s.house.wall;
      room.setWallpaper(def.wall);
      s.house.wall = def.wall;
      this.takeItem(held.id, 1);
      const back = Object.entries(ITEMS).find(([, v]) => v.wall === old);
      if (back) addItem(s, back[0], 1);
    } else if (def.floor) {
      const old = s.house.floor;
      room.setFloor(def.floor);
      s.house.floor = def.floor;
      this.takeItem(held.id, 1);
      const back = Object.entries(ITEMS).find(([, v]) => v.floor === old);
      if (back) addItem(s, back[0], 1);
    }
    audio.sfx('place');
    this.hud.toast(t('Fresh new look!'));
  }

  // ------------------------------------------------------------------ wildlife & biomes
  spotCritter(kind) {
    if (this.game.mode !== 'game' || !this.player || this.cinematic) return;
    const s = this.state;
    const log = (s.flags.spotted = s.flags.spotted || {});
    if (log[kind]) return;
    log[kind] = s.day;
    this.hud.toast(t('New critter spotted: {critter}!', { critter: SPECIES[kind] ? t(SPECIES[kind].name) : kind }), null, '#4f955a');
    audio.sfx('sparkle', { volume: 0.5 });
    this.story.check();
  }

  tileAt(x, z) {
    if (this.big) return this.big.tileAt(x, z);   // Party Mode's big world
    const m = this.mapData;
    const tx = Math.floor(x), tz = Math.floor(z);
    if (tx < 0 || tz < 0 || tx >= m.w || tz >= m.h) return -1;
    return m.ground[tz * m.w + tx];
  }

  // how deep you are in a biome with drifting particles (snow, petals, leaves)
  biomeDrift(p = this.player.pos) {
    const depth = (E) => { const nx = (p.x - E.x) / E.rx, nz = (p.z - E.z) / E.rz; return Math.max(0, Math.min(1, (1.2 - Math.sqrt(nx * nx + nz * nz)) * 2)); };
    const snow = depth(FROST), petals = depth(BLOSSOM), leaves = depth(MAPLE);
    if (snow > 0) return { kind: 'snow', level: snow };
    if (petals > 0) return { kind: 'petals', level: petals };
    if (leaves > 0) return { kind: 'leaves', level: leaves };
    return null;
  }

  // ------------------------------------------------------------------ ambient chatter
  updateChatter(dt) {
    this.chat = (this.chat || []).filter((c) => (c.t -= dt) > 0 && !c.npc.talking);
    this.chatT = (this.chatT === undefined ? 4 : this.chatT) - dt;
    if (this.chatT > 0 || this.dialogue.active || this.busy || this.cinematic) return;
    this.chatT = 5 + Math.random() * 7;
    const p = this.player.pos;
    const near = this.npcs.filter((n) => n.map === this.mapId && !n.hidden && !n.talking && !n.scripted && !this.chat.some((c) => c.npc === n) && Math.hypot(n.pos.x - p.x, n.pos.z - p.z) < 9);
    if (!near.length) return;
    const n = near[Math.floor(Math.random() * near.length)];
    const d = Math.hypot(n.pos.x - p.x, n.pos.z - p.z);
    const s = this.state;
    let text, vars = null;
    if (d < 3.2 && Math.random() < 0.5) { text = s.hour < 11 ? 'Morning, {name}!' : s.hour < 18 ? 'Hi, {name}!' : 'Evening, {name}!'; vars = { name: s.player.name }; }
    else { const pool = CHATTER[n.id] || ['…']; text = pool[Math.floor(Math.random() * pool.length)]; }
    if (s.weather === 'rain' && Math.random() < 0.3) { text = ['What a drizzle!', 'Puddles everywhere!', 'Cozy rain today.'][Math.floor(Math.random() * 3)]; vars = null; }
    this.chat.push({ npc: n, text, vars, t: 3.2 });
  }

  // ------------------------------------------------------------------ home & town projects
  rebuildHome() {
    applyHomeLevel(this.state ? this.state.house.level : 1);
    if (this.maps.home) { this.r3d.scene.remove(this.maps.home.root); delete this.maps.home; }
  }

  applyProjects(refresh = true) {
    const done = (this.state && this.state.flags.projects) || [];
    this.projectsBuilt = this.projectsBuilt || {};
    let added = false;
    for (const pr of PROJECTS) {
      if (!done.includes(pr.id) || this.projectsBuilt[pr.id]) continue;
      this.projectsBuilt[pr.id] = pr.objects.map(([type, x, y, extra]) => this.over.addProp({ type, x, y, ...(extra || {}) })).filter(Boolean);
      added = true;
    }
    if (!added) return;
    this.overCol.setColliders(this.over.colliders);
    if (refresh && this.player && this.mapId === 'overworld') this.setMap('overworld', this.player.pos.x, this.player.pos.z, true);
  }

  clearProjects() {
    for (const list of Object.values(this.projectsBuilt || {})) for (const p of list) {
      this.over.root.remove(p.obj);
      this.over.colliders = this.over.colliders.filter((c) => !p.colliders.includes(c));
      this.over.props = this.over.props.filter((q) => q !== p);
      this.over.interactables = this.over.interactables.filter((i) => i.prop !== p);
      this.over.anims = this.over.anims.filter((a) => a.obj !== p.obj);
      if (p.fire) { this.over.fires = this.over.fires.filter((f) => !p.fire.includes(f)); this.over.firePos = (this.over.firePos || []).filter((f) => !(Math.abs(f.x - p.obj.position.x) < 0.01 && Math.abs(f.z - p.obj.position.z) < 0.01)); }
      this.over.flickerLights = this.over.flickerLights.filter((l) => !p.lights.includes(l));
    }
    this.projectsBuilt = {};
    this.overCol.setColliders(this.over.colliders);
  }

  // ------------------------------------------------------------------ ferry & stargazing
  placeFerry() {
    const f = this.over.ferry;
    if (!f) return;
    const at = (this.state && this.state.flags.ferryAt) === 'island' ? FERRY.island : FERRY.village;
    f.obj.position.x = at.x; f.obj.position.z = at.z;
    f.obj.rotation.y = at === FERRY.island ? -Math.PI / 2 : Math.PI / 2;
    const it = this.over.interactables.find((i) => i.kind === 'ferry');
    if (it) { it.x = at.x; it.z = at.z; }
  }

  async ferryRide() {
    const s = this.state;
    const toIsland = (s.flags.ferryAt || 'village') === 'village';
    if (toIsland && (s.hour < 8 || s.hour >= 19)) {
      await this.say(null, 'The ferry is tied up for the night. A painted sign reads: “Crossings to Turtle Isle 8am – 7pm. Ring for Capt. Marlo.”');
      return;
    }
    const fare = s.flags.ferryPass ? 0 : 10;
    const q = toIsland
      ? (fare ? 'Sail across to Turtle Isle? The fare is {fare}¢.' : 'Sail across to Turtle Isle?')
      : (fare ? 'Sail back to Marigold Cove? The fare is {fare}¢.' : 'Sail back to Marigold Cove?');
    const pick = await this.ask(null, q, ['All aboard!', 'Not now'], 1, { fare });
    if (pick !== 0) return;
    if (s.coins < fare) { await this.say(null, 'The fare is {fare}¢, and your pockets are a little light.', undefined, { fare }); return; }
    if (fare) this.addCoins(-fare);
    await this.sailFerry(toIsland);
  }

  async sailFerry(toIsland) {
    const s = this.state, f = this.over.ferry;
    const from = toIsland ? FERRY.village : FERRY.island, to = toIsland ? FERRY.island : FERRY.village;
    const route = [[FERRY.village.x, FERRY.village.z], [98.5, 110.2], [112, 112.6], [132, 108.6], [148, 103.4], [156, 99.8], [161.4, 100.4], [FERRY.island.x, FERRY.island.z]];
    if (!toIsland) route.reverse();
    audio.sfx('bell');
    await this.fade(1, 0.3);
    this.cinematic = true;
    this.hideHud = true;
    this.fishing.cancel();
    await this.fade(0, 0.4);
    this.hud.showBanner(t(toIsland ? 'Sailing to Turtle Isle' : 'Sailing home to Marigold Cove'), t('Hold {key} to hurry the captain along', { key: ctl('interact') }));
    const lens = [0];
    for (let i = 1; i < route.length; i++) lens.push(lens[i - 1] + Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]));
    const total = lens[lens.length - 1];
    const marlo = this.npcById('marlo');
    const captain = marlo && s.hour >= 8 && s.hour < 19 ? marlo : null;
    if (captain) { captain.scripted = true; captain.map = 'overworld'; captain.path = null; captain.hidden = false; this.updateNpcVisibility(); }
    await new Promise((res) => { this.sail = { route, lens, total, d: 0, heading: f.obj.rotation.y, res, captain }; });
    if (captain) {
      captain.scripted = false;
      captain.baseY = 0;
      s.flags.ferryAt = toIsland ? 'island' : 'village';
      const t2 = this.scheduleFor(captain);
      captain.map = t2.map; captain.pos = { x: t2.x, z: t2.z }; captain.target = t2; captain.path = null; captain.activity = t2.act; captain.restDir = t2.face;
      this.updateNpcVisibility();
    }
    await this.fade(1, 0.35);
    s.flags.ferryAt = toIsland ? 'island' : 'village';
    this.sail = null;
    this.placeFerry();
    this.player.baseY = 0;
    this.player.pos = { x: to.standX, z: to.standZ };
    this.player.dir = { x: toIsland ? 0 : -1, z: toIsland ? 1 : 0 };
    this.player.model.facing = this.player.model.targetFacing = Math.atan2(this.player.dir.x, this.player.dir.z);
    this.pet.pos = { x: to.standX - 0.6, z: to.standZ - 0.4 };
    this.camTarget = null;
    this.cinematic = false;
    this.hideHud = false;
    this.snapCamera();
    this.lastArea = null;
    await this.fade(0, 0.45);
    this.story.onFerry(toIsland);
    void from;
  }

  updateSail(dt) {
    const sl = this.sail, f = this.over.ferry;
    const fast = this.input.down('interact') || this.input.mouse.down;
    const speed = sl.d < 3 || sl.total - sl.d < 4 ? 4 : 10;
    sl.d = Math.min(sl.total, sl.d + dt * speed * (fast ? 2.5 : 1));
    let i = 1;
    while (i < sl.lens.length - 1 && sl.lens[i] < sl.d) i++;
    const a = sl.route[i - 1], b = sl.route[i];
    const k = (sl.d - sl.lens[i - 1]) / Math.max(0.001, sl.lens[i] - sl.lens[i - 1]);
    const x = a[0] + (b[0] - a[0]) * k, z = a[1] + (b[1] - a[1]) * k;
    const want = Math.atan2(-(b[1] - a[1]), b[0] - a[0]);
    let dh = want - sl.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    sl.heading += dh * Math.min(1, dt * 2.2);
    f.obj.position.x = x; f.obj.position.z = z;
    f.obj.rotation.y = sl.heading;
    // passengers ride on the front deck
    const c = Math.cos(sl.heading), sn = Math.sin(sl.heading);
    const deck = (lx) => ({ x: x + lx * c, z: z - lx * sn });
    this.player.pos = deck(1.25);
    this.player.baseY = f.obj.position.y + 0.3;
    this.player.dir = { x: c, z: -sn };
    this.player.model.targetFacing = Math.atan2(c, -sn);
    this.pet.pos = deck(-1.45);
    this.pet.baseY = f.obj.position.y + 0.3;
    if (sl.captain) {
      const cp = deck(0.1);
      sl.captain.pos = { x: cp.x + sn * 0.3, z: cp.z + c * 0.3 };
      sl.captain.baseY = f.obj.position.y + 0.3;
      sl.captain.dir = { x: c, z: -sn };
      sl.captain.restDir = { x: c, z: -sn };
    }
    this.camTarget = { x: x + c * 2.5, z: z - sn * 2.5 };
    if (Math.random() < dt * 22) this.fx.emit('splash', x - c * 2.1 + (Math.random() - 0.5) * 0.8, 0.05, z + sn * 2.1 + (Math.random() - 0.5) * 0.8, 1);
    if (Math.random() < dt * 6) this.fx.emit('water', x + c * 2.3, 0.1, z - sn * 2.3, 1);
    // dolphins sometimes race the ferry
    sl.dolT = (sl.dolT === undefined ? 1.5 : sl.dolT) - dt;
    if (sl.dolT <= 0 && sl.d > 6 && sl.total - sl.d > 10) {
      sl.dolT = 1.6 + Math.random() * 2.2;
      const side = Math.random() < 0.5 ? -1 : 1, off = 2.6 + Math.random() * 2.2;
      this.spawnDolphin(x + sn * off * side + c * 1.5, z + c * off * side - sn * 1.5, c, -sn);
    }
    if (sl.d >= sl.total && sl.res) { const r = sl.res; sl.res = null; r(); }
  }

  spawnDolphin(x, z, dx, dz) {
    if (!this.dolphinMats) this.dolphinMats = [toon(this.r3d, { color: 0x7a8fb0, key: 'dolphin' }), toon(this.r3d, { color: 0xdfe6f0, key: 'dolphinbelly' })];
    const [mb, mw] = this.dolphinMats;
    const g = new THREE.Group();
    const add = (w, h, d, m, px, py, pz) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(px, py, pz); g.add(b); return b; };
    add(0.9, 0.24, 0.26, mb, 0, 0, 0); add(0.5, 0.1, 0.22, mw, 0.05, -0.12, 0); add(0.28, 0.16, 0.18, mb, 0.55, -0.02, 0);
    add(0.14, 0.06, 0.1, mb, 0.72, -0.05, 0); add(0.16, 0.22, 0.05, mb, -0.05, 0.2, 0).rotation.z = -0.4;
    add(0.1, 0.05, 0.4, mb, -0.52, 0, 0);
    this.over.root.add(g);
    this.dolphins = this.dolphins || [];
    this.dolphins.push({ g, x, z, dx, dz, t: 0 });
    this.fx.emit('splash', x, 0.05, z, 4);
  }

  updateDolphins(dt) {
    if (!this.dolphins || !this.dolphins.length) return;
    for (const d of this.dolphins) {
      d.t += dt;
      const k = d.t / 1.3;
      const px = d.x + d.dx * k * 3.4, pz = d.z + d.dz * k * 3.4;
      d.g.position.set(px, Math.sin(Math.PI * k) * 1.3 - 0.1, pz);
      d.g.rotation.y = Math.atan2(-d.dz, d.dx);
      d.g.rotation.z = Math.cos(Math.PI * k) * 0.9;
      if (k >= 1 && !d.done) { d.done = true; this.fx.emit('splash', px, 0.05, pz, 5); this.over.root.remove(d.g); }
    }
    this.dolphins = this.dolphins.filter((d) => !d.done);
  }

  async stargaze() {
    const s = this.state;
    const night = s.hour >= 20 || s.hour < 4.5;
    if (!night) {
      await this.say(null, 'You peek through the brass telescope. Far below: the windmill, the lighthouse, Turtle Isle, and tiny villagers going about their day. Come back after dark to see the stars.');
      return;
    }
    if (s.weather === 'rain') { await this.say(null, 'Nothing but rain clouds tonight. Maybe tomorrow.'); return; }
    await this.game.stargazeOverlay();
    s.flags.starNights = (s.flags.starNights || 0) + (s.flags.starDay === s.day ? 0 : 1);
    s.flags.starDay = s.day;
    this.story.onStargaze();
  }

  // ------------------------------------------------------------------ camera
  snapCamera() {
    const p = this.player.pos;
    const c = this.clampCam(p.x, p.z);
    this.cam.x = c.x; this.cam.z = c.z;
  }

  // pixels per tile for the current map: rooms zoom in to fill the screen
  get ppu() {
    if (this.director && this.director.ppu) return this.director.ppu;
    return this.ppuBase;
  }
  // (without a scene holding the camera)
  get ppuBase() {
    if (this.mapId === 'overworld') {
      // tall/large canvases get a closer camera so villagers stay readable
      const r = this.r3d;
      return r.h / 16 > 27 || r.w / 16 > 44 ? 32 : 16;
    }
    // rooms zoom in as far as their width allows; tall rooms scroll gently
    const def = INTERIORS[this.mapId];
    const r = this.r3d;
    const k = Math.floor(Math.min((r.w * 0.98) / (def.w + 0.4), (r.h * 1.5) / (def.d + 2.4)) / 16);
    return 16 * Math.max(1, Math.min(3, k));
  }

  clampCam(x, z) {
    const r = this.r3d, ppu = this.ppu;
    const hw = r.w / 2 / ppu, hh = r.h / 2 / ppu;
    if (this.mapId === 'overworld') {
      const dc = this.wild && this.wild.dungeons && this.wild.dungeons.clampSolo(x, z - 0.6, hw, hh);
      if (dc) return dc;
      if (this.wild && this.wild.big) { const b = this.wild.big.bounds(); return { x: clamp(x, b.x0 + hw, b.x1 - hw), z: clamp(z - 0.6, b.z0 + hh - 2, b.z1 - hh) }; }
      const m = this.mapData;
      return { x: clamp(x, hw, m.w - hw), z: clamp(z - 0.6, hh - 2, m.h - hh) };
    }
    const def = INTERIORS[this.mapId];
    // centre small rooms, follow in big ones; the back wall (2.4 tall) shows above z=0
    const cx = def.w <= hw * 2 - 1 ? def.w / 2 : clamp(x, hw - 0.5, def.w - hw + 0.5);
    const lo = -2.55 + hh, hi = def.d + 0.45 - hh;
    const cz = lo >= hi ? (lo + hi) / 2 : clamp(z - 0.6, lo, hi);
    return { x: cx, z: cz };
  }

  updateCamera(dt) {
    // a scene holds the camera (saga/stage.js)
    if (this.director) { this.cam.x = this.director.x; this.cam.z = this.director.z; return; }
    const p = this.player.pos;
    // (high up in a balloon or a glider, the camera looks up with you)
    const lift = Math.max(0, (this.player.baseY || 0) - 1);
    let tgt = this.camTarget || { x: p.x + this.player.dir.x * 0.6, z: p.z + this.player.dir.z * 0.4 - lift };
    // (a boss close by: the camera leans towards it, so you both stay in the frame —
    // its middle, not its feet: tall bosses stand up the screen)
    const C = !this.camTarget && this.wild && this.wild.combat;
    if (C) {
      let best = null, bd = 22;
      for (const e of C.enemies) if (e.alive && e.def.boss) { const d = Math.hypot(e.x - p.x, e.z - p.z); if (d < bd) { bd = d; best = e; } }
      if (best) {
        const h = (best.def.h || 2) + (best.y || 0), dx = best.x - p.x, dz = best.z - h * 0.5 - p.z, l = Math.hypot(dx, dz) || 1, m = Math.min(6.5, l * 0.45);
        tgt = { x: tgt.x + (dx / l) * m, z: tgt.z + (dz / l) * m };
        // (its head under the boss bar on a wide screen — and you above the hotbar & moves)
        const hz = this.game.display.wh / 2 / this.ppu / 0.72;
        tgt.z = Math.max(p.z + 0.3 - hz * 0.48, Math.min(tgt.z, best.z - h * 1.1 - 0.6 + hz * 0.64));
      }
    }
    const c = this.clampCam(tgt.x, tgt.z);
    const k = 1 - Math.exp(-dt * (this.camTarget ? 2.5 : 6));
    this.cam.x += (c.x - this.cam.x) * k;
    this.cam.z += (c.z - this.cam.z) * k;
  }

  // ------------------------------------------------------------------ music & ambience
  updateMusic(force = false) {
    const s = this.state;
    let track;
    const map = this.mapId;
    const mood = this.wild && this.wild.mood();
    if (this.wild && this.wild.sceneMusic) track = this.wild.sceneMusic;
    else if (this.wild && this.wild.sagaMusic && map === 'overworld') track = this.wild.sagaMusic;
    else if (s.flags.festivalDay === s.day && s.hour >= 18.5 && !s.flags.festivalDone && map === 'overworld') track = 'festival';
    else if (map !== 'overworld') track = INTERIORS[map].music || 'interior';
    else if (this.wild && this.wild.fightTrack) track = this.wild.fightTrack;
    else if (mood) track = mood.music || (s.hour >= 20 || s.hour < 5.5 ? 'night' : 'day');
    else if (s.weather === 'rain') track = 'rain';
    else if (s.hour >= 20 || s.hour < 5.5) track = 'night';
    else if (this.sail || this.lastArea === 'Turtle Isle') track = 'island';
    else if (FOREST_AREAS.includes(this.lastArea)) track = 'forest';
    else if (this.lastArea === 'Frostpine Ridge') track = 'title';
    else if (this.lastArea === 'Blossom Glade') track = 'evening';
    else if (s.hour >= 17.5) track = 'evening';
    else track = 'day';
    if (force || audio.currentTrack !== track) audio.playMusic(track, { fade: force ? 1.2 : 3 });
  }

  updateAmbient() {
    const s = this.state, p = this.player.pos;
    const out = this.mapId === 'overworld';
    const night = s.hour >= 20 || s.hour < 5.5;
    const nearSea = out ? clamp(1 - (shoreY(Math.floor(p.x)) - p.z) / 14, 0, 1) : 0;
    // the waterfall roars as you get close; campfires crackle
    const wf = this.over.waterfall;
    const nearFall = out && wf ? clamp(1 - Math.hypot(p.x - wf.x, p.z - wf.z) / 18, 0, 1) : 0;
    let nearFire = 0;
    if (out) for (const f of this.over.firePos || []) nearFire = Math.max(nearFire, clamp(1 - Math.hypot(p.x - f.x, p.z - f.z) / 9, 0, 1));
    const room = !out && this.maps[this.mapId] && this.maps[this.mapId].room;
    const hearth = room && room.furniture.some((f) => f.def.type === 'fireplace') ? 0.5 : 0;
    const mood = this.wild && this.wild.mood();
    if (mood && mood.amb) {
      const amb = { birds: 0, crickets: 0, waves: 0, rain: s.weather === 'rain' ? 0.9 : 0, wind: 0.15, fire: 0, night: night ? 0.5 : 0, ...mood.amb };
      if (night) { amb.birds = 0; amb.crickets = Math.max(amb.crickets || 0, 0.4); }
      audio.setAmbient(amb);
      return;
    }
    audio.setAmbient({
      birds: out && !night && s.weather !== 'rain' ? (this.lastArea === 'Frostpine Ridge' ? 0.15 : 0.7) : 0,
      crickets: out && night ? (this.lastArea === 'Reedmarsh' ? 1 : this.lastArea === 'Frostpine Ridge' ? 0 : 0.8) : 0,
      waves: out ? 0.15 + nearSea * 0.75 : 0,
      rain: Math.max(s.weather === 'rain' ? (out ? 0.9 : 0.35) : 0, nearFall * 0.6),
      wind: out ? 0.15 + (this.mapId === 'overworld' && p.z < 30 && p.x > 150 ? 0.3 : 0) + (this.lastArea === 'Frostpine Ridge' ? 0.35 : 0) : 0,
      fire: Math.max(hearth, nearFire * 0.7),
      night: out && night ? 0.5 : 0,
    });
  }

  updateWeatherFx(instant) {
    const s = this.state;
    const target = s.weather === 'rain' ? 1 : s.weather === 'cloudy' ? 0.45 : 0;
    this.weatherLevel = instant ? target : lerp(this.weatherLevel || 0, target, 0.02);
  }

  // ------------------------------------------------------------------ festival & finale
  buildFestival() {
    const g = this.festival;
    const cols = [0xf6a05a, 0xec5f73, 0xffd66b, 0x8fd6b4, 0xb9a2e3];
    let i = 0;
    for (let x = 38; x <= 56; x += 1.5) {
      const y = 1.9 + Math.sin(i * 0.8) * 0.15;
      const c = cols[i++ % cols.length];
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.22), toon(this.r3d, { color: c, emissive: c, emissiveIntensity: 0.9 }));
      m.position.set(x + OX, y, 52.6 + OZ);
      g.add(m);
    }
    for (const x of [37.8, 56.2]) {
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.2, 0.1), toon(this.r3d, { color: 0x6b4330 }));
      pole.position.set(x + OX, 1.1, 52.6 + OZ);
      g.add(pole);
    }
    this.floaters = [];
  }

  async lighthouseScene() {
    const room = this.maps.lighthouse.room;
    this.cinematic = true;
    audio.duck(0.2, 6);
    audio.jingle('lighthouse');
    for (let i = 0; i <= 20; i++) {
      room.lens.mat.emissiveIntensity = i / 20 * 1.4;
      room.root.traverse((o) => { if (o.userData.slot !== undefined) o.material.emissiveIntensity = Math.min(1, i / 10); });
      await this.wait(0.08);
    }
    this.fx.emit('sparkle', 3.5, 1.4, 2.6, 30, { color: '#fff3a6' });
    await this.fade(1, 1.2);
    // outside, night view of the beam
    this.state.flags.lighthouseLit = true;
    if (this.state.hour < 19.7) this.state.hour = 19.7;
    const b = BUILDINGS.find((x) => x.id === 'lighthouse');
    this.setMap('overworld', b.door + 0.5, b.y + b.h + 0.6);
    this.beam.visible = true;
    this.over.lighthouseLamp.lamp.emissiveIntensity = 1.5;
    const oldHour = this.state.hour;
    this.camTarget = { x: OX + 80, z: OZ + 49 };
    this.snapCamera();
    await this.fade(0, 1.2);
    this.hud.showBanner(t('Old Glimmer shines again'), t('The whole cove can see it'));
    await this.wait(3.5);
    this.camTarget = null;
    this.cinematic = false;
    void oldHour;
    await this.say(null, 'Across Marigold Cove, lamps flicker on in windows, and doors open to the light. Somewhere, a very old mayor drops his tea.');
  }

  async finale() {
    const s = this.state;
    this.cinematic = true;
    this.hideHud = true;
    await this.say(null, 'You light the little paper lantern and hold it out over the water…');
    // launch floating lanterns from everyone
    const starts = this.npcs.filter((n) => n.map === 'overworld').map((n) => [n.pos.x, n.pos.z]);
    starts.push([OX + 47, OZ + 65.4]);
    for (const [x, z] of starts) this.addFloater(x, z);
    for (let i = 0; i < 26; i++) this.addFloater(OX + 38 + Math.random() * 18, OZ + 52 + Math.random() * 4);
    audio.jingle('festival');
    this.camTarget = { x: OX + 47, z: OZ + 58 };
    for (let k = 0; k < 14; k++) {
      await this.wait(0.7);
      const x = OX + 38 + Math.random() * 18, z = OZ + 60 + Math.random() * 6;
      const col = ['#ffd66b', '#ec5f73', '#8fd6b4', '#b9a2e3', '#f6a05a'][k % 5];
      const y = 4 + Math.random() * 3;
      this.fx.emit('flash', x, y, z, 1, { color: col });
      this.fx.emit('firework', x, y, z, 40, { color: col });
      this.fx.emit('firework', x, y, z, 12, { color: '#fff7e6' });
      audio.sfx('firework', { volume: 0.6 });
    }
    await this.wait(1.5);
    await this.game.credits();
    this.camTarget = null;
    this.cinematic = false;
    this.hideHud = false;
    s.flags.finaleSeen = true;
    this.save('auto');
  }

  addFloater(x, z) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.34, 0.28), toon(this.r3d, { color: 0xffd08a, emissive: 0xffa040, emissiveIntensity: 1.2, key: 'floater' }));
    g.add(body);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.lighting.glowTex, color: 0xffb860, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 }));
    glow.scale.set(1.3, 1.3, 1);
    g.add(glow);
    g.position.set(x, 1.1 + Math.random() * 0.3, z);
    this.over.root.add(g);
    this.floaters.push({ m: g, vy: 0.45 + Math.random() * 0.35, sway: Math.random() * 6, life: 0 });
  }

  // ------------------------------------------------------------------ update
  update(dt) {
    const s = this.state, input = this.input;
    this.t += dt;
    // script waits
    if (this.waits && this.waits.length) {
      for (const w of this.waits) w.t -= dt;
      const done = this.waits.filter((w) => w.t <= 0);
      this.waits = this.waits.filter((w) => w.t > 0);
      for (const w of done) w.res();
    }
    // fades
    if (this.fadeA !== this.fadeTarget) {
      const d = this.fadeTarget - this.fadeA;
      const step = dt * this.fadeSpeed;
      this.fadeA = Math.abs(d) <= step ? this.fadeTarget : this.fadeA + Math.sign(d) * step;
      if (this.fadeA === this.fadeTarget && this.fadeRes) { const r = this.fadeRes; this.fadeRes = null; r(); }
    }

    const uiOpen = this.menu.open || this.shop.open_ || this.dialogue.active || this.game.overlay;
    this.input.touchUi = !!(uiOpen || this.busy > 0 || this.cinematic);
    const frozen = uiOpen || this.busy > 0 || this.cinematic || this.fishing.active;
    // clock runs unless a menu/dialogue/cutscene holds it
    if (!uiOpen && this.busy === 0 && !this.cinematic) this.advanceTime(dt);

    // menus & overlays
    if (this.wild && this.wild.stage && this.wild.stage.skipRect) this.wild.stage.tapSkip(input);
    if (this.menu.open) this.menu.update(dt, input);
    else if (this.shop.open_) this.shop.update(dt, input);
    else if (this.dialogue.active) this.dialogue.update(dt, input);
    else if (!this.busy && !this.cinematic && !this.game.overlay) this.handleInput(dt);
    if (this.wild) this.wild.update(dt);
    this.autosave(dt);

    // what the player is holding
    let prop = null, arm;
    if (this.fishing.active && this.fishing.state !== 'show') { prop = 'rod'; arm = -0.9; }
    else if (this.player.lock > 0 && this.lastAction === 'water') { prop = 'can'; arm = -0.7; }
    else if (this.story.active('festival') && s.flags.festivalDay === s.day && s.hour >= 18.5) prop = 'lantern';
    const held = this.heldItem();
    const holding = held ? held.id : null;
    if (!prop && holding === 'lamp_hand') { prop = 'lantern'; arm = -0.35; }
    // riding the bicycle (only outdoors, not while sailing — nor on a mount, a boat, or swimming)
    const W = this.wild && this.mapId === 'overworld' ? this.wild : null;
    const ride = holding === 'bike' && this.mapId === 'overworld' && !this.sail && !(W && (W.me.mount || W.afloat()));
    if (ride !== !!this.player.riding) {
      this.player.riding = ride;
      this.player.model.setBike(ride);
      if (ride) audio.sfx('bell', { volume: 0.5 });
    }
    if (ride) prop = null;
    // (out in the wild lands: nothing in hand while swimming, riding or boating)
    const wp = W ? W.propFor() : undefined;
    if (wp !== undefined) prop = wp;
    this.player.model.setProp(prop);
    if (wp === undefined) this.player.armPose = ride ? undefined : arm;
    // the hand lantern lights the way
    if (holding === 'lamp_hand') {
      if (!this.handLight) { this.handLight = { x: 0, y: 1.1, z: 0, color: 0xffc070, power: 0.95, always: true, dist: 7.5 }; this.lighting.sources.push(this.handLight); }
      this.handLight.x = this.player.pos.x + this.player.dir.x * 0.35 + 0.35; this.handLight.z = this.player.pos.z + this.player.dir.z * 0.35 + 0.35;
      this.handLight.y = 0.75 + (this.player.baseY || 0);
      const dim = this.mapId === 'overworld' && this.lighting.lampLevel < 0.2;
      this.handLight.off = dim;
    } else if (this.handLight) {
      this.lighting.sources = this.lighting.sources.filter((l) => l !== this.handLight);
      this.handLight = null;
    }

    // world simulation
    if (this.sail) this.updateSail(dt);
    this.updateDolphins(dt);
    const col = this.maps[this.mapId].collision;
    // (`sink`: a scene lowers the hero into water — a hot spring’s tub)
    if (!this.sail && !(W && W.me.vehicle)) this.player.baseY = (this.mapId === 'overworld' ? this.groundY(this.player.pos) : 0) + (this.player.sink || 0);
    const underfoot = this.mapId === 'overworld' ? this.tileAt(this.player.pos.x, this.player.pos.z) : -1;
    this.player.onIce = underfoot === TT.ICE || underfoot === TT.GLACIER;
    // (swimming, riding & boats: the wild lands move the hero)
    if (!(W && W.movePlayer(dt, input, col, frozen))) this.player.update(dt, input, col, frozen);
    // (pushing and going nowhere, or boxed in: « Get unstuck » comes forward — entities/stuck.js)
    const mv = input.moveVector(), sw = this.stuckWatch || (this.stuckWatch = new StuckWatch());
    this.stuckOffer = sw.update(dt, {
      pushing: !frozen && Math.hypot(mv.x, mv.y) > 0.5, pos: this.player.pos,
      busy: this.busy > 0 || !!this.cinematic || !!this.sail || this.fishing.active || !!(W && (W.me.vehicle || W.me.mount || W.afloat())),
      boxedAt: () => !(this.mapId === 'overworld' && nearWater(this, this.player.pos.x, this.player.pos.z)) && stuckAt(col, this.player.pos.x, this.player.pos.z, { r: 0.1, room: this.mapId === 'overworld' ? 12 : 6 }),
    });
    const SR = this.stuckRect;
    if (this.stuckOffer && SR && input.mouse.pressed && input.mouseIn(SR.x, SR.y, SR.w, SR.h)) { input.mouse.pressed = false; this.unstick(); sw.reset(); this.stuckOffer = false; }
    if (W && W.petAway()) {
      // the pet waits on the shore while you swim or sail, and runs back to you after
      this.pet.model.root.visible = false;
      this.petAway = true;
    } else if (!this.sail) {
      if (this.petAway) {
        this.petAway = false;
        this.pet.model.root.visible = this.pet.map === this.mapId;
        this.pet.pos = { x: this.player.pos.x - this.player.dir.x * 0.9, z: this.player.pos.z - this.player.dir.z * 0.9 + 0.2 };
        this.pet.hop(0.05);
        this.fx.emit('dust', this.pet.pos.x, 0.05, this.pet.pos.z, 4);
      }
      this.pet.baseY = this.mapId === 'overworld' ? this.groundY(this.pet.pos) : 0;
      this.pet.update(dt, this.player, col, s.hour >= 21 || s.hour < 6);
    } else this.pet.update(dt, this.player, null, false, true);
    if (this.wild) this.wild.afterMove(dt);
    for (const n of this.npcs) if (!(this.sail && this.sail.captain === n)) n.baseY = n.map === 'overworld' ? this.groundY(n.pos) : 0;
    this.updateNpcs(dt);
    this.updateChatter(dt);
    this.fishing.update(dt, input);
    this.fx.update(dt);
    this.hud.update(dt);
    if (this.playerEmoteT > 0) { this.playerEmoteT -= dt; if (this.playerEmoteT <= 0) this.playerEmoteKind = null; }
    if (this.mapId === 'overworld') {
      this.updateScenery(dt, [this.player.pos]);
      this.festival.visible = !!(s.flags.festivalDay && s.day >= s.flags.festivalDay);
      // auto-pickup forage you walk over
      const it = this.forage.nearest(this.player.pos.x, this.player.pos.z, 0.45);
      if (it && !frozen) this.pickup(it);
      this.critters.update(dt, this.t, this.player, s.hour);
      this.drift = this.biomeDrift();
      // footprints in the snow, rustling leaf piles
      const pp0 = this.player.pos;
      if (this.player.moving && !this.player.airborne && this.tileAt(pp0.x, pp0.z) === TT.SNOW) {
        this.printT = (this.printT || 0) - dt;
        if (this.printT <= 0) {
          this.printT = this.player.running ? 0.14 : 0.2;
          this.printSide = -(this.printSide || 1);
          const d = this.player.dir;
          this.fx.emit('print', pp0.x - d.z * 0.1 * this.printSide, 0.02, pp0.z + d.x * 0.1 * this.printSide + 0.05, 1);
        }
      }
      for (const lp of this.over.leafpiles || []) {
        const dl = Math.hypot(lp.x - pp0.x, lp.z - pp0.z);
        if (dl < 0.6 && this.player.moving && Math.random() < dt * 5) this.fx.emit('burst', lp.x, 0.2, lp.z, 2);
      }
      // area banners (out in the wild lands, the zones announce themselves)
      const inValley = !this.wild || this.wild.big.inValley(this.player.pos.x, this.player.pos.z);
      const area = inValley ? areaAt(Math.floor(this.player.pos.x), Math.floor(this.player.pos.z)) : this.lastArea;
      if (area !== this.lastArea && !this.sail) {
        s.flags.areas = s.flags.areas || [];
        const fresh = !s.flags.areas.includes(area);
        if (fresh) s.flags.areas.push(area);
        if (this.lastArea !== null && !this.cinematic) {
          this.hud.showBanner(t(area), fresh ? t('★ New place discovered ★') : '');
          if (fresh) { audio.sfx('sparkle'); this.fx.emit('sparkle', this.player.pos.x, 1.4, this.player.pos.z, 10, { color: '#fff3a6' }); }
        }
        this.lastArea = area;
        this.story.onAreaEnter(area);
        this.updateMusic();
      }
      // footstep dust when running
      if (this.player.moving && this.player.running && Math.random() < dt * 10) this.fx.emit('dust', this.player.pos.x, 0.05, this.player.pos.z + 0.1, 1);
    } else {
      // flickering fireplace
      const room = this.maps[this.mapId].room;
      for (const l of room.lights) if (l.flicker) l.power = (l.basePower || (l.basePower = l.power)) * (0.85 + Math.sin(this.t * 13) * 0.08 + Math.sin(this.t * 7.3) * 0.07);
      const actx = { millRunning: !!s.flags.millFixed };
      for (const a of room.anims) a(this.t, actx);
    }
    // footsteps
    if (this.player.moving) {
      this.stepT -= dt * (this.player.running ? 1.5 : 1);
      if (this.stepT <= 0) {
        this.stepT = 0.34;
        audio.footstep(this.surfaceAt(this.player.pos));
      }
    }
    // ambience & music once a second
    this.ambientT -= dt;
    if (this.ambientT <= 0) {
      this.ambientT = 1;
      if (this.mapId === 'overworld') fogReveal(s, this.player.pos.x, this.player.pos.z);
      this.updateAmbient();
      this.updateMusic();
      this.updateWeatherFx(false);
      this.story.check();
      this.lighting.weatherDim = this.mapId === 'overworld' ? this.weatherLevel * 0.7 : 0;
      if (!s.board || s.board.day !== s.day) this.story.newBoardRequest();
      this.mailFlag(s.mail.length > 0);
    }
    this.updateCamera(dt);
    if (this.wild) this.wild.stream(dt);
  }

  // Ambient life of the valley that doesn't depend on who is playing: water &
  // windmill, clouds, butterflies & bees, chimney smoke, the fountain, and the
  // waterfall spray & campfire sparks near any of the `focus` points.
  updateScenery(dt, focus) {
    const s = this.state;
    this.over.update(dt, this.t);
    this.forage.updateFireflies(dt, this.t, s.hour >= 19.5 || s.hour < 4.5, true);
    if (this.beam.visible) this.beam.rotation.y = this.t * 0.6;
    this.clouds.material.uniforms.drift.value.set(this.t * 0.9 / CLOUD_SPAN, this.t * 0.18 / CLOUD_SPAN);
    const sunny = s.hour > 6.5 && s.hour < 18.8;
    this.clouds.material.uniforms.opacity.value = sunny ? (s.weather === 'cloudy' ? 0.9 : s.weather === 'rain' ? 0.2 : 0.65) : 0;
    this.clouds.visible = sunny;
    for (const b of this.butterflies) {
      b.x = b.hx + Math.sin(this.t * 0.35 + b.ph) * 2.2 + Math.sin(this.t * 1.3 + b.ph * 2) * 0.4;
      b.z = b.hz + Math.cos(this.t * 0.28 + b.ph) * 1.4;
      b.y = 0.7 + Math.abs(Math.sin(this.t * 2.2 + b.ph)) * 0.5;
    }
    for (const f of this.floaters) {
      f.life += dt;
      f.m.position.y += f.vy * dt;
      f.m.position.x += Math.sin(this.t + f.sway) * dt * 0.2;
    }
    // chimney smoke (each chimney at its own hours: the bakery's oven all day, hearths morning &
    // evening, the workshop's stove while Theo works) & the fountain
    for (const c of this.over.chimneys) if (c.smoke) chimneySmoke(this.fx, c, dt, s.hour, this.lighting.lampLevel || 0);
    if (this.over.fountain && Math.random() < dt * 8) this.fx.emit('water', this.over.fountain.x + (Math.random() - 0.5) * 0.2, this.over.fountain.y, this.over.fountain.z, 1);
    for (const lp of this.over.leafpiles || []) {
      if (lp.squash > 0) { lp.squash = Math.max(0, lp.squash - dt * 1.2); lp.obj.scale.set(1 + lp.squash * 0.3, 1 - lp.squash * 0.6, 1 + lp.squash * 0.3); }
    }
    // glowcaps brighten at dusk, the waterfall churns, bees buzz by day
    for (const gm of this.over.glowcaps) gm.emissiveIntensity = 0.3 + this.lighting.lampLevel * 1.5;
    const near = (x, z, rx, rz) => focus.some((p) => Math.abs(p.x - x) < rx && Math.abs(p.z - z) < rz);
    const wf = this.over.waterfall;
    if (wf && near(wf.x, wf.z, 26, 18) && Math.random() < dt * 14) {
      this.fx.emit(Math.random() < 0.5 ? 'splash' : 'water', wf.x + (Math.random() - 0.5) * 2.6, 0.1, wf.z + Math.random() * 0.4, 1);
    }
    // campfire sparks drift up into the night
    if (this.over.firePos) for (const fp of this.over.firePos) {
      if (near(fp.x, fp.z, 22, 16) && Math.random() < dt * 5) {
        this.fx.emit('sparkle', fp.x + (Math.random() - 0.5) * 0.3, 0.8, fp.z, 1, { color: Math.random() < 0.5 ? '#ffb862' : '#ffd66b' });
        if (Math.random() < 0.3) this.fx.emit('smoke', fp.x, 1.0, fp.z, 1);
      }
    }
    for (const b of this.bees) {
      const a = this.t * 1.7 + b.ph;
      b.x = b.hx + Math.sin(a) * 0.9 + Math.sin(a * 2.3) * 0.25;
      b.z = b.hz + Math.cos(a * 0.8) * 0.6 + 0.3;
      b.y = 0.6 + Math.abs(Math.sin(a * 3.1)) * 0.5;
    }
  }

  // butterflies & bees are 2D dots at 3D positions; `proj` projects them
  drawAmbientDots(wctx, proj) {
    const s = this.state;
    if (s.hour > 7 && s.hour < 18.5 && s.weather !== 'rain') {
      for (const b of this.butterflies) {
        const p = proj.project(b.x, b.y, b.z);
        const flap = Math.floor(this.t * 12 + b.ph * 5) % 2;
        wctx.fillStyle = '#3b2a2e';
        wctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 2);
        wctx.fillStyle = b.col;
        if (flap) { wctx.fillRect(Math.round(p.x) - 2, Math.round(p.y) - 1, 2, 2); wctx.fillRect(Math.round(p.x) + 1, Math.round(p.y) - 1, 2, 2); }
        else { wctx.fillRect(Math.round(p.x) - 1, Math.round(p.y), 1, 1); wctx.fillRect(Math.round(p.x) + 1, Math.round(p.y), 1, 1); }
      }
    }
    if (s.hour > 6.5 && s.hour < 19 && s.weather !== 'rain') {
      for (const b of this.bees) {
        const p = proj.project(b.x, b.y, b.z);
        wctx.fillStyle = '#f2c14e';
        wctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 1);
        wctx.fillStyle = '#3b2a2e';
        wctx.fillRect(Math.round(p.x) + 1, Math.round(p.y), 1, 1);
        if (Math.floor(this.t * 20 + b.ph) % 2) { wctx.fillStyle = '#ffffff'; wctx.fillRect(Math.round(p.x), Math.round(p.y) - 1, 1, 1); }
      }
    }
  }

  // height of the walkable surface: piers, and the arch of the koi bridge
  groundY(p) {
    if (this.big && (!this.big.inValley(p.x, p.z) || this.big.newDeck(p.x, p.z))) return this.big.groundY(p);
    const m = this.mapData;
    const tx = Math.floor(p.x), tz = Math.floor(p.z);
    if (m.noPier && m.noPier.has(tx + ',' + tz)) {
      const t = Math.max(0, Math.min(1, (p.z - (KOI_POND.z - KOI.len / 2)) / KOI.len));
      return 0.24 + Math.sin(t * Math.PI) * KOI.arch;
    }
    return this.onPier(p) ? 0.21 : 0;
  }

  onPier(p) {
    const m = this.mapData;
    const tx = Math.floor(p.x), tz = Math.floor(p.z);
    if (tx < 0 || tz < 0 || tx >= m.w || tz >= m.h) return false;
    const t = m.ground[tz * m.w + tx];
    return t === TT.PLANK_H || (this.state.flags.bridgeFixed && this.bridgeTiles.has(tx + ',' + tz));
  }

  surfaceAt(p) {
    if (this.mapId !== 'overworld') return 'floor';
    const t = this.tileAt(p.x, p.z);
    if (this.onPier(p) || (this.big && this.big.onDeck(p.x, p.z) && !this.big.inValley(p.x, p.z))) return 'wood';
    return TINFO[t] ? TINFO[t].step : 'grass';
  }

  handleInput(dt) {
    const input = this.input, s = this.state;
    // hotbar
    for (let i = 1; i <= HOTBAR; i++) if (input.pressed('hot' + i)) this.selectHot(i - 1);
    if (input.pressed('hotPrev') || input.mouse.wheel < 0) this.selectHot((s.hot + HOTBAR - 1) % HOTBAR);
    if (input.pressed('hotNext') || input.mouse.wheel > 0) this.selectHot((s.hot + 1) % HOTBAR);
    if (input.mouse.pressed) {
      for (const r of this.hud.hotRects) if (input.mouseIn(r.x, r.y, r.w, r.h)) { this.selectHot(r.i); input.mouse.pressed = false; }
    }
    // the HUD's display: V / LT / the phone, or a click (a tap) on the minimap or the quest
    if (input.pressed('hud') || (input.mouse.pressed && (this.hud.hudRects || []).some((r) => input.mouseIn(r.x, r.y, r.w, r.h)))) {
      input.mouse.pressed = false;
      this.hud.cycleMode();
      audio.sfx('select', { volume: 0.5 });
    }
    if (input.pressed('pause')) { this.menu.show('pause'); return; }
    if (input.pressed('menu')) { this.menu.showLast(); return; }
    if (input.pressed('journal')) { this.menu.show('quests'); return; }
    if (input.pressed('map')) { this.menu.show('map'); return; }
    if (input.pressed('hero')) { this.menu.show('hero'); return; }
    if (input.pressed('bike')) this.toggleBike();
    // (swimming or in a boat, the valley's doors & chats wait until you're back on land)
    this.focus = this.fishing.active || (this.wild && this.mapId === 'overworld' && this.wild.afloat()) ? null : this.findInteraction();
    // (mid-fight or at a treasure chest, E is for the wild lands: the pet's cuddle can wait)
    if (this.focus && this.focus.kind === 'pet' && this.wild && this.mapId === 'overworld' && this.wild.busyHands()) this.focus = null;
    // walking into a door (or out of a room) uses it automatically
    const f = this.focus;
    if (f && ((f.kind === 'door' && input.down('up')) || (f.kind === 'exit' && input.down('down')))) {
      this.doorPush = (this.doorPush || 0) + dt;
      if (this.doorPush > 0.16) { this.doorPush = 0; this.run(() => this.doInteraction(f)); return; }
    } else this.doorPush = 0;
    if ((input.pressed('interact') || (input.mouse.pressed && this.focus && this.mouseNear(this.focus))) && this.focus && this.player.lock <= 0) {
      input.consume('interact');
      const it = this.focus;
      this.run(() => this.doInteraction(it));
    }
    // pick up placed furniture at home (a right click, or the special button: F · X on a gamepad)
    if (this.mapId === 'home' && (input.mouse.rpressed || input.pressed('special'))) {
      const e = this.placedAhead();
      if (e) this.pickUpFurniture(e);
    }
  }

  // the furniture you placed at home, right in front of you (it can go back in the bag)
  placedAhead() {
    if (this.mapId !== 'home' || !this.maps.home) return null;
    const fp = this.player.facingPoint;
    return this.maps.home.room.furniture.find((f) => f.def.placed && Math.hypot(f.def.x - fp.x, f.def.z - fp.z) < 0.8) || null;
  }

  // "Get unstuck" (Settings, or the phone's menu): the nearest open ground —
  // else, out in the wild, the nearest waystone; indoors, the door
  unstick() {
    const p = this.player, W = this.wild && this.mapId === 'overworld' ? this.wild : null;
    if (this.busy > 0 || this.cinematic || this.sail || this.fishing.active) return false;
    if (W && W.me.vehicle) W.vehicles.leave(W.me, true);
    if (W && W.me.mount) W.mounts.dismount(W.me, true);
    const B = W && W.combat && W.combat.bounds, col = this.maps[this.mapId].collision, room = this.mapId === 'overworld' ? 40 : 8;
    const ok = B ? (x, z) => ((x - B.x) / B.rx) ** 2 + ((z - B.z) / B.rz) ** 2 < 0.9 : null;
    // (really stuck: the nearest open ground; seemingly free but still asking: somewhere safe)
    const stuck = !(W && W.afloat()) && stuckAt(col, p.pos.x, p.pos.z, { ok, room });
    let s = stuck || B ? findUnstuck(col, p.pos.x, p.pos.z, { ok, room }) : null;
    if (!s && W) s = W.safeSpot();
    if (!s && this.mapId !== 'overworld') { const d = INTERIORS[this.mapId]; s = { x: d.door + 0.5, z: d.d - 1.2 }; }
    if (!s) return false;
    this.fx.emit('smoke', p.pos.x, 0.6, p.pos.z, 8);
    p.pos = { x: s.x, z: s.z };
    p.jumpY = 0; p.jumpV = 0;
    this.snapCamera();
    this.fx.emit('sparkle', s.x, 1.2, s.z, 14, { color: '#ffd66b' });
    audio.sfx('poof', { volume: 0.6 });
    this.hud.toast(t('Unstuck! ♥'));
    if (this.stuckWatch) this.stuckWatch.reset();
    this.stuckOffer = false;
    return true;
  }

  mouseNear(focus) {
    const pr = this.r3d.project(focus.x, focus.y || 1, focus.z);
    const u = this.display.worldToUi(pr.x, pr.y);
    return Math.hypot(u.x - this.input.mouse.x, u.y - this.input.mouse.y) < 24;
  }

  toggleBike() {
    const s = this.state;
    const idx = s.bag.findIndex((b) => b && b.id === 'bike');
    if (idx < 0) { this.hud.toast(t('You don’t have a bicycle… yet.')); return; }
    if (this.mapId !== 'overworld') { this.hud.toast(t('No cycling indoors!')); return; }
    if (idx >= HOTBAR) {
      // bring it onto the hotbar, swapping with the current slot
      const cur = s.bag[s.hot];
      s.bag[s.hot] = s.bag[idx]; s.bag[idx] = cur;
      this.selectHot(s.hot);
      return;
    }
    if (s.hot === idx) this.selectHot(this.prevHot !== undefined && this.prevHot !== idx ? this.prevHot : (idx + 1) % HOTBAR);
    else { this.prevHot = s.hot; this.selectHot(idx); }
  }

  // (an action that needs something in hand takes it out by itself: onto the hotbar if it's
  // deeper in the bag, swapped with what's in hand)
  holdItem(id) {
    const s = this.state, idx = s.bag.findIndex((b) => b && b.id === id);
    if (idx < 0) return false;
    if (idx === s.hot) return true;
    if (idx >= HOTBAR) { const cur = s.bag[s.hot]; s.bag[s.hot] = s.bag[idx]; s.bag[idx] = cur; this.selectHot(s.hot); }
    else this.selectHot(idx);
    return true;
  }

  selectHot(i) {
    if (this.state.hot !== i) audio.sfx('select', { volume: 0.5 });
    this.state.hot = i;
    this.hud.hotChangedAt = this.hud.t;
  }

  // ------------------------------------------------------------------ draw
  draw() {
    const r3d = this.r3d, d = this.display, s = this.state;
    // (big hits & thunder out in the wild shake the camera a little)
    const sh = this.wild && this.mapId === 'overworld' ? this.wild.cam.shake : 0;
    r3d.setView(this.cam.x + (sh ? (Math.random() - 0.5) * sh * 0.8 : 0), this.cam.z + (sh ? (Math.random() - 0.5) * sh * 0.6 : 0), this.ppu);
    const hour = s.hour;
    if (this.mapId === 'overworld' && this.wild && this.wild.dungeons && this.wild.dungeons.soloLight(hour)) { /* a dungeon: lit like a dark room */ }
    else if (this.mapId === 'overworld') this.lighting.update(hour, r3d.target);
    else this.lighting.updateIndoor(hour, r3d.target, this.maps[this.mapId].room);
    if (this.wild) this.wild.fillSee();
    r3d.render();
    SEE.count.value = 0;
    const wctx = d.wctx;
    wctx.drawImage(r3d.canvas, 0, 0);
    // world-space 2D effects
    if (this.mapId === 'overworld') this.drawAmbientDots(wctx, r3d);
    this.fx.draw(wctx, r3d);
    if (this.wild) this.wild.drawWorld(wctx, 1 / 60);
    if (this.fishing.active && this.fishing.bobber.visible) {
      const a = r3d.project(this.player.pos.x + this.player.dir.x * 0.4, 1.0 + (this.player.baseY || 0), this.player.pos.z + this.player.dir.z * 0.4);
      const b = r3d.project(this.fishing.bobber.position.x, this.fishing.bobber.position.y + 0.05, this.fishing.bobber.position.z);
      wctx.fillStyle = 'rgba(240,240,250,0.8)';
      const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y));
      for (let i = 0; i <= n; i += 1) {
        const t = i / n;
        wctx.fillRect(Math.round(a.x + (b.x - a.x) * t), Math.round(a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * 4), 1, 1);
      }
    }
    const drift = this.mapId === 'overworld' ? this.drift : null;
    const snowy = drift && drift.kind === 'snow' ? drift.level : 0;
    if (this.mapId === 'overworld') this.fx.drawRain(wctx, d.ww, d.wh, 1 / 60, s.weather === 'rain' ? 1 - snowy : 0);
    this.fx.drawDrift(wctx, d.ww, d.wh, 1 / 60, drift && drift.kind, drift ? drift.level * (drift.kind === 'snow' && s.weather === 'rain' ? 1.6 : 1) : 0);
    if (this.fadeA > 0) {
      wctx.fillStyle = `rgba(20,14,28,${this.fadeA})`;
      wctx.fillRect(0, 0, d.ww, d.wh);
    }
    // ---- UI layer
    const ctx = d.ctx;
    ctx.clearRect(0, 0, d.w, d.h);
    if (this.fadeA < 1) this.drawWorldUi(ctx);
    if (this.wild && this.fadeA < 1) this.wild.drawUi(ctx);
    const stage = this.wild && this.wild.stage;
    if (!this.cinematic && this.fadeA < 0.99) this.hud.draw(ctx);
    else if ((this.sail || (stage && stage.active)) && this.fadeA < 0.99) this.hud.drawBanner(ctx);
    if (stage) stage.draw(ctx, d.w, d.h);
    this.fishing.draw(ctx);
    if (this.menu.open) this.menu.draw(ctx);
    if (this.shop.open_) this.shop.draw(ctx);
    this.dialogue.draw(ctx);
  }

  toUi(x, y, z) {
    const p = this.r3d.project(x, y, z);
    return this.display.worldToUi(p.x, p.y);
  }

  drawWorldUi(ctx) {
    const s = this.state;
    // villager name tags when close & emotes
    for (const n of this.npcs) {
      if (n.map !== this.mapId || n.hidden) continue;
      const h = n.def.kid ? 1.35 : 1.6;
      const u = this.toUi(n.pos.x, h + (n.baseY || 0), n.pos.z);
      if (n.emoteKind) drawEmote(ctx, u.x, u.y - 2, n.emoteKind, this.t);
      const dist = Math.hypot(n.pos.x - this.player.pos.x, n.pos.z - this.player.pos.z);
      const focused = this.focus && this.focus.npc === n;
      if (dist < 3.2 && !focused && !n.emoteKind && !this.dialogue.active && !this.menu.open) {
        const nm = n.def.short;
        const w = measure(nm) + 6;
        ctx.fillStyle = 'rgba(30,20,36,0.55)';
        ctx.fillRect(Math.round(u.x - w / 2), Math.round(u.y - 12), w, 10);
        drawText(ctx, nm, u.x, u.y - 11, { color: '#fff7e6', align: 'center' });
      }
    }
    for (const c of this.chat || []) {
      const n = c.npc;
      if (n.map !== this.mapId || n.hidden || this.dialogue.active || this.menu.open) continue;
      const u = this.toUi(n.pos.x, (n.def.kid ? 1.35 : 1.6) + (n.baseY || 0), n.pos.z);
      ctx.globalAlpha = Math.min(1, c.t * 3, (3.2 - c.t) * 6);
      bubble(ctx, u.x, u.y - 12, t(c.text, c.vars));
      ctx.globalAlpha = 1;
    }
    if (this.pet.emoteKind && this.pet.map === this.mapId) {
      const u = this.toUi(this.pet.pos.x, 0.8, this.pet.pos.z);
      drawEmote(ctx, u.x, u.y, this.pet.emoteKind, this.t);
    }
    if (this.playerEmoteKind) {
      const u = this.toUi(this.player.pos.x, 1.65 + (this.player.baseY || 0), this.player.pos.z);
      drawEmote(ctx, u.x, u.y, this.playerEmoteKind, this.t);
    }
    // quest arrow at the screen edge when the target is off-screen
    const tgt = this.questTarget();
    if (tgt && tgt.map === this.mapId && !this.cinematic && !this.dialogue.active) {
      const u = this.toUi(tgt.x, 0.5, tgt.z);
      const W = this.display.w, H = this.display.h, m = 18;
      const inside = u.x > m && u.y > m + 30 && u.x < W - m && u.y < H - m - 30;
      if (!inside) {
        const cx = W / 2, cy = H / 2;
        const ang = Math.atan2(u.y - cy, u.x - cx);
        const ex = clamp(cx + Math.cos(ang) * W, m + 6, W - m - 6), ey = clamp(cy + Math.sin(ang) * H, m + 40, H - m - 40);
        this.drawArrow(ctx, ex, ey, ang);
      } else if (!tgt.soft) {
        const bob = Math.round(Math.sin(this.t * 4) * 2);
        drawText(ctx, '↓', u.x, u.y - 34 + bob, { color: '#f2b63d', align: 'center', outline: '#3b2a2e' });
      }
    }
    // interaction prompt
    if (this.focus && !this.dialogue.active && !this.menu.open && !this.shop.open_ && !this.busy && !this.cinematic) {
      const f = this.focus;
      const u = this.toUi(f.x, (f.y || 1) + (this.mapId === 'overworld' && this.onPier({ x: f.x, z: f.z }) ? 0.2 : 0), f.z);
      const label = t(f.label);
      // (a low thing just below the hero — soil, a seedling: the prompt under it, not over the hero)
      const py = (f.y || 1) <= 0.8 && f.z > this.player.pos.z + 0.4 ? u.y + 6 : u.y - 16;
      if (this.input.touchMode) tag(ctx, u.x - (measure(label) + 8) / 2, py, label, '#2a1f33');
      else keyHint(ctx, u.x, py, ctl('interact'), label);
    }
    // (the hero seems stuck: a bubble over them — tap it, or the pause menu's first line)
    this.stuckRect = null;
    if (this.stuckOffer && !this.dialogue.active && !this.menu.open && !this.shop.open_ && !this.busy && !this.cinematic && !this.game.overlay) {
      const p = this.player, u = this.toUi(p.pos.x, 2.1 + (p.baseY || 0) + (p.jumpY || 0), p.pos.z), dev = device();
      const label = dev === 'touch' ? t('Stuck? Tap here to get out') : dev === 'phone' ? t('Stuck? Get unstuck on your phone')
        : t('Stuck? {key} → Get unstuck', { key: ctl('pause') });
      const w2 = measure(label) + 12, x = Math.round(u.x - w2 / 2), y = Math.round(u.y - 30 + Math.sin(this.t * 3) * 1.5);
      button(ctx, x, y, w2, 14, label, { color: '#4f955a' });
      this.stuckRect = { x: x - 2, y: y - 2, w: w2 + 4, h: 18 };
    }
    // (placed furniture at home: it can go back in the bag)
    const pa = !this.dialogue.active && !this.menu.open && !this.busy && !this.input.touchMode && this.placedAhead();
    if (pa) { const u = this.toUi(pa.def.x, 0.2, pa.def.z); keyHint(ctx, u.x, u.y + 4, ctl('special'), t('Put away')); }
  }

  drawArrow(ctx, x, y, ang) {
    const pulse = 1 + Math.sin(this.t * 5) * 0.15;
    const pts = [[8, 0], [-5, -5], [-2, 0], [-5, 5]];
    const c = Math.cos(ang), s = Math.sin(ang);
    ctx.fillStyle = '#3b2a2e';
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) fillPoly(ctx, pts.map(([px, py]) => [x + dx + (px * c - py * s) * pulse, y + dy + (px * s + py * c) * pulse]));
    ctx.fillStyle = '#f2b63d';
    fillPoly(ctx, pts.map(([px, py]) => [x + (px * c - py * s) * pulse, y + (px * s + py * c) * pulse]));
  }

  // save now: where you are (out of instanced places), the file, a word in the corner
  save(why = 'manual') {
    if (!this.player) return false;
    this.syncState();
    const ok = saveGame(this.state);
    this.savedAt = performance.now();
    this.autoT = 0;
    if (why !== 'quiet') this.hud.saving(ok);
    return ok;
  }

  // a save now and then while you play (every two minutes, and after a quest step), never
  // mid-scene, mid-chat, in a menu or in a fight
  autosave(dt) {
    this.autoT = (this.autoT || 0) + dt;
    const due = this.autoT > 120 || (this.saveSoon && this.autoT > 2);
    if (!due || this.busy || this.cinematic || this.dialogue.active || this.menu.open || this.game.overlay || this.sail || this.fishing.active) return;
    if (this.wild && this.wild.fighting && this.wild.fighting()) return;
    this.saveSoon = false;
    this.save('auto');
  }

  // snapshot position into state (for saving)
  syncState() {
    const s = this.state, p = this.player;
    s.player.map = p.map;
    s.player.x = p.pos.x; s.player.z = p.pos.z;
    if (this.wild && this.wild.big) this.wild.beforeSave();
    // (saved in a dungeon: you'll wake at its door — the instance is built when you walk in)
    const out = this.wild && p.map === 'overworld' && this.wild.resumeSpot();
    if (out) { s.player.x = out.x; s.player.z = out.z; }
    if (this.sail) {
      // saved mid-crossing: resume on the dock we sailed from
      const from = s.flags.ferryAt === 'island' ? FERRY.island : FERRY.village;
      s.player.map = 'overworld'; s.player.x = from.standX; s.player.z = from.standZ;
    }
    s.player.facing = Math.atan2(p.dir.x, p.dir.z);
  }
}

// Cloud density (grey in R), tiling every CLOUD_SPAN world units.
const CLOUD_SPAN = 256;
function makeCloudTexture() {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(S, S);
  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const vn = (x, y, p) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const w = (a) => ((a % p) + p) % p;
    const a = hash(w(xi), w(yi)), b = hash(w(xi + 1), w(yi)), c = hash(w(xi), w(yi + 1)), d = hash(w(xi + 1), w(yi + 1));
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const v = vn(x / 32, y / 32, S / 32) * 0.65 + vn(x / 16, y / 16, S / 16) * 0.35;
    const i = (y * S + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.round(v * 255); img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  return t;
}

function fillPoly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(Math.round(pts[0][0]), Math.round(pts[0][1]));
  for (const [x, y] of pts.slice(1)) ctx.lineTo(Math.round(x), Math.round(y));
  ctx.closePath();
  ctx.fill();
}

function collectLampMats(root) {
  const out = [];
  root.traverse((m) => {
    if (m.isMesh && m.material && m.material.emissive && m.material.emissive.getHex() === 0xffc15a && !out.includes(m.material)) out.push(m.material);
  });
  return out;
}

const FOREST_AREAS = ['Whisperwood', 'Whisperwood Camp', 'Old Oak Shrine', 'Glowcap Grove', 'Waterfall Lake', 'Mirror Pond', 'Maple Hollow', 'Reedmarsh'];

const CHATTER = {
  merchant: ['Treasures! Trinkets!', 'Fresh from the road!', 'Rare finds, fair prices!', 'Sundays are for shopping!'],
  hollis: ['Splendid day!', 'Now where’s my pen…', '*hums the town song*', 'Mind the flowers!'],
  rosa: ['Fresh buns at noon!', 'Pip! Shoes on!', 'Mmm, cinnamon…', 'Flour everywhere…'],
  pip: ['Race you!', 'I found a cool rock!', 'Adventure time!', 'Look, a beetle!'],
  finn: ['Tide’s turning.', 'Fish are biting…', 'Good wind today.', 'Hey.'],
  ivy: ['Tulips are up!', 'Hello, sunshine!', 'Smell that? Spring.', 'Water your seeds!'],
  theo: ['Measure twice…', 'Need more coffee.', 'Nice grain on this.', 'Hm.'],
  mabel: ['Shh… reading.', 'What a plot twist!', 'Good day, dear.', 'Where’s my bookmark?'],
  sol: ['♪ la la laa ♪', 'New song idea!', 'Hey, friend!', 'Latte time?'],
  wren: ['That light…', 'Hmm, more blue.', 'Oh! Hi…', '*sketches quietly*'],
  bram: ['Morning, neighbor!', 'Buttercup, no!', 'Good soil, this.', 'Bees are busy!'],
  juniper: ['Was that an owl?', 'Leave no trace!', 'Hi, trail buddy!', 'Ooh, a mushroom!'],
  marlo: ['Fair winds!', 'Tide’s kind today.', 'Ahoy there!', 'Mind the gulls.'],
};

const PROP_LABEL = {
  sign: 'Read', mailbox: 'Check mail', shipping: 'Ship items', board: 'Read board', fountain: 'Make a wish', well: 'Peek', stall: 'Look',
  ferry: 'Board ferry', tent: 'Nap', campfire: 'Warm up', shrine: 'Ring bell', telescope: 'Stargaze', gazebo: 'Rest', scarecrow: 'Look',
  beehive: 'Listen', grotto: 'Explore', bandstand: 'Listen', snowman: 'Look', hollowlog: 'Peek',
};
const PROP_REACH = { hollowlog: 1.0, snowman: 0.3, fountain: 1.3, well: 0.7, board: 0.5, ferry: 1.6, tent: 0.9, campfire: 0.5, shrine: 0.6, gazebo: 1.2, grotto: 1.0, beehive: 0.2 };
const PROP_Y = { board: 1.7, ferry: 1.6, gazebo: 2.0, tent: 1.5, shrine: 1.6, telescope: 1.5, grotto: 1.8, campfire: 0.9 };
const FURN_LABEL = { musicbox: 'Wind up', bed: 'Sleep', note: 'Read', wardrobe: 'Wardrobe', books: 'Browse', sit: 'Sit', radio: 'Listen', piano: 'Play', lens: 'Examine', cow: 'Pet', chicken: 'Pet', nest: 'Collect eggs', millstone: 'Look', chest: 'Open', telescope: 'Stargaze' };
const INTERIOR_LABEL = (b) => (b.id === 'home' ? 'Go inside' : 'Enter');
export function ITEM_FURN(id) {
  const d = ITEMS[id];
  const map = {
    table: { type: 'table' }, chair: { type: 'chair' }, rug: { type: 'rug', color: '#b9a2e3' }, plant: { type: 'plant' },
    lamp: { type: 'lamp' }, shelf: { type: 'shelf', w: 1.2, kind: 'books' }, sofa: { type: 'sofa', color: '#d06b8e' },
    tank: { type: 'tank' }, radio: { type: 'radio' }, teddy: { type: 'teddy' }, petbed: { type: 'petbed' },
    painting: { type: 'painting', kind: 'meadow' }, candles: { type: 'candles' }, vase: { type: 'vase' },
    dresser: { type: 'dresser' }, strings: { type: 'candles' }, globe: { type: 'globe' }, piano: { type: 'piano' },
    shipbottle: { type: 'shipbottle' }, haybale: { type: 'haypile', w: 1 }, telescope: { type: 'hometelescope' },
    minilight: { type: 'minilight' }, musicbox: { type: 'musicbox' }, lanternset: { type: 'lanternset' }, terrarium: { type: 'terrarium' },
  };
  return { ...(map[d && d.furn] || { type: 'plant' }) };
}
