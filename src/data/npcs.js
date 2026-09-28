// Villagers of Marigold Cove: looks, voices, daily schedules & tastes.
// Schedule entries: [hour, map, spot]. Spots are named points (overworld POINTS or interior spots).

export const NPCS = {
  hollis: {
    name: 'Mayor Hollis',
    short: 'Hollis',
    look: { skin: 'honey', hair: 'side', hairColor: 'silver', eyes: 'cocoa', top: 'vest', topColor: 'green', topColor2: 'cream', bottom: 'pants', bottomColor: 'brown', shoes: 'charcoal', hat: 'none', acc: 'glasses', facial: 'mustache' },
    voice: { pitch: 55, wave: 'triangle' },
    home: 'hall',
    title: 'Mayor of Marigold Cove',
    schedule: [
      [6, 'hall', 'desk'], [10, 'overworld', 'plazaN'], [12.5, 'hall', 'desk'], [16, 'overworld', 'benchW'], [19, 'hall', 'home'],
    ],
    loves: ['coffee', 'pumpkin', 'seaglass', 'fish_moonfin'], likes: ['bread', 'cookie', 'apple', 'tart'], hates: ['fish_boot', 'fish_seaweed'],
  },
  rosa: {
    name: 'Rosa',
    short: 'Rosa',
    look: { skin: 'tan', hair: 'topbun', hairColor: 'auburn', eyes: 'hazel', top: 'apron', topColor: 'coral', topColor2: 'cream', bottom: 'skirt', bottomColor: 'rose', shoes: 'brown', hat: 'none', acc: 'none' },
    voice: { pitch: 69, wave: 'triangle' },
    home: 'bakery',
    title: 'Baker',
    schedule: [
      [6, 'bakery', 'counter'], [18.5, 'overworld', 'plazaE'], [20, 'bakery', 'home'],
    ],
    shop: 'bakery', shopHours: [7, 18.5],
    loves: ['strawberry', 'berry', 'apple', 'sunflower'], likes: ['daisy', 'poppy', 'turnip', 'carrot', 'coffee'], hates: ['fish_seaweed', 'fish_boot', 'mushroom'],
  },
  pip: {
    name: 'Pip',
    short: 'Pip',
    look: { skin: 'tan', hair: 'spiky', hairColor: 'auburn', eyes: 'hazel', top: 'striped', topColor: 'sky', topColor2: 'white', bottom: 'shorts', bottomColor: 'navy', shoes: 'red', hat: 'cap', hatColor: 'red', acc: 'bandaid' },
    voice: { pitch: 76, wave: 'square' },
    home: 'bakery',
    title: 'Adventurer (age 8)',
    kid: true,
    schedule: [
      [8, 'overworld', 'fountainS'], [12, 'bakery', 'lunch'], [13, 'overworld', 'beachW'], [16.5, 'overworld', 'plazaW'], [19.5, 'bakery', 'home'],
    ],
    loves: ['cookie', 'firefly', 'shell', 'seaglass', 'fish_crab'], likes: ['berry', 'strawberry', 'apple', 'fish_puffer'], hates: ['mushroom', 'fish_seaweed', 'coffee'],
  },
  finn: {
    name: 'Finn',
    short: 'Finn',
    look: { skin: 'porcelain', hair: 'short', hairColor: 'ginger', eyes: 'ocean', top: 'sweater', topColor: 'navy', topColor2: 'cream', bottom: 'pants', bottomColor: 'tan', shoes: 'charcoal', hat: 'beanie', hatColor: 'teal', acc: 'freckles' },
    voice: { pitch: 60, wave: 'square' },
    home: 'shack',
    title: 'Fisherman',
    schedule: [
      [6, 'overworld', 'pierEnd'], [11, 'shack', 'counter'], [13, 'overworld', 'pierEnd'], [18, 'cafe', 'seatA'], [21, 'shack', 'home'],
    ],
    shop: 'fish', shopHours: [11, 13],
    loves: ['fish_puffer', 'fish_moonfin', 'coffee', 'fish_mackerel'], likes: ['fish_sardine', 'fish_trout', 'bread', 'shell'], hates: ['sunflower', 'daisy', 'poppy'],
  },
  ivy: {
    name: 'Ivy',
    short: 'Ivy',
    look: { skin: 'cocoa', hair: 'braids', hairColor: 'mint', eyes: 'forest', top: 'overalls', topColor: 'cream', topColor2: 'sage', bottom: 'pants', bottomColor: 'sage', shoes: 'brown', hat: 'flower', hatColor: 'pink', acc: 'none' },
    voice: { pitch: 72, wave: 'sine' },
    home: 'store',
    title: 'Florist & Seed Keeper',
    schedule: [
      [7, 'store', 'counter'], [17, 'overworld', 'gardenS'], [19, 'store', 'home'],
    ],
    shop: 'store', shopHours: [8, 17],
    loves: ['sunflower', 'moonbloom', 'bluebell', 'poppy'], likes: ['daisy', 'turnip', 'carrot', 'strawberry', 'pumpkin'], hates: ['fish_boot', 'fish_seaweed'],
  },
  theo: {
    name: 'Theo',
    short: 'Theo',
    look: { skin: 'peach', hair: 'short', hairColor: 'espresso', eyes: 'storm', top: 'flannel', topColor: 'red', topColor2: 'cream', bottom: 'pants', bottomColor: 'navy', shoes: 'brown', hat: 'bandana', hatColor: 'mustard', acc: 'none', facial: 'beard' },
    voice: { pitch: 48, wave: 'triangle' },
    home: 'carpenter',
    title: 'Carpenter',
    schedule: [
      [7, 'overworld', 'sawing'], [12, 'cafe', 'seatB'], [13, 'carpenter', 'counter'], [18, 'overworld', 'bridgeW'], [20, 'carpenter', 'home'],
    ],
    shop: 'carpenter', shopHours: [13, 18],
    loves: ['apple', 'coffee', 'pumpkin', 'bread'], likes: ['branch', 'pinecone', 'mushroom', 'cookie'], hates: ['daisy', 'poppy', 'bluebell'],
  },
  mabel: {
    name: 'Mabel',
    short: 'Mabel',
    look: { skin: 'porcelain', hair: 'topbun', hairColor: 'silver', eyes: 'violet', top: 'sweater', topColor: 'lavender', topColor2: 'plum', bottom: 'skirt', bottomColor: 'plum', shoes: 'charcoal', hat: 'none', acc: 'glasses' },
    voice: { pitch: 64, wave: 'sine' },
    home: 'library',
    title: 'Librarian',
    schedule: [
      [8, 'library', 'desk'], [15, 'overworld', 'benchE'], [17, 'library', 'desk'], [21, 'library', 'home'],
    ],
    loves: ['cocoa', 'tart', 'bluebell', 'moonbloom'], likes: ['cookie', 'daisy', 'coffee', 'seaglass'], hates: ['fish_boot', 'fish_crab'],
  },
  sol: {
    name: 'Sol',
    short: 'Sol',
    look: { skin: 'umber', hair: 'afro', hairColor: 'coal', eyes: 'amber', top: 'vest', topColor: 'mustard', topColor2: 'white', bottom: 'pants', bottomColor: 'charcoal', shoes: 'cream', hat: 'headphones', hatColor: 'teal', acc: 'none' },
    voice: { pitch: 58, wave: 'triangle' },
    home: 'cafe',
    title: 'Café owner & musician',
    schedule: [
      [7, 'cafe', 'counter'], [17, 'overworld', 'guitar'], [21, 'cafe', 'home'],
    ],
    shop: 'cafe', shopHours: [7, 17],
    loves: ['seaglass', 'strawberry', 'fish_moonfin', 'moonbloom'], likes: ['shell', 'cookie', 'apple', 'fish_mackerel'], hates: ['fish_boot', 'turnip'],
  },
  wren: {
    name: 'Wren',
    short: 'Wren',
    look: { skin: 'peach', hair: 'long', hairColor: 'coal', eyes: 'rose', top: 'smock', topColor: 'cream', topColor2: 'sky', bottom: 'pants', bottomColor: 'blue', shoes: 'charcoal', hat: 'beret', hatColor: 'red', acc: 'none' },
    voice: { pitch: 74, wave: 'sine' },
    home: 'wren',
    title: 'Painter',
    schedule: [
      [8, 'overworld', 'riverbank'], [12, 'wren', 'paint'], [15, 'overworld', 'beachE'], [18, 'wren', 'home'],
    ],
    scheduleAfterBridge: [
      [8, 'overworld', 'easel'], [16, 'overworld', 'beachE'], [18, 'wren', 'home'],
    ],
    loves: ['poppy', 'bluebell', 'sunflower', 'cookie', 'moonbloom'], likes: ['daisy', 'shell', 'seaglass', 'strawberry'], hates: ['fish_sardine', 'fish_mackerel', 'fish_boot', 'fish_seaweed'],
  },
};

// ---- folks from the wider valley
Object.assign(NPCS, {
  bram: {
    name: 'Bram',
    short: 'Bram',
    look: { skin: 'honey', hair: 'curly', hairColor: 'ginger', eyes: 'forest', top: 'overalls', topColor: 'red', topColor2: 'blue', bottom: 'pants', bottomColor: 'blue', shoes: 'brown', hat: 'straw', hatColor: 'mustard', acc: 'blush', facial: 'beard' },
    voice: { pitch: 44, wave: 'triangle' },
    home: 'farmhouse',
    title: 'Farmer of Honeydew Fields',
    schedule: [
      [5.5, 'overworld', 'barnYard'], [9, 'overworld', 'fields'], [12, 'farmhouse', 'table'], [13, 'overworld', 'farmStand'], [17, 'overworld', 'fields'], [19, 'farmhouse', 'home'],
    ],
    shop: 'farm', shopHours: [13, 17], shopSpot: 'farmStand',
    loves: ['pumpkin', 'honey', 'bread', 'tart'], likes: ['carrot', 'turnip', 'apple', 'coffee', 'sunflower', 'wheat'], hates: ['fish_boot', 'fish_seaweed', 'glowcap'],
  },
  juniper: {
    name: 'Juniper',
    short: 'Juniper',
    look: { skin: 'cocoa', hair: 'ponytail', hairColor: 'espresso', eyes: 'amber', top: 'jacket', topColor: 'sage', topColor2: 'cream', bottom: 'shorts', bottomColor: 'brown', shoes: 'charcoal', hat: 'beanie', hatColor: 'orange', acc: 'freckles' },
    voice: { pitch: 66, wave: 'sine' },
    home: 'overworld',
    outdoors: true,
    title: 'Whisperwood Ranger',
    schedule: [
      [6, 'overworld', 'camp'], [9, 'overworld', 'lakeShore'], [12, 'overworld', 'campfire'], [14, 'overworld', 'shrine'], [17, 'overworld', 'camp'], [19.5, 'overworld', 'campfire'], [23, 'overworld', 'tentDoor'],
    ],
    loves: ['glowcap', 'smore', 'feather', 'pinecone', 'fish_trout'], likes: ['mushroom', 'berry', 'coffee', 'apple', 'honey'], hates: ['fish_boot', 'cookie'],
  },
  marlo: {
    name: 'Captain Marlo',
    short: 'Marlo',
    look: { skin: 'peach', hair: 'long', hairColor: 'silver', eyes: 'ocean', top: 'coat', topColor: 'navy', topColor2: 'white', bottom: 'pants', bottomColor: 'navy', shoes: 'charcoal', hat: 'fisher', hatColor: 'mustard', acc: 'none' },
    voice: { pitch: 50, wave: 'square' },
    home: 'marlo',
    title: 'Ferry Captain of Turtle Isle',
    schedule: [
      [6, 'marlo', 'table'], [8, 'overworld', 'ferryHelm'], [19, 'overworld', 'islandBeach'], [21, 'marlo', 'home'],
    ],
    loves: ['fish_mackerel', 'fish_pike', 'seaglass', 'starfish', 'coffee'], likes: ['fish_sardine', 'shell', 'bread', 'feather', 'honey'], hates: ['daisy', 'fish_boot'],
  },
});

// the wandering merchant visits the plaza stall on Sundays (not a friendship villager)
NPCS.merchant = {
  name: 'Pim the Wanderer',
  short: 'Pim',
  look: { skin: 'tan', hair: 'wavy', hairColor: 'lilac', eyes: 'violet', top: 'haori', topColor: 'teal', topColor2: 'mustard', bottom: 'pants', bottomColor: 'plum', shoes: 'brown', hat: 'witch', hatColor: 'plum', acc: 'glasses' },
  voice: { pitch: 62, wave: 'triangle' },
  home: 'overworld',
  outdoors: true,
  visitor: true,
  title: 'Wandering Merchant',
  schedule: [[0, 'overworld', 'merchantSpot']],
  shop: 'market', shopHours: [9, 18], shopSpot: 'merchantSpot',
  loves: [], likes: [], hates: [],
};

export const NPC_ORDER = ['hollis', 'rosa', 'pip', 'finn', 'ivy', 'theo', 'mabel', 'sol', 'wren', 'bram', 'juniper', 'marlo'];
