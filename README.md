# pi-desktop

`pi-desktop` is an open-source macOS desktop command center for the Pi coding agent CLI.

Product context and roadmap live in [docs/superpowers/specs/2026-05-12-pi-desktop-prd-roadmap-design.md](docs/superpowers/specs/2026-05-12-pi-desktop-prd-roadmap-design.md).

## Prerequisites

- macOS
- Node.js 24.x
- pnpm 11.1.1

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

## Check

```bash
pnpm check
```

`pnpm check` runs formatting, linting, typechecking, unit tests, coverage, and the Electron smoke test.

## Package Locally

```bash
pnpm package
```

Milestone 0 produces an unsigned local macOS package. Signing, notarization, CD, and release publishing are deferred.
