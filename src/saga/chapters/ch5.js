// Chapter 5 — Sand & Sea. Sunscorch Dunes, the Coral Lagoon and the Sunken City,
// levels 21–26. It opens in the middle of a sandstorm: Perkins drops the heroes
// « slightly off », beside Humphrey, a caravan camel who is afraid of the dark —
// lead him to Palm Oasis. Auntie Saffron haggles, the spring goes dark, Tariq’s
// glass-bottomed boat, the Turtle Nest (Elder Shellington… takes… his time; Snap
// doesn’t), the Understudies’ water ballet; the Sunken Bell’s clapper, dived for
// in the drowned Forum — and then the setback: far away, the Gloomstage snuffs
// Croakmire’s Great Hearth again, and the lantern’s fourth flame goes out. The
// Sunken Bell Temple (the tide), the Synchronised Swimmers, the Gloom Kraken; the
// South’s Great Hearth relit, the Murk rolls back from Emberpeak, the Whirlpool
// Straits and Dino Isle; Captain Wendy’s airship, out of the shop at last.

import '../cast.js';
import { buildCamel, buildHatchling, buildSingingStone, buildAirship, buildGloomophone } from '../../models/v7/props7.js';
import { buildGloomstage, buildSnuffer, BALCONY } from '../../models/v7/gloomstage.js';
import { buildVehicle } from '../../party/vehicles.js';
import { SUNKENBELL, SUNKEN_DOOR } from '../dungeons/sunkenbell.js';
import { swimRoutine } from '../../combat/v7/troupe.js';
import { kit, THREE } from '../../models/v7/kit.js';
import { audio } from '../../engine/audio.js';

// the chapter’s places
const DROP = [-187.5, 148.4];                                // where Perkins drops the heroes, in the storm
const HUMPHREY_PATH = [[-184, 150.5], [-184, 156], [-180, 163], [-172, 168], [-164, 171], [-157.5, 172.4]];
const OASIS = [-150, 172];
const SAFFRON = [-145.5, 173.2];
const TARIQ_OASIS = [-148, 174.4];
const SPRING = [-160, 165.6];                                // the gloom in the palm grove, by the spring
const ZIZI = [-171, 183];
const LOST = [-200, 214];                                    // the « Lost Oasis »: the sand temple
const LOST_CHEST = [-200, 219];
const NEST = [236, 207];                                     // the Turtle Nest
const SHELLINGTON = [235.6, 206.4];
const SNAP = [239.4, 208.4];
const TARIQ_NEST = [231.6, 209.6];
const BALLET = [257, 199];                                   // the lagoon’s deep pool: the water ballet
const SANDBAR = [204, 191.5];                                // where the hatchlings are lost
const FORUM = [30.5, 213.5];
const TARIQ_FORUM = [32.6, 214.6];
const CLAPPER = [[26, 217.5], [38.5, 209.5], [42.5, 217.5]]; // the bell’s clapper, in three pieces, under the water
const STONES = [[20.7, 213.2, 1.3], [22.3, 214.6, 1.0], [23.8, 212.9, 0.75]];   // the Forum’s singing stones: low, middle, high
const ISLET = [91.5, 249];                                   // the temple’s islet
const THRONE = [302, 43.4], KING = [302, 45.6];              // Croakmire (chapter 4)

// ------------------------------------------------------------------ the storm
// the storm: the dunes’ own sandstorm, held until Humphrey is safe at the oasis
function storm(S, on) {
  const Z = S.P.zones;
  if (!Z || !Z.events) return;
  if (on) Z.events.dunes = { kind: 'sandstorm', t: 999, dur: 999, next: 60, dir: { x: 1, z: 0.35 } };
  else if (Z.events.dunes && Z.events.dunes.t > 2) Z.events.dunes.t = 2;
}

async function stormDrop(S) {
  await S.scene(async (st) => {
    const P = S.P, [x, z] = DROP;
    P.gatherAt(x, z, 1.2);
    storm(S, true);
    await st.lights(0.3, null, 0);
    await st.cam(x, z + 1, { dur: 0, ppu: st.basePpu() });
    const blow = () => { for (let k = 0; k < 40; k++) st.fx('dust', x - 12 + Math.random() * 24, 0.3 + Math.random() * 2, z - 8 + Math.random() * 16, 1, { color: '#e8c890' }); };
    blow();
    st.sfx('whoosh', { volume: 0.7, pitch: -10 });
    await st.say('perkins', 'Sunscorch Dunes! Delivered to your door!{p} …There is no door. There is only sand. Slightly off, as ever — cheerio!', { expr: 'happy' });
    st.sfx('flap', { volume: 0.6 });
    blow();
    await st.say('narrator', 'Perkins vanishes into the storm. The sand hisses. Somewhere close by, a bell goes {wave}clonk{/} — slow, sad, and very, very large.');
    // Tariq, and the biggest, saddest camel in the world
    st.prop('humphrey', buildCamel(P.r3d), HUMPHREY_PATH[0][0], 0, HUMPHREY_PATH[0][1]);
    st.actor('tariq', x + 1.8, z + 3.4, { face: { x: -1, z: -0.3 } });
    st.heroesFace(x + 3, z + 3);
    blow();
    await st.say('tariq', 'Hello? HELLO? Oh, thank the stars — a lantern! On your left, a lost caravan. On your right, also a lost caravan.', { expr: 'shock', hop: true });
    await st.say('tariq', 'I’m Tariq. This is Humphrey. Humphrey is a camel. Humphrey is also afraid of the dark.', { expr: 'worried' });
    st.sfx('growl', { volume: 0.4, pitch: -8 });
    await st.say('narrator', 'Humphrey groans like a door in need of oil.');
    await st.say('tariq', 'The storm blew out every lamp in the caravan and he won’t take one more step. But he’ll follow a light.{p} Walk ahead of him, to Palm Oasis? I’ll run and light the fires!', { expr: 'happy' });
    st.walk('tariq', x + 14, z + 18, { speed: 5 });
    await st.title('Sand & Sea', 'Chapter 5');
    st.dropProp('humphrey');
  });
}

async function oasisArrive(S) {
  await S.scene(async (st) => {
    const P = S.P;
    P.gatherAt(SAFFRON[0] - 2, SAFFRON[1] + 1.4, 1.2);
    st.actor('saffron', SAFFRON[0], SAFFRON[1], { face: { x: -1, z: 0.3 } });
    st.actor('tariq', TARIQ_OASIS[0], TARIQ_OASIS[1], { face: { x: 0, z: 1 } });
    await st.cam(SAFFRON[0] - 1, SAFFRON[1], { dur: 0.6, ppu: st.basePpu() });
    storm(S, false);
    await st.lights(0, null, 1.2);
    await st.say('saffron', 'HUMPHREY! My big, silly, magnificent boy! Look at you — all sand, no sense!', { expr: 'love', hop: true });
    await st.say('saffron', 'And you brought him through THAT? For such a service… three dates and a compliment. Final offer.', { expr: 'smug' });
    st.heroesEmote('question');
    await st.say('saffron', 'Fine, fine. FOUR dates. And my eternal gratitude, which at today’s prices is worth two more.', { expr: 'happy' });
    await st.say('saffron', 'I am Saffron. Everybody calls me Auntie. Even my aunts.', { expr: 'happy' });
    await st.say('saffron', 'But I will not pretend all is well, little lamp. Look at our spring. Gloom has crept into the palm grove and it is drinking the light out of the water.', { expr: 'worried' });
  });
}

async function springClear(S) {
  await S.say('saffron', 'The spring shines again! Listen to it — like coins in a jar. The best sound in the world. Second best: actual coins in a jar.', { expr: 'love' });
  await S.say('saffron', 'Now. My grandmother had a saying: « When the Sunken Bell rings, the tide goes out and the fish come home. »', { expr: 'neutral' });
  await S.say('saffron', 'It has not rung for weeks. The sea has gone dark, and the fish have gone quiet. And a dark sea is bad for business. Bad for everything.', { expr: 'worried' });
  await S.say('tariq', 'The Turtle Nest wrote to everybody about it. The turtles know the bell better than anyone.', { expr: 'neutral' });
  await S.say('saffron', 'Then Tariq will take you out to the lagoon in his glass-bottomed boat. Free of charge!{p} …Nearly free. We will discuss it. Later. At length.', { expr: 'smug' });
}

// ------------------------------------------------------------------ Tariq’s boat
// a ride in the glass-bottomed boat: the heroes aboard (off stage), Tariq at the oars,
// gliding in over the water to the landing, the camera following
const hideHeroes = (S, on) => { for (const p of S.P.players) { p.away = on; p.hidden = on; if (p.actor) p.actor.hidden = on; } };
async function boatRide(S, st, from, to, land) {
  const P = S.P;
  await st.fade(1, 0.5);
  hideHeroes(S, true);
  P.gatherAt(land[0], land[1], 1.1);
  hideHeroes(S, true);
  const boat = buildVehicle(P.r3d, 'rowboat'), ry = Math.atan2(to[0] - from[0], to[1] - from[1]);
  boat.rotation.y = ry;
  st.prop('boat', boat, from[0], 0, from[1]);
  await st.cam(from[0], from[1], { dur: 0, ppu: st.basePpu() });
  await st.fade(0, 0.5);
  st.sfx('water', { volume: 0.5 });
  const go = st.move('boat', { x: to[0], z: to[1] }, 3.4);
  await st.cam(to[0], to[1], { dur: 3.4 });
  await go;
  st.sfx('thud', { volume: 0.4 });
  st.shake(0.15);
  hideHeroes(S, false);
  for (const p of P.players) P.world.fx.emit('splash', p.pos.x, 0.3, p.pos.z, 6);
  st.actor('tariq', to[0], to[1], { face: { x: land[0] - to[0], z: land[1] - to[1] } }).n.seatY = 0.3;
  await st.cam(land[0], land[1], { dur: 0.5 });
}

// ------------------------------------------------------------------ the lagoon
async function boatToNest(S) {
  await S.scene(async (st) => {
    const [x, z] = NEST;
    await boatRide(S, st, [x - 30, z + 8], [x - 8.5, z + 3.2], [x - 4.5, z + 2.4]);
    await st.say('tariq', 'On your left: water. On your right: also water. Beneath you, through the glass: the Sunken City.', { expr: 'happy' });
    await st.say('narrator', 'Through the glass bottom, streets of pale stone slid past below. Doorways. Windows.{p} Every window dark.');
    await st.say('tariq', 'My grandfather said you could read a book on deck at midnight, from all the lamps down there. Now it’s just… fish-shaped shadows.', { expr: 'sad' });
    await st.say('tariq', 'Turtle Nest! Please keep your hands inside the boat until the boat has come to a complete stop against something. Which it has.', { expr: 'happy' });
  });
}

async function nestTalk(S) {
  await S.say('snap', 'visitors! VISITORS! grandpa-great-great we have VISITORS with a LANTERN a real one hello I’m Snap I’m nine I can hold my breath for eleven minutes want to see?', { expr: 'happy', speed: 1.8 });
  await S.say('shellington', 'Snap…{p} let… the guests…{p} breathe.', { expr: 'neutral', speed: 0.5 });
  await S.say('shellington', 'Welcome…{p} to the Turtle Nest.{p} I am… Shellington.{p} I was… old… when the Sunken City… was merely… damp.', { expr: 'happy', speed: 0.5 });
  await S.say('shellington', 'When I was… young…{p} we swam… through its windows.{p} Every… window… had… a lamp.', { expr: 'love', speed: 0.5 });
  await S.say('shellington', 'Now the Bell… is silent.{p} Its clapper… is gone.{p} And something… large… sleeps in the temple.', { expr: 'worried', speed: 0.5 });
}

async function waterBallet(S) {
  await S.scene(async (st) => {
    const P = S.P, [bx, bz] = BALLET;
    await st.cam(bx - 4, bz + 1, { dur: 1, ppu: st.basePpu() });
    st.music('villain');
    const cap = { minnow: '#f4a4b6', fidget: '#9fdcff', brick: '#fff3a6' };
    for (const [i, id] of ['minnow', 'fidget', 'brick'].entries()) {
      const a = st.actor(id, bx - 1.5 + i * 1.5, bz, { face: { x: -1, z: 0.3 } });
      if (a && a.n && a.n.model && a.n.model.setLook) a.n.model.setLook({ ...a.n.def.look, hat: 'swimcap', hatColor: ['pink', 'sky', 'mustard'][i] });
      if (a && a.n) a.n.seatY = -0.55;
      void cap;
    }
    for (let k = 0; k < 12; k++) st.fx('water', bx - 3 + Math.random() * 6, 0.3, bz - 1.5 + Math.random() * 3, 2);
    await st.say('minnow', 'Understudies! Positions! And a-one, and a-two, and a—{p} LIFT!', { expr: 'happy' });
    st.hop('minnow');
    st.sfx('splash', { volume: 0.7 });
    for (let k = 0; k < 16; k++) st.fx('splash', bx + Math.random() * 2 - 1, 0.4, bz + Math.random() - 0.5, 1);
    await st.say('brick', 'Brick is doing… the deep part.', { expr: 'sleepy' });
    const b = st.actorOf('brick');
    if (b && b.n) b.n.seatY = -1.4;
    st.sfx('water', { volume: 0.6 });
    await st.say('fidget', 'We are GUARDING, Minnow. Her Radiance said guard. This is not guarding. This is a WATER BALLET.', { expr: 'angry' });
    await st.say('minnow', 'It’s a guarding BALLET, Fidget. It’s very modern.', { expr: 'smug' });
    st.emote('fidget', 'exclaim');
    await st.say('fidget', 'The Wick Brigade! On the beach! With the lantern! Minnow, they SAW the lift!', { expr: 'shock' });
    await st.say('minnow', 'Understudies! Exit… stage…{p} DOWN!', { expr: 'shock', hop: true });
    st.sfx('splash', { volume: 0.9, pitch: -4 });
    for (const id of ['minnow', 'fidget', 'brick']) { const a = st.actorOf(id); if (a && a.n) a.n.seatY = -2.2; st.fx('splash', bx, 0.4, bz, 10); }
    await st.wait(0.6);
    for (const id of ['minnow', 'fidget', 'brick']) st.hide(id);
    st.music(null);
    await st.say('snap', 'they went to the temple the Sunken Bell Temple the big one with the dome where the bell doesn’t ring because the clapper fell off and a KRAKEN ate it probably not ate it but—', { expr: 'shock', speed: 1.8 });
    await st.say('shellington', '…Snap.', { expr: 'neutral', speed: 0.5 });
    await st.say('snap', 'sorry grandpa-great-great', { expr: 'sad', speed: 1.6 });
    await st.say('shellington', 'The clapper… fell… into the Old Forum.{p} Where… the divers… used to sing.{p} Find it… and the Bell… may ring… again.', { expr: 'neutral', speed: 0.5 });
  });
}

// ------------------------------------------------------------------ the Old Forum
async function boatToForum(S) {
  await S.scene(async (st) => {
    await boatRide(S, st, [FORUM[0] + 24, FORUM[1] + 10], [TARIQ_FORUM[0] + 2.4, TARIQ_FORUM[1] + 2.6], [FORUM[0], FORUM[1] + 0.6]);
    await st.say('tariq', 'The Old Forum! Or its roof, anyway. The rest is downstairs.', { expr: 'happy' });
    await st.say('narrator', 'Round the forum, bubbles rise from three places in the green water — where something heavy lies at the bottom.');
    await st.say('tariq', 'Swim over the bubbles and dive. I’ll mind the boat. Somebody has to, and it’s definitely not going to be the boat.', { expr: 'neutral' });
  });
}

// the lantern in close-up: four little flames in a brass cage (one can go out)
function buildHeroLantern(r3d) {
  const K = kit(r3d), g = new THREE.Group();
  const brass = K.glow('#d8a84a', '#8a6a2a', 0.3), glass = K.c('#fff8e8');
  K.put(g, K.box(0.9, 0.12, 0.9), brass, 0, 0, 0);
  K.put(g, K.box(0.9, 0.12, 0.9), brass, 0, 1.1, 0);
  for (const [x, z] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) K.put(g, K.box(0.08, 1.1, 0.08), brass, x, 0.55, z);
  K.put(g, K.cyl(0.08, 0.3, 0.3, 8), brass, 0, 1.3, 0);
  const pane = K.noCast(K.put(g, K.box(0.74, 0.96, 0.74), glass, 0, 0.55, 0));
  pane.material = pane.material.clone(); pane.material.transparent = true; pane.material.opacity = 0.25;
  const flames = [[-0.18, -0.12], [0.18, -0.12], [-0.18, 0.16], [0.18, 0.16]].map(([x, z]) => K.noCast(K.put(g, K.cone(0.09, 0.28, 6), K.glow('#ffe08a', '#ffb040', 1.4), x, 0.32, z)));
  g.userData = { flames };
  g.userData.anim = (t) => flames.forEach((f, i) => { if (f.visible) { f.scale.y = 1 + Math.sin(t * 13 + i * 2) * 0.18; f.rotation.z = Math.sin(t * 7 + i) * 0.1; } });
  return g;
}

// the setback: far away, the Duchess keeps her promise
async function snuffedAgain(S) {
  await S.scene(async (st) => {
    const P = S.P, hero = P.players.find((p) => p.connected || S.solo) || P.players[0];
    const hx = hero ? hero.pos.x : FORUM[0], hz = hero ? hero.pos.z : FORUM[1];
    P.gatherAt(FORUM[0], FORUM[1] + 0.6, 1.1);
    const lamp = buildHeroLantern(P.r3d);
    lamp.scale.setScalar(1.3);
    st.prop('lamp', lamp, FORUM[0] - 1.6, 0.9, FORUM[1] + 1.6);
    void hx; void hz;
    await st.cam(FORUM[0] - 1, FORUM[1] + 0.8, { dur: 0.8, ppu: Math.round(st.basePpu() * 1.5) });
    await st.say('narrator', 'The last piece of the clapper is still dripping in your hands when the lantern… flickers.');
    const f4 = lamp.userData.flames[3];
    for (let k = 0; k < 6; k++) { f4.visible = k % 2 === 0; st.sfx('tick', { volume: 0.3 }); await st.wait(0.14); }
    f4.visible = true;
    st.heroesEmote('exclaim');
    // far to the north-east: Croakmire, and something in the sky over it
    await st.fade(1, 0.5);
    st.actor('croakington', KING[0], KING[1], { face: { x: -0.2, z: 1 } });
    const ship = buildGloomstage(P.r3d, { fx: (sx, sy, sz) => P.world.fx.emit('smoke', sx, sy, sz, 1, { color: '#6a4a8e' }) });
    ship.scale.setScalar(0.8);
    const SX = THRONE[0] - 1, SY = 7, SZ = THRONE[1] - 7;
    st.prop('ship', ship, SX, SY, SZ);
    await st.cam(THRONE[0], THRONE[1] - 7.5, { dur: 0, ppu: st.basePpu() });
    st.music('villain');
    await st.fade(0, 0.6);
    st.mark('setback');
    await st.say('croakington', 'Hm? Who blocks our sun? We did not order a shadow—{p} oh.{p} Oh no.', { expr: 'shock' });
    const bx = SX + BALCONY.x * 0.8, by = SY + BALCONY.y * 0.8, bz = SZ + BALCONY.z * 0.8;
    st.actor('duchess', bx, bz, { face: { x: 0, z: 1 } }).n.seatY = by;
    await st.cam(bx, bz - by + 2.5, { dur: 0.8 });
    await st.say('duchess', 'Every Hearth they light, I shall simply snuff again. Did I not SAY so, darlings?{p} It was in the programme. Page two. In BOLD.', { expr: 'smug' });
    await st.say('duchess', 'Crumble! The Snuffer! And do try not to drop the king.', { expr: 'angry' });
    // the Grand Snuffer comes down on the lily throne
    await st.cam(THRONE[0], THRONE[1] - 8, { dur: 0.8 });
    st.prop('snuffer', buildSnuffer(P.r3d), THRONE[0], 16, THRONE[1] + 0.2);
    st.sfx('chain', { volume: 0.6 });
    await st.move('snuffer', { y: 4.2 }, 1.8);
    st.sfx('thud', { volume: 1 });
    st.shake(1.1);
    st.flash('#2a1640', 0.5);
    if (st.vfx) { st.vfx.shockwave(THRONE[0], THRONE[1], { r: 6, color: '#7a3aa8', life: 0.9, wall: 1.2 }); st.vfx.smoke(THRONE[0], 3, THRONE[1], { n: 18, color: '#6a4a8e', size: 0.6 }); }
    S.flag('marshSnuffed');
    S.st.lit = S.st.lit.filter((l) => l !== 'marsh');
    S.save();
    await st.lights(0.5, 0.6, 1.4);
    await st.move('snuffer', { y: 16 }, 1.4);
    st.dropProp('snuffer');
    await st.say('croakington', 'Achoo.{p} …We are cold again.', { expr: 'sad' });
    st.hide('duchess');
    await st.move('ship', { x: SX + 40, y: SY + 10, z: SZ - 30 }, 3.2, { ease: 'lin' });
    st.dropProp('ship');
    st.music(null);
    // back in the Forum: the fourth flame gutters, and goes out
    await st.fade(1, 0.4);
    await st.lights(0, 0, 0);
    await st.cam(FORUM[0] - 1, FORUM[1] + 0.8, { dur: 0, ppu: Math.round(st.basePpu() * 1.5) });
    await st.fade(0, 0.5);
    for (let k = 0; k < 8; k++) { f4.scale.setScalar(1 - k / 8); await st.wait(0.12); }
    f4.visible = false;
    st.sfx('poof', { volume: 0.5, pitch: -6 });
    st.fx('smoke', FORUM[0] - 1.4, 1.6, FORUM[1] + 1.8, 3, { color: '#8a8290' });
    st.mark('flameOut');
    await st.say('narrator', 'Three flames.');
    st.heroesEmote('dots', 2.4);
    await st.wait(1.2);
    st.actor('tariq', TARIQ_FORUM[0], TARIQ_FORUM[1], { face: { x: -0.6, z: -0.2 } });
    await st.say('tariq', 'Hey. Hey.{p} Three is still a lot of flames. And the bell WILL ring. I promise.', { expr: 'sad' });
    await st.say('tariq', 'Auntie says a promise is the one thing you never haggle over. So that one’s free.', { expr: 'happy' });
    st.dropProp('lamp');
  });
}

async function boatToTemple(S) {
  await S.scene(async (st) => {
    await boatRide(S, st, [ISLET[0] - 26, ISLET[1] - 14], [ISLET[0] - 3.2, ISLET[1] + 1.6], [ISLET[0], ISLET[1] + 0.8]);
    await st.say('tariq', 'The temple. The water round it is warm, and it hums. I don’t like water that hums.', { expr: 'worried' });
    await st.say('tariq', 'I’ll wait right here. Bring back the ringing, lantern-bearers.', { expr: 'happy' });
  });
}

// ------------------------------------------------------------------ the Sunken Bell Temple
const R = (id) => SUNKENBELL.rooms.find((r) => r.id === id);
const mid = (d, r, dz = 0) => ({ x: d.ox + r.x + r.w / 2, z: d.oz + r.z + r.h / 2 + dz });
const pose = (e) => { e.spawnT = 0; e.obj.scale.setScalar(1); e.obj.position.set(e.x, e.y, e.z); if (e.shadow) e.shadow.position.set(e.x, 0.02, e.z); };

// the Synchronised Swimmers: their pool, their routine
R('swimmers').run = async (S, d, r) => {
  const C = S.P.combat, c = mid(d, r, -1);
  if (!C) return;
  const lv = d.def.lv[0] + 1;
  const pool = { cx: c.x, cz: c.z, r: 5, a: 0, members: [], full: () => r.tide.full() };
  pool.members = ['swimminnow', 'swimfidget', 'swimbrick'].map((ty, i) => {
    const e = C.spawn(ty, c.x - 2 + i * 2, c.z - 1, { level: lv, quiet: true });
    e.saga = true; e.miniGroup = 'The Synchronised Swimmers'; e.immuneHint = 'Untouchable in the water — drain the pool!'; e.pool = pool;
    pose(e);
    return e;
  });
  r.pool = pool; r.routineT = 3;
  C.bounds = { x: c.x, z: c.z + 1, rx: r.w / 2 - 1.5, rz: r.h / 2 - 1 };
  await S.scene(async (st) => {
    await st.cam(c.x, c.z + 2, { dur: 0.8 });
    st.sfx('splash', { volume: 0.7 });
    await st.say('minnow', 'The Wick Brigade! In OUR pool! Understudies — the routine!', { expr: 'shock' });
    await st.say('fidget', 'Rule one: in the water, nobody can touch us. Rule two: nobody ever drains the pool. Rule three—', { expr: 'smug' });
    await st.say('brick', 'Brick forgot rule three.', { expr: 'sleepy' });
    st.mark('swimmers');
    await st.title('The Synchronised Swimmers', 'the Understudies, in swim caps', 2.2);
  });
};
R('swimmers').tick = (S, d, r, dt) => {
  const C = S.P.combat, pool = r.pool;
  if (!pool || r.done) return;
  pool.a += dt * 0.5;
  if (pool.full()) {
    r.routineT -= dt;
    if (r.routineT <= 0 && C) { r.routineT = 4.2; swimRoutine(C, pool, ['jets', 'lift', 'wave'][(r.nroutine = ((r.nroutine || 0) + 1) % 3)]); }
  }
  if (pool.members.some((e) => e.alive)) return;
  r.done = true;
  if (C) C.bounds = null;
  // (the pool drains for good; the Duchess calls, and she is not pleased)
  r.tide.outT = 1e9;
  (async () => {
    await S.P.wait(1);
    await S.scene(async (st) => {
      const c = mid(d, r, -1), horn = buildGloomophone(S.P.r3d);
      horn.scale.setScalar(1.5);
      st.prop('horn', horn, c.x, -2, c.z - 3);
      await st.cam(c.x, c.z - 1, { dur: 0.7 });
      st.move('horn', { y: 0 }, 0.6);
      st.sfx('boom', { volume: 0.6, pitch: -8 });
      await st.wait(0.6);
      st.fx('note', c.x, 2.6, c.z - 2.4, 8);
      st.mark('gloomophone5');
      await st.say('duchess', 'I asked for a HEIST. A daring, moonlit, masterful HEIST.{p} You gave me… a WATER BALLET.', { expr: 'angry' });
      await st.say('duchess', 'Never mind. My Kraken will keep the Wick Brigade busy while I keep my promises. Mwah!', { expr: 'smug' });
      st.dropProp('horn');
      st.sfx('poof', { volume: 0.6 });
      await st.say('narrator', 'Somewhere past the far wall, something very large turns over in its sleep. The water trembles.');
      const G = d.gate('g6');
      if (G) d.setGate(G, true);
    });
  })();
};

// the Gloom Kraken: the clapper goes back in the Sunken Bell, and the fight is on
R('kraken').run = async (S, d, r) => {
  const C = S.P.combat, c = mid(d, r, -1);
  if (!C) return;
  const pool = { cx: c.x, cz: c.z, full: () => r.tide.full() };
  const e = C.spawn('kraken', c.x, d.oz + r.z + 11, { level: d.def.lv[1] + 1, quiet: true });
  e.saga = true; e.home = { x: e.x, z: e.z }; e.state = 'roar'; e.timer = 99; e.pool = pool;
  r.boss = e; pose(e);
  C.bounds = { x: c.x, z: c.z + 1, rx: r.w / 2 - 1.5, rz: r.h / 2 - 1 };
  const b = r.tide.bells[0];
  await S.scene(async (st) => {
    await st.cam(d.ox + b.x, d.oz + b.z - 2, { dur: 0.8 });
    await st.say('narrator', 'The great Sunken Bell hangs in the flooded hall, green with age, its mouth empty.');
    st.sfx('chain', { volume: 0.6 });
    if (b.great) b.great.userData.clapper.visible = true;
    r.clapperIn = true;
    st.flash('#ffe8b0', 0.3);
    st.sfx('chime', { volume: 0.8, pitch: -6 });
    await st.say('narrator', 'Three pieces, one clapper. It fits with a deep, satisfied {wave}clunk{/}.');
    await st.cam(e.x, e.z + 3, { dur: 1 });
    st.shake(0.6);
    st.sfx('growl', { volume: 0.9, pitch: -14 });
    for (let k = 0; k < 20; k++) st.fx('splash', e.x - 3 + Math.random() * 6, 0.4, e.z - 1 + Math.random() * 3, 1);
    st.mark('kraken');
    await st.say('narrator', 'Something rises out of the water: a great mantle, a golden eye as big as a cartwheel — and it has clearly not had its breakfast.');
    await st.title('The Gloom Kraken', 'terror of the Sunken City', 2.4);
    await st.say('narrator', 'Ring the Sunken Bell, and the sea itself will step aside.');
  });
  e.state = 'lurk'; e.timer = 1;
};
R('kraken').tick = (S, d, r) => {
  const e = r.boss;
  if (!e || r.done || e.alive) return;
  r.done = true;
  r.tide.outT = 1e9;
  const C = S.P.combat;
  if (C) { C.bounds = null; for (const q of C.enemies) if (q.alive && q.summoner === e) { q.alive = false; q.fading = 0; q.remove(); } }
  (async () => {
    await S.P.wait(1);
    await S.scene(async (st) => {
      await st.cam(e.x, e.z + 2, { dur: 0.7 });
      st.fx('sparkle', e.x, 1.5, e.z, 30, { color: '#ffe8b0' });
      await st.say('narrator', 'The Kraken shudders, shrinks, and shrinks — until it is a small, embarrassed octopus, who hurries off under a stone.');
      await st.say('narrator', 'Behind the bell, a door that has not opened in a hundred years grinds open.');
      const G = d.gate('g7');
      if (G) d.setGate(G, true);
      const rr = d.rooms.find((q) => q.id === 'chamber');
      if (rr) rr.ready = true;
    });
    audio.jingle('festival');
  })();
};

// the South’s Great Hearth, under the bell
R('chamber').take = async (S, d, r) => {
  await S.scene(async (st) => {
    const x = d.ox + r.item[0], z = d.oz + r.item[1];
    await st.cam(x, z + 1.5, { dur: 0.6 });
    st.flash('#ffe8c8', 0.5);
    if (st.vfx) st.vfx.pillar(x, z, { r: 1, h: 7, color: '#ffc890', life: 1.4 });
    st.sfx('shard', { volume: 0.9 });
    S.flag('southLit');
    await st.say('narrator', 'Deep under the bell, the Great Hearth of the South wakes — and a new flame leaps into the lantern.');
  });
  await d.D.exit({ done: true });
};

// ------------------------------------------------------------------ the South lights up
async function southRelit(S) {
  await S.scene(async (st) => {
    const P = S.P, [x, z] = ISLET;
    P.gatherAt(x, z + 0.8, 1.1);
    await st.cam(x, z - 1, { dur: 0, ppu: st.basePpu() });
    st.sfx('bell', { volume: 1, pitch: -14 });
    await st.wait(0.6);
    st.sfx('bell', { volume: 0.8, pitch: -9 });
    st.shake(0.4);
    if (st.vfx) st.vfx.shockwave(x, z - 3, { r: 14, color: '#ffe8b0', life: 1.4, wall: 1.2 });
    await st.say('narrator', 'Across the water, the Sunken Bell rings — once, twice — and the whole lagoon hears it.');
    // the sea steps aside, the fish come home, the windows light up
    await st.cam(30, 212, { dur: 2.4, ppu: Math.max(8, st.basePpu() / 2) });
    for (let k = 0; k < 40; k++) st.fx('sparkle', 12 + Math.random() * 40, 0.5, 200 + Math.random() * 26, 1, { color: '#ffe08a' });
    st.mark('cityLit');
    await st.say('narrator', 'Down in the drowned streets, one by one, the windows light up.');
    // the warmth rolls on: Emberpeak, the Whirlpool Straits, Dino Isle
    await st.cam(446, 100, { dur: 2.6, ppu: Math.max(8, st.basePpu() / 2) });
    S.openZones(['volcano', 'straits', 'dino']);
    if (P.murk) P.murk.pulse(-1);
    st.sfx('whoosh', { volume: 0.7, pitch: 8 });
    await st.wait(1.4);
    st.mark('murkBack5');
    await st.title('The Sunken Bell rings', 'The Murk rolls back from Emberpeak, the Whirlpool Straits and Dino Isle', 4);
    // …and something comes in over the sea, very fast and slightly wobbly
    await st.cam(x, z - 2, { dur: 1.4, ppu: st.basePpu() });
    const ship = buildAirship(P.r3d);
    st.prop('airship', ship, x + 30, 12, z - 10);
    st.sfx('whoosh', { volume: 0.6 });
    await st.move('airship', { x: x + 7, y: 1.4, z: z + 0.5 }, 3.2);
    st.actor('wendy', x + 2.6, z - 0.6, { face: { x: -1, z: 0.4 } });
    st.mark('wendy5');
    await st.say('wendy', 'Ahoy, lantern chums! Out of the shop at last — the Dauntless Teacup! Paint’s still wet. Don’t lean on anything.', { expr: 'happy', hop: true });
    await st.say('wendy', 'Bad news on the wind, though. I followed that flying theatre all the way east. She’s moored at Emberpeak, the big grumpy volcano.', { expr: 'worried' });
    await st.say('wendy', 'And she’s rehearsing. Scales, costume changes, the lot. Posters everywhere: « The Duchess — Her DEBUT — one night only ».', { expr: 'neutral' });
    await st.say('wendy', 'She’s got the marsh’s flame up there, shining in a jar on her stage. Like a prop!{p} Shiver my rivets. Nobody treats a Great Hearth like a prop.', { expr: 'angry' });
    await st.say('wendy', 'All aboard, then — next stop, the Duchess’s opening night!', { expr: 'happy' });
  });
}

// ------------------------------------------------------------------ side quests
async function mirageChoice(S) {
  await S.say('zizi', 'Psst! Friend! You look like a person of TASTE. Of ADVENTURE. Of loose change!', { expr: 'smug' });
  await S.say('zizi', 'Behold: a genuine map to the Lost Oasis! Palms! Treasure! Shade! Only a little bit haunted!', { expr: 'happy' });
  await S.say('zizi', 'For you, a special price: your shiniest trinket. Limited time offer — the time is limited to right now!', { expr: 'smug' });
  const i = await S.ask('Zizi’s map to the Lost Oasis…', ['Buy the map (a gamble)', 'Report him to Auntie Saffron']);
  if (i === 0) {
    S.flag('mirageBought');
    await S.say('zizi', 'A pleasure doing business! No refunds, no returns, no questions, no Zizi — I was never here!', { expr: 'happy' });
    await S.say('narrator', 'The map shows the old sand temple, south-west of the oasis. Someone has drawn a very small skull beside it. Then crossed it out. Then drawn it again.');
  } else {
    S.flag('mirageReported');
    await S.say('zizi', 'Report me? To SAFFRON? Friend, friend, let’s not be hasty—{p} I think I hear my mother calling. From very far away. Bye!', { expr: 'shock' });
  }
}

async function chordSong(S) {
  await S.scene(async (st) => {
    const [x, z] = FORUM;
    await st.cam(STONES[1][0], STONES[1][1], { dur: 0.6 });
    for (const [k, p] of [[0, -5], [2, 9], [1, 2]]) { st.sfx('tone', { volume: 0.7, pitch: p }); st.fx('note', STONES[k][0], 1.8, STONES[k][1], 3); await st.wait(0.35); }
    st.sfx('chime', { volume: 0.8 });
    await st.say('narrator', 'Low, high, middle: the three stones sing together — and the old statue’s lamp, dark for a hundred years, lights up.');
    st.fx('sparkle', 30, 3, 204, 20, { color: '#ffe08a' });
    void x; void z;
    await st.say('shellington', 'Ah…{p} that song.{p} My mother… sang it… to me.', { expr: 'love', speed: 0.5 });
  });
}

// ------------------------------------------------------------------ the chapter
const got = (S, qid, k) => !!S.st.got[qid + ':0:' + k];
export const CH5 = {
  id: 5, title: 'Sand & Sea', lv: 23, zones: ['dunes', 'lagoon', 'sunken'], opens: ['volcano', 'straits', 'dino'],
  // (Croakmire, snuffed again, keeps its colours drained until chapter 6 wins its flame back)
  drain: (S) => {
    if (!S.has('marshSnuffed') || S.has('marshBack') || !S.P.big) return 0;
    const p = S.P.players.find((q) => q.connected || S.solo);
    const zz = p && S.P.big.zoneAt(p.pos.x, p.pos.z);
    return zz && zz.id === 'marsh' ? 0.45 : 0;
  },
  props: [
    // (Humphrey, safe at the oasis, chewing something he shouldn’t)
    { id: 'humphrey', at: [-153.5, 176.6], r: 0.8, build: (r3d) => { const g = buildCamel(r3d), a = g.userData.anim; g.rotation.y = 2.4; g.userData.anim = (t) => a(t, false); return g; }, when: (S) => S.done('c5_storm') || (S.st.q.c5_storm && S.st.q.c5_storm.s >= 2) },
    ...STONES.map(([x, z, s], k) => ({ id: 'stone' + k, at: [x, z], r: 0.35 * s, build: (r3d) => buildSingingStone(r3d, s) })),
    { id: 'lostChest', at: LOST_CHEST, r: 0.4, build: (r3d) => { const K = kit(r3d), g = new THREE.Group(); K.put(g, K.box(0.9, 0.5, 0.6), K.c('#8a5a3a'), 0, 0.25, 0); K.put(g, K.box(0.94, 0.12, 0.64), K.glow('#f2c14e', '#c89020', 0.4), 0, 0.52, 0); return g; }, when: (S) => !!S.st.q.c5_mirage_buy && !S.done('c5_mirage_buy') && !got(S, 'c5_mirage_buy', 0) },
    { id: 'teacup', at: [ISLET[0] + 7, ISLET[1] + 0.5], r: 1.6, build: (r3d) => { const g = buildAirship(r3d); g.position.y = 1.4; return g; }, when: (S) => S.done('c5_relight') },
  ],
  npcs: [
    { id: 'saffron', at: SAFFRON, face: { x: -1, z: 0.3 }, when: (S) => S.done('c4_relight'),
      lines: ['Everything has a price, little lamp. Even advice. This advice was free, which makes it suspicious.', 'Humphrey sends his regards. He sent them loudly, at three in the morning.'] },
    // (he waits by his boat at the oasis until you've boarded it for the Turtle Nest)
    { id: 'tariq', at: (S) => (!S.done('c5_oasis') || !(S.done('c5_lagoon') || (S.st.q.c5_lagoon && S.st.q.c5_lagoon.s >= 1)) ? TARIQ_OASIS : S.done('c5_clapper') || (S.st.q.c5_clapper && S.st.q.c5_clapper.s >= 1) ? (S.done('c5_temple') || (S.st.q.c5_temple && S.st.q.c5_temple.s >= 1) ? [ISLET[0] + 2.4, ISLET[1] + 1.2] : TARIQ_FORUM) : TARIQ_NEST),
      face: { x: -0.6, z: 1 }, when: (S) => S.done('c5_storm'),
      lines: ['On your left: the sea. On your right: more sea. It’s a very consistent tour.', 'Auntie says the boat is « nearly free ». I have learned not to ask what « nearly » means.'] },
    { id: 'shellington', at: SHELLINGTON, face: { x: -0.3, z: 1 }, when: (S) => S.done('c5_oasis'),
      lines: ['Patience…{p} is a shell.{p} It keeps… the soft bits… safe.', 'I have… seen… four hundred… summers.{p} This one… is… my favourite.'] },
    { id: 'snap', at: SNAP, face: { x: -0.5, z: 1 }, when: (S) => S.done('c5_oasis'),
      lines: ['did you know turtles can live for hundreds of years grandpa-great-great says he’s only halfway through', 'I’m going to be the fastest turtle in the whole lagoon when I grow up which will be in about eighty years'] },
    { id: 'zizi', at: ZIZI, face: { x: 0.6, z: 1 }, when: (S) => S.done('c5_storm') && !S.done('c5_mirage'),
      lines: ['Mirages! Get your fresh mirages! Guaranteed to vanish or your money back!', 'Sand in bottles! Sand in boxes! Sand in slightly smaller boxes!'] },
    { id: 'wendy', at: [ISLET[0] + 2.6, ISLET[1] - 0.6], face: { x: -1, z: 0.4 }, when: (S) => S.done('c5_relight'),
      lines: ['The Dauntless Teacup: fastest teacup in the sky. Also the only one.', 'Nibs stayed home. He says volcanoes are « a bit much ». He’s not wrong.'] },
    { id: 'croakington', at: KING, face: { x: -0.2, z: 1 }, when: (S) => S.has('marshSnuffed'),
      lines: ['Achoo. We are cold again. She took the flame itself this time — from under our very throne.', 'The Ember Pearl still glows in our crown. It is lonely without its Hearth. So are we.'] },
  ],
  quests: {
    c5_storm: {
      title: 'The Sandstorm', auto: true, lv: 21,
      steps: [
        { do: 'scene', text: '…', run: stormDrop },
        { do: 'escort', text: 'Lead Humphrey through the storm to Palm Oasis — he only follows a light', build: (r3d) => buildCamel(r3d), path: HUMPHREY_PATH, speed: 2.1, near: 5.5, lv: 21,
          ambush: { 2: ['beetle', 'slinger', 'burrower'], 4: ['beetle', 'beetle', 'slinger', 'burrower'] }, lost: 'Humphrey won’t take a step without your lantern. Stay close!', ambushText: 'Gloom in the storm! Keep Humphrey safe!', clear: 'Humphrey groans, and plods on.' },
        { do: 'talk', npc: 'saffron', text: 'Meet the caravan master at Palm Oasis', run: oasisArrive },
      ],
    },
    c5_oasis: {
      title: 'The Dimming Spring', auto: true, after: 'c5_storm', lv: 22,
      steps: [
        { do: 'camp', text: 'Drive the gloom out of the palm grove by the spring', camp: { id: 'c5_spring', at: SPRING, level: 22, foes: ['beetle', 'beetle', 'slinger', 'burrower', 'burrower'], n: 5, done: 'The spring runs clear and bright!' } },
        { do: 'talk', npc: 'saffron', text: 'Tell Auntie Saffron the spring is clear', run: springClear },
      ],
    },
    c5_lagoon: {
      title: 'The Turtle Nest', auto: true, after: 'c5_oasis', lv: 23,
      steps: [
        { do: 'talk', npc: 'tariq', text: 'Board Tariq’s glass-bottomed boat to the Coral Lagoon', run: boatToNest },
        { do: 'talk', npc: 'shellington', text: 'Talk to Elder Shellington at the Turtle Nest', run: nestTalk },
        { do: 'scene', text: '…', run: waterBallet },
      ],
    },
    c5_clapper: {
      title: 'The Silent Bell', auto: true, after: 'c5_lagoon', lv: 24,
      steps: [
        { do: 'talk', npc: 'tariq', text: 'Ask Tariq to take you to the Old Forum', run: boatToForum },
        { do: 'collect', text: 'Dive for the three pieces of the Sunken Bell’s clapper, where the bubbles rise', item: 'Clapper piece', n: 3, spots: CLAPPER, dive: true, hint: 'Bubbles rise here' },
        { do: 'scene', text: '…', run: snuffedAgain },
      ],
    },
    c5_temple: {
      title: 'The Sunken Bell Temple', auto: true, after: 'c5_clapper', lv: 25,
      steps: [
        { do: 'talk', npc: 'tariq', text: 'Ask Tariq to row you out to the domed temple', run: boatToTemple },
        { do: 'go', text: 'Enter the Sunken Bell Temple', at: SUNKEN_DOOR, r: 2.4, run: async (S) => { if (S.P.dungeons) await S.P.dungeons.enter('sunkenbell'); else S.flag('southLit'); } },
        { do: 'dungeon', id: 'sunkenbell', text: 'Ring the Sunken Bell and wake the Great Hearth of the South' },
      ],
    },
    c5_relight: {
      title: 'The Bell Rings', auto: true, after: 'c5_temple', lv: 26,
      steps: [
        { do: 'scene', text: '…', run: southRelit },
      ],
      done: async (S) => { if (!S.st.lit.includes('sunken')) S.st.lit.push('sunken'); S.save(); },
      next: 6,
    },
    // ---- side quests
    c5_hatch: {
      title: 'Home by Lantern Light', kind: 'side', giver: 'snap', lv: 23, when: (S) => S.done('c5_lagoon'), dust: 40,
      offer: async (S) => {
        await S.say('snap', 'the hatchlings the hatchlings the little ones hatched last night on the sandbar but it was so DARK they went the wrong way and now they’re lost and crying—', { expr: 'cry', speed: 1.8 });
        await S.say('snap', 'they follow lights! baby turtles always follow lights! could you bring them home with your lantern? please please please?', { expr: 'worried', speed: 1.8 });
      },
      steps: [
        { do: 'escort', text: 'Lead the five hatchlings home from the sandbar — they follow your lantern (don’t let any lag behind)', flock: 5, from: SANDBAR, goal: [NEST[0], NEST[1] + 1.4], r: 2.6, reach: 6, snatch: 6, speed: 3.0,
          build: (r3d, k) => buildHatchling(r3d, k), snatched: 'A gloom jellyfish scared a straggler back to the sandbar!' },
        { do: 'talk', npc: 'snap', text: 'Tell Snap the hatchlings are home',
          run: async (S) => {
            await S.say('snap', 'ONE TWO THREE FOUR FIVE all of them! you’re the best! you’re the BEST best! I’m going to name one after you!', { expr: 'love', speed: 1.8 });
            await S.say('snap', 'I named it Snap. it’s a family name.', { expr: 'happy', speed: 1.6 });
          } },
      ],
    },
    c5_mirage: {
      title: 'The Mirage Merchant', kind: 'side', giver: 'zizi', lv: 22, when: (S) => S.done('c5_storm'), dust: 10,
      offer: async (S) => { await S.say('zizi', 'Oh! A customer! Come closer — no, closer — not THAT close, personal space is extra.', { expr: 'happy' }); },
      steps: [
        { do: 'talk', npc: 'zizi', text: 'Hear out Zizi, purveyor of fine mirages', run: mirageChoice },
      ],
    },
    c5_mirage_buy: {
      title: 'The Lost Oasis', kind: 'side', auto: true, after: 'c5_mirage', lv: 23, when: (S) => S.has('mirageBought'), dust: 40, gear: 'rich',
      steps: [
        { do: 'go', text: 'Follow Zizi’s map to the old sand temple, south-west of Palm Oasis', at: LOST, r: 6,
          run: async (S) => { await S.say('narrator', 'There is no oasis. There is a temple, a great deal of sand — and gloom, guarding something.'); } },
        { do: 'camp', text: 'Beat the gloom guarding the sand temple', camp: { id: 'c5_lost', at: [LOST[0], LOST[1] - 1], level: 24, foes: ['worm', 'burrower', 'beetle', 'slinger', 'slinger'], n: 5, done: 'The sand temple falls quiet.' } },
        { do: 'collect', text: 'Open what the gloom was guarding', item: 'Lost treasure', n: 1, spots: [LOST_CHEST], hint: 'A chest, half buried in the sand', verb: 'Open',
          run: async (S) => { await S.say('narrator', 'Inside: gold, a fine piece of gear — and a note: « Told you it was real. Only a LITTLE haunted. — Z. »'); } },
      ],
    },
    c5_mirage_tell: {
      title: 'A Word with Auntie', kind: 'side', auto: true, after: 'c5_mirage', lv: 22, when: (S) => S.has('mirageReported'), dust: 60,
      steps: [
        { do: 'talk', npc: 'saffron', text: 'Tell Auntie Saffron about Zizi',
          run: async (S) => {
            await S.say('saffron', 'ZIZI? That little fennec sold my cousin a « bottled sunset ». It was sand. Orange sand.', { expr: 'angry' });
            await S.say('saffron', 'For this, a discount for life at every stall in Palm Oasis. Twenty percent.{p} …Fifteen.{p} Twenty. I am in a good mood.', { expr: 'happy' });
          } },
      ],
    },
    c5_chord: {
      title: 'The Forum’s Lost Chord', kind: 'side', giver: 'shellington', lv: 24, when: (S) => S.done('c5_clapper'), dust: 40,
      offer: async (S) => {
        await S.say('shellington', 'In the Forum…{p} three stones… used to sing.{p} Big… middle… small.', { expr: 'neutral', speed: 0.5 });
        await S.say('shellington', 'The old song… is carved… on the steps:{p} « low… high… middle ».{p} I would… like… to hear it… once more.', { expr: 'love', speed: 0.5 });
      },
      steps: [
        { do: 'collect', text: 'Strike the Forum’s singing stones in the order of the old song: low, high, middle', item: 'Note', n: 3, spots: STONES.map(([x, z]) => [x, z + 0.7]), order: [0, 2, 1], notes: [-5, 2, 9], verb: 'Strike',
          hint: 'A singing stone', wrong: 'A clashing chord! The stones fall silent — start again.', run: chordSong },
        { do: 'talk', npc: 'shellington', text: 'Tell Elder Shellington the Forum sings again',
          run: async (S) => { await S.say('shellington', 'I heard it…{p} all the way… from here.{p} Thank you… young… lamp.', { expr: 'love', speed: 0.5 }); } },
      ],
    },
  },
};
