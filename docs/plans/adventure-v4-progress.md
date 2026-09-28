# Adventure v4 — progress log

Plan: `docs/plans/adventure-v4.md`. Read this first after a context reset.

- **A1 — every mount swims** (commit "Every mount swims"). Stags, boars, hens, bears and
  frogs paddle (their own swim speeds, sunk to the right depth, splashes); the turtle is
  still the fastest in the water.
- **A2 — illustrated abilities & the action bar** (commit "Adventure v4 A2").
  - `src/combat/v4/icons.js`: 61 procedural glyphs (weapons, elements, spells, notes…) drawn
    with canvas shapes on 16×16, snapped to pixels, outlined, in a frame coloured by school
    (phys, fire, frost, nature, arcane, holy, shadow, storm, song): `drawIcon` (18×18 × s,
    cooldown wipe, dim, glow, rank pips) and `roundIcon` (a round badge for the phone).
  - Every class names its moves' icons (`cls.icons`: light, heavy, special, air), the dodge
    `DODGE_ICON`, mounts their attack & ability (`MOUNTS[k].attack.icon / ability.icon`).
  - Solo, out in the wild: a WoW-like action bar above the chips (attack, heavy, special with
    its cooldown wipe, dodge) with the keys; the chips no longer repeat those actions.
  - The phone (Party Mode & solo): `ctx.ic` = the icons of A / X / Y (`padIcons`); the pad
    draws round illustrated buttons (the letter in a corner badge, a dark wipe while the
    special recharges). X is hidden during votes and chats.
  - Tests: pad rendering (knight, mage on cooldown, a stag ridden), Party explore camp with
    a bot (ctx carries the icons), the solo steppe camp as mage (action bar): 0 errors,
    i18n 0 missing.
- **Fix: the Cloud Isles couldn't be reached** (commit "Balloon Station…"). The Balloon
  Station (its dock and waystone) stood in the sky past the glacier's edge (the warped
  Voronoi gives that corner to the cloud zone) and the arrival dock opened onto the void.
  Now: a snowy spur carries the station (`gen.js`, over sky tiles only), the road ends at the
  dock's open side, the arrival dock sits inside Cloud Harbour's isle. An empty balloon flies
  to whoever waits on the other dock ("The balloon is on its way!"). Solo: a boat, the
  balloon or your mount within reach takes E before the pet's cuddle (`wild.busyHands`,
  `mounts.wantsA`). The camera looks up with you in a balloon or a glider (solo & split
  views). Checked with a reachability BFS over every point of interest (only the isles'
  own places need the balloon), then solo & Party Mode flights: 0 errors.
- **A2b — Party Mode: the clock, campfires & sleeping through the night** (commit "Adventure
  v4 A2b").
  - The clock on the big screen (top right, like the solo HUD: the sky, the day, the time;
    `weatherIcon`, `dayLabel`, `timeLabel` from `ui/hud.js`); the explore act's clock turns
    the day at midnight; the objective card uses the same time format.
  - `src/party/camp.js` (`Campfires`): anyone lights a fire in free roam — the phone's
    Campfire button (evening & night, beside Map), the phone menu, or the host menu (by the
    crowned player). It grows in, crackles, lights the night (a lamp in the light pool),
    warms & heals (4 %/s out of a fight), players who stand still sit down facing it; up to
    4 fires, 6 minutes each, then embers & smoke.
  - At night (19:30–6:00) A by a fire = Sleep (moon icon; lying down, eyes closed, zzz);
    A / B / the stick = Wake up. A card shows who's still awake. When everyone is asleep by a
    fire (each group by its own) the night flies by: fade, "The night flies by…", 6:36 the
    next day, full health, the fires burnt down, "Good morning!". Gloom within 7 tiles wakes
    everyone. Another activity or the lobby puts the fires out.
  - Tests: 2 bots (fire from the phone, sleep 1/2 then 2/2, night → day 4, healed), 4 bots
    (host-menu fire, sitting, gloom wakes the sleepers), phone screens (Campfire pill, Sleep,
    Wake up, menu), solo smoke: 0 errors, i18n 0 missing.
- **A3 — spectacle** (commit "Adventure v4 A3").
  - `src/combat/v4/vfx.js` (`Vfx`, one per `Combat`): slash crescents that sweep with each
    swing (a dark rim, a white core, the class/element colour), shockwaves (ring, thin ring,
    a rising wall), cartoon explosions (outlined lumps going white-hot → colour → smoke, with
    a ramp per element: `BLASTS`), lightning (jagged, flickering, forking, chaining), ice
    spikes that shatter, fire columns, pillars of light (additive: light glows), whirlwinds,
    meteors with continuous trails, projectile trails, hit stars & sparks, crits (rays),
    poofs, scorch marks and short-lived lights in the lamp pool. Small bits share one
    `InstancedMesh` per kind (embers, glows, shards, rocks, puffs, ice); big shapes are pooled.
  - The 3/4 camera draws spheres as eggs: balls are squashed (`FLAT`); effects read on the
    sunny steppe thanks to cel colours with dark rims (additive only for light & flashes).
  - Wired into `combat.js` (swings, blasts, specials: whirlwind, starfall meteors, volley,
    hearth song pillars; level ups, revives, parries, finishers, kills, spawns, projectile
    trails & impacts, the sky's bolts), `status.js` (freeze, shatter, chains, burning,
    poison, chill) and the bosses' & creatures' big moves (`bosses.js`, `bestiary.js`).
  - Tests: an effect bench (day & night), 4 heroes vs a camp, each special & heavy up close,
    the Frost Colossus with 4 bots, a solo camp: 0 errors.
- **A4 — talent trees v4 & ultimates** (commit "Adventure v4 A4").
  - `src/combat/v4/talents.js` (replaces v3's): 4 heroes × 3 specialisations × 5 rows —
    96 talents with ranks (3/3/2/2/1/1/2 + the capstone), rows opening at 0/3/6/9/11 points
    in their branch, 15 points a branch, level cap 30 (29 points). Picks are `{ id: rank }`;
    v3's lists are refunded (`migrateTalents`, a toast). Every talent has an icon.
  - New mechanics (mods in `blessings.freshMods`): shields on the special / from Hearth Song
    (a bubble), Last Stand, crit damage (`critMul`), Arcane Surge, Showstopper (kills
    recharge), Kindling (burn), Frostbite, Deep Freeze, Shatter, Combustion, Pyromaniac
    (faster charge), Blink, Caltrops (a slowing patch), Adrenaline, Evasion, War Drums
    (aura), Toxic Cloud (poison stacks), Aftershock (echo ring), pull strength, burn time.
  - 12 ultimates (combat.js `ultimate` / `tickUlt`), a gauge filled by hits, kills and hits
    taken (not by the ultimate itself): Bulwark (a dome), Tempest (storm spin + lightning),
    Earthshaker (three quake rings), Meteor Storm, Absolute Zero (a forest of ice), Arcane
    Barrage, Deadeye, Carpet Bomb, Shadow Dash, Hymn of the Hearth, Symphony, Encore.
    The ULT button: phone U (a round button filling up, glowing when ready), G / R3, solo
    action bar slot; inputs carry `u`/`ult` (party inputs, solo keys & pad, solo phone).
  - UI: the phone's talent screen (branch tabs with points, the 5-row tree with icons,
    ranks, connectors, locked rows, current & next rank, Learn / Rank up; portrait &
    landscape), the solo Hero page (the three trees side by side, same details).
  - FR: `src/lang/fr/talents4.js` (the scanner now reads `src/combat/v4/` & `camp.js`).
  - Tests: 4 bots at level 30 spending 29 points by phone messages, all 12 ultimates
    captured, a camp fight (gauges fill), the phone screens, the solo Hero page: 0 errors,
    i18n 0 missing.
- **A5 — weapons** (commit "Adventure v4 A5").
  - `src/combat/v4/weapons.js`: 16 kinds, four per hero, each with its model (12 new props
    in `chars.js` setProp) and moves: Knight pan / rolling pin (4-hit) / mallet (quake on
    the 3rd blow, echoing heavy) / wooden sword (reach, lunge, twirl); Mage wand / staff
    (piercing orbs, Sunorb) / crystal orb (chaining sparks, ball lightning) / spellbook
    (fans, a spiral of 8); Ranger slingshot / bow (piercing shot) / boomerang (comes back)
    / blowpipe (venom darts, a toxic cloud); Bard lute / drum (beats around you) / flute
    (far, piercing) / harp (homing arpeggio). New shot looks: arrow, dart, boomerang, orb,
    zap, page (with their trails).
  - Items: Common (Ordinaire) / Rare / Epic / Legendary, an item level, 1–2 traits (10:
    blazing, frost, storm, venom, vampiric, swift, mighty, giant, echo, lucky), 8 named
    legendaries with unique effects (Rosa's Cast Iron heals, Thundermallet lightning,
    Suntail orbs burst, the Moonlit Tome's full moons, Galewing splitting arrows,
    Homecoming boomerangs, Heart of the Hearth scorching song, Thunderdrum).
  - Each hero class keeps its own weapon (`gear.weapons[cls]`); chests drop weapons (35–45 %,
    legendaries 2.5–15 %); bag 16. Gear helpers (`itemBorder`, `itemTag`, `meltValue`,
    `isWorn`, `weaponLines`) drive the phone's Gear screen (a Weapon slot, rarity frames,
    traits, legendary effect, "For the Knight") and the solo Hero page's Gear tab.
  - FR: `src/lang/fr/weapons4.js` (rarities & traits as invariable words).
  - Tests: 4 bots through all 12 new weapons (models, fights, heavies): 0 errors; phone &
    solo gear screens; solo loot.
- **A6 — buildings you can enter** (commit "Adventure v4 A6").
  - Wild rooms (`src/world/wildrooms.js`, joining `INTERIORS`): Nomad Yurt, Snug Igloo,
    Heights Windmill, The Mother Cap, Stilt House, Hot Spring Bathhouse, The Old Mine (dark),
    Camp Tent — each with a bed and a chest. `DOORS` says where each landmark's door is (the
    mine's stand point sits clear of the canyon's cliff face, the camp's clear of the crate).
  - Solo: walk up into a landmark's door (or E) to go in, out by the same door
    (`state.roomExit`); a bed sleeps till morning (saved, you wake up outside); the chest has
    something new every day (coins, stardust, gear). Campfires come to solo too (`Campfires`
    with a `sleepHere` hook: the night passes like at home, you wake by the fire).
  - Party Mode (`src/party/rooms.js`): all 14 valley buildings and the landmarks open. Each
    room is built on first entry far east of the map (x ≥ 1400, a 4-wide grid of slots,
    cached on `r3d` for the next party); `BigCollision` hands anything past x = 1000 to the
    room's own `Collision`; `SplitCam.aimAt` frames a room (`aimRoom`, centred / followed like
    the solo game, the split's offset carried over) and cuts instead of gliding on a jump; the
    auto zoom comes in close (up to normal + 2) when everyone is in one room. Lighting per
    view: `Rooms.light(v)` runs `updateIndoor` with the room's lamps in the pool, and when some
    views are outdoors the room's lights make up for the outdoors' colour grade (the post pass
    is shared); the outdoors is restored for their views. No ambient dots or zone weather in a
    room's view; room music & a quiet ambience when the first view is inside.
  - Inside: you heal 5 %/s, the gloom can't target you (`p.indoors`), no whistling mounts or
    campfires indoors; keepers at their counters (Rosa, Ivy, Sol, Mabel, Theo, Finn, Wren, Bram,
    Marlo, Hollis — unless they're already out) with two lines each; each chest gives each
    player gear + stardust + XP once a day; beds are sleeping spots for `Campfires`
    (`rest()` = a fire or a bed: you lie tucked in, and get up beside it). Out by walking down
    onto the mat (or A: Leave). Door names float over doors someone stands by; the room's name
    shows under its doorstep on entry; maps & the minimap put you at your door; `unstick`
    walks you out. Rooms close (everyone out) when free roam ends.
  - FR in `adventure.js`. Tests: 1 bot (bakery keeper chat, yurt chest ×2, bed at night → the
    night flies by, day 4), 2 bots split at night (warm room vs night outside), 4 bots in a
    grid (yurt, bakery, dark mine, dusk outside), 8 bots (4 rooms + outside: 10.2 ms/frame vs
    13.0 for five outdoor views), every door reachable, story autoplay (4 bots) to the awards,
    solo mine & yurt: 0 errors, i18n 0 missing.
- **A7 — polish** (commits "Rooms: a room's panel…", "Adventure v4 A7").
  - A room's panel beside others renders at 2× pixels per tile (integer, crisp) when the
    room fits it (`View.ppu`, used by `aimCamera`, the shadow frustum & see-through spots).
  - Big shouts (ultimate names, finishers, "LEVEL UP!") step out of each other's way; the
    solo Hero page shows a talent's full description (9 lines).
  - French: single-player hints use « tu » (sealed chest, a waystone to defend, shooting
    star, sandstorm & squall in solo via `EVENTS[k].solo` / `P.solo`).
  - README pictures: party_rooms, party_camp, party_ultimate, party_bakery (new);
    party_phones (icons, U, talents v4, gear with a legendary), solo_hero (three trees),
    solo_fight (the action bar) replaced.
  - Regressions: story autoplay (4 bots) to the awards, Festival Ring waves (4 bots + a
    real phone), rooms with 1/2/4/8 bots, solo new game → wild lands → mine & yurt: 0 errors,
    i18n 0 missing.
