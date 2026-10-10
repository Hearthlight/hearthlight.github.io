// Chapter 6 — Fire & Fins. Emberpeak, the Whirlpool Straits and Dino Isle, levels
// 25–30. It opens with a crash: the Gloomstage’s spotlights find the Dauntless
// Teacup over the sea, gloom flak tears its envelope, and down it goes into Dino
// Isle’s jungle. Professor Ammonite and a triceratops tow the gondola out of the
// tar; Old Barnaby’s Straits Regatta, against the Understudies in a swan pedalo
// (they were not invited to her Debut); Granny Mochi’s Hot Springs and the old
// smiths’ Forge Gate; the Forge Heart (vents) and the Duchess’s Debut — beaten, she
// flees east over the sea, but the jar with Croakmire’s flame falls from her stage:
// the marsh warms again, and the Wide Sea lies open.

import '../cast.js';
import { buildTornEnvelope, buildSwanPedalo, buildFlameJar, buildAirship, buildShowStage } from '../../models/v7/props7.js';
import { buildGloomstage, BALCONY } from '../../models/v7/gloomstage.js';
import { buildMount, animMount } from '../../models/mounts3d.js';
import { FORGEHEART, FORGE_DOOR } from '../dungeons/forgeheart.js';
import { kit, THREE } from '../../models/v7/kit.js';
import { audio } from '../../engine/audio.js';
import { t } from '../../i18n.js';

// the chapter’s places
const SKY = [400, 118];                                      // over the sea, flying east towards Emberpeak
const CRASH = [402, 205.6];                                  // where the heroes tumble out
const GONDOLA = [397, 209.4];                                // stuck in the tar pit
const ENVELOPE = [402.5, 213];
const WENDY6 = [400.4, 206.8];
const AMMONITE = [385.6, 196];
const LIGHTHOUSE = [469, 215.6];                             // Barnaby, on Lighthouse Isle
// (the course stays in the straits: south of z ≈ 245 the sea is the Wide Sea, shut until chapter 7)
const REGATTA = [[466.5, 221.5], [446, 236], [462, 238], [481, 236], [470, 222.5]];   // start, three buoys, finish
const SPRINGS = [406, 66.5];                                 // Granny Mochi’s onsen
const POOL = [405.05, 70.1];                                 // the bathhouse’s steaming pool
const GLOOMSTAGE = [452, 50];                                // moored over the crater
const TYRANT = [430, 200], TOOTH = [430.4, 202.4], TIPTOE = [422.5, 195.5];   // (back to the beach west of his clearing: dry)
const BOTTLES = [
  [[450, 228], [440, 240], [452, 245], [462, 233]],
  [[480, 228], [492, 232], [484, 238], [474, 236]],
  [[456, 200], [446, 206], [452, 219], [462, 210]],
];
const KING = [302, 45.6], THRONE = [302, 43.4];

// ------------------------------------------------------------------ the crash
async function flak(S) {
  await S.scene(async (st) => {
    const P = S.P, [x, z] = SKY;
    const hide = (on) => { for (const p of P.players) { p.away = on; p.hidden = on; if (p.actor) p.actor.hidden = on; } };
    hide(true);
    const ship = buildAirship(P.r3d);
    st.prop('teacup', ship, x - 10, 6, z + 4);
    const stage = buildGloomstage(P.r3d);
    stage.scale.setScalar(0.7);
    st.prop('gloomstage', stage, x + 16, 10, z - 16);
    await st.cam(x - 6, z - 2, { dur: 0, ppu: st.basePpu() });
    st.move('teacup', { x: x + 6, z: z - 2 }, 9, { ease: 'lin' });
    await st.cam(x + 4, z - 8, { dur: 6 });
    await st.say('wendy', 'Emberpeak, dead ahead! And on the crater: the Duchess’s flying theatre, with {key}the marsh’s flame{/}.', { expr: 'happy' });
    await st.say('narrator', 'A spotlight swings round… and stops. Right on the Teacup.');
    // (the beam: a pale cone from the ship’s footlights to the Teacup)
    {
      const tp0 = st.propOf('teacup'), from = new THREE.Vector3(x + 16, 12, z - 13), to = tp0 ? tp0.position.clone().add(new THREE.Vector3(0, 3, 0)) : new THREE.Vector3(x, 6, z);
      const L = from.distanceTo(to), beam = new THREE.Mesh(new THREE.ConeGeometry(2.2, L, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff4c8, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.copy(from).lerp(to, 0.5);
      beam.lookAt(to); beam.rotateX(Math.PI / 2);
      st.prop('beam', beam, beam.position.x, beam.position.y, beam.position.z);
    }
    st.flash('#fff4c8', 0.4);
    st.sfx('charge', { volume: 0.6 });
    await st.say('wendy', 'Uh-oh. Hold on to your hats! And your lunch!', { expr: 'shock', shake: 1 });
    // gloom flak: purple bursts round the envelope
    for (let k = 0; k < 9; k++) {
      const tp = st.propOf('teacup');
      if (tp) for (let j = 0; j < 3; j++) st.fx('smoke', tp.position.x + (Math.random() - 0.5) * 5, 6 + Math.random() * 5, tp.position.z + (Math.random() - 0.5) * 4, 8, { color: j ? '#8a5ab8' : '#e8d0ff' });
      st.sfx('boom', { volume: 0.5, pitch: 4 - k });
      st.flash('#a86ae0', 0.12);
      st.shake(0.3);
      await st.wait(0.22);
    }
    st.mark('flak');
    await st.say('narrator', '{shake}RIIIIP!{/} The balloon tears open. The Teacup falls towards {key}Dino Isle{/}.');
    // down, down, into the jungle
    const tp = st.propOf('teacup');
    await st.fade(1, 0.6);
    st.dropProp('teacup'); st.dropProp('gloomstage'); st.dropProp('beam');
    P.gatherAt(CRASH[0], CRASH[1], 1.2);
    hide(false);
    st.prop('envelope', buildTornEnvelope(P.r3d), ENVELOPE[0], 0, ENVELOPE[1]);
    st.actor('wendy', WENDY6[0], WENDY6[1], { face: { x: -0.4, z: 1 } });
    await st.cam(CRASH[0] - 1, CRASH[1] + 1, { dur: 0, ppu: st.basePpu() });
    st.sfx('thud', { volume: 1 });
    st.shake(1.2);
    for (const p of P.players) P.world.fx.emit('dust', p.pos.x, 0.4, p.pos.z, 10, { color: '#8a6a4a' });
    await st.fade(0, 0.8);
    st.heroesEmote('star', 2);
    void tp;
    await st.say('wendy', 'Everybody in one piece? Good. The Teacup isn’t.', { expr: 'sad' });
    await st.title('Fire & Fins', 'Chapter 6');
    st.dropProp('envelope');
  });
}

async function wendyCrash(S) {
  await S.say('wendy', 'I can sew the balloon up. But the gondola is sinking in the tar!', { expr: 'neutral' });
  await S.say('wendy', 'Quick! Ask {key}the scientists{/} at {key}Fern Landing{/}, just up the path, for help.', { expr: 'happy' });
}

// ------------------------------------------------------------------ Dino Isle
async function ammoniteTalk(S) {
  await S.say('ammonite', 'A teacup stuck in my tar pit? Oh, this is utterly Cretaceous!', { expr: 'love', hop: true });
  await S.say('ammonite', 'To pull it out, you need {key}a triceratops{/}. They are mad about ferns!', { expr: 'smug' });
  await S.say('ammonite', 'Offer one {key}a fern{/}, climb on its back, and ride to {key}the gondola{/}.', { expr: 'neutral' });
}

const riding = (S, kind, at, r) => S.P.players.some((p) => (p.connected || S.solo) && p.mount && (p.mount.kind === kind || (p.mount.D && p.mount.D.id === kind)) && Math.hypot(p.pos.x - at[0], p.pos.z - at[1]) < r);

async function towOut(S) {
  await S.scene(async (st) => {
    const P = S.P, [gx, gz] = GONDOLA;
    await st.cam(gx + 1, gz, { dur: 0.6, ppu: st.basePpu() });
    const cup = new THREE.Group();
    const K = kit(P.r3d);
    K.put(cup, K.cyl(1.1, 0.8, 1, 16), K.c('#fbf6ec'), 0, 0.5, 0);
    K.put(cup, K.cyl(1.35, 1.25, 0.12, 16), K.c('#fbf6ec'), 0, 0, 0);
    st.prop('cup', cup, gx, -0.7, gz);
    st.sfx('chain', { volume: 0.6 });
    st.shake(0.5);
    await st.move('cup', { x: gx + 3.5, y: 0, z: gz - 2.2 }, 1.6);
    st.sfx('splash', { volume: 0.6, pitch: -8 });
    for (let k = 0; k < 10; k++) st.fx('dust', gx + Math.random() * 2, 0.3, gz + Math.random(), 1, { color: '#2a2024' });
    st.mark('towed');
    st.actor('ammonite', gx + 5.5, gz - 3.2, { face: { x: -1, z: 0.3 } });
    await st.say('ammonite', 'Magnificent! I shall write a paper: « The Triceratops and the Teacup ».', { expr: 'love' });
    st.actor('wendy', gx + 4, gz - 4.2, { face: { x: -0.5, z: 1 } });
    await st.say('wendy', 'Saved! Now we need a propeller. {key}Old Barnaby{/} has spare ones at {key}the Straits Light{/}, to the east.', { expr: 'happy' });
    st.dropProp('cup');
  });
}

// ------------------------------------------------------------------ the Straits
async function barnabyTalk(S) {
  await S.say('barnaby', 'A propeller? Aye. It’s the first prize of my boat race: {key}the Straits Regatta{/}.', { expr: 'smug' });
  await S.say('barnaby', 'Only one other boat entered: a swan, with three sulky passengers. Forecast: humiliation.', { expr: 'neutral' });
  await S.say('barnaby', 'Take {key}the sailboat{/} at the jetty: round {key}the three buoys{/}, and back here before the swan.', { expr: 'happy' });
}

async function understudiesUninvited(S) {
  await S.scene(async (st) => {
    const P = S.P, [x, z] = REGATTA[4];
    await st.cam(x, z - 1, { dur: 0.6, ppu: st.basePpu() });
    const swan = buildSwanPedalo(P.r3d);
    st.prop('swan', swan, x + 4, 0, z + 2.6);
    for (const [i, id] of ['minnow', 'fidget', 'brick'].entries()) { const a = st.actor(id, x + 3.2 + i * 0.8, z + 2.6, { face: { x: -1, z: -0.2 } }); if (a && a.n) a.n.seatY = 0.55; }
    await st.say('barnaby', 'Winners: the lantern folk. Losers: the Understudies. The {key}propeller{/} is yours.', { expr: 'smug' });
    await st.say('minnow', 'We weren’t even TRYING! We’re saving our strength for the Duchess’s Debut.', { expr: 'sad' });
    await st.say('fidget', 'Minnow… She didn’t invite us. Understudies don’t get tickets.', { expr: 'cry' });
    await st.say('brick', 'Brick practised clapping. For weeks.', { expr: 'sad' });
    st.mark('uninvited');
    await st.say('narrator', 'Nobody says a word. The swan creaks gently on the water.');
    await st.say('minnow', 'Well, we don’t CARE! One day we’ll have our own debut. With snacks.', { expr: 'angry' });
    st.sfx('water', { volume: 0.5 });
    st.move('swan', { x: x + 30, z: z + 14 }, 6, { ease: 'lin' });
    for (const id of ['minnow', 'fidget', 'brick']) st.walk(id, x + 30, z + 14, { speed: 5 });
    await st.wait(1.4);
    for (const id of ['minnow', 'fidget', 'brick']) st.hide(id);
    await st.say('barnaby', 'Her show is on Emberpeak, to the north. Ask {key}Granny Mochi{/}, at {key}the Hot Springs{/}, for the way into the crater.', { expr: 'happy' });
    st.dropProp('swan');
  });
}

// ------------------------------------------------------------------ Emberpeak
// (a soak first: the heroes sit round the pool’s rim in the steam, and far up the
// slope the Duchess practises her scales)
async function mochiTalk(S) {
  const P = S.P, [px, pz] = POOL;
  await S.scene(async (st) => {
    await st.cam(px - 0.6, pz - 0.8, { dur: 0.8 });
    await st.say('mochi', 'Oh, hello, dears. Sit. Soak. The volcano will still be angry after your bath.', { expr: 'happy', speed: 0.8 });
    await st.fade(1, 0.35);
    // (everybody in the tub: up to nine seats, the middle first)
    const hs = st.heroes(), seats = [[0, 0], [-0.75, 0], [0.75, 0], [0, 0.8], [-0.75, 0.8], [0.75, 0.8], [0, -0.8], [-0.75, -0.8], [0.75, -0.8]];
    hs.forEach((p, i) => {
      const [dx, dz] = seats[i % seats.length], x = px + dx, z = pz + dz;
      if (P.solo) P.gatherAt(x, z); else p.actor.pos = { x, z };
      p.actor.sitting = true; p.actor.sink = -0.26; p.actor.face(x, z + 1);
    });
    st.face('mochi', px, pz);
    await st.cam(px, pz - 0.4, { dur: 0, ppu: st.basePpu() * 1.5 });
    await st.fade(0, 0.5);
    let steam = true;
    (async () => { for (let k = 0; steam && !st.skipping && k < 400; k++) { st.fx('smoke', px - 1 + Math.random() * 2, 0.3, pz - 1.2 + Math.random() * 2.4, 1); await st.wait(0.3); } })();
    st.sfx('water', { volume: 0.45 });
    st.heroesEmote('heart', 2.2);
    st.mark('soak');
    await st.wait(1.2);
    // (up the slope, from the rim of the crater)
    for (let k = 0; k < 5; k++) st.fx('note', px + 5 + k * 0.5, 2.5 + k * 0.4, pz - 4 - k * 0.3, 1);
    st.sfx('tone', { volume: 0.35, pitch: 12 });
    await st.say('narrator', 'From the crater rim, a shrill voice drifts down: “Mi-mi-mi-MIIII!”');
    st.heroesEmote('dots', 1.6);
    await st.say('mochi', 'That’s the Duchess. Scales at dawn, scales at noon, scales in my SOUP.', { expr: 'worried', speed: 0.8 });
    await st.say('mochi', 'To get into the crater, take the old smiths’ door: {key}the Forge Gate{/}, up {key}the east path{/}.', { expr: 'neutral', speed: 0.8 });
    steam = false;
    await st.fade(1, 0.35);
    for (const p of hs) { p.actor.sitting = false; p.actor.sink = 0; }
    if (P.solo) P.gatherAt(px - 2.4, pz + 2.4); else hs.forEach((p, i) => { p.actor.pos = { x: px - 2.4 + (i % 4) * 0.8, z: pz + 2.4 + Math.floor(i / 4) * 0.8 }; });
    await st.fade(0, 0.4);
  });
}

// ------------------------------------------------------------------ the Forge Heart
const R = (id) => FORGEHEART.rooms.find((r) => r.id === id);
const mid = (d, r, dz = 0) => ({ x: d.ox + r.x + r.w / 2, z: d.oz + r.z + r.h / 2 + dz });
const pose = (e) => { e.spawnT = 0; e.obj.scale.setScalar(1); e.obj.position.set(e.x, e.y, e.z); if (e.shadow) e.shadow.position.set(e.x, 0.02, e.z); };

// Crumble’s Snuffbot Mk II, among the vents
R('snuffbot').run = async (S, d, r) => {
  const C = S.P.combat, c = mid(d, r);
  if (!C) return;
  const e = C.spawn('snuffbot', c.x, c.z - 3, { level: d.def.lv[0] + 1, quiet: true });
  e.saga = true; e.home = { x: c.x, z: c.z }; e.state = 'roar'; e.timer = 99; e.def = { ...e.def, title: 'Crumble’s Snuffbot Mk II' };
  r.boss = e; pose(e);
  C.bounds = { x: c.x, z: c.z, rx: r.w / 2 - 1.5, rz: r.h / 2 - 1 };
  await S.scene(async (st) => {
    await st.cam(c.x, c.z - 2, { dur: 0.8 });
    st.sfx('slam', { volume: 0.7 });
    await st.say('crumble', 'Ta-daaa! The Snuffbot MARK TWO! NO weaknesses this time!', { expr: 'smug' });
    await st.say('crumble', '…Why is the floor breathing? Nobody told me the floor BREATHES.', { expr: 'worried' });
    st.mark('snuffbot2');
    await st.title('Snuffbot Mk II', 'Crumble’s finest work (so far)', 2.2);
  });
  e.state = 'chase'; e.timer = 1;
  S.toast('Lure it onto a vent when it blows!', null, '#ffb070');
};
R('snuffbot').tick = (S, d, r) => {
  const e = r.boss;
  if (!e || r.done || e.alive) return;
  r.done = true;
  const C = S.P.combat;
  if (C) { C.bounds = null; for (const q of C.enemies) if (q.alive && q.summoner === e) { q.alive = false; q.fading = 0; q.remove(); } }
  (async () => {
    await S.P.wait(1);
    await S.say('crumble', 'It was… only a prototype! I’ll be in the dressing room.', { expr: 'cry' });
    const G = d.gate('g6');
    if (G) d.setGate(G, true);
  })();
};

// the Debut: her stage in the crater, a hen in the wings
function buildHenWalker(r3d) {
  const rig = buildMount(r3d, 'hen', { variant: 0, wild: true });
  const g = rig.root;
  g.scale.setScalar(0.8);
  g.userData.rig = rig;
  return g;
}
R('debut').run = async (S, d, r) => {
  const P = S.P, C = P.combat, c = mid(d, r);
  if (!C) return;
  // the stage, the ship above it, the footlights
  const K = kit(P.r3d), stage = buildShowStage(P.r3d);
  stage.position.set(c.x - d.ox, 0, r.z + 3.5);
  d.root.add(stage);
  const ship = buildGloomstage(P.r3d);
  ship.scale.setScalar(0.7);
  ship.position.set(c.x - d.ox, 13, r.z - 2);
  d.root.add(ship);
  r.ship = ship; r.stage = stage;
  void K;
  const e = C.spawn('diva', c.x, d.oz + r.z + 8.5, { level: d.def.lv[1] + 1, quiet: true });
  e.saga = true; e.home = { x: c.x, z: c.z - 3 }; e.state = 'roar'; e.timer = 99;
  r.boss = e; pose(e);
  C.bounds = { x: c.x, z: c.z, rx: r.w / 2 - 1.5, rz: r.h / 2 - 1 };
  // (a hen in the wings: out it comes at the start and at each act)
  r.hens = 0;
  const sendHen = () => {
    if (r.hen || !e.alive) return;
    const obj = buildHenWalker(P.r3d), wx = r.x + (r.hens % 2 ? r.w - 2 : 2), wz = r.z + 6;
    obj.position.set(wx, 0, wz); d.root.add(obj);
    r.hen = { obj, x: wx, z: wz, dx: 0, dz: 1, t: 0 };
    r.hens++;
    P.toast(t('A hen on the stage! It follows you: lead it to the Duchess.'), '#fff3c4');
    audio.sfx('cluck', { volume: 0.7 });
  };
  e.onAct = () => sendHen();
  e.onShoo = () => { if (r.hen) r.hen.flee = true; };
  r.sendHen = sendHen;
  await S.scene(async (st) => {
    await st.cam(c.x, c.z - 4, { dur: 1 });
    st.music('villain');
    st.sfx('fanfare', { volume: 0.7 });
    await st.say('narrator', 'Footlights. A hush. One spotlight — and there she is at last: {key}the Duchess{/}, on her own stage.');
    st.mark('debut');
    await st.say('duchess', 'Welcome to the night of nights: my DEBUT!{p} …Where is my audience? Only YOU, with that LANTERN?', { expr: 'angry' });
    await st.say('duchess', 'No matter. You shall sit in the dark and watch ME, for ever. Curtain UP!', { expr: 'smug' });
    await st.title('Duchess Gloria Gloomsworth', 'in her Debut', 2.6);
  });
  e.state = 'chase'; e.timer = 1.5;
  sendHen();
};
R('debut').tick = (S, d, r, dt) => {
  const e = r.boss, P = S.P, C = P.combat;
  if (r.ship) r.ship.position.y = 13 + Math.sin(S.t * 0.8) * 0.3;
  // the hen: it follows the nearest lantern; led near her, she freezes
  const H = r.hen;
  if (H) {
    H.t += dt;
    let tx = null, tz = null;
    if (H.flee) { tx = r.x - 4; tz = r.z + 4; }
    else {
      let best = null, bd = 6.5;
      for (const p of P.players) { if (!(p.connected || S.solo) || !p.fighter || p.fighter.down) continue; const dd = Math.hypot(p.pos.x - d.ox - H.x, p.pos.z - d.oz - H.z); if (dd < bd) { bd = dd; best = p; } }
      if (best && bd > 1.2) { tx = best.pos.x - d.ox; tz = best.pos.z - d.oz; }
    }
    let moving = false;
    if (tx !== null) { const dx = tx - H.x, dz = tz - H.z, l = Math.hypot(dx, dz); if (l > 0.1) { const k = Math.min(l, dt * (H.flee ? 5 : 2.8)); H.x += (dx / l) * k; H.z += (dz / l) * k; H.dx = dx / l; H.dz = dz / l; moving = true; } }
    H.obj.position.set(H.x, 0, H.z);
    H.obj.rotation.y = Math.atan2(H.dx, H.dz);
    if (H.obj.userData.rig) animMount(H.obj.userData.rig, dt, { speed: moving ? (H.flee ? 5 : 2.8) : 0 });
    if (H.flee && H.x < r.x - 2) { d.root.remove(H.obj); r.hen = null; }
    else if (!H.flee && e && e.alive && !(e.fright > 0) && Math.hypot(e.x - d.ox - H.x, e.z - d.oz - H.z) < 3.6) {
      e.fright = 6; e.state = 'fright';
      C.bubble(e, t('…A HEN. Not again. Not tonight…'), 2.2);
      C.popText(e.x, e.def.h + 1, e.z, t('Frozen with fright!'), '#fff3c4', true);
      audio.sfx('cluck', { volume: 0.9, pitch: 4 });
    }
  }
  if (!e || r.done || e.alive) return;
  r.done = true;
  // (she doesn’t fade away: she’s still there to be hauled up)
  e.fading = 99; e.hold = true;
  if (C) { C.bounds = null; for (const q of C.enemies) if (q.alive && q.summoner === e) { q.alive = false; q.fading = 0; q.remove(); } }
  if (r.hen) { d.root.remove(r.hen.obj); r.hen = null; }
  // she doesn’t fall: she flees — and the jar with the marsh’s flame falls instead
  (async () => {
    await S.P.wait(0.8);
    await S.scene(async (st) => {
      const c = mid(d, r);
      await st.cam(c.x, c.z - 3, { dur: 0.7 });
      await st.say('duchess', 'This… is not… the END.{p} This is merely… the INTERVAL!', { expr: 'angry', shake: 1 });
      st.sfx('whoosh', { volume: 0.8, pitch: -10 });
      st.flash('#2a1640', 0.4);
      // (up she goes, and the ship lifts away east)
      await st.say('narrator', 'A rope drops from the Gloomstage. She grabs it, and up she goes, still singing.');
      const ship = r.ship;
      // (a rope from the hull; up she goes, still singing; then the ship lifts away east)
      const rope = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1, 0.06), new THREE.MeshBasicMaterial({ color: 0xd9c090 }));
      d.root.add(rope);
      for (let k = 0; k < 24; k++) {
        if (e.obj) { e.obj.position.y += 0.45; const top = (ship ? ship.position.y : 13) - 1, bot = e.obj.position.y + 3.2; rope.scale.y = Math.max(0.1, top - bot); rope.position.set(e.x - d.ox, (top + bot) / 2, e.z - d.oz); }
        if (k % 6 === 0) st.fx('note', e.x, (e.obj ? e.obj.position.y : 3) + 3, e.z, 2);
        await st.wait(0.06);
      }
      d.root.remove(rope);
      if (e.obj) e.obj.visible = false;
      e.hold = false; e.fading = 0; if (e.remove) e.remove();
      if (ship) for (let k = 0; k < 30; k++) { ship.position.y += 0.4; ship.position.x += 0.8; await st.wait(0.05); }
      const jar = buildFlameJar(S.P.r3d);
      st.prop('jar', jar, c.x, 8, c.z - 2);
      st.sfx('whoosh', { volume: 0.6, pitch: 8 });
      await st.move('jar', { y: 0.2 }, 1.1);
      st.sfx('chime', { volume: 0.9 });
      st.flash('#ffe8c8', 0.4);
      st.mark('jar');
      await st.say('narrator', 'Her flying theatre heads {key}east{/}, over the Wide Sea, with all her stolen flames. All but one!');
      S.flag('jar');
      await st.say('narrator', 'A jar fell from her stage: inside burns {key}the marsh’s flame{/}. Carry it home to {key}King Croakington{/}!');
      st.dropProp('jar');
      st.music(null);
    });
    await d.D.exit({ done: true });
  })();
};

// ------------------------------------------------------------------ the marsh warms again
async function marshHome(S) {
  await S.scene(async (st) => {
    const P = S.P;
    P.gatherAt(KING[0] - 1, KING[1] + 2.6, 1.3);
    st.actor('croakington', KING[0], KING[1], { face: { x: -0.2, z: 1 } });
    await st.cam(KING[0], KING[1] + 0.5, { dur: 0, ppu: st.basePpu() });
    await st.say('croakington', 'Is that… Our flame? In a JAR? Like a common firefly?', { expr: 'shock' });
    const jar = buildFlameJar(P.r3d);
    st.prop('jar', jar, THRONE[0], 1.4, THRONE[1] + 0.6);
    st.sfx('chime', { volume: 0.9 });
    await st.move('jar', { y: 0.2, z: THRONE[1] }, 1);
    st.dropProp('jar');
    st.flash('#ffe8c8', 0.6);
    st.shake(0.5);
    if (st.vfx) { st.vfx.pillar(THRONE[0], THRONE[1], { r: 1.8, h: 8, color: '#ffc890', life: 1.6 }); st.vfx.shockwave(THRONE[0], THRONE[1], { r: 12, color: '#ffd8a8', life: 1.4, wall: 1.2 }); }
    S.flag('marshBack');
    if (!S.st.lit.includes('marsh')) S.st.lit.push('marsh');
    S.save();
    await st.lights(0, 0, 1.4);
    st.mark('marshBack');
    await st.say('croakington', '{big}RIBBIT!{/}{p} No sneeze! The marsh is warm again, little heroes.', { expr: 'love', hop: true });
    await st.say('narrator', 'In the lantern, the marsh’s flame catches again.');
    // Wendy, with a patched envelope and a new propeller
    const ship = buildAirship(P.r3d);
    st.prop('teacup', ship, KING[0] + 18, 10, KING[1] - 6);
    st.sfx('whoosh', { volume: 0.6 });
    await st.move('teacup', { x: KING[0] + 7, y: 1.6, z: KING[1] + 1 }, 2.6);
    st.actor('wendy', KING[0] + 4.2, KING[1] + 2.2, { face: { x: -1, z: 0.2 } });
    st.mark('wendy6');
    await st.say('wendy', 'The Teacup flies again! The Duchess fled {key}east{/} over the Wide Sea, with all the other flames.', { expr: 'happy', hop: true });
    await st.say('wendy', 'We’re going after her, to {key}the Dawnlands{/}! Meet me at {key}Barnaby’s lighthouse{/}.', { expr: 'smug' });
    await st.title('The Wide Sea lies open', 'Next stop: the Dawnlands', 3.6);
  });
}

// ------------------------------------------------------------------ side quests
async function toothOut(S) {
  await S.scene(async (st) => {
    const [x, z] = TYRANT;
    await st.cam(x, z + 1, { dur: 0.6, ppu: st.basePpu() });
    st.sfx('boing', { volume: 0.8 });
    st.shake(0.4);
    await st.say('narrator', 'A gentle tug… {shake}PLINK!{/} Out comes the tooth, and the Tyrant King smiles in his sleep.');
    await st.say('ammonite', 'A Tyrant King’s milk tooth! What does it mean? No idea! MARVELLOUS!', { expr: 'love' });
  });
}

// ------------------------------------------------------------------ the chapter
// the rival in the regatta: the Understudies’ swan, paddling round the course at its
// own pace (the clock is the real rule; the swan is there to be beaten)
function swanRace(S, dt) {
  const R = S.race;
  if (!R || R.qid !== 'c6_regatta') { if (S.swan) { S.swan.obj.parent && S.swan.obj.parent.remove(S.swan.obj); S.swan = null; } return; }
  if (!S.swan) { S.swan = { obj: buildSwanPedalo(S.P.r3d), u: 0 }; S.P.world.over.root.add(S.swan.obj); }
  const st = S.stepDef('c6_regatta'), W = S.swan, pts = REGATTA;
  if (!st) return;
  W.u = Math.min(1, W.u + dt / (st.time * 0.92));
  let len = 0; const segs = [];
  for (let k = 0; k < pts.length - 1; k++) { const L = Math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1]); segs.push(L); len += L; }
  let d = W.u * len, k = 0;
  while (k < segs.length - 1 && d > segs[k]) { d -= segs[k]; k++; }
  const [ax, az] = pts[k], [bx, bz] = pts[k + 1], f = Math.min(1, d / segs[k]);
  // (a little to the side of the racing line, so it isn’t sitting on the flags)
  const nx = -(bz - az) / segs[k], nz = (bx - ax) / segs[k];
  W.obj.position.set(ax + (bx - ax) * f + nx * 2, 0, az + (bz - az) * f + nz * 2);
  W.obj.rotation.y = Math.atan2(bx - ax, bz - az);
  if (W.obj.userData.anim) W.obj.userData.anim(S.t || 0, W.u < 1);
}

export const CH6 = {
  id: 6, title: 'Fire & Fins',
  recap: 'The Duchess stole the marsh’s flame and keeps it on her flying theatre, up on the volcano Emberpeak. She shot down the Teacup, Captain Wendy’s airship, over Dino Isle. Mend the Teacup, get into the crater and take {key}the flame{/} back.',
  lv: 27, zones: ['volcano', 'straits', 'dino'], opens: ['whale'],
  update(S, dt) { swanRace(S, dt); },
  props: [
    { id: 'tarGondola', at: GONDOLA, r: 1, build: (r3d) => { const K = kit(r3d), g = new THREE.Group(); K.put(g, K.cyl(1.1, 0.8, 1, 16), K.c('#fbf6ec'), 0, -0.2, 0); K.put(g, K.cyl(1.35, 1.25, 0.12, 16), K.c('#fbf6ec'), 0, -0.5, 0); g.rotation.z = 0.25; return g; }, when: (S) => S.done('c6_flak') && !S.done('c6_tow') },
    { id: 'tornEnvelope', at: ENVELOPE, r: 1.2, build: (r3d) => buildTornEnvelope(r3d), when: (S) => S.done('c6_flak') && !S.done('c6_tow') },
    { id: 'rimStage', at: GLOOMSTAGE, r: 0.1, build: (r3d) => { const g = new THREE.Group(), s = buildGloomstage(r3d); s.scale.setScalar(0.8); s.position.y = 11; g.add(s); g.userData.anim = (tm) => { s.position.y = 11 + Math.sin(tm * 0.7) * 0.3; }; return g; }, when: (S) => S.st.ch === 6 && !S.has('jar') },
    ...BOTTLES.map((pth, k) => ({ id: 'bottleBuoy' + k, at: pth[0], r: 0.1, build: () => new THREE.Group(), when: () => false })),
  ],
  npcs: [
    { id: 'wendy', at: (S) => (S.done('c6_tow') ? [GONDOLA[0] + 4, GONDOLA[1] - 4.2] : WENDY6), face: { x: -0.4, z: 1 }, when: (S) => S.done('c5_relight') && !S.has('marshBack'),
      lines: ['I’m sewing the balloon back up. It’s a LOT of balloon.', 'The Teacup’s been through worse. Once. I think.'] },
    { id: 'ammonite', at: AMMONITE, face: { x: 0.4, z: 1 }, when: (S) => S.done('c5_relight'),
      lines: ['A triceratops will follow anyone who brings it a fern.', 'I named that brachiosaurus Gerald. Gerald has not agreed.'] },
    { id: 'barnaby', at: LIGHTHOUSE, face: { x: -0.3, z: 1 }, when: (S) => S.done('c5_relight'),
      lines: ['Visibility: poor. Mood: stormy. Tea: strong.', 'Forecast: gulls. Followed by more gulls.'] },
    { id: 'mochi', at: SPRINGS, face: { x: -0.6, z: 1 }, when: (S) => S.done('c5_relight'),
      lines: ['Soak first. Worry after. Or never.', 'The Forge Gate? Up the east path, dears. Take a towel.'] },
  ],
  quests: {
    c6_flak: {
      title: 'Flak over the Straits',
      brief: 'The Duchess’s theatre shot the Teacup down over Dino Isle. See how {key}Captain Wendy{/} is, and what is left of her airship.',
      auto: true, lv: 25,
      steps: [
        { do: 'scene', text: 'Fly to {key}Emberpeak{/} aboard the Teacup', run: flak },
        { do: 'talk', npc: 'wendy', text: 'Talk to {key}Captain Wendy{/}, by the wreck of the Teacup', run: wendyCrash },
      ],
    },
    c6_tow: {
      title: 'A Triceratops and a Teacup',
      brief: 'The Teacup’s gondola is sinking in the tar. Only {key}a triceratops{/} is strong enough to pull it out: tame one and ride it there.',
      auto: true, after: 'c6_flak', lv: 26,
      steps: [
        { do: 'talk', npc: 'ammonite', text: 'Ask {key}the scientists{/} at {key}Fern Landing{/} for help', run: ammoniteTalk },
        { do: 'check', text: 'Offer a fern to {key}a triceratops{/}, then ride it to {key}the gondola{/}', target: () => GONDOLA,
          check: (S) => riding(S, 'trike', GONDOLA, 4.5) || S.has('towed'), bot: (S) => S.flag('towed'), run: towOut },
      ],
    },
    c6_regatta: {
      title: 'The Straits Regatta',
      brief: 'The Teacup needs a new propeller. Old Barnaby, the lighthouse keeper, gives one to whoever wins his boat race: {key}the Straits Regatta{/}.',
      auto: true, after: 'c6_tow', lv: 27,
      steps: [
        { do: 'talk', npc: 'barnaby', text: 'Ask {key}Old Barnaby{/} for a propeller, at {key}the Straits Light{/} to the east', run: barnabyTalk },
        { do: 'race', text: 'Win {key}the Regatta{/} by sailboat: round {key}the three buoys{/}, then back to the light', points: REGATTA, time: 55, r: 4, go: 'And they’re OFF!', fail: 'The swan wins! Back to the start line to try again.', rival: true },
        { do: 'scene', text: 'Collect your {key}propeller{/} from Old Barnaby', run: understudiesUninvited },
      ],
    },
    c6_forge: {
      title: 'The Debut',
      brief: 'The Duchess sings her Debut in the crater of Emberpeak, with the marsh’s flame on her stage. Find a way in and take {key}the flame{/} back.',
      auto: true, after: 'c6_regatta', lv: 28,
      steps: [
        { do: 'talk', npc: 'mochi', text: 'Ask {key}Granny Mochi{/}, at {key}the Hot Springs{/}, for the way into the crater', run: mochiTalk },
        { do: 'go', text: 'Go through {key}the Forge Gate{/}, up the path east of the Hot Springs', at: FORGE_DOOR, r: 2.4, run: async (S) => { if (S.P.dungeons) await S.P.dungeons.enter('forgeheart'); else S.flag('jar'); } },
        { do: 'dungeon', id: 'forgeheart', text: 'Cross {key}the Forge Heart{/} and take the flame back from {key}the Duchess{/}' },
      ],
    },
    c6_home: {
      title: 'The Marsh Warms Again',
      brief: 'The Duchess fled east, but the jar with the marsh’s flame fell from her stage. Carry the flame home to {key}King Croakington{/}, in Croakmire.',
      auto: true, after: 'c6_forge', lv: 29,
      steps: [
        { do: 'go', text: 'Carry {key}the marsh’s flame{/} home to {key}King Croakington{/}, in Croakmire', at: KING, r: 3.5, run: marshHome },
      ],
      done: async (S) => { if (!S.st.lit.includes('volcano')) S.st.lit.push('volcano'); S.save(); },
      next: 7,
    },
    // ---- side quests
    c6_tooth: {
      title: 'The Tyrant’s Toothache',
      brief: 'A wobbly tooth keeps the Tyrant King awake. Creep up on him while he dozes, {key}without running{/}, and pull it out.',
      kind: 'side', giver: 'ammonite', lv: 27, when: (S) => S.done('c6_tow'), dust: 50,
      offer: async (S) => {
        await S.say('ammonite', 'The Tyrant King has a wobbly tooth! It keeps him awake, and then he sings. Badly.', { expr: 'worried' });
        await S.say('ammonite', 'He’s dozing in {key}his nest{/} right now. Creep up on him — {key}no running{/}! — and pull it out.', { expr: 'happy' });
      },
      steps: [
        { do: 'sneak', text: 'Creep up on {key}the Tyrant King{/} in his nest, without running, and pull his tooth', at: TOOTH, r: 1.8, watch: TYRANT, wake: 9, back: TIPTOE,
          woke: 'Too loud! The Tyrant King opens one eye. Back to the ferns — and no running.', run: toothOut },
      ],
    },
    c6_bottles: {
      title: 'Messages in Bottles',
      brief: 'Three bottles with letters inside drift round the Straits. Swim out, catch them and bring them to {key}Old Barnaby{/}.',
      kind: 'side', giver: 'barnaby', lv: 27, when: (S) => S.done('c6_regatta'), dust: 50,
      offer: async (S) => {
        await S.say('barnaby', 'Forecast: {key}three bottles{/}, drifting round the Straits, with letters inside.', { expr: 'neutral' });
        await S.say('barnaby', 'Swim out and catch them for an old man. The current won’t wait.', { expr: 'happy' });
      },
      steps: [
        { do: 'collect', text: 'Swim out and catch {key}the three bottles{/} drifting round the Straits', item: 'Bottle', n: 3, spots: BOTTLES.map((p) => p[0]), drift: BOTTLES, speed: 1.6, hint: 'A bottle, bobbing by', verb: 'Catch',
          model: (r3d) => { const K = kit(r3d), g = new THREE.Group(); const b = K.put(g, K.cyl(0.12, 0.14, 0.44, 8), K.c('#8ad0a0'), 0, 0.1, 0); b.rotation.z = Math.PI / 2.4; K.put(g, K.box(0.08, 0.08, 0.08), K.c('#8a5a3a'), 0.24, 0.2, 0); return g; } },
        { do: 'talk', npc: 'barnaby', text: 'Bring the bottles to {key}Old Barnaby{/}, at the Straits Light',
          run: async (S) => {
            await S.say('barnaby', '« From {key}Lanternport{/}, across the Wide Sea. The fog came and the lamps went out. If anyone reads this: we are still here. »', { expr: 'sad' });
            await S.say('barnaby', 'Forecast: you’ll be needed over there. Soon.', { expr: 'neutral' });
          } },
      ],
    },
  },
};
