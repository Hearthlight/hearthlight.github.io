// The Party Mode adventure: "The Starfall Festival". A shared story told on
// the big screen — votes happen on everyone's phone, the villagers host the
// mini-games, and the whole party wins the five Star Charms back together.

import { THREE, toon } from '../render/r3d.js';
import { drawText, wrap } from '../engine/font.js';
import { panel, UI, tc } from '../ui/ui.js';
import { audio } from '../engine/audio.js';
import { t, tn, num } from '../i18n.js';
import { NPCS } from '../data/npcs.js';
import { GAMES } from './games.js';
import { POINTS } from '../world/overworld.js';

const FOUNTAIN = { x: POINTS.fountain[0], z: POINTS.fountain[1] };
export const LANTERN = { x: FOUNTAIN.x - 5, z: FOUNTAIN.z + 1.2 };
const HOME = { x: FOUNTAIN.x - 2.2, z: FOUNTAIN.z + 3.6 };

// Text here stays English (it is the i18n key) and goes through t() where it
// is shown; `find` is the travel objective, whole so each language can say
// "at <place>" its own way.
export const CHAPTERS = [
  {
    id: 'hens', place: 'Honeydew Fields', host: 'bram', charm: 'Sun Charm', color: '#f4c542', icon: '☀',
    spot: [29, 52.4], hostAt: [33.2, 51], arena: [29.5, 52], bounds: { rx: 12.5, rz: 3.9 }, start: [30, 52.6], coop: [21.5, 51.6],
    find: 'Find Bram at Honeydew Fields',
    time: 75, title: 'Hen Round-Up', hint: 'Catch the hens, carry them to the coop',
    rules: ['The hens got out of the coop!', 'A: grab a hen · carry it to the coop', 'A golden hen shows up halfway: worth 3!'],
    hello: 'Howdy, friends! The storm scared my hens clean out of the coop, and your Sun Charm is tangled up in all the fuss.',
    thanks: 'Every last hen home! Here — the Sun Charm. It was in Buttercup’s water trough, of all places.',
  },
  {
    id: 'snow', place: 'Frostpine Ridge', host: 'juniper', charm: 'Frost Charm', color: '#9fd0f5', icon: '❄',
    spot: [211, 28.5], hostAt: [206.5, 31], arena: [213, 25.6], bounds: { rx: 11.5, rz: 6.2 }, start: [213, 27.5],
    find: 'Find Juniper at Frostpine Ridge',
    time: 60, title: 'Snowball Scramble', hint: 'Throw snowballs · jump to dodge',
    rules: ['Snowball fight on the frozen pond!', 'A: throw (it aims for you a little) · B: jump to dodge', 'Hit friends or snowmen: +1 each. The ice is slippy!'],
    hello: 'Oh hey, trail buddies! The Frost Charm froze into the pond — I chipped it out, but a ranger’s gotta have a little fun first…',
    thanks: 'Ha! Best snowball fight the ridge has ever seen. The Frost Charm’s all yours!',
  },
  {
    id: 'acorns', place: 'Maple Hollow', host: 'ivy', charm: 'Leaf Charm', color: '#e8883a', icon: '♣',
    spot: [21, 19.5], hostAt: [25.2, 21.2], arena: [21, 15.2], bounds: { rx: 12, rz: 6.8 }, start: [21, 18.5],
    find: 'Find Ivy at Maple Hollow',
    time: 60, title: 'Acorn Hunt', hint: 'Jump into leaf piles to find acorns',
    rules: ['The squirrels hid their acorns in the leaf piles!', 'B: jump INTO a pile to search it', 'Acorns +1 · golden acorns +3 · piles grow back'],
    hello: 'Hello hello! The wind blew the Leaf Charm into one of these piles… along with every acorn in the valley. Let’s dig!',
    thanks: 'Found it! Well, you found it — about forty acorns, and the Leaf Charm. The squirrels send their thanks.',
  },
  {
    id: 'koi', place: 'Blossom Glade', host: 'finn', charm: 'Koi Charm', color: '#f59ac8', icon: '♥',
    spot: [213, 67.4], hostAt: [207.6, 66.4], arena: [213, 62], bounds: { rx: 10.5, rz: 6.6 }, start: [213, 67],
    find: 'Find Finn at Blossom Glade',
    time: 70, title: 'Koi Catch', hint: 'Cast, wait for the buzz, then press A!',
    rules: ['A koi swallowed the Koi Charm (don’t worry, it spat it out).', 'A: cast into the pond · wait for your phone to BUZZ', 'Then A, quick! Golden koi +3 · the ancient koi +5'],
    hello: 'Oh — hi. So, uh, a koi swallowed the charm. It’s fine now. But Grandpa always said: first you fish, then you get the prize.',
    thanks: 'Not bad at all. Grandpa would’ve liked you lot. Here’s the Koi Charm.',
  },
  {
    id: 'stones', place: 'the Standing Stones', host: 'mabel', charm: 'Star Charm', color: '#b88cf0', icon: '★',
    spot: [130, 66], hostAt: [126.4, 66.8], arena: [130, 62.6], bounds: { rx: 8.6, rz: 5.6 }, start: [130, 65.8], coop: true,
    find: 'Find Mabel at the Standing Stones',
    time: 75, title: 'Star Stones', hint: 'Everyone on a glowing star!', teamGame: true,
    rules: ['The old stones only open for friends who move as one.', 'Every player stands on a glowing star at once (3 rounds)', 'Then everybody JUMP together!'],
    hello: 'Ah, the Star Charm rests in the stone circle, as it has for three hundred years. The legend says it answers only to togetherness.',
    thanks: 'Remarkable. The stones have not sung like that since I was a girl. Take the Star Charm, dears.',
  },
];

const HOLLIS_BITS = [
  'Chop chop, friends! The stars wait for no one.',
  'Oh! Have you tried the festival buns? Rosa made three hundred.',
  'If anyone asks, the Sky Lantern was my idea. It was not.',
];
const CHATTER = {
  hollis: HOLLIS_BITS,
  bram: ['Buttercup says hi!', 'Hens are just tiny dinosaurs, y’know.'],
  juniper: ['Brrr! Love it up here.', 'Owls are the best listeners.'],
  ivy: ['Leaves are just flowers that got tired!', 'Jump in, it’s the rules!'],
  finn: ['…Nice weather for it.', 'Koi remember faces. Be nice.'],
  mabel: ['Three hundred years, these stones.', 'Legends are just stories that stuck around.'],
};

export class PartyStory {
  constructor(party) {
    this.party = party;
    this.target = null;
    this.objective = '';
    this.music = null;
    this.done = new Set();
    this.charms = [];
    this.game = null;
    this.overlay = null;       // rules | countdown | results | awards
    this.dust = [];
    this.gatherInfo = null;
    this.stats = new Map();
    party.lantern.reset();
  }

  get world() { return this.party.world; }

  lightCharm(id) { this.party.lantern.lightCharm(id); }

  // ------------------------------------------------------------------ the script
  start() { this.run().catch((e) => console.error('party story', e)); }

  async run() {
    await this.intro();
    while (this.done.size < CHAPTERS.length) {
      const ch = await this.chooseNext();
      await this.travelTo(ch);
      await this.challenge(ch);
      if (this.disposed) return;
    }
    await this.finale();
  }

  // (debug) straight to one chapter, skipping the intro & vote
  async debugChapter(id) {
    const ch = CHAPTERS.find((c) => c.id === id);
    await this.travelTo(ch);
    await this.challenge(ch);
  }

  names() {
    const ps = this.party.players.map((p) => `{npc}${p.name}{/}`);
    if (ps.length <= 1) return ps[0] || t('friend');
    return t('{list} and {last}', { list: ps.slice(0, -1).join(', '), last: ps[ps.length - 1] });
  }

  async intro() {
    const P = this.party;
    P.busy++;
    await P.fadeTo(1, 0.4);
    const h = P.spawnNpc('hollis', LANTERN.x + 1.6, LANTERN.z + 2.4, { x: 0, z: 1 });
    h.restDir = { x: 0.3, z: 1 };
    P.gatherAt(HOME.x, HOME.z + 1.2, 2.2);
    for (const p of P.players) p.actor.face(h.pos.x, h.pos.z);
    this.state().hour = 9.5;
    await P.fadeTo(0, 0.6);
    P.showBanner(t('The Starfall Festival'), t('a Hearthlight party adventure'));
    audio.sfx('bell', { volume: 0.6 });
    await P.wait(1.6);
    h.setEmote('exclaim', 1.2);
    await P.say('hollis', 'Welcome, welcome! {names} — you made it for the Starfall Festival!', { vars: { names: this.names() } });
    await P.say('hollis', 'Tonight the whole cove sends up the great Sky Lantern, so this year’s falling stars can find their way home.');
    await P.say('hollis', 'But last night’s storm tore the five Star Charms right off it and flung them all over the valley!');
    await P.say('hollis', 'Our neighbours found every one — and they won’t hand them back without a little friendly challenge. It’s tradition.');
    await P.say('hollis', 'Bring all five charms home before the stars fall. And do stick together… ish!');
    this.chatNpcs = ['hollis'];
    P.busy = Math.max(0, P.busy - 1);
  }

  state() { return this.party.state; }

  async chooseNext() {
    const left = CHAPTERS.filter((c) => !this.done.has(c.id));
    if (left.length === 1) return left[0];
    const i = await this.ask(this.done.size ? t('{n}/5 charms home! Where to next?', { n: this.done.size }) : t('Where shall we look first?'),
      left.map((c) => ({ label: t(c.place), sub: `${t(NPCS[c.host].short)} · ${t(c.title)}`, color: c.color })));
    return left[i];
  }

  ask(title, options, time = 22) { return this.party.ask(title, options, time); }

  // ------------------------------------------------------------------ travel
  async travelTo(ch) {
    const P = this.party;
    const host = P.spawnNpc(ch.host, ch.hostAt[0], ch.hostAt[1], { x: 0, z: 1 });
    host.setEmote('exclaim', 2.5);
    this.target = { x: ch.spot[0], z: ch.spot[1] };
    this.objective = ch.find;   // English: translated where it is shown
    this.music = null;
    this.spawnDust(P.centroid(), this.target);
    this.setBeacon(this.target);
    await this.gather(this.target, 7.5);
    this.target = null;
    this.setBeacon(null);
    this.clearDust();
  }

  gather(at, r) {
    return new Promise((resolve) => { this.gatherInfo = { at, r, resolve, wait: 0 }; });
  }

  updateGather(dt) {
    const G = this.gatherInfo, P = this.party;
    const live = P.players.filter((p) => p.connected);
    const here = live.filter((p) => Math.hypot(p.pos.x - G.at.x, p.pos.z - G.at.z) < G.r);
    G.here = here.length; G.total = live.length;
    G.late = live.filter((p) => !here.includes(p));
    if (live.length && here.length === live.length) {
      G.wait += dt;
      if (G.wait > 0.4) { this.gatherInfo = null; G.resolve(); }
    } else G.wait = 0;
  }

  // a warm column of light over where we're headed
  setBeacon(at) {
    const root = this.world.over.root;
    if (this.beacon) { root.remove(this.beacon); this.beacon = null; }
    if (!at) return;
    const g = new THREE.Group();
    g.position.set(at.x, 0, at.z);
    const soft = { transparent: true, depthWrite: false };
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.4, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xf2b63d, opacity: 0.8, ...soft }));
    ring.position.y = 0.04;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.9, 7, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xffc94a, opacity: 0.22, side: THREE.DoubleSide, ...soft }));
    beam.position.y = 3.5;
    g.add(ring, beam);
    g.userData = { ring, beam };
    root.add(g);
    this.beacon = g;
  }
  // a trail of stardust along the way: anyone can grab it
  spawnDust(from, to) {
    this.clearDust();
    const w = this.world;
    const geo = new THREE.OctahedronGeometry(0.16, 0);
    const mat = toon(this.party.r3d, { color: 0xfff3a6, emissive: 0xffc94a, emissiveIntensity: 0.9, key: 'stardust' });
    const dx = to.x - from.x, dz = to.z - from.z, L = Math.hypot(dx, dz);
    const n = Math.min(26, Math.floor(L / 4));
    for (let i = 1; i < n; i++) {
      const k = i / n;
      let x = from.x + dx * k + (Math.random() - 0.5) * 7, z = from.z + dz * k + (Math.random() - 0.5) * 5;
      let ok = false;
      for (let tries = 0; tries < 12 && !ok; tries++) {
        if (w.overCol.blocked(x, z, 0.3) || w.tileAt(x, z) === 6) { x = from.x + dx * k + (Math.random() - 0.5) * 9; z = from.z + dz * k + (Math.random() - 0.5) * 6; }
        else ok = true;
      }
      if (!ok) continue;
      const m = new THREE.Mesh(geo, mat);
      m.scale.set(1, 1.3, 0.45);
      m.position.set(x, 0.7, z);
      w.over.root.add(m);
      this.dust.push({ x, z, m, ph: Math.random() * 6 });
    }
  }

  clearDust() { for (const d of this.dust) this.world.over.root.remove(d.m); this.dust = []; }

  updateDust(dt) {
    const P = this.party, t = P.t;
    for (const d of this.dust) {
      d.m.rotation.y += dt * 2.5;
      d.m.position.y = 0.7 + Math.sin(t * 3 + d.ph) * 0.12;
      for (const p of P.players) {
        if (Math.hypot(p.pos.x - d.x, p.pos.z - d.z) < 0.7) {
          d.got = true;
          this.stat(p, 'dust');
          this.world.fx.emit('sparkle', d.x, 0.8, d.z, 7, { color: '#fff3a6' });
          audio.sfx('coin', { volume: 0.35 });
          P.buzz(p, 12);
          break;
        }
      }
    }
    for (const d of this.dust) if (d.got) this.world.over.root.remove(d.m);
    this.dust = this.dust.filter((d) => !d.got);
  }

  stat(p, k, n = 1) {
    let s = this.stats.get(p.slot);
    if (!s) { s = {}; this.stats.set(p.slot, s); }
    s[k] = (s[k] || 0) + n;
  }
  statOf(p, k) { const s = this.stats.get(p.slot); return (s && s[k]) || 0; }

  // ------------------------------------------------------------------ challenges
  async challenge(ch) {
    const P = this.party;
    P.busy++;
    const host = P.npcs.find((n) => n.id === ch.host);
    if (host) { for (const p of P.players) p.actor.face(host.pos.x, host.pos.z); host.lookAt = P.centroid(); }
    this.music = 'festival';
    await P.say(ch.host, ch.hello);
    const Game = GAMES[ch.id];
    const game = new Game(P, ch);
    await P.fadeTo(1, 0.35);
    this.game = game;
    game.setup();
    if (host) { host.pos = { x: ch.hostAt[0], z: ch.hostAt[1] }; host.restDir = { x: game.center.x - host.pos.x, z: game.center.z - host.pos.z }; }
    await P.fadeTo(0, 0.35);
    P.busy = Math.max(0, P.busy - 1);
    await this.rulesCard(game);
    await this.countdown();
    game.begin();
    await new Promise((res) => { this.gameDone = res; });
    audio.sfx('whistle', { volume: 0.8 });
    P.showBanner(game.left > 0.05 ? t('Challenge complete!') : t('Time’s up!'), '');
    await P.wait(1.4);
    P.busy++;
    const res = game.results();
    const awards = this.awardStars(game, res);
    await this.resultsCard(game, res, awards);
    await P.fadeTo(1, 0.35);
    game.dispose();
    this.game = null;
    P.gatherAt(ch.spot[0], ch.spot[1], 2);
    if (host) { host.pos = { x: ch.hostAt[0], z: ch.hostAt[1] }; for (const p of P.players) p.actor.face(host.pos.x, host.pos.z); }
    this.music = null;
    await P.fadeTo(0, 0.35);
    await P.say(ch.host, ch.thanks);
    this.done.add(ch.id);
    this.charms.push(ch);
    this.lightCharm(ch.id);
    audio.jingle('shard');
    const hp = host ? host.pos : this.party.centroid();
    this.world.fx.emit('sparkle', hp.x, 1.6, hp.z, 24, { color: ch.color });
    P.showBanner(t('{charm} recovered!', { charm: t(ch.charm) }), t('{n} of 5 Star Charms', { n: this.charms.length }));
    this.state().hour = Math.min(19.2, 9.5 + this.charms.length * 1.9);
    await P.wait(2.2);
    P.busy = Math.max(0, P.busy - 1);
    if (host) host.setEmote('heart', 2);
  }

  rulesCard(game) {
    return new Promise((resolve) => {
      this.overlay = { kind: 'rules', game, t: 0, ready: new Set(), resolve };
      audio.sfx('page', { volume: 0.6 });
    });
  }

  countdown() {
    return new Promise((resolve) => { this.overlay = { kind: 'count', t: 0, resolve, last: 4 }; });
  }

  // stars: 3/2/1 for the podium, 1 for anyone who scored; team games share
  awardStars(game, res) {
    const out = new Map();
    if (game.def.teamGame) {
      const n = game.success ? 3 : Math.max(1, (game.round || 1) - 1);
      for (const r of res) out.set(r.p.slot, n);
    } else {
      const vals = [...new Set(res.map((r) => r.pts))].sort((a, b) => b - a);
      for (const r of res) {
        const rank = vals.indexOf(r.pts);
        out.set(r.p.slot, r.pts <= 0 ? 0 : rank === 0 ? 3 : rank === 1 ? 2 : 1);
      }
    }
    for (const r of res) { r.p.stars += out.get(r.p.slot) || 0; this.stat(r.p, game.def.id, r.pts); }
    for (const p of this.party.players) this.party.net.send(p.id, { t: 'score', v: `★ ${p.stars}` });
    return out;
  }

  resultsCard(game, res, awards) {
    return new Promise((resolve) => {
      this.overlay = { kind: 'results', game, res, awards, t: 0, resolve };
      audio.jingle('questDone');
      audio.sfx('cheer', { volume: 0.7 });
      for (let i = 0; i < 6; i++) this.world.fx.emit('firework', game.center.x + (Math.random() - 0.5) * 6, 3 + Math.random() * 2, game.center.z - 2 + Math.random() * 3, 20, { color: ['#ffd66b', '#f4a4b6', '#8fd6b4', '#9fd0f5'][i % 4] });
    });
  }

  // ------------------------------------------------------------------ finale
  async finale() {
    const P = this.party;
    this.objective = 'Head back to the plaza for the Sky Lantern!';   // English key, see travelTo
    this.target = { x: HOME.x, z: HOME.z };
    this.state().hour = Math.max(this.state().hour, 18.4);
    this.spawnDust(P.centroid(), this.target);
    this.setBeacon(this.target);
    await this.gather(this.target, 7);
    this.target = null;
    this.setBeacon(null);
    this.clearDust();
    P.busy++;
    await P.fadeTo(1, 0.8);
    this.state().hour = 20.3;
    for (const c of CHAPTERS) { const n = P.spawnNpc(c.host, LANTERN.x - 3.5 + CHAPTERS.indexOf(c) * 1.7, LANTERN.z + 5.2, { x: 0, z: -1 }); n.restDir = { x: 0, z: -1 }; }
    const h = P.spawnNpc('hollis', LANTERN.x + 1.6, LANTERN.z + 2.4, { x: 0, z: 1 });
    P.gatherAt(HOME.x, HOME.z + 1.2, 2.2);
    for (const p of P.players) p.actor.face(LANTERN.x, LANTERN.z);
    this.music = 'festival';
    await P.fadeTo(0, 1.0);
    await P.say('hollis', 'Look at that — all five Star Charms, home before the first star fell. Friends, you did it!');
    await P.say('hollis', 'Everyone together now… one, two, three!');
    h.setEmote('heart', 3);
    // the lantern rises
    this.party.lantern.rise();
    audio.jingle('lighthouse');
    await P.wait(2.2);
    for (let k = 0; k < 16; k++) {
      await P.wait(0.45);
      const x = LANTERN.x + (Math.random() - 0.5) * 16, z = LANTERN.z - 3 + Math.random() * 5;
      const col = ['#ffd66b', '#ec5f73', '#8fd6b4', '#b9a2e3', '#f6a05a'][k % 5];
      const y = 5 + Math.random() * 3;
      this.world.fx.emit('flash', x, y, z, 1, { color: col });
      this.world.fx.emit('firework', x, y, z, 40, { color: col });
      this.world.fx.emit('firework', x, y, z, 12, { color: '#fff7e6' });
      audio.sfx('firework', { volume: 0.6 });
      if (k % 4 === 0) for (const p of P.players) { p.setEmote(['heart', 'star', 'note', 'sparkle'][(k + p.slot) % 4], 1.4); p.actor.jumpV = 4.6; }
    }
    await P.wait(1);
    await this.awardsCard();
    await P.say('hollis', 'Same time next year? The stars will be waiting. Thank you for playing, friends!');
    const again = await this.ask(t('What now?'), [
      { id: 'stroll', label: t('Explore the valley together'), sub: t('a night stroll, no rush'), color: '#b88cf0' },
      { id: 'explore', label: t('Explore & adventure'), sub: t('roam the valley, clear the gloom'), color: '#8fd67a' },
      { id: 'again', label: t('Play again from the start'), sub: t('new votes, new winners'), color: '#4f955a' },
      { id: 'lobby', label: t('Back to the lobby'), sub: t('change outfits, invite friends'), color: '#4f73b6' },
    ], 30);
    P.busy = Math.max(0, P.busy - 1);
    if (again === 1) this.party.restartAdventure('explore');
    else if (again === 2) this.party.restartAdventure();
    else if (again === 3) this.party.backToLobby();
    else {
      this.freeRoam = true;
      this.music = null;
      this.objective = 'Free roam! Explore the valley together';
      for (const c of CHAPTERS) { const n = P.npcs.find((q) => q.id === c.host); if (n) { n.pos = { x: c.hostAt[0], z: c.hostAt[1] }; n.restDir = { x: 0, z: 1 }; } }
      P.showBanner(t('Free roam'), t('the big screen can press L to go back to the lobby'));
    }
  }

  // fun awards so everyone goes home with something
  awardsCard() {
    const P = this.party;
    const ps = P.players.slice();
    // titles are translated when drawn; unit(v) spells out the value
    const cats = [
      { k: 'stars', title: 'Star of the Festival', val: (p) => p.stars, unit: (v) => `${v} ★` },
      // English "stardust" has no plural: French finds its singular under "[one]"
      { k: 'dust', title: 'Stardust Collector', val: (p) => this.statOf(p, 'dust'), unit: (v) => (v === 1 ? tc('{n} stardust', 'one').replace('{n}', num(v)) : t('{n} stardust', { n: num(v) })) },
      { k: 'jumps', title: 'Hop Champion', val: (p) => this.statOf(p, 'jumps'), unit: (v) => tn('{n} hop', '{n} hops', v, { n: num(v) }) },
      { k: 'hens', title: 'Hen Whisperer', val: (p) => this.statOf(p, 'hens'), unit: (v) => tn('{n} hen', '{n} hens', v) },
      { k: 'snow', title: 'Snowball Sharpshooter', val: (p) => this.statOf(p, 'snow'), unit: (v) => tn('{n} hit', '{n} hits', v) },
      { k: 'acorns', title: 'Acorn Detective', val: (p) => this.statOf(p, 'acorns'), unit: (v) => tn('{n} acorn', '{n} acorns', v) },
      { k: 'koi', title: 'Koi Whisperer', val: (p) => this.statOf(p, 'koi'), unit: (v) => tn('{n} point', '{n} points', v) },
      { k: 'dist', title: 'Trailblazer', val: (p) => Math.round(this.statOf(p, 'dist')), unit: (v) => tn('{n} step', '{n} steps', v, { n: num(v) }) },
      { k: 'slide', title: 'Ice Dancer', val: (p) => Math.round(this.statOf(p, 'slide') * 10) / 10, unit: (v) => t('{n} s on ice', { n: num(v) }) },
      { k: 'friend', title: 'Best Friend', val: () => 1, unit: '' },
    ];
    // everyone gets the award they're best at (the biggest award goes first)
    const given = [];
    const free = new Set(ps.map((p) => p.slot));
    for (const c of cats) {
      if (!free.size) break;
      const cand = ps.filter((p) => free.has(p.slot));
      const best = cand.reduce((a, b) => (c.val(b) > c.val(a) ? b : a), cand[0]);
      if (!best || (c.k !== 'friend' && c.val(best) <= 0)) continue;
      given.push({ p: best, c, v: c.val(best) });
      free.delete(best.slot);
    }
    for (const slot of free) { const p = ps.find((q) => q.slot === slot); given.push({ p, c: { title: 'Heart of the Party', unit: '' }, v: '' }); }
    given.sort((a, b) => a.p.slot - b.p.slot);
    return new Promise((resolve) => { this.overlay = { kind: 'awards', given, t: 0, resolve }; audio.jingle('festival'); });
  }

  // ------------------------------------------------------------------ per-frame
  update(dt) {
    const P = this.party;
    if (this.disposed) return;
    if (this.gatherInfo) this.updateGather(dt);
    if (this.dust.length) this.updateDust(dt);
    if (this.game) {
      this.game.update(dt);
      if (this.game.ended && this.gameDone) { const r = this.gameDone; this.gameDone = null; r(); }
    }
    if (this.overlay) this.updateOverlay(dt);
    this.updateObjective(dt);
    if (this.beacon) {
      const b = this.beacon.userData, k = 1 + Math.sin(P.t * 3) * 0.06;
      b.ring.scale.set(k, 1, k);
      b.beam.rotation.y += dt * 0.5;
      b.beam.material.opacity = 0.2 + Math.sin(P.t * 2) * 0.05;
    }
    // stats for the awards
    for (const p of P.players) {
      const a = p.actor;
      if (a.moving) this.stat(p, 'dist', (a.speed || 0) * dt);
      if (a.sliding) this.stat(p, 'slide', dt);
    }
    // chatting with villagers you bump into (not during scenes)
    if (!P.busy && !P.dialogue.active && !this.game) {
      for (const p of P.players) {
        if (!p.input.pressed('a')) continue;
        const n = this.nearNpc(p);
        if (!n && this.freeRoam) { p.setEmote(['heart', 'note', 'star', 'sparkle'][Math.floor(Math.random() * 4)], 1.4); continue; }
        if (n) { const lines = CHATTER[n.id] || ['Happy Starfall!']; n.bubble = t(lines[Math.floor(Math.random() * lines.length)]); n.bubbleT = 2.6; n.lookAt = p.pos; n.talking = true; n.speaking = false; audio.blip(NPCS[n.id].voice || { pitch: 60, wave: 'triangle' }); }
      }
    }
    for (const n of P.npcs) if (n.bubbleT > 0 && (n.bubbleT -= dt) <= 0) { n.bubble = null; n.talking = false; }
  }

  // the big screen's objective card: it pops up when the goal changes (or
  // when someone arrives), then tucks away — phones keep it on screen
  updateObjective(dt) {
    const P = this.party, G = this.gatherInfo;
    const want = this.objective && !this.game && !(this.overlay && this.overlay.kind !== 'count') ? this.objective : '';
    if (!want) { this.objKey = ''; return; }
    const sub = G && G.total > 1 ? t('{n}/{total} here', { n: G.here, total: G.total }) + (G.late && G.late.length && G.late.length <= 3 ? ' · ' + t('waiting for {names}', { names: G.late.map((p) => p.name).join(', ') }) : '') : '';
    const key = want + '|' + (G ? G.here : '');
    this.remindT = (this.remindT || 0) - dt;
    if (key !== this.objKey) { P.showObjective(t(want), sub, want !== this.objLast ? 8 : 5); this.objKey = key; this.objLast = want; this.remindT = 75; }
    else if (this.remindT <= 0) { P.showObjective(t(want), sub, 5); this.remindT = 75; }
  }

  nearNpc(p) {
    let best = null, bd = 1.6;
    for (const n of this.party.npcs) { const d = Math.hypot(n.pos.x - p.pos.x, n.pos.z - p.pos.z); if (d < bd) { bd = d; best = n; } }
    return best;
  }

  updateOverlay(dt) {
    const o = this.overlay, P = this.party;
    o.t += dt;
    if (o.kind === 'rules') {
      for (const p of P.players) if (p.connected && p.input.pressed('a') && o.t > 0.6) { if (!o.ready.has(p.slot)) { o.ready.add(p.slot); audio.sfx('select', { volume: 0.5 }); p.setEmote('exclaim', 0.8); } }
      const live = P.players.filter((p) => p.connected);
      if ((live.length && live.every((p) => o.ready.has(p.slot))) || o.t > 18) { this.overlay = null; o.resolve(); }
    } else if (o.kind === 'count') {
      const n = Math.ceil(3 - o.t);
      if (n !== o.last && n > 0) { o.last = n; audio.sfx('tick', { volume: 0.9 }); }
      if (o.t >= 3 && !o.go) { o.go = true; audio.sfx('go'); for (const p of P.players) P.buzz(p, 60); }
      if (o.t >= 3.6) { this.overlay = null; o.resolve(); }
    } else if (o.kind === 'results' || o.kind === 'awards') {
      if ((o.t > 3 && P.anyPressed('interact')) || o.t > (o.kind === 'awards' ? 25 : 14)) { P.consume('interact'); this.overlay = null; o.resolve(); }
    }
  }

  // what each phone shows (English: party.js runs t() on a, b, x & hint + vars)
  ctxFor(p) {
    const P = this.party;
    if (this.overlay && this.overlay.kind === 'rules') return { a: this.overlay.ready.has(p.slot) ? null : 'Ready!', b: 'Hop', hint: this.overlay.game.def.rules[1] };
    if (this.overlay && this.overlay.kind === 'count') return { a: null, b: null, hint: 'Get ready…' };
    if (this.overlay && (this.overlay.kind === 'results' || this.overlay.kind === 'awards')) return { a: this.overlay.t > 3 ? 'Continue' : null, b: 'Hop', hint: 'You have ★ {n}', vars: { n: p.stars } };
    if (P.dialogue.active) return { a: 'Next', b: null, hint: 'Story time — look at the big screen!' };
    if (this.game) return this.game.ctxFor(p);
    if (this.gatherInfo) return { a: this.nearNpc(p) ? 'Chat' : null, b: 'Hop', hint: '{goal} — follow the arrow!', vars: { goal: t(this.objective) } };
    if (this.freeRoam) return { a: this.nearNpc(p) ? 'Chat' : 'Wave', b: 'Hop', hint: 'Free roam! Wander, hop, chat with the villagers' };
    return { a: this.nearNpc(p) ? 'Chat' : null, b: 'Hop', hint: this.objective };
  }

  syncPad(p) {
    this.party.net.send(p.id, { t: 'score', v: `★ ${p.stars}` });
  }

  onJoin(p) { if (this.game) this.game.onJoin(p); }
  onLeave(p) { if (this.game) this.game.onLeave(p); }
  onLand(p) { this.stat(p, 'jumps'); if (this.game) this.game.onLand(p); }

  dispose() {
    this.disposed = true;
    this.clearDust();
    if (this.game) { this.game.dispose(); this.game = null; }
    this.setBeacon(null);
    this.overlay = null; this.gatherInfo = null;
  }

  // ------------------------------------------------------------------ drawing
  drawWorld(wctx, v) { if (this.game) this.game.drawWorld(wctx, v); }

  drawLabels(ctx, v) {
    if (this.game) this.game.drawLabels(ctx, v);
    if (this.target && !this.party.busy) this.drawTargetArrow(ctx, v, this.target);
  }

  drawTargetArrow(ctx, v, tgt) { drawTargetArrow(this.party, ctx, v, tgt); }

  drawUi(ctx) {
    const P = this.party, W = P.display.w, H = P.display.h;
    if (P.phase === 'lobby') return;
    // charms at the top centre
    const cw = 14, cx0 = Math.round(W / 2 - (CHAPTERS.length * cw) / 2);
    ctx.fillStyle = 'rgba(30,20,40,0.72)'; ctx.fillRect(cx0 - 5, 4, CHAPTERS.length * cw + 10, 16);
    CHAPTERS.forEach((ch, i) => {
      const got = this.done.has(ch.id);
      drawStar(ctx, cx0 + i * cw + 7, 12, got ? ch.color : '#8a7a98', got);
    });
    // game timer & live scores
    if (this.game && (this.game.running || this.game.ended)) {
      const g = this.game;
      const s = Math.ceil(g.left);
      const col = s <= 5 && g.running ? (Math.floor(P.t * 4) % 2 ? '#ec5f73' : '#fff3c4') : '#fff3c4';
      drawText(ctx, s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : String(s), W / 2, 24, { color: col, align: 'center', scale: 2, outline: '#3b2a2e' });
      const since = g.def.time - g.left;
      if (since < 6) { ctx.globalAlpha = Math.min(1, (6 - since) * 2); drawText(ctx, t(g.def.title), 8, 8, { color: '#fff3c4', outline: '#3b2a2e' }); ctx.globalAlpha = 1; }
      if (g.def.teamGame && g.round) drawText(ctx, g.stage === 'jump' ? t('Final: jump together!') : t('Round {n}/3', { n: Math.min(3, g.round) }), W / 2, 44, { color: '#f6d38f', align: 'center', outline: '#3b2a2e' });
      g.drawUi(ctx);
    }
    this.drawBadges(ctx);
    if (this.overlay) this.drawOverlay(ctx, W, H);
  }

  // everyone's stars (or points during a game) along the bottom
  drawBadges(ctx) {
    const P = this.party;
    if (P.dialogue.active || (this.overlay && this.overlay.kind !== 'count')) return;
    const g = this.game && (this.game.running || this.game.ended) && !this.game.def.teamGame ? this.game : null;
    P.drawBadges(ctx, (p) => (g ? g.scoreText(p) : `${p.stars}★`), g ? '#fff3c4' : '#ffd66b');
  }


  drawOverlay(ctx, W, H) {
    const o = this.overlay, P = this.party;
    if (o.kind === 'rules') {
      const g = o.game, d = g.def;
      const pw = Math.min(W - 40, 320);
      // every rule gets up to two lines (the card grows to fit)
      const lines = [];
      d.rules.forEach((r, i) => wrap(t(r), pw - 84).slice(0, 2).forEach((l, k) => lines.push({ text: (i ? (k ? '  ' : '• ') : '') + l, color: i ? UI.ink : '#4f73b6' })));
      const ph = Math.max(112, 50 + lines.length * 11 + 28);
      const px = Math.round((W - pw) / 2), py = Math.round(H / 2 - ph / 2);
      panel(ctx, px, py, pw, ph);
      const pc = P.portraitOf(d.host, 'happy');
      if (pc) { ctx.fillStyle = '#efdfc0'; ctx.fillRect(px + 10, py + 10, 48, 48); ctx.drawImage(pc, px + 12, py + 12); }
      drawText(ctx, t(d.title), px + 66, py + 12, { color: '#8a5234', scale: 2 });
      drawText(ctx, t('hosted by {who} · {n}s', { who: t(NPCS[d.host].short), n: d.time }), px + 66, py + 32, { color: UI.inkSoft });
      lines.forEach((l, j) => drawText(ctx, l.text, px + 66, py + 46 + j * 11, { color: l.color }));
      const live = P.players.filter((p) => p.connected);
      let x = px + 12;
      for (const p of live) {
        const on = o.ready.has(p.slot);
        ctx.fillStyle = on ? p.color : '#d8c8b8'; ctx.fillRect(x, py + ph - 22, 10, 10);
        if (on) drawText(ctx, '✓', x + 5, py + ph - 21, { color: '#241a2e', align: 'center' });
        x += 13;
      }
      drawText(ctx, t('Press A when you’re ready ({n}/{total})', { n: o.ready.size, total: live.length }), px + pw - 12, py + ph - 21, { color: '#4f955a', align: 'right' });
    } else if (o.kind === 'count') {
      const n = Math.ceil(3 - o.t);
      const txt = o.t >= 3 ? t('GO!') : String(n);
      const k = 1 - ((o.t % 1) * 0.3);
      drawText(ctx, txt, W / 2, H / 2 - 20, { color: o.t >= 3 ? '#8fd6b4' : '#fff3c4', align: 'center', scale: Math.max(3, Math.round(5 * k)), outline: '#3b2a2e' });
    } else if (o.kind === 'results') {
      const g = o.game, res = o.res;
      const pw = Math.min(W - 40, 260), ph = 40 + res.length * 15;
      const px = Math.round((W - pw) / 2), py = Math.round(H / 2 - ph / 2);
      panel(ctx, px, py, pw, ph);
      drawText(ctx, t('{game} — results', { game: t(g.def.title) }), px + pw / 2, py + 9, { color: '#8a5234', align: 'center' });
      res.forEach((r, i) => {
        const y = py + 24 + i * 15;
        const shown = o.t > 0.4 + i * 0.25;
        if (!shown) return;
        ctx.fillStyle = r.p.color; ctx.fillRect(px + 10, y, 4, 12);
        const medal = g.def.teamGame ? '♥' : i === 0 ? t('1st') : i === 1 ? t('2nd') : i === 2 ? t('3rd') : t('{n}th', { n: i + 1 });
        drawText(ctx, medal, px + 20, y + 2, { color: i === 0 && !g.def.teamGame ? '#e0a526' : UI.inkSoft });
        drawText(ctx, r.p.name, px + 46, y + 2, { color: UI.ink });
        drawText(ctx, tn('{n} pt', '{n} pts', r.pts), px + pw - 70, y + 2, { color: UI.inkSoft, align: 'right' });
        const st = o.awards.get(r.p.slot) || 0;
        drawText(ctx, st ? `+${st} ★` : '·', px + pw - 14, y + 2, { color: '#e0a526', align: 'right' });
      });
      if (o.t > 3 && Math.floor(o.t * 2) % 2) drawText(ctx, t('A to continue'), px + pw / 2, py + ph + 6, { color: '#fff7e6', align: 'center', outline: '#3b2a2e' });
    } else if (o.kind === 'awards') {
      const given = o.given;
      const pw = Math.min(W - 30, 320), ph = 40 + given.length * 17;
      const px = Math.round((W - pw) / 2), py = Math.round(H / 2 - ph / 2);
      panel(ctx, px, py, pw, ph);
      drawText(ctx, t('Starfall Festival Awards'), px + pw / 2, py + 9, { color: '#8a5234', align: 'center' });
      given.forEach((a, i) => {
        if (o.t < 0.5 + i * 0.6) return;
        const y = py + 25 + i * 17;
        const pc = P.portraitOf(a.p.who, 'happy');
        ctx.fillStyle = a.p.color; ctx.fillRect(px + 8, y - 1, 16, 16);
        if (pc) ctx.drawImage(pc, 8, 4, 28, 28, px + 9, y, 14, 14);
        drawText(ctx, a.p.name, px + 30, y + 3, { color: UI.ink });
        drawText(ctx, t(a.c.title), px + 96, y + 3, { color: '#8a5234' });
        if (a.v !== '' && a.c.unit) drawText(ctx, a.c.unit(a.v), px + pw - 10, y + 3, { color: UI.inkSoft, align: 'right' });
      });
      if (o.t > 3 && Math.floor(o.t * 2) % 2) drawText(ctx, t('A to continue'), px + pw / 2, py + ph + 6, { color: '#fff7e6', align: 'center', outline: '#3b2a2e' });
    }
  }
}

function drawStar(ctx, x, y, color, lit) {
  const g = ['...#...', '..###..', '#######', '.#####.', '.##.##.', '#.....#'];
  for (let j = 0; j < g.length; j++) for (let i = 0; i < 7; i++) if (g[j][i] === '#') { ctx.fillStyle = color; ctx.fillRect(x - 3 + i, y - 3 + j, 1, 1); }
  if (lit) { ctx.fillStyle = '#fff7e6'; ctx.fillRect(x - 1, y - 1, 1, 1); }
}

// objective arrow: over the spot when you can see it, else on the edge of
// this view pointing the way (shared with the exploration)
export function drawTargetArrow(P, ctx, v, tgt, color = '#f2b63d') {
  const d = P.display;
  const tp = v.project(tgt.x, 0.5, tgt.z);
  const inside = v.owns(tp.x, tp.y) && tp.x > v.rect.x + 12 && tp.x < v.rect.x + v.rect.w - 12 && tp.y > v.rect.y + 20 && tp.y < v.rect.y + v.rect.h - 12;
  if (inside) {
    const u = d.worldToUi(tp.x, tp.y);
    const bob = Math.round(Math.sin(P.t * 4) * 2);
    drawText(ctx, '↓', u.x, u.y - 22 + bob, { color, align: 'center', outline: '#3b2a2e', scale: 2 });
    return;
  }
  // from the middle of this view's members towards the target
  let cx = 0, cz = 0;
  for (const m of v.members) { cx += m.pos.x; cz += m.pos.z; }
  cx /= v.members.length || 1; cz /= v.members.length || 1;
  const c = v.project(cx, 1, cz);
  let dx = tp.x - c.x, dy = tp.y - c.y;
  const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
  // walk out from the group until we leave this view's region
  let px = c.x, py = c.y;
  for (let s = 0; s < 800; s += 4) {
    const qx = c.x + dx * s, qy = c.y + dy * s;
    if (!v.owns(qx, qy) || qx < v.rect.x + 14 || qy < v.rect.y + 22 || qx > v.rect.x + v.rect.w - 14 || qy > v.rect.y + v.rect.h - 14) break;
    px = qx; py = qy;
  }
  const u = d.worldToUi(px, py);
  drawArrow(ctx, u.x, u.y, Math.atan2(dy, dx), P.t, color);
}

function drawArrow(ctx, x, y, ang, t, color = '#f2b63d') {
  const pulse = 1 + Math.sin(t * 5) * 0.15;
  const pts = [[9, 0], [-6, -6], [-2, 0], [-6, 6]];
  const c = Math.cos(ang), s = Math.sin(ang);
  const poly = (ox, oy, k) => {
    ctx.beginPath();
    pts.forEach(([px, py], i) => { const X = x + ox + (px * c - py * s) * k, Y = y + oy + (px * s + py * c) * k; if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
    ctx.closePath(); ctx.fill();
  };
  ctx.fillStyle = '#3b2a2e';
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) poly(dx, dy, pulse);
  ctx.fillStyle = color;
  poly(0, 0, pulse);
}
