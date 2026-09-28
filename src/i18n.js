// Tiny i18n. English source strings are the keys; each language maps them to
// a translation (anything missing falls back to English). `{vars}` are filled
// in after translating, so a French line can move them around; colour tags
// like {gold}…{/} and the dialogue's {name}/{pet} pass straight through.
//
//   t('Hello!')                      -> 'Bonjour !'
//   t('{n} hens home', { n: 3 })     -> '3 poules rentrées'
//   tn('{n} friend', '{n} friends', n)

// (Release v9) five languages; a dictionary is fetched the first time it's needed — loadLang()
// before the first frame, setLang() switches once it's there (listeners hear it then)
export const LANGS = { en: 'English', fr: 'Français', es: 'Español', de: 'Deutsch', it: 'Italiano' };
const LOAD = {
  fr: () => import('./lang/fr/index.js').then((m) => [m.FR, m.FR_GROUP]),
  es: () => import('./lang/es/index.js').then((m) => [m.ES, m.ES_GROUP]),
  de: () => import('./lang/de/index.js').then((m) => [m.DE, m.DE_GROUP]),
  it: () => import('./lang/it/index.js').then((m) => [m.IT, m.IT_GROUP]),
};
const DICTS = { en: null };
// (World v7) lines spoken to the whole party: « vous », ustedes, ihr, voi there — tu, tú, du in solo
const GROUP = { en: null };
const LOCALE = { en: 'en-US', fr: 'fr-FR', es: 'es-ES', de: 'de-DE', it: 'it-IT' };
let lang = 'en';
let wanted = 'en';
let audience = 'one';
export function setAudience(a) { audience = a === 'group' ? 'group' : 'one'; }
export function getAudience() { return audience; }
const listeners = [];
export const missing = new Set();   // dev aid: keys asked for but not translated

export function detectLang() {
  try {
    for (const l of (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en'])) {
      const k = String(l).toLowerCase().slice(0, 2);
      if (LANGS[k]) return k;
    }
  } catch (e) { /* no navigator */ }
  return 'en';
}

const loading = {};
export function loadLang(l) {
  if (!LOAD[l] || DICTS[l]) return Promise.resolve();
  if (!loading[l]) loading[l] = LOAD[l]().then(([d, g]) => { DICTS[l] = d; GROUP[l] = g || null; }, (e) => { console.error('language', l, e); delete loading[l]; });
  return loading[l];
}

export function setLang(l) {
  const next = LANGS[l] ? l : 'en';
  wanted = next;
  if (next !== 'en' && !DICTS[next]) { loadLang(next).then(() => { if (wanted === next && DICTS[next]) setLang(next); }); return; }
  if (next === lang) return;
  lang = next;
  for (const f of listeners) f(lang);
}
export function getLang() { return lang; }
export function onLang(f) { listeners.push(f); }

function fill(s, vars) {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m));
}

export function t(s, vars) {
  if (s === null || s === undefined) return '';
  let out = String(s);
  const d = DICTS[lang];
  if (d) {
    const g = audience === 'group' && GROUP[lang] ? GROUP[lang][out] : undefined;
    const tr = g !== undefined ? g : d[out];
    if (tr !== undefined) out = tr;
    else if (out.trim() && /[A-Za-z]/.test(out)) missing.add(out);
  }
  out = fill(out, vars);
  // French typography: thin non-breaking spaces before ! ? : ; and inside « »
  if (lang === 'fr') out = out.replace(/ ([!?:;»])/g, '\u202f$1').replace(/« /g, '«\u202f');
  return out;
}

// plural helper: tn('{n} hen', '{n} hens', n, vars)
export function tn(one, many, n, vars = {}) {
  return t(n === 1 ? one : many, { n, ...vars });
}

// numbers the local way (1,000 vs 1 000)
export function num(n) {
  return Number(n).toLocaleString(LOCALE[lang] || 'en-US');
}
