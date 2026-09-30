// What players can say to each other — the data both the game
// (src/ui/chat.js) and the phone (src/pad/pad.js) need: quick phrases, emotes, emoji, refusals.
// Nothing heavy here: the phone loads it too.
import { t } from '../i18n.js';

// 36 quick phrases, three pages of twelve — the English is the key, the id is what travels
export const QUICK_PAGES = ['Hi!', 'Out & about', 'Need help'];
export const QUICK = [
  ['hi', 'Hello!'], ['bye', 'Bye! See you soon!'], ['thanks', 'Thank you!'], ['yes', 'Yes!'], ['no', 'No, thanks.'], ['ok', 'OK!'],
  ['sorry', 'Sorry!'], ['lol', 'Ha ha ha!'], ['wow', 'Wow!'], ['gg', 'Well done!'], ['nice', 'Nice to meet you!'], ['love', 'I love it here!'],
  ['look', 'Look at that!'], ['photo', 'Photo time!'], ['view', 'What a view!'], ['animal', 'An animal! Keep your distance.'], ['follow', 'Follow me!'], ['wait', 'Wait for me!'],
  ['here', 'Over here!'], ['go', 'Let’s go!'], ['rest', 'Let’s take a break.'], ['ride', 'Hop in!'], ['sunset', 'The sun is setting!'], ['stars', 'Look at the stars!'],
  ['help', 'Help, please!'], ['where', 'Where are you?'], ['lost', 'I’m lost.'], ['stuck', 'I’m stuck.'], ['how', 'How does this work?'], ['map', 'Check the map!'],
  ['ready', 'I’m ready!'], ['notyet', 'Not yet!'], ['brb', 'Back in a moment.'], ['tired', 'I’m tired.'], ['hungry', 'I’m hungry!'], ['again', 'One more time!'],
].map(([id, text], i) => ({ id, text, page: Math.floor(i / 12) }));
export const QUICK_BY = Object.fromEntries(QUICK.map((q) => [q.id, q]));
// (what the screen shows goes through t(): these lists are for tools/i18n-scan.mjs, never run)
export const SCAN_QUICK = () => [t('Hello!'), t('Bye! See you soon!'), t('Thank you!'), t('Yes!'), t('No, thanks.'), t('OK!'), t('Sorry!'), t('Ha ha ha!'), t('Wow!'), t('Well done!'),
  t('Nice to meet you!'), t('I love it here!'), t('Look at that!'), t('Photo time!'), t('What a view!'), t('An animal! Keep your distance.'), t('Follow me!'),
  t('Wait for me!'), t('Over here!'), t('Let’s go!'), t('Let’s take a break.'), t('Hop in!'), t('The sun is setting!'), t('Look at the stars!'), t('Help, please!'),
  t('Where are you?'), t('I’m lost.'), t('I’m stuck.'), t('How does this work?'), t('Check the map!'), t('I’m ready!'), t('Not yet!'), t('Back in a moment.'),
  t('I’m tired.'), t('I’m hungry!'), t('One more time!'), t('Hi!'), t('Out & about'), t('Need help')];

// the emotes a player can send: the icon over the head (ui.js EMOTES) and a little gesture
export const EMOTES = [
  { e: 'wave', label: 'Wave', icon: 'wave', gesture: 'wave' },
  { e: 'cheer', label: 'Cheer', icon: 'cheer', gesture: 'cheer' },
  { e: 'laugh', label: 'Laugh', icon: 'laugh', gesture: 'laugh', expr: 'happy' },
  { e: 'heart', label: 'Love', icon: 'heart', expr: 'love' },
  { e: 'smile', label: 'Smile', icon: 'smile', expr: 'happy' },
  { e: 'sad', label: 'Sad', icon: 'sad', expr: 'sad' },
  { e: 'wow', label: 'Wow', icon: 'exclaim', expr: 'surprised' },
  { e: 'think', label: 'Hmm?', icon: 'question' },
  { e: 'sing', label: 'Sing', icon: 'note', expr: 'happy' },
  { e: 'photo', label: 'Photo pose', icon: 'photo', gesture: 'photo', expr: 'happy' },
  { e: 'point', label: 'Point', icon: 'point', gesture: 'point' },
  { e: 'sit', label: 'Sit down', icon: 'sit', gesture: 'sit' },
];
export const EMOTE_BY = Object.fromEntries(EMOTES.map((m) => [m.e, m]));
export const SCAN_EMOTES = () => [t('Wave'), t('Cheer'), t('Laugh'), t('Love'), t('Smile'), t('Sad'), t('Wow'), t('Hmm?'), t('Sing'), t('Photo pose'), t('Point'), t('Sit down')];

// emoji & emoticons become emotes (the pixel font draws Latin letters only)
const EMOJI = [
  ['heart', ['❤️', '❤', '♥', '<3', '💕', '💖', '😍', '🥰', '😘']], ['laugh', ['😂', '🤣', '😆', '😄', '😁', '😀', '😃', ':D', ':-D', 'xD', 'XD']],
  ['smile', ['🙂', '😊', '☺️', '☺', ':)', ':-)', '(:', '^^', '^_^']], ['sad', ['🙁', '☹️', '☹', '😢', '😭', '😞', ':(', ':-(', ":'("]],
  ['wave', ['👋']], ['cheer', ['🎉', '🥳', '🙌', '🎊']], ['photo', ['📷', '📸']], ['point', ['👉', '👆', '☝️', '☝']],
  ['wow', ['😮', '😲', '😱', '🤩', '!!']], ['think', ['🤔', '❓', '?']], ['sing', ['🎵', '🎶', '♪', '♫']], ['sit', ['🪑']],
];
const EMOJI_OF = new Map();
for (const [e, list] of EMOJI) for (const s of list) EMOJI_OF.set(s, e);
const EMOJI_KEYS = [...EMOJI_OF.keys()].sort((a, b) => b.length - a.length);
const PICTO = /\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}️‍]/gu;
// a message made only of emoji / emoticons → that emote; otherwise null
export function emojiOnly(text) {
  let s = String(text).trim(), first = null;
  if (!s) return null;
  while (s) {
    const k = EMOJI_KEYS.find((x) => s.startsWith(x));
    if (!k) { if (/^\s/.test(s)) { s = s.trimStart(); continue; } return null; }
    first = first || EMOJI_OF.get(k);
    s = s.slice(k.length).trimStart();
  }
  return first;
}
// the first emoji / emoticon of a text (its emote), or null
export function emojiIn(text) {
  const s = String(text);
  let best = null, at = Infinity;
  for (const k of EMOJI_KEYS) { if (k.length < 2 && /[?!]/.test(k)) continue; const i = s.indexOf(k); if (i >= 0 && i < at) { at = i; best = EMOJI_OF.get(k); } }
  return best;
}
// what the font can't draw leaves the text (the words stay)
export const noPicto = (s) => String(s).replace(PICTO, '').replace(/\s+/g, ' ').trim();

// the chat setting (Settings, the host menu): free text, the family filter, quick phrases only
export const CHAT_MODES = { free: 'Free text', filter: 'Family filter', quick: 'Quick phrases only' };
export const SCAN_MODES = () => [t('Free text'), t('Family filter'), t('Quick phrases only'), t('Chat')];

// how long a bubble stays: 2.5 s and 60 ms a character, 8 s at most
export const bubbleTime = (text) => Math.min(8, 2.5 + 0.06 * [...String(text)].length);

// the words a refusal gets, for whoever tried
export const WHY = {
  link: 'Links, addresses and numbers can’t be sent.',
  rude: 'Let’s keep it friendly!',
  slow: 'Easy — one message at a time.',
  repeat: 'You just said that!',
  quick: 'Quick phrases only (family setting).',
  empty: '',
  muted: '',
};
export const SCAN_WHY = () => [t('Links, addresses and numbers can’t be sent.'), t('Let’s keep it friendly!'), t('Easy — one message at a time.'), t('You just said that!'), t('Quick phrases only (family setting).')];

