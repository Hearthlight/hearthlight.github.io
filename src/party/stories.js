// A saved story of Party Mode in the players’ words — what slots.mjs keeps of it, said the same
// way on the Play card, in the lobby and on the Saves page: its chapter, who played, how far the
// heroes are, when it was last played.
import { shownLevel } from '../saga/levels.js';
import { t, getLang } from '../i18n.js';
import { CHAPTERS } from '../saga/chapters/index.js';

// « Chapter 3 — The Gilded Canyon », or that the Adventure never started
export function storyName(s) {
  if (!s.begun) return t('The story has not begun');
  const ch = CHAPTERS.find((c) => c.id === s.ch) || CHAPTERS[0];
  return t('Chapter {n} — {title}', { n: ch.id, title: t(ch.title) });
}
// its players, the last ones first: as many as `fits(text)` allows, the others counted (« +2 »)
export function storyWho(s, fits = null) {
  const names = s.players || [];
  for (let n = names.length; n > 0; n--) {
    const text = names.slice(0, n).join(', ') + (n < names.length ? ' +' + (names.length - n) : '');
    if (n === 1 || !fits || fits(text)) return text;
  }
  return '';
}
// how far its heroes are: the highest level among them
export const storyLevel = (s) => t('Level {n}', { n: shownLevel(s.level) });
// when it was last played, in plain words: today, yesterday, 3 days ago; a date beyond a month
export function storyWhen(s, now = Date.now()) {
  const day = (ms) => { const d = new Date(ms); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000); };
  const n = day(now) - day(s.savedAt);
  if (n <= 0) return t('today');
  if (n === 1) return t('yesterday');
  if (n <= 31) return t('{n} days ago', { n });
  const d = new Date(s.savedAt), far = d.getFullYear() !== new Date(now).getFullYear();
  try { return d.toLocaleDateString(getLang(), far ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long' }); } catch (e) { return d.toISOString().slice(0, 10); }
}
// on one line: what it is (a message that names it), and all there is to tell it from another
export const storyLine = (s, fits = null) => [storyName(s), storyWho(s, fits)].filter(Boolean).join(' · ');
export const storyFull = (s) => [storyLine(s), storyLevel(s), storyWhen(s)].join(' · ');
export const storyCount = (n) => t('{n} saved stories', { n });

// why a story could not be opened, begun, put away or deleted (a StoryError’s code)
export function storyError(e) {
  const code = e && e.code;
  return code === 'full' ? t('Four stories at most: delete one first')
    : code === 'unreadable' ? t('This version of the game cannot read the saved stories. Nothing was changed.')
      : code === 'stuck' ? t('A story could not be put back in its place: this browser’s storage is full. Free some room and come back — nothing is lost.')
        : code === 'missing' ? t('This story is no longer here.')
          : code === 'empty' ? t('There is no story in this backup.')
            : t('This browser has no room left to put a story away. Nothing was changed.');
}
