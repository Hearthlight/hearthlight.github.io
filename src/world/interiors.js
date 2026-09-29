// Interior rooms: layout data + 3D builder.
// Room coords are tiles with (0,0) at the back-left of the floor; the back
// wall stands at z=0 facing south, and the door gap is in the (cut-away) front.

import { THREE, pixelTexture, toon } from '../render/r3d.js';
import { Painter, wallFill } from '../art/surfaces.js';
import { buildFurniture } from '../models/furniture.js';
import { ramp, mix as mixc } from '../engine/color.js';
import { rng, hash2 } from '../engine/util.js';

export const WALL_H = 2.4;

export const INTERIORS = {
  home: {
    name: 'Nana’s Cottage', w: 9, d: 7, door: 4, floor: 'wood', wall: 'cream', music: 'interior',
    spots: { bed: [1.5, 2.2], door: [4.5, 6.2], table: [6.5, 4.4] },
    items: [
      { type: 'bed', x: 1.5, z: 2, color: '#d06b8e' },
      { type: 'fireplace', x: 4.5, z: 0.3 },
      { type: 'window', x: 2.3, z: 0.1, y: 1.45, curtain: '#f4a4b6' },
      { type: 'window', x: 6.8, z: 0.1, y: 1.45, curtain: '#f4a4b6' },
      { type: 'clock', x: 3.1, z: 0.12, y: 1.9 },
      { type: 'table', x: 6.5, z: 3.6, cloth: '#fbf1dc' },
      { type: 'chair', x: 5.6, z: 3.6, rot: Math.PI / 2 },
      { type: 'chair', x: 7.4, z: 3.6, rot: -Math.PI / 2 },
      { type: 'note', x: 6.5, z: 3.6, id: 'nana_note' },
      { type: 'rug', x: 4.3, z: 4.6, color: '#d9a05a' },
      { type: 'dresser', x: 8.35, z: 2.5, rw: true },
      { type: 'shelf', x: 0.9, z: 4.8, w: 1.2, kind: 'books' },
      { type: 'plant', x: 8.4, z: 5.9, rw: true },
      { type: 'stove', x: 7.9, z: 0.45 },
      { type: 'wallshelf', x: 0.85, z: 0.05, y: 1.5, w: 0.9, kind: 'plates' }, { type: 'frames', x: 5.8, z: 0.05, y: 1.75 },
      { type: 'teaset', x: 6.8, z: 3.4, y: 0.66 }, { type: 'bookstack', x: 0.45, z: 6.1, n: 3 }, { type: 'basket', x: 8.45, z: 4.4, kind: 'yarn', rw: true },
    ],
  },
  bakery: {
    name: 'Rosa’s Bakery', w: 9, d: 7, door: 4, floor: 'check', wall: 'bakery', music: 'shop',
    spots: { counter: [4.5, 1.7], home: [1.5, 1.8], lunch: [7, 5.4], customer: [4.5, 3.4] },
    items: [
      { type: 'stove', x: 1.2, z: 0.45 }, { type: 'stove', x: 2.3, z: 0.45 },
      { type: 'window', x: 3.7, z: 0.1, y: 1.45, curtain: '#e97d8f' },
      { type: 'shelf', x: 5.6, z: 0.35, w: 1.8, kind: 'bread' }, { type: 'shelf', x: 7.8, z: 0.35, w: 1.5, kind: 'jars' },
      { type: 'counter', x: 4.6, z: 2.6, w: 4.4, color: '#d9a05a', register: true, items: [[0.4, '#d9a05a', 0.12], [0.9, '#f0c887', 0.1], [1.4, '#e0463f', 0.12]] },
      { type: 'table', x: 1.8, z: 5.2, cloth: '#f4a4b6' }, { type: 'chair', x: 1.8, z: 4.4 },
      { type: 'table', x: 7.3, z: 5.2, cloth: '#f4a4b6' }, { type: 'chair', x: 7.3, z: 4.4 },
      { type: 'plant', x: 0.5, z: 3.3 }, { type: 'painting', x: 7.7, z: 0.12, y: 2.0, w: 0.8, kind: 'meadow' },
      { type: 'pans', x: 1.75, z: 0.05, y: 1.75, w: 1.3 }, { type: 'basket', x: 7.45, z: 2.75, kind: 'bread' }, { type: 'chalkboard', x: 8.5, z: 3.3, rot: -0.4 },
      { type: 'sacks', x: 0.55, z: 6.2 },
    ],
  },
  store: {
    name: 'Petal & Seed', w: 9, d: 7, door: 4, floor: 'wood', wall: 'mint', music: 'shop',
    spots: { counter: [4.2, 1.7], home: [7.5, 1.6], customer: [4.2, 3.4] },
    items: [
      { type: 'shelf', x: 1.3, z: 0.35, w: 2, kind: 'seeds' }, { type: 'shelf', x: 7.6, z: 0.35, w: 2, kind: 'seeds' },
      { type: 'window', x: 4.4, z: 0.1, y: 1.45, curtain: '#8fd6b4' },
      { type: 'counter', x: 4.2, z: 2.6, w: 3.6, color: '#8fae83', register: true, items: [[1.1, '#f4a4b6', 0.2], [0.6, '#ffd66b', 0.18]] },
      { type: 'crate', x: 7.3, z: 3.4, fill: '#f4a4b6' }, { type: 'crate', x: 8.2, z: 3.4, fill: '#ffd66b' },
      { type: 'plant', x: 0.5, z: 5.8, color: '#4f955a' }, { type: 'plant', x: 8.5, z: 5.8 }, { type: 'plant', x: 0.5, z: 2.6, color: '#7fbf5a' },
      { type: 'vase', x: 6.1, z: 2.6 },
      { type: 'herbs', x: 5.85, z: 0.05, y: 1.95, w: 1.2 }, { type: 'basket', x: 7.7, z: 5.6, kind: 'veg' }, { type: 'wallshelf', x: 5.85, z: 0.05, y: 1.2, w: 1.1, kind: 'pots' },
    ],
  },
  cafe: {
    name: 'The Driftwood Café', w: 10, d: 7, door: 4, floor: 'dark', wall: 'honey', music: 'interior',
    spots: { counter: [3.5, 1.5], home: [8.5, 1.8], customer: [3.5, 3.3], seatA: [7, 2.8], seatB: [7.9, 5.4], seatC: [2.2, 5.4] },
    items: [
      { type: 'coffee', x: 1.3, z: 0.5 }, { type: 'shelf', x: 3.4, z: 0.35, w: 2, kind: 'cups' },
      { type: 'window', x: 6.2, z: 0.1, y: 1.45, curtain: '#8a64b8' }, { type: 'window', x: 8.6, z: 0.1, y: 1.45, curtain: '#8a64b8' },
      { type: 'counter', x: 3.4, z: 2.4, w: 3.6, color: '#8e5d3e', register: true, items: [[0.9, '#f4efe4', 0.12], [1.3, '#f4efe4', 0.12]] },
      { type: 'table', x: 7, z: 2 }, { type: 'chair', x: 7.9, z: 2, rot: -Math.PI / 2 }, { type: 'chair', x: 6.1, z: 2, rot: Math.PI / 2 },
      { type: 'table', x: 7.9, z: 4.6 }, { type: 'chair', x: 7.9, z: 5.4, rot: Math.PI },
      { type: 'table', x: 2.2, z: 4.6 }, { type: 'chair', x: 2.2, z: 5.4, rot: Math.PI },
      { type: 'rug', x: 5, z: 4.6, color: '#8a64b8', rx: 1.4, rz: 0.9 },
      { type: 'plant', x: 9.5, z: 3.4 }, { type: 'lamp', x: 9.5, z: 6.2 }, { type: 'strings', x: 5.1, z: 0.15, y: 2.2 },
      { type: 'frames', x: 7.4, z: 0.05, y: 1.75, coat: '#8a64b8' }, { type: 'chalkboard', x: 6.4, z: 6.3, rot: 0.3 }, { type: 'teaset', x: 7.1, z: 1.95, y: 0.66, color: '#fbf1dc', accent: '#8a64b8' },
    ],
  },
  hall: {
    name: 'Town Hall', w: 11, d: 7, door: 5, floor: 'stone', wall: 'hall', music: 'interior',
    spots: { desk: [5.5, 1.1], home: [2.5, 2.2], customer: [5.5, 3.2] },
    items: [
      { type: 'desk', x: 5.5, z: 2.1, w: 2, lamp: true },
      { type: 'flag', x: 3.4, z: 0.5, color: '#e8883a' }, { type: 'flag', x: 7.6, z: 0.5, color: '#4f6aa3' },
      { type: 'map', x: 5.5, z: 0.1, y: 1.6 },
      { type: 'shelf', x: 1.1, z: 0.35, w: 1.6, kind: 'books' },
      { type: 'board', x: 9.6, z: 0.12, y: 1.45, id: 'fundboard' },
      { type: 'sofa', x: 2.2, z: 4.8, color: '#4f6aa3' }, { type: 'plant', x: 0.5, z: 6.3 }, { type: 'plant', x: 10.5, z: 6.3 },
      { type: 'rug', x: 5.5, z: 4.8, color: '#c8454f', round: false }, { type: 'globe', x: 9.8, z: 4.6 },
      { type: 'frames', x: 2.6, z: 0.05, y: 1.7, coat: '#4f6aa3' }, { type: 'bookstack', x: 6.3, z: 2.0, y: 0.8, n: 2, seed: 2 },
    ],
  },
  library: {
    name: 'Seashell Library', w: 11, d: 8, door: 5, floor: 'wood', wall: 'library', music: 'interior',
    spots: { desk: [5.5, 2.1], home: [9.5, 6.3], customer: [5.5, 4.1] },
    items: [
      { type: 'shelf', x: 1.2, z: 0.35, w: 2, kind: 'books' }, { type: 'shelf', x: 3.4, z: 0.35, w: 2, kind: 'books' },
      { type: 'window', x: 5.5, z: 0.1, y: 1.45, curtain: '#3f7f7c' },
      { type: 'shelf', x: 7.6, z: 0.35, w: 2, kind: 'books' }, { type: 'shelf', x: 9.8, z: 0.35, w: 2, kind: 'books' },
      { type: 'desk', x: 5.5, z: 3.1, w: 2, lamp: true },
      { type: 'longtable', x: 2.2, z: 5.6, w: 2.2, items: [[-0.5, 0, '#c8454f'], [0.4, 0.1, '#4e73b6']] },
      { type: 'chair', x: 1.6, z: 6.5, rot: Math.PI }, { type: 'chair', x: 2.8, z: 6.5, rot: Math.PI },
      { type: 'armchair', x: 9.1, z: 5.1, color: '#3f9b98' }, { type: 'lamp', x: 10.2, z: 5.1 },
      { type: 'globe', x: 8.2, z: 3.2 }, { type: 'rug', x: 5.5, z: 5.8, color: '#3f7f7c' },
      { type: 'plant', x: 0.5, z: 3.2 }, { type: 'shelf', x: 0.7, z: 7.2, w: 1, kind: 'books' },
      { type: 'bookstack', x: 3.7, z: 6.5, n: 4 }, { type: 'bookstack', x: 8.2, z: 6.6, n: 3, seed: 3 }, { type: 'teaset', x: 4.9, z: 3.0, y: 0.8, color: '#dcecf7', accent: '#3f7f7c' },
    ],
  },
  carpenter: {
    name: 'Theo’s Workshop', w: 10, d: 7, door: 4, floor: 'planks', wall: 'logs', music: 'shop',
    spots: { counter: [4.5, 2.1], home: [8.5, 1.8], customer: [4.5, 4.1] },
    items: [
      { type: 'workbench', x: 1.6, z: 0.8 }, { type: 'shelf', x: 4.4, z: 0.35, w: 2, kind: 'tools' },
      { type: 'lumber', x: 8.2, z: 0.7 },
      { type: 'counter', x: 4.5, z: 3.0, w: 3, color: '#b07b50', register: true },
      { type: 'chair', x: 7.5, z: 4.4 }, { type: 'table', x: 8.5, z: 4.4 }, { type: 'dresser', x: 8.9, z: 2.6 },
      { type: 'barrel', x: 0.6, z: 3.2 }, { type: 'barrel', x: 0.6, z: 4.2, fill: '#b07b50' }, { type: 'plant', x: 9.5, z: 6.2 },
      { type: 'shavings', x: 1.7, z: 1.75, w: 1.8, d: 0.9 }, { type: 'shavings', x: 7.7, z: 1.5, w: 1.0, d: 0.6 }, { type: 'pegs', x: 6.35, z: 0.05, y: 1.6, kind: 'tools' },
    ],
  },
  shack: {
    name: 'Finn’s Boathouse', w: 8, d: 6, door: 3, floor: 'planks', wall: 'boards', music: 'interior',
    spots: { counter: [3.5, 1.5], home: [6.5, 3.2], customer: [3.5, 3.4] },
    items: [
      { type: 'counter', x: 3.5, z: 2.4, w: 3, color: '#7a8fa8', register: true },
      { type: 'shelf', x: 1.1, z: 0.35, w: 1.6, kind: 'fish' },
      { type: 'window', x: 3.6, z: 0.1, y: 1.45, curtain: '#4e73b6' },
      { type: 'bed', x: 6.9, z: 1.2, color: '#4e73b6' },
      { type: 'barrel', x: 0.6, z: 3.4, fill: '#7cb6e0' }, { type: 'barrel', x: 0.6, z: 4.4 },
      { type: 'crate', x: 7.3, z: 4.6, fill: '#7cb6e0' }, { type: 'tank', x: 5.4, z: 0.5 },
      { type: 'nets', x: 5.3, z: 0.05, y: 1.95 }, { type: 'oars', x: 6.9, z: 0.05, y: 1.55 }, { type: 'basket', x: 1.5, z: 4.9, kind: 'apples' },
    ],
  },
  wren: {
    name: 'Wren’s Cottage', w: 7, d: 6, door: 3, floor: 'wood', wall: 'rose', music: 'interior',
    spots: { paint: [2.3, 2.5], home: [4.6, 3.3] },
    items: [
      { type: 'easel', x: 1.4, z: 1.5 }, { type: 'easel', x: 3.1, z: 1.2 },
      { type: 'painting', x: 4.6, z: 0.12, y: 1.6, kind: 'meadow' }, { type: 'painting', x: 5.8, z: 0.12, y: 1.9, w: 0.7 },
      { type: 'bed', x: 6.1, z: 2.2, color: '#b9a2e3' }, { type: 'rug', x: 3.5, z: 4.2, color: '#f4a4b6' },
      { type: 'plant', x: 0.5, z: 5.2 }, { type: 'candles', x: 5.6, z: 4.8 }, { type: 'vase', x: 0.5, z: 3.4 },
      { type: 'frames', x: 2.25, z: 0.05, y: 1.85, coat: '#b9a2e3' }, { type: 'basket', x: 6.45, z: 4.0, kind: 'yarn' },
    ],
  },
  lighthouse: {
    name: 'Old Glimmer', w: 7, d: 7, door: 3, floor: 'stone', wall: 'stone', music: 'night',
    spots: { lens: [3.5, 4.6] },
    items: [
      { type: 'rug', x: 3.5, z: 3.0, color: '#3f6f9e', rx: 1.9, rz: 1.5 },
      { type: 'lens', x: 3.5, z: 2.6 },
      { type: 'window', x: 1.3, z: 0.1, y: 1.45, curtain: '#4f6aa3' }, { type: 'window', x: 5.7, z: 0.1, y: 1.45, curtain: '#4f6aa3' },
      { type: 'painting', x: 3.5, z: 0.12, y: 1.9, w: 0.9, kind: 'portrait' },
      { type: 'stairs', x: 0.6, z: 5.2 }, { type: 'barrel', x: 6.4, z: 5.4 }, { type: 'crate', x: 6.3, z: 1.2 },
      { type: 'candles', x: 6.4, z: 3.4 }, { type: 'candles', x: 0.6, z: 2.2 }, { type: 'globe', x: 0.7, z: 3.4 },
    ],
  },
  farmhouse: {
    name: 'Honeydew Farmhouse', w: 9, d: 7, door: 4, floor: 'planks', wall: 'farm', music: 'interior',
    spots: { table: [4.5, 4.9], home: [7.3, 3.1], counter: [2.4, 2.0] },
    items: [
      { type: 'bed', x: 7.6, z: 1.6, color: '#c8454f' },
      { type: 'fireplace', x: 4.6, z: 0.3 },
      { type: 'window', x: 2.4, z: 0.1, y: 1.45, curtain: '#e8c46a' }, { type: 'window', x: 6.4, z: 0.1, y: 1.45, curtain: '#e8c46a' },
      { type: 'stove', x: 0.7, z: 0.45 }, { type: 'shelf', x: 1.9, z: 0.35, w: 1.2, kind: 'jars' },
      { type: 'table', x: 4.5, z: 4, cloth: '#f4a4b6' }, { type: 'chair', x: 3.6, z: 4, rot: Math.PI / 2 }, { type: 'chair', x: 5.4, z: 4, rot: -Math.PI / 2 },
      { type: 'rug', x: 4.5, z: 2.6, color: '#c8454f', rx: 1.1, rz: 0.7 },
      { type: 'crate', x: 0.6, z: 5.6, fill: '#f1e2c8' }, { type: 'barrel', x: 0.6, z: 3.2, fill: '#f4f1ec' }, { type: 'sacks', x: 0.7, z: 4.4 },
      { type: 'plant', x: 8.5, z: 5.9 }, { type: 'dresser', x: 8.4, z: 3.6 }, { type: 'clock', x: 3.3, z: 0.12, y: 1.9 },
      { type: 'painting', x: 7.2, z: 0.12, y: 1.9, w: 0.7, kind: 'meadow' },
      { type: 'pans', x: 0.7, z: 0.05, y: 1.75, w: 1.0 }, { type: 'pegs', x: 8.45, z: 0.05, y: 1.55, w: 1.0, coat: '#c8454f', scarf: '#f2c14e' },
      { type: 'basket', x: 1.65, z: 6.0, kind: 'veg' }, { type: 'teaset', x: 4.75, z: 3.85, y: 0.66, color: '#fbf1dc', accent: '#c8454f' },
    ],
  },
  barn: {
    name: 'The Big Red Barn', w: 11, d: 8, door: 5, floor: 'hay', wall: 'barn', music: 'interior',
    spots: { feed: [3.5, 5.2], home: [5.5, 4] },
    items: [
      { type: 'cow', x: 2.0, z: 1.7, color: '#f4efe4', seed: 3 }, { type: 'cow', x: 8.9, z: 1.7, color: '#e9d3b0', seed: 9, rot: Math.PI },
      { type: 'stallfence', x: 3.6, z: 1.6, len: 2.4 }, { type: 'stallfence', x: 7.4, z: 1.6, len: 2.4 },
      { type: 'trough', x: 2.0, z: 3.3 }, { type: 'trough', x: 8.9, z: 3.3 },
      { type: 'haypile', x: 5.5, z: 0.9, w: 2.4 }, { type: 'haypile', x: 10.2, z: 5.6, w: 1.2 },
      { type: 'nest', x: 8.4, z: 6.8 },
      { type: 'chicken', x: 4.3, z: 5.6, rot: 0.4 }, { type: 'chicken', x: 6.6, z: 4.9, rot: 2.6, color: '#b8763a' }, { type: 'chicken', x: 7.4, z: 6.2, rot: 1.2 }, { type: 'chicken', x: 3.3, z: 4.6, rot: -0.8, color: '#e0924a' },
      { type: 'lanternhook', x: 5.5, z: 0.15, y: 2.0 }, { type: 'barrel', x: 0.6, z: 6.8 }, { type: 'crate', x: 1.5, z: 7.1, fill: '#e0bf62' },
      { type: 'window', x: 9.8, z: 0.1, y: 1.45, curtain: '#c8454f' }, { type: 'window', x: 1.2, z: 0.1, y: 1.45, curtain: '#c8454f' },
      { type: 'pegs', x: 3.1, z: 0.05, y: 1.7, kind: 'tools' },
    ],
  },
  windmill: {
    name: 'The Old Windmill', w: 7, d: 7, door: 3, floor: 'stone', wall: 'stone', music: 'interior',
    spots: { home: [4.8, 4.8], mill: [2.2, 3.8] },
    items: [
      { type: 'millstone', x: 3.5, z: 3.0 },
      { type: 'gear', x: 3.5, z: 0.12, y: 0 },
      { type: 'sacks', x: 0.7, z: 1.2 }, { type: 'sacks', x: 6.3, z: 5.8 }, { type: 'barrel', x: 6.4, z: 1.0, fill: '#f4efe4' },
      { type: 'crate', x: 0.6, z: 5.8, fill: '#e8c46a' }, { type: 'stairs', x: 6.3, z: 3.2 },
      { type: 'window', x: 1.3, z: 0.1, y: 1.45, curtain: '#e8c46a' }, { type: 'lanternhook', x: 5.6, z: 0.15, y: 2.0 },
    ],
  },
  marlo: {
    name: 'Marlo’s Hut', w: 8, d: 6, door: 3, floor: 'planks', wall: 'sea', music: 'interior',
    spots: { table: [5.2, 3.6], home: [1.6, 2.5] },
    items: [
      { type: 'hammock', x: 1.6, z: 1.3 },
      { type: 'wheel', x: 4.3, z: 0.14, y: 1.55 }, { type: 'map', x: 6.5, z: 0.1, y: 1.6 },
      { type: 'window', x: 2.9, z: 0.1, y: 1.45, curtain: '#3f9b98' },
      { type: 'table', x: 5.2, z: 2.8 }, { type: 'chair', x: 5.2, z: 3.6, rot: Math.PI },
      { type: 'shelf', x: 7.4, z: 2.4, w: 1.1, kind: 'bottles' }, { type: 'globe', x: 7.3, z: 4.6 },
      { type: 'anchor', x: 0.6, z: 4.6 }, { type: 'barrel', x: 0.6, z: 5.4, fill: '#7cb6e0' }, { type: 'candles', x: 5.6, z: 2.8 },
      { type: 'rug', x: 3.8, z: 4.2, color: '#3f6f9e', rx: 1.2, rz: 0.8 }, { type: 'tank', x: 6.6, z: 0.5 },
      { type: 'nets', x: 1.25, z: 0.05, y: 2.0 }, { type: 'bookstack', x: 4.55, z: 2.75, y: 0.66, n: 2, seed: 1 },
    ],
  },
  grotto: {
    name: 'Sea Grotto', w: 11, d: 8, door: 5, floor: 'cave', wall: 'cave', music: 'night', dark: true,
    exitTo: { x: 168.5, z: 115.2 },
    spots: {},
    items: [
      { type: 'chest', x: 8.4, z: 1.5, id: 'treasure' },
      { type: 'crystal', x: 1.0, z: 1.0 }, { type: 'crystal', x: 10.1, z: 4.2, color: '#b9a2e3' }, { type: 'crystal', x: 3.6, z: 0.8, color: '#8fd6b4' },
      { type: 'crystal', x: 0.9, z: 6.4, color: '#b9a2e3' }, { type: 'crystal', x: 6.2, z: 0.7 },
      { type: 'puddle', x: 4.2, z: 3.9, rx: 2.0, rz: 1.1 }, { type: 'puddle', x: 8.8, z: 6.2, rx: 1.0, rz: 0.6 }, { type: 'puddle', x: 1.8, z: 3.4, rx: 0.7, rz: 0.45 },
      { type: 'rocks', x: 0.8, z: 4.6 }, { type: 'rocks', x: 10.2, z: 1.1 }, { type: 'rocks', x: 5.0, z: 0.8 }, { type: 'rocks', x: 10.3, z: 6.9 }, { type: 'rocks', x: 2.4, z: 7.1 },
    ],
  },
};

// --- Nana's cottage grows as you expand it (Theo builds overnight) ------------
const HOME_BASE = { ...INTERIORS.home, items: INTERIORS.home.items.slice() };
export const HOME_LEVELS = {
  1: { w: 9, d: 7, door: 4, name: 'Nana’s Cottage', extra: [] },
  2: {
    w: 12, d: 8, door: 4, name: 'Your Cottage', cost: 2000, wood: 25, blurb: 'a sunny reading nook and room for lots more furniture',
    extra: [
      { type: 'window', x: 10.4, z: 0.1, y: 1.45, curtain: '#f4a4b6' },
      { type: 'armchair', x: 10.4, z: 1.6, color: '#d06b8e' }, { type: 'lamp', x: 11.4, z: 1.1 },
      { type: 'shelf', x: 9.3, z: 0.35, w: 1.0, kind: 'books' },
      { type: 'rug', x: 10.1, z: 5.4, color: '#8fd6b4', rx: 1.1, rz: 0.8 }, { type: 'plant', x: 0.5, z: 7.4 },
    ],
  },
  3: {
    w: 15, d: 9, door: 5, name: 'Your Cozy Home', cost: 5000, wood: 50, blurb: 'a big bright living room with a sofa corner and a window seat',
    extra: [
      { type: 'window', x: 10.4, z: 0.1, y: 1.45, curtain: '#f4a4b6' }, { type: 'window', x: 13.2, z: 0.1, y: 1.45, curtain: '#f4a4b6' },
      { type: 'armchair', x: 10.4, z: 1.6, color: '#d06b8e' }, { type: 'lamp', x: 11.5, z: 1.1 },
      { type: 'shelf', x: 9.3, z: 0.35, w: 1.0, kind: 'books' }, { type: 'shelf', x: 12.0, z: 0.35, w: 1.0, kind: 'jars' },
      { type: 'sofa', x: 12.4, z: 4.2, color: '#8a64b8' }, { type: 'rug', x: 12.4, z: 5.6, color: '#b9a2e3', rx: 1.4, rz: 0.9 },
      { type: 'plant', x: 0.5, z: 8.4 }, { type: 'plant', x: 14.5, z: 2.4 }, { type: 'painting', x: 7.9, z: 0.12, y: 1.95, w: 0.7, kind: 'meadow' },
    ],
  },
};
// Nana's cottage fills up with the life you live there: a fish over the mantelpiece once you've
// caught a few, a basket of your vegetables by the stove, the cards of the friends you've spoiled
export function homeMementos(s) {
  const st = (s && s.stats) || {}, out = [];
  if ((st.fish || 0) >= 5) out.push({ type: 'trophy', x: 4.5, z: 0.47, y: 1.95 });
  if ((st.crops || 0) >= 10) out.push({ type: 'basket', x: 7.05, z: 0.75, kind: 'veg' });
  if ((st.gifts || 0) >= 5) out.push({ type: 'cards', x: 4.5, z: 0.53, y: 1.45 });
  return out;
}

export function applyHomeLevel(level) {
  const L = HOME_LEVELS[Math.max(1, Math.min(3, level || 1))];
  const items = HOME_BASE.items.map((it) => (it.rw ? { ...it, x: L.w - (9 - it.x) } : it));
  Object.assign(INTERIORS.home, { w: L.w, d: L.d, door: L.door, name: L.name, items: items.concat(L.extra) });
  INTERIORS.home.spots = { ...HOME_BASE.spots, door: [L.door + 0.5, L.d - 0.8] };
  return INTERIORS.home;
}

// --- painted wall & floor textures -------------------------------------------
export const WALLPAPERS = {
  cream: { base: '#f3e2c4', pattern: 'flowers', accent: '#e9a0a8', wains: '#a8744a' },
  rose: { base: '#f4c6cf', pattern: 'flowers', accent: '#fff4f0', wains: '#b86a7a' },
  mint: { base: '#cfe8d6', pattern: 'stripes', accent: '#b5dcc2', wains: '#6f9a7a' },
  night: { base: '#3a4a86', pattern: 'stars', accent: '#ffe8a3', wains: '#2a3460' },
  honey: { base: '#d9a86a', pattern: 'panels', accent: '#c4904f', wains: '#8a5a34' },
  bakery: { base: '#f6dfae', pattern: 'dots', accent: '#e8b86a', wains: '#fbf1dc', tile: true },
  hall: { base: '#c8cfdc', pattern: 'panels', accent: '#b0b8c8', wains: '#6b5a5a' },
  library: { base: '#6e8f78', pattern: 'stripes', accent: '#638470', wains: '#5a3b2a' },
  logs: { base: '#a8744a', pattern: 'logs', accent: '#8e5d3e', wains: '#6b4330' },
  boards: { base: '#8fb7d6', pattern: 'boards', accent: '#7aa2c4', wains: '#4a5a78' },
  stone: { base: '#a9a3a8', pattern: 'stone', accent: '#8a858e', wains: '#6a6571' },
  farm: { base: '#f3e2c4', pattern: 'stripes', accent: '#ecd6ae', wains: '#8e5d3e' },
  barn: { base: '#b8504a', pattern: 'boards', accent: '#a8443e', wains: '#6b3a30' },
  sea: { base: '#cfe3ee', pattern: 'boards', accent: '#b9d4e4', wains: '#3f6f9e' },
  cave: { base: '#5a5566', pattern: 'rock', accent: '#4a4656', wains: '#3b3844', bare: true },
};

function paintWallpaper(wT, hT, key, windows = []) {
  const W = WALLPAPERS[key] || WALLPAPERS.cream;
  const p = new Painter(wT, hT);
  const R = ramp(W.base);
  if (W.pattern === 'rock') {
    // rough cave wall: lumpy boulders with cool highlights and damp streaks
    const R = ramp(W.base);
    p.rect(0, 0, wT, hT, R.d);
    const r = rng(wT * 3 + hT);
    for (let i = 0; i < wT * hT / 60; i++) {
      const cx = r() * wT, cy = r() * hT, rx = 4 + r() * 7, ry = 3 + r() * 5;
      const c = r() < 0.5 ? R.m : mixc(R.m, R.l, 0.35);
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const k = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (k <= 1) p.px(x, y, k < 0.3 && y < cy ? R.l : k > 0.8 && y > cy ? R.o : c);
      }
    }
    for (let i = 0; i < wT / 6; i++) { const x = r() * wT, y0 = r() * hT * 0.5, len = 4 + r() * 12; for (let k = 0; k < len; k++) p.px(x, y0 + k, '#6f86a8'); }
    return p.c;
  }
  if (W.pattern === 'logs') wallFill(p, 0, 0, wT, hT, 'logs', { wallColor: W.base }, 3);
  else if (W.pattern === 'boards') wallFill(p, 0, 0, wT, hT, 'boards', { wallColor: W.base }, 3);
  else if (W.pattern === 'stone') wallFill(p, 0, 0, wT, hT, 'stone', { wallColor: W.base }, 3);
  else {
    p.rect(0, 0, wT, hT, R.m);
    const r = rng(wT * 7 + hT);
    for (let y = 0; y < hT; y++) for (let x = 0; x < wT; x++) {
      if (W.pattern === 'stripes' && x % 8 < 3) p.px(x, y, W.accent);
      if (W.pattern === 'panels' && (x % 16 === 0 || y % 12 === 0)) p.px(x, y, W.accent);
      if (W.pattern === 'dots' && x % 6 === 2 && y % 6 === 2) p.px(x, y, W.accent);
    }
    if (W.pattern === 'flowers') {
      for (let y = 3; y < hT - 10; y += 8) for (let x = ((y / 8) % 2) * 4 + 2; x < wT; x += 8) {
        p.px(x, y, W.accent); p.px(x - 1, y + 1, W.accent); p.px(x + 1, y + 1, W.accent); p.px(x, y + 2, W.accent); p.px(x, y + 1, '#ffd66b');
      }
    }
    if (W.pattern === 'stars') for (let i = 0; i < wT * hT * 0.012; i++) { const x = r() * wT, y = r() * (hT - 10); p.px(x, y, W.accent); if (r() < 0.3) { p.px(x + 1, y, W.accent); p.px(x - 1, y, W.accent); p.px(x, y + 1, W.accent); p.px(x, y - 1, W.accent); } }
  }
  // crown moulding & wainscot
  const Wn = ramp(W.wains);
  p.rect(0, 0, wT, 2, Wn.d); p.hline(0, 2, wT, Wn.l);
  const wy = hT - 12;
  if (W.tile) {
    for (let y = wy; y < hT; y++) for (let x = 0; x < wT; x++) p.px(x, y, (x % 6 === 0 || (y - wy) % 6 === 0) ? '#d9cdb8' : '#fbf6ea');
  } else {
    p.rect(0, wy, wT, 12, Wn.m);
    for (let x = 0; x < wT; x += 12) { p.vline(x, wy, 12, Wn.d); p.rect(x + 2, wy + 2, 8, 8, Wn.l); p.rect(x + 3, wy + 3, 6, 6, Wn.m); }
    p.hline(0, wy, wT, Wn.h);
  }
  p.rect(0, hT - 2, wT, 2, Wn.o);
  return p.c;
}

export const FLOORS = {
  wood: { color: '#b07b50' }, dark: { color: '#6b4330' }, planks: { color: '#c49a64' },
  check: { a: '#fbf1dc', b: '#e9b7bf' }, stone: { stone: '#a9a3a8' }, moss: { color: '#6f9a55', carpet: true },
  hay: { color: '#d9b45a', carpet: true, straw: true },
  cave: { color: '#6a6072', carpet: true, cave: true },
};

function paintFloor(wT, hT, key) {
  const F = FLOORS[key] || FLOORS.wood;
  if (F.a) {
    const p = new Painter(wT, hT);
    for (let y = 0; y < hT; y++) for (let x = 0; x < wT; x++) {
      const c = ((x >> 3) + (y >> 3)) % 2 ? F.a : F.b;
      p.px(x, y, c);
    }
    for (let y = 0; y < hT; y += 8) p.hline(0, y, wT, '#d9cdb8');
    return p.c;
  }
  if (F.stone) {
    // large, calm flagstones (16px) with soft bevels
    const p = new Painter(wT, hT);
    const R = ramp(F.stone);
    p.rect(0, 0, wT, hT, R.d);
    for (let ty = 0; ty < hT; ty += 16) {
      const off = ((ty / 16) % 2) * 8;
      for (let tx = -off; tx < wT; tx += 16) {
        const v = hash2(tx, ty, 17);
        const col = v < 0.3 ? R.m : v < 0.8 ? mixc(R.m, R.l, 0.4) : R.l;
        const x0 = Math.max(0, tx + 1), x1 = Math.min(wT, tx + 15);
        p.rect(x0, ty + 1, x1 - x0, 14, col);
        p.hline(x0, ty + 1, x1 - x0, R.h);
        p.hline(x0, ty + 14, x1 - x0, R.d);
        if (v > 0.55) { p.px(x0 + 4 + Math.floor(v * 6), ty + 6, R.d); p.px(x0 + 5 + Math.floor(v * 6), ty + 7, R.d); }
      }
    }
    return p.c;
  }
  if (F.carpet) {
    const p = new Painter(wT, hT);
    const R = ramp(F.color);
    p.rect(0, 0, wT, hT, R.m);
    if (F.cave) {
      // damp sand & pebbles on rock
      const r = rng(wT * 5 + hT);
      for (let y = 0; y < hT; y++) for (let x = 0; x < wT; x++) {
        const v = Math.sin(x * 0.21) * Math.cos(y * 0.17) + Math.sin((x + y) * 0.09);
        if (v > 0.9) p.px(x, y, '#8a7d70');
        else if (v < -1.1) p.px(x, y, R.d);
      }
      for (let i = 0; i < wT * hT * 0.03; i++) { const x = r() * wT, y = r() * hT; p.px(x, y, r() < 0.5 ? R.l : R.o); if (r() < 0.2) p.px(x + 1, y, R.l); }
      return p.c;
    }
    if (F.straw) {
      // straw-strewn planks: board seams peeking through loose hay
      for (let y = 0; y < hT; y += 8) p.hline(0, y, wT, R.d);
      const r = rng(wT + hT);
      for (let i = 0; i < wT * hT * 0.05; i++) {
        const x = r() * wT, y = r() * hT, len = 2 + r() * 4, dx = r() < 0.5 ? 1 : -1;
        for (let k = 0; k < len; k++) p.px(x + k * dx, y + k * 0.4, r() < 0.5 ? R.l : R.h);
      }
      return p.c;
    }
    for (let i = 0; i < wT * hT * 0.15; i++) p.px(Math.random() * wT, Math.random() * hT, Math.random() < 0.5 ? R.l : R.d);
    return p.c;
  }
  return paintBoards(wT, hT, F.color, key === 'planks' ? { plank: 6, rough: true } : {});
}

// floorboards: planks of every length (their ends staggered, two nails at each end), each a touch
// lighter or darker than its neighbours, grain streaks & a knot here and there, soft gaps between
// them (rough boards: wider, more gap, more knots)
function paintBoards(wT, hT, color, { plank = 5, rough = false } = {}) {
  const p = new Painter(wT, hT), R = ramp(color), r = rng(wT * 7 + hT * 3 + plank);
  const gap = mixc(R.d, R.o, rough ? 0.6 : 0.25), nail = mixc(R.d, R.o, 0.5);
  const tints = [R.m, mixc(R.m, R.l, 0.45), mixc(R.m, R.d, 0.3), mixc(R.m, R.l, 0.2), mixc(R.m, R.h, 0.15)];
  const ends = [];
  for (let y0 = 0; y0 < hT; y0 += plank) {
    for (let x = -Math.floor(r() * 44); x < wT;) {
      const len = (rough ? 30 : 24) + Math.floor(r() * 40), base = tints[Math.floor(r() * tints.length)];
      const x0 = Math.max(0, x), x1 = Math.min(wT, x + len);
      p.rect(x0, y0, x1 - x0, plank - 1, base);
      p.hline(x0, y0, x1 - x0, mixc(base, R.h, 0.25));
      for (let k = 0; k < len / 8; k++) {
        const gx = x + Math.floor(r() * len), gy = y0 + 1 + Math.floor(r() * (plank - 2)), gl = 3 + Math.floor(r() * 8);
        if (gx >= x0 && gx < x1) p.hline(gx, gy, Math.min(gl, x1 - gx), mixc(base, R.d, 0.3));
      }
      if (r() < (rough ? 0.35 : 0.15)) {
        const kx = x + 5 + Math.floor(r() * Math.max(1, len - 10)), ky = y0 + 1 + Math.floor(r() * Math.max(1, plank - 3));
        if (kx >= x0 && kx + 1 < x1) { p.px(kx, ky, R.d); p.px(kx + 1, ky, mixc(R.d, base, 0.4)); p.px(kx, ky + 1, mixc(R.d, base, 0.5)); }
      }
      p.hline(x0, y0 + plank - 1, x1 - x0, gap);
      if (x + len < wT && x + len > 0) ends.push([x + len - 1, y0]);
      x += len;
    }
  }
  for (const [x, y0] of ends) {
    p.vline(x, y0, plank - 1, gap);
    for (const nx of [x - 2, x + 2]) { p.px(nx, y0 + 1, nail); p.px(nx, y0 + plank - 3, nail); }
  }
  return p.c;
}

// --- builder -------------------------------------------------------------------
export class Interior3D {
  constructor(r3d, id, def, overrides = {}) {
    this.r3d = r3d;
    this.id = id;
    this.def = { ...def, ...overrides };
    this.root = new THREE.Group();
    this.colliders = [];
    this.lights = [];
    this.glass = [];
    this.interactables = [];
    this.fires = [];
    this.furniture = [];
    this.anims = [];
  }

  build(extraItems = []) {
    const { w, d, door } = this.def;
    const r3d = this.r3d;
    // floor
    const floorTex = pixelTexture(paintFloor(w * 16, d * 16, this.def.floor));
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), toon(r3d, { map: floorTex }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(w / 2, 0, d / 2);
    floor.receiveShadow = true;
    this.root.add(floor);
    this.floorMesh = floor;
    // back wall
    const wallTex = pixelTexture(paintWallpaper(Math.round((w + 0.6) * 16), Math.round(WALL_H * 16), this.def.wall));
    const trim = toon(r3d, { color: 0x3b2a2e, key: 'walltrim' });
    const wallMat = toon(r3d, { map: wallTex });
    this.wallMat = wallMat;
    const back = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, WALL_H, 0.3), [trim, trim, trim, trim, wallMat, trim]);
    back.position.set(w / 2, WALL_H / 2, -0.15);
    back.receiveShadow = true;
    this.root.add(back);
    // side walls (their tops read as a trim line in the oblique view)
    const sideMat = toon(r3d, { color: 0x5a3b2a, key: 'sidewall' });
    for (const x of [-0.15, w + 0.15]) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.3, WALL_H, d + 0.3), sideMat);
      s.position.set(x, WALL_H / 2, d / 2);
      this.root.add(s);
    }
    // front threshold (cut-away wall) with door gap
    const sill = toon(r3d, { color: 0x6b4330, key: 'sill' });
    const addSill = (x0, x1) => {
      if (x1 <= x0) return;
      const s = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.22, 0.24), sill);
      s.position.set((x0 + x1) / 2, 0.11, d + 0.12);
      this.root.add(s);
    };
    addSill(-0.3, door); addSill(door + 1, w + 0.3);
    const mat = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5), toon(r3d, { color: 0xc8704a, key: 'doormat' }));
    mat.rotation.x = -Math.PI / 2;
    mat.position.set(door + 0.5, 0.012, d - 0.3);
    this.root.add(mat);
    // walls as colliders
    this.colliders.push({ rect: [-1, -1, w + 2, 1] }, { rect: [-1, -1, 1, d + 2] }, { rect: [w, -1, 1, d + 2] });
    this.colliders.push({ rect: [-1, d, door + 1, 1] }, { rect: [door + 1, d, w - door + 1, 1] });

    for (const it of [...this.def.items, ...extraItems]) this.addItem(it);
    // sunlight through the windows (updateSun)
    this.suns = [];
    if (!this.def.dark && !this.def.outdoor) for (const it of [...this.def.items, ...extraItems]) if (it.type === 'window') this.addSun(it.x);
    this.r3d.scene.add(this.root);
    this.root.visible = false;
    return this;
  }

  addItem(it) {
    const res = buildFurniture(this.r3d, it);
    if (!res) return null;
    const y = it.y || 0;
    res.obj.position.set(it.x, y, it.z);
    if (it.rot !== undefined && it.type !== 'chair') res.obj.rotation.y = it.rot;
    this.root.add(res.obj);
    const entry = { def: it, res };
    this.furniture.push(entry);
    if (res.solid && !res.wall && !res.flat) {
      const [sw, sd] = res.size;
      const cw = it.w ? it.w : sw, cd = res.counter ? 0.72 : sd === 2 && it.type === 'bed' ? 1.9 : Math.min(sd, 0.9);
      const box = [it.x - cw / 2, it.z - cd / 2, cw, cd];
      if (it.type === 'bed') box[3] = 1.95;
      if (res.thin) { box[0] = it.x - 0.12; box[1] = it.z - res.size[1] / 2; box[2] = 0.24; box[3] = res.size[1]; }
      entry.collider = { rect: box, furn: entry };
      this.colliders.push(entry.collider);
    }
    if (res.light) {
      const l = { x: it.x, y: (it.y || 0) + res.light.y, z: it.z + (res.light.z || 0.3), color: res.light.color || 0xffc070, power: res.light.power, flicker: res.light.flicker, lamp: true };
      this.lights.push(l);
      entry.light = l;
    }
    if (res.glass) this.glass.push(res.glass);
    if (res.interact) this.interactables.push({ ...res.interact, x: it.x, z: it.z, id: it.id, entry });
    if (res.lens) this.lens = { mat: res.lens, obj: res.obj };
    if (res.lid) entry.lid = res.lid, entry.shine = res.shine;
    if (res.fire) this.fires.push(res.obj);
    if (res.anim) { this.anims.push(res.anim); entry.anim = res.anim; }
    return entry;
  }

  // a patch of sunlight on the floor in front of a window, the shadow of its bars in it
  addSun(x) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(12), 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2));
    geo.setIndex([0, 2, 1, 0, 3, 2]);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: sunTex(), color: 0xffe6b0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.frustumCulled = false; m.visible = false;
    this.root.add(m);
    this.suns.push({ m, x });
  }
  // the sun's patches: there by day (warmer early & late), slanting & lengthening away from noon,
  // faint under clouds, gone in the rain & at night
  updateSun(hour, weather) {
    if (!this.suns || !this.suns.length) return;
    const k = Math.max(0, Math.min(1, (hour - 6.6) / 1.4, (18.9 - hour) / 1.4));
    const a = k * (weather === 'sun' ? 1 : weather === 'cloudy' ? 0.3 : 0) * 0.32;
    const off = hour - 12.5, len = 1.3 + Math.abs(off) * 0.1, skew = Math.max(-0.75, Math.min(0.75, -off * 0.14));
    const warm = hour < 9 || hour > 16.5;
    for (const S of this.suns) {
      S.m.visible = a > 0.01;
      if (!S.m.visible) continue;
      S.m.material.opacity = a;
      S.m.material.color.setHex(warm ? 0xffc27a : 0xffe6b0);
      const pos = S.m.geometry.attributes.position, z0 = 0.3, z1 = z0 + len, x0 = S.x - 0.45, x1 = S.x + 0.45, sx = skew * len;
      pos.setXYZ(0, x0, 0.016, z0); pos.setXYZ(1, x1, 0.016, z0); pos.setXYZ(2, x1 + sx, 0.016, z1); pos.setXYZ(3, x0 + sx, 0.016, z1);
      pos.needsUpdate = true;
    }
  }

  // a set of items that comes & goes (the home's mementos): the old ones out, the new ones in
  setExtras(tag, items) {
    for (const f of this.furniture.filter((e) => e.def.tag === tag)) this.removeItem(f);
    for (const it of items) this.addItem({ ...it, tag });
  }

  removeItem(entry) {
    this.root.remove(entry.obj || entry.res.obj);
    this.furniture = this.furniture.filter((f) => f !== entry);
    if (entry.collider) this.colliders = this.colliders.filter((c) => c !== entry.collider);
    if (entry.light) this.lights = this.lights.filter((l) => l !== entry.light);
    this.interactables = this.interactables.filter((i) => i.entry !== entry);
  }

  setWallpaper(key) {
    this.def.wall = key;
    this.wallMat.map = pixelTexture(paintWallpaper(Math.round((this.def.w + 0.6) * 16), Math.round(WALL_H * 16), key));
    this.wallMat.needsUpdate = true;
  }

  setFloor(key) {
    this.def.floor = key;
    this.floorMesh.material.map = pixelTexture(paintFloor(this.def.w * 16, this.def.d * 16, key));
    this.floorMesh.material.needsUpdate = true;
  }
}

// the panes of a window, as sunlight lets them through (the bars stay dark)
let SUN = null;
function sunTex() {
  if (SUN) return SUN;
  const p = new Painter(16, 16);
  p.rect(0, 0, 16, 16, '#000000');
  p.rect(1, 1, 14, 14, '#ffffff');
  p.rect(7, 1, 2, 14, '#000000'); p.rect(1, 7, 14, 2, '#000000');
  return (SUN = pixelTexture(p.c));
}

export { hash2 };
