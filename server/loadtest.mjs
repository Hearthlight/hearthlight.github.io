// Load test for the relay: `rooms` parties of `pads` phones, talking like a real one (the phones'
// sticks and buttons ~20 messages a second each, the big screen ~30 a second to everyone plus a few
// to each phone — ≈ 500 messages a second for a full party of 8), for `secs` seconds. Measures what
// got through, the round trip phone → big screen → phone, and asks the relay for its counter.
//   node server/loadtest.mjs [ws://127.0.0.1:8787/ws] [rooms=100] [pads=8] [secs=30]

import WebSocket from 'ws';

const [url = 'ws://127.0.0.1:8787/ws', R = '100', N = '8', S = '30'] = process.argv.slice(2);
const rooms = +R, pads = +N, secs = +S;
const statsUrl = url.replace(/^ws/, 'http').replace(/\/ws$/, '/stats');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let sent = 0, got = 0, bytes = 0, refused = 0, errors = 0;
const rtts = [];

// (the relay answers in the same breath as the handshake: listen before 'open')
function open(u, onMsg) {
  return new Promise((resolve) => {
    const ws = new WebSocket(u, { perMessageDeflate: false, headers: { Origin: 'http://loadtest' } });
    ws.on('message', (d) => onMsg(ws, d));
    ws.on('open', () => resolve(ws));
    ws.on('error', () => { errors++; resolve(null); });
  });
}

async function party(i) {
  let gotCode;
  const coded = new Promise((r) => { gotCode = r; });
  const host = await open(url + '?role=host', (ws, d) => {
    const m = JSON.parse(d);
    if (m.t === 'room') { gotCode(m.code); return; }
    if (m.t === 'error') { refused++; gotCode(null); return; }
    got++; bytes += d.length;
    // (the big screen answers a phone's ping at once, like its own state messages)
    if (m.t === 'msg' && m.d.t === 'ping') { ws.send(JSON.stringify({ t: 'send', id: m.id, d: { t: 'pong', at: m.d.at } })); sent++; }
  });
  if (!host) return null;
  const code = await Promise.race([coded, sleep(5000).then(() => null)]);
  if (!code) { host.close(); return null; }
  const ps = [];
  for (let k = 0; k < pads; k++) {
    const p = await open(`${url}?role=pad&code=${code}&id=bot${i}_${k}`, (ws, d) => { got++; bytes += d.length; const m = JSON.parse(d); if (m.t === 'pong') rtts.push(Date.now() - m.at); });
    if (p) ps.push(p);
  }
  return { host, ps, code };
}

const all = [];
const t0 = Date.now();
for (let i = 0; i < rooms; i++) { const q = await party(i); if (q) all.push(q); if (i % 10 === 9) await sleep(20); }
console.log(`${all.length}/${rooms} rooms open (${all.reduce((s, q) => s + q.ps.length, 0)} phones) in ${Date.now() - t0} ms · refused ${refused} · errors ${errors}`);

// the traffic: every 50 ms each phone sends a stick (20/s), now and then a button or a ping;
// every 33 ms each big screen broadcasts a state (~180 bytes), every 200 ms one message to each phone
const stick = (p) => { p.send(JSON.stringify({ t: 'in', x: +(Math.random() * 2 - 1).toFixed(2), y: +(Math.random() * 2 - 1).toFixed(2) })); sent++; };
const state = JSON.stringify({ t: 'st', hp: 88, ult: 40, cd: [0, 1.2, 0], xp: 1234, lv: 21, coins: 560, zone: 'marsh', pos: [300.5, 60.25], ctx: 'fight', buffs: ['lit', 'root'], note: 'x'.repeat(40) });
const timers = [];
timers.push(setInterval(() => { for (const q of all) for (const p of q.ps) if (p.readyState === 1) { stick(p); if (Math.random() < 0.05) { p.send(JSON.stringify({ t: 'b', k: 'a', v: 1 })); sent++; } if (Math.random() < 0.02) { p.send(JSON.stringify({ t: 'ping', at: Date.now() })); sent++; } } }, 50));
timers.push(setInterval(() => { for (const q of all) if (q.host.readyState === 1) { q.host.send(JSON.stringify({ t: 'send', id: '*', d: JSON.parse(state) })); sent++; } }, 33));
timers.push(setInterval(() => { for (const q of all) if (q.host.readyState === 1) for (let k = 0; k < q.ps.length; k++) { q.host.send(JSON.stringify({ t: 'send', id: `bot${all.indexOf(q)}_${k}`, d: { t: 'you', slot: k, hp: 90 } })); sent++; } }, 200));

const samples = [];
for (let s = 0; s < secs; s += 5) {
  await sleep(5000);
  try { const st = await (await fetch(statsUrl)).json(); samples.push(st); console.log(`  ${s + 5}s: relay ${st.msgsPerSecNow} msg/s in · rooms ${st.rooms} · connections ${st.connections} · ${st.rssMiB} MiB`); } catch (e) { console.log('  (no /stats)'); }
}
for (const t of timers) clearInterval(t);
await sleep(500);
rtts.sort((a, b) => a - b);
const pct = (p) => rtts.length ? rtts[Math.min(rtts.length - 1, Math.floor(rtts.length * p))] : null;
console.log(`sent ${sent} · received ${got} (${(bytes / 1048576).toFixed(1)} MiB) in ${secs} s → ${Math.round(sent / secs)} msg/s up, ${Math.round(got / secs)} msg/s down`);
console.log(`round trip phone → big screen → phone: median ${pct(0.5)} ms · p95 ${pct(0.95)} ms · p99 ${pct(0.99)} ms (${rtts.length} pings)`);
for (const q of all) { q.host.close(); for (const p of q.ps) p.close(); }
await sleep(300);
process.exit(0);
