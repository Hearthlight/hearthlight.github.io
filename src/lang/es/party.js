// Spanish — Party Mode: "The Starfall Festival" adventure and its five mini-games (Hollis and the hosts use ustedes; rules, phone hints and buttons use tú).
export const PARTY = {
  // ---------------------------------------------------------------- the adventure
  'The Starfall Festival': 'El Festival de las Estrellas Fugaces',
  'a Hearthlight party adventure': 'una aventura de Hearthlight con amigos',
  '{list} and {last}': '{list} y {last}',   // "Ana, Leo y Sam"
  'friend': 'Amigos',                         // stands in for the names when nobody’s there

  // intro (Hollis)
  'Welcome, welcome! {names} — you made it for the Starfall Festival!': '¡Bienvenidos, bienvenidos! {names} — ¡llegaron justo a tiempo para el Festival de las Estrellas Fugaces!',
  'Tonight the whole cove sends up the great Sky Lantern, so this year’s falling stars can find their way home.': 'Esta noche toda la caleta suelta el gran Farolillo Volador, para que las estrellas fugaces de este año encuentren el camino a casa.',
  'But last night’s storm tore the five Star Charms right off it and flung them all over the valley!': '¡Pero la tormenta de anoche le arrancó los cinco Amuletos y los desperdigó por todo el valle!',
  'Our neighbours found every one — and they won’t hand them back without a little friendly challenge. It’s tradition.': 'Nuestros vecinos los encontraron todos — y no los devolverán sin un pequeño desafío amistoso. Es tradición.',
  'Bring all five charms home before the stars fall. And do stick together… ish!': 'Traigan los cinco amuletos antes de que caigan las estrellas. Y no se separen… ¡mucho!',

  // choosing where to go (votes)
  'Where shall we look first?': '¿Por dónde empezamos a buscar?',
  '{n}/5 charms home! Where to next?': '¡{n}/5 amuletos a salvo! ¿Y ahora adónde?',
  'the Standing Stones': 'las Piedras Erguidas',   // shown as a vote label
  // objectives (kept short: the phones add « — ¡sigue la flecha! »)
  'Find Bram at Honeydew Fields': 'Busquen a Bram en los Campos de Mielada',
  'Find Juniper at Frostpine Ridge': 'Busquen a Juniper en los Pinos Escarchados',
  'Find Ivy at Maple Hollow': 'Busquen a Ivy en la Hondonada de los Arces',
  'Find Finn at Blossom Glade': 'Busquen a Finn bajo los cerezos',
  'Find Mabel at the Standing Stones': 'Busquen a Mabel en las Piedras Erguidas',

  // the charms
  'Sun Charm': 'Amuleto del Sol',
  'Frost Charm': 'Amuleto de la Escarcha',
  'Leaf Charm': 'Amuleto de la Hoja',
  'Koi Charm': 'Amuleto de la Carpa',
  'Star Charm': 'Amuleto de la Estrella',
  'Challenge complete!': '¡Desafío superado!',
  'Time’s up!': '¡Se acabó el tiempo!',
  '{charm} recovered!': '¡{charm} recuperado!',
  '{n} of 5 Star Charms': 'Amuletos: {n} de 5',

  // ---- Bram · Hen Round-Up (Honeydew Fields)
  'Hen Round-Up': 'Rodeo de gallinas',
  'Catch the hens, carry them to the coop': 'Atrapa las gallinas y llévalas al gallinero',
  // rules lines must fit on one line of the rules card (~40 characters)
  'The hens got out of the coop!': '¡Las gallinas se fugaron del gallinero!',
  '{a}: grab a hen · carry it to the coop': '{a}: agarra una gallina · al gallinero',
  'A golden hen shows up halfway: worth 3!': 'A mitad sale una gallina dorada: ¡vale 3!',
  'Howdy, friends! The storm scared my hens clean out of the coop, and your Sun Charm is tangled up in all the fuss.': '¡Buenas, amigos! La tormenta asustó tanto a mis gallinas que salieron disparadas del gallinero, y el Amuleto del Sol quedó enredado en todo el lío.',
  'Every last hen home! Here — the Sun Charm. It was in Buttercup’s water trough, of all places.': '¡Todas las gallinas en casa, hasta la última! Tomen — el Amuleto del Sol. Estaba en el bebedero de Buttercup, ¡fíjense!',

  // ---- Juniper · Snowball Scramble (Frostpine Ridge)
  'Snowball Scramble': 'Batalla de nieve',
  'Throw snowballs · jump to dodge': 'Lanza bolas de nieve · salta para esquivar',
  'Snowball fight on the frozen pond!': '¡Bolas de nieve en el estanque helado!',
  '{a}: throw (it aims for you a little) · {b}: jump to dodge': '{a}: lanza (apunta un poco por ti) · {b}: esquiva',
  'Hit friends or snowmen: +1 each. The ice is slippy!': 'Amigos o muñecos de nieve: +1. ¡Resbala!',
  'Oh hey, trail buddies! The Frost Charm froze into the pond — I chipped it out, but a ranger’s gotta have a little fun first…': '¡Hola, compañeros de ruta! El Amuleto de la Escarcha se congeló en el estanque — lo saqué a golpecitos, pero una guardabosques también tiene derecho a divertirse un poco antes…',
  'Ha! Best snowball fight the ridge has ever seen. The Frost Charm’s all yours!': '¡Ja! La mejor guerra de bolas de nieve que ha visto esta cresta. ¡El Amuleto de la Escarcha es todo suyo!',

  // ---- Ivy · Acorn Hunt (Maple Hollow)
  'Acorn Hunt': 'Caza de bellotas',
  'Jump into leaf piles to find acorns': 'Salta en los montones de hojas para encontrar bellotas',
  'The squirrels hid their acorns in the leaf piles!': '¡Las ardillas escondieron sus bellotas!',
  '{b}: jump INTO a pile to search it': '{b}: salta DENTRO de un montón para buscar',
  'Acorns +1 · golden acorns +3 · piles grow back': 'Bellota +1 · dorada +3 · las hojas vuelven',
  'Hello hello! The wind blew the Leaf Charm into one of these piles… along with every acorn in the valley. Let’s dig!': '¡Hola, hola! El viento metió el Amuleto de la Hoja en uno de estos montones… junto con todas las bellotas del valle. ¡A buscar!',
  'Found it! Well, you found it — about forty acorns, and the Leaf Charm. The squirrels send their thanks.': '¡Lo encontré! Bueno, lo encontraron ustedes — unas cuarenta bellotas, y el Amuleto de la Hoja. Las ardillas les mandan las gracias.',

  // ---- Finn · Koi Catch (Blossom Glade)
  'Koi Catch': 'Pesca koi',
  'Cast, wait for the buzz, then press A!': '¡Lanza, espera la vibración y presiona A!',
  'A koi swallowed the Koi Charm (don’t worry, it spat it out).': 'Una carpa se tragó el amuleto (ya lo escupió).',
  '{a}: cast into the pond · wait for your phone to BUZZ': '{a}: lanza · espera a que el teléfono VIBRE',
  'Then {a}, quick! Golden koi +3 · the ancient koi +5': 'Luego {a}, ¡rápido! Dorada +3 · milenaria +5',
  'Oh — hi. So, uh, a koi swallowed the charm. It’s fine now. But Grandpa always said: first you fish, then you get the prize.': 'Ah — hola. Bueno, eh, una carpa se tragó el amuleto. Ya está bien. Pero el abuelo siempre decía: primero se pesca, después viene el premio.',
  'Not bad at all. Grandpa would’ve liked you lot. Here’s the Koi Charm.': 'Nada mal. Al abuelo le habrían caído bien. Aquí tienen el Amuleto de la Carpa.',

  // ---- Mabel · Star Stones (the Standing Stones)
  'Star Stones': 'Piedras estelares',
  'Everyone on a glowing star!': '¡Todo el mundo sobre una estrella brillante!',
  'The old stones only open for friends who move as one.': 'Las piedras solo se abren a amigos unidos.',
  'Every player stands on a glowing star at once (3 rounds)': 'Todos sobre una estrella a la vez (3 rondas)',
  'Then everybody JUMP together!': '¡Luego todo el mundo SALTA a la vez!',
  'Ah, the Star Charm rests in the stone circle, as it has for three hundred years. The legend says it answers only to togetherness.': 'Ah, el Amuleto de la Estrella descansa en el círculo de piedras, como desde hace trescientos años. La leyenda dice que solo responde a la unión.',
  'Remarkable. The stones have not sung like that since I was a girl. Take the Star Charm, dears.': 'Extraordinario. Las piedras no cantaban así desde que yo era niña. Tomen el Amuleto de la Estrella, mis tesoros.',

  // ---- the finale
  'Head back to the plaza for the Sky Lantern!': '¡De vuelta a la plaza para el Farolillo Volador!',
  'Look at that — all five Star Charms, home before the first star fell. Friends, you did it!': 'Miren eso — los cinco Amuletos, en casa antes de que cayera la primera estrella. Amigos, ¡lo lograron!',
  'Everyone together now… one, two, three!': 'Ahora todos juntos… ¡una, dos y tres!',
  'Same time next year? The stars will be waiting. Thank you for playing, friends!': '¿Nos vemos el año que viene, a la misma hora? Las estrellas los estarán esperando. ¡Gracias por jugar, amigos!',
  'What now?': '¿Y ahora qué?',
  'Explore the valley together': 'Explorar el valle en grupo',
  'a night stroll, no rush': 'un paseo nocturno, sin prisas',
  'Play again from the start': 'Jugar otra vez desde el inicio',
  'new votes, new winners': 'nuevos votos, nuevos ganadores',
  'Back to the lobby': 'Volver a la sala',
  'change outfits, invite friends': 'cambiar de ropa, invitar amigos',
  'Free roam': 'Paseo libre',
  'Free roam! Explore the valley together': '¡Paseo libre! Exploren el valle juntos',
  'the big screen can press L to go back to the lobby': 'en la pantalla grande, L vuelve a la sala',

  // awards: titles for anyone (epicene nouns)
  'Starfall Festival Awards': 'Premios del Festival de las Estrellas Fugaces',
  'Star of the Festival': 'Estrella del festival',
  'Stardust Collector': 'Atrapaestrellas',
  'Hop Champion': 'Canguro de oro',
  'Hen Whisperer': 'Encantagallinas',
  'Snowball Sharpshooter': 'Cañón de nieve',
  'Acorn Detective': 'Detective de bellotas',
  'Koi Whisperer': 'Encantacarpas',
  'Trailblazer': 'Trotamundos',
  'Ice Dancer': 'Estrella del hielo',
  'Best Friend': 'Corazón de oro',
  'Heart of the Party': 'Alma de la fiesta',
  '{n} stardust': '{n} de polvo de estrellas',
  '{n} stardust [one]': '{n} de polvo de estrellas',   // English has one form for both
  '{n} hop': '{n} salto',
  '{n} hops': '{n} saltos',
  '{n} hen': '{n} gallina',
  '{n} hens': '{n} gallinas',
  '{n} hit': '{n} impacto',
  '{n} hits': '{n} impactos',
  '{n} acorn': '{n} bellota',
  '{n} acorns': '{n} bellotas',
  '{n} point': '{n} punto',
  '{n} points': '{n} puntos',
  '{n} step': '{n} paso',
  '{n} steps': '{n} pasos',
  '{n} s on ice': '{n} s en el hielo',

  // rules card, countdown & results
  'hosted by {who} · {n}s': 'presentado por {who} · {n} s',
  'Press {a} when you’re ready ({n}/{total})': '¿Todo listo? ¡Presionen {a}! ({n}/{total})',
  'GO!': '¡YA!',
  '{game} — results': '{game} — resultados',
  '1st': '1°',
  '2nd': '2°',
  '3rd': '3°',
  '{n}th': '{n}°',
  '{n} pt': '{n} pt',
  '{n} pts': '{n} pts',
  'A to continue': 'A para seguir',

  // the big screen during the adventure
  '{n}/{total} here': '{n}/{total} aquí',
  'waiting for {names}': 'esperando a {names}',
  'Final: jump together!': 'Final: ¡salten a la vez!',
  'Round {n}/3': 'Ronda {n}/3',

  // phones (buttons ~10 characters)
  'Ready!': '¡Listo!',
  'Next': 'Siguiente',
  'Wave': 'Saludar',
  'Get ready…': 'Prepárate…',
  'You have ★ {n}': 'Tienes ★ {n}',
  'Story time — look at the big screen!': 'Hora del cuento — ¡mira la pantalla grande!',
  '{goal} — follow the arrow!': '{goal} — ¡sigue la flecha!',
  'Free roam! Wander, hop, chat with the villagers': '¡Paseo libre! Pasea, brinca, charla con los vecinos',

  // ---------------------------------------------------------------- mini-games
  // Hen Round-Up
  'Coop {n}/{total}': 'Gallinero {n}/{total}',
  'A golden hen! She’s worth 3!': '¡Una gallina de oro! ¡Vale 3!',
  'Too far!': '¡Muy lejos!',
  'Grab': 'Agarrar',
  'GRAB!': '¡AGARRA!',
  'Carry it to the coop!': '¡Llévala al gallinero!',
  'Catch a hen, bring it to the coop': 'Atrapa una gallina y llévala al gallinero',
  // Snowball Scramble
  'Throw': 'Lanzar',
  'Dodge': 'Esquivar',
  'Brrr! Seeing stars…': '¡Brrr! Ves estrellitas…',
  'Hit friends & snowmen · jump to dodge': 'Dale a amigos y muñecos de nieve · salta para esquivar',
  // Acorn Hunt
  'Jump in!': '¡Adentro!',
  // Koi Catch
  'Face the pond!': '¡Mira hacia el estanque!',
  'Too soon!': '¡Demasiado pronto!',
  'ANCIENT KOI! +5': '¡CARPA MILENARIA! +5',
  'Golden koi! +3': '¡Carpa dorada! +3',
  'Koi! +1': '¡Carpa! +1',
  'It got away…': 'Se escapó…',
  'Reel in': 'Recoger',
  'NOW!!': '¡¡YA!!',
  'Wait for the bite… (your phone buzzes)': 'Espera a que pique… (tu teléfono vibra)',
  'A BITE! Press A!': '¡PICA! ¡Presiona A!',
  'Face the pond and cast your line': 'Mira hacia el estanque y lanza el sedal',
  // Star Stones
  'Everyone jump together!': '¡Salten todos a la vez!',
  'all at the same time…': 'todos al mismo tiempo…',
  'Round {n} complete!': '¡Ronda {n} superada!',
  'JUMP!': '¡SALTA!',
  'Everyone jump at the same time!': '¡Todo el mundo salta al mismo tiempo!',
  'Round {n}/3 · everyone on a glowing star!': 'Ronda {n}/3 · ¡todo el mundo sobre una estrella!',
  '{n}/{total} stars lit': '{n}/{total} estrellas encendidas',
  // the host starts the party; get unstuck
  'Start the party!': '¡Empezar la fiesta!',
  'Everyone’s ready — start the party when you like!': 'Todo el mundo está listo — ¡empieza la fiesta cuando quieras!',
  'Start the party whenever you like (or wait for everyone to be ready)': 'Empieza la fiesta cuando quieras (o espera a que todo el mundo esté listo)',
  '♛ {name} starts the party — walk around!': '♛ {name} da la salida — ¡date una vuelta mientras!',
  'Everyone’s ready! ♛ {name} starts the party': '¡Todo el mundo listo! ♛ {name} da la salida',
  '♛ {name} starts the party': '♛ {name} da la salida',
  'Get unstuck': 'Liberarse',
  '{name} got unstuck!': '¡{name} quedó libre!',
  'Unstuck! ♥': '¡Libre! ♥',
  'Get everyone unstuck': 'Liberar a todo el mundo',
  'anyone stuck in a corner hops to open ground': 'si alguien se atasca en un rincón, salta a campo abierto',
  'World map': 'Mapa del mundo',
  'Unfolding the map…': 'Desplegando el mapa…',
  'World': 'Mundo',
  'Near me': 'Cerca de mí',
};
