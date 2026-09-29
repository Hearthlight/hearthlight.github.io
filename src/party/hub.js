import { t, onLang } from '../i18n.js';
import { exportSave, importSave, validateSave, cloudSave } from './saves.mjs';

// Saves & backups (Settings, or the host menu's Options): save now, export / import a file,
// an optional online backup with its recovery key. A page of its own over the game (files and
// keys want a mouse and a keyboard); Esc, B on a gamepad or Close leaves it.
const node = (tag, text, attrs = {}) => { const el = document.createElement(tag); if (text) el.textContent = text; Object.assign(el, attrs); return el; };
const KEY = 'hearthlight.cloud.v1';
export class SavesDialog {
  constructor(game) {
    this.game = game;
    this.dialog = node('dialog', '', { className: 'party-dialog' }); document.body.append(this.dialog);
    for (const event of ['keydown', 'keyup', 'pointerdown', 'pointerup']) this.dialog.addEventListener(event, (e) => e.stopPropagation());
    this.dialog.addEventListener('close', () => this.released());
    onLang(() => { if (this.dialog.open) this.open(); });
    setInterval(() => { if (this.credentials() && ['party', 'game'].includes(game.mode)) this.upload(false); }, 60000);
  }
  get isOpen() { return this.dialog.open; }
  // (a gamepad's B closes it: the game reads no input while it's open)
  update() {
    if (!this.dialog.open) return;
    const pads = navigator.getGamepads ? [...navigator.getGamepads()] : [];
    const b = pads.some((gp) => gp && gp.buttons[1]?.pressed);
    if (b && !this.bDown) this.close();
    this.bDown = b;
  }
  released() {
    const P = this.game.mode === 'party' ? this.game.party : null;
    if (P && this.pausedParty === P && !this.wasPaused && !P.host.menu) P.host.setPaused(false);
    this.pausedParty = null;
    this.game.input.keys.clear(); this.game.input.consume();
    document.getElementById('ui')?.focus?.();
  }
  close() { if (this.dialog.open) this.dialog.close(); }
  credentials() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } }
  remember(value) { localStorage.setItem(KEY, JSON.stringify(value)); }
  message(text, bad = false) { if (!this.notice) return; this.notice.textContent = t(text); this.notice.classList.toggle('error', bad); }
  button(parent, label, action) { const b = node('button', t(label)); b.type = 'button'; b.onclick = () => Promise.resolve().then(action).catch((e) => this.message(e.message || 'Save failed', true)); parent.append(b); return b; }
  section(label, parent = this.dialog) { const section = node('section'); section.append(node('h3', t(label))); parent.append(section); return section; }
  open() {
    const g = this.game, P = g.mode === 'party' ? g.party : null;
    if (!this.dialog.open) {
      this.pausedParty = P; this.wasPaused = !!P?.paused;
      if (P && !this.wasPaused) P.host.setPaused(true, t('The big screen'));
      this.bDown = true;
    }
    g.input.keys.clear(); g.input.consume();
    this.dialog.setAttribute('aria-label', t('Saves & backups'));
    this.dialog.replaceChildren(); this.confirmButton = null;
    const header = node('header'); header.append(node('h2', t('Saves & backups')));
    this.button(header, 'Close', () => this.close()); this.dialog.append(header);
    this.notice = node('p', '', { className: 'hub-notice' }); this.notice.setAttribute('role', 'status'); this.dialog.append(this.notice);
    const here = this.section('On this device');
    if (g.mode !== 'title') this.button(here, 'Save now', () => { this.localSave(); this.message('Saved on this device'); });
    this.button(here, 'Export save', () => {
      const snapshot = this.localSave(true);
      const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot)], { type: 'application/json' }));
      const a = node('a', '', { href: url, download: 'hearthlight-' + new Date().toISOString().slice(0, 10) + '.json' }); a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.message('Backup exported');
    });
    if (g.mode === 'title') {
      const label = node('label', t('Import save')), file = node('input', '', { type: 'file', accept: '.json,application/json' }); label.append(file); here.append(label);
      file.onchange = async () => {
        try {
          if (!file.files?.[0]) return;
          if (file.files[0].size > 2 * 1024 * 1024) throw new Error('Save is too large');
          let snapshot;
          try { snapshot = validateSave(await file.files[0].text()); } catch { throw new Error('Invalid save'); }
          this.confirmRestore(snapshot);
        } catch (e) { this.message(e.message || 'Invalid save', true); }
      };
    } else here.append(node('p', t('Return to the title screen to import or restore a save.')));
    const online = this.section('Online backup');
    online.append(node('p', t('Optional: save online now, then automatically every minute while playing. Keep the recovery key private. Backups expire after 90 days without an update.')));
    if (g.mode !== 'title') this.button(online, 'Save online', () => this.upload(true));
    if (this.credentials()) {
      this.button(online, 'Show recovery key', () => this.showKey(online));
      this.button(online, 'Stop automatic online backups', () => { localStorage.removeItem(KEY); this.message('Automatic online backups stopped. Keep your recovery key to restore the existing backup.'); this.open(); });
    }
    if (g.mode === 'title') {
      const label = node('label', t('Recovery key')), key = node('input', '', { type: 'password', autocomplete: 'off', placeholder: t('Recovery key') }); label.append(key); online.append(label);
      this.button(online, 'Restore online backup', async () => {
        const value = key.value.trim(), result = await cloudSave({ key: value, method: 'GET' });
        this.confirmRestore(validateSave(result.snapshot), { key: value, revision: result.revision });
      });
    }
    if (!this.dialog.open) this.dialog.showModal();
  }
  showKey(parent) {
    const cred = this.credentials(); if (!cred) throw new Error('Save online first');
    parent.querySelector('input.recovery')?.remove();
    const field = node('input', '', { value: cred.key, readOnly: true, className: 'recovery' }); field.setAttribute('aria-label', t('Recovery key')); parent.append(field); field.focus(); field.select();
  }
  localSave(allowExport = false) {
    const g = this.game;
    if (g.mode === 'party' && !g.party.saveNow() && !allowExport) throw new Error('Save failed. Export a backup before leaving.');
    if (g.mode === 'game') g.world.save('quiet');
    let snapshot;
    try { snapshot = exportSave(); } catch (error) { if (!allowExport || g.mode !== 'party') throw error; snapshot = { format: 'hearthlight', version: 1, savedAt: Date.now(), data: {} }; }
    if (g.mode === 'party') Object.assign(snapshot.data, Object.fromEntries(g.party.pendingSaves));
    return validateSave(snapshot);
  }
  confirmRestore(snapshot, credentials) {
    if (this.uploading) { this.message('Please wait for the online backup to finish.'); return; }
    this.message('This will replace the saved progress for the modes in this backup.');
    this.confirmButton?.remove();
    this.confirmButton = this.button(this.notice, 'Confirm restore', () => {
      importSave(snapshot);
      // (an imported file keeps the online backup's key: it may be the only copy)
      if (credentials) this.remember(credentials);
      this.close(); this.game.toTitle(); this.game.titleMessage = t('Save restored');
    });
  }
  async upload(manual) {
    if (this.uploading) return;
    this.uploading = true;
    try {
      const snapshot = this.localSave(), credentials = this.credentials();
      const result = await cloudSave({ ...credentials, snapshot, signal: AbortSignal.timeout(15000) });
      const first = !credentials;
      this.remember({ key: result.key || credentials.key, revision: result.revision });
      if (manual) { this.message('Online backup saved. Keep your recovery key.'); if (first && this.dialog.open) { this.open(); this.message('Online backup saved. Keep your recovery key.'); this.showKey(this.dialog.querySelectorAll('section')[1]); } }
    } catch (e) { if (manual) this.message(onlineError(e), true); }
    finally { this.uploading = false; }
  }
}

// the backup service's answers, in the player's words (a browser's own error stays out)
function onlineError(e) {
  const m = String(e && e.message || '');
  const known = ['Please wait before trying again', 'Origin not allowed', 'Online backup storage is full', 'Online backups are not enabled on this server', 'Save online first', 'Save is too large', 'Invalid save', 'Invalid recovery key',
    'A newer online save exists. Restore it before saving again.', 'Online save not found or recovery key incorrect.'];
  return known.find((k) => m.startsWith(k)) || 'Online save unavailable';
}
