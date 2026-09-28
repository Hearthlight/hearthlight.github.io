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
desktop app), `MAX_PADS` (16 a room), `ORIGINS` (comma-separated page origins allowed),
`STATS_TOKEN` (for `/stats` from elsewhere than the machine itself). With no `ORIGINS` list,
browser WebSocket connections must come from the same origin as the relay.

Use Node.js 22 or newer. Run `npm test` for malformed-message, access-control, reconnection,
rate-limit and message-delivery checks.

Limits: phone messages ≤ 16 KiB and 120/s (burst 240; a phone that floods is disconnected), host
messages ≤ 1 MiB (the phone's world map is ~0.6 MB, once) and 1500/s, a ping every 30 s, 30 min
of silence ends a connection. `GET /health` → `ok`; `GET /stats` → rooms, connections, messages a
second, memory; a counter line in the log every minute.

Additional defaults: 8 rooms and 128 simultaneous connections per IP, 30 WebSocket handshakes
per minute with a burst of 60, and a 2 MiB maximum outgoing queue per connection. Override
`MAX_ROOMS_PER_IP` and `MAX_CONNECTIONS_PER_IP` for large shared networks. Inactive IP entries
expire after five minutes. Room codes use cryptographic randomness. A separate secret, sent in
a WebSocket frame, authenticates a returning host; knowing the room code is insufficient.

Load tests must use an isolated relay with suitable higher limits; never benchmark the live service.
The `loadtest.mjs` tool is intended for this isolated environment.

The web version points at a relay with `config.js` (`window.HEARTHLIGHT = { relay, pad }`).
The site's deployment configuration and secrets are managed outside the public repository.

### Private counters

Open `/dash` and enter the access token. The page itself is a public sign-in form; counters are
only returned by authenticated `/stats` requests. The token stays in page memory and travels in
the `Authorization: Bearer …` header, never in a URL. Legacy `?token=` links are no longer accepted.
Alternatively, use an SSH tunnel to port 8787 and open the dashboard on localhost; direct local
requests are allowed. Keep `STATS_TOKEN` in a protected environment file outside the web root.

The reverse proxy must overwrite `X-Real-IP` with the actual client address. Keep port 8787
bound to loopback. Exclude IPs and query parameters from routine access logs and rotate logs.
See [Privacy](../PRIVACY.md) for the hosted service's data handling.
