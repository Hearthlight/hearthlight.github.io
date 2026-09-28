# Hearthlight — Spanish translation guide (español neutro)

Hearthlight is a cozy, gently funny pixel-art life game with a big theatrical story (a diva of the
dark snuffs the world's lights; you carry your grandmother's lantern and relight them). The Spanish
must read as if it had been **written for this game by a native writer**: warm, playful, clear,
never literal. Keep jokes as jokes — when a pun dies in translation, invent a new one that does the
same job (see *Wordplay*). If a line sounds translated, rewrite it.

Read this with `tools/i18n-glossary.md` (the French guide: how strings, placeholders and tags work)
and `tools/i18n/names-es.json` (1448 names and labels already fixed — **use them verbatim**; this
guide's term table agrees with it). The French dictionaries (`src/lang/fr/*.js`) are the best model
of the spirit wanted — but translate from the **English**, and don't copy French slips (see
*Gender*).

---

## 1. How strings work (short version)

- `t('English', vars)` looks the **exact English text** up: a Spanish file `src/lang/es/<same>.js`
  mirrors each French file key for key (keys = the English, character for character — same `’`,
  same `…`, same `\n`). Values are the Spanish.
- Keep every `{placeholder}` (`{name}`, `{n}`, `{item}`, `{zone}`…) and every tag pair
  (`{npc}…{/}`, `{gold}…{/}`, `{place}…{/}`, `{big}…{/}`, `{shake}…{/}`, `{wave}…{/}`,
  `{#8fe0ff}…{/}`) and the pauses `{p}` / `{pp}`. Move them where Spanish needs them; wrap the
  translated words.
- `¿` and `¡` go **inside** a tag, with the words they open: `{big}¡DE LA GALLINA NO SE HABLA!{/}`.
- Chapter dictionaries have a `__group` section: the lines said **to the whole party** in Party
  Mode (see §2). Same keys as the French `__group`; nothing else goes there.
- Check a file with `node tools/i18n-check.mjs src/lang/es/ch1.js` (or `node tools/i18n-check.mjs es`
  for all): missing/extra keys, tags that don't match, lines left in English or French.
- Strings are JS single-quoted: use the typographic apostrophe `’` if you ever need one (Spanish
  rarely does), never `'`.

## 2. Register: «tú» in solo, «ustedes» for the party

- **Solo: tú.** The game, the narrator and every villager speak to the player with *tú*
  (`Habla con el alcalde Hollis`, `Tu farol parpadea`). Villagers speak to each other with *tú*.
- **Party Mode `__group` lines: ustedes**, with **3rd-person plural verbs and pronouns**:
  `Hablen con…`, `Busquen…`, `¿Lo ven?`, `Los estábamos esperando`, `les`, `su/sus`.
  **Never *vosotros*** (*id, tenéis, os, vuestro*) and never *vos*.
  - Why *ustedes*: most of our players are in the Americas (the game is announced on Reddit; its
    server is in Canada), where *ustedes* is the only plural «you» — *vosotros* reads foreign or
    stilted there. In Spain *ustedes* is perfectly understood (it is the polite plural, and the
    everyday plural in the Canaries and western Andalusia), so it is the one form everyone reads
    naturally. It also sits well in a cozy game: warm, not stiff, when paired with friendly words.
  - *su* is ambiguous (your / his / their): when it could confuse, write `el farol` (the party
    carries one lantern anyway), `el farol de ustedes`, or rephrase.
- **Imperatives in objectives**: solo `Explora la Gruta del Destello` · group
  `Exploren la Gruta del Destello`. Quest *titles* are nouns and never change.
- **Plural «you» in solo lines too.** Where the English (and the French solo line) addresses a crowd
  or «the heroes» as a bunch — Crumble's announcements, the Duchess taunting «the Wick Brigade»,
  «you two» to the lost hikers — use *ustedes* in solo as well (`¡ALTO, héroes! Han llegado a…`).
- **Usted (singular)** only where someone addresses royalty or their boss: Crumble and the
  Understudies to the Duchess (`¡Perdón, Su Grisallencia! ¿Quiere que…?`), Sir Newton to King
  Croakington (`¡Su Majestad! Se la arrebató…`). The player always gets *tú*.
- King Croakington uses the royal **«Nos» / nuestro** about himself (`Nos tenemos frío otra vez`,
  `¿Esa es Nuestra llama? ¿En un FRASCO?`).

## 3. Neutral, international Spanish

Write the Spanish of a good dubbed cartoon or a children's classic: understood from Madrid to
Buenos Aires, owned by no one country. When a word splits the Spanish-speaking world, pick the
neutral one, or rephrase.

| Avoid (regional) | Write instead |
|---|---|
| vale, guay, mola, chulo, tío/tía (dude), flipar, ¡hostia!, ¡joder! | de acuerdo, bueno, genial, precioso, increíble, ¡caramba!, ¡ay! |
| chévere, chido, padre, bacán, copado, ¡órale!, ¡híjole!, ¡che! | genial, estupendo, ¡vaya!, ¡uy! |
| ahorita, platicar, ¿mande?, apurarse | ahora, charlar, ¿cómo?, darse prisa |
| **coger** (vulgar in much of Latin America) | tomar, agarrar, recoger, atrapar |
| **bicho** (vulgar in Puerto Rico and Venezuela) | animalito, criatura, bestia, insecto |
| **concha** (vulgar in the Southern Cone) | caracola (a shell), caparazón (a turtle's) |
| **pico** as a mountain name (vulgar in Chile) | cumbre, cima, monte (`Cumbrehelada`, `Monte Brasa`); *picotazo* (a peck) is fine |
| polla, pija/pijo, cajeta, paja, correrse | pollito, presumido/elegante — and just never |
| ordenador / computadora, coche / carro | rephrase (the game hardly needs them) |
| móvil / celular | **teléfono** (the phone controller, always) |
| mando (gamepad) | **control** — see below |
| gafas / anteojos | **lentes** (`Lentes de sol`) |
| tirachinas / resortera / gomera | **honda** |
| melocotón / durazno | avoid (the skin tone is `Rosado`) |
| patata / papa | rephrase if you can; else *papa* |
| enfadarse / enojarse | molestarse, ponerse furioso, (`¡Qué rabia!`) |
| aparcar / estacionar | amarrar (a boat), posarse (a pelican), dejar |
| piña (pinecone in Spain, pineapple in America) | `piña de pino` for the item; skill names may say *piña* |
| papalote, barrilete, volantín | **cometa** (a kite: *la cometa*; a comet is *el cometa*) |

Pan-American standard words with no neutral twin are fine (`overol`); so are Spanish words that
Americans read without trouble. Diminutives: *-ito/-ita* (universal); avoid *-ico*, go easy on
*-illo*. Past tense: the simple preterite reads naturally everywhere (`Nadie me invitó`,
`¿Viste eso?`); use the perfect only where it is natural on both sides of the ocean
(`Nunca he visto nada igual`).

**Gamepad → «control»** (plural *controles*). It is the word of Latin America, of the Xbox,
PlayStation and Nintendo Latin American sites, and Spanish players understand it (they say *mando*,
which Americans would not). The Controls screen is **Controles** with the tabs
`Teclado · Control · Teléfono`. In a sentence where «control» could be misread, say
`el control (gamepad)` once, or `un control de consola`. The analog stick is `stick`; a key is a
`tecla`; buttons are named by the game itself (never write a key name into a line).

Device verbs: **presiona** (a button or key), **toca** (a touch screen), **mantén presionado**
(hold), **haz clic**. Big screen = `la pantalla grande` (or `la tele` in banter).

## 4. Typography

- **Always the opening marks** `¿` and `¡`, placed where the question/exclamation really starts:
  `Hm, ¿ya es la hora del té?` · `Bueno.{p} ¡Bueno!` · `¿Puedo…{p} puedo tocarlo?`
  A line cut off mid-question keeps its opening mark: `Ooooh. ¿Puedo—`
- **No space** before `! ? : ;` (that's French). No spaces inside quotes: `«Hola»`.
- Quoted speech inside a line, letters quoted by the narrator, signs: **« »**
  (`they say “bawk”` → `dicen «cloc»`). The English “ ” become « ». Nested:
  «… “…” …» (the font turns “ ” into plain quotes).
- Ellipsis `…` (one character). Em dash `—` for interruptions and asides, as the English uses it
  (`Ladies and gentlemen—{p} wait` → `Damas y caballeros—{p} esperen`). Don't add dialogue
  *rayas*: the dialogue box already names the speaker.
- **Sentence case** for quest and chapter titles (`Una chispa en la oscuridad`,
  `La sombra sobre el hielo`); capitals for proper names of places, dungeons, bosses, ships,
  factions and the game's own things (`la Gruta del Destello`, `el Gran Hogar`, `la Bruma Malva`,
  `la Taza Intrépida`, `los Faroleros`). Days and months are lowercase in running text.
  names-es.json gives standalone forms (`El Viejo Destello`); mid-sentence the article is lowercase
  (`…bajo el Viejo Destello`).
- CAPITALS for shouting, as in the English (the Duchess and Crumble shout a lot).
- Numbers stay as they are (`num()` formats them). Coins stay `¢` (`120 ¢`). Times: in dialogue
  `a las 7 de la tarde`; on signs `8:00 – 19:00`.
- The pixel font draws: A–Z a–z 0–9, `á é í ó ú ü ñ Á É Í Ó Ú Ü Ñ ¿ ¡ « » … — – ’`, the usual
  punctuation and `× ¢ € ♥ ★ ♪ → ← ↑ ↓ ✓ · °`. **No emoji, no other letters.**
- Onomatopoeia: hen `¡cloc, cloc!` (a hen's «bawk») · frog `¡croac!` · cow `¡muuu!` · owl
  `¡uh-uuh!` · kiss `¡muac!` («Mwah!») · sneeze `¡aaachís!` · drumroll `¡tatatatá… tachán!`
  («Ta-daaa» = `¡Ta-chán!`) · laugh `¡ja, ja, ja!` · wow `¡guau!` · ouch `¡ay!`.

## 5. UI brevity

Spanish runs 20–30 % longer than English and the screens are tiny. For buttons, tabs, labels and
hints:

- Short words first: `Ajustes` (not *Configuración*), `Mochila`, `Diario`, `Tareas` (the short
  journal tab), `Tesoros`, `Volver`, `Omitir`, `Salir`, `Listo`, `Guardar`, `Vista`.
- Action buttons are **infinitives**, one word when possible: `Hablar`, `Mirar`, `Usar`, `Regar`,
  `Brincar`, `Subir`, `Remar`, `Tocar`. Hints are short imperatives: `Presiona A para subir`.
- Abbreviations the game already uses: `Prof.`, `Sra.`, `Ajust.`, `Lun Mar Mié Jue Vie Sáb Dom`.
- Labels that sit alone agree with a noun you don't see: day length and text speed are feminine
  (`Tranquila`, `Normal`, `Rápida`), difficulty too (`Relajada`, `Exigente`, `Heroica`), the HUD
  display options go with *vista* (`Completa`, `Compacta`, `Mínima`), weapon traits are nouns
  (`Llamas`, `Escarcha`, `Suerte`…) so they never need agreeing.
- If a label is still too long, cut words, not letters — and never break a term from the table.

## 6. Gender

- **The player's gender is unknown.** Never let an adjective or noun about the player agree:
  not *¿Estás listo?* but `¿Todo listo?`; not *Bienvenido* but `¡Qué alegría verte!` /
  `Te damos la bienvenida`; not *eres un héroe* but `eres toda una leyenda`, or rephrase
  (`Nadie lo habría hecho mejor que tú`). Epicene nouns help:
  *persona, estrella, tesoro, cielo, leyenda, alma, joya*. No «@», «x» or «-e» endings.
- Awards and titles given to players are epicene nouns (names-es: `Canguro de oro`,
  `Encantagallinas`, `Trotamundos`, `Corazón de oro`, `Marmota`, `Cazatesoros`…).
- Class names are labels in the generic masculine (`Caballero`, `Explorador`, `Farolero`,
  `Cocinero`…); in dialogue don't call the player by one (`la de la sartén` genders too — say
  `tú, con la sartén`).
- Groups (`__group`): the generic masculine plural is standard Spanish and acceptable
  (`¿Listos?`), but a neutral turn is nicer when it's free (`¿Todo el mundo listo?`,
  `¿Empezamos?`).
- Cast genders to respect: the three Understudies — **Alevín, Tembleque and Ladrillo are all
  male** (the English says «his»; the French titles slipped into the feminine — don't follow them).
  Captain **Marlo is a woman** (`Capitana Marlo`, she writes to «her sister»). Juniper, Ivy, Mabel,
  Rosa, Hazel, Tansy, Dolly, Tuya, Saffron, Bess, Hoshi, Mei, Tamsin, Blanche, Nimbus, Rhoda, Tallow,
  Yuki, Mochi, Marrow, Marisol, Honoria, Posy, Gloria are women. **Wren, Moss and Kai are left
  unspecified**: keep them epicene (`Artista`, `Moss, buscahongos`, `Kai, buscaperlas`) and avoid
  adjectives that agree with them.

## 7. Voices

- **The Duchess — Duquesa Gloria de Malacara.** A failed diva: grandiloquent, petty, theatrical.
  Big words and CAPITALS, sings her threats (`♪ …♪`), opera and stage vocabulary (`¡Telón!`,
  `el entreacto`, `mi estreno`, `el programa de mano`), Italian flourishes (`¡Brava!`,
  `¡Ciao, ciao!`), `¡Muac!`, calls everyone `queridos` / `tesoros` / `cariños`. She never gets the
  heroes' name right: **la Brigada Mechita**, **los Lamefaroles** (invent more in that vein:
  `los Farolitos`, `la Pandilla Pabilo`). Talks about herself in the third person when grand
  (`Una Malacara nunca se pierde su entrada`). Terrified of hens. Catchphrase, always the same
  words: **«*Nadie* me invitó.»** When she softens (ch9–10), drop the capitals and flourishes:
  short, plain, trembling sentences.
- **Crumble — Migaja.** Her tiny herald-stagehand-drummer. Bombastic announcements
  (`¡DAMAS, CABALLEROS Y FAUNA SURTIDA!` / `…¡Y LAMEFAROLES SURTIDOS!`), drums his own roll
  (`¡Tatatatá…!`), grovels with *usted* and a **new mangled honorific every time**:
  `Su Grisallencia`, `Su Apagancia`, `Su Lobreguez`, `Su Tenebrosidad`, `Su Sombrísima`… (the right
  one is **Su Esplendor** — «Her Radiance»). Her titles through his mouth:
  `la Duquesa del Crepúsculo, la Condesa de las Nubes, la Baronesa del…{p} del…{pp} ¡del Mal
  Tiempo!`. Puns on snuffing: `¡Apagando el Apagavelas, Su Apagancia!`. Loyal and sweet
  underneath — his little asides (`…Por favor, no se lo digan.`) are where the heart is.
- **The Understudies — los Suplentes.** **Alevín** (tiny, bossy, the leader: showbiz clichés,
  `¡Solo por una noche!`, `¡Nuestra gran oportunidad!`, barks orders). **Tembleque** (thin, nervous,
  overthinks: `Bueno… o sea… técnicamente…`, answers questions with questions). **Ladrillo** (huge,
  gentle, one word at a time, speaks of himself in the third person: `Brasa.` · `Malabares.` ·
  `A Ladrillo no le gusta esta dirección.`). Their team pose always collapses. «Exit stage left!»
  is **`¡Mutis por el foro!`** (and its variants: `¡Mutis… por el… FONDO!` when they sink).
- **Nana June — la abuela June.** The last Lamplighter: warm, mischievous, knits, knows more than
  she says. Letters open `Mi tesoro:` / `Cariño:` (epicene — never *mi niño/niña*), advice with a
  wink (`Sé valiente, sé amable y ponte bufanda.`), sign `— June` or `Con todo mi cariño,
  la abuela June ♥`. Paragraphs separated by `\n\n`, as in the English.
- **Mayor Hollis — el alcalde Hollis.** A genteel, long-winded old mayor with a speech for every
  occasion; `¡Caramba!`, `Vaya, vaya`. His running gag: **`Se me cayó el té.`** — and the narrated
  cutaway that ends each chapter: `En algún lugar, a un alcalde muy mayor se le cae el té.{pp} Otra
  vez.` Keep that *se le cae el té* formula every time.
- **Perkins** of the **Correo Pelícano**: a proud, officious pelican postmaster, always late:
  **`¡El Correo Pelícano entrega!{pp} Tarde o temprano.`** Tips «in fish» → `en pescado`. He drops
  you «slightly off» → `un poquito desviados` / `un pelín lejos`.
- **Captain Wendy — Capitana Wendeline Ventolera** of **la Taza Intrépida**: cheerful, reckless
  aviator, clipped telegraph jokes (`Té: cargado. Nervios: más cargados.`), `¡Todos a bordo!`,
  `Próxima parada:`, `Tiempo estimado de vuelo: una tetera`. **Nibs**, her albatross first mate
  (name kept), is afraid of heights: short, panicky lines.
- **Professor Hazel Burrows — la profesora Avellana Madriguera.** A mole scholar, big glasses, lost
  in her notes; academic words and excitement (`¡Ay, ay, AY!`), her footnotes stay footnotes:
  `(Nota al pie: y dinamita. Nota a la nota: y topos CON dinamita.)`
- **Master Tock — el Maestro Tac.** Clockwork precision: short measured sentences, exact figures,
  counts ticks (`¡Visitas! En tres tics estoy con ustedes. Tic. Tic. Tic. Aquí estoy.`), rules by
  number (`la regla número nueve`).
- **Pip** (8). Excitable, CAPITALS when thrilled, kid words that travel (`¡GUAU!`, `súper`,
  `de verdad de verdad`, `porfa`) — no regional kid slang. **His letters**: all lowercase, no
  opening `¿¡`, missing accents, a few phonetic slips a Spanish-speaking eight-year-old makes
  (*h* dropped or added, *b/v*, *ll/y*, *s/c/z*: `ola`, `tanbien`, `boy a ir`, `aser`), and his
  CAPITALS for emphasis. Readable and sweet, 3–5 slips per letter, never mocking. E.g.
  `ola {name}\n\nesta es mi SEGUNDA caracola mas bonita. la mas bonita es un secreto. tu eres mi
  segunda persona faborita. la primera tanbien es secreto (es Mochi no le digas)\n\ncuidala
  mucho!!!` — signed `— Pip (8 años)`.
- **The narrator.** Warm, wry, present tense, short sentences, understatement; `tú` in solo
  (`Tu farol parpadea.`), and in `__group` prefer an impersonal turn (`El farol parpadea.`).
- **Hub folk, briefly.** Old Rowan (calm, talks to trees: `Tranquila, vieja amiga.`) · Tansy (eager
  apprentice, apologises mid-sentence) · Sheriff Dolly (western: `forasteros`, `alimañas`,
  `Te debo una. No le debo a mucha gente. Llevo una lista.`) · El Viejo Bum (booming, nostalgic
  circus veteran) · King Croakington (royal *Nos*, a cold: `¡Achís!`) · Grandmother Bellows
  (`Abuela Fuelle`: one… word… at… a… time) · Old Hoshi (gruff: `Hmpf. Cuánto tardaste.`) ·
  Brother Bao (a vow of riddles) · Lady Honoria (a ghost, faded and formal, waiting for tea).

## 8. Wordplay and running gags

- **Re-invent, keep the function.** A pun must stay a pun, a deflation a deflation, a callback a
  callback. Translate the joke, not the words; don't explain it; don't add a joke where there was
  none. Cultural winks must be pan-Hispanic (films, fairy tales, sayings everyone knows), never one
  country's TV.
- Models from names-es.json: Lamplighters **Faroleros** → the Duchess's **Lamefaroles**;
  snuffer **Apagavelas** → **Apagabot 3000**; the Knight's pan slam **Sartenazo**; **Sir Fatuo**
  (a will-o'-the-wisp who is *fatuo*); **Sir Bellota el Verde** (unripe *and* green); **Cumbres
  Ventosas** (a wink at *Cumbres borrascosas*); **Saltan chispas**; **Storm Lamp / Lamp Storm →
  Farol de tormenta / Tormenta de faroles**; the boomerang legendary **Vuelta a Casa**; **¡Hasta el
  fregadero!** (everything but the kitchen sink); **Familia numerosa**; **Gone With the Wind →
  Lo que el viento se llevó**; the Mole Brothers **Piqueta, Pala… y Cavo** (two tools and a
  brother whose name is just «I dig»: «Cavo, tenías UN solo trabajo.»); **El Nabo Gigante** (the
  folk tale).
- **The hen**: `la gallina`. `{big}¡DE LA GALLINA NO SE HABLA!{/}` (the Encanto echo is wanted).
  Spanish gives a bonus: *¡gallina!* also means «coward».
- **«Nobody invited me» → «Nadie me invitó.»** — identical every time, so the final letter (her
  invitation, *la invitación*, thirty years late) lands.
- **Crumble's titles** (§7): always a new wrong one, until ch10 where he finally gets it right —
  `¡…LA SEÑORITA GLORIA DE MALACARA!` / `¡Lo dije bien! ¡LO DIJE BIEN!`
- **Hollis's tea** (§7), **Perkins's «Tarde o temprano»**, **the Understudies' pose** and their
  **`¡Mutis por el foro!`**, **Nibs and heights**: keep the same wording each time they come back.
- Invented names for creatures and places follow the names-es patterns: Spanish compounds
  (`Rebotongos`, `Lucihongo`, `Gruñubarrón`, `Taladrosaurio`, `Excavadunas`), aristocratic
  *-ington* names become first-name puns (`Rey Croaquín`, `Anciano Caparacio`).

## 9. Names

- **People keep their first names**: Hollis, Rosa, Pip, Finn, Ivy, Theo, Mabel, Sol, Wren, Bram,
  Juniper, Marlo, Pim, June, Buttercup (Bram's cow), Rowan, Tansy, Barley, Tuya, Temur, Dolly, Nell,
  Grubb, Tobi, Tariq, Zizi, Bess, Hoshi, Mei, Tamsin, Blanche, Marisol, Pembroke, Hob, Posy, Gloria,
  Fen, Bo, Wendy, Nibs, Perkins, Rook, Sigrid, Moss, Kai, Dotty.
- **Descriptive names and nicknames are translated**: Crumble → Migaja, Minnow → Alevín,
  Fidget → Tembleque, Brick → Ladrillo, Hazel → Avellana (the key is shared with the eye colour),
  Old Boom → el Viejo Bum, Snap → Mordisquito, Wick → Mecha, Master Tock → el Maestro Tac,
  Captain Snuggles → el Capitán Mimoso, Barnaby → Bernabé, Morel → Morilla.
- Titles before names: `el alcalde Hollis` (tag `Alcalde Hollis`), `la capitana Marlo`,
  `la profesora Avellana`, `el capataz Grubb`, `la tía Azafrán`, `Sor Nimbo`, `el hermano Bao`,
  `el abad Sen`, `Sir Tritón`. «Old X» is `el viejo X` / `la vieja X` for people
  (`el viejo Rowan`, `la vieja Hoshi`), `el Viejo X` when it is a stage name or legend
  (`el Viejo Bum`, `el Viejo Suertudo`).
- **Marigold Cove** and **Hearthlight** stay as they are. The cove itself: `la caleta`
  (or `la bahía`).

## 10. Glossary — the game's own words

Always these, everywhere (they match `tools/i18n/names-es.json`).

**The world & the story**

| English | Español |
|---|---|
| Hearthlight | Hearthlight |
| Marigold Cove / the cove | Marigold Cove / la caleta |
| Marigold Valley | el Valle de Marigold |
| Old Glimmer (the lighthouse) | el Viejo Destello |
| Glimmer Shard / Glimmer Ember | Fragmento de Destello / Brasa del Destello |
| Nana / Nana June | la abuela / la abuela June (tag `Abuela June`) |
| the gloom (the creatures, the stuff) | la grisalla (`cangrejos de grisalla`) |
| Gloomling / Big Gloomling | grisallín / grisallín grande |
| gloom camp | campamento de grisalla |
| the Murk | la Bruma Malva (short: la Bruma) |
| Great Hearth(s) | Gran Hogar / Grandes Hogares |
| Hearthstone | Piedra del Hogar |
| the Lamplighters / a Lamplighter | los Faroleros / un farolero, una farolera |
| the last Lamplighter (June) | la última Farolera |
| the Lamplighter’s Lantern / June's lantern | el Farol de la Farolera / el farol de June |
| lantern / paper lantern / sky lantern | farol / farolillo de papel / farolillo volador |
| flame / ember / spark | llama / brasa / chispa |
| the Lamplighters’ Road | el Camino de los Faroleros |
| the Wick Brigade / the Lamp-lickers | la Brigada Mechita / los Lamefaroles |
| Your Gloominess / Your Snuffiness / Her Radiance | Su Grisallencia / Su Apagancia / Su Esplendor |
| stardust | polvo de estrellas |
| waystone / attune (a waystone) | piedra de viaje / despertar |
| Pelican Post / roost | el Correo Pelícano / percha |
| the Gloomstage | el Teatro Grisalla |
| the Grand Snuffer | el Gran Apagavelas |
| Snuffbot 3000 · Mk II · Mk III | Apagabot 3000 · Mk II · Mk III |
| the Grand Finale | el Gran Final |
| the Umbral Spotlight / the Umbral Scar | el Reflector Umbrío / la Cicatriz Umbría |
| the Starfall Festival | el Festival de las Estrellas Fugaces |
| Festival of Lights | el Festival de las Luces |
| the Festival Ring | la Arena del Festival |
| the Dauntless Teacup | la Taza Intrépida |
| the hen | la gallina |
| the invitation | la invitación |

**The cast**

| English | Español |
|---|---|
| Duchess Gloria Gloomsworth | la Duquesa Gloria de Malacara |
| Crumble | Migaja |
| the Understudies: Minnow, Fidget, Brick | los Suplentes: Alevín, Tembleque, Ladrillo |
| Mayor Hollis | el alcalde Hollis |
| Perkins (postmaster) | Perkins (jefe de correos) |
| Captain Wendeline «Wendy» Gale · Nibs | la capitana Wendeline «Wendy» Ventolera · Nibs |
| Professor Hazel Burrows | la profesora Avellana Madriguera |
| Master Tock | el Maestro Tac |
| Barkbeard | Barbacorteza |
| Foreman Grubb & the Drillosaur | el capataz Grubb y su Taladrosaurio |
| King Croakington · Sir Newton | el rey Croaquín · Sir Tritón |
| the Frost Tenor | el Tenor Glacial |
| Auntie Saffron · Elder Shellington | la tía Azafrán · el anciano Caparacio |
| Grandmother Bellows | la abuela Fuelle |
| Old Lucky, the Paper Dragon | el Viejo Suertudo, el Dragón de Papel |
| the Moth Queen | la Reina Polilla |
| Lady Honoria, the Lady in Grey | Lady Honoria, la Dama de Gris |
| Captain Snuggles (Pip's bear) | el Capitán Mimoso |

**Lands, hubs & dungeons**

| English | Español |
|---|---|
| the Hearthlands / the Dawnlands / the Wide Sea | las Tierras del Hogar / las Tierras del Alba / el Ancho Mar |
| Whisperwood / Deep Whisperwood | Bosquesusurro / Bosquesusurro Profundo |
| Windy Heights · Bouncecap Woods | Cumbres Ventosas · Bosque de los Rebotongos |
| Golden Steppe · Red Canyon · Dusty Gulch | Estepa Dorada · Cañón Rojo · Polvareda |
| Croakmire · Croakton | Croacénaga · Croacópolis |
| Frostpeak Glacier · Cloud Isles | Glaciar de Cumbrehelada · Islas de las Nubes |
| Sunscorch Dunes · Palm Oasis | Dunas del Solazo · Oasis de las Palmeras |
| Coral Lagoon · Sunken City · Whirlpool Straits | Laguna de Coral · Ciudad Hundida · Estrecho de los Remolinos |
| Emberpeak · Dino Isle · Fern Landing | Monte Brasa · Isla Dino · Embarcadero de los Helechos |
| Whale Isle · Lantern Bay · Lanternport | Isla Ballena · Bahía de los Farolillos · Puerto Farol |
| Jade Terraces · Saltmirror Flats | Terrazas de Jade · Salar Espejo |
| Emberleaf Wood · Glowtide Coast · Elderbough | Bosque Hojabrasa · Costa Brillamar · Gran Ramaje |
| Hollowmoor · Prism Springs · Cogsworth (Heights) | Páramo Hondo · Fuentes Prisma · (Altos de) Engranalia |
| Aurora Tundra · the Umbral Scar | Tundra de las Auroras · la Cicatriz Umbría |
| Harvestholm · Stiltwater · Rootholm · Candlewick | Espigal · Los Palafitos · Villarraíz · Cabo de Vela |
| the Dawn Monastery · the Blowhole Inn | el Monasterio del Alba · la Posada del Resoplido |
| the Glimmer Grotto · the Rootway · the Old Mine | la Gruta del Destello · la Senda de las Raíces · la Vieja Mina |
| the Frostbell Halls · the Sunken Bell Temple | las Salas de la Campana Helada · el Templo de la Campana Hundida |
| the Forge Heart · the Lantern Pagoda | el Corazón de la Forja · la Pagoda de los Farolillos |
| the Heartwood · Hollowmoor Manor | el Corazón del Árbol · la Mansión del Páramo Hondo |
| the Great Tree | el Gran Árbol |

**Chapters**: 1 `Apagón` · 2 `Los Bosques Susurrantes` · 3 `Polvo y Esporas` ·
4 `Ciénaga y Escarcha` · 5 `Arena y Espuma` · 6 `Fuego y Aletas` · 7 `Las Tierras del Alba` ·
8 `Otoño y Raíces` · 9 `Páramos y Engranajes` · 10 `El Gran Final` · `Epílogo` ·
`Capítulo 1`, `Acto II`, `Acto III`.

**Bosses**: Crumble’s Snuffbot 3000 `el Apagabot 3000 de Migaja` · Grumbleclaw `Gruñegarras` ·
Chief Frostbite `el Jefe Sabañón` · the Gloom Kraken `el Kraken de grisalla` · the Debut
`el Debut` · the Grumblecloud `el Gruñubarrón` · Sand Queen `Reina de las Arenas` · Frost Colossus
`Coloso de Escarcha` · Frog King `Rey Rana` · Magma Golem `Gólem de magma` · Tyrant King `Rey Tirano`
· world bosses: Old Thunderhoof `el Viejo Cascotrueno`, Paper Tiger `el Tigre de papel`, Moonmoth
`la Polilla Lunar`, Crystal Behemoth `el Behemot de cristal`, Aurora Wyrm `la Sierpe aurora`,
Grandmother Kraken `la Abuela Kraken`.

**Heroes & combat**

| English | Español |
|---|---|
| Knight · Mage · Ranger · Bard | Caballero · Mago · Explorador · Bardo |
| Lamplighter · Gardener · Cook · Tinkerer | Farolero · Jardinero · Cocinero · Inventor |
| frying pan · star wand · slingshot · lute | sartén · varita estelar · honda · laúd |
| lantern pole · watering can · whisk · wrench | pértiga farol · regadera · batidor · llave inglesa |
| Whirlwind · Starfall · Acorn Volley · Hearth Song | Torbellino · Lluvia de estrellas · Ráfaga de bellotas · Canción del hogar |
| attack · jump · dodge · special move · ultimate | atacar · saltar · esquivar · movimiento especial · definitiva |
| talents · talent point · gear · weapon · rune · charm | talentos · punto de talento · equipo · arma · runa · talismán |
| Common · Rare · Epic · Legendary | Común · Raro · Épico · Legendario |
| level · XP · health | nivel · EXP · salud |
| boss · dungeon · wave (of gloom) | jefe · mazmorra · oleada |
| companion · pet (the animal) · mount | compañero · mascota · montura |
| quest · side quest · objective | misión · misión secundaria · objetivo |
| Star Charm (Sun, Frost, Leaf, Koi, Star) | Amuleto (del Sol, de la Escarcha, de la Hoja, de la Carpa, de la Estrella) |

**Party Mode & devices**

| English | Español |
|---|---|
| Party Mode · The Adventure | Modo Fiesta · La Aventura |
| host (the crown) | anfitrión (la corona) |
| players · READY · vote | jugadores · LISTO · votar |
| phone (the controller) | teléfono |
| gamepad · keyboard · stick · key | control · teclado · stick · tecla |
| the big screen | la pantalla grande |

**Menus & UI**

| English | Español |
|---|---|
| Continue · New Game · Save game · Resume | Continuar · Nueva partida · Guardar partida · Reanudar |
| Back to title · Pause · Paused | Volver al título · Pausa · En pausa |
| Settings · Controls · Options · Language | Ajustes · Controles · Opciones · Idioma |
| Bag · Journal · Friends · Collection · Map · Hero | Mochila · Diario · Amigos · Colección · Mapa · Héroe |
| (short tabs) Tasks · Pals · Finds | Tareas · Amigos · Tesoros |
| Music · Sounds · Ambience | Música · Sonidos · Ambiente |
| Display: Full · Compact · Minimal | Vista: Completa · Compacta · Mínima |
| Saving… · Saved | Guardando… · Guardado |
| Back · Close · Choose · Done · Skip · Quit | Volver · Cerrar · Elegir · Listo · Omitir · Salir |
| Talk · Use · Hop · Enter · Leave | Hablar · Usar · Brincar · Entrar · Salir |
| Pet (the action) · Wave (hello) | Mimos · Saludar |
| Buy · Sell · Owned | Comprar · Vender · Comprado |
| Items · Critters · critter log | Objetos · Animalitos · registro de animalitos |
| hearts (friendship) · coins | corazones · monedas (¢) |
| shipping crate · notice board · town projects | caja de envíos · tablón de anuncios · proyectos del pueblo |
| campfire · You get: | fogata · Obtienes: |
| Difficulty: Cozy · Normal · Tough · Heroic | Dificultad: Relajada · Normal · Exigente · Heroica |
