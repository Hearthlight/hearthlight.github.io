// Only a reload of this tab resumes automatically. Explicitly returning to the title clears it.
const KEY = 'hearthlight.reload.v1';
const ACTIVITIES = ['explore', 'story', 'waves', 'brawl', 'king'];

export class SessionRecovery {
  constructor({ save, snapshot, events = window, storage = () => window.sessionStorage }) {
    Object.assign(this, { save, snapshot, events, storage });
    this.active = false;
    this.ask = true;             // (false: save and go without a word — the solo game resumes itself)
    this.beforeUnload = (event) => {
      if (!this.active) return;
      this.checkpoint();
      if (!this.ask) return;
      event.preventDefault();
      event.returnValue = '';
    };
    events.addEventListener('pagehide', () => this.checkpoint());
  }
  remember() {
    try { this.storage().setItem(KEY, JSON.stringify({ ...this.snapshot(), savedAt: Date.now() })); } catch { /* storage can be disabled */ }
  }
  checkpoint() {
    if (!this.active) return;
    let saved = true;
    try { this.save(); } catch { saved = false; } finally { this.remember(); }
    return saved;
  }
  setActive(active) {
    if (active !== this.active) {
      this.active = active;
      this.events[active ? 'addEventListener' : 'removeEventListener']('beforeunload', this.beforeUnload);
    }
    if (active) this.remember();
    else try { this.storage().removeItem(KEY); } catch { /* storage can be disabled */ }
  }
  take(navigationType) {
    let value;
    try { value = JSON.parse(this.storage().getItem(KEY)); this.storage().removeItem(KEY); } catch { return null; }
    if (navigationType !== 'reload' || !value || !Number.isFinite(value.savedAt) || Date.now() - value.savedAt > 86400000) return null;
    if (value.mode === 'game') return { mode: 'game' };
    if (value.mode !== 'party') return null;
    const locals = Array.isArray(value.locals) ? value.locals.slice(0, 8).filter((p) => p && (
      p.kind === 'keys' && ['wasd', 'arrows'].includes(p.layout) ||
      p.kind === 'gamepad' && Number.isInteger(p.index) && p.index >= 0 && p.index < 16
    )).map((p) => p.kind === 'keys' ? { kind: 'keys', layout: p.layout } : { kind: 'gamepad', index: p.index }) : [];
    return { mode: 'party', online: value.online === true, activity: ACTIVITIES.includes(value.activity) ? value.activity : null, locals };
  }
}
