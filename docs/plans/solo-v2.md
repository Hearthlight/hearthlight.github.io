# Solo v2 — the solo game gets the whole Party Mode world (and a phone)

User request (after Party Mode v3): *« je voudrais qu'on rapproche le mode solo qu'il ait tous
les mêmes choses + possibilité de jouer depuis le tel aussi en solo »* — the solo game should
have everything Party Mode has (the big world, swimming, vehicles, mounts, fights, bosses,
talents & gear, waystones, secrets, races, world events…) and be playable with a phone as the
controller.

This lifts the old rule "solo mode must never change": the solo **life sim** (story, villagers,
farm, fishing, shops, home, festival) stays exactly as it is — the valley is still its heart —
but the valley now opens onto Party Mode's wild lands.

## Architecture

- **`src/solo/wild.js` — `Wild`, a "party of one".** Party Mode's systems (`src/party/*.js`,
  `src/combat/*`) talk to a `party` object. `Wild` implements the part of that interface they use
  (`players`, `world`, `r3d`, `big`, `combat`, `cam`, `toast`, `showBanner`, `buzz`, `ask`,
  `profileOf`, `fadeTo`, `wait`, `spawnNpc`…), backed by the solo `World` scene, with one
  player: the solo hero (`world.player` + an input adapter). It owns the `BigWorld` (attached
  while the solo game runs) and the systems: zones, swim, vehicles, mounts, combat, camps, lairs,
  progress, travel, secrets, races, events, the Festival Ring.
- **Refactors in the party systems** (Party Mode must keep working exactly the same):
  - `party.exploring()` replaces the seven copies of "`actKind === 'explore' && act is an
    ExploreAct`"; `Wild.exploring()` = outdoors, no cutscene.
  - `party.loadSave(name, def)` / `party.writeSave(name, v)` replace the systems' own
    localStorage keys (same keys in Party Mode: `hearthlight.party.<name>.v1`); in solo they
    live in the solo save (`state.wild[name]`), so a new game starts the wild lands afresh.
  - The explore act's chests move to a shared `Chests` helper (`src/party/chests.js`).
  - `BigCollision` gets a walk hook so the valley's bridge follows the story in solo.
- **The hero's profile** (hero class, level, xp, talents, gear, stardust, mounts) is
  `state.hero` in the solo save.
- **Peaceful valley**: fights only happen out in the wild lands. Outside the valley the hero
  carries their weapon (A attacks when there's nothing to use); back home, tools again.
- **Controls** (solo): keyboard E use/attack · Space jump · Shift run · F special · C dodge /
  whistle / get off; gamepad A · B · X special · Y dodge, Start menu, Select map, LB/RB hotbar,
  L3 bike. Touch: Special & Dodge buttons appear in the wild.
- **Big-screen Hero tab** in the menu: hero class, level, talents, gear, mounts — for keyboard,
  gamepad and touch players (and the phone has its own screens).
- **Phone in solo**: Settings → "Play with your phone" hosts a room (same relay) and shows a
  QR code; the phone becomes the controller (stick, A/B/X/Y, Bag / Map / Journal / Hero, the
  hotbar, labels & hints from the game); menus are driven with the stick and A/B.

## Milestones (each tested, captured, committed & pushed)

1. **S1 — The wild lands open**: BigWorld in the solo overworld, camera & streaming, zones
   (music, weather, banners), world map & minimap outside the valley, save/load outside the
   valley, the refactors above.
2. **S2 — Swimming, vehicles & mounts** in solo, controls, taming on the big screen.
3. **S3 — Fights & the hero**: hero class, combat in the wild, camps, guardians, chests with
   gear, XP, talents & gear UI, naps (wake at a waystone), difficulty.
4. **S4 — Wild content**: waystones & travel, wanderers & Pim, secrets, races, world events,
   the Festival Ring.
5. **S5 — The phone as the solo controller**.
6. **S6 — Polish, translations, README, screenshots, regression** (solo story & Party Mode).
