# Adventure v5 — Dino Isle & new foes

The user: « rajoute des ennemis différents et aussi des dinosaures ». So: a whole new land full
of dinosaurs — peaceful giants, dinosaurs to tame and ride, dinosaurs caught in the gloom to
free, a tyrant king in his lair — and new kinds of gloom elsewhere in the world. Everything
works in solo and in Party Mode (they share the systems through `src/solo/wild.js`).

## 1. Dino Isle (« L'Île aux Dinosaures »), a new land
- A big jungle island in the south-east sea (the Whirlpool Straits), about 72×54 tiles around
  (408, 212); the Lighthouse Isle stays to the east. Zone `dino` (appended to `ZONES`).
- Ground: sandy beaches, lush jungle floor (new `TT.JUNGLE`), fern meadows where the long-necks
  graze, a river, sticky tar pits (new `TT.TAR`: slows you down, bubbles), a rocky mountain in
  the middle with cliffs, the Tyrant King's clearing in the north.
- Plants: tree ferns, cycads, giant horsetails, big-leaf plants, palms, ferns.
- Landmarks: a waystone (« Fern Landing »), a long wooden bridge from Emberpeak's south coast,
  a giant long-neck skeleton arch, small nests with eggs, the Tyrant King's nest (his lair),
  the Dino Station (a research hut on stilts you can enter: fossils, maps, a bed, a chest).
- Life: jungle music (new track), tropical birds & insects, far-off roars, humid mist by day,
  fireflies at night, tropical showers.

## 2. Dinosaurs (`src/models/dinos3d.js`)
Voxel/toon models with rigs (legs, neck & tail segments, jaw, frill, wings) and animations:
long-neck (brachiosaurus), triceratops, raptor, pteranodon, dilophosaurus, ankylosaurus,
compsognathus, stegosaurus, the tyrant king (T. rex), hatchlings. Gloomy ones: purple-tinted,
glowing eyes, gloom wisps.

## 3. Peaceful dinosaurs
- Long-neck herds amble through the fern meadows (you can walk under them), with babies.
- Pteranodons wheel overhead and perch on the skeleton arch.
- Mounts: triceratops (sturdy: horn toss, *Stampede* charge) and raptor (fast: *Pounce*),
  tamed with the food they love (a fern frond, a fresh fish) like the other mounts; they swim.

## 4. Dinosaurs in the gloom (Dino Isle's camps)
Each asks something different: raptor packs circle and pounce (a dashed line first); the
dilophosaurus flares its frill and spits venom; pteranodons dive along their shadow's line;
the ankylosaurus is armoured in front and swings its club tail all round; compsognathus
swarms nip and scatter; a gloomy triceratops charges down a lane (its frill blocks from the
front). Freed raptors may follow you as buddies; a freed triceratops trusts you as a mount.

## 5. The Tyrant King (Dino Isle's guardian)
Three phases: stomps (shockwave rings), bite (a cone), tail sweep, a roar that blows you back;
then charges across his clearing and eggs hatch into compsognathus; last, rocks rain from the
mountain and the ground cracks. Beaten, he curls up by his nest for a nap.

## 6. New gloom elsewhere
- Gloom jellyfish over the warm seas (a shock ring, drifting stings).
- Bat swarms in the woods & the canyon at night (erratic, screeching dives).
- Mimics: now and then a camp's reward chest bites back.

## 6b. Companions, managed from the phone
The user: « la gestion des "pets" est pas terrible aujourd'hui, il faudrait qu'on puisse la gérer
depuis le tel, un peu comme les montures ». Freed animals used to trot after you for one
activity only, one at a time, with no say in it. Now:
- A collection kept in each player's profile (Party: per phone; solo: the save): one of each
  kind — fox, fawn, crab, and Dino Isle's young raptor & compsognathus (D6 may add more).
- The one you choose follows you wherever companions go (the lobby, exploring, the Festival
  Ring's waves; outdoors in solo) and comes back by itself after an activity change, a reload
  or an interior; freeing a new kind makes it follow you right away.
- The phone's « Mes compagnons » (Party & solo): pictures, who follows you, where to find the
  ones you haven't met, « Renvoyer à la maison ». « Mes montures » gets the same pictures.
- Solo: a Companions page in the menu's Hero page.

## 7. Polish
Music, sounds (roar, stomp, screech, chirp, long-neck calls), French, README & screenshots,
regressions (solo, Party Mode 1/4/8 bots, the story), scores /10.

## Milestones (each tested, captured, committed & pushed)
D1 the island · D2 dinosaur models · D3 peaceful dinosaurs & mounts · D4 gloomy dinosaurs ·
D5 the Tyrant King · D6 new gloom elsewhere · D7 polish. (Companions: done between D4 and D5.)
