import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRelay } from './relay.mjs';
import { exportSave, importSave, validateSave } from '../src/party/saves.mjs';

const snapshot = (chapter = 2) => ({ format: 'hearthlight', version: 1, savedAt: Date.now(), data: { 'hearthlight.party.saga.v1': JSON.stringify({ v: 1, ch: chapter, q: {}, f: {} }) } });
class Storage {
  constructor(data = {}) { this.data = new Map(Object.entries(data)); }
  get length() { return this.data.size; }
  key(i) { return [...this.data.keys()][i]; }
  getItem(k) { return this.data.get(k) ?? null; }
  setItem(k, v) { this.data.set(k, v); }
  removeItem(k) { this.data.delete(k); }
}
test('portable saves keep progress and fog, exclude credentials, and preserve an unrelated solo save', () => {
  const store = new Storage({ ...snapshot().data, 'hearthlight.party.fog.v1': 'AAABAA==', 'hl.partyToken': 'owner-secret', 'hearthlight.cloud.v1': 'recovery-secret' });
  const backup = exportSave(store);
  assert.deepEqual(Object.keys(backup.data).sort(), ['hearthlight.party.fog.v1', 'hearthlight.party.saga.v1']);
  const target = new Storage({ 'hearthlight.save.v1': '{"version":1}', 'hearthlight.party.races.v1': '{}' });
  importSave(backup, target);
  assert.equal(target.getItem('hearthlight.save.v1'), '{"version":1}');
  assert.equal(target.getItem('hearthlight.party.races.v1'), null);
  assert.equal(target.getItem('hearthlight.party.fog.v1'), 'AAABAA==');
});
test('an invalid or oversized backup cannot overwrite storage', () => {
  for (const save of [ { ...snapshot(), version: 9 }, { ...snapshot(), data: { 'hl.partyToken': '"x"' } }, { ...snapshot(), data: { 'hearthlight.party.v1': '{"__proto__":{"polluted":true}}' } }, { ...snapshot(), data: { 'hearthlight.party.v1': '"' + 'x'.repeat(2 * 1024 * 1024) + '"' } } ]) assert.throws(() => validateSave(save));
  assert.equal({}.polluted, undefined);
});
test('an import rolls back when a storage write fails', () => {
  const original = snapshot(1).data, store = new Storage(original), set = store.setItem.bind(store);
  let failed = false; store.setItem = (k, v) => { if (!failed) { failed = true; throw new Error('quota'); } set(k, v); };
  assert.throws(() => importSave(snapshot(3), store), /quota/);
  assert.deepEqual(Object.fromEntries(store.data), original);
});
async function fixture(t, opts = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hearthlight-saves-'));
  const relay = createRelay({ host: '127.0.0.1', port: 0, quiet: true, savesDir: dir, ...opts }); await relay.listen();
  t.after(async () => { await relay.close(); await fs.rm(dir, { recursive: true, force: true }); });
  return { dir, base: `http://127.0.0.1:${relay.server.address().port}/saves` };
}
test('online saves survive a new server instance, require the recovery key, and reject stale writes', async (t) => {
  const f = await fixture(t);
  const created = await fetch(f.base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(snapshot()) });
  assert.equal(created.status, 201); const { key, revision } = await created.json(), [id, secret] = key.split('.');
  const url = f.base + '/' + id, headers = { Authorization: 'Bearer ' + secret, 'Content-Type': 'application/json', 'If-Match': String(revision) };
  assert.equal((await fetch(url)).status, 404);
  assert.equal((await fetch(url, { headers: { Authorization: 'Bearer ' + '0'.repeat(48) } })).status, 404);
  assert.equal((await fetch(url, { method: 'PUT', headers, body: JSON.stringify(snapshot(3)) })).status, 200);
  assert.equal((await fetch(url, { method: 'PUT', headers, body: JSON.stringify(snapshot(4)) })).status, 409);
  const disk = await fs.readFile(path.join(f.dir, id + '.json'), 'utf8'); assert.ok(!disk.includes(secret));
  assert.equal((await fs.stat(path.join(f.dir, id + '.json'))).mode & 0o777, 0o600);
  const other = createRelay({ host: '127.0.0.1', port: 0, quiet: true, savesDir: f.dir }); await other.listen(); t.after(() => other.close());
  const loaded = await (await fetch(`http://127.0.0.1:${other.server.address().port}/saves/${id}`, { headers })).json();
  assert.equal(loaded.revision, 2); assert.equal(JSON.parse(loaded.snapshot.data['hearthlight.party.saga.v1']).ch, 3);
});
test('online storage enforces its quota and rejects foreign browser origins and invalid payloads', async (t) => {
  const f = await fixture(t, { maxSaves: 1 });
  const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(snapshot()) };
  assert.equal((await fetch(f.base, { ...options, headers: { ...options.headers, Origin: 'https://evil.invalid' } })).status, 403);
  assert.equal((await fetch(f.base, { ...options, body: 'null' })).status, 400);
  assert.equal((await fetch(f.base, options)).status, 201);
  assert.equal((await fetch(f.base, options)).status, 503);
  assert.equal((await fs.readdir(f.dir)).filter((f) => f.endsWith('.json')).length, 1);
});
