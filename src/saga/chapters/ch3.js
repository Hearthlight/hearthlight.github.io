// Chapter 3 — Dust & Spores. The Golden Steppe, the Red Canyon and Bouncecap
// Woods, levels 8–12. The Duchess’s big top on the Festival Ring and the
// Understudies’ Human Cannonball; the Steppe’s Hearthstone dug up from under the
// Ring and carried off to Foreman Grubb; the nomads’ lost fluffhorns; Dusty Gulch, its
// sheriff and Old Boom, the retired cannonball whose cannon Big Bertha was; the
// ore cart chase up the Canyon Railway; Professor Hazel and the old quarry road;
// the Old Mine (the Mole Brothers, Grubb’s Drillosaur). The Hearthstone back
// under the star, the Murk rolls back from Croakmire, the glacier and the clouds.

import '../cast.js';
import { buildBigTop, buildShowStage, buildRockfall, buildQuarryGate, buildRingStar, buildWindChime, buildFluffhorn, buildOreCart, buildEmptyHollow, buildGloomophone } from '../../models/v7/props7.js';
import { buildBigBertha } from '../../combat/v7/troupe.js';
import { CANYON_MODELS } from '../../combat/v7/canyon.js';
import { OLDMINE, QUARRY_DOOR, QUARRY_GATE } from '../dungeons/oldmine.js';
import { ARENA_SITE } from '../../world/big/layout.js';
import { audio } from '../../engine/audio.js';
import { aboard, CART } from '../aboard.js';

// the chapter’s places
const A = ARENA_SITE;
const RING_LANE = [A.x, A.z - A.rz - 3.5];                  // the lane down to the Ring’s north gate
const STAGE = [A.x, A.z - 7.2];                             // the Understudies’ show stage
const BIGTOP = [A.x + 9.5, A.z - 3.5];
const BERTHA = [A.x - 8, A.z - 2.5];
const NOMAD = { x: -67, z: 41.5 };                          // Grandmother Tuya, among the yurts
const FLUFF = [[-96, 64], [-47, 67], [-84, 22]];            // three lost fluffhorns, sulking
const GRAZE = [-90, 50];
const STATION = [-199.5, 88.5];                             // Dusty Gulch: the railway’s end
const TOWER = [-190, 80];
const MINE = [-214, 19.5];
const YARD = [-213.5, 31];
const CHIMES = [[-72, 58], [-40, 42], [-58, 90]];
const NUGGETS = [[-182.5, 76], [-178.5, 86.5], [-175.5, 97.5]];
const HELMET = [-217.5, 37.5];
const SNEEZE = [[-196, -44], [-88, -100], [-62, -64]];
const MOREL = [-147.5, -66];
const GATHER = [A.x, A.z + 2.2];

// ------------------------------------------------------------------ the Human Cannonball
async function bigTop(S) {
  await S.scene(async (st) => {
    const P = S.P;
    P.gatherAt(RING_LANE[0], RING_LANE[1] + 1.5, 1.6);
    const [sx, sz] = STAGE, Ac = st.act, TRIO = ['minnow', 'fidget', 'brick'];
    // (up on the boards, behind the house curtain)
    st.actor('minnow', sx, sz + 0.2, { face: { x: 0, z: 1 } });
    st.actor('fidget', sx - 2.2, sz + 0.5, { face: { x: 0.3, z: 1 } });
    st.actor('brick', sx + 2.3, sz + 0.5, { face: { x: -0.3, z: 1 } });
    const gy = Ac.ground(st.actorOf('minnow').n) + 0.5;
    for (const id of TRIO) st.actorOf(id).n.seatY = gy;
    const drape = Ac.curtain('house', sx, gy, sz + 1.25, { w: 6, h: 2.7 });
    await st.cam(BIGTOP[0], BIGTOP[1], { dur: 0, ppu: st.basePpu() });
    await st.say('narrator', 'The Festival Ring is packed. Somebody has pitched a striped big top on the sand… and rolled in a giant cannon.');
    await st.cam(sx, sz + 2, { dur: 1.4 });
    // a drum roll, the curtain parts on their tableau, and a spotlight finds it
    for (let k = 0; k < 8; k++) { st.sfx('tick', { volume: 0.5, pitch: k }); await st.wait(0.07); }
    st.music('bigtop');
    drape.open(0.6);
    Ac.spot('act', [sx, sz + 0.4, gy], { r: 2.8, h: 8, dim: 0.3, pool: false });
    Ac.troupe(TRIO, ['vee', 'present', 'present'], { flub: 1, lag: 0.1, delay: 0.3 });
    st.sfx('cheer', { volume: 0.7 });
    Ac.push([sx, sz + 0.4, gy], { mul: 2, dur: 0.5, dz: 0.5 });
    await st.wait(0.9);
    Ac.play('minnow', 'flourish');
    await st.say('minnow', 'LADIES! GENTLEMEN! The Understudies present… {big}THE HUMAN CANNONBALL!{/}', { expr: 'smug', shake: 1 });
    Ac.rest(['minnow', 'fidget']); Ac.play('brick', 'flex');
    st.hop('brick');
    await st.say('brick', 'Brick… is cannonball.', { expr: 'happy' });
    st.heroesFace(sx, sz);
    Ac.play('fidget', 'shrug');
    await st.say('fidget', 'And you, in the audience: you are {key}part of the act{/}. Sorry.', { expr: 'neutral' });
    // (three stamps for three words — and Brick marches off to his cannon)
    Ac.pull(0.4);
    Ac.play('minnow', 'tantrum'); Ac.play('fidget', 'ears');
    Ac.after(0.9, () => { Ac.play('brick', 'salute').then(() => { st.face('brick', sx - 6, sz + 0.9); Ac.play('brick', 'march'); Ac.glide('brick', sx - 3.6, sz + 0.9, 2.2, { lin: true }); }); });
    await st.say('minnow', '{shake}FIRE… THE… BRICK!{/}', { expr: 'angry', shake: 1 });
    st.sfx('boom', { volume: 0.8 }); st.shake(0.4);
    st.mark('bigTop');
    await st.title('The Human Cannonball', 'the Understudies’ big act', 2.4);
  });
}

// (the act: Minnow, Fidget, and Brick fired out of Big Bertha — respawned whole
// if the heroes leave and come back)
function spawnAct(S) {
  const C = S.P.combat, B = S.props && S.props.get('bertha');
  if (!C) return;
  const lv = 10, out = [];
  const mk = (type, x, z) => { const e = C.spawn(type, x, z, { level: lv }); e.saga = true; e.sagaTag = 'cannonball'; out.push(e); return e; };
  mk('minnow', STAGE[0] - 1.5, STAGE[1] + 3);
  mk('fidget', STAGE[0] + 1.5, STAGE[1] + 3);
  const b = mk('brick', BERTHA[0] + 1.2, BERTHA[1] + 1.2);
  b.cannon = { x: BERTHA[0], z: BERTHA[1], obj: B ? B.obj : null };
  b.def.boss = true; b.def.title = 'Brick, the Human Cannonball';
  b.state = 'toCannon';
  return out;
}
function ensureAct(S) {
  const q = S.st.q.c3_west, st = S.stepDef('c3_west');
  if (!q || q.done || !st || st.do !== 'kill' || S.running) return;
  const C = S.P.combat;
  if (!C || C.enemies.some((e) => e.alive && e.sagaTag === 'cannonball')) return;
  const near = S.P.players.some((p) => (p.connected || S.P.solo) && Math.hypot(p.pos.x - A.x, p.pos.z - A.z) < 24);
  if (!near) return;
  q.n = 0;
  spawnAct(S);
}

async function afterAct(S) {
  await S.scene(async (st) => {
    const P = S.P, [sx, sz] = STAGE, Ac = st.act, TRIO = ['minnow', 'fidget', 'brick'];
    P.gatherAt(A.x, A.z + 1.5, 1.6);
    st.actor('minnow', sx - 1.2, sz + 3, { face: { x: 0, z: 1 } });
    st.actor('fidget', sx + 0.4, sz + 3.3, { face: { x: -0.4, z: 1 } });
    st.actor('brick', sx + 2, sz + 3.1, { face: { x: -0.3, z: 1 } });
    // (the act is over — its fallen fighters make way for the actors: two of them flat out, Minnow
    // on his feet, just)
    if (P.combat) for (const q of P.combat.enemies) if (q.sagaTag === 'cannonball' && !q.alive && q.fading > 0) { q.fading = 0; q.remove(); }
    Ac.play('fidget', 'out'); Ac.play('brick', 'prone'); Ac.play('minnow', 'wobble');
    await st.cam(A.x, A.z - 2, { dur: 0.8 });
    st.sfx('page', { volume: 0.7 });
    st.fx('leaf', sx - 1.2, 1.4, sz + 3.2, 1, { color: '#fbf6ec' });
    await st.say('narrator', 'A note falls out of Minnow’s costume.');
    Ac.play('minnow', 'think');
    await st.say('narrator', '“Understudies — after the act, carry {key}the Steppe’s Hearthstone{/} to Foreman Grubb, at {key}the Old Mine{/}. — Her Radiance, the Duchess”');
    Ac.play('minnow', 'gasp');
    Ac.play('fidget', 'rise'); Ac.play('brick', 'getup', { delay: 0.3 });
    await st.say('minnow', 'The Hearthstone? …That big stone we dug up under the Ring!', { expr: 'worried' });
    // where the Steppe’s Great Hearth burned: a cold, empty hollow under the star
    await st.cam(A.x, A.z, { dur: 0.9 });
    st.flash('#2a1a3a', 0.4);
    st.mark('emptyHearth');
    await st.say('narrator', 'Under the star in the sand, the Steppe’s Great Hearth is gone. Only a cold, empty hollow is left.');
    // Her Radiance, on the line
    // (it rises from a trapdoor at the front of the stage, big and brassy, and hums)
    const horn = buildGloomophone(P.r3d);
    horn.scale.setScalar(1.7);
    const hx = sx + 0.4, hz = sz + 1.3;
    st.prop('horn', horn, hx, -2.2, hz);
    await st.cam(sx, sz + 2, { dur: 0.7 });
    st.move('horn', { y: 0.35 }, 0.6);
    st.sfx('boom', { volume: 0.6, pitch: -8 }); st.shake(0.3);
    st.flash('#6a3a8e', 0.25);
    await st.wait(0.6);
    const blare = (n = 8) => { st.fx('note', hx, 2.6, hz + 0.6, n); st.fx('smoke', hx, 2.4, hz + 0.4, 3, { color: '#6a4a8e' }); };
    // (her voice bulges the horn; the three of them jump to attention — one late)
    blare(10); Ac.swell('horn', 1.35);
    st.mark('gloomophone');
    Ac.troupe(TRIO, 'salute', { flub: 1 });
    await st.say('duchess', '{big}UNDERSTUDIES!{/}', { shake: 1 });
    for (const id of TRIO) st.emote(id, 'exclaim');
    blare(); Ac.swell('horn', 1.2);
    Ac.play('minnow', 'beg'); Ac.play('fidget', 'cower'); Ac.play('brick', 'slump', { delay: 1.6 });
    await st.say('duchess', 'I asked for a SPECTACLE. I got… a brick in a bucket.', { expr: 'angry' });
    // (the horn swings round to the heroes)
    blare(); st.move('horn', { ry: 0.5 }, 0.4);
    Ac.react('heroes', 'recoil', { from: [hx, hz], step: 0.4 });
    await st.say('duchess', 'Ah. The Lamp-lickers. Light all the flames you like: I shall snuff them all again.', { expr: 'smug' });
    blare(12); st.move('horn', { ry: 0 }, 0.3); Ac.swell('horn', 1.5, 0.6); st.shake(0.4);
    Ac.troupe(TRIO, 'duck', { lag: 0.08 });
    await st.say('duchess', 'Understudies! The Hearthstone. {key}To the mine{/}. NOW!', { expr: 'angry' });
    st.sfx('poof', { volume: 0.6 });
    await st.move('horn', { y: -2.4 }, 0.35);
    st.dropProp('horn');
    Ac.play('minnow', 'point', { mirror: true });
    await st.say('minnow', 'Understudies! Exit… stage… WEST!', { expr: 'shock', hop: true });
    // two run west; Brick runs east, looks about him, and thunders after them
    Ac.play('minnow', 'panic'); Ac.play('fidget', 'panic'); Ac.play('brick', 'panic');
    for (const id of ['minnow', 'fidget']) st.walk(id, A.x - A.rx - 3, A.z, { speed: 7 });
    await st.walk('brick', sx + 4, sz + 3.2, { speed: 6 });
    await Ac.play('brick', 'look', { rate: 2 });
    Ac.play('brick', 'panic');
    st.walk('brick', A.x - A.rx - 3, A.z + 0.6, { speed: 9 });
    await st.wait(1);
    for (const id of TRIO) st.hide(id);
    // Grandmother Tuya, down from the stands
    st.actor('tuya', A.x + 5, A.z - 3, { face: { x: -1, z: 0.5 } });
    st.walk('tuya', A.x + 2, A.z + 0.2, { speed: 2 });
    await st.cam(A.x + 1, A.z + 1, { dur: 0.8 });
    await st.say('tuya', 'Hmph. Off they run with our Hearthstone: west, to the canyon.', { expr: 'neutral' });
    await st.say('tuya', 'I am Tuya, of the nomads. Come to {key}the Nomad Camp{/}, north-west of here: we must talk.', { expr: 'worried' });
  });
}

// ------------------------------------------------------------------ the nomads
async function tuyaTalk(S) {
  await S.say('tuya', 'Welcome, little lantern. Last night the gloom took our grazing ground and scattered our fluffhorns.', { expr: 'worried' });
  await S.say('tuya', 'Don’t pet them, by the way. They bite.', { expr: 'happy' });
  await S.say('temur', 'They don’t BITE. They nibble. Enthusiastically.', { expr: 'happy' });
  await S.say('tuya', '{key}Three{/} are still lost on the steppe. Bring them home, and I’ll show you the road to {key}the Old Mine{/}.', { expr: 'neutral' });
}
async function tuyaThanks(S) {
  await S.say('tuya', 'All home, and the grass is quiet again. Thank you, little lantern.', { expr: 'happy' });
  await S.say('temur', 'I’ll ride ahead to Dusty Gulch and tell the sheriff you’re coming!', { expr: 'happy', hop: true });
  await S.say('tuya', 'Follow the canyon road {key}west{/} to {key}Dusty Gulch{/}. From there, the rails climb to the Old Mine.', { expr: 'neutral' });
}

// ------------------------------------------------------------------ Dusty Gulch
async function gulchArrival(S) {
  await S.scene(async (st) => {
    const P = S.P, [x, z] = STATION;
    P.gatherAt(x + 2, z + 1.5, 1.4);
    st.actor('dolly', -213.5, 91.2, { face: { x: 1, z: 0.2 } });
    st.actor('temur', x - 1.5, z + 3.2, { face: { x: 1, z: -0.3 } });
    await st.cam(-203, 86, { dur: 0, ppu: Math.max(8, st.basePpu() / 2) });
    st.sfx('gust', { volume: 0.6 });
    for (let k = 0; k < 10; k++) st.fx('dust', -210 + Math.random() * 20, 0.3, 82 + Math.random() * 10, 1, { color: '#d8a878' });
    await st.say('narrator', 'Dusty Gulch: one street, one saloon, one water tower, and a great deal of dust.');
    await st.cam(x - 3, z + 2, { dur: 1.1, ppu: st.basePpu() });
    st.walk('dolly', x - 2.4, z + 1.8, { speed: 3 });
    await st.wait(0.9);
    st.heroesFace(x - 2.4, z + 1.8);
    await st.say('dolly', 'Hold it, strangers. I’m Sheriff Dolly. Temur says you’re Lamplighters.', { expr: 'neutral' });
    await st.say('temur', 'I did! Twice! Loudly!', { expr: 'happy' });
    await st.say('dolly', 'Foreman Grubb’s moles took {key}the Old Mine{/}. Now they’ve drilled into our spring: the water tower is dry.', { expr: 'worried' });
    await st.say('dolly', 'Chase those varmints off {key}the water tower{/}, and I’ll owe you one.', { expr: 'neutral' });
  });
}
async function boomTalk(S) {
  await S.say('boom', 'Nice work, youngsters! I’m Old Boom: sixty years a Human Cannonball.', { expr: 'smug' });
  await S.say('boom', 'That red cannon at the Festival Ring is BIG BERTHA. MY cannon!', { expr: 'shock' });
  await S.say('boom', 'I got her thirty years ago, at the Starfall Festival. That night, a hen ran on stage and tripped a young opera singer.', { expr: 'neutral' });
  await S.say('boom', 'We all laughed. Me too.{p} She never sang here again.', { expr: 'sad' });
  await S.say('boom', '…Anyway! Grubb’s crew is loading something {key}green and gold{/} at {key}the station{/}. Right now!', { expr: 'worried' });
}

// ------------------------------------------------------------------ the ore cart chase
async function theChase(S) {
  const P = S.P;
  const rail = (P.big && P.big.map.rails && P.big.map.rails[0] && P.big.map.rails[0].pts) || [[-214, 28], [-208, 42], [-200, 54], [-194, 64], [-196, 76], [-200, 86]];
  const up = [...rail].reverse();                      // from the Gulch up to the mine
  const end = up.length - 1;                           // (the line’s end, in the yard: Grubb alone goes on into the mine)
  up.push([MINE[0], MINE[1] + 2.5]);
  let trip = null;
  try {
    await S.scene(async (st) => {
      const [x0, z0] = up[0];
      P.gatherAt(x0 + 3.2, z0 + 3, 1.4);
      st.actor('grubb', x0 - 1.2, z0 + 0.8, { face: { x: 1, z: 0.4 } });
      const cart = buildOreCart(P.r3d, { stone: true });
      st.prop('grubbCart', cart, x0, 0, z0);
      const moles = [0, 1].map((i) => { const m = CANYON_MODELS.mole(P.r3d); m.rotation.y = i ? -0.6 : 0.5; st.prop('mole' + i, m, x0 + (i ? 1.4 : -2.2), 0, z0 + (i ? -0.8 : -0.4)); return m; });
      void moles;
      await st.cam(x0, z0 + 1.2, { dur: 0, ppu: st.basePpu() });
      await st.say('grubb', 'Oi! Hands off! This {key}Hearthstone{/} belongs to the mine now!', { expr: 'angry' });
      st.actor('dolly', x0 + 6, z0 + 3, { face: { x: -1, z: -0.3 } });
      st.walk('dolly', x0 + 3.8, z0 + 2.2, { speed: 5 });
      await st.say('dolly', '{shake}GRUBB!{/} Put that stone DOWN!', { expr: 'angry' });
      await st.say('grubb', 'Not today, Sheriff! Next stop: {key}the Old Mine{/}! Mind the doors!', { expr: 'smug', hop: true });
      // (he jumps in, the moles give it a shove)
      st.hide('grubb');
      for (let i = 0; i < 2; i++) st.dropProp('mole' + i);
      st.sfx('whoosh', { volume: 0.7 });
      // the heroes grab the town’s carts and give chase: one each — two to a cart past four
      trip = aboard(st);
      const n = trip.heroes.length, two = n > 4 ? 2 : 1;
      const carts = Array.from({ length: Math.ceil(n / two) }, (_, i) => { const o = buildOreCart(P.r3d); st.prop('cart' + i, o, x0, 0, z0 + 3 + i * 1.9); trip.seat(o, CART, { max: two, hop: true }); return o; });
      await trip.settled();
      st.music('battle');
      // everyone rides up the line (each cart stops behind the one before, at the line’s end);
      // the camera rides the first hero’s cart
      const ride = async (key, o, delay, speed, last = up.length - 1, back = 0) => {
        await st.wait(delay);
        let px = o.position.x, pz = o.position.z;
        for (let i = 1; i <= last; i++) {
          let [x, z] = up[i];
          if (i === last && back) { const [ax, az] = up[i - 1], l = Math.hypot(x - ax, z - az) || 1; x -= ((x - ax) / l) * back; z -= ((z - az) / l) * back; }
          const L = Math.hypot(x - px, z - pz);
          o.rotation.y = Math.atan2(x - px, z - pz);
          await st.move(key, { x, z }, L / speed, { ease: 'lin' });
          if (o.userData.roll) o.userData.roll(L);
          px = x; pz = z;
        }
      };
      trip.ride(carts[0], { dz: -1, ky: 0 });
      const booms = (async () => {
        for (const gap of [1.4, 1.8, 1.8]) {
          await st.wait(gap);
          const g = st.propOf('grubbCart');
          if (!g) break;
          const bx = g.position.x + (Math.random() - 0.5) * 3, bz = g.position.z + 3 + Math.random() * 2;
          st.sfx('boom', { volume: 0.7 }); st.shake(0.4);
          st.fx('smoke', bx, 0.6, bz, 14, { color: '#8a7a6a' });
          st.fx('sparkle', bx, 0.8, bz, 10, { color: '#ffb040' });
          if (st.vfx) st.vfx.shockwave(bx, bz, { r: 2, color: '#ff9a3a', life: 0.4, wall: 0.5 });
        }
      })();
      st.mark('cartChase');
      await Promise.all([ride('grubbCart', cart, 0, 11), ...carts.map((o, i) => ride('cart' + i, o, 0.9 + i * 0.35, 10.5, end, i * 2.1)), booms]);
      trip.ride(null);
      // the mine’s mouth, blown shut behind him
      st.dropProp('grubbCart');
      st.sfx('boom', { volume: 1 }); st.shake(0.9); st.flash('#fff0d0', 0.4);
      S.flag('mineShut');
      st.fx('dust', MINE[0], 1, MINE[1] + 2, 40, { color: '#b8704a' });
      if (st.vfx) st.vfx.shockwave(MINE[0], MINE[1] + 2, { r: 4, color: '#c88a5a', life: 0.6, wall: 1 });
      await st.wait(0.8);
      // (everyone out, at the yard, beside the carts)
      trip.land(YARD[0] + 2, YARD[1] + 0.6, { face: [MINE[0], MINE[1] + 2] });
      st.mark('yard');
      await st.cam(YARD[0], YARD[1] - 2, { dur: 0.6 });
      st.music(null);
      await st.say('narrator', 'Grubb has blown the tunnel shut behind him. From under the rubble: “Ha-HA! Go home!”');
      st.actor('hazel', YARD[0] - 5, YARD[1] - 3, { face: { x: 1, z: 0.5 } });
      st.hop('hazel'); st.emote('hazel', 'exclaim');
      st.sfx('boing', { volume: 0.6 });
      await st.say('hazel', 'Oh my, a real ore cart chase! I am Professor Hazel.', { expr: 'love' });
      await st.say('hazel', 'I have mapped this whole canyon: there is {key}another way in{/}. Come and see!', { expr: 'happy' });
    }, { bars: true });
  } finally { if (trip) trip.end(); }
}
async function hazelTalk(S) {
  await S.say('hazel', 'Long before the mine, the Lamplighters dug a quarry here. Its old road is behind that gate.', { expr: 'happy' });
  await S.say('hazel', 'Let me just… hnnng… there!', { expr: 'angry' });
  S.flag('quarryOpen');
  audio.sfx('slam', { volume: 0.7 });
  S.P.world.fx.emit('dust', QUARRY_GATE[0] + 0.6, 1, QUARRY_GATE[1], 14, { color: '#b8704a' });
  await S.say('hazel', 'Mind Grubb’s moles: they have dynamite. Take {key}the old quarry road{/} into {key}the Old Mine{/}!', { expr: 'worried' });
}

// ------------------------------------------------------------------ the Old Mine’s scripts
const R = (id) => OLDMINE.rooms.find((r) => r.id === id);
const mid = (d, r, dz = 0) => ({ x: d.ox + r.x + r.w / 2, z: d.oz + r.z + r.h / 2 + dz });
const pose = (e) => { e.spawnT = 0; e.obj.scale.setScalar(1); e.obj.position.set(e.x, e.y, e.z); if (e.shadow) e.shadow.position.set(e.x, 0.02, e.z); };

// the Mole Brothers: Pick, Shovel… and Doug
R('brothers').run = async (S, d, r) => {
  const C = S.P.combat, c = mid(d, r, -1);
  if (!C) return;
  r.foes = [-3.5, 0, 3.5].map((dx, i) => {
    const e = C.spawn('molebro', c.x + dx, c.z - 2, { level: d.def.lv[1], quiet: true });
    e.saga = true; e.sagaTag = 'brothers'; e.state = 'roar'; e.timer = 99; e.home = { x: c.x, z: c.z };
    e.def.title = ['Pick, the eldest Mole Brother', 'Shovel, the middle Mole Brother', 'Doug'][i];
    pose(e); e.obj.visible = false;            // (still under the ground)
    return e;
  });
  C.bounds = { x: c.x, z: c.z + 1, rx: r.w / 2 - 2, rz: r.h / 2 - 1.5 };
  await S.scene(async (st) => {
    await st.cam(c.x, c.z, { dur: 0.8 });
    st.sfx('dig', { volume: 0.8 });
    await st.wait(0.5);
    for (const [i, e] of r.foes.entries()) { e.obj.visible = true; pose(e); st.fx('dust', e.x, 0.3, e.z, 12, { color: '#a86a4a' }); st.sfx('slam', { volume: 0.5, pitch: i * 3 }); await st.wait(0.35); }
    await st.say('narrator', '“Pick!” “Shovel!”{p} “…and Doug.”');
    await st.say('narrator', '“We’re the {shake}MOLE BROTHERS!{/}”');
    await st.title('The Mole Brothers', 'Pick, Shovel & Doug', 2.2);
  });
  for (const e of r.foes) { e.state = 'chase'; e.timer = 0.6 + Math.random(); }
};
R('brothers').tick = (S, d, r) => {
  if (r.done || !r.foes || r.foes.some((e) => e.alive)) return;
  r.done = true;
  const C = S.P.combat;
  if (C) C.bounds = null;
  (async () => {
    await S.P.wait(1);
    await S.say('narrator', '“Aw, nuts. Doug, you had ONE job.”{p} “…Sorry.”');
    const G = d.gate('g6');
    if (G) d.setGate(G, true);
  })();
};

// Foreman Grubb & the Drillosaur: the pit’s floor bursts open
R('pit').run = async (S, d, r) => {
  const C = S.P.combat, c = mid(d, r, -1);
  if (!C) return;
  const e = C.spawn('drillosaur', c.x, c.z - 2, { level: d.def.lv[1] + 1, quiet: true });
  e.saga = true; e.home = { x: c.x, z: c.z }; e.state = 'roar'; e.timer = 99;
  r.boss = e; pose(e); e.obj.visible = false;   // (still under the pit’s floor)
  C.bounds = { x: c.x, z: c.z + 1, rx: r.w / 2 - 2, rz: r.h / 2 - 1.5 };
  await S.scene(async (st) => {
    await st.cam(c.x, c.z + 1, { dur: 0.9 });
    await st.say('narrator', 'The pit goes very quiet.{p} Then the floor starts to hum.');
    for (let k = 0; k < 6; k++) { st.shake(0.3 + k * 0.08); st.sfx('thud', { volume: 0.4 + k * 0.08 }); st.fx('dust', c.x + (Math.random() - 0.5) * 6, 0.3, c.z - 2 + (Math.random() - 0.5) * 4, 6, { color: '#a86a4a' }); await st.wait(0.22); }
    e.obj.visible = true; pose(e);
    st.sfx('boom', { volume: 0.9 }); st.shake(1); st.flash('#fff0d0', 0.3);
    if (st.vfx) st.vfx.shockwave(c.x, c.z - 2, { r: 5, color: '#c88a5a', life: 0.7, wall: 1 });
    st.fx('dust', c.x, 0.5, c.z - 2, 40, { color: '#a86a4a' });
    await st.wait(0.6);
    st.mark('drillosaur');
    await st.say('grubb', 'Welcome to the Old Mine, Lamplighters! Hard hats are {shake}MANDATORY!{/}', { expr: 'smug', shake: 1 });
    await st.say('grubb', 'The Duchess wants gloom by the ton, and my Drillosaur digs it by the ton. Nothing personal!', { expr: 'neutral' });
    await st.title('Foreman Grubb', 'and his Drillosaur', 2.4);
  });
  e.state = 'chase'; e.timer = 1.2;
};
R('pit').tick = (S, d, r) => {
  const e = r.boss;
  if (!e || r.done || e.alive) return;
  r.done = true;
  const C = S.P.combat;
  if (C) { C.bounds = null; for (const q of C.enemies) if (q.alive && q.summoner === e) { q.alive = false; q.fading = 0; q.remove(); } }
  (async () => {
    await S.P.wait(1.1);
    await S.scene(async (st) => {
      const x = e.x, z = e.z;
      await st.cam(x, z + 1, { dur: 0.7 });
      st.fx('smoke', x, 1.5, z, 30, { color: '#f4f0ec' });
      st.sfx('crackle', { volume: 0.8 });
      st.actor('grubb', x + 1.6, z + 1.4, { face: { x: -0.6, z: 1 } });
      await st.say('grubb', 'Alright, ALRIGHT! I quit! I’m off to find honest work, with fewer Lamplighters in it.', { expr: 'angry' });
      await st.say('grubb', 'Your precious {key}Hearthstone{/} is behind {key}that gate{/}. Take it!', { expr: 'neutral' });
      st.walk('grubb', x + 12, z + 2, { speed: 5 });
      await st.wait(1.2);
      st.hide('grubb');
      const G = d.gate('g7');
      if (G) d.setGate(G, true);
      const rr = d.rooms.find((q) => q.id === 'vault');
      if (rr) rr.ready = true;
    });
    audio.jingle('festival');
  })();
};

// the Steppe’s Hearthstone
R('vault').take = async (S, d, r) => {
  await S.scene(async (st) => {
    const x = d.ox + r.item[0], z = d.oz + r.item[1];
    await st.cam(x, z + 1.5, { dur: 0.6 });
    st.flash('#e8ffc8', 0.5);
    if (st.vfx) st.vfx.pillar(x, z, { r: 0.9, h: 6, color: '#b8ffb0', life: 1.4 });
    st.sfx('shard', { volume: 0.9 });
    S.flag('hearthstone');
    await st.say('narrator', 'The Hearthstone is warm, and hums like a summer field.{p} It wants to go home: to {key}the Festival Ring{/}.');
  });
  await d.D.exit({ done: true });
};

// ------------------------------------------------------------------ the Steppe sings again
async function relight(S) {
  await S.scene(async (st) => {
    const P = S.P;
    P.gatherAt(GATHER[0], GATHER[1], 1.4);
    for (const [id, dx, dz] of [['tuya', -3, 0.5], ['temur', -4, 2], ['dolly', 3.2, 0.6], ['boom', 4.2, 2.2], ['nell', 2.2, 3.4], ['hazel', -2.2, 3.4]]) st.actor(id, A.x + dx, A.z + dz, { face: { x: -dx, z: -dz } });
    await st.cam(A.x, A.z + 1, { dur: 0, ppu: st.basePpu() });
    const stone = buildOreCart(P.r3d, { stone: true });
    st.prop('stone', stone, A.x, 0, A.z - 1.6);
    await st.say('narrator', 'The Hearthstone slides back into its hollow under the star.');
    st.dropProp('stone');
    st.sfx('chime', { volume: 0.9 });
    st.flash('#e8ffc8', 0.6);
    st.shake(0.6);
    if (st.vfx) { st.vfx.pillar(A.x, A.z, { r: 1.6, h: 9, color: '#b8ffb0', life: 1.6 }); st.vfx.shockwave(A.x, A.z, { r: 12, color: '#d8ffb0', life: 1.4, wall: 1.2 }); }
    S.flag('steppeLit');
    st.sfx('cheer', { volume: 0.8 });
    await st.lights(0, 0, 1.4);
    // the light rolls on: over the valley to the marsh, the glacier and the clouds
    await st.cam(250, 10, { dur: 3, ppu: Math.max(8, st.basePpu() / 2) });
    S.openZones(['marsh', 'glacier', 'cloud']);
    if (P.murk) P.murk.pulse(-1);
    st.sfx('whoosh', { volume: 0.7, pitch: 8 });
    await st.wait(1.4);
    st.mark('murkBack3');
    await st.wait(0.8);
    await st.title('The Steppe sings again', 'The Murk rolls back from Croakmire, Frostpeak Glacier and the Cloud Isles', 4);
    await st.cam(A.x, A.z + 1, { dur: 1.4, ppu: st.basePpu() });
    await st.say('tuya', 'The Steppe’s Great Hearth burns again. {key}Three flames{/} in your lantern now!', { expr: 'happy' });
    await st.say('boom', 'And I’m taking Big Bertha home.{p} BOOM.', { expr: 'happy' });
    // Perkins, with a letter that smells like a pond
    const p = st.actor('perkins', A.x + 7, A.z - 4, { face: { x: -1, z: 0.4 } });
    p.n.seatY = 6;
    st.walk('perkins', A.x + 1, A.z - 0.8, { speed: 7 });
    for (let k = 0; k < 12; k++) { p.n.seatY = Math.max(0, 6 - k * 0.55); await st.wait(0.05); }
    p.n.seatY = undefined;
    st.sfx('thud', { volume: 0.8 }); st.shake(0.3);
    await st.say('perkins', 'PELICAN POST! An urgent letter, from a king… It smells like a pond.', { expr: 'happy', hop: true });
    await st.say('narrator', '“HELP. CROWN. GONE. RIBBIT. — His Majesty King Croakington of Croakmire”');
    await st.say('hazel', 'The marsh of {key}Croakmire{/} has a Great Hearth too, under the king’s throne. Go there: it lies east of the valley!', { expr: 'happy' });
  });
}

// ------------------------------------------------------------------ the chapter
const fluffWant = (S, k) => { const q = S.st.q.c3_nomads; return !!q && !q.done && !S.st.got['c3_nomads:1:' + k]; };
export const CH3 = {
  id: 3, title: 'Dust & Spores',
  recap: 'Two Great Hearths burn again: Old Glimmer and the Deepwood’s. The Duchess has had the Steppe’s stolen: its stone, {key}the Hearthstone{/}, has gone west, to the Old Mine. Take it back and set it under the star of {key}the Festival Ring{/}.',
  lv: 9, zones: ['steppe', 'canyon', 'bouncecap'], opens: ['marsh', 'glacier', 'cloud'],
  props: [
    { id: 'bigtop', at: BIGTOP, r: 3, build: (r3d) => buildBigTop(r3d), when: (S) => !S.done('c3_relight') },
    { id: 'stage', at: STAGE, build: (r3d) => buildShowStage(r3d), when: (S) => !S.done('c3_relight') },
    { id: 'bertha', at: BERTHA, r: 1.2, build: (r3d) => { const g = buildBigBertha(r3d); g.userData.aimAt(1, -0.25); return g; }, when: (S) => !S.done('c3_relight') },
    { id: 'hollow', at: [A.x, A.z], build: (r3d) => buildEmptyHollow(r3d), when: (S) => S.done('c3_west') && !S.done('c3_relight') },
    { id: 'berthaHome', at: [-208.5, 84.8], r: 1.2, build: (r3d) => { const g = buildBigBertha(r3d); g.userData.aimAt(0.4, 1); return g; }, when: (S) => S.done('c3_relight') },
    { id: 'rockfall', at: [MINE[0], MINE[1] + 1.4], r: 2.2, build: (r3d) => buildRockfall(r3d), when: (S) => S.has('mineShut') },
    { id: 'quarryGate', at: QUARRY_GATE, build: (r3d, S) => buildQuarryGate(r3d, S) },
    { id: 'ringStar', at: [A.x, A.z], build: (r3d) => buildRingStar(r3d), when: (S) => S.done('c3_relight') },
    ...CHIMES.map(([x, z], k) => ({ id: 'chime' + k, at: [x, z], r: 0.2, build: (r3d, S) => buildWindChime(r3d, 'chime' + k, S), when: (S) => !!S.st.q.c3_chimes })),
    ...FLUFF.map(([x, z], k) => ({ id: 'fluff' + k, at: [x, z], r: 0.4, build: (r3d) => { const g = buildFluffhorn(r3d); g.rotation.y = k * 2.1; return g; }, when: (S) => fluffWant(S, k) })),
  ],
  npcs: [
    { id: 'tuya', at: [NOMAD.x, NOMAD.z], face: { x: 0.3, z: 1 }, when: (S) => S.done('c3_west'),
      lines: ['The Steppe’s Great Hearth belongs under the star of the Festival Ring.', 'Temur rides like the wind, and makes as much noise.'] },
    { id: 'temur', at: [NOMAD.x + 2.6, NOMAD.z + 0.8], face: { x: -0.5, z: 1 }, when: (S) => S.done('c3_west') && !S.st.q.c3_gulch,
      lines: ['A scared fluffhorn hides behind a rock and sulks.', 'Grandmother says I’m too loud. I say the steppe is too quiet!'] },
    { id: 'temur', at: [-201.5, 91.2], face: { x: 0.6, z: 1 }, when: (S) => !!S.st.q.c3_gulch,
      lines: ['So many walls in Dusty Gulch! How do they see the sky?', 'From here, the rails climb north to the Old Mine.'] },
    { id: 'dolly', at: [-213.5, 91.2], face: { x: 0.4, z: 1 }, when: (S) => S.done('c2_relight'),
      lines: ['Dusty Gulch: population forty-two. Forty-three with the goat.', 'Nobody goes thirsty in my town. Not while I’m sheriff.'] },
    { id: 'boom', at: [-203.3, 84.6], face: { x: 0, z: 1 }, when: (S) => S.done('c2_relight'),
      lines: ['Sixty years a Human Cannonball, and I never once landed where I aimed.', 'Big Bertha was a beauty. She still is.'] },
    { id: 'nell', at: [-184.2, 88.6], face: { x: 1, z: 0.3 }, when: (S) => S.done('c2_relight'),
      lines: ['There’s gold in them there hills! Well… there was.', 'Panning for gold takes patience, and wet socks.'] },
    { id: 'hazel', at: [YARD[0] - 4.5, YARD[1] - 1], face: { x: 1, z: 0.5 }, when: (S) => S.has('mineShut') && !S.done('c3_relight'),
      lines: ['The old quarry road is through the gate, west of the yard.', 'The Lamplighters signed their maps with a little flame. (Footnote: I have eleven.)'] },
    { id: 'morel', at: MOREL, face: { x: 0, z: 1 }, when: (S) => S.done('c2_relight'),
      lines: ['Hello, big ones! Mind your big feet.', 'We Sporefolk always bounce back.'] },
  ],
  // (the Human Cannonball’s act keeps its cast on stage while it lasts)
  update(S, dt) {
    S.actT = (S.actT || 0) - dt;
    if (S.actT > 0) return;
    S.actT = 0.5;
    ensureAct(S);
  },
  quests: {
    // ---- a mini-game, to play again and again (World v7 M13)
    c3_minecart: {
      title: 'The Minecart Rush',
      brief: 'Nugget Nell’s ore cart keeps slipping its brake and rolling round Dusty Gulch. {key}Catch it{/} for some stardust, as many times as you like.',
      kind: 'side', repeat: true, giver: 'nell', after: 'c3_relight', lv: 12, dust: 15,
      offer: async (S) => {
        await S.say('nell', 'Dagnabbit! My ore cart has slipped its brake again!', { expr: 'angry' });
        await S.say('nell', '{key}Catch it{/} as it rolls round Dusty Gulch: it slows at the corners. Stardust for you each time!', { expr: 'happy' });
      },
      steps: [
        { do: 'chase', text: 'Catch {key}the runaway ore cart{/} in the streets of Dusty Gulch', area: [-196, 86, 6], speed: 6.2, tire: 18, model: (r3d) => buildOreCart(r3d), sound: 'thud', caught: 'Gotcha, cart!' },
        { do: 'talk', npc: 'nell', text: 'Bring her cart back to {key}Nugget Nell{/}', run: async (S) => {
          if (S.plays('c3_minecart')) await S.say('nell', 'Again! That cart only runs off when YOU are in town.', { expr: 'smug' });
          else await S.say('nell', 'Whoa there! Caught fair and square. Here’s your stardust.', { expr: 'love' });
        } },
      ],
    },
    c3_west: {
      title: 'The Big Top',
      brief: 'The Steppe’s Great Hearth lies under the Festival Ring. The Duchess’s three Understudies have set up a circus right on top of it: go and {key}stop their act{/}.',
      auto: true, lv: 9,
      steps: [
        { do: 'go', text: 'Go west of the valley, to {key}the Festival Ring{/}', at: RING_LANE, r: 7, run: bigTop },
        { do: 'kill', text: 'Stop the act: beat {key}the three Understudies{/} in the Festival Ring', tag: 'cannonball', n: 3, at: [A.x, A.z], r: 30, run: afterAct },
      ],
    },
    c3_nomads: {
      title: 'Riders of the Steppe',
      brief: 'The Understudies ran west with the Hearthstone. The nomads know the road: first bring back their {key}three lost fluffhorns{/} and clear their grazing ground.',
      auto: true, after: 'c3_west', lv: 10,
      steps: [
        { do: 'talk', npc: 'tuya', text: 'Talk to {key}Grandmother Tuya{/} at the Nomad Camp, north-west of the Ring', run: tuyaTalk },
        { do: 'collect', text: 'Find the {key}three lost fluffhorns{/} on the steppe around the camp', item: 'Lost Fluffhorn', n: 3, spots: FLUFF, hint: 'A fluffhorn, sulking behind a rock' },
        { do: 'camp', text: 'Chase the gloom off {key}the grazing ground{/}, west of the camp', camp: { id: 'c3_graze', at: GRAZE, level: 10, foes: ['tumble', 'tumble', 'fox', 'tumble'], n: 4, done: 'The grazing ground is quiet again!' } },
        { do: 'talk', npc: 'tuya', text: 'Go back to {key}Grandmother Tuya{/} at the Nomad Camp', run: tuyaThanks },
      ],
    },
    c3_gulch: {
      title: 'Dusty Gulch',
      brief: 'The Hearthstone is on its way to the Old Mine, above {key}Dusty Gulch{/}. Grubb’s moles have dried up the town: help Sheriff Dolly, then talk to Old Boom.',
      auto: true, after: 'c3_nomads', lv: 10,
      steps: [
        { do: 'go', text: 'Follow the canyon road west to {key}Dusty Gulch{/}', at: STATION, r: 6, run: gulchArrival },
        { do: 'camp', text: 'Chase the mole miners off {key}the water tower{/} of Dusty Gulch', camp: { id: 'c3_tower', at: [TOWER[0], TOWER[1] + 3], level: 10, foes: ['mole', 'mole', 'fuse', 'mole'], n: 4, done: 'Water gushes back into the tower!' } },
        { do: 'talk', npc: 'boom', text: 'Talk to {key}Old Boom{/} on the saloon porch, in Dusty Gulch', run: boomTalk },
      ],
    },
    c3_chase: {
      title: 'Runaway Cart',
      brief: 'Foreman Grubb fled up the rails with the Hearthstone and blew the mine’s tunnel shut. Professor Hazel knows {key}another way in{/}.',
      auto: true, after: 'c3_gulch', lv: 11,
      steps: [
        { do: 'scene', text: 'Stop {key}Foreman Grubb{/} at the station in Dusty Gulch', run: theChase },
        { do: 'talk', npc: 'hazel', text: 'Talk to {key}Professor Hazel{/} in the mine yard', run: hazelTalk },
      ],
    },
    c3_mine: {
      title: 'The Old Mine',
      brief: 'The Hearthstone is at the far end of {key}the Old Mine{/}, guarded by Foreman Grubb and his moles. Go in by the old quarry road and take it back.',
      auto: true, after: 'c3_chase', lv: 12,
      steps: [
        { do: 'go', text: 'Enter the Old Mine by {key}the old quarry road{/}, west of the yard', at: QUARRY_DOOR, r: 2.4, run: async (S) => { if (S.P.dungeons) await S.P.dungeons.enter('oldmine'); else S.flag('hearthstone'); } },
        { do: 'dungeon', id: 'oldmine', text: 'Find {key}the Steppe’s Hearthstone{/} at the far end of the Old Mine' },
      ],
    },
    c3_relight: {
      title: 'The Steppe Sings Again',
      brief: 'You have the Hearthstone! Carry it back east to {key}the Festival Ring{/} and set it under the star in the sand: the Steppe’s Great Hearth will burn again.',
      auto: true, after: 'c3_mine', lv: 12,
      steps: [
        { do: 'go', text: 'Set {key}the Hearthstone{/} under the star of {key}the Festival Ring{/}, to the east', at: [A.x, A.z], r: 3.5, run: relight },
      ],
      done: async (S) => { if (!S.st.lit.includes('steppe')) S.st.lit.push('steppe'); S.save(); },
      next: 4,
    },
    // ---- side quests
    c3_chimes: {
      title: 'Songs of the Wind',
      brief: 'The wind of the steppe forgot its songs when the Murk came. Hang Temur’s wind chimes on the {key}three old posts{/} around the Nomad Camp.',
      kind: 'side', giver: 'temur', lv: 9, when: (S) => S.done('c3_west'), dust: 25,
      offer: async (S) => {
        await S.say('temur', 'The wind forgot its songs when the Murk came. Let’s remind it!', { expr: 'happy' });
        await S.say('temur', 'Hang my chimes on the {key}three old posts{/}: by the spring, by the road, and on the hill.', { expr: 'love' });
      },
      steps: CHIMES.map(([x, z], k) => ({ do: 'go', text: ['Hang a wind chime on the post {key}by the spring{/}, south of the camp', 'Hang a wind chime on the post {key}by the road{/}, east of the camp', 'Hang a wind chime on the post {key}on the hill{/}, west of the Festival Ring'][k], at: [x, z + 1], r: 2,
        run: async (S) => {
          S.flag('chime' + k);
          S.P.world.fx.emit('sparkle', x, 2.2, z, 12, { color: '#c8e8ff' });
          audio.sfx('chime', { volume: 0.7, pitch: k * 3 });
          if (k === 2) await S.say('temur', 'Listen! Hear it? The steppe is singing again!', { expr: 'love' });
        } })),
    },
    c3_boom: {
      title: 'One Last Boom',
      brief: 'The moles took Old Boom’s lucky helmet up to {key}the mine yard{/}. Bring it back, and he will show you a real cannonball jump.',
      kind: 'side', giver: 'boom', lv: 10, when: (S) => S.done('c3_gulch'), dust: 30,
      offer: async (S) => {
        await S.say('boom', 'Those moles pinched my lucky helmet! Sixty years on my head, and only one dent.', { expr: 'sad' });
        await S.say('boom', 'It must be up in {key}the mine yard{/}. Fetch it, and I’ll show you a REAL cannonball!', { expr: 'smug' });
      },
      steps: [
        { do: 'collect', text: 'Find Old Boom’s helmet in {key}the mine yard{/}, north of Dusty Gulch', item: 'Old Boom’s Helmet', n: 1, spots: [HELMET], hint: 'A dented silver helmet, stars painted on it' },
        { do: 'talk', npc: 'boom', text: 'Bring the helmet back to {key}Old Boom{/} in Dusty Gulch',
          run: async (S) => {
            await S.say('boom', 'My helmet! Stand back, youngsters. WAY back.', { expr: 'love' });
            audio.sfx('whoosh', { volume: 0.7 });
            await S.say('narrator', 'Old Boom leaps off the saloon porch, spins three times…{p} and lands head-first in the water trough.');
            audio.sfx('splash', { volume: 0.8 });
            await S.say('boom', '{shake}TA-DAAAA!{/}{p} …I’ll need a hand getting out.', { expr: 'happy' });
          } },
      ],
    },
    c3_nell: {
      title: 'Gold Fever',
      brief: 'The spring runs again, and the river carries gold. Nugget Nell’s back won’t bend: pan {key}three nuggets{/} for her, and she pays in stardust.',
      kind: 'side', giver: 'nell', lv: 10, when: (S) => S.done('c3_gulch'), dust: 30,
      offer: async (S) => {
        await S.say('nell', 'The river is washing gold down from the hills again! I can feel it in my socks!', { expr: 'love' });
        await S.say('nell', 'My back won’t bend any more. Pan {key}three nuggets{/} for me in the river, and I’ll pay you in stardust!', { expr: 'happy' });
      },
      steps: [
        { do: 'collect', text: 'Pan {key}three gold nuggets{/} in the river, east of Dusty Gulch', item: 'Gold Nugget', n: 3, spots: NUGGETS, hint: 'Something gleams in the shallows' },
        { do: 'talk', npc: 'nell', text: 'Bring the nuggets to {key}Nugget Nell{/} in Dusty Gulch',
          run: async (S) => {
            await S.say('nell', 'NUGGETS! Real ones! We’re RICH!{p} …Well, slightly less poor.', { expr: 'love' });
          } },
      ],
    },
    c3_spores: {
      title: 'Achoo!',
      brief: 'The Mother Cap of the Sporefolk has a cold, and her sneezes spread gloom spores. Bring Old Morel {key}three sprigs of sneezewort{/} from the fairy rings.',
      kind: 'side', giver: 'morel', lv: 12, when: (S) => S.done('c2_relight'), dust: 30,
      offer: async (S) => {
        await S.say('morel', 'Big ones! The Mother Cap has a cold, and every sneeze puffs gloom spores over the woods!', { expr: 'worried' });
        await S.say('morel', 'We are too short to fetch her cure. Pick us {key}three sprigs of sneezewort{/} by the fairy rings!', { expr: 'happy' });
      },
      steps: [
        { do: 'collect', text: 'Pick {key}three sprigs of sneezewort{/} by the fairy rings of Bouncecap Woods', item: 'Sneezewort', n: 3, spots: SNEEZE, hint: 'A sprig of sneezewort, tickling the air' },
        { do: 'talk', npc: 'morel', text: 'Bring the sneezewort to {key}Old Morel{/} in Bouncecap Woods',
          run: async (S) => {
            await S.say('narrator', 'Old Morel tucks the sneezewort under the Mother Cap’s gills.');
            await S.say('narrator', '“…Aaah… AAAH…”{p} Nothing. The Mother Cap wobbles, happily.');
            await S.say('morel', 'It passed! Thank you, big ones!', { expr: 'love' });
          } },
      ],
    },
    // ---- round 12: mini-games (rounds with a score and three ranks: saga/games12.js)
    c3_herd: {
      title: 'Fluffhorn Round-Up',
      brief: 'A storm is coming, and the nomads’ fluffhorns are scattered over the grazing ground. Drive them into {key}the pen{/}, south-west of the yurts.',
      kind: 'side', repeat: true, giver: 'tuya', lv: 10, when: (S) => S.done('c3_nomads'), dust: 8,
      offer: async (S) => {
        await S.say('tuya', 'Storm tonight, and my fluffhorns are all over the grazing ground.', { expr: 'worried' });
        await S.say('tuya', 'They run from strangers. So {key}walk behind them{/}: they will run into {key}the pen{/}, south-west of here.', { expr: 'happy' });
      },
      steps: [
        { do: 'herd', text: 'Drive the fluffhorns into {key}the pen{/}, on the grazing ground south-west of the yurts', at: [-93.5, 55.4], r: 7, pen: [-86.2, 55.4], n: 6, per: 2, time: 60, model: 'fluffhorn', cry: 'squeak',
          rule: 'They run away from you: walk behind them, into the pen. {a} whistles.', verb: 'Whistle', hint: 'Walk behind them, towards the pen — whistle and they bolt', goldText: 'A golden fluffhorn! It counts for 3!',
          run: async (S) => { await S.say('tuya', 'All in before the rain. You herd like a grandmother!', { expr: 'love' }); } },
      ],
    },
  },
};
