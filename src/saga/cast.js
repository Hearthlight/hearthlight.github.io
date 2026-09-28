// World v7: the saga’s cast — the villains, the Understudies, the helpers met on
// the road. They join the villagers’ NPC table (looks, voices, name tags), so
// the dialogue box, portraits and every system that spawns an NPC know them.
// Special shapes (Crumble the gremlin, Perkins the pelican) have their own
// models: `model(r3d)` returns a CharModel-like rig (models/cast3d.js).

import { NPCS } from '../data/npcs.js';

const DEFS = {
  duchess: {
    name: 'Duchess Gloria Gloomsworth', short: 'The Duchess', title: 'A diva of the dark',
    look: { skin: 'porcelain', hair: 'long', hairColor: 'coal', eyes: 'violet', top: 'dress', topColor: 'plum', topColor2: 'lavender', bottom: 'skirt', bottomColor: 'plum', shoes: 'charcoal', hat: 'plume', hatColor: 'plum', acc: 'scarf' },
    voice: { pitch: 57, wave: 'square' }, scale: 1.14, tag: '#7a3a9a',
  },
  crumble: {
    name: 'Crumble', short: 'Crumble', title: 'Herald, stagehand & drummer',
    look: { skin: 'fae', hair: 'bald', hairColor: 'coal', eyes: 'amber', top: 'vest', topColor: 'red', topColor2: 'mustard', bottom: 'shorts', bottomColor: 'plum', shoes: 'charcoal', hat: 'bellhop', hatColor: 'red', acc: 'none' },
    voice: { pitch: 82, wave: 'square' }, scale: 0.7, tag: '#a8483a', special: 'crumble',
  },
  minnow: {
    name: 'Minnow', short: 'Minnow', title: 'An Understudy (the leader)',
    look: { skin: 'fae', hair: 'spiky', hairColor: 'rose', eyes: 'amber', top: 'striped', topColor: 'plum', topColor2: 'white', bottom: 'shorts', bottomColor: 'charcoal', shoes: 'red', hat: 'tophat', hatColor: 'charcoal', acc: 'none' },
    voice: { pitch: 79, wave: 'square' }, scale: 0.78, kid: true, tag: '#9a4a8a',
  },
  fidget: {
    name: 'Fidget', short: 'Fidget', title: 'An Understudy (the worrier)',
    look: { skin: 'fae', hair: 'pixie', hairColor: 'mint', eyes: 'storm', top: 'striped', topColor: 'plum', topColor2: 'white', bottom: 'pants', bottomColor: 'charcoal', shoes: 'brown', hat: 'beret', hatColor: 'charcoal', acc: 'glasses' },
    voice: { pitch: 70, wave: 'triangle' }, tag: '#6a4a9a',
  },
  brick: {
    name: 'Brick', short: 'Brick', title: 'An Understudy (the strong one)',
    look: { skin: 'fae', hair: 'bald', hairColor: 'coal', eyes: 'cocoa', top: 'striped', topColor: 'plum', topColor2: 'white', bottom: 'pants', bottomColor: 'charcoal', shoes: 'charcoal', hat: 'none', hatColor: 'charcoal', acc: 'none', facial: 'mustache' },
    voice: { pitch: 44, wave: 'sine' }, scale: 1.3, tag: '#5a3a7a',
  },
  perkins: {
    name: 'Perkins of the Pelican Post', short: 'Perkins', title: 'Postmaster',
    look: { skin: 'porcelain', hair: 'bald', hairColor: 'white', eyes: 'cocoa', top: 'coat', topColor: 'navy', topColor2: 'mustard', bottom: 'pants', bottomColor: 'navy', shoes: 'mustard', hat: 'cap', hatColor: 'navy', acc: 'none' },
    voice: { pitch: 50, wave: 'triangle' }, tag: '#3f6f9e', special: 'perkins',
  },
  wendy: {
    name: 'Captain Wendeline Gale', short: 'Wendy', title: 'Captain of the Dauntless Teacup',
    look: { skin: 'tan', hair: 'ponytail', hairColor: 'ginger', eyes: 'ocean', top: 'jacket', topColor: 'brown', topColor2: 'cream', bottom: 'pants', bottomColor: 'tan', shoes: 'brown', hat: 'aviator', hatColor: 'brown', acc: 'scarf' },
    voice: { pitch: 67, wave: 'triangle' }, tag: '#b8702a',
  },
  hazel: {
    name: 'Professor Hazel Burrows', short: 'Prof. Hazel', title: 'Scholar of the Lamplighters',
    look: { skin: 'honey', hair: 'buns', hairColor: 'silver', eyes: 'hazel', top: 'coat', topColor: 'sage', topColor2: 'cream', bottom: 'skirt', bottomColor: 'brown', shoes: 'brown', hat: 'none', acc: 'glasses' },
    voice: { pitch: 64, wave: 'sine' }, tag: '#5a7a4a',
  },
  // ---- chapter 2: the Whispering Woods
  rowan: {
    name: 'Old Rowan', short: 'Rowan', title: 'Head Forester of Deep Whisperwood',
    look: { skin: 'tan', hair: 'side', hairColor: 'snow', eyes: 'forest', top: 'flannel', topColor: 'green', topColor2: 'brown', bottom: 'pants', bottomColor: 'brown', shoes: 'brown', hat: 'fisher', hatColor: 'sage', acc: 'none', facial: 'beard' },
    voice: { pitch: 45, wave: 'sine' }, tag: '#4f7a3a',
  },
  tansy: {
    name: 'Tansy', short: 'Tansy', title: 'Apprentice forester (future Lamplighter)',
    look: { skin: 'peach', hair: 'braids', hairColor: 'ginger', eyes: 'hazel', top: 'overalls', topColor: 'green', topColor2: 'cream', bottom: 'shorts', bottomColor: 'brown', shoes: 'brown', hat: 'bandana', hatColor: 'red', acc: 'freckles' },
    voice: { pitch: 77, wave: 'square' }, kid: true, tag: '#c8603a',
  },
  barley: {
    name: 'Barley the Miller', short: 'Barley', title: 'Miller of Breezy Hill',
    look: { skin: 'porcelain', hair: 'short', hairColor: 'honey', eyes: 'ocean', top: 'apron', topColor: 'cream', topColor2: 'mustard', bottom: 'pants', bottomColor: 'blue', shoes: 'brown', hat: 'cap', hatColor: 'cream', acc: 'blush', facial: 'mustache' },
    voice: { pitch: 52, wave: 'triangle' }, scale: 1.1, tag: '#b8923a',
  },
  barkbeard: {
    name: 'Barkbeard', short: 'Barkbeard', title: 'Elder of the Deepwood',
    look: { skin: 'umber', hair: 'long', hairColor: 'mint', eyes: 'forest', top: 'coat', topColor: 'brown', topColor2: 'green', bottom: 'pants', bottomColor: 'brown', shoes: 'brown', hat: 'flower', hatColor: 'green', acc: 'none', facial: 'beard' },
    voice: { pitch: 34, wave: 'sine' }, scale: 1.7, tag: '#5a7a3a',
  },
  // ---- chapter 3: Dust & Spores
  tuya: {
    name: 'Grandmother Tuya', short: 'Tuya', title: 'Eldest of the Nomad Camp',
    look: { skin: 'honey', hair: 'braids', hairColor: 'silver', eyes: 'amber', top: 'haori', topColor: 'teal', topColor2: 'mustard', bottom: 'skirt', bottomColor: 'red', shoes: 'brown', hat: 'furhat', hatColor: 'teal', acc: 'none' },
    voice: { pitch: 58, wave: 'triangle' }, tag: '#3f9b98',
  },
  temur: {
    name: 'Temur', short: 'Temur', title: 'Rider of the Golden Steppe',
    look: { skin: 'honey', hair: 'spiky', hairColor: 'coal', eyes: 'hazel', top: 'vest', topColor: 'red', topColor2: 'mustard', bottom: 'pants', bottomColor: 'brown', shoes: 'brown', hat: 'furhat', hatColor: 'red', acc: 'none' },
    voice: { pitch: 72, wave: 'square' }, tag: '#c8423a',
  },
  dolly: {
    name: 'Sheriff Dolly', short: 'Dolly', title: 'Sheriff of Dusty Gulch',
    look: { skin: 'tan', hair: 'ponytail', hairColor: 'auburn', eyes: 'storm', top: 'vest', topColor: 'brown', topColor2: 'cream', bottom: 'pants', bottomColor: 'blue', shoes: 'brown', hat: 'cowboy', hatColor: 'tan', acc: 'none' },
    voice: { pitch: 60, wave: 'triangle' }, tag: '#c8944a',
  },
  boom: {
    name: 'Old Boom', short: 'Old Boom', title: 'The Human Cannonball (retired)',
    look: { skin: 'peach', hair: 'bald', hairColor: 'snow', eyes: 'ocean', top: 'striped', topColor: 'red', topColor2: 'cream', bottom: 'pants', bottomColor: 'navy', shoes: 'brown', hat: 'none', acc: 'none', facial: 'mustache' },
    voice: { pitch: 44, wave: 'sine' }, tag: '#c8383e',
  },
  nell: {
    name: 'Nugget Nell', short: 'Nell', title: 'Gold prospector',
    look: { skin: 'porcelain', hair: 'curly', hairColor: 'ginger', eyes: 'forest', top: 'flannel', topColor: 'red', topColor2: 'charcoal', bottom: 'pants', bottomColor: 'blue', shoes: 'brown', hat: 'straw', hatColor: 'mustard', acc: 'freckles' },
    voice: { pitch: 66, wave: 'square' }, tag: '#e0b030',
  },
  grubb: {
    name: 'Foreman Grubb', short: 'Grubb', title: 'Foreman of the Old Mine',
    look: { skin: 'tan', hair: 'short', hairColor: 'silver', eyes: 'storm', top: 'overalls', topColor: 'navy', topColor2: 'grey', bottom: 'pants', bottomColor: 'navy', shoes: 'brown', hat: 'hardhat', hatColor: 'mustard', acc: 'none', facial: 'mustache' },
    voice: { pitch: 38, wave: 'square' }, scale: 1.1, tag: '#e8a23a',
  },
  morel: {
    name: 'Old Morel', short: 'Morel', title: 'Eldest of the Sporefolk',
    look: { skin: 'fae', hair: 'bald', hairColor: 'snow', eyes: 'violet', top: 'smock', topColor: 'plum', topColor2: 'cream', bottom: 'pants', bottomColor: 'plum', shoes: 'brown', hat: 'glowcap', hatColor: 'lavender', acc: 'none', facial: 'beard' },
    voice: { pitch: 70, wave: 'sine' }, kid: true, tag: '#9a6ad0',
  },
  // ---- chapter 4: Mire & Frost
  croakington: {
    name: 'King Croakington', short: 'King Croakington', title: 'Sovereign of the Swamp',
    look: { skin: 'sprite', hair: 'bald', hairColor: 'coal', eyes: 'amber', top: 'coat', topColor: 'plum', topColor2: 'mustard', bottom: 'pants', bottomColor: 'plum', shoes: 'brown', hat: 'frog', hatColor: 'green', acc: 'blush' },
    voice: { pitch: 40, wave: 'square' }, scale: 1.1, tag: '#5aa04a',
  },
  newton: {
    name: 'Sir Newton', short: 'Sir Newton', title: 'Royal Herald of Croakmire',
    look: { skin: 'sprite', hair: 'bald', hairColor: 'coal', eyes: 'amber', top: 'vest', topColor: 'red', topColor2: 'mustard', bottom: 'pants', bottomColor: 'navy', shoes: 'brown', hat: 'plume', hatColor: 'red', acc: 'none' },
    voice: { pitch: 84, wave: 'square' }, kid: true, tag: '#c8423a',
  },
  yuki: {
    name: 'Mama Yuki', short: 'Mama Yuki', title: 'Keeper of the Frostpeak igloos',
    look: { skin: 'peach', hair: 'buns', hairColor: 'snow', eyes: 'ocean', top: 'sweater', topColor: 'red', topColor2: 'cream', bottom: 'skirt', bottomColor: 'navy', shoes: 'brown', hat: 'beanie', hatColor: 'cream', acc: 'blush' },
    voice: { pitch: 60, wave: 'triangle' }, tag: '#c8383e',
  },
  tobi: {
    name: 'Tobi', short: 'Tobi', title: 'Fastest sled on the glacier',
    look: { skin: 'honey', hair: 'pixie', hairColor: 'ginger', eyes: 'hazel', top: 'hoodie', topColor: 'sky', topColor2: 'white', bottom: 'pants', bottomColor: 'navy', shoes: 'brown', hat: 'beanie', hatColor: 'blue', acc: 'freckles' },
    voice: { pitch: 82, wave: 'square' }, kid: true, tag: '#3f6fae',
  },
  nimbus: {
    name: 'Sister Nimbus', short: 'Nimbus', title: 'Keeper of the Cloud Temple',
    look: { skin: 'porcelain', hair: 'long', hairColor: 'snow', eyes: 'ocean', top: 'haori', topColor: 'white', topColor2: 'sky', bottom: 'skirt', bottomColor: 'white', shoes: 'brown', hat: 'none', acc: 'none' },
    voice: { pitch: 66, wave: 'sine' }, tag: '#8ab8e0',
  },
  tenor: {
    name: 'the Frost Tenor', short: 'the Frost Tenor', title: 'Her Radiance’s leading man',
    look: { skin: 'porcelain', hair: 'spiky', hairColor: 'sky', eyes: 'violet', top: 'jacket', topColor: 'navy', topColor2: 'white', bottom: 'pants', bottomColor: 'navy', shoes: 'brown', hat: 'none', acc: 'none' },
    voice: { pitch: 50, wave: 'sine' }, scale: 1.2, tag: '#6ab0e8',
  },
  // ---- chapter 5: Sand & Sea
  saffron: {
    name: 'Auntie Saffron', short: 'Auntie Saffron', title: 'Caravan master of Palm Oasis',
    look: { skin: 'umber', hair: 'long', hairColor: 'charcoal', eyes: 'amber', top: 'haori', topColor: 'orange', topColor2: 'teal', bottom: 'skirt', bottomColor: 'teal', shoes: 'brown', hat: 'headwrap', hatColor: 'mustard', acc: 'none' },
    voice: { pitch: 56, wave: 'triangle' }, tag: '#e08a3a',
  },
  tariq: {
    name: 'Tariq', short: 'Tariq', title: 'Skipper of the glass-bottomed boat',
    look: { skin: 'tan', hair: 'curly', hairColor: 'espresso', eyes: 'hazel', top: 'striped', topColor: 'white', topColor2: 'blue', bottom: 'shorts', bottomColor: 'tan', shoes: 'brown', hat: 'cap', hatColor: 'navy', acc: 'none' },
    voice: { pitch: 74, wave: 'square' }, tag: '#3f6fae',
  },
  shellington: {
    name: 'Elder Shellington', short: 'Elder Shellington', title: 'Oldest of the Turtle Nest',
    look: { skin: 'sprite', hair: 'bald', hairColor: 'white', eyes: 'forest', top: 'vest', topColor: 'sage', topColor2: 'cream', bottom: 'pants', bottomColor: 'sage', shoes: 'brown', hat: 'turtle', hatColor: 'green', acc: 'glasses', facial: 'beard' },
    voice: { pitch: 36, wave: 'sine' }, scale: 1.1, tag: '#6a8a3a',
  },
  snap: {
    name: 'Snap', short: 'Snap', title: 'Youngest of the Turtle Nest',
    look: { skin: 'sprite', hair: 'bald', hairColor: 'white', eyes: 'amber', top: 'tee', topColor: 'lime', topColor2: 'cream', bottom: 'shorts', bottomColor: 'teal', shoes: 'brown', hat: 'turtle', hatColor: 'green', acc: 'freckles' },
    voice: { pitch: 90, wave: 'square' }, kid: true, tag: '#8aa84a',
  },
  zizi: {
    name: 'Zizi', short: 'Zizi', title: 'Purveyor of Fine Mirages',
    look: { skin: 'honey', hair: 'spiky', hairColor: 'honey', eyes: 'amber', top: 'coat', topColor: 'plum', topColor2: 'mustard', bottom: 'pants', bottomColor: 'charcoal', shoes: 'brown', hat: 'catears', hatColor: 'tan', acc: 'shades' },
    voice: { pitch: 70, wave: 'square' }, kid: true, tag: '#b86ab0',
  },
  // ---- chapter 6: Fire & Fins
  ammonite: {
    name: 'Professor Dotty Ammonite', short: 'Professor Ammonite', title: 'Palaeontologist of Fern Landing',
    look: { skin: 'peach', hair: 'bob', hairColor: 'ginger', eyes: 'forest', top: 'jacket', topColor: 'tan', topColor2: 'cream', bottom: 'shorts', bottomColor: 'tan', shoes: 'brown', hat: 'fisher', hatColor: 'tan', acc: 'glasses' },
    voice: { pitch: 72, wave: 'triangle' }, tag: '#b8883a',
  },
  barnaby: {
    name: 'Old Barnaby', short: 'Barnaby', title: 'Keeper of the Straits Light',
    look: { skin: 'tan', hair: 'bald', hairColor: 'white', eyes: 'ocean', top: 'coat', topColor: 'navy', topColor2: 'mustard', bottom: 'pants', bottomColor: 'navy', shoes: 'brown', hat: 'fisher', hatColor: 'mustard', acc: 'none', facial: 'beard' },
    voice: { pitch: 34, wave: 'square' }, scale: 1.08, tag: '#3f5f9e',
  },
  mochi: {
    name: 'Granny Mochi', short: 'Granny Mochi', title: 'Keeper of the Hot Springs',
    look: { skin: 'honey', hair: 'topbun', hairColor: 'white', eyes: 'cocoa', top: 'haori', topColor: 'coral', topColor2: 'cream', bottom: 'skirt', bottomColor: 'sage', shoes: 'brown', hat: 'none', acc: 'blush' },
    voice: { pitch: 62, wave: 'sine' }, kid: true, tag: '#e07a6a',
  },
  // ---- chapter 7: the Dawnlands
  bess: {
    name: 'Barnacle Bess', short: 'Bess', title: 'Keeper of the Blowhole Inn',
    look: { skin: 'tan', hair: 'curly', hairColor: 'ginger', eyes: 'ocean', top: 'apron', topColor: 'teal', topColor2: 'cream', bottom: 'skirt', bottomColor: 'navy', shoes: 'brown', hat: 'bandana', hatColor: 'red', acc: 'freckles' },
    voice: { pitch: 60, wave: 'square' }, scale: 1.05, tag: '#3f8a8a',
  },
  bellows: {
    name: 'Grandmother Bellows', short: 'Grandmother Bellows', title: 'The island that isn’t',
    look: { paint: paintBellows },
    voice: { pitch: 18, wave: 'sine' }, tag: '#5a6a80',
  },
  hoshi: {
    name: 'Old Hoshi', short: 'Hoshi', title: 'Lamplighter of Lanternport',
    look: { skin: 'honey', hair: 'topbun', hairColor: 'white', eyes: 'cocoa', top: 'haori', topColor: 'navy', topColor2: 'mustard', bottom: 'pants', bottomColor: 'charcoal', shoes: 'brown', hat: 'none', acc: 'glasses' },
    voice: { pitch: 54, wave: 'triangle' }, scale: 0.92, tag: '#c89020',
  },
  sen: {
    name: 'Abbot Sen', short: 'Abbot Sen', title: 'Of the Dawn Monastery',
    look: { skin: 'tan', hair: 'bald', hairColor: 'coal', eyes: 'cocoa', top: 'haori', topColor: 'orange', topColor2: 'mustard', bottom: 'skirt', bottomColor: 'orange', shoes: 'brown', hat: 'none', acc: 'none' },
    voice: { pitch: 44, wave: 'sine' }, scale: 1.04, tag: '#d8883a',
  },
  bao: {
    name: 'Brother Bao', short: 'Brother Bao', title: 'Under a vow of riddles',
    look: { skin: 'peach', hair: 'bald', hairColor: 'coal', eyes: 'forest', top: 'haori', topColor: 'coral', topColor2: 'mustard', bottom: 'skirt', bottomColor: 'coral', shoes: 'brown', hat: 'straw', hatColor: 'tan', acc: 'none' },
    voice: { pitch: 66, wave: 'square' }, tag: '#e07a4a',
  },
  blanche: {
    name: 'Blanche the Salt Painter', short: 'Blanche', title: 'Painter of the Saltmirror',
    look: { skin: 'porcelain', hair: 'bob', hairColor: 'white', eyes: 'storm', top: 'smock', topColor: 'white', topColor2: 'sky', bottom: 'pants', bottomColor: 'cream', shoes: 'white', hat: 'beret', hatColor: 'sky', acc: 'none' },
    voice: { pitch: 72, wave: 'triangle' }, tag: '#6a9ac8',
  },
  mei: {
    name: 'Mei', short: 'Mei', title: 'Of Lanternport',
    look: { skin: 'honey', hair: 'buns', hairColor: 'coal', eyes: 'cocoa', top: 'hoodie', topColor: 'red', topColor2: 'mustard', bottom: 'shorts', bottomColor: 'navy', shoes: 'red', hat: 'none', acc: 'blush' },
    voice: { pitch: 84, wave: 'square' }, kid: true, tag: '#c8454f',
  },
  tamsin: {
    name: 'Tamsin', short: 'Tamsin', title: 'Fishmonger of Lanternport',
    look: { skin: 'peach', hair: 'ponytail', hairColor: 'chestnut', eyes: 'ocean', top: 'apron', topColor: 'sky', topColor2: 'white', bottom: 'pants', bottomColor: 'navy', shoes: 'charcoal', hat: 'fisher', hatColor: 'mustard', acc: 'none' },
    voice: { pitch: 62, wave: 'triangle' }, tag: '#4a7ab8',
  },
  // (the Understudies as the Mime Troupe: white faces, berets, black-and-white stripes)
  mminnow: {
    name: 'Minnow', short: 'Minnow', title: 'A mime (reluctantly)',
    look: { skin: 'porcelain', hair: 'spiky', hairColor: 'rose', eyes: 'amber', top: 'striped', topColor: 'charcoal', topColor2: 'white', bottom: 'shorts', bottomColor: 'charcoal', shoes: 'red', hat: 'beret', hatColor: 'charcoal', acc: 'blush' },
    voice: { pitch: 79, wave: 'square' }, scale: 0.78, kid: true, tag: '#9a4a8a',
  },
  mfidget: {
    name: 'Fidget', short: 'Fidget', title: 'A mime (very seriously)',
    look: { skin: 'porcelain', hair: 'pixie', hairColor: 'mint', eyes: 'storm', top: 'striped', topColor: 'charcoal', topColor2: 'white', bottom: 'pants', bottomColor: 'charcoal', shoes: 'brown', hat: 'beret', hatColor: 'charcoal', acc: 'glasses' },
    voice: { pitch: 70, wave: 'triangle' }, tag: '#6a4a9a',
  },
  mbrick: {
    name: 'Brick', short: 'Brick', title: 'A mime (a big one)',
    look: { skin: 'porcelain', hair: 'bald', hairColor: 'coal', eyes: 'cocoa', top: 'striped', topColor: 'charcoal', topColor2: 'white', bottom: 'pants', bottomColor: 'charcoal', shoes: 'charcoal', hat: 'beret', hatColor: 'charcoal', acc: 'blush', facial: 'mustache' },
    voice: { pitch: 44, wave: 'sine' }, scale: 1.3, tag: '#5a3a7a',
  },
  // ---- chapter 8: Autumn & Roots
  marrow: {
    name: 'Mayor Marrow', short: 'Mayor Marrow', title: 'Harvest Queen of Harvestholm',
    look: { skin: 'tan', hair: 'curly', hairColor: 'ginger', eyes: 'forest', top: 'dress', topColor: 'orange', topColor2: 'mustard', bottom: 'skirt', bottomColor: 'orange', shoes: 'brown', hat: 'crown', hatColor: 'mustard', acc: 'freckles' },
    voice: { pitch: 64, wave: 'triangle' }, scale: 1.08, tag: '#d8683a',
  },
  mo: {
    name: 'Old Mo', short: 'Old Mo', title: 'Stilt-fisher of Glowtide',
    look: { skin: 'tan', hair: 'bald', hairColor: 'white', eyes: 'ocean', top: 'overalls', topColor: 'teal', topColor2: 'cream', bottom: 'pants', bottomColor: 'navy', shoes: 'brown', hat: 'straw', hatColor: 'tan', acc: 'none', facial: 'beard' },
    voice: { pitch: 38, wave: 'triangle' }, tag: '#3a8a8a',
  },
  ashby: {
    name: 'Warden Ashby', short: 'Warden Ashby', title: 'Keeper of the Great Tree',
    look: { skin: 'peach', hair: 'long', hairColor: 'white', eyes: 'forest', top: 'coat', topColor: 'green', topColor2: 'tan', bottom: 'pants', bottomColor: 'brown', shoes: 'brown', hat: 'acorncap', hatColor: 'brown', acc: 'none', facial: 'beard' },
    voice: { pitch: 30, wave: 'sine' }, scale: 1.12, tag: '#5a8a3a',
  },
  pumpkin: {
    name: 'Farmer Hazel', short: 'Hazel', title: 'Of the pumpkin fields',
    look: { skin: 'honey', hair: 'braids', hairColor: 'chestnut', eyes: 'cocoa', top: 'flannel', topColor: 'red', topColor2: 'cream', bottom: 'pants', bottomColor: 'blue', shoes: 'brown', hat: 'straw', hatColor: 'mustard', acc: 'none' },
    voice: { pitch: 66, wave: 'square' }, tag: '#c8573a',
  },
  marisol: {
    name: 'Marisol', short: 'Marisol', title: 'Stiltwater’s singer',
    look: { skin: 'porcelain', hair: 'wavy', hairColor: 'honey', eyes: 'ocean', top: 'dress', topColor: 'sky', topColor2: 'white', bottom: 'skirt', bottomColor: 'sky', shoes: 'white', hat: 'none', acc: 'blush' },
    voice: { pitch: 76, wave: 'sine' }, tag: '#5a9ad8',
  },
  wick: {
    name: 'Wick the Hatter', short: 'Wick', title: 'Hats for all weathers',
    look: { skin: 'tan', hair: 'side', hairColor: 'coal', eyes: 'amber', top: 'vest', topColor: 'plum', topColor2: 'mustard', bottom: 'pants', bottomColor: 'charcoal', shoes: 'charcoal', hat: 'tophat', hatColor: 'plum', acc: 'glasses' },
    voice: { pitch: 58, wave: 'square' }, tag: '#8a4a9a',
  },
  // ---- chapter 9: Moor & Machines
  tallow: {
    name: 'Aunt Tallow', short: 'Aunt Tallow', title: 'Chandler of Candlewick',
    look: { skin: 'peach', hair: 'topbun', hairColor: 'silver', eyes: 'storm', top: 'apron', topColor: 'plum', topColor2: 'cream', bottom: 'skirt', bottomColor: 'charcoal', shoes: 'charcoal', hat: 'none', acc: 'glasses' },
    voice: { pitch: 56, wave: 'triangle' }, tag: '#9a7aa8',
  },
  tock: {
    name: 'Master Tock', short: 'Master Tock', title: 'Clockmaker of Cogsworth',
    look: { skin: 'tan', hair: 'side', hairColor: 'white', eyes: 'amber', top: 'vest', topColor: 'mustard', topColor2: 'brown', bottom: 'pants', bottomColor: 'brown', shoes: 'brown', hat: 'none', acc: 'glasses', facial: 'mustache' },
    voice: { pitch: 72, wave: 'square' }, scale: 0.8, kid: true, tag: '#c8983e',
  },
  rhoda: {
    name: 'Ranger Rhoda', short: 'Ranger Rhoda', title: 'Keeper of Prism Springs',
    look: { skin: 'honey', hair: 'ponytail', hairColor: 'chestnut', eyes: 'forest', top: 'jacket', topColor: 'green', topColor2: 'tan', bottom: 'shorts', bottomColor: 'tan', shoes: 'brown', hat: 'fisher', hatColor: 'tan', acc: 'none' },
    voice: { pitch: 64, wave: 'square' }, tag: '#5a8a4a',
  },
  pembroke: {
    name: 'Pembroke, the butler', short: 'Pembroke', title: 'Of Hollowmoor Manor (late)',
    look: { skin: 'porcelain', hair: 'side', hairColor: 'silver', eyes: 'storm', top: 'coat', topColor: 'charcoal', topColor2: 'white', bottom: 'pants', bottomColor: 'charcoal', shoes: 'charcoal', hat: 'none', acc: 'none', facial: 'mustache' },
    voice: { pitch: 40, wave: 'sine' }, scale: 1.05, tag: '#8aa0c8',
  },
  dumpling: {
    name: 'Mrs Dumpling, the cook', short: 'Mrs Dumpling', title: 'Of Hollowmoor Manor (late)',
    look: { skin: 'porcelain', hair: 'buns', hairColor: 'silver', eyes: 'cocoa', top: 'apron', topColor: 'white', topColor2: 'sky', bottom: 'skirt', bottomColor: 'sky', shoes: 'charcoal', hat: 'none', acc: 'blush' },
    voice: { pitch: 58, wave: 'sine' }, tag: '#8aa0c8',
  },
  hob: {
    name: 'Hob, the gardener', short: 'Hob', title: 'Of Hollowmoor Manor (late)',
    look: { skin: 'porcelain', hair: 'curly', hairColor: 'silver', eyes: 'forest', top: 'overalls', topColor: 'sage', topColor2: 'cream', bottom: 'pants', bottomColor: 'sage', shoes: 'brown', hat: 'straw', hatColor: 'tan', acc: 'none' },
    voice: { pitch: 46, wave: 'sine' }, tag: '#8aa0c8',
  },
  posy: {
    name: 'Posy, the maid', short: 'Posy', title: 'Of Hollowmoor Manor (late)',
    look: { skin: 'porcelain', hair: 'bob', hairColor: 'silver', eyes: 'ocean', top: 'dress', topColor: 'charcoal', topColor2: 'white', bottom: 'skirt', bottomColor: 'charcoal', shoes: 'charcoal', hat: 'bow', hatColor: 'white', acc: 'freckles' },
    voice: { pitch: 74, wave: 'sine' }, kid: true, tag: '#8aa0c8',
  },
  honoria: {
    name: 'Lady Honoria', short: 'Lady Honoria', title: 'The Lady in Grey',
    look: { skin: 'porcelain', hair: 'topbun', hairColor: 'silver', eyes: 'violet', top: 'dress', topColor: 'grey', topColor2: 'white', bottom: 'skirt', bottomColor: 'grey', shoes: 'charcoal', hat: 'none', acc: 'none' },
    voice: { pitch: 52, wave: 'sine' }, scale: 1.1, tag: '#8a90a8',
  },
  gloria: {
    name: 'Gloria', short: 'Gloria', title: 'Thirty years ago',
    look: { skin: 'porcelain', hair: 'long', hairColor: 'coal', eyes: 'violet', top: 'dress', topColor: 'lavender', topColor2: 'white', bottom: 'skirt', bottomColor: 'lavender', shoes: 'charcoal', hat: 'bow', hatColor: 'plum', acc: 'none' },
    voice: { pitch: 66, wave: 'square' }, kid: true, tag: '#9a6ab8',
  },
  hikerfen: {
    name: 'Fen', short: 'Fen', title: 'A lost hiker',
    look: { skin: 'tan', hair: 'short', hairColor: 'chestnut', eyes: 'cocoa', top: 'jacket', topColor: 'orange', topColor2: 'cream', bottom: 'shorts', bottomColor: 'navy', shoes: 'brown', hat: 'beanie', hatColor: 'red', acc: 'none' },
    voice: { pitch: 60, wave: 'triangle' }, tag: '#e0783a',
  },
  hikerbo: {
    name: 'Bo', short: 'Bo', title: 'Another lost hiker',
    look: { skin: 'honey', hair: 'ponytail', hairColor: 'honey', eyes: 'ocean', top: 'hoodie', topColor: 'teal', topColor2: 'cream', bottom: 'pants', bottomColor: 'charcoal', shoes: 'charcoal', hat: 'cap', hatColor: 'teal', acc: 'none' },
    voice: { pitch: 70, wave: 'triangle' }, tag: '#3a9a9a',
  },
  june: {
    name: 'Nana June', short: 'Nana June', title: 'The last Lamplighter',
    look: { skin: 'peach', hair: 'topbun', hairColor: 'white', eyes: 'forest', top: 'sweater', topColor: 'coral', topColor2: 'cream', bottom: 'skirt', bottomColor: 'sage', shoes: 'brown', hat: 'none', acc: 'glasses' },
    voice: { pitch: 66, wave: 'triangle' }, tag: '#c8574f',
  },
};

for (const [id, d] of Object.entries(DEFS)) {
  // (a saga character must never take a villager’s id: the villager would lose its day)
  if (NPCS[id] && !NPCS[id].saga) { console.error(`saga cast: ${id} is a villager`); continue; }
  NPCS[id] = { ...d, home: 'overworld', outdoors: true, visitor: true, saga: true, schedule: [], loves: [], likes: [], hates: [] };
}

export const CAST = DEFS;

// Grandmother Bellows’s portrait: no chibi — an eye the size of a door, blue-grey
// hide, barnacles, a lash or two
function paintBellows(S, expr) {
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const px = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  px(0, 0, S, S, '#5a6a80');
  let h = 7;
  const rnd = () => { h = (h * 1103515245 + 12345) & 0x7fffffff; return h / 0x7fffffff; };
  for (let i = 0; i < 70; i++) px((rnd() * S) | 0, (rnd() * S) | 0, 2, 1, rnd() < 0.5 ? '#6a7a90' : '#4e5c72');
  px(0, S - 9, S, 9, '#8a9aac');                         // (her pale belly line)
  for (let x = 0; x < S; x += 3) px(x, S - 9, 2, 1, '#9aa8b8');
  const cx = S / 2, cy = S / 2 + 1, shut = expr === 'sleep', happy = expr === 'happy' || expr === 'love';
  if (shut || happy) {
    // (closed: a curve of lid; smiling: the same curve, upside down)
    for (let x = -11; x <= 11; x++) { const y = Math.round((x * x) / 16) * (happy ? -1 : 1); px(cx + x, cy + y + (happy ? 3 : -2), 1, 2, '#241a2e'); }
  } else {
    const lid = expr === 'sad' || expr === 'worried' ? 5 : expr === 'surprised' ? -2 : 2;
    for (let y = -8; y <= 8; y++) for (let x = -12; x <= 12; x++) if ((x * x) / 144 + (y * y) / 64 <= 1) px(cx + x, cy + y, 1, 1, '#f4f0e8');
    for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) if (x * x + y * y <= 36) px(cx + x + 1, cy + y, 1, 1, '#c8a040');
    for (let y = -5; y <= 5; y++) for (let x = -2; x <= 2; x++) px(cx + x + 1, cy + y, 1, 1, '#1a1a2a');
    px(cx + 3, cy - 4, 2, 2, '#ffffff');
    px(cx - 13, cy - 9, 27, 1 + lid + 2, '#5a6a80');       // the heavy lid
    px(cx - 12, cy - 9 + lid + 2, 25, 1, '#241a2e');
  }
  for (let k = 0; k < 6; k++) px(cx - 12 + k * 5, cy - 12 + (k % 2), 1, 3, '#241a2e');     // lashes
  for (const [bx, by] of [[4, 5], [9, 3], [36, 6], [6, 30], [38, 28]]) { px(bx, by, 4, 3, '#e8e4dc'); px(bx + 1, by - 1, 2, 1, '#e8e4dc'); px(bx + 1, by + 1, 2, 1, '#b8b0a8'); }
  px(0, 0, S, 1, '#2b1c2c'); px(0, S - 1, S, 1, '#2b1c2c'); px(0, 0, 1, S, '#2b1c2c'); px(S - 1, 0, 1, S, '#2b1c2c');
  return c;
}
