// What a player may say out loud — pure, no DOM: the game (src/ui/chat.js) and a server run the
// same rules. A server's is the authority; the game's only explains a refusal before anything
// travels.
//   clean(text)           → the text as a bubble can show it (80 characters, no control marks)
//   judge(text, {family}) → { ok, text, why }: links, e-mails, phone numbers and @handles are
//                           refused; rude words are hidden behind ♥ when the family filter is on
//   Limiter               → 1 message per 1.5 s, bursts of 3, repeats dropped

export const MAX_LEN = 80;

// (the pixel font reads {…} as a colour: braces never reach it; nor do control characters)
export function clean(s) {
  let out = String(s ?? '').normalize('NFC')
    .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁯﻿]/g, ' ')
    .replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
  const cps = [...out];
  if (cps.length > MAX_LEN) out = cps.slice(0, MAX_LEN).join('').trim();
  return out;
}

// letters as a filter reads them: no accents, no case, 1337 undone, no dots or dashes between
// letters (f.o.o → foo), no letter said three times (fooo → foo)
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i', '€': 'e', '|': 'l' };
export function fold(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss').replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .replace(/[013457@$!€|8]/g, (c) => LEET[c] || c);
}
const squash = (s) => s.replace(/(.)\1{2,}/g, '$1$1');

// links, addresses, phone numbers, handles: never, in any mode that lets strangers read
const URL_RE = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]{2,}\.(?:com|net|org|io|gg|fr|de|es|it|co|uk|me|tv|ly|app|xyz|info|biz|link|site|online|ru|cn|be|ch|ca|us|eu)\b(?:\/\S*)?/i;
const MAIL_RE = /[\w.+-]+\s*(?:@|\(at\)|\[at\])\s*[\w-]+\s*(?:\.|\(dot\)|\[dot\])\s*[a-z]{2,}/i;
const PHONE_RE = /(?:\+?\d[\s().-]*){7,}/;
const HANDLE_RE = /(?:^|\s)@[\w.]{2,}/;
const SOCIAL_RE = /\b(?:discord|snap(?:chat)?|insta(?:gram)?|tiktok|whatsapp|telegram|kik|skype)\b/i;
export function hasLink(s) {
  const t = String(s);
  return URL_RE.test(t) || MAIL_RE.test(t) || PHONE_RE.test(t) || HANDLE_RE.test(t) || SOCIAL_RE.test(fold(t));
}

// Rude words in the five languages (folded forms, written backwards so this file doesn't read as
// a list of them). A word matches at a word's start (« technique » is fine); four letters or fewer,
// only as a whole word (« Dickens », « cocktail »).
const R = (s) => s.split(' ').map((w) => [...w].reverse().join(''));
const WORDS = [
  // en
  ...R('kcuf rekcufrehtom tihs tihsllub hctib elohssa ssabmud ssakcaj dratsab kcid tnuc erohw tuls reggin aggin toggaf gaf drater kcoc yssup reknaw tawt kcirp ynnart ekik cips knihc'),
  // fr
  ...R('edrem niatup etup drannoc essannoc epolas dualas elucne eriofne dratab euqin reuqin elliuoc reihc pdf mtn essaiffuop'),
  // es
  ...R('adreim atup otup norbac redoj sallopilig ojednep agrev oreluc nociram atupojih pdh'),
  // de
  ...R('essiehcs ssiehcs hcolhcsra hcsra eztof eruh nhosneruh reshciw epmalhcs kcif nekcif trubegssim tsaps'),
  // it
  ...R('ozzac adrem oznorts aznorts olucnaffav olucnaf anattup aiort enoilgoc aihcnim odratsab'),
].filter(Boolean);
const once = (s) => s.replace(/(.)\1+/g, '$1');            // (letters said twice or more: once)
const SHORT = new Set(WORDS.filter((w) => w.length <= 4).map(once)), LONG = WORDS.filter((w) => w.length > 4).map(once);
// the words of a text as the filter reads them (single letters in a row glued back: f.u.c.k)
function words(s) {
  const out = [], raw = squash(fold(s)).split(/[^a-z]+/).filter(Boolean);
  for (let i = 0; i < raw.length; i++) {
    if (raw[i].length > 1) { out.push(raw[i]); continue; }
    let j = i, w = '';
    while (j < raw.length && raw[j].length === 1) w += raw[j++];
    out.push(w); i = j - 1;
  }
  return out;
}
export function rude(s) {
  for (const w of words(s)) {
    const o = once(w);
    if (SHORT.has(o) || (o.endsWith('s') && SHORT.has(o.slice(0, -1)))) return true;
    for (const b of LONG) if (o.startsWith(b)) return true;
  }
  return false;
}
function mask(s) {
  return s.replace(/[\p{L}\p{N}@$!€|*.'’-]+/gu, (w) => (rude(w) ? '♥'.repeat(Math.min(5, Math.max(3, [...w].length))) : w));
}

// the verdict on a free text: { ok, text, why: '' | 'empty' | 'link' | 'rude' }
export function judge(text, { family = false } = {}) {
  const c = clean(text);
  if (!c) return { ok: false, text: '', why: 'empty' };
  if (hasLink(c)) return { ok: false, text: '', why: 'link' };
  if (family && rude(c)) { const m = mask(c); return m.replace(/[♥\s]/g, '') ? { ok: true, text: m, why: 'rude' } : { ok: false, text: '', why: 'rude' }; }
  return { ok: true, text: c, why: '' };
}

// a token bucket per speaker: `rate` a second, `burst` at once; a repeat of the last line inside
// `same` seconds doesn't count as a new message: it's dropped
export class Limiter {
  constructor(rate = 1 / 1.5, burst = 3, same = 12) { this.rate = rate; this.burst = burst; this.same = same; this.n = burst; this.t = 0; this.last = ''; this.lastT = -1e9; }
  take(key, now) {
    this.n = Math.min(this.burst, this.n + Math.max(0, now - this.t) * this.rate);
    this.t = now;
    if (key && key === this.last && now - this.lastT < this.same) return 'repeat';
    if (this.n < 1) return 'slow';
    this.n -= 1; this.last = key; this.lastT = now;
    return '';
  }
}
