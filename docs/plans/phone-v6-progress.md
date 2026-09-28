# Phone v6 — progress

- **P1 — icons & the menu** (commit "Phone v6").
  - The v4 icon engine gets UI glyphs (map, horseshoe, armory, shirt, campfire, bike, lifebuoy,
    door, cog, people, flag, camera, waystone, globe, info, close, menu, plus, minus, bag, a fox
    face for companions) and `drawGlyph(ctx, id, x, y, s)`; the knight's pan now holds a fried
    egg (it read as a magnifier — on the A button too).
  - The phone's menu: a grid of illustrated tiles (3 across, 6 on a landscape phone) with a ✕,
    a badge for talent points, the hero tile showing your weapon; « Se décoincer » and « Quitter »
    small at the bottom, leaving asks twice (« Sûr ? »). Top bar: icon buttons (campfire in the
    evening, map, crown, menu — a red dot when talent points wait). The solo row (Sac · Carte ·
    Journal · Héros) gets pictures (the word under them when it doesn't fit beside). The hint
    card grows for a long hint instead of cutting it.
  - « Mes montures » lists every mount: silhouettes for the ones still wild, with what they
    love and where they live (like « Mes compagnons »); the list's footer stacks when a label
    wouldn't fit.
- **P2 — the map, on the phone** (`src/pad/padmap.js`).
  - The big screen sends the world once (`mapBase`: the 800×400 picture, 236 KB) and, every
    second while the map is open, `mapUpdate`: the fog (5000 bits), the marks, everyone, the
    lands' names (yours flagged) and the legend's counts. The phone paints the fog itself (the
    very same veil: `paintVeilData` shared with `WorldMap`).
  - Pinch, drag with a flick, double-tap, +/−, « me », « the whole world », the wheel with a
    mouse; zoom levels settle on whole pixels (crisp) from 1 px a tile up, a smooth overview
    below; an arrow on the edge points to you when you're out of view; tap a mark or a friend:
    a paper label with its name & state (« Place du Marché — Éveillée : tu peux voyager
    jusqu'ici »). Names never overlap: players and the big marks claim their spots, then the
    names, then the little marks; zoomed far out the names go first (the objective & invasions
    always show). On a tall phone the whole world leaves room under it: the legend fills it.
  - One list of marks for every map: `src/party/mapmarks.js` (icons, `drawMark`,
    `collectMarks`); each system says what shows with `mapMarks(out)` (+ a name & a state), its
    `drawMapMarks` goes through the shared drawer (the big map, the spare panel, the solo
    minimap: same looks as before).
- **P3 — the host menu**: icon tabs (flag, waystone, camera, cog, people) with the chosen one's
  name under them, the ✕, rows as tall as their words (the lines under a button wrap on two
  lines instead of being cut).
- **P4 — the big screen's maps zoom**: `MapView` (worldmap.js) — Party Mode's full map (the
  wheel where you point, a drag, + / −, and the host's zoom rocker zooms the map while it's
  open) and the solo menu's world map (the wheel, a drag, F / C or a gamepad's X / Y, the
  arrows once zoomed; E still switches valley / close-up / world). Names out of view are
  skipped; a hint in the corner.
- **Tests**: a portrait (390×844) and a landscape phone, Party (host & not) and solo (a phone
  driving the solo game); gestures sent as real pointer events through the pad's input (drag
  30 tiles, flick, pinch 2→5.6 settling on 6, double-tap, −, « me »); the story autoplay (4
  bots) to the awards and back; 8 bots in 3 groups with the spare map panel (13.4 ms/frame; the
  marks cost 0.01 ms); solo new game → the steppe → the menu's map zoomed; 0 errors, i18n 0
  missing (`src/lang/fr/phone.js`).
- (Testing note: an old pad tab left open shares this browser's phone id — two pads with one id
  kick each other off the relay every 2 s. Close stray pad tabs.)
- **Scores /10**: phone menu 9 (from 5) · the phone's map 9 (from 3–5) · the host menu 9 (from
  6) · the top bar & solo row 9 · the big screen's maps 9.
