# Build and run Hearthlight on your computer

The desktop app contains the game and its Party relay. You can run it from source, or create
an installer to keep and share. You do not need GitHub Actions, a release download, a VPS or a
GitHub token to build it locally.

For the browser version without Electron, see [Play in your browser](../README.md#play-in-your-browser).

## 1. Install the prerequisites

- **[Node.js 24 and npm](https://nodejs.org/en/download)** — the version used by the project's CI.
  The Node installer includes npm. Reopen your terminal after installing it.
- **[Git](https://git-scm.com/downloads)** to clone and update the repository. Downloading and
  extracting the source ZIP from GitHub works too.
- Internet access for the first dependency install and build: npm and electron-builder download
  Electron and the packaging tools. No global Electron installation is needed.
- A graphical desktop to run the game or its smoke test. On Windows, use native PowerShell or
  Command Prompt; Electron's [setup guide](https://www.electronjs.org/docs/latest/tutorial/tutorial-first-app)
  recommends avoiding WSL for this workflow.

Check your installation:

```sh
node --version
npm --version
```

The first command should show `v24.x.x`. Build on the operating system you are targeting:
macOS for the DMG, Windows for the EXE and Linux for the AppImage. Cross-platform builds need
additional tooling and are outside this guide; see [electron-builder's documentation](https://www.electron.build/v26/docs/features/multi-platform-build/).

## 2. Get the complete source

From the folder where you keep your projects:

```sh
git clone https://github.com/Hearthlight/hearthlight.github.io.git
cd hearthlight.github.io/desktop
```

If you already cloned the repository, open a terminal at its root and run `cd desktop` instead.
For a ZIP download, extract the whole repository and enter its `desktop` folder. Keep the
parent folders: the desktop build copies the game from `../src`, `../vendor` and `../server`.
While the repository is private, you need access to retrieve its source.

**Run all the remaining commands in `desktop/`.** There is no `package.json` at the repository root.

## 3. Install and play

```sh
npm ci
npm start
```

`npm ci` installs the exact dependencies recorded in `package-lock.json`. `npm start` copies
the game and relay into the app, draws its icon and opens a window. You can play immediately,
without making an installer. Close the window to quit.

To use phones, put them on the same Wi-Fi as the computer, open Party Mode and scan its QR
code. Allow incoming connections on your trusted local network if the firewall asks. The
app uses port 8787, or the next free port up to 8806. No public relay or router port forwarding
is needed for this local mode.

## 4. Create an installer

Close the running app, then choose the command for your system:

### macOS

```sh
npm run dist:mac
```

Output: `dist/Hearthlight-<version>-universal.dmg`, containing an app for both Intel and Apple
silicon. Open the DMG and copy Hearthlight to Applications. The build configuration disables
Mac code signing, so no Apple signing certificate is required.

### Windows

In native PowerShell or Command Prompt:

```sh
npm run dist:win
```

Output: `dist/Hearthlight-Setup-<version>.exe`, an x64 installer. Open it to install the app.

### Linux

```sh
npm run dist:linux
```

Output: `dist/Hearthlight-<version>-<arch>.AppImage`; an x64 machine produces an `x86_64` file.
Make the resulting file executable, then open it in your file manager:

```sh
chmod +x dist/Hearthlight-*.AppImage
```

`<version>` comes from `desktop/package.json` (currently `1.0.0`). Every build refreshes the
copied game files. The scripts use `--publish never`: they only write local files. The resulting
packages are unsigned; see the [first-launch notes](../README.md#play) for system warnings.
The app bundles its runtime, so the person installing it does not need Node or Python.

## 5. Check your package

After building for your own platform, still in `desktop/`:

```sh
node scripts/smoke.mjs
node scripts/checksums.mjs
```

The smoke test launches the packaged app, checks that the game loads and sends a message
through its embedded relay between a host and a controller. Success prints `gameLoaded: true`
and `relayPassed: true` in JSON. It does not install the DMG/EXE or test every game chapter.

The second command writes `dist/SHA256SUMS-darwin.txt`, `dist/SHA256SUMS-win32.txt` or
`dist/SHA256SUMS-linux.txt`, alongside the installers. It records hashes of the installer files
currently present in `dist/`.

## Edit or update the game

Edit the original files in the repository, such as `src/`. The generated `desktop/game/`,
`desktop/relay.mjs`, `desktop/stats.mjs`, `desktop/dash.html` and `desktop/build/` are replaced by
`npm start` and the build commands; editing those copies would lose your changes.

After pulling new source changes, quit the app, run `npm ci` again in `desktop/`, then use
`npm start` or the build command for your system. Save or commit your own changes before updating.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| `node`, `npm` or `git` is not recognized | Install the prerequisite, reopen the terminal and check its version. |
| npm cannot find `package.json` | Run the command inside `desktop/`, with the full repository in its parent folder. |
| `npm.ps1` is blocked in PowerShell | Use `npm.cmd ci`, `npm.cmd start` and `npm.cmd run dist:win`, or use Command Prompt. |
| Electron or a packaging tool fails to download | Check the network/proxy connection and retry the same command. Electron's [installation guide](https://www.electronjs.org/docs/latest/tutorial/installation) covers proxies and mirrors. |
| An AppImage reports a FUSE error | Follow the [AppImage FUSE instructions](https://docs.appimage.org/user-guide/troubleshooting/fuse.html) for your distribution. |
| A phone cannot connect | Use the QR address from the lobby, keep both devices on the same local network and check the firewall or guest-Wi-Fi isolation. `localhost` on a phone means the phone itself. |
| The smoke test cannot find the packaged app | Build for the current operating system first. `npm start` alone does not create `dist/`. |

## What the build copies

`scripts/copy-game.mjs` copies the browser game into `desktop/game/` and includes the relay,
statistics module and dashboard. `scripts/icon.mjs` draws the lantern icon. These generated
files and `dist/` are ignored by Git.

The optional [GitHub Actions workflow](../.github/workflows/desktop.yml) uses the same build
commands on separate machines. A version tag prepares a draft release; local builds work
independently of that workflow.
