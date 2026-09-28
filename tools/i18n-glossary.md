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
| gloom / Gloomlings | la grisaille / les Grisouilles |
| waystone / attune | pierre de voyage / éveiller (une pierre) |
| Grumblecloud | Grognuage |
| wave(s) | vague(s) |
| arena | arène |

Menus: Bag → Sac · Journal → Journal · Friends → Amis · Collection → Collection
· Map → Carte · Settings → Réglages · Continue → Continuer · New Game →
Nouvelle partie · Save game → Sauvegarder.
