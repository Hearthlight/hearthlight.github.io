import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import WebSocket from 'ws';
import http from 'node:http';
import crypto from 'node:crypto';
import { createRelay } from './relay.mjs';
import { createStats } from './stats.mjs';

async function fixture(t, opts = {}) {
  const relay = createRelay({ host: '127.0.0.1', port: 0, quiet: true, ...opts });
  await relay.listen();
  const port = relay.server.address().port;
  const peers = [];
  t.after(async () => { for (const p of peers) p.ws.terminate(); await relay.close(); });
  const connect = async (query, options = {}) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?${query}`, options);
    const queue = [], waiting = [];
    ws.on('error', () => {});
    ws.on('message', (data, binary) => {
      const m = binary ? { t: 'frame', data } : JSON.parse(data), i = waiting.findIndex((w) => w.type === m.t);
      if (i < 0) queue.push(m);
      else { const w = waiting.splice(i, 1)[0]; clearTimeout(w.timer); w.resolve(m); }
    });
    const peer = { ws, next(type) {
      const i = queue.findIndex((m) => m.t === type);
      if (i >= 0) return Promise.resolve(queue.splice(i, 1)[0]);
      return new Promise((resolve, reject) => {
        const w = { type, resolve, timer: setTimeout(() => reject(new Error('Timed out waiting for ' + type)), 2000) };
        waiting.push(w);
      });
    } };
    peers.push(peer);
    await once(ws, 'open');
    return peer;
  };
  return { relay, connect, http: `http://127.0.0.1:${port}` };
}

test('invalid visit bodies return 400 and the server still accepts valid visits', async (t) => {
  const f = await fixture(t);
  for (const body of ['null', '[]', '"hello"', '{', '{"lang":{}}']) {
    assert.equal((await fetch(f.http + '/hello', { method: 'POST', body })).status, 400);
  }
  assert.equal((await fetch(f.http + '/hello', { method: 'POST', body: '{"lang":"fr","platform":"computer"}' })).status, 204);
  assert.equal(await (await fetch(f.http + '/health')).text(), 'ok');
});

for (const [name, payload] of [['JSON null', 'null'], ['oversize frame', 'x'.repeat((1 << 20) + 1)]]) {
  test(`${name} closes only the offending WebSocket`, async (t) => {
    const f = await fixture(t), host = await f.connect('role=host');
    await host.next('room');
    const closed = once(host.ws, 'close');
    host.ws.send(payload);
    await closed;
    assert.equal((await fetch(f.http + '/health')).status, 200);
    assert.ok((await (await f.connect('role=host')).next('room')).code);
  });
}

test('host and pad exchange messages in both directions', async (t) => {
  const f = await fixture(t), host = await f.connect('role=host'), room = await host.next('room');
  const pad = await f.connect(`role=pad&code=${room.code}&id=phone`);
  assert.equal((await pad.next('hello')).host, true);
  pad.ws.send(JSON.stringify({ t: 'input', x: 1 }));
  assert.deepEqual((await host.next('msg')).d, { t: 'input', x: 1 });
  host.ws.send(JSON.stringify({ t: 'send', id: '*', d: { t: 'state', n: 7 } }));
  assert.equal((await pad.next('state')).n, 7);
});

test('a room code alone cannot take over a disconnected host', async (t) => {
  const f = await fixture(t), host = await f.connect('role=host'), room = await host.next('room');
  const pad = await f.connect(`role=pad&code=${room.code}&id=phone`); await pad.next('hello');
  host.ws.close(); await pad.next('hostgone');
  const intruder = await f.connect(`role=host&code=${room.code}`), rejected = once(intruder.ws, 'close');
  intruder.ws.send(JSON.stringify({ t: 'resume', token: 'wrong' }));
  assert.equal((await rejected)[0], 1008);
  const owner = await f.connect(`role=host&code=${room.code}`);
  owner.ws.send(JSON.stringify({ t: 'resume', token: room.token }));
  assert.equal((await owner.next('room')).code, room.code);
  await pad.next('hostback');
});

test('per-IP room limits leave capacity for other networks', async (t) => {
  const f = await fixture(t, { maxRooms: 10, maxRoomsPerIp: 1 });
  await (await f.connect('role=host', { headers: { 'X-Real-IP': '192.0.2.1' } })).next('room');
  assert.equal((await (await f.connect('role=host', { headers: { 'X-Real-IP': '192.0.2.1' } })).next('error')).code, 'limit');
  assert.ok((await (await f.connect('role=host', { headers: { 'X-Real-IP': '192.0.2.2' } })).next('room')).code);
});

test('connection attempts are rate limited across reconnects', async (t) => {
  const f = await fixture(t, { connectionRate: [0, 1] });
  const host = await f.connect('role=host'); await host.next('room');
  await assert.rejects(f.connect('role=pad&code=AAAA'), /429/);
});

test('an unrelated browser origin is rejected on a LAN relay', async (t) => {
  const f = await fixture(t);
  await assert.rejects(f.connect('role=host', { origin: 'https://example.invalid' }), /403/);
});

test('stats require a header token through the proxy and never accept a query token', async (t) => {
  const f = await fixture(t, { statsToken: 'test-only-dashboard-token' });
  const headers = { 'X-Real-IP': '192.0.2.1' };
  assert.equal((await fetch(f.http + '/stats', { headers })).status, 403);
  assert.equal((await fetch(f.http + '/stats?token=test-only-dashboard-token', { headers })).status, 403);
  headers.Authorization = 'Bearer test-only-dashboard-token';
  assert.equal((await fetch(f.http + '/stats', { headers })).status, 200);
  const spoofed = await new Promise((resolve, reject) => {
    http.get(f.http + '/stats', { headers: { Host: 'example.invalid' } }, (res) => { res.resume(); resolve(res.statusCode); }).on('error', reject);
  });
  assert.equal(spoofed, 403);
  assert.equal((await fetch(f.http + '/dash')).status, 200);
});

test('static serving rejects malformed paths, hidden files and escaping symlinks', async (t) => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'hearthlight-static-')));
  fs.writeFileSync(path.join(dir, 'index.html'), 'test page');
  fs.writeFileSync(path.join(dir, '.env'), 'not public');
  fs.symlinkSync('/etc/hosts', path.join(dir, 'outside.txt'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const f = await fixture(t, { static: dir });
  assert.equal(await (await fetch(f.http + '/')).text(), 'test page');
  assert.equal((await fetch(f.http + '/%E0%A4%A')).status, 400);
  assert.equal((await fetch(f.http + '/.env')).status, 403);
  assert.equal((await fetch(f.http + '/outside.txt')).status, 403);
  assert.equal((await fetch(f.http + '/health')).status, 200);
});

test('a slow receiver is disconnected when its outgoing queue is full', async (t) => {
  const f = await fixture(t, { maxBufferedBytes: 256 }), host = await f.connect('role=host');
  const room = await host.next('room'), pad = await f.connect(`role=pad&code=${room.code}&id=phone`);
  await pad.next('hello');
  const closed = once(pad.ws, 'close');
  host.ws.send(JSON.stringify({ t: 'send', id: 'phone', d: { t: 'state', text: 'x'.repeat(300) } }));
  await closed;
  assert.equal((await fetch(f.http + '/health')).status, 200);
});

test('untrusted counter labels cannot overwrite prototypes or grow without a bound', async (t) => {
  const stats = await createStats(); t.after(() => stats.close());
  stats.visit({ ip: '192.0.2.1', platform: '__proto__', lang: 'fr' });
  for (let i = 0; i < 400; i++) stats.visit({ ip: '192.0.2.1', platform: 'platform-' + i, lang: 'fr' });
  const counts = stats.snapshot(1).total.platform;
  assert.equal(counts.__proto__, 1);
  assert.ok(Object.keys(counts).length <= 257);
  assert.equal(Object.values(counts).reduce((a, b) => a + b, 0), 401);
});

test('a brief disconnect of everyone keeps the room and only its owner can resume it', async (t) => {
  const f = await fixture(t, { roomGraceMs: 100 }), host = await f.connect('role=host'), room = await host.next('room');
  const closed = once(host.ws, 'close'); host.ws.close(); await closed;
  assert.ok(f.relay.rooms.has(room.code));
  const owner = await f.connect(`role=host&code=${room.code}`); owner.ws.send(JSON.stringify({ t: 'resume', token: room.token }));
  assert.equal((await owner.next('room')).code, room.code);
  const ended = once(owner.ws, 'close'); owner.ws.close(); await ended;
  await new Promise((r) => setTimeout(r, 140));
  assert.ok(!f.relay.rooms.has(room.code));
});
test('ending a party tells guests to stop reconnecting and releases its room immediately', async (t) => {
  const f = await fixture(t), host = await f.connect('role=host'), room = await host.next('room');
  const pad = await f.connect(`role=pad&code=${room.code}&id=phone`); await pad.next('hello');
  host.ws.send(JSON.stringify({ t: 'end' })); await pad.next('ended');
  assert.ok(!f.relay.rooms.has(room.code));
});
test('remote video is opt-in per guest and cannot be sent by a guest', async (t) => {
  const f = await fixture(t), host = await f.connect('role=host'), room = await host.next('room');
  const pad = await f.connect(`role=pad&code=${room.code}&id=remote`); await pad.next('hello');
  assert.equal(f.relay.rooms.get(room.code).pads.get('remote').remoteView, undefined);
  host.ws.send(JSON.stringify({ t: 'remote', id: 'remote', on: true }));
  host.ws.send(JSON.stringify({ t: 'send', id: 'remote', d: { t: 'barrier' } })); await pad.next('barrier');
  assert.equal(f.relay.rooms.get(room.code).pads.get('remote').remoteView, true);
  const phone = await f.connect(`role=pad&code=${room.code}&id=ordinary`); await phone.next('hello');
  let leaked = false; phone.ws.on('message', (_, binary) => { if (binary) leaked = true; });
  const image = Buffer.from([255,216,255,217]); host.ws.send(image);
  assert.deepEqual((await pad.next('frame')).data, image);
  host.ws.send(JSON.stringify({ t: 'send', id: 'ordinary', d: { t: 'barrier' } })); await phone.next('barrier');
  assert.equal(leaked, false);
  const closed = once(pad.ws, 'close'); pad.ws.send(Buffer.from([255,216,255,217])); assert.equal((await closed)[0], 1009);
  assert.equal((await fetch(f.http + '/health')).status, 200);
});

test('TURN credentials are short-lived and issued only to room owners', async (t) => {
  const secret = 'test-only-turn-secret', urls = 'turn:example.invalid:3478';
  const f = await fixture(t, { turnSecret: secret, turnUrls: urls });
  const host = await f.connect('role=host'), room = await host.next('room');
  const ice = room.iceServers[0], expiry = Number(ice.username.split(':')[0]);
  assert.deepEqual(ice.urls, [urls]);
  assert.equal(ice.credential, crypto.createHmac('sha1', secret).update(ice.username).digest('base64'));
  assert.ok(expiry > Date.now() / 1000 && expiry <= Date.now() / 1000 + 12 * 3600);
  const pad = await f.connect(`role=pad&code=${room.code}&id=phone`);
  assert.equal((await pad.next('hello')).iceServers, undefined);
});
