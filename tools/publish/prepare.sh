#!/usr/bin/env bash
# Prepare the public repository — without publishing anything: the game as it is at HEAD, in a
# fresh folder with ONE commit (no history: no private e-mail, no old experiments) signed with the
# GitHub no-reply address, a LICENSE, and `origin` set to Hearthlight/hearthlight.github.io. Nothing is pushed.
#   bash tools/publish/prepare.sh [target-dir]        (default: ../hearthlight-public)
# The target may also be an existing clone of the public repository (empty, or already filled by
# this script): its files are replaced by HEAD's and one more commit is made (« Update — … »).
# Left out (private operations & the release log): server/deploy/, docs/plans/release-v9.md.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${1:-$ROOT/../hearthlight-public}"
NAME="${PUBLISH_NAME:-pookee}"
EMAIL="${PUBLISH_EMAIL:-13053375+pookee@users.noreply.github.com}"
EXCLUDE=(server/deploy docs/plans/release-v9.md)
CLONE=0
if [[ -e "$OUT" ]]; then
  [[ -d "$OUT/.git" ]] || { echo "$OUT exists and isn't a git clone: remove it first" >&2; exit 1; }
  CLONE=1
fi
cd "$ROOT"
[[ -z "$(git status --porcelain)" ]] || echo "(note: uncommitted changes are NOT included — only HEAD)"
SUBJECT="$(git log -1 --format=%s | cut -c1-120)"
mkdir -p "$OUT"
# (a clone: everything but .git goes, then HEAD's files come in)
[[ $CLONE == 1 ]] && find "$OUT" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
git archive HEAD | tar -x -C "$OUT"
for p in "${EXCLUDE[@]}"; do rm -rf "$OUT/$p"; done
[[ -f "$OUT/LICENSE" ]] || cp "$ROOT/tools/publish/LICENSE.proposed" "$OUT/LICENSE"
rm -f "$OUT/tools/publish/LICENSE.proposed"
# (a last look for anything personal)
if grep -rnIE "gmail\.com|/Users/[a-z]|alexandre\.|lunati\b|149\.56\." "$OUT" --exclude-dir=node_modules --exclude-dir=.git | grep -v "vendor/"; then
  echo "↑ personal traces found: fix them before going on" >&2; exit 1
fi
cd "$OUT"
[[ $CLONE == 1 ]] || git init -q -b main
git add -A
if git rev-parse -q --verify HEAD >/dev/null; then MSG="Update — $SUBJECT"; else MSG="Hearthlight 1.0 (demo) — a cozy pixel-art adventure: a story in ten chapters, eight heroes, Party Mode for 1–8 players with phones, gamepads or the keyboard"; fi
if git diff --cached --quiet; then echo "nothing new for $OUT"; exit 0; fi
GIT_AUTHOR_NAME="$NAME" GIT_AUTHOR_EMAIL="$EMAIL" GIT_COMMITTER_NAME="$NAME" GIT_COMMITTER_EMAIL="$EMAIL" git commit -q -m "$MSG"
git remote get-url origin >/dev/null 2>&1 || git remote add origin https://github.com/Hearthlight/hearthlight.github.io.git
echo "ready: $OUT ($(git ls-files | wc -l | tr -d ' ') files, $(git rev-list --count HEAD) commit(s), the last by $NAME <$EMAIL>)"
echo "push it when you decide: cd $OUT && git push -u origin main"
