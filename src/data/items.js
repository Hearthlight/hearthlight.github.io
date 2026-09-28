// Item database. price = shop buy price, sell = what shops / the shipping
// crate pay. tags drive gift reactions & quest checks.

export const ITEMS = {
  // ---- tools (never sold)
  can: { name: 'Watering Can', cat: 'tool', desc: 'Nana’s old copper can. Water your crops once a day.' },
  rod: { name: 'Fishing Rod', cat: 'tool', desc: 'A bamboo rod from Finn. Face the water and use it to cast.' },
  net: { name: 'Bug Net', cat: 'tool', price: 120, desc: 'A soft net for catching critters. Fireflies come out at night.' },
  hoe: { name: 'Hoe', cat: 'tool', desc: 'Turns grass into soil.' },
  lamp_hand: { name: 'Hand Lantern', cat: 'tool', desc: 'Juniper’s spare lantern. Hold it to light the way after dark — or into dark places.' },
  bike: { name: 'Bicycle', cat: 'tool', desc: 'Bram’s old red bicycle, freshly oiled. Hold it to ride, and hop on or off whenever you like.' },

  // ---- seeds
  seed_turnip: { name: 'Turnip Seeds', cat: 'seed', price: 20, sell: 5, crop: 'turnip', desc: 'Grows in 3 days. Hardy and cheerful.' },
  seed_carrot: { name: 'Carrot Seeds', cat: 'seed', price: 30, sell: 7, crop: 'carrot', desc: 'Grows in 3 days.' },
  seed_strawberry: { name: 'Strawberry Seeds', cat: 'seed', price: 45, sell: 10, crop: 'strawberry', desc: 'Grows in 4 days, then fruits every 2 days.' },
  seed_sunflower: { name: 'Sunflower Seeds', cat: 'seed', price: 40, sell: 9, crop: 'sunflower', desc: 'Grows in 4 days. Tall and golden.' },
  seed_pumpkin: { name: 'Pumpkin Seeds', cat: 'seed', price: 70, sell: 15, crop: 'pumpkin', desc: 'Grows in 5 days. Very valuable.' },
  seed_moonbloom: { name: 'Moonbloom Seed', cat: 'seed', price: 150, sell: 30, crop: 'moonbloom', desc: 'A rare seed that glows faintly. Grows in 4 days.' },
  seed_wheat: { name: 'Wheat Seeds', cat: 'seed', price: 15, sell: 4, crop: 'wheat', desc: 'Grows in 3 days. Bram swears by it.' },

  // ---- crops
  turnip: { name: 'Turnip', cat: 'crop', sell: 45, tags: ['veg'], desc: 'A plump, crunchy turnip.' },
  carrot: { name: 'Carrot', cat: 'crop', sell: 60, tags: ['veg'], desc: 'Sweet and bright orange.' },
  strawberry: { name: 'Strawberry', cat: 'crop', sell: 75, tags: ['fruit', 'sweet'], desc: 'Juicy and red.' },
  sunflower: { name: 'Sunflower', cat: 'crop', sell: 90, tags: ['flower', 'yellow'], desc: 'It follows the sun, even in a vase.' },
  pumpkin: { name: 'Pumpkin', cat: 'crop', sell: 190, tags: ['veg'], desc: 'Round, orange, and very heavy.' },
  moonbloom: { name: 'Moonbloom', cat: 'crop', sell: 320, tags: ['flower', 'rare'], desc: 'Petals that shine like moonlight.' },

  // ---- forage
  berry: { name: 'Wild Berries', cat: 'forage', sell: 12, tags: ['fruit', 'sweet'], desc: 'Picked from the bushes around the cove.' },
  apple: { name: 'Apple', cat: 'forage', sell: 20, tags: ['fruit'], desc: 'Fresh from the orchard.' },
  mushroom: { name: 'Mushroom', cat: 'forage', sell: 24, tags: ['forest'], desc: 'Found on the Whisperwood floor.' },
  shell: { name: 'Seashell', cat: 'forage', sell: 15, tags: ['beach'], desc: 'You can hear the sea inside.' },
  seaglass: { name: 'Sea Glass', cat: 'forage', sell: 55, tags: ['beach', 'pretty'], desc: 'Smoothed by a hundred years of tides.' },
  branch: { name: 'Wood', cat: 'material', sell: 4, desc: 'A sturdy fallen branch. Theo always needs wood.' },
  daisy: { name: 'Daisy', cat: 'forage', sell: 10, tags: ['flower', 'white'], desc: 'A small white flower.' },
  poppy: { name: 'Poppy', cat: 'forage', sell: 18, tags: ['flower', 'red'], desc: 'A bright red meadow flower.' },
  bluebell: { name: 'Bluebell', cat: 'forage', sell: 22, tags: ['flower', 'blue'], desc: 'Grows only in Sunpetal Meadow.' },
  pinecone: { name: 'Pinecone', cat: 'forage', sell: 6, tags: ['forest'], desc: 'Smells like the woods.' },
  firefly: { name: 'Firefly Jar', cat: 'critter', sell: 30, tags: ['night', 'pretty'], desc: 'A tiny lantern with wings.' },
  feather: { name: 'Gull Feather', cat: 'forage', sell: 14, tags: ['beach', 'pretty'], desc: 'Dropped by a seagull on the bluffs.' },
  starfish: { name: 'Starfish', cat: 'forage', sell: 40, tags: ['beach', 'pretty'], desc: 'Washed up on Turtle Isle. Please put it back after admiring.' },
  glowcap: { name: 'Glowcap', cat: 'forage', sell: 70, tags: ['forest', 'night', 'pretty'], desc: 'A mushroom that glows teal in the dark.' },
  lavender: { name: 'Lavender', cat: 'forage', sell: 26, tags: ['flower', 'purple'], desc: 'Smells like a lazy summer afternoon.' },
  pearl: { name: 'Pearl', cat: 'forage', sell: 90, tags: ['beach', 'pretty'], desc: 'From the bottom of the wild seas. It glows a little.' },
  relic: { name: 'Sunken Relic', cat: 'forage', sell: 160, tags: ['pretty'], desc: 'An old coin from a city under the sea.' },
  wheat: { name: 'Wheat', cat: 'crop', sell: 22, tags: ['farm'], desc: 'Golden and rustly. Bram grinds it into flour.' },
  egg: { name: 'Fresh Egg', cat: 'food', price: 30, sell: 18, tags: ['farm'], desc: 'Still warm from the henhouse.' },
  milk: { name: 'Honeydew Milk', cat: 'food', price: 45, sell: 26, tags: ['farm', 'drink'], desc: 'Creamy milk from Buttercup the cow.' },
  honey: { name: 'Clover Honey', cat: 'food', price: 70, sell: 42, tags: ['farm', 'sweet'], desc: 'Golden honey from the Honeydew hives.' },
  smore: { name: 'Campfire S’more', cat: 'food', sell: 16, tags: ['sweet'], desc: 'Gooey, toasty, a little bit burnt. Perfect.' },
  bottle: { name: 'Message in a Bottle', cat: 'key', desc: 'A corked bottle with a rolled-up letter inside.' },
  map: { name: 'Treasure Map', cat: 'key', desc: 'An X marks a spot on Turtle Isle… the grotto?' },
  sailcloth: { name: 'Sail Cloth', cat: 'material', price: 120, sell: 30, desc: 'Sturdy canvas. Perfect for windmill sails.' },

  // ---- fish
  fish_minnow: { name: 'Minnow', cat: 'fish', sell: 18, tags: ['fish'], desc: 'Small and quick. River & pond.' },
  fish_trout: { name: 'River Trout', cat: 'fish', sell: 48, tags: ['fish'], desc: 'Speckled and strong.' },
  fish_carp: { name: 'Pond Carp', cat: 'fish', sell: 36, tags: ['fish'], desc: 'Lazy and round.' },
  fish_koi: { name: 'Koi', cat: 'fish', sell: 160, tags: ['fish', 'rare', 'pretty'], desc: 'A lucky orange-and-white koi.' },
  fish_goldfish: { name: 'Goldfish', cat: 'fish', sell: 120, tags: ['fish', 'pretty'], desc: 'Someone must have let it go long ago.' },
  fish_sardine: { name: 'Sardine', cat: 'fish', sell: 24, tags: ['fish'], desc: 'Silver and plentiful.' },
  fish_mackerel: { name: 'Mackerel', cat: 'fish', sell: 52, tags: ['fish'], desc: 'Striped like the tide.' },
  fish_crab: { name: 'Shore Crab', cat: 'fish', sell: 64, tags: ['fish'], desc: 'It waves at you. Rude.' },
  fish_puffer: { name: 'Pufferfish', cat: 'fish', sell: 130, tags: ['fish', 'rare'], desc: 'Only puffs when it’s nervous.' },
  fish_moonfin: { name: 'Moonfin', cat: 'fish', sell: 400, tags: ['fish', 'rare', 'night'], desc: 'A silver fish that only rises under the stars.' },
  fish_perch: { name: 'Lake Perch', cat: 'fish', sell: 32, tags: ['fish'], desc: 'Stripy and curious. Waterfall & Willow Lake.' },
  fish_bass: { name: 'Largemouth Bass', cat: 'fish', sell: 58, tags: ['fish'], desc: 'It has opinions about your lure.' },
  fish_pike: { name: 'Old Pike', cat: 'fish', sell: 190, tags: ['fish', 'rare'], desc: 'Long, toothy and very, very old.' },
  fish_eel: { name: 'Starlight Eel', cat: 'fish', sell: 260, tags: ['fish', 'rare', 'night', 'pretty'], desc: 'Its fins glitter like the night sky. Lakes, after dark.' },
  fish_char: { name: 'Frost Char', cat: 'fish', sell: 72, tags: ['fish'], desc: 'Caught through the ice on Frostpine Ridge. Freezing and very pleased with itself.' },
  fish_icefin: { name: 'Icefin', cat: 'fish', sell: 290, tags: ['fish', 'rare', 'pretty'], desc: 'Nearly see-through, like a sliver of frozen pond.' },
  fish_catfish: { name: 'Whiskered Catfish', cat: 'fish', sell: 95, tags: ['fish'], desc: 'Grumbles in the mud of Reedmarsh. Magnificent moustache.' },
  fish_boot: { name: 'Soggy Boot', cat: 'junk', sell: 1, desc: 'Somebody’s missing this.' },
  fish_seaweed: { name: 'Seaweed', cat: 'junk', sell: 6, tags: ['beach'], desc: 'Slippery. Rosa says it’s good in soup.' },

  // ---- food & treats
  bread: { name: 'Sunrise Loaf', cat: 'food', price: 35, sell: 20, tags: ['baked', 'sweet'], desc: 'Warm bread from Rosa’s oven.' },
  tart: { name: 'Berry Tart', cat: 'food', price: 90, sell: 60, tags: ['baked', 'sweet', 'fruit'], desc: 'Rosa’s famous berry tart.' },
  cookie: { name: 'Honey Cookie', cat: 'food', price: 25, sell: 12, tags: ['baked', 'sweet'], desc: 'Crisp edges, soft middle.' },
  coffee: { name: 'Sea-Salt Latte', cat: 'food', price: 30, sell: 15, tags: ['drink'], desc: 'Sol’s specialty. Tastes like a sunny morning.' },
  cocoa: { name: 'Marshmallow Cocoa', cat: 'food', price: 30, sell: 15, tags: ['drink', 'sweet'], desc: 'Best enjoyed on a cold night.' },

  // ---- story items
  shard: { name: 'Glimmer Shard', cat: 'key', desc: 'A warm piece of Old Glimmer’s heart. It hums softly.' },
  key_home: { name: 'Cottage Key', cat: 'key', desc: 'The key to Nana’s cottage.' },
  page: { name: 'Lost Page', cat: 'key', desc: 'A page from “The Legend of Old Glimmer”.' },
  recipe: { name: 'Old Recipe Book', cat: 'key', desc: 'Rosa’s grandmother’s recipes. Mabel kept it safe.' },
  kite: { name: 'Pip’s Kite', cat: 'key', desc: 'A patched-up red kite.' },
  pick: { name: 'Guitar Pick', cat: 'key', desc: 'Sol’s lucky shell guitar pick.' },
  lantern: { name: 'Paper Lantern', cat: 'key', desc: 'For the Festival of Lights.' },

  // ---- furniture (placeable at home)
  f_table: { name: 'Round Table', cat: 'furniture', price: 180, sell: 60, furn: 'table', desc: 'A sturdy oak table.' },
  f_chair: { name: 'Wooden Chair', cat: 'furniture', price: 90, sell: 30, furn: 'chair', desc: 'Sit a while.' },
  f_rug: { name: 'Round Rug', cat: 'furniture', price: 150, sell: 50, furn: 'rug', desc: 'Soft under your toes.' },
  f_plant: { name: 'Potted Fern', cat: 'furniture', price: 80, sell: 25, furn: 'plant', desc: 'Makes any corner cozy.' },
  f_lamp: { name: 'Floor Lamp', cat: 'furniture', price: 160, sell: 55, furn: 'lamp', desc: 'Warm light for long evenings.' },
  f_shelf: { name: 'Bookshelf', cat: 'furniture', price: 260, sell: 90, furn: 'shelf', desc: 'Full of stories.' },
  f_sofa: { name: 'Plush Sofa', cat: 'furniture', price: 420, sell: 140, furn: 'sofa', desc: 'The comfiest seat in the cove.' },
  f_tank: { name: 'Fish Tank', cat: 'furniture', price: 380, sell: 120, furn: 'tank', desc: 'Bubbles gently all day.' },
  f_radio: { name: 'Retro Radio', cat: 'furniture', price: 220, sell: 70, furn: 'radio', desc: 'Plays soft tunes.' },
  f_teddy: { name: 'Teddy Bear', cat: 'furniture', price: 120, sell: 40, furn: 'teddy', desc: 'A loyal friend.' },
  f_catbed: { name: 'Pet Bed', cat: 'furniture', price: 140, sell: 45, furn: 'petbed', desc: 'For your little companion.' },
  f_painting: { name: 'Seaside Painting', cat: 'furniture', price: 300, sell: 100, furn: 'painting', desc: 'A painting of the cove at dusk.' },
  f_candles: { name: 'Candle Cluster', cat: 'furniture', price: 70, sell: 20, furn: 'candles', desc: 'Flickering and calm.' },
  f_flowers: { name: 'Flower Vase', cat: 'furniture', price: 60, sell: 20, furn: 'vase', desc: 'Fresh flowers every day.' },
  f_dresser: { name: 'Dresser', cat: 'furniture', price: 240, sell: 80, furn: 'dresser', desc: 'For all your outfits.' },
  f_lanterns: { name: 'String Lights', cat: 'furniture', price: 200, sell: 65, furn: 'strings', desc: 'Twinkly little lights.' },
  f_globe: { name: 'Old Globe', cat: 'furniture', price: 280, sell: 90, furn: 'globe', desc: 'Nana circled every place she visited.' },
  f_piano: { name: 'Little Piano', cat: 'furniture', price: 900, sell: 300, furn: 'piano', desc: 'Only slightly out of tune.' },
  f_shipbottle: { name: 'Ship in a Bottle', cat: 'furniture', sell: 150, furn: 'shipbottle', desc: 'Marlo’s sister built it. The tiny sails still flutter when you’re not looking.' },
  f_hay: { name: 'Hay Bale Seat', cat: 'furniture', price: 90, sell: 30, furn: 'haybale', desc: 'Rustic, scratchy, oddly comfortable.' },
  f_telescope: { name: 'Brass Telescope', cat: 'furniture', price: 650, sell: 200, furn: 'telescope', desc: 'For stargazing from your own window.' },
  f_terrarium: { name: 'Terrarium', cat: 'furniture', sell: 160, furn: 'terrarium', desc: 'Moss, a fern, and Gerald — a very small, very polite frog.' },
  f_minilight: { name: 'Little Lighthouse', cat: 'furniture', price: 480, sell: 150, furn: 'minilight', desc: 'A night-light shaped like Old Glimmer. Pim swears it was carved from driftwood.' },
  f_musicbox: { name: 'Music Box', cat: 'furniture', price: 540, sell: 170, furn: 'musicbox', desc: 'Plays a tune nobody in the cove has heard before. Wind it and listen.' },
  f_lanternset: { name: 'Paper Lanterns', cat: 'furniture', price: 260, sell: 80, furn: 'lanternset', desc: 'Festival lanterns from far-away towns, glowing in soft colours.' },

  // ---- decor (wallpapers / floors)
  wp_rose: { name: 'Rose Wallpaper', cat: 'decor', price: 120, sell: 40, wall: 'rose', desc: 'Pink with tiny flowers.' },
  wp_mint: { name: 'Mint Stripes', cat: 'decor', price: 120, sell: 40, wall: 'mint', desc: 'Fresh and breezy.' },
  wp_night: { name: 'Starry Wallpaper', cat: 'decor', price: 180, sell: 60, wall: 'night', desc: 'A dreamy midnight blue.' },
  wp_honey: { name: 'Honey Panels', cat: 'decor', price: 150, sell: 50, wall: 'honey', desc: 'Warm wooden panels.' },
  fl_check: { name: 'Checker Floor', cat: 'decor', price: 140, sell: 45, floor: 'check', desc: 'Cream and rose tiles.' },
  fl_dark: { name: 'Walnut Floor', cat: 'decor', price: 140, sell: 45, floor: 'dark', desc: 'Rich, dark planks.' },
  fl_moss: { name: 'Moss Carpet', cat: 'decor', price: 160, sell: 50, floor: 'moss', desc: 'Soft and green.' },

  // ---- clothes (unlock in the wardrobe)
  c_frog: { name: 'Frog Hat', cat: 'clothes', price: 260, sell: 60, unlock: ['hat', 'frog'], desc: 'Ribbit.' },
  c_witch: { name: 'Wizard Hat', cat: 'clothes', price: 320, sell: 70, unlock: ['hat', 'witch'], desc: 'Full of mysterious pockets.' },
  c_crown: { name: 'Tiny Crown', cat: 'clothes', price: 500, sell: 120, unlock: ['hat', 'crown'], desc: 'For the ruler of cozy.' },
  c_catears: { name: 'Cat Ears', cat: 'clothes', price: 200, sell: 50, unlock: ['hat', 'catears'], desc: 'Mew.' },
  c_straw: { name: 'Straw Hat', cat: 'clothes', price: 150, sell: 35, unlock: ['hat', 'straw'], desc: 'Perfect for gardening.' },
  c_haori: { name: 'Haori Jacket', cat: 'clothes', price: 280, sell: 70, unlock: ['top', 'haori'], desc: 'Light and flowing.' },
  c_smock: { name: 'Painter’s Smock', cat: 'clothes', price: 180, sell: 45, unlock: ['top', 'smock'], desc: 'Comes with free paint splatters.' },
  c_shades: { name: 'Sunglasses', cat: 'clothes', price: 160, sell: 40, unlock: ['acc', 'shades'], desc: 'Too cool for the cove.' },
  c_scarf: { name: 'Knit Scarf', cat: 'clothes', price: 140, sell: 35, unlock: ['acc', 'scarf'], desc: 'Hand-knitted by Mabel.' },
  c_tophat: { name: 'Top Hat', cat: 'clothes', price: 350, sell: 80, unlock: ['hat', 'tophat'], desc: 'Very distinguished.' },

  // ---- upgrades
  u_rod: { name: 'Sturdy Rod', cat: 'upgrade', price: 400, desc: 'Fish bite faster and rare fish appear more often.' },
  u_can: { name: 'Big Watering Can', cat: 'upgrade', price: 350, desc: 'Waters three plots in a row.' },
};

export function item(id) {
  return ITEMS[id] || { name: id, cat: 'misc', desc: '' };
}

export const STACK_MAX = 99;

export const FISH_POOLS = {
  sea: [
    { id: 'fish_sardine', w: 30 }, { id: 'fish_mackerel', w: 18 }, { id: 'fish_crab', w: 10 },
    { id: 'fish_puffer', w: 4, rare: true }, { id: 'fish_seaweed', w: 8 }, { id: 'fish_boot', w: 3 },
    { id: 'fish_moonfin', w: 6, night: true, rare: true },
  ],
  river: [
    { id: 'fish_minnow', w: 30 }, { id: 'fish_trout', w: 18 }, { id: 'fish_boot', w: 3 },
  ],
  pond: [
    { id: 'fish_carp', w: 26 }, { id: 'fish_minnow', w: 14 }, { id: 'fish_koi', w: 4, rare: true },
    { id: 'fish_goldfish', w: 3, rare: true }, { id: 'fish_boot', w: 2 },
  ],
  ice: [
    { id: 'fish_char', w: 26 }, { id: 'fish_minnow', w: 10 }, { id: 'fish_icefin', w: 5, rare: true }, { id: 'fish_boot', w: 1 },
  ],
  koi: [
    { id: 'fish_koi', w: 20 }, { id: 'fish_goldfish', w: 12 }, { id: 'fish_carp', w: 10 }, { id: 'fish_minnow', w: 6 },
  ],
  marsh: [
    { id: 'fish_catfish', w: 18 }, { id: 'fish_carp', w: 16 }, { id: 'fish_minnow', w: 12 }, { id: 'fish_eel', w: 3, night: true, rare: true }, { id: 'fish_boot', w: 2 },
  ],
  lake: [
    { id: 'fish_perch', w: 28 }, { id: 'fish_bass', w: 16 }, { id: 'fish_minnow', w: 10 }, { id: 'fish_pike', w: 4, rare: true },
    { id: 'fish_eel', w: 5, night: true, rare: true }, { id: 'fish_boot', w: 2 },
  ],
};

export const CROPS = {
  turnip: { days: 3, item: 'turnip', color: '#f4efe4', leaf: '#6fb85a' },
  carrot: { days: 3, item: 'carrot', color: '#e8883a', leaf: '#5fa453' },
  strawberry: { days: 4, item: 'strawberry', color: '#e0463f', leaf: '#4f955a', regrow: 2 },
  sunflower: { days: 4, item: 'sunflower', color: '#f2c14e', leaf: '#5fa453', tall: true },
  pumpkin: { days: 5, item: 'pumpkin', color: '#e58a3a', leaf: '#4f955a' },
  wheat: { days: 3, item: 'wheat', color: '#e8c46a', leaf: '#8aa64a', tall: true },
  moonbloom: { days: 4, item: 'moonbloom', color: '#b9d8ff', leaf: '#6fa0c8', glow: true },
};
