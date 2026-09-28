// Wanderers of the wild lands (solo game): four travellers who camp by the
// waystones of their favourite land, with tips about it — and a wish for one
// of the animals' treats (bring it for a present). Pim the wandering merchant
// joins them at the Nomad Camp, except on Sundays (market day in the valley).
// In Party Mode the valley's villagers play this part.

import { NPCS } from '../data/npcs.js';

const DEFS = {
  rook: {
    name: 'Rook the Prospector', short: 'Rook', title: 'Prospector',
    look: { skin: 'umber', hair: 'short', hairColor: 'coal', eyes: 'amber', top: 'vest', topColor: 'brown', topColor2: 'mustard', bottom: 'pants', bottomColor: 'tan', shoes: 'brown', hat: 'straw', hatColor: 'mustard', acc: 'none', facial: 'beard' },
    voice: { pitch: 47, wave: 'square' },
  },
  sigrid: {
    name: 'Sigrid the Mountaineer', short: 'Sigrid', title: 'Mountaineer',
    look: { skin: 'porcelain', hair: 'braids', hairColor: 'butter', eyes: 'storm', top: 'coat', topColor: 'red', topColor2: 'white', bottom: 'pants', bottomColor: 'navy', shoes: 'charcoal', hat: 'beanie', hatColor: 'white', acc: 'scarf', facial: 'none' },
    voice: { pitch: 64, wave: 'triangle' },
  },
  moss: {
    name: 'Moss the Forager', short: 'Moss', title: 'Mushroom Forager',
    look: { skin: 'honey', hair: 'curly', hairColor: 'mint', eyes: 'forest', top: 'smock', topColor: 'lavender', topColor2: 'cream', bottom: 'shorts', bottomColor: 'sage', shoes: 'brown', hat: 'frog', hatColor: 'green', acc: 'freckles', facial: 'none' },
    voice: { pitch: 71, wave: 'sine' },
  },
  kai: {
    name: 'Kai the Pearl Diver', short: 'Kai', title: 'Pearl Diver',
    look: { skin: 'cocoa', hair: 'long', hairColor: 'espresso', eyes: 'ocean', top: 'tee', topColor: 'teal', topColor2: 'white', bottom: 'shorts', bottomColor: 'sky', shoes: 'cream', hat: 'bandana', hatColor: 'coral', acc: 'shades', facial: 'none' },
    voice: { pitch: 58, wave: 'triangle' },
  },
};
for (const [id, d] of Object.entries(DEFS)) NPCS[id] = { ...d, home: 'overworld', outdoors: true, visitor: true, wanderer: true, schedule: [], loves: [], likes: [], hates: [] };

// who camps where, what they say first, their tips, and the treat they'd love
export const WANDERERS = [
  { npc: 'rook', zone: 'canyon', wants: 'acorn',
    hello: 'Howdy, stranger! Name’s Rook. Forty years I’ve been poking round these red rocks, and they still surprise me.',
    tips: ['The minecart rails run right through the canyon. Hop in!', 'Beetles shrug off quick hits — try a big charged one!', 'Slingers run away when you close in. Corner them!', 'Boars love acorns. So do I, if I’m honest.'] },
  { npc: 'sigrid', zone: 'glacier', wants: 'honey',
    hello: 'Oh! A visitor, up here? I’m Sigrid. I climb things. Big cold things, mostly.',
    tips: ['The Frost Colossus sleeps by the ice arch. Break its armour first!', 'Bears adore honeycomb. So do I, dear.', 'Sleds go faster downhill. Mind the rocks!', 'Ice is slippery. I know, I know — but it is!'] },
  { npc: 'moss', zone: 'bouncecap', wants: 'bug',
    hello: 'Shh… the mushrooms are listening. Hello! I’m Moss. I pick mushrooms — only the ones that don’t bounce back.',
    tips: ['Jump next to a giant mushroom — boing!', 'Spore shamans call little friends. Stop them first!', 'Frogs love juicy bugs, the glowing kind.', 'Glowcaps light the way at night. Pretty, aren’t they?'] },
  { npc: 'kai', zone: 'lagoon', wants: 'kelp',
    hello: 'Hey hey! Kai, pearl diver. The water’s warm, the fish are chatty — you picked a good day.',
    tips: ['Where the water glints, take a deep breath and dive. Pearls!', 'Turtles love kelp — and they carry you across the sea!', 'Whirlpools spin you round and spit you out. Great fun.', 'Boats wait on the beaches. Row, sail — or fly!'] },
  { npc: 'merchant', zone: 'steppe', shop: true, tips: [] },
];
