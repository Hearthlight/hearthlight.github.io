// The relay's little statistics: visits (the game says hello when it loads), parties, players,
// their country, the site they came from, their language — counted per day, never an IP kept.
// An address is only used on the spot: for its country (a free db-ip.com database, if present)
// and for a salted hash that tells today's visitors apart (the salt changes every day and is never
// written down). One JSON file a day in `dir`; `snapshot(days)` for /stats and the dashboard.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const dayOf = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
const bump = (o, k, n = 1) => { if (k) o[k] = (o[k] || 0) + n; };

function fresh(day) {
  return {
    day, visits: 0, uniques: 0, parties: 0, partiesEnded: 0, partyMinutes: 0, playersInParties: 0, biggestParty: 0,
    players: 0, joins: 0, busy: 0, peakRooms: 0, peakConnections: 0, peakPlayers: 0,
    hours: Array(24).fill(0),
    country: { visits: {}, parties: {}, players: {} }, site: { visits: {}, parties: {} }, lang: {}, platform: {},
  };
}

// where a page came from: its Origin, as a short name
export function siteOf(origin) {
  if (!origin || origin === 'null') return 'app or unknown';
  try {
    const h = new URL(origin).hostname;
    if (h === 'localhost' || h === '127.0.0.1' || /^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[01])\./.test(h)) return 'local network';
    return h;
  } catch (e) { return 'unknown'; }
}

export async function createStats({ dir = '', geoDb = '', log = () => {} } = {}) {
  let geo = null;
  if (geoDb && fs.existsSync(geoDb)) {
    try { const { Reader } = await import('mmdb-lib'); geo = new Reader(fs.readFileSync(geoDb)); log(`countries from ${path.basename(geoDb)}`); } catch (e) { log('no country database: ' + e.message); }
  }
  if (dir) fs.mkdirSync(dir, { recursive: true });
  const file = (day) => path.join(dir, day + '.json');
  const load = (day) => { try { return { ...fresh(day), ...JSON.parse(fs.readFileSync(file(day), 'utf8')) }; } catch (e) { return null; } };
  let today = (dir && load(dayOf())) || fresh(dayOf());
  let salt = crypto.randomBytes(16), seen = new Set(), pads = new Set();
  const past = new Map();        // day → its file (the days before today, read once)

  const roll = () => {
    const d = dayOf();
    if (d === today.day) return;
    save();
    past.set(today.day, today);
    today = fresh(d); salt = crypto.randomBytes(16); seen = new Set(); pads = new Set();
  };
  const country = (ip) => {
    if (!geo || !ip) return '??';
    try { const r = geo.get(ip); return (r && r.country && r.country.iso_code) || '??'; } catch (e) { return '??'; }
  };
  const save = () => {
    if (!dir) return;
    const tmp = file(today.day) + '.tmp';
    try { fs.writeFileSync(tmp, JSON.stringify(today)); fs.renameSync(tmp, file(today.day)); } catch (e) { log('stats not saved: ' + e.message); }
  };
  const timer = setInterval(() => { roll(); save(); }, 60000);
  timer.unref();

  return {
    country,
    // the game loaded (a beacon from the page)
    visit({ ip, origin, lang, platform }) {
      roll();
      const c = country(ip);
      today.visits++;
      bump(today.country.visits, c); bump(today.site.visits, siteOf(origin));
      bump(today.lang, String(lang || '??').slice(0, 5)); bump(today.platform, String(platform || 'web').slice(0, 12));
      const h = crypto.createHash('sha256').update(salt).update(String(ip)).digest('base64').slice(0, 12);
      if (!seen.has(h)) { seen.add(h); today.uniques++; }
      return c;
    },
    partyStart({ ip, origin }) {
      roll();
      const c = country(ip);
      today.parties++; today.hours[new Date().getUTCHours()]++;
      bump(today.country.parties, c); bump(today.site.parties, siteOf(origin));
      return c;
    },
    partyEnd({ minutes, players }) {
      roll();
      today.partiesEnded++; today.partyMinutes += Math.round(minutes); today.playersInParties += players;
      today.biggestParty = Math.max(today.biggestParty, players);
    },
    padJoin({ ip, id }) {
      roll();
      today.joins++;
      const h = crypto.createHash('sha256').update(salt).update(String(id)).digest('base64').slice(0, 12);
      if (!pads.has(h)) { pads.add(h); today.players++; bump(today.country.players, country(ip)); }
    },
    busy() { roll(); today.busy++; },
    peak(rooms, connections, players) {
      today.peakRooms = Math.max(today.peakRooms, rooms);
      today.peakConnections = Math.max(today.peakConnections, connections);
      today.peakPlayers = Math.max(today.peakPlayers, players);
    },
    // today and the days before (up to `days`), newest first, and their sums
    snapshot(days = 30) {
      roll();
      const out = [today];
      for (let i = 1; i < days; i++) {
        const d = dayOf(Date.now() - i * 86400000);
        if (!past.has(d) && dir) past.set(d, load(d));
        if (past.get(d)) out.push(past.get(d));
      }
      const sum = fresh('total');
      for (const d of out) {
        for (const k of ['visits', 'uniques', 'parties', 'partiesEnded', 'partyMinutes', 'playersInParties', 'players', 'joins', 'busy']) sum[k] += d[k] || 0;
        for (const k of ['biggestParty', 'peakRooms', 'peakConnections', 'peakPlayers']) sum[k] = Math.max(sum[k], d[k] || 0);
        (d.hours || []).forEach((n, h) => { sum.hours[h] += n; });
        for (const g of ['visits', 'parties', 'players']) for (const [k, n] of Object.entries(d.country[g] || {})) bump(sum.country[g], k, n);
        for (const g of ['visits', 'parties']) for (const [k, n] of Object.entries(d.site[g] || {})) bump(sum.site[g], k, n);
        for (const [k, n] of Object.entries(d.lang || {})) bump(sum.lang, k, n);
        for (const [k, n] of Object.entries(d.platform || {})) bump(sum.platform, k, n);
      }
      return { days: out, total: sum };
    },
    close() { clearInterval(timer); save(); },
  };
}
