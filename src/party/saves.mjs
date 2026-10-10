// Portable saves contain game progress only — Party Mode’s current story, its options and the solo
// game —; relay and recovery credentials stay separate.
export const SAVE_LIMIT = 2 * 1024 * 1024;
const PARTY_KEY = /^hearthlight\.party(?:\.[a-zA-Z][a-zA-Z0-9]*\.v1|\.v1)$/;
const allowed = (key) => PARTY_KEY.test(key) || key === 'hearthlight.save.v1';
const plain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
function safe(value, depth = 0) {
  if (depth > 80) throw new Error('Invalid save');
  if (value && typeof value === 'object') for (const [key, v] of Object.entries(value)) {
    if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Invalid save');
    safe(v, depth + 1);
  }
}
export function validateSave(value) {
  if (typeof value === 'string') {
    if (new TextEncoder().encode(value).length > SAVE_LIMIT) throw new Error('Save is too large');
    value = JSON.parse(value);
  }
  if (!plain(value) || value.format !== 'hearthlight' || value.version !== 1 || !plain(value.data)) throw new Error('Invalid save');
  const keys = Object.keys(value.data);
  if (!keys.length || keys.length > 40 || keys.some((k) => !allowed(k) || typeof value.data[k] !== 'string')) throw new Error('Invalid save');
  for (const [key, raw] of Object.entries(value.data)) {
    if (key === 'hearthlight.party.fog.v1') { if (!/^[A-Za-z0-9+/]*={0,2}$/.test(raw)) throw new Error('Invalid save'); }
    else safe(JSON.parse(raw));
  }
  if (new TextEncoder().encode(JSON.stringify(value)).length > SAVE_LIMIT) throw new Error('Save is too large');
  return { format: 'hearthlight', version: 1, savedAt: Number(value.savedAt) || Date.now(), data: value.data };
}
export function exportSave(storage = localStorage) {
  const data = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (allowed(key)) data[key] = storage.getItem(key);
  }
  return validateSave({ format: 'hearthlight', version: 1, savedAt: Date.now(), data });
}
// (what a file or an online backup brings back comes in as a story of its own: slots.mjs)
export function saveEndpoint() {
  const config = window.HEARTHLIGHT || {};
  if (config.saves) return config.saves.replace(/\/$/, '');
  const base = config.relay ? new URL(config.relay) : new URL(location.href);
  base.protocol = base.protocol === 'wss:' || base.protocol === 'https:' ? 'https:' : 'http:';
  base.pathname = '/saves'; base.search = ''; base.hash = '';
  return base.href.replace(/\/$/, '');
}
export async function cloudSave({ key = '', revision = 0, method = 'PUT', snapshot, signal } = {}) {
  const match = /^([a-f0-9]{32})\.([a-f0-9]{48})$/.exec(key);
  if ((key || method === 'GET' || method === 'DELETE') && !match) throw new Error('Invalid recovery key');
  const headers = {};
  if (match) headers.Authorization = 'Bearer ' + match[2];
  if (snapshot) { headers['Content-Type'] = 'application/json'; headers['If-Match'] = String(revision); }
  const response = await fetch(saveEndpoint() + (match ? '/' + match[1] : ''), {
    method: match ? method : 'POST', headers, signal,
    body: snapshot ? JSON.stringify(validateSave(snapshot)) : undefined,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(response.status === 409 ? 'A newer online save exists. Restore it before saving again.' : response.status === 404 ? 'Online save not found or recovery key incorrect.' : result.error || 'Online save unavailable');
  return result;
}
