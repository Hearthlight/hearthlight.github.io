# Adventure v4 — illustrated, deeper fights (WoW-like), weapons, spectacle, buildings

User request (after Solo v2): *« Il faudrait que les attaques et arbre de talents soient imagés
et beaucoup plus poussés comme sur WoW. Plus d'armes et effets variés, les effets ne sont pas
assez spectaculaires. Aussi il faudrait pouvoir rentrer dans des bâtiments et que les montures
puissent nager. »* Everything below applies to the solo game (the Wild) and Party Mode alike —
they share `src/combat` and the party systems.

## 1. Mounts swim — done (commit "Every mount swims")

## 2. Icons & the action bar
- `src/combat/v4/icons.js`: a procedural icon painter. Each glyph (pan, sword, hammer, shield,
  whirlwind, flame, snowflake, bolt, star, comet, meteor, acorn, pinecone, bow, boomerang, note,
  drum, heart, cross, skull, eye, boot, clock, crown, spiral, shockwave…) is drawn with canvas
  paths on a 16×16 canvas, then snapped to pixels (alpha threshold), outlined and shaded, in a
  frame coloured by school (physical, fire, frost, nature, arcane, holy, shadow). Cached.
- Every move, special, dodge, ultimate, talent and weapon names an icon `{ g, s }`.
- A WoW-like **action bar** on the big screen (solo, out in the wild): the attack, the special
  (cooldown sweep), the dodge, the ultimate (a gauge that fills), with the keys. The phone's
  buttons show the same icons.

## 2b. Party Mode: the clock, campfires & sleeping through the night
User request: *« À rajouter aussi sur le mode multi l'heure et possibilité de faire un feu de
camp et dormir pour passer la nuit. »* The party's clock on the big screen (day, time, the
weather) like the solo HUD; anyone can **build a campfire** (a phone button / the host menu,
a few sticks from the ground, once every so often), a cosy fire that lights the night, heals
and warms whoever sits around it; when night falls, **sleeping by the fire**: each phone
says "Sleep", when everyone around the fire (or everyone, in split screens) agrees, the screen
fades out and it's morning (saved). Solo keeps its own bed / tent; a campfire in the wild
lands too.

## 3. Spectacle — `src/combat/v4/vfx.js`
Additive, emissive 3D effects on the combat root, pooled: slash arcs that sweep with melee
swings, expanding shockwaves, explosions (flash sphere + embers + a short-lived light at night
+ a scorch decal), lightning (jagged bolts that chain), ice spikes bursting from the ground,
fire columns, pillars of light (heals), a tornado, falling meteors with trails & craters,
projectile trails, bigger crits & kill pops. Every class move, element and boss attack uses them.

## 4. Talent trees v4 (WoW-like) — `src/combat/v4/talents.js`
- 4 heroes × 3 branches (specialisations) × 5 rows: row 1 two talents (3 ranks), row 2 two
  talents (2 ranks), row 3 two talents (1 rank), row 4 one talent (2 ranks), row 5 the
  **capstone: an ultimate ability**. Rows open with points spent in the branch (0 / 3 / 6 / 9 /
  11). 15 points max a branch; level cap 30 → 29 points: a full branch and most of another.
- Talents change stats *and* mechanics (crit damage, execute, chain lightning, burning,
  shields, extra projectiles, pull, stuns, auras, cooldown resets on kills…).
- Storage `prof.talents[cls] = { id: rank }` (old v3 lists migrate: known ids keep rank 1).
- **Ultimates** (12): a gauge fills as you fight; **hold the special** (or G / R3 / the phone's
  U button) to unleash it. Knight: Bulwark · Tempest · Earthshaker. Mage: Meteor Storm ·
  Absolute Zero · Arcane Barrage. Ranger: Deadeye · Carpet Bomb · Shadow Dash. Bard: Hymn of
  the Hearth · Symphony · Encore!
- UI: the Hero page's talent tree (icons, ranks, connectors, points per branch, tooltip,
  reset), and the phone's talent screen likewise.

## 5. Weapons — `src/combat/v4/weapons.js`
- Per hero, four weapon types with their own model, combo, heavy and feel: Knight — frying pan,
  rolling pin (fast 4-hit), mallet (slow, shockwaves), wooden sword (reach); Mage — star wand,
  staff (piercing orbs), crystal orb (chain lightning), spellbook (fans of bolts); Ranger —
  slingshot, bow (charged arrows), boomerang (comes back), blowpipe (poison darts); Bard —
  lute, drum (beats around you), flute (long notes), harp (homing notes).
- Items: common / rare / epic / legendary, item level, a **trait** from rare up (blazing,
  frostbite, storm, venom, vampiric, swift, mighty, giant, echo, lucky), legendaries named with
  a unique effect. Chests and guardians drop them; a **weapon slot** in the Gear page / phone.

## 6. Buildings you can enter
Houses, inns, shops and temples of the wild lands (and, in Party Mode, the valley's) open:
rooms built like the valley's interiors, placed in the big world's scene off the map so every
player (split screens included) can walk in on their own; lamps, furniture, a keeper, a bed to
rest (solo: sleep & save at an inn), a chest.

## 7. Polish, translations, README, regression (solo story, Party Mode 1/4/8)

## Milestones (each tested, captured, committed & pushed)
A1 mounts swim ✓ · A2 icons & action bar ✓ · A2b clock, campfires & sleep ✓ · A3 vfx & spectacular moves ✓ · A4 talents v4 & ultimates ✓
· A5 weapons ✓ · A6 buildings ✓ · A7 polish ✓.
