# How Hearthlight works

A map of the code for developers: what runs where, how the pieces fit together, and where to look
next. The working notes — commands, conventions, pitfalls, the layout folder by folder — are in
[`CLAUDE.md`](../CLAUDE.md); each feature's design and progress log is in [`docs/plans/`](plans/).

## Principles

- **No build step.** Plain ES modules load straight into the browser; Three.js 0.170 and the QR
  library live in `vendor/` (the import map is in `index.html`). No bundler, no framework, no npm
  install to play.
- **Everything is made in code.** Terrain, buildings, characters, trees, icons, the pixel font,
  the music and the sound effects are generated at load time. The repository holds no image or
  audio assets for the game (only the README's screenshots and the link previews).
- **Crisp pixels.** The world is drawn at a low resolution and scaled up by whole numbers.
- **One set of systems for every way to play.** The solo story and Party Mode run the same
  systems; a change to one must keep working in both.
- **Every visible word is translated** (`t('English text')`; five languages).

## Pages and entry points

| Page | Loads | What it is |
| --- | --- | --- |
| `index.html` | `config.js`, then `src/main.js` | The game (the big screen). |
| `pad.html` | `config.js`, then `src/pad/pad.js` | The phone controller: a canvas UI that joins a room by its 4-letter code. |
| `play.html` | the same `src/pad/pad.js` | Remote play: a friend at home gets their own camera, streamed from the big screen. |
| `audio-test.html` | the synthesiser | A test bench for the sounds. |

`config.js` names the addresses the web version uses (its relay, its phone page, its counters).
Left empty, a page talks to the server it came from: the dev server, the desktop app, a self-hosted
relay.

## The game and its loop

`src/main.js` creates the `Game` (`src/game.js`), which owns:

- the **display** (`engine/display.js`): two stacked canvases, the world's (WebGL, low resolution)
  and the UI's (2D), both scaled up by whole numbers;
- the **input** (`engine/input.js`): keyboard, mouse, touch (a virtual stick) and gamepads (their
  family, Xbox / PlayStation / Nintendo, names the buttons in every hint), with rumble;
- the **audio** (`engine/audio.js`), the **settings** and the **saves** (`state.js`).

`start()` loads the chosen language's dictionary, creates the renderer, the lighting and the
portraits, builds the valley (a progress line on the boot screen), then shows the title. A reload
in the middle of a game or a party picks it up again (`session.mjs`).

`frame(dt)` runs on every animation frame (`dt` capped at 50 ms): input, then the current mode's
update — `title`, `creator`, `game` (the solo story) or `party` — then drawing. For tests,
`game.debug.step(n, dt)` advances frames by hand and `game.debug.shot()` saves a screenshot.

## Drawing

- `render/r3d.js`: Three.js at a low resolution with an oblique orthographic camera looking north
  at 45°, toon shading (`toon()`), depth outlines and a colour-grading pass. In Party Mode the
  screen splits into several views; each draws only what it can see (`render/cull.js`).
- `render/lighting.js`: the time of day and a pool of lamps; `render/wind.js`: leaves and grass
  swaying in the vertex shader; `render/portrait.js`: the dialogue portraits.
- `art/`: the painters (terrain, surfaces, icons, the palette); `models/`: buildings, nature,
  props, furniture, boats and the voxel characters (`chars.js`). Still parts are merged into one
  mesh per material (`models/geom.js`).
- The UI (`ui/`): paper panels, the HUD, menus, dialogue, shops, the character creator, the
  controls screen, the on-screen keyboard — all on the 2D canvas with the pixel font
  (`engine/font.js`).

## The world

- **The valley** (`world/overworld.js`, 240×128 tiles; `world/world3d.js`): Marigold Cove — the
  villagers, shops, farming, fishing, the story's home. `scenes/world.js` is the solo game's scene.
- **The big world** (`world/big/`): 1728×512 tiles, two continents — the Hearthlands around the
  valley and the Dawnlands across the sea. It streams in 32×32-tile chunks around the camera; the
  ground is painted in web workers (`paint.js`, `worker.js`, `stream.js`); every tile has a height
  (cliffs, banks, stairs, waterfalls); `collide.js` walks it; `minimap.js` is its map and fog.
- **Built off the map**: rooms you enter (`party/rooms.js`, x ≥ 2000) and dungeons
  (`saga/dungeon.js`, x ≥ 3000).

Coordinates: 1 unit = 1 tile = 16 texels; x runs east, z south.

## Solo and Party: the same systems

- **Solo.** In the valley, `scenes/world.js` runs the life sim (`systems/`: farming, fishing,
  foraging, critters, weather, effects). Out in the wild lands, `solo/wild.js` is a "party of one":
  it implements the parts of the Party API the shared systems use, so the solo game runs Party
  Mode's zones, swimming, vehicles, mounts, combat, camps, lairs, talents, waystones, secrets,
  races and events. A phone can drive the solo game too (`solo/phone.js`).
- **Party Mode** (`party/party.js`): 1 to 8 players on one screen — phones (through a relay),
  one keyboard, gamepads — and friends at home (remote play). The host wears a crown
  (`party/host.js`: the host menu); keyboard and gamepad players have their own menu on the big
  screen (`party/tvmenu.js`); `party/camera.js` splits the screen when players wander apart. The
  activities: the story, the Starfall Festival's games, free exploration and the Festival Ring.
- **What a player's buttons do right now** is one context (`P.ctxOf(p)`, from each system's
  `ctxFor`): phones show it as labels, keyboard and gamepad players as chips under their hero. A
  hint never names a key: `ctl('interact')` names it on the device in hand.

## The story

- `saga/`: the ten-chapter story engine — chapters (`saga/chapters/`), quests and their steps,
  the stage for cutscenes (`stage.js`), zone levels, the Murk that hides lands the story hasn't
  reached, dungeons and their puzzle rooms, escorts, and the mini-games.
- `story/` holds the valley's quests and lines; `data/` the items, villagers and looks.
- `combat/`: the heroes (eight classes), the gloom creatures and bosses, blessings, statuses;
  `party/progress.js`: talents and gear.

## Phones, relays and playing online

- **The dev server** (`tools/devserver.py`) serves the files and a `/ws` relay, so phones on the
  same Wi-Fi can join; `/__lan` tells the lobby the machine's address; `/__shot` saves screenshots.
- **The Node relay** (`server/relay.mjs`) runs a hosted service: rooms with 4-letter codes, the
  phones' messages, invitations, limits and optional anonymous counters. See
  [`server/README.md`](../server/README.md) and [`PRIVACY.md`](../PRIVACY.md).
- **The desktop app** (`desktop/`, Electron) has the relay built in: phones on the same Wi-Fi join
  it directly, with no internet. See [`desktop/README.md`](../desktop/README.md).
- **Invitations and remote play**: [`docs/ONLINE.md`](ONLINE.md).

## Words and languages

Every visible string goes through `t('English text', vars)` (`tn` for plurals); the English text
is the key. The dictionaries are in `src/lang/<code>/` (French, Spanish, German, Italian), loaded on
demand, with a guide and a translator's brief per language in `tools/`. `node tools/i18n-scan.mjs`
must report 0 missing in every language.

## Sound

`engine/audio.js` is a small synthesiser: the music is data (tracks as notes and instruments),
the sound effects and the ambience layers are synthesised on the fly.

## Saves

The solo game saves in the browser (`state.js`). Party Mode keeps each player's profile and the
adventure's progress, with a Saves & backups page (`party/saves.mjs`, `party/hub.js`) and, for
the web version, optional backups on the relay.

## Tools and tests

In the browser console, with `?debug=1`:

- `tools/partybots.js` — bot phones that join through the real relay and play;
- `tools/sagatest.js`, `tools/sagarun.js` — the story played by itself;
- `tools/worldboss.js`, `tools/balance.js`, `tools/perf.js`, `tools/grandmatest.js` — bosses,
  balance, frame times;
- `tools/fakepad.js`, `tools/padparty.js` — fake gamepads and a Party played with them;
- `tools/langshots.js` — screens in a language.

On the command line: `node tools/i18n-scan.mjs`, `node tools/i18n-check.mjs <code>`,
`node tools/bigmap.mjs` (the big world's layout as a picture), and `npm test` in `server/`.

The rule for every change: 0 errors in the console, 0 missing translations, the story still plays
through in solo and in Party Mode.

## Releases

Nothing is published automatically. The web version is a manual GitHub Pages workflow
(`.github/workflows/pages.yml`); the desktop app is built when a version tag is pushed and lands in
a draft release (`desktop.yml`); the checks (`checks.yml`) run on pull requests.
