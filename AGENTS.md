# Agent Context

## Project Map

- Product context and high-level roadmap: [docs/superpowers/specs/2026-05-12-pi-desktop-high-level-roadmap.md](docs/superpowers/specs/2026-05-12-pi-desktop-high-level-roadmap.md)
- Architecture decisions: [docs/adr](docs/adr)
- Diagrams: [docs/diagrams](docs/diagrams)
- Specs and plans: [docs/superpowers](docs/superpowers)
- Setup, run, test, and release commands belong in `README.md` when that file exists. Link to `README.md` instead of repeating those instructions here.
- Pi runtime reference repo: `/Volumes/EVO/repos/pi-mono`

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

- Record durable architecture decisions as ADRs under `docs/adr`.
- Keep diagrams under `docs/diagrams`.
- Keep specs and execution plans under `docs/superpowers`.
- Keep roadmap status and ADR decisions aligned when milestone direction changes.
- Preserve spike outcomes in specs or ADRs; do not keep dead prototype code or dependencies in product branches unless explicitly adopted.

## Renderer UI (shadcn boundary)

Pi Desktop is a **shadcn-configured** project, not an all-registry shell. See [docs/adr/0003-shadcn-ui-boundary.md](docs/adr/0003-shadcn-ui-boundary.md).

- **Config:** `components.json` (`iconLibrary: lucide`, new-york, radix). Visual tokens and rules live in `DESIGN.md` and `src/renderer/styles.css`.
- **Custom by design:** app shell, project sidebar, workspace tab strip, file workspace chrome (layout and workbench interactions). Do not rewrite these to shadcn `Sidebar` / `Tabs` unless a milestone explicitly scopes consolidation.
- **Prefer shadcn for new generic UI:** menus, dialogs, forms, confirmations, standard buttons, empty states. Add registry components via the shadcn CLI before inventing parallel primitives.
- **Icons:** use `lucide-react` only in the renderer. Do not add other icon libraries for product UI.
- **Existing custom menus:** `src/renderer/components/menu.tsx` is legacy shell chrome; new overflow and action menus should move toward `DropdownMenu` when touched, not extend the custom menu pattern without reason.

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

## Git

- Commit after each coherent change set or turn.
- Keep commits atomic: stage only files changed for the current change set and do not mix unrelated work.
- Use Conventional Commits syntax: `<type>(<scope>): <imperative summary>`.
- Never use `git push --no-verify` or other hook-skipping flags unless the user explicitly requests it. If a pre-push hook fails, fix the underlying issue and push again.
