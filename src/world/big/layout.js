// The big world: size, chunks and the zones. Pure data (usable from workers &
// node). The valley keeps its own coordinates at [0,240)×[0,128).
// World v7: two continents on one plane — the Hearthlands (C1, x ∈ [-280,520),
// z ∈ [-136,264), generated exactly as before) and the Dawnlands (C2) east of the
// Wide Sea; the world spans x ∈ [-280,1448), z ∈ [-192,320).

export const BIG = { X0: -280, Z0: -192, W: 1728, H: 512, CHUNK: 32, SEED: 20260927 };
export const C1 = { x0: -280, z0: -136, x1: 520, z1: 264 };        // the Hearthlands
export const C2 = { x0: 680, z0: -184, x1: 1440, z1: 312 };        // the Dawnlands
export const CONTINENTS = [
  { id: 'hearth', name: 'The Hearthlands', ...C1 },
  { id: 'dawn', name: 'The Dawnlands', ...C2 },
];
export const VALLEY = { x0: 0, z0: 0, x1: 240, z1: 128 };
// the Festival Ring: Party Mode's grand arena on the Golden Steppe, just past
// the valley's west gate (x, z = centre of the sand; rx, rz = its half-axes)
export const ARENA_SITE = { x: -21, z: 87.5, rx: 14.5, rz: 11 };
export const CHUNKS_X = BIG.W / BIG.CHUNK, CHUNKS_Z = Math.ceil(BIG.H / BIG.CHUNK);

// Zones. `seeds` pull tiles towards the zone (a warped Voronoi); the valley is
// stamped as is. `map` is the colour on the world map, `water` the palette its
// seas & ponds use, `music`/`amb`/`weather` feed the zone runtime.
export const ZONES = [
  { id: 'valley', lv: [1, 5], name: 'Marigold Valley', seeds: [], map: '#6eaf58', water: 'sea', music: null },
  { id: 'deepwood', lv: [4, 8], name: 'Deep Whisperwood', seeds: [[120, -18], [40, -14], [180, -12]], map: '#2f6a45', water: 'river', music: 'forest', amb: 'forest' },
  { id: 'heights', lv: [7, 11], name: 'Windy Heights', seeds: [[60, -92], [140, -100], [-10, -100], [100, -60]], map: '#9fa86a', water: 'tarn', music: 'heights', amb: 'wind', weather: 'gusts' },
  { id: 'bouncecap', lv: [13, 17], name: 'Bouncecap Woods', seeds: [[-200, -80], [-130, -70], [-60, -40], [-220, -20], [-110, -110]], map: '#7a5aa8', water: 'glow', music: 'mushroom', amb: 'spores', weather: 'spores' },
  { id: 'glacier', lv: [17, 21], name: 'Frostpeak Glacier', seeds: [[250, -95], [330, -80], [290, -40], [210, -60]], map: '#cfe6f7', water: 'ice', music: 'glacier', amb: 'blizzard', weather: 'snow' },
  { id: 'cloud', lv: [20, 23], name: 'Cloud Isles', seeds: [[460, -95], [490, -60], [420, -115]], map: '#b8d4f4', water: 'sky', music: 'clouds', amb: 'breeze', weather: 'sparkle' },
  { id: 'steppe', lv: [9, 13], name: 'Golden Steppe', seeds: [[-60, 55], [-80, 100], [-40, 15]], map: '#d9c46a', water: 'river', music: 'steppe', amb: 'grass', weather: 'breeze' },
  { id: 'canyon', lv: [11, 15], name: 'Red Canyon', seeds: [[-200, 40], [-170, 95], [-230, -5], [-150, 10]], map: '#c8704a', water: 'river', music: 'canyon', amb: 'canyon', weather: 'dust' },
  { id: 'dunes', lv: [21, 24], name: 'Sunscorch Dunes', seeds: [[-200, 185], [-120, 215], [-240, 145], [-90, 160]], map: '#f0cf82', water: 'oasis', music: 'desert', amb: 'desert', weather: 'sandstorm' },
  { id: 'sunken', lv: [23, 26], name: 'Sunken City', seeds: [[30, 205], [-30, 225], [80, 235]], map: '#5a9aa0', water: 'teal', music: 'sunken', amb: 'sea', weather: 'mist' },
  { id: 'lagoon', lv: [22, 25], name: 'Coral Lagoon', seeds: [[215, 205], [290, 215], [170, 235]], map: '#4ac8d0', water: 'lagoon', music: 'lagoon', amb: 'sea', weather: 'sun' },
  { id: 'straits', lv: [26, 29], name: 'Whirlpool Straits', seeds: [[490, 245], [482, 196], [352, 250]], map: '#2c5a8e', water: 'deep', music: 'straits', amb: 'sea', weather: 'squall' },
  { id: 'marsh', lv: [15, 19], name: 'Croakmire', seeds: [[300, 60], [290, 110], [275, 20], [340, 95]], map: '#5f7a45', water: 'bog', music: 'marsh', amb: 'marsh', weather: 'fog' },
  { id: 'volcano', lv: [25, 28], name: 'Emberpeak', seeds: [[455, 55], [440, 125], [480, 5], [410, 90]], map: '#6a4a4a', water: 'sea', music: 'volcano', amb: 'volcano', weather: 'ash' },
  { id: 'sea', lv: [10, 20], name: 'Open Sea', seeds: [[120, 158], [60, 160], [180, 160], [350, 160], [-40, 170]], map: '#3a7cae', water: 'sea', music: 'island', amb: 'sea', weather: 'sun' },
  // Adventure v5: a jungle island of dinosaurs in the south-east sea
  { id: 'dino', lv: [27, 30], name: 'Dino Isle', seeds: [[408, 214], [390, 204], [428, 226]], map: '#3f8a4a', water: 'lagoon', music: 'jungle', amb: 'jungle', weather: 'mist' },
  // ---- World v7: the Wide Sea and the Dawnlands (continent 2; seeds are C2's own, see gen2.js)
  { id: 'wide', lv: [26, 30], name: 'The Wide Sea', seeds: [], map: '#2c5e92', water: 'deep', music: 'voyage', c2: true },
  { id: 'whale', lv: [28, 30], name: 'Whale Isle', seeds: [], map: '#6a8a9a', water: 'sea', music: 'whale', c2: true },
  { id: 'harbor', lv: [29, 31], name: 'Lantern Bay', seeds: [[776, 62], [770, 16], [764, 112]], map: '#c8a878', water: 'sea', music: 'harbor', c2: true },
  { id: 'jade', lv: [30, 33], name: 'Jade Terraces', seeds: [[790, -110], [860, -140], [760, -60], [880, -80]], map: '#7ac28a', water: 'karst', music: 'jade', c2: true },
  { id: 'salt', lv: [31, 34], name: 'Saltmirror Flats', seeds: [[770, 200], [810, 260], [740, 250]], map: '#eee4ea', water: 'mirror', music: 'salt', c2: true },
  { id: 'autumn', lv: [32, 35], name: 'Emberleaf Wood', seeds: [[890, 190], [930, 236], [872, 150]], map: '#c8603a', water: 'river', music: 'autumn', c2: true },
  { id: 'glow', lv: [33, 36], name: 'Glowtide Coast', seeds: [[1010, 270], [1080, 285], [960, 290]], map: '#3a7a8a', water: 'glowtide', music: 'glow', c2: true },
  { id: 'elder', lv: [34, 37], name: 'Elderbough', seeds: [[980, 60], [1010, 120], [940, 20], [1050, 40]], map: '#3e6a3a', water: 'river', music: 'elder', c2: true },
  { id: 'moor', lv: [35, 38], name: 'Hollowmoor', seeds: [[1140, 110], [1190, 150], [1110, 60], [1276, 70]], map: '#5a4a5e', water: 'bog', music: 'moor', c2: true },
  { id: 'prism', lv: [36, 39], name: 'Prism Springs', seeds: [[1200, 250], [1270, 270], [1150, 230], [1340, 250], [1296, 190]], map: '#e4c89a', water: 'prismatic', music: 'prism', c2: true },
  { id: 'clock', lv: [37, 40], name: 'Cogsworth Heights', seeds: [[1250, -110], [1320, -60], [1200, -150], [1370, -130]], map: '#b8924a', water: 'tarn', music: 'clock', c2: true },
  { id: 'tundra', lv: [37, 40], name: 'Aurora Tundra', seeds: [[1020, -130], [1100, -150], [960, -110]], map: '#a8b8b0', water: 'glacial', music: 'tundra', c2: true },
  { id: 'scar', lv: [39, 40], name: 'The Umbral Scar', seeds: [[1414, 70], [1418, 140], [1404, 0]], map: '#3a2a4a', water: 'umbral', music: 'scar', c2: true },
];
export const ZONE_IDS = ZONES.map((z) => z.id);
export const ZI = Object.fromEntries(ZONES.map((z, i) => [z.id, i]));

// water palettes (deep → shallow) per zone flavour
export const WATERS = {
  sea: ['#244d78', '#2f6594', '#3a7cae', '#5a9ccb', '#8fc8e8'],
  river: ['#2c5a80', '#35699a', '#4280b4', '#62a0cf', '#94c8e8'],
  tarn: ['#2a4a70', '#345c88', '#4474a4', '#6a98c4', '#a0c8e4'],
  glow: ['#2a2a5a', '#34387a', '#40509a', '#5a78c4', '#8fb4f0'],
  ice: ['#2c5a8a', '#3a70a4', '#5290c4', '#7ab4e0', '#b4dcf4'],
  sky: ['#6a9ce0', '#80b0ec', '#98c4f4', '#b4d8fa', '#d8ecff'],
  oasis: ['#1f6a78', '#28808c', '#34a0a4', '#5ac4bc', '#9ae4d4'],
  teal: ['#1f5a64', '#27707a', '#338890', '#56aaa8', '#90d0c4'],
  lagoon: ['#1a6a9a', '#1f88b0', '#2aa8c4', '#52cad4', '#98ecec'],
  deep: ['#152e58', '#1c3c6c', '#244d84', '#3668a0', '#5a90c4'],
  bog: ['#2e3a2a', '#3a4a32', '#4a5a3a', '#607048', '#80905a'],
  // World v7
  mirror: ['#8aa8d8', '#a4bce4', '#bcd0ee', '#d6e4f6', '#eef4fc'],     // thin water on salt: the sky
  glowtide: ['#0e2a3a', '#14384c', '#1c4a60', '#2a6a7a', '#4ab8b8'],   // dark bay water that glows at night
  umbral: ['#140a1e', '#1e1030', '#2a1644', '#3e2262', '#6a3a9a'],     // ink-black, violet at the edges
  prismatic: ['#1a3a8a', '#2a78c4', '#36b0aa', '#8cd06a', '#f0b040'],  // hot springs: deep blue heart, rainbow rings, an orange rim
  glacial: ['#145a6e', '#1c7a8c', '#28a0aa', '#4ac4c2', '#9ae8e0'],    // meltwater lakes, milky turquoise
  karst: ['#0e4a4a', '#135e5c', '#1a7a70', '#2a9a84', '#5ac0a0'],      // emerald rivers under limestone
};
