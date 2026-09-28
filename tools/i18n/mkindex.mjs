// Write src/lang/<xx>/index.js from the French one (same parts, the names' _FR → _XX):
//   node tools/i18n/mkindex.mjs es
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const xx = process.argv[2], XX = xx.toUpperCase();
const NAME = { es: 'Spanish', de: 'German', it: 'Italian' }[xx];
let s = fs.readFileSync(path.join(root, 'src/lang/fr/index.js'), 'utf8');
s = s.replace(/^\/\/ French dictionary/m, `// ${NAME} dictionary`)
  .replace(/_FR\b/g, '_' + XX)
  .replace(/export const FR = /, `export const ${XX} = `)
  .replace(/export const FR_GROUP/, `export const ${XX}_GROUP`)
  .replace(/Object\.assign\(FR_GROUP/, `Object.assign(${XX}_GROUP`)
  .replace(/delete FR\.__group/, `delete ${XX}.__group`)
  .replace(/lines said to the whole party \(« vous »\)/, `lines said to the whole party (${{ es: 'ustedes', de: 'ihr', it: 'voi' }[xx]})`);
fs.writeFileSync(path.join(root, `src/lang/${xx}/index.js`), s);
console.log('wrote', `src/lang/${xx}/index.js`);
