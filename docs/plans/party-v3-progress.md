# Party v3 — progress log

Read this first after a context reset. Plan: `docs/plans/party-v3.md`. Notes: `CLAUDE.md`.

## Environment notes

- Use our own dev server: `preview_start hearthlight-alt` (port 8766,
  <http://localhost:8766/?debug=1>); another chat may hold :8765. The pane is usually hidden: emulate 1920×1080 with `resize_window` and drive frames
  with `game.debug.step`.
- Timing = `performance.now()` around `await game.debug.step(120)` (ms per frame).
- Baseline (before v3): 8 bots in 4 groups in the valley = 7.9 ms/frame; 4 bots together
  = 5.1 ms/frame.

## Decisions

- Valley stays at its own coordinates; big map spans x ∈ [-280, 520), z ∈ [-136, 264).
- Chunks 32×32 tiles, painted in module workers, alpha channel = water info.
- Zoom = integer world-canvas scale (crisp pixels), Auto by party spread.
- Host phone = first phone, crown, auto-handover.

## User requests during the night

- Talent tree per hero unlocked from the phone as you level up (modifies attacks/specials),
  customise your character from the phone even in-game, and your equipment → M6.
- "The arena is much too small — make it bigger and better!" → done right after M4
  (see log).
- "Control the camera zoom from the host phone (one host per session)" → the host menu
  already had it (M1); now also a one-tap zoom bar on the host's controller screen.

## Log

- (start) Read the code, wrote CLAUDE.md, the plan and this log.
- **M1 done — host phone & zoom** (commit "Party v3 M1").
  - `src/party/host.js`: crown (first phone, hand-over, auto after 8 s away), one menu model
    (`tabs()`) drawn on the big screen (Esc / gamepad Start) and sent to the host phone as
    `{t:'hmenu'}`; phone answers `{t:'hact', id, dir}`. Pause (`party.paused`, phones get
    `{t:'pause'}`), skip line / whole scene, restart / switch activity / lobby / end party,
    difficulty (`DIFFS`: hp/dmg/speed in Combat), friendly fire (co-op, 50 %), music & sounds
    volume, language, players (give crown, remove absent).
  - `Zoom` in `src/party/camera.js`: integer world-canvas scale (`display.setWorldScale`),
    eased ppu transitions, Auto = closest of normal±1 where everyone fits, else split;
    `cam.forceSingle` lets Auto own the single/split decision.
  - `party.resetActs()` now kills the old activity's pending scripts (dialogue, waits, vote).
  - Phone: crown in the header, gold ♛ pill → host menu with 4 tabs, paused card.
  - Tests: 8 bots, every host command, crown hand-over, story autoplay, solo game: 0 errors.
  - i18n: `src/lang/fr/host.js`; scanner reads `label/sub/name…` properties in v3 files and
    skips comment lines (0 missing).
  - Own dev server: `preview_start hearthlight-alt` (port 8766).
- **M2 done — big-world engine** (commit "Party v3 M2").
  - `src/world/big/`: `layout.js` (BIG = 800×400 from (-280,-136), 14 zones, water palettes),
    `gen.js` (warped-Voronoi zones, per-zone ground, landmarks, rivers, coasts, roads, the
    valley stamped at its own coords, `deck` 1 = valley planks / 2 = new bridges, `carved`
    valley tiles), `objects.js` (scatter ~9k objects, `OBJ_R` collider radii),
    `paint.js` (windowed chunk painter, **pixel-identical to art/terrain.js in the valley**,
    alpha = liquid info), `worker.js`, `stream.js` (ChunkStreamer: previews, 4 workers, LRU
    cache 80, liquid overlay shader water/lava/clouds/reef + currents, per-chunk instanced
    scatter & piers), `objects3d.js` (instanced kinds), `collide.js` (BigCollision, same API,
    swim flag), `minimap.js` (WorldMap: 1 px/tile + fog 8×8 cells, saved in localStorage),
    `bigworld.js` (attach/detach: hides valley ground, swaps `world.overCol`, tucks trees on
    carved roads, cloud plane, skirts).
  - Hooks: `World.tileAt/groundY` defer to `world.big`; `World3D.groundParts`;
    `SplitCam.bounds` = {x0,z0,x1,z1}; `party.placeName(x,z)`; explore `drawMapMarks(ctx, M)`.
  - UI: corner minimap (explore), "Where is everyone?" panel frames all players, full world
    map (M key or host menu), zone labels over discovered cells.
  - Perf (4K-emulated screen, M5 Max): 4 groups far apart 5.3 ms; very far zoom 4 groups 6.6;
    worst (very far zoom, one group in the village) 10.9 ms; painting ~60-140 ms/chunk/worker.
  - Reachability (node BFS): every land zone reachable on foot from the plaza.
  - Tools: `node tools/bigmap.mjs out.png` renders the map (1 px/tile).
  - Tests: story autoplay (4 bots) in the big world, waves, exit → solo: 0 errors.
  - Known weak spots for M3: zone shapes too blobby, clouds read as cobbles, coral confetti,
    empty south ocean, heath too grey, no zone music/weather yet.
- **M3 part 1 done — zones with character** (commit "Party v3 M3 (part 1)").
  - `src/party/zones.js`: `ZONE_FX` per zone (music, ambience, day/night weather, colour
    wash, events), per-view weather particles (snow, sand, rain, spores, embers, petals,
    fireflies, aurora), events (gust, blizzard, sandstorm, squall) with banners, mechanics
    (bouncy mushrooms, floaty cloud isles, glacier ice slide, lava embers, dust devils),
    discovery banners/toasts saved in `hearthlight.party.world.v1`.
  - Shapes: near-valley Voronoi seeds, heights/deepwood split exactly on the cliff,
    volcano cone, cloud puffs, reef patches, heath/steppe palettes; mushroom night glow.
  - POIs in `gen.js` (waystones, camps, igloos, temples, windmills, wrecks, lighthouse…),
    built lazily by `pois.js` from `src/models/landmarks.js` (subagent) and
    `buildBuilding` for the lighthouse. Zone music in `src/engine/tracks_world.js`
    (subagent) merged into `TRACKS`.
- **M4 done — swimming & vehicles** (commit "Party v3 M4").
  - `src/party/swim.js`: water is open in Party Mode (collision swim flag); bobbing at
    SINK, arm paddle, foam ring, A = stroke, B = dive (bubbles, 1.15 s, cooldown) — dive
    where the water glints for pearls/shells/relics (44 spots, `gen.js` `dives`); currents
    (`big.flows`) and whirlpools spin you and spit you out; no fighting in water
    (`combat.canAct`, enemies ignore divers).
  - `src/party/vehicles.js`: rowboat (2 rowers, rowing in rhythm = speed bonus + hearts),
    sailboat (8 seats, captain steers, crew trims), glider (launch pads on the Heights rim,
    updrafts over cliffs & lava), sled (glacier runs, crash into rocks), minecart (Canyon
    Railway, 2 seats), hot-air balloon (Balloon Station ⇄ Cloud Isles), ziplines (3).
    Board with A near a vehicle (label over it), B leaves; phone context shows the actions.
  - `gen.js`: glider pads on the rim, rails carve cuttings & plank decks, ziplines,
    whirlpools, dive spots. i18n `src/lang/fr/moves.js`.
  - Tests: every vehicle driven by bots, 8 bots in 4 groups, story autoplay (4 bots,
    5 games → awards → lobby), exit → solo new game: 0 errors; i18n 0 missing.
- **Arena v2 — the grand Festival Ring** (user request, after M4).
  - Moved out of the crowded valley meadow onto the Golden Steppe just past the west gate:
    `ARENA_SITE` = centre (-21, 87.5), sand 29×22 tiles (≈4× the old ring). `gen.js` clears
    the ground (keep mask) and lays a lane up to the Pinewick road; the floor is a new tile
    `TT.ARENA` painted by `paint.js` (raked rings, terracotta border, a shooting star with a
    tricolour ribbon). The valley meadow is back to its solo look (no more tucked trees).
  - `src/party/arena3d.js`: stone wall with 4 gates (door leaves that swing, colliders when
    shut), tiered stands (4 rows behind, 3 on the sides, the south open for the camera),
    ~230 instanced spectators (face texture, hair/party hats, little flags), the
    announcer's box over the north gate (Hollis up there), braziers, lantern pillars,
    bouncy drums, poles with fluttering pennants, bunting, the gong by the lane.
  - `ArenaSite`: gates open while roaming / shut in a fight / open for a moment when gloom
    comes through; crowd hops & a Mexican wave (`ola`), lobbed gifts (tart/coffee), drums
    bounce players ~2.5 tiles high. `ArenaAct`: enemies burst in through the gate farthest
    from the heroes, alive cap up to 18, barrels roll across lanes on waves 3/4/7/8/9 and
    every 20-30 s in pvp (jump over them!), new mode **King of the Ring** (golden circle,
    +1/s alone in it, contested when shared, moves every 18 s) in the lobby vote, the host
    menu and at the gong. Camera `focus` frames the ring (centred when it fits).
  - Perf: 8 players in a fight 3.4 ms/frame; farthest zoom 6.0 ms.
- **Host zoom on the phone** (user request): a zoom rocker (+ / level ticks / − / Auto) on
  the host's controller (right side in portrait, header in landscape), + / − / 0 keys on the
  big screen, and a short "Far view" note on the big screen when it changes. A host phone
  that reloads gets its menu again (`sentKey` reset on join).
- **M5 done — taming & mounts** (commit "Party v3 M5").
  - `src/party/mounts.js`: 6 mounts (`MOUNTS`): stag (fast, Dash), boar (Charge), giant hen
    (jumps high, hold B to glide, Flap), turtle (swims fast — the only mount in water, Shell
    spin), bear (sturdy: 40 % less damage, Ground slam), big frog (huge jumps, Mega leap,
    tongue reach). 24 herds (60 animals) placed in clearings of their zones (seeded, never
    in the valley or the Festival Ring), models only near players; each herd has 3 spots of
    its favourite food (apple, acorn, corncob, kelp, honeycomb, juicy bug) that respawn.
  - Wild AI: graze, wander (open ground), curious when you carry its food (thought bubble
    with a heart), skittish if you rush in without it. Offer with A → the phone plays the
    taming game (`{t:'screen', s:'tame'}`: tap A while the marker is in the green, 3 hits,
    3 misses and it bolts; the phone judges and sends `{t:'tame', id, hit, zone}`);
    keyboard/gamepad players play the same meter on the big screen. Tamed = ridden at once.
  - Riding: saddle in the player's colour, speed/jump per mount, A = mounted attack when
    gloom is near (else the activity's A), X = ability, B = jump, **Y = get off / whistle**
    (new Y button on phones, R/U and ,/Num4 on keyboards, gamepad Y). Mounts are saved per
    phone (`profile.mounts = { owned, active }`), picked in the phone menu ("My mounts").
    Freed gloomy stags become their freer's mount. Mounts only in explore & the lobby
    (stabled otherwise); riders stay dry; class moves are off in the saddle.
  - Phone: Y button in a diamond with A/B/X (labels on the left when crowded), taming screen,
    mounts menu, "press" regions that fire on touch-down (timing games).
  - `src/models/mounts3d.js`: box models with a small rig (trot/gallop, head bob, wings,
    flippers, frog legs), wild variants, saddles hidden until tamed.
  - i18n: `src/lang/fr/mounts.js` (animal & food phrases carry their French articles);
    scanner reads `mounts.js` properties (`a`, `the`, `y` too).
- **M6 part 1 — dodges, parries, elements, combos, finishers** (commit "Party v3 M6 (part 1)").
  - `src/combat/v3/status.js`: burn / chill→freeze (heavy hit shatters) / poison stacks /
    shock (jolt + chain) on enemies and heroes, tints & particles, shields (front, broken →
    stagger) and armour (light hits), bubble shields, the party combo (+2.5 %/hit, +15/25 %
    team bonus), status pips, finisher "!" prompt. `combat.js`: Y roll (0.3 s, i-frames,
    0.7 s cooldown), PARRY in the first 0.17 s (stagger + counter ×1.6, shots fly back),
    juggles (hits in the air keep foes up, ×1.15), FINISHER ×2.5 on staggered foes.
    Class moves: pan slam shock, comet fire, starfall ice, pinecone poison.
  - Phone: Y = Dodge in fights (whistle otherwise), look editor mid-game from the menu.
- **M6 part 2 — the bestiary & gloom camps** (commit "Party v3 M6 (part 2)").
  - `src/combat/v3/bestiary3d.js` (models) + `bestiary.js` (brains, `ZONE_FOES`): 17 new
    foes — burrower, imp (kamikaze, chain explosions), wisp, toad (tongue grab), shaman
    (summons sporelings), mender (heal beam, interrupt it), shieldbearer, armour beetle
    (rolls & bounces), harpy (long telegraphed dives), slinger (lobbed bombs, kites),
    reef crab (strafes, front armour), drowned sailor (blinks behind you), lava slug (fire
    trail hazards), storm crow (thunderclap), totem (bubble shields), sandworm (erupts along
    a line), frost yeti (snowballs, ground pound). Elites: gold ring + ★, ×2.4 HP, ×1.25 dmg,
    affix swift / bulwark / vampiric / splitter.
  - `src/party/encounters.js`: 20 gloom camps (2 per land zone) in clearings, packs scale
    with party level & size (totems, elites from Lv3, the zone's big one from Lv4); clearing
    one relights the fire, blooms flowers, drops a chest, gives XP; saved; respawn after 4 min.
    Camps show on the world map once seen.
- **M6 part 3 — zone bosses & lairs** (commit "Party v3 M6 (part 3)").
  - `src/combat/v3/bosses.js` (+ helpers moved to `ai.js`): the Sand Queen (fanned
    eruptions, dizzy → finisher window, tail sweep ring, P2 geysers + burrowers, P3 suction),
    the Frost Colossus (ice-armour shield all round — break it and its core takes ×1.5;
    slams, rolling snowball lanes, P2 expanding spike rings + wisps, P3 double slams), the
    Frog King (royal leaps with landing circles, tongue grab, frog guards, P2 poison puddles,
    P3 leap chains + a royal belch cone), the Magma Golem (fissure fans that leave burning
    trails, fireballs, P2 meteor rain, P3 plates fall off: faster, a rotating flame beam to
    jump). Phases at 2/3 and 1/3 with a roar; all attacks telegraphed (lines, circles with a
    red pulsing edge, rings, cones). Bosses shrug off most of a parry (short stagger).
  - `src/party/lairs.js`: lairs by the worm bones, the ice arch, the frog throne and the
    forge gate (nearest dry open ground, south first); a sigil with gloom flames; "something
    huge stirs", then the boss wakes (banner, boss music, a boss bar with phase marks and
    shields); leashed to 12 tiles, goes home healed if everyone runs; victory: golden sigil,
    two chests, 120 XP each, saved; rematch after 15 min. Skulls / crowns on the world map.
  - Long banners shrink to fit.
- **M6 part 4 — talents, gear, phone screens** (commit "Party v3 M6 (part 4)"; user request).
  - `src/combat/v3/talents.js`: 4 heroes × 3 branches × 3 tiers (36 talents), one point per
    level from Lv2, tiers open in order, per hero & per phone (`profile.talents[cls]`).
    Talents change how moves work: fighters now fight with their own copy of the class
    moves (`f.moves`, built by `buildMoves`) — taunt, a second thunderclap, whirlwind pull &
    fire, twin comets, burning ground, a meteor, split bolts, cluster bombs, sticky sap,
    roll & reload, encore regen, crescendo, thorns, juggle bonus…
  - `src/combat/v3/gear.js`: runes (fire / frost / venom / storm: element on hits + damage)
    and 9 charms (heart, sharp, lucky, swift, thorn, leech, quick, feather, glow), levels
    I-III, bag of 12, upgrades with stardust (60 / 160), melting gives stardust.
  - `src/party/progress.js`: validates the phone's requests (`talent`, `talentReset`,
    `gear` equip/unequip/upgrade/drop), refreshes the fighter, syncs `{t:'prog'}`; every
    chest gives each nearby player a piece of gear (boss chests are "rich"); stardust is
    saved; a toast when a talent point is waiting.
  - Phone: Talents screen (tree with connectors, details, Learn, Reset ×2), Gear screen
    (rune + 2 charms, bag grid with rarity outlines, Wear / Upgrade / Melt), both in the
    menu (two columns in landscape) and on the lobby card.
- **M7 part 1 — waystones & fast travel** (commit "Party v3 M7 (part 1)").
  - `src/party/travel.js`: the 16 waystones (one per zone, two in the glacier & deepwood)
    attune when someone walks up (banner, sparkles, saved in
    `hearthlight.party.waystones.v1`; the Market Plaza is always attuned). A at an attuned
    stone → a vote (the farthest four + home + "Stay here"); the host's menu gets a
    **Travel** tab (confirm tap, zone on a second line). Fade, gather on dry open ground
    by the stone, wait for its chunks, banner. Not during a boss fight / with gloom close.
  - Travellers by the stones while exploring: Finn (canyon), Mabel (glacier), Juniper
    (bouncecap), Marlo (lagoon) with zone tips; Pim at the Nomad Camp sells a mystery rune
    or charm for 80 stardust (A, then A again to buy — personal, no vote).
  - World map: crystals for waystones (drawn above the names), camp/lair icons shared, a
    legend under the map; the arena tiles had no map colour (magenta) — fixed.
  - Polish: NPC bubbles wrap (and draw above name tags), toasts step down under the banner,
    friends reaching a zone together get one toast ("Everyone reached …"), host-menu buttons
    show their sub line on the phone.
- **M7 part 2 — secrets & races** (commit "Party v3 M7 (part 2)").
  - `src/party/secrets.js`: 8 sealed golden chests by landmarks (spots searched in a spiral,
    clear of landmarks/camps/lairs, on open dry ground): **plates** (3 plates round the
    chest; a plate lights while stood on and stays lit 5.5 s — pillar of light shrinking —
    all three at once breaks the seal: easy together, a sprint alone) and **chimes**
    (4 singing crystals G-A-B-D round a pedestal; A plays a tune, ring it back, 3 rounds
    of 3/4/5 notes Simon-style, a wrong note replays it). Plus 11 **buried treasures**
    (one per wild zone, seeded spots off the roads, glint within 8 tiles, dig with A).
    Golden chests pop out (`dropChest({golden, pop, floor})`): all gold, 40 stardust,
    rare-or-better gear for everyone near, a relic. Solved secrets come back after 30 min
    (`hearthlight.party.secrets.v1`). New `tone` sfx (one crystal note).
  - `src/party/races.js`: 5 courses along the roads (Steppe Sprint from the Nomad Camp,
    Canyon Dash, Switchback Scramble, Frostpeak Climb, Ember Trail): chequered start/finish
    lines with flag poles (flags always face the camera), checkpoint rings with a star
    every ≤ 20 tiles. A at the start → 7 s to stand in the start box, countdown card,
    GO!, a live card (clock, checkpoints per racer), per-view arrows to each racer's next
    ring, phone hints; prizes 60/35/20/10 stardust + XP; solo: target time (length/4.6 t/s)
    and a saved record. No waystone travel mid-race.
  - Map: sealed chests & race flags on the world map; the legend wraps on two rows.
    Toasts also keep clear of the race card.
- **M7 part 3 — the living world** (commit "Party v3 M7 (part 3)").
  - `src/party/events.js`: every 4-7 min of roaming (first after 2.5-4 min; never during a
    race, a boss fight, a vote or the Grumblecloud) something happens near the party:
    **gloom invasions** (a wild waystone 25-120 tiles away; a column of gloom seen from
    afar, a map marker and arrows in every view; reach it and hold out through 3 waves of
    that land's foes — elites from wave 2, its big one last; leave for 25 s and it drifts
    away; win: a rich chest, 50 XP + 20 stardust each, the stone attuned) or
    **migrations** (7-10 stags/boars/giant hens/bears/big frogs cross the land past the
    party in formation — calm: taming needs 2 taps and a wider green). At night,
    **shooting stars** fall near someone every 40-70 s: they glow (a light-pool source),
    first to touch one gets 25 stardust (10 for friends near) and a wish for everyone
    (swift feet / stronger hits / full health + regen). Weather events stay in zones.js.
  - Top cards (race, invasion) sit beside the objective card (`party.topCard`), toasts
    avoid them. Objective card fix: a new area waited for its cooldown and was forgotten.
  - World map: a checklist (lands, waystones, camps, guardians, secrets, races).
- **M8 part 1 — balance, music, a crash** (commit "Party v3 M8 (part 1)").
  - Crash fix (`combat.js`): a move that ended while being performed (an imp exploding in
    your face knocks you out mid-swing) read `f.act.done` on null — found by the camp tests.
  - Balance, measured with bots (`tools/partybots.js` now reaches big foes by their edge —
    melee bots never touched bosses before): camps 10-18 s solo (Lv1-8, 0 downs); zone
    bosses now meet the party's level (HP ×0.7…1.25, damage ×0.7…1.1 from Lv1 to Lv9+) and
    grow a little more with its size (HP ×(0.4 + 0.6 n) instead of 0.55 + 0.45 n):
    solo Lv4 knight vs the Frog King 42 s (1 nap), 4 heroes Lv4-6 vs the Magma Golem 32 s,
    8 heroes vs the Sand Queen 36 s (0 naps; bots never dodge, people take longer).
    8-player boss fight: 2.8 ms/frame.
  - Music: two new tracks in `tracks_world.js` — `battle` (D minor, 132 bpm, gloom
    invasions) and `race` (F major gallop, 152 bpm); the Grumblecloud now fights to the
    `boss` track (it used the festival tune). Both validate with 0 errors (16 bars each).
- **M8 part 2 — polish, docs** (commits "Party v3 M8: …").
  - Phones: a phone turned away ("Party full") is remembered and asked again when a seat frees
    up; joining resets the phone's screen (the "full" card no longer lingers).
  - `render/seethrough.js`: tree crowns (valley & big world: leaves, pines, palms, mushroom
    caps) dither away in front of heroes and gloom creatures — the party fills screen spots
    per view; empty in solo, so nothing changes there. 8 players / 4 forest views: 8.0 ms.
  - World map: marks persist once their part of the map is explored; place names get a
    backing, stay in the frame and step off the marks; the legend carries the progress
    (waystones 3/16, chests 0/8, races 0/5, camps 2/20, lairs 3/4, nests 0/10) and the top
    line the lands found.
  - A is for fighting when gloom is awake within 7 tiles (no accidental chats, trips or races
    mid-fight); no race while an invasion is being fought.
  - README: the Party Mode section rewritten for v3 (phones, host, camera, the world, getting
    around, fighting, what to play) with 10 new screenshots (`docs/screenshots/party_*.png`:
    world map, 4-way split, 8 heroes vs the Sand Queen, the Festival Ring, mounts, vehicles,
    a plates puzzle, a race, an invasion, four phone screens).
  - Travellers now wish for one of the animals' treats (Finn an acorn, Mabel a honeycomb,
    Juniper a juicy bug, Marlo some kelp): pick it up out in the wild, A = "Give" → a rare
    present (rare-or-better gear) + 40 stardust, hearts, a banner. Half their chats hint at it.
  - The objective card's place line updates while the card is out (it showed the valley's
    name for a few seconds after arriving somewhere else).
  - Regression: Starfall Festival autoplay with 4 bots (5 games, awards, back to the lobby),
    waves / brawl / king of the ring, solo game: 0 errors.
  - Explore in the wild lands: outside the valley the objective card reads "Wild lands: camps
    a/b · guardians c/d · secrets e/f", the phones' hint points to the wild content, and each
    view's arrow leads to the nearest thing still to do within 90 tiles (an uncleared camp, a
    sleeping guardian, a sealed chest, an unattuned waystone, an unrun race) instead of the
    valley's nests.
  - `tools/devserver.py`: logging an error (a 404 for favicon.ico) crashed the request handler
    (`HTTPStatus` isn't a string) — fixed.

## Final status (end of the night)

All eight milestones done, each tested with bots (1 / 2 / 3 / 4 / 8), captured, committed and
pushed. `window.__errs` stayed empty through every test; `node tools/i18n-scan.mjs` → 1464 / 1464.
Solo game checked after each milestone (unchanged). 8 players in 4 views: 8–10 ms/frame.

| Part | Score | Main limits |
|---|---|---|
| M1 host phone & zoom | 9/10 | five tabs are dense on a small portrait phone |
| M2 big-world engine | 9/10 | a long jump shows painted previews for a moment; chunk cache is an LRU of 80 |
| M3 zones & biomes | 9/10 | landmarks are simple (charming) box models; zone borders are Voronoi-ish |
| M4 swimming & vehicles | 9/10 | boats don't collide with each other |
| M5 mounts & taming | 9/10 | mounts stay out of the arena and the story |
| M6 combat depth | 9/10 | balance measured with bots (who never dodge), not with people |
| M7 zone content | 9/10 | two puzzle kinds; the Starfall story stays in the valley |
| M8 polish & docs | 9/10 | no 8-human playtest on a real TV yet |

Ideas: traveller quest chains, dungeon interiors (the mine, the sand temple), boss rematches with
modifiers, mount races, seasonal world events, a photo mode, sharing the world save between
host machines.

