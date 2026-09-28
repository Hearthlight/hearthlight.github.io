# Hearthlight's Party relay

`relay.mjs` passes small messages between the big screen (the host of a room with a 4-letter
code) and the phones (pads). The game itself runs on the big screen; the relay only relays.

```bash
cd server && npm ci
node relay.mjs                                   # 127.0.0.1:8787, behind nginx (the VPS)
node relay.mjs --host 0.0.0.0 --static .. --lan  # serves the game too, for phones on the Wi-Fi
```

Settings (flags or environment): `PORT` (8787), `HOST` (127.0.0.1), `STATIC` (a folder to serve),
`LAN=1` (answers the game's `/__lan`), `MAX_ROOMS` (150 — then « busy », and the game suggests the
desktop app), `MAX_PADS` (16 a room), `ORIGINS` (comma-separated page origins allowed; empty: any),
`STATS_TOKEN` (for `/stats` from elsewhere than the machine itself).

Limits: phone messages ≤ 16 KiB and 120/s (burst 240; a phone that floods is disconnected), host
messages ≤ 1 MiB (the phone's world map is ~0.6 MB, once) and 1500/s, a ping every 30 s, 30 min
of silence ends a connection. `GET /health` → `ok`; `GET /stats` → rooms, connections, messages a
second, memory; a counter line in the log every minute.

`node loadtest.mjs ws://127.0.0.1:8787/ws 100 8 30` — 100 parties of 8 phones for 30 s. On a
laptop (Apple silicon): 24 000 messages/s in, 45 000 out, ~28 % of one core, ~130 MiB, round
trip phone → big screen → phone 7 ms median, 11 ms p99.

The web version points at a relay with `config.js` (`window.HEARTHLIGHT = { relay, pad }`).
`deploy/` holds the scripts for the VPS (systemd unit, nginx site, install & rollback).
