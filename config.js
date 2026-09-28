// Hearthlight's addresses. Left empty, the Party relay is the server the page came from (the dev
// server, the desktop app, the VPS copy); the web version names its relay and its phone page here
// (the Pages workflow writes this file — see docs/plans/release-v9.md, « Publication »).
//   relay: 'wss://…/ws'    pad: 'https://…/pad.html'    stats: 'https://…/hello' (the relay's counters)
window.HEARTHLIGHT = window.HEARTHLIGHT || { relay: '', pad: '', stats: '' };
