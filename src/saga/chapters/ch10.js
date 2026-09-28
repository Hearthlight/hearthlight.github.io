// Chapter 10 — The Grand Finale, and the Epilogue. The Umbral Scar, levels 39–40. Everyone
// who helped is at the edge of the Scar: Captain Wendy and her Teacup, Master Tock and the
// Lantern Cannon, the Understudies. The Teacup flies the heroes up through the Gloomstage’s
// searchlights to its stage door; they sneak through her theatre (the spotlights), beat
// Crumble’s last machine (he quits, to be a tour guide), slip through the fly tower while
// the Understudies give the act of their lives, and face the Duchess in her Grand Finale.
// It isn’t won by hitting her: at the end of her strength, Perkins crashes through the
// backdrop with a letter thirty years late — the Festival committee’s, written the night she
// ran — and the heroes give her her mother’s message. The flames fly home; dawn over every
// land. The Epilogue: the Starfall Festival she never finished — and this time, applause.

import '../cast.js';
import { buildGloomstage } from '../../models/v7/gloomstage.js';
import { buildShowStage, buildAirship } from '../../models/v7/props7.js';
import { buildPelican } from '../../models/v7/pelican.js';
import { buildMount } from '../../models/mounts3d.js';
import { buildLanternCannon } from '../../models/v7/moor9.js';
import { buildSkyLantern } from '../../models/v7/dawn7.js';
import { buildUmbralSpotlight, buildSearchBeam, buildCrateStage, buildLetter, buildBunting, buildUmbralWedge } from '../../models/v7/finale10.js';
import { GLOOMSTAGE, STAGE_DOOR } from '../dungeons/gloomstage.js';
import { ghostify } from './ch9.js';
import { audio } from '../../engine/audio.js';
import { kit, THREE } from '../../models/v7/kit.js';
import { t } from '../../i18n.js';

// the chapter’s places
const CAMP = [1341, 103.5];                                  // the edge of the Scar, where everyone waits
const WENDY = [1344.2, 101.4];
const CUP = [1352.5, 98.5];                                  // the Teacup, parked
const SHIP = [1390, 90]; const SHIP_Y = 11;                  // the Gloomstage, moored over the chasm
const PLAZA = [91.5, 70.2];                                  // (the Epilogue) the plaza, south of the stage
const STAGE = [91.5, 65.2];                                  // the Festival stage, north of the fountain
const BACKSTAGE = [97.4, 64.2];
const COVE = [112, 116];                                     // the Gloomstage, moored off Marigold Cove after
const LIGHTHOUSE = [130.5, 88];
const GREAT_TREE = [958, 64];
const LANTERNPORT = [782, 60];

const hide = (P, on) => { for (const p of P.players) { p.away = on; p.hidden = on; if (p.actor) p.actor.hidden = on; } };
const R = (id) => GLOOMSTAGE.rooms.find((r) => r.id === id);
const mid = (d, r, dz = 0) => ({ x: d.ox + r.x + r.w / 2, z: d.oz + r.z + r.h / 2 + dz });
const pose = (e) => { e.spawnT = 0; e.obj.scale.setScalar(1); e.obj.position.set(e.x, e.y, e.z); if (e.shadow) e.shadow.position.set(e.x, 0.02, e.z); };
const heroesIn = (S) => S.P.players.filter((p) => (p.connected || S.solo) && p.fighter && !p.fighter.down);

// the Gloomstage over the Scar, with a searchlight or two under it
// (a chapter prop’s anim gets the saga, not a frame time: it keeps its own)
function mooredShip(r3d, { beams = true, y = SHIP_Y } = {}) {
  const g = new THREE.Group(), ship = buildGloomstage(r3d);
  ship.position.y = y; g.add(ship);
  const lights = [];
  if (beams) for (const [x, ph] of [[-4, 0], [4, 2.1]]) { const b = buildSearchBeam(r3d, { len: 16, r: 2.6, speed: 0.45, phase: ph }); b.position.set(x, y - 1.2, 1.5); g.add(b); lights.push(b); }
  let last = null;
  g.userData.anim = (tm) => {
    const dt = last === null ? 0 : Math.min(0.1, Math.max(0, tm - last)); last = tm;
    ship.userData.anim(tm, dt);
    for (const b of lights) b.userData.anim(tm);
  };
  return g;
}
const propOf = (S, id) => (S.props && S.props.get(id) ? S.props.get(id).obj : null);

// ------------------------------------------------------------------ the edge of the Scar
async function coldOpen(S) {
  await S.scene(async (st) => {
    const P = S.P, [x, z] = CAMP;
    await st.fade(1, 0.5);
    if (P.state) P.state.hour = 18.4;
    P.gatherAt(x, z + 1.5, 1.2);
    // (the Gloomstage and the Teacup are the chapter’s own props)
    S.syncProps();
    const cast = [['wendy', WENDY], ['tock', [x - 3, z - 1.2]], ['minnow', [x + 0.4, z - 2.2]], ['fidget', [x + 1.6, z - 2.4]], ['brick', [x - 1.2, z - 2.6]]];
    for (const [id, [ax, az]] of cast) st.actor(id, ax, az, { face: { x: 0.2, z: 1 } });
    // (framed where a thing that high shows up: its z less its height)
    await st.cam(SHIP[0], SHIP[1] - SHIP_Y - 2.5, { dur: 0, ppu: Math.max(8, Math.round(st.basePpu() * 0.75)) });
    st.music('scar');
    await st.fade(0, 1.2);
    await st.say('narrator', 'The Umbral Scar, at dusk: a crack in the world, black and bottomless. And moored over it, lit up like a birthday cake, the Gloomstage.');
    st.mark('scar');
    await st.cam(x + 1, z - 1, { dur: 1.6, ppu: st.basePpu() });
    await st.say('wendy', 'Right. The plan. I fly us up through her searchlights, set you down on her stage door, and circle till you wave.', { expr: 'neutral' });
    await st.say('minnow', 'We know the way in. The wings, Crumble’s workshop, under the stage — then up through the prompter’s trapdoor into the fly tower.', { expr: 'smug' });
    await st.say('fidget', 'And the fly tower is FULL of lights. And stagehands. And lights. Did I say lights? I feel I should say lights again.', { expr: 'worried' });
    await st.say('brick', 'Brick carries cannon.', { expr: 'happy' });
    await st.say('tock', 'Gently! It’s a precision instrument. …Mostly brass. But PRECISE brass.', { expr: 'worried' });
    await st.say('wendy', 'And if it all goes wrong?', { expr: 'neutral' });
    await st.say('minnow', 'Then we improvise. We’re understudies. It’s literally the job.', { expr: 'happy', hop: true });
    st.mark('plan');
    await st.title('The Grand Finale', 'Chapter 10', 3.2);
  });
}
async function wendyTalk(S) {
  await S.say('wendy', 'Tea’s in the pot, nerves are in the hold, and the Teacup has never once been shot down. Say the word.', { expr: 'smug' });
  await boarding(S);
  if (S.P.dungeons) await S.P.dungeons.enter('gloomstage');
  else S.flag('finaleWon');
}

// up through the searchlights, down on the stage door
async function boarding(S) {
  const P = S.P;
  P.busy++;
  const heroes = P.players.filter((p) => p.connected || P.solo);
  for (const p of heroes) { if (p.mount && P.mounts) P.mounts.dismount(p, true); if (p.vehicle && P.vehicles) P.vehicles.leave(p, true); }
  try {
    await S.scene(async (st) => {
      S.syncProps();
      const parked = propOf(S, 'teacupScar');
      if (parked) parked.visible = false;
      for (const [k, [bx, bz, ph]] of [[-9, 5, 0.6], [9, 3, 2.8], [0, -4, 1.7]].entries()) { const b = buildSearchBeam(P.r3d, { len: 20, r: 3, speed: 0.7, phase: ph, swing: 1.2 }); b.userData.k = k; st.prop('sb' + k, b, SHIP[0] + bx, SHIP_Y + 1, SHIP[1] + bz); }
      const cup = buildAirship(P.r3d);
      st.prop('cup', cup, CUP[0], 0.2, CUP[1]);
      hide(P, true);
      await st.cam(CUP[0], CUP[1] - 1, { dur: 0.4, ppu: st.basePpu() });
      st.sfx('whoosh', { volume: 0.7 });
      await st.move('cup', { y: 5 }, 1.1);
      // (the camera rides along, a little behind)
      const a0 = cup.userData.anim;
      cup.userData.anim = (tm, dt) => { if (a0) a0(tm, dt); if (st.cv && !st.tw) { st.cv.x = cup.position.x + 4; st.cv.z = cup.position.z - cup.position.y - 3; } };
      st.cv.ppu = Math.max(8, Math.round(st.basePpu() / 16) * 8); st.applyCam();
      await st.say('wendy', 'Hold onto your saucers!', { expr: 'happy', auto: 1.2 });
      await st.move('cup', { x: CUP[0] + 14, y: 8, z: CUP[1] - 5 }, 1.8, { ease: 'lin' });
      // (a searchlight swings across — hard over)
      st.flash('#fff4c8', 0.3); st.sfx('whistle', { volume: 0.6 });
      await st.say('wendy', 'Searchlight! Hard to port!', { expr: 'shock', auto: 1.1 });
      st.mark('searchlights');
      await st.move('cup', { x: CUP[0] + 22, y: 10, z: CUP[1] - 14, ry: 0.7 }, 1.2);
      await st.move('cup', { x: CUP[0] + 30, y: 10.5, z: CUP[1] - 10, ry: -0.4 }, 1.2);
      await st.move('cup', { x: SHIP[0] - 7.5, y: SHIP_Y + 0.4, z: SHIP[1] + 3.6, ry: 0 }, 1.6);
      cup.userData.anim = a0;
      st.sfx('thud', { volume: 0.6 });
      await st.cam(SHIP[0] - 4, SHIP[1] + 1 - SHIP_Y, { dur: 0.8 });
      st.mark('boarding');
      await st.say('wendy', 'Stage door, starboard side! Everybody OFF — mind the gap, mind the Scar, mind the Duchess!', { expr: 'happy' });
      await st.fade(1, 0.5);
    }, { bars: true });
  } finally {
    hide(P, false);
    const parked = propOf(S, 'teacupScar');
    if (parked) parked.visible = true;
    P.busy--;
  }
}

// ------------------------------------------------------------------ the workshop: Snuffbot Mk III
R('workshop').run = async (S, d, r) => {
  const C = S.P.combat, c = mid(d, r);
  if (!C) return;
  const e = C.spawn('snuffbot3', c.x, c.z - 4, { level: d.def.lv[0] + 1, quiet: true });
  e.saga = true; e.home = { x: c.x, z: c.z }; e.state = 'roar'; e.timer = 99;
  r.boss = e; pose(e);
  C.bounds = { x: c.x, z: c.z, rx: r.w / 2 - 1.5, rz: r.h / 2 - 1 };
  await S.scene(async (st) => {
    await st.cam(c.x, c.z - 3, { dur: 0.8 });
    st.sfx('slam', { volume: 0.8 }); st.shake(0.4);
    await st.say('crumble', 'LADIES, GENTLEMEN AND ASSORTED LAMP-LICKERS! Crumble’s workshop proudly presents…{p} the Snuffbot MARK THREE, as PROMISED!', { expr: 'smug' });
    await st.say('crumble', 'New! Improved! It has MOVES now. Its very own moves! I drew them myself, with a crayon!', { expr: 'happy' });
    await st.say('crumble', '…Please don’t hit the dome. The dome is very sensitive. Emotionally.', { expr: 'worried' });
    st.mark('mk3');
    await st.title('Snuffbot Mk III', 'Crumble’s masterpiece (at last)', 2.2);
  });
  e.state = 'chase'; e.timer = 1;
  d.D.setMusic('boss');
  S.toast('Jump the rings of its wax flood — then hit the overheating dome!', null, '#ffb070');
};
R('workshop').tick = (S, d, r) => {
  const e = r.boss;
  if (!e || r.done || e.alive) return;
  r.done = true;
  const C = S.P.combat;
  if (C) { C.bounds = null; for (const q of C.enemies) if (q.alive && q.summoner === e) { q.alive = false; q.fading = 0; q.remove(); } }
  (async () => {
    await S.P.wait(1.2);
    await S.scene(async (st) => {
      const c = mid(d, r);
      st.actor('crumble', e.x + 1.2, e.z + 1, { face: { x: 0, z: 1 } });
      st.fx('smoke', e.x, 1, e.z, 8, { color: '#6a5a70' });
      await st.cam(e.x, e.z - 0.5, { dur: 0.7 });
      await st.say('crumble', 'Mark Three… had… MOVES…', { expr: 'cry' });
      await st.say('crumble', 'You know what? I QUIT. No more snuffing. No more drumrolls in the dark. Nobody even claps for the drumroll.', { expr: 'angry', shake: 1 });
      await st.say('crumble', 'I’m going to be a TOUR GUIDE.{p}« And on your left, ladies and gentlemen: the scene of my greatest defeat. »{p}…It’s got a ring to it.', { expr: 'happy' });
      st.mark('tourguide');
      st.walk('crumble', c.x - 12, c.z + 10, { speed: 3.4 });
      await st.wait(0.8);
    });
    d.D.setMusic('gloomstage');
    const G = d.gate('g3');
    if (G) d.setGate(G, true);
  })();
};

// ------------------------------------------------------------------ under the stage
R('understage').onClear = (S) => { S.toast('Minnow (from above): « The prompter’s trapdoor! Up, up, up! »', null, '#e8c0ff'); };

// ------------------------------------------------------------------ the fly tower: the Understudies’ finest hour
const TROUPE = ['minnow', 'fidget', 'brick'];
const PRATFALLS = ['Fidget forgets his line! The follow-spot wanders off the act…', 'Brick drops Minnow. Gently. The follow-spot looks away…', 'The team pose collapses! The follow-spot goes looking for something else to light…'];
R('flytower').run = async (S, d, r) => {
  const P = S.P, c = mid(d, r);
  const CS = [8.5, 63.5];
  const cs = buildCrateStage(P.r3d);
  cs.position.set(CS[0], 0, CS[1]); d.root.add(cs); r.cs = cs;
  d.colliders.push({ rect: [CS[0] - 1.8, CS[1] - 0.7, 3.6, 1.4] });
  r.lure = () => (!r.act || r.act.on ? CS : null);
  await S.scene(async (st) => {
    await st.cam(c.x, c.z + 5, { dur: 0.6 });
    await st.say('narrator', 'The fly tower: catwalks, ropes, sandbags — two lights sweeping, and a follow-spot that turns, slowly, to look at you.');
    for (const [i, id] of TROUPE.entries()) st.actor(id, c.x - 1 + i, d.oz + r.z + r.h - 1.2, { face: { x: 0, z: -1 } });
    st.sfx('door', { volume: 0.6 });
    await st.say('minnow', 'Psst! Up through the prompter’s trapdoor, just like old times. Right, Understudies. This is it.', { expr: 'neutral' });
    await st.say('fidget', 'Is it? Is it really? Because I haven’t warmed up, I haven’t done my scales, I haven’t—', { expr: 'worried' });
    await st.say('minnow', 'The show must go on — and tonight it’s OURS! Places, everyone!', { expr: 'happy', hop: true });
    await Promise.all(TROUPE.map((id, i) => st.walk(id, d.ox + CS[0] - 1.1 + i * 1.1, d.oz + CS[1] - 0.1, { speed: 4 })));
    for (const id of TROUPE) { const a = st.actorOf(id); if (a && a.n) { a.n.seatY = 0.8; st.face(id, a.n.pos.x, a.n.pos.z + 3); } st.keep(id); }
    st.sfx('fanfare', { volume: 0.5 });
    await st.say('brick', 'Ta. DA.', { expr: 'happy', hop: true });
    await st.cam(d.ox + CS[0] + 4, d.oz + CS[1], { dur: 0.8 });
    st.mark('act');
    await st.say('narrator', 'And the follow-spot swings round to the brightest thing in the house: three understudies, doing the act of their lives.');
  });
  r.act = { t: 0, on: true, beat: 0 };
  S.toast('The Understudies hold the follow-spot — slip past the other lights! The lighting board’s lever puts them all out.', null, '#fff3c4');
};
R('flytower').tick = (S, d, r, dt) => {
  const A = r.act, P = S.P;
  if (!A) return;
  A.t += dt;
  if (r.cs) r.cs.userData.anim(A.t);
  // (the act, in numbers: a routine — a pratfall, the follow-spot looks away — and on again)
  const on = A.t % 17 < 12;
  if (on !== A.on) {
    A.on = on;
    if (!on) { P.toast(t(PRATFALLS[A.beat++ % PRATFALLS.length]), '#ff9a8a'); audio.sfx('bonk', { volume: 0.5 }); }
    else { P.toast(t('Minnow: « And a-one, a-two! » — the follow-spot swings back to the act.'), '#e8c0ff'); audio.sfx('tone', { volume: 0.4, pitch: 5 }); }
  }
  A.hopT = (A.hopT || 0) - dt;
  if (A.hopT <= 0 && !r.passed) {
    A.hopT = on ? 0.9 : 2.2;
    const n = P.npcs.find((q) => q.id === TROUPE[Math.floor(A.t * 3) % 3]);
    if (n && n.hop) n.hop();
    if (on) P.world.fx.emit('note', d.ox + 8.5 + (Math.random() - 0.5) * 3, 2.6, d.oz + 63.5, 1);
  }
  // (once the heroes are through, the troupe takes its bow and slips away)
  if (r.passed && !A.bowed) {
    A.bowed = true;
    P.toast(t('The Understudies take a bow — to an audience of stagehands, who clap. They actually clap.'), '#e8c0ff');
    (async () => { await P.wait(2.5); for (const id of TROUPE) P.removeNpc(id); })();
  }
};

// ------------------------------------------------------------------ the stage: the Grand Finale
R('stage').run = async (S, d, r) => {
  const P = S.P, C = P.combat, c = mid(d, r);
  if (!C) return;
  const H = { x: c.x, z: d.oz + r.z + 9.5 };                 // her mark, upstage centre
  // the Umbral Spotlight, hung over her mark; its wedge of darkness on the boards
  const spot = buildUmbralSpotlight(P.r3d);
  spot.position.set(H.x - d.ox, 6.4, H.z - d.oz - 0.5); d.root.add(spot); r.spot = spot; r.spotState = 'off';
  const wedge = buildUmbralWedge(14, 0.55);
  wedge.visible = false; wedge.position.set(H.x - d.ox, 0.05, H.z - d.oz); d.root.add(wedge); r.wedge = wedge;
  // the Lantern Cannon, downstage right, aimed up at the Spotlight; its plate in front
  const CX = r.x + r.w - 5, CZ = r.z + r.h - 5.5;
  const cannon = buildLanternCannon(P.r3d);
  cannon.position.set(CX, 0, CZ); cannon.rotation.y = Math.atan2(H.x - d.ox - CX, H.z - d.oz - CZ); d.root.add(cannon); r.cannon = cannon;
  const K = kit(P.r3d), pm = K.glow('#e0c080', '#ffd66b', 0.3).clone();
  const plate = K.noCast(K.put(d.root, K.cyl(0.62, 0.68, 0.06, 16), pm, CX - 1.9, 0.03, CZ + 0.4));
  r.plate = { x: d.ox + CX - 1.9, z: d.oz + CZ + 0.4, m: plate };
  r.charge = 0; r.cool = 0;
  // her mark: a gold star inlaid in the boards — and the one spotlight that loves her
  const star = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI * 2, rr = i % 2 ? 1.25 : 3; if (i) star.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else star.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  const sm = K.noCast(new THREE.Mesh(new THREE.ShapeGeometry(star).rotateX(Math.PI / 2), K.glow('#d8a84a', '#8a6a2a', 0.35).clone()));
  sm.material.side = THREE.DoubleSide;
  sm.position.set(H.x - d.ox, 0.025, H.z - d.oz); d.root.add(sm);
  const ring = K.noCast(new THREE.Mesh(new THREE.RingGeometry(3.3, 3.5, 40).rotateX(-Math.PI / 2), K.glow('#d8a84a', '#8a6a2a', 0.35)));
  ring.position.set(H.x - d.ox, 0.025, H.z - d.oz); d.root.add(ring);
  const pool = K.noCast(new THREE.Mesh(new THREE.CircleGeometry(2.3, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false })));
  pool.position.set(H.x - d.ox, 0.045, H.z - d.oz); d.root.add(pool); r.pool = pool;
  d.D.setMusic('finale');
  const e = C.spawn('grandiva', H.x, H.z, { level: d.def.lv[1] + 1, quiet: true });
  e.saga = true; e.sagaTag = 'finale'; e.home = { ...H }; e.state = 'roar'; e.timer = 99;
  r.boss = e; pose(e);
  C.bounds = { x: c.x, z: c.z, rx: r.w / 2 - 1.5, rz: r.h / 2 - 1 };
  e.onAct = (q, ph) => {
    P.showBanner(t(ph === 2 ? 'Act Two' : 'Act Three'), t(ph === 2 ? 'The stage machinery' : 'The Umbral Spotlight'));
    if (S.stage) S.stage.mark('act' + ph);
    if (ph === 3) { audio.sfx('chord', { volume: 0.7, pitch: -12 }); P.toast(t('Master Tock: « The plate! Stand on the cannon’s plate and hold still! »'), '#ffd66b'); }
  };
  e.onSweep = (q, a0) => { wedge.visible = !(q.dazzle > 0); wedge.rotation.y = -a0; };
  e.onEnd = () => { if (!r.ending) { r.ending = true; finaleEnd(S, d, r, e); } };
  await S.scene(async (st) => {
    st.actor('tock', d.ox + CX + 1.3, d.oz + CZ + 0.6, { face: { x: -0.6, z: -1 } });
    st.keep('tock');
    await st.cam(H.x, H.z - 1.5, { dur: 1 });
    st.music('finale');
    st.sfx('fanfare', { volume: 0.8 });
    st.flash('#fff4e0', 0.4);
    await st.say('narrator', 'The house lights go down. The curtain rises. One spotlight — and in it, in a gown the colour of midnight, every stolen flame circling her like a necklace…');
    st.mark('finale');
    await st.say('duchess', 'At LAST. An audience that can’t leave.{p}Welcome, Wick Brigade, to my GRAND FINALE!', { expr: 'smug' });
    await st.say('duchess', 'Act One: I sing. Act Two: the stage does as it’s told. Act Three…{p}the Umbral Spotlight. The last light you will ever see — because it EATS all the others.', { expr: 'angry', shake: 1 });
    await st.cam(d.ox + CX - 1, d.oz + CZ, { dur: 0.8 });
    await st.say('tock', 'The Understudies carried it up the back stairs. All four hundred. Brick carried; Minnow shouted.{p}When she lights that thing: stand on the plate. I aim. You hold still. VERY still.', { expr: 'worried' });
    await st.cam(H.x, H.z + 1, { dur: 0.6 });
    await st.title('Duchess Gloria Gloomsworth', 'in her Grand Finale', 2.8);
  });
  e.state = 'chase'; e.timer = 1.5;
};
R('stage').tick = (S, d, r, dt) => {
  const e = r.boss, P = S.P, C = P.combat;
  if (!e || r.done) return;
  r.spot.userData.anim(S.t);
  r.cannon.userData.anim(S.t, r.charge);
  if (r.beamT > 0) { r.beamT -= dt; if (r.beamT <= 0 && r.beam) { d.root.remove(r.beam); r.beam = null; } }
  const want = e.ended ? 'off' : e.phase < 3 ? 'off' : e.dazzle > 0 ? 'shattered' : 'lit';
  if (want !== r.spotState) { r.spotState = want; r.spot.userData.set(want); }
  if (want !== 'lit') r.wedge.visible = false;
  // (her own spotlight follows her — until the Umbral Spotlight eats it; shattered, the cannon’s gold is on her)
  r.pool.visible = want !== 'lit';
  r.pool.position.set(e.x - d.ox, 0.045, e.z - d.oz);
  r.pool.material.color.set(want === 'shattered' ? 0xffd66b : 0xfff0c8);
  r.pool.material.opacity = want === 'shattered' ? 0.34 + Math.sin(S.t * 10) * 0.06 : 0.22;
  if (e.ended || !C) return;
  // (Act III) the cannon: a hero on its plate charges it; full, it fires at the Spotlight
  const ready = e.phase >= 3;
  const on = ready && heroesIn(S).some((p) => Math.hypot(p.pos.x - r.plate.x, p.pos.z - r.plate.z) < 0.95);
  r.cool = Math.max(0, r.cool - dt);
  if (ready && r.cool <= 0 && !(e.dazzle > 0)) r.charge = on ? Math.min(1, r.charge + dt / 2.2) : Math.max(0, r.charge - dt * 0.6);
  r.plate.m.material.emissiveIntensity = !ready ? 0.12 : on ? 1.5 : 0.5 + Math.sin(S.t * 4) * 0.3;
  if (r.charge >= 1) fire(S, d, r, e);
};
function fire(S, d, r, e) {
  const P = S.P, C = P.combat, K = kit(P.r3d);
  r.charge = 0; r.cool = 3.5; r.fired = (r.fired || 0) + 1;
  e.dazzle = 7; e.immune = null;
  const a = r.cannon.position, b = r.spot.position;
  r.beam = K.noCast(K.beam(d.root, K.light('#ffe08a', 0.65), a.x, 1.5, a.z, b.x, b.y - 0.6, b.z, 0.55));
  r.beamT = 0.55;
  audio.sfx('boom', { volume: 1 }); audio.sfx('chord', { volume: 0.8 }); audio.sfx('shard', { volume: 0.8 });
  if (C) { C.shakeAt(e, 0.7); C.popText(e.x, e.def.h + 1.4, e.z, t('Direct hit!'), '#ffe08a', true); }
  for (let k = 0; k < 16; k++) P.world.fx.emit('sparkle', d.ox + b.x + (Math.random() - 0.5) * 2, b.y - Math.random() * 2, d.oz + b.z + (Math.random() - 0.5) * 2, 1, { color: '#fff0a0' });
  if (S.stage) S.stage.mark('cannon');
}

// the end of her strength: the letter, her mother’s message, the flames fly home
async function finaleEnd(S, d, r, e) {
  const P = S.P, C = P.combat;
  if (C) { C.bounds = null; for (const q of C.enemies) if (q.alive && q !== e) { q.alive = false; q.fading = 0.3; } }
  r.wedge.visible = false;
  e.hold = true; e.fading = 99;
  await P.wait(0.8);
  await S.scene(async (st) => {
    const x = e.x, z = e.z;
    await st.cam(x, z + 0.5, { dur: 0.8 });
    st.music(null);
    await st.say('duchess', 'Why won’t you stay DOWN? Why won’t anybody, ever, just let me FINISH?', { expr: 'angry', shake: 1 });
    await st.say('duchess', 'Thirty years I have rehearsed this. Thirty YEARS. And every time there’s a hen, or a lantern, or four small people in hats—', { expr: 'cry' });
    // Perkins, through the backdrop
    st.sfx('slam', { volume: 1 }); st.sfx('whoosh', { volume: 0.8 });
    st.flash('#ffffff', 0.4); st.shake(1);
    const pel = buildPelican(P.r3d, { rider: '#3f6f9e' });
    pel.scale.setScalar(1.4);
    st.prop('perkins', pel, x - 2, 7, z - 7);
    pel.userData.mode = 'fly';
    for (let k = 0; k < 10; k++) st.fx('dust', x - 2 + (Math.random() - 0.5) * 4, 3 + Math.random() * 3, z - 6, 1, { color: '#5a2a6a' });
    await st.move('perkins', { x: x - 1.6, y: 0.3, z: z + 1 }, 1.1);
    pel.userData.mode = 'sit';
    st.dropProp('perkins');
    st.actor('perkins', x - 1.6, z + 1, { face: { x: 1, z: -0.3 } });
    st.mark('perkins');
    await st.say('perkins', 'PELICAN POST! Mind your backdrop — ooh, sorry. Special delivery!', { expr: 'happy', hop: true });
    await st.say('perkins', 'One letter, for a « Miss G. Gloomsworth, Marigold Cove ». Thirty years late — no forwarding address. The wind was against us.', { expr: 'neutral' });
    await st.say('duchess', '…For me? Nobody writes to me. Nobody has EVER—', { expr: 'shock' });
    const env = buildLetter(P.r3d);
    st.prop('letter', env, x - 1.2, 1.2, z + 0.8);
    st.sfx('page', { volume: 0.8 });
    await st.move('letter', { x: x - 0.2, y: 1.6, z: z + 0.3 }, 0.6);
    st.dropProp('letter');
    if (!st.skipping) await st.dialogue.showLetter('The Starfall Festival Committee', 'Dear Miss Gloria,\n\nThe hen was an accident. It belonged to the Mayor, and it has been spoken to.\n\nWe laughed at the hen — never at you. You were wonderful.\n\nPlease come back and close next year’s Festival. We would so like to hear the rest.', '— the Committee (June, secretary)');
    await st.say('duchess', '« We would so like to hear the rest… »', { expr: 'cry' });
    st.heroesFace(x, z);
    await st.say(st.lead, 'And your mother asked us to tell you something. She said…{p}the tea is still warm.', { expr: 'sad' });
    st.mark('tea');
    await st.say('duchess', '…Mother?{p}She kept… the tea… warm?', { expr: 'cry' });
    await st.say('narrator', 'Duchess Gloria Gloomsworth, terror of the Wick Brigade, sits down in the middle of her own stage and cries like a girl of sixteen.');
    // the flames fly home
    e.freedFlames = true;
    const cols = ['#ffd66b', '#8fd6b4', '#9fd8ff', '#ff9a6a', '#c8a8ff', '#ffe08a', '#b8f0a0'];
    const K = kit(P.r3d);
    for (const [i, col] of cols.entries()) {
      const a = (i / cols.length) * Math.PI * 2, g = new THREE.Group();
      K.noCast(K.put(g, K.ball(0.26, 8, 6), K.glow(col, col, 2), 0, 0, 0));
      K.noCast(K.put(g, K.ball(0.5, 8, 6), K.light(col, 0.3), 0, 0, 0));
      st.prop('flame' + i, g, x + Math.cos(a) * 1.4, 3.6, z + Math.sin(a) * 1.4);
    }
    st.sfx('chord', { volume: 0.9 }); st.flash('#fff4e0', 0.5);
    for (const [i] of cols.entries()) { const a = (i / cols.length) * Math.PI * 2; st.move('flame' + i, { x: x + Math.cos(a) * 12, y: 14, z: z + Math.sin(a) * 6 - 6 }, 2.4 + i * 0.15); }
    await st.wait(0.7);
    st.mark('flames');
    await st.say('narrator', 'One by one, the stolen flames slip out of her hands — and fly home, every one of them, to its Great Hearth.');
    await st.wait(0.6);
  });
  if (C) for (const q of heroesIn(S)) C.gainXp(q, 1400);
  e.hold = false; e.alive = false; e.fading = 0; if (e.remove) e.remove();
  r.done = true;
  P.removeNpc('tock');
  S.flag('finaleWon');
  await d.D.exit({ done: true });
}

// ------------------------------------------------------------------ dawn over everything
async function dawnOverAll(S) {
  await S.scene(async (st) => {
    const P = S.P, [x, z] = STAGE_DOOR;
    await st.fade(1, 0.6);
    if (P.state) P.state.hour = 6.9;
    P.gatherAt(x - 3, z + 3, 1.2);
    st.prop('ship', mooredShip(P.r3d, { beams: false }), SHIP[0], 0, SHIP[1]);
    st.prop('cup', buildAirship(P.r3d), CUP[0], 0.2, CUP[1]);
    const crowd = [['duchess', [x - 1, z + 1.2]], ['wendy', [x - 5.5, z + 1.8]], ['tock', [x - 4.6, z + 4.2]], ['minnow', [x + 0.8, z + 2.8]], ['fidget', [x + 1.8, z + 3.4]], ['brick', [x + 0.2, z + 4.3]], ['crumble', [x - 2.2, z + 1.4]]];
    for (const [id, [ax, az]] of crowd) st.actor(id, ax, az, { face: { x: 0.3, z: -1 } });
    await st.lights(0.35, 0.2, 0);
    await st.cam(SHIP[0], SHIP[1] - SHIP_Y + 3, { dur: 0, ppu: Math.max(8, Math.round(st.basePpu() * 0.75)) });
    st.music('title');
    await st.fade(0, 1.4);
    await st.say('narrator', 'Dawn. Over the Umbral Scar, for the first time in thirty years.');
    await st.lights(0, 0, 2);
    st.mark('dawn');
    // (the flames come home: a hearth or three, the length of the world)
    for (const [px, pz, line] of [[...LIGHTHOUSE, 'In Marigold Cove, Old Glimmer’s lamp burns gold again.'], [...GREAT_TREE, 'In Elderbough, the Great Tree’s heart beats warm and slow.'], [...LANTERNPORT, 'In Lanternport, somebody throws open the shutters and laughs out loud.']]) {
      await st.fade(1, 0.4);
      await st.cam(px, pz, { dur: 0 });
      await st.wait(0.5);
      await st.fade(0, 0.5);
      st.sfx('chime', { volume: 0.6 });
      for (let k = 0; k < 12; k++) st.fx('sparkle', px + (Math.random() - 0.5) * 6, 1 + Math.random() * 5, pz + (Math.random() - 0.5) * 4, 1, { color: '#ffe8a0' });
      await st.say('narrator', line);
    }
    await st.fade(1, 0.4);
    await st.cam(x - 2, z + 2, { dur: 0, ppu: st.basePpu() });
    await st.fade(0, 0.6);
    await st.say('duchess', '…They’ll all be at the Festival tonight. Everyone. And they will all know it was me.', { expr: 'sad' });
    await st.say(st.lead, 'Come anyway.', { expr: 'happy' });
    await st.say('minnow', 'And if you’re scared, you do what we do. You audition.', { expr: 'smug' });
    await st.say('duchess', '…I haven’t sung FOR anybody in thirty years. Only AT them.', { expr: 'worried' });
    await st.say('crumble', 'I’ll do your introduction! I’ve been practising your title. I’ve got it nearly right!', { expr: 'happy', hop: true });
    await st.say('wendy', 'Then tonight’s the night. All aboard the Teacup — tea’s on in Marigold Cove!', { expr: 'happy' });
    st.mark('home');
    await st.title('Dawn over every land', 'The Murk is gone — and the Festival is tonight', 3.4);
    S.flag('dawn10');
    for (const l of ['scar', 'tundra', 'clock', 'prism', 'autumn', 'glow', 'jade', 'salt', 'deepwood', 'steppe', 'sunken', 'volcano']) if (!S.st.lit.includes(l)) S.st.lit.push(l);
    S.save();
    // (home, by teacup: the plaza, at dusk)
    await st.fade(1, 0.6);
    if (P.state) P.state.hour = 19.4;
    P.gatherAt(PLAZA[0], PLAZA[1] + 1.2, 1.3);
    await st.cam(PLAZA[0], PLAZA[1], { dur: 0, ppu: st.basePpu() });
    await st.fade(0, 0.8);
    await st.say('narrator', 'That evening, Marigold Cove. Lanterns on every string, and the whole world on the plaza — or near enough.');
  });
}

// ------------------------------------------------------------------ the Epilogue: the Starfall Festival
async function duchessNerves(S) {
  await S.say('duchess', 'Oh, it’s you. Good. Tell me honestly: is there a hen out there? Any hen. Any size.', { expr: 'worried' });
  await S.say('duchess', 'Thirty years I have been a villain. Villains don’t get stage fright. Villains get REVENGE.{p}…This is much, much worse.', { expr: 'worried' });
  await S.say('duchess', 'Right. RIGHT. A Gloomsworth never misses her cue. Go and find a good seat — the front. I want to see a friendly face.', { expr: 'smug' });
}

// the crowd, in a horseshoe round the fountain (x, z from the stage’s mark)
const CROWD = [
  ['june', -5.2, 4.4], ['hollis', -3.4, 4.3], ['rosa', 3.6, 4.3], ['wendy', 5.4, 4.4], ['tock', 7.2, 4.6], ['perkins', -7.1, 4.6],
  ['mabel', -6.8, 5.9], ['bram', -5, 5.8], ['tallow', -3.3, 5.9], ['rhoda', 3.4, 5.8], ['hoshi', 5.2, 5.9], ['mei', 7, 6],
  ['croakington', -6.2, 7.4], ['tansy', -4.4, 7.5], ['rowan', 4.3, 7.5], ['marlo', 6.2, 7.4], ['sol', -1.8, 10.1],
];
// the Festival’s stage and its lights, on the plaza for the evening
function festivalSet(r3d) {
  const g = new THREE.Group(), stage = buildShowStage(r3d);
  stage.position.set(0, 0, -1.2); g.add(stage);
  const b1 = buildBunting(r3d, 11), b2 = buildBunting(r3d, 14, { h: 3.8, n: 18 });
  b1.position.set(0, 0, 2.2); b2.position.set(0, 0, 6.4); g.add(b1, b2);
  g.userData.anim = (tm) => { b1.userData.anim(tm); b2.userData.anim(tm); if (stage.userData.anim) stage.userData.anim(tm); };
  return g;
}
async function festival(S) {
  await S.scene(async (st) => {
    const P = S.P, [x, z] = STAGE;
    await st.fade(1, 0.6);
    if (P.state) P.state.hour = 20.6;
    // (the stage and its bunting are the chapter’s own prop) the crowd — and the heroes in the front row
    S.syncProps();
    const crowd = [];
    for (const [id, dx, dz] of CROWD) { const a = st.actor(id, x + dx, z + dz, { face: { x: -dx * 0.08, z: -1 } }); if (a) crowd.push(a); }
    const heroes = P.players.filter((p) => p.connected || P.solo);
    heroes.forEach((p, i) => { const px = x - 2.4 + (i % 4) * 1.6, pz = z + 2.9 + Math.floor(i / 4) * 0.8; if (P.solo) P.gatherAt(px, pz, 0); else p.actor.pos = { x: px, z: pz }; });
    st.heroesFace(x, z - 2);
    await st.cam(x, z + 2, { dur: 0, ppu: st.basePpu() });
    st.music(null);
    await st.fade(0, 1);
    st.mark('festival');
    await st.say('narrator', 'The Starfall Festival. The whole cove on the plaza — and everyone the Lamplighters met on the road, from the Whispering Woods to the Aurora Camp.');
    // (and someone who has been away a long while)
    await st.cam(x - 5.2, z + 4, { dur: 1 });
    st.emote('june', 'heart', 1.8);
    st.mark('june');
    await st.say('narrator', 'And in the front row, knitting, home at last from wherever it is Lamplighters go: Nana June.');
    await st.say('june', 'Don’t mind me, dears. I only came for the singing.', { expr: 'smug' });
    await st.cam(x, z + 2, { dur: 0.8 });
    // Crumble announces her — and gets it right
    st.actor('crumble', x - 2.3, z - 1.2, { face: { x: 0, z: 1 } }).n.seatY = 0.5;
    await st.say('crumble', 'LADIES, GENTLEMEN AND ASSORTED WILDLIFE! Closing this year’s Festival — thirty years late — please welcome…{p}MISS GLORIA GLOOMSWORTH!', { expr: 'happy', hop: true });
    await st.say('crumble', '…I got it right. I GOT IT RIGHT!', { expr: 'love', hop: true });
    const cr = st.actorOf('crumble');
    if (cr && cr.n) cr.n.seatY = 0;
    st.walk('crumble', x + 1.9, z + 10.1, { speed: 4, via: [[x - 4.6, z + 1.6]] });
    const g = st.actor('duchess', x + 2.7, z - 1.4, { face: { x: -1, z: 0 } });
    if (g && g.n) g.n.seatY = 0.5;
    await st.walk('duchess', x, z - 1.2, { speed: 2 });
    st.face('duchess', x, z + 4);
    await st.say('narrator', 'She looks out at the crowd. The crowd looks back. Somebody coughs.');
    st.sfx('tone', { volume: 0.6, pitch: 7 });
    await st.say('duchess', '♪ Laaa… la-la-LAAA… ♪', { expr: 'worried' });
    // and from the wings — a hen
    const hen = buildMount(P.r3d, 'hen', { variant: 0, wild: true });
    hen.root.scale.setScalar(0.8);
    st.prop('hen', hen.root, x + 2.8, 0.5, z - 1.4);
    st.sfx('cluck', { volume: 0.9 });
    await st.move('hen', { x: x + 0.9, z: z - 1 }, 1.4);
    st.heroesEmote('exclaim', 1.6);
    for (const a of crowd) if (a && a.n) a.n.setEmote('exclaim', 1.6);
    st.mark('hen');
    await st.say('narrator', 'From the wings: a hen.{p}The whole plaza holds its breath.');
    await st.say('duchess', '…', { expr: 'shock' });
    // she picks it up, and sings on
    await st.move('hen', { x: x + 0.45, y: 1.6, z: z - 0.9 }, 0.5);
    st.music('aria');
    for (let k = 0; k < 6; k++) { st.fx('note', x + (Math.random() - 0.5) * 2, 3, z - 1, 1); await st.wait(0.25); }
    await st.say('duchess', '♪ …LAAAAAAAAA! ♪', { expr: 'happy' });
    st.mark('aria');
    await st.say('narrator', 'She sings the whole aria — every note of it, with a hen tucked under one arm — and it is the most beautiful thing Marigold Cove has ever heard.');
    // the applause
    st.sfx('cheer', { volume: 1 }); st.sfx('cheer', { volume: 0.8, pitch: 5 });
    for (const a of crowd) if (a && a.n) { a.n.hop(Math.random() * 0.3); a.n.setEmote('heart', 2); }
    st.heroesEmote('heart', 2);
    for (let k = 0; k < 14; k++) st.fx('sparkle', x + (Math.random() - 0.5) * 8, 1 + Math.random() * 3, z + 3 + Math.random() * 4, 1, { color: '#ffe8a0' });
    st.mark('applause');
    await st.say('narrator', 'And Marigold Cove applauds. It applauds until its hands hurt. It applauds thirty years’ worth.');
    await st.say('duchess', 'They’re… clapping. For ME.{p}Mother… they’re clapping.', { expr: 'love' });
    // the Understudies’ act
    st.dropProp('hen');
    for (const [i, id] of TROUPE.entries()) { const a = st.actor(id, x - 1.2 + i * 1.2, z - 1.1, { face: { x: 0, z: 1 } }); if (a && a.n) a.n.seatY = 0.5; }
    st.walk('duchess', x + 2.3, z - 1.7, { speed: 2 });
    await st.say('minnow', 'And now — for one night only — the UNDERSTUDIES! Team pose!', { expr: 'happy', hop: true });
    for (const [i, id] of TROUPE.entries()) st.hop(id, i * 0.15);
    await st.wait(0.5);
    st.sfx('bonk', { volume: 0.6 });
    await st.say('fidget', 'Oh no. Oh no no no, it’s collapsing, it always collapses—', { expr: 'shock' });
    st.sfx('cheer', { volume: 0.8, pitch: 8 });
    for (const a of crowd) if (a && a.n) a.n.hop(Math.random() * 0.2);
    await st.say('brick', 'They laugh. WITH us.', { expr: 'love', hop: true });
    // at the back of the crowd, by the fountain
    const lady = st.actor('honoria', x + 5.6, z + 10.4, { face: { x: -0.4, z: -1 } });
    ghostify(lady);
    await st.cam(x + 3.4, z + 8.4, { dur: 1.6 });
    st.mark('lady');
    await st.say('narrator', 'At the back of the crowd, by the fountain, a pale lady in grey raises a teacup — and smiles — and is gone.');
    for (let k = 0; k < 10; k++) st.fx('sparkle', x + 5.6 + (Math.random() - 0.5) * 1.5, 0.6 + Math.random() * 2.2, z + 10.4, 1, { color: '#e8f0ff' });
    st.hide('honoria');
    await st.wait(0.8);
    // fireworks, and the sky lanterns go up
    await st.cam(x, z + 1, { dur: 1.2, ppu: Math.max(8, Math.round(st.basePpu() * 0.75)) });
    st.music('festival');
    const lan = [];
    for (let k = 0; k < 18; k++) {
      const L = buildSkyLantern(P.r3d, ['#ffcf7a', '#ffb07a', '#ffe0a0', '#ff9a8a'][k % 4]);
      st.prop('sky' + k, L, x - 9 + Math.random() * 18, 1 + Math.random() * 3, z + 1 + Math.random() * 8);
      lan.push({ L, vy: 0.8 + Math.random() * 0.8, w: Math.random() * 0.8 });
    }
    const rg = new THREE.Group();
    rg.userData.anim = (tm, dt) => { for (const q of lan) { q.w -= dt || 0.016; if (q.w > 0) continue; q.L.position.y += q.vy * (dt || 0.016); } };
    st.prop('riser', rg, 0, 0, 0);
    for (let k = 0; k < 6; k++) { st.fx('firework', x - 7 + k * 2.8, 10 + (k % 2) * 2, z - 6, 26, { color: ['#ffd66b', '#ff8ab0', '#8fd6ff', '#b0f08a', '#c8a8ff', '#ffb07a'][k] }); st.sfx('firework', { volume: 0.5 }); await st.wait(0.3); }
    st.mark('fireworks');
    await st.say('june', 'Well, my little Lamplighter. Seven flames home, one Duchess found, and not a single thing burned down.{p}I knew you could. I wrote and told you so — the letter should get here by spring.', { expr: 'love' });
    await st.say('duchess', 'Same time next year? I have… a few more arias. And a hen who can harmonise.', { expr: 'happy' });
    for (let k = 0; k < 6; k++) { st.fx('firework', x - 8 + Math.random() * 16, 11 + Math.random() * 3, z - 7, 26, { color: ['#ffd66b', '#ff8ab0', '#8fd6ff', '#b0f08a'][k % 4] }); st.sfx('firework', { volume: 0.45 }); await st.wait(0.35); }
    // the credits, over the festival, dimmed
    st.music('title');
    await st.fade(0.72, 1.2);
    await st.title('Hearthlight', 'The End — of the beginning', 3.4);
    await st.title('A story in ten chapters', 'Every pixel painted in code, every note synthesised', 3.2);
    await st.title('Starring', 'You — and everyone you met on the road', 3.2);
    await st.title('With', 'Nana June · Perkins · Captain Wendy', 3);
    await st.title('And', 'Master Tock · the Understudies · Crumble', 3);
    await st.title('And introducing', 'Gloria Gloomsworth, soprano', 3.2);
    st.mark('credits');
    await st.title('Thank you for playing!', 'The world is still yours', 4);
    S.flag('theEnd');
    await st.fade(0, 1.2);
  });
}

// ------------------------------------------------------------------ the chapter
export const CH10 = {
  id: 10, title: 'The Grand Finale', lv: 39, zones: ['scar'], opens: [],
  // (the Scar, until dawn: a sky like a bruise)
  gloom(S) {
    if (S.st.ch !== 10 || S.has('dawn10')) return 0;
    const B = S.P.big;
    for (const p of S.P.players) {
      if (!p.connected && !S.solo) continue;
      const zz = B && B.zoneAt ? B.zoneAt(p.pos.x, p.pos.z) : null;
      if (zz && zz.id === 'scar') return 0.3;
    }
    return 0;
  },
  props: [
    { id: 'gloomstageScar', at: SHIP, r: 0, build: (r3d) => mooredShip(r3d), when: (S) => S.st.ch >= 10 && !S.has('finaleWon') },
    { id: 'teacupScar', at: CUP, r: 1.6, build: (r3d) => { const g = buildAirship(r3d); g.position.y = 0.2; const w = new THREE.Group(); w.add(g); w.userData.anim = (tm) => g.userData.anim(tm); return w; }, when: (S) => S.st.ch >= 10 && !S.has('finaleWon') },
    { id: 'gloomstageCove', at: COVE, r: 0, build: (r3d) => mooredShip(r3d, { beams: false, y: 3.2 }), when: (S) => S.has('dawn10') },
    { id: 'festivalSet', at: STAGE, r: 0, build: (r3d) => festivalSet(r3d), when: (S) => S.active('c10_festival') },
  ],
  npcs: [
    // (at the edge of the Scar, until the Teacup takes off)
    { id: 'wendy', at: WENDY, face: { x: -0.4, z: 1 }, when: (S) => S.active('c10_finale') && S.stepOf('c10_finale') < 2,
      lines: ['Tea: strong. Nerves: stronger. Teacup: ready when you are.'] },
    { id: 'tock', at: [CAMP[0] - 3, CAMP[1] - 1.2], face: { x: 0.2, z: 1 }, when: (S) => S.active('c10_finale') && S.stepOf('c10_finale') < 2,
      lines: ['I’ve polished the lens four times. Tick. Tick. Five.', 'The cannon wants a steady hand and a clear shot. I have one of those. We’ll find the other.'] },
    { id: 'minnow', at: [CAMP[0] + 0.4, CAMP[1] - 2.2], face: { x: 0, z: 1 }, when: (S) => S.active('c10_finale') && S.stepOf('c10_finale') < 2,
      lines: ['Understudies don’t get stage fright. We get stage PREPARED.', 'Brick, stop eating the props.'] },
    { id: 'fidget', at: [CAMP[0] + 1.6, CAMP[1] - 2.4], face: { x: 0, z: 1 }, when: (S) => S.active('c10_finale') && S.stepOf('c10_finale') < 2,
      lines: ['What if she sees us? What if she DOESN’T see us? Which is worse? Don’t answer that.'] },
    { id: 'brick', at: [CAMP[0] - 1.2, CAMP[1] - 2.6], face: { x: 0, z: 1 }, when: (S) => S.active('c10_finale') && S.stepOf('c10_finale') < 2,
      lines: ['Brick is ready.', 'Cannon is heavy. Brick is heavier.'] },
    // (the Epilogue: backstage, very nervous)
    { id: 'duchess', at: BACKSTAGE, face: { x: -1, z: 0.2 }, when: (S) => S.active('c10_festival') },
    // (after it all: the plaza and the cove)
    { id: 'duchess', at: [96.2, 67.4], face: { x: -0.4, z: 1 }, when: (S) => S.done('c10_festival'),
      lines: ['Encore? …Well. If you INSIST.', 'I’ve started giving singing lessons. My first pupil is a hen. She’s very gifted.', 'Mother’s clocks are all running again, I hear. I’m going to Hollowmoor for tea on Sunday. It’ll be warm.'] },
    { id: 'crumble', at: [COVE[0] - 8, COVE[1] - 12], face: { x: 0.3, z: 1 }, when: (S) => S.done('c10_festival'),
      lines: ['Crumble’s Gloomstage Tours! On your left: the wings. On your right: more wings. Mind the trapdoors — no, really, MIND them.', 'Tips are welcome. Applause is MORE welcome.'] },
    { id: 'fidget', at: [87.7, 68.8], face: { x: 0.2, z: 1 }, when: (S) => S.done('c10_festival'),
      lines: ['I’ve been practising my bow. Forty times this morning. It’s getting less wobbly.', 'Do you think the Duchess will sing with us one day? She said « perhaps ». Perhaps is nearly yes.'] },
    { id: 'brick', at: [85, 69], face: { x: 0.4, z: 1 }, when: (S) => S.done('c10_festival'),
      lines: ['Brick likes applause.', 'Brick has a fan. The fan is a hen.'] },
    { id: 'minnow', at: [86.4, 68.2], face: { x: 0.4, z: 1 }, when: (S) => S.done('c10_festival'),
      lines: ['We’ve been booked! A real theatre! Well — the Gloomstage. It’s the same theatre. But we’re on the POSTER.', 'Fidget’s practising his bow. He’s practising it a lot.'] },
  ],
  quests: {
    c10_finale: {
      title: 'The Grand Finale', auto: true, lv: 39, gear: 'rich',
      steps: [
        { do: 'scene', text: '…', run: coldOpen },
        { do: 'talk', npc: 'wendy', text: 'Tell Captain Wendy when you’re ready to board the Gloomstage', run: wendyTalk },
        { do: 'dungeon', id: 'gloomstage', text: 'Sneak through the Gloomstage to the stage — and the Duchess’s Grand Finale' },
        { do: 'scene', text: '…', run: dawnOverAll },
      ],
    },
    // ---- a mini-game, to play again and again (World v7 M13): percussion for the Understudies
    c10_talentshow: {
      title: 'The Talent Show', kind: 'side', repeat: true, giver: 'minnow', after: 'c10_festival', lv: 40, dust: 25,
      offer: async (S) => {
        await S.say('minnow', 'We’re rehearsing for our real theatre debut! We need someone on percussion. You clap. On the beat. That’s it. That’s the whole job.', { expr: 'smug' });
        await S.say('fidget', 'It’s a very important job. The last percussionist was Brick. Brick clapped once, very hard, and then the stage was gone.', { expr: 'worried' });
      },
      steps: [
        { do: 'rhythm', text: 'Keep the beat for the Understudies’ new act (press as each note reaches the ring)', at: [89.2, 70.4], r: 7, bpm: 116, need: 0.65,
          beats: [0, 1, 2, 2.5, 3, 4, 5, 6, 6.5, 7, 8, 8.5, 9, 10, 11, 12, 13, 13.5, 14, 15, 16, 17, 18, 18.5, 19, 20, 20.5, 21, 22, 23],
          go: 'Five, six, seven, eight!', fail: 'Brick tripped over the beat. From the top!',
          onStart: (S) => { for (const id of ['minnow', 'fidget', 'brick']) { const n = S.npcFor(id); if (n) n.hop(); } },
          onHit: (S, n) => { const who = S.npcFor(['minnow', 'fidget', 'brick'][n % 3]); if (who) who.hop(); } },
        { do: 'talk', npc: 'minnow', text: 'Take a bow with the Understudies', run: async (S) => {
          if (S.plays('c10_talentshow')) await S.say('minnow', 'Tighter every time! Keep this up and we’ll put you on the poster. Small. In the corner. But ON it.', { expr: 'happy', hop: true });
          else await S.say('minnow', 'That was PERFECT. Nearly. The important thing is nobody fell off anything. Same time tomorrow?', { expr: 'love', hop: true });
        } },
      ],
    },
    c10_festival: {
      title: 'The Starfall Festival', auto: true, after: 'c10_finale', lv: 40, dust: 100,
      steps: [
        { do: 'talk', npc: 'duchess', text: 'Find the Duchess behind the Festival stage — she’s very nervous', run: duchessNerves },
        { do: 'scene', text: '…', run: festival },
      ],
    },
  },
};
