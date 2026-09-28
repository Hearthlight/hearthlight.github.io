// Hearthlight master palette. Warm, soft, slightly desaturated — cozy.
import { ramp } from '../engine/color.js';

export const COLORS = {
  // UI inks
  ink: '#3b2a2e',
  inkSoft: '#6b5157',
  paper: '#fbf1dc',
  paperDark: '#ecd9b4',
  paperEdge: '#c9a77c',
  cream: '#fff7e6',
  white: '#ffffff',
  black: '#14121c',
  shadow: '#2a1e2a',
  gold: '#e0a526',
  goldLight: '#ffd66b',
  coin: '#f6c65b',
  red: '#d9594c',
  rose: '#e97d8f',
  pink: '#f4a4b6',
  green: '#5fa453',
  leaf: '#7fbf5a',
  mint: '#8fd6b4',
  sky: '#7cc4e8',
  blue: '#4d7fc4',
  navy: '#2f3d6b',
  purple: '#8a64b8',
  lavender: '#b9a2e3',
  orange: '#e8883a',
  brown: '#8a5a3c',
  grey: '#9a93a0',
  heart: '#ec5f73',
  quest: '#f2b63d',
  night: '#23264a',
  glow: '#ffe8a3',
  dim: '#8f8290',
  // name tags used in rich text
  npc: '#5b7fb8',
  item: '#3f8f5a',
  place: '#b0643c',
};

// Terrain / nature palette
export const T = {
  grass: ['#3f7d4c', '#56984f', '#6eaf58', '#86c262', '#a4d472'],
  grassDark: '#2f6546',
  meadow: ['#4e8c4c', '#66a452', '#7dba5c', '#97cc66', '#b5de7a'],
  path: ['#8a6446', '#a9805a', '#c09a6c', '#d2b07f', '#e0c595'],
  plaza: ['#5f5868', '#827a88', '#a19aa3', '#b9b2b6', '#d0cac7'],
  sand: ['#c9a66f', '#dcbc85', '#e9cf9b', '#f2dfb3', '#faeecb'],
  water: ['#244d78', '#2d6394', '#3a7cae', '#4f99c7', '#79bddc'],
  foam: '#e7f6f4',
  soil: ['#4a3024', '#5e3d2c', '#744d36', '#8a5f42', '#9f7050'],
  soilWet: ['#33211b', '#422b21', '#553829', '#674532', '#79523a'],
  wood: ['#4a2e25', '#6b4330', '#8e5d3e', '#b07b50', '#cf9d68'],
  rock: ['#4d4855', '#6a6571', '#8a858e', '#aaa5aa', '#c9c4c4'],
  cliff: ['#5a4a42', '#76625a', '#917b6e', '#ab9383', '#c4ad99'],
  flower: ['#f4a4b6', '#fff3a6', '#ffffff', '#b9a2e3', '#f28a6b', '#8fc8f0'],
};

// Skin tones (player/NPC customization)
export const SKIN = [
  { id: 'porcelain', name: 'Porcelain', m: '#f9dccb' },
  { id: 'peach', name: 'Peach', m: '#f3c9a8' },
  { id: 'honey', name: 'Honey', m: '#dfa878' },
  { id: 'tan', name: 'Tan', m: '#c38a5c' },
  { id: 'cocoa', name: 'Cocoa', m: '#9a6440' },
  { id: 'umber', name: 'Umber', m: '#744629' },
  { id: 'sprite', name: 'Moss Sprite', m: '#a9d69a' },
  { id: 'fae', name: 'Lilac Fae', m: '#d5c2ee' },
].map((s) => ({ ...s, r: ramp(s.m, { outline: 0.33, dark: 0.1, light: 0.06, high: 0.12 }) }));

export const HAIR_COLORS = [
  { id: 'coal', name: 'Coal', m: '#3a3242' },
  { id: 'espresso', name: 'Espresso', m: '#5b3b2c' },
  { id: 'chestnut', name: 'Chestnut', m: '#8a5234' },
  { id: 'auburn', name: 'Auburn', m: '#a8483a' },
  { id: 'ginger', name: 'Ginger', m: '#d97a3f' },
  { id: 'honey', name: 'Honey', m: '#dca552' },
  { id: 'butter', name: 'Butter', m: '#ecd27e' },
  { id: 'silver', name: 'Silver', m: '#c9c4cc' },
  { id: 'rose', name: 'Rose', m: '#ee9ab5' },
  { id: 'lilac', name: 'Lilac', m: '#b59ae0' },
  { id: 'sky', name: 'Sky', m: '#79a8e6' },
  { id: 'mint', name: 'Mint', m: '#7ecfae' },
  { id: 'cherry', name: 'Cherry', m: '#d6485e' },
  { id: 'snow', name: 'Snow', m: '#f1eee8' },
].map((c) => ({ ...c, r: ramp(c.m) }));

export const EYE_COLORS = [
  { id: 'cocoa', name: 'Cocoa', m: '#4a2f2a' },
  { id: 'ocean', name: 'Ocean', m: '#2f5f9e' },
  { id: 'forest', name: 'Forest', m: '#2f7a4a' },
  { id: 'hazel', name: 'Hazel', m: '#8a6a2a' },
  { id: 'storm', name: 'Storm', m: '#5a6272' },
  { id: 'violet', name: 'Violet', m: '#6a3f9e' },
  { id: 'amber', name: 'Amber', m: '#c07a1a' },
  { id: 'rose', name: 'Rose', m: '#b8446a' },
];

export const CLOTH_COLORS = [
  { id: 'cream', name: 'Cream', m: '#efe3c8' },
  { id: 'white', name: 'Cloud', m: '#f4f1ec' },
  { id: 'coral', name: 'Coral', m: '#ec7f6d' },
  { id: 'red', name: 'Berry', m: '#c8454f' },
  { id: 'orange', name: 'Pumpkin', m: '#e58a3a' },
  { id: 'mustard', name: 'Mustard', m: '#dcb043' },
  { id: 'lime', name: 'Pear', m: '#a9c95a' },
  { id: 'sage', name: 'Sage', m: '#8fae83' },
  { id: 'green', name: 'Fern', m: '#4f955a' },
  { id: 'teal', name: 'Lagoon', m: '#3f9b98' },
  { id: 'sky', name: 'Sky', m: '#7cb6e0' },
  { id: 'blue', name: 'Denim', m: '#4e73b6' },
  { id: 'navy', name: 'Navy', m: '#384675' },
  { id: 'lavender', name: 'Lavender', m: '#ac98dc' },
  { id: 'plum', name: 'Plum', m: '#7d4f93' },
  { id: 'pink', name: 'Blush', m: '#f0a3bd' },
  { id: 'rose', name: 'Rose', m: '#d06b8e' },
  { id: 'brown', name: 'Cocoa', m: '#8a5d42' },
  { id: 'tan', name: 'Oat', m: '#c7a57a' },
  { id: 'grey', name: 'Pebble', m: '#9b98a3' },
  { id: 'charcoal', name: 'Charcoal', m: '#4b4854' },
].map((c) => ({ ...c, r: ramp(c.m) }));

export const byId = (list, id) => list.find((x) => x.id === id) || list[0];
