# Playing together and returning later

Open **Play together** on the title screen.

- **Host on this screen** uses the current relay. The desktop app uses the local Wi-Fi relay and works offline.
- **Host over the Internet** uses the public Hearthlight relay, including from the desktop app.
- **Join remotely** accepts the complete invitation from a host. The desktop app opens Internet invitations in your browser.

During a party, **Invite & save** remains available. It pauses the game while the host uses the panel and restores its previous pause state when closed.

## Two invitations

**Phone controller** opens the existing controller: useful for people watching the same screen.

**Play from home** opens `play.html`: the guest sees the host's game, hears its audio when supported, and controls their own character. It supports keyboard, gamepad and the existing touch controller. Menus, votes, character appearance and equipment remain available in the controller panel.

Keyboard: WASD (physical ZQSD on AZERTY) or arrows to move; E / Enter for action, Space to jump, F for the special, R to dodge, G for the ultimate, Tab for the menu. A gamepad uses A/B/X/Y and the right stick button for the ultimate; Back opens the menu and Start toggles readiness in the lobby. Use the visible Start button to start the adventure.

Remote Play transmits the host's shared game view, including its split screen. It does not create a separate camera or run a second simulation on each guest. The host must keep the game open and visible. The host computer and upload connection determine streaming capacity.

The remote invitation includes an unguessable key in its URL fragment. Share it with invited players. The four-letter controller code alone does not grant video access. No desktop, camera or microphone is captured: only the game canvases and generated game audio.

WebRTC carries the live video (up to 960×540 at 30 fps) and audio. Authenticated TURN on the VPS handles networks that cannot connect directly. If video capture or WebRTC is unavailable, a bounded JPEG relay keeps the game playable at up to eight images per second, without audio; the guest sees that status explicitly. The public relay limits fallback video traffic and drops stale images before they can delay controls.

## Reconnect

Phones and remote players reconnect automatically. **Reconnect** retries from the remote page. A disconnected host has 90 seconds to reclaim the same room, using its private owner credential. Ending a party explicitly closes the room and tells guests to stop reconnecting. Restarting the relay clears live rooms; the host receives a new code and its QR code is refreshed. Send a new invitation when the old room has ended.

## Local saves and resume

Adventure progress, player profiles and the most recent safe outdoor positions are kept on the host device. Saves run every 30 seconds, when the page is hidden, and before leaving a party. **Save now** saves immediately. A storage failure is shown; **Export save** can still export the party's pending progress from memory.

**Resume our adventure** shows the saved chapter and date, opens the lobby, and resumes the adventure when the host starts. It restores quest progress and player profiles, and returns players near saved outdoor positions. An unfinished cinematic, arena round or exact mid-combat state is not a resumable checkpoint.

**Export save** creates a JSON backup containing solo and party progress. **Import save** is available on the title screen and asks for confirmation before replacing the included modes. Credentials and unrelated browser settings are excluded. The backup is validated before writing, and a failed import attempts to restore the previous values.

Browser saves belong to that browser and site address. Export/import transfers progress between the VPS site, GitHub Pages and the desktop app. Returning phones keep their profile through their locally stored player ID; a different phone/browser receives a new identity.

## Optional online backup

Choose **Save online** to enable a private backup and automatic updates every minute while playing. **Show recovery key** gives a recovery key to keep privately; it authorizes reading, updating and deleting that backup. Use **Restore online backup** from the title screen on another device, then confirm the restore.

No account or email is required. Losing both the local copy and the recovery key makes the backup unrecoverable. A newer cloud revision is never silently overwritten: restore it first. The host is still needed to play; storing a backup on the VPS does not keep a game simulation running there.

The service stores versioned JSON files outside the web root, with private permissions and hashed recovery secrets. Uploads are capped at 2 MiB, creation/storage and request rates are bounded, and backups expire after 90 days without an update. Expired files are reclaimed when new backups are created. Turn off automatic backups from the panel after keeping the recovery key if needed.

## Self-hosting

Run the Node relay from the repository root:

```sh
npm --prefix server ci
SAVES_DIR=/private/path/hearthlight-saves node server/relay.mjs --static . --lan
```

Omit `SAVES_DIR` to disable online backups. Serve through HTTPS for remote play; configure `/ws` and `/saves` in the reverse proxy. Serve `.mjs` files as `application/javascript` (some nginx installations need an explicit MIME mapping). `/saves` needs a 2 MiB body limit and support for GET, POST, PUT, DELETE and OPTIONS. Credentials use the Authorization header; do not log that header or request bodies. Cross-origin clients must be explicitly listed in `ORIGINS`.

The browser configuration supports `relay`, `pad`, `onlineRelay`, `onlinePad` and `saves`. `onlineRelay` / `onlinePad` let a desktop build offer Internet hosting while retaining its embedded LAN relay.

For TURN, configure coturn with REST authentication, a private shared secret, realm, quotas, a bounded relay port range, and denial of loopback/private/multicast peer addresses. Supply the same secret to the Node service as `TURN_SECRET` and comma-separated TURN URLs as `TURN_URLS`. The Node service issues short-lived credentials to room owners; invitations never contain the TURN secret. Open only the selected TURN listener and relay ports. WebRTC encrypts the media. Keep the TURN service patched.

`server/saves.mjs` imports the portable save implementation from `src/party/saves.mjs`. Keep that relative layout in a source deployment. The desktop copy step adjusts the import to its packaged `game/` directory.

Run the checks with `npm --prefix server test`. They cover invalid input, relay survival, owner-only room recovery, expiry, explicit end, video admission, backup authentication, revision conflicts, disk persistence, quota enforcement, and portable import validation/rollback.
