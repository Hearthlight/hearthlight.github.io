// German dictionary, assembled from its parts (keys = English source text).
import { UI } from './ui.js';
import { STORY } from './story.js';
import { LINES } from './lines.js';
import { ITEMS } from './items.js';
import { PARTY } from './party.js';
import { COMBAT } from './combat.js';
import { HOST } from './host.js';
import { WORLD } from './world.js';
import { MOVES } from './moves.js';
import { ARENA } from './arena.js';
import { MOUNTS_DE } from './mounts.js';
import { FIGHTS } from './fights.js';
import { PROGRESS } from './progress.js';
import { TRAVEL } from './travel.js';
import { SECRETS } from './secrets.js';
import { RACES } from './races.js';
import { EVENTS_DE } from './events.js';
import { SOLO } from './solo.js';
import { ADVENTURE } from './adventure.js';
import { TALENTS4 } from './talents4.js';
import { WEAPONS4 } from './weapons4.js';
import { DINOS } from './dinos.js';
import { COMPANIONS } from './companions.js';
import { PHONE } from './phone.js';
import { SAGA_UI } from './saga_ui.js';
import { CH1_DE } from './ch1.js';
import { WORLD7 } from './world_v7.js';
import { CH2_DE } from './ch2.js';
import { CH3_DE } from './ch3.js';
import { CH4_DE } from './ch4.js';
import { CH5_DE } from './ch5.js';
import { CH6_DE } from './ch6.js';
import { CH7_DE } from './ch7.js';
import { CH8_DE } from './ch8.js';
import { CH9_DE } from './ch9.js';
import { CH10_DE } from './ch10.js';
import { WORLD13_DE } from './world13.js';
import { CONTROLS_DE } from './controls.js';
import { RELEASE9_DE } from './release9.js';
import { CLASSES9_DE } from './classes9.js';

export const DE = { ...UI, ...ITEMS, ...LINES, ...STORY, ...PARTY, ...COMBAT, ...HOST, ...WORLD, ...MOVES, ...ARENA, ...MOUNTS_DE, ...FIGHTS, ...PROGRESS, ...TRAVEL, ...SECRETS, ...RACES, ...EVENTS_DE, ...SOLO, ...ADVENTURE, ...TALENTS4, ...WEAPONS4, ...DINOS, ...COMPANIONS, ...PHONE, ...SAGA_UI, ...CH1_DE, ...WORLD7, ...CH2_DE, ...CH3_DE, ...CH4_DE, ...CH5_DE, ...CH6_DE, ...CH7_DE, ...CH8_DE, ...CH9_DE, ...CH10_DE, ...WORLD13_DE, ...CONTROLS_DE, ...RELEASE9_DE, ...CLASSES9_DE };

// lines said to the whole party (ihr): looked up first in Party Mode
export const DE_GROUP = {};
for (const d of [SAGA_UI, CH1_DE, CH2_DE, CH3_DE, CH4_DE, CH5_DE, CH6_DE, CH7_DE, CH8_DE, CH9_DE, CH10_DE, WORLD13_DE]) if (d.__group) Object.assign(DE_GROUP, d.__group);
delete DE.__group;
