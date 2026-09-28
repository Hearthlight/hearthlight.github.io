# Hearthlight — German translation guide (Deutsch)

Hearthlight is a cozy, gently funny pixel-art life & adventure game. The German must read as if
it had been written in German for this game: warm, playful, idiomatic, never stiff or literal.
Think of a good German children’s-book or cartoon dub (Pixar, Ghibli, Asterix) rather than a
software manual. Keep jokes as jokes — when a pun doesn’t survive, invent a German one that does
the same job.

The short names (places, items, enemies, bosses, moves, talents, weapons, menu labels, NPC titles)
are already decided in **`tools/i18n/names-de.json`** (1448 entries, same keys as
`names-fr.json`). **Use them exactly** — in dialogue too. This guide covers everything else.

## 1. How strings work (same mechanics as French)

- `t(english, vars)` looks up the **exact English source text** (`src/i18n.js`). Dictionary keys
  must match the English **character for character** (typographic `’`, `…`, `—`, `\n`, spaces).
  Copy the keys from the French twin file (`src/lang/fr/<file>.js`) — only the values change.
- German files: `src/lang/de/<same file name>.js`, export names with `_DE` instead of `_FR`
  (`CH1_FR` → `CH1_DE`; the unsuffixed ones like `LINES`, `UI` keep their names).
  `node tools/i18n/mkindex.mjs de` writes `src/lang/de/index.js`.
- `{placeholders}` (`{name}`, `{n}`, `{npc}`, `{item}`, `{pet}`, `{start}`…) are filled after
  translation: keep every one, move it where German needs it.
- Tags must survive, wrapping the translated words: colours `{npc}…{/}`, `{gold}…{/}`,
  `{item}…{/}`, `{place}…{/}`, `{#8fe0ff}…{/}`; effects `{shake}…{/}`, `{wave}…{/}`,
  `{big}…{/}`; pauses `{p}` and `{pp}` (move them to where the German beat falls).
- The dialogue box translates `say()`, `ask()`/`choose()` and `showLetter()` by itself — don’t
  double-translate. Plurals: `tn('{n} fish', '{n} fish', n)` → give the German singular/plural
  (`'{n} Fisch'`, `'{n} Fische'`).
- Check: `node tools/i18n-check.mjs de` (all files) or `node tools/i18n-check.mjs
  src/lang/de/ch1.js` — missing keys, extra keys, tag mismatches, lines left in French/English,
  straight quotes. Coverage: `node tools/i18n-scan.mjs --lang=de`. Syntax: `node --check file.js`.

## 2. Register: du (solo) · ihr (Party)

- **Solo:** the game, the narrator and every villager speak to the player with **du** — lowercase
  (`du, dich, dir, dein`), as current spelling rules allow, also in letters. Villagers speak to
  each other with du too.
- **Party Mode** (1–8 players on one TV): lines addressed to the whole group live in the
  `__group` section of the chapter dictionaries (French uses « vous » there). In German use
  **ihr** (`ihr, euch, euer`), lowercase: `'I suppose that’s you.'` → solo `'Ich schätze, das
  bist du.'`, `__group` `'Ich schätze, das seid ihr.'` Quest objectives too: solo
  `'Sprich mit Bürgermeister Hollis auf dem Platz'`, group `'Sprecht mit …'`.
  **Every key that has a French `__group` twin needs a German `__group` twin** — even if the
  German happens to be identical (the checker compares the key sets).
- A line spoken to *one* player inside Party Mode (a phone hint, a per-player bubble) stays du.
- **Courtly Ihr (capitalised):** servants and heralds address the Duchess and royalty with the
  old courtly `Ihr / Euch / Euer`: Krümel: `'Wie Ihr befehlt, Eure Trübseligkeit!'`; King
  Quakington’s herald likewise. The Duchess herself says du to everyone (condescending) and ihr
  to a group.
- **The player’s gender is unknown.** Never give the player a gendered noun or agreement:
  no *der neue Held / die neue Heldin*. Rephrase with verbs (`Du hast es geschafft!`), neutral
  nouns (`Liebes`, `Schatz`, `Schätzchen`, `Kind`, `Nachwuchs`, `Spürnase`, `Glückspilz`), or the
  French trick of saying both forms as a joke (Perkins: `'…für den neuen Lampenanzünder? Die neue
  Lampenanzünderin?'`). Party lines are plural anyway. Award titles are gender-neutral nouns
  (`Schlafmütze`, `Herzensmensch`, `Schneeball-Ass`).

## 3. Typography

- **Quotes:** German book style **»…«** — chevrons pointing *inwards*: `»Gack«`. The font has no
  „ “ — never use them, nor straight `"`. No nested quotes (there is no ›‹): rephrase instead.
  The English source sometimes has “…” or « … » inside lines: both become »…«.
- **No space** before `! ? : ;` and none inside »…« (that is French). Ellipsis is the single
  character `…` (`Äh…`, `…und dann`).
- **Gedankenstrich:** ` – ` (en dash with spaces) where English has ` — `. (In the pixel font —
  and – look the same.) Letter signatures: `– June`.
- **Apostrophe:** typographic `’` only (`geht’s`, `gibt’s`, `So’n Glück`). German genitive takes no
  apostrophe (`Omas Häuschen`, `Rosas Ofen`, `Junes Laterne`) — except after s/x/z: `Hollis’ Tee`,
  `Perkins’ Beutel`.
- **Numbers** stay as they are; big numbers go through `num()` (German `1.000`). Units get a space,
  as in French: `{n} %`, `{n} s`, `{n} ¢`. Coins stay **¢** (`120 ¢`). Times: `7pm` → `19 Uhr`.
  Weekdays: `Mo Di Mi Do Fr Sa So` (already in names).
- **Capitalisation:** no English Title Case. Titles capitalise the first word and nouns only:
  `Die verlorenen Seiten`, `Der kalte Ofen`. Adjectives that are part of a proper name stay
  capitalised and decline: `der Alte Schimmer` → `des Alten Schimmers`, `zum Alten Schimmer`;
  `Tiefer Flüsterwald` → `im Tiefen Flüsterwald`; `das Weite Meer`, `die Graue Dame`.
- **Compounds:** write them solid (`Laternenbucht`, `Trübkrähe`). Hyphenate when one part is a
  proper name, an acronym or a number (`Marigold-Tal`, `Frostspitz-Lager`, `Koi-Amulett`,
  `Mk-II`), or when a monster of a word needs a breath (`Trüb-Dilophosaurus`).
- **Glyphs:** A–Z a–z 0–9, ä ö ü ß Ä Ö Ü, é, « » (for »…«), … – ’ and usual punctuation, plus
  ♥ ★ ♪ → ← ↑ ↓ ✓ · °. Nothing else (no emoji, no „“ ‚‘ ›‹).
- **Onomatopoeia** (German, not English): bawk → `gack`, moo → `muuuh`, hoot → `huhu`,
  eep → `iiek`, ouch → `autsch`, oof → `uff`, boom → `bumm`/`wumms`, hmph → `hmpf`, achoo →
  `hatschi`, mwah → `mwah`, bonk → `bonk`, ta-daaa → `ta-daaa`, drumroll → `trrrrrr… bumm-tsching!`.

## 4. UI brevity — very important for German

German runs ~30 % longer than English, and the screens are tiny: a 7-px pixel font at roughly
**5 px per letter** (i, l, ! are narrower; m, w wider; ä ö ü are as wide as a o u). Rules:

- **Buttons & interaction prompts** (the word over an NPC, a door, a phone button): one verb in
  the **infinitive**, ideally ≤ 10 letters — `Reden`, `Öffnen`, `Ernten`, `Gießen`, `Einsteigen`,
  `Hüpfen`, `Winken`. Never `Bitte …`, never Sie, never a full sentence. The HUD’s use button
  fits ~6 letters (`Aktion`).
- **Tabs & menu labels:** aim for ≤ 1.4 × the English width. Prefer the short word:
  `Tasche` (not Inventar), `Sachen` (not Gegenstände), `Karte`, `Held`, `Funde`, `Opt.`,
  `Schwierigkeit` (not Schwierigkeitsgrad), `Rüstzeug` (the Gear page — `Ausrüstung` is
  cut on the phone; in running text `Ausrüstung` is fine).
- **Status lines & toasts:** drop articles and auxiliaries — `Speichern…`, `Gespeichert`,
  `Verbinde…`, `Pausiert`, `Geräumt`, `Befreit`. Allowed abbreviations: `St.` (Stufe),
  `EP` (Erfahrungspunkte), `LP` (Lebenspunkte), `Kpt.`, `Prof.`, `Opt.`, `a. D.`.
- **Distinguish the look-alikes** (they sit side by side): `Weiter` (Next, dialogue) ·
  `Fortsetzen` (Resume, pause) · `Weiterspielen` (Continue, title) · `Überspringen` (Skip) ·
  `Zurück` (Back) · `Schließen` (Close) · `Beenden` (Quit).
- **Hints** (`'Press A to open it'`): du-imperative, keep the key placeholder:
  `'Drück {a} zum Öffnen'`. Never write a key name yourself — the code names it (`ctl()`).
- If a label still won’t fit, cut words before letters: `Sterne gucken` beats
  `Die Sterne beobachten`. When in doubt, compare with the French length and take a screenshot.

## 5. Voices

The cast is theatre people, villagers and odd professionals — give each a German voice.

- **Herzogin Gloria von Grauenstein** (the Duchess) — a failed diva: grand, petty, theatrical.
  Sings her threats (`♪ Oh, Marigold Coooove… ♪` stays), drags out vowels, SHOUTS in caps, then
  purrs. Calls everyone `Schätzchen`/`Darlings`, says `Mwah!`, sneers `Banausen!`,
  `Dilettanten!`. Mangles the heroes’ names: Lamp-lickers → `Lampenlutscher`, the Wick Brigade →
  `die Dochtbrigade` (more if needed: `Funzelvolk`, `Laternenlümmel`, `Kerzenstummel`).
  Gives herself a new alliterative title at every entrance (`Fürstin der Finsternis`,
  `Gräfin des Grauens`). Terrified of hens. Her grudge: nobody ever invited her to anything
  (`Mich lädt ja nie jemand ein.` · ch10: `…Für mich? Mir schreibt nie jemand. Nie hat mir
  jemand—`). The flashback’s young Gloria is shy and hopeful.
- **Krümel** (Crumble) — her tiny herald-stagehand-drummer. Over-the-top announcements in caps:
  `MEINE DAMEN, MEINE HERREN{p} UND SONSTIGES GETIER!` Always garbles her title and then
  apologises (`Pardon, Eure Trübseligkeit!`). Drums his own drumroll. Grovelling courtly
  `Ihr/Euch`, puns on everything (`Lösche den Löscher, Eure Löschlichkeit!`), `Oje, oje!`,
  `Au weia!`. Sweet and loyal underneath.
- **Die Zweitbesetzung** (the Understudies) — three would-be villains who audition at every
  chance; their team pose always collapses.
  **Sprotte** (Minnow, tiny, bossy leader): stage-director imperatives and showbiz words
  (`HALT, Dorfvolk! Seht die vielversprechendsten Schurken ihrer Generation!`, `Und… POSE!`).
  **Zappel** (Fidget, thin, nervous): corrects, overthinks, hedges (`Also – nicht offiziell.
  Genau genommen drei Bewerbungen.`). **Brocken** (Brick, huge and gentle): one word at a time,
  third person, no articles: `Glut.` · `Brocken trägt Kanone.` · `Brocken… ist Kanonenkugel.`
- **Oma June** (Nana June) — the last Lamplighter: mischievous, knits, knows more than she says.
  Short, dry, loving. Calls you `mein Schatz`, `Liebes` (never gendered). Her letters are warm and
  a little old-fashioned, signed `– June`: `Sei mutig, sei lieb, und zieh einen Schal an.`
- **Bürgermeister Hollis** — kindly, long-winded, loves a speech and his tea, a touch old-school
  (`Nun denn!`, `Ei, ei!`). Every chapter ends with him dropping his tea: `Irgendwo lässt ein sehr
  alter Bürgermeister seinen Tee fallen.{pp} Schon wieder.`
- **Perkins** (Pelikanpost) — a proud, pompous pelican postmaster; postal officialese
  (`Sonderzustellung!`, `Einschreiben!`), bursts in shouting `PELIKANPOST!`, always late, always
  blames the wind (`Wir hatten Gegenwind.`). Motto: `Die Pelikanpost liefert!{pp} Irgendwann.`
  Drops you »ein kleines bisschen daneben«. Tips accepted — in fish.
- **Kapitänin Wendeline »Wendy« Sturm** — the Tollkühne Teetasse’s captain: breezy, reckless,
  cheerful, tea-and-flying slang (`Haltet eure Untertassen fest!`, `Tee ist in der Kanne, Nerven
  sind im Laderaum.`). Her first mate **Nibs** the albatross has Höhenangst.
- **Professorin Hasel Buddelmann** (Prof. Hazel Burrows) — a mole scholar of
  `Lampenanzünderkunde`: big glasses, flustered, lost in her notes (`Ach du meine Güte!`,
  `Das muss ich sofort notieren!`), enthusiastic about old maps.
- **Meister Tock** — clockmaker of Zahnradingen: precise, clipped, exact to the second, proud of
  his brass. `Besuch! In drei Ticks bin ich bei euch. Tick. Tick. Tick. Da bin ich.` Numbers are
  exact (`vier Minuten und zwölf Sekunden`), never »ungefähr«.
- **The narrator** — dry, gentle, present tense, short sentences, the joke after a `{p}` beat;
  never explains the joke. Speaks to du (solo) / ihr (group).
- **Pip** (8) — excitable, CAPITALS when thrilled, gets things slightly wrong. In his letters he
  writes **all lowercase** (German kids forget the noun capitals — that alone reads childlike),
  words run together or fall apart, a comma goes missing; CAPS stay for shouting. No heavy
  misspellings: `lieber {name}\n\ndas ist meine ZWEITbeste muschel. die beste ist geheim.` —
  signed `– Pip (8 Jahre)`.
- A few more: **König Quakington** speaks in the royal `Wir` and croaks; with his cold he is
  `verschnupft` (both *has a cold* and *miffed* — use it). **Borkenbart** (Barkbeard): slow, deep,
  long vowels, tree similes (`Hmmm… jaaa…`). **Steiger Grubb**: gruff miner, greets with
  `Glück auf!`. **Sheriff Dolly**: western-dub drawl. **Großmutter Blasebalg**: enormous, sleepy,
  kind, rumbling. **Die Graue Dame**: ghostly, gentle, old-fashioned. **Pembroke** the ghost butler:
  impeccably formal and a little stiff (du to the player is fine; his dignity lies in his words).

## 6. Wordplay and running gags

- **Re-invent, keep the function.** A pun is there to make the line land: find a German idiom
  that does the same. Models from the names: *Flour Power* → `Mahlzeit!`, *Gone With the Wind* →
  `Vom Winde verweht`, *Stack ’Em High* (cairns) → `Stein auf Stein`, *Bigger Boom* → `Mehr
  Wumms`, *Lingering Tune* → `Ohrwurm`, *Dizzy Dance* → `Drehwurm`, *Big Bang* → `Urknall`,
  *Old Lucky* → `der alte Glückspilz`, *Tender Care* → `Hegen & Pflegen`, *Well Oiled* →
  `Wie geschmiert`, *Whipped* → `Sahnehäubchen`, *Kindling* → `Zunder`, *Messages in Bottles* →
  `Flaschenpost`, *Mending Bridges* → `Brücken bauen`, *Putting Down Roots* → `Wurzeln schlagen`.
- **The gloom = die Trübsal.** Fighting it is literally *Trübsal vertreiben* (to chase the blues
  away) and the Duchess *bläst Trübsal* (mopes): use both idioms whenever they fit.
- **Chapter titles alliterate** where they can: `Staub & Sporen`, `Sumpf & Schnee`,
  `Sand & See`, `Feuer & Flossen`, `Moor & Mechanik`.
- **Honorifics.** *Her/Your Radiance* → `Ihre/Eure Durchlaucht` (a real German title — literally
  “shining through”). Crumble garbles it: *Your Gloominess* → `Eure Trübseligkeit`, *Your
  Snuffiness* → `Eure Löschlichkeit`; invent more on the same pattern (`Eure Düsternheit`,
  `Eure Verdunkeltheit`, `Eure Durchlöchertheit… Durchlaucht!`). *Her Ladyship* (the Lady in
  Grey) → `die gnädige Frau`, `Ihre Gnaden`.
- **Crumble’s titles for the Duchess** keep the alliteration and the stumble: *the Duchess of
  Dusk, the Countess of Clouds, the Baroness of… of… of Bad Weather!* → `die Herzogin der
  Dämmerung, die Gräfin des Gewölks, die Baronin von…{p} von…{pp} von Schmuddelwetter!`
- **The hen** (it walked on during her aria thirty years ago) = `das Huhn`. `WIR SPRECHEN NICHT
  ÜBER DAS HUHN!` Hens say `gack`. The villain rare is `Sir Reginald, das trübsinnigste Huhn`.
- **“Nobody invited me”** — her grudge → `Mich lädt ja nie jemand ein` / `Mir schreibt nie
  jemand`; it pays off with the thirty-year-late invitation. Emphasis comes from the source’s
  tags (`{wave}`, `{shake}`) or capitals — never asterisks.
- **Hollis’s tea**, **Perkins’s “Eventually”** and **Nibs’s fear of heights** — keep the exact
  wording stable each time it recurs so it builds (`seinen Tee fallen`, `Irgendwann.`,
  `Höhenangst`).
- **Theatre words** (the Duchess’s world): stage `Bühne`, backstage `hinter der Bühne`, catwalk
  `Laufsteg` (up in the `Schnürboden`), orchestra pit `Orchestergraben`, flats `Kulissen`,
  spotlight `Scheinwerfer`, curtain `Vorhang`, encore `Zugabe`, intermission `Pause`
  (`Genießt die Pause, Schätzchen!`), audition `Vorsprechen`, dress rehearsal `Generalprobe`,
  *exit stage left* `Abgang links!`, aria `Arie`, high C `das hohe C`.

## 7. Glossary — the game’s own words (consistent with `names-de.json`)

| English | Deutsch | Notes |
|---|---|---|
| Hearthlight | Hearthlight | title, never translated |
| Marigold Cove | Marigold Cove | proper name; *the cove* → die Bucht |
| Marigold Valley | Marigold-Tal | *the valley* → das Tal |
| the Hearthlands | die Herdlande | continent 1 |
| the Dawnlands | die Morgenlande | continent 2 (»Morgenland« = the East) |
| the Wide Sea | das Weite Meer | |
| the gloom (the force, the monsters as a mass) | die Trübsal | *chase the gloom* → die Trübsal vertreiben |
| gloom ~ (creature prefix) | Trüb~ | Trübkrähe, Trübkrake, Trübhuhn, Trübsal-Wellen |
| a gloom creature · Gloomlings | ein Trübling · die Trüblinge | |
| gloomed / gloomy (infected) | vertrübt | ein vertrübter Baumhirte |
| gloom camp · gloom nest | Trüblager · Trübnest | |
| the Murk | der Grauschleier | *the Murk rolls back* → der Grauschleier lichtet sich |
| Great Hearth(s) | das Große Herdfeuer (die Großen Herdfeuer) | *relit* → wieder entfacht |
| Hearthstone | Herdstein | |
| Lamplighter(s) | Lampenanzünder / Lampenanzünderin (pl. die Lampenanzünder) | the order and the hero class |
| the Lamplighter’s Lantern | die Laterne der Lampenanzünder | |
| lantern · flame · lens | Laterne · Flamme · Linse | |
| ember (to collect) | Glut; *an ember* ein Glutstück, *embers* Glutstücke | Glimmer Ember → Schimmerglut |
| Old Glimmer (the lighthouse) | der Alte Schimmer | des Alten Schimmers |
| Glimmer Shard | Schimmerscherbe | |
| stardust | Sternenstaub | |
| waystone · attune | Wegstein · (einen Wegstein) erwecken | |
| Pelican Post · roost | die Pelikanpost · Horst (Pelikanhorst) | |
| the Dauntless Teacup | die Tollkühne Teetasse | Wendy’s airship |
| the Gloomstage | die Trübsalbühne | the flying opera house |
| the Grand Snuffer · snuff | der Große Löscher · löschen, auslöschen | |
| Snuffbot 3000 / Mk II / Mk III | Löschomat 3000 / Mk II / Mk III | |
| the Umbral Spotlight | der Schattenscheinwerfer | |
| the Grand Finale | das Große Finale | |
| the Umbral Scar | die Schattennarbe | |
| Starfall Festival | das Sternschnuppenfest | |
| Festival of Lights | das Lichterfest | |
| Festival Ring | die Festarena | |
| Party Mode | Partymodus | |
| The Adventure | Das Abenteuer | |
| chapter · quest · side quest | Kapitel · Quest (die) · Nebenquest | »Aufgabe« is fine in prose |
| journal | Tagebuch | |
| dungeon · boss · world boss | Dungeon · Boss · Weltboss | |
| hearts (friendship) | Herzen | |
| critters · critter log | Tierchen · Tierchenbuch | |
| companion · mount | Begleiter · Reittier | |
| level · XP | Stufe (St.) · EP | |
| talent · talent tree · talent point | Talent · Talentbaum · Talentpunkt | |
| light · heavy · special · air attack | leichter · schwerer Angriff · Spezialangriff · Luftangriff | |
| ultimate | Ulti | »ULTIMATE —« in descriptions → »ULTI —« |
| dodge | Ausweichen | |
| gear · weapon · rune · charm | Rüstzeug · Waffe · Rune · Anhänger | |
| Common · Rare · Epic · Legendary | Gewöhnlich · Selten · Episch · Legendär | |
| treasure hat | Schatzhut | |
| **Heroes** | | generic masculine as class names |
| Knight · Mage · Ranger · Bard | Ritter · Magier · Waldläufer · Barde | |
| Lamplighter · Gardener · Cook · Tinkerer | Lampenanzünder · Gärtner · Koch · Tüftler | |
| frying pan · star wand · slingshot · lute | Bratpfanne · Sternenstab · Steinschleuder · Laute | June’s old kit |
| lantern pole · watering can · whisk · wrench | Laternenstange · Gießkanne · Schneebesen · Schraubenschlüssel | |
| **Cast** | | |
| Duchess Gloria Gloomsworth · the Duchess | Herzogin Gloria von Grauenstein · die Herzogin | |
| Crumble | Krümel | |
| the Understudies | die Zweitbesetzung | one of them: eine Zweitbesetzung |
| Minnow · Fidget · Brick | Sprotte · Zappel · Brocken | (f · f · m) |
| Nana June | Oma June | |
| Mayor Hollis | Bürgermeister Hollis | |
| Perkins (of the Pelican Post) | Perkins (von der Pelikanpost) | |
| Captain Wendeline “Wendy” Gale · Nibs | Kapitänin Wendeline »Wendy« Sturm · Nibs | |
| Professor Hazel Burrows | Professorin Hasel Buddelmann (Prof. Hasel) | |
| Master Tock | Meister Tock | |
| Barkbeard | Borkenbart | ch2 boss |
| Foreman Grubb & the Drillosaur | Steiger Grubb & der Bohrosaurus | ch3 boss |
| King Croakington · Sir Newton | König Quakington · Sir Molchton | |
| the Frost Tenor | der Frosttenor | ch4 boss |
| the Gloom Kraken | der Trübkrake | ch5 boss |
| Grandmother Bellows | Großmutter Blasebalg | the whale island |
| Old Lucky, the Paper Dragon | der alte Glückspilz, der Papierdrache | ch7 boss |
| the Moth Queen | die Mottenkönigin | ch8 boss |
| the Lady in Grey (Lady Honoria) | die Graue Dame (Lady Honoria) | ch9 boss |
| Grandmother Kraken | Großmutter Krake | world boss |
| **Lands (Hearthlands)** | | |
| Deep Whisperwood (*the Deepwood*) | Tiefer Flüsterwald (*der Tiefwald*) | |
| Windy Heights · Bouncecap Woods | Windhöhen · Hüpfpilzwald | |
| Golden Steppe · Red Canyon | Goldene Steppe · Roter Canyon | |
| Croakmire · Frostpeak Glacier · Cloud Isles | Quakmoor · Frostspitz-Gletscher · Wolkeninseln | |
| Sunscorch Dunes · Coral Lagoon · Sunken City | Sengdünen · Korallenlagune · Versunkene Stadt | |
| Emberpeak · Whirlpool Straits · Dino Isle | Glutberg · Strudelstraße · Dino-Insel | |
| **Lands (Dawnlands)** | | |
| Whale Isle · Lanternport · Lantern Bay | Walinsel · Laternenhafen · Laternenbucht | |
| Jade Terraces · Saltmirror Flats | Jadeterrassen · Salzspiegel | |
| Emberleaf Wood · Glowtide Coast · Elderbough | Glutlaubwald · Leuchtflutküste · Urgeäst | |
| Hollowmoor (Manor) · Prism Springs | Hohlmoor (Schloss Hohlmoor) · Prismaquellen | |
| Cogsworth (Heights) · Aurora Tundra | Zahnradingen (Zahnradhöhen) · Nordlichttundra | |
| **Places in the valley** | | |
| Whisperwood · Honeydew Fields · Driftwood Beach | Flüsterwald · Honigtaufelder · Treibholzstrand | |
| Market Plaza · Nana’s Cottage · Town Hall | Marktplatz · Omas Häuschen · Rathaus | |
| Starfall Hill · the Standing Stones | Sternschnuppenhügel · die Hinkelsteine | |
| **UI** | | |
| Bag · Journal · Friends · Collection · Map · Hero | Tasche · Tagebuch · Freunde · Sammlung · Karte · Held | short tabs: Quests · Freunde · Funde |
| Settings · Options · Controls | Einstellungen · Optionen · Steuerung | |
| Continue · New Game · Resume | Weiterspielen · Neues Spiel · Fortsetzen | |
| Save game · Saving… · Saved | Speichern · Speichern… · Gespeichert | |
| Back to title | Zum Hauptmenü | |
| Next · Skip · Back · Close · Quit · OK | Weiter · Überspringen · Zurück · Schließen · Beenden · OK | |
| Paused · Pause | Pausiert · Pause | |
| Talents · Gear · Companions · Mounts · Wardrobe | Talente · Rüstzeug · Begleiter · Reittiere · Garderobe | |
| Host (the crown) · Players · Difficulty | Gastgeber · Spieler · Schwierigkeit | Cozy · Normal · Tough · Heroic → Gemütlich · Normal · Knackig · Heldenhaft |
| Display: Full · Compact · Minimal | Anzeige: Voll · Kompakt · Minimal | |
| Keyboard · Gamepad · Phone | Tastatur · Gamepad · Handy | the phone is always »Handy« |
| Talk · Open · Enter · Leave · Use | Reden · Öffnen · Betreten · Verlassen · Aktion | |
