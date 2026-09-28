# Adventure v5 — progress log

Plan: `docs/plans/dino-v5.md`.

- **D1 — Dino Isle** (commit "Adventure v5 D1").
  - Zone `dino` (appended to `ZONES`: water palette `lagoon`, music `jungle`) with its seeds in
    the south-east sea; the Whirlpool Straits keep the east (new seeds), their whirlpools & a
    sea stack moved out of the way, the straits' islets keep clear of the island. After the
    island is stamped, the sea around it (not Emberpeak's shore) is relabelled `dino`.
  - `gen.js`: five jungle lobes round (408, 214); the Fern Meadows (west), the Tyrant King's
    clearing (north-east), Nest Hollow (south-east), Fernpeak (a rocky height with cliffs),
    beaches (`dino` counts as salty), then (after the beaches) a river and four tar pits;
    trails with plank bridges; a road from the hot-springs road down Emberpeak's west side and
    over the strait on a long boardwalk to the landing. POIs: waystone « Fern Landing »,
    `dino_station`, `dino_skeleton`, `rex_nest`, three `dino_nest`. Dive spots in its waters.
  - Tiles: `TT.JUNGLE` (painted: deep greens, fern fronds, litter, roots, flowers; decals
    frond / sprig / orchid; earthy river banks via GRASSY) and `TT.TAR` (glossy, sheen streaks,
    bubbles, muddy rim, bones sticking out; slows you to half and bubbles — zones.js).
    Preview, minimap & bigmap colours.
  - Scatter on the jungle: tree ferns (arching two-segment fronds, a fiddlehead), palms,
    cycads (a cone in a rosette), elephant-ear leaves, giant horsetails, ferns; grass & meadow
    get cycads, ferns, horsetails.
  - Landmarks: a long-neck skeleton standing on its four legs (walk under its belly; a little
    dig site with a lantern), the Tyrant King's nest (a ring of branches, three huge eggs,
    bones, a fossil skull on a rock), small nests of pastel eggs, the Dino Station (a research
    hut on stilts: deck, glowing windows, footprint sign, telescope, radio mast & flag). The
    station opens (`w_station` in `wildrooms.js`: map, board, desk with radio & globe, jars &
    books, terrarium, telescope, hammock, bed, chest…).
  - Zone life: music `jungle` (A dorian marimba riff / bird-call flute / kalimba drum break),
    ambience (birds, insects, surf), mist by day, fireflies at night, a green wash, tropical
    showers (rain, no push); far-off roars, long-neck hoots, pterosaur screeches, chirps. New
    sfx: roar, stomp, screech, chirp, honk.
  - FR: `src/lang/fr/dinos.js` (registered). Tests: the island by day & night, the bridge, the
    station entered (split screen), 2.6 ms/frame on the island: 0 errors, i18n 0 missing.
- **D2 — dinosaur models** (`src/models/dinos3d.js`).
  - `buildDino(r3d, kind, { variant, gloom, scale, saddle, baby })`: long-neck (walk under its
    belly), triceratops (a round patterned frill edged with knobs, two long brow horns, a nose
    horn, a beak), raptor (feathered crest, sickle claws, a jaw), compsognathus, dilophosaurus
    (twin crests, a frill that flares), pteranodon (crest, long beak, two-part wings),
    ankylosaurus (plates, studs, flank spikes, a club tail), stegosaurus (two rows of plates,
    tail spikes), the Tyrant King (a huge toothy head, a jaw, tiny arms). Rigs: hips & knees,
    neck & tail chains, jaw, frill, wings, club. Gloomy ones: colours pulled to purple,
    glowing eyes. Two looks for most kinds.
  - `animDino(rig, dt, { speed, act, roar, graze, air, swim, glide })`: gaits per kind (biped /
    quadruped, trot, swing, bob), a tail wave, a long-neck grazing, jaws for bites & roars, the
    dilophosaurus' frill, wingbeats & glides, the ankylosaurus' club swing.
  - `dinoEnemyModel(r3d, kind)`: facing +z with its own materials, for the gloomy foes (D4).
- **D3 — peaceful dinosaurs & mounts** (commit "Adventure v5 D2–D3").
  - `src/party/dinos.js` (`DinoLife`, solo & Party Mode): two long-neck herds with babies trotting
    after their mums, two stegosaurs, five pteranodons wheeling over the island (wingbeats then
    long glides); they graze, amble inside their range, stop and look when you come close
    (babies turn to you), push players out of their feet (walk right under a long-neck's
    belly); hoots now & then. A (explore's & the solo nearThing): « Caresser » the nearest one
    — a happy hop, a hoot or a chirp, hearts.
  - Mounts: triceratops (food: a fern frond; horn toss; « Débandade », a long thundering charge
    that tosses the gloom aside) and raptor (a fresh fish; claw swipe; « Bond », a leap at the
    nearest gloom), herds only on the island's own ground and away from the Tyrant King's
    clearing; `mounts3d.js` delegates their models & gaits to `dinos3d.js` (saddles in the
    rider's colour, a bigger raptor to ride); 7×7 food icons (big screen & phone), mount icons;
    the solo Hero page's mounts grid goes to 4 columns.
  - Tests: herds on the island, riding both, a stampede, patting a baby (the nearest one wins):
    0 errors, i18n 0 missing.
- **D4 — gloomy dinosaurs** (`src/combat/v5/dinofoes.js`, merged into the bestiary).
  - Six foes, each asking something different, every attack shown before it lands: raptor packs
    circle, mark a line and pounce; the dilophosaurus flares its frill and spits a venom glob (a
    poison puddle with a dark rim, readable on grass) and screeches you back when you're close;
    the pteranodon wheels overhead then dives down its line; the ankylosaurus is armoured in
    front and spins its club (a ring: jump it); compsognathus swarms nip and scatter when hit;
    the triceratops (the zone's big one) paws the ground and charges down a lane, stunned when it
    hits a wall. Purple gloom wisps curl off their backs.
  - Beaten, they're themselves again: colours back, they run off (the pteranodon flies away); a
    freed triceratops stays as a friend to ride (like the other freed mounts).
  - Camps: Dino Isle gets its two camps (a fallback search around small zones' seeds, away from
    the peaceful herds, the Tyrant King's nest and tar pits); two tar pits moved off the road &
    beach.
  - Fixes on the way: the ankylosaurus' spin effect (`vfx.whirl` takes an anchor function),
    `hazard()` gets an optional rim (`edge`).
  - Tests: each foe alone (close-ups of every attack), freed flows, a full camp fought by 4 bots:
    0 errors, i18n 0 missing.
- **Companions, managed from the phone** (the user's request, between D4 and D5).
  - `src/party/buddies.js` rewritten around a collection in the profile (`pets: { owned, active }`,
    one of each kind: fox, fawn, crab, young raptor, compy): `give` / `choose` / `sendList`, and a
    `sync()` each frame that brings each player's chosen companion out wherever companions go
    (the lobby, exploring, the Festival Ring's waves — not its brawls nor the festival's games;
    outdoors in solo) — so it comes back after an activity change, a reload or an interior.
    Trails you on the move, sits by your side looking up at you when you stop (readable from
    the camera), the young raptor & compy run on `animDino` legs.
  - Freed gloomy animals: whoever freed it (or someone nearby without that kind) gets it; the
    first ever comes with a banner saying where to choose (« menu → Mes compagnons » on a phone,
    the Hero page in solo). Also in solo now (`wild.js`: `Buddies`, onKill, indoors).
  - Phone: « Mes compagnons » in both menus (Party & solo): 12×10 pictures, ✓ who follows you,
    silhouettes + where to find the others, « Renvoyer à la maison »; « Mes montures » gets the
    same picture list (`animalList`). Pictures: `drawPetIcon` in `combat/icons.js`.
  - Solo Hero page: a « Compagnons » tab (cards, hints, send home).
  - FR: `src/lang/fr/companions.js`. Tests: Party (phone tab: tap a companion, send home;
    lobby / explore / waves / brawl; 8 bots each with one, 7 ms/frame), solo (banner, Hero
    page, indoors & back, a phone driving the solo game): 0 errors, i18n 0 missing.
- **D5 — the Tyrant King** (`src/combat/v5/tyrant.js`, Dino Isle's lair in `lairs.js`).
  - A crowned gloomy T-rex (1.5×) asleep by his nest; the sigil wakes him (banner, boss music, a
    three-phase bar). Chomp (a red cone, jaws snap), tail sweep (a ring: jump it), lane charge
    (he paws the ground; ram him into a rock or a tree after a run-up and he's dizzy — stars
    round his head, ×1.5 damage; he won't pick a lane blocked right away), bellow (phase 2+:
    blows you back and calls his pack — raptors, then a dilophosaurus & compys), quake (phase
    3: three stomps, rocks tumbling from above onto everyone's spot); faster when furious, the
    gem burns red. `bosses.js` shares its helpers (`cone`, `later`, `hurtIn`, `checkPhase`,
    `leash`…); `bossDamageMul` knows the dizzy king; a 'rock' projectile look.
  - The T-rex model redone: a deep chest & hips, a sculpted skull & snout, big teeth, scowling
    brows, back stripes & bony scutes (it's the back the camera sees), a striped tail, thick
    legs with claws, clawed little arms. The gloomy one has a palette of its own (green +
    purple washed out to grey): deep purple, dark stripes, glowing eyes.
  - Freed: green again, gold-crowned, he roars and stomps back to his nest (a 4.5 s walk-off);
    a few seconds later he dozes there for good (`DinoLife`), and A pats him (a happy rumble,
    hearts) — until a rematch.
  - Tests: each attack captured (idle players), phases 2 & 3 (pack, bellow, quake & rocks), a
    dizzy spell, victory (banner, chests, XP), the king at home; a full fight with 4 bots;
    the solo game: 0 errors, i18n 0 missing.
- **D6 — new gloom elsewhere** (`src/combat/v5/newgloom.js`).
  - Gloom jellyfish: the Coral Lagoon & the Sunken City are water (no camps, and swimmers can't
    fight), so jellyfish *bloom*: walk a warm shore (Coral Lagoon, Sunken City, Dino Isle, the
    open sea's islands) and now and then 2–5 rise from the sea a few tiles off and float over
    the sand to meet you (`Encounters.blooms`; they sink back if you leave). They drift after
    you, glow (a warning ring) and pulse an electric ring (shock: a jolt), then drift back.
    Freed, they turn sea-glass blue and float off into the sky.
  - Bat swarms: at night (20 h–5 h) the camps of the Deep Whisperwood, Bouncecap Woods, the Red
    Canyon and Croakmire get a swarm of bats (3–5): erratic loops round you, a screech and a
    marked dive; a hit knocks one out of its dive. Glowing purple wings & red eyes so they read
    in the dark.
  - Mimics: once you've cleared a couple of camps, a camp's reward chest is a mimic one time in
    five (it sparkles less and twitches now and then — the lid lifts a crack). Open it: CHOMP!
    It hops after you, chomps (a small circle) and spits gloomy coins; beaten, it coughs up a
    rich chest. `Chests` (shared: Party & solo) gets `mimic` & `bite()`; `combat.kill` calls an
    enemy's `onDeath`; a 'coin' projectile look.
  - Tests: a bloom on Dino Isle's beach (Party & solo), jellyfish charge & zap, bats in a night
    camp & their dives, a mimic chest (reveal, chase, chomp, the rich chest): 0 errors, i18n 0
    missing.
- **D7 — polish & regressions** (commit "Adventure v5 D7").
  - README: a « Dino Isle, new gloom & companions » section (four 960×540 pictures taken at
    the README's usual zoom: the dig site, riding a triceratops & a raptor, the Tyrant King's
    bellow, friends with their companions; the phone's « Mes compagnons » / « Mes montures » /
    menu), and the lists of lands, mounts and guardians updated.
  - Phone: the companions menu's footer stacks its buttons when « Renvoyer à la maison » would
    be cut. Bats: a faint trail of sparks and a lilac screech ring (readable in a dark wood).
  - Regressions: the whole Starfall Festival story (autoplay, 4 bots) to the awards and back
    to the lobby; Party with 1 bot (a camp, back to the lobby), 4 bots (all of the above) and
    7–8 bots (all on Dino Isle with the Tyrant King awake: 10.5 ms/frame; eight companions:
    7 ms); solo (new game → the valley → the steppe → a freed fox → save & continue: the fox
    is back): 0 errors, i18n 0 missing.
  - Scores /10: Dino Isle 9 · dinosaur models 9 (the T-rex redone; slim bipeds seen head-on
    stay narrow — the camera's angle) · peaceful dinosaurs & mounts 9 · gloomy dinosaurs 9 ·
    the Tyrant King 9 · new gloom 9 · companions from the phone 9.
