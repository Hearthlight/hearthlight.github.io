import { t, onLang } from '../i18n.js';
import { partySummary, exportSave, importSave, validateSave, cloudSave } from './saves.mjs';
import { qrCanvas } from './qr.js';

const node = (tag, text, attrs = {}) => { const el = document.createElement(tag); if (text) el.textContent = text; Object.assign(el, attrs); return el; };
export class PartyHub {
  constructor(game) {
    this.game = game;
    this.bar = node('div', '', { className: 'party-tools', hidden: true });
    this.openButton = node('button', t('Play together'));
    this.openButton.onclick = () => this.open(); this.bar.append(this.openButton);
    this.status = node('span', '', { className: 'save-status' }); this.bar.append(this.status);
    document.body.append(this.bar);
    this.dialog = node('dialog', '', { className: 'party-dialog' }); document.body.append(this.dialog);
    this.dialog.setAttribute('aria-label', t('Play together'));
    for (const event of ['keydown', 'keyup', 'pointerdown', 'pointerup']) this.dialog.addEventListener(event, (e) => e.stopPropagation());
    this.dialog.addEventListener('close', () => { const p = this.game.party; if (p && p === this.pausedParty && !this.wasPaused) p.host.setPaused(false); this.game.input.keys.clear(); this.game.input.consume(); });
    onLang(() => { this.openButton.textContent = t(this.game.mode === 'party' ? 'Invite & save' : 'Play together'); });
    setInterval(() => { if (this.credentials() && ['party', 'game'].includes(game.mode)) this.upload(false); }, 60000);
  }
  update() {
    const show = ['title', 'party'].includes(this.game.mode) && !this.game.controls.open && !this.game.phone.panelOpen && !this.game.world.menu.open;
    this.bar.hidden = !show;
    const text = t(this.game.mode === 'party' ? 'Invite & save' : 'Play together');
    if (this.openButton.textContent !== text) this.openButton.textContent = text;
  }
  credentials() { try { return JSON.parse(localStorage.getItem('hearthlight.cloud.v1') || 'null'); } catch { return null; } }
  remember(value) { localStorage.setItem('hearthlight.cloud.v1', JSON.stringify(value)); }
  message(text, bad = false) { const el = this.notice || this.status; el.textContent = t(text); el.classList.toggle('error', bad); this.status.textContent = t(text); }
  button(parent, label, action) { const b = node('button', t(label)); b.type = 'button'; b.onclick = () => Promise.resolve().then(action).catch((e) => this.message(e.message || 'Save failed', true)); parent.append(b); return b; }
  section(label) { const section = node('section'); section.append(node('h3', t(label))); this.dialog.append(section); return section; }
  open() {
    const p = this.game.mode === 'party' ? this.game.party : null;
    this.pausedParty = p; this.wasPaused = !!p?.paused;
    if (p && !this.wasPaused) p.host.setPaused(true, t('Invite & save'));
    this.game.input.keys.clear(); this.game.input.consume();
    this.dialog.setAttribute('aria-label', t(p ? 'Invite & save' : 'Play together'));
    this.dialog.replaceChildren();
    const header = node('header'); header.append(node('h2', t(p ? 'Invite & save' : 'Play together')));
    this.button(header, 'Close', () => this.dialog.close()); this.dialog.append(header);
    this.notice = node('p', '', { className: 'hub-notice' }); this.notice.setAttribute('role', 'status'); this.dialog.append(this.notice);
    if (p) this.invite(p); else this.startOptions();
    this.backups();
    this.dialog.showModal();
  }
  startOptions() {
    const section = this.section('Your adventure'), summary = partySummary();
    if (summary) {
      const date = summary.savedAt ? new Date(summary.savedAt).toLocaleString() : '';
      section.append(node('p', t('Chapter {n}', { n: summary.chapter }) + (date ? ' · ' + date : '')));
      this.button(section, 'Resume our adventure', () => { this.dialog.close(); this.game.toParty({ resume: true }); });
    }
    this.button(section, 'Host on this screen', () => { this.dialog.close(); this.game.toParty(); });
    this.button(section, 'Host over the Internet', () => { this.dialog.close(); this.game.toParty({ online: true, resume: !!summary }); });
    section.append(node('p', t('The host keeps this game open while friends play. Everyone controls their own character.')));
    const join = this.section('Join friends');
    const field = node('input', '', { type: 'text', placeholder: t('Paste a remote invitation'), autocomplete: 'off' });
    const label = node('label', t('Remote invitation')); label.append(field); join.append(label);
    this.button(join, 'Join remotely', () => {
      const invitation = field.value.trim();
      const match = /(?:#|^)([A-Z]{4})\.([a-f0-9]{32})$/.exec(invitation);
      if (!match) throw new Error('Paste the complete remote invitation from the host.');
      const config = window.HEARTHLIGHT || {};
      const url = new URL(invitation.includes('#') ? invitation : config.onlinePad || 'pad.html', location.href);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !/\/(?:pad|play)\.html$/.test(url.pathname)) throw new Error('Paste the complete remote invitation from the host.');
      url.pathname = url.pathname.replace(/pad\.html$/, 'play.html'); url.hash = match[1] + '.' + match[2];
      location.href = url.href;
    });
    const pad = node('a', t('Use this device as a controller'), { href: 'pad.html' }); join.append(pad);
  }
  invite(p) {
    const section = this.section('Invite friends');
    section.append(node('p', t('Code: {code}', { code: p.net.code || '…' })));
    const build = (label, url) => {
      const box = node('div', '', { className: 'invite-card' }); box.append(node('h4', t(label)));
      if (!url) { box.append(node('p', t('Opening the room…'))); section.append(box); return; }
      const field = node('input', '', { value: url, readOnly: true }); field.setAttribute('aria-label', t(label)); box.append(field);
      this.button(box, 'Copy link', async () => {
        try { await navigator.clipboard.writeText(url); this.message('Link copied'); }
        catch { field.focus(); field.select(); this.message('Select and copy this link'); }
      });
      if (navigator.share) { const share = node('button', t('Share')); share.onclick = () => navigator.share({ title: 'Hearthlight', url }).catch(() => {}); box.append(share); }
      qrCanvas(url).then((qr) => { if (box.isConnected) { qr.setAttribute('aria-label', t(label)); box.append(qr); } }).catch(() => {});
      section.append(box);
    };
    build('Phone controller', p.net.joinUrl);
    build('Play from home', p.net.playUrl);
    section.append(node('p', t('Remote guests see the host’s game and use their keyboard, gamepad or touch controls. Keep the host window visible.')));
    this.button(section, 'Refresh invitation', () => { this.dialog.close(); this.open(); });
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
  backups() {
    const section = this.section('Saves');
    this.button(section, 'Save now', () => { this.localSave(); this.message('Saved on this device'); });
    this.button(section, 'Export save', () => {
      const snapshot = this.localSave(true);
      const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot)], { type: 'application/json' }));
      const a = node('a', '', { href: url, download: 'hearthlight-' + new Date().toISOString().slice(0, 10) + '.json' }); a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.message('Backup exported');
    });
    if (this.game.mode === 'title') {
      const label = node('label', t('Import save')), file = node('input', '', { type: 'file', accept: '.json,application/json' }); label.append(file); section.append(label);
      file.onchange = async () => {
        try {
          if (!file.files?.[0]) return;
          if (file.files[0].size > 2 * 1024 * 1024) throw new Error('Save is too large');
          const snapshot = validateSave(await file.files[0].text());
          this.confirmRestore(snapshot);
        } catch (e) { this.message(e.message || 'Invalid save', true); }
      };
    } else section.append(node('p', t('Return to the title screen to import or restore a save.')));
    const online = this.section('Online backup');
    online.append(node('p', t('Optional: save online now, then automatically every minute while playing. Keep the recovery key private. Backups expire after 90 days without an update.')));
    this.button(online, 'Save online', () => this.upload(true));
    this.button(online, 'Show recovery key', () => {
      const cred = this.credentials(); if (!cred) throw new Error('Save online first');
      const field = node('input', '', { value: cred.key, readOnly: true }); field.setAttribute('aria-label', t('Recovery key')); online.append(field); field.focus(); field.select();
    });
    if (this.credentials()) this.button(online, 'Stop automatic online backups', () => { localStorage.removeItem('hearthlight.cloud.v1'); this.message('Automatic online backups stopped. Keep your recovery key to restore the existing backup.'); });
    if (this.game.mode === 'title') {
      const label = node('label', t('Recovery key')), key = node('input', '', { type: 'password', autocomplete: 'off', placeholder: t('Recovery key') }); label.append(key); online.append(label);
      this.button(online, 'Restore online backup', async () => {
        const value = key.value.trim(), result = await cloudSave({ key: value, method: 'GET' });
        this.confirmRestore(validateSave(result.snapshot), { key: value, revision: result.revision });
      });
    }
  }
  confirmRestore(snapshot, credentials) {
    if (this.uploading) { this.message('Please wait for the online backup to finish.'); return; }
    this.message('This will replace the saved progress for the modes in this backup.');
    this.confirmButton?.remove();
    this.confirmButton = this.button(this.notice, 'Confirm restore', () => {
      importSave(snapshot);
      if (credentials) this.remember(credentials);
      else localStorage.removeItem('hearthlight.cloud.v1'); // do not overwrite a different cloud adventure
      this.game.toTitle(); this.message('Save restored');
    });
  }
  async upload(manual) {
    if (this.uploading) return;
    this.uploading = true;
    try {
      const snapshot = this.localSave(), credentials = this.credentials();
      const result = await cloudSave({ ...credentials, snapshot, signal: AbortSignal.timeout(15000) });
      this.remember({ key: result.key || credentials.key, revision: result.revision });
      this.status.textContent = t('Online backup saved'); if (manual) this.message('Online backup saved. Keep your recovery key.');
    } catch (e) { if (manual) this.message(e.message || 'Online save unavailable', true); else this.status.textContent = t('Online backup failed — local save kept'); }
    finally { this.uploading = false; }
  }
}
