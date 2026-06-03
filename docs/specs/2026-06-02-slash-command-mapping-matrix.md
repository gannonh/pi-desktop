# Slash-command mapping matrix

**Milestone:** M003 — CLI Slash-Command Mapping and Affordance Parity  
**Slice:** S009 — Command inventory and mapping baseline; S010 — Composer command palette shell; S011–S014 — Family command mapping; S015 — Gap closure consolidation  
**Requirements:** COMMANDS-MAP-01 (`MAP-01`), COMMANDS-OUTCOME-01 (`OUTCOME-01`), COMMANDS-DECISION-01 (`DECISION-01`)  
**Inventory:** [2026-06-02-slash-command-inventory.md](./2026-06-02-slash-command-inventory.md)  
**Coverage parent:** [2026-05-25-cli-parity-coverage-matrix.md](./2026-05-25-cli-parity-coverage-matrix.md) (CLI-COMMANDS-007)

## Purpose

Authoritative mapping of each built-in Pi CLI slash command to a Desktop disposition, palette registration metadata, and evidence paths. S015 consolidated family-slice outcomes (S011–S014) into final dispositions for all 21 built-in commands.

## Matrix schema

| Column | Required | Description |
| --- | --- | --- |
| **CLI command** | Yes | Slash command as typed in Pi TUI (e.g. `/model`). |
| **Description** | Yes | Short user-facing summary (from builtin registry). |
| **Disposition** | Yes | One of: `palette entry`, `existing UI`, `deferred`, `out-of-scope`. |
| **Palette section** | When disposition is `palette entry` or `deferred` | M003 family: `Session`, `Config`, `Output`, or `Meta/Skills`. |
| **Palette entry ID** | When disposition is `palette entry` or `deferred` | Stable slug for palette registry (e.g. `session.new`). |
| **Desktop evidence path** | When known | Repo path(s) for existing UI or partial implementation. |
| **M002/M003 notes** | No | Cross-milestone context, gaps, or slice ownership. |

### Disposition definitions

| Disposition | Meaning |
| --- | --- |
| `palette entry` | Primary affordance is the composer command palette (S010+). |
| `existing UI` | Desktop already exposes equivalent GUI without palette registration. |
| `deferred` | Intentionally later milestone; palette may show visible deferral notice. |
| `out-of-scope` | Not targeted for Desktop parity (e.g. terminal-only quit). |

### Palette sections (M003 families)

| Section | Typical commands |
| --- | --- |
| **Session** | Lifecycle, tree, fork/clone, compact, import/resume |
| **Config** | Auth, model, scoped models, settings |
| **Output** | Copy, export, share |
| **Meta/Skills** | Help surfaces, changelog, resource reload, app exit |

## Mapping matrix (built-in commands)

All 21 built-in commands have a final disposition. No rows remain `Pending`.

| CLI command | Description | Disposition | Palette section | Palette entry ID | Desktop evidence path | M002/M003 notes |
| --- | --- | --- | --- | --- | --- | --- |
| `/changelog` | Show changelog entries | `deferred` | Meta/Skills | `meta.changelog` | `src/renderer/chat/meta-command-palette-entries.ts` | In-app changelog deferred; palette shows visible notice (S014) |
| `/clone` | Duplicate session at current position | `palette entry` | Session | `session.clone` | `src/renderer/chat/session-command-palette.ts`, `src/renderer/App.tsx` | Wired via `chat.clone` when the selected chat has a session file (S011) |
| `/compact` | Manually compact session context | `deferred` | Session | `session.compact` | `src/renderer/chat/session-command-palette.ts` | Visible deferral until `piSession.compact` IPC exists (S011) |
| `/copy` | Copy last agent message | `palette entry` | Output | `output.copy` | `src/renderer/chat/output-command-palette.ts`, `src/renderer/App.tsx` | Copies last assistant transcript message via clipboard IPC (S013) |
| `/export` | Export session to HTML/JSONL | `deferred` | Output | `output.export` | `src/renderer/chat/output-command-palette.ts` | Visible deferral until export IPC ships (S013) |
| `/fork` | Fork from previous user message | `palette entry` | Session | `session.fork` | `src/renderer/chat/session-command-palette.ts`, `src/renderer/App.tsx` | Wired via `chat.fork` when the selected chat has a session file (S011) |
| `/hotkeys` | Show all keyboard shortcuts | `deferred` | Meta/Skills | `meta.hotkeys` | `src/renderer/chat/meta-command-palette-entries.ts` | Keybindings reference deferred; palette shows visible notice (S014) |
| `/import` | Import session from JSONL | `deferred` | Session | `session.import` | `src/renderer/chat/session-command-palette.ts` | **Ownership (S011):** Session family. Visible deferral until JSONL import IPC exists |
| `/login` | Configure provider auth | `palette entry` | Config | `config.login` | `src/renderer/chat/config-command-palette-entries.ts` | Visible deferral until Settings/Auth milestone; secrets stay in main process (S012) |
| `/logout` | Remove provider auth | `palette entry` | Config | `config.logout` | `src/renderer/chat/config-command-palette-entries.ts` | Visible deferral until Settings/Auth milestone; no renderer secrets (S012) |
| `/model` | Select model | `existing UI` | Config | `config.model` | `src/renderer/components/composer-model-selector.tsx`, `src/renderer/chat/config-command-palette-entries.ts` | Composer model picker is the Desktop equivalent; palette opens picker without draft insertion (S012) |
| `/name` | Set session display name | `palette entry` | Session | `session.name` | `src/renderer/components/project-sidebar.tsx`, `src/renderer/App.tsx` | Opens inline rename for the selected project chat (S011) |
| `/new` | Start a new session | `palette entry` | Session | `session.new` | `src/renderer/chat/session-command-palette.ts`, `src/renderer/App.tsx` | `chat.create` or `chat.createStandalone` (S011) |
| `/quit` | Quit pi | `out-of-scope` | Meta/Skills | `meta.quit` | `src/renderer/chat/meta-command-palette-entries.ts` | OS/window close is the Desktop equivalent; palette explains (S014) |
| `/reload` | Reload resources | `deferred` | Meta/Skills | `meta.reload` | `src/renderer/chat/meta-command-palette-entries.ts` | **Ownership (S012/S014):** Config slice defers implementation; Meta/Skills palette entry only. Hot-reload deferred until extensibility milestone |
| `/resume` | Resume a different session | `palette entry` | Session | `session.resume` | `src/renderer/chat/session-command-palette.ts`, `src/renderer/App.tsx` | Status guidance to select a chat in the sidebar (existing resume path) (S011) |
| `/scoped-models` | Scoped model cycling set | `deferred` | Config | `config.scoped-models` | `src/renderer/chat/config-command-palette-entries.ts` | Palette entry shows visible deferral; Ctrl+P cycling not implemented (S012) |
| `/session` | Show session info and stats | `palette entry` | Session | `session.info` | `src/renderer/chat/session-command-palette.ts`, `src/renderer/App.tsx` | Shows selected chat metadata in the project status message (S011) |
| `/settings` | Open settings menu | `deferred` | Config | `config.settings` | `src/renderer/chat/config-command-palette-entries.ts` | Palette entry shows visible deferral until Settings shell ships (S012) |
| `/share` | Share session via gist | `deferred` | Output | `output.share` | `src/renderer/chat/output-command-palette.ts` | Visible deferral until gist share IPC ships (S013) |
| `/tree` | Navigate session tree | `deferred` | Session | `session.tree` | `src/renderer/chat/session-command-palette.ts` | Visible deferral until session tree UI ships (S011) |

## Summary counts

| Metric | Count |
| --- | ---: |
| **Total built-in commands** | 21 |
| **`palette entry`** | 9 |
| **`existing UI`** | 1 |
| **`deferred`** | 10 |
| **`out-of-scope`** | 1 |
| **Pending disposition** | 0 |
| **Session family** | 9 |
| **Config family** | 5 |
| **Output family** | 3 |
| **Meta/Skills family** | 4 |

Inventory count (21) matches [2026-06-02-slash-command-inventory.md](./2026-06-02-slash-command-inventory.md).

## Cross-family ownership decisions (S015)

| Command | Decision | Rationale |
| --- | --- | --- |
| `/import` | Session family (`session.import`) | JSONL import is a session lifecycle action; S011 owns disposition and deferral |
| `/compact` | Session family (`session.compact`) | Context compaction is session-scoped; S011 owns disposition and deferral |
| `/reload` | Meta/Skills palette entry (`meta.reload`) | S012 classified as Config-family deferral; S014 registers the palette entry under Meta/Skills. Implementation deferred until extensibility milestone; no `config.reload` palette registration |

## Carry-forward and out-of-scope (not in built-in matrix)

| Surface | Disposition | Destination scope | Rationale |
| --- | --- | --- | --- |
| `@` mentions | Deferred | Later composer UX milestone | Not a slash command; composer hint documents planned support |
| Prompt templates (`/<name>`) | Deferred | M0X Extensibility | Runtime-discovered; not fixed built-in rows |
| Extension commands | Deferred | M0X Extensibility | Runtime-discovered via `extensionRunner` |
| Skills (`/skill:<name>`) | Deferred | M0X Extensibility | Runtime-discovered when `enableSkillCommands` is on |
| `!` / `!!` bash shortcuts | Deferred | M07D Terminal and Command Output | Terminal-specific; see CLI-BASH-010 |
| `/debug`, easter eggs | Out of scope | — | Not user-facing builtins per S009 exclusion criteria |

## Implementation evidence by family slice

### S010 — Palette shell

- `src/renderer/chat/command-palette-registry.ts`: section IDs, registry API, allowed Lucide icons.
- `src/renderer/chat/command-palette-state.ts`: slash trigger detection, query filtering, keyboard action mapping.
- `src/renderer/chat/use-composer-command-palette.ts`: composer integration state.
- `src/renderer/components/command-palette-popover.tsx`: grouped shadcn `Command`/`Popover` UI.
- `src/renderer/components/composer.tsx`: `/` hint and navigation-key interception.

### S011 — Session family

- `src/renderer/chat/session-command-palette.ts`: stable `session.*` entry IDs and handlers.
- `src/renderer/chat/build-command-palette-entries.ts`: merges session entries with remaining stubs.
- `src/renderer/App.tsx`: new/fork/clone/resume/name/info and deferrals for tree/import/compact.
- `src/renderer/components/project-sidebar.tsx`: palette-triggered inline rename.

### S012 — Config family

- `src/renderer/chat/config-command-palette-entries.ts`: stable `config.*` entry IDs, deferral copy, model-picker handler.
- `/reload` not registered under Config; deferred to S014 `meta.reload`.

### S013 — Output family

- `src/renderer/chat/output-command-palette.ts`: stable `output.*` entry IDs and handlers.
- `src/renderer/chat/last-assistant-message.ts`: last assistant message lookup for `/copy`.
- `src/renderer/App.tsx`: copy via clipboard IPC; export/share deferrals.

### S014 — Meta/Skills family

- `src/renderer/chat/meta-command-palette-entries.ts`: stable `meta.*` entry IDs and `showNotice` handlers.
- `/reload` palette ownership: `meta.reload` (Meta/Skills section).

Family-slice implementation branches: `cursor/s011-session-command-mapping-bc1b`, `cursor/s012-config-command-mapping-3de5`, `cursor/s013-output-command-mapping-88d0`, `cursor/s014-meta-command-mapping-3e57`.
