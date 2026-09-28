// Chapter 9 — Moor & Machines. Hollowmoor, Prism Springs, Cogsworth and the Aurora
// Tundra, levels 35–40. Candlewick whispers: the moor’s ghosts are sad, not scary. Four of
// them — the old manor’s butler, cook, gardener and maid — tell a story in pieces, and
// only a lantern shows them. In Hollowmoor Manor every clock stopped at twenty to nine;
// the rooms shift between THEN and NOW; the Lady in Grey waits in the ballroom — Lady
// Honoria, the Duchess’s mother. At peace, she shows the heroes what happened thirty years
// ago on the Starfall stage (a sepia flashback: a hen, the laughter, a girl running) and
// the letter home that promised « when they applaud me ». Then Cogsworth: Master Tock and
// the Lantern Cannon — a rainbow caught at Prism Springs for its lens, a test-fire held
// against a gloom squall — and the Aurora Camp, the last camp before the Umbral Scar.

import '../cast.js';
import { buildGloomstage } from '../../models/v7/gloomstage.js';
import { buildShowStage } from '../../models/v7/props7.js';
import { buildMount } from '../../models/mounts3d.js';
import { buildManorFacade, buildLanternCannon, buildWorkshop, buildCuckoo, buildAurora } from '../../models/v7/moor9.js';
import { HOLLOWMOOR, MANOR_DOOR } from '../dungeons/hollowmoor.js';
import { turn } from '../clocks.js';
import { kit, THREE } from '../../models/v7/kit.js';
import { t } from '../../i18n.js';

// the chapter’s places
const CANDLE = [1128, 124];                                  // Candlewick’s lane
const TALLOW = [1131.5, 121.2];
const GHOSTS_NEAR = [1170, 142];
const FACADE = [1175, 135.4];
const COG = [1250, -68];                                     // Cogsworth’s square
const TOCK = [1243.5, -72.5];
const WORKSHOP = [1238.5, -76];
const CANNON = [1250, -66];
const RHODA = [1204, 256.5];
const GEYSERS = [{ at: [1176, 262], period: 6, burst: 0.28 }, { at: [1222, 262], period: 5.2, burst: 0.22, twin: true }, { at: [1160, 222], period: 2.8, burst: 0.4 }];
const CAMP = [1046, -104];
const STAGE = [91.5, 65.2];                                  // (thirty years ago) the Starfall stage, north of the plaza’s fountain

const hide = (P, on) => { for (const p of P.players) { p.away = on; p.hidden = on; if (p.actor) p.actor.hidden = on; } };

// ------------------------------------------------------------------ Candlewick
async function coldOpen(S) {
  await S.scene(async (st) => {
    const P = S.P, [x, z] = CANDLE;
    if (P.state) P.state.hour = 18.6;
    P.gatherAt(x - 1, z + 3, 1.2);
    await st.cam(x, z, { dur: 0, ppu: Math.max(8, Math.round(st.basePpu() * 0.75)) });
    st.music('moor');
    await st.say('narrator', 'Hollowmoor, at dusk. Heather, and fog, and a road nobody takes twice. Candlewick sits in the middle of it, every window lit.');
    for (let k = 0; k < 6; k++) st.fx('sparkle', x - 8 + Math.random() * 16, 1 + Math.random() * 2, z - 6 + Math.random() * 8, 1, { color: '#c8e0ff' });
    await st.say('narrator', 'Out on the moor, something pale drifts between the stones — and is gone when you look straight at it.');
    st.heroesEmote('exclaim', 1.4);
    st.actor('tallow', TALLOW[0], TALLOW[1], { face: { x: -0.3, z: 1 } });
    await st.cam(TALLOW[0], TALLOW[1] + 1, { dur: 1, ppu: st.basePpu() });
    await st.say('tallow', '(whispering) Shh! Come in, come in. Quietly. We don’t shout in Candlewick. The ghosts are sad enough already.', { expr: 'worried' });
    st.mark('candlewick');
    await st.title('Moor & Machines', 'Chapter 9');
  });
}
async function tallowTalk(S) {
  await S.say('tallow', 'Aunt Tallow, chandler. Beeswax for the living, tallow for the dead — they like the smell. Reminds them of supper.', { expr: 'neutral' });
  await S.say('tallow', 'They’re not frightening, dears. They’re sad. They wander the moor looking for something they’ve forgotten.', { expr: 'sad' });
  await S.say('tallow', 'Nobody can see them, mind — except by lamplight. And that lantern of yours is the brightest lamp I’ve seen in thirty years.', { expr: 'surprised' });
  await S.say('tallow', 'Go gently. Listen. They were the old manor’s household, you know. Out there on the hill.', { expr: 'neutral' });
}

// ------------------------------------------------------------------ the manor
async function tallowManor(S) {
  await S.say('tallow', 'A butler, a cook, a gardener and a maid. All of them waiting for the same letter as their Lady.', { expr: 'sad' });
  await S.say('tallow', 'Lady Honoria. She had a daughter who sang like a lark. The girl went off to the Starfall Festival to sing, and never came back.', { expr: 'sad' });
  await S.say('tallow', 'Her Ladyship stopped every clock in the house, the night the letter didn’t come. Said she’d start them again when her girl came home.', { expr: 'worried' });
  await S.say('tallow', 'The manor’s east of here, on the hill. Take a candle. Take two.', { expr: 'neutral' });
}

const R = (id) => HOLLOWMOOR.rooms.find((r) => r.id === id);
const mid = (d, r, dz = 0) => ({ x: d.ox + r.x + r.w / 2, z: d.oz + r.z + r.h / 2 + dz });

R('ballroom').run = async (S, d, r) => {
  const C = S.P.combat;
  if (!C) return;
  const c = mid(d, r);
  const e = C.spawn('ladygrey', c.x, c.z - 2, { level: d.def.lv[1], quiet: true });
  e.saga = true; e.sagaTag = 'lady'; e.home = { x: c.x, z: c.z };
  e.spawnT = 0; e.obj.scale.setScalar(1);
  e.era = () => r.ck.era;
  e.onThen = () => { const inside = S.P.players.filter((p) => (p.connected || S.solo)); turn(d, r, inside, 'then'); };
  r.boss = e;
  C.bounds = { x: c.x, z: c.z, rx: r.w / 2 - 1.2, rz: r.h / 2 - 1 };
  await S.scene(async (st) => {
    await st.cam(c.x, c.z - 2, { dur: 0.8 });
    st.sfx('bell', { volume: 0.7, pitch: -10 });
    await st.say('narrator', 'The ballroom. In the middle of the dusty floor, a lady in grey is dancing with nobody, very slowly, to a tune nobody else can hear.');
    await st.say('honoria', 'Is that you, Gloria? You’re late for tea.{p}…No. No. You’re not her. Nobody is ever her.', { expr: 'sad' });
    await st.say('honoria', 'Leave me to my waiting. I am VERY good at it.', { expr: 'angry', shake: 1 });
    st.mark('lady');
    await st.title('The Lady in Grey', 'Lady Honoria, who waits', 2.2);
    await st.say('narrator', 'When the clocks run, she is only a memory. When they stop, she is a ghost — and ghosts can be reached.');
  });
};
R('ballroom').tick = (S, d, r) => {
  const e = r.boss, C = S.P.combat;
  if (!e || r.done || e.alive) return;
  r.done = true;
  e.fading = 99; e.hold = true;
  if (C) { C.bounds = null; for (const q of C.enemies) if (q.alive && q.sagaTag === 'lady') { q.alive = false; q.fading = 0.3; } }
  (async () => {
    await S.P.wait(0.6);
    turn(d, r, S.P.players.filter((p) => p.connected || S.solo), 'then');
    await S.scene(async (st) => {
      await st.cam(e.x, e.z - 1, { dur: 0.7 });
      await st.say('narrator', 'The Lady in Grey stops dancing. For the first time in thirty years, she looks at someone who is really there.');
      await st.say('honoria', '…That lantern. June’s lantern. June came to tea here once, you know. She laughed at all the right places.', { expr: 'surprised' });
      await st.say('honoria', 'You want to know why. Everyone always wants to know why. Very well. Look.', { expr: 'neutral' });
      st.mark('whyLook');
      st.music(null);
    });
    e.hold = false; e.fading = 0; if (e.remove) e.remove();
    await d.D.exit({ done: true });
    await flashback(S);
    await ladyAtPeace(S);
  })();
};

// (a stage actor made see-through and pale: a ghost)
export function ghostify(a) {
  const m = a && a.n && a.n.model;
  if (!m || m.ghosted) return;
  m.ghosted = true;
  const pale = new THREE.Color('#c8d8ff'), ghost = (mt) => { const c = mt.clone(); c.transparent = true; c.opacity = 0.6; c.depthWrite = false; if (c.color) c.color.lerp(pale, 0.5); return c; };
  m.root.traverse((o) => { if (o.isMesh && o.material) { o.material = Array.isArray(o.material) ? o.material.map(ghost) : ghost(o.material); o.castShadow = false; } });
}

// back on the manor’s porch: her last words, and the clocks start again
async function ladyAtPeace(S) {
  await S.scene(async (st) => {
    const P = S.P, [x, z] = MANOR_DOOR;
    P.gatherAt(x, z + 2.6, 1.3);
    await st.cam(x, z + 0.5, { dur: 0, ppu: st.basePpu() });
    const a = st.actor('honoria', x, z + 0.4, { face: { x: 0, z: 1 } });
    ghostify(a);
    st.music('hollowmoor');
    await st.fade(0, 0.9);
    await st.say('honoria', 'She wrote to me that night. « I’ll come home when they applaud me. »{p}They never did. So she never did.', { expr: 'sad' });
    await st.say('honoria', 'And now she flies about in a theatre, putting out the world’s lights so that nobody can ever laugh at her again.', { expr: 'sad' });
    st.mark('ladyPeace');
    await st.say('honoria', 'When you find her… tell my Gloria…{p}…tell her the tea is still warm.', { expr: 'love' });
    st.sfx('chord', { volume: 0.8 });
    st.flash('#fff4e0', 0.6);
    for (let k = 0; k < 14; k++) st.fx('sparkle', x + (Math.random() - 0.5) * 2, 1 + Math.random() * 2.5, z + 0.4 + (Math.random() - 0.5) * 1.5, 1, { color: '#e8f0ff' });
    st.hide('honoria');
    S.flag('ladyPeace');
    if (!S.st.lit.includes('moor')) S.st.lit.push('moor');
    S.save();
    await st.lights(0, 0, 1);
    await st.say('narrator', 'The Lady in Grey is gone. Behind her, all through the house, every clock in Hollowmoor Manor begins, all together, to tick. The seventh flame lights in the lantern.');
    await st.say('narrator', 'By the gate, a rose that hasn’t flowered in thirty years opens one bud.');
  });
}

// thirty years ago: the Starfall stage, a girl, an aria, a hen — in sepia
async function flashback(S) {
  await S.scene(async (st) => {
    const P = S.P, [x, z] = STAGE;
    await st.fade(1, 0.8);
    const back = S.P.state ? S.P.state.hour : null;
    if (P.state) P.state.hour = 20.5;
    hide(P, true);
    st.sepia(1);
    const stage = buildShowStage(P.r3d);
    st.prop('stage', stage, x, 0, z - 1.2);
    st.actor('gloria', x, z - 1.2, { face: { x: 0, z: 1 } }).n.seatY = 0.5;
    const crowd = [];
    for (const [k, id] of ['hollis', 'rosa', 'june', 'bram', 'mabel', 'marlo', 'sol'].entries()) { const a = st.actor(id, x - 4.5 + (k % 4) * 3, z + 2.6 + Math.floor(k / 4) * 1.3, { face: { x: 0, z: -1 } }); if (a) crowd.push(a); }
    await st.cam(x, z + 1, { dur: 0, ppu: st.basePpu() });
    st.music(null);
    await st.fade(0, 1);
    await st.title('Thirty years ago', 'The Starfall Festival, Marigold Cove', 2.4);
    await st.say('narrator', 'The Starfall Festival, thirty years ago. The whole cove on the plaza. And on the stage, a girl of sixteen with a songbook, about to sing her first aria.');
    st.sfx('tone', { volume: 0.6, pitch: 7 });
    for (let k = 0; k < 4; k++) { st.fx('note', x + (Math.random() - 0.5) * 2, 2.6, z - 1, 1); await st.wait(0.3); }
    await st.say('gloria', '♪ Laaa… la-la-LAAA… ♪', { expr: 'happy' });
    st.mark('young');
    await st.say('narrator', 'She was good. She was really, truly good.{p}And then, from the wings—');
    const hen = buildMount(P.r3d, 'hen', { variant: 0, wild: true });
    hen.root.scale.setScalar(0.8);
    st.prop('hen', hen.root, x + 3, 0.5, z - 1.2);
    st.sfx('cluck', { volume: 0.9 });
    await st.move('hen', { x: x + 0.6, z: z - 1 }, 1.4);
    await st.say('gloria', '♪ LAAA— ♪{p}…a… hen?', { expr: 'shock' });
    // (the laughter)
    st.sfx('cheer', { volume: 0.8, pitch: 6 });
    for (const a of crowd) if (a && a.n) a.n.hop();
    st.mark('laughter');
    await st.say('narrator', 'Somebody laughed. Then everybody laughed — not unkindly; it was a very funny hen. But she was sixteen, and it was her first aria.');
    await st.say('gloria', '…', { expr: 'cry' });
    st.walk('gloria', x - 7, z - 3, { speed: 4 });
    await st.wait(1.2);
    st.hide('gloria');
    await st.say('narrator', 'She ran. And that night a letter went home to Hollowmoor: « Don’t wait up. I’ll come home when they applaud me. »');
    await st.fade(1, 0.9);
    st.dropProp('stage'); st.dropProp('hen');
    for (const a of crowd) if (a) st.hide(a.id);
    hide(P, false);
    if (P.state && back != null) P.state.hour = back;
    st.sepia(0);
  });
}

// ------------------------------------------------------------------ Cogsworth
async function tockTalk(S) {
  await S.say('tock', 'Visitors! In three ticks I’ll be with you. Tick. Tick. Tick. Here I am.', { expr: 'happy', hop: true });
  await S.say('tock', 'Master Tock, clockmaker. I keep time. Somebody has to — the fog keeps trying to stop it.', { expr: 'smug' });
  await S.say('tock', 'This « Umbral Spotlight » of hers. I’ve watched it from the tower through my longest glass. It’s a light that EATS light. Nasty. Clever. Nasty.', { expr: 'worried' });
  await S.say('tock', 'Only one thing can put out a light like that: a light that won’t be eaten. That lantern of yours, focused down to a single beam. A Lantern Cannon!', { expr: 'love' });
  await S.say('tock', 'I have the barrel. I have the carriage. I lack the lens — a lens that can hold a rainbow. There’s only one place rainbows sit still long enough: Prism Springs, when the geysers blow.', { expr: 'neutral' });
}
async function rhodaTalk(S) {
  await S.say('rhoda', 'Rule one: stay on the boardwalk. Rule two: don’t feed the geysers. Rule three: I LOVE rules.', { expr: 'happy' });
  await S.say('rhoda', 'A rainbow for a lens? Stand by a geyser — not too close, rule four — and catch it right at the top of the spray. Not before. Rule five.', { expr: 'neutral' });
  await S.say('rhoda', 'Old Punctual, the Double, and the Hiccup. Each has its own rhythm. Watch first. Rule six: watch first.', { expr: 'smug' });
}
async function tockLens(S) {
  await S.say('tock', 'Three rainbows! Let me— tweezers— tick— there. A lens that holds the whole spectrum. Beautiful. Look how it hums.', { expr: 'love' });
  await S.say('tock', 'Now the test-fire. Out on the square. Mind — the fog has eyes, and she will NOT like this.', { expr: 'worried' });
}
async function testFired(S) {
  await S.scene(async (st) => {
    const P = S.P, [x, z] = CANNON;
    await st.cam(x, z - 4, { dur: 0.8, ppu: st.basePpu() });
    const cannon = buildLanternCannon(P.r3d);
    cannon.userData.anim(0, 1);
    st.prop('cannon', cannon, x, 0, z);
    st.sfx('charge', { volume: 0.8 });
    await st.wait(0.8);
    // (a beam of gold, clean through the fog, into the sky)
    const K = kit(P.r3d), beam = K.noCast(K.put(new THREE.Group(), K.cyl(0.4, 0.6, 30, 12), K.light('#ffe08a', 0.55), 0, 15, 0));
    const bg = beam.parent;
    bg.rotation.x = -0.5;
    st.prop('beam', bg, x, 1, z - 0.3);
    st.flash('#fff4c8', 0.7);
    st.sfx('boom', { volume: 1 }); st.sfx('chord', { volume: 0.8 });
    st.shake(1);
    for (let k = 0; k < 20; k++) st.fx('sparkle', x + (Math.random() - 0.5) * 2, 2 + Math.random() * 10, z - Math.random() * 8, 1, { color: '#fff0a0' });
    await st.wait(0.6);
    st.mark('fire');
    await st.say('narrator', 'The Lantern Cannon fires. A beam of pure lantern-light goes up through the fog like a gold needle through grey wool — and where it passes, the fog doesn’t come back.');
    st.dropProp('beam');
    st.actor('tock', x - 2.4, z + 1.2, { face: { x: 1, z: -0.3 } });
    await st.say('tock', 'IT WORKS! It works it works it WORKS! I haven’t been this happy since I fixed the sun-dial!', { expr: 'love', hop: true });
    st.actor('fidget', x + 2.6, z + 1.4, { face: { x: -1, z: -0.3 } });
    await st.say('fidget', 'She keeps the Spotlight at the top of the Gloomstage, above the stage itself. If this thing can get a clear shot…', { expr: 'worried' });
    await st.say('tock', 'It will need a clear shot. And a very, very steady hand. I’ll bring it. I’ll bring a spare hand.', { expr: 'smug' });
    await st.say('fidget', 'The Gloomstage is moored over the Umbral Scar, north-east past the tundra. The last camp before it is the Aurora Camp.', { expr: 'neutral' });
  });
}

// ------------------------------------------------------------------ the Aurora Camp
async function auroraCamp(S) {
  await S.scene(async (st) => {
    const P = S.P, [x, z] = CAMP;
    await st.fade(1, 0.6);
    if (P.state) P.state.hour = 22;
    P.gatherAt(x, z + 2, 1.3);
    const aur = buildAurora(P.r3d, 44);
    st.prop('aurora', aur, x, 0, z - 14);
    await st.cam(x, z - 2, { dur: 0, ppu: Math.max(8, Math.round(st.basePpu() * 0.75)) });
    for (const [i, id] of ['minnow', 'fidget', 'brick', 'tock', 'wendy'].entries()) st.actor(id, x - 3 + i * 1.5, z - 0.4 + (i % 2) * 0.6, { face: { x: 0, z: -1 } });
    st.music('tundra');
    await st.fade(0, 1.2);
    st.mark('aurora');
    await st.say('narrator', 'The Aurora Camp: yurts, a fire, and over the tundra, the northern lights, green and violet, rippling like curtains before a show.');
    await st.say('minnow', 'Backstage, there’s a trapdoor under the prompter’s box. It goes straight up into the fly tower. We used to hide there during her warm-ups.', { expr: 'neutral' });
    await st.say('brick', 'Her warm-ups were very long. And very loud.', { expr: 'worried' });
    await st.say('fidget', 'The Spotlight hangs in the fly tower. Get the cannon up there and you can put it out for good.', { expr: 'neutral' });
    // (the Gloomstage, far off, against the aurora)
    const ship = buildGloomstage(P.r3d);
    ship.scale.setScalar(0.6);
    st.prop('ship', ship, x + 18, 9, z - 20);
    // (framed where a thing that high shows up: its z less its height)
    await st.cam(x + 16, z - 20 - 9 + 4, { dur: 2 });
    st.mark('scar');
    await st.say('narrator', 'Far to the north-east, over a black scar in the land, the Gloomstage hangs against the aurora. Every window lit. Every seat, empty.');
    await st.say('wendy', 'Tomorrow night, then. Tea: strong. Nerves: stronger.', { expr: 'neutral' });
    await st.cam(x, z - 2, { dur: 1.2 });
    await st.say('fidget', '…Do you think she knows? About her mother?', { expr: 'sad' });
    await st.say('brick', 'Brick thinks everybody should know when somebody keeps the tea warm for them.', { expr: 'sad' });
    await st.title('Tomorrow night: the Grand Finale', 'The Murk rolls back from the Umbral Scar', 3.6);
    S.openZones(['scar']);
    if (S.P.murk) S.P.murk.pulse(-1);
    st.dropProp('aurora'); st.dropProp('ship');
  });
}

// ------------------------------------------------------------------ side quests
async function cuckooOffer(S) {
  await S.say('tock', 'Oh, tick-tock-bother. My town clock’s cuckoo has sprung its spring and run off round the square. It does that when it’s frightened. Of everything.', { expr: 'worried' });
  await S.say('tock', 'Would you catch it for me? Gently! It tires if you keep after it. It doesn’t tire of complaining.', { expr: 'neutral' });
}
async function cuckooDone(S) {
  await S.say('tock', 'There’s my cuckoo! Back in the clock you go. Say thank you. …It says « cuckoo ». That’s thank you.', { expr: 'love', hop: true });
}
async function hikersOffer(S) {
  await S.say('rhoda', 'Rule nine: never hike in the steam. Two hikers did not read rule nine. Now they are somewhere in it, and I can hear them arguing.', { expr: 'angry' });
  await S.say('rhoda', 'Find them. The steam’s thick — you’ll only see them close up. Then bring them back to me for a lecture.', { expr: 'neutral' });
}
async function hikersDone(S) {
  await S.say('rhoda', 'Both of them! Now, you two: rule nine. Repeat after me. « Never hike in the steam. »', { expr: 'smug' });
  await S.say('hikerfen', '« Never hike in the steam. » …We were looking for rule ten.', { expr: 'sad' });
  await S.say('rhoda', 'There IS no rule ten. Yet. I’ll write it now.', { expr: 'happy' });
}

// ------------------------------------------------------------------ the chapter
export const CH9 = {
  id: 9, title: 'Moor & Machines', lv: 38, zones: ['moor', 'prism', 'clock', 'tundra'], opens: ['scar'],
  // (the moor, until the Lady is at peace: grey, and very quiet)
  gloom(S) {
    if (S.st.ch !== 9 || S.has('ladyPeace')) return 0;
    const B = S.P.big;
    for (const p of S.P.players) {
      if (!p.connected && !S.solo) continue;
      const zz = B && B.zoneAt ? B.zoneAt(p.pos.x, p.pos.z) : null;
      if (zz && zz.id === 'moor') return 0.5;
    }
    return 0;
  },
  props: [
    { id: 'manorFacade', at: FACADE, r: 0, build: (r3d) => buildManorFacade(r3d), when: (S) => S.st.ch >= 9 },
    { id: 'workshop', at: WORKSHOP, r: 2, build: (r3d) => buildWorkshop(r3d), when: (S) => S.st.ch >= 9 },
    { id: 'cannonIdle', at: CANNON, r: 1, build: (r3d) => buildLanternCannon(r3d), when: (S) => S.done('c9_cannon') },
  ],
  npcs: [
    { id: 'tallow', at: TALLOW, face: { x: -0.3, z: 1 }, when: (S) => S.st.ch >= 9,
      lines: ['(whispering) Beeswax for the living, tallow for the dead. And lavender for anybody who can’t sleep.', '(whispering) The ghosts are quieter since you came. They like being listened to. Most people do.'] },
    { id: 'tock', at: TOCK, face: { x: 0.3, z: 1 }, when: (S) => S.st.ch >= 9,
      lines: ['Tick. Tick. Tick. …Sorry, thinking.', 'A clock doesn’t keep time. It keeps you company while time goes by.'] },
    { id: 'rhoda', at: RHODA, face: { x: -0.2, z: 1 }, when: (S) => S.st.ch >= 9,
      lines: ['Rule eleven: have fun. Rule twelve: not TOO much fun.', 'Old Punctual has erupted every six minutes for four hundred years. I have never once been late for work.'] },
  ],
  quests: {
    c9_moor: {
      title: 'The Moor’s Ghosts', auto: true, lv: 35,
      steps: [
        { do: 'scene', text: '…', run: coldOpen },
        { do: 'talk', npc: 'tallow', text: 'Talk to Aunt Tallow in Candlewick', run: tallowTalk },
        { do: 'seek', text: 'Find the ghosts on the moor — only a lantern shows them — and listen', near: GHOSTS_NEAR, reveal: 4.5,
          ghosts: [
            { id: 'pembroke', at: [1150, 131], lines: ['Her Ladyship takes her tea at four. Every day. Two cups. One for her… and one for Miss Gloria.', 'I have poured the second cup for thirty years. It is always cold by morning.'] },
            { id: 'dumpling', at: [1188, 125], lines: ['Miss Gloria sang in my kitchen. On the stool by the stove, with her feet swinging. The bread rose higher when she sang, I swear it.'] },
            { id: 'hob', at: [1160, 160], lines: ['She planted a rose by the gate the day she left. « For when I come back, » she said. It’s never flowered. Thirty years. Stubborn thing.'] },
            { id: 'posy', at: [1195, 153], lines: ['The letter came the night of the Festival. I carried it up on a silver tray.', 'Her Ladyship read it, stopped the hall clock with one finger… and then every clock in the house. Twenty to nine.'] },
          ] },
      ],
    },
    c9_manor: {
      title: 'Hollowmoor Manor', auto: true, after: 'c9_moor', lv: 37,
      steps: [
        { do: 'talk', npc: 'tallow', text: 'Tell Aunt Tallow what the ghosts said', run: tallowManor },
        { do: 'go', text: 'Go to Hollowmoor Manor, on the hill east of Candlewick', at: MANOR_DOOR, r: 2.4, run: async (S) => { if (S.P.dungeons) await S.P.dungeons.enter('hollowmoor'); else S.flag('ladyPeace'); } },
        { do: 'dungeon', id: 'hollowmoor', text: 'Go through Hollowmoor Manor — then and now — to the ballroom' },
      ],
    },
    c9_cannon: {
      title: 'The Lantern Cannon', auto: true, after: 'c9_manor', lv: 38,
      steps: [
        { do: 'talk', npc: 'tock', text: 'Find Master Tock, the clockmaker of Cogsworth', run: tockTalk },
        { do: 'talk', npc: 'rhoda', text: 'Ask Ranger Rhoda at Prism Springs about the geysers', run: rhodaTalk },
        { do: 'snap', text: 'Catch a rainbow at the peak of each geyser’s spray', spots: GEYSERS, r: 4.5 },
        { do: 'talk', npc: 'tock', text: 'Bring the rainbows back to Master Tock', run: tockLens },
        { do: 'defend', text: 'Keep the gloom off the Lantern Cannon while it charges', at: CANNON, r: 8, time: 40, hp: 100, every: 4.5, foes: ['clockwork', 'wisp', 'bogling', 'poltergeist'], level: 38, model: buildLanternCannon, go: 'Test-fire!', sub: 'keep the gloom off the cannon while it charges', lost: 'The cannon’s knocked over! Master Tock rights it — from the top.' },
        { do: 'scene', text: '…', run: testFired },
      ],
    },
    c9_aurora: {
      title: 'The Last Camp', auto: true, after: 'c9_cannon', lv: 39,
      steps: [
        { do: 'go', text: 'Go to the Aurora Camp on the tundra, the last camp before the Scar', at: CAMP, r: 5, run: auroraCamp },
      ],
      next: 10,
    },
    // ---- side quests
    c9_cuckoo: {
      title: 'The Runaway Cuckoo', kind: 'side', giver: 'tock', after: 'c9_manor', lv: 38, dust: 30,
      offer: cuckooOffer,
      steps: [
        { do: 'chase', text: 'Catch Master Tock’s runaway cuckoo round the square', area: [COG[0] - 2, COG[1] + 3, 7.5], speed: 5.4, tire: 22, model: buildCuckoo, sound: 'chirp', caught: 'Cuckoo!' },
        { do: 'talk', npc: 'tock', text: 'Give the cuckoo back to Master Tock', run: cuckooDone },
      ],
    },
    // ---- a mini-game, to play again and again (World v7 M13): the manor’s staff play hide-and-seek
    c9_ghosthunt: {
      title: 'Ghost Hunt', kind: 'side', repeat: true, giver: 'tallow', after: 'c9_manor', lv: 38, dust: 20,
      offer: async (S) => {
        await S.say('tallow', '(whispering) Now they’re not sad any more, the manor’s staff have taken up hide-and-seek. They’re dreadful at it. Pembroke hides behind the same stone every time.', { expr: 'happy' });
        await S.say('tallow', '(whispering) Go and find them, would you? Only a lantern shows them. They do so love being found.', { expr: 'love' });
      },
      steps: [
        { do: 'seek', text: 'Find the four ghosts hiding on the moor — only a lantern shows them', near: [1170, 154], reveal: 4,
          ghosts: [
            { id: 'pembroke', at: [1142, 146], lines: ['Found, sir. Again. I was hiding with great dignity.'] },
            { id: 'dumpling', at: [1200, 136], lines: ['Oh, you found me! I made scones while I waited. Ghost scones. They’re very light.'] },
            { id: 'hob', at: [1152, 170], lines: ['Behind the gorse, same as last time. The rose by the gate has six buds now. Six!'] },
            { id: 'posy', at: [1186, 170], lines: ['I wasn’t hiding. I was… dusting the moor. It’s very dusty.'] },
          ] },
        { do: 'talk', npc: 'tallow', text: 'Tell Aunt Tallow you found them all', run: async (S) => {
          await S.say('tallow', '(whispering) All four! They’ll be giggling about it till supper. Ghosts don’t eat supper. They giggle anyway.', { expr: 'happy' });
        } },
      ],
    },
    c9_hikers: {
      title: 'Rule Nine', kind: 'side', giver: 'rhoda', after: 'c9_manor', lv: 38, dust: 30,
      offer: hikersOffer,
      steps: [
        { do: 'seek', text: 'Find the two hikers lost in the steam', near: [1196, 238], reveal: 3.5, solid: true, verb: 'Help',
          ghosts: [
            { id: 'hikerfen', at: [1188, 243], lines: ['Oh thank goodness. I’ve been walking in a circle for an hour. It was a very nice circle.'] },
            { id: 'hikerbo', at: [1208, 232], lines: ['Is Fen with you? We had a disagreement about left. And right. And north.'] },
          ] },
        { do: 'talk', npc: 'rhoda', text: 'Bring them back to Ranger Rhoda', run: hikersDone },
      ],
    },
  },
};
