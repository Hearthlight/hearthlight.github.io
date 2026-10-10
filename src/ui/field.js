// A real text field laid over the interface’s canvas: on a touch screen a name is typed with
// the phone’s own keyboard, accents and all (the creator’s names). `place(rect)` each frame it
// shows — in UI pixels —, `place(null)` hides it. Keys typed in it never reach the game
// (engine/input.js leaves a field’s keys alone).

let styled = false;
function style() {
  if (styled) return;
  styled = true;
  const s = document.createElement('style');
  s.textContent = `.hl-field { position: fixed; display: none; box-sizing: border-box; margin: 0; padding: 0 8px; z-index: 4;
  font: 700 20px/1 ui-monospace, Menlo, Consolas, monospace; letter-spacing: 1px; color: #3b2a2e; background: #fff8ea;
  border: 3px solid #8e5d3e; border-radius: 0; outline: none; -webkit-appearance: none; appearance: none;
  touch-action: manipulation; user-select: text; -webkit-user-select: text; }
.hl-field:focus { border-color: #e0a526; }
.hl-field.nudge { background: #f7c9c0; border-color: #c8454f; }
.hl-field::placeholder { color: #a8927a; opacity: 1; }`;
  document.head.appendChild(s);
}

export class TextField {
  // `filter(text)`: what may be typed; `onInput(value)`: each change; `onDone()`: Enter, or the field left
  constructor(display, { max = 12, filter = (v) => v, onInput = null, onDone = null } = {}) {
    style();
    this.display = display;
    const el = (this.el = document.createElement('input'));
    Object.assign(el, { className: 'hl-field', type: 'text', maxLength: max, autocomplete: 'off', spellcheck: false, enterKeyHint: 'done' });
    el.setAttribute('autocorrect', 'off');
    el.setAttribute('autocapitalize', 'words');
    // (a phone’s keyboard composes a word as it is typed: the game hears each letter, the field
    // itself is tidied once the word is done — rewriting it midway would break the keyboard)
    // (`onInput` hears a change only: a field visited and left as it was has typed nothing)
    this.last = '';
    const read = (composing) => {
      const v = [...filter(el.value)].slice(0, max).join('');
      if (v !== el.value && !composing) el.value = v;
      if (v !== this.last) { this.last = v; if (onInput) onInput(v); }
    };
    el.addEventListener('input', (e) => read(e.isComposing));
    el.addEventListener('compositionend', () => read(false));
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') el.blur(); });
    // (a phone pans the page to show the field above its keyboard: back in place once it is gone)
    el.addEventListener('blur', () => { read(false); try { window.scrollTo(0, 0); } catch (err) { /* ignore */ } if (onDone) onDone(); });
    document.body.appendChild(el);
    this.shown = false;
    this.key = '';
  }

  get focused() { return document.activeElement === this.el; }
  get value() { return this.el.value; }
  set(v) { this.last = v; if (this.el.value !== v) this.el.value = v; }
  set placeholder(v) { if (this.el.placeholder !== v) this.el.placeholder = v; }
  nudge(on) { this.el.classList.toggle('nudge', !!on); }
  focus() { try { this.el.focus(); } catch (e) { /* gone */ } }

  place(r) {
    const el = this.el;
    if (!r) {
      if (this.shown) { this.shown = false; if (this.focused) el.blur(); el.style.display = 'none'; }
      return;
    }
    const c = this.display.canvas.getBoundingClientRect(), k = c.width / this.display.w;
    const key = [r.x, r.y, r.w, r.h, c.left, c.top, k].join();
    if (key !== this.key) {
      this.key = key;
      el.style.left = `${c.left + r.x * k}px`; el.style.top = `${c.top + r.y * k}px`;
      el.style.width = `${r.w * k}px`; el.style.height = `${r.h * k}px`;
      // (never under 16 px: an iPhone zooms the page on a smaller field)
      el.style.fontSize = `${Math.round(Math.max(18, Math.min(26, r.h * k * 0.56)))}px`;
    }
    if (!this.shown) { this.shown = true; el.style.display = 'block'; }
  }

  dispose() { this.el.remove(); this.shown = false; }
}
