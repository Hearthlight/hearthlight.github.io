// German — Party Mode: "The Starfall Festival" adventure and its five mini-games (Hollis and the hosts say ihr to the group; rules, phone hints and buttons say du to each player).
export const PARTY = {
  // ---------------------------------------------------------------- the adventure
  'The Starfall Festival': 'Das Sternschnuppenfest',
  'a Hearthlight party adventure': 'ein Hearthlight-Partyabenteuer',
  '{list} and {last}': '{list} und {last}',   // "Ana, Léo und Sam"
  'friend': 'ihr Lieben',                     // stands in for the names when nobody’s there

  // intro (Hollis)
  'Welcome, welcome! {names} — you made it for the Starfall Festival!': 'Willkommen, willkommen, {names}! Ihr kommt genau richtig zum Sternschnuppenfest!',
  'Tonight the whole cove sends up the great Sky Lantern, so this year’s falling stars can find their way home.': 'Heute Nacht lässt die ganze Bucht die große Himmelslaterne aufsteigen, damit die Sternschnuppen dieses Jahres nach Hause finden.',
  'But last night’s storm tore the five Star Charms right off it and flung them all over the valley!': 'Aber der Sturm letzte Nacht hat ihr die fünf Sternenamulette abgerissen und sie übers ganze Tal verstreut!',
  'Our neighbours found every one — and they won’t hand them back without a little friendly challenge. It’s tradition.': 'Unsere Nachbarn haben jedes einzelne gefunden – und rücken es nicht ohne eine kleine, freundschaftliche Herausforderung heraus. Das ist Tradition.',
  'Bring all five charms home before the stars fall. And do stick together… ish!': 'Bringt alle fünf Amulette heim, bevor die Sterne fallen. Und bleibt schön zusammen… so ungefähr!',

  // choosing where to go (votes)
  'Where shall we look first?': 'Wo suchen wir zuerst?',
  '{n}/5 charms home! Where to next?': '{n}/5 Amulette daheim! Wohin als Nächstes?',
  'the Standing Stones': 'die Hinkelsteine',   // shown as a vote label
  // objectives (kept short: the phones add « – folge dem Pfeil! »)
  'Find Bram at Honeydew Fields': 'Findet Bram auf den Honigtaufeldern',
  'Find Juniper at Frostpine Ridge': 'Findet Juniper am Frostkiefernkamm',
  'Find Ivy at Maple Hollow': 'Findet Ivy in der Ahornmulde',
  'Find Finn at Blossom Glade': 'Findet Finn auf der Blütenlichtung',
  'Find Mabel at the Standing Stones': 'Findet Mabel bei den Hinkelsteinen',

  // the charms
  'Sun Charm': 'Sonnenamulett',
  'Frost Charm': 'Frostamulett',
  'Leaf Charm': 'Blattamulett',
  'Koi Charm': 'Koi-Amulett',
  'Star Charm': 'Sternamulett',
  'Challenge complete!': 'Aufgabe gemeistert!',
  'Time’s up!': 'Zeit um!',
  '{charm} recovered!': '{charm} geborgen!',
  '{n} of 5 Star Charms': '{n} von 5 Sternenamuletten',

  // ---- Bram · Hen Round-Up (Honeydew Fields)
  'Hen Round-Up': 'Hühner-Rodeo',
  'Catch the hens, carry them to the coop': 'Fang die Hühner, bring sie in den Stall',
  // rules lines: at most two lines of the rules card
  'The hens got out of the coop!': 'Die Hühner sind ausgebüxt!',
  '{a}: grab a hen · carry it to the coop': '{a}: Huhn schnappen · in den Stall tragen',
  'A golden hen shows up halfway: worth 3!': 'Zur Halbzeit kommt ein Goldhuhn: Es zählt 3!',
  'Howdy, friends! The storm scared my hens clean out of the coop, and your Sun Charm is tangled up in all the fuss.': 'Tach auch, Freunde! Der Sturm hat meine Hühner glatt aus dem Stall gescheucht, und euer Sonnenamulett steckt mitten in dem ganzen Tohuwabohu.',
  'Every last hen home! Here — the Sun Charm. It was in Buttercup’s water trough, of all places.': 'Jedes Huhn ist wieder daheim! Hier – das Sonnenamulett. Lag ausgerechnet in Buttercups Wassertrog.',

  // ---- Juniper · Snowball Scramble (Frostpine Ridge)
  'Snowball Scramble': 'Schneeballschlacht',
  'Throw snowballs · jump to dodge': 'Wirf Schneebälle · spring zum Ausweichen',
  'Snowball fight on the frozen pond!': 'Schneeballschlacht auf dem Eisteich!',
  '{a}: throw (it aims for you a little) · {b}: jump to dodge': '{a}: werfen (zielt ein bisschen mit) · {b}: ausweichen',
  'Hit friends or snowmen: +1 each. The ice is slippy!': 'Freunde oder Schneemänner treffen: je +1. Glatteis!',
  'Oh hey, trail buddies! The Frost Charm froze into the pond — I chipped it out, but a ranger’s gotta have a little fun first…': 'Oh, hallo, Wanderkumpels! Das Frostamulett war im Teich festgefroren – ich hab’s rausgehackt, aber eine Rangerin braucht erst mal ein bisschen Spaß…',
  'Ha! Best snowball fight the ridge has ever seen. The Frost Charm’s all yours!': 'Ha! Die beste Schneeballschlacht, die der Kamm je gesehen hat. Das Frostamulett gehört euch!',

  // ---- Ivy · Acorn Hunt (Maple Hollow)
  'Acorn Hunt': 'Eichelsuche',
  'Jump into leaf piles to find acorns': 'Spring in Laubhaufen und finde Eicheln',
  'The squirrels hid their acorns in the leaf piles!': 'Die Eichhörnchen haben Eicheln im Laub gebunkert!',
  '{b}: jump INTO a pile to search it': '{b}: IN einen Haufen springen und suchen',
  'Acorns +1 · golden acorns +3 · piles grow back': 'Eichel +1 · Goldeichel +3 · Haufen wachsen nach',
  'Hello hello! The wind blew the Leaf Charm into one of these piles… along with every acorn in the valley. Let’s dig!': 'Hallihallo! Der Wind hat das Blattamulett in einen dieser Haufen geweht… zusammen mit jeder Eichel im Tal. Auf, wühlen wir!',
  'Found it! Well, you found it — about forty acorns, and the Leaf Charm. The squirrels send their thanks.': 'Gefunden! Na ja, ihr habt’s gefunden – so um die vierzig Eicheln, und das Blattamulett. Die Eichhörnchen lassen schön danken.',

  // ---- Finn · Koi Catch (Blossom Glade)
  'Koi Catch': 'Koi-Fangen',
  'Cast, wait for the buzz, then press A!': 'Auswerfen, aufs Vibrieren warten, dann A!',
  'A koi swallowed the Koi Charm (don’t worry, it spat it out).': 'Ein Koi hat das Amulett verschluckt (keine Sorge: ausgespuckt).',
  '{a}: cast into the pond · wait for your phone to BUZZ': '{a}: auswerfen · warten, bis dein Handy VIBRIERT',
  'Then {a}, quick! Golden koi +3 · the ancient koi +5': 'Dann schnell {a}! Goldkoi +3 · uralter Koi +5',
  'Oh — hi. So, uh, a koi swallowed the charm. It’s fine now. But Grandpa always said: first you fish, then you get the prize.': 'Oh – hallo. Also, äh, ein Koi hat das Amulett verschluckt. Jetzt ist alles gut. Aber Opa hat immer gesagt: Erst wird geangelt, dann gibt’s den Preis.',
  'Not bad at all. Grandpa would’ve liked you lot. Here’s the Koi Charm.': 'Gar nicht schlecht. Opa hätte euch gemocht. Hier ist das Koi-Amulett.',

  // ---- Mabel · Star Stones (the Standing Stones)
  'Star Stones': 'Sternensteine',
  'Everyone on a glowing star!': 'Alle auf einen leuchtenden Stern!',
  'The old stones only open for friends who move as one.': 'Die alten Steine öffnen sich nur Freunden, die sich wie einer bewegen.',
  'Every player stands on a glowing star at once (3 rounds)': 'Alle stehen gleichzeitig auf einem leuchtenden Stern (3 Runden)',
  'Then everybody JUMP together!': 'Dann SPRINGEN alle zusammen!',
  'Ah, the Star Charm rests in the stone circle, as it has for three hundred years. The legend says it answers only to togetherness.': 'Ah, das Sternamulett ruht im Steinkreis, wie schon seit dreihundert Jahren. Die Legende sagt, es gehorcht nur dem Zusammenhalt.',
  'Remarkable. The stones have not sung like that since I was a girl. Take the Star Charm, dears.': 'Bemerkenswert. So haben die Steine nicht mehr gesungen, seit ich ein kleines Mädchen war. Nehmt das Sternamulett, ihr Lieben.',

  // ---- the finale
  'Head back to the plaza for the Sky Lantern!': 'Zurück auf den Platz zur Himmelslaterne!',
  'Look at that — all five Star Charms, home before the first star fell. Friends, you did it!': 'Seht euch das an – alle fünf Sternenamulette daheim, bevor der erste Stern fiel. Freunde, ihr habt es geschafft!',
  'Everyone together now… one, two, three!': 'Jetzt alle zusammen… eins, zwei, drei!',
  'Same time next year? The stars will be waiting. Thank you for playing, friends!': 'Nächstes Jahr, gleiche Zeit? Die Sterne warten auf euch. Danke fürs Spielen, Freunde!',
  'What now?': 'Und jetzt?',
  'Explore the valley together': 'Gemeinsam das Tal erkunden',
  'a night stroll, no rush': 'ein Nachtspaziergang, ganz ohne Eile',
  'Play again from the start': 'Noch mal von vorn',
  'new votes, new winners': 'neue Wahl, neues Glück',
  'Back to the lobby': 'Zurück zur Lobby',
  'change outfits, invite friends': 'umziehen, Freunde einladen',
  'Free roam': 'Streifzug',
  'Free roam! Explore the valley together': 'Streifzug! Erkundet gemeinsam das Tal',
  'the big screen can press L to go back to the lobby': 'mit L am großen Bildschirm zurück zur Lobby',

  // awards: titles for anyone (no gendered nouns)
  'Starfall Festival Awards': 'Die Sternschnuppen-Preise',
  'Star of the Festival': 'Star des Festes',
  'Stardust Collector': 'Sternenstaubmagnet',
  'Hop Champion': 'Goldener Flummi',
  'Hen Whisperer': 'Hühneridol',
  'Snowball Sharpshooter': 'Schneeball-Ass',
  'Acorn Detective': 'Eichel-Spürnase',
  'Koi Whisperer': 'Koi-Kumpel',
  'Trailblazer': 'Entdeckergeist',
  'Ice Dancer': 'Schlitterprofi',
  'Best Friend': 'Herzensmensch',
  'Heart of the Party': 'Stimmungskanone',
  '{n} stardust': '{n} Sternenstaub',
  '{n} stardust [one]': '{n} Sternenstaub',   // English has one form for both
  '{n} hop': '{n} Hüpfer',
  '{n} hops': '{n} Hüpfer',
  '{n} hen': '{n} Huhn',
  '{n} hens': '{n} Hühner',
  '{n} hit': '{n} Treffer',
  '{n} hits': '{n} Treffer',
  '{n} acorn': '{n} Eichel',
  '{n} acorns': '{n} Eicheln',
  '{n} point': '{n} Punkt',
  '{n} points': '{n} Punkte',
  '{n} step': '{n} Schritt',
  '{n} steps': '{n} Schritte',
  '{n} s on ice': '{n} s auf dem Eis',

  // rules card, countdown & results
  'hosted by {who} · {n}s': 'präsentiert von {who} · {n} s',
  'Press {a} when you’re ready ({n}/{total})': 'Bereit? Drückt {a}! ({n}/{total})',
  'GO!': 'LOS!',
  '{game} — results': '{game} – Ergebnis',
  '1st': '1.',
  '2nd': '2.',
  '3rd': '3.',
  '{n}th': '{n}.',
  '{n} pt': '{n} Pkt.',
  '{n} pts': '{n} Pkt.',
  'A to continue': 'Weiter mit A',

  // the big screen during the adventure
  '{n}/{total} here': '{n}/{total} da',
  'waiting for {names}': 'warte auf {names}',
  'Final: jump together!': 'Finale: Springt zusammen!',
  'Round {n}/3': 'Runde {n}/3',

  // phones (buttons ~10 characters)
  'Ready!': 'Bereit!',
  'Next': 'Weiter',
  'Wave': 'Winken',
  'Get ready…': 'Mach dich bereit…',
  'You have ★ {n}': 'Du hast ★ {n}',
  'Story time — look at the big screen!': 'Geschichtenzeit – schau auf den großen Bildschirm!',
  '{goal} — follow the arrow!': '{goal} – folge dem Pfeil!',
  'Free roam! Wander, hop, chat with the villagers': 'Streifzug! Bummle, hüpf, plaudere mit den Dorfleuten',

  // ---------------------------------------------------------------- mini-games
  // Hen Round-Up
  'Coop {n}/{total}': 'Stall {n}/{total}',
  'A golden hen! She’s worth 3!': 'Ein Goldhuhn! Es zählt 3!',
  'Too far!': 'Zu weit!',
  'Grab': 'Schnappen',
  'GRAB!': 'SCHNAPP!',
  'Carry it to the coop!': 'Ab damit in den Stall!',
  'Catch a hen, bring it to the coop': 'Fang ein Huhn, bring es in den Stall',
  // Snowball Scramble
  'Throw': 'Werfen',
  'Dodge': 'Ausweichen',
  'Brrr! Seeing stars…': 'Brrr! Du siehst Sternchen…',
  'Hit friends & snowmen · jump to dodge': 'Triff Freunde & Schneemänner · spring zum Ausweichen',
  // Acorn Hunt
  'Jump in!': 'Rein da!',
  // Koi Catch
  'Face the pond!': 'Schau zum Teich!',
  'Too soon!': 'Zu früh!',
  'ANCIENT KOI! +5': 'URALTER KOI! +5',
  'Golden koi! +3': 'Goldkoi! +3',
  'Koi! +1': 'Koi! +1',
  'It got away…': 'Entwischt…',
  'Reel in': 'Einholen',
  'NOW!!': 'JETZT!!',
  'Wait for the bite… (your phone buzzes)': 'Warte, bis einer anbeißt… (dein Handy vibriert)',
  'A BITE! Press A!': 'ANBISS! Drück A!',
  'Face the pond and cast your line': 'Schau zum Teich und wirf die Angel aus',
  // Star Stones
  'Everyone jump together!': 'Springt alle zusammen!',
  'all at the same time…': 'alle gleichzeitig…',
  'Round {n} complete!': 'Runde {n} geschafft!',
  'JUMP!': 'SPRING!',
  'Everyone jump at the same time!': 'Alle springen gleichzeitig!',
  'Round {n}/3 · everyone on a glowing star!': 'Runde {n}/3 · alle auf einen leuchtenden Stern!',
  '{n}/{total} stars lit': '{n}/{total} Sterne leuchten',
  // the host starts the party; get unstuck
  'Start the party!': 'Party starten!',
  'Everyone’s ready — start the party when you like!': 'Alle sind bereit – starte die Party, wann du willst!',
  'Start the party whenever you like (or wait for everyone to be ready)': 'Starte die Party, wann du willst (oder warte, bis alle bereit sind)',
  '♛ {name} starts the party — walk around!': '♛ {name} startet die Party – lauf ruhig herum!',
  'Everyone’s ready! ♛ {name} starts the party': 'Alle bereit! ♛ {name} startet die Party',
  '♛ {name} starts the party': '♛ {name} startet die Party',
  'Get unstuck': 'Freikommen',
  '{name} got unstuck!': '{name} ist wieder frei!',
  'Unstuck! ♥': 'Wieder frei! ♥',
  'Get everyone unstuck': 'Alle befreien',
  'anyone stuck in a corner hops to open ground': 'wer in einer Ecke festhängt, hüpft ins Freie',
  'World map': 'Weltkarte',
  'Unfolding the map…': 'Falte die Karte auf…',
  'World': 'Welt',
  'Near me': 'In der Nähe',
};
