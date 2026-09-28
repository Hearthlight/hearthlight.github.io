# Brief for an Italian translator of Hearthlight (one batch of dictionary files)

You are a native Italian game localizer translating "Hearthlight", a cozy, gently funny pixel-art
life/adventure game (this repository). English is the source; a full
French translation exists in src/lang/fr/*.js (each file exports an object whose KEYS are the exact
English on-screen strings and whose VALUES are French). You create the Italian twins in src/lang/it/.

Read first, fully: tools/i18n-glossary-it.md (register, voices, typography, key
terms — follow it), tools/i18n/names-it.json (English → Italian for 1448 names/labels: whenever a
key of your file is in it, use that value verbatim, and the same names inside longer sentences), and
skim tools/i18n-glossary.md (how strings, placeholders and tags work). For story context you may grep
docs/plans/world-v7.md for your chapter.

Rules for each file:
1. Same structure as the French file: same keys, character for character (copy them exactly,
   including typographic ’ “ ” … and \n), in the same order, same nested `__group` section if there
   is one. Export name: a French name ending in `_FR` gets `_IT` instead (CH1_FR → CH1_IT); any other
   name stays (UI stays UI). Keep short section comments (English); the top comment becomes a
   one-line English description.
2. Translate from the ENGLISH key (the source of truth). The French value is only a reference for
   context, tone and how jokes/puns were re-invented — never translate the French.
3. Register: "tu" to the solo player. The `__group` section holds lines said to the whole party in
   Party Mode: "voi". Texts on the Party big screen addressed to the group (French « vous ») also use voi.
4. Keep every {placeholder} ({name}, {n}, {item}, {a}…) and tag ({p}, {pp}, {shake}…{/}, {big}…{/},
   {wave}…{/}, {gold}…{/}, {#8fe0ff}…{/}) — move them where Italian needs them, never drop or rename.
   Key/button names (WASD, Esc, A B X Y, LT, Select…) stay as in English.
5. JS strings in single quotes. Never a straight apostrophe ' inside a value: always ’ (l’amico).
   Quotes in dialogue: « ». Ellipsis …. Only characters the pixel font draws: A–Z a–z 0–9 à è é ì ò ù
   À È É Ì Ò Ù « » … — – ’ “ ” usual punctuation, ♥ ★ ♪ → ← ↑ ↓ ✓ · ° ¢, and symbols already in the
   English (⌫ ⏸ 🎮 △ — copy them). No other emoji or accented letters.
6. Screens are small (5-px pixel font): labels, buttons, tabs, phone tiles, pop-ups, quest titles,
   toasts, HUD texts stay short — about the English length. Dialogue lines about as long as the English.
7. Native, warm, playful Italian written for this game — never literal or stiff. Keep each
   character's voice (see the guide; Pip is 8 and writes lowercase with his own spelling). Re-invent
   puns so the joke still lands.
8. Validate each file: `node --check src/lang/it/<file>` and `node tools/i18n-check.mjs
   src/lang/it/<file>` — fix everything until it prints "ok" (a "still English?" note is acceptable
   only for a genuine proper name or a label like "OK"). A big file may be written in several passes
   (write the first part, then append), but the final file must be one valid module.

Do not modify any other file; do not create src/lang/it/index.js. When done, reply briefly: files
written, key counts, anything a reviewer should look at.
