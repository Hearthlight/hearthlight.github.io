// French — Party Mode: "The Starfall Festival" adventure and its five
// mini-games (src/party/story.js, src/party/games.js). Keys are the English
// source text.
// Hollis and the hosts talk to the whole group (« vous »); rules, phone hints
// and buttons speak to each player (« tu »). Players' genders are unknown, so
// award titles and anything said to one player stay neutral.
// The villagers' chatter bubbles (CHATTER, HOLLIS_BITS) live in lines.js,
// place & villager names in ui.js / lines.js.
export const PARTY = {
  // ---------------------------------------------------------------- the adventure
  'The Starfall Festival': 'Le Festival des Étoiles filantes',
  'a Hearthlight party adventure': 'une aventure Hearthlight entre amis',
  '{list} and {last}': '{list} et {last}',   // "Ana, Léo and Sam"
  'friend': 'Les amis',                       // stands in for the names when nobody's there

  // intro (Hollis)
  'Welcome, welcome! {names} — you made it for the Starfall Festival!': 'Bienvenue, bienvenue ! {names} — pile à l’heure pour le Festival des Étoiles filantes !',
  'Tonight the whole cove sends up the great Sky Lantern, so this year’s falling stars can find their way home.': 'Ce soir, toute l’anse fait s’envoler la grande Lanterne céleste, pour aider les étoiles filantes de l’année à retrouver leur chemin.',
  'But last night’s storm tore the five Star Charms right off it and flung them all over the valley!': 'Mais la tempête de cette nuit lui a arraché ses cinq Charmes étoilés et les a éparpillés aux quatre coins de la vallée !',
  'Our neighbours found every one — and they won’t hand them back without a little friendly challenge. It’s tradition.': 'Nos voisins les ont tous retrouvés — et ils ne les rendront pas sans un petit défi amical. C’est la tradition.',
  'Bring all five charms home before the stars fall. And do stick together… ish!': 'Rapportez les cinq charmes avant que les étoiles ne tombent. Et surtout, restez ensemble… ou presque !',

  // choosing where to go (votes)
  'Where shall we look first?': 'On commence par où ?',
  '{n}/5 charms home! Where to next?': 'Charmes rapportés : {n}/5 ! On va où, maintenant ?',
  'the Standing Stones': 'Les Pierres levées',   // shown as a vote label
  // objectives (kept short: the phones add « — suis la flèche ! »)
  'Find Bram at Honeydew Fields': 'Retrouvez Bram aux Champs de Miellée',
  'Find Juniper at Frostpine Ridge': 'Retrouvez Juniper aux Pins givrés',
  'Find Ivy at Maple Hollow': 'Retrouvez Ivy à la Combe aux Érables',
  'Find Finn at Blossom Glade': 'Retrouvez Finn sous les cerisiers',
  'Find Mabel at the Standing Stones': 'Retrouvez Mabel aux Pierres levées',

  // the charms
  'Sun Charm': 'Charme du Soleil',
  'Frost Charm': 'Charme du Givre',
  'Leaf Charm': 'Charme de la Feuille',
  'Koi Charm': 'Charme de la Carpe',
  'Star Charm': 'Charme de l’Étoile',
  'Challenge complete!': 'Défi réussi !',
  'Time’s up!': 'Temps écoulé !',
  '{charm} recovered!': '{charm} récupéré !',
  '{n} of 5 Star Charms': 'Charmes étoilés : {n} sur 5',

  // ---- Bram · Hen Round-Up (Honeydew Fields)
  'Hen Round-Up': 'Poules en cavale',
  'Catch the hens, carry them to the coop': 'Attrape les poules, ramène-les au poulailler',
  // rules lines must fit on one line of the rules card (~40 characters)
  'The hens got out of the coop!': 'Les poules se sont fait la malle !',
  'A: grab a hen · carry it to the coop': 'A : attrape une poule · porte-la au poulailler',
  'A golden hen shows up halfway: worth 3!': 'À mi-temps, une poule en or : elle vaut 3 !',
  'Howdy, friends! The storm scared my hens clean out of the coop, and your Sun Charm is tangled up in all the fuss.': 'Salut la compagnie ! La tempête a fait détaler mes poules hors du poulailler, et votre Charme du Soleil s’est retrouvé embarqué dans la pagaille.',
  'Every last hen home! Here — the Sun Charm. It was in Buttercup’s water trough, of all places.': 'Toutes les poules sont rentrées, jusqu’à la dernière ! Tenez — le Charme du Soleil. Il était dans l’abreuvoir de Buttercup, figurez-vous !',

  // ---- Juniper · Snowball Scramble (Frostpine Ridge)
  'Snowball Scramble': 'Bataille de neige',
  'Throw snowballs · jump to dodge': 'Lance des boules de neige · saute pour esquiver',
  'Snowball fight on the frozen pond!': 'Bataille de boules de neige sur l’étang gelé !',
  'A: throw (it aims for you a little) · B: jump to dodge': 'A : lance (ça vise un peu pour toi) · B : esquive',
  'Hit friends or snowmen: +1 each. The ice is slippy!': 'Amis ou bonshommes touchés : +1. Ça glisse !',
  'Oh hey, trail buddies! The Frost Charm froze into the pond — I chipped it out, but a ranger’s gotta have a little fun first…': 'Oh, salut, les camarades ! Le Charme du Givre était pris dans la glace de l’étang — je l’en ai sorti, mais une garde forestière a bien le droit de s’amuser un peu avant…',
  'Ha! Best snowball fight the ridge has ever seen. The Frost Charm’s all yours!': 'Ha ! La plus belle bataille de boules de neige que la crête ait jamais vue. Le Charme du Givre est à vous !',

  // ---- Ivy · Acorn Hunt (Maple Hollow)
  'Acorn Hunt': 'Chasse aux glands',
  'Jump into leaf piles to find acorns': 'Saute dans les tas de feuilles pour trouver des glands',
  'The squirrels hid their acorns in the leaf piles!': 'Les écureuils ont planqué leurs glands !',
  'B: jump INTO a pile to search it': 'B : saute DANS un tas pour le fouiller',
  'Acorns +1 · golden acorns +3 · piles grow back': 'Gland +1 · gland doré +3 · les tas repoussent',
  'Hello hello! The wind blew the Leaf Charm into one of these piles… along with every acorn in the valley. Let’s dig!': 'Coucou, coucou ! Le vent a emporté le Charme de la Feuille dans un de ces tas… avec tous les glands de la vallée. On fouille !',
  'Found it! Well, you found it — about forty acorns, and the Leaf Charm. The squirrels send their thanks.': 'Trouvé ! Enfin, c’est vous qui avez trouvé — une quarantaine de glands, et le Charme de la Feuille. Les écureuils vous disent merci.',

  // ---- Finn · Koi Catch (Blossom Glade)
  'Koi Catch': 'Pêche aux koïs',
  'Cast, wait for the buzz, then press A!': 'Lance, attends la vibration, puis appuie sur A !',
  'A koi swallowed the Koi Charm (don’t worry, it spat it out).': 'Un koï a gobé le charme (ouf, il l’a recraché).',
  'A: cast into the pond · wait for your phone to BUZZ': 'A : lance · attends que ton téléphone VIBRE',
  'Then A, quick! Golden koi +3 · the ancient koi +5': 'Puis A, vite ! Koï doré +3 · koï millénaire +5',
  'Oh — hi. So, uh, a koi swallowed the charm. It’s fine now. But Grandpa always said: first you fish, then you get the prize.': 'Oh — salut. Alors, euh, un koï a avalé le charme. Tout va bien, maintenant. Mais Papi disait toujours : d’abord on pêche, ensuite on a la récompense.',
  'Not bad at all. Grandpa would’ve liked you lot. Here’s the Koi Charm.': 'Pas mal du tout. Vous auriez plu à Papi, vous autres. Voilà le Charme de la Carpe.',

  // ---- Mabel · Star Stones (the Standing Stones)
  'Star Stones': 'Pierres étoilées',
  'Everyone on a glowing star!': 'Tout le monde sur une étoile lumineuse !',
  'The old stones only open for friends who move as one.': 'Les pierres ne s’ouvrent qu’aux amis soudés.',
  'Every player stands on a glowing star at once (3 rounds)': 'Tous sur une étoile à la fois (3 manches)',
  'Then everybody JUMP together!': 'Puis tout le monde SAUTE ensemble !',
  'Ah, the Star Charm rests in the stone circle, as it has for three hundred years. The legend says it answers only to togetherness.': 'Ah, le Charme de l’Étoile repose dans le cercle de pierres, comme depuis trois cents ans. La légende dit qu’il ne répond qu’à ceux qui ne font qu’un.',
  'Remarkable. The stones have not sung like that since I was a girl. Take the Star Charm, dears.': 'Remarquable. Les pierres n’avaient pas chanté ainsi depuis que j’étais petite fille. Prenez le Charme de l’Étoile, mes enfants.',

  // ---- the finale
  'Head back to the plaza for the Sky Lantern!': 'Retour sur la place pour la Lanterne !',
  'Look at that — all five Star Charms, home before the first star fell. Friends, you did it!': 'Regardez-moi ça — les cinq Charmes étoilés, rentrés au bercail avant la première étoile filante. Mes amis, vous avez réussi !',
  'Everyone together now… one, two, three!': 'Tous ensemble, maintenant… un, deux, trois !',
  'Same time next year? The stars will be waiting. Thank you for playing, friends!': 'Rendez-vous l’année prochaine, même heure ? Les étoiles vous attendront. Merci d’avoir joué, les amis !',
  'What now?': 'Et maintenant ?',
  'Explore the valley together': 'Explorer la vallée ensemble',
  'a night stroll, no rush': 'une balade nocturne, sans se presser',
  'Play again from the start': 'Rejouer depuis le début',
  'new votes, new winners': 'nouveaux votes, nouveaux gagnants',
  'Back to the lobby': 'Retour au salon',
  'change outfits, invite friends': 'changer de tenue, inviter des amis',
  'Free roam': 'Balade libre',
  'Free roam! Explore the valley together': 'Balade libre ! Explorez la vallée ensemble',
  'the big screen can press L to go back to the lobby': 'touche L sur le grand écran pour revenir au salon',

  // awards: titles for anyone (no gendered nouns)
  'Starfall Festival Awards': 'Palmarès du Festival des Étoiles filantes',
  'Star of the Festival': 'Star du festival',
  'Stardust Collector': 'Attrape-étoiles',
  'Hop Champion': 'Kangourou d’or',
  'Hen Whisperer': 'Idole des poules',
  'Snowball Sharpshooter': 'Canon à boules de neige',
  'Acorn Detective': 'Détective des glands',
  'Koi Whisperer': 'Complice des koïs',
  'Trailblazer': 'Globe-trotter',
  'Ice Dancer': 'Pro de la glisse',
  'Best Friend': 'Pote en or',
  'Heart of the Party': 'Âme de la fête',
  '{n} stardust': '{n} poussières d’étoiles',
  '{n} stardust [one]': '{n} poussière d’étoiles',   // English has one form for both
  '{n} hop': '{n} saut',
  '{n} hops': '{n} sauts',
  '{n} hen': '{n} poule',
  '{n} hens': '{n} poules',
  '{n} hit': '{n} cible touchée',
  '{n} hits': '{n} cibles touchées',
  '{n} acorn': '{n} gland',
  '{n} acorns': '{n} glands',
  '{n} point': '{n} point',
  '{n} points': '{n} points',
  '{n} step': '{n} pas',
  '{n} steps': '{n} pas',
  '{n} s on ice': '{n} s sur la glace',

  // rules card, countdown & results
  'hosted by {who} · {n}s': 'animé par {who} · {n} s',
  'Press A when you’re ready ({n}/{total})': 'Prêts ? Appuyez sur A ! ({n}/{total})',
  'GO!': 'PARTEZ !',
  '{game} — results': '{game} — résultats',
  '1st': '1er',
  '2nd': '2e',
  '3rd': '3e',
  '{n}th': '{n}e',
  '{n} pt': '{n} pt',
  '{n} pts': '{n} pts',
  'A to continue': 'A pour continuer',

  // the big screen during the adventure
  '{n}/{total} here': '{n}/{total} sur place',
  'waiting for {names}': 'on attend {names}',
  'Final: jump together!': 'Finale : sautez ensemble !',
  'Round {n}/3': 'Manche {n}/3',

  // phones (buttons ~10 characters)
  'Ready!': 'Prêt !',
  'Next': 'Suite',
  'Wave': 'Coucou',
  'Get ready…': 'Prépare-toi…',
  'You have ★ {n}': 'Tu as {n} ★',
  'Story time — look at the big screen!': 'Place à l’histoire — regarde le grand écran !',
  '{goal} — follow the arrow!': '{goal} — suis la flèche !',
  'Free roam! Wander, hop, chat with the villagers': 'Balade libre ! Flâne, saute, papote avec les villageois',

  // ---------------------------------------------------------------- mini-games
  // Hen Round-Up
  'Coop {n}/{total}': 'Poulailler {n}/{total}',
  'A golden hen! She’s worth 3!': 'Une poule en or ! Elle vaut 3 points !',
  'Too far!': 'Trop loin !',
  'Grab': 'Attraper',
  'GRAB!': 'ATTRAPE !',
  'Carry it to the coop!': 'Porte-la au poulailler !',
  'Catch a hen, bring it to the coop': 'Attrape une poule, ramène-la au poulailler',
  // Snowball Scramble
  'Throw': 'Lancer',
  'Dodge': 'Esquiver',
  'Brrr! Seeing stars…': 'Brrr ! Tu vois trente-six chandelles…',
  'Hit friends & snowmen · jump to dodge': 'Bombarde amis et bonshommes de neige · saute pour esquiver',
  // Acorn Hunt
  'Jump in!': 'Plonge !',
  // Koi Catch
  'Face the pond!': 'Tourne-toi vers le bassin !',
  'Too soon!': 'Trop tôt !',
  'ANCIENT KOI! +5': 'KOÏ MILLÉNAIRE ! +5',
  'Golden koi! +3': 'Koï doré ! +3',
  'Koi! +1': 'Koï ! +1',
  'It got away…': 'Il a filé…',
  'Reel in': 'Relever',
  'NOW!!': 'VITE !!',
  'Wait for the bite… (your phone buzzes)': 'Attends que ça morde… (ton téléphone vibre)',
  'A BITE! Press A!': 'ÇA MORD ! Appuie sur A !',
  'Face the pond and cast your line': 'Tourne-toi vers le bassin et lance ta ligne',
  // Star Stones
  'Everyone jump together!': 'Sautez tous ensemble !',
  'all at the same time…': 'au même moment…',
  'Round {n} complete!': 'Manche {n} réussie !',
  'JUMP!': 'SAUTE !',
  'Everyone jump at the same time!': 'Tout le monde saute en même temps !',
  'Round {n}/3 · everyone on a glowing star!': 'Manche {n}/3 · tout le monde sur une étoile !',
  '{n}/{total} stars lit': '{n}/{total} étoiles allumées',
  // the host starts the party; get unstuck
  'Start the party!': 'Lancer la partie !',
  'Everyone’s ready — start the party when you like!': 'Tout le monde est prêt — lance la partie quand tu veux !',
  'Start the party whenever you like (or wait for everyone to be ready)': 'Lance la partie quand tu veux (ou attends que tout le monde soit prêt)',
  '♛ {name} starts the party — walk around!': '♛ {name} lance la partie — balade-toi en attendant !',
  'Everyone’s ready! ♛ {name} starts the party': 'Tout le monde est prêt ! ♛ {name} lance la partie',
  '♛ {name} starts the party': '♛ {name} lance la partie',
  'Get unstuck': 'Se décoincer',
  '{name} got unstuck!': '{name} est libre !',
  'Unstuck! ♥': 'Te voilà libre ! ♥',
  'Get everyone unstuck': 'Décoincer tout le monde',
  'anyone stuck in a corner hops to open ground': 'tout personnage coincé saute vers un endroit dégagé',
  'World map': 'Carte du monde',
  'Unfolding the map…': 'On déplie la carte…',
  'World': 'Monde',
  'Near me': 'Près de moi',
};
