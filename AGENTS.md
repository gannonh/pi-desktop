# Agent Context

## Project Map

- Product context and roadmap: [docs/superpowers/specs/2026-05-12-pi-desktop-prd-roadmap-design.md](docs/superpowers/specs/2026-05-12-pi-desktop-prd-roadmap-design.md)
- Setup, run, test, and release commands belong in `README.md` when that file exists. Link to `README.md` instead of repeating those instructions here.
- Pi runtime reference repo: `/Volumes/EVO/repos/pi-mono`

## Product Frame

`pi-desktop` is to the Pi coding agent CLI what the Codex desktop app is to the Codex CLI: a local graphical command center for coding-agent work.

Keep Pi as the source of agent behavior, tools, providers, models, sessions, and extension primitives. Keep this repo focused on desktop UX, app orchestration, local metadata, and inspectable coding surfaces.

## Current Direction

- Target macOS first.
- Use the Pi TypeScript SDK first.
- Execute roadmap milestones sequentially.
- Start with Milestone 0 from the PRD before building agent-session features.
- Treat cloud workspaces, browser/computer use, automations, and plugin marketplace work as later milestones.

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
