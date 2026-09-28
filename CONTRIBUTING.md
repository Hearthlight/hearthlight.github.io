# Contributing

For game changes, start with the [local setup](README.md#run-it-yourself). Describe the change
and how to try it in your pull request. Keep generated builds, credentials and personal data
out of the repository.

For relay changes, use Node.js 22 or newer and run `npm ci && npm test` in `server/`.
For desktop changes, follow the [local desktop build guide](desktop/README.md): use Node.js 24,
run `npm ci` in `desktop/`, build for your platform, then run `node scripts/smoke.mjs` to open
the packaged app and check its embedded relay.

Use a GitHub `noreply` commit email if you want your personal address to remain private.
Report vulnerabilities through the process in [SECURITY.md](SECURITY.md).
