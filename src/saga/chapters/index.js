// World v7: every chapter of the saga, in order. A chapter module exports its
// definition: { id, title, lv, zones (open while it runs), npcs, quests, begin }.

import { CH1 } from './ch1.js';
import { CH2 } from './ch2.js';
import { CH3 } from './ch3.js';
import { CH4 } from './ch4.js';
import { CH5 } from './ch5.js';
import { CH6 } from './ch6.js';
import { CH7 } from './ch7.js';
import { CH8 } from './ch8.js';
import { CH9 } from './ch9.js';
import { CH10 } from './ch10.js';

export const CHAPTERS = [CH1, CH2, CH3, CH4, CH5, CH6, CH7, CH8, CH9, CH10];

// every quest of every chapter, by id (a quest knows its chapter)
export const QUESTS = {};
for (const C of CHAPTERS) for (const [id, Q] of Object.entries(C.quests || {})) QUESTS[id] = { ch: C.id, lv: C.lv, ...Q };
