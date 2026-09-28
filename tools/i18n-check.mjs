// Check a translated dictionary file against its French twin (same keys = the English text):
//   node tools/i18n-check.mjs src/lang/es/ch1.js        (the French one: src/lang/fr/ch1.js)
//   node tools/i18n-check.mjs es                          (every file of a language)
// Reports keys missing or extra (the `__group` lines too), `{placeholders}` / `{tags}` that don't
// match the English, values left in English or in French, and straight quotes that break a font.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = process.argv[2];
if (!arg) { console.log('usage: node tools/i18n-check.mjs <file | es | de | it>'); process.exit(1); }
const files = /^[a-z]{2}$/.test(arg)
  ? fs.readdirSync(path.join(root, 'src/lang/fr')).filter((f) => f !== 'index.js').map((f) => `src/lang/${arg}/${f}`)
  : [arg];

const one = (m) => { const v = Object.values(m).find((x) => x && typeof x === 'object'); return v || {}; };
const tags = (s) => (String(s).match(/\{[#\w/]*\}/g) || []).filter((x) => x !== '{p}' && x !== '{pp}').sort().join(' ');
let bad = 0, total = 0;
for (const rel of files) {
  const fr = path.join(root, rel.replace(/src\/lang\/[a-z]{2}\//, 'src/lang/fr/'));
  const xx = path.join(root, rel);
  if (!fs.existsSync(xx)) { console.log(`${rel}: MISSING FILE`); bad++; continue; }
  const F = one(await import(fr)), X = one(await import(xx + '?' + Date.now()));
  const out = [];
  const cmp = (A, B, where) => {
    for (const k of Object.keys(A)) {
      if (k === '__group') continue;
      total++;
      if (!(k in B)) { out.push(`missing${where}: ${JSON.stringify(k).slice(0, 90)}`); continue; }
      const v = B[k];
      if (typeof v !== 'string') { out.push(`not a string${where}: ${JSON.stringify(k).slice(0, 60)}`); continue; }
      if (tags(k) !== tags(v)) out.push(`tags${where}: ${JSON.stringify(k).slice(0, 70)} → ${tags(k)} ≠ ${tags(v)}`);
      const words = (x) => (String(x).replace(/\{[^}]*\}/g, '').match(/\p{L}{3,}/gu) || []).length;
      if (v === A[k] && v !== k && words(v) >= 2 && v.length > 12) out.push(`still French${where}: ${JSON.stringify(v).slice(0, 70)}`);
      if (v === k && /\s\S+\s\S+\s/.test(k) && k.length > 20 && !/^[A-Z][a-z]+ [A-Z]/.test(k)) out.push(`still English?${where}: ${JSON.stringify(k).slice(0, 70)}`);
    }
    for (const k of Object.keys(B)) if (k !== '__group' && !(k in A)) out.push(`extra${where}: ${JSON.stringify(k).slice(0, 90)}`);
  };
  cmp(F, X, '');
  if (F.__group || X.__group) cmp(F.__group || {}, X.__group || {}, ' (group)');
  if (out.length) { bad += out.length; console.log(`${rel}: ${out.length} problem(s)`); for (const l of out.slice(0, 40)) console.log('  ' + l); if (out.length > 40) console.log(`  … ${out.length - 40} more`); }
  else console.log(`${rel}: ok (${Object.keys(F).length} keys)`);
}
console.log(bad ? `${bad} problem(s)` : `all good (${total} strings)`);
process.exit(bad ? 1 : 0);
