// Chapter 4 — Mire & Frost. Croakmire, Frostpeak Glacier and the Cloud Isles,
// levels 15–23. King Croakington’s crown — and the Ember Pearl that keeps the
// marsh’s Great Hearth warm — snatched by Crumble on a gloom balloon; the marsh
// gone cold, the king with a cold; the Gloomstage’s shadow over the glacier and
// the ice singing back; Captain Wendy’s balloons; Crumble stuck head-first in a
// cloud; the Frostbell Halls, Chief Frostbite and the Frost Tenor, whose high C
// shatters ice. The crown home, the Murk rolls back from the dunes, the lagoon
// and the Sunken City; a bottle washes up with a letter from the turtles.

import '../cast.js';
import { buildLilyThrone, buildFrog, buildCloudPuff, buildFrostGate, buildCloudBell, buildRaceFlag } from '../../models/v7/props7.js';
import { buildGloomstage, BALCONY } from '../../models/v7/gloomstage.js';
import { buildVehicle } from '../../party/vehicles.js';
import { FROSTBELL, FROST_DOOR } from '../dungeons/frostbell.js';
import { kit, THREE } from '../../models/v7/kit.js';
import { audio } from '../../engine/audio.js';

// the chapter’s places
const CROAK = [296, 44];                                    // Croakton’s waystone
const THRONE = [302, 43.4];                                 // the lily-pad throne
const KING = [302, 45.6];
const NEWTON = [299.3, 46.6];
const LILIES = [289, 52];                                   // the royal lily pads, gloomy
const FROSTCAMP = [258, -46];
const YUKI = [286, -27];
const TOBI = [264, -40];
const STATION = [386, -66];                                 // the Balloon Station
const WENDY = [386.5, -67.8];
const DOCK1 = [389, -71], DOCK2 = [427, -73];
const CRUMBLE = [450, -97];
const NIMBUS = [458, -99];
const FROGS = [[288, 36], [310, 52], [283, 46]];
const FROG_REEDS = [294, 45];                                        // (where to listen for them)
const SLED = [[236.5, -124], [240, -108], [232, -88], [238, -69]];      // the Glacier Run: the start, two flags, the finish
const BELLS = [[487, -122], [478, -108], [444, -75]];

// ------------------------------------------------------------------ the frog king’s cold
async function croakton(S) {
  await S.scene(async (st) => {
    const P = S.P;
    P.gatherAt(CROAK[0] + 1, CROAK[1] + 3, 1.5);
    st.actor('croakington', KING[0], KING[1], { face: { x: -0.4, z: 1 } });
    st.actor('newton', NEWTON[0], NEWTON[1], { face: { x: 0.2, z: 1 } });
    await st.cam(THRONE[0] - 2, THRONE[1] + 2, { dur: 0, ppu: st.basePpu() });
    for (let k = 0; k < 16; k++) st.fx('sparkle', THRONE[0] - 8 + Math.random() * 14, 3, THRONE[1] - 3 + Math.random() * 8, 1, { color: '#ffffff' });
    await st.say('narrator', 'Croakmire is cold. Not damp-cold, the way a marsh should be — cold-cold.{p} Snow is falling on the lily pads.');
    st.hop('newton');
    await st.say('newton', '{big}HEAR YE!{/} Presenting His Royal Highness, Sovereign of the Swamp, Baron of the Bog — King Croakington the Third!', { expr: 'happy' });
    st.sfx('croak', { volume: 0.8 });
    await st.say('croakington', 'RIBBIT— {shake}ACHOO!{/}', { expr: 'shock', shake: 1 });
    await st.say('croakington', 'Forgive us. Since our crown was stolen, the marsh has gone cold. And so have we.', { expr: 'sad' });
    await st.say('croakington', 'The Ember Pearl in our crown keeps the Great Hearth warm, deep beneath this very throne. Without it… brrr.', { expr: 'worried' });
    await st.say('newton', 'A little red fellow on a gloom balloon, Your Majesty! He snatched it right off your head, mid-sneeze!', { expr: 'angry' });
    await st.say('croakington', 'He flew north, towards the glacier. And the gloom he left behind has taken our royal lily pads.', { expr: 'sad' });
  });
}
async function kingDecree(S) {
  await S.say('croakington', 'Magnificent! The lily pads thank you. We thank you. Our nose would thank you, if it could stop running.', { expr: 'happy' });
  await S.say('croakington', 'Take this royal seal. Show it at the Balloon Station, and they’ll fly you anywhere.{p} Well — anywhere with clouds.', { expr: 'smug' });
  await S.say('newton', 'The glacier camp lies to the north. Wrap up warm! That’s a royal order!', { expr: 'happy' });
}

// ------------------------------------------------------------------ the shadow on the ice
async function shadowOnIce(S) {
  await S.scene(async (st) => {
    const P = S.P, [x, z] = FROSTCAMP;
    P.gatherAt(x + 2, z + 2, 1.5);
    await st.cam(x + 4, z - 5, { dur: 0, ppu: Math.max(8, st.basePpu() / 2) });
    await st.say('narrator', 'Frostpeak Camp: igloos, cocoa, and a view all the way to the clouds.');
    // the Gloomstage sails in over the camp and stops there, its great shadow on the snow
    const ship = buildGloomstage(P.r3d, { fx: (sx, sy, sz) => P.world.fx.emit('smoke', sx, sy, sz, 1, { color: '#6a4a8e' }) });
    const s = 0.8, SX = x + 2, SY = 6.5, SZ = z - 13;
    ship.scale.setScalar(s);
    st.prop('ship', ship, SX + 46, SY, SZ);
    const shade = new THREE.Mesh(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x1a1030, transparent: true, opacity: 0.4, depthWrite: false }));
    shade.scale.set(14, 1, 9);
    st.prop('shade', shade, SX + 46, 0.05, SZ + 4);
    st.sfx('whoosh', { volume: 0.6, pitch: -12 });
    const arrive = st.move('ship', { x: SX, z: SZ }, 4.5);
    st.move('shade', { x: SX, z: SZ + 4 }, 4.5);
    await st.wait(1.4);
    st.heroesEmote('exclaim');
    for (let k = 0; k < 24; k++) st.fx('sparkle', x - 8 + Math.random() * 16, 4, z - 6 + Math.random() * 10, 1, { color: '#c8a8ff' });
    st.mark('shadowOnIce');
    await st.say('narrator', 'A shadow slides across the glacier — huge, and shaped exactly like a theatre.');
    await arrive;
    // Her Radiance on the balcony, practising her scales
    const bx = SX + BALCONY.x * s, by = SY + BALCONY.y * s, bz = SZ + BALCONY.z * s;
    st.actor('duchess', bx, bz, { face: { x: 0, z: 1 } }).n.seatY = by;
    await st.cam(bx, bz - by + 2.5, { dur: 1, ppu: st.basePpu() });
    st.mark('balcony');
    await st.say('narrator', '“♪ Mi-mi-mi-miiii… ♪”{p} A voice floats down from its balcony, practising scales.');
    await st.say('duchess', 'Oh! The Wick Brigade, down in the snow! How DO you like my weather? I ordered it specially.', { expr: 'smug' });
    await st.say('duchess', 'Do come up to the Frostbell Halls, darlings. My leading man is SO looking forward to an audience.{p} Front-row seats. Ha! Ha-ha! {shake}HA!{/}', { expr: 'happy' });
    st.hide('duchess');
    // and away it sails, north-west, towards the peaks
    st.sfx('whoosh', { volume: 0.5, pitch: -14 });
    st.move('ship', { x: SX - 50, z: SZ - 6 }, 5.5);
    st.move('shade', { x: SX - 50, z: SZ - 2 }, 5.5);
    await st.cam(x + 4, z - 5, { dur: 1, ppu: Math.max(8, st.basePpu() / 2) });
    await st.wait(1.6);
    st.dropProp('ship'); st.dropProp('shade');
    st.actor('yuki', YUKI[0] - 20, YUKI[1] - 17, { face: { x: -1, z: 0.3 } });
    st.walk('yuki', x + 4, z + 1.4, { speed: 4 });
    await st.cam(x + 3, z + 1, { dur: 1, ppu: st.basePpu() });
    await st.say('yuki', 'There it goes again. Every evening that flying opera house sails over — and every evening, the ice up the pass starts singing back.', { expr: 'worried' });
  });
}
async function yukiTalk(S) {
  await S.say('yuki', 'Welcome to Frostpeak Camp, dears. Cocoa? It’s mostly marshmallow. Tobi ate the cocoa.', { expr: 'happy' });
  await S.say('tobi', 'Did NOT.{p} …Some.', { expr: 'smug' });
  await S.say('tobi', 'A little red fellow crashed a balloon on the Cloud Isles yesterday! I saw it with my OWN EYES. Both of them!', { expr: 'happy' });
  await S.say('yuki', 'The Balloon Station is all iced over, though. Ice imps. They love a nice cold balloon.', { expr: 'worried' });
}
async function wendyTalk(S) {
  await S.say('wendy', 'Thanks, chums! Captain Wendeline Gale, at your service — Wendy to friends. My airship’s in the shop, so I’m flying balloons!', { expr: 'happy' });
  await S.say('wendy', 'Why is she in the shop? A great flying THEATRE rammed her last week, that’s why. Knocked my Dauntless Teacup clean out of the sky.', { expr: 'angry' });
  await S.say('wendy', 'Next time I see that opera house, I’m giving it a piece of my mind. And a broadside. Now — a royal seal? From a frog? Hop in! Nibs, cast off!', { expr: 'love' });
  await S.say('narrator', 'Nibs the albatross peers over the edge of the basket, whimpers, and puts a wing over his eyes.');
}

// ------------------------------------------------------------------ the balloon over the clouds
async function balloonFlight(S) {
  const P = S.P;
  const heroes = P.players.filter((p) => p.connected || P.solo);
  const hide = (p, on) => { p.away = on; p.hidden = on; if (p.actor) p.actor.hidden = on; };
  try {
    await S.scene(async (st) => {
      const b = buildVehicle(P.r3d, 'balloon');
      // (Nibs on the basket’s rim, and Wendy at the burner)
      const K = kit(P.r3d), nibs = K.grp(b, 0.7, 0.9, 0.6);
      K.put(nibs, K.ball(0.18, 8, 6), K.c('#f4f0ec'), 0, 0.15, 0).scale.set(1, 0.9, 1.3);
      K.put(nibs, K.box(0.08, 0.06, 0.24), K.c('#f2c14e'), 0, 0.18, 0.24);
      K.put(nibs, K.box(0.5, 0.04, 0.16), K.c('#3a3844'), 0, 0.2, -0.05);
      st.prop('balloon', b, DOCK1[0], 0, DOCK1[1]);
      P.gatherAt(DOCK1[0] + 1.5, DOCK1[1] + 2.5, 1.2);
      await st.cam(DOCK1[0], DOCK1[1] + 1, { dur: 0, ppu: st.basePpu() });
      for (const p of heroes) hide(p, true);
      st.sfx('whoosh', { volume: 0.6 });
      st.fx('smoke', DOCK1[0], 2, DOCK1[1], 10, { color: '#f4f0ec' });
      const a0 = b.userData.anim;
      b.userData.anim = (tt, dt) => { if (a0) a0(tt, dt); if (st.cv && !st.tw) { st.cv.x = b.position.x; st.cv.z = b.position.z - b.position.y * 0.4; } };
      st.music('clouds');
      await st.move('balloon', { y: 6 }, 1.6);
      st.mark('balloonFlight');
      await st.move('balloon', { x: (DOCK1[0] + DOCK2[0]) / 2, z: DOCK1[1] - 6, y: 8 }, 2.6, { ease: 'lin' });
      await st.move('balloon', { x: DOCK2[0], z: DOCK2[1], y: 5 }, 2.4, { ease: 'lin' });
      await st.move('balloon', { y: 0 }, 1.3);
      heroes.forEach((p, i) => {
        const x = DOCK2[0] + 1.2 + (i % 3) * 1.1, z = DOCK2[1] + 2.2 + Math.floor(i / 3) * 1.1;
        if (P.solo) P.gatherAt(x, z); else p.actor.pos = { x, z };
        hide(p, false);
      });
      if (!P.solo && P.cam) P.cam.snap(P.camPlayers());
      st.sfx('thud', { volume: 0.5 });
      await st.say('wendy', 'Cloud Harbour! Mind the gap.{p} The gap is the sky.', { expr: 'happy' });
      st.dropProp('balloon');
    }, { bars: true });
  } finally { for (const p of heroes) hide(p, false); }
}

// ------------------------------------------------------------------ Crumble in a cloud
async function crumbleStuck(S) {
  await S.scene(async (st) => {
    const P = S.P, [x, z] = CRUMBLE;
    P.gatherAt(x, z + 3, 1.3);
    const puff = buildCloudPuff(P.r3d, { legs: true });
    st.prop('puff', puff, x, 0, z);
    await st.cam(x, z + 1, { dur: 0.6, ppu: st.basePpu() });
    await st.say('narrator', 'A pair of small red boots stick out of a cloud, kicking furiously.');
    await st.say('crumble', '“Mmmf! MMMF! Is somebody there? Your Radiance? A pelican? ANYBODY?”', { expr: 'worried' });
    st.heroesFace(x, z);
    for (let k = 0; k < 3; k++) { st.shake(0.2 + k * 0.1); st.sfx('thud', { volume: 0.4 + k * 0.1 }); await st.wait(0.35); }
    st.sfx('poof', { volume: 0.9 });
    st.fx('smoke', x, 1, z, 20, { color: '#ffffff' });
    st.dropProp('puff');
    st.actor('crumble', x, z + 0.5, { face: { x: 0, z: 1 } });
    st.hop('crumble'); st.emote('crumble', 'exclaim');
    st.mark('crumbleFreed');
    await st.say('crumble', 'FREE! Thank you, kind stran— {shake}LAMP-LICKERS!{/} Curse you!{p} …And also, thank you.', { expr: 'shock' });
    await st.say('crumble', 'The crown? Ha! I delivered it hours ago, like a PROFESSIONAL. To the Frost Tenor — Her Radiance’s leading man!', { expr: 'smug' });
    await st.say('crumble', 'He sings in the Frostbell Halls, up the pass above Frostpeak. His high C can shatter a glacier. Or a teacup. He’s very proud of it.', { expr: 'happy' });
    await st.say('crumble', 'Now, if you’ll excuse me, I have a very dignified exit to make.', { expr: 'smug' });
    const K = kit(P.r3d), um = new THREE.Group();
    K.put(um, K.box(0.04, 1, 0.04), K.c('#3a3844'), 0, 0.5, 0);
    const top = K.put(um, K.ball(0.55, 10, 6), K.c('#c8383e'), 0, 1.05, 0); top.scale.y = 0.4;
    st.prop('umbrella', um, x, 1.1, z + 0.5);
    st.walk('crumble', x + 3, z + 1, { speed: 2 });
    st.move('umbrella', { x: x + 3 }, 1.4);
    await st.wait(1.4);
    st.hide('crumble');
    st.move('umbrella', { x: x + 8, y: -4, z: z + 4 }, 2.4);
    await st.say('narrator', 'He opens a tiny umbrella, steps off the edge of the cloud, and floats away. Very slowly. With great dignity.');
  });
  S.flag('crumbleFreed');
}

// ------------------------------------------------------------------ the Frostbell Halls’ scripts
const R = (id) => FROSTBELL.rooms.find((r) => r.id === id);
const mid = (d, r, dz = 0) => ({ x: d.ox + r.x + r.w / 2, z: d.oz + r.z + r.h / 2 + dz });
const pose = (e) => { e.spawnT = 0; e.obj.scale.setScalar(1); e.obj.position.set(e.x, e.y, e.z); if (e.shadow) e.shadow.position.set(e.x, 0.02, e.z); };

// Chief Frostbite: tickets, please
R('chief').run = async (S, d, r) => {
  const C = S.P.combat, c = mid(d, r, -1);
  if (!C) return;
  const e = C.spawn('chief', c.x + 6, c.z - 3, { level: d.def.lv[1], quiet: true });
  e.saga = true; e.home = { x: c.x, z: c.z }; e.state = 'roar'; e.timer = 99;
  r.boss = e; pose(e);
  C.bounds = { x: c.x, z: c.z + 1, rx: r.w / 2 - 2, rz: r.h / 2 - 1.5 };
  await S.scene(async (st) => {
    await st.cam(c.x, c.z, { dur: 0.8 });
    st.sfx('whoosh', { volume: 0.7 });
    for (let k = 0; k <= 12; k++) { e.x = c.x + 6 - k * 0.5; pose(e); st.fx('sparkle', e.x, 0.2, e.z, 1, { color: '#dff4ff' }); await st.wait(0.04); }
    await st.say('narrator', 'Something round and blue comes belly-sliding across the ice, spins twice, and stops with a flourish.');
    await st.say('narrator', '“HALT! Nobody gets past Chief Frostbite without a TICKET!”{p} “…No ticket? Then you get FROSTBITE!”');
    await st.title('Chief Frostbite', 'of the ice imps', 2.2);
  });
  e.state = 'chase'; e.timer = 1;
};
R('chief').tick = (S, d, r) => {
  const e = r.boss;
  if (!e || r.done || e.alive) return;
  r.done = true;
  const C = S.P.combat;
  if (C) { C.bounds = null; for (const q of C.enemies) if (q.alive && q.summoner === e) { q.alive = false; q.fading = 0; q.remove(); } }
  (async () => {
    await S.P.wait(1);
    await S.say('narrator', '“Ow. Okay. OKAY. Tickets are… free today.”');
    const G = d.gate('g5');
    if (G) d.setGate(G, true);
  })();
};

// the Frost Tenor’s hall: four ice pillars to hide behind from his high C
function buildIcePillar(K) {
  const g = new THREE.Group();
  const ice = [K.glow('#dff4ff', '#8ad0ff', 0.45), K.glow('#c8ecff', '#6ab8f0', 0.45)];
  K.put(g, K.cyl(0.75, 0.9, 3.2, 6), ice[0], 0, 1.6, 0);
  for (let i = 0; i < 4; i++) { const c = K.put(g, K.cone(0.3, 1.4, 5), ice[i % 2], Math.cos(i * 1.6) * 0.7, 3.1 + (i % 2) * 0.3, Math.sin(i * 1.6) * 0.6); c.rotation.z = (i - 1.5) * 0.3; }
  K.put(g, K.cyl(0.95, 1.05, 0.3, 6), ice[1], 0, 0.15, 0);
  return g;
}
R('hall').run = async (S, d, r) => {
  const C = S.P.combat, c = mid(d, r, -1);
  if (!C) return;
  const K = kit(S.P.r3d);
  // the pillars (local to the dungeon, but the Tenor thinks in world tiles)
  d.icePillars = [[-10, -4], [10, -4], [-10, 5], [10, 5]].map(([dx, dz]) => {
    const lx = c.x - d.ox + dx, lz = c.z - d.oz + dz, g = buildIcePillar(K);
    g.position.set(lx, 0, lz);
    d.root.add(g);
    const col = { x: lx, z: lz, r: 0.9 };
    d.col.add(col);
    const q = { x: d.ox + lx, z: d.oz + lz, r: 0.9, broken: false, g, col };
    q.shatter = () => { if (q.broken) return; q.broken = true; g.visible = false; d.col.remove(col); audio.sfx('shard', { volume: 0.8 }); };
    return q;
  });
  const e = C.spawn('tenor', c.x, c.z - 7, { level: d.def.lv[1] + 1, quiet: true });
  e.saga = true; e.home = { x: c.x, z: c.z }; e.state = 'roar'; e.timer = 99; e.pillars = d.icePillars;
  r.boss = e; pose(e);
  C.bounds = { x: c.x, z: c.z + 1, rx: r.w / 2 - 2, rz: r.h / 2 - 1.5 };
  await S.scene(async (st) => {
    await st.cam(c.x, c.z - 3, { dur: 0.9 });
    st.sfx('tone', { volume: 0.6, pitch: 12 });
    await st.say('narrator', 'At the far end of the hall, on a stage of ice, a tall figure holds one long, sad note.');
    st.mark('tenor');
    await st.say('tenor', '{big}♪ AAAAAAAAH… ♪{/}', { expr: 'love', shake: 1 });
    await st.say('tenor', 'An audience! At LAST! Her Radiance promised me a full house!', { expr: 'happy' });
    await st.say('tenor', 'The crown? A mere prop. Tonight the star is ME. And my voice. Which is magnificent.', { expr: 'smug' });
    await st.say('tenor', 'Do stay for the finale — my HIGH C. It brings the house down.{p} Literally.', { expr: 'smug' });
    await st.title('The Frost Tenor', 'Her Radiance’s leading man', 2.4);
  });
  e.state = 'chase'; e.timer = 1.2;
};
R('hall').tick = (S, d, r) => {
  const e = r.boss;
  if (!e || r.done || e.alive) return;
  r.done = true;
  const C = S.P.combat;
  if (C) { C.bounds = null; for (const q of C.enemies) if (q.alive && q.summoner === e) { q.alive = false; q.fading = 0; q.remove(); } }
  (async () => {
    await S.P.wait(1);
    await S.scene(async (st) => {
      await st.cam(e.x, e.z + 1, { dur: 0.7 });
      st.fx('sparkle', e.x, 1, e.z, 30, { color: '#dff4ff' });
      st.sfx('shard', { volume: 0.8 });
      await st.say('narrator', 'The Frost Tenor cracks from head to toe, sighs, and melts into a small puddle — holding his note to the very last drop.');
      await st.say('narrator', '“Brava… bravo… thank you… you’ve been… a wonderful… audience…”');
      // (a quiet beat, and a first glimpse of who she was)
      await st.say('narrator', '“Have a little pity for Gloria… Nobody ever stayed… for her finale…”');
      st.heroesEmote('dots');
      await st.say('narrator', 'The puddle freezes over, very neatly. It looks almost like a bow.');
      const G = d.gate('g6');
      if (G) d.setGate(G, true);
      const rr = d.rooms.find((q) => q.id === 'crown');
      if (rr) rr.ready = true;
    });
    audio.jingle('festival');
  })();
};

// King Croakington’s crown
R('crown').take = async (S, d, r) => {
  await S.scene(async (st) => {
    const x = d.ox + r.item[0], z = d.oz + r.item[1];
    await st.cam(x, z + 1.5, { dur: 0.6 });
    st.flash('#ffe8c8', 0.5);
    if (st.vfx) st.vfx.pillar(x, z, { r: 0.9, h: 6, color: '#ffc890', life: 1.4 });
    st.sfx('shard', { volume: 0.9 });
    S.flag('crown');
    await st.say('narrator', 'King Croakington’s crown is heavy, and warm. The Ember Pearl glows like a coal in a hearth.');
  });
  await d.D.exit({ done: true });
};

// ------------------------------------------------------------------ the marsh warms up
async function crownHome(S) {
  await S.scene(async (st) => {
    const P = S.P;
    P.gatherAt(KING[0] - 1, KING[1] + 2.6, 1.3);
    st.actor('croakington', KING[0], KING[1], { face: { x: -0.2, z: 1 } });
    st.actor('newton', NEWTON[0], NEWTON[1], { face: { x: 0.3, z: 1 } });
    await st.cam(KING[0], KING[1] + 0.5, { dur: 0, ppu: st.basePpu() });
    await st.say('croakington', 'Our crown! Our beautiful, WARM crown!', { expr: 'love', hop: true });
    const K = kit(P.r3d), crown = new THREE.Group();
    K.put(crown, K.cyl(0.26, 0.3, 0.2, 10), K.glow('#f2c14e', '#c89020', 0.35), 0, 0, 0);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; K.put(crown, K.cone(0.06, 0.16, 4), K.glow('#f2c14e', '#c89020', 0.35), Math.cos(a) * 0.24, 0.16, Math.sin(a) * 0.24); }
    K.noCast(K.put(crown, K.ball(0.1, 8, 6), K.glow('#ffe8c8', '#ff9a6a', 1.2), 0, 0.06, 0.27));
    st.prop('crown', crown, KING[0], 2.35, KING[1] + 0.05);
    st.sfx('chime', { volume: 0.9 });
    st.flash('#ffe8c8', 0.6);
    st.shake(0.5);
    if (st.vfx) { st.vfx.pillar(THRONE[0], THRONE[1], { r: 1.8, h: 8, color: '#ffc890', life: 1.6 }); st.vfx.shockwave(THRONE[0], THRONE[1], { r: 12, color: '#ffd8a8', life: 1.4, wall: 1.2 }); }
    S.flag('marshWarm');
    for (let k = 0; k < 6; k++) { st.sfx('croak', { volume: 0.5, pitch: k * 2 }); await st.wait(0.12); }
    await st.lights(0, 0, 1.4);
    // the warmth rolls south-west: over the sea to the dunes, the lagoon and the Sunken City
    await st.cam(100, 190, { dur: 3, ppu: Math.max(8, st.basePpu() / 2) });
    S.openZones(['dunes', 'lagoon', 'sunken']);
    if (P.murk) P.murk.pulse(-1);
    st.sfx('whoosh', { volume: 0.7, pitch: 8 });
    await st.wait(1.4);
    st.mark('murkBack4');
    await st.wait(0.8);
    await st.title('Croakmire warms up', 'The Murk rolls back from Sunscorch Dunes, the Coral Lagoon and the Sunken City', 4);
    await st.say('narrator', 'Back in Marigold Cove, the mayor has a new teacup.{p} It is attached to his waistcoat with a chain.');
    await st.cam(KING[0], KING[1] + 0.5, { dur: 1.4, ppu: st.basePpu() });
    await st.say('croakington', '{big}RIBBIT!{/}{p} Ahh. No sneeze. Four flames in your lantern now, little heroes — and the whole marsh in your debt.', { expr: 'happy' });
    await st.say('newton', 'Hear ye! The royal choir will now perform in your honour!', { expr: 'love' });
    for (let k = 0; k < 8; k++) { st.sfx('croak', { volume: 0.5, pitch: (k % 4) * 3 }); await st.wait(0.16); }
    await st.say('narrator', 'Something bobs in the water by the throne: a bottle, with a letter rolled up inside.');
    await st.say('narrator', '“Dear Whoever — the Sunken City’s bell has stopped ringing, and the sea has gone very dark. Also, three strangers are doing synchronised swimming in our lagoon. Please advise. — The Turtles of Turtle Nest”');
  });
}

// ------------------------------------------------------------------ the chapter
const frogWant = (S, k) => { const q = S.st.q.c4_choir; return !!q && !q.done && !S.st.got['c4_choir:0:' + k]; };
export const CH4 = {
  id: 4, title: 'Mire & Frost', lv: 17, zones: ['marsh', 'glacier', 'cloud'], opens: ['dunes', 'lagoon', 'sunken'],
  props: [
    { id: 'lilyThrone', at: THRONE, r: 1.1, build: (r3d, S) => buildLilyThrone(r3d, S) },
    { id: 'frostGate', at: [FROST_DOOR[0], FROST_DOOR[1] - 2.2], build: (r3d) => buildFrostGate(r3d) },
    ...FROGS.map(([x, z], k) => ({ id: 'frog' + k, at: [x, z], build: (r3d) => buildFrog(r3d, ['#6ab04a', '#8ac05a', '#5a9a8a'][k]), when: (S) => frogWant(S, k) })),
    ...SLED.map(([x, z], k) => ({ id: 'sledflag' + k, at: [x + 1.6, z], r: 0.15, build: (r3d) => buildRaceFlag(r3d, k === 0 ? 'start' : k === SLED.length - 1 ? 'finish' : 'flag'), when: (S) => !!S.st.q.c4_sled && !S.done('c4_sled') })),
    ...BELLS.map(([x, z], k) => ({ id: 'cbell' + k, at: [x, z], r: 0.3, build: (r3d, S) => buildCloudBell(r3d, 'cbell' + k, S), when: (S) => S.has('crumbleFreed') })),
  ],
  npcs: [
    { id: 'croakington', at: KING, face: { x: -0.2, z: 1 }, when: (S) => S.done('c3_relight'),
      lines: ['A king must be warm, wise, and regal. We manage two out of three. On good days.', 'Ribbit. Pardon us. It slips out when we are happy.'] },
    { id: 'newton', at: NEWTON, face: { x: 0.3, z: 1 }, when: (S) => S.done('c3_relight'),
      lines: ['Hear ye! …Sorry. Force of habit.', 'I have announced forty thousand things. My favourite was lunch.'] },
    { id: 'yuki', at: YUKI, face: { x: -0.5, z: 1 }, when: (S) => S.done('c3_relight'),
      lines: ['Wrap up warm, dears. The glacier bites.', 'More cocoa? It’s ALL marshmallow now. I gave up.'] },
    { id: 'tobi', at: TOBI, face: { x: 0.4, z: 1 }, when: (S) => S.done('c3_relight'),
      lines: ['Fastest sled on the glacier! Ask anyone! Ask me!', 'Mama Yuki says no sledding after dark. It’s ALWAYS nearly dark.'] },
    { id: 'wendy', at: WENDY, face: { x: -0.4, z: 1 }, when: (S) => S.done('c3_relight'),
      lines: ['Up, up and away! Mostly up.', 'Nibs is afraid of heights. He’s an albatross. It’s complicated.'] },
    { id: 'nimbus', at: NIMBUS, face: { x: -0.3, z: 1 }, when: (S) => S.done('c3_relight'),
      lines: ['The clouds remember every song ever sung beneath them.', 'A cloud never hurries, and yet it is never late.'] },
  ],
  quests: {
    c4_croak: {
      title: 'The Frog King’s Cold', auto: true, lv: 16,
      steps: [
        { do: 'go', text: 'Go to Croakton, in the heart of Croakmire', at: CROAK, r: 7, run: croakton },
        { do: 'camp', text: 'Chase the gloom off the royal lily pads', camp: { id: 'c4_lilies', at: LILIES, level: 16, foes: ['toad', 'toad', 'shaman', 'gloomling'], n: 4, done: 'The royal lily pads are clear!' } },
        { do: 'talk', npc: 'croakington', text: 'Return to King Croakington', run: kingDecree },
      ],
    },
    c4_frost: {
      title: 'The Shadow on the Ice', auto: true, after: 'c4_croak', lv: 18,
      steps: [
        { do: 'go', text: 'Head north to Frostpeak Camp', at: FROSTCAMP, r: 7, run: shadowOnIce },
        { do: 'talk', npc: 'yuki', text: 'Talk to Mama Yuki by the igloos', run: yukiTalk },
        { do: 'camp', text: 'Chase the ice imps off the Balloon Station', camp: { id: 'c4_station', at: [STATION[0], STATION[1] + 2], level: 19, foes: ['frostimp', 'frostimp', 'frostimp', 'wisp'], n: 4, done: 'The balloons shake off their ice!' } },
        { do: 'talk', npc: 'wendy', text: 'Talk to the balloon captain', run: wendyTalk },
      ],
    },
    c4_cloud: {
      title: 'Crumble in the Clouds', auto: true, after: 'c4_frost', lv: 20,
      steps: [
        { do: 'scene', text: '…', run: balloonFlight },
        { do: 'go', text: 'Find the little red fellow’s crash on the Cloud Isles', at: CRUMBLE, r: 3.5, run: crumbleStuck },
      ],
    },
    c4_halls: {
      title: 'The Frostbell Halls', auto: true, after: 'c4_cloud', lv: 21,
      steps: [
        { do: 'go', text: 'Climb to the Frostbell Halls, at the foot of the peaks north of Frostpeak Camp', at: FROST_DOOR, r: 2.4, run: async (S) => { if (S.P.dungeons) await S.P.dungeons.enter('frostbell'); else S.flag('crown'); } },
        { do: 'dungeon', id: 'frostbell', text: 'Take back King Croakington’s crown from the Frost Tenor' },
      ],
    },
    c4_relight: {
      title: 'Croakmire Warms Up', auto: true, after: 'c4_halls', lv: 22,
      steps: [
        { do: 'go', text: 'Bring the crown home to King Croakington', at: KING, r: 3.5, run: crownHome },
      ],
      done: async (S) => { if (!S.st.lit.includes('marsh')) S.st.lit.push('marsh'); S.save(); },
      next: 5,
    },
    // ---- side quests
    c4_hanky: {
      title: 'A Royal Handkerchief', kind: 'side', giver: 'croakington', lv: 16, when: (S) => S.done('c4_croak'), dust: 30,
      offer: async (S) => {
        await S.say('croakington', 'Until our crown comes home, we shall need something warm. And something to sneeze into. Preferably not the same thing.', { expr: 'sad' });
        await S.say('croakington', 'They say the woman at the glacier camp knits the warmest scarves in the world. Would you ask her for one?', { expr: 'happy' });
      },
      steps: [
        { do: 'talk', npc: 'yuki', text: 'Ask Mama Yuki for a warm scarf for the king',
          run: async (S) => {
            await S.say('yuki', 'A scarf for a frog king? Oh, how lovely. Green, I think. With little flies on it.', { expr: 'love' });
            await S.say('narrator', 'Mama Yuki knits so fast her needles whistle. In no time at all, there is a scarf.');
          } },
        { do: 'talk', npc: 'croakington', text: 'Bring the scarf to King Croakington',
          run: async (S) => {
            await S.say('croakington', 'Little flies! She KNEW! Oh, it is perfect. We are never taking it off.', { expr: 'love' });
            await S.say('newton', 'Hear ye! His Majesty is never taking it off!', { expr: 'happy' });
          } },
      ],
    },
    c4_choir: {
      title: 'The Royal Choir', kind: 'side', giver: 'newton', lv: 16, when: (S) => S.done('c4_croak'), dust: 30,
      offer: async (S) => {
        await S.say('newton', 'A disaster! Three of the royal choir hopped off when it snowed. The choir can’t sing without its basses!', { expr: 'worried' });
        await S.say('newton', 'They’ll be hiding in the reeds, humming to keep warm. Would you bring them home?', { expr: 'happy' });
      },
      steps: [
        { do: 'collect', text: 'Find the three runaway choir frogs in the reeds — follow their humming', item: 'Choir Frog', n: 3, spots: FROGS, sound: 'croak', near: FROG_REEDS, hint: 'A frog, humming quietly in the reeds' },
        { do: 'talk', npc: 'newton', text: 'Bring the choir frogs back to Sir Newton',
          run: async (S) => {
            await S.say('newton', 'The basses! All present! Choir — from the top!', { expr: 'love' });
            for (let k = 0; k < 6; k++) audio.sfx('croak', { volume: 0.5, pitch: k * 2 });
            await S.say('narrator', 'The royal choir sings a very long, very deep, very slightly out-of-tune anthem.{p} It is beautiful.');
          } },
      ],
    },
    c4_sled: {
      title: 'Downhill Dash', kind: 'side', giver: 'tobi', lv: 18, when: (S) => S.done('c4_frost'), dust: 30,
      offer: async (S) => {
        await S.say('tobi', 'Bet you can’t beat my record on the Glacier Run! Grab a sled at the top, past both flags and down to the bottom in ten seconds. I did it in FIVE. With my eyes shut. Backwards.', { expr: 'smug' });
        await S.say('tobi', 'Ready? Steady? I already started!', { expr: 'happy' });
      },
      steps: [
        { do: 'race', text: 'Sled down the Glacier Run: past both flags to the bottom before the clock runs out', points: SLED, time: 10, r: 3.4, go: 'Go! Go! GO!', fail: 'Too slow! Tobi’s laughing. Back to the top and try again!' },
        { do: 'talk', npc: 'tobi', text: 'Tell Tobi how the race went',
          run: async (S) => {
            await S.say('tobi', 'You beat me?! That’s impossible! I was going SO fast!{p} …I fell off at the first flag.', { expr: 'shock' });
            await S.say('tobi', 'Rematch tomorrow. And the day after. And the day after that.', { expr: 'happy' });
          } },
      ],
    },
    c4_bells: {
      title: 'The Silent Bells', kind: 'side', giver: 'nimbus', lv: 20, when: (S) => S.has('crumbleFreed'), dust: 30,
      offer: async (S) => {
        await S.say('nimbus', 'The temple’s three bells have fallen silent since the gloom came. The clouds have forgotten how to drift.', { expr: 'sad' });
        await S.say('nimbus', 'One stands on each isle. Would you ring them for me?', { expr: 'neutral' });
      },
      steps: [
        ...BELLS.map(([x, z], k) => ({ do: 'go', text: ['Ring the bell on the northern isle', 'Ring the bell on the eastern isle', 'Ring the bell by the harbour'][k], at: [x, z + 1], r: 2.2,
          run: async (S) => { S.flag('cbell' + k); audio.sfx('bell', { volume: 0.8, pitch: k * 4 }); S.P.world.fx.emit('sparkle', x, 2, z, 12, { color: '#ffe8a0' }); } })),
        { do: 'talk', npc: 'nimbus', text: 'Return to Sister Nimbus at the Cloud Temple',
          run: async (S) => {
            await S.say('nimbus', 'Listen. The clouds are moving again. Thank you, travellers.', { expr: 'happy' });
            await S.say('nimbus', 'A blessing for your road: may the wind always be at your back, and never in your tea.', { expr: 'love' });
          } },
      ],
    },
  },
};
