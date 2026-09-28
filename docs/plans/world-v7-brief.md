# Brief — Hearthlight v7 « Le Grand Monde »

(Le prompt de lancement de l'agent de la nuit, gardé ici : relis-le après chaque reprise de contexte.)

Tu reprends Hearthlight, un jeu cozy en pixel art 2.5D (solo + Party Mode 1–8 joueurs avec les
téléphones comme manettes), tout procédural, sans build. Je dors : travaille en autonomie, ne
me pose pas de questions — décide, documente tes choix dans le plan, et continue jusqu'à ce que
TOUT soit à 9/10 minimum. Termine par un résumé en français (ce qui a été fait, les notes /10
par aspect, ce qui reste).

## Avant de toucher au code

1. Lis `CLAUDE.md` (règles, commandes, pièges), `README.md`, puis les derniers plans et journaux :
   `docs/plans/dino-v5.md` + `dino-v5-progress.md`, `docs/plans/phone-v6.md` +
   `phone-v6-progress.md` (et au besoin `adventure-v4*`, `party-v3*`, `solo-v2*`).
2. Lance un serveur de test sur un AUTRE port que celui de l'utilisateur :
   `python3 tools/devserver.py 8766` (sa sauvegarde vit sur 8765 : n'y touche jamais).
3. Joue et mesure l'existant (solo + Party avec bots), note chaque aspect /10 avant de commencer.

## Ce que je veux (dans l'esprit actuel : cozy, drôle, pixel art net, tout procédural)

1. **Un monde beaucoup plus grand, d'envergure « WoW vanilla »** : au moins **2 continents**
   (+ îles), une trentaine de zones au total avec des **biomes variés** et des **monstres variés**
   (nouvelles familles par biome, élites, rares, boss de monde). Des villes/hubs, des routes, des
   points d'intérêt denses, des trajets qui donnent envie (montures, pierres de voyage, lignes
   aériennes à la WoW, bateau/dirigeable entre continents avec une cinématique).
2. **Toute la trame principale revue** (tu peux changer complètement l'histoire actuelle) :
   + de PNJ et de quêtes, des **zones qui se débloquent au fur et à mesure**, des monstres de plus
   en plus puissants. Aujourd'hui, à plusieurs, les monstres deviennent trop faibles en fin de
   partie : corrige ça pour de bon.
3. **Des dialogues fun et engageants**, inspiration *Mario & Luigi : Superstar Saga* (méchants
   absurdes et récurrents, répliques qui claquent, running gags, clins d'œil) et *A Short Hike*
   (PNJ chaleureux, curieux, petites histoires perso, humour tendre, répliques courtes).
4. **Des cinématiques** : des scènes où il se passe des choses à l'écran (caméra qui bouge, persos
   qui jouent la scène, effets, musique), avec de vrais moments « wouahou » qui surprennent.
5. **Des donjons**, des **mini-boss** et des **gros boss**, un **levelling plus poussé**.
6. **Quelques quêtes secondaires et mini-jeux**.
7. **Toujours jouable seul ou à plusieurs** (1–8), avec un monde et une quête cohérents dans les
   deux modes.

L'ordre est à toi, mais continue jusqu'à ce que ce soit bon.

## Règles non négociables (voir CLAUDE.md)

- Tout est procédural : jamais de fichier image ou audio. Pixels nets (échelles entières), toon
  shading, police pixel du jeu, panneaux papier, sons & musiques synthétisés (`engine/audio.js`).
- Chaque texte visible passe par `t('English', vars)` (ou `tn`) ; le français va dans
  `src/lang/fr/*.js` (nouveau contenu → nouveau fichier enregistré dans `src/lang/fr/index.js`),
  en suivant `tools/i18n-glossary.md` (tutoiement, typographie française). `node tools/i18n-scan.mjs`
  doit toujours dire **0 missing** ; la console et `window.__errs` : **0 erreur**.
- Solo et Party partagent leurs systèmes (`src/solo/wild.js` est une « fête à un joueur ») : tout ce
  que tu changes doit marcher dans les deux modes — teste les deux, à chaque jalon.
- Après chaque jalon : tests (solo ; Party avec 1, 4 et 8 bots ; l'histoire complète jouée par les
  bots — mets `T.autoplay` à jour pour la nouvelle trame), captures d'écran que tu regardes d'un œil
  critique, notes /10, itérations jusqu'à ≥ 9, puis **commit & push sur `origin/main`** (message
  terminé par la ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`). Le jeu doit rester
  jouable à chaque commit.
- Tiens un plan `docs/plans/world-v7.md` et un journal `docs/plans/world-v7-progress.md` (mis à jour
  à chaque jalon, pour pouvoir reprendre après une perte de contexte), et mets `CLAUDE.md` à jour
  (arborescence, plans).

## Méthode conseillée

1. **Bible de design d'abord** (`docs/plans/world-v7.md`) : la carte des continents (zones, niveaux,
   biomes, hubs, donjons, trajets), l'histoire en actes/chapitres (qui débloque quoi, et comment),
   le casting (héros, alliés, méchants, running gags, voix de chacun), la liste des quêtes (principales
   et secondaires), les tables de niveaux/XP/butin, le bestiaire par zone, la liste des cinématiques
   (avec leur « wouahou »), les mini-jeux, le plan technique, et les jalons avec leurs critères de
   réussite. Rends la carte avec `node tools/bigmap.mjs` pour la juger.
2. **Une tranche verticale tôt** : le premier chapitre complet (zone, PNJ, quêtes, dialogues, une
   cinématique, un donjon court avec son boss) en solo ET à plusieurs, poli à 9/10, avant d'étendre
   au reste — c'est elle qui prouve le ton et le fun.
3. Ensuite le reste des chapitres, zones, donjons, quêtes secondaires, mini-jeux, puis des passes
   d'équilibrage (bots à 1/4/8 joueurs, à différents niveaux) et de polish.

## Pistes et repères techniques (à toi de trancher, en mesurant)

- **Le monde** : `src/world/big/` — `layout.js` (zones = graines de Voronoï déformées, `ZONES`,
  `BIG`), `gen.js` (génération : 124 ms pour 800×400 aujourd'hui), `paint.js` (sol peint dans des
  workers), `stream.js` (chunks 32×32 autour des caméras), `collide.js`, `minimap.js` (`WorldMap` :
  carte 1 px/tuile + brouillard par cellules 8×8), `objects*.js` (décor instancié), `landmarks.js`
  (bâtiments/POI). La vallée faite main (240×128) vit dans le grand monde à coordonnées fixes.
  Deux options : un seul grand plan (ex. ~2400×1400 avec un océan entre les continents) ou une
  carte par continent avec transition. Budgets : génération < 2–3 s, ≤ 16 ms/frame à 8 joueurs en
  écran partagé sur ce Mac (aujourd'hui 13,4 ms en 3 vues), mémoire raisonnable.
- **Sauvegardes** : solo (`state.wild` dans la sauvegarde), Party (`localStorage`
  `hearthlight.party.*` : brouillard, camps, repaires, pierres, profils par téléphone). Migre les
  anciennes sauvegardes ou réinitialise proprement ce qui doit l'être (sans crash).
- **La carte du téléphone** (`src/pad/padmap.js`, alimentée par `mapBase`/`mapUpdate` dans
  `src/party/worldmap.js`) : le relais limite un message écran→téléphone à **1 Mo** (et
  téléphone→écran à 64 Ko). Avec un monde bien plus grand, envoie une vue d'ensemble réduite +
  des tuiles détaillées à la demande quand on zoome. Les cartes du grand écran (`drawWorldPanel`,
  `MapView`) et les repères (`src/party/mapmarks.js` : chaque système déclare `mapMarks(out)`)
  doivent suivre (onglets par continent, zoom).
- **Niveaux et difficulté** : `MAX_LEVEL` (30) dans `src/combat/v4/talents.js`, `XP_NEED` dans
  `src/combat/combat.js`, la montée en PV selon le nombre de joueurs dans `Combat.spawn`, les camps
  qui s'alignent sur le niveau moyen du groupe (`Encounters.level()`), les boss de repaire
  (`Lairs.wake`), la difficulté (`diff`). Idées : zones à niveaux fixes et affichés (couleurs à la
  WoW selon l'écart de niveau), monstres qui gardent leur niveau, montée en puissance par nombre de
  joueurs (PV ET dégâts), synchronisation de niveau pour jouer entre amis de niveaux différents,
  cap relevé avec arbres de talents et équipement qui suivent, XP surtout via les quêtes.
- **Dialogues** : `src/ui/dialogue.js` (say/choose, portraits `render/portraits.js`), solo
  `world.say`, Party `P.say`/`P.ask` (votes sur les téléphones). Pense rythme comique : pauses,
  secousses, zooms, émotes, expressions de portrait, répliques courtes, et du texte optionnel pour
  qui veut bavarder.
- **Cinématiques** : il existe `world.cinematic`, `P.cinematic`, `showBanner`, la secousse caméra,
  les particules (`systems/fx.js`) et les gros effets (`src/combat/v4/vfx.js` : ondes de choc,
  piliers de lumière, météores, éclairs…). Construis un vrai système de scènes (timeline : caméra
  qui se déplace et zoome, acteurs qui marchent et jouent, bandes noires, cartons-titres, flashs,
  musique), passable (le maître en Party, une touche en solo ; les téléphones affichent « regarde
  l'écran ! »). Vise des scènes marquantes : un continent qui se révèle, un boss qui fait son
  entrée, le ciel qui se déchire, un dirigeable géant…
- **Donjons** : le système de pièces (`src/party/rooms.js` : pièces construites hors carte à l'est
  de x=1000, éclairage par vue) est une bonne base pour des donjons instanciés multi-salles
  (couloirs, pièges, énigmes, packs, mini-boss, boss à phases télégraphiées comme
  `src/combat/v3/bosses.js` et `src/combat/v5/tyrant.js`), jouables de 1 à 8.
- **Monstres** : le bestiaire (`src/combat/v3/bestiary.js`, `v5/dinofoes.js`, `v5/newgloom.js`) —
  chaque famille doit demander quelque chose de différent, attaques toujours annoncées.
- **Tests** : `window.game.debug` (`step`, `shot`, `tp`, `hour`…), bots `tools/partybots.js`
  (`boot`, `mode`, `fight`, `autoplay`…). Pièges vus récemment : ferme tout onglet de manette
  (pad) resté ouvert — deux manettes avec le même identifiant se déconnectent l'une l'autre toutes
  les 2 s ; si un vieux téléphone porte la couronne, donne-la au premier bot
  (`P.host.give(P.players.find((p) => p.id === 'bot0'))`) sinon `T.autoplay` ne démarre pas ;
  `javascript_tool` coupe à 45 s (découpe ou lance en tâche de fond) ; laisse passer du vrai temps
  avant une capture d'un endroit nouveau (sol peint par des workers) ; ne nomme jamais une variable
  `t` dans une fonction qui appelle `t()` ; un hook Bash bloque les heredocs contenant le mot nu
  « helm » ; édite par remplacements exacts vérifiés (jamais de découpe entre deux marqueurs).

## Qualité attendue

Note chaque aspect /10 (au moins : taille & variété du monde, biomes, bestiaire, histoire,
dialogues, cinématiques, PNJ & quêtes, donjons & boss, levelling & équilibrage solo/multi,
quêtes secondaires & mini-jeux, téléphone & cartes, performances) et itère jusqu'à ≥ 9 partout.
Juge sur des captures en jeu, comme le ferait un joueur exigeant. À la fin : README à jour (sections
et captures), plans et journal à jour, et le résumé en français.
