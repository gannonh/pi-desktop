# Agent Context

## Project Map

- Start with [docs/index.md](docs/index.md) for the current OKF documentation index.
- Product context and high-level roadmap: [docs/pi-desktop-high-level-roadmap.md](docs/pi-desktop-high-level-roadmap.md)
- Architecture decisions: [docs/adrs](docs/adrs)
- Diagrams: [docs/diagrams](docs/diagrams)
- Specs and plans: [docs/specs](docs/specs)
- Setup, run, test, and release commands belong in [README.md](README.md). Link to `README.md` instead of repeating those instructions here.
- Pi runtime reference repo: `/Volumes/EVO/repos/pi-mono`

## Open Knowledge Format docs

This repository maintains an OKF bundle at `./docs`.

- Read `./docs/index.md` before substantial work to understand the current documentation map.
- Follow cross-links into relevant specs, ADRs, runbooks, guides, architecture notes, reference docs, and domain docs before changing related code.
- Keep `./docs/specs/index.md` current as the roadmap for active, planned, blocked, and completed work.
- Add or update ADRs in `./docs/adrs` for durable architecture decisions.
- After substantial work, PRs, behavior changes, architecture decisions, migrations, or documentation moves, update the OKF bundle and add concise entries to the relevant `log.md` files.
- Maintain Markdown cross-links between related OKF concepts so future agents can traverse decisions, specs, architecture, runbooks, guides, and references.
- Every non-reserved Markdown file under `./docs` should have OKF frontmatter with at least a non-empty `type` field. `index.md` and `log.md` are reserved navigation/history files.

## Product Frame

`pi-desktop` is to the Pi coding agent CLI what the Codex desktop app is to the Codex CLI: a local graphical command center for coding-agent work.

Keep Pi as the source of agent behavior, tools, providers, models, sessions, and extension primitives. Keep this repo focused on desktop UX, app orchestration, local metadata, and inspectable coding surfaces.

## Current Direction

- Target macOS first.
- Use the Pi TypeScript SDK first.
- Execute roadmap milestones sequentially.
- M03.2 decided not to adopt `@ai-sdk/react` `useChat` for M04. Keep the custom `LiveSessionState` and Pi session event path for project/session management.
- Treat cloud workspaces, browser/computer use, automations, and plugin marketplace work as later milestones.

## Documentation

- Record durable architecture decisions as ADRs under `docs/adrs`.
- Keep diagrams under `docs/diagrams`.
- Keep specs and execution plans under `docs/specs`.
- Keep roadmap status and ADR decisions aligned when milestone direction changes.
- Preserve spike outcomes in specs or ADRs; do not keep dead prototype code or dependencies in product branches unless explicitly adopted.

## Renderer UI (shadcn boundary)

Pi Desktop is a **shadcn-configured** project, not an all-registry shell. See [docs/adrs/0003-shadcn-ui-boundary.md](docs/adrs/0003-shadcn-ui-boundary.md).

- **Config:** `components.json` (`iconLibrary: lucide`, new-york, radix). Visual tokens and rules live in `DESIGN.md` and `src/renderer/styles.css`.
- **Custom by design:** app shell, project sidebar, workspace tab strip, file workspace chrome (layout and workbench interactions). Do not rewrite these to shadcn `Sidebar` / `Tabs` unless a milestone explicitly scopes consolidation.
- **Prefer shadcn for new generic UI:** menus, dialogs, forms, confirmations, standard buttons, empty states. Add registry components via the shadcn CLI before inventing parallel primitives.
- **Icons:** use `lucide-react` only in the renderer. Do not add other icon libraries for product UI.
- **Existing custom menus:** `src/renderer/components/menu.tsx` is legacy shell chrome; new overflow and action menus should move toward `DropdownMenu` when touched, not extend the custom menu pattern without reason.

## Agent Workflow

- Use sub-agents when work can split into independent research, review, implementation, or verification tracks, especially architecture audits, UI reviews, documentation sweeps, broad test failure triage, and changes touching separable feature folders.
- Keep one lead agent responsible for the final edit plan and integration. Have sub-agents return findings, diffs, or review notes, then reconcile conflicts before editing shared files.
- Skip sub-agents for small single-file changes, tasks needing immediate user clarification, secret/account-specific work, or tightly coupled edits where coordination would cost more than it saves.

## Codebase Shape

- Prefer feature folders with clear ownership.
- Keep Electron main, preload/IPC, renderer UI, runtime adapter, and local store boundaries explicit.
- Avoid catch-all `utils`, `helpers`, or mixed-concern modules.
- Validate at IO boundaries, then pass typed data internally.
- Use discriminated unions for app/session state instead of boolean flag bags.
- Keep shared code in a named owner boundary.

## Desktop Safety

- Keep provider secrets out of renderer-accessible state.
- Keep preload APIs narrow and typed.
- Show runtime, auth, filesystem, and tool failures visibly.
- Show active workspace paths and tool execution state clearly.
- Do not copy proprietary Codex app source, assets, copy, or hidden implementation details.

## Verification

- For docs-only changes, run a targeted review for broken links, stale claims, and duplicated README-style setup details.
- For code changes, add or run the smallest deterministic checks that prove the changed behavior.
- Once project scripts exist, prefer the repo `check` command for final verification.

## Cursor Cloud specific instructions

- **Node 24:** `preinstall` rejects any Node major other than 24. Cloud VMs often ship `/exec-daemon/node` (v22) ahead of nvm on `PATH`, and `nvm which current` may still resolve to that binary. Prepend the installed nvm Node 24 bin directory before `pnpm install` or scripts, e.g. `export PATH="$(find "$HOME/.nvm/versions/node" -maxdepth 1 -type d -name 'v24.*' | sort -V | tail -1)/bin:$PATH"`.
- **Package manager:** Use Corepack for `pnpm@11.1.1` per [README.md](README.md).
- **Linux / headless VMs:** `pnpm dev:web` is the lightest path (Vite plus the local app data bridge `/api/rpc`, `/api/events` in one process; open the printed Vite URL, default `http://127.0.0.1:5173/`). The full Electron desktop app (`pnpm dev`) also runs on these VMs (see next bullets).
- **Running the Electron desktop app on Linux:** It works on the Cloud VM's XFCE display (`DISPLAY=:1`), but needs these non-obvious steps:
  1. Export `DISPLAY=:1` and `ELECTRON_DISABLE_SANDBOX=1` (`chrome-sandbox` is not setuid in the container).
  2. Run `node ./scripts/ensure-electron-binary.mjs` once (idempotent) before `pnpm dev` — `pnpm install` does not download Electron here.
  3. Create `~/Documents` on minimal images (`mkdir -p ~/Documents`) or scratch-project creation fails with `ENOENT`.
  4. dbus "Failed to connect to the bus" errors in the log are harmless.
  5. **Blank window troubleshooting:** If the `pi-desktop` window opens but stays solid black (`#0a0a0a`), it is usually one of two Linux VM issues, not a missing window:
     - **Vite dev server on IPv6 only:** Forge loads `http://localhost:5173`. On this VM Vite may bind to `::1` only, so IPv4 fails. Verify with `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5173/` (must be `200`, not `000`). `vite.renderer.config.ts` sets `server.host: "127.0.0.1"` to prevent this.
     - **GPU compositing paints nothing to X11:** set `PI_DESKTOP_DISABLE_GPU=1` before `pnpm dev` on Linux Cloud VMs. `src/main/index.ts` calls `app.disableHardwareAcceleration()` only when that env var is set. After changing main-process code, restart Electron (`rs` in the `pnpm dev` terminal, or stop and rerun `pnpm dev`) — hot renderer reload is not enough.
  6. **Verify visible content before recording:** Capture the window (not the full desktop blindly) and confirm the PNG is well above ~10 KB. A ~5 KB capture is almost always a blank `#0a0a0a` window. Optionally wait for `ready-to-show` (window appears only after the renderer paints).
- **Electron UAT video on Cloud VM (preferred recipe):**
  1. **Clean desktop:** Close Chrome, Playwright trace viewer, and stale Electron (`xdotool windowclose` / `killall google-chrome`; `pkill -f 'electron/dist/electron'`).
  2. **Start the app visibly:** In tmux, run `pnpm dev` with `DISPLAY=:1`, `ELECTRON_DISABLE_SANDBOX=1`, `PI_DESKTOP_DISABLE_GPU=1`, and any seeded `PI_DESKTOP_USER_DATA_DIR` / `PI_DESKTOP_SMOKE_PI_SESSION=1` env needed for the scenario.
  3. **Pre-flight:** `curl` Vite on `127.0.0.1:5173` returns `200`; `xdotool search --name 'pi-desktop'` finds a window; window screenshot PNG is not tiny/black.
  4. **Record:** Use `RecordScreen` (or `ffmpeg -f x11grab -video_size 1920x1200 -i :1`) while driving the flow. For scripted terminal/session UAT, headed Playwright is reliable once the app paints: set `UAT_EVIDENCE_DIR`, then `PI_DESKTOP_SMOKE_HEADED=1 ELECTRON_DISABLE_SANDBOX=1 pnpm test:uat -- scripts/uat/m07-terminal-uat.spec.ts`. Start recording **before** launching the headed test or clicking through the UI.
  5. **Do not confuse overlays:** Cursor's remote-desktop "Take Control" curtain is separate from the Electron window. The Electron app may be visible behind it; close browser windows first so recordings show Pi Desktop, not trace viewer tabs.
- **Driving the live Electron window with `xdotool`:** Synthetic keyboard input only lands after a real mouse click focuses the target field (click first, then `xdotool type`/`key`). xdotool coordinates are in the native 1920x1200 space; `ffmpeg -f x11grab -video_size 1920x1200 -i :1` captures the full display 1:1. For scripted end-to-end interaction prefer Playwright smoke (`pnpm test:smoke` with `ELECTRON_DISABLE_SANDBOX=1`), which drives the real Electron app via CDP. Headed smoke (`PI_DESKTOP_SMOKE_HEADED=1`) needs the Linux GPU/Vite fixes above to paint on X11; CDP screenshots work even when X11 capture fails.
- **Project creation in web preview:** `project.createFromScratch` scans `~/Documents`. Create that directory on minimal Linux images (`mkdir -p ~/Documents`) or scratch-project creation fails with `ENOENT`.
- **Verification:** Standard commands are in [README.md](README.md). On Linux, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, and `pnpm test:coverage` are the reliable subset; full `pnpm check` (Electron build + Playwright smoke) matches CI on `macos-latest` and needs `pnpm exec playwright install chromium` plus a display/stack suitable for Electron.
- **Pi runtime:** No separate `pi-mono` daemon. Agent config defaults to `~/.pi/agent`; optional smoke mock via `PI_DESKTOP_SMOKE_PI_SESSION=1` for Playwright tests.

## Git

- Commit after each coherent change set or turn.
- Keep commits atomic: stage only files changed for the current change set and do not mix unrelated work.
- Use Conventional Commits syntax: `<type>(<scope>): <imperative summary>`.
- Never use `git push --no-verify` or other hook-skipping flags unless the user explicitly requests it. If a pre-push hook fails, fix the underlying issue and push again.
