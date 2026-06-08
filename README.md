# pi-desktop- test

`pi-desktop` is an open-source macOS desktop command center for the Pi coding agent CLI.

Product context and roadmap live in [docs/pi-desktop-high-level-roadmap.md](docs/pi-desktop-high-level-roadmap.md).

## Prerequisites

* macOS
* Node.js 24.x
* pnpm 11.1.1

Use Corepack to activate the pinned pnpm version:

```bash
corepack enable
corepack prepare pnpm@11.1.1 --activate
```

## Install

```bash
pnpm install
```

## Develop

```bash
pnpm dev
```

```bash
pnpm dev:desktop
```

`pnpm dev` aliases desktop development. Starts the Electron desktop app in development mode.

```bash
pnpm dev:web
```

Starts the browser preview and a local app data bridge. The preview uses the same persisted project/chat store and Pi session runtime boundary as the desktop app. Native folder picker operations return a visible unsupported-operation error in web preview.

## Check

```bash
pnpm check
```

`pnpm check` runs formatting, linting, typechecking, unit tests, coverage, and Electron/web smoke tests.

Smoke tests run headless by default so they do not steal focus while you work. To watch them locally, use `pnpm test:smoke:headed` or set `PI_DESKTOP_SMOKE_HEADED=1`.

Run the current UAT evidence check with `pnpm test:uat`.

## Package Locally

```bash
pnpm package
```

Milestone 0 produces an unsigned local macOS package. Signing, notarization, CD, and release publishing are deferred.