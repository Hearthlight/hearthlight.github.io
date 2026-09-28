// Friendship letters: when you reach 3 and 6 hearts with a villager, they
// slip a note (and a little something) into your mailbox.

export const FRIEND_LETTERS = {
  hollis: {
    3: { title: 'From the Mayor’s desk', text: 'Dear {name},\n\nI was tidying the town hall attic and found June’s old flower vase — the one that sat on her windowsill for forty years. It seemed wrong to leave it in a box.\n\nPut something bright in it. She always did.', sign: '— Hollis', item: 'f_flowers' },
    6: { title: 'A hat for the occasion', text: 'Dear {name},\n\nEvery mayor keeps a spare top hat, in case of emergencies (ribbon cuttings, surprise weddings, particularly large turnips).\n\nI have two. Consider this one a thank-you from the whole cove — and an unofficial nomination for next mayor.', sign: '— Hollis', item: 'c_tophat' },
  },
  rosa: {
    3: { title: 'Still warm', text: 'Hi sweetheart!\n\nI baked one too many tarts again. (I always bake one too many. It’s on purpose.) This one has your name on it — literally, I wrote it in the crust.\n\nCome by for tea soon. Mabel’s coming Thursday!', sign: '— Rosa ♥', item: 'tart' },
    6: { title: 'A little light', text: 'Dear {name},\n\nPip says you’re “basically family”. He’s right, as usual.\n\nThese candles were my Gran’s — she lit them every night the fishing boats were out. I want them in a house that feels like home. I think yours does now.', sign: '— Rosa', item: 'f_candles' },
  },
  pip: {
    3: { title: 'TOP SECRET', text: 'dear {name}\n\nthis is my SECOND best shell. the best one is a secret. you are my second best friend. the first is also a secret (its Mochi dont tell)\n\nkeep it safe!!!', sign: '— Pip (age 8)', item: 'seaglass' },
    6: { title: 'Captain Snuggles', text: 'dear {name}\n\nMom says im too big for Captain Snuggles now. i am NOT but he says he wants to go on an adventure to your house. please give him the best spot. he likes windows.\n\nyour friend forever', sign: '— Pip', item: 'f_teddy' },
  },
  finn: {
    3: { title: 'Extra catch', text: '{name} —\n\nHad a good morning on the pier. Too many mackerel for one guy. Figured you’d know what to do with them.\n\nTide’s good on Tuesdays, by the way. Don’t tell anyone.', sign: '— Finn', item: 'fish_mackerel', qty: 2 },
    6: { title: 'Grandpa’s rod', text: '{name},\n\nThis was Grandpa’s good rod. Bamboo, brass, never lost a fish he meant to keep. It’s been leaning in the corner since he passed.\n\nIt should be out on the water. With you.', sign: '— Finn', item: 'u_rod' },
  },
  ivy: {
    3: { title: 'Seeds of sunshine', text: 'Hello hello!\n\nThese sunflower seeds come from the tallest sunflower I ever grew — taller than Theo! Plant them somewhere they can see the sea.\n\nPlants are happier when they have a view. So are people!', sign: '— Ivy', item: 'seed_sunflower', qty: 5 },
    6: { title: 'Moonlight in a packet', text: 'Dear {name},\n\nI’ve been saving these for someone special. Moonbloom seeds — they open under the stars and hum a little if you listen closely.\n\nThank you for being the kind of friend who listens closely.', sign: '— Ivy', item: 'seed_moonbloom', qty: 3 },
  },
  theo: {
    3: { title: 'Spare chair', text: '{name}.\n\nMade one chair too many. Oak, dovetailed, no nails. Sits nice.\n\nYours.', sign: '— Theo', item: 'f_chair' },
    6: { title: 'Built to last', text: '{name},\n\nI don’t say much. You noticed that and never minded. Most people fill the quiet. You just… sit in it with me.\n\nBuilt you a bookshelf. Took a while. It’ll outlast both of us.', sign: '— Theo', item: 'f_shelf' },
  },
  mabel: {
    3: { title: 'Knitted with care', text: 'My dear {name},\n\nI knit when I can’t sleep, and I have not slept much since the pages came home. This scarf is the result. Wool from Bram’s sheep, dye from Ivy’s madder root.\n\nIt will be ready in your wardrobe.', sign: '— Mabel', item: 'c_scarf' },
    6: { title: 'A new chapter', text: 'Dear {name},\n\nI have begun writing the next volume of the Legend of Old Glimmer. Chapter one is about a newcomer who arrived by ferry.\n\nHere is the old globe from the reading room. Every legend needs a map of the world.', sign: '— Mabel', item: 'f_globe' },
  },
  sol: {
    3: { title: 'On the house', text: 'Hey {name}!\n\nThree lattes, on the house. Don’t argue, I already wrote it in the ledger as “friendship expenses”.\n\nCome to the plaza tonight — I’m trying out a new song.', sign: '— Sol ♪', item: 'coffee', qty: 3 },
    6: { title: 'Your song', text: '{name},\n\nI finished it. The song about the cove. There’s a verse about you in it — don’t worry, it rhymes.\n\nThis old radio used to play in the café before we could afford a guitar player. Now it can play at yours.', sign: '— Sol', item: 'f_radio' },
  },
  wren: {
    3: { title: 'A small painting', text: '{name}…\n\nI painted the cove at dusk. It isn’t very good. I mean, it’s okay. I mean — I’d like you to have it.\n\nPlease don’t hang it anywhere too visible.', sign: '— Wren', item: 'f_painting' },
    6: { title: 'Brave colors', text: 'Dear {name},\n\nI hung three paintings in the café. People looked at them. Someone bought one! I would never have dared without you.\n\nHere’s my spare smock. Everyone should get to be a painter sometimes.', sign: '— Wren', item: 'c_smock' },
  },
  bram: {
    3: { title: 'Fresh from the hives', text: 'Howdy {name}!\n\nThe bees had a bumper week, so here’s two jars of clover honey. I told them it was for you — they worked extra hard.\n\nCome see Buttercup, she misses you.', sign: '— Bram', item: 'honey', qty: 2 },
    6: { title: 'Farm hand of the year', text: 'Hey {name},\n\nOfficial Honeydew Fields award for Best Neighbor. It’s a hat. My old straw hat, to be exact — it’s seen forty harvests and it’s got a few more in it.\n\nWear it proud.', sign: '— Bram & Buttercup', item: 'c_straw' },
  },
  juniper: {
    3: { title: 'Trail treats', text: 'Hi trail buddy!\n\nMade a batch of campfire s’mores and saved you two. They survived the walk. Mostly. One might be a little squished (I sat on the bag).\n\nThe owls say hi.', sign: '— Juniper', item: 'smore', qty: 2 },
    6: { title: 'For clear nights', text: 'Dear {name},\n\nMy old ranger telescope — I finally got a new one, and this one deserves a window with a view.\n\nPoint it at the Heron and look just left of its wing. That little smudge is a whole other galaxy. Isn’t that wild?', sign: '— Juniper', item: 'f_telescope' },
  },
  marlo: {
    3: { title: 'Found on the tide line', text: 'Ahoy {name},\n\nThe tide brought in a perfect little starfish this morning. It told me it wanted to see the mainland.\n\n(Starfish say a lot, if you know how to listen.)', sign: '— Capt. Marlo', item: 'starfish' },
    6: { title: 'A tank for tiny sailors', text: 'Dear {name},\n\nI’m giving you my old fish tank. Forty years it sat in the wheelhouse, keeping me company on the long crossings.\n\nFill it with something that makes you smile. That’s what I did.', sign: '— Marlo', item: 'f_tank' },
  },
};
