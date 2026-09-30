// Find English strings that have no translation yet — in every language (Release v9: French,
// Spanish, German, Italian), and the lines said to the whole party (`__group`) each language has.
//   node tools/i18n-scan.mjs              summary per language, per file
//   node tools/i18n-scan.mjs src/story    only files under a path
//   node tools/i18n-scan.mjs --list       print every missing string
//   node tools/i18n-scan.mjs --lang=de    one language only
//
// It looks at: t()/tn() calls, say()/ask()/choose()/showLetter() texts,
// toast()/showBanner() texts, and every prose-looking string in the data
// modules (items, villager lines, letters, npcs, quests).
import fs from 'node:fs';
import path from 'node:path';
const LANGS = { fr: ['FR', 'FR_GROUP'], es: ['ES', 'ES_GROUP'], de: ['DE', 'DE_GROUP'], it: ['IT', 'IT_GROUP'] };

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const list = args.includes('--list');
const only = args.find((a) => !a.startsWith('--'));
const oneLang = (args.find((a) => a.startsWith('--lang=')) || '').slice(7);
const DATA = ['src/data/items.js', 'src/story/lines.js', 'src/story/letters.js', 'src/data/npcs.js', 'src/saga/cast.js', 'src/saga/pelican.js'];
// (World v7) the saga's chapters: every prose-looking string is shown somewhere
const DATA_DIRS = ['src/saga/chapters/', 'src/saga/dungeons/'];
// newer modules keep their on-screen text in object tables: label / sub /
// name / desc / title / hint / action / unit / text properties are shown
const PROPS = ['src/party/host.js', 'src/party/zones.js', 'src/party/vehicles.js', 'src/party/swim.js', 'src/party/mounts.js', 'src/world/big/', 'src/party/v3/', 'src/combat/v3/', 'src/combat/v4/', 'src/party/camp.js', 'src/world/wildrooms.js', 'src/party/rooms.js', 'src/combat/v5/', 'src/party/dinos.js', 'src/party/buddies.js', 'src/combat/v7/', 'src/combat/classes.js', 'src/combat/v9/'];

function walk(dir) {
  const out = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) { if (!['lang'].includes(f.name)) out.push(...walk(p)); }
    else if (f.name.endsWith('.js')) out.push(p);
  }
  return out;
}

// JS string literal contents (no template substitutions)
const LIT = String.raw`'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"|` + '`((?:\\\\.|[^`\\\\$])*)`';
const unesc = (s) => s.replace(/\\(['"`\\])/g, '$1').replace(/\\n/g, '\n');
const litOf = (m) => unesc(m[1] ?? m[2] ?? m[3] ?? '');
const prose = (s) => /[A-Za-z]/.test(s) && (/\s/.test(s) || /^[A-Z]/.test(s)) && !/^[a-z0-9_.\-/]+$/.test(s);

const found = new Map(); // string -> Set(files)
const note = (s, f) => { if (!s || !prose(s)) return; if (!found.has(s)) found.set(s, new Set()); found.get(s).add(f); };

for (const file of walk(path.join(root, 'src'))) {
  const rel = path.relative(root, file);
  if (only && !rel.startsWith(only)) continue;
  // (whole-line comments hold examples, not on-screen text)
  const src = fs.readFileSync(file, 'utf8').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
  if (DATA.includes(rel) || DATA_DIRS.some((d) => rel.startsWith(d))) {
    const re = new RegExp(LIT, 'g');
    let m;
    while ((m = re.exec(src))) {
      const s = litOf(m);
      // skip import paths & object keys used as ids
      if (/^\.\.?\//.test(s)) continue;
      note(s, rel);
    }
    continue;
  }
  const calls = [
    ...(PROPS.some((p) => rel.startsWith(p)) ? [new RegExp(String.raw`\b(?:label|sub|name|desc|title|hint|action|unit|text|a|b|x|y|the|role|kit|ready)\s*:\s*(?:${LIT})`, 'g')] : []),
    new RegExp(String.raw`\bt\(\s*(?:${LIT})`, 'g'),
    // (a choice between two texts: t(on ? 'Shown' : 'Hidden'), t(a ? 'x' : b ? 'y' : 'z'))
    new RegExp(String.raw`\bt\(\s*[\w.!\s=<>&|]*?\?\s*(?:${LIT})\s*:\s*(?:(?:${LIT})|[\w.!\s=<>&|]*?\?\s*(?:${LIT})\s*:\s*(?:${LIT}))`, 'g'),
    new RegExp(String.raw`\btn\(\s*(?:${LIT})\s*,\s*(?:${LIT})`, 'g'),
    new RegExp(String.raw`\b(?:say|showLetter|toast|showBanner)\(\s*(?:[^,()'"\x60]+|'[^']*'|"[^"]*"|null)\s*,\s*(?:${LIT})`, 'g'),
    new RegExp(String.raw`\b(?:toast|showBanner)\(\s*(?:${LIT})`, 'g'),
  ];
  for (const re of calls) {
    let m;
    while ((m = re.exec(src))) {
      for (let i = 1; i < m.length; i += 3) { const s = unesc(m[i] ?? m[i + 1] ?? m[i + 2] ?? ''); if (s) note(s, rel); }
    }
  }
}

let fails = 0, frGroup = null;
for (const [code, [dn, gn]] of Object.entries(LANGS)) {
  if (oneLang && code !== oneLang) continue;
  const file = path.join(root, `src/lang/${code}/index.js`);
  if (!fs.existsSync(file)) { console.log(`[${code}] no dictionary yet`); fails++; continue; }
  const mod = await import(file), D = mod[dn], G = mod[gn] || {};
  if (code === 'fr') frGroup = G;
  const miss = [...found.entries()].filter(([s]) => D[s] === undefined);
  const byFile = new Map();
  for (const [s, files] of miss) for (const f of files) byFile.set(f, (byFile.get(f) || 0) + 1);
  // (the party's plural: every line French says with « vous » needs its ustedes / ihr / voi)
  const ref = frGroup || (await import(path.join(root, 'src/lang/fr/index.js'))).FR_GROUP;
  const gmiss = code === 'fr' ? [] : Object.keys(ref).filter((k) => G[k] === undefined);
  console.log(`[${code}] ${found.size} strings found, ${found.size - miss.length} translated, ${miss.length} missing` + (code === 'fr' ? '' : ` · party lines ${Object.keys(ref).length - gmiss.length}/${Object.keys(ref).length}`));
  for (const [f, n] of [...byFile.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${f}`);
  if (list) { for (const [s, files] of miss) console.log(JSON.stringify(s), ' <-', [...files].join(', ')); for (const k of gmiss) console.log('(party) ' + JSON.stringify(k)); }
  fails += miss.length + gmiss.length;
}
process.exitCode = fails ? 1 : 0;
