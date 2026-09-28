# Hearthlight — Italian translation guide

Hearthlight is a cozy, gently funny pixel-art life game that opens onto a big adventure (a
diva who wants to switch off every light in the world). The Italian must read as if it had
been written in Italian for this game: warm, playful, natural, a little theatrical where the
villains are on stage — never stiff, never literal. Keep jokes as jokes; when a pun dies in
translation, invent a new one that does the same job.

This guide is modelled on the French one (`tools/i18n-glossary.md`) — read that too for the
mechanics. The reference list of all short names (places, items, foes, moves, menus, titles)
is **`tools/i18n/names-it.json`**: always use those exact forms. When you coin a new name,
check it doesn't clash with one already there.

## 1. How strings are translated (the rules that break the game if ignored)

- `t(english, vars)` looks up the **exact English text** in the Italian dictionaries
  (`src/lang/it/*.js`, one file per French file, same export names with `_IT`). Keys are
  copied from the French files **character for character** (same `’`, same `\n`, same
  spaces); only the values change. A missing entry falls back to English.
- Keep every `{placeholder}` (`{name}`, `{n}`, `{item}`, `{npc}`, `{key}`, `{zone}`…) exactly,
  and move it where Italian needs it. Keep every tag: colour tags `{npc}…{/}`,
  `{gold}…{/}`, `{place}…{/}`, `{#8fe0ff}…{/}`; effects `{shake}…{/}`, `{wave}…{/}`,
  `{big}…{/}`; pauses `{p}` and `{pp}` — put the pause at the same dramatic beat in the
  Italian sentence, even if the words move.
- Plurals: `tn('{n} fish', '{n} fish', n)` → `'{n} pesce'` / `'{n} pesci'`. Italian, like
  English, uses the plural for zero.
- The dialogue box translates `say()`, `ask()`, `choose()` and `showLetter()` texts itself —
  don't translate twice. In letters, `\n\n` separates paragraphs: keep them.
- Strings must be valid JS single-quoted strings: that is why the apostrophe is **always
  the typographic `’`**, never `'` (see §3).
- Checks: `node tools/i18n-scan.mjs` (0 missing), `node --check src/lang/it/<file>.js`.

## 2. Register: «tu» in solo, «voi» for the party

- **Solo: tu.** Everybody — villagers, the narrator, the villains, the quest log — speaks to
  the player with **tu**. Villagers speak to each other with tu.
- **Party Mode (1–8 players on one TV): voi.** Each chapter dictionary has a `__group`
  section (the French puts its «vous» lines there). In Italian those lines use **voi**:
  the same line, re-addressed to the whole group. `__group` is looked up first in Party,
  then the normal entry. Every entry whose meaning addresses the player(s) — a «you», a
  «your lantern», an imperative quest step, a narrator line about «you» — needs its
  `__group` twin. Lines that don't address the player (the Duchess talking to Crumble, a
  description) need no twin.

  | English | solo (tu) | `__group` (voi) |
  |---|---|---|
  | I suppose that’s you. | Immagino che tocchi a te. | Immagino che tocchi a voi. |
  | Talk to Mayor Hollis on the plaza | Parla con il sindaco Hollis in piazza | Parlate con il sindaco Hollis in piazza |
  | Your lantern flickers. | La tua lanterna tremola. | La vostra lanterna tremola. |

- **The player's gender is unknown** (and in Party the group is any mix). Italian agrees
  adjectives and past participles, so rephrase instead of guessing:
  - «sei stato bravissimo» → «che bravura!», «ottimo lavoro!»
  - «benvenuto» → «ti diamo il benvenuto», «benvenuti» (group) or just «ciao!»
  - «sei pronto?» → «tutto pronto?»; «sei stanco?» → «un po’ di stanchezza?»
  - «caro / cara» → **«tesoro»**, «tesoro mio» (invariable, warm, very Nonna)
  - June's «Be brave, be kind, and wear a scarf» → «Coraggio, gentilezza, e una sciarpa.»
  - When the joke allows it, both forms can be the joke (the French did it with Perkins):
    «per… il nuovo Lampionaio? La nuova Lampionaia?»
  - For a group, the masculine plural is standard Italian; still prefer neutral wording
    when it costs nothing.
- **Other forms of address inside the story**: Crumble and the Understudies address the
  Duchess with the old courtly **Voi** («Perdonate, Vostra Tetraggine!») or in the third
  person («Sua Radiosità ha detto…»). King Croakington uses the royal **Noi** («Noi,
  Re Gracidone, abbiamo il raffreddore»). Nobody uses «Lei» with the player.

## 3. Typography

- **Apostrophe: always `’`** — l’amico, un’ora, d’oro, po’ (never «pò»), dell’Alba.
- **Accents**: only à è é ì ò ù and À È É Ì Ò Ù exist in the font. Grave on most words
  (è, cioè, già, più, può, città, così, caffè, **tè** — Hollis's tea has an accent!), acute on
  perché, affinché, poiché, né, sé. **Capital È is written `È`**, never «E’» or «E'».
  Shouted text keeps its accents: «PERCHÉ?», «PIÙ FORTE!», «CAFFÈ!».
- **No space before `! ? : ;`** (Italian typography — unlike the French files).
- **Quotes in dialogue: «…»**, with no inner spaces (the French files have them; Italian
  doesn’t, and `t()` adds none): «Mai camminare nel vapore.» — the English “ ” become «…»;
  a quote inside a quote uses “ ”. (This guide quotes its examples the same way.)
- **Ellipsis**: the single character `…`. **Dashes**: `—` for interruptions and asides, as
  the English does («Grazie, gentili stran— {shake}LECCA-LAMPIONI!{/}»).
- **Numbers stay as they are**; coins stay `¢` with a space («120 ¢»); percentages as the
  English («15%»). Weekdays: Lun Mar Mer Gio Ven Sab Dom.
- Speed and multiplier «2×» is written «x2» (the × isn't in the font).
- Font characters: A–Z a–z 0–9, the accented letters above, « » … — – ’ and usual
  punctuation, ♥ ★ ♪ → ← ↑ ↓ ✓ · °. **Nothing else** — no emoji, no ç, ñ, ö, í, ó, ú, ï, ß.
  Foreign words lose their other accents («Zoe», not «Zoë»); «Flambé», «Soufflé»,
  «Mise en place» are fine.

## 4. Brevity — small screens, a pixel font

Italian runs 15–25% longer than English and the screens are small (buttons of 40–60 px,
phone pills, tabs). Aim for the English length in UI.

- **Action buttons: the imperative, second person singular** — even in Party, each button
  belongs to one player: Parla, Apri, Entra, Esci, Leggi, Salta, Schiva, Lancia, Raccogli,
  Pianta, Annaffia, Accendi, Sali, Rema, Scava, Suona, Regala. (Never an infinitive
  «Parlare», never «Premi X per…»: `ctl()` names the key.)
- **Tabs and headers: a noun, no article**: Zaino, Diario, Amici, Collezione, Mappa, Eroe,
  Talenti, Corredo, Cavalcature, Compagni, Opzioni.
- **Quest steps: imperative** (tu / voi); **quest and chapter titles: nominal or
  infinitive**, often an idiom («Si volta pagina», «Mettere radici», «Via col vento»).
- Drop articles and «di» where a label reads fine without them («Cappello-gallina»,
  «Pigna-bomba»); use accepted abbreviations: Opz., Liv. (level), Prof.ssa, Cap., PE
  (experience points), PS (health points).
- Never write a key name in a hint («E», «Esc», «Tab»): the code fills `{key}` /
  `ctl()` with the right key, button or phone icon.
- Toasts and pop-ups over heads («PARATA», «Assorbito», «NUOVO LIVELLO!») must stay
  as short as the English — cut words, not letters.

## 5. Names

- **People keep their first names**: Hollis, Rosa, Pip, Finn, Ivy, Theo, Mabel, Sol, Wren,
  Bram, Juniper, Marlo, Pim, June, Wendy, Perkins, Rowan, Tansy, Barley, Tuya, Temur, Dolly,
  Nell, Grubb, Yuki, Tobi, Tariq, Zizi, Barnaby, Mochi, Bess, Hoshi, Sen, Bao, Blanche, Mei,
  Tamsin, Marisol, Rhoda, Pembroke, Hob, Posy, Honoria, Gloria, Fen, Bo, Nibs, Buttercup
  (Bram's cow). **Titles, nicknames and punning names are translated** (the French did the
  same): Old Boom → Vecchio Botto, Crumble → Briciola, Master Tock → Mastro Tac, Mrs
  Dumpling → Signora Gnocchi, Doug (the third mole, a joke on a plain name) → Gino.
- Descriptive places are translated with Italian charm (Whisperwood → Bosco Bisbiglio,
  Candlewick → Lucignolo, Lanternport → Portolanterna); **Marigold Cove** and
  **Hearthlight** stay.
- «Old X» → «Vecchio X / Vecchia X» (no article in name tags; «il vecchio Rowan» in a
  sentence). Grandmother / Nana → Nonna; Granny → Nonnina; Auntie / Aunt → Zia; Sir → Ser;
  Captain → Capitan (men), Capitana (Wendy).
- The Understudies are **all three male** in the English («his bow»): Avannotto,
  Tremolo, Mattone. «Controfigura» is feminine but used for men: «Mattone è una
  controfigura», «le Controfigure».

## 6. Voices

- **The narrator** — a storybook voice with a wink: present tense, short sentences,
  understatement as the punchline. «Da qualche parte, un vecchissimo sindaco rovescia il
  suo tè.{pp} Di nuovo.»
- **Duchessa Gloria Tetrazzi** (the Duchess) — a failed opera diva, grand and petty:
  Italian is opera's own language, so let her *be* an opera. Vocatives «tesori», «miei
  cari», «carissimi»; «Mwah!» → «Muah!»; musical terms as weapons («Da capo!»,
  «Bis!», «Fortissimo!», «Brava ME»); libretto-like threats between ♪ (they may rhyme or
  scan like verse — settenari are welcome). A new title every entrance, built of
  alliteration and vanity: «la Duchessa del Crepuscolo, la Contessa delle Nubi, la
  Baronessa del…{p} del…{pp} del Maltempo!». She mangles the heroes' names: «la Brigata
  Stoppino», «i Lecca-lampioni» (and anything as rude and silly). Terrified of hens —
  «{big}NON SI PARLA DELLA GALLINA!{/}». Catchphrase «*Nobody* invited me» →
  «*Nessuno* mi ha mai invitata.» (feminine participle — it comes back in the finale as
  the invitation). Capital ME stays capital: «e tutti voi guarderete ME.»
- **Briciola** (Crumble) — her tiny herald-gremlin in a bellhop cap: announces at the top of
  his lungs («SIGNORE, SIGNORI{p} E BESTIOLE ASSORTITE!»), drums his own drumroll
  («Trrrrrr… PAM!»), always garbles her title, grovels, whines («Ahi ahi ahi», «povero
  me»), and is sweet underneath. His honorifics are made on the spot from whatever is
  happening: «Vostra Tetraggine», «Vostra Spegnitudine», «Vostra Uggiosità»,
  «Vostra Magnificenzissima». He's proud of his machines (the Spegnibot) like a child.
- **Avannotto** (Minnow) — tiny, bossy, the leader: stage-director orders and capital
  letters, «Controfigure! In posa!», «SIGNORE! SIGNORI! E… chiunque voi siate!».
- **Tremolo** (Fidget) — thin, nervous, overthinks: qualifications, lists, «Allora.
  Tecnicamente…», the voice of worried reason («Questo NON è montare la guardia. Questo è
  NUOTO SINCRONIZZATO.»).
- **Mattone** (Brick) — huge and gentle, one word at a time, telegraphic Italian:
  «Brace.» «Mattone… è palla di cannone.» Never more than a few words.
- **Nonna June** — the last Lamplighter: mischievous, knitting, knows more than she says.
  Her letters are warm, practical and a little cheeky, open with «Tesoro mio —» and end
  «— June». Gender-neutral by construction (see §2).
- **Sindaco Hollis** — kind, long-winded, a speech for every occasion («Perbacco!»), and
  the tea he drops at every big event: «Mi è caduto il tè.» / «Ho rovesciato il tè.»
- **Pip** (8 years old) — excited, CAPS for emphasis, «Troppo forte!», «Mitico!». **His
  letters are written like a real eight-year-old**: all lowercase, run-on sentences, a few
  believable mistakes — «o trovato» (no h), «ce» for «c’è», «perche» without accent,
  «qual’è» — plus «!!!». Keep it readable; one or two mistakes per sentence, not more.
- **Perkins** — the Pelican Post's proud, always-late postmaster: the pompous politeness of
  an old post office. Motto «Posta Pellicano: consegniamo!{pp} Prima o poi.»; he drops you
  «un po’ più in là» than promised; «cheerio!» → «ossequi!».
- **Capitana Wendy** (Wendeline Burrasca) — cheerful, reckless aviator. Keep her clipped
  status reports, noun-colon-noun: «Tè: forte. Nervi: più forti.» «Involucro: a brandelli.
  Elica: stuzzicadenti.» Her oath «Shiver my rivets» → «Per mille bulloni!». Nibs, her
  albatross first mate, is afraid of heights: «Nibs soffre di vertigini. È un albatro. È
  complicato.»
- **Prof.ssa Nocciola Talpini** — a mole scholar lost in her notes: «Oh cielo, oh CIELO!»,
  «Devo annotarlo!», footnotes spoken aloud («Nota a piè di pagina: e la dinamite.»).
- **Mastro Tac** (Master Tock) — clockwork precision: counts in «Tic. Tac.», exact numbers,
  short measured sentences («Fra tre tic sono da voi. Tic. Tic. Tic. Eccomi.»).
- **Guardaparco Rhoda** — numbered rules: «Regola numero sei: prima si osserva.» «Non
  esiste una regola dieci. Ancora.»
- Others, in a line each: Sceriffa Dolly (dry western drawl), Caposquadra Grubb (gruff:
  «Niente di personale. Sono affari.»), Re Gracidone (royal Noi, sniffles «etcì!»), Ser
  Tritone (tiny, pompous herald), Zia Zafferano (brisk caravan boss), Zizi (smooth
  salesman: «miraggi di prima scelta!»), Fra Bao (under a vow of riddles — speaks only in
  riddles), Nonna Soffietto (the whale-island: slow, deep, stretched vowels), Sindaca
  Zucchina (festival queen, exuberant), Stoppino il cappellaio (always late, a hat for
  everything), Zia Sego (whispering chandler), Lady Honoria (old-fashioned, melancholy
  gothic), the manor's ghost servants (formal, fussy — Pembroke may use an antique, polite
  turn of phrase).

## 7. Wordplay and running gags

- **Re-invent, keep the function.** Where the English puns, the Italian puns — on the same
  beat, at about the same length. Don't translate the words of a joke; translate the laugh.
  Italian idioms and cultural echoes are welcome when they fit (the chapter 2 quest «Gone
  With the Wind» is «Via col vento»; «Flour Power» is «Fior di farina»; the town
  Candlewick is «Lucignolo» and its clockmaker «Mastro Tac» — a wink to Pinocchio, keep
  it light).
- **Crumble's titles for the Duchess** — a fresh one each time, never twice the same, always
  going wrong: «Vostra Tetraggine», «Vostra Spegnitudine». Her fixed style in the third
  person: **«Sua Radiosità»** (Her Radiance).
- **The Understudies' team pose** collapses every time: «In posa!» … «…Ahi.»
- **The hen** that ruined her aria thirty years ago: la gallina. «C’era una gallina, mi
  pare.» — «{big}NON SI PARLA DELLA GALLINA!{/}». Hens say «coccodè».
- **«Nessuno mi ha mai invitata»** → the thirty-years-late invitation in the finale.
- **Perkins drops you «un po’ più in là»**, and «prima o poi».
- **Nibs and heights**; **Hollis's tea** (a narrated cutaway ends each chapter).
- **Theatre vocabulary** is the villains' world — use the real Italian stage words:
  intervallo (intermission), prova generale (dress rehearsal), provino (audition), quinte
  (wings), «uscita a sinistra!» (exit stage left), torre scenica (fly tower), buca del
  suggeritore (prompter's box), riflettore / occhio di bue (spotlight / follow-spot), tutto
  esaurito (full house), bis (encore), debutto, primo tenore (leading man), controfigura
  (understudy), macchinista (stagehand).
- **Onomatopoeia**: bawk → coccodè; moo → muuu; hoot → uh-uh; boom → bum / botto; eep → iih;
  ow → ahi; hey → ehi; achoo → etcì; drumroll → trrrrr… PAM!
- «gloomed» (a creature taken by the gloom) → **ingrigiumito**.

## 8. Glossary (keep these consistent with `tools/i18n/names-it.json`)

### The world and its words

| English | Italiano |
|---|---|
| Hearthlight | Hearthlight |
| Marigold Cove · the cove | Marigold Cove · la baia |
| Marigold Valley | Valle di Marigold |
| Old Glimmer (the lighthouse) | il Vecchio Barlume |
| Glimmer Shard · Glimmer Ember | Scheggia di Barlume · Brace di Barlume |
| Nana / Nana June | Nonna / Nonna June |
| gloom (the grey stuff and its creatures) | il grigiume («Raptor di grigiume») |
| gloomy (the Duchess's taste) | tetro («Gallina tetra», «il Tetro Teatro») |
| Gloomling · Big Gloomling | Grigiotto · Grigiottone |
| the Murk (the fog that gates lands) | la Caligine |
| Great Hearth · hearth | Grande Focolare · focolare |
| Hearthstone | Pietra Focolare |
| the Lamplighters · a Lamplighter | i Lampionai · un Lampionaio / una Lampionaia |
| the Lamplighter’s Lantern | la Lanterna del Lampionaio |
| the Lamplighters’ Road | la Strada dei Lampionai |
| lantern · ember · flame · spark | lanterna · brace · fiamma · scintilla |
| stardust | polvere di stelle |
| hearts (friendship) | cuori |
| coins | monete (¢) |
| waystone · attune | pietra miliare · risvegliare |
| the Pelican Post · a roost | la Posta Pellicano · un trespolo |
| the Hearthlands · the Dawnlands · the Wide Sea | le Terre del Focolare · le Terre dell’Alba · il Grande Mare |
| Starfall Festival | Festival delle Stelle Cadenti |
| Festival of Lights · Sky Lantern | Festa delle Luci · lanterna volante |
| Star Charm (Sun/Frost/Leaf/Koi/Star) | Amuleto (del Sole / del Gelo / della Foglia / della Carpa / della Stella) |
| shipping crate · notice board | cassa di spedizione · bacheca |
| town projects · critter log | progetti del paese · taccuino delle bestioline |
| gloom camp · gloom nest · Gloom Works | accampamento di grigiume · nido di grigiume · le Officine del Grigiume |
| lair · boss · world boss | covo · boss · boss del mondo |
| rare (named gloom) · treasure hat | raro · cappello del tesoro |
| Festival Ring · wave(s) · arena | Arena del Festival · ondata/e · arena |
| quest · side quest · chapter · dungeon | missione · missione secondaria · capitolo · dungeon |
| campfire · camp | falò · accampamento |

### The villains' world

| English | Italiano |
|---|---|
| Duchess Gloria Gloomsworth · the Duchess | Duchessa Gloria Tetrazzi · la Duchessa |
| Her Radiance · Your Gloominess | Sua Radiosità · Vostra Tetraggine (and new ones) |
| the Wick Brigade · the Lamp-lickers | la Brigata Stoppino · i Lecca-lampioni |
| Crumble | Briciola |
| the Understudies: Minnow, Fidget, Brick | le Controfigure: Avannotto, Tremolo, Mattone |
| their acts: Juggling Act · Human Cannonball · Synchronised Swimmers · Mime Troupe | numero di giocoleria · l’Uomo Cannone · le Sincronette · la Compagnia dei Mimi |
| the Gloomstage | il Tetro Teatro |
| the Grand Snuffer · the Snuffer | il Grande Spegnitoio · lo Spegnitoio |
| Snuffbot 3000 / Mk II / Mk III | Spegnibot 3000 / Mk II / Mk III |
| the Grand Finale | il Gran Finale |
| the Umbral Spotlight · the Umbral Diva | il Riflettore d’Ombra · la Diva d’Ombra |
| the Umbral Scar | la Cicatrice d’Ombra |

### Friends met on the road

| English | Italiano |
|---|---|
| Mayor Hollis | il sindaco Hollis (tag: Sindaco Hollis) |
| Perkins of the Pelican Post · Postmaster | Perkins della Posta Pellicano · Direttore postale |
| Captain Wendeline “Wendy” Gale | Capitana Wendeline «Wendy» Burrasca |
| the Dauntless Teacup · Nibs | la Tazzina Impavida · Nibs |
| Professor Hazel Burrows | Professoressa Nocciola Talpini (Prof.ssa Nocciola) |
| Master Tock | Mastro Tac |
| Old Rowan · Tansy · Barley the Miller | Vecchio Rowan · Tansy · Barley il mugnaio |
| Barkbeard · Grumbleclaw | Barbacorteccia · Grugnartiglio |
| Old Boom · Nugget Nell · Sheriff Dolly | Vecchio Botto · Nell Pepita · Sceriffa Dolly |
| Foreman Grubb & the Drillosaur | il caposquadra Grubb e il Trapanosauro |
| Pick, Shovel & Doug (the Mole Brothers) | Piccone, Badile e Gino (i Fratelli Talpa) |
| King Croakington · Sir Newton | Re Gracidone · Ser Tritone |
| Auntie Saffron · Elder Shellington · Snap | Zia Zafferano · Anziano Carapaccio · Morsetto |
| Barnacle Bess · Grandmother Bellows | Bess la Patella · Nonna Soffietto |
| Brother Bao · Abbot Sen · Old Hoshi | Fra Bao · Abate Sen · Vecchia Hoshi |
| Mayor Marrow · Warden Ashby · Farmer Hazel | Sindaca Zucchina · Guardiano Frassini · Nocciola la contadina |
| Wick the Hatter · Aunt Tallow · Ranger Rhoda | Stoppino il cappellaio · Zia Sego · Guardaparco Rhoda |
| Mrs Dumpling · the Lady in Grey | Signora Gnocchi · la Dama in Grigio |

### Heroes and fighting

| English | Italiano |
|---|---|
| Knight · Mage · Ranger · Bard | Cavaliere · Mago · Ramingo · Bardo |
| Lamplighter · Gardener · Cook · Tinkerer | Lampionaio · Giardiniere · Cuoco · Inventore |
| (class labels stay masculine; avoid gendering the player in sentences) | |
| attack · heavy / light attack · special · dodge · ultimate | attacco · attacco pesante / leggero · mossa speciale · schivata · suprema |
| talent · talent point · talent tree | talento · punto talento · albero dei talenti |
| gear · weapon · rune · charm | corredo · arma · runa · ciondolo |
| Common · Rare · Epic · Legendary | Comune · Raro · Epico · Leggendario |
| companion(s) · mount(s) | compagno/i · cavalcatura/e |
| level · LEVEL UP! · XP · HP | livello (Liv.) · NUOVO LIVELLO! · PE · salute (PS) |
| Hero page | pagina Eroe |
| Pan Slam (the Knight's special) | Padellata |

### Lands (zones)

| English | Italiano | English | Italiano |
|---|---|---|---|
| Deep Whisperwood | Bosco Bisbiglio profondo | Whale Isle | Isola Balena |
| Windy Heights | Alture Ventose | Lantern Bay | Baia delle Lanterne |
| Bouncecap Woods | Bosco Rimbalzafunghi | Jade Terraces | Terrazze di Giada |
| Golden Steppe | Steppa Dorata | Saltmirror Flats | Specchio di Sale |
| Red Canyon | Canyon Rosso | Emberleaf Wood | Bosco Fogliabrace |
| Croakmire | Gracidapalude | Glowtide Coast | Costa di Marealuce |
| Frostpeak Glacier | Ghiacciaio del Picco Gelato | Elderbough | Frondantica |
| Cloud Isles | Isole delle Nuvole | Hollowmoor | Landacava |
| Sunscorch Dunes | Dune di Bruciasole | Prism Springs | Fonti Prismatiche |
| Coral Lagoon | Laguna Corallina | Cogsworth Heights | Alture degli Ingranaggi |
| Sunken City | Città Sommersa | Aurora Tundra | Tundra dell’Aurora |
| Emberpeak | Montebrace | Whirlpool Straits | Stretto dei Gorghi |
| Dino Isle | Isola dei Dinosauri | Open Sea | Mare aperto |

Towns: Lanternport → Portolanterna · Harvestholm → Mietivalle · Stiltwater → Palafitte ·
Rootholm → Borgoradice · Candlewick → Lucignolo · Cogsworth → Borgorotella · Croakton →
Gracidopoli · Dusty Gulch → Gola Polverosa · Breezy Hill → Colle Brezza · the Blowhole Inn →
la Locanda dello Sfiatatoio. Valley: Whisperwood → Bosco Bisbiglio · Honeydew Fields → Campi
Dolcemiele · Driftwood Beach → Spiaggia Legnomare · Market Plaza → Piazza del Mercato.

### Chapters, dungeons, bosses

| Chapter | Dungeon — boss |
|---|---|
| 1 Lights Out → **Buio in sala** | la Grotta del Barlume — lo Spegnibot 3000 di Briciola |
| 2 The Whispering Woods → **I Boschi che Bisbigliano** | la Via delle Radici — Barbacorteccia |
| 3 Dust & Spores → **Polvere e Spore** | la Vecchia Miniera — il caposquadra Grubb e il Trapanosauro |
| 4 Mire & Frost → **Melma e Brina** | le Sale Campanagelo — il Tenore dei Ghiacci |
| 5 Sand & Sea → **Sabbia e Schiuma** | il Tempio della Campana Sommersa — il Kraken di grigiume |
| 6 Fire & Fins → **Fuoco e Pinne** | il Cuore della Forgia — la Duchessa (il Debutto) |
| 7 The Dawnlands → **Le Terre dell’Alba** | la Pagoda delle Lanterne — Vecchio Fortunello, il Drago di Carta |
| 8 Autumn & Roots → **Autunno e Radici** | il Cuor di Legno — la Regina delle Falene |
| 9 Moor & Machines → **Lande e Lancette** | il Maniero di Landacava — la Dama in Grigio |
| 10 The Grand Finale → **Il Gran Finale** | il Tetro Teatro — la Duchessa in tre atti |

World bosses: Vecchio Zoccolotuono · la Tigre di carta · la Falena lunare · il Behemoth di
cristallo · il Dragone dell’Aurora · Nonna Kraken. Lair bosses: la Regina delle Sabbie · il
Colosso di Gelo · il Re Ranocchio · il Golem di Magma · il Re Tiranno · il Brontonembo.
«Chapter 1» → «Capitolo 1»; «Act Two / Three» → «Atto secondo / terzo».

### Menus and system words

| English | Italiano | English | Italiano |
|---|---|---|---|
| Continue | Continua | Bag | Zaino |
| New Game | Nuova partita | Journal | Diario |
| Resume | Riprendi | Friends | Amici |
| Save game | Salva partita | Collection | Collezione |
| Saving… · Saved | Salvataggio… · Salvato | Map | Mappa |
| Back to title | Torna al titolo | Hero | Eroe |
| Settings / Options | Opzioni | Talents · Gear | Talenti · Corredo |
| Controls | Comandi | Mounts · Companions | Cavalcature · Compagni |
| Pause · Paused | Pausa · In pausa | Quit · Back · Close | Esci · Indietro · Chiudi |
| Party Mode | Modalità Festa | The Adventure | L’Avventura |
| Keyboard · Gamepad · Phone | Tastiera · Controller · Telefono | Players · Host | Giocatori · Capo |
| Display: Full · Compact · Minimal | Interfaccia: Completa · Compatta · Minima | Difficulty: Cozy · Normal · Tough · Heroic | Difficoltà: Tranquilla · Normale · Tosta · Eroica |
| Day length | Ritmo delle giornate (Con calma · Normale · Di buon passo · Veloce) | Text speed | Velocità del testo (Lenta · Normale · Veloce) |
| Language · Music · Sounds | Lingua · Musica · Suoni | On · Off | Sì · No |
| Skip · Next | Salta · Avanti | Yes · No | Sì · No |
