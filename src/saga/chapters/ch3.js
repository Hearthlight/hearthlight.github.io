// Chapter 3 — Dust & Spores. The Golden Steppe, the Red Canyon and Bouncecap
// Woods, levels 9–17. The Duchess’s big top on the Festival Ring and the
// Understudies’ Human Cannonball; the Steppe’s Hearthstone dug up from under the
// Ring and sold to Foreman Grubb; the nomads’ lost fluffhorns; Dusty Gulch, its
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
    const [sx, sz] = STAGE;
    st.actor('minnow', sx, sz + 0.2, { face: { x: 0, z: 1 } });
    st.actor('fidget', sx - 2.2, sz + 0.5, { face: { x: 0.3, z: 1 } });
    st.actor('brick', sx + 2.3, sz + 0.5, { face: { x: -0.3, z: 1 } });
    await st.cam(BIGTOP[0], BIGTOP[1], { dur: 0, ppu: st.basePpu() });
    await st.say('narrator', 'The Festival Ring is packed to the rafters. Somebody has pitched a great striped tent on the sand…{p} and wheeled in a cannon the size of a hay cart.');
    await st.cam(sx, sz + 2, { dur: 1.4 });
    for (let k = 0; k < 8; k++) { st.sfx('tick', { volume: 0.5, pitch: k }); await st.wait(0.07); }
    st.music('bigtop');
    st.sfx('cheer', { volume: 0.7 });
    st.hop('minnow');
    await st.say('minnow', 'LADIES! GENTLEMEN! And… whoever you are!', { expr: 'happy' });
    await st.say('minnow', 'The Understudies proudly present — for one night only — {big}THE HUMAN CANNONBALL!{/}', { expr: 'smug', shake: 1 });
    await st.say('fidget', 'We’ve rehearsed it twice. Once it went well.', { expr: 'worried' });
    st.hop('brick');
    await st.say('brick', 'Brick… is cannonball.', { expr: 'happy' });
    await st.say('minnow', 'Her Radiance says if this act goes well, we get REAL PARTS. With LINES.', { expr: 'love' });
    st.heroesFace(sx, sz);
    await st.say('fidget', 'Oh — and if you’re in the audience, you’re part of the act. Sorry. Union rules.', { expr: 'neutral' });
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
  const lv = 11, out = [];
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
    const P = S.P, [sx, sz] = STAGE;
    P.gatherAt(A.x, A.z + 1.5, 1.6);
    st.actor('minnow', sx - 1.2, sz + 3, { face: { x: 0, z: 1 } });
    st.actor('fidget', sx + 0.4, sz + 3.3, { face: { x: -0.4, z: 1 } });
    st.actor('brick', sx + 2, sz + 3.1, { face: { x: -0.3, z: 1 } });
    await st.cam(A.x, A.z - 2, { dur: 0.8 });
    await st.say('minnow', 'That… was NOT in the script.', { expr: 'shock' });
    await st.say('brick', 'Brick saw stars. Nice stars.', { expr: 'sleepy' });
    await st.say('fidget', 'She’s going to fire us. She’s going to fire us out of the CANNON.', { expr: 'cry' });
    st.sfx('page', { volume: 0.7 });
    await st.say('narrator', 'Something flutters out of Minnow’s costume: a note, sealed in violet wax.');
    await st.say('narrator', '“Understudies — once the act is over, carry the Steppe’s Hearthstone to Foreman Grubb at the Old Mine. He pays in gloom. Do NOT drop it. — Her Radiance”');
    await st.say('minnow', 'The HEARTHSTONE? We only dug up the dressing-room floor!', { expr: 'worried' });
    await st.say('fidget', 'Minnow. The dressing room is UNDER THE RING.', { expr: 'angry' });
    // where the Steppe’s Great Hearth burned: a cold, empty hollow under the star
    await st.cam(A.x, A.z, { dur: 0.9 });
    st.flash('#2a1a3a', 0.4);
    st.mark('emptyHearth');
    await st.say('narrator', 'Beneath the star in the sand, where the Great Hearth of the Steppe should burn, there is only a cold, empty hollow.');
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
    blare(10);
    st.mark('gloomophone');
    await st.say('duchess', '{big}UNDERSTUDIES!{/}', { shake: 1 });
    for (const id of ['minnow', 'fidget', 'brick']) st.emote(id, 'exclaim');
    blare();
    await st.say('duchess', 'I asked for a SPECTACLE. I got… a brick in a bucket.', { expr: 'angry' });
    await st.say('minnow', 'He’s a very GOOD brick, Your Radiance!', { expr: 'worried' });
    blare();
    await st.say('duchess', 'And who is THIS? The Wick Brigade? The Lamp-lickers? Come to sniff about my Hearthstone?', { expr: 'smug' });
    blare();
    await st.say('duchess', 'Light all the little flames you like, darlings. Every Hearth you light, I shall simply snuff again.{p} I have a very large snuffer. It is in the programme.', { expr: 'smug' });
    blare(12);
    await st.say('duchess', 'Understudies — the Hearthstone. The MINE. Now. And do try to make it… {wave}dramatic{/}.', { expr: 'angry' });
    st.dropProp('horn');
    st.sfx('poof', { volume: 0.6 });
    await st.say('minnow', 'Understudies! Exit… stage… LEFT!', { expr: 'shock', hop: true });
    for (const id of ['minnow', 'fidget', 'brick']) st.walk(id, A.x - A.rx - 3, A.z, { speed: 7 });
    await st.wait(1.3);
    for (const id of ['minnow', 'fidget', 'brick']) st.hide(id);
    // Grandmother Tuya, down from the stands
    st.actor('tuya', A.x + 5, A.z - 3, { face: { x: -1, z: 0.5 } });
    st.walk('tuya', A.x + 2, A.z + 0.2, { speed: 2 });
    await st.cam(A.x + 1, A.z + 1, { dur: 0.8 });
    await st.say('tuya', 'Hmph. Circus folk. I’ve seen better tricks from a goat.', { expr: 'neutral' });
    await st.say('tuya', 'Carts full of gloom rattle across my steppe every night, west, to the canyon. Come to the Nomad Camp, little lantern. We should talk.', { expr: 'worried' });
  });
}

// ------------------------------------------------------------------ the nomads
async function tuyaTalk(S) {
  await S.say('tuya', 'Welcome to the Nomad Camp. Sit. Drink. Don’t pet the fluffhorns — they bite.', { expr: 'happy' });
  await S.say('temur', 'They don’t BITE. They nibble. Enthusiastically.', { expr: 'happy' });
  await S.say('tuya', 'Last night the gloom stampeded the whole herd. Three are still out on the steppe, sulking behind rocks.', { expr: 'worried' });
  await S.say('temur', 'Bring them home, and I’ll ride you to Dusty Gulch myself — that’s where the carts go. Where the rails end!', { expr: 'love' });
}
async function tuyaThanks(S) {
  await S.say('tuya', 'All home, and the grass is quiet again. You have a way with frightened things, little lantern.', { expr: 'happy' });
  await S.say('tuya', 'Follow the canyon road west. Where the rails end, you’ll find Dusty Gulch — and, I’d wager, whoever is buying all that gloom.', { expr: 'neutral' });
  await S.say('temur', 'I’ll ride ahead and tell the sheriff you’re coming! She LOVES visitors!', { expr: 'happy', hop: true });
  await S.say('tuya', 'She does not.', { expr: 'neutral' });
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
    await st.say('dolly', 'Hold it right there, strangers. Temur says you’re Lamplighters.', { expr: 'neutral' });
    await st.say('temur', 'I did! Twice! Loudly!', { expr: 'happy' });
    await st.say('dolly', 'Well, the Gulch could use a light. Grubb’s moles took the Old Mine, and now they’ve drilled into the town spring. The water tower’s gone bone dry.', { expr: 'worried' });
    await st.say('dolly', 'Chase those varmints off the tower and I’ll owe you one. I don’t owe folks often. I keep a list.', { expr: 'neutral' });
  });
}
async function boomTalk(S) {
  await S.say('boom', 'Ha! Nice work, youngsters. Haven’t seen digging like that since… well, since the moles.', { expr: 'happy' });
  await S.say('boom', 'They call me Old Boom. Sixty years a Human Cannonball, at every Starfall Festival there ever was.', { expr: 'smug' });
  await S.say('boom', 'Wait. A red cannon at the Festival Ring, with gold stars on it? That’s BIG BERTHA! That’s MY cannon!', { expr: 'shock' });
  await S.say('boom', 'Got her the year of the Hen, you know. Thirty years back, at the Starfall Festival.', { expr: 'neutral' });
  await S.say('boom', 'Young soprano on the big stage, a voice like a bell. Then a hen got loose, right in the middle of her aria. She tripped. Folk laughed.{p} I laughed. Wasn’t kind of us.', { expr: 'sad' });
  await S.say('boom', 'Never heard her sing again. Funny, the things you remember.{p} …Anyway! That old rock-sniffer Grubb — his crew’s loading something at the station right now. Something green and gold.', { expr: 'worried' });
}

// ------------------------------------------------------------------ the ore cart chase
async function theChase(S) {
  const P = S.P;
  const rail = (P.big && P.big.map.rails && P.big.map.rails[0] && P.big.map.rails[0].pts) || [[-214, 28], [-208, 42], [-200, 54], [-194, 64], [-196, 76], [-200, 86]];
  const up = [...rail].reverse();                      // from the Gulch up to the mine
  up.push([MINE[0], MINE[1] + 2.5]);
  const heroes = P.players.filter((p) => p.connected || P.solo);
  const hide = (p, on) => { p.away = on; p.hidden = on; if (p.actor) p.actor.hidden = on; };
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
      await st.say('grubb', 'Oi! This here’s company property! Property of Her Radiance’s Gloom Works, that is!', { expr: 'angry' });
      st.actor('dolly', x0 + 6, z0 + 3, { face: { x: -1, z: -0.3 } });
      st.walk('dolly', x0 + 3.8, z0 + 2.2, { speed: 5 });
      await st.say('dolly', '{shake}GRUBB!{/} Put that stone DOWN!', { expr: 'angry' });
      await st.say('grubb', 'Not today, Sheriff! Next stop: the Old Mine! Mind the doors!', { expr: 'smug', hop: true });
      // (he jumps in, the moles give it a shove)
      st.hide('grubb');
      for (let i = 0; i < 2; i++) st.dropProp('mole' + i);
      st.sfx('whoosh', { volume: 0.7 });
      // the heroes grab the town’s carts, one each (up to four), and give chase
      const carts = heroes.slice(0, 4).map((p, i) => { const o = buildOreCart(P.r3d); st.prop('cart' + i, o, x0, 0, z0 + 3 + i * 1.9); return o; });
      for (const p of heroes) hide(p, true);
      st.music('battle');
      // everyone rides up the line; the camera rides the first hero’s cart
      const ride = async (key, o, delay, speed) => {
        await st.wait(delay);
        let px = o.position.x, pz = o.position.z;
        for (let i = 1; i < up.length; i++) {
          const [x, z] = up[i], L = Math.hypot(x - px, z - pz);
          o.rotation.y = Math.atan2(x - px, z - pz);
          await st.move(key, { x, z }, L / speed, { ease: 'lin' });
          if (o.userData.roll) o.userData.roll(L);
          px = x; pz = z;
        }
      };
      const lead = carts[0];
      if (lead) { const a0 = lead.userData.anim; lead.userData.anim = (tt, dt) => { if (a0) a0(tt, dt); if (st.cv && !st.tw) { st.cv.x = lead.position.x; st.cv.z = lead.position.z - 1; } }; }
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
      await Promise.all([ride('grubbCart', cart, 0, 11), ...carts.map((o, i) => ride('cart' + i, o, 0.9 + i * 0.35, 10.5)), booms]);
      // the mine’s mouth, blown shut behind him
      st.dropProp('grubbCart');
      st.sfx('boom', { volume: 1 }); st.shake(0.9); st.flash('#fff0d0', 0.4);
      S.flag('mineShut');
      st.fx('dust', MINE[0], 1, MINE[1] + 2, 40, { color: '#b8704a' });
      if (st.vfx) st.vfx.shockwave(MINE[0], MINE[1] + 2, { r: 4, color: '#c88a5a', life: 0.6, wall: 1 });
      await st.wait(0.8);
      // (everyone out, at the yard)
      heroes.forEach((p, i) => {
        const x = YARD[0] + (i % 3) * 1.1 - 1.1, z = YARD[1] + Math.floor(i / 3) * 1.1;
        if (P.solo) P.gatherAt(x, z); else p.actor.pos = { x, z };
        hide(p, false);
      });
      for (let i = 0; i < carts.length; i++) st.dropProp('cart' + i);
      if (!P.solo && P.cam) P.cam.snap(P.camPlayers());
      await st.cam(YARD[0], YARD[1] - 2, { dur: 0.6 });
      st.music(null);
      await st.say('narrator', 'From somewhere behind the rubble, a muffled voice:{p} “Ha-HA! Tunnel’s shut, Lamplighters! Go home and eat your vegetables!”');
      st.actor('hazel', YARD[0] - 5, YARD[1] - 3, { face: { x: 1, z: 0.5 } });
      st.hop('hazel'); st.emote('hazel', 'exclaim');
      st.sfx('boing', { volume: 0.6 });
      await st.say('hazel', 'Oh my. Oh my, oh MY! Was that a real ore cart chase? I must write this down!', { expr: 'love' });
      await st.say('hazel', 'Professor Hazel Burrows, Lamplighter studies. I’ve been mapping this canyon for weeks, and I KNOW there’s another way in…', { expr: 'happy' });
    }, { bars: true });
  } finally { for (const p of heroes) hide(p, false); }
}
async function hazelTalk(S) {
  await S.say('hazel', 'Here! The Lamplighters dug an open quarry long before anyone dug a mine. The old quarry road — behind that boarded gate in the rock.', { expr: 'happy' });
  await S.say('hazel', 'Let me just… hnnng… there!', { expr: 'angry' });
  S.flag('quarryOpen');
  audio.sfx('slam', { volume: 0.7 });
  S.P.world.fx.emit('dust', QUARRY_GATE[0] + 0.6, 1, QUARRY_GATE[1], 14, { color: '#b8704a' });
  await S.say('hazel', 'Grubb has turned the quarry into his gloom works, I’m afraid. Watch out for moles. (Footnote: and dynamite. Footnote to the footnote: and moles WITH dynamite.)', { expr: 'worried' });
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
    await st.say('narrator', 'Three mounds of earth come tunnelling across the floor, fast.');
    for (const [i, e] of r.foes.entries()) { e.obj.visible = true; pose(e); st.fx('dust', e.x, 0.3, e.z, 12, { color: '#a86a4a' }); st.sfx('slam', { volume: 0.5, pitch: i * 3 }); await st.wait(0.35); }
    await st.say('narrator', '“Pick!”{p} “Shovel!”{p} “…and Doug.”');
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
    await st.say('grubb', 'Her Radiance wants gloom by the ton, and the Drillosaur digs by the ton. Nothing personal. Just business.', { expr: 'neutral' });
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
      await st.say('grubb', 'Alright! ALRIGHT! Take your precious rock! The Duchess can dig her own coal!', { expr: 'angry' });
      await st.say('grubb', 'She pays in IOUs anyway. Signed with a flourish. Very pretty. Completely useless.', { expr: 'sad' });
      await st.say('grubb', 'Right. I’m off to find honest work. Something with fewer Lamplighters in it.', { expr: 'neutral' });
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
    await st.say('narrator', 'The Hearthstone is warm, and hums like a summer field.{p} It wants to go home.');
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
    await st.say('narrator', 'The Hearthstone slides back into its hollow beneath the star, as if it had never left.');
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
    await st.say('narrator', 'Back in Marigold Cove, the mayor reaches for his teacup. It isn’t there.{p} Rosa has hidden it. Just in case.');
    await st.cam(A.x, A.z + 1, { dur: 1.4, ppu: st.basePpu() });
    await st.say('tuya', 'Three flames in your lantern now. The old Lamplighters rode this road too, you know. They always stopped for tea.', { expr: 'happy' });
    await st.say('boom', 'And I’m taking Bertha home. She deserves a quiet retirement. Like me.{p} BOOM.', { expr: 'happy' });
    // Perkins, with a letter that smells like a pond
    const p = st.actor('perkins', A.x + 7, A.z - 4, { face: { x: -1, z: 0.4 } });
    p.n.seatY = 6;
    st.walk('perkins', A.x + 1, A.z - 0.8, { speed: 7 });
    for (let k = 0; k < 12; k++) { p.n.seatY = Math.max(0, 6 - k * 0.55); await st.wait(0.05); }
    p.n.seatY = undefined;
    st.sfx('thud', { volume: 0.8 }); st.shake(0.3);
    await st.say('perkins', 'PELICAN POST! Urgent letter for the Lamplighter! From a… king? It smells like a pond.', { expr: 'happy', hop: true });
    await st.say('narrator', '“HELP. CROWN. GONE. RIBBIT. — His Majesty King Croakington of Croakmire”');
    await st.say('hazel', 'Croakmire! The marsh keeps a Great Hearth of its own — under the king’s throne, if my maps are right.', { expr: 'happy' });
  });
}

// ------------------------------------------------------------------ the chapter
const fluffWant = (S, k) => { const q = S.st.q.c3_nomads; return !!q && !q.done && !S.st.got['c3_nomads:1:' + k]; };
export const CH3 = {
  id: 3, title: 'Dust & Spores', lv: 10, zones: ['steppe', 'canyon', 'bouncecap'], opens: ['marsh', 'glacier', 'cloud'],
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
      lines: ['The steppe is wide, little lantern. Wide enough for everyone’s troubles.', 'Temur rides like the wind. Talks like it, too.'] },
    { id: 'temur', at: [NOMAD.x + 2.6, NOMAD.z + 0.8], face: { x: -0.5, z: 1 }, when: (S) => S.done('c3_west') && !S.st.q.c3_gulch,
      lines: ['Race you to the baobab! …Later. After the gloom.', 'Grandmother says I’m too loud. I say the steppe is too quiet!'] },
    { id: 'temur', at: [-201.5, 91.2], face: { x: 0.6, z: 1 }, when: (S) => !!S.st.q.c3_gulch,
      lines: ['The Gulch! So many walls! How do they see the sky?', 'Grandmother says to be polite. I AM being polite. LOUDLY.'] },
    { id: 'dolly', at: [-213.5, 91.2], face: { x: 0.4, z: 1 }, when: (S) => S.done('c2_relight'),
      lines: ['Dusty Gulch: population forty-two. Forty-three, if you count the goat.', 'Keep your boots clean and your nose cleaner.'] },
    { id: 'boom', at: [-203.3, 84.6], face: { x: 0, z: 1 }, when: (S) => S.done('c2_relight'),
      lines: ['Sixty years a Human Cannonball. Never once landed where I aimed.', 'Big Bertha… she was a beauty. Still is.'] },
    { id: 'nell', at: [-184.2, 88.6], face: { x: 1, z: 0.3 }, when: (S) => S.done('c2_relight'),
      lines: ['There’s gold in them there hills! Probably. Possibly. Once.', 'Panning’s all about patience. And wet socks.'] },
    { id: 'hazel', at: [YARD[0] - 4.5, YARD[1] - 1], face: { x: 1, z: 0.5 }, when: (S) => S.has('mineShut') && !S.done('c3_relight'),
      lines: ['The Lamplighters mapped every hearth in the world. I’m mapping their maps.', 'Did you know the Lamplighters signed their maps with a little flame? I have eleven. (Footnote: twelve, counting the burnt one.)'] },
    { id: 'morel', at: MOREL, face: { x: 0, z: 1 }, when: (S) => S.done('c2_relight'),
      lines: ['Big ones! Hello! Mind your big feet.', 'We Sporefolk bounce back. It’s in our nature.'] },
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
      title: 'The Minecart Rush', kind: 'side', repeat: true, giver: 'nell', after: 'c3_relight', lv: 14, dust: 15,
      offer: async (S) => {
        await S.say('nell', 'Dagnabbit — the ore cart’s slipped its brake again. It’ll roll round Dusty Gulch till it runs out of hill. There IS no end to the hill.', { expr: 'angry' });
        await S.say('nell', 'Catch it for me, would you? It slows at the corners. Every time you do, it’s a nugget in your pocket.', { expr: 'happy' });
      },
      steps: [
        { do: 'chase', text: 'Catch the runaway ore cart round Dusty Gulch', area: [-196, 86, 6], speed: 6.2, tire: 18, model: (r3d) => buildOreCart(r3d), sound: 'thud', caught: 'Gotcha, cart!' },
        { do: 'talk', npc: 'nell', text: 'Give Nugget Nell her cart back', run: async (S) => {
          if (S.plays('c3_minecart')) await S.say('nell', 'Again! That cart likes you. It only runs off when YOU’RE in town, I’ve noticed.', { expr: 'smug' });
          else await S.say('nell', 'Whoa there, Bessie! Caught fair and square. Here — a nugget for your trouble. Don’t spend it all on sarsaparilla.', { expr: 'love' });
        } },
      ],
    },
    c3_west: {
      title: 'The Big Top', auto: true, lv: 10,
      steps: [
        { do: 'go', text: 'Head west to the Festival Ring', at: RING_LANE, r: 7, run: bigTop },
        { do: 'kill', text: 'Stop the Understudies’ act', tag: 'cannonball', n: 3, at: [A.x, A.z], r: 30, run: afterAct },
      ],
    },
    c3_nomads: {
      title: 'Riders of the Steppe', auto: true, after: 'c3_west', lv: 11,
      steps: [
        { do: 'talk', npc: 'tuya', text: 'Talk to Grandmother Tuya at the Nomad Camp', run: tuyaTalk },
        { do: 'collect', text: 'Find the three lost fluffhorns', item: 'Lost Fluffhorn', n: 3, spots: FLUFF, hint: 'A fluffhorn, sulking behind a rock' },
        { do: 'camp', text: 'Clear the gloom from the grazing ground', camp: { id: 'c3_graze', at: GRAZE, level: 11, foes: ['tumble', 'tumble', 'fox', 'tumble'], n: 4, done: 'The grazing ground is quiet again!' } },
        { do: 'talk', npc: 'tuya', text: 'Bring the good news to Grandmother Tuya', run: tuyaThanks },
      ],
    },
    c3_gulch: {
      title: 'Dusty Gulch', auto: true, after: 'c3_nomads', lv: 12,
      steps: [
        { do: 'go', text: 'Ride west to Dusty Gulch, where the rails end', at: STATION, r: 6, run: gulchArrival },
        { do: 'camp', text: 'Chase the mole miners off the water tower', camp: { id: 'c3_tower', at: [TOWER[0], TOWER[1] + 3], level: 12, foes: ['mole', 'mole', 'fuse', 'mole'], n: 4, done: 'Water gushes back into the tower!' } },
        { do: 'talk', npc: 'boom', text: 'Talk to Old Boom on the saloon porch', run: boomTalk },
      ],
    },
    c3_chase: {
      title: 'Runaway Cart', auto: true, after: 'c3_gulch', lv: 13,
      steps: [
        { do: 'scene', text: '…', run: theChase },
        { do: 'talk', npc: 'hazel', text: 'Talk to Professor Hazel in the mine yard', run: hazelTalk },
      ],
    },
    c3_mine: {
      title: 'The Old Mine', auto: true, after: 'c3_chase', lv: 14,
      steps: [
        { do: 'go', text: 'Take the old quarry road into the Old Mine', at: QUARRY_DOOR, r: 2.4, run: async (S) => { if (S.P.dungeons) await S.P.dungeons.enter('oldmine'); else S.flag('hearthstone'); } },
        { do: 'dungeon', id: 'oldmine', text: 'Find the Steppe’s Hearthstone in the Old Mine' },
      ],
    },
    c3_relight: {
      title: 'The Steppe Sings Again', auto: true, after: 'c3_mine', lv: 15,
      steps: [
        { do: 'go', text: 'Bring the Hearthstone home, under the Festival Ring’s star', at: [A.x, A.z], r: 3.5, run: relight },
      ],
      done: async (S) => { if (!S.st.lit.includes('steppe')) S.st.lit.push('steppe'); S.save(); },
      next: 4,
    },
    // ---- side quests
    c3_chimes: {
      title: 'Songs of the Wind', kind: 'side', giver: 'temur', lv: 10, when: (S) => S.done('c3_west'), dust: 25,
      offer: async (S) => {
        await S.say('temur', 'Grandmother says the wind forgot its songs when the Murk came. I say we remind it!', { expr: 'happy' });
        await S.say('temur', 'Help me hang the chimes on the three old posts? One by the spring, one by the road, one on the hill.', { expr: 'love' });
      },
      steps: CHIMES.map(([x, z], k) => ({ do: 'go', text: ['Hang a wind chime on the post by the spring', 'Hang a wind chime on the post by the road', 'Hang a wind chime on the post on the hill'][k], at: [x, z + 1], r: 2,
        run: async (S) => {
          S.flag('chime' + k);
          S.P.world.fx.emit('sparkle', x, 2.2, z, 12, { color: '#c8e8ff' });
          audio.sfx('chime', { volume: 0.7, pitch: k * 3 });
          if (k === 2) await S.say('temur', 'Listen! Hear it? The steppe is singing again!', { expr: 'love' });
        } })),
    },
    c3_boom: {
      title: 'One Last Boom', kind: 'side', giver: 'boom', lv: 12, when: (S) => S.done('c3_gulch'), dust: 30,
      offer: async (S) => {
        await S.say('boom', 'Those moles pinched my old helmet when they cleared out the mine yard. Lucky helmet. Sixty years, not one dent. Well. One dent.', { expr: 'sad' });
        await S.say('boom', 'Fetch it back, and I’ll show you a REAL cannonball.', { expr: 'smug' });
      },
      steps: [
        { do: 'collect', text: 'Find Old Boom’s helmet in the mine yard', item: 'Old Boom’s Helmet', n: 1, spots: [HELMET], hint: 'A dented silver helmet, stars painted on it' },
        { do: 'talk', npc: 'boom', text: 'Bring the helmet back to Old Boom',
          run: async (S) => {
            await S.say('boom', 'My helmet! Stand back, youngsters. Stand WAY back.', { expr: 'love' });
            audio.sfx('whoosh', { volume: 0.7 });
            await S.say('narrator', 'Old Boom takes a run-up, leaps off the saloon porch, spins three times in the air…{p} and lands head-first in the water trough.');
            audio.sfx('splash', { volume: 0.8 });
            await S.say('boom', '{shake}TA-DAAAA!{/}{p} …I’ll need a hand getting out.', { expr: 'happy' });
          } },
      ],
    },
    c3_nell: {
      title: 'Gold Fever', kind: 'side', giver: 'nell', lv: 12, when: (S) => S.done('c3_gulch'), dust: 30,
      offer: async (S) => {
        await S.say('nell', 'Now that the spring runs again, the river’s washing gold down from the hills! I can feel it in my socks!', { expr: 'love' });
        await S.say('nell', 'My back’s no good for bending. Pan three nuggets for me? We’ll split it. Fifty–fifty. Sixty–forty. We’ll talk.', { expr: 'happy' });
      },
      steps: [
        { do: 'collect', text: 'Pan three gold nuggets from the canyon river', item: 'Gold Nugget', n: 3, spots: NUGGETS, hint: 'Something gleams in the shallows' },
        { do: 'talk', npc: 'nell', text: 'Bring the nuggets to Nugget Nell',
          run: async (S) => {
            await S.say('nell', 'NUGGETS! Real ones! We’re RICH!{p} …We’re slightly less poor!', { expr: 'love' });
            await S.say('nell', 'Here — your share. I rounded up. Don’t tell anybody. Especially me.', { expr: 'happy' });
          } },
      ],
    },
    c3_spores: {
      title: 'Achoo!', kind: 'side', giver: 'morel', lv: 14, when: (S) => S.done('c2_relight'), dust: 30,
      offer: async (S) => {
        await S.say('morel', 'Big ones! The Mother Cap has caught a cold, and every sneeze puffs gloom spores all over the woods!', { expr: 'worried' });
        await S.say('morel', 'Sneezewort grows by the fairy rings. Three sprigs should do it. We would fetch it ourselves, but we are very short.', { expr: 'happy' });
      },
      steps: [
        { do: 'collect', text: 'Pick three sprigs of sneezewort by the fairy rings', item: 'Sneezewort', n: 3, spots: SNEEZE, hint: 'A sprig of sneezewort, tickling the air' },
        { do: 'talk', npc: 'morel', text: 'Bring the sneezewort to Old Morel',
          run: async (S) => {
            await S.say('narrator', 'Old Morel stuffs the sneezewort under the Mother Cap’s gills.{p} The whole wood holds its breath.');
            await S.say('narrator', '“…Aaah… AAAH…{p} …”{p} Nothing. The Mother Cap wobbles, happily.');
            await S.say('morel', 'It passed! Thank you, big ones! Here — a little something, from all of us.', { expr: 'love' });
          } },
      ],
    },
  },
};
