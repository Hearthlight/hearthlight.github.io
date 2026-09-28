// Copy the game (and the relay) into the app before running or packaging it: desktop/game/ holds
// index.html, pad.html, config.js, src/ and vendor/; desktop/relay.mjs is server/relay.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, '..'), root = path.resolve(app, '..'), out = path.join(app, 'game');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const f of ['index.html', 'pad.html', 'config.js']) fs.copyFileSync(path.join(root, f), path.join(out, f));
for (const d of ['src', 'vendor']) fs.cpSync(path.join(root, d), path.join(out, d), { recursive: true });
fs.copyFileSync(path.join(root, 'server/relay.mjs'), path.join(app, 'relay.mjs'));
let n = 0;
const count = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.isDirectory()) count(path.join(d, e.name)); else n++; } };
count(out);
console.log(`game copied: ${n} files → ${path.relative(root, out)}`);
