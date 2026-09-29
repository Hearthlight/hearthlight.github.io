# Playing together and returning later

**Party Mode** on the title screen opens the lobby at once — there is nothing to choose first.
Phones in the room scan the lobby's QR code; keyboard players press E (WASD) or Enter (arrows),
gamepads press A. Friends can join in the lobby or at any time during the game.

## Inviting

The invitations live in the menu, never on top of the game:

- the big screen's menu (Esc, or Start on a gamepad) → **Invite**;
- the host phone's crown menu → **Invite**;
- any phone: the envelope in the lobby, or **Invite** in its menu — with the phone's own share
  sheet (messages, mail…) and a QR code on the phone's screen for a friend sitting next to you.

**One link for everyone** (`pad.html#CODE.key`, the lobby's QR code): whoever opens it picks
where they play —

- **At the big screen**: the phone becomes their controller and everyone watches the big screen,
  which splits when players wander apart.
- **On my own screen**: the page moves on to the remote page (`play.html#CODE.key`) — the game
  streams to their screen with **their own camera**. They are left out of the big screen's
  split; every view shows an arrow at its edge, in a player's colour, towards anyone it doesn't
  frame (with the distance). Scenes are shared: during a cutscene everyone sees the same shot.

Typing the 4-letter code on the phone page gives a controller (the video needs the link's key).

The remote invitation needs a relay that other networks can reach: the web version's. A relay on
the local network (the desktop app, the dev server) offers the same link for another screen on
the same Wi-Fi.

The lobby's card says how to send it (« Far away? Send them the link: Esc → Invite »). Ending the party
is in the menu (**End the party**, confirmed, progress saved first).

## Keyboard and gamepad players

One keyboard player (ZQSD / WASD or the arrows; E or Enter acts, Space jumps, F the special, R
dodges, G the ultimate). Keyboard and gamepad players each have their own menu on the big screen
(hero, talents, gear, look, map, journal): **Tab** on the keyboard, **Select** on a gamepad. The key is written on a tab above
their badge, said in a bubble when they join, and the host menu's first page lists « Alex's own
menu » for each of them.

## Remote play

`play.html` shows the stream and a controller panel (the phone's pages: look, hero, talents, gear,
votes). Keyboard: WASD (physical ZQSD on AZERTY) or arrows to move; E / Enter for action, Space to
jump, F for the special, R to dodge, G for the ultimate, Tab for the menu. A gamepad uses A/B/X/Y
and the right stick button for the ultimate; Back opens the menu and Start toggles readiness in
the lobby.

The host draws each remote player's own view (their camera, the shared HUD, dialogue and scenes;
not the big screen's own menus) into a canvas of theirs, 960×540, and streams it over WebRTC with
the game's audio (up to 30 fps, about 1 ms of the host's frame per guest). A video link that
doesn't come up within 8 seconds gets a fresh offer (twice). If WebRTC is unavailable, JPEG
images through the relay keep the game playable (up to eight a second, no audio); the relay
addresses each image to its own guest. The host must keep the game open and visible; its upload
connection limits how many guests can stream.

The remote invitation includes an unguessable key in its URL fragment. Share it with invited
players. The four-letter controller code alone does not grant video access. No desktop, camera or
microphone is captured: only the game's own canvases and generated audio.

## Reconnect

Phones and remote players reconnect automatically. **Reconnect** retries from the remote page. A disconnected host has 90 seconds to reclaim the same room, using its private owner credential. Ending a party explicitly closes the room and tells guests to stop reconnecting. Restarting the relay clears live rooms; the host receives a new code and its QR code is refreshed. Send a new invitation when the old room has ended.

## Local saves and resume

While a solo game or party is open, refreshing or closing the page asks for confirmation in browsers that support it. If you confirm a refresh, the same tab resumes the saved solo game or party activity automatically, including local keyboard/gamepad players. Phones reconnect to the host's room. Returning to the title deliberately clears automatic resume. This protection relies on browser storage; mobile browsers may close a tab without showing a confirmation.

Adventure progress, player profiles and the most recent safe outdoor positions are kept on the host device. Saves run every 30 seconds, when the page is hidden, and before leaving a party. **Save now** saves immediately. A storage failure is shown; **Export save** can still export the party's pending progress from memory.

**Continue** goes straight back to the saved game when there is one; with both a solo game and a party adventure it asks which (the character and day, or the chapter and players). The party's opens the lobby and resumes the adventure when the host starts. It restores quest progress and player profiles, and returns players near saved outdoor positions. An unfinished cinematic, arena round or exact mid-combat state is not a resumable checkpoint.

**Export save** creates a JSON backup containing solo and party progress. **Import save** is available under **Settings → Saves & backups** on the title screen and asks for confirmation before replacing the included modes. Credentials and unrelated browser settings are excluded. The backup is validated before writing, and a failed import attempts to restore the previous values.

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
