// Every level the story’s content carries, read from the sources and checked against the pace
// (src/saga/levels.js): chapter n runs from level 4n − 3 to 4n — its own `lv`, its quests’, its
// camps’ and the fights whose level a scene writes down; its dungeon is the top three; its lands
// stay within it (one level lower at most), three or four levels wide.
//   node tools/pacecheck.mjs        → the levels chapter by chapter, and what is out of place
// (a quest copied from an old neighbour, a camp added with yesterday’s numbers: it says where)
//   node tools/pacecheck.mjs 27 6   → a level of the old scale (before the levels were spread
//                                     four a chapter), for something of chapter 6, on the new one

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const band = (n) => [4 * n - 3, 4 * n];
const bad = [];

// the old scale → the new one: straight lines between these points (the old chapters’ first
// and last levels on the new chapters’), rounded; then held in the chapter’s four levels
const OLD = [[1, 1], [5, 5], [10, 9], [16, 13], [21, 16], [22, 17], [25, 20], [26, 21], [28, 24], [29, 25], [32, 28], [33, 29], [35, 33], [39, 37], [40, 40]];
export function fromOld(old, chapter = 0) {
  let v = 40;
  for (let i = 1; i < OLD.length; i++) { const [x0, y0] = OLD[i - 1], [x1, y1] = OLD[i]; if (old <= x1) { v = Math.round(y0 + ((old - x0) * (y1 - y0)) / (x1 - x0) + 1e-9); break; } }
  return chapter ? Math.max(band(chapter)[0], Math.min(band(chapter)[1], v)) : Math.max(1, v);
}
if (process.argv[2]) {
  const old = +process.argv[2], n = +process.argv[3] || 0;
  console.log(n ? `old ${old}, chapter ${n} (${band(n).join('–')}) → ${fromOld(old, n)}` : `old ${old} → ${fromOld(old)} (name the chapter to hold it in its four levels)`);
  process.exit(0);
}

// the chapters: `lv: 12` (the chapter, a quest, an escort) and `level: 12` (a camp, a fight, a game)
const CH = {};
for (let n = 1; n <= 10; n++) {
  const file = `src/saga/chapters/ch${n}.js`, [a, b] = band(n), seen = [];
  read(file).split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/\b(lv|level): (\d+)(?![\d\]])/g)) {
      seen.push(+m[2]);
      if (+m[2] < a || +m[2] > b) bad.push(`${file}:${i + 1}  ${m[1]}: ${m[2]} — chapter ${n} is ${a}–${b}`);
    }
  });
  const zones = (read(file).match(/\bzones: \[([^\]]*)\]/) || [, ''])[1].match(/[a-z]+/g) || [];
  CH[n] = { seen: seen.sort((x, y) => x - y), zones };
}

// the dungeons, in the story’s order: the top three levels of their chapter
const order = [...read('src/saga/dungeons/index.js').matchAll(/import \{ \w+ \} from '\.\/(\w+)\.js'/g)].map((m) => m[1]);
const duns = {};
for (const id of order) {
  const src = read(`src/saga/dungeons/${id}.js`), m = src.match(/\blv: \[(\d+), (\d+)\]/), slot = src.match(/\bslot: (\d+)/);
  if (!m || !slot) { bad.push(`src/saga/dungeons/${id}.js: no levels or no slot`); continue; }
  const n = +slot[1] + 1, [, b] = band(n);
  duns[n] = `${id} ${m[1]}–${m[2]}`;
  if (+m[1] !== b - 2 || +m[2] !== b) bad.push(`src/saga/dungeons/${id}.js  lv: [${m[1]}, ${m[2]}] — chapter ${n}’s dungeon is ${b - 2}–${b}`);
}

// the lands, by the chapter that plays in them
const lands = Object.fromEntries([...read('src/world/big/layout.js').matchAll(/\{ id: '([a-z]+)', lv: \[(\d+), (\d+)\]/g)].map((m) => [m[1], [+m[2], +m[3]]]));
for (let n = 1; n <= 10; n++) for (const z of CH[n].zones) {
  const lv = lands[z], [a, b] = band(n);
  if (!lv) { bad.push(`src/world/big/layout.js: no levels for ${z}`); continue; }
  if (lv[0] < Math.max(1, a - 1) || lv[1] > b || lv[1] - lv[0] < 2 || lv[1] - lv[0] > 3) bad.push(`src/world/big/layout.js  ${z} [${lv}] — chapter ${n} is ${a}–${b} (a land: within it, one lower at most, three or four levels)`);
}

for (let n = 1; n <= 10; n++) console.log(`chapter ${String(n).padStart(2)}  ${band(n).join('–').padEnd(5)}  levels ${CH[n].seen.join(' ')}  ·  ${duns[n] || 'no dungeon'}  ·  ${CH[n].zones.map((z) => `${z} ${(lands[z] || []).join('–')}`).join(', ')}`);
console.log(bad.length ? `\n${bad.length} out of place:\n` + bad.join('\n') : '\n0 out of place');
process.exit(bad.length ? 1 : 0);
