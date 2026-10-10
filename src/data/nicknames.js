// Nicknames out of the hat: the dice by a name field, « Surprise me », a guest who joins a
// party without typing a name. Each language has its own, in its own words: cozy, playful,
// neither a first name nor a tease, 12 letters at most, only what the pixel font draws — and
// nobody the story already knows (no villager, no cast, no pet, no sheep).
// (No Three.js here: the phone controller imports it too.)

export const NAME_MAX = 12;

export const NICKNAMES = {
  en: ['Muffin', 'Pickle', 'Twig', 'Peanut', 'Marble', 'Toffee', 'Jellybean', 'Sparkle', 'Bubbles', 'Wobble', 'Cricket', 'Puddle',
    'Tumble', 'Fizz', 'Mittens', 'Socks', 'Zigzag', 'Dandelion', 'Gumdrop', 'Pogo', 'Nibbles', 'Whiskers', 'Truffle', 'Pretzel',
    'Cupcake', 'Fiddle', 'Kazoo', 'Lollipop', 'Marmalade', 'Tadpole', 'Wiggles', 'Yoyo', 'Cinnamon', 'Pumpernickel', 'Moonbeam',
    'Giggles', 'Pixel', 'Pocket', 'Scribble', 'Sprinkles', 'Squiggle', 'Thimble', 'Twinkle', 'Wombat'],
  fr: ['Pompon', 'Biscotte', 'Tartine', 'Pépin', 'Loustic', 'Chouquette', 'Zigzag', 'Praline', 'Bidule', 'Pistache', 'Nougatine',
    'Réglisse', 'Guimauve', 'Nougat', 'Brioche', 'Macaron', 'Berlingot', 'Bonbon', 'Loupiote', 'Lampion', 'Luciole', 'Étincelle',
    'Flocon', 'Clafoutis', 'Brindille', 'Plume', 'Ricochet', 'Farfadet', 'Ouistiti', 'Pirouette', 'Cabriole', 'Gribouillis',
    'Chatouille', 'Youpi', 'Perlimpinpin', 'Tralala', 'Kiwi', 'Potiron', 'Grelot', 'Papillote', 'Méli-mélo', 'Mirliton',
    'Tisane', 'Ciboulette'],
  es: ['Churro', 'Chispa', 'Canica', 'Burbuja', 'Pompón', 'Garbanzo', 'Lenteja', 'Caramelo', 'Regaliz', 'Turrón', 'Mazapán',
    'Rosquilla', 'Natilla', 'Merengue', 'Vainilla', 'Pistacho', 'Almendra', 'Piñón', 'Trébol', 'Ramita', 'Copito', 'Lucero',
    'Luciérnaga', 'Candil', 'Chispita', 'Brinco', 'Voltereta', 'Pirueta', 'Zigzag', 'Acuarela', 'Cosquillas', 'Tachán',
    'Chiribita', 'Chirimbolo', 'Periquete', 'Santiamén', 'Gominola', 'Palomita', 'Croqueta', 'Gazpacho', 'Aceituna',
    'Guisante', 'Mandarina', 'Arándano', 'Colibrí'],
  de: ['Fussel', 'Flocke', 'Flausch', 'Knuffel', 'Tupfen', 'Streusel', 'Zimt', 'Zimtstern', 'Lebkuchen', 'Marzipan', 'Krokant',
    'Lakritz', 'Brause', 'Sprudel', 'Brezel', 'Spätzle', 'Zwieback', 'Kringel', 'Schnörkel', 'Kritzel', 'Klecks', 'Zickzack',
    'Purzel', 'Hopser', 'Kreisel', 'Murmel', 'Ratzfatz', 'Flummi', 'Jojo', 'Trara', 'Juchhu', 'Hoppla', 'Hatschi', 'Hummel',
    'Glühwurm', 'Sternchen', 'Funke', 'Lampion', 'Erdnuss', 'Rosine', 'Kamille', 'Radieschen', 'Holunder', 'Simsalabim',
    'Krimskrams', 'Firlefanz'],
  it: ['Pallino', 'Scintilla', 'Fiaccola', 'Fiammella', 'Fiocco', 'Batuffolo', 'Ciuffo', 'Ninnolo', 'Quisquilia', 'Lontra',
    'Pettirosso', 'Colibrì', 'Coccinella', 'Libellula', 'Chiocciola', 'Girino', 'Pinguino', 'Pulcino', 'Tarallo', 'Mandorla',
    'Raviolo', 'Tortellino', 'Frittella', 'Ciambella', 'Cannolo', 'Babà', 'Torrone', 'Confetto', 'Liquirizia', 'Meringa',
    'Tiramisù', 'Cantuccio', 'Pistacchio', 'Pinolo', 'Cannella', 'Zenzero', 'Camomilla', 'Lenticchia', 'Mirtillo', 'Giuggiola',
    'Corbezzolo', 'Biglia', 'Trottola', 'Girandola', 'Coriandolo', 'Scarabocchio', 'Ghirigoro', 'Capriola', 'Girotondo',
    'Solletico', 'Patatrac'],
};

// one out of the hat, in a language (English when it has none) — never one of `avoid`
export function randomName(lang, avoid = [], rnd = Math.random) {
  const all = NICKNAMES[lang] || NICKNAMES.en, skip = new Set((Array.isArray(avoid) ? avoid : [avoid]).filter(Boolean));
  const list = all.filter((n) => !skip.has(n));
  const from = list.length ? list : all;
  return from[Math.floor(rnd() * from.length) % from.length];
}

// a name as it enters the game from outside (a phone, a field): text only, no braces (the pixel
// font reads them as colour tags), no control or invisible characters, single spaces, 12 characters
export function cleanName(name, max = NAME_MAX) {
  if (typeof name !== 'string') return '';
  const s = name.replace(/[{}\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, '').replace(/\s+/g, ' ').trim();
  return [...s].slice(0, max).join('').trim();
}
