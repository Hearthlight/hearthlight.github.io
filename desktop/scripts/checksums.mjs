import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const dir = path.resolve(import.meta.dirname, '../dist');
const files = fs.readdirSync(dir).filter((f) => /\.(dmg|exe|AppImage)$/.test(f)).sort();
if (!files.length) throw new Error('No release files found');
fs.writeFileSync(path.join(dir, `SHA256SUMS-${process.platform}.txt`), files.map((f) => `${crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, f))).digest('hex')}  ${f}\n`).join(''));
