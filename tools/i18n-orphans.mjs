// Find dictionary keys no source file uses any more (a line cut from a scene leaves its
// translations behind in four languages):
//   node tools/i18n-orphans.mjs src/lang/fr/ch1.js     one dictionary file
//   node tools/i18n-orphans.mjs fr                      every file of a language
// A key counts as used when its text stands as a string literal somewhere under src/ or tools/
// (the dictionaries aside) or in a page. Keys built at run time would be reported wrongly: check
// before deleting.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = process.argv[2];
if (!arg) { console.log('usage: node tools/i18n-orphans.mjs <file | fr | es | de | it>'); process.exit(1); }
const files = /^[a-z]{2}$/.test(arg)
  ? fs.readdirSync(path.join(root, 'src/lang', arg)).filter((f) => f !== 'index.js').map((f) => `src/lang/${arg}/${f}`)
  : [arg];

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) { if (f.name !== 'lang' && f.name !== 'node_modules') walk(p, out); }
    else if (/\.(js|mjs|html)$/.test(f.name)) out.push(p);
  }
  return out;
}
const sources = [...walk(path.join(root, 'src')), ...walk(path.join(root, 'tools')), ...['index.html', 'pad.html', 'play.html'].map((f) => path.join(root, f))].filter((p) => fs.existsSync(p));
const text = sources.map((p) => fs.readFileSync(p, 'utf8')).join('\n');
// the ways a literal can be spelt in a source file
const spellings = (k) => {
  const nl = k.replace(/\n/g, '\\n');
  return [nl, nl.replace(/'/g, "\\'"), nl.replace(/"/g, '\\"'), nl.replace(/`/g, '\\`')];
};
const used = (k) => spellings(k).some((s) => text.includes(s));

let bad = 0, total = 0;
for (const rel of files) {
  const mod = await import(path.join(root, rel) + '?' + Date.now());
  const dict = Object.values(mod).find((x) => x && typeof x === 'object') || {};
  const out = [];
  for (const [k, v] of Object.entries(dict)) {
    if (k === '__group') { for (const g of Object.keys(v)) { total++; if (!used(g)) out.push('[group] ' + g); } continue; }
    total++;
    if (!used(k)) out.push(k);
  }
  if (out.length) { bad += out.length; console.log(`${rel}: ${out.length} unused`); for (const k of out) console.log('  ' + JSON.stringify(k)); }
}
console.log(`${total} keys, ${bad} unused`);
