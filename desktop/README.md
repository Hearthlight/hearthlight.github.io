# Hearthlight — the desktop app

The game in its own window, with the Party relay built in: it serves the game on this computer's
Wi-Fi address too, so phones on the same network scan the QR code and join — no internet needed.

```bash
cd desktop && npm ci
npm start            # copies the game (../index.html, ../src, ../vendor…) and runs it
npm run dist:mac     # dist/Hearthlight-<version>-universal.dmg (Intel + Apple silicon)
npm run dist:win     # dist/Hearthlight-Setup-<version>.exe
npm run dist:linux   # dist/Hearthlight-<version>-x86_64.AppImage
```

`scripts/copy-game.mjs` copies the game and `../server/relay.mjs` in; `scripts/icon.mjs` draws the
icon (a lantern, in code like everything else). The builds aren't signed: on a Mac, right-click →
Open the first time (or System Settings → Privacy & Security → Open Anyway); on Windows, « More
info » → « Run anyway ». The relay listens on port 8787 (the next free one if taken); the computer
may ask to allow incoming connections — say yes, or phones can't join.

`HEARTHLIGHT_SELFTEST=/tmp/shot.png npm start` runs it hidden and muted, saves a picture of the
game after 9 s and a JSON line (port, loaded), keeps the relay up 20 s, then quits — for checking a
build. `.github/workflows/desktop.yml` builds the three on a version tag, into a draft release.
