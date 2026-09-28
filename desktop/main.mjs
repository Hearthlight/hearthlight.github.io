// Hearthlight's desktop app: the game in its own window, with the Party relay built in — it serves
// the game on this computer's Wi-Fi address too, so phones on the same network scan the big
// screen's QR code and join, no internet needed.
import { app, BrowserWindow, Menu, shell, dialog } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRelay } from './relay.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
let relay = null, win = null;

// the relay on a port of its own (8787 if free, the next ones otherwise), on every network card
async function startRelay() {
  for (let port = 8787; port < 8807; port++) {
    const r = createRelay({ port, host: '0.0.0.0', static: path.join(here, 'game'), lan: true, maxRooms: 4, quiet: true });
    try { await r.listen(); return r; } catch (e) { await r.close().catch(() => {}); }
  }
  throw new Error('No free port for the Party relay (8787–8806).');
}

// (HEARTHLIGHT_SELFTEST=<file.png>: a silent, hidden run — the game loads, a picture of it is
// saved, the relay stays up 20 s for a phone test, then the app quits; for checking a build)
const SELFTEST = process.env.HEARTHLIGHT_SELFTEST || '';

function createWindow(port) {
  win = new BrowserWindow({
    width: 1280, height: 760, minWidth: 640, minHeight: 400, show: !SELFTEST,
    title: 'Hearthlight', backgroundColor: '#14121c', autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false },
  });
  win.loadURL(`http://localhost:${port}/${SELFTEST ? '?mute=1' : ''}`);
  if (SELFTEST) selftest(port);
  // (links out of the game open in the browser)
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    const target = new URL(url);
    if (target.origin !== `http://localhost:${port}`) {
      event.preventDefault();
      // A pasted remote invitation opens in the browser, keeping this window local.
      if (['http:', 'https:'].includes(target.protocol) && /\/play\.html$/.test(target.pathname) && /^#[A-Z]{4}\.[a-f0-9]{32}$/.test(target.hash)) shell.openExternal(url);
    }
  });
  win.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  win.webContents.session.setPermissionCheckHandler(() => false);
  win.on('closed', () => { win = null; });
}

async function selftest(port) {
  const fs = await import('node:fs');
  await new Promise((r) => setTimeout(r, 9000));
  const img = await win.webContents.capturePage();
  fs.writeFileSync(SELFTEST, img.toPNG());
  const ok = await win.webContents.executeJavaScript('!!(window.game && window.game.world && window.game.world.overCol)');
  fs.writeFileSync(SELFTEST.replace(/\.png$/, '') + '.json', JSON.stringify({ port, ok, version: app.getVersion(), electron: process.versions.electron }));
  setTimeout(() => app.quit(), 20000);
}

// a small menu: fullscreen, reload, quit (and the usual Edit/Window roles on the Mac)
function menu() {
  const mac = process.platform === 'darwin';
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(mac ? [{ role: 'appMenu' }] : []),
    { label: 'View', submenu: [{ role: 'togglefullscreen' }, { role: 'reload' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }] },
    ...(mac ? [{ role: 'windowMenu' }] : [{ label: 'File', submenu: [{ role: 'quit' }] }]),
  ]));
}

app.whenReady().then(async () => {
  try { relay = await startRelay(); } catch (e) { dialog.showErrorBox('Hearthlight', String(e.message || e)); app.quit(); return; }
  menu();
  createWindow(relay.O.port);
  app.on('activate', () => { if (!win) createWindow(relay.O.port); });
});
app.on('window-all-closed', () => { app.quit(); });
app.on('before-quit', () => { if (relay) relay.close(); });
