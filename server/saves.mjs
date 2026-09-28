// Optional private backups. Capability keys are hashed; bodies and keys are never logged.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { validateSave, SAVE_LIMIT } from '../src/party/saves.mjs';
const hash = (secret) => crypto.createHash('sha256').update(secret).digest('hex');
const same = (a, b) => typeof a === 'string' && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
export function createSaveStore({ dir = '', maxSaves = 2000, ttl = 90 * 86400000 } = {}) {
  let queue = Promise.resolve();
  const ready = dir ? fs.mkdir(dir, { recursive: true, mode: 0o700 }) : Promise.resolve();
  const run = (fn) => { const result = queue.then(() => ready).then(fn); queue = result.catch(() => {}); return result; };
  const failure = (status, message) => Object.assign(new Error(message), { status });
  const filename = (id) => path.join(dir, id + '.json');
  const read = async (id, secret) => {
    if (!/^[a-f0-9]{32}$/.test(id) || !/^[a-f0-9]{48}$/.test(secret)) throw failure(404, 'Save not found');
    let record; try { record = JSON.parse(await fs.readFile(filename(id), 'utf8')); } catch { throw failure(404, 'Save not found'); }
    if (!same(record.hash, hash(secret)) || Date.now() - record.updatedAt > ttl) throw failure(404, 'Save not found');
    return record;
  };
  const write = async (id, record) => {
    const dest = filename(id), tmp = dest + '.tmp';
    await fs.writeFile(tmp, JSON.stringify(record), { mode: 0o600 });
    await fs.rename(tmp, dest);
  };
  return {
    handle(req, res, { id, origin, permitted, rate }) {
      const json = (status, data) => { if (!res.writableEnded && !res.destroyed) { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); } };
      if (!permitted) { req.resume(); json(403, { error: 'Origin not allowed' }); return; }
      if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
      if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type, If-Match', 'Access-Control-Max-Age': '600' }); res.end(); return; }
      if (!dir) { req.resume(); json(503, { error: 'Online backups are not enabled on this server' }); return; }
      if (!rate || !rate.take()) { req.resume(); json(429, { error: 'Please wait before trying again' }); return; }
      const method = req.method, secret = (req.headers.authorization || '').replace(/^Bearer /, '');
      if (!['GET', 'POST', 'PUT', 'DELETE'].includes(method) || (method === 'POST' ? !!id : !id)) { req.resume(); json(405, { error: 'Method not allowed' }); return; }
      const execute = async (snapshot) => run(async () => {
        if (method === 'POST') {
          let count = 0;
          for (const file of await fs.readdir(dir)) if (/^[a-f0-9]{32}\.json$/.test(file)) {
            const info = await fs.stat(path.join(dir, file));
            if (Date.now() - info.mtimeMs > ttl) await fs.unlink(path.join(dir, file)); else count++;
          }
          if (count >= maxSaves) throw failure(503, 'Online backup storage is full');
          const newId = crypto.randomBytes(16).toString('hex'), newSecret = crypto.randomBytes(24).toString('hex');
          await write(newId, { hash: hash(newSecret), revision: 1, updatedAt: Date.now(), snapshot });
          return { status: 201, body: { key: newId + '.' + newSecret, revision: 1 } };
        }
        const record = await read(id, secret);
        if (method === 'GET') return { status: 200, body: { revision: record.revision, snapshot: record.snapshot } };
        if (method === 'DELETE') { await fs.unlink(filename(id)); return { status: 200, body: { deleted: true } }; }
        if (String(record.revision) !== req.headers['if-match']) throw failure(409, 'A newer online save exists. Restore it before saving again.');
        record.snapshot = snapshot; record.revision++; record.updatedAt = Date.now();
        await write(id, record);
        return { status: 200, body: { revision: record.revision } };
      }).then(({ status, body }) => json(status, body)).catch((e) => json(e.status || 503, { error: e.status ? e.message : 'Online save unavailable' }));
      if (method === 'GET' || method === 'DELETE') { req.resume(); execute(); return; }
      if (!String(req.headers['content-type'] || '').startsWith('application/json')) { req.resume(); json(415, { error: 'JSON required' }); return; }
      let bytes = 0, chunks = [], oversize = false;
      req.on('data', (chunk) => {
        bytes += chunk.length;
        if (bytes > SAVE_LIMIT) { if (!oversize) json(413, { error: 'Save is too large' }); oversize = true; chunks = []; }
        else if (!oversize) chunks.push(chunk);
      });
      req.on('end', () => {
        if (oversize) return;
        let snapshot; try { snapshot = validateSave(Buffer.concat(chunks).toString('utf8')); } catch { json(400, { error: 'Invalid save' }); return; }
        execute(snapshot);
      });
    },
    close: () => queue,
  };
}
