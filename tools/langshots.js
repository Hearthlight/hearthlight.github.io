// Release v9: the game's screens in one language, to spot text that overflows (German runs long),
// in the background — poll window.__ls:
//   (await import('/tools/langshots.js?' + Date.now())).start('de')        (solo + Party, ~2 min)
// Pictures: screenshots/lang-<code>-<screen>.png (960×540 pane: the solo game's own size).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function run(lang = 'de', { party = true, scale = 1, prefix = 'lang-' + lang } = {}) {
  const g = window.game, D = g.debug, i18n = await import('/src/i18n.js');
  const V = await import('/tools/sagatest.js?' + Date.now());
  await V.ready(); V.watchErrors();
  await i18n.loadLang(lang);
  g.settings.lang = lang; i18n.setLang(lang);
  const shot = async (n) => { await sleep(80); await D.step(2); await D.shot(`${prefix}-${n}`, scale); };
  const out = [];
  D.pause(true);
  // the title, the creator's tabs
  g.toTitle(); await D.step(40); await shot('title'); out.push('title');
  g.openPlay(); await D.step(20); await shot('play'); g.play = null;
  g.toCreator(); await D.step(10);
  for (let i = 0; i < g.creator.tabs.length; i++) { g.creator.setTab(i); await D.step(6); await shot('creator' + i); }
  // the solo game: the HUD in the wild, the pause menu & settings, the book's pages, a shop, a line
  await V.solo('lamplighter');
  const W = g.world;
  D.tp(-43, 86); await D.step(20); await sleep(300); await D.step(4);
  g.settings.hud = 'full'; await shot('hud-full');
  g.settings.hud = 'compact'; await shot('hud-compact');
  g.settings.hud = 'full';
  D.tp(91.5, 75); await D.step(10);
  for (const page of ['pause', 'settings', 'bag', 'quests', 'friends', 'collection', 'map', 'hero']) {
    W.menu.show(page); await D.step(8); await shot('menu-' + page); W.menu.close ? W.menu.close() : (W.menu.open = false); await D.step(2);
  }
  g.openControls(); await D.step(8); await shot('menu-controls'); W.menu.close ? W.menu.close() : (W.menu.open = false); await D.step(2);
  W.openShop('market', null); await D.step(8); await shot('shop'); if (W.shop.close) W.shop.close(); await D.step(4);
  W.say('Hollis', 'Lovely afternoon for it. Whatever “it” is. I’ll put the kettle on.');
  await D.step(90); await shot('dialogue'); await D.skip(10);
  out.push('solo');
  if (party) {
    // Party: the lobby with four phones, the host's menu is on the phone (see padshots), the TV menu
    const T = await import('/tools/partybots.js?' + Date.now());
    await T.boot(4); await D.step(30); await shot('party-lobby');
    T.mode('explore'); for (let i = 0; i < 30; i++) { await sleep(30); await D.step(10); }
    await T.skipTalk(20); await D.step(20); await shot('party-explore');
    out.push('party');
  }
  return { out, errs: V.errs(), missing: [...i18n.missing].slice(0, 30) };
}

export function start(...args) {
  window.__ls = 'run';
  run(...args).then((r) => { window.__ls = 'done ' + JSON.stringify(r); }).catch((e) => { window.__ls = 'err ' + e + ' ' + String(e && e.stack || '').slice(0, 400); });
  return 'started';
}
