// Marigold Cove & surroundings. Pure data/logic (no DOM) so it can be
// previewed from node: `node tools/mapdump.mjs`.
//
// The original village was authored in its own coordinates; it now sits at
// an offset (OX, OZ) inside a much larger valley:
//   north  — Whisperwood forest, Mirror Pond, the campsite, Old Oak shrine,
//            Waterfall Lake (river source) and the Glowcap Grove
//   west   — Honeydew Fields: windmill, big red barn, farmhouse, wheat, pond
//   east   — Sunpetal Meadow, Willow Lake, lavender rows, Starfall Hill
//   south  — Driftwood Beach, Seagull Bluffs, and Turtle Isle across the water

import { TT } from './tiles.js';
import { rng, fbm, hash2 } from '../engine/util.js';

export const MAP_W = 240;
export const MAP_H = 128;
export const OX = 44;
export const OZ = 40;
/** Shift a point from the original village coordinates into the world. */
export const O = (x, z) => [x + OX, z + OZ];

// Buildings: footprint in tiles (x,y,w,h); door on the bottom row.
const VILLAGE_BUILDINGS = [
  { id: 'home', name: 'Your Cottage', x: 9, y: 20, w: 5, h: 3, door: 11, style: { roof: '#c75b4e', wall: 'timber', trim: '#6b4330', chimney: 1, flowerbox: true, round: true } },
  { id: 'carpenter', name: "Theo's Workshop", x: 21, y: 13, w: 6, h: 3, door: 23, style: { roof: '#6d7a8c', wall: 'logs', trim: '#5a3b2a', chimney: 4, sign: 'hammer', lean: true } },
  { id: 'store', name: 'Petal & Seed', x: 28, y: 24, w: 6, h: 3, door: 30, style: { roof: '#5f9e6a', wall: 'plaster', trim: '#7a5238', awning: ['#f4efe4', '#6fae6a'], sign: 'leaf', flowerbox: true } },
  { id: 'bakery', name: "Rosa's Bakery", x: 40, y: 17, w: 5, h: 3, door: 42, style: { roof: '#d98a4e', wall: 'brick', trim: '#6b4330', chimney: 3, awning: ['#fbf1dc', '#d9594c'], sign: 'bread' } },
  { id: 'hall', name: 'Town Hall', x: 49, y: 15, w: 7, h: 4, door: 52, style: { roof: '#4f6aa3', wall: 'stone', trim: '#4b3a3a', clock: true, flag: true, columns: true } },
  { id: 'cafe', name: 'The Driftwood Café', x: 58, y: 23, w: 6, h: 3, door: 60, style: { roof: '#8a5a9e', wall: 'boards', trim: '#5a3b2a', awning: ['#fbf1dc', '#8a5a9e'], sign: 'cup', chimney: 5 } },
  { id: 'library', name: 'Seashell Library', x: 23, y: 35, w: 6, h: 4, door: 25, style: { roof: '#3f7f7c', wall: 'stone', trim: '#4b3a3a', sign: 'book', round: true, chimney: 1 } },
  { id: 'wren', name: "Wren's Cottage", x: 32, y: 36, w: 4, h: 3, door: 33, style: { roof: '#e3a1b4', wall: 'plaster', trim: '#8e5d3e', flowerbox: true, round: true, chimney: 3 } },
  { id: 'shack', name: "Finn's Boathouse", x: 30, y: 48, w: 5, h: 3, door: 32, style: { roof: '#4d7fc4', wall: 'boards', trim: '#4a2e25', sign: 'fish', stilts: false } },
  { id: 'lighthouse', name: 'Old Glimmer', x: 85, y: 50, w: 3, h: 3, door: 86, style: { kind: 'lighthouse' } },
];

export const BUILDINGS = [
  ...VILLAGE_BUILDINGS.map((b) => ({ ...b, x: b.x + OX, y: b.y + OZ, door: b.door + OX })),
  { id: 'farmhouse', name: 'Honeydew Farmhouse', x: 6, y: 63, w: 5, h: 3, door: 8, style: { roof: '#c89a52', wall: 'boards', wallColor: '#ead9b8', trim: '#6b4330', chimney: 1, flowerbox: true, shutter: '#4f955a' } },
  { id: 'barn', name: 'The Big Red Barn', x: 22, y: 46, w: 7, h: 4, door: 25, style: { roof: '#7a3a36', wall: 'boards', wallColor: '#c64a4a', trim: '#f4efe4', pitch: 1.0, sign: 'star' } },
  { id: 'windmill', name: 'The Old Windmill', x: 11, y: 54, w: 3, h: 3, door: 12, style: { kind: 'windmill' } },
  { id: 'marlo', name: 'Marlo’s Hut', x: 155, y: 109, w: 4, h: 3, door: 156, style: { roof: '#3f9b98', wall: 'boards', wallColor: '#e9dcc8', trim: '#6b4330', round: true, flowerbox: true } },
];

export const AREAS = [
  { name: 'Frostpine Ridge', x: 184, y: 0, w: 56, h: 42 },
  { name: 'Blossom Glade', x: 184, y: 42, w: 56, h: 34 },
  { name: 'Reedmarsh', x: 180, y: 76, w: 60, h: 16 },
  { name: 'Maple Hollow', x: 2, y: 1, w: 40, h: 29 },
  { name: 'Waterfall Lake', x: 98, y: 2, w: 30, h: 26 },
  { name: 'Glowcap Grove', x: 132, y: 26, w: 22, h: 18 },
  { name: 'Starfall Hill', x: 148, y: 14, w: 32, h: 30 },
  { name: 'Whisperwood Camp', x: 62, y: 18, w: 22, h: 18 },
  { name: 'Old Oak Shrine', x: 36, y: 10, w: 22, h: 22 },
  { name: 'Mirror Pond', x: 46, y: 41, w: 16, h: 12 },
  { name: 'Whisperwood', x: 30, y: 0, w: 120, h: 52 },
  { name: 'Honeydew Fields', x: 0, y: 30, w: 44, h: 56 },
  { name: 'Seagull Bluffs', x: 0, y: 84, w: 44, h: 44 },
  { name: 'Turtle Isle', x: 142, y: 100, w: 38, h: 28 },
  { name: 'Sunset Shore', x: 142, y: 88, w: 98, h: 40 },
  { name: 'Willow Lake', x: 144, y: 52, w: 36, h: 26 },
  { name: 'Lavender Rows', x: 142, y: 78, w: 38, h: 14 },
  { name: 'Sunpetal Meadow', x: 118, y: 44, w: 26, h: 44 },
  { name: 'Old Glimmer Point', x: 120, y: 88, w: 22, h: 26 },
  { name: 'Driftwood Beach', x: 44, y: 90, w: 76, h: 38 },
  { name: 'Market Plaza', x: 81, y: 60, w: 21, h: 17 },
  { name: 'Nana’s Cottage', x: 48, y: 57, w: 18, h: 11 },
  { name: 'Marigold Cove', x: 44, y: 52, w: 74, h: 38 },
];

export function areaAt(tx, ty) {
  for (const a of AREAS) if (tx >= a.x && ty >= a.y && tx < a.x + a.w && ty < a.y + a.h) return a.name;
  return 'Marigold Cove';
}

// ---- landform functions (world coordinates) ----------------------------------
export function shoreY(x) {
  const xo = x - OX;
  let y = 57 + OZ + Math.round(1.2 * Math.sin(xo * 0.15) + 0.8 * Math.sin(xo * 0.41 + 1.3));
  if (x < OX) y -= Math.round((OX - x) * 0.1) + 1;
  if (x > 140) y += Math.round(Math.sin(x * 0.2) * 1.2);
  return y;
}
export function riverX(z) {
  const zo = z - OZ;
  return OX + 71 + 1.6 * Math.sin(zo * 0.12) + 0.8 * Math.sin(zo * 0.31 + 0.5);
}
function forestEdge(x) {
  const xo = x - OX;
  if (x < OX - 4) return 30 + Math.round(2 * Math.sin(x * 0.3));
  if (x > 146) return 12 + Math.round(2 * Math.sin(x * 0.25));
  return 11 + OZ + Math.round(1.6 * Math.sin(xo * 0.21) + 1.2 * Math.sin(xo * 0.07 + 2));
}

export const LAKE = { x: 112, z: 15, rx: 9, rz: 5 };
export const WILLOW_LAKE = { x: 159, z: 64, rx: 8.5, rz: 5 };
export const FARM_POND = { x: 34, z: 77, rx: 4.5, rz: 3 };
export const ISLAND = { x: 160, z: 114, rx: 13, rz: 7.5 };
// the four newer biomes
export const FROST = { x: 213, z: 19, rx: 23, rz: 16 };
export const FROST_POND = { x: 214, z: 23, rx: 7, rz: 4 };
export const BLOSSOM = { x: 211, z: 61, rx: 23, rz: 13 };
export const KOI_POND = { x: 213, z: 62, rx: 6.5, rz: 3.6 };
export const MARSH = { x: 210, z: 84, rx: 27, rz: 7 };
export const MAPLE = { x: 21, z: 15, rx: 17, rz: 11.5 };
// Ferry moorings (world coords) & where passengers step on/off
export const FERRY = {
  village: { x: OX + 52.2, z: OZ + 66.2, standX: OX + 50.4, standZ: OZ + 65.4 },
  island: { x: 162.1, z: 103.2, standX: 160.4, standZ: 103.6 },
};

export function buildOverworld() {
  const W = MAP_W, H = MAP_H;
  const g = new Uint8Array(W * H).fill(TT.GRASS);
  const set = (x, y, t) => { if (x >= 0 && y >= 0 && x < W && y < H) g[y * W + x] = t; };
  const get = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? g[y * W + x] : TT.VOID);
  const rect = (x0, y0, w, h, t) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, t); };
  const ell = (cx, cy, rx, ry, t, pred) => {
    for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++)
      for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1 && (!pred || pred(get(x, y), x, y))) set(x, y, t);
      }
  };
  const line = (pts, width, t, pred) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 2;
      for (let s = 0; s <= steps; s++) {
        const x = Math.round(ax + ((bx - ax) * s) / steps), y = Math.round(ay + ((by - ay) * s) / steps);
        for (let j = 0; j < width; j++) for (let k = 0; k < width; k++) {
          if (!pred || pred(get(x + k, y + j))) set(x + k, y + j, t);
        }
      }
    }
  };
  const vrect = (x, y, w, h, t) => rect(x + OX, y + OZ, w, h, t);
  const vell = (x, y, rx, ry, t, p) => ell(x + OX, y + OZ, rx, ry, t, p);
  const vline = (pts, w, t, p) => line(pts.map(([x, y]) => [x + OX, y + OZ]), w, t, p);

  // --- forest belt & tree borders ---
  for (let x = 0; x < W; x++) { const fe = forestEdge(x); for (let y = 0; y < fe; y++) set(x, y, TT.FOREST); }
  for (let y = 0; y < 92; y++) {
    const wb = 2 + Math.round(fbm(0.5, y * 0.25, 7) * 2);
    for (let x = 0; x < wb; x++) set(x, y, TT.FOREST);
    const eb = W - 2 - Math.round(fbm(3.5, y * 0.25, 8) * 3);
    for (let x = eb; x < W; x++) set(x, y, TT.FOREST);
  }

  // --- east meadow ---
  for (let y = 44; y < 92; y++) for (let x = 118; x < W; x++) if (get(x, y) === TT.GRASS) set(x, y, TT.MEADOW);
  for (let y = 12; y < 44; y++) for (let x = 146; x < W - 3; x++) if (get(x, y) === TT.GRASS) set(x, y, TT.MEADOW);

  // --- beach + sea (whole width) ---
  for (let x = 0; x < W; x++) {
    const sy = shoreY(x);
    const top = sy - 5 - Math.round(fbm(x * 0.3, 1.5, 3) * 2);
    for (let y = top; y < sy; y++) set(x, y, TT.SAND);
    for (let y = sy; y < H; y++) set(x, y, TT.WATER);
  }

  // --- Waterfall Lake & its rock cliff (north) ---
  ell(LAKE.x, LAKE.z + 1.5, LAKE.rx + 6, LAKE.rz + 4.5, TT.GRASS);
  ell(LAKE.x, LAKE.z, LAKE.rx, LAKE.rz, TT.WATER);
  ell(LAKE.x, 4, 18, 6, TT.ROCK, (t, x, y) => y < LAKE.z - 4);
  for (let y = 0; y < LAKE.z - 3; y++) for (let x = LAKE.x - 1; x <= LAKE.x + 1; x++) set(x, y, TT.WATER);

  // --- river from Waterfall Lake to the sea ---
  for (let y = 40; y < H; y++) {
    const cx = riverX(y);
    const half = y > 90 ? 2.6 : 2.1;
    for (let x = Math.round(cx - half); x <= Math.round(cx + half - 1); x++) set(x, y, TT.WATER);
  }
  for (let y = LAKE.z; y < 40; y++) {
    const t = (40 - y) / (40 - LAKE.z);
    const cx = riverX(40) * (1 - t) + LAKE.x * t + Math.sin(y * 0.35) * 1.2;
    for (let x = Math.round(cx - 2); x <= Math.round(cx + 1); x++) set(x, y, TT.WATER);
  }

  // --- forest clearings ---
  vell(10, 6.5, 8.5, 5.5, TT.GRASS);
  vell(10, 6.5, 5.2, 3.3, TT.WATER);
  vell(47, 5.5, 6.5, 4.2, TT.GRASS);
  vell(24, 14, 7.5, 5, TT.GRASS, (t) => t === TT.FOREST);
  ell(72, 26, 8, 5.5, TT.GRASS);
  ell(46, 20, 7, 5.5, TT.GRASS);
  ell(142, 34, 7.5, 4.8, TT.GRASS);
  ell(93, 30, 5, 3.5, TT.GRASS);

  // --- Starfall Hill (rock plateau) ---
  ell(162, 26, 10, 6, TT.HILL);

  // --- headland (rock) ---
  vell(86.5, 55.5, 10.5, 7.2, TT.ROCK, (t, x, y) => y >= 48 + OZ);
  vell(86.5, 51.5, 7, 3.5, TT.ROCK);

  // --- Seagull Bluffs: rock shelf over the west sea with tide pools ---
  for (let x = 2; x < 40; x++) {
    const sy = shoreY(x);
    const top = sy - 7 - Math.round(fbm(x * 0.21, 4.5, 9) * 3);
    for (let y = top; y < sy + 2; y++) set(x, y, TT.ROCK);
  }
  for (const [x, y, rx, ry] of [[10, 91, 2.2, 1.2], [18, 92, 1.8, 1.1], [27, 90, 2.4, 1.3], [33, 91, 1.5, 1]]) ell(x, y, rx, ry, TT.WATER);

  // --- Turtle Isle ---
  ell(ISLAND.x, ISLAND.z, ISLAND.rx, ISLAND.rz, TT.SAND);
  ell(ISLAND.x - 1, ISLAND.z - 0.5, ISLAND.rx - 4.5, ISLAND.rz - 3, TT.GRASS);
  ell(ISLAND.x + 8, ISLAND.z + 1, 3.2, 2.2, TT.ROCK);

  // --- Willow Lake & farm pond ---
  ell(WILLOW_LAKE.x, WILLOW_LAKE.z, WILLOW_LAKE.rx, WILLOW_LAKE.rz, TT.WATER);
  ell(FARM_POND.x, FARM_POND.z, FARM_POND.rx, FARM_POND.rz, TT.WATER);

  // --- the four newer biomes -------------------------------------------------
  const blob = (E, x, y, wobble, seed) => {
    const nx = (x + 0.5 - E.x) / E.rx, ny = (y + 0.5 - E.z) / E.rz;
    return nx * nx + ny * ny + (fbm(x * 0.13, y * 0.13, seed) - 0.5) * wobble;
  };
  // Frostpine Ridge: snow over forest & meadow in the north-east
  for (let y = 0; y < 44; y++) for (let x = 182; x < W; x++) if (blob(FROST, x, y, 0.55, 21) < 1 && get(x, y) !== TT.WATER) set(x, y, TT.SNOW);
  ell(FROST_POND.x, FROST_POND.z, FROST_POND.rx, FROST_POND.rz, TT.ICE);
  set(FROST_POND.x + 3, FROST_POND.z, TT.WATER); // an ice-fishing hole
  // Blossom Glade: cherry-petal meadow with a koi pond
  for (let y = 42; y < 80; y++) for (let x = 182; x < W - 2; x++) if (blob(BLOSSOM, x, y, 0.5, 23) < 1 && [TT.MEADOW, TT.GRASS, TT.FOREST].includes(get(x, y))) set(x, y, TT.PETALS);
  ell(KOI_POND.x, KOI_POND.z, KOI_POND.rx, KOI_POND.rz, TT.WATER);
  // Reedmarsh: mud, reeds and little pools between the glade and the shore
  for (let y = 74; y < 94; y++) for (let x = 178; x < W - 2; x++) if (blob(MARSH, x, y, 0.45, 25) < 1 && [TT.MEADOW, TT.GRASS, TT.FOREST].includes(get(x, y))) set(x, y, TT.MARSH);
  {
    const pr = rng(4242);
    for (let i = 0; i < 16; i++) {
      const px = MARSH.x + (pr() - 0.5) * MARSH.rx * 1.7, pz = MARSH.z + (pr() - 0.5) * MARSH.rz * 1.4;
      ell(px, pz, 1.6 + pr() * 2.4, 1 + pr() * 1.4, TT.WATER, (t) => t === TT.MARSH);
    }
  }
  // Maple Hollow: the north-west woods turn to autumn
  for (let y = 0; y < 32; y++) for (let x = 2; x < 44; x++) if (blob(MAPLE, x, y, 0.5, 27) < 1 && [TT.FOREST, TT.GRASS].includes(get(x, y))) set(x, y, TT.LEAVES);
  ell(MAPLE.x + 1, MAPLE.z + 1, 6.5, 4, TT.LEAVES);

  // --- Plaza ---
  vrect(38, 22, 19, 15, TT.PLAZA);
  for (const [cx, cy] of [[38, 22], [56, 22], [38, 36], [56, 36]]) set(cx + OX, cy + OZ, TT.GRASS);

  // --- Paths ---
  const P = TT.PATH;
  const notWater = (t) => t !== TT.WATER && t !== TT.PLAZA;
  const land = (t) => t !== TT.WATER;
  vline([[4, 29], [38, 29]], 2, P, notWater);
  vline([[11, 23], [11, 29]], 2, P, notWater);
  vline([[23, 16], [23, 29]], 2, P, notWater);
  vline([[30, 27], [30, 29]], 2, P, notWater);
  vline([[42, 20], [42, 22]], 2, P, notWater);
  vline([[52, 19], [52, 22]], 2, P, notWater);
  vline([[56, 29], [69, 29]], 2, P, notWater);
  vline([[60, 26], [60, 29]], 2, P, notWater);
  vline([[46, 37], [46, 55]], 2, P, notWater);
  vline([[46, 9], [46, 22]], 2, P, notWater);
  vline([[23, 12], [17, 10], [13, 9]], 2, P, notWater);
  vline([[20, 41], [46, 41]], 2, P, notWater);
  vline([[25, 39], [25, 41]], 2, P, notWater);
  vline([[33, 39], [33, 41]], 2, P, notWater);
  vline([[74, 29], [80, 29], [80, 47], [84, 49], [86, 53]], 2, P, land);
  vline([[32, 51], [36, 53], [45, 53]], 2, P, (t) => t === TT.SAND);
  line([[48, 69], [30, 69], [2, 69]], 2, P, notWater);
  line([[8, 66], [8, 69]], 2, P, notWater);
  line([[25, 50], [25, 69]], 2, P, notWater);
  line([[12, 57], [12, 69]], 2, P, notWater);
  line([[90, 49], [91, 38], [93, 31], [98, 25], [106, 22], [110, 21]], 2, P, notWater);
  line([[91, 38], [82, 32], [75, 28]], 2, P, notWater);
  line([[70, 27], [58, 24], [48, 22]], 2, P, notWater);
  line([[57, 49], [53, 38], [48, 26]], 2, P, notWater);
  line([[52, 23], [48, 21.5], [46, 20.5]], 2, P, notWater);
  line([[124, 69], [150, 69], [158, 71]], 2, P, notWater);
  line([[140, 69], [146, 52], [154, 40], [160, 33], [161, 30]], 2, P, land);
  line([[146, 52], [142, 38]], 2, P, notWater);
  line([[150, 69], [152, 80]], 2, P, notWater);
  line([[64, 81], [48, 83], [36, 86], [22, 88]], 2, P, notWater);
  line([[173, 27], [182, 26], [190, 24], [200, 21]], 2, P, (t) => t !== TT.WATER && t !== TT.ICE && t !== TT.HILL);
  line([[166, 71], [176, 72], [186, 67], [197, 63]], 2, P, notWater);
  line([[25, 45], [24, 36], [22, 28], [21, 21]], 2, P, notWater);
  line([[176, 86], [181, 86]], 2, P, notWater);

  // --- Farm fields & the garden plot ---
  rect(15, 58, 10, 7, TT.FIELD);
  rect(4, 74, 10, 7, TT.FIELD);
  rect(29, 56, 8, 6, TT.FIELD);
  vrect(15, 21, 6, 4, TT.SOIL);

  // --- Piers & docks ---
  const pierTop = shoreY(OX + 46) - 2;
  rect(OX + 46, pierTop, 2, 66 + OZ - pierTop, TT.PLANK_H);
  rect(OX + 43, 64 + OZ, 8, 3, TT.PLANK_H);
  rect(159, 101, 2, 7, TT.PLANK_H);
  rect(162, 64, 2, 6, TT.PLANK_H);
  rect(181, 86, 49, 2, TT.PLANK_H);
  const noPier = new Set();
  for (let z = Math.floor(KOI_POND.z - KOI_POND.rz - 1); z <= Math.ceil(KOI_POND.z + KOI_POND.rz); z++) {
    for (const x of [KOI_POND.x - 1, KOI_POND.x]) if (get(x, z) === TT.WATER) { set(x, z, TT.PLANK_V); noPier.add(x + ',' + z); }
  }

  // ---------------- Objects ----------------
  const objects = [];
  const add = (type, x, y, extra = {}) => objects.push({ type, x, y, ...extra });
  const vadd = (type, x, y, extra = {}) => add(type, x + OX, y + OZ, extra);
  const occupied = new Set();
  const occ = (x, y) => occupied.has(y * W + x);
  const mark = (x, y, w = 1, h = 1) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) occupied.add((y + j) * W + x + i); };

  for (const b of BUILDINGS) mark(b.x - 1, b.y - 2, b.w + 2, b.h + 3);
  mark(OX + 44, OZ + 26, 8, 7);

  vadd('fountain', 47, 29);
  vadd('board', 43, 23.4);
  vadd('mailbox', 13.6, 23.6);
  vadd('crate', 8, 23.5, { id: 'shipping' });
  vadd('well', 36, 18);
  vadd('bench', 40, 34); vadd('bench', 53, 34);
  for (const [x, y] of [[39, 23], [55, 23], [39, 35], [55, 35], [44, 27.2], [50.5, 27.2], [14, 28], [26, 31], [35, 31], [62, 31], [48, 44], [48, 52], [21, 43], [67, 31], [50.3, 64.4], [43.7, 64.4]]) vadd('lamp', x, y);
  vadd('planter', 41, 25); vadd('planter', 53, 25); vadd('planter', 41, 33); vadd('planter', 53, 33);
  vadd('sign', 36, 28, { text: 'Market Plaza →' });
  vadd('sign', 48.6, 40, { text: '↓ Driftwood Beach' });
  vadd('sign', 48.6, 12, { text: '↑ Whisperwood · Waterfall Lake' });
  vadd('sign', 66, 28, { text: 'Sunpetal Meadow · Willow Lake →' });
  vadd('logs', 27.5, 15.4); vadd('logs', 19, 16.2);
  vadd('barrel', 34.4, 50.5); vadd('barrel', 29, 50.2); vadd('crate', 35.3, 51.1, {});
  vadd('boat', 38, 57.2); vadd('boat', 25, 58.5, { flip: true });
  vadd('easel', 79, 19);
  vadd('stones', 86, 22);
  vadd('bigtree', 89, 37);
  vadd('stall', 50, 38.2);
  vadd('driftwood', 20, 54.2); vadd('driftwood', 58, 55); vadd('driftwood', 64, 53.6);
  vadd('umbrella', 54, 54);
  vadd('bridge', 68.5, 28.5, { broken: true });
  vadd('buoy', 52, 67); vadd('buoy', 40, 69);
  for (let x = 14; x <= 21; x++) { if (x !== 17 && x !== 18) vadd('fence', x, 25.5); vadd('fence', x, 20.5); }
  for (let y = 21; y <= 25; y++) { vadd('fence', 14, y - 0.5, { v: true }); vadd('fence', 21, y - 0.5, { v: true }); }
  mark(OX + 14, OZ + 20, 8, 7);
  add('ferry', FERRY.village.x, FERRY.village.z, {});

  // ---- Honeydew Fields
  add('scarecrow', 20, 61.8);
  add('farmstand', 42.5, 72.0);
  add('beehive', 38, 58.5); add('beehive', 39.5, 59.5); add('beehive', 38.2, 60.8);
  add('haybale', 30.5, 51); add('haybale', 31.6, 52.2); add('haybale', 20, 52);
  add('sign', 43, 67.5, { text: '← Honeydew Fields · Pinewick Road' });
  add('sign', 4, 67.5, { text: '← Pinewick (the bus comes on Sundays!)' });
  add('lamp', 9.5, 70.5); add('lamp', 24, 70.5); add('lamp', 40, 70.5);
  for (const [x0, y0, w, h] of [[15, 58, 10, 7], [4, 74, 10, 7], [29, 56, 8, 6]]) {
    for (let x = x0; x < x0 + w; x++) { add('fence', x - 0.5, y0 - 0.5); if (x !== x0 + (w >> 1)) add('fence', x - 0.5, y0 + h - 0.5); }
    for (let y = y0; y < y0 + h; y++) { add('fence', x0 - 0.5, y - 0.5, { v: true }); add('fence', x0 + w - 0.5, y - 0.5, { v: true }); }
    mark(x0 - 1, y0 - 1, w + 2, h + 2);
    add('wheat', x0, y0, { w, h });
  }
  mark(9, 52, 8, 10);

  // ---- Whisperwood & the north
  add('tent', 70.5, 24.6); add('campfire', 73.5, 27.2); add('logseat', 72, 28.6); add('logseat', 75.2, 28.4);
  add('crate', 68.4, 26.6, {}); add('lantern', 76.5, 24.6);
  add('shrine', 46, 17.6);
  add('stonelantern', 44.2, 19.4); add('stonelantern', 47.8, 19.4);
  add('bigtree', 50.5, 21.5);
  add('waterfall', LAKE.x + 0.5, LAKE.z - LAKE.rz - 1);   // (the stream is tiles x-1…x+1: its middle is x + 0.5)
  add('rowboat', 106, 18.6); add('bench', 118.5, 22.5);
  add('sign', 91.5, 36.5, { text: '↑ Waterfall Lake · ← Camp' });
  add('lamp', 91, 42); add('lamp', 94.5, 30.5); add('lamp', 108.5, 22.2);
  for (const [x, y] of [[139, 32], [141.5, 36], [144, 33.5], [146, 35.5], [138.5, 35], [143, 30.8], [140.5, 38], [145.5, 31.5], [136.8, 33]]) add('glowcap', x, y);
  mark(56, 40, 100, 1);

  // ---- East: Willow Lake, lavender, Starfall Hill
  add('willow', WILLOW_LAKE.x - 11, WILLOW_LAKE.z - 3.5);
  add('gazebo', 172.5, 69.5);
  add('telescope', 162, 25.2); add('bench', 159.2, 26.8);
  add('lamp', 164.2, 27.4); add('blanket', 165.6, 24.2);
  for (const [x, y] of [[155.5, 23.5], [158, 21.2], [166.5, 21.8], [168.8, 26.4], [156.8, 28.6], [163.5, 29.4], [160.2, 22.6], [167.4, 29], [154.6, 26.4]]) add('starflower', x, y);
  for (const [x, y] of [[154, 21.5], [170.5, 23.6], [152.8, 27.8]]) add('pine', x, y);
  add('sign', 146.5, 50.5, { text: '↑ Starfall Hill · ↖ Glowcap Grove' });
  for (let row = 0; row < 4; row++) for (let x = 146; x < 176; x += 0.8) add('lavender', x + (row % 2) * 0.4, 81.2 + row * 2.3);
  mark(144, 79, 34, 10);
  add('lamp', 150.5, 71.5); add('lamp', 139, 70.5);

  // ---- Seagull Bluffs & the island
  add('sign', 36, 84.4, { text: 'Seagull Bluffs' });
  add('palm', 152, 111); add('palm', 166, 110); add('palm', 170, 116); add('palm', 154, 118); add('palm', 163, 119.5);
  add('grotto', 168.5, 113.4);
  add('lamp', 158.4, 107.6);

  // ---- Frostpine Ridge
  add('snowman', 205, 17.5); add('snowman', 223.5, 29.2, { scarf: 1 });
  add('sign', 191, 26.8, { text: 'Frostpine Ridge · the pond is frozen solid — have a slide!' });
  add('lamp', 199.5, 23.6); add('bench', 208.5, 18.8); add('icehole', FROST_POND.x + 4.4, FROST_POND.z + 0.9);
  mark(FROST_POND.x - 8, FROST_POND.z - 5, 17, 10);
  // ---- Blossom Glade
  add('torii', 190.5, 66.4);
  add('koibridge', KOI_POND.x, KOI_POND.z);
  for (const [x, y] of [[205.5, 58.6], [220.5, 58.8], [205.8, 66.8], [220.2, 66.6]]) add('stonelantern', x, y);
  add('bench', 204, 62.6); add('bench', 222.5, 63.2);
  add('sign', 186.5, 68.8, { text: 'Blossom Glade · please don’t feed the koi (they’re on a diet)' });
  mark(KOI_POND.x - 9, KOI_POND.z - 6, 19, 12);
  mark(188, 64, 5, 4);
  // ---- Reedmarsh
  for (const x of [188, 203, 218]) add('lantern', x, 85.4);
  add('sign', 179.5, 84.6, { text: 'Reedmarsh boardwalk · frogs have right of way' });
  add('willow', 196, 79.5); add('willow', 225, 80.6);
  {
    const rr = rng(777);
    for (let i = 0; i < 900 && objects.filter((o) => o.type === 'reeds').length < 150; i++) {
      const x = 182 + rr() * 54, y = 76 + rr() * 16;
      const tx = Math.floor(x), ty = Math.floor(y);
      if (get(tx, ty) !== TT.MARSH || occ(tx, ty)) continue;
      // reeds hug the water's edge
      if (!(get(tx + 1, ty) === TT.WATER || get(tx - 1, ty) === TT.WATER || get(tx, ty + 1) === TT.WATER || get(tx, ty - 1) === TT.WATER) && rr() > 0.25) continue;
      if (get(tx, ty + 1) === TT.PLANK_H || get(tx, ty - 1) === TT.PLANK_H) continue;
      add('reeds', x, y);
    }
    for (let i = 0; i < 600 && objects.filter((o) => o.type === 'lilypad').length < 70; i++) {
      const x = 180 + rr() * 58, y = 74 + rr() * 20;
      const tx = Math.floor(x), ty = Math.floor(y);
      if (get(tx, ty) !== TT.WATER || ty > 92) continue;
      if (get(tx, ty) === TT.WATER && (get(tx + 1, ty) === TT.PLANK_H || get(tx, ty + 1) === TT.PLANK_H || get(tx, ty - 1) === TT.PLANK_H)) continue;
      add('lilypad', x, y, { flower: rr() < 0.25 });
    }
  }
  mark(178, 85, 58, 4);
  // ---- Maple Hollow
  for (const [x, y] of [[17.5, 13.5], [24.5, 11.5], [20.8, 18.6], [14.6, 17.8], [27.4, 16.8], [20.2, 8.8]]) add('leafpile', x, y);
  add('hollowlog', 26.5, 20.6); add('bench', 16.5, 22.2); add('lamp', 23.4, 25.4);
  add('sign', 22.6, 28.4, { text: 'Maple Hollow · jump in the leaf piles!' });
  mark(12, 6, 20, 18);
  // ---- Honeydew sheep pasture (Mabel knits with Bram's wool)
  {
    const [x0, y0, w, h] = [13, 44, 7, 6];
    for (let x = x0; x < x0 + w; x++) { add('fence', x - 0.5, y0 - 0.5); if (x !== x0 + (w >> 1)) add('fence', x - 0.5, y0 + h - 0.5); }
    for (let y = y0; y < y0 + h; y++) { add('fence', x0 - 0.5, y - 0.5, { v: true }); add('fence', x0 + w - 0.5, y - 0.5, { v: true }); }
    mark(x0 - 1, y0 - 1, w + 2, h + 2);
  }

  // ---- trees for the newer biomes: dense at the edges, airy in the middle
  const fillBiome = (tile, E, pick, dMin, dMax, seed) => {
    for (let y = -1; y < H; y += 2) for (let x = -1; x < W; x += 2) {
      const jx = x + hash2(x, y, 3 + seed) * 1.6, jy = y + hash2(x, y, 4 + seed) * 1.6;
      const tx = Math.floor(jx), ty = Math.floor(jy);
      if (get(tx, ty) !== tile || occ(tx, ty)) continue;
      if (!clearOf(tx, Math.max(0, ty), 1, [TT.PATH, TT.WATER, TT.ICE, TT.PLANK_H, TT.PLANK_V])) continue;
      const nx = (jx - E.x) / E.rx, ny = (jy - E.z) / E.rz;
      const k = Math.min(1, nx * nx + ny * ny);
      if (hash2(tx, ty, 17 + seed) > dMin + (dMax - dMin) * k * k) continue;
      add(pick(tx, ty), jx + 0.5, jy + 1, { forest: true });
      mark(tx, ty);
    }
  };

  const village = [
    ['cherry', 7, 18], ['oak', 16, 18.5], ['cherry', 35, 22], ['oak', 36.5, 25.5], ['cherry', 57, 20],
    ['oak', 64, 22], ['apple', 59, 34], ['apple', 62, 36], ['apple', 65, 34], ['apple', 60, 38], ['apple', 64, 39],
    ['oak', 19, 34], ['cherry', 30, 34], ['oak', 38, 39], ['cherry', 55, 40], ['oak', 5, 33], ['oak', 8, 38],
    ['cherry', 14, 36], ['oak', 12, 43], ['pine', 4, 45], ['oak', 66, 44], ['cherry', 29, 20], ['oak', 44, 13.5],
    ['oak', 51, 11.5], ['cherry', 37, 45], ['palm', 22, 51], ['palm', 57, 51], ['palm', 12, 52], ['oak', 16, 47],
    ['cherry', 76, 16], ['oak', 84, 15], ['cherry', 91, 28], ['oak', 77, 40], ['cherry', 85, 44], ['oak', 92, 20],
  ];
  for (const [type, x, y] of village) { vadd(type, x, y); mark(Math.floor(x + OX), Math.floor(y + OZ)); }
  const extra = [
    ['apple', 36, 45], ['apple', 39, 47.5], ['apple', 36.5, 50.5], ['apple', 40.5, 51.5], ['oak', 4, 58], ['cherry', 17, 72.5],
    ['oak', 42, 80], ['pine', 3, 84], ['cherry', 149, 58], ['oak', 172, 62], ['cherry', 168, 72.5], ['oak', 129, 76],
    ['cherry', 170, 44], ['oak', 154, 46], ['cherry', 129, 57], ['pine', 173, 36], ['cherry', 44, 28], ['oak', 80, 36],
  ];
  for (const [type, x, y] of extra) { add(type, x, y); mark(Math.floor(x), Math.floor(y)); }

  const r = rng(1337);
  const clearOf = (x, y, rad, types) => {
    for (let j = -rad; j <= rad; j++) for (let i = -rad; i <= rad; i++) if (types.includes(get(x + i, y + j))) return false;
    return true;
  };
  for (let i = 0; i < 280; i++) {
    const x = r.int(3, W - 4), y = r.int(20, 92);
    const t = get(x, y);
    if ((t === TT.GRASS || t === TT.MEADOW) && !occ(x, y) && clearOf(x, y, 1, [TT.PATH, TT.PLAZA, TT.WATER, TT.SOIL, TT.SAND, TT.FIELD, TT.ROCK])) {
      add(r.chance(0.7) ? 'bush' : 'rock', x + 0.5, y + 0.5, { berries: r.chance(0.35) });
      mark(x - 1, y - 1, 3, 3);
    }
  }
  for (let i = 0; i < 50; i++) {
    const x = r.int(3, W - 4), y = r.int(84, H - 4);
    const t = get(x, y);
    if (t === TT.SAND && !occ(x, y) && clearOf(x, y, 1, [TT.PATH, TT.PLANK_H, TT.WATER])) { add('rock', x + 0.5, y + 0.5, { beach: true }); mark(x - 1, y - 1, 3, 3); }
    else if (t === TT.ROCK && !occ(x, y) && clearOf(x, y, 1, [TT.PATH, TT.WATER])) { add('rock', x + 0.5, y + 0.5, { grey: true }); mark(x - 1, y - 1, 3, 3); }
  }

  fillBiome(TT.SNOW, FROST, () => 'snowpine', 0.14, 0.95, 1);
  fillBiome(TT.LEAVES, MAPLE, () => 'maple', 0.1, 0.9, 2);
  fillBiome(TT.PETALS, BLOSSOM, () => 'cherry', 0.1, 0.55, 3);
  fillBiome(TT.MARSH, MARSH, (tx, ty) => (hash2(tx, ty, 9) < 0.7 ? 'oak' : 'pine'), 0.0, 0.18, 4);

  for (let y = -1; y < H; y += 2) {
    for (let x = -1; x < W; x += 2) {
      const jx = x + hash2(x, y, 3) * 1.6, jy = y + hash2(x, y, 4) * 1.6;
      const tx = Math.floor(jx), ty = Math.floor(jy);
      if (get(tx, ty) !== TT.FOREST && !(ty < 0 && get(tx, 0) === TT.FOREST)) continue;
      if (!clearOf(tx, Math.max(0, ty), 1, [TT.PATH, TT.WATER, TT.PLAZA, TT.SOIL, TT.ROCK])) continue;
      if (occ(tx, ty)) continue;
      const type = hash2(tx, ty, 9) < 0.45 ? 'pine' : 'oak';
      add(type, jx + 0.5, jy + 1, { forest: true });
      mark(tx, ty);
    }
  }

  return { w: W, h: H, ground: g, objects, buildings: BUILDINGS, noPier };
}

// Named points used by NPC schedules, quests & cutscenes (world tile coords)
const V = {
  arrive: [46.5, 64.5], pierEnd: [49.4, 65.8], pierMid: [46.5, 58], beach: [42, 54], homeDoor: [11.5, 23.5],
  garden: [17.5, 26.5], plaza: [47.5, 32.5], fountain: [47.5, 32], board: [43.5, 24.5], bakeryDoor: [42.5, 20.5],
  hallDoor: [52.5, 19.5], cafeDoor: [60.5, 26.5], storeDoor: [30.5, 27.5], libraryDoor: [25.5, 39.5], wrenDoor: [33.5, 39.5],
  shackDoor: [32.5, 51.5], carpenterDoor: [23.5, 16.5], bridgeW: [66.3, 30.4], bridgeE: [75, 29.5], easel: [79.2, 20.4],
  stones: [86.5, 25], bigtree: [89.5, 39.5], lighthouseDoor: [86.5, 53.5], pond: [13, 10], woods: [47.5, 7.5],
  orchard: [62, 37], stall: [50.5, 39.5], plazaN: [47, 26.6], fountainS: [47.2, 31.6], plazaE: [51.2, 30.2],
  plazaW: [43, 30.4], benchW: [40, 34.7], benchE: [53, 34.7], guitar: [50.2, 32.6], beachW: [40.5, 54.2],
  beachE: [58.5, 55.2], gardenS: [17.5, 26.5], sawing: [26.4, 17.2], riverbank: [66.2, 27.4], ferryDock: [50.4, 65.4],
};
export const POINTS = Object.fromEntries(Object.entries(V).map(([k, [x, z]]) => [k, [x + OX, z + OZ]]));
Object.assign(POINTS, {
  fields: [21, 66.4], barnYard: [26.5, 52.2], farmStand: [44.1, 72.1], farmPorch: [8.5, 67.4], windmillDoor: [12.5, 58.4],
  camp: [76.4, 26.2], campfire: [72.1, 28.75], tentDoor: [70.5, 26.6], shrine: [46, 20], lakeShore: [107.5, 22],
  grove: [141.5, 36.8], hilltop: [161, 28.4], willowBench: [152.5, 70.4], islandDock: [160, 108.8], islandBeach: [163, 116.5],
  bluffs: [20, 87.6], lavender: [156, 79.4], merchantSpot: [OX + 51.7, OZ + 38.7],
  frostpine: [200, 22.5], koiPond: [207, 63], boardwalk: [200, 86.6], mapleHollow: [21, 17], pasture: [16.5, 47],
});
