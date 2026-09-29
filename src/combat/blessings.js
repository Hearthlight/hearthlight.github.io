// Blessings: little perks picked between arena waves — on your phone, or on the big screen with a
// keyboard or a gamepad (three random cards, choose one). They stack.

export const BLESSINGS = {
  stew: { name: 'Hearty Stew', desc: '+30 max health', apply: (m) => { m.hp += 30; } },
  spoon: { name: 'Sharpened Spoon', desc: '+20% damage', apply: (m) => { m.dmg *= 1.2; } },
  boots: { name: 'Swift Boots', desc: '+15% move speed', apply: (m) => { m.speed *= 1.15; } },
  hands: { name: 'Quick Hands', desc: 'Special recharges 30% faster', apply: (m) => { m.cdr *= 0.7; } },
  honey: { name: 'Honey Drops', desc: 'Heal 2 health every second', apply: (m) => { m.regen += 2; } },
  clover: { name: 'Lucky Clover', desc: '+15% critical hits (double damage)', apply: (m) => { m.crit += 0.15; } },
  spring: { name: 'Spring Shoes', desc: 'Jump again in mid-air', apply: (m) => { m.doubleJump = true; } },
  cuddle: { name: 'Cuddle Charm', desc: 'Every hit heals you a little', apply: (m) => { m.lifesteal += 2; } },
  fireworks: { name: 'Firework Finish', desc: 'Beaten foes go off like fireworks', apply: (m) => { m.fireworks = true; } },
  swing: { name: 'Big Swing', desc: 'Attacks reach 30% further', apply: (m) => { m.range *= 1.3; } },
  wool: { name: 'Thick Wool Jumper', desc: 'Take 15% less damage', apply: (m) => { m.armor += 0.15; } },
  magnet: { name: 'Star Magnet', desc: 'Grab stardust from afar, and more of it', apply: (m) => { m.magnet *= 2.2; m.xp *= 1.4; } },
  wind: { name: 'Second Wind', desc: 'Get back up by yourself once per wave', apply: (m) => { m.secondWind += 1; } },
  tempo: { name: 'Allegro', desc: 'Attack 20% faster', apply: (m) => { m.recover *= 0.8; } },
};

export function freshMods() {
  return { hp: 0, dmg: 1, speed: 1, cdr: 1, regen: 0, crit: 0.05, doubleJump: false, lifesteal: 0, fireworks: false, range: 1, armor: 0, magnet: 1, xp: 1, secondWind: 0, recover: 1,
    // talents & gear (Party v3)
    hpPct: 0, thorns: 0, rollCd: 1, elem: null, elemChance: 0, juggle: 0, rollReload: 0, crescendo: false,
    // talents v4 (Adventure v4)
    specialShield: 0, lowArmor: 0, critMul: 1, critCdr: 0, killCdr: 0, burnMul: 1, chillMul: 0, freezeAt: 3, frozenMul: 1,
    shatter: false, combust: false, charge: 1, blink: false, poisonMax: 3, evade: 0, caltrops: false, rollBuff: 0, aura: 0,
    // Release v9: the Lamplighter, the Gardener, the Cook, the Tinkerer (kit9.js)
    litT: 1, litK: 0, blindT: 1, rootT: 1, rootMul: 0, sparkBlind: 0.8, beaconT: 1, beaconR: 1, beaconHeal: 0, beaconFire: false, beaconWard: 0,
    sproutN: 0, sproutT: 1, sproutDmg: 0, sproutRoot: false, wiltHeal: 0, wiltSpore: false, cloverT: 1,
    heatK: 1, sizzleT: 0, flambe: 0, grease: false, snackN: 0, snackBuff: 0, tartHeal: 0, coffeeT: 0, leftovers: 0,
    turretT: 1, turretRate: 1, turretDmg: 0, turretTwin: false, turretIce: false, trapMax: 0, trapBoom: false, trapRoot: 0 };
}

export function applyBlessings(ids) {
  const m = freshMods();
  for (const id of ids) if (BLESSINGS[id]) BLESSINGS[id].apply(m);
  return m;
}

// three different cards (not ones you can't use twice)
export function drawCards(owned, n = 3) {
  const pool = Object.keys(BLESSINGS).filter((id) => !((id === 'spring' || id === 'fireworks') && owned.includes(id)));
  const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}
