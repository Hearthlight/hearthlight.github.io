# Solo v2 — progress log

Plan: `docs/plans/solo-v2.md`. Read this first after a context reset.

## Log

- **S1 — the wild lands open in solo** (commit "Solo v2 S1").
  - `src/solo/wild.js`: `Wild`, a "party of one" standing in for the Party object that the
    party systems use (players = the solo hero, a `SoloInput` over the game's input, a
    `SoloView` for the one camera, toasts/banners → the solo HUD, saves → `state.wild`,
    profile → `state.hero`). It owns a `BigWorld` attached for the whole solo session
    (`World.enter` → `wild.start()`, `game.toTitle` → `wild.stop()`), streams the ground
    around the camera (`wild.stream` after `updateCamera`), runs the zones (music, ambience,
    weather, first-visit banners — banners on every arrival in solo), and the see-through
    crowns for the hero. Generation ~150 ms at game start.
  - `World`: camera bounds = the world; valley areas & fog only in the valley; wild-lands
    music & ambience (`wild.mood()`); ice + glacier; big-world footsteps; the camera shakes
    with `wild.cam.shake`; landmarks' lamps come back after a room (`wild.relight`, POIs keep
    their `lights`).
  - HUD: out in the wild the minimap is the world map (with the systems' marks); the Map
    tab cycles valley → closer → **the whole world** (opens on the world when you're out in
    it); the valley's explored fog is copied onto the world map at start.
  - Refactors (Party Mode unchanged): `party.exploring()`, `party.loadSave/writeSave`
    (same localStorage keys in Party Mode, `state.wild` in solo, the fog too), the explore
    act's chests → `src/party/chests.js`, the world map drawing → `src/party/worldmap.js`
    (`drawWorldMap`, `drawWorldPanel`), `BigCollision.bridge` (the valley's bridge is
    walkable once mended — in Party Mode too).
  - Input: `special` (F / pad X) and `dodge` (C / pad Y); the solo gamepad's menu is Start
    and the map Select (X/Y now fight like in Party Mode); bike on L3.
  - Tests: new game (intro), the steppe (7.3 ms/frame), save → title → continue out in the
    steppe, the world map page; Party Mode explore + a camp + its chest + the big map: 0 errors.
- **S2 — swimming, vehicles & mounts in solo** (commit "Solo v2 S2").
  - `Wild`: Swim (dive spots refill every morning, finds go in the bag: new items Pearl &
    Sunken Relic), Vehicles (the pier's boats stay away from Marlo's ferry), Mounts (the
    profile's mounts live in `state.hero.mounts`). `wild.update` (inputs, boarding, mounts,
    vehicles) runs before the hero moves, `wild.movePlayer` moves them while swimming /
    riding / boating, `wild.afterMove` after. `SoloInput.edges.delete` also consumes the
    solo game's action (no jump after a dive…).
  - World: no bike / tools while riding, swimming or boating; the valley's doors & chats
    wait until you're back on land; the pet waits on the shore and runs back to you.
  - Controls shown the solo way: an action strip above the hotbar ("[E] Row [Espace] Get
    out [F] Dash [C] Get off") + the hint when it doesn't name phone buttons (a few say it
    the solo way: `SOLO_HINTS`); banners that name buttons use `{a}`/`{y}` filled by
    `party.keyName()` (letters in Party Mode, the keys in solo). Touch: the buttons say
    what they do, X & Y appear when useful. Near a boat while swimming, A = Board (Party
    Mode's phones too).
  - Tests: swim & dive at the pier, row on Willow Lake, a boar tamed with the keyboard
    meter, whistle / ride / dash / get off a stag in the village, a glider over Deep
    Whisperwood: 0 errors.
- **S3 — fights & the hero in solo** (commit "Solo v2 S3").
  - `Wild`: Combat (one fighter: the hero), gloom camps (`Encounters`), guardians
    (`Lairs`), `Progress` (talents, gear, stardust in `state.hero`), a `Chests` helper
    (gear + stardust + a treat + coins). The `act` facade (`dropChest`, `stat`) and `host`
    (difficulty from the new *Adventure difficulty* setting, `settings.adventure`) stand in
    for Party Mode's. The hero is **armed** out in the wild lands (and when gloom is close):
    E attacks (hold: heavy), F special, C dodge; back in the valley the tools come back.
    Chests & fights take E over petting the pet; gloom close by → you hop off the bike.
  - Out of a fight the hero heals slowly (fast indoors / in the valley); indoors the camps
    & guardians settle down (`calm`). The gloom never follows you deep into the valley
    (`guardValley`). Knocked out → a **nap**: fade, wake at the nearest attuned waystone (S4)
    or the Market Plaza, full health. A freed gloomy deer → a stag mount.
  - First steps out of the valley (`flags.wildIntro`): the narrator warns about the gloom
    and asks how you'd like to fight (the four heroes), then says the keys.
  - HUD: a hero panel under the clock (class icon, health, special gauge, level) out in the
    wild or while hurt; the combo counter goes under the quest tracker (`combat.comboY`);
    boss bar, boss / battle / race music (`wild.fightTrack`).
  - Menu: a **Hero** page (`src/solo/herotab.js`, key H): hero class (switch, not mid-fight),
    level/xp/health/strength, talents (learn / reset), gear (wear, upgrade, melt), mounts
    (which one comes when you whistle; hints for the untamed ones). Keyboard, gamepad,
    mouse & touch: every control is an item, the arrows jump to the nearest one, F / C
    turn the pages. Shared icons: `drawGearIcon`, `drawMountIcon`, scalable `drawClassIcon`
    (`src/combat/icons.js`; the phone uses the gear icon too).
  - Tests: intro & hero pick, a steppe camp as mage and knight (level 2, chest → a charm,
    coins, stardust), the Frog King at level 2 (knocked out → nap at the plaza), the Hero
    page (talents learned with the keyboard, mounts), settings; Party Mode explore camp
    with 4 bots: 0 errors, i18n 0 missing.
- **S4 — the wild lands' content in solo** (commit "Solo v2 S4").
  - `Wild` runs Party Mode's `Travel` (waystones: attune by walking up, E → "Where to?" in
    the dialogue box; naps now wake you at the nearest attuned stone), `Secrets` (plates,
    chimes, buried treasure), `Races` (solo: record & target time), `Events` (invasions,
    migrations, shooting stars — only out in the wild lands: `P.eventsAllowed`), and the
    **Festival Ring** (`ArenaSite` built in solo; the gong → Party Mode's `ArenaAct` in
    "waves" mode, Hollis announcing, blessings picked in the dialogue box, then back by the
    gong with coins — a golden chest for all ten waves).
  - Party API added to `Wild`: `spawnNpc/removeNpc` (models cached), `ask` (dialogue choice,
    Esc = the last option), `say`, `gatherAt`, `busy` setter, `topCard`, `anyPressed`,
    `startCombat/stopCombat` (a fresh fight for the ring, the solo one back after),
    `act`/`facade` (`exploring()` is false while the ring's act runs).
  - **Wanderers** (`src/solo/wanderers.js`): Rook (Red Canyon), Sigrid (Frostpeak Glacier),
    Moss (Bouncecap Woods), Kai (Coral Lagoon) — new visitor NPCs with portraits, a hello, tips
    and a wished-for treat (a rare present + 40 stardust, remembered in `state.wild.gifts`);
    Pim trades mystery gear for 80 ★ at the Nomad Camp except on Sundays (he's at the market).
  - A (E) near a chest, a secret, a race arch, a wanderer, a waystone or the gong does that
    (`nearThing`); the chips say so. Race/event cards under the place banners; race arrows.
  - Party-safe tweaks: `P.travelerList`, "Travel where?" / race start toast in solo, the
    ring's `won`, "{a} to continue", and **the Festival Ring's stands thin out in front of
    whoever's behind them** (the gong was hidden behind the announcer's box — both modes).
  - Tests: attune + travel Nomad Camp → Market Plaza, Rook's hello, Pim's trade, a dig + its
    golden chest, the Steppe Sprint (record), an invasion at Canyon Gate, the ring (3 waves,
    blessings, results, back by the gong with coins), save → title → continue; Party Mode
    waves + explore travellers: 0 errors, i18n 0 missing.
- **S5 — the phone as the solo controller** (commit "Solo v2 S5").
  - `src/solo/phone.js` (`game.phone`): Settings → **Play with your phone** opens a panel with
    a QR code, the address and the room code (Party Mode's `PartyNet` on the dev server's
    relay; "needs tools/devserver.py" otherwise). One phone at a time; it plays alongside the
    keyboard / gamepad / touch screen. Stopped when Party Mode starts (it hosts its own room).
  - `engine/input.js`: `input.remote` — the phone's stick (walk, run when pushed far, menu
    directions) and actions (A interact, B jump + cancel, X special, Y dodge, and taps for
    menu / map / journal / hero / hotbar ◀ ▶ / bike). A tap always lasts a frame.
    `input.padLike` (gamepad or phone → prompts say A/B/X/Y).
  - The big screen sends the phone what its buttons do (`ctx`: mode play / menu / talk / wait
    / title, A/B/X/Y labels from the valley's focus or the wild lands, the hint, health, level,
    the special's recharge, what you hold) and the player's portrait; the hero becomes a
    `phone` player for Party Mode's systems (`Wild.net` → the phone): taming on the phone,
    Talents / Gear / My mounts / Change hero screens, buzzes.
  - `pad.js`: a **solo layout** (phase `solo`): portrait card with health & hint, Bag · Map ·
    Journal · Hero, the hotbar (◀ item ▶), stick + A/B/X/Y (`drawControls`, shared with Party
    Mode's pad); in menus ← Tab · Tab → · Close; its own menu (talents, gear, mounts, hero,
    bicycle, stop). Settings rows squeeze a little when there are many.
  - Tests: QR panel, a pad joining (auto-close, toast), B closes a menu, the stick walks &
    runs, Hero page opened & a class picked from the phone, fight labels + health on the
    phone, a boar tamed with the phone's meter, the phone's menu; every pad layout draws
    (lobby, adventure, solo modes): 0 errors, i18n 0 missing.
- **Party Mode fixes from the user's test** (commit "Party Mode: fix the crowned phone…").
  - The host's phone froze (a `zoneY` lost in the S5 pad refactor threw every frame, and a
    throw stopped the pad's loop): fixed, and the pad now survives any drawing error
    (`drawScreen` in a try, `pad.S.drawError`).
  - The crowned phone **starts the party** (big Start button with who's ready; the lobby's
    status line says who starts); the countdown only runs when no phone wears the crown.
  - **Get unstuck**: phone menu (Party & solo), solo Settings, host menu (everyone who's
    really stuck). `findUnstuck` / `stuckAt` in `world/collision.js`: stuck inside something or
    in a pocket → the nearest roomy open ground; seemingly free → the nearest waystone
    (indoors: the door).
- **S6 — polish, README, regression** (commit "Solo v2 S6").
  - Chips keep out of the toasts' way; the phone always shows the special (filling while it
    recharges) and a fight hint; no crown on the pad in solo; solo wording in the ring.
  - README: "The wild lands (solo)" section with six screenshots and the phones strip,
    controls (F / C / H, gamepad X / Y / Start / Select / L3, phone, Get unstuck), host start,
    project layout; CLAUDE.md: the shared-systems rule, `src/solo/`, testing notes.
  - Regression: Party story `T.autoplay()` with 4 bots (host start → vote → all five games →
    awards → lobby), 8 bots exploring + a camp (7.5 ms/frame), a real host pad (lobby, start,
    unstuck, menus); solo: hero pick, camp, Hero page, map, save → title → continue, the
    first story days (intro → neighbours → sleep → town hall), 2.5–3 ms/frame: 0 errors,
    i18n 0 missing.
- **Swimming everywhere & the map on the phone** (user feedback: water only reachable by
  falling off a pier; a phone button to see the whole map).
  - Walking players (solo & Party) move with the swimmers' collision: any water can be waded
    into from any shore (you start swimming where the water begins) and left the same way;
    mounts keep their own rules (turtles swim), villagers, pets & gloom still stop at shores.
  - The world map's fog is a thin veil now: the shape of the whole world shows through,
    faintly (big map, menu map, minimaps) — explored lands stay bright.
  - Phones: a **Map** button (Party: in the header; solo: the Map button opens the big
    screen's map on the whole world) and a **World map** screen on the phone itself, drawn by
    the big screen at the phone's own pixel size (`mapImage` in `party/worldmap.js`,
    `{t:'mapReq', w, h, near}` → `{t:'map', src}`), refreshed while open: the whole world, or
    **near me** (two pixels a tile around you, names of the lands).
