# Critique UX remediation — visual evidence

All captures taken from **Electron desktop** (`pnpm dev:desktop`), not web preview.

## Before

Directory: `artifacts/critique-ux-before/`

- Screenshots: sidebar, filters, start composer, control row, minor states
- Videos: `before-sidebar-filters.mp4`, `before-start-composer.mp4`, `before-session-workspace.mp4`

## After

Directory: `artifacts/critique-ux-after/`

- Matching screenshot set after planned-affordance, header, composer, and polish changes
- Videos: `after-sidebar-filters.mp4`, `after-start-composer.mp4`, `after-session-workspace.mp4`

## What changed

- Mocked affordances use muted/dashed **Planned** styling (roadmap visibility for the team)
- Filter menus: working **Show** filters first; organize/sort grouped under **Planned**
- Unified `SessionScopeHeader` for session title/path/metadata
- Quieter composer: project + session `DropdownMenu`, secondary session-details row
- Empty transcript hint, sidebar skeleton loading, attention sr-only text, workspace aria-live
