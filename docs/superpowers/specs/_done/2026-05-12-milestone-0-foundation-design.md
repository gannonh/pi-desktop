# Milestone 0 Foundation Design

## Goal

Establish a runnable macOS Electron app with project conventions, a decided UI stack, CI-grade verification, and a scaffold that later milestones can extend without reshaping the foundation.

## Scope

Milestone 0 builds the foundation only. It creates a desktop app shell, typed boundaries, local development commands, test and check commands, CI, Husky pre-push checks, and a macOS packaging skeleton.

It does not implement real Pi sessions, provider auth, project persistence, Git worktrees, browser/computer use, automations, or release signing.

## Stack Decision

Use:

- Electron Forge.
- Vite.
- TypeScript.
- React 19.
- Tailwind CSS v4.
- shadcn/ui latest with `new-york` style.
- Node.js latest LTS line.
- pnpm.
- Vitest with V8 coverage.
- Playwright Electron for smoke/e2e tests.
- GitHub Actions.
- Husky.

Do not use Bun in Milestone 0.

Do not adopt Vercel AI SDK as runtime plumbing. Evaluate AI Elements only as a shadcn-compatible source of chat component patterns. Pi SDK remains the future data source for agent sessions and streaming events.

## Evidence

Codex app resource inventory showed a React/Radix/Tailwind-compatible shape:

- React 19.
- React Router 7.
- Radix primitives.
- `cmdk`.
- `tailwind-merge`.
- `framer-motion`.
- Xterm.
- CodeMirror.
- TanStack Query/Form.
- Feature chunk names for settings, sidebar, diff, terminal, worktree, automations, plugins, and skills.

This does not prove Codex uses shadcn, but it supports a shadcn-compatible stack for a Codex-like desktop shell.

Current public docs show Node `24.15.0` as latest LTS on May 12, 2026. Use Node `24.x` for CI and set local version files accordingly.

## App Architecture

### Main Process

`src/main` owns:

- Electron app lifecycle.
- BrowserWindow creation.
- Native menu setup.
- Native folder/file dialogs.
- IPC registration.
- App metadata.
- Packaging entrypoint.

### Preload

`src/preload` owns:

- `contextBridge` exposure.
- A narrow typed `window.piDesktop` API.
- Renderer-safe IPC calls.

Renderer code must not import Electron directly.

### Renderer

`src/renderer` owns:

- React app entry.
- Static shell layout.
- shadcn component usage.
- Tailwind theme.
- Placeholder project home.
- Placeholder session shell.
- Placeholder right panel.
- Status/footer area.

Milestone 0 uses static/mock state. Real Pi runtime state starts in Milestone 2.

### Shared

`src/shared` owns:

- IPC channel constants.
- IPC request/response schemas.
- Shared app-state types.
- Renderer-safe DTOs.

Use schemas at IPC boundaries and pass typed data internally.

## Initial IPC

Implement a minimal IPC surface:

- `app:getVersion` returns app version metadata.
- `workspace:getInitialState` returns static demo workspace/session data.
- `workspace:selectFolder` opens a native folder picker and returns the selected path or a cancelled result.

All IPC inputs and outputs should have explicit types and validation. Failures should return visible, typed errors instead of silent fallbacks.

## UI Shell

The shell should establish stable layout regions:

- Left sidebar for projects and sessions.
- Main conversation area.
- Right detail panel for future files, diffs, tools, and terminal output.
- Header or title area for workspace/session context.
- Footer/status area for runtime status.

The content can be static in Milestone 0. The layout should be responsive enough for common desktop window sizes and avoid decorative marketing-page patterns.

## Commands

Initial scripts:

- `dev`: start the Electron app in development mode.
- `build`: build the Electron app.
- `package`: produce an unsigned local macOS package/build artifact.
- `format`: format files.
- `format:check`: check formatting.
- `lint`: run lint checks.
- `typecheck`: run TypeScript checks.
- `test`: run Vitest unit/integration tests.
- `test:coverage`: run Vitest with V8 coverage.
- `test:smoke`: run Playwright Electron smoke test.
- `check`: run format check, lint, typecheck, tests, coverage, and smoke test.

`check` is the CI and pre-push source of truth.

## Runtime and Package Manager

Use Node.js `24.x`.

Add:

- `.nvmrc` with `24`.
- `.node-version` with `24`.
- `package.json` `engines.node` set to `>=24 <25`.
- `packageManager` pinned to pnpm.
- `.npmrc` configured for reliable Electron packaging.

Milestone 0 implementation should fail early with a clear error if the local Node version does not match the required LTS line.

## Testing

### Unit and Integration

Use Vitest for deterministic units:

- IPC schema validation.
- State transforms.
- Renderer-safe DTO helpers.
- Pure layout/state utilities.

Configure V8 coverage. Initial thresholds:

- Statements: 80%.
- Branches: 80%.
- Functions: 80%.
- Lines: 80%.

Exclude generated files, test files, config files, and smoke/e2e files from unit coverage.

### Smoke and E2E

Use Playwright Electron.

The first smoke test launches the packaged/development Electron app, waits for the main window, and verifies that the shell renders expected stable labels or test IDs.

Do not use Vitest as the Electron e2e runner.

## CI

Add GitHub Actions workflow for push and PR to `main`.

CI should:

- Run on `macos-latest`.
- Install Node `24.x`.
- Enable Corepack.
- Install pnpm from `packageManager`.
- Install dependencies with the lockfile.
- Run `pnpm check`.

CI must not require `.env`, Apple credentials, signing certificates, notarization secrets, or release secrets during Milestone 0.

## Husky

Add Husky.

`pre-push` should run:

```bash
pnpm check
```

The hook mirrors CI. If the hook fails locally, CI should fail for the same reason.

## Repo Hygiene

`.gitignore` must include:

- `.env`
- `.env.*`
- Allow `.env.example`
- Electron build output.
- Vite output.
- Coverage output.
- Playwright output.
- Logs.
- OS/editor noise.

Do not read, print, commit, or depend on `.env` in Milestone 0. Apple signing and release secrets are deferred to a future CD/release milestone.

## Documentation

Create or update `README.md` with:

- Project summary.
- Prerequisites.
- Install command.
- Development command.
- Check command.
- Packaging command.
- Link to the PRD/roadmap.

Keep setup/run/test/release commands in `README.md`. Keep `AGENTS.md` focused on agent-facing project guidance.

## Acceptance Criteria

- App starts locally on macOS.
- Basic shell layout renders.
- UI stack decision is encoded in dependencies and docs.
- Typed preload and IPC conventions exist.
- `pnpm check` validates formatting, linting, typechecking, unit tests, coverage, and smoke test.
- GitHub Actions runs `pnpm check`.
- Husky `pre-push` runs `pnpm check`.
- `.env` is ignored and not needed.
- Basic unsigned macOS packaging command exists.

## Out of Scope

- Real Pi SDK session integration.
- Provider auth.
- Persistent session storage.
- Worktree operations.
- Browser automation.
- Computer-use automation.
- Plugin marketplace.
- CD, signing, notarization, and release publishing.
