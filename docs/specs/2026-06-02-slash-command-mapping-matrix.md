# Slash-command mapping matrix

**Milestone:** M003 — CLI Slash-Command Mapping and Affordance Parity  
**Slice:** S009 — Command inventory and mapping baseline; S010 — Composer command palette shell; S011 — Session and project command mapping
**Requirements:** COMMANDS-MAP-01 (`MAP-01`)  
**Inventory:** [2026-06-02-slash-command-inventory.md](./2026-06-02-slash-command-inventory.md)  
**Coverage parent:** [2026-05-25-cli-parity-coverage-matrix.md](./2026-05-25-cli-parity-coverage-matrix.md) (CLI-COMMANDS-007)

## Purpose

Schema and scaffold rows mapping each built-in Pi CLI slash command to a Desktop disposition, palette registration metadata, and evidence paths. S010 provides the composer palette shell and section stubs. Family slices (Planned Slices 3–6) fill command dispositions without changing this schema.

## Matrix schema

| Column | Required | Description |
| --- | --- | --- |
| **CLI command** | Yes | Slash command as typed in Pi TUI (e.g. `/model`). |
| **Description** | Yes | Short user-facing summary (from builtin registry). |
| **Disposition** | Yes | One of: `palette entry`, `existing UI`, `deferred`, `out-of-scope`, `Pending` (initial scaffold). |
| **Palette section** | When disposition is `palette entry` or `Pending` | M003 family: `Session`, `Config`, `Output`, or `Meta/Skills`. |
| **Palette entry ID** | When disposition is `palette entry` or `Pending` | Stable slug for S010 registry (e.g. `session.new`). Kebab-case segment after family prefix. |
| **Desktop evidence path** | When known | Repo path(s) for existing UI or partial implementation. |
| **M002/M003 notes** | No | Cross-milestone context, gaps, or slice ownership. |
| **Blocked by family slice** | No | Planned Slice id when disposition cannot close until a family slice lands. |

### Disposition definitions

| Disposition | Meaning |
| --- | --- |
| `palette entry` | Primary affordance is the composer command palette (S010+). |
| `existing UI` | Desktop already exposes equivalent GUI without palette registration. |
| `deferred` | Intentionally later milestone; document rationale in notes. |
| `out-of-scope` | Not targeted for Desktop parity (e.g. terminal-only quit). |
| `Pending` | Scaffold default; family slice assigns final disposition. |

### Palette sections (M003 families)

| Section | Typical commands |
| --- | --- |
| **Session** | Lifecycle, tree, fork/clone, compact, import/resume |
| **Config** | Auth, model, scoped models, settings, reload |
| **Output** | Copy, export, share |
| **Meta/Skills** | Help surfaces, changelog, app exit |

### Example rows (one per disposition type)

| CLI command | Description | Disposition | Palette section | Palette entry ID | Desktop evidence path | M002/M003 notes | Blocked by |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/new` | Start a new session | `palette entry` | Session | `session.new` | — | Example: palette-first session affordance | Planned Slice 3 |
| `/model` | Select model | `existing UI` | Config | `config.model` | `src/renderer/components/composer-model-selector.tsx` | Example: composer model picker already ships | — |
| `/hotkeys` | Show keyboard shortcuts | `deferred` | Meta/Skills | `meta.hotkeys` | — | Example: defer until Desktop keybindings milestone | — |
| `/quit` | Quit pi | `out-of-scope` | Meta/Skills | `meta.quit` | — | Example: use OS/window close, not palette | — |

## Mapping matrix (built-in commands)

Disposition is **`Pending`** until a family slice updates it. Palette columns are pre-filled for stable registration. S010 established the palette shell and one stub per section; it did not classify or execute the 21 built-in commands.

| CLI command | Description | Disposition | Palette section | Palette entry ID | Desktop evidence path | M002/M003 notes | Blocked by family slice |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/changelog` | Show changelog entries | Pending | Meta/Skills | `meta.changelog` | — | | Planned Slice 6 |
| `/clone` | Duplicate session at current position | `palette entry` | Session | `session.clone` | `src/renderer/chat/session-command-palette.ts`, `src/renderer/App.tsx` | Wired via `chat.clone` when the selected chat has a session file | — |
| `/compact` | Manually compact session context | `deferred` | Session | `session.compact` | `src/renderer/chat/session-command-palette.ts` | Visible deferral until `piSession.compact` IPC exists | — |
| `/copy` | Copy last agent message | Pending | Output | `output.copy` | — | | Planned Slice 5 |
| `/export` | Export session to HTML/JSONL | Pending | Output | `output.export` | — | | Planned Slice 5 |
| `/fork` | Fork from previous user message | `palette entry` | Session | `session.fork` | `src/renderer/chat/session-command-palette.ts`, `src/renderer/App.tsx` | Wired via `chat.fork` when the selected chat has a session file | — |
| `/hotkeys` | Show all keyboard shortcuts | Pending | Meta/Skills | `meta.hotkeys` | — | | Planned Slice 6 |
| `/import` | Import session from JSONL | `deferred` | Session | `session.import` | `src/renderer/chat/session-command-palette.ts` | Visible deferral until JSONL import IPC exists | — |
| `/login` | Configure provider auth | Pending | Config | `config.login` | — | Secrets stay in main process | Planned Slice 4 |
| `/logout` | Remove provider auth | Pending | Config | `config.logout` | — | | Planned Slice 4 |
| `/model` | Select model | Pending | Config | `config.model` | `src/renderer/components/composer-model-selector.tsx` | May remain `existing UI` after review | Planned Slice 4 |
| `/name` | Set session display name | `palette entry` | Session | `session.name` | `src/renderer/components/project-sidebar.tsx`, `src/renderer/App.tsx` | Opens inline rename for the selected project chat | — |
| `/new` | Start a new session | `palette entry` | Session | `session.new` | `src/renderer/chat/session-command-palette.ts`, `src/renderer/App.tsx` | `chat.create` or `chat.createStandalone` | — |
| `/quit` | Quit pi | Pending | Meta/Skills | `meta.quit` | — | Likely `out-of-scope` | Planned Slice 6 |
| `/reload` | Reload resources | Pending | Config | `config.reload` | — | Extensions/skills/themes | Planned Slice 4 |
| `/resume` | Resume a different session | `deferred` | Session | `session.resume` | `src/renderer/chat/session-command-palette.ts` | Status guidance to select a chat in the sidebar (existing resume path) | — |
| `/scoped-models` | Scoped model cycling set | Pending | Config | `config.scoped-models` | — | | Planned Slice 4 |
| `/session` | Show session info and stats | `palette entry` | Session | `session.info` | `src/renderer/chat/session-command-palette.ts`, `src/renderer/App.tsx` | Shows selected chat metadata in the project status message | — |
| `/settings` | Open settings menu | Pending | Config | `config.settings` | — | | Planned Slice 4 |
| `/share` | Share session via gist | Pending | Output | `output.share` | — | | Planned Slice 5 |
| `/tree` | Navigate session tree | `deferred` | Session | `session.tree` | `src/renderer/chat/session-command-palette.ts` | Visible deferral until session tree UI ships | — |

## Summary counts

| Metric | Count |
| --- | ---: |
| **Total built-in commands** | 21 |
| **Pending disposition** | 12 |
| **Session family** | 9 |
| **S011 session rows finalized** | 9 |
| **Config family** | 6 |
| **Output family** | 3 |
| **Meta/Skills family** | 3 |

## S011 implementation note (session family)

S011 replaced the Session section stub with nine concrete palette entries and wired supported actions through `useSessionCommandPaletteActions` and sidebar registration:

- `src/renderer/chat/session-command-palette.ts`: stable `session.*` entry IDs, labels, deferral copy, and handlers.
- `src/renderer/chat/use-session-command-palette-actions.ts`: palette action wiring for new/fork/clone/name/info.
- `src/renderer/chat/build-command-palette-entries.ts`: merges session entries with remaining section stubs.
- `src/renderer/chat/use-composer-command-palette.ts`: accepts optional session actions to build the registry at runtime.
- `src/renderer/projects/project-chat-branch-action.ts`: shared fork/clone guards for palette and sidebar.
- `src/renderer/components/project-sidebar.tsx`: registers `startChatRename`; pending rename via sidebar context.

Verification: `tests/renderer/session-command-palette.test.ts`, `tests/renderer/build-command-palette-entries.test.ts`, and updated registry tests.

## S010 implementation note (palette shell)

S010 implemented the composer command-palette shell with these evidence paths:

- `src/renderer/chat/command-palette-registry.ts`: section IDs, registry API, allowed Lucide icons, and one stub entry per section.
- `src/renderer/chat/command-palette-state.ts`: slash trigger detection, query filtering, and keyboard action mapping.
- `src/renderer/chat/use-composer-command-palette.ts`: composer integration state, dismissal, active entry movement, and selection handling.
- `src/renderer/components/command-palette-popover.tsx`: grouped shadcn `Command`/`Popover` UI with keyboard and pointer selection.
- `src/renderer/components/composer.tsx`: `/` hint, textarea trigger wiring, and navigation-key interception before prompt submit.

Current behavior: typing `/` at the start of composer text or after whitespace opens the palette; whitespace closes the query; ArrowUp/ArrowDown move selection; Enter selects; Escape dismisses. Stub selection inserts section placeholder text into the draft and does not submit raw slash text.

Family slices should register concrete entries using the `Palette entry ID` values in this matrix and replace section stubs with real handlers or existing-UI affordances.

## Handoff to family slices

| Planned slice | Palette section | Commands (palette entry IDs) |
| --- | --- | --- |
| S011 / Planned Slice 3 (Session) | Session | `session.*` (9 rows) — complete |
| Planned Slice 4 (Config) | Config | `config.*` (6 rows) |
| Planned Slice 5 (Output) | Output | `output.*` (3 rows) |
| Planned Slice 6 (Meta/Skills) | Meta/Skills | `meta.*` (3 rows) |
