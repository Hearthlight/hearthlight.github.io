# Privacy

The game saves progress and settings in your browser or desktop app. You can clear them from
the game's settings or your browser's site-data controls. There are no player accounts.

## Online Party Mode

The relay holds room codes, controller connections and game messages in memory while a party
is connected. Messages are forwarded to the host or controllers. They are not written to a
gameplay log. The host runs the game and receives the controllers' messages.

The hosted relay records daily aggregate counts: visits, parties, players, country, language,
platform and originating website. Country is derived from the connecting IP using DB-IP's
IP to Country Lite database. A daily random salt is used for in-memory visitor hashes; the
salt and hashes are not written to disk. Daily aggregate files contain no IP addresses.

IP addresses are also held in memory to limit abusive connections. Inactive limit entries
expire after five minutes. The routine web access log records the time, method, URL path,
status, response size and duration, without IPs, query parameters or authentication tokens.
Web server error logs can contain IP addresses and request details. Web logs rotate daily
with 14 archives retained; older archives are removed by log rotation. SSH and firewall
security logs are private administration logs and may retain IP addresses separately.

The dashboard requires an access token to read the counters. Its sign-in page contains no
private counters. Tokens are sent in an HTTP authorization header and are not stored in the
browser after the page closes.

GitHub hosts the repository and the planned browser version; its infrastructure handles
requests under [GitHub's privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).
The relay is hosted on an OVH VPS. The desktop version's local Party Mode works without
contacting the online relay when used on the same Wi-Fi.

For security concerns, see [Security](SECURITY.md).

## Remote Play and optional online backups

Remote Play transmits the game canvases and generated game audio to invited guests. It never requests camera, microphone or desktop capture. WebRTC traffic can pass through the authenticated TURN service on the same VPS; fallback game images pass through the WebSocket relay. Media is forwarded, not recorded. TURN operational/security logs may contain connection IP addresses and temporary session identifiers.

Choosing Save online uploads game progress, including player nicknames, to private storage on the VPS. No email or account is required. The recovery key authorizes access; the server stores a hash of its secret. Backups expire after 90 days without an update; expired files are reclaimed when new backups are created. Disabling automatic backups stops future uploads but keeps the existing backup until expiry. Local exports exclude relay and online recovery credentials.
