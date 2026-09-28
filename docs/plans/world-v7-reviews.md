# World v7 — chapter reviews (the designer's eye)

The player asked (M6): after every chapter, an honest quality review — is the story varied,
funny **and** intense enough? Are the puzzles and fights repetitive? Would a game designer give
it 9/10? Is the whole coherent? Each review ends with concrete fixes, done before the next
chapter. Scores are what a demanding designer would give, not what the code does.

## Checklist (every chapter)
1. **Story**: a clear goal, a twist or a surprise, one sincere or tense beat (not only jokes),
   the villain's presence felt (escalating), a seed for a later reveal, a hook.
2. **Dialogue**: every character has a voice of their own (vocabulary, rhythm, a verbal
   habit); no joke structure used twice in the chapter; punchlines that land in both English
   and French.
3. **Quests**: at least three different verbs among main and side quests (not only « clear a
   camp / collect 3 / go to 3 spots »); one side quest with a real mechanic (a timer, a
   sequence, a choice, an escort…).
4. **Dungeon**: one signature mechanic nobody else has, used in two or three rooms and
   escalating; at most one room reused from an earlier dungeon's template.
5. **Bosses**: one mechanic that is theirs (a window to punish, a thing to use in the arena),
   telegraphs readable, phases that change the fight.
6. **Coherence**: names, geography, timeline and the Duchess's plan still add up.

## Review 1 — chapters 1 to 4 (2026-09-28, after M6)

### What works
- The spine holds: the Duchess snuffs the Great Hearths, each land's flame comes back to the
  lantern, the Murk rolls back — easy to follow in solo and in Party.
- Recurring cast with running gags that land: Crumble (the kite, stuck in a cloud, the tiny
  umbrella), the Understudies (the collapsing pose, the Human Cannonball, « union rules »),
  Perkins « slightly off », Hollis's tea.
- Set pieces: the Gloomstage over the cove, Barkbeard rising, the ore cart chase, the balloon,
  the Frost Tenor's high C (hide behind the pillars) — the best boss idea so far.
- Places: the outdoor instances (the Rootway's valley, the quarry, the glacier pass) look like
  real places; Dusty Gulch and the Festival Ring feel lived in.

### What a designer would mark down
- **Structure fatigue (story 7.5)**: every chapter is the same template — arrive, meet two
  quirky locals, clear two camps, collect three things, a scene, the dungeon, relight, the Murk
  rolls back, Hollis's tea, a letter as the hook. By chapter 4 you can predict every beat.
- **The villain is off stage (coherence 7.5)**: the Duchess appears in chapter 1, then only
  through henchmen. Nothing escalates; nothing is at risk; her backstory (the booed debut, the
  hen) isn't seeded yet.
- **Too cosy, not enough intensity (6.5)**: almost every scene is a joke. No setback, no one in
  danger, no quiet sincere moment after Barkbeard.
- **One comic voice for everyone (dialogue 7.5)**: many characters share the same cadence —
  a statement, then a deflating afterthought (« …Probably. », « Mostly the Duchess. »).
  « Mind the … » appears ten times across the chapters; « a very … » thirteen.
- **Reskinned puzzle rooms (dungeons 6)**: the Rootway, the Old Mine and the Frostbell Halls
  run the same sequence — a fight, « hold three plates », « light three braziers in the order
  shown » (the answer is printed on screen), things rolling down lanes (logs, carts,
  snowballs), things falling on marked spots (wax, dynamite, icicles), a mini-boss, a boss.
  Only the art changes.
- **Quest verbs (6.5)**: « clear the camp / collect three / go to three spots » make up most
  steps; the sled race has no clock, the choir has no singing.
- **Bosses (8)**: well telegraphed but built from the same kit (a line charge, a circle burst,
  rings to jump, adds from phase 2, an exposed window). The Human Cannonball and the high C
  stand out; Barkbeard, Grumbleclaw and the Drillosaur blur together.

### Scores (honest)
story 7.5 · dialogue 7.5 · intensity 6.5 · quest variety 6.5 · dungeon puzzles 6 ·
bosses 8 · set pieces 8.5 · places 9 · coherence 7.5 → **overall 7.5**. Not yet 9.

### Fixes (the M6 quality pass, before chapter 5)
1. **Dialogue pass**: kill the tics (« Mind the… », the « …Probably. » afterthought) and give
   each character a verbal habit: Tuya speaks in steppe proverbs, Dolly in terse lists of
   rules, Hazel in footnotes, Croakington in the royal « we », Tobi in boasts, Nimbus in
   koans, Wendy in sailor's slang, Grubb like a site foreman.
2. **The Duchess on stage, escalating**: chapter 3 — she scolds the Understudies after their
   act through a « Gloomophone » (a gramophone horn), mangles the heroes' name (« the Wick
   Brigade »), threatens the next Hearth; chapter 4 — she leans off the Gloomstage's balcony
   as it passes over the glacier and taunts the heroes; Wendy's airship is « in the shop »
   because the Gloomstage rammed it (a stake, and why Wendy joins the fight in chapter 6).
3. **Seeds and one sincere beat per chapter**: Old Boom was at the Starfall Festival thirty
   years ago, the night a young soprano was booed off the stage because of a hen — « Folk
   laughed. I laughed. Wasn't kind of us. » (the first seed of the Duchess's past).
4. **A signature mechanic per dungeon**, replacing reskinned rooms:
   - the Old Mine — **rail points**: three levers switch the points of a small rail network
     drawn on the ground; send the ore cart and route it into the barricade (a logic puzzle);
   - the Frostbell Halls — **the singing bells** (the Tenor's theme): the frost bells play a
     melody, the heroes ring them back in the same order, longer each round (a memory puzzle);
     and **thin ice**: a frozen river where the cracked slabs give way under you — find the
     path of thick ice;
   - (the Rootway keeps its glowworms and its log slide; the rolling and falling rooms now
     appear twice each at most).
5. **Quest verbs**: a real race with a clock for Tobi (three flags, a countdown, « Too slow! »
   and try again) — a new `race` step reusable by later chapters.
6. From chapter 5 on: vary the chapter's structure (start in the middle of the action, a
   setback, a chapter without a camp), a signature dungeon mechanic designed first, one boss
   mechanic nobody else has.

### After the quality pass (M6b, 2026-09-28)
What changed, checked in the game (screenshots `m6b_*`):
- **Dialogue**: the tics are thinned out (« Mind the… » from ten to two — each a different
  joke: Grubb playing train conductor, Wendy's « the gap is the sky » —, the « …Probably. »
  afterthought to two, « a very large… » to one); every character has a habit of their own — Tuya's proverbs, Dolly's numbered
  rules, Hazel's footnotes, the king's royal « we », Tobi's boasts (« I did it in FIVE. With
  my eyes shut. Backwards. »), Nimbus's koans, Wendy's sailor slang, Grubb the foreman.
- **The Duchess on stage, escalating**: chapter 3 — after the Human Cannonball flops, a brass
  **Gloomophone** rises from a trapdoor in the stage and blares purple notes: she scolds the
  Understudies, calls the heroes « the Wick Brigade », promises to snuff every Hearth they
  light; chapter 4 — the Gloomstage sails in over Frostpeak Camp and *stops*, the camera
  climbs to its balcony, she taunts the heroes in the snow and invites them to the Frostbell
  Halls; Wendy's airship is « in the shop » because the Gloomstage rammed it (her stake).
- **Seeds and sincere beats**: Old Boom was at the Starfall Festival thirty years ago, the
  night a young soprano was booed off because of a hen (« Folk laughed. I laughed. Wasn't
  kind of us. »); the Frost Tenor, melting: « Have a little pity for Gloria… Nobody ever
  stayed… for her finale… » — the first time anyone says her name kindly.
- **Signature dungeon mechanics** (new room kinds in `dungeon.js`):
  - the Old Mine — **rail points**, twice and escalating: three levers and a big red button
    (route the ore cart into the barricade; the wrong points send it into a siding with a
    buffer stop), then the crystal cut's **wired levers** — each lever flips every set of
    points that wears its colour (red, blue, green posts): only one combination of the three
    works;
  - the Frostbell Halls — **the singing bells** (listen, ring the tune back; 3, 4 then 5
    notes; a sour note replays it) and **thin ice** (clear blue slabs crack and dunk you back
    on the bank; every 9 s a gust sweeps snow over the river and every slab looks the same —
    remember the way). The same verb twice: *remember*.
- **Quest verbs**: the `race` step (a clock that runs every frame, flags in order, « Too
  slow! » and back to the top) — Tobi's Downhill Dash is now a real sled race down the
  Glacier Run (10 s; a clean run takes 6, running on foot takes 11.5); the choir's frogs are
  found **by ear** (no marker on them: they hum, notes rise from the reeds).
- Found and fixed on the way: long toasts wrap and stay long enough to read (a puzzle room's
  rules were cut off after 3 s); the camps no longer sit on the sled runs; the ramp sleds
  spawned inside their ramp's collider and could never slide; a gust or a lever out on the
  room's edge now counts (the room's inner bounds stopped a tile short); floating numbers and
  barks fade during scenes (they froze over the Gloomophone scene).

Scores after the pass (honest): story 8.5 · dialogue 8.5 · intensity 7.5 · quest variety 8 ·
dungeon puzzles 8.5 · bosses 8 · set pieces 9 · places 9 · coherence 8.5 → **overall 8.4**.

Still short of 9 — carried forward, with a plan:
- **Structure** (chapters 1–4 share one template): chapter 5 opens in the middle of the
  action and has a real **setback** (the Duchess takes something back); chapters 6+ each
  change the shape (a chapter without a camp, a chapter in one town, a chase).
- **Chapters 1–2's dungeons** still run the old templates (plates, torches, logs, wax): the
  polish milestone (M14) gives the Grotto and the Rootway a signature mechanic each (the
  lighthouse's beam to aim with mirrors; the Rootway's roots that grow where the glowworms
  shine).
- **Bosses** (Barkbeard, Grumbleclaw and the Drillosaur blur): each gets one thing that is
  theirs in M14 (Barkbeard's acorns to throw back into his mouth; Grumbleclaw's gloom
  lanterns to knock out; the Drillosaur stuck in its own tunnel when it misses).

## Review 2 — chapter 5, « Sand & Sea » (2026-09-28, M7)

Built to the checklist, the design written first (`world-v7.md` §3.4). Played end to end by
the bots in solo and in Party, looked at shot by shot (`m7*` screenshots).

### Against the checklist
1. **Story** — a clear goal (make the Sunken Bell ring), and a real **setback** at the
   midpoint: while the heroes dive for the clapper, the Duchess keeps her chapter-3 promise —
   seen, not told: the camera cuts to Croakmire, the Gloomstage over the lily throne, the
   Snuffer comes down, the king sneezes « …We are cold again », and back in the Forum the
   lantern's fourth flame gutters out. « Three flames. » The marsh stays drained until
   chapter 6. The hook makes it personal: the marsh's flame now shines « in a jar on her
   stage, like a prop ».
2. **Dialogue** — six new voices that don't sound alike: Auntie Saffron haggles in dates,
   Tariq talks like a tour guide (« On your left: water. On your right: also water. » — a
   running gag that pays off in his idle line « It's a very consistent tour »), Elder
   Shellington… takes… his… time, Snap never uses a full stop, Zizi sells mirages, Wendy
   swears by her rivets. The Understudies keep theirs (Brick in the third person).
3. **Intensity & sincerity** — the setback; Shellington remembering swimming through the
   lit windows; Tariq's « a promise is the one thing you never haggle over »; the chord
   side quest ends on « My mother… sang it… to me ».
4. **Quest verbs** — escort on a path (Humphrey, who only follows a light, through a real
   sandstorm, two ambushes), a camp, dives, a scene-driven boat, the dungeon; sides: a
   **flock** escort (five hatchlings follow the lantern; stragglers get snatched back), a
   **choice** with two different outcomes (buy Zizi's map → a guarded treasure; report him →
   Saffron's discount), an **ordered** sequence read from a clue (« low, high, middle » on
   three stones of different sizes).
5. **Dungeon** — one signature mechanic, **the tide**, in five rooms and escalating: one bell
   and a dash; a bell at the far end and crabs on the wet sand; two bells that must ring
   together; the Swimmers' pool; the Kraken's arena. No plates, no torches, no logs, no wax.
6. **Bosses** — the Synchronised Swimmers are untouchable in their pool until you drain it
   (then they flop on the tiles); the Gloom Kraken is untouchable under the sea, attacks
   with its arms (a marked line, then the arm lies there to be cut — every severed arm costs
   it), a whirlpool that drags you in, a grab you escape by hitting the arm; the great
   Sunken Bell strands it (×2) until it drags the sea back in (a wave to jump). Nobody else
   fights like that.
7. **Coherence** — the Duchess's promise (ch3) kept (ch5); Wendy's airship « in the shop »
   (ch4) comes back; the Understudies scolded again, the rift widening before chapter 8;
   the Sunken City's dark windows match the Lamplighters' lore.

### What a designer would still mark down
- **Two escorts in one chapter** (the camel, the hatchlings) — different mechanics, same
  verb in the journal. Acceptable once; not again in chapter 6.
- **Travel by cut**: the boat trips were fades → now real crossings (the boat glides in,
  the camera follows, the heroes aboard) — fixed during the review.
- **The temple's floors** are big flagstones everywhere; the tide pools had no pools →
  fixed (rock pools, sand, shells), but the halls could still use more life (fish under
  the water plane, weed, caustics) — carried to M14.
- **Reuse**: the Swimmers' wave and the Kraken's return wave are « rings to jump » again
  (the Tenor had them). Secondary attacks — tolerable, noted.

### Scores (honest)
story 9 · dialogue 9 · intensity 8.5 · quest variety 9 · dungeon puzzles 9 · bosses 9 · set
pieces 9 · places 8.5 · coherence 9 → **overall 9**.

## Review 3 — chapter 6, « Fire & Fins » (2026-09-28, M8)

Designed first to the checklist (`world-v7.md` §3.4), built, then played end to end by the
bots in solo and in Party with 1, 4 and 8 players (`m8*` screenshots, looked at one by one).

### Against the checklist
1. **Story** — it opens with a crash: the Gloomstage's spotlight finds the Dauntless Teacup
   over the Straits, flak, « RIIIIP », down into Dino Isle's tar. The goal is concrete (rebuild
   the airship across three islands before the Debut), the midpoint turns sad (the
   Understudies weren't invited), the climax is the villain herself on her own stage, and
   the chapter-5 setback is undone on screen (the jar falls, the marsh warms, no sneeze).
   The hook is seeded twice: the bottles' letters (« we are still here », from Lanternport)
   and the Gloomstage turning east with the other flames.
2. **Dialogue** — three new voices: Professor Ammonite (everything is « utterly
   Cretaceous! », writes papers about disasters), Old Barnaby (shipping forecasts for
   everything, « Forecast: humiliation »), Granny Mochi (never in a hurry, « Soak first.
   Worry after. Or never. Never is nice. »). The Duchess gets her best material (« Why is the
   audience four small people with a LANTERN? », « This is merely… the INTERVAL! »).
3. **Intensity & sincerity** — the Understudies on the swan: « Brick practised clapping. For
   weeks. », then a silence; the Duchess white as a sheet in front of a hen, thirty years
   after her first Debut; the lantern's fourth flame catching again.
4. **Quest verbs** — tame & tow (a `check` step on the mounts system: ride a triceratops to
   the gondola), a sailboat **race** against a visible rival, the dungeon's **launch vents**;
   sides: a **sneak** (running near the dozing Tyrant King wakes him and sends everyone back)
   and **moving pickups** (bottles drifting on the Straits' current). No escort, no camp —
   the two verbs chapter 5 leaned on.
5. **Dungeon** — one signature mechanic, **the vents**, in four rooms and escalating: one vent
   over a moat (timing); three vents sharing one pressure (cap two with their stone lids and
   the third throws far enough — too short and you land in the lava); a chain, vent to vent
   over lava islets in rhythm; the mini-boss arena, where the vents are weapons. The caldera
   is an outdoor instance at dusk (basalt, ash, lava lakes, anvils and furnaces).
6. **Bosses** — the Duchess's Debut in three acts: the aria (notes on marked spots) and her
   fan; the **spotlight** that follows you (« Upstaged! »: it hurts and slows); the Snuffer's
   rings. And **the hen**: it follows the nearest hero — lead it to her and she freezes with
   fright (×2 damage) until she shoos it off. Snuffbot Mk II can't jump: lure it onto a vent
   when it blows and it's thrown sky-high.
7. **Coherence** — Wendy's airship (ch5) gets its crash and its repair; the marsh's flame
   « in a jar on her stage » (ch5's hook) is exactly where it falls from; the Understudies'
   rift widens towards chapter 8; the Dawnlands are named by a letter before anyone goes.

### What a designer would still mark down
- **A second race** in three chapters (the sled race in chapter 4). Different vehicle, a
  rival you can see and beat — kept, but no more races in the story until the mini-games.
- **Snuffbot Mk II** fights like Mk I; only the vents make it new. Crumble's next machine
  needs a move set of its own.
- **The Hot Springs** were just talk → now a scene: everybody in the bathhouse's tub, steam,
  hearts, and far up the slope the Duchess's scales (« Mi-mi-mi-MIIII! ») — fixed.
- **Party readability**: a toast could cover the boss's name, and « press A » showed over the
  sailboat during a scene → toasts now step under the boss bar, no prompts in scenes — fixed.
- **Places**: Emberpeak's slopes between the springs and the Forge Gate are bare ash —
  carried to M14 (fumaroles, obsidian spires, sulphur pools).

### Scores (honest)
story 9 · dialogue 9 · intensity 9 · quest variety 9 · dungeon puzzles 9 · bosses 9 (Mk II
8) · set pieces 9 · places 8.5 · coherence 9 → **overall 9**.

## Review 4 — chapter 7, « The Dawnlands » (2026-09-28, M9)

Designed first to the checklist (`world-v7.md` §3.4), built, played end to end by the bots in
solo and in Party with 1, 4 and 8 players (`m9*` screenshots, looked at one by one — two passes
of fixes, below).

### Against the checklist
1. **Story** — a new continent, reached by air: the crossing, the tea running low, an island
   that isn't on any chart… that opens its eye. A town in the dark that writes letters in
   bottles; the last Lamplighter who knew Nana June; the villain's escalation shown, not told
   (her face on the fog, her Umbral Spotlight rehearsed on the bay, every lamp it touches going
   out — « When she gets that thing working… it'll be the world »); a twist (Old Lucky is the
   monks' beloved puppet: saved, not slain); a real sunrise after a month without dawn; the
   festival. Seeds: Perkins's thirty-year-late letter « for a Miss G. Gloomsworth » (the
   finale's reveal), the mimes left out on the pier (chapter 8's defection), the Great Tree.
2. **Dialogue** — new voices: Barnacle Bess (« petal », brisk), Grandmother Bellows (… every
   … word … a … wave, her own painted portrait), Old Hoshi (dry, counts things, warm under
   it), Abbot Sen (proverbs he invents on the spot — « It is old now »), Brother Bao (a vow of
   riddles, wrong answers with their own jokes), Blanche (forty-seven whites), Mei, Tamsin.
   The Understudies as mimes: silent, except Minnow.
3. **Intensity & sincerity** — Hoshi and June's sixty years of letters; the broadcast and the
   lamps going out one by one; Brick's « Brick felt safe in the invisible box »; the monks
   begging for their dragon; three mimes nobody invited.
4. **Quest verbs** — all new: **stomp** (a whack mini-game on a whale's back: land jumps on
   barnacles against the clock — the Mario & Luigi nod), **relight a dark town** with a
   lantern that gutters away from the light (moths nibble it), **fly a kite** above the fog
   (tension in the green), the dungeon's **mirrors**; sides: a **riddle quiz** (score-based,
   no fail loop; Party votes) and **reflections** (things that exist only in the salt mirror).
   No escort, no camp, no race.
5. **Dungeon** — one signature mechanic, **the dawn beam**, in four rooms and escalating: one
   mirror; paper screens it must burn through in order; a prism that splits it (two lotuses at
   once, three mirrors); the roof, where the Dawn Mirror is the weapon. Pagoda theme: plank
   floors and red runners, shoji walls, vermilion doors, paper lanterns, gongs, incense.
6. **Bosses** — the Mime Troupe (invisible walls you bump into, boxes a friend pops, a rope you
   jump, a piano you dodge); **Old Lucky**, a paper dragon whose body follows its head,
   untouchable in the air, diving down marked lines — land on a perch and the heroes turn the
   Dawn Mirror to set it alight (×2, stunned); phase 2 paper bats, phase 3 double dives.
7. **Coherence** — ch6's bottles (« we are still here ») answered; Wendy's Teacup and the new
   Teacup line; the Understudies' demotion (ch6: uninvited → ch7: mimes → ch8); the Murk's
   rules (the Wide Sea now opens with the chapter).

### Found in play, fixed
- **The Wide Sea was never opened** (zone `wide`): the Murk's puffs sat along every Dawnlands
  coast and inside Lanternport — the chapter now opens it.
- **A chapter's lands weren't cleared at once**: `beginChapter` didn't refresh the Murk, so a
  hero could be sent back to the plaza as « lost in the Murk » — fixed (and a save's current
  chapter always has its lands open).
- **Lanternport's piers had no planks** (tiles drawn as water, no deck) — the Dawnlands' piers
  and boardwalks now get their decks.
- **The Dawnlands looked sunny** while the story says « no dawn for a month » — a grey sky over
  harbor, jade and salt until the Dawn Hearth is relit (Lanternport darker still until its lamps
  are lit): the sunrise now lands.
- **The whale's eye** didn't read (a dark mound) → a bigger eye, a white almond with a gold iris
  under a lid that rolls up; it stays open while her back itches.
- **The spout** happened off-frame → seen from her back, zoomed out, before the camera rides up.
- **A beaten boss held for its scene** blew up to a giant (fade-out scaling) — `e.hold` (the
  Duchess's Debut had the same bug for a moment).
- Moored Teacup hid its mast; the Duchess's face on the fog was off-frame; sky lanterns read as
  ghosts; the roof was an indoor-dark room (now lit like the open sky, glazed tiles); the
  pagoda's floors got their red runners; three music tracks (Forge Heart, Sunken Bell, Lantern
  Pagoda) had melodies at half their bar length — fixed.

### What a designer would still mark down
- **Four mini-game verbs in one chapter** is generous; the kites and the whack are short, but a
  player may feel the chapter is « activities » more than adventure. Balanced by the dungeon and
  two fights.
- **Old Lucky's fight depends on standing on plates** while it perches — clear in the intro
  line, but a first-time player may not read it: the boss bar's hint (« turn the Dawn Mirror on
  it ») carries it.
- **The Saltmirror side quest** is a collect with a lovely twist, still a collect.

### Scores (honest)
story 9 · dialogue 9 · intensity 9 · quest variety 9.5 · dungeon puzzles 9 · bosses 9 · set
pieces 9.5 · places 9 · coherence 9 → **overall 9**.

## Review 5 — chapter 8, « Autumn & Roots » (2026-09-28, M10)

Designed first to the checklist (`world-v7.md` §3.4), built, played end to end by the bots in
solo and in Party with 1, 4 and 8 players (`m10*` screenshots, looked at one by one).

### Against the checklist
1. **Story** — the turn the whole saga was building to since chapter 1: the Understudies are
   fired (replaced by cardboard cut-outs that « never TALK »), tipped off the Gloomstage, and
   change sides; the goal is clear (a festival with no light, then the Great Tree); the
   villain's plan sharpens (the Umbral Spotlight needs the Heartlight; the Moth Queen eats the
   light the Snuffer can't reach); the climax undoes the siphon on screen and the Duchess names
   the finale's place (« the Scar is waiting »); the hook is the ghost moor.
2. **Dialogue** — new voices: Mayor Marrow (judges everything, forty-one festivals), Old Mo
   (endless stories, no boots), Warden Ashby (… slow … as … a … tree, planted it as a boy),
   Hazel (brisk farmer), Nell and Wick (a hatter who « hurries like a heron »). The Understudies
   get their best scene (« Fired. By CARDBOARD. », « Brick heard clapping. For Brick. »).
3. **Intensity & sincerity** — the patch scene (« a home that isn't a theatre »), the first
   applause, the Warden's tree, a fisherman giving up his supper so a song can happen.
4. **Quest verbs** — all new again: **net** fireflies (timing: only while they glow),
   **carry** jars and hang them (slowed while carrying), a **rhythm** act (notes to a ring;
   the crowd needs 60 %), the **jars** puzzle in the dungeon; sides: **leaf piles** to land
   jumps in (with a joke in every wrong pile) and a **trade chain** (hat → fish → hat → song).
5. **Dungeon** — one signature mechanic, **the firefly jars**, escalating: one swarm, one hook;
   glowcap walls that part only in a hung jar's light (two doors, three hooks, which order); a
   swarm that **chases** a carried jar and snatches it (run it to the far hook); the Queen's
   arena, where jars are the only way to strip her swarm.
6. **Boss** — the Moth Queen: untouchable while her swarm circles her; hang a jar and it leaves
   her (« Exposed! »); gusts (marked cones), dust (marked circles that leave a slowing haze), a
   dive; phase 2 the moths drink jars faster; phase 3 she drinks one dry herself.
7. **Coherence** — the cardboard understudies pay off every « understudies are replaceable »
   insult since chapter 1; the Heartlight explains why the Gloomstage hid in the tree; the
   ghost moor and the Lady in Grey (chapter 9) are named.

### Found in play, fixed
- The Gloomstage in the crown was **hidden inside the leaves** → moored higher, the siphon longer.
- The whole chapter ran at night after the firefly hunt (the dungeon said « Lun. 22h ») → the
  festival ends at dawn (« Morning. »), and the heroes climb out of the tree into daylight.
- « Light a fire » was offered inside the dungeon (camps outside only) → no camping inside an
  instance.
- The moth swarms read as dark smudges → pale moths in a violet haze.
- The Understudies' names stayed English in the French lines → Fretin, Frétille, Brique.
- Leaf piles were too small to spot → larger.

### What a designer would still mark down
- **The Moth Queen's wings** are flat painted cards; up close in Party they read a little like
  paper. Acceptable in a paper-and-moths chapter; a proper wing mesh is noted for M14.
- **Four mini-game verbs again**, like chapter 7 — each is short and new, but the chapter leans
  on activities; balanced by the dungeon and the story weight.

### Scores (honest)
story 9.5 · dialogue 9 · intensity 9.5 · quest variety 9 · dungeon puzzles 9 · bosses 8.5 · set
pieces 9 · places 9 · coherence 9.5 → **overall 9**.

## Review 6 — chapter 9, « Moor & Machines » (2026-09-28, M11)

Designed first to the checklist (`world-v7.md` §3.4), built, played end to end by the bots in
solo and in Party with 1, 4 and 8 players (`m11*` screenshots).

### Against the checklist
1. **Story** — the saga's heart: the moor's ghosts tell the manor's story in four pieces (a
   second teacup poured for thirty years; a girl singing in the kitchen; a rose that never
   flowered; a letter on a silver tray and every clock stopped at twenty to nine). The Lady in
   Grey is the Duchess's mother; the sepia flashback shows the Starfall stage thirty years ago —
   a girl's first aria, a hen, laughter that wasn't unkind, a girl running — and the letter
   home: « I'll come home when they applaud me. » Every « nobody invited me » since chapter 1
   now hurts. Then hope: the Lantern Cannon; the last camp under the aurora; the Gloomstage over
   the Scar; « Tomorrow night: the Grand Finale ».
2. **Dialogue** — Aunt Tallow whispers (Candlewick doesn't shout), Master Tock speaks in ticks
   (« In three ticks I'll be with you. Tick. Tick. Tick. Here I am. »), Ranger Rhoda numbers
   her rules and loves them, the ghosts each have one sentence that lands. Lady Honoria: « Tell
   my Gloria… the tea is still warm. »
3. **Intensity & sincerity** — the whole manor thread; the rose's one bud; Brick at the camp
   (« everybody should know when somebody keeps the tea warm for them »).
4. **Quest verbs** — all new: **seek** (ghosts only a lantern shows — a cold shimmer hints where),
   **snap** (catch a rainbow at a geyser's peak — three rhythms), **defend** (keep the gloom
   off the cannon while it charges — they go for the machine, not you), the dungeon's
   **then/now**; sides: **chase** (a runaway cuckoo that circles the square and tires) and
   **seek in steam** (lost hikers, opaque, hidden by the steam).
5. **Dungeon** — one signature mechanic, **the clocks**: a plate turns the whole room between
   THEN and NOW; a door bricked up now; a stairhall crossed THEN and left NOW (switch mid-room —
   in Party, whoever switches too early drops the others in the hole); a gallery with two
   clocks and two switches; the ballroom, where the time decides whether the boss can be hit.
6. **Boss** — the Lady in Grey: in THEN she's a memory, waltzing, untouchable; in NOW a ghost —
   tea service, the pendulum's arc, cold spots that slow; from phase 2 she drags the room back
   to THEN herself (switch it back), phase 3 ghost dancers in rings to jump. Not slain: at
   peace.
7. **Coherence** — ch1's « thirty years since this cove booed me », ch3's hen, ch6's frozen
   Duchess, ch7's undelivered letter to « Miss G. Gloomsworth », ch8's « Understudies are
   replaceable » — all converge; the finale's letter is set up.

### Found in play, fixed
- Ghost models crashed (CharModel meshes carry material arrays) → handled; a mini-game that
  fails to set up is dropped instead of crashing every frame.
- « Light a campfire » was offered inside the solo game's dungeons → not in an instance.
- The manor's rugs read as holes in the floor (dark purple with dust specks) → a faded red rug
  with a gold border and a lattice.
- The flashback's stage stood on the plaza's fountain → north of it; the Gloomstage over the Scar
  was off-frame (framed at its height now); the cannon's shot was taken in the white flash.

### What a designer would still mark down
- The **Lady's model** (a cone of a skirt) reads as a ghost but not as elegant as the story
  deserves — carried to M14.
- The **snap** geysers overlap the landmark geysers' own eruptions (two columns at once).

### Scores (honest)
story 10 · dialogue 9.5 · intensity 10 · quest variety 9.5 · dungeon puzzles 9 · bosses 9 · set
pieces 9 · places 9 · coherence 10 → **overall 9.5**.

## Review 7 — chapter 10, « The Grand Finale », and the Epilogue (2026-09-28, M12)

Designed first to the checklist (`world-v7.md` §3.4), built, played end to end by the bots in
solo and in Party with 1, 4 and 8 players (`c10_*` and `p*` screenshots).

### Against the checklist
1. **Story** — everything pays off. Everyone who helped waits at the edge of the Scar (Wendy
   and the Teacup, Tock and the Lantern Cannon, the Understudies); the plan is told in jokes.
   The Teacup flies up through the searchlights and docks at the stage door. Inside: Crumble's
   last machine (he quits — « I'm going to be a TOUR GUIDE »), the Understudies' finest hour
   (they hold the follow-spot with the act of their lives), and the Duchess's Grand Finale in
   three acts. It is not won by hitting her: at the end of her strength Perkins crashes through
   the backdrop with the letter he has carried since chapter 7 — the Festival committee's,
   thirty years late (« We laughed at the hen — never at you… We would so like to hear the
   rest. », signed « June, secretary »), and the heroes give her her mother's message. She
   cries; the seven flames fly home; dawn over the Scar and a montage of hearths relit. The
   Epilogue: the Starfall Festival she never finished — stage fright, Crumble finally gets her
   title right, Nana June home at last in the front row, the aria, the HEN… which she picks up
   and sings on with, the applause, the Understudies' team pose collapsing to laughter (« They
   laugh. WITH us. »), the Lady in Grey at the back with a teacup, sky lanterns, credits.
2. **Dialogue** — each voice keeps its tic to the end: Brick's one-word sentences (« Brick
   carries cannon. »), Fidget's spirals, Minnow's bossiness, Tock's ticks, Wendy's tea, Crumble's
   garbled announcements, Perkins late as ever. The Duchess's last lines turn from grand to
   small: « Thirty years I have been a villain. Villains don't get stage fright… This is much,
   much worse. »
3. **Intensity & sincerity** — the letter; « the tea is still warm »; « Come anyway. »; the
   applause « thirty years' worth »; the hen, turned from wound into encore.
4. **Quest verbs** — a talk that is a choice of moment (board when ready), a stealth dungeon, a
   three-act boss with a machine to man, a festival that is a scene to watch — the verbs are
   the chapter's own, no mini-game reused.
5. **Dungeon** — one signature mechanic, **the spotlights**, escalating: one light on a zigzag
   (learn the flats' shadows), a boss room, a fight under the stage, then the fly tower (two
   crossing lights, the follow-spot, the lighting board's five seconds of dark — and the
   Understudies' act, which holds the follow-spot for twelve seconds in every seventeen).
   Six rooms, a new look: plum stage boards with chalk marks, velvet walls, curtains that fly
   up, ghost lights, work lamps, footlights, a painted-sky backdrop.
6. **Bosses** — **Snuffbot Mk III**, with its own moves at last (snuffer-caps that trap until a
   friend lifts them or three hops knock them off, a wax flood to jump, a dome that overheats);
   **the Grand Finale**: Act I her Debut's repertoire, Act II the stage machinery (trapdoors,
   sandbags), Act III the Umbral Spotlight — a sweeping wedge of darkness, untouchable until the
   Lantern Cannon (stand on its plate 2 s) shatters the lamp for 7 s. Her mark is a gold star
   in the boards and her own warm spotlight follows her until Act III eats it.
7. **Coherence** — ch1's Perkins (« Posted… seven weeks ago »), ch6's hen, ch7's undelivered
   letter, ch8's « Understudies are replaceable », ch9's flashback and the tea — all resolved;
   June was the committee's secretary (Honoria: « June came to tea here once »).

### Found in play, fixed
- A spotlight room's goal line sat on the room's edge, where heroes no longer count as inside
  → a tile in (and documented in `spots.js`).
- The Gloomstage's inside was nearly black (black boards, few lamps) → plum-brown boards,
  ghost lights, work lamps, footlights, rigging washes, ambient raised.
- Curtain gates "flew up" only 3 tiles and hung over the corridor in the oblique view → they fly
  out of sight.
- Party: the cold open hung — a second fade overwrote the first's promise → a new fade now
  releases the one before it.
- The fly tower caught heroes during its own intro scene → no one is caught while a scene plays.
- The committee's letter lost its paragraphs → real paragraph breaks; stolen flames were
  overexposed white → their colours show; credit lines overflowed → shorter cards; the crowd
  stood in the fountain → a horseshoe round it; June's line said « your gran would be proud »
  (she IS the gran) → her own return, and a joke about her letter arriving by spring.

### What a designer would still mark down
- The dungeon's middle is dark-ish by design (stealth) but the big rooms could use more set
  dressing (catwalks overhead, ropes) — carried to M14's polish.
- The Grand Finale's Act II could slide flats across the stage as designed (trapdoors and
  sandbags carry it for now).

### Scores (honest)
story 10 · dialogue 9.5 · intensity 10 · quest variety 9 · dungeon puzzles 9 · bosses 9 · set
pieces 9.5 · places 9 · coherence 10 → **overall 9.5**.

## Review 8 — side content & polish (2026-09-29, M13–M14)

### What was added
- **World bosses** (five, one land each, woken like the lairs' guardians, a world banner, three
  chests): each with its own read — Thunderhoof's lanes and stampede, the Paper Tiger's pounce
  and flat skate (fire ×1.6), the Moonmoth's sweeping moonbeam (jump it), the Crystal Behemoth's
  glass back (it turns slowly: get behind it, ×1.8), the Aurora Wyrm's burrow hunt and falling
  aurora. Placed where a fight reads (the Moonmoth moved from deep forest to a lake meadow).
- **Rares** (ten): named, silver-plated, a line when they wake, a treasure hat each (Party:
  the phone's look editor; solo: the wardrobe) — the Hen Hat from Sir Reginald is the one
  people will want.
- **Mini-games to play again**: the Pelican Rush (seven doors against the clock), the Minecart
  Rush (a runaway cart round Dusty Gulch), Lamplighting (the town's own lamps step aside for the
  game's), the Ghost Hunt (the manor's staff at hide-and-seek), the Talent Show (percussion for
  the Understudies). A repeat never hides someone's new quest (a real bug the bots found: Nell
  offered the cart race forever and her own quest never).
- **Polish carried from earlier reviews**: the Grotto's plates became Old Glimmer's light and
  the Lamplighters' mirrors (the dungeon's own mechanic); Barkbeard's golden acorns to kick back
  into his beard, Grumbleclaw's gloom lanterns to knock out (half damage while one burns, dazed
  when the last goes out), the Drillosaur stuck in its own tunnel when its charge meets nobody;
  the Lady in Grey's gown (tiers, bustle, veil, pearls); the Moth Queen's wings curved; the snap
  geysers no longer erupt twice; Emberpeak's ash slopes get obsidian shards and steaming
  sulphur vents; the Sunken Bell's pools get light ripples and fish.

### Scores (honest)
side quests 9 · mini-games 9 · world bosses 9 · rares 9 · early bosses 9 · early dungeons 9 ·
places 9 → **overall 9**.
