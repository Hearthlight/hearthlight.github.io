// Talent trees v4 (WoW-like). Every hero has three specialisations of five
// rows: row 1 two talents of 3 ranks, row 2 two of 2 ranks, row 3 two that
// change how a move works, row 4 one of 2 ranks, and row 5 the capstone — an
// ULTIMATE. A row opens once enough points sit in its branch (0/3/6/9/11), a
// branch holds 15 points, and heroes stop at level 40: 39 points, two full
// specialisations and most of the third. Pure data + helpers (the phone reads it
// too); `talentMods` / `buildMoves` turn a hero's picks into a fighter, the
// ultimates themselves live in combat.js.
//
// A pick list is { id: rank }. Each talent: row, col, max ranks, name, desc
// (with {n} = the value at a rank: `n[rank - 1]`), an icon, and mod(m, n, r)
// for stats / move(M, n, r) for how the moves work.

export const MAX_LEVEL = 40;          // (World v7: was 30)
export const ROW_NEED = [0, 3, 6, 9, 11];
export const pointsFor = (level) => Math.max(0, Math.min(MAX_LEVEL, level || 1) - 1);

import { TREES9 } from '../v9/talents9.js';

const I = (g, s) => ({ g, s });
const each = (L, f) => { for (const x of L) f(x); };

export const TREES = {
  knight: [
    {
      id: 'k_guard', name: 'Guardian', icon: I('shield', 'phys'), desc: 'Stand in front: armour, shields and taunts.',
      talents: [
        { id: 'k_iron', row: 1, col: 0, max: 3, n: [4, 8, 12], name: 'Iron Skin', desc: 'Take {n}% less damage.', icon: I('shield', 'phys'), mod: (m, n) => { m.armor += n / 100; } },
        { id: 'k_hearty', row: 1, col: 1, max: 3, n: [6, 12, 18], name: 'Hearty', desc: '+{n}% max health.', icon: I('heart', 'holy'), mod: (m, n) => { m.hpPct += n / 100; } },
        { id: 'k_clang', row: 2, col: 0, max: 2, n: [2, 4], name: 'Clang!', desc: 'Pan Slam makes nearby gloom chase you for {n} s.', icon: I('target', 'phys'), move: (M, n) => { M.heavy.taunt = n; } },
        { id: 'k_thorns', row: 2, col: 1, max: 2, n: [20, 40], name: 'Prickly Apron', desc: 'Gloom that hits you takes {n}% of it back.', icon: I('burst', 'nature'), mod: (m, n) => { m.thorns += n / 100; } },
        { id: 'k_belly', row: 3, col: 0, max: 1, name: 'Iron Belly', desc: 'Belly Flop hits harder, farther, and stuns.', icon: I('quake', 'phys'), move: (M) => { M.air.r *= 1.4; M.air.dmg *= 1.4; M.air.stun = 1; } },
        { id: 'k_panshield', row: 3, col: 1, max: 1, name: 'Pan Shield', desc: 'Your special shields you for 20% of your health.', icon: I('dome', 'holy'), mod: (m) => { m.specialShield += 0.2; } },
        { id: 'k_stand', row: 4, col: 0.5, max: 2, n: [15, 30], name: 'Last Stand', desc: 'Below a third of your health, take {n}% less damage.', icon: I('shield', 'fire'), mod: (m, n) => { m.lowArmor += n / 100; } },
        { id: 'k_bulwark', row: 5, col: 0.5, max: 1, ult: 'bulwark', name: 'Bulwark', desc: 'ULTIMATE — a dome of cast iron: for 6 s everyone inside takes 60% less damage, and the gloom is pushed out and taunted.', icon: I('dome', 'holy') },
      ],
    },
    {
      id: 'k_storm', name: 'Tempest', icon: I('whirl', 'storm'), desc: 'Spin, pull, set the gloom alight.',
      talents: [
        { id: 'k_dizzy', row: 1, col: 0, max: 3, n: [15, 30, 45], name: 'Dizzy Dance', desc: 'Whirlwind lasts {n}% longer.', icon: I('whirl', 'phys'), move: (M, n) => { M.special.dur *= 1 + n / 100; } },
        { id: 'k_feet', row: 1, col: 1, max: 3, n: [4, 8, 12], name: 'Light Feet', desc: 'Move {n}% faster.', icon: I('boot', 'nature'), mod: (m, n) => { m.speed *= 1 + n / 100; } },
        { id: 'k_vortex', row: 2, col: 0, max: 2, n: [1, 2], name: 'Vortex', desc: 'Whirlwind pulls the gloom in (strength {n}).', icon: I('tornado', 'storm'), move: (M, n) => { M.special.pull = n; } },
        { id: 'k_edges', row: 2, col: 1, max: 2, n: [20, 40], name: 'Sharp Edges', desc: 'Whirlwind hits {n}% harder.', icon: I('sword', 'phys'), move: (M, n) => { M.special.dmg *= 1 + n / 100; } },
        { id: 'k_fire', row: 3, col: 0, max: 1, name: 'Fire Dance', desc: 'Whirlwind sets the gloom alight.', icon: I('flame', 'fire'), move: (M) => { M.special.elem = 'fire'; } },
        { id: 'k_static', row: 3, col: 1, max: 1, name: 'Static Pan', desc: 'Your swings often shock — sparks jump to a neighbour.', icon: I('bolt', 'storm'), mod: (m) => { m.elemChance = Math.max(m.elemChance, 0.3); m.elem = m.elem || 'shock'; } },
        { id: 'k_cyclone', row: 4, col: 0.5, max: 2, n: [15, 30], name: 'Cyclone', desc: 'Your special recharges {n}% faster.', icon: I('clock', 'storm'), mod: (m, n) => { m.cdr *= 1 - n / 100; } },
        { id: 'k_tempest', row: 5, col: 0.5, max: 1, ult: 'tempest', name: 'Tempest', desc: 'ULTIMATE — become a storm for 5 s: whirl, drag everything in, and lightning strikes the gloom around you.', icon: I('tornado', 'storm') },
      ],
    },
    {
      id: 'k_quake', name: 'Earthshaker', icon: I('quake', 'storm'), desc: 'Slams, shockwaves and juggles.',
      talents: [
        { id: 'k_bigpan', row: 1, col: 0, max: 3, n: [10, 20, 30], name: 'Big Pan', desc: 'Pan Slam reaches {n}% further.', icon: I('pan', 'phys'), move: (M, n) => { M.heavy.r *= 1 + n / 100; } },
        { id: 'k_hands', row: 1, col: 1, max: 3, n: [4, 8, 12], name: 'Heavy Hands', desc: 'Your swings hit {n}% harder.', icon: I('fist', 'phys'), move: (M, n) => { each(M.light, (L) => { L.dmg *= 1 + n / 100; }); } },
        { id: 'k_flip', row: 2, col: 0, max: 2, n: [15, 30], name: 'Pancake Flip', desc: 'Your third swing launches higher; juggled gloom takes {n}% more.', icon: I('rollingpin', 'phys'), move: (M) => { M.light[2].launch = (M.light[2].launch || 4) * 1.4; }, mod: (m, n) => { m.juggle += n / 100; } },
        { id: 'k_keen', row: 2, col: 1, max: 2, n: [4, 8], name: 'Keen Eye', desc: '+{n}% critical hits.', icon: I('eye', 'phys'), mod: (m, n) => { m.crit += n / 100; } },
        { id: 'k_thunder', row: 3, col: 0, max: 1, name: 'Thunderclap', desc: 'Pan Slam booms a second time, with lightning.', icon: I('bolt', 'storm'), move: (M) => { M.heavy.thunder = true; } },
        { id: 'k_after', row: 3, col: 1, max: 1, name: 'Aftershock', desc: 'Pan Slam’s shockwave rolls on: a second, wider ring.', icon: I('shock', 'phys'), move: (M) => { M.heavy.echo = true; } },
        { id: 'k_crush', row: 4, col: 0.5, max: 2, n: [25, 50], name: 'Crushing Blows', desc: 'Critical hits deal {n}% more damage.', icon: I('hammer', 'fire'), mod: (m, n) => { m.critMul += n / 100; } },
        { id: 'k_shaker', row: 5, col: 0.5, max: 1, ult: 'earthshaker', name: 'Earthshaker', desc: 'ULTIMATE — leap and slam: three shockwaves ripple out, launching and stunning all the gloom around.', icon: I('quake', 'storm') },
      ],
    },
  ],
  mage: [
    {
      id: 'm_pyro', name: 'Pyromancy', icon: I('comet', 'fire'), desc: 'Comets, burning ground, bigger booms.',
      talents: [
        { id: 'm_boom', row: 1, col: 0, max: 3, n: [12, 24, 36], name: 'Bigger Boom', desc: 'Comet explosions are {n}% bigger.', icon: I('burst', 'fire'), move: (M, n) => { M.heavy.explode.r *= 1 + n / 100; } },
        { id: 'm_kindle', row: 1, col: 1, max: 3, n: [15, 30, 45], name: 'Kindling', desc: 'Burning gloom takes {n}% more damage from the flames.', icon: I('flame', 'fire'), mod: (m, n) => { m.burnMul += n / 100; } },
        { id: 'm_scorch', row: 2, col: 0, max: 2, n: [2, 4], name: 'Scorched Earth', desc: 'Comets leave the ground burning for {n} s.', icon: I('flame', 'fire'), move: (M, n) => { M.heavy.burnGround = n; } },
        { id: 'm_ignite', row: 2, col: 1, max: 2, n: [15, 30], name: 'Ignite', desc: 'Star bolts set the gloom alight {n}% of the time.', icon: I('star', 'fire'), mod: (m, n) => { m.elem = 'fire'; m.elemChance = Math.max(m.elemChance, n / 100); } },
        { id: 'm_twin', row: 3, col: 0, max: 1, name: 'Twin Comet', desc: 'Your heavy attack throws two comets.', icon: I('comet', 'fire'), move: (M) => { M.heavy.twin = true; } },
        { id: 'm_combust', row: 3, col: 1, max: 1, name: 'Combustion', desc: 'Gloom that burns out explodes.', icon: I('bomb', 'fire'), mod: (m) => { m.combust = true; } },
        { id: 'm_pyro', row: 4, col: 0.5, max: 2, n: [25, 50], name: 'Pyromaniac', desc: 'Your heavy attack charges {n}% faster.', icon: I('clock', 'fire'), mod: (m, n) => { m.charge *= 1 - n / 100; } },
        { id: 'm_storm', row: 5, col: 0.5, max: 1, ult: 'meteors', name: 'Meteor Storm', desc: 'ULTIMATE — meteors rain down around you for 4 s, each one a fiery blast.', icon: I('meteor', 'fire') },
      ],
    },
    {
      id: 'm_frost', name: 'Frost', icon: I('snow', 'frost'), desc: 'Starfall, chills, frozen gloom.',
      talents: [
        { id: 'm_shower', row: 1, col: 0, max: 3, n: [1, 2, 3], name: 'Shower', desc: 'Starfall drops {n} more stars.', icon: I('sparkles', 'frost'), move: (M, n) => { M.special.count += n; } },
        { id: 'm_bite', row: 1, col: 1, max: 3, n: [8, 16, 24], name: 'Frostbite', desc: 'Chilled gloom takes {n}% more damage.', icon: I('snow', 'frost'), mod: (m, n) => { m.chillMul += n / 100; } },
        { id: 'm_bigfrost', row: 2, col: 0, max: 2, n: [15, 30], name: 'Big Frost', desc: 'Starfall stars are {n}% bigger.', icon: I('star', 'frost'), move: (M, n) => { M.special.r *= 1 + n / 100; M.special.dmg *= 1 + n / 200; } },
        { id: 'm_deep', row: 2, col: 1, max: 2, n: [2, 2], name: 'Deep Freeze', desc: 'Gloom freezes solid after {n} chills (rank 2: and stays frozen longer).', icon: I('drop', 'frost'), mod: (m, n, r) => { m.freezeAt = n; if (r >= 2) m.frozenMul = 1.6; } },
        { id: 'm_meteor', row: 3, col: 0, max: 1, name: 'Meteor', desc: 'Starfall ends with one huge star.', icon: I('meteor', 'frost'), move: (M) => { M.special.meteor = true; } },
        { id: 'm_shatter', row: 3, col: 1, max: 1, name: 'Shatter', desc: 'Frozen gloom that shatters bursts into ice shards.', icon: I('gem', 'frost'), mod: (m) => { m.shatter = true; } },
        { id: 'm_winter', row: 4, col: 0.5, max: 2, n: [15, 30], name: 'Winter’s Grip', desc: 'Your special recharges {n}% faster.', icon: I('clock', 'frost'), mod: (m, n) => { m.cdr *= 1 - n / 100; } },
        { id: 'm_zero', row: 5, col: 0.5, max: 1, ult: 'zero', name: 'Absolute Zero', desc: 'ULTIMATE — a blizzard bursts from you: all the gloom nearby freezes solid in a forest of ice.', icon: I('snow', 'frost') },
      ],
    },
    {
      id: 'm_arcane', name: 'Arcana', icon: I('star', 'arcane'), desc: 'Star bolts, shields and pure starlight.',
      talents: [
        { id: 'm_bright', row: 1, col: 0, max: 3, n: [6, 12, 18], name: 'Brighter Bolts', desc: 'Star bolts hit {n}% harder.', icon: I('star', 'arcane'), move: (M, n) => { each(M.light, (L) => { L.dmg *= 1 + n / 100; }); } },
        { id: 'm_mind', row: 1, col: 1, max: 3, n: [5, 10, 15], name: 'Clear Mind', desc: 'Your special recharges {n}% faster.', icon: I('eye', 'arcane'), mod: (m, n) => { m.cdr *= 1 - n / 100; } },
        { id: 'm_split', row: 2, col: 0, max: 2, n: [1, 2], name: 'Split Bolt', desc: 'Star bolts split when they hit (rank 2: the halves seek the gloom).', icon: I('arrows', 'arcane'), move: (M, n, r) => { each(M.light, (L) => { L.split = true; if (r >= 2) L.splitHome = true; }); } },
        { id: 'm_static', row: 2, col: 1, max: 2, n: [15, 30], name: 'Static', desc: 'Star bolts shock {n}% of the time.', icon: I('bolt', 'storm'), mod: (m, n) => { m.elemChance = Math.max(m.elemChance, n / 100); m.elem = m.elem || 'shock'; } },
        { id: 'm_barrier', row: 3, col: 0, max: 1, name: 'Star Barrier', desc: 'Your special shields you for 25% of your health.', icon: I('dome', 'arcane'), mod: (m) => { m.specialShield += 0.25; } },
        { id: 'm_blink', row: 3, col: 1, max: 1, name: 'Blink', desc: 'Your dodge blinks twice as far, in a puff of stars.', icon: I('wing', 'arcane'), mod: (m) => { m.blink = true; } },
        { id: 'm_surge', row: 4, col: 0.5, max: 2, n: [0.5, 1], name: 'Arcane Surge', desc: 'Critical hits recharge your special by {n} s.', icon: I('rune', 'arcane'), mod: (m, n) => { m.critCdr += n; } },
        { id: 'm_barrage', row: 5, col: 0.5, max: 1, ult: 'barrage', name: 'Arcane Barrage', desc: 'ULTIMATE — a torrent of homing star bolts for 3 s.', icon: I('orb', 'arcane') },
      ],
    },
  ],
  ranger: [
    {
      id: 'r_mark', name: 'Marksman', icon: I('crosshair', 'nature'), desc: 'Precise acorns that pierce and crit.',
      talents: [
        { id: 'r_pierce', row: 1, col: 0, max: 3, n: [1, 2, 3], name: 'Piercing Acorns', desc: 'Acorns go through {n} more foe(s).', icon: I('arrow', 'nature'), move: (M, n) => { each(M.light, (L) => { L.pierce = (L.pierce || 0) + n; }); } },
        { id: 'r_sharp', row: 1, col: 1, max: 3, n: [6, 12, 18], name: 'Sharp Shells', desc: 'Acorns hit {n}% harder.', icon: I('acorn', 'nature'), move: (M, n) => { each(M.light, (L) => { L.dmg *= 1 + n / 100; }); } },
        { id: 'r_rapid', row: 2, col: 0, max: 2, n: [10, 20], name: 'Rapid Fire', desc: 'Shoot {n}% faster.', icon: I('arrows', 'nature'), mod: (m, n) => { m.recover *= 1 - n / 100; } },
        { id: 'r_hawk', row: 2, col: 1, max: 2, n: [5, 10], name: 'Hawk Eye', desc: '+{n}% critical hits.', icon: I('eye', 'nature'), mod: (m, n) => { m.crit += n / 100; } },
        { id: 'r_double', row: 3, col: 0, max: 1, name: 'Double Shot', desc: 'Every acorn comes with a twin.', icon: I('slingshot', 'nature'), move: (M) => { each(M.light, (L) => { L.twin = true; }); } },
        { id: 'r_long', row: 3, col: 1, max: 1, name: 'Long Shot', desc: 'Acorns fly 60% further and faster.', icon: I('bow', 'nature'), move: (M) => { each(M.light, (L) => { L.life *= 1.35; L.speed *= 1.2; }); } },
        { id: 'r_deadly', row: 4, col: 0.5, max: 2, n: [25, 50], name: 'Deadly Aim', desc: 'Critical hits deal {n}% more damage.', icon: I('target', 'fire'), mod: (m, n) => { m.critMul += n / 100; } },
        { id: 'r_deadeye', row: 5, col: 0.5, max: 1, ult: 'deadeye', name: 'Deadeye', desc: 'ULTIMATE — 4 s of perfect aim: you shoot twice as fast and every acorn is a critical hit that pierces all.', icon: I('crosshair', 'nature') },
      ],
    },
    {
      id: 'r_boom', name: 'Demolition', icon: I('bomb', 'fire'), desc: 'Bombs, clusters and venom.',
      talents: [
        { id: 'r_bang', row: 1, col: 0, max: 3, n: [10, 20, 30], name: 'Big Bang', desc: 'Pinecone blasts hit {n}% harder.', icon: I('burst', 'fire'), move: (M, n) => { M.heavy.explode.dmg *= 1 + n / 100; } },
        { id: 'r_venom', row: 1, col: 1, max: 3, n: [10, 20, 30], name: 'Venom Tips', desc: 'Acorns poison {n}% of the time.', icon: I('drop', 'nature'), mod: (m, n) => { m.elemChance = Math.max(m.elemChance, n / 100); m.elem = m.elem || 'poison'; } },
        { id: 'r_cluster', row: 2, col: 0, max: 2, n: [2, 4], name: 'Cluster Bomb', desc: 'Pinecone bombs scatter {n} little ones.', icon: I('pinecone', 'fire'), move: (M, n) => { M.heavy.cluster = n; } },
        { id: 'r_toxic', row: 2, col: 1, max: 2, n: [4, 5], name: 'Toxic Cloud', desc: 'Poison stacks up to {n} times.', icon: I('skull', 'nature'), mod: (m, n) => { m.poisonMax = n; } },
        { id: 'r_sap', row: 3, col: 0, max: 1, name: 'Sticky Sap', desc: 'Pinecone bombs chill instead of poisoning.', icon: I('drop', 'frost'), move: (M) => { M.heavy.elem = 'ice'; } },
        { id: 'r_napalm', row: 3, col: 1, max: 1, name: 'Napalm', desc: 'Pinecone blasts leave the ground burning.', icon: I('flame', 'fire'), move: (M) => { M.heavy.burnGround = 3; } },
        { id: 'r_bigger', row: 4, col: 0.5, max: 2, n: [15, 30], name: 'Bigger Bombs', desc: 'Pinecone blasts are {n}% wider.', icon: I('bomb', 'fire'), move: (M, n) => { M.heavy.explode.r *= 1 + n / 100; } },
        { id: 'r_carpet', row: 5, col: 0.5, max: 1, ult: 'carpet', name: 'Carpet Bomb', desc: 'ULTIMATE — a string of pinecone bombs rains down in a line ahead of you: boom, boom, boom!', icon: I('bomb', 'fire') },
      ],
    },
    {
      id: 'r_scout', name: 'Scout', icon: I('boot', 'nature'), desc: 'Speed, dodges and volleys.',
      talents: [
        { id: 'r_nimble', row: 1, col: 0, max: 3, n: [4, 8, 12], name: 'Nimble', desc: 'Move {n}% faster.', icon: I('boot', 'nature'), mod: (m, n) => { m.speed *= 1 + n / 100; } },
        { id: 'r_light', row: 1, col: 1, max: 3, n: [10, 20, 30], name: 'Light Step', desc: 'Dodge again {n}% sooner.', icon: I('feather', 'nature'), mod: (m, n) => { m.rollCd *= 1 - n / 100; } },
        { id: 'r_reload', row: 2, col: 0, max: 2, n: [1, 2], name: 'Roll & Reload', desc: 'Dodging recharges your Volley by {n} s.', icon: I('clock', 'nature'), mod: (m, n) => { m.rollReload += n; } },
        { id: 'r_evade', row: 2, col: 1, max: 2, n: [6, 12], name: 'Evasion', desc: '{n}% chance to slip out of a hit entirely.', icon: I('dash', 'phys'), mod: (m, n) => { m.evade += n / 100; } },
        { id: 'r_hail', row: 3, col: 0, max: 1, name: 'Hailstorm', desc: 'Acorn Volley fires 4 more acorns.', icon: I('arrows', 'nature'), move: (M) => { M.special.count += 4; M.special.spread *= 1.2; } },
        { id: 'r_caltrops', row: 3, col: 1, max: 1, name: 'Caltrops', desc: 'Your dodge leaves prickly caltrops that slow the gloom.', icon: I('pinecone', 'nature'), mod: (m) => { m.caltrops = true; } },
        { id: 'r_adrenaline', row: 4, col: 0.5, max: 2, n: [15, 30], name: 'Adrenaline', desc: 'After a dodge, hit {n}% harder for 2 s.', icon: I('fist', 'nature'), mod: (m, n) => { m.rollBuff += n / 100; } },
        { id: 'r_shadow', row: 5, col: 0.5, max: 1, ult: 'shadow', name: 'Shadow Dash', desc: 'ULTIMATE — vanish and dash through up to six gloom in a flash, striking each one you pass.', icon: I('dash', 'shadow') },
      ],
    },
  ],
  bard: [
    {
      id: 'b_hearth', name: 'Hearthsong', icon: I('heart', 'holy'), desc: 'Heals, boosts and second chances.',
      talents: [
        { id: 'b_warm', row: 1, col: 0, max: 3, n: [10, 20, 30], name: 'Warm Voice', desc: 'Hearth Song heals {n}% more.', icon: I('heart', 'holy'), move: (M, n) => { M.special.heal *= 1 + n / 100; } },
        { id: 'b_lungs', row: 1, col: 1, max: 3, n: [5, 10, 15], name: 'Sturdy Lungs', desc: '+{n}% max health.', icon: I('heart', 'phys'), mod: (m, n) => { m.hpPct += n / 100; } },
        { id: 'b_linger', row: 2, col: 0, max: 2, n: [3, 5], name: 'Lingering Tune', desc: 'Hearth Song keeps healing for {n} s.', icon: I('notes', 'holy'), move: (M, n) => { M.special.regen = n; } },
        { id: 'b_rally', row: 2, col: 1, max: 2, n: [2, 4], name: 'Rally', desc: 'Hearth Song’s boost lasts {n} s longer.', icon: I('crown', 'holy'), move: (M, n) => { M.special.buff = { ...M.special.buff, t: M.special.buff.t + n }; } },
        { id: 'b_chorus', row: 3, col: 0, max: 1, name: 'Chorus', desc: 'Hearth Song’s boost is twice as strong.', icon: I('notes', 'song'), move: (M) => { M.special.buff = { ...M.special.buff, dmg: M.special.buff.dmg * 2 }; } },
        { id: 'b_angel', row: 3, col: 1, max: 1, name: 'Guardian Angel', desc: 'Hearth Song also shields your friends for 15% of their health.', icon: I('wing', 'holy'), move: (M) => { M.special.shield = 0.15; } },
        { id: 'b_refrain', row: 4, col: 0.5, max: 2, n: [15, 30], name: 'Quick Refrain', desc: 'Your special recharges {n}% faster.', icon: I('clock', 'holy'), mod: (m, n) => { m.cdr *= 1 - n / 100; } },
        { id: 'b_hymn', row: 5, col: 0.5, max: 1, ult: 'hymn', name: 'Hymn of the Hearth', desc: 'ULTIMATE — a hymn that fully heals everyone, wakes the nappers and makes the whole party untouchable for 3 s.', icon: I('sun', 'holy') },
      ],
    },
    {
      id: 'b_sym', name: 'Symphony', icon: I('notes', 'song'), desc: 'Notes that pierce, chill and knock back.',
      talents: [
        { id: 'b_echo', row: 1, col: 0, max: 3, n: [1, 2, 3], name: 'Echo', desc: 'Notes go through {n} more foe(s).', icon: I('note', 'song'), move: (M, n) => { each(M.light, (L) => { L.pierce = (L.pierce || 0) + n; }); } },
        { id: 'b_forte', row: 1, col: 1, max: 3, n: [6, 12, 18], name: 'Fortissimo', desc: 'Notes hit {n}% harder.', icon: I('notes', 'song'), move: (M, n) => { each(M.light, (L) => { L.dmg *= 1 + n / 100; }); } },
        { id: 'b_cold', row: 2, col: 0, max: 2, n: [15, 30], name: 'Cold Notes', desc: 'Notes chill {n}% of the time.', icon: I('snow', 'frost'), mod: (m, n) => { m.elemChance = Math.max(m.elemChance, n / 100); m.elem = m.elem || 'ice'; } },
        { id: 'b_reson', row: 2, col: 1, max: 2, n: [20, 40], name: 'Resonance', desc: 'Power Chord is {n}% bigger.', icon: I('shock', 'song'), move: (M, n) => { M.heavy.r *= 1 + n / 100; } },
        { id: 'b_stun', row: 3, col: 0, max: 1, name: 'Shockwave', desc: 'Power Chord stuns the gloom.', icon: I('shock', 'storm'), move: (M) => { M.heavy.stun = 1.1; } },
        { id: 'b_cresc', row: 3, col: 1, max: 1, name: 'Crescendo', desc: 'Every tenth note is a huge one.', icon: I('lute', 'song'), mod: (m) => { m.crescendo = true; } },
        { id: 'b_harmony', row: 4, col: 0.5, max: 2, n: [2, 4], name: 'Harmony', desc: 'Notes curve towards the gloom (strength {n}).', icon: I('spiral', 'song'), move: (M, n) => { each(M.light, (L) => { L.homing = (L.homing || 0) + n; }); } },
        { id: 'b_symph', row: 5, col: 0.5, max: 1, ult: 'symphony', name: 'Symphony', desc: 'ULTIMATE — five rings of music burst from you, one after another, hurling the gloom far away.', icon: I('harp', 'song') },
      ],
    },
    {
      id: 'b_rhythm', name: 'Rhythm', icon: I('drum', 'storm'), desc: 'Tempo, lifesteal and a party that never stops.',
      talents: [
        { id: 'b_tempo', row: 1, col: 0, max: 3, n: [4, 8, 12], name: 'Tempo', desc: 'Play {n}% faster.', icon: I('drum', 'storm'), mod: (m, n) => { m.recover *= 1 - n / 100; } },
        { id: 'b_groove', row: 1, col: 1, max: 3, n: [1, 2, 3], name: 'Groove', desc: 'Every hit heals you {n}.', icon: I('heart', 'song'), mod: (m, n) => { m.lifesteal += n; } },
        { id: 'b_dance', row: 2, col: 0, max: 2, n: [15, 30], name: 'Dance Floor', desc: 'Dodge again {n}% sooner.', icon: I('boot', 'song'), mod: (m, n) => { m.rollCd *= 1 - n / 100; } },
        { id: 'b_drums', row: 2, col: 1, max: 2, n: [6, 12], name: 'War Drums', desc: 'Friends near you hit {n}% harder.', icon: I('drum', 'fire'), mod: (m, n) => { m.aura += n / 100; } },
        { id: 'b_staccato', row: 3, col: 0, max: 1, name: 'Staccato', desc: 'Notes come in pairs.', icon: I('notes', 'storm'), move: (M) => { each(M.light, (L) => { L.twin = true; }); } },
        { id: 'b_thunder', row: 3, col: 1, max: 1, name: 'Thunder Chord', desc: 'Power Chord booms a second time, with lightning.', icon: I('bolt', 'storm'), move: (M) => { M.heavy.thunder = true; } },
        { id: 'b_show', row: 4, col: 0.5, max: 2, n: [1, 2], name: 'Showstopper', desc: 'Every gloom you beat recharges your special by {n} s.', icon: I('star', 'song'), mod: (m, n) => { m.killCdr += n; } },
        { id: 'b_encore', row: 5, col: 0.5, max: 1, ult: 'encore', name: 'Encore', desc: 'ULTIMATE — everyone’s special recharges at once, and the whole party moves and strikes 30% faster for 6 s.', icon: I('clock', 'song') },
      ],
    },
  ],
};

Object.assign(TREES, TREES9);             // (Release v9: the four new heroes' trees)

// the ultimates: what they are called, their icon, how much gauge a hero needs
export const ULTS = {};
export const TALENT = {};                 // id → { ...talent, cls, b }
for (const [cls, trees] of Object.entries(TREES)) trees.forEach((B, b) => {
  for (const T of B.talents) {
    TALENT[T.id] = { ...T, cls, b };
    if (T.ult) ULTS[T.ult] = { id: T.ult, cls, b, name: T.name, icon: T.icon, talent: T.id };
  }
});

// ------------------------------------------------------------------ picks
export function picksOf(prof, cls) {
  const all = prof.talents || (prof.talents = {});
  if (!all[cls] || Array.isArray(all[cls]) || typeof all[cls] !== 'object') all[cls] = {};
  return all[cls];
}

// v3's little trees (lists of ids) don't fit the new rows: their points come
// back to spend (true if anyone had picked something)
export function migrateTalents(prof) {
  const all = prof && prof.talents;
  if (!all) return false;
  let any = false;
  for (const k of Object.keys(all)) if (Array.isArray(all[k])) { any = any || all[k].length > 0; all[k] = {}; }
  return any;
}

export const rankOf = (P, id) => (P && P[id]) || 0;
export function spent(P) { let n = 0; for (const id in P) n += P[id] || 0; return n; }
export function spentIn(cls, P, b) { let n = 0; for (const T of TREES[cls][b].talents) n += rankOf(P, T.id); return n; }
export const valueAt = (T, rank) => (T.n ? T.n[Math.max(0, Math.min(T.n.length, rank) - 1)] : null);

// why can't this be learned? (null: it can)
export function whyNot(cls, P, id, level) {
  const T = TALENT[id];
  if (!T || T.cls !== cls) return 'Not your hero’s talent';
  if (rankOf(P, id) >= T.max) return 'Fully learned!';
  if (spent(P) >= pointsFor(level)) return 'Level up to earn a point';
  const need = ROW_NEED[T.row - 1];
  if (spentIn(cls, P, T.b) < need) return 'Spend {n} points in this branch first';
  return null;
}
export const canLearn = (cls, P, id, level) => !whyNot(cls, P, id, level);

// stat changes for a hero's picks
export function talentMods(mods, P) {
  for (const id in P) { const T = TALENT[id], r = P[id]; if (T && r > 0 && T.mod) T.mod(mods, valueAt(T, r), r); }
  return mods;
}

// the hero's own copy of its moves, with the picks applied
export function buildMoves(cls, P) {
  const clone = (o) => (o ? JSON.parse(JSON.stringify(o)) : o);
  const M = { light: cls.light.map(clone), heavy: clone(cls.heavy), special: clone(cls.special), air: clone(cls.air) };
  for (const id in P) {
    const T = TALENT[id], r = P[id];
    if (T && r > 0 && T.move) { try { T.move(M, valueAt(T, r), r); } catch (e) { /* a move this hero hasn't got */ } }
  }
  return M;
}

// the ultimate a hero has learned (the branch with the most points, if two)
export function ultOf(cls, P) {
  let best = null, bn = -1;
  (TREES[cls] || []).forEach((B, b) => { const cap = B.talents.find((T) => T.ult); if (cap && rankOf(P, cap.id) > 0) { const n = spentIn(cls, P, b); if (n > bn) { bn = n; best = cap.ult; } } });
  return best;
}
