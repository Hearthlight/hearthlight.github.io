// Terrain types for the ground layer.

export const TILE = 16;

export const TT = {
  GRASS: 0,
  MEADOW: 1,
  FOREST: 2,
  PATH: 3,
  PLAZA: 4,
  SAND: 5,
  WATER: 6,
  PLANK_H: 7, // planks running east-west (pier going north-south)
  PLANK_V: 8, // planks running north-south
  SOIL: 9,
  ROCK: 10,
  FLOOR_WOOD: 11, // interiors
  FLOOR_TILE: 12,
  FLOOR_STONE: 13,
  WALL: 14,
  VOID: 15,
  FIELD: 16, // tilled farm field with wheat
  HILL: 17,  // grassy plateau (cliffs like rock, meadow on top)
  SNOW: 18,  // Frostpine Ridge
  ICE: 19,   // frozen pond (slippery!)
  LEAVES: 20, // Maple Hollow's leaf litter
  MARSH: 21, // Reedmarsh mud & grass
  PETALS: 22, // Blossom Glade: grass strewn with cherry petals
  // ---- the big Party Mode world (never used by the valley)
  DUNE: 23,     // desert sand with wind ripples (Sunscorch Dunes)
  MESA: 24,     // red rock plateau (Red Canyon) — cliffs below
  CANYON: 25,   // red dirt canyon floor
  BASALT: 26,   // dark volcanic rock (Emberpeak) — cliffs below
  LAVA: 27,     // molten rock: too hot to touch
  ASH: 28,      // grey ash fields
  OBSIDIAN: 29, // glassy black paving & bridges
  MYCEL: 30,    // mushroom-wood moss (Bouncecap Woods)
  GLACIER: 31,  // blue glacier ice (slippery)
  CREVASSE: 32, // a crack in the glacier
  BOG: 33,      // squelchy swamp mud (Croakmire)
  RUINS: 34,    // old flagstones (the Sunken City)
  CLOUD: 35,    // a cloud you can walk on (Cloud Isles)
  SKY: 36,      // the open sky between the cloud islands
  STEPPE: 37,   // golden grass (Golden Steppe)
  HEATH: 38,    // windswept heather plateau (Windy Heights) — cliffs below
  CORAL: 39,    // shallow coral reef water (Coral Lagoon)
  ARENA: 40,    // the Festival Ring's raked sand, painted with its rings & star
  JUNGLE: 41,   // lush jungle floor: fern fronds, leaf litter & roots (Dino Isle)
  TAR: 42,      // a sticky tar pit (Dino Isle): slow going
  // ---- World v7: the Dawnlands
  BAMBOO: 43,   // a bamboo grove's floor of pale fallen leaves (Jade Terraces)
  PADDY: 44,    // flooded rice terraces: shoots in rows, stone lips between the steps
  SALT: 45,     // a white salt crust cracked into polygons (Saltmirror Flats)
  AUTUMN: 46,   // a thick carpet of red & gold leaves (Emberleaf Wood)
  ROOTS: 47,    // deep moss crossed by giant roots (Elderbough)
  MOOR: 48,     // dark peat & grey grass (Hollowmoor)
  CRYSTAL: 49,  // lilac ground studded with crystal facets (Prism Fields)
  COBBLE: 50,   // town cobblestones (Lanternport, Cogsworth)
  METAL: 51,    // brass plating on a riveted plateau (Cogsworth Heights) — cliffs below
  TUNDRA: 52,   // frozen sage ground, lichens & snow patches (Aurora Tundra)
  UMBRAL: 53,   // black glass shot with violet veins (the Umbral Scar)
  CRAG: 54,     // a mountain's bare rock where nobody climbs (summits, pinnacles, buttes) — cliffs below
  SINTER: 55,   // a hot spring's crust: pale silica streaked with orange mats (Prism Springs)
};

// raised plateaus: a cliff face is painted below them and only paths climb it
export const HIGH = new Set([TT.ROCK, TT.HILL, TT.MESA, TT.BASALT, TT.HEATH, TT.METAL, TT.CRAG]);
// (World v7) relief: the first level up is FACE_TEX texels of cliff face below its
// edge (the plateaus' old look), every level above it a whole tile more
export const FACE_TEX = 10;
export const LEVEL_TEX = 16;
const hTex = (e) => (e > 0 ? FACE_TEX + (e - 1) * LEVEL_TEX : 0);
export const faceTex = (E, e) => hTex(E) - hTex(e);
// soft ground: a one-level step of it is a grassy (sandy, snowy…) bank you can walk
// up and down, painted as a shaded slope; rock, plateaus, walls & big drops are cliffs
export const SLOPE = new Set([TT.GRASS, TT.MEADOW, TT.FOREST, TT.SAND, TT.SNOW, TT.LEAVES, TT.MARSH, TT.PETALS, TT.DUNE, TT.CANYON,
  TT.ASH, TT.MYCEL, TT.GLACIER, TT.BOG, TT.STEPPE, TT.JUNGLE, TT.BAMBOO, TT.PADDY, TT.SALT, TT.AUTUMN, TT.ROOTS, TT.MOOR,
  TT.CRYSTAL, TT.TUNDRA, TT.UMBRAL, TT.SINTER, TT.FIELD, TT.SOIL]);
// "liquids": painted with depth & banks, drawn over by an animated shader
export const LIQUID = new Set([TT.WATER, TT.LAVA, TT.SKY, TT.CORAL]);

// height: used for edge shading (higher terrain casts a lip over lower terrain)
// walk: can walk on it
// noise: organic edge wobble amplitude for the terrain synthesis
// step: footstep sound surface
export const TINFO = {
  [TT.GRASS]: { name: 'grass', walk: true, height: 3, noise: 0.12, step: 'grass', prio: 5 },
  [TT.MEADOW]: { name: 'meadow', walk: true, height: 3, noise: 0.14, step: 'grass', prio: 4 },
  [TT.FOREST]: { name: 'forest', walk: true, height: 3, noise: 0.14, step: 'grass', prio: 6 },
  [TT.PATH]: { name: 'path', walk: true, height: 2, noise: 0.07, step: 'dirt', prio: 7 },
  [TT.PLAZA]: { name: 'plaza', walk: true, height: 2, noise: 0.015, step: 'stone', prio: 9 },
  [TT.SAND]: { name: 'sand', walk: true, height: 1, noise: 0.16, step: 'sand', prio: 3 },
  [TT.WATER]: { name: 'water', walk: false, height: 0, noise: 0.14, step: 'water', prio: 1 },
  [TT.PLANK_H]: { name: 'planks', walk: true, height: 2, noise: 0, step: 'wood', prio: 10 },
  [TT.PLANK_V]: { name: 'planks', walk: true, height: 2, noise: 0, step: 'wood', prio: 10 },
  [TT.SOIL]: { name: 'soil', walk: true, height: 2, noise: 0.0, step: 'dirt', prio: 8 },
  [TT.ROCK]: { name: 'rock', walk: true, height: 4, noise: 0.1, step: 'stone', prio: 2 },
  [TT.FLOOR_WOOD]: { name: 'floor', walk: true, height: 2, noise: 0, step: 'floor', prio: 1 },
  [TT.FLOOR_TILE]: { name: 'floor', walk: true, height: 2, noise: 0, step: 'stone', prio: 1 },
  [TT.FLOOR_STONE]: { name: 'floor', walk: true, height: 2, noise: 0, step: 'stone', prio: 1 },
  [TT.WALL]: { name: 'wall', walk: false, height: 5, noise: 0, step: 'floor', prio: 1 },
  [TT.VOID]: { name: 'void', walk: false, height: 0, noise: 0, step: 'floor', prio: 0 },
  [TT.FIELD]: { name: 'field', walk: true, height: 2, noise: 0, step: 'dirt', prio: 8 },
  [TT.HILL]: { name: 'hill', walk: true, height: 4, noise: 0.1, step: 'grass', prio: 2 },
  [TT.SNOW]: { name: 'snow', walk: true, height: 3, noise: 0.16, step: 'sand', prio: 5 },
  [TT.ICE]: { name: 'ice', walk: true, height: 2, noise: 0.06, step: 'stone', prio: 7 },
  [TT.LEAVES]: { name: 'leaves', walk: true, height: 3, noise: 0.16, step: 'grass', prio: 6 },
  [TT.MARSH]: { name: 'marsh', walk: true, height: 2, noise: 0.18, step: 'dirt', prio: 4 },
  [TT.PETALS]: { name: 'petals', walk: true, height: 3, noise: 0.16, step: 'grass', prio: 4 },
  [TT.DUNE]: { name: 'dune', walk: true, height: 1, noise: 0.18, step: 'sand', prio: 3 },
  [TT.MESA]: { name: 'mesa', walk: true, height: 4, noise: 0.1, step: 'stone', prio: 2 },
  [TT.CANYON]: { name: 'canyon', walk: true, height: 2, noise: 0.14, step: 'dirt', prio: 4 },
  [TT.BASALT]: { name: 'basalt', walk: true, height: 4, noise: 0.1, step: 'stone', prio: 2 },
  [TT.LAVA]: { name: 'lava', walk: false, height: 0, noise: 0.14, step: 'stone', prio: 1 },
  [TT.ASH]: { name: 'ash', walk: true, height: 3, noise: 0.16, step: 'sand', prio: 4 },
  [TT.OBSIDIAN]: { name: 'obsidian', walk: true, height: 2, noise: 0.02, step: 'stone', prio: 9 },
  [TT.MYCEL]: { name: 'moss', walk: true, height: 3, noise: 0.16, step: 'grass', prio: 5 },
  [TT.GLACIER]: { name: 'glacier', walk: true, height: 3, noise: 0.12, step: 'stone', prio: 6 },
  [TT.CREVASSE]: { name: 'crevasse', walk: false, height: 0, noise: 0.08, step: 'stone', prio: 1 },
  [TT.BOG]: { name: 'bog', walk: true, height: 2, noise: 0.18, step: 'dirt', prio: 4 },
  [TT.RUINS]: { name: 'ruins', walk: true, height: 2, noise: 0.02, step: 'stone', prio: 9 },
  [TT.CLOUD]: { name: 'cloud', walk: true, height: 3, noise: 0.2, step: 'sand', prio: 5 },
  [TT.SKY]: { name: 'sky', walk: false, height: 0, noise: 0.2, step: 'sand', prio: 1 },
  [TT.STEPPE]: { name: 'steppe', walk: true, height: 3, noise: 0.14, step: 'grass', prio: 4 },
  [TT.HEATH]: { name: 'heath', walk: true, height: 4, noise: 0.12, step: 'grass', prio: 2 },
  [TT.CORAL]: { name: 'reef', walk: false, height: 0, noise: 0.16, step: 'water', prio: 1 },
  [TT.ARENA]: { name: 'arena', walk: true, height: 2, noise: 0.04, step: 'sand', prio: 8 },
  [TT.JUNGLE]: { name: 'jungle', walk: true, height: 3, noise: 0.16, step: 'grass', prio: 6 },
  [TT.TAR]: { name: 'tar', walk: true, height: 1, noise: 0.14, step: 'dirt', prio: 3 },
  [TT.BAMBOO]: { name: 'bamboo', walk: true, height: 3, noise: 0.14, step: 'grass', prio: 6 },
  [TT.PADDY]: { name: 'paddy', walk: true, height: 2, noise: 0.06, step: 'water', prio: 5 },
  [TT.SALT]: { name: 'salt', walk: true, height: 2, noise: 0.12, step: 'sand', prio: 4 },
  [TT.AUTUMN]: { name: 'leaves', walk: true, height: 3, noise: 0.16, step: 'grass', prio: 6 },
  [TT.ROOTS]: { name: 'moss', walk: true, height: 3, noise: 0.16, step: 'grass', prio: 6 },
  [TT.MOOR]: { name: 'moor', walk: true, height: 3, noise: 0.14, step: 'grass', prio: 4 },
  [TT.CRYSTAL]: { name: 'crystal', walk: true, height: 3, noise: 0.12, step: 'stone', prio: 5 },
  [TT.COBBLE]: { name: 'cobbles', walk: true, height: 2, noise: 0.02, step: 'stone', prio: 9 },
  [TT.METAL]: { name: 'brass', walk: true, height: 4, noise: 0.03, step: 'stone', prio: 2 },
  [TT.TUNDRA]: { name: 'tundra', walk: true, height: 3, noise: 0.14, step: 'grass', prio: 5 },
  [TT.UMBRAL]: { name: 'black glass', walk: true, height: 3, noise: 0.1, step: 'stone', prio: 4 },
  [TT.CRAG]: { name: 'crag', walk: false, height: 5, noise: 0.1, step: 'stone', prio: 2 },
  [TT.SINTER]: { name: 'sinter', walk: true, height: 2, noise: 0.14, step: 'sand', prio: 4 },
};
