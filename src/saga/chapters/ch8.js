// Chapter 8 — Autumn & Roots. Emberleaf Wood, the Glowtide Coast and Elderbough,
// levels 32–37. The Duchess fires the Understudies (she has cardboard ones now) and they
// tumble into Harvestholm’s pumpkins, where the Harvest Festival is two days off and every
// lantern gets eaten by moths. They join the heroes. Fireflies are the one light moths
// can’t eat: net them at night on the Glowtide, carry the jars back, hang them along the
// lanes — the festival lights up and the Understudies get their first real applause (a
// rhythm act). Then Elderbough: Warden Ashby, the Great Tree greying under the Gloomstage’s
// siphon, the Heartwood (firefly jars against moth swarms) and the Moth Queen. The
// Heartlight relit; the Duchess, cornered, sails off over Hollowmoor.

import '../cast.js';
import { buildGloomstage, BALCONY } from '../../models/v7/gloomstage.js';
import { buildFirefly, buildJarModel, buildHookPost, buildPumpkin, buildFestivalStage, buildCutout, buildSiphon, buildLeafPile } from '../../models/v7/autumn8.js';
import { HEARTWOOD, HEART_DOOR } from '../dungeons/heartwood.js';
import { kit, THREE } from '../../models/v7/kit.js';
import { t } from '../../i18n.js';

// the chapter’s places
const TREE = [958, 68];                                      // the Great Tree of Elderbough
const MARROW = [889, 183.5];                                 // Harvestholm’s green
const PATCH = [910.5, 193.8];                                // Hazel’s pumpkin patch
const CART = [884.5, 186.5];                                 // the jar cart, once there are jars
const HOOKS = [[881.5, 180.5], [888, 177.5], [897, 183], [895.5, 191.5], [883, 192.5]];
const STAGE = [893, 186.2];                                  // the festival stage
const STAGE_FRONT = [893, 190.2];
const GLADE = [984, 263];                                    // fireflies in the mangroves
const MO = [1000.5, 276.3];                                  // on Stiltwater’s boardwalk
const MARISOL = [1015.5, 283.4], WICK = [1007.2, 290.2];
const ROOTHOLM = [959, 93];
const ASHBY = [955.4, 76.6];
const PILES = [[906, 173], [910, 172.5], [914, 174], [918, 176], [907, 177.5], [911, 178], [915, 179.5], [919, 181], [909, 182], [913, 183]];

const hide = (P, on) => { for (const p of P.players) { p.away = on; p.hidden = on; if (p.actor) p.actor.hidden = on; } };
const TRIO = ['minnow', 'fidget', 'brick'];
const onStage = (S) => { const st = S.stepDef('c8_festival'); return !!st && st.do === 'rhythm'; };

// ------------------------------------------------------------------ « You’re FIRED »
async function fired(S) {
  await S.scene(async (st) => {
    const P = S.P, [x, z] = TREE;
    hide(P, true);
    const s = 0.8, SX = x + 1, SY = 24, SZ = z - 3;
    const ship = buildGloomstage(P.r3d, { fx: (sx, sy, sz) => P.world.fx.emit('smoke', sx, sy, sz, 1, { color: '#6a4a8e' }) });
    ship.scale.setScalar(s);
    st.prop('ship', ship, SX, SY, SZ);
    const bx = SX + BALCONY.x * s, by = SY + BALCONY.y * s, bz = SZ + BALCONY.z * s;
    st.actor('duchess', bx, bz, { face: { x: 0, z: 1 } }).n.seatY = by;
    TRIO.forEach((id, i) => { const a = st.actor(id, bx - 1.4 + i * 0.7, bz + 0.3, { face: { x: 0, z: 1 } }); a.n.seatY = by; });
    await st.cam(bx, bz - by + 2, { dur: 0, ppu: st.basePpu() });
    st.music('villain');
    st.mark('fired');
    await st.say('duchess', 'Darlings! Meet my NEW Understudies.', { expr: 'happy' });
    // (three cardboard cut-outs rise on the balcony)
    const cuts = TRIO.map((w, i) => { const c = buildCutout(P.r3d, w); st.prop('cut' + i, c, bx + 0.6 + i * 0.55, by - 1.2, bz + 0.2); return 'cut' + i; });
    st.sfx('tone', { volume: 0.6, pitch: 7 });
    for (const [i, k] of cuts.entries()) st.move(k, { y: by }, 0.5 + i * 0.15);
    await st.wait(0.8);
    await st.say('duchess', 'They never TALK. And they never lose to children with a lantern.', { expr: 'smug' });
    await st.say('minnow', 'Those are… made of CARDBOARD.', { expr: 'shock' });
    await st.say('duchess', 'And better than you already.{p}Minnow, Fidget, Brick: {key}you’re FIRED{/}.', { expr: 'angry', shake: 1 });
    await st.say('fidget', 'But… where do we go?', { expr: 'sad' });
    await st.say('duchess', 'Down, darling. Down is a direction.', { expr: 'smug' });
    // (a lever, a trapdoor, a long way down)
    st.sfx('unlock', { volume: 0.8, pitch: -6 });
    st.sfx('whoosh', { volume: 0.8, pitch: -8 });
    for (let k = 0; k < 16; k++) { for (const id of TRIO) { const a = st.actorOf(id); if (a) a.n.seatY = Math.max(0, by - k * 0.9); } await st.wait(0.04); }
    for (const id of TRIO) st.hide(id);
    st.mark('tumble');
    await st.say('narrator', 'The three Understudies fall a very long way, through a great many leaves.');
    await st.title('Autumn & Roots', 'Chapter 8');
    for (const k of cuts) st.dropProp(k);
    st.dropProp('ship'); st.hide('duchess');
    hide(P, false);
  });
}
async function wendyAutumn(S) {
  await S.say('wendy', 'The Duchess is at the Great Tree. I can’t fly you there: moths eat the Teacup’s lights.', { expr: 'worried' });
  await S.say('wendy', 'Go on foot. First stop: {key}Harvestholm{/}, south-east of here.', { expr: 'happy' });
}
async function marrowTalk(S) {
  await S.say('marrow', 'Welcome to Harvestholm! Our festival is in two days, and {key}moths{/} the size of hats eat every lantern we hang!', { expr: 'worried' });
  await S.say('marrow', 'And three strangers fell out of the sky into {key}Hazel’s pumpkin patch{/}, just east of here. Go and see!', { expr: 'neutral' });
}

// ------------------------------------------------------------------ the pumpkin patch
async function patchTalk(S) {
  await S.scene(async (st) => {
    const P = S.P, [x, z] = PATCH;
    P.gatherAt(x - 3, z + 1.5, 1.2);
    await st.cam(x, z, { dur: 0.6, ppu: st.basePpu() });
    TRIO.forEach((id, i) => { const a = st.actor(id, x - 0.8 + i * 0.9, z - 0.4, { face: { x: -0.5, z: 1 } }); a.n.seatY = 0.05; });
    for (const [i, [dx, dz]] of [[-1.8, 0.6], [1.9, 0.3], [-1.2, -1.4], [1.4, -1.5], [0.2, 1.1]].entries()) st.prop('pk' + i, buildPumpkin(P.r3d, { s: 0.9 + (i % 2) * 0.3 }), x + dx, 0, z + dz);
    st.mark('patch');
    await st.say('minnow', 'Go on. Laugh. The Duchess fired us. For CARDBOARD.', { expr: 'sad' });
    st.heroesEmote('dots', 1.6);
    await st.say('minnow', '…We’ve nowhere to go. We only ever wanted somewhere people CLAP.', { expr: 'sad' });
    await st.say('fidget', 'Listen. The Duchess needs one last light: {key}the Heartlight{/}, inside the Great Tree.', { expr: 'worried' });
    await st.say('fidget', 'The {key}Moth Queen{/} is in there, drinking it. We’ll help you stop her… if you’ll have us.', { expr: 'neutral' });
    await st.say('brick', 'Brick is good at lifting.', { expr: 'happy' });
    await st.say('minnow', 'And I’m good at being in charge.', { expr: 'smug' });
    await st.say('fidget', 'He isn’t.', { expr: 'neutral' });
    st.sfx('chime', { volume: 0.8, pitch: 7 });
    st.heroesEmote('heart', 2);
    await st.title('The Understudies join you', 'Minnow, Fidget & Brick', 2.6);
    await st.say('fidget', 'First we need {key}fireflies{/}: moths can’t eat their light.', { expr: 'happy' });
    await st.say('fidget', 'Go and see {key}Old Mo{/} in {key}Stiltwater{/}, on the coast to the south-east.', { expr: 'neutral' });
    for (let i = 0; i < 5; i++) st.dropProp('pk' + i);
  });
}

// ------------------------------------------------------------------ Glowtide, by night
async function moTalk(S) {
  await S.say('mo', 'Fireflies? Only at night. Sit down: I’ll tell you how I caught a lantern-fish with my boot.', { expr: 'happy', speed: 0.85 });
  await S.scene(async (st) => {
    await st.fade(1, 0.8);
    if (S.P.state && (S.P.state.hour < 20 && S.P.state.hour > 5)) S.P.state.hour = 21.2;
    await st.wait(0.6);
    await st.fade(0, 0.8);
    await st.say('mo', '…and that’s how I lost my other boot.{p}Oh, look. It’s dark.', { expr: 'smug', speed: 0.85 });
  });
  await S.say('mo', 'Go to {key}the mangroves{/}, north-west of here. {key}Swing your net{/} when a firefly glows.', { expr: 'neutral', speed: 0.85 });
}
async function moJars(S) {
  await S.say('mo', 'Five jars full! My cart takes them to {key}Harvestholm{/}: go and {key}hang them{/} along its lanes.', { expr: 'happy', speed: 0.85 });
}

// ------------------------------------------------------------------ the festival
async function festivalLit(S) {
  await S.scene(async (st) => {
    const P = S.P, [x, z] = MARROW;
    await st.cam(x + 2, z + 1, { dur: 0.8, ppu: st.basePpu() });
    st.sfx('chord', { volume: 0.7 });
    for (const [hx, hz] of HOOKS) st.fx('sparkle', hx + 0.36, 2, hz, 8, { color: '#e8ff8a' });
    await st.say('narrator', 'One by one the jars glow, and the moths wheel away, sulking, into the dark.');
    st.actor('marrow', x, z, { face: { x: 0, z: 1 } });
    st.actor('minnow', x + 2.4, z + 1.2, { face: { x: -1, z: 0 } });
    await st.say('minnow', 'Mayor… now there’s light, could we do our act? With juggling?', { expr: 'worried' });
    await st.say('marrow', 'An ACT? …Absolutely! Come to {key}the stage{/} and {key}keep the beat{/} for them!', { expr: 'love', hop: true });
    st.hide('minnow');
  });
}
async function applause(S) {
  await S.scene(async (st) => {
    const P = S.P, [x, z] = STAGE;
    await st.cam(x, z + 1.5, { dur: 0.6, ppu: st.basePpu() });
    TRIO.forEach((id, i) => { const a = st.actor(id, x - 1.2 + i * 1.2, z + 0.2, { face: { x: 0, z: 1 } }); a.n.seatY = 0.5; });
    st.sfx('cheer', { volume: 0.9 });
    for (let k = 0; k < 12; k++) st.fx('heart', x - 4 + Math.random() * 8, 1.5, z + 3 + Math.random() * 3, 1);
    st.heroesEmote('heart', 2);
    st.mark('applause');
    await st.say('narrator', 'All of Harvestholm claps, for a long, long time.');
    await st.say('brick', 'Brick heard clapping.{p}For Brick.', { expr: 'cry' });
    await st.say('minnow', 'I’m not crying, you’re crying. It’s the leaves.', { expr: 'love' });
    await st.say('fidget', '…Thank you. Really.', { expr: 'happy' });
    // (and the next morning)
    await st.fade(1, 0.8);
    if (P.state && (P.state.hour > 18 || P.state.hour < 6)) { if (P.state.hour > 18) P.state.day = (P.state.day || 1) + 1; P.state.hour = 8; }
    await st.fade(0, 0.8);
    await st.say('fidget', 'Morning! Take the road north-east to {key}Rootholm{/}, under the Great Tree. {key}The Warden{/} there knows the way in.', { expr: 'neutral' });
  });
}

// ------------------------------------------------------------------ Elderbough
async function ashbyTalk(S) {
  await S.say('ashby', 'Mmm. Visitors. There’s a theatre in my tree’s hair… drinking its heart through a straw.', { expr: 'sad', speed: 0.7 });
  await S.say('ashby', 'The moths and their Queen nest inside, in {key}the Heartwood{/}. Go in by the {key}door in the trunk{/}.', { expr: 'neutral', speed: 0.7 });
}

// ------------------------------------------------------------------ the Heartwood
const R = (id) => HEARTWOOD.rooms.find((r) => r.id === id);
const mid = (d, r, dz = 0) => ({ x: d.ox + r.x + r.w / 2, z: d.oz + r.z + r.h / 2 + dz });

R('queen').run = async (S, d, r) => {
  const C = S.P.combat;
  if (!C) return;
  const c = mid(d, r);
  const e = C.spawn('mothqueen', c.x, c.z - 1, { level: d.def.lv[1], quiet: true });
  e.saga = true; e.sagaTag = 'queen'; e.home = { x: c.x, z: c.z };
  e.spawnT = 0; e.obj.scale.setScalar(1);
  r.boss = e;
  const sw = r.jr && r.jr.swarms.find((q) => q.queen);
  if (sw) { sw.follow = e; e.swarm = sw; }
  e.onPhase = (q, ph) => { if (ph >= 2) r.jarLife = ph >= 3 ? 5 : 6.5; };
  e.onDrink = () => { const H = r.jr && r.jr.hooks.find((q) => q.lit); if (H) H.life = Math.min(H.life || 0.5, 0.5); };
  C.bounds = { x: c.x, z: c.z, rx: r.w / 2 - 1.2, rz: r.h / 2 - 1 };
  await S.scene(async (st) => {
    await st.cam(c.x, c.z - 2, { dur: 0.8 });
    st.sfx('flick', { volume: 0.8 });
    await st.say('narrator', 'Round the tree’s heart turns a cloud of moths. In its middle: something with a crown.');
    st.mark('queen');
    await st.title('The Moth Queen', 'who drinks the light', 2.2);
    await st.say('fidget', 'Her swarm shields her! {key}Hang a jar{/} on a hook to draw the moths away, then hit her!', { expr: 'worried' });
  });
};
R('queen').tick = (S, d, r) => {
  const e = r.boss, C = S.P.combat;
  if (!e || r.done || e.alive) return;
  r.done = true;
  if (C) { C.bounds = null; for (const q of C.enemies) if (q.alive && q.sagaTag === 'queen') { q.alive = false; q.fading = 0.3; } }
  if (r.jr) for (const sw of r.jr.swarms) { sw.follow = null; sw.hx = -99; sw.hz = -99; }
  (async () => {
    await S.P.wait(0.6);
    await S.scene(async (st) => {
      const c = mid(d, r);
      await st.cam(c.x, d.oz + 6, { dur: 0.8 });
      await st.say('narrator', 'The Moth Queen folds her wings, and her moths go out like a blown candle.');
      st.sfx('chord', { volume: 0.9 });
      st.flash('#fff4c8', 0.6);
      st.shake(0.6);
      if (st.vfx) { st.vfx.pillar(c.x, d.oz + 4.2, { r: 1.8, h: 12, color: '#d8ffb0', life: 2 }); st.vfx.shockwave(c.x, d.oz + 4.2, { r: 14, color: '#e8ffc8', life: 1.6, wall: 1.2 }); }
      S.flag('heartLit');
      if (!S.st.lit.includes('elder')) S.st.lit.push('elder');
      S.save();
      st.mark('heartlight');
      await st.say('narrator', 'The Heartlight wakes, green-gold, like sun through leaves. The {key}seventh flame{/} catches in the lantern.');
      st.music(null);
    });
    await d.D.exit({ done: true });
    await heartRelit(S);
  })();
};

// out of the tree: the crown greens, the siphon snaps, the Gloomstage tears free
async function heartRelit(S) {
  await S.scene(async (st) => {
    const P = S.P, [x, z] = TREE;
    // (they climb out into daylight)
    if (P.state && (P.state.hour > 18.5 || P.state.hour < 6.5)) { if (P.state.hour > 18.5) P.state.day = (P.state.day || 1) + 1; P.state.hour = 9; }
    P.gatherAt(ASHBY[0] + 1, ASHBY[1] + 2.5, 1.2);
    const s = 0.8, SX = x + 1, SY = 24, SZ = z - 3;
    const ship = buildGloomstage(P.r3d, { fx: (sx, sy, sz) => P.world.fx.emit('smoke', sx, sy, sz, 1, { color: '#6a4a8e' }) });
    ship.scale.setScalar(s);
    st.prop('ship', ship, SX, SY, SZ);
    const siph = buildSiphon(P.r3d, 8);
    st.prop('siph', siph, SX, SY - 8.5, SZ + 1);
    await st.cam(x, z - 14, { dur: 0, ppu: Math.max(8, Math.round(st.basePpu() * 0.75)) });
    st.sfx('chord', { volume: 0.8 });
    for (let k = 0; k < 30; k++) st.fx('leaf', x + (Math.random() - 0.5) * 14, 12 + Math.random() * 6, z + (Math.random() - 0.5) * 8, 1, { color: ['#5a9a48', '#8acc5a', '#3f7a3a'][k % 3] });
    st.flash('#d8ffb0', 0.5);
    await st.say('narrator', 'The Great Tree’s crown turns green again, like a lamp lit inside a lampshade.');
    // (the straw snaps)
    st.sfx('snap', { volume: 1 });
    st.shake(0.8);
    st.move('siph', { y: -8 }, 1.2);
    const bx = SX + BALCONY.x * s, by = SY + BALCONY.y * s, bz = SZ + BALCONY.z * s;
    st.actor('duchess', bx, bz, { face: { x: 0, z: 1 } }).n.seatY = by;
    await st.cam(bx, bz - by + 2, { dur: 1, ppu: st.basePpu() });
    st.mark('straw');
    await st.say('duchess', 'My straw! You broke my STRAW!', { expr: 'angry', shake: 1 });
    await st.say('duchess', 'Keep your twig! My Grand Finale awaits at {key}the Umbral Scar{/}, beyond a whole moor full of GHOSTS.{p}Toodle-oo!', { expr: 'smug' });
    st.hide('duchess');
    st.sfx('whoosh', { volume: 0.7, pitch: -10 });
    await st.move('ship', { x: SX + 40, y: SY + 4, z: SZ - 20 }, 3.5);
    st.dropProp('ship'); st.dropProp('siph');
    S.openZones(['moor', 'prism', 'clock', 'tundra']);
    if (S.P.murk) S.P.murk.pulse(-1);
    await st.cam(ASHBY[0] + 1, ASHBY[1] + 1.5, { dur: 1, ppu: st.basePpu() });
    st.actor('ashby', ASHBY[0], ASHBY[1], { face: { x: 0.3, z: 1 } });
    TRIO.forEach((id, i) => st.actor(id, ASHBY[0] + 2.6 + i * 0.8, ASHBY[1] + 3.4, { face: { x: -0.4, z: -1 } }));
    await st.say('brick', 'Brick is not afraid of ghosts.{p}…Brick is a little afraid of ghosts.', { expr: 'worried' });
    await st.say('fidget', 'The only road to the Scar crosses {key}Hollowmoor{/}, the moor east of here. We know the way backstage.', { expr: 'worried' });
    await st.title('The Heartlight burns again', 'The Murk rolls back from Hollowmoor, Prism Springs, Cogsworth and the Aurora Tundra', 3.6);
  });
}

// ------------------------------------------------------------------ side quests
async function hazelOffer(S) {
  await S.say('pumpkin', 'My harvest ring! It was Gran’s. The wind blew it into a leaf pile.', { expr: 'sad' });
  await S.say('pumpkin', 'There are {key}ten piles{/} by the barn. Would you {key}jump into them{/} for me?', { expr: 'worried' });
}
async function hazelDone(S) {
  await S.say('pumpkin', 'That’s Gran’s ring! Thank you!{p}Keep the leaves in your hair: they suit you.', { expr: 'love', hop: true });
}
async function marisolOffer(S) {
  await S.say('marisol', 'I can’t sing tonight in THIS hat. It’s a fishing hat: fish have SEEN me in it.', { expr: 'worried' });
  await S.say('marisol', '{key}Wick the Hatter{/} is making me a new one. Could you hurry him along?', { expr: 'happy' });
}

// ------------------------------------------------------------------ the chapter
export const CH8 = {
  id: 8, title: 'Autumn & Roots',
  recap: 'The Dawn Hearth burns again: six flames in the lantern. The Duchess has flown north-east, to {key}the Great Tree{/} of Elderbough, to steal its Heartlight: the last light she needs. Follow her through Emberleaf Wood and {key}stop her{/}.',
  lv: 35, zones: ['autumn', 'glow', 'elder'], opens: ['moor', 'prism', 'clock', 'tundra'],
  // (Elderbough under the siphon: a grey sky until the Heartlight burns again)
  gloom(S) {
    if (S.st.ch !== 8 || S.has('heartLit')) return 0;
    const B = S.P.big;
    for (const p of S.P.players) {
      if (!p.connected && !S.solo) continue;
      const zz = B && B.zoneAt ? B.zoneAt(p.pos.x, p.pos.z) : null;
      if (zz && zz.id === 'elder') return 0.45;
    }
    return 0;
  },
  props: [
    // the Gloomstage moored in the Great Tree’s crown, and its siphon
    { id: 'gsTree', at: [TREE[0] + 1, TREE[1] - 3], r: 0.1, build: (r3d) => { const g = new THREE.Group(), s = buildGloomstage(r3d); s.scale.setScalar(0.8); s.position.y = 24; g.add(s); const sp = buildSiphon(r3d, 8); sp.position.set(0, 15.5, 1); g.add(sp); g.userData.anim = (tm) => { s.position.y = 24 + Math.sin(tm * 0.6) * 0.25; if (sp.userData.anim) sp.userData.anim(tm); }; return g; }, when: (S) => S.st.ch === 8 && !S.has('heartLit') },
    // the festival: its stage, and pumpkins round the green
    { id: 'hhStage', at: STAGE, r: 2.2, build: (r3d) => buildFestivalStage(r3d), when: (S) => S.st.ch >= 8 },
    ...[[878.5, 184], [899.5, 188], [886, 195], [892.5, 178.5]].map(([x, z], i) => ({ id: 'hhPumpkin' + i, at: [x, z], r: 0.35, build: (r3d) => buildPumpkin(r3d, { carved: true, s: 1.1 }), when: (S) => S.st.ch >= 8 })),
    // (the jars, once hung, stay on their posts)
    ...HOOKS.map(([x, z], i) => ({ id: 'hhHook' + i, at: [x, z], r: 0.15, build: (r3d, S) => { const g = buildHookPost(r3d), j = buildJarModel(r3d); j.position.set(0.36, 1.72, 0.15); g.add(j); j.visible = false; g.userData.anim = () => { j.visible = !!S.st.got['c8_festival:hook:' + i] || S.done('c8_festival'); }; return g; }, when: (S) => S.done('c8_fireflies') && !(S.stepDef('c8_festival') && S.stepDef('c8_festival').do === 'carry') })),
    // Mo’s cart of jars
    { id: 'jarCart', at: CART, r: 0.8, build: (r3d) => { const K = kit(r3d), g = new THREE.Group(); K.put(g, K.box(1.4, 0.5, 0.9), K.c('#8a5a3a'), 0, 0.6, 0); for (const s of [-1, 1]) K.put(g, K.cyl(0.35, 0.35, 0.1, 10), K.c('#4a3220'), s * 0.6, 0.35, 0.45, 0, 0, Math.PI / 2); for (let i = 0; i < 5; i++) { const j = buildJarModel(r3d); j.position.set(-0.5 + i * 0.25, 0.85, (i % 2) * 0.2 - 0.1); g.add(j); } return g; }, when: (S) => S.done('c8_fireflies') && !S.done('c8_festival') },
  ],
  npcs: [
    { id: 'wendy', at: [777.2, 68.4], face: { x: -0.3, z: 1 }, when: (S) => S.st.ch >= 8,
      lines: ['Moths in my curtains? Never again.', 'The Teacup’s ready whenever you are.'] },
    { id: 'marrow', at: MARROW, face: { x: 0, z: 1 }, when: (S) => S.st.ch >= 8,
      lines: ['I judge the pumpkins, the pies and, frankly, you: you’re doing fine.', 'Forty-one Harvest Festivals, and I never missed one.'] },
    { id: 'pumpkin', at: [907.5, 190.8], face: { x: -0.4, z: 1 }, when: (S) => S.done('c8_patch'),
      lines: ['Pumpkins grow by themselves, but they like to be watched.', 'Three people fell into my patch, so they pay rent in pumpkin-carrying.'] },
    { id: 'mo', at: MO, face: { x: -0.3, z: 1 }, when: (S) => S.st.ch >= 8,
      lines: ['Fireflies only come out at night, in the mangroves.', 'Boots: none. Stories: several.'] },
    { id: 'marisol', at: MARISOL, face: { x: -0.5, z: 1 }, when: (S) => S.st.ch >= 8,
      lines: ['La-la-la… Just warming up my voice.', 'On a good night, the bay sings back.'] },
    { id: 'wick', at: WICK, face: { x: 0.2, z: 1 }, when: (S) => S.st.ch >= 8,
      lines: ['A hat is a roof for thoughts.', 'I measure twice, cut once, then have supper.'] },
    { id: 'ashby', at: ASHBY, face: { x: 0.3, z: 1 }, when: (S) => S.st.ch >= 8,
      lines: ['The tree remembers… everything. Especially the woodpeckers.', 'I planted this tree as a boy… We were both quite small.'] },
    // (the Understudies, on the road with the heroes now — and on the stage for their act)
    { id: 'minnow', at: (S) => (onStage(S) ? [STAGE[0] - 1.3, STAGE[1] + 2.2] : S.done('c8_festival') ? [ROOTHOLM[0] + 0.8, ROOTHOLM[1] + 1.2] : [PATCH[0] - 2.6, PATCH[1] - 2]), face: { x: 0, z: 1 }, when: (S) => S.done('c8_patch') && !S.done('c8_tree'),
      lines: ['I’m the star of our act, and the others will agree any day now.', 'No more auditions for the Duchess: we’re with you now.'] },
    { id: 'fidget', at: (S) => (onStage(S) ? [STAGE[0], STAGE[1] + 2.2] : S.done('c8_festival') ? [ROOTHOLM[0] + 2, ROOTHOLM[1] + 1] : [PATCH[0] - 1.5, PATCH[1] - 2.4]), face: { x: -0.2, z: 1 }, when: (S) => S.done('c8_patch') && !S.done('c8_tree'),
      lines: ['I keep a list of what could go wrong, and you’re in the good column.', 'Firefly light is the one thing the Moth Queen’s moths can’t eat.'] },
    { id: 'brick', at: (S) => (onStage(S) ? [STAGE[0] + 1.3, STAGE[1] + 2.2] : S.done('c8_festival') ? [ROOTHOLM[0] + 3.2, ROOTHOLM[1] + 1.4] : [PATCH[0] - 0.2, PATCH[1] - 2.6]), face: { x: -0.2, z: 1 }, when: (S) => S.done('c8_patch') && !S.done('c8_tree'),
      lines: ['Brick likes it here: nobody says « understudy ».', 'Brick is on your side now, and Brick likes it.'] },
  ],
  quests: {
    c8_fired: {
      title: 'Fired', auto: true, lv: 32,
      brief: 'The Duchess has fired her three Understudies, up in the Great Tree. Captain Wendy can’t fly there: walk to {key}Harvestholm{/}, in Emberleaf Wood.',
      steps: [
        { do: 'scene', text: 'Watch the Duchess, up in {key}the Great Tree{/}', run: fired },
        { do: 'talk', npc: 'wendy', text: 'Talk to {key}Captain Wendy{/} by the Teacup, in Lanternport', run: wendyAutumn },
        { do: 'go', text: 'Walk south-east through Emberleaf Wood to {key}Harvestholm{/}', at: MARROW, r: 5, run: marrowTalk },
      ],
    },
    c8_patch: {
      title: 'Strangers in the Pumpkins', auto: true, after: 'c8_fired', lv: 33,
      brief: 'Moths eat every lantern in Harvestholm. And three strangers fell from the sky into {key}Hazel’s pumpkin patch{/}: go and see who.',
      steps: [
        { do: 'go', text: 'Find the three strangers in {key}Hazel’s pumpkin patch{/}, east of Harvestholm', at: PATCH, r: 4, run: patchTalk },
      ],
    },
    c8_fireflies: {
      title: 'Light That Can’t Be Eaten', auto: true, after: 'c8_patch', lv: 33,
      brief: 'Moths can’t eat the light of {key}fireflies{/}. Old Mo, in Stiltwater, knows where they dance: net enough of them to fill his jars.',
      steps: [
        { do: 'talk', npc: 'mo', text: 'Go and see {key}Old Mo{/} in {key}Stiltwater{/}, on the coast to the south-east', run: moTalk },
        { do: 'net', text: 'Net {key}fireflies{/} in the mangroves when they glow', at: GLADE, r: 6.5, n: 8, per: 2, flies: 12, model: buildFirefly },
        { do: 'talk', npc: 'mo', text: 'Bring the fireflies back to {key}Old Mo{/}, in Stiltwater', run: moJars },
      ],
    },
    c8_festival: {
      title: 'The Harvest Festival', auto: true, after: 'c8_fireflies', lv: 34,
      brief: 'Hang the firefly jars in {key}Harvestholm{/} to light its festival. Then the Understudies do their act on the stage: keep the beat for them.',
      steps: [
        { do: 'carry', text: 'Take the {key}jars{/} from Mo’s cart and hang them in {key}Harvestholm{/}’s lanes', from: CART, hooks: HOOKS, jar: buildJarModel, hook: buildHookPost },
        { do: 'scene', text: 'Watch {key}Harvestholm{/} light up', run: festivalLit },
        { do: 'rhythm', text: 'Keep the beat for the {key}Understudies’ act{/}, in front of the stage', at: STAGE_FRONT, r: 7, bpm: 104, need: 0.6,
          beats: [0, 1, 2, 3, 4, 4.5, 5, 6, 8, 9, 10, 10.5, 11, 12, 13, 14, 16, 16.5, 17, 18, 19, 20, 20.5, 21, 22, 23],
          go: 'The Understudies’ act!', fail: 'The juggling wobbles… From the top!',
          onStart: (S) => { for (const id of TRIO) { const n = S.npcFor(id); if (n) n.hop(); } },
          onHit: (S, n) => { const who = S.npcFor(TRIO[n % 3]); if (who) who.hop(); S.P.world.fx.emit('note', STAGE[0] - 1.2 + (n % 3) * 1.2, 2.6, STAGE[1], 1); } },
        { do: 'scene', text: 'Listen to Harvestholm clap for the Understudies', run: applause },
      ],
    },
    c8_tree: {
      title: 'The Great Tree', auto: true, after: 'c8_festival', lv: 35,
      brief: 'The Moth Queen is drinking the Heartlight, inside the Great Tree. Go in at Rootholm, lure her moths away with firefly jars and {key}beat her{/}.',
      steps: [
        { do: 'go', text: 'Take the road north-east to {key}Rootholm{/}, at the foot of the Great Tree', at: ROOTHOLM, r: 5 },
        { do: 'talk', npc: 'ashby', text: 'Talk to {key}Warden Ashby{/}, at the door of the Great Tree', run: ashbyTalk },
        { do: 'go', text: 'Enter {key}the Heartwood{/} through the door in the trunk', at: HEART_DOOR, r: 2.2, run: async (S) => { if (S.P.dungeons) await S.P.dungeons.enter('heartwood'); else S.flag('heartLit'); } },
        { do: 'dungeon', id: 'heartwood', text: 'Climb to the top of the Heartwood and beat the {key}Moth Queen{/}' },
      ],
      next: 9,
    },
    // ---- side quests
    c8_ring: {
      title: 'The Lost Harvest Ring', kind: 'side', giver: 'pumpkin', after: 'c8_patch', lv: 33, dust: 25,
      brief: 'The wind blew Hazel’s harvest ring into a leaf pile. Jump into the {key}ten piles{/} by her barn to find it.',
      offer: hazelOffer,
      steps: [
        { do: 'piles', text: 'Jump into the {key}leaf piles{/} by the barn to find Hazel’s ring', piles: PILES, find: 7, model: (r3d, i) => { const g = buildLeafPile(r3d, i); g.scale.setScalar(1.5); return g; }, found: 'The ring!',
          finds: ['Just leaves.', 'A very surprised hedgehog.', 'One sock (not yours).', 'An acorn, thinking about it.', 'More leaves. Excellent leaves.', 'A love letter to a pumpkin.'] },
        { do: 'talk', npc: 'pumpkin', text: 'Bring the ring back to {key}Hazel{/}, in her pumpkin patch', run: hazelDone },
      ],
    },
    c8_trade: {
      title: 'A Song for a Supper', kind: 'side', giver: 'marisol', after: 'c8_fireflies', lv: 34, dust: 25,
      brief: 'Marisol won’t sing in Stiltwater without her new hat, and Wick the Hatter can’t sew on an empty stomach. Find him {key}a fish{/}.',
      offer: marisolOffer,
      steps: [
        { do: 'talk', npc: 'wick', text: 'Go and hurry {key}Wick the Hatter{/}, in Stiltwater', run: async (S) => {
          await S.say('wick', 'Marisol’s hat? I can’t sew on an empty stomach. Bring me {key}Old Mo{/}’s fish, and it’s finished.', { expr: 'worried' }); } },
        { do: 'talk', npc: 'mo', text: 'Ask {key}Old Mo{/} for his fish, in Stiltwater', run: async (S) => {
          await S.say('mo', 'My supper? So Marisol gets her hat and sings tonight?{p}…She sings about me, a bit. Take it to {key}Wick{/}.', { expr: 'happy', speed: 0.85 }); } },
        { do: 'talk', npc: 'wick', text: 'Bring the fish to {key}Wick the Hatter{/}', run: async (S) => {
          await S.say('wick', 'A FISH! One moment…{p}Done: a hat with a little glowing jellyfish. Take it to {key}Marisol{/}!', { expr: 'love', hop: true }); } },
        { do: 'talk', npc: 'marisol', text: 'Take the new hat to {key}Marisol{/}', run: async (S) => {
          await S.say('marisol', 'Oh! A jellyfish! Tonight I’ll sing about a fisherman who gave up his supper for a song.', { expr: 'love', hop: true });
          await S.say('narrator', 'That night, all of Stiltwater hears it. Old Mo, eating bread, pretends there’s something in his eye.'); } },
      ],
    },
  },
};
