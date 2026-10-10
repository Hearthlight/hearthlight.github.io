# Hearthlight — French translation guide

The game is a cozy, gently funny pixel-art life sim. The French should feel
written by a French person for friends: warm, playful, natural — never stiff or
literal. Keep jokes as jokes (adapt them if a pun doesn't survive).

## How strings are translated

- `src/i18n.js` — `t(english, vars)` looks the **exact English source text** up
  in the French dictionary (`src/lang/fr/*.js`); missing entries fall back to
  English. So dictionary keys must match the English string **character for
  character** (same punctuation, same typographic apostrophes `’`, same `\n`).
- `{placeholders}` are filled after translation: keep every `{name}`, `{pet}`,
  `{petkind}`, `{n}`, `{item}`… exactly, but move them where French needs them.
- Colour tags `{npc}…{/}`, `{gold}…{/}`, `{item}…{/}`, `{place}…{/}`,
  `{#8fe0ff}…{/}` must be kept (wrapping the translated words).
- The dialogue box (`say`, `ask`/`choose`, `showLetter`) translates by itself.
  For text built with `${…}` template literals, rewrite the English into a
  template with `{placeholders}` and pass the values as `vars`
  (`w.say(who, text, expr, vars)`, `w.ask(who, text, options, cancel, vars)`).
- Anything else drawn on screen goes through `t()` (import from
  `../i18n.js`). Plurals: `tn('{n} fish', '{n} fish', n)`. Numbers: `num(n)`.
- Check coverage with `node tools/i18n-scan.mjs [path] [--list]` and syntax
  with `node --check file.js`.

## Style

- **Tutoiement** everywhere: villagers and the game speak to the player with
  « tu ». Villagers speak to each other with « tu » too.
- French typography: write a normal space before `! ? : ;` and inside
  `« … »` — `t()` turns them into non-breaking spaces automatically. Use `’`
  for apostrophes (not `'`, which would need escaping in JS strings) and
  `« »` for quotes in dialogue. Ellipsis `…`.
- UI labels short (screens are small): prefer « Sac » to « Inventaire »,
  « Réglages » to « Paramètres ».
- Units: coins stay `¢` (« 120 ¢ »), keep numbers as they are.
- The pixel font supports: all accented French letters (é è ê ë à â ä î ï ô ö
  ù û ü ç œ æ É È Ê À Â Î Ô Ù Û Ç Œ), « », €, ’, …, ♥ ★ ♪ → ← ↑ ↓ ✓ · °.
  Nothing else (no emoji).

## Clarity (the story must be easy to follow, read aloud to a sofa of friends)

- **One idea a line, two short sentences at most.** A line fits three rows of the dialogue
  box: about 150 characters in French, less is better.
- **One joke a scene**, after the useful part, never in the middle of an explanation. A
  running gag (Hollis’s tea, Crumble’s titles, the Understudies’ pose, the hen) comes once a
  chapter.
- **What must be understood is marked** with `{key}…{/}` (drawn bold, in colour): the goal, the
  place to go, the thing to bring, who to see, a number. One mark a line, two on a line that
  gives an order, four words at most inside, never on a joke. The English line and the four
  languages carry the same marks.
- **A scene that sends the player somewhere ends on that order**, said plainly: who, where,
  what. The objective line that follows says the same thing in the same words.
- Every quest has a `brief` (why we do this: one or two short sentences) and every chapter a
  `recap` (the story so far and this chapter’s goal: three short sentences); they are what a
  player who got lost reads on their phone.
- Plain spoken French: « on » more than « nous », no rare word where a common one does, no
  sentence a ten-year-old must read twice.

## One story (what the ten chapters must agree on)

- **Recaps, briefs and objectives speak to the player**: « tu », with the « vous » twin in
  `__group` — never « on » / « il faut ». A recap opens on the previous chapter’s last state, in
  the same words (the same name for each Great Hearth, each land, each person), then gives this
  chapter’s goal.
- **The lantern’s flames** — a line, a recap or a title gives a number only if it is this one:
  Old Glimmer 1 · the Deepwood 2 · the Steppe 3 · Croakmire 4 · chapter 5: 3 when the Duchess snuffs Croakmire again, then 4 with the South · chapter 6: 5 (Croakmire’s flame comes home) · the Dawn Hearth 6 · the Heartlight 7 · Hollowmoor Manor 8. The flames the Duchess carries are « les flammes volées »: they are hers until the
  finale, and are never counted with the lantern’s.
- **Place names are the map’s** (`src/lang/fr/world.js`, `world_v7.js`): la Balafre d’Ombre, les
  Sources Prismatiques, Rouageville (the town) and les Hauts-Rouages (its land), la Toundra des
  Aurores, le Camp des Aurores, Bout-de-Chandelle, Coassemarais, le Vieux-Ponctuel.
- **A Great Hearth that is relit** « brûle à nouveau »; the Duchess « éteint » a Hearth (she
  « éteindra à nouveau » the ones we relight: chapters 3 and 5 say it in the same words).
- **A creature’s name sounds like a creature**, never like the weather (the Bogling is
  « Gadouillon », not « Tourbillon »). « le brouillard » is real mist only (the falls of chapter
  2, the moor at dusk); the fog that puts out the Dawnlands’ lamps is the Murk: « la Brume ».
- **The running gags’ ledger** — a pay-off in chapter 10 was planted at least twice, in the same
  words: Hollis’s tea (« le maire Hollis en renverse son thé »: chapters 1 and 2, then the
  Festival); the hen (1, 3, 6, 9, then the Festival); not being invited (the Understudies in 6,
  the mimes in 7, then the letter: « Ils… m’avaient INVITÉE ? »); Perkins’s lateness (seven
  weeks in 1, thirty years of mail in 7, the letter in 10). Crumble says « Votre Obscurité »
  once, in chapter 1; in chapter 10 he drops it for her real name.

## Names

People keep their names: Hollis, Rosa, Pip, Finn, Ivy, Theo, Mabel, Sol, Wren,
Bram, Juniper, Marlo, Pim, June (the player's grandmother — « Mamie June »),
Buttercup (Bram's cow), Captain Snuggles → « Capitaine Câlin ».

| English | Français |
|---|---|
| Hearthlight | Hearthlight |
| Marigold Cove | Marigold Cove (proper name, keep) |
| the cove | l’anse / la baie (« la crique » ok) |
| Old Glimmer (the lighthouse) | la Vieille Lueur |
| Glimmer Shard(s) | Éclat(s) de Lueur |
| Nana / Nana June | Mamie / Mamie June |
| Nana’s Cottage | La chaumière de Mamie |
| Market Plaza | Place du Marché |
| Honeydew Fields | Champs de Miellée |
| Whisperwood | Bois-Murmure |
| Whisperwood Camp | Camp de Bois-Murmure |
| Old Oak Shrine | Sanctuaire du Vieux Chêne |
| Waterfall Lake | Lac de la Cascade |
| Glowcap Grove | Bosquet Luisant |
| Starfall Hill | Colline des Étoiles filantes |
| Willow Lake | Lac des Saules |
| Lavender Rows | Rangs de Lavande |
| Sunpetal Meadow | Pré Pétale-de-Soleil |
| Mirror Pond | Étang Miroir |
| Seagull Bluffs | Falaises aux Mouettes |
| Turtle Isle | Île aux Tortues |
| Driftwood Beach | Plage du Bois flotté |
| Sunset Shore | Rivage du Couchant |
| Frostpine Ridge | Crête des Pins givrés |
| Blossom Glade | Clairière des Cerisiers |
| Reedmarsh | Marais des Roseaux |
| Maple Hollow | Combe aux Érables |
| Old Glimmer Point | Pointe de la Vieille Lueur |
| the Standing Stones | les Pierres levées |
| Festival of Lights | Fête des Lumières |
| Starfall Festival | Festival des Étoiles filantes |
| Sky Lantern | Lanterne céleste |
| Star Charm(s) | Charme(s) étoilé(s) — Sun/Frost/Leaf/Koi/Star Charm → Charme du Soleil / du Givre / de la Feuille / de la Carpe / de l’Étoile |
| stardust | poussière d’étoiles |
| hearts (friendship) | cœurs |
| shipping crate | caisse d’expédition |
| notice board | panneau d’affichage |
| town projects | projets du village |
| journal | journal |
| critter log | carnet des bestioles |
| Party Mode | Mode Fête |
| the gloom (the dark stuff, the force) | l’Ombre (« pris par l’Ombre », « un feu d’Ombre ») — never « la grisaille » |
| the gloom (its creatures, as a crowd) | les Ombres (« Chasse les Ombres des champs de Bram ») |
| Gloomling(s) / Big Gloomling | Ombrelin(s) / Gros Ombrelin |
| gloom camp / gloom nest | camp d’Ombres / nid d’Ombres |
| Gloom Waves / Gloom invasion (a group of them) | Vagues d’Ombres / Invasion d’Ombres — « d’Ombres » for a crowd, « d’Ombre » for one creature or a thing made of it |
| Gloomy Fox / Stag (an animal it has taken) | renard / cerf pris par l’Ombre |
| Gloom + creature (Gloom Kraken, Gloom Hen…) | … d’Ombre (Kraken d’Ombre, Poule d’Ombre, Sanglier d’Ombre, Ogre d’Ombre) |
| gloomed, gloomy (a creature it has taken) | pris(e) par l’Ombre |
| the Gloomstage | le Théâtre d’Ombres |
| Your Gloominess (Crumble’s garbled titles) | Votre Obscurité |
| Duchess Gloria Gloomsworth | la Duchesse Gloria de Grisemine (kept: « faire grise mine ») |
| the Murk | la Brume Mauve |
| Gustbelly / Storm Ram | Soufflard / Bélier d’orage |
| Bogling (a heap of mud with a face) | Gadouillon |
| the Umbral Scar / the Umbral Spotlight (« Umbral » is always « d’Ombre ») | la Balafre d’Ombre / le Projecteur d’Ombre |
| Her Radiance (the Duchess’s own title) | Sa Splendeur |
| the Dauntless Teacup / the Teacup (Wendy’s airship) | la Tasse Intrépide / la Tasse (never « la Théière ») |
| Minnow / Fidget / Brick (all three « il ») | Fretin / Frétille / Brique |
| Perkins, postmaster | Perkins, facteur en chef |
| the fog (over Lanternport: it is the Murk) | la Brume |
| waystone / attune | pierre de voyage / éveiller (une pierre) |
| Grumblecloud | Grognuage |
| wave(s) | vague(s) |
| arena | arène |

Menus: Bag → Sac · Journal → Journal · Friends → Amis · Collection → Collection
· Map → Carte · Settings → Réglages · Continue → Continuer · New Game →
Nouvelle partie · Save game → Sauvegarder.
