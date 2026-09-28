// Hearthlight's Party relay, for production: the online server (behind nginx on the VPS) and the
// desktop app (built in, serving the game to the phones on the same Wi-Fi). The big screen hosts a
// room with a 4-letter code, phones join it as pads; pad messages go to the host, the host's to
// any pad. Nothing else: no screenshots, no recordings (that's tools/devserver.py, for making the
// game) — and limits: rooms, pads per room, message size and rate, allowed origins, idle ends.
//
//   node server/relay.mjs [--port 8787] [--host 127.0.0.1] [--static <dir>] [--lan]
// Settings (flags or environment): PORT, HOST, STATIC (serve the game from there too), LAN=1 (the
// /__lan answer the game asks for, for the desktop app), MAX_ROOMS (150), MAX_PADS (16),
// ORIGINS (comma-separated; otherwise same-origin browsers), STATS_TOKEN (Bearer auth for
// /stats), STATS_DIR (where the daily usage counters are kept), GEO_DB (a country .mmdb).
// GET /health → ok · POST /hello (the game loaded) · GET /stats → now + the days' counters ·
// GET /dash → a dashboard of them (stats.mjs, dash.html).

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { createStats } from './stats.mjs';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json' };

export function lanIps() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) for (const a of list || []) if (a.family === 'IPv4' && !a.internal) out.push(a.address);
  // (a home network first: 192.168…, then 10…, then the rest)
  return out.sort((a, b) => rank(a) - rank(b));
}
const rank = (ip) => (ip.startsWith('192.168.') ? 0 : ip.startsWith('10.') ? 1 : ip.startsWith('172.') ? 2 : 3);
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const sameToken = (a, b) => typeof a === 'string' && typeof b === 'string' && !!a && Buffer.byteLength(a) === Buffer.byteLength(b) && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

// a token bucket: `rate` a second, `burst` at once
class Bucket {
  constructor(rate, burst) { this.rate = rate; this.burst = burst; this.n = burst; this.t = Date.now(); }
  take() {
    const now = Date.now();
    this.n = Math.min(this.burst, this.n + ((now - this.t) / 1000) * this.rate);
    this.t = now;
    if (this.n < 1) return false;
    this.n -= 1;
    return true;
  }
}

export function createRelay(opts = {}) {
  const env = process.env;
  const O = {
    port: +(opts.port ?? env.PORT ?? 8787),
    host: opts.host ?? env.HOST ?? '127.0.0.1',
    static: opts.static ?? env.STATIC ?? '',
    lan: !!(opts.lan ?? (env.LAN === '1')),
    maxRooms: +(opts.maxRooms ?? env.MAX_ROOMS ?? 150),
    maxPads: +(opts.maxPads ?? env.MAX_PADS ?? 16),
    maxRoomsPerIp: +(opts.maxRoomsPerIp ?? env.MAX_ROOMS_PER_IP ?? 8),
    maxConnectionsPerIp: +(opts.maxConnectionsPerIp ?? env.MAX_CONNECTIONS_PER_IP ?? 128),
    connectionRate: opts.connectionRate ?? [0.5, 60], // 30 handshakes/minute, burst 60 per IP
    maxBufferedBytes: opts.maxBufferedBytes ?? (2 << 20),
    origins: (opts.origins ?? env.ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    statsToken: opts.statsToken ?? env.STATS_TOKEN ?? '',
    statsDir: opts.statsDir ?? env.STATS_DIR ?? '',     // (daily counters kept there; none: in memory only)
    geoDb: opts.geoDb ?? env.GEO_DB ?? '',              // (a country database, .mmdb: db-ip.com's free one)
    hostMsgMax: 1 << 20,          // (the phone's world map is ~0.6 MB, once)
    padMsgMax: 16 << 10,
    padRate: [120, 240],          // messages a second, burst (a stick sends ~30/s)
    hostRate: [1500, 3000],       // (the big screen talks to eight phones)
    idleMs: 30 * 60 * 1000,       // nothing from a connection for that long: goodbye
    quiet: !!opts.quiet,
  };
  const rooms = new Map();
  const clients = new Map(); // IPs are held in memory only; inactive entries expire after five minutes.
  const stats = { msgs: 0, bytes: 0, conns: 0, rejected: 0, t0: Date.now(), rate: 0, bps: 0, peakRooms: 0 };
  const log = (...a) => { if (!O.quiet) console.log(new Date().toISOString(), ...a); };
  // (the usage counters: visits, parties, players, where from — see stats.mjs)
  let usage = null;
  createStats({ dir: O.statsDir, geoDb: O.geoDb, log }).then((u) => { usage = u; }, (e) => log('no stats: ' + e.message));
  // the visitor's address, only to know their country (behind nginx: its X-Real-IP)
  const ipOf = (req) => {
    const a = String(req.socket.remoteAddress || '').replace(/^::ffff:/, '');
    return (a === '127.0.0.1' || a === '::1') && req.headers['x-real-ip'] ? String(req.headers['x-real-ip']) : a;
  };
  const allowed = (req) => {
    const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)
      && /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(req.headers.host || '')
      && !req.headers['x-real-ip'] && !req.headers['x-forwarded-for']
      && (!req.headers.origin || req.headers.origin === `http://${req.headers.host}`);
    const auth = req.headers.authorization || '';
    return local || (auth.startsWith('Bearer ') && sameToken(O.statsToken, auth.slice(7)));
  };
  const clientFor = (ip) => {
    if (!clients.has(ip)) {
      if (clients.size >= 10000) return null;
      clients.set(ip, { connections: 0, rooms: 0, bucket: new Bucket(...O.connectionRate), hello: new Bucket(0.2, 6), last: Date.now() });
    }
    const client = clients.get(ip); client.last = Date.now(); return client;
  };
  const peaks = () => { if (usage) { let pads = 0; for (const r of rooms.values()) pads += r.pads.size; usage.peak(rooms.size, stats.conns, pads); } };

  const newCode = () => {
    for (let i = 0; i < 1000; i++) {
      let c = '';
      for (let k = 0; k < 4; k++) c += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
      if (!rooms.has(c)) return c;
    }
    return null;
  };
  const send = (ws, payload) => {
    if (!ws || ws.readyState !== 1) return;
    if (ws.bufferedAmount + Buffer.byteLength(payload) > O.maxBufferedBytes) { ws.terminate(); return; }
    ws.send(payload, (err) => { if (err) ws.terminate(); });
  };
  const sendJson = (ws, o) => send(ws, JSON.stringify(o));
  const count = (n) => { stats.msgs++; stats.bytes += n; };

  // ------------------------------------------------------------------ http: health, stats, the game
  const server = http.createServer((req, res) => {
    req.on('error', () => res.destroy());
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    let url;
    try { url = new URL(req.url, 'http://x'); } catch { res.writeHead(400); res.end(); return; }
    if (url.pathname === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('ok'); return; }
    // the game says hello when it loads (navigator.sendBeacon: a small text/plain JSON)
    if (url.pathname === '/hello' && req.method === 'POST') {
      const client = clientFor(ipOf(req));
      if (!client || !client.hello.take()) { res.writeHead(429); res.end(); req.resume(); return; }
      let body = '', bytes = 0;
      req.on('data', (d) => { bytes += d.length; if (bytes > 2048) { req.destroy(); return; } body += d; });
      req.on('end', () => {
        let m;
        try { m = JSON.parse(body || '{}'); } catch { res.writeHead(400); res.end(); return; }
        if (!object(m) || (m.lang !== undefined && typeof m.lang !== 'string') || (m.platform !== undefined && typeof m.platform !== 'string')) { res.writeHead(400); res.end(); return; }
        if (usage) usage.visit({ ip: ipOf(req), origin: req.headers.origin, lang: m.lang, platform: m.platform });
        res.writeHead(204, { 'Access-Control-Allow-Origin': req.headers.origin || '*', 'Cache-Control': 'no-store' });
        res.end();
      });
      return;
    }
    if (url.pathname === '/stats') {
      if (!allowed(req)) { res.writeHead(403); res.end(); return; }
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      const days = Math.max(1, Math.min(365, Math.floor(Number(url.searchParams.get('days')) || 30)));
      res.end(JSON.stringify({ now: snapshot(), usage: usage ? usage.snapshot(days) : null }));
      return;
    }
    // Public sign-in page; all private data remains behind /stats authentication.
    if (url.pathname === '/dash') {
      fs.readFile(new URL('./dash.html', import.meta.url), (err, html) => {
        res.writeHead(err ? 500 : 200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(err ? 'no dashboard' : html);
      });
      return;
    }
    if (url.pathname === '/__lan' && O.lan) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ ips: lanIps(), port: server.address().port, open: true }));
      return;
    }
    if (O.static) { serveFile(O.static, url.pathname, res); return; }
    res.writeHead(404); res.end();
  });

  function serveFile(root, pathname, res) {
    let rel;
    try { rel = decodeURIComponent(pathname); } catch { res.writeHead(400); res.end(); return; }
    if (rel.includes('\0') || rel.split(/[\\/]/).some((part) => part.startsWith('.'))) { res.writeHead(403); res.end(); return; }
    if (rel.endsWith('/')) rel += 'index.html';
    try { root = fs.realpathSync(root); } catch { res.writeHead(404); res.end(); return; }
    const file = path.normalize(path.join(root, rel));
    if (!file.startsWith(path.normalize(root + path.sep)) && file !== path.normalize(root)) { res.writeHead(403); res.end(); return; }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('not found'); return; }
      fs.realpath(file, (error, actual) => {
        if (error || !actual.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': 'no-cache' });
        const stream = fs.createReadStream(file);
        stream.on('error', () => res.destroy());
        stream.pipe(res);
      });
    });
  }

  // ------------------------------------------------------------------ the relay
  const wss = new WebSocketServer({ noServer: true, perMessageDeflate: false, maxPayload: O.hostMsgMax });
  server.on('upgrade', (req, socket, head) => {
    socket.on('error', () => socket.destroy());
    let url;
    try { url = new URL(req.url, 'http://x'); } catch { socket.destroy(); return; }
    if (url.pathname !== '/ws') { socket.destroy(); return; }
    if (O.origins.length && !O.origins.includes(req.headers.origin || '')) { stats.rejected++; socket.write('HTTP/1.1 403 Forbidden\r\n\r\n'); socket.destroy(); return; }
    if (!O.origins.length && req.headers.origin && ![`http://${req.headers.host}`, `https://${req.headers.host}`].includes(req.headers.origin)) { socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return; }
    const ip = ipOf(req), client = clientFor(ip);
    if (!client || !client.bucket.take() || client.connections >= O.maxConnectionsPerIp || stats.conns >= O.maxRooms * (O.maxPads + 1) + 32) {
      stats.rejected++; socket.end('HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n'); return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      const role = url.searchParams.get('role') === 'host' ? 'host' : 'pad';
      const code = (url.searchParams.get('code') || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
      ws.alive = true; ws.last = Date.now();
      ws.on('error', () => ws.terminate());
      ws.on('pong', () => { ws.alive = true; });
      stats.conns++; client.connections++;
      ws.on('close', () => { stats.conns--; client.connections--; client.last = Date.now(); });
      const who = { ip, origin: req.headers.origin, client };
      const previous = rooms.get(code);
      if (role === 'host' && previous && (!previous.host || previous.host.readyState !== 1)) {
        const timeout = setTimeout(() => ws.terminate(), 5000);
        ws.once('close', () => clearTimeout(timeout));
        ws.once('message', (data, binary) => {
          clearTimeout(timeout);
          let m;
          try { m = JSON.parse(data); } catch { ws.close(1008, 'invalid resume'); return; }
          if (binary || !object(m) || m.t !== 'resume' || !sameToken(previous.token, m.token) || rooms.get(code) !== previous || previous.host?.readyState === 1) { ws.close(1008, 'invalid resume'); return; }
          runHost(ws, code, who);
        });
      } else if (role === 'host') runHost(ws, code, who);
      else runPad(ws, code, (url.searchParams.get('id') || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'p' + Math.floor(Math.random() * 1e6), who);
      peaks();
    });
  });

  // a room ends: how long, how many
  const ended = (room) => {
    if (rooms.get(room.code) !== room) return;
    rooms.delete(room.code);
    room.owner.rooms--;
    const minutes = (Date.now() - room.t0) / 60000;
    if (usage) usage.partyEnd({ minutes, players: room.maxPads });
    log(`party ${room.code} over · ${Math.round(minutes)} min · ${room.maxPads} player(s) · rooms ${rooms.size}`);
  };

  function runHost(ws, code, who = {}) {
    let room = code ? rooms.get(code) : null;
    if (!room || (room.host && room.host.readyState === 1)) {
      // (a new room: is there space?)
      if (rooms.size >= O.maxRooms) { stats.rejected++; if (usage) usage.busy(); log('busy: a party turned away'); sendJson(ws, { t: 'error', code: 'busy', msg: 'The online party server is full right now.' }); ws.close(1013, 'busy'); return; }
      if (who.client.rooms >= O.maxRoomsPerIp) { stats.rejected++; sendJson(ws, { t: 'error', code: 'limit', msg: 'Too many parties from this network.' }); ws.close(1008, 'limit'); return; }
      const c = newCode();
      if (!c) { sendJson(ws, { t: 'error', code: 'busy', msg: 'No free room codes.' }); ws.close(1013, 'busy'); return; }
      room = { code: c, token: crypto.randomBytes(24).toString('hex'), owner: who.client, host: null, pads: new Map(), t0: Date.now(), maxPads: 0 };
      who.client.rooms++;
      rooms.set(c, room);
      const cc = usage ? usage.partyStart(who) : '??';
      log(`party ${c} opens · ${cc} · rooms ${rooms.size}`);
      stats.peakRooms = Math.max(stats.peakRooms, rooms.size);
    }
    const old = room.host;
    room.host = ws;
    if (old && old !== ws) old.close(4000, 'replaced');
    ws.bucket = new Bucket(...O.hostRate);
    sendJson(ws, { t: 'room', code: room.code, token: room.token });
    for (const [id, p] of room.pads) { sendJson(ws, { t: 'join', id }); sendJson(p, { t: 'hostback' }); }
    ws.on('message', (data, isBinary) => {
      ws.last = Date.now();
      if (isBinary || !ws.bucket.take()) return;
      count(data.length);
      let m;
      try { m = JSON.parse(data); } catch (e) { return; }
      if (!object(m)) { ws.close(1008, 'invalid message'); return; }
      if (m.t === 'send') {
        if (typeof m.id !== 'string' || !object(m.d)) { ws.close(1008, 'invalid message'); return; }
        const payload = JSON.stringify(m.d);
        if (m.id === '*') { for (const p of room.pads.values()) send(p, payload); }
        else send(room.pads.get(m.id), payload);
      } else if (m.t === 'kick') {
        const p = room.pads.get(m.id);
        if (p) { room.pads.delete(m.id); sendJson(p, { t: 'kicked' }); p.close(4001, 'kicked'); }
      }
    });
    ws.on('close', () => {
      if (room.host !== ws) return;
      room.host = null;
      if (!room.pads.size) ended(room);
      else for (const p of room.pads.values()) sendJson(p, { t: 'hostgone' });
    });
  }

  function runPad(ws, code, id, who = {}) {
    const room = rooms.get(code);
    const full = room && !room.pads.has(id) && room.pads.size >= O.maxPads;
    if (!room || full) {
      sendJson(ws, { t: 'error', code: room ? 'full' : 'nogame', msg: room ? 'This party is full' : 'No game with that code' });
      ws.close(1000);
      return;
    }
    const old = room.pads.get(id);
    room.pads.set(id, ws);
    room.maxPads = Math.max(room.maxPads || 0, room.pads.size);
    if (usage && !old) usage.padJoin({ ip: who.ip, id });
    if (old && old !== ws) old.close(4000, 'replaced');
    ws.bucket = new Bucket(...O.padRate);
    ws.over = 0;
    const host = room.host && room.host.readyState === 1 ? room.host : null;
    sendJson(ws, { t: 'hello', code: room.code, host: !!host });
    if (host) sendJson(host, { t: 'join', id });
    const prefix = '{"t":"msg","id":' + JSON.stringify(id) + ',"d":';
    ws.on('message', (data, isBinary) => {
      ws.last = Date.now();
      if (isBinary || data.length > O.padMsgMax) { ws.close(1009, 'message too large'); return; }
      if (!ws.bucket.take()) {
        // (a phone that floods: dropped, then shown the door)
        if (++ws.over > 600) { sendJson(ws, { t: 'error', code: 'limit', msg: 'Too many messages' }); ws.close(1008, 'limit'); }
        return;
      }
      count(data.length);
      const text = data.toString();
      try { if (!object(JSON.parse(text))) { ws.close(1008, 'invalid message'); return; } } catch (e) { return; }
      const h = room.host;
      send(h, prefix + text + '}');
    });
    ws.on('close', () => {
      if (room.pads.get(id) !== ws) return;
      room.pads.delete(id);
      if (room.host && room.host.readyState === 1) sendJson(room.host, { t: 'leave', id });
      else if (!room.host && !room.pads.size) ended(room);
    });
  }

  // ------------------------------------------------------------------ upkeep: pings, idle, the counter
  let lastMsgs = 0, lastBytes = 0, lastT = Date.now(), minute = 0;
  const tick = setInterval(() => {
    const now = Date.now();
    for (const [ip, client] of clients) if (!client.connections && !client.rooms && now - client.last > 300000) clients.delete(ip);
    for (const ws of wss.clients) {
      if (!ws.alive || now - ws.last > O.idleMs) { ws.terminate(); continue; }
      ws.alive = false;
      ws.ping();
    }
    const dt = (now - lastT) / 1000;
    stats.rate = Math.round((stats.msgs - lastMsgs) / dt);
    stats.bps = Math.round((stats.bytes - lastBytes) / dt);
    lastMsgs = stats.msgs; lastBytes = stats.bytes; lastT = now;
    if (++minute % 2 === 0) log(`rooms ${rooms.size}/${O.maxRooms} · connections ${stats.conns} · ${stats.rate} msg/s · ${Math.round(stats.bps / 1024)} KiB/s`);
  }, 30000);
  tick.unref();

  function snapshot() {
    const now = Date.now(), dt = Math.max(0.001, (now - lastT) / 1000);
    let pads = 0, hosts = 0;
    for (const r of rooms.values()) { pads += r.pads.size; if (r.host) hosts++; }
    const mem = process.memoryUsage();
    return {
      rooms: rooms.size, maxRooms: O.maxRooms, peakRooms: stats.peakRooms, hosts, pads, connections: stats.conns,
      msgsPerSec: stats.rate, msgsPerSecNow: Math.round((stats.msgs - lastMsgs) / dt), kibPerSec: Math.round(stats.bps / 1024),
      msgs: stats.msgs, rejected: stats.rejected, uptimeSec: Math.round((now - stats.t0) / 1000), rssMiB: Math.round(mem.rss / 1048576),
    };
  }

  return {
    O, rooms, stats, server, snapshot,
    listen() {
      return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(O.port, O.host, () => {
          server.off('error', reject);
          log(`Hearthlight relay on ${O.host}:${server.address().port}` + (O.static ? ` · the game from ${O.static}` : '') + ` · up to ${O.maxRooms} rooms`);
          resolve(server.address().port);
        });
      });
    },
    close() { clearInterval(tick); if (usage) usage.close(); for (const ws of wss.clients) ws.terminate(); return new Promise((r) => { if (!server.listening) { r(); return; } server.close(() => r()); }); },
  };
}

// ------------------------------------------------------------------ run it
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const a = process.argv.slice(2), flag = (k) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : undefined; };
  const relay = createRelay({ port: flag('port'), host: flag('host'), static: flag('static'), lan: a.includes('--lan') || undefined });
  relay.listen().then((port) => {
    if (relay.O.lan) for (const ip of lanIps()) console.log(`  phones on the same Wi-Fi: http://${ip}:${port}/pad.html`);
  });
  const stop = () => { relay.close().then(() => process.exit(0)); };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}
