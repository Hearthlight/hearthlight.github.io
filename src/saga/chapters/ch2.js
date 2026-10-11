// Chapter 2 — The Whispering Woods. Deep Whisperwood & the Windy Heights,
// levels 4–11. The foresters’ trees are sick with gloom; Old Rowan listens to
// them, Tansy wants to be a Lamplighter. Perkins opens the Pelican Post (the
// first flight: up onto the Heights, slightly off). Crumble’s Gustbellies blow
// against the sails of Barley’s mills — and without their wind the Rootway stays
// hidden behind the falls. Down in the roots: Grumbleclaw’s burrow, and Barkbeard, the
// Elder of the Deepwood, asleep in the gloom. His Great Hearth relit, the Murk
// rolls back from the Steppe, the Canyon and Bouncecap Woods.

import '../cast.js';
import { buildSickTree, buildRootDoor, buildLampPost } from '../../models/v7/props7.js';
import { ROOTWAY, ROOTWAY_DOOR, FALLS } from '../dungeons/rootway.js';
import { buildBarkbeard } from '../../combat/v7/woods.js';
import { audio } from '../../engine/audio.js';
import { buildLanternBug } from '../../models/v7/games12.js';

// the woods’ places
const CAMP = { x: 97, z: -20 };                          // the foresters’ camp (its tents by the waystone)
const TREES = [[43, -27], [150, -19], [69, -33]];        // the three whispering trees
const MILLS = [[42, -104], [56, -114], [70, -104]];      // Breezy Hill’s windmills
const MILLER = [57.5, -109];                             // Barley, among his mills
const LAMPS = [[77.6, 12], [75.2, 0], [72, -14]];        // Tansy’s lamp posts, by the camp trail
const HOOTS = [[30.5, -22.5], [116.5, -24.5], [43.5, -19.5]];
const CAIRNS = [[100, -96], [128, -104], [180, -86]];

// ------------------------------------------------------------------ the foresters, and the whispering
async function foresters(S) {
  await S.scene(async (st) => {
    const P = S.P;
    P.gatherAt(CAMP.x - 2.4, CAMP.z + 3.2, 1.6);
    st.actor('rowan', CAMP.x - 0.6, CAMP.z + 0.6, { face: { x: -0.3, z: 1 } });
    st.actor('tansy', CAMP.x + 2.2, CAMP.z + 1.4, { face: { x: -1, z: 0.4 } });
    await st.cam(CAMP.x - 1, CAMP.z + 1, { dur: 0, ppu: st.basePpu() });
    st.sfx('whoosh', { volume: 0.4, pitch: -16 });
    await st.say('narrator', 'The trees of Deep Whisperwood are whispering:{p} “…cold… so cold… the dark came down…”');
    st.heroesFace(CAMP.x - 0.6, CAMP.z + 0.6);
    await st.say('rowan', 'A real Lamplighter’s lantern! I’m Old Rowan, the head forester.', { expr: 'shock' });
    st.hop('tansy'); st.emote('tansy', 'exclaim');
    await st.say('tansy', 'A REAL ONE?! I’m Tansy, future Lamplighter. And I do a {wave}very{/} good owl.', { expr: 'happy' });
    await st.say('rowan', '{key}Barkbeard{/}, the oldest tree of all, keeps our Great Hearth in his roots. And he has gone silent.', { expr: 'sad' });
    await st.say('rowan', '{key}Three of my trees{/} are sick with gloom. {key}Chase it away{/}: they will tell us what happened to Barkbeard.', { expr: 'neutral' });
  });
}

// ------------------------------------------------------------------ Perkins opens the Post
async function thePost(S) {
  await S.scene(async (st) => {
    const P = S.P, R = S.post && S.post.byId('foresters');
    const rx = R ? R.x : CAMP.x - 8, rz = R ? R.z : CAMP.z - 6;
    P.gatherAt(rx + 1.5, rz + 3.4, 1.4);
    st.actor('rowan', rx - 2.6, rz + 2.4, { face: { x: 0.5, z: -0.4 } });
    st.actor('tansy', rx + 3.8, rz + 2.4, { face: { x: -0.6, z: -0.4 } });
    await st.cam(rx, rz + 1.6, { dur: 0, ppu: st.basePpu() });
    await st.say('rowan', 'So the Duchess’s brutes climbed Breezy Hill, and the windmills stopped.', { expr: 'worried' });
    await st.say('rowan', 'The way down to Barkbeard is {key}the Rootway{/}. It hides in the mist, behind the falls.', { expr: 'neutral' });
    await st.say('rowan', 'Only the wind from the mills can blow that mist away. Go and see {key}Barley the miller{/}, up on {key}Breezy Hill{/}.', { expr: 'neutral' });
    await st.say('tansy', 'It’s a long climb, though!', { expr: 'worried' });
    // a shape comes down out of the sky, far too fast
    const p = st.actor('perkins', rx + 7, rz - 4, { face: { x: -1, z: 0.4 } });
    p.n.seatY = 7;
    st.sfx('whoosh', { volume: 0.7 });
    st.walk('perkins', rx + 1.4, rz + 1.2, { speed: 7 });
    for (let k = 0; k < 14; k++) { p.n.seatY = Math.max(0, 7 - k * 0.55); await st.wait(0.05); }
    p.n.seatY = undefined;
    st.sfx('thud', { volume: 0.8 }); st.shake(0.4);
    st.fx('dust', rx + 1.4, 0.3, rz + 1.2, 14);
    st.heroesEmote('exclaim');
    await st.say('perkins', 'PELICAN POST!{p} Did somebody say “long climb”?', { expr: 'happy', hop: true });
    await st.say('perkins', 'Hop in the pouch! Next stop: Breezy Hill!', { expr: 'happy' });
    S.flag('post');
    st.mark('post');
  });
  if (S.post) {
    const from = S.post.byId('foresters'), to = S.post.byId('breezy');
    if (from && to) { S.post.find(from, true); await S.post.fly(from, to, { quip: false }); }
  }
  S.banner('The Pelican Post', 'Find a roost by every town — then press {a} at any of them to fly', { a: S.P.keyName('a') });
  await S.say('narrator', 'You land in a haystack on Breezy Hill.{p} {key}Barley’s mills{/} stand just to the north.');
}

// ------------------------------------------------------------------ the mills turn again
async function theWind(S) {
  await S.scene(async (st) => {
    const P = S.P, [mx, mz] = MILLER;
    P.gatherAt(mx + 1, mz + 3, 1.4);
    st.actor('barley', mx - 1, mz + 1.2, { face: { x: 0.3, z: 1 } });
    await st.cam(56, -108, { dur: 0, ppu: Math.max(8, st.basePpu() / 2) });
    st.sfx('whoosh', { volume: 0.8, pitch: 6 });
    await st.say('barley', 'Listen to that! All three mills are turning again!', { expr: 'love' });
    // a gust rolls off the Heights, down into the gorge
    st.shake(0.3);
    for (let k = 0; k < 16; k++) st.fx('leaf', 50 + Math.random() * 20, 2 + Math.random() * 2, -110 + Math.random() * 12, 1);
    await st.cam(FALLS.x - 3, FALLS.z + 1, { dur: 1.8, ppu: st.basePpu() });
    // Crumble, swept off the hill by the mills’ wind, blown right past
    const c = st.actor('crumble', FALLS.x - 22, FALLS.z - 4, { face: { x: 1, z: 0 } });
    c.n.seatY = 4.5;
    st.walk('crumble', FALLS.x + 20, FALLS.z - 8, { speed: 9 });
    await st.say('crumble', 'Operation Wind-Down has… wound…{p} {shake}DOWNNN!{/}', { expr: 'shock', shake: 1 });
    await st.say('crumble', 'You’ll never wake the old tree! The Duchess put him to sleep FOR EVER!', { expr: 'worried' });
    st.hide('crumble');
    st.sfx('boing', { volume: 0.6 });
    S.flag('millsTurn');
    st.flash('#e8f4ff', 0.3);
    await st.wait(0.4);
    st.mark('door');
    await st.cam(ROOTWAY_DOOR[0], ROOTWAY_DOOR[1], { dur: 0.8 });
    await st.say('narrator', 'The wind blows the mist off the falls: {key}the Rootway{/} is open! Go through the {key}door behind the falls{/}, north-east of the foresters’ camp.');
  });
}

// ------------------------------------------------------------------ the Rootway’s scripts
const R = (id) => ROOTWAY.rooms.find((r) => r.id === id);
const mid = (d, r, dz = 0) => ({ x: d.ox + r.x + r.w / 2, z: d.oz + r.z + r.h / 2 + dz });
// (the fight is paused while a scene plays: a boss shown in one is posed by hand, full size)
const pose = (e) => { e.spawnT = 0; e.obj.scale.setScalar(1); e.obj.position.set(e.x, e.y, e.z); if (e.shadow) e.shadow.position.set(e.x, 0.02, e.z); };

// Grumbleclaw’s den: a grumpy badger who hates the light
R('den').run = async (S, d, r) => {
  const G5 = d.gate('g5');
  if (G5) d.setGate(G5, false);
  const C = S.P.combat, c = mid(d, r, -1);
  if (!C) return;
  const e = C.spawn('grumbleclaw', c.x, c.z - 2, { level: d.def.lv[1], quiet: true });
  e.saga = true; e.home = { x: c.x, z: c.z }; e.state = 'roar'; e.timer = 99;
  r.boss = e; pose(e);
  C.bounds = { x: c.x, z: c.z + 1, rx: r.w / 2 - 2, rz: r.h / 2 - 1.5 };
  await S.scene(async (st) => {
    await st.cam(c.x, c.z, { dur: 0.8 });
    st.sfx('dig', { volume: 0.8 });
    await st.say('narrator', 'Something very large, very grumpy and very furry turns round.');
    await st.title('Grumbleclaw', 'the gloom badger', 2);
    await st.say('narrator', '“This is MY burrow! And — is that a LANTERN?{p} {shake}PUT IT OUT!{/}”');
  });
  e.state = 'chase'; e.timer = 1.2;
};
R('den').tick = (S, d, r) => {
  const e = r.boss;
  if (!e || r.done || e.alive) return;
  r.done = true;
  const C = S.P.combat;
  if (C) { C.bounds = null; for (const q of C.enemies) if (q.alive && q.summoner === e) { q.alive = false; q.fading = 0; q.remove(); } }
  (async () => {
    await S.P.wait(1.2);
    await S.say('narrator', '“Fine! FINE! Keep your silly lantern. I’m moving to the canyon!”');
    await S.say('narrator', 'Grumbleclaw digs away through the wall. At the back of his den, {key}the roots draw aside{/}.');
    const G5 = d.gate('g5');
    if (G5) d.setGate(G5, true);
  })();
};

// Barkbeard: the ground splits, and a tree stands up
R('heart').run = async (S, d, r) => {
  const C = S.P.combat, c = mid(d, r, -2);
  if (!C) return;
  const e = C.spawn('barkbeard', c.x, c.z - 1, { level: d.def.lv[1] + 1, quiet: true });
  e.saga = true; e.home = { x: c.x, z: c.z }; e.state = 'roar'; e.timer = 99; e.y = -5;
  r.boss = e; pose(e);
  C.bounds = { x: c.x, z: c.z + 1.5, rx: r.w / 2 - 2, rz: r.h / 2 - 1.5 };
  await S.scene(async (st) => {
    await st.cam(c.x, c.z + 1, { dur: 0.9 });
    await st.say('narrator', 'In the middle of the clearing, a mound of roots, breathing slowly.{p} In… and out.');
    st.sfx('thunder', { volume: 0.6 }); st.shake(0.8);
    if (st.vfx) st.vfx.shockwave(c.x, c.z, { r: 5, color: '#8a6a4a', life: 0.9, wall: 1 });
    st.fx('dust', c.x, 0.3, c.z, 30, { color: '#6a4a2a' });
    await st.wait(0.4);
    // the tree stands up
    for (let k = 0; k <= 30; k++) { e.y = -5 + (k / 30) * 5; pose(e); if (k % 6 === 0) { st.sfx('thud', { volume: 0.5 }); st.shake(0.4); } await st.wait(0.05); }
    e.y = 0; pose(e);
    st.flash('#b88aff', 0.3);
    await st.wait(0.5);
    st.mark('barkbeard');
    await st.say('barkbeard', '{big}…WHO TRESPASSES…{/}{p} {big}…IN THE HEARTWOOD…{/}', { shake: 1, speed: 0.6 });
    await st.title('Barkbeard', 'the Elder of the Deepwood, lost in the gloom', 2.6);
  });
  e.state = 'chase'; e.timer = 1.4;
};
R('heart').tick = (S, d, r) => {
  const e = r.boss;
  if (!e || r.done || e.alive) return;
  r.done = true;
  const C = S.P.combat;
  if (C) { C.bounds = null; for (const q of C.enemies) if (q.alive && q.summoner === e) { q.alive = false; q.fading = 0; q.remove(); } }
  (async () => {
    const c = mid(d, r, -2);
    await S.P.wait(0.9);
    // (the old tree stays standing where he fell to his knees: himself again)
    const bx = e.x, bz = e.z;
    e.fading = 0; e.remove();
    const tree = buildBarkbeard(S.P.r3d);
    tree.position.set(bx - d.ox, 0, bz - d.oz);
    d.root.add(tree);
    d.anims.push((tm) => tree.userData.anim(tm));
    d.col.add({ x: bx - d.ox, z: bz - d.oz, r: 1.2 });
    d.lights.push({ x: bx, y: 3, z: bz + 1.6, color: '#c8ffd8', power: 1.3, dist: 8 });
    await S.scene(async (st) => {
      await st.cam(bx, bz + 0.6, { dur: 0.7 });
      st.sfx('chime', { volume: 0.8 }); st.flash('#c8ffd8', 0.5);
      if (st.vfx) st.vfx.pillar(bx, bz, { r: 1.4, h: 7, color: '#8ff0c0', life: 1.4 });
      for (let k = 0; k < 16; k++) st.fx('sparkle', bx + (Math.random() - 0.5) * 3, 1 + Math.random() * 4, bz, 2, { color: '#b88aff' });
      void c;
      await st.say('narrator', 'The gloom snaps like old string and blows away.');
      await st.say('barkbeard', 'Hmmm…{p} That was a very long, very bad dream.', { expr: 'sleepy' });
      await st.say('barkbeard', 'Little Lamplighter. You have June’s lantern…{p} and her stubbornness, I think.', { expr: 'happy' });
      await st.say('barkbeard', 'The {key}Great Hearth{/} sleeps under my roots, right behind me. {key}Wake it{/}: it has been waiting for you.', { expr: 'neutral' });
      const G6 = d.gate('g6');
      if (G6) d.setGate(G6, true);
      const rr = d.rooms.find((q) => q.id === 'hearth');
      if (rr) rr.ready = true;
    });
    audio.jingle('festival');
  })();
};

// the Deepwood’s Great Hearth
R('hearth').take = async (S, d, r) => {
  await S.scene(async (st) => {
    const x = d.ox + r.item[0], z = d.oz + r.item[1];
    await st.cam(x, z + 1.5, { dur: 0.6 });
    st.flash('#c8ffd8', 0.5);
    if (st.vfx) st.vfx.pillar(x, z, { r: 0.9, h: 6, color: '#8ff0c0', life: 1.4 });
    st.sfx('shard', { volume: 0.9 });
    S.flag('hearthDeepwood');
    await st.say('narrator', 'The Deepwood’s flame leaps into the lantern, green and gold.{p} {key}Two flames{/} dance in it now.');
  });
  await d.D.exit({ done: true });
};

// ------------------------------------------------------------------ the Deepwood breathes again
async function dawnInTheWoods(S) {
  await S.scene(async (st) => {
    const P = S.P, [x, z] = ROOTWAY_DOOR;
    P.gatherAt(x + 1.4, z + 2.6, 1.4);
    await st.cam(x, z + 1.2, { dur: 0, ppu: st.basePpu() });
    const tree = buildBarkbeard(P.r3d);
    tree.rotation.y = 0.6;
    st.prop('barkbeard', tree, x - 4.4, 0, z + 5);
    st.heroesFace(x - 4.4, z + 5);
    await st.say('barkbeard', 'Hmmm. Daylight, at last.{p} Stand back, little ones: this old tree has work to do.', { expr: 'happy' });
    st.sfx('chime', { volume: 0.9 });
    st.flash('#c8ffd8', 0.6);
    st.shake(0.5);
    if (st.vfx) st.vfx.shockwave(x - 4.4, z + 5, { r: 9, color: '#8ff0c0', life: 1.2, wall: 1.2 });
    await st.lights(0, 0, 1.4);
    // the green light rolls west over the woods: the Murk draws back from three lands
    await st.cam(-30, 30, { dur: 2.6, ppu: Math.max(8, st.basePpu() / 2) });
    S.openZones(['steppe', 'canyon', 'bouncecap']);
    if (P.murk) P.murk.pulse(-1);
    st.sfx('whoosh', { volume: 0.7, pitch: 8 });
    await st.wait(1.4);
    st.mark('murkBack2');
    await st.wait(0.8);
    await st.title('The Deepwood breathes again', 'The Murk rolls back from the Golden Steppe, the Red Canyon and Bouncecap Woods', 4);
    await st.say('narrator', 'Back in Marigold Cove, Mayor Hollis drops his tea again.{p} He has started buying cheaper cups.');
    await st.cam(x, z + 1.2, { dur: 1.4, ppu: st.basePpu() });
    await st.say('barkbeard', 'The next Great Hearth burns out west, in the {key}Golden Steppe{/}, under the old Festival Ring.', { expr: 'worried' });
    await st.say('barkbeard', 'Go {key}west{/}, little Lamplighter, to the {key}Festival Ring{/}.', { expr: 'happy' });
  });
}

// ------------------------------------------------------------------ the chapter
export const CH2 = {
  id: 2, title: 'The Whispering Woods',
  recap: 'Old Glimmer, the lighthouse of Marigold Cove, shines again: one flame burns in Nana June’s lantern. Her letter sends you north, to {key}Deep Whisperwood{/}. Find its Great Hearth, kept by the old tree Barkbeard, and {key}relight it{/}.',
  lv: 5, zones: ['deepwood', 'heights'], opens: ['steppe', 'canyon', 'bouncecap'],
  props: [
    ...TREES.map(([x, z], k) => ({ id: 'tree' + k, at: [x, z], r: 0.9, build: (r3d) => buildSickTree(r3d, 'tree' + k) })),
    { id: 'rootDoor', at: [ROOTWAY_DOOR[0], ROOTWAY_DOOR[1] - 1.4], build: (r3d) => buildRootDoor(r3d), when: (S) => S.has('millsTurn') },
    // (Barkbeard stays by the falls afterwards, basking)
    { id: 'barkbeardHome', at: [ROOTWAY_DOOR[0] - 4.4, ROOTWAY_DOOR[1] + 5], r: 1.2, build: (r3d) => { const g = buildBarkbeard(r3d); g.rotation.y = 0.6; return g; }, when: (S) => S.done('c2_relight') },
    ...LAMPS.map(([x, z], k) => ({ id: 'lamp' + k, at: [x, z], r: 0.2, build: (r3d) => buildLampPost(r3d, 'lamp' + k), when: (S) => !!S.st.q.c2_lamps })),
  ],
  npcs: [
    { id: 'rowan', at: [CAMP.x - 0.6, CAMP.z + 0.6], face: { x: -0.3, z: 1 }, when: (S) => S.done('c1_relight'),
      lines: ['Listen. Even the moss has something to say.', 'The trees see everything that walks in this wood.'] },
    { id: 'tansy', at: [CAMP.x + 2.2, CAMP.z + 1.4], face: { x: -1, z: 0.4 }, when: (S) => S.done('c1_relight'),
      lines: ['Hoo-hoo! That was my owl. Good, right?', 'When I’m a Lamplighter, I’ll have TWO lanterns.'] },
    { id: 'barley', at: MILLER, face: { x: 0.3, z: 1 }, when: (S) => S.has('post'),
      lines: ['A mill that doesn’t turn is just a very tall shed.', 'No wind, no flour. No flour, no bread!'] },
  ],
  // (Breezy Hill’s mills stand still from the day the Duchess came until their Gustbellies are gone)
  update(S, dt) {
    S.millT = (S.millT || 0) - dt;
    if (S.millT > 0) return;
    S.millT = 0.5;
    const pois = S.P.big && S.P.big.pois && S.P.big.pois.list;
    if (!pois) return;
    MILLS.forEach(([x, z], k) => {
      const p = pois.find((q) => q.kind === 'windmill' && Math.hypot(q.x - x, q.z - z) < 1);
      if (p) p.stopped = S.has('snuffed') && !S.has('mill' + k);
    });
  },
  quests: {
    c2_road: {
      title: 'The Lamplighters’ Road', auto: true, lv: 5,
      brief: 'Nana June’s letter says the foresters of Deep Whisperwood keep the next Great Hearth. Take the old road north to their camp.',
      steps: [
        { do: 'go', text: 'Follow the old road north to the {key}foresters’ camp{/}', at: [CAMP.x, CAMP.z + 2], r: 7, run: foresters },
      ],
    },
    c2_trees: {
      title: 'The Whispering Trees', auto: true, after: 'c2_road', lv: 6,
      brief: 'Barkbeard, the old tree who keeps the Great Hearth, has gone silent. Three sick trees saw what happened: chase the gloom off each of them.',
      steps: [
        // (a Gloom Boar leads the first and the last tree’s camps: one brute, and a small foe or two)
        ...TREES.map(([x, z], k) => ({ do: 'camp', text: ['Chase the gloom from the {key}sick tree{/}, far west of the camp', 'Chase the gloom from the {key}sick tree{/} in the Hidden Glade, far to the east', 'Chase the gloom from the {key}sick tree{/} on the trail, west of the camp'][k],
          camp: { id: 'c2_tree' + k, at: [x, z + 3], level: 5 + k, foes: [['gloomling', 'rootling'], ['rootling', 'rootling', 'fox'], ['gloomling', 'rootling', 'stag']][k], n: [1, 3, 2][k], big: ['boar', null, 'boar'][k], done: 'The gloom lets go of the old tree!' },
          run: async (S) => {
            S.flag('tree' + k);
            S.P.world.fx.emit('sparkle', x, 2.4, z, 20, { color: '#8ff0c0' });
            await S.say('narrator', ['“…warm… thank you…{p} …big round brutes went {key}up the hill{/}… blowing…”', '“…{key}the mills{/}… the mills have stopped…”', '“…Barkbeard sleeps… deep… {key}under the falls{/}…”'][k]);
          } })),
        { do: 'talk', npc: 'rowan', text: 'Go back to {key}Old Rowan{/} at the foresters’ camp', run: thePost },
      ],
    },
    c2_mills: {
      title: 'Gone With the Wind', auto: true, after: 'c2_trees', lv: 8,
      brief: 'The door to Barkbeard only shows when the windmills of Breezy Hill turn. A Gustbelly blows against each of Barley’s three mills: chase them off.',
      steps: [
        { do: 'talk', npc: 'barley', text: 'Talk to {key}Barley the miller{/}, among his mills on Breezy Hill',
          run: async (S) => {
            await S.say('barley', 'Gustbellies! Big round brutes, one at each mill, blowing my sails backwards!', { expr: 'angry' });
            await S.say('barley', 'Chase them off my {key}three mills{/}, would you? West, high and east.', { expr: 'happy' });
          } },
        // (a Gustbelly at each mill, blowing against its sails; the high mill’s has a Storm Ram beside it)
        ...MILLS.map(([x, z], k) => ({ do: 'camp', text: ['Chase the Gustbelly from the {key}west mill{/}, west of Barley', 'Chase the Gustbelly from the {key}high mill{/}, north of Barley', 'Chase the Gustbelly from the {key}east mill{/}, east of Barley'][k],
          camp: { id: 'c2_mill' + k, at: [x, z + 3.5], level: 8 + (k === 1 ? 1 : 0), foes: [['wisp', 'gloomling'], ['stormram'], ['wisp', 'gloomling']][k], n: [1, 1, 2][k], big: 'gustbelly', done: 'The sails creak — and turn!' },
          run: async (S) => { S.flag('mill' + k); audio.sfx('whoosh', { volume: 0.6 }); } })),
        { do: 'scene', text: 'Watch the wind come back to {key}Breezy Hill{/}', run: theWind },
      ],
    },
    c2_rootway: {
      title: 'The Rootway', auto: true, after: 'c2_mills', lv: 9,
      brief: 'The mills turn, and the door behind the falls is open. Cross the Rootway to Barkbeard, then relight the Deepwood’s Great Hearth.',
      steps: [
        { do: 'go', text: 'Go through the {key}door behind the falls{/}, north-east of the foresters’ camp', at: ROOTWAY_DOOR, r: 2.4, run: async (S) => { if (S.P.dungeons) await S.P.dungeons.enter('rootway'); else S.flag('rootwayDone'); } },
        { do: 'dungeon', id: 'rootway', text: 'Cross the Rootway to the Deepwood’s {key}Great Hearth{/}' },
      ],
    },
    c2_relight: {
      title: 'The Deepwood Breathes Again', auto: true, after: 'c2_rootway', lv: 10,
      brief: 'The Deepwood’s flame burns in the lantern. Outside the Rootway, Barkbeard chases the Murk from the lands to the west.',
      steps: [
        { do: 'scene', text: 'Watch the {key}Deepwood{/} wake up, outside the Rootway', run: dawnInTheWoods },
      ],
      done: async (S) => { if (!S.st.lit.includes('deepwood')) S.st.lit.push('deepwood'); S.save(); },
      next: 3,
    },
    // ---- side quests
    c2_lamps: {
      title: 'Lamplighter in Training', kind: 'side', giver: 'tansy', lv: 5, when: (S) => S.done('c2_road'), dust: 25,
      brief: 'Tansy dreams of being a Lamplighter. Walk the lantern up to her three lamp posts, along the trail south-west of the camp, to light them.',
      offer: async (S) => {
        await S.say('tansy', 'I put up lamp posts along the camp trail! For practice.', { expr: 'happy' });
        await S.say('tansy', 'Only a real lantern can light them. Pleeease, go and light my {key}three lamp posts{/}!', { expr: 'love' });
      },
      steps: LAMPS.map(([x, z], k) => ({ do: 'go', text: ['Light Tansy’s {key}first lamp post{/}, at the south end of the trail', 'Light Tansy’s {key}second lamp post{/}, further north on the trail', 'Light Tansy’s {key}last lamp post{/}, on the trail west of the camp'][k], at: [x, z + 1], r: 2,
        run: async (S) => {
          S.flag('lamp' + k);
          S.P.world.fx.emit('sparkle', x + 0.4, 1.9, z, 12, { color: '#ffd66b' });
          audio.sfx('chime', { volume: 0.6, pitch: k * 2 });
          if (k === 2) await S.say('tansy', 'THEY’RE ALL LIT! Hoo-hoo! That’s my owl being happy!', { expr: 'love' });
        } })),
    },
    c2_owl: {
      title: 'The Owl Who Lost Her Hoot', kind: 'side', giver: 'rowan', lv: 6, when: (S) => S.done('c2_road'), dust: 25,
      brief: 'Old Hootenanny, the foresters’ owl, has lost her hoot. Catch its three echoes around Deep Whisperwood, then bring them to Old Rowan.',
      offer: async (S) => {
        await S.say('rowan', 'Old Hootenanny, our owl, has lost her hoot. It wandered off on its own.', { expr: 'neutral' });
        await S.say('rowan', '{key}Three echoes{/} of it drift round the wood. {key}Bring them back{/} to me, would you?', { expr: 'happy' });
      },
      steps: [
        { do: 'collect', text: 'Catch the {key}echoes of the hoot{/} around Deep Whisperwood', item: 'Stray Hoot', n: 3, spots: HOOTS, hint: '“…hoo… hoo…” — a little echo, all on its own' },
        { do: 'talk', npc: 'rowan', text: 'Bring the hoot back to {key}Old Rowan{/}, at the foresters’ camp',
          run: async (S) => {
            await S.say('narrator', 'Above the camp, a long, delighted “HOOOOO!”');
            await S.say('rowan', 'There she is. Thank you, friend.', { expr: 'happy' });
            await S.say('tansy', 'Hmph. Mine’s better.', { expr: 'angry' });
          } },
      ],
    },
    c2_flour: {
      title: 'Flour Power', kind: 'side', giver: 'barley', lv: 8, when: (S) => S.has('mill0') && S.has('mill1') && S.has('mill2'), dust: 30,
      brief: 'The mills turn again. Barley wants Rosa, the baker of Marigold Cove, to have his first sack of flour: take it down to her.',
      offer: async (S) => {
        await S.say('barley', 'The first flour from my mills! Take this sack to {key}Rosa{/}, the baker of Marigold Cove, would you?', { expr: 'happy' });
      },
      steps: [
        { do: 'talk', npc: 'rosa', text: 'Take Barley’s flour to {key}Rosa{/}, the baker of Marigold Cove',
          run: async (S) => {
            await S.say('rosa', 'Flour from Breezy Hill? So the mills are turning again!', { expr: 'love' });
            await S.say('rosa', 'Tell Barley a loaf as big as a cartwheel is waiting for him.', { expr: 'happy' });
          } },
      ],
    },
    c2_cairns: {
      title: 'Stack ’Em High', kind: 'side', giver: 'barley', lv: 9, when: (S) => S.done('c2_mills'), dust: 30,
      brief: 'The Gustbellies blew down the cairns that guide walkers across the Windy Heights. Stack all three back up, along the road east of the mills.',
      offer: async (S) => {
        await S.say('barley', 'Those Gustbellies blew down the cairns that guide walkers on the Heights.', { expr: 'worried' });
        await S.say('barley', 'Stack the {key}three cairns{/} back up, would you? They stand along the road, {key}east of my mills{/}.', { expr: 'happy' });
      },
      steps: CAIRNS.map(([x, z], k) => ({ do: 'go', text: ['Stack the {key}first cairn{/}, on the road east of the mills', 'Stack the {key}second cairn{/}, north-east of the lake', 'Stack the {key}last cairn{/}, far east along the road'][k], at: [x, z + 1.2], r: 2,
        run: async (S) => { S.P.world.fx.emit('sparkle', x, 1, z, 10, { color: '#e8d6b4' }); audio.sfx('place', { volume: 0.7 }); } })),
    },
    // ---- round 12: mini-games (rounds with a score and three ranks: saga/games12.js)
    c2_range: {
      title: 'Flour Fight',
      brief: 'The mills turn again, and Barley has painted gloom faces on old mill boards. {key}Throw flour bags{/} at them on Breezy Hill — but never at a hen.',
      kind: 'side', repeat: true, giver: 'barley', lv: 9, when: (S) => S.done('c2_mills'), dust: 8,
      offer: async (S) => {
        await S.say('barley', 'I painted {key}gloom faces{/} on old mill boards. Come and throw flour bags at them!', { expr: 'happy' });
        await S.say('barley', 'My range is {key}west of the high mill{/}. And don’t hit the hens: they hold grudges.', { expr: 'worried' });
      },
      steps: [
        { do: 'toss', text: 'Knock down the {key}gloom boards{/} at Barley’s range, west of the high mill', at: [48.5, -116.8], w: 9, time: 45, friend: 'hen', shot: 'sack', cry: 'cluck', puff: '#fff7e6',
          rule: 'Stand in front of a board and press {a}. Gloom: 1, gold: 3 — never the hens!', verb: 'Throw', hint: 'Line up with a board, then throw — not at the hens!', oops: 'Not the hen! −2',
          run: async (S) => { await S.say('barley', 'Flour everywhere! Best day the hill has had in years.', { expr: 'love' }); } },
      ],
    },
    c2_fireflies: {
      title: 'Lights for Tansy',
      brief: 'Tansy has lantern jars and nothing to put in them. {key}Net fireflies{/} for her in the glade by the foresters’ camp, when they glow.',
      kind: 'side', repeat: true, giver: 'tansy', lv: 6, when: (S) => S.done('c2_road'), dust: 15,
      offer: async (S) => {
        await S.say('tansy', 'A Lamplighter needs light. I have jars… and no fireflies.', { expr: 'sad' });
        await S.say('tansy', '{key}Net some{/} for me, in the glade {key}by the camp{/}? Swing when they glow!', { expr: 'happy' });
      },
      steps: [
        { do: 'net', text: 'Net {key}fireflies{/} when they glow, in the glade by the foresters’ camp', at: [100, -24.5], r: 5, n: 6, per: 2, flies: 11, model: buildLanternBug,
          run: async (S) => { await S.say('tansy', 'Look at them blink! This one is called Hoo-hoo.', { expr: 'love' }); } },
      ],
    },
  },
};
