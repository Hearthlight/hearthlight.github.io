// Chapter 7 — The Dawnlands. Whale Isle, Lantern Bay, the Jade Terraces and the
// Saltmirror Flats, levels 28–34. The Dauntless Teacup crosses the Wide Sea (the
// Teacup line: a mooring mast on Lighthouse Isle, another in Lanternport), runs out
// of tea over an island that isn’t on any chart — and the island opens its eye:
// Grandmother Bellows, itching with gloom barnacles. Stomp them, and her spout throws
// the Teacup over the Murk into Lantern Bay. Lanternport sits in the dark: relight its
// street lamps with a guttering lantern; Old Hoshi, the last Lamplighter this side of
// the sea (she knew Nana June); the Duchess’s broadcast, and her Umbral Spotlight put
// through its paces on the bay. The Mime Troupe on the Pilgrims’ Way; the Dawn
// Monastery, its Pagoda sealed until a dawn the fog won’t let through — so, kites.
// The Lantern Pagoda (the dawn beam) and Old Lucky, the Paper Dragon, saved not slain;
// the sunrise; the Lantern Festival — and thirty years of undelivered mail.

import '../cast.js';
import { buildAirship, buildFlameJar } from '../../models/v7/props7.js';
import { buildMast, buildStreetLamp, buildBarnacle, buildKite, buildSkyLantern, buildSpout } from '../../models/v7/dawn7.js';
import { buildPelican } from '../../models/v7/pelican.js';
import { LANTERNPAGODA, PAGODA_DOOR, ROOF, PERCHES } from '../dungeons/lanternpagoda.js';
import { DAWN_MODELS } from '../../combat/v7/dawn.js';
import { kit, THREE } from '../../models/v7/kit.js';
import { audio } from '../../engine/audio.js';
import { t } from '../../i18n.js';

// the chapter’s places
export const MAST_W = [475, 215.5];                          // the Teacup’s mast on Lighthouse Isle
export const MAST_E = [775, 66.5];                           // …and in Lanternport’s harbour
const WENDY_W = [473.2, 217.4], WENDY_E = [777.2, 68.4];
const BESS = [606.4, 60.6];                                  // at the Blowhole Inn’s door
const EYE = [572, 68];                                       // Grandmother Bellows’s eye (a landmark of the world)
const BLOWHOLE = [590, 58];
const WHALE_LAND = [600, 61];                                // where the Teacup puts down on her back
const WHACK = [598, 63];
const HOLES = [[592, 61], [595, 58.5], [595, 64.5], [598, 61], [601, 58.5], [601, 64.5], [604, 61], [598, 67], [592, 66], [604, 66.5], [589.5, 63.5], [606.5, 63.5]];
const LP_LAND = [779, 64];                                   // off the Teacup, in the harbour square
const LAMPS = [[777, 60], [789, 62], [785, 55.5], [776, 52.5], [800, 52.5], [786, 45], [793, 40.5]];
const HOSHI = [796.5, 39.8];                                 // on the hall’s steps, under the one lamp she kept
const HALL_LAMP = [797, 36.2];
const MIMES = [793.5, -50];                                  // on the Pilgrims’ Way, by the first torii
const BAO = [799, -79.5];                                    // at the second torii
const ABBOT = [803, -111.2];
const KITES = [820, -113];                                   // the kite field, east of the Pagoda’s court
const BLANCHE = [803, 228.5];                                // at the Saltworks, at her easel
const REFLECT = [[770, 238], [812, 255], [786, 210]];
const FESTIVAL = [782, 63];

const hide = (P, on) => { for (const p of P.players) { p.away = on; p.hidden = on; if (p.actor) p.actor.hidden = on; } };
// (the camera rides with a flying prop — it aims where a thing that high shows up)
const ride = (st, obj, dy = 0.6) => { const a0 = obj.userData.anim; obj.userData.anim = (tm, dt) => { if (a0) a0(tm, dt); if (st.cv && !st.tw) { st.cv.x = obj.position.x; st.cv.z = obj.position.z - obj.position.y + dy; } }; };
const eyeOf = (P) => { const q = P.big && P.big.pois && P.big.pois.list.find((o) => o.kind === 'whale_eye'); return q && q.built ? q.built.obj : null; };
const lampOut = (S, i) => !!S.st.f['lpOut' + i];

// ------------------------------------------------------------------ the crossing
async function wendyMast(S) {
  await S.say('wendy', 'There she is! The Dauntless Teacup, on her very own mooring mast. Barnaby let me build it. He said « Forecast: regret ».', { expr: 'happy', hop: true });
  await S.say('wendy', 'The Wide Sea. Nobody’s crossed it in fifty years. Fifty-one, if you count my aunt, who turned back for her hat.', { expr: 'smug' });
  await S.say('wendy', 'All aboard! Next stop: the Dawnlands. Estimated flight time: one pot of tea.', { expr: 'happy' });
}

async function crossing(S) {
  await S.scene(async (st) => {
    const P = S.P, K = kit(P.r3d);
    const ship = buildAirship(P.r3d);
    st.prop('teacup', ship, MAST_W[0], 1.3, MAST_W[1] - 3.7);
    hide(P, true);
    await st.cam(MAST_W[0], MAST_W[1] + 1, { dur: 0.6, ppu: st.basePpu() });
    st.sfx('whoosh', { volume: 0.6 });
    await st.move('teacup', { y: 7 }, 1.4);
    // (out over the Wide Sea, the camera riding along, high)
    const prop0 = ship.userData.anim;
    ride(st, ship);
    st.cv.ppu = Math.max(8, Math.round(st.basePpu() / 16) * 8); st.applyCam();
    st.music('whale');
    const [wx, wz] = [WHALE_LAND[0] - 10, WHALE_LAND[1] + 8];
    const fly = st.move('teacup', { x: wx, z: wz }, 8, { ease: 'lin' });
    st.mark('crossing');
    await st.say('wendy', 'Wide Sea below. Blue in every direction. I love it. I hate it. I love it.', { expr: 'happy' });
    await st.say('wendy', '…Hm. The needle. She runs on tea, you know. Strong. Two sugars.{p} Tea: low.', { expr: 'worried' });
    await st.say('wendy', 'There’s an island down there that isn’t on any chart. Which is suspicious. But it has an inn. Which is not.', { expr: 'neutral' });
    await fly;
    st.cv.ppu = st.basePpu(); st.applyCam();
    ship.userData.anim = prop0;
    await st.move('teacup', { x: WHALE_LAND[0], y: 0.3, z: WHALE_LAND[1] - 1.5 }, 2);
    st.sfx('thud', { volume: 0.7 });
    st.shake(0.3);
    // (on the grass of her back: the inn, and its keeper)
    hide(P, false);
    P.gatherAt(WHALE_LAND[0] + 2, WHALE_LAND[1] + 1.5, 1.2);
    st.actor('wendy', WHALE_LAND[0] - 1.8, WHALE_LAND[1] + 0.8, { face: { x: 0.5, z: 1 } });
    await st.cam(WHALE_LAND[0] + 2, WHALE_LAND[1] + 0.5, { dur: 0.6 });
    st.actor('bess', BESS[0] + 1.5, BESS[1] - 1, { face: { x: -1, z: 0.5 } });
    st.walk('bess', BESS[0] - 1, BESS[1] + 0.4);
    await st.say('bess', 'Visitors! Petals, you look like you’ve been blown here by a teapot.', { expr: 'happy', hop: true });
    await st.say('bess', 'Barnacle Bess, keeper of the Blowhole Inn. Rooms: two. Beds: three. Tea: plenty — I’ll fill your pot.', { expr: 'happy' });
    // (the ground rumbles)
    st.sfx('growl', { volume: 0.9, pitch: -16 });
    st.shake(0.9);
    st.heroesEmote('exclaim', 1.6);
    await st.say('bess', 'Oh, don’t mind that. She’s itchy.', { expr: 'neutral' });
    await st.say('wendy', '…Who’s « she »?', { expr: 'worried' });
    // the island opens its eye
    await st.cam(EYE[0] + 0.5, EYE[1] - 0.6, { dur: 1.6, ppu: Math.round(st.basePpu() * 1.5) });
    const eye = eyeOf(P);
    st.sfx('growl', { volume: 1, pitch: -22 });
    st.shake(1.2);
    for (let k = 0; k <= 20; k++) { if (eye) eye.userData.open = k / 20; await st.wait(0.06); }
    st.fx('water', EYE[0], 1.2, EYE[1] + 0.5, 12);
    st.mark('eye');
    await st.say('bellows', '{big}Mmmmmm…{/}{p}Little… ones… on… my… back… Again.', { expr: 'neutral', speed: 0.5 });
    await st.say('bellows', 'I… am… Grandmother… Bellows. I… have… carried… this… inn… for… two… hundred… years.', { expr: 'neutral', speed: 0.5 });
    await st.say('bellows', 'Since… the grey… fog… came… I… itch. Gloom… barnacles.{p}Right… between… the… shoulders.', { expr: 'sad', speed: 0.5 });
    await st.say('bellows', 'Would… you… be… dears…?', { expr: 'happy', speed: 0.5 });
    await st.cam(WHALE_LAND[0] + 1, WHALE_LAND[1] + 0.5, { dur: 1.2, ppu: st.basePpu() });
    await st.say('wendy', 'A whale. We parked on a WHALE.{p} …Well. She did ask nicely.', { expr: 'shock' });
    await st.title('The Dawnlands', 'Chapter 7');
    void K;
  });
}

async function spout(S) {
  await S.scene(async (st) => {
    const P = S.P;
    const eye = eyeOf(P);
    await st.cam(EYE[0] + 3, EYE[1] - 1, { dur: 0.8, ppu: st.basePpu() });
    if (eye) eye.userData.open = 1;
    await st.say('bellows', 'Ohhhh…{p}That’s… the… spot…', { expr: 'happy', speed: 0.5 });
    await st.say('bellows', 'Now… hold… on… to… your… teapot…', { expr: 'happy', speed: 0.5 });
    // (everyone in the Teacup, the Teacup over the blowhole)
    hide(P, true);
    const ship = buildAirship(P.r3d), sp = buildSpout(P.r3d);
    st.prop('teacup', ship, BLOWHOLE[0], 0.3, BLOWHOLE[1]);
    st.prop('spout', sp, BLOWHOLE[0], 0, BLOWHOLE[1]);
    await st.cam(BLOWHOLE[0], BLOWHOLE[1] - 1, { dur: 0.8 });
    await st.say('wendy', 'Why are we parked on her blowhole? Why am I asking? I know why. Hold on to your—', { expr: 'shock' });
    st.sfx('geyser', { volume: 1 });
    st.shake(1.4);
    st.flash('#e8f4ff', 0.3);
    // (up goes the spout, up goes the Teacup — seen from the whale's back, zoomed out)
    await st.cam(BLOWHOLE[0], BLOWHOLE[1] - 7, { dur: 0.3, ppu: Math.max(8, Math.round(st.basePpu() / 16) * 8) });
    for (let k = 0; k <= 24; k++) {
      sp.userData.k = Math.min(1, k / 16);
      ship.position.y = 0.3 + sp.userData.k * 14;
      if (k % 2 === 0) st.fx('water', BLOWHOLE[0] + (Math.random() - 0.5) * 2, 1 + Math.random() * 12, BLOWHOLE[1], 8);
      if (k === 18) st.mark('spout');
      await st.wait(0.06);
    }
    ride(st, ship, 0.6);
    for (let k = 0; k <= 12; k++) { ship.position.y += 0.6; await st.wait(0.05); }
    await st.say('narrator', 'Grandmother Bellows blows. The spout goes up and up — and the Teacup goes up on top of it, clean over the wall of fog.');
    await st.fade(1, 0.6);
    st.dropProp('spout');
    // (down into Lantern Bay, in the dark)
    S.flag('teacupAt', 'east'); S.flag('teacupLine');
    st.dropProp('teacup');
    const ship2 = buildAirship(P.r3d);
    st.prop('teacup2', ship2, MAST_E[0] - 14, 12, MAST_E[1] + 6);
    await st.cam(MAST_E[0] - 6, MAST_E[1], { dur: 0 });
    await st.lights(0.85, null, 0);
    await st.fade(0, 0.8);
    st.music('harbor');
    await st.move('teacup2', { x: MAST_E[0], y: 1.3, z: MAST_E[1] - 3.7 }, 3);
    st.dropProp('teacup2');
    hide(P, false);
    P.gatherAt(LP_LAND[0], LP_LAND[1], 1.2);
    st.actor('wendy', WENDY_E[0], WENDY_E[1], { face: { x: 0.4, z: 1 } });
    await st.cam(LP_LAND[0], LP_LAND[1] - 3, { dur: 0.8 });
    st.mark('lanternport');
    await st.say('wendy', 'Lanternport. Or what’s left of the light of it.', { expr: 'sad' });
    await st.say('narrator', 'The streets are dark. Every lamp is out. But behind the shutters, here and there, a candle: somebody is still here.');
    await st.say('wendy', 'I’ll moor her. You find whoever wrote those letters. And mind the moths — the dark ones come for lanterns.', { expr: 'worried' });
  });
}

// ------------------------------------------------------------------ Lanternport
async function townWakes(S) {
  await S.scene(async (st) => {
    const P = S.P, [x, z] = [786, 56];
    await st.lights(0.25, null, 1.2);
    await st.cam(x, z, { dur: 0.8, ppu: st.basePpu() });
    for (let k = 0; k < 4; k++) { st.sfx('door', { volume: 0.5, pitch: k * 2 - 3 }); await st.wait(0.25); }
    st.actor('mei', 783.5, 51.2, { face: { x: 0.4, z: 1 } });
    st.actor('tamsin', 791, 53.5, { face: { x: -0.6, z: 1 } });
    st.walk('mei', 785, 55);
    st.walk('tamsin', 789.5, 56);
    await st.wait(0.8);
    st.heroesEmote('heart', 2);
    await st.say('narrator', 'One by one the shutters open. The people of Lanternport come out into the light, blinking.');
    await st.say('mei', 'The lamps! Mum, the LAMPS!', { expr: 'love', hop: true });
    await st.say('tamsin', 'Thirty days in the dark and I still burnt the fish.', { expr: 'happy' });
    // (and up the hill, under the one lamp that never went out)
    await st.cam(HOSHI[0], HOSHI[1] + 1, { dur: 1.2 });
    st.actor('hoshi', HOSHI[0], HOSHI[1], { face: { x: -0.3, z: 1 } });
    st.mark('hoshi');
    await st.say('hoshi', 'Hmph. Took your time.', { expr: 'smug' });
  });
}

async function hoshiTalk(S) {
  await S.say('hoshi', 'Old Hoshi. Lamplighter. The last one this side of the sea.', { expr: 'neutral' });
  await S.say('hoshi', 'Thirty days I kept that one lamp burning. I counted. Somebody had to. Then I put letters in bottles, which is what you do when you’ve run out of better ideas.', { expr: 'neutral' });
  await S.say('hoshi', '…That lantern. That’s June’s lantern.', { expr: 'surprised' });
  await S.say('hoshi', 'June and I lit our first hearths the same summer. She wrote to me every Starfall. Sixty years of letters.{p}Then last spring, they stopped.', { expr: 'sad' });
  await S.say('hoshi', '…Well. She’d have liked you. She liked anyone who argues with the dark.', { expr: 'happy' });
  await broadcast(S);
}

// the Duchess on the fog: her Umbral Spotlight, rehearsed on the bay
async function broadcast(S) {
  await S.scene(async (st) => {
    const P = S.P, K = kit(P.r3d);
    const [bx, bz] = [780, 48];
    await st.cam(bx, bz, { dur: 1, ppu: st.basePpu() });
    st.sfx('charge', { volume: 0.7, pitch: -6 });
    st.flash('#6a3a9a', 0.5);
    // (her face, huge, painted on the fog over the bay)
    const face = P.portraitOf ? P.portraitOf('duchess', 'smug') : P.world.portraitOf ? P.world.portraitOf('duchess', 'smug') : null;
    const g = new THREE.Group();
    if (face) {
      const tex = new THREE.CanvasTexture(face); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 7.5), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false }));
      m.rotation.x = -Math.PI / 4; g.add(m); g.userData.face = m;
    }
    const halo = K.noCast(K.put(g, K.ball(6, 14, 10), K.light('#8a5ab8', 0.12), 0, 0, -0.5));
    halo.scale.set(1, 1, 0.2);
    st.prop('face', g, bx, 10, bz + 4);
    for (let k = 0; k <= 20; k++) { if (g.userData.face) g.userData.face.material.opacity = k / 20 * 0.95; await st.wait(0.04); }
    st.mark('broadcast');
    await st.say('duchess', 'Testing, testing… is this thing on?{p}Of COURSE it’s on. It’s MINE.', { expr: 'smug' });
    await st.say('duchess', 'Good evening, Dawnlands! You may have noticed the dark. You’re welcome.', { expr: 'happy' });
    await st.say('duchess', 'Tonight, a little rehearsal. My Umbral Spotlight: ONE light, on ME — and darkness for everyone else. Forever.{p}Lights… OFF!', { expr: 'angry', shake: 1 });
    // a beam of darkness sweeps the town: every lamp it touches goes out
    const beam = new THREE.Mesh(new THREE.ConeGeometry(3.2, 12, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0x1a0a2a, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
    const bg = new THREE.Group(); beam.position.y = 6; bg.add(beam);
    st.prop('umbral', bg, 772, 0, 62);
    st.sfx('thunder', { volume: 0.6 });
    const order = LAMPS.map((L, i) => [i, L]).sort((a, b) => a[1][0] - b[1][0]);
    for (let s = 0; s <= 40; s++) {
      const x = 772 + s * 0.7, zz = 62 - s * 0.55;
      bg.position.set(x, 0, zz);
      for (const [i, L] of order) if (!lampOut(S, i) && Math.hypot(L[0] - x, L[1] - zz) < 3.5) { S.st.f['lpOut' + i] = 1; st.sfx('poof', { volume: 0.5 }); st.fx('smoke', L[0] + 0.56, 2, L[1], 6, { color: '#3a2a4a' }); }
      if (s === 20) await st.lights(0.9, null, 0.8);
      await st.wait(0.05);
    }
    st.dropProp('umbral');
    await st.say('duchess', 'Mmm. Needs more… ME. Back to rehearsals!', { expr: 'smug' });
    for (let k = 20; k >= 0; k--) { if (g.userData.face) g.userData.face.material.opacity = k / 20 * 0.85; await st.wait(0.03); }
    st.dropProp('face');
    // the one lamp she kept — and Hoshi’s taper
    await st.cam(HOSHI[0], HOSHI[1] + 2, { dur: 0.9 });
    st.actor('hoshi', HOSHI[0], HOSHI[1], { face: { x: 0, z: 1 } });
    await st.say('hoshi', 'Hmph. « Rehearsal ».', { expr: 'angry' });
    await st.say('hoshi', 'A lamp that’s been put out is only a lamp that’s waiting.', { expr: 'neutral' });
    st.sfx('chime', { volume: 0.7 });
    st.fx('sparkle', HALL_LAMP[0], 3, HALL_LAMP[1], 20, { color: '#ffd66b' });
    for (const [i, L] of [...order].reverse()) {
      if (!lampOut(S, i)) continue;
      delete S.st.f['lpOut' + i];
      st.fx('sparkle', L[0] + 0.56, 2.2, L[1], 10, { color: '#ffb060' });
      st.sfx('chime', { volume: 0.4, pitch: 3 + i });
      await st.wait(0.22);
    }
    S.save();
    await st.lights(0.25, null, 1);
    await st.say('hoshi', 'When she gets that thing working, it won’t be a street she puts out. It’ll be the world.', { expr: 'worried' });
    await st.say('hoshi', 'Our Great Hearth burned at the top of the Lantern Pagoda, up at the Dawn Monastery. She snuffed it a month ago — and the gloom got into the monks’ festival dragon. Old Lucky. Guarding the tower now, poor old thing.', { expr: 'sad' });
    await st.say('hoshi', 'North, up the Pilgrims’ Way. Go on. I’ll keep the lamps.', { expr: 'neutral' });
  });
}

// ------------------------------------------------------------------ the Mime Troupe
async function mimesMeet(S) {
  const P = S.P, C = P.combat, [x, z] = MIMES;
  await S.scene(async (st) => {
    P.gatherAt(x, z + 5.5, 1.3);
    await st.cam(x, z + 1.5, { dur: 0.6, ppu: st.basePpu() });
    st.actor('mminnow', x - 1.8, z - 0.6, { face: { x: 0, z: 1 } });
    st.actor('mfidget', x, z - 1, { face: { x: 0, z: 1 } });
    st.actor('mbrick', x + 2, z - 0.6, { face: { x: 0, z: 1 } });
    await st.say('narrator', 'Three mimes stand across the Pilgrims’ Way, in white faces and berets. They do not speak. They are VERY good at not speaking.');
    st.emote('mminnow', 'dots', 1.4);
    await st.say('mminnow', 'We are MIMES now! She said it would stop us TALKING!', { expr: 'angry', hop: true });
    await st.say('mfidget', 'Minnow.', { expr: 'neutral' });
    await st.say('mminnow', '…', { expr: 'sad' });
    st.mark('mimes');
    await st.say('narrator', 'Minnow mimes zipping his mouth shut. Brick mimes a very small, very sad violin. Fidget mimes a wall — right across the road.');
    await st.say('mfidget', '(Fidget mimes: « You. Shall. Not. PASS. »)', { expr: 'smug' });
    await st.title('The Mime Troupe', 'Silent, but deadly', 2.2);
    for (const id of ['mminnow', 'mfidget', 'mbrick']) st.hide(id);
  });
  if (!C) { S.flag('mimesDone'); return; }
  spawnMimes(S);
}
function spawnMimes(S) {
  const C = S.P.combat, [x, z] = MIMES;
  const band = [['mimeminnow', x - 1.8, z - 0.6], ['mimefidget', x, z - 1], ['mimebrick', x + 2, z - 0.6]].map(([ty, ex, ez]) => {
    const e = C.spawn(ty, ex, ez, { level: 30, quiet: true });
    e.saga = true; e.sagaTag = 'mimes'; e.miniGroup = t('The Mime Troupe');
    e.spawnT = 0; e.obj.scale.setScalar(1);
    return e;
  });
  C.bounds = { x, z: z + 1.5, rx: 9.5, rz: 7 };
  S.mimeBand = band;
}
// (a game loaded — or a knock-out — while the Mime Troupe is to be beaten: they're back on the
// road when someone comes near, the count starting over)
function ensureMimes(S) {
  const q = S.st.q.c7_mimes, st = S.stepDef('c7_mimes');
  if (!q || q.done || !st || st.do !== 'kill' || S.running) return;
  const C = S.P.combat, [x, z] = MIMES;
  if (!C || C.enemies.some((e) => e.alive && e.sagaTag === 'mimes')) return;
  if (!S.P.players.some((p) => (p.connected || S.P.solo) && Math.hypot(p.pos.x - x, p.pos.z - z) < 24)) return;
  q.n = 0;
  spawnMimes(S);
}

async function mimesBeaten(S) {
  const P = S.P, C = P.combat, [x, z] = MIMES;
  if (C) C.bounds = null;
  for (const p of P.players) p.mimeBoxed = null;
  await S.scene(async (st) => {
    await st.cam(x, z + 1, { dur: 0.6, ppu: st.basePpu() });
    st.actor('mminnow', x - 1.8, z - 0.6, { face: { x: 0, z: 1 } });
    st.actor('mfidget', x, z - 1, { face: { x: 0, z: 1 } });
    st.actor('mbrick', x + 2, z - 0.6, { face: { x: 0, z: 1 } });
    await st.say('mfidget', '(Fidget mimes a white flag.)', { expr: 'sad' });
    await st.say('mminnow', 'We LOST. Out LOUD.', { expr: 'cry' });
    st.mark('mimesBeaten');
    await st.say('mbrick', 'Brick liked the invisible box. Brick felt safe in the invisible box.', { expr: 'sad' });
    await st.say('narrator', 'For a moment, nobody says anything. Even Minnow.');
    await st.say('mfidget', 'We’re not going back to the Gloomstage tonight. She’d only make us mimes AGAIN.', { expr: 'sad' });
    for (const id of ['mminnow', 'mfidget', 'mbrick']) st.walk(id, x - 14, z + 6, { speed: 3 });
    await st.wait(1.6);
    for (const id of ['mminnow', 'mfidget', 'mbrick']) st.hide(id);
  });
}

// ------------------------------------------------------------------ the Dawn Monastery
async function abbotTalk(S) {
  await S.say('sen', 'Welcome, travellers. An old proverb says: « The door that will not open is only waiting for the right morning. »', { expr: 'happy', speed: 0.85 });
  await S.say('sen', 'I made that one up just now. It is old now.', { expr: 'smug', speed: 0.85 });
  await S.say('sen', 'The Pagoda opens only to the first light of dawn. But under this fog, no light has touched its doors for a month.', { expr: 'worried', speed: 0.85 });
  await S.say('sen', 'So: the Dawn Kites. Above the fog, the morning is still there. Fly high enough and your kite will catch it — and send it down the string to us.', { expr: 'neutral', speed: 0.85 });
  await S.say('sen', 'The field is east of the court. The novices will hand you a kite. Mind the gusts, and the tree.', { expr: 'happy', speed: 0.85 });
}

async function dawnColumn(S) {
  await S.scene(async (st) => {
    const P = S.P, [dx, dz] = PAGODA_DOOR, K = kit(P.r3d);
    await st.cam(KITES[0] - 5, KITES[1] + 1, { dur: 0.8, ppu: st.basePpu() });
    st.sfx('chime', { volume: 0.8, pitch: 7 });
    await st.say('narrator', 'High above the fog, the kites catch the morning. It runs down their strings like honey — gold, and warm.');
    // (a column of gold comes down on the Pagoda’s door)
    const col = K.noCast(K.put(new THREE.Group(), K.cyl(1.2, 1.2, 1, 16), K.light('#ffe8a0', 0.4), 0, 0, 0));
    const g = col.parent;
    st.prop('column', g, dx, 0, dz - 0.5);
    await st.cam(dx, dz + 1, { dur: 1.2 });
    for (let k = 0; k <= 24; k++) { col.scale.set(1, k * 0.8 + 0.1, 1); col.position.y = 20 - k * 0.4; await st.wait(0.04); }
    st.flash('#fff4c8', 0.5);
    st.sfx('chord', { volume: 0.8 });
    st.shake(0.4);
    await st.wait(0.7);
    st.mark('dawn');
    await st.say('narrator', 'The light touches the Pagoda’s doors, and with a long, grateful creak, they open.');
    st.actor('sen', dx - 2.5, dz + 2.6, { face: { x: 0.5, z: -1 } });
    await st.say('sen', '…It has been a long month. Thank you.', { expr: 'love', speed: 0.85 });
    await st.say('sen', 'Inside, Old Lucky waits. Forty years he danced for us at every festival. It was not his fault — the gloom got into his paper.', { expr: 'sad', speed: 0.85 });
    await st.say('sen', 'If there is any way… please. Bring him back to us.', { expr: 'worried', speed: 0.85 });
    st.dropProp('column');
  });
}

// ------------------------------------------------------------------ the Lantern Pagoda
const R = (id) => LANTERNPAGODA.rooms.find((r) => r.id === id);
const mid = (d, r, dz = 0) => ({ x: d.ox + r.x + r.w / 2, z: d.oz + r.z + r.h / 2 + dz });

// the roof: Old Lucky circles the Dawn Mirror
R('roof').run = async (S, d, r) => {
  const C = S.P.combat;
  if (!C) return;
  const H = { x: d.ox + ROOF.x, z: d.oz + ROOF.z };
  const e = C.spawn('paperdragon', H.x - 3, H.z + 2, { level: d.def.lv[1], quiet: true });
  e.saga = true; e.sagaTag = 'dragon'; e.home = { ...H }; e.radius = 7.5;
  e.perches = PERCHES.map(([x, z]) => [d.ox + x, d.oz + z]);
  e.spawnT = 0; e.obj.scale.setScalar(1);
  r.boss = e;
  C.bounds = { x: H.x, z: H.z, rx: r.w / 2 - 1.2, rz: r.h / 2 - 1 };
  // (up on the roof it's morning: the open sky's light)
  d.room.def.dark = false; d.room.room.def.dark = false; d.room.room.def.ambient = 0.75;
  await S.scene(async (st) => {
    await st.cam(H.x, H.z - 2, { dur: 0.8 });
    st.sfx('roar', { volume: 0.8, pitch: 4 });
    await st.say('narrator', 'On the roof, under the open sky, something long and red uncoils from round the Dawn Mirror — a festival dragon of paper and gold, ink-dark about the eyes.');
    st.mark('dragon');
    await st.title('Old Lucky', 'The Paper Dragon', 2.2);
    await st.say('narrator', 'Up in the air, nothing reaches it. But when it lands… the mirror in the middle turns towards whichever plate you stand on.');
  });
};
R('roof').tick = (S, d, r) => {
  const e = r.boss, C = S.P.combat;
  if (!e || r.done || e.alive) return;
  r.done = true;
  if (C) { C.bounds = null; for (const q of C.enemies) if (q.alive && q.sagaTag === 'dragon') { q.alive = false; q.fading = 0.3; } }
  // (not slain: the gloom burns off, and Old Lucky sags, red and gold again)
  e.fading = 99; e.hold = true; e.saved = true;
  (async () => {
    await S.P.wait(0.6);
    await S.scene(async (st) => {
      const H = { x: d.ox + ROOF.x, z: d.oz + ROOF.z };
      await st.cam(e.x, e.z - 1, { dur: 0.7 });
      // (down it comes, if it was still in the air)
      for (let k = 0; k < 10 && e.obj && e.obj.position.y > 0.6; k++) { e.obj.position.y = Math.max(0.55, e.obj.position.y - 0.5); await st.wait(0.04); }
      st.flash('#fff4c8', 0.5);
      for (let k = 0; k < 16; k++) st.fx('smoke', e.x + (Math.random() - 0.5) * 3, 1 + Math.random() * 2, e.z + (Math.random() - 0.5) * 3, 1, { color: '#4a3a6a' });
      if (e.obj) e.obj.userData.brow.visible = false;
      await st.say('narrator', 'The last of the gloom burns off in a puff of violet smoke. What’s left is a paper dragon — red and gold again, a little singed at the whiskers — lying very still.');
      st.mark('lucky');
      await st.say('narrator', 'Then one eye opens. The tail thumps, twice, on the roof tiles. Old Lucky purrs.');
      // the Dawn Hearth, relit
      await st.cam(H.x, H.z - 7, { dur: 1 });
      st.sfx('chord', { volume: 0.9 });
      st.flash('#ffe8c8', 0.7);
      st.shake(0.6);
      if (st.vfx) { st.vfx.pillar(H.x, d.oz + 6, { r: 2, h: 12, color: '#ffd890', life: 2 }); st.vfx.shockwave(H.x, d.oz + 6, { r: 16, color: '#ffe8b0', life: 1.6, wall: 1.4 }); }
      S.flag('dawnLit');
      if (!S.st.lit.includes('harbor')) S.st.lit.push('harbor');
      S.save();
      await st.say('narrator', 'The Dawn Hearth catches — and the fifth flame in the lantern with it.');
      st.music(null);
    });
    e.hold = false; e.fading = 0; if (e.remove) e.remove();
    await d.D.exit({ done: true });
    await sunrise(S);
  })();
};

// out of the Pagoda: the morning comes back to the Dawnlands
async function sunrise(S) {
  await S.scene(async (st) => {
    const P = S.P, [dx, dz] = PAGODA_DOOR;
    P.gatherAt(dx, dz + 3, 1.2);
    const H = P.state;
    await st.cam(dx, dz + 1, { dur: 0, ppu: st.basePpu() });
    if (H) H.hour = 5.2;
    await st.lights(0.3, null, 0);
    st.music('jade');
    for (let k = 0; k < 40; k++) { if (H) H.hour = 5.2 + k * 0.045; if (k === 20) st.lights(0, null, 1.2); await st.wait(0.06); }
    st.mark('sunrise');
    await st.say('narrator', 'And over the Jade Terraces, for the first time in a month, the sun comes up.');
    S.openZones(['autumn', 'glow', 'elder']);
    if (S.P.murk) S.P.murk.pulse(-1);
    st.actor('sen', dx - 2.5, dz + 2.6, { face: { x: 0.5, z: -1 } });
    await st.say('sen', 'Old Lucky! Look at him — hardly singed. We shall mend his whiskers for the festival.', { expr: 'love', hop: true, speed: 0.85 });
    await st.say('sen', 'An old proverb says: « After the longest night, breakfast. » I did not make that one up. It is on the kitchen wall.', { expr: 'happy', speed: 0.85 });
    await st.title('Morning over the Dawnlands', 'The Murk rolls back from Emberleaf, Glowtide and Elderbough', 3.4);
  });
}

// ------------------------------------------------------------------ the Lantern Festival
async function festival(S) {
  await S.scene(async (st) => {
    const P = S.P, [x, z] = FESTIVAL;
    await st.fade(1, 0.6);
    if (P.state) P.state.hour = 20.6;
    P.gatherAt(x, z + 3, 1.3);
    await st.cam(x, z, { dur: 0, ppu: st.basePpu() });
    st.music('festival');
    st.actor('hoshi', x - 3.5, z + 1.6, { face: { x: 0.4, z: -1 } });
    st.actor('sen', x + 3.2, z + 1.4, { face: { x: -0.4, z: -1 } });
    st.actor('mei', x - 1.2, z + 1.8, { face: { x: 0, z: -1 } });
    st.actor('wendy', x + 1.6, z + 2.4, { face: { x: -0.2, z: -1 } });
    // (Old Lucky, mended, dancing over the square)
    const lucky = DAWN_MODELS.paperdragon(P.r3d);
    lucky.userData.brow.visible = false;
    const trail = [];
    const lg = new THREE.Group(); lg.add(lucky);
    st.prop('lucky', lg, x, 0, z);
    let tt = 0;
    lg.userData.anim = (tm, dt) => {
      tt += dt || 0.016;
      const hx = Math.sin(tt * 0.9) * 5, hz = Math.sin(tt * 1.8) * 2 - 2, hy = 2.2 + Math.sin(tt * 2.2) * 0.5;
      lucky.position.set(hx, hy, hz);
      trail.unshift({ x: hx, y: hy, z: hz }); if (trail.length > 120) trail.pop();
      const u = lucky.userData, nx = trail[1] || trail[0];
      u.head.rotation.y = Math.atan2(hx - nx.x, hz - nx.z);
      u.segs.forEach((s, k) => { const q = trail[Math.min(trail.length - 1, (k + 1) * 6)] || trail[0]; s.position.set((q.x - hx) / u.sc, (q.y - hy) / u.sc + Math.sin(tt * 4 - k * 0.6) * 0.1, (q.z - hz) / u.sc); const r2 = trail[Math.min(trail.length - 1, (k + 1) * 6 - 2)] || q; s.rotation.y = Math.atan2(r2.x - q.x, r2.z - q.z); });
    };
    // (strings of paper lanterns across the square)
    const K = kit(P.r3d), strings = new THREE.Group();
    for (const [[ax, az], [bx, bz]] of [[[772, 58.5], [793, 57.5]], [[773, 69.5], [792, 67.5]], [[776, 56], [788, 71]]]) {
      const n = 9, pts = [];
      for (let k = 0; k <= n; k++) { const u = k / n; pts.push(new THREE.Vector3(ax + (bx - ax) * u - x, 3.1 - Math.sin(u * Math.PI) * 0.7, az + (bz - az) * u - z)); }
      strings.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x3a2a2a })));
      for (let k = 1; k < n; k++) { const L = K.noCast(K.put(strings, K.ball(0.16, 8, 6), K.glow(['#ff6a4a', '#ffcf7a', '#ff9ab0'][k % 3], ['#ff6a4a', '#ffcf7a', '#ff9ab0'][k % 3], 1.5), pts[k].x, pts[k].y - 0.22, pts[k].z)); L.scale.y = 1.25; }
    }
    st.prop('strings', strings, x, 0, z);
    await st.fade(0, 1);
    await st.say('narrator', 'That night, Lanternport throws the Lantern Festival it has been saving up for a month.');
    // (sky lanterns rising over the bay)
    const lan = [];
    for (let k = 0; k < 26; k++) {
      const L = buildSkyLantern(P.r3d, ['#ffcf7a', '#ffb07a', '#ffe0a0', '#ff9a8a'][k % 4]);
      const lx = x - 12 + Math.random() * 18, lz = z - 6 + Math.random() * 10;
      st.prop('sky' + k, L, lx, 1 + Math.random() * 4, lz);
      lan.push({ key: 'sky' + k, L, vy: 0.9 + Math.random() * 0.8, t: Math.random() * 0.6 });
    }
    const rise = (dt) => { for (const q of lan) { q.t -= dt; if (q.t > 0) continue; q.L.position.y += q.vy * dt; q.L.position.x += Math.sin(q.L.position.y * 0.7 + q.vy) * dt * 0.3; } };
    const rg = new THREE.Group();
    rg.userData.anim = (tm, dt) => rise(dt || 0.016);
    st.prop('riser', rg, 0, 0, 0);
    st.mark('festival');
    await st.say('mei', 'Make a wish! You have to make a wish when yours goes up. Mine’s about fish. Don’t tell Mum.', { expr: 'love', hop: true });
    for (let k = 0; k < 4; k++) { st.fx('firework', x - 4 + k * 3, 9, z - 8, 24, { color: ['#ffd66b', '#ff8ab0', '#8fd6ff', '#b0f08a'][k] }); st.sfx('firework', { volume: 0.5 }); await st.wait(0.35); }
    // Perkins, with thirty years of undelivered mail
    const pel = buildPelican(P.r3d, { rider: '#3f6f9e' });
    pel.scale.setScalar(1.4);
    st.prop('perkins', pel, x + 12, 8, z - 4);
    pel.userData.mode = 'fly';
    await st.move('perkins', { x: x + 4.2, y: 0.3, z: z + 0.6 }, 1.6);
    pel.userData.mode = 'sit';
    st.dropProp('perkins');
    st.actor('perkins', x + 4.2, z + 0.6, { face: { x: -1, z: 0 } });
    await st.say('perkins', 'Special delivery! Thirty years of undelivered Dawnlands mail! The Murk ate the route.', { expr: 'happy', hop: true });
    await st.say('perkins', 'Birthday cards, mostly. A very late apology. And one for a « Miss G. Gloomsworth, Marigold Cove »…{p}Never did find her. No forwarding address.', { expr: 'neutral' });
    st.heroesEmote('question', 1.6);
    await st.say('perkins', 'Ah well. Back in the sack it goes!', { expr: 'happy' });
    // (at the end of the pier)
    await st.cam(760, 64, { dur: 1.4 });
    st.actor('mminnow', 756.5, 63.6, { face: { x: 0, z: -1 } });
    st.actor('mfidget', 757.6, 63.6, { face: { x: 0, z: -1 } });
    st.actor('mbrick', 759, 63.6, { face: { x: 0, z: -1 } });
    for (const id of ['mminnow', 'mfidget', 'mbrick']) { const a = st.actorOf(id); if (a && a.n) a.n.seatY = 0.2; }
    st.mark('pier');
    await st.say('narrator', 'At the end of the pier, three mimes sit and watch the lanterns go up. Nobody invited them. Nobody ever invites mimes.');
    await st.cam(x, z, { dur: 1.2 });
    await st.say('hoshi', 'The Gloomstage went north-east, over Emberleaf. To Elderbough, and the Great Tree. She’ll want its heart for her finale.', { expr: 'worried' });
    await st.say('wendy', 'Then that’s where we’re going. After the festival. After the fireworks. After breakfast.', { expr: 'smug' });
    await st.say('hoshi', 'June’s lantern has five flames in it now. She’d be…{p}Hmph. Smoke in my eye. Go and dance, the lot of you.', { expr: 'happy' });
    await st.title('The Lantern Festival', 'Five flames in the lantern', 3.4);
    for (const q of lan) st.dropProp(q.key);
    st.dropProp('riser'); st.dropProp('lucky'); st.dropProp('strings');
  });
}

// ------------------------------------------------------------------ side quests
async function riddles(S) {
  const Q = [
    { q: 'The more you take, the more you leave behind. What am I?', a: ['Footsteps', 'Cake', 'Naps'], ok: 0,
      no: ['', 'Only if you eat it very badly.', '…That is deeply true. But no.'] },
    { q: 'What can you catch, but never throw?', a: ['A fish', 'A cold', 'The bus'], ok: 1,
      no: ['You can throw a fish. I have seen it done. At me.', '', 'The bus cannot be thrown. Or caught, in my experience.'] },
    { q: 'What gets wetter, the more it dries?', a: ['The sea', 'A towel', 'Brother Bao'], ok: 1,
      no: ['The sea does not dry. I have asked it.', '', 'Only after the washing-up.'] },
  ];
  let score = 0;
  for (const [i, R0] of Q.entries()) {
    await S.say('bao', i === 0 ? 'Riddle the first!' : i === 1 ? 'Riddle the second!' : 'Riddle the third, and last!', { expr: 'happy' });
    const k = await S.ask(R0.q, R0.a, 'bao');
    if (k === R0.ok) { score++; await S.say('bao', ['Correct! The dawn smiles on you.', 'Correct! You have the mind of a very clever kettle.', 'CORRECT! Oh, I shall have to think of harder ones.'][i], { expr: 'love', hop: true }); }
    else await S.say('bao', R0.no[k] || 'Hmm. The dawn frowns. Only a little.', { expr: 'neutral' });
  }
  S.flag('baoScore', score);
  if (score === 3) await S.say('bao', 'Three of three! My vow says I must now speak plainly for one whole sentence: thank you, that was the best morning I have had in a month.', { expr: 'love' });
  else if (score > 0) await S.say('bao', 'Some right, some riddled. That is the way of things. Take this, for trying.', { expr: 'happy' });
  else await S.say('bao', 'Not one! Magnificent. You have the mind of a very peaceful stone. Take this anyway.', { expr: 'happy' });
}

async function blancheOffer(S) {
  await S.say('blanche', 'Forty-seven kinds of white. I have catalogued them all. White number twelve: salt at noon. White number thirty: a gull, disapproving.', { expr: 'happy' });
  await S.say('blanche', 'But the mirror… the flats show me things in the reflection that aren’t there when I look up. Three of them. Plain as day, upside down.', { expr: 'worried' });
  await S.say('blanche', 'Would you find them for me? Stand where the reflection is, and reach in. Gently. Mirrors bruise.', { expr: 'neutral' });
}
async function blancheDone(S) {
  await S.say('blanche', 'A kite. A paper lantern. And… a rubber duck?{p}Of course. Things the fog swallowed, the mirror kept.', { expr: 'surprised' });
  await S.say('blanche', 'Everything that’s lost is somewhere. Usually upside down. I shall paint them back into the world.', { expr: 'love' });
}

// a reflection on the salt: a thing painted upside down on the mirror, pale and
// wavering — and nothing at all above it
function buildReflection(r3d, i) {
  const K = kit(r3d), g = new THREE.Group();
  const tex = K.tex('reflect' + i, 24, 24, (p) => {
    p.rect(0, 0, 24, 24, '#eef2f8');
    if (i === 0) { for (let y = 4; y < 16; y++) { const w = Math.min(y - 3, 16 - y) * 1.2; p.rect(12 - w, 23 - y, w * 2, 1, '#e87a7a'); } p.rect(11, 2, 2, 6, '#c8a080'); p.rect(8, 1, 1, 3, '#e8c060'); p.rect(15, 1, 1, 3, '#7ab0e8'); }
    else if (i === 1) { p.rect(8, 6, 8, 12, '#ff9a6a'); p.rect(9, 5, 6, 1, '#6a4a3a'); p.rect(9, 18, 6, 1, '#6a4a3a'); p.rect(11, 19, 2, 3, '#e8c060'); p.rect(11, 10, 2, 3, '#fff0c0'); }
    else { p.rect(6, 6, 12, 8, '#f4d040'); p.rect(12, 13, 6, 5, '#f4d040'); p.rect(17, 14, 3, 2, '#f09030'); p.rect(14, 15, 1, 1, '#241a2e'); }
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6).rotateX(-Math.PI / 2), tex.clone());
  m.material.transparent = true; m.material.opacity = 0.75; m.material.depthWrite = false;
  m.position.y = 0.04; m.renderOrder = 2;
  g.add(m);
  g.userData.anim = (tm) => { m.material.opacity = 0.5 + Math.sin(tm * 2 + i) * 0.2; m.scale.set(1 + Math.sin(tm * 3 + i) * 0.05, 1, 1 - Math.sin(tm * 3 + i) * 0.05); };
  return g;
}

// ------------------------------------------------------------------ the chapter
const TOWN = (p) => p.pos.x > 755 && p.pos.x < 820 && p.pos.z > 25 && p.pos.z < 80;

export const CH7 = {
  id: 7, title: 'The Dawnlands', lv: 31, zones: ['wide', 'whale', 'harbor', 'jade', 'salt'], opens: ['autumn', 'glow', 'elder'],
  // (Grandmother Bellows keeps an eye open while her back itches)
  update(S, dt) {
    S.mimeT = (S.mimeT || 0) - dt;
    if (S.mimeT <= 0) { S.mimeT = 0.5; ensureMimes(S); }
    const eye = eyeOf(S.P);
    if (!eye || (S.stage && S.stage.active)) return;
    const want = S.done('c7_cross') && !S.done('c7_whale') ? 1 : 0, o = eye.userData.open || 0;
    eye.userData.open = o + (want - o) * Math.min(1, dt * 2);
  },
  // (no dawn in the Dawnlands for a month: a grey sky over them all until the Dawn
  // Hearth is relit — and Lanternport, its lamps out, in the dark)
  gloom(S) {
    if (S.st.ch !== 7 || S.has('dawnLit')) return 0;
    const B = S.P.big;
    let g = 0;
    for (const p of S.P.players) {
      if (!p.connected && !S.solo) continue;
      const z = B && B.zoneAt ? B.zoneAt(p.pos.x, p.pos.z) : null, id = z && z.id;
      if (id !== 'harbor' && id !== 'jade' && id !== 'salt') continue;
      g = Math.max(g, TOWN(p) && S.done('c7_whale') && !S.done('c7_lamps') ? 0.82 : 0.5);
    }
    return g;
  },
  props: [
    { id: 'mastW', at: MAST_W, r: 1.1, build: (r3d) => buildMast(r3d), when: (S) => S.st.ch >= 7 },
    { id: 'mastE', at: MAST_E, r: 1.1, build: (r3d) => buildMast(r3d), when: (S) => S.done('c7_whale') },
    // (the Teacup moored at whichever mast she’s at)
    { id: 'teacupW', at: MAST_W, r: 0.1, build: (r3d) => { const g = new THREE.Group(), s = buildAirship(r3d); s.position.set(0, 1.3, -3.7); g.add(s); g.userData.anim = (tm) => { if (s.userData.anim) s.userData.anim(tm); }; return g; }, when: (S) => (S.st.ch >= 7 && !S.done('c7_cross')) || (S.done('c7_whale') && S.st.f.teacupAt === 'west') },
    { id: 'teacupE', at: MAST_E, r: 0.1, build: (r3d) => { const g = new THREE.Group(), s = buildAirship(r3d); s.position.set(0, 1.3, -3.7); g.add(s); g.userData.anim = (tm) => { if (s.userData.anim) s.userData.anim(tm); }; return g; }, when: (S) => S.done('c7_whale') && (S.st.f.teacupAt || 'east') === 'east' },
    // (Lanternport’s lamps, once relit: out while the Umbral Spotlight passes)
    ...LAMPS.map(([x, z], i) => ({ id: 'lpLamp' + i, at: [x, z], r: 0.2, build: (r3d, S) => { const g = buildStreetLamp(r3d), a0 = g.userData.anim; let was = null; g.userData.anim = (tm) => { const on = !lampOut(S, i); if (on !== was) { was = on; g.userData.setLit(on); } a0(tm + i, on); }; return g; }, when: (S) => S.done('c7_lamps') && !S.active('c7_lamplight') })),
    // the one lamp Hoshi never let go out
    { id: 'hallLamp', at: HALL_LAMP, r: 0.2, build: (r3d) => { const g = buildStreetLamp(r3d); g.userData.setLit(true); const a0 = g.userData.anim; g.userData.anim = (tm) => a0(tm, true); return g; }, when: (S) => S.st.ch >= 7 },
    // Blanche’s easel
    { id: 'easel', at: [BLANCHE[0] + 1.3, BLANCHE[1] - 0.4], r: 0.4, build: (r3d) => { const K = kit(r3d), g = new THREE.Group(); for (const s of [-1, 1]) K.beam(g, K.c('#8a6a4a'), s * 0.35, 0, 0.2, s * 0.12, 1.6, 0, 0.06); K.beam(g, K.c('#8a6a4a'), 0, 0, -0.35, 0, 1.5, 0, 0.06); const c = K.put(g, K.box(0.9, 0.7, 0.05), K.tex('saltcanvas', 18, 14, (p) => { p.rect(0, 0, 18, 14, '#f4f4f8'); p.rect(0, 8, 18, 6, '#e8eef8'); p.rect(2, 4, 14, 1, '#c8d4e8'); p.rect(12, 2, 3, 3, '#f8e8a8'); }), 0, 1.25, 0.05); c.rotation.x = -0.15; return g; }, when: (S) => S.st.ch >= 7 },
  ],
  npcs: [
    { id: 'wendy', at: (S) => (S.done('c7_whale') ? WENDY_E : WENDY_W), face: { x: -0.3, z: 1 }, when: (S) => S.st.ch >= 7,
      lines: ['She runs on tea. Strong. Two sugars. Tea: full!', 'Lanternport to Lighthouse Isle, whenever you like. Just ring the bell on the mast.'] },
    { id: 'bess', at: BESS, face: { x: -0.4, z: 1 }, when: (S) => S.done('c7_cross'),
      lines: ['Rooms: two. Beds: three. Don’t ask about the third bed.', 'Grandmother Bellows likes a song at bedtime. Sea shanties. Never whale songs — she says they’re all gossip.'] },
    { id: 'hoshi', at: HOSHI, face: { x: -0.3, z: 1 }, when: (S) => S.done('c7_lamps'),
      lines: ['The lamps will hold. Go.', 'June used to say the dark is only a room nobody has lit yet.'] },
    { id: 'mei', at: [785, 55], face: { x: 0.3, z: 1 }, when: (S) => S.done('c7_lamps'),
      lines: ['I’m staying up for the WHOLE festival. Even the boring speeches.', 'Old Hoshi says lamps are like people: they only need someone to believe they’ll light.'] },
    { id: 'tamsin', at: [790.5, 57.5], face: { x: -0.4, z: 1 }, when: (S) => S.done('c7_lamps'),
      lines: ['Thirty days in the dark and I still burnt the fish.', 'Fresh fish! Well. Fish.'] },
    { id: 'sen', at: ABBOT, face: { x: 0.2, z: 1 }, when: (S) => S.st.ch >= 7,
      lines: ['The Pagoda has stood for three hundred years. It can stand a little longer. You, however, should eat something.', 'An old proverb: a kite does not fear the wind. It fears the tree.'] },
    { id: 'bao', at: BAO, face: { x: -0.2, z: 1 }, when: (S) => S.done('c7_mimes'),
      lines: ['(Brother Bao bows. Somehow, the bow is also a riddle.)', 'What walks on four legs in the morning… no, wait. That one is taken.'] },
    { id: 'blanche', at: BLANCHE, face: { x: -0.5, z: 1 }, when: (S) => S.done('c7_lamps'),
      lines: ['White number thirty-one: the white of an egg you didn’t mean to drop.', 'Look down, not up. The mirror is more honest than the sky.'] },
  ],
  quests: {
    c7_cross: {
      title: 'The Crossing', auto: true, lv: 28,
      steps: [
        { do: 'talk', npc: 'wendy', text: 'Meet Captain Wendy at the new mooring mast on Lighthouse Isle', run: wendyMast },
        { do: 'scene', text: '…', run: crossing },
      ],
    },
    c7_whale: {
      title: 'The Itch', auto: true, after: 'c7_cross', lv: 29,
      steps: [
        { do: 'whack', text: 'Stomp the gloom barnacles on Grandmother Bellows’s back (land a jump on them!)', at: WHACK, r: 8, holes: HOLES, n: 14, per: 4, time: 45, up: 1.5, every: 0.75, model: buildBarnacle, go: 'Stomp!' },
        { do: 'scene', text: '…', run: spout },
      ],
    },
    c7_lamps: {
      title: 'Lanternport in the Dark', auto: true, after: 'c7_whale', lv: 29,
      steps: [
        { do: 'lamps', text: 'Relight Lanternport’s street lamps, from the quay up to the hall', lamps: LAMPS, start: LP_LAND, light: 11, glow: 3.8, moths: { every: 4.5, max: 2, level: 29 }, model: buildStreetLamp },
        { do: 'scene', text: '…', run: townWakes },
      ],
    },
    c7_hoshi: {
      title: 'The Last Lamplighter', auto: true, after: 'c7_lamps', lv: 30,
      steps: [
        { do: 'talk', npc: 'hoshi', text: 'Talk to Old Hoshi, at the top of the town', run: hoshiTalk },
      ],
    },
    c7_mimes: {
      title: 'The Mime Troupe', auto: true, after: 'c7_hoshi', lv: 30,
      steps: [
        { do: 'go', text: 'Take the Pilgrims’ Way north towards the Dawn Monastery', at: MIMES, r: 7, run: mimesMeet },
        { do: 'kill', tag: 'mimes', n: 3, text: 'Beat the Mime Troupe (a friend pops a box; jump to slip the rope)', at: MIMES, r: 14, target: () => MIMES },
        { do: 'scene', text: '…', run: mimesBeaten },
      ],
    },
    c7_kites: {
      title: 'The Dawn Kites', auto: true, after: 'c7_mimes', lv: 31,
      steps: [
        { do: 'talk', npc: 'sen', text: 'Ask at the Dawn Monastery about the sealed Pagoda', run: abbotTalk },
        { do: 'kite', text: 'Fly your Dawn Kite above the Murk (hold to reel in, let go to let out)', at: KITES, r: 8, climb: 0.075, gust: 1.1, model: buildKite },
        { do: 'scene', text: '…', run: dawnColumn },
      ],
    },
    c7_pagoda: {
      title: 'The Lantern Pagoda', auto: true, after: 'c7_kites', lv: 32,
      steps: [
        { do: 'go', text: 'Enter the Lantern Pagoda', at: PAGODA_DOOR, r: 2.4, run: async (S) => { if (S.P.dungeons) await S.P.dungeons.enter('lanternpagoda'); else S.flag('dawnLit'); } },
        { do: 'dungeon', id: 'lanternpagoda', text: 'Climb the Lantern Pagoda — and bring Old Lucky back' },
      ],
    },
    c7_festival: {
      title: 'The Lantern Festival', auto: true, after: 'c7_pagoda', lv: 33,
      steps: [
        { do: 'go', text: 'Back to Lanternport for the Lantern Festival', at: FESTIVAL, r: 4, run: festival },
      ],
      next: 8,
    },
    // ---- side quests
    c7_riddles: {
      title: 'Brother Bao’s Vow', kind: 'side', giver: 'bao', after: 'c7_mimes', lv: 31, dust: 25,
      offer: async (S) => {
        await S.say('bao', 'Halt, traveller! I have taken a vow of riddles. I may say nothing that is not a riddle. This is very inconvenient at breakfast.', { expr: 'happy' });
        await S.say('bao', 'Answer three, and I shall… also be very pleased. Are you ready? You are ready.', { expr: 'smug' });
      },
      steps: [
        { do: 'talk', npc: 'bao', text: 'Answer Brother Bao’s three riddles', run: riddles },
      ],
    },
    // ---- a mini-game, to play again and again (World v7 M13): the fog blows the lamps out
    c7_lamplight: {
      title: 'Lamplighting', kind: 'side', repeat: true, giver: 'hoshi', after: 'c7_festival', lv: 32, dust: 20,
      offer: async (S) => {
        await S.say('hoshi', 'Every few nights the fog creeps back up the quay and blows my lamps out. Old habits. Its, not mine.', { expr: 'worried' });
        await S.say('hoshi', 'Relight them all — quay to hall — before your lantern gutters. Mind the moths. The harbour keeps score, you know. The harbour always keeps score.', { expr: 'smug' });
      },
      steps: [
        { do: 'lamps', text: 'Relight Lanternport’s lamps before the fog wins', lamps: LAMPS, start: LP_LAND, light: 10, glow: 3.8, moths: { every: 4, max: 3, level: 31 }, model: buildStreetLamp },
        { do: 'talk', npc: 'hoshi', text: 'Tell Hoshi the lamps are lit', run: async (S) => {
          if (S.plays('c7_lamplight')) await S.say('hoshi', 'Lit again, and quicker. The fog is starting to take it personally.', { expr: 'happy' });
          else await S.say('hoshi', 'Look at that. Every lamp on the quay, and not a moth singed. My old teacher would have given you a biscuit. I’ll give you two.', { expr: 'love' });
        } },
      ],
    },
    c7_mirror: {
      title: 'The Salt Painter’s Reflections', kind: 'side', giver: 'blanche', after: 'c7_lamps', lv: 32, dust: 25,
      offer: blancheOffer,
      steps: [
        { do: 'collect', text: 'Find the three things that exist only in the Saltmirror’s reflection', item: 'Reflection', n: 3, spots: REFLECT, model: buildReflection, verb: 'Reach in', hint: 'Something shows in the mirror — but nothing above it' },
        { do: 'talk', npc: 'blanche', text: 'Bring them to Blanche at the Saltworks', run: blancheDone },
      ],
    },
  },
};
void audio; void buildFlameJar;
