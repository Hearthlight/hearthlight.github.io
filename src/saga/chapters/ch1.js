// Chapter 1 — Lights Out. Marigold Valley, levels 1–5.
// The Gloomstage eclipses the sun over the cove, Duchess Gloria snuffs Old
// Glimmer, and the Murk rolls over the hills. Hollis hands over Nana June's
// old Lamplighter's Lantern; three embers of Old Glimmer's flame to find, the
// Understudies' first audition, the Glimmer Grotto under the lighthouse (and
// Crumble's Snuffbot 3000), and Old Glimmer shines again.

import '../cast.js';
import { buildGloomstage, buildSnuffer, BALCONY } from '../../models/v7/gloomstage.js';
import { buildCaveMouth } from '../../models/v7/props7.js';
import { GROTTO } from '../dungeons/grotto.js';
import { TROUPE_MODELS } from '../../combat/v7/troupe.js';
import { t } from '../../i18n.js';
import { audio } from '../../engine/audio.js';
import { CLASSES } from '../../combat/classes.js';
import { buildLeafPile } from '../../models/v7/autumn8.js';

// the valley's places for this chapter
export const PLAZA = { x: 91.5, z: 72.5 };
const LIGHTHOUSE = { x: 130.5, z: 91.5 };       // Old Glimmer (its door faces south)
// the Pelican Rush: the notice board, then seven doors round the cove
const POST_ROUTE = [[87.5, 65.6], [86.5, 61.6], [96.5, 60.6], [104.5, 67.6], [74.5, 68.6], [69.5, 80.6], [77.5, 80.6], [76.5, 92.6]];
const SHIP = { x: 131, y: 12, z: 79 };           // where the Gloomstage hovers (behind Old Glimmer)
const FIELDS = [24.5, 57.5];                     // Bram’s barnyard
const CAMP = [74.5, 30.5];                       // Juniper’s Whisperwood camp
const BEACH = [80.5, 93];                        // Driftwood Beach, by the pier (the sea starts at z 96)
export const GROTTO_DOOR = [125.5, 100.5];       // the crack in the rocks under Old Glimmer

const lead = (S) => S.stage.lead;

// ------------------------------------------------------------------ scene: Lights Out
async function lightsOut(S) {
  await S.scene(async (st) => {
    const P = S.P;
    if (P.state) P.state.hour = Math.max(10.5, Math.min(14, P.state.hour));
    P.gatherAt(PLAZA.x, PLAZA.z + 2.2, 2.2);
    st.actor('hollis', PLAZA.x + 1.6, PLAZA.z - 1.4, { face: { x: -0.3, z: 1 } });
    st.actor('rosa', PLAZA.x - 3.2, PLAZA.z - 0.6, { face: { x: 0.4, z: 1 } });
    st.actor('pip', PLAZA.x + 4, PLAZA.z + 0.8, { face: { x: -1, z: 0.3 } });
    await st.cam(PLAZA.x, PLAZA.z, { dur: 0, ppu: st.basePpu() });
    await st.fade(0, 0.8);
    await st.wait(0.6);
    // a shadow falls over the sun
    st.sfx('whoosh', { volume: 0.5, pitch: -12 });
    const dark = st.lights(0.85, null, 2.2);
    await st.wait(1.2);
    st.heroesEmote('question');
    await dark;
    const A = st.act;
    A.play('hollis', 'look');
    await st.say('hollis', 'Hm? It’s gone all dark!', { expr: 'worried' });
    st.hop('pip');
    await st.say('pip', 'Mister Mayor…{p} there’s a {shake}THEATRE{/} in the sky.', { expr: 'shock', emote: 'exclaim', beats: [() => { A.play('pip', 'behold'); A.react('heroes', 'gasp', { from: [SHIP.x - 8, SHIP.z - 12] }); }] });
    // the Gloomstage comes down out of the clouds over Old Glimmer
    const ship = st.prop('ship', buildGloomstage(P.r3d, { fx: (x, y, z) => P.world.fx.emit('smoke', x, y, z, 1, { color: '#6a4a8e' }) }), SHIP.x + 26, SHIP.y + 12, SHIP.z - 20);
    void ship;
    st.music('villain');
    st.sfx('thunder', { volume: 0.7 });
    const glide = st.move('ship', { x: SHIP.x, y: SHIP.y, z: SHIP.z }, 5.5);
    // (the camera looks up at it coming down: it fills the sky)
    await st.cam(SHIP.x, SHIP.z - SHIP.y - 5, { dur: 3 });
    await glide;
    st.mark('ship');
    st.shake(0.4);
    // Crumble, up through a trapdoor into his spotlight: he bows, and presents…
    const bx = SHIP.x + BALCONY.x, by = SHIP.y + BALCONY.y, bz = SHIP.z + BALCONY.z;
    st.actor('crumble', bx - 1.2, bz, { face: { x: 0, z: 1 }, hidden: true }).n.seatY = by;
    st.punch(32);
    await st.cam(bx, bz - by + 0.6, { dur: 0.8 });
    await A.trap('crumble', bx - 1.2, bz, { face: { x: 0, z: 1 }, door: false });
    A.spot('herald', 'crumble', { r: 0.9, h: 6, dim: 0, pool: false });
    st.sfx('fanfare', { volume: 0.7 });
    A.play('crumble', 'bow');
    await st.say('crumble', 'LADIES AND GENTLEMEN!{p} The greatest diva of all time: {key}Duchess Gloria Gloomsworth{/}!', { shake: 1, expr: 'happy', beats: [() => A.play('crumble', 'present')] });
    // Her Radiance: a star’s lift under the one spotlight, her fan in hand — and she sings
    const d = st.actor('duchess', bx + 0.6, bz, { face: { x: 0, z: 1 }, hidden: true });
    d.n.seatY = by;
    A.give('duchess', 'fan');
    A.spotOff('herald', true);
    A.spot('diva', 'duchess', { r: 1.1, h: 7, dim: 0, pool: false });
    st.flash('#f4eaff', 0.3);
    st.sfx('chime', { volume: 0.8 });
    await A.trap('duchess', bx + 0.6, bz, { face: { x: 0, z: 1 }, lift: 1 });
    A.play('duchess', 'sing'); A.play('crumble', 'applaud');
    await st.say('duchess', '♪ Oh, Marigold Coooove… ♪', { expr: 'smug', speed: 0.6 });
    A.rest('crumble'); A.play('duchess', 'fist');
    await st.say('duchess', 'Thirty years ago, this dreary little cove {shake}booed{/} me off its stage!', { expr: 'angry' });
    // (the word nobody says: she freezes, he hides his head)
    A.play('duchess', 'gasp'); A.play('crumble', 'cower');
    await st.say('rosa', 'There was a hen, I think.', { expr: 'neutral' });
    st.shake(0.7);
    A.push('duchess', { mul: 1.5 }); A.play('duchess', 'tantrum');
    await st.say('duchess', '{big}WE DO NOT SPEAK OF THE HEN!{/}', { shake: 1.5, expr: 'angry' });
    await A.pull();
    A.rest('crumble'); A.play('duchess', 'flourish');
    await st.say('duchess', 'So I shall put out every light in the world…{p} until only {wave}my{/} spotlight is left!', { expr: 'smug', beats: [() => { A.play('duchess', 'behold'); A.face('duchess', 'happy'); }] });
    A.play('duchess', 'point', { mirror: true });
    await st.say('duchess', 'And I’ll start with your lighthouse.{p} Crumble! The Snuffer!', { expr: 'angry', beats: [() => { A.play('duchess', 'shoo', { mirror: true }); A.play('crumble', 'gasp'); }] });
    A.play('crumble', 'salute');
    await st.say('crumble', 'At once, Your Gloominess!', { expr: 'happy', hop: true });
    A.trapOut('crumble', { beat: 0.12 });
    A.play('duchess', 'proud');
    // the Grand Snuffer comes down on Old Glimmer
    st.punch(st.basePpu());
    await st.cam(LIGHTHOUSE.x, LIGHTHOUSE.z - 11, { dur: 0.9 });
    const lamp = LIGHTHOUSE;
    st.prop('snuffer', buildSnuffer(P.r3d), lamp.x, 16, lamp.z + 0.2);
    st.sfx('chain', { volume: 0.6 });
    await st.move('snuffer', { y: 6.6 }, 2.2);
    st.sfx('thud', { volume: 1 });
    st.shake(1.2);
    st.flash('#2a1640', 0.5);
    if (st.vfx) { st.vfx.shockwave(lamp.x, lamp.z, { r: 5, color: '#7a3aa8', life: 0.9, wall: 1.2 }); st.vfx.smoke(lamp.x, 6.5, lamp.z, { n: 18, color: '#6a4a8e', size: 0.6 }); }
    S.flag('snuffed');
    S.onLighthouse(false);
    await st.lights(0.55, 0.65, 1.6);
    st.mark('snuffed');
    await st.wait(0.6);
    await st.move('snuffer', { y: 16 }, 1.6);
    st.dropProp('snuffer');
    // the Murk rolls over the hills
    await st.cam(PLAZA.x - 24, 6, { dur: 1.6, ppu: Math.max(8, st.basePpu() / 2) });
    if (S.P.murk) S.P.murk.pulse(1);
    st.sfx('whoosh', { volume: 0.6, pitch: -20 });
    await st.wait(1.2);
    st.mark('murk');
    await st.wait(0.4);
    await st.cam(bx, bz - by + 0.6, { dur: 1, ppu: st.basePpu() });
    A.play('duchess', 'curtsy');
    await st.say('duchess', 'Enjoy the intermission, darlings!{p} Mwah!', { expr: 'happy', beats: [() => A.play('duchess', 'kiss')] });
    // (her spotlight snaps off: gone)
    A.spotOff('diva');
    st.hide('duchess'); st.hide('crumble');
    st.sfx('whoosh', { volume: 0.7 });
    await st.move('ship', { x: SHIP.x + 60, y: SHIP.y + 16, z: SHIP.z - 70 }, 4, { ease: 'lin' });
    st.dropProp('ship');
    st.music(null);
    await st.cam(PLAZA.x, PLAZA.z, { dur: 1.2 });
    await st.title('Lights Out', 'Chapter 1');
    // (what just happened, said plainly — then the order: come and talk to Hollis)
    A.play('hollis', 'slump');
    await st.say('hollis', 'She put out {key}Old Glimmer{/}… our lighthouse.', { expr: 'sad' });
    A.rest('hollis');
    await st.say('hollis', 'And the {key}gloom{/} is creeping in with the purple Murk.', { expr: 'worried' });
    st.heroesFace(PLAZA.x + 1.6, PLAZA.z - 1.4);
    await st.say('hollis', 'June left me something for a day like this. It’s for you: {key}come and talk to me{/}!', { expr: 'happy' });
  });
}

// ------------------------------------------------------------------ Hollis hands over the lantern
async function theLantern(S) {
  await S.say('hollis', 'This is Nana June’s {key}lantern{/}. The Lamplighters used them to keep the world lit.', { expr: 'neutral' });
  S.flag('lantern', true);
  S.P.world.fx.emit('sparkle', S.P.players[0].pos.x, 1.2, S.P.players[0].pos.z, 12, { color: '#ffd66b' });
  S.toast('You get: the Lamplighter’s Lantern', null, '#ffd66b');
  // (solo: the hero was chosen when you made your character — Hollis sees which of June’s
  // things found you, and keeps the rest for whenever you fancy a change; a party hears of
  // her kit in one line)
  if (S.solo && S.P.me) {
    const C = CLASSES[S.P.me.cls] || CLASSES.knight;
    await S.say('hollis', C.kit, { expr: 'happy' });
    await S.say('hollis', 'The rest of her kit stays in my back room. Fancy a change one day? Come and swap.', { expr: 'neutral' });
    if (S.P.heroHint) S.P.toast(S.P.heroHint('Change your hero any time on your Hero page ({key})'), '#ffd66b');
    if (S.P.state) S.P.state.flags.wildIntro = true;
  } else await S.say('hollis', 'And here’s her old kit: a frying pan, a star wand, a slingshot…{p} Don’t ask.', { expr: 'happy' });
  // (the goal, then the order: the fields first)
  await S.say('hollis', 'But the lantern is cold. To wake it, find {key}three embers{/} of Old Glimmer: they fell around the valley.', { expr: 'worried' });
  await S.say('hollis', 'Start with {key}Bram’s fields{/}, west of the village. And watch out for the gloom!', { expr: 'neutral' });
}

// ------------------------------------------------------------------ the Understudies' first audition, on the beach
async function understudies(S) {
  await S.scene(async (st) => {
    const [x, z] = BEACH, A = st.act, TRIO = ['fidget', 'minnow', 'brick'];
    // (the heroes downstage, their backs to us: the public — the act plays upstage, to them and to us)
    S.P.gatherAt(x, z + 1.9, 1.3);
    const at = { fidget: [x - 1.7, z - 0.9], minnow: [x + 0.2, z - 1.2], brick: [x + 2.1, z - 0.9] };
    TRIO.forEach((id, i) => st.actor(id, x + 10.6 + i * 1.9, z - 1.1, { face: { x: -1, z: 0 } }));
    await st.cam(x, z + 0.1, { dur: 0, ppu: st.basePpu() * 2 });
    A.keylight([x, z - 1]);
    st.heroesFace(x + 8, z - 1.1);
    // they march on from the wings, in step, and turn to their public
    A.all(TRIO, 'march');
    st.sfx('fanfare', { volume: 0.4, pitch: 5 });
    await Promise.all(TRIO.map((id) => st.walk(id, at[id][0], at[id][1], { speed: 7 })));
    for (const id of TRIO) st.face(id, at[id][0], z + 6);
    st.heroesFace(x, z - 1.2);
    A.rest(TRIO); A.play('minnow', 'stomp');
    await st.say('minnow', 'HALT, villagers! We are the Duchess’s next great villains…', { expr: 'smug' });
    // the team pose: Minnow in the middle, the others presenting him — Brick the wrong way round first
    A.troupe(['minnow', 'fidget', 'brick'], ['vee', 'present', 'present'], { flub: 1, lag: 0.1 });
    await st.say('fidget', '{big}THE UNDERSTUDIES!{/}', { expr: 'happy' });
    st.sfx('boing', { volume: 0.7 });
    st.emote('fidget', 'sweat');
    A.play('fidget', 'shrug'); A.play('minnow', 'facepalm');
    await st.say('fidget', 'Well… she hasn’t hired us yet.', { expr: 'worried' });
    A.rest('brick'); A.play('minnow', 'fist');
    await st.say('minnow', 'She will after this! Brick, {key}the ember{/}!', { expr: 'angry' });
    A.give('brick', 'ember'); A.play('brick', 'behold');
    A.play('minnow', 'flourish');
    await st.say('minnow', 'Behold…{p} {wave}THE JUGGLING ACT!{/}', { expr: 'smug', beats: [() => { A.give('brick', null); A.juggle('brick', ['#ffd66b', '#f4a4b6', '#9fdcff']); A.play('brick', 'juggle'); A.play('minnow', 'present'); A.play('fidget', 'applaud'); st.sfx('boing', { volume: 0.4, pitch: 3 }); }] });
    await st.wait(1.2);
    // the ember gets away: three heads follow it east
    st.sfx('whoosh', { volume: 0.6 });
    A.toss('brick', 0, x + 13, z + 2, { up: 3.5, dur: 0.9 });
    A.rest(['minnow', 'fidget']);
    for (const id of TRIO) st.face(id, x + 14, at[id][1] + 0.4);
    st.heroesFace(x + 14, z);
    await st.say('narrator', 'The ember flies off… and rolls into a crack in the rocks, east of the beach.');
    A.juggle('brick', null); A.rest('brick');
    A.play('fidget', 'think');
    await st.say('fidget', 'Was that part of the act?', { expr: 'worried' });
    st.face('brick', at.brick[0], z + 6);
    A.push('brick', { mul: 1.5 }); A.play('brick', 'slump');
    await st.say('brick', 'No.', { expr: 'sad' });
    await A.pull();
    A.play('minnow', 'gasp');
    await st.say('minnow', '{shake}AFTER IT!{/}', { expr: 'shock', shake: 1 });
    // exeunt in a panic — and Fidget finds the one rock on the beach
    A.all(TRIO, 'panic');
    st.walk('minnow', x + 13, z + 0.6, { run: true });
    st.walk('brick', x + 13.6, z + 1.4, { speed: 3.8 });
    await st.walk('fidget', x + 4.4, z + 0.2, { speed: 5.4 });
    await A.play('fidget', 'trip');
    st.heroesEmote('dots');
    await A.play('fidget', 'getup');
    A.play('fidget', 'panic');
    await st.walk('fidget', x + 13, z + 0.2, { speed: 6.4 });
    for (const id of TRIO) st.hide(id);
    // (the scene ends on the order: where the ember went, and to follow)
    await st.say('narrator', 'Follow them into the rocks {key}under Old Glimmer{/}!');
  });
}

// ------------------------------------------------------------------ Old Glimmer shines again
async function relight(S) {
  await S.scene(async (st) => {
    const P = S.P, L = LIGHTHOUSE;
    P.gatherAt(L.x, L.z + 3.2, 1.4);
    st.actor('hollis', L.x - 2.4, L.z + 3.4, { face: { x: 0.6, z: -1 } });
    await st.cam(L.x, L.z, { dur: 0, ppu: st.basePpu() });
    st.heroesFace(L.x, L.z);
    await st.say('hollis', 'Go on: hold the lantern up high!', { expr: 'happy' });
    // the flame climbs from the lantern up to the lamp
    const x0 = P.players[0].pos.x, z0 = P.players[0].pos.z;
    for (let k = 0; k < 14; k++) { const y = 1.4 + k * 0.4; st.fx('sparkle', x0 + (L.x - x0) * k / 14, y, z0 + (L.z - z0) * k / 14, 3, { color: '#ffd66b' }); await st.wait(0.07); }
    st.sfx('chime', { volume: 0.9 });
    st.flash('#fff3c4', 0.6);
    if (st.vfx) { st.vfx.pillar(L.x, L.z, { r: 1.2, h: 9, color: '#ffd66b', life: 1.6 }); st.vfx.shockwave(L.x, L.z, { r: 7, color: '#ffd66b', life: 1.1, wall: 1 }); }
    S.onLighthouse(true);
    st.shake(0.5);
    await st.lights(0, 0, 2);
    st.mark('relit');
    // the beam sweeps out and the Murk rolls back from the woods and the heights
    await st.cam(PLAZA.x - 20, 4, { dur: 2.2, ppu: Math.max(8, st.basePpu() / 2) });
    S.openZones(['deepwood', 'heights']);
    if (P.murk) P.murk.pulse(-1);
    st.sfx('whoosh', { volume: 0.7, pitch: 8 });
    await st.wait(1.1);
    st.mark('murkBack');
    await st.wait(1.1);
    await st.title('Old Glimmer shines again', 'The Murk rolls back from Deep Whisperwood and the Windy Heights', 4);
    await st.say('narrator', 'Lamps come back on all over the cove.{p} And Mayor Hollis drops his tea.');
  });
}

// ------------------------------------------------------------------ Perkins and the first letter
async function perkins(S) {
  await S.scene(async (st) => {
    const P = S.P, L = LIGHTHOUSE;
    await st.cam(L.x, L.z + 1, { dur: 0, ppu: st.basePpu() });
    const p = st.actor('perkins', L.x + 6, L.z - 2, { face: { x: -1, z: 0.4 } });
    p.n.seatY = 6;
    st.sfx('whoosh', { volume: 0.6 });
    st.walk('perkins', L.x + 1.5, L.z + 2.8, { speed: 6 });
    for (let k = 0; k < 12; k++) { p.n.seatY = Math.max(0, 6 - k * 0.55); await st.wait(0.05); }
    p.n.seatY = undefined;
    st.sfx('thud', { volume: 0.8 });
    st.shake(0.4);
    st.fx('dust', L.x + 1.5, 0.3, L.z + 2.8, 14);
    st.mark('perkins');
    await st.say('perkins', 'PELICAN POST!{p} Perkins, postmaster. I have a letter for you!', { expr: 'happy', hop: true });
    await st.say('perkins', 'From a Mrs June. Posted…{p} ooh. Seven weeks ago.', { expr: 'worried' });
    await st.say('narrator', '“My dear, if you are reading this, Old Glimmer has gone out and you carry my lantern. I am so sorry, and so proud.”');
    await st.say('narrator', '“Be brave, be kind, and wear a scarf. — June”');
    // (the letter ends on its order: the next chapter starts north)
    await st.say('narrator', '“P.S. Take the Lamplighters’ road {key}north{/}: the Foresters of {key}Deep Whisperwood{/} keep the next Great Hearth.”');
    st.keep('perkins');
  });
}

// ------------------------------------------------------------------ the Glimmer Grotto's scripts
const R = (id) => GROTTO.rooms.find((r) => r.id === id);
const mid = (d, r, dz = 0) => ({ x: d.ox + r.x + r.w / 2, z: d.oz + r.z + r.h / 2 + dz });

// the Understudies' stage: their Juggling Act (a mini-boss trio)
R('stage').run = async (S, d, r) => {
  const G3 = d.gate('g3');
  if (G3) d.setGate(G3, false);
  const c = mid(d, r);
  await S.scene(async (st) => {
    const A = st.act;
    st.actor('minnow', c.x, c.z - 4.2, { face: { x: 0, z: 1 } });
    st.actor('fidget', c.x - 2.2, c.z - 3.6, { face: { x: 0.2, z: 1 } });
    st.actor('brick', c.x + 2.4, c.z - 3.5, { face: { x: -0.2, z: 1 } });
    await st.cam(c.x, c.z - 3, { dur: 0.9, ppu: st.basePpu() * 2 });
    // their own spotlight snaps on; a bow, and the three of them juggle (one after the other)
    A.spot('act', [c.x, c.z - 3.8], { r: 3.6, h: 8, dim: 0, pool: false });
    st.sfx('fanfare', { volume: 0.5, pitch: -5 });
    A.play('minnow', 'bow');
    await st.say('minnow', 'WELCOME to the Understudies’ audition!{p} {wave}THE JUGGLING ACT!{/}', { expr: 'happy', beats: [() => { for (const [i, id] of ['minnow', 'fidget', 'brick'].entries()) A.after(i * 0.25, () => { A.juggle(id); A.play(id, 'juggle'); }); }] });
    A.juggle('minnow', null); A.play('minnow', 'stomp');
    await st.say('minnow', 'And YOU are our volunteers! This won’t hurt!{p} Much!', { expr: 'smug', beats: [() => { A.face('minnow', 'happy'); A.play('minnow', 'laugh'); A.react('heroes', 'recoil', { from: [c.x, c.z - 4.2], step: 0.35 }); }] });
    await st.title('The Understudies', 'their Juggling Act', 2.2);
  });
  // the show: they fight as a trio (one bar for the three)
  const C = S.P.combat;
  if (!C) return;
  const lv = d.def.lv[1];
  const spots = [[c.x, c.z - 4.2, 'minnow'], [c.x - 2.2, c.z - 3.6, 'fidget'], [c.x + 2.4, c.z - 3.5, 'brick']];
  r.foes = spots.map(([x, z, ty]) => { const e = C.spawn(ty, x, z, { level: lv, quiet: true }); e.saga = true; e.miniGroup = 'The Understudies'; return e; });
};
R('stage').tick = (S, d, r) => {
  if (r.done || !r.foes || r.foes.some((e) => e.alive)) return;
  r.done = true;
  (async () => {
    const c = mid(d, r);
    await S.P.wait(1.4);
    for (const e of r.foes) if (e.fading > 0) { e.fading = 0; e.remove(); }
    await S.scene(async (st) => {
      const A = st.act;
      // (downstage, where there is room to lie: flat out, all three — Minnow picks himself up first,
      // and his dignity a beat later)
      st.actor('minnow', c.x - 1, c.z - 5.5, { face: { x: 0, z: 1 } });
      st.actor('fidget', c.x - 3, c.z - 4.2, { face: { x: 0.3, z: 1 } });
      st.actor('brick', c.x + 1.4, c.z - 3.9, { face: { x: -0.3, z: 1 } });
      A.play('minnow', 'prone'); A.play('fidget', 'out'); A.play('brick', 'out');
      A.spot('act', [c.x - 0.8, c.z - 5], { r: 3.8, h: 8, dim: 0, pool: false, quiet: true });
      await st.cam(c.x - 0.8, c.z - 4.6, { dur: 0.7, ppu: st.basePpu() * 2 });
      st.emote('brick', 'star'); st.emote('fidget', 'sweat');
      A.play('minnow', 'getup');
      await st.say('minnow', 'That…{p} was a dress rehearsal.', { expr: 'sad', beats: [() => { A.play('minnow', 'proud'); A.face('minnow', 'smug'); }] });
      A.play('fidget', 'rise').then(() => { A.give('fidget', 'ember'); A.play('fidget', 'behold'); });
      await st.say('fidget', 'Quick! {key}The ember{/}, to Mister Crumble!', { expr: 'cry' });
      A.play('minnow', 'behold'); A.play('brick', 'rise', { delay: 0.5 });
      await st.say('minnow', 'Understudies — {shake}EXIT STAGE LEFT!{/}', { expr: 'angry', shake: 0.6 });
      const G4 = d.gate('g4');
      if (G4) d.setGate(G4, true);
      const up = { x: d.ox + 24, z: d.oz + 30 };
      // two of them bolt; Brick comes round, looks for the others, and lumbers after
      A.play('minnow', 'panic'); A.play('fidget', 'panic');
      st.walk('minnow', up.x - 1, up.z, { run: true, via: [[c.x - 1, c.z - 8.5]] });
      st.walk('fidget', up.x, up.z, { run: true, via: [[c.x, c.z - 8.5]] });
      await A.play('brick', 'look', { rate: 2 });
      A.play('brick', 'panic');
      await st.walk('brick', up.x + 1, up.z, { run: true, via: [[c.x + 1, c.z - 8.5]] });
    });
    audio.jingle('questDone');
  })();
};

// Crumble's Snuffbot 3000
R('lair').run = async (S, d, r) => {
  const C = S.P.combat, c = mid(d, r, -2.5);
  if (!C) return;
  const e = C.spawn('snuffbot', c.x, c.z, { level: d.def.lv[1] + 1, quiet: true });
  e.saga = true; e.home = { x: c.x, z: c.z + 2 };
  e.state = 'roar'; e.timer = 99;
  r.boss = e;
  C.bounds = { x: c.x, z: c.z + 2.5, rx: r.w / 2 - 2, rz: r.h / 2 - 1.5 };
  await S.scene(async (st) => {
    const A = st.act, bot = A.bot(e.obj);
    await st.cam(c.x, c.z + 0.5, { dur: 0.9 });
    st.sfx('thud', { volume: 0.8 }); st.shake(0.5);
    await st.say('crumble', 'HALT, heroes! You have reached…{p} {big}THE BOSS ROOM!{/}', { shake: 1, beats: [() => { bot.stomp(); A.react('heroes', 'recoil', { from: [c.x, c.z], step: 0.4 }); }] });
    // (it does what he says, as he says it)
    A.after(0.9, () => bot.snuff()); A.after(2, () => bot.stomp());
    await st.say('crumble', 'Behold the SNUFFBOT 3000! It snuffs! It stomps!', { expr: 'happy' });
    // Minnow and Brick run in from the side, the ember held high
    st.actor('minnow', c.x - 6.4, c.z + 4.6, { face: { x: 1, z: -0.4 } });
    st.actor('brick', c.x - 7.6, c.z + 5.4, { face: { x: 1, z: -0.4 } });
    A.give('minnow', 'ember'); A.play('minnow', 'behold');
    st.walk('minnow', c.x - 3.6, c.z + 2.4, { run: true });
    await st.walk('brick', c.x - 4.6, c.z + 3.6, { run: true });
    st.face('minnow', c.x, c.z + 1.6); st.face('brick', c.x, c.z + 2.6);
    A.play('brick', 'beg');
    await st.say('minnow', 'Mister Crumble! We brought {key}the ember{/}! Can we be in the show?', { expr: 'happy', hop: true });
    // the Snuffbot helps itself — and waves them off
    bot.snuff().then(() => { A.give('minnow', null); A.rest('minnow'); st.flash('#ffd66b', 0.3); st.sfx('pickup', { volume: 0.6 }); });
    await st.say('crumble', 'Splendid! Into the Snuffbot it goes.{p} Now shoo: this is a SOLO.', { expr: 'smug', beats: [() => { bot.shoo(); A.play('minnow', 'recoil'); }] });
    A.play('brick', 'slump');
    await st.say('brick', 'Aw.', { expr: 'sad' });
    st.walk('minnow', c.x - 4, c.z + 12, { run: true });
    await st.walk('brick', c.x - 2, c.z + 12, { speed: 3.6 });
    st.hide('minnow'); st.hide('brick');
    await st.say('crumble', 'Snuffbot…{p} {shake}SNUFF THEM!{/}', { expr: 'angry', shake: 1, beats: [() => { bot.stomp(); bot.puff(8); }] });
    await st.title('Crumble’s Snuffbot 3000', 'the boss of the Glimmer Grotto', 2.2);
  });
  e.state = 'chase'; e.timer = 1.2;
};
R('lair').tick = (S, d, r) => {
  const e = r.boss;
  if (!e || r.done || e.alive) return;
  r.done = true;
  const C = S.P.combat;
  if (C) { C.bounds = null; for (const q of C.enemies) if (q.alive && q.summoner === e) { q.alive = false; q.fading = 0; q.remove(); } }
  (async () => {
    const c = mid(d, r, -2.5);
    await S.P.wait(1.6);
    // the Snuffbot, a smoking wreck on its side (it stays there)
    const bx = e.x, bz = e.z;
    e.fading = 0; e.remove();
    const wreck = TROUPE_MODELS.snuffbot(S.P.r3d);
    wreck.rotation.set(0.1, 0.5, 1.15); wreck.position.set(bx - d.ox, 0.6, bz - d.oz);
    wreck.userData.pilot.visible = false;
    d.root.add(wreck);
    d.anims.push((tm) => { if (Math.random() < 0.08) S.P.world.fx.emit('smoke', bx + (Math.random() - 0.5), 1.2, bz, 1, { color: '#6a6070' }); void tm; });
    d.lights.push({ x: bx, y: 3.4, z: bz + 1.4, color: '#ffe0b0', power: 1.4, dist: 8 });
    await S.scene(async (st) => {
      const A = st.act, a = st.actor('crumble', bx, bz, { face: { x: 0, z: 1 }, hidden: true });
      a.n.seatY = 1.1;
      await st.cam(bx, bz + 0.5, { dur: 0.6, ppu: st.basePpu() * 2 });
      // he pops out of the wreck in a puff of soot: a fist — then, at the pause, begging
      st.sfx('boing', { volume: 0.8 });
      await A.trap('crumble', bx, bz, { face: { x: 0, z: 1 }, color: '#6a6070', door: false });
      A.spot('herald', 'crumble', { r: 1.1, h: 7, dim: 0, pool: false, quiet: true });
      A.play('crumble', 'fist');
      await st.say('crumble', 'The Duchess will hear about this!{p} …Please don’t tell her.', { expr: 'angry', emote: 'sweat', beats: [() => { A.play('crumble', 'beg'); A.face('crumble', 'cry'); }] });
      // (a rope from the flies hauls him off)
      await A.ropeOut('crumble', { h: 9 });
      st.hide('crumble');
      st.fx('sparkle', c.x, 1.2, c.z + 1, 20, { color: '#ffd66b' });
      await st.say('narrator', 'The {key}last ember{/} rolls out of the wreck and under the back door. After it!');
      const G6 = d.gate('g6');
      if (G6) d.setGate(G6, true);
      const sh = R('shrine');
      const rr = d.rooms.find((q) => q.id === 'shrine');
      if (rr) rr.ready = true;
      void sh;
    });
    audio.jingle('festival');
  })();
};

// the shrine: the ember of Old Glimmer
R('shrine').take = async (S, d, r, p) => {
  await S.scene(async (st) => {
    const x = d.ox + r.item[0], z = d.oz + r.item[1];
    await st.cam(x, z + 1.5, { dur: 0.6 });
    st.flash('#fff3c4', 0.5);
    if (st.vfx) st.vfx.pillar(x, z, { r: 0.8, h: 6, color: '#ffd66b', life: 1.4 });
    st.sfx('shard', { volume: 0.9 });
    S.flag('ember3'); S.flag('lanternFull');
    await st.say('narrator', 'The three embers melt into {key}one flame{/}: the lantern is awake! Carry it up to {key}Old Glimmer{/}.');
    void p;
  });
  await d.D.exit({ done: true });
};

// ------------------------------------------------------------------ the chapter
export const CH1 = {
  id: 1, title: 'Lights Out',
  recap: 'Duchess Gloria, a diva in a flying theatre, has put out {key}Old Glimmer{/}, the lighthouse of Marigold Cove. Now the gloom roams the valley. Wake Nana June’s lantern with {key}three embers{/} and light the lighthouse again.',
  lv: 1, zones: ['valley'], opens: ['deepwood', 'heights'],
  // the colours of the valley stay drained until Old Glimmer shines again
  drain: (S) => (S.has('snuffed') && !S.done('c1_relight') ? 0.45 : 0),
  // the grotto's mouth, once the Understudies have run into it
  props: [
    { id: 'grottoMouth', at: [GROTTO_DOOR[0], GROTTO_DOOR[1] - 1.2], build: (r3d) => buildCaveMouth(r3d), when: (S) => S.stepOf('c1_spark') >= 4 || S.done('c1_spark') },
  ],
  npcs: [
    // (in solo the real villagers stand in their own spots: `villager`)
    { id: 'hollis', villager: true, at: (S) => (S.done('c1_grotto') ? [LIGHTHOUSE.x - 2.4, LIGHTHOUSE.z + 3.4] : [PLAZA.x + 1.6, PLAZA.z - 1.4]), face: { x: -0.2, z: 1 }, when: (S) => !!S.st.q.c1_intro,
      lines: ['June would be proud of you.', 'Old Glimmer’s light keeps the gloom out of the valley.'] },
    { id: 'bram', villager: true, at: [FIELDS[0] + 2, FIELDS[1] - 1.5], face: { x: -0.4, z: 1 }, when: (S) => S.done('c1_intro'),
      lines: ['Not one egg from the hens since Old Glimmer went out.', 'My cow Buttercup is scared of the dark, poor thing.'] },
    { id: 'juniper', villager: true, at: [CAMP[0] - 2, CAMP[1] + 1.5], face: { x: 0.5, z: 1 }, when: (S) => S.done('c1_intro'),
      lines: ['A Gloom Boar charges in a straight line: just step aside!', 'Not one owl has hooted since the Murk came.'] },
    { id: 'rosa', villager: true, at: [86.5, 78.5], face: { x: 0, z: 1 }, when: (S) => S.done('c1_intro'),
      lines: ['A bakery with a cold oven is just a room full of flour.', 'Stay warm out there, love.'] },
    { id: 'perkins', at: [LIGHTHOUSE.x + 1.5, LIGHTHOUSE.z + 2.8], face: { x: -1, z: 0.3 }, when: (S) => S.done('c1_relight'),
      lines: ['My pelicans will fly you from one roost to the next.', 'Tips are welcome. In fish.'] },
  ],
  quests: {
    c1_intro: {
      // (started by the story: Hollis's legend in solo, the Adventure's start in Party)
      title: 'Lights Out',
      brief: 'The Duchess has put out Old Glimmer, the lighthouse, and the gloom is creeping in. {key}Mayor Hollis{/} is keeping something of Nana June’s for you.',
      lv: 1,
      steps: [
        { do: 'scene', text: 'Look up: something is coming over {key}Marigold Cove{/}', run: lightsOut },
        { do: 'talk', npc: 'hollis', text: 'Talk to {key}Mayor Hollis{/} on the village plaza', run: theLantern },
      ],
    },
    c1_spark: {
      title: 'A Spark in the Dark',
      brief: 'Nana June’s lantern is cold. {key}Three embers{/} of Old Glimmer fell around the valley: find them to wake it.',
      auto: true, after: 'c1_intro', lv: 2,
      steps: [
        { do: 'camp', text: 'Chase the gloom from {key}Bram’s fields{/}, west of the village', camp: { id: 'c1_fields', at: FIELDS, level: 2, foes: ['gloomling', 'gloomling', 'fox'], n: 3, done: 'The fields are safe!' } },
        { do: 'collect', text: 'Pick up the {key}ember{/} in Bram’s barnyard', item: 'Glimmer Ember', n: 1, spots: [[FIELDS[0] + 0.5, FIELDS[1] + 1]], hint: 'An ember of Old Glimmer, still warm!',
          run: async (S) => {
            S.flag('ember1');
            await S.say('bram', 'Thank you! The hens say “bawk”. That means thank you too.', { expr: 'happy' });
            await S.say('narrator', '{key}One ember{/} in the lantern, two to go. Next: the {key}Whisperwood camp{/}, north of the village.');
          } },
        { do: 'camp', text: 'Chase the gloom from the {key}Whisperwood camp{/}, north of the village', camp: { id: 'c1_camp', at: CAMP, level: 3, foes: ['gloomling'], n: 2, big: 'boar', done: 'The Whisperwood camp is free!' } },
        { do: 'collect', text: 'Pick up the {key}ember{/} by Juniper’s campfire', item: 'Glimmer Ember', n: 1, spots: [[CAMP[0] + 1.2, CAMP[1] + 0.8]], hint: 'An ember of Old Glimmer, still warm!',
          run: async (S) => {
            S.flag('ember2'); S.flag('lanternLit');
            await S.say('juniper', '{key}Two embers{/}: your lantern is glowing! Only one to go.', { expr: 'happy' });
            await S.say('juniper', 'I left the gloom a very stern note. They ate it.', { expr: 'angry' });
            await S.say('juniper', 'The last one fell on {key}Driftwood Beach{/}, south of the village.', { expr: 'neutral' });
          } },
        { do: 'go', text: 'Find the last ember on {key}Driftwood Beach{/}, south of the village', at: BEACH, r: 5, run: understudies },
      ],
    },
    c1_grotto: {
      title: 'The Glimmer Grotto',
      brief: 'The Understudies let the {key}last ember{/} roll into the caves under Old Glimmer. Go in after them and take it back.',
      auto: true, after: 'c1_spark', lv: 4,
      steps: [
        { do: 'go', text: 'Follow the Understudies into the rocks {key}under Old Glimmer{/}', at: GROTTO_DOOR, r: 2.2, run: async (S) => { if (S.P.dungeons) await S.P.dungeons.enter('grotto'); else S.flag('grottoDone'); } },
        { do: 'dungeon', id: 'grotto', text: 'Find the {key}last ember{/} deep in the Glimmer Grotto' },
      ],
    },
    c1_relight: {
      title: 'Old Glimmer Shines Again',
      brief: 'The lantern holds its three embers. Carry it to {key}Old Glimmer{/} to light the lighthouse again and push back the Murk.',
      auto: true, after: 'c1_grotto', lv: 5,
      steps: [
        { do: 'go', text: 'Carry the lantern to {key}Old Glimmer{/}, the lighthouse east of the village', at: [LIGHTHOUSE.x, LIGHTHOUSE.z + 3], r: 3, run: relight },
        { do: 'scene', text: 'Wait for the post at the foot of {key}Old Glimmer{/}', run: perkins },
      ],
      done: async (S) => { S.st.lit.push('valley'); S.save(); },
      next: 2,
    },
    // ---- side quests
    c1_oven: {
      title: 'The Cold Oven',
      brief: 'Rosa’s oven went out with Old Glimmer. Light it again with your lantern, at {key}the bakery{/}.',
      kind: 'side', giver: 'rosa', lv: 3, when: (S) => S.has('lanternLit'), dust: 20,
      offer: async (S) => {
        await S.say('rosa', 'When Old Glimmer went out, so did my oven.', { expr: 'sad' });
        await S.say('rosa', 'But your lantern glows! Would you bring a spark to {key}my oven{/}, at the bakery?', { expr: 'happy' });
      },
      steps: [
        { do: 'go', text: 'Bring the lantern’s spark to {key}Rosa’s oven{/}, at the bakery', at: [86.5, 60.8], r: 2.2,
          run: async (S) => {
            S.P.world.fx.emit('sparkle', 86.5, 1.2, 60.5, 16, { color: '#ffb040' });
            await S.say('rosa', 'Ohh, listen to it crackle! That’s the sound of breakfast.', { expr: 'love' });
          } },
      ],
    },
    c1_buttercup: {
      title: 'Buttercup Won’t Budge',
      brief: 'Bram’s cow Buttercup is scared of the dark and won’t leave the barn. Lead her to {key}the pasture{/} with your lantern.',
      kind: 'side', giver: 'bram', lv: 3, when: (S) => S.has('lanternLit'), dust: 20,
      offer: async (S) => {
        await S.say('bram', 'Buttercup won’t leave the barn: she’s scared of the dark.', { expr: 'worried' });
        await S.say('bram', 'Would you show her your lantern, at {key}the barn door{/}?', { expr: 'neutral' });
      },
      steps: [
        { do: 'go', text: 'Show Buttercup the lantern at the door of {key}Bram’s barn{/}', at: [25.5, 51], r: 2.2,
          run: async (S) => { await S.say('narrator', 'A suspicious “mooo”… and out she comes. Lead her to {key}the pasture{/}, west of the barn.'); } },
        { do: 'go', text: 'Walk Buttercup to {key}the pasture{/}, west of the barn', at: [16.5, 47], r: 3,
          run: async (S) => { await S.say('bram', 'Well I never! Look at her graze. Thank you!', { expr: 'love' }); } },
      ],
    },
    // ---- a mini-game, to play again and again (World v7 M13)
    c1_pelicanrush: {
      title: 'Pelican Rush',
      brief: 'Perkins has {key}seven letters{/} for the village. Run them from door to door before time runs out.',
      kind: 'side', repeat: true, giver: 'perkins', after: 'c1_relight', lv: 4, dust: 15,
      offer: async (S) => {
        await S.say('perkins', 'The Pelican Post has a SYSTEM. The system is: deliver everything before the pelicans get peckish.', { expr: 'smug' });
        await S.say('perkins', '{key}Seven letters{/}, seven doors, all round the village. Start at {key}the notice board{/}: the clock is ticking!', { expr: 'worried' });
      },
      steps: [
        { do: 'race', text: 'Deliver {key}7 letters{/} round the village: start at {key}the notice board{/}', points: POST_ROUTE, time: 32, r: 1.7, go: 'Post’s out! Run!', fail: 'Too slow — a pelican ate the café’s mail. Back to the notice board!' },
        { do: 'talk', npc: 'perkins', text: 'Tell {key}Perkins{/}, at the foot of Old Glimmer, that it’s all delivered', run: async (S) => {
          if (S.plays('c1_pelicanrush')) await S.say('perkins', 'AGAIN? You’re making my pelicans look bad. They’ve formed a union.', { expr: 'shock' });
          else await S.say('perkins', 'All seven delivered? Already? I need to sit down.', { expr: 'love' });
        } },
      ],
    },
    // ---- round 12: mini-games (rounds with a score and three ranks: saga/games12.js)
    c1_tug: {
      title: 'Buttercup Pulls Back',
      brief: 'Buttercup, Bram’s cow, has his best rope and thinks it’s a game. Beat her at {key}tug-of-war{/} in Bram’s barnyard.',
      kind: 'side', repeat: true, giver: 'bram', lv: 3, when: (S) => S.has('ember1'), dust: 8,
      offer: async (S) => {
        await S.say('bram', 'Buttercup has my best rope, and she won’t let go.', { expr: 'worried' });
        await S.say('bram', 'Beat her at {key}tug-of-war{/}, here in my yard. Mind: she cheats.', { expr: 'happy' });
      },
      steps: [
        { do: 'tug', text: 'Beat Buttercup at {key}tug-of-war{/}, in {key}Bram’s barnyard{/}', at: [24.5, 54], side: 1, foe: 'buttercup', time: 60, cry: 'honk',
          rule: 'Tap {a} fast to pull. When Buttercup digs in, hands off!', hint: 'Pull fast — hands off when she digs in!', lost: 'Buttercup wins. Moo.',
          run: async (S) => { await S.say('bram', 'She let go! First time since she was a calf.', { expr: 'love' }); } },
      ],
    },
    c1_piles: {
      title: 'A Whistle in the Leaves',
      brief: 'Juniper dropped her ranger’s whistle in the leaf piles round her camp. {key}Jump into the piles{/} to find it.',
      kind: 'side', repeat: true, giver: 'juniper', lv: 3, when: (S) => S.has('ember2'), dust: 15,
      offer: async (S) => {
        await S.say('juniper', 'I dropped my {key}ranger’s whistle{/} in the leaf piles. Don’t tell the owls.', { expr: 'worried' });
        await S.say('juniper', 'Go on: {key}jump into the piles{/} round my camp!', { expr: 'happy' });
      },
      steps: [
        { do: 'piles', text: 'Jump into the {key}leaf piles{/} round Juniper’s camp to find her whistle', piles: [[70, 28.6], [73.2, 29.2], [76.2, 27.9], [79, 29.5], [82, 31.2], [85, 32.9]], find: 4,
          model: (r3d, i) => { const g = buildLeafPile(r3d, i); g.scale.setScalar(1.5); return g; }, found: 'The whistle!', finds: ['Just leaves.', 'A very cross hedgehog.', 'An acorn. Not a whistle.'],
          run: async (S) => { await S.say('juniper', 'PHWEEE! Still works. Sorry about your ears.', { expr: 'happy' }); } },
      ],
    },
  },
};

// (keeps the linter from moaning about helpers some scenes don't use yet)
void t; void lead;
