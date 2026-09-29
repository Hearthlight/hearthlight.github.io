import { t, onLang } from '../i18n.js';
import { partySummary, exportSave, importSave, validateSave, cloudSave } from './saves.mjs';
import { qrCanvas } from './qr.js';
import { invitationUrl } from './invitations.mjs';

const node = (tag, text, attrs = {}) => { const el = document.createElement(tag); if (text) el.textContent = text; Object.assign(el, attrs); return el; };
export class PartyHub {
  constructor(game) {
    this.game = game;
    this.bar = node('div', '', { className: 'party-tools', hidden: true });
    this.backButton = node('button', t('Back to title'));
    this.backButton.onclick = () => this.returnToTitle(); this.bar.append(this.backButton);
    this.openButton = node('button', t('Invite friends'));
    this.openButton.onclick = () => this.open(); this.bar.append(this.openButton);
    this.status = node('span', '', { className: 'save-status' }); this.bar.append(this.status);
    document.body.append(this.bar);
    this.dialog = node('dialog', '', { className: 'party-dialog' }); document.body.append(this.dialog);
    this.dialog.setAttribute('aria-label', t('Play together'));
    for (const event of ['keydown', 'keyup', 'pointerdown', 'pointerup']) this.dialog.addEventListener(event, (e) => e.stopPropagation());
    this.dialog.addEventListener('close', () => this.releasePause());
    onLang(() => { this.openButton.textContent = t('Invite friends'); this.backButton.textContent = t('Back to title'); });
    setInterval(() => { if (this.credentials() && ['party', 'game'].includes(game.mode)) this.upload(false); }, 60000);
  }
  update() {
    const p = this.game.mode === 'party' ? this.game.party : null;
    this.bar.hidden = !p || this.game.controls.open || this.game.phone.panelOpen || this.game.world.menu.open || !!p.host.menu;
    this.backButton.hidden = p?.phase !== 'lobby';
    // Keep the invitation below the in-game clock, at every pixel scale.
    this.bar.style.top = p && p.phase !== 'lobby' ? `max(env(safe-area-inset-top), ${Math.ceil(31 * this.game.display.scale / this.game.display.dpr)}px)` : '';
    if (!this.bar.hidden && p.phase === 'lobby') this.lobbyTop = Math.ceil(this.game.display.toInternal(0, this.bar.getBoundingClientRect().bottom).y) + 4;
    if (this.dialog.open && this.inviting === p && p) this.updateInvitation(p);
  }
  releasePause() {
    const p = this.game.party;
    if (p && p === this.pausedParty && !this.wasPaused) p.host.setPaused(false);
    this.pausedParty = null; this.inviting = null;
    this.game.input.keys.clear(); this.game.input.consume();
  }
  close() { this.releasePause(); this.dialog.close(); }
  credentials() { try { return JSON.parse(localStorage.getItem('hearthlight.cloud.v1') || 'null'); } catch { return null; } }
  remember(value) { localStorage.setItem('hearthlight.cloud.v1', JSON.stringify(value)); }
  message(text, bad = false) { const el = this.notice || this.status; el.textContent = t(text); el.classList.toggle('error', bad); this.status.textContent = t(text); }
  button(parent, label, action) { const b = node('button', t(label)); b.type = 'button'; b.onclick = () => Promise.resolve().then(action).catch((e) => this.message(e.message || 'Save failed', true)); parent.append(b); return b; }
  section(label, parent = this.dialog) { const section = node('section'); section.append(node('h3', t(label))); parent.append(section); return section; }
  open() {
    const p = this.game.mode === 'party' ? this.game.party : null;
    if (!p && this.game.mode !== 'title') return;
    if (!this.dialog.open) {
      this.pausedParty = p; this.wasPaused = !!p?.paused;
      if (p && !this.wasPaused) p.host.setPaused(true, t('Invite friends'));
    }
    this.game.input.keys.clear(); this.game.input.consume();
    this.inviting = null;
    this.dialog.setAttribute('aria-label', t(p ? 'Invite friends' : 'Party Mode ♥ 1–8'));
    this.dialog.replaceChildren(); this.confirmButton = null;
    const header = node('header'); header.append(node('h2', t(p ? 'Invite friends' : 'Party Mode ♥ 1–8')));
    this.button(header, p ? 'Close' : 'Back to title', () => this.close()); this.dialog.append(header);
    this.notice = node('p', '', { className: 'hub-notice' }); this.notice.setAttribute('role', 'status'); this.dialog.append(this.notice);
    if (p) this.invite(p); else this.startOptions();
    this.backups();
    if (p) this.button(this.dialog, 'Back to title', () => this.returnToTitle());
    if (!this.dialog.open) this.dialog.showModal();
  }
  startOptions() {
    const section = this.section('Create a party'), summary = partySummary();
    const host = (options) => { if (this.game.mode !== 'title') return; this.close(); this.game.toParty(options); };
    this.button(section, 'Play on the same screen', () => host({}));
    this.button(section, 'Play from home', () => host({ online: true, resume: !!summary }));
    section.append(node('p', t('Friends can join in the lobby or during the game.')));
    if (summary) {
      const date = summary.savedAt ? new Date(summary.savedAt).toLocaleString() : '';
      this.button(section, 'Resume our adventure', () => host({ resume: true }));
      section.append(node('p', t('Chapter {n}', { n: summary.chapter }) + (date ? ' · ' + date : '')));
    }
    const join = this.section('Join friends');
    const form = node('form'), field = node('input', '', { type: 'text', placeholder: t('Paste an invitation link'), autocomplete: 'off' });
    const label = node('label', t('Invitation link')); label.append(field); form.append(label);
    const submit = node('button', t('Join the party!'), { type: 'submit', disabled: true }); form.append(submit);
    field.oninput = () => { submit.disabled = !field.value.trim(); };
    form.onsubmit = (event) => {
      event.preventDefault();
      try {
        const config = window.HEARTHLIGHT || {};
        location.href = invitationUrl(field.value, new URL(config.onlinePad || 'pad.html', location.href).href);
      } catch (e) { this.message(e.message, true); field.focus(); }
    };
    join.append(form);
    join.append(node('p', t('Paste the link your friend sent you, even if the game has already started.')));
    join.append(node('a', t('Use this device as a controller'), { href: 'pad.html' }));
  }
  invite(p) {
    const section = this.section('Invite friends');
    this.roomStatus = node('p'); this.roomStatus.setAttribute('role', 'status'); section.append(this.roomStatus);
    this.inviteCards = node('div'); section.append(this.inviteCards);
    section.append(node('p', t('Friends can join in the lobby or during the game.')));
    this.inviting = p; this.invitationKey = null;
    this.updateInvitation(p);
  }
  updateInvitation(p) {
    const count = p.players.filter((q) => q.connected).length;
    const state = p.net.status === 'open' ? (p.phase === 'lobby' ? 'Lobby open — invite your friends' : 'Game in progress — friends can still join') : p.net.status === 'unavailable' ? 'Invitations are unavailable on this connection.' : p.net.status === 'full' ? 'The party server is full. Please try again later.' : 'Connecting… Invitations will appear automatically.';
    const status = t(state) + (p.net.code ? ' · ' + t('Code: {code}', { code: p.net.code }) : '') + ' · ' + count + '/8';
    if (this.roomStatus.textContent !== status) this.roomStatus.textContent = status;
    const urls = p.net.status === 'open' ? [p.net.joinUrl, p.net.playUrl] : ['', ''];
    const key = JSON.stringify(urls);
    if (key === this.invitationKey) return;
    this.invitationKey = key; this.inviteCards.replaceChildren();
    for (const [i, label, help] of [[0, 'Phone controller', 'For friends watching the same screen.'], [1, 'Play from home', 'For friends on another screen: the link includes the game view and controls.']]) {
      const url = urls[i], box = node('div', '', { className: 'invite-card' });
      box.append(node('h4', t(label)), node('p', t(help))); this.inviteCards.append(box);
      if (!url) { box.append(node('p', t('Opening the room…'))); continue; }
      const field = node('input', '', { value: url, readOnly: true }); field.setAttribute('aria-label', t(label)); box.append(field);
      this.button(box, 'Copy link', async () => {
        try { await navigator.clipboard.writeText(url); this.message('Link copied'); }
        catch { field.focus(); field.select(); this.message('Select and copy this link'); }
      });
      if (navigator.share) { const share = node('button', t('Share')); share.onclick = () => navigator.share({ title: 'Hearthlight', url }).catch(() => {}); box.append(share); }
      qrCanvas(url).then((qr) => { if (box.isConnected) { qr.setAttribute('aria-label', t(label)); box.append(qr); } }).catch(() => {});
    }
  }
  returnToTitle() {
    const p = this.game.mode === 'party' ? this.game.party : null;
    if (!p) { this.close(); return; }
    const leave = () => {
      if (!p.saveNow()) { this.open(); this.message('Save failed. Export a backup before leaving.', true); return; }
      this.close(); p.exit();
    };
    if (p.phase === 'lobby' && !p.players.some((q) => q.connected)) { leave(); return; }
    this.open(); this.inviting = null;
    this.dialog.replaceChildren();
    this.dialog.setAttribute('aria-label', t('Back to title'));
    this.dialog.append(node('h2', t('Back to title')), node('p', t('This closes the room for everyone. Your progress is saved before leaving.')));
    this.notice = node('p', '', { className: 'hub-notice' }); this.notice.setAttribute('role', 'status'); this.dialog.append(this.notice);
    this.button(this.dialog, 'Keep playing', () => this.close()).focus();
    this.button(this.dialog, 'Save & quit', leave);
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
    const details = node('details'); details.append(node('summary', t('Saves & backups'))); this.dialog.append(details);
    const section = this.section('Saves', details);
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
    const online = this.section('Online backup', details);
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
      this.game.toTitle(); this.open(); this.message('Save restored');
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
