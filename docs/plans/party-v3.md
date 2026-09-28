# Party Mode v3 — a whole world for the party

Goal: take the local multiplayer to another level — a big streamed world (~10× the valley),
fun ways to move (swimming, vehicles, mounts), deeper fights, and a "host" phone that runs the
show. Every part must reach 9/10. The solo game must not change.

## 1. The big map

### Size & coordinates

- **800 × 400 tiles = 320 000 tiles** (the valley is 240 × 128 = 30 720 → 10.4×).
- The valley keeps **its own coordinates**: the big map spans `x ∈ [-280, 520)`,
  `z ∈ [-136, 264)`, the valley sits at `[0, 240) × [0, 128)`. All story / arena / explore
  code (POINTS, AREAS, ARENA, nests…) keeps working untouched. Negative coordinates are fine
  (`Math.floor`, `hash2` and the collision grid all handle them).

### Layout (authored macro shapes + seeded noise)

```
z=-136 ┌─────────────┬──────────────────┬───────────────────┬───────────┐
       │ BOUNCECAP   │  WINDY HEIGHTS   │  FROSTPEAK        │  CLOUD    │
       │ WOODS       │  plateau, glider │  GLACIER  sleds   │  ISLES    │
       │ (mushrooms) │  cliffs, mills   │  crevasses, yetis │ (balloon) │
z=  0  ├──────┬──────┼──────────────────┼──────┬────────────┴───────────┤
       │ RED  │GOLDEN│                  │CROAK-│   EMBERPEAK            │
       │CANYON│STEPPE│   HOME VALLEY    │MIRE  │   VOLCANO              │
       │+MINE │herds │   (unchanged)    │MARSH │   lava, obsidian       │
z=128  ├──────┴──────┼─────────┬────────┴──────┴───────┬────────────────┤
       │ SUNSCORCH   │ SUNKEN  │   CORAL LAGOON        │ WHIRLPOOL      │
       │ DUNES       │ CITY    │   atoll, diving,      │ STRAITS        │
       │ worms, surf │ tides   │   turtles             │ currents, sail │
z=264  └─────────────┴─────────┴───────────────────────┴────────────────┘
      x=-280                 0                 240                    520
```

Twelve new zones, each with its own ground palette, landmark, props, music, ambience,
weather and signature mechanic. They connect through roads out of the valley (the Pinewick
road west, the Whisperwood trail north, the Frostpine track north-east, the Reedmarsh
boardwalk east), rivers, the open sea south, mountain passes, bridges and a balloon line.

Generation (`src/world/big/gen.js`, pure & deterministic, seed-driven): start from each
zone's authored macro shapes (ellipses, polylines, noise-warped masks — the same toolkit as
`overworld.js`), then fill details with seeded noise (coasts, dunes, forest density, rivers
wiggle), then stamp the valley tiles at the origin and open its borders where roads leave.
Object scatter (`objects.js`) is deterministic per tile hash, so any chunk can be rebuilt.

### Streaming

- **Chunks of 32 × 32 tiles** (a 512 × 512 texel ground texture each; ~325 chunks).
- **Terrain painting in Web Workers** (module workers, 2–4 of them): the same painter as
  `art/terrain.js`, windowed with a 3-tile margin so distance fields, cliff faces and decals
  are seamless across chunk borders, sampling noise at absolute texel coordinates (so the
  valley paints identically). The worker returns RGBA where **alpha = water info**
  (distance to land + bank flag) — one texture per chunk serves both ground and water.
- **Meshes built/destroyed around the camera views**: each view asks for the chunks under
  its ground rectangle (+ margins: 5 tiles south for tall objects, 2 east/west), nearest
  first; chunks leave with hysteresis; a per-frame time budget for mesh builds. Until a
  chunk is painted, a 32 × 32 "tile colour" preview texture stands in (no black holes).
- **Instanced vegetation per chunk** (one InstancedMesh per species per chunk, shared
  geometries & materials), unique props as small groups.
- **Collisions per chunk**: all object colliders are generated as data at party start and
  bucketed in a uniform grid; tiles come from the big ground array. `BigCollision` has the
  same interface as `Collision` (`blocked`, `move`, `add`, `remove`) plus a water flag for
  swimmers.
- **Shadows only near the views** (the sun's shadow frustum is re-aimed per view and covers
  the view + a margin).
- **Minimap & world map with discovery fog** (8 × 8-tile cells), small canvases
  (1 px per 2 tiles), never a giant texture; the map lives on the big screen (host menu /
  M key) and in the corner.
- In Party Mode the valley's static ground/water/skirt meshes are hidden (the streamed ground
  covers it, identical pixels); its buildings, trees and props stay. Trees in the way of the
  opened roads are tucked away the same way `ArenaSite.clearFootprint` does.

### Performance budget

Measured on this Mac (Apple M5 Max, Chrome, 1920×1080) by timing `game.debug.step` (CPU +
GPU sync through the canvas copy). Baseline today: **7.9 ms/frame** for 8 bots in 4 groups
in the valley.

| | budget |
|---|---|
| 4 views render (colour + shadow passes) | ≤ 9 ms |
| simulation (players, enemies, mounts, vehicles, critters) | ≤ 4 ms |
| streaming (mesh builds, uploads) amortised | ≤ 3 ms / frame |
| **total** | **≤ 18 ms → ≥ 55 fps** |

Knobs if over budget: fewer shadow casters (only near chunks cast), coarser far chunks,
merging instanced meshes per 2×2 chunks, lower shadow map size in grid mode.

## 2. Moving around

- **Swimming**: water is walkable for players in Party Mode; slower, the hero sinks to the
  shoulders (the opaque ground plane hides the rest), paddling pose, splashes & ripples,
  B = a short dive (bubbles, a shadow under the surface, grabs treasure at glinting spots).
  Deep sea has currents (flow zones drawn as moving foam streaks). No attacking while
  swimming; ordinary gloom can't enter water.
- **Vehicles** (board / leave from the phone): rowboat (2 rowers — tap A in rhythm, in sync
  = faster), sailboat (whole group, the helm steers, wind), minecart (rails with switches),
  glider (launch pads on cliffs, updrafts), sled (glacier runs), hot-air balloon (group,
  to the Cloud Isles), zipline. Simple, fun physics.
- **Mounts**: wild animals per biome, tamed with their favourite food + a phone mini-game,
  or by freeing gloomy animals. Stag (fast), boar (charge), giant hen (glides), turtle
  (swims), bear (sturdy), plus frog (big jumps, marsh). Mounted attacks. Each mount stays
  bound to its phone (saved in the phone's profile) and can be whistled for.

## 3. Deeper fights

- **Y button** on the phone (only while fighting): tap = dodge roll with i-frames, press just
  before a hit = parry (stagger + counter window). Keyboard/gamepad get a Y key too.
- Finishers on staggered foes, team juggles (launch then keep them up: combo counter &
  multiplier), elements & statuses (fire/burn, ice/chill→freeze, poison, stun), enemy
  armour and shields, gear to find and upgrade (element weapons, charms) saved per phone.
- **15+ new enemy types** with genuinely different behaviours (zone makers, summoners,
  healers, flyers, burrowers, kamikazes, shielded, elites with modifiers) and **a boss per big
  zone (≥ 4 new)** with phases and readable telegraphs.
- Balancing 1–8 players; difficulty setting (host menu).
- **Talent tree per hero** (user request): a point per level, spent on the phone in a
  "Talents" screen — three branches per hero whose nodes really change the moves (bigger
  slams, piercing bolts, poison acorns, songs that stun…), saved per phone.
- **Customise from the phone mid-game** (user request): the look editor opens from the
  phone's menu at any time, and an "Equipment" screen shows the gear you found and lets you
  equip / upgrade it.

## 4. The host phone ("maître")

- The first phone gets a crown; the crown can be handed over and moves automatically to the
  next connected phone when the host drops out.
- Host menu on the phone: pause / resume, skip dialogue, restart the activity, back to the
  lobby, change activity; difficulty & options (friendly fire in brawls, volumes, language);
  players (hand over the crown, remove absent players); **camera zoom** (crisp integer
  levels + Auto).
- Everything also works on the big screen with the keyboard or a gamepad (Esc / Start opens
  the same host menu).
- Zoom = the world canvas scale (integer device pixels per texel), so pixels stay crisp;
  Auto picks the level from how spread out the party is.

## 5. Milestones (each: tested, captured, committed & pushed)

1. Host phone & zoom.
2. Big-map engine: generation, workers, streaming, collisions, minimap/fog, performance.
3. Zones & biomes (ground, props, landmarks, music, ambience, weather).
4. Swimming & vehicles.
5. Taming & mounts.
6. Enemies, bosses, combat depth (Y button).
7. Zone content (camps, ruins, puzzles, treasures, challenges, NPCs, events, fast travel)
   and adapting Explore, the Arena and the Story to the big map.
8. Polish, audio, translations, README, screenshots.

## 6. Risks

- **Worker painting throughput** after teleports (4 groups at once): previews + nearest-first
  queue + LRU cache of painted chunks.
- **Draw calls** with 4 views × (colour + shadow): instancing per chunk, shared materials,
  shadow margin kept small.
- **Touching shared code** (World, Collision, camera): guard every change behind the party's
  big world (`world.big`), re-test the solo game each milestone.
- **Coordinates everywhere** assume the valley: keeping the valley at the origin avoids a
  big refactor.
- **Scope**: twelve zones is a lot — the engine is parametric (tile types, palettes, object
  kinds, zone tables) so each zone is mostly data + one signature mechanic.
- **i18n**: every new string through `t()`, French in `src/lang/fr/world.js` (+ others).
