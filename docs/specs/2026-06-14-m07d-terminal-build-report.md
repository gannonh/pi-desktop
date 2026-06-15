---
type: Plan
title: M07D Right Panel Terminal build report
description: Completion report and verification record for replacing the Terminal mock with a real node-pty and xterm terminal.
tags: [terminal, right-panel, m07d, report]
timestamp: 2026-06-14T00:00:00Z
---

# M07D Right Panel Terminal — Build completion report

## Spec

[2026-06-14-m07d-terminal-design.md](/specs/2026-06-14-m07d-terminal-design.md)

## Orca references adapted

Public [stablyai/orca](https://github.com/stablyai/orca) sources used as implementation references (MIT):

- `src/main/providers/local-pty-provider.ts` — PTY listener disposal, safe kill/teardown, shell/env defaults
- `src/renderer/src/components/terminal-pane/TerminalPane.tsx` — xterm lifecycle patterns (conceptual; not copied wholesale)
- `src/renderer/src/components/terminal-pane/terminal-appearance.ts` — theme alignment guidance

Local `/Volumes/EVO/repos/orca` was unavailable in the Cloud build environment.

## Dependencies

- `node-pty@1.1.0` (native; rebuild via `pnpm-workspace.yaml` `allowBuilds.node-pty`)
- `@xterm/xterm@6.0.0`
- `@xterm/addon-fit@0.11.0`

Build config: `vite.main.config.ts` externalizes `node-pty`; `forge.config.ts` rebuilds `node-pty` for Electron.

## Key files added/changed

- `src/main/terminal/` — `local-terminal-service.ts`, `shell-defaults.ts`, `project-cwd.ts`
- `src/shared/terminal.ts` — Zod IPC schemas and event union
- `src/shared/ipc.ts`, `src/shared/preload-api.ts`, `src/preload/index.ts`, `src/main/index.ts` — terminal channels and handlers
- `src/renderer/terminal/` — `terminal-panel.tsx`, `use-terminal-connection.ts`, `xterm-instance.ts`, `terminal-state.ts`, `terminal-empty-states.tsx`
- `src/renderer/right-panel/right-panel-body.tsx`, `right-panel-workspace.tsx` — route real terminal panel
- `src/renderer/app-api/{http-client,unavailable-api}.ts`, `src/renderer/dev-preview-api.ts` — web preview unavailable stubs
- Removed `src/renderer/right-panel/terminal-panel-mock.tsx`
- Tests: `tests/main/local-terminal-service.test.ts`, `tests/shared/terminal.test.ts`, `tests/renderer/terminal-{state,panel}.test.tsx`, `tests/renderer/right-panel-body.test.tsx`, updated integration tests

## Verification

- `pnpm format:check` — pass
- `pnpm lint` — pass
- `pnpm typecheck` — pass
- Targeted vitest (terminal service, schemas, renderer state/panel, right-panel body, workspace integration, IPC channel snapshot) — pass
- Full `pnpm check` / Playwright smoke — not run on Linux Cloud VM (Electron headed smoke deferred to macOS CI / local desktop UAT)

## Manual UAT (Electron desktop)

1. Select a project → open Terminal → `pwd` prints project path
2. `echo pi-desktop-terminal` streams output
3. Resize right panel → xterm reflows
4. Terminate → exited state visible
5. Switch projects → prior PTY does not leak

## Deferred (unchanged from spec)

SSH/runtime PTYs, daemon multiplexing, worktree registries, split panes, persistence, agent hooks, Ghostty, terminal settings UI.
