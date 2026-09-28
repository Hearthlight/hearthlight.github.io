// Character look vocabulary shared by the 3D models, the creator and the
// Party Mode phone controller (which must not pull in Three.js).

import { SKIN, HAIR_COLORS, EYE_COLORS, CLOTH_COLORS } from '../art/palette.js';

export const HAIR_STYLES = {
  short: 'Short', bob: 'Bob', long: 'Long', ponytail: 'Ponytail', buns: 'Space Buns', curly: 'Curly',
  braids: 'Braids', wavy: 'Wavy', spiky: 'Spiky', topbun: 'Top Bun', afro: 'Cloud', pixie: 'Pixie', side: 'Tufts', bald: 'Bald',
};
export const TOP_STYLES = {
  tee: 'Tee', hoodie: 'Hoodie', sweater: 'Sweater', striped: 'Stripes', overalls: 'Overalls', dress: 'Dress',
  vest: 'Vest', apron: 'Apron', coat: 'Raincoat', flannel: 'Flannel', jacket: 'Jacket', smock: 'Smock', haori: 'Haori',
};
export const BOTTOM_STYLES = { pants: 'Trousers', shorts: 'Shorts', skirt: 'Skirt' };
export const HAT_STYLES = {
  none: 'None', beanie: 'Beanie', straw: 'Straw Hat', cap: 'Cap', flower: 'Flower Crown', bow: 'Big Bow', beret: 'Beret',
  bandana: 'Bandana', headphones: 'Headphones', catears: 'Cat Ears', frog: 'Frog Hat', witch: 'Wizard Hat', crown: 'Tiny Crown',
  tophat: 'Top Hat', fisher: 'Rain Hat',
};
// Hats you can only dig up while exploring in Party Mode (remembered per phone)
export const TREASURE_HATS = {
  starcrown: 'Starlight Crown', antlers: 'Antler Band', acorncap: 'Acorn Cap',
  glowcap: 'Glowcap Hat', panhelm: 'Pan Helmet', gloomhorns: 'Gloom Horns',
  // (World v7 M13: each rare wears one — it’s yours when they fall)
  tricorn: 'Captain’s Tricorn', lanternhat: 'Paper Lantern Hat', henhat: 'Hen Hat', pumpkinhat: 'Pumpkin Head',
  jellyhat: 'Jellyfish Hat', leafcrown: 'Crown of Leaves', ghosthat: 'Little Ghost', prismcrown: 'Prism Crown',
  windkey: 'Wind-Up Key', chapka: 'Big Fur Hat',
  // (Release v9) knitted by Grandmother Kraken, for whoever sets her free
  bobblehat: 'Grandmother’s Bobble Hat',
};
export const ACC_STYLES = { none: 'None', glasses: 'Round Glasses', shades: 'Sunglasses', freckles: 'Freckles', blush: 'Rosy Cheeks', bandaid: 'Band-Aid', scarf: 'Scarf' };
export const FACIAL_STYLES = { none: 'None', mustache: 'Mustache', beard: 'Beard' };

export const DEFAULT_LOOK = {
  skin: 'peach', hair: 'bob', hairColor: 'chestnut', eyes: 'cocoa',
  top: 'tee', topColor: 'coral', topColor2: 'cream', bottom: 'pants', bottomColor: 'blue', shoes: 'brown',
  hat: 'none', hatColor: 'mustard', acc: 'none', facial: 'none',
};

// Options for each customisable part, grouped the way the phone shows them.
const styles = (map) => Object.entries(map).map(([id, name]) => ({ id, name }));
const swatches = (list) => list.map((c) => ({ id: c.id, name: c.name, color: c.m }));
export const LOOK_GROUPS = [
  {
    name: 'Hair', parts: [
      { key: 'hair', label: 'Hairstyle', options: styles(HAIR_STYLES) },
      { key: 'hairColor', label: 'Hair colour', options: swatches(HAIR_COLORS) },
      { key: 'skin', label: 'Skin', options: swatches(SKIN) },
      { key: 'eyes', label: 'Eyes', options: swatches(EYE_COLORS) },
      { key: 'facial', label: 'Face fuzz', options: styles(FACIAL_STYLES) },
    ],
  },
  {
    name: 'Clothes', parts: [
      { key: 'top', label: 'Top', options: styles(TOP_STYLES) },
      { key: 'topColor', label: 'Top colour', options: swatches(CLOTH_COLORS) },
      { key: 'topColor2', label: 'Trim', options: swatches(CLOTH_COLORS) },
      { key: 'bottom', label: 'Bottoms', options: styles(BOTTOM_STYLES) },
      { key: 'bottomColor', label: 'Bottoms colour', options: swatches(CLOTH_COLORS) },
    ],
  },
  {
    name: 'Extras', parts: [
      { key: 'hat', label: 'Hat', options: styles(HAT_STYLES) },
      { key: 'hatColor', label: 'Hat colour', options: swatches(CLOTH_COLORS) },
      { key: 'acc', label: 'Accessory', options: styles(ACC_STYLES) },
      { key: 'shoes', label: 'Shoes', options: swatches(CLOTH_COLORS) },
    ],
  },
];

// A cheerful random outfit (mostly plain faces, hats now and then).
export function randomLook(rnd = Math.random) {
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const ids = (list) => list.map((x) => x.id);
  const bright = ['coral', 'red', 'orange', 'mustard', 'lime', 'sage', 'green', 'teal', 'sky', 'blue', 'navy', 'lavender', 'plum', 'pink', 'rose', 'cream'];
  return {
    ...DEFAULT_LOOK,
    skin: pick(ids(SKIN).slice(0, 6).concat(rnd() < 0.15 ? ids(SKIN).slice(6) : [])),
    hair: pick(Object.keys(HAIR_STYLES).filter((h) => h !== 'bald' && h !== 'side')),
    hairColor: pick(ids(HAIR_COLORS)),
    eyes: pick(ids(EYE_COLORS)),
    top: pick(Object.keys(TOP_STYLES)),
    topColor: pick(bright),
    topColor2: pick(['cream', 'white', 'mustard', 'sky', 'pink', 'navy']),
    bottom: pick(Object.keys(BOTTOM_STYLES)),
    bottomColor: pick(['blue', 'navy', 'brown', 'tan', 'charcoal', 'sage', 'plum', 'grey']),
    shoes: pick(['brown', 'charcoal', 'red', 'navy', 'tan']),
    hat: rnd() < 0.45 ? pick(Object.keys(HAT_STYLES).filter((h) => h !== 'none')) : 'none',
    hatColor: pick(bright),
    acc: rnd() < 0.3 ? pick(Object.keys(ACC_STYLES).filter((a) => a !== 'none')) : 'none',
    facial: rnd() < 0.12 ? pick(['mustache', 'beard']) : 'none',
  };
}

// Keep only known keys & values (looks arrive from phones).
export function cleanLook(look) {
  const out = { ...DEFAULT_LOOK };
  if (!look || typeof look !== 'object') return out;
  for (const g of LOOK_GROUPS) for (const p of g.parts) {
    const v = look[p.key];
    if (p.options.some((o) => o.id === v)) out[p.key] = v;
  }
  // (Big Sniff’s fur hat was once saved as 'furhat', the steppe folk’s own)
  const hat = look.hat === 'furhat' ? 'chapka' : look.hat;
  if (TREASURE_HATS[hat]) out.hat = hat;
  return out;
}
