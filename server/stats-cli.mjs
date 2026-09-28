// The relay's counters in the terminal (on the VPS: `hearthlight-stats [days]`).
const days = +(process.argv[2] || 7);
const port = process.env.PORT || 8787;
const r = await fetch(`http://127.0.0.1:${port}/stats?days=${days}`).catch(() => null);
if (!r || !r.ok) { console.log('The relay does not answer on port ' + port + '.'); process.exit(1); }
const { now, usage } = await r.json();
const pad = (s, n) => String(s).padStart(n);
const top = (o, n = 10) => Object.entries(o || {}).sort((a, b) => b[1] - a[1]).slice(0, n);
console.log(`Now: ${now.rooms}/${now.maxRooms} parties · ${now.pads} phones · ${now.connections} connections · ${now.msgsPerSecNow} msg/s · ${now.rssMiB} MiB · up ${Math.round(now.uptimeSec / 60)} min`);
if (!usage) process.exit(0);
const T = usage.total;
console.log(`\nLast ${usage.days.length} day(s): ${T.visits} visits (${T.uniques} visitors) · ${T.parties} parties · ${T.players} phones · biggest party ${T.biggestParty} · most at once ${T.peakRooms} · turned away ${T.busy}`);
console.log('\n  day          visits  visitors  parties  phones  avg party');
for (const d of usage.days) console.log(`  ${d.day}  ${pad(d.visits, 6)}  ${pad(d.uniques, 8)}  ${pad(d.parties, 7)}  ${pad(d.players, 6)}  ${pad(d.partiesEnded ? Math.round(d.partyMinutes / d.partiesEnded) + ' min' : '–', 9)}`);
console.log('\nCountries (visits · parties · phones):');
const cs = [...new Set([...Object.keys(T.country.visits), ...Object.keys(T.country.parties)])].sort((a, b) => (T.country.visits[b] || 0) - (T.country.visits[a] || 0)).slice(0, 15);
for (const c of cs) console.log(`  ${c}  ${pad(T.country.visits[c] || 0, 6)} · ${pad(T.country.parties[c] || 0, 4)} · ${pad(T.country.players[c] || 0, 4)}`);
console.log('\nWhere from (visits):', top(T.site.visits).map(([k, n]) => `${k} ${n}`).join(' · ') || '–');
console.log('Languages:', top(T.lang).map(([k, n]) => `${k} ${n}`).join(' · ') || '–');
console.log('Platforms:', top(T.platform).map(([k, n]) => `${k} ${n}`).join(' · ') || '–');
