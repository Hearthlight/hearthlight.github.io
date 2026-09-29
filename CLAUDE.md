# Hearthlight — working notes for Claude

A cozy 2.5D pixel-art life game (solo story mode whose valley opens onto the wild lands + a
local **Party Mode** for 1–8 players with phones as controllers; a phone can drive the solo game
too). Plain ES modules, **no build step**, Three.js 0.170 from the
jsDelivr CDN (import map in `index.html`). Everything is procedural: every texture, model and
sound is made in code — never add image or audio files.

The user writes in French or English, expects a very high bar (score each area /10, iterate
to 9+), judges from in-game screenshots, and wants finished work committed & pushed to
`origin/main` (message ending with the `Co-Authored-By` line).

## Run & test

```bash
python3 tools/devserver.py 8765        # static files + /__shot + /__lan + /ws party relay
```

- Game: <http://localhost:8765/?debug=1> · phone controller: `/pad.html#CODE`.
- `window.game.debug`: `step(n, dt)`, `shot(name, scale, crop)` (PNG in `screenshots/`,
  git-ignored), `newGame`, `tp(x, z)`, `hour(h)`, `pause(on)`.
- `const T = await import('/tools/partybots.js')`: `boot(n)` (title → party lobby with n bot
  phones), `mode('explore'|'waves'|'brawl'|'story')`, `vote(re)`, `fight(frames)`,
  `warp(x, z)`, `clearWave()`, `skipTalk()`, `autoplay('lobby')`. Bots talk to the real relay.
- `window.__errs` (filled by `T.boot`) and the console must stay at **0 errors**.
- Translations: `node tools/i18n-scan.mjs` must report **0 missing** in every language (fr, es,
  de, it — and each one's party lines; `--list` prints them, `--lang=de` one language);
  `node tools/i18n-check.mjs es` compares a language's files with their French twins. Screens in a
  language: `tools/langshots.js` (`start('de')`). Syntax check: `node --check file.js`.
- Remote play (`play.html#CODE.key`, a friend at home) needs the Node relay — the Python dev
  server has none: `node server/relay.mjs --static . --lan --host 0.0.0.0 --port 8792` (once
  `npm --prefix server ci`). Each remote player gets their own camera (`p.rcam`, drawn by
  `Party.drawRemote` into `remote-host.js`'s canvases); the big screen frames the others.
- Test Party Mode with 1, 4 and 8 bots; check the solo game still works and the whole story
  in `T.autoplay()` (the first bot wears the crown and starts the party: `{t:'start'}`).
- Solo quick start: `D.pause(true); await D.newGame('Alex'); await D.skip(200);
  game.state.flags.wildIntro = true; game.world.wild.chooseClass('mage'); D.tp(-43, 86)`
  (a steppe camp; `game.world.wild` is the `Wild`, `.combat`, `.encounters`, `.travel`…).
- A phone in solo: `game.phone.start()`, then open `/pad.html#CODE` in another tab; the pad
  records drawing errors in `pad.S.drawError` (its loop never stops on one).
- Gamepads (the pane has none): `const F = await import('/tools/fakepad.js'); F.install(2,
  ['xbox', 'ps'])` fakes `navigator.getGamepads()` (families xbox / ps / nintendo);
  `F.press(i, 'a')`, `F.set(i, 'select', true)`, `F.stick(i, x, y)`; rumbles land in
  `window.__rumble`. `tools/padparty.js` `start(bots, shots)` plays Party Mode with pads (join,
  their big-screen menu, a queue, a late pad, rumble): poll `window.__pp`.
- Trailer (English, for Reddit): `tools/trailer.js` scripts the Party Mode shots, `tools/reel.js`
  records them frame by frame at 1080p (`POST /__rec` → ffmpeg, lossless mkv in
  `screenshots/reel/`) with captions in the pixel font, a real `pad.html` phone and the game's own
  sounds re-rendered offline; `tools/reelcut.py` cuts them after `tools/trailer.edl.json`. The
  recipe is in `trailer.js`'s header (`TR.all()` ≈ 10 min, `TR.mix()`, then `reelcut.py cut`).

### Known pitfalls

- **Never name a variable or parameter `t`** in a function that calls `t()` (the i18n
  function). It has broken things before.
- In tests, wait until `game.world.overCol` exists before `T.boot()`.
- Don't `await` a party fade (`fadeTo`, `backToLobby`) without stepping `game.debug.step`.
- Bots need a real `setTimeout` delay between steps so the relay delivers their messages.
- When the browser pane is hidden, `requestAnimationFrame` is paused: drive frames with
  `game.debug.step`, and capture the phone with `window.pad.draw()`.
- The big world's ground is painted in workers: inside a tight `game.debug.step` loop their
  messages never arrive — yield real time (`await new Promise(r => setTimeout(r, 100))`)
  before screenshots of new places.
- Navigating a tab to the same `pad.html#CODE` URL doesn't reload it (hash change only): use
  `location.reload()` to pick up new code.
- Editing with scripts: replace exact strings and check they occur once — never cut a slice
  between two markers (it silently deleted half of party.js once).
- `javascript_tool` times out after 45 s: split long scripts or run them in the background
  and poll a result variable.
- After a test with a real pad tab, that phone can come back into later `T.boot()` parties
  (even with its tab closed) and wear the crown, so `T.autoplay()` never starts: remove it
  (`P.removePlayer`) or crown a bot (`P.host.give(P.players.find((p) => p.id === 'bot0'))`).
- A Bash hook blocks heredocs containing the bare word "helm".
- The i18n scanner reads a straight apostrophe in a `//` comment after code as the start of a
  string (hundreds of false « missing »): write comments with `’`.
- Saga cast ids (`src/saga/cast.js`) must be unique across the whole saga — a second `nell:`
  silently replaces the first (chapter 3's Nugget Nell became chapter 8's singer once). Check:
  `grep -n "^  [a-z0-9]*: {" src/saga/cast.js | awk -F: '{print $2}' | sort | uniq -d`.
- A zone no chapter ever opens stays under the Murk (the Wide Sea `wide` opens with chapter 7);
  a new chapter's `zones` are opened (and the Murk refreshed) by `beginChapter`.
- A chapter prop's `userData.anim(t, saga)` gets the saga as its 2nd argument, not a frame time:
  a model whose anim needs `dt` keeps its own (ch10's `mooredShip`). A dungeon room counts
  heroes only a tile inside its edges: keep goal lines (`goalZ`) at `z + 1` or more.
- A `switch` with the same `case` twice runs only the first: a treasure hat called `furhat`
  hid behind the steppe folk's felt hat (it's `chapka` now). New hats, foes, props: grep the id.
- Props, buildings and valley animals merge their still parts into one mesh per material
  (`bakeMeshes` / `bakeTree` in `models/geom.js`): a part you animate, recolour or look up later
  must carry `userData.keep` (or `flag` / `swing`), or it vanishes into the merged mesh.
- README shots: `resize_window` 960×540, English (`game.settings.lang = 'en'` + `setLang('en')`),
  then `sagarun`/`worldboss` marks with `clean: 1` (the line typed out, old toasts cleared).
  Party shots come out 1280×720, solo 960×540. Reset the viewport (`preset: 'desktop'`) after.
- The valley is dense with trees and full of story places: big new constructions go in
  the big world instead (the Festival Ring now stands on the Golden Steppe, west of the
  valley: `ARENA_SITE` in `src/world/big/layout.js`, footprint cleared in `gen.js`, floor
  painted as `TT.ARENA` by `paint.js`, buildings in `src/party/arena3d.js`).

## Conventions

- **Style**: crisp pixels (integer scales only), toon shading (`toon()` in `render/r3d.js`),
  depth outlines, soft palette, the game's pixel font (`engine/font.js`), paper panels
  (`ui/ui.js`), synthesised sounds & music (`engine/audio.js`, data-driven tracks).
- **Controls**: never write a key into a hint ("E", "Esc", "Tab"): `ctl('interact')` (ui.js)
  names it on the device in hand — a key cap, a gamepad's button by family (Xbox A B X Y,
  PlayStation ✕ ○ □ △, Nintendo B A Y X), the phone's; `device()` says which ('keys' · 'pad' ·
  'phone' · 'touch'); `keyHint` draws a gamepad's face buttons round. In Party Mode a player's
  own buttons: `P.keyOf(p, 'a'|'b'|'x'|'y'|'u'|'m')`; a text for everyone says `{a}` with
  `P.keyName('a')` (the connected players' own: « A/E » when they differ), never a bare "A" —
  a keyboard player is there too, with the big screen's mouse (their menu, the votes: `tvmenu.js`
  `pointing()`, `voteRects`). `input.buzz(pattern, index)` rumbles.
- **Text**: every visible string goes through `t('English text', vars)` (or `tn` for plurals);
  the English text is the key. Five languages: French in `src/lang/fr/*.js` (new content → a new
  file, registered in `src/lang/fr/index.js`), following `tools/i18n-glossary.md`: tutoiement,
  French typography (space before `! ? : ;`, `« »`, `’`, `…`); Spanish, German, Italian in
  `src/lang/{es,de,it}/` — the same files as French (same keys, `_FR` exports → `_ES/_DE/_IT`,
  `index.js` from `node tools/i18n/mkindex.mjs xx`), each with its guide
  (`tools/i18n-glossary-{es,de,it}.md`), its names (`tools/i18n/names-xx.json`) and a translator's
  brief (`tools/i18n/brief-xx.md`). A new string → all four languages. Lines said to the whole
  party go in a chapter file's `__group` (vous · ustedes · ihr · voi). Dictionaries load on demand
  (`loadLang`). The dialogue box translates `say()` texts itself — don't double-translate.
- **Solo & Party share their systems**: the solo game runs Party Mode's systems (zones, swim,
  vehicles, mounts, combat, camps, lairs, progress, travel, secrets, races, events, the Festival
  Ring) through `src/solo/wild.js`, a "party of one" implementing the party API they use
  (`players`, `act`, `host`, `net`, `ask`, `say`, `spawnNpc`, `loadSave`/`writeSave` → the solo
  save, `keyName`…). A change to one of them must keep working in both modes: test both.
  Party-only wording goes through `P.solo ? … : …`.
- Match the surrounding code: dense, lightly commented, small helpers, no framework.

## Layout

```
src/engine/   display (two integer-scaled canvases), input (keys, mouse, touch, gamepads: an
              analog stick, rumble, the pad's family), font, colour, audio (synth engine)
src/ui/       hud, menu, dialogue, shop, creator, ui (panels, `ctl`, key hints); controls.js (the
              Controls screen: keyboard · gamepad · phone), osk.js (on-screen keyboard for names)
src/render/   r3d (low-res toon renderer, oblique ortho camera, post pass, split views: the
              world's matrices once a frame), cull.js (split views: each hides what it can't see
              nor shadow), lighting (time of day, lamp pool), portraits, wind.js (`windy(mat)`:
              leaves & grass sway in the vertex shader, whole texels; `WIND` strength follows the
              weather and bends the chimneys' smoke)
src/art/      procedural painters: terrain (ground texture + water info), surfaces, icons
src/models/   buildings (a house's `style`: roofKind, storeys, hip, roofShape, gable, annex, porch,
              tower, ivy, stack, smoke hours…; `perches` for birds, `WET_ROOFS`), nature & treekit
              (trees), props, furniture (rugs painted at 16 texels, the trades' clutter), boats.js
              (the rowboat & sailboat, lofted clinker hulls: vehicles, moored props, the stilt
              house's dinghy), chars (voxel chibis), geom (merging, soft boxes)
src/world/    overworld (valley map 240x128, POINTS, AREAS), world3d (valley scene),
              collision (circle vs tiles/colliders, A*), interiors, tiles (TT types)
src/scenes/   world.js — the solo game scene (also hosts shared systems used by the party:
              villagers' activities at their spots — `ACT`, `FACES`, `SEATS` in `scheduleFor` —,
              `placeSounds` (fountain, saw, café), the wheel's zoom → `game.zoomStep`)
src/systems/  fx (particles), perches.js (birds landing on ridges, posts, lamps), weather.js
              (puddles & rain rings, wet roofs, dawn mist on the water), critters, fishing…
src/solo/     wild.js (the wild lands in solo: a party of one), herotab.js (menu's Hero page),
              wanderers.js (Rook, Sigrid, Moss, Kai), phone.js (a phone as the solo controller)
src/party/    Party Mode: party.js (players, lobby, votes, HUD), camera.js (split-screen),
              inputs.js, remote-host.js (friends at home: their own camera, streamed over
              WebRTC), hub.js (Settings' Saves & backups page), tvmenu.js (a gamepad / keyboard
              player's own menu on the big screen:
              the solo Hero page + their own page; one at a time, a queue), net.js, story.js + games.js (Starfall Festival), explore.js,
              arena.js (Festival Ring: site + waves/brawl/king), arena3d.js (its
              buildings & instanced crowd), host.js (crown & host menu), zones.js,
              swim.js, vehicles.js, mounts.js, encounters.js (gloom camps), lairs.js
              (zone bosses, and the world bosses: `world: true`, a spot `at`), rares.js
              (named gloom with silver plates and a treasure hat each: TREASURE_HATS in
              data/looks.js, the hats in models/chars.js), progress.js (talents & gear), travel.js (waystones, fast
              travel, travellers & Pim's trade), secrets.js (plates & chimes
              puzzles, buried golden chests), races.js, events.js (invasions,
              migrations, shooting stars), camp.js (campfires & sleeping the night
              away, solo too), rooms.js (enterable buildings: rooms built off-map
              east of x=1000, per-view interior lighting), buddies.js, lantern.js, qr.js
src/combat/   classes (4 heroes), enemies, combat (hits, specials, drops), blessings, icons;
              v7/troupe.js (the Duchess's Understudies, the Snuffbot 3000, the Human Cannonball,
              the Synchronised Swimmers), v7/woods.js (ch2), v7/canyon.js (ch3: moles, fuse imps,
              the Drillosaur), v7/frost.js (ch4: ice imps, the Frost Tenor), v7/sea.js (ch5: the
              Gloom Kraken & its tentacles), v7/duchess.js (ch6: the Duchess's Debut — aria,
              spotlight, snuffer, frozen by a hen), v7/dawn.js (ch7: moths, ink imps, the Mime
              Troupe, Old Lucky the Paper Dragon), v7/moths.js (ch8: scarecrows, mothlings, the
              Moth Queen), v7/manor.js (ch9: wisps, clockwork soldiers, the Lady in Grey),
              v7/finale.js (ch10: stagehands, Snuffbot Mk III, the Grand Finale's Duchess),
              v7/world.js (the five world bosses, the gloom hen; `worldBossMul` weighs a hit
              by its direction and element); `e.immune` (a text) makes a foe untouchable;
              `e.hold` keeps a beaten boss on stage for its scene; v9/ (Release v9): classes9.js
              (the Lamplighter, the Gardener, the Cook, the Tinkerer), kit9.js (their statuses —
              lit, blind, root — sprouts, snacks, heat, turrets & traps, hooked into combat.js),
              talents9.js, weapons9.js, grandma.js (Grandmother Kraken, the sixth world boss,
              fought from boats: rowers ram her arms, lantern-throwers hit her when she peeks)
src/saga/     World v7's story engine: saga.js (chapters, quests, NPCs, the journal — hosted by
              explore.js in Party and by the solo Wild), stage.js (the scene director: camera,
              actors, bars, title cards), levels.js (zone levels, group scaling), murk.js (the
              Murk that gates lands), cast.js, dungeon.js + dungeons/ (instanced at x ≥ 3000:
              dark caves, or outdoor instances — instance.js: a little map of big-world tiles
              painted & streamed like the world, lit at the instance's own hour; room kinds:
              fight, plates, torches, wax, logs, points (rail points), simon (singing bells),
              thinice, tide (the sea goes out when its bells ring), vent (geysers that throw
              you in an arc: `to`/`tos`, caps sharing a pressure; `lavas`/`isles` carve lava),
              beam (beam.js: the dawn beam, mirrors, prisms, paper screens, lotuses; the pagoda
              theme is pagoda.js), jars (jars.js: firefly jars, moth swarms, glowcap doors; the
              heartwood theme is heartwood.js), clock (clocks.js: THEN and NOW; the manor theme
              is manor.js), spot (spots.js: sweeping spotlights, flats, the lighting board; the
              backstage theme is backstage.js), script, end), escort.js (escort steps: a walker
              on a path, or a flock following the lantern), games7/8/9.js (step mini-games:
              whack, lamps, kite, net, carry, rhythm, piles, seek, snap, defend, chase),
              pelican.js (the Pelican Post's flights), teacup.js (the Teacup line between the
              continents), chapters/ (ch1…ch10 — ch10 ends with the Epilogue and the credits;
              a chapter may darken its lands with `gloom(S)`; scenes have `st.sepia()` for
              flashbacks and `st.dialogue.showLetter(title, text, sign)` for a letter — `\n\n`
              between paragraphs). Step kinds: go, talk, camp, collect
              (spots; `dive`, `order`, `sound`, `drift` — moving pickups), kill, dungeon, scene,
              race, escort, check (any condition; `bot` for the harness), sneak (running near a
              sleeper sends you back), whack, lamps, kite, net, carry, rhythm, piles, seek,
              snap, defend, chase. A quest with `repeat: true` is a mini-game to play again:
              done, it's counted (`S.plays(id)`) and offered afresh — behind anything new the
              same person has to offer
src/models/v7/ kit.js, gloomstage.js (the flying opera house), props7.js, dawn7.js (ch7's props:
              mast, street lamp, barnacle, kite, sky lantern, spout), autumn8.js (ch8's:
              fireflies, jars, pumpkins, the festival stage, cut-outs, the siphon), moor9.js
              (ch9's: the manor, the Lantern Cannon, the workshop, the cuckoo, an aurora),
              finale10.js (ch10's: the Umbral Spotlight, searchlights, the Understudies' crate
              stage, a letter, festival bunting), landmarks7.js (the Dawnlands' landmarks, 3D
              peaks & limestone pillars)
src/pad/      the phone controller (pad.html) — canvas UI, talks to the relay; padmap.js
              (the phone's own world map: pinch, drag, tap — fed by worldmap.js mapBase/mapUpdate)
src/lang/     fr/ es/ de/ it/ — the dictionaries (keys = English source text), loaded on demand
tools/        devserver.py, partybots.js, sagatest.js (the saga played by itself: `V.solo`,
              `V.play`, `V.autoplay`, `V.toChapter(n)`), sagarun.js (a chapter played by the bots
              in the background: `start(mode, n, [chapters], class, marks)`, poll
              `window.__ap`), worldboss.js (the world bosses walked through their phases, and
              `start('rares', …)` the rares: poll `window.__wb`), balance.js (bots fighting
              real-sized camps at levels 5/20/40, 3 times each from a fresh start, or `BOSS`;
              `geared` spends every talent point; `classes()` each class alone: poll
              `window.__bal`), perf.js (Party frame times: `start(8, 'apart'|'apart4'|'together')`,
              poll `window.__pf`), grandmatest.js (Grandmother Kraken played through),
              i18n-scan.mjs, i18n-glossary.md,
              mapdump.mjs, bigmap.mjs (`--crop
              x0,z0,x1,z1` for a close-up), reel.js + trailer.js + reelcut.py (the trailer)
docs/         README screenshots, plans (docs/plans/), social/ (the link previews' 1200×630 pictures —
              og.png for the site, og-invite.png for pad.html / play.html — shot in the game at
              1200×630 with the logo drawn in its font; the Pages workflow puts them at the root)
```

Coordinates: 1 unit = 1 tile = 16 texels; x east, z south; the camera looks north at 45°.

## The big world (v3, grown in World v7)

`src/world/big/` — a 1728×512 world streamed in 32×32-tile chunks around the camera views:
two continents on one plane — the Hearthlands (`C1`, `gen.js`, around the valley, which keeps
its own coordinates) and the Dawnlands (`C2`, `gen2.js`) across the Wide Sea. Ground painted
in workers (`paint.js`, identical pixels to `art/terrain.js` in the valley), `BigCollision`
replaces `world.overCol` while it runs (`world.big` is set), `WorldMap` = minimap/fog (maps fit
the continent you're on: `mapRegion`). **Relief**: every tile has a height (`map.elev`); faces
are painted under drops (`faceTex`), a one-level step of `SLOPE` ground is a walkable bank,
bigger drops/rock are cliffs (`map.block`), paths are stairs, rivers fall where the ground
steps; mountains = `mountain()` terraces + a `CRAG` core + 3D `peak` POIs. Render the layout
with `node tools/bigmap.mjs screenshots/bigmap.png`. New tile types live in `world/tiles.js`
(`HIGH` plateaus get cliff faces, `LIQUID` get the animated overlay). Rooms are built off-map
at x ≥ 2000, dungeons at x ≥ 3000.

## Plans & progress logs (read the latest first after a context reset)

- Release v9 (in progress) — finish the game & prepare its release (pause menu, HUD modes, the
  hero in the creator, the big-screen menu, eight classes, World v7's leftovers, ES/DE/IT, the
  relay, the VPS, Electron, Pages — nothing published): `docs/plans/release-v9.md` (its log).

- Party Mode v3 (done): `docs/plans/party-v3.md` · `docs/plans/party-v3-progress.md`.
- Controls v8 (done) — the keyboard, a gamepad or a phone, in solo and Party (a pad player's
  own menu on the big screen): `docs/plans/controls-v8.md`.
- Solo v2 — the wild lands, the hero & the phone in the solo game: `docs/plans/solo-v2.md` ·
  `docs/plans/solo-v2-progress.md`.
- Adventure v5 (done) — Dino Isle (a jungle island of dinosaurs in the south-east sea: zone
  `dino`), dinosaurs to meet, tame and free (`src/party/dinos.js`, `src/models/dinos3d.js`,
  `src/combat/v5/`), the Tyrant King, new gloom (jellyfish blooms, night bats, mimics),
  companions managed from the phone (`src/party/buddies.js`, profile `pets`):
  `docs/plans/dino-v5.md` · `docs/plans/dino-v5-progress.md`.
- World v7 « Le Grand Monde » (in progress) — a WoW-vanilla-sized world (two continents with
  relief, lands after great national parks), the whole main story rewritten (the Duchess &
  the Murk, ten chapters), dungeons & bosses, cutscenes, levels to 40, side quests: brief
  `docs/plans/world-v7-brief.md`, bible `docs/plans/world-v7.md`, log `docs/plans/world-v7-progress.md`
  (read its last entry first). Test with `tools/sagatest.js`.
- Phone v6 (done) — the phone's icon-grid menu, the map drawn & zoomed on the phone, icon
  tabs in the host menu, zoom on the big screen's maps; one list of map marks for every map
  (`src/party/mapmarks.js`: each system's `mapMarks(out)`): `docs/plans/phone-v6.md` ·
  `docs/plans/phone-v6-progress.md`.
- Adventure v4 (done) — illustrated moves (`src/combat/v4/icons.js`), WoW-like talent
  trees & ultimates, weapons, spectacular effects, enterable buildings, Party Mode's clock &
  campfires: `docs/plans/adventure-v4.md` · `docs/plans/adventure-v4-progress.md`.
