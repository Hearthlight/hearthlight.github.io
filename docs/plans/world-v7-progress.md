# World v7 « Le Grand Monde » — progress log

Plan (the design bible): `docs/plans/world-v7.md`. Brief: `docs/plans/world-v7-brief.md`.

**Resuming after a context reset**: read the brief, `CLAUDE.md`, the bible, then this log
from the top; the last milestone below says what is done and what comes next. Test server:
port **8766** (never 8765, the user's save lives there): open
<http://localhost:8766/?debug=1> in the browser pane (`preview_start` with that url — a
server is already running on 8766). Commit only your own paths (`git add <paths>`), fetch
before pushing.

## M0 — the design bible (2026-09-27, 22:10)
- Read the brief, CLAUDE.md, README, the v5/v6 plans; four read-only surveys of the code
  (Party core, solo game, combat & levels, big world & maps) — their key findings are folded
  into the bible (§0 scores, §5 balance, §9 technical plan).
- Decisions: one plane (x −280…1448, z −192…320) with the Hearthlands unchanged and the
  Dawnlands east of a Wide Sea; 29 zones with fixed levels; cap 40; monsters keep their
  level, scale live with the heroes nearby; level sync in Party; the Murk gates zones by
  chapter; ten chapters in three acts; one saga engine (`src/saga/`) hosted by ExploreAct
  (Party) and Wild (solo); dungeons off-map at x ≥ 3000; rooms move to x ≥ 2000.
- Scores before v7: world 6 · biomes 7 · bestiary 7 · story 3 · dialogues 5 · cinematics 2 ·
  NPCs & quests 5 · dungeons & bosses 3 · levelling & balance 4 · side quests & mini-games 6 ·
  phone & maps 8 · performance 8.

## M1 — foundations (2026-09-27, 23:55)
- **Levels** (`src/saga/levels.js`): every land has a level range (`ZONES[].lv`, the valley 1–5 …
  Dino Isle 27–30); cap 40 (`talents.js MAX_LEVEL`, 39 talent points of 45);
  `XP_NEED = 40 + 30·lv + lv²`. Monsters keep their level (`Combat.spawn` takes `opts.level`,
  else a roll in the land's range; camps keep one level each, guardians = the land's top + 1,
  the Festival Ring = the party's average own level via a `REGIONS` entry). HP ×`hpL(lv)`,
  damage ×`dmgL(lv)` (each enemy gets its own `def` copy: every brain's `e.def.dmg` scales).
  Group scaling counted live (`Combat.regroup()` once a second): HP ×(1 + 0.8(n−1)) (bosses
  0.9), damage ×(1 + 0.04(n−1)); camps +⌊n/2⌋ foes and +1 elite per 3 heroes. Level gaps:
  `gapDealt`/`gapTaken`. Heroes fight at an effective level `f.eff` (Party: clamped to the land,
  up or down; solo: down only), refreshed when it changes (HP ratio kept). Kill XP by level for
  every hero within 24 tiles (none for grey foes); burns/poisons on heroes scale with the land.
  Level tags in WoW colours next to hurt foes' bars (elites ★ gold, rares ★ silver).
- **Dialogue box**: `{p}`/`{pp}` pauses, `{shake}`, `{wave}`, `{big}` shouts, a jolt on open,
  `speed`, `auto`; six new faces (angry, smug, worried, cry, shock, sleepy); saga names
  translated; NPC `scale` & `tag` colour.
- **Stage** (`src/saga/stage.js`): the scene director (both modes): camera glide/punch-zoom
  (whole ppu steps; `cam.director` in Party's `SplitCam`, `world.director` in solo), bars, title
  cards, flashes, shakes, sky (`lighting.gloom`/`drain`), 3D props with tweens, actors (solo:
  the real villagers), heroes' reactions; skip = the crowned phone's Y / host menu « Skip the
  whole scene » / Esc held in solo — every step resolves at once so the world ends the same.
  Phones show « watch the big screen » during scenes.
- **Saga** (`src/saga/saga.js`): state (Party `hearthlight.party.saga.v1`, solo
  `state.wild.saga`), chapters & quests (steps talk · go · kill · camp · collect · dungeon ·
  flag · check · scene), NPC placement (`when`/`at`, villagers in solo called over through
  `story.override`), ! and ? over heads, map marks, objective (Party's card, solo HUD tracker
  and journal), pickups, story camps (through Encounters: fixed pool/level, never respawn),
  rewards (XP by quest level, stardust). Hosted by ExploreAct (the old nests & Grumblecloud
  rest) and by Wild; solo's Hollis legend now opens chapter 1.
- **The Murk** (`src/saga/murk.js`, FR « la Brume Mauve » — « grisaille » already means gloom):
  locked lands block collision (`BigCollision.walkable`), fog-puff walls and a veil per chunk
  near the cameras, a hatch on the maps, roll-in/roll-back pulses, lost heroes brought back.
- **Chapter 1** begun (`src/saga/chapters/ch1.js`): the *Lights Out* scene (the Gloomstage
  model `src/models/v7/gloomstage.js`, the Grand Snuffer, Crumble & the Duchess on the balcony,
  the villain's waltz `villain`), Hollis's lantern, the ember camps, the Understudies on the
  beach, the relighting and Perkins (dungeon still a stub); side quests *The Cold Oven* and
  *Buttercup Won’t Budge*. FR (`lang/fr/ch1.js`, `saga_ui.js`) with « vous » variants
  (`FR_GROUP`, `setAudience('group')` in Party).
- New sfx: fanfare, chain, thud, chime. Tools: `tools/sagatest.js` (solo quick start, frame
  stepping that reads the lines, shots).
- Tests: the opening scene watched & skipped in solo and Party (4 bots, French), the talk with
  Hollis, the fields camp (level 2 foes), the Festival Ring at the party's level, the Starfall
  Festival still starts: 0 errors, i18n 0 missing.
- Next (M2): the dungeon system + the Glimmer Grotto (the Understudies' juggling act, the
  Snuffbot 3000), polish every ch1 scene (Murk shot, ship framing), Perkins's pelican model,
  bots autoplaying chapter 1, scores.

## M2 — the vertical slice: chapter 1 (2026-09-28, ~00:30)
- **Dungeons** (`src/saga/dungeon.js`, defs in `src/saga/dungeons/`): instanced, far east
  (x ≥ 3000, `DUN_X`), one at a time, the whole party goes in (off mounts/boats) and comes out
  at the door. A grid carved from rooms (caves: ragged ellipses; pools you can't cross) and
  corridors with gates (`links`); room kinds `fight` (doors lock, foes, a chest), `plates`
  (hold them all at once — they stay lit 7 s alone, 5 s for two, 3.5 s for more), `wax` (hot
  wax drips on marked spots), `script` (mini-boss / boss run by the chapter: `run`/`tick`),
  `end` (the prize). Floor painted per texel (smooth sand, round pools with rims, wax spills),
  instanced boulder walls (tall north, low south), props (crystals, torches, braziers,
  candles, stage lights, a stage, a pedestal), lights incl. every hero's lantern and bosses.
  BigCollision asks it first for x ≥ DUN_X; Party's rooms.js lights and frames it as a big
  dark room (ambient 0.46); solo lights & clamps it (`soloLight`, `clampSolo`); a minimap of
  its rooms in both modes; `REGIONS` level; music `grotto` (new track).
- **The Glimmer Grotto** (lv 3–5): mouth · rock pools (gloom crabs) · three plates · the
  Understudies' stage (their *Juggling Act*: Minnow's pins, Fidget's dashes & smoke bombs,
  Brick's charge & slam; one bar for the trio; they limp off, not poof) · the wax gallery ·
  Crumble's *Snuffbot 3000* (Snuff Slam on a marked circle, a cone of hot wax leaving burning
  puddles, candle imps from phase 2, steam rings + the boiler hatch open ×1.5 in phase 3; its
  wreck stays, smoking) · the shrine (the ember). New foes in `src/combat/v7/troupe.js`
  (+ `bossDamageMul` for the hatch, `drawGroupBar` for mini-boss bands).
- Chapter 1 polish: the Gloomstage arrival framed on the ship, a tragedy mask, the Duchess
  without glasses (a scarf), the Murk shot on the valley's north edge, the Understudies on
  the sand, flavour lines for the embers, room lines in the grotto; the cave mouth prop on Old
  Glimmer Point (`src/models/v7/props7.js`, chapter `props`). The Murk drawn with soft
  camera-facing fog cards.
- Party: « L’Aventure » first in the lobby vote (its sub says the chapter) and the host menu.
  `T.autoplay('saga')` (partybots) plays the Adventure through `tools/sagatest.js`.
- Tests: chapter 1 end to end by `V.autoplay` in solo, with 4 bots and with 8 bots; Hollis's
  legend starts it in solo; screenshots reviewed at every key moment (see `r2_*`): 0 errors,
  i18n 0 missing. Frame times: 8 heroes together 6.6 ms, 3 views 13.7 ms (as before v7),
  4 views 14.3 ms, 8 separate views 24 ms (the Murk ≈ 1 ms of it), in the grotto 5 ms.
- Scores (chapter 1): story & dialogues 8.5 · the opening scene 9 · the grotto 8.5 · bosses 8.5 ·
  NPCs & quests 8 · the Murk 8.5 — to revisit in the polish pass (Perkins as a pelican rider,
  richer ember quests).
- Next (M3): the big world — the Dawnlands and the Wide Sea (gen2.js), rooms moved to x ≥ 2000,
  new tiles & scatter, maps by continent.

## M3 — the big world: two continents, relief, the great parks (2026-09-28, 00:30)
- **One plane, two continents**: `BIG` is now 1728×512 (x −280…1448, z −192…320). The
  Hearthlands keep their generation, clipped to their own box `C1` (only the east coast is
  new: a wavy shore onto the Wide Sea, crags where the sea of clouds ends); `gen2.js` makes the
  Wide Sea (zone `wide`, the Hearthlands' seas deepen into it along a wavy line), Whale Isle,
  Pelican Rock and **the Dawnlands** (`C2`, 11 lands, seeds in `layout.js` with `c2: true`).
  Rooms moved to x ≥ 2000 (slots from 2200), dungeons stay at x ≥ 3000.
- **Relief** (the player asked for mountains, hills, volcanoes, a living map): a height per
  tile (`map.elev`), faces painted per texel under every drop (`paint.js`: pass 1 picks
  (type, level) pairs, pass 2 finds the faces, `faceTex(E, e)`: 10 texels for the first level,
  16 per level above), banks (a one-level step of soft ground, walkable, painted as a shaded
  slope — `SLOPE` in tiles.js) vs cliffs (blocked: `map.block`, computed by `reliefBlocks`),
  ledges, waterfalls & lava falls (painted + animated by the liquid overlay, alpha code 62),
  crags (`TT.CRAG`, unclimbable), jagged faceted **3D peaks** and limestone pillars
  (`BUILD.peak`, `src/models/v7/landmarks7.js`), roads keeping the height of the ground (stairs
  where it steps), hill-shading on every map. Helpers in gen.js: `raise`, `mountain`,
  `baseRelief`. C1 got the north & west mountain walls with peaks, Frostpeak's mountains, a
  stepped Emberpeak cone with lava falls, Breezy Hill level 2, the Heights' waterfall, the
  dunes' buttes & Sunrock.
- **The Dawnlands, each after a great park** (see the bible §2.3b): the Lantern Bay fjord
  (cliffs, the Bridal Veil fall into the bay, Lanternport in walled terraces, houses built
  like the valley's: POI `house`), Jade Terraces (Longji paddies, Zhangjiajie pillars, the
  pagoda & torii), Saltmirror (Uyuni pools, the Saltworks' pans & wind pumps, Pamukkale's
  White Stairs with turquoise pools), Emberleaf (red maples, pumpkins, Harvestholm), Glowtide
  (mangroves, stilt houses, Ha Long stacks), Elderbough (Yosemite: the granite rim, Half Dome,
  El Capitan, the great fall into the Wellspring, the Great Tree), Hollowmoor (Skye: moor,
  lochs, the Old Man, the stone circle), **Prism Springs** (Yellowstone: the Grand Prismatic
  in rainbow rings, sinter & orange mats, terraces, geysers, Old Punctual), Cogsworth Heights
  (the Alps: the Cogswhorn, the brass town & clock tower), Aurora Tundra (Glacier NP: high
  plateau, peaks, glacier tongues, turquoise lakes), the Umbral Scar (basalt causeway, chasm,
  black spires). 13 new tiles (BAMBOO, PADDY, SALT, AUTUMN, ROOTS, MOOR, CRYSTAL, COBBLE,
  METAL, TUNDRA, UMBRAL, CRAG, SINTER), their scatter (bamboo, red maples, elder oaks, menhirs,
  gorse, prism spires, salt heaps, cogs, lichen rocks, black spires, floating rocks, karst…),
  landmarks (pagoda, torii, stone lanterns, wind pumps, the Great Tree, the stone circle, the
  geode, the clock tower, the whale's eye & tail), water palettes (mirror, glowtide, umbral,
  prismatic, glacial, karst, turquoise pools).
- **Sound**: 13 new tracks (`tracks_world.js`: voyage, whale, harbor, jade, salt, autumn, glow,
  elder, moor, prism, clock, tundra, scar — all validate), ZONE_FX for every new land
  (ambience, weather, washes, events incl. a Highland drizzle).
- **Maps by continent**: the big map, the solo menu's map and the phone's map fit the
  continent you're on (`mapRegion`), titled by its name; the other continent's names stay
  off. The fog save migrates (old 100×50 bits → rows +7).
- Tests: generation ~0.4 s in node (0.8 s warm in the browser, 3 s the very first cold run),
  chunks paint in ~160 ms in the workers; Party 4 bots, 4 views across both continents 9 ms a
  frame; 0 errors; i18n 0 missing (`src/lang/fr/world_v7.js`).
- Scores: world size 9 · relief 8.5 (the painted faces only show on south slopes — the camera's
  law) · Dawnlands' looks 8.5–9 (Yosemite, the fjord, Prism Springs, the tundra lakes 9; the
  Alps & the Scar need their towns and foes to feel lived in) · maps 8.5 · music 8.5.
- Next (M4): chapter 2 — the Deepwood & the Heights, the Rootway, Barkbeard, the Pelican Post
  (Perkins's roost on Pelican Rock, pelican flights between roosts).

## M4 — chapter 2, the Pelican Post, outdoor instances (2026-09-28, 01:50)
- **Chapter 2, « Les Bois qui murmurent »** (`src/saga/chapters/ch2.js`): the foresters of Deep
  Whisperwood (Old Rowan, who listens to trees; Tansy, a future Lamplighter who does a very
  good owl), three whispering trees sick with gloom (camps), Perkins opening the **Pelican
  Post** (his roost « mostly out of your laundry line », the first flight onto the Heights),
  Barley's windmills stopped by Crumble's gloom kites (three camps; the mills really stand
  still until freed: the chapter's `update` hook), Crumble blown past on a kite (« Operation
  Wind-Down has… wound… DOWNNN! »), the door behind the falls, **the Rootway**, Barkbeard
  freed, the Deepwood's Great Hearth relit, the Murk rolling back from the Steppe, the Canyon
  and Bouncecap Woods; the tea gag; the hook to chapter 3 (the Festival Ring's big tent and its
  cannon). Side quests: Tansy's lamp posts, the owl who lost her hoot (echoes to collect),
  Barley's first flour to Rosa, the Heights' cairns. A quest's `next` turns the chapter over;
  `catchUp()` brings older saves up to date.
- **Foes of the woods** (`src/combat/v7/woods.js`): gloom kites (circle, mark a line, dive),
  rootlings (lunge), badger kits, gloom saplings (lob acorns); **Grumbleclaw** the gloom badger
  (swipes, burrows then bursts out under you, calls his kits) and **Barkbeard** (root lines
  bursting from the ground, acorn volleys, a sweeping branch, stomp rings in phase 3, the
  gloom knot in his chest to punish — `exposed`), the freed Barkbeard as a prop.
- **The Pelican Post** (`src/saga/pelican.js`, `src/models/v7/pelican.js`): a roost by every
  hub (POIs placed on dry ground), found by walking up to it (banner), then A at any roost:
  « Fly where? » (far ones first, home last); the flight is a scene — one pelican per hero in
  a V, the camera riding the leader high over the streamed land, landing a few steps off
  (« Slightly off. It's a tradition. »). Roosts on every map (marks), saved per game.
- **Outdoor instances** — the player's note mid-milestone: « un donjon n'est pas forcément
  sombre, ça peut être une zone instanciée comme dans WoW ». `src/saga/instance.js`: a dungeon
  with `outdoor` becomes a little map of the big world's own tiles (rooms → glades, corridors
  → dirt paths, everything else thick woods rising into cliffs, `block` 3 = nobody crosses),
  painted by the same chunk painter in its own workers (`ChunkStreamer` now streams any map),
  scattered with the same trees plus the place's own (`objs`: elder oaks, the Heart Tree),
  with its own features (`paint(T)`: a stream falling off the plateau into the Heartwood's
  pool), the same collision, and lit by daylight at the instance's own hour
  (`lighting.updateInstance`: no zone weather, no Murk gloom; per view in Party, `rooms.js`).
  The Rootway is now a hidden valley behind the falls at 15:30: the glade, the root arches
  (rootlings), the fireflies' dell (braziers in order), the burrow fields (kits), Grumbleclaw's
  den, the log slide, the Heartwood (Barkbeard, the waterfall), the Great Hearth under the
  Heart Tree. Gates of the `roots` theme are gnarled roots that rise and sink; new props
  (root arches, burrows, logs, stumps, standing stones, flowers, fireflies). The camera may look
  a little into the woods round an instance; the HUD names the dungeon; **Party's screen now
  splits inside a dungeon** (it used to stay one view as in a house: `frame.big`).
- Fixes on the way: open gates now start sunk (they stood up, open, in the grotto too);
  bosses posed by hand during their intro scene (the fight is paused: Barkbeard used to be a
  tiny thing under the ground under his title card); heroes stay hidden in their pelican in
  Party (the hit-blink reset `p.hidden` every frame: `p.away`).
- New music: `rootway` (A dorian 6/8, kalimba and flute). French: `src/lang/fr/ch2.js` (« vous »
  lines for the party); i18n 0 missing (the scanner now reads `src/saga/pelican.js` too).
- Tests: chapter 2 played end to end by `V.autoplay` in solo and in Party with 1, 4 and 8
  bots (`V.toChapter(n)` jumps a game to a chapter and replays it), 0 errors; 4 views spread
  over the Rootway 9.7 ms a frame, one view 3 ms.
- Scores: chapter 2 story & dialogues 9 · the Rootway 9 (it went from a dark cave, 7.5, to a
  sunlit valley) · Barkbeard 9 · Grumbleclaw 8.5 · the Pelican Post 9 · side quests 8.5.
- Next (M5): chapter 3 — Dust & Spores (the steppe, the canyon, Bouncecap Woods): the Festival
  Ring's big tent and the Understudies' *Human Cannonball*, a gold-rush town, the Old Mine as
  an outdoor quarry with its tunnels, Foreman Grubb and the Drillosaur.

## M5 — chapter 3, Dust & Spores (2026-09-28, 03:00)
- **Chapter 3, « Poussière et Spores »** (`src/saga/chapters/ch3.js`, levels 10–15): the
  Duchess's big top on the Festival Ring and the Understudies' **Human Cannonball** (Brick is
  fired out of Big Bertha onto marked circles and sits dizzy where he lands: ×1.8 then; the
  act respawns whole if the heroes leave) — the note in Minnow's costume: the Steppe's
  Hearthstone dug up from under the Ring and sold to Foreman Grubb; Grandmother Tuya and
  Temur at the Nomad Camp (three lost fluffhorns sulking behind rocks, gloom tumbleweeds on
  the grazing ground); **Dusty Gulch**, a gold-rush town round the railway's end (false-front
  saloon, store, sheriff's office and assay office: POI `frontier`, `installFrontier` in
  landmarks7.js), Sheriff Dolly, Old Boom the retired human cannonball (Bertha was his); the
  **ore cart chase** up the Canyon Railway (a scene: one cart per hero, dynamite thrown back,
  the mine's mouth blown shut); Professor Hazel and the old quarry road; **the Old Mine**;
  the Hearthstone back under the Ring's star, the Murk rolling back from Croakmire, the
  glacier and the Cloud Isles; Perkins with King Croakington's letter (the hook to ch4).
  Side quests: Temur's wind chimes, Old Boom's lucky helmet (and his dive into the trough),
  Nugget Nell's gold, the Mother Cap's cold (Old Morel and the Sporefolk).
- **The Old Mine** (`src/saga/dungeons/oldmine.js`): an outdoor instance in the Red Canyon at
  17:40 — the Lamplighters' open-pit quarry, terraced red walls (`rim`/`woods: 'mesa'`,
  cliffs `[1, 2, 4]`), rails, ore carts, derricks, the foreman's shack. The quarry gate · the
  sorting yard (moles & fuse imps) · the rail points (three levers) · the crystal cut (miners'
  lamps in order) · the blasting cut (dynamite off the ledges: `drop: 'dynamite'`) · the cart
  run (runaway ore carts: `roll: 'cart'`) · **the Mole Brothers** (Pick, Shovel… and Doug) ·
  **Foreman Grubb & the Drillosaur** (drill charges, burrows, rock rain off the walls, his
  crew from phase 2, the engine stalling and steaming in phase 3: ×1.6) · the Hearthstone.
  The `mine` theme's gates are plank barricades.
- **Foes** (`src/combat/v7/canyon.js`): mole miners (pick swings, burrows), fuse imps (the
  ember imp's brain), gloom tumbleweeds (rolling lanes), the Mole Brothers, the Drillosaur;
  steppe and canyon camps now use them. A `dynamite` projectile.
- **Look**: new hats (cowboy, hard hat with its lamp, the nomads' fur hat), the big top (a
  striped cone of panels), the show stage, Big Bertha, the rockfall, the quarry gate, the
  Ring's empty hollow and its star once relit, wind chimes, fluffhorns, ore carts.
- **Music**: `bigtop` (a circus galop), `oldmine` (a western lope). French: `src/lang/fr/ch3.js`;
  0 missing (and « Ravin-Poussière », « Rocher-aux-Pélicans »).
- Tests: chapter 3 played end to end by `V.autoplay` in solo and in Party with 1, 4 and 8
  bots, 0 errors (`V.toChapter(n)` now also clears the replayed chapter's pickups and camps).
- Scores: chapter 3 story & dialogues 9 · the Human Cannonball 8.5 · Dusty Gulch 9 · the ore
  cart chase 8.5 (a scene, not yet something you steer: the Minecart Rush mini-game of M13) ·
  the Old Mine 8.5 (its big rooms want more clutter) · the Drillosaur 8.5 · side quests 8.5.
- Next (M6): chapter 4 — Mire & Frost (Croakmire, Frostpeak Glacier, the Cloud Isles):
  King Croakington's stolen crown, the Gloomstage's shadow over the glacier, Crumble stuck in
  a cloud; the Frostbell Halls (a frozen pass up to an ice palace), the Frost Tenor.

## M6 — chapter 4, Mire & Frost (2026-09-28, 04:30)
- **Chapter 4, « Marais et Frimas »** (`src/saga/chapters/ch4.js`, levels 16–22): King
  Croakington's crown — and its Ember Pearl, which keeps the marsh's Great Hearth warm under
  his lily-pad throne — snatched by Crumble on a gloom balloon: Croakmire under snow, the king
  with a cold, Sir Newton the herald (« Messire Triton »); the Gloomstage sailing over
  Frostpeak Camp, its shadow sliding across the glacier and the ice singing back; Mama Yuki,
  Tobi the sled kid; ice imps on the Balloon Station; **Captain Wendy** (her airship « in the
  shop ») and Nibs the albatross who is afraid of heights — a balloon flight over the clouds
  (a scene); **Crumble stuck head-first in a cloud** (freed, then off under a tiny umbrella,
  with great dignity); the **Frostbell Halls**; the crown home, the Murk rolling back from the
  dunes, the lagoon and the Sunken City; a bottle from the Turtles of Turtle Nest (the hook to
  ch5: the Understudies' synchronised swimming). Side quests: the king's scarf (knitted by
  Mama Yuki, little flies on it), the royal choir's runaway frogs, Tobi's race down the
  Glacier Run, Sister Nimbus's three silent bells on the Cloud Isles.
- **The Frostbell Halls** (`src/saga/dungeons/frostbell.js`): an outdoor instance on the
  glacier at noon — a snowy pass between frozen cliffs, snowpines, then halls of blue glacier
  ice. The pass · the slope (ice imps) · three frost bells · the crevasse (snowballs roll down
  marked lanes: `roll: 'snowball'`) · the ice lanterns · the eaves (icicles fall on marked
  spots: `drop: 'icicle'`) · **Chief Frostbite** (tickets, please) · **the Frost Tenor**: arias
  (rings to jump), shards, a glissando that leaves frost, a chorus of imps, and in phase 3 his
  **HIGH C** — hide behind one of the four ice pillars (a line-of-sight test), which the note
  shatters; then he is out of breath (×1.6). The `ice` theme's gates are walls of ice blocks.
- **Foes** (`src/combat/v7/frost.js`): ice imps (snowballs, belly-slides), Chief Frostbite,
  the Frost Tenor; glacier camps use the imps.
- Fixes: the boss bar now shows the boss nearest the heroes (a lair's boss out in the world
  took it); a saga character can no longer take a villager's id (the glacier kid was « Pip »,
  like the valley's Pip: renamed Tobi; `cast.js` now refuses a clash); the freed Barkbeard's
  collider is really added. The Frostbell door stands under the peaks, away from the Frost
  Colossus's lair at the ice arch.
- Music: `frostbell` (a crystalline 3/4 waltz). French: `src/lang/fr/ch4.js`, 0 missing.
- Tests: chapter 4 played end to end in solo and in Party with 1, 4 and 8 bots, 0 errors.
- **Design review** (the player's request, from now on after every chapter):
  `docs/plans/world-v7-reviews.md` — chapters 1–4 honestly at **7.5**: structure fatigue (the
  same template every chapter), the Duchess off stage, too few intense beats, one comic voice
  for everyone (« Mind the… » ten times), reskinned puzzle rooms in all three dungeons, quest
  verbs limited to camps / collect three / go to three spots. Its fixes are the next step.
- Next (M6b): the quality pass — dialogue voices, the Duchess on stage in chapters 3–4 and the
  first seed of her past, the Old Mine's rail points, the Frostbell's singing bells and thin
  ice, a real timed race step; then M7: chapter 5 (Sand & Sea) built to the review's checklist.


## M6b — the quality pass after design review 1 (2026-09-28, 06:30)
The fixes of `world-v7-reviews.md` (review 1: chapters 1–4 at 7.5), done and checked in the game:
- **Dialogue**: voices and verbal habits per character; the tics thinned out (« Mind the… »
  from ten to two, « a very large… » to one); a few lines rewritten for rhythm.
- **The Duchess on stage**: ch3's **Gloomophone** (a brass horn rises from a trapdoor on the
  Understudies' stage and blares purple notes while she scolds them and threatens the « Wick
  Brigade »); ch4's **balcony** (the Gloomstage sails in over Frostpeak Camp and hovers, the
  camera climbs to her balcony, she taunts the heroes, it sails off north-west).
- **Seeds & sincere beats**: Old Boom and the hen (ch3); the melting Frost Tenor's « Have a
  little pity for Gloria… Nobody ever stayed… for her finale… » (ch4).
- **New room kinds** (`src/saga/dungeon.js`): `points` (a rail network drawn on the ground,
  levers — plain or **wired** to several sets of points by colour —, buffer stops on the
  sidings, the ore cart waiting at its depot, a big red button), `simon` (singing bells: the
  tune gets a note longer each round, a sour note replays it), `thinice` (slabs over a frozen
  river; the thin ones crack, dunk you and send you back; a snow gust hides them every 9 s).
  The Old Mine: rail points, then wired points (its torches room is gone). The Frostbell Halls:
  singing bells, thin ice, the ice choir (a fight).
- **The `race` step** (`saga.js` `raceTick`): flags in order against a clock that ticks every
  frame (only dialogue or a scene holds it); banner, flag toasts, the last five seconds counted
  out, « Too slow! » and back to the start. Tobi's Downhill Dash is a sled race (10 s).
- **Find by ear**: a collect step with `sound` (no glint: a note and a sound from nearby) and
  `near` (the marker shows where to listen) — the choir's frogs.
- Fixes found on the way: toasts wrap and stay by length (both HUDs); floating numbers and
  barks fade during scenes; gloom camps keep 14 tiles off the sled runs (one sat on the Glacier
  Run); ramp sleds spawn clear of their ramp (they were stuck in its collider and wiped out);
  thin ice cracks right to the river's edge; `sagatest` `autoplay({ prefer })` plays a
  chapter's own side quests before the next chapter's.
- Tests: the new rooms and the race checked one by one (`m6b_*` screenshots); chapters 3 and 4
  replayed end to end (with every side quest) in solo and in Party with 1, 4 and 8 bots.
- Review 1 re-scored: **8.4** (story 8.5, dialogue 8.5, intensity 7.5, quest variety 8,
  puzzles 8.5, bosses 8, set pieces 9, places 9, coherence 8.5). Carried forward: chapter
  structure (ch5 opens mid-action, with a setback), chapters 1–2's dungeon templates and three
  look-alike bosses (M14's polish, planned in the review).
- Next: M7, chapter 5 « Sable et Écume », built to the checklist first.

## M7 — chapter 5, Sand & Sea (2026-09-28, 08:30)
Designed first, to the review checklist (`world-v7.md` §3.4), then built:
- **Chapter 5, « Sable et Écume »** (`src/saga/chapters/ch5.js`, levels 21–26). A cold open in
  the middle of a real **sandstorm** (the dunes' own storm, forced): Perkins drops the heroes
  « slightly off » beside Tariq and Humphrey, a camel afraid of the dark — **escort** him to
  Palm Oasis (he only walks while a hero is near; two ambushes). Auntie Saffron (haggles in
  dates) and the dimming spring (a camp); Tariq's glass-bottomed boat (real crossings: the
  boat glides in, the heroes aboard); the Turtle Nest (Elder Shellington… slow; Snap, no
  full stops); the Understudies' **water ballet** in swim caps; the Old Forum — **dive** for
  the Sunken Bell's clapper where bubbles rise; then **the setback**: the camera cuts to
  Croakmire, the Gloomstage snuffs the marsh's Great Hearth again (« Every Hearth they light,
  I shall simply snuff again »), the lantern's fourth flame goes out — the marsh stays drained
  (`drain`) until chapter 6; Tariq's promise. The Sunken Bell Temple; the South's Great Hearth
  relit (the bell rings, the drowned windows light up), the Murk rolls back from Emberpeak,
  the Whirlpool Straits and Dino Isle; Captain Wendy's airship, the Dauntless Teacup, lands
  with the hook: the Duchess rehearses her **Debut** at Emberpeak, the marsh's flame in a jar
  on her stage. Sides: the hatchlings (a flock escort), the Mirage Merchant (a choice with two
  outcomes: a guarded treasure at the sand temple, or Saffron's discount), the Forum's lost
  chord (strike three stones in the order read from a clue: low, high, middle).
- **The Sunken Bell Temple** (`src/saga/dungeons/sunkenbell.js`): an outdoor instance on the
  domed temple's islet at noon, the `sea` theme (bronze sluice gates). Its mechanic, **the
  tide** (room kind `tide`): the sea over the floor (you wade), a bell — or two together —
  sends it out for a few seconds, the sluices open, crabs come out on the wet sand, then it
  comes back. Forecourt (one bell, a dash) · colonnade (jellyfish, crabs, a ghost) · tide
  pools (the bell at the far end) · twin bells (together) · the Synchronised Swimmers · the
  Gloom Kraken · the Great Hearth of the South.
- **Foes**: the Synchronised Swimmers (`troupe.js`: untouchable in their pool, routines —
  jets down marked lines, the lift, the wave —, drained they flop); the **Gloom Kraken**
  (`src/combat/v7/sea.js`: immune under the sea, arms that rise and slam marked lines then lie
  there to be cut — each severed arm hurts it —, a whirlpool that drags you in, a grab you
  escape by hitting the arm; the great Sunken Bell strands it, eye wide open, ×2).
- **Engine**: escort steps (`src/saga/escort.js`: a walker on a path, a flock following the
  lantern), collect with `dive` (swim spots that pick themselves), `order` (+ `notes`,
  `verb`), tide rooms with scripts/cooldowns/the great bell, `e.immune` (+ a hint under the
  group bar, `hintText` under the boss bar), the **solo camera leans towards a boss** so both
  stay in frame (every boss benefits), camps' toasts wrap.
- Models: Humphrey the camel, hatchlings, singing stones, the Dauntless Teacup, the great
  Sunken Bell, the lantern in close-up; hats `swimcap`, `headwrap`, `turtle`; sea props
  (columns, corals, kelp, urns, statues, clams, arches). Cast: saffron, tariq, shellington,
  snap, zizi. Music: `sunkenbell` (a 6/8 barcarolle). French: `src/lang/fr/ch5.js`, 0 missing.
- Tests: chapter 5 with every side quest in solo and in Party with 1, 4 and 8 bots, 0 errors.
- **Design review 2** (`world-v7-reviews.md`): chapter 5 at **9** — a real setback, a
  signature mechanic in five rooms, two bosses nobody else fights like, three new quest verbs.
- Next: M8, chapter 6 « Feu et Nageoires » (Emberpeak, the Straits, Dino Isle; the Forge
  Heart; the Duchess's Debut; the marsh's flame won back).

## M8 — chapter 6, Fire & Fins (2026-09-28, 11:00)
Designed first, to the review checklist (`world-v7.md` §3.4), then built:
- **Chapter 6, « Feu et Nageoires »** (`src/saga/chapters/ch6.js`, levels 25–30). A cold open
  aboard the Dauntless Teacup: the Gloomstage moored on Emberpeak's rim swings a spotlight
  round, gloom flak, the envelope rips, a crash into Dino Isle's tar. Fern Landing: Professor
  Dotty Ammonite — **tame a triceratops** (the mounts system: ferns) and ride it to the
  gondola (a `check` step), the tow. Lighthouse Isle: Old Barnaby (shipping forecasts) and
  the **Straits Regatta** — a sailboat race round three buoys against the Understudies' swan
  pedalo (a visible rival on the course); they lose, and admit they weren't invited to the
  Debut. Emberpeak: Granny Mochi's onsen — **a soak** (everyone in the tub, steam, the
  Duchess's scales drifting down the slope), then the Forge Gate. The Forge Heart and the
  **Debut**; the jar with Croakmire's flame falls from the fleeing Gloomstage; the marsh warms
  again (the chapter-5 setback undone: `marshBack`, `marsh` back in `lit`, `volcano` lit);
  Wendy: next stop, the Dawnlands. Sides: **the Tyrant's toothache** (a `sneak` step: running
  near the dozing king wakes him and sends everyone back), **messages in bottles** (three
  bottles drifting on the Straits' current: `collect` with `drift` paths — letters from
  Lanternport, « we are still here »).
- **The Forge Heart** (`src/saga/dungeons/forgeheart.js`, door `FORGE_DOOR` on Emberpeak's
  north-east slope — checked walkable from the springs): an outdoor instance in the caldera at
  dusk (basalt, ash, lava; the `forge` theme: iron portcullis, anvils, furnaces). Its
  mechanic, **the vents** (room kind `vent`): geysers that breathe on a rhythm and throw
  whoever stands on one in an arc to where its arrow points (`to`; `tos` + `cap` levers for
  vents sharing one pressure; a throw into the lava hurts and sends you back). The rim · the
  moat (one vent) · the foundry (imps, slugs) · the pressure lake (cap two, the third throws
  far enough) · the chain (vent to vent over lava islets, in rhythm) · Crumble's Snuffbot Mk
  II (lure it onto a vent when it blows) · the Debut. Carving: `lavas` (cell 4) and `isles`.
- **The Duchess's Debut** (`src/combat/v7/duchess.js`, `diva`): three acts — aria & fan, the
  follow-spotlight (« Upstaged! »: hurts & slows), the Snuffer's rings — and a hen from the
  wings that follows the heroes: lead it to her and she freezes (×2) until she shoos it.
  Beaten, a rope hauls her up into the Gloomstage.
- **Engine**: vent rooms, lava/obsidian ground in instances, `check`, `sneak` and drifting
  pickups; sfx `cluck`; props: swan pedalo, torn envelope, flame jar; cast: ammonite,
  barnaby, mochi; music `forgeheart`. **Party**: toasts step down under the boss bar (they
  hid its name), no « press A » over boats or doors during scenes.
- **Tools**: `tools/sagarun.js` — a chapter played by the bots in the background
  (`start(mode, n, [chapters], class, marks)`, poll `window.__ap`).
- Tests: chapter 6 with both side quests in solo and in Party with 1, 4 and 8 bots, 0 errors;
  0 i18n missing.
- **Design review 3** (`world-v7-reviews.md`): chapter 6 at **9**.
- Next: M9, chapter 7 « Les Terres-de-l'Aube » (the crossing, Whale Isle, Lanternport under
  the Murk, the Dawn Monastery, the Mime Troupe; the Lantern Pagoda; the Paper Dragon).

## M9 — chapter 7, the Dawnlands (2026-09-28, 14:30)
Designed first, to the review checklist (`world-v7.md` §3.4), then built:
- **Chapter 7, « Les Terres-de-l’Aube »** (`src/saga/chapters/ch7.js`, levels 28–34). The
  crossing: the Dauntless Teacup leaves its new mooring mast on Lighthouse Isle, runs out of tea
  over the Wide Sea (a real flight, the camera riding along), puts down on an uncharted island —
  the Blowhole Inn, Barnacle Bess — and **the island opens its eye**: Grandmother Bellows, the
  whale, itching with gloom barnacles. **Stomp them** (step `whack`) and her spout throws the
  Teacup over the Murk into Lantern Bay. Lanternport in the dark: **relight its lamps** with a
  lantern that gutters away from the light while murk moths nibble it (step `lamps`); the
  shutters open; Old Hoshi, the last Lamplighter (she knew Nana June — sixty years of letters);
  **the Duchess's broadcast**, her face on the fog, the Umbral Spotlight rehearsed on the bay
  (every lamp it touches goes out; Hoshi relights them). The Mime Troupe on the Pilgrims' Way
  (invisible walls, boxes, a rope, a piano). The Dawn Monastery: Abbot Sen and **the Dawn Kites**
  (step `kite`: keep the string's pull in the green to climb above the fog); a column of gold
  opens the Pagoda. The Lantern Pagoda, Old Lucky saved, the Dawn Hearth relit — a real sunrise
  after a month of grey; the Murk rolls back from Emberleaf, Glowtide and Elderbough. The
  **Lantern Festival**: sky lanterns, the mended dragon dancing, Perkins's thirty years of
  undelivered mail (« one for a Miss G. Gloomsworth… »), three mimes alone on the pier. Sides:
  **Brother Bao's vow** (a riddle quiz: score-based, Party votes), **the Salt Painter's
  reflections** (things that exist only in the salt mirror).
- **The Lantern Pagoda** (`src/saga/dungeons/lanternpagoda.js`, door `PAGODA_DOOR`): an interior
  (the `pagoda` theme, `src/saga/pagoda.js`: plank floors with red runners, shoji walls,
  vermilion doors; props: paper lanterns, gong, incense, scrolls, bonsai, tea table). Its
  mechanic, **the dawn beam** (room kind `beam`, `src/saga/beam.js`): a lens, mirrors turned by
  stepping on their plate, paper screens the beam burns through, a prism that splits it, lotus
  lanterns that open the way; on the roof the Dawn Mirror, aimed by eight plates, is a weapon.
- **Foes** (`src/combat/v7/dawn.js`): murk moths, ink imps (ink puddles slow), sour lanterns,
  paper bats; the Mime Troupe (`mimeminnow/fidget/brick`); **Old Lucky, the Paper Dragon** (a
  body that follows its head, immune in the air, dives down marked lines, perches — the beam
  sets it alight ×2); Dawnlands camps (`DAWN_ZONE_FOES`).
- **Engine**: step mini-games (`src/saga/games7.js`: whack, lamps, kite — HUD bars over heads,
  A-prompts, `bot()` for the harness), `chapter.gloom(S)` (a grey sky over a land), the **Teacup
  line** (`src/saga/teacup.js`: fly between the masts, over Whale Isle), portraits that paint
  themselves (`look.paint` — the whale), `e.hold` (a beaten boss held on stage for its scene),
  `bigmap.mjs --crop` (close-ups of the world map for layout).
- **Fixed on the way**: the Wide Sea (`wide`) was never opened (Murk puffs along every Dawnlands
  coast); `beginChapter` didn't refresh the Murk (heroes « lost » back to the plaza); the
  Dawnlands' piers had no decks; three music tracks had half-length bars; encounters crashed on
  a zone without seeds.
- Models (`src/models/v7/dawn7.js`): mooring mast, street lamp, barnacle, Dawn Kite, sky lantern,
  spout; the whale's eye rebuilt. Cast: bess, bellows, hoshi, sen, bao, blanche, mei, tamsin, the
  mimes. Music: `lanternpagoda`. French: `src/lang/fr/ch7.js`, 0 missing.
- Tests: chapter 7 with both side quests in solo and in Party with 1, 4 and 8 bots, 0 errors.
- **Design review 4** (`world-v7-reviews.md`): chapter 7 at **9**.
- Next: M10, chapter 8 « Automne et Racines » (Emberleaf, Glowtide, Elderbough; a harvest
  festival without light; the Understudies fired — they join you; the Heartwood; the Moth Queen).

## M10 — chapter 8, Autumn & Roots (2026-09-28, 17:00)
Designed first, to the review checklist (`world-v7.md` §3.4), then built:
- **Chapter 8, « Automne et Racines »** (`src/saga/chapters/ch8.js`, levels 32–37). The cold open
  on the Gloomstage in the Great Tree's crown: the Duchess replaces the Understudies with
  cardboard cut-outs and drops them through a trapdoor. Harvestholm (Mayor Marrow): no light
  survives the moths; the Understudies in Hazel's pumpkin patch — they join the heroes and name
  the plan (the Heartlight, the Moth Queen). Glowtide by night (Old Mo): **net fireflies** (step
  `net`: swing only while one glows). The festival: **carry** the jars from Mo's cart and hang
  them on the lanes' posts (step `carry`), then the Understudies' act — a **rhythm** game (step
  `rhythm`: notes slide to a ring, 60 % to win the crowd) — and their first applause. Elderbough:
  Warden Ashby, the Heartwood, the Moth Queen; the Heartlight relit, the siphon snaps, the
  Duchess sails off (« the Scar is waiting »), the Murk rolls back from Hollowmoor, Prism
  Springs, Cogsworth and the Aurora Tundra. Sides: **the lost harvest ring** (step `piles`:
  jump into leaf piles, a joke in each wrong one), **a song for a supper** (a trade chain).
- **The Heartwood** (`src/saga/dungeons/heartwood.js`, the `heartwood` theme in
  `src/saga/heartwood.js`: growth-ring floors, amber, moss): its mechanic **the firefly jars**
  (room kind `jars`, `src/saga/jars.js`: racks, hooks, moth swarms that block the way and go to
  a hung jar, swarms that chase a carried one, glowcap doors that part in a jar's light).
- **Foes** (`src/combat/v7/moths.js`): gloom scarecrows, mothlings, **the Moth Queen** (her swarm
  shields her until a jar lures it off; gusts, dust hazes, dives; drinks jars in phase 3);
  camps for autumn, glow and elder.
- **Engine**: `src/saga/games8.js` (net, carry, rhythm, piles — `drawUi` for the rhythm lane);
  no camping inside a dungeon instance. Models: `src/models/v7/autumn8.js` (firefly, jar, hook
  post, pumpkins, festival stage, cardboard cut-outs, the siphon, leaf piles). Cast: marrow,
  mo, ashby, hazel, nell, wick. Music: `heartwood` (a waltz inside a tree). French:
  `src/lang/fr/ch8.js`, 0 missing (and the Understudies' French names fixed in ch7–8 lines).
- Tests: chapter 8 with both side quests in solo and in Party with 1, 4 and 8 bots, 0 errors.
- **Design review 5** (`world-v7-reviews.md`): chapter 8 at **9**.
- Next: M11, chapter 9 « Landes et Rouages » (Hollowmoor's ghosts, Prism Springs, Cogsworth's
  Lantern Cannon, the Aurora Tundra; Hollowmoor Manor; the Lady in Grey and the sepia flashback).

## M11 — chapter 9, Moor & Machines (2026-09-28, 20:30)
Designed first, to the review checklist (`world-v7.md` §3.4), then built:
- **Chapter 9, « Landes et Rouages »** (`src/saga/chapters/ch9.js`, levels 35–40). Candlewick
  at dusk (Aunt Tallow whispers); **the moor's ghosts** (step `seek`: four of the old manor's
  household, invisible unless a lantern comes near, each with a piece of the story).
  **Hollowmoor Manor** and the Lady in Grey — Lady Honoria, the Duchess's mother; at peace,
  the **sepia flashback** (a new `st.sepia()`: the Starfall stage thirty years ago, a girl's
  first aria, a hen, the laughter, the letter home « I'll come home when they applaud me »),
  and on the porch: « tell her the tea is still warm »; the seventh flame. Cogsworth: Master
  Tock and the **Lantern Cannon**; Prism Springs: Ranger Rhoda and three geysers — **snap** a
  rainbow at each spray's peak; the **test-fire** (step `defend`: waves of gloom go for the
  charging cannon). The Aurora Camp under the northern lights; the Gloomstage over the Scar;
  the Murk rolls back from the Umbral Scar. Sides: **the runaway cuckoo** (step `chase`) and
  **Rule Nine** (hikers lost in the steam: `seek` with `solid`).
- **Hollowmoor Manor** (`src/saga/dungeons/hollowmoor.js`, the `manor` theme in
  `src/saga/manor.js`: herringbone parquet, faded red rugs, wallpaper, oak doors; props:
  candelabras, portraits, dust-sheeted chairs, a cold hearth): its mechanic **the clocks**
  (room kind `clock`, `src/saga/clocks.js`: a plate turns the whole room between THEN and
  NOW — furniture, bricked doors, fallen floors; several clocks per room; pits drop you back).
- **Foes** (`src/combat/v7/manor.js`): moor wisps, clockwork soldiers, boglings,
  poltergeists; **the Lady in Grey** (untouchable in THEN; tea service, pendulum arc, cold
  spots; pulls the room back to THEN herself; ghost dancers in rings); camps for moor, prism,
  clock and tundra.
- **Engine**: `src/saga/games9.js` (seek, snap, defend, chase; `ghostModel`), `st.sepia(k)`
  (lighting's `sepia`); a step game that fails to set up is dropped (no crash loop); no
  campfire inside the solo game's dungeons. Models: `src/models/v7/moor9.js` (the manor's
  front, the Lantern Cannon, Tock's workshop, the cuckoo, an aurora). Cast: tallow, tock,
  rhoda, pembroke, dumpling, hob, posy, honoria, gloria, hikerfen, hikerbo. Music:
  `hollowmoor` (a music box winding down). French: `src/lang/fr/ch9.js`, 0 missing.
- Started chapter 10's engine (inert until the chapter lands): the spotlights (room kind
  `spot`), the backstage theme, the stagehands, Snuffbot Mk III and the Grand Finale's Duchess.
- Tests: chapter 9 with both side quests in solo and in Party with 1, 4 and 8 bots, 0 errors.
- **Design review 6** (`world-v7-reviews.md`): chapter 9 at **9.5**.
- Next: M12, chapter 10 « Le Grand Final » and the Epilogue.

## M12 — chapter 10, The Grand Finale, and the Epilogue (2026-09-28, 23:40)
Designed first, to the review checklist (`world-v7.md` §3.4), then built:
- **Chapter 10, « Le Grand Final »** (`src/saga/chapters/ch10.js`, levels 39–40). The Scar at
  dusk: everyone who helped waits at its edge (Wendy and the parked Teacup, Tock, the
  Understudies) and tells the plan in jokes; talk to Wendy when ready — the **Teacup's boarding
  run** through the Gloomstage's searchlights to its stage door. **The Gloomstage** (dungeon),
  then the ending: Perkins crashes through the backdrop with the letter he's carried since
  chapter 7 — the Festival committee's, thirty years late (a full-screen letter: « We laughed at
  the hen — never at you »), the heroes give her her mother's message (« the tea is still
  warm »), the seven flames fly home. **Dawn** over the Scar, a montage of hearths relit (Old
  Glimmer, the Great Tree, Lanternport), « Come anyway », the Teacup home. **The Epilogue — the
  Starfall Festival**: the Duchess's stage fright (a talk), then the concert: Crumble gets her
  title right, Nana June home at last in the front row, the aria — and the hen, which she picks
  up and sings on with — the applause, the Understudies' act, the Lady in Grey at the back with
  a teacup, sky lanterns and fireworks, the credits. Post-game: the Gloomstage moored off
  Marigold Cove with Crumble's tours, the Duchess and the Understudies on the plaza.
- **The Gloomstage** (`src/saga/dungeons/gloomstage.js`, the `backstage` theme in
  `src/saga/backstage.js`: plum stage boards with chalk marks, velvet walls, curtains that fly up;
  props: ghost light, work lamps, footlights, rigging washes, a painted-sky backdrop, Crumble's
  workbench): its mechanic **the spotlights** (room kind `spot`, `src/saga/spots.js`: pools that
  sweep set paths, a follow-spot that hunts — or goes after a `lure` — flats whose shadows hide
  you, the lighting board's lever: five seconds of dark; the spotted are marched back and
  stagehands come). Six rooms: the stage door · the wings (one light) · Crumble's workshop
  (Snuffbot Mk III) · under the stage (a fight) · the fly tower (two lights, the follow-spot, the
  board — and the Understudies' act holding the follow-spot 12 s in every 17) · the stage.
- **Bosses** (`src/combat/v7/finale.js`): **Snuffbot Mk III** (snuffer-caps, a wax flood, an
  overheating dome; « I'm going to be a TOUR GUIDE »); **the Grand Finale** — three acts, the
  Umbral Spotlight's sweeping wedge of darkness in Act III, the Lantern Cannon's plate to shatter
  it; she stops at 12 % (`e.onEnd`). Her mark: a gold star in the boards, her own follow pool.
- **Engine**: `P.fadeTo` releases a pending fade when a new one starts (a Party cold open hung
  on an overwritten promise); spotlights catch no one during a scene; harness: `spot` rooms,
  bosses that stop instead of falling (act by act, the cannon fired once), letters read.
  Models: `src/models/v7/finale10.js`. Music: `gloomstage` (tiptoe pizzicato), `finale` (her
  waltz grown up, three sections), `aria` (the Epilogue's aria). French: `src/lang/fr/ch10.js`,
  0 missing (and « Crique-aux-Soucis » back to « Marigold Cove » in two lines, per the glossary).
- Tests: chapter 10 and the Epilogue in solo and in Party with 1, 4 and 8 bots, 0 errors.
- **Design review 7** (`world-v7-reviews.md`): chapter 10 at **9.5**.
- The main story is complete: ten chapters, the Epilogue, the credits.
- Next: M13 — side content (side quests across the lands, mini-games incl. the Minecart Rush,
  world bosses, rares); M14 — polish (chapters 1–2 dungeons, distinct bosses, the carried items,
  README screenshots).

## M13a — the world bosses (2026-09-29, 00:30)
- **Five world bosses** (`src/combat/v7/world.js`), each in its own land, woken like the lairs'
  guardians (`src/party/lairs.js`: `world: true`, a spot of their own `at`), announced with a
  world banner (« World boss — land »), scaled for 1–8 heroes, three chests (one golden), XP ×6:
  **Old Thunderhoof** (the Golden Steppe, by the baobab: charges down a marked lane, stomps; a
  stampede of gloom calves across marked lines; rings of quake to jump), **the Paper Tiger**
  (the Jade Terraces: pounces, swipes, ink that slows; paper cranes; folds flat and skates the
  arena's edge; fire hurts it ×1.6), **the Moonmoth** (a meadow by Elderbough's lake: gusts,
  moon-dust that slows, a dive; mothlings; a moonbeam sweeping round — jump it), **the Crystal
  Behemoth** (Prism Springs: turns slowly, its back is glass — hits from behind ×1.8 and « Weak
  spot! »; prism beams fanned, crystals erupting under you, shard rings), **the Aurora Wyrm**
  (the tundra: burrows — untouchable, a ripple hunts you — erupts on a marked circle, frost
  breath; the aurora comes down in bands). The Moonmoth's first spot was deep in the forest (a
  tree-density scan found the lake meadow); Thunderhoof's hide was too dark to read.
- `worldBossMul(e, dir, elem)` next to `bossDamageMul` in `combat.js` (hit direction and element).
- Test: `tools/worldboss.js` (every land opened, each boss woken and walked through its three
  phases by heroes who can't fall, a shot per phase) — solo and Party 4, 0 errors.
- French: `src/lang/fr/world13.js`, 0 missing.
- Next: M13b — rares (named, with unique treasure hats), repeatable mini-games, more side quests.

## M13b–c, M14 — rares, mini-games to replay, polish (2026-09-29)
- **Rares** (`src/party/rares.js`, M13b): ten named gloom with silver plates and a line when they
  wake, one per Dawnlands land; each wears a treasure hat that's yours when they fall (Party: the
  phone's look editor, `profile.hats`; solo: `state.unlocked.hat`, the wardrobe). New hats in
  `models/chars.js` (tricorn, paper lantern, hen, pumpkin head, jellyfish, leaf crown, little
  ghost, prism crown, wind-up key, fur hat); a new foe for Sir Reginald (`gloomhen`); silver stars
  on every map. Sir Wispington moved off the stone circle (the Ghost Hunt plays there).
- **Mini-games to play again** (M13c: `repeat: true` quests — counted in `S.plays(id)`, offered
  afresh, never in front of someone's new quest): the Pelican Rush (ch1, seven doors against the
  clock), the Minecart Rush (ch3, a runaway cart round Dusty Gulch), Lamplighting (ch7, the town's
  own lamps step aside for the game's), the Ghost Hunt (ch9, the manor's staff at hide-and-seek),
  the Talent Show (ch10, percussion for the Understudies). Found by the bots: Nell offered the cart
  race forever and never her own quest → `offerOf` puts repeats last.
- **M14 polish**:
  - The Glimmer Grotto's generic plates → **Old Glimmer's light and the Lamplighters' mirrors**
    (`beam` room, `look: 'cave'`: a crack of light, a sea crystal to blaze; two mirrors to turn).
  - The early bosses' own tricks: **Barkbeard's golden acorns** (kick one back, he chokes: ×1.5),
    **Grumbleclaw's gloom lanterns** (planted each phase: half damage while one burns, dazed ×1.5
    when the last goes out), **the Drillosaur stuck in its own tunnel** when its charge meets nobody.
    Checked by `tools/worldboss.js` `start('bosses', …)`.
  - The Lady in Grey's gown (tiers, ruffles, bustle, sash, veil, pearls, a misty hem); the Moth
    Queen's and the Moonmoth's wings curved (`wingGeo`); the snap geysers hush the landmark
    geyser under them (`GEYSER_HUSH`); Emberpeak's ash slopes get obsidian shards and steaming
    sulphur vents; the Sunken Bell's halls get light ripples and fish in the forecourt's pools.
  - Two old hints said « frappez-le » in solo → tutoiement, « vous » in the group variants.
- Tests: chapters 1, 3, 7, 9, 10 in solo with every mini-game (7/7, 11/11, 11/11, 7/7, 3/3), rares
  in solo and Party 4, the bosses' tricks, 0 errors, 0 missing. **Review 8**: 9.
- README: a World v7 section. CLAUDE.md: rares, world bosses, repeat quests, the new tools.
- Next: the balance pass (`tools/balance.js`: bots at 1/4/8 against camps at levels 5/20/40),
  README screenshots, the final summary.

## M14b — the balance pass (2026-09-29)
- `tools/balance.js`: n bot heroes (level synced to the land's; `geared` = every talent point
  spent, a class weapon, two charms, a rune) against a camp grown like a real one (a foe more for
  every two heroes, an elite for every three), each camp fought 3 times from a fresh start (no
  combo, no cooldowns) — the median counts, the bots' aim is noisy. `BOSS`: the Frost Colossus.
- Camps, time to clear (median, seconds) — heroes at 1 → 8:

  | camp | 1, no gear | 4, no gear | 1, geared | 8, geared |
  |---|---|---|---|---|
  | level 5 (Deep Whisperwood) | 6 | 3 | 3 | 3 |
  | level 20 (Reedmarsh) | 8 | 6 | 5 | 7 |
  | level 40 (the Scar) | 26, 1 down | 23, 4 downs | 11 | 13 |

  A first run with a fixed 4-foe camp said 8 heroes cleared it 3× faster (6 s vs 17 s): that camp
  wasn't grown like a real one, and one 3 s outlier came from charged ultimates carried from the
  fight before. Real camps: the time holds from 1 to 8 heroes at every level.
- Bosses (Frost Colossus, level 40, geared): solo 40–44 s, 1 knockdown a fight; 8 heroes 60–104 s,
  ~15 knockdowns a fight (bots never dodge: its slams hit the whole huddle). Bosses aren't weak in
  a group — rather the reverse — so `groupHp` stays `1 + 0.8(n−1)` (bosses 0.9) and `groupDmg`
  `1 + 0.04(n−1)`.
- **What was really weak at the end, in a group: flat shields.** A Shieldbearer's shield (60), the
  Frost Colossus's armour (220), a totem's bubble (22) and a bulwark elite's (40) were the same
  numbers at level 1 alone and at level 40 with eight heroes — one hit popped them. They now grow
  like the foe's health (`e.hpK`, kept in step by `regroup` when heroes come and go): a level-40
  Shieldbearer's shield is 86% of its health, as at level 1. The Colossus's shield bar follows.
- Decision (documented, no question asked): no change to the group curves; shields & bubbles
  scale. Tests: 1 and 8 bots geared, camps and boss, 0 errors.

## M14c — README pictures, and what a wide screen showed (2026-09-29)
- README: the World v7 section gets ten pictures (the Teacup alongside the Gloomstage, the wings,
  the Understudies' act, the Grand Finale, the sepia flashback, the Epilogue's applause, Old
  Thunderhoof, eight heroes against the Crystal Behemoth, the Aurora Camp, Dusty Gulch) and the
  ten treasure hats. Taken at 960×540 in English through the harness (`marks.clean`: the line
  typed out, old notices cleared; the cannon's `cannon` mark; world bosses woken afresh).
- What the wide shots showed, and fixed:
  - **38 story lines glued two sentences together** (« leave.{p}Welcome » → « leave.Welcome »):
    a `{p}`/`{pp}` pause between two words now stands for their space (`dialogue.js` layout) —
    no key changed, French included.
  - **Party's camera cut big bosses off at the top** of a 16:9 screen (it framed only the heroes):
    it now leans towards a boss close by, as solo's did — its head under the boss bar, every hero
    kept in and above the players' cards (`camera.js` `bossNear`, set by `party.js`). Solo's lean
    also keeps the head under the bar and you above the hotbar & moves.
  - **Big Sniff's fur hat never showed**: `buildHat` had `case 'furhat'` twice — the steppe folk's
    felt hat first. The treasure hat is `chapka` now (old saves and phone profiles migrated).
- Tests: chapter 10 in Party 4 and chapter 9 solo after the dialogue fix, chapter 3 in Party 4,
  the five world bosses in Party 4 and 8, 0 errors; i18n 3773/3773.

## Final — World v7 done (2026-09-29)
- Frame times at the end (960×540, `D.step` = update + render): Party, 8 heroes together in
  Lanternport 3.9 ms · four views 11.7 ms · eight views in eight lands 22.8 ms (M2: 6.6 / 14.3 /
  24 ms — the world grew, the frame didn't); solo 2.4–3.9 ms (the valley, Lanternport, Prism
  Springs). 0 errors.
- Scores (before v7 → now): world 6 → 9 · biomes 7 → 9 · bestiary 7 → 9 · story 3 → 9 ·
  dialogues 5 → 9 · cinematics 2 → 9 · NPCs & quests 5 → 9 · dungeons & bosses 3 → 9 ·
  levelling & balance 4 → 8.5 (tuned with bots, who never dodge: to confirm with real players) ·
  side quests & mini-games 6 → 9 · phone & maps 8 → 9 · performance 8 → 9.
- Left for later: Grandmother Kraken (a sixth world boss, at sea); the Gloomstage's catwalks &
  ropes and Act II's sliding flats; a beaten world boss stays beaten after a reload (rematches
  are in-session); balance with real players (4–8 phones); eight separate views at ~44 fps.
