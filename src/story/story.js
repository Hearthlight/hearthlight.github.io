// Quests, villager conversations, gifts and story events for Hearthlight.
// Scripts are plain async functions; `w` is the World scene which exposes
// say/ask/letter/give/take/fade/wait/walk/emote/camera helpers.

import { NPCS, NPC_ORDER } from '../data/npcs.js';
import { ITEMS } from '../data/items.js';
import { LINES, GIFT_EXPR } from './lines.js';
import { FRIEND_LETTERS } from './letters.js';
import { countItem, hearts } from '../state.js';
import { BUILDINGS, POINTS, OX, OZ } from '../world/overworld.js';
import { audio } from '../engine/audio.js';
import { ctl, device } from '../ui/ui.js';
import { PROJECTS } from '../systems/projects.js';
import { HOME_LEVELS } from '../world/interiors.js';
import { t, num } from '../i18n.js';

const bld = (id) => BUILDINGS.find((b) => b.id === id);
const doorOf = (id) => { const b = bld(id); return { map: 'overworld', x: b.door + 0.5, z: b.y + b.h + 0.5 }; };
const metCount = (s) => NPC_ORDER.filter((id) => s.friendship[id].met).length;
const spottedCount = (s) => Object.keys(s.flags.spotted || {}).length;
const shardCount = (s) => countItem(s, 'shard') + (s.flags.shardsPlaced ? 5 : 0);

export const PAGE_SPOTS = [
  { key: 'page1', x: 103.6, z: 19.6, hint: 'the shore of Waterfall Lake' },
  { key: 'page2', x: OX + 7.3, z: OZ + 10.8, hint: 'Mirror Pond' },
  { key: 'page3', x: 40.4, z: 77.6, hint: 'the farm pond in Honeydew Fields' },
  { key: 'page4', x: OX + 64.2, z: OZ + 41.4, hint: 'the orchard' },
  { key: 'page5', x: OX + 86.6, z: OZ + 27.4, hint: 'the standing stones in the meadow' },
];
export const PICK_SPOT = { key: 'solpick', x: OX + 55.6, z: OZ + 55.4 };
export const BOTTLE_SPOTS = [
  { key: 'bottle1', x: 64.5, z: 95.6, hint: 'the west end of Driftwood Beach' },
  { key: 'bottle2', x: 30.5, z: 89.5, hint: 'the tide pools on Seagull Bluffs' },
  { key: 'bottle3', x: 158.5, z: 119.2, hint: 'the south beach of Turtle Isle' },
];
const GROTTO = { map: 'overworld', x: 168.5, z: 114.6 };
const V = (x, z) => ({ map: 'overworld', x: x + OX, z: z + OZ });

export const QUESTS = {
  arrive: {
    title: 'A New Leaf', main: true,
    steps: [
      { obj: 'Find Nana’s cottage, west of the plaza', target: () => doorOf('home') },
      { obj: 'Read the note Nana left for you', target: () => ({ map: 'home', x: 6.5, z: 3.6 }) },
      { obj: (s) => t('Say hello to the neighbors ({n}/3)', { n: Math.min(3, metCount(s)) }), check: (s) => metCount(s) >= 3 },
      { obj: 'Head home and rest in your bed', target: () => ({ map: 'home', x: 1.5, z: 2.2 }) },
    ],
  },
  roots: {
    title: 'Putting Down Roots', main: true,
    steps: [
      { obj: 'Visit Mayor Hollis at the Town Hall', npc: 'hollis' },
      {
        obj: (s) => [`${s.flags.planted ? '✓' : '•'} ${t('Plant seeds in your garden')}`, `${s.stats.fish ? '✓' : '•'} ${t('Catch a fish')}`, `${s.flags.sold ? '✓' : '•'} ${t('Sell something')}`],
        check: (s) => s.flags.planted && s.stats.fish > 0 && s.flags.sold,
        target: (s) => (!s.flags.planted ? V(17.5, 23) : !s.stats.fish ? V(47, 60) : doorOf('store')),
      },
      { obj: 'Report back to Mayor Hollis', npc: 'hollis' },
    ],
  },
  glimmer: {
    title: 'Rekindle Old Glimmer', main: true,
    steps: [
      { obj: (s) => t('Gather the Glimmer Shards ({n}/5)', { n: shardCount(s) }), check: (s) => countItem(s, 'shard') >= 5 },
      { obj: 'Bring the shards to Old Glimmer', target: () => doorOf('lighthouse') },
      { obj: 'Place the shards in the great lantern', target: () => ({ map: 'lighthouse', x: 3.5, z: 3.4 }) },
      { obj: 'Share the news with Mayor Hollis', npc: 'hollis' },
    ],
  },
  festival: {
    title: 'Festival of Lights', main: true,
    steps: [
      { obj: (s) => (s.day >= s.flags.festivalDay ? t('Head to the beach — 7pm, Festival of Lights') : t('The festival is tomorrow night — rest up!')), target: (s) => (s.day >= s.flags.festivalDay ? V(44, 54) : null) },
      { obj: (s) => t('Share the evening with friends ({n}/5)', { n: Math.min(5, (s.flags.festTalked || []).length) }), check: (s) => (s.flags.festTalked || []).length >= 5 },
      { obj: 'Release your lantern at the end of the pier', target: () => V(47, 65.2) },
    ],
  },
  bridge: {
    title: 'Mending Bridges', giver: 'theo',
    steps: [
      { obj: (s) => [t('Bridge fund: {coins}/500¢', { coins: s.fund.coins }), t('Wood: {n}/20', { n: s.fund.wood }), t('Donate at Theo’s workshop')], check: (s) => s.fund.coins >= 500 && s.fund.wood >= 20, npc: 'theo' },
      { obj: 'Theo is building the bridge overnight…', check: (s) => s.flags.bridgeFixed },
      { obj: 'Cross the new bridge to Sunpetal Meadow', target: () => V(77, 29.8) },
    ],
  },
  rosa_tart: {
    title: 'A Taste of Home', giver: 'rosa',
    steps: [
      { obj: (s) => t('Bring Rosa 5 Wild Berries ({n}/5)', { n: Math.min(5, countItem(s, 'berry')) }), npc: 'rosa', hint: 'Berry bushes grow all around the cove.' },
      { obj: 'Deliver the Berry Tart to Mabel at the library', npc: 'mabel' },
      { obj: 'Return the old recipe book to Rosa', npc: 'rosa' },
    ],
  },
  finn_moonfin: {
    title: 'The Moonfin', giver: 'finn',
    steps: [
      { obj: 'Catch a Moonfin in the sea after 8pm', target: () => V(47, 62), check: (s) => countItem(s, 'fish_moonfin') > 0 },
      { obj: 'Show the Moonfin to Finn', npc: 'finn' },
    ],
  },
  mabel_pages: {
    title: 'The Lost Pages', giver: 'mabel',
    steps: [
      { obj: (s) => t('Find the lost pages ({n}/5)', { n: PAGE_SPOTS.filter((p) => s.forage.taken[p.key]).length }), check: (s) => PAGE_SPOTS.every((p) => s.forage.taken[p.key]), target: (s) => { const p = PAGE_SPOTS.find((q) => !s.forage.taken[q.key] && (q.key !== 'page5' || s.flags.bridgeFixed)); return p ? { map: 'overworld', x: p.x, z: p.z, soft: true } : null; } },
      { obj: 'Return the pages to Mabel', npc: 'mabel' },
    ],
  },
  wren_colors: {
    title: 'Colors of the Meadow', giver: 'wren',
    steps: [
      { obj: (s) => [`${countItem(s, 'poppy') ? '✓' : '•'} ${t('A red Poppy')}`, `${countItem(s, 'bluebell') ? '✓' : '•'} ${t('A blue Bluebell')}`, `${countItem(s, 'daisy') ? '✓' : '•'} ${t('A white Daisy')}`], check: (s) => countItem(s, 'poppy') && countItem(s, 'bluebell') && countItem(s, 'daisy'), target: () => ({ ...V(82, 26), soft: true }) },
      { obj: 'Bring the flowers to Wren', npc: 'wren' },
    ],
  },
  pip_fireflies: {
    title: 'Stars in a Jar', giver: 'pip',
    steps: [
      { obj: (s) => t('Catch fireflies after dark ({n}/3)', { n: Math.min(3, countItem(s, 'firefly')) }), check: (s) => countItem(s, 'firefly') >= 3, hint: 'Buy a Bug Net at Petal & Seed.' },
      { obj: 'Bring the fireflies to Pip', npc: 'pip' },
    ],
  },
  bram_mill: {
    title: 'The Windmill Stands Still', giver: 'bram',
    steps: [
      { obj: (s) => [t('Wood for a new spar ({n}/10)', { n: Math.min(10, countItem(s, 'branch')) }), `${countItem(s, 'sailcloth') ? '✓' : '•'} ${t('Sail Cloth — sold at Petal & Seed')}`, t('Bring them to Bram')], npc: 'bram' },
      { obj: 'Bram is mending the windmill overnight…', check: (s) => s.flags.millFixed },
      { obj: 'See Bram about the turning windmill', npc: 'bram' },
    ],
  },
  juniper_survey: {
    title: 'The Whisperwood Survey', giver: 'juniper',
    steps: [
      { obj: (s) => [`${countItem(s, 'mushroom') >= 3 ? '✓' : '•'} ${t('3 Mushrooms ({n}/3)', { n: Math.min(3, countItem(s, 'mushroom')) })}`, `${countItem(s, 'pinecone') >= 2 ? '✓' : '•'} ${t('2 Pinecones ({n}/2)', { n: Math.min(2, countItem(s, 'pinecone')) })}`, `${countItem(s, 'feather') ? '✓' : '•'} ${t('A Gull Feather from Seagull Bluffs')}`], npc: 'juniper' },
    ],
  },
  juniper_wildlife: {
    title: 'Wildlife Watch', giver: 'juniper',
    steps: [
      { obj: (s) => t('Spot different wild animals ({n}/12)', { n: Math.min(12, spottedCount(s)) }), check: (s) => spottedCount(s) >= 12, hint: 'Get close to critters — some only come out at night.' },
      { obj: 'Tell Juniper about everything you saw', npc: 'juniper' },
    ],
  },
  marlo_bottles: {
    title: 'Letters on the Tide', giver: 'marlo',
    steps: [
      { obj: (s) => t('Find the washed-up bottles ({n}/3)', { n: Math.min(3, countItem(s, 'bottle')) }), check: (s) => countItem(s, 'bottle') >= 3, target: (s) => { const b = BOTTLE_SPOTS.find((q) => !s.forage.taken[q.key]); return b ? { map: 'overworld', x: b.x, z: b.z, soft: true } : null; } },
      { obj: 'Bring the bottles to Captain Marlo', npc: 'marlo' },
      { obj: 'Explore the sea grotto on Turtle Isle — take a light!', target: () => GROTTO },
      { obj: 'Tell Marlo what you found in the grotto', npc: 'marlo' },
    ],
  },
  sol_pick: {
    title: 'Sol’s Lucky Pick', giver: 'sol',
    steps: [
      { obj: 'Find Sol’s guitar pick on the beach', target: () => ({ map: 'overworld', x: PICK_SPOT.x, z: PICK_SPOT.z, soft: true }), check: (s) => countItem(s, 'pick') > 0 },
      { obj: 'Return the pick to Sol', npc: 'sol' },
    ],
  },
};

export class Story {
  constructor(game) {
    this.game = game;
  }

  get s() { return this.game.state; }

  // ------------------------------------------------------------------ quests
  q(id) { return this.s.quests[id]; }
  active(id) { const q = this.q(id); return q && !q.done; }
  stepOf(id) { const q = this.q(id); return q ? q.step : -1; }

  start(id, silent = false) {
    if (this.s.quests[id]) return;
    this.s.quests[id] = { step: 0, done: false, day: this.s.day };
    this.s.flags.tracked = id;
    if (!silent) {
      audio.jingle('questStart');
      this.game.hud.toast(t('New quest: {title}', { title: t(QUESTS[id].title) }), null, '#8a5234');
    }
    this.check();
  }

  advance(id, to = null) {
    const q = this.q(id);
    if (!q || q.done) return;
    q.step = to !== null ? to : q.step + 1;
    this.s.flags.tracked = id;
    this.game.saveSoon = true;
    if (q.step >= QUESTS[id].steps.length) this.complete(id);
    else { audio.sfx('page'); this.game.hud.toast(t('{title}: updated', { title: t(QUESTS[id].title) }), null, '#8a5234'); }
  }

  complete(id) {
    const q = this.q(id);
    if (!q) return;
    q.done = true;
    q.step = QUESTS[id].steps.length;
    audio.jingle('questDone');
    this.game.hud.toast(t('Quest complete: {title}', { title: t(QUESTS[id].title) }), null, '#4f955a');
    if (this.s.flags.tracked === id) this.s.flags.tracked = null;
    this.onQuestDone(id);
  }

  // Auto-advance steps with a check() condition
  check() {
    for (const [id, q] of Object.entries(this.s.quests)) {
      if (q.done) continue;
      const st = QUESTS[id].steps[q.step];
      if (st && st.check && st.check(this.s)) this.advance(id);
    }
  }

  tracked() {
    const s = this.s;
    const ids = Object.keys(s.quests).filter((id) => !s.quests[id].done);
    if (!ids.length) return null;
    let id = s.flags.tracked && ids.includes(s.flags.tracked) ? s.flags.tracked : ids.find((i) => QUESTS[i].main) || ids[0];
    const q = s.quests[id];
    const st = QUESTS[id].steps[q.step];
    if (!st) return null;
    const o = typeof st.obj === 'function' ? st.obj(s) : st.obj;
    const lines = Array.isArray(o) ? o : [o];
    return { id, title: QUESTS[id].title, objective: lines[0], objectiveLines: lines, step: st };
  }

  target() {
    const t = this.tracked();
    if (!t) return null;
    const st = t.step;
    if (st.npc) return this.game.npcTarget(st.npc);
    if (st.target) return st.target(this.s);
    return null;
  }

  wantsMoonfin() { return this.active('finn_moonfin'); }

  // ------------------------------------------------------------------ events
  onNewDay() {
    const s = this.s;
    if (s.flags.fundComplete && !s.flags.bridgeFixed) {
      s.flags.bridgeFixed = true;
      s.flags.bridgeEvent = true;
    }
    if (s.flags.houseUpgrade) {
      s.house.level = s.flags.houseUpgrade;
      s.flags.houseUpgrade = null;
      s.flags.houseEvent = true;
      this.game.rebuildHome();
    }
    if (s.flags.projectPending) {
      s.flags.projects = (s.flags.projects || []).concat(s.flags.projectPending);
      s.flags.projectEvent = s.flags.projectPending;
      s.flags.projectPending = null;
      this.game.applyProjects();
    }
    if (s.flags.millMaterials && !s.flags.millFixed) {
      s.flags.millFixed = true;
      s.flags.millEvent = true;
      this.game.over.millSpeed = 0.55;
    }
    this.check();
  }

  onWake() {
    const s = this.s, w = this.game;
    return (async () => {
      if (s.day === 2 && !s.quests.roots) {
        await w.letter('A note under the door', 'Good morning, {name}!\n\nI trust you slept soundly — the sea air does wonders. When you have a moment, please drop by the Town Hall (the blue roof, north of the plaza). There’s something about Old Glimmer I’d like to tell you.\n\nWarmly,', '— Mayor Hollis');
        this.start('roots');
      }
      if (s.flags.bridgeEvent) {
        s.flags.bridgeEvent = false;
        await this.bridgeScene();
      }
      if (s.flags.houseEvent) {
        s.flags.houseEvent = false;
        w.hud.showBanner(t('Home, sweet bigger home'), t(HOME_LEVELS[s.house.level].name));
        audio.jingle('questDone');
        await w.letter('A note from Theo', s.house.level >= 3 ? 'Done. Big windows, sofa corner, the lot. Your Nana would say it finally feels like a proper home.\n\nThe floorboards don’t creak anymore. Mostly.' : 'Done. New room’s through the east wall — plenty of space for your things. Mind the fresh paint.\n\nIf you want to go bigger one day, you know where to find me.', '— Theo');
      }
      if (s.flags.projectEvent) {
        const pr = PROJECTS.find((p) => p.id === s.flags.projectEvent);
        s.flags.projectEvent = null;
        if (pr) {
          w.hud.showBanner(t('Town project complete!'), t(pr.name));
          audio.jingle('questDone');
          await w.letter(pr.name, pr.letter, '— Mayor Hollis, on behalf of Marigold Cove');
        }
      }
      if (s.flags.millEvent) {
        s.flags.millEvent = false;
        w.hud.showBanner(t('The Windmill Turns'), t('Honeydew Fields is grinding again'));
        audio.jingle('questDone');
        await w.say(null, 'Somewhere out west, old sails creak… then catch the wind. By breakfast, the whole valley can see the Honeydew windmill turning again.');
      }
      if (s.flags.festivalDay && s.day === s.flags.festivalDay && !s.flags.festivalMorning) {
        s.flags.festivalMorning = true;
        await w.letter('Festival of Lights', 'Tonight’s the night! The whole cove will gather on the beach at 7pm to light the lanterns, just like the old days.\n\nBring your brightest smile.', '— Everyone in Marigold Cove');
      }
    })();
  }

  onEnterMap(map) {
    const s = this.s;
    if (map === 'home' && this.stepOf('arrive') === 0) this.advance('arrive');
    if (map === 'lighthouse' && this.active('glimmer') && this.stepOf('glimmer') === 1) this.advance('glimmer');
  }

  onAreaEnter(area) {
    if (area === 'Sunpetal Meadow' && this.active('bridge') && this.stepOf('bridge') === 2) this.advance('bridge');
  }

  onFish() { this.check(); }
  onFerry(toIsland) {
    const s = this.s;
    if (toIsland && !s.flags.islandVisited) {
      s.flags.islandVisited = true;
      this.game.hud.showBanner(t('Turtle Isle'), t('Palm trees, tide pools & a very old captain'));
    }
    this.check();
  }
  onStargaze() { this.check(); }
  async grotto() {
    const w = this.game, s = this.s;
    const held = w.heldItem();
    if (!countItem(s, 'lamp_hand')) { await w.say(null, 'A cool breeze drifts out of the little sea grotto. It’s pitch dark inside and something drips… Best not to wander in without a light.'); return; }
    if (!held || held.id !== 'lamp_hand') { await w.say(null, 'It’s pitch black in there. Hold up your Hand Lantern first.'); return; }
    await w.enterRoom('grotto');
    if (!s.flags.grottoSeen) { s.flags.grottoSeen = true; w.hud.showBanner(t('Sea Grotto'), t('Drip… drip… sparkle')); }
  }

  async openChest(f) {
    const w = this.game, s = this.s;
    if (s.flags.treasureFound) { await w.say(null, 'The old chest is empty now — just sand, a few barnacles and a faint smell of adventure.'); return; }
    if (!countItem(s, 'map')) { await w.say(null, 'A barnacle-crusted chest, locked with a rusty clasp. Someone hid this here on purpose.'); return; }
    s.flags.treasureFound = true;
    audio.sfx('unlock');
    const e = f.entry;
    for (let i = 1; i <= 12; i++) { if (e && e.lid) e.lid.rotation.x = -1.25 * (i / 12); await w.wait(0.03); }
    if (e && e.shine) e.shine.visible = true;
    audio.jingle('shard');
    w.fx.emit('sparkle', f.x, 1.0, f.z, 24, { color: '#ffd66b' });
    await w.say(null, 'The clasp gives way with a satisfying clunk! Inside: a heap of old coins, sea glass… and a tiny ship in a bottle.');
    w.takeItem('map', 1);
    w.addCoins(600);
    w.giveItem('seaglass', 3);
    w.giveItem('f_shipbottle', 1);
    if (this.active('marlo_bottles') && this.stepOf('marlo_bottles') === 2) this.advance('marlo_bottles');
  }

  async millstone() {
    const w = this.game, s = this.s;
    if (s.flags.millFixed) await w.say(null, 'The great millstone rumbles round and round. Golden wheat goes in, soft flour comes out. The whole room smells like fresh bread.');
    else await w.say(null, 'An enormous millstone, still and dusty. High above, the gears are waiting for the sails to turn again.');
  }
  onPickup(id) {
    this.check();
    if (id === 'page' && !this.q('mabel_pages')) this.game.hud.toast(t('A lost library page… Mabel might want this.'));
  }
  onPlant() { this.s.flags.planted = true; this.check(); }
  onSell() { this.s.flags.sold = true; this.check(); }

  onQuestDone(id) {
    const s = this.s;
    if (id === 'arrive') { /* roots starts next morning by letter */ }
    if (id === 'glimmer') { /* festival started in the Hollis script */ }
  }

  // Villagers placed by story (festival, intro…) — returns {map, x, z, face} or null
  override(id) {
    const s = this.s;
    // (World v7: the saga calls a villager over when it needs them)
    const S = this.game.wild && this.game.wild.saga, sp = S && S.villagerSpot(id);
    if (sp) return sp;
    if (s.flags.introHollis && id === 'hollis') return { map: 'overworld', x: OX + 46.8, z: OZ + 58.5, act: 'wait' };
    if (s.flags.festivalDay && s.day === s.flags.festivalDay && s.hour >= 18.5 && !s.flags.festivalDone) {
      const spots = {
        hollis: [45.2, 53.6], rosa: [42.4, 54.3], pip: [43.4, 55.2], finn: [48.8, 55.4], ivy: [40.6, 53.6],
        theo: [50.5, 54], mabel: [39.2, 54.8], sol: [52, 53.4], wren: [53.6, 55.1],
        bram: [37.4, 53.8], juniper: [55.2, 53.9], marlo: [47.6, 56.2],
      };
      const p = spots[id];
      if (p) return { map: 'overworld', x: p[0] + OX, z: p[1] + OZ, act: id === 'sol' ? 'guitar' : 'festival', face: { x: 0, z: 1 } };
    }
    if (id === 'wren' && s.flags.bridgeFixed) return null;
    return null;
  }

  // ------------------------------------------------------------------ talk
  async talk(npc) {
    const w = this.game, s = this.s, id = npc.id;
    // (World v7: someone with a saga quest or step talks about that first)
    const S = w.wild && w.wild.saga;
    if (S && S.offerOf(id)) { await S.talk(id, S.P.me); return; }
    if (npc.def.visitor) { await this.merchantTalk(npc); return; }
    const fr = s.friendship[id];
    if (!fr.met) {
      fr.met = true;
      for (const [ex, line] of LINES[id].intro) await w.say(id, line, ex);
      this.friend(id, 25);
      fr.talked = s.day;
      this.check();
      await this.questHooks(npc, true);
      return;
    }
    // quest hooks first
    if (await this.questHooks(npc, false)) return;

    const opts = ['Chat'];
    const vars = {};
    const held = w.heldItem();
    const giftable = held && ITEMS[held.id] && !['tool', 'key', 'upgrade'].includes(ITEMS[held.id].cat);
    if (giftable && fr.gifted !== s.day) { opts.push('Give {gift}'); vars.gift = t(ITEMS[held.id].name); }
    const shopOpen = w.shopOpenFor(npc);
    if (shopOpen) opts.push(shopOpen.label);
    if (id === 'theo' && this.active('bridge') && this.stepOf('bridge') === 0) opts.push('Bridge fund');
    if (id === 'theo' && s.house.level < 3 && s.flags.questsOpen) opts.push(s.flags.houseUpgrade ? 'About my house…' : 'Expand my home');
    const req = s.board && !s.board.done && s.board.npc === id && countItem(s, s.board.item) >= s.board.qty;
    if (req) opts.push('Deliver request');
    opts.push('Bye');
    let pick = 0;
    if (opts.length > 2) {
      pick = await w.ask(id, this.greeting(id), opts, opts.length - 1, vars);
    }
    const choice = opts[pick];
    if (choice === 'Chat') await this.chat(id);
    else if (choice && choice.startsWith('Give')) await this.gift(id, held.id);
    else if (shopOpen && choice === shopOpen.label) w.openShop(shopOpen.shop, npc);
    else if (choice === 'Bridge fund') await this.bridgeFund();
    else if (choice === 'Expand my home' || choice === 'About my house…') await this.homeUpgrade();
    else if (choice === 'Deliver request') await this.deliverRequest(id);
  }

  async merchantTalk(npc) {
    const w = this.game, s = this.s;
    if (!s.flags.metPim) {
      s.flags.metPim = true;
      await w.say('merchant', 'Well met, well met! Pim the Wanderer, at your service. I roll my cart from town to town, and on Sundays it rolls right here.', 'happy');
      await w.say('merchant', 'Little lighthouses, music boxes, lanterns from the far coast… The cart changes every week, so do come back!', 'happy');
    }
    const pick = await w.ask('merchant', ['Treasures for every budget!', 'Something catch your eye?', 'Fresh from the road, friend!'][s.day % 3], ['Browse the cart', 'Bye'], 1);
    if (pick === 0) w.openShop('market', npc);
  }

  // English source line; the dialogue box translates it and fills in {name}
  greeting(id) {
    const h = this.s.hour;
    return h < 11 ? 'Good morning, {name}!' : h < 17 ? 'Hi, {name}!' : h < 21 ? 'Evening, {name}.' : 'Oh — hello, {name}.';
  }

  async chat(id) {
    const w = this.game, s = this.s, fr = s.friendship[id];
    const L = LINES[id];
    const h = s.hour;
    const hs = hearts(fr.pts);
    let pool = [...L.pool];
    if (hs >= 3) pool = pool.concat(L.warm, L.warm);
    if (s.weather === 'rain') pool = pool.concat(L.rain, L.rain);
    if (h < 10) pool = pool.concat(L.morning);
    else if (h >= 17 && h < 20.5) pool = pool.concat(L.evening);
    else if (h >= 20.5) pool = pool.concat(L.night, L.night);
    fr.recent = fr.recent || [];
    const fresh = pool.filter((l) => !fr.recent.includes(l));
    const line = (fresh.length ? fresh : pool)[Math.floor(Math.random() * (fresh.length || pool.length))];
    fr.recent.push(line);
    if (fr.recent.length > 5) fr.recent.shift();
    await w.say(id, line, hs >= 5 ? 'happy' : 'talk');
    if (fr.talked !== s.day) {
      fr.talked = s.day;
      this.friend(id, 20);
    }
  }

  async gift(id, item) {
    const w = this.game, s = this.s, fr = s.friendship[id];
    const def = NPCS[id];
    const kind = def.loves.includes(item) ? 'love' : def.likes.includes(item) ? 'like' : def.hates.includes(item) ? 'hate' : 'neutral';
    w.takeItem(item, 1);
    fr.gifted = s.day;
    s.stats.gifts++;
    if (!fr.known.includes(item)) fr.known.push(item);
    const pts = { love: 80, like: 45, neutral: 20, hate: -20 }[kind];
    if (kind === 'love' || kind === 'like') w.emoteNpc(id, 'heart');
    if (kind === 'hate') w.emoteNpc(id, 'sweat');
    await w.say(id, LINES[id].gift[kind], GIFT_EXPR[kind]);
    this.friend(id, pts);
  }

  friend(id, pts) {
    const fr = this.s.friendship[id];
    const before = hearts(fr.pts);
    fr.pts = Math.max(0, Math.min(1000, fr.pts + pts));
    const after = hearts(fr.pts);
    if (pts > 0) this.game.fxHeartAt(id);
    if (after > before) {
      audio.jingle('friendUp');
      this.game.hud.toast(`${NPCS[id].short} ♥ ${after}`, null, '#ec5f73');
      // friendship letters at 3 and 6 hearts
      const sent = (this.s.flags.letters = this.s.flags.letters || {});
      for (const h of [3, 6]) {
        const key = id + h;
        if (before < h && after >= h && !sent[key] && FRIEND_LETTERS[id] && FRIEND_LETTERS[id][h]) {
          sent[key] = true;
          this.s.mail.push({ ...FRIEND_LETTERS[id][h], from: id });
          this.game.hud.toast(t('{who} sent you a letter!', { who: NPCS[id].short }), null, '#8a5234');
          audio.sfx('mail');
        }
      }
    }
  }

  // ---------------------------------------------------------- quest hooks
  // Returns true if a quest conversation happened (consumes the talk).
  async questHooks(npc, firstMeet) {
    const w = this.game, s = this.s, id = npc.id;
    // ---- Mayor Hollis
    if (id === 'hollis') {
      if (this.active('roots') && this.stepOf('roots') === 0) { await this.hollisLegend(); return true; }
      if (this.active('roots') && this.stepOf('roots') === 2) { await this.hollisShards(); return true; }
      if (this.active('glimmer') && this.stepOf('glimmer') === 3) { await this.hollisFestival(); return true; }
    }
    // ---- festival night conversations
    if (s.flags.festivalDay && s.day === s.flags.festivalDay && s.hour >= 18.5 && this.active('festival') && this.stepOf('festival') >= 0 && this.stepOf('festival') <= 1) {
      s.flags.festTalked = s.flags.festTalked || [];
      if (!s.flags.festTalked.includes(id)) {
        s.flags.festTalked.push(id);
        await w.say(id, FESTIVAL_LINES[id], 'happy');
        this.friend(id, 40);
        if (this.stepOf('festival') === 0) this.advance('festival');
        this.check();
        return true;
      }
    }
    // ---- Bram
    if (id === 'bram') {
      if (!this.q('bram_mill') && !firstMeet) {
        await w.say('bram', 'Say, you look like someone who likes a project. See that windmill? Sails tore in the big storm and the spar snapped clean in two.', 'neutral');
        await w.say('bram', 'I could mend her with 10 good pieces of wood and a bolt of Sail Cloth — Ivy sells it at Petal & Seed. Then we’d have flour again!', 'happy');
        this.start('bram_mill');
        return true;
      }
      if (this.active('bram_mill') && this.stepOf('bram_mill') === 0 && countItem(s, 'branch') >= 10 && countItem(s, 'sailcloth') >= 1) {
        w.takeItem('branch', 10); w.takeItem('sailcloth', 1);
        await w.say('bram', 'That’s everything! Oh, she’s going to fly. I’ll work through the night — come see her in the morning!', 'love');
        s.flags.millMaterials = true;
        this.advance('bram_mill');
        this.friend('bram', 80);
        return true;
      }
      if (this.active('bram_mill') && this.stepOf('bram_mill') === 2) {
        await w.say('bram', 'Would you look at her go! Fresh flour for Rosa’s bakery, and the bees love the breeze. Thank you, friend.', 'happy');
        await w.say('bram', 'I want you to have this — my old bicycle. Fixed her up while I was at it. The valley’s a big place; you shouldn’t walk all of it.', 'happy');
        w.giveItem('bike', 1, { quest: true });
        this.complete('bram_mill');
        this.friend('bram', 150);
        w.hud.tip(device() === 'pad' ? t('Select the {goldLight}Bicycle{/} in your hotbar — or press {goldLight}{l3}{/} — to ride. {goldLight}{rt}{/} pedals even faster!', { l3: ctl('bike'), rt: ctl('run') })
          : t('Select the {goldLight}Bicycle{/} in your hotbar — or press {goldLight}B{/} — to ride. Shift pedals even faster!'), 9);
        return true;
      }
    }
    // ---- Juniper
    if (id === 'juniper') {
      if (!this.q('juniper_survey') && !firstMeet) {
        await w.say('juniper', 'Hey, want to help with real ranger work? I’m surveying the Whisperwood. I need samples!', 'happy');
        await w.say('juniper', '3 Mushrooms and 2 Pinecones from the forest floor, plus a Gull Feather from out on Seagull Bluffs, past the farm. The gulls molt this time of year.', 'neutral');
        await w.say('juniper', 'Bring them to me here at camp and I’ll make it worth your while. Ranger’s honor!', 'happy');
        this.start('juniper_survey');
        return true;
      }
      if (this.active('juniper_survey') && countItem(s, 'mushroom') >= 3 && countItem(s, 'pinecone') >= 2 && countItem(s, 'feather') >= 1) {
        w.takeItem('mushroom', 3); w.takeItem('pinecone', 2); w.takeItem('feather', 1);
        await w.say('juniper', 'These are PERFECT. Look at the gills on this one! Okay, logging it all… done. You’re officially an honorary ranger.', 'love');
        await w.say('juniper', 'Every ranger needs one of these — my spare Hand Lantern. Hold it up at night and the dark gets a lot friendlier. Great for caves, too!', 'happy');
        w.giveItem('lamp_hand', 1, { quest: true });
        this.complete('juniper_survey');
        this.friend('juniper', 150);
        w.hud.tip(t('Hold the {goldLight}Hand Lantern{/} to light your way at night — and into dark places.'), 8);
        return true;
      }
    }
    if (id === 'juniper' && this.q('juniper_survey') && this.q('juniper_survey').done) {
      if (!this.q('juniper_wildlife')) {
        await w.say('juniper', 'Okay, ranger-in-training, next mission! The valley is FULL of critters: deer in Maple Hollow, snow hares up on Frostpine Ridge, frogs in Reedmarsh, owls at night…', 'happy');
        await w.say('juniper', 'Spot a dozen different kinds and come tell me. Sneak up gently — the shy ones bolt. Your Collection page keeps a log!', 'neutral');
        this.start('juniper_wildlife');
        return true;
      }
      if (this.active('juniper_wildlife') && this.stepOf('juniper_wildlife') === 1) {
        await w.say('juniper', '{n} different critters?! That’s better than my first year as a ranger. Did you see the heron? Ugh, I love herons.', 'love', { n: spottedCount(s) });
        await w.say('juniper', 'I made you something — a little terrarium, with a very small, very polite frog. His name is Gerald.', 'happy');
        w.giveItem('f_terrarium', 1);
        w.addCoins(500);
        this.complete('juniper_wildlife');
        this.friend('juniper', 120);
        return true;
      }
    }
    // ---- Marlo
    if (id === 'marlo') {
      if (firstMeet) {
        await w.say('marlo', 'Fancy a crossing to Turtle Isle? Ten coins a trip. Just step aboard and ring the bell — I’ll be at the wheel.', 'neutral');
        return true;
      }
      if (!this.q('marlo_bottles')) {
        await w.say('marlo', 'Can I tell you a little secret, sailor? My sister and I used to send letters in bottles across the bay. Silly notes, drawings, maps.', 'neutral');
        await w.say('marlo', 'This week the tide’s been bringing some of them back. Three bottles, washed up around the valley. I’m too creaky to go beachcombing.', 'sad');
        await w.say('marlo', 'Would you find them for me? Check the beaches, the bluffs and my own island. The glass catches the light.', 'happy');
        this.start('marlo_bottles');
        this.game.spawnBottles();
        return true;
      }
      if (this.active('marlo_bottles') && this.stepOf('marlo_bottles') === 1 && countItem(s, 'bottle') >= 3) {
        w.takeItem('bottle', 3);
        await w.say('marlo', 'Oh… oh, look at her handwriting. Forty years and I’d know it anywhere.', 'surprised');
        await w.letter('A letter in a bottle', 'Dear Marlo,\n\nIf this reaches you, I hid our treasure where we swore we would — in the sea grotto on Turtle Isle, where the crystals grow. Bring a light, you scaredy-cat.\n\nThe map is on the back. X marks the spot. Always.', '— Your sister, Nell');
        await w.say('marlo', 'The grotto! We were nine and ten. She never told me she actually did it. I… I never went in. Too dark, too scared.', 'sad');
        await w.say('marlo', 'Take the map. Bring a lantern — Juniper at the camp might lend you one. Tell me what you find, would you?', 'happy');
        w.giveItem('map', 1, { quest: true });
        this.advance('marlo_bottles');
        this.friend('marlo', 80);
        return true;
      }
      if (this.active('marlo_bottles') && this.stepOf('marlo_bottles') === 3) {
        await w.say('player', 'There was a chest in the grotto — coins, sea glass, and a little ship in a bottle.');
        await w.say('marlo', 'A ship in a bottle… Nell built those. She said one day she’d build me a real one. Ha! Keep it, sailor. It’s where it belongs.', 'happy');
        await w.say('marlo', 'And from now on, you ride my ferry free. Captain’s orders. No arguments.', 'love');
        s.flags.ferryPass = true;
        this.complete('marlo_bottles');
        this.friend('marlo', 160);
        return true;
      }
    }
    if (!s.flags.questsOpen) {
      // before the quests open, Finn still hands out his old rod
      if (id === 'finn' && !s.flags.gotRod) { await this.finnRod(); return true; }
      if (id === 'ivy' && !s.flags.ivySeeds) { await this.ivySeeds(); return true; }
      return false;
    }
    if (id === 'finn' && !s.flags.gotRod) { await this.finnRod(); return true; }
    if (id === 'ivy' && !s.flags.ivySeeds) { await this.ivySeeds(); return true; }
    // ---- Rosa
    if (id === 'rosa') {
      if (!this.q('rosa_tart')) {
        await w.say('rosa', 'Say, {name}… could I ask a small favor? I want to bake my Gran’s berry tart again. It’s been years.', 'neutral');
        await w.say('rosa', 'I just need 5 Wild Berries. The bushes around the cove are full of them this time of year!', 'happy');
        this.start('rosa_tart');
        return true;
      }
      if (this.active('rosa_tart') && this.stepOf('rosa_tart') === 0 && countItem(s, 'berry') >= 5) {
        w.takeItem('berry', 5);
        await w.say('rosa', 'Oh, they’re perfect! Plump and purple. Give me just a moment…', 'happy');
        await w.fade(1, 0.5);
        audio.sfx('harvest');
        await w.wait(0.6);
        await w.fade(0, 0.5);
        w.giveItem('tart', 1, { quest: true });
        await w.say('rosa', 'One Berry Tart, fresh from the oven! Now… would you do me one more kindness?', 'happy');
        await w.say('rosa', 'Take it to Mabel at the library. We were close, once. Then I lent her Gran’s recipe book and… well. Words were said. Silly words.', 'sad');
        await w.say('rosa', 'Tell her it’s from me. Maybe a tart can say what I never managed to.', 'neutral');
        this.advance('rosa_tart');
        return true;
      }
      if (this.active('rosa_tart') && this.stepOf('rosa_tart') === 2 && countItem(s, 'recipe')) {
        w.takeItem('recipe', 1);
        await w.say('rosa', 'Is that… Gran’s book? She kept it all this time?', 'surprised');
        await w.say('player', 'She says she’s sorry, and that she kept it safe. She’d love to come for tea.');
        await w.say('rosa', '*sniff* That stubborn old dear. I’ll bake her a whole tray tomorrow. Thank you, {name}. Truly.', 'happy');
        await w.say('rosa', 'Oh! And — this has been sitting in my flour jar for ages. It glows when the ovens are warm. I think it belongs with you.', 'neutral');
        await this.giveShard('rosa');
        this.complete('rosa_tart');
        this.friend('rosa', 120); this.friend('mabel', 40);
        return true;
      }
    }
    // ---- Mabel
    if (id === 'mabel') {
      if (this.active('rosa_tart') && this.stepOf('rosa_tart') === 1 && countItem(s, 'tart')) {
        w.takeItem('tart', 1);
        await w.say('mabel', 'A berry tart? From… Rosa?', 'surprised');
        await w.say('mabel', 'Oh, that silly woman. I’ve been meaning to return this for eleven years. Every day I walked past the bakery and every day I lost my nerve.', 'sad');
        w.giveItem('recipe', 1, { quest: true });
        await w.say('mabel', 'Her grandmother’s recipe book. I kept it dusted and safe. Would you bring it back to her? And tell her… I’d love to come for tea.', 'neutral');
        this.advance('rosa_tart');
        this.friend('mabel', 60);
        return true;
      }
      if (!this.q('mabel_pages')) {
        await w.say('mabel', 'Oh, {name}. I have a small mystery for you, if you enjoy such things.', 'neutral');
        await w.say('mabel', '"The Legend of Old Glimmer" — our only copy — lost five pages to a gust of wind when I opened the window. They could be anywhere in the cove.', 'sad');
        await w.say('mabel', 'The old ink glows faintly, so they’re easier to spot at dusk. I’d be ever so grateful.', 'happy');
        this.start('mabel_pages');
        this.game.spawnPages();
        return true;
      }
      if (this.active('mabel_pages') && this.stepOf('mabel_pages') === 1) {
        w.takeItem('page', 5);
        await w.say('mabel', 'All five! Let me see… yes, yes, in order… oh, listen to this.', 'happy');
        await w.letter('The Legend of Old Glimmer', 'When the first keeper lit the lantern, the village gave it a heart: five pieces of sea-glass, each warmed by a kindness freely given.\n\nSo long as the village cares for one another, the heart shines. But should it ever crack, its pieces will wander — and they will return only to one who mends what was broken between neighbors.', '— p. 47, restored');
        await w.say('mabel', 'Five pieces… mended between neighbors. Goodness. And look what was tucked in the binding all along.', 'surprised');
        await this.giveShard('mabel');
        this.complete('mabel_pages');
        this.friend('mabel', 120);
        return true;
      }
    }
    // ---- Finn
    if (id === 'finn') {
      if (!this.q('finn_moonfin')) {
        await w.say('finn', 'Hey. Can I tell you something kind of weird?', 'neutral');
        await w.say('finn', 'My grandpa swore there’s a fish out there called the Moonfin. Silver, like it swallowed the moon. Only rises after dark.', 'neutral');
        await w.say('finn', 'I’ve looked for years. Never seen one. Maybe you’d have better luck. Try the sea after 8pm.', 'sad');
        this.start('finn_moonfin');
        return true;
      }
      if (this.active('finn_moonfin') && this.stepOf('finn_moonfin') === 1 && countItem(s, 'fish_moonfin')) {
        await w.say('finn', 'No way. NO way. Is that…?', 'surprised');
        await w.say('finn', 'It’s real. Grandpa was right. He was right the whole time…', 'happy');
        await w.say('finn', 'You should keep it — or let it go, whatever feels right. But take this too. Grandpa’s lucky charm. It started glowing the night the lighthouse went dark.', 'neutral');
        await this.giveShard('finn');
        this.complete('finn_moonfin');
        this.friend('finn', 140);
        return true;
      }
    }
    // ---- Theo
    if (id === 'theo') {
      if (!this.q('bridge')) {
        await w.say('theo', 'You’ve been asking about the meadow. Wren too. The bridge.', 'neutral');
        await w.say('theo', 'I can rebuild it. Need 20 wood and 500 coin for rope, nails and a proper beam. Town fund’s empty.', 'neutral');
        await w.say('theo', 'Bring what you can. Every bit helps. I’ll do the rest.', 'happy');
        this.start('bridge');
        return true;
      }
    }
    // ---- Wren
    if (id === 'wren') {
      if (!s.flags.bridgeFixed && !this.q('bridge') && !s.flags.wrenAsked) {
        s.flags.wrenAsked = true;
        await w.say('wren', 'Do you think… someone could fix the bridge? Theo has the skill, just not the materials.', 'sad');
        await w.say('wren', 'Maybe you could ask him? Sorry. I shouldn’t ask you for things.', 'neutral');
        return true;
      }
      if (s.flags.bridgeFixed && !this.q('wren_colors')) {
        await w.say('wren', 'The bridge… you did it. I went to my spot this morning and just cried a little. The happy kind.', 'happy');
        await w.say('wren', 'I want to paint the lighthouse. But I’m out of pigments. Could you bring me three flowers? A red poppy, a blue bluebell, a white daisy.', 'neutral');
        this.start('wren_colors');
        return true;
      }
      if (this.active('wren_colors') && this.stepOf('wren_colors') === 1) {
        w.takeItem('poppy', 1); w.takeItem('bluebell', 1); w.takeItem('daisy', 1);
        await w.say('wren', 'They’re perfect. Red for the roofs, blue for the sea, white for… the light.', 'happy');
        await w.fade(1, 0.5); await w.wait(0.5); await w.fade(0, 0.5);
        await w.say('wren', 'Look. Old Glimmer, the way I remember it. Shining.', 'happy');
        await w.say('wren', 'When I mixed the white, this little stone in my paint box started to glow. I think it wants to go home. Would you take it?', 'neutral');
        await this.giveShard('wren');
        this.complete('wren_colors');
        this.friend('wren', 140);
        return true;
      }
    }
    // ---- Pip
    if (id === 'pip') {
      if (!this.q('pip_fireflies')) {
        await w.say('pip', 'Psst. {name}. Can you keep a secret?', 'neutral');
        await w.say('pip', 'I’m kinda scared of the dark. But Mom says fireflies are stars that got lost. If I had some in a jar, I wouldn’t be scared.', 'sad');
        await w.say('pip', 'Could you catch 3? Ivy sells bug nets. They come out at night! Please please please?', 'happy');
        this.start('pip_fireflies');
        return true;
      }
      if (this.active('pip_fireflies') && this.stepOf('pip_fireflies') === 1 && countItem(s, 'firefly') >= 3) {
        w.takeItem('firefly', 3);
        await w.say('pip', 'WHOAAAA. They’re so pretty! They’re like tiny lanterns!', 'love');
        await w.say('pip', 'I’m not scared anymore. Okay, a little. But way less!', 'happy');
        await w.say('pip', 'Here. This is my star rock. I found it on the beach the night the lighthouse went out. You can have it. Adventurers share!', 'happy');
        await this.giveShard('pip');
        this.complete('pip_fireflies');
        this.friend('pip', 140); this.friend('rosa', 40);
        return true;
      }
    }
    // ---- Sol
    if (id === 'sol') {
      if (!this.q('sol_pick') && hearts(s.friendship.sol.pts) >= 1) {
        await w.say('sol', 'Hey friend, weird question. You haven’t seen a little shell guitar pick, have you? Mint green?', 'neutral');
        await w.say('sol', 'Lost it on the beach, near the umbrella. It’s my lucky one. My songs just sound… flatter without it.', 'sad');
        this.start('sol_pick');
        this.game.spawnPick();
        return true;
      }
      if (this.active('sol_pick') && this.stepOf('sol_pick') === 1 && countItem(s, 'pick')) {
        w.takeItem('pick', 1);
        await w.say('sol', 'MY PICK! You legend! Oh, it’s going to be a good night for music.', 'love');
        await w.say('sol', 'Here — free lattes for life. Well, for today. Take these, and come hear me play tonight!', 'happy');
        w.giveItem('coffee', 3);
        this.complete('sol_pick');
        this.friend('sol', 150);
        return true;
      }
    }
    return false;
  }

  async giveShard(from) {
    const w = this.game;
    w.giveItem('shard', 1, { quest: true });
    audio.jingle('shard');
    w.fx.emit('sparkle', w.player.pos.x, 1.2, w.player.pos.z, 16, { color: '#8fe0ff' });
    const n = countItem(this.s, 'shard');
    await w.say(null, '{#8fe0ff}Glimmer Shard{/} received! ({n}/5) It feels warm in your hands.', undefined, { n });
    this.check();
  }

  // --------------------------------------------------------- scenes
  async intro() {
    const w = this.game, s = this.s;
    await w.letter('A letter from Nana', 'My dearest {name},\n\nThe cottage by the cove is yours now — the garden, the creaky stairs, the teapot that whistles slightly off-key. I’ve gone off to see the world at last, the way I always promised myself.\n\nMarigold Cove has been a bit dim since Old Glimmer went dark. The neighbors drifted into their own little corners. But I know you. Where you go, warmth follows.\n\nMayor Hollis will meet you at the pier. Be kind, plant something, and look after each other.', 'With all my love, Nana June ♥');
    s.flags.introHollis = true;
    w.placeNpcsNow();
    await w.fade(0, 1.2);
    await w.wait(0.4);
    await w.say('player', 'So this is Marigold Cove…');
    w.emoteNpc('hollis', 'exclaim');
    await w.npcWalk('hollis', OX + 46.8, OZ + 62.2);
    const L = LINES.hollis.intro;
    await w.say('hollis', L[0][1], L[0][0]);
    await w.say('hollis', L[1][1], L[1][0]);
    s.friendship.hollis.met = true;
    await w.say('hollis', 'Here — June left this with me. The key to her cottage. Well… your cottage now.', 'happy');
    w.giveItem('key_home', 1, { quest: true });
    await w.say('hollis', 'Head up the pier, through the plaza, then west along the main road. You can’t miss the red roof and the garden out front.', 'neutral');
    await w.say('hollis', 'And do say hello to folks along the way. We don’t bite. Except Theo, before coffee.', 'happy');
    s.flags.introHollis = false;
    this.start('arrive');
    w.npcResume('hollis');
    w.hud.showBanner(t('Marigold Cove'), t('Day {n} · Welcome home', { n: s.day }));
    w.hud.tip(w.game.phone && w.game.phone.connected ? t('The {goldLight}stick{/} walks (push it far to run) · {goldLight}A{/} talks & interacts · {goldLight}Bag{/} opens your bag, journal & map')
      : w.input.touchMode ? t('{goldLight}Drag{/} on the left to walk (further to run) · tap {goldLight}Use{/} to talk & interact · {goldLight}Bag{/} opens your bag, journal & map')
        : device() === 'pad' ? t('The {goldLight}stick{/} walks (push it far to run) · {goldLight}{a}{/} talks & interacts · {goldLight}{start}{/} opens your bag, journal & map', { a: ctl('interact'), start: ctl('menu') }) : t('{goldLight}WASD{/} or arrows to move · {goldLight}Shift{/} to run · {goldLight}E{/} to talk & interact · {goldLight}Tab{/} opens your bag, journal & map'), 10);
  }

  async readNote() {
    const w = this.game, s = this.s;
    await w.letter('Nana’s note', 'Welcome home, sprout!\n\nThe watering can is by the door — the garden soil is still good. I left a few turnip seeds in the drawer. Plant them, water them each day, and in three days you’ll have supper.\n\nThe bed is freshly made. Sleep whenever you’re tired — the cove will still be here in the morning.', '— N.');
    if (!s.flags.gotCan) {
      s.flags.gotCan = true;
      w.giveItem('can', 1);
      w.giveItem('seed_turnip', 3);
      w.hud.tip(t('Select {goldLight}seeds{/} and press {goldLight}E{/} facing the garden soil to plant. Water each day with the {goldLight}Watering Can{/}.'), 9);
    }
    if (this.stepOf('arrive') === 1) this.advance('arrive');
  }

  async finnRod() {
    const w = this.game, s = this.s;
    s.flags.gotRod = true;
    await w.say('finn', 'You fish? No? Here — take my old rod. It’s a bit bent, but so am I.', 'happy');
    w.giveItem('rod', 1);
    await w.say('finn', 'Face the water, use the rod, wait for the bobber to dip, then reel. Easy. The hard part’s being patient.', 'neutral');
    this.friend('finn', 20);
  }

  async ivySeeds() {
    const w = this.game, s = this.s;
    s.flags.ivySeeds = true;
    await w.say('ivy', 'Oh! Before I forget — a welcome gift. Your Nana always bought carrot seeds from me first thing each spring.', 'happy');
    w.giveItem('seed_carrot', 4);
    await w.say('ivy', 'Plant them in your garden and water them every day. Come back anytime — I sell all sorts of seeds!', 'neutral');
  }

  async hollisLegend() {
    const w = this.game;
    await w.say('hollis', 'Ah, {name}! Come in, come in. Sit — oh, there’s no chair. Stand comfortably.', 'happy');
    await w.say('hollis', 'You’ll have seen the lighthouse on the point. Old Glimmer. For a hundred years its light guided every boat home.', 'neutral');
    await w.say('hollis', 'Two winters ago a great storm cracked the lantern, and it went dark. The ferry comes less often now. Folks keep to themselves.', 'sad');
    await w.say('hollis', 'Your Nana hoped that you might help this place feel like home again. So — my advice? Start small.', 'neutral');
    await w.say('hollis', 'Plant something. Catch something. Sell something! Put down roots, as they say. Here’s a little something to start.', 'happy');
    await w.say('hollis', 'And do explore! The valley’s bigger than it looks. Bram farms Honeydew Fields out west, Juniper keeps the Whisperwood camp up north, and Captain Marlo sails the ferry to Turtle Isle from the pier.', 'neutral');
    w.addCoins(100);
    this.advance('roots');
  }

  async hollisShards() {
    const w = this.game, s = this.s;
    await w.say('hollis', 'Look at you — a proper Cove local already! Soil under your nails and a fish story to tell.', 'happy');
    const S = w.wild && w.wild.saga;
    if (S) {
      // (World v7: the saga's first chapter takes over from here)
      await w.say('hollis', 'Now, June always said Old Glimmer’s flame is older than the cove itself. That one day someone might come for it, and…', 'neutral');
      await w.say('hollis', 'Hm? Do you hear that? Sounds like…{p} trumpets?', 'surprised');
      this.advance('roots');
      s.flags.questsOpen = true;
      await w.fade(1, 0.5);
      w.setMap('overworld', 91.5, 75);
      S.start('c1_intro', { silent: true });
      return;
    }
    await w.say('hollis', 'Now, there’s an old tale. When Old Glimmer cracked, its heart split into five Glimmer Shards, and they scattered across the cove.', 'neutral');
    await w.say('hollis', 'Legend says they only return to someone who mends what’s broken between neighbors. June believed it. I’m… beginning to.', 'neutral');
    await w.say('hollis', 'Talk to folks. Help where you can. If the shards find their way to you, bring them to the lighthouse. Then we’ll see what we see.', 'happy');
    this.advance('roots');
    s.flags.questsOpen = true;
    this.start('glimmer');
  }

  async hollisFestival() {
    const w = this.game, s = this.s;
    await w.say('hollis', 'I saw it! From my window — the light swept right across the town hall! I dropped my tea!', 'surprised');
    await w.say('hollis', 'You did it, {name}. You and everyone you helped. June would be so proud.', 'happy');
    await w.say('hollis', 'There’s only one thing to do now. Tomorrow night, we hold the Festival of Lights! On the beach, at seven. Everyone will be there.', 'love');
    this.advance('glimmer');
    s.flags.festivalDay = s.day + 1;
    this.start('festival');
  }

  async bridgeFund() {
    const w = this.game, s = this.s;
    const opts = [];
    const wood = countItem(s, 'branch');
    // options stay English templates (the checks below match on them); the
    // dialogue translates them and fills in the amounts from these vars
    const vars = { giveWood: Math.min(wood, 20 - s.fund.wood), giveCoins: Math.min(s.coins, 500 - s.fund.coins), fundCoins: s.fund.coins, fundWood: s.fund.wood };
    if (s.fund.wood < 20 && wood > 0) opts.push('Give wood ({giveWood})');
    if (s.fund.coins < 500 && s.coins > 0) opts.push('Give 100¢');
    if (s.fund.coins < 500 && s.coins > 0) opts.push('Give {giveCoins}¢');
    opts.push('Not now');
    const pick = await w.ask('theo', 'Fund: {fundCoins}/500¢, wood {fundWood}/20. What can you spare?', opts, opts.length - 1, vars);
    const c = opts[pick];
    if (c.startsWith('Give wood')) {
      const n = Math.min(wood, 20 - s.fund.wood);
      w.takeItem('branch', n); s.fund.wood += n;
      audio.sfx('place');
    } else if (c === 'Give 100¢') {
      const n = Math.min(100, s.coins, 500 - s.fund.coins);
      w.addCoins(-n); s.fund.coins += n;
    } else if (c.startsWith('Give') && c.endsWith('¢')) {
      const n = Math.min(s.coins, 500 - s.fund.coins);
      w.addCoins(-n); s.fund.coins += n;
    } else return;
    if (s.fund.coins >= 500 && s.fund.wood >= 20 && !s.flags.fundComplete) {
      s.flags.fundComplete = true;
      await w.say('theo', 'That’s everything. I’ll work through the night. Come see the bridge in the morning.', 'happy');
      this.friend('theo', 150);
      this.check();
    } else {
      await w.say('theo', 'Thanks. Every plank counts.', 'happy');
      this.friend('theo', 15);
    }
  }

  async homeUpgrade() {
    const w = this.game, s = this.s;
    if (s.flags.houseUpgrade) { await w.say('theo', 'Already on it. Sleep somewhere cozy tonight — you’ll wake up in a bigger house.', 'happy'); return; }
    const next = HOME_LEVELS[s.house.level + 1];
    if (!next) return;
    const pick = await w.ask('theo', 'I can extend the cottage — {blurb}. {cost}¢ and {wood} wood.', ['Let’s build it!', 'Maybe later'], 1, { blurb: t(next.blurb), cost: num(next.cost), wood: next.wood });
    if (pick !== 0) return;
    if (s.coins < next.cost || countItem(s, 'branch') < next.wood) {
      await w.say('theo', 'Need {cost}¢ and {wood} wood. You’ve got {coins}¢ and {have} wood. No rush.', 'neutral', { cost: num(next.cost), wood: next.wood, coins: num(s.coins), have: countItem(s, 'branch') });
      return;
    }
    w.addCoins(-next.cost);
    w.takeItem('branch', next.wood);
    s.flags.houseUpgrade = s.house.level + 1;
    audio.sfx('place');
    await w.say('theo', 'Right. I’ll start tonight. Don’t mind the hammering — you’ll wake up in a bigger house.', 'happy');
    this.friend('theo', 60);
  }

  async townProjects() {
    const w = this.game, s = this.s;
    const done = s.flags.projects || [];
    if (s.flags.projectPending) {
      const pr = PROJECTS.find((p) => p.id === s.flags.projectPending);
      await w.say(null, '“{project}” is fully funded. The town is building it overnight!', undefined, { project: t(pr.name) });
      return;
    }
    const open = PROJECTS.filter((p) => !done.includes(p.id));
    if (!open.length) { await w.say(null, 'Every town project is complete. The whole cove is glowing — and a little bit thanks to you.'); return; }
    // each option has its own name & price, so these are translated up front
    const opts = open.slice(0, 4).map((p) => t('{project} ({cost}¢)', { project: t(p.name), cost: num(p.cost) }));
    opts.push('Just looking');
    const pick = await w.ask(null, '{place}Town Projects{/} — fund one and the cove builds it overnight. ({n}/{total} built)', opts, opts.length - 1, { n: done.length, total: PROJECTS.length });
    const pr = pick < opts.length - 1 ? open[pick] : null;   // the last option is “Just looking”
    if (!pr) return;
    const ok = await w.ask(null, pr.desc, ['Fund it ({cost}¢)', 'Not yet'], 1, { cost: num(pr.cost) });
    if (ok !== 0) return;
    if (s.coins < pr.cost) { await w.say(null, 'You’ll need {cost}¢ for that one. Every coin shipped from your crate helps!', undefined, { cost: num(pr.cost) }); return; }
    w.addCoins(-pr.cost);
    s.flags.projectPending = pr.id;
    audio.jingle('purchase');
    await w.say(null, 'You pin your donation to the board. “{project}” — funded! Word spreads fast; by morning it’ll be built.', undefined, { project: t(pr.name) });
    for (const id of NPC_ORDER) if (s.friendship[id].met) s.friendship[id].pts = Math.min(1000, s.friendship[id].pts + 15);
  }

  async bridgeScene() {
    const w = this.game;
    w.hud.showBanner(t('Mending Bridges'), t('The east bridge is rebuilt!'));
    audio.jingle('questDone');
    await w.say(null, 'Word travels fast in a small cove. By morning, everyone is talking about the new bridge to Sunpetal Meadow.');
    await w.say('theo', '(from across town) BRIDGE IS DONE. TELL WREN.', 'happy');
    this.check();
  }

  async lens() {
    const w = this.game, s = this.s;
    if (s.flags.shardsPlaced) { await w.say(null, 'The great lantern hums with warm, golden light.'); return; }
    if (countItem(s, 'shard') < 5) {
      await w.say(null, 'The great lantern of Old Glimmer. Five empty hollows circle its base. ({n}/5 shards)', undefined, { n: countItem(s, 'shard') });
      return;
    }
    const pick = await w.ask(null, 'Five hollows glimmer in the dark. Place the Glimmer Shards?', ['Place the shards', 'Not yet'], 1);
    if (pick !== 0) return;
    w.takeItem('shard', 5);
    s.flags.shardsPlaced = true;
    await w.lighthouseScene();
    if (this.stepOf('glimmer') <= 2) this.advance('glimmer', 3);
  }

  async festivalFinale() {
    const w = this.game, s = this.s;
    await w.finale();
    s.flags.festivalDone = true;
    this.complete('festival');
  }

  // ------------------------------------------------------ notice board
  newBoardRequest() {
    const s = this.s;
    const reqs = [
      ['rosa', 'apple', 3, 90, 'Apples for a crumble!'], ['rosa', 'strawberry', 2, 180, 'Strawberries for jam'],
      ['theo', 'branch', 6, 70, 'Wood for a new shelf'], ['finn', 'fish_mackerel', 1, 120, 'A Mackerel for bait-testing'],
      ['mabel', 'daisy', 2, 50, 'Daisies for the reading room'], ['pip', 'shell', 2, 60, 'Cool shells!!!'],
      ['ivy', 'turnip', 2, 130, 'Turnips for seed-saving'], ['sol', 'strawberry', 1, 110, 'A Strawberry for a new latte'],
      ['hollis', 'fish_sardine', 2, 80, 'Sardines for the town supper'], ['wren', 'poppy', 1, 70, 'A poppy for red paint'],
      ['sol', 'mushroom', 2, 90, 'Mushrooms for soup night'], ['ivy', 'carrot', 2, 150, 'Carrots for the store'],
      ['bram', 'carrot', 3, 170, 'Carrots for Buttercup'], ['juniper', 'pinecone', 3, 60, 'Pinecones for bird feeders'],
      ['marlo', 'fish_mackerel', 2, 150, 'Mackerel for the ferry cat'], ['bram', 'wheat', 4, 120, 'Wheat for the mill'],
    ].filter(([npc, item]) => npc !== 'wren' || s.flags.bridgeFixed || item !== 'poppy');
    const r = reqs[(s.day * 7 + 3) % reqs.length];
    s.board = { npc: r[0], item: r[1], qty: r[2], reward: r[3], text: r[4], day: s.day, done: false };
  }

  async readBoard() {
    const w = this.game, s = this.s;
    if (!s.board || s.board.day !== s.day) this.newBoardRequest();
    const b = s.board;
    if (b.done) { await w.say(null, 'Today’s request has been fulfilled. Check back tomorrow!'); if (s.flags.questsOpen) await this.townProjects(); return; }
    if ((s.day - 1) % 7 === 6) await w.say(null, 'A bright flyer is pinned on top: “PIM’S WANDERING MARKET — TODAY by the plaza stall! Rare goods & curiosities!”');
    // {item}…{/} is a colour tag, so the item name travels as {thing}
    await w.say(null, '{place}Notice Board{/} — "{request}"\n{who} needs {qty}× {item}{thing}{/}. Reward: {reward}¢. (Deliver to {who}.)', undefined, { request: t(b.text), who: NPCS[b.npc].short, qty: b.qty, thing: t(ITEMS[b.item].name), reward: num(b.reward) });
    if (s.fund && this.active('bridge')) await w.say(null, 'Also pinned: "BRIDGE FUND — {coins}/500¢, wood {wood}/20. Donate at Theo’s!"', undefined, { coins: s.fund.coins, wood: s.fund.wood });
    if (s.flags.questsOpen) await this.townProjects();
  }

  async deliverRequest(id) {
    const w = this.game, s = this.s, b = s.board;
    w.takeItem(b.item, b.qty);
    b.done = true;
    w.addCoins(b.reward);
    await w.say(id, 'You brought it! Thank you so much, {name}. Here’s your reward — {reward}¢.', 'happy', { reward: num(b.reward) });
    this.friend(id, 60);
  }
}

const FESTIVAL_LINES = {
  hollis: 'Look at them all, {name}. Every lantern on this beach is a neighbor who came home. Thank you.',
  rosa: 'Mabel and I are sharing a blanket tonight. Can you believe it? Eleven years, and it only took a tart.',
  pip: 'I’m not even a little scared tonight! The whole beach is fireflies! Well, lanterns. Same thing!',
  finn: 'Grandpa would have loved this. The sea’s all lit up. Like the Moonfin, but everywhere.',
  ivy: 'I brought moonflowers! They only open on special nights. I think they knew.',
  theo: 'Built a stand for the lanterns. Nobody asked. Seemed right.',
  mabel: 'I’ll write all of this down tonight. The next chapter of the legend. You’re in it, dear.',
  sol: 'This next song’s for you, {name}. It’s called "Home". Took me six years to write the ending.',
  wren: 'I’m going to paint tonight. All of it. The lanterns, the light… you, if you don’t mind.',
  bram: 'Brought honey cakes for everyone. Buttercup wanted to come too, but she’s shy around fireworks.',
  juniper: 'I’ve never seen the beach this bright. The fireflies are going to be so jealous.',
  marlo: 'Look at the harbor lights. Forty-one years I’ve steered by that lighthouse. It’s good to have her back.',
};
