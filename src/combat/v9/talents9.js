// Release v9: the four new heroes' talent trees — three specialisations each, the same shape as
// talents.js (rows 1–5, the capstone an ULTIMATE: kit9.js). Pure data (the phone reads it too).
// New mods (defaults in blessings.js freshMods): litT litK blindT rootT rootMul sparkBlind ·
// beaconT beaconR beaconHeal beaconFire beaconWard · sproutN sproutT sproutDmg sproutRoot wiltHeal
// wiltSpore cloverT · heatK sizzleT flambe grease snackN snackBuff tartHeal coffeeT leftovers ·
// turretT turretRate turretDmg turretTwin turretIce trapMax trapBoom trapRoot

const I = (g, s) => ({ g, s });
const each = (L, f) => { for (const x of L) f(x); };

export const TREES9 = {
  lamplighter: [
    {
      id: 'l_beacon', name: 'Beacon', icon: I('beacon', 'holy'), desc: 'A lantern that watches over everyone.',
      talents: [
        { id: 'l_steady', row: 1, col: 0, max: 3, n: [15, 30, 45], name: 'Steady Flame', desc: 'Beacon lasts {n}% longer.', icon: I('beacon', 'holy'), mod: (m, n) => { m.beaconT *= 1 + n / 100; } },
        { id: 'l_warm', row: 1, col: 1, max: 3, n: [5, 10, 15], name: 'Warm Glow', desc: '+{n}% max health.', icon: I('heart', 'holy'), mod: (m, n) => { m.hpPct += n / 100; } },
        { id: 'l_haven', row: 2, col: 0, max: 2, n: [50, 100], name: 'Safe Haven', desc: 'Beacon heals {n}% more.', icon: I('cross', 'holy'), mod: (m, n) => { m.beaconHeal += n / 100; } },
        { id: 'l_wide', row: 2, col: 1, max: 2, n: [15, 30], name: 'Wide Circle', desc: 'Beacon’s light reaches {n}% further.', icon: I('sun', 'holy'), mod: (m, n) => { m.beaconR *= 1 + n / 100; } },
        { id: 'l_ward', row: 3, col: 0, max: 1, name: 'Warding Light', desc: 'Friends in your Beacon’s light take 20% less damage.', icon: I('dome', 'holy'), mod: (m) => { m.beaconWard = 0.2; } },
        { id: 'l_pulse', row: 3, col: 1, max: 1, name: 'Bright Pulse', desc: 'Beacon pulses almost twice as often.', icon: I('flare', 'holy'), move: (M) => { M.special.every *= 0.55; } },
        { id: 'l_round', row: 4, col: 0.5, max: 2, n: [15, 30], name: 'Lamplighter’s Round', desc: 'Your special recharges {n}% faster.', icon: I('clock', 'holy'), mod: (m, n) => { m.cdr *= 1 - n / 100; } },
        { id: 'l_lighthouse', row: 5, col: 0.5, max: 1, ult: 'lighthouse', name: 'Lighthouse', desc: 'ULTIMATE — a great beam of light sweeps round you for 6 s: the gloom it touches is blinded and hurt, and friends close by heal.', icon: I('lantern', 'holy') },
      ],
    },
    {
      id: 'l_dazzle', name: 'Dazzle', icon: I('flare', 'arcane'), desc: 'Blind the gloom, and keep it lost.',
      talents: [
        { id: 'l_glare', row: 1, col: 0, max: 3, n: [15, 30, 45], name: 'Glare', desc: 'Your blinds last {n}% longer.', icon: I('eye', 'holy'), mod: (m, n) => { m.blindT *= 1 + n / 100; } },
        { id: 'l_quick', row: 1, col: 1, max: 3, n: [4, 8, 12], name: 'Quick Hands', desc: 'Swing {n}% faster.', icon: I('clock', 'phys'), mod: (m, n) => { m.recover *= 1 - n / 100; } },
        { id: 'l_bigflare', row: 2, col: 0, max: 2, n: [20, 40], name: 'Big Flare', desc: 'Flare is {n}% wider.', icon: I('flare', 'holy'), move: (M, n) => { M.heavy.r *= 1 + n / 100; } },
        { id: 'l_sparks', row: 2, col: 1, max: 2, n: [0.5, 1], name: 'Sparks Fly', desc: 'The thrust’s spark blinds {n} s longer.', icon: I('sparkles', 'holy'), mod: (m, n) => { m.sparkBlind += n; } },
        { id: 'l_stunflare', row: 3, col: 0, max: 1, name: 'Stunning Flare', desc: 'Flare also stuns the gloom for a second.', icon: I('shock', 'holy'), move: (M) => { M.heavy.stun = 1; } },
        { id: 'l_afterglow', row: 3, col: 1, max: 1, name: 'Afterglow', desc: 'Lit gloom stays lit twice as long.', icon: I('moon', 'holy'), mod: (m) => { m.litT *= 2; } },
        { id: 'l_spot', row: 4, col: 0.5, max: 2, n: [10, 20], name: 'In the Spotlight', desc: 'Lit gloom takes {n}% more from everyone.', icon: I('target', 'holy'), mod: (m, n) => { m.litK += n / 100; } },
        { id: 'l_dawn', row: 5, col: 0.5, max: 1, ult: 'dawn', name: 'Dawn', desc: 'ULTIMATE — dawn breaks around you: every gloom near is blinded for 4 s and glows, and bosses reel.', icon: I('sun', 'holy') },
      ],
    },
    {
      id: 'l_ember', name: 'Ember', icon: I('flame', 'fire'), desc: 'A lantern that burns.',
      talents: [
        { id: 'l_hot', row: 1, col: 0, max: 3, n: [4, 8, 12], name: 'Hot Glass', desc: 'Your sweeps hit {n}% harder.', icon: I('lantern', 'fire'), move: (M, n) => { each(M.light, (L) => { L.dmg *= 1 + n / 100; }); } },
        { id: 'l_sharp', row: 1, col: 1, max: 3, n: [3, 6, 9], name: 'Sharp Eyes', desc: '+{n}% critical hits.', icon: I('eye', 'fire'), mod: (m, n) => { m.crit += n / 100; } },
        { id: 'l_kindle', row: 2, col: 0, max: 2, n: [15, 30], name: 'Kindling', desc: 'Your hits burn {n}% of the time.', icon: I('flame', 'fire'), mod: (m, n) => { m.elemChance = Math.max(m.elemChance, n / 100); m.elem = m.elem || 'fire'; } },
        { id: 'l_long', row: 2, col: 1, max: 2, n: [10, 20], name: 'Long Pole', desc: 'Your sweeps reach {n}% further.', icon: I('arrow', 'phys'), move: (M, n) => { each(M.light, (L) => { if (L.range) L.range *= 1 + n / 100; }); } },
        { id: 'l_burnbeacon', row: 3, col: 0, max: 1, name: 'Burning Beacon', desc: 'Your Beacon’s pulses set the gloom alight.', icon: I('beacon', 'fire'), mod: (m) => { m.beaconFire = true; } },
        { id: 'l_lance', row: 3, col: 1, max: 1, name: 'Lance of Light', desc: 'The thrust reaches much further and hits harder.', icon: I('dash', 'holy'), move: (M) => { const L = M.light[2]; if (L && L.range) { L.range *= 1.4; L.dmg *= 1.3; L.arc = 0.8; } } },
        { id: 'l_blaze', row: 4, col: 0.5, max: 2, n: [15, 30], name: 'Blaze', desc: 'Your burns deal {n}% more.', icon: I('burst', 'fire'), mod: (m, n) => { m.burnMul += n / 100; } },
        { id: 'l_wisps', row: 5, col: 0.5, max: 1, ult: 'wisps', name: 'Will-o’-the-Wisps', desc: 'ULTIMATE — eight wisps of flame burst from your lantern and hunt down the gloom.', icon: I('flame', 'arcane') },
      ],
    },
  ],
  gardener: [
    {
      id: 'g_grove', name: 'Grove', icon: I('leaf', 'holy'), desc: 'Heal and shelter your friends.',
      talents: [
        { id: 'g_green', row: 1, col: 0, max: 3, n: [20, 40, 60], name: 'Green Thumb', desc: 'Your wilting sprouts heal {n}% more.', icon: I('leaf', 'holy'), mod: (m, n) => { m.wiltHeal += n / 100; } },
        { id: 'g_bark', row: 1, col: 1, max: 3, n: [3, 6, 9], name: 'Bark Skin', desc: 'Take {n}% less damage.', icon: I('shield', 'nature'), mod: (m, n) => { m.armor += n / 100; } },
        { id: 'g_clover', row: 2, col: 0, max: 2, n: [50, 100], name: 'Lucky Clover', desc: 'Your dodge’s clover lasts {n}% longer.', icon: I('leaf', 'nature'), mod: (m, n) => { m.cloverT *= 1 + n / 100; } },
        { id: 'g_dew', row: 2, col: 1, max: 2, n: [1, 2], name: 'Morning Dew', desc: 'Heal {n} health a second.', icon: I('drop', 'holy'), mod: (m, n) => { m.regen += n; } },
        { id: 'g_hedge', row: 3, col: 0, max: 1, name: 'Hedge', desc: 'Your special shields you for 20% of your health.', icon: I('dome', 'nature'), mod: (m) => { m.specialShield += 0.2; } },
        { id: 'g_bloom', row: 3, col: 1, max: 1, name: 'Healing Bloom', desc: 'Your special also heals everyone near you 15%.', icon: I('heart', 'nature'), move: (M) => { M.special.healNow = 0.15; } },
        { id: 'g_seasons', row: 4, col: 0.5, max: 2, n: [15, 30], name: 'Seasons', desc: 'Your special recharges {n}% faster.', icon: I('clock', 'nature'), mod: (m, n) => { m.cdr *= 1 - n / 100; } },
        { id: 'g_grove_u', row: 5, col: 0.5, max: 1, ult: 'grove', name: 'Blooming Grove', desc: 'ULTIMATE — a ring of flowers blooms round you for 6 s: friends inside heal fast, and the roots hold the gloom inside.', icon: I('sun', 'nature') },
      ],
    },
    {
      id: 'g_bramble', name: 'Bramble', icon: I('vine', 'nature'), desc: 'Hold the gloom fast.',
      talents: [
        { id: 'g_tangle', row: 1, col: 0, max: 3, n: [15, 30, 45], name: 'Tangle', desc: 'Your roots hold {n}% longer.', icon: I('vine', 'nature'), mod: (m, n) => { m.rootT *= 1 + n / 100; } },
        { id: 'g_sow', row: 1, col: 1, max: 3, n: [4, 8, 12], name: 'Quick Sowing', desc: 'Throw {n}% faster.', icon: I('seed', 'nature'), mod: (m, n) => { m.recover *= 1 - n / 100; } },
        { id: 'g_lash', row: 2, col: 0, max: 2, n: [20, 40], name: 'Long Lash', desc: 'Vine Lash reaches {n}% further.', icon: I('vine', 'storm'), move: (M, n) => { if (M.heavy.len) M.heavy.len *= 1 + n / 100; } },
        { id: 'g_thorn', row: 2, col: 1, max: 2, n: [10, 20], name: 'Thorny Seeds', desc: 'Your seeds hit {n}% harder.', icon: I('burst', 'nature'), move: (M, n) => { each(M.light, (L) => { L.dmg *= 1 + n / 100; if (L.explode) L.explode.dmg *= 1 + n / 100; }); } },
        { id: 'g_barbs', row: 3, col: 0, max: 1, name: 'Barbed Vines', desc: 'Vine Lash poisons the gloom it holds.', icon: I('drop', 'nature'), move: (M) => { M.heavy.elem = 'poison'; } },
        { id: 'g_pods', row: 3, col: 1, max: 1, name: 'Seed Pods', desc: 'Every seed bursts where it lands.', icon: I('seed', 'fire'), move: (M) => { each(M.light, (L) => { if (L.kind === 'shot' && !L.explode) L.explode = { r: 0.9, dmg: L.dmg * 0.8, knock: 1 }; }); } },
        { id: 'g_snare', row: 4, col: 0.5, max: 2, n: [10, 20], name: 'Snare', desc: 'Rooted gloom takes {n}% more from everyone.', icon: I('target', 'nature'), mod: (m, n) => { m.rootMul += n / 100; } },
        { id: 'g_brambles', row: 5, col: 0.5, max: 1, ult: 'brambles', name: 'Brambles', desc: 'ULTIMATE — brambles burst from the ground all round you: every gloom near is held fast for 3.5 s, and pricked with poison.', icon: I('vine', 'shadow') },
      ],
    },
    {
      id: 'g_sprouts', name: 'Sprouts', icon: I('sprout', 'nature'), desc: 'A little army of green.',
      talents: [
        { id: 'g_family', row: 1, col: 0, max: 3, n: [20, 40, 60], name: 'Big Family', desc: 'Your sprouts live {n}% longer.', icon: I('sprout', 'holy'), mod: (m, n) => { m.sproutT *= 1 + n / 100; } },
        { id: 'g_stems', row: 1, col: 1, max: 3, n: [15, 30, 45], name: 'Sturdy Stems', desc: 'Your sprouts bite {n}% harder.', icon: I('fist', 'nature'), mod: (m, n) => { m.sproutDmg += n / 100; } },
        { id: 'g_onemore', row: 2, col: 0, max: 2, n: [1, 2], name: 'One More', desc: '{n} more sprout(s) come up.', icon: I('sprout', 'nature'), mod: (m, n) => { m.sproutN += n; } },
        { id: 'g_growth', row: 2, col: 1, max: 2, n: [10, 20], name: 'Fast Growth', desc: 'Your special recharges {n}% faster.', icon: I('clock', 'nature'), mod: (m, n) => { m.cdr *= 1 - n / 100; } },
        { id: 'g_rootbite', row: 3, col: 0, max: 1, name: 'Rooting Bite', desc: 'Your sprouts’ bites root the gloom for a moment.', icon: I('vine', 'nature'), mod: (m) => { m.sproutRoot = true; } },
        { id: 'g_mush', row: 3, col: 1, max: 1, name: 'Mushroom Friends', desc: 'Your sprouts wilt in a puff of spores that poisons the gloom around.', icon: I('drop', 'shadow'), mod: (m) => { m.wiltSpore = true; } },
        { id: 'g_care', row: 4, col: 0.5, max: 2, n: [6, 12], name: 'Tender Care', desc: '+{n}% max health.', icon: I('heart', 'holy'), mod: (m, n) => { m.hpPct += n / 100; } },
        { id: 'g_pumpkin', row: 5, col: 0.5, max: 1, ult: 'pumpkin', name: 'Pumpkin Giant', desc: 'ULTIMATE — a giant pumpkin springs up and stomps the gloom for 8 s, then wilts into a big healing flower.', icon: I('sprout', 'fire') },
      ],
    },
  ],
  cook: [
    {
      id: 'c_feast', name: 'Feast', icon: I('tart', 'holy'), desc: 'Nobody fights hungry.',
      talents: [
        { id: 'c_portions', row: 1, col: 0, max: 3, n: [10, 20, 30], name: 'Big Portions', desc: 'Your tarts heal {n}% more.', icon: I('tart', 'holy'), mod: (m, n) => { m.tartHeal += n / 100; } },
        { id: 'c_apron', row: 1, col: 1, max: 3, n: [3, 6, 9], name: 'Thick Apron', desc: 'Take {n}% less damage.', icon: I('shield', 'phys'), mod: (m, n) => { m.armor += n / 100; } },
        { id: 'c_seconds', row: 2, col: 0, max: 2, n: [1, 2], name: 'Seconds', desc: 'Snack Time throws {n} more tart(s).', icon: I('tart', 'nature'), mod: (m, n) => { m.snackN += n; } },
        { id: 'c_espresso', row: 2, col: 1, max: 2, n: [3, 6], name: 'Espresso', desc: 'Your coffee keeps friends quick {n} s longer.', icon: I('boot', 'fire'), mod: (m, n) => { m.coffeeT += n; } },
        { id: 'c_picnic', row: 3, col: 0, max: 1, name: 'Picnic Blanket', desc: 'Snack Time also makes friends near you hit 15% harder for 6 s.', icon: I('crown', 'holy'), mod: (m) => { m.snackBuff = 0.15; } },
        { id: 'c_leftovers', row: 3, col: 1, max: 1, name: 'Leftovers', desc: 'Gloom you beat now and then leaves a tart behind.', icon: I('tart', 'shadow'), mod: (m) => { m.leftovers = 0.15; } },
        { id: 'c_prep', row: 4, col: 0.5, max: 2, n: [15, 30], name: 'Mise en Place', desc: 'Your special recharges {n}% faster.', icon: I('clock', 'holy'), mod: (m, n) => { m.cdr *= 1 - n / 100; } },
        { id: 'c_feast_u', row: 5, col: 0.5, max: 1, ult: 'feast', name: 'Grand Feast', desc: 'ULTIMATE — a feast for everyone: all friends heal 60% (the fallen get up), hit 25% harder for 8 s, and snacks rain down.', icon: I('tart', 'fire') },
      ],
    },
    {
      id: 'c_flambe', name: 'Flambé', icon: I('flame', 'fire'), desc: 'Turn up the heat.',
      talents: [
        { id: 'c_heat', row: 1, col: 0, max: 3, n: [15, 30, 45], name: 'High Heat', desc: 'Your heat builds {n}% faster.', icon: I('flame', 'fire'), mod: (m, n) => { m.heatK *= 1 + n / 100; } },
        { id: 'c_spicy', row: 1, col: 1, max: 3, n: [10, 20, 30], name: 'Spicy', desc: 'Flambé hits {n}% harder.', icon: I('burst', 'fire'), move: (M, n) => { M.heavy.dmg *= 1 + n / 100; } },
        { id: 'c_sizzle', row: 2, col: 0, max: 2, n: [2, 4], name: 'Long Sizzle', desc: 'Sizzling lasts {n} s longer.', icon: I('clock', 'fire'), mod: (m, n) => { m.sizzleT += n; } },
        { id: 'c_widepan', row: 2, col: 1, max: 2, n: [15, 30], name: 'Wide Pan', desc: 'Flambé is {n}% bigger.', icon: I('pan', 'fire'), move: (M, n) => { if (M.heavy.r) M.heavy.r *= 1 + n / 100; } },
        { id: 'c_grease', row: 3, col: 0, max: 1, name: 'Grease Fire', desc: 'Flambé leaves the ground burning.', icon: I('flame', 'shadow'), mod: (m) => { m.grease = true; } },
        { id: 'c_fullflambe', row: 3, col: 1, max: 1, name: 'Full Flambé', desc: 'Your heat makes Flambé twice as strong.', icon: I('meteor', 'fire'), mod: (m) => { m.flambe += 0.6; } },
        { id: 'c_charred', row: 4, col: 0.5, max: 2, n: [15, 30], name: 'Charred', desc: 'Your burns deal {n}% more.', icon: I('burst', 'shadow'), mod: (m, n) => { m.burnMul += n / 100; } },
        { id: 'c_tornado', row: 5, col: 0.5, max: 1, ult: 'tornado', name: 'Flambé Tornado', desc: 'ULTIMATE — become a whirling tornado of flame for 4 s, racing through the gloom and setting it alight.', icon: I('tornado', 'fire') },
      ],
    },
    {
      id: 'c_whisk', name: 'Whisking', icon: I('whisk', 'phys'), desc: 'Faster, and faster, and faster.',
      talents: [
        { id: 'c_wrist', row: 1, col: 0, max: 3, n: [4, 8, 12], name: 'Quick Wrist', desc: 'Whisk {n}% faster.', icon: I('whisk', 'phys'), mod: (m, n) => { m.recover *= 1 - n / 100; } },
        { id: 'c_feet', row: 1, col: 1, max: 3, n: [4, 8, 12], name: 'Busy Feet', desc: 'Move {n}% faster.', icon: I('boot', 'nature'), mod: (m, n) => { m.speed *= 1 + n / 100; } },
        { id: 'c_beat', row: 2, col: 0, max: 2, n: [8, 16], name: 'Beat It', desc: 'Your whisking hits {n}% harder.', icon: I('fist', 'phys'), move: (M, n) => { each(M.light, (L) => { L.dmg *= 1 + n / 100; }); } },
        { id: 'c_butter', row: 2, col: 1, max: 2, n: [15, 30], name: 'Buttery', desc: 'Dodge again {n}% sooner.', icon: I('dash', 'phys'), mod: (m, n) => { m.rollCd *= 1 - n / 100; } },
        { id: 'c_whipped', row: 3, col: 0, max: 1, name: 'Whipped', desc: 'Your last whisk of a combo hits everything around you.', icon: I('whirl', 'phys'), move: (M) => { const L = M.light[M.light.length - 1]; if (L && L.kind === 'melee') { L.arc = 6.2; L.range *= 1.2; } } },
        { id: 'c_salt', row: 3, col: 1, max: 1, name: 'Pinch of Salt', desc: '+8% critical hits.', icon: I('sparkles', 'phys'), mod: (m) => { m.crit += 0.08; } },
        { id: 'c_helping', row: 4, col: 0.5, max: 2, n: [1, 2], name: 'Second Helping', desc: 'Every hit heals you {n}.', icon: I('heart', 'phys'), mod: (m, n) => { m.lifesteal += n; } },
        { id: 'c_rush', row: 5, col: 0.5, max: 1, ult: 'rush', name: 'Rush Hour', desc: 'ULTIMATE — the dinner rush: for 5 s you whisk 30% faster and every hit is a critical one.', icon: I('clock', 'fire') },
      ],
    },
  ],
  tinkerer: [
    {
      id: 'n_workshop', name: 'Workshop', icon: I('kettle', 'fire'), desc: 'Tea for the gloom, piping hot.',
      talents: [
        { id: 'n_boil', row: 1, col: 0, max: 3, n: [10, 20, 30], name: 'Rolling Boil', desc: 'Your turret pours {n}% faster.', icon: I('kettle', 'fire'), mod: (m, n) => { m.turretRate *= 1 - n / 100; } },
        { id: 'n_brass', row: 1, col: 1, max: 3, n: [3, 6, 9], name: 'Brass Plating', desc: 'Take {n}% less damage.', icon: I('shield', 'storm'), mod: (m, n) => { m.armor += n / 100; } },
        { id: 'n_bigkettle', row: 2, col: 0, max: 2, n: [30, 60], name: 'Big Kettle', desc: 'Your turret lasts {n}% longer.', icon: I('clock', 'fire'), mod: (m, n) => { m.turretT *= 1 + n / 100; } },
        { id: 'n_scald', row: 2, col: 1, max: 2, n: [15, 30], name: 'Scalding', desc: 'Your turret’s tea hits {n}% harder.', icon: I('burst', 'fire'), mod: (m, n) => { m.turretDmg += n / 100; } },
        { id: 'n_twin', row: 3, col: 0, max: 1, name: 'Twin Spout', desc: 'Your turret pours two cups at once.', icon: I('kettle', 'storm'), mod: (m) => { m.turretTwin = true; } },
        { id: 'n_sugar', row: 3, col: 1, max: 1, name: 'Iced Tea', desc: 'Your turret’s tea chills the gloom.', icon: I('snow', 'frost'), mod: (m) => { m.turretIce = true; } },
        { id: 'n_assembly', row: 4, col: 0.5, max: 2, n: [15, 30], name: 'Quick Assembly', desc: 'Your special recharges {n}% faster.', icon: I('cog', 'storm'), mod: (m, n) => { m.cdr *= 1 - n / 100; } },
        { id: 'n_teaparty', row: 5, col: 0.5, max: 1, ult: 'teaparty', name: 'Tea Party', desc: 'ULTIMATE — three big tea turrets pop up around you and pour for 8 s.', icon: I('kettle', 'holy') },
      ],
    },
    {
      id: 'n_traps', name: 'Traps', icon: I('spring', 'storm'), desc: 'Mind your step.',
      talents: [
        { id: 'n_stiff', row: 1, col: 0, max: 3, n: [10, 20, 30], name: 'Stiff Springs', desc: 'Your traps hit {n}% harder.', icon: I('spring', 'storm'), move: (M, n) => { if (M.heavy.kind === 'trap') M.heavy.dmg *= 1 + n / 100; } },
        { id: 'n_windup', row: 1, col: 1, max: 3, n: [10, 20, 30], name: 'Wind-up', desc: 'Charge your heavies {n}% faster.', icon: I('cog', 'phys'), mod: (m, n) => { m.charge *= 1 - n / 100; } },
        { id: 'n_spare', row: 2, col: 0, max: 2, n: [1, 2], name: 'Spare Parts', desc: '{n} more trap(s) at once.', icon: I('cog', 'storm'), mod: (m, n) => { m.trapMax += n; } },
        { id: 'n_trigger', row: 2, col: 1, max: 2, n: [15, 30], name: 'Hair Trigger', desc: 'Your traps are {n}% wider.', icon: I('target', 'storm'), move: (M, n) => { if (M.heavy.kind === 'trap') M.heavy.r *= 1 + n / 100; } },
        { id: 'n_boomspring', row: 3, col: 0, max: 1, name: 'Boom Spring', desc: 'Your traps explode as they snap.', icon: I('bomb', 'fire'), mod: (m) => { m.trapBoom = true; } },
        { id: 'n_glue', row: 3, col: 1, max: 1, name: 'Sticky Glue', desc: 'Gloom your traps catch is held fast for 2 s.', icon: I('drop', 'storm'), mod: (m) => { m.trapRoot = 2; } },
        { id: 'n_dizzy', row: 4, col: 0.5, max: 2, n: [0.5, 1], name: 'Dizzy Springs', desc: 'Your traps stun {n} s longer.', icon: I('shock', 'storm'), move: (M, n) => { if (M.heavy.kind === 'trap') M.heavy.stun += n; } },
        { id: 'n_springfield', row: 5, col: 0.5, max: 1, ult: 'springfield', name: 'Spring Field', desc: 'ULTIMATE — eight spring traps scatter all round you at once.', icon: I('spring', 'fire') },
      ],
    },
    {
      id: 'n_steam', name: 'Steam', icon: I('cog', 'storm'), desc: 'Brass, steam and a heavy wrench.',
      talents: [
        { id: 'n_grip', row: 1, col: 0, max: 3, n: [4, 8, 12], name: 'Firm Grip', desc: 'Your blows hit {n}% harder.', icon: I('wrench', 'phys'), move: (M, n) => { each(M.light, (L) => { L.dmg *= 1 + n / 100; }); } },
        { id: 'n_riveted', row: 1, col: 1, max: 3, n: [5, 10, 15], name: 'Riveted', desc: '+{n}% max health.', icon: I('heart', 'storm'), mod: (m, n) => { m.hpPct += n / 100; } },
        { id: 'n_glove', row: 2, col: 0, max: 2, n: [15, 30], name: 'Bigger Glove', desc: 'The spring punch reaches {n}% further.', icon: I('fist', 'storm'), move: (M, n) => { const L = M.light[2]; if (L && L.glove) L.range *= 1 + n / 100; } },
        { id: 'n_livewire', row: 2, col: 1, max: 2, n: [15, 30], name: 'Live Wire', desc: 'Your blows shock {n}% of the time.', icon: I('bolt', 'storm'), mod: (m, n) => { m.elemChance = Math.max(m.elemChance, n / 100); m.elem = m.elem || 'shock'; } },
        { id: 'n_payload', row: 3, col: 0, max: 1, name: 'Heavy Payload', desc: 'Gadget Drop is much bigger.', icon: I('bomb', 'storm'), move: (M) => { if (M.air) { M.air.r *= 1.5; M.air.dmg *= 1.5; } } },
        { id: 'n_recoil', row: 3, col: 1, max: 1, name: 'Recoil', desc: 'The spring punch knocks the gloom much further, and stuns it.', icon: I('shock', 'phys'), move: (M) => { const L = M.light[2]; if (L && L.glove) { L.knock *= 1.6; L.stun = 0.8; } } },
        { id: 'n_oiled', row: 4, col: 0.5, max: 2, n: [15, 30], name: 'Well Oiled', desc: 'Dodge again {n}% sooner.', icon: I('dash', 'storm'), mod: (m, n) => { m.rollCd *= 1 - n / 100; } },
        { id: 'n_steamsuit', row: 5, col: 0.5, max: 1, ult: 'steamsuit', name: 'Steam Suit', desc: 'ULTIMATE — climb into a steam suit for 8 s: a thick shield, much less damage taken, and every blow shakes the ground.', icon: I('cog', 'fire') },
      ],
    },
  ],
};
