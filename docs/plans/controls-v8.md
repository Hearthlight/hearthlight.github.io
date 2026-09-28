# Controls v8 — the keyboard, a gamepad or a phone (2026-09-29)

The ask: « que le jeu puisse être joué avec une manette normale — on aurait le choix entre
manette et tel ou clavier ».

## What was there
- Solo: a gamepad mapping (A use · B jump/back · X special · Y dodge · Start menu · Select map ·
  LB/RB hotbar · L3 bike · R3 ultimate), the prompts said A/B/X/Y once a pad was used.
- Party: a gamepad joined the lobby with A (`PadInput`), Start opened the host's menu.

## What was missing (found by playing with a pretend pad, `tools/fakepad.js`)
- **A dead end**: a new game needs a typed name — with only a gamepad, the creator never let go.
- The stick moved in eight directions only; many hints named keys (E, Esc, Tab, Shift+E, Q/R, H,
  « Hold Esc to skip »); a scene couldn't be skipped from a pad; no rumble; no word when a pad was
  plugged in; PlayStation and Nintendo pads were called A B X Y.
- In Party Mode, a pad (or keyboard) player had no way to their talents, gear, mounts, companions
  or name — all on the phone — and couldn't join once the adventure had started.

## What was done
- `engine/input.js`: the stick as an analog direction (run when pushed far, or a trigger), the
  pad's family (`padStyle`: xbox · ps · nintendo), `padNote` (plugged in / out), `rumble` / `buzz`.
- `ui/ui.js`: `ctl(action)`, `device()`, `padName`, `keyLabel`, round face-button glyphs in
  `keyHint`; the font gained ○ □ △ − ⌫ 🎲 🎮. Every keyboard-only hint now asks `ctl`.
- `ui/controls.js`: the **Controls** screen (the title, Settings): keyboard · gamepad · phone,
  their buttons, which one is in use, a rumble test, the phone's code.
- `ui/osk.js`: an on-screen keyboard for names (the creator; Party's own page).
- Scenes: B held skips in solo; in Party with no phone wearing the crown, B held on the big
  screen. Settings: « Gamepad rumble ». A notice when a pad comes or goes.
- Party (`party/tvmenu.js`): **Select** (Tab / ⌫ on the keys) opens a player's own menu on the
  big screen — the solo Hero page (hero, talents, gear, mounts, companions) through a small
  adapter, and their own page (name on the letters, a new look, unstuck, leave, their buttons).
  One at a time, sliding in on the right while the camera moves the heroes left; a friend who asks
  meanwhile is next; the notes and banners keep left of it. The hero stands still meanwhile
  (`QuietInput`). Pads join mid-adventure with A; names & looks of pads/keys are kept between
  parties; talent-point notices and the ultimate's key name their own buttons; each pad rumbles
  on its own hits.

## Decisions
- No explicit "choose your device" switch: the game follows the last device touched (prompts
  included); the Controls screen shows the three and what each does.
- One big-screen menu at a time (a queue): two side by side don't fit a 480-pixel-wide UI.
- The old Xbox 360 pad on a Mac needs a kernel driver (unmaintained, and it asks to lower the
  Mac's security): not installed — supported pads are listed in the README.

## Tests
- Solo with a pretend Xbox / DualSense pad: the title, the Controls screen, the creator's letters
  (« Zoé »), the arrival tip, the stick at 69.4°, the wild's prompts (✕, R3).
- Party (`tools/padparty.js`, 2 bots + 2 pads + a late third): joining, the lobby's own page,
  renaming, talents (learned one), gear, the queue, a still hero, the camera shift, late join,
  rumble on pad 0 only — 0 errors. Chapter 1 with 8 bots (the harness now keeps its crowd off the
  Grotto's mirror plates). i18n 3831/3831.
