# Phone v6 — a lighter, illustrated phone & a map you can zoom

The user: « le menu sur le tel commence à être un peu chargé non ? puis ça manque d'icône
aussi ? je pense qu'on peut améliorer le côté téléphone » · « la carte ça serait bien de
pouvoir zoomer/dézoomer dessus, parce que là y'a beaucoup de texte c'est dur à lire ».

Where we start (phone 390×844, the pad's canvas 195×422): the menu is a column of 11–12
text buttons, all alike (5/10); the world map on a portrait phone is a thin strip with the
lands' names on top of each other and a legend spilling out of the screen (3/10); « Près de
moi » is a fixed close-up with a single name (5/10); the host menu is all text with cut-off
lines (6/10); the top bar's « Carte » / « ··· » are text pills (7/10).

## 1. Icons
The v4 icon engine (`src/combat/v4/icons.js`: glyphs drawn with shapes on 16×16, snapped
to crisp pixels, outlined) gets UI glyphs — map, horseshoe, armory (sword & shield), shirt,
campfire, bicycle, lifebuoy, door, cog, people, flag, camera, waystone, globe, info, close,
menu, plus/minus — and a `drawGlyph(ctx, id, x, y, s)` for a bare glyph.

## 2. The menu: an icon grid
A paper panel with a title and a ✕; tiles (a coloured square with its glyph at 2×, the
label under it; a badge for talent points) in 3 columns (6 in landscape); the rare & risky
actions (get unstuck, leave) as small secondary buttons at the bottom. Always the same
places (no tiles jumping around); the hero tile shows your hero's weapon. Solo & Party.
« Mes montures » lists every mount (silhouettes & where/what they eat for the others), like
« Mes compagnons ».

## 3. The map, drawn on the phone
The big screen sends the world once (the 800×400 picture, 1 px a tile), then small updates
every second while the map is open: the fog (5000 bits), the marks (waystones, camps, lairs,
chests, races, events, nests, the objective), the players, the lands' names & counts. The
phone draws it itself: pinch to zoom, drag to pan (with a fling), double-tap to zoom in, +/−,
« me » (centre on you), « world » (all of it), a legend sheet; tap a mark: its name. Names
are placed so they never overlap (more of them as you zoom in). The marks' icons & the list
of marks are shared with the big screen (`src/party/mapmarks.js`: one place decides what
shows on every map). Crisp pixels from 1 px a tile up; a smooth overview below.

## 4. The rest of the phone
Top bar: icon buttons (map, campfire, crown, menu). Host menu: icon tabs, the tab's name in
the title, lines that wrap instead of being cut.

## 5. The big screen's maps
Zoom & pan there too: Party Mode's big map (M; the host's zoom rocker, the stick) and the
solo menu's world map (wheel, drag, keys, gamepad).

## Milestones (tested on a portrait & a landscape phone, solo & Party, FR & EN; scored /10)
P1 icons & menu · P2 the phone's map · P3 top bar & host menu · P4 big-screen maps ·
P5 regressions & polish.
