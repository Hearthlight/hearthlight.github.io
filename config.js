// Hearthlight's addresses. Left empty, the Party relay is the server the page came from (the dev
// server, the desktop app, the VPS copy); the web version names its relay and its phone page here
// (the Pages workflow writes this file — see .github/workflows/pages.yml).
//   relay: 'wss://…/ws'    pad: 'https://…/pad.html'    stats: 'https://…/hello' (the relay's counters)
window.HEARTHLIGHT = window.HEARTHLIGHT || { relay: '', pad: '', stats: '', onlineRelay: 'wss://vps-ec093ef6.vps.ovh.ca/ws', onlinePad: 'https://vps-ec093ef6.vps.ovh.ca/pad.html', saves: 'https://vps-ec093ef6.vps.ovh.ca/saves' };
