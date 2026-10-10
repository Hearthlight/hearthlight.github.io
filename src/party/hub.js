import { t, onLang } from '../i18n.js';
import { exportSave, validateSave, cloudSave } from './saves.mjs';
import { stories, summarize, storyPart, findStory, addStory, replaceStory, switchStory } from './slots.mjs';
import { storyName, storyWho, storyLevel, storyWhen, storyLine, storyFull, storyError } from './stories.js';

// Saves & backups (Settings, or the host menu’s Options): Party Mode’s stories, save now, export /
// import a file, an optional online backup with its recovery key. A page of its own over the game
// (files and keys want a mouse and a keyboard); Esc, B on a gamepad or Close leaves it.
const node = (tag, text, attrs = {}) => { const el = document.createElement(tag); if (text) el.textContent = text; Object.assign(el, attrs); return el; };
const KEY = 'hearthlight.cloud.v1', SOLO = 'hearthlight.save.v1', OPTS = 'hearthlight.party.opts.v1';
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
  message(text, bad = false) { this.tell(t(text), bad); }
  // (words already in the player’s language: a story’s name in them)
  tell(text, bad = false) { if (!this.notice) return; this.notice.textContent = text; this.notice.classList.toggle('error', bad); }
  button(parent, label, action, raw = false) { const b = node('button', raw ? label : t(label)); b.type = 'button'; b.onclick = () => Promise.resolve().then(action).catch((e) => this.message(e.message || 'Save failed', true)); parent.append(b); return b; }
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
    this.storyList();
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
  // Party Mode’s stories, each as the Play card says it; the one in the live keys marked — it is
  // the one a file or the online backup holds
  storyList() {
    const S = stories(), list = S.list.filter((s) => !s.blank || s.cur), party = this.game.mode === 'party';
    if (S.error !== 'unreadable' && !list.some((s) => !s.blank)) return;
    const sec = this.section('Party Mode’s stories');
    if (S.error) { sec.append(node('p', storyError({ code: S.error }))); return; }
    const ul = node('ul', '', { className: 'stories' });
    for (const s of list) {
      const li = node('li', '', { className: s.cur ? 'story now' : 'story' }), head = node('div');
      head.append(node('b', storyName(s)));
      if (s.cur) head.append(node('em', t(party ? 'being played' : 'last played')));
      li.append(head, node('span', [storyWho(s), storyLevel(s), storyWhen(s)].filter(Boolean).join(' · ')));
      ul.append(li);
    }
    sec.append(ul, node('p', t('Four stories at most. An exported file and the online backup hold the marked one, and the solo game.')));
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
  // What a backup brings, said before anything changes: its story takes a free place — never the
  // place of one of the players’ own, unless they choose which, named —, its solo game replaces this
  // device’s.
  confirmRestore(snapshot, credentials) {
    if (this.uploading) { this.message('Please wait for the online backup to finish.'); return; }
    // (a solo game the very same as this device’s: nothing to bring)
    const part = storyPart(snapshot.data), has = Object.keys(part).length > 0, solo = snapshot.data[SOLO] === localStorage.getItem(SOLO) ? null : snapshot.data[SOLO] ?? null;
    const S = stories();
    if (has && S.error) { this.tell(storyError({ code: S.error }), true); return; }
    const sum = summarize(part), story = storyLine({ ...sum, savedAt: sum.savedAt ?? snapshot.savedAt });
    const twin = has ? findStory(localStorage, part) : null;
    const also = solo !== null ? ' ' + t(has ? 'Its solo game replaces the one on this device.' : 'This backup holds a solo game: it replaces the one on this device.') : '';
    const go = (replace = null) => this.restore(snapshot, credentials, { part: has ? part : null, solo, twin, replace });
    const ask = (text) => { this.tell((text + also).trim()); this.confirmButton = this.button(this.notice, 'Confirm restore', () => go()); };
    if (!has && solo === null) this.tell(snapshot.data[SOLO] ? t('This backup holds nothing this device does not have already.') : storyError({ code: 'empty' }), !snapshot.data[SOLO]);
    else if (!has) ask('');
    else if (twin) ask(t('This backup’s story is already among yours: {story}.', { story }));
    else if (S.free) ask(t('This backup holds a story: {story}. It takes a free place: none of yours is replaced.', { story }));
    else {
      // (four stories already: which one gives its place — then once more, by its name)
      this.tell(t('This backup holds a story: {story}. Your four places are taken: choose the story it replaces.', { story }));
      for (const s of S.list) {
        this.button(this.notice, storyFull(s), () => {
          this.tell(t('Replace “{story}” with this backup’s story? It cannot be recovered.', { story: storyFull(s) }) + also, true);
          this.confirmButton = this.button(this.notice, 'Confirm restore', () => go(s.id));
        }, true).className = 'pick';
      }
    }
  }
  // all of the backup or none of it: the solo game first (it goes back if the story finds no room),
  // then the story, by slots.mjs’ own all-or-nothing steps
  restore(snapshot, credentials, { part, solo, twin, replace }) {
    const old = localStorage.getItem(SOLO);
    let id = twin;
    try {
      if (solo !== null) localStorage.setItem(SOLO, solo);
      if (part && !id) id = replace ? replaceStory(localStorage, replace, part, Date.now(), snapshot.savedAt) : addStory(localStorage, part, Date.now(), snapshot.savedAt);
    } catch (e) {
      try { if (old === null) localStorage.removeItem(SOLO); else localStorage.setItem(SOLO, old); } catch { /* the first failure is the one told */ }
      this.tell(storyError(e), true);
      return;
    }
    // (the host’s options are no story’s: a backup’s only reach a device that has none)
    try { if (snapshot.data[OPTS] && localStorage.getItem(OPTS) === null) localStorage.setItem(OPTS, snapshot.data[OPTS]); } catch { /* the defaults */ }
    // (the story brought back is the one Play offers first, and the one the online backup follows;
    // no room to bring it forward: it waits among the others)
    if (id) try { switchStory(localStorage, id); } catch { /* in the list */ }
    // (an imported file keeps the online backup’s key: it may be the only copy)
    if (credentials) try { this.remember(credentials); } catch { /* asked again next time */ }
    this.close(); this.game.toTitle(); Object.assign(this.game, { titleMessage: t('Save restored'), titleBad: false, titleMessageT: 0 });
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
