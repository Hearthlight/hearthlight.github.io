# World v7 « Le Grand Monde » — design bible

The brief: `docs/plans/world-v7-brief.md` (a WoW-vanilla-sized world of two continents, the
whole main story rewritten, dungeons & bosses, cinematics, deeper levelling, side quests &
mini-games — solo and Party Mode alike, 1–8 players). The log: `world-v7-progress.md`.
Everything below is a decision; changes are logged in the progress file.

## 0. Where we start (measured before touching anything)

| Aspect | /10 | Why |
|---|---|---|
| World size & variety | 6 | 800×400 tiles, 16 zones on one continent, all open from the start |
| Biomes | 7 | 15 distinct lands, pretty, but nothing beyond them |
| Bestiary | 7 | 40 kinds with real AIs; no rares, no world bosses, elites only as affixes |
| Main story | 3 | solo: a village life arc (relight Old Glimmer, 5 shards); Party: a mini-game festival. No adventure story, the wild lands have none |
| Dialogues | 5 | warm villager lines, no comic rhythm tools (no pauses, shakes, emotes in the box) |
| Cinematics | 2 | hand-written camera nudges, no timeline, no skip, banners hidden during them |
| NPCs & quests | 5 | 12 villagers + side quests in the valley only; nothing to do *for* anyone out in the world |
| Dungeons & bosses | 3 | 5 open-air guardians; no dungeon, no mini-boss |
| Levelling & balance | 4 | cap 30; enemy damage never scales; +12 % HP per extra player; bosses stop scaling at level 9 → 8 players at level 30 kill things 10× faster than one player at level 1 |
| Side quests & mini-games | 6 | valley side quests, festival games, races — none in the wild |
| Phone & maps | 8 | a great phone map (v6), but one continent |
| Performance | 8 | 13.4 ms/frame with 8 players in 3 views |

## 1. Pillars

1. **One world, two continents, one story** — the same map, quests and scenes in solo and
   in Party Mode; the party shares one story, one lantern, one map.
2. **Cozy but crunchy** — nobody dies, every attack is telegraphed, the gloom is freed rather
   than killed; but a level-40 party of eight must sweat against a level-40 boss.
3. **Funny first** — villains who are absurd and recurring (Mario & Luigi), villagers who are
   warm and curious (A Short Hike); short lines, pauses, shakes, running gags, payoffs.
4. **Show, don't tell** — every chapter has a scene where something *happens on screen*.
5. **Procedural everything** — no image or audio file; every new land, monster, building,
   tune and effect is code.

## 2. The world

### 2.1 Shape
One plane (all systems already work in world coordinates; one plane keeps split screens,
fog, camps and maps simple):

```
BIG = { X0: -280, Z0: -192, W: 1728, H: 512 }   → x ∈ [-280, 1448), z ∈ [-192, 320)
continent 1  the Hearthlands  « les Terres-du-Foyer »  x ∈ [-280, 520), z ∈ [-136, 264)  (unchanged)
the Wide Sea « la Grande Mer »                         x ∈ [520, 680)  + a band of sea round both
continent 2  the Dawnlands    « les Terres-de-l’Aube » x ∈ [680, 1440), z ∈ [-184, 312)
```
885 k tiles (2.8× today). W and H are multiples of 32, X0/Z0 of 8 (chunks, fog). The
Hearthlands keep their exact generation (clipped to their own box, rocky cliffs north, sea
round them) so every existing place stays where it is. Rooms move from `x ≥ 1000` to
`x ≥ 2000`; dungeons live at `x ≥ 3000`.

### 2.2 Zones (29 + the sea) — levels, biomes, hubs
Levels are fixed per zone and shown (the zone banner, the map, monsters' name plates).

| # | id | Zone (EN / FR) | Lv | Biome | Hub | Chapter |
|---|---|---|---|---|---|---|
| 1 | valley | Marigold Valley / Vallée de Marigold | 1–5 | the hand-made valley | Marigold Cove | 1 |
| 2 | deepwood | Deep Whisperwood / Bois-Murmure profond | 4–8 | deep forest, gorge | Foresters’ Clearing | 2 |
| 3 | heights | Windy Heights / Hauts-Venteux | 7–11 | heather plateau, windmills | Breezy Hill | 2 |
| 4 | steppe | Golden Steppe / Steppe dorée | 9–13 | golden grass, yurts | Nomad Camp | 3 |
| 5 | canyon | Red Canyon / Canyon rouge | 11–15 | mesas, mine | Dusty Gulch | 3 |
| 6 | bouncecap | Bouncecap Woods / Bois-Rebondis | 13–17 | giant mushrooms | the Mother Cap | 3 |
| 7 | marsh | Croakmire / Coassemare | 15–19 | bayou, frogs | Croakton | 4 |
| 8 | glacier | Frostpeak Glacier / Glacier du Pic-Givre | 17–21 | ice, crevasses | Frostpeak Camp | 4 |
| 9 | cloud | Cloud Isles / Îles-Nuages | 20–23 | islands on clouds | Cloud Harbour | 4 |
| 10 | dunes | Sunscorch Dunes / Dunes Brûlesoleil | 21–24 | desert, oases | Palm Oasis | 5 |
| 11 | lagoon | Coral Lagoon / Lagon de corail | 22–25 | atoll | Turtle Nest | 5 |
| 12 | sunken | Sunken City / Cité engloutie | 23–26 | drowned ruins | the Old Forum | 5 |
| 13 | volcano | Emberpeak / Pic-Braise | 25–28 | volcano, lava | Hot Springs | 6 |
| 14 | straits | Whirlpool Straits / Détroit des Tourbillons | 26–29 | sea stacks | Lighthouse Isle | 6 |
| 15 | dino | Dino Isle / Île aux Dinosaures | 27–30 | jungle | Fern Landing | 6 |
| 16 | whale | Whale Isle / Île-Baleine | 28–30 | an island on a sleeping whale | the Blowhole Inn | 7 |
| 17 | harbor | Lantern Bay / Baie des Lanternes | 29–31 | a fjord, a terraced harbour town (Norway) | **Lanternport** / Port-Lanterne | 7 |
| 18 | jade | Jade Terraces / Terrasses de Jade | 30–33 | rice terraces & limestone pillars (Longji, Zhangjiajie) | Dawn Monastery | 7 |
| 19 | salt | Saltmirror Flats / Miroir de Sel | 31–34 | salt mirror & white travertine stairs (Uyuni, Pamukkale) | the Saltworks / la Saline | 7 |
| 20 | autumn | Emberleaf Wood / Bois-Braise | 32–35 | red autumn forest, pumpkins (Kyoto, New England) | Harvestholm / Moissonval | 8 |
| 21 | glow | Glowtide Coast / Côte des Lueurs | 33–36 | mangroves, a glowing bay, sea stacks (Ha Long) | Stiltwater / les Pilotis | 8 |
| 22 | elder | Elderbough / Grande-Ramure | 34–37 | a valley of giants under granite walls & a great fall (Yosemite, Sequoia) | Rootholm / Racinebourg | 8 |
| 23 | moor | Hollowmoor / Lande-Creuse | 35–38 | rolling moor, lochs, a lone pinnacle (Skye, the Highlands) | Candlewick / Bout-de-Chandelle | 9 |
| 24 | prism | Prism Springs / Sources Prismatiques | 36–39 | rainbow hot springs, geysers, travertine (Yellowstone) | Old Punctual Lodge | 9 |
| 25 | clock | Cogsworth Heights / Hauts-Rouages | 37–40 | alpine peaks, meadows, a clockmakers’ brass town (the Alps) | **Cogsworth** / Rouageville | 9 |
| 26 | tundra | Aurora Tundra / Toundra des Aurores | 37–40 | a high plateau, jagged peaks, glaciers, turquoise lakes (Glacier NP) | Aurora Camp | 9 |
| 27 | scar | Umbral Scar / Balafre d’Ombre | 39–40 | black glass, a chasm, basalt steps into the sea (Giant’s Causeway) | — | 10 |
| — | sea, wide | Open Sea, Wide Sea | — | sea | — | — |

(The Festival Ring keeps its Murk-free bubble on the steppe; it stays a Party activity.)

### 2.3 The Dawnlands’ layout (x 680–1440, z −184…312)
```
          jade (NW)        tundra (N)          clock (NE, a plateau)
 harbor (W coast)     elder (centre, the Great Tree)     scar (far E)
          salt (SW)   autumn (S-centre)   moor (E-centre)
                      glow (S coast)                      prism (SE)
```
Whale Isle sits in the middle of the Wide Sea; Pelican Rock (Perkins’s post office) off
the Hearthlands’ east coast.

### 2.3b Relief & the great parks (added during M3, at the player’s request)
“More relief in places — mountains (A Short Hike), hills, volcanoes — a living map; and the
map is huge: zones inspired by the great national parks.” Decisions:
- **Levels**: every tile has a height (`elev`, 0–7). The first level up is 10 texels of cliff
  face (the old plateaus, unchanged), every level above it a whole tile more. Faces are only
  seen on south slopes (the camera looks north); the painter draws them per texel under any
  drop, with a palette per kind of high ground (rock, snow, basalt, mesa, travertine with
  drips, crystal, black glass, masonry for terraces & towns, brass girders), a ledge line at
  every level, a bright lip on top, the higher terraces a touch lighter.
- **Walking**: a one-level step of soft ground (grass, snow, moor, sand…) is a *bank* you
  walk up (painted as a shaded slope); rock, plateaus, walls and bigger drops are *cliffs*
  (their face rows are blocked, and a drop of two levels or more on a side is a ledge);
  paths climb everything as stairs. Crags (`CRAG`) are the unclimbable cores of mountains.
- **Water & lava fall** where the ground steps: rivers run at the ground’s height, so every
  step becomes a waterfall (or a lava fall), painted and animated (the liquid overlay’s code 62).
- **Mountains** are stacked terraces round a crag core with jagged, faceted **3D peaks** on top
  (snow above a ragged line; rock, mossy, red, black, granite, karst styles). Limestone
  **pillars** are columns with a green cap and pines.
- **The Hearthlands** gain a mountain wall along the north & west rims (peaks all along),
  real mountains on Frostpeak, a second level on Breezy Hill, **Emberpeak as a stepped cone**
  with its crater up top and lava falls, the Heights’ river falling off the plateau, the
  dunes’ red buttes and Sunrock (a monolith).
- **The Dawnlands** each borrow from a great park: Lantern Bay a Norwegian fjord (green cliffs,
  a waterfall into the bay, the town climbing in walled terraces); Jade Terraces Longji’s rice
  terraces & Zhangjiajie’s pillars in the mist; Saltmirror Uyuni’s mirror & Pamukkale’s white
  stairs with turquoise pools; Emberleaf a Kyoto autumn; Glowtide Ha Long’s stacks in a glowing
  bay; Elderbough Yosemite’s valley (granite walls, Half Dome, El Capitan, a great fall into
  a meadow pool) under the Great Tree; Hollowmoor Skye’s moor & the Old Man (a lone pinnacle);
  **Prism Springs** Yellowstone (the Grand Prismatic in rainbow rings, sinter & orange mats,
  terraces, geysers — Old Punctual keeps time); Cogsworth the Alps (the Cogswhorn, alpine
  meadows, a brass town); Aurora Tundra Glacier NP (a high plateau, jagged peaks, glacier
  tongues, milky turquoise lakes); the Umbral Scar the Giant’s Causeway (basalt steps).
- Every land has its own music (13 new tracks), ambience, weather and events.

### 2.4 Getting around
- **Waystones** (as today, one or more per zone; the ♛ menu lists them by continent).
- **The Pelican Post** (WoW flight paths): a roost in every hub; Perkins’s pelicans carry
  you in their beak pouch between roosts you have visited — a real flight over the streamed
  world (camera high above, the land sliding under), skippable. Party: the whole flock flies.
- **The Dauntless Teacup**, Captain Wendy’s teapot-shaped airship, between the airship
  towers of Lighthouse Isle and Lanternport (a long cinematic the first time, then a short
  one), stopping over Whale Isle.
- Mounts, boats, balloons, gliders, sleds, minecarts, ziplines: as today.
- **The Murk** (« la Brume Mauve » — « grisaille » already names the gloom) gates the story: a grey-violet fog lies over every zone the
  story hasn’t reached. You can’t walk (swim, ride, sail, fly) into it — you’re pushed back
  with a line (“The Murk is too thick. Relight …’s Hearth first.”); on every map it’s a violet
  veil with the zone’s name greyed. Relighting a Great Hearth rolls it back in a cinematic.

## 3. The story

### 3.1 Premise
Every hearth in the world is lit from the Great Hearths, one in each land, kept long ago by
the **Lamplighters** (« les Allumeurs »). They hold back **the Murk**, the grey fog the
gloom crawls out of. Nana June was the last Lamplighter of Marigold Cove.

**Duchess Gloria Gloomsworth** (« la Duchesse Gloria de Grisemine »), a failed opera diva,
was booed off the Starfall Festival’s stage in Marigold Cove thirty years ago (a hen walked
on during her big aria). She swore the whole world would one day sit in the dark and watch
only *her*. Aboard the **Gloomstage** (« le Théâtre-Grisaille »), a flying opera house, she
snuffs the Great Hearths one by one with the **Grand Snuffer** (« le Grand Éteignoir ») to
power her **Grand Finale**: the Umbral Spotlight, one beam on her, darkness everywhere else,
forever. She insists nobody ever invited her to anything.

The heroes (you, or the whole party) carry Nana’s **Lamplighter’s Lantern**: each Great
Hearth relit adds a flame to it — and its light pushes the Murk back from the next lands.

### 3.2 Acts and chapters
**Act I — the Hearthlands**
1. **Lights Out** (« Extinction des feux ») — Marigold Valley, lv 1–5. The Gloomstage
   eclipses the sun over the cove; Crumble announces the Duchess (wrongly); her aria; the
   Grand Snuffer comes down on Old Glimmer; colours drain; the Murk rolls over the hills.
   Nana’s lantern, choosing a way to fight, the gloom in the fields, the Understudies’ first
   audition. Dungeon **Glimmer Grotto** (« la Grotte de la Lueur ») under the lighthouse —
   boss **Crumble’s Snuffbot 3000** (« le Mouchobot 3000 de Miette »). Old Glimmer relit:
   the beam sweeps, the Murk recedes north. *Unlocks deepwood, heights.*
2. **The Whispering Woods** (« Les Bois qui murmurent ») — deepwood, heights, lv 4–11.
   Foresters who talk to trees, the Pelican Post opens, windmills stopped by gloom kites.
   Dungeon **the Rootway** (« la Voie des Racines »), a hidden valley behind the falls — boss **Barkbeard**
   (« Barbécorce »), a gloomed elder treant. *Unlocks steppe, canyon, bouncecap.*
3. **Dust & Spores** (« Poussière et Spores ») — steppe, canyon, bouncecap, lv 9–17. The
   Understudies’ *Human Cannonball* at the Festival Ring; a gold-rush town; a minecart chase.
   Dungeon **the Old Mine** — boss **Foreman Grubb and his Drillosaur** (« le Contremaître
   Grubb et sa Foreuse »). *Unlocks marsh, glacier, cloud.*
4. **Mire & Frost** (« Marais et Frimas ») — marsh, glacier, cloud, lv 15–23. King Croakington’s
   crown stolen; the Gloomstage’s shadow over the glacier; Crumble stuck in a cloud.
   Dungeon **the Frostbell Halls** (« les Salles de Cloche-Givre ») — boss **the Frost Tenor**
   (« le Ténor des Glaces »), whose high C shatters ice. *Unlocks dunes, lagoon, sunken.*
5. **Sand & Sea** (« Sable et Écume ») — dunes, lagoon, sunken, lv 21–26. The Understudies’
   *Synchronised Swimmers*. Dungeon **the Sunken Bell Temple** (« le Temple de la Cloche
   engloutie ») — boss **the Gloom Kraken**. *Unlocks volcano, straits, dino.*
6. **Fire & Fins** (« Feu et Nageoires ») — volcano, straits, dino, lv 25–30. Dungeon **the
   Forge Heart** (« le Cœur de la Forge ») — boss **the Duchess herself** (*her Debut*), who
   flees east over the sea with the Hearthlands’ flames. Captain Wendy offers her airship.
   *Unlocks the Wide Sea crossing.*

**Act II — the Dawnlands**
7. **The Dawnlands** (« Les Terres-de-l’Aube ») — whale, harbor, jade, salt, lv 28–34. The
   crossing (Whale Isle opens its eye), Lanternport under the Murk, the monks of the Dawn
   Monastery, the Understudies’ *Mime Troupe*. Dungeon **the Lantern Pagoda** (« la Pagode aux
   Lanternes ») — boss **the Paper Dragon** (« le Dragon de Papier »), a festival puppet the
   gloom brought to life. *Unlocks autumn, glow, elder.*
8. **Autumn & Roots** (« Automne et Racines ») — autumn, glow, elder, lv 32–37. A harvest
   festival without light; the Understudies fired by the Duchess — they join you. Dungeon
   **the Heartwood** (« le Cœur-de-Bois ») inside Elderbough — boss **the Moth Queen**
   (« la Reine des Phalènes »). *Unlocks moor, prism, clock, tundra.*
9. **Moor & Machines** (« Landes et Rouages ») — moor, prism, clock, tundra, lv 35–40. Ghosts
   only your lantern shows; Cogsworth builds the Lantern Cannon. Dungeon **Hollowmoor Manor**
   (« le Manoir de la Lande-Creuse ») — boss **the Lady in Grey** (« la Dame en Gris »), who
   shows the Duchess’s past (a sepia flashback: the hen on the stage). *Unlocks scar.*

**Act III — the Grand Finale**
10. **The Grand Finale** (« Le Grand Final ») — the Umbral Scar, lv 39–40, then **the Gloomstage**
    (backstage, catwalks, the orchestra pit, the stage). Final boss **the Duchess in three
    acts** (her aria; the stage machinery; the Umbral Diva with every stolen flame). Perkins
    lands mid-fight with a thirty-year-late letter: her invitation to the Starfall Festival.
    She cries, lets the flames go; dawn sweeps across the Dawnlands. **Epilogue**: the Starfall
    Festival in Marigold Cove — the Duchess sings (beautifully), the Understudies do their act,
    fireworks, credits.

### 3.3 Solo & Party
- The saga is one engine (`src/saga/`) running on the party API: Party’s Adventure activity
  (Explore) hosts it; the solo game’s `Wild` hosts it. Same chapters, NPCs, scenes, dungeons.
- **Solo**: the cozy start stays (*A New Leaf*, *Putting Down Roots*); Hollis’s legend now
  opens chapter 1 instead of the old shard hunt (the villagers’ side quests stay; their shards
  become lantern lenses). Old saves: the old `glimmer`/`festival` quests are retired and the
  saga starts at chapter 1; heroes keep level, talents, gear and companions.
- **Party**: the lobby’s “The Adventure” starts or continues the party’s saga (saved in
  `hearthlight.party.saga`); the Starfall Festival games and the Festival Ring stay as
  activities. A phone that joins late plays at once (level sync, §5.3).
- Party wording: English lines are shared; French has « tu » (solo) and « vous » (Party)
  versions where a line speaks to the player(s) (`FR_GROUP` overrides looked up first in Party).

### 3.4 Chapter designs, from chapter 5 on (designed first, to the review checklist)
Written before building, against `world-v7-reviews.md`'s checklist: a shape of its own, a
setback or an intense beat, a sincere moment, the Duchess felt, three quest verbs or more, a
signature dungeon mechanic, a boss mechanic nobody else has.

**Chapter 5 — « Sand & Sea » (« Sable et Écume »), dunes · lagoon · sunken, lv 21–26.**
- *Shape*: it opens **in the middle of the action** — no « arrive, meet two locals »: Perkins
  drops the heroes « slightly off », in the middle of a sandstorm, beside a caravan lost in it.
  The setback comes at the midpoint, the dungeon is a race against the sea.
- *Beats*:
  1. **The storm** (cold open): sand hissing, a camel bell in the murk. **Escort** Humphrey, the
     caravan's lead camel, who is afraid of the dark, through the storm to Palm Oasis — he
     walks while a hero stays close, stops when alone; sand imps ambush the caravan twice.
     (New step: `escort`.)
  2. **Palm Oasis**: Auntie Saffron, the caravan master, haggles everything (« Three dates
     and a compliment. Final offer. »). The oasis spring is going dark; she tells the old
     saying: *when the Sunken Bell rings, the tide goes out and the fish come home* — it has
     been silent for weeks. Her nephew's glass-bottomed boat takes the heroes to the lagoon.
  3. **Turtle Nest** (the Coral Lagoon): Elder Shellington (…very… slow… speech…) and Snap,
     his great-great-grandson (talks at double speed). In the lagoon, the Understudies'
     **Synchronised Swimmers** show — swim caps, a water ballet, Brick sinks («  Brick is
     doing the… deep part. ») — they are « guarding » the way to the Sunken City and are
     terrible at it.
  4. **The Sunken City** (the Old Forum, half under water): the bell's clapper is gone —
     **dive** for its three pieces where bubbles rise (the swim system's dive), while gloom
     jellyfish drift above.
  5. **The setback** (midpoint scene): the lantern flickers. Far away over the sea, the
     Gloomstage hangs over Croakmire — the Duchess keeps her chapter-3 promise (« Every Hearth
     you light, I shall simply snuff again »): the Snuffer comes down on the lily throne, the
     marsh goes grey (the king sneezes: « Oh no. Not again. »), and the lantern's fourth
     flame goes out. Three flames. Nobody jokes for a moment. (The marsh loses its colours —
     `st.lit` — until chapter 6 wins the flame back.)
  6. **The Sunken Bell Temple** (dungeon), then the Great Hearth of the South relit under the
     bell: four flames again — but the marsh stays dark. The Murk rolls back from Emberpeak,
     the Whirlpool Straits and Dino Isle.
  7. **Hook**: Captain Wendy lands on the beach in her airship, out of the shop at last (« Paint's
     still wet. Don't lean on anything. »): the Gloomstage is moored at Emberpeak, and the
     Duchess is rehearsing her **Debut** — with the marsh's flame.
- *Quest verbs*: escort (the camel; the hatchlings), dive, find by ear or sight, a choice,
  a race, camps and a fight at sea.
- *Side quests*: **the hatchlings** (Snap: five turtle hatchlings, lost in the dark, follow
  your lantern to the sea — crabs snatch stragglers; the escort step with a flock); **the
  Mirage Merchant** (a fennec with a « map to the Lost Oasis »: buy it — it is real, and
  guarded — or report him to Saffron — a discount forever; a **choice** with its own
  outcome); **Dune Surfing** (Snap's cousin in the dunes: a tea-tray race down the Great Dune
  — the `race` step on sand); **the Forum's Lost Chord** (three broken statues, each hums one
  note — put their heads back in the order of the song carved on the steps).
- *Dungeon* — **the Sunken Bell Temple**, an outdoor instance at the Sunken City under a hot
  noon sun, and its signature mechanic **the tide** (room kind `tide`): the rooms are
  flooded (you wade, slowly); ring a **tide bell** and the sea draws back for a few seconds
  — the sluice gates at the bottom open, crabs and treasure lie on the wet sand — then it
  comes back in and the gates close. Escalating: one bell and a dash; a bell at the far end
  and a run back through the tide pools; two bells that must ring together (two heroes, or
  one very fast one); then both boss fights use it.
  - Mini-boss: **the Synchronised Swimmers** — in their pool they are untouchable (a
    formation that spins and splashes); drain the pool with its bells and they flop on the
    sand, helpless, until the water returns (« Union rules! The pool must be FULL! »).
  - Boss: **the Gloom Kraken** — tentacles rise through the flooded arena and slam
    (telegraphed lines), grab a hero (friends hit the tentacle to free them; alone, mash the
    button); ring the great **Sunken Bell** (its clapper back in) and the whole arena drains:
    the Kraken is stranded, its great eye exposed (×2) until it drags the sea back in.
- *The Duchess*: the midpoint snuffing (seen, not told); her voice over the Gloomophone,
  sulking that the Understudies « turned a heist into a water ballet ».
- *Sincere beat*: Elder Shellington remembers the Sunken City lit up at night, before the
  sea took it (« We… swam… through… its… windows… Every… window… had… a… lamp… »), and, after
  the setback, Auntie Saffron sits with the heroes by the fire without haggling.

**Chapter 6 — « Fire & Fins » (« Feu et Nageoires »), volcano · straits · dino, lv 25–30.**
- *Shape*: it **opens with a crash** — a setback in the first minute — and the heroes have
  to put the airship back together across three islands before the big night. No escort,
  no camp: the verbs are taming and towing, a sea race, launch vents, a sneak, and one
  boss who must not see a hen.
- *Beats*:
  1. **Flak** (cold open): aboard the Dauntless Teacup, Emberpeak ahead, the Gloomstage moored
     on the crater's rim; its spotlights sweep the sky, find the Teacup — gloom flak, a torn
     envelope, a crash into Dino Isle's jungle (« Hold on to your hats! And your lunch! »).
  2. **Dino Isle** — Fern Landing: Professor Dotty Ammonite (a palaeontologist in a pith
     helmet; everything is « utterly Cretaceous! »). The Teacup's gondola is stuck in the tar
     swamp: **tame a triceratops** (feed it ferns) and **tow** the gondola out on its back.
     Wendy patches the envelope; the propeller is matchwood.
  3. **The Whirlpool Straits** — Lighthouse Isle: Old Barnaby, the keeper, speaks in shipping
     forecasts (« Visibility: poor. Mood: stormy. Tea: strong. »). His spare propeller is the
     prize of the Straits Regatta — a **sailboat race** round the whirlpools against the
     Understudies in a swan pedalo. They lose, and admit why they're sulking out here: they
     were **not invited** to her Debut (« Understudies don't get tickets. They get…
     understudied. ») — the rift before chapter 8.
  4. **Emberpeak** — the Hot Springs: Granny Mochi keeps the onsen; nobody there is ever in a
     hurry (« The volcano will still be angry after your bath. »). She knows the old
     smiths' way into the crater: the Forge Gate.
  5. **The Forge Heart** (dungeon) — then **the Debut**.
  6. **The marsh warms again**: the jar with Croakmire's flame falls from the fleeing
     Gloomstage; the heroes carry it home, the king sneezes no more — the chapter-5 setback
     undone. Wendy: the Teacup is flying again — next stop, across the Wide Sea.
- *Dungeon* — **the Forge Heart**, an outdoor caldera at dusk (lava lakes, obsidian, the old
  smiths' anvils), its mechanic **the vents** (room kind `vent`): geysers of hot air that
  breathe on a rhythm — stand on one when it blows and it **launches you** in an arc across the
  lava to where it points. Escalating: one vent over a moat (timing); three vents sharing one
  pressure — plug two with their stone caps to send the third far enough; a chain of vents,
  vent to vent. Mini-boss: Crumble's **Snuffbot Mk II**, on the vents' ledge (it can't jump).
- *Boss* — **the Duchess's Debut**, on the Gloomstage's stage in the crater. Act I: her aria
  (notes fall on marked spots); Act II: her spotlight (a sweeping circle — stand in it and
  you're « upstaged »); Act III: the Grand Snuffer comes down on marked rings. And at each act
  **a hen** wanders out of the wings (a stagehand's mistake): it follows the nearest lantern —
  lead it to her and she freezes, white as a sheet (« …Not again. Not tonight. »), ×2, until
  she chases it off. Beaten, she flees east over the sea with the other flames.
- *Side quests*: **the Tyrant King's toothache** (sneak up on him while he dozes — running
  wakes him; a new `sneak` step); **bottles in the current** (three bottles drift round the
  straits on the sea current — swim out and catch them: moving pickups); Barnaby's letters
  in them tell of the Dawnlands.
- *Sincere beat*: the Understudies uninvited; the Duchess frozen by a hen, thirty years on.

**Chapter 7 — « The Dawnlands » (« Les Terres-de-l’Aube »), whale · harbor · jade · salt, lv 28–34.**
- *Shape*: a new continent under the Murk, reached by air. Every verb is new: whack-a-barnacle
  on a whale, relight a dark town with a guttering lantern, fly kites above the fog, and the
  dungeon's **dawn beam** steered with mirrors. No escort, no camp, no race.
- *Beats*:
  1. **The Crossing** (cold open): the Dauntless Teacup leaves the new mooring mast on
     Lighthouse Isle (the Teacup line: a mast there and one in Lanternport — from now on a
     short flight between the continents). Out over the Wide Sea the Teacup runs low (« She runs
     on tea. Strong. Two sugars. Tea: low. »); they put down on an island that isn't on any
     chart: Whale Isle, the Blowhole Inn and Barnacle Bess (calls everyone « petal »). Then **the
     island opens its eye** — Grandmother Bellows, a whale the size of a village, asleep for
     two hundred years, restless since the Murk came: gloom barnacles itch.
  2. **The Itch** — a whack mini-game (step `whack`): barnacles pop up on her back, whack them
     before they sink back; in Party everyone whacks. Relieved, she **blows**: the spout throws
     the Teacup above the Murk wall and it glides down into Lantern Bay.
  3. **Lanternport in the Dark** — the town under the Murk: shutters closed, candles behind
     them (« we are still here »), street lamps out. The lantern only makes a small circle of
     light and it **gutters in the dark** (step `lamps`: relight the lamps one by one, from the
     quay up to the hall; your light drains away from them and murk moths nibble it; run dry
     and you're back at the last lamp). Relit, the doors open and the town comes out.
  4. **Old Hoshi** — at the top of the town the last Lamplighter of the Dawnlands kept one lamp
     alive for thirty days and wrote the bottles' letters. She knew Nana June (« She wrote to
     me every Starfall. Then the letters stopped. ») — the sincere beat. Then **the Duchess's
     broadcast**: her face on the Murk (« Testing, testing… is this thing on? Of COURSE it's
     on. It's MINE. »), and a beam of darkness — the Umbral Spotlight, tested — sweeps the
     bay: every lamp it touches goes out. Hoshi's lighthouse relights them. « When it works,
     it won't be a street she puts out. » The stakes of the finale, shown.
  5. **The Mime Troupe** (mini-boss): the Understudies, demoted to MIMES (« so we'd stop
     TALKING »), silent — except Minnow, who can't help it. Invisible walls: they box heroes
     in (hit the box to free a friend), mime a rope that pulls you, drop an invisible piano (a
     marked circle). Beaten, Brick: « Brick liked the invisible box. Brick felt safe in it. »
  6. **The Dawn Monastery** (Jade Terraces) — Abbot Sen (proverbs he makes up on the spot),
     the Pagoda sealed until dawn's first light — and there's been no dawn under the Murk.
     **The Dawn Kites** (step `kite`): fly your kite above the fog (reel in, let out, keep the
     string in the green as the gusts pull); when every kite is up they catch the light and a
     column of gold comes down the strings onto the Pagoda's door.
  7. **The Lantern Pagoda** (dungeon) — then the **Paper Dragon**; the Dawn Hearth relit: a
     real sunrise over the Dawnlands, the Murk rolls back from Emberleaf, Glowtide and
     Elderbough.
  8. **The Lantern Festival** at night in Lanternport: sky lanterns rising over the bay, the
     mended dragon dancing. Perkins brings thirty years of undelivered Dawnlands mail —
     « One's for a Miss G. Gloomsworth, Marigold Cove. Never did find her. » (the seed of the
     finale's letter). On the end of the pier, three mimes watch the lanterns, not invited
     again. Hoshi: the Gloomstage went north-east, to the Great Tree.
- *Dungeon* — **the Lantern Pagoda**, floor after floor up the tower (red lacquer, paper
  screens, gold): its mechanic **the dawn beam** (room kind `beam`): the kites' light comes in
  as a beam, bronze mirrors turn to steer it (A turns one), lotus lanterns lit by it open the
  way. Escalating: one mirror; paper screens the beam must burn through, in the right order;
  a prism that splits it — two lotuses at once; the roof, where it's a weapon.
- *Boss* — **the Paper Dragon**, the monks' festival dragon « Old Lucky », brought to life by
  the gloom: a long paper body that follows its head, untouchable in the air (dives along a
  marked line, ink puddles that slow, a tail sweep); after a dive it lands on one of the
  perches round the roof — **turn the Dawn Mirror** in the middle so the beam hits it and it
  catches fire (stunned, ×2). Phase 2 sheds paper bats; phase 3 dives twice. Twist: it isn't
  destroyed — the light burns the gloom off, the red and gold come back, and the monks weep
  with joy; it dances at the festival.
- *Side quests*: **Brother Bao's vow of riddles** (a quiz: three riddles, three answers each,
  your score picks the reward — wrong answers get their own jokes); **the Salt Painter's
  reflections** (Saltmirror Flats: things that exist only in the mirror — walk to where the
  reflection shows one, and it becomes real).
- *Sincere beats*: Hoshi and June's letters; Brick's invisible box; Old Lucky saved, not slain.

**Chapter 8 — « Autumn & Roots » (« Automne et Racines »), autumn · glow · elder, lv 32–37.**
- *Shape*: the Understudies change sides, and a harvest festival with no light gets both its
  light and the Understudies' first real audience; then into the Great Tree. The verbs: **net
  fireflies** at night (a timing catch), **carry** firefly jars and hang them (introduced in the
  open, then the dungeon's mechanic), the Understudies' act as a **rhythm** mini-game; a side
  quest of leaf piles to **stomp** through. One set piece per land.
- *Beats*:
  1. **« You're FIRED. »** (cold open): the Gloomstage moored in the crown of the Great Tree.
     The Duchess auditions cardboard cut-outs of the Understudies (« They never forget their
     lines. They never TALK. ») and fires the real ones: « Understudies are REPLACEABLE. »
     They're tipped off a branch and tumble, a long way, into Emberleaf's leaves.
  2. **Harvestholm** (Emberleaf, a Kyoto autumn): the Harvest Festival is in two days and every
     lantern they light, the moths eat. Mayor Marrow (a harvest queen who judges everything by
     pumpkin). The Understudies are found camping in a pumpkin patch — they don't go back; they
     want to do their act « somewhere people clap ». Fidget tells the plan: the Umbral Spotlight
     needs the Great Tree's Heartlight, and the moths are the Moth Queen's, who eats the light
     the Snuffer can't reach. They join the heroes.
  3. **Glowtide by night** (Stiltwater, Ha Long's stacks in a glowing bay): Old Mo the stilt-fisher
     knows the one light moths won't touch — fireflies, because it's alive. **Net fireflies** in
     the mangroves (they glow and fade: swing when one's bright) to fill the jars.
  4. **The festival**: **carry** the jars from the cart and hang them along Harvestholm's lanes
     (a jar slows you; moths can't eat it) — the village lights up; then **the Understudies' act**
     at last (step `rhythm`: the heroes keep the beat while Brick juggles pumpkins and Minnow
     sings). The crowd claps. « Brick heard clapping. For Brick. »
  5. **Elderbough** (Yosemite: granite walls, the falls, the meadow): Rootholm under the Great
     Tree, its leaves greying — the Gloomstage siphons the Heartlight from its crown. Warden
     Ashby (a very old, very slow tree-keeper) opens the knot-door in the roots.
  6. **The Heartwood** (dungeon) — then **the Moth Queen**; the Heartlight relit, the sixth
     flame; the Gloomstage tears free of the crown, the Duchess cornered and grand: « Keep your
     TREE. The Grand Finale is TOMORROW — at the Umbral Scar! » The Murk rolls back from
     Hollowmoor, Prism Springs, Cogsworth and the Aurora Tundra. The Understudies: « We know
     the way backstage. »
- *Dungeon* — **the Heartwood**, inside the Great Tree (rings of heartwood, sap, glowing fungus,
  root-stairs): its mechanic **the firefly jars** (room kind `jars`): moth swarms fill passages
  and eat your light; carry a jar and hang it on a hook — the swarm goes to it and leaves the way
  clear; glowcap doors open in a jar's light. Escalating: one jar, one swarm; two swarms and one
  jar (which, and when); a room where the jar must be carried past a swarm (carrying slows,
  swarms chase light); the Queen's arena.
- *Boss* — **the Moth Queen**: wings with eye-spots, a crown of antennae; her swarm shields her
  (immune while swarmed) — hang jars on the arena's hooks to pull the swarm off; wing gusts
  (marked cones), dust clouds (slow), a dive; phase 3 she drinks a jar's light (re-hang it) and
  the arena darkens.
- *Side quests*: **the lost harvest ring** (Emberleaf: a farmer's ring in one of a dozen leaf
  piles — land a jump on each; crows steal from the piles you miss); **the Stiltwater lantern
  swap** (a ring of trades between stilt houses — each wants something another has: a choice
  chain with a funny end).
- *Sincere beats*: the Understudies' first applause; Warden Ashby and the tree he planted as a boy.

**Chapter 9 — « Moor & Machines » (« Landes et Rouages »), moor · prism · clock · tundra, lv 35–40.**
- *Shape*: the saga's heart is revealed. Hollowmoor's ghosts tell a story in pieces; the manor
  where a mother waited for a daughter who never came home; the Duchess's past in a sepia
  flashback; then the machines — a Lantern Cannon to answer the Umbral Spotlight — and the
  last camp before the Scar. New verbs again: **seek** ghosts only your lantern can show,
  **snap** a rainbow at a geyser's peak, **defend** the cannon while it charges, **chase** a
  runaway cuckoo; the dungeon's **then/now clocks**.
- *Beats*:
  1. **Candlewick** (cold open, dusk on the moor): a village of candle-makers where everyone
     whispers, because the moor's ghosts are sad, not scary — they wander, waiting for
     something they've forgotten. Aunt Tallow the chandler (talks about candles like wine).
  2. **The Moor's Ghosts** (step `seek`): four ghosts out on the moor, invisible unless a
     lantern comes near — the Manor's butler, cook, gardener and maid. Each gives a line of the
     story: a lady who stopped every clock in the house the day a letter didn't come; a daughter
     who sang; « she said she'd come home when they applauded her ».
  3. **Hollowmoor Manor** (dungeon) — the Lady in Grey; at peace, she shows the flashback:
     thirty years ago, the Starfall Festival in Marigold Cove, young Gloria's first aria — a hen
     wanders on, the crowd laughs, she runs; a letter home: « I'll come back when they
     applaud me. » The Lady: « Tell my Gloria… the tea is still warm. » The Duchess is her
     daughter. The seventh flame: the Manor's hearth, warm again.
  4. **Cogsworth** (the Alps: a brass town under the Cogswhorn): Master Tock, a clockmaker who
     speaks in ticks. The Umbral Spotlight is a light that eats light; only the lantern's own
     light, focused, can put it out — a **Lantern Cannon**. It needs a lens that holds a
     rainbow.
  5. **Prism Springs** (Yellowstone): Ranger Rhoda (reads rules aloud, loves them); **snap** the
     rainbow in the spray of three geysers at their peak (a timing gauge; three different
     rhythms — Old Punctual, a double-gusher, a hiccuping one).
  6. **The Test-Fire** (step `defend`): back in Cogsworth the cannon charges on the square; the
     Duchess, who's been watching, sends a gloom squall — waves of gloom that go for the cannon;
     hold them off until it's charged. It fires: a beam of gold clean through the fog. Hope.
  7. **The Aurora Camp** (the tundra, Glacier NP): the last camp before the Scar; the aurora; the
     Understudies share what they know of the Gloomstage's backstage; the Gloomstage moored over
     the Umbral Scar against the northern lights — « Tomorrow night: the Grand Finale. »
- *Dungeon* — **Hollowmoor Manor**, a haunted manor (wallpaper, portraits, candelabras, dust
  sheets): its mechanic **the clocks** (room kind `clock`): a grandfather clock in every room —
  step on its plate and the room shifts between **then** (the manor in its heyday: warm light,
  furniture where it was, doors that were open) and **now** (dust, cold, rubble, a floor that
  has fallen in). Some ways exist only then, others only now. Escalating: a bricked-up door
  that was open then; a hall where then's furniture blocks one half and now's fallen floor the
  other (switch midway); a gallery where it must be switched twice, with a ghost patrol; the
  ballroom — the Lady's arena.
- *Boss* — **the Lady in Grey**: in **then** she's a memory (untouchable, dancing); in **now**
  she's a gloom ghost you can hit. She throws the tea service (marked landings), the clock's
  pendulum sweeps an arc, cold spots slow; from phase 2 she drags the room back to « then »
  herself every so often (switch it back); phase 3 ghost dancers waltz in rings round the floor.
- *Side quests*: **the Runaway Cuckoo** (Cogsworth: the town clock's cuckoo has escaped — step
  `chase`: it flees the nearest hero round the square until it tires), **the Lost Hikers**
  (Prism Springs: two hikers lost in the steam — `seek` in the steam clouds, for Rhoda, who
  wrote a rule about it).
- *Sincere beats*: the staff ghosts; the flashback; « the tea is still warm »; Tock, who built
  clocks to keep time and a cannon to save it.

**Chapter 10 — « The Grand Finale » (« Le Grand Final »), scar, lv 39–40 — and the Epilogue.**
- *Shape*: everything pays off. The heroes board the Gloomstage over the Umbral Scar with the
  Understudies, Master Tock and his Lantern Cannon, and Captain Wendy's Teacup; they sneak
  through her theatre, beat Crumble's last machine, and face the Duchess in three acts. The
  fight isn't won by hitting her: it ends when Perkins lands with a thirty-year-late letter
  and the heroes give her her mother's message. The Epilogue is the Starfall Festival she
  never got to finish — this time, applause.
- *Beats*:
  1. **The Scar at dusk** (cold open): the camp's last morning; everybody who helped is there
     (Wendy, Tock, the Understudies); the plan; the Teacup flies them up through the
     Gloomstage's searchlights (a set piece: beams sweeping the sky, the Teacup dodging) and
     sets them down on its stage door.
  2. **The Gloomstage** (dungeon, the `backstage` theme: black wood, velvet, ropes, sandbags,
     painted flats): its mechanic **the spotlights** (room kind `spot`): pools of light sweep
     the floor on set paths; anyone caught is « Spotted! » — stagehands pour out and you're
     marched back to the room's door. Escalating: one sweeping light in the wings; two
     crossing lights and flats to wait behind; the fly tower's lighting board (a lever that
     puts every light out for a few seconds — run!) and a follow-spot that hunts the nearest
     hero; the stage, where the lights are hers.
  3. **Crumble's Snuffbot Mk III** (mini-boss, the workshop): « Mark THREE, as PROMISED! » — its
     own moves at last: snuffer-caps dropped over heroes (trapped until a friend hits the cap),
     a wax flood (a spreading ring to jump), and the pilot dome that overheats after the flood
     (hit it: ×1.5). Beaten, Crumble quits: « I'm going to be a TOUR GUIDE. »
  4. **The Understudies' finest hour**: in the fly tower they draw the stagehands off with their
     act (« The show must go on — and it's OURS! »).
  5. **The Grand Finale** (final boss, three acts): Act I — her aria, the Grand Snuffer's rings,
     a follow-spot; Act II — the stage machinery: trapdoors open on marked squares, sandbags
     drop, flats slide across the stage; Act III — **the Umbral Spotlight**, lit with every
     stolen flame: a great beam of darkness sweeping the stage; the Lantern Cannon stands on
     its plate — stand on it long enough and it fires at the Spotlight, shattering it for a
     while (she's stunned, ×2). At the end of her strength: Perkins crashes through the
     backdrop with a letter thirty years late — the festival committee's, written the night
     she ran: « The hen was an accident. Please come back and close next year's Festival. We
     would so like to hear the rest. » And the heroes give her her mother's message. She
     cries. The flames fly home.
  6. **Dawn over everything**: the Murk lifts from every land, the Great Hearths burn, the
     Gloomstage lands gently in Marigold Cove.
- *Epilogue* — **the Starfall Festival**, that night: everyone the heroes met, on the plaza; the
  Duchess sings her aria — all of it, beautifully — and the whole cove applauds; the
  Understudies do their act; at the back of the crowd, a pale lady with a teacup smiles and
  is gone; fireworks; the credits.
- *Side quests*: none in the finale — the last thread of each is tied up in the epilogue's crowd.
- *Sincere beats*: the letter; « the tea is still warm »; the applause.

## 4. The cast (and their voices)
- **Duchess Gloria Gloomsworth** — grand, petty, theatrical; sings her threats (♪), mangles
  the heroes’ names (“the Lamp-lickers”, “the Wick Brigade”), a new title every entrance.
  Terrified of hens. Catchphrase: “*Nobody* invited me.” Tall, violet gown, huge feathered
  hat, opera glasses on a stick.
- **Crumble** (« Miette ») — her tiny stagehand-herald, a round gloom-gremlin in a bellhop cap;
  over-the-top announcements (“LADIES, GENTLEMEN AND ASSORTED WILDLIFE!” / « MESDAMES,
  MESSIEURS ET BESTIOLES DIVERSES ! ») that always garble her title; drums his own drumroll;
  loyal, sweet under it all.
- **The Understudies** (« les Doublures ») — Minnow (« Fretin », tiny, bossy, the leader),
  Fidget (« Frétille », thin, nervous, overthinks), Brick (« Brique », huge, gentle, one word
  at a time). They audition for a real part at every chance; their team pose collapses.
- **Nana June** — the last Lamplighter; mischievous, knits, knows more than she says.
- **Mayor Hollis** — drops his tea at every big event (a narrated cutaway ends each chapter).
- **Perkins** — the Pelican Post’s postmaster, a huge pelican with a cap and a bottomless
  pouch; proud, always late (“The Pelican Post delivers! Eventually.”).
- **Captain Wendeline “Wendy” Gale** (« Capitaine Wendeline Bourrasque ») — the Dauntless
  Teacup’s captain, cheerful and reckless; **Nibs**, her albatross first mate, is afraid of
  heights.
- **Professor Hazel Burrows** (« Professeure Noisette Terrier ») — a mole scholar of the
  Lamplighters, big glasses, lost in her notes; reads the old maps that open each dungeon.
- Each hub: two or three locals with a small story of their own (a forester who talks to
  trees, a girl who wants to be a Lamplighter, a nervous lighthouse keeper, a retired
  cannonball, a frog king with a cold…). The wanderers (Rook, Sigrid, Moss, Kai) and the
  villagers get parts in chapters.

**Running gags**: Crumble’s titles · the Understudies’ pose · the hen that ruins the
Duchess’s entrances (her backstory) · “Nobody invited me” → the invitation · Perkins drops
you “slightly off” · Nibs and heights · Hollis’s tea.

## 5. Levels, monsters and balance

### 5.1 Heroes
- Cap **40** (was 30): 39 talent points of the 45 the three trees hold (two full trees and
  most of the third). `XP_NEED(lv) = 40 + 30·lv + lv²`.
- XP mostly from **quests**: a main quest gives ≈ 45 % of `XP_NEED(its level)`, a side quest
  ≈ 25 %, a dungeon’s end ≈ 60 %; kills give `4 + 2·(monster level)` scaled by the level gap
  (none for grey monsters), camps, lairs and events as today but level-based.
- Loot’s item level = the monster’s level; weapons +0.6 % damage per item level.

### 5.2 Monsters keep their level
- Each monster has a level (its zone’s range; elites +1, rares +2, bosses the zone’s top +1).
- HP × `hpL(lv) = (1 + 0.06(lv−1))·(1 + 0.03(lv−1))`; damage × `dmgL(lv) = (1 + 0.08(lv−1))·(1 + 0.012(lv−1))`
  (the heroes’ own curves, plus the gear/talents they’re expected to have).
- Level gap (monster − your effective level): ±8 % damage taken and ∓6 % damage dealt per level
  (capped at ±5 levels); name plates coloured like WoW (grey, green, yellow, orange, red, skull).
- **Group scaling**, counted live among the heroes within 30 tiles of the fight: HP ×
  `1 + 0.8(n−1)` (bosses `1 + 0.9(n−1)`), damage × `1 + 0.04(n−1)`; camps get `⌊n/2⌋` more
  monsters and an extra elite per 3 heroes; adds, summons and damage-over-time inherit it all.
- Difficulty (Cozy / Normal / Tough / Heroic) multiplies on top, as today.

### 5.3 Level sync (Party)
Each hero fights at an **effective level** = clamp(own level, zone min, zone max + 2): a
level-1 phone joining a level-35 party is lifted to the zone, a veteran is brought down to it;
talents and gear keep their bonuses. Solo: brought down only (min(own, zone max + 2)).

### 5.4 Bestiary per land
Existing families stay where they are (40 kinds). New families (each asks something different,
every attack telegraphed):
- **The Troupe** (the Duchess’s stagehands, in her dungeons and scenes): mimes (invisible
  walls you must go round), jugglers (arcing pins), cymbal monkeys (stun rings — jump), brass
  trumpeters (a knock-back cone), riggers (sandbags drop on marked shadows), spotlight bearers
  (a lit circle that follows you and burns).
- **Hearthlands additions**: gloom kites (heights; dive along a marked line), mole miners
  (canyon; tunnel & pop up), ice imps (glacier), sand sharks (dunes; fins in the sand).
- **Dawnlands**: paper lantern ghosts & bamboo snappers (jade), salt crabs & mirror sprites
  (salt; reflect shots), scarecrows (autumn; only move when you turn away) & pumpkin bombers,
  mangrove crocs & glow jellies (glow), acorn knights & moth swarms (elder), bedsheet ghosts
  (moor; visible only in lantern light) & will-o’-wisps, crystal golems (prism; weak from
  behind) & prism beetles (split beams), wind-up soldiers (clock; march in lines) & brass
  spiders, ice wolves (tundra; packs) & mammoth calves, murk wraiths & shadow doubles (scar).
- **Elites** (gold plate, +1 level, an affix), **rares** (silver plate, named — “Sir Reginald,
  the Gloomiest Hen” — a unique hat), **world bosses** (Old Thunderhoof on the steppe, the
  Glacier Wyrm, Grandmother Kraken in the Wide Sea, the Moonmoth over Elderbough, the Crystal
  Behemoth) with a world banner, scaled for 1–8.

## 6. Dungeons
Instanced, built off-map (x ≥ 3000) from a layout per dungeon: rooms and corridors, doors that
lock until a room is cleared, traps (spike plates, rolling logs, fire jets, falling sandbags),
puzzles solvable alone or together (plates that stay down a moment, torches to light in order,
light beams to aim with the lantern, blocks to push), packs, a treasure room, a mini-boss, a
boss arena. The whole party goes in together (a vote at the entrance in Party); split views
still work inside. Beaten: the Great Hearth, a scene, loot for everyone, the way out.

**Two kinds of instance** (the player’s note, M4: « un donjon n’est pas forcément sombre, ça
peut être une zone instanciée comme dans WoW »):
- **caves & halls** (`theme`): a dark place — your lantern and the braziers light it; its own
  painted floor and walls of rock, roots or wax (the Glimmer Grotto);
- **outdoor instances** (`outdoor`, `saga/instance.js`): a place under the open sky, like WoW’s
  instanced zones — the rooms become glades, clearings or courtyards, the corridors paths, and
  everything else thick woods, cliffs or water nobody crosses (`block` 3). The ground is a
  little map of the big world’s own tiles, painted by the same chunk painter in workers,
  scattered with the same trees, walked with the same collision, with the relief (cliffs,
  falls) and the place’s own features (`paint(T)`, `objs`); lit by daylight **at the
  instance’s own hour** (`lighting.updateInstance`: late afternoon in the Rootway, dusk at the
  Pagoda, night at the Manor) without the zone’s weather or the Murk’s gloom. Gates can be
  roots that rise and sink (the `roots` theme).
Most dungeons are outdoor instances now; a few stay dark on purpose (a sea cave, the inside of
a tree, the theatre in the sky). A later dungeon may chain both (a door in a cliff leading into
its cave part).

| Ch | Dungeon | Kind | Theme | Mini-boss | Boss |
|---|---|---|---|---|---|
| 1 | Glimmer Grotto | cave | sea caves, the lighthouse cellars | the Understudies (*Juggling Act*) | Crumble’s Snuffbot 3000 |
| 2 | the Rootway | outdoor, 15:30 | a hidden valley behind the falls: glades, burrows, a log slide, the Heart Tree | Grumbleclaw the gloom badger | Barkbeard |
| 3 | the Old Mine | outdoor quarry + tunnels | an open-pit mine in the canyon: rails, crystals, carts | the Understudies (*Human Cannonball*) | Foreman Grubb & the Drillosaur |
| 4 | the Frostbell Halls | outdoor pass + ice halls | a frozen pass up to an ice palace, sliding floors | an ice imp chief | the Frost Tenor |
| 5 | the Sunken Bell Temple | outdoor at low tide | a lagoon ruin in the sun, the tide rising room by room | the Understudies (*Synchronised Swimmers*) | the Gloom Kraken |
| 6 | the Forge Heart | outdoor caldera, dusk | lava lakes under an ash sky, conveyor belts | Crumble’s Snuffbot Mk II | the Duchess (*Debut*) |
| 7 | the Lantern Pagoda | outdoor, dusk | terraces & paper lanterns climbing to the pagoda | the Understudies (*Mime Troupe*) | the Paper Dragon |
| 8 | the Heartwood | cave (inside the tree) | inside the Great Tree, glowing sap | an acorn knight captain | the Moth Queen |
| 9 | Hollowmoor Manor | outdoor at night + the house | the manor’s grounds under the moon, then its halls | a suit of armour | the Lady in Grey |
| 10 | the Gloomstage | dark | backstage, catwalks, the stage | Crumble & the orchestra | the Duchess in three acts |

Bosses follow the v3/v5 pattern (phases at ⅔ and ⅓, every blow telegraphed, a weak moment to
punish, adds that inherit the scaling).

## 7. Cinematics (the “wouahou” list)
A scene system (§9): the camera travels and zooms, actors walk, jump, emote and act, black
bars, title cards, flashes, shakes, big effects, music cues; skippable (the host on the phone
or big screen, Esc in solo); phones show « Regarde l’écran ! ».

1. *Lights Out* — the Gloomstage eclipses the sun over the cove, the Grand Snuffer comes down
   on Old Glimmer, colours drain, the Murk rolls over the hills. **Wow: a flying opera house.**
2. *The Understudies* — their first entrance and collapsing pose.
3. *Old Glimmer shines again* — the beam sweeps out, the Murk rolls back from the woods.
   (Hollis drops his tea.)
4. *Barkbeard wakes* — the ground splits and a tree stands up. **Wow.**
5. *The Pelican Post* — scooped up by Perkins, the first flight over the world. **Wow: scale.**
6. *The Big Top* — the Duchess’s performance at the Festival Ring (booed; a hen).
7. *The shadow over the glacier* — the Gloomstage passes overhead.
8. *The Kraken’s bell* — the bell tolls, the water rises, an eye opens.
9. *The Diva’s escape* — she takes the last flame and sails east over the sea.
10. *All aboard the Dauntless Teacup* — over the Wide Sea, Whale Isle opens its eye, the
    Dawnlands appear at dawn under the Murk. **Wow: a new continent.**
11. *The Paper Dragon* — the festival puppet comes alive over the pagoda.
12. *You’re fired* — the Understudies sacked, and adopted.
13. *The Lady in Grey* — the sepia flashback of the Duchess’s debut.
14. *The Grand Finale* — the curtain rises on the Gloomstage; the letter; dawn over the whole
    continent. **Wow: sunrise.**
15. *The Starfall Festival* — the epilogue, fireworks, credits.

## 8. Side quests & mini-games
- 2–4 side quests per hub, small personal stories (a lost pie tin, a love letter never sent, a
  lighthouse keeper afraid of the dark, a frog’s cold, a scarecrow who wants friends…),
  rewarding XP, gear, hats, companions.
- Mini-games: **Pelican Rush** (deliver the post round a town against the clock), **the
  Talent Show** (the Understudies’ rhythm game: buttons in time, on the phones), **Ghost Hunt**
  (Hollowmoor: find hiding ghosts with the lantern), **Lamplighting** (Lanternport: light every
  lamp before the Murk blows them out), **the Minecart Rush** (the Old Mine). The festival
  games, races, fishing, taming and the Festival Ring stay.

## 9. Technical plan
- `src/saga/` — `saga.js` (state, chapters, quests & steps, triggers, rewards, markers,
  objective, phone hints, Murk unlocks; hosted by `ExploreAct` in Party and `Wild` in solo
  through a small adapter `host.js` that evens out say/ask/fade/banner/camera), `stage.js`
  (the scene director), `cast.js` (the new characters: looks, voices, special models),
  `murk.js` (zone locks: collision, fog walls in streamed chunks, map veils, the unlock),
  `levels.js` (zone levels, monster curves, group scaling, sync, XP), `dungeon.js` (the
  dungeon builder & runtime), `chapters/chN.js` (content), `ui.js` (journal, tracker, level
  plates).
- `src/combat/v7/` — the new monster families and bosses (merged into the bestiary like v5).
- `src/world/big/gen2.js` — the Dawnlands and the Wide Sea; new tiles (BAMBOO, PADDY, SALT,
  AUTUMN, ROOTS, MOOR, CRYSTAL, COBBLE, METAL, TUNDRA, UMBRAL) in `tiles.js`, `paint.js`,
  the previews and map colours; `src/models/v7/` — scatter and landmarks for them.
- Dialogue box: inline pauses `{p}`, speed `{slow}`/`{fast}`, shake `{shake}`, wavy `{wave}`,
  big `{big}` text, more expressions (angry, smug, worried, cry, shock, sleepy, determined), a
  pop-in emote over the speaker, auto-advance for scenes.
- Maps: continent tabs + zoom on every map, zone levels and Murk veils, quest markers (also
  in the wild lands and on the phone); the phone gets the base picture once (≈ 0.4 MB) and
  fog diffs.
- Saves: Party `hearthlight.party.saga` (+ fog with a size header, old fog re-laid); solo
  `state.saga`; old camps/lairs/stones re-seeded.
- Tests: `tools/partybots.js` gets `T.saga(ch)` (jump to a chapter), `T.autoplay('saga')`
  (bots play the whole story: talk, go, fight, dungeons, scenes skipped or watched).

## 10. Milestones (each: tests solo + Party 1/4/8 bots + the story by the bots, screenshots,
scores /10, iterate to 9, commit & push)

- **M0** this bible + the map render.
- **M1** foundations: saga engine, scene director, dialogue effects, levels & group scaling,
  level sync, the Murk (on the current world). Criterion: a test scene plays and skips in solo
  and Party; a level-30 party of 8 against a level-30 camp takes as long as 1 player at level 1.
- **M2** the vertical slice — chapter 1 complete (NPCs, quests, dialogues, the *Lights Out*
  scene, the Glimmer Grotto with its mini-boss and boss, Old Glimmer relit, the Murk lifting),
  solo and Party. Criterion: every aspect of it at 9/10.
- **M3** the big world: the Dawnlands and the Wide Sea generated, new tiles & scatter, maps
  with continents, rooms moved, the phone map. Criterion: generation < 1.5 s, 8 players
  ≤ 16 ms/frame, the map readable.
- **M4–M8** chapters 2–6 (Act I), with their dungeons, bosses, scenes, side quests, the Pelican
  Post (M4) and the airship (M8).
- **M9–M11** chapters 7–9 (Act II): Dawnlands landmarks, monsters, hubs.
- **M12** chapter 10, the finale and the epilogue.
- **M13** side quests & mini-games pass, world bosses & rares.
- **M14** balance passes (bots at 1/4/8, levels 5/20/40) and polish; README, screenshots.
