// Print the overworld as ASCII for quick layout checks: node tools/mapdump.mjs
import { buildOverworld } from '../src/world/overworld.js';
import { TT } from '../src/world/tiles.js';
const m = buildOverworld();
const ch = { [TT.GRASS]: '.', [TT.MEADOW]: ',', [TT.FOREST]: 'f', [TT.PATH]: ':', [TT.PLAZA]: '#', [TT.SAND]: 's', [TT.WATER]: '~', [TT.PLANK_H]: '=', [TT.PLANK_V]: '|', [TT.SOIL]: 'm', [TT.ROCK]: 'R', [TT.FIELD]: 'w', [TT.HILL]: 'h', [TT.SNOW]: '*', [TT.ICE]: 'I', [TT.LEAVES]: 'L', [TT.MARSH]: 'M', [TT.PETALS]: 'K' };
const grid = [];
for (let y = 0; y < m.h; y++) { grid.push([]); for (let x = 0; x < m.w; x++) grid[y].push(ch[m.ground[y * m.w + x]] ?? '?'); }
const objCh = { oak: 'T', pine: 'P', cherry: 'C', apple: 'A', palm: 'Y', bush: 'o', rock: 'r', lamp: 'l', fence: '+', bench: 'b', sign: '!', fountain: 'F', board: 'B', wheat: 'w', lavender: 'v', glowcap: 'g' };
for (const o of m.objects) { const x = Math.floor(o.x), y = Math.floor(o.y); if (grid[y] && grid[y][x] !== undefined) grid[y][x] = objCh[o.type] || '*'; }
for (const b of m.buildings) for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) grid[y][x] = (y === b.y + b.h - 1 && x === b.door) ? 'D' : 'H';
console.log('    ' + [...Array(m.w)].map((_, i) => (i % 10 === 0 ? String(i / 10) : ' ')).join(''));
grid.forEach((row, y) => console.log(String(y).padStart(3) + ' ' + row.join('')));
console.log('objects:', m.objects.length);
