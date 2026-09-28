// Rooms of the wild lands (Adventure v4): the landmarks you can walk into —
// the Nomad Camp's yurts, the igloos of Frostpeak, the windmills of the Windy
// Heights, the Mother Cap, the stilt houses of Croakmire and the lagoon, the
// onsen, the old mine, the camps' tents and Dino Isle's research station. Laid out like the valley's rooms
// (INTERIORS, which they join), each with a bed to rest in and a chest.
// DOORS says where each landmark's door is (from its centre; they all face
// south) and which room it opens.

import { INTERIORS } from './interiors.js';

export const WILD_ROOMS = {
  w_yurt: {
    name: 'Nomad Yurt', w: 8, d: 7, door: 3, floor: 'planks', wall: 'honey', music: 'interior', wild: true, spots: {},
    items: [
      { type: 'fireplace', x: 4, z: 0.3 },
      { type: 'bed', x: 1.3, z: 2, color: '#c8454f' },
      { type: 'rug', x: 4, z: 4.3, color: '#d9a05a', rx: 2.1, rz: 1.2 }, { type: 'rug', x: 6.5, z: 2.4, color: '#8a64b8', rx: 0.9, rz: 0.7 },
      { type: 'stool', x: 2.4, z: 4.6 }, { type: 'stool', x: 5.7, z: 4.6 },
      { type: 'shelf', x: 6.8, z: 0.35, w: 1.3, kind: 'jars' }, { type: 'lanternhook', x: 1.6, z: 0.15, y: 2.0 },
      { type: 'crate', x: 7.3, z: 6.1, fill: '#e8c46a' }, { type: 'barrel', x: 0.6, z: 6.0, fill: '#f4efe4' },
      { type: 'chest', x: 7.2, z: 4.2, id: 'w_chest' }, { type: 'plant', x: 0.6, z: 4.0, color: '#b8a040' },
    ],
  },
  w_igloo: {
    name: 'Snug Igloo', w: 7, d: 6, door: 3, floor: 'stone', wall: 'boards', music: 'interior', wild: true, spots: {},
    items: [
      { type: 'bed', x: 1.3, z: 1.9, color: '#e8eef8' },
      { type: 'rug', x: 3.6, z: 3.4, color: '#f4f8ff', rx: 1.7, rz: 1.1 },
      { type: 'lanternset', x: 3.5, z: 0.4 }, { type: 'stool', x: 4.6, z: 3.2 },
      { type: 'crate', x: 6.2, z: 5.2, fill: '#9fdcff' }, { type: 'barrel', x: 6.3, z: 1.0, fill: '#dff4ff' },
      { type: 'chest', x: 5.9, z: 2.9, id: 'w_chest' }, { type: 'shelf', x: 1.4, z: 5.4, w: 1.0, kind: 'bottles' },
    ],
  },
  w_mill: {
    name: 'Heights Windmill', w: 7, d: 7, door: 3, floor: 'stone', wall: 'stone', music: 'interior', wild: true, spots: {},
    items: [
      { type: 'millstone', x: 3.5, z: 3.0 }, { type: 'gear', x: 3.5, z: 0.12, y: 0 },
      { type: 'sacks', x: 0.7, z: 1.2 }, { type: 'sacks', x: 6.3, z: 5.8 }, { type: 'barrel', x: 6.4, z: 1.0, fill: '#f4efe4' },
      { type: 'stairs', x: 6.3, z: 3.2 }, { type: 'window', x: 1.3, z: 0.1, y: 1.45, curtain: '#e8c46a' }, { type: 'lanternhook', x: 5.6, z: 0.15, y: 2.0 },
      { type: 'bed', x: 0.9, z: 4.2, color: '#e8c46a' }, { type: 'chest', x: 2.2, z: 5.9, id: 'w_chest' },
    ],
  },
  w_mush: {
    name: 'The Mother Cap', w: 8, d: 7, door: 3, floor: 'moss', wall: 'rose', music: 'interior', wild: true, spots: {},
    items: [
      { type: 'bed', x: 1.3, z: 2, color: '#b88cf0' },
      { type: 'table', x: 5.8, z: 3.4, cloth: '#f7e3ef' }, { type: 'chair', x: 5.8, z: 4.2, rot: Math.PI },
      { type: 'crystal', x: 7.3, z: 0.9, color: '#b9a2e3' }, { type: 'crystal', x: 0.7, z: 5.6, color: '#8fd6b4' },
      { type: 'plant', x: 3.2, z: 0.6, color: '#b88cf0' }, { type: 'plant', x: 7.4, z: 5.9, color: '#e97d8f' },
      { type: 'shelf', x: 4.9, z: 0.35, w: 1.4, kind: 'books' }, { type: 'lamp', x: 2.6, z: 1.2 },
      { type: 'rug', x: 3.6, z: 4.6, color: '#e97d8f', rx: 1.4, rz: 0.9 }, { type: 'chest', x: 7.2, z: 2.2, id: 'w_chest' },
    ],
  },
  w_stilt: {
    name: 'Stilt House', w: 8, d: 6, door: 3, floor: 'planks', wall: 'sea', music: 'interior', wild: true, spots: {},
    items: [
      { type: 'hammock', x: 1.6, z: 1.3 }, { type: 'bed', x: 6.9, z: 2.0, color: '#3f9b98' },
      { type: 'window', x: 3.4, z: 0.1, y: 1.45, curtain: '#3f9b98' }, { type: 'map', x: 5.2, z: 0.1, y: 1.6 },
      { type: 'table', x: 4.2, z: 3.2 }, { type: 'chair', x: 4.2, z: 4.0, rot: Math.PI }, { type: 'candles', x: 4.5, z: 3.2 },
      { type: 'shelf', x: 0.9, z: 4.2, w: 1.0, kind: 'bottles' }, { type: 'anchor', x: 0.6, z: 5.3 },
      { type: 'barrel', x: 7.4, z: 5.2, fill: '#7cb6e0' }, { type: 'chest', x: 6.1, z: 5.1, id: 'w_chest' },
    ],
  },
  w_onsen: {
    name: 'Hot Spring Bathhouse', w: 9, d: 7, door: 4, floor: 'stone', wall: 'honey', music: 'interior', wild: true, spots: {},
    items: [
      { type: 'puddle', x: 4.5, z: 2.6, rx: 2.4, rz: 1.3 }, { type: 'rocks', x: 2.0, z: 2.0 }, { type: 'rocks', x: 7.0, z: 2.8 },
      { type: 'lanternset', x: 1.0, z: 0.5 }, { type: 'lanternset', x: 8.0, z: 0.5 },
      { type: 'stool', x: 2.2, z: 5.0 }, { type: 'stool', x: 6.8, z: 5.0 }, { type: 'plant', x: 0.6, z: 5.9, color: '#4f955a' },
      { type: 'bed', x: 8.1, z: 4.9, color: '#f4efe4' }, { type: 'chest', x: 0.8, z: 3.9, id: 'w_chest' },
    ],
  },
  w_mine: {
    name: 'The Old Mine', w: 10, d: 7, door: 4, floor: 'cave', wall: 'cave', music: 'night', dark: true, wild: true, spots: {},
    items: [
      { type: 'crystal', x: 1.0, z: 1.0 }, { type: 'crystal', x: 9.1, z: 1.4, color: '#ffb040' }, { type: 'crystal', x: 5.2, z: 0.8, color: '#8fd6b4' },
      { type: 'rocks', x: 0.8, z: 4.6 }, { type: 'rocks', x: 9.2, z: 4.4 }, { type: 'rocks', x: 3.6, z: 0.8 },
      { type: 'lumber', x: 7.2, z: 5.6 }, { type: 'crate', x: 2.0, z: 5.8, fill: '#8a858e' }, { type: 'lanternhook', x: 6.6, z: 0.15, y: 2.0 },
      { type: 'workbench', x: 7.0, z: 1.4 }, { type: 'bed', x: 1.3, z: 2.6, color: '#8e5d3e' }, { type: 'chest', x: 4.7, z: 3.4, id: 'w_chest' },
    ],
  },
  w_station: {
    name: 'Dino Station', w: 9, d: 7, door: 4, floor: 'planks', wall: 'honey', music: 'interior', wild: true, spots: {},
    items: [
      { type: 'map', x: 2.2, z: 0.1, y: 1.6 }, { type: 'board', x: 5.0, z: 0.12, y: 1.5 },
      { type: 'desk', x: 6.9, z: 0.8 }, { type: 'radio', x: 7.3, z: 0.7, y: 0.78 }, { type: 'globe', x: 6.4, z: 0.7, y: 0.78 },
      { type: 'shelf', x: 0.8, z: 0.35, w: 1.2, kind: 'jars' }, { type: 'shelf', x: 3.6, z: 0.35, w: 1.1, kind: 'books' },
      { type: 'terrarium', x: 8.3, z: 2.4 }, { type: 'hometelescope', x: 8.2, z: 5.6 },
      { type: 'hammock', x: 1.6, z: 3.2 }, { type: 'bed', x: 0.9, z: 5.3, color: '#4f9a5a' },
      { type: 'rug', x: 4.6, z: 4.2, color: '#d9a05a', rx: 1.8, rz: 1.1 },
      { type: 'crate', x: 3.1, z: 6.2, fill: '#f4ead4' }, { type: 'crate', x: 6.2, z: 6.2, fill: '#cfeede' },
      { type: 'plant', x: 8.4, z: 4.0, color: '#4f9a3c' }, { type: 'lanternhook', x: 4.6, z: 0.15, y: 2.0 },
      { type: 'chest', x: 7.4, z: 3.6, id: 'w_chest' },
    ],
  },
  w_tent: {
    name: 'Camp Tent', w: 6, d: 5, door: 2, floor: 'hay', wall: 'honey', music: 'interior', wild: true, spots: {},
    items: [
      { type: 'bed', x: 1.2, z: 1.9, color: '#4f955a' }, { type: 'lanternset', x: 3.1, z: 0.45 },
      { type: 'crate', x: 5.2, z: 1.0, fill: '#e8c46a' }, { type: 'map', x: 4.2, z: 0.1, y: 1.5 },
      { type: 'chest', x: 5.0, z: 3.6, id: 'w_chest' },
    ],
  },
};
Object.assign(INTERIORS, WILD_ROOMS);

// landmark kind → its room, and where to stand to walk in (from its centre)
export const DOORS = {
  yurt: { room: 'w_yurt', dx: 0, dz: 1.75 },
  igloo: { room: 'w_igloo', dx: 0, dz: 2.05 },
  windmill: { room: 'w_mill', dx: 0, dz: 1.75 },
  mother_cap: { room: 'w_mush', dx: 0, dz: 1.8 },
  stilt_house: { room: 'w_stilt', dx: 0, dz: 0.45 },
  stilt_hut: { room: 'w_stilt', dx: 0, dz: 0.5 },
  onsen: { room: 'w_onsen', dx: -1.5, dz: -0.05 },
  mine_entrance: { room: 'w_mine', dx: 0, dz: 0.8 },           // (the canyon's cliff face is right behind)
  camp: { room: 'w_tent', dx: -0.95, dz: 0.72 },               // (clear of the crate)
  dino_station: { room: 'w_station', dx: 0, dz: 0.95 },          // (on the deck, before the door)
};

// every door out in the big world: { x, z, room } (x, z: where you stand to go in)
export function wildDoors(pois) {
  const out = [];
  for (const p of pois || []) {
    const D = DOORS[p.kind];
    if (D) out.push({ x: p.x + D.dx, z: p.z + D.dz, room: D.room, kind: p.kind });
  }
  return out;
}
