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
    await st.say('narrator', 'Hollowmoor, at dusk: fog, heather, and one village with every window lit — {key}Candlewick{/}.');
    for (let k = 0; k < 6; k++) st.fx('sparkle', x - 8 + Math.random() * 16, 1 + Math.random() * 2, z - 6 + Math.random() * 8, 1, { color: '#c8e0ff' });
    await st.say('narrator', 'Out on the moor, something pale drifts between the stones… and is gone.');
    st.heroesEmote('exclaim', 1.4);
    st.actor('tallow', TALLOW[0], TALLOW[1], { face: { x: -0.3, z: 1 } });
    await st.cam(TALLOW[0], TALLOW[1] + 1, { dur: 1, ppu: st.basePpu() });
    await st.say('tallow', '(whispering) Shh! Come in, quietly. The ghosts are sad enough already.', { expr: 'worried' });
    st.mark('candlewick');
    await st.title('Moor & Machines', 'Chapter 9');
  });
}
// (who the ghosts are, what shows them, and the order: find the four, listen)
async function tallowTalk(S) {
  await S.say('tallow', 'I’m Aunt Tallow, the candle-maker. Don’t fear our ghosts, dears: they’re only sad.', { expr: 'neutral' });
  await S.say('tallow', 'There are {key}four of them{/}, out on {key}the moor{/}. Only your lantern shows them: go close, and listen.', { expr: 'neutral' });
}

// ------------------------------------------------------------------ the manor
// (whose daughter Miss Gloria was, that her mother still waits, and where the manor is)
async function tallowManor(S) {
  await S.say('tallow', 'Miss Gloria? She was the daughter of {key}Lady Honoria{/}, the lady of the manor.', { expr: 'sad' });
  await S.say('tallow', 'Thirty years ago she left to sing at the Starfall Festival. She never came home.', { expr: 'sad' });
  await S.say('tallow', 'Her mother still waits for her at {key}the manor{/}, on the hill {key}east of here{/}. Go and see her.', { expr: 'worried' });
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
    await st.say('narrator', 'The ballroom. A lady in grey dances all alone, very slowly.');
    await st.say('honoria', 'Is that you, Gloria? You’re late for tea.{p}…No. That is not my daughter.', { expr: 'sad' });
    await st.say('honoria', 'Then leave me to my waiting. I am VERY good at it.', { expr: 'angry', shake: 1 });
    st.mark('lady');
    await st.title('The Lady in Grey', 'Lady Honoria, who waits', 2.2);
    // (the fight’s one rule, said once: she can’t be touched THEN — a clock’s plate brings NOW back)
    await st.say('narrator', '{key}THEN{/}, she is only a memory: nothing can touch her. Step on a clock’s plate to return to {key}NOW{/}.');
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
      // (said plainly, before the flashback: her daughter Gloria is the Duchess)
      await st.say('honoria', '…That lantern. So you have met my daughter: you call her {key}the Duchess{/}.', { expr: 'surprised' });
      await st.say('honoria', 'You want to know why she puts out the lights? Look.', { expr: 'neutral' });
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
    await st.say('honoria', 'They never did applaud her. So she never came home.', { expr: 'sad' });
    await st.say('honoria', 'Now she puts out every light, so that nobody can ever laugh at her again.', { expr: 'sad' });
    st.mark('ladyPeace');
    await st.say('honoria', 'When you find my Gloria…{p}tell her the {key}tea is still warm{/}.', { expr: 'love' });
    st.sfx('chord', { volume: 0.8 });
    st.flash('#fff4e0', 0.6);
    for (let k = 0; k < 14; k++) st.fx('sparkle', x + (Math.random() - 0.5) * 2, 1 + Math.random() * 2.5, z + 0.4 + (Math.random() - 0.5) * 1.5, 1, { color: '#e8f0ff' });
    st.hide('honoria');
    S.flag('ladyPeace');
    if (!S.st.lit.includes('moor')) S.st.lit.push('moor');
    S.save();
    await st.lights(0, 0, 1);
    await st.say('narrator', 'The Lady in Grey fades away. In the lantern, an eighth flame lights.');
    await st.say('narrator', 'All through the manor, the clocks start ticking again. By the gate, the rose opens its first bud.');
    // (the scene ends on where to go next: the objective that follows says the same)
    await st.say('narrator', 'To put out the Duchess’s Spotlight, it will take a clockmaker. Go north to {key}Cogsworth{/} and find {key}Master Tock{/}.');
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
    // (who we are looking at, and when — before anything happens)
    await st.say('narrator', 'The Starfall Festival, thirty years ago. On the stage: {key}Gloria, aged sixteen{/} — the future Duchess.');
    st.sfx('tone', { volume: 0.6, pitch: 7 });
    for (let k = 0; k < 4; k++) { st.fx('note', x + (Math.random() - 0.5) * 2, 2.6, z - 1, 1); await st.wait(0.3); }
    await st.say('gloria', '♪ Laaa… la-la-LAAA… ♪', { expr: 'happy' });
    st.mark('young');
    await st.say('narrator', 'She sang well. Really, truly well.{p}And then, from the wings…');
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
    await st.say('narrator', 'Somebody laughed. Then the whole cove laughed: it was a very funny hen.');
    await st.say('gloria', '…', { expr: 'cry' });
    await st.say('narrator', 'Nobody meant any harm. But she was sixteen, and it was her very first aria.');
    st.walk('gloria', x - 7, z - 3, { speed: 4 });
    await st.wait(1.2);
    st.hide('gloria');
    // (what it explains: the promise she is still keeping)
    await st.say('narrator', 'She ran away. That same night, she wrote to her mother: « I’ll come home {key}when they applaud me{/}. »');
    await st.fade(1, 0.9);
    st.dropProp('stage'); st.dropProp('hen');
    for (const a of crowd) if (a) st.hide(a.id);
    hide(P, false);
    if (P.state && back != null) P.state.hour = back;
    st.sepia(0);
  });
}

// ------------------------------------------------------------------ Cogsworth
// (the chapter’s plan in four lines: the Spotlight, the cannon, the missing lens, where to get it)
async function tockTalk(S) {
  await S.say('tock', 'Master Tock, clockmaker! The Duchess’s Umbral Spotlight is a light that EATS light.', { expr: 'worried', hop: true });
  await S.say('tock', 'Only one thing can put it out: your lantern’s light, in a single beam. A {key}Lantern Cannon{/}!', { expr: 'love' });
  await S.say('tock', 'Mine is built. All it lacks is a lens that can hold a rainbow.', { expr: 'neutral' });
  await S.say('tock', 'Rainbows only sit still at {key}Prism Springs{/}, south of the moor. Go and ask {key}Ranger Rhoda{/}.', { expr: 'neutral' });
}
async function rhodaTalk(S) {
  await S.say('rhoda', 'A rainbow? Stand by a geyser and catch it {key}at the very top{/} of its spray. Not before!', { expr: 'neutral' });
  await S.say('rhoda', 'Rule one: watch first. Rule two: I LOVE rules.', { expr: 'happy' });
  await S.say('rhoda', 'There are {key}three geysers{/}: Old Punctual, the Double and the Hiccup. One rainbow from each!', { expr: 'smug' });
}
async function tockLens(S) {
  await S.say('tock', 'Three rainbows! Tweezers… tick… there: the lens is done.', { expr: 'love' });
  await S.say('tock', 'Now the test-fire, on the square. The Duchess will NOT like it: {key}protect the cannon{/}!', { expr: 'worried' });
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
    await st.say('narrator', 'The Lantern Cannon fires! Where its golden beam passes, the fog does not come back.');
    st.dropProp('beam');
    st.actor('tock', x - 2.4, z + 1.2, { face: { x: 1, z: -0.3 } });
    await st.say('tock', 'IT WORKS! I haven’t been this happy since I fixed the sundial!', { expr: 'love', hop: true });
    st.actor('fidget', x + 2.6, z + 1.4, { face: { x: -1, z: -0.3 } });
    await st.say('fidget', 'The Duchess keeps her Spotlight at the very top of the Gloomstage. One clear shot would put it out.', { expr: 'worried' });
    await st.say('tock', 'Then I’m bringing it! Meet us at the {key}Aurora Camp{/}, on the tundra {key}west of here{/}.', { expr: 'smug' });
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
    await st.say('minnow', 'The plan: backstage, a {key}trapdoor{/} goes straight up to her Spotlight. One shot from the cannon, and it goes out.', { expr: 'neutral' });
    await st.say('brick', 'We hid up there during her warm-ups. Very long. Very loud.', { expr: 'worried' });
    // (the Gloomstage, far off, against the aurora)
    const ship = buildGloomstage(P.r3d);
    ship.scale.setScalar(0.6);
    st.prop('ship', ship, x + 18, 9, z - 20);
    // (framed where a thing that high shows up: its z less its height)
    await st.cam(x + 16, z - 20 - 9 + 4, { dur: 2 });
    st.mark('scar');
    await st.say('narrator', 'Far off, over a black scar in the land, hangs the Gloomstage: every window lit, every seat empty.');
    await st.cam(x, z - 2, { dur: 1.2 });
    await st.say('fidget', '…Does the Duchess know? That her mother waited for her, all this time?', { expr: 'sad' });
    await st.say('brick', 'Brick thinks everybody should know when somebody keeps the tea warm for them.', { expr: 'sad' });
    await st.title('Tomorrow night: the Grand Finale', 'The Murk rolls back from the Umbral Scar', 3.6);
    S.openZones(['scar']);
    if (S.P.murk) S.P.murk.pulse(-1);
    st.dropProp('aurora'); st.dropProp('ship');
  });
}

// ------------------------------------------------------------------ side quests
async function cuckooOffer(S) {
  await S.say('tock', 'Oh, tick-tock-bother! My clock’s cuckoo has sprung its spring and run off.', { expr: 'worried' });
  await S.say('tock', 'Would you {key}catch it{/} for me? Keep after it: it tires as it runs.', { expr: 'neutral' });
}
async function cuckooDone(S) {
  await S.say('tock', 'My cuckoo! …It says « cuckoo ». That means thank you.', { expr: 'love', hop: true });
}
async function hikersOffer(S) {
  await S.say('rhoda', 'Rule nine: never hike in the steam. Two hikers didn’t read it: they’re lost in there.', { expr: 'angry' });
  await S.say('rhoda', 'You’ll only see them from close up. Find them, {key}just north of here{/}, and bring them back.', { expr: 'neutral' });
}
async function hikersDone(S) {
  await S.say('rhoda', 'Both of them! Now repeat after me: « Never hike in the steam. »', { expr: 'smug' });
  await S.say('hikerfen', '« Never hike in the steam. » …We were looking for rule ten.', { expr: 'sad' });
}

// ------------------------------------------------------------------ the chapter
export const CH9 = {
  id: 9, title: 'Moor & Machines',
  recap: 'Seven flames burn in the lantern, and the Understudies are on your side now. The Duchess has flown to the Umbral Scar to ready her Spotlight, a light that eats all the others. Cross {key}Hollowmoor{/}, the moor of ghosts, and find a way to {key}put it out{/}.',
  lv: 38, zones: ['moor', 'prism', 'clock', 'tundra'], opens: ['scar'],
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
      lines: ['(whispering) Beeswax for the living, tallow for the ghosts: they like the smell.', '(whispering) The ghosts are calmer since you came: they like being listened to.'] },
    { id: 'tock', at: TOCK, face: { x: 0.3, z: 1 }, when: (S) => S.st.ch >= 9,
      lines: ['Tick. Tick. Tick. …Sorry, thinking.', 'A clock doesn’t keep time: it keeps you company while time goes by.'] },
    { id: 'rhoda', at: RHODA, face: { x: -0.2, z: 1 }, when: (S) => S.st.ch >= 9,
      lines: ['Rule eleven: have fun. Rule twelve: not TOO much fun.', 'Old Punctual has been on time for four hundred years. So have I.'] },
  ],
  quests: {
    c9_moor: {
      title: 'The Moor’s Ghosts',
      brief: 'Sad ghosts wander Hollowmoor, and only your lantern shows them. Find {key}all four{/} and listen: they have a story to tell.',
      auto: true, lv: 35,
      steps: [
        { do: 'scene', text: 'Arrive in {key}Candlewick{/}, a village on the moor', run: coldOpen },
        { do: 'talk', npc: 'tallow', text: 'Talk to {key}Aunt Tallow{/} in Candlewick', run: tallowTalk },
        { do: 'seek', text: 'Find the {key}4 ghosts{/} on the moor, east of Candlewick', near: GHOSTS_NEAR, reveal: 4.5,
          // (heard in any order: each names Miss Gloria, each brings one piece — the tea, her singing, the rose, the letter)
          ghosts: [
            { id: 'pembroke', at: [1150, 131], lines: ['Her Ladyship takes tea at four. Two cups: one for her… and one for {key}Miss Gloria{/}.', 'I have poured that second cup for thirty years. By morning, it is always cold.'] },
            { id: 'dumpling', at: [1188, 125], lines: ['{key}Miss Gloria{/} sang in my kitchen. The bread rose higher when she sang, I swear.'] },
            { id: 'hob', at: [1160, 160], lines: ['The day she left, {key}Miss Gloria{/} planted a rose by the gate: « For when I come back. » It has never flowered.'] },
            { id: 'posy', at: [1195, 153], lines: ['The night of the Festival, a letter came from {key}Miss Gloria{/}. Her Ladyship read it… and stopped every clock.'] },
          ] },
      ],
    },
    c9_manor: {
      title: 'Hollowmoor Manor',
      brief: 'The ghosts served Lady Honoria, who has waited thirty years for her daughter Gloria. Cross her manor to {key}the ballroom{/}: its clocks switch between THEN and NOW.',
      auto: true, after: 'c9_moor', lv: 37,
      steps: [
        { do: 'talk', npc: 'tallow', text: 'Tell {key}Aunt Tallow{/}, in Candlewick, what the ghosts said', run: tallowManor },
        { do: 'go', text: 'Go to {key}Hollowmoor Manor{/}, on the hill east of Candlewick', at: MANOR_DOOR, r: 2.4, run: async (S) => { if (S.P.dungeons) await S.P.dungeons.enter('hollowmoor'); else S.flag('ladyPeace'); } },
        { do: 'dungeon', id: 'hollowmoor', text: 'Cross the manor to {key}the ballroom{/}: its clocks switch THEN and NOW' },
      ],
    },
    c9_cannon: {
      title: 'The Lantern Cannon',
      brief: 'Master Tock’s Lantern Cannon can put out the Duchess’s Spotlight, but it lacks a lens. Catch {key}three rainbows{/} at Prism Springs to make one.',
      auto: true, after: 'c9_manor', lv: 38,
      steps: [
        { do: 'talk', npc: 'tock', text: 'Find {key}Master Tock{/}, the clockmaker of Cogsworth, north of the moor', run: tockTalk },
        { do: 'talk', npc: 'rhoda', text: 'Ask {key}Ranger Rhoda{/} about the geysers at Prism Springs, south of the moor', run: rhodaTalk },
        { do: 'snap', text: 'Catch a rainbow at the top of the spray of each of the {key}3 geysers{/}', spots: GEYSERS, r: 4.5 },
        { do: 'talk', npc: 'tock', text: 'Bring the rainbows back to {key}Master Tock{/}, in Cogsworth', run: tockLens },
        { do: 'defend', text: 'Keep the gloom off the {key}Lantern Cannon{/}, on Cogsworth’s square', at: CANNON, r: 8, time: 40, hp: 100, every: 4.5, foes: ['clockwork', 'wisp', 'bogling', 'poltergeist'], level: 38, model: buildLanternCannon, go: 'Test-fire!', sub: 'keep the gloom off the cannon while it charges', lost: 'The cannon’s knocked over! Master Tock rights it — from the top.' },
        { do: 'scene', text: 'Watch the {key}Lantern Cannon{/} fire', run: testFired },
      ],
    },
    c9_aurora: {
      title: 'The Last Camp',
      brief: 'The Lantern Cannon works. Join Master Tock and the Understudies at the {key}Aurora Camp{/}, the last camp before the Gloomstage.',
      auto: true, after: 'c9_cannon', lv: 39,
      steps: [
        { do: 'go', text: 'Go to the {key}Aurora Camp{/}, on the tundra west of Cogsworth', at: CAMP, r: 5, run: auroraCamp },
      ],
      next: 10,
    },
    // ---- side quests
    c9_cuckoo: {
      title: 'The Runaway Cuckoo',
      brief: 'The cuckoo of Master Tock’s clock has run off round Cogsworth’s square. Catch it: it tires as it runs.',
      kind: 'side', giver: 'tock', after: 'c9_manor', lv: 38, dust: 30,
      offer: cuckooOffer,
      steps: [
        { do: 'chase', text: 'Catch {key}the cuckoo{/} running round Cogsworth’s square', area: [COG[0] - 2, COG[1] + 3, 7.5], speed: 5.4, tire: 22, model: buildCuckoo, sound: 'chirp', caught: 'Cuckoo!' },
        { do: 'talk', npc: 'tock', text: 'Bring the cuckoo back to {key}Master Tock{/}, on the square', run: cuckooDone },
      ],
    },
    // ---- a mini-game, to play again and again (World v7 M13): the manor’s staff play hide-and-seek
    c9_ghosthunt: {
      title: 'Ghost Hunt',
      brief: 'Happy at last, the manor’s four ghosts play hide-and-seek on the moor. Find them all: only a lantern shows them.',
      kind: 'side', repeat: true, giver: 'tallow', after: 'c9_manor', lv: 38, dust: 20,
      offer: async (S) => {
        await S.say('tallow', '(whispering) Our ghosts are happy now: they play hide-and-seek on the moor. Very badly.', { expr: 'happy' });
        await S.say('tallow', '(whispering) They love being found. Go and find {key}all four{/}, would you?', { expr: 'love' });
      },
      steps: [
        { do: 'seek', text: 'Find the {key}4 ghosts{/} hiding on the moor, east of Candlewick', near: [1170, 154], reveal: 4,
          ghosts: [
            { id: 'pembroke', at: [1142, 146], lines: ['Found, sir. Again. I was hiding with great dignity.'] },
            { id: 'dumpling', at: [1200, 136], lines: ['Oh, you found me! I made scones while I waited. Ghost scones. They’re very light.'] },
            { id: 'hob', at: [1152, 170], lines: ['Behind the gorse, same as last time. The rose by the gate has six buds now. Six!'] },
            { id: 'posy', at: [1186, 170], lines: ['I wasn’t hiding. I was… dusting the moor. It’s very dusty.'] },
          ] },
        { do: 'talk', npc: 'tallow', text: 'Tell {key}Aunt Tallow{/}, in Candlewick, that you found them all', run: async (S) => {
          await S.say('tallow', '(whispering) All four! They’ll be giggling about it till supper.', { expr: 'happy' });
        } },
      ],
    },
    c9_hikers: {
      title: 'Rule Nine',
      brief: 'Two hikers are lost in the steam of Prism Springs. Find them and bring them back to Ranger Rhoda.',
      kind: 'side', giver: 'rhoda', after: 'c9_manor', lv: 38, dust: 30,
      offer: hikersOffer,
      steps: [
        { do: 'seek', text: 'Find the {key}2 hikers{/} lost in the steam, north of Ranger Rhoda', near: [1196, 238], reveal: 3.5, solid: true, verb: 'Help',
          ghosts: [
            { id: 'hikerfen', at: [1188, 243], lines: ['I’ve been walking in a circle for an hour. A very nice circle.'] },
            { id: 'hikerbo', at: [1208, 232], lines: ['Is Fen with you? We disagreed about left. And right. And north.'] },
          ] },
        { do: 'talk', npc: 'rhoda', text: 'Bring them back to {key}Ranger Rhoda{/}, at Prism Springs', run: hikersDone },
      ],
    },
  },
};
